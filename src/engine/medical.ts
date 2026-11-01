// HM26 v0.9.10 — saf sağlık hesapları (store/UI/QA ortak kaynağı)
import { mulberry32 } from '../data/gen';
import type { Player } from '../types';

export const CLINIC_COST_M = 0.3;       // transfer bütçesi ₺M ölçeğinde = ₺300.000
export const CLINIC_DAYS_REDUCED = 14;

/** Avrupa Kliniği: gün sayacı 0'a iner ama negatif olmaz; sıfır tedavinin bittiğini gösterir. */
export function clinicRemainingDays(currentDays: number): number {
  return Math.max(0, Math.floor(currentDays) - CLINIC_DAYS_REDUCED);
}

/** İğne kumarı: seed deterministik, %25 alevlenme; alevlenme olursa ek 14–42 gün. */
export function needleOutcome(seed: number): { aggravated: boolean; extraDays: number } {
  const rng = mulberry32(seed);
  const aggravated = rng() < 0.25;
  return { aggravated, extraDays: aggravated ? 14 + Math.floor(rng() * 29) : 0 };
}

/** Saved approval for a healed, sold or unknown player cannot affect a new match. */
export function activeRiskPlayIds(ids: readonly string[] | undefined, squad: readonly Pick<Player, 'id' | 'injuredDays' | 'injury'>[]): string[] {
  const injured = new Set(squad.filter((player) => player.injuredDays > 0 && player.injury?.canPlayWithRisk !== false).map((player) => player.id));
  return [...new Set(ids ?? [])].filter((id) => injured.has(id));
}
