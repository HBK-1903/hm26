// Real Chromium, isolated local origin: two releases, waiting update, offline and old tab.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const template = readFileSync('public/sw.js', 'utf8');
let release = 'A';
const bundle = (v) => `/assets/app-${v === 'A' ? 'aaaaaaaa' : v === 'B' ? 'bbbbbbbb' : 'cccccccc'}.js`;
const version = (v) => (v === 'A' ? 'a' : v === 'B' ? 'b' : 'c').repeat(16);
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  res.setHeader('Cache-Control', 'no-store');
  if (path === '/sw.js') {
    res.setHeader('Content-Type', 'text/javascript');
    const files = ['/', bundle(release), '/assets/theme.css', ...(release === 'C' ? ['/missing-file'] : [])];
    return res.end(template.replace('const PRECACHE = __PRECACHE__;', `const PRECACHE = ${JSON.stringify(files)};`).replace("const BUILD_VERSION = '__BUILD_VERSION__';", `const BUILD_VERSION = '${version(release)}';`));
  }
  if (path === '/') {
    res.setHeader('Content-Type', 'text/html');
    return res.end(`<!doctype html><html><head><meta name="release" content="${release}"></head><body>${release}<script src="${bundle(release)}"></script></body></html>`);
  }
  if (path === bundle(release)) {
    res.setHeader('Content-Type', 'text/javascript');
    return res.end(`window.loadedBundle = '${release}';`);
  }
  if (path === '/assets/theme.css') { res.setHeader('Content-Type', 'text/css'); return res.end(`/* ${release} */`); }
  res.statusCode = 404;
  res.end('missing');
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const executablePath = process.env.HM26_CHROMIUM;
const browser = await chromium.launch(executablePath ? { executablePath, headless: true, args: ['--no-sandbox', '--single-process', '--no-zygote', '--disable-gpu', '--disable-dev-shm-usage'] } : {});
const context = await browser.newContext();
let passed = 0, failed = 0;
const check = (name, condition, detail = '') => { condition ? passed++ : failed++; console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
const state = (page) => page.evaluate(() => ({ html: document.querySelector('meta[name=release]')?.content, js: window.loadedBundle }));
const awaitWorker = (page, expected) => page.evaluate(async (expectedState) => {
  const registration = await navigator.serviceWorker.getRegistration();
  if (expectedState === 'waiting' && registration.waiting) return 'waiting';
  const worker = registration.installing || registration.waiting;
  if (!worker) throw new Error(`No installing worker while expecting ${expectedState}`);
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Worker ${expectedState} timeout, state=${worker.state}`)), 20_000);
    const changed = () => {
      if (expectedState === 'waiting' && worker.state === 'installed') { clearTimeout(timer); resolve('waiting'); }
      else if (expectedState === 'redundant' && worker.state === 'redundant') { clearTimeout(timer); resolve('redundant'); }
      else if (worker.state === 'redundant') { clearTimeout(timer); reject(new Error('Worker unexpectedly redundant')); }
    };
    worker.addEventListener('statechange', changed);
    changed();
  });
}, expected);
const getAsset = (page, path) => page.evaluate(async (p) => { const r = await fetch(p); return r.text(); }, path);

try {
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'load' });
  await page.evaluate(async () => {
    await caches.open('other-product-cache');
    const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
    await navigator.serviceWorker.ready;
    if (registration.active?.state !== 'activated') await new Promise((resolve) => registration.active.addEventListener('statechange', () => { if (registration.active.state === 'activated') resolve(); }));
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  check('A sürümü kurulup sayfayı kontrol eder', JSON.stringify(await state(page)) === JSON.stringify({ html: 'A', js: 'A' }));
  const oldTab = await context.newPage();
  await oldTab.goto(base);
  check('İkinci sekme A sürümünü açar', (await state(oldTab)).js === 'A');

  release = 'B';
  await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); await reg.update(); });
  await awaitWorker(page, 'waiting');
  const cachesBefore = await page.evaluate(async () => {
    const keys = await caches.keys();
    const a = await caches.open(keys.find((k) => k.endsWith('aaaaaaaaaaaaaaaa')));
    const b = await caches.open(keys.find((k) => k.endsWith('bbbbbbbbbbbbbbbb')));
    return { keys, a: await (await a.match('/assets/theme.css')).text(), b: await (await b.match('/assets/theme.css')).text() };
  });
  check('Bekleyen B ayrı cache kullanır; sabit URL içeriği A/B olarak korunur', cachesBefore.a === '/* A */' && cachesBefore.b === '/* B */', JSON.stringify(cachesBefore));
  await page.reload();
  check('Onay verilmeden çevrimiçiyken yeniden açılış A kabuğunda kalır', (await state(page)).html === 'A' && (await state(page)).js === 'A');
  await context.setOffline(true);
  await page.reload();
  check('Onay verilmeden çevrimdışıyken A kabuğu ve varlıkları korunur', (await state(page)).js === 'A' && (await getAsset(page, '/assets/theme.css')) === '/* A */');

  await context.setOffline(false);
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('controllerchange timeout')), 20_000);
      navigator.serviceWorker.addEventListener('controllerchange', () => { clearTimeout(timer); resolve(); }, { once: true });
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    });
  });
  await page.reload();
  check('Kullanıcı onayıyla B sürümü açılır', (await state(page)).html === 'B' && (await state(page)).js === 'B' && (await getAsset(page, '/assets/theme.css')) === '/* B */');
  check('Başka açık eski sekmenin hash’li eski kodu korunur', (await state(oldTab)).js === 'A' && (await getAsset(oldTab, bundle('A'))).includes("'A'"));
  check('Başka uygulamanın cache’i silinmez', await page.evaluate(async () => (await caches.keys()).includes('other-product-cache')));
  await context.setOffline(true);
  await page.reload();
  check('Onaydan sonra B çevrimdışı da açılır', (await state(page)).js === 'B');

  await context.setOffline(false);
  release = 'C';
  await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); await reg.update(); });
  await awaitWorker(page, 'redundant');
  await context.setOffline(true);
  await page.reload();
  check('Eksik dosyalı C kurulumu başarısız olsa da B çevrimdışı bozulmaz', (await state(page)).html === 'B' && (await state(page)).js === 'B');
  check('Başarısız kurulumun yarım cache’i temizlenir', !(await page.evaluate(async () => (await caches.keys()).some((name) => name.endsWith('cccccccccccccccc')))));
} catch (error) { failed++; console.error(error?.stack || error); }
finally { await context.close(); await browser.close(); await new Promise((resolve) => server.close(resolve)); }
console.log(`\n${passed}/${passed + failed} service-worker tarayıcı kontrolü geçti.`);
process.exit(failed ? 1 : 0);
