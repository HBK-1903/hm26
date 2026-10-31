// Compatibility for existing replay callers that still provide engine.MatchInput.
import type { MatchInput } from '../engine';
import type { MatchCommand } from '../core/input';
import { replaySimulation } from '../core/replayCore';
import { toSimulationInput } from './simulationInput';

export function replayMatch(input: MatchInput, commands: readonly MatchCommand[]) {
  return replaySimulation(toSimulationInput(input), commands);
}
