// Sözleşme pazarlığı tamamen mevcut oyuncu, kariyer günü ve tekliften türetilir.
// Hiçbir pazarlık durumu kayda eklenmez; aynı teklif aynı yanıtı üretir.
import { playerToneHints, respondToPlayerWithTone, type TransferTone } from './transferPresentation';

export const RENEWAL_YEARS = [3, 4, 5] as const;
export interface RenewalTerms { wage: number; tone: TransferTone }

/** Mevcut sistemin %15'lik maaş beklentisi ve altı aylık imza bonusu. */
export const renewalDemand = (currentWage: number): number => Math.round(currentWage * 1.15);
export const renewalBonus = (currentWage: number): number => Math.round(currentWage * 6) / 1000;

/** Teklif/üslup için aynı kararı ön izlemede ve son onayda kullanır. */
export function evaluateRenewalOffer(input: {
  currentWage: number; offeredWage: number; tone: TransferTone; seed: number; day: number; playerId: string;
}) {
  const baseDemand = renewalDemand(input.currentWage);
  // Keep the tone's small concession stable when the manager edits the wage.
  const response = respondToPlayerWithTone({
    baseDemand, offeredWage: baseDemand,
    tone: input.tone, usedDiscount: 0, alreadyTried: false,
    seed: input.seed, day: input.day, playerId: input.playerId,
  });
  return { ...response, accepted: Number.isFinite(input.offeredWage) && input.offeredWage >= response.demand };
}

export function renewalToneHints(currentWage: number, tone: TransferTone): string[] {
  return playerToneHints(renewalDemand(currentWage), 0, tone, false);
}
