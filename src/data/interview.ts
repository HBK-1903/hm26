// HM26 — Maç sonu flash röportaj içerikleri ve kültür etkileri.
// Yeni kalıcı şema alanı eklenmez: seçim yalnızca mevcut OffPitchCulture alanlarını
// (fanTrust / discipline / ultrasHeat) ve inbox akışını besler.
import type { OffPitchCulture } from '../types';
import type { InterviewContext, InterviewTheme } from '../engine/interviewContext';

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

// ——— Bağlama duyarlı temalı röportajlar (klasik diyaloglar fallback olarak korunur) ———
// Her temada da 3 seçenek ve aynı üç kültür sayacına küçük ölçekli etkiler var;
// sözlerin hepsi noktayla biter, id'ler tema önekli ve tüm katalog genelinde benzersizdir.
// Bazı temalar yalnız mümkün sonuçlarda üretilir (geri dönüş yalnız galibiyet gibi);
// imkânsız kombinasyonda null döner ve dağıtıcı klasik diyaloğa düşer.
type ThemeMap = Partial<Record<InterviewOutcome, PostMatchInterview>>;

const themed = (
  theme: InterviewTheme,
  outcome: InterviewOutcome,
  headline: string,
  question: string,
  options: InterviewOption[],
): PostMatchInterview => ({ outcome, headline, question, options: options.map((o) => ({ ...o, id: `${theme}-${o.id}` })) });

export function buildThemedInterview(theme: Exclude<InterviewTheme, 'classic'>, outcome: InterviewOutcome, oppShort: string): PostMatchInterview | null {
  switch (theme) {
    case 'comeback': {
      // Geri dönüş yalnız galibiyetle mümkün; başka sonuç klasik akışa düşer.
      if (outcome !== 'win') return null;
      return themed(theme, outcome, 'Geri dönüş gecesi röportajı',
        `Maça geride başladınız ama ${oppShort} karşısında pes etmeyip üç puanı aldınız. Bu dönüşün sırrı neydi?`, [
          { id: 'karakter', label: 'Takımın karakteri', detail: 'Mütevazı ton; oyunculara övgü, güveni tazeler.', quote: 'Skor ne olursa olsun bu takım asla başını eğmiyor. Dönüşün mimarı sahadaki karakterdir.', effect: { fanTrust: 3, discipline: 1 } },
          { id: 'taktik', label: 'Taktik değişiklik işe yaradı', detail: 'Hırslı mesaj; ultraları hareketlendirir.', quote: 'Devrede planı değiştirdik ve oyuncular sahada birebir uyguladı. Bu kulübün nasıl cevap vereceğini biliyordum.', effect: { ultrasHeat: 4, fanTrust: 1 } },
          { id: 'standart', label: 'Bu standart olmalı', detail: 'Talepkar ton; disiplini sıkılaştırır, biraz soğuktur.', quote: 'Geri dönüşü kutluyorum ama geriye düşmek alışkanlık haline gelmemeli. Standart, doksan dakika baskı kurmaktır.', effect: { discipline: 3, fanTrust: -1 } },
        ]);
    }
    case 'collapse': {
      // Çöküş yalnız beraberlik/mağlubiyetle mümkündür.
      if (outcome === 'win') return null;
      const map: ThemeMap = {
        draw: themed(theme, 'draw', 'Puan kaybı sonrası açıklama',
          `Öne geçtiğiniz maçı tamamlayamadınız; ${oppShort} karşısında kaybedilen puanın sebebini nasıl açıklıyorsunuz?`, [
            { id: 'sorumluluk', label: 'Sorumluluğu al', detail: 'Özeleştiri; güveni ve disiplini birlikte tutar.', quote: 'Kontroldeki maçı vermek kabul edilemez ve sorumluluğu oyunculara yıkmam; çözüm benim masamda.', effect: { fanTrust: 2, discipline: 2 } },
            { id: 'konsantrasyon', label: 'Konsantrasyon kazası', detail: 'Sakin lider tonu; paniği önler.', quote: 'Kritik dakikalarda odağı kaybettik. Uzun maratonda soğukkanlı kalmak için çalışacağız.', effect: { fanTrust: 1 } },
            { id: 'ofke', label: 'Sert çık', detail: 'Ateşli açıklama; ultraları coşturur, disiplini yıpratır.', quote: 'Öne geçip berabere kalmak içime sinmiyor. Hafta içi antrenmanda kimse kendini rahat hissetmesin; tüm açıkları masaya yatıracağız.', effect: { ultrasHeat: 5, discipline: -1, fanTrust: -1 } },
          ]),
        loss: themed(theme, 'loss', 'Maçın elden kaçtığı gece',
          `Öne geçtiğiniz maçı ${oppShort} karşısında kaybettiniz. Bu kırılmanın hesabını nasıl veriyorsunuz?`, [
            { id: 'hesap', label: 'Hesabı bana sorun', detail: 'Liderlik; güveni en hızlı toparlayan ton.', quote: 'Öne geçtiğimiz maçı çevirmek en acı yenilgi tipi ve bunun hesabını bana sorun. Çıkış reçetesini ben yazacağım.', effect: { fanTrust: 4 } },
            { id: 'sakin', label: 'Panik yok', detail: 'Yatıştırıcı ton; tribünleri sakinleştirir.', quote: 'Kötü bir gece ama soyunma odasını dağıtacak değilim. Sakin kalıp hatayı antrenmanda düzelteceğiz.', effect: { fanTrust: 1, ultrasHeat: -2 } },
            { id: 'elestiri', label: 'Kabul edilemez', detail: 'Sert ton; ultraları hareketlendirir, disiplini yıpratır.', quote: 'Kontroldeki maçı vermek bu formaya yakışmadı. Kendini hazır hissetmeyen kendine yeni yer arasın.', effect: { ultrasHeat: 5, discipline: -1, fanTrust: -1 } },
          ]),
      };
      return map[outcome] ?? null;
    }
    case 'derby': {
      const map: ThemeMap = {
        win: themed(theme, 'win', 'Derbi galibiyeti röportajı',
          `Ezeli rakip ${oppShort} öninde galibiyet tadı başka. Tribünlere ne söylemek istersiniz?`, [
            { id: 'taraftar', label: 'Galibiyet taraftarın', detail: 'Tribüne adanan zafer; güveni en çok yükselten ton.', quote: 'Bu galibiyet bütün hafta nefesini tutan taraftarımızın hakkıdır. Onların sesi bugün sahadaki 12. adamdı.', effect: { fanTrust: 3, ultrasHeat: 2 } },
            { id: 'hirs', label: 'Rekabette durmak yok', detail: 'Hırslı mesaj; camiayı şampiyonluk hedefine kilitler.', quote: 'Derbi kazanmak bu camianın doğasında var ama durmak yok. Hedefimiz her rekabette aynı iştahla sahaya çıkmak.', effect: { ultrasHeat: 4 } },
            { id: 'elestiri', label: 'Skor tatmin etmedi', detail: 'Talepkar ton; disiplini sıkılaştırır.', quote: 'Derbiyi aldık ama performansımızı yeterli bulmuyorum. Bu kulübün standardı her dakikayı domine etmektir.', effect: { discipline: 2, fanTrust: -1 } },
          ]),
        draw: themed(theme, 'draw', 'Derbi beraberliği röportajı',
          `Derbide kazanan çıkmadı; ${oppShort} ile puan paylaşımını nasıl okuyorsunuz?`, [
            { id: 'kaybetmemek', label: 'Derbide kaybetmemek önemli', detail: 'Yatıştırıcı ton; güveni korur.', quote: 'Derbide kaybetmemek de bir değerdir. Camiamıza bu puanı getirdiğimiz için en azından başımız dik.', effect: { fanTrust: 2 } },
            { id: 'ikipuan', label: 'İki puan bıraktık', detail: 'Özeleştiri; disiplin ve güveni birlikte destekler.', quote: 'Öne geçip skoru koruyamayınca bu iki puan kaybı gibi geliyor; sorumluluğu alıyorum.', effect: { discipline: 2, fanTrust: 1 } },
            { id: 'ofke', label: 'Bu tabloyu kabul etmiyorum', detail: 'Sert ton; ultraları hareketlendirir, disiplini yıpratır.', quote: 'Taraftarımız derbide galibiyeti hak ediyordu. Bu tabloyu kabul etmiyorum; telafisi en kısa sürede gelecek.', effect: { ultrasHeat: 3, discipline: -1 } },
          ]),
        loss: themed(theme, 'loss', 'Derbi mağlubiyeti röportajı',
          `Derbi mağlubiyetinin ardından ${oppShort} karşısında tribünlere vereceğiniz mesaj ne?`, [
            { id: 'hesap', label: 'Hesabı bana sorun', detail: 'Liderlik; güveni en hızlı toparlayan ton.', quote: 'Bu acı gecenin hesabını bana sorun. Oyuncuları suçlayacak en son kişi benim; çözümü de ben üreteceğim.', effect: { fanTrust: 4, discipline: 1 } },
            { id: 'birlikte', label: 'Soyunma odasını dağıtmayacağım', detail: 'Birliktelik vurgusu; tribünleri yatıştırır.', quote: 'Kötü bir gece geçirdik ama birbirimize girmenin sırası değil. Birlikte düştük, birlikte kalkacağız.', effect: { fanTrust: 1, ultrasHeat: -2 } },
            { id: 'kabul', label: 'Performans kabul edilemez', detail: 'Ateşli açıklama; ultraları coşturur, güveni sarsar.', quote: 'Bu forma bu performans yakışmadı. Kabul edilemez; forma için savaşmayan kendine yer bulamaz.', effect: { ultrasHeat: 5, discipline: -2, fanTrust: -2 } },
          ]),
      };
      return map[outcome] ?? null;
    }
    case 'redcard': {
      const map: ThemeMap = {
        win: themed(theme, 'win', 'Kırmızı kart sonrası açıklama',
          `${oppShort} maçında takımınız eksik kaldı ama sahadan galip ayrıldınız. Kırmızı kart ve disiplin hakkında ne düşünüyorsunuz?`, [
            { id: 'kural', label: 'Kural hatası yapıldı', detail: 'Sorumluluk alan ton; disiplini sıkılaştırır.', quote: 'Kartın sebebi bir kural hatasıydı ve bedelini ağır ödedik. Takımı 10 kişi bırakmak lüksümüz yok.', effect: { discipline: 2, fanTrust: 1 } },
            { id: 'direnc', label: '10 kişi direndi', detail: 'Mücadele vurgusu; tribünleri ısıtır.', quote: 'Eksik kalmamıza rağmen sahadaki her oyuncu savaştı ve üç puanı bırakmadı. Bu direnci görmek beni gururlandırıyor.', effect: { ultrasHeat: 4, fanTrust: 1 } },
            { id: 'saygi', label: 'Kararlara saygılıyız', detail: 'Sakin ton; gerilimi düşürür.', quote: 'Kararları tartışmak yerine başımızı eğip çalışacağız. Önemli olan eksik kalınca takımın nasıl direndiği.', effect: { fanTrust: 1 } },
          ]),
        draw: themed(theme, 'draw', 'Kırmızı kartın gölgesindeki beraberlik',
          `${oppShort} maçında eksik kaldınız ve puan paylaştınız. Kırmızı kartı nasıl değerlendiriyorsunuz?`, [
            { id: 'bedel', label: 'Bedelini ödedik', detail: 'Sorumluluk alan ton; disiplini sıkılaştırır.', quote: 'Kırmızı kartın bedelini iki puan bırakarak ödedik. Ders çıkarıp bir daha aynı hataya düşmeyeceğiz.', effect: { discipline: 2, fanTrust: 1 } },
            { id: 'sakinlik', label: 'Sakinlik korundu', detail: 'Lider olgunluğu; güveni tazeler.', quote: '10 kişi kalmak paniği davet edebilirdi ama takım soğukkanlılığını bozmadı. Bu olgunluk değerli.', effect: { fanTrust: 1 } },
            { id: 'itiraz', label: 'Karar tartışmalı', detail: 'Eleştirel ton; ultraları hareketlendirir.', quote: 'Pozisyonu saygıyla karşılıyorum ama kamuoyunun da kafasında soru işareti olduğunu biliyorum.', effect: { ultrasHeat: 3, discipline: -1 } },
          ]),
        loss: themed(theme, 'loss', 'Kırmızı kart sonrası mağlubiyet',
          `${oppShort} karşısında eksik kalınan maçı kaybettiniz. Kırmızı kart ve sonuç hakkında ne diyeceksiniz?`, [
            { id: 'sorumluluk', label: 'Kartın sorumluluğu bizde', detail: 'Özeleştiri; güven ve disiplini birlikte tutar.', quote: 'Maçın kırılma anı kırmızı karttı ve bunun özür dilemesi gereken tarafı biziz. Telafi edeceğiz.', effect: { discipline: 2, fanTrust: 2 } },
            { id: 'destek', label: 'Oyuncumun arkasındayım', detail: 'Birliktelik vurgusu; tribünleri yatıştırır.', quote: 'Tek bir hatayı büyütüp oyuncumu yalnız bırakmam. Takım olarak düştük, birlikte kalkacağız.', effect: { fanTrust: 1, ultrasHeat: -2 } },
            { id: 'tepkili', label: 'Sahanın içine kapandık', detail: 'Ateşli ton; ultraları coşturur, disiplini yıpratır.', quote: 'Kart sonrası oyundan düştük ve bu kabul edilemez. Antrenmanda eksik kalmaya karşı senaryolar çalışacağız.', effect: { ultrasHeat: 4, discipline: -1 } },
          ]),
      };
      return map[outcome] ?? null;
    }
    case 'var': {
      const map: ThemeMap = {
        win: themed(theme, 'win', 'VAR kararları sonrası röportaj',
          `Maçın kaderini etkileyen VAR kararları vardı ama ${oppShort} karşısında yine de kazandınız. Teknolojinin bu rolüne ne diyorsunuz?`, [
            { id: 'saygi', label: 'Kararlara saygı', detail: 'Sakin lider tonu; disiplin ve güveni hafif artırır.', quote: 'Teknoloji futbolun içinde ve kararlara saygı duymak zorundayız. Bizim işimiz her senaryoda hazır olmak.', effect: { discipline: 1, fanTrust: 1 } },
            { id: 'odak', label: 'Konsantrasyon bozulmadı', detail: 'Takıma övgü; güveni tazeler.', quote: 'İptal sonrası en zor şey odağı korumaktır; oyuncularım buna en güzel cevabı sahada verdi.', effect: { fanTrust: 2 } },
            { id: 'tutarlilik', label: 'Tutarlılık şart', detail: 'Eleştirel ton; ultraları hareketlendirir, disiplini yıpratır.', quote: 'Teknolojiye saygılıyım ama kararların tutarlı olması şart. Bu konuda kamuoyunun da soruları olduğunu biliyorum.', effect: { ultrasHeat: 3, discipline: -1 } },
          ]),
        draw: themed(theme, 'draw', 'VAR gölgesinde puan kaybı',
          `${oppShort} maçında VAR kararları sonrası puan paylaşıldı. İçinizdeki soru ne?`, [
            { id: 'hayif', label: 'İçimize sindiremedik', detail: 'Tepkili ton; tribünün dilinden konuşur.', quote: 'İptal edilen golün ardından puan kaybı yaşadık ve doğal olarak içimize sinmedi. Yine de kararlara saygı duyacağız.', effect: { ultrasHeat: 3, fanTrust: 1 } },
            { id: 'odakli', label: 'Odağımız bozulmadı', detail: 'Profesyonel ton; disiplin ve güveni hafif artırır.', quote: 'Monitör başında uzun bekleyişler oldu ama oyuncularım konsantrasyonunu korudu. Profesyonel cevap buydu.', effect: { discipline: 1, fanTrust: 1 } },
            { id: 'talep', label: 'Tutarlılık talep ediyorum', detail: 'Eleştirel ton; ultraları hareketlendirir.', quote: 'Teknolojiye karşı değilim; tek talebim her kulübe aynı standardın uygulanması. Tutarlılık bu işin mayasıdır.', effect: { ultrasHeat: 3, discipline: -1 } },
          ]),
        loss: themed(theme, 'loss', 'VAR tartışmasının ardından mağlubiyet',
          `${oppShort} karşısında VAR kararlarının da etkisiyle kaybettiniz. Açıklamanız ne?`, [
            { id: 'saygi-kayip', label: 'Saygıdan şaşmayız', detail: 'Sorumluluk alan lider tonu; disiplini destekler.', quote: 'Mağlup olduk diye kararları hedef almayacağım. Başımızı eğip kendi eksiklerimize odaklanacağız.', effect: { discipline: 2, fanTrust: 1 } },
            { id: 'sorgu', label: 'Sorular cevap bulmalı', detail: 'Eleştirel ton; ultraları coşturur.', quote: 'Kamuoyunun haklı soruları var ve yetkililerin bu sorulara net açıklamayla dönmesi lazım.', effect: { ultrasHeat: 4 } },
            { id: 'calisma', label: 'Bahane üretmiyorum', detail: 'Özeleştiri; güveni toparlar.', quote: 'VAR’ı bahane etmeyeceğim; kaybettik çünkü kendi fırsatlarımızı değerlendiremedik. Çalışmak tek çözüm.', effect: { fanTrust: 2 } },
          ]),
      };
      return map[outcome] ?? null;
    }
    case 'xg-over': {
      const map: ThemeMap = {
        win: themed(theme, 'win', 'Verimlilik röportajı',
          `İstatistikler az pozisyonla çok iş yaptığınızı söylüyor. ${oppShort} karşısındaki bu verimlilik sürdürülebilir mi?`, [
            { id: 'bitiricilik', label: 'Bitiricilik kalitemiz', detail: 'Takıma övgü; taraftar güvenini yükseltir.', quote: 'Forvetlerimiz fırsatı gördüğü anda affetmiyor. Bu verimlilik antrenmandaki bitiricilik çalışmalarının meyvesi.', effect: { fanTrust: 3 } },
            { id: 'temkin', label: 'Her maç böyle olmaz', detail: 'Temkinli ton; disiplini sıkı tutar.', quote: 'Skor güzel ama rehavete yer yok. Her gece bu kadar az pozisyonla bu kadar gol bulamayız; kontrolü artırmalıyız.', effect: { discipline: 2 } },
            { id: 'hirs', label: 'Daha iyisini yapacağız', detail: 'Hırslı mesaj; tribünleri ateşler.', quote: 'Bugünü kutlarız ama bu takımın tavanı çok daha yüksek. Durmadan daha iyisini hedefleyeceğiz.', effect: { ultrasHeat: 4 } },
          ]),
        draw: themed(theme, 'draw', 'Verimli ama eksik akşam',
          `${oppShort} karşısında az pozisyonla gol buldunuz ama galibiyet gelmedi. Bu tabloyu nasıl okuyorsunuz?`, [
            { id: 'kalite', label: 'Bitiricilik yine konuştu', detail: 'Olumlu ton; güveni tazeler.', quote: 'Az pozisyonla gol bulmak kalitemizi gösteriyor ama beraberlikte duran top savunmamızın da hesabını yapacağız.', effect: { fanTrust: 2 } },
            { id: 'disiplin', label: 'Rehavete kapılmam', detail: 'Talepkar ton; disiplini sıkılaştırır.', quote: 'İstatistikler lehimize görünebilir ama iki puan bıraktık. Sadece galibiyetler beni tatmin eder.', effect: { discipline: 2 } },
            { id: 'acgoz', label: 'Daha çok pozisyon isteyeceğiz', detail: 'Hırslı mesaj; ultraları hareketlendirir.', quote: 'Verimlilik güzel ama sürekli az şutla yaşayamayız. Haftaya pozisyon sayısını da artıracağız.', effect: { ultrasHeat: 3 } },
          ]),
        loss: themed(theme, 'loss', 'İstatistik lehine, skor aleyhine',
          `İstatistikler verimli bitiricilik söylüyor ama ${oppShort} karşısında kaybettiniz. Bu çelişkiyi nasıl açıklıyorsunuz?`, [
            { id: 'avuntu-yok', label: 'İstatistik avuntu olmaz', detail: 'Sert gerçekçi ton; disiplini destekler.', quote: 'xG lehimize diye kayıp hafiflemez. Puan tablosunda yazan tek gerçek skordur ve biz kaybettik.', effect: { discipline: 2, fanTrust: 1 } },
            { id: 'savunma', label: 'Sorun hücumda değil', detail: 'Özeleştiri; güveni toparlar.', quote: 'Gol bulmakta zorlanmadık; kalesini koruyamayan taraf bizdik. Savunma tedbirini ilk ben masaya koyacağım.', effect: { fanTrust: 2 } },
            { id: 'tepki', label: 'Bu savunma yetmez', detail: 'Ateşli ton; ultraları coşturur, disiplini yıpratır.', quote: 'Kaç gol yediğimiz ortada. Forma için savunma yapamayan kadroda kendini rahat hissetmesin.', effect: { ultrasHeat: 5, discipline: -1, fanTrust: -1 } },
          ]),
      };
      return map[outcome] ?? null;
    }
    case 'xg-under': {
      const map: ThemeMap = {
        win: themed(theme, 'win', 'Gol sıkıntısına rağmen galibiyet',
          `${oppShort} karşısında pozisyon ürettiniz ama goller gelmedi; yine de kazandınız. Bitiricilik endişe yaratıyor mu?`, [
            { id: 'kazandik', label: 'Üç puan altın değerinde', detail: 'Pozitif ton; güveni yükseltir.', quote: 'Pozisyon üretip bitiremediğimiz bir geceydi ama yine de üç puanı aldık. Bazen böyle kazanmak da lazım.', effect: { fanTrust: 3 } },
            { id: 'endise', label: 'Endişelenmiyorum', detail: 'Sakin lider tonu; güveni tazeler.', quote: 'Şutlar girmedi diye panik yapacak değilim; süreç doğruydu, gol sayıları bir iki haftaya dengelenecektir.', effect: { fanTrust: 1 } },
            { id: 'calis', label: 'Bitiriciliği antrenmanda çözeceğiz', detail: 'Disiplinli ton; çalışma vurgusu.', quote: 'Kazandık ama eksiklerimizi görmezden gelmeyeceğim. Hafta içi bitiricilik istasyonları kuracağız.', effect: { discipline: 2 } },
          ]),
        draw: themed(theme, 'draw', 'Bitiricilik sorgusu',
          `Pozisyonlar ürettiniz ama gol gelmedi; ${oppShort} karşısında bitiricilik sorununu nasıl çözeceksiniz?`, [
            { id: 'calisma', label: 'Çalışarak düzelteceğiz', detail: 'Sakin ve disiplinli ton.', quote: 'Pozisyon üretmek sorunun yarısını çözüyor; kalan yarısı bitiricilik ve onu da antrenmanda çözeceğiz.', effect: { fanTrust: 1, discipline: 1 } },
            { id: 'sorumluluk', label: 'Sorumluluk bende', detail: 'Özeleştiri; güveni toparlar.', quote: 'Oyuncuları suçlamam; doğru pozisyonları hazırlayamayan hücum planının sorumlusu benim.', effect: { fanTrust: 2 } },
            { id: 'guven', label: 'Forvetlere güveniyorum', detail: 'Sadakat vurgusu; tribünleri yatıştırır.', quote: 'Forvetlerimin kalitesine güveniyorum. Şanssız bir geceydi; goller gelecek, panik yok.', effect: { ultrasHeat: 2, fanTrust: 1 } },
          ]),
        loss: themed(theme, 'loss', 'Pozisyonların boşa gittiği gece',
          `Pozisyon ürettiniz ama gol yok; ${oppShort} karşısındaki mağlubiyetin faturası ne olacak?`, [
            { id: 'sorumluluk-kayip', label: 'Planın sorumlusu benim', detail: 'Liderlik; güveni en hızlı toparlayan ton.', quote: 'Pozisyon hazırlayıp gol atamamak en ağır yenilgi tiplerinden ve hücum planının faturası bana kesilir.', effect: { fanTrust: 3 } },
            { id: 'sabir', label: 'Sabır, panik yok', detail: 'Yatıştırıcı ton; ultraları sakinleştirir.', quote: 'Forvetlerime güveniyorum; bu şanssız geceyi kimseye yapıştırmayacağız. Goller gelecek, ben eminim.', effect: { ultrasHeat: -2, fanTrust: 1 } },
            { id: 'ates', label: 'Tetik değişmeli', detail: 'Ateşli ton; ultraları coşturur, disiplini yıpratır.', quote: 'Aynı tabloyu üçüncü kez görüyorsak bir şeyi değiştirmek zorundayız. Antrenmanda herkes pozisyonu için savaşacak.', effect: { ultrasHeat: 4, discipline: -1 } },
          ]),
      };
      return map[outcome] ?? null;
    }
    case 'late': {
      // Son dakika galibiyeti teması yalnız galibiyetle mümkündür.
      if (outcome !== 'win') return null;
      return themed(theme, outcome, 'Son dakika galibiyeti röportajı',
        `Maçın son anlarında gelen golle ${oppShort} yıkıldı. Bu direncin kaynağı ne?`, [
          { id: 'pesetmeme', label: 'Takım asla pes etmiyor', detail: 'Takıma övgü; güveni en çok yükselten ton.', quote: 'Doksanıncı dakikada bile koşan bir takım var sahada. Bu direncin tek kaynağı pes etmeyen karakterimiz.', effect: { fanTrust: 3, ultrasHeat: 2 } },
          { id: 'fizik', label: 'Fiziksel hazırlık işe yaradı', detail: 'Sakin, kurumsal cevap; disiplini destekler.', quote: 'Son dakikalarda ayakta kalabilmek bir hazırlık işidir. Ekibimizin kondisyon planı bugün meyvesini verdi.', effect: { discipline: 1 } },
          { id: 'gen', label: 'Bu kulübün geni bu', detail: 'Ateşli mesaj; ultraları coşturur.', quote: 'Bu kulüp son düdüğe kadar mücadele etmeyi genlerinde taşır. Taraftarımız bunu bilerek stada geliyor.', effect: { ultrasHeat: 5 } },
        ]);
    }
    case 'streak': {
      const map: ThemeMap = {
        win: themed(theme, 'win', 'Galibiyet serisi röportajı',
          `Üst üste galibiyetler geliyor. ${oppShort} sonrası seri hakkında ne diyorsunuz?`, [
            { id: 'alcakgonul', label: 'Ayaklarımız yere basıyor', detail: 'Mütevazı ton; disiplini ve güveni birlikte tutar.', quote: 'Seri güzel ama rehavet en tehlikeli düşmanımız. Bir sonraki maça sıfırlanmış kafayla çıkacağız.', effect: { discipline: 2, fanTrust: 1 } },
            { id: 'sampiyonluk', label: 'Hedef belli', detail: 'Hırslı mesaj; camiayı şampiyonluğa kilitler.', quote: 'Bu camia şampiyonlukları hak ediyor ve aldığımız her sonuç bizi o hedefe biraz daha yaklaşıyor.', effect: { ultrasHeat: 5, fanTrust: 1 } },
            { id: 'devam', label: 'Henüz hiçbir şey bitmedi', detail: 'Talepkar ton; disiplini sıkılaştırır.', quote: 'Hiçbir şey kazanılmış değil. Seriyi sürdürmek için her detayı daha iyiye götürmek zorundayız.', effect: { discipline: 2 } },
          ]),
        loss: themed(theme, 'loss', 'Mağlubiyet serisi röportajı',
          `Üst üste mağlubiyetler soyunma odasında endişe yaratmış olmalı. ${oppShort} sonrası mesajınız ne?`, [
            { id: 'liderlik', label: 'Hesabı bana sorun', detail: 'Liderlik; güveni en çok toparlayan ton.', quote: 'Böyle dönemlerde oyuncuları öne atmam. Serinin hesabını bana sorun; çıkış planını da ben kuracağım.', effect: { fanTrust: 4 } },
            { id: 'birlikte', label: 'Birlikte kalkacağız', detail: 'Birliktelik vurgusu; tribünleri yatıştırır.', quote: 'Panik yok. Bu kulüp daha kötü günler gördü ve birlikte çalışarak çıktı; yine öyle olacak.', effect: { fanTrust: 1, ultrasHeat: -2 } },
            { id: 'sert', label: 'Formanın hakkını veren oynar', detail: 'Ateşli açıklama; ultraları coşturur, güveni sarsar.', quote: 'Bu performans kabul edilemez. Formanın hakkını vermeyen, kadroda kendini güvende hissetmesin.', effect: { ultrasHeat: 5, discipline: -2, fanTrust: -1 } },
          ]),
        draw: themed(theme, 'draw', 'Sonuçsuzluk serisi röportajı',
          `Üst üste beraberlikler puan kaybettiriyor. ${oppShort} sonrası bu tabloyu nasıl kıracaksınız?`, [
            { id: 'sorumluluk', label: 'Sorumluluğu al', detail: 'Özeleştiri; güveni toparlar.', quote: 'Beraberlikler galibiyete dönüşmüyorsa sorun planlamadadır ve sorumluluğu ben alıyorum.', effect: { fanTrust: 2, discipline: 1 } },
            { id: 'sakin', label: 'Panik yok', detail: 'Sakin lider tonu.', quote: 'Maraton uzun; puan kaybediyoruz ama yenilmiyoruz da. Soğukkanlı kalıp dengeyi galibiyete çevireceğiz.', effect: { fanTrust: 1 } },
            { id: 'elestiri', label: 'Kendini rahat gören yanar', detail: 'Sert ton; disiplini sıkılaştırır, ultraları hareketlendirir.', quote: 'Beraberliğe alışan takım olamayız. Kimse kendini rahat hissetmesin; hafta içi antrenmanda hesap sorulacak.', effect: { ultrasHeat: 3, discipline: -1 } },
          ]),
      };
      return map[outcome] ?? null;
    }
  }
}

/**
 * Bağlam verilmezse veya tema classic ise klasik üç senaryolu röportaj döner.
 * Tema verildiğinde o temaya özel diyalog açılır; uygunsuz kombinasyonda klasik akışa düşülür.
 */
export function buildPostMatchInterviewWithContext(ctx: InterviewContext, oppShort: string): PostMatchInterview {
  if (ctx.theme === 'classic') return buildPostMatchInterview(ctx.outcome, oppShort);
  return buildThemedInterview(ctx.theme, ctx.outcome, oppShort) ?? buildPostMatchInterview(ctx.outcome, oppShort);
}

// Tüm röportaj sözlerinin kaydı: basın profili sınıflandırması temalı sözleri de tanır.
function collectAllQuotes(): Array<{ quote: string; outcome: InterviewOutcome; optionId: string; label: string }> {
  const out: Array<{ quote: string; outcome: InterviewOutcome; optionId: string; label: string }> = [];
  for (const outcome of ['win', 'draw', 'loss'] as const) {
    for (const o of buildPostMatchInterview(outcome, 'R').options) out.push({ quote: o.quote, outcome, optionId: o.id, label: o.label });
    for (const theme of ['comeback', 'collapse', 'derby', 'redcard', 'var', 'xg-over', 'xg-under', 'late', 'streak'] as const) {
      const catalog = buildThemedInterview(theme, outcome, 'R');
      if (catalog) for (const o of catalog.options) out.push({ quote: o.quote, outcome, optionId: o.id, label: o.label });
    }
  }
  return out;
}

const ALL_QUOTE_REGISTRY = collectAllQuotes();

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
// Klasik 9'luk çekirdek + tüm temalı kataloglar taranır; eşleşmeyen metin (ör. eski
// sürüm kaydı) için null döner — uydurma sınıflandırma yapılmaz.
export function interviewToneOfQuote(quote: string): QuoteMatch | null {
  const clean = quote.trim();
  const found = ALL_QUOTE_REGISTRY.find((entry) => entry.quote === clean);
  return found ? { outcome: found.outcome, optionId: found.optionId, label: found.label } : null;
}
