// HM26 — Dalga 5: Maç günü deneyimi. Saf, sunum amaçlı kurallar; motor sonuçlarına DOKUNMAZ.
// Tüm çıktılar mevcut gerçek veriden türetilir: maç arşivi yoksa form yorumu üretilmez (sahte veri yok).
import type { Club, MatchArchiveEntry, Player, TacticPlan } from '../types';
import { cohesionEffectPct, tacticalFamiliarity } from './tacticsStudio';
import { fitnessRing } from './tacticsStudio';
import { recentRatings } from './squadInsights';

export type NoteTone = 'ok' | 'warn' | 'danger' | 'info';

export interface BriefNote {
  tone: NoteTone;
  /** UI rozeti için kısa etiket, örn. 'UYUM', 'KONDİSYON' */
  tag: string;
  text: string;
}

export interface MatchBrief {
  headline: string;
  notes: BriefNote[];
}

export interface BriefInput {
  myClub: Pick<Club, 'short' | 'strength'>;
  oppClub: Pick<Club, 'short' | 'strength'>;
  plan: TacticPlan;
  /** Maça çıkacak ilk 11 (autoXI çıktısı düz liste) */
  xi: Player[];
  /** Tüm kadro (sakat/cezalı sayımı için) */
  squad: Player[];
  reports: MatchArchiveEntry[];
  isHome: boolean;
}

const MAX_NOTES = 6;
const HOT_AVG = 7.4;     // son maç ortalaması eşiği (formda)
const COLD_AVG = 6.3;    // formsuzluk eşiği
const RATED_HOT = 2;     // en az 2 reytingli maç
const RATED_COLD = 3;

/** Maç öncesi teknik direktör brifingi; deterministik, RNG içermez. */
export function buildMatchBrief(input: BriefInput): MatchBrief {
  const { myClub, oppClub, plan, xi, squad, reports, isHome } = input;
  const notes: BriefNote[] = [];
  const diff = myClub.strength - oppClub.strength;
  const gapWord = diff >= 6 ? 'güç tarafı sensin' : diff <= -6 ? 'rakip daha güçlü görünüyor' : 'iki takım denk güçte';
  const headline = `${isHome ? 'Evinde' : 'Deplasmanda'} ${oppClub.short} karşısına çıkıyorsun — ${gapWord}.`;

  // 1) Güç farkı (her zaman gerçek veri)
  notes.push({
    tone: diff <= -6 ? 'warn' : 'info',
    tag: 'EŞLEŞME',
    text: diff >= 6
      ? `Kadro gücün ${myClub.strength} – ${oppClub.strength}; sahaya favori olarak çıkıyorsun.`
      : diff <= -6
        ? `Rakip ${oppClub.strength} – ${myClub.strength} üstün; disiplinli blok ve kontra planı öne çıkar.`
        : `Güç farkı yalnızca ${Math.abs(diff)} puan (${myClub.strength}–${oppClub.strength}); günü belirleyecek olan hazırlık ve konsantrasyon.`,
  });

  // 2) Taktiksel uyum (Dalga 2/4 sayacı; damgasız plan = nötr, sahte ceza yok)
  const fam = tacticalFamiliarity(plan);
  const effect = cohesionEffectPct(plan);
  if (!plan.familiarityFormation) {
    notes.push({ tone: 'info', tag: 'UYUM', text: `Bu planla henüz resmî maç oynanmadı; uyum %${fam.percent} nötr noktadan başlar, maç işledikçe oturur.` });
  } else if (fam.fresh) {
    notes.push({ tone: 'warn', tag: 'UYUM', text: `Yeni ${plan.formation} dizilisi alışma döneminde (uyum %${fam.percent}, maç etkisi ${effect}%); ilk yarıda pas kopmaları beklenebilir.` });
  } else if (effect?.startsWith('+')) {
    notes.push({ tone: 'ok', tag: 'UYUM', text: `Takım dizilişe tam alışmış (uyum %${fam.percent}, pas/top kontrolü ${effect}); pas trafiği güvenilir silahın.` });
  } else if (effect?.startsWith('−')) {
    notes.push({ tone: 'warn', tag: 'UYUM', text: `Uyum %${fam.percent} ile nötrün altında (maç etkisi ${effect}); riskli pas yerine güvenli çıkış tercih et.` });
  } else {
    notes.push({ tone: 'info', tag: 'UYUM', text: `Uyum %${fam.percent} nötr çizgide; diziliş tanıdık, dikkat bireysel hatalarda olacak.` });
  }

  // 3) İlk 11 kondisyon dağılımı (Taktik Stüdyosu ile aynı tonlar)
  const redXi = xi.filter((p) => fitnessRing(p.fitness).tone === 'red').length;
  const amberXi = xi.filter((p) => fitnessRing(p.fitness).tone === 'amber').length;
  if (redXi > 0) {
    const names = xi.filter((p) => fitnessRing(p.fitness).tone === 'red').slice(0, 2).map((p) => p.name.split(' ').slice(-1)[0]).join(', ');
    notes.push({ tone: 'danger', tag: 'KONDİSYON', text: `İlk 11'de ${redXi} oyuncu kritik kondisyonda (<%60)${names ? `: ${names}` : ''}; 60-75. dakikalarda rotasyon hazır olsun.` });
  } else if (amberXi > 0) {
    notes.push({ tone: 'warn', tag: 'KONDİSYON', text: `${amberXi} oyuncu %60-79 kondisyon bandında; yoğun pres ikinci yarıda pahalıya patlayabilir.` });
  } else if (xi.length > 0) {
    notes.push({ tone: 'ok', tag: 'KONDİSYON', text: 'İlk 11 tam formda; yüksek pres temposunu 90 dakika taşıyacak kondisyon var.' });
  }

  // 4) Sakat/cezalı kadro oyuncuları (gerçek durum)
  const unavailable = squad.filter((p) => p.injuredDays > 0 || p.suspendedMatches > 0);
  if (unavailable.length > 0) {
    const first = unavailable[0];
    const why = first.injuredDays > 0 ? `sakat (${first.injuredDays}g)` : `cezalı (${first.suspendedMatches} maç)`;
    notes.push({
      tone: 'danger',
      tag: 'EKSIK',
      text: unavailable.length === 1
        ? `${first.name} ${why}; planı onun eksikliğine göre kur.`
        : `${unavailable.length} oyuncu eksik: ${first.name.split(' ').slice(-1)[0]} ${why} ve ${unavailable.length - 1} oyuncu daha. Yedek derinliği kritik.`,
    });
  }

  // 5) Gerçek maç reytinglerinden formda/formsuz ilk 11 oyuncusu (arşiv yetmezse atlanır)
  if (reports.length > 0) {
    const rated = xi.map((p) => ({ p, ratings: recentRatings(p.id, reports) }))
      .map(({ p, ratings }) => ({ p, n: ratings.length, avg: ratings.length ? ratings.reduce((x, v) => x + v, 0) / ratings.length : 0 }))
      .filter((r) => r.n >= RATED_HOT)
      .sort((a, b) => b.avg - a.avg || a.p.id.localeCompare(b.p.id));
    const hot = rated.find((r) => r.avg >= HOT_AVG);
    if (hot) notes.push({ tone: 'ok', tag: 'FORMDA', text: `${hot.p.name} son maçlarda çıkışta (ort. ${hot.avg.toFixed(1)}); topu ona yönlendir, bitiricilik görevini üstlenebilir.` });
    const cold = [...rated].filter((r) => r.n >= RATED_COLD).sort((a, b) => a.avg - b.avg || a.p.id.localeCompare(b.p.id))[0];
    if (cold && cold.avg <= COLD_AVG && (!hot || cold.p.id !== hot.p.id)) {
      notes.push({ tone: 'warn', tag: 'FORMSUZ', text: `${cold.p.name} son maçlarda sessiz (ort. ${cold.avg.toFixed(1)}); üzerinde baskı kurulursa erken değişiklik düşün.` });
    }
  }

  return { headline, notes: notes.slice(0, MAX_NOTES) };
}

// ——— Maç içi antrenör notları ———
export type CoachCheckpoint = 45 | 75 | 90;

export interface CoachNoteCtx {
  checkpoint: CoachCheckpoint;
  myGoals: number;
  oppGoals: number;
  /** Planın uyum yüzdesi (tacticalFamiliarity) ve damga durumu */
  familiarityPercent: number;
  stamped: boolean;
  /** Sahadaki oyuncuların canlı ortalama kondisyonu 0-100 */
  meanFitness: number;
  /** Kırmızı kartla eksilen oyuncu sayısı */
  reds: number;
}

/** Dakikadan hangi kontrol noktasının tetikleneceğini belirler; aralık dışındaysa null. */
export function nextCoachCheckpoint(minute: number): CoachCheckpoint | null {
  if (minute >= 90) return 90;
  if (minute >= 75) return 75;
  if (minute >= 45) return 45;
  return null;
}

const lowCohesionClause = (ctx: CoachNoteCtx): string =>
  ctx.stamped && ctx.familiarityPercent < 70
    ? ' Dizilişe alışma sürecindeki pas kopmaları rakibe kontra fırsatı verdi; topu daha güvenli bölgede tutalım.'
    : '';

/**
 * Kontrol noktasında tek antrenör notu; gürültü yaratmamak için 75. dakikada çoğu durumda null döner.
 * Saf ve deterministiktir; maç sonucunu değiştirmez, yalnız Spiker akışına sunum satırı ekler.
 */
export function coachNoteAt(ctx: CoachNoteCtx): BriefNote | null {
  const { checkpoint: cp, myGoals, oppGoals, meanFitness, reds } = ctx;
  const behind = myGoals < oppGoals;
  const ahead = myGoals > oppGoals;

  if (cp === 45) {
    if (reds > 0) return { tone: 'danger', tag: 'TD NOTU', text: `Kırmızı kart sonrası takım dizildi: disiplini koruyup boş alan bırakma, kalan süre 10 kişi gibi değil kompakt oyna.${lowCohesionClause(ctx)}` };
    if (behind) return { tone: 'warn', tag: 'TD NOTU', text: `Skor ${myGoals}-${oppGoals} gerideyiz; panik yok, ikinci yarının ilk 15 dakikasını tempolu başla.${lowCohesionClause(ctx)}` };
    if (ahead) {
      if (meanFitness < 65) return { tone: 'warn', tag: 'TD NOTU', text: `Öndeyiz ama kondisyon %${Math.round(meanFitness)} bandında; gereksiz presi kesip skoru yönet, taze bacakları hazırla.` };
      return { tone: 'ok', tag: 'TD NOTU', text: `İyi yarı (${myGoals}-${oppGoals}); skoru korurken kanat bindirmelerini sürdür, rakip açmak zorunda kalacak.` };
    }
    if (ctx.stamped && ctx.familiarityPercent < 70) return { tone: 'warn', tag: 'TD NOTU', text: `Beraberlik dengeli ama pas trafiği aksıyor (uyum %${ctx.familiarityPercent}); ikinci yarı kısa pas ve duran toplara ağırlık ver.` };
    return { tone: 'info', tag: 'TD NOTU', text: `Beraberlik (${myGoals}-${oppGoals}) dengeli gidiyor; ilk golü bulmak için duran topları ve kornerleri değerlendir.` };
  }

  if (cp === 75) {
    if (behind) return { tone: 'warn', tag: 'TD NOTU', text: `Son 15 dakika ve gerideyiz: risk alacaksan kenar oyuncusunu hücumda kullan, geride gereksiz boşluk bırakma.` };
    if (ahead && meanFitness < 60) return { tone: 'warn', tag: 'TD NOTU', text: `Önde ama kondisyon %${Math.round(meanFitness)}: skoru koru, güvenli pasla dakika erit, kontra yememek için hatları sıkı tut.` };
    if (!ahead && !behind && meanFitness < 65) return { tone: 'warn', tag: 'TD NOTU', text: `Beraberlik ve kondisyon %${Math.round(meanFitness)}: taze yedek için son fırsat, uzayan bacaklarla gol zorlaşır.` };
    return null; // sessiz kal: anlatacak yeni bir şey yok
  }

  // cp === 90 — maç sonu kısa değerlendirme (her durumda bir satır)
  const cohesionTail = ctx.stamped && ctx.familiarityPercent >= 85 ? ' Yüksek uyum pas trafiğini ayakta tuttu.'
    : ctx.stamped && ctx.familiarityPercent < 70 ? ' Alışma sürecindeki uyum eksiği bugün bedel gösterdi.'
      : '';
  if (ahead) return { tone: 'ok', tag: 'TD NOTU', text: `Galibiyet (${myGoals}-${oppGoals}) — plan işledi, üç puan cepte.${cohesionTail}` };
  if (behind) return { tone: 'warn', tag: 'TD NOTU', text: `Mağlubiyet (${myGoals}-${oppGoals}); videoda özellikle geçen topları ve geçiş savunmasını konuşacağız.${cohesionTail}` };
  return { tone: 'info', tag: 'TD NOTU', text: `Beraberlik (${myGoals}-${oppGoals}); eksik tarafı haftanın antrenmanında kapatacağız.${cohesionTail}` };
}
