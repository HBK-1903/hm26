// Kariyer hikâyesi: yalnız mevcut maç, transfer ve kupa kayıtlarının salt okunur görünümü.
import type { Career, MatchArchiveEntry, TransferLogEntry } from '../types';
import { clubByIdSafe } from './clubs';

type Trophy = NonNullable<Career['trophyCabinet']>[number];
export type CareerMoment =
  | { kind: 'match'; key: string; seasonNo: number | null; day: number; report: MatchArchiveEntry; reason: string }
  | { kind: 'transfer'; key: string; seasonNo: number | null; day: number; transfer: TransferLogEntry }
  | { kind: 'trophy'; key: string; seasonNo: number | null; day: null; trophy: Trophy };
export interface CareerChapter { seasonNo: number; label: string; dated: CareerMoment[]; undated: CareerMoment[] }
export interface CareerTimeline { chapters: CareerChapter[]; unplaced: CareerMoment[]; total: number }

const validDay = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 1;
const validSeason = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 1;
const validScore = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;
export const careerSeasonLabel = (seasonNo: number) => `${2025 + seasonNo}–${String(26 + seasonNo).padStart(2, '0')}`;

/** Kupa dolabı yalnız sezon metnini saklar; uydurma bir kazanılma günü çıkarılmaz. */
function seasonFromTrophy(season: unknown): number | null {
  if (typeof season !== 'string') return null;
  const match = /^(\d{4})[–-](\d{2}|\d{4})$/.exec(season.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const ending = Number(match[2]);
  const validEnding = match[2].length === 2 ? ending === (year + 1) % 100 : ending === year + 1;
  const number = year - 2025;
  return number >= 1 && validEnding ? number : null;
}

function matchReason(report: MatchArchiveEntry): string | null {
  const home = clubByIdSafe(report.homeId), away = clubByIdSafe(report.awayId);
  const derby = !!home && !!away && ((home.rivalIds ?? []).includes(away.id) || (away.rivalIds ?? []).includes(home.id));
  if (derby) return 'Derbi';
  if (report.comp === 'intl-ko') return 'Kıta kupası elemesi';
  if (report.comp === 'intl-grup') return 'Kıta kupası maçı';
  if (report.comp === 'kupa-ko') return 'Kupa elemesi';
  if (Math.abs(report.hg - report.ag) >= 3) return 'Farklı skor';
  if (report.hg + report.ag >= 5) return 'Gollü maç';
  return null;
}

/**
 * Aynı sezon/gün/karşılaşma veya aynı maç id'si tekrar sayılmaz. Son kayıt ve
 * arşivdeki en eski kayıt da gösterilir; 256 maç sınırı nedeniyle "ilk maç" denmez.
 * Sezonu veya kupa günü bilinmeyen kayıtların gerçek maç/transfer sırası uydurulmaz.
 */
export function buildCareerTimeline(input: {
  seasonNo: number; day: number;
  reports?: readonly MatchArchiveEntry[] | null;
  transfers?: readonly TransferLogEntry[] | null;
  trophies?: readonly Trophy[] | null;
}): CareerTimeline {
  const currentSeason = validSeason(input.seasonNo) ? input.seasonNo : 1;
  const currentDay = validDay(input.day) ? input.day : 1;
  const entries: CareerMoment[] = [];
  const reportIds = new Set<string>(), reportFacts = new Set<string>();
  const reports: MatchArchiveEntry[] = [];
  for (const report of input.reports ?? []) {
    if (!report || !validDay(report.day) || !validScore(report.hg) || !validScore(report.ag) || !report.homeId || !report.awayId) continue;
    const season = validSeason(report.seasonNo) ? report.seasonNo : null;
    if (season && (season > currentSeason || (season === currentSeason && report.day > currentDay))) continue;
    const prefix = season ?? 'unknown';
    const id = report.id ? `${prefix}|${report.id}` : '';
    const fact = `${prefix}|${report.day}|${report.comp}|${report.homeId}|${report.awayId}`;
    if ((id && reportIds.has(id)) || reportFacts.has(fact)) continue;
    if (id) reportIds.add(id);
    reportFacts.add(fact);
    reports.push(report);
  }
  // Only known seasons can be compared chronologically; unknown-season records stay unplaced.
  const knownReports = reports.filter((report) => validSeason(report.seasonNo))
    .slice().sort((a, b) => b.seasonNo - a.seasonNo || b.day - a.day);
  const newest = knownReports[0], oldest = knownReports[knownReports.length - 1];
  for (const report of reports) {
    const reason = matchReason(report);
    if (!reason && report !== newest && report !== oldest && validSeason(report.seasonNo)) continue;
    const seasonNo = validSeason(report.seasonNo) ? report.seasonNo : null;
    entries.push({ kind: 'match', key: `match|${seasonNo ?? '?'}|${report.id || `${report.day}|${report.comp}|${report.homeId}|${report.awayId}`}`, seasonNo, day: report.day, report, reason: reason ?? 'Kayıtlı maç' });
  }
  const transferIds = new Set<string>();
  for (const transfer of input.transfers ?? []) {
    if (!transfer || !validDay(transfer.day) || !transfer.playerName || !transfer.toClubId) continue;
    const seasonNo = validSeason(transfer.seasonNo) ? transfer.seasonNo : null;
    if (seasonNo && (seasonNo > currentSeason || (seasonNo === currentSeason && transfer.day > currentDay))) continue;
    const key = `transfer|${seasonNo ?? '?'}|${transfer.id || `${transfer.day}|${transfer.playerName}|${transfer.fromClubId}|${transfer.toClubId}`}`;
    if (transferIds.has(key)) continue;
    transferIds.add(key);
    entries.push({ kind: 'transfer', key, seasonNo, day: transfer.day, transfer });
  }
  const trophyIds = new Set<string>();
  for (const trophy of input.trophies ?? []) {
    if (!trophy || !trophy.title) continue;
    const seasonNo = seasonFromTrophy(trophy.season);
    if (seasonNo && seasonNo > currentSeason) continue;
    const key = `trophy|${trophy.season ?? '?'}|${trophy.type}|${trophy.title}`;
    if (trophyIds.has(key)) continue;
    trophyIds.add(key);
    entries.push({ kind: 'trophy', key, seasonNo, day: null, trophy });
  }
  const seasonNumbers = Array.from(new Set(entries.flatMap((entry) => entry.seasonNo ? [entry.seasonNo] : []))).sort((a, b) => b - a);
  const chapters = seasonNumbers.map((seasonNo): CareerChapter => ({
    seasonNo, label: careerSeasonLabel(seasonNo),
    dated: entries.filter((entry) => entry.seasonNo === seasonNo && entry.day !== null)
      .sort((a, b) => (b.day ?? 0) - (a.day ?? 0) || a.key.localeCompare(b.key)),
    undated: entries.filter((entry) => entry.seasonNo === seasonNo && entry.day === null),
  }));
  return { chapters, unplaced: entries.filter((entry) => entry.seasonNo === null), total: entries.length };
}
