// HM26 Aşama 4 — Kulüp arşivi (1980-2026 geçmiş tablolar)
// Tüm veri deterministik — seed'den üretilen kurgu (§1.3 tekrarlanabilir)
import { Club, LeagueId } from '../types';

export interface ArchiveSeason {
  year: number;          // 1980..2025 (sezon sonu yıl)
  league: LeagueId;
  rank: number;
  pts: number;
  note?: string;         // tarihçe satırı (yükselme/şampiyonluk/kuraklık)
}

/** Kulüp gücünden türetilmiş yörünge + hafif rastlantısallık → tarihsel sıralama serisi */
function histSeed(clubId: string): number {
  let h = 0;
  for (let i = 0; i < clubId.length; i++) h = ((h * 31 + clubId.charCodeAt(i)) >>> 0);
  return h;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Kulüp tarihçesi: 1980'den bugüne aşağı yukarı gerçekçi bir sahte arşiv üret */
export function clubArchive(c: Club): ArchiveSeason[] {
  const rng = mulberry32(histSeed(c.id));
  const out: ArchiveSeason[] = [];
  let league: LeagueId = c.league === 'zirve' ? 'zirve' : c.league === 'gecit' ? 'gecit' : 'kok';
  // 1980'den itibaren: genç kulüpler küçük takvim
  const startYear = Math.max(1980, c.founded);
  let rankSeed = c.strength;   // temel güç yakışır son yıllara
  for (let y = startYear; y <= 2025; y++) {
    const drift = (rng() - 0.5) * 6;
    rankSeed = Math.max(42, Math.min(95, rankSeed + drift));
    // güç lig aralığında sıralama tahmini
    const tableSize = league === 'zirve' ? 12 : league === 'gecit' ? 12 : 12;
    const estRank = Math.max((0.5 + (95 - rankSeed) / 55) * tableSize, 1);
    const rank = Math.min(tableSize, Math.max(1, Math.round(estRank + (rng() - 0.5) * 4)));
    const pts = Math.round((tableSize - rank + 1) * 6 + (rng() * 8));

    let note: string | undefined;
    if (rank === 1) note = league === 'zirve' ? '🏆 Şampiyon' : league === 'gecit' ? '⬆️ Yükselme (Geçit)' : '⬆️ Yükselme (Kök)';
    else if (rank === tableSize || rank === tableSize - 1) note = '⬇️ Düşüş';
    else if (rng() < 0.12) note = 'Kupa finalinde dramatik yenilgi.';
    else if (rng() < 0.08) note = 'Tarihi derbi galibiyeti.';

    // Lig geçişleri (kurgusal olarak dengeli)
    if (rank === 1 && league !== 'zirve') league = league === 'gecit' ? 'zirve' : 'gecit';
    if (rank >= tableSize - 1 && league !== 'kok' && rng() < 0.5) league = league === 'zirve' ? 'gecit' : 'kok';

    out.push({ year: y, league, rank, pts, note });
  }
  return out.reverse();
}


/** Arşivi kulüp ekranında kompakt göster — “efsane anları” + tablo */
export function archiveSummary(c: Club): { titles: number; promotions: number; relegations: number; longestRun: string; bestYear: ArchiveSeason | null; rows: ArchiveSeason[] } {
  const rows = clubArchive(c);
  const titles = rows.filter((r) => r.rank === 1).length;
  const promotions = rows.filter((r) => r.note?.startsWith('⬆️')).length;
  const relegations = rows.filter((r) => r.note?.startsWith('⬇️')).length;
  const bestYear = rows.reduce((acc, r) => (r.rank === 1 && (!acc || r.year > acc.year) ? r : acc), null as ArchiveSeason | null);

  // en uzun kesintisiz hükümranlık (title streak)
  let longestRun = '—';
  let cur = 0;
  let best = 0;
  for (const r of rows) {
    cur = r.rank === 1 ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  if (best >= 2) longestRun = `${best} sezon üst üste şampiyonluk`;

  return { titles, promotions, relegations, longestRun, bestYear, rows };
}
