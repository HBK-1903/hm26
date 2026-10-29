// Shared, read-only interpretation of recorded match events.
import type { DemoMatchEvent } from '../store/game';

export type MatchSide = 'home' | 'away';

/** A cancelled/overturned goal must never be shown as a confirmed score or celebration. */
export function isConfirmedGoal(event: DemoMatchEvent): boolean {
  if (event.kind !== 'goal') return false;
  const outcome = event.anim?.outcome?.toLowerCase();
  if (outcome && ['offside', 'overturned', 'cancelled', 'canceled'].includes(outcome)) return false;
  return !(event.text ?? '').toLocaleLowerCase('tr-TR').includes('iptal');
}

/**
 * Most events name the acting side. For open-play saves, the engine's `side`
 * and recorded route belong to the attacker, while the keeper is the opponent.
 * A set-piece save instead stores the keeper's side and player ID. Old compact
 * archives may lack both the animation and player ID: their saving side is then
 * unknown, not something we can reconstruct from the stored side alone.
 */
export function eventTeamSide(event: DemoMatchEvent, homeId?: string, awayId?: string): MatchSide | null {
  const side = event.side === 'home' || event.side === 'away' ? event.side : null;
  if (event.kind !== 'save') return side;
  const attacking = event.anim?.attackingTeamId;
  if (attacking) {
    if (homeId && attacking === homeId) return 'away';
    if (awayId && attacking === awayId) return 'home';
    return null;
  }
  return event.playerId ? side : null;
}

/** Prefer the engine's structured card outcome; fall back to Turkish text in old events. */
export function isRedCard(event: DemoMatchEvent): boolean {
  if (event.kind !== 'card') return false;
  const outcome = event.anim?.outcome?.toLowerCase();
  if (outcome) return outcome === 'red' || outcome === 'red-direct';
  return (event.text ?? '').toLocaleLowerCase('tr-TR').includes('kırmızı');
}
