// HM26 — Oyuncu maç günlüğü ve özet içgörüleri. Yeni kalıcı şema YOK; tüm çıktılar
// gerçek maç arşivinden (matchReports → playerRows) türetilir. Veri yoksa boş dizi/özet
// döner; çağıran ekran dürüst "—" / empty state gösterir, uydurma veri üretmez.
import type { MatchArchiveEntry } from '../types';

export interface PlayerMatchRow {
  day: number;
  seasonNo: number;
  comp: MatchArchiveEntry['comp'];
  isHome: boolean;
  oppClubId: string;
  min: number;
  g: number;
  a: number;
  yellow: number;
  red: number;
  rating: number;
}

/**
 * Oyuncunun oynadığı maçların günlüğü (en yeni önce). Yalnızca gerçek süre aldığı
 * (playerRows'ta min > 0 satırı olan) maçlar dahil edilir.
 */
export function playerMatchLog(
  playerId: string,
  reports: readonly Pick<MatchArchiveEntry, 'day' | 'seasonNo' | 'comp' | 'homeId' | 'awayId' | 'playerRows'>[],
  myClubId: string,
  limit = 5,
): PlayerMatchRow[] {
  const rows: PlayerMatchRow[] = [];
  for (const report of [...reports].sort((a, b) => (b.seasonNo ?? 0) - (a.seasonNo ?? 0) || b.day - a.day)) {
    const row = report.playerRows[playerId];
    if (!row || row.min <= 0) continue;
    const isHome = report.homeId === myClubId;
    rows.push({
      day: report.day,
      seasonNo: report.seasonNo,
      comp: report.comp,
      isHome,
      oppClubId: isHome ? report.awayId : report.homeId,
      min: row.min,
      g: row.g,
      a: row.a,
      yellow: row.yellow,
      red: row.red,
      rating: row.rating,
    });
    if (rows.length >= limit) break;
  }
  return rows;
}

export interface PlayerMatchSummary {
  played: number;
  goals: number;
  assists: number;
  yellows: number;
  reds: number;
  minutes: number;
  fullMatches: number;   // ≥80 dk — neredeyse tamamını oynadığı maçlar
  subAppearances: number; // <45 dk — oyundan alındığı/sonradan girdiği maçlar
  ratingAvg: number | null;
  goalsPer90: number | null;
  assistsPer90: number | null;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

export function summarizePlayerLog(rows: readonly PlayerMatchRow[]): PlayerMatchSummary {
  const played = rows.length;
  const acc = { goals: 0, assists: 0, yellows: 0, reds: 0, minutes: 0, fullMatches: 0, subAppearances: 0, ratingSum: 0 };
  for (const r of rows) {
    acc.goals += r.g;
    acc.assists += r.a;
    acc.yellows += r.yellow;
    acc.reds += r.red;
    acc.minutes += r.min;
    if (r.min >= 80) acc.fullMatches += 1;
    if (r.min < 45) acc.subAppearances += 1;
    acc.ratingSum += r.rating;
  }
  return {
    played,
    goals: acc.goals,
    assists: acc.assists,
    yellows: acc.yellows,
    reds: acc.reds,
    minutes: acc.minutes,
    fullMatches: acc.fullMatches,
    subAppearances: acc.subAppearances,
    ratingAvg: played ? round2(acc.ratingSum / played) : null,
    goalsPer90: acc.minutes >= 90 ? round2((acc.goals * 90) / acc.minutes) : null,
    assistsPer90: acc.minutes >= 90 ? round2((acc.assists * 90) / acc.minutes) : null,
  };
}

/** Reyting trendi için en eski → en yeni dizilim (sparkline buna göre çizilir). */
export function ratingTrend(rows: readonly PlayerMatchRow[], limit = 5): number[] {
  return [...rows].slice(0, limit).reverse().map((r) => r.rating);
}

/**
 * Gol/asist serisi: oynanan son N maçta kaç maçta ağ sarstı / asist yaptı.
 * Dönen dizi en eski → en yeni; değerler o maçın katkısı (g+a).
 */
export function contributionTrend(rows: readonly PlayerMatchRow[], limit = 5): number[] {
  return [...rows].slice(0, limit).reverse().map((r) => r.g + r.a);
}
