// Real Chromium: newspaper, comparison desk and live reactions at 320/390px.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.env.HM26_BASE_URL ?? 'http://127.0.0.1:4173';
const executablePath = process.env.HM26_CHROMIUM;
const browser = await chromium.launch(executablePath ? { executablePath, headless: true, args: ['--no-sandbox', '--single-process', '--no-zygote', '--disable-gpu', '--disable-dev-shm-usage'] } : {});
const context = await browser.newContext({ viewport: { width: 320, height: 720 }, locale: 'tr' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
let passed = 0, failed = 0;
const check = (name, condition, detail = '') => { condition ? passed++ : failed++; console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
const nav = (name) => page.locator('nav[aria-label="Ana gezinme"] button', { hasText: name });
const out = process.env.HM26_SCREENSHOTS;
if (out) mkdirSync(out, { recursive: true });
const screenshot = async (name) => { if (out) await page.screenshot({ path: `${out}/${name}.png` }); };
const readSave = async () => page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => { const r = indexedDB.open('manager26', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  const entry = await new Promise((resolve, reject) => { const r = db.transaction('saves').objectStore('saves').get(1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  db.close(); return entry?.blob ?? null;
});
const waitForSave = async () => { const end = Date.now() + 12000; while (Date.now() < end) { const blob = await readSave(); if (blob) return blob; await page.waitForTimeout(100); } throw new Error('Kariyer kaydı oluşmadı'); };
const toStart = async () => { await page.goto(base, { waitUntil: 'networkidle' }); await page.getByRole('button', { name: /Devam Et/ }).first().waitFor(); await page.waitForTimeout(400); };
const continueCareer = async () => { await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('button', { name: /Devam Et/ }).first().click(); await page.getByRole('button', { name: 'Anladım' }).first().click({ timeout: 2000 }).catch(() => {}); };
const editSave = async (mode) => page.evaluate(async (mode) => {
  const db = await new Promise((resolve, reject) => { const r = indexedDB.open('manager26', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  const entry = await new Promise((resolve, reject) => { const r = db.transaction('saves').objectStore('saves').get(1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  const b = entry.blob, myId = b.career.clubId;
  let target;
  if (mode === 'paper') {
    b.seasonNo = 2; b.career.day = 10; b.day = 10;
    const mine = b.fixtures.find((f) => f.comp === 'lig' && f.homeId === myId);
    mine.day = 8; mine.played = true; mine.hg = 2; mine.ag = 1;
    const other = b.fixtures.find((f) => f.comp === 'lig' && f.homeId !== myId && f.awayId !== myId);
    other.day = 9; other.played = true; other.hg = 0; other.ag = 0;
    b.fixtures.push({ ...mine }); b.fixtures.push({ ...other });
    b.friendlies = []; b.cup.fixtures = []; b.cup.rounds = [];
    const rep = (seasonNo, name) => ({ id: `report-${mine.comp}-${mine.day}-${mine.homeId}-${mine.awayId}${name ?? ''}`, day: mine.day, seasonNo, comp: mine.comp, homeId: mine.homeId, awayId: mine.awayId, hg: 2, ag: 1, xgHome: 1, xgAway: 0.8, foulsHome: 0, foulsAway: 0, yellowsHome: 0, yellowsAway: 0, redsHome: 0, redsAway: 0, playerRows: {}, playerClubIds: {} });
    b.matchReports = [rep(2), rep(1, '-old')];
    const tr = (id, day, seasonNo, playerName) => ({ id, day, seasonNo, playerName, age: 22, group: 'CM', fromClubId: 'sakarya_vadi', toClubId: myId, fee: 1.25, kind: 'in' });
    b.transferLog = [tr('this-week', 9, 2, 'Gerçek Transfer'), tr('last-season', 9, 1, 'Eski Sezon Transferi'), tr('outside-week', 3, 2, 'Önceki Hafta Transferi')];
    target = { homeId: mine.homeId, awayId: mine.awayId, hg: mine.hg, ag: mine.ag };
  } else {
    const myFixtures = b.fixtures.filter((f) => f.comp === 'lig' && f.league === b.leagueOf[myId] && (f.homeId === myId || f.awayId === myId));
    target = myFixtures.find((f) => f.awayId === myId);
    for (const f of myFixtures) f.played = true;
    target.played = false; delete target.hg; delete target.ag; target.day = b.career.day;
    b.friendlies = []; b.cup.fixtures = []; b.cup.rounds = [];
    for (const cup of b.international.cups) {
      for (const f of cup.fixtures) if (f.homeId === myId || f.awayId === myId) f.played = true;
      for (const round of cup.rounds) for (const tie of round.ties) if (tie.homeId === myId || tie.awayId === myId) tie.winner = tie.homeId;
    }
    b.career.managerSuspendedMatches = 0;
  }
  await new Promise((resolve, reject) => { const tx = db.transaction('saves', 'readwrite'); tx.objectStore('saves').put(entry); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  db.close(); return target;
}, mode);
const layout = async (locator) => locator.evaluate((el) => {
  const r = el.getBoundingClientRect(), parent = el.closest('[role="dialog"]')?.getBoundingClientRect();
  return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, left: r.left, right: r.right, elementWidth: r.width, parentLeft: parent?.left, parentRight: parent?.right };
});
const fits = (l) => l.scrollWidth <= l.width && l.left >= (l.parentLeft ?? 0) - 1 && l.right <= (l.parentRight ?? l.width) + 1 && l.elementWidth >= 200;

try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Başla|Kayıt Yuvaları/ }).first().click();
  await page.getByText('Yeni Kariyer — Yuva 1').first().click();
  await page.locator('input').first().fill('Gazete Testi');
  await page.getByText('Eski Futbolcu').first().click();
  for (let i = 0; i < 6 && !(await page.getByText('Denizli Yeşilova').count()); i++) await page.getByRole('button', { name: 'Devam', exact: true }).first().click();
  await page.getByText('Denizli Yeşilova').first().click();
  await page.getByRole('button', { name: /Kulüp Brifingine Git/ }).click();
  await page.getByRole('button', { name: /Kariyeri Başlat/ }).click();
  await page.getByRole('button', { name: 'Anladım' }).first().click({ timeout: 2500 }).catch(() => {});
  await waitForSave();
  await page.getByTestId('hub-weekly-paper').click();
  const paper = page.getByTestId('weekly-paper');
  check('Ana merkez kısayolu gazeteyi doğrudan açar', await paper.isVisible() && await page.getByRole('button', { name: 'Gazete', exact: true }).getAttribute('aria-pressed') === 'true');
  check('Yeni kariyerde maçsız/transfer olmayan hafta dürüstçe boş', /kayıtlı maç sonucu veya transfer yok/i.test(await paper.innerText()) && /kayıtlı, skoru belli bir maç yok/i.test(await paper.innerText()));
  await screenshot('01-empty-paper-320');
  await page.getByRole('button', { name: 'Manşet', exact: true }).click();
  await page.getByRole('button', { name: /Haftanın futbol gazetesi/i }).click();
  check('Basın Odası manşetinden de gazeteye erişilir', await paper.isVisible());

  await toStart();
  const score = await editSave('paper');
  await continueCareer();
  await page.getByTestId('hub-weekly-paper').click();
  const paperText = await paper.innerText();
  check('Haftalık gazete yalnız gerçek skorları ve bu haftanın transferini gösterir', paperText.includes('2–1') && paperText.includes('0–0') && paperText.includes('Gerçek Transfer') && !paperText.includes('Eski Sezon Transferi') && !paperText.includes('Önceki Hafta Transferi'), JSON.stringify(score));
  check('Mükerrer fikstürler gazete sayacında bir kez görünür', /2 MAÇ/.test(paperText) && await paper.getByTestId('weekly-score').count() === 2);
  check('Gazetede takım formu kaydedilmiş maçtan çıkar', /Son maç formu/.test(paperText) && /Galibiyet manşette/.test(paperText));
  let box = await layout(paper);
  check('320 px gazete yatay taşmaz', fits(box), JSON.stringify(box));
  await screenshot('02-paper-cover-320');
  await paper.getByText('Transfer defteri', { exact: true }).scrollIntoViewIfNeeded();
  await screenshot('03-paper-details-320');
  await page.setViewportSize({ width: 390, height: 844 });
  await paper.locator('.weekly-paper__masthead').scrollIntoViewIfNeeded();
  box = await layout(paper);
  check('390 px gazete yatay taşmaz', fits(box), JSON.stringify(box));
  await screenshot('04-paper-cover-390');
  await page.setViewportSize({ width: 320, height: 720 });
  const tabGeometry = await page.getByRole('group', { name: 'Basın odası bölümleri' }).evaluate((row) => {
    const buttons = [...row.querySelectorAll('button')].map((button) => button.getBoundingClientRect());
    return { noOverlap: buttons.every((rect, index) => index === 0 || rect.left >= buttons[index - 1].right - 1), scrollable: row.scrollWidth > row.clientWidth };
  });
  check('320 px basın sekmeleri üst üste binmez, yatay kaydırılabilir', tabGeometry.noOverlap && tabGeometry.scrollable, JSON.stringify(tabGeometry));
  await page.getByRole('button', { name: 'Taraftar', exact: true }).click();
  check('Kaydırılan son basın sekmesi erişilebilir ve açılır', await page.getByTestId('fan-pulse').isVisible());
  await page.getByRole('button', { name: 'Gazete', exact: true }).click();

  // Both sides of the table can be found by keyboard/search and show actual player data.
  await page.setViewportSize({ width: 320, height: 720 });
  await nav('Kadro').click();
  const savedBefore = await readSave();
  await page.getByRole('button', { name: 'Karşılaştır', exact: true }).click();
  const desk = page.getByTestId('comparison-desk');
  const dialog = page.getByRole('dialog', { name: 'Oyuncu Karşılaştırma Masası' });
  check('Kadro karşılaştırma masası erişilebilir diyalog olarak açılır', await dialog.isVisible() && await desk.getByLabel('1. oyuncu ara').isVisible());
  await desk.getByTestId('comparison-candidate').first().click();
  const firstId = await desk.getByTestId('comparison-player-1').getAttribute('data-player-id');
  check('İlk gerçek oyuncu seçilir; aynı oyuncu diğer sütunda seçilemez', !!firstId && await desk.locator(`[data-testid="comparison-candidate"][data-player-id="${firstId}"]`).isDisabled());
  await desk.getByLabel('2. oyuncu ara').fill('Sakarya Vadi');
  await desk.getByTestId('comparison-candidate').first().focus();
  await page.keyboard.press('Enter');
  const table = desk.getByTestId('comparison-table');
  check('Arama ve Enter ile başka kulüpten gerçek ikinci oyuncu seçilir', !!(await desk.getByTestId('comparison-player-2').getAttribute('data-player-id')) && (await table.innerText()).includes('Sakarya Vadi SK'));
  const tableText = await table.innerText();
  check('Yedi ölçüt ve aylık bin TL maaş yan yana görünür', ['GEN', 'POT', 'Yaş', 'Maaş', 'bin/ay', 'Kondisyon', 'Doğal mevki', 'Kulüp'].every((label) => tableText.includes(label)) && await table.locator('tbody tr').count() === 7);
  check('İki oyuncunun tarafı ve alternatif mevkileri yan yana görünür', (await desk.getByTestId('comparison-position-1').innerText()).includes('Taraf:') && (await desk.getByTestId('comparison-position-2').innerText()).includes('Diğer:'));
  box = await layout(desk);
  check('320 px karşılaştırma diyaloğu taşmaz', fits(box), JSON.stringify(box));
  await screenshot('05-comparison-320');
  await page.setViewportSize({ width: 390, height: 844 });
  box = await layout(desk);
  check('390 px karşılaştırma diyaloğu taşmaz', fits(box), JSON.stringify(box));
  await screenshot('06-comparison-390');
  await desk.getByRole('button', { name: '2. oyuncu değiştir' }).click();
  await desk.getByLabel('2. oyuncu ara').fill('Kanat');
  check('Karşılaştırmada Türkçe mevki adıyla oyuncu aranabilir', await desk.getByTestId('comparison-candidate').count() > 0);
  await page.keyboard.press('Escape');
  check('Escape karşılaştırmayı kapatır ve kadroya döner', await dialog.count() === 0 && await page.getByRole('heading', { name: 'Kadro', exact: true }).isVisible());
  const savedAfter = await readSave();
  check('Karşılaştırma bütçeyi, oyuncuları ve kayıt sürümünü değiştirmez', savedAfter.version === 5 && JSON.stringify(savedBefore.budget) === JSON.stringify(savedAfter.budget) && JSON.stringify(savedBefore.playerPatch) === JSON.stringify(savedAfter.playerPatch));
  const squadPlayerButton = page.locator('button').filter({ has: page.locator('svg[data-hm26-player-avatar]') }).first();
  const squadId = await squadPlayerButton.locator('svg[data-player-id]').getAttribute('data-player-id');
  await squadPlayerButton.click();
  await page.getByRole('button', { name: 'Bu Oyuncuyu Karşılaştır' }).click();
  check('Kadro hızlı profilinden açılan masa seçili oyuncuyu taşır', await desk.getByTestId('comparison-player-1').getAttribute('data-player-id') === squadId);
  await page.keyboard.press('Escape');

  await nav('Piyasa').click();
  const marketCard = page.getByTestId('market-player').first();
  const marketId = await marketCard.getAttribute('data-player-id');
  await marketCard.getByRole('button', { name: /karşılaştır/i }).click();
  check('Piyasa satırından gerçek oyuncu karşılaştırmaya taşınır', await desk.getByTestId('comparison-player-1').getAttribute('data-player-id') === marketId);
  await screenshot('07-market-player-390');
  await page.keyboard.press('Escape');
  check('Piyasa genel karşılaştırma kısayolu mevcut', await page.getByRole('button', { name: 'Oyuncu Karşılaştırma Masası' }).isVisible());

  // Offline cache: the scene's local background is actually available without a network.
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (reg.active?.state !== 'activated') await new Promise((resolve) => { const worker = reg.active; const onState = () => { if (worker.state === 'activated') { worker.removeEventListener('statechange', onState); resolve(); } }; worker.addEventListener('statechange', onState); onState(); });
  });
  const cached = await page.evaluate(async () => !!(await caches.match('/assets/match/dugout-background.webp')));
  await context.setOffline(true);
  const offlineImage = await page.evaluate(async () => { try { const response = await fetch('/assets/match/dugout-background.webp'); return response.ok && (await response.blob()).size > 10000; } catch { return false; } });
  check('Kulübe sahnesinin yerel görseli çevrimdışı önbellekten yüklenir', cached && offlineImage);
  // Reload the real saved career without network, not merely an in-memory component.
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Devam Et/ }).first().click();
  await page.getByRole('button', { name: 'Anladım' }).first().click({ timeout: 2000 }).catch(() => {});
  await page.getByTestId('hub-weekly-paper').click();
  check('Kayıt yüklenerek gazete internet olmadan açılır', await paper.isVisible() && (await paper.innerText()).includes('Gerçek Transfer'));
  await nav('Kadro').click();
  await page.getByRole('button', { name: 'Karşılaştır', exact: true }).click();
  await desk.getByTestId('comparison-candidate').first().click();
  check('İnternetsiz karşılaştırmada kayıtlı oyuncu seçilebilir', !!(await desk.getByTestId('comparison-player-1').getAttribute('data-player-id')));
  await page.keyboard.press('Escape');
  await context.setOffline(false);

  // An away match: observe the actual engine event, then freeze the same animated scene.
  await toStart();
  const target = await editSave('away');
  await continueCareer();
  await page.setViewportSize({ width: 320, height: 720 });
  await page.getByRole('button', { name: /Maç Merkezine Git/ }).first().click();
  await page.getByRole('button', { name: /Maça Başla/ }).first().click();
  await page.getByRole('button', { name: /Kulübe & Tribün/ }).click();
  const scene = page.getByTestId('live-atmosphere');
  check('Deplasman maçında Kulübe & Tribün gerçek sahne olarak açılır', await scene.isVisible() && target.awayId === 'denizli_yesilova' && await scene.locator('[aria-label^="YEDEK:"]').count() >= 1);
  check('Altı maç konsolu sekmesi ve manuel maç akışı korunur', await page.getByRole('tablist', { name: 'Maç konsolu sekmeleri' }).getByRole('tab').count() === 6 && await page.getByRole('button', { name: 'Maçı duraklat' }).isVisible());
  const consoleIcons = await page.getByRole('tablist', { name: 'Maç konsolu sekmeleri' }).evaluate((nav) => {
    const root = document.documentElement, original = root.classList.contains('m26-dark');
    const valid = (dark) => {
      root.classList.toggle('m26-dark', dark);
      return [...nav.querySelectorAll('button')].every((button) => {
        const light = button.querySelector('.gi-ivory'), darkIcon = button.querySelector('.gi-dark');
        if (light && darkIcon) return getComputedStyle(light).display !== 'none' && getComputedStyle(darkIcon).display === 'none';
        const svg = button.querySelector('svg');
        return !!svg && svg.getAttribute('stroke') === 'currentColor';
      });
    };
    try { return { light: valid(false), dark: valid(true) }; }
    finally { root.classList.toggle('m26-dark', original); }
  });
  check('Koyu maç konsolu simgeleri açık ve koyu temada görünür', consoleIcons.light && consoleIcons.dark, JSON.stringify(consoleIcons));
  box = await layout(scene);
  check('320 px hareketli kulübe sahnesi taşmaz', fits(box), JSON.stringify(box));
  await screenshot('08-dugout-idle-320');
  const visibleBench = scene.getByRole('group', { name: 'Sahnede görünen yedekler' });
  const firstBenchName = (await scene.locator('[aria-label^="YEDEK:"]').first().getAttribute('aria-label')).replace(/^YEDEK:\s*/, '');
  check('Sahnede görünen gerçek yedekler isimleriyle okunabilir', (await visibleBench.innerText()).includes(firstBenchName));
  await page.getByRole('button', { name: 'Maçı duraklat' }).click();
  await page.getByRole('tab', { name: 'Oyuncu Değişikliği' }).click();
  const subPanel = page.getByRole('tabpanel', { name: 'Oyuncu Değişikliği' });
  const subGroups = subPanel.locator('.grid.grid-cols-2.gap-1');
  await subGroups.nth(0).getByRole('button').first().click();
  await subGroups.nth(1).getByRole('button').first().click();
  await subPanel.getByRole('button', { name: 'Onayla', exact: true }).click();
  const resume = page.getByRole('button', { name: 'Maça devam et' });
  check('Duraklatılmış maç, değişiklik onayından sonra kullanıcı kararını bekler', await resume.isVisible());
  await resume.click(); // queued substitution executes on the next real match step
  await page.waitForFunction((name) => {
    const list = document.querySelector('[aria-label="Sahnede görünen yedekler"]');
    return !!list && !list.textContent.includes(name);
  }, firstBenchName, { timeout: 10000 });
  check('Gerçek oyuncu değişikliği sonrası kulübe isimleri güncellenir', !(await visibleBench.innerText()).includes(firstBenchName));
  await page.getByRole('button', { name: '4 kat hız' }).click();
  let saw = false;
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline && !saw) {
    if (await scene.getAttribute('data-reaction') !== 'idle') { saw = true; break; }
    const visibleDialog = page.locator('[role="dialog"]:visible').last();
    if (await visibleDialog.count()) {
      const text = await visibleDialog.innerText();
      const choice = /Devre Arası/.test(text) ? visibleDialog.getByRole('button', { name: /Sakinleştir/ }) : visibleDialog.getByRole('button', { name: /Devam Et|Dönüşünü bekle|Kapat/ }).last();
      if (await choice.count()) await choice.click().catch(() => {});
    }
    await page.waitForTimeout(120);
  }
  check('Gerçek motor gol/kurtarış/kart ürettiğinde kulübe ve tribün tepki verir', saw, saw ? `${await scene.getAttribute('data-reaction')} · ${await scene.getAttribute('data-mood')}` : '30 saniyede olay görülmedi');
  if (saw) {
    const reactionKind = await scene.getAttribute('data-reaction');
    const sceneText = await scene.innerText();
    check('Tepki yalnız gerçek olay türü ve metniyle gösterilir', ['goal', 'save', 'card'].includes(reactionKind) && /\d+′/.test(sceneText) && !sceneText.includes('undefined'));
    const dlg = page.locator('[role="dialog"]:visible').last();
    if (await dlg.count()) {
      const choice = dlg.getByRole('button', { name: /Devam Et|Dönüşünü bekle|Kapat/ }).last();
      if (await choice.count()) await choice.click().catch(() => {});
    }
    const pauseButton = page.getByRole('button', { name: 'Maçı duraklat' });
    if (await pauseButton.count()) await pauseButton.click();
    await page.waitForFunction(() => document.querySelector('[data-testid="live-atmosphere"]')?.getAttribute('data-motion') === 'paused');
    const beforeClock = await page.getByRole('timer').innerText();
    const animations = await scene.evaluate((element) => element.getAnimations({ subtree: true }).map((a) => ({ state: a.playState, time: a.currentTime })));
    const frozen1 = await scene.locator('.live-atmosphere').screenshot();
    await page.waitForTimeout(350);
    const frozen2 = await scene.locator('.live-atmosphere').screenshot();
    check('Duraklatma maç saatini ve animasyon sahnesini dondurur', beforeClock === await page.getByRole('timer').innerText() && frozen1.equals(frozen2) && animations.length > 0 && animations.every((a) => a.state === 'paused'), JSON.stringify(animations.slice(0, 3)));
    await screenshot('09-dugout-reaction-paused-320');
    const eventCard = scene.locator('.live-atmosphere__event');
    await eventCard.scrollIntoViewIfNeeded();
    const footerGeometry = () => page.evaluate(() => {
      const a = document.querySelector('.live-atmosphere__event').getBoundingClientRect();
      const button = document.querySelector('button[aria-label="Kenar Talimatı"]');
      const b = button.getBoundingClientRect();
      return { overlaps: a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top, buttonInFooter: !!button.closest('footer') };
    });
    let geometry = await footerGeometry();
    check('320 px olay kartını kenar talimatı düğmesi örtmez', !geometry.overlaps && geometry.buttonInFooter, JSON.stringify(geometry));
    const iconContrast = await page.getByRole('button', { name: 'Kenar Talimatı' }).evaluate((button) => {
      const icon = button.querySelector('svg');
      const rgb = (color) => (color.match(/\d+(?:\.\d+)?/g) ?? []).slice(0, 3).map(Number);
      const luminance = (values) => values.reduce((sum, n, i) => {
        const c = n / 255, linear = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        return sum + linear * [0.2126, 0.7152, 0.0722][i];
      }, 0);
      if (!icon || icon.getAttribute('stroke') !== 'currentColor') return 0;
      const foreground = luminance(rgb(getComputedStyle(icon).color));
      const background = luminance(rgb(getComputedStyle(button).backgroundColor));
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    });
    check('Kenar talimatı simgesi koyu zeminde okunaklı', iconContrast >= 3, `kontrast=${iconContrast.toFixed(2)}`);
    const sourceText = await eventCard.locator('span').innerText();
    const history = scene.getByTestId('live-reaction-history');
    await history.locator('summary').click();
    check('Son tepkiler açılabilir ve gerçek maç olayını korur', await history.getAttribute('open') !== null && (await history.innerText()).includes(sourceText));
    await page.getByRole('tab', { name: 'Spiker ve Maç Günlüğü' }).click();
    check('Sahnedeki olay aynı gerçek maç günlüğünde bulunur', (await page.getByRole('log', { name: 'Maç olay akışı' }).innerText()).includes(sourceText));
    await page.getByRole('tab', { name: 'Canlı Saha' }).click();
    check('Duraklatılmış maçta sekmeden dönünce kulübe ve olay korunur', await scene.getAttribute('data-motion') === 'paused' && (await scene.innerText()).includes(sourceText) && beforeClock === await page.getByRole('timer').innerText());
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('[data-testid="live-atmosphere"]')?.getAttribute('data-motion') === 'reduced');
    const reducedAnimations = await scene.evaluate((element) => element.getAnimations({ subtree: true }).length);
    check('Sistem azaltılmış hareket tercihi sahne animasyonlarını kapatır', reducedAnimations === 0, `animasyon=${reducedAnimations}`);
    await screenshot('10-dugout-reduced-320');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 390, height: 844 });
    box = await layout(scene);
    check('390 px duraklatılmış sahne taşmaz', fits(box), JSON.stringify(box));
    await eventCard.scrollIntoViewIfNeeded();
    geometry = await footerGeometry();
    check('390 px olay kartını kenar talimatı düğmesi örtmez', !geometry.overlaps && geometry.buttonInFooter, JSON.stringify(geometry));
    await screenshot('11-dugout-390');
    const resume = page.getByRole('button', { name: 'Maça devam et' });
    if (await resume.count()) await resume.click();
    await page.waitForTimeout(600);
    check('Devam düğmesi maç saatini yeniden çalıştırır', beforeClock !== await page.getByRole('timer').innerText());

    // Keep the new view open all the way to the whistle: it must not force a transition.
    const endButton = page.getByRole('button', { name: /Maç Sonu Röportajına Geç/ });
    const finishDeadline = Date.now() + 60000;
    while (Date.now() < finishDeadline && !(await endButton.isVisible())) {
      const visibleDialog = page.locator('[role="dialog"]:visible').last();
      if (await visibleDialog.count()) {
        const text = await visibleDialog.innerText();
        const choice = /Devre Arası/.test(text) ? visibleDialog.getByRole('button', { name: /Sakinleştir/ }) : visibleDialog.getByRole('button', { name: /Devam Et|Dönüşünü bekle|Kapat/ }).last();
        if (await choice.count()) await choice.click().catch(() => {});
      }
      await page.waitForTimeout(120);
    }
    const finished = await endButton.isVisible();
    check('Kulübe görünümü açıkken maç son düdüğe ulaşır', finished);
    if (finished) {
      const finalClock = await page.getByRole('timer').innerText();
      await page.waitForTimeout(1000);
      check('Son düdükte sahne ve saat durur; röportaj kendiliğinden açılmaz', await scene.isVisible() && await scene.getAttribute('data-motion') === 'paused' && finalClock === await page.getByRole('timer').innerText() && await page.getByTestId('post-match-interview').count() === 0);
      await endButton.click();
      check('Röportaj yalnız kullanıcının düğmesiyle açılır', await page.getByTestId('post-match-interview').isVisible());
    }
  }
  check('Tarayıcıda yakalanmamış uygulama hatası yok', errors.length === 0, errors.join(' | '));
} catch (error) {
  failed++; console.error(error?.stack || error);
  await screenshot('error').catch(() => {});
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
}
console.log(`\n${passed}/${passed + failed} geçti`);
process.exit(failed ? 1 : 0);
