// Real Chromium + production screens/provider/engine: manual benches, world search and complete records.
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
const launchBrowser = () => chromium.launch({ ...(process.env.HM26_CHROMIUM ? { executablePath: process.env.HM26_CHROMIUM } : {}), headless: true, args: ['--no-sandbox'] });
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => { ok ? passed++ : failed++; console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
const model = (page) => page.evaluate(() => window.__rosterModel());
const ids = (locator, attr) => locator.evaluateAll((nodes, key) => nodes.map((node) => node.getAttribute(key)), attr);
const waitReady = (page) => page.waitForFunction(() => typeof window.__rosterModel === 'function');
const closeSheet = (page) => page.keyboard.press('Escape');

for (const width of [320, 390]) {
  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width, height: 820 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`${base}/tools/roster-league-fixture.html?scenario=history&theme=${width === 320 ? 'light' : 'dark'}`);
    await waitReady(page);
    const initial = await model(page);
    await page.getByRole('button', { name: 'Maç yedeklerini seç' }).click();
    const picker = page.getByTestId('match-bench-picker');
    const selected = picker.locator('[data-bench-choice][aria-pressed="true"]');
    const unselected = picker.locator('[data-bench-choice][aria-pressed="false"]');
    check(`${width}px: yedek seçimi mevcut motor kadrosuyla ve 9 sınırıyla açılır`, await selected.count() === 9 && await unselected.first().isDisabled() && (await picker.getByTestId('match-bench-count').innerText()) === '9/9');
    const removed = await selected.first().getAttribute('data-bench-choice');
    const added = await unselected.first().getAttribute('data-bench-choice');
    await selected.first().click();
    check(`${width}px: boşaltılan yedek yeri tamamlanmadan kaydedilmez`, await page.getByRole('button', { name: 'Yedekleri Kaydet' }).isDisabled() && await picker.locator(`[data-bench-choice="${added}"]`).isEnabled());
    await picker.locator(`[data-bench-choice="${added}"]`).click();
    await page.getByRole('button', { name: 'Yedekleri Kaydet' }).click();
    const after = await model(page);
    const snapshot = JSON.parse(await page.evaluate(() => window.__rosterSnapshot()));
    const chosen = snapshot.tactics[0].customBench;
    const liveBench = await page.evaluate(() => window.__rosterLiveBench());
    const quick = await page.evaluate(() => window.__rosterQuickCheck());
    check(`${width}px: seçilen dokuz farklı yedek canlı motor kadrosuna birebir gider`, chosen.length === 9 && new Set(chosen).size === 9 && chosen.includes(added) && !chosen.includes(removed) && JSON.stringify(chosen) === JSON.stringify(liveBench) && JSON.stringify(chosen) === JSON.stringify(after.matchBench));
    check(`${width}px: aynı seçim gerçek hızlı maç motoruna gider`, JSON.stringify(quick.bench) === JSON.stringify(chosen) && quick.sameScore && quick.samePlayerRows, JSON.stringify({ sameScore: quick.sameScore, samePlayerRows: quick.samePlayerRows }));
    let savedBench = false;
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline && !savedBench) {
      const save = await page.evaluate(() => window.__rosterRead());
      savedBench = JSON.stringify(save?.blob?.tactics?.[0]?.customBench) === JSON.stringify(chosen);
      if (!savedBench) await page.waitForTimeout(100);
    }
    check(`${width}px: seçilen yedekler gerçek IndexedDB kariyerine yazılır`, savedBench);
    await page.getByRole('button', { name: 'Hücum Planı', exact: true }).click();
    await page.getByRole('button', { name: 'Maç yedeklerini seç' }).click();
    await picker.locator('[data-bench-choice][aria-pressed="true"]').first().click();
    await picker.locator('[data-bench-choice][aria-pressed="false"]:not([disabled])').last().click();
    await page.getByRole('button', { name: 'Yedekleri Kaydet' }).click();
    await page.getByRole('button', { name: 'Ana Plan', exact: true }).click();
    const plans = JSON.parse(await page.evaluate(() => window.__rosterSnapshot())).tactics;
    check(`${width}px: taktik planlarının elle seçilmiş yedekleri birbirine karışmaz`, JSON.stringify(plans[0].customBench) === JSON.stringify(chosen) && JSON.stringify(plans[1].customBench) !== JSON.stringify(chosen));
    await page.locator(`[data-roster-id="${added}"]`).click();
    const compatible = page.locator('[data-slot-index][data-compat="1"]').first();
    const displaced = await compatible.getAttribute('data-lineup-id');
    await compatible.click();
    const swapped = await model(page);
    const savedAfterSwap = JSON.parse(await page.evaluate(() => window.__rosterSnapshot())).tactics[0];
    check(`${width}px: yedek ilk 11'e taşınınca çıkan oyuncu onun yedek yerini alır`, swapped.lineup.includes(added) && !swapped.matchBench.includes(added) && swapped.matchBench.includes(displaced) && savedAfterSwap.customBench.includes(displaced) && new Set([...swapped.lineup, ...swapped.matchBench]).size === 20);
    check(`${width}px: taktik ve yedek seçimi taşma yapmaz`, await noOverflow(page));

    await page.getByRole('button', { name: 'Test: Piyasa' }).click();
    await page.getByRole('button', { name: 'Oyuncu Ara', exact: true }).click();
    const world = await page.evaluate(() => window.__marketModel());
    const renderedAtStart = await page.locator('article').count();
    check(`${width}px: dünya havuzu gerçek kulüp kadrolarını kapsar, ilk sayfa sınırlı çizilir`, world.totalWorld > 1000 && (await page.locator('body').innerText()).includes(`${world.totalWorld + 12} oyuncu`) && renderedAtStart === 24);
    await page.getByRole('button', { name: /Daha fazla oyuncu göster/ }).click();
    check(`${width}px: büyük oyuncu listesi kademeli genişler`, await page.locator('article').count() === 48);
    const search = page.getByLabel('Oyuncu veya kulüp ara');
    await search.fill(world.target.name);
    const row = page.locator('article').filter({ hasText: world.target.name }).first();
    await row.waitFor();
    check(`${width}px: fırsat listesinde olmayan gerçek oyuncu adıyla bulunur`, await row.isVisible() && (await row.innerText()).includes('Kulüp kadrosundaki oyuncu'));
    await row.getByRole('button', { name: 'Kısa listeye ekle' }).click();
    check(`${width}px: dünya arama sonucu kısa listeye eklenir`, await row.getByRole('button', { name: 'Kısa listeden çıkar' }).isVisible());
    await row.getByRole('button', { name: `${world.target.name} karşılaştır` }).click();
    check(`${width}px: aynı oyuncu karşılaştırma masasına açılır`, (await page.getByTestId('comparison-player-1').getAttribute('data-player-id')) === world.target.id && await page.getByTestId('comparison-table').isVisible());
    await closeSheet(page);
    await row.getByRole('button', { name: 'Teklif', exact: true }).click();
    check(`${width}px: fırsat dışı oyuncu için gerçek transfer görüşmesi açılır`, await page.getByTestId('transfer-flow').isVisible() && (await page.getByTestId('transfer-flow').innerText()).includes(world.target.name));
    await closeSheet(page);
    await page.getByRole('button', { name: /Kısa Liste/ }).click();
    check(`${width}px: kısa liste oyuncuyu dünya aramasından sonra korur`, await page.locator('article').filter({ hasText: world.target.name }).isVisible());
    await page.getByRole('button', { name: 'Oyuncu Ara', exact: true }).click();
    await search.fill('');
    await page.getByRole('group', { name: 'Mevki filtresi' }).getByRole('button', { name: 'Kaleci', exact: true }).click();
    check(`${width}px: mevki filtresi çalışır`, (await page.locator('article').allInnerTexts()).every((text) => text.includes('Kaleci')));
    await page.getByRole('button', { name: /Filtreleri temizle/ }).click();
    await page.locator('[data-filter="free"]').click();
    check(`${width}px: serbest oyuncu filtresi dünya havuzunda çalışır`, (await page.locator('article').count()) > 0 && (await page.locator('article').allInnerTexts()).every((text) => text.includes('Bedelsiz')));
    check(`${width}px: dünya oyuncu araması taşma yapmaz`, await noOverflow(page));

    await page.getByRole('button', { name: 'Diğer', exact: true }).click();
    await page.getByRole('button', { name: 'Transfer Geçmişi', exact: true }).click();
    check(`${width}px: transfer geçmişi önce 40 mevcut kaydı özetler`, await page.getByTestId('transfer-history-row').count() === 40);
    await page.getByRole('button', { name: 'Transfer geçmişi: tümünü göster (55)' }).click();
    check(`${width}px: tüm 55 transfer kaydı erişilebilir`, await page.getByTestId('transfer-history-row').count() === 55 && await page.getByText('Tarihi Oyuncu 54', { exact: false }).isVisible());
    await page.getByRole('button', { name: 'Transfer geçmişi: daha az göster' }).click();
    check(`${width}px: transfer geçmişi tekrar daraltılır`, await page.getByTestId('transfer-history-row').count() === 40);

    await page.getByRole('button', { name: 'Test: Müsabaka' }).click();
    await page.getByRole('button', { name: 'Fikstür', exact: true }).click();
    const upcoming = page.getByTestId('upcoming-fixtures').getByTestId('competition-fixture');
    const played = page.getByTestId('played-fixtures').getByTestId('competition-fixture');
    check(`${width}px: fikstür özet sınırları 18 ve 30`, await upcoming.count() === 18 && await played.count() === 30);
    await page.getByRole('button', { name: /Gelecek maçlar: tümünü göster/ }).click();
    await page.getByRole('button', { name: /Maç sonuçları: tümünü göster/ }).click();
    check(`${width}px: ligin bütün mevcut gelecek ve oynanmış maçları açılır`, await upcoming.count() === initial.fixtures.filter((f) => !f.played).length && await played.count() === initial.fixtures.filter((f) => f.played).length);
    check(`${width}px: tüm fikstür kulüp adları mobilde görünür ve taşmaz`, (await upcoming.last().innerText()).includes(initial.fixtures.filter((f) => !f.played).at(-1).homeName) && await noOverflow(page));
    await page.getByRole('button', { name: 'Miras', exact: true }).click();
    const cupText = await page.locator('body').innerText();
    check(`${width}px: kupa grup tablosunda dört kulübün tam adı gösterilir`, initial.cupGroups.A.every((name) => cupText.includes(name)) && await noOverflow(page));
    await page.getByRole('button', { name: 'Kıtalar', exact: true }).click();
    const internationalText = await page.locator('body').innerText();
    check(`${width}px: kıta grup tablolarında tüm yerli/yabancı kulüplerin tam adı görünür`, Object.values(initial.internationalGroups).flat().every((name) => internationalText.includes(name)) && await noOverflow(page));
    check(`${width}px: kıta geçmişi özet görünümü altı kayıt`, await page.getByTestId('international-archive').locator(':scope > *').count() === 6);
    await page.getByRole('button', { name: 'Geçmiş sezonlar: tümünü göster (9)' }).click();
    check(`${width}px: kıta geçmişi dokuz mevcut sezona açılır`, await page.getByTestId('international-archive').locator(':scope > *').count() === 9);

    await page.getByRole('button', { name: 'Test: İstatistik' }).click();
    await page.getByText('Lig Analizi', { exact: true }).click();
    check(`${width}px: maç arşivi önce 10 rapor gösterir`, await page.getByTestId('archive-highlight-open').count() === 10);
    await page.getByRole('button', { name: 'Maç özetleri: tümünü göster (25)' }).click();
    check(`${width}px: kayıtlı 25 raporun tamamı ve kulüp dışı eski rapor gösterilir`, await page.getByTestId('archive-highlight-open').count() === 25 && (await page.getByTestId('archive-highlights-list').innerText()).includes('İstanbul Boğaz Atletik'));
    await page.getByTestId('archive-highlight-open').last().click();
    check(`${width}px: eski maç raporu açılır`, await page.getByText('Maç Özeti', { exact: false }).count() > 0 || (await page.locator('body').innerText()).includes('1. gün'));
    await closeSheet(page);
    check(`${width}px: arşivde mobil taşma ve yakalanmamış hata yok`, await noOverflow(page) && errors.length === 0, errors.join(' | '));
  } catch (error) { failed++; console.error(`❌ ${width}px senaryo: ${error?.stack ?? error}`); }
  await browser.close();
}

{
  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 320, height: 820 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  try {
    await page.goto(`${base}/tools/roster-league-fixture.html?scenario=bench-risk`); await waitReady(page);
    const [injured, suspended, tired] = await page.evaluate(() => window.__benchRiskIds);
    await page.getByRole('button', { name: 'Maç yedeklerini seç' }).click();
    const picker = page.getByTestId('match-bench-picker');
    check('Sakat, cezalı ve kondisyonu yetersiz yedekler seçilemez', await picker.locator(`[data-bench-choice="${injured}"]`).isDisabled() && await picker.locator(`[data-bench-choice="${suspended}"]`).isDisabled() && await picker.locator(`[data-bench-choice="${tired}"]`).isDisabled());
    await closeSheet(page);
    await page.evaluate((id) => window.__rosterSetRisk(id, true), injured);
    await page.waitForFunction((id) => JSON.parse(window.__rosterSnapshot()).riskPlayIds?.includes(id), injured);
    await page.getByRole('button', { name: 'Maç yedeklerini seç' }).click();
    const riskChoice = picker.locator(`[data-bench-choice="${injured}"]`);
    if (await riskChoice.getAttribute('aria-pressed') === 'true') await riskChoice.click();
    else await picker.locator('[data-bench-choice][aria-pressed="true"]').first().click();
    check('İğne onayı verilmiş sakat oyuncu seçilebilir, cezalı ve yorgun oyuncu seçilemez', await riskChoice.isEnabled() && (await riskChoice.innerText()).includes('İğne onaylı') && await picker.locator(`[data-bench-choice="${suspended}"]`).isDisabled() && await picker.locator(`[data-bench-choice="${tired}"]`).isDisabled());
    await riskChoice.click(); await page.getByRole('button', { name: 'Yedekleri Kaydet' }).click();
    check('İğne onaylı elle seçilen oyuncu gerçek canlı maç kulübesine gider', (await page.evaluate(() => window.__rosterLiveBench())).includes(injured));
  } catch (error) { failed++; console.error(`❌ Uygunluk senaryosu: ${error?.stack ?? error}`); }
  await browser.close();
}
await server.close();
console.log(`\n${passed}/${passed + failed} yeni özellik Chromium kontrolü geçti.`);
if (failed) process.exitCode = 1;
