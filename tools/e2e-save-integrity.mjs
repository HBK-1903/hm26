// Real Chromium backup, quota, stale-tab and legacy-save regression on an isolated browser profile.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const base = process.env.HM26_BASE_URL ?? 'http://127.0.0.1:4173';
const executablePath = process.env.HM26_CHROMIUM;
const launchOptions = executablePath ? { executablePath, headless: true, args: ['--no-sandbox', '--single-process', '--no-zygote', '--disable-gpu', '--disable-dev-shm-usage'] } : {};
const browser = await chromium.launch(launchOptions);
const width = Number(process.env.HM26_VIEWPORT_WIDTH ?? 390);
const viewport = { width, height: width <= 320 ? 720 : 844 };
const context = await browser.newContext({ viewport, locale: 'tr', acceptDownloads: true });
let historicalBrowser, historicalContext;
let passed = 0, failed = 0;
const pageErrors = [];
const check = (name, condition, detail = '') => { condition ? passed++ : failed++; console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
const instrument = (page) => page.on('pageerror', (error) => pageErrors.push(error.message));
const read = (page, slot = 1) => page.evaluate(async (slotNo) => {
  const db = await new Promise((resolve, reject) => { const r = indexedDB.open('manager26', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  const data = await new Promise((resolve, reject) => { const r = db.transaction('saves').objectStore('saves').get(slotNo); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  db.close(); return data ?? null;
}, slot);
const waitForSave = async (page, predicate, slot = 1) => {
  const end = Date.now() + 12_000;
  while (Date.now() < end) {
    const value = await read(page, slot);
    if (predicate(value)) return value;
    await page.waitForTimeout(100);
  }
  throw new Error(`Yuva ${slot}: beklenen kayıt oluşmadı`);
};
const notice = async (page) => { await page.getByRole('button', { name: 'Anladım' }).first().click({ timeout: 2000 }).catch(() => {}); };
const goMore = async (page, label) => {
  await page.locator('nav[aria-label="Ana gezinme"]').getByRole('button', { name: 'Daha' }).click();
  await page.getByRole('dialog', { name: 'Kulüp ve kariyer' }).getByRole('button', { name: label, exact: true }).click();
};
const file = (obj, name = 'kariyer.json') => ({ name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(obj)) });
const envelope = (blob, format = 'hm26-save', version = 4) => ({ format, version, exportedAt: Date.now(), blob });

try {
  const page = await context.newPage(); instrument(page);
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Başla|Kayıt Yuvaları/ }).first().click();
  await page.getByText('Yeni Kariyer — Yuva 1').click();
  await page.locator('input').first().fill('Aktif Menajer');
  await page.getByText('Eski Futbolcu').first().click();
  for (let i = 0; i < 6 && !(await page.getByText('Denizli Yeşilova').count()); i++) await page.getByRole('button', { name: 'Devam', exact: true }).first().click();
  await page.getByText('Denizli Yeşilova').first().click();
  await page.getByRole('button', { name: /Kulüp Brifingine Git/ }).click();
  await page.getByRole('button', { name: /Kariyeri Başlat/ }).click();
  await notice(page);
  const original = await waitForSave(page, (record) => !!record?.blob?.career);
  check('Yeni kariyer gerçek IndexedDB yuvasına kaydedildi', original.blob.career.manager.name === 'Aktif Menajer' && original.blob.version === 5);

  await page.locator('nav[aria-label="Ana gezinme"]').getByRole('button', { name: 'Kadro', exact: true }).click();
  const playerCard = page.locator('button').filter({ hasText: /yaş/ }).first();
  await playerCard.click();
  await page.getByRole('button', { name: 'Satış Listesine Koy' }).click();
  const listed = await waitForSave(page, (record) => record?.blob?.transferListed?.length === 1);
  const listedPlayer = listed.blob.transferListed[0];
  check('Kadrodan satış listesine ekleme ve haber elle kaydetmeden saklanır', !!listedPlayer && listed.blob.inbox.some((message) => message.id === `tl-${listedPlayer}`));
  await playerCard.click();
  await page.getByRole('button', { name: 'Listeden Çıkar' }).click();
  let unlisted = await waitForSave(page, (record) => record?.meta?.updatedAt > listed.meta.updatedAt && !record?.blob?.transferListed?.includes(listedPlayer));
  check('Satış listesinden çıkarma da elle kaydetmeden saklanır', !unlisted.blob.transferListed.includes(listedPlayer));
  await playerCard.click();
  await page.getByRole('button', { name: 'Satış Listesine Koy' }).click();
  const relisted = await waitForSave(page, (record) => record?.meta?.updatedAt > unlisted.meta.updatedAt && record?.blob?.transferListed?.includes(listedPlayer));
  check('Aynı oyuncu tekrar listeye alınca yinelenen haber oluşmaz', relisted.blob.inbox.filter((message) => message.id === `tl-${listedPlayer}`).length === 1);
  await playerCard.click();
  await page.getByRole('button', { name: 'Listeden Çıkar' }).click();
  unlisted = await waitForSave(page, (record) => record?.meta?.updatedAt > relisted.meta.updatedAt && !record?.blob?.transferListed?.includes(listedPlayer));

  await goMore(page, 'Kulüp');
  await page.getByRole('button', { name: 'Finans', exact: true }).click();
  check('Yönetim ek bütçenin tutarını ve koşullarını önceden açıklar', await page.getByText(/Onaylanırsa transfer bütçesine/).isVisible() && await page.getByText(/En az 4 lig maçı ve %60 yönetim güveni/).isVisible());
  await page.getByRole('button', { name: 'Talep Gönder' }).click();
  const requested = await waitForSave(page, (record) => record?.blob?.inbox?.some((message) => message.title === 'Ek bütçe talebi reddedildi'));
  check('Sezon başındaki koşulsuz talep gerekçeyle reddedilir ve bütçeyi değiştirmez', requested.blob.budget.tb === unlisted.blob.budget.tb && requested.blob.inbox.some((message) => message.title === 'Ek bütçe talebi reddedildi' && message.body.includes('en az 4 lig maçı')));
  check('Ret sonrası tekrar talep engellenir ve mali kayıt kimliğiyle çakışmaz', await page.getByRole('button', { name: 'Talep Gönder' }).isDisabled() && requested.blob.inbox.filter((message) => message.id === `board-budget-v1:${requested.blob.career.clubId}:${requested.blob.seasonNo}:${requested.blob.career.day}:rejected`).length === 1 && requested.blob.inbox.every((message) => message.title !== 'Ek bütçe talebi reddedildi' || message.id !== `fin-${requested.blob.career.day}`));
  await page.locator('input[type="range"]').fill('1');
  await page.getByRole('button', { name: 'Aktarımı Onayla' }).click();
  const moved = await waitForSave(page, (record) => record?.blob?.budget?.tb === requested.blob.budget.tb - 1 && record?.blob?.budget?.wbExtra === 0.05);
  check('Transferden maaşa aktarım ve yönetim haberi birlikte otomatik kaydedilir', moved.blob.inbox.some((message) => message.title === 'Bütçe aktarımı onaylandı'));

  await goMore(page, 'Ayarlar');
  const contrast = page.getByRole('switch', { name: 'Yüksek kontrast' });
  const previousContrast = original.blob.career.settings.highContrast;
  await contrast.click();
  const auto = await waitForSave(page, (record) => record?.blob?.career?.settings?.highContrast !== previousContrast);
  check('Ayar değişikliği elle kaydetmeden otomatik kaydedilir', auto.blob.career.settings.highContrast !== previousContrast);
  await contrast.click();
  await waitForSave(page, (record) => record?.blob?.career?.settings?.highContrast === previousContrast);
  await page.evaluate(() => {
    const proto = IDBDatabase.prototype;
    window.__originalTransaction = proto.transaction;
    proto.transaction = function (...args) {
      if (args[1] === 'readwrite' && (Array.isArray(args[0]) ? args[0].includes('saves') : args[0] === 'saves')) throw new DOMException('Test kotası dolu', 'QuotaExceededError');
      return window.__originalTransaction.apply(this, args);
    };
  });
  if ((await contrast.getAttribute('aria-checked')) === String(previousContrast)) await contrast.click();
  await goMore(page, 'Yedekleme');
  await page.getByRole('button', { name: 'Şimdi Kaydet' }).click();
  await page.getByText(/Kayıt başarısız; ilerlemeni/).waitFor({ timeout: 10_000 });
  check('Depolama hatası başarısızlık olarak gösterilir, sahte başarı yok', await page.getByText(/Kayıt başarısız; ilerlemeni/).isVisible() && !(await page.getByText('Şimdi kaydedildi ✓').count()));
  const stale = await read(page);
  check('Yazma başarısızsa cihazdaki eski kayıt değişmez', stale.blob.career.settings.highContrast === previousContrast);
  const downloadPromise = page.waitForEvent('download', { timeout: 15_000 });
  await page.getByRole('button', { name: 'Dışa Aktar' }).click();
  const download = await downloadPromise;
  const rescued = JSON.parse(readFileSync(await download.path(), 'utf8'));
  check('Depolama hatasında indirilen yedek eski değil, güncel bellek durumudur', rescued.blob.career.settings.highContrast !== stale.blob.career.settings.highContrast && rescued.blob.career.manager.name === 'Aktif Menajer');
  check('Yedek indirilse de cihaz kaydının başarısız olduğu açıkça söylenir', await page.getByText(/cihaz kaydı başarısız/i).isVisible());
  await page.evaluate(() => { IDBDatabase.prototype.transaction = window.__originalTransaction; });
  await page.getByRole('button', { name: 'Şimdi Kaydet' }).click();
  await page.getByText('Şimdi kaydedildi ✓').waitFor();
  const fresh = await waitForSave(page, (record) => record?.blob?.career?.settings?.highContrast !== previousContrast);
  check('Depolama düzelince yeniden deneme güncel durumu kaydeder', fresh.blob.career.settings.highContrast !== previousContrast);

  const oldTab = await context.newPage(); instrument(oldTab);
  await oldTab.goto(base, { waitUntil: 'networkidle' });
  await oldTab.getByRole('button', { name: /Devam Et —/ }).click();
  await notice(oldTab);
  check('İkinci sekme aynı kariyeri açtı', await oldTab.getByRole('button', { name: /Sonraki Gün|Maç Merkezine Git/ }).first().isVisible());

  const broken = structuredClone(fresh.blob); delete broken.fixtures;
  await page.locator('input[type=file]').setInputFiles(file(envelope(broken), 'bozuk.json'));
  await page.getByText(/Yedek dosyası eksik veya bozuk/).waitFor();
  check('Eksik yedek yazılmadan reddedilir', (await read(page)).meta.updatedAt === fresh.meta.updatedAt && (await read(page)).blob.career.manager.name === 'Aktif Menajer');
  const imported = structuredClone(fresh.blob);
  imported.career.manager.name = 'Yedek Menajer'; imported.career.day = 7; imported.day = 7;
  await page.locator('input[type=file]').setInputFiles(file(envelope(imported)));
  await page.getByRole('dialog', { name: 'Yedeği yükle?' }).getByRole('button', { name: 'Vazgeç' }).click();
  check('Yedeği iptal etmek mevcut kaydı değiştirmez', (await read(page)).blob.career.manager.name === 'Aktif Menajer');
  await page.locator('input[type=file]').setInputFiles(file(envelope(imported)));
  const importDialog = page.getByRole('dialog', { name: 'Yedeği yükle?' });
  await importDialog.waitFor();
  check('Aktif yuvayı değiştirmeden önce açık onay istenir', await importDialog.isVisible() && (await read(page)).blob.career.manager.name === 'Aktif Menajer');
  await importDialog.getByRole('button', { name: 'Evet, Yedeği Yükle' }).click();
  await page.getByRole('dialog', { name: 'Yedek hazır' }).waitFor();
  const afterImport = await waitForSave(page, (record) => record?.blob?.career?.manager?.name === 'Yedek Menajer');
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await oldTab.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await oldTab.getByText(/Bu yuva başka bir sekmede değişti/).waitFor({ timeout: 8000 });
  const afterPageHide = await read(page);
  check('İçe aktarım sonrası eski sayfanın pagehide kaydı yedeği ezmez', afterPageHide.blob.career.manager.name === 'Yedek Menajer' && afterPageHide.meta.updatedAt === afterImport.meta.updatedAt);
  check('Diğer eski sekmenin kaydı çakışmayı algılar ve yedeği ezmez', await oldTab.getByText(/Bu yuva başka bir sekmede değişti/).isVisible() && afterPageHide.blob.career.day === 7);
  await page.getByRole('dialog', { name: 'Yedek hazır' }).getByRole('button', { name: 'Yedeği Aç' }).click();
  await page.getByRole('button', { name: /Devam Et —/ }).waitFor();
  await page.getByRole('button', { name: /Devam Et —/ }).click();
  await page.getByRole('button', { name: 'Şimdi Kaydet' }).waitFor();
  await notice(page);
  const reopened = await read(page);
  check('Yüklenen kariyer yeniden açılabilir', reopened.blob.career.manager.name === 'Yedek Menajer' && await page.getByRole('button', { name: 'Şimdi Kaydet' }).isVisible(), `manager=${reopened.blob.career.manager.name}`);

  const slots = await context.newPage(); instrument(slots);
  await slots.goto(base, { waitUntil: 'networkidle' });
  await slots.getByRole('button', { name: 'Kayıt Yuvaları' }).click();
  await slots.getByText('Yeni Kariyer — Yuva 2').waitFor();
  const chooseStale = slots.waitForEvent('filechooser');
  await slots.getByRole('button', { name: 'Buraya dosya içe aktar' }).first().click();
  const staleChooser = await chooseStale;
  await slots.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('manager26', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('saves', 'readwrite'); const store = tx.objectStore('saves'); const get = store.get(1);
      get.onsuccess = () => { const value = get.result; value.slot = 2; value.meta.slot = 2; value.blob.career.slot = 2; value.blob.career.manager.name = 'Başka Sekme'; store.put(value); };
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    }); db.close();
  });
  await staleChooser.setFiles(file(envelope(imported)));
  await slots.getByText(/Bu yuva başka bir sekmede değişti/).waitFor();
  check('Boş görünen yuva başka sekmede dolmuşsa dosya üzerine yazmaz', (await read(slots, 2)).blob.career.manager.name === 'Başka Sekme');

  const legacy = structuredClone(imported);
  legacy.version = 1; legacy.career.manager.name = 'Eski Yedek';
  delete legacy.career.clubFacilities; delete legacy.career.boardConfidence; delete legacy.career.trophyCabinet;
  delete legacy.seasonNo; delete legacy.seasonHistory; delete legacy.matchReports; delete legacy.international;
  const chooseLegacy = slots.waitForEvent('filechooser');
  await slots.getByRole('button', { name: 'Buraya dosya içe aktar' }).last().click();
  await (await chooseLegacy).setFiles(file(envelope(legacy, 'manager26-save', 1), 'eski.json'));
  const legacyRecord = await waitForSave(slots, (record) => record?.blob?.career?.manager?.name === 'Eski Yedek', 3);
  check('Eski manager26-save v1 boş yuvaya v5 göçüyle yüklenir', legacyRecord.blob.version === 5 && legacyRecord.blob.career.boardConfidence === 70 && !!legacyRecord.blob.career.clubFacilities);
  const legacyCard = slots.locator('.bg-surface').filter({ hasText: 'Eski Yedek' }).first();
  await legacyCard.getByRole('button', { name: 'Devam Et' }).click();
  await notice(slots);
  check('Sezon alanları eksik eski kariyer de gerçek tarayıcıda açılır', await slots.getByRole('button', { name: /Sonraki Gün|Maç Merkezine Git/ }).first().isVisible());

  // A synthetic career exported by the actual initial public app (commit 3fb2aa7314, SAVE_VERSION 2).
  historicalBrowser = await chromium.launch(launchOptions);
  historicalContext = await historicalBrowser.newContext({ viewport, locale: 'tr' });
  const historicalPage = await historicalContext.newPage(); instrument(historicalPage);
  await historicalPage.goto(base, { waitUntil: 'networkidle' });
  await historicalPage.getByRole('button', { name: 'Başla' }).click();
  const historicalChoice = historicalPage.waitForEvent('filechooser');
  await historicalPage.getByRole('button', { name: 'Buraya dosya içe aktar' }).first().click();
  await (await historicalChoice).setFiles({ name: 'gercek-eski-v2.json', mimeType: 'application/json', buffer: readFileSync('tools/fixtures/save-v2-original.json') });
  const old = await waitForSave(historicalPage, (record) => record?.blob?.career?.manager?.name === 'Eski Sürüm Testi');
  check('Önceki yayımlanmış uygulamadan gerçek v2 yedeği içe aktarılır', old.blob.version === 5 && old.blob.fixtures.length === 396);
  const historicalCard = historicalPage.locator('.bg-surface').filter({ hasText: 'Eski Sürüm Testi' }).first();
  await historicalCard.getByRole('button', { name: 'Devam Et' }).click();
  await notice(historicalPage);
  await historicalPage.getByRole('button', { name: /Sonraki Gün/ }).first().click();
  const advanced = await waitForSave(historicalPage, (record) => record?.blob?.career?.day === old.blob.career.day + 1);
  check('Gerçek v2 kariyeri açılır, gün ilerler ve tekrar kaydedilir', advanced.blob.career.manager.name === 'Eski Sürüm Testi' && advanced.blob.version === 5);
  check('Tarayıcıda yakalanmamış uygulama hatası yok', pageErrors.length === 0, pageErrors.join(' | '));
} catch (error) { failed++; console.error(error?.stack || error); }
finally { if (historicalContext) await historicalContext.close(); if (historicalBrowser) await historicalBrowser.close(); await context.close(); await browser.close(); }
console.log(`\n${passed}/${passed + failed} gerçek tarayıcı kayıt kontrolü geçti.`);
process.exit(failed ? 1 : 0);
