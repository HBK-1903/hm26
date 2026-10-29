// Presentation-only highlights, derived from match facts; nothing is added to the save.
import type { DemoMatchEvent } from '../store/game';
import type { CompactMatchEvent } from '../types';
import { ZONE_XY, type ZoneId } from './zones';
import { EV_GOAL, EV_YELLOW, EV_RED, EV_SUB, EV_SAVE, EV_VAR, EV_INJURY, SIDE_HOME, SIDE_AWAY } from './matchEvents';
import { eventTeamSide, isConfirmedGoal, type MatchSide } from './matchPresentation';

export type HighlightKind = 'goal' | 'chance' | 'save' | 'card' | 'sub' | 'injury' | 'var';
export interface HighlightMoment {
  minute: number;
  kind: HighlightKind;
  text: string;
  /** The acting team, e.g. the goalkeeper's team for a save. */
  side?: MatchSide;
  /** Recorded route belongs to the attacking side, which may differ from the actor. */
  pathSide?: MatchSide;
  path: { x: number; y: number }[] | null;
  score: { home: number; away: number } | null;
}
export interface HighlightReel { moments: HighlightMoment[]; scoreIsComplete: boolean }
const important = new Set<string>(['goal', 'chance', 'save', 'card', 'sub', 'injury', 'var']);

/** A route is drawable only if its side and every recorded zone are known. */
export function recordedPath(event: DemoMatchEvent): { x: number; y: number }[] | null {
  if (event.side !== 'home' && event.side !== 'away') return null;
  for (const candidate of [event.path, event.anim?.path]) {
    if (!Array.isArray(candidate) || candidate.length === 0) continue;
    if (!candidate.every((zone) => typeof zone === 'string' && Object.prototype.hasOwnProperty.call(ZONE_XY, zone))) continue;
    return candidate.map((zone) => {
      const point = ZONE_XY[zone as ZoneId];
      return event.side === 'away' ? { x: 100 - point.x, y: 100 - point.y } : { ...point };
    });
  }
  return null;
}

/** Score progression is shown only when ALL confirmed goals agree with the final score. */
export function makeHighlightReel(events: readonly DemoMatchEvent[], finalHome: number, finalAway: number, clubs?: { homeId: string; awayId: string }): HighlightReel {
  const ordered = events
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => important.has(event.kind) && Number.isFinite(event.minute) && event.minute >= 0)
    .sort((a, b) => a.event.minute - b.event.minute || a.index - b.index);
  let home = 0; let away = 0; let unknownGoal = false;
  for (const { event } of ordered) {
    if (!isConfirmedGoal(event)) continue;
    if (event.side === 'home') home++;
    else if (event.side === 'away') away++;
    else unknownGoal = true;
  }
  // An unrenderable goal also makes a partial event stream unsuitable for progression.
  if (events.some((event) => isConfirmedGoal(event) && (!Number.isFinite(event.minute) || event.minute < 0))) unknownGoal = true;
  const scoreIsComplete = !unknownGoal && Number.isInteger(finalHome) && finalHome >= 0
    && Number.isInteger(finalAway) && finalAway >= 0 && home === finalHome && away === finalAway;
  home = 0; away = 0;
  const moments = ordered.map(({ event }): HighlightMoment => {
    if (isConfirmedGoal(event)) {
      if (event.side === 'home') home++;
      if (event.side === 'away') away++;
    }
    return {
      minute: event.minute, kind: (event.kind === 'goal' && !isConfirmedGoal(event) ? 'var' : event.kind) as HighlightKind,
      text: event.text || 'Maç olayı',
      side: eventTeamSide(event, clubs?.homeId, clubs?.awayId) ?? undefined,
      pathSide: event.side === 'home' || event.side === 'away' ? event.side : undefined,
      path: recordedPath(event), score: scoreIsComplete ? { home, away } : null,
    };
  });
  return { moments, scoreIsComplete };
}

/** Old saves contain only tuples, not commentary or routes. Do not recreate either. */
export function archivedHighlightEvents(events: readonly CompactMatchEvent[] | undefined, nameOf: (id: string) => string | undefined): DemoMatchEvent[] {
  if (!Array.isArray(events)) return [];
  const kinds: Record<number, { kind: DemoMatchEvent['kind']; label: string }> = {
    [EV_GOAL]: { kind: 'goal', label: 'Gol' },
    [EV_YELLOW]: { kind: 'card', label: 'Sarı kart' },
    [EV_RED]: { kind: 'card', label: 'Kırmızı kart' },
    [EV_SUB]: { kind: 'sub', label: 'Oyuncu değişikliği' },
    [EV_SAVE]: { kind: 'save', label: 'Kurtarış' },
    [EV_VAR]: { kind: 'var', label: 'VAR incelemesi / kararı' },
    [EV_INJURY]: { kind: 'injury', label: 'Sakatlık' },
  };
  const out: DemoMatchEvent[] = [];
  for (const row of events) {
    if (!Array.isArray(row)) continue;
    const [minute, code, sideCode, playerId] = row;
    if (!Number.isInteger(code) || !Object.prototype.hasOwnProperty.call(kinds, code) || !Number.isFinite(minute) || minute < 0) continue;
    const type = kinds[code];
    const side = sideCode === SIDE_HOME ? 'home' : sideCode === SIDE_AWAY ? 'away' : undefined;
    const name = typeof playerId === 'string' ? nameOf(playerId) : undefined;
    out.push({ minute, kind: type.kind, side, text: name ? `${type.label} · ${name}` : type.label, ...(typeof playerId === 'string' && playerId ? { playerId } : {}) });
  }
  return out;
}
