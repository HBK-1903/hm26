// HM26 — Dalga 4: Sezon Ödülleri (saf hesap — qa-extended AW1)
// Veri: sezon boyu biriken playerStats (gol/asist/kart puan toplamı/maç)
import { mulberry32 } from './gen';

export interface StatLine { playerId: string; clubId: string; goals: number; assists: number; yellows: number; reds: number; ratingSum: number; apps: number }
export interface AwardRow { playerId: string; clubId: string; value: number; display: string }
export interface SeasonAwards {
  scorer: AwardRow[];   // Gol Kralı — top 3
  assist: AwardRow[];   // Asist Kralı — top 3
  mvp: AwardRow[];      // Yılın Oyuncusu — ortalama puan (en az 8 maç)
  young: AwardRow[];    // Yılın Genci — age ≤ 21, ortalama puan (en az 8 maç)
}

/** Deterministik sıralama: değer ↓, eşitlikte maç sayısı ↑, hâlâ eşitse id ↑ */
const rank = (rows: AwardRow[], appsOf: (id: string) => number): AwardRow[] =>
  rows.sort((a, b) => b.value - a.value || appsOf(b.playerId) - appsOf(a.playerId) || a.playerId.localeCompare(b.playerId)).slice(0, 3);

export function computeSeasonAwards(
  stats: Record<string, StatLine>,
  ageOf: (playerId: string) => number | null,
  minApps = 8,
): SeasonAwards | null {
  const rows = Object.values(stats).filter((r) => r.apps > 0);
  if (rows.length < 20) return null; // çok erken sezon — tören anlamsız
  const appsOf = (id: string) => stats[id]?.apps ?? 0;
  const scorer = rank(rows.filter((r) => r.goals > 0).map((r) => ({ playerId: r.playerId, clubId: r.clubId, value: r.goals, display: `${r.goals} gol` })), appsOf);
  const assist = rank(rows.filter((r) => r.assists > 0).map((r) => ({ playerId: r.playerId, clubId: r.clubId, value: r.assists, display: `${r.assists} asist` })), appsOf);
  const mvp = rank(
    rows.filter((r) => r.apps >= minApps).map((r) => ({ playerId: r.playerId, clubId: r.clubId, value: r.ratingSum / r.apps, display: `${(r.ratingSum / r.apps).toFixed(2)} ort` })),
    appsOf,
  );
  const young = rank(
    rows.filter((r) => r.apps >= minApps && (ageOf(r.playerId) ?? 99) <= 21).map((r) => ({ playerId: r.playerId, clubId: r.clubId, value: r.ratingSum / r.apps, display: `${(r.ratingSum / r.apps).toFixed(2)} ort` })),
    appsOf,
  );
  return { scorer, assist, mvp, young };
}

/** Ödül hesabının determinizm doğrulaması — testte de kullanılır */
export const awardFingerprint = (a: SeasonAwards, seed: number): string => {
  const mix = mulberry32(seed);
  void mix;
  return [a.scorer, a.assist, a.mvp, a.young].map((list) => list.map((r) => `${r.playerId}:${r.value}`).join('|')).join('#');
};
