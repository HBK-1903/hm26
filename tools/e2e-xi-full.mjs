// HM26 E2E — v0.9.7: tam profil "İlk 11'e Al" her durumda yuva-atama akışı + yuva dokunma hedefleri ≥44×44
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
  await page.locator('input').first().fill('Tam Profil XI');
  await page.getByText('Eski Futbolcu').first().click({ force: true }).catch(() => {});
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /^Devam$/ }).first().click({ force: true });
  await page.getByText('Denizli Yeşilova').first().click({ force: true });
  await page.getByRole('button', { name: /Kulüp Brifingine Git/ }).first().click({ force: true });
  await page.getByRole('button', { name: /Kariyeri Başlat/ }).first().click({ force: true, timeout: 8000 });
  await page.getByRole('button', { name: 'Anladım' }).first().click({ force: true, timeout: 4000 }).catch(() => {});

  // Kadro → tam profil → İlk 11'e Al
  await page.getByRole('button', { name: /^Kadro$/ }).first().click({ force: true, timeout: 6000 });
  await page.locator('button').filter({ hasText: /yaş/ }).first().click({ force: true, timeout: 6000 });
  await page.getByRole('button', { name: /Tam Profili Aç/ }).first().click({ force: true, timeout: 6000 });
  ok('T1 tam profil açık (Kariyer Dökümü kartı görünür)', await page.getByText(/Kariyer Dökümü/).isVisible({ timeout: 4000 }).catch(() => false));
  await page.getByRole('button', { name: /^İlk 11'e Al$/ }).last().click({ force: true, timeout: 6000 });

  // T2: akış başladı mı? Taktik ekranı + pendingXI şeridi + yeşil parlatma
  const banner = await page.getByText(/Sahaya al:/).isVisible({ timeout: 5000 }).catch(() => false);
  const glow = await page.locator('button[data-compat="1"]').count(); // data-compat: tarayıcı style normalizasyonundan bağımsız kararlı işaret
  ok('T2 tam profil düğmesi → yuva atama akışı başladı (şerit + uyumlu yuva parlatması)', banner && glow > 0, `şerit=${banner} yeşilYuvalar=${glow}`);

  // T3: uyumlu yuvaya dokun → dizilim güncellenir
  await page.locator('button[data-compat="1"]').first().click({ force: true });
  await page.waitForTimeout(300);
  ok('T3 yuvaya dokun → dizilim güncellendi (Manuel dizilim)', await page.getByText('Manuel dizilim').isVisible({ timeout: 4000 }).catch(() => false));

  // T4: 11 yuva düğmesinin dokunma hedefi ≥44×44 (görünür daire 24–29px kalabilir)
  const sizes = await page.locator('button[aria-label*="değiştir"]:not([aria-label*="Dizilişi"]), button[aria-label^="Yuva"]').evaluateAll(
    (els) => els.map((el) => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height }; })
  );
  const tooSmall = sizes.filter((r) => r.w < 44 || r.h < 44);
  ok('T4 11/11 yuva düğmesi dokunma hedefi ≥44×44', sizes.length === 11 && tooSmall.length === 0, `yuva=${sizes.length} küçük=${tooSmall.length}${tooSmall.length ? ' ' + JSON.stringify(tooSmall[0]) : ''}`);
} catch (e) {
  console.log('   FATAL:', String(e).slice(0, 220));
  failures++;
} finally {
  await browser.close();
}
console.log(failures === 0 ? `\n4 test, 0 başarısız` : `\n${failures} BAŞARISIZ`);
if (failures) process.exit(1);
