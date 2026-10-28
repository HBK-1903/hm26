// HM26 — C2: dakikalı maç olaylarının kalıcı sıkıştırılmış formata çevrilmesi ve
// gol dakika profili türetimi. Yeni hesaplama yok; yalnız arşivde saklanan gerçek olaylar.
import type { CompactMatchEvent, MatchArchiveEntry } from '../types';
import type { DemoMatchEvent } from '../store/game';

// Tür kodları (CompactMatchEvent şemasıyla senkron)
export const EV_GOAL = 0;
export const EV_YELLOW = 1;
export const EV_RED = 2;
export const EV_SUB = 3;
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
      out.push([minute, EV_GOAL, side, e.scorerId ?? e.playerId]);
    } else if (e.kind === 'card') {
      const outcome = e.anim?.outcome;
      const isRed = outcome === 'red' || outcome === 'red-direct'
        || (outcome === undefined && /kırmızı/i.test(e.text));
      out.push([minute, isRed ? EV_RED : EV_YELLOW, side, e.playerId]);
    } else if (e.kind === 'sub') {
      out.push([minute, EV_SUB, side]);
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
 */
export function goalMinuteProfile(reports: readonly MatchArchiveEntry[], clubId: string): GoalMinuteProfile {
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
