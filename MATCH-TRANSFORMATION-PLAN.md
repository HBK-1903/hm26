# HM26 — Maç Motoru ve Maç Ekranı Dönüşüm Planı

**Kaynak şartname:** `MANAGER26_MAC_MOTORU_VE_EKRANI_DONUSUM_REHBERI.md` (v4)
**Hazırlık tarihi:** 2026-10-26
**Durum:** Dalga 1, 2 ve 3 tamamlandı. v0.9.12 çekirdek fizik checkpoint’i korunuyor; güncel yerel kaynak sürümü v0.9.13. Üretim dağıtımı yapılmadı.

### Güncel ilerleme — 2026-10-26
Wave 2/3 için `npm run build` **başarılı** (TypeScript + Vite + 159 SW precache girdisi); Wave 3 odaklı motor/karar testleri **4/4**, güncel canlı maç E2E **21/21**. E2E; altı sekme/skorbug, haptik aç-kapat, sistem azaltılmış-hareket tercihi ve devre arası konuşmasını doğruladı. Tam `qa:all` ve bağımsız PWA-offline matrisi bu turda yeniden çalıştırılmadı; önceki 21 aşamalı koşu v0.9.12 tarihsel tabanıdır. Phaser lazy-chunk uyarısı önceki kabul kararıyla korunuyor. Detay: `QA-AUTOMATION-LATEST.md`, `QA-REPORT.md`.

## 1. Mevcut başlangıç noktası

Tarihsel başlangıç (bu planın yazıldığı v0.9.11): `npm run qa:all` → 20/20 aşama geçti, 0 başarısız. Bu regresyon tabanı yeni Wave 1 testleriyle genişletildi; güncel sürüm v0.9.12 ve 21/21 aşama geçiyor. Üretim dağıtımı yapılmadı.

| Alan | Şu anki yapı | Dönüşüm için anlamı |
|---|---|---|
| Motor | `src/engine/session.ts` adım adım possession çözüyor; skor, xG, şut günlüğü, olay, kart, sakatlık ve maç içi komutlar burada | Yeni dramatik olayların gerçek motor sonucu burada seçilmeli; ekran metninden sonuç türetilmemeli |
| Olay sözleşmesi | `src/engine/engine.ts` içindeki `MatchStateEvent` bir `anim` alanı tanımlıyor; mevcut canlı olay üreticileri bunu henüz doldurmuyor | Görsel/ses/haptik için sabit, tipli olay verisi eklemek üzere hazır bir genişleme noktası |
| Canlı saha | `src/components/assets/PhaserPitch.tsx`: 2D çim, saha çizgileri, forma numaralı 22 nokta, blok kayması, top izi/yüksekliği/gölgesi ve olay halkaları | Mevcut 2D Phaser yapısı korunarak kaleci/rol hareketi ve overlay’ler eklenebilir |
| Canlı maç ekranı | `src/screens/LiveMatch.tsx`: canlı skor, xG/şut/isabet/korner, momentum, hız, saha/karma/akış görünümleri, kenar komutları ve değişiklik sheet’i | Rehberdeki konsol için üç mevcut görünüm, altı açık sekmeli yapıya evrilecek; mevcut komutlar kaybolmayacak |
| Kondisyon | Oyuncu kondisyonu ve canlı rating `TeamDots` içine aktarılıyor; Phaser oyuncu çiziminde kondisyon göstergesi henüz yok | Ter/adaleye ilişkin işaret doğrudan mevcut canlı fitness değerinden türetilebilir |
| Haptik | Golde `navigator.vibrate` için basit bir titreşim var; katmanlı aksiyon profili yok | Desteklenmeyen cihazda sessizce düşmeli; azaltılmış hareket tercihi ve etkileşim dışı kullanım korunmalı |
| Görsel yükleme | Phaser yalnızca maç ekranında lazy-load ediliyor ve offline precache mevcut | Kabul edilen Phaser chunk uyarısı artırılmaya çalışılmadan lazy-load/offline davranışı korunacak |

## 2. Önerilen uygulama sırası

Rehberdeki üç dalga korunur. Her dalga ayrı kodlama ve regresyon kapısından geçer; sonraki dalgaya önceki dalganın testleri yeşil olmadan geçilmez.

### Ön hazırlık — olay sözleşmesi ve senaryo test altyapısı

1. `MatchStateEvent.anim` alanını yapılandırılmış, tipli bir aksiyon sözleşmesine dönüştür: sabit olay türü, taraf, dakika/saniye, aktör ID’leri, saha rotası, sonuç ve görsel önem seviyesi.
2. Metinleri görsel davranışın ana anahtarı yapma. `"direğe çarptı"` gibi metinleri parse etmek yerine `woodwork`, `line_clearance`, `injury_decision` gibi semantik olay türleri üret.
3. Olasılığı düşük olayları doğrulamak için deterministik senaryo/seed fixture’ları ekle. Testler yalnız “N maçta ortalama oran” kontrol etmesin; olayın önkoşulunu, tek kez skor/istatistik etkisini ve doğru aktör/path verisini doğrulasın.
4. Ekran animasyonu motorun skorunu ikinci kez uygulamasın. Motor sonucu tek kez belirler; Phaser/React sadece sunar. Animasyon sürerken sonraki motor adımı gerekirse bekletilir.

**Ön hazırlık kabulü:** TypeScript temiz; yeni event sözleşmesi normal olayları değiştirmez; aynı seed aynı sonuçları üretir; güncel 21 aşamalı `qa:all` tabanı geçer.

### DALGA 1 — Saha/oyuncu fiziği ve pozisyon olayları

**Dosyalar:** `src/engine/session.ts`, `src/engine/engine.ts`, gerektiğinde `src/engine/possession.ts`; `src/components/assets/PhaserPitch.tsx`; testler `tools/qa-match-transformation.ts` ve canlı maç E2E.

1. **Kaleci açısı ve tehdit takibi:** Kaleciyi yalnızca sabit kale çizgisi noktasında değil, topun konumu ile olası şut koridoruna göre sınırlı aralıkta hareket ettir. Motorun kaleci xG/şut sonucu ile sahadaki görsel pozisyon aynı aksiyon verisini kullanmalı.
2. **Rol temelli hareket:** Forvet arkasına koşu, kanat koşusu, bek bindirmesi ve savunma çizgisi blok hareketlerini oyuncu/rol/aksiyon durumuyla sınırla. Top sahibi/aktif aktör vurgusu devam etmeli.
3. **Hava topu ve gölge:** Mevcut top yüksekliği/gölge sistemini uçuş rotası boyunca eşleştir; yüksek topun büyüklüğü ve zemin gölgesi birlikte ve tutarlı güncellensin.
4. **İlk dramatik olaylar:** Motor destekliyorsa direk, akrobatik vuruş, tehlikeli frikik/baraj ve çizgi üzeri müdahale için ayrı olay türleri ve Phaser animasyonları. Her aksiyonun motor sonucu önce belli olur; görsel sonuç onu değiştirmez.
5. **Çizgiden çıkarma:** Sadece savunmacının gol çizgisine ulaşabildiği, kalecinin geçildiği ve topun çizgiyi tamamen aşmadığı pozisyonda üret. Kurtarış/korner/şut istatistiklerini gerçek sonuca uygun tek kez işle.

**DALGA 1 kabulü:** Kaleci ve rol hareketi sabit seed senaryolarında beklenen saha tarafında; toplar/responsive ölçekte saha dışına taşmıyor; çizgi kurtarma/şut sonucu/skor istatistikleri tutarlı; mobil 390×844 ve 360×800 görünümünde canvas taşmıyor; offline ve `qa:all` yeşil. **Durum:** tamamlandı; doğrulanmış v0.9.12 tabanı korunuyor.

### DALGA 2 — Scorebug ve maç konsolu sekmeleri + taktiksel röntgen

**Dosyalar:** `src/screens/LiveMatch.tsx`, `src/components/assets/PhaserPitch.tsx`, ihtiyaç halinde `src/engine/session.ts`; yeni UI ve Playwright E2E.

1. **Sabit Scorebug:** Ekranın üstünde sabit kalır; skor, dakika/saniye/uzatma, devre, xG, şut/isabet ve hız/duraklatma kontrolleri birbiriyle çakışmaz.
2. **Altı konsol sekmesi:** Saha; Reytingler & Karne; Değişiklik; Analiz & Şut Haritası; Canlı Puan Durumu; Spiker & Maç Günlüğü. Rehberdeki şekil beş sekme çiziyor ancak açıklama altıncı “Spiker & Maç Günlüğü” sekmesini de tanımlıyor; planda altı içerik de korunur.
3. **Kenar talimatı:** Saha alanındaki dağınık kontroller tek bir yüzen `Kenar Talimatı` sheet’inde toplanır. Mevcut hız, zihniyet, itiraz, pres/tempo ve değişiklik kabiliyetleri kaldırılmaz; uygun sekme/komut grubuna taşınır.
4. **Canlı reyting/karne:** 22 oyuncu, rating, şut, pas/mücadele gibi mevcut istatistikler ve canlı kondisyon; oyun dışı oyuncular uygun biçimde ayrıştırılır.
5. **Şut haritası ve hücum kanalı:** Mevcut `shotsLog`, `wideAtt*` ve `centralAtt*` istatistiklerinden yararlan; sahadaki takım yönünü ve şut koordinatlarını tek bir normalleştirme kuralıyla göster.
6. **Isı haritası:** Motorun gerçek top rotası/possession bölgelerinden iki takım için birikimli veri üret; aç/kapa ve takım filtresi olsun. Görsel “sıcaklık” gerçek motor aksiyonlarını temsil etsin.
7. **Pres aurası ve kondisyon işareti:** Pres komutu ve topun rakipte olma durumu aura’yı etkinleştirir; fitness <%50 olan oyuncuda anlaşılır ter/adaleye işareti gösterilir. Eşik/UI verisi tek kaynaktan gelsin.
8. **Canlı tablo:** Geçici maç içi sıralama, maç bitmeden kayıtlı tabloya kalıcı sonuç yazmamalı.

**DALGA 2 kabulü:** Altı sekme klavye/erişilebilir adlarla kullanılabilir; hızlı geçişte motor durumu kaybolmaz; 390×844 ve 360×800’de scorebug sabit ve alt konsol erişilebilir; 44px dokunma hedefleri; overlay aç/kapa doğru; şut haritası sonuç istatistiğiyle eşleşir; test/offline/lazy-load regresyonu geçer. **Durum:** tamamlandı; wave-specific canlı E2E kontrolleri geçti.

### DALGA 3 — Adrenalin, aksiyon gerilimi ve soyunma odası

**Dosyalar:** `src/engine/session.ts`, `src/engine/engine.ts`, `src/screens/LiveMatch.tsx`, `src/components/assets/PhaserPitch.tsx`, gerekirse `src/audio/engine.ts`, store ve yeni QA/E2E.

1. **Gol/şut sinematiği:** Topun aksiyonu, kamera/ölçek yaklaşması, yayın golcü bandı ve kısa slow-motion. Slow-motion yalnız sunum katmanında olmalı; simülasyon hızını, gerçek maç dakikasını veya skor hesabını değiştirmemeli.
2. **Haptik/ses/titreşim:** Şut, gol, direk ve kritik karar için farklı profiller. `navigator.vibrate` yoksa hata/console gürültüsü olmadan devam et; `prefers-reduced-motion` ve kullanıcının ses/titreşim tercihlerine uy.
3. **Sekiz dramatik olayın tamamlanması:** (a) çizgiden çıkarma, (b) faul sonrası itişme/hakem çevresi, (c) 90+ kornerde kalecinin yükselmesi, (d) tehlikeli frikik/baraj, (e) vole/röveşata, (f) sakatlık ve 10 kişi kalma kararı, (g) direk, (h) VAR/ofsayt incelemesi. Her biri motor önkoşuluna bağlı ve testle zorlanabilir olmalı.
4. **Sakatlık kararı:** Oyuncu sakatlığında maç kısa süre durur ve “bekle/dönüşünü bekle” ya da “değiştir” seçeneği sunulur. Bekleme sırasında takımın kaç kişiyle ve kaç *maç dakikası* oynadığı açıkça gösterilir; değişiklik IFAB 5/3 durağı aşamaz.
5. **Kenardan reaksiyonlar:** Dördüncü hakeme itiraz ve tribünü ateşleme gibi komutlar uygun maç durumu/ev sahibi koşuluyla görünür; etkileri yalnız UI metni değil, motor ve event testleriyle doğrulanır.
6. **Devre arası team talk:** İlk yarı bittiğinde motor durur, skor/performansa uygun konuşma seçenekleri çıkar. Rehberdeki hırs, pas isabeti, sakinlik ve risk etkileri ikinci yarı için tek sefer uygulanır; sessiz kalma da açıkça tanımlanır.
7. **Maç sonu:** Mevcut rapor/sonuç akışına POTM’yi (maçın oyuncusu) bağla; mevcut canlı karne ve istatistikten deterministik seç, eşitlik kuralı sabit olsun.

**DALGA 3 kabulü:** Motor-gated gol/şut, direk/vole, VAR, çizgi müdahalesi ve faul/derbi olayları sunum katmanında çalışır; sunum cue’ları sabit hash kullanır, motor RNG’si/sonucu değiştirmez. Sakatlıkta bekle/dönüş veya değişiklik seçeneği ve iki dakika 10 kişi; devre arası konuşması tek kullanım; azaltılmış hareket/haptik/ses tercihleri; deterministic POTM tamamlandı. **Durum:** tamamlandı; karar/motor odaklı testler 4/4, canlı E2E 21/21, build geçti. Bu turda tam `qa:all` ve çevrimdışı matrisi yeniden çalıştırılmadı.

## 3. Test kapıları

Her dalgada sırasıyla:

1. `npm run build` — TypeScript, üretim chunk’ları ve Service Worker precache.
2. İlgili saf motor testleri — seed tekrarı, skor/şut/istatistik invariants, event önkoşulları, substitution/oyuncu sayısı ve xG tutarlılığı.
3. İlgili Playwright E2E — 390×844 ve 360×800, gerçek canvas/sekme/overlay/karar akışı.
4. PWA offline doğrulaması — ekran ve gerekli yerel paketler çevrimdışı açılır; yeni dış ağ bağımlılığı eklenmez.
5. `npm run qa:all` — güncel 21 aşama ve yeni dalga testleri birlikte.
6. QA raporu güncellemesi. Yerel build/ZIP üretilebilir; ayrıca istenmedikçe **canlı deployment yapılmaz**.

## 4. Uygulamadan önce netleştirilecek ürün kararları

1. **Canlı puan tablosu:** Aynı haftadaki diğer maçlar canlı deterministik olarak simüle edilip geçici sıraya mı yansısın; yoksa yalnız izlenen maçın sonuçlarıyla sınırlı tablo mu gösterilsin? Mevcut canlı oturum tek maçı ilerletiyor.
2. **Team talk süre/etki:** Rehberde etkiler sayısal olarak yazıyor ancak etki süresi ve sakin seçenek için “pas isabeti +10% / sakinlik +15%” değerlerinin motor alanlarına eşlemesi belirli değil. Öneri: yalnız ikinci yarıda, maç sonuna kadar bir kez.
3. **Sakatlık bekleme:** “2 dakika 10 kişi” maç dakikası olarak mı sayılmalı? Plan bunu varsayıyor; kullanıcı seçimini beklerken maç saati durmalı mı? Öneri: karar sheet’i açıkken saat dursun; “bekle” seçilirse iki maç dakikası 10 kişi oynansın.
4. **İtişme ve tribün etkisi:** Bunlar yalnız yayın atmosferi mi, yoksa kart/pas hatası olasılığına mekanik etki de uygulansın mı? Mekanik etki istenirse olasılık sınırı ve maç başına kullanım netleşmeli.
5. **Sinematik yoğunluğu:** Slow-motion, kamera yaklaşması, shake ve haptik için varsayılan açık/kapalı ve kullanıcı ayarı kararı. Öneri: kısa ve seyrek; azaltılmış hareket tercihini kesin olarak izlesin.

## 5. Kapsam ve teknik sınırlar

- Phaser’ın mevcut **2D** yapısı korunur. “3D” top/gölge/çizgi efekti, harici 3D runtime veya ağır varlık eklemeden 2D perspektif yanılsaması olarak uygulanır.
- Saha, scorebug, yeni tab’lar ve animasyonlar mobilde okunabilir/tıklanabilir olmalı; kontrol/animasyon hatası maç motorunun deterministik sonucunu değiştirmemeli.
- Yeni harici CDN/asset zorunluluğu eklenmez; Phaser maç ekranında lazy-load ve offline cache olarak kalır.
- Mevcut canlı skor, momentum, hızlı zihniyet, pres/tempo, itiraz, değişiklik, istatistik, mobil ve çevrimdışı akışları korunur.
- Her tur sonunda `QA-AUTOMATION-LATEST.md` bulgular ve açık işler ile güncellenir. Uygulama öncesi hiçbir ürün dosyası bu plan kapsamında değiştirilmedi.
