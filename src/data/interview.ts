// HM26 — Maç sonu flash röportaj içerikleri ve kültür etkileri.
// Yeni kalıcı şema alanı eklenmez: seçim yalnızca mevcut OffPitchCulture alanlarını
// (fanTrust / discipline / ultrasHeat) ve inbox akışını besler.
import type { OffPitchCulture } from '../types';

export type InterviewOutcome = 'win' | 'draw' | 'loss';

export interface InterviewEffect {
  fanTrust?: number;
  discipline?: number;
  ultrasHeat?: number;
}

export interface InterviewOption {
  id: string;
  label: string;
  detail: string;
  quote: string;
  effect: InterviewEffect;
}

export interface PostMatchInterview {
  outcome: InterviewOutcome;
  headline: string;
  question: string;
  options: InterviewOption[];
}

// Röportajı reddetme seçimi: hiçbir kültür etkisi ve inbox kaydı üretmez.
export const INTERVIEW_DECLINE_ID = 'decline';

// Test ve inbox üretimi için sabit etiket — kaldırılırsa testler de güncellenmeli.
export const INTERVIEW_INBOX_TITLE = 'Maç sonu röportajı';

const clamp100 = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function buildPostMatchInterview(outcome: InterviewOutcome, oppShort: string): PostMatchInterview {
  if (outcome === 'win') {
    return {
      outcome,
      headline: 'Galibiyet sonrası flash röportaj',
      question: `${oppShort} karşısındaki galibiyetin ardından yayıncı mikrofon uzatıyor. Ne söyleyeceksin?`,
      options: [
        {
          id: 'win-praise',
          label: 'Övgüyü takıma ver',
          detail: 'Mütevazı ton; taraftar güvenini ve disiplini hafifçe yükseltir.',
          quote: 'Bu skor tamamen oyuncuların eseri. Taraftarımızın önünde böyle mücadele etmek bizi gururlandırıyor.',
          effect: { fanTrust: 3, discipline: 1 },
        },
        {
          id: 'win-ambition',
          label: 'Hedefi büyüt',
          detail: 'Hırslı mesaj; tribünleri ateşler, güveni tazeler.',
          quote: 'İyi bir akşamdı ama durmak yok. Bu camia şampiyonlukları hak ediyor ve peşini bırakmayacağız.',
          effect: { ultrasHeat: 5, fanTrust: 1 },
        },
        {
          id: 'win-critical',
          label: 'Eleştiriyi sürdür',
          detail: 'Talepkar ton; disiplini sıkılaştırır ama bazı taraftarları soğutur.',
          quote: 'Skor iyi, ancak performansımızı yeterli bulmuyorum. Daha keskin ve daha hazır olmalıyız.',
          effect: { discipline: 3, fanTrust: -1 },
        },
      ],
    };
  }
  if (outcome === 'draw') {
    return {
      outcome,
      headline: 'Beraberlik sonrası flash röportaj',
      question: `${oppShort} ile puan paylaşımı sonrası basın karşısındasın. Mesajın ne?`,
      options: [
        {
          id: 'draw-calm',
          label: 'Sakin kal',
          detail: 'Panik yapmayan lider tonu; güveni tazeler.',
          quote: 'Puan kaybı yaşadık, doğru; ama panik yok. Bu uzun bir maraton ve ayakta kalan kazanacak.',
          effect: { fanTrust: 2 },
        },
        {
          id: 'draw-own',
          label: 'Sorumluluğu al',
          detail: 'Özeleştiri; disiplini ve güveni birlikte destekler.',
          quote: 'İki puan bıraktık ve bunun sorumluluğu bende. Oyuncularımın arkasındayım; düzeltmek için çalışacağız.',
          effect: { discipline: 2, fanTrust: 1 },
        },
        {
          id: 'draw-angry',
          label: 'Tepkini göster',
          detail: 'Sert açıklama; ultraları hareketlendirir, disiplini yıpratır.',
          quote: 'Bu tabloyu kabul etmiyorum. Kimse kendini rahat hissetmesin; antrenmandan başlayarak her şeyi masaya yatıracağız.',
          effect: { ultrasHeat: 4, discipline: -1 },
        },
      ],
    };
  }
  return {
    outcome,
    headline: 'Mağlubiyet sonrası flash röportaj',
    question: `${oppShort} karşısındaki yenilginin ardından mikrofon sana uzatılıyor. Nasıl cevap vereceksin?`,
    options: [
      {
        id: 'loss-account',
        label: 'Hesabı kendine sor',
        detail: 'Liderlik; taraftar güvenini en çok toparlayan ton.',
        quote: "Maçın hesabını bana sorun. Oyuncuları suçlayacak en son kişi benim; çözümü de ben üreteceğim.",
        effect: { fanTrust: 4, discipline: 1 },
      },
      {
        id: 'loss-loyal',
        label: 'Takımın arkasında dur',
        detail: 'Birliktelik vurgusu; tribünleri yatıştırır.',
        quote: 'Kötü bir gece geçirdik ama soyunma odasını dağıtmayacağım. Birlikte düştük, birlikte kalkacağız.',
        effect: { fanTrust: 1, ultrasHeat: -3 },
      },
      {
        id: 'loss-fury',
        label: 'Sert çık',
        detail: 'Ateşli açıklama; ultraları coşturur, disiplin ve güveni sarsar.',
        quote: 'Bu performans kabul edilemez. Forma için savaşmayan, kadroda kendine yer bulamaz.',
        effect: { ultrasHeat: 6, discipline: -2, fanTrust: -2 },
      },
    ],
  };
}

export function applyInterviewEffect(culture: OffPitchCulture, effect: InterviewEffect): OffPitchCulture {
  return {
    ...culture,
    fanTrust: clamp100(culture.fanTrust + (effect.fanTrust ?? 0)),
    discipline: clamp100(culture.discipline + (effect.discipline ?? 0)),
    ultrasHeat: clamp100(culture.ultrasHeat + (effect.ultrasHeat ?? 0)),
  };
}

// Sonucun röportaj bağlamı (MatchReport'taki galibiyet/beraberlik/mağlubiyet hesabıyla aynı mantık)
export function outcomeOfResult(myClubId: string, homeId: string, awayId: string, hg: number, ag: number): InterviewOutcome {
  if (hg === ag) return 'draw';
  const mineHome = myClubId === homeId;
  const iWon = mineHome ? hg > ag : ag > hg;
  return iWon ? 'win' : 'loss';
}

export interface QuoteMatch {
  outcome: InterviewOutcome;
  optionId: string;
  label: string;
}

// Inbox'ta arşivlenen röportaj sözünden hangi tonun seçildiğini geriye doğru çözer.
// Eşleşmeyen metin (ör. eski sürüm kaydı) için null döner — uydurma sınıflandırma yapılmaz.
export function interviewToneOfQuote(quote: string): QuoteMatch | null {
  const clean = quote.trim();
  for (const outcome of ['win', 'draw', 'loss'] as const) {
    const found = buildPostMatchInterview(outcome, 'R').options.find((o) => o.quote === clean);
    if (found) return { outcome, optionId: found.id, label: found.label };
  }
  return null;
}
