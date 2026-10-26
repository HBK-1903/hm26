// HM26 — GDD §8/§16.3 uyumlu seedli üretim katmanı
import { LeagueId, Player, PositionGroup, PlayerRatings, Club } from '../types';
import { MALE_FIRST, SURNAME, FOREIGN_FIRST, FOREIGN_SURNAME, KEY_PLAYERS } from './names';

// Deterministik RNG (mulberry32) — aynı kariyer seed'i aynı dünyayı üretir (§16.3)
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(rng: () => number, arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// §8.2 — Pozisyona göre Genel Puan ağırlıkları (belgeyle birebir)
const W: Record<PositionGroup, { tek: number; att: number; def: number; fiz: number; men: number; kal: number }> = {
  GK: { kal: 50, men: 15, def: 15, tek: 10, fiz: 10, att: 0 },
  CB: { def: 40, fiz: 25, men: 20, tek: 10, att: 5, kal: 0 },
  FB: { def: 30, fiz: 25, tek: 20, men: 15, att: 10, kal: 0 },
  WB: { def: 30, fiz: 25, tek: 20, men: 15, att: 10, kal: 0 },
  DM: { def: 30, tek: 25, men: 25, fiz: 15, att: 5, kal: 0 },
  CM: { tek: 30, men: 25, def: 20, att: 15, fiz: 10, kal: 0 },
  AM: { att: 30, tek: 30, men: 15, fiz: 15, def: 10, kal: 0 },
  WG: { att: 30, tek: 30, men: 15, fiz: 15, def: 10, kal: 0 },
  ST: { att: 45, tek: 20, fiz: 15, men: 15, def: 5, kal: 0 },
};

export function calcGen(group: PositionGroup, r: { tek: number; att: number; def: number; fiz: number; men: number; kal: number }): number {
  const w = W[group];
  return Math.round(
    (r.tek * w.tek + r.att * w.att + r.def * w.def + r.fiz * w.fiz + r.men * w.men + r.kal * w.kal) / 100
  );
}

// §8.3 davranışı destekleyecek yaşa göre yaşam eğrisi (§8.4)
function ageCurve(age: number): number {
  if (age <= 21) return -2;    // gelişim odaklı, şimdi biraz düşük
  if (age <= 27) return 0;     // prime
  if (age <= 31) return 0;     // dengeli
  return -2;                   // 32+ gerileme eğilimi
}

const SECONDARY: Record<PositionGroup, PositionGroup[]> = {
  GK: [],
  CB: ['DM'], FB: ['WB'], WB: ['FB', 'WG'],
  DM: ['CB', 'CM'], CM: ['DM', 'AM'], AM: ['CM', 'WG'], WG: ['AM', 'ST', 'WB'], ST: ['WG', 'AM'],
};

const SQUAD_SHAPE: { group: PositionGroup; count: number }[] = [
  { group: 'GK', count: 3 },
  { group: 'CB', count: 4 },
  { group: 'FB', count: 2 },
  { group: 'WB', count: 2 },
  { group: 'DM', count: 2 },
  { group: 'CM', count: 3 },
  { group: 'AM', count: 2 },
  { group: 'WG', count: 2 },
  { group: 'ST', count: 2 },
]; // toplam 22 (§8.5: 22–23)

function foreignCount(league: string, rng: () => number): number {
  // §11.7 — Miras Zirve 4–6, Geçit 1–3, Kök 0–1
  if (league === 'zirve') return 4 + Math.floor(rng() * 3);
  if (league === 'gecit') return 1 + Math.floor(rng() * 3);
  return rng() < 0.6 ? 1 : 0;
}

export function genSquad(club: Club, careerSeed: number): Player[] {
  // Kulüp id + kariyer seed → tekrarlanabilir kadro
  let h = 0; for (const ch of club.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rng = mulberry32(careerSeed + h);
  const players: Player[] = [];
  const used = new Set<string>();
  const fCount = foreignCount(club.league, rng);
  let fLeft = fCount;

  const name = (foreign: boolean): string => {
    for (let i = 0; i < 40; i++) {
      const n = foreign ? `${pick(rng, FOREIGN_FIRST)} ${pick(rng, FOREIGN_SURNAME)}` : `${pick(rng, MALE_FIRST)} ${pick(rng, SURNAME)}`;
      if (!used.has(n)) { used.add(n); return n; }
    }
    // FIX QA-G1: fallback da benzersiz olmalı (numara çakışırsa artır)
    const base = `${pick(rng, MALE_FIRST)} ${pick(rng, SURNAME)}`;
    let n = Math.floor(rng() * 90);
    while (used.has(`${base} ${n}`)) n++;
    const cand = `${base} ${n}`;
    used.add(cand);
    return cand;
  };

  SQUAD_SHAPE.forEach((slot) => {
    for (let i = 0; i < slot.count; i++) {
      // Yaş dağılımı: ağırlıkla 17–35 (§8.5)
      const roll = rng();
      const age = roll < 0.16 ? 17 + Math.floor(rng() * 5) : roll < 0.72 ? 22 + Math.floor(rng() * 6) : roll < 0.92 ? 28 + Math.floor(rng() * 4) : 32 + Math.floor(rng() * 4);
      // Takım gücü (GK kolonu) hedefini merkeze alan puan dağılımı
      const base = clamp(club.strength + ageCurve(age) + Math.round((rng() - 0.42) * 12), 45, 92);
      const spread = () => clamp(base + Math.round((rng() - 0.5) * 10), 38, 95);
      const ratings: PlayerRatings =
        slot.group === 'GK'
          ? { gen: 0, tek: spread(), att: 0, def: spread(), fiz: spread(), men: spread(), kal: spread() }
          : { gen: 0, tek: spread(), att: spread(), def: spread(), fiz: spread(), men: spread() };
      // Pozisyona uygun dağılım: ana ağırlıklar biraz yükseltilir
      const w = W[slot.group];
      (Object.keys(w) as (keyof typeof w)[]).forEach((k) => {
        if (w[k] >= 25 && k in ratings && (ratings as any)[k] !== undefined) {
          (ratings as any)[k] = clamp((ratings as any)[k] + 4, 38, 96);
        }
      });
      ratings.gen = calcGen(slot.group, {
        tek: ratings.tek, att: ratings.att, def: ratings.def, fiz: ratings.fiz, men: ratings.men,
        kal: ratings.kal ?? 0,
      });
      const foreign = fLeft > 0 && rng() < 0.75 ? (fLeft--, true) : false;
      const potential = clamp(ratings.gen + (age <= 21 ? 8 + Math.floor(rng() * 10) : age <= 27 ? 2 + Math.floor(rng() * 5) : 0), ratings.gen, 97);
      // Maaş: gen puanından türetilmiş basit ölçek (₺bin/ay)
      // Bütçeye uyumlama: gen lineer taban + rütbe bonusu (genç=ucuz, yıldız=pahalı)
      const baseWage = ratings.gen * (club.league === 'zirve' ? 1.55 : club.league === 'gecit' ? 0.5 : 0.22);
      const wage = Math.round(baseWage + (rng() - 0.5) * baseWage * 0.25);
      players.push({
        id: `${club.id}_${slot.group}_${i}`,
        clubId: club.id, name: name(foreign), age, group: slot.group,
        side: pick(rng, slot.group === 'WG' || slot.group === 'FB' || slot.group === 'WB' ? (['L', 'R'] as const) : (['C', 'ANY'] as const)),
        secondary: SECONDARY[slot.group].slice(0, 1),
        ratings, potential, wage, foreign,
        form: clamp(55 + Math.round(rng() * 40), 35, 98),
        fitness: clamp(78 + Math.round(rng() * 22), 55, 100),
        sharpness: clamp(40 + Math.round(rng() * 50), 20, 95),
        injuredDays: 0, suspendedMatches: 0,
        contractYears: 2 + Math.floor(rng() * 3), // 2-4 yıl
        // Sistem C: rol tercihi (pozisyona grubun rol havuzundan deterministik)
        role: (() => { const grp = (['ST', 'WG'].includes(slot.group) ? 'F' : ['DM', 'CM', 'AM'].includes(slot.group) ? 'O' : ['CB', 'FB', 'WB'].includes(slot.group) ? 'D' : 'GK'); if (grp === 'GK') return undefined; const pool = PLAYER_ROLES.filter((r) => (r.group as unknown as string) === grp); return pool.length ? pool[Math.floor(rng() * pool.length)].id : undefined; })(),
      });
    }
  });

  // §8.5 — elle yazılmış 2–3 önemli oyuncu: seed havuzundan en güçlüye dönüştür
  const keys = KEY_PLAYERS[club.id] ?? [];
  keys.forEach((kp, idx) => {
    const candidates = players.filter((p) => p.group === kp.group).sort((a, b) => b.ratings.gen - a.ratings.gen);
    const target = candidates[0];
    if (!target) return;
    // FIX QA-G1: el-yazısı isim başka bir oyuncuda varsa o oyuncuya yeni isim üret
    const clash = players.find((q) => q !== target && q.name === kp.name);
    if (clash) { used.delete(clash.name); clash.name = name(clash.foreign); }
    used.add(kp.name);
    target.name = kp.name;
    target.important = true;
    target.bio = kp.bio;
    const boost = (v: number) => clamp(v + kp.ovrBoost, 38, 96);
    target.ratings.tek = boost(target.ratings.tek);
    target.ratings.att = boost(target.ratings.att);
    target.ratings.def = boost(target.ratings.def);
    target.ratings.fiz = boost(target.ratings.fiz);
    target.ratings.men = boost(target.ratings.men);
    if (target.ratings.kal !== undefined) target.ratings.kal = boost(target.ratings.kal);
    target.ratings.gen = calcGen(target.group, {
      tek: target.ratings.tek, att: target.ratings.att, def: target.ratings.def, fiz: target.ratings.fiz,
      men: target.ratings.men, kal: target.ratings.kal ?? 0,
    });
    target.form = clamp(target.form + 10, 35, 99);
    target.potential = Math.max(target.potential, target.ratings.gen);
    void idx;
  });

  return players;
}

// Takımın en iyi 11'ini 4-3-3 mantığına göre seçen basit yardımcı (prototip oto-XI)


// §11.2 — piyasa değeri (₺M): gen² × lig katsayısı × yaş katsayısı
export function playerValue(p: { ratings: { gen: number }; age: number; contractYears?: number }, league: LeagueId): number {
  // P1 (SPEC Böl.I/4): doğru bölen /100 — 75 gen Zirve oyuncusu ≈ ₺27M (₺52M tavan bütçeyle uyumlu)
  const leagueF = league === 'zirve' ? 0.42 : league === 'gecit' ? 0.16 : 0.07;
  const ageF = p.age <= 23 ? 1.45 : p.age <= 28 ? 1.10 : p.age <= 31 ? 0.80 : 0.45;
  const contractF = (p.contractYears ?? 3) <= 1 ? 0.65 : (p.contractYears ?? 3) === 2 ? 0.85 : 1.0;
  const raw = (p.ratings.gen ** 2) * leagueF * ageF * contractF;
  return Math.max(0.2, Math.round(raw) / 100);
}

// Piyasa formuyla aynı ölçekte "serbest oyuncu" üretimi (döngü seed'li — şu anki yenileme boyunca kararlı)
export function genFreeAgent(seed: number, league: LeagueId, idx: number, clubIdFor: string): Player {
  const rng = mulberry32(seed + idx * 937);
  const groups: PositionGroup[] = ['CB', 'FB', 'DM', 'CM', 'AM', 'WG', 'ST', 'GK'];
  const group = pick(rng, groups);
  const foreign = rng() < (league === 'zirve' ? 0.4 : 0.18);
  const age = clamp(Math.round(17 + rng() * 17), 17, 34);
  const gen = clamp(Math.round(52 + rng() * (league === 'zirve' ? 25 : 20)), 45, 92);
  const base = { tek: gen + Math.floor(rng() * 6) - 3, att: gen + Math.floor(rng() * 6) - 3, def: gen + Math.floor(rng() * 6) - 3, fiz: gen + Math.floor(rng() * 6) - 3, men: gen + Math.floor(rng() * 6) - 3, kal: group === 'GK' ? gen + Math.floor(rng() * 6) - 3 : 20 };
  const w = W[group];
  (Object.keys(w) as (keyof typeof w)[]).forEach((k) => { if (w[k] >= 25) (base as any)[k] = clamp((base as any)[k] + 4, 38, 96); });
  const g = calcGen(group, base);
  const ratings = { tek: base.tek, att: base.att, def: base.def, fiz: base.fiz, men: base.men, gen: g, ...(group === 'GK' ? { kal: base.kal } : {}) };
  return {
    id: `fa_${seed % 10000}_${idx}`,
    clubId: clubIdFor, age, group,
    name: foreign ? `${pick(rng, FOREIGN_FIRST)} ${pick(rng, FOREIGN_SURNAME)}` : `${pick(rng, MALE_FIRST)} ${pick(rng, SURNAME)}`,
    side: pick(rng, group === 'WG' || group === 'FB' ? (['L', 'R'] as const) : (['C', 'ANY'] as const)),
    secondary: SECONDARY[group].slice(0, 1),
    ratings, potential: clamp(g + (age <= 21 ? 8 : 0), g, 96),
    wage: Math.round(g ** 2 * 0.06), foreign,
    form: clamp(60 + Math.round(rng() * 30), 40, 95),
    fitness: clamp(75 + Math.round(rng() * 20), 60, 98),
    sharpness: clamp(45 + Math.round(rng() * 30), 35, 90),
    injuredDays: 0, suspendedMatches: 0, contractYears: 0,
  };
}

// Genç altyapı oyuncusu üretimi (emekli yerine sezon geçişinde kadroya girer)
export function genYouthRegen(club: Club, careerSeed: number, seasonNo: number, idx: number): Player {
  const rng = mulberry32(careerSeed + seasonNo * 7331 + idx * 131);
  const groups: PositionGroup[] = ['GK', 'CB', 'FB', 'DM', 'CM', 'AM', 'WG', 'ST'];
  const group = groups[idx % groups.length];
  const age = 16 + Math.floor(rng() * 3);
  const baseR = club.strength - 18 + Math.floor(rng() * 14);
  const rr = { tek: baseR, att: baseR, def: baseR, fiz: baseR - 4, men: baseR - 6, kal: group === 'GK' ? baseR : 20 };
  const w = W[group]; (Object.keys(w) as (keyof typeof w)[]).forEach((k) => { if (w[k] >= 25) (rr as any)[k] = clamp((rr as any)[k] + 5, 35, 95); });
  const g = calcGen(group, rr);
  return {
    id: `y_${club.id}_s${seasonNo}_${idx}`,
    clubId: club.id, age, group,
    name: `${pick(rng, MALE_FIRST)} ${pick(rng, SURNAME)}`,
    side: 'ANY', secondary: SECONDARY[group],
    ratings: { ...rr, gen: g, ...(group === 'GK' ? { kal: rr.kal } : {}) },
    potential: clamp(g + 9 + Math.floor(rng() * 9), g, 95),
    wage: Math.round(g ** 2 * 0.05), foreign: false,
    form: 70, fitness: 92, sharpness: 40,
    injuredDays: 0, suspendedMatches: 0, contractYears: 4,
  };
}

export function autoXI(players: Player[], formation: string) {
  const avail = [...players].filter((p) => (p.injuredDays ?? 0) <= 0 && (p.suspendedMatches ?? 0) <= 0).sort((a, b) => b.ratings.gen - a.ratings.gen);
  const byGroup = (g: PositionGroup) => avail.find((p) => p.group === g && !used.has(p.id));
  const used = new Set<string>();
  const take = (g: PositionGroup, n: number) => {
    const out: Player[] = [];
    for (let i = 0; i < n; i++) { const p = byGroup(g); if (p) { used.add(p.id); out.push(p); } }
    return out;
  };
  const gk = take('GK', 1);
  const defShape = formation.startsWith('3') ? take('CB', 3) : formation.startsWith('5') ? take('CB', 3) : take('CB', 2);
  const fbWb = formation.startsWith('3') || formation.startsWith('5') ? take('WB', 2) : take('FB', 1).concat(take('WB', 1));
  const dm = formation === '4-1-4-1' ? take('DM', 1) : formation === '4-2-3-1' ? take('DM', 1).concat(take('CM', 1)) : [];
  const cmCount = formation === '4-3-3' || formation === '3-5-2' ? 3 : formation === '4-4-2' ? 2 : formation === '5-3-2' ? 3 : 2;
  const cm = take('CM', cmCount);
  const am = formation === '4-2-3-1' ? take('AM', 1) : [];
  // FIX QA-G4: 3-5-2 kanatsız oynar (önceki sürüm WG ekleyip 12 saha oyuncusu çıkarıyordu)
  const wg = formation === '4-3-3' ? take('WG', 2) : formation === '4-2-3-1' || formation === '4-1-4-1' ? take('WG', 2) : formation === '5-3-2' || formation === '3-5-2' ? [] : take('WG', 1);
  const st = formation === '4-4-2' || formation === '3-5-2' || formation === '5-3-2' ? take('ST', 2) : take('ST', 1);
  const bench = avail.filter((p) => !used.has(p.id)).slice(0, 7);
  return { gk, defShape, fbWb, dm, cm, am, wg, st, bench };
}
/**
 * Dalga 1 (v0.5): Akademi günü — sezon başı tek günde 2–6 aday (tesis seviyesiyle ölçeklenir).
 * Kalite: regen tabanı + akademi seviyesi düzeltmesi (seviye 1 → hafif, 5 → belirgin boost).
 * Deterministik: (careerSeed, seasonNo, idx). ID'ler sezon-geçişi regenleriyle çakışmasın diye `yi_` öneki.
 */
export function genAcademyDay(club: Club, careerSeed: number, seasonNo: number, academyLevel: number): Player[] {
  const lvl = Math.max(1, Math.min(5, academyLevel));
  const count = 1 + lvl; // 2..6
  const out: Player[] = [];
  for (let i = 0; i < count; i++) {
    const base = genYouthRegen(club, careerSeed, seasonNo, i + 40); // 40 kayması: geçiş regen id alanından ayrış
    const boost = lvl - 2; // -1..+3
    const bump = (v: number) => clamp(v + boost, 30, 95);
    const w = W[base.group];
    const rr = { tek: bump(base.ratings.tek), att: bump(base.ratings.att), def: bump(base.ratings.def), fiz: bump(base.ratings.fiz), men: bump(base.ratings.men), kal: base.group === 'GK' ? bump(base.ratings.kal ?? base.ratings.gen) : 20 };
    (Object.keys(w) as (keyof typeof w)[]).forEach((k) => { if (w[k] >= 25) (rr as any)[k] = clamp((rr as any)[k] + 2, 30, 96); });
    const g = calcGen(base.group, rr);
    out.push({
      ...base,
      id: `yi_${club.id}_s${seasonNo}_${i}`,
      ratings: { ...rr, gen: g, ...(base.group === 'GK' ? { kal: rr.kal } : {}) },
      potential: clamp(g + 8 + lvl * 2, g, 96),
      wage: Math.round(g ** 2 * 0.05),
      contractYears: 4,
    });
  }
  return out.sort((a, b) => b.potential - a.potential);
}

// Sistem C — Taktiksel oyuncu rolleri (rol tercihi → taktik uyumu maç motorunda verim katkısı)
export interface RoleDef { id: string; name: string; group: PositionGroup; keys: ('fiz' | 'tek' | 'men' | 'def' | 'att')[]; suitPlan: string[] }
export const PLAYER_ROLES: RoleDef[] = [
  { id: 'st_poacher', name: 'Fırsatçı Golcü', group: 'F' as never, keys: ['att', 'tek'], suitPlan: ['hizliKontra', 'dengeli'] },
  { id: 'st_target', name: 'Hedef Santrfor', group: 'F' as never, keys: ['fiz', 'tek'], suitPlan: ['kanat', 'uzunTop'] as never },
  { id: 'st_false9', name: 'Sahte Dokuz', group: 'F' as never, keys: ['tek', 'men'], suitPlan: ['yuksekPres', 'kisaPasa'] as never },
  { id: 'wg_inverted', name: 'Ters Ayaklı Kanat', group: 'F' as never, keys: ['att', 'tek'], suitPlan: ['denge'] as never },
  { id: 'wg_winger', name: 'Klasik Çizgi Kanadı', group: 'F' as never, keys: ['fiz', 'tek'], suitPlan: ['hizliKontra', 'kanat'] as never },
  { id: 'cm_dlp', name: 'Derin Oyun Kurucu', group: 'O' as never, keys: ['tek', 'men'], suitPlan: ['kisaPasa', 'kontrol'] as never },
  { id: 'cm_b2b', name: 'İki Yönlü Orta Saha', group: 'O' as never, keys: ['fiz', 'tek', 'men'], suitPlan: ['hizliKontra', 'denge'] as never },
  { id: 'cm_anchor', name: 'Çapa / Defansif', group: 'O' as never, keys: ['def', 'fiz'], suitPlan: ['dusukBlok', 'savunmaGuven'] as never },
  { id: 'fb_att', name: 'Hücumcu Bek', group: 'D' as never, keys: ['fiz', 'tek'], suitPlan: ['hizliKontra', 'yuksekPres'] as never },
  { id: 'fb_def', name: 'Savunmacı Bek', group: 'D' as never, keys: ['def', 'fiz'], suitPlan: ['dusukBlok'] as never },
];
