import type { MatchResult } from '../engine';
import type { TacticPlan } from '../../types';
import type { MatchCommand } from './input';
import { deterministicReplayHash } from './commandLog';
import { MatchSession } from '../session';

export interface ReplayVerification {
  readonly result: MatchResult;
  readonly commands: readonly MatchCommand[];
  readonly commandHash: string;
  readonly resultHash: string;
}

function replayCommand(session: MatchSession, command: MatchCommand): boolean {
  const payload = command.payload;
  switch (command.type) {
    case 'SUB_REQUEST':
      return typeof payload.outId === 'string' && typeof payload.inId === 'string'
        && session.queueSub(command.side, payload.outId, payload.inId);
    case 'TACTIC_CHANGE':
      return !!payload.plan && typeof payload.plan === 'object'
        && session.queueTactic(command.side, payload.plan as TacticPlan);
    case 'TOUCHLINE_SHOUT':
      return (payload.command === 'pump' || payload.command === 'cool')
        && session.useShout(command.side, payload.command).ok;
    case 'PROTEST':
      return session.protest(command.side).ok;
    case 'TEAM_TALK':
      return (payload.choice === 'fight' || payload.choice === 'calm' || payload.choice === 'quiet')
        && session.applyTeamTalk(command.side, payload.choice);
    case 'WAIT_INJURED':
      return typeof payload.playerId === 'string' && session.waitForInjuredPlayer(payload.playerId);
  }
}

/** Re-run a shared live/instant match from its seed and accepted command log. */
export function replayMatch(input: ConstructorParameters<typeof MatchSession>[0], commands: readonly MatchCommand[]): ReplayVerification {
  const session = new MatchSession({ ...input, subMgr: undefined });
  let cursor = 0;
  let guard = 0;
  while (!session.done) {
    const step = session.getStepCount();
    while (cursor < commands.length && commands[cursor].issuedAtStep === step) {
      const command = commands[cursor];
      if (command.issuedAtSecond < 0 || !replayCommand(session, command)) {
        throw new Error(`Replay command ${command.id} was rejected at step ${step}.`);
      }
      cursor++;
    }
    if (cursor < commands.length && (commands[cursor].issuedAtStep ?? -1) < step) {
      throw new Error(`Replay command ${commands[cursor].id} is out of order or has no replay step.`);
    }
    session.step();
    if (++guard > 500) throw new Error('Replay exceeded the maximum expected match step count.');
  }
  if (cursor !== commands.length) throw new Error(`Replay ended before command ${commands[cursor].id} could be applied.`);

  const actualCommands = session.getCommandLog();
  const expectedCommandHash = deterministicReplayHash(commands);
  const actualCommandHash = deterministicReplayHash(actualCommands);
  if (actualCommandHash !== expectedCommandHash) throw new Error('Replay command log diverged from the supplied log.');
  const result = session.toResult();
  return {
    result,
    commands: actualCommands,
    commandHash: actualCommandHash,
    resultHash: deterministicReplayHash({ result, commands: actualCommands }),
  };
}

/** Produce a stable hash for a match result plus its accepted manager commands. */
export function matchReplayHash(result: MatchResult, commands: readonly MatchCommand[]): string {
  return deterministicReplayHash({ result, commands });
}
