// Wave 1: deterministic EventLog + single reducer foundation.
import { EventLog } from '../src/engine/core/eventLog';
import { assertMatchStatInvariants, reduceMatchEvents } from '../src/engine/core/statReducer';
import type { MatchEventDraft, MatchStatSummary, MatchSide } from '../src/engine/core/types';

const checks: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
const throws = (fn: () => unknown, fragment: string) => {
  try { fn(); return false; }
  catch (error) { return String(error).includes(fragment); }
};
const attempt = (side: MatchSide, shotId: string, shooterId: string, second = 0): MatchEventDraft => ({
  type: 'SHOT', side, shotId, shooterId, second, minute: Math.floor(second / 60), shotType: 'open_play', xg: 0.2, pGoal: 0.2,
  pSave: 0.4, pBlocked: 0.1, pOffTarget: 0.2, pWoodwork: 0.1,
});

{
  const a = new EventLog('foundation-fixture'), b = new EventLog('foundation-fixture');
  const drafts: MatchEventDraft[] = [
    { type: 'KICK_OFF', side: 'home', second: 0, minute: 0 },
    { type: 'POSSESSION_ENDED', side: 'home', durationSeconds: 3600, second: 2700, minute: 45 },
    { type: 'POSSESSION_ENDED', side: 'away', durationSeconds: 2400, second: 5400, minute: 90 },
  ];
  for (const draft of drafts) { a.append(draft); b.append(draft); }
  check('Event IDs are deterministic and time is append-only', JSON.stringify(a.readAll()) === JSON.stringify(b.readAll()) && a.readAll()[0].id === 'foundation-fixture:000001' && throws(() => a.append({ type: 'KICK_OFF', side: 'away', second: 10, minute: 0 }), 'move backwards'), `ids=${a.readAll().map((e) => e.id).join(',')} monotonic=${a.readAll()[2].second >= a.readAll()[1].second}`);
}

let fixtureSummary: MatchStatSummary | null = null;
{
  const log = new EventLog('stats-fixture');
  log.append({ type: 'KICK_OFF', side: 'home', second: 0, minute: 0 });
  log.append(attempt('home', 'H-1', 'home-striker', 830));
  log.append({ type: 'SHOT_RESOLVED', shotId: 'H-1', outcome: 'goal', second: 840, minute: 14 });
  log.append({ type: 'VAR_REVIEW_STARTED', side: 'home', shotId: 'H-1', reason: 'goal', second: 841, minute: 14 });
  log.append({ type: 'VAR_DECISION', side: 'home', shotId: 'H-1', decision: 'confirmed', second: 844, minute: 14 });
  log.append({ type: 'GOAL_CONFIRMED', side: 'home', shotId: 'H-1', scorerId: 'home-striker', assisterId: 'home-winger', second: 844, minute: 14 });
  log.append(attempt('home', 'H-2', 'home-midfielder', 1100));
  log.append({ type: 'SHOT_RESOLVED', shotId: 'H-2', outcome: 'woodwork', second: 1200, minute: 20 });
  log.append(attempt('away', 'A-1', 'away-striker', 1790));
  log.append({ type: 'SHOT_RESOLVED', shotId: 'A-1', outcome: 'save', goalkeeperId: 'home-keeper', second: 1800, minute: 30 });
  log.append(attempt('away', 'A-2', 'away-winger', 2390));
  log.append({ type: 'SHOT_RESOLVED', shotId: 'A-2', outcome: 'goal', second: 2400, minute: 40 });
  log.append({ type: 'VAR_REVIEW_STARTED', side: 'away', shotId: 'A-2', reason: 'offside', second: 2401, minute: 40 });
  log.append({ type: 'VAR_DECISION', side: 'away', shotId: 'A-2', decision: 'overturned', second: 2404, minute: 40 });
  log.append({ type: 'GOAL_DISALLOWED', side: 'away', shotId: 'A-2', reason: 'offside', second: 2404, minute: 40 });
  log.append({ type: 'YELLOW_CARD', side: 'away', playerId: 'away-defender', second: 3000, minute: 50 });
  log.append({ type: 'POSSESSION_ENDED', side: 'home', durationSeconds: 3600, second: 5300, minute: 88 });
  log.append({ type: 'POSSESSION_ENDED', side: 'away', durationSeconds: 2400, second: 5400, minute: 90 });

  const events = log.readAll();
  fixtureSummary = reduceMatchEvents(events, true);
  const s = fixtureSummary;
  const correct = s.home.goals === 1 && s.home.shots === 2 && s.home.shotsOnTarget === 1 && s.home.woodworkShots === 1 && s.home.xg === 0.4
    && s.away.goals === 0 && s.away.shots === 2 && s.away.shotsOnTarget === 1 && s.away.shotsSaved === 1 && s.away.disallowedShots === 1 && s.away.xg === 0.4
    && s.home.saves === 1 && s.home.possessionPct === 60 && s.away.possessionPct === 40
    && s.players['home-striker'].goals === 1 && s.players['home-winger'].assists === 1 && s.players['home-keeper'].saves === 1;
  const idempotent = JSON.stringify(reduceMatchEvents([...events, events[0]], true)) === JSON.stringify(s);
  check('One reducer derives score, shots, xG, saves, possession and player rows', correct && idempotent, `H ${s.home.goals}-${s.away.goals} · shots=${s.home.shots}/${s.away.shots} · SOT=${s.home.shotsOnTarget}/${s.away.shotsOnTarget} · xG=${s.home.xg.toFixed(2)}/${s.away.xg.toFixed(2)} · possession=${s.home.possessionPct}/${s.away.possessionPct} · duplicateIdempotent=${idempotent}`);
  const orderedShots = throws(() => assertMatchStatInvariants({ ...s, home: { ...s.home, shotsOnTarget: s.home.shots + 1 } }), 'invariant failed');
  const exactOnTarget = throws(() => assertMatchStatInvariants({ ...s, home: { ...s.home, shotsOnTarget: 2 } }), 'shotsOnTarget must equal');
  check('Final stat identities hold, including VAR-overturned goal policy', orderedShots && exactOnTarget && s.away.goals === 0 && s.away.disallowedShots === 1, 'goals ≤ shotsOnTarget ≤ shots; shotsOnTarget = goals + saves; overturned attempt keeps xG but adds no goal/SOT');
}

{
  const badLog = new EventLog('bad-xg');
  badLog.append({ ...attempt('home', 'bad-1', 'striker'), xg: 0.21 });
  check('xG cannot diverge from the actual pGoal used', throws(() => reduceMatchEvents(badLog.readAll()), 'xG must equal'), 'mismatch rejected');
}

{
  const pending = new EventLog('pending-goal');
  pending.append(attempt('home', 'pending-1', 'striker'));
  pending.append({ type: 'SHOT_RESOLVED', shotId: 'pending-1', outcome: 'goal', second: 1, minute: 0 });
  check('A final match cannot contain an unconfirmed or unresolved shot', throws(() => reduceMatchEvents(pending.readAll(), true), 'unresolved shots'), 'pending goal requires confirmation or VAR overturn');
}

for (const item of checks) console.log(`${item.pass ? '✅' : '❌'} ${item.name} | ${item.detail}`);
console.log(`\nMATCH-CORE-WAVE1: ${checks.filter((item) => item.pass).length}/${checks.length}`);
if (checks.some((item) => !item.pass)) process.exit(1);
