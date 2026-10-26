// HM26 — v0.9.10 motor anlatım E2E: canlı maçta oyuncu-zincirli olay kalitesi
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'tr' });
let fail = 0;
const ok = (n, c, x = '') => { console.log((c ? '✅ ' : '❌ ') + n + (x ? ` | ${x}` : '')); if (!c) fail++; };
const tap = (l) => l.first().click({ force: true, timeout: 9000 });

await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Başla|Kayıt Yuvaları/ }).first().click({ force: true });
await page.getByText(/Yeni Kariyer — Yuva 1/).first().click({ force: true });
await page.locator('input').first().fill('Motor Testi');
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
for (let d = 0; d < 10; d++) {
  await page.getByRole('button', { name: /Sonraki Gün/ }).first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(550);
  const sb = page.getByRole('button', { name: /^Tamam$|^Devam$/ }).last();
  if (await sb.count()) { await sb.click({ force: true }).catch(() => {}); await page.waitForTimeout(300); }
  if (/0 gün kaldı|Maç günü|MAÇ GÜNÜ/i.test(await page.locator('body').textContent())) break;
}
await page.getByRole('button', { name: /Maç Merkezine Git/ }).first().click({ force: true, timeout: 8000 });
await page.waitForTimeout(800);
await page.getByRole('button', { name: /Maça Başla/ }).first().click({ force: true });
await page.waitForTimeout(500);
await page.locator('button').filter({ hasText: /^4×$/ }).first().evaluate((el) => el.click()); // 4x hız
// Akış modu → tüm olaylar görünür
await page.locator('button').filter({ hasText: 'Akış' }).first().evaluate((el) => el.click());
await page.waitForTimeout(2500);
const early = await page.locator('[role="log"][aria-label="Maç olay akışı"] > div > div.flex').allTextContents();
await page.waitForTimeout(12500); // 4x: ~90msn → ~devre

const lines = await page.locator('[role="log"][aria-label="Maç olay akışı"] > div > div.flex').allTextContents();
ok('C1 Akış: ilk devre sonunda ≥12 olay', lines.length >= 12, `satir=${lines.length}`);
ok('C2 Akış: "Maç başladı" açılış satırı mevcut (ilk 3sn)', early.some((t) => /Maç başladı/.test(t)));
const namePat = /[A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,}/;
const infoLines = lines.filter((t) => !/Maç başladı|devam ediyor|Yayın/.test(t));
const named = infoLines.filter((t) => namePat.test(t.replace(/^\s*\|'?\d+'?\s*/, '')));
ok('C3 Akış: info/danger olaylarının ≥%55\'i oyuncu adı içeriyor', named.length / Math.max(1, infoLines.length) >= 0.55, `${named.length}/${infoLines.length}`);
ok('C4 Akış: pas zinciri veya pozisyon-anlatımı mevcut (→ / bindirdi / oyunu çevirdi / baskı altında)', lines.some((t) => /→|bindirdi|oyunu çevirdi|baskı altında|ortaya hareketlendi|ekarte/.test(t)));
ok('C5 Akış: "undefined" veya bozuk metin yok', !lines.some((t) => /undefined|NaN|\[object/.test(t)));
const selfSwitch = lines.filter((t) => { const m = t.match(/(\w+) oyunu çevirdi — (\w+) ters kanatta/); return m && m[1] === m[2]; });
ok('C6 Akış: kendi-kendine "oyunu çevirdi" artığı yok', selfSwitch.length === 0, selfSwitch[0] ?? '');
const uniq = new Set(lines.map((t) => t.replace(/^\d+'\s*/, '')));
ok('C7 Akış: şablon çeşitliliği — 12 satırda ≥6 farklı metin', uniq.size >= Math.min(6, lines.length), `tekil=${uniq.size}/${lines.length}`);
console.log('='.repeat(60));
lines.slice(0, 20).forEach((t) => console.log('  ' + t.replace(/\s+/g, ' ').slice(0, 110)));
console.log('='.repeat(60));
await page.screenshot({ path: '_shots/c-live-narration.png' });
console.log(`\nE2E-V0910: ${7 - fail}/7 geçti${fail ? ` — ${fail} BAŞARISIZ` : ''}`);
await browser.close();
process.exit(fail ? 1 : 0);
