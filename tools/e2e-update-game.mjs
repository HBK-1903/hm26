// Real game + real service worker: an update must save the active career before reloading.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const dist = resolve('dist');
const rawWorker = readFileSync(join(dist, 'sw.js'), 'utf8');
const originalVersion = /const BUILD_VERSION = '([0-9a-f]{16})';/.exec(rawWorker)?.[1];
if (!originalVersion) throw new Error('Build a versioned worker before running this test');
let release = 'A';
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  res.setHeader('Cache-Control', 'no-store');
  if (pathname === '/sw.js') {
    res.setHeader('Content-Type', 'text/javascript');
    const buildVersion = release === 'A' ? 'aaaaaaaaaaaaaaaa' : 'bbbbbbbbbbbbbbbb';
    return res.end(rawWorker.replace(`const BUILD_VERSION = '${originalVersion}';`, `const BUILD_VERSION = '${buildVersion}';`));
  }
  const target = resolve(dist, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!target.startsWith(dist + '/') || !existsSync(target) || !statSync(target).isFile()) { res.statusCode = 404; return res.end('not found'); }
  res.setHeader('Content-Type', mime[extname(target)] || 'application/octet-stream');
  res.end(readFileSync(target));
});
await new Promise((resolveServer) => server.listen(0, '127.0.0.1', resolveServer));
const base = `http://127.0.0.1:${server.address().port}`;
const executablePath = process.env.HM26_CHROMIUM;
const browser = await chromium.launch(executablePath ? { executablePath, headless: true, args: ['--no-sandbox', '--single-process', '--no-zygote', '--disable-gpu', '--disable-dev-shm-usage'] } : {});
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'tr' });
let passed = 0, failed = 0;
const pageErrors = [];
const check = (name, condition, detail = '') => { condition ? passed++ : failed++; console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
const readSave = (page) => page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => { const r = indexedDB.open('manager26', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  const record = await new Promise((resolve, reject) => { const r = db.transaction('saves').objectStore('saves').get(1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  db.close(); return record ?? null;
});
const waitForSave = async (page) => {
  const until = Date.now() + 12_000;
  while (Date.now() < until) { const record = await readSave(page); if (record) return record; await page.waitForTimeout(100); }
  throw new Error('Kariyer kaydı oluşmadı');
};
const notice = async (page) => { await page.getByRole('button', { name: 'Anladım' }).first().click({ timeout: 2000 }).catch(() => {}); };
const alertAccept = (page, messages) => page.once('dialog', (dialog) => { messages.push(dialog.message()); void dialog.accept(); });

try {
  const page = await context.newPage(); page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { const reg = await navigator.serviceWorker.ready; if (reg.active.state !== 'activated') await new Promise((resolve) => reg.active.addEventListener('statechange', () => { if (reg.active.state === 'activated') resolve(); })); });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.getByRole('button', { name: /Başla|Kayıt Yuvaları/ }).first().click();
  await page.getByText('Yeni Kariyer — Yuva 1').click();
  await page.locator('input').first().fill('Güncelleme Testi');
  await page.getByText('Eski Futbolcu').first().click();
  for (let i = 0; i < 6 && !(await page.getByText('Denizli Yeşilova').count()); i++) await page.getByRole('button', { name: 'Devam', exact: true }).first().click();
  await page.getByText('Denizli Yeşilova').first().click();
  await page.getByRole('button', { name: /Kulüp Brifingine Git/ }).click();
  await page.getByRole('button', { name: /Kariyeri Başlat/ }).click();
  await notice(page);
  const initial = await waitForSave(page);
  check('A worker kontrolünde gerçek kariyer oluşturuldu', initial.blob.career.manager.name === 'Güncelleme Testi');

  const oldTab = await context.newPage(); oldTab.on('pageerror', (error) => pageErrors.push(error.message));
  await oldTab.goto(base, { waitUntil: 'networkidle' });
  await oldTab.getByRole('button', { name: /Devam Et —/ }).click();
  await notice(oldTab);
  await oldTab.getByRole('button', { name: /Sonraki Gün|Maç Merkezine Git/ }).first().waitFor();
  await page.locator('nav[aria-label="Ana gezinme"]').getByRole('button', { name: 'Daha' }).click();
  await page.getByRole('dialog', { name: 'Kulüp ve kariyer' }).getByRole('button', { name: 'Ayarlar', exact: true }).click();
  await page.evaluate(() => {
    const proto = IDBDatabase.prototype; window.__originalTransaction = proto.transaction;
    proto.transaction = function (...args) {
      if (args[1] === 'readwrite') throw new DOMException('quota', 'QuotaExceededError');
      return window.__originalTransaction.apply(this, args);
    };
  });
  await page.getByRole('switch', { name: 'Yüksek kontrast' }).click();
  release = 'B';
  await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); await reg.update(); });
  const update = page.getByRole('region', { name: 'Uygulama güncellemesi' });
  await update.waitFor({ timeout: 20_000 });
  check('Yeni sürüm kullanıcı onayı için oyun içinde bekler', await update.isVisible() && await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()).waiting));
  const confirmations = [];
  alertAccept(page, confirmations);
  await update.getByRole('button', { name: 'Güncelle', exact: true }).click();
  await update.getByText(/Kariyer kaydedilemedi; güncelleme yapılmadı/).waitFor({ timeout: 15_000 });
  check('Kaydetme hatasında güncelleme ve yeniden açılış durdurulur', await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()).waiting) && (await readSave(page)).blob.career.settings.highContrast === initial.blob.career.settings.highContrast);
  check('Güncelleme öncesi maçın baştan oynanacağı bildirilir', confirmations.some((m) => /devam eden maç baştan oynanır/i.test(m)));

  await page.evaluate(() => { IDBDatabase.prototype.transaction = window.__originalTransaction; });
  alertAccept(page, confirmations);
  const reload = page.waitForEvent('load', { timeout: 20_000 });
  await update.getByRole('button', { name: 'Güncelle', exact: true }).click();
  await reload;
  await page.getByRole('button', { name: /Devam Et —/ }).waitFor();
  const after = await waitForSave(page);
  check('Başarılı güncelleme en son kariyer ayarını kaydedip yeniden açar', after.blob.career.settings.highContrast !== initial.blob.career.settings.highContrast);
  check('B sürümü etkinleşir ve bekleyen worker kalmaz', await page.evaluate(async () => !(await navigator.serviceWorker.getRegistration()).waiting && (await caches.keys()).some((key) => key.endsWith('bbbbbbbbbbbbbbbb'))));
  const oldNotice = oldTab.getByRole('region', { name: 'Uygulama güncellemesi' });
  await oldNotice.waitFor();
  check('Başka açık sekme kendiliğinden yenilenmez; sürüm uyarısı görür', await oldTab.getByRole('button', { name: /Sonraki Gün|Maç Merkezine Git/ }).first().isVisible() && await oldNotice.isVisible());
  alertAccept(oldTab, confirmations);
  await oldNotice.getByRole('button', { name: 'Güncelle', exact: true }).click();
  await oldNotice.getByText(/Kariyer kaydedilemedi; güncelleme yapılmadı/).waitFor({ timeout: 10_000 });
  check('Bayat sekme çakışmada yenilenip ilerlemesini sessizce kaybetmez', await oldTab.getByText(/Bu yuva başka bir sekmede değişti/).isVisible() && (await readSave(oldTab)).meta.updatedAt === after.meta.updatedAt);
  check('Güncelleme akışında yakalanmamış tarayıcı hatası yok', pageErrors.length === 0, pageErrors.join(' | '));
} catch (error) { failed++; console.error(error?.stack || error); }
finally { await context.close(); await browser.close(); await new Promise((resolveServer) => server.close(resolveServer)); }
console.log(`\n${passed}/${passed + failed} aktif oyun güncelleme kontrolü geçti.`);
process.exit(failed ? 1 : 0);
