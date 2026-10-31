// HM26 — v0.9.9 E2E: piyasa filtreleri + taktik GEN rozeti + canlı akış onarımı
// Önkoşul: vite preview :4173. Çalıştır: node tools/e2e-v099.mjs
import { chromium } from 'playwright';
const browser = await chromium.launch();
const width = Number(process.env.HM26_VIEWPORT_WIDTH ?? 390);
const page = await browser.newPage({ viewport: { width, height: width <= 320 ? 720 : 844 }, locale: 'tr' });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
let fail = 0;
const ok = (n, c, x = '') => { console.log((c ? '✅ ' : '❌ ') + n + (x ? ` | ${x}` : '')); if (!c) fail++; };
const tap = (l) => l.first().click({ force: true, timeout: 9000 });

// Decisions can pause the match behind a real modal; resolve them as a user
// would before freezing the feed for an exact tab-switch comparison.
async function freezeLiveFeed() {
  for (let attempt = 0; attempt < 8; attempt++) {
    const dialog = page.getByRole('dialog');
    if (await dialog.count()) {
      await dialog.first().getByRole('button', { name: 'Kapat', exact: true }).click({ timeout: 5000 });
      continue;
    }
    const resume = page.getByRole('button', { name: 'Maça devam et', exact: true });
    if (await resume.isVisible()) return 'paused';
    const pause = page.getByRole('button', { name: 'Maçı duraklat', exact: true });
    if (await pause.isVisible()) {
      try { await pause.click({ timeout: 1500 }); }
      catch (error) { if (!await dialog.count()) throw error; }
      continue;
    }
    if ((await page.getByRole('timer').innerText()).trim() === 'MS') return 'finished';
    await page.waitForTimeout(100);
  }
  throw new Error('Canlı günlük karşılaştırması için maç durdurulamadı');
}

await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Başla|Kayıt Yuvaları/ }).first().click({ force: true });
await page.getByText(/Yeni Kariyer — Yuva 1/).first().click({ force: true });
await page.locator('input').first().fill('V099 Testi');
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
await page.waitForTimeout(500);

// ── B1: Piyasa → Oyuncu Ara filtreleri ──
await tap(page.locator('nav[aria-label="Ana gezinme"] button', { hasText: 'Piyasa' }));
await page.waitForTimeout(600);
await tap(page.getByRole('button', { name: 'Oyuncu Ara' }));
await page.waitForTimeout(500);
const allCount = await page.locator('article').count();
// Değer Seg: 3M+ seç
await tap(page.getByRole('button', { name: '₺3M+' }));
await page.waitForTimeout(400);
const hiCount = await page.locator('article').count();
// Serbest filtresi: tüm satırlar Bedelsiz / Bosman olmalı
await tap(page.getByRole('button', { name: 'Değer: Tümü' }));
await tap(page.locator('button[data-filter="free"]'));
await page.waitForTimeout(400);
const freeCards = await page.locator('article').allTextContents();
const allFree = freeCards.length > 0 && freeCards.every((t) => /Bedelsiz/.test(t));
ok('B1 Ara: değer filtresi listeyi daraltıyor', hiCount >= 1 && hiCount <= allCount, `tum=${allCount} 3M+=${hiCount}`);
ok('B2 Ara: "Serbest / Bosman" filtresi yalnız bedelsiz kart bırakıyor', allFree, `serbest-kart=${freeCards.length}`);
// Bütçe filtresi ara sekmesinde de görünür
ok('B3 Ara: "Değeri ≤ bütçe" düğmesi sekmede mevcut', await page.locator('button[data-filter="budget"]').count() === 1);
await tap(page.locator('button[data-filter="free"]')).catch(() => {});

// ── B4: Taktik sahada isim altı GEN ──
await tap(page.locator('nav[aria-label="Ana gezinme"] button', { hasText: 'Taktik' }));
await page.waitForTimeout(700);
const gens = await page.locator('[data-slot-gen]').evaluateAll((els) => els.map((e) => +e.getAttribute('data-slot-gen')));
ok('B4 Taktik: 11 ilk-11 yuvasının tamamında isim altı GEN rozeti', gens.length === 11 && gens.every((v) => v >= 40 && v <= 99), `rozet=${gens.length} min=${Math.min(...gens)} max=${Math.max(...gens)}`);
await page.screenshot({ path: '_shots/b4-tactics-gen.png' });
// This clears optional lineup/bench fields in the in-memory tactic plan.
await page.getByRole('button', { name: 'Otomatik 11', exact: true }).click();

// ── B5-B8: Canlı maç akışı ──
for (let d = 0; d < 10; d++) {
  await tap(page.locator('nav[aria-label="Ana gezinme"] button', { hasText: 'Merkez' }));
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Sonraki Gün/ }).first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(550);
  const sheetBtn = page.getByRole('button', { name: /^Tamam$|^Devam$/ }).last();
  if (await sheetBtn.count()) { await sheetBtn.click({ force: true }).catch(() => {}); await page.waitForTimeout(300); }
  const t = await page.locator('body').textContent();
  if (/0 gün kaldı|Maç günü|MAÇ GÜNÜ/i.test(t)) break;
}
await page.getByRole('button', { name: /Maç Merkezine Git/ }).first().click({ force: true, timeout: 8000 });
await page.waitForTimeout(800);
await page.getByRole('button', { name: /Maça Başla/ }).first().click({ force: true });
await page.waitForTimeout(700); // ilk frame
await page.getByRole('button', { name: 'Kenar Talimatı' }).click();
await page.getByRole('dialog', { name: 'Kenar Talimatı' }).getByRole('button', { name: 'Hücum', exact: true }).click();
await page.getByRole('dialog', { name: 'Kenar Talimatı' }).getByRole('button', { name: 'Kapat', exact: true }).last().click();
// Güncel maç konsolunda akış ayrı bir sekmede; saha varsayılan olarak açılır.
await page.getByRole('tab', { name: 'Spiker ve Maç Günlüğü' }).click({ force: true });
const feedBox = page.locator('[role="log"][aria-label="Maç olay akışı"]');
ok('B5 Akış: rol/log bölgesi mevcut', await feedBox.count() === 1);
const firstText = await feedBox.textContent();
ok('B6 Akış: ilk olay ("Maç başladı") ilk saniyede görünür — akış boş açılış yapmıyor', /Maç başladı/.test(firstText || ''));
ok('B10 Otomatik 11 sonrası canlı hücum talimatı kabul edilir', /Kenar komutu: Hücum zihniyetine geçiş istendi/.test(firstText || ''));
await page.waitForTimeout(6500); // x2 → ~25-30 dk ilerleme
const feedState = await freezeLiveFeed();
const beforeLines = await feedBox.locator(':scope > div > div.flex').allTextContents();
const lineCount = beforeLines.length;
ok('B7 Akış: ilk 30 dk dolayında en az 4 olay satırı', lineCount >= 4, `satir=${lineCount} durum=${feedState}`);
// Geometri: akış, üstteki skorbord ve alttaki sekmelerle çakışmamalı.
const fb = await feedBox.boundingBox();
const score = await page.locator('header[aria-label="Sabit maç skorbordu"]').boundingBox();
const tabs = await page.getByRole('tablist', { name: 'Maç konsolu sekmeleri' }).boundingBox();
ok('B8 Akış: liste skorbord ve sekmelere taşmıyor', !!fb && !!score && !!tabs && score.y + score.height <= fb.y + 2 && fb.y + fb.height <= tabs.y + 2, `akis=${fb && Math.round(fb.y)}–${fb && Math.round(fb.y + fb.height)}, sekmeler=${tabs && Math.round(tabs.y)}`);
await page.screenshot({ path: '_shots/b8-livefeed.png' });
// Compare the actual visible rows while paused: the live feed intentionally
// retains only its latest 40 rows, so its opening line may age out naturally.
await page.getByRole('tab', { name: 'Canlı Saha' }).click();
await page.getByRole('tab', { name: 'Canlı Saha', selected: true }).waitFor();
await feedBox.waitFor({ state: 'detached' });
const hiddenOnPitch = await feedBox.count() === 0;
await page.getByRole('tab', { name: 'Spiker ve Maç Günlüğü' }).click();
await page.getByRole('tab', { name: 'Spiker ve Maç Günlüğü', selected: true }).waitFor();
await feedBox.waitFor({ state: 'visible' });
const restoredLines = await feedBox.locator(':scope > div > div.flex').allTextContents();
const feedSelected = await page.getByRole('tab', { name: 'Spiker ve Maç Günlüğü' }).getAttribute('aria-selected') === 'true';
const sameLines = JSON.stringify(restoredLines) === JSON.stringify(beforeLines);
ok('B9 Akış: sekmeye dönüşte canlı günlük korunuyor', hiddenOnPitch && feedSelected && lineCount >= 4 && sameLines, `hidden=${hiddenOnPitch} selected=${feedSelected} before=${lineCount} after=${restoredLines.length} same=${sameLines} state=${feedState}`);
await page.screenshot({ path: '_shots/b9-feedmode.png' });

ok('B11 Canlı taktik akışında yakalanmamış uygulama hatası yok', pageErrors.length === 0, pageErrors.join(' | '));
console.log(`\nE2E-V099: ${11 - fail}/11 geçti (${width}px)${fail ? ` — ${fail} BAŞARISIZ` : ''}`);
await browser.close();
process.exit(fail ? 1 : 0);
