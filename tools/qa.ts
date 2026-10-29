// HM26 Aşama 5 — Otomatik kalite testleri (seedli, CLI)
// Çalıştır: npx --yes tsx tools/qa.ts
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { buildCup } from '../src/data/calendar';
import { simulateMatch, aiDefaultTactic } from '../src/engine/engine';
import { MatchSession } from '../src/engine/session';

const SEED = 20260803;
type T = { name: string; pass: boolean; detail: string };

const results: T[] = [];
const ok = (name: string, pass: boolean, detail: string) => results.push({ name, pass, detail });

// 1) §15.1 1000+ AI maç simülasyon denge (mevcut masssim'in hızlı özeti)
{
  let goals = 0, hw = 0, dr = 0, aw = 0, cupUpset = 0;
  const gecit = CLUBS.filter((c) => c.league === 'gecit');
  for (let i = 0; i < 400; i++) {
    const c1 = gecit[i % gecit.length], c2 = gecit[(i + 5) % gecit.length];
    const r = simulateMatch({ homeClub: c1, awayClub: c2, homeSquad: genSquad(c1, SEED), awaySquad: genSquad(c2, SEED), homeTactic: aiDefaultTactic(c1, c2, c2.strength), awayTactic: aiDefaultTactic(c2, c1, c1.strength), seed: SEED + i, goalPace: 'dengeli', randomness: 'normal' });
    goals += r.stats.hg + r.stats.ag;
    if (r.stats.hg > r.stats.ag) hw++; else if (r.stats.hg === r.stats.ag) dr++; else aw++;
  }
  const avgG = goals / 400;
  const pass = avgG > 1.3 && avgG < 4.2 && hw > aw * 0.85;
  ok('§15.1 Denge 400 maç (Geçit)', pass, `avgG=${avgG.toFixed(2)} ev=${(hw / 400 * 100).toFixed(1)}% ber=${(dr / 400 * 100).toFixed(1)}% dep=${(aw / 400 * 100).toFixed(1)}%`);
}

// 2) MatchSession dayanıklılığı: erken bittirilemez, tüm stepper finalde tutarlı istatistik
{
  const c1 = CLUBS[0], c2 = CLUBS[1];
  const sess = new MatchSession({ homeClub: c1, awayClub: c2, homeSquad: genSquad(c1, SEED), awaySquad: genSquad(c2, SEED), homeTactic: aiDefaultTactic(c1, c2, c2.strength), seed: SEED + 42, goalPace: 'dengeli', randomness: 'normal' });
  let steps = 0;
  while (!sess.done && steps < 300) { sess.step(); steps++; }
  const r = sess.toResult();
  const pass = sess.done && r.stats.possessionCount > 40 && r.stats.hg >= 0 && r.insights.length >= 3 && r.insights.length <= 5 && Object.keys(r.stats.playerRows).length >= 20;
  ok('MatchSession tam maç', pass, `${steps} step, ${r.stats.possessionCount} possession, ${r.insights.length} içgörü, ${Object.keys(r.stats.playerRows).length} oyuncu profili`);
}

// 3) Ekonomi: transfer bütçesi sınır tepkisi (kulüp datadamm bakiye varlığı)
{
  const brokenBudgets = CLUBS.filter((c) => c.transferBudget <= 0 || c.wageBudget <= 0);
  const wageOverrun: string[] = [];
  for (const c of CLUBS) {
    const sq = genSquad(c, SEED);
    const wage = sq.reduce((x, p) => x + p.wage, 0) / 1000;
    if (wage > c.wageBudget * 1.35) wageOverrun.push(`${c.short}: ${wage.toFixed(1)}/${c.wageBudget}`);
  }
  const pass = brokenBudgets.length === 0;
  ok('Ekonomi: kulüp bütçeleri pozitif', pass, `${CLUBS.length} kulüp kontrolü, garipler: ${brokenBudgets.length}`);
  ok('Ekonomi: oluşumda maaş disiplini', wageOverrun.length <= 4, `${wageOverrun.length}/36 aşım (${wageOverrun.slice(0, 3).join(', ') || 'yok'})`);
}

// 4) Sakatlık/ceza üretimi var
{
  const c1 = CLUBS[0], c2 = CLUBS[1];
  let inj = 0, sus = 0;
  for (let i = 0; i < 100; i++) {
    const r = simulateMatch({ homeClub: c1, awayClub: c2, homeSquad: genSquad(c1, SEED), awaySquad: genSquad(c2, SEED), homeTactic: aiDefaultTactic(c1, c2, c2.strength), seed: SEED + i * 7, goalPace: 'dengeli', randomness: 'normal' });
    inj += r.injuries.length; sus += r.suspensions.length;
  }
  const pass = inj > 0 || sus > 0;
  ok('§10.1/10.2 Sakatlık+ceza üretimi', pass, `100 maçta ${inj} sakatlık, ${sus} kırmızı kart cezası`);
}

// 5) Seed determinism (§1.3 tekrarlanabilirlik)
{
  const c1 = CLUBS[0], c2 = CLUBS[1];
  const a = simulateMatch({ homeClub: c1, awayClub: c2, homeSquad: genSquad(c1, SEED), awaySquad: genSquad(c2, SEED), homeTactic: aiDefaultTactic(c1, c2, c2.strength), seed: 12345, goalPace: 'dengeli', randomness: 'normal' });
  const b = simulateMatch({ homeClub: c1, awayClub: c2, homeSquad: genSquad(c1, SEED), awaySquad: genSquad(c2, SEED), homeTactic: aiDefaultTactic(c1, c2, c2.strength), seed: 12345, goalPace: 'dengeli', randomness: 'normal' });
  const pass = a.stats.hg === b.stats.hg && a.stats.ag === b.stats.ag && a.events.length === b.events.length;
  ok('Seed tekrarlanabilirliği', pass, `aynı seed: ${a.stats.hg}-${a.stats.ag} / ${b.stats.hg}-${b.stats.ag}, e=${a.events.length}`);
}

// 6) Kart istatistiği hassas tutarlı (sarı+kırmızı kümülatif) + QA-E3 regressiyonu: kurtarış ≤ rakip isabetli şut
{
  const c1 = CLUBS[0], c2 = CLUBS[1];
  const r = simulateMatch({ homeClub: c1, awayClub: c2, homeSquad: genSquad(c1, SEED), awaySquad: genSquad(c2, SEED), homeTactic: aiDefaultTactic(c1, c2, c2.strength), seed: SEED + 777, goalPace: 'dengeli', randomness: 'normal' });
  const baseOk = r.stats.yellowH >= 0 && r.stats.redH >= 0 && r.stats.cornersH >= 0 && r.stats.foulsH >= 0;
  const savesOk = r.stats.savesH <= r.stats.onA && r.stats.savesA <= r.stats.onH && r.stats.onH <= r.stats.shotsH && r.stats.onA <= r.stats.shotsA;
  const monoOk = r.events.every((e, i, arr) => i === 0 || e.minute >= arr[i - 1].minute);
  ok('İstatistik tamlığı + çapraz denetim', baseOk && savesOk && monoOk, `sarı ${r.stats.yellowH}-${r.stats.yellowA}, kırmızı ${r.stats.redH}-${r.stats.redA}, korner ${r.stats.cornersH}-${r.stats.cornersA}, kurtarış≤isabet=${savesOk}, monoton=${monoOk}`);
}


// ——— Aşama 5 ek: kayıt dışa/içe aktarma + bozulma testi (§A5) ———
import { exportSaveFile, parseImportFile, SAVE_VERSION, SaveBlob, SaveMeta } from '../src/store/persist';

function makeSampleBlob(): { blob: SaveBlob; meta: SaveMeta } {
  const blob = {
    version: SAVE_VERSION, day: 42,
    career: { slot: 1, manager: { name: 'Test Hoca', portrait: 0, background: 'analist', era: 'yerlesik', difficulty: 'dengeli', challengePoints: 40 }, clubId: 'denizli_yesilova', seed: 20260803, day: 42, week: 6, settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true }, pending: { marketShortlist: [], activeProject: null } },
    table: { zirve: [], gecit: [], kok: [] },
    fixtures: [], friendlies: [], cup: buildCup(20260803),
    inbox: [], tactics: [{ id: 'p1', name: 'Ana Plan', formation: '4-3-3', plan: 'dengeli', setPieces: {} }], seasonHistory: [], removedPlayers: [], seasonNo: 1, leagueOf: {},
    playerPatch: {}, budget: { tb: 10 }, pendingBids: [], incomingOffers: [], counterDoneDay: -1, freeAgents: [], transferLog: [], oppMatchDays: {}, seasonFinale: null,
  } as unknown as SaveBlob;
  const meta: SaveMeta = { slot: 1, clubName: 'Denizli Yeşilova SK', managerName: 'Test Hoca', day: 42, updatedAt: Date.now(), version: SAVE_VERSION };
  return { blob, meta };
}

// 7) Dışa/içe aktarma round-trip (§3.4)
{
  const { blob, meta } = makeSampleBlob();
  const f = exportSaveFile(blob, meta);
  // Blob.text() asenkron — Node 20'de await gerekir
  const txt = await (f as unknown as { text: () => Promise<string> }).text();
  const back = parseImportFile(txt);
  const pass = back.blob.career.clubId === blob.career.clubId && back.blob.career.day === 42 && back.blob.version === SAVE_VERSION;
  ok('Kayıt dışa/içe aktarma', pass, `round-trip: club=${back.blob.career.clubId}, day=${back.blob.career.day}`);
}

// 8) Veri bozulma toleransı — bozulmuş JSON reddı beklenir, ama zarif düşmeli
{
  let caught = 0;
  for (const bad of ['', '{', '{"a":1}', '{"format":"wrong","blob":{}}', '[]', 'null']) {
    try { parseImportFile(bad); } catch { caught++; }
  }
  const pass = caught === 6;
  ok('Bozuk kayıt dosyası zarif ret', pass, `${caught}/6 geçersiz format reddedildi`);
}

// 10) v1 → v2 kayıt göçü (SPEC Böl.III): eksik yeni alanlar varsayılanla doldurulur
{
  const { blob, meta } = makeSampleBlob();
  const v1Blob = JSON.parse(JSON.stringify(blob));
  delete (v1Blob.career as Record<string, unknown>).clubFacilities;
  delete (v1Blob.career as Record<string, unknown>).boardConfidence;
  delete (v1Blob.career as Record<string, unknown>).trophyCabinet;
  v1Blob.version = 1;
  const raw = JSON.stringify({ format: 'manager26-save', version: 1, exportedAt: Date.now(), meta, blob: v1Blob });
  const out = parseImportFile(raw);
  const car = out.blob.career as unknown as Record<string, unknown>;
  const pass = out.blob.version === SAVE_VERSION && car.boardConfidence === 70 && !!car.clubFacilities && Array.isArray(car.trophyCabinet);
  ok('v1→güncel sürüm kayıt göçü', pass, `version=${out.blob.version}, boardConfidence=${car.boardConfidence}`);
}

// 9) Gelecek-sürüm reddı (§3.4: ileriden gelen kayıt açılmaz)
{
  const { blob, meta } = makeSampleBlob();
  const raw = JSON.stringify({ format: 'manager26-save', version: SAVE_VERSION + 1, exportedAt: Date.now(), meta, blob });
  let msg = '';
  try { parseImportFile(raw); } catch (e) { msg = (e as Error).message; }
  const pass = msg.includes('Sürüm uyumsuz') || msg.includes('daha yeni');
  ok('Gelecek-versiyon reddı', pass, msg || 'success (unexpected)');
}

// Yazdır + fail olursa exit 1
let failCount = 0;
console.log('\n=== HM26 Aşama 5 Kalite Testi ===\n');
for (const r of results) {
  const mark = r.pass ? '✅' : '❌';
  console.log(`${mark} ${r.name.padEnd(44)} | ${r.detail}`);
  if (!r.pass) failCount++;
}
console.log(`\n${results.length} test, ${failCount} başarısız`);
process.exit(failCount > 0 ? 1 : 0);
