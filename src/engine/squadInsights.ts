// HM26 — Dalga 3: Kadro içgörüleri. Yeni kalıcı şema YOK; tüm çıktılar mevcut kadro
// durumundan ve gerçek maç arşivinden (matchReports) türetilir. Yetersiz veride sahte
// sonuç üretilmez: trend null döner, ekran "—" gösterir.
import type { MatchArchiveEntry, Player } from '../types';
import { canSlotGroup, fitnessRing } from './tacticsStudio';

// ——— Kondisyon dağılımı (Taktik Stüdyosu ile aynı ton eşikleri) ———
export interface FitnessBreakdown {
  green: number;
  amber: number;
  red: number;
  total: number;
}

export function fitnessBreakdown(squad: Pick<Player, 'fitness'>[]): FitnessBreakdown {
  const out: FitnessBreakdown = { green: 0, amber: 0, red: 0, total: squad.length };
  for (const p of squad) {
    const tone = fitnessRing(p.fitness).tone;
    out[tone] += 1;
  }
  return out;
}

// ——— Gerçek maç reytinglerinden son form ———
/**
 * Oyuncunun son N maç reytingi (en yeni önce). Yalnız gerçekten oynadığı
 * (satırı olan) maçlar dahil edilir; veri yoksa boş dizi.
 */
export function recentRatings(
  playerId: string,
  reports: Pick<MatchArchiveEntry, 'playerRows'>[],
  limit = 5,
): number[] {
  const out: number[] = [];
  for (const r of reports) {
    const row = r.playerRows[playerId];
    if (row && row.min > 0) {
      out.push(row.rating);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export type FormTrend = 'up' | 'down' | 'flat' | null;

/**
 * Son reytinglerin ilk yarısı (yeni) ile ikinci yarısı (eski) ortalaması kıyaslanır.
 * Anlamlı fark eşiği 0.3 reyting puanı. 4 maçtan az veri varsa null (sahte trend yok).
 */
export function formTrend(ratings: number[]): FormTrend {
  if (ratings.length < 4) return null;
  const half = Math.ceil(ratings.length / 2);
  const newer = ratings.slice(0, half);
  const older = ratings.slice(half);
  const avg = (a: number[]) => a.reduce((x, v) => x + v, 0) / a.length;
  // Float toplama hatalarını temizle (örn 7.3-7.0 = 0.2999… vakası)
  const diff = Math.round((avg(newer) - avg(older)) * 100) / 100;
  if (diff >= 0.3) return 'up';
  if (diff <= -0.3) return 'down';
  return 'flat';
}

// ——— Rotasyon önerileri ———
export type AdviceKind = 'injury' | 'rest' | 'hotbench';

export interface RotationAdvice {
  kind: AdviceKind;
  playerId: string;
  /** Önerilen yedek/alternatif (mevki uyumu kanıtlanmış); yoksa undefined. */
  altId?: string;
  /** Ekranda gösterilecek Türkçe açıklama (saf kuralda üretilir, testle sabitlenir). */
  reason: string;
}

export interface AdviceInput {
  squad: Player[];
  /** Ana plan ilk 11'i: oyuncu + yuva grubu (FORMATION_SLOTS sırası). */
  xi: { playerId: string; slotGroup: string }[];
  reports: MatchArchiveEntry[];
}

const HOT_FORM = 85;          // form eşiği
const HOT_RATING = 7.5;       // son maç ortalama reyting eşiği
const FIT_ALT_MIN = 70;       // alternatif oyuncuda aranan asgari kondisyon
const MAX_HOT_BENCH = 3;

export function rotationAdvice(input: AdviceInput): RotationAdvice[] {
  const { squad, xi, reports } = input;
  const byId = new Map(squad.map((p) => [p.id, p]));
  const xiIds = new Set(xi.map((s) => s.playerId));
  const advice: RotationAdvice[] = [];

  const bestAlt = (slotGroup: string): Player | undefined =>
    squad
      .filter((p) => !xiIds.has(p.id) && p.injuredDays <= 0 && p.suspendedMatches <= 0 && p.fitness >= FIT_ALT_MIN && canSlotGroup(slotGroup, p))
      .sort((a, b) => b.ratings.gen - a.ratings.gen)[0];

  for (const slot of xi) {
    const p = byId.get(slot.playerId);
    if (!p) continue;
    const alt = bestAlt(slot.slotGroup);
    if (p.injuredDays > 0 || p.suspendedMatches > 0) {
      const why = p.injuredDays > 0 ? `sakat (${p.injuredDays}g)` : `cezalı (${p.suspendedMatches} maç)`;
      advice.push({
        kind: 'injury',
        playerId: p.id,
        altId: alt?.id,
        reason: alt
          ? `${p.name} ${why} — ${alt.name} aynı mevkiye hazır (GEN ${alt.ratings.gen}, kondi %${alt.fitness})`
          : `${p.name} ${why} — uygun yedek bulunamadı, dizilimi gözden geçir`,
      });
    } else if (p.fitness < 60) {
      advice.push({
        kind: 'rest',
        playerId: p.id,
        altId: alt?.id,
        reason: alt
          ? `${p.name} yorgun (kondi %${p.fitness}) — ${alt.name} devralabilir (kondi %${alt.fitness})`
          : `${p.name} yorgun (kondi %${p.fitness}) ama hazır bir alternatif yok`,
      });
    }
  }

  // Formda yedekler: gerçek maç reytingi veya güncel form eşiği (en fazla 3 öneri)
  const hot = squad
    .filter((p) => !xiIds.has(p.id) && p.injuredDays <= 0 && p.suspendedMatches <= 0)
    .map((p) => {
      const ratings = recentRatings(p.id, reports);
      const avg = ratings.length ? ratings.reduce((x, v) => x + v, 0) / ratings.length : 0;
      return { p, avg, rated: ratings.length, score: Math.max(p.form, avg * 10) };
    })
    .filter((h) => h.p.form >= HOT_FORM || (h.rated >= 2 && h.avg >= HOT_RATING))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_HOT_BENCH);

  for (const h of hot) {
    const basis = h.rated >= 2 && h.avg >= HOT_RATING
      ? `son ${h.rated} maç ortalaması ${h.avg.toFixed(1)}`
      : `form %${h.p.form}`;
    advice.push({ kind: 'hotbench', playerId: h.p.id, reason: `${h.p.name} formda (${basis}) — ilk 11 için şans vermeyi düşün` });
  }

  return advice;
}
