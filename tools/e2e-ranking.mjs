// Real Chromium regression for complete statistics and league-analysis rankings.
// Synthetic inputs exercise the real GameProvider and screens, not production saves.
import { chromium } from 'playwright';
import { createServer as createNetServer } from 'node:net';
import { createServer as createViteServer } from 'vite';

const probe = createNetServer();
await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
let server, passed = 0, failed = 0;
const check = (name, condition, detail = '') => {
  condition ? passed++ : failed++;
  console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`);
};
const equalRows = (texts, expected) => texts.length === expected.length && texts.every((text, i) => text.includes(expected[i]));
const button = (page, title) => page.getByRole('button', { name: `${title} sıralamasının tümünü gör`, exact: true });
const dialogFor = (page, title) => page.getByRole('dialog', { name: `${title} · Tüm sıralama`, exact: true });
const previewRows = (page, title) => button(page, title).locator('..').locator('ol > li');
async function open(page, title) {
  await button(page, title).click();
  const dialog = dialogFor(page, title);
  await dialog.waitFor({ state: 'visible' });
  return dialog;
}
async function close(dialog) { await dialog.getByRole('button', { name: 'Kapat', exact: true }).click(); }
async function verifyRanking(page, prefix, title, expected) {
  const dialog = await open(page, title);
  const texts = await dialog.locator('ol > li').allTextContents();
  check(`${prefix}: ${title} tam ve doğru sırada`, equalRows(texts, expected), `${texts.length}/${expected.length}`);
  await close(dialog);
}

try {
  server = await createViteServer({ server: { host: '127.0.0.1', port, strictPort: true }, logLevel: 'silent' });
  await server.listen();
  const executablePath = process.env.HM26_CHROMIUM;
  const launchOptions = executablePath ? { executablePath, args: ['--no-sandbox', '--single-process', '--no-zygote', '--disable-dev-shm-usage'] } : {};
  for (const [width, theme] of [[320, 'light'], [390, 'dark']]) {
    const browser = await chromium.launch(launchOptions);
    try {
      const page = await browser.newPage({ viewport: { width, height: width === 320 ? 720 : 844 }, locale: 'tr' });
      page.setDefaultTimeout(8000);
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const visit = async (scenario) => {
        await page.goto(`http://127.0.0.1:${port}/tools/ranking-fixture.html?scenario=${scenario}&theme=${theme}`);
        await page.getByRole('button', { name: 'Test: Müsabakalar' }).waitFor();
        return page.evaluate(() => window.__rankingFixture);
      };
      const expected = await visit('full');
      const originalSnapshot = await page.evaluate(() => window.__rankingSnapshot());
      const prefix = `${width}px/${theme}`;
      const goalTitle = '⚽ Gol Kralı';
      const goalButton = button(page, goalTitle);
      const preview = await previewRows(page, goalTitle).allTextContents();
      check(`${prefix}: gol önizlemesi ilk 10 kayıtla sınırlı ve doğru`, equalRows(preview, expected.statsGoals.slice(0, 10)) && expected.statsGoals.length > 15);
      const previewFits = await goalButton.evaluate((el) => {
        const card = el.parentElement.parentElement;
        return card.scrollHeight <= card.clientHeight + 1;
      });
      await previewRows(page, goalTitle).last().scrollIntoViewIfNeeded();
      const previewLast = await previewRows(page, goalTitle).last().boundingBox();
      check(`${prefix}: önizlemenin son satırı kırpılmadan görülebilir`, previewFits && previewLast.y >= 0 && previewLast.y + previewLast.height <= (width === 320 ? 720 : 844) + 1);
      check(`${prefix}: açık tümünü gör çağrısı ve dokunma alanı`, (await goalButton.innerText()).includes(`(${expected.statsGoals.length})`) && (await goalButton.boundingBox()).height >= 44);
      const goalDialog = await open(page, goalTitle);
      const goalRows = goalDialog.locator('ol > li');
      check(`${prefix}: 15. sıra ötesi ve eski/ayrılmış oyuncu dahil`, equalRows(await goalRows.allTextContents(), expected.statsGoals) && expected.statsGoals.at(-1) === 'Oyuncu #lega');
      check(`${prefix}: gol eşitliğinde istatistik maç sayısı kuralı korunur`, expected.statsGoals[9] === expected.goalTie[1] && expected.statsGoals[10] === expected.goalTie[0]);
      const longNameFits = await goalRows.first().locator('.font-semibold').evaluate((el) => ({
        wraps: el.clientHeight > parseFloat(getComputedStyle(el).lineHeight) * 1.5,
        fits: el.scrollWidth <= el.clientWidth + 1,
      }));
      check(`${prefix}: uzun oyuncu adı ayrıntıda kesilmeden sarılır`, longNameFits.wraps && longNameFits.fits);
      const scrollArea = goalDialog.locator('.overflow-y-auto');
      const dimensions = await scrollArea.evaluate((el) => ({ client: el.clientHeight, scroll: el.scrollHeight }));
      check(`${prefix}: tam liste kaydırılabilir`, dimensions.scroll > dimensions.client + 50, JSON.stringify(dimensions));
      await goalRows.last().scrollIntoViewIfNeeded();
      const last = await goalRows.last().boundingBox(), closeBox = await goalDialog.getByRole('button', { name: 'Kapat' }).boundingBox();
      check(`${prefix}: son kayıt ve kapatma dar ekranda erişilebilir`, last.y + last.height <= (width === 320 ? 720 : 844) + 1 && closeBox.y >= 0 && closeBox.width >= 44 && closeBox.height >= 44);
      const bounds = await goalDialog.locator('[tabindex="-1"]').boundingBox();
      check(`${prefix}: pencere ekran genişliğine sığar`, bounds.x >= -1 && bounds.x + bounds.width <= width + 1);
      await page.waitForTimeout(100);
      await page.keyboard.press('Tab');
      check(`${prefix}: Tab odağı pencere içinde tutar`, await goalDialog.evaluate((el) => el.contains(document.activeElement)));
      await page.keyboard.press('Escape');
      await goalDialog.waitFor({ state: 'detached' });
      await page.waitForTimeout(30);
      check(`${prefix}: Escape kapatır ve odak açan düğmeye döner`, await goalButton.evaluate((el) => document.activeElement === el));
      const reopened = await open(page, goalTitle);
      await close(reopened);
      check(`${prefix}: kapat düğmesi yeniden açılan pencereyi kapatır`, await reopened.count() === 0);
      await verifyRanking(page, prefix, '🎯 Asist Kralı', expected.statsAssists);
      await verifyRanking(page, prefix, '⭐ Maç Puanı (min. 3 maç)', expected.statsRatings);
      check(`${prefix}: iki maçlık oyuncu reyting sıralamasına girmez`, !expected.statsRatings.includes(expected.excludedUnderThree));
      for (const title of ['🧤 Gol Yememe (Kaleciler)', '🧤 Kurtarış Yüzdesi (Kaleciler)']) {
        const d = await open(page, title);
        check(`${prefix}: ${title} kayıtları açılır`, await d.locator('ol > li').count() > 0);
        await close(d);
      }
      await page.getByRole('tab', { name: 'Karakter' }).click();
      check(`${prefix}: karakter listesi önizlemesi 5 kayıt`, await previewRows(page, '🔥 En Hırçınlar').count() === 5);
      await verifyRanking(page, prefix, '🔥 En Hırçınlar', expected.hotheads);
      await verifyRanking(page, prefix, '🕊️ Centilmenler (0 kart, min. 5 maç)', expected.gentlemen);
      await page.getByRole('tab', { name: 'Ödüller' }).click();
      check(`${prefix}: ödüller sekmesi çalışmaya devam eder`, await page.getByText('🏆 Kupa Vitrini').isVisible());
      await page.getByRole('tab', { name: 'Lig Analizi' }).click();
      await verifyRanking(page, prefix, '⚖️ xPTS Adalet Tablosu', expected.leagueClubs);
      await verifyRanking(page, prefix, '🕊️ Fair Play Ligi', expected.fairPlay);
      const injuryList = page.getByTestId('injury-list');
      check(`${prefix}: sakatlık önizlemesinde sadece 5 oyuncu`, await injuryList.locator('> li').count() === 5 && expected.injuries.length === 8);
      const injuryCardFits = await injuryList.evaluate((el) => {
        const card = el.closest('.bg-surface');
        return card && card.scrollHeight <= card.clientHeight + 1;
      });
      await injuryList.locator('> li').last().scrollIntoViewIfNeeded();
      const injuryLast = await injuryList.locator('> li').last().boundingBox();
      check(`${prefix}: analiz kartları kırpılmadan kaydırılır`, injuryCardFits && injuryLast.y >= 0 && injuryLast.y + injuryLast.height <= (width === 320 ? 720 : 844) + 1);
      await verifyRanking(page, prefix, 'Sakatlık geçmişi (maçtan çıkışlar)', expected.injuries);
      check(`${prefix}: hakem önizlemesinde sadece 6 profil`, await page.getByTestId('referee-profile-card').locator('[data-referee]').count() === 6 && expected.referees.length === 8);
      await verifyRanking(page, prefix, '📋 Hakem Profilleri', expected.referees);
      await page.getByTestId('archive-highlight-open').first().click();
      const highlight = page.getByRole('dialog');
      await highlight.waitFor({ state: 'visible' });
      await close(highlight);
      check(`${prefix}: maç özeti penceresi hâlâ açılıp kapanır`, await highlight.count() === 0);
      await page.getByRole('tab', { name: 'Krallıklar' }).click();
      check(`${prefix}: analizden sonra krallıklara dönülür`, await goalButton.isVisible());

      await page.getByRole('button', { name: 'Test: Müsabakalar' }).click();
      await page.getByRole('button', { name: 'Krallıklar', exact: true }).click();
      const compGoals = 'Gol Krallığı (sezon)';
      check(`${prefix}: lig gol önizlemesi ilk 8 kayıt`, equalRows(await previewRows(page, compGoals).allTextContents(), expected.leagueGoals.slice(0, 8)));
      const leagueGoalDialog = await open(page, compGoals);
      await page.evaluate(() => window.__rankingRerender());
      await page.waitForTimeout(100);
      check(`${prefix}: ekran güncellendiğinde açık lig listesi kapanmaz`, await leagueGoalDialog.isVisible());
      const leagueGoalRows = leagueGoalDialog.locator('ol > li');
      check(`${prefix}: ${compGoals} tam ve doğru sırada`, equalRows(await leagueGoalRows.allTextContents(), expected.leagueGoals));
      const leagueLongName = await leagueGoalRows.first().locator('span.font-semibold').evaluate((el) => ({
        wraps: el.clientHeight > parseFloat(getComputedStyle(el).lineHeight) * 1.5,
        fits: el.scrollWidth <= el.clientWidth + 1,
      }));
      check(`${prefix}: lig ayrıntısında uzun oyuncu adı kesilmez`, leagueLongName.wraps && leagueLongName.fits);
      await close(leagueGoalDialog);
      check(`${prefix}: lig gol eşitliğinde önceki sıra korunur`, expected.leagueGoals[9] === expected.goalTie[0] && expected.leagueGoals[10] === expected.goalTie[1]);
      await verifyRanking(page, prefix, 'Asist Krallığı (sezon)', expected.leagueAssists);
      const compRating = await open(page, 'Ortalama Reyting (min 3 maç)');
      const ratingTexts = await compRating.locator('ol > li').allTextContents();
      check(`${prefix}: lig reytingi 3 maç eşiğini ve tüm sıralamayı korur`, equalRows(ratingTexts, expected.leagueRatings) && !ratingTexts.some((text) => text.includes(expected.excludedUnderThree)));
      await close(compRating);
      await page.getByRole('button', { name: 'Miras Zirve', exact: true }).click();
      const otherDialog = await open(page, compGoals);
      check(`${prefix}: lig değişimi yalnız seçilen ligdeki oyuncuları gösterir`, equalRows(await otherDialog.locator('ol > li').allTextContents(), expected.otherLeagueGoals) && (await otherDialog.innerText()).includes('Miras Zirve Ligi'));
      await close(otherDialog);
      await page.getByRole('button', { name: 'Kök Bölge', exact: true }).click();
      check(`${prefix}: veri olmayan ligde uydurma sıralama yok`, await page.getByText('Bu ligde veri henüz yok').count() === 3 && await button(page, compGoals).count() === 0);
      await page.getByRole('button', { name: 'Kıtalar', exact: true }).click();
      check(`${prefix}: uluslararası gol önizlemesi ilk 8 kayıt`, equalRows(await previewRows(page, 'Uluslararası gol krallığı').allTextContents(), expected.international.slice(0, 8)));
      await verifyRanking(page, prefix, 'Uluslararası gol krallığı', expected.international);
      await page.getByRole('button', { name: 'Kıtalar Kupası', exact: true }).click();
      check(`${prefix}: uluslararası kupa değişiminde diğer listenin verileri taşınmaz`, await button(page, 'Uluslararası gol krallığı').count() === 0 && await page.getByText('İlk uluslararası maçlar oynandığında gol krallığı burada oluşur.').isVisible());
      await page.getByRole('button', { name: 'Şampiyonlar', exact: true }).click();
      check(`${prefix}: önceki kupaya dönünce golcüler geri gelir`, equalRows(await previewRows(page, 'Uluslararası gol krallığı').allTextContents(), expected.international.slice(0, 8)));
      const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
      check(`${prefix}: sayfa yatay taşmıyor`, noOverflow);
      check(`${prefix}: sıralamaları açmak oyun kaydını değiştirmez`, originalSnapshot === await page.evaluate(() => window.__rankingSnapshot()));

      const large = await visit('large');
      const largeDialog = await open(page, goalTitle);
      const largeRows = largeDialog.locator('ol > li');
      check(`${prefix}: yüzlerce kayıt için sıralama sınırı uygulanmaz`, large.statsGoals.length >= 300 && equalRows(await largeRows.allTextContents(), large.statsGoals));
      await largeRows.last().scrollIntoViewIfNeeded();
      const largeLast = await largeRows.last().boundingBox();
      check(`${prefix}: yüzlerce kaydın sonuna kaydırılabilir`, largeLast.y >= 0 && largeLast.y + largeLast.height <= (width === 320 ? 720 : 844) + 1);
      await close(largeDialog);
      await page.getByRole('button', { name: 'Test: Müsabakalar' }).click();
      await page.getByRole('button', { name: 'Krallıklar', exact: true }).click();
      const largeLeague = await open(page, compGoals);
      const largeLeagueRows = largeLeague.locator('ol > li');
      check(`${prefix}: kalabalık ligde portreli tüm oyuncular gösterilir`, large.leagueGoals.length >= 200 && equalRows(await largeLeagueRows.allTextContents(), large.leagueGoals));
      await largeLeagueRows.last().scrollIntoViewIfNeeded();
      const leagueLast = await largeLeagueRows.last().boundingBox();
      check(`${prefix}: kalabalık lig listesinin sonuna kaydırılabilir`, leagueLast.y >= 0 && leagueLast.y + leagueLast.height <= (width === 320 ? 720 : 844) + 1);
      await close(largeLeague);
      const played = await visit('played');
      check(`${prefix}: gerçek maç motoru sıralamaya kayıt üretir`, played.reports > 0 && played.statsGoals.length > 0);
      await verifyRanking(page, prefix, goalTitle, played.statsGoals);
      const small = await visit('small');
      check(`${prefix}: az veride tüm kayıtlar önizlemede`, equalRows(await previewRows(page, goalTitle).allTextContents(), small.statsGoals) && small.statsGoals.length === 2);
      await verifyRanking(page, prefix, goalTitle, small.statsGoals);
      await page.getByRole('tab', { name: 'Lig Analizi' }).click();
      const oldXpts = await open(page, '⚖️ xPTS Adalet Tablosu');
      check(`${prefix}: eski xG kaynağında arşiv sınırı açıklanır`, (await oldXpts.innerText()).includes('Eski kayıtlarda yalnızca arşivlenen maçlar kullanılır.'));
      await close(oldXpts);
      check(`${prefix}: eski raporda sakatlık ve hakem uydurulmaz`, await button(page, 'Sakatlık geçmişi (maçtan çıkışlar)').count() === 0 && await button(page, '📋 Hakem Profilleri').count() === 0);

      for (const scenario of ['empty', 'legacy']) {
        const fixture = await visit(scenario);
        check(`${prefix}: ${scenario} kayıtla krallıklar dürüst boş durum`, await page.getByText('Henüz istatistik birikmedi').isVisible() && await goalButton.count() === 0 && (scenario !== 'legacy' || fixture.version === 2));
        await page.getByRole('tab', { name: 'Lig Analizi' }).click();
        check(`${prefix}: ${scenario} analizde boş durum ve düğmesiz listeler`, await button(page, '⚖️ xPTS Adalet Tablosu').count() === 0 && await button(page, '🕊️ Fair Play Ligi').count() === 0);
        await page.getByRole('button', { name: 'Test: Müsabakalar' }).click();
        await page.getByRole('button', { name: 'Krallıklar', exact: true }).click();
        check(`${prefix}: ${scenario} lig krallıklarında veri uydurulmaz`, await page.getByText('Sezon istatistikleri henüz oluşmadı. İlk resmi maçları oynayın.').isVisible() && await button(page, compGoals).count() === 0);
      }
      check(`${prefix}: yakalanmamış tarayıcı hatası yok`, errors.length === 0, errors.join(' | '));
    } catch (error) {
      failed++;
      console.error(`❌ ${width}px/${theme}:`, error);
    } finally {
      await browser.close();
    }
  }
} finally {
  if (server) await server.close();
}
console.log(`\nRANKING-BROWSER: ${passed}/${passed + failed}`);
if (failed) process.exitCode = 1;
