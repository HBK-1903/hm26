// Gerçek tarayıcı: yeni kariyer → piyasa → sesli transfer sahnesi → kayıt / çevrimdışı varlıklar.
// Standart Playwright Chromium veya HM26_CHROMIUM=/path/to/chromium ile çalışır.
import { chromium } from 'playwright';
import { mkdirSync, readdirSync } from 'node:fs';

const base = process.env.HM26_BASE_URL || 'http://127.0.0.1:4173';
const executablePath = process.env.HM26_CHROMIUM;
const browser = await chromium.launch(executablePath ? { executablePath, args: ['--no-sandbox', '--single-process', '--no-zygote', '--disable-dev-shm-usage'], headless: true } : {});
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'tr' });
const page = await context.newPage();
const errors = [];
const voiceRequests = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => { if (request.url().includes('/assets/transfer/voice/')) voiceRequests.push(request.url()); });
let passed = 0, failed = 0;
const check = (name, condition, detail = '') => { console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); condition ? passed++ : failed++; };
const screenshot = async (name) => {
  if (!process.env.HM26_SCREENSHOTS) return;
  mkdirSync(process.env.HM26_SCREENSHOTS, { recursive: true });
  await page.screenshot({ path: `${process.env.HM26_SCREENSHOTS}/${name}.png` });
};
const text = () => page.locator('body').innerText();

try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Başla|Kayıt Yuvaları/ }).first().click();
  await page.getByText(/Yeni Kariyer — Yuva 1/).first().click();
  await page.locator('input').first().fill('Transfer Testi');
  await page.getByText('Eski Futbolcu').first().click();
  for (let i = 0; i < 6; i++) {
    if (await page.getByText('Denizli Yeşilova').count()) break;
    await page.getByRole('button', { name: /^Devam$/ }).first().click();
  }
  await page.getByText('Denizli Yeşilova').first().click();
  await page.getByRole('button', { name: /Kulüp Brifingine Git/ }).click();
  await page.getByRole('button', { name: /Kariyeri Başlat/ }).click();
  await page.getByRole('button', { name: 'Anladım' }).first().click({ timeout: 3000 }).catch(() => {});
  await page.locator('nav[aria-label="Ana gezinme"] button', { hasText: 'Piyasa' }).click();
  await page.getByRole('button', { name: 'Oyuncu Ara' }).click();
  await page.locator('button[data-filter="free"]').click();
  const candidates = page.locator('article').filter({ hasText: 'Yerli oyuncu' }).filter({ hasText: 'Bedelsiz' });
  let chosen = null;
  for (let i = 0; i < await candidates.count(); i++) {
    const row = candidates.nth(i);
    const rowText = await row.innerText();
    const gen = Number((rowText.match(/(\d+)\s*GEN/) || [])[1]);
    if (gen && gen <= 64) { chosen = row; break; }
  }
  if (!chosen) throw new Error('Uygun yerli serbest oyuncu bulunamadı');
  const selectedRow = await chosen.innerText();
  await chosen.getByRole('button', { name: 'Teklif', exact: true }).click();
  check('Piyasa kartından hareketli transfer masası açıldı', await page.getByTestId('transfer-flow').getAttribute('data-stage') === 'offer' && await page.getByTestId('transfer-theatre').getAttribute('data-scene') === 'negotiation');
  await screenshot('01-offer');
  const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, stage: document.querySelector('[data-testid="transfer-theatre"]')?.getBoundingClientRect().width }));
  check('390 px mobil ekranda yatay taşma yok ve sahne görünür', metrics.scrollWidth <= metrics.width && metrics.stage > 250, JSON.stringify(metrics));
  await page.getByTestId('transfer-send-seller').click();
  await page.getByRole('button', { name: 'Rotasyon', exact: true }).click();
  await page.getByTestId('transfer-reply-player-calm').click();
  const reply = await page.getByTestId('transfer-reply-player-calm').locator('.transfer-reply__label').innerText();
  const subtitle = await page.getByTestId('transfer-subtitle').innerText();
  check('Seçilen konuşma gerçek tarayıcıda altyazıya yansıyor', subtitle.includes(reply.replace(/[“”]/g, '')));
  const scrollBeforeCue = await page.getByTestId('transfer-flow').evaluate((el) => el.closest('.overflow-y-auto')?.scrollTop ?? 0);
  await page.getByTestId('transfer-speaking-cue').waitFor({ state: 'visible', timeout: 5000 });
  const visibleCue = await page.evaluate(() => {
    const cue = document.querySelector('[data-testid="transfer-speaking-cue"]');
    const scene = document.querySelector('[data-testid="transfer-theatre"]');
    const scroll = document.querySelector('[data-testid="transfer-flow"]')?.closest('.overflow-y-auto');
    const cueBox = cue?.getBoundingClientRect(), sceneBox = scene?.getBoundingClientRect(), scrollBox = scroll?.getBoundingClientRect();
    return { speaker: cue?.getAttribute('data-speaker'), sceneSpeaker: scene?.getAttribute('data-speaking'),
      mainActors: scene?.querySelectorAll('.transfer-puppet.is-talking').length,
      cueTop: cueBox?.top, cueBottom: cueBox?.bottom, sceneBottom: sceneBox?.bottom, scrollTop: scrollBox?.top, scrollBottom: scrollBox?.bottom, scrollY: scroll?.scrollTop };
  });
  check('Mobilde sahne ekran dışındayken gerçek konuşmacı seçimleri oynatmadan görünür', visibleCue.speaker === 'manager' && visibleCue.sceneSpeaker === 'manager' && visibleCue.mainActors === 1 && visibleCue.sceneBottom < visibleCue.scrollTop && visibleCue.cueTop >= visibleCue.scrollTop && visibleCue.cueBottom <= visibleCue.scrollBottom && Math.abs(visibleCue.scrollY - scrollBeforeCue) < 3, JSON.stringify(visibleCue));
  await screenshot('02-speaking-cue');
  await page.getByRole('button', { name: 'Konuşmayı atla' }).click();
  check('Konuşmayı atla hareketi durdurur, altyazı ve seçilen cevap kalır', await page.getByTestId('transfer-speaking-cue').count() === 0 && await page.getByTestId('transfer-theatre').getAttribute('data-speaking') === 'none' && await page.getByTestId('transfer-reply-player-calm').getAttribute('aria-pressed') === 'true' && (await page.getByTestId('transfer-subtitle').innerText()).includes(reply.replace(/[“”]/g, '')));
  const voiceInfo = await page.evaluate(() => ({
    audio: performance.getEntriesByType('resource').map((entry) => entry.name).filter((url) => url.includes('/assets/transfer/voice/')).at(-1) || null,
    codec: document.createElement('audio').canPlayType('audio/mpeg'),
    settings: localStorage.getItem('m26_audio'),
  }));
  check('Türkçe ses dosyası yerel kaynaktan yükleniyor', voiceRequests.some((url) => url.startsWith(base)), JSON.stringify({ ...voiceInfo, requests: voiceRequests }));
  await screenshot('02-player');
  await page.getByTestId('transfer-send-player').click();
  await page.waitForFunction(() => document.querySelector('[data-testid="transfer-theatre"]')?.getAttribute('data-speaking') === 'player', null, { timeout: 5000 });
  check('Oyuncu yanıtı yalnız oyuncunun yüzünü konuşturur', await page.locator('[data-testid="transfer-theatre"] .transfer-puppet--opponent.is-talking').count() === 1 && await page.locator('[data-testid="transfer-theatre"] .transfer-puppet--manager.is-talking').count() === 0);
  await page.getByTestId('transfer-review').click();
  check('İmza öncesi şartlar ekranda ve onay kullanıcıda', await page.getByTestId('transfer-flow').getAttribute('data-stage') === 'review' && await page.getByTestId('transfer-sign').isEnabled());
  await screenshot('03-review');
  await page.getByTestId('transfer-sign').dblclick();
  await page.getByTestId('transfer-complete').waitFor();
  check('Tekrarlı tıklama sonrası imza ve basın tanıtımı', await page.getByTestId('transfer-theatre').getAttribute('data-scene') === 'press' && (await page.getByTestId('transfer-complete').innerText()).includes('imza atıldı'));
  await screenshot('04-press');
  await page.getByTestId('transfer-announcement').click();
  check('Tanıtım anonsu kullanıcı tıklamasıyla metinli oynatılır', /sunucu/i.test(await page.getByTestId('transfer-subtitle').innerText()));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reduced = await page.locator('.transfer-puppet').first().evaluate((el) => getComputedStyle(el).animationName);
  check('Sistem azaltılmış hareket tercihi karakter animasyonlarını kapatıyor', reduced === 'none', reduced);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => document.documentElement.classList.add('m26-rm'));
  const reducedInGame = await page.locator('.transfer-puppet').first().evaluate((el) => getComputedStyle(el).animationName);
  check('Oyun içi azaltılmış hareket tercihi karakter animasyonlarını kapatıyor', reducedInGame === 'none', reducedInGame);
  await page.evaluate(() => document.documentElement.classList.remove('m26-rm'));
  await page.getByRole('button', { name: 'Piyasada Kal' }).click();
  check('Tanıtımdan sonra piyasada kal seçeneği çalışıyor', await page.getByTestId('transfer-flow').count() === 0);
  const persisted = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const request = indexedDB.open('manager26', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const saved = await new Promise((resolve, reject) => { const request = db.transaction('saves').objectStore('saves').get(1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    return { transfers: saved?.blob?.transferLog?.length ?? 0, version: saved?.blob?.version };
  });
  // İmza sonrası zamanlanmış kayıt asenkron olabilir; tarayıcı arayüzü tamamlanmıştır.
  check('İmzadan sonra kariyer IndexedDB kaydı mevcut', persisted.version === 4 && persisted.transfers >= 1, JSON.stringify(persisted));
  console.log(`Seçilen aday: ${selectedRow.replace(/\s+/g, ' ').slice(0, 100)}`);

  // Ayrı test fikstürü: var olan kayıtta 85 GEN bir serbest oyuncu oluştur; gerçek kariyeri etkilemez.
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Devam Et/ }).first().waitFor();
  await page.waitForTimeout(250); // Önceki ekranın pagehide kaydı tamamlanır.
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('manager26', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const entry = await new Promise((resolve, reject) => { const r = db.transaction('saves').objectStore('saves').get(1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const template = entry.blob.extraPlayers[0];
    if (!template) throw new Error('Test oyuncusu şablonu yok');
    const star = { ...template, id: 'fa_e2e_yildiz', clubId: 'FA', name: 'Test Yıldızı', foreign: false, wage: 20, contractYears: 0,
      ratings: { ...template.ratings, gen: 85 }, potential: 85, kitNumber: undefined };
    entry.blob.extraPlayers.push(star);
    await new Promise((resolve, reject) => { const tx = db.transaction('saves', 'readwrite'); tx.objectStore('saves').put(entry); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Devam Et/ }).first().click();
  await page.locator('nav[aria-label="Ana gezinme"] button', { hasText: 'Piyasa' }).click();
  await page.getByRole('button', { name: 'Oyuncu Ara' }).click();
  await page.getByPlaceholder('Oyuncu veya kulüp adı ara…').fill('Test Yıldızı');
  const starRow = page.locator('article').filter({ hasText: 'Test Yıldızı' }).first();
  await starRow.getByRole('button', { name: 'Teklif', exact: true }).click();
  await page.getByTestId('transfer-send-seller').click();
  await page.locator('input[aria-label="Aylık maaş teklifi"]').fill('30');
  await page.getByTestId('transfer-reply-player-calm').click();
  await page.getByTestId('transfer-send-player').click();
  await page.getByTestId('transfer-review').click();
  await page.getByTestId('transfer-sign').click();
  await page.getByTestId('transfer-complete').waitFor();
  check('85 GEN bedelsiz oyuncu gerçek tarayıcıda özel yıldız stadyumuna çıkar', await page.getByTestId('transfer-theatre').getAttribute('data-scene') === 'star' && (await page.getByTestId('transfer-complete').innerText()).includes('Bedelsiz'));
  await screenshot('05-star');
  await page.setViewportSize({ width: 320, height: 700 });
  const narrow = await page.evaluate(() => {
    const rect = document.querySelector('[data-testid="transfer-theatre"]')?.getBoundingClientRect();
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, scene: rect?.width, left: rect?.left, right: rect?.right };
  });
  check('320 px dar mobil ekranda yıldız sahnesi kırpılmadan çizilir', narrow.scrollWidth <= narrow.width && narrow.scene >= 260 && narrow.left >= 0 && narrow.right <= narrow.width, JSON.stringify(narrow));
  await screenshot('06-star-320');
  await page.getByTestId('transfer-announcement').click();
  await page.getByTestId('transfer-speaking-cue').waitFor({ state: 'visible', timeout: 5000 });
  const narrowCue = await page.getByTestId('transfer-speaking-cue').evaluate((el) => { const rect = el.getBoundingClientRect(); return { left: rect.left, right: rect.right, speaker: el.getAttribute('data-speaker') }; });
  check('320 px ekranda sunucu bildirimi kesilmeden ve doğru konuşmacıyla görünür', narrowCue.left >= 0 && narrowCue.right <= 320 && narrowCue.speaker === 'announcer', JSON.stringify(narrowCue));
  await page.getByRole('button', { name: 'Konuşmayı atla' }).click();

  // Worker üretim derlemesinde tüm yeni varlıkları kurulum anında önbelleğe almalı.
  const workerReady = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return null;
    const reg = await navigator.serviceWorker.ready;
    return { active: !!reg.active, caches: await caches.keys() };
  });
  check('Üretim servis çalışanı etkin', !!workerReady?.active, JSON.stringify(workerReady));
  await context.setOffline(true);
  const offlinePaths = ['/assets/transfer/negotiation-room.webp', '/assets/transfer/press-room.webp', '/assets/transfer/stadium.webp',
    ...readdirSync('public/assets/transfer/voice').filter((file) => file.endsWith('.mp3')).map((file) => `/assets/transfer/voice/${file}`)];
  const offline = await page.evaluate(async (paths) => Promise.all(paths.map(async (path) => {
    try { const response = await fetch(path); return response.ok && (await response.arrayBuffer()).byteLength > 1000; } catch { return false; }
  })), offlinePaths);
  check('Üç sahne ve 40 ses çevrimdışı önbellekten açılıyor', offline.every(Boolean) && offline.length === 43, `${offline.filter(Boolean).length}/${offline.length}`);
  const decoded = await page.evaluate(async (paths) => {
    const audio = new AudioContext(); let valid = 0;
    try {
      for (const path of paths.filter((p) => p.endsWith('.mp3'))) {
        const buffer = await (await fetch(path)).arrayBuffer();
        const clip = await audio.decodeAudioData(buffer);
        if (clip.duration > 0.5 && clip.duration < 15) valid++;
      }
    } finally { await audio.close(); }
    return valid;
  }, offlinePaths);
  check('40 MP3 çevrimdışıyken tarayıcı tarafından çözümleniyor', decoded === 40, `${decoded}/40`);
  await page.getByTestId('transfer-announcement').click();
  check('Yıldız anonsu çevrimdışıyken altyazıyla çalışıyor', /yıldız transferimizi/i.test(await page.getByTestId('transfer-subtitle').innerText()));
  await context.setOffline(false);
  check('Tarayıcıda yakalanmamış uygulama hatası yok', errors.length === 0, errors.join(' | '));
} catch (error) {
  failed++;
  console.error('❌ Tarayıcı akışı:', error);
  await screenshot('failure').catch(() => {});
} finally {
  await browser.close();
}
console.log(`\nTRANSFER-SCENE-BROWSER: ${passed}/${passed + failed}`);
if (failed) process.exitCode = 1;
