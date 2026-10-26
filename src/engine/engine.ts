// HM26 Maç Motoru §6.2 — Ana döngü ve maç durumu
// Safe TS, React'ten bağımsız. Aynı seed + girişleri → aynı sonuç (§1.3 Tekrarlanabilir)

import { Club, Player, TacticPlan } from '../types';
import { ZoneId } from './zones';
import { autoLineup, teamProfile, tickFatigue, isActiveOnPitch, LineupSlot } from './profiles';
import { runPossession, resolvePossessionOwner, resolveStartZone, PossessionContext, pickSlot } from './possession';
import { narrate, NarrationEvent, shotVisualCue } from './narrate';
import { buildInsights } from './insights';
import { rollGoalLineClearance } from './pitch-ai';
import { MatchSession } from './session';
import { aiDefaultTactic } from './tactics';
import type { RefereeProfile } from './referee';
import type { AiDecisionTrace } from './core/types';
export { aiDefaultTactic } from './tactics';

export type Weather = 'acik' | 'yagmur' | 'sicak' | 'rüzgar' | 'kotuZemin';

// customLineup'a yer: home/away için 11-dizili id listesi (export engine'den yuvaya eğer)
export interface MatchInput {
  /** Dalga 5: kullanıcı tarafı (canlı maç) — AI otomatik değişikliği bu tarafa karışmaz */
  userSide?: 'home' | 'away';
  /** Career difficulty is a pre-match AI tactical-responsiveness input, never a post-match score edit. */
  challengeClubId?: string;
  challengePoints?: number;
  /** v0.9.9 iğneyle oynatma: riskli sakatla kadroya alınan oyuncu id'leri (kullanıcı tarafı) */
  riskIds?: string[];
  homeClub: Club;
  awayClub: Club;
  homeSquad: Player[];
  awaySquad: Player[];
  /** Kullanıcı tarafı (ev ise home tactic = kullanıcı) veya AI varsayılanı */
  homeTactic: TacticPlan;
  awayTactic?: TacticPlan;         // yoksa genel profilden üretilir
  seed: number;
  /** FAZ 2: kullanıcı elle dizdiği İlk 11 id'leri (boş yuvalar null) — autoLineup'a direktif */                    // maç seed
  derby?: boolean;
  cup?: boolean;                   // kupa = hafif strateji farkı
  goalPace: 'dusuk' | 'dengeli' | 'yuksek';
  randomness: 'low' | 'normal' | 'high';
  weather?: Weather;
  subMgr?: SubManager;             // maç-içi değişiklik/taktik komutları
}

/** Maç-içi müdahale arayüzü — kullanıcı LiveMatch'ten bağlar */
export interface SubManager {
  /** Değişiklik isteği kuyruğu (sıradaki uygun durakta işlenir) */
  takeSubRequest(owner: 'home' | 'away'): { outId: string; inId: string } | null;
  /** Taktik plan geçişi isteği (§5.3) */
  takeTacticRequest(owner: 'home' | 'away'): { plan: TacticPlan } | null;
}

export type MatchAnimationType = 'routine' | 'dangerous_attack' | 'shot' | 'goal' | 'card' | 'injury' | 'var' | 'substitution' | 'tactic' | 'halftime' | 'fulltime' | 'save' | 'line_clearance' | 'free_kick' | 'brawl' | 'woodwork' | 'volley';

export interface MatchStateEvent extends NarrationEvent {
  anim?: {
    eventType: MatchAnimationType;
    attackingTeamId?: string;
    path?: ZoneId[];
    actors?: string[];
    outcome?: string;
  };
  shotsAfter?: { h: number; a: number };
}

export interface MatchStats {
  hg: number; ag: number;
  xgH: number; xgA: number;
  shotsH: number; shotsA: number;
  onH: number; onA: number;
  posH: number;                            // %
  cornersH: number; cornersA: number;
  foulsH: number; foulsA: number;
  yellowH: number; yellowA: number;
  redH: number; redA: number;
  savesH: number; savesA: number;
  possessionCount: number;
  /** kanal buluşma sayıları */
  wideAttH: number; wideAttA: number; centralAttH: number; centralAttA: number;
  pressWinsH: number; pressWinsA: number;
  /** §13.2 oyuncu istatistikleri */
  playerRows: Record<string, { min: number; g: number; a: number; shots: number; saves: number; yellow: number; red: number; posGroup: string; endFit: number; rating: number; conceded: number }>; // v0.9.5: conceded = GK gol yeme
}

/** Dalga 5: IFAB 2022 kalıcı kuralı — takım başına 5 değişiklik hakkı, en fazla 3 durakta (devre arası serbest) */
export interface IfabSubState {
  subsLeft: Record<'home' | 'away', number>;
  windowsLeft: Record<'home' | 'away', number>;
  windowsUsed: Record<'home' | 'away', number>;
}

/** Dalga 2 (§5-D): şut günlüğü satırı — maç sonu vuruş haritası için */
export interface EngineShot {
  minute: number;
  side: 'home' | 'away';
  zone: ZoneId;
  xg: number;
  outcome: 'goal' | 'save' | 'miss' | 'clearance' | 'woodwork';
}

export interface MatchResult {
  seed: number;
  stats: MatchStats;
  events: MatchStateEvent[];
  insights: string[];
  shotsLog: EngineShot[];
  /** Maçta sakatlanan oyuncular: { playerId, days } */
  injuries: { playerId: string; days: number }[];
  /** Kırmızı kart → maç cezası */
  suspensions: { playerId: string; matches: number }[];
  referee?: RefereeProfile;
  /** QA/audit telemetry for the non-user AI's two in-match plan decisions. */
  aiDecisionTraces?: AiDecisionTrace[];
}

// ——— RNG yardımcısı —————————————————————————————————————————
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// AI tactic defaults live in tactics.ts so both match paths share the same helper.

// ——— Ana döngü ————————————————————————————————————————————
function simulateMatchLegacy(input: MatchInput): MatchResult {
  const rng = mulberry32(input.seed);
  const goalPaceMul = input.goalPace === 'dusuk' ? 0.85 : input.goalPace === 'yuksek' ? 1.18 : 1.0; // §8.4
  const jitter = input.randomness === 'low' ? 2 : input.randomness === 'high' ? 8 : 5;              // §9.3
  const weather = input.weather ?? (['acik', 'acik', 'acik', 'yagmur', 'sicak', 'rüzgar'] as Weather[])[Math.floor(rng() * 6)];

  const homeLine = autoLineup(input.homeSquad, input.homeTactic.formation);
  const awayTac = input.awayTactic ?? aiDefaultTactic(input.awayClub, input.homeClub, input.homeClub.strength);
  const awayLine = autoLineup(input.awaySquad, awayTac.formation);

  // Formasyon dizilişinde bulunamadıysa (kısa kadro) profili zayıflat
  let homeProfCanvas = teamProfile(homeLine.slots, input.homeTactic, { home: true, derby: !!input.derby });
  let awayProfCanvas = teamProfile(awayLine.slots, awayTac, { home: false, derby: !!input.derby });

  const events: MatchStateEvent[] = [];
  const shotsLog: EngineShot[] = []; // Dalga 2 (§5-D)
  const stats: MatchStats = {
    hg: 0, ag: 0, xgH: 0, xgA: 0, shotsH: 0, shotsA: 0, onH: 0, onA: 0,
    posH: 50, cornersH: 0, cornersA: 0, foulsH: 0, foulsA: 0, yellowH: 0, yellowA: 0, redH: 0, redA: 0,
    savesH: 0, savesA: 0, possessionCount: 0,
    wideAttH: 0, wideAttA: 0, centralAttH: 0, centralAttA: 0, pressWinsH: 0, pressWinsA: 0,
    playerRows: {},
  };
  const injuries: MatchResult['injuries'] = [];
  const suspensions: MatchResult['suspensions'] = [];
  const playerRows = stats.playerRows;

  const pushRow = (slot: LineupSlot, min: number) => {
    const id = slot.player.id;
    if (!playerRows[id]) playerRows[id] = { min: 0, g: 0, a: 0, shots: 0, saves: 0, yellow: 0, red: 0, posGroup: slot.slotGroup, endFit: 100, rating: 6.0, conceded: 0 };
    playerRows[id].min = min;
  };
  homeLine.slots.forEach((s) => pushRow(s, 0));
  awayLine.slots.forEach((s) => pushRow(s, 0));

  // §13.2 rating yayma
  for (const s of [...homeLine.slots, ...awayLine.slots]) {
    const id = s.player.id;
    const base = Math.min(2.0, Math.max(0, (s.player.ratings.gen - 60) / 20));
    playerRows[id].rating = 6.0 + base * 0.8;
  }

  const homeSubsRemaining = { v: 5 };
  const awaySubsRemaining = { v: 5 };
  const subWindowsH = { v: 3 }; const subWindowsA = { v: 3 }; // IFAB 3 durak
  const lastSubMinuteH = { v: -1 }; const lastSubMinuteA = { v: -1 };


  let minute = 0;
  const endMinute = 90 + Math.floor(rng() * 6); // uzatma 0–5
  // §6.1: 70-110 anlamlı possession hedefi → zincir süresi 70-110 sn
  const possessionSeconds = () => 30 + Math.floor(rng() * 70);

  const doGoal = (side: 'home' | 'away', scorer: LineupSlot, assister: LineupSlot | null) => {
    if (side === 'home') stats.hg++; else stats.ag++;
    const row = playerRows[scorer.player.id]; row.g++; row.rating += 0.8;
    if (assister) { playerRows[assister.player.id].a++; playerRows[assister.player.id].rating += 0.4; }
    return side;
  };

  let clockSec = 0;
  const strengthGap = Math.abs(input.homeClub.strength - input.awayClub.strength);
  while (minute < endMinute) {
    clockSec += possessionSeconds();
    minute = Math.floor(clockSec / 60);
    if (minute > endMinute - 2) break;

    // §6.2 updateFatigue: 5 dk adımda
    if (minute % 5 === 0) {
      tickFatigue(homeLine.slots, input.homeTactic, minute, stats.hg > stats.ag, 0, input.homeTactic.press === 'high', weather === 'sicak');
      tickFatigue(awayLine.slots, awayTac, minute, stats.ag > stats.hg, 0, awayTac.press === 'high', weather === 'sicak');
    }

    // §11 Değişiklik/taktik geçişi (durakta) — IFAB: takım başına 5 değişiklik, 3 durak (devre arası 45' serbest)
    const subH = minute % 2 === 0 ? input.subMgr?.takeSubRequest('home') : null;
    if (subH && homeSubsRemaining.v > 0) {
      const windowNeeded = minute !== 45 && lastSubMinuteH.v !== minute;
      if (!(windowNeeded && subWindowsH.v <= 0)) {
        const outIdx = homeLine.slots.findIndex((s) => s.player.id === subH.outId);
        const inP = homeLine.bench.find((p) => p.id === subH.inId && !homeLine.slots.some((s) => s.player.id === p.id));
        if (outIdx >= 0 && inP) {
          const oldSlot = homeLine.slots[outIdx];
          const newSlot: LineupSlot = { player: inP, slotGroup: oldSlot.slotGroup, liveFitness: 100, yellows: 0, subMinute: minute, offs: { g: 0, a: 0, shots: 0, saves: 0, yellow: 0, red: 0 } };
          homeLine.slots[outIdx] = newSlot;
          homeLine.bench = homeLine.bench.filter((p) => p.id !== inP.id);
          homeSubsRemaining.v--;
          if (windowNeeded) { subWindowsH.v--; lastSubMinuteH.v = minute; }
          pushRow(newSlot, 0);
          events.push({ minute, side: 'home', text: `Değişiklik: ${oldSlot.player.name} ≠ ${inP.name} oyunda.`, kind: 'sub', anim: { eventType: 'substitution', attackingTeamId: input.homeClub.id } });
        }
      }
    }

    // §11 + IFAB: yanlız yenilenme isteği yoksa AI otomatik bakar — yorulanı 62/72/82'de tazeleyıcıyla değiştir
    if (minute === 62 || minute === 72 || minute === 82) {
      for (const side of ['home', 'away'] as const) {
        if (input.userSide && side === input.userSide) continue; // kullanıcı tarafı — AI karışmaz
        const line = side === 'home' ? homeLine : awayLine;
        const subsLeft = side === 'home' ? homeSubsRemaining.v : awaySubsRemaining.v;
        const winLeft = side === 'home' ? subWindowsH.v : subWindowsA.v;
        if (subsLeft <= 0 || winLeft <= 0 || line.bench.length === 0) continue;
        const tired = line.slots
          .filter((s) => s.slotGroup !== 'GK' && s.liveFitness < 62 && rng() < 0.4)
          .sort((a, b) => a.liveFitness - b.liveFitness)[0];
        if (!tired) continue;
        const repl = line.bench
          .filter((p) => p.group === tired.slotGroup || p.secondary.includes(tired.slotGroup))
          .sort((a, b) => b.ratings.gen - a.ratings.gen)[0] ?? null;
        if (!repl || repl.ratings.gen < tired.player.ratings.gen - 5) continue; // kalite dip eşiği — AI dengeyi bozmaz
        const outIdx = line.slots.findIndex((s) => s.player.id === tired.player.id);
        line.slots[outIdx] = { player: repl, slotGroup: tired.slotGroup, liveFitness: 100, yellows: 0, subMinute: minute, offs: { g: 0, a: 0, shots: 0, saves: 0, yellow: 0, red: 0 } };
        line.bench = line.bench.filter((p) => p.id !== repl.id);
        if (side === 'home') { homeSubsRemaining.v--; subWindowsH.v--; lastSubMinuteH.v = minute; } else { awaySubsRemaining.v--; subWindowsA.v--; lastSubMinuteA.v = minute; }
        pushRow(line.slots[outIdx], 0);
        events.push({ minute, side, text: `Teknik direktör kararı: ${tired.player.name} ≠ ${repl.name} oyunda.`, kind: 'sub', anim: { eventType: 'substitution', attackingTeamId: line === homeLine ? input.homeClub.id : input.awayClub.id } });
        if (side === 'home') { homeProfCanvas = teamProfile(homeLine.slots, input.homeTactic, { home: true, derby: !!input.derby }); }
        else { awayProfCanvas = teamProfile(awayLine.slots, awayTac, { home: false, derby: !!input.derby }); }
      }
    }

    // §6.2 — Possession
    const ctx: PossessionContext = {
      minute, homeScore: stats.hg, awayScore: stats.ag, rng, jitter, goalPaceMul, weather,
    };
    const owner = resolvePossessionOwner(homeProfCanvas, awayProfCanvas, ctx);
    const att = owner === 'home' ? { prof: homeProfCanvas, tac: input.homeTactic, slots: homeLine.slots, club: input.homeClub, side: 'home' as const, defProf: awayProfCanvas, defs: awayLine.slots } :
                                   { prof: awayProfCanvas, tac: awayTac, slots: awayLine.slots, club: input.awayClub, side: 'away' as const, defProf: homeProfCanvas, defs: homeLine.slots };
    // Presle top kazanma (§5.1 yüksek pres bedeli/bonusu)
    const wonByPress = rng() < Math.max(0, Math.min(0.35, (att.prof.press - att.defProf.buildUp) * 0.003 + 0.08));
    const start = resolveStartZone(att.prof, rng, wonByPress);

    stats.possessionCount++;
    const pos = runPossession(owner, start, att.prof, att.defProf, att.tac, owner === 'home' ? awayTac : input.homeTactic, att.slots, att.defs, ctx);

    // büyük güç farkında favori tokluğu (60'+ tempo düşüşü)
    if (strengthGap > 20 && minute > 60 && rng() < 0.15) continue;

    // ——— Sonuca göre aksiyon ——————————————————————————————
    const narrCtx = { rng, weather, homeClub: input.homeClub, awayClub: input.awayClub, jitter };

    if (pos.outcome === 'shot') {
      const shooter = pos.ballHolder ?? pickSlot(att.slots, pos.end, true); // v0.9.10: top kimdeyse vuran o
      const keeperSlot = att.defs.find((s) => isActiveOnPitch(s) && s.slotGroup === 'GK') ?? att.defs.find(isActiveOnPitch);
      const attackerEff = shooter ? (shooter.player.ratings.att + shooter.player.ratings.fiz) / 2 : 50;
      const keeperEff = keeperSlot ? (keeperSlot.player.ratings.kal ?? keeperSlot.player.ratings.gen) : 50;
      const attachShotPresentation = (outcome: 'goal' | 'save' | 'miss') => {
        const event = events[events.length - 1];
        if (!event) return;
        const actorId = shooter?.player.id;
        const cue = actorId ? shotVisualCue(input.seed, minute, actorId, pos.end, outcome, pos.chain.some((step) => step.intent === 'cross')) : undefined;
        event.anim = { eventType: cue ?? 'shot', attackingTeamId: att.club.id, path: pos.path, actors: actorId ? [actorId] : undefined, outcome };
        if (cue) {
          event.visualEvent = cue;
          event.visualActors = actorId ? [actorId] : undefined;
          event.text += cue === 'woodwork' ? ' Direğe çarpıp geri döndü!' : ' Vole vuruşu!';
        }
      };

      if (owner === 'home') { stats.shotsH++; stats.xgH += pos.xgPotential; playerRows[shooter?.player.id ?? ''].shots++; } else { stats.shotsA++; stats.xgA += pos.xgPotential; if (shooter) playerRows[shooter.player.id].shots++; }

      // §8.3 Goal çözümü
      const weatherXF = weather === 'yagmur' ? 0.97 : 1;
      const finAdj = Math.max(0.75, Math.min(1.3, 0.55 + attackerEff / 160));   // bitiricilik ±
      const kpAdj = Math.max(0.7, Math.min(1.25, 1.35 - keeperEff / 160));      // kaleci savunma: güçlü kaleci p olasılığını kısar
      // QA-DENGE (v0.4.4): iki taraf da zayıfsa maç kaosu — alt lig fikstürüne gol artışı (zirve/geçit ~×1.0)
      const matchQ = (att.prof.raw.baseQuality + att.defProf.raw.baseQuality) / 2;
      const chaosAdj = 1 + Math.max(0, (62 - matchQ) * 0.038);
      // QA-DENGE (v0.8.0): taban 0.80→0.90 — 0-0 oranı %23'ün altına geriletilir (gerçek süreç ~%8-12); üst lig ortalama gol hedefi ~2.6-2.9 korunur
      const goalProb = Math.max(0.01, Math.min(0.72, pos.xgPotential * 0.90 * finAdj * kpAdj * chaosAdj * weatherXF));

      if (rng() < goalProb) {
        const clearer = pos.end.endsWith('-A') ? rollGoalLineClearance(att.defs, rng) : null;
        if (clearer) {
          shotsLog.push({ minute, side: owner, zone: pos.end, xg: pos.xgPotential, outcome: 'clearance' });
          if (owner === 'home') { stats.onH++; stats.cornersH++; } else { stats.onA++; stats.cornersA++; }
          events.push({ minute, side: owner, text: `İNANILMAZ MÜDAHALE! ${clearer.player.name} topu çizgi üzerinden kornere gönderdi!`, kind: 'danger', path: pos.path, anim: { eventType: 'line_clearance', attackingTeamId: att.club.id, path: pos.path, actors: [shooter?.player.id, clearer.player.id].filter((id): id is string => !!id), outcome: 'clearance' }, shotsAfter: { h: stats.shotsH, a: stats.shotsA } });
        } else {
          // VAR incelemesi (§10.3): yalnızca kaleye giden ve çizgiden çıkarılmayan pozisyonlarda.
          const varTriggered = rng() < 0.09;
          if (varTriggered) {
            const onside = rng() < 0.8;
            events.push({ minute, side: owner, text: 'VAR incelemesi: pozisyon izleniyor…', kind: 'var', anim: { eventType: 'var', attackingTeamId: att.club.id, path: pos.path, actors: pos.keyPassers, outcome: onside ? 'onside' : 'offside' }, shotsAfter: { h: stats.shotsH, a: stats.shotsA } });
            if (!onside) { /* gol iptal */ shotsLog.push({ minute, side: owner, zone: pos.end, xg: pos.xgPotential, outcome: 'miss' }); narrate(events, pos, att.club, shooter, minute, 'varNo', narrCtx); continue; }
          }
          shotsLog.push({ minute, side: owner, zone: pos.end, xg: pos.xgPotential, outcome: 'goal' });
          doGoal(owner, shooter!, (pos.lastPasser && pos.lastPasser.player.id !== shooter?.player.id) ? pos.lastPasser : null); // v0.9.10 asist kredisi
          narrate(events, pos, att.club, shooter, minute, 'goal', narrCtx);
          attachShotPresentation('goal');
        }
      } else if (rng() < 0.5) {
        if (owner === 'home') stats.onH++; else stats.onA++;
        if (keeperSlot) { playerRows[keeperSlot.player.id].saves++; playerRows[keeperSlot.player.id].rating += 0.1; }
        // FIX QA-E3: savesX = X'in KALECİSİNİN kurtarışları → şutu atan rakip takımsa kendi kalecisi değil KARŞI kaleci kurtarır
        if (owner === 'home') stats.savesA++; else stats.savesH++;
        shotsLog.push({ minute, side: owner, zone: pos.end, xg: pos.xgPotential, outcome: 'save' });
        narrate(events, pos, att.club, shooter, minute, 'save', narrCtx, keeperSlot);
        attachShotPresentation('save');
      } else {
        shotsLog.push({ minute, side: owner, zone: pos.end, xg: pos.xgPotential, outcome: 'miss' });
        narrate(events, pos, att.club, shooter, minute, 'miss', narrCtx);
        attachShotPresentation('miss');
      }

    } else if (pos.outcome === 'foul') {
      if (owner === 'home') stats.foulsA++; else stats.foulsH++; // karşı takım foul yaptı
      // Sarı kart (§10.1)
      const cardProb = (att.tac.press === 'high' ? 0.30 : 0.18) + (weather === 'yagmur' ? 0.06 : 0) + ((stats.hg !== stats.ag) ? 0.03 : 0);
      if (rng() < cardProb) {
        // nadiren direkt kırmızı (sert faul)
        const directRed = rng() < (att.tac.press === 'high' ? 0.015 : 0.008);
        const eligibleDefenders = att.defs.filter(isActiveOnPitch);
        const culpr = eligibleDefenders[Math.floor(rng() * Math.min(6, eligibleDefenders.length))];
        if (culpr && isActiveOnPitch(culpr)) {
          if (directRed) {
            culpr.sentOff = true;
            if (owner === 'home') stats.redA++; else stats.redH++;
            playerRows[culpr.player.id].red++;
            suspensions.push({ playerId: culpr.player.id, matches: 3 });
            events.push({ minute, side: owner === 'home' ? 'away' : 'home', text: `Direkt kırmızı kart! ${culpr.player.name} oyun dışı.`, kind: 'card', anim: { eventType: 'card', attackingTeamId: culpr.player.clubId, outcome: 'red-direct' } });
            continue;
          }
          culpr.yellows++;
          if (owner === 'home') stats.yellowA++; else stats.yellowH++;
          playerRows[culpr.player.id].yellow++;
          if (culpr.yellows >= 2) {
            culpr.sentOff = true;
            if (owner === 'home') stats.redA++; else stats.redH++;
            playerRows[culpr.player.id].red++;
            suspensions.push({ playerId: culpr.player.id, matches: 1 });
            events.push({ minute, side: owner === 'home' ? 'away' : 'home', text: `İkinci sarıdan kırmızı! ${culpr.player.name} oyun dışı.`, kind: 'card', anim: { eventType: 'card', attackingTeamId: culpr.player.clubId, outcome: 'red' } });
          } else {
            events.push({ minute, side: owner === 'home' ? 'away' : 'home', text: `Sarı kart: ${culpr.player.name}.`, kind: 'card', anim: { eventType: 'card', attackingTeamId: culpr.player.clubId, outcome: 'yellow' } });
          }
        }
      }
      // Korner (~%15 foul zincirinden korner çıkar)
      if (rng() < 0.35) {
        if (owner === 'home') stats.cornersH++; else stats.cornersA++;
        // §10.4 duran top
        const setXG = Math.max(0.015, Math.min(0.09, 0.035 + (att.prof.setAtt - att.defProf.setDef) * 0.001));
        if (owner === 'home') { stats.shotsH++; stats.xgH += setXG; } else { stats.shotsA++; stats.xgA += setXG; }
        const shooter = att.slots.find((s) => isActiveOnPitch(s) && s.slotGroup === 'ST') ?? att.slots.find(isActiveOnPitch) ?? null;
        const gP = Math.max(0.01, Math.min(0.5, setXG * 0.7 * goalPaceMul));
        if (rng() < gP) {
          shotsLog.push({ minute, side: owner, zone: pos.end, xg: setXG, outcome: 'goal' });
          doGoal(owner, shooter!, (pos.lastPasser && pos.lastPasser.player.id !== shooter?.player.id) ? pos.lastPasser : null); // v0.9.10 asist kredisi
          events.push({ minute, side: owner, text: `Duran top golü! ${shooter?.player.name} tamamladı — ${ownScore()} – ${oppScore()}.`, kind: 'goal', anim: { eventType: 'goal', attackingTeamId: att.club.id, path: pos.path, actors: pos.keyPassers, outcome: 'setpiece' } , shotsAfter: { h: stats.shotsH, a: stats.shotsA } });
        } else {
          shotsLog.push({ minute, side: owner, zone: pos.end, xg: setXG, outcome: 'miss' });
          narrate(events, pos, att.club, shooter ?? null, minute, 'corner', narrCtx);
        }
      }

    } else if (pos.outcome === 'dangerous') {
      if (owner === 'home') stats.pressWinsA++; else stats.pressWinsH++;
      narrate(events, pos, att.club, null, minute, 'dangerous', narrCtx);
    } else if (pos.outcome === 'recycle') {
      if (pos.steps >= 4 && rng() < 0.3) narrate(events, pos, att.club, null, minute, 'buildup', narrCtx);
    } else if (pos.outcome === 'time') {
      if (rng() < 0.25) narrate(events, pos, att.club, null, minute, 'time', narrCtx);
    }

    // ——— Canlı yaralanma (§10.2) ————————————————————————————
    if (rng() < 0.008 * goalPaceMul) {
      const side = rng() < 0.5 ? att : null;
      if (side && side.slots.length) {
        const eligibleVictims = side.slots.filter(isActiveOnPitch);
        const vic = eligibleVictims[Math.floor(rng() * eligibleVictims.length)];
        if (vic && !vic.injured && !vic.sentOff) {
          const severity = rng() < 0.6 ? 'hafif' : rng() < 0.75 ? 'orta' : 'ağır';
          const days = severity === 'hafif' ? 3 + Math.floor(rng() * 10) : severity === 'orta' ? 14 + Math.floor(rng() * 30) : 60 + Math.floor(rng() * 120);
          vic.injured = true;
          vic.liveFitness = Math.min(vic.liveFitness, 30);
          injuries.push({ playerId: vic.player.id, days });
          events.push({ minute, side: side.side, text: `Sakatlık: ${vic.player.name} oyuncu kenara geliyor (${severity}).`, kind: 'injury', anim: { eventType: 'injury', attackingTeamId: side.club.id, outcome: severity } });
        }
      }
    }
  }

  // ——— Maç sonu güncellemesi ————————————————————————————————
  events.push({ minute: 45, side: 'home', text: 'İlk yarı sonu.', kind: 'half', anim: { eventType: 'halftime' } });
  events.push({ minute: endMinute, side: 'home', text: 'Maç sona erdi.', kind: 'half', anim: { eventType: 'fulltime' } });
  // Oyuncu dakikalarını normalize et
  for (const id of Object.keys(playerRows)) {
    playerRows[id].min = endMinute;
    playerRows[id].rating = Math.max(4.0, Math.min(10.0, playerRows[id].rating));
  }

  // Possession normalize (§13.1 %)
  const controlScore = homeProfCanvas.midfield + homeProfCanvas.buildUp;
  const oppScoreVal = awayProfCanvas.midfield + awayProfCanvas.buildUp;
  stats.posH = Math.max(28, Math.min(72, Math.round(50 + (controlScore - oppScoreVal) * 0.25 + (input.derby ? 1.5 : 0) + (weather === 'yagmur' ? -1 : 0))));

  // xG round-up (0.1 min)
  stats.xgH = Math.max(0.05, stats.xgH);
  stats.xgA = Math.max(0.05, stats.xgA);

  const insights = buildInsights(stats, { home: input.homeClub, away: input.awayClub }, weather, {
    homeProf: homeProfCanvas, awayProf: awayProfCanvas, homeTac: input.homeTactic, awayTac,
  });

  function ownScore() { return stats.hg; } function oppScore() { return stats.ag; }

  // FIX QA-E4: olay akışını dakika sırasına diz (devre/maç sonu olayları sonda eklendi; stable sort)
  events.sort((a, b) => a.minute - b.minute);

  // QA-DENGE (v0.8.0): raporlanan xG maç başına 7.0 ile kırpılır — tek maçta >7 xG istatistiksel sapma olarak sunulmaz
  stats.xgH = Math.min(stats.xgH, 7);
  stats.xgA = Math.min(stats.xgA, 7);
  return { seed: input.seed, stats, events, insights, injuries, suspensions, shotsLog };
}

/**
 * Instant fixtures use the same deterministic stepper as the live match screen.
 * The historical batch implementation above is retained privately during the
 * migration window, but no production call path uses it.
 */
export function simulateMatch(input: MatchInput): MatchResult {
  return new MatchSession(input).finishNow();
}
