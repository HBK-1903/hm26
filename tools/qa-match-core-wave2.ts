// Wave 2: normalized MatchInput, deterministic RNG bundle and MatchCore state-machine shell.
import { DEFAULT_ENGINE_CONFIG, type EngineConfig } from '../src/engine/core/config';
import { MatchCore } from '../src/engine/core/matchCore';
import { normalizeMatchInput, type CorePosition, type MatchInput, type PlayerSnapshot, type TeamSnapshot } from '../src/engine/core/input';
import { DeterministicRng, RngBundle } from '../src/engine/core/rng';
import { reduceMatchEvents } from '../src/engine/core/statReducer';

const checks: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
const throws = (fn: () => unknown, fragment: string) => {
  try { fn(); return false; }
  catch (error) { return String(error).includes(fragment); }
};

const positions: CorePosition[] = ['GK', 'CB', 'CB', 'FB', 'FB', 'DM', 'CM', 'CM', 'WG', 'WG', 'ST'];
const makePlayer = (id: string, position: CorePosition): PlayerSnapshot => ({
  id, name: `Fictional ${id}`, preferredPositions: [position],
  attributes: { technique: 60, attack: 60, defense: 60, physical: 60, intelligence: 60, goalkeeping: position === 'GK' ? 70 : 20 },
  form: 50, fitness: 90, sharpness: 60, injuredDays: 0, suspendedMatches: 0, foot: 'right',
});
const makeTeam = (clubId: string): TeamSnapshot => ({
  clubId, name: `Fictional ${clubId}`, strength: 60,
  lineup: positions.map((position, i) => ({ slotId: `${clubId}-slot-${i + 1}`, position, player: makePlayer(`${clubId}-p-${i + 1}`, position) })),
  bench: [],
  tactic: { id: `${clubId}-tactic`, name: 'Balanced', formation: '4-4-2', plan: 'balanced', press: 'medium', tempo: 'medium', direction: 'balanced', defensiveLine: 'normal', passRisk: 'medium', width: 50 },
});
const makeInput = (configVersion = DEFAULT_ENGINE_CONFIG.version): MatchInput => ({
  engineVersion: 'match-core-wave2', engineConfigVersion: configVersion, matchId: 'wave2-fixture', seed: 12345,
  competition: { id: 'fictional-league', kind: 'league' },
  environment: { homeAdvantage: 5, weather: 'clear', pitchCondition: 90, derby: false, difficultyProfileId: 'balanced', worldVarianceProfileId: 'normal' },
  home: makeTeam('fictional-home'), away: makeTeam('fictional-away'), commandLog: [],
});

{
  const left = new RngBundle(8877), right = new RngBundle(8877);
  const leftFlow = left.next('flow');
  for (let i = 0; i < 50; i++) right.next('presentation');
  const rightFlow = right.next('flow');
  const stream = new DeterministicRng(991);
  stream.next(); const snapshot = stream.snapshot(); const expected = stream.next();
  const restored = new DeterministicRng(0); restored.restore(snapshot);
  const restoredValue = restored.next();
  const sameSeed = new RngBundle(8877).next('flow') === leftFlow;
  check('RNG streams are reproducible, isolated and restorable', leftFlow === rightFlow && sameSeed && restoredValue === expected, `flow=${leftFlow.toFixed(8)} presentation draws do not shift flow; restore=${restoredValue === expected}`);
}

{
  const payload = { nested: { value: 1 } };
  const raw = { ...makeInput(), commandLog: [{ id: 'cmd-1', issuedAtSecond: 0, side: 'home' as const, type: 'PROTEST' as const, payload }] };
  const normalized = normalizeMatchInput(raw);
  payload.nested.value = 2;
  const normalizedPayload = normalized.commandLog[0].payload.nested as { value: number };
  const pristine = normalized.home.name === 'Fictional fictional-home' && Object.isFrozen(normalized.home.lineup[0].player) && !Object.isFrozen(raw.home)
    && normalizedPayload.value === 1 && !Object.isFrozen(payload.nested);
  const copied = new MatchCore(raw).input;
  const runtimeView = new MatchCore(raw).getState();
  runtimeView.score.home = 7;
  check('Input normalization validates XI and isolates frozen snapshot from caller state', pristine && copied.home.lineup.length === 11 && new MatchCore(raw).getState().score.home === 0, `xi=${copied.home.lineup.length} normalizedFrozen=${Object.isFrozen(normalized.home)} callerFrozen=${Object.isFrozen(raw.home)}`);
}

{
  const config: EngineConfig = { ...DEFAULT_ENGINE_CONFIG, version: 'test-clock-v1', clock: { halfLengthSeconds: 10 } };
  const core = new MatchCore(makeInput(config.version), config);
  const before = core.getState();
  const kickOff = core.start();
  const htEvents = core.advanceTo(10);
  const blockedSkip = throws(() => core.advanceTo(12), 'Clock cannot advance during HALF_TIME');
  const secondKickOff = core.resumeSecondHalf();
  const ftEvents = core.advanceTo(20);
  const state = core.getState();
  const phases = before.phase === 'PRE_MATCH' && kickOff.type === 'KICK_OFF' && htEvents[0]?.type === 'HALF_TIME'
    && secondKickOff.type === 'KICK_OFF' && ftEvents[0]?.type === 'FULL_TIME' && state.phase === 'FINISHED' && state.clockSeconds === 20;
  const deterministicIds = core.getEvents().every((event, index) => event.id === `wave2-fixture:${String(index + 1).padStart(6, '0')}`);
  const emptyStats = reduceMatchEvents(core.getEvents(), true).home.goals === 0;
  check('MatchCore phase machine has explicit half-time/resume/full-time boundaries', phases && blockedSkip && deterministicIds && emptyStats, `events=${core.getEvents().map((e) => e.type).join('→')} phase=${state.phase} skipBlocked=${blockedSkip}`);
}

{
  const malformed = makeInput();
  const shortXI = { ...malformed, home: { ...malformed.home, lineup: malformed.home.lineup.slice(0, 10) } } as unknown as MatchInput;
  const mismatch = makeInput('wrong-version');
  const config: EngineConfig = { ...DEFAULT_ENGINE_CONFIG, version: 'expected-version' };
  check('Invalid lineups and mismatched EngineConfig versions fail fast', throws(() => normalizeMatchInput(shortXI), 'exactly 11') && throws(() => new MatchCore(mismatch, config), 'does not match EngineConfig'), 'bad XI and config version rejected before play');
}

for (const item of checks) console.log(`${item.pass ? '✅' : '❌'} ${item.name} | ${item.detail}`);
console.log(`\nMATCH-CORE-WAVE2: ${checks.filter((item) => item.pass).length}/${checks.length}`);
if (checks.some((item) => !item.pass)) process.exit(1);
