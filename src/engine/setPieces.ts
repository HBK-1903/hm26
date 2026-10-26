import type { TacticPlan } from '../types';
import { isActiveOnPitch, type LineupSlot } from './profiles';

export type SetPieceRole = 'penalty' | 'cornerL' | 'cornerR' | 'fkShort' | 'fkLong';
export interface SetPieceTaker { slot: LineupSlot; selection: 'assigned' | 'fallback' }

const scoreFor = (slot: LineupSlot, role: SetPieceRole): number => {
  const { att, tek, men, fiz } = slot.player.ratings;
  switch (role) {
    case 'penalty': return att * 0.55 + tek * 0.2 + men * 0.15 + fiz * 0.1;
    case 'cornerL': case 'cornerR': return tek * 0.45 + men * 0.3 + att * 0.25;
    case 'fkShort': return tek * 0.5 + att * 0.25 + men * 0.25;
    case 'fkLong': return tek * 0.3 + fiz * 0.25 + att * 0.3 + men * 0.15;
  }
};

/** Honors a configured set-piece role only while that player is match-eligible; otherwise picks the best active fallback. */
export function selectSetPieceTaker(
  slots: readonly LineupSlot[], setPieces: TacticPlan['setPieces'], role: SetPieceRole,
): SetPieceTaker | null {
  const active = slots.filter(isActiveOnPitch);
  const configuredId = setPieces[role];
  const assigned = configuredId ? active.find((slot) => slot.player.id === configuredId) : undefined;
  if (assigned) return { slot: assigned, selection: 'assigned' };
  const fallback = active.slice().sort((a, b) => scoreFor(b, role) - scoreFor(a, role) || a.player.id.localeCompare(b.player.id))[0];
  return fallback ? { slot: fallback, selection: 'fallback' } : null;
}
