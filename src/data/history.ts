// HM26 Aşama 4 — Kulüp arşivi (1980-2025 geçmiş tablolar)
// Tüm veri deterministik — sabit dünya tohumundan üretilen kurgu (§1.3 tekrarlanabilir).
// v2: kulüp başına bağımsız yürüyüş yerine ortak dünya matrisi; her sezon lig kapasiteleri
// tutarlıdır ve 2025'te her kulüp gerçekte bulunduğu ligde demirler (anchor).
import { Club, LeagueId } from '../types';
import { CLUBS } from './clubs';

export interface ArchiveSeason {
  year: number;          // 1980..2025 (sezon sonu yıl)
  league: LeagueId;
  rank: number;
  pts: number;
  note?: string;         // tarihçe satırı (yükselme/şampiyonluk/kuraklık)
}

const START_YEAR = 1980;
const END_YEAR = 2025;
const LEAGUES: LeagueId[] = ['zirve', 'gecit', 'kok'];
const LEAGUE_BELOW: Record<LeagueId, LeagueId | null> = { zirve: 'gecit', gecit: 'kok', kok: null };
const LEAGUE_ABOVE: Record<LeagueId, LeagueId | null> = { kok: 'gecit', gecit: 'zirve', zirve: null };
// Sabit dünya tohumu: aynı sürümde her ortamda birebir aynı arşiv
const WORLD_SEED = 0x484d_3236; // "HM26" imzalı sabit dünya tohumu

/** Kulüp kimliğinden stabil tohum */
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

interface ClubHist {
  club: Club;
  rng: () => number;
  founded: number;
  rows: ArchiveSeason[];
}

interface Movement {
  // yıl sonunda bir üst lige çıkanlar (yıl içinde alt ligde rank 1..k)
  promoted: string[];
  // yıl sonunda küme düşenler (yıl içinde üst ligde alt sıralar)
  relegated: string[];
}

let worldCache: Map<string, ArchiveSeason[]> | null = null;

/**
 * Ortak dünya tarihçesi: 2025 ligleri gerçek kulüp liglerine demirlenir, 1980'e doğru
 * sezon sonu yükselme/düşme takaslarıyla geriye yürünür. Çıktı kulüp id → artan yıllı satırlar.
 */
function buildWorldHistory(clubs: Club[]): Map<string, ArchiveSeason[]> {
  const state = new Map<string, ClubHist>();
  clubs.forEach((club) => state.set(club.id, {
    club,
    rng: mulberry32(histSeed(club.id)),
    founded: Math.max(START_YEAR, club.founded),
    rows: [],
  }));

  const worldRng = mulberry32(WORLD_SEED);
  // 2025 demir noktası: mevcut gerçek lig dağılımı (12/12/12)
  const buckets: Record<LeagueId, string[]> = { zirve: [], gecit: [], kok: [] };
  clubs.forEach((c) => buckets[c.league].push(c.id));

  const pickMany = (ids: string[], k: number): string[] => {
    const pool = [...ids];
    const out: string[] = [];
    while (out.length < k && pool.length) {
      out.push(pool.splice(Math.floor(worldRng() * pool.length), 1)[0]);
    }
    return out;
  };

  // y yılının bitişindeki hareketler (sonraki yıla geçişi tanımlar)
  const planMovement = (active: Set<string>): Movement => {
    const movement: Movement = { promoted: [], relegated: [] };
    const moved = new Set<string>(); // aynı sezonda hiçbir kulüp iki sınırda hareket etmez
    for (const upper of LEAGUES) {
      const lower = LEAGUE_BELOW[upper];
      if (!lower) continue;
      const upperActive = buckets[upper].filter((id) => active.has(id) && !moved.has(id));
      const lowerActive = buckets[lower].filter((id) => active.has(id) && !moved.has(id));
      if (!upperActive.length || !lowerActive.length) continue;
      const maxK = Math.min(2, upperActive.length, lowerActive.length);
      const k = maxK >= 2 && worldRng() < 0.35 ? 2 : 1;
      // Geriye yürüyüş: sezon sonunda yükselenler alt lige geri iner (alt ligde 1..k sıra),
      // düşenler üst lige geri çıkar (üst ligde alt sıralar).
      const promoted = pickMany(upperActive, k);
      const relegated = pickMany(lowerActive, k);
      promoted.forEach((id) => moved.add(id));
      relegated.forEach((id) => moved.add(id));
      movement.promoted.push(...promoted);
      movement.relegated.push(...relegated);
      promoted.forEach((id) => {
        buckets[upper] = buckets[upper].filter((x) => x !== id);
        buckets[lower].push(id);
      });
      relegated.forEach((id) => {
        buckets[lower] = buckets[lower].filter((x) => x !== id);
        buckets[upper].push(id);
      });
    }
    return movement;
  };

  const assignSeason = (y: number, movement: Movement) => {
    for (const lg of LEAGUES) {
      const members = buckets[lg].map((id) => state.get(id)!);
      const size = members.length;
      if (!size) continue;
      const promotedHere = movement.promoted.filter((id) => buckets[lg].includes(id));
      const relegatedHere = movement.relegated.filter((id) => buckets[lg].includes(id));
      const constrained = new Set([...promotedHere, ...relegatedHere]);
      const free = members.filter((h) => !constrained.has(h.club.id));
      // Güç temelli + rastgele sıralama (kısıtsız kulüpler)
      const freeScored = free
        .map((h) => ({ h, score: h.club.strength + (h.rng() - 0.5) * 10 }))
        .sort((a, b) => b.score - a.score)
        .map((x) => x.h);

      const rankOf = new Map<string, number>();
      promotedHere.forEach((id, i) => rankOf.set(id, i + 1));
      relegatedHere.forEach((id, i) => rankOf.set(id, size - relegatedHere.length + 1 + i));
      const reserved = new Set(rankOf.values());
      let cursor = 0;
      for (const h of freeScored) {
        while (reserved.has(cursor + 1)) cursor++;
        rankOf.set(h.club.id, ++cursor);
      }

      members.forEach((h) => {
        const rank = rankOf.get(h.club.id)!;
        const pts = Math.round((size - rank + 1) * 6 + h.rng() * 8);
        let note: string | undefined;
        if (promotedHere.includes(h.club.id)) {
          note = lg === 'zirve' ? '🏆 Şampiyon' : `⬆️ Yükselme (${lg === 'kok' ? 'Geçit' : 'Zirve'})`;
        } else if (lg === 'zirve' && rank === 1) {
          note = '🏆 Şampiyon';
        } else if (relegatedHere.includes(h.club.id)) {
          note = '⬇️ Düşüş';
        } else if (h.rng() < 0.12) {
          note = 'Kupa finalinde dramatik yenilgi.';
        } else if (h.rng() < 0.08) {
          note = 'Tarihi derbi galibiyeti.';
        }
        h.rows.push({ year: y, league: lg, rank, pts, ...(note ? { note } : {}) });
      });
    }
  };

  // incomingMovement: bir önceki iterasyonda planlanan, bu sezonu şekillendiren hareketler
  let incomingMovement: Movement = { promoted: [], relegated: [] };
  for (let y = END_YEAR; y >= START_YEAR; y--) {
    // 1) Bu sezonun satırlarını, bu yıla giriş hareketlerinin sıra kısıtlarıyla yaz
    assignSeason(y, incomingMovement);
    // 2) y → y-1 geçişini planla (sadece y-1'de var olacak kulüpler hareket eder)
    const activeNext = new Set(clubs.filter((c) => Math.max(START_YEAR, c.founded) <= y - 1).map((c) => c.id));
    incomingMovement = planMovement(activeNext);
    // 3) Kuruluş yılı y olan kulüpler bir önceki sezonda yoktu: matristen çıkar
    clubs.filter((c) => Math.max(START_YEAR, c.founded) === y).forEach((c) => {
      LEAGUES.forEach((lg) => { buckets[lg] = buckets[lg].filter((id) => id !== c.id); });
    });
  }

  const out = new Map<string, ArchiveSeason[]>();
  // Döngü 2025→1980 yürüdüğü için satırlar azalan yılda; matris sözleşmesi artan yıl olsun diye çevir
  state.forEach((h, id) => out.set(id, [...h.rows].reverse()));
  return out;
}

function worldMatrix(): Map<string, ArchiveSeason[]> {
  if (!worldCache) worldCache = buildWorldHistory(CLUBS);
  return worldCache;
}

/** Kulüp tarihçesi: en yeni sezon başta (2025 → kuruluş yılı) */
export function clubArchive(c: Club): ArchiveSeason[] {
  const rows = worldMatrix().get(c.id);
  if (!rows) return [];
  return [...rows].reverse();
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
