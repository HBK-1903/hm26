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

// ——— Maç maç xG trendi (beklenen vs gerçek performans) ———
export interface XgTrendPoint {
  day: number;
  comp: MyMatch['comp'];
  oppClubId: string;
  isHome: boolean;
  xgf: number;
  gf: number;
  xga: number;
  ga: number;
}

/** Normalize edilmiş maçlardan en eski → en yeni xG/gol çizelgesi. */
export function xgTrend(matches: MyMatch[]): XgTrendPoint[] {
  return matches.map((m) => ({
    day: m.day, comp: m.comp, oppClubId: m.oppClubId, isHome: m.isHome,
    xgf: m.xgf, gf: m.gf, xga: m.xga, ga: m.ga,
  }));
}

export interface XgVerdict {
  /** Atılan gol − beklenen gol: pozitifse bitiricilikte şanslı/iyi, negatifse hakkı yeniyor. */
  finishingDelta: number;
  /** Yenilen gol − beklenen yenilen: pozitifse savunma/kaleci beklenenden çok gol yedi. */
  defensiveDelta: number;
  label: 'over' | 'under' | 'neutral';
  text: string;
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/** En az 3 maçlık örneklemde xG karşılaştırması; az veri varsa label nötr kalır (sahte yargı yok). */
export function xgVerdict(matches: MyMatch[]): XgVerdict | null {
  if (matches.length < 3) return null;
  const sum = matches.reduce(
    (acc, m) => ({ xgf: acc.xgf + m.xgf, gf: acc.gf + m.gf, xga: acc.xga + m.xga, ga: acc.ga + m.ga }),
    { xgf: 0, gf: 0, xga: 0, ga: 0 },
  );
  const finishingDelta = round1(sum.gf - sum.xgf);
  const defensiveDelta = round1(sum.ga - sum.xga);
  const label: XgVerdict['label'] = finishingDelta >= 2 ? 'over' : finishingDelta <= -2 ? 'under' : 'neutral';
  const text = label === 'over'
    ? `Beklenenden ${finishingDelta} fazla gol attın — bitiricilik ve şans şu an lehine.`
    : label === 'under'
      ? `xG'ne göre ${Math.abs(finishingDelta)} gol eksiktesin — pozisyonlar geliyor ama sonuç gelmiyor.`
      : 'Atılan goller beklenen golle dengeli; performansın istatistiğe yansıyor.';
  return { finishingDelta, defensiveDelta, label, text };
}

// ——— Birebir rakip eşleşme geçmişi (H2H) ———
export interface H2hMeeting {
  day: number;
  seasonNo: number;
  comp: MatchArchiveEntry['comp'];
  isHome: boolean;
  gf: number;
  ga: number;
  xgf: number;
  xga: number;
  result: MatchResult;
}

export interface HeadToHead {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  xgf: number;
  xga: number;
  meetings: H2hMeeting[]; // en yeni önce
}

/** İki kulüp arasındaki tüm arşiv maçlarını benim kulüp perspektifimden özetler. */
export function headToHead(reports: readonly MatchArchiveEntry[], myClubId: string, oppClubId: string, limit = 5): HeadToHead {
  const empty: HeadToHead = { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, xgf: 0, xga: 0, meetings: [] };
  const pair = reports
    .filter((r) => (r.homeId === myClubId && r.awayId === oppClubId) || (r.homeId === oppClubId && r.awayId === myClubId))
    .sort((a, b) => b.day - a.day || b.seasonNo - a.seasonNo);
  if (!pair.length) return empty;
  for (const r of pair) {
    const isHome = r.homeId === myClubId;
    const gf = isHome ? r.hg : r.ag;
    const ga = isHome ? r.ag : r.hg;
    empty.played += 1;
    empty.gf += gf; empty.ga += ga;
    empty.xgf += isHome ? r.xgHome : r.xgAway;
    empty.xga += isHome ? r.xgAway : r.xgHome;
    const result: MatchResult = gf > ga ? 'W' : gf === ga ? 'D' : 'L';
    if (result === 'W') empty.wins += 1;
    else if (result === 'D') empty.draws += 1;
    else empty.losses += 1;
    if (empty.meetings.length < limit) {
      empty.meetings.push({
        day: r.day, seasonNo: r.seasonNo, comp: r.comp, isHome, gf, ga,
        xgf: isHome ? r.xgHome : r.xgAway,
        xga: isHome ? r.xgAway : r.xgHome,
        result,
      });
    }
  }
  return empty;
}
