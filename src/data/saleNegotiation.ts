// Gelen teklif görüşmesi: aynı teklif ve üslup için sonuç her zaman aynıdır.
// Bu karar geçici sahne durumudur; kariyer kaydına yeni alan eklenmez.
import type { IncomingOffer } from '../types';
import { mulberry32 } from './gen';
import { transferDialogueHash, type TransferTone } from './transferPresentation';

export function evaluateIncomingCounter(input: {
  seed: number; offer: IncomingOffer; fee: number; tone?: TransferTone;
}): { accepted: boolean; chance: number } {
  const { seed, offer, fee, tone } = input;
  if (!Number.isFinite(fee) || fee < 0 || !Number.isFinite(offer.fee) || offer.fee <= 0) return { accepted: false, chance: 0 };
  // Eski, üslupsuz görüşmenin sınırları ve rastgele sayısı birebir korunur.
  if (fee <= offer.fee * 1.25) return { accepted: true, chance: 1 };
  if (!offer.negotiable || fee > offer.fee * 1.6) return { accepted: false, chance: 0 };
  const roll = mulberry32(seed + offer.day * 7 + offer.fee * 100)();
  let chance = 0.5;
  if (tone && tone !== 'calm') {
    // En fazla beş puanlık bir fark: üslup sınırda yardımcı da olabilir, ters de tepebilir.
    const direction = transferDialogueHash(`${seed}|${offer.id}|${fee}|${tone}|buyer`) % 2 ? 1 : -1;
    chance += direction * 0.05;
  }
  return { accepted: roll < chance, chance };
}

export function saleToneHints(tone: TransferTone): string[] {
  if (tone === 'calm') return ['Mevcut karar korunur', 'Ek risk yok'];
  return ['Sınırda küçük kabul şansı', 'Alıcı ters tepki verebilir'];
}
