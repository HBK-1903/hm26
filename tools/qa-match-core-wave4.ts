// Wave 4 focused shot probability, event-ledger, VAR and score/stat identity checks.
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { aiDefaultTactic, simulateMatch, type MatchInput } from '../src/engine/engine';
import { MatchSession } from '../src/engine/session';
import { reduceMatchEvents } from '../src/engine/core/statReducer';
import { makeShotProbabilities, sampleShotOutcome } from '../src/engine/core/shotModel';

const home = CLUBS[0], away = CLUBS[12];
const baseInput: MatchInput = {
  homeClub: home, awayClub: away,
  homeSquad: genSquad(home, 76001), awaySquad: genSquad(away, 76002),
  homeTactic: aiDefaultTactic(home, away, away.strength),
  awayTactic: aiDefaultTactic(away, home, home.strength),
  seed: 76003, goalPace: 'dengeli', randomness: 'normal', userSide: 'home',
};
const checks: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
const throws = (fn: () => unknown, text: string) => {
  try { fn(); return false; }
  catch (error) { return String(error).includes(text); }
};

{
  const p = makeShotProbabilities(0.37, { goalLineClearanceChance: 0.08, saveShare: 0.52, woodworkShare: 0.03 });
  const sum = p.pGoal + p.pSave + p.pBlocked + p.pOffTarget + p.pWoodwork;
  const order = sampleShotOutcome(0, p) === 'goal'
    && sampleShotOutcome(p.pGoal, p) === 'save'
    && sampleShotOutcome(p.pGoal + p.pSave, p) === 'blocked'
    && sampleShotOutcome(p.pGoal + p.pSave + p.pBlocked, p) === 'off_target'
    && sampleShotOutcome(1 - 1e-12, p) === 'woodwork';
  const valid = Math.abs(sum - 1) < 1e-12 && Math.abs(p.pGoal - 0.37 * (1 - 0.08)) < 1e-12 && p.pBlocked > 0 && order;
  check('Shot model has a normalized categorical distribution and sampled pGoal is xG', valid, `sum=${sum.toFixed(12)} xG=pGoal=${p.pGoal.toFixed(6)} blocked=${p.pBlocked.toFixed(6)}`);
  check('Shot probability model rejects malformed probabilities', throws(() => makeShotProbabilities(1.2), 'in [0, 1]') && throws(() => makeShotProbabilities(0.5, { saveShare: 0.9, woodworkShare: 0.2 }), 'cannot exceed'), 'invalid pGoal and overfull residual shares rejected');
}

{
  const session = new MatchSession(baseInput);
  const result = session.finishNow();
  const events = session.getCoreEvents();
  const summary = reduceMatchEvents(events, true);
  const attempts = events.filter((event) => event.type === 'SHOT');
  const exact = attempts.length === result.stats.shotsH + result.stats.shotsA
    && summary.home.goals === result.stats.hg && summary.away.goals === result.stats.ag
    && summary.home.shotsOnTarget === result.stats.onH && summary.away.shotsOnTarget === result.stats.onA
    && summary.home.saves === result.stats.savesH && summary.away.saves === result.stats.savesA
    && Math.abs(summary.home.xg - result.stats.xgH) < 1e-8 && Math.abs(summary.away.xg - result.stats.xgA) < 1e-8
    && attempts.every((event) => event.type !== 'SHOT' || event.xg === event.pGoal);
  const noArtificialFloor = result.stats.xgH === summary.home.xg && result.stats.xgA === summary.away.xg;
  check('Production session shot ledger derives exact goals, SOT, saves and xG', exact && noArtificialFloor, `attempts=${attempts.length} score=${result.stats.hg}-${result.stats.ag} xG=${result.stats.xgH.toFixed(3)}-${result.stats.xgA.toFixed(3)} SOT=${result.stats.onH}-${result.stats.onA}`);
  const instant = simulateMatch(baseInput);
  check('Live and instant shot traces remain identical after resolution migration', JSON.stringify(result) === JSON.stringify(instant), `shots=${result.shotsLog.length} parity=${JSON.stringify(result) === JSON.stringify(instant)}`);
}

{
  const seen = new Set<string>();
  let overturnedGoals = 0;
  let confirmedGoals = 0;
  for (let seed = 76010; seed < 76210 && !(seen.has('confirmed') && seen.has('overturned')); seed++) {
    const session = new MatchSession({ ...baseInput, seed });
    session.finishNow();
    const events = session.getCoreEvents();
    for (const event of events) {
      if (event.type === 'VAR_DECISION') seen.add(event.decision);
      if (event.type === 'GOAL_DISALLOWED') overturnedGoals++;
      if (event.type === 'GOAL_CONFIRMED') confirmedGoals++;
    }
  }
  check('Goal review events confirm or overturn a provisional goal without breaking final reducer invariants', seen.has('confirmed') && seen.has('overturned') && confirmedGoals > 0 && overturnedGoals > 0, `decisions=${[...seen].join(',')} confirmed=${confirmedGoals} overturned=${overturnedGoals}`);
}

for (const item of checks) console.log(`${item.pass ? '✅' : '❌'} ${item.name} | ${item.detail}`);
console.log(`\nMATCH-CORE-WAVE4: ${checks.filter((item) => item.pass).length}/${checks.length}`);
if (checks.some((item) => !item.pass)) process.exit(1);
