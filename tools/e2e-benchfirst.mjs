// HM26 E2E — taktik tahtasında 11 yuva ve ilk 11 dışındaki tüm oyuncular tıklanabilir.
import { chromium } from 'playwright';
const BASE = process.env.HM26_BASE_URL ?? 'http://localhost:4173';
let failures = 0;
const ok = (n, c, x = '') => { console.log((c ? '✅ ' : '❌ ') + n + (x ? ` | ${x}` : '')); if (!c) failures++; };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'tr' });

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Başla|Kayıt Yuvaları/ }).first().click({ force: true, timeout: 8000 });
  await page.getByText(/Yeni Kariyer — Yuva 1/).first().click({ force: true, timeout: 8000 });
  await page.locator('input').first().fill('Bench First');
  await page.getByText('Eski Futbolcu').first().click({ force: true }).catch(() => {});
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /^Devam$/ }).first().click({ force: true });
  await page.getByText('Denizli Yeşilova').first().click({ force: true });
  await page.getByRole('button', { name: /Kulüp Brifingine Git/ }).first().click({ force: true });
  await page.getByRole('button', { name: /Kariyeri Başlat/ }).first().click({ force: true, timeout: 8000 });
  await page.getByRole('button', { name: 'Anladım' }).first().click({ force: true, timeout: 4000 }).catch(() => {});

  await page.getByRole('button', { name: /^Taktik$/ }).first().click({ force: true, timeout: 6000 });

  // G1: 11 saha yuvası — hepsinde click handler (onSlotTap her formaisyonda map bağlı)
  const slots = page.locator('button[aria-label*="değiştir"]:not([aria-label*="Dizilişi"]), button[aria-label^="Yuva"]');
  const slotCount = await slots.count();
  ok('G1 11/11 saha yuvası tıklanabilir düğme', slotCount === 11, `bulunan=${slotCount}`);

  // G2: sayaçtaki tüm ilk 11 dışı oyuncular listelenir, hiçbiri tekrarlanmaz.
  const benchCards = page.locator('button[aria-label*="sahaya almak için seç"]');
  const benchCount = await benchCards.count();
  const expectedCount = Number((await page.getByText(/İLK 11 DIŞINDA · \d+ OYUNCU/).innerText()).match(/\d+(?= OYUNCU)/)?.[0]);
  const ids = await benchCards.evaluateAll((els) => els.map((el) => el.getAttribute('data-roster-id')));
  let disabledCount = 0;
  for (let i = 0; i < benchCount; i++) if (await benchCards.nth(i).isDisabled()) disabledCount++;
  ok('G2 tüm ilk 11 dışı oyuncular tekrarsız ve tıklanabilir', benchCount === expectedCount && benchCount >= 6 && new Set(ids).size === benchCount && disabledCount === 0, `bulunan=${benchCount}/${expectedCount} disabled=${disabledCount}`);

  // G3: yedek önce → kart seçilir, işaret ve ipucu çıkar
  await benchCards.first().click({ force: true });
  const picked = await page.locator('button[data-benchpick="true"]').count();
  const hintOk = await page.getByText(/için yeşil parlayan bir yuvaya dokun — sahaya girer/).isVisible({ timeout: 3000 }).catch(() => false);
  ok('G3 yedeğe dokun → seçim + yuva-parlatma ipucu', picked === 1 && hintOk, `picked=${picked} hint=${hintOk}`);

  // G4: bir yuvaya dokun — uyumsuzsa iki-aşamalı onay (tekrar dokun), sonunda Manuel dizilim belirir
  await slots.nth(6).click({ force: true }); // CM civarı yuva
  await page.waitForTimeout(250);
  const banner = await page.locator('[role="alert"]').filter({ hasText: /güç cezası/ }).count();
  if (!(await page.getByText('Manuel dizilim').isVisible().catch(() => false))) {
    await slots.nth(6).click({ force: true }); // ikinci dokun = onay
    await page.waitForTimeout(250);
  }
  const manual = await page.getByText('Manuel dizilim').isVisible({ timeout: 3000 }).catch(() => false);
  const pickCleared = (await page.locator('button[data-benchpick="true"]').count()) === 0;
  ok('G4 yuva dokun → yedek sahada (Manuel dizilim), seçim sıfırlandı', manual && pickCleared, `banner=${banner} manuel=${manual} cleared=${pickCleared}`);

  // G5 regresyon: saha-yuvası önce akışı hâlâ çalışır (yuva → yuva takas)
  await slots.nth(4).click({ force: true });
  await slots.nth(5).click({ force: true });
  await page.waitForTimeout(250);
  ok('G5 yuva→yuva takas regresyonu (hala manuel dizilim modunda)', await page.getByText('Manuel dizilim').isVisible().catch(() => false));
} catch (e) {
  console.log('   FATAL:', String(e).slice(0, 220));
  failures++;
} finally {
  await browser.close();
}
console.log(failures === 0 ? `\n5 test, 0 başarısız` : `\n${failures} BAŞARISIZ`);
if (failures) process.exit(1);
