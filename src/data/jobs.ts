// HM26 — Dalga 1 P0: Kovulma sonrası iş piyasası (saf fonksiyonlar, test edilebilir)
import { Club, LeagueId } from '../types';
import { mulberry32 } from './gen';

export interface JobOffer {
  club: Club;
  /** teklif cazibe özeti */
  tagline: string;
}

const LEAGUE_ORDER: LeagueId[] = ['zirve', 'gecit', 'kok'];

/**
 * Kovulan menajer için deterministik iş teklifleri.
 * Kural: aynı ya da bir alt ligde, krizdeki (düşük güç) kulüpler güven verir.
 * En fazla 3 teklif; hepsi birbirinden farklı ve kovulduğun kulüpten farklı.
 */
export function computeJobOffers(
  clubs: Club[],
  leagueOf: Record<string, LeagueId>,
  firedFromId: string,
  seasonSeed: number,
  firedDay: number,
): JobOffer[] {
  const curLeague = leagueOf[firedFromId] ?? 'zirve';
  const curIdx = LEAGUE_ORDER.indexOf(curLeague);
  const eligible = clubs.filter((c) => {
    if (c.id === firedFromId) return false;
    const li = LEAGUE_ORDER.indexOf(c.league);
    return li >= curIdx; // aynı lig veya daha alt
  }).sort((a, b) => a.strength - b.strength); // en düşük güç önce

  const rng = mulberry32(seasonSeed * 7919 + firedDay * 37 + 5);
  const pool = eligible.slice(0, 8); // en kırılgan 8 kulüpten seç
  const picked = new Set<string>();
  const offers: JobOffer[] = [];
  const taglines = [
    'Yönetim sabırlı profilde teknik adam arıyor.',
    'Kriz içinden çıkacak karakterli bir hoca bekleniyor.',
    'Altyapıdan kopmak istemeyen yapıya liderlik fırsatı.',
    'Kısıtlı bütçede maksimum verim isteyen kurul',
  ];
  while (offers.length < 3 && pool.length > 0 && picked.size < pool.length) {
    const c = pool[Math.floor(rng() * pool.length)];
    if (picked.has(c.id)) continue;
    picked.add(c.id);
    offers.push({ club: c, tagline: taglines[Math.floor(rng() * taglines.length)] + ` Hedef: ${c.boardGoal}` });
  }
  return offers;
}

/** Ültimatom değerlendirmesi: 3 maç bitti mi, başarı var mı? */
export function evaluateUltimatum(left: number, got: number, need: number): 'active' | 'saved' | 'fired' {
  if (left > 0) return 'active';
  return got >= need ? 'saved' : 'fired';
}
