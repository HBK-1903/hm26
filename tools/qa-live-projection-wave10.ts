// Wave 10 focused adapter/projection checks. Playback speed is presentation-only.
import { readFileSync } from 'node:fs';
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { aiDefaultTactic, type MatchInput } from '../src/engine/engine';
import { MatchSession } from '../src/engine/session';
import { presentationDelayMs, projectLiveMatch } from '../src/engine/adapters/liveProjection';
import { LIVE_CONSOLE_TABS } from '../src/screens/liveMatchConsole';

const home = CLUBS[0], away = CLUBS[12];
const input: MatchInput = {
  homeClub: home, awayClub: away,
  homeSquad: genSquad(home, 77001), awaySquad: genSquad(away, 77002),
  homeTactic: aiDefaultTactic(home, away, away.strength),
  awayTactic: aiDefaultTactic(away, home, home.strength),
  seed: 77003, goalPace: 'dengeli', randomness: 'normal', userSide: 'home',
};
const results: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => results.push({ name, pass, detail });

{
  const session = new MatchSession(input);
  const initialMinute = session.getMinute(), initialSecond = session.getSecond();
  const initialStats = JSON.stringify(session.getStats());
  const projection = projectLiveMatch(session);
  const unchanged = session.getMinute() === initialMinute && session.getSecond() === initialSecond
    && JSON.stringify(session.getStats()) === initialStats && !session.done;
  check('Live adapter is a read-only projection of clock, score, stats, ball and momentum',
    projection.status === 'live' && projection.clock.minute === initialMinute && projection.clock.second === initialSecond
    && projection.score.home === projection.stats.hg && projection.score.away === projection.stats.ag
    && projection.eventCount === session.getEvents().length && unchanged,
    `score=${projection.score.home}-${projection.score.away}; clock=${projection.clock.minute}:${projection.clock.second}; unchanged=${unchanged}`);
}

{
  const session = new MatchSession(input);
  for (let i = 0; i < 12 && !session.done; i++) session.step();
  const projection = projectLiveMatch(session);
  check('The projection follows engine progression without a parallel UI clock/stat store',
    projection.clock.minute === session.getMinute() && projection.clock.second === session.getSecond()
    && projection.stats.hg === session.getStats().hg && projection.stats.ag === session.getStats().ag
    && projection.ball.owner === session.getBallState().owner,
    `engine=${session.getMinute()}:${session.getSecond()} projected=${projection.clock.minute}:${projection.clock.second}`);
}

{
  const ids = LIVE_CONSOLE_TABS.map((tab) => tab.id);
  const pass = ids.length === 6 && new Set(ids).size === 6
    && ['pitch', 'ratings', 'subs', 'analysis', 'table', 'feed'].every((id) => ids.includes(id as typeof ids[number]));
  check('Match console retains six distinct accessible presentation tabs', pass,
    LIVE_CONSOLE_TABS.map((tab) => `${tab.id}:${tab.label}`).join(' · '));
}

{
  const speeds = ['x1', 'x2', 'x4'] as const;
  const runs = speeds.map((speed) => {
    const session = new MatchSession(input);
    for (let step = 0; step < 36 && !session.done; step++) session.step();
    return { delay: presentationDelayMs(speed), result: session.finishNow() };
  });
  const sameResult = runs.every((run) => JSON.stringify(run.result) === JSON.stringify(runs[0].result));
  const delayOnly = runs.map((run) => run.delay).join(',') === '640,260,90';
  check('x1/x2/x4 change only presentation timing, never the seeded match result', sameResult && delayOnly,
    `delays=${runs.map((run) => run.delay).join('/')}ms resultParity=${sameResult}`);
}

{
  const source = readFileSync(new URL('../src/screens/LiveMatch.tsx', import.meta.url), 'utf8');
  const projectionIsWired = source.includes('projectLiveMatch(session)')
    && source.includes('liveStats: MatchStats = projection.stats')
    && source.includes('projection.clock.minute') && source.includes('presentationDelayMs(speed)')
    && !source.includes('setStatsNow') && !source.includes('setClockMinute');
  check('LiveMatch renders engine-derived projection and keeps speed outside the engine input', projectionIsWired,
    'scorebug clock/stat/score derive from projection; speed only configures presentation timeout');
}

for (const result of results) console.log(`${result.pass ? '✅' : '❌'} ${result.name} | ${result.detail}`);
console.log(`\nLIVE-PROJECTION-WAVE10: ${results.filter((result) => result.pass).length}/${results.length}`);
if (results.some((result) => !result.pass)) process.exit(1);
