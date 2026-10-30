import type { CoreMatchEvent, MatchEventDraft } from './types';

const EVENT_ID_WIDTH = 6;

/**
 * Deterministic append-only event ledger. It deliberately has no timestamps,
 * RNG, UI, persistence, or rendering dependencies.
 */
export class EventLog {
  private readonly events: CoreMatchEvent[] = [];
  private lastSecond = -1;

  constructor(readonly matchId: string) {
    if (!matchId.trim()) throw new Error('EventLog requires a non-empty matchId.');
  }

  append(draft: MatchEventDraft): CoreMatchEvent {
    if (!Number.isInteger(draft.second) || draft.second < 0) throw new Error('Event second must be a non-negative integer.');
    if (!Number.isInteger(draft.minute) || draft.minute < 0) throw new Error('Event minute must be a non-negative integer.');
    if (draft.second < this.lastSecond) throw new Error('EventLog time cannot move backwards.');

    const sequence = this.events.length + 1;
    const id = `${this.matchId}:${String(sequence).padStart(EVENT_ID_WIDTH, '0')}`;
    // Decision traces contain a nested utility map; detach/freeze it as well as
    // the event so presentation code cannot rewrite historical replay facts.
    const event = Object.freeze(draft.type === 'TACTIC_CHANGE' && draft.decisionTrace
      ? { ...draft, decisionTrace: Object.freeze({ ...draft.decisionTrace, utilities: Object.freeze({ ...draft.decisionTrace.utilities }) }), id }
      : { ...draft, id }) as CoreMatchEvent;
    this.events.push(event);
    this.lastSecond = draft.second;
    return event;
  }

  /** A copy prevents consumers from mutating the ledger's ordering or membership. */
  readAll(): readonly CoreMatchEvent[] {
    return this.events.slice();
  }

  get length(): number {
    return this.events.length;
  }
}
