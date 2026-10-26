// HM26 — Dalga 1 P0: Haftalık antrenman sistemi (saf fonksiyonlar, test edilebilir)
// Odak alanı × haftalık yoğunluk × tesis antrenman seviyesi → kalıcı rating gelişimi (playerPatch.ratings)
import { Player, PlayerInjury, PositionGroup } from '../types';
import { mulberry32, calcGen } from './gen';

export type TrainingArea = 'Teknik' | 'Hücum' | 'Defans' | 'Fizik' | 'Zekâ';
export type TrainingIntensity = 'hafif' | 'normal' | 'yogun';
export interface TrainingFocus { area: TrainingArea; intensity: TrainingIntensity; sinceDay: number }

export const TRAINING_AREAS: TrainingArea[] = ['Teknik', 'Hücum', 'Defans', 'Fizik', 'Zekâ'];
export const INTENSITIES: { id: TrainingIntensity; name: string; desc: string }[] = [
  { id: 'hafif', name: 'Hafif', desc: 'Düşük yük — gelişim yavaş, toparlanma hızlı' },
  { id: 'normal', name: 'Normal', desc: 'Dengeli yük — standart gelişim ritmi' },
  { id: 'yogun', name: 'Yoğun', desc: 'Ağır yük — hızlı gelişim, fitness bedeli ve hafif sakatlık riski' },
];

/** Odak alanı → birincil rating anahtarı (gruba göre) */
const keyOf = (area: TrainingArea, group: PositionGroup): 'tek' | 'att' | 'def' | 'fiz' | 'men' | 'kal' => {
  if (group === 'GK') return area === 'Zekâ' ? 'men' : area === 'Fizik' ? 'fiz' : 'kal';
  switch (area) {
    case 'Teknik': return 'tek';
    case 'Hücum': return 'att';
    case 'Defans': return 'def';
    case 'Fizik': return 'fiz';
    case 'Zekâ': return 'men';
  }
};

export interface TrainingWeekResult {
  /** playerId → patch parçası (uygulanacak) */
  patches: Record<string, Partial<Player>>;
  noteLines: string[];
  improved: number;
  strained: number;
}

/**
 * Bir haftalık antrenmanı kadroya uygular. Deterministik (mulberry32(careerSeed + day*97)).
 * - Genç oyuncu (≤23) ana gelişim motorudur; 24–28 sınırlı; 29+ neredeyse statik (hafif koruma)
 * - Yoğunluk: gelişim şansı × fitness bedeli × küçük sakatlanma riski dengeler
 * - Antrenman tesis seviyesi (1–5) gelişim şansını ve yoğunluk hasasını yumuşatır
 */
export function applyTrainingWeek(
  players: Player[],
  focus: TrainingFocus,
  trainingFacility: number,
  careerSeed: number,
  day: number,
): TrainingWeekResult {
  const rng = mulberry32(careerSeed * 1000003 + day * 97 + 13);
  const patches: Record<string, Partial<Player>> = {};
  const noteLines: string[] = [];
  let improved = 0, strained = 0;

  const fac = Math.max(1, Math.min(5, trainingFacility));
  // Gelişim tabanı: sezonluk makul artış (genç +3-6/43hf, deneyimli ~+1, 29+ koruma)
  // QA-DENGE notu: eski ölçek haftada %62 genç şansı → sezonda +21 rating pompasıydı (oyun kırıcı); yeni ölçek FM ritmi
  const baseP = (age: number) => (age <= 23 ? 0.075 : age <= 27 ? 0.036 : age <= 31 ? 0.012 : 0.004);
  const intensP = focus.intensity === 'yogun' ? 1.35 : focus.intensity === 'hafif' ? 0.55 : 1.0;
  const facBoost = 1 + (fac - 1) * 0.12; // tesis 5 → ×1.48

  for (const p of players) {
    if (p.injuredDays > 0) continue; // sakat oyuncu sahada değil
    const pGain = baseP(p.age) * intensP * facBoost;
    const doGain = rng() < pGain;
    const fitCost = focus.intensity === 'yogun' ? 5 + Math.floor(rng() * 4) : focus.intensity === 'normal' ? 1 + Math.floor(rng() * 2) : 0;
    // Yoğun antrenman küçük sakatlanma riski (tesis düşükse daha yüksek)
    const strainP = focus.intensity === 'yogun' ? Math.max(0.004, 0.018 - fac * 0.002) : focus.intensity === 'normal' ? 0.004 : 0.001;
    const strainedNow = rng() < strainP;

    if (!doGain && !strainedNow && fitCost === 0) continue;

    const k = keyOf(focus.area, p.group);
    const ratings = { ...p.ratings };
    if (doGain) {
      const mag = focus.intensity === 'yogun' && rng() < 0.3 ? 2 : 1;
      ratings[k] = Math.min(96, (ratings[k] ?? 50) + mag);
      ratings.gen = calcGen(p.group, { tek: ratings.tek, att: ratings.att, def: ratings.def, fiz: ratings.fiz, men: ratings.men, kal: ratings.kal ?? 0 });
      improved++;
    }
    const fitness = Math.max(30, Math.min(100, p.fitness - fitCost + (focus.intensity === 'hafif' ? 2 : 0)));
    const patch: Partial<Player> = { ratings, fitness };
    if (strainedNow) {
      strained++;
      const injury: PlayerInjury = { type: 'yorgunluk', name: 'Antrenman zorlanması', daysRemaining: 3 + Math.floor(rng() * 5), severity: 'hafif', canPlayWithRisk: true };
      patch.injuredDays = injury.daysRemaining;
      patch.injury = injury;
      noteLines.push(`${p.name}: yoğun antrenmanda zorlandı (${injury.daysRemaining} gün).`);
    } else if (doGain && rng() < 0.18) {
      noteLines.push(`${p.name} (${p.age}) ${focus.area.toLowerCase()} çalışmada göz doldurdu${focus.intensity === 'yogun' ? ' — yoğun tempo karşılığını veriyor' : ''}.`);
    }
    patches[p.id] = patch;
  }

  if (!noteLines.length) noteLines.push(`${focus.area} odaklı hafta sakin geçti; kadro ritmini korudu.`);
  return { patches, noteLines, improved, strained };
}
