// Deterministic fictional referee assignment and decision modifiers.
export type RefereeStrictness = 'lenient' | 'balanced' | 'strict';

export interface RefereeProfile {
  readonly id: string;
  readonly label: string;
  readonly strictness: RefereeStrictness;
  readonly cardMultiplier: number;
  readonly penaltyMultiplier: number;
  /** Conditional probability of a direct red after a card-worthy foul. */
  readonly directRedChance: number;
}

const REFEREES: readonly RefereeProfile[] = [
  { id: 'referee-lenient', label: 'Hakem A', strictness: 'lenient', cardMultiplier: 0.82, penaltyMultiplier: 0.9, directRedChance: 0.004 },
  { id: 'referee-balanced', label: 'Hakem B', strictness: 'balanced', cardMultiplier: 1, penaltyMultiplier: 1, directRedChance: 0.006 },
  { id: 'referee-strict', label: 'Hakem C', strictness: 'strict', cardMultiplier: 1.18, penaltyMultiplier: 1.1, directRedChance: 0.009 },
];

export function assignReferee(seed: number): RefereeProfile {
  const index = (seed >>> 0) % REFEREES.length;
  return REFEREES[index];
}

export function refereeCardProbability(baseProbability: number, referee: RefereeProfile): number {
  if (!Number.isFinite(baseProbability) || baseProbability < 0) throw new Error('Base card probability must be finite and non-negative.');
  return Math.max(0, Math.min(0.6, baseProbability * referee.cardMultiplier));
}

export function refereePenaltyProbability(baseProbability: number, referee: RefereeProfile): number {
  if (!Number.isFinite(baseProbability) || baseProbability < 0) throw new Error('Base penalty probability must be finite and non-negative.');
  return Math.max(0, Math.min(0.5, baseProbability * referee.penaltyMultiplier));
}
