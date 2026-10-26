// Wave 3 focused parity, command-ledger and deterministic replay checks.
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { aiDefaultTactic, simulateMatch, type MatchInput } from '../src/engine/engine';
import { MatchSession } from '../src/engine/session';
import { matchReplayHash, replayMatch } from '../src/engine/core/replay';
import { deterministicReplayHash } from '../src/engine/core/commandLog';

const home = CLUBS[0], away = CLUBS[12];
const input: MatchInput = {
  homeClub: home, awayClub: away,
  homeSquad: genSquad(home, 45001), awaySquad: genSquad(away, 45002),
  homeTactic: aiDefaultTactic(home, away, away.strength),
  awayTactic: aiDefaultTactic(away, home, home.strength),
  seed: 45003, goalPace: 'dengeli', randomness: 'normal', userSide: 'home',
};
const checks: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
const throws = (fn: () => unknown, fragment: string) => {
  try { fn(); return false; }
  catch (error) { return String(error).includes(fragment); }
};

{
  const live = new MatchSession(input).finishNow();
  const instant = simulateMatch(input);
  const exact = JSON.stringify(live) === JSON.stringify(instant);
  check('Instant and live entry points execute the same deterministic match session', exact, `resultHash=${deterministicReplayHash(live)} parity=${exact}`);
}

{
  const session = new MatchSession(input);
  const tactic = { ...input.homeTactic, tempo: 'high' as const };
  const acceptedTactic = session.queueTactic('home', tactic);
  const acceptedShout = session.useShout('home', 'pump').ok;
  const commands = session.getCommandLog();
  const stableIds = commands.map((command, index) => command.id === `legacy-${home.id}-${away.id}-${input.seed}:cmd:${String(index + 1).padStart(6, '0')}`).every(Boolean);
  const frozenSnapshot = Object.isFrozen(commands[0]?.payload) && Object.isFrozen((commands[0]?.payload.plan as object));
  const allAtBoundary = commands.every((command) => command.issuedAtStep === 0 && command.issuedAtSecond === 0);
  check('Accepted manager commands are immutable, timestamped and deterministically identified', acceptedTactic && acceptedShout && stableIds && frozenSnapshot && allAtBoundary, `count=${commands.length} ids=${commands.map((command) => command.id).join(',')} frozen=${frozenSnapshot}`);
}

{
  const session = new MatchSession(input);
  const internals = session as unknown as { protestWindowUntil: { home: number } };
  internals.protestWindowUntil.home = session.getMinute() + 2;
  const protest = session.protest('home').ok;
  let guard = 0;
  while (session.getMinute() < 45 && !session.done && guard++ < 100) session.step();
  const talk = session.applyTeamTalk('home', 'quiet');
  const injured = session.getSlots('home').find((slot) => slot.slotGroup !== 'GK')!;
  injured.injured = true;
  const wait = session.waitForInjuredPlayer(injured.player.id);
  const kinds = session.getCommandLog().map((command) => command.type);
  check('Protest, halftime talk and injury-wait actions enter the command ledger', protest && talk && wait
    && kinds.includes('PROTEST') && kinds.includes('TEAM_TALK') && kinds.includes('WAIT_INJURED'), `types=${kinds.join(',')} halftime=${session.getMinute()}`);
}

{
  const original = new MatchSession(input);
  const tactic = { ...input.homeTactic, tempo: 'high' as const };
  const outgoing = original.getSlots('home').find((slot) => slot.slotGroup !== 'GK')!;
  const substitute = original.getBench('home')[0];
  const queued = !!substitute
    && original.queueTactic('home', tactic)
    && original.useShout('home', 'pump').ok
    && original.queueSub('home', outgoing.player.id, substitute.id);
  const originalResult = original.finishNow();
  const commands = original.getCommandLog();
  const replay = replayMatch(input, commands);
  const exactResult = JSON.stringify(originalResult) === JSON.stringify(replay.result);
  const sameHashes = replay.commandHash === original.getCommandLogHash()
    && replay.resultHash === matchReplayHash(originalResult, commands);
  check('Recorded commands reproduce the same result and stable replay hash', queued && exactResult && sameHashes, `commands=${commands.length} replayHash=${replay.resultHash} exact=${exactResult}`);
}

{
  const original = new MatchSession(input);
  original.queueTactic('home', { ...input.homeTactic, tempo: 'high' });
  original.finishNow();
  const malformed = original.getCommandLog().map((command) => ({ ...command, issuedAtStep: 999 }));
  check('Replay rejects commands beyond the completed trace', throws(() => replayMatch(input, malformed), 'ended before command'), `rejected=${throws(() => replayMatch(input, malformed), 'ended before command')}`);
}

for (const item of checks) console.log(`${item.pass ? '✅' : '❌'} ${item.name} | ${item.detail}`);
console.log(`\nMATCH-CORE-WAVE3: ${checks.filter((item) => item.pass).length}/${checks.length}`);
if (checks.some((item) => !item.pass)) process.exit(1);
