// No new save fields: only detailed match reports provide the number of rated
// appearances. Background score-only AI fixtures do not create ratings.
import type { MatchArchiveEntry } from '../types';

export interface SeasonRating {
  games: number;
  average: number;
  source: 'archive' | 'legacy';
}

type RatingStats = Record<string, { apps: number; ratingSum: number }>;
type RatingReport = Pick<MatchArchiveEntry, 'seasonNo' | 'playerRows'>;

export function seasonRatings(stats: RatingStats, reports: readonly RatingReport[], seasonNo: number): Record<string, SeasonRating> {
  const totals = new Map<string, { games: number; sum: number }>();
  for (const report of reports) {
    if (report.seasonNo !== seasonNo) continue;
    for (const [id, row] of Object.entries(report.playerRows ?? {})) {
      if (!row || typeof row !== 'object' || !(row.min > 0) || !Number.isFinite(row.rating) || row.rating <= 0) continue;
      const total = totals.get(id) ?? { games: 0, sum: 0 };
      total.games++;
      total.sum += row.rating;
      totals.set(id, total);
    }
  }
  // IDs in an imported save are data, not object prototype keys.
  const result: Record<string, SeasonRating> = Object.create(null);
  for (const [id, stat] of Object.entries(stats)) {
    if (!stat || typeof stat !== 'object') continue;
    const archived = totals.get(id);
    if (archived) result[id] = { games: archived.games, average: archived.sum / archived.games, source: 'archive' };
    else if (stat.apps > 0 && Number.isFinite(stat.ratingSum) && stat.ratingSum > 0) {
      // Older saves can have aggregate ratings but no individual reports. Keep
      // their former average as an explicitly approximate legacy fallback.
      result[id] = { games: stat.apps, average: stat.ratingSum / stat.apps, source: 'legacy' };
    }
  }
  return result;
}
