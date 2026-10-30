// Causal chance model + goal-pace/randomness regression; no score truncation.
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { MatchSession } from '../src/engine/session';
import { aiDefaultTactic } from '../src/engine/tactics';
import { clearChanceRetention, resolvePossessionOwner } from '../src/engine/possession';
import type { TeamMatchProfile } from '../src/engine/profiles';
import type { Club, Player } from '../src/types';
import type { MatchInput } from '../src/engine/engine';

let passed = 0, failed = 0;
function check(name: string, condition: unknown, detail = '') { condition ? passed++ : failed++; console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); }
const groups = ['zirve', 'gecit', 'kok'].map((league) => CLUBS.filter((club) => club.league === league));
const top = [...groups[0]].sort((a, b) => b.strength - a.strength);
const bottom = [...groups[2]].sort((a, b) => a.strength - b.strength);
const squads = new Map<string, Player[]>(CLUBS.map((club) => [club.id, genSquad(club, 20261026)]));
const count = 240;
type Scenario = 'league' | 'favorite-home' | 'favorite-away';
type Pace = MatchInput['goalPace'];
type Randomness = MatchInput['randomness'];
type Row = { games: number; goals: number; xg: number; home: number; away: number; draw: number; seven: number; nine: number; upset: number; favoriteWin: number; max: number };
const rows = new Map<string, Row>();
const pct = (value: number, denominator: number) => `${(100 * value / denominator).toFixed(1)}%`;
const row = () : Row => ({ games: 0, goals: 0, xg: 0, home: 0, away: 0, draw: 0, seven: 0, nine: 0, upset: 0, favoriteWin: 0, max: 0 });
function pair(scenario: Scenario, i: number): [Club, Club] {
  if (scenario === 'favorite-home') return [top[i % top.length], bottom[(i * 5 + 1) % bottom.length]];
  if (scenario === 'favorite-away') return [bottom[(i * 7 + 2) % bottom.length], top[(i * 3 + 1) % top.length]];
  const group = groups[i % groups.length];
  const home = group[i % group.length];
  const away = group[(i * 5 + 3) % group.length];
  return [home, away.id === home.id ? group[(i + 1) % group.length] : away];
}

const noGap = clearChanceRetention(10, 'C-A');
const partial = clearChanceRetention(19, 'C-A');
const box = clearChanceRetention(28, 'C-A');
const middle = clearChanceRetention(28, 'C-M');
const deep = clearChanceRetention(28, 'C-D');
check('Normal güç farkı eski şans dağılımını korur; artış kademeli ve sınırlıdır', noGap === 1 && partial < noGap && partial > box && box === clearChanceRetention(100, 'C-A'));
check('Büyük güç farkında savunma uzak şutlarda daha çok alan kapatır', deep > 0 && deep < middle && middle < box && box < 1);
const profile = (quality: number): TeamMatchProfile => ({ buildUp: quality, midfield: quality, wideAttack: quality, centralAttack: quality, finalThird: quality, block: quality, press: quality, transition: quality, setAtt: quality, setDef: quality, keeper: quality, raw: { baseQuality: quality, meanFitness: 100, meanForm: 100 } });
const owner = (home: number, away: number, rolls: number[]) => resolvePossessionOwner(profile(home), profile(away), { minute: 5, homeScore: 0, awayScore: 0, rng: () => rolls.shift()!, jitter: 2, goalPaceMul: 1, weather: 'acik' });
check('Düşük rastlantısallıkta bile top kazanma payı iki yön için mümkündür', owner(90, 40, [0.5, 0.001]) === 'away' && owner(40, 90, [0.001, 0.5]) === 'home' && owner(90, 40, [0.5, 0.5]) === 'home' && owner(40, 90, [0.5, 0.5]) === 'away');

let mismatch = 0;
for (const randomness of ['low', 'normal', 'high'] as Randomness[]) {
  for (const pace of ['dusuk', 'dengeli', 'yuksek'] as Pace[]) {
    for (const scenario of ['league', 'favorite-home', 'favorite-away'] as Scenario[]) {
      const stats = row(); rows.set(`${randomness}/${pace}/${scenario}`, stats);
      for (let i = 0; i < count; i++) {
        const [home, away] = pair(scenario, i);
        const session = new MatchSession({ homeClub: home, awayClub: away, homeSquad: squads.get(home.id)!, awaySquad: squads.get(away.id)!, homeTactic: aiDefaultTactic(home, away), awayTactic: aiDefaultTactic(away, home), seed: 712409 + i * 7919, goalPace: pace, randomness, weather: 'acik' });
        const result = session.finishNow(); const s = result.stats;
        const events = session.getCoreEvents();
        const goalsHome = events.filter((e) => e.type === 'GOAL_CONFIRMED' && e.side === 'home').length;
        const goalsAway = events.filter((e) => e.type === 'GOAL_CONFIRMED' && e.side === 'away').length;
        const xgHome = events.filter((e) => e.type === 'SHOT' && e.side === 'home').reduce((n, e) => n + (e.type === 'SHOT' ? e.pGoal : 0), 0);
        const xgAway = events.filter((e) => e.type === 'SHOT' && e.side === 'away').reduce((n, e) => n + (e.type === 'SHOT' ? e.pGoal : 0), 0);
        if (goalsHome !== s.hg || goalsAway !== s.ag || Math.abs(xgHome - s.xgH) > 1e-7 || Math.abs(xgAway - s.xgA) > 1e-7) mismatch++;
        stats.games++; stats.goals += s.hg + s.ag; stats.xg += s.xgH + s.xgA;
        if (s.hg > s.ag) stats.home++; else if (s.ag > s.hg) stats.away++; else stats.draw++;
        if (Math.max(s.hg, s.ag) >= 7) stats.seven++;
        if (s.hg + s.ag >= 9) stats.nine++;
        stats.max = Math.max(stats.max, s.hg, s.ag);
        if (scenario !== 'league') {
          const favoredHome = scenario === 'favorite-home';
          if (favoredHome ? s.hg > s.ag : s.ag > s.hg) stats.favoriteWin++;
          if (favoredHome ? s.hg < s.ag : s.ag < s.hg) stats.upset++;
        }
      }
      console.log(`${randomness}/${pace}/${scenario}: n=${stats.games} goals=${(stats.goals / stats.games).toFixed(2)} xG=${(stats.xg / stats.games).toFixed(2)} H/D/A=${pct(stats.home, stats.games)}/${pct(stats.draw, stats.games)}/${pct(stats.away, stats.games)} team7+=${pct(stats.seven, stats.games)} 9+=${pct(stats.nine, stats.games)} maxTeam=${stats.max}${scenario === 'league' ? '' : ` fav=${pct(stats.favoriteWin, stats.games)} upset=${pct(stats.upset, stats.games)}`}`);
    }
  }
}
const all = [...rows.values()];
check('Tüm hız/rastlantısallık ayarlarında gol ve xG gerçek olay defterinden birebir türetilir', mismatch === 0 && all.reduce((n, r) => n + r.games, 0) === 6480, `${mismatch} uyuşmazlık · 6.480 maç`);
for (const randomness of ['low', 'normal', 'high'] as Randomness[]) {
  const aggregate = (pace: Pace) => (['league', 'favorite-home', 'favorite-away'] as Scenario[]).reduce((n, scenario) => n + rows.get(`${randomness}/${pace}/${scenario}`)!.goals, 0);
  const low = aggregate('dusuk'), high = aggregate('yuksek');
  check(`${randomness}: yüksek gol temposu düşük tempodan daha üretkendir`, high > low, `${(low / (count * 3)).toFixed(2)} → ${(high / (count * 3)).toFixed(2)} gol/maç`);
}
const favorites = [...rows.entries()].filter(([name]) => !name.endsWith('/league')).map(([, r]) => r);
const league = [...rows.entries()].filter(([name]) => name.endsWith('/league')).map(([, r]) => r);
check('Farklı ayarlarda favoriler güçlü kalır, sürpriz ve beraberlik hâlâ mümkündür', favorites.every((r) => r.favoriteWin / r.games > 0.75 && r.draw > 0) && favorites.reduce((n, r) => n + r.upset, 0) > 0 && [...rows.entries()].filter(([name]) => name.startsWith('low/') && !name.endsWith('/league')).reduce((n, [, r]) => n + r.upset, 0) > 0);
check('Lig maçları ve favori eşleşmeleri aşırı uçlara veya sıfır gollü modele çökmez', league.every((r) => r.goals / r.games > 1.3 && r.goals / r.games < 3.2) && favorites.every((r) => r.goals / r.games > 2 && r.goals / r.games < 4.5 && r.seven / r.games < 0.12));
check('Nadir yüksek skorlar hâlâ yaşanır; maç skoru veya gol sayısı kesilmez', all.some((r) => r.max >= 8) && all.some((r) => r.nine > 0));
console.log(`\n${passed}/${passed + failed} gol dengesi kontrolü geçti.`);
if (failed) process.exitCode = 1;
