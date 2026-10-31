// Real Chromium: full roster, XI/bench boundaries, league names, ratings and mobile geometry.
import { chromium } from 'playwright';
import { createServer as createNetServer } from 'node:net';
import { createServer as createViteServer } from 'vite';
import { mkdir } from 'node:fs/promises';

const probe = createNetServer();
await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
let server, passed = 0, failed = 0;
const check = (name, condition, detail = '') => { condition ? passed++ : failed++; console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
const sameSet = (a, b) => a.length === b.length && new Set(a).size === a.length && a.every((x) => b.includes(x));
const model = (page) => page.evaluate(() => window.__rosterModel());
const rosterDialog = (page) => page.getByRole('dialog', { name: /İlk 11 dışındaki oyuncular/ });
const openRoster = async (page) => { await page.getByRole('button', { name: /Tümünü gör \(\d+\)/ }).click(); const dialog = rosterDialog(page); await dialog.waitFor(); return dialog; };
const finish = async (dialog) => { await dialog.getByRole('button', { name: 'Kapat', exact: true }).click(); };

try {
  server = await createViteServer({ server: { host: '127.0.0.1', port, strictPort: true }, logLevel: 'silent' });
  await server.listen();
  await mkdir('_shots/roster-league', { recursive: true });
  const executablePath = process.env.HM26_CHROMIUM;
  const launchOptions = executablePath ? { executablePath, args: ['--no-sandbox', '--single-process', '--no-zygote', '--disable-dev-shm-usage'] } : {};
  for (const [width, theme] of [[320, 'light'], [320, 'dark'], [390, 'light'], [390, 'dark']]) {
    const browser = await chromium.launch(launchOptions);
    try {
      const height = width === 320 ? 720 : 844;
      const page = await browser.newPage({ viewport: { width, height }, locale: 'tr' });
      page.setDefaultTimeout(8000);
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const prefix = `${width}px/${theme}`;
      const visit = async (scenario) => {
        await page.goto(`http://127.0.0.1:${port}/tools/roster-league-fixture.html?scenario=${scenario}&theme=${theme}`);
        await page.getByRole('button', { name: 'Test: Müsabaka', exact: true }).waitFor();
        await page.locator('[data-slot-index]').first().waitFor();
      };
      await visit('normal');
      let data = await model(page);
      const initialXI = data.lineup.filter(Boolean);
      let reserveIds = data.squad.map((p) => p.id).filter((id) => !initialXI.includes(id));
      const strip = page.locator('button[data-roster-id]');
      const stripIds = await strip.evaluateAll((els) => els.map((el) => el.dataset.rosterId));
      check(`${prefix}: 24 kişiden ilk 11 dışında kalan 13 oyuncu eksiksiz`, data.squad.length === 24 && initialXI.length === 11 && reserveIds.length === 13 && sameSet(stripIds, reserveIds));
      check(`${prefix}: gerçek maç kadrosu en fazla 9 yedek ve ilk 11 ile ayrık`, data.matchBench.length === 9 && data.matchBench.every((id) => reserveIds.includes(id)) && new Set(data.matchBench).size === 9);
      check(`${prefix}: görünür sayaç ve maç kadrosu sınırı anlaşılır`, await page.getByRole('button', { name: 'Tümünü gör (13)' }).isVisible() && await page.getByText(/maç kadrosuna en fazla 9 yedek/i).count() === 1);
      let dialog = await openRoster(page);
      let modalIds = await dialog.locator('[data-roster-list-id]').evaluateAll((els) => els.map((el) => el.dataset.rosterListId));
      check(`${prefix}: tam liste 13 oyuncuyu tekrarsız ve tam adlarıyla gösterir`, sameSet(modalIds, reserveIds) && (await dialog.locator('[data-roster-list-id]').allTextContents()).every((text, i) => text.includes(data.squad.find((p) => p.id === modalIds[i]).name)));
      const panel = dialog.locator('.overflow-y-auto');
      const scrollDimensions = await panel.evaluate((el) => ({ client: el.clientHeight, scroll: el.scrollHeight }));
      await dialog.locator('[data-roster-list-id]').last().scrollIntoViewIfNeeded();
      const lastBox = await dialog.locator('[data-roster-list-id]').last().boundingBox();
      const closeBox = await dialog.getByRole('button', { name: 'Kapat', exact: true }).boundingBox();
      check(`${prefix}: son oyuncu kaydırılarak ve kapatma düğmesi dokunarak erişilir`, scrollDimensions.scroll > scrollDimensions.client && lastBox.y >= 0 && lastBox.y + lastBox.height <= height + 1 && lastBox.height >= 44 && closeBox.height >= 44);
      await page.screenshot({ path: `_shots/roster-league/roster-${width}-${theme}.png` });
      await page.keyboard.press('Tab');
      check(`${prefix}: tam liste klavye odağını içeride tutar`, await dialog.evaluate((el) => el.contains(document.activeElement)));
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
      await page.waitForTimeout(50);
      check(`${prefix}: Escape kapatır ve odağı tümünü gör düğmesine döndürür`, await page.getByRole('button', { name: 'Tümünü gör (13)' }).evaluate((el) => document.activeElement === el));

      dialog = await openRoster(page);
      const distantId = (await dialog.locator('[data-roster-list-id]').last().getAttribute('data-roster-list-id'));
      await dialog.locator(`[data-roster-list-id="${distantId}"]`).click();
      check(`${prefix}: son sıradaki oyuncu önce seçilebilir ve liste kapanır`, await dialog.count() === 0 && await page.locator(`[data-roster-id="${distantId}"][data-benchpick="true"]`).count() === 1);
      const compat = page.locator('[data-slot-index][data-compat="1"]');
      check(`${prefix}: seçilen yedeğe uyumlu saha hedefi gösterilir`, await compat.count() > 0);
      await compat.first().click();
      data = await model(page);
      const snapshot = JSON.parse(await page.evaluate(() => window.__rosterSnapshot()));
      check(`${prefix}: seçilen oyuncu gerçek maçın ilk 11'ine girer ve kaydedilir`, data.lineup.includes(distantId) && snapshot.tactics[0].customLineup.includes(distantId) && !data.matchBench.includes(distantId) && new Set(data.lineup).size === 11);
      dialog = await openRoster(page);
      modalIds = await dialog.locator('[data-roster-list-id]').evaluateAll((els) => els.map((el) => el.dataset.rosterListId));
      const displaced = initialXI.filter((id) => !data.lineup.includes(id));
      check(`${prefix}: çıkan oyuncu listeye döner, kayıp veya mükerrer yok`, displaced.length === 1 && modalIds.includes(displaced[0]) && modalIds.length === 13 && new Set(modalIds).size === 13);
      await finish(dialog);

      await page.getByRole('button', { name: 'Otomatik 11', exact: true }).click();
      await page.locator('[data-slot-index="0"]').click();
      dialog = await openRoster(page);
      data = await model(page);
      const wrong = data.squad.find((p) => p.group !== 'GK' && !data.lineup.includes(p.id));
      await dialog.locator(`[data-roster-list-id="${wrong.id}"]`).click();
      check(`${prefix}: mevki dışı seçimde açıklama ve ikinci onay istenir`, await dialog.getByRole('alert').filter({ hasText: /mevki dışı/ }).isVisible() && (await model(page)).lineup[0] !== wrong.id);
      await dialog.locator(`[data-roster-list-id="${wrong.id}"]`).click();
      data = await model(page);
      check(`${prefix}: ikinci dokunuşla saha-önce akışı ve benzersiz ilk 11 çalışır`, await dialog.count() === 0 && data.lineup[0] === wrong.id && new Set(data.lineup).size === 11);
      await page.getByRole('button', { name: 'Otomatik 11', exact: true }).click();
      await page.locator('[data-slot-index="1"]').click();
      dialog = await openRoster(page);
      const suitable = dialog.locator('[data-roster-compat="1"]');
      const suitableCount = await suitable.count();
      const suitableId = suitableCount ? await suitable.last().getAttribute('data-roster-list-id') : '';
      if (suitableCount) await suitable.last().click();
      check(`${prefix}: saha-önce uyumlu oyuncu tek dokunuşla gerçek ilk 11'e girer`, suitableCount > 0 && (await model(page)).lineup[1] === suitableId && await dialog.count() === 0);

      await page.getByRole('button', { name: '4-4-2', exact: true }).click();
      data = await model(page);
      check(`${prefix}: formasyon değişince tüm oyuncular erişilebilir kalır`, data.formation === '4-4-2' && await strip.count() === 13 && new Set(data.lineup).size === 11);

      await page.getByRole('button', { name: 'Test: Müsabaka', exact: true }).click();
      const nav = await page.getByRole('group', { name: 'Müsabaka bölümleri' }).locator('button').evaluateAll((buttons) => buttons.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, h: r.height, fits: el.scrollWidth <= el.clientWidth + 1 };
      }));
      const separated = nav.every((a, i) => nav.every((b, j) => i === j || a.right <= b.x + 1 || b.right <= a.x + 1 || a.bottom <= b.y + 1 || b.bottom <= a.y + 1));
      check(`${prefix}: altı müsabaka sekmesi üst üste binmez ve dokunulabilir`, nav.length === 6 && nav.every((r) => r.h >= 44 && r.fits) && separated);
      for (const [league, label] of [['gecit', 'Geçit Ulusal'], ['zirve', 'Miras Zirve'], ['kok', 'Kök Bölge']]) {
        await page.getByRole('button', { name: label, exact: true }).click();
        const entries = page.locator('ol[aria-label$="puan tablosu"] > li');
        const actual = await entries.evaluateAll((els) => els.map((el) => ({
          id: el.dataset.leagueClub, name: el.querySelector('[data-club-name]')?.textContent?.trim(),
          nameFit: (() => { const node = el.querySelector('[data-club-name]'); return node && node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1; })(),
          rowFit: el.scrollWidth <= el.clientWidth + 1,
          labels: [...el.querySelectorAll('[aria-label]')].map((node) => node.getAttribute('aria-label')),
        })));
        const expected = data.table[league];
        check(`${prefix}: ${label} sırası, tam kulüp adı ve kısaltması doğru`, actual.length === expected.length && actual.every((row, i) => row.id === expected[i].clubId && row.name === `${expected[i].name} (${expected[i].short})`));
        check(`${prefix}: ${label} adları ve istatistik satırları kırpılmadan sığar`, actual.every((row) => row.nameFit && row.rowFit));
        check(`${prefix}: ${label} O/G/B/M/AV, puan ve form verisi korunur`, actual.every((row, i) => {
          const r = expected[i], diff = r.gf - r.ga, goalDiff = diff > 0 ? `+${diff}` : `${diff}`;
          return [`Oynanan: ${r.p}`, `Galibiyet: ${r.w}`, `Beraberlik: ${r.d}`, `Mağlubiyet: ${r.l}`, `Averaj: ${goalDiff}`, `${r.pts} puan`].every((label) => row.labels.includes(label)) && row.labels.some((label) => label.startsWith('Son 5 maç') || label === 'Henüz form verisi yok');
        }) && actual.some((row) => row.labels.some((label) => label.startsWith('Son 5 maç'))));
        if (league === 'gecit') await page.screenshot({ path: `_shots/roster-league/league-${width}-${theme}.png` });
      }
      const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      check(`${prefix}: sayfa yatay taşma oluşturmuyor`, !horizontalOverflow);

      await visit('stale');
      data = await model(page);
      const boardIds = await page.locator('[data-slot-index][data-lineup-id]').evaluateAll((els) => els.map((el) => el.dataset.lineupId));
      reserveIds = data.squad.map((p) => p.id).filter((id) => !data.lineup.includes(id));
      dialog = await openRoster(page);
      modalIds = await dialog.locator('[data-roster-list-id]').evaluateAll((els) => els.map((el) => el.dataset.rosterListId));
      check(`${prefix}: eski/çift/satılmış kimlikler gerçek motor 11'iyle düzeltilir`, boardIds.length === 11 && sameSet(boardIds, data.lineup) && !boardIds.includes('sold-player-not-in-squad') && sameSet(modalIds, reserveIds) && modalIds.length === 13);
      await finish(dialog);
      await visit('duplicate');
      data = await model(page);
      dialog = await openRoster(page);
      modalIds = await dialog.locator('[data-roster-list-id]').evaluateAll((els) => els.map((el) => el.dataset.rosterListId));
      check(`${prefix}: eski kayıttaki çift oyuncu taktik listesinde ve maç yedeğinde tekrarlanmaz`, data.squad.length === 25 && new Set(data.squad.map((p) => p.id)).size === 24 && modalIds.length === 13 && new Set(modalIds).size === 13 && data.matchBench.length === 9 && new Set(data.matchBench).size === 9 && data.matchBench.every((id) => !data.lineup.includes(id)));
      await finish(dialog);

      await visit('unavailable');
      dialog = await openRoster(page);
      const blockedIds = await page.evaluate(() => window.__injuredIds);
      const initial = JSON.stringify((await model(page)).lineup);
      await dialog.locator(`[data-roster-list-id="${blockedIds[0]}"]`).click();
      check(`${prefix}: sakat oyuncu görülür ama onaysız oynatılamaz`, await dialog.getByRole('alert').filter({ hasText: /sakat.*iğne onayı/i }).isVisible() && JSON.stringify((await model(page)).lineup) === initial);
      await dialog.locator(`[data-roster-list-id="${blockedIds[1]}"]`).click();
      check(`${prefix}: cezalı oyuncu görülür ama oynatılamaz`, await dialog.getByRole('alert').filter({ hasText: /cezalı/i }).isVisible() && JSON.stringify((await model(page)).lineup) === initial);
      await finish(dialog);
      await visit('risk');
      dialog = await openRoster(page);
      const approvedId = (await page.evaluate(() => window.__injuredIds))[0];
      const approved = dialog.locator(`[data-roster-list-id="${approvedId}"]`);
      check(`${prefix}: iğne onayı olan sakat oyuncu açıkça işaretlenir`, (await approved.innerText()).includes('İğne onaylı'));
      await approved.click();
      const approvedTargets = page.locator('[data-slot-index][data-compat="1"]');
      if (await approvedTargets.count()) await approvedTargets.first().click();
      check(`${prefix}: iğne onaylı oyuncu gerçek maçın ilk 11'ine alınabilir`, (await model(page)).lineup.includes(approvedId));

      await visit('ratings');
      data = await model(page);
      const ratingId = await page.evaluate(() => window.__ratingPlayer);
      const playerName = data.squad.find((p) => p.id === ratingId).name;
      await page.getByRole('button', { name: 'Test: İstatistik', exact: true }).click();
      check(`${prefix}: 12 toplam ama 2 puanlı maç, min 3 reyting sıralamasına girmez`, await page.getByText('⭐ Maç Puanı (min. 3 maç)', { exact: true }).count() === 0);
      await page.getByRole('button', { name: 'Test: Kadro', exact: true }).click();
      await page.getByRole('textbox', { name: 'Kadroda oyuncu ara' }).fill(playerName);
      await page.getByRole('button').filter({ hasText: playerName }).first().click();
      await page.getByRole('button', { name: 'Tam Profili Aç', exact: true }).click();
      const profile = page.getByRole('dialog', { name: `${playerName} tam profili` });
      const season = profile.getByText('Bu Sezon', { exact: true }).locator('..');
      check(`${prefix}: oyuncu profilinde 12 maç ve doğru 7.0 ortalama gösterilir`, (await season.innerText()).includes('12') && (await season.innerText()).includes('7.0') && !(await season.innerText()).includes('1.2'));
      await visit('ratings3');
      await page.getByRole('button', { name: 'Test: İstatistik', exact: true }).click();
      check(`${prefix}: üçüncü puanlı maç reyting sıralamasını açar ve 7 gösterir`, await page.getByText('⭐ Maç Puanı (min. 3 maç)', { exact: true }).count() === 1 && await page.getByText(/3 puanlı maç/).count() === 1);
      await page.getByRole('button', { name: 'Test: Müsabaka', exact: true }).click();
      await page.getByRole('button', { name: 'Krallıklar', exact: true }).click();
      const ratingCard = page.getByText('Ortalama Reyting (min 3 maç)', { exact: true }).locator('..').locator('..');
      check(`${prefix}: lig reytingi yalnız puanlı maçlardan 7.0 hesaplanır`, (await ratingCard.innerText()).includes('7.0') && !(await ratingCard.innerText()).includes('1.8'));
      check(`${prefix}: tarayıcıda çalışma zamanı hatası yok`, errors.length === 0, errors.slice(0, 3).join(' | '));
    } finally { await browser.close(); }
  }
} catch (error) { failed++; console.error('FATAL:', error); }
finally { if (server) await server.close(); }
console.log(`\n${passed}/${passed + failed} kadro/lig Chromium kontrolü geçti.`);
if (failed) process.exitCode = 1;
