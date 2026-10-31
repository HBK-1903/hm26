// HM26 Maç Motoru §3.3 / §5 — Takım Maç Profili hesaplayıcı
// Kadro + formasyon + taktik + kondisyon → 11 kanal puanı

import type { Player, TacticPlan, Formation, PositionGroup } from '../types';
import {effectivePlayer} from './ratings';
import {cohesionFactor} from './tacticsStudio';

export interface TeamMatchProfile {
  buildUp: number;          // BuildUpScore
  midfield: number;         // MidfieldControl
  wideAttack: number;       // WideAttackScore
  centralAttack: number;    // CentralAttackScore
  finalThird: number;       // FinalThirdScore
  block: number;            // DefensiveBlockScore
  press: number;            // PressScore
  transition: number;       // TransitionScore
  setAtt: number;           // SetPieceAttackScore
  setDef: number;           // SetPieceDefenceScore
  keeper: number;           // KeeperScore
  /** Hücum şeridi dakika-orta temp anlık düzeltmeleri için ham özet */
  raw: { baseQuality: number; meanFitness: number; meanForm: number };
}

/** Formasyon → görev grubu yerleşimi (11 oyuncu, G'den S'a) */
export const FORMATION_SLOTS: Record<Formation, PositionGroup[]> = {
  '4-3-3':   ['GK', 'FB', 'CB', 'CB', 'FB', 'CM', 'DM', 'CM', 'WG', 'ST', 'WG'],
  '4-2-3-1': ['GK', 'FB', 'CB', 'CB', 'FB', 'DM', 'DM', 'AM', 'WG', 'AM', 'ST'],
  '4-4-2':   ['GK', 'FB', 'CB', 'CB', 'FB', 'CM', 'CM', 'WG', 'WG', 'ST', 'ST'],
  '4-1-4-1': ['GK', 'FB', 'CB', 'CB', 'FB', 'DM', 'CM', 'CM', 'WG', 'WG', 'ST'],
  '3-5-2':   ['GK', 'CB', 'CB', 'CB', 'WB', 'WB', 'CM', 'DM', 'CM', 'ST', 'ST'],
  '5-3-2':   ['GK', 'CB', 'CB', 'CB', 'FB', 'FB', 'CM', 'DM', 'CM', 'ST', 'ST'],
};

export interface LineupSlot {
  player: Player;
  slotGroup: PositionGroup;
  liveFitness: number;
  sentOff?: boolean;
  injured?: boolean;
  yellows: number;
  subMinute?: number;   // değişiklikle geldiği dakika; yoksa başlangıç
  offs?: { g: number; a: number; shots: number; saves: number; yellow: number; red: number };
}

/** One canonical match-availability rule for every on-pitch actor selector. */
export function isActiveOnPitch(slot: Pick<LineupSlot, 'sentOff' | 'injured'>): boolean {
  return !slot.sentOff && !slot.injured;
}

/**
 * Kaleci slotu çözümü: aktif GK yoksa (sakatlık veya kırmızı kart) takımın birincil
 * kaleci slotuna döner. Böylece hiçbir koşulda bir savunmacı "kaleci" olarak seçilip
 * gol yeme/kurtarış istatistiği almaz; kurtarış mekaniği de GK reytingini kullanmaya devam eder.
 */
export function resolveKeeper(slots: LineupSlot[]): LineupSlot | undefined {
  const primary = slots.find((s) => s.slotGroup === 'GK');
  const active = slots.find((s) => s.slotGroup === 'GK' && isActiveOnPitch(s));
  return active ?? primary;
}

/** Kullanılabilir oyuncular (ilk 11 veya yedek havuzu → slot eşlemesi) */
export function autoLineup(squad: Player[], formation: Formation, customIds?: (string | null)[], riskIds?: Set<string>, customBenchIds?: readonly string[]): { slots: LineupSlot[]; bench: Player[] } {
  // v0.9.9: iğneyle oynatma onaylı sakatlar (riskIds) da saute indirgenebilir
  const availAll = squad.filter((p) => (p.injuredDays <= 0 || riskIds?.has(p.id)) && p.suspendedMatches <= 0);
  // Kullanıcı seçimi varsa: o dizilim önce gelir (gençleşme düşükse de sahaya sürer — maç reytingi kondisyonu düşürür)
  const forced = new Set<string>((customIds ?? []).filter(Boolean) as string[]);
  const avail = [...availAll].sort((a, b) => {
    const af = forced.has(a.id) ? 1 : 0, bf = forced.has(b.id) ? 1 : 0;
    if (af !== bf) return bf - af;
    return b.ratings.gen - a.ratings.gen;
  }).filter((p) => p.fitness >= 40 || forced.has(p.id));
  const slots: LineupSlot[] = [];
  const used = new Set<string>();
  // FIX QA-G3: kullanıcı dizilimi (customIds) yuva sırasıyla slota İŞLENİR (önceki sürüm sadece işaretleyip atlıyordu → manuel 11 motora ulaşmıyordu)
  const preSlots: (LineupSlot | null)[] = [];
  const groups = FORMATION_SLOTS[formation];
  if (customIds?.length === 11) {
    customIds.forEach((id, idx) => {
      const p = id ? squad.find((x) => x.id === id) : undefined;
      if (p && !used.has(p.id) && (p.injuredDays <= 0 || riskIds?.has(p.id)) && p.suspendedMatches <= 0 && groups[idx]) {
        used.add(p.id);
        preSlots[idx] = { player: p, slotGroup: groups[idx], liveFitness: p.fitness, yellows: 0, offs: { g: 0, a: 0, shots: 0, saves: 0, yellow: 0, red: 0 } };
      }
    });
  }
  for (let si = 0; si < groups.length; si++) {
    const slotGroup = groups[si];
    if (preSlots[si]) { slots.push(preSlots[si]!); continue; }
    // Doğal pozisyondan başla → secondary → kalan
    let pick = avail.find((p) => !used.has(p.id) && p.group === slotGroup);
    if (!pick) pick = avail.find((p) => !used.has(p.id) && p.secondary.includes(slotGroup));
    if (!pick) pick = avail.find((p) => !used.has(p.id));
    if (!pick) continue;
    used.add(pick.id);
    slots.push({ player: pick, slotGroup, liveFitness: pick.fitness, yellows: 0, offs: { g: 0, a: 0, shots: 0, saves: 0, yellow: 0, red: 0 } });
  }
  // Legacy extra squads can contain a second copy of the same player ID. A
  // footballer may occupy only one place, including on the matchday bench.
  const benchSeen = new Set(used);
  const benchPool = avail.filter((p) => {
    if (benchSeen.has(p.id)) return false;
    benchSeen.add(p.id);
    return true;
  });
  const benchById = new Map(benchPool.map((p) => [p.id, p]));
  const preferred = [...new Set(customBenchIds ?? [])].flatMap((id) => {
    const player = benchById.get(id);
    return player ? [player] : [];
  });
  const preferredIds = new Set(preferred.map((p) => p.id));
  // Respect the selected bench first, then fill unused places with available players.
  const bench = [...preferred, ...benchPool.filter((p) => !preferredIds.has(p.id))].slice(0, 9);
  return { slots: slots.slice(0, 11), bench };
}

export function effective(slot: LineupSlot, tacticalMod = 1, contextMod = 1): number {
  return effectivePlayer({
    player: slot.player,
    slotGroup: slot.slotGroup,
    liveFitness: slot.liveFitness,
    tacticalMod,
    contextMod,
  });
}

/** §3.3 — 11 puan türetimi */
export function teamProfile(slots: LineupSlot[], tactic: TacticPlan, ctx: { home: boolean; derby: boolean }): TeamMatchProfile {
  const activeSlots = slots.filter(isActiveOnPitch);
  const eff = (s: LineupSlot) => effective(s, 1, ctx.home ? 1.02 : 0.99) // §9.1 mütevazı ev avantajı
    ;
  const byGroup = (g: PositionGroup[]) => activeSlots.filter((s) => g.includes(s.slotGroup));
  const mean = (arr: LineupSlot[], fn: (s: LineupSlot) => number) => {
    const f = arr.length ? arr : activeSlots;
    const tot = f.reduce((t, s) => t + fn(s), 0);
    return tot / Math.max(1, f.length);
  };

  const gk = byGroup(['GK']);
  const defs = byGroup(['CB', 'FB', 'WB']);
  const dms = byGroup(['DM']);
  const mids = byGroup(['CM', 'DM']);
  const att = byGroup(['AM', 'WG', 'ST']);
  const wg = byGroup(['WG', 'WB', 'FB']);
  const st = byGroup(['ST', 'AM']);

  // Kanat "rol skoru": FB/WB side + WG tarafı + bek-ileri bonusu
  const wScale = (tactic.width - 50) * 0.004;                    // genişlik etkisi
  const fbAdv = tactic.fbAdvanced ? 0.04 : 0;                    // bekler ileri
  const dirBias = tactic.direction;

  let buildUp = 0.5 * mean([...defs, ...dms], (s) => eff(s) * (s.player.ratings.tek / 80)) +
                0.5 * mean(gk, (s) => eff(s) * ((s.player.ratings.tek + s.player.ratings.men) / 160));
  let midfield = mean(mids, (s) => eff(s) * ((s.player.ratings.tek + s.player.ratings.men) / 170));
  let wideAttack = mean(wg, (s) => eff(s) * ((s.player.ratings.att + s.player.ratings.tek) / 170)) * (1 + wScale + fbAdv);
  let centralAttack = mean(att, (s) => eff(s) * ((s.player.ratings.att + s.player.ratings.men) / 170));
  let finalThird = mean(st, (s) => eff(s) * ((s.player.ratings.att + s.player.ratings.tek) / 175)) +
                   mean(att.slice(0, 2), (s) => eff(s) * 0.25);
  let block = 0.6 * mean(defs, (s) => eff(s) * ((s.player.ratings.def + s.player.ratings.fiz) / 175)) +
              0.4 * mean(dms.length ? dms : mids, (s) => eff(s) * ((s.player.ratings.def + s.player.ratings.men) / 175));
  let press = mean([...defs, ...mids], (s) => eff(s) * ((s.player.ratings.def + s.player.ratings.fiz) / 180));
  let transition = mean([...mids, ...att], (s) => eff(s) * ((s.player.ratings.fiz * 0.4 + s.player.ratings.tek * 0.3 + s.player.ratings.men * 0.3) / 100));
  let setAtt = mean(att.slice(0, 4), (s) => eff(s) * ((s.player.ratings.att + s.player.ratings.fiz) / 180));
  let setDef = mean(defs.slice(0, 4), (s) => eff(s) * ((s.player.ratings.def + s.player.ratings.fiz) / 185));
  const keeper = mean(gk, (s) => effective(s, 1, ctx.home ? 1.02 : 1) * (((s.player.ratings.kal ?? 50) + s.player.ratings.men) / 160));

  // §5.1 plan etkileri
  switch (tactic.plan) {
    case 'posession':
      buildUp *= 1.12; midfield *= 1.10; transition *= 0.95; finalThird *= 0.95; break;
    case 'yuksekPres':
      press *= 1.22; block *= 0.96; /* §5.2 bedel: savunma arkası risk, fizik tüketimi */ transition *= 0.98; break;
    case 'hizliKontra':
      transition *= 1.24; midfield *= 0.94; wideAttack *= 0.98; centralAttack *= 0.98; break;
    case 'kanat':
      wideAttack *= 1.18; centralAttack *= 0.96; break;
    case 'dusukBlok':
      block *= 1.22; midfield *= 0.9; transition *= 1.05; finalThird *= 0.9; press *= 0.9; break;
    default: break;
  }

  // §5.2 talimatlar (~-10..+10 normalize etki → ±%8 çarpan)
  const tri = { low: -1, mid: 0, high: 1 } as const;
  press *= 1 + tri[tactic.press] * 0.08;
  const tempoM = 1 + tri[tactic.tempo] * 0.06;
  midfield *= tempoM; wideAttack *= tempoM; centralAttack *= tempoM;
  if (tactic.direction !== 'balanced') {
    if (dirBias === 'left' || dirBias === 'right') wideAttack *= 1.06; else centralAttack *= 1.06;
  }
  if (tactic.defLine === 'high') block *= 0.96;
  if (tactic.defLine === 'deep') block *= 1.05;
  if (tactic.passRisk === 'direct') transition *= 1.05;
  if (tactic.passRisk === 'safe') midfield *= 1.04;
  // Aynı yönlü aşırılık bedeli: yüksek pres + önde çizgi → savunma-arkası risk
  if (tactic.press === 'high' && tactic.defLine === 'high') block *= 0.95;

  if (ctx.derby) { press *= 1.03; block *= 1.02; } // §9.1 derbi atmosferi (güçlendirilmemiş ince fark)

  // Dalga 4: taktiksel uyum yalnız pas/top tutma kanallarına ince etki yapar.
  // Damgasız plan (eski kayıt/AI/henüz maç oynamamış) çarpanı 1.00 olduğu için denge değişmez.
  const cohesion = cohesionFactor(tactic);
  buildUp *= cohesion; midfield *= cohesion; transition *= cohesion;

  const meanFitness = mean(activeSlots, (s) => s.player.fitness);
  const meanForm = mean(activeSlots, (s) => s.player.form);
  const baseQuality = (buildUp + midfield + finalThird + block) / 4;
  return {
    buildUp, midfield, wideAttack, centralAttack, finalThird,
    block, press, transition, setAtt, setDef, keeper,
    raw: { baseQuality, meanFitness, meanForm },
  };
}

/** §6.2 updateFatigueAndSharpness — planına göre canlı kondisyon tüketimi (5 dk adımda) */
export function tickFatigue(
  slots: LineupSlot[], tactic: TacticPlan, minutes: number, led: boolean, sinking: number,
  highPress: boolean, hot: boolean, burnMultiplier = 1, deltaMinutes = 5,
): void {
  if (!Number.isFinite(deltaMinutes) || deltaMinutes < 0) throw new Error('Fatigue delta must be a finite non-negative minute value.');
  const timeScale = deltaMinutes / 5; // Preserve the established burn calibration, now applied by elapsed time.
  const burnBase = 0.10 + (highPress ? 0.035 : 0) + (tactic.tempo === 'high' ? 0.02 : 0) + (hot ? 0.02 : 0);
  for (const s of slots) {
    if (s.sentOff || s.injured) continue;
    const posMul = s.slotGroup === 'GK' ? 0.25 : s.slotGroup === 'CB' ? 0.9 : (s.slotGroup === 'CM' || s.slotGroup === 'WB') ? 1.15 : 1;
    s.liveFitness = Math.max(30, s.liveFitness - burnBase * posMul * burnMultiplier * (minutes > 70 && led ? 0.85 : 1) * (s.subMinute !== undefined ? 0.88 : 1) * timeScale);
    if (s.subMinute !== undefined) {
      const intervalStart = minutes - deltaMinutes;
      const recoveryStart = Math.max(intervalStart, s.subMinute + 15);
      const recoveryMinutes = Math.max(0, minutes - recoveryStart);
      s.liveFitness = Math.min(100, s.liveFitness + 0.05 * recoveryMinutes / 5);
    }
  }
  if (sinking > 0) {
    for (const s of slots) if (!s.sentOff && !s.injured) s.liveFitness = Math.max(30, s.liveFitness - 0.008 * sinking * timeScale);
  }
}
