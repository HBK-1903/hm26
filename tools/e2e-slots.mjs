// HM26 E2E — Yuva kartı silme özelliği: ⋯ menü balonlanma fixi + görünür 🗑 + iki aşamalı onay + lastActive temizliği
import { chromium } from 'playwright';
const BASE = process.env.HM26_BASE_URL ?? 'http://localhost:4173';
let failures = 0;
const ok = (n, c, x = '') => { console.log((c ? '✅ ' : '❌ ') + n + (x ? ` | ${x}` : '')); if (!c) failures++; };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'tr' });
page.on('pageerror', (e) => console.log('   PAGEERROR:', String(e).slice(0, 160)));

try {
  // kariyer kur
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Başla|Kayıt Yuvaları/ }).first().click({ force: true, timeout: 8000 });
  await page.getByText(/Yeni Kariyer — Yuva 1/).first().click({ force: true, timeout: 8000 });
  await page.locator('input').first().fill('Silme Testi');
  await page.getByText('Eski Futbolcu').first().click({ force: true }).catch(() => {});
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /^Devam$/ }).first().click({ force: true });
  await page.getByText('Denizli Yeşilova').first().click({ force: true });
  await page.getByRole('button', { name: /Kulüp Brifingine Git/ }).first().click({ force: true });
  await page.getByRole('button', { name: /Kariyeri Başlat/ }).first().click({ force: true, timeout: 8000 });
  await page.waitForSelector('text=/Time|MERKEZ|Merkez/', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(600);
  ok('kariyer kuruldu', true);

  // reload → splash → yuvalar
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const quick = await page.getByRole('button', { name: /Devam Et —/ }).count();
  ok('splash hızlı devam rozeti var (silmeden önce)', quick === 1);
  await page.getByRole('button', { name: 'Kayıt Yuvaları' }).first().click({ force: true });
  await page.waitForTimeout(600);
  ok('yuva kartı dolu görünüyor', (await page.locator('text=Devam Et').count()) >= 1);

  // ⋯ menü: balonlanma fixi — Sheet açılmalı, oyuna girmemeli
  await page.getByRole('button', { name: 'Yuva 1 yönet menüsü' }).click({ force: true, timeout: 6000 });
  await page.waitForTimeout(500);
  const exportVisible = await page.locator('text=Dışa Aktar').count();
  ok('⋯ menüsü Sheet açar (oyuna kaçmaz) — balonlanma fixi', exportVisible >= 1 && (await page.locator('text=Sonraki Gün').count()) === 0, `exportVisible=${exportVisible}`);
  await page.getByRole('button', { name: 'Vazgeç' }).first().click({ force: true });
  await page.waitForTimeout(400);

  // görünür 🗑 → iki aşamalı onay
  const trash = await page.getByRole('button', { name: 'Yuva 1 kariyerini sil' }).count();
  ok('kart üzerinde görünür 🗑 butonu', trash === 1);
  await page.getByRole('button', { name: 'Yuva 1 kariyerini sil' }).click({ force: true });
  await page.waitForTimeout(500);
  ok('iki aşamalı onay sheeti', (await page.locator('text=Silme Onayı').count()) >= 1);
  await page.getByRole('button', { name: /Evet, Kalıcı Olarak Sil/ }).click({ force: true });
  await page.waitForTimeout(700);
  const emptyNow = await page.getByText('Yeni Kariyer — Yuva 1').count();
  ok('yuva boşaldı', emptyNow >= 1);

  // lastActive temizliği: reload sonrası hızlı devam olmamalı
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const quickAfter = await page.getByRole('button', { name: /Devam Et —/ }).count();
  ok('silinen aktif yuvanın hızlı-devam hayaleti yok', quickAfter === 0);

  console.log(failures ? `\nSONUÇ: ${failures} BAŞARISIZ` : '\nSONUÇ: YUVA SİLME TAMAM');
} catch (e) {
  console.log('\nTEST ÇÖKTÜ:', String(e).slice(0, 300));
  failures++;
} finally { await browser.close(); }
process.exit(failures ? 1 : 0);
