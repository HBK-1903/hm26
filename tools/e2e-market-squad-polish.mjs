// Real-browser regression: potential, collapsible rotation, sale negotiation and match report.
// A dedicated IndexedDB fixture creates one incoming offer; no production save is touched.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.env.HM26_BASE_URL ?? 'http://127.0.0.1:4173';
const executablePath = process.env.HM26_CHROMIUM;
const launchOptions = executablePath ? {
  executablePath, headless: true,
  args: ['--no-sandbox', '--single-process', '--no-zygote', '--disable-gpu', '--disable-dev-shm-usage'],
} : {};
const browser = await chromium.launch(launchOptions);
const page = await browser.newPage({ viewport: { width: 320, height: 720 }, locale: 'tr' });
const errors = [];
const voices = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => { if (request.url().includes('/assets/transfer/voice/')) voices.push(request.url()); });
let passed = 0, failed = 0;
const check = (name, condition, detail = '') => {
  condition ? passed++ : failed++;
  console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`);
};
const screenshotDir = process.env.HM26_SCREENSHOTS;
if (screenshotDir) mkdirSync(screenshotDir, { recursive: true });
const screenshot = async (name) => { if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/${name}.png` }); };
const nav = (name) => page.locator('nav[aria-label="Ana gezinme"] button', { hasText: name });
const readSave = async () => page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => { const r = indexedDB.open('manager26', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  const entry = await new Promise((resolve, reject) => { const r = db.transaction('saves').objectStore('saves').get(1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  db.close(); return entry?.blob ?? null;
});
// Playwright's waitForFunction treats an async callback's Promise as truthy, so
// await the IndexedDB read here and only stop when its resolved value matches.
const waitForSave = async (predicate) => {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    const blob = await readSave();
    if (predicate(blob)) return blob;
    await page.waitForTimeout(100);
  }
  throw new Error('Beklenen kariyer kaydı zamanında oluşmadı');
};
const noOverflow = async () => page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
const allPotential = async () => page.getByTestId('market-player').evaluateAll((cards) => ({
  count: cards.length,
  complete: cards.every((card) => /^POT (\d+|—)$/.test(card.querySelector('[aria-label^="Potansiyel "]')?.textContent?.trim() ?? '')),
}));

try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Başla|Kayıt Yuvaları/ }).first().click();
  await page.getByText('Yeni Kariyer — Yuva 1').first().click();
  await page.locator('input').first().fill('Piyasa Testi');
  await page.getByText('Eski Futbolcu').first().click();
  for (let i = 0; i < 6 && !(await page.getByText('Denizli Yeşilova').count()); i++) {
    await page.getByRole('button', { name: 'Devam', exact: true }).first().click();
  }
  await page.getByText('Denizli Yeşilova').first().click();
  await page.getByRole('button', { name: /Kulüp Brifingine Git/ }).click();
  await page.getByRole('button', { name: /Kariyeri Başlat/ }).click();
  await page.getByRole('button', { name: 'Anladım' }).first().click({ timeout: 2500 }).catch(() => {});
  await waitForSave((blob) => !!blob);

  await nav('Piyasa').click();
  let potential = await allPotential();
  check('320 px fırsat kartlarının tümünde potansiyel var', potential.count > 0 && potential.complete, JSON.stringify(potential));
  await screenshot('01-market-320');
  const firstStar = page.getByTestId('market-player').first().getByRole('button', { name: 'Kısa listeye ekle' });
  await firstStar.focus();
  await firstStar.press('Enter');
  check('Kısa liste klavyeyle açılır ve odak kaybolmaz', await page.evaluate(() => document.activeElement?.getAttribute('aria-pressed') === 'true' && document.activeElement?.getAttribute('aria-label') === 'Kısa listeden çıkar'));
  await page.getByRole('button', { name: 'Oyuncu Ara' }).click();
  potential = await allPotential();
  check('Arama listesindeki bütün oyuncularda POT görünür', potential.count > 0 && potential.complete, JSON.stringify(potential));
  await page.getByRole('group', { name: 'Mevki filtresi' }).getByRole('button', { name: 'Kanat Bek' }).click();
  const positions = await page.getByTestId('market-player').evaluateAll((cards) => cards.map((card) => card.dataset.position));
  check('Kanat bek filtresi yalnız doğru mevkiyi gösterir', positions.every((p) => p === 'WB'));
  await page.getByRole('textbox', { name: 'Oyuncu veya kulüp ara' }).fill('kesinlikle-bulunmayan-qa-000');
  check('Sonuç bulunmazsa açıklayıcı boş durum var', await page.getByText(/Bu kriterde piyasada oyuncu yok/).isVisible());
  await page.getByRole('button', { name: /Filtreleri temizle/ }).click();
  check('Filtreleri temizle oyuncuları geri getirir', (await allPotential()).count > 0 && await page.getByRole('textbox', { name: 'Oyuncu veya kulüp ara' }).inputValue() === '');
  await page.getByRole('button', { name: /Kısa Liste/ }).click();
  potential = await allPotential();
  check('Kısa listede de potansiyel görünür', potential.count === 1 && potential.complete);
  let layout = await noOverflow();
  check('320 px piyasada yatay taşma yok', layout.scrollWidth <= layout.width, JSON.stringify(layout));

  await nav('Kadro').click();
  const toggle = page.getByTestId('rotation-desk').getByRole('button', { name: /ROTASYON MASASI/ });
  check('Rotasyon masası başlangıçta kapalı', await toggle.getAttribute('aria-expanded') === 'false' && await page.locator('#rotation-desk-content').isHidden());
  await toggle.focus(); await toggle.press('Space');
  check('Rotasyon masası klavyeyle açılır', await toggle.getAttribute('aria-expanded') === 'true' && await page.locator('#rotation-desk-content').isVisible());
  await screenshot('02-rotation-open-320');
  await toggle.press('Space');
  check('Rotasyon masası klavyeyle tekrar kapanır', await toggle.getAttribute('aria-expanded') === 'false' && await page.locator('#rotation-desk-content').isHidden());
  layout = await noOverflow();
  check('320 px kadro ekranında yatay taşma yok', layout.scrollWidth <= layout.width, JSON.stringify(layout));

  // Return to the start menu so no mounted game can overwrite the test fixture.
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Devam Et/ }).first().waitFor();
  await page.waitForTimeout(400);
  const fixture = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('manager26', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const entry = await new Promise((resolve, reject) => { const r = db.transaction('saves').objectStore('saves').get(1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const b = entry.blob, playerId = `${b.career.clubId}_GK_0`, offerId = 'e2e-sale-85';
    b.playerPatch[playerId] = { ...(b.playerPatch[playerId] ?? {}), ratings: { gen: 85, tek: 72, att: 10, def: 70, fiz: 80, men: 78, kal: 88 }, potential: 88 };
    b.incomingOffers = [{ id: offerId, playerId, fromClubId: 'sakarya_vadi', fee: 2, day: b.career.day, expiresDay: b.career.day + 5, negotiable: true, state: 'open' }];
    b.sellOnClauses = { ...(b.sellOnClauses ?? {}), [playerId]: [{ beneficiaryClubId: 'aydin_efe', pct: 20, signedFee: 1, signedDay: 0 }] };
    await new Promise((resolve, reject) => { const tx = db.transaction('saves', 'readwrite'); tx.objectStore('saves').put(entry); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
    db.close(); return { offerId, playerId, budget: b.budget.tb };
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Devam Et/ }).first().click();
  await page.getByRole('button', { name: 'Anladım' }).first().click({ timeout: 2000 }).catch(() => {});
  await nav('Piyasa').click();
  await page.getByRole('button', { name: /^Diğer/ }).click();
  await page.getByRole('dialog', { name: 'Diğer piyasa bölümleri' }).getByRole('button', { name: 'Sözleşmeler' }).click();
  check('Sözleşme bölümünde kadrodaki oyuncuların POT değerleri görünür', await page.locator('div.text-muted').filter({ hasText: /POT \d+/ }).count() >= 20);
  layout = await noOverflow();
  check('320 px sözleşme kartlarında yatay taşma yok', layout.scrollWidth <= layout.width, JSON.stringify(layout));
  await page.getByRole('button', { name: /^Diğer/ }).click();
  await page.getByRole('dialog', { name: 'Diğer piyasa bölümleri' }).getByRole('button', { name: /Gelen Teklifler/ }).click();
  const incomingText = await page.getByTestId(`sale-open-${fixture.offerId}`).locator('xpath=../..').innerText();
  check('Gelen teklif kartında da oyuncunun GEN ve POT değerleri görünür', /85 GEN/.test(incomingText) && /POT 88/.test(incomingText));
  await page.getByTestId(`sale-open-${fixture.offerId}`).click();
  const flow = page.getByTestId('sale-flow');
  check('Gelen satış teklifi hareketli alıcı görüşmesini açar', await flow.getAttribute('data-stage') === 'offer' && await page.getByTestId('transfer-theatre').getAttribute('data-scene') === 'negotiation');
  const sceneLayout = await page.getByTestId('transfer-theatre').evaluate((element) => {
    const box = element.getBoundingClientRect(), parent = element.closest('[role="dialog"]').getBoundingClientRect();
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, sceneLeft: box.left, sceneRight: box.right, sceneWidth: box.width, dialogLeft: parent.left, dialogRight: parent.right };
  });
  check('320 px satış sahnesi diyalog içine sığar', sceneLayout.scrollWidth <= sceneLayout.width && sceneLayout.sceneLeft >= sceneLayout.dialogLeft && sceneLayout.sceneRight <= sceneLayout.dialogRight && sceneLayout.sceneWidth >= 240, JSON.stringify(sceneLayout));
  await screenshot('03-sale-offer-320');
  check('Cevap seçmeden satış ilerlemez', await page.getByTestId('sale-original').isDisabled() && await page.getByTestId('sale-counter').isDisabled());
  await page.getByTestId('sale-reply-calm').click();
  check('Menajerin cevabı seçilir ve konuşma altyazıya yansır', await page.getByTestId('sale-reply-calm').getAttribute('aria-pressed') === 'true' && (await page.getByTestId('transfer-subtitle').innerText()).length > 20);
  await page.waitForFunction(() => performance.getEntriesByType('resource').some((entry) => entry.name.includes('/assets/transfer/voice/')), null, { timeout: 5000 });
  check('Satış görüşmesindeki Türkçe ses yerel kaynaktan istenir', voices.some((url) => url.startsWith(base)), voices.at(-1) ?? '');
  await page.getByTestId('sale-original').click();
  check('Alıcı yanıtında oyuncunun henüz satılmadığı açıkça belirtilir', await flow.getAttribute('data-stage') === 'response' && /henüz satılmadı/i.test(await flow.innerText()));
  await page.getByTestId('sale-review').click();
  const review = await flow.innerText();
  check('Son onayda brüt, önceki pay ve net bütçe gösterilir', review.includes('₺2.00M') && review.includes('₺0.40M') && review.includes('₺1.60M') && review.includes('Onaylamadan oyuncu kadrodan ayrılmaz'));
  await screenshot('04-sale-review-320');
  let before = await readSave();
  check('Son onaya kadar oyuncu ve bütçe değişmez', before.incomingOffers.find((o) => o.id === fixture.offerId)?.state === 'open' && before.budget.tb === fixture.budget && !before.transferLog.some((row) => row.id.startsWith(`to-${fixture.offerId}`)));
  await page.getByRole('button', { name: 'Vazgeç · Teklif Açık Kalsın' }).click();
  check('Vazgeçme teklifi kapatmadan görüşmeden çıkarır', await flow.count() === 0 && await page.getByTestId(`sale-open-${fixture.offerId}`).isVisible());
  await page.getByTestId(`sale-open-${fixture.offerId}`).click();
  await page.getByTestId('sale-reply-calm').click();
  await page.getByTestId('sale-counter').click(); // default 25% increase is accepted but not committed
  check('Karşı teklif kabulünde de son onay beklenir', await flow.getAttribute('data-stage') === 'response' && /henüz satılmadı/i.test(await flow.innerText()));
  await page.getByTestId('sale-review').click();
  await page.getByTestId('sale-confirm').dispatchEvent('click', { detail: 2 });
  check('Önceki çift tıklama satışın son onayı yerine geçmez', await flow.getAttribute('data-stage') === 'review' && await page.getByTestId('sale-signing').count() === 0);
  await page.getByTestId('sale-confirm').dblclick();
  await page.waitForFunction(() => { const flow = document.querySelector('[data-testid="sale-flow"]'); return !flow || flow.getAttribute('data-stage') === 'signed'; });
  check('Satış tamamlandıktan sonra imza sahnesi kullanıcıyı bekler', await page.getByTestId('sale-signing').isVisible() && await page.getByTestId('transfer-theatre').getAttribute('data-beat') === 'signed' && await page.getByTestId('sale-complete').count() === 0);
  await page.getByTestId('sale-open-reveal').dispatchEvent('click', { detail: 2 });
  check('Satış onayındaki çift tıklama tanıtıma yanlışlıkla geçirmez', await page.getByTestId('sale-signing').isVisible() && await page.getByTestId('sale-complete').count() === 0);
  await screenshot('04a-sale-signing');
  await page.getByTestId('sale-open-reveal').click();
  await page.getByTestId('sale-complete').waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="cinematic-decisions"]')?.scrollTop === 0);
  check('Satış tanıtımı karar alanının başından açılır', await page.getByTestId('cinematic-decisions').evaluate((el) => el.scrollTop) === 0);
  const complete = page.getByTestId('sale-complete');
  check('85 GEN satışında özel yıldız tanıtımı ve alıcı kulüp gösterilir', await complete.getAttribute('data-reveal-tier') === 'star' && (await complete.innerText()).includes('Sakarya'));
  const completedText = await complete.textContent() ?? '';
  check('Tamamlanan satış net giren tutarı geçmiş zamanda gösterir', completedText.includes('Bütçeye net giren') && completedText.includes('₺2.00M'));
  await page.setViewportSize({ width: 390, height: 844 });
  layout = await noOverflow();
  check('390 px yıldız tanıtımında yatay taşma yok', layout.scrollWidth <= layout.width, JSON.stringify(layout));
  await screenshot('05-star-reveal-390');
  await page.getByTestId('sale-announcement').click();
  check('Yıldız tanıtımı anonsu kullanıcı tıklamasıyla başlar', /sunucu/i.test(await page.getByTestId('transfer-subtitle').innerText()));
  const after = await waitForSave((blob) => blob?.transferLog?.some((entry) => entry.id.startsWith('to-e2e-sale-85')));
  check('Çift tıklamada satış bir kez kaydedilir; net bütçe ve pay doğrudur', after.transferLog.filter((entry) => entry.id.startsWith(`to-${fixture.offerId}`)).length === 1 && after.transferLog.find((entry) => entry.id.startsWith(`to-${fixture.offerId}`))?.sellOnPaid === 0.5 && after.budget.tb === Math.round((fixture.budget + 2) * 100) / 100 && after.playerClub[fixture.playerId] === 'sakarya_vadi');
  await complete.getByRole('button', { name: 'Piyasaya Dön', exact: true }).click();

  // Advance normally, play an actual match and inspect the user-controlled final report.
  await nav('Merkez').click();
  for (let day = 0; day < 12; day++) {
    if (await page.getByRole('button', { name: /Maç Merkezine Git/ }).count() && /0 gün kaldı|Maç günü|MAÇ GÜNÜ/i.test(await page.locator('body').innerText())) break;
    const next = page.getByRole('button', { name: /Sonraki Gün/ }).first();
    if (await next.isVisible()) await next.click();
    const confirm = page.getByRole('dialog', { name: 'Gün Sonu Özeti' }).getByRole('button', { name: 'Tamam' });
    if (await confirm.isVisible()) await confirm.click();
    await page.waitForTimeout(250);
  }
  await page.getByRole('button', { name: /Maç Merkezine Git/ }).first().click();
  await page.getByRole('button', { name: /Maça Başla/ }).first().click();
  await page.getByRole('tab', { name: 'Spiker ve Maç Günlüğü' }).click();
  const feed = page.getByRole('log', { name: 'Maç olay akışı' });
  check('Gerçek maç canlı akışı başlama olayını gösterir', (await feed.innerText()).includes('Maç başladı'));
  await page.getByRole('button', { name: 'Maçı duraklat' }).click();
  await page.getByTestId('live-checkpoint-status').getByText('Maç ilerlemesi kaydedildi.').waitFor();
  const checkpoint = (await waitForSave((blob) => !!blob?.liveMatchCheckpoint?.view?.paused)).liveMatchCheckpoint;
  await nav('Merkez').click();
  check('Devam eden maçta menü kariyer değişimini engeller ve maçı korur', await page.getByText(/Önce devam eden maçını tamamla/).isVisible() && await feed.isVisible());
  await page.evaluate(() => history.back());
  await page.waitForFunction(() => location.hash === '#matchPrep');
  check('Tarayıcı geri tuşu da devam eden maçtan güvenli olmayan çıkışı engeller', await page.getByText(/Önce devam eden maçını tamamla/).isVisible() && await feed.isVisible());
  const unloadGuard = await page.evaluate(() => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; });
  check('Devam eden maçta sayfayı kapatma koruması etkin', unloadGuard);
  await nav('Daha').click();
  let backupWarning = '';
  page.once('dialog', async (dialog) => { backupWarning = dialog.message(); await dialog.accept(); });
  await page.getByRole('dialog', { name: 'Kulüp ve kariyer' }).getByRole('button', { name: 'Yedekleme', exact: true }).click();
  check('Kayıtlı maç varken yedekleme uyarıyla erişilebilir', /son kaydedilen noktasına/.test(backupWarning) && await page.getByRole('button', { name: /Kayıtlı maça dön/ }).isVisible());
  await page.getByRole('button', { name: /Kayıtlı maça dön/ }).click();
  await page.getByRole('button', { name: 'Maça Devam Et', exact: true }).click();
  await page.getByTestId('live-checkpoint-status').getByText('Maç ilerlemesi kaydedildi.').waitFor();
  check('Yedeklemeden dönünce maç aynı kayıt noktasında sürer', (await readSave()).liveMatchCheckpoint?.checksum === checkpoint.checksum && await feed.isVisible());
  await page.getByRole('button', { name: 'Maça devam et' }).click();
  await page.getByRole('button', { name: '4 kat hız' }).click();
  const endButton = page.getByRole('button', { name: /Maç Sonu Röportajına Geç/ });
  const start = Date.now();
  while (!(await endButton.isVisible()) && Date.now() - start < 80_000) {
    const choices = ['Sessiz kal', 'Dönüşünü bekle', 'Devam Et'];
    for (const label of choices) {
      const button = page.getByRole('dialog').getByRole('button', { name: new RegExp(label) }).first();
      if (await button.isVisible().catch(() => false)) { await button.click(); break; }
    }
    await page.waitForTimeout(250);
  }
  check('Maç bittiğinde ekran otomatik geçmez, kullanıcıyı bekler', await endButton.isVisible() && await page.getByRole('tab', { name: 'Spiker ve Maç Günlüğü' }).getAttribute('aria-selected') === 'true');
  await endButton.click();
  await page.getByRole('button', { name: /Röportaj vermeden geç/ }).click();
  check('Canlı maç raporunda özet kullanıcı açana kadar başlamaz', await page.getByTestId('open-highlights').isVisible() && await page.getByTestId('match-highlights').count() === 0);
  await page.getByTestId('open-highlights').click();
  const liveHighlights = page.getByRole('dialog', { name: 'Öne Çıkan Anlar' });
  check('Canlı maçın gerçek olayları duraklatılmış görsel özette açılır', await liveHighlights.getByTestId('match-highlights').getAttribute('data-playing') === 'false' && (await liveHighlights.getByTestId('highlight-event').innerText()).length > 10);
  check('Özet kendi kendine sonuç kaydetmez', await liveHighlights.getByTestId('highlight-next').isVisible() && await page.getByTestId('match-report-footer').count() === 1);
  await liveHighlights.getByRole('button', { name: 'Kapat' }).click();
  check('Özet kapanınca canlı maçın manuel sonuç raporu korunur', await page.getByRole('button', { name: 'Sonucu Kaydet — Ana Merkez' }).isVisible());
  await page.getByRole('button', { name: 'Olaylar', exact: true }).click();
  const events = page.getByTestId('match-report-event');
  const eventTexts = await events.allTextContents();
  check('Maç raporunda motorun gerçek olayları ve başlama düdüğü görünür', eventTexts.length > 10 && eventTexts.some((text) => /Maç başladı/.test(text)), `olay=${eventTexts.length}`);
  await screenshot('06-match-events-390');
  await page.setViewportSize({ width: 320, height: 720 });
  layout = await noOverflow();
  check('320 px maç raporunda yatay taşma yok', layout.scrollWidth <= layout.width, JSON.stringify(layout));
  const footerLayout = await page.getByTestId('match-report-footer').evaluate((footer) => {
    const box = footer.getBoundingClientRect(), nav = document.querySelector('nav[aria-label="Ana gezinme"]').getBoundingClientRect();
    const buttons = [...footer.querySelectorAll('button')].map((button) => { const b = button.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, height: b.height }; });
    return { footerBottom: box.bottom, navTop: nav.top, buttons };
  });
  check('Raporun iki kayıt düğmesi alt menünün üstünde ve dokunulabilir', footerLayout.buttons.length === 2 && footerLayout.footerBottom <= footerLayout.navTop + 1 && footerLayout.buttons.every((button) => button.bottom <= footerLayout.navTop + 1 && button.height >= 44), JSON.stringify(footerLayout));
  await screenshot('07-match-events-320');
  await page.getByRole('group', { name: 'Maç olayı filtresi' }).getByRole('button', { name: 'Önemli anlar' }).click();
  const importantCount = await events.count();
  check('Önemli anlar filtresi olayları daraltır veya dürüst boş durum gösterir', importantCount <= eventTexts.length && (importantCount > 0 || await page.getByText('Bu filtrede önemli olay bulunmuyor.').isVisible()), `önemli=${importantCount}`);
  await page.getByRole('button', { name: 'Sonucu Kaydet — Ana Merkez' }).click();
  const reportSave = await waitForSave((blob) => (blob?.matchReports?.length ?? 0) > 0);
  check('Oynanan maçın gerçek olayları 5. sürüm arşive kaydedilir', reportSave.version === 5 && Array.isArray(reportSave.matchReports[0].events) && reportSave.matchReports[0].events.length > 0);
  const unloadAfterSave = await page.evaluate(() => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; });
  check('Sonuç kaydedildikten sonra çıkış koruması kapanır', !unloadAfterSave);
  check('Tarayıcıda yakalanmamış uygulama hatası yok', errors.length === 0, errors.join(' | '));
} catch (error) {
  failed++;
  console.error('❌ Piyasa/kadro/maç tarayıcı testi:', error);
  await screenshot('failure').catch(() => {});
} finally {
  await browser.close();
}
console.log(`\nMARKET-SQUAD-BROWSER: ${passed} geçti, ${failed} başarısız`);
if (failed) process.exitCode = 1;
