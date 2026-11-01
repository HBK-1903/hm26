// Real live-match UI: stacked sheets must behave as one modal at a time.
import { chromium } from 'playwright';
import { createServer as createNetServer } from 'node:net';
import { createServer as createViteServer } from 'vite';
const probe = createNetServer();
await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const server = await createViteServer({ server: { host: '127.0.0.1', port, strictPort: true }, logLevel: 'silent' });
await server.listen();
const base = `http://127.0.0.1:${port}`;
const launch = () => chromium.launch({ ...(process.env.HM26_CHROMIUM ? { executablePath: process.env.HM26_CHROMIUM } : {}), headless: true, args: ['--no-sandbox'] });
let browser;
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => { ok ? passed++ : failed++; console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
try {
  for (const width of [320, 390]) {
    browser = await launch();
    const page = await browser.newPage({ viewport: { width, height: 820 }, reducedMotion: 'reduce', locale: 'tr' });
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${base}/tools/live-resume-fixture.html`);
    await page.waitForFunction(() => !!window.__liveStore);
    if (await page.getByRole('button', { name: 'Anladım' }).count()) await page.getByRole('button', { name: 'Anladım' }).first().click();
    await page.getByRole('button', { name: /Maça Başla/ }).first().click();
    await page.getByRole('timer').waitFor();
    await page.getByRole('button', { name: 'Maçı duraklat' }).click();
    await page.getByRole('button', { name: 'Kenar Talimatı' }).click();
    const outer = page.getByRole('dialog', { name: 'Kenar Talimatı' });
    const opener = outer.getByRole('button', { name: /Değişiklik ·/ });
    await opener.click();
    const inner = page.getByRole('dialog', { name: 'Oyuncu Değişikliği' });
    await inner.waitFor();
    await page.waitForTimeout(150);
    check(`${width}px: iç içe iki gerçek maç paneli açılır ve odak üsttedir`, await outer.isVisible() && await inner.isVisible() && await inner.evaluate((el) => el.contains(document.activeElement)));
    check(`${width}px: üst panel açıkken arka plan kilitlidir`, await page.evaluate(() => document.body.style.overflow === 'hidden'));
    const controls = inner.locator('button:visible:enabled, a[href]:visible, input:visible:enabled, select:visible:enabled, textarea:visible:enabled, [tabindex]:visible:not([tabindex="-1"])');
    await controls.last().focus(); await page.keyboard.press('Tab');
    const forwardWrapped = await controls.first().evaluate((el) => document.activeElement === el);
    await controls.first().focus(); await page.keyboard.press('Shift+Tab');
    const backwardWrapped = await controls.last().evaluate((el) => document.activeElement === el);
    check(`${width}px: Tab ve Shift+Tab yalnız üst panel içinde döner`, forwardWrapped && backwardWrapped);

    // A single Escape must never dismiss both panels at once.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
    check(`${width}px: Escape yalnız üst paneli kapatır`, !(await inner.count()) && await outer.isVisible());
    check(`${width}px: kullanıcının duraklatma tercihi panel kapanınca korunur`, await page.getByRole('button', { name: 'Maça devam et' }).isVisible());
    check(`${width}px: üst panel kapanınca odak açan düğmeye döner ve kilit sürer`, await opener.evaluate((el) => document.activeElement === el).catch(() => false) && await page.evaluate(() => document.body.style.overflow === 'hidden'));
    if (await outer.count()) {
      await page.keyboard.press('Escape'); await page.waitForTimeout(80);
      check(`${width}px: ikinci Escape dış paneli kapatır ve kilidi kaldırır`, !(await outer.count()) && await page.evaluate(() => document.body.style.overflow !== 'hidden'));
    } else check(`${width}px: ikinci Escape dış paneli kapatır ve kilidi kaldırır`, false, 'dış panel ilk Escape ile kapandı');
    // The inline player change also respects an explicit pause.
    await page.getByRole('tab', { name: 'Oyuncu Değişikliği' }).click();
    await page.getByRole('button', { name: /Akıllı öneri/ }).click();
    await page.getByRole('button', { name: 'Onayla', exact: true }).click();
    check(`${width}px: sahadaki oyuncu değişikliği elle duraklatılmış maçı başlatmaz`, await page.getByRole('button', { name: 'Maça devam et' }).isVisible() && await page.getByRole('tabpanel', { name: 'Canlı Saha' }).isVisible());

    // A picker opened during a running match does resume it after closing.
    await page.getByRole('button', { name: 'Maça devam et' }).click();
    await page.getByRole('button', { name: 'Kenar Talimatı' }).click();
    await outer.getByRole('button', { name: 'Plan değiştir', exact: true }).click();
    const plan = page.getByRole('dialog', { name: 'Plan Geçişi' });
    await plan.waitFor(); await page.keyboard.press('Escape');
    check(`${width}px: oyun akarken açılan plan kapanınca maç devam eder`, !(await plan.count()) && await outer.isVisible() && await page.getByRole('button', { name: 'Maçı duraklat' }).isVisible());
    await page.keyboard.press('Escape');
    check(`${width}px: yakalanmamış tarayıcı hatası yok`, errors.length === 0, errors.join(' | '));
    await browser.close(); browser = undefined;

    // Real squad quick-profile -> full-profile replacement, clinic and focus.
    browser = await launch();
    const squadPage = await browser.newPage({ viewport: { width, height: 820 }, reducedMotion: 'reduce', locale: 'tr' });
    const squadErrors = []; squadPage.on('pageerror', (error) => squadErrors.push(error.message));
    await squadPage.goto(`${base}/tools/roster-league-fixture.html?scenario=clinic-short`);
    await squadPage.waitForFunction(() => !!window.__clinicPlayerId && !!window.__rosterSnapshot);
    await squadPage.getByRole('button', { name: 'Test: Kadro' }).click();
    const playerId = await squadPage.evaluate(() => window.__clinicPlayerId);
    const row = squadPage.locator(`[data-squad-player-id="${playerId}"]`);
    await row.click();
    await squadPage.getByRole('button', { name: 'Tam Profili Aç' }).click();
    const profile = squadPage.getByRole('dialog', { name: /tam profili/ });
    await profile.waitFor(); await squadPage.waitForTimeout(100);
    check(`${width}px: hızlı profilden tam profile geçince odak yeni profildedir`, await profile.evaluate((el) => el.contains(document.activeElement)));
    await profile.getByRole('button', { name: /Avrupa Kliniğine Sevk Et/ }).click();
    check(`${width}px: kısa klinik tedavisi profilde iyileşti olarak görünür`, await profile.getByText('Sakatlık yok', { exact: true }).isVisible() && !(await profile.getByRole('button', { name: /Avrupa Kliniğine Sevk Et/ }).count()));
    const state = JSON.parse(await squadPage.evaluate(() => window.__rosterSnapshot()));
    check(`${width}px: klinik iyileşmesi ve iğne onayı gerçek kariyer durumunda eşleşir`, state.playerPatch[playerId].injuredDays === 0 && !state.riskPlayIds.includes(playerId));
    await squadPage.keyboard.press('Escape'); await squadPage.waitForTimeout(100);
    check(`${width}px: tam profilden Escape ile çıkış odağı oyuncuya geri verir`, !(await profile.count()) && await row.evaluate((el) => document.activeElement === el));
    check(`${width}px: tam profil kapanınca sayfa kilidi kaldırılır`, await squadPage.evaluate(() => document.body.style.overflow !== 'hidden'));
    check(`${width}px: kadro ve klinikte yakalanmamış tarayıcı hatası yok`, squadErrors.length === 0, squadErrors.join(' | '));
    await browser.close(); browser = undefined;
  }
} catch (error) { failed++; console.error(error?.stack ?? error); }
finally { await browser?.close(); await server.close(); }
console.log(`\nLAYERED-DIALOGS: ${passed}/${passed + failed}`);
process.exit(failed ? 1 : 0);
