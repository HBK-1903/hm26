import type { PositionGroup } from '../types';
import { isActiveOnPitch, type LineupSlot } from './profiles';

export interface PitchPoint { x: number; y: number }

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Convert an attack-relative zone point into the fixed stadium view used by Phaser. */
export function toStadiumPoint(side: 'home' | 'away', point: PitchPoint): PitchPoint {
  return side === 'home' ? { x: point.x, y: point.y } : { x: 100 - point.x, y: 100 - point.y };
}

/** A compact 2D goalkeeper response: shade the near post/angle and step off the line only in danger. */
export function calculateGoalkeeperPosition(side: 'home' | 'away', ball: PitchPoint): PitchPoint {
  const ownGoalY = side === 'home' ? 92 : 8;
  const attackingGoalDirection = side === 'home' ? -1 : 1;
  const distanceIntoOwnHalf = side === 'home' ? ball.y : 100 - ball.y;
  const threat = clamp((distanceIntoOwnHalf - 57) / 35, 0, 1);
  const targetX = clamp(50 + (ball.x - 50) * (0.12 + threat * 0.20), 43, 57);
  const targetY = clamp(ownGoalY + attackingGoalDirection * threat * 4.2, 5, 95);
  return { x: targetX, y: targetY };
}

/** Small role-aware shifts around the formation base; output remains in stadium coordinates. */
export function calculateRolePosition(
  group: PositionGroup,
  side: 'home' | 'away',
  attacking: boolean,
  base: PitchPoint,
  ball: PitchPoint,
): PitchPoint {
  if (group === 'GK') return calculateGoalkeeperPosition(side, ball);
  const direction = side === 'home' ? -1 : 1;
  const ballSideShift = clamp((ball.x - 50) * 0.065, -3.25, 3.25);
  const wideSide = base.x < 50 ? -1 : 1;
  let x = base.x + ballSideShift;
  let y = base.y;

  if (attacking) {
    if (group === 'ST') y += direction * 4.1;
    else if (group === 'AM') y += direction * 2.8;
    else if (group === 'WG') { y += direction * 2.2; x += wideSide * 1.8; }
    else if (group === 'WB') { y += direction * 3.1; x += wideSide * 1.0; }
    else if (group === 'FB') y += direction * 1.8;
    else if (group === 'CM') y += direction * 1.2;
    else if (group === 'DM') y += direction * 0.55;
  } else {
    if (group === 'CB') y -= direction * 1.2;
    else if (group === 'FB' || group === 'WB') y -= direction * 0.7;
    else if (group === 'DM') y -= direction * 1.0;
    else if (group === 'CM' || group === 'AM') y -= direction * 0.35;
  }
  return { x: clamp(x, 8, 92), y: clamp(y, 6, 94) };
}

function clearanceSkill(slot: LineupSlot): number {
  const ratings = slot.player.ratings;
  const skill = (ratings.def * 0.65 + ratings.fiz * 0.20 + ratings.men * 0.15) * (slot.liveFitness / 100);
  return skill;
}

/** Highest-probability eligible defender and the exact chance used by the shot model. */
export function goalLineClearanceCandidate(defenders: readonly LineupSlot[]): { slot: LineupSlot; chance: number } | null {
  const candidates = defenders
    .filter((slot) => isActiveOnPitch(slot) && ['CB', 'FB', 'WB'].includes(slot.slotGroup))
    .slice()
    .sort((a, b) => clearanceSkill(b) - clearanceSkill(a));
  const best = candidates[0];
  if (!best) return null;
  return { slot: best, chance: clamp(0.025 + (clearanceSkill(best) - 50) * 0.0018, 0.01, 0.095) };
}

/**
 * Rare goal-line intervention on a goal-bound shot in the attacking third.
 * The caller gates by the A-band; this helper chooses a fit, non-dismissed back-line player.
 */
export function rollGoalLineClearance(defenders: readonly LineupSlot[], rng: () => number): LineupSlot | null {
  const candidate = goalLineClearanceCandidate(defenders);
  return candidate && rng() < candidate.chance ? candidate.slot : null;
}
