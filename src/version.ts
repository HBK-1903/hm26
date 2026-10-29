// HM26 — Sürüm kimliği + sürüm notları (Dalga 7: PWA daveti/sürüm notu)
export const APP_VERSION = '1.0.0';

export const CHANGELOG: { v: string; lines: string[] }[] = [
  {
    v: '1.0.0',
    lines: [
      '⚽ HM26 tam sürüm: kulübünü yönet, transferlerini ve maç günlerini yaşa, kariyer hikâyeni oluştur.',
      '🎬 Maç günü geliş ve ödül sahneleri, kulübe tepkileri, karşılaştırmalar ve haftalık gazete eklendi.',
      '🤝 Sesli sözleşme yenileme, transfer pazarlığı, piyasa ve kadro ekranları geliştirildi.',
      '💾 Yedekler yüklenmeden doğrulanır; kayıt hataları ve başka sekmeyle çakışmalar bildirilir. Eski kayıt sürümleri desteklenir.',
      '📱 Çevrimdışı güncellemeler sürüme özel önbellek kullanır; yeni sürüm onayınla açılır.',
    ],
  },
  {
    v: '0.9.13',
    lines: [
      '📺 Canlı maç konsolu tamamlandı: sabit skorbug, altı erişilebilir sekme, canlı reyting/kondisyon, gerçek verili şut haritası ve geçici puan tablosu.',
      '🎬 Dalga 3 yayın sunumu: motorun kesinleştirdiği şut/gol ağır çekimi, tercihe bağlı haptik ve metalik direk sesi, azaltılmış-hareket uyumu; vole/direk efektleri simülasyon RNG’sinden bağımsız belirlenir.',
      '🩺 Sakatlıkta bekle/değiştir kararı ve 10 kişi kalma akışı; tek kullanımlık devre arası konuşması; oyuncu dönüşü ve maçın adamı için deterministik eşitlik bozma.',
      '🎛 Kenar komutları, tribün tepkisi, VAR ve derbi sunumları kozmetik katmanda kalır; maç motoru sonucunu sunum efektleri değiştirmez.',
    ],
  },
  {
    v: '0.9.12',
    lines: [
      '🧤 Canlı sahada kaleci topun tehdit yönüne göre açısını daraltır; forvet, orta saha ve bekler hücum/savunma bağlamına göre daha akıcı konum alır.',
      '🦸 Kaleye giden bazı şutlarda savunmacı çizgiden çıkarma yapabilir: olay motor, skor/şut/köşe verisi ve Phaser animasyonunda tek bir yapılandırılmış aksiyon olarak eşleşir; rapor vuruş haritasında ayrı gösterilir.',
      '📐 Deplasman top koordinatları saha görünümüne tek kez çevrilir; kaleci ve takım blokları topun gerçek görsel konumunu takip eder. Phaser sahası ekran okuyucu için etiketlendi.',
    ],
  },
  {
    v: '0.9.11',
    lines: [
      '📺 Canlı maç yayını yenilendi: saniyeli skorbug; xG, şut, isabet ve korner; son gol bandı ve son 5 dakikanın baskı/momentum göstergesi.',
      '🏟 Phaser saha artık çizgili/aydınlatmalı çim, gölgeli yüksek top ve Bézier pas/şut hareketi, atış izi, topa göre zonal takım blokları ve top sahibi haleli forma numaralarıyla çiziliyor.',
      '🎛 Kenar yönetimi: 15 dakikalık yüksek pres veya kontrollü tempo talimatı (10 dakika tekrar bekleme); skor koru/dengeli/hücum/tam hücum hızlı zihniyetleri; kondisyon, reyting ve kartı gösteren akıllı değişiklik önerisi.',
      '🗣 İtiraz yalnızca aleyhte faul/kart/penaltı penceresinde kullanılabilir; ceza sahası faulleri düşük olasılıkla penaltıya döner. İtiraz 10 dakika bekleme, +15 mücadele etkisi ve %8 menajer sarısı riski taşır; sezonda iki sarı sonraki maç teknik alan cezası getirir.',
      '🔊 Gol anında çoklu titreşim, prosedürel stadyum sesi; 44px dokunma hedefleri, çevrimdışı saha çizimi ve 60 FPS hedefli Phaser render.',
    ],
  },
  {
    v: '0.9.10',
    lines: [
      '🔍 Oyuncu arama güçlendi: değer aralığı filtresi (≤₺1M / ₺1–3M / ₺3M+), "Serbest / Bosman" filtresi ve "Değeri ≤ bütçe" düğmesi tek dokunuş mesafesinde — kısayol sayfasına da bağlantı eklendi.',
      '⚽ Taktik sahası: ilk 11\'deki her oyuncunun isminin altında genel reytingi (GEN) görünür; dizilişi bir bakışta tartarsın.',
      '🎙 MAÇ MOTORU oyuncu seviyesine indi: pas trafiği artık gerçek oyuncular arasında akar (X → Y → Z zincirleri), top kimde bilinir ve düello o oyuncunun teknik/zekâsı ile presçinin defansına göre çözülür; ara pası, orta, yön değiştirme, uzun top ve dripling niyetleri ayrıştı.',
      '📊 Canlı maç karnesi düzeltildi: canlı izlenen maçta golü atan ve asisti yapan oyuncular artık karnelerine işleniyor (skorer +0,8, asist +0,4 reyting); kart faili rastgele değil zincirde faulü yapan oyuncu.',
      '🛠 Derin QA denetim kusurları kapatıldı: PWA tema rengi html↔manifest eşitlendi (açılış titremesi gitti), transfer teklifi/imza butonlarına çift-tıklama kilidi eklendi (bütçe iki kez düşmez), Service Worker artık tüm derleme varlıklarını açılışta önbelleğe alıyor (çevrimdışı güncelleme güvenli), alt panellerdeki 32px dokunma hedefleri 44px boyutuna büyütüldü.',
      '🩺 Sağlık ve kulüp hayatı: riskli sakatlığa iğneyle tek maçlık (%25 nüks) oynatma; ₺300B/14g Avrupa Kliniği sevki; 29+ ağabeyden ≤21 gence günlük form/ritim ve seyrek gelişim desteği; canlı maçta tek kullanımlık kenardan itiraz (%8 kulübe kartı riski).',
      '🔁 Piyasa transferine oyuncu+nakit takası eklendi: takas oyuncusu için piyasa değerinin %85\'i teklif hesabına yazılır; kadro/loan kontrolleri, çift taraflı kulüp sahipliği ve transfer geçmişi korunur.',
      '📡 Canlı maç olay akışı onarıldı: maç artık "Maç başladı" satırıyla açılıyor (akış ilk saniyelerde boş kalmıyor); akış penceresi hız düğmelerinin üstüne taşmıyor; tam ekran Akış modu gerçek anlamda tam ekran, Saha modu sade saha; alt çubuktaki "İstatistik" düğmesi doğru adına kavuştu: "Akış".',
    ],
  },
  {
    v: '0.9.8',
    lines: [
      '🖼 Gömülü görsel paket: 36 kulübün gerçek armaları uygulamaya işlendi (skorbord/listelerde kompakt, kulüp seçimi ve maç önü ekranında tam sürüm); görsel yüklenemezse özgün çizgisel arma otomatik devreye girer.',
      '🔣 72 oyun sembolü gömüldü (43 krem + 29 koyu-yeşil ton): alt menü, üst çubuk, Daha paneli, gelen kutusu, tesisler ve boş durum kartları artık PNG ikonla; eksik/bozuk dosyada vektör piktogram korunur.',
      '🏷 HM26 marka seti uygulama içinde: üst çubukta altın şeffaf wordmark; tüm görseller çevrimdışı pakete dahil (vektör SVG + WebP sayesinde ~1,9 MB — eski PNG paketinin üçte biri).',
      '🌗 Tema geçişi düzeltildi: Açık ⇒ koyu-yeşil ikonlar, Koyu ⇒ krem ikonlar otomatik; simgeler artık hiçbir temada kaybolmaz (çift varyant + CSS sınıfı, anında geçiş).',
    ],
  },
  {
    v: '0.9.7',
    lines: [
      "➕ Tam profildeki 'İlk 11'e Al' düğmesi artık koşulsuz olarak yuva-atama akışını başlatır: Taktik ekranına geçilir, uyumlu saha yuvaları yeşil parlar ve dokunduğun yuvaya oyuncu yerleşir (uyumsuz hedeflerde iki aşamalı uyarı korunur).",
      "👆 Dokunma erişilebilirliği doğrulandı: sahada 11 yuvanın tamamı en az 64×48 dp dokunma hedefine sahip (44×44 dp asgari standardının üstünde); görünür numara çemberi 29px olarak korunuyor.",
    ],
  },
  {
    v: '0.9.6',
    lines: [
      "🎨 Logo paketi (revizyon 02) uygulandı: 36 kulübün tamamına yeni ana/ikincil/vurgu renkleri işlendi (Denizli Yeşilova #08764F/#FFF3D9/#DA5345 dahil). Arma, forma noktası, stadyum sahici ve canlı maç gölgeleri otomatik olarak yeni kimliğe geçti.",
      "🛡️ Arma çizimi: dış kontur artık mümkünse vurgu rengiyle çizilir; etiket rengi sabit liste yerine parlaklık ölçümüyle seçilir — açık zeminli armalarda kontrast korunur.",
    ],
  },
  {
    v: '0.9.5',
    lines: [
      "📊 Yeni sekme: İstatistik & Ödüller — Gol/Asist/Maç Puanı/Kaleci (gol yememe) krallıkları canlı veriyle sıralanır; Hırçınlar & Centilmenler takım karakterini özetler; Kupa Vitrini ve sezon sonu bireysel ödülleri tek merkezde.",
      "🧤 Maç motoru artık kalecinin yediği golleri ve gol yememediği maçları (clean sheet) izler; 'Bu Sezon' kartı kalecilerde şartname düzenine göre Maç/Yediği/Gol Yememe gösterir.",
      "🗂️ Oyuncu tam profiline 'Kariyer Dökümü' eklendi: geçmiş sezonlar sezon sonunda arşivlenir, güncel sezon canlı satır olarak en üstte görünür. Sahte geçmiş üretilmez — veri oynandıkça birikir.",
      "🧩 Kayıt şeması geriye uyumlu genişletildi (forma numarası, rozetler, mentorluk altyapısı alanları) — eski kayıtlar sorunsuz açılır.",
      "👆 Taktik: 6 yedek kartı da artık her zaman tıklanabilir — önce yedeğe dokun, uyumlu saha yuvaları yeşil parlar, yuvaya dokununca sahaya girer. Uyumsuz hedeflerde gerçek güç-cezası yüzdesini gösteren iki aşamalı onay ve yuva→yuva takas akışı aynen korunur.",
    ],
  },
  {
    v: '0.9.4',
    lines: [
      "🗑 Kayıt yuvaları: kariyer kartına görünür silme butonu eklendi; ⋯ yönet menüsü artık karta tıklamayla karışmaz (oyuna girmek yerine menü açılır); aktif yuva silinirse ana menüdeki 'hızlı devam' hayaleti de temizlenir.",
      "⚠️ Taktik: mevki dışı uyarısının nedeni artık açık — uyumsuz yuvaya/uyumsuz yedeğe ilk dokunuşta üçgenin anlamını ve maç motorundaki güç cezasını (yaklaşık %) söyleyen açıklama şeridi çıkar; aynı hedefe ikinci dokunuş onaylayıp atamayı uygular.",
      "🔣 v0.9.3: Özel oyun sembolleri (29 piktogram) tasarım dosyasıyla birebir hizalandı (alt menü, Daha paneli, tüm ikon yüzeyleri).",
    ],
  },
  {
    v: '0.9.2',
    lines: [
      "🎯 Tam profil 'İlk 11'e Al' zinciri sıkılaştırıldı: hızlı kartın tam profil geçişinde artık altlık sheet kapanır (çifte diyalog yok); atama akışı Taktik üzerinde yeşil yuva parlatmasıyla tamamlanır.",
      "⚠️ Mevki dışı kullanım uyarısı: bir oyuncu yuvanın mevki grubu dışında oynatılıyorsa yuva kenarında küçük turuncu üçgen belirir (maç motorunda güç çarpanı cezası vardır).",
      "🧭 v0.8.3: Tarayıcı geri/ileri tuşu artık site içinde gezinir (siteden çıkarmaz); modallara klavye odak kapanı (focus trap) eklendi.",
      "🎨 v0.9.0: Karakter Atölyesi — menajer editörü 3 sekmeli (Saç / Yüz & Göz / Kıyafet); 7 saç, 5 göz, 6 göz rengi, 5 kıyafet, 3 sakal, 3 gözlük seçeneği; oyuncu portreleri kulüp renkleriyle deterministik yenilendi.",
      "👆 v0.9.1: Atölye dokunmatik alanları 44px standardına çekildi.",
    ],
  },
  {
    v: '0.8.2',
    lines: [
      "🧹 Kod cilalama: 65 ölü bildirim (kullanılmayan import/değişken/parametre/fonksiyon) sıfıra indirildi — setTacticFormation, buildPitchCommand, MIN_EVENT, pickS, analysisLvl (Sistem E kalıntıları) vb. temizlendi; saveNow imzası sadeleşti; maç motorundaki tüketilmez rng hilesi giderildi.",
    ],
  },
  {
    v: '0.8.1',
    lines: [
      "🩹 Menü QA düzeltmeleri: 'İlk 11'e Al' butonu artık oyuncuyu Taktik ekranına taşır; uyumlu yuvalar yeşil parlar, birine dokununca oyuncu o yuvaya yerleşir (işgalci kulübeye iner).",
      "🎽 Kadro listesinde XI (ilk 11) / YDK (kulübe) rozetleri; tam profile 'Bu Sezon' karnesi eklendi (Maç / Gol / Asist / Ortalama / Kart — playerStats birikiminden).",
    ],
  },
  {
    v: '0.8.0',
    lines: [
      '📐 UI Prototip (C dalgası) — Taktik: başlık + kulüp alt satırı + diziliş düğmesi (⚙ → Formasyon sekmesine iner); plan sekmeleri yuvarlak altın stil; yatay şeritli prototip saha (68×105, yeşil zemin, 29px numara rozetleri, seçili altın halka), "Otomatik 11" metin bağlantısı, YEDEKLER bölümü küçük kartlar.',
      '🏷 Rebrand: MANAGER26 → HM26 (uygulama başlığı, manifest, açılış alt-metinleri, kurulum metni, dosya adları). Kayıt dosyaları artık hm26-* export edilir; eski manager26-* dosyalar içe aktarılmaya devam eder (veri çekirdeği aynı).',
    ],
  },
  {
    v: '0.7.1',
    lines: [
      '📐 UI Prototip (B dalgası) — Kadro: üst özet şeridi (oyuncu/ort. genel/risk), tekil yuvarlak filtre sekmeleri, oyuncu arama alanı, Genel/Form/Yaş döngülü sıralama düğmesi; satırlar prototip düzeninde (avatar + isim/meta/form satırı + altın GEN rozeti), SATIŞTA/KİRALIK/SÖZ rozetleri korundu.',
      '🛒 Piyasa: başlık + pencere durum rozeti, transfer bütçesi barı (TB + yabancı kota), 3 ana sekme + "Diğer" çekmecesi (Gelen Teklifler/Sözleşmeler/Geçmiş), kısa liste ★ ikon düğmesi (kalıcı), "Değeri ≤ bütçe" filtresi, teklif akışında canlı "sonrası kalan TB" önizlemesi.',
    ],
  },
  {
    v: '0.7.0',
    lines: [
      '📐 UI Prototip entegrasyonu (A dalgası): yeni HM26 header (marka + tarih rozeti + inbox badge), 5 sekmeli alt navigasyon (Merkez/Kadro/Taktik/Piyasa/Daha), menü çekmecesi yerine "Daha" paneli (Kulüp, Müsabakalar, Kariyer, Ayarlar, Yedekleme).',
      '🏟 Merkez yeniden tasarlandı: kulüp başlığı, altın çentikli maç kartı (VS düzeni), 2×2 metrik grid (TB / sezon hedefi / maaş barı / kadro uygunluğu), antrenman ayarları artık dokunulan kart → panel; "Sonraki Gün" büyük altın CTA olarak alt çubuğa taşındı ve maç günü "Maç Merkezine Git" olur.',
    ],
  },
  {
    v: '0.6.6',
    lines: [
      '🎬 Açılış tamamen sinematik: kapak görseli artık tam ekran (zemin görselin kendi karanlığına akacak şekilde 2344px\'e uzatıldı); açıklama metni ve özellik çipleri kaldırıldı — sadece Devam Et / Başla butonları.',
    ],
  },
  {
    v: '0.6.5',
    lines: [
      '🖼 Yeni ana menü kapağı: tünelden sahaya bakan menajer sinematik görseli — HM26 monogramı üstte, 2 MB PNG yerine 50 KB WebP (açılış hızı korunur).',
      '💾 Açılış kapağı Service Worker ön-belleğine eklendi: çevrimdışı ilk açılışta da görsel hazır.',
    ],
  },
  {
    v: '0.6.4',
    lines: [
      '📈 Puan tablosunda Son 5 Maç form şeridi: her kulübün satırında G/B/M renkli mini-barlar (soldan yeniye, yoğunluk artan).',
      '🔎 Derin-QA raporu (canlı v060 build) doğrulandı: 8 BUG\'ın tamamı ve gap\'lerin büyük kısmı v0.6.1–0.6.3 dalgalarında zaten kapalı — kanıtlar QA-REPORT\'ta.',
    ],
  },
  {
    v: '0.6.3',
    lines: [
      '🎨 Yeni HM26 logo seti: ana ikon, şeffaf artwork ve tek renk monokrom siluet — PWA manifesti üç boyutta güncellendi.',
      '🤝 Transfer pazarlığı (v0.6.2): sözleşme süresi (2–5 yıl) × rol statüsü (Rotasyon/İlk 11/Yıldız) oyuncu maaş talebini ve kulüp bonservis eşiğini etkiler; yıldıza otomatik süre sözü kaydedilir.',
      '🐛 Maaş bütçesi kalıcılığı (v0.6.2): maaş tavanı artı artımları artık hiçbir finans hareketinde silinmiyor.',
    ],
  },
  {
    v: '0.6.0',
    lines: [
      '📺 Canlı maç dikey sahaya geçti: tüm koordinat katmanları (SVG + Phaser + raporlar) tek orana kilitlendi, map dışına çıkma imkânsız.',
      '⚽ Gol topu artık ağda patlıyor; deplasman atakları tam 180° yönde.',
      '💼 Bütçe aktarımı: Transfer → Maaş slider (₺1M = +₺0,05M/ay); maaş tavanını aşan imzalar kapatılır.',
      '🔁 Taktik tahtasında 11 içi takas: yuvaya dokun → başka yuvaya dokun ↔ yer değişir.',
      '🧑‍🎨 Menajer yüzü özel tasarım: 4 saç stili × 6 renk × ceket/kravat + sakal; profilde canlı.',
      '✉ Inbox simgesi + "İlgili Bölüme Git" navigasyonu düzeltildi.',
    ],
  },
  {
    v: '0.5.5',
    lines: [
      '⏱ Söz verilen süre: rol beklentisine göre dakika memnuniyeti; kırgın oyuncu yenileme masasına oturmaz; "Süre Sözü Ver" ile güven yönet.',
      '🟨 Hub uyarıları: kadro 28/30 dolunca bant, dolunca kilit uyarısı; cezalı oyuncular ayrı şerit.',
      '🏆 Sezon ödülleri töreni: Gol/Asist/MVP/Genci taç giyme ekranı (deterministik).',
      '🔀 IFAB kuralı: 5 değişiklik / 3 durak; devre arası serbest; yorgunluk uyarısı 60+ dakikada.',
      '🌍 Yabancı kotası (Zirve 8 / Geçit 5 / Kök 3) · Bosman serbesti · Kiralık (₺0 + yarı maaş).',
      '📊 Maç raporu: vuruş haritası, koridor payı, 11+11 maç karnesi — hepsi motor ölçümü.',
    ],
  },
];

const KEY = 'm26-seen-version';
export const unseenChangelog = (): string[] => {
  try {
    const seen = localStorage.getItem(KEY);
    if (seen === APP_VERSION) return [];
    return CHANGELOG.map((c) => `${c.v}: ${c.lines[0]}`).concat(CHANGELOG[0].lines);
  } catch { return []; }
};
export const markChangelogSeen = () => { try { localStorage.setItem(KEY, APP_VERSION); } catch {} };
