// HM26 — transfer sahnesi için saf, kayda yeni alan eklemeyen kararlar.
import { respondToSellerOffer, type SellerResponse } from './transferNegotiation';

export type TransferTone = 'calm' | 'witty' | 'firm';
export type TransferReveal = 'press' | 'stadium' | 'star';

/** Bonservisten bağımsız: serbest bir 85 GEN oyuncu da yıldız sunumu alır. */
export function transferRevealForGen(gen: number): TransferReveal {
  if (!Number.isFinite(gen) || gen < 80) return 'press';
  return gen >= 85 ? 'star' : 'stadium';
}

const floorMoney = (n: number) => Math.floor((Math.max(0, n) + 1e-8) * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));

/** Aynı kariyer, tur ve teklif için tekrar açmada sonuç değişmez. */
export function transferDialogueHash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

export interface SellerToneInput {
  price: number;
  currentAsk: number;
  floor: number;
  patience: number;
  offerValue: number;
  tone: TransferTone;
  usedDiscount: number;
  usedExtraPatience: boolean;
  seed: number;
  day: number;
  playerId: string;
  round: number;
}
export interface SellerToneResult extends SellerResponse {
  discount: number;
  usedDiscount: number;
  extraPatience: number;
  usedExtraPatience: boolean;
}

/**
 * Mevcut satıcı motorunun yanıtını temel alır. Sözler yalnızca karşı teklifi
 * küçük ölçüde etkiler; kümülatif indirim piyasa değerinin %3'ünü geçmez ve
 * satıcının tabanı korunur. İlave sabır kaybı bir görüşmede en fazla birdir.
 * Kabul / masadan kalkma sonuçları diyalogla zorla değiştirilmez.
 */
export function respondToSellerWithTone(input: SellerToneInput): SellerToneResult {
  const base = respondToSellerOffer(input);
  const price = Math.max(0, Number.isFinite(input.price) ? input.price : 0);
  const cap = floorMoney(price * 0.03);
  const previous = floorMoney(clamp(input.usedDiscount, 0, cap));
  const initial: SellerToneResult = {
    ...base, discount: 0, usedDiscount: previous, extraPatience: 0,
    usedExtraPatience: !!input.usedExtraPatience,
  };
  if (base.outcome !== 'counter' || input.tone === 'calm' || !price) return initial;

  const roll = transferDialogueHash(`${input.seed}|${input.day}|${input.playerId}|${input.round}|${input.offerValue}|${input.tone}|seller`) % 100;
  const success = roll < (input.tone === 'witty' ? 60 : 75);
  const risk = input.tone === 'witty' ? roll >= 85 : roll >= 40;
  const extraPatience = risk && !input.usedExtraPatience && base.patience > 0 ? 1 : 0;
  // Halihazırdaki motordan daha düşük teklif sunma ve tabanın altına düşme.
  const minimum = Math.max(Math.max(0, input.floor), Math.min(Math.max(0, input.offerValue), base.ask));
  const room = floorMoney(Math.max(0, base.ask - minimum));
  const remaining = floorMoney(Math.max(0, cap - previous));
  const target = floorMoney(price * (input.tone === 'witty' ? 0.01 : 0.02));
  const discount = success ? floorMoney(Math.min(room, remaining, target)) : 0;
  return {
    outcome: base.outcome,
    ask: floorMoney(Math.max(minimum, base.ask - discount)),
    patience: Math.max(0, base.patience - extraPatience),
    discount,
    usedDiscount: floorMoney(previous + discount),
    extraPatience,
    usedExtraPatience: !!input.usedExtraPatience || extraPatience > 0,
  };
}

export function sellerToneHints(input: Omit<SellerToneInput, 'tone'>, tone: TransferTone): string[] {
  if (tone === 'calm') return ['Ek sabır riski yok'];
  const base = respondToSellerOffer(input);
  const cap = floorMoney(Math.max(0, input.price) * 0.03);
  const minimum = Math.max(Math.max(0, input.floor), Math.min(Math.max(0, input.offerValue), base.ask));
  const target = floorMoney(Math.max(0, input.price) * (tone === 'witty' ? 0.01 : 0.02));
  const canDiscount = base.outcome === 'counter' && target >= 0.01 && cap > input.usedDiscount && base.ask - minimum >= 0.01;
  const canRisk = base.outcome === 'counter' && base.patience > 0 && !input.usedExtraPatience;
  const hints: string[] = [];
  if (canDiscount) hints.push('Küçük indirim ihtimali');
  if (canRisk) hints.push(tone === 'firm' ? 'Daha yüksek sabır riski' : 'Sabır riski');
  return hints.length ? hints : ['Bu tur ek etki yok'];
}

export interface PlayerToneInput {
  baseDemand: number;
  offeredWage: number;
  usedDiscount: number;
  tone: TransferTone;
  alreadyTried: boolean;
  seed: number;
  day: number;
  playerId: string;
}
export interface PlayerToneResult {
  demand: number;
  accepted: boolean;
  discount: number;
  usedDiscount: number;
}

/** Maaşlar bin/ay ve tam sayıdır; her üslup en fazla bir kez etkide bulunur. */
export function respondToPlayerWithTone(input: PlayerToneInput): PlayerToneResult {
  const base = Math.max(0, Math.round(Number.isFinite(input.baseDemand) ? input.baseDemand : 0));
  const cap = Math.floor(base * 0.03 + 1e-8);
  const previous = Math.floor(clamp(input.usedDiscount, 0, cap));
  const roll = transferDialogueHash(`${input.seed}|${input.day}|${input.playerId}|${input.offeredWage}|${input.tone}|player`) % 100;
  const chance = input.tone === 'witty' ? 60 : input.tone === 'firm' ? 70 : 0;
  const target = Math.floor(base * (input.tone === 'witty' ? 0.01 : input.tone === 'firm' ? 0.02 : 0));
  const discount = !input.alreadyTried && roll < chance ? Math.min(Math.max(0, cap - previous), target) : 0;
  const usedDiscount = previous + discount;
  const demand = base - usedDiscount;
  return { demand, accepted: Number.isFinite(input.offeredWage) && input.offeredWage >= demand, discount, usedDiscount };
}

export function playerToneHints(baseDemand: number, usedDiscount: number, tone: TransferTone, alreadyTried: boolean): string[] {
  if (tone === 'calm') return ['Ek risk yok'];
  const base = Math.max(0, Math.round(baseDemand));
  const cap = Math.floor(base * 0.03 + 1e-8);
  const target = Math.floor(base * (tone === 'witty' ? 0.01 : 0.02));
  if (alreadyTried || cap <= usedDiscount || !target) return ['Bu üslupta ek indirim kalmadı'];
  return ['Küçük ücret indirimi ihtimali', 'Beklenti değişmeyebilir'];
}
