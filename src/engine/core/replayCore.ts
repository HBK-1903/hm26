// Deterministic replay directly against the production simulation, without UI/session adapters.
import type { TacticPlan } from '../../types';
import type { MatchResult } from './contracts';
import type { MatchCommand } from './input';
import type { CoreMatchEvent } from './types';
import type { SimulationInput } from './simulationInput';
import { deterministicReplayHash } from './commandLog';
import { SimulationCore } from './simulation';

export interface ReplayVerification {
  readonly result: MatchResult;
  readonly commands: readonly MatchCommand[];
  readonly events: readonly CoreMatchEvent[];
  readonly commandHash: string;
  readonly resultHash: string;
}

function replayCommand(core: SimulationCore, command: MatchCommand, legacy: boolean): boolean {
  const payload = command.payload;
  if (command.issuedAtSecond !== core.getElapsedSeconds()) return false;
  switch (command.type) {
    case 'SUB_REQUEST':
      return typeof payload.outId === 'string' && typeof payload.inId === 'string'
        && (legacy ? core.queueLegacySub(command.side, payload.outId, payload.inId) : core.queueSub(command.side, payload.outId, payload.inId));
    case 'TACTIC_CHANGE':
      return !!payload.plan && typeof payload.plan === 'object'
        && (legacy ? core.queueLegacyTactic(command.side, payload.plan as TacticPlan) : core.queueTactic(command.side, payload.plan as TacticPlan));
    case 'TOUCHLINE_SHOUT':
      return !legacy && (payload.command === 'pump' || payload.command === 'cool') && core.useShout(command.side, payload.command).ok;
    case 'PROTEST': return !legacy && core.protest(command.side).ok;
    case 'TEAM_TALK':
      return !legacy && (payload.choice === 'fight' || payload.choice === 'calm' || payload.choice === 'quiet') && core.applyTeamTalk(command.side, payload.choice);
    case 'WAIT_INJURED': return !legacy && typeof payload.playerId === 'string' && core.waitForInjuredPlayer(payload.playerId);
  }
}

/** Replay both normal manager commands and old SubManager commands at their exact boundaries. */
export function replaySimulation(input: SimulationInput, commands: readonly MatchCommand[]): ReplayVerification {
  const core = new SimulationCore(input);
  let cursor = 0;
  let guard = 0;
  const isLegacy = (command: MatchCommand) => command.payload.source === 'legacy-boundary';
  const apply = (command: MatchCommand, legacy: boolean) => {
    if (!replayCommand(core, command, legacy)) throw new Error(`Replay command ${command.id} was rejected at step ${core.getStepCount()}.`);
    cursor++;
  };
  while (!core.done) {
    const step = core.getStepCount();
    while (cursor < commands.length && commands[cursor].issuedAtStep === step && !isLegacy(commands[cursor])) apply(commands[cursor], false);
    if (cursor < commands.length && ((commands[cursor].issuedAtStep ?? -1) < step || (commands[cursor].issuedAtStep === step && isLegacy(commands[cursor])))) {
      throw new Error(`Replay command ${commands[cursor].id} is out of order or has no replay step.`);
    }
    const started = core.beginStep();
    if (!started.ready) break;
    while (cursor < commands.length && commands[cursor].issuedAtStep === core.getStepCount() && isLegacy(commands[cursor]) && commands[cursor].type === 'TACTIC_CHANGE') apply(commands[cursor], true);
    core.applyTacticsBoundary();
    for (const side of ['home', 'away'] as const) {
      while (cursor < commands.length && commands[cursor].issuedAtStep === core.getStepCount() && isLegacy(commands[cursor]) && commands[cursor].type === 'SUB_REQUEST' && commands[cursor].side === side) apply(commands[cursor], true);
      core.applySubstitutionBoundary(side);
    }
    core.completeStep();
    if (++guard > 500) throw new Error('Replay exceeded the maximum expected match step count.');
  }
  if (cursor !== commands.length) throw new Error(`Replay ended before command ${commands[cursor].id} could be applied.`);
  const actualCommands = core.getCommandLog();
  const actualCommandHash = deterministicReplayHash(actualCommands);
  if (actualCommandHash !== deterministicReplayHash(commands)) throw new Error('Replay command log diverged from the supplied log.');
  const result = core.toResult();
  return { result, commands: actualCommands, events: core.getCoreEvents(), commandHash: actualCommandHash, resultHash: matchReplayHash(result, actualCommands) };
}

export function matchReplayHash(result: MatchResult, commands: readonly MatchCommand[]): string {
  return deterministicReplayHash({ result, commands });
}
