// HM26 — Dalga 1 analitik katmanı: yalnız mevcut maç verisinden türetilen saf fonksiyonlar.
// Yeni kalıcı şema alanı yok (kaleci kurtarış sayısı hariç, o da opsiyonel geriye uyumlu).
// Kural: veri birikmeden uydurma tablo üretilmez; çağıran taraf maç sayısını gösterir.
import type { DemoFixture, MatchArchiveEntry } from '../types';
import type { EngineShot } from './engine';

// ——— Canlı maç: kümülatif xG zaman çizelgesi (şut günlüğünden) ———
export interface XgPoint { minute: number; home: number; away: number }

export function buildXgTimeline(shots: EngineShot[]): XgPoint[] {
  const points: XgPoint[] = [{ minute: 0, home: 0, away: 0 }];
  let home = 0;
  let away = 0;
  const sorted = [...shots].sort((a, b) => a.minute - b.minute);
  for (const shot of sorted) {
    if (shot.side === 'home') home += shot.xg;
    else away += shot.xg;
    const last = points[points.length - 1];
    if (last.minute === shot.minute) { last.home = home; last.away = away; }
    else points.push({ minute: shot.minute, home, away });
  }
  return points;
}

// ——— Poisson beklenen puan modeli ———
function poisson(k: number, lambda: number): number {
  let p = Math.exp(-Math.max(0, lambda));
  for (let i = 1; i <= k; i++) p *= Math.max(0, lambda) / i;
  return p;
}

export interface MatchExpectation { homeXp: number; awayXp: number; pHomeWin: number; pDraw: number; pAwayWin: number }

/** Tek maçın xG çifti için bağımsız Poisson skoro matrisi (0..8 gol truncation) → beklenen puanlar. */
export function expectedMatchPoints(xgHome: number, xgAway: number): MatchExpectation {
  const MAX_GOALS = 8;
  const ph: number[] = [];
  const pa: number[] = [];
  for (let k = 0; k <= MAX_GOALS; k++) {
    ph.push(poisson(k, xgHome));
    pa.push(poisson(k, xgAway));
  }
  let pHomeWin = 0;
  let pDraw = 0;
  let pAwayWin = 0;
  for (let i = 0; i <= MAX_GOALS; i++) {
    for (let j = 0; j <= MAX_GOALS; j++) {
      const prob = ph[i] * pa[j];
      if (i > j) pHomeWin += prob;
      else if (i === j) pDraw += prob;
      else pAwayWin += prob;
    }
  }
  // Truncation kuyruğunu normalize et (olasılıklar toplamı tam 1 olsun)
  const sum = pHomeWin + pDraw + pAwayWin || 1;
  pHomeWin /= sum; pDraw /= sum; pAwayWin /= sum;
  return { homeXp: 3 * pHomeWin + pDraw, awayXp: 3 * pAwayWin + pDraw, pHomeWin, pDraw, pAwayWin };
}

// ——— Sezonluk lig xPTS adalet tablosu ———
export interface XptsRow {
  clubId: string;
  matches: number;
  xgf: number;
  xga: number;
  xpts: number;
  xptsPerMatch: number;
}

/**
 * Yalnız comp==='lig' ve istenen sezon raporlarını kullanır. Bir kulüp sadece arşivde
 * görünen maçlar kadar kapsanır; hiç oynamayan kulüp dönmez (çağıran taraf "—" gösterir).
 */
export function buildXptsTable(reports: MatchArchiveEntry[], seasonNo: number): XptsRow[] {
  const acc = new Map<string, { matches: number; xgf: number; xga: number; xpts: number }>();
  const bump = (clubId: string, xgf: number, xga: number, xp: number) => {
    const cur = acc.get(clubId) ?? { matches: 0, xgf: 0, xga: 0, xpts: 0 };
    cur.matches += 1; cur.xgf += xgf; cur.xga += xga; cur.xpts += xp;
    acc.set(clubId, cur);
  };
  for (const r of reports) {
    if (r.comp !== 'lig' || r.seasonNo !== seasonNo) continue;
    const exp = expectedMatchPoints(r.xgHome, r.xgAway);
    bump(r.homeId, r.xgHome, r.xgAway, exp.homeXp);
    bump(r.awayId, r.xgAway, r.xgHome, exp.awayXp);
  }
  return [...acc.entries()].map(([clubId, v]) => ({
    clubId,
    matches: v.matches,
    xgf: round2(v.xgf),
    xga: round2(v.xga),
    xpts: round2(v.xpts),
    xptsPerMatch: round2(v.xpts / Math.max(1, v.matches)),
  })).sort((a, b) => b.xpts - a.xpts || (b.xgf - b.xga) - (a.xgf - a.xga) || a.clubId.localeCompare(b.clubId));
}

/**
 * C3: Lig genelinde fikstür xG çiftlerinden tam xPTS tablosu. Yalnız comp==='lig',
 * oynanmış ve xG'si saklı fikstürler sayılır. Eski kayıtlarda (xG yok) boş dizi döner;
 * çağıran taraf bunu görüp eski arşiv tablosuna veya "—" durumuna düşer.
 */
export function buildLeagueXptsTable(fixtures: readonly DemoFixture[]): XptsRow[] {
  const acc = new Map<string, { matches: number; xgf: number; xga: number; xpts: number }>();
  const bump = (clubId: string, xgf: number, xga: number, xp: number) => {
    const cur = acc.get(clubId) ?? { matches: 0, xgf: 0, xga: 0, xpts: 0 };
    cur.matches += 1; cur.xgf += xgf; cur.xga += xga; cur.xpts += xp;
    acc.set(clubId, cur);
  };
  for (const f of fixtures) {
    if (f.comp !== 'lig' || !f.played || typeof f.xgHome !== 'number' || typeof f.xgAway !== 'number') continue;
    const exp = expectedMatchPoints(f.xgHome, f.xgAway);
    bump(f.homeId, f.xgHome, f.xgAway, exp.homeXp);
    bump(f.awayId, f.xgAway, f.xgHome, exp.awayXp);
  }
  return [...acc.entries()].map(([clubId, v]) => ({
    clubId,
    matches: v.matches,
    xgf: round2(v.xgf),
    xga: round2(v.xga),
    xpts: round2(v.xpts),
    xptsPerMatch: round2(v.xpts / Math.max(1, v.matches)),
  })).sort((a, b) => b.xpts - a.xpts || (b.xgf - b.xga) - (a.xgf - a.xga) || a.clubId.localeCompare(b.clubId));
}

// ——— Fair Play ligi ———
export interface FairPlayRow {
  clubId: string;
  matches: number;
  fouls: number;
  yellows: number;
  reds: number;
  /** Düşük puan = centilmen. Kırmızı 3, sarı 1, faul 0.25 ağırlığında. */
  score: number;
  perMatch: number;
}

export function buildFairPlayTable(reports: MatchArchiveEntry[], seasonNo: number): FairPlayRow[] {
  const acc = new Map<string, { matches: number; fouls: number; yellows: number; reds: number }>();
  const bump = (clubId: string, fouls: number, yellows: number, reds: number) => {
    const cur = acc.get(clubId) ?? { matches: 0, fouls: 0, yellows: 0, reds: 0 };
    cur.matches += 1; cur.fouls += fouls; cur.yellows += yellows; cur.reds += reds;
    acc.set(clubId, cur);
  };
  for (const r of reports) {
    if (r.comp !== 'lig' || r.seasonNo !== seasonNo) continue;
    bump(r.homeId, r.foulsHome, r.yellowsHome, r.redsHome);
    bump(r.awayId, r.foulsAway, r.yellowsAway, r.redsAway);
  }
  return [...acc.entries()].map(([clubId, v]) => {
    const score = v.yellows + v.reds * 3 + v.fouls * 0.25;
    return {
      clubId, matches: v.matches, fouls: v.fouls, yellows: v.yellows, reds: v.reds,
      score: round2(score), perMatch: round2(score / Math.max(1, v.matches)),
    };
  }).sort((a, b) => a.perMatch - b.perMatch || a.score - b.score || a.clubId.localeCompare(b.clubId));
}

/** Kaleci kurtarış yüzdesi: kurtarış / (kurtarış + yenilen gol). Veri yoksa null. */
export function goalkeeperSaveRate(saves: number | undefined, conceded: number | undefined): number | null {
  const s = saves ?? 0;
  const c = conceded ?? 0;
  const faced = s + c;
  if (faced === 0) return null;
  return Math.round((s / faced) * 1000) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
