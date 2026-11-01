// The real archive and newsroom render two seasons with the same fixture ID.
import { chromium } from 'playwright';
import { createServer as createNetServer } from 'node:net';
import { createServer as createViteServer } from 'vite';
const probe = createNetServer();
await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const server = await createViteServer({ server: { host: '127.0.0.1', port, strictPort: true }, logLevel: 'silent' });
await server.listen();
const launch = () => chromium.launch({ ...(process.env.HM26_CHROMIUM ? { executablePath: process.env.HM26_CHROMIUM } : {}), headless: true, args: ['--no-sandbox'] });
let browser, passed = 0, failed = 0;
const check = (name, ok, detail = '') => { ok ? passed++ : failed++; console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
try {
  for (const width of [320, 390]) {
    browser = await launch();
    const page = await browser.newPage({ viewport: { width, height: 820 }, locale: 'tr', reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error' && /same key|unique .key./i.test(message.text())) errors.push(message.text()); });
    await page.goto(`http://127.0.0.1:${port}/tools/roster-league-fixture.html?scenario=archive-seasons`);
    await page.getByRole('button', { name: 'Test: İstatistik' }).click();
    await page.getByRole('tab', { name: 'Lig Analizi' }).click();
    const entries = page.getByTestId('archive-highlights-list').getByTestId('archive-highlight-open');
    const texts = await entries.allTextContents();
    check(`${width}px: arşiv farklı sezonları yeni→eski gösterir`, texts.length === 3 && texts[0].includes('S2') && texts[1].includes('S1') && texts[1].includes('300. gün') && texts[2].includes('S1'));
    await entries.nth(0).click();
    let dialog = page.getByRole('dialog', { name: 'Maç Arşivi · Öne Çıkan Anlar' });
    check(`${width}px: yeni sezonun aynı fikstür özeti doğru skorla açılır`, (await dialog.getByTestId('highlights-score').innerText()).includes('2–0'));
    await dialog.getByRole('button', { name: 'Kapat', exact: true }).click();
    await entries.nth(2).click();
    dialog = page.getByRole('dialog', { name: 'Maç Arşivi · Öne Çıkan Anlar' });
    check(`${width}px: önceki sezonun aynı fikstür özeti bağımsız açılır`, (await dialog.getByTestId('highlights-score').innerText()).includes('0–2'));
    await dialog.getByRole('button', { name: 'Kapat', exact: true }).click();
    await page.getByRole('button', { name: 'Test: Basın' }).click();
    const news = page.getByTestId('match-news-item');
    const stories = await news.allTextContents();
    check(`${width}px: maç hikâyeleri sezonları ve gerçek skorları ayrı gösterir`, stories.length === 3 && stories[0].includes('S2') && stories[0].includes('2–0') && stories[2].includes('S1') && stories[2].includes('0–2'));
    await page.getByRole('button', { name: 'Haftanın 11’i', exact: true }).click();
    const weekly = await page.locator('body').innerText();
    check(`${width}px: haftanın 11’inde geçmiş sezonun puanı karışmaz`, weekly.includes(await page.evaluate(() => window.__archivePlayer)) && weekly.includes('6.1') && !weekly.includes('9.9'));
    await page.getByRole('button', { name: 'Hakemler', exact: true }).click();
    const referee = await page.locator('body').innerText();
    check(`${width}px: hakem geçmişinde yeni sezon önce ve sezon etiketleri görünür`, referee.includes('S2 · Gün 12') && referee.includes('S1 · Gün 300') && referee.indexOf('Yeni Hakem') < referee.indexOf('Eski Final Hakemi'));
    check(`${width}px: ekranlar yatay taşmaz ve çakışan React anahtarı üretmez`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && errors.length === 0, errors.join(' | '));
    await browser.close(); browser = undefined;
  }
} catch (error) { failed++; console.error(error?.stack ?? error); }
finally { await browser?.close(); await server.close(); }
console.log(`\nSEASON-ARCHIVE: ${passed}/${passed + failed}`);
process.exit(failed ? 1 : 0);
