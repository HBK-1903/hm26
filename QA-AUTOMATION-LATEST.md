# HM26 — Sıralı Otomatik QA
**Çalıştırma:** 2026-10-29T19:12:09.201Z
**Sonuç:** 55/55 geçti · 0 başarısız
| # | Aşama | Sonuç |
|---:|---|---|
| 1 | Production build + TypeScript + offline manifest | ✅ PASS |
| 2 | PWA headers, manifest, icons and update lifecycle | ✅ PASS |
| 3 | Project-local security skill installation checks (not an audit) | ✅ PASS |
| 4 | Core integrity / serialization QA (11 tests) | ✅ PASS |
| 5 | Save-slot season metadata and legacy compatibility QA | ✅ PASS |
| 6 | Stress and broad feature QA (37 tests) | ✅ PASS |
| 7 | Goalkeeper/stat consistency QA | ✅ PASS |
| 8 | Assets and brand manifest QA | ✅ PASS |
| 9 | Live engine parity (300 matches) | ✅ PASS |
| 10 | Quick-match score/event consistency (KZP patch regression) | ✅ PASS |
| 11 | Match insight evidence QA (60 deterministic results) | ✅ PASS |
| 12 | League/cup balance simulation (4,000 matches) | ✅ PASS |
| 13 | Medical, protest, penalty, shout and telemetry QA | ✅ PASS |
| 14 | Pitch Wave 1 geometry and goal-line clearance QA (6 checks) | ✅ PASS |
| 15 | Pitch formation, team colors and motion cadence | ✅ PASS |
| 16 | Live engine projection and speed parity | ✅ PASS |
| 17 | Shared UI notification timing | ✅ PASS |
| 18 | New career advanced world settings | ✅ PASS |
| 19 | Transfer presentation rules, voices and local artwork | ✅ PASS |
| 20 | Newsroom saved-evidence regression | ✅ PASS |
| 21 | Market refresh, shortlist and press-room links | ✅ PASS |
| 22 | Transfer negotiation and save integration (jsdom) | ✅ PASS |
| 23 | Sale negotiation, settlement and save integration (jsdom) | ✅ PASS |
| 24 | Market potential, rotation, match plan and legacy saves (jsdom) | ✅ PASS |
| 25 | Contract renewal and recorded match highlights (jsdom) | ✅ PASS |
| 26 | Live reactions, player comparison and weekly paper (jsdom) | ✅ PASS |
| 27 | Match arrival, award, training and career story (jsdom) | ✅ PASS |
| 28 | Newsroom and fan atmosphere regression (jsdom) | ✅ PASS |
| 29 | Tactics editor regression (jsdom) | ✅ PASS |
| 30 | Squad rotation and health regression (jsdom) | ✅ PASS |
| 31 | Matchday preparation regression (jsdom) | ✅ PASS |
| 32 | Batched halftime event and decision flow (jsdom) | ✅ PASS |
| 33 | Match finish, last-whistle reaction and manual interview (jsdom) | ✅ PASS |
| 34 | Cancelled goal live presentation, audio and match finish (jsdom) | ✅ PASS |
| 35 | Match finish recovery after simulated engine failure (jsdom) | ✅ PASS |
| 36 | Matchday progression and end-day regression (jsdom) | ✅ PASS |
| 37 | Playwright Chromium launch smoke test | ✅ PASS |
| 38 | New career advanced world settings and save E2E | ✅ PASS |
| 39 | Embedded asset rendering E2E | ✅ PASS |
| 40 | Icon system E2E | ✅ PASS |
| 41 | Statistics and career history E2E | ✅ PASS |
| 42 | Save-slot delete flow E2E | ✅ PASS |
| 43 | Full profile → starting XI E2E | ✅ PASS |
| 44 | Out-of-position warning E2E | ✅ PASS |
| 45 | Bench-first tactical flow E2E | ✅ PASS |
| 46 | Medical/mentoring/trade E2E | ✅ PASS |
| 47 | Transfer theatre, signing and offline media E2E | ✅ PASS |
| 48 | Market potential, rotation and sale negotiation E2E | ✅ PASS |
| 49 | Contract renewal and recorded match highlights E2E | ✅ PASS |
| 50 | Live reactions, player comparison and weekly paper E2E | ✅ PASS |
| 51 | Match arrival, award, training and career story E2E | ✅ PASS |
| 52 | Market filters and match-flow E2E | ✅ PASS |
| 53 | Live scorebug, feed, accessible Phaser pitch and action E2E (v0.9.12) | ✅ PASS |
| 54 | Deterministic Phaser motion and pause E2E | ✅ PASS |
| 55 | PWA offline shell + cached bundles E2E (v0.9.12) | ✅ PASS |
## Bulgular ve açık işler
- **Bu koşudaki testler:** tüm aşamalar geçti; test kapsamı dışındaki kusurlar ayrıca incelenmelidir.
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
✓ 157 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                          5.25 kB │ gzip:   1.50 kB
dist/assets/index-CrFAnnW8.css          88.26 kB │ gzip:  18.49 kB
dist/assets/PhaserPitch-CSOr6XGR.js     16.45 kB │ gzip:   6.12 kB
dist/assets/index-CbrRxAOK.js          890.38 kB │ gzip: 280.55 kB
dist/assets/phaser-BbgW2pkj.js       1,478.57 kB │ gzip: 339.69 kB
✓ built in 10.88s
SW precache: 211 dosya enjekte edildi
```

Stderr:
```text
(!) Some chunks are larger than 1400 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```
## 2. PWA headers, manifest, icons and update lifecycle
Exit: 0

```text
> manager26@0.1.0 qa:pwa
> tsx tools/qa-pwa.ts

✅ Manifest metadata and 192/512 maskable PNG icons
✅ Cloudflare no-cache headers for service worker and manifest
✅ Service-worker activation message and intact build-time precache injection
✅ Production-only update UI wiring and PWA/SEO document metadata
✅ Manifest shortcuts (hash-routed) and promo screenshots with shipped files
✅ iOS apple-touch-startup-image links and precache exclusion of store-level assets

PWA-QA: 6/6 PASS
```
## 3. Project-local security skill installation checks (not an audit)
Exit: 0

```text
> manager26@0.1.0 qa:security-skill
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
## 4. Core integrity / serialization QA (11 tests)
Exit: 0

```text
=== HM26 Aşama 5 Kalite Testi ===

✅ §15.1 Denge 400 maç (Geçit)                  | avgG=2.06 ev=38.5% ber=27.8% dep=33.8%
✅ MatchSession tam maç                         | 85 step, 84 possession, 4 içgörü, 22 oyuncu profili
✅ Ekonomi: kulüp bütçeleri pozitif             | 36 kulüp kontrolü, garipler: 0
✅ Ekonomi: oluşumda maaş disiplini             | 1/36 aşım (SG: 2.5/1.8)
✅ §10.1/10.2 Sakatlık+ceza üretimi             | 100 maçta 61 sakatlık, 1 kırmızı kart cezası
✅ Seed tekrarlanabilirliği                     | aynı seed: 1-1 / 1-1, e=51
✅ İstatistik tamlığı + çapraz denetim          | sarı 1-0, kırmızı 0-0, korner 0-0, kurtarış≤isabet=true, monoton=true
✅ Kayıt dışa/içe aktarma                       | round-trip: club=denizli_yesilova, day=42
✅ Bozuk kayıt dosyası zarif ret                | 6/6 geçersiz format reddedildi
✅ v1→güncel sürüm kayıt göçü                   | version=4, boardConfidence=70
✅ Gelecek-versiyon reddı                       | Sürüm uyumsuz: dosya v5, uygulama v4. Güncelleyin.

11 test, 0 başarısız
```
## 5. Save-slot season metadata and legacy compatibility QA
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
## 6. Stress and broad feature QA (37 tests)
Exit: 0

```text
=== HM26 Genişletilmiş 100× Stres/Bütünlük Paketi ===

✅ E1 Denge ×100 (zirve)                                | avgG=2.54 ev=%53 ber=%13 dep=%34
✅ E1 Denge ×100 (gecit)                                | avgG=2.04 ev=%42 ber=%24 dep=%34
✅ E1 Denge ×100 (kok)                                  | avgG=1.92 ev=%44 ber=%34 dep=%22
🟡 E2 Skor dağılımı ×100                                | 0-0 oranı=%20 tek-takım max=9 farklı skor=23
✅ E3 İstatistik doluluğu ×100                          | korner=94 sarı=41 kırmızı=3 faul=373 avgXG=1.55 xGBad=0 xG>7=0 on>şut=0 posDışı=0 kurtarış>isabet=0
✅ E4 Olay akışı ×100                                   | monoton-bozuk=0 devre-yok=0 boş-metin=0
✅ E5 Oyuncu satırları ×100                             | ortalama satır/maç=22.2 eksik22=0 rating-sapma=0 dakika-sapma=0
🟡 E6 Determinizm ×100                                  | özdeş=100/100, farklı skor çeşidi=16
✅ E7 Hava varyantları ×100                             | hata=0, avgG=2.99
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
✅ İ1 Sakatlık/ceza girdi biçimi ×100                   | 61 sakatlık 3 ceza — format-hata=0

37 test · 0 başarısız · 2 uyarı
```
## 7. Goalkeeper/stat consistency QA
Exit: 0

```text
✅ F1 GK conceded ↔ skor tutarlılığı ×60 | yanlış=0 GK-dışı-lekelenme=0 yedek-sızıntısı=0 kaleci-satırı=120 clean-sheet=48
✅ F2 conceded mantık sınırı (≥10 yok) ×60 | absürt=0

FAZ A doğrulama: 2 test, 0 başarısız
```
## 8. Assets and brand manifest QA
Exit: 0

```text
✅ L1 ID+ad+kısaltma birebir (paket↔oyun) | eksik=0 fazla=0 isim-sapma=0 oyun=36 paket=36
✅ L2 36/36 yeni renk + accent uygulanmış, eski renk kalmamış | uygulanmamış=0 bayat=0 accent-eksik=0
✅ L3 adaptör tutarlı + Denizli revizyon-02 renkleri | identityConsistent=true denizli=#08764F/#FFF3D9/#DA5345
✅ L4 36/36 kulüp × full+compact WebP gömülü, imza+boyut geçerli | bozuk=0 küçük=0
✅ L5 sembol PNG envanteri bütün (ivory+dark+marka), beklenmeyen boşluk yok | ivory=43 dark=29 icons=35 svg-fallback=6 modül-envanteri=18 dosya=0+0 marka-eksik=0

5 test, 0 başarısız
```
## 9. Live engine parity (300 matches)
Exit: 0

```text
MatchSession parity: n=300 | avgG 1.73 | ev 40.0% ber 31.3% dep 28.7%
```
## 10. Quick-match score/event consistency (KZP patch regression)
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
## 11. Match insight evidence QA (60 deterministic results)
Exit: 0

```text
✅ Every match retains three to five concise insights | 60 results checked; length contract=true
✅ Score, xG, shot/on-target, saves, possession and foul statements use live result metrics | 60 result projections align=true
✅ No unsupported causal fallback claims remain | unsupported causal lines=0

MATCH-CORE-EVIDENCE-INSIGHTS: 3/3
```
## 12. League/cup balance simulation (4,000 matches)
Exit: 0

```text
=== HM26 §15.1 Toplu Simülasyon Raporu ===

Kadro gücü etkisi, ev sahibi avantajı, gol dağılımı ve alt-lig sürpriz oranı
————————————————————————————————————————————————————————————————————————
zirve    | n=1000 | ort. gol 2.46 | xG 1.43–1.05 | ev 50.1% ber 12.9% dep 37.0% | kırmızı/maç 0.06
gecit    | n=1000 | ort. gol 2.17 | xG 1.21–0.98 | ev 42.5% ber 22.1% dep 35.4% | kırmızı/maç 0.07
kok      | n=1000 | ort. gol 2.52 | xG 1.49–1.12 | ev 40.6% ber 16.8% dep 42.6% | kırmızı/maç 0.10
kupa     | n=500 | ort. gol 4.71 | xG 4.56–0.13 | ev 99.4% ber 0.2% dep 0.4% | kırmızı/maç 0.01
kupaEv   | n=500 | ort. gol 4.27 | xG 0.22–4.12 | ev 0.8% ber 3.2% dep 96.0% | kırmızı/maç 0.03
————————————————————————————————————————————————————————————————————————
Not: hedef davranışlar
 - Güçlü takım uzun vadeli kazanır
 - Ev sahibi ortalama hafif üstün
 - Kupa sürpriz düşük ama sıfır değil
 - Kırmızı kart ~%10–20 maçta
```
## 13. Medical, protest, penalty, shout and telemetry QA
Exit: 0

```text
✅ Needle roster gate | unapproved=excluded approved=true customXI=true
✅ European clinic cost + day arithmetic | cost=₺0.3M(₺300.000) · 30→16g · 14→0g · 5→0g
✅ Needle reinjury chance and range | nüks=24.63% (985/4000), ek gün 14–42
✅ Adverse-call protest + touchline cooldown | without-call=false protest=true/false midfield=80.5→95.5 pump=true/false cd=10
✅ Live pitch telemetry + five-minute momentum | ball=R-A@78,18 z24 owner=home actors=3 momentum=50
✅ Penalty decision opens adverse-side protest window | min=12 attacking=away defending-protest=true
✅ Manager cautions → one-match ban + kickoff consumption | first=1/ban:false second=0/ban:true matches=1 consumed=0
✅ UI/store wiring: clinic, mentor, trade, protest, manager discipline | clinic=true mentor=true swap=true protest=true managerBan=true

8 test · 0 başarısız
```
## 14. Pitch Wave 1 geometry and goal-line clearance QA (6 checks)
Exit: 0

```text
✅ Away possession is mirrored exactly once into stadium coordinates | away=80,82 home=20,18
✅ Goalkeeper shades angle and steps forward on both ends | H 50.0,92.0→57.0,89.0 · A 50.0,8.0→43.0,11.0
✅ Role displacement preserves attack direction and tracks the ball | home-ST y=55.9 away-ST y=64.1 CB x=51.6
✅ Clearance roll selects only an available back-line player | selected=ist_halic_CB_0 noRollForUnavailable=true
✅ Batch engine goal-line event + stat integrity | seed=8802 clearances=2 events=2 shots=23/23 goals=7 actors/path=true corners=true deterministic=true
✅ Live MatchSession goal-line event + stat integrity | seed=8802 clearances=2 events=2 shots=23/23 goals=7 actors/path=true corners=true deterministic=true

PITCH-WAVE1: 6/6 passed
```
## 15. Pitch formation, team colors and motion cadence
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
## 16. Live engine projection and speed parity
Exit: 0

```text
✅ Live adapter is a read-only projection of clock, score, stats, ball and momentum | score=0-0; clock=0:0; unchanged=true
✅ The projection follows engine progression without a parallel UI clock/stat store | engine=13:21 projected=13:21
✅ Match console retains six distinct accessible presentation tabs | pitch:Canlı Saha · ratings:Reytingler ve Karne · subs:Oyuncu Değişikliği · analysis:Analiz ve Şut Haritası · table:Canlı Puan Durumu · feed:Spiker ve Maç Günlüğü
✅ x1/x2/x4 change only presentation timing, never the seeded match result | delays=640/260/90ms resultParity=true
✅ LiveMatch renders engine-derived projection and keeps speed outside the engine input | scorebug clock/stat/score derive from projection; speed only configures presentation timeout

LIVE-PROJECTION-WAVE10: 5/5
```
## 17. Shared UI notification timing
Exit: 0

```text
✅ İlk bildirim gösterilir ve tek bir kapanma süresi başlatır
✅ Yeni bildirim eskisinin kapanma zamanlayıcısını iptal eder
✅ Yeni bildirim kendi süresi dolunca kapanır
✅ Ekrandan ayrılırken bekleyen zamanlayıcı temizlenir

UI-SMOOTHNESS: 4/4
```
## 18. New career advanced world settings
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
## 19. Transfer presentation rules, voices and local artwork
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
## 20. Newsroom saved-evidence regression
Exit: 0

```text
✅ Headlines publish recorded scores only and never preview an unplayed result | published=1; HS 4–2 BA
✅ Team of the Week is drawn from actual player minutes/ratings and uses no invented rows | XI=11; keeper=true; unique=true; empty-state=0
✅ League pulse follows standings and referee panel uses persisted referee/stat evidence | leader=İstanbul Haliç SK; referee=Hakem B; fouls=23
✅ Archive migrates old saves and newsroom is wired read-only from actual match reports | archive=true; pure newsroom=true; referee/player rows preserved

NEWSROOM-WAVE13: 4/4
```
## 21. Market refresh, shortlist and press-room links
Exit: 0

```text
✅ One seed-stable target per seller club; refresh cycle rotates the clubs/players offered | cycle0=9; unique source clubs=true; deterministic=true; rotated=true
✅ Shortlist preserves player snapshot across refreshed pools and prefers current live player state | rows=2; live=true; generated snapshot=fa_saved_agent
✅ Store migration persists shortlist snapshots; hub shortcut goes to headlines and inbox links to press room | persistent shortlist=true; diversified/64-player search=true; press-room links=true

MARKET-IMPROVEMENTS: 3/3
```
## 22. Transfer negotiation and save integration (jsdom)
Exit: 0

```text
> manager26@0.1.0 qa:transfer:scene:ui
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
(node:206849) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
```
## 23. Sale negotiation, settlement and save integration (jsdom)
Exit: 0

```text
> manager26@0.1.0 qa:sale:ui
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
✅ Kabul edilen karşı teklif yalnız ön anlaşmadır
✅ Onaylanan karşı teklifin gerçek bedeli ve bütçesi işlenir
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

SALE-FLOW: 31/31 geçti
```

Stderr:
```text
(node:207224) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
```
## 24. Market potential, rotation, match plan and legacy saves (jsdom)
Exit: 0

```text
> manager26@0.1.0 qa:market-squad:ui
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
(node:207491) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
```
## 25. Contract renewal and recorded match highlights (jsdom)
Exit: 0

```text
> manager26@0.1.0 qa:renewal-highlights:ui
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
✅ Gerçek motor kurtarışlarında özet hücum ekibini kaleci takımı sanmaz | 16 açık oyun kurtarışı
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
(node:207881) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
```
## 26. Live reactions, player comparison and weekly paper (jsdom)
Exit: 0

```text
> manager26@0.1.0 qa:atmosphere-paper:ui
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
✅ Sekiz gerçek maçta tepkiler yalnız gerçek ve değiştirilmemiş olaylardan seçilir | 94 tepki · 49 açık oyun kurtarışı
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
(node:208271) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
```
## 27. Match arrival, award, training and career story (jsdom)
Exit: 0

```text
> manager26@0.1.0 qa:career-scenes:ui
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
(node:208661) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
```
## 28. Newsroom and fan atmosphere regression (jsdom)
Exit: 0

```text
> manager26@0.1.0 qa:wave7:ui
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
(node:208983) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
```
## 29. Tactics editor regression (jsdom)
Exit: 0

```text
> manager26@0.1.0 qa:wave2:ui
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-wave2-tactics-ui.tsx

✅ Uyum çipi %60 taban gösteriyor | %60uyum
✅ Uyum çipi maç etkisi ipucu taşıyor | Yeni 4-3-3 dizilisi — ilk 3 maç alışma dönemi · maç etkisi: nötr (bu planla henüz maç oynanmadı veya uyum %80’de)
✅ Nötr planda etki yüzdesi etiketi görünmez
✅ Yeni diziliş ipucu görünüyor
✅ 11 saha rozetinin kondisyon halkası var | adet=11
✅ Kondisyon tonları geçerli kümeden
✅ Rozetlerde yıldızlı reyting var
✅ Sahada 11 dokunulabilir oyuncu yuvası | adet=11
✅ Yedek bandı dolu | adet=8
✅ Dokunulan yuvaya uyumlu yedekler parlıyor | uyumlu=2
✅ Uyumlu yedekler gerçekten aynı mevki grubundan
✅ Uyumsuz yedekler soluklaşıyor
✅ Yedek kondisyon noktaları işlenmiş
✅ Uyumlu yedek sahaya alındı (parlatma sıfırlandı) | Baran Uçar — seçili yuvaya sah

DALGA2-TAKTIK-UI: PASS
```

Stderr:
```text
(node:209195) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
Warning: `ReactDOMTestUtils.act` is deprecated in favor of `React.act`. Import `act` from `react` instead of `react-dom/test-utils`. See https://react.dev/warnings/react-dom-test-utils for more info.
```
## 30. Squad rotation and health regression (jsdom)
Exit: 0

```text
> manager26@0.1.0 qa:wave3:ui
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
(node:209462) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
Warning: `ReactDOMTestUtils.act` is deprecated in favor of `React.act`. Import `act` from `react` instead of `react-dom/test-utils`. See https://react.dev/warnings/react-dom-test-utils for more info.
```
## 31. Matchday preparation regression (jsdom)
Exit: 0

```text
> manager26@0.1.0 qa:wave5:ui
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
(node:209606) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./tools/qa-live-loader.mjs", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
Warning: `ReactDOMTestUtils.act` is deprecated in favor of `React.act`. Import `act` from `react` instead of `react-dom/test-utils`. See https://react.dev/warnings/react-dom-test-utils for more info.
```
## 32. Batched halftime event and decision flow (jsdom)
Exit: 0

```text
> manager26@0.1.0 qa:live:halftime
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
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
(node:212103) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
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
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: `ReactDOMTestUtils.act` is deprecated in favor of `React.act`. Import `act` from `react` instead of `react-dom/test-utils`. See https://react.dev/warnings/react-dom-test-utils for more info.
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
```
## 33. Match finish, last-whistle reaction and manual interview (jsdom)
Exit: 0

```text
> manager26@0.1.0 qa:match-finish
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
(node:214462) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
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
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: `ReactDOMTestUtils.act` is deprecated in favor of `React.act`. Import `act` from `react` instead of `react-dom/test-utils`. See https://react.dev/warnings/react-dom-test-utils for more info.
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
```
## 34. Cancelled goal live presentation, audio and match finish (jsdom)
Exit: 0

```text
> manager26@0.1.0 qa:match-finish
> node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-live-finish.tsx

Maç günü: day=6, fikstür gün 6 [hazirlik]
✅ Analiz sekmesinde kümülatif xG grafiği render oldu
akış: 1:011. YARI
akış: 2:291. YARI
akış: 4:031. YARI
akış: 5:291. YARI
✅ İptal gol canlı sahada ve seslerde VAR kararıdır; gol kutlaması açılmaz
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
(node:216697) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
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
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: `ReactDOMTestUtils.act` is deprecated in favor of `React.act`. Import `act` from `react` instead of `react-dom/test-utils`. See https://react.dev/warnings/react-dom-test-utils for more info.
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
```
## 35. Match finish recovery after simulated engine failure (jsdom)
Exit: 0

```text
> manager26@0.1.0 qa:match-finish
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
(node:219055) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
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
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: `ReactDOMTestUtils.act` is deprecated in favor of `React.act`. Import `act` from `react` instead of `react-dom/test-utils`. See https://react.dev/warnings/react-dom-test-utils for more info.
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
[hm26] canlı maç adımı hatası: Error: ENJEKTE_EDİLMİŞ_ADIM_HATASI
    at MatchSession.patchedStep (/home/user/hm26/tools/qa-live-finish.tsx:70:55)
    at Timeout._onTimeout (/home/user/hm26/src/screens/LiveMatch.tsx:230:31)
    at listOnTimeout (node:internal/timers:585:17)
    at process.processTimers (node:internal/timers:521:7)
```
## 36. Matchday progression and end-day regression (jsdom)
Exit: 0

```text
> manager26@0.1.0 qa:dayflow
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
ovider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
Warning: An update to GameProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at GameProvider (/home/user/hm26/src/store/game.tsx:213:40)
```
## 37. Playwright Chromium launch smoke test
Exit: 0
## 38. New career advanced world settings and save E2E
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
✅ Ayarlar değiştirilmeden başlayan kariyerin mevcut varsayılanları değişmez | {"goalPace":"dengeli","randomness":"normal","marketRefresh":"dengeli","boardPressure":"orta","injuryRate":"normal","textSize":"normal","highContrast":false,"reduceMotion":false,"matchSpeed":"normal","suggestions":true}
✅ Varsayılan kariyerde de yakalanmamış uygulama hatası yok

CAREER-WORLD-BROWSER: 19 geçti, 0 başarısız
```
## 39. Embedded asset rendering E2E
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
## 40. Icon system E2E
Exit: 0

```text
screenshots ✓
```
## 41. Statistics and career history E2E
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
## 42. Save-slot delete flow E2E
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
## 43. Full profile → starting XI E2E
Exit: 0

```text
✅ T1 tam profil açık (Kariyer Dökümü kartı görünür)
✅ T2 tam profil düğmesi → yuva atama akışı başladı (şerit + uyumlu yuva parlatması) | şerit=true yeşilYuvalar=3
✅ T3 yuvaya dokun → dizilim güncellendi (Manuel dizilim)
✅ T4 11/11 yuva düğmesi dokunma hedefi ≥44×44 | yuva=11 küçük=0

4 test, 0 başarısız
```
## 44. Out-of-position warning E2E
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
✅ G2a uyumsuz yedek → ilk dokun açıklama uyarısı (henüz atama yok) | aday=6, role=alert sayısı=1
✅ G2 mevki dışı oyuncunun (GK yuvasındaki saha oyuncusu) yuvasında turuncu uyarı | gk-oop=1, toplam uyarı=2, kulübe seçimi=6
✅ G2b üçgenli yuvaya dokun → neden açıklaması (güç cezası %) | alert sayısı=1
✅ G2c atama modunda uyumsuz yuva → açıklama şeridi (ilk dokun) | alert=1
✅ G2d ikinci dokun → atama uygulandı + üçgen uyarı

SONUÇ: TÜM GEREKSİNİMLER GEÇTİ
```
## 45. Bench-first tactical flow E2E
Exit: 0

```text
✅ G1 11/11 saha yuvası tıklanabilir düğme | bulunan=11
✅ G2 6/6 yedek kartı tıklanabilir (disabled yok) | bulunan=6 disabled=0
✅ G3 yedeğe dokun → seçim + yuva-parlatma ipucu | picked=1 hint=true
✅ G4 yuva dokun → yedek sahada (Manuel dizilim), seçim sıfırlandı | banner=1 manuel=true cleared=true
✅ G5 yuva→yuva takas regresyonu (hala manuel dizilim modunda)

5 test, 0 başarısız
```
## 46. Medical/mentoring/trade E2E
Exit: 0

```text
✅ F1 Sağlık & Rehberlik kartı tam profilde
✅ F2 Ağabeylik ataması + toast
✅ F3 Oyuncu + nakit takası paneli
✅ F4 Takas oyuncusu seçilince değer ve toplam teklif görünür

0 BAŞARISIZ · 0 uyarı (atlananlar ⚟)
```
## 47. Transfer theatre, signing and offline media E2E
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
✅ Üretim servis çalışanı etkin | {"active":true,"caches":["hm26-v014-pwa-update"]}
✅ Üç sahne ve 40 ses çevrimdışı önbellekten açılıyor | 43/43
✅ 40 MP3 çevrimdışıyken tarayıcı tarafından çözümleniyor | 40/40
✅ Yıldız anonsu çevrimdışıyken altyazıyla çalışıyor
✅ Tarayıcıda yakalanmamış uygulama hatası yok

TRANSFER-SCENE-BROWSER: 22/22
```
## 48. Market potential, rotation and sale negotiation E2E
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
## 49. Contract renewal and recorded match highlights E2E
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
## 50. Live reactions, player comparison and weekly paper E2E
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
✅ Duraklatma maç saatini ve animasyon sahnesini dondurur | [{"state":"paused","time":83.32200000060652},{"state":"paused","time":83.32200000060652},{"state":"paused","time":83.32200000060652}]
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
## 51. Match arrival, award, training and career story E2E
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
✅ Seçili teknik çalışmasında oyuncu gerçekten hareket eder | matrix(1, 0, 0, 1, 0, 0) → matrix(1, 0, 0, 1, 27.8611, -10.7158)
✅ Tesis duraklatılınca animasyon gerçekten durur | matrix(1, 0, 0, 1, 34.8294, -13.3959) → matrix(1, 0, 0, 1, 34.8294, -13.3959)
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
✅ Otobüs sahnede gerçekten ilerler | -259.7 → -240.6
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
## 52. Market filters and match-flow E2E
Exit: 0

```text
✅ B1 Ara: değer filtresi listeyi daraltıyor | tum=41 3M+=28
✅ B2 Ara: "Serbest / Bosman" filtresi yalnız bedelsiz kart bırakıyor | serbest-kart=12
✅ B3 Ara: "Değeri ≤ bütçe" düğmesi sekmede mevcut
✅ B4 Taktik: 11 ilk-11 yuvasının tamamında isim altı GEN rozeti | rozet=11 min=67 max=76
✅ B5 Akış: rol/log bölgesi mevcut
✅ B6 Akış: ilk olay ("Maç başladı") ilk saniyede görünür — akış boş açılış yapmıyor
✅ B7 Akış: ilk 30 dk dolayında en az 4 olay satırı | satir=17
✅ B8 Akış: liste skorbord ve sekmelere taşmıyor | akis=238–642, sekmeler=663
✅ B9 Akış: sekmeye dönüşte canlı günlük korunuyor

E2E-V099: 9/9 geçti
```
## 53. Live scorebug, feed, accessible Phaser pitch and action E2E (v0.9.12)
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
✅ C1 Akış: ilk devre sonunda ≥12 olay | satir=28
✅ C2 Akış: "Maç başladı" açılış satırı mevcut (ilk 3sn)
✅ C3 Akış: info/danger olaylarının ≥%55'i oyuncu adı içeriyor | 27/27
✅ C4 Akış: pas zinciri veya pozisyon-anlatımı mevcut (→ / bindirdi / oyunu çevirdi / baskı altında)
✅ C5 Akış: "undefined" veya bozuk metin yok
✅ C6 Akış: kendi-kendine "oyunu çevirdi" artığı yok
✅ C7 Akış: şablon çeşitliliği — 12 satırda ≥6 farklı metin | tekil=27/28
✅ W3 devre arası tek-seferlik takım konuşması üç karar sunuyor
✅ W3 seçilen konuşma maç günlüğüne tek kez yazılır ve oyun devam eder
============================================================
  0'Maç başladı — Denizli Yeşilova SK Ana Plan ile sahada. Hakem: Hakem B (dengeli).
  1'Aydın ara pası bıraktı, Tanrıkulu vurdu — top az farkla yandan auta.
  4'YV yön değiştirdi: Biler → Sancaktar → Tanrıkulu → Irmak.
  5'Horoz → Tanrıkulu — YV merkezde üstünlük kuruyor.
  6'YV yön değiştirdi: Biler → Irmak → Biler → Tanrıkulu.
  7'Hakem serbest vuruş verdi — Kerem Aydın kullanacak.
  8'Biler oyunu çevirdi — Aydın ters kanatta boşluğu gördü.
  12'Tanrıkulu merkezde bindirdi — Bozkurt ortaya hareketlendi.
  13'Aydın kontrolünde top uzaklaştı — taç rakibin.
  16'Tanrıkulu köşeye baktı ve vurdu... Petrenko müthiş uzandı!
  17'Hakem serbest vuruş verdi — Kerem Aydın kullanacak.
  17'Biler güçlü ikili mücadelede topu Cenkciler'inden söktü.
  20'Bozkurt merkezde bindirdi — Tanrıkulu ortaya hareketlendi.
  21'Biler yakın mesafeden vurdu — Petrenko gole izin vermedi!
  22'YV yön değiştirdi: Irmak → Tanrıkulu → Biler → Tanrıkulu.
  23'Tanrıkulu güçlü ikili mücadelede topu Ergin'inden söktü.
  24'GOOOL! Irmak ters topu açtı, Aydın boş durumda affetmedi!
  25'Tanrıkulu kapanan savunma karşısında çıkışı bulamadı.
  26'Tanrıkulu merkezde bindirdi — Aydın ortaya hareketlendi.
  32'Tanrıkulu ortaladı, Irmak vurdu — top az farkla yandan auta.
============================================================

E2E-LIVE-V0913: 24/24 geçti
```
## 54. Deterministic Phaser motion and pause E2E
Exit: 0

```text
✅ Durdurulmuş başlangıçta 22 oyuncu köşeden gelmeden doğru yerde | oyuncu=22 duraklatıldı=true
✅ İlk top ve gerçek sahibi başlangıçta sahada aynı bölgede
✅ Asenkron React açılışı duraklatılmışken iki takımı da çizer | {"red":1051,"blue":1067}
✅ Top tek karede takılmadan birden çok karede ilerler | 74.6 → 128.4 → 245.4
✅ Havalanan top hedefe ulaşıp tekrar yere iner | {"x":245.44000000000003,"y":90.464}
✅ Top sahibi ve hareket hedefi güncel motor verisinden çizilir
✅ Maç duraklatılınca top ve oyuncu animasyonları gerçekten donar
✅ Devam edilince donmuş hareket kaldığı yerden sürer
✅ 1× ve 4× hareket uzunlukları seçilen hıza uyumlu | 1× ilerleme=0.21 4× x=74.6
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
## 55. PWA offline shell + cached bundles E2E (v0.9.12)
Exit: 0

```text
✅ O1 Service Worker registers and activates | {"supported":true,"active":true}
✅ O2 First reload is controlled by the service worker
✅ O3 App shell renders on an offline navigation | onlineChars=51 offlineChars=51
✅ O4 Offline cache contains app shell + app/Phaser bundles | {"cacheCount":1,"missing":[]}

E2E-OFFLINE-V0912: 4/4 passed
```
