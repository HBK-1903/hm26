// Browser/IndexedDB faults: never claim an unreadable slot is empty or delete a newer save.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const base = process.env.HM26_BASE_URL ?? 'http://127.0.0.1:4173';
const launch = () => chromium.launch({ ...(process.env.HM26_CHROMIUM ? { executablePath: process.env.HM26_CHROMIUM } : {}), headless: true, args: ['--no-sandbox'] });
const legacy = readFileSync('tools/fixtures/save-v2-original.json');
let browser, passed = 0, failed = 0;
const check = (name, ok, detail = '') => { ok ? passed++ : failed++; console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
// Bypass only the fault injector, not IndexedDB; all application operations use it.
const raw = (page, action, payload) => page.evaluate(async ({ action, payload }) => {
  const db = await new Promise((resolve, reject) => { const r = indexedDB.open('manager26', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  const tx = window.__originalSaveTransaction.call(db, ['saves', 'meta'], action === 'read' ? 'readonly' : 'readwrite');
  const saves = tx.objectStore('saves');
  if (action === 'read') {
    const request = saves.get(1);
    const record = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result ?? null); request.onerror = () => reject(request.error); });
    db.close(); return record;
  }
  if (action === 'update') {
    const get = saves.get(1);
    get.onsuccess = () => {
      const record = get.result;
      if (payload.version !== undefined) record.blob.version = payload.version;
      if (payload.manager !== undefined) { record.blob.career.manager.name = payload.manager; record.meta.managerName = payload.manager; }
      if (payload.revision !== undefined) record.meta.updatedAt = payload.revision;
      if (payload.dropRevision) delete record.meta.updatedAt;
      saves.put(record);
    };
  }
  if (action === 'corrupt') saves.put({ slot: 2, meta: null, blob: {} });
  if (action === 'mismatched') { const get = saves.get(1); get.onsuccess = () => saves.put({ slot: 2, meta: get.result.meta, blob: get.result.blob }); }
  if (action === 'repair') saves.delete(2);
  await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
  db.close(); return null;
}, { action, payload });
try {
  for (const width of [320, 390]) {
    browser = await launch();
    const page = await browser.newPage({ viewport: { width, height: 820 }, locale: 'tr', acceptDownloads: true });
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Başla' }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Buraya dosya içe aktar' }).first().click();
    await (await chooser).setFiles({ name: 'eski-v2.json', mimeType: 'application/json', buffer: legacy });
    await page.getByText('Eski Sürüm Testi', { exact: false }).first().waitFor();
    await page.evaluate(() => {
      window.__originalSaveTransaction = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function (...args) {
        const stores = Array.isArray(args[0]) ? args[0] : [args[0]];
        if (window.__failSaveRead && stores.includes('saves') && args[1] === 'readonly') throw new DOMException('Depolama okuma testi', 'SecurityError');
        if (window.__failSaveWrite && stores.includes('saves') && args[1] === 'readwrite') throw new DOMException('Depolama yazma testi', 'QuotaExceededError');
        return window.__originalSaveTransaction.apply(this, args);
      };
    });
    const original = await raw(page, 'read');
    check(`${width}px: gerçek eski yedek güvenli boş yuvaya aktarılır`, original.blob.career.manager.name === 'Eski Sürüm Testi' && original.blob.version === 5);

    await page.getByRole('button', { name: '←' }).first().click();
    const quick = page.getByRole('button', { name: /Devam Et —/ });
    await quick.waitFor();
    await page.evaluate(() => { window.__failSaveRead = true; });
    await quick.click();
    await page.getByRole('alert').filter({ hasText: 'Kariyer açılamadı' }).waitFor();
    check(`${width}px: hızlı devam okuma hatasını açıkça gösterir ve kaydı değiştirmez`, await quick.isVisible() && (await raw(page, 'read')).meta.updatedAt === original.meta.updatedAt);

    await page.getByRole('button', { name: 'Kayıt Yuvaları' }).click();
    const listingError = page.getByRole('alert').filter({ hasText: 'Kayıtlar okunamadı.' });
    await listingError.waitFor();
    check(`${width}px: liste okunamazken yuvalar boş diye gösterilmez`, !(await page.getByText(/Yeni Kariyer — Yuva/).count()) && !(await page.getByRole('button', { name: 'Buraya dosya içe aktar' }).count()));
    check(`${width}px: okuma hatası mevcut kariyeri değiştirmez`, (await raw(page, 'read')).blob.career.manager.name === 'Eski Sürüm Testi');
    await page.evaluate(() => { window.__failSaveRead = false; });
    await listingError.getByRole('button', { name: 'Tekrar Dene' }).click();
    await page.getByText('Eski Sürüm Testi', { exact: false }).first().waitFor();
    check(`${width}px: depolama düzelince yeniden deneme dolu yuvayı geri gösterir`, await page.getByRole('button', { name: 'Yuva 1 yönet menüsü' }).isVisible() && await page.getByText('Yeni Kariyer — Yuva 2').isVisible());

    await raw(page, 'update', { version: 6 });
    await page.getByRole('button', { name: 'Devam Et', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Bu kayıt daha yeni bir sürümdeyken oluşturulmuş' }).waitFor();
    check(`${width}px: yeni sürüm hatası kayıp yuva mesajıyla ezilmez`, !(await page.getByText('Bu yuvada kayıt bulunamadı.').count()) && (await raw(page, 'read')).blob.version === 6);
    await raw(page, 'update', { version: 5 });

    await page.getByRole('button', { name: 'Yuva 1 yönet menüsü' }).click();
    await page.evaluate(() => { window.__failSaveRead = true; });
    await page.getByRole('button', { name: /Dışa Aktar —/ }).click();
    await page.getByRole('status').filter({ hasText: 'Dışa aktarılamadı' }).waitFor();
    check(`${width}px: yedek okuma hatası sessizce kaybolmaz`, (await raw(page, 'read')).meta.updatedAt === original.meta.updatedAt);
    await page.evaluate(() => { window.__failSaveRead = false; });
    await page.getByRole('button', { name: 'Yuva 1 yönet menüsü' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Dışa Aktar —/ }).click();
    const download = await downloadPromise;
    const exported = JSON.parse(readFileSync(await download.path(), 'utf8'));
    check(`${width}px: hata düzeldikten sonra gerçek kariyer yedeği indirilebilir`, exported.blob.career.manager.name === 'Eski Sürüm Testi');

    await page.getByRole('button', { name: 'Yuva 1 kariyerini sil' }).click();
    const confirm = page.getByRole('dialog', { name: 'Silme Onayı (2/2)' });
    await page.evaluate(() => { window.__failSaveWrite = true; });
    await confirm.getByRole('button', { name: 'Evet, Kalıcı Olarak Sil' }).click();
    await page.getByRole('status').filter({ hasText: 'Kariyer silinemedi' }).waitFor();
    check(`${width}px: silme hatasında onay açık kalır ve kayıt korunur`, await confirm.isVisible() && (await raw(page, 'read')).blob.career.manager.name === 'Eski Sürüm Testi');
    await page.evaluate(() => { window.__failSaveWrite = false; });
    await raw(page, 'update', { manager: 'Diğer Sekmenin Kariyeri', revision: original.meta.updatedAt + 100 });
    await confirm.getByRole('button', { name: 'Evet, Kalıcı Olarak Sil' }).click();
    await page.getByRole('status').filter({ hasText: 'Bu yuva başka bir sekmede değişti' }).waitFor();
    check(`${width}px: başka sekmede yenilenen kariyer eski silme onayıyla silinmez`, (await raw(page, 'read')).blob.career.manager.name === 'Diğer Sekmenin Kariyeri');
    check(`${width}px: çakışma sonrası güncel yuva tekrar gösterilir`, await page.getByText('Diğer Sekmenin Kariyeri', { exact: false }).isVisible() && !(await confirm.count()));

    // Older records without a revision must not allow a newer record to be deleted.
    await raw(page, 'update', { dropRevision: true });
    await page.getByRole('button', { name: '←' }).first().click();
    await page.getByRole('button', { name: 'Kayıt Yuvaları' }).click();
    await page.getByText('Diğer Sekmenin Kariyeri', { exact: false }).waitFor();
    await page.getByRole('button', { name: 'Yuva 1 kariyerini sil' }).click();
    await raw(page, 'update', { manager: 'Eski Kayıt Güncellendi', revision: original.meta.updatedAt + 200 });
    await confirm.getByRole('button', { name: 'Evet, Kalıcı Olarak Sil' }).click();
    await page.getByText('Eski Kayıt Güncellendi', { exact: false }).waitFor();
    check(`${width}px: revizyonsuz eski kaydın onayı yeni kaydı silemez`, (await raw(page, 'read')).blob.career.manager.name === 'Eski Kayıt Güncellendi' && !(await confirm.count()));

    // A malformed list entry is unknown, never a silently "empty" slot.
    await raw(page, 'corrupt');
    await page.getByRole('button', { name: '←' }).first().click();
    await page.getByRole('button', { name: 'Kayıt Yuvaları' }).click();
    await listingError.waitFor();
    check(`${width}px: bozuk liste satırı tüm yuvaları bilinmiyor olarak gösterir`, !(await page.getByText(/Yeni Kariyer — Yuva/).count()) && (await raw(page, 'read')).blob.career.manager.name === 'Eski Kayıt Güncellendi');
    await raw(page, 'repair');
    await listingError.getByRole('button', { name: 'Tekrar Dene' }).click();
    await page.getByText('Eski Kayıt Güncellendi', { exact: false }).waitFor();
    await raw(page, 'mismatched');
    await page.getByRole('button', { name: '←' }).first().click();
    await page.getByRole('button', { name: 'Kayıt Yuvaları' }).click();
    await listingError.waitFor();
    check(`${width}px: yanlış yuva numaralı metaveri boş kariyer gibi gösterilmez`, !(await page.getByText(/Yeni Kariyer — Yuva/).count()) && !!(await raw(page, 'read')));
    await raw(page, 'repair');
    await listingError.getByRole('button', { name: 'Tekrar Dene' }).click();
    await page.getByText('Eski Kayıt Güncellendi', { exact: false }).waitFor();
    await page.getByRole('button', { name: 'Yuva 1 kariyerini sil' }).click();
    await confirm.getByRole('button', { name: 'Evet, Kalıcı Olarak Sil' }).click();
    await page.getByText('Yeni Kariyer — Yuva 1').waitFor();
    check(`${width}px: güncel kayıt yeniden onaylanırsa gerçekten silinir`, (await raw(page, 'read')) === null);
    await page.getByRole('button', { name: '←' }).first().click();
    await page.getByRole('button', { name: 'Başla' }).waitFor();
    check(`${width}px: geri dönünce silinen kariyerin hızlı devam düğmesi kalmaz`, !(await page.getByRole('button', { name: /Devam Et —/ }).count()));
    check(`${width}px: işlemlerde yakalanmamış tarayıcı hatası yok`, errors.length === 0, errors.join(' | '));
    await browser.close(); browser = undefined;
  }
} catch (error) { failed++; console.error(error?.stack ?? error); }
finally { await browser?.close(); }
console.log(`\nSLOT-FAILURES: ${passed}/${passed + failed}`);
process.exit(failed ? 1 : 0);
