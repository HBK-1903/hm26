// Real Chromium: seekable arrival choreography, mobile layout and motion preferences.
import { chromium } from 'playwright';
import { createServer as createNetServer } from 'node:net';
import { createServer as createViteServer } from 'vite';
import { mkdirSync } from 'node:fs';

const probe = createNetServer();
await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const server = await createViteServer({ server: { host: '127.0.0.1', port, strictPort: true }, logLevel: 'silent' });
await server.listen();
const base = `http://127.0.0.1:${port}/tools/arrival-scene-fixture.html`;
const launch = () => chromium.launch({ ...(process.env.HM26_CHROMIUM ? { executablePath: process.env.HM26_CHROMIUM } : {}), headless: true, args: ['--no-sandbox'] });
const output = process.env.HM26_SCREENSHOTS;
if (output) mkdirSync(output, { recursive: true });
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => { if (ok) passed++; else failed++; console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
const seek = (page, value) => page.getByRole('slider', { name: 'Geliş sahnesi zamanı' }).evaluate((input, next) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(next));
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}, value);
const snap = async (page) => page.evaluate(() => {
  const get = (selector, name) => document.querySelector(selector)?.getAttribute(name) ?? '';
  return {
    bus: get('[data-testid="arrival-bus"]', 'data-x'),
    door: get('[data-testid="arrival-bus"]', 'data-door'),
    wheel: get('[data-testid="arrival-wheel"]', 'data-angle'),
    barrier: get('[data-testid="arrival-barrier"]', 'data-open'),
    gate: get('[data-testid="arrival-stadium-gate"]', 'data-open'),
    camera: get('[data-testid="arrival-camera"]', 'viewBox'),
    fan: get('[data-testid="arrival-fan"]', 'data-wave'),
    flash: get('[data-testid="arrival-camera-flash"]', 'opacity'),
    confetti: document.querySelector('[data-testid="arrival-confetti"]')?.innerHTML ?? '',
    phase: get('[data-testid="arrival-scene"]', 'data-phase'),
    passengers: [...document.querySelectorAll('[data-testid="arrival-passenger"]')].map((el) => ({ id: el.getAttribute('data-player-id'), position: el.getAttribute('transform'), progress: el.getAttribute('data-progress') })),
  };
});
const fits = (page) => page.evaluate(() => {
  const box = document.querySelector('[data-testid="arrival-scene"]').getBoundingClientRect();
  return document.documentElement.scrollWidth <= innerWidth + 1 && box.left >= -1 && box.right <= innerWidth + 1 && box.width >= 250;
});

try {
  for (const width of [320, 390]) {
    const browser = await launch();
    const context = await browser.newContext({ viewport: { width, height: 820 }, locale: 'tr' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.goto(`${base}?theme=${width === 320 ? 'light' : 'dark'}`);
      const scene = page.getByTestId('arrival-scene');
      await scene.waitFor();
      const expected = await page.evaluate(() => window.__arrivalFixturePlayers.slice(0, 6));
      check(`${width}px: sahne gerçek ev sahibi stadyumunu ve deplasman kulübünü gösterir`, (await scene.innerText()).includes('Vadi Park') && (await scene.innerText()).includes('Denizli Yeşilova') && (await scene.locator('svg').getAttribute('aria-label')).includes('Vadi Park'));
      check(`${width}px: yerleşim yatay taşmaz ve aşamalar erişilebilir`, await fits(page) && await scene.getByRole('list', { name: 'Geliş aşamaları' }).count() === 1 && await scene.getByRole('slider', { name: 'Geliş sahnesi zamanı' }).count() === 1);
      check(`${width}px: dört aşamanın adı kesilmeden okunur`, await scene.locator('.arrival__chapters li b').evaluateAll((nodes) => nodes.length === 4 && nodes.every((node) => node.scrollWidth <= node.clientWidth + 1)));
      const before = await snap(page); await page.waitForTimeout(700); const moving = await snap(page);
      check(`${width}px: otobüs, tekerlekler, taraftarlar ve kamera aynı anda gerçekten hareket eder`, Number(moving.bus) > Number(before.bus) + 2 && Number(moving.wheel) > Number(before.wheel) && moving.fan !== before.fan && moving.camera !== before.camera);
      await scene.getByRole('button', { name: 'Durdur', exact: true }).click();
      const frozen = await snap(page); await page.waitForTimeout(400); const still = await snap(page);
      check(`${width}px: duraklatma otobüs, kamera, taraftar ve flaş dahil her katmanı dondurur`, await scene.getAttribute('data-motion') === 'paused' && JSON.stringify(frozen) === JSON.stringify(still));
      await scene.getByRole('slider', { name: 'Geliş sahnesi zamanı' }).focus();
      await page.keyboard.press('Home');
      const start = await snap(page);
      check(`${width}px: klavyeyle başlangıçta kapılar kapalı, otobüs solda`, Number(start.bus) === -240 && Number(start.barrier) === 0 && Number(start.door) === 0 && start.passengers.length === 0);
      await seek(page, 200); const approach = await snap(page);
      check(`${width}px: yaklaşmada teker döner, güvenlik bariyeri kalkar`, Number(approach.bus) > Number(start.bus) && Number(approach.wheel) > 0 && Number(approach.barrier) > 0 && Number(approach.door) === 0);
      await seek(page, 330); const parked = await snap(page);
      await seek(page, 380); const opening = await snap(page);
      check(`${width}px: park sonrası kapı kademeli açılır, teker durur`, parked.bus === opening.bus && parked.wheel === opening.wheel && Number(parked.door) === 0 && Number(opening.door) > 0 && Number(opening.door) < 1);
      check(`${width}px: taraftar konfetileri sahne zamanına göre hareket eder`, !!approach.confetti && !!opening.confetti && approach.confetti !== opening.confetti);
      await seek(page, 580); const walking = await snap(page);
      check(`${width}px: stadyum kapısı açılır ve gerçek oyuncular sırayla inmeye başlar`, Number(walking.gate) > 0 && walking.passengers.length === 3 && walking.passengers.every((p, index) => p.id === expected[index].id));
      await seek(page, 700); const later = await snap(page);
      check(`${width}px: oyuncular yürür, sıradakiler arkadan gelir`, later.passengers.length === 5 && later.passengers[0].position !== walking.passengers[0].position && Number(later.passengers[0].progress) > Number(walking.passengers[0].progress));
      await seek(page, 580); const again = await snap(page);
      check(`${width}px: sürgü aynı ana dönünce sahnenin tüm katmanları aynı kareyi gösterir`, JSON.stringify(walking) === JSON.stringify(again));
      await page.getByRole('slider', { name: 'Geliş sahnesi zamanı' }).focus(); await page.keyboard.press('End');
      const last = await snap(page);
      check(`${width}px: son kare altı gerçek oyuncuyu, açık kapıyı ve giriş aşamasını gösterir`, last.passengers.length === 6 && last.passengers.every((p, index) => p.id === expected[index].id) && Number(last.gate) === 1 && last.phase === 'Takım stadyum girişinde' && await scene.locator('[aria-current="step"] b').innerText() === 'GİRİŞ');
      const sceneText = await scene.innerText();
      check(`${width}px: seçilen oyuncuların adları görünür, sahne maç başlatmaz`, expected.every((player) => sceneText.includes(player.name)) && !await page.getByRole('timer').count());
      if (output) await page.screenshot({ path: `${output}/arrival-${width}-${width === 320 ? 'light' : 'dark'}.png`, fullPage: true });
      if (width === 390) {
        await seek(page, 400); await scene.getByRole('button', { name: 'Devam Et' }).click();
        await page.waitForTimeout(350); const progressBeforeReplay = Number(await scene.getByRole('slider').inputValue());
        await scene.getByRole('button', { name: 'Yeniden Oynat' }).click(); await page.waitForTimeout(350);
        const afterReplay = Number(await scene.getByRole('slider').inputValue());
        check('Oynarken yeniden oynatma zamanı sıfırlar ve sıfırdan devam eder', progressBeforeReplay > 400 && afterReplay > 0 && afterReplay < 40 && await scene.getAttribute('data-motion') === 'playing', `${progressBeforeReplay} → ${afterReplay}`);
        await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
        await page.waitForFunction(() => document.querySelector('[data-testid="arrival-scene"]')?.getAttribute('data-motion') === 'paused');
        const hidden = await snap(page); await page.waitForTimeout(250);
        check('Arka sekmede animasyon durur ve kendiliğinden devam etmez', JSON.stringify(hidden) === JSON.stringify(await snap(page)));
        await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
        await scene.getByRole('button', { name: 'Devam Et' }).click();
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForFunction(() => document.querySelector('[data-testid="arrival-scene"]')?.getAttribute('data-motion') === 'reduced' && document.querySelector('[data-testid="arrival-scene"]')?.getAttribute('data-phase') === 'Takım stadyum girişinde');
        const reduced = await snap(page); await page.waitForTimeout(250);
        check('Sistem azaltılmış hareketi son kareyi sabitler ve oynatmayı kapatır', JSON.stringify(reduced) === JSON.stringify(await snap(page)) && await scene.getByRole('button', { name: 'Yeniden Oynat' }).isDisabled());
        await seek(page, 200); const reducedSeek = await snap(page); await page.waitForTimeout(200);
        check('Azaltılmış harekette sürgüyle seçilen kare de sabit kalır', Number(reducedSeek.bus) < 114 && JSON.stringify(reducedSeek) === JSON.stringify(await snap(page)) && await scene.getAttribute('data-motion') === 'reduced');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.waitForFunction(() => document.querySelector('[data-testid="arrival-scene"]')?.getAttribute('data-motion') === 'paused');
        check('Sistem tercihi kapatılınca sahne kendiliğinden başlamaz', await scene.getAttribute('data-motion') === 'paused' && await scene.getByRole('button', { name: 'Devam Et' }).isEnabled());
      }
      check(`${width}px: tarayıcı uygulama hatası yok`, errors.length === 0, errors.join(' | '));
    } catch (error) { failed++; console.error(`❌ ${width}px akışı kesildi:`, error?.stack ?? error); }
    finally { await context.close(); await browser.close(); }
  }

  const browser = await launch();
  const context = await browser.newContext({ viewport: { width: 320, height: 720 }, locale: 'tr' });
  const page = await context.newPage();
  try {
    await page.goto(`${base}?players=0&reduce=1`);
    let scene = page.getByTestId('arrival-scene'); await scene.waitFor();
    check('Boş kadroda hayali oyuncu çıkmaz, azaltılmış hareket açık kalır', await scene.getAttribute('data-motion') === 'reduced' && await scene.getByTestId('arrival-passenger').count() === 0 && (await scene.innerText()).includes('gösterilecek oyuncu bulunmuyor') && await scene.getAttribute('data-phase') === 'Takım otobüsü stadyum girişinde');
    await page.goto(`${base}?players=3&reduce=1&side=home`);
    scene = page.getByTestId('arrival-scene'); await scene.waitFor();
    check('Üç oyunculu ev sahibi kadrosunda yalnız o üç oyuncu gösterilir', await scene.getByTestId('arrival-passenger').count() === 3 && (await scene.locator('svg').getAttribute('aria-label')).includes('Sakarya Vadi'));

    // Exercise the actual uninterrupted 24-second playback once, including its end state.
    await page.goto(base); scene = page.getByTestId('arrival-scene'); await scene.waitFor();
    await page.waitForFunction(() => document.querySelector('[data-testid="arrival-scene"]')?.getAttribute('data-phase') === 'Takım stadyum girişinde' && document.querySelector('[data-testid="arrival-scene"]')?.getAttribute('data-motion') === 'paused', null, { timeout: 30000 });
    const end = await snap(page);
    check('Sahne baştan sona kendi süresinde oynar, son karede kalır ve maç başlatmaz', end.passengers.length === 6 && Number(end.door) === 1 && Number(end.gate) === 1 && await scene.getByRole('button', { name: 'Yeniden Oynat' }).isEnabled() && !await page.getByRole('timer').count());
  } catch (error) { failed++; console.error('❌ Boş/kısa kadro veya tam oynatma akışı kesildi:', error?.stack ?? error); }
  finally { await context.close(); await browser.close(); }
} finally { await server.close(); }
console.log(`\nGeliş sahnesi Chromium: ${passed}/${passed + failed} geçti.`);
if (failed) process.exitCode = 1;
