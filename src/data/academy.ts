// Wave 12 — academy decision window, registration fees and save migration.
import type { AcademyIntake, Player } from '../types';

export function academySigningFeeM(player: Pick<Player, 'potential'>, academyLevel: number): number {
  const level = Math.max(1, Math.min(5, Math.round(academyLevel || 1)));
  return Math.round((0.05 + level * 0.03 + Math.max(0, player.potential - 60) * 0.005) * 100) / 100;
}

export interface AcademySigningDecision {
  ok: boolean;
  fee: number;
  reason?: string;
}

export function evaluateAcademySigning(input: {
  player: Pick<Player, 'potential' | 'wage'>;
  academyLevel: number;
  transferBudgetM: number;
  currentMonthlyWage: number;
  monthlyWageCap: number;
  rosterSize: number;
}): AcademySigningDecision {
  const fee = academySigningFeeM(input.player, input.academyLevel);
  if (input.rosterSize >= 30) return { ok: false, fee, reason: 'Kadro dolu (30) — önce ayrılık/satış gerekli.' };
  if (input.transferBudgetM < fee) return { ok: false, fee, reason: `Akademi kayıt bedeli ₺${fee.toFixed(2)}M için transfer bütçesi yetersiz.` };
  if (input.currentMonthlyWage + input.player.wage > input.monthlyWageCap) return { ok: false, fee, reason: 'Oyuncunun maaşı aylık bütçe tavanını aşar — Kulüp → Finans bölümünü kontrol et.' };
  return { ok: true, fee };
}

export function academyIntakeExpired(intake: Pick<AcademyIntake, 'day' | 'expiresDay'>, currentDay: number): boolean {
  return currentDay > (intake.expiresDay ?? intake.day + 10);
}

export function normalizeAcademyIntake(value: unknown): AcademyIntake | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const row = value as Partial<AcademyIntake>;
  if (!Number.isInteger(row.day) || Number(row.day) < 1 || !Number.isInteger(row.seasonNo) || Number(row.seasonNo) < 1 || !Array.isArray(row.candidates)) return undefined;
  const candidates = row.candidates.filter((item): item is Player => !!item && typeof item.id === 'string' && !!item.id
    && typeof item.name === 'string' && !!item.ratings && Number.isFinite(item.potential));
  const ids = new Set(candidates.map((item) => item.id));
  const uniqueValid = (items: unknown) => Array.isArray(items)
    ? [...new Set(items.filter((id): id is string => typeof id === 'string' && ids.has(id)))] : [];
  const signed = uniqueValid(row.signed);
  const signedSet = new Set(signed);
  const passed = uniqueValid(row.passed).filter((id) => !signedSet.has(id));
  const signingFees = row.signingFees && typeof row.signingFees === 'object'
    ? Object.fromEntries(Object.entries(row.signingFees).filter(([id, fee]) => ids.has(id) && Number.isFinite(fee) && Number(fee) >= 0).map(([id, fee]) => [id, Number(fee)]))
    : {};
  const academyLevel = Number.isFinite(row.academyLevel) ? Math.max(1, Math.min(5, Number(row.academyLevel))) : undefined;
  const expiresDay = Number.isInteger(row.expiresDay) ? Number(row.expiresDay) : Number(row.day) + 10;
  return {
    day: Number(row.day), expiresDay, seasonNo: Number(row.seasonNo), academyLevel,
    candidates, signed, passed, signingFees,
  };
}
