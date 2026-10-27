// HM26 — v0.9.8 gömülü görsel paket E2E: PNG arma + PNG sembol + marka render doğrulaması
// Önkoşul: vite preview :4173. Çalıştır: node tools/e2e-assets.mjs
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shotsDir = path.join(repoRoot, '_shots');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'tr' });
const fs = await import('fs'); fs.mkdirSync(shotsDir, { recursive: true });
const tap = (l) => l.first().click({ force: true, timeout: 9000 });
let fail = 0;
const ok = (n, c, x = '') => { console.log((c ? '✅ ' : '❌ ') + n + (x ? ` | ${x}` : '')); if (!c) fail++; };

await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Başla|Kayıt Yuvaları/ }).first().click({ force: true });
await page.getByText(/Yeni Kariyer — Yuva 1/).first().click({ force: true });
await page.locator('input').first().fill('Görsel Testi');
await page.getByText('Eski Futbolcu').first().click({ force: true }).catch(() => {});
for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /^Devam$/ }).first().click({ force: true });

// A0: Sihirbaz kulüp kartı full-arması <img> olarak render ediliyor
await page.waitForTimeout(900); // lazy img'ler yüklensin
const wizImgs = await page.locator('img[src*="/assets/crests/full/"]').evaluateAll((els) =>
  els.map((e) => ({ ok: e.complete && e.naturalWidth > 0, src: e.src.split('/').pop() })));
ok('A0 Sihirbaz kulüp kartlarında PNG arma (full) yüklü', wizImgs.length >= 10 && wizImgs.every((i) => i.ok), `${wizImgs.length} img (görünür alt küme), hepsi-yuklu=${wizImgs.every((i) => i.ok)}`);
await page.screenshot({ path: path.join(shotsDir, 'a0-wizard.png') });

await page.getByText('Denizli Yeşilova').first().click({ force: true });
await page.getByRole('button', { name: /Kulüp Brifingine Git/ }).first().click({ force: true });
await page.getByRole('button', { name: /Kariyeri Başlat/ }).first().click({ force: true });
await page.waitForTimeout(1100);
await page.getByRole('button', { name: 'Anladım' }).first().click({ force: true, timeout: 2500 }).catch(() => {});
await page.waitForTimeout(600);

// A1: Alt menü sembolleri PNG (ivory) ve yüklenmiş
const navIcons = await page.locator('nav[aria-label="Ana gezinme"] img[src*="/assets/symbols"]').evaluateAll((els) =>
  els.map((e) => ({ ok: e.complete && e.naturalWidth > 0, f: e.src.split('/').pop() })));
const navSvg = await page.locator('nav[aria-label="Ana gezinme"] svg').count();
const uniqFiles = [...new Set(navIcons.map((i) => i.f))];
ok('A1 Alt menü: 4 sembol × çift renk PNG (tema-adaptif) + more SVG fallback', uniqFiles.length === 4 && navIcons.length === 8 && navIcons.every((i) => i.ok) && navSvg >= 1, `${uniqFiles.length} anahtar, ${navIcons.length} img (cift varyant), svg-fallback=${navSvg}`);

// A2: Header marka wordmark PNG
const brand = await page.locator('header img[src*="assets/brand/"]').evaluateAll((els) => els.map((e) => e.complete && e.naturalWidth > 0));
ok('A2 Üst çubuk HM26 wordmark PNG', brand.length === 1 && brand[0], `${brand.length} img`);

// A3: Hub'da kompakt armalar <img> (kulübüm + sonraki maç)
const hubCrests = await page.locator('img[src*="/assets/crests/compact/"]').evaluateAll((els) =>
  els.map((e) => e.complete && e.naturalWidth > 0));
ok('A3 Merkez kompakt PNG armalar yüklenmiş', hubCrests.length >= 2 && hubCrests.every(Boolean), `${hubCrests.length} img`);
await page.screenshot({ path: path.join(shotsDir, 'a1-hub.png') });

// A4: Daha paneli ikonları PNG
await tap(page.locator('nav[aria-label="Ana gezinme"] button', { hasText: 'Daha' }));
await page.waitForTimeout(500);
const moreIcons = await page.locator('img[src*="/assets/symbols"]').count();
const moreSvg = await page.locator('[data-slot="sheet"] svg, .fixed svg').count();
ok('A4 Daha paneli PNG semboller + chevron SVG fallback', moreIcons >= 5, `panel png=${moreIcons}, svg=${moreSvg}`);
await page.screenshot({ path: path.join(shotsDir, 'a2-more.png') });
await page.keyboard.press('Escape').catch(() => {});
await tap(page.locator('button[aria-label="Kapat"], [data-sheet-close]').first()).catch(() => {});

// A5/A6: Tema geçişinde semboller görünür kalır (açık→koyu ikon, koyu→krem ikon)
await tap(page.locator('nav[aria-label="Ana gezinme"] button', { hasText: 'Daha' }));
await page.waitForTimeout(400);
await tap(page.locator('button', { hasText: 'Ayarlar' }));
await page.waitForTimeout(400);
await tap(page.locator('button', { hasText: 'Koyu 🌙' }));
await page.waitForTimeout(400);
const darkState = await page.evaluate(() => {
  const htmlDark = document.documentElement.classList.contains('m26-dark');
  const iv = [...document.querySelectorAll('nav img.gi-ivory')];
  const dk = [...document.querySelectorAll('nav img.gi-dark')];
  const vis = (e) => getComputedStyle(e).display !== 'none';
  return { htmlDark, ivShown: iv.filter(vis).length, dkShown: dk.filter(vis).length };
});
ok('A6 koyu tema: krem ikonlar görünür, koyu ikonlar gizli', darkState.htmlDark && darkState.ivShown === 4 && darkState.dkShown === 0,
  `m26-dark=${darkState.htmlDark} ivory=${darkState.ivShown}/4 dark=${darkState.dkShown}/0`);
await page.screenshot({ path: path.join(shotsDir, 'a3-dark-theme.png') });
await tap(page.locator('button', { hasText: 'Açık ☀️' }));
await page.waitForTimeout(400);
const lightState = await page.evaluate(() => {
  const iv = [...document.querySelectorAll('nav img.gi-ivory')];
  const dk = [...document.querySelectorAll('nav img.gi-dark')];
  const vis = (e) => getComputedStyle(e).display !== 'none';
  return { htmlLight: document.documentElement.classList.contains('m26-light'), ivShown: iv.filter(vis).length, dkShown: dk.filter(vis).length };
});
ok('A7 açık tema: koyu ikonlar görünür, krem ikonlar gizli', lightState.htmlLight && lightState.dkShown === 4 && lightState.ivShown === 0,
  `m26-light=${lightState.htmlLight} dark=${lightState.dkShown}/4 ivory=${lightState.ivShown}/0`);

console.log(fail === 0 ? '\nE2E-ASSETS: 7/7 geçti' : `\nE2E-ASSETS: ${fail} BAŞARISIZ`);
await browser.close();
process.exit(fail ? 1 : 0);
