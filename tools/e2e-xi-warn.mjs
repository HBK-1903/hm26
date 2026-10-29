// HM26 E2E — Gereksinim 1: Tam profil "İlk 11'e Al" akışı; Gereksinim 2: mevki dışı turuncu uyarı
// Çalıştır: node tools/e2e-xi-warn.mjs  (server :3001 gerekli)
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.HM26_BASE_URL ?? 'http://localhost:4173';
const shots = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), '_shots');
const fs = await import('fs'); fs.mkdirSync(shots, { recursive: true });
let failures = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? '✅ ' : '❌ ') + name + (extra ? ` | ${extra}` : '')); if (!cond) failures++; };

const browser = await chromium.launch();
const tap = (loc) => loc.first().click({ force: true, timeout: 8000 });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'tr' });
page.on('pageerror', (e) => console.log('   PAGEERROR:', String(e).slice(0, 160)));
page.on('console', (m) => { if (m.type() === 'error') console.log('   CONSOLE-ERR:', m.text().slice(0, 240)); });

try {
  // ── Kariyer kur (hızlı, varsayılanlar) ────────────────────────────────────
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Başla|Kayıt Yuvaları/ }).click();
  await page.getByText(/Yeni Kariyer — Yuva 1/).click();
  await page.locator('input').first().fill('E2E Test Menajer');
  // arka plan kartı (step 0'da zorunlu)
  await page.getByText('Eski Futbolcu').first().click().catch(async () => {
    await page.locator('[class*="border"]').getByText(/Analist|Altyapı|Planlamacı/).first().click();
  });
  await page.getByRole('button', { name: /^Devam$/ }).click(); // step 1 (dönem)
  await page.getByRole('button', { name: /^Devam$/ }).click(); // step 2 (zorluk)
  await page.getByRole('button', { name: /^Devam$/ }).click(); // step 3 (kulüp)
  await page.getByText('Denizli Yeşilova').first().click();
  await page.getByRole('button', { name: /Kulüp Brifingine Git/ }).click(); // step 4
  await page.getByText('Sonraki kare').click().catch(() => {});
  await page.getByText('Sonraki kare').click().catch(() => {});
  await page.getByRole('button', { name: /Kariyeri Başlat/ }).click();
  await page.waitForSelector('text=/MERKEZ|Merkez/', { timeout: 8000 });
  // v0.6.6+: güncelleme sonrası ilk açılışta Sürüm Notu sheet'i açılır — kapat
  await page.getByRole('button', { name: 'Anladım' }).first().click({ force: true, timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(400);
  ok('Kariyer kuruldu (hub açıldı)', true);
  await page.screenshot({ path: `${shots}/01-hub.png` });

  // ── Kadro → hızlı profil → İlk 11'e Al → Taktik banner ───────────────────
  await tap(page.locator('nav[aria-label="Ana gezinme"] button', { hasText: 'Kadro' }));
  await page.waitForTimeout(700);
  console.log('   nav sonrası url=', page.url(), '— OYUNCU metni:', await page.locator('text=N OYUNCU').count(), 'hub-mi:', await page.locator('text=Maç Merkezi').count());
  await page.screenshot({ path: `${shots}/02a-after-nav.png` });
  const rows = page.locator('button', { hasText: /yaş/ });
  await tap(rows);
  await page.waitForSelector('text=İlk 11\'e Al', { timeout: 4000 });
  await tap(page.getByRole('button', { name: "İlk 11'e Al" }));
  await page.waitForTimeout(500);
  const banner = await page.locator('text=/Sahaya al/').count();
  ok('G1 hızlı profil → İlk 11\'e Al → taktik atama akışı', banner > 0 && page.url().includes('#tactics'), `url=${page.url()}`);
  await page.screenshot({ path: `${shots}/02-pendingxi.png` });
  // iptal ile temizle
  await tap(page.getByRole('button', { name: 'İlk 11 atamasını iptal et' }));

  // ── GEREKSİNİM 1: tam profil → İlk 11'e Al ────────────────────────────────
  await tap(page.locator('nav[aria-label="Ana gezinme"] button', { hasText: 'Kadro' }));
  await tap(rows);
  await page.waitForSelector('text=Tam Profili Aç', { timeout: 4000 });
  await tap(page.getByRole('button', { name: 'Tam Profili Aç' }));
  await page.waitForSelector('[role="dialog"]', { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${shots}/03-fullprofile.png` });
  await page.waitForTimeout(300);
  const dlgCount = await page.locator('div[role="dialog"]').count();
  console.log('   diyalog sayısı:', dlgCount);
  const fullXI = page.locator('div[role="dialog"][tabindex="-1"] button', { hasText: "İlk 11'e Al" });
  const cnt = await fullXI.count();
  console.log('   modal-içi İlk 11 butonu:', cnt);
  if (cnt) {
    const r = await fullXI.boundingBox();
    const cover = await page.evaluate((b) => { const e = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return e ? e.tagName + '|' + (e.className?.toString().slice(0, 70)) : 'null'; }, r);
    console.log('   buton rect:', JSON.stringify(r), '— kapatıcı:', cover);
    await fullXI.click({ timeout: 10000 }).catch(async (e) => { console.log('   normal click fail → force:', String(e).slice(0, 120)); await fullXI.click({ force: true }); });
  }
  await page.waitForTimeout(600);
  const banner2 = await page.locator('text=/Sahaya al/').count();
  ok('G1 (ANA) tam profil → İlk 11\'e Al → kadro atama akışı açıldı', banner2 > 0 && page.url().includes('#tactics'), `url=${page.url()}`);
  await page.screenshot({ path: `${shots}/04-after-fullprofile-xi.png` });

  if (banner2 > 0) {
    // atamayı tamamla: yeşil parlayan (uyumlu) olmayan DEĞİL — normal uyumlu bir yuvaya dokun (6 numara = index 5)
    await tap(page.locator('button[aria-label*="değiştir"][aria-pressed]').nth(6));
    await page.waitForTimeout(400);
    const still = await page.locator('text=/Sahaya al/').count();
    ok('G1 atama tamamlanınca banner kapanır', still === 0);
  }

  // ── GEREKSİNİM 2: mevki dışı oyuncu → yuva kenarında küçük turuncu uyarı ──
  await tap(page.locator('nav[aria-label="Ana gezinme"] button', { hasText: 'Taktik' }));
  await page.waitForTimeout(600);
  const slots = page.locator('button[aria-label*="değiştir"][aria-pressed]');
  console.log('   yuva sayısı:', await slots.count());
  // GK yuvası (index 0) seç, kulübeden kaleci OLMAYAN birini sahaya al (yeni mevki dışı durum üret)
  await tap(slots.nth(0));
  await page.waitForTimeout(400);
  console.log('   slot-0 aria-pressed:', await slots.nth(0).getAttribute('aria-pressed'));
  // Uyumlu kaleciler "Sahaya al" yazar; saha oyuncuları artık erişilebilir adda açıkça mevki dışı işaretlenir.
  const incompatible = page.locator('button[aria-label*="mevki dışı, ceza uygulanır"]');
  const chosen = await incompatible.count();
  if (chosen > 0) await tap(incompatible.first());
  await page.waitForTimeout(400);
  const armBanner = await page.locator('[role="alert"]').count();
  ok('G2a uyumsuz yedek → ilk dokun açıklama uyarısı (henüz atama yok)', chosen > 0 && armBanner >= 1, `aday=${chosen}, role=alert sayısı=${armBanner}`);
  if (chosen > 0) await tap(incompatible.first());
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shots}/05-oop-slot.png` });
  const gkSlot = slots.nth(0);
  const gkOop = await gkSlot.locator('[data-oop="true"]').count();
  const totalOop = await page.locator('[data-oop="true"]').count();
  ok('G2 mevki dışı oyuncunun (GK yuvasındaki saha oyuncusu) yuvasında turuncu uyarı', gkOop === 1 && totalOop >= 1, `gk-oop=${gkOop}, toplam uyarı=${totalOop}, kulübe seçimi=${chosen}`);
  // seçili (mevki dışı üçgenli) yuvaya dokun → açıklama şeridi çıkmalı
  await tap(slots.nth(0));
  await page.waitForTimeout(400);
  const explanation = await page.locator('[role="alert"]').allTextContents();
  ok('G2b üçgenli yuvaya dokun → neden açıklaması (güç cezası %)', explanation.some((text) => /turuncu üçgen/.test(text) && /%\d+/.test(text)), `alert sayısı=${explanation.length}`);
  // v0.9.4: pendingXI ile uyumsuz yuva → iki aşamalı onay akışı
  await tap(page.locator('nav[aria-label="Ana gezinme"] button', { hasText: 'Kadro' }));
  await page.waitForTimeout(500);
  await tap(page.locator('button', { hasText: /yaş/ }));
  await page.waitForTimeout(400);
  await tap(page.getByRole('button', { name: "İlk 11'e Al" }));
  await page.waitForTimeout(500);
  const slots2 = page.locator('button[aria-label*="değiştir"][aria-pressed]');
  await tap(slots2.nth(0)); // GK uyumsuz (saha oyuncusu)
  await page.waitForTimeout(400);
  const pendBanner = await page.locator('[role="alert"]').count();
  ok('G2c atama modunda uyumsuz yuva → açıklama şeridi (ilk dokun)', pendBanner >= 1, `alert=${pendBanner}`);
  await tap(page.locator('button[aria-label*="değiştir"][aria-pressed]').nth(0));
  await page.waitForTimeout(500);
  const pendOop = await slots2.nth(0).locator('[data-oop="true"]').count();
  ok('G2d ikinci dokun → atama uygulandı + üçgen uyarı', pendOop === 1);
  // düzelt: otomatik dizilime geri dön
  await tap(page.getByRole('button', { name: /Otomatik 11/ })).catch(() => {});

  console.log(failures ? `\nSONUÇ: ${failures} BAŞARISIZ` : '\nSONUÇ: TÜM GEREKSİNİMLER GEÇTİ');
} catch (e) {
  console.log('\nTEST ÇÖKTÜ:', String(e).slice(0, 400));
  await page.screenshot({ path: `${shots}/zz-crash.png` }).catch(() => {});
  failures++;
} finally {
  await browser.close();
}
process.exit(failures ? 1 : 0);
