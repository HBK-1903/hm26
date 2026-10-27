# ☁️ MANAGER26 → Cloudflare Pages Dağıtımı

**Canlı adres:** [https://hbkmanage26.pages.dev/](https://hbkmanage26.pages.dev/)
(Cloudflare Pages proje adı: `hbkmanage26`).

Production build `dist/` klasörüne çıkar; PWA kabiliyeti (service worker, manifest,
kurulum) yalnız production build'de aktiftir.

## Build

```bash
npm install
npm run build      # tsc --noEmit + vite build + SW precache enjeksiyonu → dist/
```

Çıktı doğrulaması (önerilen):

```bash
npm run qa:pwa     # manifest, shortcuts, splash linkleri, SW precache sözleşmesi
```

## Yol 1 — Sürükle & Bırak (en kolay, hesap/Git gerekmez)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Upload assets**
2. Proje adı: `hbkmanage26`
3. **`dist/` klasörünün İÇİNDEKİLERİ** sürükle: `index.html`, `assets/`, `sw.js`,
   `manifest.json`, `_redirects`, `_headers`, `icons/`, `splash/`, `screenshots/`, SVG ikonlar
4. **Deploy** → oyun [https://hbkmanage26.pages.dev/](https://hbkmanage26.pages.dev/) altında canlanır

## Yol 2 — Wrangler CLI

```bash
npm i -g wrangler
wrangler pages project create hbkmanage26
wrangler pages deploy dist --project-name=hbkmanage26
```

## Yol 3 — Git bağlantısı (otomatik yayın)

Pages → **Connect to Git** → depoyu seç; build komutu `npm run build`, çıktı dizini `dist`.
`wrangler.toml` içindeki `pages_build_output_dir = "dist"` aynı sözleşmeyi taşır.

## Teknik notlar

- `_redirects` SPA kuralı içerir: `/*  /index.html  200` — uygulama içi hash
  rotaları (`#squad`, `#market` dahil) derin bağlantıda 404 vermez.
- **Service worker sürümleme artık otomatiktir.** `tools/inject-sw-manifest.mjs`
  her build'de `dist` envanterini `sw.js` içine enjekte eder; dosya içeriği her
  yayında değiştiği için tarayıcı yeni worker'ı fark eder. `public/sw.js`
  içinde elle etiket değiştirme gerekmez (geçmişteki `manager26-v058-v1` notu
  kaldırılmıştır). Cache adı yalnız kabuk stratejisi değiştiğinde elle yükseltilir.
- `_headers`, `sw.js` ve `manifest.json` için `no-cache` zorlar; istemci kaydı
  `updateViaCache: 'none'` ile açılır. Yeni sürüm, kullanıcı uygulama içi
  "Güncelle" bandını onaylayana kadar bekler.
- `splash/` (iOS launch ekranları) ve `screenshots/` (kurulum diyaloğu görselleri)
  service worker precache'ine **bilerek dahil edilmez**; bunlar OS/mağaza
  seviyesi varlıklardır ve ilk kurulum yükünü şişirmez.
- `assets/` altındaki derleme çıktıları hash'li olduğundan Cloudflare tarafından
  uzun önbellekli sunulur.
- Özel alan adı: Pages projesi → **Custom domains**.

## PWA görsel varlıkları (yeniden üretme)

`public/splash/`, `public/screenshots/` ve `public/icons/shortcuts/` altındaki
görseller `tools/generate-pwa-assets.py` ile üretilir (deterministik, harici
servis yok; kaynak `public/splash-cover.webp` ve marka wordmark'ıdır):

```bash
python3 -m pip install pillow
python3 tools/generate-pwa-assets.py
npm run build
```
