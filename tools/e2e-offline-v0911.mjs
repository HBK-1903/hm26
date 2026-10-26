// HM26 v0.9.12 — PWA shell and hashed assets remain usable after going offline.
import { chromium } from 'playwright';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'tr' });
const page = await context.newPage();
let failures = 0;
const check = (name, condition, detail = '') => {
  console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`);
  if (!condition) failures++;
};

try {
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker?.getRegistration();
    return reg?.active?.state === 'activated';
  }, null, { timeout: 30_000 });
  const registration = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return { supported: false, active: false };
    const reg = await navigator.serviceWorker.ready;
    return { supported: true, active: reg.active?.state === 'activated' };
  });
  check('O1 Service Worker registers and activates', registration.supported && registration.active, JSON.stringify(registration));

  await page.reload({ waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, { timeout: 15_000 });
  check('O2 First reload is controlled by the service worker', await page.evaluate(() => !!navigator.serviceWorker.controller));

  const onlineShell = (await page.locator('body').innerText()).trim();
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.waitForTimeout(1000);
  const offlineShell = (await page.locator('body').innerText()).trim();
  const appVisible = offlineShell.length > 30 && /HM26|Başla|Kayıt Yuvaları|Menajer|Kariyer/i.test(offlineShell);
  check('O3 App shell renders on an offline navigation', appVisible, `onlineChars=${onlineShell.length} offlineChars=${offlineShell.length}`);

  const missingAssets = await page.evaluate(async () => {
    const names = await caches.keys();
    if (!names.length) return { cacheCount: 0, missing: ['cache yok'] };
    const cache = await caches.open(names.find((n) => n.startsWith('hm26-')) || names[0]);
    const root = await cache.match('/');
    const appJs = await cache.keys().then((keys) => keys.some((r) => new URL(r.url).pathname.startsWith('/assets/index-') && /\.js$/.test(r.url)));
    const phaser = await cache.keys().then((keys) => keys.some((r) => new URL(r.url).pathname.startsWith('/assets/phaser-') && /\.js$/.test(r.url)));
    return { cacheCount: names.length, missing: [!root && 'app shell /', !appJs && 'hashed app JS', !phaser && 'lazy Phaser JS'].filter(Boolean) };
  });
  check('O4 Offline cache contains app shell + app/Phaser bundles', missingAssets.missing.length === 0, JSON.stringify(missingAssets));
} catch (error) {
  console.error(error?.stack || error);
  failures++;
} finally {
  await context.close();
  await browser.close();
}
console.log(`\nE2E-OFFLINE-V0912: ${4 - failures}/4 passed`);
process.exit(failures ? 1 : 0);
