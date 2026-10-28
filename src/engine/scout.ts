// HM26 — Rakip scout raporu. Yeni kalıcı şema YOK; lig fikstürlerinde saklı gerçek
// skorlardan ve güncel puan tablosundan türetilir. Rakip maçlarının xG'si arşivde
// tutulmadığı için xG alanı üretilmez — ekran dürüstçe "—" gösterir.
import type { DemoFixture, TableRow } from '../types';
import type { MatchResult } from './teamInsights';

export interface ScoutSplit {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  points: number;
}

export interface OpponentScout {
  oppClubId: string;
  /** Son 5 lig maçının sonuç şeridi: en eski → en yeni */
  form: MatchResult[];
  played: number;
  gf: number;
  ga: number;
  home: ScoutSplit;
  away: ScoutSplit;
  /** Güncel lig sıralaması; tabloda yoksa null */
  rank: number | null;
  points: number | null;
  /** Rakip xG'si kalıcı tutulmuyor: asla uydurma değer dönmez */
  xgAvailable: false;
}

const emptySplit = (): ScoutSplit => ({ played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 });

export function opponentScout(
  leagueFixtures: readonly DemoFixture[],
  oppClubId: string,
  table: readonly TableRow[],
): OpponentScout {
  const played = leagueFixtures
    .filter((f) => f.played && f.comp === 'lig' && (f.homeId === oppClubId || f.awayId === oppClubId))
    .sort((a, b) => b.day - a.day);

  const home = emptySplit();
  const away = emptySplit();
  const form: MatchResult[] = [];
  let gf = 0;
  let ga = 0;

  played.forEach((f, idx) => {
    const isHome = f.homeId === oppClubId;
    const scored = isHome ? f.hg ?? 0 : f.ag ?? 0;
    const conceded = isHome ? f.ag ?? 0 : f.hg ?? 0;
    const result: MatchResult = scored > conceded ? 'W' : scored === conceded ? 'D' : 'L';
    gf += scored; ga += conceded;
    const split = isHome ? home : away;
    split.played += 1;
    split.gf += scored; split.ga += conceded;
    if (result === 'W') { split.wins += 1; split.points += 3; }
    else if (result === 'D') { split.draws += 1; split.points += 1; }
    else split.losses += 1;
    if (idx < 5) form.push(result);
  });
  form.reverse(); // en eski → en yeni

  const tableRow = table.find((r) => r.clubId === oppClubId);
  return {
    oppClubId,
    form,
    played: played.length,
    gf, ga, home, away,
    rank: tableRow ? table.findIndex((r) => r.clubId === oppClubId) + 1 : null,
    points: tableRow ? tableRow.pts : null,
    xgAvailable: false,
  };
}
