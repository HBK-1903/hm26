// HM26 — Dalga 6: Takım performans içgörüleri. Yeni kalıcı şema YOK; tüm çıktılar
// gerçek maç arşivinden (matchReports) türetilir. Arşiv boşsa çağıran taraf empty state gösterir.
import type { MatchArchiveEntry } from '../types';

export type MatchResult = 'W' | 'D' | 'L';

export interface MyMatch {
  day: number;
  comp: MatchArchiveEntry['comp'];
  isHome: boolean;
  oppClubId: string;
  gf: number;
  ga: number;
  xgf: number;
  xga: number;
  result: MatchResult;
}

/** Yalnız benim oynadığım, istenen sezonun maçları; takvim sırasına (gün artan) dizilir. */
export function normalizeMyMatches(
  reports: MatchArchiveEntry[],
  myClubId: string,
  seasonNo: number,
): MyMatch[] {
  return reports
    .filter((r) => r.seasonNo === seasonNo && (r.homeId === myClubId || r.awayId === myClubId))
    .sort((a, b) => a.day - b.day)
    .map((r) => {
      const isHome = r.homeId === myClubId;
      const gf = isHome ? r.hg : r.ag;
      const ga = isHome ? r.ag : r.hg;
      const xgf = isHome ? r.xgHome : r.xgAway;
      const xga = isHome ? r.xgAway : r.xgHome;
      return {
        day: r.day, comp: r.comp, isHome,
        oppClubId: isHome ? r.awayId : r.homeId,
        gf, ga, xgf, xga,
        result: gf > ga ? 'W' : gf === ga ? 'D' : 'L',
      };
    });
}

export interface TeamSplitRow {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  xgf: number;
  xga: number;
  points: number;
}

const emptyRow = (): TeamSplitRow => ({ played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, xgf: 0, xga: 0, points: 0 });

function aggregate(matches: MyMatch[]): TeamSplitRow {
  const row = emptyRow();
  for (const m of matches) {
    row.played += 1;
    row.gf += m.gf; row.ga += m.ga;
    row.xgf += m.xgf; row.xga += m.xga;
    if (m.result === 'W') { row.wins += 1; row.points += 3; }
    else if (m.result === 'D') { row.draws += 1; row.points += 1; }
    else row.losses += 1;
  }
  return row;
}

export interface TeamSplit {
  all: TeamSplitRow;
  home: TeamSplitRow;
  away: TeamSplitRow;
}

export function teamSplit(matches: MyMatch[]): TeamSplit {
  return {
    all: aggregate(matches),
    home: aggregate(matches.filter((m) => m.isHome)),
    away: aggregate(matches.filter((m) => !m.isHome)),
  };
}

/** Son N maçın sonuç şeridi: en eski → en yeni sırayla. */
export function formStrip(matches: MyMatch[], n = 10): MyMatch[] {
  return matches.slice(-n);
}

export interface GoalBuckets {
  /** Atılan gol sayısına göre maç sayısı: 0 gol / 1 gol / 2+ gol */
  scored: { zero: number; one: number; twoPlus: number };
  /** Yenilen gol sayısına göre maç sayısı */
  conceded: { zero: number; one: number; twoPlus: number };
}

const bucketOf = (values: number[]) => {
  const b = { zero: 0, one: 0, twoPlus: 0 };
  for (const v of values) {
    if (v <= 0) b.zero += 1;
    else if (v === 1) b.one += 1;
    else b.twoPlus += 1;
  }
  return b;
};

export function goalBuckets(matches: MyMatch[]): GoalBuckets {
  return {
    scored: bucketOf(matches.map((m) => m.gf)),
    conceded: bucketOf(matches.map((m) => m.ga)),
  };
}

/** Maç başına ortalama yardımcıları (ekran tek yerden biçimlesin). */
export const perMatch = (total: number, played: number, digits = 2): number =>
  played === 0 ? 0 : Math.round((total / played) * 10 ** digits) / 10 ** digits;
