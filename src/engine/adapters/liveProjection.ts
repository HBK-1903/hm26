// HM26 — Wave 10: read-only match-core → live-presentation adapter.
// All projected score/clock/stat/ball values are derived from MatchSession; presentation is not an engine command.
import type { MatchSession } from '../session';

export type PresentationSpeed = 'x1' | 'x2' | 'x4';
export const PRESENTATION_DELAY_MS: Readonly<Record<PresentationSpeed, number>> = Object.freeze({ x1: 640, x2: 260, x4: 90 });
export const presentationDelayMs = (speed: PresentationSpeed): number => PRESENTATION_DELAY_MS[speed];

export interface LiveMatchProjection {
  status: 'live' | 'complete';
  clock: { minute: number; second: number };
  score: { home: number; away: number };
  stats: ReturnType<MatchSession['getStats']>;
  ball: ReturnType<MatchSession['getBallState']>;
  momentum: ReturnType<MatchSession['getMomentum']>;
  eventCount: number;
}

export function projectLiveMatch(session: Pick<MatchSession, 'done' | 'getMinute' | 'getSecond' | 'getStats' | 'getBallState' | 'getMomentum' | 'getEvents'>): LiveMatchProjection {
  const stats = session.getStats();
  return {
    status: session.done ? 'complete' : 'live',
    clock: { minute: session.getMinute(), second: session.getSecond() },
    score: { home: stats.hg, away: stats.ag },
    stats,
    ball: session.getBallState(),
    momentum: session.getMomentum(),
    eventCount: session.getEvents().length,
  };
}
