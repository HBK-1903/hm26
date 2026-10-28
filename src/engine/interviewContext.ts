// HM26 — Maç sonu röportajı için bağlam sezimi. Yeni kalıcı alan yok; kanıt olarak
// yalnız sıkıştırılmış maç olayları, skor/xG ve önceki sonuçlar kullanılır.
// Hiçbir özel koşul tetiklenmezse tema 'classic' döner ve klasik 9'luk diyalog açılır.
import type { CompactMatchEvent, MatchArchiveEntry } from '../types';
import { EV_GOAL, EV_VAR, SIDE_HOME, SIDE_AWAY } from './matchEvents';
import type { InterviewOutcome } from '../data/interview';

/** Tarafsız olay kodu (matchEvents sözleşmesi: 0 ev, 1 deplasman, 2 nötr) */
const SIDE_NEUTRAL = 2;

export type InterviewTheme =
  | 'classic'
  | 'comeback'   // ilk golü yiyip maçı kazandın
  | 'collapse'   // ilk golü atıp galibiyeti koruyamadın
  | 'derby'
  | 'redcard'    // senin takımın kırmızı kart gördü
  | 'var'        // maçta VAR iptali oldu
  | 'xg-over'    // xG'den çok gol (verimli bitiricilik)
  | 'xg-under'   // bol xG, az gol (bitiricilik sorunu)
  | 'late'       // 76+ dakikada gelen galibiyet golü
  | 'streak';    // üst üste 3+ aynı sonuç

export interface InterviewContext {
  theme: InterviewTheme;
  outcome: InterviewOutcome;
  evidence: {
    firstGoalSide: 'mine' | 'opp' | null;
    lateMinute: number | null;
    myReds: number;
    varCount: number;
    finishingDelta: number;
    streak: number | null;
  };
}

export interface InterviewContextInput {
  myClubId: string;
  homeId: string;
  awayId: string;
  hg: number;
  ag: number;
  xgHome: number;
  xgAway: number;
  redsHome: number;
  redsAway: number;
  isDerby: boolean;
  events?: CompactMatchEvent[];
  /** Bu maçtan önceki sonuçlar (herhangi bir sıra; en yeni sonda olması beklenmez) */
  priorOutcomes?: InterviewOutcome[];
}

const outcomeOf = (myGoals: number, oppGoals: number): InterviewOutcome =>
  myGoals > oppGoals ? 'win' : myGoals === oppGoals ? 'draw' : 'loss';

/**
 * Kanıt önceliği: geri dönüş/çöküş (olay akışı) → derbi → kırmızı kart → VAR →
 * xG sapması → son dakika golü → seri → klasik. Öncelik sırası en ayırt edici
 * hikâyeyi seçer; jenerik temalar sonda kalır.
 */
export function detectInterviewContext(input: InterviewContextInput): InterviewContext {
  const { myClubId, homeId, awayId, hg, ag } = input;
  const isHome = homeId === myClubId;
  const mySide = isHome ? SIDE_HOME : SIDE_AWAY;
  const myGoals = isHome ? hg : ag;
  const oppGoals = isHome ? ag : hg;
  const myXg = isHome ? input.xgHome : input.xgAway;
  const outcome = outcomeOf(myGoals, oppGoals);
  const myReds = isHome ? input.redsHome : input.redsAway;
  const events = input.events ?? [];

  const firstGoal = events.find((e) => e[1] === EV_GOAL);
  const firstGoalSide: 'mine' | 'opp' | null = firstGoal
    ? (firstGoal[2] === mySide ? 'mine' : firstGoal[2] === SIDE_NEUTRAL ? null : 'opp')
    : null;
  const varCount = events.filter((e) => e[1] === EV_VAR).length;
  const lateGoal = events
    .filter((e) => e[1] === EV_GOAL && e[2] === mySide && e[0] >= 76)
    .sort((a, b) => b[0] - a[0])[0];
  const finishingDelta = Math.round((myGoals - myXg) * 10) / 10;

  // Seri: bu maçın sonucu da dahil art arda aynı sonuç sayısı
  let streak: number | null = null;
  if (input.priorOutcomes && input.priorOutcomes.length) {
    let run = 1;
    for (let i = input.priorOutcomes.length - 1; i >= 0; i--) {
      if (input.priorOutcomes[i] === outcome) run += 1;
      else break;
    }
    if (run >= 3) streak = run;
  }

  const evidence = { firstGoalSide, lateMinute: lateGoal ? lateGoal[0] : null, myReds, varCount, finishingDelta, streak };

  let theme: InterviewTheme = 'classic';
  if (firstGoalSide === 'opp' && outcome === 'win') theme = 'comeback';
  else if (firstGoalSide === 'mine' && outcome !== 'win') theme = 'collapse';
  else if (input.isDerby) theme = 'derby';
  else if (myReds > 0) theme = 'redcard';
  else if (varCount > 0) theme = 'var';
  else if (finishingDelta >= 2) theme = 'xg-over';
  else if (finishingDelta <= -2) theme = 'xg-under';
  else if (outcome === 'win' && lateGoal) theme = 'late';
  else if (streak !== null) theme = 'streak';

  return { theme, outcome, evidence };
}

/** Arşiv kaydından röportaj bağlamı üretir (ekranların çağıracağı pratik yardımcı). */
export function contextFromReport(
  report: Pick<MatchArchiveEntry, 'homeId' | 'awayId' | 'hg' | 'ag' | 'xgHome' | 'xgAway' | 'redsHome' | 'redsAway' | 'events'>,
  myClubId: string,
  isDerby: boolean,
  priorOutcomes: InterviewOutcome[],
): InterviewContext {
  return detectInterviewContext({
    myClubId,
    homeId: report.homeId,
    awayId: report.awayId,
    hg: report.hg,
    ag: report.ag,
    xgHome: report.xgHome,
    xgAway: report.xgAway,
    redsHome: report.redsHome,
    redsAway: report.redsAway,
    isDerby,
    events: report.events,
    priorOutcomes,
  });
}
