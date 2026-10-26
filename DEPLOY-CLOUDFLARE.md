# ☁️ MANAGER26 → Cloudflare Pages Dağıtımı

**Bu paket yükleme hazır (v0.5.8-hotfix).** İki yoldan birini seç:

## Yol 1 — Sürükle & Bırak (en kolay, hesap gerekmez)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Upload assets**
2. Proje adı: `manager26`
3. Bu zip'teki **`dist/` klasörünün İÇİNDEKİLERİ** sürükle (index.html, assets/, sw.js, manifest, _redirects, icon.svg)
4. **Deploy** → oyun `https://manager26.pages.dev` (veya verilen URL) altında anında canlı.

## Yol 2 — Wrangler CLI

```bash
npm i -g wrangler
wrangler pages project create manager26
wrangler pages deploy dist --project-name=manager26
```

## Teknik notlar

- `_redirects` SPA kuralı içerir: `/*  /index.html  200` — derin bağlantılarda 404 olmaz.
- `sw.js` (service worker) sürüm etmiketi: her yayın öncesi `public/sw.js` içinde `manager26-v058-v1` etiketini değiştir, yoksa eski sürüm önbellekten gelir.
- `assets/` altındaki dosyalar immutable hash'li — Cloudflare onları otomatik uzun önbellekli sunar.
- Özel alan adı eklemek: Pages projesi → **Custom domains**.

– Arena Agent Mode · v0.5.8-hotfix
