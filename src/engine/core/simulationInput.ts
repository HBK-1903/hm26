// Production match snapshot. Unlike the older Wave-2 clock contract in input.ts,
// this contains the full existing HM26 squads/tactics needed by the simulation.
// It is plain data: no React, DOM, timer, storage, or callback is allowed inside.
import type { Club, Player, TacticPlan } from '../../types';
import type { Weather } from './contracts';

export interface SimulationInput {
  readonly schema: 'hm26-simulation-v1';
  readonly matchId: string;
  readonly seed: number;
  readonly homeClub: Club;
  readonly awayClub: Club;
  readonly homeSquad: Player[];
  readonly awaySquad: Player[];
  readonly homeTactic: TacticPlan;
  readonly awayTactic?: TacticPlan;
  readonly goalPace: 'dusuk' | 'dengeli' | 'yuksek';
  readonly randomness: 'low' | 'normal' | 'high';
  readonly weather?: Weather;
  readonly derby?: boolean;
  readonly cup?: boolean;
  readonly userSide?: 'home' | 'away';
  readonly challengeClubId?: string;
  readonly challengePoints?: number;
  readonly riskIds?: string[];
}

function copyFreeze(value: unknown): unknown {
  if (value === null || value === undefined || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return Object.freeze(value.map(copyFreeze));
  if (typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new Error('Simulation input must contain plain data only.');
    return Object.freeze(Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, copyFreeze(item)])));
  }
  throw new Error('Simulation input must contain finite, plain data only.');
}

/** Validate the production boundary and detach it from caller-owned save/UI state. */
export function normalizeSimulationInput(input: SimulationInput): SimulationInput {
  if (input.schema !== 'hm26-simulation-v1' || !input.matchId?.trim()) throw new Error('Invalid simulation schema or match ID.');
  if (!Number.isSafeInteger(input.seed)) throw new Error('Simulation seed must be a safe integer.');
  if (!input.homeClub?.id || !input.awayClub?.id || input.homeClub.id === input.awayClub.id) throw new Error('A match requires two distinct clubs.');
  if (!Array.isArray(input.homeSquad) || !Array.isArray(input.awaySquad) || !input.homeTactic?.formation) throw new Error('Simulation requires squad and tactic data.');
  if (!['dusuk', 'dengeli', 'yuksek'].includes(input.goalPace) || !['low', 'normal', 'high'].includes(input.randomness)) throw new Error('Invalid match settings.');
  return copyFreeze(input) as SimulationInput;
}
