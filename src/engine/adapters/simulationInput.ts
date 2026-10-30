// Translate the legacy public API to the core's versioned, callback-free input.
import type { MatchInput } from '../engine';
import type { SimulationInput } from '../core/simulationInput';

export function toSimulationInput(input: MatchInput): SimulationInput {
  return {
    schema: 'hm26-simulation-v1',
    matchId: `legacy-${input.homeClub.id}-${input.awayClub.id}-${input.seed >>> 0}`,
    seed: input.seed,
    homeClub: input.homeClub, awayClub: input.awayClub,
    homeSquad: input.homeSquad, awaySquad: input.awaySquad,
    homeTactic: input.homeTactic, awayTactic: input.awayTactic,
    goalPace: input.goalPace, randomness: input.randomness, weather: input.weather,
    derby: input.derby, cup: input.cup, userSide: input.userSide,
    challengeClubId: input.challengeClubId, challengePoints: input.challengePoints, riskIds: input.riskIds,
  };
}
