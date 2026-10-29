// Real-browser regression: advanced world settings, wizard navigation and saved career.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.env.HM26_BASE_URL ?? 'http://127.0.0.1:4173';
const executablePath = process.env.HM26_CHROMIUM;
const launchOptions = executablePath ? {
  executablePath, headless: true,
  args: ['--no-sandbox', '--single-process', '--no-zygote', '--disable-gpu', '--disable-dev-shm-usage'],
} : {};
let browser = await chromium.launch(launchOptions);
let passed = 0, failed = 0;
const errors = [];
const check = (name, condition, detail = '') => {
  condition ? passed++ : failed++;
  console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`);
};
const screenshots = process.env.HM26_SCREENSHOTS;

async function enterWorldStep(page, name) {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Başla|Kayıt Yuvaları/ }).first().click();
  await page.getByText('Yeni Kariyer — Yuva 1').first().click();
  await page.locator('input').first().fill(name);
  await page.getByText('Eski Futbolcu').first().click();
  await page.getByRole('button', { name: 'Devam', exact: true }).click();
}
async function setOption(page, label, choice) {
  const button = page.getByRole('group', { name: label }).getByRole('button', { name: choice, exact: true });
  await button.click();
  return button;
}
async function isSelected(page, label, choice) {
  return await page.getByRole('group', { name: label }).getByRole('button', { name: choice, exact: true }).getAttribute('aria-pressed') === 'true';
}
async function readSave(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('manager26', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const saved = await new Promise((resolve, reject) => {
      const request = db.transaction('saves').objectStore('saves').get(1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return saved?.blob ? { version: saved.blob.version, manager: saved.blob.career.manager, settings: saved.blob.career.settings } : null;
  });
}
async function finishCareer(page) {
  await page.getByRole('button', { name: 'Devam', exact: true }).click();
  await page.getByText('Denizli Yeşilova').first().click();
  await page.getByRole('button', { name: /Kulüp Brifingine Git/ }).click();
  await page.getByRole('button', { name: /Kariyeri Başlat/ }).click();
  await page.getByRole('button', { name: 'Anladım' }).first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForFunction(async () => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('manager26', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const result = await new Promise((resolve, reject) => { const r = db.transaction('saves').objectStore('saves').get(1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    db.close();
    return !!result?.blob?.career;
  }, null, { timeout: 12000 });
}

try {
  const context = await browser.newContext({ viewport: { width: 320, height: 568 }, locale: 'tr' });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await enterWorldStep(page, 'Dünya Ayar Testi');
  await page.getByRole('button', { name: /Açık Rekabet Dönemi/ }).click();
  const toggle = page.getByRole('button', { name: /Gelişmiş dünya ayarlarını/ });
  check('Gelişmiş ayarlar ilk açılışta kapalı ve düğme panele bağlıdır', await toggle.getAttribute('aria-expanded') === 'false' && await toggle.getAttribute('aria-controls') === 'world-advanced-settings' && await page.locator('#world-advanced-settings').isHidden() && await page.getByRole('region', { name: 'Gelişmiş dünya ayarları' }).count() === 0);
  await toggle.focus();
  await toggle.press('Enter');
  const panel = page.getByRole('region', { name: 'Gelişmiş dünya ayarları' });
  check('Düğme klavyeyle açılır ve dört gerçek ayarı gösterir', await toggle.getAttribute('aria-expanded') === 'true' && await panel.isVisible() && await panel.getByRole('group').count() === 4);
  const geometry = await panel.evaluate((element) => {
    const root = element.closest('.overflow-y-auto');
    const scroll = root?.getBoundingClientRect();
    const toggle = document.querySelector('button[aria-controls="world-advanced-settings"]')?.getBoundingClientRect();
    const intro = element.querySelector('p')?.getBoundingClientRect();
    const firstGroup = element.querySelector('[role="group"]')?.getBoundingClientRect();
    const buttons = Array.from(element.querySelectorAll('button')).map((button) => { const r = button.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, height: r.height }; });
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, scrollTop: scroll?.top, scrollBottom: scroll?.bottom, toggleTop: toggle?.top, introBottom: intro?.bottom, firstGroupBottom: firstGroup?.bottom, buttons };
  });
  check('320 px ekranda açma düğmesi ve ilk seçenek görünür, seçenekler taşmaz ve dokunma alanları yeterli', geometry.scrollWidth <= geometry.width && geometry.toggleTop >= geometry.scrollTop - 1 && geometry.introBottom <= geometry.scrollBottom + 1 && geometry.firstGroupBottom <= geometry.scrollBottom + 1 && geometry.buttons.every((b) => b.left >= 0 && b.right <= geometry.width && b.width >= 44 && b.height >= 44), JSON.stringify(geometry));
  if (screenshots) { mkdirSync(screenshots, { recursive: true }); await page.screenshot({ path: `${screenshots}/career-world-320.png` }); }
  check('Dört ayarın başlangıç değerleri dengelidir', await isSelected(page, 'Gol ritmi', 'Dengeli') && await isSelected(page, 'Şaşırtıcılık / rastgelelik', 'Dengeli') && await isSelected(page, 'Sakatlık sıklığı', 'Normal') && await isSelected(page, 'Piyasa yenilenme ritmi', 'Dengeli'));
  await setOption(page, 'Gol ritmi', 'Yüksek');
  const random = await setOption(page, 'Şaşırtıcılık / rastgelelik', 'Kaotik');
  await random.focus();
  await random.press('Enter');
  check('Seçim sonrası klavye odağı ve seçili durum korunur', await random.evaluate((element) => document.activeElement === element) && await isSelected(page, 'Şaşırtıcılık / rastgelelik', 'Kaotik'));
  await setOption(page, 'Sakatlık sıklığı', 'Düşük');
  await setOption(page, 'Piyasa yenilenme ritmi', 'Yoğun');
  await toggle.focus();
  await toggle.press('Space');
  check('Panel klavyeyle kapatılabilir ve gizlenir', await toggle.getAttribute('aria-expanded') === 'false' && await panel.count() === 0 && await page.locator('#world-advanced-settings').isHidden());
  await toggle.click();
  check('Panel yeniden açıldığında dört seçim korunur', await isSelected(page, 'Gol ritmi', 'Yüksek') && await isSelected(page, 'Şaşırtıcılık / rastgelelik', 'Kaotik') && await isSelected(page, 'Sakatlık sıklığı', 'Düşük') && await isSelected(page, 'Piyasa yenilenme ritmi', 'Yoğun'));
  await page.getByRole('button', { name: /Yerleşik Düzen/ }).click();
  await page.getByRole('button', { name: /Açık Rekabet Dönemi/ }).click();
  check('Dünya dönemi değiştirilirken ayarlar korunur', await isSelected(page, 'Gol ritmi', 'Yüksek') && await isSelected(page, 'Şaşırtıcılık / rastgelelik', 'Kaotik') && await isSelected(page, 'Sakatlık sıklığı', 'Düşük') && await isSelected(page, 'Piyasa yenilenme ritmi', 'Yoğun'));

  await page.getByRole('button', { name: 'Devam', exact: true }).click();
  await page.getByRole('button', { name: /Özel Kariyer/ }).click();
  await page.getByRole('button', { name: /Kariyer Dünyası/ }).click();
  check('Özel kariyer ekranı aynı dünya seçimlerini gösterir', await isSelected(page, 'Şaşırtıcılık / rastgelelik', 'Kaotik') && await isSelected(page, 'Sakatlık sıklığı', 'Düşük'));
  await setOption(page, 'Şaşırtıcılık / rastgelelik', 'Tahmin edilebilir');
  await page.getByRole('button', { name: /Maç Gerçekçiliği/ }).click();
  check('Maç gerçekçiliği bölümündeki gol ritmi aynı değerdir', await isSelected(page, 'Gol ritmi', 'Yüksek'));
  await page.getByRole('button', { name: /Piyasa & Yönetim/ }).click();
  check('Piyasa bölümündeki yenilenme aynı değerdir', await isSelected(page, 'Piyasa yenilenme ritmi', 'Yoğun'));
  await page.getByRole('button', { name: '←', exact: true }).click();
  await page.getByRole('button', { name: /Gelişmiş dünya ayarlarını aç/ }).click();
  check('Zorluk adımındaki değişiklik dünya adımına geri yansır', await isSelected(page, 'Şaşırtıcılık / rastgelelik', 'Tahmin edilebilir') && await isSelected(page, 'Piyasa yenilenme ritmi', 'Yoğun'));
  await setOption(page, 'Sakatlık sıklığı', 'Yüksek');
  await page.getByRole('button', { name: 'Devam', exact: true }).click();
  await page.getByRole('button', { name: /Zorlu Kariyer/ }).click();
  await finishCareer(page);
  const saved = await readSave(page);
  check('Seçilen dönem, bağımsız zorluk ve dört ayar kariyere kaydedilir', saved?.version === 4 && saved.manager.era === 'acik' && saved.manager.difficulty === 'zorlu' && saved.manager.challengePoints === 70 && saved.settings.goalPace === 'yuksek' && saved.settings.randomness === 'low' && saved.settings.injuryRate === 'yuksek' && saved.settings.marketRefresh === 'yogun', JSON.stringify(saved));
  await page.locator('nav[aria-label="Ana gezinme"] button', { hasText: 'Piyasa' }).click();
  check('Yoğun piyasa seçimi oyunda 7 günlük döngüyü uygular', /yenilenme:\s*6g/i.test(await page.locator('body').innerText()));
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Devam Et/ }).first().click();
  await page.getByRole('button', { name: 'Anladım' }).first().click({ timeout: 1500 }).catch(() => {});
  await page.locator('nav[aria-label="Ana gezinme"] button', { hasText: 'Piyasa' }).click();
  const reloaded = await readSave(page);
  check('Kayıt yeniden açıldığında tercihler ve piyasa ritmi korunur', reloaded?.settings.randomness === 'low' && reloaded?.settings.injuryRate === 'yuksek' && reloaded?.settings.marketRefresh === 'yogun' && /yenilenme:\s*6g/i.test(await page.locator('body').innerText()));
  check('Tarayıcıda yakalanmamış uygulama hatası yok', errors.length === 0, errors.join(' | '));

  // A fresh browser also isolates IndexedDB on headless single-process installations.
  await browser.close();
  browser = await chromium.launch(launchOptions);
  const defaultsContext = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'tr' });
  const defaultsPage = await defaultsContext.newPage();
  defaultsPage.on('pageerror', (error) => errors.push(error.message));
  await enterWorldStep(defaultsPage, 'Varsayılan Dünya');
  await defaultsPage.getByRole('button', { name: /Gelişmiş dünya ayarlarını aç/ }).click();
  const defaultLayout = await defaultsPage.getByRole('region', { name: 'Gelişmiş dünya ayarları' }).evaluate((element) => {
    const root = element.closest('.overflow-y-auto')?.getBoundingClientRect();
    const firstGroup = element.querySelector('[role="group"]')?.getBoundingClientRect();
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, rootBottom: root?.bottom, firstGroupBottom: firstGroup?.bottom };
  });
  check('390 px ekranda panel açıldığında ilk seçenek görünür ve yatay taşma yoktur', defaultLayout.scrollWidth <= defaultLayout.width && defaultLayout.firstGroupBottom <= defaultLayout.rootBottom + 1, JSON.stringify(defaultLayout));
  if (screenshots) await defaultsPage.screenshot({ path: `${screenshots}/career-world-390.png` });
  await defaultsPage.getByRole('button', { name: 'Devam', exact: true }).click();
  await finishCareer(defaultsPage);
  const defaults = await readSave(defaultsPage);
  check('Ayarlar değiştirilmeden başlayan kariyerin mevcut varsayılanları değişmez', defaults?.manager.era === 'gecis' && defaults.manager.difficulty === 'dengeli' && defaults.settings.goalPace === 'dengeli' && defaults.settings.randomness === 'normal' && defaults.settings.injuryRate === 'normal' && defaults.settings.marketRefresh === 'dengeli', JSON.stringify(defaults?.settings));
  check('Varsayılan kariyerde de yakalanmamış uygulama hatası yok', errors.length === 0, errors.join(' | '));
} catch (error) {
  failed++;
  console.error('❌ Yeni kariyer tarayıcı testi:', error);
} finally {
  await browser.close();
}
console.log(`\nCAREER-WORLD-BROWSER: ${passed} geçti, ${failed} başarısız`);
if (failed) process.exitCode = 1;
