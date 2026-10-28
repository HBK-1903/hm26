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

// ——— C1: maç istatistik bloklarının sezonluk agregasyonu (v3+ arşiv kayıtları) ———
export interface SeasonMatchStats {
  /** İstatistik bloğu taşıyan maç sayısı; 0 ise tüm alanlar null (eski kayıtlar) */
  matches: number;
  possessionAvg: number | null;
  shotsPerMatch: number | null;
  shotsOnPerMatch: number | null;
  /** Şut isabet yüzdesi (0..100) */
  shotAccuracy: number | null;
  cornersPerMatch: number | null;
  savesPerMatch: number | null;
  pressPerMatch: number | null;
}

/**
 * Yalnız opsiyonel C1 alanlarını taşıyan arşiv kayıtlarını sayar; eski kayıtlar
 * sessizce dışlanır. Sahip olma ev/deplasman perspektifinden kulüp tarafına çevrilir.
 */
export function seasonMatchStats(reports: readonly MatchArchiveEntry[], myClubId: string, seasonNo: number): SeasonMatchStats {
  let matches = 0;
  let possSum = 0;
  let shots = 0;
  let shotsOn = 0;
  let corners = 0;
  let saves = 0;
  let press = 0;

  for (const r of reports) {
    if (r.seasonNo !== seasonNo || (r.homeId !== myClubId && r.awayId !== myClubId)) continue;
    if (typeof r.poss !== 'number' || typeof r.shotsH !== 'number') continue;
    const isHome = r.homeId === myClubId;
    matches += 1;
    possSum += isHome ? r.poss : 100 - r.poss;
    shots += isHome ? (r.shotsH ?? 0) : (r.shotsA ?? 0);
    shotsOn += isHome ? (r.shotsOnH ?? 0) : (r.shotsOnA ?? 0);
    corners += isHome ? (r.cornersH ?? 0) : (r.cornersA ?? 0);
    saves += isHome ? (r.savesH ?? 0) : (r.savesA ?? 0);
    press += isHome ? (r.pressH ?? 0) : (r.pressA ?? 0);
  }

  const avg = (v: number) => (matches ? Math.round((v / matches) * 100) / 100 : null);
  return {
    matches,
    possessionAvg: matches ? Math.round(possSum / matches) : null,
    shotsPerMatch: avg(shots),
    shotsOnPerMatch: avg(shotsOn),
    shotAccuracy: shots ? Math.round((shotsOn / shots) * 100) : null,
    cornersPerMatch: avg(corners),
    savesPerMatch: avg(saves),
    pressPerMatch: avg(press),
  };
}

// ——— v4: pozisyon grubu bazında kart disiplini (oyuncu karnelerindeki posGroup'tan) ———
export interface PositionDiscipline {
  posGroup: string;
  yellows: number;
  reds: number;
  /** 1000 dakika başına kart ağırlığı (sarı 1 + kırmızı 3); veri yoksa null */
  cardsPer1000: number | null;
  minutes: number;
}

/**
 * Yalnız myClubId kadrosuna ait oyuncu satırlarını (playerClubIds eşleşmesi) pozisyon
 * grubuna göre toplar. Eski kayıtlarda posGroup boş gelebilir; "—" grubuna yazılır.
 */
export function cardDisciplineByPosition(
  reports: readonly MatchArchiveEntry[],
  myClubId: string,
): PositionDiscipline[] {
  const acc = new Map<string, { yellows: number; reds: number; minutes: number }>();
  for (const r of reports) {
    for (const [playerId, row] of Object.entries(r.playerRows ?? {})) {
      if ((r.playerClubIds ?? {})[playerId] !== myClubId) continue;
      const key = row.posGroup || '—';
      const cur = acc.get(key) ?? { yellows: 0, reds: 0, minutes: 0 };
      cur.yellows += row.yellow;
      cur.reds += row.red;
      cur.minutes += row.min;
      acc.set(key, cur);
    }
  }
  return [...acc.entries()].map(([posGroup, v]) => ({
    posGroup,
    yellows: v.yellows,
    reds: v.reds,
    minutes: v.minutes,
    cardsPer1000: v.minutes > 0 ? Math.round(((v.yellows + v.reds * 3) / v.minutes) * 1000 * 10) / 10 : null,
  })).sort((a, b) => (b.yellows + b.reds * 3) - (a.yellows + a.reds * 3) || a.posGroup.localeCompare(b.posGroup));
}

// ——— v4: sezon kapanış özeti (seasonHistory zenginleştirmesi için) ———
export interface SeasonSummary {
  matches: number;
  xgf: number;
  xga: number;
  shotAccuracy: number | null;
  cornersPerMatch: number | null;
}

/**
 * Sezonun maç raporlarından kulüp perspektifinde özet üretir. xG tüm kayıtlarda var;
 * şut isabeti ve korner yalnız C1 bloğu taşıyan kayıtlardan ortalanır.
 */
export function seasonSummary(reports: readonly MatchArchiveEntry[], myClubId: string, seasonNo: number): SeasonSummary {
  let matches = 0;
  let xgf = 0;
  let xga = 0;
  let c1Matches = 0;
  let shots = 0;
  let shotsOn = 0;
  let corners = 0;
  for (const r of reports) {
    if (r.seasonNo !== seasonNo || (r.homeId !== myClubId && r.awayId !== myClubId)) continue;
    const isHome = r.homeId === myClubId;
    matches += 1;
    xgf += isHome ? r.xgHome : r.xgAway;
    xga += isHome ? r.xgAway : r.xgHome;
    if (typeof r.shotsH === 'number' && typeof r.poss === 'number') {
      c1Matches += 1;
      shots += isHome ? (r.shotsH ?? 0) : (r.shotsA ?? 0);
      shotsOn += isHome ? (r.shotsOnH ?? 0) : (r.shotsOnA ?? 0);
      corners += isHome ? (r.cornersH ?? 0) : (r.cornersA ?? 0);
    }
  }
  const r2 = (v: number) => Math.round(v * 100) / 100;
  return {
    matches,
    xgf: r2(xgf),
    xga: r2(xga),
    shotAccuracy: shots > 0 ? Math.round((shotsOn / shots) * 100) : null,
    cornersPerMatch: c1Matches > 0 ? r2(corners / c1Matches) : null,
  };
}
