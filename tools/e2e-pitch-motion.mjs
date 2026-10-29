// Deterministic real-Chromium motion checks against the actual Phaser scene and React wrapper.
// The isolated fixture is served by Vite only for this test; it is not part of the PWA.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

async function freePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  return port;
}
const port = await freePort();
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0', '--port', String(port), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
let serverLog = '';
server.stdout.on('data', (data) => { serverLog += data; });
server.stderr.on('data', (data) => { serverLog += data; });
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Vite başlamadı: ${serverLog}`)), 30000);
  const onData = () => { if (/Local:|Network:/.test(serverLog)) { clearTimeout(timer); resolve(); } };
  server.stdout.on('data', onData);
  server.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Vite erken kapandı (${code}): ${serverLog}`)); });
});
let browser;
let total = 0, failed = 0;
const errors = [];
const check = (name, condition, detail = '') => {
  total++; if (!condition) failed++;
  console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`);
};
const closeTo = (a, b, tolerance = 1) => Math.abs(a - b) <= tolerance;
const samePoint = (a, b, tolerance = 0.2) => closeTo(a.x, b.x, tolerance) && closeTo(a.y, b.y, tolerance);
try {
  await ready;
  const executablePath = process.env.HM26_CHROMIUM;
  browser = await chromium.launch(executablePath ? { executablePath, args: ['--no-sandbox', '--single-process', '--no-zygote', '--disable-dev-shm-usage'] } : {});
  const page = await browser.newPage({ viewport: { width: 800, height: 620 }, locale: 'tr' });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/tools/pitch-motion-fixture.html`);
  await page.waitForFunction(() => window.__pitchReady, null, { timeout: 15000 });
  await page.locator('#react-pitch canvas[role="img"]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(350);
  const snapshot = () => page.evaluate(() => window.__pitchFixture.snapshot());
  const update = (patch) => page.evaluate((value) => window.__pitchFixture.update(value), patch);
  const fire = (event) => page.evaluate((value) => window.__pitchFixture.event(value), event);
  const initial = await snapshot();
  check('Durdurulmuş başlangıçta 22 oyuncu köşeden gelmeden doğru yerde', initial.count === 22 && initial.paused && Object.values(initial.sprites).every((p) => p.x > 20 && p.y > 20 && samePoint(p, p.target)), `oyuncu=${initial.count} duraklatıldı=${initial.paused}`);
  check('İlk top ve gerçek sahibi başlangıçta sahada aynı bölgede', closeTo(initial.ball.x, initial.sprites['home-8'].x, 1) && Math.abs(initial.ball.y - initial.sprites['home-8'].y) < 15);

  // The React wrapper must also receive that snapshot after asynchronous boot,
  // even though no match tick is allowed to happen while paused.
  const png = await page.locator('#react-pitch canvas').screenshot();
  const colors = await page.evaluate(async (base64) => {
    const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let red = 0, blue = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      if (r > 110 && r > g * 1.4 && r > b * 1.3) red++;
      if (b > 100 && b > r * 1.3 && b > g * 1.1) blue++;
    }
    return { red, blue };
  }, png.toString('base64'));
  check('Asenkron React açılışı duraklatılmışken iki takımı da çizer', colors.red > 200 && colors.blue > 200, JSON.stringify(colors));

  await update({ paused: false });
  await page.waitForTimeout(70);
  await update({ runtime: { x: 80, y: 18, z: 24, owner: 'home', ownerId: 'home-10', activeIds: ['home-10'] } });
  const start = await snapshot();
  await page.waitForTimeout(70); const mid1 = await snapshot();
  await page.waitForTimeout(85); const mid2 = await snapshot();
  await page.waitForTimeout(190); const landed = await snapshot();
  const expectedX = 17.6 + 0.8 * (320 - 35.2), expectedY = 17.6 + 0.18 * (440 - 35.2);
  check('Top tek karede takılmadan birden çok karede ilerler', mid1.ball.x > start.ball.x + 2 && mid2.ball.x > mid1.ball.x + 2, `${start.ball.x.toFixed(1)} → ${mid1.ball.x.toFixed(1)} → ${mid2.ball.x.toFixed(1)}`);
  check('Havalanan top hedefe ulaşıp tekrar yere iner', closeTo(landed.ball.x, expectedX, 2) && closeTo(landed.ball.y, expectedY, 2) && closeTo(landed.ballY, landed.ball.y, 1), JSON.stringify(landed.ball));
  check('Top sahibi ve hareket hedefi güncel motor verisinden çizilir', Math.abs(landed.sprites['home-10'].target.x - expectedX) < 1 && Math.abs(landed.sprites['home-10'].target.y - expectedY) < 15);

  await update({ runtime: { x: 20, y: 82, z: 0, owner: 'home', ownerId: 'home-8', activeIds: ['home-8'] } });
  await page.waitForTimeout(65);
  await update({ paused: true });
  await page.waitForTimeout(70); const frozen1 = await snapshot();
  await page.waitForTimeout(260); const frozen2 = await snapshot();
  check('Maç duraklatılınca top ve oyuncu animasyonları gerçekten donar', frozen2.paused && samePoint(frozen1.ball, frozen2.ball) && samePoint(frozen1.sprites['home-8'], frozen2.sprites['home-8']));
  await update({ paused: false });
  await page.waitForTimeout(310); const resumed = await snapshot();
  check('Devam edilince donmuş hareket kaldığı yerden sürer', !resumed.paused && !samePoint(frozen2.ball, resumed.ball, 3));

  await update({ reduceMotion: true, runtime: { x: 20, y: 50, z: 0, owner: 'home', ownerId: 'home-6', activeIds: ['home-6'] } });
  await update({ reduceMotion: false, stepMs: 640, runtime: { x: 80, y: 50, z: 0, owner: 'home', ownerId: 'home-6', activeIds: ['home-6'] } });
  const slowStart = await snapshot(); await page.waitForTimeout(145); const slowMid = await snapshot();
  const slowProgress = (slowMid.ball.x - slowStart.ball.x) / (expectedX - slowStart.ball.x);
  await update({ stepMs: 90, runtime: { x: 20, y: 50, z: 0, owner: 'home', ownerId: 'home-6', activeIds: ['home-6'] } });
  await page.waitForTimeout(180); const fast = await snapshot();
  check('1× ve 4× hareket uzunlukları seçilen hıza uyumlu', slowProgress > 0 && slowProgress < 0.65 && closeTo(fast.ball.x, 74.56, 3), `1× ilerleme=${slowProgress.toFixed(2)} 4× x=${fast.ball.x.toFixed(1)}`);

  await update({ paused: true }); await page.waitForTimeout(70);
  await page.evaluate(() => {
    const fixture = window.__pitchFixture;
    // Keep the actual slot but replace its player, just like a substitution.
    const current = fixture.snapshot();
    const groups = ['GK','FB','CB','CB','FB','DM','CM','CM','WG','WG','ST'];
    const players = groups.map((group, i) => ({ id: i === 5 ? 'home-sub' : `home-${i}`, name: `P ${i}`, kitNumber: i + 1, group, fitness: 85, rating: 6.5, yellow: 0, red: 0 }));
    fixture.update({ home: { side: 'home', formation: '4-1-4-1', color1: '#d33128', color2: '#fff0d4', width: 50, defLine: 'normal', players } });
  });
  const sub = await snapshot();
  check('Değişiklikte yeni oyuncu (0,0) yerine kendi yuvasında belirir', sub.count === 22 && !sub.sprites['home-5'] && sub.sprites['home-sub'] && samePoint(sub.sprites['home-sub'], sub.sprites['home-sub'].target) && sub.sprites['home-sub'].x > 20 && sub.sprites['home-sub'].y > 20);

  await update({ paused: false, stepMs: 260, runtime: { x: 20, y: 82, z: 0, owner: 'home', ownerId: 'home-10', activeIds: ['home-10'] } });
  await page.waitForTimeout(70);
  await fire({ kind: 'goal', side: 'home', path: ['L-D', 'L-M', 'C-M', 'C-A'], actors: ['home-10'] });
  await page.waitForTimeout(65);
  await update({ runtime: { x: 80, y: 50, z: 0, owner: 'home', ownerId: 'home-6', activeIds: ['home-6'] } });
  await fire({ kind: 'info', side: 'home', path: [], actors: [] });
  const inFlight = await snapshot();
  check('Metin olayı devam eden top yolunu kesmez; replik motor verisini değiştirmez', inFlight.cinematic && JSON.stringify(inFlight.runtime.activeIds) === '["home-6"]');
  await page.waitForTimeout(900); const caughtUp = await snapshot();
  check('Olay bitince top arada güncellenen en son oyun konumuna yetişir', !caughtUp.cinematic && closeTo(caughtUp.ball.x, expectedX, 2) && closeTo(caughtUp.ball.y, 220, 2), JSON.stringify(caughtUp.ball));
  await fire({ kind: 'chance', side: 'home', path: ['L-M', 'C-M'] });
  await page.waitForTimeout(70); const nextTrail = await snapshot();
  check('Sonraki pozisyonda pas izi yeniden görünür', nextTrail.trailAlpha > 0.5, `opacity=${nextTrail.trailAlpha.toFixed(2)}`);

  await fire({ kind: 'goal', side: 'home', path: ['L-D', 'L-M', 'C-M', 'C-A'], actors: ['home-10'] });
  await page.waitForTimeout(70);
  await update({ reduceMotion: true });
  await page.waitForTimeout(80); const reduced1 = await snapshot();
  await page.waitForTimeout(240); const reduced2 = await snapshot();
  check('Azaltılmış hareket açılınca aktif kamera, efekt ve top hareketi durur', reduced1.reduced && !reduced1.cinematic && reduced1.cueCount === 0 && closeTo(reduced1.cameraZoom, 1, 0.001) && samePoint(reduced1.ball, reduced2.ball) && samePoint(reduced1.sprites['home-6'], reduced2.sprites['home-6']));
  await update({ paused: true, completed: true }); await page.waitForTimeout(70);
  const ended1 = await snapshot(); await page.waitForTimeout(200); const ended2 = await snapshot();
  check('Son düdük sonrası saha sabit kalır ve incelenebilir', ended2.paused && samePoint(ended1.ball, ended2.ball) && ended2.count === 22);
  await page.evaluate(() => window.__pitchFixture.resize(280, 380));
  await page.waitForTimeout(100); const resized = await snapshot();
  check('Saha yeniden boyutlanınca top ve oyuncular yeni koordinatlara oturur', resized.width === 280 && resized.height === 380 && resized.ball.x > 15 && resized.ball.x < 270 && Object.values(resized.sprites).every((p) => p.x > 10 && p.y > 10), `${resized.width}×${resized.height}`);
  await page.evaluate(() => window.__pitchFixture.resizeReact(260, 360));
  await page.waitForFunction(() => { const canvas = document.querySelector('#react-pitch canvas'); return canvas?.width === 260 && canvas?.height === 360; }, null, { timeout: 1000 });
  check('Duraklatılmış React sahası pencere boyutuna hemen uyum sağlar', await page.locator('#react-pitch canvas').evaluate((canvas) => canvas.width === 260 && canvas.height === 360));
  check('Tarayıcıda yakalanmamış saha hatası yok', errors.length === 0, errors.join(' | '));
} catch (error) {
  failed++; console.error('❌ Phaser tarayıcı testi:', error);
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
console.log(`\nPITCH-MOTION-BROWSER: ${total - failed}/${total}`);
if (failed) process.exitCode = 1;
