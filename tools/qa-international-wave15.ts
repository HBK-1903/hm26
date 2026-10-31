// Wave 15 qualification, group/bracket, scorers, archive and save/load contract tests.
import { readFileSync } from 'node:fs';
import { CLUBS, INTERNATIONAL_CLUBS, clubById } from '../src/data/clubs';
import { buildInternationalSeason, buildInternationalKnockouts, advanceInternationalKnockouts, archiveInternationalSeason, internationalFixtures, internationalGroupTable, normalizeInternationalSeason, recordInternationalResult, recordInternationalScorers } from '../src/data/international';
import type { Cup } from '../src/data/calendar';
import type { LeagueId, TableRow } from '../src/types';

const results: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => results.push({ name, pass, detail });
const tables = {} as Record<LeagueId, TableRow[]>;
(['zirve', 'gecit', 'kok'] as LeagueId[]).forEach((league) => {
  tables[league] = CLUBS.filter((club) => club.league === league).map((club, index) => ({ clubId: club.id, p: 22, w: 18 - index, d: index, l: 4, gf: 50 - index, ga: 20 + index, pts: 54 - index * 2 }));
});
const cupWinner = tables.zirve[2].clubId;
const cupRunner = tables.kok[11].clubId;
const domesticCup: Cup = { groups: {}, fixtures: [], rounds: [{ name: 'Final', day: 300, played: true, ties: [{ id: 'final', homeId: cupWinner, awayId: cupRunner, hg: 2, ag: 1, winner: cupWinner }] }], champion: cupWinner };
const season = buildInternationalSeason({ seasonNo: 3, seed: 150001, tables, domesticCup });

{
  const ids = INTERNATIONAL_CLUBS.map((club) => club.id);
  const correctIds = ids.length === 24 && new Set(ids).size === 24 && ids.every((id) => !CLUBS.some((club) => club.id === id) && clubById(id).isInternational);
  const totalClubs = new Set(season.cups.flatMap((competition) => competition.qualifiers.map((row) => row.clubId))).size;
  const shapes = season.cups.every((competition) => competition.qualifiers.length === 16
    && Object.keys(competition.groups).length === 4 && Object.values(competition.groups).every((group) => group.length === 4)
    && competition.qualifiers.filter((row) => clubById(row.clubId).isInternational).length === 8
    && competition.qualifiers.filter((row) => !clubById(row.clubId).isInternational).length === 8);
  check('World adds 24 fictional external clubs without altering domestic club pools; both cups draw 8+8', correctIds && shapes && totalClubs === 32,
    `foreign=${ids.length}; each=${season.cups.map((competition) => competition.qualifiers.length).join('/')}; unique entrants=${totalClubs}; domestic pools=${CLUBS.length}`);
}

{
  const primary = season.cups.find((competition) => competition.id === 'champions')!;
  const secondary = season.cups.find((competition) => competition.id === 'continental')!;
  const noCrossCupOverlap = !primary.qualifiers.some((row) => secondary.qualifiers.some((other) => other.clubId === row.clubId));
  const cupHolder = primary.qualifiers.some((row) => row.clubId === cupWinner);
  const finalist = secondary.qualifiers.some((row) => row.clubId === cupRunner);
  const allGroupsValid = season.cups.every((competition) => Object.values(competition.groups).flat().length === 16);
  const repeatable = JSON.stringify(season) === JSON.stringify(buildInternationalSeason({ seasonNo: 3, seed: 150001, tables, domesticCup }));
  check('Qualification waterfall is deterministic, gives cup-holder/finalist access and prevents double entry', noCrossCupOverlap && cupHolder && finalist && allGroupsValid && repeatable,
    `distinct=${noCrossCupOverlap}; holder=${cupHolder}; finalist=${finalist}; deterministic=${repeatable}`);
}

{
  const cup = season.cups[0];
  const fixtures = internationalFixtures([cup]);
  const group = cup.groups.A;
  const groupFixtures = cup.fixtures.filter((fixture) => fixture.group === 'A');
  const schedule = [38, 61, 84].every((day) => groupFixtures.filter((fixture) => fixture.day === day).length === 2);
  const clubApps = new Map<string, number>();
  cup.fixtures.forEach((fixture) => { clubApps.set(fixture.homeId, (clubApps.get(fixture.homeId) ?? 0) + 1); clubApps.set(fixture.awayId, (clubApps.get(fixture.awayId) ?? 0) + 1); });
  const allThree = [...clubApps.values()].every((count) => count === 3) && clubApps.size === 16;
  const seeded = { ...cup, fixtures: cup.fixtures.map((fixture, index) => ({ ...fixture, played: true, hg: index % 3 === 0 ? 2 : 1, ag: index % 3 === 0 ? 0 : 1 })) };
  const rows = internationalGroupTable(seeded, 'A');
  check('Each 4-team group has a 3-match round robin, three scheduled rounds and score-derived tables', group.length === 4
    && groupFixtures.length === 6 && schedule && allThree && fixtures.length === 24 && rows.length === 4
    && rows.reduce((sum, row) => sum + row.p, 0) === 12 && rows.reduce((sum, row) => sum + row.pts, 0) >= 0,
    `group=${group.length}; matches=${groupFixtures.length}; each club=3; points=${rows.map((row) => row.pts).join('/')}`);
}

{
  let cup = { ...season.cups[0], fixtures: season.cups[0].fixtures.map((fixture, index) => ({ ...fixture, played: true, hg: index % 2 ? 1 : 2, ag: index % 2 ? 0 : 1 })) };
  cup = buildInternationalKnockouts(cup);
  const qfTeams = cup.rounds[0]?.ties.flatMap((tie) => [tie.homeId, tie.awayId]) ?? [];
  const qfValid = cup.rounds[0]?.name === 'Quarter-final' && cup.rounds[0].ties.length === 4 && new Set(qfTeams).size === 8;
  const playCurrentRound = (input: typeof cup) => {
    let state = input;
    const round = state.rounds.find((item) => !item.played)!;
    for (const tie of [...round.ties]) state = recordInternationalResult([state], { round: 0, homeId: tie.homeId, awayId: tie.awayId, played: false, day: round.day, comp: 'intl-ko', koRound: round.name, internationalCupId: state.id }, 2, 0, 150003)[0];
    return state;
  };
  cup = advanceInternationalKnockouts(playCurrentRound(cup), 150004);
  const semiValid = cup.rounds.some((round) => round.name === 'Semi-final' && round.ties.length === 2);
  cup = advanceInternationalKnockouts(playCurrentRound(cup), 150005);
  const finalValid = cup.rounds.some((round) => round.name === 'Final' && round.ties.length === 1);
  cup = advanceInternationalKnockouts(playCurrentRound(cup), 150006);
  check('Group winners/runners-up advance to a unique 8-team bracket; QF→SF→Final resolves champion and finalist', qfValid && semiValid && finalValid
    && !!cup.champion && !!cup.runnerUp && cup.champion !== cup.runnerUp,
    `QF=${qfTeams.length}/${qfValid}; SF=${semiValid}; final=${finalValid}; winner=${cup.champion}; runner-up=${cup.runnerUp}; distinct=${cup.champion !== cup.runnerUp}`);
}

{
  const cup = season.cups[0];
  const scorers = recordInternationalScorers([cup], cup.id, [
    { playerId: 'player-x', clubId: cup.qualifiers[0].clubId, goals: 2 },
    { playerId: 'player-y', clubId: cup.qualifiers[1].clubId, goals: 1 },
  ])[0];
  const serialized = JSON.parse(JSON.stringify({ ...season, cups: season.cups.map((item) => item.id === cup.id ? scorers : item) }));
  const restored = normalizeInternationalSeason(serialized, season);
  const legacy = normalizeInternationalSeason(undefined, season);
  const archive = archiveInternationalSeason({ seasonNo: 3, cups: [{ ...scorers, champion: cup.qualifiers[0].clubId, runnerUp: cup.qualifiers[1].clubId }] });
  check('Scorer board, group tables, finalists and JSON save/load survive; legacy saves create safe default cups', restored.cups[0].scorers['player-x']?.goals === 2
    && archive[0].topScorers[0]?.playerId === 'player-x' && archive[0].groupTables.length === 4
    && archive[0].champion === cup.qualifiers[0].clubId && legacy.cups.length === 2,
    `goals=${restored.cups[0].scorers['player-x']?.goals}; archiveGroups=${archive[0].groupTables.length}; legacy=${legacy.cups.length}`);
}

{
  const store = readFileSync(new URL('../src/store/game.tsx', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../src/screens/Comps.tsx', import.meta.url), 'utf8');
  const newsroom = readFileSync(new URL('../src/screens/Newsroom.tsx', import.meta.url), 'utf8');
  const wired = store.includes('normalizeInternationalSeason(pxAny.international, fallbackIntl)')
    && store.includes('internationalFixtures(st.international?.cups ?? [])')
    && store.includes('recordInternationalResult(international.cups, fixture')
    && store.includes('recordInternationalScorers(next.international.cups')
    && store.includes('archiveInternationalSeason(previousInternational)')
    && store.includes('internationalDone = next.international.cups.every')
    && ui.includes("['uluslararasi', 'Kıtalar']") && ui.includes('internationalGroupTable(internationalCup, group)')
    && ui.includes('Uluslararası gol krallığı') && ui.includes('Geçmiş sezonlar')
    && newsroom.includes('internationalFixtures(g.international?.cups ?? [])');
  check('Store handles migration, calendar blocking, AI/user results, seasonal archive and competition/news UI', wired,
    `migration=${store.includes('normalizeInternationalSeason(')}; fixture flow=${store.includes('internationalFixtures(st.international')}; archive+UI=${wired}`);
}

for (const result of results) console.log(`${result.pass ? '✅' : '❌'} ${result.name} | ${result.detail}`);
console.log(`\nINTERNATIONAL-WAVE15: ${results.filter((result) => result.pass).length}/${results.length}`);
if (results.some((result) => !result.pass)) process.exit(1);
