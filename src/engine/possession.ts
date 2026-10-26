// HM26 Maç Motoru §6/§7 — Possession zinciri üretimi ve bölge geçişi
// v0.9.10: zincir artık OYUNCU SEVİYESİNDE — her adımda top kimde (ballHolder),
// kime pas (receiver), hangi niyetle (PassIntent) ve rakipte topu kim kapmaya çalışıyor (interceptor).
import { ZoneId, forwardNeighbors, laneOf, bandOf } from './zones';
import { TeamMatchProfile, LineupSlot, effective, isActiveOnPitch } from './profiles';
import { PositionGroup, TacticPlan } from '../types';

export type PassIntent =
  | 'distribute'   // kaleciden oyun kurma
  | 'short'        // kısa güvenli pas
  | 'progressive'  // ileri hat kıran pas
  | 'switch'       // oyunu ters kanada çevirme
  | 'through'      // ara pası
  | 'cross'        // orta
  | 'carry'        // dripling / top taşıma
  | 'backpass'     // geri pas / yeniden kurulum
  | 'long';        // uzun top

export interface PassStep {
  fromId: string; fromName: string; fromGroup: PositionGroup;
  toId: string | null; toName: string | null; toGroup: PositionGroup | null;
  intent: PassIntent;
  zone: ZoneId; // adımın hedef bölgesi
}

export interface Possession {
  owner: 'home' | 'away';
  start: ZoneId;
  end: ZoneId;
  path: ZoneId[];
  steps: number;
  outcome:
    | 'turnover'      // top kaybı
    | 'dangerous'     // tehlikeli kayıp / presle yakanma
    | 'shot'          // şuta çıktı
    | 'foul'          // faul / duran top kazanma
    | 'recycle'       // geri pas / yeniden kurulum
    | 'time';         // zaman yönetimi
  keyPassers: string[]; // oyuncu id'leri (kritik paslar)
  xgPotential: number;  // zincirin ürettiği pozisyon potansiyeli
  channel: 'wide' | 'central';
  // v0.9.10 oyuncu zinciri
  chain: PassStep[];
  ballHolder: LineupSlot | null;   // zincir sonunda top kimde (şut/kayıp anı)
  lastPasser: LineupSlot | null;   // asist adayı (son başarılı pası veren)
  dispossessedBy: LineupSlot | null; // topu kaparak savunmacı
  fouler: LineupSlot | null;       // faulü yapan
  fouled: LineupSlot | null;       // faule maruz kalan
}

export interface PossessionContext {
  minute: number;
  homeScore: number;
  awayScore: number;
  rng: () => number;
  jitter: number;          // §9.3 normalize jitter ±2/±5/±8
  goalPaceMul: number;     // §8.4
  weather: 'acik' | 'yagmur' | 'sicak' | 'rüzgar' | 'kotuZemin'; // §9.2
}

/** §6.3 — Sahiplik kararı: kontrol×pres düellosu + bağlam + jitter */
export function resolvePossessionOwner(
  home: TeamMatchProfile, away: TeamMatchProfile, ctx: PossessionContext
): 'home' | 'away' {
  const diffH = (home.midfield + home.buildUp) / 2 - away.press * 0.9;
  const diffA = (away.midfield + away.buildUp) / 2 - home.press * 0.9;
  // §9.3: farkı tanh ile sıkıştır — büyük kalite farkı possession'ı tamamen tıkamaz
  const pHome = Math.tanh(diffH / 18) * 7 + 1.0 + (ctx.rng() - 0.5) * ctx.jitter * 6;
  const pAway = Math.tanh(diffA / 18) * 7 + (ctx.rng() - 0.5) * ctx.jitter * 6;
  return pHome >= pAway ? 'home' : 'away';
}

/** Başlangıç bölgesi: gorilla gineme etkisiyle D bandından kurulum veya presle rakipte */
export function resolveStartZone(prof: TeamMatchProfile, rng: () => number, wonByPress: boolean): ZoneId {
  if (wonByPress && rng() < 0.6) {
    const lane: ZoneId[] = rng() < 0.5 ? (rng() < 0.5 ? ['L-A', 'L-M'] as ZoneId[] : ['R-A', 'R-M'] as ZoneId[]) : [rng() < 0.5 ? 'C-M' : 'C-A'];
    return lane[Math.floor(rng() * lane.length)];
  }
  return prof.buildUp > 60 ? (rng() < 0.5 ? 'C-D' : rng() < 0.5 ? 'L-D' : 'R-D') : rng() < 0.4 ? 'C-M' : 'C-D';
}

/** §7.3 — Bölge geçiş düellosu: hücum kanalı - savunma kanalı + taktik eşleşmesi + bağlam + jitter */
function channelAttack(prof: TeamMatchProfile, target: ZoneId): number {
  return laneOf(target) === 'C' ? prof.centralAttack : prof.wideAttack;
}
function channelDefence(prof: TeamMatchProfile, target: ZoneId): number {
  return laneOf(target) === 'C' ? prof.block : prof.block * 0.92; // kenar savunma hafif gevşek
}

/** Aşırı uyan büyümesi (yüksek pres) bedeli: savunma arkası darbe riski */
function highLinePenalty(tactic: TacticPlan): number {
  return tactic.press === 'high' && tactic.defLine === 'high' ? 4 : 0;
}

// ── v0.9.10: bölge → oyuncu havuzları (öncelik sıralı) ────────────────────
const DEF_POOL: Record<string, PositionGroup[]> = {
  D: ['CB', 'DM', 'FB', 'WB'],
  M: ['DM', 'CM', 'CB', 'FB', 'WB'],
  A: ['CB', 'DM', 'CM', 'FB', 'WB'],
};
const ATK_POOL: Record<string, PositionGroup[]> = {
  D: ['DM', 'CB', 'FB', 'WB', 'CM'],
  M: ['CM', 'DM', 'WB', 'AM', 'FB', 'WG'],
  A: ['ST', 'AM', 'WG', 'CM', 'WB', 'FB'],
};

function laneFit(s: LineupSlot, zone: ZoneId): number {
  const lane = laneOf(zone);
  return ((lane === 'L' && s.player.side === 'L') || (lane === 'R' && s.player.side === 'R') || s.player.side === 'C' || s.player.side === 'ANY') ? 1.05 : 1;
}

/** Bölgedeki en uygun oyuncu — öncelik havuzu + şerit uyumu + etkin güç */
function slotAt(slots: LineupSlot[], zone: ZoneId, pools: Record<string, PositionGroup[]>, rng: () => number): LineupSlot | null {
  const live = slots.filter(isActiveOnPitch);
  const ordered = pools[bandOf(zone)] ?? [];
  const pool: LineupSlot[] = [];
  for (const grp of ordered) for (const s of live) if (s.slotGroup === grp && !pool.includes(s)) pool.push(s);
  if (!pool.length) return null;
  const scored = pool.map((s) => ({ s, k: effective(s) * laneFit(s, zone) * (0.92 + rng() * 0.24) }));
  scored.sort((a, b) => b.k - a.k);
  // teknik üst 2'den rastgele seçim — her zincir aynı oyuncuya kilitlenmesin
  return scored[Math.floor(rng() * Math.min(2, scored.length))].s;
}

/** Savunmacı: bölgede taşıyıcıyı karşılayan presçi/top kapan */
function interceptorAt(defSlots: LineupSlot[] | undefined, zone: ZoneId, carrier: LineupSlot | null, rng: () => number): LineupSlot | null {
  if (!defSlots || !defSlots.length) return null;
  return slotAt(defSlots, zone, DEF_POOL, rng) ?? null;
}

/** Adım niyeti: bant/şerit hareketi + hedef oyuncu + taktik */
function intentOf(fromZone: ZoneId, toZone: ZoneId, receiver: LineupSlot | null, fromGroup: PositionGroup | null, tac: TacticPlan): PassIntent {
  if (fromGroup === 'GK') return 'distribute';
  const fb = bandOf(fromZone), tb = bandOf(toZone);
  const fl = laneOf(fromZone), tl = laneOf(toZone);
  if (fb === tb && fl === tl) return 'carry'; // dripling — top oyuncuda ilerledi
  if (fb === 'M' && tb === 'A' && tl !== 'C') return 'cross';
  if (tb === 'A' && fl !== 'C' && tl === 'C' && fb === 'A') return 'cross';
  if (fb === 'D' && tb === 'A') return 'long';
  const laneJump = Math.abs({ L: 0, C: 1, R: 2 }[fl] - { L: 0, C: 1, R: 2 }[tl]);
  if (laneJump >= 2 || (laneJump === 1 && fb === tb && fromZone.startsWith('C'))) return 'switch';
  if (tb === 'A' && fb === 'M' && tac.passRisk === 'direct') return 'through';
  const order = { D: 0, M: 1, A: 2 } as const;
  if (order[tb] > order[fb] || (tb === fb && fl !== tl && tac.tempo === 'high')) return 'progressive';
  if (order[tb] < order[fb]) return 'backpass';
  return 'short';
}

/**
 * Tek bir possession zinciri üret — v0.9.10: oyuncu-oyuncu pas ağı.
 * MAX_STEPS = 6; her adımda: top kimde → kime/bölgeye → düello (taşıyıcı tek/thk × presçi def/men) → sonuç.
 */
export function runPossession(
  owner: 'home' | 'away',
  startZone: ZoneId,
  attProf: TeamMatchProfile,
  defProf: TeamMatchProfile,
  attTactic: TacticPlan,
  defTactic: TacticPlan,
  attSlots: LineupSlot[],
  defSlots: LineupSlot[] | undefined,
  ctx: PossessionContext
): Possession {
  const rng = ctx.rng;
  let zone = startZone;
  const path: ZoneId[] = [zone];
  const chain: PassStep[] = [];
  const keyPassers: string[] = [];
  let xgPotential = 0;
  let channel: 'wide' | 'central' = laneOf(startZone) === 'C' ? 'central' : 'wide';
  const MAX = 6;

  // Topun ilk sahibi: D bandında kaleci pasla başlayabilir (buildUp güçlüyse %28)
  let holder: LineupSlot | null;
  const gk = attSlots.find((s) => isActiveOnPitch(s) && s.slotGroup === 'GK');
  if (bandOf(startZone) === 'D' && gk && attProf.buildUp > 58 && rng() < 0.28) {
    holder = gk;
    chain.push({ fromId: gk.player.id, fromName: gk.player.name, fromGroup: 'GK', toId: null, toName: null, toGroup: null, intent: 'distribute', zone: startZone });
  } else {
    holder = bandOf(startZone) === 'A' ? slotAt(attSlots, startZone, ATK_POOL, rng) : slotAt(attSlots, startZone, ATK_POOL, rng);
    if (!holder) holder = attSlots.find(isActiveOnPitch) ?? null;
  }
  const finish = (outcome: Possession['outcome'], steps: number, end: ZoneId, extra?: Partial<Possession>): Possession =>
    ({ owner, start: startZone, path, keyPassers, channel, chain, lastPasser: null, dispossessedBy: null, fouler: null, fouled: null,
       outcome, steps, end, ballHolder: holder, xgPotential, ...extra });

  // No active player means this side cannot build an actor chain or take a shot.
  if (!holder) return finish('turnover', 0, zone);

  // Zaman yönetimi (§11.3): önde + son bölüm (leading narrows risk)
  const leading = owner === 'home' ? ctx.homeScore > ctx.awayScore : ctx.awayScore > ctx.homeScore;
  const underdogBoost = (attProf.raw.baseQuality < defProf.raw.baseQuality - 10) ? 0.040 : 0;   // kupa ruhu
  if (leading && ctx.minute >= 80 && rng() < 0.45) {
    return finish('time', 1, zone);
  }

  let lastPasser: LineupSlot | null = null;

  for (let step = 0; step < MAX; step++) {
    // Eylem seçimi (§7.1–§7.2)
    const options = forwardNeighbors(zone);
    const targets = options.length ? options : [zone];

    // Hücum yönü tercihi (§5.2 Hücum yönü)
    let target = targets[Math.floor(rng() * targets.length)];
    if (attTactic.direction !== 'balanced' && rng() < 0.35) {
      const pref = attTactic.direction === 'center' ? 'C' : attTactic.direction === 'left' ? 'L' : 'R';
      const prefTargets = targets.filter((o) => laneOf(o) === pref);
      if (prefTargets.length) target = prefTargets[Math.floor(rng() * prefTargets.length)];
    }
    // Kanat planı: kanada aktarım ağırlığı
    if (attTactic.plan === 'kanat' && rng() < 0.3) {
      const wings = targets.filter((o) => laneOf(o) !== 'C');
      if (wings.length) target = wings[Math.floor(rng() * wings.length)];
    }
    // Yukarıya baskın tempo: dripling şansı (aynı bölgede top taşıma)
    if (rng() < (attTactic.tempo === 'high' ? 0.07 : 0.04)) target = zone;
    channel = laneOf(target) === 'C' ? 'central' : 'wide';

    // Pas hedefi (oyuncu) + presçi
    const receiver: LineupSlot | null = target === zone ? holder : slotAt(attSlots, target, ATK_POOL, rng) ?? holder;
    const interceptor = interceptorAt(defSlots, target, holder, rng);
    const intent = intentOf(zone, target, receiver, holder?.slotGroup ?? null, attTactic);

    // Düello — v0.9.10: oyuncu kalitesi çekirdeği (taşıyıcı tek/men ve fiz vs presçi def/men)
    const carrierSkill = holder ? (holder.player.ratings.tek * 0.45 + holder.player.ratings.men * 0.3 + holder.player.ratings.fiz * 0.25) * (holder.liveFitness / 100) : 50;
    const pressSkill = interceptor ? (interceptor.player.ratings.def * 0.5 + interceptor.player.ratings.men * 0.3 + interceptor.player.ratings.fiz * 0.2) * (interceptor.liveFitness / 100) : channelDefence(defProf, target);
    const aScore = channelAttack(attProf, target) * 0.45 + carrierSkill * 0.75 + (attProf.transition * (bandOf(target) === 'D' ? 0.2 : 0.1));
    const dScore = channelDefence(defProf, target) * 0.45 + pressSkill * 0.75 + highLinePenalty(defTactic) * -0.5;
    // Hava (§9.2): yağmurda teknik hata artar
    const weatherPen = ctx.weather === 'yagmur' ? -1.5 : ctx.weather === 'kotuZemin' ? -0.8 : 0;
    // niyet zorluğu: hat kıran paslar daha riskli
    const intentRisk = intent === 'through' ? -1.3 : intent === 'cross' ? -0.7 : intent === 'long' ? -1.1 : intent === 'switch' ? -0.4 : intent === 'progressive' ? 0.7 : intent === 'backpass' ? 1.4 : intent === 'short' ? 0.6 : 0;
    let rawDuel = (aScore - dScore) * 0.505 + intentRisk + weatherPen + (rng() - 0.5) * ctx.jitter;
    // §9.4: zayıf taraf sürprizi — kupa/ev bağlamında direnç bonusu (progressionı kapatmaz)
    if (attProf.raw.baseQuality < defProf.raw.baseQuality - 10) rawDuel += 10.5;
    // §15.2: güçlü takım uzun vadede üstün kalır ama skor patlaması olmaz — ±8 soft-cap
    const duel = rawDuel >= 0 ? Math.min(8, 8 * (1 - Math.exp(-rawDuel / 8))) : Math.max(-8, -8 * (1 - Math.exp(rawDuel / 8)));

    if (duel < -8) {
      // Tehlikeli top kaybı: kontra fırsatı rakibe
      if (rng() < 0.2 + Math.max(0, defProf.transition - 60) * 0.004) {
        return finish('dangerous', step + 1, zone, { dispossessedBy: interceptor, xgPotential: 0.05 });
      }
      return finish('turnover', step + 1, zone, { dispossessedBy: interceptor });
    }
    if (duel < -2) return finish('turnover', step + 1, zone, { dispossessedBy: interceptor });
    if (duel < -1.4) { // köprü: kart sahnesi kaynağı (bazen faul kalır)
      if (rng() < 0.35) return finish('foul', step + 1, zone, { fouler: interceptor, fouled: holder, xgPotential: 0.012 });
    }
    if (duel < 0) {
      // Geri pas / yeniden kurulum veya faul
      if (rng() < 0.25) return finish('foul', step + 1, zone, { fouler: interceptor, fouled: holder });
      return finish('recycle', step + 1, zone);
    }

    // Başarılı adım — top oyuncu değiştirdi
    const prevHolder = holder;
    zone = target;
    path.push(zone);
    if (receiver && receiver !== holder) { holder = receiver; lastPasser = prevHolder; }
    chain.push({
      fromId: prevHolder?.player.id ?? '', fromName: prevHolder?.player.name ?? '?', fromGroup: prevHolder?.slotGroup ?? 'CM',
      toId: receiver?.player.id ?? null, toName: receiver?.player.name ?? null, toGroup: receiver?.slotGroup ?? null,
      intent, zone,
    });
    if (receiver && (intent === 'progressive' || intent === 'through' || intent === 'switch' || intent === 'cross' || intent === 'long')) {
      keyPassers.push(receiver.player.id);
    }

    // Ceza sahası girişi/şut fırsatı (§8.1)
    const inBox = bandOf(zone) === 'A';
    const shotPull =
      (inBox ? 0.05 : bandOf(zone) === 'M' ? 0.004 : 0.0012) +
      (attTactic.passRisk === 'direct' ? 0.006 : 0) +
      (ctx.minute >= 75 && !leading ? 0.012 : 0) +     // risk arttırımı (§11.3)
      Math.tanh((channelAttack(attProf, zone) - channelDefence(defProf, zone)) / 12) * 0.018;
    // Wave 8 balance calibration raises shot intent modestly while retaining a hard per-step ceiling.
    const shotChanceCap = attProf.raw.baseQuality > defProf.raw.baseQuality + 10 ? 0.055 : 0.078;
    const cappedPull = Math.max(0, Math.min(shotChanceCap, (shotPull + underdogBoost) * ctx.goalPaceMul * 1.2));
    if (rng() < cappedPull) {
      // Şut: top KİMDEYSE o vurur (v0.9.10 top-oyuncu ayrımı); uygun değilse esnek havuza düş
      const shooter = holder && ['ST', 'AM', 'WG', 'CM', 'DM', 'WB', 'FB', 'CB'].includes(holder.slotGroup) ? holder : pickSlot(attSlots, zone, true);
      const shooterEff = shooter ? effective(shooter) : 50;
      xgPotential = qualityToXG(attProf.finalThird, defProf.block, defProf.keeper, shooterEff, rng);
      // QA-DENGE (v0.4.4): düşük-kalite maçlarda alt-lig kaos payı — zayıf hücumlar gerçek hayatta daha
      // rastgele/kaotik pozisyonlar üretir; zirve kalitesinde (~70+) çarpan ≈1.0, kök kalitesinde (~50) ×~1.45
      xgPotential *= 1 + Math.max(0, (64 - (attProf.finalThird + shooterEff) / 2) * 0.032);
      // büyük güç farkında xG tavanı: tek şut 0.48'i geçmez (§8.2 büyük bir bir bandı)
      xgPotential = Math.min(0.48, xgPotential);
      return finish('shot', step + 1, zone, { ballHolder: shooter, lastPasser });
    }
    xgPotential += Math.max(0, duel) * 0.004;
  }
  xgPotential = xgPotential * 0.4;
  return finish(rng() < 0.5 ? 'recycle' : 'turnover', MAX, zone, { lastPasser });
}

/** Zincirde eylem gerçekleştiren oyuncu: bölge hedefli en uygun slot (şut yedeği için korunuyor) */
export function pickSlot(slots: LineupSlot[], zone: ZoneId, shooterBias = false): LineupSlot | null {
  const inAttack = bandOf(zone) === 'A';
  const pool = inAttack
    ? slots.filter((s) => isActiveOnPitch(s) && ['ST', 'AM', 'WG'].includes(s.slotGroup))
    : bandOf(zone) === 'M'
      ? slots.filter((s) => isActiveOnPitch(s) && ['DM', 'CM', 'AM', 'WB', 'FB'].includes(s.slotGroup))
      : slots.filter((s) => isActiveOnPitch(s) && ['CB', 'FB', 'WB', 'DM'].includes(s.slotGroup));
  if (!pool.length) return null;
  const sorted = [...pool].sort((a, b) =>
    (shooterBias ? b.player.ratings.att - a.player.ratings.att : effective(b) * laneFit(b, zone) - effective(a) * laneFit(a, zone)));
  return sorted[0];
}

/** §8.2 — kalite → xG bandı */
function qualityToXG(finalThird: number, block: number, keeper: number, shooterEff: number, rng: () => number): number {
  const q = (finalThird + shooterEff) / 2 - (block * 0.5 + keeper * 0.4);
  if (q > 24 || (rng() < 0.04)) return 0.30 + rng() * 0.18; // §9.4: nadir bire-bir sürprizi  // büyük bir bir
  if (q > 16) return 0.16 + rng() * 0.14;  // ceza sahası neti
  if (q > 9)  return 0.07 + rng() * 0.09;  // orta sonrası
  if (q > 3)  return 0.03 + rng() * 0.05;  // ceza yayı
  return 0.01 + rng() * 0.03;              // uzaktan baskılı
}
