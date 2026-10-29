// HM26 — C2: dakikalı maç olaylarının kalıcı sıkıştırılmış formata çevrilmesi ve
// gol dakika profili türetimi. Yeni hesaplama yok; yalnız arşivde saklanan gerçek olaylar.
import type { CompactMatchEvent, MatchArchiveEntry } from '../types';
import type { DemoMatchEvent } from '../store/game';
import { isConfirmedGoal, isRedCard } from './matchPresentation';

// Tür kodları (CompactMatchEvent şemasıyla senkron)
export const EV_GOAL = 0;
export const EV_YELLOW = 1;
export const EV_RED = 2;
export const EV_SUB = 3;
// v4 genişletmesi
export const EV_SAVE = 4;
export const EV_VAR = 5;
export const EV_INJURY = 6;
// Taraf kodları
export const SIDE_HOME = 0;
export const SIDE_AWAY = 1;
const SIDE_NEUTRAL = 2;

const sideCode = (side?: 'home' | 'away'): number => (side === 'home' ? SIDE_HOME : side === 'away' ? SIDE_AWAY : SIDE_NEUTRAL);

/**
 * Maç sonucu olay akışını yalnız gol/kart/değişiklik olaylarıyla sıkıştırır.
 * Bilinmeyen/tanımsız olaylar elenir; kart rengi anim.outcome'dan, yoksa metinden çözülür.
 */
export function compactMatchEvents(events: readonly DemoMatchEvent[]): CompactMatchEvent[] {
  const out: CompactMatchEvent[] = [];
  for (const e of events) {
    const minute = Math.max(0, Math.min(120, Math.round(e.minute)));
    const side = sideCode(e.side);
    if (e.kind === 'goal') {
      // Reuse an existing VAR code for an overturned goal; no archive schema changes.
      if (isConfirmedGoal(e)) out.push([minute, EV_GOAL, side, e.scorerId ?? e.playerId]);
      else out.push([minute, EV_VAR, side]);
    } else if (e.kind === 'card') {
      out.push([minute, isRedCard(e) ? EV_RED : EV_YELLOW, side, e.playerId]);
    } else if (e.kind === 'sub') {
      out.push([minute, EV_SUB, side]);
    } else if (e.kind === 'save') {
      out.push([minute, EV_SAVE, side, e.playerId]);
    } else if (e.kind === 'var') {
      out.push([minute, EV_VAR, side]);
    } else if (e.kind === 'injury') {
      // Yalnız maçtan çıkan gerçek sakatlıklar (anim.eventType === 'injury');
      // geçici tedavi/geri dönüş olayları (anim yok) sayılmaz
      if (e.anim?.eventType === 'injury') out.push([minute, EV_INJURY, side, e.playerId]);
    }
  }
  return out.sort((a, b) => a[0] - b[0]);
}

export interface MinuteBucket { label: string; scored: number; conceded: number }

export interface GoalMinuteProfile {
  /** 6 çeyrek dilim: 1-15, 16-30, 31-45, 46-60, 61-75, 76+ */
  buckets: MinuteBucket[];
  scoredTotal: number;
  concededTotal: number;
  /** İlk yarıda atılan gol oranı (0..1); hiç gol yoksa null */
  firstHalfScoredShare: number | null;
  /** 76+ dakikada atılan gol oranı (0..1); hiç gol yoksa null */
  lateScoredShare: number | null;
  /** Geriye düşüp kazandığı maç sayısı / önce yenen gol içeren maç sayısı; veri yoksa null */
  comeFromBehindRate: number | null;
  comeFromBehindWins: number;
  comeFromBehindMatches: number;
  /** Profili besleyen olay içeren maç sayısı (eski kayıtlarda 0 olabilir) */
  matchesWithEvents: number;
}

const BUCKET_BOUNDS: Array<[string, number, number]> = [
  ['1-15', 1, 15], ['16-30', 16, 30], ['31-45', 31, 45],
  ['46-60', 46, 60], ['61-75', 61, 75], ['76+', 76, 999],
];

/**
 * Kulübün arşivindeki sıkıştırılmış olaylardan gol dakika profili.
 * Yalnız events alanı taşıyan kayıtlar sayılır; eski kayıtlar sessizce dışlanır.
 * opponentId verilirse yalnız o rakiple yapılan maçlar kapsanır (H2H dakika profili).
 */
export function goalMinuteProfile(reports: readonly MatchArchiveEntry[], clubId: string, opponentId?: string): GoalMinuteProfile {
  const buckets: MinuteBucket[] = BUCKET_BOUNDS.map(([label]) => ({ label, scored: 0, conceded: 0 }));
  let scoredTotal = 0;
  let concededTotal = 0;
  let firstHalfScored = 0;
  let lateScored = 0;
  let comeFromBehindWins = 0;
  let comeFromBehindMatches = 0;
  let matchesWithEvents = 0;

  for (const r of reports) {
    if (!r.events || r.events.length === 0) continue;
    if (opponentId && r.homeId !== opponentId && r.awayId !== opponentId) continue;
    matchesWithEvents += 1;
    const isHome = r.homeId === clubId;
    const mySide = isHome ? SIDE_HOME : SIDE_AWAY;
    const myFinal = isHome ? r.hg : r.ag;
    const oppFinal = isHome ? r.ag : r.hg;
    let firstGoalSide: number | null = null;

    for (const [minute, kind, side] of r.events) {
      if (kind !== EV_GOAL || side === SIDE_NEUTRAL) continue;
      if (firstGoalSide === null) firstGoalSide = side;
      const bucket = buckets.find((b) => {
        const bound = BUCKET_BOUNDS.find(([label]) => label === b.label)!;
        return minute >= bound[1] && minute <= bound[2];
      });
      if (!bucket) continue;
      if (side === mySide) {
        bucket.scored += 1;
        scoredTotal += 1;
        if (minute <= 45) firstHalfScored += 1;
        if (minute >= 76) lateScored += 1;
      } else {
        bucket.conceded += 1;
        concededTotal += 1;
      }
    }

    if (firstGoalSide !== null && firstGoalSide !== mySide) {
      comeFromBehindMatches += 1;
      if (myFinal > oppFinal) comeFromBehindWins += 1;
    }
  }

  return {
    buckets,
    scoredTotal,
    concededTotal,
    firstHalfScoredShare: scoredTotal ? firstHalfScored / scoredTotal : null,
    lateScoredShare: scoredTotal ? lateScored / scoredTotal : null,
    comeFromBehindRate: comeFromBehindMatches ? comeFromBehindWins / comeFromBehindMatches : null,
    comeFromBehindWins,
    comeFromBehindMatches,
    matchesWithEvents,
  };
}

// ——— v4: ilk gol/öne geçme psikolojisi profili ———
export interface FirstGoalProfile {
  /** Olay verisi taşıyan maç sayısı */
  matchesWithEvents: number;
  /** İlk golü attığım maçlar ve oralardaki sonuç dağılımı */
  scoredFirst: { matches: number; wins: number; draws: number; losses: number; pointRate: number | null };
  /** İlk golü yediğim maçlar ve dönüş dağılımı */
  concededFirst: { matches: number; wins: number; draws: number; losses: number; comebackRate: number | null };
  /** Öne geçip de galip bitiremediğim maç sayısı (çöküş) */
  leadCollapses: number;
}

/**
 * Gol olaylarının sırasından ilk golü atan tarafı bulur; 0-0 maçlar dışlanır.
 * Sonuçlar arşivdeki nihai skordan okunur (canlı skor yeniden hesaplanmaz).
 */
export function firstGoalProfile(reports: readonly MatchArchiveEntry[], clubId: string): FirstGoalProfile {
  const empty = () => ({ matches: 0, wins: 0, draws: 0, losses: 0 });
  const scoredFirst = empty();
  const concededFirst = empty();
  let leadCollapses = 0;
  let matchesWithEvents = 0;

  for (const r of reports) {
    if (!r.events || r.events.length === 0) continue;
    const firstGoal = r.events.find((e) => e[1] === EV_GOAL);
    if (!firstGoal) continue;
    matchesWithEvents += 1;
    const isHome = r.homeId === clubId;
    const mySide = isHome ? SIDE_HOME : SIDE_AWAY;
    const myFinal = isHome ? r.hg : r.ag;
    const oppFinal = isHome ? r.ag : r.hg;
    const outcome: MatchResultLike = myFinal > oppFinal ? 'W' : myFinal === oppFinal ? 'D' : 'L';
    const bucket = firstGoal[2] === mySide ? scoredFirst : concededFirst;
    bucket.matches += 1;
    if (outcome === 'W') bucket.wins += 1;
    else if (outcome === 'D') bucket.draws += 1;
    else bucket.losses += 1;
    if (firstGoal[2] === mySide && outcome !== 'W') leadCollapses += 1;
  }

  const rate = (n: number, d: number) => (d === 0 ? null : Math.round((n / d) * 100) / 100);
  return {
    matchesWithEvents,
    scoredFirst: { ...scoredFirst, pointRate: rate(scoredFirst.wins * 3 + scoredFirst.draws, scoredFirst.matches * 3) },
    concededFirst: { ...concededFirst, comebackRate: rate(concededFirst.wins, concededFirst.matches) },
    leadCollapses,
  };
}

type MatchResultLike = 'W' | 'D' | 'L';

// ——— v4: sakatlık geçmişi (kırılgan oyuncu tespiti) ———
export interface InjuryTally { playerId: string; count: number }

/** Yalnız gerçek sakatlanma olaylarını (EV_INJURY) oyuncu bazında sayar; tedavi molaları hariç tutulur. */
export function injuryTally(reports: readonly MatchArchiveEntry[], clubId: string): InjuryTally[] {
  const counts = new Map<string, number>();
  for (const r of reports) {
    if (!r.events) continue;
    const mySide = r.homeId === clubId ? SIDE_HOME : SIDE_AWAY;
    for (const e of r.events) {
      if (e[1] !== EV_INJURY || e[2] !== mySide || !e[3]) continue;
      counts.set(e[3], (counts.get(e[3]) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([playerId, count]) => ({ playerId, count })).sort((a, b) => b.count - a.count || a.playerId.localeCompare(b.playerId));
}

// ——— v4: VAR iptal karnesi ———
export interface VarStats { myCancelled: number; oppCancelled: number; total: number }

/** EV_VAR olayları gol iptali anlamına gelir; taraf iptal edilen golün sahibidir. */
export function varStats(reports: readonly MatchArchiveEntry[], clubId: string): VarStats {
  let myCancelled = 0;
  let oppCancelled = 0;
  for (const r of reports) {
    if (!r.events) continue;
    const mySide = r.homeId === clubId ? SIDE_HOME : SIDE_AWAY;
    for (const e of r.events) {
      if (e[1] !== EV_VAR) continue;
      if (e[2] === mySide) myCancelled += 1;
      else if (e[2] !== SIDE_NEUTRAL) oppCancelled += 1;
    }
  }
  return { myCancelled, oppCancelled, total: myCancelled + oppCancelled };
}
