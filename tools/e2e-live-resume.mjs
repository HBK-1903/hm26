// Real Chromium, IndexedDB, GameProvider, shell and deterministic match engine.
import { chromium } from 'playwright';
import { createServer as createNetServer } from 'node:net';
import { createServer as createViteServer } from 'vite';
import { readFileSync } from 'node:fs';

const probe = createNetServer();
await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const server = await createViteServer({ server: { host: '127.0.0.1', port, strictPort: true }, logLevel: 'silent' });
await server.listen();
const base = `http://127.0.0.1:${port}`;
const launch = () => chromium.launch({ ...(process.env.HM26_CHROMIUM ? { executablePath: process.env.HM26_CHROMIUM } : {}), headless: true, args: ['--no-sandbox'] });
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => { ok ? passed++ : failed++; console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
const cp = (page) => page.evaluate(() => window.__liveStore.snapshot().liveMatchCheckpoint);
const durable = async (page) => (await page.evaluate(() => window.__liveStore.read()))?.blob?.liveMatchCheckpoint;
const acknowledged = async (page) => {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    // waitForFunction treats an async predicate's Promise as truthy. Await the
    // actual IndexedDB read on the Node side and ensure the UI did not advance
    // while that read was in flight.
    const stable = await page.evaluate(async () => {
      const before = window.__liveStore?.snapshot().liveMatchCheckpoint;
      const saved = await window.__liveStore?.read();
      const after = window.__liveStore?.snapshot().liveMatchCheckpoint;
      const status = document.querySelector('[data-testid="live-checkpoint-status"]')?.textContent ?? '';
      return before && after && before.checksum === after.checksum && saved?.blob?.liveMatchCheckpoint?.checksum === after.checksum && status.includes('kaydedildi') ? saved.blob.liveMatchCheckpoint : null;
    });
    if (stable) return stable;
    await page.waitForTimeout(50);
  }
  throw new Error('Onaylanmış canlı maç kaydı zamanında oluşmadı.');
};
const initial = async (page) => {
  page.setDefaultTimeout(12000);
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto(`${base}/tools/live-resume-fixture.html`);
  await page.waitForFunction(() => !!window.__liveStore);
  const notice = page.getByRole('button', { name: 'Anladım' });
  if (await notice.count()) await notice.first().click();
};
const start = async (page) => {
  await page.getByRole('button', { name: /Maça Başla/ }).first().click();
  await page.getByRole('timer').waitFor();
  await page.getByRole('button', { name: 'Maçı duraklat' }).click();
  await acknowledged(page);
};
const reloadResume = async (page) => {
  await page.reload();
  await page.waitForFunction(() => !!window.__liveStore);
  await page.getByRole('button', { name: 'Maça Devam Et', exact: true }).click();
  await acknowledged(page);
};
const runUntil = async (page, target) => {
  const limit = Date.now() + 40000;
  while (Date.now() < limit) {
    const result = await page.waitForFunction((wanted) => {
      const dialogs = [...document.querySelectorAll('[role="dialog"]')].map((node) => node.querySelector('h2')?.textContent ?? '');
      if (dialogs.some((text) => text.includes('Devre Arası'))) return 'half';
      if (dialogs.some((text) => text.includes('Sakatlık Kararı'))) return 'injury';
      if (dialogs.some((text) => text.includes('VAR İncelemesi'))) return 'var';
      if (dialogs.some((text) => text.includes('Karar Anı'))) return 'card';
      if ([...document.querySelectorAll('button')].some((node) => node.textContent?.includes('Maç Sonu Röportajına Geç'))) return 'done';
      return false;
    }, target, { timeout: 40000, polling: 50 }).then((h) => h.jsonValue());
    if (result === target) return;
    if (result === 'half') {
      await page.getByRole('dialog', { name: /Devre Arası/ }).getByRole('button', { name: /Sessiz kal/ }).click();
    } else if (result === 'injury') {
      await page.getByRole('dialog', { name: 'Sakatlık Kararı' }).getByRole('button', { name: /Dönüşünü bekle/ }).click();
    } else if (result === 'var' || result === 'card') {
      await page.getByRole('dialog', { name: result === 'var' ? 'VAR İncelemesi' : 'Karar Anı' }).getByRole('button', { name: 'Devam Et', exact: true }).click();
    } else throw new Error(`Maç beklenenden erken tamamlandı: ${result}`);
  }
  throw new Error(`${target} beklenirken zaman doldu`);
};

// The complete flow uses a real running match and real UI interventions.
{
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 320, height: 820 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  try {
    await initial(page); await start(page);
    await page.getByRole('button', { name: '4 kat hız' }).click();
    await page.getByRole('button', { name: 'Kenar Talimatı' }).click();
    const touchline = page.getByRole('dialog', { name: 'Kenar Talimatı' });
    await touchline.getByRole('button', { name: 'Yüksek pres talimatı' }).click();
    await touchline.getByRole('button', { name: 'Hücum', exact: true }).click();
    await touchline.getByRole('button', { name: /Değişiklik ·/ }).click();
    const sub = page.getByRole('dialog', { name: 'Oyuncu Değişikliği' });
    await sub.getByRole('button', { name: /Akıllı öneri/ }).click();
    await sub.getByRole('button', { name: 'Onayla' }).click();
    if (await touchline.isVisible()) await touchline.getByRole('button', { name: 'Kapat', exact: true }).last().click();
    if (await page.getByRole('button', { name: 'Maçı duraklat' }).count()) await page.getByRole('button', { name: 'Maçı duraklat' }).click();
    const before = await acknowledged(page);
    const timerBefore = await page.getByRole('timer').innerText();
    const scoreboardBefore = await page.getByLabel('Sabit maç skorbordu').innerText();
    check('320px: kenar komutu, taktik ve oyuncu değişikliği gerçek motor günlüğüne kaydedilir', ['TOUCHLINE_SHOUT', 'TACTIC_CHANGE', 'SUB_REQUEST'].every((type) => before.commands.some((command) => command.type === type)), before.commands.map((command) => command.type).join(', '));
    check('320px: yeni canlı kayıt v5 JSON yedekten doğrulanarak geri okunur', (await page.evaluate(() => window.__liveStore.exportRoundTrip())).liveMatchCheckpoint?.checksum === before.checksum);
    await reloadResume(page);
    const after = await acknowledged(page);
    check('320px: yenileme sonrası duraklama, dakika, skor, komutlar ve motor durumu aynıdır', after.checksum === before.checksum && after.stateHash === before.stateHash && after.commandHash === before.commandHash && await page.getByRole('timer').innerText() === timerBefore && await page.getByLabel('Sabit maç skorbordu').innerText() === scoreboardBefore && await page.getByRole('button', { name: 'Maça devam et' }).isVisible());
    await page.locator('nav[aria-label="Ana gezinme"]').getByRole('button', { name: 'Kadro', exact: true }).click();
    check('Devam eden maç başka kariyer ekranına geçişi güvenle engeller', (await page.locator('body').innerText()).includes('Önce devam eden maçını tamamla') && await page.getByRole('timer').isVisible());
    await page.getByRole('button', { name: 'Maça devam et' }).click();
    await runUntil(page, 'half');
    const half = await acknowledged(page);
    check('Gerçek devre konuşması karar penceresi kayda yazılır', half.view.showTeamTalk && half.view.paused && half.view.teamTalkPromptShown);
    await reloadResume(page);
    check('Devre arası sayfa yenilendikten sonra aynı karar penceresiyle açılır', await page.getByRole('dialog', { name: /Devre Arası/ }).isVisible());
    await page.getByRole('dialog', { name: /Devre Arası/ }).getByRole('button', { name: /Hırs ver/ }).click();
    if (await page.getByRole('button', { name: 'Maçı duraklat' }).count()) await page.getByRole('button', { name: 'Maçı duraklat' }).click();
    const afterTalk = await acknowledged(page);
    check('Devre konuşması motor komutu olarak bir kez kaydedilir', afterTalk.commands.filter((command) => command.type === 'TEAM_TALK').length === 1);
    await reloadResume(page);
    check('Verilmiş devre kararı tekrar sorulmaz', !(await page.getByRole('dialog', { name: /Devre Arası/ }).count()) && (await cp(page)).commands.filter((command) => command.type === 'TEAM_TALK').length === 1);
    await page.getByRole('button', { name: 'Maça devam et' }).click();
    await runUntil(page, 'done');
    const finished = await acknowledged(page);
    const reportsBefore = (await page.evaluate(() => window.__liveStore.snapshot())).matchReports.length;
    await page.waitForTimeout(400);
    check('Son düdükte otomatik geçiş yok ve sonuç henüz işlenmez', finished.view.phase === 'live' && await page.getByRole('button', { name: /Maç Sonu Röportajına Geç/ }).isVisible() && (await page.evaluate(() => window.__liveStore.snapshot())).matchReports.length === reportsBefore);
    await reloadResume(page);
    check('Son düdük ekranı yenilendikten sonra incelemeye açık kalır', await page.getByRole('button', { name: /Maç Sonu Röportajına Geç/ }).isVisible());
    await page.getByRole('button', { name: /Maç Sonu Röportajına Geç/ }).click();
    const interview = await acknowledged(page);
    check('Röportaj yalnız kullanıcı düğmesiyle açılır ve kaydedilir', interview.view.phase === 'interview' && await page.getByTestId('post-match-interview').isVisible());
    await reloadResume(page);
    check('Röportaj sayfa yenilendikten sonra aynı aşamada açılır', await page.getByTestId('post-match-interview').isVisible());
    await page.getByTestId('interview-option-0').click();
    check('Seçilen cevap sahnede kalır; analiz otomatik açılmaz', await page.getByTestId('interview-answer').isVisible() && await page.getByTestId('post-match-interview').getAttribute('data-stage') === 'answer' && (await cp(page)).view.phase === 'interview');
    await page.getByTestId('interview-continue').click();
    const report = await acknowledged(page);
    check('Seçilen röportaj cevabı raporla birlikte kaydedilir', report.view.phase === 'report' && !!report.view.interviewChoice?.id);
    await reloadResume(page);
    check('Maç raporu ve seçilen röportaj yenilemeden sonra korunur', await page.getByRole('button', { name: 'Sonucu Kaydet — Ana Merkez' }).isVisible() && (await cp(page)).view.interviewChoice?.id === report.view.interviewChoice.id);
    await page.evaluate(() => {
      window.__savedIdbTransaction = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function (...args) {
        if (args[1] === 'readwrite') throw new DOMException('QA: kota dolu', 'QuotaExceededError');
        return window.__savedIdbTransaction.apply(this, args);
      };
    });
    await page.getByRole('button', { name: 'Sonucu Kaydet — Ana Merkez' }).click();
    await page.getByRole('alert').filter({ hasText: /Kariyer kaydedilemedi/ }).waitFor();
    const failedResult = await page.evaluate(() => window.__liveStore.read());
    check('Sonuç yazılamazsa diskte rapor aşamasındaki güvenli maç kaydı ve eski kariyer kalır', failedResult.blob.liveMatchCheckpoint?.checksum === report.checksum && failedResult.blob.matchReports.length === reportsBefore);
    await page.getByRole('button', { name: 'Sonucu Kaydet — Ana Merkez' }).click();
    check('Başarısız sonuç kaydını tekrar denemek etkileri bellekte çoğaltmaz', (await page.evaluate(() => window.__liveStore.snapshot())).matchReports.length === reportsBefore + 1 && (await durable(page)).checksum === report.checksum);
    await page.evaluate(() => { IDBDatabase.prototype.transaction = window.__savedIdbTransaction; });
    await page.getByRole('button', { name: 'Sonucu Kaydet — Ana Merkez' }).click();
    let saved;
    const saveDeadline = Date.now() + 12000;
    while (Date.now() < saveDeadline) {
      saved = await page.evaluate(() => window.__liveStore.read());
      if (!saved?.blob.liveMatchCheckpoint && saved?.blob.matchReports.length === reportsBefore + 1) break;
      await page.waitForTimeout(100);
    }
    check('Sonuç, röportaj etkisi ve canlı kayıt silinmesi aynı gerçek yuvada işlenir', !!saved && !saved.blob.liveMatchCheckpoint && saved.blob.matchReports.length === reportsBefore + 1 && saved.blob.inbox.filter((message) => message.title === 'Maç sonu röportajı').length === 1);
    const matchReport = JSON.stringify(saved.blob.matchReports);
    const stats = JSON.stringify(saved.blob.playerStats);
    await page.reload(); await page.waitForFunction(() => !!window.__liveStore);
    const reloaded = await page.evaluate(() => window.__liveStore.read());
    check('İkinci yüklemede maç sonucu ve oyuncu istatistikleri yinelenmez', !reloaded.blob.liveMatchCheckpoint && JSON.stringify(reloaded.blob.matchReports) === matchReport && JSON.stringify(reloaded.blob.playerStats) === stats);
    check('Canlı maçın tüm aşamalarında tarayıcı hatası ve yatay taşma yok', errors.length === 0 && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), errors.join(' | '));
  } catch (error) { failed++; console.error(`❌ Canlı maç akışı: ${error?.stack ?? error}`); }
  await browser.close();
}

// Actual engine events are searched with deterministic seeds; only the rare
// decision point is seeded, not the resulting match state or modal behavior.
for (const kind of ['injury', 'var']) {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  try {
    await initial(page);
    const seeded = await page.evaluate((eventKind) => window.__liveStore.seedDecision(eventKind), kind);
    await page.getByRole('button', { name: 'Maça Devam Et', exact: true }).click();
    await acknowledged(page);
    const title = kind === 'injury' ? 'Sakatlık Kararı' : 'VAR İncelemesi';
    check(`Gerçek motor ${kind} kararı açılır`, await page.getByRole('dialog', { name: title }).isVisible(), `seed=${seeded.seed}, adım=${seeded.step}`);
    await reloadResume(page);
    check(`Gerçek motor ${kind} kararı yenilemede kaybolmaz`, await page.getByRole('dialog', { name: title }).isVisible());
    if (kind === 'injury') {
      await page.getByRole('dialog', { name: title }).getByRole('button', { name: /Dönüşünü bekle/ }).click();
      const after = await acknowledged(page);
      check('Sakatlık tedavi kararı yeniden oynatılabilir motor komutu olarak kaydedilir', after.commands.some((command) => command.type === 'WAIT_INJURED') && !after.view.decision);
      await reloadResume(page);
      check('Sakatlık tedavisi sonrası yenilemede karar ikinci kez açılmaz', !(await page.getByRole('dialog', { name: title }).count()) && (await cp(page)).commands.some((command) => command.type === 'WAIT_INJURED'));
    } else {
      await page.getByRole('dialog', { name: title }).getByRole('button', { name: 'Devam Et', exact: true }).click();
      if (await page.getByRole('button', { name: 'Maçı duraklat' }).count()) await page.getByRole('button', { name: 'Maçı duraklat' }).click();
      const after = await acknowledged(page);
      await reloadResume(page);
      check('VAR kararı kapatıldıktan sonra tekrar açılmaz; motor çıktısı korunur', !(await page.getByRole('dialog', { name: title }).count()) && (await cp(page)).stateHash === after.stateHash);
    }
  } catch (error) { failed++; console.error(`❌ ${kind} senaryosu: ${error?.stack ?? error}`); }
  await browser.close();
}

// Failed writes stop the match; neither a retry nor discarding may silently
// replace the last committed IndexedDB snapshot.
{
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  try {
    await initial(page); await start(page);
    const lastSafe = await acknowledged(page);
    await page.evaluate(() => {
      window.__savedIdbTransaction = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function (...args) {
        if (args[1] === 'readwrite') throw new DOMException('QA: kota dolu', 'QuotaExceededError');
        return window.__savedIdbTransaction.apply(this, args);
      };
    });
    await page.getByRole('button', { name: '1 kat hız' }).click();
    const status = page.getByTestId('live-checkpoint-status');
    await status.getByText(/kaydedilemedi/).waitFor();
    check('IndexedDB yazma hatasında son onaylı maç kaydı korunur', (await durable(page)).checksum === lastSafe.checksum && (await cp(page)).view.speed === 'x1');
    await page.getByRole('button', { name: 'Maça devam et' }).click();
    await status.getByText(/kaydedilemedi/).waitFor();
    const frozenStep = (await cp(page)).step;
    await page.waitForTimeout(350);
    check('Kayıt hatasında devam düğmesine basılsa bile motor ilerlemez', (await cp(page)).step === frozenStep && (await durable(page)).checksum === lastSafe.checksum);
    await page.getByRole('button', { name: 'Maçı duraklat' }).click();
    await status.getByText(/kaydedilemedi/).waitFor();
    await page.evaluate(() => { IDBDatabase.prototype.transaction = window.__savedIdbTransaction; });
    await status.getByRole('button', { name: 'Tekrar dene' }).click();
    const retried = await acknowledged(page);
    check('Depolama düzelince tekrar deneme güncel durumu gerçekten kaydeder', retried.view.speed === 'x1' && retried.view.paused && retried.checksum !== lastSafe.checksum);
    await page.reload(); await page.waitForFunction(() => !!window.__liveStore);
    await page.evaluate(() => {
      window.__savedIdbTransaction = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function (...args) {
        if (args[1] === 'readwrite') throw new DOMException('QA: kota dolu', 'QuotaExceededError');
        return window.__savedIdbTransaction.apply(this, args);
      };
    });
    await page.getByRole('button', { name: 'Maç kaydını sil ve hazırlığa dön' }).click();
    await page.getByText(/Maç kaydı silinemedi/).first().waitFor();
    check('Maçı silme işlemi yazılamazsa son güvenli kayıt yerinde kalır', (await durable(page)).checksum === retried.checksum && await page.getByRole('button', { name: 'Maça Devam Et', exact: true }).isVisible());
    await page.evaluate(() => { IDBDatabase.prototype.transaction = window.__savedIdbTransaction; });
    await page.getByRole('button', { name: 'Maç kaydını sil ve hazırlığa dön' }).click();
    await page.getByRole('button', { name: /Maça Başla/ }).first().waitFor();
    check('Onaylanan silme yalnızca canlı maç ilerlemesini kaldırır', !(await durable(page)) && !(await page.evaluate(() => window.__liveStore.snapshot().liveMatchCheckpoint)));
  } catch (error) { failed++; console.error(`❌ Yazma hatası/silme senaryosu: ${error?.stack ?? error}`); }
  await browser.close();
}

// Download and re-import the actual UI backup while a live match is pending.
{
  const browser = await launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage();
  const goBackup = async () => {
    await page.locator('nav[aria-label="Ana gezinme"]').getByRole('button', { name: 'Daha' }).click();
    await page.getByRole('dialog', { name: 'Kulüp ve kariyer' }).getByRole('button', { name: 'Yedekleme', exact: true }).click();
  };
  try {
    await initial(page); await start(page);
    const savedA = await acknowledged(page);
    await goBackup();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Dışa Aktar', exact: true }).click();
    const backup = JSON.parse(readFileSync(await (await downloadPromise).path(), 'utf8'));
    check('Gerçek yedek dosyası devam eden maçın motorunu ve kararlarını içerir', backup.version === 5 && backup.blob.liveMatchCheckpoint?.checksum === savedA.checksum);
    await page.getByRole('button', { name: /Kayıtlı maça dön/ }).click();
    await page.getByRole('button', { name: 'Maça Devam Et', exact: true }).click(); await acknowledged(page);
    await page.getByRole('button', { name: '1 kat hız' }).click();
    const savedB = await acknowledged(page);
    check('Yedekten sonra yapılan canlı maç ayarı ayrı bir güvenli noktadır', savedB.checksum !== savedA.checksum);
    await goBackup();
    const forged = await page.evaluate((file) => window.__liveStore.corruptCheckpointHash(file), structuredClone(backup));
    await page.locator('input[type="file"]').setInputFiles({ name: 'bozuk-canli-yedek.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(forged)) });
    await page.getByRole('alert').filter({ hasText: /Yedek dosyası eksik veya bozuk/ }).waitFor();
    check('Checksum yeniden hesaplanmış ama motoru bozuk yedek mevcut kaydın üzerine yazılamaz', (await durable(page)).checksum === savedB.checksum && await page.getByRole('dialog', { name: 'Yedeği yükle?' }).count() === 0);
    await page.locator('input[type="file"]').setInputFiles({ name: 'canli-yedek.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    const dialog = page.getByRole('dialog', { name: 'Yedeği yükle?' });
    await dialog.getByRole('button', { name: 'Evet, Yedeği Yükle' }).click();
    await page.getByRole('dialog', { name: 'Yedek hazır' }).getByRole('button', { name: 'Yedeği Aç' }).click();
    await page.getByRole('button', { name: /Kayıtlı maça dön/ }).click();
    await page.getByRole('button', { name: 'Maça Devam Et', exact: true }).click();
    const restored = await acknowledged(page);
    check('İndirilen yedek içe aktarılıp açıldığında eski maç noktası eksiksiz devam eder', restored.checksum === savedA.checksum && restored.stateHash === savedA.stateHash && restored.view.paused);
  } catch (error) { failed++; console.error(`❌ Canlı maç yedek/içe aktarma: ${error?.stack ?? error}`); }
  await browser.close();
}

// Both pages use the same IndexedDB; the stale tab must not replace the newer
// match revision, even when it tries to resume or retry a checkpoint write.
{
  const browser = await launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const first = await context.newPage();
  try {
    await initial(first); await start(first);
    const second = await context.newPage();
    second.on('dialog', (dialog) => dialog.accept());
    await first.evaluate(() => window.__liveStore.save()); // settle page visibility save before the second tab reads
    await second.goto(`${base}/tools/live-resume-fixture.html`); await second.waitForFunction(() => !!window.__liveStore);
    await second.getByRole('button', { name: 'Maça Devam Et', exact: true }).waitFor();
    await first.getByRole('button', { name: '1 kat hız' }).click();
    const newer = await acknowledged(first);
    await second.getByRole('button', { name: 'Maça Devam Et', exact: true }).click();
    const staleStatus = second.getByTestId('live-checkpoint-status');
    await staleStatus.getByText(/kaydedilemedi/).waitFor();
    check('Bayat ikinci sekmenin canlı kayıt yazısı çakışmayı algılar', await second.getByText(/Bu yuva başka bir sekmede değişti/).isVisible() && (await durable(second)).checksum === newer.checksum);
    await staleStatus.getByRole('button', { name: 'Tekrar dene' }).click();
    await staleStatus.getByText(/kaydedilemedi/).waitFor();
    check('Bayat sekme tekrar denese de yeni maç kaydını ezemez', (await durable(first)).checksum === newer.checksum);
  } catch (error) { failed++; console.error(`❌ İki sekme çakışması: ${error?.stack ?? error}`); }
  await browser.close();
}

await server.close();
console.log(`\n${passed}/${passed + failed} canlı maç kurtarma Chromium kontrolü geçti.`);
if (failed) process.exitCode = 1;
