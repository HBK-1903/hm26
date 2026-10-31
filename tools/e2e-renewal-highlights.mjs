// Real Chromium: contract negotiation and user-controlled highlights at phone widths.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.env.HM26_BASE_URL ?? 'http://127.0.0.1:4173';
const executablePath = process.env.HM26_CHROMIUM;
const browser = await chromium.launch(executablePath ? { executablePath, headless: true, args: ['--no-sandbox', '--single-process', '--no-zygote', '--disable-gpu', '--disable-dev-shm-usage'] } : {});
const page = await browser.newPage({ viewport: { width: 320, height: 720 }, locale: 'tr' });
const errors = [], voiceResponses = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => { if (response.url().includes('/assets/transfer/voice/')) voiceResponses.push({ url: response.url(), status: response.status() }); });
let passed = 0, failed = 0;
const check = (name, condition, detail = '') => { condition ? passed++ : failed++; console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
const nav = (name) => page.locator('nav[aria-label="Ana gezinme"] button', { hasText: name });
const out = process.env.HM26_SCREENSHOTS;
if (out) mkdirSync(out, { recursive: true });
const screenshot = async (name) => { if (out) await page.screenshot({ path: `${out}/${name}.png` }); };
const readSave = async () => page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => { const req = indexedDB.open('manager26', 1); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  const entry = await new Promise((resolve, reject) => { const req = db.transaction('saves').objectStore('saves').get(1); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  db.close(); return entry?.blob ?? null;
});
const waitForSave = async (predicate) => {
  const end = Date.now() + 12_000;
  while (Date.now() < end) { const blob = await readSave(); if (predicate(blob)) return blob; await page.waitForTimeout(100); }
  throw new Error('Beklenen kariyer kaydı zamanında oluşmadı');
};
const editSave = async (mode) => page.evaluate(async (mode) => {
  const db = await new Promise((resolve, reject) => { const req = indexedDB.open('manager26', 1); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  const entry = await new Promise((resolve, reject) => { const req = db.transaction('saves').objectStore('saves').get(1); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  const b = entry.blob;
  const playerId = `${b.career.clubId}_GK_0`;
  let fixture;
  if (mode === 'renewal') {
    b.career.seed = 12345;
    b.playerPatch[playerId] = { ...(b.playerPatch[playerId] ?? {}), wage: 150, contractYears: 1 };
    b.budget.tb = 10;
  } else {
    const myFixtures = b.fixtures.filter((f) => f.comp === 'lig' && f.league === b.leagueOf[b.career.clubId] && (f.homeId === b.career.clubId || f.awayId === b.career.clubId));
    fixture = myFixtures[0];
    for (const f of myFixtures) f.played = true;
    fixture.played = false; fixture.day = b.career.day;
    b.cup.fixtures = []; b.cup.rounds = []; b.friendlies = [];
    for (const cup of b.international.cups) {
      for (const f of cup.fixtures) if (f.homeId === b.career.clubId || f.awayId === b.career.clubId) f.played = true;
      for (const round of cup.rounds) for (const tie of round.ties) if (tie.homeId === b.career.clubId || tie.awayId === b.career.clubId) tie.winner = tie.homeId;
    }
  }
  await new Promise((resolve, reject) => { const tx = db.transaction('saves', 'readwrite'); tx.objectStore('saves').put(entry); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  db.close(); return { playerId, fixture };
}, mode);
const continueCareer = async () => {
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Devam Et/ }).first().click();
  await page.getByRole('button', { name: 'Anladım' }).first().click({ timeout: 2000 }).catch(() => {});
};
const layout = async (selector) => page.locator(selector).evaluate((el) => {
  const rect = el.getBoundingClientRect(), dialog = el.closest('[role="dialog"]')?.getBoundingClientRect();
  return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, left: rect.left, right: rect.right, elementWidth: rect.width, dialogLeft: dialog?.left, dialogRight: dialog?.right };
});
const fits = (l) => l.scrollWidth <= l.width && l.left >= (l.dialogLeft ?? 0) - 1 && l.right <= (l.dialogRight ?? l.width) + 1 && l.elementWidth >= 200;

try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Başla|Kayıt Yuvaları/ }).first().click();
  await page.getByText('Yeni Kariyer — Yuva 1').first().click();
  await page.locator('input').first().fill('Özet Testi');
  await page.getByText('Eski Futbolcu').first().click();
  for (let i = 0; i < 6 && !(await page.getByText('Denizli Yeşilova').count()); i++) await page.getByRole('button', { name: 'Devam', exact: true }).first().click();
  await page.getByText('Denizli Yeşilova').first().click();
  await page.getByRole('button', { name: /Kulüp Brifingine Git/ }).click();
  await page.getByRole('button', { name: /Kariyeri Başlat/ }).click();
  await page.getByRole('button', { name: 'Anladım' }).first().click({ timeout: 2500 }).catch(() => {});
  await waitForSave((b) => !!b);
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Devam Et/ }).first().waitFor();
  await page.waitForTimeout(400);
  const { playerId } = await editSave('renewal');
  await continueCareer();
  await nav('Piyasa').click();
  await page.getByRole('button', { name: /^Diğer/ }).click();
  await page.getByRole('dialog', { name: 'Diğer piyasa bölümleri' }).getByRole('button', { name: 'Sözleşmeler' }).click();
  const row = page.locator(`[data-testid="contract-player"][data-player-id="${playerId}"]`);
  // Simulate a user focusing a control immediately as the panel appears.
  await page.evaluate(() => {
    window.__fastRenewalFocus = false;
    const observer = new MutationObserver(() => {
      const input = document.querySelector('[data-testid="renewal-wage"]');
      if (input) { input.focus(); window.__fastRenewalFocus = document.activeElement === input; observer.disconnect(); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 2000);
  });
  await row.getByRole('button', { name: 'Yenile' }).click();
  const flow = page.getByTestId('renewal-flow');
  const scene = page.getByTestId('transfer-theatre');
  check('320 px yenileme kendi oyuncusuyla hareketli masada açılır', await flow.getAttribute('data-stage') === 'offer' && /SÖZLEŞME YENİLEME/.test(await scene.getAttribute('aria-label')));
  let box = await layout('[data-testid="transfer-theatre"]');
  check('320 px sözleşme sahnesi panel dışına taşmaz', fits(box), JSON.stringify(box));
  await screenshot('01-renewal-offer-320');
  check('Cevap seçilmeden teklif gönderilemez', await page.getByTestId('renewal-send').isDisabled());
  const slider = page.getByTestId('renewal-wage');
  await page.waitForTimeout(150);
  check('Hızlı odaklanan maaş kontrolü panel açılışında odağını korur', await page.evaluate(() => window.__fastRenewalFocus) && await slider.evaluate((input) => document.activeElement === input));
  await slider.focus(); await slider.press('Home');
  check('Maaş teklifi klavyeyle değiştirilebilir', await slider.inputValue() === '112');
  await page.getByTestId('renewal-reply-calm').click();
  const replyText = (await page.getByTestId('renewal-reply-calm').locator('.transfer-reply__label').textContent()).replace(/[“”]/g, '');
  const subtitle = await page.getByTestId('transfer-subtitle').textContent();
  check('Menajer cevabı seçilir; gerçek replik altyazıda gösterilir', await page.getByTestId('renewal-reply-calm').getAttribute('aria-pressed') === 'true' && subtitle.includes('Menajer') && subtitle.includes(replyText));
  await page.waitForFunction(() => performance.getEntriesByType('resource').some((entry) => entry.name.includes('/assets/transfer/voice/')), null, { timeout: 8000 });
  check('Görüşme yerel Türkçe ses dosyasını ister', voiceResponses.some((response) => response.url.startsWith(base) && response.status === 200), JSON.stringify(voiceResponses.at(-1)));
  await page.getByTestId('renewal-send').click();
  check('Düşük teklif reddedilir; karşı beklenti gösterilir', await flow.getAttribute('data-stage') === 'response' && /en az ₺173B\/ay/.test(await flow.innerText()));
  let saved = await readSave();
  check('Ret bütçeyi ve sözleşmeyi değiştirmez', saved.budget.tb === 10 && saved.playerPatch[playerId].contractYears === 1 && saved.playerPatch[playerId].wage === 150);
  await page.getByTestId('renewal-match-demand').click();
  check('Karşı beklenti maaş teklifine taşınır', await slider.inputValue() === '173');
  await page.getByRole('group', { name: 'Yeni sözleşme süresi' }).getByRole('button', { name: '4 yıl' }).click();
  await page.getByTestId('renewal-send').click();
  check('Kabul ayrı aşamadadır; imza henüz atılmamıştır', await flow.getAttribute('data-stage') === 'response' && /Henüz imza atılmadı/.test(await flow.innerText()));
  await page.getByTestId('renewal-review').click();
  const review = await flow.innerText();
  check('Son kontrolde gerçek mali koşullar görünür', ['4 yıl', '₺173B/ay', '₺0.900M', '₺9.100M'].every((x) => review.includes(x)));
  await screenshot('02-renewal-review-320');
  await page.setViewportSize({ width: 390, height: 844 });
  box = await layout('[data-testid="transfer-theatre"]');
  check('390 px sözleşme sahnesi panel dışına taşmaz', fits(box), JSON.stringify(box));
  await page.getByTestId('renewal-sign').dblclick();
  check('Çift imza sonrası yenileme tamamlanır, tanıtım sahnesi açılmaz', await flow.getAttribute('data-stage') === 'signed' && await scene.getAttribute('data-scene') === 'negotiation');
  saved = await waitForSave((b) => b?.playerPatch?.[playerId]?.contractYears === 4);
  check('Gerçek kayıt: yeni ücret ve tek bonus ödemesi', saved.version === 4 && saved.playerPatch[playerId].wage === 173 && saved.budget.tb === 9.1 && saved.inbox.filter((m) => m.title === 'Sözleşme yenilendi').length === 1);
  await screenshot('03-renewal-signed-390');
  await page.getByRole('button', { name: 'Sözleşmelere Dön' }).click();

  // No mounted game can overwrite the fixture edit.
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Devam Et/ }).first().waitFor();
  await page.waitForTimeout(400);
  const { fixture } = await editSave('last-fixture');
  await continueCareer();
  await page.getByRole('button', { name: /Maç Merkezine Git/ }).first().click();
  await page.getByRole('button', { name: 'Simüle Et (hızlı sonuç)' }).click();
  const quick = page.getByRole('dialog', { name: 'Hızlı Simülasyon Sonucu' });
  check('Son fikstürün hızlı sonuç penceresi açık kalır', await quick.isVisible() && await quick.getByTestId('quick-open-highlights').isVisible(), `${fixture.homeId}–${fixture.awayId}`);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.getByTestId('quick-open-highlights').click();
  const highlights = page.getByTestId('match-highlights');
  const event = page.getByTestId('highlight-event');
  check('Özet kullanıcı açana kadar oynatılmaz; gerçek olay görünür', await highlights.getAttribute('data-playing') === 'false' && await event.isVisible());
  box = await layout('[data-testid="highlights-stage"]');
  check('320 px görsel maç özeti panel içine sığar', fits(box), JSON.stringify(box));
  await screenshot('04-highlights-320');
  const eventCount = await page.getByTestId('highlight-timeline-item').count();
  check('Özette birden fazla gerçek olay arasında seçim var', eventCount > 1, `${eventCount} olay`);
  const first = await event.innerText();
  await page.getByTestId('highlight-next').focus(); await page.getByTestId('highlight-next').press('Enter');
  const next = await event.innerText();
  check('Klavye ile sonraki olay açılır', first !== next);
  await page.getByTestId('highlight-previous').click();
  check('Geri kontrolü önceki olayı geri getirir', await event.innerText() === first);
  const routeOrMissing = await page.getByTestId('highlights-route').count() > 0 || await page.getByTestId('highlight-no-position').isVisible();
  check('Konum sadece kayıt varsa çizilir; yoksa açıkça belirtilir', routeOrMissing);
  let sawSavedAttack = false, saveSideCorrect = false;
  for (let i = 0; i < eventCount; i++) {
    const item = page.getByTestId('highlight-timeline-item').nth(i);
    if (!/KURTARIŞ/.test(await item.getAttribute('aria-label') ?? '')) continue;
    await item.click();
    if (!(await page.getByTestId('highlights-route').count())) continue;
    const acting = await event.getAttribute('data-acting-side'), path = await event.getAttribute('data-path-side');
    sawSavedAttack = true;
    saveSideCorrect = ['home', 'away'].includes(acting) && ['home', 'away'].includes(path) && acting !== path && await page.getByTestId('highlight-attacking-route').isVisible();
    break;
  }
  check('Gerçek özet kurtarışında kaleci takımı ve hücum yolu ayrı gösterilir', sawSavedAttack && saveSideCorrect);
  // Look for an actual multi-zone route before testing the animation preference.
  let hasAnimatedRoute = false;
  for (let i = 0; i < eventCount - 1; i++) {
    await page.getByTestId('highlight-timeline-item').nth(i).click();
    if (await page.locator('.highlights__route-line').count()) { hasAnimatedRoute = true; break; }
  }
  const beforePlayback = await event.innerText();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByTestId('highlight-play').click();
  const motionDisabled = hasAnimatedRoute && await page.locator('.highlights__route-line').evaluate((el) => getComputedStyle(el).animationName === 'none');
  check('Azaltılmış hareket tercihi gerçek saha yolu animasyonunu kapatır', motionDisabled);
  await page.waitForTimeout(2900);
  check('Oynat kullanıcı eyleminden sonra sıradaki olaya ilerler', await event.innerText() !== beforePlayback && await highlights.getAttribute('data-playing') === 'true');
  await page.getByTestId('highlight-play').click();
  const paused = await event.innerText();
  await page.waitForTimeout(2800);
  check('Duraklatılan özet kendi kendine ilerlemez', await highlights.getAttribute('data-playing') === 'false' && await event.innerText() === paused);
  await page.setViewportSize({ width: 390, height: 844 });
  box = await layout('[data-testid="highlights-stage"]');
  check('390 px görsel maç özeti panel içine sığar', fits(box), JSON.stringify(box));
  await screenshot('05-highlights-390');
  await quick.getByRole('button', { name: "Ana Merkez'e Dön" }).click();
  const matchSave = await waitForSave((b) => (b?.matchReports?.length ?? 0) > 0);
  check('Gerçek maç sonucu ve sıkıştırılmış olaylar kaydedilir', matchSave.version === 4 && Array.isArray(matchSave.matchReports[0].events) && matchSave.matchReports[0].events.length > 0);
  await page.getByRole('button', { name: /Daha/ }).first().click();
  await page.getByRole('button', { name: /İstatistik/ }).first().click();
  await page.getByRole('tab', { name: 'Lig Analizi' }).click();
  await page.getByTestId('archive-highlight-open').first().click();
  check('Lig Analizi gerçek son maç arşivinden özeti açar', await page.getByTestId('match-highlights').isVisible() && /Arşivde olay türü ve dakika/.test(await page.getByTestId('match-highlights').innerText()));
  check('Arşiv konum saklamadığı için uydurma yol çizilmez', await page.getByTestId('highlight-no-position').isVisible() && await page.getByTestId('highlights-route').count() === 0);
  box = await layout('[data-testid="highlights-stage"]');
  check('390 px arşiv özeti yatay taşmaz', fits(box), JSON.stringify(box));
  await screenshot('06-archive-390');
  await page.getByRole('dialog', { name: 'Maç Arşivi · Öne Çıkan Anlar' }).getByRole('button', { name: 'Kapat' }).click();
  check('Arşiv özeti kapatılabilir ve analiz ekranı korunur', await page.getByRole('tab', { name: 'Lig Analizi' }).getAttribute('aria-selected') === 'true');
  check('Tarayıcıda yakalanmamış uygulama hatası yok', errors.length === 0, errors.join(' | '));
} catch (error) {
  failed++;
  console.error('❌ Yenileme/özet tarayıcı testi:', error);
  await screenshot('failure').catch(() => {});
} finally {
  await browser.close();
}
console.log(`\nRENEWAL-HIGHLIGHTS-BROWSER: ${passed} geçti, ${failed} başarısız`);
if (failed) process.exitCode = 1;
