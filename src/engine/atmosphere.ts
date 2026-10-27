// HM26 — Dalga 7: Atmosfer/tiyatro. Saf, sunum amaçlı kurallar; motor sonuçlarına DOKUNMAZ.
// Tüm çıktılar gerçek veri kaynaklarından türer: kültür modeli (fanTrust/ultrasHeat/…),
// fikstür kimliği (derbi/nemesis) ve oynanmış maçların sonuç şeridi. Uydurma haber/trend yok.
import type { OffPitchCulture } from '../types';
import type { MatchResult } from './teamInsights';

export type PulseTone = 'ok' | 'info' | 'warn' | 'danger';

export interface Level {
  tone: PulseTone;
  /** 0-100 değeri için Türkçe düzey etiketi */
  label: string;
}

/** 0-100 kültür göstergesini dört düzeye böler; eşikler tüm ekranlarda ortak. */
export function levelOf(value: number): Level {
  if (value >= 75) return { tone: 'ok', label: 'Yüksek' };
  if (value >= 55) return { tone: 'info', label: 'İstikrarlı' };
  if (value >= 35) return { tone: 'warn', label: 'Gergin' };
  return { tone: 'danger', label: 'Kritik' };
}

/** Cümle içi kullanım için etiketlerin güvenli küçük harf karşılığı (JS 'İ'.toLowerCase tuhaflığından kaçınır). */
const LOWER_LABEL: Record<Level['label'], string> = {
  Yüksek: 'yüksek',
  İstikrarlı: 'istikrarlı',
  Gergin: 'gergin',
  Kritik: 'kritik',
};
export const lowerLabel = (l: Level): string => LOWER_LABEL[l.label];

// ——— Maç günü atmosfer kartı ———
export interface AtmosphereInput {
  isHome: boolean;
  isDerby: boolean;
  isNemesis: boolean;
  oppShort: string;
  stadium: string;
  culture: OffPitchCulture;
}

export interface AtmosphereLine {
  tone: PulseTone;
  tag: string;
  text: string;
}

export interface MatchdayAtmosphere {
  headline: string;
  lines: AtmosphereLine[];
}

/**
 * Maç günü tribün atmosferi. Derbi/nemesis bilgisi fikstür ve kültür modelinden gelir;
 * taraftar ısısı ve güven endeksi canlı kültür değerlerinden okunur — hiçbiri üretilmez.
 */
export function buildMatchdayAtmosphere(input: AtmosphereInput): MatchdayAtmosphere {
  const { isHome, isDerby, isNemesis, oppShort, stadium, culture } = input;
  const heat = levelOf(culture.ultrasHeat);
  const trust = levelOf(culture.fanTrust);
  const lines: AtmosphereLine[] = [];

  const headline = isDerby
    ? `${isHome ? 'Evinde' : 'Deplasmanda'} ${oppShort} derbisi — şehir nefesini tuttu.`
    : isNemesis
      ? `${oppShort} ile ezeli rekabet maçına çıkıyorsun; tribünler bu akşamı takvimine işledi.`
      : `${isHome ? stadium : `${oppShort} sahası`} için maç günü hazırlıkları tamam.`;

  if (isDerby || isNemesis) {
    lines.push({
      tone: 'danger',
      tag: 'RİVALİTE',
      text: isDerby
        ? `Bu maçın puan tablosundan ötesi var: ${oppShort} taraftarıyla tarihî gerilim sahaya yansıyacak, ilk dakikalarda temkinli ol.`
        : `Nemesis kulüp ${oppShort} — önceki hesaplaşmalar tribünlerin hafızasında taze.`,
    });
  }

  lines.push({
    tone: heat.tone,
    tag: 'TRIBÜN',
    text: isHome
      ? `Taraftar ısısı ${lowerLabel(heat)} düzeyde (${culture.ultrasHeat}/100)${culture.ultrasHeat >= 75 ? '; tezahüratlar ilk düdükle birlikte takımı taşıyacak.' : culture.ultrasHeat >= 35 ? '; iyi bir başlangıç tribünleri anında ateşler.' : '; sessiz başlayan tribünleri sahada uyandırmak gerekecek.'}`
      : `Deplasman tribününde ${lowerLabel(heat)} bir karşılama bekleniyor (${culture.ultrasHeat}/100); odaklanma ekstra önemli.`,
  });

  lines.push({
    tone: trust.tone,
    tag: 'BEKLENTİ',
    text: `Taraftar güven endeksi ${lowerLabel(trust)} (${culture.fanTrust}/100): ${culture.fanTrust >= 75 ? 'kamuoyu galibiyeti neredeyse vazgeçilmez görüyor.' : culture.fanTrust >= 55 ? 'destek sürüyor ama sabır da sınırsız değil.' : 'eleştiri okları yakında; skor kadar oyun da ikna etmeli.'}`,
  });

  return { headline, lines };
}

// ——— Taraftar Nabzı ———
export type Momentum = 'hot' | 'warm' | 'cold' | 'frozen' | 'silent';

/** Son sonuç şeridinden serbest momentum; hiç maç yoksa 'silent' (sahte trend yok). */
export function formMomentum(results: MatchResult[]): Momentum {
  if (!results.length) return 'silent';
  const last3 = results.slice(-3);
  if (last3.length >= 3 && last3.every((r) => r === 'W')) return 'hot';
  const streak = (() => { let n = 0; for (let i = results.length - 1; i >= 0; i--) { if (results[i] === 'L') n++; else break; } return n; })();
  if (streak >= 3) return 'frozen';
  if (streak === 2) return 'cold';
  if (last3.filter((r) => r === 'W').length >= 2) return 'warm';
  return 'warm';
}

export interface FanPulse {
  trust: Level;
  heat: Level;
  community: Level;
  discipline: Level;
  momentum: Momentum;
  momentumLabel: string;
  /** Sonuç yoksa true: ekran yalnız gerçek kültür göstergelerini verir, trend yorumu eklemez. */
  noMatches: boolean;
}

const MOMENTUM_TEXT: Record<Momentum, string> = {
  hot: 'Üç maçlık galibiyet serisi — tribünlerde rüzgâr tam arkanda.',
  warm: 'Son haftalarda toparlanma sinyalleri var; taraftar temkinli iyimser.',
  cold: 'Üst üste iki mağlubiyet — sabırlı kesim azalmaya başladı.',
  frozen: 'En az üç maçlık mağlubiyet serisi; tribünlerle aradaki güven sınanıyor.',
  silent: 'Sezon başı: henüz oynanmış maç yok, trend yorumu ilk sonuçlarla birlikte gelecek.',
};

export function fanPulse(culture: OffPitchCulture, results: MatchResult[]): FanPulse {
  const momentum = formMomentum(results);
  return {
    trust: levelOf(culture.fanTrust),
    heat: levelOf(culture.ultrasHeat),
    community: levelOf(culture.communityTrust),
    discipline: levelOf(culture.discipline),
    momentum,
    momentumLabel: MOMENTUM_TEXT[momentum],
    noMatches: results.length === 0,
  };
}
