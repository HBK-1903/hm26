// Real browser approval path, using a migrated v2 career and the production UI/IndexedDB.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const base = process.env.HM26_BASE_URL ?? 'http://127.0.0.1:4173';
const executablePath = process.env.HM26_CHROMIUM;
const launchOptions = executablePath ? { executablePath, headless: true, args: ['--no-sandbox', '--single-process', '--no-zygote', '--disable-gpu', '--disable-dev-shm-usage'] } : {};
const width = Number(process.env.HM26_VIEWPORT_WIDTH ?? 390);
const browser = await chromium.launch(launchOptions);
const context = await browser.newContext({ viewport: { width, height: width <= 320 ? 720 : 844 }, locale: 'tr' });
const page = await context.newPage();
let passed = 0, failed = 0;
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const check = (name, condition, detail = '') => { condition ? passed++ : failed++; console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
const read = () => page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => { const r = indexedDB.open('manager26', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  const data = await new Promise((resolve, reject) => { const r = db.transaction('saves').objectStore('saves').get(1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  db.close(); return data ?? null;
});
const waitForSave = async (predicate) => {
  const end = Date.now() + 12_000;
  while (Date.now() < end) {
    const value = await read();
    if (predicate(value)) return value;
    await page.waitForTimeout(100);
  }
  throw new Error('Beklenen bütçe kaydı oluşmadı');
};
const notice = async () => { await page.getByRole('button', { name: 'Anladım' }).first().click({ timeout: 2000 }).catch(() => {}); };
const goFinance = async () => {
  await page.locator('nav[aria-label="Ana gezinme"]').getByRole('button', { name: 'Daha' }).click();
  await page.getByRole('dialog', { name: 'Kulüp ve kariyer' }).getByRole('button', { name: 'Kulüp', exact: true }).click();
  await page.getByRole('button', { name: 'Finans', exact: true }).click();
};

try {
  // This fixture is from the first public v2 app; only test conditions are edited.
  const fixture = JSON.parse(readFileSync('tools/fixtures/save-v2-original.json', 'utf8'));
  const blob = fixture.blob;
  blob.career.day = 60; blob.career.week = 9; blob.career.boardConfidence = 70; blob.day = 60;
  blob.budget.tb = 6;
  blob.table.gecit = blob.table.gecit.map((row) => row.clubId === blob.career.clubId
    ? { ...row, p: 4, w: 4, d: 0, l: 0, gf: 8, ga: 1, pts: 12 }
    : { ...row, p: 4, w: 0, d: 0, l: 4, gf: 1, ga: 8, pts: 0 });
  blob.inbox.push({ id: `board-budget-request-${blob.career.clubId}-60`, kind: 'yonetim', title: 'Bütçe talebi yanıtlandı', body: 'Önceki sürümün sabit yanıtı.', day: 60, read: false });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Başla' }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Buraya dosya içe aktar' }).first().click();
  await (await chooser).setFiles({ name: 'eski-kariyer.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  const imported = await waitForSave((record) => record?.blob?.career?.manager?.name === 'Eski Sürüm Testi');
  check('İlk sürümden v2 kariyer koşullar korunarak içe aktarılır', imported.blob.version === 5 && imported.blob.budget.tb === 6);
  const card = page.locator('.bg-surface').filter({ hasText: 'Eski Sürüm Testi' }).first();
  await card.getByRole('button', { name: 'Devam Et' }).click();
  await notice(); await goFinance();
  check('Eski sabit yanıt onay için yeni talebi engellemez', await page.getByText('Mevcut koşullar onay için uygun.').isVisible() && await page.getByRole('button', { name: 'Talep Gönder' }).isEnabled());
  check('Önerilen tutar ve değerlendirme görünür', await page.getByText(/Onaylanırsa transfer bütçesine ₺1\.2M/).isVisible() && await page.getByText(/70.*4 lig maçı/).isVisible());
  const layout = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  check(`${width}px ekranda yatay taşma yok`, layout.document <= layout.viewport, `${layout.document}/${layout.viewport}`);
  await page.getByRole('button', { name: 'Talep Gönder' }).click({ clickCount: 2 });
  const saved = await waitForSave((record) => record?.blob?.inbox?.some((m) => m.id === `board-budget-v1:${blob.career.clubId}:1:60:approved`));
  check('Gerçek onay bütçeye ₺1,2M ekler ve otomatik kaydeder', saved.blob.budget.tb === 7.2);
  check('Çift tıklamada tek onay haberi oluşur ve sezon kilidi gösterilir', saved.blob.inbox.filter((m) => m.title === 'Ek bütçe talebi onaylandı').length === 1 && await page.getByRole('button', { name: 'Talep Gönder' }).isDisabled() && await page.getByText(/bu sezon ek bütçe zaten onaylandı/).isVisible());
  await page.getByRole('button', { name: /Gelen kutusu/ }).click();
  await page.getByText('Ek bütçe talebi onaylandı', { exact: true }).click();
  check('Gelen kutusundaki yönetim cevabı gerçek tutarı ve yeni bakiyeyi açıklar', await page.getByRole('dialog').getByText(/₺1\.2M ek transfer bütçesini onayladı.*₺7\.2M/).isVisible());
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Devam Et —/ }).click();
  await notice(); await goFinance();
  const reopened = await read();
  check('Sayfa yenilenince bakiye ve sezonluk tekrar engeli korunur', reopened.blob.budget.tb === 7.2 && await page.getByRole('button', { name: 'Talep Gönder' }).isDisabled() && await page.getByText(/bu sezon ek bütçe zaten onaylandı/).isVisible());
  check('Tarayıcıda yakalanmamış uygulama hatası yok', errors.length === 0, errors.join(' | '));
} catch (error) { failed++; console.error(error?.stack || error); }
finally { await context.close(); await browser.close(); }
console.log(`\n${passed}/${passed + failed} yönetim bütçesi tarayıcı kontrolü geçti (${width}px).`);
process.exit(failed ? 1 : 0);
