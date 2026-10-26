// HM26 — GDD §4.3 sezon takvimi (2026-27) + fikstür/kupa inşası
// Gün 1 = 20 Temmuz 2026 (Pazartesi, sezon öncesi)
import { DemoFixture, LeagueId } from '../types';
import { CLUBS, clubsByLeague } from './clubs';
import { mulberry32 } from './gen';

export const SEASON_START = new Date(2026, 6, 20); // 20.07.2026 Pazartesi

export function dateFromDay(day: number): Date {
  return new Date(SEASON_START.getTime() + (day - 1) * 86400000);
}
export function dayToDate(day: number, long = true): string {
  const d = dateFromDay(day);
  return long
    ? d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })
    : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
}
export const WEEKDAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
export const weekdayOf = (day: number) => WEEKDAYS[dateFromDay(day).getDay() === 0 ? 6 : dateFromDay(day).getDay() - 1];

// §4.3 takvim tablosu: Ağustos lig başlangıcı, Eylül–Kasım kupa grupları, Ocak kış arası, Mayıs final
export const LEAGUE_ROUND_DAYS = [27, 34, 41, 48, 55, 62, 69, 76, 83, 90, 97, 104, 111, 118, 125, 132, 181, 195, 216, 244, 272, 293];
export const FRIENDLY_DAYS = [6, 13];
export const CUP_GROUP_DAYS = [51, 58, 72];
export const CUP_R16_DAY = 149;
export const CUP_QF_DAY = 223;
export const CUP_SF_DAY = 265;
export const CUP_FINAL_DAY = 300;
export const SUMMER_WINDOW: [number, number] = [1, 42];
export const ACADEMY_INTAKE_DAY = 8; // Dalga 1 (v0.5): sezon başı 20 Temmuz → 2. Pazartesi (27 Temmuz) akademi günü
export const WINTER_WINDOW: [number, number] = [167, 197];
export const WINTER_BREAK: [number, number] = [154, 180]; // ~3 hafta kış arası (§ 4.3 Ocak)

export type DayKind = 'liga' | 'kupa' | 'kupa-ko' | 'hazirlik' | 'transfer' | 'bos-gun';
export function dayKind(day: number, clubId: string, fixtures: DemoFixture[]): { kind: DayKind; fixture?: DemoFixture } {
  const fx = fixtures.find((f) => !f.played && f.day === day && (f.homeId === clubId || f.awayId === clubId));
  if (fx) return { kind: fx.comp as DayKind, fixture: fx };
  if ((day >= SUMMER_WINDOW[0] && day <= SUMMER_WINDOW[1]) || (day >= WINTER_WINDOW[0] && day <= WINTER_WINDOW[1])) return { kind: 'transfer' };
  return { kind: 'bos-gun' };
}

export function inWindow(day: number): boolean {
  return (day >= SUMMER_WINDOW[0] && day <= SUMMER_WINDOW[1]) || (day >= WINTER_WINDOW[0] && day <= WINTER_WINDOW[1]);
}

function roundRobinDays(ids: string[], league: LeagueId): DemoFixture[] {
  const n = ids.length;
  const teams = [...ids];
  const rounds: { home: string; away: string; round: number }[] = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = teams[i], b = teams[n - 1 - i];
      rounds.push({ home: r % 2 === 0 ? a : b, away: r % 2 === 0 ? b : a, round: r + 1 });
    }
    teams.splice(1, 0, teams.pop()!);
  }
  const second = rounds.map((f) => ({ home: f.away, away: f.home, round: f.round + n - 1 }));
  return [...rounds, ...second].map((f) => ({ ...f, homeId: f.home, awayId: f.away, played: false, day: LEAGUE_ROUND_DAYS[f.round - 1], comp: 'lig' as const, league }));
}

// 3 ligin tamamı
// leagueOf verilirse (sezon 2+ düşme/yükselme sonrası) onu kullanır; yoksa CLUBS lig alanı
export function buildLeagueFixtures(leagueOf?: Record<string, LeagueId>): DemoFixture[] {
  const out: DemoFixture[] = [];
  (['zirve', 'gecit', 'kok'] as LeagueId[]).forEach((l) => {
    const ids = leagueOf
      ? Object.entries(leagueOf).filter(([, x]) => x === l).map(([id]) => id)
      : clubsByLeague(l).map((c) => c.id);
    out.push(...roundRobinDays(ids, l));
  });
  return out;
}

// Sezon öncesi hazırlık maçları — §14.1 (tabloyu etkilemez; form/ritim metriği)
export function buildFriendlies(clubId: string, seed: number): DemoFixture[] {
  const rng = mulberry32(seed + 777);
  const others = CLUBS.filter((c) => c.id !== clubId);
  const o1 = others[Math.floor(rng() * others.length)];
  let o2 = others[Math.floor(rng() * others.length)];
  if (o2.id === o1.id) o2 = others[(others.indexOf(o2) + 7) % others.length];
  return [
    { round: 1, homeId: clubId, awayId: o1.id, played: false, day: FRIENDLY_DAYS[0], comp: 'hazirlik' },
    { round: 2, homeId: o2.id, awayId: clubId, played: false, day: FRIENDLY_DAYS[1], comp: 'hazirlik' },
  ];
}

export interface CupTie { id: string; homeId: string; awayId: string; hg?: number; ag?: number; pens?: boolean; winner?: string; }
export interface CupRound { name: string; day: number; ties: CupTie[]; played: boolean; }
export interface Cup {
  groups: Record<string, string[]>;                 // 'A' -> 4 clubId
  fixtures: DemoFixture[];                          // grup maçları (tek devre, §4.3)
  rounds: CupRound[];                               // KO ağacı
  champion?: string;
}

export function buildCup(seed: number): Cup {
  const rng = mulberry32(seed + 4242);
  const pool = [...CLUBS.map((c) => c.id)];
  // Tam kura — seedli karıştır
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const groups: Record<string, string[]> = {};
  for (let g = 0; g < 9; g++) groups[String.fromCharCode(65 + g)] = pool.slice(g * 4, g * 4 + 4);
  const fixtures: DemoFixture[] = [];
  Object.entries(groups).forEach(([g, ids]) => {
    // 4 takımlı tek devre round-robin → 3 maç günü (CUP_GROUP_DAYS 51/58/72)
    const pairings: [number, number][][] = [
      [[0, 1], [2, 3]],
      [[0, 2], [1, 3]],
      [[0, 3], [1, 2]],
    ];
    pairings.forEach((pairs, r) => {
      pairs.forEach(([a, b]) => {
        fixtures.push({
          round: r + 1, homeId: ids[a], awayId: ids[b], played: false,
          day: CUP_GROUP_DAYS[r], comp: 'kupa', group: g,
        });
      });
    });
  });
  return { groups, fixtures, rounds: [] };
}

// Grup tablosu (oynanana kadar boş)
export interface CupGroupRow { clubId: string; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number; }
export function cupGroupTable(cup: Cup, g: string): CupGroupRow[] {
  const map = new Map<string, CupGroupRow>();
  cup.groups[g].forEach((id) => map.set(id, { clubId: id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  cup.fixtures.filter((f) => f.group === g && f.played).forEach((f) => {
    const h = map.get(f.homeId)!; const a = map.get(f.awayId)!;
    h.p++; a.p++; h.gf += f.hg!; h.ga += f.ag!; a.gf += f.ag!; a.ga += f.hg!;
    if (f.hg! > f.ag!) { h.w++; h.pts += 3; a.l++; }
    else if (f.hg! === f.ag!) { h.d++; a.d++; h.pts++; a.pts++; }
    else { a.w++; a.pts += 3; h.l++; }
  });
  return [...map.values()].sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf);
}
