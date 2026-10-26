// HM26 E2E — v0.9.5 FAZ A: İstatistik & Ödüller hub'ı + Kariyer Dökümü kartı (empty-state ve iskelet)
import { chromium } from 'playwright';
const BASE = process.env.HM26_BASE_URL ?? 'http://localhost:4173';
let failures = 0;
const ok = (n, c, x = '') => { console.log((c ? '✅ ' : '❌ ') + n + (x ? ` | ${x}` : '')); if (!c) failures++; };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'tr' });

try {
  // kariyer kur (boot)
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Başla|Kayıt Yuvaları/ }).first().click({ force: true, timeout: 8000 });
  await page.getByText(/Yeni Kariyer — Yuva 1/).first().click({ force: true, timeout: 8000 });
  await page.locator('input').first().fill('Stats FAZ-A');
  await page.getByText('Eski Futbolcu').first().click({ force: true }).catch(() => {});
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /^Devam$/ }).first().click({ force: true });
  await page.getByText('Denizli Yeşilova').first().click({ force: true });
  await page.getByRole('button', { name: /Kulüp Brifingine Git/ }).first().click({ force: true });
  await page.getByRole('button', { name: /Kariyeri Başlat/ }).first().click({ force: true, timeout: 8000 });
  const bootOk = await page.getByRole('button', { name: /Sonraki Gün|Maç Merkezine Git/ }).first().isVisible({ timeout: 8000 }).catch((e) => { console.log('   boot-detay:', String(e).slice(0, 80)); return false; });
  if (!bootOk) console.log('   BOOT-BODY:', (await page.textContent('body')).slice(0, 300).replace(/\s+/g, ' '));
  ok('Boot: kariyer başladı', bootOk);

  await page.getByRole('button', { name: 'Anladım' }).first().click({ force: true, timeout: 4000 }).catch(() => {}); // sürüm notu modalı (varsa) kapat
  // Daha → İstatistik
  await page.getByRole('button', { name: /Daha/ }).first().click({ force: true });
  const statsBtn = page.getByRole('button', { name: /İstatistik/ }).first();
  ok('Daha menüsünde İstatistik sekmesi', await statsBtn.isVisible({ timeout: 4000 }).catch(() => false));
  await statsBtn.click({ force: true });
  ok('StatsHub başlık render', await page.getByText('İstatistik & Ödüller').isVisible({ timeout: 4000 }).catch(() => false));
  ok('Empty-state onur kuralı (sahte veri yok)', await page.getByText(/Henüz istatistik birikmedi/).isVisible({ timeout: 4000 }).catch(() => false));

  // Karakter sekmesi
  await page.getByRole('tab', { name: /Karakter/ }).click({ force: true });
  ok('Karakter sekmesi + empty-state', await page.getByText(/Takım karakteri okunamıyor/).isVisible({ timeout: 4000 }).catch(() => false));

  // Ödüller sekmesi — kupa vitrin empty + ödül empty
  await page.getByRole('tab', { name: /Ödüller/ }).click({ force: true });
  const vitrin = await page.getByText(/Kupa Vitrini/).isVisible({ timeout: 4000 }).catch(() => false);
  const odulEmpty = await page.getByText(/Bireysel ödüller sezon sonunda bekliyor/).isVisible({ timeout: 4000 }).catch(() => false);
  ok('Ödüller sekmesi: vitrin + ödül empty-state', vitrin && odulEmpty, `vitrin=${vitrin} odulEmpty=${odulEmpty}`);

  // Kadro → oyuncu tam profili → Kariyer Dökümü kartı
  await page.getByRole('button', { name: /Kadro/ }).first().click({ force: true, timeout: 6000 });
  await page.locator('button').filter({ hasText: /yaş/ }).first().click({ force: true, timeout: 6000 }).catch(async (e) => { console.log('   squad-click-detay:', String(e).slice(0, 80)); });
  const tamProfil = page.getByRole('button', { name: /Tam Profili Aç/ }).first();
  const tpVisible = await tamProfil.isVisible({ timeout: 4000 }).catch(() => false);
  if (tpVisible) await tamProfil.click({ force: true });
  const kd = await page.getByText(/Kariyer Dökümü/).isVisible({ timeout: 4000 }).catch(() => false);
  const kdEmpty = await page.getByText(/Kariyer kaydı boş/).isVisible({ timeout: 4000 }).catch(() => false);
  ok('Tam profilde Kariyer Dökümü kartı + empty-state', kd && kdEmpty, `hizliKart=${tpVisible} kart=${kd} empty=${kdEmpty}`);
} catch (e) {
  console.log('   FATAL:', String(e).slice(0, 220));
  failures++;
} finally {
  await browser.close();
}
console.log(failures === 0 ? `\n6 test, 0 başarısız` : `\n${failures} BAŞARISIZ`);
if (failures) process.exit(1);
