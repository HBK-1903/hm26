// Production build, service worker and real IndexedDB: pause a match online,
// turn the browser offline, reload the actual app and resume the same point.
import { chromium } from 'playwright';
import { createServer as createNetServer } from 'node:net';
import { preview } from 'vite';
const probe = createNetServer();
await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const server = await preview({ preview: { host: '127.0.0.1', port, strictPort: true }, logLevel: 'silent' });
const base = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ ...(process.env.HM26_CHROMIUM ? { executablePath: process.env.HM26_CHROMIUM } : {}), headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'tr', reducedMotion: 'reduce' });
const page = await context.newPage(); page.setDefaultTimeout(15000); page.on('dialog', (dialog) => dialog.accept());
const errors = []; page.on('pageerror', (error) => errors.push(error.message));
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => { ok ? passed++ : failed++; console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
const readSave = () => page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => { const request = indexedDB.open('manager26', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
  const result = await new Promise((resolve, reject) => { const request = db.transaction('saves').objectStore('saves').get(1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
  db.close(); return result ?? null;
});
const waitSave = async (predicate) => {
  const end = Date.now() + 15000;
  while (Date.now() < end) { const value = await readSave(); if (predicate(value)) return value; await page.waitForTimeout(100); }
  throw new Error('Gerçek IndexedDB kaydı zamanında oluşmadı.');
};
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.getByRole('button', { name: /Başla|Kayıt Yuvaları/ }).first().click();
  await page.getByText('Yeni Kariyer — Yuva 1').first().click();
  await page.locator('input').first().fill('Çevrimdışı Testi');
  await page.getByText('Eski Futbolcu').first().click();
  for (let i = 0; i < 6 && !(await page.getByText('Denizli Yeşilova').count()); i++) await page.getByRole('button', { name: 'Devam', exact: true }).first().click();
  await page.getByText('Denizli Yeşilova').first().click();
  await page.getByRole('button', { name: /Kulüp Brifingine Git/ }).click();
  await page.getByRole('button', { name: /Kariyeri Başlat/ }).click();
  const notice = page.getByRole('button', { name: 'Anladım' });
  if (await notice.count()) await notice.first().click();
  await waitSave((saved) => !!saved?.blob?.career);
  await page.reload(); // leave the provider before editing the isolated test fixture
  await page.getByRole('button', { name: /Devam Et —/ }).waitFor();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const request = indexedDB.open('manager26', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('saves', 'readwrite'); const store = tx.objectStore('saves'); const request = store.get(1);
      request.onsuccess = () => {
        const entry = request.result, blob = entry.blob;
        const fixture = blob.fixtures.find((item) => item.comp === 'lig' && (item.homeId === blob.career.clubId || item.awayId === blob.career.clubId));
        fixture.day = blob.career.day; fixture.played = false;
        store.put(entry);
      };
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.getByRole('button', { name: /Devam Et —/ }).click();
  await page.getByRole('button', { name: /Maç Merkezine Git/ }).first().click();
  await page.getByRole('button', { name: /Maça Başla/ }).first().click();
  await page.getByRole('timer').waitFor();
  await page.getByRole('button', { name: 'Maçı duraklat' }).click();
  await page.getByTestId('live-checkpoint-status').getByText('Maç ilerlemesi kaydedildi.').waitFor();
  const online = await waitSave((saved) => !!saved?.blob?.liveMatchCheckpoint?.view?.paused);
  const timer = await page.getByRole('timer').innerText();
  const scoreboard = await page.getByLabel('Sabit maç skorbordu').innerText();
  check('Üretim uygulamasında maç gerçek IndexedDB yuvasına kaydedilir', online.blob.version === 5 && online.blob.liveMatchCheckpoint.view.paused);
  check('Üretim uygulamasını service worker kontrol ediyor', await page.evaluate(() => !!navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  check('Tarayıcı gerçekten çevrimdışı ve önbellekteki uygulama açıldı', await page.evaluate(() => !navigator.onLine && !!navigator.serviceWorker.controller));
  await page.getByRole('button', { name: /Devam Et —/ }).first().click();
  await page.getByRole('button', { name: 'Maça Devam Et', exact: true }).click();
  await page.getByTestId('live-checkpoint-status').getByText('Maç ilerlemesi kaydedildi.').waitFor();
  const offline = await waitSave((saved) => saved?.blob?.liveMatchCheckpoint?.checksum === online.blob.liveMatchCheckpoint.checksum);
  check('Çevrimdışı yenileme aynı skor, dakika, duraklama ve maç durumunu geri getirir', await page.getByRole('timer').innerText() === timer && await page.getByLabel('Sabit maç skorbordu').innerText() === scoreboard && await page.getByRole('button', { name: 'Maça devam et' }).isVisible() && offline.blob.liveMatchCheckpoint.stateHash === online.blob.liveMatchCheckpoint.stateHash);
  await page.getByRole('button', { name: '1 kat hız' }).click();
  const changed = await waitSave((saved) => saved?.blob?.liveMatchCheckpoint?.view?.speed === 'x1');
  check('Çevrimdışı yeni maç tercihi de IndexedDB üzerinde güvenle saklanır', changed.blob.liveMatchCheckpoint.checksum !== online.blob.liveMatchCheckpoint.checksum && await page.evaluate(() => !navigator.onLine));
  check('Üretim çevrimdışı akışında yakalanmamış tarayıcı hatası yok', errors.length === 0, errors.join(' | '));
} catch (error) { failed++; console.error(`❌ Çevrimdışı canlı maç: ${error?.stack ?? error}`); }
await browser.close();
await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
console.log(`\n${passed}/${passed + failed} çevrimdışı canlı maç Chromium kontrolü geçti.`);
if (failed) process.exitCode = 1;
