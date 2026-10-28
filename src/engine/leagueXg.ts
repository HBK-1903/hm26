// HM26 — C3: AI lig maçları için beklenen gol (xG) çifti.
// Skor simülasyonunu (simGoals) değiştirmeden, aynı güç/felsefe ölçeğinde ikinci bir
// saf türetim. Çağıran taraf bağımsız bir rng (fikstürden türetilmiş tohum) verdiği için
// mevcut skor determinizmi ve maç sonuçları hiç bozulmaz.
import type { CareerSettings } from '../types';

export interface XgPaceConfig {
  pace: number;   // goalPace çarpanı (0.85 / 1 / 1.18)
  jitter: number; // randomness katsayısı (0.45 / 0.7 / 0.95)
}

/** Kariyer ayarlarından simGoals ile aynı çarpanları üretir. */
export function xgConfig(settings: Pick<CareerSettings, 'goalPace' | 'randomness'>): XgPaceConfig {
  return {
    pace: settings.goalPace === 'dusuk' ? 0.85 : settings.goalPace === 'yuksek' ? 1.18 : 1,
    jitter: settings.randomness === 'low' ? 0.45 : settings.randomness === 'high' ? 0.95 : 0.7,
  };
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Güç çifti ve bağımsız rng'den [ev xG, dep xG] döndürür.
 * Formül simGoals'taki lambda iskeletiyle aynı ölçekte; fark: Poisson çekilişi yok,
 * doğrudan beklenen değer (xG = lambda) saklanır.
 */
export function fixtureXgPair(strH: number, strA: number, rng: () => number, cfg: XgPaceConfig): [number, number] {
  const base = (1.28 + (strH - strA) * 0.055 + 0.22) * cfg.pace;
  const xgH = Math.max(0.15, base + (rng() - 0.5) * 0.8 * (1 + cfg.jitter));
  const xgA = Math.max(0.12, (1.25 - base * 0.42) * cfg.pace + (rng() - 0.5) * 0.8 * (1 + cfg.jitter));
  return [round2(xgH), round2(xgA)];
}

/** Bir string'i 32-bit işaretsiz tamsayıya indirger (fikstür başına kararlı tohum için). */
export function hash32(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
