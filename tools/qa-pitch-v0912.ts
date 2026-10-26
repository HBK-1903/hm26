// HM26 v0.9.12 Wave 1 — deterministic pitch geometry and goal-line clearance checks.
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { aiDefaultTactic, simulateMatch } from '../src/engine/engine';
import { MatchSession } from '../src/engine/session';
import { calculateGoalkeeperPosition, calculateRolePosition, rollGoalLineClearance, toStadiumPoint } from '../src/engine/pitch-ai';
import type { MatchInput, MatchResult } from '../src/engine/engine';
import type { LineupSlot } from '../src/engine/profiles';

const results: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => results.push({ name, pass, detail });
// Coordinate convention: home attacks toward y=0; away possessions are mirrored into the same stadium view.
{
  const awayBall = toStadiumPoint('away', { x: 20, y: 18 });
  const homeBall = toStadiumPoint('home', { x: 20, y: 18 });
  check('Away possession is mirrored exactly once into stadium coordinates', awayBall.x === 80 && awayBall.y === 82 && homeBall.x === 20 && homeBall.y === 18, `away=${awayBall.x},${awayBall.y} home=${homeBall.x},${homeBall.y}`);
}

// Goalkeeper tracks the threatened lane and advances only when the ball enters its own half.
{
  const homeFar = calculateGoalkeeperPosition('home', { x: 50, y: 18 });
  const homeThreat = calculateGoalkeeperPosition('home', { x: 80, y: 82 });
  const awayFar = calculateGoalkeeperPosition('away', { x: 50, y: 82 });
  const awayThreat = calculateGoalkeeperPosition('away', { x: 20, y: 18 });
  const pass = homeThreat.x > homeFar.x && homeThreat.y < homeFar.y && awayThreat.x < awayFar.x && awayThreat.y > awayFar.y && [homeFar, homeThreat, awayFar, awayThreat].every((p) => p.x >= 43 && p.x <= 57 && p.y >= 5 && p.y <= 95);
  check('Goalkeeper shades angle and steps forward on both ends', pass, `H ${homeFar.x.toFixed(1)},${homeFar.y.toFixed(1)}→${homeThreat.x.toFixed(1)},${homeThreat.y.toFixed(1)} · A ${awayFar.x.toFixed(1)},${awayFar.y.toFixed(1)}→${awayThreat.x.toFixed(1)},${awayThreat.y.toFixed(1)}`);
}

// Role-aware movement must follow attack direction without leaving the pitch.
{
  const base = { x: 50, y: 60 }, ball = { x: 75, y: 60 };
  const homeStriker = calculateRolePosition('ST', 'home', true, base, ball);
  const awayStriker = calculateRolePosition('ST', 'away', true, base, toStadiumPoint('away', ball));
  const homeDefender = calculateRolePosition('CB', 'home', false, base, ball);
  const pass = homeStriker.y < base.y && awayStriker.y > base.y && homeDefender.x > base.x && [homeStriker, awayStriker, homeDefender].every((p) => p.x >= 8 && p.x <= 92 && p.y >= 6 && p.y <= 94);
  check('Role displacement preserves attack direction and tracks the ball', pass, `home-ST y=${homeStriker.y.toFixed(1)} away-ST y=${awayStriker.y.toFixed(1)} CB x=${homeDefender.x.toFixed(1)}`);
}

const home = CLUBS[0], away = CLUBS[12];
const homeSquad = genSquad(home, 7701), awaySquad = genSquad(away, 7702);
const tactic = aiDefaultTactic(home, away, away.strength);

// Fixed-value roll makes the rare goal-line intervention testable without probabilistic flakiness.
{
  const defender = homeSquad.find((p) => p.group === 'CB')!;
  const baseSlot: LineupSlot = { player: defender, slotGroup: 'CB', liveFitness: 100, sentOff: false, injured: false, yellows: 0 };
  const unused = { ...baseSlot, player: { ...defender, id: 'keeper', group: 'GK' as const }, slotGroup: 'GK' as const };
  let draws = 0;
  const highQuality = rollGoalLineClearance([unused, baseSlot], () => { draws++; return 0; });
  const noClearance = rollGoalLineClearance([baseSlot], () => 0.999999);
  const unavailable = rollGoalLineClearance([{ ...baseSlot, sentOff: true }], () => { draws++; return 0; });
  check('Clearance roll selects only an available back-line player', highQuality?.player.id === defender.id && noClearance === null && unavailable === null && draws === 1, `selected=${highQuality?.player.id ?? 'none'} noRollForUnavailable=${draws === 1}`);
}

const inputFor = (seed: number): MatchInput => ({
  homeClub: home, awayClub: away, homeSquad, awaySquad,
  homeTactic: tactic, awayTactic: aiDefaultTactic(away, home, home.strength),
  seed, goalPace: 'dengeli', randomness: 'normal', userSide: 'home',
});

function validateClearanceResult(result: MatchResult): { ok: boolean; count: number; details: string } {
  const logged = result.shotsLog.filter((s) => s.outcome === 'clearance');
  const events = result.events.filter((e) => e.anim?.eventType === 'line_clearance');
  const shots = result.stats.shotsH + result.stats.shotsA;
  const goals = result.stats.hg + result.stats.ag;
  const cornersFor = logged.filter((s) => s.side === 'home').length <= result.stats.cornersH && logged.filter((s) => s.side === 'away').length <= result.stats.cornersA;
  const validEvents = events.every((e) => e.anim?.actors?.length === 2 && e.anim.path?.length && e.side && e.anim.outcome === 'clearance');
  const ok = logged.length > 0 && events.length === logged.length && result.shotsLog.length === shots && result.shotsLog.filter((s) => s.outcome === 'goal').length === goals && logged.every((s) => s.zone.endsWith('-A')) && cornersFor && validEvents;
  return { ok, count: logged.length, details: `clearances=${logged.length} events=${events.length} shots=${shots}/${result.shotsLog.length} goals=${goals} actors/path=${validEvents} corners=${cornersFor}` };
}

// Verify both production simulation entry points emit the same structured outcome and consistent match data.
{
  const sources: { name: string; run: (seed: number) => MatchResult }[] = [
    { name: 'Batch engine', run: (seed) => simulateMatch(inputFor(seed)) },
    { name: 'Live MatchSession', run: (seed) => new MatchSession(inputFor(seed)).finishNow() },
  ];
  for (const source of sources) {
    let found: { seed: number; result: MatchResult } | null = null;
    for (let seed = 8800; seed < 9050 && !found; seed++) {
      const result = source.run(seed);
      if (result.events.some((e) => e.anim?.eventType === 'line_clearance')) found = { seed, result };
    }
    if (!found) {
      check(`${source.name} goal-line event + stat integrity`, false, '250 deterministic seeds: no clearance event');
      continue;
    }
    const validation = validateClearanceResult(found.result);
    const repeat = source.run(found.seed);
    const deterministic = JSON.stringify(found.result.shotsLog) === JSON.stringify(repeat.shotsLog) && found.result.stats.hg === repeat.stats.hg && found.result.stats.ag === repeat.stats.ag;
    check(`${source.name} goal-line event + stat integrity`, validation.ok && deterministic, `seed=${found.seed} ${validation.details} deterministic=${deterministic}`);
  }
}

for (const r of results) console.log(`${r.pass ? '✅' : '❌'} ${r.name} | ${r.detail}`);
const failed = results.filter((r) => !r.pass);
console.log(`\nPITCH-WAVE1: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
