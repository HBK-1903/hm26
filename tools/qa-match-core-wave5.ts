// Wave 5 focused elapsed-clock, possession-time, fatigue and player-minutes invariants.
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { aiDefaultTactic, type MatchInput } from '../src/engine/engine';
import { autoLineup, tickFatigue } from '../src/engine/profiles';
import { MatchSession } from '../src/engine/session';
import { reduceMatchEvents } from '../src/engine/core/statReducer';

const home = CLUBS[0], away = CLUBS[12];
const baseInput: MatchInput = {
  homeClub: home, awayClub: away,
  homeSquad: genSquad(home, 81001), awaySquad: genSquad(away, 81002),
  homeTactic: aiDefaultTactic(home, away, away.strength),
  awayTactic: aiDefaultTactic(away, home, home.strength),
  seed: 81003, goalPace: 'dengeli', randomness: 'normal', userSide: 'home',
};
const checks: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

{
  const lineup = autoLineup(baseInput.homeSquad, baseInput.homeTactic.formation);
  const fixture = lineup.slots[0];
  const oneMinute = { ...fixture, liveFitness: 100 };
  const fiveMinutes = { ...fixture, liveFitness: 100 };
  tickFatigue([oneMinute], baseInput.homeTactic, 5, false, 0, false, false, 1, 1);
  tickFatigue([fiveMinutes], baseInput.homeTactic, 5, false, 0, false, false, 1, 5);
  const oneLoss = 100 - oneMinute.liveFitness;
  const fiveLoss = 100 - fiveMinutes.liveFitness;
  check('Fatigue burn scales with elapsed delta while retaining the five-minute calibration', Math.abs(fiveLoss - oneLoss * 5) < 1e-8, `1m=${oneLoss.toFixed(5)} 5m=${fiveLoss.toFixed(5)} ratio=${(fiveLoss / oneLoss).toFixed(2)}`);
}

{
  const session = new MatchSession(baseInput);
  const initialSlots = [...session.getSlots('home'), ...session.getSlots('away')];
  const initialFitnessMatchesPlayers = initialSlots.every((slot) => slot.liveFitness === slot.player.fitness);
  const result = session.finishNow();
  const endSecond = session.getElapsedSeconds();
  const coreEvents = session.getCoreEvents();
  const summary = reduceMatchEvents(coreEvents, true);
  const possession = summary.home.possessionSeconds + summary.away.possessionSeconds;
  const halftime = coreEvents.filter((event) => event.type === 'HALF_TIME').length;
  const fulltime = coreEvents.filter((event) => event.type === 'FULL_TIME');
  const fulltimeBounded = endSecond >= 90 * 60 && endSecond <= 95 * 60 && endSecond === fulltime[0]?.second;
  const playerRows = Object.values(result.stats.playerRows);
  const validMinutesAndFitness = playerRows.length >= 22 && playerRows.every((row) => Number.isInteger(row.min) && row.min >= 0 && row.min <= 95 && Number.isFinite(row.endFit) && row.endFit >= 30 && row.endFit <= 100);
  const minutes = playerRows.map((row) => row.min), fitness = playerRows.map((row) => row.endFit);
  check('Lineup begins at player fitness and elapsed clock stops at bounded full time', initialFitnessMatchesPlayers && fulltimeBounded && halftime === 1 && fulltime.length === 1, `initialFitness=${initialFitnessMatchesPlayers} clock=${endSecond}s (${session.getMinute()}′) halftime=${halftime} fulltime=${fulltime.length}`);
  check('Possession event durations reconcile exactly to the match clock and percentages', possession === endSecond && summary.totalPossessionSeconds === endSecond && result.stats.posH === Math.round(summary.home.possessionPct), `home=${summary.home.possessionSeconds}s away=${summary.away.possessionSeconds}s total=${possession}/${endSecond}s homePct=${summary.home.possessionPct.toFixed(2)} displayed=${result.stats.posH}`);
  check('Full-time player rows contain bounded played minutes and ending fitness', validMinutesAndFitness, `rows=${playerRows.length} minuteRange=${Math.min(...minutes)}-${Math.max(...minutes)} fitnessRange=${Math.min(...fitness).toFixed(1)}-${Math.max(...fitness).toFixed(1)}`);
}

{
  const session = new MatchSession({ ...baseInput, seed: 81004 });
  const outgoing = session.getSlots('home')[5];
  const incoming = session.getBench('home')[0];
  const accepted = outgoing !== undefined && incoming !== undefined && session.queueSub('home', outgoing.player.id, incoming.id);
  session.step();
  const changed = incoming ? session.getSlots('home').some((slot) => slot.player.id === incoming.id) : false;
  const result = session.finishNow();
  const outgoingMinutes = outgoing ? result.stats.playerRows[outgoing.player.id]?.min ?? -1 : -1;
  const incomingMinutes = incoming ? result.stats.playerRows[incoming.id]?.min ?? -1 : -1;
  check('Substitution stops the outgoing player clock and starts the substitute clock', accepted && changed && outgoingMinutes >= 0 && outgoingMinutes < incomingMinutes && incomingMinutes <= session.getMinute(), `accepted=${accepted} changed=${changed} outgoing=${outgoingMinutes}′ incoming=${incomingMinutes}′`);
}

for (const item of checks) console.log(`${item.pass ? '✅' : '❌'} ${item.name} | ${item.detail}`);
console.log(`\nMATCH-CORE-WAVE5: ${checks.filter((item) => item.pass).length}/${checks.length}`);
if (checks.some((item) => !item.pass)) process.exit(1);
