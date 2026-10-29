// Wave 13 evidence-backed newsroom and report-archive tests.
import { readFileSync } from 'node:fs';
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { buildHeadlines, leaguePulse, refereeReportEntries, selectTeamOfWeek } from '../src/data/newsroom';
import type { DemoFixture, MatchArchiveEntry, Player, TableRow } from '../src/types';

const results: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => results.push({ name, pass, detail });
const home = CLUBS[0], away = CLUBS[1];

{
  const fixtures: DemoFixture[] = [
    { round: 1, homeId: home.id, awayId: away.id, played: true, hg: 4, ag: 2, day: 12, comp: 'lig', league: home.league },
    { round: 2, homeId: away.id, awayId: home.id, played: false, day: 19, comp: 'lig', league: home.league },
  ];
  const headlines = buildHeadlines(fixtures, (id) => CLUBS.find((club) => club.id === id)?.short ?? id);
  check('Headlines publish recorded scores only and never preview an unplayed result', headlines.length === 1
    && headlines[0].detail === `${home.short} 4–2 ${away.short}` && headlines[0].title === 'Gollü doksan dakika',
    `published=${headlines.length}; ${headlines[0]?.detail}`);
}

const homeSquad = genSquad(home, 130001), awaySquad = genSquad(away, 130002);
const lookup = new Map<string, Player>([...homeSquad, ...awaySquad].map((player) => [player.id, player]));
const playerRows: MatchArchiveEntry['playerRows'] = {};
const playerClubIds: Record<string, string> = {};
[...homeSquad, ...awaySquad].forEach((player, index) => {
  playerRows[player.id] = { min: 90, g: index === 10 ? 2 : 0, a: index === 9 ? 1 : 0, yellow: 0, red: 0, rating: 6.2 + (index % 7) * 0.4, posGroup: player.group };
  playerClubIds[player.id] = homeSquad.some((candidate) => candidate.id === player.id) ? home.id : away.id;
});
const report: MatchArchiveEntry = {
  id: 'report-fixture-12', day: 12, seasonNo: 1, comp: 'lig', homeId: home.id, awayId: away.id, hg: 3, ag: 1,
  xgHome: 2.2, xgAway: 0.7, foulsHome: 10, foulsAway: 13, yellowsHome: 1, yellowsAway: 2, redsHome: 0, redsAway: 0,
  referee: { label: 'Hakem B', strictness: 'balanced' }, playerRows, playerClubIds,
};

{
  const xi = selectTeamOfWeek([report], 6, 13, (id) => lookup.get(id) ?? null);
  const hasKeeper = xi.some((player) => player.group === 'GK');
  const unique = new Set(xi.map((player) => player.playerId)).size === xi.length;
  const accurateEvidence = xi.every((player) => lookup.get(player.playerId)?.name === player.name && player.rating >= 6.2);
  const empty = selectTeamOfWeek([], 6, 13, () => null);
  check('Team of the Week is drawn from actual player minutes/ratings and uses no invented rows', xi.length === 11
    && hasKeeper && unique && accurateEvidence && empty.length === 0,
    `XI=${xi.length}; keeper=${hasKeeper}; unique=${unique}; empty-state=${empty.length}`);
}

{
  const table: TableRow[] = [
    { clubId: away.id, p: 4, w: 2, d: 0, l: 2, gf: 4, ga: 4, pts: 6 },
    { clubId: home.id, p: 4, w: 3, d: 0, l: 1, gf: 6, ga: 3, pts: 9 },
  ];
  const pulse = leaguePulse(table, CLUBS);
  const reports = refereeReportEntries([report]);
  check('League pulse follows standings and referee panel uses persisted referee/stat evidence', pulse[0].clubId === home.id
    && pulse[0].gd === 3 && reports.length === 1 && reports[0].referee?.label === 'Hakem B'
    && reports[0].foulsHome + reports[0].foulsAway === 23,
    `leader=${pulse[0].name}; referee=${reports[0]?.referee?.label}; fouls=23`);
}

{
  const store = readFileSync(new URL('../src/store/game.tsx', import.meta.url), 'utf8');
  const matchScreen = readFileSync(new URL('../src/screens/LiveMatch.tsx', import.meta.url), 'utf8');
  const shell = readFileSync(new URL('../src/screens/Shell.tsx', import.meta.url), 'utf8');
  const wired = store.includes('matchReports: (pxAny.matchReports as MatchArchiveEntry[]) ?? []')
    && store.includes('?? res.playerRows') && store.includes('matchReports: [matchReport,')
    && matchScreen.includes('rr.referee') && /current === 'newsroom' && <NewsroomScreen(?:\s+[^>]*)?\s*\/>/.test(shell);
  const noEngineMutation = !/buildHeadlines[\s\S]{0,800}(?:playLeagueMatch|setSt|simulateMatch)\(/.test(readFileSync(new URL('../src/data/newsroom.ts', import.meta.url), 'utf8'));
  check('Archive migrates old saves and newsroom is wired read-only from actual match reports', wired && noEngineMutation,
    `archive=${wired}; pure newsroom=${noEngineMutation}; referee/player rows preserved`);
}

for (const result of results) console.log(`${result.pass ? '✅' : '❌'} ${result.name} | ${result.detail}`);
console.log(`\nNEWSROOM-WAVE13: ${results.filter((result) => result.pass).length}/${results.length}`);
if (results.some((result) => !result.pass)) process.exit(1);
