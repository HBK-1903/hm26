// Real Chromium: full-screen scenes, non-blocking camera, exact interview choices,
// local-only Turkish device speech, mobile/desktop layout and focus restoration.
import { chromium } from 'playwright';
import { createServer } from 'node:net';
import { createServer as createViteServer } from 'vite';
import { mkdirSync } from 'node:fs';

async function freePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  return port;
}
let server, browser, passed = 0, failed = 0;
const errors = [], remoteRequests = [];
const check = (name, condition, detail = '') => { condition ? passed++ : failed++; console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
const screenshots = process.env.HM26_SCREENSHOTS;
if (screenshots) mkdirSync(screenshots, { recursive: true });
try {
  const port = await freePort();
  server = await createViteServer({ server: { host: '127.0.0.1', port, strictPort: true }, logLevel: 'silent' });
  await server.listen();
  const executablePath = process.env.HM26_CHROMIUM;
  browser = await chromium.launch(executablePath ? { executablePath, args: ['--no-sandbox', '--single-process', '--no-zygote', '--disable-gpu', '--disable-dev-shm-usage'] } : {});
  const context = await browser.newContext({ viewport: { width: 320, height: 720 }, deviceScaleFactor: 2, locale: 'tr' });
  await context.addInitScript(() => {
    // A local and a cloud voice are intentionally both offered: production must
    // select only the local one. No network-based speech is ever required.
    window.__useLocalVoice = true;
    window.__blockSpeech = false;
    window.__speechEvents = [];
    const local = { name: 'Yerel Türkçe', lang: 'tr-TR', localService: true, voiceURI: 'local-tr' };
    const cloud = { name: 'Uzak Türkçe', lang: 'tr-TR', localService: false, voiceURI: 'cloud-tr' };
    const engine = {
      getVoices: () => window.__useLocalVoice ? [cloud, local] : [cloud],
      addEventListener() {}, removeEventListener() {},
      speak(utterance) {
        if (window.__blockSpeech) throw new DOMException('Speech blocked', 'NotAllowedError');
        window.__speechEvents.push({ type: 'speak', text: utterance.text, voice: utterance.voice?.voiceURI, volume: utterance.volume });
        utterance.onstart?.();
      },
      cancel() { window.__speechEvents.push({ type: 'cancel' }); },
    };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: engine });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class { constructor(text) { this.text = text; } } });
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { const url = new URL(request.url()); if (url.protocol.startsWith('http') && url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') remoteRequests.push(request.url()); });
  const url = `http://127.0.0.1:${port}/tools/cinematic-scenes-fixture.html`;
  await page.goto(url, { waitUntil: 'networkidle' });
  const screenshot = async (name) => { if (screenshots) await page.screenshot({ path: `${screenshots}/${name}.png` }); };
  const shot = (id, value) => page.waitForFunction(({ id, value }) => document.querySelector(`[data-testid="${id}"]`)?.getAttribute('data-shot') === value, { id, value }, { timeout: 6000 });
  const bounds = async () => page.evaluate(() => {
    const rect = (selector) => { const r = document.querySelector(selector)?.getBoundingClientRect(); return r && { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height }; };
    return { width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth,
      overlay: rect('[data-testid="cinematic-overlay"]'), scene: rect('.cinematic-layout__scene'),
      subtitle: rect('.cinematic-layout__subtitle'), panel: rect('[data-testid="cinematic-decisions"]') };
  });
  const fits = (b) => b.documentWidth <= b.width && b.overlay.left === 0 && b.overlay.right === b.width && b.scene.width > 200 && b.panel.height > 80;

  // Existing real transfer flow in a genuine full-viewport layer.
  await page.getByTestId('fixture-open-transfer').click();
  const overlay = page.getByTestId('cinematic-overlay'), theatre = page.getByTestId('transfer-theatre');
  let b = await bounds();
  check('320 px transfer pazarlığı tam ekran ve erişilebilir diyalogdur', fits(b) && await page.getByRole('dialog', { name: 'Transfer Görüşmesi' }).getAttribute('aria-modal') === 'true', JSON.stringify(b));
  check('Masa ve gerçek iki karakter geniş açıda birlikte görünür', await theatre.getAttribute('data-shot') === 'wide' && await theatre.locator('.transfer-theatre__desk').count() === 1 && await theatre.locator('.transfer-theatre__actor').count() === 2 && await theatre.getAttribute('data-scene') === 'negotiation');
  const playerName = await theatre.locator('.transfer-theatre__caption strong').innerText();
  check('Sahne gerçek oyuncuyu ve rakip kulübü kullanır', playerName.length > 1 && /Sakarya Vadi/i.test(await theatre.getAttribute('aria-label')));
  await screenshot('01-negotiation-320');
  await page.setViewportSize({ width: 320, height: 480 });
  const compactTransfer = await page.evaluate(() => {
    const rect = (selector) => { const r = document.querySelector(selector)?.getBoundingClientRect(); return r && { left:r.left, right:r.right, top:r.top, bottom:r.bottom }; };
    return { heading:rect('.transfer-theatre__heading > div'), actors:[...document.querySelectorAll('.transfer-theatre__actor svg')].map((el) => { const r=el.getBoundingClientRect(); return { left:r.left,right:r.right,top:r.top,bottom:r.bottom }; }),
      desk:rect('.transfer-theatre__desk'), caption:rect('.transfer-theatre__caption'), labels:[...document.querySelectorAll('.transfer-theatre__actor > span')].map((el) => getComputedStyle(el).display) };
  });
  const overlap = (a, b) => !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  check('Kısa ekranda görüşme etiketi, yüzler ve masa birbirini örtmez', compactTransfer.actors.length === 2 && compactTransfer.actors.every((actor) => !overlap(compactTransfer.heading, actor)) && !overlap(compactTransfer.desk, compactTransfer.caption) && compactTransfer.labels.every((display) => display === 'none'), JSON.stringify(compactTransfer));
  await screenshot('01a-negotiation-short-320');
  await page.setViewportSize({ width: 320, height: 720 });
  await page.getByTestId('transfer-reply-seller-firm').click();
  const decisionScroll = await page.getByTestId('cinematic-decisions').evaluate((element) => element.scrollTop);
  await shot('transfer-theatre', 'manager');
  b = await bounds();
  const zoom = await theatre.locator('.transfer-theatre__world').evaluate((el) => getComputedStyle(el).transform);
  check('Sert replikte kamera menajere yumuşakça yaklaşır; teklif kontrolü yerindedir', fits(b) && decisionScroll > 0 && await page.getByTestId('transfer-send-seller').isEnabled() && zoom !== 'none');
  await shot('transfer-theatre', 'wide');
  check('Yakınlaşma kendiliğinden geniş kadraja döner, oyun aşaması değişmez', await theatre.getAttribute('data-shot') === 'wide' && await page.getByTestId('transfer-flow').getAttribute('data-stage') === 'offer');
  await page.getByTestId('transfer-send-seller').click();
  await shot('transfer-theatre', 'opponent');
  check('Satıcının gerçek yanıtında kamera temsilciye yaklaşır', await page.getByTestId('transfer-flow').getAttribute('data-stage') === 'seller' && (await theatre.locator('.transfer-theatre__actor').last().innerText()).toLocaleLowerCase('tr-TR').includes('temsilci'));
  await page.getByTestId('cinematic-camera-toggle').click();
  check('Sabit kamera seçeneği hareketi anında durdurur, sahneyi kapatmaz', await theatre.getAttribute('data-shot') === 'wide' && await overlay.getAttribute('data-motion') === 'fixed' && await page.getByTestId('transfer-flow').isVisible());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.querySelector('[data-testid="cinematic-overlay"]')?.getAttribute('data-motion') === 'reduced');
  check('Sistem azaltılmış hareket tercihi kamera ve karakter animasyonlarını kapatır', await page.getByTestId('cinematic-camera-toggle').isDisabled() && await theatre.locator('.transfer-theatre__world').evaluate((el) => getComputedStyle(el).transform) === 'none' && await theatre.locator('.transfer-puppet').first().evaluate((el) => getComputedStyle(el).animationName) === 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[data-testid="cinematic-overlay"]') && document.activeElement?.getAttribute('data-testid') === 'fixture-open-transfer');
  check('Escape görüşmeyi kapatıp odağı açan düğmeye döndürür', await page.getByTestId('fixture-open-transfer').evaluate((el) => document.activeElement === el));

  // Interview is a separate real-data scene; selection is not a transition.
  await page.getByTestId('fixture-open-interview').click();
  const interview = page.getByTestId('post-match-interview'), interviewScene = page.getByTestId('interview-theatre');
  check('Röportaj ayrı tam ekran sahne ve gerçek skorla açılır', await page.getByRole('dialog', { name: 'Maç Sonu Röportajı' }).getAttribute('aria-modal') === 'true' && await interviewScene.getAttribute('aria-label') === 'Maç sonu tüneli: Denizli Yeşilova SK 2–1 Sakarya Vadi SK' && /2–1/.test(await interviewScene.innerText()));
  check('Kırmızı kart sorusu uydurma değil, gerçek maç bağlamından gelir', /eksik kaldı/.test(await page.getByTestId('interview-subtitle').innerText()) && await page.getByTestId('interview-option-0').isVisible());
  await page.keyboard.press('Escape');
  await page.keyboard.press('Shift+Tab');
  check('Röportaj Escape ile kaybolmaz ve klavye odağı sahnenin içinde kalır', await interview.isVisible() && await overlay.evaluate((el) => el.contains(document.activeElement)));

  b = await bounds();
  check('320 px röportaj sahnesi ve karar paneli taşmaz', fits(b), JSON.stringify(b));
  await screenshot('02-interview-320');
  await shot('interview-theatre', 'opponent');
  await shot('interview-theatre', 'wide');
  check('Soru sırasında kısa muhabir planı sonrası geniş çekim döner', await interviewScene.getAttribute('data-shot') === 'wide' && await interview.getAttribute('data-stage') === 'question');
  const question = (await page.getByTestId('interview-subtitle').locator('p').innerText()).replace(/^“|”$/g, '');
  await page.getByRole('button', { name: 'Bu repliği dinle' }).click();
  let spoken = await page.evaluate(() => window.__speechEvents.filter((event) => event.type === 'speak').at(-1));
  check('Soru yalnız cihazın yerel Türkçe sesiyle ve aynı metinle dinlenir', spoken?.voice === 'local-tr' && spoken.text === question && spoken.volume > 0 && spoken.volume <= 1 && await interviewScene.getAttribute('data-speaking') === 'reporter', JSON.stringify(spoken));
  await page.getByTestId('interview-option-0').click();
  const subtitleAnswer = (await page.getByTestId('interview-subtitle').locator('p').innerText()).replace(/^“|”$/g, '');
  spoken = await page.evaluate(() => window.__speechEvents.filter((event) => event.type === 'speak').at(-1));
  check('Seçilen birebir cevap sahnede kalır, yerel sesle okunur ve henüz aktarılmaz', await interview.getAttribute('data-stage') === 'answer' && await page.getByTestId('interview-answer').isVisible() && spoken?.text === subtitleAnswer && spoken.voice === 'local-tr' && await page.evaluate(() => window.__cinematicFixture.lastChoice() === undefined));
  await shot('interview-theatre', 'manager');
  check('Cevapta menajere yaklaşılır; devam düğmesine klavye odağı verilir', await interviewScene.getAttribute('data-speaking') === 'manager' && await page.getByTestId('interview-continue').evaluate((el) => document.activeElement === el));
  await screenshot('03-answer-320');
  await page.getByTestId('interview-change').click();
  check('Cevap değiştirilebilir ve önceki söz kaydedilmez', await interview.getAttribute('data-stage') === 'question' && await page.getByTestId('interview-option-2').isVisible() && await page.evaluate(() => window.__cinematicFixture.lastChoice() === undefined));
  await page.getByTestId('interview-option-2').click();
  const finalQuote = (await page.getByTestId('interview-subtitle').locator('p').innerText()).replace(/^“|”$/g, '');
  await page.getByTestId('interview-continue').click();
  const chosen = await page.evaluate(() => window.__cinematicFixture.lastChoice());
  check('Yalnız devam düğmesi tam seçilen röportaj sözünü aktarır', chosen?.id === 'redcard-saygi' && chosen.quote === finalQuote && await overlay.count() === 0, JSON.stringify(chosen));

  // A cloud-only voice never gets used; subtitles and choices stay functional.
  await page.evaluate(() => { window.__useLocalVoice = false; window.__speechEvents = []; });
  await page.getByTestId('fixture-open-interview').click();
  check('Yerel Türkçe ses yoksa dürüst altyazı ve devre dışı dinleme gösterilir', await page.getByRole('button', { name: 'Bu repliği dinle' }).isDisabled() && /Türkçe cihaz sesi yok/.test(await page.getByTestId('interview-subtitle').innerText()));
  await page.getByTestId('interview-option-1').click();
  check('Yerel ses yokken cevap ve kullanıcı kontrolü çalışır, uzak sese başvurulmaz', await interview.getAttribute('data-stage') === 'answer' && await page.getByTestId('interview-continue').isEnabled() && await page.evaluate(() => window.__speechEvents.filter((event) => event.type === 'speak').length === 0));
  await page.getByTestId('interview-change').click();
  await page.getByTestId('decline').click();
  check('Röportaj reddi de yalnız kullanıcı eylemiyle gerçekleşir', await page.evaluate(() => window.__cinematicFixture.lastChoice()) === null);

  // Browser speech can throw even when a local voice is listed; text and
  // explicit progress must still work without an uncaught error.
  await page.evaluate(() => { window.__useLocalVoice = true; window.__blockSpeech = true; window.__speechEvents = []; });
  await page.getByTestId('fixture-open-interview').click();
  await page.getByTestId('interview-option-0').click();
  check('Tarayıcı konuşmayı engellese de altyazı ve devam seçeneği çalışır', await interview.getAttribute('data-stage') === 'answer' && (await page.getByTestId('interview-subtitle').innerText()).includes('Kartın sebebi') && await page.getByTestId('interview-continue').isEnabled() && await page.evaluate(() => window.__speechEvents.filter((event) => event.type === 'speak').length === 0));
  await page.getByTestId('interview-continue').click();

  // Both themes and a desktop layout, including mute preference.
  await page.evaluate(() => { window.__useLocalVoice = true; window.__blockSpeech = false; window.__cinematicFixture.setVolume(0); document.documentElement.classList.replace('m26-light', 'm26-dark'); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId('fixture-open-interview').click();
  b = await bounds();
  check('390 px koyu temada röportaj ve bütün seçenekler taşmaz', fits(b) && await page.getByTestId('interview-option-2').count() === 1, JSON.stringify(b));
  check('Ana ses kapalıyken yerel ses çalmaz ve altyazı korunur', await page.getByRole('button', { name: 'Bu repliği dinle' }).isDisabled() && /Ana ses veya efektler kapalı/.test(await page.getByTestId('interview-subtitle').innerText()));
  await screenshot('04-interview-dark-390');
  await page.setViewportSize({ width: 320, height: 480 });
  b = await bounds();
  const subtitleScrollable = await page.locator('.cinematic-layout__subtitle').evaluate((el) => el.scrollHeight <= el.clientHeight || ['auto', 'scroll'].includes(getComputedStyle(el).overflowY));
  check('Kısa ekranda altyazı okunabilir ve karar alanı ulaşılabilir kalır', fits(b) && subtitleScrollable && await page.getByTestId('interview-option-2').count() === 1, JSON.stringify(b));
  await page.getByTestId('cinematic-camera-toggle').click();
  const compactInterview = await page.evaluate(() => {
    const rect = (element) => { const r=element.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}; };
    return { heading:rect(document.querySelector('.interview-theatre__heading > div')), actors:[...document.querySelectorAll('.interview-theatre__person svg')].map(rect),
      labels:[...document.querySelectorAll('.interview-theatre__person > span')].map((el) => getComputedStyle(el).display) };
  });
  check('Kısa röportajda başlık karakter yüzlerini ve etiketleri kapatmaz', compactInterview.actors.length === 2 && compactInterview.actors.every((actor) => !overlap(compactInterview.heading, actor)) && compactInterview.labels.every((display) => display === 'none'), JSON.stringify(compactInterview));
  await screenshot('04a-interview-short-320');
  await page.setViewportSize({ width: 1280, height: 800 });
  b = await bounds();
  check('Masaüstünde büyük sahne ve karar paneli yan yana yerleşir', fits(b) && Math.abs(b.scene.top - b.panel.top) < 2 && b.scene.right <= b.panel.left + 2 && b.scene.width > b.panel.width, JSON.stringify(b));
  await screenshot('05-interview-desktop');
  await page.getByTestId('decline').click();
  check('Sahneler ek uzak istek yapmaz ve yakalanmamış uygulama hatası üretmez', remoteRequests.length === 0 && errors.length === 0, JSON.stringify({ remoteRequests, errors }));
} catch (error) {
  failed++; console.error('❌ Sinematik sahne tarayıcı testi kesildi:', error);
} finally {
  await browser?.close().catch(() => {});
  await server?.close().catch(() => {});
}
console.log(`\nCINEMATIC-SCENES-BROWSER: ${passed} geçti, ${failed} başarısız`);
if (failed) process.exitCode = 1;
