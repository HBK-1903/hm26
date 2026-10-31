# HM26 — Sıralı Otomatik QA
**Çalıştırma:** 2026-10-31T09:15:27.020Z
**Sonuç:** 98/98 geçti · 0 başarısız
**Tam koşu kaynağı:** `f1108cd` uygulama ve test dosyaları; Node 22 ve Chromium 153 ile yerel çalışma.
**Sonraki kadro düzeltmeleri:** `f1108cd` sonrasında maç kadrosu rozetleri ve eski kayıtlardaki çift oyuncu görünümü düzeltildi. Build, gerçek maç oturumu/IndexedDB ile kadro-piyasa kontrolleri (62/62), Kadro UI testi ve 320/390 px açık-koyu Chromium kontrolleri (176/176) ayrıca geçti. Aşağıdaki 98/98 tam koşu bu son düzeltmelerden öncedir.
| # | Aşama | Sonuç |
|---:|---|---|
| 1 | QA runner exit, signal and timeout handling | ✅ PASS |
| 2 | Browser save readiness handles delay and stale data | ✅ PASS |
| 3 | Production build + TypeScript + offline manifest | ✅ PASS |
| 4 | QA preview server startup and cleanup | ✅ PASS |
| 5 | PWA headers, manifest, icons and update lifecycle | ✅ PASS |
| 6 | Content-derived service-worker build identity | ✅ PASS |
| 7 | Save integrity, legacy migration and transaction conflicts (jsdom) | ✅ PASS |
| 8 | Project-local security skill installation checks (not an audit) | ✅ PASS |
| 9 | Agency development role installation checks (not independent agents) | ✅ PASS |
| 10 | Core integrity / serialization QA (11 tests) | ✅ PASS |
| 11 | Save-slot season metadata and legacy compatibility QA | ✅ PASS |
| 12 | Stress and broad feature QA (37 tests) | ✅ PASS |
| 13 | Goalkeeper/stat consistency QA | ✅ PASS |
| 14 | Assets and brand manifest QA | ✅ PASS |
| 15 | Live engine parity (300 matches) | ✅ PASS |
| 16 | Quick-match score/event consistency (KZP patch regression) | ✅ PASS |
| 17 | Match insight evidence QA (60 deterministic results) | ✅ PASS |
| 18 | League/cup balance simulation (4,000 matches) | ✅ PASS |
| 19 | Medical, protest, penalty, shout and telemetry QA | ✅ PASS |
| 20 | Pitch Wave 1 geometry and goal-line clearance QA (6 checks) | ✅ PASS |
| 21 | Pitch formation, team colors and motion cadence | ✅ PASS |
| 22 | Live engine projection and speed parity | ✅ PASS |
| 23 | Shared UI notification timing | ✅ PASS |
| 24 | New career advanced world settings | ✅ PASS |
| 25 | Transfer presentation rules, voices and local artwork | ✅ PASS |
| 26 | Newsroom saved-evidence regression | ✅ PASS |
| 27 | Market refresh, shortlist and press-room links | ✅ PASS |
| 28 | MatchCore event/reducer contracts | ✅ PASS |
| 29 | Production simulation isolation, legacy adapter and replay | ✅ PASS |
| 30 | MatchCore state and deterministic input | ✅ PASS |
| 31 | MatchCore live/instant and replay parity | ✅ PASS |
| 32 | MatchCore shot and VAR consistency | ✅ PASS |
| 33 | MatchCore time, fatigue and player minutes | ✅ PASS |
| 34 | MatchCore injuries and substitutions | ✅ PASS |
| 35 | MatchCore referees and set pieces | ✅ PASS |
| 36 | MatchCore tactics and AI decisions | ✅ PASS |
| 37 | Goal pace, randomness and causal score calibration (6,480 matches) | ✅ PASS |
| 38 | League and favorite balance simulation (10,000 matches) | ✅ PASS |
| 39 | Challenge balance simulation (15,000 matches) | ✅ PASS |
| 40 | Transfer negotiation and resale clauses | ✅ PASS |
| 41 | Academy recruitment and limits | ✅ PASS |
| 42 | Club culture and financial decisions | ✅ PASS |
| 43 | Board budget approval, refusal, limits and durable save | ✅ PASS |
| 44 | International competition progression | ✅ PASS |
| 45 | AI appearances, score fingerprint, ratings and legacy saves | ✅ PASS |
| 46 | Classic interviews and outcomes | ✅ PASS |
| 47 | GameProvider played-fixture and durable save | ✅ PASS |
| 48 | Transfer negotiation and save integration (jsdom) | ✅ PASS |
| 49 | Sale negotiation, settlement and save integration (jsdom) | ✅ PASS |
| 50 | Market potential, rotation, match plan and legacy saves (jsdom) | ✅ PASS |
| 51 | Contract renewal and recorded match highlights (jsdom) | ✅ PASS |
| 52 | Live reactions, player comparison and weekly paper (jsdom) | ✅ PASS |
| 53 | Match arrival, award, training and career story (jsdom) | ✅ PASS |
| 54 | Newsroom and fan atmosphere regression (jsdom) | ✅ PASS |
| 55 | Tactics editor regression (jsdom) | ✅ PASS |
| 56 | Squad rotation and health regression (jsdom) | ✅ PASS |
| 57 | Matchday preparation regression (jsdom) | ✅ PASS |
| 58 | Batched halftime event and decision flow (jsdom) | ✅ PASS |
| 59 | Injury treatment and return do not repeat decisions (jsdom) | ✅ PASS |
| 60 | Match finish, last-whistle reaction and manual interview (jsdom) | ✅ PASS |
| 61 | Cancelled goal live presentation, audio and match finish (jsdom) | ✅ PASS |
| 62 | Match finish recovery after simulated engine failure (jsdom) | ✅ PASS |
| 63 | Matchday progression and end-day regression (jsdom) | ✅ PASS |
| 64 | Team insights and statistics UI (jsdom) | ✅ PASS |
| 65 | Player analytics and match history UI (jsdom) | ✅ PASS |
| 66 | Scout, interview and press profile UI (jsdom) | ✅ PASS |
| 67 | News and career analytics UI (jsdom) | ✅ PASS |
| 68 | Match preparation and league analytics UI (jsdom) | ✅ PASS |
| 69 | Playwright Chromium launch smoke test | ✅ PASS |
| 70 | Delayed career save readiness E2E | ✅ PASS |
| 71 | New career advanced world settings and save E2E | ✅ PASS |
| 72 | Embedded asset rendering E2E | ✅ PASS |
| 73 | Icon system E2E | ✅ PASS |
| 74 | Statistics and career history E2E | ✅ PASS |
| 75 | Complete statistics and league rankings E2E (320px and 390px) | ✅ PASS |
| 76 | Full tactical roster, league names and ratings E2E (320px and 390px) | ✅ PASS |
| 77 | Save-slot delete flow E2E | ✅ PASS |
| 78 | Backup, storage failure, legacy migration and stale-tab E2E (390px) | ✅ PASS |
| 79 | Backup, storage failure, legacy migration and stale-tab E2E (320px) | ✅ PASS |
| 80 | Board budget approval and reload on migrated career E2E (390px) | ✅ PASS |
| 81 | Board budget approval and reload on migrated career E2E (320px) | ✅ PASS |
| 82 | Service-worker two-release and offline isolation E2E | ✅ PASS |
| 83 | Save-before-update and multi-tab game update E2E | ✅ PASS |
| 84 | Full profile → starting XI E2E | ✅ PASS |
| 85 | Out-of-position warning E2E | ✅ PASS |
| 86 | Bench-first tactical flow E2E | ✅ PASS |
| 87 | Medical/mentoring/trade E2E | ✅ PASS |
| 88 | Transfer theatre, signing and offline media E2E | ✅ PASS |
| 89 | Market potential, rotation and sale negotiation E2E | ✅ PASS |
| 90 | Contract renewal and recorded match highlights E2E | ✅ PASS |
| 91 | Live reactions, player comparison and weekly paper E2E | ✅ PASS |
| 92 | Match arrival, award, training and career story E2E | ✅ PASS |
| 93 | Market filters and live tactic flow E2E (390px) | ✅ PASS |
| 94 | Market filters and live tactic flow E2E (320px) | ✅ PASS |
| 95 | Injury treatment and return E2E (320px home, 390px away) | ✅ PASS |
| 96 | Live scorebug, feed, accessible Phaser pitch and action E2E (v0.9.12) | ✅ PASS |
| 97 | Deterministic Phaser motion and pause E2E | ✅ PASS |
| 98 | PWA offline shell + cached bundles E2E (v0.9.12) | ✅ PASS |
## Bulgular ve açık işler
- **Bu koşudaki testler:** tüm aşamalar geçti; test kapsamı dışındaki kusurlar ayrıca incelenmelidir.
- **Otomasyon düzeltmesi:** eski E2E betiklerindeki :3001 adresleri ortak `HM26_BASE_URL` ile :4173 preview adresine alındı; yeniden koşuda ilgili akışlar geçti.
- **Tarayıcı ortamı:** Chromium indirme ve paylaşımlı sistem kütüphanelerini kontrol etme/kurma adımları ile launch smoke testi otomasyona eklendi.
- **Ek kapsam:** maç çekirdeği, klasik röportajlar, transfer/akademi/kulüp kültürü/uluslararası kupa ve ek arayüz testleri de artık bu sıraya dahildir.
- **Yönetim bütçesi:** mevcut güven, lig performansı ve mali verilere dayalı onay/ret; sezon başına tek onay, redden sonra 30 günlük bekleme ve kayıt/yeniden açma testleri kapsamdadır.
- **Maç çekirdeği:** canlı ve hızlı maçlar callback içermeyen, kopyalanmış girdi kullanan ortak üretim çekirdeğinde çalışır; eski oturum ve komut tekrar oynatma yolları uyumluluk adaptörleriyle korunur.
- **Denge:** ayrı normal lig ve favori ev/deplasman senaryoları 15.000 ve 10.000 maçta, gol temposu/rastlantısallık ayarları 6.480 maçta izlenir. `QA-MATCH-BALANCE.md` ana maç çekirdeğini karşılaştırır; ayrı, sonuç odaklı AI fikstür simülasyonunun takım başına 6 gol tavanı sürmektedir.
- **AI katılımı:** yeni sonuç odaklı AI maçlarında yalnız seçilen ilk 11 sayılır; değişiklik ve reyting üretilmez. Eski maçlarda oyuncu katılım geçmişi bulunmadığından eski hatalı sayılar geriye dönük uydurulmaz. Skor RNG parmak izi, tüm müsabakalar, puanlı maçlar ve gerçek v2 kayıt test edilir.
- **Ek AI örneklemi:** bu otomasyon dışında gerçek GameProvider ile 20 farklı başlangıçta 340 lig maçı ve 7.480 oyuncu katılımı kontrol edildi; skor toplamı, ilk 11 ve yedek ayrımında hata bulunmadı.
- **Kadro ve lig:** ilk 11 dışındaki tüm oyunculara erişim, gerçek maçın en fazla 9 yedeği, tam kulüp adları/form ve 320/390 px açık/koyu tema Chromium ile sınanır.
- **Uyarılar:** `qa-extended` 100 maçlık küçük örneklemde istatistiksel uyarılar üretebilir; her koşunun çıktısı aşağıdadır. Build Phaser lazy-chunk boyut uyarısı verir; Phaser maç ekranında lazy-load edilir.
- **Dağıtım:** bu koşu yerel build/QA’dır; üretime deployment yapılmadı.
## 1. QA runner exit, signal and timeout handling
Exit: 0

```text
✅ QA runner reports exit errors, signals and timeouts; CI annotations are escaped
```
## 2. Browser save readiness handles delay and stale data
Exit: 0

```text
✅ Browser save readiness waits for the right durable career and times out when it is missing
```
## 3. Production build + TypeScript + offline manifest
Exit: 0

```text
> manager26@1.0.0 build
> tsc --noEmit && vite build && node tools/inject-sw-manifest.mjs

vite v6.4.5 building for production...
transforming...
✓ 161 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                          5.29 kB │ gzip:   1.50 kB
dist/assets/index-C1qP6OaS.css          88.60 kB │ gzip:  18.55 kB
dist/assets/PhaserPitch-BSn7uX5h.js     16.49 kB │ gzip:   6.13 kB
dist/assets/index-Butv2ra1.js          936.56 kB │ gzip: 292.74 kB
dist/assets/phaser-0YPJO2g1.js       1,481.77 kB │ gzip: 339.84 kB
✓ built in 10.55s
SW precache: 211 dosya, sürüm 1a5370106867004b
```

Stderr:
```text
(!) Some chunks are larger than 1400 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```
## 4. QA preview server startup and cleanup
Exit: 0

```text
✅ QA preview serves the build and releases its port; stubborn children are force-stopped
```
## 5. PWA headers, manifest, icons and update lifecycle
Exit: 0

```text
> manager26@1.0.0 qa:pwa
> tsx tools/qa-pwa.ts

✅ Manifest metadata and 192/512 maskable PNG icons
✅ Cloudflare no-cache headers for service worker and manifest
✅ Service-worker activation message and intact build-time precache injection
✅ Production-only update UI wiring and PWA/SEO document metadata
✅ Manifest shortcuts (hash-routed) and promo screenshots with shipped files
✅ iOS apple-touch-startup-image links and precache exclusion of store-level assets

PWA-QA: 6/6 PASS
```
## 6. Content-derived service-worker build identity
Exit: 0

```text
> manager26@1.0.0 qa:sw-manifest
> node tools/qa-sw-manifest.mjs

✅ Aynı içerik deterministik cache sürümü üretir
✅ HTML değişikliği cache sürümünü değiştirir
✅ Sabit adlı varlığın içeriği değişince cache sürümü değişir
✅ Worker kodu değişince cache sürümü değişir
✅ Hariç tutulmuş mağaza görseli uygulama cache sürümünü değiştirmez
✅ İşaretler doldurulur ve uygulama kabuğu precache listesinde yer alır

6/6 içerik-karması kontrolü geçti.
```
## 7. Save integrity, legacy migration and transaction conflicts (jsdom)
Exit: 0

```text
> manager26@1.0.0 qa:save-integrity
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-save-integrity.tsx

✅ Geçici veritabanı açılış hatasından sonra tekrar deneme çalışır
✅ Gerçek GameProvider durumu sürüm 4 ile yazılır
✅ Ayar, bütçe ve gelen kutusu değişiklikleri kendiliğinden birlikte kaydedilir
✅ Satış listesine ekleme elle kayıt olmadan kaydedilir
✅ Satış listesinden çıkarma da otomatik kaydedilir
✅ Aynı oyuncu tekrar listeye alınınca haber yinelenmez
✅ Tam yedek başarıyla doğrulanır
✅ Eski ad, eski sürüm ve opsiyonel alan eksikleri migrasyonla kabul edilir
✅ Gerçek eski uygulamanın ürettiği v2 yedek korunarak açılır
✅ 256 maçlık mevcut arşiv import sırasında kesilmez veya çoğaltılmaz
✅ Eksik/bozuk çekirdek ve yanlış türler yazılmadan reddedilir | 25/25
✅ Geçersiz veya gelecek yedek sürümleri reddedilir
✅ Doğrulama kaynak kariyer nesnesini değiştirmez
✅ Aynı milisaniyedeki iki kayıt bile ayrı revision alır
✅ Bayat sekme transaction içinde durdurulur, yeni kayıt korunur
✅ Dolu yuvaya boş-yuva importu atomik olarak reddedilir
✅ İçe aktarma, sıradaki eski kaydı ve sonraki pagehide kaydını geçersiz kılar
✅ İçe aktarma sonrası eski oturum yeniden yazamaz
✅ Başlamış kayıt biter, yedek sırayla en son yazılır
✅ İçe aktarma yazılamazsa önceki kayıt korunur ve hata görünür
✅ Başarısız içe aktarma kilidi kaldırır; kayıt yeniden denenebilir
✅ Kapanmış oturumun gecikmeli kaydı yeni oturumu değiştiremez

22/22 kayıt bütünlüğü kontrolü geçti.
```

Stderr:
```text
(node:55079) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
[save] Yedek içe aktarılamadı: DOMException [QuotaExceededError]: quota
    at new DOMException (node:internal/per_context/domexception:76:18)
    at FDBDatabase.IDBDatabase.transaction (/home/user/hm26/tools/qa-save-integrity.tsx:187:40)
    at <anonymous> (/home/user/hm26/src/store/persist.ts:122:36)
    at new Promise (<anonymous>)
    at writeSave (/home/user/hm26/src/store/persist.ts:121:9)
    at async Object.restoreBackup (/home/user/hm26/src/store/game.tsx:484:7)
    at async <anonymous> (/home/user/hm26/tools/qa-save-integrity.tsx:191:43)
```
## 8. Project-local security skill installation checks (not an audit)
Exit: 0

```text
> manager26@1.0.0 qa:security-skill
> node tools/qa-security-skill.mjs

✅ Kaynak, sabit sürüm ve MIT lisansı kayıtlı
✅ Tüm kaynak dosyaları ve lisans sabitlenen GitHub içeriğiyle birebir
✅ Skill girişi ve kaynak lisansı okunabiliyor
✅ Belgelerdeki yerel skill bağlantıları mevcut
✅ Rapor şeması ve iki doğrulayıcı dosyası erişilebilir
✅ Proje ajanın skill dosyasını açıkça işaret ediyor
✅ Ajan yönergeleri oyun dağıtım klasörüne kopyalanmamış

7/7 skill kurulum kontrolü geçti. Bu kontrol güvenlik denetimi değildir.
```
## 9. Agency development role installation checks (not independent agents)
Exit: 0

```text
> manager26@1.0.0 qa:agency-roles
> node tools/qa-agency-roles.mjs

✅ Kaynak, sabit sürüm ve MIT lisansı doğru
✅ Dört rol ve lisans orijinal GitHub içeriğiyle birebir
✅ Yalnız seçilen dört rol mevcut ve doğru adları taşıyor
✅ HM26 yönlendirmesi dört role tek tek bağlanıyor
✅ Bağımsız ajan iddiası yok; güvenlik rehberi korunuyor
✅ Çevrimdışı oyun ve mevcut kayıt kuralları korunuyor
✅ Rol dosyaları oyun dağıtımına eklenmemiş

7/7 rol kurulum kontrolü geçti; bu kontrol bağımsız ajan çalıştırmaz.
```
## 10. Core integrity / serialization QA (11 tests)
Exit: 0

```text
=== HM26 Aşama 5 Kalite Testi ===

✅ §15.1 Denge 400 maç (Geçit)                  | avgG=2.00 ev=37.5% ber=28.7% dep=33.8%
✅ MatchSession tam maç                         | 84 step, 83 possession, 4 içgörü, 22 oyuncu profili
✅ Ekonomi: kulüp bütçeleri pozitif             | 36 kulüp kontrolü, garipler: 0
✅ Ekonomi: oluşumda maaş disiplini             | 1/36 aşım (SG: 2.5/1.8)
✅ §10.1/10.2 Sakatlık+ceza üretimi             | 100 maçta 72 sakatlık, 1 kırmızı kart cezası
✅ Seed tekrarlanabilirliği                     | aynı seed: 1-1 / 1-1, e=51
✅ İstatistik tamlığı + çapraz denetim          | sarı 1-0, kırmızı 0-0, korner 0-0, kurtarış≤isabet=true, monoton=true
✅ Kayıt dışa/içe aktarma                       | round-trip: club=denizli_yesilova, day=42
✅ Bozuk kayıt dosyası zarif ret                | 6/6 geçersiz format reddedildi
✅ v1→güncel sürüm kayıt göçü                   | version=4, boardConfidence=70
✅ Gelecek-versiyon reddı                       | Sürüm uyumsuz: dosya v5, uygulama v4. Güncelleyin.

11 test, 0 başarısız
```
## 11. Save-slot season metadata and legacy compatibility QA
Exit: 0

```text
✅ İlk sezon doğru yazılır
✅ İkinci sezon doğru yazılır
✅ Kayıt verisi ve sürümü değiştirilmez
✅ Eski yuva listesinde gerçek sezon gösterilir
✅ Tekil kayıt okuması da aynı etiketi gösterir
✅ Yalnız okumak eski kayıt veya metaveriyi değiştirmez
✅ Sezon numarası bulunmayan eski kayıt etiketi korunur
✅ Yuva sırası korunur
✅ Geçersiz sezon numarası etiket olarak kullanılmaz

9/9 sezon metaverisi kontrolü geçti.
```
## 12. Stress and broad feature QA (37 tests)
Exit: 0

```text
=== HM26 Genişletilmiş 100× Stres/Bütünlük Paketi ===

✅ E1 Denge ×100 (zirve)                                | avgG=2.13 ev=%48 ber=%16 dep=%36
✅ E1 Denge ×100 (gecit)                                | avgG=1.87 ev=%41 ber=%24 dep=%35
✅ E1 Denge ×100 (kok)                                  | avgG=1.94 ev=%44 ber=%34 dep=%22
🟡 E2 Skor dağılımı ×100                                | 0-0 oranı=%20 tek-takım max=7 farklı skor=23
✅ E3 İstatistik doluluğu ×100                          | korner=94 sarı=36 kırmızı=1 faul=397 avgXG=1.29 xGBad=0 xG>7=0 on>şut=0 posDışı=0 kurtarış>isabet=0
✅ E4 Olay akışı ×100                                   | monoton-bozuk=0 devre-yok=0 boş-metin=0
✅ E5 Oyuncu satırları ×100                             | ortalama satır/maç=22.3 eksik22=0 rating-sapma=0 dakika-sapma=0
🟡 E6 Determinizm ×100                                  | özdeş=100/100, farklı skor çeşidi=17
✅ E7 Hava varyantları ×100                             | hata=0, avgG=2.76
✅ S1 MatchSession ×100                                 | tıkanma=0 içgörü-sapma=0 satır<22=0 possession<55=0 avgAdım=87
✅ S2 finishNow her derinlikte tutarlı ×100             | tutarsız=0
✅ S3 Şut günlüğü = şut/gol/isabet özeti ×100           | tutarsız=0
✅ G1 genSquad ×3600 kadro                              | 3600 kadro: boyut=0 id-dup=0 GK<2=0 yaş=0 gen=0 maaş=0 rol-sapma=0 isim-dup=0
✅ G2 genSquad determinizm ×100                         | sapma=0
✅ G3 autoLineup ×600 + customIds ×100                  | 11-dışı=0 dup=0 GK-slot0=0 forced-dışarı=0
✅ G4 autoXI ×100                                       | yapı-bozuk=0 dup=0
✅ G5 Serbest/regen üretimi ×200                        | fa-sapma=0 regen-sapma=0
✅ G6 playerValue monotonluk                            | genç=38.98M zirve=29.57M yaşlı=12.1M altlig=2.33M
✅ D1 Kulüp verisi bütünlüğü                            | 36 kulüp: id/kısa-çakışma/güç/bütçe/tesis ihlali=0, lig dağılımı Z12/G12/K12
✅ D1b Derbi rivalIds kapsamı                           | 0/36 kulüpte rivalIds BOŞ (bilinen backlog), asimetri=0
✅ K1 Takvim tutarlılığı (365 gün)                      | 22 hafta uniq=true asc=true kupa-çakışma=0 kış-arası-sızıntı=0 gün-hatası=0
✅ P1 Bozuk kayıt reddı ×100                            | reddedilen=100/100
✅ P2 Round-trip playerStats+kariyer alanları           | playerStats=korundu
✅ W1 Wizard filtre pradikatları (36 kulüp)             | zirve: rich6✓s aka12 dev12 duşme0 | gecit: rich6✓s aka11 dev2 duşme0 | kok: rich6✓s aka7 dev0 duşme4
✅ W2 Preview squad determinizm                         | sürükleme=0/36 istatistik-sapma=0
✅ Y1 Kadro değeri ↔ bütçe makuliyeti                   | sıfır-değer=0 değer>>bütçe=0 değer<<bütçe=0
✅ T1 Antrenman gelişimi (40 hf)                        | odak-att=70.0 (baz 67.8) odak-def=80.4 det=true
✅ T2 Akademi günü (2-6 aday, det, kalite merdiveni)    | lv1-pot=75 lv5-pot=87 sayı-ihlali=0 det=0
✅ J1 İş piyasası (gecit - 12 kulüp çekimi)             | gecit/kok genelinde 3 benzersiz teklif, deterministik
✅ J2 Ültimatom karar tablosu                           | aktif/kurtuldu/kovuldu yolları doğru
✅ FO1 Yabancı kotası (üretim sızıntısı 327k > sınır + ret kontrolleri) | sızıntı=0/720, dolu-kenarın-ret=true, yerli-izin=true, boş-kenar-izin=true
✅ BO1 Bosman sezon-sonu serbestliği                    | ayrılan=24/24 (cy=1 olanlar), determinizm=true, FA taşıma=true
✅ LN1 Kiralık paketi (kabul/ret/kalan/dönüş/maaş bölüşümü) | zayıf-kabul=true, önemli-ret=true, ince-kadro-ret=true, zincir-ret=true, bölünme=true
✅ AW1 Sezon ödülleri (krallar/MVP/genç, eşik, determinizm) | golK=24 asistK=14 mvp=8.20 genc=d3 eşik-atlanan=false
✅ IF1 IFAB (3 durak sınırı + devre arası serbest + üst sınır 5) | serbest-devrearası-pencere=3 (beklenen 3), 4-değişiklik-sonrası kalan hak=1 durak=0, 5. istek-ret=true, maraton=±3
✅ PM1 Dakika memnuniyeti (rol bekentisi, eşiik, söz değerlendirmesi) | key0maç=true backup-sabır=true kept=true broken=true monoton=true share=0.55
✅ İ1 Sakatlık/ceza girdi biçimi ×100                   | 68 sakatlık 1 ceza — format-hata=0

37 test · 0 başarısız · 2 uyarı
```
## 13. Goalkeeper/stat consistency QA
Exit: 0

```text
✅ F1 GK conceded ↔ skor tutarlılığı ×60 | yanlış=0 GK-dışı-lekelenme=0 yedek-sızıntısı=0 kaleci-satırı=120 clean-sheet=50
✅ F2 conceded mantık sınırı (≥10 yok) ×60 | absürt=0

FAZ A doğrulama: 2 test, 0 başarısız
```
## 14. Assets and brand manifest QA
Exit: 0

```text
✅ L1 ID+ad+kısaltma birebir (paket↔oyun) | eksik=0 fazla=0 isim-sapma=0 oyun=36 paket=36
✅ L2 36/36 yeni renk + accent uygulanmış, eski renk kalmamış | uygulanmamış=0 bayat=0 accent-eksik=0
✅ L3 adaptör tutarlı + Denizli revizyon-02 renkleri | identityConsistent=true denizli=#08764F/#FFF3D9/#DA5345
✅ L4 36/36 kulüp × full+compact WebP gömülü, imza+boyut geçerli | bozuk=0 küçük=0
✅ L5 sembol PNG envanteri bütün (ivory+dark+marka), beklenmeyen boşluk yok | ivory=43 dark=29 icons=35 svg-fallback=6 modül-envanteri=18 dosya=0+0 marka-eksik=0

5 test, 0 başarısız
```
## 15. Live engine parity (300 matches)
Exit: 0

```text
MatchSession parity: n=300 | avgG 1.69 | ev 39.0% ber 33.0% dep 28.0%
```
## 16. Quick-match score/event consistency (KZP patch regression)
Exit: 0

```text
✅ Quick result is an exact adapter projection of the deterministic MatchSession output | seed sweep=24; exact engine parity=true
✅ AI decision traces are deterministic and exposed through both session and engine result | seed sweep=24; session/result trace parity=true
✅ Quick score, event reducer, xG, shot ledger and scorer rows remain aligned | score changes after engine=0; all event/stat identities=true
✅ KZP now changes opponent AI tactical response before play, not the completed score | factor=0.88→1.08; plans=dengeli→yuksekPres
✅ AI decision trace captures xG trend, attack channels, cards and candidate utilities | threat=0.346 chosen=balanced utilities=-0.10/1.10/-0.79/-2.95
✅ Production quick-match path has no post-score patch and carries KZP into pre-match opponent AI input | no post-result patch=true; quick path=true; pre-match AI difficulty=true

MATCH-CORE-CHALLENGE-SCORE: 6/6
```
## 17. Match insight evidence QA (60 deterministic results)
Exit: 0

```text
✅ Every match retains three to five concise insights | 60 results checked; length contract=true
✅ Score, xG, shot/on-target, saves, possession and foul statements use live result metrics | 60 result projections align=true
✅ No unsupported causal fallback claims remain | unsupported causal lines=0

MATCH-CORE-EVIDENCE-INSIGHTS: 3/3
```
## 18. League/cup balance simulation (4,000 matches)
Exit: 0

```text
=== HM26 §15.1 Toplu Simülasyon Raporu ===

Kadro gücü etkisi, ev sahibi avantajı, gol dağılımı ve alt-lig sürpriz oranı
————————————————————————————————————————————————————————————————————————
zirve    | n=1000 | ort. gol 2.26 | xG 1.27–1.05 | ev 48.5% ber 14.0% dep 37.5% | sarı/maç 0.59 kırmızı/maç 0.06
gecit    | n=1000 | ort. gol 2.06 | xG 1.13–0.98 | ev 41.0% ber 23.3% dep 35.7% | sarı/maç 0.86 kırmızı/maç 0.07
kok      | n=1000 | ort. gol 2.46 | xG 1.47–1.11 | ev 41.0% ber 16.3% dep 42.7% | sarı/maç 0.97 kırmızı/maç 0.10
kupa     | n=500 | ort. gol 2.86 | xG 2.77–0.17 | ev 93.0% ber 5.8% dep 1.2% | sarı/maç 0.30 kırmızı/maç 0.02
kupaEv   | n=500 | ort. gol 2.99 | xG 0.26–2.79 | ev 1.4% ber 6.0% dep 92.6% | sarı/maç 0.43 kırmızı/maç 0.03
————————————————————————————————————————————————————————————————————————
Not: hedef davranışlar
 - Güçlü takım uzun vadeli kazanır
 - Ev sahibi ortalama hafif üstün
 - Kupa sürpriz düşük ama sıfır değil
 - Kırmızı kart ~%10–20 maçta
```
## 19. Medical, protest, penalty, shout and telemetry QA
Exit: 0

```text
✅ Needle roster gate | unapproved=excluded approved=true customXI=true
✅ European clinic cost + day arithmetic | cost=₺0.3M(₺300.000) · 30→16g · 14→0g · 5→0g
✅ Needle reinjury chance and range | nüks=24.63% (985/4000), ek gün 14–42
✅ Adverse-call protest + touchline cooldown | without-call=false protest=true/false midfield=79.8→94.8 pump=true/false cd=10
✅ Live pitch telemetry + five-minute momentum | ball=L-M@20,50 z0 owner=home actors=5 momentum=56
✅ Penalty decision opens adverse-side protest window | min=43 attacking=away defending-protest=true
✅ Manager cautions → one-match ban + kickoff consumption | first=1/ban:false second=0/ban:true matches=1 consumed=0
✅ UI/store wiring: clinic, mentor, trade, protest, manager discipline | clinic=true mentor=true swap=true protest=true managerBan=true

8 test · 0 başarısız
```
## 20. Pitch Wave 1 geometry and goal-line clearance QA (6 checks)
Exit: 0

```text
✅ Away possession is mirrored exactly once into stadium coordinates | away=80,82 home=20,18
✅ Goalkeeper shades angle and steps forward on both ends | H 50.0,92.0→57.0,89.0 · A 50.0,8.0→43.0,11.0
✅ Role displacement preserves attack direction and tracks the ball | home-ST y=55.9 away-ST y=64.1 CB x=51.6
✅ Clearance roll selects only an available back-line player | selected=ist_halic_CB_0 noRollForUnavailable=true
✅ Batch engine goal-line event + stat integrity | seed=8800 clearances=1 events=1 shots=29/29 goals=4 actors/path=true corners=true deterministic=true
✅ Live MatchSession goal-line event + stat integrity | seed=8800 clearances=1 events=1 shots=29/29 goals=4 actors/path=true corners=true deterministic=true

PITCH-WAVE1: 6/6 passed
```
## 21. Pitch formation, team colors and motion cadence
Exit: 0

```text
✅ 4-3-3: motor sırasına uygun 11 konum ve saha sınırları
✅ 4-2-3-1: motor sırasına uygun 11 konum ve saha sınırları
✅ 4-4-2: motor sırasına uygun 11 konum ve saha sınırları
✅ 4-1-4-1: motor sırasına uygun 11 konum ve saha sınırları
✅ 3-5-2: motor sırasına uygun 11 konum ve saha sınırları
✅ 5-3-2: motor sırasına uygun 11 konum ve saha sınırları
✅ 4-1-4-1: tek ön libero ile tek santrfor birbirine karışmaz
✅ 4-4-2: kanatlar iki merkez oyuncusunun dışında
✅ 3-5-2: iki kanat bek ve üç merkez oyuncusu doğru sırada
✅ 5-3-2: iki bek üç stoperin dışına yerleşir
✅ 4-2-3-1: motorun tek kanat oyuncusu merkezde çizilmez
✅ Genişlik tercihi gerçek dizilişte korunur
✅ Bilinmeyen eski diziliş ve geçersiz genişlik güvenle tamamlanır
✅ Gerçek top sahibi topun yakınında ve iki hücum yönünde simetrik
✅ Kaleciler top sahibi olduğunda bile kale alanına yakın kalır
✅ Pozisyondaki diğer oyuncular topa ölçülü destek verir
✅ Hareket uzunluğu seçilen 1×/2×/4× hızlarına uyarlanır
✅ Benzer yeşil formalarda deplasman gerçek ikinci kulüp rengiyle ayırt edilir
✅ Farklı forma renkleri gereksiz yere değiştirilmez
✅ İki rengin de çakıştığı eski paletler okunur yedeğe geçer

PITCH-MOTION: 20/20
```
## 22. Live engine projection and speed parity
Exit: 0

```text
✅ Live adapter is a read-only projection of clock, score, stats, ball and momentum | score=0-0; clock=0:0; unchanged=true
✅ The projection follows engine progression without a parallel UI clock/stat store | engine=13:3 projected=13:3
✅ Match console retains six distinct accessible presentation tabs | pitch:Canlı Saha · ratings:Reytingler ve Karne · subs:Oyuncu Değişikliği · analysis:Analiz ve Şut Haritası · table:Canlı Puan Durumu · feed:Spiker ve Maç Günlüğü
✅ x1/x2/x4 change only presentation timing, never the seeded match result | delays=640/260/90ms resultParity=true
✅ LiveMatch renders engine-derived projection and keeps speed outside the engine input | scorebug clock/stat/score derive from projection; speed only configures presentation timeout

LIVE-PROJECTION-WAVE10: 5/5
```
## 23. Shared UI notification timing
Exit: 0

```text
✅ İlk bildirim gösterilir ve tek bir kapanma süresi başlatır
✅ Yeni bildirim eskisinin kapanma zamanlayıcısını iptal eder
✅ Yeni bildirim kendi süresi dolunca kapanır
✅ Ekrandan ayrılırken bekleyen zamanlayıcı temizlenir

UI-SMOOTHNESS: 4/4
```
## 24. New career advanced world settings
Exit: 0

```text
✅ Gelişmiş dünya ayarları başlangıçta kapalı ve düğmeyle bağlantılıdır
✅ Düğme dört mevcut dünya ayarını açar
✅ Değiştirilmemiş kariyerin dengeli varsayılanları görünür
✅ Paneli kapatıp açmak seçimleri kaybettirmez
✅ Özel kariyer bölümü aynı dünya değerlerini gösterir
✅ Zorluk ekranındaki ayar dünya adımına geri yansır
✅ Dönem, zorluk ve dünya seçimleri kariyere aktarılır
✅ Özel kariyerdeki mevcut maç hızı, yönetim ve konfor seçimleri de korunur
✅ Gol ve rastgelelik ayarları gerçek maç ve diğer maç simülasyonlarına aktarılır
✅ Yeni kariyer ayar alanı veya kayıt şeması eklenmez

CAREER-WORLD-UI: 10/10
```
## 25. Transfer presentation rules, voices and local artwork
Exit: 0

```text
✅ GEN eşikleri; bonservis / serbest statüden bağımsız
✅ Satıcı: aynı teklif/ton için deterministik, sakin seçim mevcut motoru korur | 16329 tur
✅ Satıcı: toplam %3 sınırı, taban ve en fazla bir ek sabır kaybı | indirim=2914, risk=1671
✅ Satıcı ipuçları uygulanan gerçek indirim ve sabır riskini saklamaz
✅ Oyuncu: kararlı, ücret beklentisinde toplam en fazla %3 indirim | indirim=1485
✅ Oyuncu: aynı üslup yeniden indirim üretmez; seçenek ipuçları doğru
✅ 40 özgün repliğin altyazı ve çevrimdışı ses dosyası var | 40 ayrı klip
✅ Üç sahnenin yerel arka planı var
✅ Replikler bağlama bağlı: maaş/kulüp, sızıntı ve yıldız anonsu

TRANSFER-SCENE: 9/9
```
## 26. Newsroom saved-evidence regression
Exit: 0

```text
✅ Headlines publish recorded scores only and never preview an unplayed result | published=1; HS 4–2 BA
✅ Team of the Week is drawn from actual player minutes/ratings and uses no invented rows | XI=11; keeper=true; unique=true; empty-state=0
✅ League pulse follows standings and referee panel uses persisted referee/stat evidence | leader=İstanbul Haliç SK; referee=Hakem B; fouls=23
✅ Archive migrates old saves and newsroom is wired read-only from actual match reports | archive=true; pure newsroom=true; referee/player rows preserved

NEWSROOM-WAVE13: 4/4
```
## 27. Market refresh, shortlist and press-room links
Exit: 0

```text
✅ One seed-stable target per seller club; refresh cycle rotates the clubs/players offered | cycle0=9; unique source clubs=true; deterministic=true; rotated=true
✅ Shortlist preserves player snapshot across refreshed pools and prefers current live player state | rows=2; live=true; generated snapshot=fa_saved_agent
✅ Store migration persists shortlist snapshots; hub shortcut goes to headlines and inbox links to press room | persistent shortlist=true; diversified/64-player search=true; press-room links=true

MARKET-IMPROVEMENTS: 3/3
```
## 28. MatchCore event/reducer contracts
Exit: 0

```text
> manager26@1.0.0 qa:match-core
> tsx tools/qa-match-core-foundation.ts

✅ Event IDs are deterministic and time is append-only | ids=foundation-fixture:000001,foundation-fixture:000002,foundation-fixture:000003 monotonic=true
✅ One reducer derives score, shots, xG, saves, possession and player rows | H 1-0 · shots=2/2 · SOT=1/1 · xG=0.40/0.40 · possession=60/40 · duplicateIdempotent=true
✅ Final stat identities hold, including VAR-overturned goal policy | goals ≤ shotsOnTarget ≤ shots; shotsOnTarget = goals + saves; overturned attempt keeps xG but adds no goal/SOT
✅ xG cannot diverge from the actual pGoal used | mismatch rejected
✅ A final match cannot contain an unconfirmed or unresolved shot | pending goal requires confirmation or VAR overturn

MATCH-CORE-WAVE1: 5/5
```
## 29. Production simulation isolation, legacy adapter and replay
Exit: 0

```text
> manager26@1.0.0 qa:production-core
> tsx tools/qa-production-core.ts

✅ Çalışan simülasyon ve tekrar oynatma React/DOM, depolama ve gerçek saatten bağımsızdır | 19 dosya; yasak bağımlılık yok
✅ Üretim girdisi callback içermeyen sürümlü, derin kopya ve dondurulmuş bir anlık görüntüdür
✅ Kaynak veri sonradan değişse de aynı maç sonucu korunur
✅ Bozuk şema, aynı rakip, geçersiz seed ve callback içeren çekirdek girdi reddedilir
✅ Kadro, yedek, taktik, istatistik ve sunum görünümü motorun iç durumunu değiştiremez
✅ Dış kod bitiş durumunu elle değiştiremez
✅ Çekirdek işlem sınırlarını sıra dışı veya yinelenen adımlara karşı korur
✅ Son düdük tek kez üretilir; sonrasında adım/komut etkisiz ve sonuç görünümü ayrıdır
✅ Doğrudan çekirdek, canlı oturum ve hızlı maç aynı sonucu ve olay günlüğünü üretir | hash=9ab45816
✅ Kaydedilmiş kullanıcı komutları çekirdekte hem sonucu hem tüm olay günlüğünü tekrarlatır
✅ Komut saati/sonrası bozulursa sessizce farklı tekrar yapılmaz
✅ Otomatik 11/formasyon sonrası isteğe bağlı boş taktik alanları canlı komutu ve JSON tekrarını bozmaz
✅ Komutta fonksiyon veya geçersiz sayı hâlâ reddedilir ve deftere yazılmaz
✅ Eski SubManager sınırları çekirdek dışında çalışır; taktik ve geçerli/geçersiz değişiklik istekleri kaydedilip tekrarlanır

14/14 üretim maç çekirdeği kontrolü geçti.
```
## 30. MatchCore state and deterministic input
Exit: 0

```text
> manager26@1.0.0 qa:match-core:wave2
> tsx tools/qa-match-core-wave2.ts

✅ RNG streams are reproducible, isolated and restorable | flow=0.72523596 presentation draws do not shift flow; restore=true
✅ Input normalization validates XI and isolates frozen snapshot from caller state | xi=11 normalizedFrozen=true callerFrozen=false
✅ MatchCore phase machine has explicit half-time/resume/full-time boundaries | events=KICK_OFF→HALF_TIME→KICK_OFF→FULL_TIME phase=FINISHED skipBlocked=true
✅ Invalid lineups and mismatched EngineConfig versions fail fast | bad XI and config version rejected before play

MATCH-CORE-WAVE2: 4/4
```
## 31. MatchCore live/instant and replay parity
Exit: 0

```text
> manager26@1.0.0 qa:match-core:wave3
> tsx tools/qa-match-core-wave3.ts

✅ Instant and live entry points execute the same deterministic match session | resultHash=9ab45816 parity=true
✅ Accepted manager commands are immutable, timestamped and deterministically identified | count=2 ids=legacy-ist_halic-ist_kule-45003:cmd:000001,legacy-ist_halic-ist_kule-45003:cmd:000002 frozen=true
✅ Protest, halftime talk and injury-wait actions enter the command ledger | types=TEAM_TALK,PROTEST,WAIT_INJURED seed=45004
✅ Recorded commands reproduce the same result and stable replay hash | commands=3 replayHash=23390d19 exact=true
✅ Replay rejects commands beyond the completed trace | rejected=true

MATCH-CORE-WAVE3: 5/5
```
## 32. MatchCore shot and VAR consistency
Exit: 0

```text
> manager26@1.0.0 qa:match-core:wave4
> tsx tools/qa-match-core-wave4.ts

✅ Shot model has a normalized categorical distribution and sampled pGoal is xG | sum=1.000000000000 xG=pGoal=0.340400 blocked=0.029600
✅ Shot probability model rejects malformed probabilities | invalid pGoal and overfull residual shares rejected
✅ Production session shot ledger derives exact goals, SOT, saves and xG | attempts=15 score=2-1 xG=1.911-0.244 SOT=5-6
✅ Live and instant shot traces remain identical after resolution migration | shots=15 parity=true
✅ Goal review events confirm or overturn a provisional goal without breaking final reducer invariants | decisions=confirmed,overturned confirmed=58 overturned=1

MATCH-CORE-WAVE4: 5/5
```
## 33. MatchCore time, fatigue and player minutes
Exit: 0

```text
> manager26@1.0.0 qa:match-core:wave5
> tsx tools/qa-match-core-wave5.ts

✅ Fatigue burn scales with elapsed delta while retaining the five-minute calibration | 1m=0.00500 5m=0.02500 ratio=5.00
✅ Lineup begins at player fitness and elapsed clock stops at bounded full time | initialFitness=true clock=5580s (93′) halftime=1 fulltime=1
✅ Possession event durations reconcile exactly to the match clock and percentages | home=3452s away=2128s total=5580/5580s homePct=61.90 displayed=62
✅ Full-time player rows contain bounded played minutes and ending fitness | rows=23 minuteRange=26-93 fitnessRange=44.1-97.9
✅ Substitution stops the outgoing player clock and starts the substitute clock | accepted=true changed=true outgoing=2′ incoming=92′

MATCH-CORE-WAVE5: 5/5
```
## 34. MatchCore injuries and substitutions
Exit: 0

```text
> manager26@1.0.0 qa:match-core:wave6
> tsx tools/qa-match-core-wave6.ts

✅ One shared active-player rule excludes injured and dismissed players from profiles and actor selectors | noForward=true traceClean=true meanFitness=73.3→80.0
✅ Production MatchSession never records an injured/sent-off player as a possession or shot actor | excluded=4 coreShots=21 allActorsActive=true
✅ Sub requests validate both squads, reject dismissed/duplicate participants and apply one legal exchange | dismissedRejected=true invalidRejected=true accepted=true duplicateRejected=true applied=true rights=4 windows=2
✅ IFAB 5-right/3-window limit counts one opportunity for bundled changes and keeps half-time free | normal=3 windows=3/3 outsideRejected=true halfTime=2/2 rights=0 windowsLeft=0 sixthRejected=true
✅ Injury wait is one-shot, keeps the player out for at least 120 seconds, then restores active fitness | accepted=true duplicateRejected=true returned=true actorExcluded=true wait=121s fitness=45

MATCH-CORE-WAVE6: 5/5
```
## 35. MatchCore referees and set pieces
Exit: 0

```text
> manager26@1.0.0 qa:match-core:wave7
> tsx tools/qa-match-core-wave7.ts

✅ Referee assignment and decision modifiers are deterministic, bounded and varied | stable=true styles=strict,lenient,balanced bounds=true
✅ Configured set-piece takers are honored; injured/dismissed assignments fall back to an eligible player | assignedAll=true fallback=ist_halic_CM_0 active=true
✅ Foul→restart→shot/card chains and event-derived foul/corner/card stats reconcile | matches=651 fixtures=mismatch:600 matches/0 penalties;balanced:51 matches/1 penalties restarts=corner,free_kick,penalty shots=open_play,corner,free_kick,penalty cards=YELLOW_CARD,RED_CARD chains=true takers=true stats=true
✅ Reducer counts second-yellow and direct-red decisions at team and player level | away=Y2/R1 player=Y2/R1 directR=1

MATCH-CORE-WAVE7: 4/4
```
## 36. MatchCore tactics and AI decisions
Exit: 0

```text
> manager26@1.0.0 qa:match-core:wave8
> tsx tools/qa-match-core-wave8.ts

✅ AI baseline accounts for actual club strength | favorite=4-3-3/dengeli underdog=4-4-2/hizliKontra
✅ AI utility adapts to score urgency and fitness | behind=AI: Tam Hücum/yuksekPres lead=AI: Skoru Koru/dusukBlok tired=AI: Önde Baskı/dengeli tied=dengeli
✅ Width, focus, press and pass risk have causal profile effects | wide=79.58→110.26 central=75.46→79.98 press=76.00→100.14 transition=66.22→69.53
✅ MatchSession logs deterministic AI tactic changes without overriding the user side | seed=880100 changes=away:ai-mardin_dara-all_out minutes=65

MATCH-CORE-WAVE8: 4/4
```
## 37. Goal pace, randomness and causal score calibration (6,480 matches)
Exit: 0

```text
> manager26@1.0.0 qa:goal-calibration
> tsx tools/qa-goal-calibration.ts

✅ Normal güç farkı eski şans dağılımını korur; artış kademeli ve sınırlıdır
✅ Büyük güç farkında savunma uzak şutlarda daha çok alan kapatır
✅ Düşük rastlantısallıkta bile top kazanma payı iki yön için mümkündür
low/dusuk/league: n=240 goals=2.01 xG=2.20 H/D/A=59.2%/20.4%/20.4% team7+=0.8% 9+=0.0% maxTeam=8
low/dusuk/favorite-home: n=240 goals=3.12 xG=3.14 H/D/A=96.7%/3.3%/0.0% team7+=3.8% 9+=0.8% maxTeam=9 fav=96.7% upset=0.0%
low/dusuk/favorite-away: n=240 goals=3.27 xG=3.25 H/D/A=0.4%/4.2%/95.4% team7+=4.2% 9+=1.3% maxTeam=9 fav=95.4% upset=0.4%
low/dengeli/league: n=240 goals=2.27 xG=2.38 H/D/A=62.5%/16.3%/21.3% team7+=2.1% 9+=0.0% maxTeam=8
low/dengeli/favorite-home: n=240 goals=3.13 xG=3.19 H/D/A=95.4%/3.3%/1.3% team7+=4.6% 9+=1.3% maxTeam=9 fav=95.4% upset=1.3%
low/dengeli/favorite-away: n=240 goals=3.33 xG=3.35 H/D/A=0.0%/3.3%/96.7% team7+=4.6% 9+=0.4% maxTeam=10 fav=96.7% upset=0.0%
low/yuksek/league: n=240 goals=2.56 xG=2.58 H/D/A=65.0%/13.3%/21.7% team7+=3.3% 9+=0.4% maxTeam=9
low/yuksek/favorite-home: n=240 goals=3.33 xG=3.36 H/D/A=97.5%/2.1%/0.4% team7+=4.2% 9+=1.7% maxTeam=10 fav=97.5% upset=0.4%
low/yuksek/favorite-away: n=240 goals=3.48 xG=3.54 H/D/A=0.0%/2.5%/97.5% team7+=5.4% 9+=0.8% maxTeam=9 fav=97.5% upset=0.0%
normal/dusuk/league: n=240 goals=2.07 xG=1.94 H/D/A=56.3%/22.9%/20.8% team7+=0.4% 9+=0.0% maxTeam=7
normal/dusuk/favorite-home: n=240 goals=2.51 xG=2.60 H/D/A=89.2%/9.6%/1.3% team7+=1.3% 9+=0.0% maxTeam=8 fav=89.2% upset=1.3%
normal/dusuk/favorite-away: n=240 goals=2.75 xG=2.74 H/D/A=2.1%/7.1%/90.8% team7+=1.3% 9+=0.4% maxTeam=8 fav=90.8% upset=2.1%
normal/dengeli/league: n=240 goals=2.18 xG=2.13 H/D/A=58.8%/18.8%/22.5% team7+=0.8% 9+=0.0% maxTeam=8
normal/dengeli/favorite-home: n=240 goals=2.64 xG=2.72 H/D/A=89.6%/9.6%/0.8% team7+=0.4% 9+=0.0% maxTeam=8 fav=89.6% upset=0.8%
normal/dengeli/favorite-away: n=240 goals=2.77 xG=2.83 H/D/A=1.7%/10.4%/87.9% team7+=2.5% 9+=0.8% maxTeam=10 fav=87.9% upset=1.7%
normal/yuksek/league: n=240 goals=2.34 xG=2.27 H/D/A=62.1%/14.6%/23.3% team7+=1.3% 9+=0.0% maxTeam=7
normal/yuksek/favorite-home: n=240 goals=2.83 xG=2.88 H/D/A=88.3%/8.8%/2.9% team7+=2.1% 9+=0.4% maxTeam=8 fav=88.3% upset=2.9%
normal/yuksek/favorite-away: n=240 goals=2.89 xG=3.02 H/D/A=0.8%/9.6%/89.6% team7+=2.5% 9+=0.4% maxTeam=9 fav=89.6% upset=0.8%
high/dusuk/league: n=240 goals=1.67 xG=1.66 H/D/A=49.2%/31.3%/19.6% team7+=0.0% 9+=0.0% maxTeam=6
high/dusuk/favorite-home: n=240 goals=2.34 xG=2.38 H/D/A=83.3%/14.2%/2.5% team7+=0.4% 9+=0.0% maxTeam=7 fav=83.3% upset=2.5%
high/dusuk/favorite-away: n=240 goals=2.35 xG=2.37 H/D/A=2.1%/13.3%/84.6% team7+=0.4% 9+=0.0% maxTeam=7 fav=84.6% upset=2.1%
high/dengeli/league: n=240 goals=1.74 xG=1.82 H/D/A=50.8%/29.6%/19.6% team7+=0.4% 9+=0.4% maxTeam=8
high/dengeli/favorite-home: n=240 goals=2.44 xG=2.44 H/D/A=87.5%/9.6%/2.9% team7+=1.3% 9+=0.0% maxTeam=7 fav=87.5% upset=2.9%
high/dengeli/favorite-away: n=240 goals=2.49 xG=2.51 H/D/A=2.9%/13.3%/83.8% team7+=1.3% 9+=0.4% maxTeam=8 fav=83.8% upset=2.9%
high/yuksek/league: n=240 goals=1.98 xG=2.00 H/D/A=53.3%/26.7%/20.0% team7+=0.8% 9+=0.0% maxTeam=7
high/yuksek/favorite-home: n=240 goals=2.53 xG=2.55 H/D/A=88.3%/10.8%/0.8% team7+=1.3% 9+=0.0% maxTeam=7 fav=88.3% upset=0.8%
high/yuksek/favorite-away: n=240 goals=2.64 xG=2.60 H/D/A=2.9%/12.1%/85.0% team7+=1.3% 9+=0.0% maxTeam=7 fav=85.0% upset=2.9%
✅ Tüm hız/rastlantısallık ayarlarında gol ve xG gerçek olay defterinden birebir türetilir | 0 uyuşmazlık · 6.480 maç
✅ low: yüksek gol temposu düşük tempodan daha üretkendir | 2.80 → 3.12 gol/maç
✅ normal: yüksek gol temposu düşük tempodan daha üretkendir | 2.44 → 2.69 gol/maç
✅ high: yüksek gol temposu düşük tempodan daha üretkendir | 2.12 → 2.38 gol/maç
✅ Farklı ayarlarda favoriler güçlü kalır, sürpriz ve beraberlik hâlâ mümkündür
✅ Lig maçları ve favori eşleşmeleri aşırı uçlara veya sıfır gollü modele çökmez
✅ Nadir yüksek skorlar hâlâ yaşanır; maç skoru veya gol sayısı kesilmez

10/10 gol dengesi kontrolü geçti.
```
## 38. League and favorite balance simulation (10,000 matches)
Exit: 0

```text
> manager26@1.0.0 qa:match-core:wave8:balance
> tsx tools/qa-match-core-wave8-balance.ts

Progress: 2,000/10,000 (zirve)
Progress: 4,000/10,000 (gecit)
Progress: 6,000/10,000 (kok)
Progress: 8,000/10,000 (favori_ev)
Progress: 10,000/10,000 (favori_deplasman)

=== HM26 MatchCore Wave 8 · deterministic 10,000-match balance sweep ===
zirve              n=2,000 avgG=1.97 xG=1.20-0.80 H/D/A=48.1%/20.9%/31.0% fav=68.2% upset=10.9% 0-0=15.6% 9+=0.1% redMatch=5.5% cards=0.63R=0.06 corners=0.79 fouls=6.3 FK=6.18 pens=0.122 AIchanges=1.69
gecit              n=2,000 avgG=1.85 xG=1.11-0.79 H/D/A=40.5%/27.2%/32.3% fav=68.0% upset=6.1% 0-0=22.6% 9+=0.2% redMatch=9.2% cards=0.88R=0.10 corners=0.62 fouls=9.2 FK=8.99 pens=0.173 AIchanges=1.49
kok                n=2,000 avgG=1.88 xG=1.12-0.80 H/D/A=42.8%/25.9%/31.3% fav=61.5% upset=11.9% 0-0=22.1% 9+=0.4% redMatch=10.8% cards=1.08R=0.11 corners=0.41 fouls=11.3 FK=11.18 pens=0.170 AIchanges=1.54
favori_ev          n=2,000 avgG=2.64 xG=2.52-0.16 H/D/A=91.3%/7.8%/1.0% fav=91.3% upset=1.0% 0-0=5.3% 9+=0.1% redMatch=1.9% cards=0.35R=0.02 corners=0.85 fouls=3.4 FK=3.35 pens=0.056 AIchanges=1.85
favori_deplasman   n=2,000 avgG=2.68 xG=0.22-2.54 H/D/A=2.1%/9.6%/88.3% fav=88.3% upset=2.1% 0-0=6.1% 9+=0.3% redMatch=2.9% cards=0.41R=0.03 corners=0.86 fouls=3.6 FK=3.50 pens=0.054 AIchanges=1.84

TOTAL n=10000 avgG=2.21 balancedAvgG=1.90 favWins=76.1% overallHome=45.0% balancedHome=43.8% 0-0=14.3% 9+=0.2% redMatches=6.1% reds=641 corners=7079 pens=1149 AIChanges=16850
WAVE8 BALANCE: PASS (deterministic event/stat integrity enforced by every completed MatchSession)
```
## 39. Challenge balance simulation (15,000 matches)
Exit: 0

```text
> manager26@1.0.0 qa:match-core:challenge-balance
> tsx tools/qa-match-core-challenge-balance.ts

Progress: 5,000/15,000 (easy/favori_deplasman)
Progress: 10,000/15,000 (balanced/favori_deplasman)
Progress: 15,000/15,000 (legendary/favori_deplasman)

=== HM26 causal challenge profile sweep · 15,000 deterministic matches ===
easy       KZP=20 n=5000 avgG=2.24 xG=2.28 H/D/A=45.02%/19.24%/35.74% fav=89.40% upset=1.70% 1H/2H=1.20/1.04 5+=10.32% 1H5+=1.28% 1Hteam7+=0.00% team7+=0.90% xG6+=0.20% 9+=0.20% cards=0.65R=0.06 injuries=0.673 AI=1.78
balanced   KZP=45 n=5000 avgG=2.22 xG=2.27 H/D/A=44.66%/18.54%/36.80% fav=90.50% upset=1.10% 1H/2H=1.20/1.02 5+=10.00% 1H5+=1.38% 1Hteam7+=0.06% team7+=0.98% xG6+=0.20% 9+=0.24% cards=0.70R=0.07 injuries=0.688 AI=1.71
legendary  KZP=90 n=5000 avgG=2.22 xG=2.25 H/D/A=45.84%/16.66%/37.50% fav=91.30% upset=1.00% 1H/2H=1.22/1.01 5+=9.68% 1H5+=1.22% 1Hteam7+=0.06% team7+=0.80% xG6+=0.06% 9+=0.12% cards=0.67R=0.07 injuries=0.700 AI=1.69
easy/zirve: n=1000 avgG=1.96 xG=2.01 H/D/A=47.30%/23.40%/29.30% 1H/2H=1.05/0.91 5+=6.60% 1H5+=0.80% 1Hteam7+=0.00% team7+=0.40% xG6+=0.10% 9+=0.10% cards=0.60R=0.05 injuries=0.678 AI=1.74
easy/gecit: n=1000 avgG=1.91 xG=1.92 H/D/A=41.10%/28.60%/30.30% 1H/2H=0.98/0.93 5+=9.50% 1H5+=0.90% 1Hteam7+=0.00% team7+=0.70% xG6+=0.20% 9+=0.20% cards=0.86R=0.07 injuries=0.671 AI=1.59
easy/kok: n=1000 avgG=1.94 xG=1.99 H/D/A=44.70%/26.40%/28.90% 1H/2H=0.99/0.95 5+=9.20% 1H5+=0.70% 1Hteam7+=0.00% team7+=0.80% xG6+=0.60% 9+=0.40% cards=1.10R=0.14 injuries=0.672 AI=1.64
easy/favori_ev: n=1000 avgG=2.66 xG=2.70 H/D/A=89.80%/9.00%/1.20% fav=89.80% upset=1.20% 1H/2H=1.46/1.19 5+=13.80% 1H5+=2.50% 1Hteam7+=0.00% team7+=1.60% xG6+=0.00% 9+=0.30% cards=0.34R=0.02 injuries=0.739 AI=2.05
easy/favori_deplasman: n=1000 avgG=2.74 xG=2.79 H/D/A=2.20%/8.80%/89.00% fav=89.00% upset=2.20% 1H/2H=1.53/1.21 5+=12.50% 1H5+=1.50% 1Hteam7+=0.00% team7+=1.00% xG6+=0.10% 9+=0.00% cards=0.35R=0.02 injuries=0.605 AI=1.88
balanced/zirve: n=1000 avgG=2.07 xG=2.06 H/D/A=45.10%/21.90%/33.00% 1H/2H=1.13/0.94 5+=8.60% 1H5+=1.20% 1Hteam7+=0.10% team7+=0.70% xG6+=0.10% 9+=0.10% cards=0.67R=0.06 injuries=0.665 AI=1.69
balanced/gecit: n=1000 avgG=1.88 xG=1.92 H/D/A=40.60%/29.20%/30.20% 1H/2H=0.98/0.90 5+=9.60% 1H5+=1.60% 1Hteam7+=0.20% team7+=0.90% xG6+=0.50% 9+=0.40% cards=0.88R=0.10 injuries=0.638 AI=1.51
balanced/kok: n=1000 avgG=1.90 xG=1.94 H/D/A=45.20%/24.80%/30.00% 1H/2H=1.00/0.90 5+=8.00% 1H5+=1.10% 1Hteam7+=0.00% team7+=0.80% xG6+=0.40% 9+=0.40% cards=1.16R=0.13 injuries=0.701 AI=1.62
balanced/favori_ev: n=1000 avgG=2.55 xG=2.68 H/D/A=90.80%/8.60%/0.60% fav=90.80% upset=0.60% 1H/2H=1.40/1.16 5+=10.70% 1H5+=0.70% 1Hteam7+=0.00% team7+=0.40% xG6+=0.00% 9+=0.00% cards=0.38R=0.03 injuries=0.736 AI=1.86
balanced/favori_deplasman: n=1000 avgG=2.67 xG=2.74 H/D/A=1.60%/8.20%/90.20% fav=90.20% upset=1.60% 1H/2H=1.48/1.19 5+=13.10% 1H5+=2.30% 1Hteam7+=0.00% team7+=2.10% xG6+=0.00% 9+=0.30% cards=0.40R=0.03 injuries=0.702 AI=1.86
legendary/zirve: n=1000 avgG=2.00 xG=2.01 H/D/A=49.30%/19.30%/31.40% 1H/2H=1.06/0.94 5+=7.00% 1H5+=0.80% 1Hteam7+=0.10% team7+=0.30% xG6+=0.00% 9+=0.10% cards=0.65R=0.07 injuries=0.734 AI=1.63
legendary/gecit: n=1000 avgG=1.87 xG=1.89 H/D/A=43.30%/24.40%/32.30% 1H/2H=1.03/0.84 5+=7.30% 1H5+=0.90% 1Hteam7+=0.20% team7+=1.00% xG6+=0.10% 9+=0.30% cards=0.87R=0.08 injuries=0.706 AI=1.54
legendary/kok: n=1000 avgG=1.98 xG=1.94 H/D/A=43.30%/24.20%/32.50% 1H/2H=1.05/0.93 5+=9.10% 1H5+=1.20% 1Hteam7+=0.00% team7+=0.90% xG6+=0.10% 9+=0.20% cards=1.05R=0.12 injuries=0.682 AI=1.54
legendary/favori_ev: n=1000 avgG=2.63 xG=2.65 H/D/A=92.10%/7.10%/0.80% fav=92.10% upset=0.80% 1H/2H=1.45/1.18 5+=12.10% 1H5+=1.30% 1Hteam7+=0.00% team7+=0.40% xG6+=0.10% 9+=0.00% cards=0.36R=0.03 injuries=0.681 AI=1.83
legendary/favori_deplasman: n=1000 avgG=2.62 xG=2.74 H/D/A=1.20%/8.30%/90.50% fav=90.50% upset=1.20% 1H/2H=1.48/1.14 5+=12.90% 1H5+=1.90% 1Hteam7+=0.00% team7+=1.40% xG6+=0.00% 9+=0.00% cards=0.41R=0.03 injuries=0.696 AI=1.89
CHALLENGE-BALANCE: PASS (15k; separate normal leagues and favorite H/A tail limits by difficulty)
```
## 40. Transfer negotiation and resale clauses
Exit: 0

```text
> manager26@1.0.0 qa:transfer:wave11
> tsx tools/qa-transfer-wave11.ts

✅ Seller patience, counter value and reservation-price walk-away are deterministic | first=counter@11.13/patience2; second=accept; low-final=walk
✅ Swap/sell-on terms affect negotiated consideration and transfer leaks are seeded | sell-on credit=1.05M; counter cash=19.95M; leak risk=49%; deterministic=true
✅ Sell-on clauses survive JSON save/load and settle only on a later sale | 20% resale: prior club receives ₺2M; current club retains ₺8M
✅ Sell-on clauses are validated and aggregate payouts never exceed 50% | combined cap=50%; payout=5M retained=5M; malformed legacy rows dropped
✅ Store persistence/settlement is wired; transfer table stays player+cash with no buy-back | load migration=true; player+cash=true; buy-back absent=true

TRANSFER-WAVE11: 5/5
```
## 41. Academy recruitment and limits
Exit: 0

```text
> manager26@1.0.0 qa:academy:wave12
> tsx tools/qa-academy-wave12.ts

✅ Same career seed yields identical intake; academy level scales count/quality | level1=2; level5=6; deterministic=true; uniqueIds=true
✅ Signing checks 30-player cap, registration budget and monthly wage headroom | registration=0.23M; full=false; transferFunds=false; wageCap=false
✅ Academy intake/decisions survive JSON save-load and old saves receive safe defaults | signed=1; passed=1; legacy expiry=18
✅ Ten-day decision window has an exact boundary | day18=open; day19=expired
✅ Game store persists intake, charges the signing fee and logs academy graduates | load normalization=true; payroll/store/UI wiring=true

ACADEMY-WAVE12: 5/5
```
## 42. Club culture and financial decisions
Exit: 0

```text
> manager26@1.0.0 qa:culture:wave14
> tsx tools/qa-culture-wave14.ts

✅ Culture generation is deterministic; JSON normalization clamps and rejects malformed values | chair=Bora Keskin; range=100/0; honors=1
✅ FFP status derives from payroll ceiling and net seasonal transfer spend | clear=clear; watch=watch; breach=breach; net=1.9M
✅ Community and scandal choices enforce distinct costs/effects and reject mismatched options | community=70; scandal=67; remaining=0.08; invalid=false
✅ Supporter and FFP decisions update indicators, review season, costs and governance trade-offs | meetingHeat=33; auditBudget=0.05; board=2/-3
✅ Season honors are awarded from culture thresholds and stay deduplicated | honors=fair-play-club,community-club,supporters-club; repeated=3
✅ Store persists culture, generates match/calendar issues and Club UI resolves every issue family | persisting=true; matchSignals=true; ui=true

CULTURE-WAVE14: 6/6
```
## 43. Board budget approval, refusal, limits and durable save
Exit: 0

```text
> manager26@1.0.0 qa:board-budget
> tsx tools/qa-board-budget.tsx

✅ Uygun koşullarda onay: dört maç, %60 üzeri güven, hedefe yakın sıra, mali uyum ve ihtiyaç
✅ Karar yalnız girdilerden, rastgelelik olmadan üretilir
✅ Güven sınırı %60 dahil; altı gerekçeli ret
✅ Dört lig maçından önce ret
✅ Kalan kaynak sınırı %60 dahil; üzeri ret
✅ Hedefin üç sıra gerisi ret
✅ Maaş tavanı ihlali ek kaynak verilmesini engeller
✅ Net transfer harcaması mali ihlalse ret
✅ Akademi kayıt bedeli de aynı kulübün transfer harcamasıdır
✅ Eski kayıtlarda güven eksikse mevcut 70 varsayılanı kullanılır
✅ Şampiyonluk ve açık lig hedefleri yorumlanır
✅ Kulüp ölçeğine göre tutar alt ve üst sınırlıdır
✅ Mali hesap yalnız ilgili kulüp/sezonu ve satış payı sonrası net geliri kullanır
✅ Retten sonra 30 gün bekleme; 30. gün tekrar mümkün
✅ Onay sezon boyunca tekrarlanamaz
✅ Yeni sezon veya farklı kulüp önceki kararla kilitlenmez
✅ Eski sabit yanıt ve bozuk/yabancı kimlikler yeni özelliği kilitlemez
✅ İşsiz menajer talep gönderemez
✅ Gerçek store onayı bakiyeyi artırır; aynı işlemde ikinci tıklama durur
✅ Onay haberi ve bakiye aynı state içinde tek kez üretilir
✅ Onay ve bütçe elle kayıt gerektirmeden aynı IndexedDB kaydına yazılır
✅ Yeni kalıcı alan veya kayıt sürümü eklenmez | top=; career=
✅ Yedek doğrulama ve yeniden açılışta para ve sezon sınırı korunur

23/23 yönetim bütçesi kontrolü geçti.
```
## 44. International competition progression
Exit: 0

```text
> manager26@1.0.0 qa:international:wave15
> tsx tools/qa-international-wave15.ts

✅ World adds 24 fictional external clubs without altering domestic club pools; both cups draw 8+8 | foreign=24; each=16/16; unique entrants=32; domestic pools=36
✅ Qualification waterfall is deterministic, gives cup-holder/finalist access and prevents double entry | distinct=true; holder=true; finalist=true; deterministic=true
✅ Each 4-team group has a 3-match round robin, three scheduled rounds and score-derived tables | group=4; matches=6; each club=3; points=5/4/3/2
✅ Group winners/runners-up advance to a unique 8-team bracket; QF→SF→Final resolves champion and finalist | QF=8/true; SF=true; final=true; winner=ist_bogaz; runner-up=ist_halic; distinct=true
✅ Scorer board, group tables, finalists and JSON save/load survive; legacy saves create safe default cups | goals=2; archiveGroups=4; legacy=2
✅ Store handles migration, calendar blocking, AI/user results, seasonal archive and competition/news UI | migration=true; fixture flow=true; archive+UI=true

INTERNATIONAL-WAVE15: 6/6
```
## 45. AI appearances, score fingerprint, ratings and legacy saves
Exit: 0

```text
> manager26@1.0.0 qa:ai-appearances
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-ai-appearances.tsx

✅ 0–0: 11 oyuncunun hepsi bir kez sayılır, hiç gol/asist/reyting üretilmez
✅ 6 gol ve 6 asist: gol/asist katkıları maç sayısını şişirmez
✅ Çift oyuncu kimliği tek katılım sayılır
✅ Özel oyuncu kimliği kayıt anahtarı olarak güvenle işlenir
✅ Mükerrer eski kadro kimlikleri maçın 11+9 listesinde tekrarlanmaz
✅ Oynamayan yedek gole veya yeni katılıma yazılmaz
✅ Sakat, cezalı ve kondisyonu yetersiz AI oyuncuları seçilmez
✅ Uygun oyuncu yoksa sahte oyuncu üretilmez; skor RNG akışı korunur
✅ Lig, hazırlık, kupa, eleme ve kıta skorları eski RNG parmak iziyle aynı
✅ Gerçek provider: her müsabakada yalnız seçilen 11, her maç için bir kez sayılır | 26 maç; 410 oyuncu; hata=0
✅ Gerçek provider: takım golleri fikstür skorlarıyla eşleşir
✅ Gerçek provider: 0–0 maçın katkısız oyuncuları da sayılır
✅ AI maçlarına sahte puan veya kart eklenmez
✅ Menajerin oynanmamış maçı ve kadrosu AI sayacına girmez
✅ Kayıt sürümü ve üst seviye alanları değişmedi | eklenen= kaybolan=
✅ Yedekten yüklemede yeni katılım/gol toplamları korunur
✅ IndexedDB kaydı gerçek oyuncu katılımlarını korur
✅ Oynanmış fikstürler aynı gün yeniden işlenmez
✅ Kıta gol krallığı ve sezon toplamı aynı gerçek seçilmiş golcüleri kullanır
✅ Kıta maçında gol atmayan 11’ler ve oynamayan yedekler ayrılır
✅ Kıta elemesinde katılım, golcüler ve kazanan birlikte işlenir
✅ Gerçek hızlı maç: motorun oynattığı her oyuncuya bir katılım daha yazılır
✅ AI geçmişi + motor maçı: ortalama yalnız puanlı maçlardan hesaplanır
✅ Geçmişteki doğrulanamayan sayaç sessizce uydurularak değiştirilmez
✅ Eski sayaca sadece yeni maçın bir katılımı eklenir
✅ Gerçek provider sakat/cezalı AI oyuncularını saymaz, uygun ilk 11’i sayar
✅ İşsiz menajerin eski kulübünün kupa elemesi AI tarafından oynanır ve sayılır
✅ Gerçek sezon kapanışı raporlu ortalamayı ve puansız oyuncuda boş işaretini korur
✅ Gerçek v2 kariyeri açılır, uluslararası alanlar güvenle tamamlanır
✅ Gerçek v2 kariyerinde gün ilerler ve geçerli sürümde yedek üretilir
✅ Puan ortalaması AI maçlarıyla seyrelmez; puansız oyuncu dışarıda, eski toplam yaklaşık
✅ Eksik eski karne satırı atlanır; özel kimlik prototipi değiştirmez
✅ Sezon ödülleri puansız AI maçlarını sıfır reyting olarak sıralamaz

33/33 AI katılım ve kayıt kontrolü geçti.
```

Stderr:
```text
(node:63486) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
```
## 46. Classic interviews and outcomes
Exit: 0

```text
> manager26@1.0.0 qa:interview
> tsx tools/qa-interview.ts

✅ win: başlık ve soru dolu
✅ win: seçenek id'leri benzersiz
✅ win: tüm seçeneklerde etiket, detay ve röportaj sözü var
✅ win: tüm etkiler küçük ölçekli (|delta| <= 6)
✅ win: her seçenek en az bir kültür alanını etkiliyor
✅ draw: başlık ve soru dolu
✅ draw: seçenek id'leri benzersiz
✅ draw: tüm seçeneklerde etiket, detay ve röportaj sözü var
✅ draw: tüm etkiler küçük ölçekli (|delta| <= 6)
✅ draw: her seçenek en az bir kültür alanını etkiliyor
✅ loss: başlık ve soru dolu
✅ loss: seçenek id'leri benzersiz
✅ loss: tüm seçeneklerde etiket, detay ve röportaj sözü var
✅ loss: tüm etkiler küçük ölçekli (|delta| <= 6)
✅ loss: her seçenek en az bir kültür alanını etkiliyor
✅ Dokuz seçeneğin dokuz farklı id’si var
✅ Evde galibiyet win
✅ Deplasmanda galibiyet win
✅ Beraberlik draw (ev)
✅ Beraberlik draw (deplasman)
✅ Evde mağlubiyet loss
✅ Deplasmanda mağlubiyet loss
✅ Üst sınır 100’e kırpılıyor
✅ Alt sınır 0’a kırpılıyor
✅ Boş etki değerleri değiştirmiyor
✅ Orijinal kültür nesnesi değişmiyor (immutable)
✅ Topluluk güveni röportajdan etkilenmiyor
✅ Onur listesi ve başkan korunuyor
✅ Reddetme id sabiti tanımlı
✅ Inbox başlık sabiti tanımlı
✅ Sözler cümle sonu noktasıyla bitiyor
✅ comeback/win: soru rakip kısa adını içerir
✅ comeback/win: 3 seçenek ve benzersiz tema önekli id
✅ comeback/win: sözler noktayla biter ve etiket/detay dolu
✅ comeback/win: etkiler |delta| <= 6 ve en az 1 alan
✅ comeback/draw: kombinasyon yoksa null (klasiğe düşer)
✅ comeback/loss: kombinasyon yoksa null (klasiğe düşer)
✅ collapse/win: kombinasyon yoksa null (klasiğe düşer)
✅ collapse/draw: soru rakip kısa adını içerir
✅ collapse/draw: 3 seçenek ve benzersiz tema önekli id
✅ collapse/draw: sözler noktayla biter ve etiket/detay dolu
✅ collapse/draw: etkiler |delta| <= 6 ve en az 1 alan
✅ collapse/loss: soru rakip kısa adını içerir
✅ collapse/loss: 3 seçenek ve benzersiz tema önekli id
✅ collapse/loss: sözler noktayla biter ve etiket/detay dolu
✅ collapse/loss: etkiler |delta| <= 6 ve en az 1 alan
✅ derby/win: soru rakip kısa adını içerir
✅ derby/win: 3 seçenek ve benzersiz tema önekli id
✅ derby/win: sözler noktayla biter ve etiket/detay dolu
✅ derby/win: etkiler |delta| <= 6 ve en az 1 alan
✅ derby/draw: soru rakip kısa adını içerir
✅ derby/draw: 3 seçenek ve benzersiz tema önekli id
✅ derby/draw: sözler noktayla biter ve etiket/detay dolu
✅ derby/draw: etkiler |delta| <= 6 ve en az 1 alan
✅ derby/loss: soru rakip kısa adını içerir
✅ derby/loss: 3 seçenek ve benzersiz tema önekli id
✅ derby/loss: sözler noktayla biter ve etiket/detay dolu
✅ derby/loss: etkiler |delta| <= 6 ve en az 1 alan
✅ redcard/win: soru rakip kısa adını içerir
✅ redcard/win: 3 seçenek ve benzersiz tema önekli id
✅ redcard/win: sözler noktayla biter ve etiket/detay dolu
✅ redcard/win: etkiler |delta| <= 6 ve en az 1 alan
✅ redcard/draw: soru rakip kısa adını içerir
✅ redcard/draw: 3 seçenek ve benzersiz tema önekli id
✅ redcard/draw: sözler noktayla biter ve etiket/detay dolu
✅ redcard/draw: etkiler |delta| <= 6 ve en az 1 alan
✅ redcard/loss: soru rakip kısa adını içerir
✅ redcard/loss: 3 seçenek ve benzersiz tema önekli id
✅ redcard/loss: sözler noktayla biter ve etiket/detay dolu
✅ redcard/loss: etkiler |delta| <= 6 ve en az 1 alan
✅ var/win: soru rakip kısa adını içerir
✅ var/win: 3 seçenek ve benzersiz tema önekli id
✅ var/win: sözler noktayla biter ve etiket/detay dolu
✅ var/win: etkiler |delta| <= 6 ve en az 1 alan
✅ var/draw: soru rakip kısa adını içerir
✅ var/draw: 3 seçenek ve benzersiz tema önekli id
✅ var/draw: sözler noktayla biter ve etiket/detay dolu
✅ var/draw: etkiler |delta| <= 6 ve en az 1 alan
✅ var/loss: soru rakip kısa adını içerir
✅ var/loss: 3 seçenek ve benzersiz tema önekli id
✅ var/loss: sözler noktayla biter ve etiket/detay dolu
✅ var/loss: etkiler |delta| <= 6 ve en az 1 alan
✅ xg-over/win: soru rakip kısa adını içerir
✅ xg-over/win: 3 seçenek ve benzersiz tema önekli id
✅ xg-over/win: sözler noktayla biter ve etiket/detay dolu
✅ xg-over/win: etkiler |delta| <= 6 ve en az 1 alan
✅ xg-over/draw: soru rakip kısa adını içerir
✅ xg-over/draw: 3 seçenek ve benzersiz tema önekli id
✅ xg-over/draw: sözler noktayla biter ve etiket/detay dolu
✅ xg-over/draw: etkiler |delta| <= 6 ve en az 1 alan
✅ xg-over/loss: soru rakip kısa adını içerir
✅ xg-over/loss: 3 seçenek ve benzersiz tema önekli id
✅ xg-over/loss: sözler noktayla biter ve etiket/detay dolu
✅ xg-over/loss: etkiler |delta| <= 6 ve en az 1 alan
✅ xg-under/win: soru rakip kısa adını içerir
✅ xg-under/win: 3 seçenek ve benzersiz tema önekli id
✅ xg-under/win: sözler noktayla biter ve etiket/detay dolu
✅ xg-under/win: etkiler |delta| <= 6 ve en az 1 alan
✅ xg-under/draw: soru rakip kısa adını içerir
✅ xg-under/draw: 3 seçenek ve benzersiz tema önekli id
✅ xg-under/draw: sözler noktayla biter ve etiket/detay dolu
✅ xg-under/draw: etkiler |delta| <= 6 ve en az 1 alan
✅ xg-under/loss: soru rakip kısa adını içerir
✅ xg-under/loss: 3 seçenek ve benzersiz tema önekli id
✅ xg-under/loss: sözler noktayla biter ve etiket/detay dolu
✅ xg-under/loss: etkiler |delta| <= 6 ve en az 1 alan
✅ late/win: soru rakip kısa adını içerir
✅ late/win: 3 seçenek ve benzersiz tema önekli id
✅ late/win: sözler noktayla biter ve etiket/detay dolu
✅ late/win: etkiler |delta| <= 6 ve en az 1 alan
✅ late/draw: kombinasyon yoksa null (klasiğe düşer)
✅ late/loss: kombinasyon yoksa null (klasiğe düşer)
✅ streak/win: soru rakip kısa adını içerir
✅ streak/win: 3 seçenek ve benzersiz tema önekli id
✅ streak/win: sözler noktayla biter ve etiket/detay dolu
✅ streak/win: etkiler |delta| <= 6 ve en az 1 alan
✅ streak/draw: soru rakip kısa adını içerir
✅ streak/draw: 3 seçenek ve benzersiz tema önekli id
✅ streak/draw: sözler noktayla biter ve etiket/detay dolu
✅ streak/draw: etkiler |delta| <= 6 ve en az 1 alan
✅ streak/loss: soru rakip kısa adını içerir
✅ streak/loss: 3 seçenek ve benzersiz tema önekli id
✅ streak/loss: sözler noktayla biter ve etiket/detay dolu
✅ streak/loss: etkiler |delta| <= 6 ve en az 1 alan
✅ Temalı id’ler birbirleriyle ve klasik 9 id ile çakışmaz
✅ Temalı sözler klasik sözlerle çakışmaz
✅ Temalı sözlerin tamamı kayıttan geriye çözülür
✅ Klasik sözler hâlâ çözülüyor (geriye uyum)
✅ Bilinmeyen söz null döner
✅ Kanıtsız düz galibiyet classic döner
✅ İlk golü yiyip kazanmak comeback
✅ İlk golü atıp berabere kalmak collapse
✅ Comeback derbiden öncelikli
✅ Derbi kanıtı derby temasını seçer
✅ Kendi kırmızı kartın redcard
✅ VAR olayı var temasını seçer
✅ xG +2 fark xg-over
✅ xG -2 fark xg-under
✅ 76+ kendi galibiyet golü late
✅ Üst üste 3 aynı sonuç streak (düşük öncelikli kanıt yokken)
✅ İki maçlık seri streak tetiklemez
✅ Bağlam outcome’u skorla tutarlı
✅ Deplasman taraf hesabı doğru (ilk gol opp)
✅ Classic bağlam klasik diyaloğu açar
✅ Late bağlamı temalı diyaloğu açar

ROPORTAJ-QA: 145/145 PASS
```
## 47. GameProvider played-fixture and durable save
Exit: 0

```text
> manager26@1.0.0 qa:store-fixture
> tsx tools/qa-store-fixture.ts

probe sonrası inbox: 5 (artmalıydı)
İlk fikstür: gün 6 denizli_yesilova vs adana_seyhan [hazirlik] played=false
friendlies başlangıç: [{"round":1,"homeId":"denizli_yesilova","awayId":"adana_seyhan","played":false,"day":6,"comp":"hazirlik"},{"round":2,"homeId":"rize_yagmur","awayId":"denizli_yesilova","played":false,"day":13,"comp":"hazirlik"}]
gün-1 fikstürleri: []
tüm maçlarım günleri: ["lig27","lig34","lig41","lig48","lig55","lig62","lig69","lig76","lig83","lig90","lig97","lig104","lig111","lig118","lig125","lig132","lig181","lig195","lig216","lig244","lig272","lig293","haz6","haz13"]
Maç günü: career.day=6, fixture.day=6
playLeagueMatch döndü: 0-0
friendlies maç sonrası: [{"round":1,"homeId":"denizli_yesilova","awayId":"adana_seyhan","played":true,"day":6,"comp":"hazirlik","hg":0,"ag":0,"xgHome":0.37762469730487447,"xgAway":0.21399493611021697},{"round":2,"homeId":"rize_yagmur","awayId":"denizli_yesilova","played":false,"day":13,"comp":"hazirlik"}]
inbox 5 → 7
✅ Kaleci kurtarışları sindi (motor 3 = kayıt 3)
✅ Maç raporu xG ile arşivlendi (0.38-0.21)
Maç sonrası nextFixture: gün 13 rize_yagmur vs denizli_yesilova [hazirlik] played=false
✅ Fikstür ilerledi, aynı maç tekrar sunulmuyor.
2. maç (hızlı sim) işlendi 0-1; sonraki: gün 27 denizli_yesilova vs diyarbakir_surlar
✅ Taktiksel uyum iki maçla işlendi (2 maç · %66)
✅ Son maç reytingleri gerçek arşivden türedi (rize_yagmur_GK_2: 6.4)
✅ Rotasyon masası gerçek kadroyla çalıştı (3 öneri)
✅ Takım performans split'i gerçek arşivden türedi (2 maç · 1-0 · 4 puan)
✅ Taraftar nabzı gerçek veriyle çalıştı (momentum: warm, güven 64/100)
✅ Oynanan maç gerçek test yuvasına kaydedildi.
```
## 48. Transfer negotiation and save integration (jsdom)
Exit: 0

```text
> manager26@1.0.0 qa:transfer:scene:ui
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-transfer-scene-ui.tsx

✅ Kurulum: gün 100 kulüplü transfer penceresi dışında
✅ Serbest oyuncu için kulüp aşaması atlanabilir, henüz transfer yok
✅ Serbest oyuncu doğrudan sözleşme masasına geçti
✅ Seçilen replik, oynatılan kaynak ve görünür altyazı eşleşiyor
✅ Ses yüklenirken yalnız altyazı görünür, karakter henüz konuşmaz
✅ Ses gerçekten başlayınca yalnız menajer konuşur
✅ Ara belleğe alma sırasında dudak hareketi durur
✅ Önceki repliğin geç gelen olayları yeni repliği başlatmaz veya bitirmez
✅ Yeni replik yalnız kendi oynatma olayıyla başlar
✅ Düşük maaş teklifi oyuncudan ret alıyor, imza yok
✅ Oyuncu yanıtında doğru yüz konuşur
✅ Dışarıdan duraklatılan ses yüz animasyonunu da durdurur
✅ Replik bitince yüz tekrar dinlenme durumuna geçer
✅ Kullanılan oyuncu üslubunda tekrar indirim ipucu verilmiyor
✅ Aynı üslup ve teklif art arda indirim üretmez
✅ Yeterli maaş kabul ediliyor ama kendiliğinden imzalanmıyor
✅ Son kontrol imzadan önce açık ve bütçe değişmedi
✅ Çift tıklama bir kez imzalar | buy=1, log=1
✅ 85 GEN bedelsiz oyuncu yıldız stadyumu ve gerçek kulüp/stadyum bilgisiyle tanıtılır
✅ İmzalanan bedelsiz oyuncu gerçek kadro, maaş, söz ve geçmişe işlendi
✅ İmza IndexedDB kaydına yazılıyor, sürüm 4 ve yeni sahne alanı yok
✅ 85 GEN anonsu yalnız yıldız bağlamındaki ses ve altyazıyı kullanır
✅ Tanıtım sonrası önceki ana merkez dönüşü korunuyor
✅ Kayıt yeniden açılınca oyuncu, sözleşme ve süre sözü korunuyor
✅ Eksik opsiyonel alanlı eski kayıt güvenle açılır; oyuncu korunur
✅ Ana ses kapalıyken ses çalmaz; altyazı ve uyarı görünür
✅ Ana ses kapalıyken görüşme ilerler
✅ Sahnenin sessize alma seçeneği tekrar oynatmada da sesi kapatır
✅ Tekrar dinle/atla, ana ses × efekt düzeyi ve altyazıyla çalışır
✅ Tarayıcı ses oynatımını reddetse de metin ve oyuncu kararı çalışır
✅ 80 GEN tanıtımı stadyumda; yok numara uydurulmadı
✅ Tanıtım sonrası piyasada kal seçeneği korunuyor
✅ Kulüplü oyuncuda seçenek seçmeden teklif verilemiyor
✅ Kulüp seçeneği ve risk/fayda ipuçları görünür
✅ Kulüp yanıtı ayrı aşama; transfer henüz yazılmadı
✅ Karşı teklif kabulü doğrudan imzalamaz; oyuncuyla ayrı görüşülür
✅ Son kontrolde satış payı ve oyuncu koşulları var
✅ Gerçek kulüp transferi ve satış payı store’a işlendi
✅ İmzalanan bedel ve kalan bütçe hesapla aynı | fee=0.66 budget=9.3
✅ Sıfır nakitli takas, serbest/bedelsiz diye etiketlenmez
✅ Takas edilen oyuncu satıcıya geçti, isim tanıtımda korundu
✅ 79 ve altı oyuncu basın tanıtımı alıyor
✅ Kapalı pencere / bütçe aşımında kulüplü teklif devre dışı
✅ Maaş bütçesi aşılırsa oyuncu teklifi engellenir
✅ Kota testi: yabancı sınırı dolduruldu
✅ Kota doluyken imza düğmesi engelli ve gerçek sınır gösteriliyor
✅ Store da yabancı kotasını bağımsız uygular
✅ 30 kişilik kadro doluyken takassız imza engellenir
✅ Store kadro sınırını bağımsız uygular

TRANSFER-SCENE-UI: 49/49
```

Stderr:
```text
(node:63735) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
```
## 49. Sale negotiation, settlement and save integration (jsdom)
Exit: 0

```text
> manager26@1.0.0 qa:sale:ui
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-sale-flow.tsx

✅ Üslupsuz karşı teklif eski deterministik kabul sınırlarını koruyor
✅ Üslup yalnızca sınırda en fazla 5 puan etkiliyor ve tekrar açınca değişmiyor
✅ Pazarlığa kapalı alıcı yakın üstü bedeli reddediyor
✅ Gelen teklif kartında oyuncunun potansiyeli de görünür
✅ Gelen teklif sesli hareketli satış masasında açılıyor; hemen satış yok
✅ Menajer cevap seçmeden teklif ilerlemiyor
✅ Satışta seçilen cümle, ses dosyası ve altyazı aynı
✅ Risk/fayda ipuçları görünür ve menajer konuşuyor
✅ Alıcı yanıtı ayrı aşama; bütçe ve teklif hâlâ değişmedi
✅ Son kontrolde brüt, önceki kulüp payı, net ve bütçe açıkça görülüyor
✅ Son kontrolden vazgeçmek satış veya ret yapmaz
✅ Çift son onay tek satış ve tek bütçe hareketi yapar
✅ Oyuncu alıcı kadrosuna geçer, diğer açık teklif geçersizleşir
✅ Önceki satış payı yalnız bir kez ödenir ve transfer geçmişine yazılır
✅ 79 GEN satış alıcı kulübün basın odasında tanıtılır
✅ Satış tanıtım anonsu ses ve altyazıyla oynar
✅ Satış kaydı sürüm 4; sahne veya üslup için yeni kalıcı alan yok
✅ Kaydı yeniden açınca satılan oyuncu, net bütçe ve geçmiş korunur
✅ Eski ikinci teklif satışı tekrarlayamaz
✅ Önceki kulübün satış payı kayıt yüklenirken korunur
✅ Kabul edilen karşı teklif yalnız ön anlaşmadır
✅ Onaylanan karşı teklifte pay gerçek bedelden düşülür ve bütçeye net tutar eklenir
✅ 80 GEN alıcı kulübün stadyumunda tanıtılır
✅ Yüksek karşı teklif reddinde teklif kapanır, oyuncu ve bütçe korunur
✅ Reddedilen teklif yeniden satış masasına açılamaz
✅ 85 GEN için alıcı kulüpte özel yıldız/stadyum tanıtımı var
✅ Yıldız tanıtımında yıldız anonsu kullanılıyor
✅ Artık kadroda olmayan oyuncunun açık teklifi güvenle reddedilir
✅ Süresi dolan teklif finansal işlem yapmaz
✅ Kiralık oyuncu satılamaz
✅ Eski kayıt/akademi oyuncusu gerçekten alıcı kulübün kadrosuna taşınır
✅ Aylık maaşta satılan altyapı oyuncusu sayılmaz, kalan oyuncu bir kez sayılır

SALE-FLOW: 32/32 geçti
```

Stderr:
```text
(node:63874) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
```
## 50. Market potential, rotation, match plan and legacy saves (jsdom)
Exit: 0

```text
> manager26@1.0.0 qa:market-squad:ui
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-market-squad-polish.tsx

✅ Fırsatlar görünümündeki tüm oyuncuların POT değeri var | 8 oyuncu
✅ Kısa liste işlemi sonrasında aynı düğmede klavye odağı korunuyor
✅ Oyuncu Ara görünümündeki tüm oyuncuların POT değeri var | 44 oyuncu
✅ Tüm mevkiler için filtre düğmeleri var
✅ Türkçe oyuncu adı aksansız yazımla bulunur | Kuzey Demirtaş → kuzey demirtas
✅ Mevki ve arama birlikte uygulanır
✅ Filtreleri temizle aramayı, mevkiyi ve diğer filtreleri sıfırlar
✅ Sonuç yoksa açıklayıcı boş durum gösterilir
✅ Kısa listeye eklenen oyuncunun POT değeri de görünür
✅ Kısa liste ve POT kayıt/yükleme sonrası korunur
✅ POT, GEN ile eşit olsa bile gösterilir
✅ Piyasadaki sözleşme kartlarında da bütün oyuncuların POT değeri görünür
✅ Rotasyon masası başlangıçta kapalı ve erişilebilir
✅ Rotasyon masası açılır ve önerileri gösterir
✅ Boş ilk 11 yuvaları sonraki oyuncunun mevki indeksini kaydırmaz
✅ Rotasyon masası tekrar kapanır
✅ Taktik tahtasının otomatik ilk 11 ve yuvaları motorla aynı
✅ Seçilmiş yedek önce gelir; tekrar, ilk 11 ve olmayan oyuncu eklenmez
✅ Canlı maç kulübesi seçilen yedeği gerçekten içerir
✅ 4-2-3-1 hücum yuvaları tahtada ve canlı sahada aynı soldan sağa sıradadır
✅ Eski 4-3-3 dizilişi sahadaki yerlerini korur, ev/deplasman maçına doğru aktarılır
✅ Eski 4-2-3-1 dizilişi sahadaki yerlerini korur, ev/deplasman maçına doğru aktarılır
✅ Eski 4-4-2 dizilişi sahadaki yerlerini korur, ev/deplasman maçına doğru aktarılır
✅ Eski 4-1-4-1 dizilişi sahadaki yerlerini korur, ev/deplasman maçına doğru aktarılır
✅ Eski 3-5-2 dizilişi sahadaki yerlerini korur, ev/deplasman maçına doğru aktarılır
✅ Eski 5-3-2 dizilişi sahadaki yerlerini korur, ev/deplasman maçına doğru aktarılır
✅ Eski dizilişte değişiklik orijinal yuvalara kaydedilir ve maça aynı şekilde geçer
✅ Maç hazırlığındaki rotasyon uyarısı seçili manuel 11’i kullanır
✅ Maç hazırlığı sağlık kontrolü seçili ilk 11 riskini gösterir
✅ Hızlı deplasman maçında seçilen manuel plan kendi takımına uygulanır
✅ Olay dönüşümü golcü, asist, animasyon ve görsel ipuçlarını korur
✅ Arşiv golü ve kırmızı kartı kimlik ve taraflarıyla korur
✅ Deplasman raporunda rakibin merkez payı doğru hesaplanır
✅ Deplasman raporunda rakip karne başlığı ev sahibini gösterir
✅ Olay içermeyen eski raporda dürüst boş durum gösterilir
✅ Onaylı sakat oyuncu seçili ilk 11 ile gerçekten sahaya çıkar
✅ Maç ve sağlık güncellemesi birlikte işlendiğinde nüks kaybolmaz
✅ 257. maçta arşiv 256 kayıtla sınırlıdır; en eski kayıt çıkar
✅ 256 maç sınırı kayıt/yükleme sonrasında da korunur
✅ Eski kayıtta isteğe bağlı arşiv, satış ve yedek alanları yokken oyun açılır

MARKET-SQUAD-POLISH: 40/40 geçti
```

Stderr:
```text
(node:64012) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
```
## 51. Contract renewal and recorded match highlights (jsdom)
Exit: 0

```text
> manager26@1.0.0 qa:renewal-highlights:ui
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-renewal-highlights.tsx

✅ Üslup deterministik ve maaş değişince karşı beklenti sabit
✅ Üslup küçük ve sınırlı bir indirim etkisi yapıyor
✅ Menajer cevaplarında birden fazla Türkçe replik var | 10 replik
✅ Yenileme sesleri transfer gelişini veya yeni oyuncu tanıtımını söylemiyor
✅ Düşük maaş reddedilir, kabul/ret ön izlemesi kaydı değiştirmez
✅ İmza bonusu altı mevcut maaş, bütçe ₺M ve maaş ₺B/ay
✅ Geçersiz süre, ücret ve üslup reddedilir
✅ Aynı olayda çift imza tek kez işlenir
✅ İmza gerçek sözleşme süresini ve maaşı değiştirir
✅ Kayıt sürümü değişmedi, pazarlık için yeni kalıcı alan yok
✅ Yenilenmiş maaş, süre ve bütçe kayıt/yükleme sonrasında korunuyor
✅ Eski iki argümanlı yenileme çağrısı korunuyor
✅ Eksik imza bonusu ön izleme ve son imzada reddedilir
✅ Bonus kadar bütçe ile imza sonrası kasa sıfır olur
✅ Kiralık oyuncunun sözleşmesi yenilenemez
✅ Başka kulübe geçmiş oyuncu yenilenemez
✅ Kayıttan çıkmış oyuncu yenilenemez
✅ İki yıldan uzun geçerli sözleşme yeniden imzalanamaz
✅ Kırgın oyuncu süre sözü olmadan sözleşme konuşmaz
✅ Gerçek süre sözü verilince görüşme yeniden açılır
✅ Aynı olayda satılan oyuncuya eski görünümden imza atılamaz
✅ Yenileme kulübe uygun hareketli, konuşmacılı masada başlar
✅ Süre seçimi 3/4/5 yıl ve mevcut/önerilen maaş açıklanır
✅ Seçilen menajer cümlesi, altyazı ve yerel ses aynı
✅ Düşük ücret ret ve gerçek karşı beklenti gösterir; sözleşme değişmez
✅ Karşı beklenti düzenleme ekranına aktarılır
✅ Kabul ayrı yanıt aşaması; henüz imza veya ödeme yok
✅ Son kontrol süre, yeni maaş, bonus ve kalan bütçeyi gösterir
✅ Vazgeçmek hiçbir sözleşme veya bütçeyi değiştirmez ve sesi durdurur
✅ Seçim yanında dürüst küçük fayda ve belirsizlik ipuçları var
✅ Son imza ile tek ödeme yapılır ve transfer tanıtımı açılmaz
✅ İncelemeden sonra bütçe değişirse son imza yeniden denetlenir
✅ Bütçe yeterli ama değişmişse yeni rakam gösterilir; ilk tıklama imzalamaz
✅ Güncel mali koşullar incelendikten sonra imza işlenir
✅ İncelemeden sonra oyuncu satılırsa son imza reddedilir
✅ Gerçek olay metni ve sırası korunur, devre dışarıda kalır
✅ Ev sahibi yolu kaydedilen bölgelerden çizilir
✅ Deplasman anim yolu iki eksende aynalanır
✅ VAR iptali gol sayılmaz; skora göre doğru akış var
✅ Eksik gol akışında ara skor uydurulmaz
✅ Geçersiz veya tarafı bilinmeyen yol çizilmez
✅ Birinci yol geçersizse yalnız geçerli anim yolu kullanılır
✅ İptal yazılı çelişkili gol olayı skor üretmez
✅ Türkçe büyük harfli iptal ve VAR motor kararı gol sayılmaz
✅ İptal edilen gol canlı saha, ses ve akışa gol değil VAR olayı olarak aktarılır
✅ Kayıt biçimi değişmeden iptal VAR, gerçek gol gol, büyük harfli kart kırmızı arşivlenir
✅ Özette açık oyun kurtarışını yapan takım ile şut yolu iki yönde doğru ayrılır
✅ Özette duran top kurtarışında kaleci tarafı korunur; belirsiz eski kayıt tahmin edilmez
✅ Eski arşivde açık oyun/duran top ayrımı kayıpsa kurtaran takım uydurulmaz
✅ Arşiv yalnız gerçek tür, dakika, taraf ve bilinen oyuncuyu çözer
✅ Eski ve boş arşiv olayları güvenli boş liste verir
✅ Gerçek motor maçlarında özet yalnız kayıtlı olaylardan üretilir | 3 maç
✅ Gerçek motor maçlarında son olay skoru gerçek sonuçla uyuşur
✅ Gerçek motor kurtarışlarında özet hücum ekibini kaleci takımı sanmaz | 15 açık oyun kurtarışı
✅ Özet ekranında kurtarışı yapan takım ve hücum edenin yolu ayrı gösterilir
✅ Belirsiz eski kurtarış ekranı yanlış kulüp adı yerine takım bilgisi yok der
✅ Özet başlangıçta duraklar; ilk gerçek olay ve konum görünür
✅ İleri ile VAR olayına geçilir ve skor değişmez
✅ Sonraki olayda aynalanmış gerçek deplasman yolu görünür
✅ Yolu olmayan olayda konum kaydı yok denir
✅ Geri düğmesi önceki gerçek olayı gösterir
✅ Oynatma yalnız düğme ile başlar
✅ Duraklatma zamanlayıcıyı durdurur
✅ Oynatma tek zamanlayıcı kurar
✅ Özet kapatılınca oynatma zamanlayıcısı temizlenir
✅ Maç raporundan özete kullanıcı isteğiyle erişilir; eksik skor açıkça maç sonu
✅ Özet kapanınca rapor ve manuel sonuç butonu kalır
✅ Eski maç arşivi kayıtsız olaylar için dürüst boş durum gösterir
✅ Yeni arşivde yalnız kaydedilmiş olay ve oyuncu var, konum uydurulmaz
✅ Son fikstür hızlı simülasyona hazır
✅ Son fikstürden sonra sıradaki maç yok ama hızlı sonuç erişilebilir | null
✅ Hızlı sonuç gerçek olaylı özeti kullanıcı isteğiyle açar
✅ Hızlı maçın sıkıştırılmış gerçek olayları mevcut arşive yazılır
✅ Kaydı yeniden açınca arşivde özete erişilir; eksik konum uydurulmaz

74/74 geçti
```

Stderr:
```text
(node:64189) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
```
## 52. Live reactions, player comparison and weekly paper (jsdom)
Exit: 0

```text
> manager26@1.0.0 qa:atmosphere-paper:ui
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-atmosphere-comparison-paper.tsx

✅ Ev sahibi menajer kendi golünde sevinir, rakip golünde üzülür
✅ Deplasman menajeri için gol tarafları tersine doğru çevrilir
✅ Açık oyun kurtarışında hücum tarafı değil kaleci tarafı kullanılır
✅ Duran top kurtarışında kayıtlı kaleci tarafı kullanılır
✅ Tarafı belirsiz kurtarışta sevinç veya takım uydurulmaz
✅ Kart her iki takımda da gerçek taraf ve temkinli tepki taşır
✅ VAR, şans, antrenör notu ve iptal edilmiş gol kutlama üretmez
✅ Aynı olay partisinin son satırı bilgi olsa da gerçek kurtarış bulunur
✅ VAR sonucu ve büyük İ ile yazılmış iptal golü de kutlama üretmez
✅ Kırmızı kart motor kararı veya Türkçe büyük harflerden doğru anlaşılır
✅ Geçersiz taraf ya da bilinmeyen hücum kulübü takım uydurmaz
✅ Aynı adımda gelen birden çok gerçek olay son tepkilerde sırasıyla korunur
✅ Sekiz gerçek maçta tepkiler yalnız gerçek ve değiştirilmemiş olaylardan seçilir | 88 tepki · 57 açık oyun kurtarışı
✅ Ev/deplasman dahil sekiz maçta sahne açık/kapalı skor, olay ve istatistik eşittir
✅ Karşılaştırma havuzu gerçek kadro ve güncel serbest oyuncuları kimlik başına bir kez içerir
✅ Eski piyasa snapshotı güncel kadro, kulüp ve maaşı ezmez
✅ Piyasa yenileme aralıkları özgün akışla aynı
✅ Türkçe/ASCII arama ve gerçek serbest statüsü doğru
✅ Eski/eksik GEN, POT, maaş ve kondisyon sıfır yerine bilinmiyor
✅ Maaş birimi aylık bin TL ve kondisyon yüzdesi doğru
✅ Karşılaştırmada mevcut tercih edilen taraf ve alternatif mevkiler görünür
✅ Eksik eski mevki bilgileri tahmin edilmez, gerçekten boş alternatif Yok gösterilir
✅ Türkçe mevki, alternatif mevki ve taraf araması gerçek kayıtları kullanır
✅ Gazete gün 4–10 aralığına tam yedi günü alır
✅ Oynanmamış, skorsuz ve gelecek maçlar dışarıda; sıfır sıfır korunur
✅ Tekrarlanan fikstür ve transfer tek kayıt sayılır
✅ Gerçek arşivin oynanma günü/skoru ertelenmiş fikstürün önüne geçer
✅ Ertelenmiş maçın mükerrer arşivleri de tek skor sayılır
✅ Oynanma günü gelecekteki arşiv varsa fikstür geçmiş sonuç diye sunulmaz
✅ Önceki sezonun aynı gün numaralı transfer/maçları yeni haftaya karışmaz
✅ Takım formu mevcut sezonun gerçek kendi skorlarından çıkar
✅ Eksik fikstürde mevcut maç arşivi gerçek skor kaynağı olabilir
✅ Sezon başlangıcında bitiş günü bilinmeyen önceki sezon haftaya eklenmez
✅ Boş hafta sahte sonuç, transfer veya form üretmez
✅ Maçsız ama transferli haftada manşet gerçek transferdir
✅ Kadrodan erişilebilir karşılaştırma penceresi açılır
✅ İlk oyuncu seçilince ikinci seçim açılır ve aynı oyuncu tekrar seçilemez
✅ İki gerçek oyuncu ve yedi ölçüt yan yana görünür
✅ Maaş ve doğal mevki karşılaştırma tablosunda gösterilir
✅ Her iki oyuncunun kayıtlı tarafı ve alternatif mevkileri tabloda gösterilir
✅ Karşılaştırma yeni kayıt alanı eklemez; bütçe ve oyuncu yamaları değişmez
✅ Piyasadaki oyuncu karşılaştırmanın ilk tarafına taşınır
✅ Gazete gerçek skor, form ve yalnız bu sezon transferini gösterir
✅ Bilinmeyen sezon sınırı gazetenin üzerinde dürüstçe açıklanır
✅ Basın Odasının eski beş bölümü korunur ve Gazete ayrıca açılır
✅ Sahne gerçek menajer ve mevcut yedek oyuncuları içerir
✅ Sahnedeki yedeklerin gerçek adları gözle okunabilir
✅ Son tepkiler çoklu gerçek olayları yeniden incelemeye sunar
✅ Cezalı menajer tribünde, duraklatılmış sahne donmuş olarak etiketlenir
✅ Azaltılmış hareket ve metinli gerçek olay sahnede gösterilir
✅ Gerçek değişiklik uygulanınca sahnedeki yedek listesi motorla güncellenir
✅ Yedek olmadığında isim uydurulmaz ve boş durum görünür

52/52 geçti
```

Stderr:
```text
(node:64334) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
```
## 53. Match arrival, award, training and career story (jsdom)
Exit: 0

```text
> manager26@1.0.0 qa:career-scenes:ui
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-career-scenes.tsx

✅ Hikâye kayıtları değiştirmeden sezonları büyükten küçüğe gruplar
✅ Gelecek sezon/gün, mükerrer skor, transfer ve kupa görünmez
✅ Aynı sezonun bilinen günleri doğru sıradadır ve 0–0 kaybolmaz
✅ Kupa kazanma günü uydurulmaz ve ayrı gruptadır
✅ Sezonu okunamayan kupa diğer sezonlarla sıralanmaz
✅ Eski kayıtta sezon yoksa gün numarası tahmin edilmeden ayrı tutulur
✅ Boş kariyer sahte olay üretmez
✅ Uzun yıl biçimli kupa sezonu doğrulanır, hatalı yıl ayrı kalır
✅ Kariyer profili gerçek skor, oyuncu ve kupadan hikâye kurar
✅ Kupa için günün bilinmediği açıkça yazılır
✅ Kupa filtresi yalnız kupaları gösterir
✅ Transfer filtresi gerçek yön ve bedeli gösterir
✅ Hikâye gezintisi şema, maç, transfer ve kupa kayıtlarını değiştirmez | v=4 reports=true transfers=true trophies=true keys=
✅ Ana merkez kariyer profiline kısayol sunar
✅ Antrenman sahnesi mevcut odağı ve azaltılmış hareket tercihini kullanır
✅ Sakat oyuncu sahadan çıkar; sağlıklı gerçek oyuncular ve kondisyon/form gösterilir
✅ Hücum odağı gerçek seçimle sahneyi değiştirir
✅ Defans odağı gerçek seçimle sahneyi değiştirir
✅ Fizik odağı gerçek seçimle sahneyi değiştirir
✅ Zekâ odağı gerçek seçimle sahneyi değiştirir
✅ Teknik odağı gerçek seçimle sahneyi değiştirir
✅ Yoğunluk mevcut ayara ve sahne hızına bağlanır
✅ Sadece seçili mevcut antrenman ayarı değişir, oyunculara anında çalışma uygulanmaz
✅ Boş kadroda sayı/form uydurulmaz, dürüst boş durum görünür
✅ Maç gününden önce geliş sahnesi açılmaz ve maç başlatılmaz
✅ Maç gününde geliş isteğe bağlıdır ve maç kendiliğinden başlamaz
✅ Sahne gerçek ev sahibi stadyumu ve takım otobüsünü kullanır
✅ Azaltılmış harekette son kare açıktır, otomatik ekran geçişi yoktur
✅ Klavye/sürgü zamanı otobüs konumunu gerçek anlamda değiştirir
✅ Geliş bitince hazırlık ekranı ve manuel maç düğmesi kalır
✅ Geliş izleme sonuç, fikstür ve kayıt şemasını değiştirmez
✅ Geliş penceresindeki maç düğmesi yalnız kullanıcı basınca gerçek canlı maçı açar
✅ Canlı maçtan çıkınca oturum işareti temizlenir
✅ Ödül kazananı mevcut rapordaki puan/gol/asist/şut/kimlik sırasıyla aynıdır
✅ Oyuncu verisi yoksa ödül kazananı uydurulmaz
✅ 40 gerçek canlı motor maçında ödül seçimi ve puanı önceki rapor sırasıyla aynıdır | denizli_yesilova
✅ Puanına göre kendi takımından veya rakipten oyuncu kazanabilir
✅ Tören sesleri transfer değil, yerel Türkçe ödül anonslarıdır
✅ Tören kendiliğinden açılmaz ve ses çalmaz
✅ Tören aynı gerçek maç oyuncusu, puanı ve kulübünü gösterir
✅ Anons yalnız açma eyleminde çalınır ve ana ses × efekt düzeyine uyar
✅ Altyazı oynatılan kayıtla aynı cümledir
✅ Tören sesi kapatılınca oynatma durur
✅ Töreni kapatmak maç raporundan otomatik çıkmaz
✅ Ana ses kapalıyken ses çalınmaz ama altyazı görünür
✅ Hızlı sonuçta da tören isteğe bağlıdır
✅ Hızlı sonuç töreninin oyuncusu gerçek arşiv satırındadır
✅ Hızlı sonuç ekranı kullanıcı kapatmadan açık kalır

Kariyer sahneleri: 48/48 geçti.
```

Stderr:
```text
(node:64465) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
```
## 54. Newsroom and fan atmosphere regression (jsdom)
Exit: 0

```text
> manager26@1.0.0 qa:wave7:ui
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-wave7-atmosphere-ui.tsx

✅ Maç hazırlığı fikstürle açıldı
✅ Atmosfer kartı render oldu
✅ TRIBÜN ve BEKLENTİ satırları geçerli tonlarda | adet=2
✅ Kültür değerleri sayı olarak metne yansıdı (0-100 /100 biçimi)
✅ TD Notu kartı korunuyor (Dalga 5 regresyonu)
✅ Basın odası açıldı
✅ Taraftar sekmesi mevcut
✅ Tribün Masası kartı render oldu
✅ Dört kültür göstergesi görünür
✅ Maçsız kariyerde dürüst trend notu
✅ Ezeli rekabet kartı var (nemesis yoksa dürüst metin)
✅ Sonuç şeridi boş durumda
✅ Sahte sonuç noktası üretilmedi
✅ Mevcut Manşet sekmesi geri dönüyor

DALGA7-ATMOSFER-UI: PASS
```

Stderr:
```text
(node:64642) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
```
## 55. Tactics editor regression (jsdom)
Exit: 0

```text
> manager26@1.0.0 qa:wave2:ui
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-wave2-tactics-ui.tsx

✅ Uyum çipi %60 taban gösteriyor | %60uyum
✅ Uyum çipi maç etkisi ipucu taşıyor | Yeni 4-3-3 dizilisi — ilk 3 maç alışma dönemi · maç etkisi: nötr (bu planla henüz maç oynanmadı veya uyum %80’de)
✅ Nötr planda etki yüzdesi etiketi görünmez
✅ Yeni diziliş ipucu görünüyor
✅ 11 saha rozetinin kondisyon halkası var | adet=11
✅ Kondisyon tonları geçerli kümeden
✅ Rozetlerde yıldızlı reyting var
✅ Sahada 11 dokunulabilir oyuncu yuvası | adet=11
✅ Yedek bandı dolu | adet=11
✅ Dokunulan yuvaya uyumlu yedekler parlıyor | uyumlu=2
✅ Uyumlu yedekler gerçekten aynı mevki grubundan
✅ Uyumsuz yedekler soluklaşıyor
✅ Yedek kondisyon noktaları işlenmiş
✅ Uyumlu yedek sahaya alındı (parlatma sıfırlandı) | Baran Uçar — seçili yuvaya sah

DALGA2-TAKTIK-UI: PASS
```

Stderr:
```text
(node:64741) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
Warning: `ReactDOMTestUtils.act` is deprecated in favor of `React.act`. Import `act` from `react` instead of `react-dom/test-utils`. See https://react.dev/warnings/react-dom-test-utils for more info.
```
## 56. Squad rotation and health regression (jsdom)
Exit: 0

```text
> manager26@1.0.0 qa:wave3:ui
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-wave3-squad-ui.tsx

✅ Kondisyon dağılımı bandı render oldu
✅ 3 ton segmenti var | adet=3
✅ Lejant sayaçları kadro toplamına eşit | 21/1/0
✅ Segment yüzdeleri toplamı %100 (veya kadro boş değil)
✅ Rotasyon masası görünür
✅ Öneri türleri geçerli kümeden | adet=2
✅ Uyarı yoksa sakin durum metni var
✅ Maçsız kariyerde trend oku üretilmez (sahte veri yok)
✅ Hızlı profilde son maç reyting bloğu var
✅ Maç verisi yoksa dürüst boş durum metni
✅ Kaleci filtresi listeyle sınırlı | gösterilen=3
✅ Filtrelenmiş görünümde de dağılım bandı duruyor

DALGA3-KADRO-UI: PASS (kadro)
```

Stderr:
```text
(node:64808) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
Warning: `ReactDOMTestUtils.act` is deprecated in favor of `React.act`. Import `act` from `react` instead of `react-dom/test-utils`. See https://react.dev/warnings/react-dom-test-utils for more info.
```
## 57. Matchday preparation regression (jsdom)
Exit: 0

```text
> manager26@1.0.0 qa:wave5:ui
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-wave5-matchday-ui.tsx

✅ Maç hazırlık ekranı fikstürle açıldı
✅ TD brifing kartı render oldu
✅ Brifing notları dolu ve geçerli tonlarda | adet=3
✅ Zorunlu notlar mevcut (EŞLEŞME, UYUM, KONDİSYON) | EŞLEŞME/UYUM/KONDİSYON
✅ Başlık rakip ismini taşıyor
✅ Arşiv yokken FORMDA/FORMSUZ notu üretilmez (sahte veri yok)
✅ En az bir taktik plan butonu var | 5 plan
✅ Plan değişiminde ekran hata vermeden yeniden render oldu
✅ Kontrol listesi hâlâ görünür (mevcut akış bozulmadı)
✅ Rakip scout kartı duruyor
✅ Maça başla / simüle aksiyonları duruyor

DALGA5-MACGUNU-UI: PASS
```

Stderr:
```text
(node:64907) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
Warning: `ReactDOMTestUtils.act` is deprecated in favor of `React.act`. Import `act` from `react` instead of `react-dom/test-utils`. See https://react.dev/warnings/react-dom-test-utils for more info.
```
## 58. Batched halftime event and decision flow (jsdom)
Exit: 0

```text
> manager26@1.0.0 qa:live:halftime
> node tools/qa-live-halftime.mjs


=== Devre partisi: trailing ===
Maç günü: day=6, fikstür gün 6 [hazirlik]
✅ Analiz sekmesinde kümülatif xG grafiği render oldu
akış: 1:011. YARI
akış: 2:291. YARI
akış: 4:031. YARI
akış: 5:291. YARI
akış: 6:141. YARI
akış: 7:401. YARI
akış: 8:411. YARI
akış: 9:131. YARI
akış: 10:421. YARI
akış: 11:521. YARI
akış: 13:181. YARI
akış: 13:591. YARI
akış: 14:501. YARI
akış: 15:381. YARI
akış: 16:111. YARI
akış: 16:421. YARI
akış: 17:221. YARI
akış: 18:581. YARI
akış: 20:101. YARI
akış: 20:441. YARI
akış: 22:171. YARI
akış: 23:181. YARI
akış: 24:241. YARI
akış: 25:381. YARI
akış: 26:441. YARI
akış: 27:391. YARI
akış: 29:121. YARI
akış: 29:511. YARI
akış: 30:221. YARI
akış: 31:511. YARI
akış: 33:031. YARI
akış: 34:021. YARI
akış: 35:361. YARI
akış: 36:521. YARI
akış: 37:521. YARI
akış: 39:271. YARI
akış: 40:381. YARI
akış: 41:351. YARI
akış: 42:151. YARI
akış: 43:231. YARI
akış: 44:541. YARI
✅ Devre konuşması boyunca maç saati durdu
✅ Devre tercihi motora bir kez uygulandı
akış: 45:48DEVRE
akış: 46:372. YARI
✅ Antrenör notu maç akışına düştü (1 TD notu render oldu)
akış: 49:512. YARI
akış: 50:522. YARI
akış: 51:572. YARI
akış: 52:302. YARI
akış: 54:042. YARI
akış: 54:582. YARI
akış: 55:432. YARI
akış: 56:222. YARI
akış: 57:382. YARI
akış: 58:592. YARI
akış: 60:182. YARI
akış: 61:432. YARI
akış: 62:462. YARI
akış: 64:082. YARI
akış: 65:022. YARI
akış: 66:022. YARI
akış: 67:112. YARI
akış: 67:432. YARI
akış: 69:222. YARI
akış: 69:572. YARI
akış: 70:342. YARI
akış: 71:292. YARI
akış: 72:192. YARI
akış: 73:192. YARI
akış: 74:372. YARI
akış: 75:072. YARI
akış: 76:022. YARI
akış: 76:472. YARI
akış: 78:182. YARI
akış: 79:112. YARI
akış: 80:272. YARI
akış: 81:512. YARI
akış: 83:182. YARI
akış: 84:072. YARI
akış: 84:392. YARI
akış: 85:092. YARI
akış: 86:032. YARI
akış: 87:272. YARI
akış: 88:182. YARI
akış: 88:492. YARI
akış: 89:482. YARI
akış: 91:17UZATMA
akış: MSUZATMA
✅ Aynı adımdaki sonraki olay devre konuşmasını gizlemedi; konuşma yalnız bir kez açıldı
✅ Maç tamamlandı, röportaja geçiş butonu belirdi (otomatik geçiş yok)
✅ Bekleyince röportaj kendiliğinden açılmadı, canlı ekran incelemeye açık kaldı
✅ Buton sonrası maç sonu röportajı açıldı
✅ Maç sonu röportaj seçenekleri render oldu
✅ Röportaj sonrası maç raporu açıldı
✅ Canlı maç ödül töreni gerçek oyuncu ve motor puanını gösterdi
✅ Tören kapanınca maç raporu otomatik değişmedi
✅ Gerçek olay akışındaki goller motor skoruyla tutarlı
✅ Rapor son düdük dahil tüm gerçek olayları gösteriyor (71)
✅ Önemli anlar filtresi gerçek olayları süzüyor
Maç sonrası nextFixture: gün 13 rize_yagmur vs denizli_yesilova played=false
✅ Fikstür ilerledi
✅ Gerçek önemli olaylar arşive doğru sıkıştırıldı (9)
✅ Arşiv gol sayısı kaydedilen skorla eşleşiyor

=== Devre partisi: decision ===
Maç günü: day=6, fikstür gün 6 [hazirlik]
✅ Analiz sekmesinde kümülatif xG grafiği render oldu
akış: 1:011. YARI
akış: 2:291. YARI
akış: 4:031. YARI
akış: 5:291. YARI
akış: 6:141. YARI
akış: 7:401. YARI
akış: 8:411. YARI
akış: 9:131. YARI
akış: 10:421. YARI
akış: 11:521. YARI
akış: 13:181. YARI
akış: 13:591. YARI
akış: 14:501. YARI
akış: 15:381. YARI
akış: 16:111. YARI
akış: 16:421. YARI
akış: 17:221. YARI
akış: 18:581. YARI
akış: 20:101. YARI
akış: 20:441. YARI
akış: 22:171. YARI
akış: 23:181. YARI
akış: 24:241. YARI
akış: 25:381. YARI
akış: 26:441. YARI
akış: 27:391. YARI
akış: 29:121. YARI
akış: 29:511. YARI
akış: 30:221. YARI
akış: 31:511. YARI
akış: 33:031. YARI
akış: 34:021. YARI
akış: 35:361. YARI
akış: 36:521. YARI
akış: 37:521. YARI
akış: 39:271. YARI
akış: 40:381. YARI
akış: 41:351. YARI
akış: 42:151. YARI
akış: 43:231. YARI
akış: 44:541. YARI
akış: 45:48DEVRE
✅ Devre konuşması boyunca maç saati durdu
✅ Devre tercihi motora bir kez uygulandı
akış: 46:372. YARI
✅ Antrenör notu maç akışına düştü (1 TD notu render oldu)
akış: 49:512. YARI
akış: 50:522. YARI
akış: 51:572. YARI
akış: 52:302. YARI
akış: 54:042. YARI
akış: 54:582. YARI
akış: 55:432. YARI
akış: 56:222. YARI
akış: 57:382. YARI
akış: 58:592. YARI
akış: 60:182. YARI
akış: 61:432. YARI
akış: 62:462. YARI
akış: 64:082. YARI
akış: 65:022. YARI
akış: 66:022. YARI
akış: 67:112. YARI
akış: 67:432. YARI
akış: 69:222. YARI
akış: 69:572. YARI
akış: 70:342. YARI
akış: 71:292. YARI
akış: 72:192. YARI
akış: 73:192. YARI
akış: 74:372. YARI
akış: 75:072. YARI
akış: 76:022. YARI
akış: 76:472. YARI
akış: 78:182. YARI
akış: 79:112. YARI
akış: 80:272. YARI
akış: 81:512. YARI
akış: 83:182. YARI
akış: 84:072. YARI
akış: 84:392. YARI
akış: 85:092. YARI
akış: 86:032. YARI
akış: 87:272. YARI
akış: 88:182. YARI
akış: 88:492. YARI
akış: 89:482. YARI
akış: 91:17UZATMA
akış: MSUZATMA
✅ Aynı adımdaki sonraki olay devre konuşmasını gizlemedi; konuşma yalnız bir kez açıldı
✅ Aynı adımdaki karar da devre konuşmasından önce gösterildi
✅ Maç tamamlandı, röportaja geçiş butonu belirdi (otomatik geçiş yok)
✅ Bekleyince röportaj kendiliğinden açılmadı, canlı ekran incelemeye açık kaldı
✅ Buton sonrası maç sonu röportajı açıldı
✅ Maç sonu röportaj seçenekleri render oldu
✅ Röportaj sonrası maç raporu açıldı
✅ Canlı maç ödül töreni gerçek oyuncu ve motor puanını gösterdi
✅ Tören kapanınca maç raporu otomatik değişmedi
✅ Gerçek olay akışındaki goller motor skoruyla tutarlı
✅ Rapor son düdük dahil tüm gerçek olayları gösteriyor (71)
✅ Önemli anlar filtresi gerçek olayları süzüyor
Maç sonrası nextFixture: gün 13 rize_yagmur vs denizli_yesilova played=false
✅ Fikstür ilerledi
✅ Gerçek önemli olaylar arşive doğru sıkıştırıldı (9)
✅ Arşiv gol sayısı kaydedilen skorla eşleşiyor
```

Stderr:
```text
 not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
(node:65795) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
Warning: An update to Root inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: `ReactDOMTestUtils.act` is deprecated in favor of `React.act`. Import `act` from `react` instead of `react-dom/test-utils`. See https://react.dev/warnings/react-dom-test-utils for more info.
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
```
## 59. Injury treatment and return do not repeat decisions (jsdom)
Exit: 0

```text
> manager26@1.0.0 qa:match-finish
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-live-finish.tsx

Maç günü: day=6, fikstür gün 6 [hazirlik]
✅ Analiz sekmesinde kümülatif xG grafiği render oldu
✅ Tedaviyi bekleme seçimi motorca bir kez alındı ve aynı karar açılmadı
✅ Tedavi ve sahaya dönüş akışta kalır, dönüş yeni bir sakatlık kararı açmaz
```

Stderr:
```text
(node:66596) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
Warning: An update to Root inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: `ReactDOMTestUtils.act` is deprecated in favor of `React.act`. Import `act` from `react` instead of `react-dom/test-utils`. See https://react.dev/warnings/react-dom-test-utils for more info.
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
```
## 60. Match finish, last-whistle reaction and manual interview (jsdom)
Exit: 0

```text
> manager26@1.0.0 qa:match-finish
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-live-finish.tsx

Maç günü: day=6, fikstür gün 6 [hazirlik]
✅ Analiz sekmesinde kümülatif xG grafiği render oldu
akış: 1:011. YARI
akış: 2:291. YARI
akış: 4:031. YARI
akış: 5:291. YARI
akış: 6:141. YARI
akış: 7:401. YARI
akış: 8:411. YARI
akış: 9:131. YARI
akış: 10:421. YARI
akış: 11:521. YARI
akış: 13:181. YARI
akış: 13:591. YARI
akış: 14:501. YARI
akış: 15:381. YARI
akış: 16:111. YARI
akış: 16:421. YARI
akış: 17:221. YARI
akış: 18:581. YARI
akış: 20:101. YARI
akış: 20:441. YARI
akış: 22:171. YARI
akış: 23:181. YARI
akış: 24:241. YARI
akış: 25:381. YARI
akış: 26:441. YARI
akış: 27:391. YARI
akış: 29:121. YARI
akış: 29:511. YARI
akış: 30:221. YARI
akış: 31:511. YARI
akış: 33:031. YARI
akış: 34:021. YARI
akış: 35:361. YARI
akış: 36:521. YARI
akış: 37:521. YARI
akış: 39:271. YARI
akış: 40:381. YARI
akış: 41:351. YARI
akış: 42:151. YARI
akış: 43:231. YARI
akış: 44:541. YARI
akış: 45:48DEVRE
akış: 46:372. YARI
✅ Antrenör notu maç akışına düştü (1 TD notu render oldu)
akış: 49:512. YARI
akış: 50:522. YARI
akış: 51:572. YARI
akış: 52:302. YARI
akış: 54:042. YARI
akış: 54:582. YARI
akış: 55:432. YARI
akış: 56:222. YARI
akış: 57:382. YARI
akış: 58:592. YARI
akış: 60:182. YARI
akış: 61:432. YARI
akış: 62:462. YARI
akış: 64:082. YARI
akış: 65:022. YARI
akış: 66:022. YARI
akış: 67:112. YARI
akış: 67:432. YARI
akış: 69:222. YARI
akış: 69:572. YARI
akış: 70:342. YARI
akış: 71:292. YARI
akış: 72:192. YARI
akış: 73:192. YARI
akış: 74:372. YARI
akış: 75:072. YARI
akış: 76:022. YARI
akış: 76:472. YARI
akış: 78:182. YARI
akış: 79:112. YARI
akış: 80:272. YARI
akış: 81:512. YARI
akış: 83:182. YARI
akış: 84:072. YARI
akış: 84:392. YARI
akış: 85:092. YARI
akış: 86:032. YARI
akış: 87:272. YARI
akış: 88:182. YARI
akış: 88:492. YARI
akış: 89:482. YARI
akış: 91:17UZATMA
akış: MSUZATMA
✅ Maç tamamlandı, röportaja geçiş butonu belirdi (otomatik geçiş yok)
✅ Son düdükle aynı adımda gelen gerçek olay türü donmuş sahnede korunur
✅ Bekleyince röportaj kendiliğinden açılmadı, canlı ekran incelemeye açık kaldı
✅ Buton sonrası maç sonu röportajı açıldı
✅ Maç sonu röportaj seçenekleri render oldu
✅ Röportaj sonrası maç raporu açıldı
✅ Canlı maç ödül töreni gerçek oyuncu ve motor puanını gösterdi
✅ Tören kapanınca maç raporu otomatik değişmedi
✅ Gerçek olay akışındaki goller motor skoruyla tutarlı
✅ Rapor son düdük dahil tüm gerçek olayları gösteriyor (71)
✅ Önemli anlar filtresi gerçek olayları süzüyor
Maç sonrası nextFixture: gün 13 rize_yagmur vs denizli_yesilova played=false
✅ Fikstür ilerledi
✅ Gerçek önemli olaylar arşive doğru sıkıştırıldı (9)
✅ Arşiv gol sayısı kaydedilen skorla eşleşiyor
```

Stderr:
```text
(node:66773) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
Warning: An update to Root inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: `ReactDOMTestUtils.act` is deprecated in favor of `React.act`. Import `act` from `react` instead of `react-dom/test-utils`. See https://react.dev/warnings/react-dom-test-utils for more info.
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
```
## 61. Cancelled goal live presentation, audio and match finish (jsdom)
Exit: 0

```text
> manager26@1.0.0 qa:match-finish
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-live-finish.tsx

Maç günü: day=6, fikstür gün 6 [hazirlik]
✅ Analiz sekmesinde kümülatif xG grafiği render oldu
akış: 1:011. YARI
akış: 2:291. YARI
akış: 4:031. YARI
akış: 5:291. YARI
✅ İptal gol canlı sahada ve seslerde VAR kararıdır; gol kutlaması açılmaz
akış: 7:401. YARI
akış: 8:411. YARI
akış: 9:131. YARI
akış: 10:421. YARI
akış: 11:521. YARI
akış: 13:181. YARI
akış: 13:591. YARI
akış: 14:501. YARI
akış: 15:381. YARI
akış: 16:111. YARI
akış: 16:421. YARI
akış: 17:221. YARI
akış: 18:581. YARI
akış: 20:101. YARI
akış: 20:441. YARI
akış: 22:171. YARI
akış: 23:181. YARI
akış: 24:241. YARI
akış: 25:381. YARI
akış: 26:441. YARI
akış: 27:391. YARI
akış: 29:121. YARI
akış: 29:511. YARI
akış: 30:221. YARI
akış: 31:511. YARI
akış: 33:031. YARI
akış: 34:021. YARI
akış: 35:361. YARI
akış: 36:521. YARI
akış: 37:521. YARI
akış: 39:271. YARI
akış: 40:381. YARI
akış: 41:351. YARI
akış: 42:151. YARI
akış: 43:231. YARI
akış: 44:541. YARI
akış: 45:48DEVRE
akış: 46:372. YARI
✅ Antrenör notu maç akışına düştü (1 TD notu render oldu)
akış: 49:512. YARI
akış: 50:522. YARI
akış: 51:572. YARI
akış: 52:302. YARI
akış: 54:042. YARI
akış: 54:582. YARI
akış: 55:432. YARI
akış: 56:222. YARI
akış: 57:382. YARI
akış: 58:592. YARI
akış: 60:182. YARI
akış: 61:432. YARI
akış: 62:462. YARI
akış: 64:082. YARI
akış: 65:022. YARI
akış: 66:022. YARI
akış: 67:112. YARI
akış: 67:432. YARI
akış: 69:222. YARI
akış: 69:572. YARI
akış: 70:342. YARI
akış: 71:292. YARI
akış: 72:192. YARI
akış: 73:192. YARI
akış: 74:372. YARI
akış: 75:072. YARI
akış: 76:022. YARI
akış: 76:472. YARI
akış: 78:182. YARI
akış: 79:112. YARI
akış: 80:272. YARI
akış: 81:512. YARI
akış: 83:182. YARI
akış: 84:072. YARI
akış: 84:392. YARI
akış: 85:092. YARI
akış: 86:032. YARI
akış: 87:272. YARI
akış: 88:182. YARI
akış: 88:492. YARI
akış: 89:482. YARI
akış: 91:17UZATMA
akış: MSUZATMA
✅ Maç tamamlandı, röportaja geçiş butonu belirdi (otomatik geçiş yok)
✅ Bekleyince röportaj kendiliğinden açılmadı, canlı ekran incelemeye açık kaldı
✅ Buton sonrası maç sonu röportajı açıldı
✅ Maç sonu röportaj seçenekleri render oldu
✅ Röportaj sonrası maç raporu açıldı
✅ Canlı maç ödül töreni gerçek oyuncu ve motor puanını gösterdi
✅ Tören kapanınca maç raporu otomatik değişmedi
✅ Gerçek olay akışındaki goller motor skoruyla tutarlı
✅ Rapor son düdük dahil tüm gerçek olayları gösteriyor (71)
✅ Önemli anlar filtresi gerçek olayları süzüyor
Maç sonrası nextFixture: gün 13 rize_yagmur vs denizli_yesilova played=false
✅ Fikstür ilerledi
✅ Gerçek önemli olaylar arşive doğru sıkıştırıldı (9)
✅ Arşiv gol sayısı kaydedilen skorla eşleşiyor
```

Stderr:
```text
(node:67597) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
Warning: An update to Root inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: `ReactDOMTestUtils.act` is deprecated in favor of `React.act`. Import `act` from `react` instead of `react-dom/test-utils`. See https://react.dev/warnings/react-dom-test-utils for more info.
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
```
## 62. Match finish recovery after simulated engine failure (jsdom)
Exit: 0

```text
> manager26@1.0.0 qa:match-finish
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-live-finish.tsx

Maç günü: day=6, fikstür gün 6 [hazirlik]
✅ Analiz sekmesinde kümülatif xG grafiği render oldu
akış: 1:011. YARI
akış: 2:291. YARI
akış: 4:031. YARI
akış: 5:291. YARI
akış: 6:141. YARI
akış: 7:401. YARI
akış: 8:411. YARI
Kurtarma paneli göründü
✅ Kurtarma butonu çalıştı
akış: MSUZATMA
✅ Maç tamamlandı, röportaja geçiş butonu belirdi (otomatik geçiş yok)
✅ Bekleyince röportaj kendiliğinden açılmadı, canlı ekran incelemeye açık kaldı
✅ Güvenli bitiriş sonrası canlı günlük de son düdüğe kadar tamamlandı
✅ Buton sonrası maç sonu röportajı açıldı
✅ Maç sonu röportaj seçenekleri render oldu
✅ Röportaj sonrası maç raporu açıldı
✅ Canlı maç ödül töreni gerçek oyuncu ve motor puanını gösterdi
✅ Tören kapanınca maç raporu otomatik değişmedi
✅ Gerçek olay akışındaki goller motor skoruyla tutarlı
✅ Rapor son düdük dahil tüm gerçek olayları gösteriyor (70)
✅ Önemli anlar filtresi gerçek olayları süzüyor
Maç sonrası nextFixture: gün 13 rize_yagmur vs denizli_yesilova played=false
✅ Fikstür ilerledi
✅ Gerçek önemli olaylar arşive doğru sıkıştırıldı (9)
✅ Arşiv gol sayısı kaydedilen skorla eşleşiyor
```

Stderr:
```text
(node:68375) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
Warning: An update to Root inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: `ReactDOMTestUtils.act` is deprecated in favor of `React.act`. Import `act` from `react` instead of `react-dom/test-utils`. See https://react.dev/warnings/react-dom-test-utils for more info.
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
[hm26] canlı maç adımı hatası: Error: ENJEKTE_EDİLMİŞ_ADIM_HATASI
    at MatchSession.patchedStep (/home/user/hm26/tools/qa-live-finish.tsx:90:55)
    at Timeout._onTimeout (/home/user/hm26/src/screens/LiveMatch.tsx:230:31)
    at listOnTimeout (node:internal/timers:585:17)
    at process.processTimers (node:internal/timers:521:7)
```
## 63. Matchday progression and end-day regression (jsdom)
Exit: 0

```text
> manager26@1.0.0 qa:dayflow
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-dayflow.tsx

✅ Maç gününe gelindi (gün 6 [hazirlik])
✅ Maç Merkezine gidildi
✅ Maç Merkezi açıldı
✅ Canlı maç başlatıldı
✅ Canlı maçta "Maçtan çık" butonu YOK
✅ Manuel röportaj geçişi bilgilendirme şeridi görünüyor
✅ 4× hız açıldı
✅ Maç bitince röportaja geçiş butonu belirdi
✅ Röportaj kendiliğinden açılmadı (kullanıcı tıklaması bekleniyor)
✅ Bekleyince de otomatik geçiş olmadı; canlı ekran açık kaldı
✅ Maç sonrası canlı Analiz sekmesi açıldı
✅ Analiz sekmesi içeriği (şut haritası) görüntüleniyor
✅ Maç sonrası Spiker sekmesi açıldı
✅ Spiker maç günlüğü görüntüleniyor
✅ Saha sekmesine geri dönüldü
✅ Röportaja geçiş butonuna basıldı
✅ Röportaj ekranı buton tıklaması sonrası açıldı
✅ Üç röportaj seçeneği render oldu
✅ Röportajı reddetme seçeneği var
✅ İlk röportaj seçeneği işaretlendi
✅ Maç sonu analizi (MatchReport) açıldı
✅ Analiz sekmesi açılıyor: ^İstatistik$
✅ Analiz sekmesi açılıyor: ^Analiz$
✅ Analiz sekmesi açılıyor: ^Karneler$
✅ Analiz sekmesi açılıyor: ^Olaylar$
✅ Analiz sekmesi açılıyor: ^Özet$
✅ Sonucu Kaydet butonuna basıldı
✅ Kayıt sonrası ekran ANA MERKEZ (Hub)
✅ Maç raporu arşive işlendi
✅ Röportaj sözü ve menajer adıyla inbox kaydı oluştu
✅ Tam bir röportaj inbox mesajı eklendi
✅ Hazırlık maçı derbi değil (kültür beklentisi saf röportaj etkisi)
✅ fanTrust beklenen değerde (66)
✅ discipline beklenen değerde (68)
✅ ultrasHeat beklenen değerde (22)
✅ Röportaj topluluk güvenine dokunmadı
✅ Fikstür ilerledi (sonraki maç gün 13)
✅ Hub alt çubuk CTA'sı "Sonraki Gün →" diyor
✅ Sonraki Gün butonuna basıldı
✅ Gün ilerledi: 6 → 7
✅ Maç gününe gelindi (gün 13 [hazirlik])
✅ Maç Merkezine gidildi
✅ Maç Merkezi açıldı
✅ Canlı maç başlatıldı
✅ Canlı maçta "Maçtan çık" butonu YOK
✅ Manuel röportaj geçişi bilgilendirme şeridi görünüyor
✅ 4× hız açıldı
✅ Maç bitince röportaja geçiş butonu belirdi
✅ Röportaj kendiliğinden açılmadı (kullanıcı tıklaması bekleniyor)
✅ Bekleyince de otomatik geçiş olmadı; canlı ekran açık kaldı
✅ Maç sonrası canlı Analiz sekmesi açıldı
✅ Analiz sekmesi içeriği (şut haritası) görüntüleniyor
✅ Maç sonrası Spiker sekmesi açıldı
✅ Spiker maç günlüğü görüntüleniyor
✅ Saha sekmesine geri dönüldü
✅ Röportaja geçiş butonuna basıldı
✅ Röportaj ekranı buton tıklaması sonrası açıldı
✅ Röportaj reddedildi
✅ Maç sonu analizi (MatchReport) açıldı
✅ Analiz sekmesi açılıyor: ^İstatistik$
✅ Analiz sekmesi açılıyor: ^Analiz$
✅ Analiz sekmesi açılıyor: ^Karneler$
✅ Analiz sekmesi açılıyor: ^Olaylar$
✅ Analiz sekmesi açılıyor: ^Özet$
✅ Sonucu Kaydet butonuna basıldı
✅ Kayıt sonrası ekran ANA MERKEZ (Hub)
✅ Maç raporu arşive işlendi
✅ Reddetmede yeni röportaj inbox mesajı YOK
✅ Reddetmede fanTrust/ultrasHeat değişmedi
✅ Reddetmede discipline yalnızca kart cezası kadar değişti
✅ Maç sonucu inbox mesajı yine de oluştu
✅ İkinci maç sonrası Sonraki Gün çalıştı
✅ Gün ilerledi: 13 → 14
✅ Maç gününe gelindi (gün 27 [lig])
✅ Maç Merkezine gidildi
✅ Maç Merkezi açıldı
✅ Canlı maç başlatıldı
✅ Canlı maçta "Maçtan çık" butonu YOK
✅ Manuel röportaj geçişi bilgilendirme şeridi görünüyor
✅ 4× hız açıldı
✅ Maç bitince röportaja geçiş butonu belirdi
✅ Röportaj kendiliğinden açılmadı (kullanıcı tıklaması bekleniyor)
✅ Bekleyince de otomatik geçiş olmadı; canlı ekran açık kaldı
✅ Maç sonrası canlı Analiz sekmesi açıldı
✅ Analiz sekmesi içeriği (şut haritası) görüntüleniyor
✅ Maç sonrası Spiker sekmesi açıldı
✅ Spiker maç günlüğü görüntüleniyor
✅ Saha sekmesine geri dönüldü
✅ Röportaja geçiş butonuna basıldı
✅ Röportaj ekranı buton tıklaması sonrası açıldı
✅ Üç röportaj seçeneği render oldu
✅ Röportajı reddetme seçeneği var
✅ İlk röportaj seçeneği işaretlendi
✅ Maç sonu analizi (MatchReport) açıldı
✅ Analiz sekmesi açılıyor: ^İstatistik$
✅ Analiz sekmesi açılıyor: ^Analiz$
✅ Analiz sekmesi açılıyor: ^Karneler$
✅ Analiz sekmesi açılıyor: ^Olaylar$
✅ Analiz sekmesi açılıyor: ^Özet$
✅ Rapor ekranında "Kaydet ve Günü Bitir" butonu var
✅ Kaydet ve Günü Bitir butonuna basıldı
✅ Gün tek dokunuşla ilerledi: 27 → 28
✅ Maç raporu yine de arşive işlendi
✅ Gün Sonu Özeti sheet’i açıldı
✅ Ekran maç merkezinde kalmadı (Hub’a dönüldü)
✅ Özet sheet kapatıldı
✅ Kısayol maçı arşive işlendi
✅ Kısayol sonrası Hub gün çubuğu normal akışta çalışıyor

108/108 kontrol PASS — maç sonu akışı regresyonu temiz
```

Stderr:
```text
ovider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
```
## 64. Team insights and statistics UI (jsdom)
Exit: 0

```text
> manager26@1.0.0 qa:wave6:ui
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-wave6-team-ui.tsx

✅ StatsHub açıldı
✅ Krallıklar boş durumu korunuyor
✅ Ev/Deplasman kartı render oldu
✅ Form şeridi kartı render oldu
✅ Arşiv yokken dürüst boş durum (split)
✅ Arşiv yokken dürüst boş durum (form)
✅ Sahte performans satırı üretilmedi
✅ Mevcut xPTS ve Fair Play kartları duruyor
✅ Karakter sekmesi boş durumu çalışıyor
✅ Ödüller sekmesi açılıyor (kupa vitrini)
✅ Sekme geçişleri sonrası krallıklar geri geliyor

DALGA6-TAKIM-UI: PASS
```

Stderr:
```text
(node:69770) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
Warning: `ReactDOMTestUtils.act` is deprecated in favor of `React.act`. Import `act` from `react` instead of `react-dom/test-utils`. See https://react.dev/warnings/react-dom-test-utils for more info.
```
## 65. Player analytics and match history UI (jsdom)
Exit: 0

```text
> manager26@1.0.0 qa:analytics:ui
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-analytics-ui.tsx

✅ İki hazırlık maçı arşive işlendi
✅ Arşivde satırı olan kadro oyuncusu bulundu | Ilgaz Horoz
✅ Kadro listesinde oyuncu satırı var
✅ Hızlı profil sheet’i açıldı
✅ Tam profilde maç günlüğü kartı var
✅ Maç günlüğü gerçek arşiv satırları gösteriyor | adet=2
✅ Reyting sparkline SVG’si çizildi
✅ Günlük satırlarında lig/kupa etiketi var
✅ Günlük özetinde ortalama reyting ve dakika var
✅ Analiz sekmesi açıldı
✅ xG trend kartı render oldu
✅ İki maçla trend çizgisi çizildi (≥2 nokta)
✅ Az veride xG yargısı gösterilmez (sahte içgörü yasağı)
✅ Ev/Deplasman kartı korunuyor (Dalga 6 regresyonu)
✅ Form şeridi korunuyor (Dalga 6 regresyonu)
✅ Üçüncü maç (lig) işlendi
✅ 3+ maçta xG yargısı metni belirdi | xG'ne göre 2.1 gol eksiktesin — pozisyonlar geliyor ama sonu
✅ H2H kartı render oldu
✅ H2H boş durum dürüst metin gösteriyor (uydurma geçmiş yok)
✅ H2H kartı mevcut scout kartını bozmadı

ANALITIK-UI: PASS
```

Stderr:
```text
ovider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
```
## 66. Scout, interview and press profile UI (jsdom)
Exit: 0

```text
> manager26@1.0.0 qa:scout:ui
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-scout-ui.tsx

✅ Üç maç arşivlendi, sonuncuda röportaj var
✅ Röportaj inbox mesajı oluştu
✅ Basın profili kartı render oldu
✅ Basın profili en az 1 röportaj sayıyor | toplam=1
✅ Sonuç dağılımı üç kutu olarak var
✅ Her oynanmış maç için tam bir haber render oldu (jenerik dahil)
✅ Maç haberleri geçerli etiketlerle render oldu | temiz,temiz,sonuc
✅ Haber detaylarında skor/gerçek sayı var
✅ Fikstür manşetleri korundu (regresyon)
✅ Geri dönüş temalı soru ekranda
✅ Temalı 3 seçenek render oldu
✅ Seçilen seçenek tema önekli id taşıyor | comeback-karakter
✅ Kırmızı kart temalı soru ekranda
✅ Ekran bağlam dağıtıcısıyla aynı diyaloğu üretiyor | ekran=streak-alcakgonul beklenen=streak-alcakgonul tema=streak
✅ Yeni scout kartı başlıkta
✅ Sahte "Son biçim G─B─M" verisi tamamen kaldırıldı
✅ Scout gövdesi render oldu
✅ Form şeridi yalnız G/B/M harflerinden oluşur | G
✅ Rakip xG hücresi var
✅ Rakip xG gerçek değer veya dürüst "—" gösterir | 0.12Rakip xG/maç
✅ Risk & rotasyon masası render oldu
✅ Risk uyarıları geçerli türlerde | hotbench,hotbench,hotbench
✅ H2H kartı hâlâ duruyor (A katmanı regresyonu)

SCOUT-UI: PASS
```

Stderr:
```text
ovider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
```
## 67. News and career analytics UI (jsdom)
Exit: 0

```text
> manager26@1.0.0 qa:fixwave:ui
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-fixwave-ui.tsx

✅ Kurulum: 3 maç arşivlendi, röportaj mesajı var
✅ Hub maç kartı rakip rozetini gösteriyor
✅ Rakip form rozeti dürüst biçimde (G/B/M şeridi veya "—") | G
✅ Lig sırası rozeti (varsa) sayısal değer taşıyor | 5
✅ Eski ölü "formArr" izi UI metnine sızmıyor
✅ "Rakip Analizi" butonu bulundu
✅ "Rakip Analizi" artık matchPrep ekranına gidiyor (eski yanlış: comps) | matchPrep
✅ "Maç Merkezine Git" butonu bulundu
✅ Maç merkezi butonu da matchPrep'e gidiyor | matchPrep
✅ Röportaj mesaj kartı açıldı
✅ Sheet içinde "İlgili Bölüme Git" butonu var
✅ Röportaj yönlendirmesi Basın Odası (newsroom) | newsroom
✅ Sıradan yönetim mesaj kartı açıldı
✅ Yönlendirme butonu çalıştı
✅ Diğer yönetim mesajları kulüp bölümüne (club) gidiyor — regresyon yok | club
✅ Saklanan maç sonucu mevcut
✅ xPTS kartı render oldu
✅ xPTS 0–3 aralığında geçerli sayı | 2.563
✅ Üç sonuç olasılığı (galibiyet/beraberlik/mağlubiyet) yüzde olarak var | 78/22/0
✅ Olasılıklar %100’e yakınsıyor (normalize) | 100%
✅ Gerçek puan 0/1/3 olarak gösteriliyor
✅ Beklenti yargısı var (üstü/altı/yakın)
✅ Kariyer profilinde basın profili kartı var
✅ Konuşulan röportaj sayısı doğru (en az 1) | 1
✅ Sonuç dağılımı üç kutu (Galibiyet/Beraberlik/Mağlubiyet)
✅ En sık kullanılan ton satırı var

FIXWAVE-UI: PASS
```

Stderr:
```text
Encountered two children with the same key, `academy-expired-1`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.
    at div
    at div
    at InboxScreen (/home/user/hm26/src/screens/Inbox.tsx:29:70)
    at Grab (/home/user/hm26/tools/qa-fixwave-ui.tsx:63:59)
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: Encountered two children with the same key, `academy-expired-1`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.
    at div
    at div
    at InboxScreen (/home/user/hm26/src/screens/Inbox.tsx:29:70)
    at Grab (/home/user/hm26/tools/qa-fixwave-ui.tsx:63:59)
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: Encountered two children with the same key, `academy-expired-1`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.
    at div
    at div
    at InboxScreen (/home/user/hm26/src/screens/Inbox.tsx:29:70)
    at Grab (/home/user/hm26/tools/qa-fixwave-ui.tsx:63:59)
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: Encountered two children with the same key, `academy-expired-1`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.
    at div
    at div
    at InboxScreen (/home/user/hm26/src/screens/Inbox.tsx:29:70)
    at Grab (/home/user/hm26/tools/qa-fixwave-ui.tsx:63:59)
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: Encountered two children with the same key, `academy-expired-1`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.
    at div
    at div
    at InboxScreen (/home/user/hm26/src/screens/Inbox.tsx:29:70)
    at Grab (/home/user/hm26/tools/qa-fixwave-ui.tsx:63:59)
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: Encountered two children with the same key, `academy-expired-1`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.
    at div
    at div
    at InboxScreen (/home/user/hm26/src/screens/Inbox.tsx:29:70)
    at Grab (/home/user/hm26/tools/qa-fixwave-ui.tsx:63:59)
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: Encountered two children with the same key, `academy-expired-1`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.
    at div
    at div
    at InboxScreen (/home/user/hm26/src/screens/Inbox.tsx:29:70)
    at Grab (/home/user/hm26/tools/qa-fixwave-ui.tsx:63:59)
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: Encountered two children with the same key, `academy-expired-1`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.
    at div
    at div
    at InboxScreen (/home/user/hm26/src/screens/Inbox.tsx:29:70)
    at Grab (/home/user/hm26/tools/qa-fixwave-ui.tsx:63:59)
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: Encountered two children with the same key, `academy-expired-1`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.
    at div
    at div
    at InboxScreen (/home/user/hm26/src/screens/Inbox.tsx:29:70)
    at Grab (/home/user/hm26/tools/qa-fixwave-ui.tsx:63:59)
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: Encountered two children with the same key, `academy-expired-1`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.
    at div
    at div
    at InboxScreen (/home/user/hm26/src/screens/Inbox.tsx:29:70)
    at Grab (/home/user/hm26/tools/qa-fixwave-ui.tsx:63:59)
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
```
## 68. Match preparation and league analytics UI (jsdom)
Exit: 0

```text
> manager26@1.0.0 qa:cwave:ui
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-cwave-ui.tsx

✅ Oynanmış lig fikstürleri var | 18 fikstür
✅ Tüm oynanmış lig fikstürleri xG taşıyor (kullanıcı + AI)
✅ Kullanıcının oynadığı tüm maçlar xG taşıyor (lig + hazırlık) | 3 maç
✅ xG değerleri makul sınırda (<6)
✅ 3 maç raporu arşivlendi
✅ Raporlar sıkıştırılmış olay taşıyor | 3/3 olaylı
✅ Olay tuple şeması geçerli (dakika/tür/taraf kodları)
✅ Gol olayları gerçek skorla tutarlı | 3 olay vs 3 gol
✅ C1 istatistik bloğu her raporda tam
✅ Rakip xG hücresi render oldu
✅ Hücrede uydurma "—" yerine gerçek xG/maç var | 0.12Rakip xG/maç
✅ xG profil notu görünür
✅ Lig Analizi sekmesi bulundu
✅ xPTS Adalet Tablosu görünür
✅ Tam lig xPTS: neredeyse tüm kulüpler kapsanıyor (eski "veri birikiyor" yok) | ligde 12 kulüp, biriken=0
✅ Sayısal xPTS satırları lig ölçeğinde | 12 satır
✅ Gol dakika profili kartı render oldu
✅ 6 dakika dilimi var
✅ Özet metrikleri (% ilk yarı / 76+ / geriden geliş) var
✅ Sezon istatistik verimliliği kartı render oldu
✅ Şut isabeti yüzdesi görünüyor
✅ Maç sayısı notu var | 3 maçın
✅ İlk gol & maç psikolojisi kartı render oldu
✅ İlk gol attığın/yediğin kutuları var
✅ VAR karnesi görünür
✅ VAR satırı sayısal içerik taşıyor
✅ Disiplin & sakatlık kartı render oldu
✅ Pozisyon disiplini başlığı var
✅ Sakatlık bölgesi veri veya dürüst boş durum gösteriyor
✅ Hakem profili kartı render oldu
✅ Hakem satırları veya boş durum dürüst
✅ Sıkılık rozeti geçerli değerlerde
✅ Lig nabzı (xPTS adaleti) kartı render oldu
✅ En şanslı/hakkı yeniyor/xPTS lideri kutuları var
✅ Kendi durumum da listede
ℹ️ Bu kurulumda aynı rakiple olaylı tekrar maç yok — H2H dakika şeridi gizli (dürüst boşluk, hata değil)
✅ H2H dakika şeridi yoksa H2H kartı hâlâ sağlam

CWAVE-UI: PASS
```

Stderr:
```text
ovider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:221:40)
```
## 69. Playwright Chromium launch smoke test
Exit: 0
## 70. Delayed career save readiness E2E
Exit: 0

```text
✅ Delayed IndexedDB save is awaited and stale career is rejected | reads=5
```
## 71. New career advanced world settings and save E2E
Exit: 0

```text
✅ Gelişmiş ayarlar ilk açılışta kapalı ve düğme panele bağlıdır
✅ Düğme klavyeyle açılır ve dört gerçek ayarı gösterir
✅ 320 px ekranda açma düğmesi ve ilk seçenek görünür, seçenekler taşmaz ve dokunma alanları yeterli | {"width":320,"scrollWidth":320,"scrollTop":84,"scrollBottom":495,"toggleTop":88.125,"introBottom":199.125,"firstGroupBottom":315.4375,"buttons":[{"left":37,"right":115,"width":78,"height":44},{"left":121,"right":199,"width":78,"height":44},{"left":205,"right":283,"width":78,"height":44},{"left":37,"right":115,"width":78,"height":44},{"left":121,"right":199,"width":78,"height":44},{"left":205,"right":283,"width":78,"height":44},{"left":37,"right":115,"width":78,"height":44},{"left":121,"right":199,"width":78,"height":44},{"left":205,"right":283,"width":78,"height":44},{"left":37,"right":115,"width":78,"height":44},{"left":121,"right":199,"width":78,"height":44},{"left":205,"right":283,"width":78,"height":44}]}
✅ Dört ayarın başlangıç değerleri dengelidir
✅ Seçim sonrası klavye odağı ve seçili durum korunur
✅ Panel klavyeyle kapatılabilir ve gizlenir
✅ Panel yeniden açıldığında dört seçim korunur
✅ Dünya dönemi değiştirilirken ayarlar korunur
✅ Özel kariyer ekranı aynı dünya seçimlerini gösterir
✅ Maç gerçekçiliği bölümündeki gol ritmi aynı değerdir
✅ Piyasa bölümündeki yenilenme aynı değerdir
✅ Zorluk adımındaki değişiklik dünya adımına geri yansır
✅ Seçilen dönem, bağımsız zorluk ve dört ayar kariyere kaydedilir | {"version":4,"manager":{"name":"Dünya Ayar Testi","portrait":0,"background":"eskiFutbolcu","era":"acik","difficulty":"zorlu","challengePoints":70},"settings":{"goalPace":"yuksek","randomness":"low","marketRefresh":"yogun","boardPressure":"orta","injuryRate":"yuksek","textSize":"normal","highContrast":false,"reduceMotion":false,"matchSpeed":"normal","suggestions":true}}
✅ Yoğun piyasa seçimi oyunda 7 günlük döngüyü uygular
✅ Kayıt yeniden açıldığında tercihler ve piyasa ritmi korunur
✅ Tarayıcıda yakalanmamış uygulama hatası yok
✅ 390 px ekranda panel açıldığında ilk seçenek görünür ve yatay taşma yoktur | {"width":390,"scrollWidth":390,"rootBottom":771,"firstGroupBottom":405.9375}
✅ Ayarlar değiştirilmeden başlayan kariyerin mevcut varsayılanları değişmez | {"version":4,"manager":{"name":"Varsayılan Dünya","portrait":0,"background":"eskiFutbolcu","era":"gecis","difficulty":"dengeli","challengePoints":45},"settings":{"goalPace":"dengeli","randomness":"normal","marketRefresh":"dengeli","boardPressure":"orta","injuryRate":"normal","textSize":"normal","highContrast":false,"reduceMotion":false,"matchSpeed":"normal","suggestions":true}}
✅ Varsayılan kariyerde de yakalanmamış uygulama hatası yok

CAREER-WORLD-BROWSER: 19 geçti, 0 başarısız
```
## 72. Embedded asset rendering E2E
Exit: 0

```text
✅ A0 Sihirbaz kulüp kartlarında PNG arma (full) yüklü | 12 img (görünür alt küme), hepsi-yuklu=true
✅ A1 Alt menü: 4 sembol × çift renk PNG (tema-adaptif) + more SVG fallback | 4 anahtar, 8 img (cift varyant), svg-fallback=1
✅ A2 Üst çubuk HM26 wordmark PNG | 1 img
✅ A3 Merkez kompakt PNG armalar yüklenmiş | 3 img
✅ A4 Daha paneli PNG semboller + chevron SVG fallback | panel png=42, svg=8
✅ A6 koyu tema: krem ikonlar görünür, koyu ikonlar gizli | m26-dark=true ivory=4/4 dark=0/0
✅ A7 açık tema: koyu ikonlar görünür, krem ikonlar gizli | m26-light=true dark=4/4 ivory=0/0

E2E-ASSETS: 7/7 geçti
```
## 73. Icon system E2E
Exit: 0

```text
screenshots ✓
```
## 74. Statistics and career history E2E
Exit: 0

```text
✅ Boot: kariyer başladı
✅ Daha menüsünde İstatistik sekmesi
✅ StatsHub başlık render
✅ Empty-state onur kuralı (sahte veri yok)
✅ Karakter sekmesi + empty-state
✅ Ödüller sekmesi: vitrin + ödül empty-state | vitrin=true odulEmpty=true
✅ Tam profilde Kariyer Dökümü kartı + empty-state | hizliKart=true kart=true empty=true

6 test, 0 başarısız
```
## 75. Complete statistics and league rankings E2E (320px and 390px)
Exit: 0

```text
✅ 320px/light: gol önizlemesi ilk 10 kayıtla sınırlı ve doğru
✅ 320px/light: önizlemenin son satırı kırpılmadan görülebilir
✅ 320px/light: açık tümünü gör çağrısı ve dokunma alanı
✅ 320px/light: 15. sıra ötesi ve eski/ayrılmış oyuncu dahil
✅ 320px/light: gol eşitliğinde istatistik maç sayısı kuralı korunur
✅ 320px/light: uzun oyuncu adı ayrıntıda kesilmeden sarılır
✅ 320px/light: tam liste kaydırılabilir | {"client":597,"scroll":2867}
✅ 320px/light: son kayıt ve kapatma dar ekranda erişilebilir
✅ 320px/light: pencere ekran genişliğine sığar
✅ 320px/light: Tab odağı pencere içinde tutar
✅ 320px/light: Escape kapatır ve odak açan düğmeye döner
✅ 320px/light: kapat düğmesi yeniden açılan pencereyi kapatır
✅ 320px/light: 🎯 Asist Kralı tam ve doğru sırada | 52/52
✅ 320px/light: ⭐ Maç Puanı (min. 3 maç) tam ve doğru sırada | 50/50
✅ 320px/light: iki maçlık oyuncu reyting sıralamasına girmez
✅ 320px/light: 🧤 Gol Yememe (Kaleciler) kayıtları açılır
✅ 320px/light: 🧤 Kurtarış Yüzdesi (Kaleciler) kayıtları açılır
✅ 320px/light: karakter listesi önizlemesi 5 kayıt
✅ 320px/light: 🔥 En Hırçınlar tam ve doğru sırada | 35/35
✅ 320px/light: 🕊️ Centilmenler (0 kart, min. 5 maç) tam ve doğru sırada | 17/17
✅ 320px/light: ödüller sekmesi çalışmaya devam eder
✅ 320px/light: ⚖️ xPTS Adalet Tablosu tam ve doğru sırada | 12/12
✅ 320px/light: 🕊️ Fair Play Ligi tam ve doğru sırada | 9/9
✅ 320px/light: sakatlık önizlemesinde sadece 5 oyuncu
✅ 320px/light: analiz kartları kırpılmadan kaydırılır
✅ 320px/light: Sakatlık geçmişi (maçtan çıkışlar) tam ve doğru sırada | 8/8
✅ 320px/light: hakem önizlemesinde sadece 6 profil
✅ 320px/light: 📋 Hakem Profilleri tam ve doğru sırada | 8/8
✅ 320px/light: maç özeti penceresi hâlâ açılıp kapanır
✅ 320px/light: analizden sonra krallıklara dönülür
✅ 320px/light: lig gol önizlemesi ilk 8 kayıt
✅ 320px/light: ekran güncellendiğinde açık lig listesi kapanmaz
✅ 320px/light: Gol Krallığı (sezon) tam ve doğru sırada
✅ 320px/light: lig ayrıntısında uzun oyuncu adı kesilmez
✅ 320px/light: lig gol eşitliğinde önceki sıra korunur
✅ 320px/light: Asist Krallığı (sezon) tam ve doğru sırada | 40/40
✅ 320px/light: lig reytingi 3 maç eşiğini ve tüm sıralamayı korur
✅ 320px/light: lig değişimi yalnız seçilen ligdeki oyuncuları gösterir
✅ 320px/light: veri olmayan ligde uydurma sıralama yok
✅ 320px/light: uluslararası gol önizlemesi ilk 8 kayıt
✅ 320px/light: Uluslararası gol krallığı tam ve doğru sırada | 12/12
✅ 320px/light: uluslararası kupa değişiminde diğer listenin verileri taşınmaz
✅ 320px/light: önceki kupaya dönünce golcüler geri gelir
✅ 320px/light: sayfa yatay taşmıyor
✅ 320px/light: sıralamaları açmak oyun kaydını değiştirmez
✅ 320px/light: yüzlerce kayıt için sıralama sınırı uygulanmaz
✅ 320px/light: yüzlerce kaydın sonuna kaydırılabilir
✅ 320px/light: kalabalık ligde portreli tüm oyuncular gösterilir
✅ 320px/light: kalabalık lig listesinin sonuna kaydırılabilir
✅ 320px/light: gerçek maç motoru sıralamaya kayıt üretir
✅ 320px/light: ⚽ Gol Kralı tam ve doğru sırada | 2/2
✅ 320px/light: az veride tüm kayıtlar önizlemede
✅ 320px/light: ⚽ Gol Kralı tam ve doğru sırada | 2/2
✅ 320px/light: eski xG kaynağında arşiv sınırı açıklanır
✅ 320px/light: eski raporda sakatlık ve hakem uydurulmaz
✅ 320px/light: empty kayıtla krallıklar dürüst boş durum
✅ 320px/light: empty analizde boş durum ve düğmesiz listeler
✅ 320px/light: empty lig krallıklarında veri uydurulmaz
✅ 320px/light: legacy kayıtla krallıklar dürüst boş durum
✅ 320px/light: legacy analizde boş durum ve düğmesiz listeler
✅ 320px/light: legacy lig krallıklarında veri uydurulmaz
✅ 320px/light: yakalanmamış tarayıcı hatası yok
✅ 390px/dark: gol önizlemesi ilk 10 kayıtla sınırlı ve doğru
✅ 390px/dark: önizlemenin son satırı kırpılmadan görülebilir
✅ 390px/dark: açık tümünü gör çağrısı ve dokunma alanı
✅ 390px/dark: 15. sıra ötesi ve eski/ayrılmış oyuncu dahil
✅ 390px/dark: gol eşitliğinde istatistik maç sayısı kuralı korunur
✅ 390px/dark: uzun oyuncu adı ayrıntıda kesilmeden sarılır
✅ 390px/dark: tam liste kaydırılabilir | {"client":712,"scroll":2851}
✅ 390px/dark: son kayıt ve kapatma dar ekranda erişilebilir
✅ 390px/dark: pencere ekran genişliğine sığar
✅ 390px/dark: Tab odağı pencere içinde tutar
✅ 390px/dark: Escape kapatır ve odak açan düğmeye döner
✅ 390px/dark: kapat düğmesi yeniden açılan pencereyi kapatır
✅ 390px/dark: 🎯 Asist Kralı tam ve doğru sırada | 52/52
✅ 390px/dark: ⭐ Maç Puanı (min. 3 maç) tam ve doğru sırada | 50/50
✅ 390px/dark: iki maçlık oyuncu reyting sıralamasına girmez
✅ 390px/dark: 🧤 Gol Yememe (Kaleciler) kayıtları açılır
✅ 390px/dark: 🧤 Kurtarış Yüzdesi (Kaleciler) kayıtları açılır
✅ 390px/dark: karakter listesi önizlemesi 5 kayıt
✅ 390px/dark: 🔥 En Hırçınlar tam ve doğru sırada | 35/35
✅ 390px/dark: 🕊️ Centilmenler (0 kart, min. 5 maç) tam ve doğru sırada | 17/17
✅ 390px/dark: ödüller sekmesi çalışmaya devam eder
✅ 390px/dark: ⚖️ xPTS Adalet Tablosu tam ve doğru sırada | 12/12
✅ 390px/dark: 🕊️ Fair Play Ligi tam ve doğru sırada | 9/9
✅ 390px/dark: sakatlık önizlemesinde sadece 5 oyuncu
✅ 390px/dark: analiz kartları kırpılmadan kaydırılır
✅ 390px/dark: Sakatlık geçmişi (maçtan çıkışlar) tam ve doğru sırada | 8/8
✅ 390px/dark: hakem önizlemesinde sadece 6 profil
✅ 390px/dark: 📋 Hakem Profilleri tam ve doğru sırada | 8/8
✅ 390px/dark: maç özeti penceresi hâlâ açılıp kapanır
✅ 390px/dark: analizden sonra krallıklara dönülür
✅ 390px/dark: lig gol önizlemesi ilk 8 kayıt
✅ 390px/dark: ekran güncellendiğinde açık lig listesi kapanmaz
✅ 390px/dark: Gol Krallığı (sezon) tam ve doğru sırada
✅ 390px/dark: lig ayrıntısında uzun oyuncu adı kesilmez
✅ 390px/dark: lig gol eşitliğinde önceki sıra korunur
✅ 390px/dark: Asist Krallığı (sezon) tam ve doğru sırada | 40/40
✅ 390px/dark: lig reytingi 3 maç eşiğini ve tüm sıralamayı korur
✅ 390px/dark: lig değişimi yalnız seçilen ligdeki oyuncuları gösterir
✅ 390px/dark: veri olmayan ligde uydurma sıralama yok
✅ 390px/dark: uluslararası gol önizlemesi ilk 8 kayıt
✅ 390px/dark: Uluslararası gol krallığı tam ve doğru sırada | 12/12
✅ 390px/dark: uluslararası kupa değişiminde diğer listenin verileri taşınmaz
✅ 390px/dark: önceki kupaya dönünce golcüler geri gelir
✅ 390px/dark: sayfa yatay taşmıyor
✅ 390px/dark: sıralamaları açmak oyun kaydını değiştirmez
✅ 390px/dark: yüzlerce kayıt için sıralama sınırı uygulanmaz
✅ 390px/dark: yüzlerce kaydın sonuna kaydırılabilir
✅ 390px/dark: kalabalık ligde portreli tüm oyuncular gösterilir
✅ 390px/dark: kalabalık lig listesinin sonuna kaydırılabilir
✅ 390px/dark: gerçek maç motoru sıralamaya kayıt üretir
✅ 390px/dark: ⚽ Gol Kralı tam ve doğru sırada | 2/2
✅ 390px/dark: az veride tüm kayıtlar önizlemede
✅ 390px/dark: ⚽ Gol Kralı tam ve doğru sırada | 2/2
✅ 390px/dark: eski xG kaynağında arşiv sınırı açıklanır
✅ 390px/dark: eski raporda sakatlık ve hakem uydurulmaz
✅ 390px/dark: empty kayıtla krallıklar dürüst boş durum
✅ 390px/dark: empty analizde boş durum ve düğmesiz listeler
✅ 390px/dark: empty lig krallıklarında veri uydurulmaz
✅ 390px/dark: legacy kayıtla krallıklar dürüst boş durum
✅ 390px/dark: legacy analizde boş durum ve düğmesiz listeler
✅ 390px/dark: legacy lig krallıklarında veri uydurulmaz
✅ 390px/dark: yakalanmamış tarayıcı hatası yok

RANKING-BROWSER: 124/124
```
## 76. Full tactical roster, league names and ratings E2E (320px and 390px)
Exit: 0

```text
✅ 320px/light: 24 kişiden ilk 11 dışında kalan 13 oyuncu eksiksiz
✅ 320px/light: gerçek maç kadrosu en fazla 9 yedek ve ilk 11 ile ayrık
✅ 320px/light: görünür sayaç ve maç kadrosu sınırı anlaşılır
✅ 320px/light: tam liste 13 oyuncuyu tekrarsız ve tam adlarıyla gösterir
✅ 320px/light: son oyuncu kaydırılarak ve kapatma düğmesi dokunarak erişilir
✅ 320px/light: tam liste klavye odağını içeride tutar
✅ 320px/light: Escape kapatır ve odağı tümünü gör düğmesine döndürür
✅ 320px/light: son sıradaki oyuncu önce seçilebilir ve liste kapanır
✅ 320px/light: seçilen yedeğe uyumlu saha hedefi gösterilir
✅ 320px/light: seçilen oyuncu gerçek maçın ilk 11'ine girer ve kaydedilir
✅ 320px/light: çıkan oyuncu listeye döner, kayıp veya mükerrer yok
✅ 320px/light: mevki dışı seçimde açıklama ve ikinci onay istenir
✅ 320px/light: ikinci dokunuşla saha-önce akışı ve benzersiz ilk 11 çalışır
✅ 320px/light: saha-önce uyumlu oyuncu tek dokunuşla gerçek ilk 11'e girer
✅ 320px/light: formasyon değişince tüm oyuncular erişilebilir kalır
✅ 320px/light: altı müsabaka sekmesi üst üste binmez ve dokunulabilir
✅ 320px/light: Geçit Ulusal sırası, tam kulüp adı ve kısaltması doğru
✅ 320px/light: Geçit Ulusal adları ve istatistik satırları kırpılmadan sığar
✅ 320px/light: Geçit Ulusal O/G/B/M/AV, puan ve form verisi korunur
✅ 320px/light: Miras Zirve sırası, tam kulüp adı ve kısaltması doğru
✅ 320px/light: Miras Zirve adları ve istatistik satırları kırpılmadan sığar
✅ 320px/light: Miras Zirve O/G/B/M/AV, puan ve form verisi korunur
✅ 320px/light: Kök Bölge sırası, tam kulüp adı ve kısaltması doğru
✅ 320px/light: Kök Bölge adları ve istatistik satırları kırpılmadan sığar
✅ 320px/light: Kök Bölge O/G/B/M/AV, puan ve form verisi korunur
✅ 320px/light: sayfa yatay taşma oluşturmuyor
✅ 320px/light: eski/çift/satılmış kimlikler gerçek motor 11'iyle düzeltilir
✅ 320px/light: eski kayıttaki çift oyuncu taktik listesinde ve maç yedeğinde tekrarlanmaz
✅ 320px/light: sakat oyuncu görülür ama onaysız oynatılamaz
✅ 320px/light: cezalı oyuncu görülür ama oynatılamaz
✅ 320px/light: iğne onayı olan sakat oyuncu açıkça işaretlenir
✅ 320px/light: iğne onaylı oyuncu gerçek maçın ilk 11'ine alınabilir
✅ 320px/light: 12 toplam ama 2 puanlı maç, min 3 reyting sıralamasına girmez
✅ 320px/light: oyuncu profilinde 12 maç ve doğru 7.0 ortalama gösterilir
✅ 320px/light: üçüncü puanlı maç reyting sıralamasını açar ve 7 gösterir
✅ 320px/light: lig reytingi yalnız puanlı maçlardan 7.0 hesaplanır
✅ 320px/light: tarayıcıda çalışma zamanı hatası yok
✅ 320px/dark: 24 kişiden ilk 11 dışında kalan 13 oyuncu eksiksiz
✅ 320px/dark: gerçek maç kadrosu en fazla 9 yedek ve ilk 11 ile ayrık
✅ 320px/dark: görünür sayaç ve maç kadrosu sınırı anlaşılır
✅ 320px/dark: tam liste 13 oyuncuyu tekrarsız ve tam adlarıyla gösterir
✅ 320px/dark: son oyuncu kaydırılarak ve kapatma düğmesi dokunarak erişilir
✅ 320px/dark: tam liste klavye odağını içeride tutar
✅ 320px/dark: Escape kapatır ve odağı tümünü gör düğmesine döndürür
✅ 320px/dark: son sıradaki oyuncu önce seçilebilir ve liste kapanır
✅ 320px/dark: seçilen yedeğe uyumlu saha hedefi gösterilir
✅ 320px/dark: seçilen oyuncu gerçek maçın ilk 11'ine girer ve kaydedilir
✅ 320px/dark: çıkan oyuncu listeye döner, kayıp veya mükerrer yok
✅ 320px/dark: mevki dışı seçimde açıklama ve ikinci onay istenir
✅ 320px/dark: ikinci dokunuşla saha-önce akışı ve benzersiz ilk 11 çalışır
✅ 320px/dark: saha-önce uyumlu oyuncu tek dokunuşla gerçek ilk 11'e girer
✅ 320px/dark: formasyon değişince tüm oyuncular erişilebilir kalır
✅ 320px/dark: altı müsabaka sekmesi üst üste binmez ve dokunulabilir
✅ 320px/dark: Geçit Ulusal sırası, tam kulüp adı ve kısaltması doğru
✅ 320px/dark: Geçit Ulusal adları ve istatistik satırları kırpılmadan sığar
✅ 320px/dark: Geçit Ulusal O/G/B/M/AV, puan ve form verisi korunur
✅ 320px/dark: Miras Zirve sırası, tam kulüp adı ve kısaltması doğru
✅ 320px/dark: Miras Zirve adları ve istatistik satırları kırpılmadan sığar
✅ 320px/dark: Miras Zirve O/G/B/M/AV, puan ve form verisi korunur
✅ 320px/dark: Kök Bölge sırası, tam kulüp adı ve kısaltması doğru
✅ 320px/dark: Kök Bölge adları ve istatistik satırları kırpılmadan sığar
✅ 320px/dark: Kök Bölge O/G/B/M/AV, puan ve form verisi korunur
✅ 320px/dark: sayfa yatay taşma oluşturmuyor
✅ 320px/dark: eski/çift/satılmış kimlikler gerçek motor 11'iyle düzeltilir
✅ 320px/dark: eski kayıttaki çift oyuncu taktik listesinde ve maç yedeğinde tekrarlanmaz
✅ 320px/dark: sakat oyuncu görülür ama onaysız oynatılamaz
✅ 320px/dark: cezalı oyuncu görülür ama oynatılamaz
✅ 320px/dark: iğne onayı olan sakat oyuncu açıkça işaretlenir
✅ 320px/dark: iğne onaylı oyuncu gerçek maçın ilk 11'ine alınabilir
✅ 320px/dark: 12 toplam ama 2 puanlı maç, min 3 reyting sıralamasına girmez
✅ 320px/dark: oyuncu profilinde 12 maç ve doğru 7.0 ortalama gösterilir
✅ 320px/dark: üçüncü puanlı maç reyting sıralamasını açar ve 7 gösterir
✅ 320px/dark: lig reytingi yalnız puanlı maçlardan 7.0 hesaplanır
✅ 320px/dark: tarayıcıda çalışma zamanı hatası yok
✅ 390px/light: 24 kişiden ilk 11 dışında kalan 13 oyuncu eksiksiz
✅ 390px/light: gerçek maç kadrosu en fazla 9 yedek ve ilk 11 ile ayrık
✅ 390px/light: görünür sayaç ve maç kadrosu sınırı anlaşılır
✅ 390px/light: tam liste 13 oyuncuyu tekrarsız ve tam adlarıyla gösterir
✅ 390px/light: son oyuncu kaydırılarak ve kapatma düğmesi dokunarak erişilir
✅ 390px/light: tam liste klavye odağını içeride tutar
✅ 390px/light: Escape kapatır ve odağı tümünü gör düğmesine döndürür
✅ 390px/light: son sıradaki oyuncu önce seçilebilir ve liste kapanır
✅ 390px/light: seçilen yedeğe uyumlu saha hedefi gösterilir
✅ 390px/light: seçilen oyuncu gerçek maçın ilk 11'ine girer ve kaydedilir
✅ 390px/light: çıkan oyuncu listeye döner, kayıp veya mükerrer yok
✅ 390px/light: mevki dışı seçimde açıklama ve ikinci onay istenir
✅ 390px/light: ikinci dokunuşla saha-önce akışı ve benzersiz ilk 11 çalışır
✅ 390px/light: saha-önce uyumlu oyuncu tek dokunuşla gerçek ilk 11'e girer
✅ 390px/light: formasyon değişince tüm oyuncular erişilebilir kalır
✅ 390px/light: altı müsabaka sekmesi üst üste binmez ve dokunulabilir
✅ 390px/light: Geçit Ulusal sırası, tam kulüp adı ve kısaltması doğru
✅ 390px/light: Geçit Ulusal adları ve istatistik satırları kırpılmadan sığar
✅ 390px/light: Geçit Ulusal O/G/B/M/AV, puan ve form verisi korunur
✅ 390px/light: Miras Zirve sırası, tam kulüp adı ve kısaltması doğru
✅ 390px/light: Miras Zirve adları ve istatistik satırları kırpılmadan sığar
✅ 390px/light: Miras Zirve O/G/B/M/AV, puan ve form verisi korunur
✅ 390px/light: Kök Bölge sırası, tam kulüp adı ve kısaltması doğru
✅ 390px/light: Kök Bölge adları ve istatistik satırları kırpılmadan sığar
✅ 390px/light: Kök Bölge O/G/B/M/AV, puan ve form verisi korunur
✅ 390px/light: sayfa yatay taşma oluşturmuyor
✅ 390px/light: eski/çift/satılmış kimlikler gerçek motor 11'iyle düzeltilir
✅ 390px/light: eski kayıttaki çift oyuncu taktik listesinde ve maç yedeğinde tekrarlanmaz
✅ 390px/light: sakat oyuncu görülür ama onaysız oynatılamaz
✅ 390px/light: cezalı oyuncu görülür ama oynatılamaz
✅ 390px/light: iğne onayı olan sakat oyuncu açıkça işaretlenir
✅ 390px/light: iğne onaylı oyuncu gerçek maçın ilk 11'ine alınabilir
✅ 390px/light: 12 toplam ama 2 puanlı maç, min 3 reyting sıralamasına girmez
✅ 390px/light: oyuncu profilinde 12 maç ve doğru 7.0 ortalama gösterilir
✅ 390px/light: üçüncü puanlı maç reyting sıralamasını açar ve 7 gösterir
✅ 390px/light: lig reytingi yalnız puanlı maçlardan 7.0 hesaplanır
✅ 390px/light: tarayıcıda çalışma zamanı hatası yok
✅ 390px/dark: 24 kişiden ilk 11 dışında kalan 13 oyuncu eksiksiz
✅ 390px/dark: gerçek maç kadrosu en fazla 9 yedek ve ilk 11 ile ayrık
✅ 390px/dark: görünür sayaç ve maç kadrosu sınırı anlaşılır
✅ 390px/dark: tam liste 13 oyuncuyu tekrarsız ve tam adlarıyla gösterir
✅ 390px/dark: son oyuncu kaydırılarak ve kapatma düğmesi dokunarak erişilir
✅ 390px/dark: tam liste klavye odağını içeride tutar
✅ 390px/dark: Escape kapatır ve odağı tümünü gör düğmesine döndürür
✅ 390px/dark: son sıradaki oyuncu önce seçilebilir ve liste kapanır
✅ 390px/dark: seçilen yedeğe uyumlu saha hedefi gösterilir
✅ 390px/dark: seçilen oyuncu gerçek maçın ilk 11'ine girer ve kaydedilir
✅ 390px/dark: çıkan oyuncu listeye döner, kayıp veya mükerrer yok
✅ 390px/dark: mevki dışı seçimde açıklama ve ikinci onay istenir
✅ 390px/dark: ikinci dokunuşla saha-önce akışı ve benzersiz ilk 11 çalışır
✅ 390px/dark: saha-önce uyumlu oyuncu tek dokunuşla gerçek ilk 11'e girer
✅ 390px/dark: formasyon değişince tüm oyuncular erişilebilir kalır
✅ 390px/dark: altı müsabaka sekmesi üst üste binmez ve dokunulabilir
✅ 390px/dark: Geçit Ulusal sırası, tam kulüp adı ve kısaltması doğru
✅ 390px/dark: Geçit Ulusal adları ve istatistik satırları kırpılmadan sığar
✅ 390px/dark: Geçit Ulusal O/G/B/M/AV, puan ve form verisi korunur
✅ 390px/dark: Miras Zirve sırası, tam kulüp adı ve kısaltması doğru
✅ 390px/dark: Miras Zirve adları ve istatistik satırları kırpılmadan sığar
✅ 390px/dark: Miras Zirve O/G/B/M/AV, puan ve form verisi korunur
✅ 390px/dark: Kök Bölge sırası, tam kulüp adı ve kısaltması doğru
✅ 390px/dark: Kök Bölge adları ve istatistik satırları kırpılmadan sığar
✅ 390px/dark: Kök Bölge O/G/B/M/AV, puan ve form verisi korunur
✅ 390px/dark: sayfa yatay taşma oluşturmuyor
✅ 390px/dark: eski/çift/satılmış kimlikler gerçek motor 11'iyle düzeltilir
✅ 390px/dark: eski kayıttaki çift oyuncu taktik listesinde ve maç yedeğinde tekrarlanmaz
✅ 390px/dark: sakat oyuncu görülür ama onaysız oynatılamaz
✅ 390px/dark: cezalı oyuncu görülür ama oynatılamaz
✅ 390px/dark: iğne onayı olan sakat oyuncu açıkça işaretlenir
✅ 390px/dark: iğne onaylı oyuncu gerçek maçın ilk 11'ine alınabilir
✅ 390px/dark: 12 toplam ama 2 puanlı maç, min 3 reyting sıralamasına girmez
✅ 390px/dark: oyuncu profilinde 12 maç ve doğru 7.0 ortalama gösterilir
✅ 390px/dark: üçüncü puanlı maç reyting sıralamasını açar ve 7 gösterir
✅ 390px/dark: lig reytingi yalnız puanlı maçlardan 7.0 hesaplanır
✅ 390px/dark: tarayıcıda çalışma zamanı hatası yok

148/148 kadro/lig Chromium kontrolü geçti.
```
## 77. Save-slot delete flow E2E
Exit: 0

```text
✅ kariyer kuruldu
✅ splash hızlı devam rozeti var (silmeden önce)
✅ yuva kartı dolu görünüyor
✅ eski sabit etiket yerine kayıtlı 3. sezon gösteriliyor
✅ yuvaları görüntülemek eski kaydı yeniden yazmaz
✅ ⋯ menüsü Sheet açar (oyuna kaçmaz) — balonlanma fixi | exportVisible=2
✅ kart üzerinde görünür 🗑 butonu
✅ iki aşamalı onay sheeti
✅ yuva boşaldı
✅ silinen aktif yuvanın hızlı-devam hayaleti yok

SONUÇ: YUVA SİLME TAMAM
```
## 78. Backup, storage failure, legacy migration and stale-tab E2E (390px)
Exit: 0

```text
✅ Yeni kariyer gerçek IndexedDB yuvasına kaydedildi
✅ Kadrodan satış listesine ekleme ve haber elle kaydetmeden saklanır
✅ Satış listesinden çıkarma da elle kaydetmeden saklanır
✅ Aynı oyuncu tekrar listeye alınca yinelenen haber oluşmaz
✅ Yönetim ek bütçenin tutarını ve koşullarını önceden açıklar
✅ Sezon başındaki koşulsuz talep gerekçeyle reddedilir ve bütçeyi değiştirmez
✅ Ret sonrası tekrar talep engellenir ve mali kayıt kimliğiyle çakışmaz
✅ Transferden maaşa aktarım ve yönetim haberi birlikte otomatik kaydedilir
✅ Ayar değişikliği elle kaydetmeden otomatik kaydedilir
✅ Depolama hatası başarısızlık olarak gösterilir, sahte başarı yok
✅ Yazma başarısızsa cihazdaki eski kayıt değişmez
✅ Depolama hatasında indirilen yedek eski değil, güncel bellek durumudur
✅ Yedek indirilse de cihaz kaydının başarısız olduğu açıkça söylenir
✅ Depolama düzelince yeniden deneme güncel durumu kaydeder
✅ İkinci sekme aynı kariyeri açtı
✅ Eksik yedek yazılmadan reddedilir
✅ Yedeği iptal etmek mevcut kaydı değiştirmez
✅ Aktif yuvayı değiştirmeden önce açık onay istenir
✅ İçe aktarım sonrası eski sayfanın pagehide kaydı yedeği ezmez
✅ Diğer eski sekmenin kaydı çakışmayı algılar ve yedeği ezmez
✅ Yüklenen kariyer yeniden açılabilir | manager=Yedek Menajer
✅ Boş görünen yuva başka sekmede dolmuşsa dosya üzerine yazmaz
✅ Eski manager26-save v1 boş yuvaya v4 göçüyle yüklenir
✅ Sezon alanları eksik eski kariyer de gerçek tarayıcıda açılır
✅ Önceki yayımlanmış uygulamadan gerçek v2 yedeği içe aktarılır
✅ Gerçek v2 kariyeri açılır, gün ilerler ve tekrar kaydedilir
✅ Tarayıcıda yakalanmamış uygulama hatası yok

27/27 gerçek tarayıcı kayıt kontrolü geçti.
```
## 79. Backup, storage failure, legacy migration and stale-tab E2E (320px)
Exit: 0

```text
✅ Yeni kariyer gerçek IndexedDB yuvasına kaydedildi
✅ Kadrodan satış listesine ekleme ve haber elle kaydetmeden saklanır
✅ Satış listesinden çıkarma da elle kaydetmeden saklanır
✅ Aynı oyuncu tekrar listeye alınca yinelenen haber oluşmaz
✅ Yönetim ek bütçenin tutarını ve koşullarını önceden açıklar
✅ Sezon başındaki koşulsuz talep gerekçeyle reddedilir ve bütçeyi değiştirmez
✅ Ret sonrası tekrar talep engellenir ve mali kayıt kimliğiyle çakışmaz
✅ Transferden maaşa aktarım ve yönetim haberi birlikte otomatik kaydedilir
✅ Ayar değişikliği elle kaydetmeden otomatik kaydedilir
✅ Depolama hatası başarısızlık olarak gösterilir, sahte başarı yok
✅ Yazma başarısızsa cihazdaki eski kayıt değişmez
✅ Depolama hatasında indirilen yedek eski değil, güncel bellek durumudur
✅ Yedek indirilse de cihaz kaydının başarısız olduğu açıkça söylenir
✅ Depolama düzelince yeniden deneme güncel durumu kaydeder
✅ İkinci sekme aynı kariyeri açtı
✅ Eksik yedek yazılmadan reddedilir
✅ Yedeği iptal etmek mevcut kaydı değiştirmez
✅ Aktif yuvayı değiştirmeden önce açık onay istenir
✅ İçe aktarım sonrası eski sayfanın pagehide kaydı yedeği ezmez
✅ Diğer eski sekmenin kaydı çakışmayı algılar ve yedeği ezmez
✅ Yüklenen kariyer yeniden açılabilir | manager=Yedek Menajer
✅ Boş görünen yuva başka sekmede dolmuşsa dosya üzerine yazmaz
✅ Eski manager26-save v1 boş yuvaya v4 göçüyle yüklenir
✅ Sezon alanları eksik eski kariyer de gerçek tarayıcıda açılır
✅ Önceki yayımlanmış uygulamadan gerçek v2 yedeği içe aktarılır
✅ Gerçek v2 kariyeri açılır, gün ilerler ve tekrar kaydedilir
✅ Tarayıcıda yakalanmamış uygulama hatası yok

27/27 gerçek tarayıcı kayıt kontrolü geçti.
```
## 80. Board budget approval and reload on migrated career E2E (390px)
Exit: 0

```text
✅ İlk sürümden v2 kariyer koşullar korunarak içe aktarılır
✅ Eski sabit yanıt onay için yeni talebi engellemez
✅ Önerilen tutar ve değerlendirme görünür
✅ 390px ekranda yatay taşma yok | 390/390
✅ Gerçek onay bütçeye ₺1,2M ekler ve otomatik kaydeder
✅ Çift tıklamada tek onay haberi oluşur ve sezon kilidi gösterilir
✅ Gelen kutusundaki yönetim cevabı gerçek tutarı ve yeni bakiyeyi açıklar
✅ Sayfa yenilenince bakiye ve sezonluk tekrar engeli korunur
✅ Tarayıcıda yakalanmamış uygulama hatası yok

9/9 yönetim bütçesi tarayıcı kontrolü geçti (390px).
```
## 81. Board budget approval and reload on migrated career E2E (320px)
Exit: 0

```text
✅ İlk sürümden v2 kariyer koşullar korunarak içe aktarılır
✅ Eski sabit yanıt onay için yeni talebi engellemez
✅ Önerilen tutar ve değerlendirme görünür
✅ 320px ekranda yatay taşma yok | 320/320
✅ Gerçek onay bütçeye ₺1,2M ekler ve otomatik kaydeder
✅ Çift tıklamada tek onay haberi oluşur ve sezon kilidi gösterilir
✅ Gelen kutusundaki yönetim cevabı gerçek tutarı ve yeni bakiyeyi açıklar
✅ Sayfa yenilenince bakiye ve sezonluk tekrar engeli korunur
✅ Tarayıcıda yakalanmamış uygulama hatası yok

9/9 yönetim bütçesi tarayıcı kontrolü geçti (320px).
```
## 82. Service-worker two-release and offline isolation E2E
Exit: 0

```text
✅ A sürümü kurulup sayfayı kontrol eder
✅ İkinci sekme A sürümünü açar
✅ Bekleyen B ayrı cache kullanır; sabit URL içeriği A/B olarak korunur | {"keys":["other-product-cache","hm26-v015-aaaaaaaaaaaaaaaa","hm26-v015-bbbbbbbbbbbbbbbb"],"a":"/* A */","b":"/* B */"}
✅ Onay verilmeden çevrimiçiyken yeniden açılış A kabuğunda kalır
✅ Onay verilmeden çevrimdışıyken A kabuğu ve varlıkları korunur
✅ Kullanıcı onayıyla B sürümü açılır
✅ Başka açık eski sekmenin hash’li eski kodu korunur
✅ Başka uygulamanın cache’i silinmez
✅ Onaydan sonra B çevrimdışı da açılır
✅ Eksik dosyalı C kurulumu başarısız olsa da B çevrimdışı bozulmaz
✅ Başarısız kurulumun yarım cache’i temizlenir

11/11 service-worker tarayıcı kontrolü geçti.
```
## 83. Save-before-update and multi-tab game update E2E
Exit: 0

```text
✅ A worker kontrolünde gerçek kariyer oluşturuldu
✅ Yeni sürüm kullanıcı onayı için oyun içinde bekler
✅ Kaydetme hatasında güncelleme ve yeniden açılış durdurulur
✅ Güncelleme öncesi maçın baştan oynanacağı bildirilir
✅ Başarılı güncelleme en son kariyer ayarını kaydedip yeniden açar
✅ B sürümü etkinleşir ve bekleyen worker kalmaz
✅ Başka açık sekme kendiliğinden yenilenmez; sürüm uyarısı görür
✅ Bayat sekme çakışmada yenilenip ilerlemesini sessizce kaybetmez
✅ Güncelleme akışında yakalanmamış tarayıcı hatası yok

9/9 aktif oyun güncelleme kontrolü geçti.
```
## 84. Full profile → starting XI E2E
Exit: 0

```text
✅ T1 tam profil açık (Kariyer Dökümü kartı görünür)
✅ T2 tam profil düğmesi → yuva atama akışı başladı (şerit + uyumlu yuva parlatması) | şerit=true yeşilYuvalar=3
✅ T3 yuvaya dokun → dizilim güncellendi (Manuel dizilim)
✅ T4 11/11 yuva düğmesi dokunma hedefi ≥44×44 | yuva=11 küçük=0

4 test, 0 başarısız
```
## 85. Out-of-position warning E2E
Exit: 0

```text
✅ Kariyer kuruldu (hub açıldı)
   nav sonrası url= http://localhost:4173/#squad — OYUNCU metni: 0 hub-mi: 0
✅ G1 hızlı profil → İlk 11'e Al → taktik atama akışı | url=http://localhost:4173/#tactics
   diyalog sayısı: 1
   modal-içi İlk 11 butonu: 1
   buton rect: {"x":16,"y":732,"width":175,"height":44} — kapatıcı: BUTTON|min-h-touch px-4 rounded-xl font-bold text-sm flex items-center justif
✅ G1 (ANA) tam profil → İlk 11'e Al → kadro atama akışı açıldı | url=http://localhost:4173/#tactics
✅ G1 atama tamamlanınca banner kapanır
   yuva sayısı: 11
   slot-0 aria-pressed: true
✅ G2a uyumsuz yedek → ilk dokun açıklama uyarısı (henüz atama yok) | aday=9, role=alert sayısı=1
✅ G2 mevki dışı oyuncunun (GK yuvasındaki saha oyuncusu) yuvasında turuncu uyarı | gk-oop=1, toplam uyarı=2, kulübe seçimi=9
✅ G2b üçgenli yuvaya dokun → neden açıklaması (güç cezası %) | alert sayısı=1
✅ G2c atama modunda uyumsuz yuva → açıklama şeridi (ilk dokun) | alert=1
✅ G2d ikinci dokun → atama uygulandı + üçgen uyarı

SONUÇ: TÜM GEREKSİNİMLER GEÇTİ
```
## 86. Bench-first tactical flow E2E
Exit: 0

```text
✅ G1 11/11 saha yuvası tıklanabilir düğme | bulunan=11
✅ G2 tüm ilk 11 dışı oyuncular tekrarsız ve tıklanabilir | bulunan=11/11 disabled=0
✅ G3 yedeğe dokun → seçim + yuva-parlatma ipucu | picked=1 hint=true
✅ G4 yuva dokun → yedek sahada (Manuel dizilim), seçim sıfırlandı | banner=1 manuel=true cleared=true
✅ G5 yuva→yuva takas regresyonu (hala manuel dizilim modunda)

5 test, 0 başarısız
```
## 87. Medical/mentoring/trade E2E
Exit: 0

```text
✅ F1 Sağlık & Rehberlik kartı tam profilde
✅ F2 Ağabeylik ataması + toast
✅ F3 Oyuncu + nakit takası paneli
✅ F4 Takas oyuncusu seçilince değer ve toplam teklif görünür

0 BAŞARISIZ · 0 uyarı (atlananlar ⚟)
```
## 88. Transfer theatre, signing and offline media E2E
Exit: 0

```text
✅ Piyasa kartından hareketli transfer masası açıldı
✅ 390 px mobil ekranda yatay taşma yok ve sahne görünür | {"width":390,"scrollWidth":390,"stage":350}
✅ Seçilen konuşma gerçek tarayıcıda altyazıya yansıyor
✅ Mobilde sahne ekran dışındayken gerçek konuşmacı seçimleri oynatmadan görünür | {"speaker":"manager","sceneSpeaker":"manager","mainActors":1,"cueTop":136.09375,"cueBottom":194.09375,"sceneBottom":-96.15625,"scrollTop":132.09375,"scrollBottom":844,"scrollY":478}
✅ Konuşmayı atla hareketi durdurur, altyazı ve seçilen cevap kalır
✅ Türkçe ses dosyası yerel kaynaktan yükleniyor | {"audio":"http://localhost:4173/assets/transfer/voice/manager-calm-4.mp3","codec":"probably","settings":null,"requests":["http://localhost:4173/assets/transfer/voice/manager-calm-4.mp3"]}
✅ Oyuncu yanıtı yalnız oyuncunun yüzünü konuşturur
✅ İmza öncesi şartlar ekranda ve onay kullanıcıda
✅ Tekrarlı tıklama sonrası imza ve basın tanıtımı
✅ Tanıtım anonsu kullanıcı tıklamasıyla metinli oynatılır
✅ Sistem azaltılmış hareket tercihi karakter animasyonlarını kapatıyor | none
✅ Oyun içi azaltılmış hareket tercihi karakter animasyonlarını kapatıyor | none
✅ Tanıtımdan sonra piyasada kal seçeneği çalışıyor
✅ İmzadan sonra kariyer IndexedDB kaydı mevcut | {"transfers":1,"version":4}
Seçilen aday: Cemal Mense Serbest · Kanat · 33 yaş Yerli oyuncu ⚑ Serbest statüden anında katılabilir 59 GEN POT 5
✅ 85 GEN bedelsiz oyuncu gerçek tarayıcıda özel yıldız stadyumuna çıkar
✅ 320 px dar mobil ekranda yıldız sahnesi kırpılmadan çizilir | {"width":320,"scrollWidth":320,"scene":280,"left":20,"right":300}
✅ 320 px ekranda sunucu bildirimi kesilmeden ve doğru konuşmacıyla görünür | {"left":20,"right":300,"speaker":"announcer"}
✅ Üretim servis çalışanı etkin | {"active":true,"caches":["hm26-v015-1a5370106867004b"]}
✅ Üç sahne ve 40 ses çevrimdışı önbellekten açılıyor | 43/43
✅ 40 MP3 çevrimdışıyken tarayıcı tarafından çözümleniyor | 40/40
✅ Yıldız anonsu çevrimdışıyken altyazıyla çalışıyor
✅ Tarayıcıda yakalanmamış uygulama hatası yok

TRANSFER-SCENE-BROWSER: 22/22
```
## 89. Market potential, rotation and sale negotiation E2E
Exit: 0

```text
✅ 320 px fırsat kartlarının tümünde potansiyel var | {"count":8,"complete":true}
✅ Kısa liste klavyeyle açılır ve odak kaybolmaz
✅ Arama listesindeki bütün oyuncularda POT görünür | {"count":34,"complete":true}
✅ Kanat bek filtresi yalnız doğru mevkiyi gösterir
✅ Sonuç bulunmazsa açıklayıcı boş durum var
✅ Filtreleri temizle oyuncuları geri getirir
✅ Kısa listede de potansiyel görünür
✅ 320 px piyasada yatay taşma yok | {"width":320,"scrollWidth":320}
✅ Rotasyon masası başlangıçta kapalı
✅ Rotasyon masası klavyeyle açılır
✅ Rotasyon masası klavyeyle tekrar kapanır
✅ 320 px kadro ekranında yatay taşma yok | {"width":320,"scrollWidth":320}
✅ Sözleşme bölümünde kadrodaki oyuncuların POT değerleri görünür
✅ 320 px sözleşme kartlarında yatay taşma yok | {"width":320,"scrollWidth":320}
✅ Gelen teklif kartında da oyuncunun GEN ve POT değerleri görünür
✅ Gelen satış teklifi hareketli alıcı görüşmesini açar
✅ 320 px satış sahnesi diyalog içine sığar | {"width":320,"scrollWidth":320,"sceneLeft":20,"sceneRight":300,"sceneWidth":280,"dialogLeft":0,"dialogRight":320}
✅ Cevap seçmeden satış ilerlemez
✅ Menajerin cevabı seçilir ve konuşma altyazıya yansır
✅ Satış görüşmesindeki Türkçe ses yerel kaynaktan istenir | http://localhost:4173/assets/transfer/voice/manager-calm-1.mp3
✅ Alıcı yanıtında oyuncunun henüz satılmadığı açıkça belirtilir
✅ Son onayda brüt, önceki pay ve net bütçe gösterilir
✅ Son onaya kadar oyuncu ve bütçe değişmez
✅ Vazgeçme teklifi kapatmadan görüşmeden çıkarır
✅ Karşı teklif kabulünde de son onay beklenir
✅ 85 GEN satışında özel yıldız tanıtımı ve alıcı kulüp gösterilir
✅ Tamamlanan satış net giren tutarı geçmiş zamanda gösterir
✅ 390 px yıldız tanıtımında yatay taşma yok | {"width":390,"scrollWidth":390}
✅ Yıldız tanıtımı anonsu kullanıcı tıklamasıyla başlar
✅ Çift tıklamada satış bir kez kaydedilir; net bütçe ve pay doğrudur
✅ Gerçek maç canlı akışı başlama olayını gösterir
✅ Kaydedilmemiş maçtan menüyle çıkışta uyarı gösterilir; iptal maçı korur
✅ Tarayıcı geri tuşunda da iptal edilen maç korunur
✅ Kaydedilmemiş maçta sayfayı kapatma koruması etkin
✅ Çıkışı onaylayan kullanıcı merkeze döner ve maçı yeniden başlatabilir
✅ Maç bittiğinde ekran otomatik geçmez, kullanıcıyı bekler
✅ Canlı maç raporunda özet kullanıcı açana kadar başlamaz
✅ Canlı maçın gerçek olayları duraklatılmış görsel özette açılır
✅ Özet kendi kendine sonuç kaydetmez
✅ Özet kapanınca canlı maçın manuel sonuç raporu korunur
✅ Maç raporunda motorun gerçek olayları ve başlama düdüğü görünür | olay=61
✅ 320 px maç raporunda yatay taşma yok | {"width":320,"scrollWidth":320}
✅ Raporun iki kayıt düğmesi alt menünün üstünde ve dokunulabilir | {"footerBottom":661,"navTop":661,"buttons":[{"top":545,"bottom":595,"height":50},{"top":603,"bottom":649,"height":46}]}
✅ Önemli anlar filtresi olayları daraltır veya dürüst boş durum gösterir | önemli=9
✅ Oynanan maçın gerçek olayları 4. sürüm arşive kaydedilir
✅ Sonuç kaydedildikten sonra çıkış koruması kapanır
✅ Tarayıcıda yakalanmamış uygulama hatası yok

MARKET-SQUAD-BROWSER: 47 geçti, 0 başarısız
```
## 90. Contract renewal and recorded match highlights E2E
Exit: 0

```text
✅ 320 px yenileme kendi oyuncusuyla hareketli masada açılır
✅ 320 px sözleşme sahnesi panel dışına taşmaz | {"width":320,"scrollWidth":320,"left":20,"right":300,"elementWidth":280,"dialogLeft":0,"dialogRight":320}
✅ Cevap seçilmeden teklif gönderilemez
✅ Maaş teklifi klavyeyle değiştirilebilir
✅ Menajer cevabı seçilir; gerçek replik altyazıda gösterilir
✅ Görüşme yerel Türkçe ses dosyasını ister | {"url":"http://localhost:4173/assets/transfer/voice/manager-calm-4.mp3","status":200}
✅ Düşük teklif reddedilir; karşı beklenti gösterilir
✅ Ret bütçeyi ve sözleşmeyi değiştirmez
✅ Karşı beklenti maaş teklifine taşınır
✅ Kabul ayrı aşamadadır; imza henüz atılmamıştır
✅ Son kontrolde gerçek mali koşullar görünür
✅ 390 px sözleşme sahnesi panel dışına taşmaz | {"width":390,"scrollWidth":390,"left":20,"right":370,"elementWidth":350,"dialogLeft":0,"dialogRight":390}
✅ Çift imza sonrası yenileme tamamlanır, tanıtım sahnesi açılmaz
✅ Gerçek kayıt: yeni ücret ve tek bonus ödemesi
✅ Son fikstürün hızlı sonuç penceresi açık kalır | denizli_yesilova–diyarbakir_surlar
✅ Özet kullanıcı açana kadar oynatılmaz; gerçek olay görünür
✅ 320 px görsel maç özeti panel içine sığar | {"width":320,"scrollWidth":320,"left":20,"right":300,"elementWidth":280,"dialogLeft":0,"dialogRight":320}
✅ Özette birden fazla gerçek olay arasında seçim var | 9 olay
✅ Klavye ile sonraki olay açılır
✅ Geri kontrolü önceki olayı geri getirir
✅ Konum sadece kayıt varsa çizilir; yoksa açıkça belirtilir
✅ Gerçek özet kurtarışında kaleci takımı ve hücum yolu ayrı gösterilir
✅ Azaltılmış hareket tercihi gerçek saha yolu animasyonunu kapatır
✅ Oynat kullanıcı eyleminden sonra sıradaki olaya ilerler
✅ Duraklatılan özet kendi kendine ilerlemez
✅ 390 px görsel maç özeti panel içine sığar | {"width":390,"scrollWidth":390,"left":20,"right":370,"elementWidth":350,"dialogLeft":0,"dialogRight":390}
✅ Gerçek maç sonucu ve sıkıştırılmış olaylar kaydedilir
✅ Lig Analizi gerçek son maç arşivinden özeti açar
✅ Arşiv konum saklamadığı için uydurma yol çizilmez
✅ 390 px arşiv özeti yatay taşmaz | {"width":390,"scrollWidth":390,"left":20,"right":370,"elementWidth":350,"dialogLeft":0,"dialogRight":390}
✅ Arşiv özeti kapatılabilir ve analiz ekranı korunur
✅ Tarayıcıda yakalanmamış uygulama hatası yok

RENEWAL-HIGHLIGHTS-BROWSER: 32 geçti, 0 başarısız
```
## 91. Live reactions, player comparison and weekly paper E2E
Exit: 0

```text
✅ Ana merkez kısayolu gazeteyi doğrudan açar
✅ Yeni kariyerde maçsız/transfer olmayan hafta dürüstçe boş
✅ Basın Odası manşetinden de gazeteye erişilir
✅ Haftalık gazete yalnız gerçek skorları ve bu haftanın transferini gösterir | {"homeId":"denizli_yesilova","awayId":"diyarbakir_surlar","hg":2,"ag":1}
✅ Mükerrer fikstürler gazete sayacında bir kez görünür
✅ Gazetede takım formu kaydedilmiş maçtan çıkar
✅ 320 px gazete yatay taşmaz | {"width":320,"scrollWidth":320,"left":16,"right":304,"elementWidth":288}
✅ 390 px gazete yatay taşmaz | {"width":390,"scrollWidth":390,"left":16,"right":374,"elementWidth":358}
✅ 320 px basın sekmeleri üst üste binmez, yatay kaydırılabilir | {"noOverlap":true,"scrollable":true}
✅ Kaydırılan son basın sekmesi erişilebilir ve açılır
✅ Kadro karşılaştırma masası erişilebilir diyalog olarak açılır
✅ İlk gerçek oyuncu seçilir; aynı oyuncu diğer sütunda seçilemez
✅ Arama ve Enter ile başka kulüpten gerçek ikinci oyuncu seçilir
✅ Yedi ölçüt ve aylık bin TL maaş yan yana görünür
✅ İki oyuncunun tarafı ve alternatif mevkileri yan yana görünür
✅ 320 px karşılaştırma diyaloğu taşmaz | {"width":320,"scrollWidth":320,"left":20,"right":300,"elementWidth":280,"parentLeft":0,"parentRight":320}
✅ 390 px karşılaştırma diyaloğu taşmaz | {"width":390,"scrollWidth":390,"left":20,"right":370,"elementWidth":350,"parentLeft":0,"parentRight":390}
✅ Karşılaştırmada Türkçe mevki adıyla oyuncu aranabilir
✅ Escape karşılaştırmayı kapatır ve kadroya döner
✅ Karşılaştırma bütçeyi, oyuncuları ve kayıt sürümünü değiştirmez
✅ Kadro hızlı profilinden açılan masa seçili oyuncuyu taşır
✅ Piyasa satırından gerçek oyuncu karşılaştırmaya taşınır
✅ Piyasa genel karşılaştırma kısayolu mevcut
✅ Kulübe sahnesinin yerel görseli çevrimdışı önbellekten yüklenir
✅ Kayıt yüklenerek gazete internet olmadan açılır
✅ İnternetsiz karşılaştırmada kayıtlı oyuncu seçilebilir
✅ Deplasman maçında Kulübe & Tribün gerçek sahne olarak açılır
✅ Altı maç konsolu sekmesi ve manuel maç akışı korunur
✅ Koyu maç konsolu simgeleri açık ve koyu temada görünür | {"light":true,"dark":true}
✅ 320 px hareketli kulübe sahnesi taşmaz | {"width":320,"scrollWidth":320,"left":12,"right":308,"elementWidth":296}
✅ Sahnede görünen gerçek yedekler isimleriyle okunabilir
✅ Gerçek oyuncu değişikliği sonrası kulübe isimleri güncellenir
✅ Gerçek motor gol/kurtarış/kart ürettiğinde kulübe ve tribün tepki verir | save · celebrate
✅ Tepki yalnız gerçek olay türü ve metniyle gösterilir
✅ Duraklatma maç saatini ve animasyon sahnesini dondurur | [{"state":"paused","time":100.01499999958163},{"state":"paused","time":100.01499999958163},{"state":"paused","time":100.01499999958163}]
✅ 320 px olay kartını kenar talimatı düğmesi örtmez | {"overlaps":false,"buttonInFooter":true}
✅ Kenar talimatı simgesi koyu zeminde okunaklı | kontrast=9.19
✅ Son tepkiler açılabilir ve gerçek maç olayını korur
✅ Sahnedeki olay aynı gerçek maç günlüğünde bulunur
✅ Duraklatılmış maçta sekmeden dönünce kulübe ve olay korunur
✅ Sistem azaltılmış hareket tercihi sahne animasyonlarını kapatır | animasyon=0
✅ 390 px duraklatılmış sahne taşmaz | {"width":390,"scrollWidth":390,"left":30,"right":360,"elementWidth":330}
✅ 390 px olay kartını kenar talimatı düğmesi örtmez | {"overlaps":false,"buttonInFooter":true}
✅ Devam düğmesi maç saatini yeniden çalıştırır
✅ Kulübe görünümü açıkken maç son düdüğe ulaşır
✅ Son düdükte sahne ve saat durur; röportaj kendiliğinden açılmaz
✅ Röportaj yalnız kullanıcının düğmesiyle açılır
✅ Tarayıcıda yakalanmamış uygulama hatası yok

48/48 geçti
```
## 92. Match arrival, award, training and career story E2E
Exit: 0

```text
✅ 320 px antrenman paneli ve gerçek üç oyuncu görünür
✅ Tesis sayısal gerçek kondisyon ve form gösterir
✅ 320 px tesis panel dışına taşmaz | {"width":320,"scrollWidth":320,"left":20,"right":300,"elWidth":280,"dialogLeft":0,"dialogRight":320}
✅ Hücum seçimi sahnenin gerçek çalışmasını değiştirir
✅ Defans seçimi sahnenin gerçek çalışmasını değiştirir
✅ Fizik seçimi sahnenin gerçek çalışmasını değiştirir
✅ Zekâ seçimi sahnenin gerçek çalışmasını değiştirir
✅ Teknik seçimi sahnenin gerçek çalışmasını değiştirir
✅ Seçili teknik çalışmasında oyuncu gerçekten hareket eder | matrix(1, 0, 0, 1, 0, 0) → matrix(1, 0, 0, 1, 27.8605, -10.7156)
✅ Tesis duraklatılınca animasyon gerçekten durur | matrix(1, 0, 0, 1, 34.8286, -13.3956) → matrix(1, 0, 0, 1, 34.8286, -13.3956)
✅ Yoğunluk seçimi hız ve kayıtlı odağa yansır
✅ İşletim sisteminin azaltılmış hareket tercihi tesisi durdurur
✅ 390 px tesis panel dışına taşmaz | {"width":390,"scrollWidth":390,"left":20,"right":370,"elWidth":350,"dialogLeft":0,"dialogRight":390}
✅ Tesis koyu temada da panel içinde görünür
✅ Kariyer hikâyesi kaydedilmiş kupa, maç ve transferleri gösterir
✅ Mükerrer maç ve transfer bir kez gösterilir
✅ Bilinmeyen kupa günü ve eski sezon açıkça belirtilir
✅ 320 px kariyer hikâyesi taşmaz | {"width":320,"scrollWidth":320,"left":16,"right":304,"elWidth":288}
✅ Kupa filtresi sadece gerçek kupaları gösterir
✅ 390 px kariyer hikâyesi taşmaz | {"width":390,"scrollWidth":390,"left":16,"right":374,"elWidth":358}
✅ Kariyer hikâyesi koyu temada okunur ve taşmaz
✅ Geliş sahnesi izlenmeden de maç başlatma seçeneği korunur
✅ Deplasmanda takım otobüsü gerçek ev sahibi stadyumuna gelir
✅ Otobüs sahnede gerçekten ilerler | -259.6 → -240.8
✅ Duraklatma otobüsü ve dekoru dondurur
✅ Sürgü otobüsü park eder, kapıyı açar ve gerçek üç oyuncuyu gösterir
✅ 320 px geliş sahnesi panele sığar | {"width":320,"scrollWidth":320,"left":20,"right":300,"elWidth":280,"dialogLeft":0,"dialogRight":320}
✅ 390 px geliş sahnesi panele sığar | {"width":390,"scrollWidth":390,"left":20,"right":370,"elWidth":350,"dialogLeft":0,"dialogRight":390}
✅ Geliş sahnesi koyu temada panel içinde kalır
✅ Azaltılmış harekette son kare sabit, yeniden oynatma kapalıdır
✅ Gelişten dönünce hazırlık kapanmaz ve maç otomatik başlamaz
✅ Hızlı sonuç açık kalır; ödül isteğe bağlıdır
✅ Ödül oyuncusu ve puanı maçın gerçek arşiv satırıyla aynıdır
✅ Türkçe ödül anonsunun altyazısı ve ses kontrolü görünür
✅ 390 px ödül töreni panel dışına taşmaz | {"width":390,"scrollWidth":390,"left":20,"right":370,"elWidth":350,"dialogLeft":0,"dialogRight":390}
✅ Ödül sahnesi koyu temada da okunur ve taşmaz
✅ 320 px ödül töreni panel dışına taşmaz | {"width":320,"scrollWidth":320,"left":20,"right":300,"elWidth":280,"dialogLeft":0,"dialogRight":320}
✅ Tören yerel ses kaydını başarıyla ister | [{"url":"http://localhost:4173/assets/match/voice/award-1.mp3","status":200}]
✅ Tören sesi kapatılabilir
✅ Tören kapanınca sonuç ve öne çıkanlar açık kalır
✅ İki Türkçe anons çevrimdışı önbellekten çözülür ve sessiz değildir | [{"status":200,"size":46620,"duration":5.75,"rms":0.11073337126828166},{"status":200,"size":46620,"duration":5.75,"rms":0.11263413834658254}]
✅ Kayıt sürümü 4; yeni sahneler için kalıcı alan eklenmedi
✅ Tarayıcıda yakalanmamış uygulama hatası yok

Kariyer sahneleri Chromium: 43/43 geçti.
```
## 93. Market filters and live tactic flow E2E (390px)
Exit: 0

```text
✅ B1 Ara: değer filtresi listeyi daraltıyor | tum=41 3M+=28
✅ B2 Ara: "Serbest / Bosman" filtresi yalnız bedelsiz kart bırakıyor | serbest-kart=12
✅ B3 Ara: "Değeri ≤ bütçe" düğmesi sekmede mevcut
✅ B4 Taktik: 11 ilk-11 yuvasının tamamında isim altı GEN rozeti | rozet=11 min=67 max=76
✅ B5 Akış: rol/log bölgesi mevcut
✅ B6 Akış: ilk olay ("Maç başladı") ilk saniyede görünür — akış boş açılış yapmıyor
✅ B10 Otomatik 11 sonrası canlı hücum talimatı kabul edilir
✅ B7 Akış: ilk 30 dk dolayında en az 4 olay satırı | satir=23 durum=paused
✅ B8 Akış: liste skorbord ve sekmelere taşmıyor | akis=210–642, sekmeler=663
✅ B9 Akış: sekmeye dönüşte canlı günlük korunuyor | hidden=true selected=true before=23 after=23 same=true state=paused
✅ B11 Canlı taktik akışında yakalanmamış uygulama hatası yok

E2E-V099: 11/11 geçti (390px)
```
## 94. Market filters and live tactic flow E2E (320px)
Exit: 0

```text
✅ B1 Ara: değer filtresi listeyi daraltıyor | tum=41 3M+=28
✅ B2 Ara: "Serbest / Bosman" filtresi yalnız bedelsiz kart bırakıyor | serbest-kart=12
✅ B3 Ara: "Değeri ≤ bütçe" düğmesi sekmede mevcut
✅ B4 Taktik: 11 ilk-11 yuvasının tamamında isim altı GEN rozeti | rozet=11 min=67 max=76
✅ B5 Akış: rol/log bölgesi mevcut
✅ B6 Akış: ilk olay ("Maç başladı") ilk saniyede görünür — akış boş açılış yapmıyor
✅ B10 Otomatik 11 sonrası canlı hücum talimatı kabul edilir
✅ B7 Akış: ilk 30 dk dolayında en az 4 olay satırı | satir=23 durum=paused
✅ B8 Akış: liste skorbord ve sekmelere taşmıyor | akis=210–518, sekmeler=539
✅ B9 Akış: sekmeye dönüşte canlı günlük korunuyor | hidden=true selected=true before=23 after=23 same=true state=paused
✅ B11 Canlı taktik akışında yakalanmamış uygulama hatası yok

E2E-V099: 11/11 geçti (320px)
```
## 95. Injury treatment and return E2E (320px home, 390px away)
Exit: 0

```text
✅ 320px home: gerçek sakatlık kararı açılır
✅ 320px home: karar beklerken maç saati durur
✅ 320px home: tedavi seçimi yalnız bir kez işlenir ve aynı pencere açılmaz | {"phase":"waiting","waitCalls":1,"steps":7}
✅ 320px home: dönüş yeni sakatlık kararı açmaz
✅ 320px home: tedavi kararı ve dönüş gerçek akışta kalır
✅ 320px home: yakalanmamış tarayıcı hatası yok
✅ 390px away: gerçek sakatlık kararı açılır
✅ 390px away: karar beklerken maç saati durur
✅ 390px away: tedavi seçimi yalnız bir kez işlenir ve aynı pencere açılmaz | {"phase":"waiting","waitCalls":1,"steps":7}
✅ 390px away: dönüş yeni sakatlık kararı açmaz
✅ 390px away: tedavi kararı ve dönüş gerçek akışta kalır
✅ 390px away: yakalanmamış tarayıcı hatası yok

INJURY-DECISION-BROWSER: 12/12
```
## 96. Live scorebug, feed, accessible Phaser pitch and action E2E (v0.9.12)
Exit: 0

```text
✅ B1 sabit skorbug xG/şut/isabet/korner metrikleri
✅ B2 süre ve hız kontrolleri sabit skorbugda
✅ B3 altı erişilebilir konsol sekmesi
✅ B4 dağınık komutlar Kenar Talimatı sheet’inde
✅ W3 haptik tercihi değiştirilebilir ve aynı oturumda geri yüklenebilir
✅ W3 sistem azaltılmış-hareket tercihi titreşimi engeller
✅ B5 canlı reyting sekmesi 22 ilk-11 oyuncusunu içeriyor
✅ B6 analiz sekmesinde gerçek şut haritası ve kanal özeti var
✅ B7 canlı tablo geçici/projeksiyon etiketi taşıyor
✅ B8 gerçek possession verisi ısı haritası kontrolü
✅ B9 Phaser saha canvas oluşturuldu | canvas=1
✅ B10 Canlı saha canvas erişilebilir ad taşıyor | label=Canlı futbol sahası; numaralı oyuncuların ve topun hareketi gösterilir.
✅ W4 duraklatma gerçek maçta hem saati hem saha görüntüsünü dondurur
✅ W4 sistem hareket tercihi maç duraklatılmışken de anında uygulanır
✅ W4 duraklatılmış maçta saha sekmesine dönünce görüntü yeniden açılır
✅ C1 Akış: ilk devre sonunda ≥12 olay | satir=32
✅ C2 Akış: "Maç başladı" açılış satırı mevcut (ilk 3sn)
✅ C3 Akış: info/danger olaylarının ≥%55'i oyuncu adı içeriyor | 31/31
✅ C4 Akış: pas zinciri veya pozisyon-anlatımı mevcut (→ / bindirdi / oyunu çevirdi / baskı altında)
✅ C5 Akış: "undefined" veya bozuk metin yok
✅ C6 Akış: kendi-kendine "oyunu çevirdi" artığı yok
✅ C7 Akış: şablon çeşitliliği — 12 satırda ≥6 farklı metin | tekil=30/32
✅ W3 devre arası tek-seferlik takım konuşması üç karar sunuyor
✅ W3 seçilen konuşma maç günlüğüne tek kez yazılır ve oyun devam eder
============================================================
  0'Maç başladı — Denizli Yeşilova SK Ana Plan ile sahada. Hakem: Hakem B (dengeli).
  1'Aydın sağ kanatta bindirdi — Cenkciler ortaya hareketlendi.
  2'Bozkurt sol kanatta bindirdi — Tanrıkulu ortaya hareketlendi.
  3'YV yön değiştirdi: Biler → Sancaktar → Tanrıkulu → Irmak.
  7'Aydın kontrolünde top uzaklaştı — taç rakibin.
  9'Irmak'ın pası rakibe gitti.
  10'Cücük kontrolünde top uzaklaştı — taç rakibin.
  11'Tanrıkulu ters topu açtı, Aydın vurdu — top az farkla yandan auta.
  15'Aydın köşeye baktı ve vurdu... Petrenko müthiş uzandı!
  15'Korner: İbrahim Tanrıkulu topun başında.
  15'İbrahim Tanrıkulu vuruşu kaleyi bulmadı.
  19'Tanrıkulu sağ kanatta bindirdi — Aydın ortaya hareketlendi.
  21'Ergin kontrolünde top uzaklaştı — taç rakibin.
  22'Cücük'ün pası rakibe gitti.
  23'Biler oyunu çevirdi — Köksal ters kanatta boşluğu gördü.
  24'Bozkurt merkezde bindirdi — Tanrıkulu ortaya hareketlendi.
  26'Cenkciler baskı altında kaptırdı — Biler araya girdi.
  29'GA yön değiştirdi: Döndü → Biler.
  32'Tanrıkulu yakın mesafeden vurdu — Petrenko gole izin vermedi!
  32'Tanrıkulu merkezde bindirdi — Irmak ortaya hareketlendi.
============================================================

E2E-LIVE-V0913: 24/24 geçti
```
## 97. Deterministic Phaser motion and pause E2E
Exit: 0

```text
✅ Durdurulmuş başlangıçta 22 oyuncu köşeden gelmeden doğru yerde | oyuncu=22 duraklatıldı=true
✅ İlk top ve gerçek sahibi başlangıçta sahada aynı bölgede
✅ Asenkron React açılışı duraklatılmışken iki takımı da çizer | {"red":1051,"blue":1067}
✅ Top tek karede takılmadan birden çok karede ilerler | 74.6 → 142.2 → 241.8
✅ Havalanan top hedefe ulaşıp tekrar yere iner | {"x":245.44000000000003,"y":90.464}
✅ Top sahibi ve hareket hedefi güncel motor verisinden çizilir
✅ Maç duraklatılınca top ve oyuncu animasyonları gerçekten donar
✅ Devam edilince donmuş hareket kaldığı yerden sürer
✅ 1× ve 4× hareket uzunlukları seçilen hıza uyumlu | 1× ilerleme=0.22 4× x=74.6
✅ Değişiklikte yeni oyuncu (0,0) yerine kendi yuvasında belirir
✅ Metin olayı devam eden top yolunu kesmez; replik motor verisini değiştirmez
✅ Olay bitince top arada güncellenen en son oyun konumuna yetişir | {"x":245.44000000000003,"y":220}
✅ Sonraki pozisyonda pas izi yeniden görünür | opacity=1.00
✅ Azaltılmış hareket açılınca aktif kamera, efekt ve top hareketi durur
✅ Son düdük sonrası saha sabit kalır ve incelenebilir
✅ Saha yeniden boyutlanınca top ve oyuncular yeni koordinatlara oturur | 280×380
✅ Duraklatılmış React sahası pencere boyutuna hemen uyum sağlar
✅ Tarayıcıda yakalanmamış saha hatası yok

PITCH-MOTION-BROWSER: 18/18
```
## 98. PWA offline shell + cached bundles E2E (v0.9.12)
Exit: 0

```text
✅ O1 Service Worker registers and activates | {"supported":true,"active":true}
✅ O2 First reload is controlled by the service worker
✅ O3 App shell renders on an offline navigation | onlineChars=50 offlineChars=50
✅ O4 Offline cache contains app shell + app/Phaser bundles | {"cacheCount":1,"missing":[]}

E2E-OFFLINE-V0912: 4/4 passed
```
