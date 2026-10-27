// HM26 — Dalga 2: Taktik Stüdyosu v2 saf kuralları (React'ten bağımsız, QA ile sınanabilir).
// Mikro-rol yok; yalnız klasik mevkiler, kondisyon tonu ve taktiksel uyum.
import type { Formation, Player, TacticPlan } from '../types';

// ——— Mevki uyumu (ekran ve test aynı kuralı kullanır) ———
/** Yuva grubu ('CB', 'FB/WB', 'DM/CM' gibi) oyuncuyu kabul eder mi? */
export function canSlotGroup(slotGroup: string, player: Pick<Player, 'group' | 'secondary'>): boolean {
  const tokens = slotGroup.split('/');
  if (player.group === 'GK') return slotGroup === 'GK';
  if (slotGroup === 'GK') return false;
  return tokens.includes(player.group) || (player.secondary ?? []).some((s) => tokens.includes(s));
}

// ——— Kondisyon halkası ———
export type FitnessTone = 'green' | 'amber' | 'red';

export interface FitnessRing {
  tone: FitnessTone;
  /** Kırmızı ton titreşimle dikkat çeker (kullanıcı reduceMotion açıksa ekran tarafında söndürülür). */
  pulse: boolean;
  label: string;
}

/** %80+ yeşil, %60-79 sarı, %60 altı kırmızı (titreşimli). */
export function fitnessRing(fitness: number): FitnessRing {
  if (fitness >= 80) return { tone: 'green', pulse: false, label: 'Formda' };
  if (fitness >= 60) return { tone: 'amber', pulse: false, label: 'Yorgun' };
  return { tone: 'red', pulse: true, label: 'Rotasyon gerekli' };
}

// ——— Taktiksel uyum ———
export const FAMILIARITY_BASE = 60;       // yeni diziliş başlangıcı
export const FAMILIARITY_PER_MATCH = 3;    // oynanan her maçta artış
export const FAMILIARITY_CAP = 99;         // tavan
/** İlk 3 maç "alışma dönemi" sayılır (ekran ipucu için). */
export const FAMILIARITY_RAMP_MATCHES = 3;

export interface Familiarity {
  /** Planın mevcut formasyonuyla kaç maç oynandı. */
  matches: number;
  /** 0-100 uyum yüzdesi. */
  percent: number;
  /** Formasyon yeni seçilmiş, alışma döneminde mi? */
  fresh: boolean;
}

/**
 * Uyum tamamen planın geriye uyumlu alanlarından türetilir; eski kayıtlarda alan yoksa taban döner.
 * Formasyon değiştiğinde familiarityFormation artık eşleşmeyeceği için sayaç doğal olarak sıfırlanır.
 */
export function tacticalFamiliarity(plan: Pick<TacticPlan, 'formation' | 'familiarityMatches' | 'familiarityFormation'>): Familiarity {
  const matches = plan.familiarityFormation === plan.formation ? (plan.familiarityMatches ?? 0) : 0;
  const percent = Math.min(FAMILIARITY_CAP, FAMILIARITY_BASE + matches * FAMILIARITY_PER_MATCH);
  return { matches, percent, fresh: matches < FAMILIARITY_RAMP_MATCHES };
}

/** Bir maç işlendikten sonra planın yeni uyum alanları (maçta kullanılan formasyon esas alınır). */
export function bumpFamiliarity(plan: TacticPlan): Pick<TacticPlan, 'familiarityMatches' | 'familiarityFormation'> {
  const sameFormation = plan.familiarityFormation === plan.formation;
  return {
    familiarityFormation: plan.formation as Formation,
    familiarityMatches: sameFormation ? (plan.familiarityMatches ?? 0) + 1 : 1,
  };
}
