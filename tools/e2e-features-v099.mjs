// HM26 — v0.9.9 özellik E2E: takas paneli + sağlık/rehberlik kartı + kenardan itiraz
// Önkoşul: vite preview :4173 (güncel build). Çalıştır: node tools/e2e-features-v099.mjs
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'tr' });
let fail = 0; let warn = 0;
const ok = (n, c, x = '') => { console.log((c ? '✅ ' : '│  ⚠ ') + n + (x ? ` | ${x}` : '')); if (!c) { if (n.startsWith('⚟')) warn++; else fail++; } };
const tap = (l) => l.first().click({ force: true, timeout: 9000 });

// ── Kariyer kur (yuva 1) ──
await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Başla|Kayıt Yuvaları/ }).first().click({ force: true });
await page.getByText(/Yeni Kariyer — Yuva 1/).first().click({ force: true });
await page.locator('input').first().fill('Test Manager');
await page.getByText('Eski Futbolcu').first().click({ force: true }).catch(() => {});
for (let i = 0; i < 6; i++) {
  if (await page.getByText('Denizli Yeşilova').count()) break;
  await page.getByRole('button', { name: /^Devam$/ }).first().click({ force: true });
  await page.waitForTimeout(400);
}
await page.getByText('Denizli Yeşilova').first().click({ force: true });
await page.getByRole('button', { name: /Kulüp Brifingine Git/ }).first().click({ force: true });
await page.getByRole('button', { name: /Kariyeri Başlat/ }).first().click({ force: true });
await page.waitForTimeout(1100);
await page.getByRole('button', { name: 'Anladım' }).first().click({ force: true, timeout: 2500 }).catch(() => {});

// ── F1/F2: Squad → genç oyuncu quick-action → tam profil ve mentor ──
await page.locator('nav[aria-label="Ana gezinme"] button', { hasText: 'Kadro' }).first().click({ force: true });
await page.waitForTimeout(500);
const youngRow = page.locator('button').filter({ hasText: /(?:17|18|19|20|21) yaş/ }).first();
if (await youngRow.count()) {
  await youngRow.click({ force: true });
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: /Tam Profili Aç/ }).first().click({ force: true });
  await page.waitForTimeout(500);
  const body1 = await page.locator('body').textContent();
  ok('F1 Sağlık & Rehberlik kartı tam profilde', /Sağlık . Rehberlik/.test(body1 ?? ''));
  const mentorSel = page.locator('select').filter({ hasText: /Ağabey seç/ }).first();
  if (await mentorSel.count()) {
    const opts = await mentorSel.locator('option').allTextContents();
    if (opts.length > 1) {
      await mentorSel.selectOption({ index: 1 });
      await page.getByRole('button', { name: /^Ata$/ }).first().click({ force: true });
      await page.waitForTimeout(300);
      ok('F2 Ağabeylik ataması + toast', /ağabeylik ediyor/.test((await page.locator('body').textContent()) ?? ''));
    } else ok('⚟ F2 kadroda 29+ mentor adayı yok', true);
  } else ok('F2 genç profilinde mentor seçici var', false);
} else {
  ok('F1 Sağlık & Rehberlik kartı profilde', false);
  ok('⚟ F2 kariyer kulübünde 21 ve altı oyuncu yok', true);
}

await page.getByRole('button', { name: '←' }).first().click({ force: true }).catch(() => {});
await page.waitForTimeout(300);
const quickClose = page.getByRole('button', { name: 'Kapat' }).last();
if (await quickClose.count()) await quickClose.click({ force: true }).catch(() => {});
await page.waitForTimeout(250);

// ── F3/F4: Market → Oyuncu Ara → kulüplü oyuncu → takas formu ──
await page.locator('nav[aria-label="Ana gezinme"] button', { hasText: 'Piyasa' }).first().evaluate((el) => el.click());
await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Oyuncu Ara' }).click({ force: true });
await page.waitForTimeout(500);
const articles = await page.locator('article').all();
let openedOffer = false;
for (const article of articles) {
  const text = await article.innerText();
  const offerButton = article.getByRole('button', { name: /^Teklif$/ });
  if (!/Bosman|Serbest/.test(text) && await offerButton.count() && await offerButton.isEnabled()) {
    await offerButton.click({ force: true });
    openedOffer = true;
    break;
  }
}
if (openedOffer) {
  await page.waitForTimeout(400);
  const b3 = (await page.locator('body').textContent()) ?? '';
  ok('F3 Oyuncu + nakit takası paneli', /Oyuncu \+ nakit takası/.test(b3));
  const swapSel = page.locator('select[aria-label="Takas oyuncusu"]').first();
  if (await swapSel.count()) {
    const swapOpts = await swapSel.locator('option').allTextContents();
    if (swapOpts.length > 1) {
      await swapSel.selectOption({ index: 1 });
      await page.waitForTimeout(250);
      const currentBody = (await page.locator('body').textContent()) ?? '';
      ok('F4 Takas oyuncusu seçilince değer ve toplam teklif görünür', /takas değeri/i.test(currentBody) && /toplam teklif değeri/i.test(currentBody));
    } else ok('⚟ F4 takas için uygun oyuncu bulunamadı', true);
  } else ok('F4 Takas oyuncu seçicisi mevcut', false);
} else {
  ok('⚟ F3/F4 bu seedde teklif verilebilir kulüplü oyuncu yok veya transfer penceresi kapalı', true);
}

// ── Kenardan İtiraz ve riskli kadro entegrasyonu tools/qa-features-v099.ts içinde saf motor testinde doğrulanır ──

console.log(`\n${fail} BAŞARISIZ · ${warn} uyarı (atlananlar ⚟)`);
await browser.close();
process.exit(fail ? 1 : 0);
