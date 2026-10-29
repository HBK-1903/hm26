# HM26 — QA Durumu

## Sesli sözleşme yenileme ve gerçek maç özeti — 2026-10-29
- `npm run qa:all`: **45/45 aşama geçti**; üretim derlemesi, 4.000 maçlık denge simülasyonu, gerçek Chromium ve çevrimdışı PWA dahil.
- Yenileme/özet mağaza ve arayüz senaryoları **65/65**; 320/390 px Chromium yenileme/özet **31/31**; canlı maç, piyasa ve satış Chromium **47/47**; maç günü akışı **108/108**.
- Ret, ayrı son imza, çift imza, son anda değişen bütçe/sahiplik, kiralık ve kırgınlık sınırları, kayıt/yükleme; gerçek olay/yol, deplasman yönü, VAR iptali, eksik veri, oynat/duraklat ve son fikstür kontrol edildi.
- Arşiv yalnız mevcut sıkıştırılmış veriyi kullanıyor; kayıt sürümü 4 ve 256 maç sınırı korundu, yeni kalıcı alan eklenmedi. Düdük sonrası ve rapor geçişi kullanıcı kontrolünde.
- Türkçe ses dosyaları ve altyazı tarayıcıda doğrulandı; insan dinlemesi yapılmadı. Mevcut geliştirme bağımlılıklarında Vite/esbuild güvenlik uyarıları ve kabul edilen Phaser parça boyutu uyarısı sürüyor.
- Yerel QA; üretime dağıtım veya otomatik merge yapılmadı.

## Piyasa, satış görüşmesi ve maç raporu — 2026-10-29
- `npm run qa:all`: **43/43 aşama geçti**; gerçek Chromium, çevrimdışı kullanım ve üretim derlemesi dahil.
- Satış akışı **31/31**, piyasa/kadro ve eski dizilişler **40/40**, mobil piyasa/satış/maç E2E **43/43**, maç günü akışı **108/108**.
- Altı formasyonda eski manuel dizilişlerin konumu, ev/deplasman aktarımı; 256 maç arşiv sınırı ve satış sonrası maaş hesabı doğrulandı. Kayıt şemasına yeni alan eklenmedi.
- Ses kaynakları ve altyazı akışı tarayıcıda doğrulandı; insan dinlemesi yapılmadı. Mevcut geliştirme bağımlılıklarında Vite/esbuild güvenlik uyarıları sürüyor; büyük sürüm yükseltmesi bu değişikliğe dahil edilmedi.
- Yerel QA; üretime dağıtım veya otomatik merge yapılmadı.

## Transfer Wave 11 — negotiation table, sell-on + no buy-back · 2026-10-26
- `npm run qa:transfer:wave11`: **5/5 PASS** — deterministic seller patience/counter/walk-away; player+cash and sell-on negotiation valuation; seed-deterministic leak; JSON clause round-trip and 20% resale settlement; aggregate sell-on cap/malformed-record handling; persistence/store/no-buy-back wiring.
- Market signing now exposes seller ask/patience, player/fee swap (one outgoing player max), contract terms, 0–25% resale clause, leak message and explicit signature summary. Sell-on clauses persist; a later accepted sale pays prior beneficiaries from gross fee, caps combined payout at 50%, credits net proceeds and clears obligations. No buy-back path added.
- `npm run build`: **PASS**, SW precache 159 files. Accepted Phaser warning remains. No app-version change, deployment or ZIP; browser E2E skipped because Chromium is absent.

## LiveMatch Wave 10 — read-only core projection + speed isolation · 2026-10-26
- `npm run qa:live:wave10`: **5/5 PASS** — read-only engine projection of score/clock/stats/ball/momentum; six unique console tabs; projection tracks engine; x1/x2/x4 yield identical seeded result, with 640/260/90ms presentation delays only.
- `LiveMatch` scorebug clock/stats/done are projected from `MatchSession`; duplicate React data stores removed; speed is only used for the presenter tick. Production build passed with the next-wave transfer work included (SW 159, accepted Phaser warning).
- No browser screenshot E2E (Chromium absent); local only, no deployment/ZIP/version/save-schema change.

## UI Wave 9 — Spor Gazetesi refresh, hybrid pitch + accessibility · 2026-10-26
- User-approved direction: **A — Spor Gazetesi** with **hybrid** presentation (light paper app, dark night-green match pitch/canvas). First-paint initialization, stored light/dark/system preference, system-change listener and browser `theme-color` synchronized.
- Shared tokens/type rhythm/focus rings, reduced motion, dynamic viewport/safe areas, 44px touch baseline, keyboard-activatable cards, semantic Seg and modal Sheet focus/escape/scroll behavior; live-match navigation icons/theme-aware warnings aligned with the tokens. No remote stylesheet/font; offline-first, HM26/version/save format unchanged.
- `npm run qa:ui:wave9`: **6/6 PASS** — WCAG AA token pairs (light/dark), theme bootstrap/system/browser-bar behavior, semantic SSR for cards/segments/dialog, focus/reduced-motion/viewport/touch checks, free-agent portrait fallback, `SaveMeta.clubName` quick-continue regression, offline/paper identity.
- `npm run build`: **PASS**, SW precache 159 files. Accepted lazy Phaser chunk-size warning remains. Chromium screenshot E2E at 375×667 not run (Chromium binary absent); CSS/SSR responsive and touch foundations checked. Local only; no deploy/ZIP/version/save-schema change.

## MatchCore Wave 8 — tactical causality, AI utility + 10k balance calibration · 2026-10-26
- `npm run qa:match-core:wave8`: **4/4 PASS** — actual relative-strength baseline; score urgency/fitness-aware utility; tactic→profile causality; deterministic AI in-match switches at 65′/80′ without overriding the manager side.
- `npm run qa:match-core:wave8:balance`: **10,000 matches PASS** — 2,000 each in Zirve, Geçit, Kök, top-favorite-home and top-favorite-away scenarios. Avg goals **2.00 / 1.86 / 1.88 / 4.28 / 3.99**; balanced tiers combined **1.91**, whole matrix **2.80**; balanced home win **43.9%**, favorite win **79.5%**, nonzero upsets; 0-0 **12.6%**, 9+ goals **1.2%**, red-card matches **5.9%**. Ledger totals: **6,848 corners, 1,124 penalties**; final reducer/stat checks enforced each match.
- Waves 1–8 focused suites: **5/5, 4/4, 5/5, 5/5, 5/5, 5/5, 4/4, 4/4 PASS**; `qa:features` **8/8**; pitch **6/6**; Wave 3 scenarios **4/4**.
- `npm run build`: **PASS**, TypeScript + Vite; SW precache 159 files. Accepted lazy Phaser chunk-size warning remains. Local only; no deployment/ZIP/app-version/save-schema change.

## MatchCore Wave 7 — referee, cards, penalties, set-piece restarts + assigned takers · 2026-10-26
- `npm run qa:match-core:wave7`: **4/4 PASS** — deterministic referee assignment/modifiers; configured taker/fallback behavior; production chains for foul→free kick/penalty, save/clearance→corner and typed set-piece shots/cards; event-derived foul/corner/card/restart stats; reducer verifies foul/restart and corner/source-shot integrity.
- Waves 1–6 focused suites: **5/5, 4/4, 5/5, 5/5, 5/5, 5/5 PASS**; Wave 7 4/4; `qa:features` **8/8**; pitch QA **6/6**; Wave 3 scenarios **4/4**.
- `npm run build`: **PASS** — TypeScript + Vite, SW precache 159 files. Accepted lazy Phaser chunk-size warning remains.
- 10k balance/Monte Carlo reserved for Wave 8. Optional Playwright live E2E remains blocked by the missing Chromium executable (see Wave 6 note); no deployment/ZIP/version/save-schema change.

## MatchCore Wave 6 — availability, injury decisions + IFAB substitutions · 2026-10-26
- `npm run qa:match-core:wave6`: **5/5 PASS** — one active-player filter across profiles/actors; no injured/dismissed participant in production actor traces; invalid/duplicate sub rejection; 5 substitutions across 3 regular opportunities plus free bundled half-time changes; one-shot 120-second injury wait/return.
- Waves 1–5 focused suites: **5/5, 4/4, 5/5, 5/5, 5/5 PASS**; Wave 6 5/5; `qa:features` **8/8**; pitch QA **6/6**; Wave 3 scenarios **4/4**; Wave 5 **5/5**.
- `npm run build`: **PASS** — TypeScript + Vite, SW precache 159 files. Accepted lazy Phaser chunk-size warning remains.
- `npm run qa:e2e:live` was attempted but stopped before tests: Playwright Chromium headless executable is absent from this workspace; no E2E assertions ran.
- Local only; no save-schema/app-version change, deployment or ZIP. Full `qa:all`/offline matrix/Monte Carlo deferred.

## MatchCore Wave 5 — clock, possession-time, fatigue + player minutes · 2026-10-26
- `npm run qa:match-core:wave5`: **5/5 PASS** — delta-time fatigue retains the five-minute calibration; starting fitness is inherited; elapsed clock/halftime/full-time are bounded; reducer possession seconds equal the exact clock; player minutes/end fitness stay in valid bounds; a substitution closes the outgoing clock and starts the incoming player's clock.
- MatchCore Waves 1–4: **5/5, 4/4, 5/5, 5/5 PASS**; `qa:features` **8/8**; pitch QA **6/6**; Wave 3 scenario QA **4/4**.
- `npm run build`: **PASS** — TypeScript + Vite, SW precache 159 files. Accepted lazy Phaser chunk-size warning remains.
- No save-schema/app-version change; local only, no deployment/ZIP. Full `qa:all`, offline matrix and Monte Carlo deferred (Monte Carlo reserved for Wave 8).

## MatchCore Wave 4 — şut çözümü + VAR/stat invariant’ları · 2026-10-26
- `npm run qa:match-core:wave4`: **5/5 PASS** — normalize olasılıklar, xG=pGoal, event-derived gol/şut/SOT/kurtarış/xG kimlikleri, VAR confirm/overturn ve live/instant tam sonuç eşitliği.
- `npm run qa:match-core`: **5/5**; Wave 2 **4/4**; Wave 3 **5/5**.
- `npx tsx tools/qa-pitch-v0912.ts`: **6/6**; `npm run qa:features`: **8/8**; `npx tsx tools/qa-wave3-scenarios.ts`: **4/4**.
- `npm run build`: **PASS** — TypeScript + Vite, SW precache 159 dosya; kabul edilmiş Phaser lazy-chunk uyarısı.
- Shot map direk vuruşunu ayrı gösteriyor. Eski batch motoru ayrı production yolunda değil; büyük denge matrisi Wave 8'e bırakıldı.
- Yerel çalışma; sürüm v0.9.13, deployment/ZIP yok. `qa:all` ve offline matrisi çalıştırılmadı.

## MatchCore Wave 3 — canlı/hızlı ortak çalışma motoru + replay · 2026-10-26
- `npm run qa:match-core:wave3`: **5/5 PASS** — instant `simulateMatch` ↔ live `MatchSession` tam sonuç eşitliği; deterministik/immutable komut kaydı; komutlu maç replay’i ve sonuç fingerprint’i; sona ermiş replay’e komut ekleme reddi.
- `npm run qa:match-core`: **5/5 PASS**; `npm run qa:match-core:wave2`: **4/4 PASS**.
- `npx tsx tools/qa-wave3-scenarios.ts`: **4/4 PASS**; `npm run qa:features`: **8/8 PASS**.
- `npm run build`: **PASS** — TypeScript + Vite, SW precache 159 dosya. Bilinen Phaser lazy-chunk uyarısı kabul ediliyor.
- Hızlı maçlar artık canlı `MatchSession` simülatörünü kullanıyor; eski batch yoluna göre sonuç dağılımı değişebilir. Büyük denge/Monte Carlo koşusu Wave 8'e bırakıldı.
- Sınır: Wave 2 UI-bağımsız `MatchCore` hâlâ faz iskeleti; üretim simülasyonu `MatchSession` içinde ortak. Olay tabanlı MatchCore'a possession/shot/stat portu bu dalgada yapılmadı.
- Yerel kod/build; app sürümü v0.9.13 kaldı. Deployment veya ZIP yok.

## Yeni MatchCore Wave 1 doğrulaması · 2026-10-26
- `npm run build`: **PASS** — TypeScript + Vite; Service Worker precache 159 dosya.
- `npm run qa:match-core`: **5/5 PASS** — deterministik EventLog, append-only zaman, tek reducer, xG=pGoal, skor/şut/isabet/kurtarış/VAR/possession invariant’ları.
- Yeni core temeli mevcut canlı/hızlı üretim motorlarına henüz bağlanmadı; bu, parity ve migration dalgalarında yapılacak.
- Tam `qa:all` ve bağımsız PWA-offline matrisi bu aşamada yeniden çalıştırılmadı; aşağıdaki v0.9.12 raporu tarihsel baseline’dır.
- Yerel değişiklik; deployment ve ZIP yok.

## MatchCore Wave 2 doğrulaması · 2026-10-26
- `npm run qa:match-core:wave2`: **4/4 PASS** — RNG akış izolasyonu/snapshot restore, MatchInput normalizasyonu, MatchCore devre/final faz geçişleri, hatalı XI ve config sürüm uyuşmazlığı.
- `npm run qa:match-core`: **5/5 PASS** — Wave 1 EventLog/reducer tabanı yeşil kaldı.
- `npm run build`: **PASS** — TypeScript + Vite; 159 Service Worker precache girdisi. Phaser lazy-chunk uyarısı kabul edilmiş durumda.
- Core hâlâ mevcut canlı/hızlı motorlara bağlanmadı; parity/migrasyon sonraki dalga.

## Güncel yerel doğrulama · v0.9.13 · 2026-10-26
- `npm run build`: **PASS** — TypeScript + Vite; Service Worker precache’e 159 dosya eklendi. Kabul edilen lazy Phaser chunk uyarısı sürüyor.
- `npx tsx tools/qa-wave3-scenarios.ts`: **4/4 PASS** — woodwork/volley cue determinismi; simülasyon tekrarlanabilirliği; tek kullanımlık devre konuşması; sakatlıkta 2 maç dakikası 10 kişi ve oyuncunun dönüşü.
- `node tools/e2e-live-v0911.mjs`: **21/21 PASS** — canlı skorbug/6 sekme/harita, haptik tercihi, sistem reduced-motion uyumu ve devre arası konuşma akışı dahil.
- Tam `qa:all` ve ayrı PWA-offline matrisi bu dalgada tekrar çalıştırılmadı; aşağıdaki 21 aşamalı koşu **v0.9.12 tarihsel regresyon tabanıdır**, güncel-wave sonucu değildir.
- Yerel kaynak/build; production deployment veya yeni ZIP yapılmadı.

## Tarihsel tam regresyon tabanı · v0.9.12
**Çalıştırma:** 2026-10-26T15:38:36.793Z
**Sonuç:** 21/21 geçti · 0 başarısız
| # | Aşama | Sonuç |
|---:|---|---|
| 1 | Production build + TypeScript + offline manifest | ✅ PASS |
| 2 | Core integrity / serialization QA (11 tests) | ✅ PASS |
| 3 | Stress and broad feature QA (37 tests) | ✅ PASS |
| 4 | Goalkeeper/stat consistency QA | ✅ PASS |
| 5 | Assets and brand manifest QA | ✅ PASS |
| 6 | Live engine parity (300 matches) | ✅ PASS |
| 7 | League/cup balance simulation (4,000 matches) | ✅ PASS |
| 8 | Medical, protest, penalty, shout and telemetry QA | ✅ PASS |
| 9 | Pitch Wave 1 geometry and goal-line clearance QA (6 checks) | ✅ PASS |
| 10 | Playwright Chromium launch smoke test | ✅ PASS |
| 11 | Embedded asset rendering E2E | ✅ PASS |
| 12 | Icon system E2E | ✅ PASS |
| 13 | Statistics and career history E2E | ✅ PASS |
| 14 | Save-slot delete flow E2E | ✅ PASS |
| 15 | Full profile → starting XI E2E | ✅ PASS |
| 16 | Out-of-position warning E2E | ✅ PASS |
| 17 | Bench-first tactical flow E2E | ✅ PASS |
| 18 | Medical/mentoring/trade E2E | ✅ PASS |
| 19 | Market filters and match-flow E2E | ✅ PASS |
| 20 | Live scorebug, feed, accessible Phaser pitch and action E2E (v0.9.12) | ✅ PASS |
| 21 | PWA offline shell + cached bundles E2E (v0.9.12) | ✅ PASS |
## Bulgular ve açık işler
- **Bu koşuda ürün/test kusuru:** bulunmadı; tüm aşamalar geçti.
- **Otomasyon düzeltmesi:** eski E2E betiklerindeki :3001 adresleri ortak `HM26_BASE_URL` ile :4173 preview adresine alındı; yeniden koşuda ilgili akışlar geçti.
- **Tarayıcı ortamı:** Chromium indirme ve paylaşımlı sistem kütüphanelerini kontrol etme/kurma adımları ile launch smoke testi otomasyona eklendi.
- **Uyarılar:** `qa-extended` 37/37 testte sıfır başarısızlıkla iki istatistiksel uyarı üretir (100 maçlık skor dağılımı örneklemi ve farklı skor çeşitliliği). Build ayrıca kabul edilmiş Phaser lazy-chunk boyut uyarısını verir; Phaser maç ekranında lazy-load edilir.
- **Dağıtım:** bu koşu yerel build/QA’dır; üretime deployment yapılmadı.
## 1. Production build + TypeScript + offline manifest
Exit: 0

```text
> manager26@0.1.0 build
> tsc --noEmit && vite build && node tools/inject-sw-manifest.mjs

vite v5.4.21 building for production...
transforming...
✓ 88 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                          0.87 kB │ gzip:   0.42 kB
dist/assets/index-ZLaG2Aqb.css          34.70 kB │ gzip:   7.65 kB
dist/assets/PhaserPitch-CDFil0rz.js      9.62 kB │ gzip:   3.93 kB
dist/assets/index-CgsKjWYg.js          552.65 kB │ gzip: 175.82 kB
dist/assets/phaser-BbgW2pkj.js       1,478.57 kB │ gzip: 339.69 kB
✓ built in 9.28s
SW precache: 159 dosya enjekte edildi
```

Stderr:
```text
(!) Some chunks are larger than 1400 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```
## 2. Core integrity / serialization QA (11 tests)
Exit: 0

```text
=== HM26 Aşama 5 Kalite Testi ===

✅ §15.1 Denge 400 maç (Geçit)                  | avgG=2.26 ev=41.0% ber=24.3% dep=34.8%
✅ MatchSession tam maç                         | 87 step, 86 possession, 3 içgörü, 22 oyuncu profili
✅ Ekonomi: kulüp bütçeleri pozitif             | 36 kulüp kontrolü, garipler: 0
✅ Ekonomi: oluşumda maaş disiplini             | 3/36 aşım (SG: 2.5/1.8, OS: 2.4/1.6, BO: 0.7/0.42)
✅ §10.1/10.2 Sakatlık+ceza üretimi             | 100 maçta 37 sakatlık, 0 kırmızı kart cezası
✅ Seed tekrarlanabilirliği                     | aynı seed: 3-0 / 3-0, e=26
✅ İstatistik tamlığı + çapraz denetim          | sarı 0-0, kırmızı 0-0, korner 0-0, kurtarış≤isabet=true, monoton=true
✅ Kayıt dışa/içe aktarma                       | round-trip: club=denizli_yesilova, day=42
✅ Bozuk kayıt dosyası zarif ret                | 6/6 geçersiz format reddedildi
✅ v1→v2 kayıt göçü                             | version=2, boardConfidence=70
✅ Gelecek-versiyon reddı                       | Sürüm uyumsuz: dosya v3, uygulama v2. Güncelleyin.

11 test, 0 başarısız
```
## 3. Stress and broad feature QA (37 tests)
Exit: 0

```text
=== HM26 Genişletilmiş 100× Stres/Bütünlük Paketi ===

✅ E1 Denge ×100 (zirve)                                | avgG=1.90 ev=%46 ber=%22 dep=%32
✅ E1 Denge ×100 (gecit)                                | avgG=2.02 ev=%39 ber=%28 dep=%33
✅ E1 Denge ×100 (kok)                                  | avgG=1.63 ev=%48 ber=%28 dep=%24
🟡 E2 Skor dağılımı ×100                                | 0-0 oranı=%19 tek-takım max=8 farklı skor=23
✅ E3 İstatistik doluluğu ×100                          | korner=109 sarı=54 kırmızı=3 faul=253 avgXG=1.92 xGBad=0 xG>7=0 on>şut=0 posDışı=0 kurtarış>isabet=0
✅ E4 Olay akışı ×100                                   | monoton-bozuk=0 devre-yok=0 boş-metin=0
✅ E5 Oyuncu satırları ×100                             | ortalama satır/maç=22.2 eksik22=0 rating-sapma=0 dakika-sapma=0
🟡 E6 Determinizm ×100                                  | özdeş=100/100, farklı skor çeşidi=18
✅ E7 Hava varyantları ×100                             | hata=0, avgG=3.06
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
✅ İ1 Sakatlık/ceza girdi biçimi ×100                   | 35 sakatlık 3 ceza — format-hata=0

37 test · 0 başarısız · 2 uyarı
```
## 4. Goalkeeper/stat consistency QA
Exit: 0

```text
✅ F1 GK conceded ↔ skor tutarlılığı ×60 | yanlış=0 GK-dışı-lekelenme=0 yedek-sızıntısı=0 kaleci-satırı=120 clean-sheet=49
✅ F2 conceded mantık sınırı (≥10 yok) ×60 | absürt=0

FAZ A doğrulama: 2 test, 0 başarısız
```
## 5. Assets and brand manifest QA
Exit: 0

```text
✅ L1 ID+ad+kısaltma birebir (paket↔oyun) | eksik=0 fazla=0 isim-sapma=0 oyun=36 paket=36
✅ L2 36/36 yeni renk + accent uygulanmış, eski renk kalmamış | uygulanmamış=0 bayat=0 accent-eksik=0
✅ L3 adaptör tutarlı + Denizli revizyon-02 renkleri | identityConsistent=true denizli=#08764F/#FFF3D9/#DA5345
✅ L4 36/36 kulüp × full+compact WebP gömülü, imza+boyut geçerli | bozuk=0 küçük=0
✅ L5 sembol PNG envanteri bütün (ivory+dark+marka), beklenmeyen boşluk yok | ivory=43 dark=29 icons=35 svg-fallback=6 modül-envanteri=18 dosya=0+0 marka-eksik=0

5 test, 0 başarısız
```
## 6. Live engine parity (300 matches)
Exit: 0

```text
MatchSession parity: n=300 | avgG 2.40 | ev 49.7% ber 25.7% dep 24.7%
```
## 7. League/cup balance simulation (4,000 matches)
Exit: 0

```text
=== HM26 §15.1 Toplu Simülasyon Raporu ===

Kadro gücü etkisi, ev sahibi avantajı, gol dağılımı ve alt-lig sürpriz oranı
————————————————————————————————————————————————————————————————————————
zirve    | n=1000 | ort. gol 2.33 | xG 1.92–1.25 | ev 49.6% ber 18.6% dep 31.8% | kırmızı/maç 0.09
gecit    | n=1000 | ort. gol 2.26 | xG 1.57–1.32 | ev 41.6% ber 25.6% dep 32.8% | kırmızı/maç 0.12
kok      | n=1000 | ort. gol 2.25 | xG 1.33–0.82 | ev 44.0% ber 18.6% dep 37.4% | kırmızı/maç 0.26
kupa     | n=500 | ort. gol 3.71 | xG 4.26–0.19 | ev 96.6% ber 3.2% dep 0.2% | kırmızı/maç 0.01
kupaEv   | n=500 | ort. gol 3.58 | xG 0.29–3.95 | ev 0.8% ber 3.2% dep 96.0% | kırmızı/maç 0.01
————————————————————————————————————————————————————————————————————————
Not: hedef davranışlar
 - Güçlü takım uzun vadeli kazanır
 - Ev sahibi ortalama hafif üstün
 - Kupa sürpriz düşük ama sıfır değil
 - Kırmızı kart ~%10–20 maçta
```
## 8. Medical, protest, penalty, shout and telemetry QA
Exit: 0

```text
✅ Needle roster gate | unapproved=excluded approved=true customXI=true
✅ European clinic cost + day arithmetic | cost=₺0.3M(₺300.000) · 30→16g · 14→0g · 5→0g
✅ Needle reinjury chance and range | nüks=24.63% (985/4000), ek gün 14–42
✅ Adverse-call protest + touchline cooldown | without-call=false protest=true/false midfield=81.3→96.3 pump=true/false cd=10
✅ Live pitch telemetry + five-minute momentum | ball=L-A@22,18 z0 owner=home actors=3 momentum=58
✅ Penalty decision opens adverse-side protest window | min=5 attacking=away defending-protest=true
✅ Manager cautions → one-match ban + kickoff consumption | first=1/ban:false second=0/ban:true matches=1 consumed=0
✅ UI/store wiring: clinic, mentor, trade, protest, manager discipline | clinic=true mentor=true swap=true protest=true managerBan=true

8 test · 0 başarısız
```
## 9. Pitch Wave 1 geometry and goal-line clearance QA (6 checks)
Exit: 0

```text
✅ Away possession is mirrored exactly once into stadium coordinates | away=80,82 home=20,18
✅ Goalkeeper shades angle and steps forward on both ends | H 50.0,92.0→57.0,89.0 · A 50.0,8.0→43.0,11.0
✅ Role displacement preserves attack direction and tracks the ball | home-ST y=55.9 away-ST y=64.1 CB x=51.6
✅ Clearance roll selects only an available back-line player | selected=ist_halic_CB_0 noRollForUnavailable=true
✅ Batch engine goal-line event + stat integrity | seed=8800 clearances=2 events=2 shots=19/19 goals=6 actors/path=true corners=true deterministic=true
✅ Live MatchSession goal-line event + stat integrity | seed=8800 clearances=1 events=1 shots=16/16 goals=5 actors/path=true corners=true deterministic=true

PITCH-WAVE1: 6/6 passed
```
## 10. Playwright Chromium launch smoke test
Exit: 0
## 11. Embedded asset rendering E2E
Exit: 0

```text
✅ A0 Sihirbaz kulüp kartlarında PNG arma (full) yüklü | 12 img (görünür alt küme), hepsi-yuklu=true
✅ A1 Alt menü: 4 sembol × çift renk PNG (tema-adaptif) + more SVG fallback | 4 anahtar, 8 img (cift varyant), svg-fallback=1
✅ A2 Üst çubuk HM26 wordmark PNG | 1 img
✅ A3 Merkez kompakt PNG armalar yüklenmiş | 3 img
✅ A4 Daha paneli PNG semboller + chevron SVG fallback | panel png=36, svg=7
✅ A6 koyu tema: krem ikonlar görünür, koyu ikonlar gizli | m26-dark=true ivory=4/4 dark=0/0
✅ A7 açık tema: koyu ikonlar görünür, krem ikonlar gizli | m26-light=true dark=4/4 ivory=0/0

E2E-ASSETS: 7/7 geçti
```
## 12. Icon system E2E
Exit: 0

```text
screenshots ✓
```
## 13. Statistics and career history E2E
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
## 14. Save-slot delete flow E2E
Exit: 0

```text
✅ kariyer kuruldu
✅ splash hızlı devam rozeti var (silmeden önce)
✅ yuva kartı dolu görünüyor
✅ ⋯ menüsü Sheet açar (oyuna kaçmaz) — balonlanma fixi | exportVisible=2
✅ kart üzerinde görünür 🗑 butonu
✅ iki aşamalı onay sheeti
✅ yuva boşaldı
✅ silinen aktif yuvanın hızlı-devam hayaleti yok

SONUÇ: YUVA SİLME TAMAM
```
## 15. Full profile → starting XI E2E
Exit: 0

```text
✅ T1 tam profil açık (Kariyer Dökümü kartı görünür)
✅ T2 tam profil düğmesi → yuva atama akışı başladı (şerit + uyumlu yuva parlatması) | şerit=true yeşilYuvalar=3
✅ T3 yuvaya dokun → dizilim güncellendi (Manuel dizilim)
✅ T4 11/11 yuva düğmesi dokunma hedefi ≥44×44 | yuva=11 küçük=0

4 test, 0 başarısız
```
## 16. Out-of-position warning E2E
Exit: 0

```text
✅ Kariyer kuruldu (hub açıldı)
   nav sonrası url= http://localhost:4173/#squad — OYUNCU metni: 0 hub-mi: 0
✅ G1 hızlı profil → İlk 11'e Al → taktik atama akışı | url=http://localhost:4173/#tactics
   diyalog sayısı: 1
   modal-içi İlk 11 butonu: 1
   buton rect: {"x":16,"y":784,"width":175,"height":44} — kapatıcı: BUTTON|min-h-touch px-4 rounded-xl font-bold text-sm flex items-center justif
✅ G1 (ANA) tam profil → İlk 11'e Al → kadro atama akışı açıldı | url=http://localhost:4173/#tactics
✅ G1 atama tamamlanınca banner kapanır
   yuva sayısı: 11
   slot-0 aria-pressed: true — Sahaya al butonları: 8
✅ G2a uyumsuz yedek → ilk dokun açıklama uyarısı (henüz atama yok) | role=alert sayısı=1
✅ G2 mevki dışı oyuncunun (GK yuvasındaki saha oyuncusu) yuvasında turuncu uyarı | gk-oop=1, toplam uyarı=4, kulübe seçimi=0
✅ G2b üçgenli yuvaya dokun → neden açıklaması (güç cezası %) | alert sayısı=1
✅ G2c atama modunda uyumsuz yuva → açıklama şeridi (ilk dokun) | alert=1
✅ G2d ikinci dokun → atama uygulandı + üçgen uyarı

SONUÇ: TÜM GEREKSİNİMLER GEÇTİ
```
## 17. Bench-first tactical flow E2E
Exit: 0

```text
✅ G1 11/11 saha yuvası tıklanabilir düğme | bulunan=11
✅ G2 6/6 yedek kartı tıklanabilir (disabled yok) | bulunan=6 disabled=0
✅ G3 yedeğe dokun → seçim + yuva-parlatma ipucu | picked=1 hint=true
✅ G4 yuva dokun → yedek sahada (Manuel dizilim), seçim sıfırlandı | banner=1 manuel=true cleared=true
✅ G5 yuva→yuva takas regresyonu (hala manuel dizilim modunda)

5 test, 0 başarısız
```
## 18. Medical/mentoring/trade E2E
Exit: 0

```text
✅ F1 Sağlık & Rehberlik kartı tam profilde
✅ F2 Ağabeylik ataması + toast
✅ F3 Takas paneli (Takasa Oyuncu Ekle)
✅ F4 Takas oyuncusu seçilince etkin teklif satırı görünür

0 BAŞARISIZ · 0 uyarı (atlananlar ⚟)
```
## 19. Market filters and match-flow E2E
Exit: 0

```text
✅ B1 Ara: değer filtresi listeyi daraltıyor | tum=26 3M+=25
✅ B2 Ara: "Serbest / Bosman" filtresi yalnız bedelsiz kart bırakıyor | serbest-kart=1
✅ B3 Ara: "Değeri ≤ bütçe" düğmesi sekmede mevcut
✅ B4 Taktik: 11 ilk-11 yuvasının tamamında isim altı GEN rozeti | rozet=11 min=63 max=76
✅ B5 Akış: rol/log bölgesi mevcut
✅ B6 Akış: ilk olay ("Maç başladı") ilk saniyede görünür — akış boş açılış yapmıyor
✅ B7 Akış: ilk 30 dk dolayında en az 4 olay satırı | satir=9
✅ B8 Akış: liste, kontrol şeridine taşmıyor (layout onarımı) | akis-taban=600 kontrol-tavan=610
✅ B9 Akış: tam ekran akış modunda liste gerçekten büyüyor | yukseklik=0→330

E2E-V099: 9/9 geçti
```
## 20. Live scorebug, feed, accessible Phaser pitch and action E2E (v0.9.12)
Exit: 0

```text
✅ B1 yayın skorbug xG/şut/isabet/korner metrikleri
✅ B2 canlı zaman ve kenar komutları görünür
✅ B3 hızlı zihniyet seçimi görünür
✅ B4 Phaser saha canvas oluşturuldu | canvas=1
✅ B5 Canlı saha canvas erişilebilir ad taşıyor | label=Canlı futbol sahası; numaralı oyuncuların ve topun hareketi gösterilir.
✅ C1 Akış: ilk devre sonunda ≥12 olay | satir=40
✅ C2 Akış: "Maç başladı" açılış satırı mevcut (ilk 3sn)
✅ C3 Akış: info/danger olaylarının ≥%55'i oyuncu adı içeriyor | 39/40
✅ C4 Akış: pas zinciri veya pozisyon-anlatımı mevcut (→ / bindirdi / oyunu çevirdi / baskı altında)
✅ C5 Akış: "undefined" veya bozuk metin yok
✅ C6 Akış: kendi-kendine "oyunu çevirdi" artığı yok
✅ C7 Akış: şablon çeşitliliği — 12 satırda ≥6 farklı metin | tekil=37/40
============================================================
  14'Aydın merkezde bindirdi — Irmak ortaya hareketlendi.
  15'YV yön değiştirdi: Horoz → Sancaktar → Irmak → Tanrıkulu.
  16'YV yön değiştirdi: Biler → Köksal → Biler → Tanrıkulu.
  18'Bozkurt merkezde bindirdi — Tanrıkulu ortaya hareketlendi.
  23'Tanrıkulu merkezde bindirdi — Aydın ortaya hareketlendi.
  25'Köksal vurdu — savunmaya çarpıp kornere çıktı.
  31'Irmak şutunu çekti, meşin yuvarlak üstten dışarı.
  31'Ergin'in şutunda Horoz güçlükle tokatladı!
  32'Bozkurt merkezde bindirdi — Aydın ortaya hareketlendi.
  35'Pekgöz yakın mesafeden vurdu — Horoz gole izin vermedi!
  36'Irmak ağır kaldı, top kaybı.
  37'Sağ kanatta boşluk açıldı... Irmak vurdu, Petrenko parmaklarının ucuyla çıkardı!
  39'Tanrıkulu sağ kanatta bindirdi — Aydın ortaya hareketlendi.
  41'Aydın'ın pası rakibe gitti.
  43'Bozkurt merkezde bindirdi — Tanrıkulu ortaya hareketlendi.
  45'Cücük oyunu çevirdi — Aydın ters kanatta boşluğu gördü.
  45'İlk yarı sona erdi.
  45'Tanrıkulu oyunu çevirdi — Irmak ters kanatta boşluğu gördü.
  48'GOOOL! Aydın ters topu açtı, Tanrıkulu topu köşeye bıraktı!
  49'Aydın merkezde bindirdi — Bozkurt ortaya hareketlendi.
============================================================

E2E-LIVE-V0912: 12/12 geçti
```
## 21. PWA offline shell + cached bundles E2E (v0.9.12)
Exit: 0

```text
✅ O1 Service Worker registers and activates | {"supported":true,"active":true}
✅ O2 First reload is controlled by the service worker
✅ O3 App shell renders on an offline navigation | onlineChars=51 offlineChars=51
✅ O4 Offline cache contains app shell + app/Phaser bundles | {"cacheCount":1,"missing":[]}

E2E-OFFLINE-V0912: 4/4 passed
```

## 22. Roadmap Wave 11 regression
Command: `npm run qa:transfer:wave11` · Exit 0

```text
✅ Seller patience/counter/walk-away deterministic
✅ Swap/sell-on valuation and seeded transfer leak
✅ Sell-on JSON round-trip and resale settlement
✅ Aggregate payout cap and malformed legacy cleanup
✅ Store wiring; player+cash only; buy-back absent
TRANSFER-WAVE11: 5/5
```

## 23. Roadmap Wave 12 Academy
Command: `npm run qa:academy:wave12` · Exit 0

```text
✅ Deterministic intake; level scales quantity/quality (2 → 6)
✅ Roster cap, registration fee, transfer funds and wage headroom
✅ JSON save/load and safe legacy defaults
✅ Ten-day offer boundary (day 18 open, day 19 expired)
✅ Store/UI persistence and youth transfer record
ACADEMY-WAVE12: 5/5
```

## 24. Roadmap Wave 13 evidence-backed newsroom
Command: `npm run qa:newsroom:wave13` · Exit 0

```text
✅ Played-result-only headlines
✅ Team of the Week from archived player minutes/ratings
✅ Standings pulse and persisted referee/foul evidence
✅ Archive migration, player/referee rows and read-only UI wiring
NEWSROOM-WAVE13: 4/4
```

## 25. Roadmap Wave 14 culture and FFP
Command: `npm run qa:culture:wave14` · Exit 0

```text
✅ Deterministic culture and migration normalization
✅ FFP clear/watch/breach boundaries and net spend
✅ Community/scandal costs/effects and invalid-choice rejection
✅ Ultras meeting, audit/appeal governance deltas
✅ Season-honor threshold award and deduplication
✅ Persistence, match/calendar signals and Club UI decision wiring
CULTURE-WAVE14: 6/6
```

## 26. Roadmap Wave 15 international cups
Command: `npm run qa:international:wave15` · Exit 0

```text
✅ 24 fictional external clubs stay isolated from 36 domestic clubs; both entries 8+8
✅ Deterministic qualification; cup holder/finalist routes; no double entry
✅ Four-team group round robin: six fixtures/group, three dates, derived tables
✅ Unique eight-team QF bracket → semi → final, champion and runner-up
✅ Competition scorer board, archive, JSON save/load and legacy default
✅ Store/fixture/calendar/season archive/Comps/Newsroom integration
INTERNATIONAL-WAVE15: 6/6
```

Final Wave 15 `npm run build`: PASS · 103 modules · SW precache 159 · accepted lazy Phaser chunk warning. At that checkpoint no production deployment or ZIP had been created.

## 27. Hub, Press Room and market persistence follow-up
Command: `npm run qa:market-improvements` · Exit 0

```text
✅ One seed-stable target per seller club; refresh cycle rotates the clubs/players offered
✅ Shortlist preserves player snapshot across refreshed pools and prefers current live player state
✅ Store migration persists shortlist snapshots; hub shortcut goes to headlines and inbox links to press room
MARKET-IMPROVEMENTS: 3/3
```

Current follow-up build: `npm run build` — PASS · 104 modules · SW precache 159 · accepted lazy Phaser chunk warning. Cloudflare Pages bundle `manager26-cloudflare-pages.zip` created and ZIP-tested (168 files, 2.1 MB). No deployment: Cloudflare connector returned `unsupported`.

## 28. MatchCore P0 — quick-result score/event consistency
Command: `npm run qa:match-core:challenge-score` · Exit 0

```text
✅ Quick result is an exact adapter projection of the deterministic MatchSession output (24 seeds)
✅ Quick score, event reducer, xG, shot ledger and scorer rows remain aligned; post-engine score changes=0
✅ Production quick-match path cannot patch the score after the engine finishes
MATCH-CORE-CHALLENGE-SCORE: 3/3
```

Regression confirmation: Wave 3 parity/replay **5/5**, Wave 4 shot/VAR/stat identities **5/5**. Final `npm run build`: **PASS**, 105 modules, SW precache 159; accepted lazy Phaser chunk warning. KZP's unsupported post-score effect is removed; KZP remains saved/displayed but no longer changes match simulation pending a causal, pre-match difficulty model. App/save version unchanged. Cloudflare ZIP is refreshed from this build; no deployment (connector unsupported).

## 29. MatchCore audit closeout — KZP AI response, trace and evidence-based insights

The KZP difficulty factor now shapes opponent AI before kickoff rather than patching the final score. AI plan decisions use live/recent xG, attack-channel counts, cards, fitness, score/minute, team strength and KZP response; deterministic traces are carried through session/result output and tactic-change core events. Match insights are concise projections of measured score/xG/shots/on-target/saves/possession/fouls/channels/plans, with unsupported causal narrative removed.

Extended-suite investigation resolved four stale/overly strict checks: valid zero-shot teams may have zero xG; the kickoff event now starts at minute 0 so early events remain monotonic; `finishNow` possession is checked against its valid 0–100 domain rather than an arbitrary 20–80 band; and blocked goal-line clearances are separate from shots-on-target (goals + saves).

**Final verification:**
- `npx tsx tools/qa-extended.ts` — **37 checks, 0 failures, 2 informational warnings** (score distribution/score diversity at 100-match sample size).
- `npm run qa:match-core:challenge-score` — **6/6 PASS**.
- `npm run qa:match-core:evidence-insights` — **3/3 PASS** (60 result projections).
- `npx tsx tools/qa.ts` — **11/11 PASS**.
- `npm run qa:match-core:challenge-balance` — **15,000-match PASS**; established large-favorite mismatch tail watch remains visible.
- `npm run build` — **PASS**, 105 modules and 159 SW precache entries; accepted ~1.479 MB lazy Phaser chunk warning.

App/save version unchanged. Cloudflare ZIP refreshed from final `dist/` and ZIP integrity checked. Deployment was **not** performed; Cloudflare connector is unsupported in this session.
