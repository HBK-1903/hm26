// Regression gate for the quick-match KZP score-patch defect.
import { readFileSync } from 'node:fs';
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { aiDefaultTactic, type MatchInput } from '../src/engine/engine';
import { aiChallengeResponsiveness, chooseAiTactic, chooseAiTacticDecision } from '../src/engine/tactics';
import { MatchSession } from '../src/engine/session';
import { buildQuickMatchResult } from '../src/engine/quickMatchResult';
import { reduceMatchEvents } from '../src/engine/core/statReducer';

const home = CLUBS[0], away = CLUBS[12];
const baseInput: MatchInput = {
  homeClub: home, awayClub: away,
  homeSquad: genSquad(home, 26102601), awaySquad: genSquad(away, 26102602),
  homeTactic: aiDefaultTactic(home, away, away.strength),
  awayTactic: aiDefaultTactic(away, home, home.strength),
  seed: 26102603, goalPace: 'dengeli', randomness: 'normal',
};
const checks: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

{
  let parity = true;
  let ledgerIdentity = true;
  let traceParity = true;
  let changed = 0;
  for (let i = 0; i < 24; i++) {
    const input = { ...baseInput, seed: baseInput.seed + i * 7919 };
    const session = new MatchSession(input);
    const direct = session.finishNow();
    const quick = buildQuickMatchResult(input, home.id, away.id);
    const core = reduceMatchEvents(session.getCoreEvents(), true);
    parity &&= JSON.stringify(quick.engine) === JSON.stringify(direct);
    traceParity &&= JSON.stringify(direct.aiDecisionTraces ?? []) === JSON.stringify(session.getAiDecisionTraces());
    const identity = quick.hg === direct.stats.hg && quick.ag === direct.stats.ag
      && quick.engine.stats.hg === quick.hg && quick.engine.stats.ag === quick.ag
      && core.home.goals === quick.hg && core.away.goals === quick.ag
      && Math.abs(core.home.xg - quick.xgHome) < 1e-8 && Math.abs(core.away.xg - quick.xgAway) < 1e-8
      && quick.xgHome === quick.engine.stats.xgH && quick.xgAway === quick.engine.stats.xgA
      && JSON.stringify(quick.playerRows) === JSON.stringify(quick.engine.stats.playerRows)
      && quick.shotsLog.length === quick.engine.stats.shotsH + quick.engine.stats.shotsA;
    ledgerIdentity &&= identity;
    if (quick.hg !== direct.stats.hg || quick.ag !== direct.stats.ag) changed++;
  }
  check('Quick result is an exact adapter projection of the deterministic MatchSession output', parity,
    `seed sweep=24; exact engine parity=${parity}`);
  check('AI decision traces are deterministic and exposed through both session and engine result', traceParity,
    `seed sweep=24; session/result trace parity=${traceParity}`);
  check('Quick score, event reducer, xG, shot ledger and scorer rows remain aligned', ledgerIdentity && changed === 0,
    `score changes after engine=${changed}; all event/stat identities=${ledgerIdentity}`);
}

{
  const situation = { minute: 65, goalsFor: 0, goalsAgainst: 1, averageFitness: 100 };
  const easyPlan = chooseAiTactic(home, away, { ...situation, challengePoints: 20 });
  const hardPlan = chooseAiTactic(home, away, { ...situation, challengePoints: 70 });
  const bounded = Math.abs(aiChallengeResponsiveness(0) - 0.8) < 1e-12
    && Math.abs(aiChallengeResponsiveness(50) - 1) < 1e-12
    && Math.abs(aiChallengeResponsiveness(100) - 1.2) < 1e-12;
  check('KZP now changes opponent AI tactical response before play, not the completed score', bounded
    && easyPlan.plan !== hardPlan.plan && easyPlan.plan === 'dengeli' && hardPlan.plan === 'yuksekPres',
    `factor=${aiChallengeResponsiveness(20).toFixed(2)}→${aiChallengeResponsiveness(70).toFixed(2)}; plans=${easyPlan.plan}→${hardPlan.plan}`);
}

{
  const decision = chooseAiTacticDecision(home, away, {
    minute: 80, goalsFor: 1, goalsAgainst: 1, averageFitness: 55, challengePoints: 70,
    xgFor: 0.3, xgAgainst: 2.1, recentXgFor: 0.05, recentXgAgainst: 0.8,
    wideAttacksFor: 1, wideAttacksAgainst: 12, centralAttacksFor: 3, centralAttacksAgainst: 8,
    redCardsFor: 1, redCardsAgainst: 0,
  });
  const trace = decision.trace;
  const traceComplete = trace.minute === 80 && trace.xgAgainst === 2.1 && trace.recentXgAgainst === 0.8
    && trace.wideAttacksAgainst === 12 && trace.centralAttacksAgainst === 8 && trace.redCardsFor === 1
    && trace.challengePoints === 70 && trace.utilities[trace.chosen] === Math.max(...Object.values(trace.utilities))
    && Object.values(trace.utilities).every(Number.isFinite);
  check('AI decision trace captures xG trend, attack channels, cards and candidate utilities', traceComplete,
    `threat=${trace.threatSignal.toFixed(3)} chosen=${trace.chosen} utilities=${Object.values(trace.utilities).map((value) => value.toFixed(2)).join('/')}`);
}

{
  const store = readFileSync(new URL('../src/store/game.tsx', import.meta.url), 'utf8');
  const prep = readFileSync(new URL('../src/screens/MatchPrep.tsx', import.meta.url), 'utf8');
  const live = readFileSync(new URL('../src/screens/LiveMatch.tsx', import.meta.url), 'utf8');
  const simulation = readFileSync(new URL('../src/engine/core/simulation.ts', import.meta.url), 'utf8');
  const start = store.indexOf('const buildDemoMatch =');
  const end = store.indexOf('const playLeagueMatch =', start);
  const builder = start >= 0 && end > start ? store.slice(start, end) : '';
  const noPostResultPatch = builder.includes('buildQuickMatchResult(input, homeId, awayId)')
    && !/res\.stats\.(?:hg|ag)\s*[+\-]?=/.test(builder);
  // Quick results use the same production match path, with the selected tactical plan.
  const quickUsesProductionPath = /g\.playLeagueMatch\(\{\s*\.\.\.next\s*\},\s*undefined,\s*activeTacticIdx\)/.test(prep);
  const difficultyIsPreMatch = builder.includes('challengeClubId: career.clubId') && builder.includes('challengePoints: career.manager.challengePoints')
    && live.includes('challengeClubId: g.career.clubId') && live.includes('challengePoints: g.career.manager.challengePoints')
    && simulation.includes('const opponentChallengePoints = this.input.challengeClubId && club.id !== this.input.challengeClubId');
  check('Production quick-match path has no post-score patch and carries KZP into pre-match opponent AI input',
    noPostResultPatch && quickUsesProductionPath && difficultyIsPreMatch,
    `no post-result patch=${noPostResultPatch}; quick path=${quickUsesProductionPath}; pre-match AI difficulty=${difficultyIsPreMatch}`);
}

for (const item of checks) console.log(`${item.pass ? '✅' : '❌'} ${item.name} | ${item.detail}`);
console.log(`\nMATCH-CORE-CHALLENGE-SCORE: ${checks.filter((item) => item.pass).length}/${checks.length}`);
if (checks.some((item) => !item.pass)) process.exit(1);
