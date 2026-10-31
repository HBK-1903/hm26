// Small focused checks for Wave 3 live-match decisions; not a full regression suite.
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { aiDefaultTactic, simulateMatch } from '../src/engine/engine';
import { MatchSession } from '../src/engine/session';
import { shotVisualCue } from '../src/engine/narrate';

const home = CLUBS[0], away = CLUBS[12];
const input = {
  homeClub: home, awayClub: away,
  homeSquad: genSquad(home, 7711), awaySquad: genSquad(away, 7712),
  homeTactic: aiDefaultTactic(home, away, away.strength),
  awayTactic: aiDefaultTactic(away, home, home.strength),
  seed: 7713, goalPace: 'dengeli' as const, randomness: 'normal' as const, userSide: 'home' as const,
};
const checks: { name: string; ok: boolean; detail: string }[] = [];
const check = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail });

{
  let woodworkSeed = 0, volleySeed = 0;
  for (let seed = 1; seed < 5000 && (!woodworkSeed || !volleySeed); seed++) {
    if (!woodworkSeed && shotVisualCue(seed, 17, 'player-a', 'L-A', 'miss', false) === 'woodwork') woodworkSeed = seed;
    if (!volleySeed && shotVisualCue(seed, 17, 'player-b', 'R-A', 'save', true) === 'volley') volleySeed = seed;
  }
  const stableWoodwork = woodworkSeed > 0 && shotVisualCue(woodworkSeed, 17, 'player-a', 'L-A', 'miss', false) === shotVisualCue(woodworkSeed, 17, 'player-a', 'L-A', 'miss', false);
  const stableVolley = volleySeed > 0 && shotVisualCue(volleySeed, 17, 'player-b', 'R-A', 'save', true) === shotVisualCue(volleySeed, 17, 'player-b', 'R-A', 'save', true);
  check('Woodwork and volley cues are deterministic, gated presentation metadata', stableWoodwork && stableVolley && shotVisualCue(1, 17, 'player-a', 'L-A', 'goal', false) !== 'woodwork', `woodworkSeed=${woodworkSeed} volleySeed=${volleySeed}`);
}

{
  const batchA = simulateMatch(input), batchB = simulateMatch(input);
  const liveA = new MatchSession(input).finishNow(), liveB = new MatchSession(input).finishNow();
  const batchStable = JSON.stringify(batchA.shotsLog) === JSON.stringify(batchB.shotsLog) && JSON.stringify(batchA.stats) === JSON.stringify(batchB.stats);
  const liveStable = JSON.stringify(liveA.shotsLog) === JSON.stringify(liveB.shotsLog) && JSON.stringify(liveA.stats) === JSON.stringify(liveB.stats);
  check('Presentation metadata leaves both simulation entry points repeatable', batchStable && liveStable, `batch=${batchStable} live=${liveStable}`);
}

{
  const session = new MatchSession(input);
  const rejectedEarly = !session.applyTeamTalk('home', 'fight');
  let guard = 0;
  while (session.getMinute() < 45 && !session.done && guard++ < 100) session.step();
  const atHalf = session.getMinute() >= 45 && !session.done;
  const first = atHalf && session.applyTeamTalk('home', 'calm');
  const second = session.applyTeamTalk('home', 'fight');
  check('Halftime talk is available only once at the break', rejectedEarly && first && !second, `early=${rejectedEarly} accepted=${first} duplicateRejected=${!second} minute=${session.getMinute()}`);
}

{
  const session = new MatchSession(input);
  // Deliberate injury fault injection; public slot views are detached snapshots.
  const core = (session as unknown as { core: { homeLine: { slots: import('../src/engine/profiles').LineupSlot[] } } }).core;
  const player = core.homeLine.slots.find((slot) => slot.slotGroup !== 'GK')!;
  player.injured = true; player.liveFitness = 30;
  const accepted = session.waitForInjuredPlayer(player.player.id);
  const excludedDuringTreatment = !session.getSlots('home').some((slot) => slot.player.id === player.player.id && !slot.injured);
  let guard = 0;
  while (session.getMinute() < 2 && !session.done && guard++ < 10) session.step();
  const returned = !player.injured && player.liveFitness === 45;
  check('Wait option keeps the side short-handed then restores the player', accepted && excludedDuringTreatment && returned, `accepted=${accepted} temporarilyOut=${excludedDuringTreatment} returned=${returned} minute=${session.getMinute()} fitness=${player.liveFitness}`);
}

for (const item of checks) console.log(`${item.ok ? '✅' : '❌'} ${item.name} | ${item.detail}`);
console.log(`\nWAVE3-FOCUSED: ${checks.filter((item) => item.ok).length}/${checks.length}`);
if (checks.some((item) => !item.ok)) process.exit(1);
