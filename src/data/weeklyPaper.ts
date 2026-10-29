// Weekly paper: a pure projection of saved scores and the existing transfer ledger.
import type { DemoFixture, MatchArchiveEntry, TransferLogEntry } from '../types';

export interface WeeklyMatch {
  id: string;
  day: number;
  comp: DemoFixture['comp'];
  homeId: string;
  awayId: string;
  hg: number;
  ag: number;
}

export interface WeeklyIssue {
  seasonNo: number;
  fromDay: number;
  toDay: number;
  /** The previous season's actual end day is not stored in old or current saves. */
  crossesUnknownSeasonBoundary: boolean;
  matches: WeeklyMatch[];
  transfers: TransferLogEntry[];
  form: (WeeklyMatch & { result: 'G' | 'B' | 'M' })[];
  lead: { kind: 'match'; match: WeeklyMatch } | { kind: 'transfer'; transfer: TransferLogEntry } | { kind: 'empty' };
}

const scoreKnown = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;
const matchKey = (comp: string, day: number, homeId: string, awayId: string) => `${comp}|${day}|${homeId}|${awayId}`;
const inCurrentSeason = (season: unknown, target: number) => Number.isInteger(season) && season === target;

export function buildWeeklyIssue(input: {
  day: number;
  seasonNo: number;
  myClubId: string;
  fixtures: readonly DemoFixture[];
  reports?: readonly MatchArchiveEntry[];
  transfers?: readonly TransferLogEntry[];
}): WeeklyIssue {
  const day = Number.isInteger(input.day) && input.day >= 1 ? input.day : 1;
  const seasonNo = Number.isInteger(input.seasonNo) && input.seasonNo >= 1 ? input.seasonNo : 1;
  const fromDay = Math.max(1, day - 6);
  const reports = (input.reports ?? []).filter((report) => inCurrentSeason(report.seasonNo, seasonNo)
    && Number.isInteger(report.day) && report.day >= 1
    && scoreKnown(report.hg) && scoreKnown(report.ag) && !!report.homeId && !!report.awayId);
  const represented = new Set<MatchArchiveEntry>();
  const representedIds = new Set<string>();
  const matches = new Map<string, WeeklyMatch>();
  const actualMatches = new Set<string>();

  // Fixtures only belong to the current season. Match reports take precedence for
  // the user's actual play day and score, including a match played after its fixture day.
  for (const fixture of input.fixtures) {
    if (!fixture.played || !Number.isInteger(fixture.day) || fixture.day < 1 || !fixture.homeId || !fixture.awayId) continue;
    const archiveId = `report-${fixture.comp}-${fixture.day}-${fixture.homeId}-${fixture.awayId}`;
    const report = reports.find((entry) => entry.id === archiveId || (entry.comp === fixture.comp && entry.day === fixture.day
      && entry.homeId === fixture.homeId && entry.awayId === fixture.awayId));
    if (report) { represented.add(report); if (report.id) representedIds.add(report.id); }
    const actualDay = report?.day ?? fixture.day;
    const hg = report?.hg ?? fixture.hg, ag = report?.ag ?? fixture.ag;
    if (actualDay > day || !scoreKnown(hg) || !scoreKnown(ag)) continue;
    const key = matchKey(fixture.comp, fixture.day, fixture.homeId, fixture.awayId);
    const actualKey = matchKey(fixture.comp, actualDay, fixture.homeId, fixture.awayId);
    if (!matches.has(key) && !actualMatches.has(actualKey)) {
      matches.set(key, { id: key, day: actualDay, comp: fixture.comp, homeId: fixture.homeId, awayId: fixture.awayId, hg, ag });
      actualMatches.add(actualKey);
    }
  }
  // An archive may survive after a fixture is unavailable in an older save.
  for (const report of reports) {
    if (report.day > day || represented.has(report) || (report.id && representedIds.has(report.id))) continue;
    const key = matchKey(report.comp, report.day, report.homeId, report.awayId);
    if (!matches.has(key) && !actualMatches.has(key)) {
      matches.set(key, { id: key, day: report.day, comp: report.comp, homeId: report.homeId, awayId: report.awayId, hg: report.hg, ag: report.ag });
      actualMatches.add(key);
    }
  }
  const ordered = [...matches.values()].sort((a, b) => b.day - a.day || a.id.localeCompare(b.id));
  const weeklyMatches = ordered.filter((match) => match.day >= fromDay);
  const transferById = new Map<string, TransferLogEntry>();
  for (const transfer of input.transfers ?? []) {
    if (!inCurrentSeason(transfer.seasonNo, seasonNo) || !Number.isInteger(transfer.day) || transfer.day < fromDay || transfer.day > day) continue;
    if (!transfer.playerName || !transfer.toClubId) continue;
    const id = transfer.id || `${transfer.day}|${transfer.playerName}|${transfer.fromClubId}|${transfer.toClubId}`;
    if (!transferById.has(id)) transferById.set(id, transfer);
  }
  const transfers = [...transferById.values()].sort((a, b) => b.day - a.day || String(a.id).localeCompare(String(b.id)));
  const form = ordered.filter((match) => match.homeId === input.myClubId || match.awayId === input.myClubId)
    .slice(0, 5).reverse().map((match) => {
      const home = match.homeId === input.myClubId;
      const gf = home ? match.hg : match.ag, ga = home ? match.ag : match.hg;
      return { ...match, result: (gf > ga ? 'G' : gf === ga ? 'B' : 'M') as 'G' | 'B' | 'M' };
    });
  const ownMatch = weeklyMatches.find((match) => match.homeId === input.myClubId || match.awayId === input.myClubId);
  const leadMatch = ownMatch ?? weeklyMatches[0];
  const lead: WeeklyIssue['lead'] = leadMatch ? { kind: 'match', match: leadMatch }
    : transfers[0] ? { kind: 'transfer', transfer: transfers[0] } : { kind: 'empty' };
  return { seasonNo, fromDay, toDay: day, crossesUnknownSeasonBoundary: seasonNo > 1 && day < 7, matches: weeklyMatches, transfers, form, lead };
}
