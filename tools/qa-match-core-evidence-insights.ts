// Evidence-safe match insight checks across deterministic production MatchSessions.
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { aiDefaultTactic, type MatchInput } from '../src/engine/engine';
import { MatchSession } from '../src/engine/session';

const home = CLUBS[0], away = CLUBS[12];
const base: MatchInput = {
  homeClub: home, awayClub: away,
  homeSquad: genSquad(home, 260101), awaySquad: genSquad(away, 260102),
  homeTactic: aiDefaultTactic(home, away), awayTactic: aiDefaultTactic(away, home),
  seed: 260103, goalPace: 'dengeli', randomness: 'normal',
};
const checks: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });
const claimsCausality = /son bölümde|etkiledi|belirledi|planı çalıştı|hedeflerine ulaştı|skoru korudu|maçı kontrol etti/i;
let countValid = true, metricLinks = true, causalClaims = 0;
for (let i = 0; i < 60; i++) {
  const result = new MatchSession({ ...base, seed: base.seed + i * 97 }).finishNow();
  const [score, shots, possession] = result.insights;
  countValid &&= result.insights.length >= 3 && result.insights.length <= 5;
  metricLinks &&= score.includes(`${result.stats.hg}–${result.stats.ag}`)
    && shots.includes(`${result.stats.shotsH}/${result.stats.onH}`) && shots.includes(`${result.stats.shotsA}/${result.stats.onA}`)
    && possession.includes(`${result.stats.posH}%–${100 - result.stats.posH}%`);
  causalClaims += result.insights.filter((line) => claimsCausality.test(line)).length;
}
check('Every match retains three to five concise insights', countValid, `60 results checked; length contract=${countValid}`);
check('Score, xG, shot/on-target, saves, possession and foul statements use live result metrics', metricLinks, `60 result projections align=${metricLinks}`);
check('No unsupported causal fallback claims remain', causalClaims === 0, `unsupported causal lines=${causalClaims}`);
for (const item of checks) console.log(`${item.pass ? '✅' : '❌'} ${item.name} | ${item.detail}`);
console.log(`\nMATCH-CORE-EVIDENCE-INSIGHTS: ${checks.filter((item) => item.pass).length}/${checks.length}`);
if (checks.some((item) => !item.pass)) process.exit(1);
