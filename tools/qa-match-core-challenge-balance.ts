// Deterministic balance sweep for the new causal KZP→opponent-AI input.
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { MatchSession } from '../src/engine/session';
import { aiDefaultTactic } from '../src/engine/tactics';
import type { Club, Player } from '../src/types';
import type { Weather } from '../src/engine/engine';

const WORLD_SEED = 20261026;
const PER_SCENARIO = 1_000;
const WEATHER: Weather[] = ['acik', 'yagmur', 'sicak', 'rüzgar', 'kotuZemin'];
type ScenarioName = 'zirve' | 'gecit' | 'kok' | 'favori_ev' | 'favori_deplasman';
type Difficulty = { label: 'easy' | 'balanced' | 'legendary'; points: number };
const DIFFICULTIES: Difficulty[] = [
  { label: 'easy', points: 20 }, { label: 'balanced', points: 45 }, { label: 'legendary', points: 90 },
];
interface Bucket {
  games: number; goals: number; xg: number; firstHalfGoals: number; secondHalfGoals: number;
  homeWins: number; draws: number; awayWins: number; favoriteGames: number; favoriteWins: number; underdogWins: number;
  zeroZero: number; fivePlus: number; firstHalfFivePlus: number; firstHalfSevenPlus: number;
  teamSevenPlus: number; xgSixPlus: number; ninePlus: number;
  reds: number; yellows: number; injuries: number; aiChanges: number;
}
const fresh = (): Bucket => ({ games: 0, goals: 0, xg: 0, firstHalfGoals: 0, secondHalfGoals: 0, homeWins: 0, draws: 0, awayWins: 0, favoriteGames: 0, favoriteWins: 0, underdogWins: 0, zeroZero: 0, fivePlus: 0, firstHalfFivePlus: 0, firstHalfSevenPlus: 0, teamSevenPlus: 0, xgSixPlus: 0, ninePlus: 0, reds: 0, yellows: 0, injuries: 0, aiChanges: 0 });
const buckets: Record<Difficulty['label'], Record<ScenarioName, Bucket>> = Object.fromEntries(DIFFICULTIES.map((difficulty) => [difficulty.label, Object.fromEntries((['zirve', 'gecit', 'kok', 'favori_ev', 'favori_deplasman'] as ScenarioName[]).map((name) => [name, fresh()]))])) as Record<Difficulty['label'], Record<ScenarioName, Bucket>>;
const leagues = {
  zirve: CLUBS.filter((club) => club.league === 'zirve'),
  gecit: CLUBS.filter((club) => club.league === 'gecit'),
  kok: CLUBS.filter((club) => club.league === 'kok'),
};
const top = [...leagues.zirve].sort((a, b) => b.strength - a.strength);
const bottom = [...leagues.kok].sort((a, b) => a.strength - b.strength);
const squads = new Map<string, Player[]>();
for (const club of CLUBS) squads.set(club.id, genSquad(club, WORLD_SEED));
function pairFor(scenario: ScenarioName, index: number): [Club, Club] {
  if (scenario === 'favori_ev') return [top[index % top.length], bottom[(index * 5 + 1) % bottom.length]];
  if (scenario === 'favori_deplasman') return [bottom[(index * 7 + 2) % bottom.length], top[(index * 3 + 1) % top.length]];
  const group = leagues[scenario];
  const home = group[index % group.length];
  let away = group[(index * 5 + 3) % group.length];
  if (away.id === home.id) away = group[(index + 1) % group.length];
  return [home, away];
}

let completed = 0;
for (const [difficultyIndex, difficulty] of DIFFICULTIES.entries()) {
  for (const [scenarioIndex, scenario] of (Object.keys(buckets[difficulty.label]) as ScenarioName[]).entries()) {
    const stats = buckets[difficulty.label][scenario];
    for (let i = 0; i < PER_SCENARIO; i++) {
      const [homeClub, awayClub] = pairFor(scenario, i);
      const session = new MatchSession({
        homeClub, awayClub, homeSquad: squads.get(homeClub.id)!, awaySquad: squads.get(awayClub.id)!,
        homeTactic: aiDefaultTactic(homeClub, awayClub), awayTactic: aiDefaultTactic(awayClub, homeClub),
        seed: WORLD_SEED + (difficultyIndex + 1) * 10_000_019 + (scenarioIndex + 1) * 1_000_003 + i * 7_919,
        goalPace: 'dengeli', randomness: 'normal', challengeClubId: homeClub.id, challengePoints: difficulty.points,
        weather: WEATHER[(i + scenarioIndex + difficultyIndex) % WEATHER.length],
      });
      let guard = 0;
      while (!session.done && session.getMinute() < 45 && guard++ < 200) session.step();
      const half = session.getStats();
      const result = session.finishNow();
      const hg = result.stats.hg, ag = result.stats.ag, total = hg + ag;
      const maxTeam = Math.max(hg, ag), maxXg = Math.max(result.stats.xgH, result.stats.xgA);
      const core = session.getCoreEvents();
      stats.games++; stats.goals += total; stats.xg += result.stats.xgH + result.stats.xgA;
      stats.firstHalfGoals += half.hg + half.ag; stats.secondHalfGoals += total - half.hg - half.ag;
      if (hg > ag) stats.homeWins++; else if (hg === ag) stats.draws++; else stats.awayWins++;
      if (scenario === 'favori_ev' || scenario === 'favori_deplasman') {
        stats.favoriteGames++;
        const favoriteHome = scenario === 'favori_ev';
        const favoriteGoals = favoriteHome ? hg : ag, underdogGoals = favoriteHome ? ag : hg;
        if (favoriteGoals > underdogGoals) stats.favoriteWins++;
        if (underdogGoals > favoriteGoals) stats.underdogWins++;
      }
      if (total === 0) stats.zeroZero++;
      if (total >= 5) stats.fivePlus++;
      if (half.hg + half.ag >= 5) stats.firstHalfFivePlus++;
      if (Math.max(half.hg, half.ag) >= 7) stats.firstHalfSevenPlus++;
      if (maxTeam >= 7) stats.teamSevenPlus++;
      if (maxXg >= 6) stats.xgSixPlus++;
      if (total >= 9) stats.ninePlus++;
      stats.reds += core.filter((event) => event.type === 'RED_CARD').length;
      stats.yellows += core.filter((event) => event.type === 'YELLOW_CARD').length;
      stats.injuries += result.injuries.length;
      stats.aiChanges += core.filter((event) => event.type === 'TACTIC_CHANGE').length;
      completed++;
    }
    if ((iShouldLog(scenarioIndex))) console.log(`Progress: ${completed.toLocaleString('en-US')}/15,000 (${difficulty.label}/${scenario})`);
  }
}
function iShouldLog(index: number): boolean { return index === 4; }
function pct(n: number, d: number): string { return `${(100 * n / Math.max(1, d)).toFixed(2)}%`; }
function summarize(b: Bucket): string {
  const favorite = b.favoriteGames ? ` fav=${pct(b.favoriteWins,b.favoriteGames)} upset=${pct(b.underdogWins,b.favoriteGames)}` : '';
  return `n=${b.games} avgG=${(b.goals / b.games).toFixed(2)} xG=${(b.xg / b.games).toFixed(2)} H/D/A=${pct(b.homeWins,b.games)}/${pct(b.draws,b.games)}/${pct(b.awayWins,b.games)}${favorite} 1H/2H=${(b.firstHalfGoals/b.games).toFixed(2)}/${(b.secondHalfGoals/b.games).toFixed(2)} 5+=${pct(b.fivePlus,b.games)} 1H5+=${pct(b.firstHalfFivePlus,b.games)} 1Hteam7+=${pct(b.firstHalfSevenPlus,b.games)} team7+=${pct(b.teamSevenPlus,b.games)} xG6+=${pct(b.xgSixPlus,b.games)} 9+=${pct(b.ninePlus,b.games)} cards=${(b.yellows/b.games).toFixed(2)}R=${(b.reds/b.games).toFixed(2)} injuries=${(b.injuries/b.games).toFixed(3)} AI=${(b.aiChanges/b.games).toFixed(2)}`;
}
const totals: Record<Difficulty['label'], Bucket> = { easy: fresh(), balanced: fresh(), legendary: fresh() };
for (const difficulty of DIFFICULTIES) for (const b of Object.values(buckets[difficulty.label])) {
  for (const key of Object.keys(totals[difficulty.label]) as (keyof Bucket)[]) totals[difficulty.label][key] += b[key];
}
console.log('\n=== HM26 causal challenge profile sweep · 15,000 deterministic matches ===');
for (const difficulty of DIFFICULTIES) console.log(`${difficulty.label.padEnd(10)} KZP=${difficulty.points} ${summarize(totals[difficulty.label])}`);
for (const difficulty of DIFFICULTIES) for (const scenario of Object.keys(buckets[difficulty.label]) as ScenarioName[]) console.log(`${difficulty.label}/${scenario}: ${summarize(buckets[difficulty.label][scenario])}`);
const profileSane = DIFFICULTIES.every(({ label }) => {
  const b = totals[label]; const avg = b.goals / b.games;
  return b.games === 5_000 && Number.isFinite(avg) && avg > 1.5 && avg < 4.5
    && b.favoriteGames === 2_000 && b.favoriteWins / b.favoriteGames > 0.8 && b.underdogWins > 0
    && b.zeroZero / b.games < 0.3 && b.ninePlus / b.games < 0.06
    && b.firstHalfFivePlus / b.games < 0.07 && b.teamSevenPlus / b.games < 0.08
    && b.xgSixPlus / b.games < 0.08 && b.aiChanges > 0;
});
const favoriteTailsSane = DIFFICULTIES.every(({ label }) => (['favori_ev', 'favori_deplasman'] as ScenarioName[]).every((scenario) => {
  const b = buckets[label][scenario]; const avg = b.goals / b.games;
  return b.games === PER_SCENARIO && avg < 5 && b.ninePlus / b.games < 0.08
    && b.firstHalfFivePlus / b.games < 0.15 && b.firstHalfSevenPlus / b.games < 0.02
    && b.teamSevenPlus / b.games < 0.22 && b.xgSixPlus / b.games < 0.17;
}));
const tailWatch = DIFFICULTIES.some(({ label }) => (['favori_ev', 'favori_deplasman'] as ScenarioName[]).some((scenario) => {
  const b = buckets[label][scenario];
  return b.firstHalfFivePlus / b.games > 0.08 || b.teamSevenPlus / b.games > 0.12 || b.xgSixPlus / b.games > 0.1;
}));
console.log(`CHALLENGE-BALANCE: ${profileSane && favoriteTailsSane && completed === 15_000 ? 'PASS' : 'FAIL'} (15k; H/D/A, upset rate, half split, 5+/7+/xG tails by difficulty)`);
if (tailWatch) console.log('TAIL WATCH: large favorite mismatches still have elevated 5+ first-half / 7+ team / 6+ xG rates; see scenario rows above.');
if (!profileSane || !favoriteTailsSane || completed !== 15_000) process.exit(1);
