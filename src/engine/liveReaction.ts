import type { DemoMatchEvent } from '../store/game';
import { eventTeamSide, isConfirmedGoal, isRedCard, type MatchSide } from './matchPresentation';

export interface LiveReaction {
  event: DemoMatchEvent;
  /** Team that scored, saved, or was carded; null when the saved data does not establish it. */
  eventSide: MatchSide | null;
  mood: 'celebrate' | 'concern' | 'tense' | 'neutral';
  title: string;
}

export function liveReactionForEvent(event: DemoMatchEvent, mySide: MatchSide, homeId: string, awayId: string): LiveReaction | null {
  if (event.kind !== 'goal' && event.kind !== 'save' && event.kind !== 'card') return null;
  if (event.kind === 'goal' && !isConfirmedGoal(event)) return null;
  const eventSide = eventTeamSide(event, homeId, awayId);
  const who = eventSide === null ? 'TAKIM BİLİNMİYOR' : eventSide === mySide ? 'TAKIMIMIZ' : 'RAKİP';
  const name = event.kind === 'goal' ? 'GOL' : event.kind === 'save' ? 'KURTARIŞ' : isRedCard(event) ? 'KIRMIZI KART' : 'KART';
  const mood = eventSide === null ? 'neutral' : event.kind === 'card' ? 'tense' : eventSide === mySide ? 'celebrate' : 'concern';
  return { event, eventSide, mood, title: `${name} · ${who}` };
}

/** Recent real reactions, newest first. Several events in one step are retained. */
export function recentLiveReactions(events: readonly DemoMatchEvent[], mySide: MatchSide, homeId: string, awayId: string, limit = 4): LiveReaction[] {
  const reactions: LiveReaction[] = [];
  const max = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  for (let index = events.length - 1; index >= 0 && reactions.length < max; index--) {
    const reaction = liveReactionForEvent(events[index], mySide, homeId, awayId);
    if (reaction) reactions.push(reaction);
  }
  return reactions;
}

/** A simulation step can contain multiple events; never rely on its last line. */
export function reactionFromBatch(events: readonly DemoMatchEvent[], mySide: MatchSide, homeId: string, awayId: string): LiveReaction | null {
  return recentLiveReactions(events, mySide, homeId, awayId, 1)[0] ?? null;
}
