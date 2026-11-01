// Completed real match engine + checkpoint + live report + durable career commit.
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
let browser, passed = 0, failed = 0;
const check = (name, ok, detail = '') => { ok ? passed++ : failed++; console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
try {
  for (const kind of ['injury', 'card']) {
    browser = await launch();
    const page = await browser.newPage({ viewport: { width: kind === 'injury' ? 320 : 390, height: 820 }, locale: 'tr', reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    page.setDefaultTimeout(20000);
    await page.goto(`${base}/tools/live-resume-fixture.html`);
    await page.waitForFunction(() => !!window.__liveStore);
    if (await page.getByRole('button', { name: 'Anladım' }).count()) await page.getByRole('button', { name: 'Anladım' }).first().click();
    const before = await page.evaluate(() => window.__liveStore.snapshot());
    const facts = await page.evaluate((type) => window.__liveStore.seedFinishedHealth(type), kind);
    check(`${kind}: gerçek motor sonucu ve tamamlanmış maçın checkpointi oluşur`, (kind === 'injury' ? facts.injuries.length : facts.suspensions.length) > 0 && (await page.evaluate(() => window.__liveStore.read())).blob.liveMatchCheckpoint.input.matchId === facts.matchId, `seed=${facts.seed}`);
    const early = await page.evaluate(() => window.__liveStore.snapshot());
    check(`${kind}: rapor kaydedilmeden oyuncu sağlık/cezası değişmez`, JSON.stringify(early.playerPatch) === JSON.stringify(before.playerPatch));
    await page.getByRole('button', { name: 'Maça Devam Et', exact: true }).click();
    await page.getByRole('button', { name: 'Sonucu Kaydet — Ana Merkez' }).waitFor();
    await page.getByTestId('live-checkpoint-status').getByText('Maç ilerlemesi kaydedildi.').waitFor();
    await page.getByRole('button', { name: 'Sonucu Kaydet — Ana Merkez' }).click();
    let saved;
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      saved = await page.evaluate(() => window.__liveStore.read());
      if (saved && !saved.blob.liveMatchCheckpoint && saved.blob.matchReports.length === before.matchReports.length + 1) break;
      await page.waitForTimeout(100);
    }
    check(`${kind}: canlı sonuç tek kayıtla işlenir ve checkpoint temizlenir`, !!saved && !saved.blob.liveMatchCheckpoint && saved.blob.matchReports.length === before.matchReports.length + 1);
    const persisted = kind === 'injury'
      ? facts.injuries.every((row) => saved.blob.playerPatch[row.playerId]?.injuredDays >= row.days && saved.blob.playerPatch[row.playerId]?.injury?.type === 'bilinmeyen')
      : facts.suspensions.every((row) => saved.blob.playerPatch[row.playerId]?.suspendedMatches === row.matches);
    check(`${kind}: canlı maçın gerçek motor delili kalıcı oyuncu durumuna geçer`, persisted, JSON.stringify(kind === 'injury' ? facts.injuries : facts.suspensions));
    check(`${kind}: sağlık ve ceza haberi gerçek kariyere kaydedilir`, saved.blob.inbox.some((message) => message.title === 'Maç sonrası sağlık ve ceza raporu'));
    await page.reload(); await page.waitForFunction(() => !!window.__liveStore);
    const reloaded = await page.evaluate(() => window.__liveStore.read());
    check(`${kind}: yeniden açılınca sağlık, ceza ve maç arşivi yinelenmeden korunur`, JSON.stringify(reloaded.blob.playerPatch) === JSON.stringify(saved.blob.playerPatch) && reloaded.blob.matchReports.length === saved.blob.matchReports.length && !reloaded.blob.liveMatchCheckpoint);
    check(`${kind}: yakalanmamış tarayıcı hatası yok`, errors.length === 0, errors.join(' | '));
    await browser.close(); browser = undefined;
  }
} catch (error) { failed++; console.error(error?.stack ?? error); }
finally { await browser?.close(); await server.close(); }
console.log(`\nLIVE-HEALTH: ${passed}/${passed + failed}`);
process.exit(failed ? 1 : 0);
