// Gerçek Chromium: 320/390 px sahne akışları, duraklatma, tercihler ve çevrimdışı medya.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const base = process.env.HM26_BASE_URL ?? 'http://127.0.0.1:4173';
const executablePath = process.env.HM26_CHROMIUM;
const browser = await chromium.launch(executablePath ? { executablePath, headless: true, args: ['--no-sandbox', '--single-process', '--no-zygote', '--disable-gpu', '--disable-dev-shm-usage'] } : {});
const context = await browser.newContext({ viewport: { width: 320, height: 720 }, locale: 'tr' });
const page = await context.newPage();
const errors = [], voiceResponses = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => { if (response.url().includes('/assets/match/voice/')) voiceResponses.push({ url: response.url(), status: response.status() }); });
const out = process.env.HM26_SCREENSHOTS;
if (out) mkdirSync(out, { recursive: true });
const screenshot = async (name) => { if (out) await page.screenshot({ path: `${out}/${name}.png` }); };
let passed = 0, failed = 0;
const check = (name, ok, detail = '') => { ok ? passed++ : failed++; console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
const nav = (name) => page.locator('nav[aria-label="Ana gezinme"] button', { hasText: name });
const readSave = async () => page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => { const r = indexedDB.open('manager26', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  const item = await new Promise((resolve, reject) => { const r = db.transaction('saves').objectStore('saves').get(1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  db.close(); return item?.blob ?? null;
});
const waitSave = async (predicate) => {
  const end = Date.now() + 12000;
  while (Date.now() < end) { const b = await readSave(); if (predicate(b)) return b; await page.waitForTimeout(100); }
  throw new Error('Kariyer kaydı zamanında oluşmadı');
};
const editSave = async (mode) => page.evaluate(async (mode) => {
  const db = await new Promise((resolve, reject) => { const r = indexedDB.open('manager26', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  const entry = await new Promise((resolve, reject) => { const r = db.transaction('saves').objectStore('saves').get(1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  const b = entry.blob;
  let fixture = null;
  if (mode === 'history') {
    b.seasonNo = 2; b.career.day = 8;
    const makeReport = (id, seasonNo, day, hg, ag, comp = 'lig') => ({ id, seasonNo, day, comp, homeId: b.career.clubId, awayId: 'sakarya_vadi', hg, ag, xgHome: 1, xgAway: 1, foulsHome: 0, foulsAway: 0, yellowsHome: 0, yellowsAway: 0, redsHome: 0, redsAway: 0, playerRows: {}, playerClubIds: {} });
    const makeTransfer = (id, seasonNo, day, playerName) => ({ id, seasonNo, day, playerName, age: 22, group: 'MF', fromClubId: 'sakarya_vadi', toClubId: b.career.clubId, fee: 2, kind: 'in' });
    const one = makeReport('gercek-sonuc', 1, 200, 4, 1);
    b.matchReports = [one, { ...one }, makeReport('bu-sezon', 2, 2, 0, 0, 'kupa-ko'), makeReport('gelecek', 2, 10, 9, 0)];
    const t = makeTransfer('gercek-transfer', 2, 4, 'Gerçek Transfer');
    b.transferLog = [t, { ...t }, makeTransfer('gelecek-transfer', 2, 12, 'Gelecek Transfer')];
    b.career.trophyCabinet = [{ season: '2026–27', type: 'lig', title: 'Gerçek Lig Kupası' }, { season: 'eski kayıt', type: 'kupa', title: 'Tarihsiz Kupa' }];
  } else {
    const list = b.fixtures.filter((f) => f.comp === 'lig' && f.league === b.leagueOf[b.career.clubId] && (f.homeId === b.career.clubId || f.awayId === b.career.clubId));
    fixture = list.find((f) => f.awayId === b.career.clubId) ?? list[0];
    for (const f of list) f.played = true;
    fixture.played = false; fixture.day = b.career.day;
    b.cup.fixtures = []; b.cup.rounds = []; b.friendlies = [];
    for (const cup of b.international.cups) {
      for (const f of cup.fixtures) if (f.homeId === b.career.clubId || f.awayId === b.career.clubId) f.played = true;
      for (const round of cup.rounds) for (const tie of round.ties) if (tie.homeId === b.career.clubId || tie.awayId === b.career.clubId) tie.winner = tie.homeId;
    }
  }
  await new Promise((resolve, reject) => { const tx = db.transaction('saves', 'readwrite'); tx.objectStore('saves').put(entry); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  db.close(); return { fixture };
}, mode);
const toStart = async () => { await page.goto(base, { waitUntil: 'networkidle' }); await page.getByRole('button', { name: /Devam Et/ }).first().waitFor(); await page.waitForTimeout(300); };
const continueCareer = async () => { await page.reload({ waitUntil: 'networkidle' }); await page.getByRole('button', { name: /Devam Et/ }).first().click(); await page.getByRole('button', { name: 'Anladım' }).first().click({ timeout: 2000 }).catch(() => {}); };
const box = async (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(), dialog = el.closest('[role="dialog"]')?.getBoundingClientRect(); return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, left: r.left, right: r.right, elWidth: r.width, dialogLeft: dialog?.left, dialogRight: dialog?.right }; });
const fits = (b) => b.scrollWidth <= b.width && b.left >= (b.dialogLeft ?? 0) - 1 && b.right <= (b.dialogRight ?? b.width) + 1 && b.elWidth >= 200;
const theme = (dark) => page.evaluate((dark) => { document.documentElement.classList.toggle('m26-dark', dark); document.documentElement.classList.toggle('m26-light', !dark); document.documentElement.dataset.theme = dark ? 'dark' : 'light'; }, dark);

try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Başla|Kayıt Yuvaları/ }).first().click();
  await page.getByText('Yeni Kariyer — Yuva 1').first().click();
  await page.locator('input').first().fill('Sahne Testi');
  await page.getByText('Eski Futbolcu').first().click();
  for (let i = 0; i < 6 && !(await page.getByText('Denizli Yeşilova').count()); i++) await page.getByRole('button', { name: 'Devam', exact: true }).first().click();
  await page.getByText('Denizli Yeşilova').first().click();
  await page.getByRole('button', { name: /Kulüp Brifingine Git/ }).click();
  await page.getByRole('button', { name: /Kariyeri Başlat/ }).click();
  await page.getByRole('button', { name: 'Anladım' }).first().click({ timeout: 2500 }).catch(() => {});
  await waitSave((b) => !!b);

  // Tesis: five different drills, real roster and pause/reduced-motion controls.
  await page.getByTestId('hub-training').click();
  const dialog = page.getByRole('dialog', { name: 'Haftalık Antrenman' });
  const ground = page.getByTestId('training-ground');
  check('320 px antrenman paneli ve gerçek üç oyuncu görünür', await ground.isVisible() && await ground.getByTestId('training-player').count() === 3);
  check('Tesis sayısal gerçek kondisyon ve form gösterir', /KADRO KONDİSYONU/.test(await ground.innerText()) && /KADRO FORMU/.test(await ground.innerText()) && /KON\s*\d+/.test(await ground.innerText()));
  let bounds = await box(ground);
  check('320 px tesis panel dışına taşmaz', fits(bounds), JSON.stringify(bounds));
  await ground.scrollIntoViewIfNeeded(); await screenshot('01-training-320');
  for (const [area, caption] of [['Hücum', 'ŞUT ÇALIŞMASI'], ['Defans', 'SAVUNMA HATTI'], ['Fizik', 'MEKİK KOŞUSU'], ['Zekâ', 'PAS ÜÇGENİ'], ['Teknik', 'TOPLA SLALOM']]) {
    await dialog.getByRole('button', { name: area, exact: true }).click();
    check(`${area} seçimi sahnenin gerçek çalışmasını değiştirir`, await ground.getAttribute('data-area') === area && (await ground.innerText()).includes(caption) && await dialog.getByRole('button', { name: area, exact: true }).getAttribute('aria-pressed') === 'true');
  }
  const actor = ground.locator('.training-actor--one');
  let firstTransform = await actor.evaluate((el) => getComputedStyle(el).transform);
  await page.waitForTimeout(350);
  let secondTransform = await actor.evaluate((el) => getComputedStyle(el).transform);
  check('Seçili teknik çalışmasında oyuncu gerçekten hareket eder', firstTransform !== secondTransform, `${firstTransform} → ${secondTransform}`);
  await ground.getByRole('button', { name: 'Durdur' }).click();
  await page.waitForTimeout(100); // Let the paused animation settle on the next rendered frame.
  firstTransform = await actor.evaluate((el) => getComputedStyle(el).transform);
  await page.waitForTimeout(250);
  secondTransform = await actor.evaluate((el) => getComputedStyle(el).transform);
  check('Tesis duraklatılınca animasyon gerçekten durur', await ground.getAttribute('data-motion') === 'paused' && firstTransform === secondTransform, `${firstTransform} → ${secondTransform}`);
  await ground.getByRole('button', { name: 'Devam' }).click();
  await dialog.getByRole('button', { name: 'Yoğun', exact: true }).click();
  check('Yoğunluk seçimi hız ve kayıtlı odağa yansır', await ground.getAttribute('data-intensity') === 'yogun' && await ground.locator('.training-ground__stage').evaluate((el) => getComputedStyle(el).getPropertyValue('--drill-time').trim()) === '2s');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.querySelector('[data-testid="training-ground"]')?.getAttribute('data-motion') === 'reduced');
  check('İşletim sisteminin azaltılmış hareket tercihi tesisi durdurur', await ground.getAttribute('data-motion') === 'reduced' && await ground.getByRole('button', { name: 'Durdur' }).isDisabled() && await actor.evaluate((el) => getComputedStyle(el).animationName) === 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 844 }); bounds = await box(ground);
  check('390 px tesis panel dışına taşmaz', fits(bounds), JSON.stringify(bounds));
  await ground.scrollIntoViewIfNeeded(); await screenshot('02-training-390');
  await theme(true); check('Tesis koyu temada da panel içinde görünür', await ground.isVisible() && fits(await box(ground))); await screenshot('02b-training-dark'); await theme(false);
  await dialog.getByRole('button', { name: 'Özeti güncelle ✓' }).click();
  await waitSave((b) => b?.career?.trainingFocus?.intensity === 'yogun');

  // Timeline contains deduplicated evidence and never pretends unknown award dates are precise.
  await toStart(); await editSave('history'); await continueCareer();
  await page.getByTestId('hub-career-story').click();
  const timeline = page.getByTestId('career-timeline');
  const story = await timeline.innerText();
  check('Kariyer hikâyesi kaydedilmiş kupa, maç ve transferleri gösterir', ['Gerçek Lig Kupası', 'Gerçek Transfer', '4–1', '0–0'].every((x) => story.includes(x)) && !story.includes('Gelecek Transfer') && !story.includes('9–0'));
  check('Mükerrer maç ve transfer bir kez gösterilir', (story.match(/Gerçek Transfer/g) ?? []).length === 1 && (story.match(/4–1/g) ?? []).length === 1);
  check('Bilinmeyen kupa günü ve eski sezon açıkça belirtilir', /günü kaydedilmedi/i.test(story) && /Sezonu bilinmeyen kayıtlar/.test(story));
  await page.setViewportSize({ width: 320, height: 720 }); bounds = await box(timeline);
  check('320 px kariyer hikâyesi taşmaz', fits(bounds), JSON.stringify(bounds));
  await timeline.scrollIntoViewIfNeeded(); await screenshot('03-career-story-320');
  await timeline.getByRole('button', { name: 'Kupalar', exact: true }).click();
  check('Kupa filtresi sadece gerçek kupaları gösterir', await timeline.getByTestId('career-moment').count() === 2 && (await timeline.getByTestId('career-moment').all()).length === 2 && !(await timeline.innerText()).includes('Gerçek Transfer'));
  await timeline.getByRole('button', { name: 'Tümü', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 }); bounds = await box(timeline);
  check('390 px kariyer hikâyesi taşmaz', fits(bounds), JSON.stringify(bounds));
  await timeline.scrollIntoViewIfNeeded(); await screenshot('04-career-story-390');
  await theme(true); check('Kariyer hikâyesi koyu temada okunur ve taşmaz', await timeline.isVisible() && fits(await box(timeline))); await screenshot('04b-career-dark'); await theme(false);

  // Away fixture: stadium is the actual home ground; animation never starts a match itself.
  await toStart(); const { fixture } = await editSave('match'); await continueCareer();
  await page.getByRole('button', { name: /Maç Merkezine Git/ }).first().click();
  check('Geliş sahnesi izlenmeden de maç başlatma seçeneği korunur', await page.getByTestId('open-arrival').isVisible() && await page.getByRole('button', { name: 'Maça Başla', exact: true }).isVisible() && !(await page.getByTestId('arrival-scene').count()));
  const homeStadium = await page.getByTestId('match-stadium').textContent();
  await page.getByTestId('open-arrival').click();
  const arrival = page.getByTestId('arrival-scene'), bus = page.getByTestId('arrival-bus');
  const arrivedialog = page.getByRole('dialog', { name: 'Stadyuma Geliş' });
  const label = await arrival.locator('svg[role="img"]').getAttribute('aria-label');
  const priorSave = await readSave();
  check('Deplasmanda takım otobüsü gerçek ev sahibi stadyumuna gelir', fixture.awayId === priorSave.career.clubId && !!homeStadium && label.includes(homeStadium) && (await arrival.innerText()).includes(homeStadium) && /Denizli Yeşilova/.test(label));
  let x1 = Number(await bus.getAttribute('data-x')); await page.waitForTimeout(650); let x2 = Number(await bus.getAttribute('data-x'));
  check('Otobüs sahnede gerçekten ilerler', x2 > x1 + 1, `${x1} → ${x2}`);
  await arrival.getByRole('button', { name: 'Durdur', exact: true }).click();
  x1 = Number(await bus.getAttribute('data-x')); await page.waitForTimeout(300); x2 = Number(await bus.getAttribute('data-x'));
  check('Duraklatma otobüsü ve dekoru dondurur', x1 === x2 && await arrival.getAttribute('data-motion') === 'paused' && await arrival.locator('.arrival-fan').first().evaluate((el) => getComputedStyle(el).animationPlayState) === 'paused');
  const scrub = arrival.getByRole('slider', { name: 'Geliş sahnesi zamanı' });
  await scrub.focus(); await scrub.press('End');
  check('Sürgü otobüsü park eder, iki kapıyı açar ve gerçek altı oyuncuyu gösterir', Number(await bus.getAttribute('data-x')) > 100 && Number(await bus.getAttribute('data-door')) === 1 && Number(await arrival.getByTestId('arrival-stadium-gate').getAttribute('data-open')) === 1 && await arrival.getByTestId('arrival-passenger').count() === 6 && /SEÇİLİ İLK 11/.test(await arrival.innerText()));
  await page.setViewportSize({ width: 320, height: 720 }); bounds = await box(arrival);
  check('320 px geliş sahnesi panele sığar', fits(bounds), JSON.stringify(bounds));
  await arrival.scrollIntoViewIfNeeded(); await screenshot('05-arrival-320');
  await page.setViewportSize({ width: 390, height: 844 }); bounds = await box(arrival);
  check('390 px geliş sahnesi panele sığar', fits(bounds), JSON.stringify(bounds));
  await arrival.scrollIntoViewIfNeeded(); await screenshot('06-arrival-390');
  await theme(true); check('Geliş sahnesi koyu temada panel içinde kalır', await arrival.isVisible() && fits(await box(arrival))); await screenshot('06b-arrival-dark'); await theme(false);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.querySelector('[data-testid="arrival-scene"]')?.getAttribute('data-motion') === 'reduced' && document.querySelector('[data-testid="arrival-scene"]')?.getAttribute('data-phase') === 'Takım stadyum girişinde');
  check('Azaltılmış harekette son kare sabit, yeniden oynatma kapalıdır', await arrival.getAttribute('data-motion') === 'reduced' && await arrival.getByRole('button', { name: 'Yeniden Oynat' }).isDisabled() && await arrival.getAttribute('data-phase') === 'Takım stadyum girişinde');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await arrivedialog.getByRole('button', { name: 'Hazırlığa Dön' }).click();
  check('Gelişten dönünce hazırlık kapanmaz ve maç otomatik başlamaz', !(await arrival.count()) && await page.getByRole('button', { name: 'Maça Başla', exact: true }).isVisible());

  // A previously installed production shell and its scene bundle must also work offline.
  await page.evaluate(() => navigator.serviceWorker.ready);
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) await page.reload({ waitUntil: 'load' });
  await context.setOffline(true);
  await page.reload({ waitUntil: 'load' });
  await page.getByRole('button', { name: /Devam Et/ }).first().click();
  await page.getByRole('button', { name: 'Anladım' }).first().click({ timeout: 2500 }).catch(() => {});
  await page.waitForFunction(() => !!document.querySelector('[data-testid="open-arrival"]') || [...document.querySelectorAll('button')].some((button) => button.textContent?.includes('Maç Merkezine Git')));
  if (!(await page.getByTestId('open-arrival').isVisible())) await page.getByRole('button', { name: /Maç Merkezine Git/ }).first().click();
  await page.getByTestId('open-arrival').click();
  const offlineArrival = page.getByTestId('arrival-scene');
  await offlineArrival.getByRole('slider', { name: 'Geliş sahnesi zamanı' }).focus();
  await page.keyboard.press('End');
  check('Üretim paketi ve kayıtla geliş sahnesi çevrimdışı açılır ve son kareye gidilebilir', await offlineArrival.isVisible() && await offlineArrival.getByTestId('arrival-passenger').count() === 6 && Number(await offlineArrival.getByTestId('arrival-stadium-gate').getAttribute('data-open')) === 1);
  await page.getByRole('dialog', { name: 'Stadyuma Geliş' }).getByRole('button', { name: 'Hazırlığa Dön' }).click();
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Simüle Et (hızlı sonuç)' }).click();
  const quick = page.getByRole('dialog', { name: 'Hızlı Simülasyon Sonucu' });
  check('Hızlı sonuç açık kalır; ödül isteğe bağlıdır', await quick.isVisible() && await quick.getByTestId('quick-open-award').isVisible() && !(await quick.getByTestId('match-award').count()));
  await quick.getByTestId('quick-open-award').click();
  const award = page.getByTestId('match-award');
  const winnerId = await award.getAttribute('data-player-id');
  const saved = await waitSave((b) => !!b?.matchReports?.[0]?.playerRows?.[winnerId]);
  const rating = saved.matchReports[0].playerRows[winnerId].rating.toFixed(2);
  check('Ödül oyuncusu ve puanı maçın gerçek arşiv satırıyla aynıdır', !!winnerId && (await award.innerText()).includes(rating));
  check('Türkçe ödül anonsunun altyazısı ve ses kontrolü görünür', /STADYUM ANONSU/.test(await award.innerText()) && /maçın/i.test(await award.innerText()) && await award.getByRole('button', { name: /Tören Sesini Kapat/ }).isVisible());
  bounds = await box(award); check('390 px ödül töreni panel dışına taşmaz', fits(bounds), JSON.stringify(bounds));
  await award.scrollIntoViewIfNeeded(); await screenshot('07-award-390');
  await theme(true); check('Ödül sahnesi koyu temada da okunur ve taşmaz', await award.isVisible() && fits(await box(award))); await screenshot('07b-award-dark'); await theme(false);
  await page.setViewportSize({ width: 320, height: 720 }); bounds = await box(award);
  check('320 px ödül töreni panel dışına taşmaz', fits(bounds), JSON.stringify(bounds));
  await award.scrollIntoViewIfNeeded(); await screenshot('08-award-320');
  if (!process.env.HM26_SKIP_VOICE) {
    await page.waitForFunction(() => performance.getEntriesByType('resource').some((entry) => entry.name.includes('/assets/match/voice/')), null, { timeout: 8000 });
    check('Tören yerel ses kaydını başarıyla ister', voiceResponses.some((response) => response.url.startsWith(base) && response.status === 200), JSON.stringify(voiceResponses));
  }
  await award.getByRole('button', { name: 'Tören Sesini Kapat' }).click();
  check('Tören sesi kapatılabilir', await award.getByRole('button', { name: 'Tören Sesini Aç' }).isVisible());
  await award.getByRole('button', { name: 'Töreni Kapat' }).click();
  check('Tören kapanınca sonuç ve öne çıkanlar açık kalır', await quick.isVisible() && await quick.getByTestId('quick-open-highlights').isVisible());

  // Both award recordings are precached and decodable without a network.
  if (!process.env.HM26_SKIP_VOICE) {
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(async () => { const reg = await navigator.serviceWorker.ready; if (reg.active?.state !== 'activated') await new Promise((resolve) => reg.active?.addEventListener('statechange', resolve, { once: true })); });
    if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) await page.reload({ waitUntil: 'networkidle' });
    await context.setOffline(true);
    await page.reload({ waitUntil: 'load' });
    const clips = await page.evaluate(async () => {
      const ctx = new AudioContext();
      const results = [];
      for (const name of ['award-1', 'award-2']) {
        const response = await fetch(`/assets/match/voice/${name}.mp3`);
        const bytes = await response.arrayBuffer();
        const decoded = await ctx.decodeAudioData(bytes.slice(0));
        const samples = decoded.getChannelData(0);
        let sum = 0; for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
        results.push({ status: response.status, size: bytes.byteLength, duration: decoded.duration, rms: Math.sqrt(sum / samples.length) });
      }
      await ctx.close(); return results;
    });
    check('İki Türkçe anons çevrimdışı önbellekten çözülür ve sessiz değildir', clips.every((clip) => clip.status === 200 && clip.size > 1000 && clip.duration > 1 && clip.rms > .001), JSON.stringify(clips));
    await context.setOffline(false);
  }
  check('Kayıt sürümü 5; yeni sahneler için kalıcı alan eklenmedi', saved.version === 5 && !Object.keys(saved).some((key) => /^(careerTimeline|careerStory|arrivalScene|matchAward|trainingGround)$/i.test(key)));
  check('Tarayıcıda yakalanmamış uygulama hatası yok', errors.length === 0, errors.join(' | '));
} catch (error) { failed++; console.error('❌ E2E akışı kesildi:', error?.stack ?? error); console.error('Sayfa durumu:', (await page.locator('body').innerText().catch(() => '')).slice(0, 2500)); }
finally { await context.setOffline(false).catch(() => {}); await browser.close(); }
console.log(`\nKariyer sahneleri Chromium: ${passed}/${passed + failed} geçti.`);
if (failed) process.exitCode = 1;
