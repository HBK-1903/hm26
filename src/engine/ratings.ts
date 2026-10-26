// HM26 Maç Motoru §4 — Oyuncu Etkili Puanı ve pozisyon genel ağırlıkları
import { Player, PlayerRatings, PositionGroup } from '../types';

/** §4.3 Pozisyona göre genel puan ağırlıkları */
const WG: Record<PositionGroup, (r: PlayerRatings) => number> = {
  GK: (r) => 0.50 * (r.kal ?? r.gen) + 0.15 * r.men + 0.15 * r.def + 0.10 * r.tek + 0.10 * r.fiz,
  CB: (r) => 0.40 * r.def + 0.25 * r.fiz + 0.20 * r.men + 0.10 * r.tek + 0.05 * r.att,
  FB: (r) => 0.30 * r.def + 0.25 * r.fiz + 0.20 * r.tek + 0.15 * r.men + 0.10 * r.att,
  WB: (r) => 0.30 * r.def + 0.25 * r.fiz + 0.20 * r.tek + 0.15 * r.men + 0.10 * r.att,
  DM: (r) => 0.30 * r.def + 0.25 * r.tek + 0.25 * r.men + 0.15 * r.fiz + 0.05 * r.att,
  CM: (r) => 0.30 * r.tek + 0.25 * r.men + 0.20 * r.def + 0.15 * r.att + 0.10 * r.fiz,
  AM: (r) => 0.30 * r.att + 0.30 * r.tek + 0.15 * r.men + 0.15 * r.fiz + 0.10 * r.def,
  WG: (r) => 0.30 * r.att + 0.30 * r.tek + 0.15 * r.men + 0.15 * r.fiz + 0.10 * r.def,
  ST: (r) => 0.45 * r.att + 0.20 * r.tek + 0.15 * r.fiz + 0.15 * r.men + 0.05 * r.def,
};

export const positionOverall = (group: PositionGroup, r: PlayerRatings): number => WG[group](r);

/** §4.2 modifiye bantları */
export const fitnessMod = (fitness: number): number =>
  fitness >= 90 ? 1.0 : fitness >= 75 ? 0.97 : fitness >= 60 ? 0.93 : 0.88;

export const formMod = (form: number): number =>
  form >= 75 ? 1.06 : form >= 60 ? 1.03 : form >= 40 ? 1.0 : form >= 25 ? 0.97 : 0.94;

export const sharpnessMod = (sharp: number): number =>
  sharp >= 70 ? 1.0 : sharp >= 45 ? 0.97 : 0.95;

/** Pozisyon uyumu: doğal 1.00, yakın 0.97, uygunsuz 0.93, ciddi uyumsuzluk 0.86 */
export function positionMod(p: Player, slotGroup: PositionGroup): number {
  if (p.group === slotGroup) return 1.0;
  if (p.secondary.includes(slotGroup)) return 0.97;
  // Şiddet: kaleci dışı oyuncunun GK oynaması vb.
  if (p.group === 'GK' || slotGroup === 'GK') return 0.86;
  const far: Record<PositionGroup, PositionGroup[]> = {
    GK: [], CB: ['ST', 'WG', 'AM'], FB: ['ST'], WB: ['ST'], DM: ['ST'],
    CM: ['CB'], AM: ['CB'], WG: ['CB'], ST: ['CB', 'DM'],
  };
  if (far[p.group]?.includes(slotGroup) || far[slotGroup]?.includes(p.group)) return 0.86;
  return 0.93;
}

/** Maç sırası yorgunluk: canlı tüketim fitness puanı üzerine uygulanır (§6.2 updateFatigue) */
export const liveFatigueMod = (liveFitness: number): number =>
  liveFitness >= 90 ? 1.0 : liveFitness >= 75 ? 0.97 : liveFitness >= 60 ? 0.93 : 0.88;

export interface EffectivePlayerInput {
  player: Player;
  slotGroup: PositionGroup;   // forma dizilişindeki gerçek görev grubu
  liveFitness: number;        // maç içi anlık kondisyon (100'den başlar, azalır)
  tacticalMod: number;        // plan eşleşmesi (ör. kanat planında WG: 1.02)
  contextMod: number;         // ev/deplasman/derbi gibi küçük düzeltmeler
}

/** §4.1 temel formül: EffectiveGroup = Base × Fitness × Form × Sharpness × Position × Tactical × Context */
export function effectivePlayer(inp: EffectivePlayerInput): number {
  const p = inp.player;
  const base = positionOverall(inp.slotGroup, p.ratings);
  return (
    base *
    fitnessMod(p.fitness) *
    liveFatigueMod(inp.liveFitness) *
    formMod(p.form) *
    sharpnessMod(p.sharpness) *
    positionMod(p, inp.slotGroup) *
    inp.tacticalMod *
    inp.contextMod
  );
}
