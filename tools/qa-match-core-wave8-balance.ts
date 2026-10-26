import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { MatchSession } from '../src/engine/session';
import { aiDefaultTactic } from '../src/engine/tactics';
import type { Club, Player } from '../src/types';
import type { Weather } from '../src/engine/engine';

const WORLD_SEED = 20261026;
const PER_SCENARIO = 2_000;
const WEATHER: Weather[] = ['acik', 'yagmur', 'sicak', 'rüzgar', 'kotuZemin'];

type ScenarioName = 'zirve' | 'gecit' | 'kok' | 'favori_ev' | 'favori_deplasman';
interface Bucket {
  games: number; goals: number; xgHome: number; xgAway: number;
  homeWins: number; draws: number; awayWins: number; favoriteGames: number; favoriteWins: number; underdogWins: number;
  zeroZero: number; highScore: number; matchesWithRed: number; reds: number; yellows: number;
  corners: number; fouls: number; freeKicks: number; penalties: number; aiChanges: number;
}
const freshBucket = (): Bucket => ({ games: 0, goals: 0, xgHome: 0, xgAway: 0, homeWins: 0, draws: 0, awayWins: 0, favoriteGames: 0, favoriteWins: 0, underdogWins: 0, zeroZero: 0, highScore: 0, matchesWithRed: 0, reds: 0, yellows: 0, corners: 0, fouls: 0, freeKicks: 0, penalties: 0, aiChanges: 0 });
const buckets: Record<ScenarioName, Bucket> = { zirve: freshBucket(), gecit: freshBucket(), kok: freshBucket(), favori_ev: freshBucket(), favori_deplasman: freshBucket() };
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
for (const [scenarioIndex, scenario] of (Object.keys(buckets) as ScenarioName[]).entries()) {
  const stats = buckets[scenario];
  for (let i = 0; i < PER_SCENARIO; i++) {
    const [homeClub, awayClub] = pairFor(scenario, i);
    const session = new MatchSession({
      homeClub, awayClub,
      homeSquad: squads.get(homeClub.id)!, awaySquad: squads.get(awayClub.id)!,
      homeTactic: aiDefaultTactic(homeClub, awayClub), awayTactic: aiDefaultTactic(awayClub, homeClub),
      seed: WORLD_SEED + (scenarioIndex + 1) * 1_000_003 + i * 7_919,
      goalPace: 'dengeli', randomness: 'normal', weather: WEATHER[(i + scenarioIndex) % WEATHER.length],
    });
    const result = session.finishNow();
    const homeGoals = result.stats.hg, awayGoals = result.stats.ag, totalGoals = homeGoals + awayGoals;
    const events = session.getCoreEvents();
    const redsThisMatch = events.filter((event) => event.type === 'RED_CARD').length;
    stats.games++;
    stats.goals += totalGoals; stats.xgHome += result.stats.xgH; stats.xgAway += result.stats.xgA;
    if (homeGoals > awayGoals) stats.homeWins++; else if (homeGoals === awayGoals) stats.draws++; else stats.awayWins++;
    if (totalGoals === 0) stats.zeroZero++;
    if (totalGoals >= 9) stats.highScore++;
    if (redsThisMatch) stats.matchesWithRed++;
    stats.reds += redsThisMatch; stats.yellows += events.filter((event) => event.type === 'YELLOW_CARD').length;
    stats.corners += result.stats.cornersH + result.stats.cornersA;
    stats.fouls += result.stats.foulsH + result.stats.foulsA;
    stats.freeKicks += events.filter((event) => event.type === 'RESTART_AWARDED' && event.restartType === 'free_kick').length;
    stats.penalties += events.filter((event) => event.type === 'RESTART_AWARDED' && event.restartType === 'penalty').length;
    stats.aiChanges += events.filter((event) => event.type === 'TACTIC_CHANGE').length;
    if (homeClub.strength !== awayClub.strength) {
      stats.favoriteGames++;
      const homeFav = homeClub.strength > awayClub.strength;
      const favWon = homeFav ? homeGoals > awayGoals : awayGoals > homeGoals;
      const underdogWon = homeFav ? awayGoals > homeGoals : homeGoals > awayGoals;
      if (favWon) stats.favoriteWins++;
      if (underdogWon) stats.underdogWins++;
    }
    completed++;
  }
  console.log(`Progress: ${completed.toLocaleString('en-US')}/10,000 (${scenario})`);
}

function pct(n: number, d: number): string { return `${(n / Math.max(1, d) * 100).toFixed(1)}%`; }
function report(name: ScenarioName, b: Bucket): void {
  console.log(`${name.padEnd(18)} n=${b.games.toLocaleString('en-US')} avgG=${(b.goals / b.games).toFixed(2)} xG=${(b.xgHome / b.games).toFixed(2)}-${(b.xgAway / b.games).toFixed(2)} H/D/A=${pct(b.homeWins, b.games)}/${pct(b.draws, b.games)}/${pct(b.awayWins, b.games)} fav=${pct(b.favoriteWins, b.favoriteGames)} upset=${pct(b.underdogWins, b.favoriteGames)} 0-0=${pct(b.zeroZero, b.games)} 9+=${pct(b.highScore, b.games)} redMatch=${pct(b.matchesWithRed, b.games)} cards=${(b.yellows / b.games).toFixed(2)}R=${(b.reds / b.games).toFixed(2)} corners=${(b.corners / b.games).toFixed(2)} fouls=${(b.fouls / b.games).toFixed(1)} FK=${(b.freeKicks / b.games).toFixed(2)} pens=${(b.penalties / b.games).toFixed(3)} AIchanges=${(b.aiChanges / b.games).toFixed(2)}`);
}
console.log('\n=== HM26 MatchCore Wave 8 · deterministic 10,000-match balance sweep ===');
for (const name of Object.keys(buckets) as ScenarioName[]) report(name, buckets[name]);
const total = Object.values(buckets).reduce((sum, b) => {
  for (const key of Object.keys(sum) as (keyof Bucket)[]) sum[key] += b[key];
  return sum;
}, freshBucket());
const balanced = ['zirve', 'gecit', 'kok'].map((name) => buckets[name as ScenarioName]).reduce((sum, b) => {
  for (const key of Object.keys(sum) as (keyof Bucket)[]) sum[key] += b[key];
  return sum;
}, freshBucket());
const meanGoals = total.goals / total.games;
const favoriteRate = total.favoriteWins / total.favoriteGames;
const overallHomeRate = total.homeWins / total.games;
const balancedHomeRate = balanced.homeWins / balanced.games;
const balancedGoals = balanced.goals / balanced.games;
const redMatchRate = total.matchesWithRed / total.games;
const pass = completed === 10_000 && meanGoals > 2.0 && meanGoals < 4.2
  && balancedGoals > 1.75 && balancedGoals < 3.4
  && total.zeroZero / total.games < 0.22 && total.highScore / total.games < 0.05
  && favoriteRate > 0.50 && overallHomeRate > 0.25 && overallHomeRate < 0.60
  && balancedHomeRate > 0.25 && balancedHomeRate < 0.60
  && redMatchRate > 0.03 && redMatchRate < 0.25
  && total.corners / total.games > 0.2 && total.fouls > 0 && total.freeKicks > 0
  && total.penalties / total.games > 0.03 && total.penalties / total.games < 0.35
  && total.aiChanges > 0;
console.log(`\nTOTAL n=${total.games} avgG=${meanGoals.toFixed(2)} balancedAvgG=${balancedGoals.toFixed(2)} favWins=${pct(total.favoriteWins, total.favoriteGames)} overallHome=${pct(total.homeWins, total.games)} balancedHome=${pct(balanced.homeWins, balanced.games)} 0-0=${pct(total.zeroZero, total.games)} 9+=${pct(total.highScore, total.games)} redMatches=${pct(total.matchesWithRed, total.games)} reds=${total.reds} corners=${total.corners} pens=${total.penalties} AIChanges=${total.aiChanges}`);
console.log(`WAVE8 BALANCE: ${pass ? 'PASS' : 'FAIL'} (deterministic event/stat integrity enforced by every completed MatchSession)`);
if (!pass) process.exit(1);
