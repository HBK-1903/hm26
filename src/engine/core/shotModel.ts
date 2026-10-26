import type { ShotOutcome } from './types';

export interface ShotProbabilitySet {
  readonly pGoal: number;
  readonly pSave: number;
  readonly pBlocked: number;
  readonly pOffTarget: number;
  readonly pWoodwork: number;
}

export interface ShotModelOptions {
  /** Chance that a goal-bound attempt is cleared off the line, in [0, 1]. */
  readonly goalLineClearanceChance?: number;
  /** Share of non-goal outcomes that are saved, in [0, 1]. */
  readonly saveShare?: number;
  /** Share of non-goal outcomes that strike the frame, in [0, 1]. */
  readonly woodworkShare?: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Build a normalized outcome distribution. xG is the final pGoal actually sampled. */
export function makeShotProbabilities(rawGoalProbability: number, options: ShotModelOptions = {}): ShotProbabilitySet {
  if (!Number.isFinite(rawGoalProbability) || rawGoalProbability < 0 || rawGoalProbability > 1) throw new Error('Raw shot goal probability must be in [0, 1].');
  const clearanceChance = options.goalLineClearanceChance ?? 0;
  const saveShare = options.saveShare ?? 0.52;
  const woodworkShare = options.woodworkShare ?? 0.02;
  for (const [value, name] of [[clearanceChance, 'goalLineClearanceChance'], [saveShare, 'saveShare'], [woodworkShare, 'woodworkShare']] as const) {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${name} must be in [0, 1].`);
  }
  if (saveShare + woodworkShare > 1) throw new Error('Save and woodwork shares cannot exceed the non-goal probability.');

  const pBlocked = rawGoalProbability * clearanceChance;
  const pGoal = rawGoalProbability - pBlocked;
  const nonGoalProbability = 1 - rawGoalProbability;
  const pSave = nonGoalProbability * saveShare;
  const pWoodwork = nonGoalProbability * woodworkShare;
  // Derive the final bucket as the residual to avoid floating-point sum drift.
  const pOffTarget = 1 - pGoal - pBlocked - pSave - pWoodwork;
  if (pOffTarget < -1e-12) throw new Error('Shot probability model produced a negative residual outcome.');
  return Object.freeze({ pGoal, pSave, pBlocked, pOffTarget: Math.max(0, pOffTarget), pWoodwork });
}

/** Sample the exact probability set that will be recorded in the SHOT event. */
export function sampleShotOutcome(roll: number, probabilities: ShotProbabilitySet): ShotOutcome {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error('Shot outcome roll must be in [0, 1).');
  const total = probabilities.pGoal + probabilities.pSave + probabilities.pBlocked + probabilities.pOffTarget + probabilities.pWoodwork;
  if (Math.abs(total - 1) > 1e-9) throw new Error(`Shot outcome probabilities must sum to 1 (got ${total}).`);
  if (roll < probabilities.pGoal) return 'goal';
  if (roll < probabilities.pGoal + probabilities.pSave) return 'save';
  if (roll < probabilities.pGoal + probabilities.pSave + probabilities.pBlocked) return 'blocked';
  if (roll < probabilities.pGoal + probabilities.pSave + probabilities.pBlocked + probabilities.pOffTarget) return 'off_target';
  return 'woodwork';
}
