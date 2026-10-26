// Wave 15 — fictional international cup qualification, progression and archives.
import type { DemoFixture, LeagueId, Player, TableRow } from '../types';
import type { Cup } from './calendar';
import { CLUBS, INTERNATIONAL_CLUBS, clubById } from './clubs';
import { mulberry32 } from './gen';

export type InternationalCupId = 'champions' | 'continental';
export interface InternationalTie { id: string; homeId: string; awayId: string; hg?: number; ag?: number; pens?: boolean; winner?: string }
export interface InternationalRound { name: 'Quarter-final' | 'Semi-final' | 'Final'; day: number; ties: InternationalTie[]; played: boolean }
export interface InternationalCup {
  id: InternationalCupId;
  name: string;
  seasonNo: number;
  groups: Record<string, string[]>;
  fixtures: DemoFixture[];
  rounds: InternationalRound[];
  qualifiers: { clubId: string; route: string }[];
  scorers: Record<string, { playerId: string; clubId: string; goals: number }>;
  champion?: string;
  runnerUp?: string;
}
export interface InternationalSeason { seasonNo: number; cups: InternationalCup[] }
export interface InternationalArchiveEntry {
  seasonNo: number;
  cupId: InternationalCupId;
  name: string;
  champion: string | null;
  runnerUp: string | null;
  participants: string[];
  topScorers: { playerId: string; clubId: string; goals: number }[];
  groupTables: { group: string; rows: { clubId: string; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number }[] }[];
}

export const INTERNATIONAL_GROUP_DAYS = [38, 61, 84] as const;
export const INTERNATIONAL_ROUND_DAYS = { 'Quarter-final': 174, 'Semi-final': 230, Final: 279 } as const;
const GROUPS = ['A', 'B', 'C', 'D'];
const PAIRINGS: [number, number][][] = [
  [[0, 1], [2, 3]],
  [[0, 2], [1, 3]],
  [[0, 3], [1, 2]],
];

export function internationalGroupTable(cup: InternationalCup, group: string) {
  const ids = cup.groups[group] ?? [];
  const rows = new Map(ids.map((clubId) => [clubId, { clubId, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }]));
  cup.fixtures.filter((fixture) => fixture.group === group && fixture.played).forEach((fixture) => {
    const home = rows.get(fixture.homeId), away = rows.get(fixture.awayId);
    if (!home || !away) return;
    const hg = fixture.hg ?? 0, ag = fixture.ag ?? 0;
    home.p++; away.p++; home.gf += hg; home.ga += ag; away.gf += ag; away.ga += hg;
    if (hg > ag) { home.w++; home.pts += 3; away.l++; }
    else if (hg < ag) { away.w++; away.pts += 3; home.l++; }
    else { home.d++; away.d++; home.pts++; away.pts++; }
  });
  return [...rows.values()].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.clubId.localeCompare(b.clubId));
}

function domesticLeagueOrder(tables: Record<LeagueId, TableRow[]>): string[] {
  const order: string[] = [];
  (['zirve', 'gecit', 'kok'] as LeagueId[]).forEach((league) => {
    const rows = tables[league] ?? [];
    const sorted = [...rows].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.clubId.localeCompare(b.clubId));
    sorted.forEach((row) => { if (CLUBS.some((club) => club.id === row.clubId) && !order.includes(row.clubId)) order.push(row.clubId); });
  });
  CLUBS.forEach((club) => { if (!order.includes(club.id)) order.push(club.id); });
  return order;
}

function domesticCupRunnerUp(cup?: Cup): string | null {
  if (!cup?.champion || !cup.rounds.length) return null;
  const final = cup.rounds[cup.rounds.length - 1];
  const tie = final.ties.find((item) => item.winner === cup.champion);
  if (!tie) return null;
  return tie.homeId === cup.champion ? tie.awayId : tie.homeId;
}

function takeDomestic(preferred: string[], fallback: string[], excluded: Set<string>, count: number, route: string) {
  const selected: { clubId: string; route: string }[] = [];
  const add = (id: string, why: string) => {
    if (selected.length >= count || excluded.has(id) || selected.some((row) => row.clubId === id) || !CLUBS.some((club) => club.id === id)) return;
    selected.push({ clubId: id, route: why });
  };
  preferred.forEach((id) => add(id, route));
  fallback.forEach((id) => add(id, 'Domestic merit fallback'));
  return selected;
}

function makeCup(id: InternationalCupId, seasonNo: number, seed: number, domestic: { clubId: string; route: string }[], foreignIds: string[]): InternationalCup {
  const cupName = id === 'champions' ? 'HM26 Şampiyonlar Kupası' : 'HM26 Kıtalar Kupası';
  const all = [...domestic, ...foreignIds.map((clubId) => ({ clubId, route: `Continental coefficient · ${clubById(clubId).country ?? 'fictional association'}` }))];
  const rng = mulberry32(seed ^ (id === 'champions' ? 0x51a7 : 0xc04a));
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
  const groups: Record<string, string[]> = Object.fromEntries(GROUPS.map((group, i) => [group, all.slice(i * 4, i * 4 + 4).map((row) => row.clubId)]));
  const fixtures: DemoFixture[] = [];
  Object.entries(groups).forEach(([group, clubs]) => PAIRINGS.forEach((pairs, roundIndex) => pairs.forEach(([homeIndex, awayIndex]) => fixtures.push({
    round: roundIndex + 1, homeId: clubs[homeIndex], awayId: clubs[awayIndex], played: false,
    day: INTERNATIONAL_GROUP_DAYS[roundIndex], comp: 'intl-grup', group, internationalCupId: id,
  }))));
  return { id, name: cupName, seasonNo, groups, fixtures, rounds: [], qualifiers: all.map(({ clubId, route }) => ({ clubId, route })), scorers: {} };
}

/** Qualification waterfall: cup holder + upper domestic places; distinct second-cup places; coefficient-ranked fictional visitors. */
export function buildInternationalSeason(input: { seasonNo: number; seed: number; tables: Record<LeagueId, TableRow[]>; domesticCup?: Cup }): InternationalSeason {
  const order = domesticLeagueOrder(input.tables);
  const zr = (input.tables.zirve ?? []).map((row) => row.clubId);
  const gc = (input.tables.gecit ?? []).map((row) => row.clubId);
  const kk = (input.tables.kok ?? []).map((row) => row.clubId);
  const champion = input.domesticCup?.champion;
  const runnerUp = domesticCupRunnerUp(input.domesticCup);
  const championsPreferred = [...(champion ? [champion] : []), ...zr.slice(0, 4), ...gc.slice(0, 2), ...kk.slice(0, 1)];
  const championsDomestic = takeDomestic(championsPreferred, order, new Set(), 8, champion && championsPreferred[0] === champion ? 'Miras Cup holder / upper-league place' : 'Upper-league qualification');
  const used = new Set(championsDomestic.map((row) => row.clubId));
  const shieldPreferred = [...(runnerUp ? [runnerUp] : []), ...zr.slice(4, 8), ...gc.slice(2, 4), ...kk.slice(1, 2)];
  const shieldDomestic = takeDomestic(shieldPreferred, order, used, 8, runnerUp && shieldPreferred[0] === runnerUp ? 'Miras Cup finalist / next domestic places' : 'Next domestic places');
  const foreign = [...INTERNATIONAL_CLUBS].sort((a, b) => (b.continentalRating ?? b.strength) - (a.continentalRating ?? a.strength) || a.id.localeCompare(b.id));
  const championsForeign = foreign.slice(0, 8).map((club) => club.id);
  const shieldForeign = foreign.slice(8, 16).map((club) => club.id);
  return {
    seasonNo: input.seasonNo,
    cups: [
      makeCup('champions', input.seasonNo, input.seed, championsDomestic, championsForeign),
      makeCup('continental', input.seasonNo, input.seed + 1, shieldDomestic, shieldForeign),
    ],
  };
}

export function internationalFixtures(cups: InternationalCup[]): DemoFixture[] {
  return cups.flatMap((cup) => [
    ...cup.fixtures,
    ...cup.rounds.flatMap((round) => round.ties.map((tie) => ({ round: 0, homeId: tie.homeId, awayId: tie.awayId, played: !!tie.winner, hg: tie.hg, ag: tie.ag, day: round.day, comp: 'intl-ko' as const, koRound: round.name, internationalCupId: cup.id, pens: tie.pens }))),
  ]);
}

export function buildInternationalKnockouts(cup: InternationalCup): InternationalCup {
  if (cup.rounds.length || !cup.fixtures.length || !cup.fixtures.every((fixture) => fixture.played)) return cup;
  const tables = GROUPS.map((group) => internationalGroupTable(cup, group));
  const pairings: [number, number, number, number][] = [[0, 1, 0, 1], [1, 0, 0, 1], [2, 3, 0, 1], [3, 2, 0, 1]];
  const ties: InternationalTie[] = pairings.map(([homeGroup, awayGroup, homeRank, awayRank], index) => ({
    id: `intl-${cup.id}-qf-${index + 1}`, homeId: tables[homeGroup][homeRank].clubId, awayId: tables[awayGroup][awayRank].clubId,
  }));
  return { ...cup, rounds: [{ name: 'Quarter-final', day: INTERNATIONAL_ROUND_DAYS['Quarter-final'], ties, played: false }] };
}

export function advanceInternationalKnockouts(cup: InternationalCup, seed: number): InternationalCup {
  if (!cup.rounds.length) return cup;
  const index = cup.rounds.length - 1;
  const round = cup.rounds[index];
  if (!round.played || !round.ties.every((tie) => !!tie.winner)) return cup;
  if (round.name === 'Final') {
    const tie = round.ties[0];
    if (!tie?.winner) return cup;
    return { ...cup, champion: tie.winner, runnerUp: tie.homeId === tie.winner ? tie.awayId : tie.homeId };
  }
  const winners = round.ties.map((tie) => tie.winner!);
  const rng = mulberry32(seed + index * 7919 + (cup.id === 'champions' ? 701 : 1701));
  for (let i = winners.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [winners[i], winners[j]] = [winners[j], winners[i]]; }
  const nextName = round.name === 'Quarter-final' ? 'Semi-final' : 'Final';
  const pairs: InternationalTie[] = [];
  for (let i = 0; i < winners.length; i += 2) if (winners[i + 1]) pairs.push({ id: `intl-${cup.id}-${nextName}-${i / 2 + 1}`, homeId: winners[i], awayId: winners[i + 1] });
  const nextRound: InternationalRound = { name: nextName, day: INTERNATIONAL_ROUND_DAYS[nextName], ties: pairs, played: false };
  return { ...cup, rounds: [...cup.rounds.map((row, i) => i === index ? { ...row, played: true } : row), nextRound] };
}

export function recordInternationalScorers(cups: InternationalCup[], cupId: InternationalCupId | undefined, lines: { playerId: string; clubId: string; goals: number }[]): InternationalCup[] {
  if (!cupId || !lines.length) return cups;
  return cups.map((cup) => {
    if (cup.id !== cupId) return cup;
    const scorers = { ...(cup.scorers ?? {}) };
    lines.forEach((line) => {
      if (!line.playerId || line.goals <= 0 || !cup.qualifiers.some((row) => row.clubId === line.clubId)) return;
      const previous = scorers[line.playerId] ?? { playerId: line.playerId, clubId: line.clubId, goals: 0 };
      scorers[line.playerId] = { ...previous, clubId: line.clubId, goals: previous.goals + Math.floor(line.goals) };
    });
    return { ...cup, scorers };
  });
}

export function recordInternationalAiScorers(cups: InternationalCup[], cupId: InternationalCupId | undefined, clubId: string, goals: number, squad: Player[], rng: () => number): InternationalCup[] {
  if (!goals || !squad.length) return cups;
  const weighted = [...squad].sort((a, b) => {
    const weight = (player: Player) => player.group === 'ST' ? 4 : player.group === 'WG' ? 3 : player.group === 'AM' ? 2.5 : player.group === 'CM' ? 1.5 : 0.8;
    return weight(b) * b.ratings.gen - weight(a) * a.ratings.gen;
  });
  const lines = Array.from({ length: Math.min(6, goals) }, () => {
    const player = weighted[Math.floor(rng() ** 2 * Math.min(8, weighted.length))];
    return { playerId: player.id, clubId, goals: 1 };
  });
  return recordInternationalScorers(cups, cupId, lines);
}

export function recordInternationalResult(cups: InternationalCup[], fixture: DemoFixture, hg: number, ag: number, seed: number): InternationalCup[] {
  if (!fixture.internationalCupId) return cups;
  return cups.map((cup) => {
    if (cup.id !== fixture.internationalCupId) return cup;
    if (fixture.comp === 'intl-grup') return { ...cup, fixtures: cup.fixtures.map((row) => row.day === fixture.day && row.homeId === fixture.homeId && row.awayId === fixture.awayId && !row.played ? { ...row, played: true, hg, ag } : row) };
    if (fixture.comp !== 'intl-ko') return cup;
    const rounds = cup.rounds.map((round) => round.day === fixture.day ? {
      ...round,
      ties: round.ties.map((tie) => tie.homeId === fixture.homeId && tie.awayId === fixture.awayId && !tie.winner ? {
        ...tie, hg, ag, pens: hg === ag, winner: hg > ag ? tie.homeId : ag > hg ? tie.awayId : mulberry32(seed + fixture.day * 97 + hg * 13 + ag * 7)() < 0.5 ? tie.homeId : tie.awayId,
      } : tie),
      played: round.ties.every((tie) => !!tie.winner || tie.homeId === fixture.homeId && tie.awayId === fixture.awayId),
    } : round);
    return { ...cup, rounds };
  });
}

export function advanceInternationalSeason(season: InternationalSeason, seed: number): InternationalSeason {
  return { ...season, cups: season.cups.map((cup) => advanceInternationalKnockouts(buildInternationalKnockouts(cup), seed + (cup.id === 'champions' ? 31 : 61))) };
}

export function archiveInternationalSeason(season: InternationalSeason): InternationalArchiveEntry[] {
  return season.cups.map((cup) => ({
    seasonNo: cup.seasonNo, cupId: cup.id, name: cup.name, champion: cup.champion ?? null, runnerUp: cup.runnerUp ?? null,
    participants: cup.qualifiers.map((row) => row.clubId),
    topScorers: Object.values(cup.scorers ?? {}).sort((a, b) => b.goals - a.goals || a.playerId.localeCompare(b.playerId)).slice(0, 10),
    groupTables: GROUPS.map((group) => ({ group, rows: internationalGroupTable(cup, group) })),
  }));
}

export function normalizeInternationalSeason(value: unknown, fallback: InternationalSeason): InternationalSeason {
  if (!value || typeof value !== 'object') return fallback;
  const parsed = value as Partial<InternationalSeason>;
  if (!Number.isInteger(parsed.seasonNo) || !Array.isArray(parsed.cups) || parsed.cups.length !== 2) return fallback;
  const ids = new Set(parsed.cups.map((cup) => cup?.id));
  if (!ids.has('champions') || !ids.has('continental')) return fallback;
  const knownClubIds = new Set([...CLUBS, ...INTERNATIONAL_CLUBS].map((club) => club.id));
  try {
    const cups = parsed.cups.map((cup) => {
      if (!cup || !cup.groups || !cup.fixtures || !Array.isArray(cup.fixtures) || !Array.isArray(cup.rounds) || !Array.isArray(cup.qualifiers)) throw new Error('invalid cup');
      const groupEntries = Object.entries(cup.groups);
      const participants = groupEntries.flatMap(([, ids]) => ids);
      if (groupEntries.length !== 4 || groupEntries.some(([group, ids]) => !GROUPS.includes(group) || !Array.isArray(ids) || ids.length !== 4)
        || participants.length !== 16 || new Set(participants).size !== 16 || participants.some((clubId) => !knownClubIds.has(clubId))) throw new Error('invalid participants');
      if (cup.fixtures.some((fixture) => fixture.internationalCupId !== cup.id)) throw new Error('fixture cup mismatch');
      return { ...cup, scorers: cup.scorers && typeof cup.scorers === 'object' ? cup.scorers : {} } as InternationalCup;
    });
    return { seasonNo: parsed.seasonNo!, cups };
  } catch { return fallback; }
}
