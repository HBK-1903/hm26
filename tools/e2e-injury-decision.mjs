// Real-Chromium check of the LiveMatch injury decision, using a deterministic injected event.
import { chromium } from 'playwright';
import { createServer as createNetServer } from 'node:net';
import { createServer as createViteServer } from 'vite';

const probe = createNetServer();
await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
let server, passed = 0, failed = 0;
const check = (name, condition, detail = '') => {
  condition ? passed++ : failed++;
  console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`);
};
try {
  server = await createViteServer({ server: { host: '127.0.0.1', port, strictPort: true }, logLevel: 'silent' });
  await server.listen();
  const executablePath = process.env.HM26_CHROMIUM;
  const launchOptions = executablePath ? { executablePath, args: ['--no-sandbox', '--single-process', '--no-zygote', '--disable-dev-shm-usage'] } : {};
  for (const [width, side] of [[320, 'home'], [390, 'away']]) {
    const browser = await chromium.launch(launchOptions);
    try {
      const page = await browser.newPage({ viewport: { width, height: width === 320 ? 720 : 844 }, locale: 'tr' });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${port}/tools/injury-decision-fixture.html?side=${side}`);
      await page.getByRole('button', { name: '4 kat hız' }).click();
      const injury = page.getByRole('dialog', { name: 'Sakatlık Kararı' });
      await injury.waitFor({ state: 'visible', timeout: 10000 });
      check(`${width}px ${side}: gerçek sakatlık kararı açılır`, /QA: oyuncu sakatlandı/.test(await injury.innerText()));
      const clock = await page.getByRole('timer').innerText();
      await page.waitForTimeout(200);
      check(`${width}px ${side}: karar beklerken maç saati durur`, clock === await page.getByRole('timer').innerText());
      const beforeStep = await page.evaluate(() => window.__injuryFixture.state().steps);
      await injury.getByRole('button', { name: /Dönüşünü bekle/ }).click();
      // A duplicate modal pauses the engine; require a subsequent real UI step.
      await page.waitForFunction((step) => window.__injuryFixture.state().steps > step, beforeStep, { timeout: 5000 });
      const dialogsAfterWait = (await page.locator('[role="dialog"]').allTextContents()).join(' ');
      const waiting = await page.evaluate(() => window.__injuryFixture.state());
      check(`${width}px ${side}: tedavi seçimi yalnız bir kez işlenir ve aynı pencere açılmaz`, waiting.phase === 'waiting' && waiting.waitCalls === 1 && !/Tedavi kararı: iki maç dakikası/.test(dialogsAfterWait), JSON.stringify(waiting));
      await page.getByRole('tab', { name: 'Spiker ve Maç Günlüğü' }).click();
      await page.evaluate(() => window.__injuryFixture.allowReturn());
      await page.waitForFunction(() => window.__injuryFixture.state().phase === 'returned', null, { timeout: 5000 });
      await page.waitForFunction(() => document.body.textContent?.includes('QA: oyuncu tedaviden döndü.'), null, { timeout: 5000 });
      const dialogsAfterReturn = (await page.locator('[role="dialog"]').allTextContents()).join(' ');
      check(`${width}px ${side}: dönüş yeni sakatlık kararı açmaz`, !/QA: oyuncu tedaviden döndü/.test(dialogsAfterReturn));
      // An unrelated genuine decision may be displayed; resolve it before opening the feed.
      const dialog = page.getByRole('dialog');
      if (await dialog.count()) await dialog.first().getByRole('button', { name: 'Kapat', exact: true }).click();
      const feed = await page.getByRole('log', { name: 'Maç olay akışı' }).innerText();
      check(`${width}px ${side}: tedavi kararı ve dönüş gerçek akışta kalır`, /Tedavi kararı: iki maç dakikası/.test(feed) && /QA: oyuncu tedaviden döndü/.test(feed));
      check(`${width}px ${side}: yakalanmamış tarayıcı hatası yok`, errors.length === 0, errors.join(' | '));
    } catch (error) {
      failed++;
      console.error(`❌ ${width}px ${side}:`, error);
    } finally {
      await browser.close();
    }
  }
} finally {
  if (server) await server.close();
}
console.log(`\nINJURY-DECISION-BROWSER: ${passed}/${passed + failed}`);
if (failed) process.exitCode = 1;
