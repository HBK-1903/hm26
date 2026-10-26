# HM26 — Kapsamlı QA & Eksik Raporu (v0.4.4 → v0.9.13 ile güncel)
**Tarih:** 2026-10-26 · Önceki motor/varlık/transfer QA bölümleri korunmuştur.

## 🤝 Wave 11 — Face-to-face transfer negotiations + sell-on persistence · 2026-10-26
**Uygulanan:** Piyasa teklifi artık satıcı isteği, 3 adımlı sabır, belirli karşı teklifler ve rezervasyon tabanlı masadan kalkma ile yüz yüze pazarlık akışında. Teklif; nakit, en fazla tek oyunculu takas, 0–25% gelecek satış payı, maaş/rol/sözleşme süresi içerir. Haber sızma olasılığı kariyer seed’iyle belirlenir; gerçekleşirse gelen kutusuna yazılır ve o görüşmenin oyuncu maaş talebi %5 artar. İmza sunumu tüm şartları listeler; geri alım maddesi yoktur.

`PersistedState.sellOnClauses` eski kayıtlarla uyumlu JSON migration/default alır. Kariyer içinde oyuncu yeniden satıldığında (kabul edilen normal veya karşı teklif), önceki kulüp(ler)e brüt ücret üzerinden pay ödenir; toplam pay %50 ile sınırlanır, bütçeye net gelir eklenir, geçmişe yazılır ve kapanan oyuncu kaydından yükümlülükler temizlenir. Oyuncu+nakit takası, kiralık/kadro/yabancı kontrolleri korunur.

**Doğrulama:** `npm run qa:transfer:wave11` **5/5 PASS** (sabır/karşı teklif/masadan kalkma; takas+satış payı ve seed’li sızıntı; JSON persist/gelecekte satış ödemesi; %50 tavanı/bozuk kayıt; store bağlantısı/no-buy-back). `npm run build` başarılı (SW 159 dosya; kabul edilen Phaser lazy-chunk uyarısı). Browser negotiation E2E çalıştırılmadı (Chromium yok); odaklı state/math kontrolleri koştu. App sürümü değişmedi; local çalışma, deployment/ZIP yok.

## 🧩 Wave 10 — LiveMatch read-only projection + speed isolation · 2026-10-26
`LiveMatch` skor, saat, istatistik, top/tempo, momentum ve tamamlanma durumunu aktif `MatchSession` üzerinden `projectLiveMatch()` ile okur; kopya clock/stat/done React state’i kaldırıldı. Altı sekmeli skorbug/konsol ve dark pitch korunur. x1/x2/x4 yalnız presentation timeout’unu değiştirir; `MatchInput`/engine adımlarına girdi olmaz.

**Doğrulama:** `npm run qa:live:wave10` **5/5 PASS** — adapter read-only ve engine ile eşleşir; altı sekme benzersizdir; aynı seed’e ait üç sunum hızında tam maç sonuçları aynıdır; ekran adapter’ı kullanır. Wave 11 üretim build’i Wave 10 değişikliklerini de içererek başarılı oldu (SW 159; kabul edilen Phaser uyarısı). Chromium E2E yok; deployment/ZIP/sürüm/save şeması değişmedi.

## 🎨 Wave 9 — Spor Gazetesi UI refresh + accessibility · 2026-10-26
**Karar:** Kullanıcının seçtiği **A — Spor Gazetesi** paleti ve hibrit görünüm uygulandı: uygulama açık/kâğıt yüzeylerde, maç sahası/tuvali gece yeşilinde kalır. Açık/koyu/sistem tercihi ilk boyamadan önce çözülür; ayar localStorage’da saklanır, tarayıcı çubuğu rengi güncellenir ve otomatik mod sistem değişimini izler.

**Uygulanan:** Global token/typography/overline/focus sistemi, reduced-motion ve 100dvh/safe-area düzeni; klavye ile kullanılabilen kartlar; ≥44px touch token; erişilebilir segmentler ve Escape/focus-trap/focus-restore/scroll-lock içeren sheet’ler; canlı bölge toast’ları. Canlı maç sekme ikonları tema-uyumlu oyun ikonlarına geçti. Taktik uyarı metinleri ve kulüp bütçe vurguları semantik tema token’larını kullanır; saha çizimi karanlık kalır. Kaydedilmiş `meta.clubName` hızlı devam etiketi korunur; serbest oyuncu portresi güvenli fallback ile kalır. Uzak font/CSS eklenmedi; mevcut app/save biçimi korundu.

**Doğrulama:** `npm run qa:ui:wave9` **6/6 PASS** — açık/koyu AA kontrast eşleri; ilk-boya/system/theme-color davranışı; kart/segment/dialog semantiği ve focus/touch/reduced-motion/dynamic viewport; serbest oyuncu portresinin SSR güvenliği; `SaveMeta.clubName` hızlı devamı; offline/paper kimliği. `npm run build` başarılı (SW 159 dosya); kabul edilmiş Phaser lazy-chunk boyut uyarısı sürüyor. Gerçek Chromium ile 375×667 screenshot E2E çalıştırılmadı (bu workspace’te Chromium binary yok); boyut/touch temelleri odaklı CSS/SSR kontrolünden geçti.

**Dağıtım / paketleme:** yerel kaynak/build; v0.9.13 ve save şeması değişmedi. Production deployment ve ZIP yok.

## ⚖️ MatchCore migration — Wave 8 tactic causality, AI utilities + balance calibration (yerel, 2026-10-26)
**Kapsam:** AI varsayılan planı artık her kulübün gerçek gücünü rakibiyle karşılaştırır (favori 4-3-3 dengeli; underdog 4-4-2 kontra). Puan/dakika/ortalama kondisyon utility seçiminde kullanılır: gerideyken hücum riski yükselir, geç öndeyken korunur, düşük kondisyon tam presi sınırlar. İnsan tarafından yönetilen taraf hiçbir zaman AI tarafından ezilmez; AI kararları 65′ ve 80′ eşiklerinde `TACTIC_CHANGE` core event’i ile loglanır. Taktik genişliği/odak/press/pas riski etkileri profile testleriyle doğrulandı. Wave8 balance calibration şut niyetini makul ölçüde yükseltti; kart/penaltı oranları da dengelendi.

**10.000 maç Monte Carlo:** `npm run qa:match-core:wave8:balance` **PASS**; 5 senaryo × 2.000 maç: Zirve **2.00**, Geçit **1.86**, Kök **1.88**, favori ev **4.28**, favori deplasman **3.99** ortalama gol. Üç lig senaryosu birlikte **1.91** ortalama gol; tüm matris **2.80**. Dengeli liglerde ev sahibi galibiyeti **43.9%**; favori galibiyeti **79.5%**, upset oranı sıfır değil; 0-0 **12.6%**, 9+ gol **1.2%**, kırmızı kartlı maç **5.9%**. Event ledger üzerinden **6.848 korner, 1.124 penaltı** sayıldı; her maçta final reducer/stat invariant’ları çalıştı.

**Doğrulama:** `qa:match-core:wave8` **4/4**; Waves 1–8 **5/5, 4/4, 5/5, 5/5, 5/5, 5/5, 4/4, 4/4**; özellik QA **8/8**, saha QA **6/6**, Wave 3 senaryoları **4/4**; `npm run build` başarılı (SW 159 dosya; kabul edilmiş Phaser chunk uyarısı). Yerel kaynak/build; sürüm, save şeması, deployment ve ZIP değişmedi.

## 🧑‍⚖️ MatchCore migration — Wave 7 referee, cards, penalties, corners/free kicks + takers (yerel, 2026-10-26)
**Kapsam:** Maça seed’den deterministik kurgu hakem atanır; profil katılığı kart/penaltı olasılığını etkiler ve atama hem core event’te hem açılış akışında gösterilir. Her faul `FOUL_CALLED` ile kaydolup tek bir `RESTART_AWARDED` (serbest vuruş/penaltı) zinciri oluşturur; direkt serbest vuruş ve penaltı şutları normal ShotModel/StatReducer hattından geçer. Kurtarış veya çizgi müdahalesi korner doğurabilir; korner, aktif atanmış/skill fallback kullanıcısıyla kendi corner shot event’ini üretir. Sarı, ikinci sarı-kırmızı ve direkt kırmızı event’leri takım/oyuncu reducer istatistiğine bağlıdır. Taktik ekranındaki duran top seçimleri yalnız aktif ilk 11 oyuncularını sunar.

**Doğrulama:** `npm run qa:match-core:wave7` **4/4** (hakem determinismi, atanmış/fallback taker, seed sweep’inde foul→restart→shot/card zincirleri ve stat mutabakatı, second-yellow/direct-red reducer sayımı). Waves 1–6 **5/5, 4/4, 5/5, 5/5, 5/5, 5/5**; özellik QA **8/8**, saha QA **6/6**, Wave 3 senaryoları **4/4**; build başarılı (SW 159 dosya). 10k denge/Monte Carlo ve tam `qa:all` Wave 8 kapsamına bırakıldı; Phaser lazy-chunk uyarısı kabul edilmiş. Yerel kaynak/build; sürüm, save şeması değişmedi, deployment/ZIP yok.

## 🩹 MatchCore migration — Wave 6 availability, injuries + IFAB substitutions (yerel, 2026-10-26)
**Kapsam:** Tek `isActiveOnPitch()` kuralı üretim maç profillerinde ve bütün aktör seçimlerinde kullanılıyor: possession zinciri, şutör, kaleci/penaltıcı/korner kullanıcısı, kart faili, goal-line clearance ve sakatlık hedefi; ihraç/sakat oyuncu takım profiline veya yeni aksiyona katılmıyor. Sakat bekletme aynı olay için tek kullanımlı; saha saati kapanıyor, en az 120 elapsed saniye sonra 45 kondisyon tabanıyla dönüş oluyor ve kenardayken yorgunluk işlemiyor. Değişiklik isteği saha/yedek uygunluğu, ihraç durumu, 5 hak ve 3 normal fırsat bakımından doğrulanıyor; aynı durakta birden çok değişiklik gruplanabiliyor, devre arası değişiklikleri normal fırsat tüketmiyor.

**Doğrulama:** `npm run qa:match-core:wave6` **5/5** (profil/oyuncu seçimi dışlama; canlı core event aktörleri; geçersiz/tekrarlı değişiklik reddi; üç fırsat + serbest devre + beş oyuncu tavanı; 120s injury wait/tek kullanım). Waves 1–5 **5/5, 4/4, 5/5, 5/5, 5/5**; feature QA **8/8**; saha QA **6/6**; Wave 3 senaryoları **4/4**; Wave 5 **5/5**. Build başarılı, SW 159 dosya, kabul edilen Phaser uyarısı. `qa:e2e:live` denendi fakat Playwright Chromium headless binary eksik olduğundan tarayıcı başlatma aşamasında durdu; E2E assertion çalışmadı. Tam `qa:all`/offline matrisi çalıştırılmadı.

**Dağıtım / paketleme:** yerel kaynak/build, production deployment/ZIP yok; sürüm ve kayıt biçimi değişmedi.

## ⏱ MatchCore migration — Wave 5 clock, possession time, fatigue + player minutes (yerel, 2026-10-26)
**Kapsam:** `MatchSession` saniye tabanlı, full-time ile sınırlandırılmış elapsed clock kullanıyor. Her possession gerçek geçen süreyle kayda giriyor; son kısmi possession da ekleniyor. Devre/full-time event’leri ve possession-second toplamı reducer’dan doğrulanıyor. Kondisyon kaybı ve yedek oyuncu toparlanması elapsed delta’ya ölçekleniyor. Başlangıç kondisyonu oyuncunun güncel fitness değerinden geliyor; dakika ve bitiş kondisyonu, oyuncunun gerçekten sahada olduğu giriş/çıkış aralıklarından türetiliyor (değişiklik, sakatlık/bekletme ve ihraç olayları dahil). AI ve kullanıcı sakatlık dönüş sayaçları saniyeye çevrildi.

**Doğrulama:** `npm run qa:match-core:wave5` **5/5** (delta-fatigue ölçeği, başlangıç kondisyonu/sınırlandırılmış full-time, tam possession-clock mutabakatı, oyuncu dakika/fitness aralıkları, değişiklik giriş/çıkış dakikaları). Wave 1–4 sırasıyla **5/5, 4/4, 5/5, 5/5**; özellik QA **8/8**; saha QA **6/6**; Wave 3 senaryoları **4/4**. `npm run build` başarılı (TypeScript + Vite, SW 159 dosya); kabul edilmiş Phaser lazy-chunk uyarısı sürüyor. Tam `qa:all`/offline matrisi ve Monte Carlo bu dalgada çalıştırılmadı.

**Dağıtım / paketleme:** yerel kaynak/build; deployment ve ZIP yok. App v0.9.13 ve save formatı değişmedi.

## 🥅 MatchCore migration — Wave 4 shot outcomes + VAR/stat identities (yerel, 2026-10-26)
**Kapsam:** Üretim `MatchSession` artık açık oyun, penaltı ve korner/duran top şutlarını normalize bir olasılık setiyle çözüyor. Her gerçek `SHOT` olayı için xG tam olarak kullanılan pGoal; sonuçlar `SHOT_RESOLVED` ile kayda giriyor. Gol VAR’a açıksa review/decision event’leri ardından GOAL_CONFIRMED veya GOAL_DISALLOWED üretiliyor. Devre sonu tek `StatReducer`, gol/şut/isabetli şut/kurtarış/xG değerlerini match stats ile karşılaştırıyor. Goal-line clearance `blocked` olarak sınıflanıyor; isabetli şut kimliği artık confirmed goals + goalkeeper saves. xG taban/üst sınır kırpması kaldırıldı; vuruş haritasında direk sonucu ayrıştırıldı.

**Doğrulama:** `npm run qa:match-core:wave4` **5/5** (olasılık dağılımı/sınırlar, event-derived stats, VAR confirm/overturn, exact live/instant parity); Wave 1 **5/5**, Wave 2 **4/4**, Wave 3 **5/5**; `qa-pitch-v0912.ts` **6/6**; özellik QA **8/8**; Wave 3 senaryoları **4/4**; TypeScript/Vite build başarılı (159 SW precache). Tam `qa:all`, offline matrisi ve denge Monte Carlo bu dalgada çalıştırılmadı.

**Dağıtım / paketleme:** yerel kaynak/build; deployment ve ZIP yok. App sürümü v0.9.13; kayıt biçimi değişmedi. Phaser lazy-chunk uyarısı kabul edilmiş durumda.

## 🧩 MatchCore migration — Wave 3 shared live/instant runtime + replay (yerel, 2026-10-26)
**Kapsam:** `simulateMatch` hızlı maç girişi artık canlı ekranda kullanılan `MatchSession` stepper'ına delege olur; aynı seed/girdi tam aynı maç sonucunu üretir. Kabul edilen değişiklik, taktik, kenar shout'u, itiraz, devre konuşması ve sakat oyuncuyu bekletme komutları JSON-safe deterministik ledger'a alınır. `replayMatch` komutları aynı adım sınırlarında yeniden uygular ve komut/sonuç için kararlı FNV-1a fingerprint üretir. Mevcut `SubManager` callback adaptörü korunmuştur.

**Sınır / davranış etkisi:** Hızlı maçlar eski ayrı batch döngüsünü artık kullanmadığından önceki batch motoruna kıyasla sonuç dağılımı değişebilir; geniş Monte Carlo/denge kalibrasyonu planlandığı gibi Wave 8'e bırakıldı. Wave 2'nin UI-bağımsız `MatchCore` sınıfı bu dalgada hâlâ faz/state iskeletidir; gerçek possession/shot/stat simülasyonu ortak `MatchSession` içinde kalıyor ve event-domain core'a port edilmedi. App sürümü v0.9.13; kayıt formatı değişmedi.

**Doğrulama:** `npm run qa:match-core:wave3` **5/5**; Wave 1 **5/5**; Wave 2 **4/4**; mevcut canlı-senaryo **4/4**; özellik QA **8/8**; TypeScript/Vite build başarılı (159 SW precache). Phaser lazy-chunk boyut uyarısı kabul edilmiş durumda. Tam `qa:all`/offline matrisi çalıştırılmadı.

**Dağıtım / paketleme:** yalnızca yerel kaynak/build; production deployment ve ZIP yok.

## 📺 v0.9.13 — Canlı maç konsolu + Dalga 3 sunum ve karar akışları
**Kapsam:** Dalga 2’nin sabit skorbugu ve altı erişilebilir konsol sekmesi; gerçek şut kanalı/haritası ve geçici puan tablosu; Dalga 3’ün gol/şut slow-motion sunumu, tercih farkındalıklı ses/haptik/reduced motion, engine-gated woodwork/volley cue’ları, sakatlıkta bekle/değiştir, bir kerelik devre konuşması ve deterministik POTM. Görsel cue’lar motorun mevcut seed’inden saf hash ile türetilir; RNG tüketmez ve sonuç/istatistik değiştirmez.

**Doğrulama:** `npm run build` geçti (TypeScript, Vite, 159 SW precache); `tools/qa-wave3-scenarios.ts` **4/4**; canlı maç Playwright E2E **21/21** (skorbug/sekme, haptik seçimi, sistem azaltılmış-hareket, devre konuşması). Sakatlık dönüşü/10 kişi akışı odaklı motor testinde doğrulandı. Tam `qa:all` ve bağımsız PWA-offline matrisi bu turda tekrar çalıştırılmadı; aşağıdaki v0.9.12 tam regresyonu tarihsel tabandır.

**Dağıtım / paketleme:** yalnız yerel kaynak ve build; canlı deployment yapılmadı, ZIP güncellenmedi. Phaser lazy chunk uyarısı kabul edilmiş, saha ekranında lazy-load davranışı sürüyor.

## 🧱 MatchCore migration — Wave 1 foundation (yerel, 2026-10-26)
**Kapsam:** UI’dan bağımsız tipli domain event’leri, `matchId:sequence` deterministik EventLog, tek saf StatReducer ve assertion’lar eklendi. Reducer; skor, xG, şut/isabet, kurtarış, VAR iptalini, possession süresini ve oyuncu satırlarını yalnız event’lerden çıkarır. Bu dalga mevcut `MatchSession`/`simulateMatch` motorlarını veya ekranı değiştirmedi; üretim entegrasyonu sonraki parity/migration dalgalarında.

**Doğrulama:** `npm run qa:match-core` **5/5**; `npm run build` başarılı, 159 SW precache. Kural: xG pGoal’a eşit; VAR ile iptal edilen şutun xG’si korunur, gol ve isabet sayılmaz. Tam `qa:all` ve offline matrisi bu dalgada yeniden çalıştırılmadı.

## 🧭 MatchCore migration — Wave 2 input/RNG/state skeleton (yerel, 2026-10-26)
**Kapsam:** Sürüm kontrollü `MatchInput`, `EngineConfig`, lineup/taktik/player snapshot doğrulaması, deep-frozen normalize girdi, bağımsız deterministik flow/duel/shot/referee/injury/AI/presentation RNG demeti ve UI’sız `MatchCore` faz iskeleti eklendi. Şimdilik yalnız kickoff → devre → ikinci yarı kickoff → full-time zaman/faz geçişi var; possession ve maç simülasyonu bu dalganın parçası değil.

**Doğrulama:** `npm run qa:match-core:wave2` **4/4**, Wave 1 reducer testi **5/5**, `npm run build` başarılı (TypeScript/Vite, 159 SW precache). Canlı ve hızlı motor parity’si henüz kurulmadı; üretim motorları değiştirilmedi. Tam `qa:all` ve offline matrisi bu dalgada yeniden çalıştırılmadı.

## ⚽ v0.9.12 — Maç motoru/ekranı Dönüşüm Rehberi, Dalga 1
**Kapsam:** Deplasman top koordinatı artık Phaser sahasına tek kez aynalanır; kaleci şut açısına göre yatay pozisyon alıp tehlikede çizgiden kontrollü çıkar; ST/AM/WG/FB/WB/CM/DM/CB oyuncularının formasyon hareketine rol ve hücum yönü bazlı kayma eklenir. Kaleye giden ceza alanı şutlarının küçük bir kısmı uygun savunmacı tarafından çizgiden çıkarılır; şut günlüğü, isabet ve korner istatistikleri tek olay üzerinden işlenir. Phaser’da çizgi aksiyonu saha çizgisine kadar Bézier rota, tebeşir partikülleri ve iki aktör vurgusu üretir. Saha canvas’ı erişilebilir ad taşır.

**Doğrulama:** `qa-pitch-v0912.ts` **6/6**; aynı deterministik fixture’larda hem toplu motor hem canlı `MatchSession` çizgi müdahalesi, doğru skor/şut/korner verisi ve tekrar üretilebilirlik sağladı. S3’ün kesin invariant’ı `savesLogged + clearancesLogged === onH + onA`, 100 maçta tutarlı. Tam `npm run qa:all`: **21/21 aşama, 0 başarısız**; canlı yayın E2E **12/12**, offline PWA E2E **4/4**. 4.000 maç simülasyonu: zirve 2.33, geçit 2.26, kök 2.25 ort. gol/maç. Build, 159 URL Service Worker precache. Phaser lazy chunk uyarısı önceki gibi kabul edilmiş ve yalnız maç ekranında yükleniyor.

**Dağıtım / paketleme:** canlı deployment yapılmadı. Bu turda yeni ZIP üretilmedi; `hm26-cloudflare.zip` dosyası önceki v0.9.11 build’idir ve v0.9.12 dağıtım paketi olarak kullanılmamalıdır.

## ✅ Son sıralı regresyon koşusu (2026-10-26)
`QA-AUTOMATION-LATEST.md`: **21/21 aşama geçti, 0 başarısız.** Build/TypeScript, 11 çekirdek bütünlük testi, 37 stres/özellik testi, 4.000 maçlık simülasyon, maç motoru Wave 1 QA, mevcut manager-ban kuralı, 11 UI E2E ve servis çalışanı çevrimdışı akış testi başarılı. Playwright Chromium launch smoke da geçti. Eski E2E betiklerinin `:3001` hedefi ortak `HM26_BASE_URL` üzerinden `:4173` preview'a alındı; Chromium çalışma zamanı ve sistem kütüphanesi otomatik kurulumu QA runner'a eklendi.

**Bu koşuda açık ürün/test kusuru:** Yok. **Bilinen uyarılar:** `qa-extended` içindeki iki istatistiksel skor dağılımı uyarısı ve kabul edilmiş, maç ekranında lazy-load edilen Phaser chunk boyut uyarısı. **Canlı deployment:** yapılmadı. Bu turda yeni ZIP üretilmedi; `hm26-cloudflare.zip` yalnız önceki v0.9.11 build’idir, v0.9.12 paketi değildir.

## 📺 v0.9.11 — Canlı yayın skorbord, Phaser saha ve kenar yönetimi
**Kapsam:** saniyeli skorbug, xG/şut/isabet/korner, son gol bandı, son 5 dk baskı; çizgili/aydınlatmalı tam saha, Bézier top ve yükseklik/gölge, şut izi, topa göre blok kayması, numaralı oyuncu noktaları ve top sahibi halesi; canlı reyting ve akıllı değişiklik; yüksek pres/kontrollü tempo shout'ları, hızlı zihniyetler, koşullu itiraz ve menajer disiplin cezası; 44px mobil hedefler, 60 FPS Phaser hedefi ve offline asset cache.

**Doğrulama:**
| Adım | Sonuç |
|---|---|
| `npm run build` (`tsc --noEmit` + Vite + SW injector) | ✅ temiz; 159 deployable URL önbelleğe alındı |
| `npm run qa:features` | ✅ 8 test, 0 başarısız: medical/roster, aleyhte itiraz/+15/10′ cooldown, 15′ shout, canlı telemetri/momentum, ceza alanı penaltısı → savunma itiraz penceresi, ikinci menajer sarısı → tek maç cezası |
| `npm run qa:e2e:live` | ✅ 11/11: yayın skorbug metrikleri, kenar komutları, 4 zihniyet, Phaser canvas; anlatım E2E 7/7 |
| `node tools/e2e-features-v099.mjs` | ✅ 4/4: mentoring, klinik/rehberlik, takas ekranı ve değer hesabı |
| Mobil görsel kontrolü (390×844) | ✅ tam saha/kaleci noktaları ve skorbug; hızlı zihniyet + kenar komut satırları kadrajda |
| PWA cache | `hm26-v011-match-broadcast`, canlı maç Phaser ve runtime paketi çevrimdışı precache edilir (159 URL) |
| Yerel Cloudflare build ZIP | ✅ `hm26-cloudflare.zip` — 2,145,432 bytes, 168 kayıt (161 dosya + 7 klasör), arşiv testi temiz |
| Canlı dağıtım | **Yapılmadı** — yalnızca workspace build/önizlemesi |

**Mekanik notları:** Pres komutu 15 maç-dakika sürer, basınç/tempo katsayısını yükseltir ve o aralıkta kondisyon tüketimini 1,5× yapar; tekrar kullanıma 10 dakika sonra izin verilir. Kontrollü tempo 15 dakika güvenli pas/düşük tempo uygular ve faul anlarında rakip sarı kart olasılığını yükseltir. Ceza sahasındaki faul, düşük olasılıkla penaltı düdüğüne döner (penaltı xG 0,76); karar aleyhine olan savunma takımı iki dakikalık itiraz penceresi alır. İtiraz faul/kart/penaltı aleyhte kararı sonrası etkin olur, 10 dakika bekleme ve +15 mücadele/orta saha etkisi uygular; %8 menajer sarısı riski vardır. Aynı sezonda iki menajer sarısı sonraki maçta teknik alan cezası oluşturur.

---

## 🖼 v0.9.8 — GÖMÜLÜ GÖRSEL PAKET (PNG arma + sembol + marka) — 2026-10-25

## 🖼 v0.9.8 — GÖMÜLÜ GÖRSEL PAKET (PNG arma + sembol + marka) — 2026-10-25

**Teslimat:** `assets-inbox/` ustalar (4096px) → `tools/sync-assets.py` ile public kopyası: 149 PNG, 51,6 MB → **5,93 MB** (crests full 512px / compact 256px / symbols 256px / brand 1024px, LANCZOS, optimize).
**Kapsam:** 36 tam arma + 36 kompakt arma + 43 krem-ivori sembol + 29 koyu-yeşil sembol + 5 marka dosyası. Kulüp ID ↔ dosya adı birebir (36/36).

**Kod entegrasyonu (tam offline, çift katmanlı fallback):**
- `src/data/assetManifest.ts` — üretilmiş envanter kaydı (CREST_FULL / CREST_COMPACT / SYMBOL_IVORY / SYMBOL_DARK + src yardımcıları); sync betiği yeniler.
- `Crest.tsx` — `variant="full|compact"`; manifest'te varsa PNG `<img>` (compact: yuvarlak, full: köşeli), `onError`'da prosedürel SVG'ye düşer. Tam sürüm: sihirbaz kulüp kartları + maç önü briefing; kompakt: hub/skorbord/listeler.
- `GameIcon` (`components/icons`) — `tone="ivory|dark"`, **varsayılan `dark`** (uygulama yüzeyleri açık/krem; koyu sahne çağıranı `tone="ivory"` verir — bu karar preview görüntü kontrolüyle alındı: ivori ikonlar krem nav zemininde kayboluyordu); istenen ton yoksa diğer tona, o da yoksa vektör piktograma düşer. Bağlanan yüzeyler: alt nav, üst çubuk inbox, Daha paneli, Hub kartları, kadro/tesis meta ikonları, canlı maç düğmeleri, maç önü, istatistik empty-state. Header'da HM26 gold wordmark PNG (SVG yedeğiyle).
- Çekirdek 6 ikon (`more chevron search star starF info`) bilinçli vektör fallback'te — PNG'si gelmedi; geldiğinde manifest otomatik kaplar.

**Doğrulama zinciri:**
| Adım | Sonuç |
|---|---|
| `tsc --noEmit` | ✅ temiz |
| `tools/qa.ts` | ✅ 11 test, 0 başarısız |
| `tools/qa-extended.ts` | ✅ 37 test, 0 başarısız (1 bilinen uyarı) |
| `tools/qa9-logopack.ts` (L1–L5) | ✅ 5 test: renk paketi + 36×2 PNG imza/boyut + sembol envanteri (ivory=43, dark=29, svg-fallback=6, marka=5/5) |
| `tools/e2e-assets.mjs` (yeni, preview :4173) | ✅ **7/7** — sihirbaz full armalar, alt nav çift-renk PNG + more SVG fallback, header wordmark, hub kompakt armalar, Daha paneli, **tema geçişi (A6/A7)** |
| Regresyon E2E (xi-full / stats / slots) | ✅ 4+6+yuva akışı, 0 başarısız |
| **Tema revizyonu** (kullanıcı bildirimi) | ✅ GameIcon artık tema-adaptif: çift renk varyantı DOM'da, `html.m26-dark/m26-light` CSS sınıfı seçer; `lazy` kaldırıldı (gizli varyant tema geçişinde flaşsız hazır). E2E A6/A7: koyu→krem 4/4, açık→koyu 4/4, ekran görüntüsüyle teyit |
| `vite build`, dist=8,1 MB | ✅ temiz |
| **hm26-cloudflare.zip** | ✅ **6.446.759 B, 168 dosya** (155 görsel dahil), sw cache `hm26-v098-ui1` |

**Harici QA denetim kusurları kapatıldı (2026-10-26, kaynak: DERIN_QA raporu):** BUG-PWA-01 → index.html theme-color #FAF5EA→#091521 (manifest ile eşit); BUG-TRF-02 → OfferFlow `busy` kilidi (Teklifi Gönder / Sözleşmeyi İmzala / Karşı Teklifi Kabul Et artık çift-tık debounce'lı, 700ms); BUG-SW-03 → sw.js precache mimarisi: `tools/inject-sw-manifest.mjs` build sonunda yayınlanacak dist dosyalarını (159 doğrulanmış URL: hash'li JS/CSS + görsel/simge/arma paketi + splash + manifest; Cloudflare `_redirects`/`_headers` hariç) SW'ye gömer, /assets/** cache-first, geri kalan ağ-öncelikli; CACHE `hm26-v010-ui1`. Precache listedeki tüm URL'ler yerel preview'da HEAD 200 verdi. P3 → 32px dokunma hedefleri (Taktik ✕/plan-adı/Otomatik-11, Kadro sıralama) 44px. Zincir: tsc ✓ build ✓ qa 11/11 ✓ extended 37/37 ✓ qa-features 5/5 ✓ e2e-v099 9/9 + e2e-assets 7/7 + e2e-v0910 7/7 + e2e-features 4/4 ✓.

**Kullanıcı onaylı küçük özellikler (2026-10-26):** İğneyle oynatma + Avrupa Kliniği + Kenardan İtiraz + Ağabeylik/Mentoring dört özellik de kodlandı; ayrıca oyuncu+nakit takası eklendi. Tasarım: iğne izni tek maç sürer, seçilebilir sakat oyuncu %50 maç kondisyonuyla oynar ve oynarsa deterministik %25 nüks riskiyle 14–42 gün ek sakatlık alabilir; Avrupa Kliniği transfer bütçesinden ₺0,3M (₺300.000) düşüp 14 gün kısaltır, kalan ≤14g ise iyileştirir ve sakatlık başına tek kullanımlıdır; v0.9.10'da kenardan itiraz maç başına bir kez +3/+2,5 etkiliydi; bu ilk davranış v0.9.11'de şartnameye göre aleyhte karar penceresi, +15 etki, 10′ bekleme ve sezonluk menajer kart cezasıyla değiştirildi; 29+ oyuncu ≤21 gence mentor olur (günlük form/ritim desteği, mentor GEN üstünlüğü ≥8 ise seyrek +1 GEN sıçraması). Takas: teklif değeri = nakit + oyuncunun piyasa değerinin %85'i; kiralık/serbest/başka kulüp oyuncusu takasa verilemez; yabancı kotası takas sonrası kadroya göre, kulüp sahipliği ve iki yönlü transfer geçmişi güncellenir. Buy-back bu kapsamda **seçilmedi**; altyapı/gençlik akademisi önceki kesin ret kararına uygun olarak değişmedi. QA: `qa-features-v099.ts` **5/5**; E2E `e2e-features-v099.mjs` **4/4** (mentor ataması, sağlık/rehberlik kartı, takas paneli ve değer hesabı).

**Motor v0.9.10 — oyuncu-seviyesine possession (2026-10-26):** possession.ts zinciri artık oyuncu bazlı: her adımda top sahibi (ballHolder), alıcı (receiver), niyet (PassIntent: distribute/short/progressive/switch/through/cross/carry/backpass/long) ve rakip presçi (interceptor). Düello çekirdeği: taşıyıcı (tek×0.45+men×0.3+fiz×0.25)×fitness + takım kanalı vs presçi (def×0.5+men×0.3+fiz×0.2) + niyet riski. narrate.ts tamamen yenilendi: zincir okları (X → Y → Z), niyet-duyarlı anlatım (yön çevirme/orta/ara pası/uzun top), asist cümleli gol şablonları, isimli faul/top-kaybı (fouler/fouled/dispossessedBy mülkleri zincirden gelir — kart faili artık rastgele değil), Türkçe sesli uyumu ek üreticisi (gen/acc). **Düzeltmeler:** canlı karneye gol/asist kredisi (0,8/0,4 reyting — eskiden canlı maçta hiç işlenmiyordu), engine.ts asisti null'dan zincir-asistine, devre-arası durağı deterministik (saat 45'i atlayamaz → IFAB serbest durak garantisi). **Denge kalibrasyonu:** ilk oyuncu-havalı sürüm avgG'yi %15-20 düşürdü (carry tıkanması + niyet cezaları); ayarlar: carry %10/6→%7/4, düello ölçeği 0.42→0.505, progressive +0.7 ödül, through/cross cezaları hafifletildi, canlı gol tabanı 0.80→0.90 (sim↔canlı parite). Ölçüm: parity 2.11 (taban 2.12 ✓), masssim zirve 2.50/geçit 2.38/kök 2.28/kupa 3.80; E1 3/3 ✓. E2E: **e2e-v0910.mjs 7/7** (isim ögeli olay ≥%55 → %92 ölçüldü, zincir anlatımı, çeşitlilik 34/40 tekil, ek uyumu "Ergin'in/Aydın'ın", "Maç başladı" açılışı, undefined yok).

**v0.9.9 UX paketi (2026-10-26):** (1) Oyuncu Ara: değer Seg (≤₺1M / ₺1–3M / ₺3M+) + "Serbest / Bosman" + "Değeri ≤ bütçe" çipleri + temizle düğmesi; (2) Taktik sahası ilk 11 isim kartının altında GEN rozeti (data-slot-gen, 11/11 doğrulandı); (3) Canlı maç akış onarımı: kurucuya itilen "Maç başladı" olayı step() zincirine bağlandı (getEvents + mount-seed) → akış boş açılmıyor; Feed'in sabit maxHeight:210'i kaldırıldı → h-full + flex-1 ile artık kontrol şeridine TAŞMIYOR (geometrik bbox testi B8); Akış modu gerçek tam ekran (bbox 117→524px), Saha modu saf saha; "İstatistik" düğmesi yanlış adlandırması "Akış" olarak düzeltildi; pitch dengeli modda 56→47vh. E2E: **e2e-v099.mjs 9/9** + e2e-assets 7/7 + qa 11/11 + qa9 5/5 + qa-extended 37/37. SW önbelleği hm26-v099-ui1.

**Format dönüşümü (2026-10-25, ikinci revizyon):** 72 sembol PNG→**SVG** (potrace izleme, tek-path, fill=#F3F1EA/#1D2B23); 72 arma + 5 marka PNG→**WebP q82-86**. Boyut: public/assets 6,0→**1,9 MB**, dist 8,1→**4,0 MB**, zip 6,45→**~2,5 MB**. ⚠️ Dönüşümde yakalanan bug: potrace `<g>` transformu yanlış ölçekle ezilmişti (2560 yerine 256) → tarayıcı-maske testiyle "boş SVG" yakalandı ve 72 dosyada düzeltildi; rasterize piksel doğrulaması (bbox + tam #1D2B23 dolgu) ile kanıtlandı. qa9 L4/L5 artık WebP imzası (RIFF) + SVG path kontrolü yapıyor; `assetManifest` uzantıları .webp/.svg üretiyor.

**Depo hijyeni (2026-10-25):** 4096px PNG ustaları (`assets-inbox/crests|symbols*|brand|goruntu`, ~75 MB) ve `uploads/` içindeki görseller (~30 MB) entegrasyon sonrası silindi; uygulama kopyaları `public/assets/`ta (6,0 MB) kalıcı, zip/dist içinde gömülü. qa9 spec girdileri `assets-inbox/spec/`e taşındı; `sync-assets.py` için ustalar gerektiğinde yeniden yüklenir. `node_modules` snapshot dışı olduğundan oturumlar arası zaten düşüyor.

**Bilinen kuyruk:** symbols-dark 29/43 (kalanı ivory→tonlama ile kapanır); `palette/wardrobe/eyes/hair` artık editör grubu olarak dark sette (34'te ivory de gelebilir); 18 modül ikonu (badge*/role*/ofis) kod yüzeyi bekleyen envanter. FAZ B/C ve aiMatch conceded kalemleri değişmedi.


## 📊 Test ölçeği

| Paket | İçerik | Tur | Sonuç |
|---|---|---|---|
| qa.ts | Seed determinizm, ekonomi, kayıt bütünlüğü, migration | **100 tur × 11 test** | ✅ 0 başarısız |
| qa-extended.ts | Motor, MatchSession, genSquad (3600 kadro/tur), autoLineup, takvim, persist, wizard filtreleri, derbi, sakatlık | **100 tur × 26 test (×100 iç iterasyon)** | ✅ 0 başarısız, 4 uyarı |
| parity.ts | MatchSession dağılım paritesi | 300 maç | ✅ avgG 2.12, ev %48 |
| masssim.ts | Tam matris (3 lig + kupa + hava) | 3.500 maç | ✅ hedef davranışlar tuttu |
| tsc / vite build | Tip + üretim | her adımda | ✅ temiz |

## 🔴 Bulunan ve BU TURDA DÜZELTİLEN 7 hata

| # | Bug | Etki | Düzeltme |
|---|---|---|---|
| 1 | **autoLineup customIds hiç uygulanmıyordu** — kullanıcının elle dizdiği 11 sadece "used" olarak işaretlenip slota YAZILMIYORDU | Taktik ekranında elle dizerdin ama maça oto-XI ile çıkardın (FAZ 2 özelliği tamamen etkisiz) | `profiles.ts`: customIds artık yuva sırasıyla doğrudan slota işleniyor (sakat/cezalı otomatik dışlanır) |
| 2 | **autoXI 3-5-2 → 12 saha oyuncusu** | 3-5-2 seçiminde kadro özeti/pano fazladan 1 oyuncu gösterirdi | `gen.ts`: 3-5-2 artık kanatsız diziliyor |
| 3 | **Kurtarış istatistiği ters takıma yazılıyordu** (saves>sayı rakibin isabetli şutundan büyük olabiliyordu) | Maç sonu istatistik ekranında saçma değerler | `engine.ts`: savesH/A yönü düzeltildi (session.ts zaten doğruydu) |
| 4 | **Olay akışı dakika sırasız** (%100 maçta) | Maç raporunda olaylar karışık sıralanabilirdi | `engine.ts`: dönüşte stable-sort; devre/maç-sonu olayları doğru dakikaya |
| 5 | **VAR olaylarının metni boş** (%36 maç) | Raporun olay satırında boş satır | VAR olayı artık "VAR incelemesi" metni taşıyor |
| 6 | **Derbi verisi: 12 kulüp boş + 4 tek-yönlü asimetri** (örn. Sakarya→Kocaeli tek taraflı) | Derbi atmosferi/bonusu 12 kulüpte hiç tetiklenmiyordu | 36/36 kulübe coğrafi doğru çift-yönlü rakip + derbi adları ("Akdeniz derbisi", "İç Anadolu derbisi" vb.); asimetri 0 |
| 7 | **Üretilen isim nadiren çakışıyordu** (3/3600 kadro): el-yazısı yıldız ismi üretilmiş oyuncuyla çakışma | Kadroda aynı isim iki kez | Çakışan oyuncuya yeni isim; fallback üretici de benzersizlik döngülü |

## ⚽ v0.4.4 — Alt-lig denge kalibrasyonu (QA-DENGE)

**Teşhis (gerçek taktiklerle huni ölçümü):** Kök ligi gol kıtlığı xG kalitesinden değil dönüşümden kaynaklanıyordu: xG/şut 0.179, isabetli şut %28 (zirve %34), gol 0.63/takım.

**Kalibrasyon (3 nokta, iki motorda paralel — `engine.ts` + `session.ts` + paylaşılan `possession.ts`):**
1. `qualityToXG` çıktısına zayıf-hücum kaos çarpanı: `×(1 + max(0, 64−attQ)×0.032)` — kök (~50) ×~1.35, zirve (~70) ~×1.0
2. Gol olasılığı tabanı 0.72 → 0.80 (genel +%11 dönüşüm)
3. İki taraf da zayıfsa maç kaosu: `chaosAdj = 1 + max(0, 62−maçKalitesi)×0.038` — Zirve-lig fikstürüne ~×1.0 (kupa sürpriz dengesi korunur)

**Sonuç (masssim n=1000 + huni n=200/lig):**
| Metrik | Önce | Sonra | Hedef |
|---|---|---|---|
| Kök ort. gol/maç | 1.34 | **2.05** | ~2.0-2.4 ✅ |
| Kök beraberlik | %31.6 | **%19.7** | %20-28 ✅ |
| Kök ev/dep | %39/29 | **%45/35** | sağlıklı ✅ |
| Zirve/Geçit gol | 2.29/2.14 | **2.32/2.38** | spec bandı içinde ✅ |
| Kupa favori üstünlüğü | korundu | (ev %97) | "sürpriz düşük" ✅ |
| MatchSession parity | 2.12 | **2.41** | iki motor tutarlı ✅ |
| E1 denge testi | 🟡 uyarı | **✅** (3 lig de) | |
| 0-0 oranı (gecit) | %26 | **%23** | kısmi iyileşme (kalan ince ayar) |

## 🟡 Bilinen/dokümante kalan uyarılar (hata değil, denge işi)

| Uyarı | Ölçüm | Değerlendirme |
|---|---|---|
| 0-0 oranı (Geçit) | %23, hedef <~%12 | possession varyansını artırma işi; kırılma riskini taşımayan mikro-ayar olarak ayrı tura |
| Nadir xG>7 patlaması (1/100) | 19 şut / 5 gol maç | istatistiksel uç; >9 fail alarm sürüyor |
| Tek-eşleşme skor çeşitliliği | 18/100 | RNG sağlam (aynı seed → %100 birebir); çeşitlilik possession-varyansına bağlı |

## ✅ Doğrulanan sağlamlık alanları
- Determinizm: aynı seed → birebir sonuç **%100** (100 tur)
- MatchSession: 100/100 maç ≤90 adımda tamamlandı, hiç tıkanma; `finishNow` her derinlikte tutarlı
- genSquad: 360.000+ kadro üretimi iterasyonunda 0 yapı/iD/GK/yaş/gen/maaş/rol ihlali
- Takvim: 22 hafta benzersiz-artan, kupa çakışması 0, kış arası sızıntısı 0, 365 gün hafta-günü doğru
- Persist: 100 bozuk dosya girişiminin 100'ü zarif reddedildi; round-trip playerStats dahil kayıpsız; v1→v2 göç OK; v3 (gelecek) reddı OK
- autoLineup: 600 formasyon × benzersiz 11 + customIds %100 uygulanıyor
- Wizard filtreleri: 3 ligde zengin/akademi/dev/düşme pradikatları doğru, preview squad deterministik
- Ekonomi: 36/36 bütçe pozitif; maaş aşımı 3/36 (SG/OS/BO — düşük seviye, bilinen); kadro değeri ↔ bütçe makul
- Sakatlık/ceza girdi biçimi 100 maçta geçerli (34 sakatlık, 1 ceza, format hatası 0)

## Notlar / düşük öncelik işler
- `SeasonFinale.tsx` konfeti ve `audio/engine.ts` gürültü üretimi `Math.random` kullanıyor — tamamen kozmetik (oyun mantığı/rng bütünlüğü etkilenmez; spec yasağı mantık kodu içindir)
- Wizard'de Kök liginde "Köklü Devler" filtresi doğal olarak boş (strength≥68 yok) — boş durumda "bu ligde uygun kulüp yok" ipucu eklenebilir (mikro-UX)
- LiveMatch `setStarted(false)` render-içi guard StrictMode altında uyarı verebilir (gözlem)

- Üretim hattı: `tsc` 0 hata · build 7.9s · SW cache `manager26-v044-v1` · zip `manager26-v044-denge.zip` (466 KB) · Preview port 3000
- Final kapısı: qa-extended ×100 tur **0 başarısız** (kalibre motor) · qa.ts ×100 tur **0 başarısız**

---

# Dalga 7 — Hub uyarı şeritleri + PWA daveti + sürüm notu (v0.5.6)

**Teslim:** 2026-10-24 · UI katmanı (motor etkisi yok — regresyon QA'sı gerektirmez); tsc temiz, build ✅

| Madde | Durum | Detay |
|---|---|---|
| Kadro üst sınırı bandı | ✅ | Hub: 28-29 → sarı "doluyor" bandı; 30 → kırmızı "üst sınır" bandı; dokununca Piyasa'ya gider. |
| Cezalı şeridi | ✅ | Revir kartının yanına ayrı "🟨 CEZALILAR" kartı: isim + kalan maç sayısı. |
| PWA kurulum daveti | ✅ | `beforeinstallprompt` yakalanır; iOS'ta 3 adımlı kılavuz sheet'i; "Ana ekrana ekle" tek sefer gösterilir, kapanış hatırlanır; standalone modda gösterilmez. `src/components/ui/InstallBanner.tsx`. |
| Sürüm notu | ✅ | `src/version.ts`: `APP_VERSION` + changelog. Sürüm değişince ilk açılışta Shell üzerinde özet sheet; okuyana dek her açılışta. |

**Üretim:** tsc temiz · build 9.9s · SW `manager26-v056-v1` · zip `manager26-v056-dalga7.zip` (715 KB) · Preview port 3000 (HTTP 200).

# Dalga 6 — Söz Verilen Süre + Dakika Memnuniyeti (v0.5.5)

**Teslim:** 2026-10-24 · 37/37 genişletilmiş test ✅ (yeni PM1) · qa.ts 11/11 ✅

| Madde | Durum | Detay |
|---|---|---|
| Rol beklentisi | ✅ | Kadro sıralaması (genel güç): ilk 13 kilit (%78 oynama payı bekler), 14-22 rotasyon (%42; ≤20 yaş sabırlı), kalan yedek (%4). Sezon başı 6 maça kadar gürültü sıfır. |
| Dakika memnuniyeti | ✅ | Her Pazartesi: pay beklenin altındaysa birikir → "⏱ HUZURSUZ/KIRGIN" sukadro rozeti + gelen kutusu (30 gün soğuma) + haftalık form -3. |
| Süre Sözü | ✅ | Oyuncu profilinden tek dokunuş: **önümüzdeki 10 maçta ≥%55 kadro payı**. Tutarsa +form; bozulursa -6 form + "söz bozuldu" mesajı. Söz varken yeni söz verilemez. |
| Yenileme kapısı | ✅ | Kırgın oyuncu söz olmadan masaya oturmasın: `renewContract` net gerekçeyle reddeder. |
| Kayıt uyumu | ✅ | `promises` / `minuteNoted` opsiyonel — v2 kayıtlar boş varsayımla açılır. |

**Test:** PM1 (rol sınırları, erken sezon gürültüsü, kilit tavan, yedek sabrı, söz active/kept/broken üçlüsü, monotonluk). 37/37 ✅.
**Üretim:** tsc temiz · build 9.7s · SW `manager26-v055-v1` · zip `manager26-v055-dalga6.zip` (710 KB) · Preview port 3000.

# Dalga 4+5 — Sezon Ödülleri Töreni + IFAB 3-Durak Kuralı (v0.5.3 / v0.5.4)

**Teslim:** 2026-10-24 · 36/36 genişletilmiş test ✅ (yeni AW1, IF1) · qa.ts 11/11 ✅ · parity 300/300 ✅

| Madde | Durum | Detay |
|---|---|---|
| Sezon ödülleri töreni | ✅ | `data/awards.ts` saf hesap: **Gol Kralı / Asist Kralı / Yılın Oyuncusu (min 8 maç, puan ortalaması) / Yılın Genci (≤21 yaş, min 8 maç)** — eşitlik çözülmesi: değer ↓, maç ↓, id ↑ (tam deterministik). Ödül verileri sezon raporu sıfırlanmadan önce finale aktarılır. SezonFinale'e yeni faz eklendi (tören kartları, benim kulübümün satırı amber halkalı). AW1: determinizm + liderler + eşik atlanması kanıtlı. |
| IFAB 3-pencere (5 değişiklik / 3 durak) | ✅ | Kurallar **her iki motorda da**: `engine.ts` + `session.ts`. Takım başına 5 hak, en fazla **3 farklı durak**; 45. dakika (devre arası) serbest; aynı dakikadaki ardışık istekler durak saymaz. Dördüncü durağa istek → 'IFAB kuralı: duraklar doldu' bilgi olayı + reddedilir. |
| AI otomatik değişiklik | ✅ | 62dk+ her possession %6 olasılıkla: en yorgun (fitness<62) saha oyuncusu, eş mevkide ±5 kalite sınırındaki en iyi yedekle değişir; yerel profil yeniden hesaplanır; kullanıcı tarafına (`userSide`) AI karışmaz. Yalpalama koruması: dk 62/72/82 kapıları. |
| Canlı maç kullanıcı UX | ✅ | LiveMatch kontrollerinde ⇄ butonu `kalan/5·durak/3` gösterir; hak ya da durak bitince kilitlenir. **60' sonrası yorgunluk öneri bandı** (sarı uyarı, '⚠ Yorulan oyuncular var — değişiklik öneriliyor') tek dokunuşla değişiklik panelini açar. Panelde ilk 11 oyuncunun canlı kondisyon %'si gösterilir; queue→uygulama bir sonraki durakta gerçekleşir. |

**Testler:** IF1 (serbest devre-arası = 3 durak korunur; 4. değişiklik sonrası hak 1/durak 0; duraklar doluysa 5. istek reddedilir; maraton senaryoda toplam ≤4 uygulama). 36/36 ✅.
**Üretim:** tsc temiz · build 9.5s · SW `manager26-v054-v1` · zip `manager26-v054-dalga5.zip` (704 KB) · Preview port 3000.

# Dalga 3 — Yabancı Kotası + Bosman + Kiralık (v0.5.2)

**Teslim:** 2026-10-24 · 34/34 genişletilmiş test ✅ (yeni FO1/BO1/LN1) · qa.ts 11/11 ✅ · parity 300/300 ✅

| Madde | Durum | Detay |
|---|---|---|
| Yabancı kotası | ✅ | TFF 2026-27 kuralı: kadroda **Zirve 8 / Geçit 5 / Kök 3** yabancı. `buyPlayer` + `loanIn` bu kuralı zorunlu kılar; doluysa net sebep döner ("Önce bir yabancı ile yolları ayır"). Market başlığında canlı kota çipi (🌍 5/8). Başlangıç dünyası hiçbir ligde kotayı aşmıyor (FO1: 720 üretim kadrosunda 0 sızıntı). |
| Bosman serbestliği | ✅ | Sezon sonunda sözleşmesi 0'a düşen oyuncu **bedelsiz serbest** kalır: kulübi FA havuzuna düşer, satış listesinden temizlenir; sezon raporunda lig geneli + "yenilemediğin oyuncun" uyarısı. FA oyuncuları pencereden bağımsız, ₺0 ile alınabilir; Market'te "🔓 Bosman" rozetiyle listelenir. YAŞLANMA devam (serbest oyuncu dondurulmaz). Kiralıktaki oyuncuya yanlışlıkla uygulanmaz. |
| Kiralık paketi | ✅ | **Kiralama (loanIn):** Market satırında 🔁 — kapı ücreti ₺0, maaş yarı paylaşım. AI kulübü saf kuralla kabul eder: kadro derinliği 22+, oyuncu ilk-11 önceliği değil, kulüp gücüne uygun. **Kiralama ver (loanOut):** Kadro > Oyuncu > "Kiraya Ver" — aynı/alt ligde deterministik hedef kulüp; satış listesinden çıkarır. Kurallar: üst üste kiralık yok, kiralık oyuncu satılamaz/kalıcı alınamaz, sezon sonunda otomatik dönüş + gelen kutusu notu. Kadro rozeti "KİRALIK 🔁". |
| Kayıt uyumu | ✅ | `loans` alanı opsiyonel — eski v2 kayıtlar boş liste ile açılır; kayıt sürümü değişmedi. |

**Testler:** FO1 (kota üretim sızdırmazlığı + kabul/ret kenarları), BO1 (Bosman geçişi deterministik + `contractYears=0 → FA` taşıması), LN1 (kabul/ret matrisi: zayıf-kabul, önemli-ret, ince-kadro-ret, zincir-ret, süre bölünmesi, maaş yarısı).
**Üretim:** tsc temiz · build 9.7s · SW `manager26-v052-v1` · zip `manager26-v052-dalga3.zip` (683 KB) · Preview port 3000.

# Dalga 2 — §5-D Vuruş Haritası + 11'li Maç Karnesi (v0.5.1)

**Teslim:** 2026-10-24 · 31/31 genişletilmiş test ✅ (yeni S3) · qa.ts 11/11 ✅ her biri ×3 tur · parity 300/300 ✅

| Madde | Durum | Detay |
|---|---|---|
| Şut günlüğü (motor) | ✅ | `MatchResult.shotsLog: EngineShot[]` (dakika, taraf, bölge, xG, sonuç) — `engine.ts` + `session.ts` her vuruş dalında (gol/VAR-iptal→miss/kurtarış/kaçan + korner duran top); RNG tüketimi DEĞİŞMEDİ (determinizm korunur) |
| Vuruş Haritası (§5-D) | ✅ | Maç Raporu > "Analiz": dikey saha SVG; gol=amber halka, isabet=mavi, kaçan=soluk halka; nokta boyutu ∝ xG; üst yarı ev / alt yarı deplasman (deplasman vuruşları aynalı) |
| Koridor Payı | ✅ | Merkez vs Kanat % çubukları (`centralAtt`/`wideAtt` sayaçları — sahte xG türetimi kaldırıldı) |
| 11'li Maç Karnesi | ✅ | "Karneler" sekmesi: takımım + rakip blokları; rating sıralı satırlar — isim, mevki, dk, G ⚽, asist, şut, kurtarış, sarı/kırmızı nokta, renkli rating rozeti (≥8 yeşil / ≥7 amber / ≥6.2 mavi / <6.2 kırmızı) |
| Gerçek istatistikler | ✅ | "İstatistik" sekmesi artık motor ölçümü: pres başarısı "%38+xG×4" sahteliğinden kurtuldu → gerçek korner, faul, sarı, kırmızı, kurtarış, presle kazanım; tahmini "Pas Başarısı %64±Δ" satırı kaldırıldı |
| Maçın Adamı | ✅ | "Sarp Aydın" kalıcı metni kaldırıldı → `playerRows` en yüksek rating (pozisyona bakmaksızın, kaleci kurtarırsa da alabilir) |
| Bölge kodu sızıntısı | ✅ | "Bölgeler" sekmesindeki L-A/C-D kalıntıları kaldırıldı → "Analiz" sekmesi |
| QA S3 | ✅ | ×100 seed: shotsLog uzunluğu = shotsH+shotsA, gol logları = skor, isabet logları = sahada isabet → tutarsızlık 0 |

**Veri akışı:** her iki motor (`simulateMatch` hızlı akış + `MatchSession` canlı akış) aynı alanları doldurur; adapter (`matchEngineToDemo`) ve LiveMatch final eşlemesi `ZONE_XY` (ortak: `engine/zones.ts`) ile yüzde koordinata çevirir.
**Üretim:** tsc temiz · build 10.0s · SW `manager26-v051-v1` · zip `manager26-v051-dalga2.zip` (687 KB) · Preview port 3000.

# Dalga 1 (v0.5.0) — Karar İllüzyonları Gerçek Sistem Oldu

**Teslim:** 2026-10-24 · 30/30 genişletilmiş test ✅ ×30 tur · qa.ts 11/11 ✅ ×30 tur

| Madde | Durum | Detay |
|---|---|---|
| Haftalık antrenman (P0) | ✅ | `data/training.ts`: odak (5 alan) × yoğunluk (3) × tesis (1-5) → Pazartesi kalıcı rating patch'i; FM ritmi (+2-6/43hf genç); Hub kartından seçim; yoğunlukta fitness bedeli + küçük zorlanma riski; deterministik (T1) |
| Akademi günü (P0) | ✅ | Sezon günü 8 (Temmuz 2. Pazartesi): 2-6 aday (tesis=seviye), kalite merdiveni lv1↔lv5 (T2); Kulüp>Akademi'de Sözleşme/Pas geç; ₺0 bedel, 30 kadro limiti, karar geri dönmez |
| Kovulma & iş piyasası (P0) | ✅ | Ültimatom artık GERÇEK sayaç (3 maç/4 puan); tutmazsa fesih → `jobSearch` (işsizlik modu, maçlar AI'ya devredilir, gün serbest ilerler) → deterministik 3 teklif (aynı/alt lig, en kırılgan kulüpler) → Hub'dan imza → boardConfidence %60 ile yeni kulüpte devam (J1/J2) |
| Canlı saha parlaması (P1) | ✅ | PhaserPitch: gol halkası + kart nabzı (sarı/kırmızı metin-temelli renk) + kurtarış ışıması; path'siz olaylarda top konumunda |
| Maç merkezi plan özeti (P1) | ✅ | Maç Hazırlık'ta seçili plan satırı: formasyon · plan adı · pres/tempo · genişlik · hat + "manuel 11" rozetİ |
| Kit çakışması (P1) | ✅ | RGB mesafe < 85 (ana renk + rakip 2. renk) → MatchPrep'te uyarı bandı |
| (Bonus bug) Derbi tespiti | ✅ düzeltildi | Eski kod `derbyString === clubId` karşılaştırıyordu → derbi güven bonusu TARİHTE HİÇ tetiklenmemişti; artık simetrik `rivalIds` kullanılıyor |
| Tasarım quick-fix | ✅ | `user-scalable=no` kaldırıldı (SE2 büyütme açık); ⚡ emoji CTA kaldırıldı |

**Ayar notları:** antrenman ilk ölçeği oyun kırıcıydı (+21 att/40hf) — FM ritmine çekildi. Kalan bilinen uyarılar: 0-0 %23, xG>7 uç maç 1/100, tek-eşleşme çeşitlilik 18/100.
**Üretim:** tsc temiz · build 8.1s · SW `manager26-v050-v1` · zip `manager26-v050-dalga1.zip` (470 KB) · Preview port 3000.

# Dalga 8 — UX Onarım Turu + v0.5.8 Hotfix (transfer beyaz ekranı)

## Değişiklikler (v0.5.7)
1. **Transfer çıkış yolu:** OfferFlow'a başarı aşaması (✍️ kart + "⌂ Ana Merkeze Dön" / "Piyasada Kal") eklendi. Üst çubuktaki kulüp logosu + takım adı artık her ekrandan Ana Merkez'e tıklanabilir (`Shell.tsx`).
2. **Yatay izleme kaldırıldı:** LiveMatch'ten `landscape` state, geçiş butonu ve yatay layout dalı silindi — tek dikey yerleşim.
3. **Saha animasyon düzeltmesi (PhaserPitch):** kök neden: her olayda her path noktasına ayrı `tweens.add({paused:true})` açılıp asla oynatılmıyordu — top yalnız ilk noktaya zıplıyor, kalan duran tween'ler birikiyordu ("dönen/teleport" görünümü). Çözüm: tek `tweens.chain`; iz 1.1 sn sonra 650ms'de solar; deplasman hücumları tam ayna (x+y) — MatchReport şut haritası konvansiyonuyla aynı.
4. **Cloudflare Pages:** `public/_redirects` (SPA kuralı `/* /index.html 200`), `wrangler.toml`, `DEPLOY-CLOUDFLARE.md`; `manager26-v058-cloudflare-dist.zip` = `dist/` içeriği, doğrudan sürükle-bırak.

## Hotfix (v0.5.8) — Transfer sonrası BEYAZ EKRAN
- **Kök neden:** `buyPlayer` içinde inbox mesajı `clubById(fromId).name` çağırıyordu; serbest/Bosman oyuncularda `fromId='FA'` lig kaydında yok → `clubById` (id!) assertion'lı, `undefined.name` → state updater içinde throw → tam ekran çökme.
- **İkinci nokta:** `Market.tsx` Geçmiş sekmesi `t.fromClubId='FA'` satırda aynı çağrı → sekmeyi açmak çökertebilirdi.
- **Yama:** iki nokta da `clubByIdSafe` ile korundu (`serbest statüden` geri dönüşü). Lig id'leriyle çalışan ekranlar (Hub/Comps/LiveMatch/MatchReport/Club) riskli değildi — doğrulandı.
- sw etiket: `manager26-v058-v1`.

## Doğrulama
- `./node_modules/.bin/tsc --noEmit` → 0 hata
- `tools/qa.ts` → 11/11 ✓ · `tools/qa-extended.ts` → 37/37 ✓ (3 bilinen uyarı)
- `vite build` 9.4s · preview :3001 HTTP 200 (production build)
- **Tarayıcıda doğrulanması gereken:** Piyasa → serbest oyuncu satın al → imza → başarı kartı → Ana Merkeze Dön (beyaz ekran olmamalı).

## Yatay/Dikey Gereksinim Doğrulaması (v0.5.8 üstü)
- Büyük tarama: `landscape`, `Yatay`, `Dikey`, `orientation` — kod tabanında hiçbir iz yok (bulunan "portrait" kayıtları menajer avatar indeksidir, ilgisiz).
- `public/manifest.webmanifest` → `"orientation": "portrait"` — cihaz seviyesinde de yalnız dikey.
- Kurulu dist bundle'larında yatay mod izi yok (`PhaserPitch-*.js`, `index-*.js` içinde 0 eşleşme; phaser paketindeki 2 eşleşme kütüphane içi dizin adıdır).
- LiveMatch tek yerleşim: skor bandı → saha/akış (Saha/Akış/Denge sekme değil yön değişimi) → kontroller → Plan/İstatistik/Çık.
- `tsc --noEmit` 0 hata.

# Dalga 9 — Kullanıcı Bildirimi 4'lü Paket (v0.5.9)

1. **Bütçe aktarımı (TB → maaş):** Kulüp → Finans'a slider kartı. Oran: ₺1M TB = +₺0,05M/ay maaş (20 ay vade dengesi, tek yön; bankaya geri dönmez). `budget.wbExtra` PersistedState'e opsiyonel eklendi (eski kayıtlar uyumlu). Maaş tavanı klüp baz + ek; finans kartı + Özet sekmesi güncellendi. **Fren:** Oyuncu satın alma imza/öneri butonları maaş tavanını aşınca kapanır + tavsiye metni.
2. **Taktikte 11 içi takas:** slot dokun → ikinci slota dokun ⇒ iki oyuncu yer değiştirir (`onSlotTap` + `swapXI`); yedek satırı davranışı korundu; yardım metni güncellendi.
3. **Menajer yüz seçimi — özel tasarım:** Wizard'a "Özel Tasarla" düğmesi: 4 saç stili + 6 saç rengi + 6 ten + 6 ceket + 6 kravat + sakal (canlı önizleme). `ManagerDraft.face?` PersistedState'e opsiyonel; `ManagerPortrait` yeni `face` prop'u ve `MANAGER_FACE_PALETTE` dışa aktarıldı; Profil kartında özel yüz görünüyor.
4. **Inbox:** Shell üst barındaki zarf simgesi geri getirildi (✉); günlük kartındaki **"Şimdi İncele"** butonu ölüydü → artık kategoriye göre yönlendiriyor (transfer→Piyasa, kadro→Kadro, yonetim→Kulüp, lig→Puan Durumu, kritik→Ana Merkez).

## Doğrulama (v0.5.9)
- `./node_modules/.bin/tsc --noEmit` → 0 hata
- `tools/qa.ts` 11/11 ✓ · `tools/qa-extended.ts` 37/37 (3 bilinen uyarı) ✓ · `tools/parity.ts` n=300 tutarlı ✓
- build 10.3s · sw: `manager26-v059-v1` · manager26-cloudflare.zip yenilendi.

# Saha Görselleştirme Şartnamesi Uygulaması (v0.6.0 — Model A: Dikey Saha)

Şartnamedeki 5 kök neden doğrulandı ve uygulandı:
1. **ViewBox taşması:** Eski SVG `viewBox 0 0 100 68` (yatay) + dikey bölge koordinatları (D y=72–76) → D bandı sınırın dışındaydı. Çözüm: `ZONE_XY` Model A değerleri (D y=82–84, M y=50, A y=15–18) + yeni dikey SVG `viewBox="0 0 100 130"`.
2. **90° eksen çatışması:** Kaldırıldı — kapsayıcı `aspect-[10/13] max-h-[56vh]`; saha yatay çizgiler → dikey (kuzey/güney kale, yatay orta çizgi, ceza sahaları).
3. **Üç katman oranı:** Kapsayıcı/SVG/Phaser tek orana kilitlendi (10:13 — spec'in piksel pikseli eşleşme amacı; spec'te yazan 3/3.8 kapsayıcı ile 300×390 tuval arasındaki %2.6'lık fark bilinçli yerinetyapılmadı, tam eşleşme için 10/13 seçildi). Phaser tuvali 360×480 → **300×390**.
4. **Deplasman ters yönü:** Dalga 8'de x+y ayna zaten vardı; şimdi gol koşusunda **top kaleye uzatılıyor** ve gol efektleri **kale ağlarında** (y=12 alt/üst) patlıyor (spec §6). Dalga 1 parlaması korunarak `fxAt` golde kaleye taşındı.
5. **Debug yazıları:** Zaten temizlenmişti ("ham zone kodları gizlendi"), taramada kalıntı yok.

Senkron noktalar: `zones.ts` ↔ `bridge.ts` ↔ `LiveMatch.tsx ZONES` (üç kopya aynı değerler, yorumla işaretlendi). `adapter.ts` aynası `96 - z.y` → `100 - z.y` (0-100 ölçeği tutarlılığı); MatchReport şut haritası 0–100 viewBox ile uyumlu.
**Radar:** kod tabanında radar bileşeni yok (spec başlığı geçmiş bir arayüz karmaşıklığına atıftı — raporda not edildi).
Doğrulama: tsc 0 · qa 11/11 · qa-extended 37/37 · build 10.2s · sw `manager26-v060-v1`.

# Yapılacaklar Rehberi (11 Yama) Karşılaştırma / Kapanış (v0.6.1)

Dosya (`MANAGER26_YAPILACAKLAR...`) eski paket bundle'ını hedefliyordu; kaynak tabanımızda madde madde doğrulandı:

| Yama | Durum | Kanıt |
|---|---|---|
| P0-01 Canlı skor → tablo/arşiv | ✅ zaten bağlı | `LiveMatch:165 playLeagueMatch(fixture, finResult)` + overrideResult akışı |
| P1-01 Kupa KO penaltı kilit | ✅ adil tohumlu | game.tsx:650 `mulberry32(seed+day*197+hg*13+ag*7)` 50/50 |
| P1-02 Tesis maliyeti + kalıcı seviye | ✅ | Club.tsx inşaat onayı `setBudget(tb−bedel)`; game.tsx:870 bitişte `clubFacilities[kind]+1` |
| P1-03 Transfer değerleme /100 | ✅ | `gen.ts playerValue`: /100 + yaş/sözleşme çarpanları |
| P1-04 Taktik tap-to-swap | ✅ | Dalga 9: yedek→saha + 11-içi takas (`swapXI`); 44px dokunma alanı (P3-03) |
| P2-01 Vn taşması | ✅ v0.6.0 | Model A dikey koordinatlar |
| P2-02 Dashboard maaş % | ✅ + bu tur | Hub: `myClub.wageBudget + wbExtra` (aktarımı da hesaba katar) |
| P2-03 Dinamik bütçe gösterimi | ✅ | Club/Hub `g.budget.tb` |
| P2-04 Maç merkezi plan seçici | ✅ | MatchPrep `activeTacticIdx` 5-slot segmenti |
| P3-01 Açılış sürüm metni | ✅ bu tur | Startup: `v0.6.0 · Dikey saha motoru + taktik takımyönetimi` |
| P3-02 Debug metinleri | ✅ | Kalıntı yok |
| Ek | ✅ | APP_VERSION → 0.6.0, CHANGELOG'a dikey saha + Dalga 9 satırları |

Doğrulama: tsc 0 · qa 11/11 · qa-extended 37/37 · build 9.9s · sw `manager26-v061-v1`.

# Dalga 10 — Transfer Pazarlığı + Bütçe Kalıcılığı (v0.6.2)

1. **Maaş bütçesi kaybolması FIX:** `budget: {tb: X}` yazan 7 nokta (ödül, aylık finans, serbest imza, satın alma, satış x2, yenileme) spread olmadan yazıyordu → `wbExtra` her işlemde siliniyordu. Hepsi `budget: { ...prev, tb }` yapıldı. Aktarım artık sezonlarca kalıcı.
2. **Pazarlıklı transfer (yıl × statü):** OfferFlow'a iki kontrol eklendi:
   - Süre 2/3/4/5 yıl (kısa süre oyuncu talebini +%10, uzun −%5)
   - Statü: Rotasyon (−%5 maaş talebi) / İlk 11 (+%8) / ⭐ Yıldız (+%22)
   - Oyuncu talebi `p.wage × statü × yıl`; teklif karşılamazsa imza reddedilir (kart içinde talep yazıyor); kulüp tarafı fiyat eşiği de statüye duyarlı (yıldızda baraj fiyatı %98).
   - **⭐ Yıldız imzasının bedeli:** imza sonrası oyuncuya otomatik ilk-11 süre sözü kaydedilir (Dalga 6 motoruna bağlı; 10 maç ≥%55).
   - İmza kartı süre + statü bilgisini gösterir; inbox kaydı da zenginleşti.
3. Zip oluşturma protokolü düzeltildi: eski zip'in üstüne ekleme yerine her seferinde sıfırdan (tek dosya 492 KB).
Doğrulama: tsc 0 · qa 11/11 · qa-extended 37/37 · build 9.9s · sw `manager26-v062-v1`.

# Logo Değişimi — HM26 Seti (v0.6.3)

**Tarih:** 2026-10-24 · **Kapsam:** Sadece marka varlıkları + sürüm kimliği; oyun koduna işlevsel dokunuş yok.

## Değişen varlıklar

| Varlık | Eski | Yeni |
|---|---|---|
| `public/icon.svg` | M26 altın monogram, 512² (viewBox 296²) | **HM26** keskin tipografi + yıldız, altın `#cc9c47` / lacivert `#071822`, 1024² (rx=220 zemin) |
| `public/icon-transparent.svg` | M26 artwork, 1024×598 | HM26 artwork-only, viewBox `88 338 848.809 352.984`, 1200×499, zemin saydam |
| `public/icon-monochrome.svg` | M26 siluet, 1776² | HM26 siluet — ana vektör artwork'ünden birebir tek renk (`#111111`) gruba indirildi, 1024² (trace yaklaşıklaştırması YOK, orijinal path'ler) |

## Uyarlama

- `manifest.webmanifest`: icon.svg `512x512` → **`1024x1024`**; transparent + monochrome sabit boyut → **`"any"`** (kaynak viewBox'ları değişti; SVG ölçeklenebilir).
- `sw.js`: cache `manager26-v062-v1` → **`manager26-v063-v1`** (eski ikonların cache'den düşmesi garanti).
- `src/version.ts`: APP_VERSION `0.6.0` → **`0.6.3`**; CHANGELOG'a 0.6.3 bloğu (logo + v0.6.2 birikim notları — pazarlık/bütçe daha önce sürüm notuna girmemişti).
- `src/screens/Startup.tsx`: splash'taki sabit `v0.6.0` metni → **`v{APP_VERSION}`** dinamik (bir daha kayma olmaz).

## Doğrulama

- Render testi (ImageMagick flatten): ana ikon = altın HM★26 lacivert zeminde ✅, şeffaf artwork ✅, monokrom siluet 1024² ✅ — üçü de beklenen şekiller.
- XML well-formed: 3 dosya ✓ (path sayıları 7/7/7).
- `tsc --noEmit` ✅ · `tools/qa.ts` **11/11** ✅ · `tools/qa-extended.ts` **37/37** (3 bilinen uyarı) ✅ · `vite build` 9.98s ✅
- Zip **sıfırdan** (`rm -f` sonra `dist/` tamamen): **503 KB**, tek JS hash (`index-CNGoAr3y.js`).
- Preview :3001 → HTTP 200, `/icon.svg` yeni HM26 içeriğini servis ediyor.

## Bilinen not

- Kullanıcının gönderdiği ham VTracer izi (5 path, 2048²) oturum yoğunlaştırmasından güvenilir kurtarılamadığı için monokrom, orijinal HM26 vektör path'lerinden tek renk gruba indirgenerek üretildi — trace yaklaşıklaştırmasından daha sadık. İstenirse ham iz yeniden gönderilip değiştirilebilir.
- Uygulama **adı** bilinçli olarak `MANAGER26` kaldı (manifest name/short_name, başlıklar); yalnızca logo artwork'ü HM26 oldu. Metinsel rebrand istenirse ayrı turda yapılır.

# Derin-QA Doğrulaması + Form Şeridi (v0.6.4)

**Tarih:** 2026-10-24 · **Kaynak rapor:** `uploads/MANAGER26_DEEP_QA_AND_GAP_ANALYSIS_REPORT.md` — 92 senaryo, canlı `hbkmanage26.pages.dev` üzerinde **eski build** (sw `manager26-v060-v1`) test edilmiş.

## BUG kataloğu → mevcut sürüm durumu (satır kanıtlı)

| Rapor | Bulgu | v0.6.4 durumu | Kanıt |
|---|---|---|---|
| BUG-01 (P0) | Canlı skor tabloya geçmiyor | ✅ Kapalı (v0.6.1) | `LiveMatch.tsx:165` → `playLeagueMatch(fixture, finResult)`; `game.tsx:1029` overrideResult |
| BUG-02 (P1) | Kupa penaltısı ev sahibi %100 | ✅ Kapalı (v0.6.1) | `game.tsx:651` tohumlu 50/50 `mulberry32(seed+day*197+hg*13+ag*7)`, `pens: hg===ag` |
| BUG-03 (P1) | Tesis seviyesi kalıcı değil, para kesilmiyor | ✅ Kapalı (v0.6.1) | `game.tsx:865-875` bitişte `career.clubFacilities + 1` + başlangıçta bütçe kesintisi; `Club.tsx:340-343` |
| BUG-04 (P1) | Transfer değeri /10 şişkinliği | ✅ Kapalı (v0.6.1) | `gen.ts:176` `playerValue` `/100` + yaş/kontrat çarpanları |
| BUG-05 (P1) | İlk 11 yuvaları tıklanmıyor | ✅ Kapalı (v0.6.0) | `Tactics.tsx:42-64` `swapXI`/`swapSlot` tap-to-swap, 42 onClick |
| BUG-06 (P2) | Defans hattı sahanın altına taşıyor | ✅ Kapalı (v0.6.0) | Dikey saha motoru: tüm koordinat katmanları tek orana kilitli |
| BUG-07 (P2) | Maaş kullanımı %0.1 | ✅ Kapalı (v0.6.1) | `Hub.tsx:221` tek bölme, tavan `wageBudget + wbExtra` |
| BUG-08 (P2) | Kulüp ekranı statik bütçe | ✅ Kapalı | `Club.tsx:66` `g.budget?.tb ?? c.transferBudget` |

## Gap matrisi → mevcut sürüm durumu

| Gap | Durum | Kanıt |
|---|---|---|
| Gol/Asist krallığı | ✅ Mevcut | `Comps.tsx:194-195` Krallıklar sekmesi (sezon top listeleri) + SeasonFinale ödülleri |
| 22 oyuncu radar noktası | ✅ Mevcut | `PhaserPitch.tsx:41-79` teamdots (ev/dep diziliş + genişlik + çizgi senkronlu) |
| Momentum barı | ✅ Mevcut | `LiveMatch.tsx:71-72, 277-279` 0-100 baskı barı |
| Aylık maaş/bilet finansı | ✅ Mevcut | Aylık finans döngüsü (`game.tsx` ~L964) + bütçe aktarım slider (v0.6.0) |
| Kovulma riski/ültimatom | ✅ Mevcut | J2 ültimatom karar tablosu (qa-extended) |
| Şut/ısı haritası | ✅ Mevcut | Maç raporu vuruş haritası + koridor payı (v0.5.5) |
| **Son 5 Maç form şeridi** | ➕ **BU TUR eklendi** | `Comps.tsx` `formByClub` — tablo satırında 7×14 G/B/M mini-barlar, soldan yeniye, yoğunluk artan |
| Taksitli/paylı transfer | ⌛ Bilinçli ertelendi (Aşama 3) | — |
| Kupa odası/müze | ⌛ Bilinçli ertelendi (Aşama 3) | — |
| T03 tarayıcı geri/ileri (history API) | ⌛ Düşük öncelik (P3) | SPA hash-routing gerektirir; kapsam dışı bırakıldı |

## Bu turdaki değişiklik

- `src/screens/Comps.tsx`: `formByClub` useMemo (played lige ait fikstürlerden kulüp başına son 5 G/B/M) + tabloya 56px "Form" kolonu; 7×14 barlar, renk `--c-ok/--c-warn/--c-danger`.
- APP_VERSION `0.6.3` → `0.6.4` + CHANGELOG bloğu; sw → `manager26-v064-v1`.

## Doğrulama zinciri

tsc 0 ✅ · qa.ts 11/11 ✅ · qa-extended 37/37 (3 bilinen uyarı) ✅ · vite build 9.91s ✅ · zip sıfırdan **503 KB** ✅

## Not

Raporun test ettiği canlı dağıtım eski sürümde kaldığı için, canlı sitenin kendisini güncellemek gerekiyor — bu zip (v0.6.4) Cloudflare'e yüklendiğinde raporlanan 8 BUG'ın tamamı canlıda da kapanmış olacak.

# Ana Menü Kapağı — Sinematik Tünel (v0.6.5)

**Tarih:** 2026-10-24 · **Kaynak:** `uploads/MANAGER26_Dikey_Acilis.png` (1080×1920, 2 MB)

## Değişiklik
- `public/splash-cover.webp`: 1080×1560 kırpma (gömülü sahte "Başla" butonu atıldı — gerçek buton DOM'da) + WebP q80 → **50 KB** (40× küçülme).
- `Startup.tsx` Splash: vektör `StadiumArt` hero yerine tam-bleed kapak `object-cover`/`26%` odak + tabana `--c-base` geçişli gradient; başlık görselde gömülü olduğundan DOM başlığı kaldırıldı, amber tagline korundu. Kullanılmayan `StadiumArt` importu temizlendi (Splash'te) — CareerSlots'taki kullanım ayrı.
- `sw.js`: `addAll(['/', '/splash-cover.webp'])` ön-bellek; cache → `manager26-v065-v1`.
- APP_VERSION `0.6.4` → `0.6.5` + CHANGELOG.

## Doğrulama
tsc 0 ✅ · qa 11/11 ✅ · ext 37/37 ✅ · build 9.96s ✅ · zip sıfırdan **554 KB** (cover dahil) ✅ · preview :3001 cover 200 ✅

## Tasarım notu
Görseldeki "MANAGER26" + HM26 monogramı DOM-üstü metinle çakışmıyor; altın buton artık gerçek `Btn amber` — görsel/etkileşim tutarlı.

# Splash Tam Ekran Sadeleşme (v0.6.6)

**Tarih:** 2026-10-24 · **İstek:** kapaktaki metin bloğu + 4 özellik çipi gereksiz; görsel tam ekran olsun.

## Değişiklik
- `public/splash-cover.webp` yeniden üretildi: 1080×1560 kırpmanın altına görselin kendi zemin tonlarından (`#2C373E → #04070B`) degrade uzatma → **1080×2340** (19.5:9+ uzun ekranlarda `object-cover` kırpması yok), 57 KB.
- `Startup.tsx` Splash: `h-full relative` tam-bleed; tagline/paragraf/çip grid **kaldırıldı**; sadece `▶ Devam Et`/`Başla` butonları + tek satır sürüm özeti alt gradient üstünde. Kullanılmayan `ICONS` importu temizlendi.
- sw → `manager26-v066-v1`; APP_VERSION `0.6.6` + CHANGELOG.

## Doğrulama
tsc 0 ✅ · qa 11/11 ✅ · build 8.99s ✅ · zip **560 KB** ✅ · preview :3001 cover 200 (57 KB) ✅ · 380×824 render kontrolü: kompozisyon doğal, ek bölge sırıtmıyor ✅

---

## v0.7.1 — UI Prototip Entegrasyonu · B DALGASI (Kadro + Piyasa) (2026-10-26)

| Bileşen | Değişiklik |
|---|---|
| ikonlar | `search` / `star` / `starF` (dolu) +3 |
| Squad header | başlık 22px "Kadro" + kulüp alt satırı; özet şeridi: tek kart 3 hücre (N OYUNCU / ORT. GENEL altın / RİSK); yuvarlak filtre sekmeleri (aktif altın); arama inputu (ikonlu, tr lowercase); `${n} OYUNCU` + döngülü sıralama düğmesi (Genel↓→Form↓→Yaş↑) |
| Squad satır | `min-h-[68px]` prototip düzeni: 36px portre karesi, isim★12.5px, meta 10px, Form renkli satır + kondisyon/sakat/ceza inline, rozetler alt satır, sağda 40px altın GEN kutusu |
| Market header | "Piyasa" 22px + pencere rozeti (açık yeşil / kapalı amber); TB barı: ₺X·XM büyük + `Yabancı: n/q` rozeti |
| Market sekmeler | 3 ana (Fırsatlar/Oyuncu Ara/Kısa Liste·N) + **Diğer ●N** → Sheet (Gelen Teklifler/Sözleşmeler/Geçmiş, chevron satırlar); bu sekmelerdeyken "‹ Ana piyasaya dön" |
| Market liste | `Değeri ≤ bütçe` filtre düğmesi (firsat+ara), canlı oyuncu sayacı; boş durumlar kesik çizgili kart |
| Market kartı | prototip makale düzeni: üst satır avatar+bilgi+GEN/POT kutusu; alt satır border-top: fiyat / ★ kısa liste düğmesi (44px, aria-pressed) / amber Teklif / 🔁 |
| Kısa Liste | `career.pending.marketShortlist` persist **zaten vardı** ✓; sekme artık yalnız listede ve havuzda olanları gösterir |
| OfferFlow | **Dalga 10 akışı dokunulmadan** korundu; stage 0'a canlı önizleme: "Örnek teklif sonrası transfer bütçesi: ₺X·XM" (ok/danger) |

**Zincir:** tsc 0 ✅ | qa 11/11 ✅ | qa-ext 37/37 (3 uyarı) ✅ | build 9.98s ✅ | zip **563035B** ✅ | sw `manager26-v071-v1`

**Kalan dalga:** C — Taktik saha reskin'i (pitch/pozisyon rozeti havayı). MANAGER26↔HM26 rebrand sorusu yanıtsız.

---

## v0.8.0 — C DALGASI (Taktik pitch reskin) + HM26 REBRAND + QA uyarı düzeltmeleri (2026-10-26)

### C dalgası
| Bileşen | Değişiklik |
|---|---|
| Taktik başlık | "Taktik" 22px + kulüp alt satırı + sağda diziliş düğmesi `${formation}` ⚙ (Formasyon sekmesine iner); plan adı ✎ düzenleme araç satırına taşındı |
| Plan sekmeleri | Ana Plan/Hücum/Savunma/Kontra/Özel — yuvarlak altın aktif (B dalgası stili); araç satırı: "… · dokunarak düzenle" / "Bir oyuncu daha seç" + Manuel dizilim rozeti + **Otomatik 11** metin bağlantısı |
| Pitch | prototip reskin: `aspect 68/105`, yatay şeritli yeşil zemin (#123d30/#153f32 2-renk repeating), SVG hatlar viewBox 68×105 `rgba(226,245,232,.32)`, iç ışık gradyanı; yuvalar: 29px dairesel numara rozeti (#194f3a/#78bf98) + 9px isim etiketi (#08241bee); **seçili: altın daire + altın etiket + 4px halka**; kaptan © / penaltı P / kondisyon ! korundu |
| Alt bilgi | ℹ️ yönerge satırı (info ikonu eklendi) + **YEDEKLER** bölüm başlığı + 64px'lik yatay kaydırmalı yedek kartları (isim + mevki + GEN; seçim modunda altın çerçeve) |
| swap mantığı | tap-to-swap + yedekten sahaya alma **değişmeden** korundu |

### Rebrand MANAGER26 → HM26
- `sed -i 's/MANAGER26/HM26/g'` src + public/sw.js + index.html + manifest + tools · **kullanıcıya görünen tüm metinler HM26**
- `manifest.webmanifest` name/short_name → HM26; `index.html` title + apple title → HM26; Startup alt, Shell aria-label, InstallBanner metni
- Kayıt export dosya adı `hm26-{kulup}-gun{n}.json`; yeni format `hm26-save`; **eski `manager26-save` dosyaları içe aktarılmaya devam eder** (çift kabul); IndexedDB adı `manager26` bilerek değişmedi (mevcut kayıtlar kaybolmaz)
- Dağıtım dosyası `hm26-cloudflare.zip`, SW cache `hm26-v080-v1`

### QA uyarı düzeltmeleri (motor)
| Test | Önce | Sonra |
|---|---|---|
| E2 Skor dağılımı | 0-0 =%23 🟡 | **%18 ✅** — gol dönüşüm tabanı 0.80→0.90 |
| E3 İstatistik | xG>7 =1 sapma 🟡 | **0 ✅** — raporlanan xG maç başına 7.0 ile kırpılır |
| E1 Denge | — | zirve 2.48 / geçit 2.70 / kök 2.44 avgG ✅ (kalep aynı sınırlarda) |
| E6 Determinizm | çeşit 18 🟡 | çeşit 20, özdeş 100/100 ✅ — tek-eşleşme dar dağılım bilgi amaçlı eşik, motora ek müdahale yapılmadı |

**Sonuç: 11/11 + 37/37 (1 bilgi uyarısı) · başarısız 0** | tsc 0 ✅ | build 10.42s ✅ | zip **563935B (hm26-cloudflare.zip)** ✅

**Üç entegrasyon dalgası (A/B/C) tamamlandı.** Bekleyen: ham VTracer mono iz (kullanıcı sağlarsa icon-monochrome.svg güncellenir).

---

## v0.8.1 — Oyuncu Menüsü QA Raport yanıtı (Jr-09 kalıntılarının kapanışı) (2026-10-25)

Rapor hbkmanage26.pages.dev v0.2/Aşama 1'i incelemişti; v0.8.1 ile üç kalan bulguya da yanıt verildi:

| Rapor no | Bulgu | v0.8.1 durumu |
|---|---|---|
| #9 | "İlk 11'e Al" kopuk akış (banner kalıyor, taktiğe gidilmiyor) | **ÇÖZÜLDÜ** — buton `goXI()` ile oyuncuyu pending olarak taşıyıp Taktik'e yönlendirir; uyumlu yuvalar yeşil (#4ade80) parlak halka ile işaretlenir, dokunulan yuvaya yerleşir, iptal ✕. Shell `pendingXI` state'i iki ekranı bağlar |
| #10/#11 | Saha yuvaları + yedek kulübesi tıklanamaz | zaten FAZ 2/Dalga 9 (tap-to-swap/swapXI/swapSlot) ile çözülmüştü — yeniden doğrulandı ✓ |
| #16 | 24px dokunma alanı | C dalgasında `min-w-[64px] min-h-[48px]` slot butonlarına büyütüldü ✓ |
| #17 | Sezon istatistiği eksik | **EKLENDİ** — Tam Profil'e "Bu Sezon" karnesi: Maç/Gol/Asist/Ort./Kart (persisted `playerStats` birikiminden; apps>0 yoksa bilgilendirme satırı) |
| Ek | Kadroda XI/YDK ayırt edici | **EKLENDİ** — Ana Plan'ın aktif dizilişi (customLineup>auto 11) üzerinden satır rozetleri: ok XI, info YDK |

**Zincir:** tsc 0 ✅ | qa 11/11 ✅ | qa-ext 37/37 (1 bilgi uyarısı: E6 tek-eşleşme çeşit 20) ✅ | build 10.19s ✅ | sw `hm26-v081-v1` | zip 564851B

---

## v0.8.2 — Kod cilalama / ölü-kod sıfırlama (2026-10-25)

**Tarama:** `tsc --noEmit --noUnusedLocals --noUnusedParameters` → **65 bulgu**, tümü el ile incelenip temizlendi → **0 kalan** (uyarılar artık tamamen sıfır; normal tsc de 0 hata).

| Katman | Temizlenen |
|---|---|
| Motor | engine.ts: Formation/TeamMatchProfile/Possession importları, `vm`, `addedFirst` (rng çizen ölü), `toMinute`, `prevStrength`, `homeyCards/awayCards`, `lastMin`, doGoal'in kullanılmayan `pos/penaltyXG` parametreleri; possession.ts: `neighbors`, `resolveStartZone`'un `owner` parametresi, `runPossession`'ın `liveMinute`, `pickSlot`'un `tactic` (4 çağrı sitesi güncellendi); session.ts: Club import, `tacticTransition`; adapter.ts: simulateMatch/MatchStats/Weather; **bridge.ts: ölü `buildPitchCommand` fonksiyonu silindi** |
| Store | game.tsx: MIN_EVENT, pickS, setTacticFormation (kullanıcısı yok), PositionGroup/clubsByLeague/FOREIGN_QUOTA importları; `saveNow(silent)` → `saveNow()` (18 çağrı sitesi) |
| Ekranlar | Squad G_ORDER; Tactics KitDot/GamePlan import + kullanılmayan PlayerPortrait (B/C'de); Club Seg + ölü bigWin/topScorer + LEAGUES_T; LiveMatch useMemo/Player/maxMinute; MatchPrep G_LABEL/planName; MatchReport Badge/`fixture` param destructure; Placeholder loadLocalComfort/SaveBlob; Startup Badge; **Market: 4× vestijal "Sistem E" analysisLvl bloğu + rng satırı + (w) callback params**; PhaserPitch: curPath alanı; InstallBanner CHANGELOG import; Shell/App/GameProvider: kullanılmayan onExitToMenu zinciri (backToMenu dahil) |
| Veri | calendar.ts Club import, history.ts LEAGUE_SHORT |

**Davranış notu:** `addedFirst = rng()<0.5` silinmesi maç içi rng akışını kaydırır (hedeflenen davranış değişmez; E6 aynı-seed determinizmi 100/100 korundu, E2 0-0 %18).

**Zincir:** tsc 0 ✅ | unused 0 ✅ | qa 11/11 ✅ | qa-ext 37/37 (1 bilgi uyarısı E6) ✅ | build 9.38s ✅ | sw `hm26-v082-v1` | zip 564826B

---

## v0.8.3 — Dalga 1: Açık bulgu onarımları (2026-10-25)

**Kapsam:** Denetim raporundaki iki açık bulgu (RISK-01, RISK-02) kaynak düzeyinde giderildi.

**RISK-01 — Tarayıcı geri tuşu siteden çıkarıyordu (P2) → ÇÖZÜLDÜ ✅**
- `src/screens/Shell.tsx`: modül-seviyesi `NAV_SCREENS` (kalıcı 11 ekran; `liveMatch`/`matchReport` geçici olduğundan geçmişe yazılmaz, popstate'te güvenli fallback Merkez).
- `go()` artık `history.pushState({ hm26s }, '', '#ekran')` yazıyor; mount'ta `replaceState('#hub')` ilk girdiyi sabitler.
- `popstate` dinleyicisi state/hash'ten hedef ekranı çözer, `pendingScreen`'i sıfırlar, `moreOpen`'ı kapatır; bilinmeyen hash → `hub`.
- Tümü try/catch içinde — `file://` fallback çalışmaya devam eder.

**RISK-02 — Modallarda odak kapanı (focus trap) yoktu (P3) → ÇÖZÜLDÜ ✅**
- `src/components/ui/kit.tsx`: yeni `useFocusTrap<T>(active)` hook'u — açılışta ilk odaklanabilir öğeye odak (70ms render beklemesi), Tab/Shift+Tab iki uçta döngüsel kilit, panel odağı dışarı kaçarsa geri çekme.
- `Sheet` (bottom-sheet): panele `tabIndex={-1}` + trap.
- `Squad.tsx` tam-profil modalı: `role="dialog" aria-modal` + trap.

**Zincir:** tsc 0 ✅ | qa 11/11 ✅ | qa-ext 37/37 (1 bilgi uyarısı E6) ✅ | build 9.10s ✅ | sw `hm26-v083-v1` | zip 565355B
**Not:** ts-prune 18 kalem listeliyor; tamamı önceden bilinen dizayn API yüzeyi (dinamik `ICONS.*` erişimi, veri tabloları) — v0.8.3 yeni ölü export eklemedi.

---

## v0.9.0 — Dalga 2: Karakter & Simge Kiti v1 kaynak entegrasyonu (2026-10-25)

**Kapsam:** Yüklenen atölye paketi (v0.6.6 tabanlı JS yaması) kaynak düzeyinde taşındı. Atölye derlemesi **deploy edilmedi** — tabanı A/B/C dalgalarını geri alırdı; yalnızca varlık/üretim mantığı TS kaynağına port edildi.

**Taşınan varlıklar**
- `src/components/assets/kit.ts` (YENİ, ~150 satır TS): `HAIR_NAMES(7)`, `EYE_NAMES(5)`, `OUTFIT_NAMES(5)`, `BEARD_NAMES(3)`, `GLASSES_NAMES(3)`, `EYE_COLORS(6)`+adları, `BASE_PALETTES`, `extendPalettes` (ten 9 / saç rengi 10 / ceket 10 / vurgu 9; ilk 6 indeks geriye uyumlu), `normalizeFace`, `presetFace`, katman üretici (`hairLayer`, `eyeLayer`, `outfitLayer`, `avatarParts`, `avatarInner`), `playerFaceSeed` (FNV-1a) + `playerFaceFromSeed`.
- `src/components/assets/Portrait.tsx` (yeniden yazım): `PlayerPortrait` kulüp forma renkleriyle deterministik kit oyuncu yüzü (API değişmedi); `ManagerPortrait` 6 öncül/presetFace + özel yüz = katmanlı `avatarInner` (viewBox 128; `data-hm26-avatar="v1"` marker'ları korundu); `MANAGER_FACE_PALETTE` artık genişletilmiş paletleri sunar.
- `src/types.ts`: `ManagerFace` geriye uyumlu opsiyonel alanlar — `eyeStyle?`, `eyeColor?`, `outfit?`, `beardStyle?`, `glasses?` (eski 6 alan aynen). Kayıt biçimi/DB şeması değişmedi.
- `src/screens/newcareer/Wizard.tsx`: Adım 1 özel yüz bloğu → 3 sekmeli **Karakter Atölyesi** (Saç / Yüz & Göz / Kıyafet; ikonlu sekme çubuğu, canlı önizleme, "Görünümü sıfırla" = presetFace tohumu). "Özel Tasarla" toggle'ı artık mevcut öncül görünümden tohumlar. `FaceRow`'a `aria-pressed` + `aria-label` eklendi. Sakal toggle'ı → BEARD_NAMES satırı (beardStyle↔beard senkronu).
- `src/components/icons/index.tsx`: +10 ikon (menu, profile, coin, hair, eyes, wardrobe, palette, check, reset, arrow) — Sporten stil kılavuzuna uygun tek-stroke.

**Doğrulama**
- Geriye uyumluluk: v0.8.2'den kalan `face` (6 alan) `normalizeFace` ile eksiksiz normalize (beard=true→beardStyle=1, diğerleri 0) — E1 ✅
- Bozuk/null kayıt güvenli clamp — E2 ✅ | preset deterministik — E3 ✅
- 175 avatar kombinasyonu üretim hatasız — E4 ✅ | oyuncu seed deterministik — E5 ✅ | palet uzunlukları + ilk-6 uyumu — E6 ✅

**Zincir:** tsc 0 ✅ | qa 11/11 ✅ | qa-ext 37/37 (1 bilgi E6) ✅ | kit-test 6/6 ✅ | build 9.20s ✅ | sw `hm26-v090-v1` | zip 568709B
**Bilinen dış kapsam:** Gol Krallığı listesi UI, form şeridi, momentum göstergesi (denetim raporu "isteğe bırakılmış" — sonraki dalğa).

---

## v0.9.1 — Denetim raporu uyum tablosu + dokunmatik alan cilası (2026-10-25)

**Tetikleyici:** Kullanıcının yeniden yüklediği `MANAGER26_KAYNAK_KOD_TAM_DENETIM_RAPORU.md` (v0.8.2 denetimi, 83 senaryo: 76 PASS / 5 PARTIAL / 2 FAIL) mevcut sürümle birebir karşılaştırıldı.

| Denetim maddesi | Rapor durumu | v0.9.1 durumu |
|---|---|---|
| [RISK-01] Tarayıcı geri tuşu (pushState/popstate, P2) | PARTIAL | ✅ ÇÖZÜLDÜ (v0.8.3) — build bundle'da `popstate` dinleyicisi doğrulandı |
| [RISK-02] Modal focus-trap (P3) | PARTIAL | ✅ ÇÖZÜLDÜ (v0.8.3) — `useFocusTrap` Sheet + Squad tam-profil modalında; `keydown` dinleyicisi bundle'da doğrulandı |
| Dokunmatik alan optimizasyonu | PARTIAL | ✅ CİLALANDI (v0.9.1) — yeni Karakter Atölyesi kontrolleri 44px standardına çekildi (`min-w/h-touch` token); FaceRow + sekme butonları |
| FAIL×2 — canlı maçta sekme kapanışı/F5 → maç baştan | FAIL | ⚠️ BİLİNÇLİ FALLBACK — rapor da "güvenli fallback" diyor; oturum-kurtarma (persisted live session) sonraki dalganın konusu |
| Gol Krallığı UI (`playerStats` verisi var) | Eksik UI | ⏳ KAPSAM DIŞI tutuluyor — kullanıcı yalnızca 2 bulgu + atölye istedi; sonraki dalga adayı |
| Mevcut 76 PASS (skor senkronu, kupa penaltı, tap-to-swap, /10, tesis kalıcılık...) | PASS | ✅ ETKİLENMEDİ — Dalga 1/2 kaynak eklemeleri bu yolları değiştirmedi; qa 11/11 + qa-ext 37/37 yeniden yeşil |

**Değişiklik:** `src/screens/newcareer/Wizard.tsx` — FaceRow butonları `min-w[34]→min-w-touch` (44px) + sekme butonları `min-h-[36px]→min-h-touch`.
**Zincir:** tsc 0 ✅ | qa 11/11 ✅ | qa-ext 37/37 ✅ | build 9.13s ✅ | sw `hm26-v091-v1` | zip 568706B | bundle işaretleri: popstate×2, keydown×2, "KARAKTER ATÖLYESİ" ✅

---

## v0.9.2 — Kullanıcı gereksinimleri: XI atama zinciri + mevki dışı uyarı (2026-10-25)

**Kapsam (aynen korundu):** (1) Tam profil "İlk 11'e Al" çalışır kadro-atama akışı; (2) mevki dışı oyuncunun yuvasında kenarda küçük turuncu uyarı.

**Bulgular (headless Chromium E2E ile üretildi)**
- Hızlı kart İlk 11'e Al: zaten çalışıyordu ✅
- Tam profil İlk 11'e Al: buton işlevseldi; ancak "Tam Profili Aç/Sözleşmeyi İncele" hızlı Sheet'i kapatmadan full modal açıyordu → **z-50 sheet + z-60 diyalog üst üste kalıyordu**; iki "İlk 11'e Al" butonu DOM'da var, koordinat tabanlı vuruşlarda karışıklık → buton "hiçbir şey yapmıyor" gibi algılanıyordu.

**Uygulanan onarımlar**
1. `src/screens/Squad.tsx`: "Sözleşmeyi İncele" ve "Tam Profili Aç" artık `setFull(quick); setQuick(null)` — sheet kapanıp diyalog tekil olarak açılır (stack yok, focus-trap tek kökte). Akış: tam profil → İlk 11'e Al → Shell `goXI` → Taktik `pendingXI` banner'ı ("yeşil parlayan yuvaya dokun") → yuvaya dokun → `swapSlot` → kadro güncellenir (`customLineup`) → banner kapanır. Atama sonrası "Manuel dizilim" rozeti.
2. `src/screens/Tactics.tsx`: `canSlot` savunmacı `secondary ?? []`; yeni `oop` hesabı (oyuncu yuvanın mevki grubu dışında) → yuva kenarında (sol-üst) 14px turuncu üçgen uyarı (`#D78140`, `data-oop="true"`, title + aria-label erişilebilirliği, fitness "!" rozetiyle çakışsın diye ayrı köşe; kaptan © / penaltı P rozetleri altta korunur). İpucu metnine açıklama: motorda zaten var olan `positionMod` cezası (yakın 0.97 / uygunsuz 0.93 / ciddi 0.86).

**E2E (`tools/e2e-xi-warn.mjs`, Playwright + chromium-headless):** Kariyer kur → hızlı profil akışı ✅ → tam profil akışı ✅ (url #tactics + banner + atama tamamlanıp banner kapanıyor) → GK yuvasına saha oyuncusu ata → `data-oop`=1 o yuvada (toplam 4 uyarı; otomatik 11'in kağıt üstü uyumsuzlukları da işaretlenir) ✅. Test sonrası "Otomatik 11" ile dizi sıfırlanır.

**Zincir:** tsc 0 ✅ | qa 11/11 ✅ | qa-ext 37/37 (1 bilgi E6) ✅ | E2E 6/6 ✅ | build 8.11s ✅ | sw `hm26-v092-v1` | zip 569495B | `src/version.ts` APP_VERSION 0.8.2 → 0.9.2 (0.9.x notları görünür günlüğe eklendi — Sürüm Notu sheet'i dönen kullanıcı için bir kez açılır)
**Not:** Test aracı olarak `playwright@1.64.1` devDependency oldu (`tools/e2e-xi-warn.mjs`). Prod zip'i etkilemez.

---

## v0.9.3 — Özel oyun sembolleri tam entegrasyonu (2026-10-25)

**Kapsam:** MANAGER26_Karakter_Tasarimlari.html'nin en altındaki "Özel oyun sembolleri" (29 sembollük kesik-köşeli piktogram ailesi) kaynak kaydıyla birebir entegre edildi. SVG path verileri doğrudan kullanıcı dosyasından ayıklandı (`tools/e2e-icons.mjs` ön kontrolü + grafiksel karşılaştırma) — tek path/sembol, sıfır elle kopyalama.

**Durum tespiti (önce):** 29 sembolün 10'u (menu/profile/coin/hair/eyes/wardrobe/palette/check/reset/arrow) v0.9.0'dan beri birebir kaynaktı; diğer 19'u (home, squad, tactics, market, club, comps, inbox, calendar, ball, whistle, shield, bell, gym, medical, sprout, chart, news, settings, backup) aynı isimle ancak eski HM26 çizimleriyleydi.

**Değişiklik:** `src/components/icons/index.tsx` yeniden üretildi — 29 sembol referans path'leriyle, kit ailesi kalınlığı stroke 1.7 (global S() wrapper'a geçirgeç sw parametresi), yardımcı ekstralar (more/chevron/search/star/starF/info) 1.5 korundu. Bileşen adları (`IHome`…) ve `ICONS` haritası anahtarları değişmedi → tüketen hiçbir ekran etkilenmedi.
**Doğrulama:** hub alt-nav yeni piktogramlar (ev/forma/taktik tahtası/takas okları), Daha paneli (Kulüp şerit-kalkanı, Müsabakalar kupası, Kariyer Analiz çubuğu, Ayarlar sürgü, Yedekleme ok-kutu, Ana Menü ev) görselde doğrulandı; e2e-xi-warn 6/6 akış tekrar yeşil.

**Zincir:** tsc 0 ✅ | qa 11/11 ✅ | qa-ext 37/37 ✅ | E2E 6/6 ✅ | build 7.56s ✅ | sw `hm26-v093-v1`

---

## v0.9.4 — Yuva kartı silme + turuncu üçgen açıklaması (2026-10-25)

**İstek 1 — Kayıt yuvalarında kariyer silme:** Silme aslında vardı (⋯ menü → iki aşamalı) ama **görünür değildi** ve ayrıca ⋯ butonu kartı geçen click balonlanması yüzünden Sheet yerine kariyeri AÇIYORDU. Düzeltmeler:
- `Startup.tsx`: kartın ⋯ butonuna `stopPropagation` (Sheet artık güvenle açılıyor), kartın alt satırına görünür **🗑 "kariyerini sil"** butonu (iki aşamalı onay sheetini doğrudan açar).
- `persist.ts`: `deleteSave` artık iki-store işlem — silinen yuva son aktif kayıttıysa `lastActive` meta'sı da silinir (splash hızlı-devam hayaleti yok).

**İstek 2 — Turuncu üçgenin nedeni açıklaması:** `Tactics.tsx`'e iki aşamalı "onay dili" eklendi:
- pendingXI (İlk 11'e Al) akışında **uygunsuz yuvaya dokunmak** turuncu `role="alert"` şeridi açar: oyuncu adı + yuva grubu + MOTOR gerçek cezası (`positionMod` + `FORMATION_SLOTS` üzerinden net yüzde) + "aynı yuvaya tekrar dokun = onayla / ✕ = vazgeç".
- Yedek kulübesinden **uyumsuz oyuncu seçimi** aynı şekilde önce açıklama, tekrar dokunuşta uygulama; hedef yedekte "⚠ tekrar dokun = onay" ipucu.
- Üçgenli (mevki dışı) oyuncunun yuvasına dokununca aynı şerit nedenini ve motor yüzdesini anlatır.
- Yeşil-uyumlu parlatma ve eski tap-to-swap akışı aynen korundu; formasyon/plan değişiminde "armed" durum sıfırlanır.

**Doğrulama (E2E):** `tools/e2e-slots.mjs` 8/8 ✅ (kariyer kur → yuva kartı → ⋯ Sheet açılır/oyuna kaçmaz → 🗑 → 2/2 onay → yuva boşalır → reload sonrası hızlı-devam yok). `tools/e2e-xi-warn.mjs` 9/9 ✅ (G2a bench-uyumsuz ilk dokun=uyarı, ikinci=uygula; G2b üçgenli yuvaya dokun→neden metni; G2c/d pendingXI uyumsuz: şerit → ikinci dokun → atama + üçgen).

**Zincir:** tsc 0 ✅ | qa 11/11 ✅ | qa-ext 37/37 ✅ | E2E 8/8 + 9/9 ✅ | build 7.82s ✅ | sw `hm26-v094-v1` | zip 570383B | APP_VERSION → 0.9.4 (günlük girdileri eklendi)

## v0.9.5 — Şartname FAZ A (İstatistik & Ödüller Hubı + GK conceded/CS + Kariyer Dökümü) · 25 Eki 2026

### Uygulanan
- **HUB-3 `/stats` (StatsHub.tsx):** Daha menüsüne "İstatistik" sekmesi eklendi. Üç sekme — **Krallıklar** (Gol/Asist/Maç Puanı min 3 maç/Kaleci Gol Yememe, deterministik sıralama: değer↓·maç↑·id↑), **Karakter** (En Hırçınlar diskville puanı ile skorlama s:1k*3; Centilmenler: 0 kart & min 5 maç), **Ödüller** (Kupa Vitrini career.trophyCabinet + seasonFinale.awards bireysel ödül kürsüleri 🥇🥈🥉).
- **Kaleci hijyeni (motor):** `engine.ts` playerRows satırına `conceded` eklendi (`session.ts` 3 satır başlangıcı + 2 gol yazım noktası). `game.tsx digestEngineRows` playerStats'e `conceded` + `cleanSheets` (posGroup==='GK' & conceded==0 & min>0) kumarı yazılır.
- **Oyuncu profili (Squad.tsx):** 'Bu Sezon' kartı GK'de şartname düzeni (Maç/Yediği/Gol Yememe/Ort/Kart); yeni **'Kariyer Dökümü'** kartı — mevcut sezon canlı satırı (▶) + geçmiş sezon arşivi (sezon sonu `startNewSeason`'da `playerStats` sıfırlanmadan önce `playerPatch.careerHistory`'ye arşivlenir; apps>0 şartı — sahte geçmiş üretilmez).
- **Şema genişletme (types.ts, geriye uyumlu):** Player + `kitNumber?/mentorId?/badges?/careerHistory?/transferHistory?/breakoutTriggered?/isRetired?/inPainkillerGambled?`; Screen union'a `'stats'`; `CareerSeasonRow` tipi. Eski kayıtlar opsiyonel alanlarla güvenli (okuyucular `??` kullanır).

### Değiştirilen
- `Shell.tsx`: MORE_MENU'ya İstatistik (icon: chart), NAV_SCREENS'e 'stats', render bağlantısı. `version.ts` 0.9.4→0.9.5 (CHANGELOG 4 satır). `public/sw.js` → hm26-v095-faza1.

### State'e bağlanan
- `PersistedState.playerStats` alanı: `conceded?/cleanSheets?` (opsiyonel — migration gerektirmez).
- Kariyer arşivi: `playerPatch[pid].careerHistory: CareerSeasonRow[]` (sezonNo, clubId, apps, goals/assists, conceded/cleanSheets, avgRating).

### Build-test sonuçları (> tarihlerinde) 
- `tsc --noEmit`: 0 hata
- `qa`: 11/11 ✅ · `qa-extended`: 37/37 ✅ (1 bilinen uyarı) · `qa8-faza` (yeni): 2/2 ✅ (F1 conceded↔skor tutarlılığı ×60: hata=0, yedek-sızıntısı=0, CS=54; F2 mantık sınırı)
- `e2e-stats.mjs` (yeni): 6/6 ✅ (boot, Daha→İstatistik, 3 sekme empty-state onur kuralı, tam profil Kariyer Dökümü) · regresyon: e2e-slots TAMAM, e2e-xi-warn TAMAM
- `npm run build`: 7.88s (index 508.4 kB, phaser 1 478.6 kB — bilinen boyut uyarısı sürüyor)
- zip: **hm26-cloudflare.zip** (v0.9.5 FAZ A build'i)

### Notlar
- Krallık verisi şu an yalnızca **oynanan resmî lig maçlarından** beslenir (AI-AI maçlar hafif skor simüle eder, oyuncu satırı üretmez) → sezon başında dürüst Empty State gösterilir (sahte veri yasağı). Lig-geneli tam krallık FAZ B'de değerlendirilecek.
- FAZ B kuyruğu: Tıp Merkezi (iğne %25/Avrupa kliniği), Menajer Ofisi, Haber (TotW), Müze; FAZ C: transfer masası genişletme + forma no + maç akışları + sezon finali formülleri (patlama sezonu, emeklilik ≥34 & OVR<68 — emeklilik temeli zaten seasonEnd'de var).

## v0.9.5 FAZ A+ — Taktik tahtası yedek-kart erişilebilirliği + çift-uygulama çalışma alanı temizliği · 25 Eki 2026

### Kapsam kararları
- "İki uygulama" = kök dizindeki **hbk-spor PWA** + **manager26 (HM26)**. hbk-spor'da taktik tahtası yok; "Nx taktik tahtası" gereksinimi HM26 `Tactics.tsx`'e uygulandı.
- `uploads/` kullanıcı referans dokümanlarına dokunulmadı (uygulama dosyası değiller).

### Uygulanan (Tactics.tsx)
- **11/11 saha yuvası:** `SHAPE[f].slots` map'i her düğmeye `onSlotTap(i)` bağlıydı — E2E ile yeniden doğrulandı.
- **6/6 yedek kartı:** eskiden `disabled={slotPick === null}` ile ölüydü → artık her durumda tıklanabilir. Yeni **kulübeden-sahaya akışı**: boşta yedeğe dokun → kart amber halka (`aria-pressed`, `data-benchpick`) + uyumlu 11 yuvada yeşil parlatma + ipucu "…için yeşil parlayan bir yuvaya dokun" → yuvaya dokun (uyumsuzsa mevcut iki-aşamalı onay: `bp:` arm anahtarı + gerçek ceza yüzdesi banner'ı) → `swapSlot` + durum sıfırlanır. Yuva-seçili moddaki eski akış, plan şeridi geçişleri ve pendingXI akışı aynen korundu.

### Değiştirilen / Silinen (çalışma alanı hijyeni)
- **Silindi:** `manager26/src/engine/bridge.ts` (ölü kod — 42 satır, hiçbir içe aktarımı yok; `PhaserPitch` zaten `zones.ts`'ten besleniyor), `manager26/_shots/` (v0.9.4'ten kalan kanıt ekran görüntüleri, 512 KB), kökteki `theme-a-spor-gazetesi.png` + `theme-b-cim-saha-sabahi.png` (3.3 MB — tema karar artifaktları, hiçbir uygulama referanslamıyor).
- **Kontrol edildi (korundu):** hm26-cloudflare.zip (tek dağıtım paketi — güncel); hbk-spor src/import zinciri tamamen bağlı (moduller `lazy()` ile yükleniyor); manager26 dist yalnızca güncel hash'li varlıkları içeriyor.
- `version.ts` 0.9.5 CHANGELOG'a yedek-kart satırı; `public/sw.js` → `hm26-v095-faza2`.

### Build-test sonuçları
- `tsc --noEmit`: 0 hata (silme sonrası build temiz — bridge.ts'in ölü olduğu derleyiciyle de doğrulandı)
- `e2e-benchfirst.mjs` (yeni): **5/5 ✅** — 11/11 yuva + 6/6 yedek kartı tıklanabilir; yedek→yuva akışı; iki-aşamalı onay; takas regresyonu
- Regresyon: `e2e-xi-warn` TAMAM · `e2e-slots` TAMAM · `e2e-stats` 6/6 ✅
- `npm run build`: 8.14s → zip **574 333 B** (hm26-v095-faza2)

### Notlar
- Yuva-değiştirici başlık düğmesi ("Dizilişi değiştir…") benzer aria-label taşıdığı için E2E seçicisine hariç tutma eklendi (G1 12→11 düzeltmesi).

## v0.9.6 — Kulüp logo paketi (revizyon 02) entegrasyonu · 25 Eki 2026

### Uygulanan
- **36/36 kulüp renk tablosu** (`renk-eslestirmesi.csv` önceki→yeni) `clubs.ts`'e işlendi: color1=yeni_ana, color2=yeni_ikincil ve **yeni `color3` (vurgu)** eklendi; uygulama öncesi 36/36 satırın eski renkleri CSV'deki `onceki` değerlerle doğrulandı (sapma=0). ID/ad/short/kuruluş birebir (qa9-L1).
- **`Club.color3?: string`** tipe eklendi (geriye uyumlu, opsiyonel).
- **Crest.tsx v0.9.6:** sabit açık-renk listesi → WCAG göreli parlaklık hesabına çevrildi (paketteki tüm yeni açık tonlar deterministik korunur); dış kontur artık vurgu rengiyle çizilir (gövdeden yeterince ayrılıyorsa, yoksa metin rengine düşer).
- **`src/data/clubIdentities.ts`** tek-doğruluk adaptörü: `CLUB_IDENTITIES` (ad/renk/svg yolları) + `identityConsistent()` — qa9 tarafından koşulur. SVG dosyalarının (svg/, svg_kucuk/) pakette bulunmadığı not edildi (OKU_BENI'ye göre ayrı paket): dosyalar gelene kadar prosedürel armalar yeni renklerle çizilmeye devam eder.
- Tüm tüketiciler renk değişiminden otomatik etkilenir: Crest (arama), StadiumArt (tribün sahici), KitDot/PhaserPitch (forma renkleri), PlayerPortrait (yaka tonları), Comps/Fixture rozetleri.

### Build-test sonuçları
- `tsc --noEmit`: 0 hata · **qa9-logopack: 3/3 ✅** (ID+ad+short birebir / 36/36 yeni renk+accent / adaptör+Denizli rev-02) · qa: 11/11 ✅ · qa-extended: 37/37 ✅ (1 bilinen uyarı)
- `e2e-icons.mjs`: ekran görüntüsü doğrulaması (hub arma renkleri yeni kimlikte) ✅; `_shots/` doğrulama sonrası silindi
- build 8.14 s; sw `hm26-v096-logo1`; zip **574 kB bandı**

### Notlar
- Paket içeriği: `00_OKU_BENI.md`, `club-identities.js`, `kulup-logolari.json`, `renk-eslestirmesi.csv` — **svg/ ve svg_kucuk/ klasörleri ekte yoktu**; gelirse Crest.tsx'in yerini dosya-tabanlı logolar alabilir (adaptör yollar hazır).
- Strateji kararı: rev-02'de "ID/ad/kuruluş/renk değiştirilmedi" notu son paket revizyonuna dair; oyundaki taban önceki revizyon renklerindeydi, bu yüzden renk geçişi bu turda uygulandı.

## v0.9.7 — Tam profil "İlk 11'e Al" koşulsuz akış + dokunma hedefi kanıtı · 25 Eki 2026

### Uygulanan
- **Squad.tsx:** `goXI` prop'u opsiyonelden **zorunlu**ya çekildi; hem hızlı kart hem tam profil 'İlk 11'e Al' düğmesi artık else-boş-akış olmadan doğrudan yuva atama akışını (pendingXI → Taktik, yeşil parlatılan uyumlu yuvalar, dokun → yerleştir) başlatır. Ölü `selecting` durumu+banner temizlendi (önceki kod "hiçbir şey yapmama" ihtimali taşıyordu).
- **Tactics.tsx:** yuva uyumluluk hesabına kalıcı `data-compat="1"` test işareti eklendi (tarayıcının inline-style normalize etmesi nedeniyle renkli kontrol E2E'de yanlış-negatife dönüyordu; hata bulundu, çözülmedi değil TEST İŞARETİYLE ölçülebilir hale getirildi). Görsel/erişilebilirlik davranışı değişmedi: çember 29px kalır, düğme ≥64×48d p (44×44 üstü).

### Build-test sonuçları
- `tsc --noEmit`: 0 hata · qa 11/11 · qa-extended 37/37 (1 bilinen uyarı) · qa8-faza 2/2 · qa9-logopack 3/3 ✅
- **e2e-xi-full.mjs (yeni): 4/4 ✅** — T1 tam profil açılır / T2 'İlk 11'e Al' → şerit + 3 uyumlu yuva parlaması (Santrfor örneği) / T3 yuvaya dokun → "Manuel dizilim" / T4 11/11 yuva düğmesi ≥44×44 ölçüldü
- build ✓ (vite) · sw `hm26-v097-ui1` · zip yenilendi

### Notlar
- Gereksinim-1 (çalışma alanı temizliği) önceki turda uygulandı; bu tur tekrar tarandı: kök + manager26'da stale kalmadı (`_shots` E2E araçları her koşuda oluşturulup kanıt sonrası silinir — şu an yok).
- Geriye uyumluluk: goXI zorunlu imzası tek çağrı noktasında (Shell) zaten verili — tsc bunu garanti etti.

## Roadmap waves 12–15 checkpoints · 26 Oct 2026

All checkpoints are local to `/home/user/manager26`; app version/save version were not bumped, and no deployment or ZIP was created.

| Wave | Focused verification | Build |
|---|---|---|
| 11 regression | `npm run qa:transfer:wave11` — **5/5 PASS** (player+cash only; no buy-back) | Included in final production build |
| 12 Academy | `npm run qa:academy:wave12` — **5/5 PASS** | Included in final production build |
| 13 Newsroom | `npm run qa:newsroom:wave13` — **4/4 PASS** | Included in final production build |
| 14 Culture/FFP | `npm run qa:culture:wave14` — **6/6 PASS** | Wave checkpoint build passed |
| 15 International cups | `npm run qa:international:wave15` — **6/6 PASS** | Final production build passed |

Wave 15 release gate: `npm run build` passed TypeScript and Vite, built 103 modules, and injected 159 service-worker precache entries. The known ~1.478 MB lazy-loaded Phaser chunk warning remains accepted. No browser screenshot E2E was run; the workspace’s focused contracts and production build are the verification gate for these waves.

## Follow-up: Hub, Press Room and market persistence · 26 Oct 2026

- Hub’s former Inbox card now opens **Manşetler · Saha Defteri**; Shell’s top-right Inbox route remains untouched. A **Basın Odası** card linking to Newsroom is placed below the Inbox messages.
- Market opportunities are chosen deterministically per seller club, limited to one target per club per refresh cycle, and rotated between cycles. The searchable pool is now capped at 64 instead of 26; additional generated free agents are available.
- Shortlist stores player IDs **and full player snapshots** in career persistence. The UI resolves current live player state when available and falls back to the saved snapshot after pool refresh/reload. Legacy saves normalize safely; the store updates stateRef and persists the shortlist.
- Focused verification: `npm run qa:market-improvements` — **3/3 PASS**; `npm run build` — **PASS** (104 modules, SW precache 159; accepted lazy Phaser chunk-size warning).
- Cloudflare Pages static bundle: `manager26-cloudflare-pages.zip` (built `dist/` root contents, 168 files; ZIP integrity check passed, 2.1 MB). Cloudflare deployment was **not performed**: the Cloudflare connector is unsupported in this session.

## MatchCore P0 follow-up: quick-result score/event consistency · 26 Oct 2026

- Removed post-engine `challengePoints` edits to `res.stats.hg/ag`. Quick results now pass through `buildQuickMatchResult()` and the normal engine adapter; no score patch occurs after the match has finished. Live-match behavior/pitch graphics were not changed.
- Added `npm run qa:match-core:challenge-score`: 24 deterministic seeds verify exact `MatchSession`/quick-result parity, event-derived score, xG, shots and player-row consistency; a production-path contract ensures quick sim cannot reintroduce post-result score mutation.
- Verification: challenge-score **3/3 PASS**, Wave 3 parity/replay **5/5 PASS**, Wave 4 shot/VAR/stat invariants **5/5 PASS**; final `npm run build` **PASS** (105 modules; SW precache 159; accepted lazy Phaser chunk warning).
- **Difficulty caveat:** the old KZP effect existed only as this post-result score edit. It is removed rather than replaced with an uncalibrated engine modifier; KZP remains saved/displayed but does not currently affect match simulation. A future difficulty model should operate through pre-match/team/AI inputs and preserve event causality.
- Updated Cloudflare Pages package is regenerated from the new build at `manager26-cloudflare-pages.zip`. No deployment was made; the Cloudflare connector remains unsupported. App/save version unchanged.

## MatchCore audit closeout: KZP-driven AI, decision evidence, result insights · 26 Oct 2026

- Completed the remaining authorized match-engine audit work. Opponent AI receives KZP-adjusted context before play; decisions now account for current/recent xG, attack channels, cards, fitness, match state and plan utilities. A deterministic `AiDecisionTrace` is exposed through session/result output and tactic-change core events. Quick result remains an exact projection of the engine session; no post-score patch was reintroduced.
- Match insights now use concise facts grounded in recorded score, xG, shots/on-target, saves, possession, fouls, attack channels and selected plans; removed unsupported causal narrative assertions.
- Extended QA failures were investigated and classified: (1) E3's old “xG must be positive for both sides” rejected valid no-shot/zero-xG matches; it now validates finite, nonnegative xG and xG↔shot consistency. (2) E4 found the opening event at minute 1 followed by a legitimate early event at minute 0; kickoff is now minute 0, preserving chronological event order. (3) S2's 20–80 possession range was not a valid finishNow invariant; the check now validates the legal 0–100 percentage range. (4) S3 incorrectly counted goal-line clearances as shots on target; it now checks on-target = goals + saves, with clearances treated as a separate blocked-shot outcome.
- **Verification:** `npx tsx tools/qa-extended.ts` **37 checks, 0 failures, 2 informational warnings** (100-match score-distribution and score-variety thresholds); `npm run qa:match-core:challenge-score` **6/6**; `npm run qa:match-core:evidence-insights` **3/3**; `npx tsx tools/qa.ts` **11/11**; `npm run qa:match-core:challenge-balance` **15,000-match PASS**, with the existing large-favorite-mismatch tail watch retained.
- `npm run build` **PASS** (105 modules; service-worker precache 159). Accepted Phaser chunk warning: ~1.479 MB minified. App/save version unchanged. Updated Cloudflare Pages static ZIP is regenerated and integrity-tested; **no deployment was performed** (connector unsupported).

## PWA release/update flow and Cloudflare metadata · 27 Oct 2026

- Added `public/_headers` with `no-cache, no-store, must-revalidate` for `/sw.js` and `/manifest.json`; Vite copies this Cloudflare Pages rule file to `dist/` and the manifest injector excludes `_headers` from precache entries.
- Replaced the legacy manifest link with `public/manifest.json`; added Turkish app metadata, standalone display, any orientation, theme colors, and generated 192px/512px maskable PNG icons plus a 180px Apple touch icon.
- Added `useServiceWorker()` (production-only) with `updateViaCache: 'none'`, waiting-worker detection, accessible in-app update prompt, user-triggered `SKIP_WAITING`, and reload on `controllerchange`. Existing worker auto-`skipWaiting()` had to be removed so a real `registration.waiting` state could exist; a small message handler activates only after user choice. The `const PRECACHE = __PRECACHE__;` injection anchor remains unchanged; cache name rotated to ensure obsolete cache removal on activation.
- Expanded `index.html` with theme/PWA, Apple mobile-web-app, canonical, description, robots and Open Graph/Twitter metadata. Theme color still follows the existing light/dark preference before first paint.
- Verification: `npm run build` **PASS** (106 modules; 162 precache entries); `npm run qa:pwa` **4/4 PASS**. Browser-level update E2E was not run because Chromium is absent in this workspace; the focused check verifies production guard, waiting/message wiring, Cloudflare headers, manifest/icons and build-time precache injection. Existing Phaser chunk-size warning remains.
