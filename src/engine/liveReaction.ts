import type { DemoMatchEvent } from '../store/game';

type Side = 'home' | 'away';
export interface LiveReaction {
  event: DemoMatchEvent;
  /** Team that scored, saved, or was carded; null when the saved data does not establish it. */
  eventSide: Side | null;
  mood: 'celebrate' | 'concern' | 'tense' | 'neutral';
  title: string;
}
/**
 * Open-play saves describe the attacking side in `side`; set-piece saves use the
 * goalkeeper's side. The animation's attackingTeamId disambiguates open play.
 * If neither source identifies the saving side, stay neutral rather than guessing.
 */
export function liveReactionForEvent(event: DemoMatchEvent, mySide: Side, homeId: string, awayId: string): LiveReaction | null {
  if (event.kind !== 'goal' && event.kind !== 'save' && event.kind !== 'card') return null;
  // A contradictory/legacy 'goal cancelled' line must never start a celebration.
  if (event.kind === 'goal' && /iptal/i.test(event.text)) return null;
  let eventSide: Side | null = event.side ?? null;
  if (event.kind === 'save') {
    const attacking = event.anim?.attackingTeamId;
    if (attacking === homeId) eventSide = 'away';
    else if (attacking === awayId) eventSide = 'home';
    else if (event.playerId && event.side) eventSide = event.side; // set-piece goalkeeper event
    else eventSide = null;
  }
  const who = eventSide === null ? 'TAKIM BİLİNMİYOR' : eventSide === mySide ? 'TAKIMIMIZ' : 'RAKİP';
  const name = event.kind === 'goal' ? 'GOL' : event.kind === 'save' ? 'KURTARIŞ' : /kırmızı/i.test(event.text) ? 'KIRMIZI KART' : 'KART';
  const mood = eventSide === null ? 'neutral' : event.kind === 'card' ? 'tense' : eventSide === mySide ? 'celebrate' : 'concern';
  return { event, eventSide, mood, title: `${name} · ${who}` };
}

/** A simulation step can contain multiple events; never rely on its last line. */
export function reactionFromBatch(events: readonly DemoMatchEvent[], mySide: Side, homeId: string, awayId: string): LiveReaction | null {
  for (let index = events.length - 1; index >= 0; index--) {
    const reaction = liveReactionForEvent(events[index], mySide, homeId, awayId);
    if (reaction) return reaction;
  }
  return null;
}
