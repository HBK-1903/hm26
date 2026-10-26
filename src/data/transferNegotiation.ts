// Wave 11 — deterministic face-to-face negotiation and persisted sell-on clauses.
import type { SellOnClause } from '../types';

export type SellOnClauses = Record<string, SellOnClause[]>;

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function normalizeSellOnClauses(value: unknown): SellOnClauses {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: SellOnClauses = {};
  for (const [playerId, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(raw)) continue;
    const clauses = raw.flatMap((item): SellOnClause[] => {
      if (!item || typeof item !== 'object') return [];
      const row = item as Partial<SellOnClause>;
      if (typeof row.beneficiaryClubId !== 'string' || !row.beneficiaryClubId
        || !Number.isFinite(row.pct) || Number(row.pct) <= 0 || Number(row.pct) > 30
        || !Number.isFinite(row.signedFee) || !Number.isFinite(row.signedDay)) return [];
      return [{ beneficiaryClubId: row.beneficiaryClubId, pct: Number(row.pct), signedFee: Number(row.signedFee), signedDay: Number(row.signedDay) }];
    });
    if (clauses.length) result[playerId] = clauses;
  }
  return result;
}

export function withSellOnClause(current: SellOnClauses, playerId: string, clause: SellOnClause): SellOnClauses {
  const normalized = normalizeSellOnClauses(current);
  const clauses = normalized[playerId] ?? [];
  const totalPct = clauses.reduce((sum, row) => sum + row.pct, 0);
  if (totalPct + clause.pct > 50) return normalized;
  return { ...normalized, [playerId]: [...clauses, { ...clause }] };
}

export interface SellOnSettlement {
  retainedFee: number;
  totalPaid: number;
  payouts: { clubId: string; pct: number; amount: number }[];
}

/** Sell-on is paid from the gross resale fee; combined clauses are capped at 50%. */
export function calculateSellOnSettlement(grossFee: number, clauses: SellOnClause[] = []): SellOnSettlement {
  const valid = normalizeSellOnClauses({ player: clauses }).player ?? [];
  const requestedPct = valid.reduce((sum, row) => sum + row.pct, 0);
  const scale = requestedPct > 50 ? 50 / requestedPct : 1;
  const payouts = valid.map((row) => ({
    clubId: row.beneficiaryClubId,
    pct: roundMoney(row.pct * scale),
    amount: roundMoney(Math.max(0, grossFee) * row.pct * scale / 100),
  }));
  const totalPaid = roundMoney(payouts.reduce((sum, row) => sum + row.amount, 0));
  return { retainedFee: roundMoney(Math.max(0, grossFee) - totalPaid), totalPaid, payouts };
}

export interface SellerResponse {
  outcome: 'accept' | 'counter' | 'walk';
  ask: number;
  patience: number;
}

/** Seller asks are transparent, deterministic and bounded by a fixed reservation value. */
export function respondToSellerOffer(input: {
  price: number; currentAsk: number; floor: number; patience: number; offerValue: number;
}): SellerResponse {
  const { price } = input;
  const ask = Math.max(0, input.currentAsk);
  const offerValue = Math.max(0, input.offerValue);
  if (offerValue + 0.0001 >= ask) return { outcome: 'accept', ask, patience: input.patience };
  if (input.patience <= 0) {
    return offerValue + 0.0001 >= input.floor
      ? { outcome: 'accept', ask: offerValue, patience: 0 }
      : { outcome: 'walk', ask, patience: 0 };
  }
  const stepDown = Math.max(price * 0.06, (ask - offerValue) * 0.25);
  const nextAsk = Math.max(input.floor, roundMoney(ask - stepDown));
  return { outcome: 'counter', ask: nextAsk, patience: input.patience - 1 };
}

export function transferLeakRisk(input: { playerGen: number; price: number; offerValue: number; round: number }): number {
  const lowOffer = input.offerValue < input.price * 0.85 ? 18 : 0;
  const profile = input.playerGen >= 78 ? 16 : input.playerGen >= 70 ? 9 : 0;
  return Math.max(4, Math.min(65, 7 + profile + lowOffer + Math.max(0, input.round - 1) * 8));
}

function hashText(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
}

export function transferOfferLeaks(input: { seed: number; day: number; playerId: string; round: number; risk: number }): boolean {
  const hash = hashText(`${input.seed}:${input.day}:${input.playerId}:${input.round}`);
  return hash % 100 < Math.max(0, Math.min(100, input.risk));
}

export function sellOnCredit(price: number, pct: number): number {
  return roundMoney(Math.max(0, price) * Math.max(0, Math.min(30, pct)) / 100 * 0.35);
}

export function counterCashAsk(ask: number, swapValue: number, sellOnValue: number): number {
  return roundMoney(Math.max(0, ask - Math.max(0, swapValue) - Math.max(0, sellOnValue)));
}
