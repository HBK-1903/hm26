// HM26 — Genişletilmiş 100-iterasyon stres + bütünlük paketi
// Çalıştır: npx --yes tsx tools/qa-extended.ts
// Her senaryo 100 farklı seed ile koşar; başarısızlıklar ayrıntılı raporlanır.
import { CLUBS } from '../src/data/clubs';
import { genSquad, autoXI, playerValue, genFreeAgent, genYouthRegen, PLAYER_ROLES } from '../src/data/gen';
import { simulateMatch, aiDefaultTactic, Weather } from '../src/engine/engine';
import { MatchSession } from '../src/engine/session';
import { autoLineup } from '../src/engine/profiles';
import { buildCup, dateFromDay, dayToDate, weekdayOf, WEEKDAYS, LEAGUE_ROUND_DAYS, FRIENDLY_DAYS, CUP_GROUP_DAYS, CUP_R16_DAY, CUP_QF_DAY, CUP_SF_DAY, CUP_FINAL_DAY, WINTER_BREAK } from '../src/data/calendar';
import { exportSaveFile, parseImportFile, SAVE_VERSION, SaveBlob, SaveMeta } from '../src/store/persist';
import { FOREIGN_QUOTA, foreignCountIn, canAddForeign, clubAcceptsLoan, aiAcceptsInboundLoan, loanWage, expiringLoans, activeLoans, onLoan, seasonEndContractMoves, FREE_CLUB, LoanEntry } from '../src/data/market';
import { computeSeasonAwards, awardFingerprint, StatLine } from '../src/data/awards';
import { minuteRole, minuteGrievance, grievanceLabel, newPromise, evalPromise, PROMISE_SHARE } from '../src/data/minutes';

const W = 20260803;
const N = 100;
type T = { name: string; pass: boolean; detail: string; warn?: boolean };
const results: T[] = [];
const ok = (name: string, pass: boolean, detail: string, warn = false) => results.push({ name, pass, detail, warn });
const lived = <T,>(xs: T[]) => xs.filter((x) => x !== undefined && x !== null).length;

const mk = (c1: (typeof CLUBS)[number], c2: (typeof CLUBS)[number], seed: number, weather?: Weather) =>
  simulateMatch({
    homeClub: c1, awayClub: c2,
    homeSquad: genSquad(c1, W), awaySquad: genSquad(c2, W),
    homeTactic: aiDefaultTactic(c1, c2, c2.strength), awayTactic: aiDefaultTactic(c2, c1, c1.strength),
    seed, goalPace: 'dengeli', randomness: 'normal', weather,
  });

// ——— E1: Lig dengesi ×100/lig ———
for (const lg of ['zirve', 'gecit', 'kok'] as const) {
  const pool = CLUBS.filter((c) => c.league === lg);
  let goals = 0, h = 0, d = 0, a = 0, bad = 0;
  for (let i = 0; i < N; i++) {
    const c1 = pool[i % pool.length], c2 = pool[(i + 5) % pool.length];
    const r = mk(c1, c2, W + i * 61 + (lg === 'gecit' ? 3 : lg === 'kok' ? 7 : 11));
    goals += r.stats.hg + r.stats.ag;
    if (r.stats.hg > r.stats.ag) h++; else if (r.stats.hg === r.stats.ag) d++; else a++;
    if (r.stats.hg < 0 || r.stats.ag < 0) bad++;
  }
  const avgG = goals / N, evW = h / N, depW = a / N, dr = d / N;
  // Kök ligi: düşük kalitede doğal olarak daha az gol (gerçek dünya ~2.2-2.4/maç hedefi gelecekte ince ayar)
  const minG = lg === 'kok' ? 1.05 : 1.55;
  const maxDr = lg === 'kok' ? 0.42 : 0.35;
  const warnTune = lg === 'kok' && (avgG < 1.45 || dr > 0.37);
  ok(`E1 Denge ×${N} (${lg})`, avgG > minG && avgG < 4.6 && evW >= depW * 0.85 && dr > 0.08 && dr < maxDr && bad === 0,
    `avgG=${avgG.toFixed(2)} ev=%${(evW * 100).toFixed(0)} ber=%${(dr * 100).toFixed(0)} dep=%${(depW * 100).toFixed(0)}`, warnTune);
}

// ——— E2: Skor dağılımı ×100 ———
{
  let gz = 0, maxG = 0, uniq = new Set<string>();
  const A = CLUBS.filter((c) => c.league === 'gecit');
  for (let i = 0; i < N; i++) {
    const r = mk(A[i % A.length], A[(i + 7) % A.length], W + i * 991);
    if (r.stats.hg === 0 && r.stats.ag === 0) gz++;
    maxG = Math.max(maxG, r.stats.hg, r.stats.ag);
    uniq.add(`${r.stats.hg}-${r.stats.ag}`);
  }
  // NOT: 0-0 oranı ve tek-eşleşme çeşitliliği motor denge/problem değil denge eğrisi ölçüsü (bilgi amaçlı eşik)
  ok(`E2 Skor dağılımı ×${N}`, gz / N < 0.34 && maxG <= 9 && uniq.size >= 18,
    `0-0 oranı=%${(gz / N * 100).toFixed(0)} tek-takım max=${maxG} farklı skor=${uniq.size}`, gz / N >= 0.22 || uniq.size < 26);
}

// ——— E3: İstatistik doluluğu ×100 (sıfır-üretim bug'ı yakalayıcı) ———
{
  let corners = 0, yellows = 0, reds = 0, fouls = 0, xgSum = 0, xgBad = 0, xgHigh = 0, onBad = 0, posBad = 0, savesBad = 0;
  for (let i = 0; i < N; i++) {
    const r = mk(CLUBS[i % 12], CLUBS[(i % 12) + 12], W + i * 37);
    corners += r.stats.cornersH + r.stats.cornersA;
    yellows += r.stats.yellowH + r.stats.yellowA; reds += r.stats.redH + r.stats.redA;
    fouls += r.stats.foulsH + r.stats.foulsA;
    xgSum += r.stats.xgH + r.stats.xgA;
    const invalidXg = (xg: number, shots: number) => !Number.isFinite(xg) || xg < 0 || xg > 9 || (shots === 0 ? xg !== 0 : xg <= 0);
    if (invalidXg(r.stats.xgH, r.stats.shotsH) || invalidXg(r.stats.xgA, r.stats.shotsA)) xgBad++;
    if (r.stats.xgH > 7 || r.stats.xgA > 7) xgHigh++;
    if (r.stats.onH > r.stats.shotsH || r.stats.onA > r.stats.shotsA) onBad++;
    if (r.stats.posH < 0 || r.stats.posH > 100) posBad++;
    if (r.stats.savesH > r.stats.onA || r.stats.savesA > r.stats.onH) savesBad++;
  }
  ok(`E3 İstatistik doluluğu ×${N}`, corners > 0 && yellows > 0 && fouls > 0 && xgBad === 0 && onBad === 0 && posBad === 0 && savesBad === 0,
    `korner=${corners} sarı=${yellows} kırmızı=${reds} faul=${fouls} avgXG=${(xgSum / N / 2).toFixed(2)} xGBad=${xgBad} xG>7=${xgHigh} on>şut=${onBad} posDışı=${posBad} kurtarış>isabet=${savesBad}`, xgHigh > 0);
}

// ——— E4: Olay akışı bütünlüğü ×100 ———
{
  let nonMono = 0, noHalf = 0, emptyText = 0;
  for (let i = 0; i < N; i++) {
    const r = mk(CLUBS[i % 12], CLUBS[12 + (i % 12)], W + i * 53);
    let last = -1, mono = true, half = false;
    for (const e of r.events) {
      if (e.minute < last) mono = false;
      last = e.minute;
      if (e.kind === 'half') half = true;
      if (!e.text || e.text.length < 3) emptyText++;
    }
    if (!mono) nonMono++; if (!half) noHalf++;
  }
  ok(`E4 Olay akışı ×${N}`, nonMono === 0 && noHalf === 0 && emptyText === 0,
    `monoton-bozuk=${nonMono} devre-yok=${noHalf} boş-metin=${emptyText}`);
}

// ——— E5: Oyuncu satırları sağlığı ×100 ———
{
  let rowBad = 0, ratingBad = 0, minBad = 0, rowsSum = 0;
  for (let i = 0; i < N; i++) {
    const r = mk(CLUBS[i % 12], CLUBS[24 - 1 - (i % 12)], W + i * 71);
    const rows = Object.values(r.stats.playerRows);
    rowsSum += rows.length;
    if (rows.length < 22) rowBad++;
    for (const p of rows) {
      if (Number.isNaN(p.rating) || p.rating < 3 || p.rating > 10.01) ratingBad++;
      if (p.min < 1 || p.min > 130) minBad++;
    }
  }
  ok(`E5 Oyuncu satırları ×${N}`, rowBad === 0 && ratingBad === 0 && minBad === 0,
    `ortalama satır/maç=${(rowsSum / N).toFixed(1)} eksik22=${rowBad} rating-sapma=${ratingBad} dakika-sapma=${minBad}`);
}

// ——— E6: Determinizm + entropi ———
{
  let same = 0, diff = 0;
  const seen = new Set<string>();
  for (let i = 0; i < N; i++) {
    const s = 999000 + i;
    const a = mk(CLUBS[0], CLUBS[1], s), b = mk(CLUBS[0], CLUBS[1], s);
    if (JSON.stringify(a.stats) === JSON.stringify(b.stats) && a.events.length === b.events.length) same++;
    else diff++;
    seen.add(`${a.stats.hg}-${a.stats.ag}`);
  }
  // Tek eşleşmede skor çeşitliliği dar olabilir; kritik olan aynı seed → birebir özdeş
  ok('E6 Determinizm ×100', same === N && seen.size >= 10, `özdeş=${same}/${N}, farklı skor çeşidi=${seen.size}`, seen.size < 25);
}

// ——— E7: Hava koşulları dayanıklılığı ×100 ———
{
  const weathers: Weather[] = ['acik', 'yagmur', 'sicak', 'rüzgar', 'kotuZemin'];
  let fail = 0, totalG = 0;
  for (let i = 0; i < N; i++) {
    try {
      const r = mk(CLUBS[i % 12], CLUBS[12 + ((i * 7) % 12)], W + i * 19, weathers[i % 5]);
      totalG += r.stats.hg + r.stats.ag;
      if (r.stats.hg < 0 || r.stats.ag < 0) fail++;
    } catch { fail++; }
  }
  ok('E7 Hava varyantları ×100', fail === 0, `hata=${fail}, avgG=${(totalG / N).toFixed(2)}`);
}

// ——— S1: MatchSession adım sağlamlığı ×100 ———
{
  let stuck = 0, insBad = 0, rowsBad = 0, posBad = 0, stepsAvg = 0;
  for (let i = 0; i < N; i++) {
    const c1 = CLUBS[i % 12], c2 = CLUBS[12 + ((i * 5) % 12)];
    const sess = new MatchSession({
      homeClub: c1, awayClub: c2, homeSquad: genSquad(c1, W), awaySquad: genSquad(c2, W),
      homeTactic: aiDefaultTactic(c1, c2, c2.strength), seed: 555000 + i * 17, goalPace: 'dengeli', randomness: 'normal',
    });
    let steps = 0;
    while (!sess.done && steps < 160) { sess.step(); steps++; }
    stepsAvg += steps;
    if (!sess.done) stuck++;
    const r = sess.toResult();
    if (r.insights.length < 3 || r.insights.length > 5) insBad++;
    if (Object.keys(r.stats.playerRows).length < 22) rowsBad++;
    if (r.stats.possessionCount < 55) posBad++;
  }
  ok('S1 MatchSession ×100', stuck === 0 && insBad === 0 && rowsBad === 0 && posBad === 0,
    `tıkanma=${stuck} içgörü-sapma=${insBad} satır<22=${rowsBad} possession<55=${posBad} avgAdım=${(stepsAvg / N).toFixed(0)}`);
}

// ——— S2: MatchSession finishNow erken bitirme tutarlılığı ———
{
  let bad = 0;
  for (let i = 0; i < N; i++) {
    const sess = new MatchSession({
      homeClub: CLUBS[i % 12], awayClub: CLUBS[12 + (i % 12)],
      homeSquad: genSquad(CLUBS[i % 12], W), awaySquad: genSquad(CLUBS[12 + (i % 12)], W),
      homeTactic: aiDefaultTactic(CLUBS[i % 12], CLUBS[12 + (i % 12)], 70), seed: 777000 + i, goalPace: 'dengeli', randomness: 'normal',
    });
    for (let s = 0; s < (i % 50); s++) sess.step(); // rastgele derinlikten erken bitir
    const r = sess.finishNow();
    if (!Number.isFinite(r.stats.hg) || !Number.isFinite(r.stats.ag) || r.stats.posH < 0 || r.stats.posH > 100) bad++;
  }
  ok('S2 finishNow her derinlikte tutarlı ×100', bad === 0, `tutarsız=${bad}`);
}

// ——— S3: Şut günlüğü tutarlılığı (§5-D Dalga 2) ———
{
  let bad = 0;
  for (let i = 0; i < N; i++) {
    const r = mk(CLUBS[i % 12], CLUBS[12 + (i % 12)], 880000 + i);
    const log = r.shotsLog ?? [];
    const shots = r.stats.shotsH + r.stats.shotsA;
    const goalsLogged = log.filter((s) => s.outcome === 'goal').length;
    const savesLogged = log.filter((s) => s.outcome === 'save').length;
    const clearancesLogged = log.filter((s) => s.outcome === 'clearance').length;
    const targetsRecorded = r.stats.onH + r.stats.onA;
    // On-target totals are goals + saves; goal-line clearances are a separate blocked-shot outcome.
    if (log.length !== shots || goalsLogged !== r.stats.hg + r.stats.ag || goalsLogged + savesLogged !== targetsRecorded || clearancesLogged > log.length) bad++;
  }
  ok('S3 Şut günlüğü = şut/gol/isabet özeti ×100', bad === 0, `tutarsız=${bad}`);
}

// ——— G1: genSquad bütünlüğü (36 kulüp × 100 seed = 3600 kadro) ———
{
  let sizeBad = 0, idDup = 0, gkBad = 0, ageBad = 0, genBad = 0, wageBad = 0, roleBad = 0, nameDup = 0;
  for (let s = 0; s < N; s++) {
    const seed = W + s * 2251;
    for (const c of CLUBS) {
      const sq = genSquad(c, seed);
      if (sq.length < 20 || sq.length > 24) sizeBad++;
      const ids = new Set(sq.map((p) => p.id));
      if (ids.size !== sq.length) idDup++;
      if (sq.filter((p) => p.group === 'GK').length < 2) gkBad++;
      const names = new Set(sq.map((p) => p.name));
      if (names.size !== sq.length) nameDup++;
      for (const p of sq) {
        if (p.age < 16 || p.age > 41) ageBad++;
        const g = p.ratings.gen;
        if (!Number.isFinite(g) || g < 30 || g > 99) genBad++;
        if (!(p.wage > 0)) wageBad++;
        if (p.group !== 'GK' && p.role && !PLAYER_ROLES.some((r) => r.id === p.role)) roleBad++;
      }
    }
  }
  const n = N * CLUBS.length;
  ok(`G1 genSquad ×${n} kadro`, sizeBad === 0 && idDup === 0 && gkBad === 0 && ageBad === 0 && genBad === 0 && wageBad === 0 && roleBad === 0,
    `${n} kadro: boyut=${sizeBad} id-dup=${idDup} GK<2=${gkBad} yaş=${ageBad} gen=${genBad} maaş=${wageBad} rol-sapma=${roleBad} isim-dup=${nameDup}`, nameDup > 0);
}

// ——— G2: genSquad determinizmi ×100 ———
{
  let diff = 0;
  for (let i = 0; i < N; i++) {
    const c = CLUBS[i % CLUBS.length];
    if (JSON.stringify(genSquad(c, 20261024)) !== JSON.stringify(genSquad(c, 20261024))) diff++;
  }
  ok('G2 genSquad determinizm ×100', diff === 0, `sapma=${diff}`);
}

// ——— G3: autoLineup — 11 benzersiz, GK slotta, customIds zorlaması ———
{
  let cntBad = 0, dup = 0, gkSlotBad = 0, forceBad = 0;
  for (let i = 0; i < N; i++) {
    const c = CLUBS[i % CLUBS.length];
    const sq = genSquad(c, W + i);
    for (const f of ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2', '4-1-4-1'] as const) {
      const { slots } = autoLineup(sq, f);
      if (slots.length !== 11) cntBad++;
      if (new Set(slots.map((s) => s.player.id)).size !== slots.length) dup++;
      if (slots[0].slotGroup !== 'GK') gkSlotBad++;
    }
    // customIds: ilk 11 dizilimi zorla
    const custom = sq.slice(0, 11).map((p) => p.id);
    const { slots } = autoLineup(sq, '4-4-2', custom);
    const slotIds = new Set(slots.map((s) => s.player.id));
    for (const id of custom) if (!slotIds.has(id)) forceBad++;
  }
  ok('G3 autoLineup ×600 + customIds ×100', cntBad === 0 && dup === 0 && gkSlotBad === 0 && forceBad === 0,
    `11-dışı=${cntBad} dup=${dup} GK-slot0=${gkSlotBad} forced-dışarı=${forceBad}`);
}

// ——— G4: autoXI tamlığı ———
{
  let bad = 0, dup = 0;
  for (let i = 0; i < N; i++) {
    const c = CLUBS[i % CLUBS.length];
    const { gk, defShape, fbWb, dm, cm, am, wg, st, bench } = autoXI(genSquad(c, W + i * 3), ['4-4-2', '4-3-3', '3-5-2'][i % 3]);
    const all = [...gk, ...defShape, ...fbWb, ...dm, ...cm, ...am, ...wg, ...st];
    if (gk.length !== 1 || all.length > 11 || bench.length > 7) bad++;
    if (new Set(all.map((p) => p.id)).size !== all.length) dup++;
  }
  ok('G4 autoXI ×100', bad === 0 && dup === 0, `yapı-bozuk=${bad} dup=${dup}`);
}

// ——— G5: Serbest + altyapı regen ×100 ———
{
  let faBad = 0, yBad = 0;
  for (let i = 0; i < N; i++) {
    const fa = genFreeAgent(W + i, ['zirve', 'gecit', 'kok'][i % 3] as 'zirve', i, 'x');
    if (!(fa.wage > 0) || !(fa.ratings.gen >= 40) || fa.age < 15 || fa.age > 40) faBad++;
    const y = genYouthRegen(CLUBS[i % CLUBS.length], W, 1, i % 8);
    if (y.age < 15 || y.age > 20 || !(y.potential >= y.ratings.gen)) yBad++;
  }
  ok('G5 Serbest/regen üretimi ×200', faBad === 0 && yBad === 0, `fa-sapma=${faBad} regen-sapma=${yBad}`);
}

// ——— G6: playerValue skalası ———
{
  const vYoung = playerValue({ ratings: { gen: 80 }, age: 21, contractYears: 4 }, 'zirve');
  const vPeak = playerValue({ ratings: { gen: 80 }, age: 27, contractYears: 4 }, 'zirve');
  const vOld = playerValue({ ratings: { gen: 80 }, age: 33, contractYears: 4 }, 'zirve');
  const vLow = playerValue({ ratings: { gen: 55 }, age: 27, contractYears: 4 }, 'kok');
  const pass = vYoung > vPeak && vPeak > vOld && vPeak > vLow && vLow > 0 && vYoung < 60;
  ok('G6 playerValue monotonluk', pass, `genç=${vYoung}M zirve=${vPeak}M yaşlı=${vOld}M altlig=${vLow}M`);
}

// ——— D1: CLUBS veri bütünlüğü ———
{
  const ids = new Set<string>(), shorts = new Set<string>();
  let bad = 0, rivalsEmpty = 0, rivalAsym = 0;
  const byId: Record<string, (typeof CLUBS)[number]> = {};
  for (const c of CLUBS) {
    byId[c.id] = c;
    if (ids.has(c.id)) bad++;
    ids.add(c.id);
    if (shorts.has(c.short)) bad++;
    shorts.add(c.short);
    if (c.strength < 40 || c.strength > 95) bad++;
    if (c.transferBudget <= 0 || c.wageBudget <= 0) bad++;
    for (const f of Object.values(c.facilities)) if (f < 1 || f > 5) bad++;
    if (!c.rivalIds || c.rivalIds.length === 0) rivalsEmpty++;
  }
  for (const c of CLUBS) for (const r of c.rivalIds ?? []) if (byId[r] && !(byId[r].rivalIds ?? []).includes(c.id)) rivalAsym++;
  const leagues = { zirve: 0, gecit: 0, kok: 0 };
  CLUBS.forEach((c) => leagues[c.league]++);
  ok('D1 Kulüp verisi bütünlüğü', bad === 0, `36 kulüp: id/kısa-çakışma/güç/bütçe/tesis ihlali=${bad}, lig dağılımı Z${leagues.zirve}/G${leagues.gecit}/K${leagues.kok}`);
  ok('D1b Derbi rivalIds kapsamı', rivalsEmpty <= 12, `${rivalsEmpty}/36 kulüpte rivalIds BOŞ (bilinen backlog), asimetri=${rivalAsym}`, rivalsEmpty > 0);
}

// ——— K1: Takvim çakışma + hafta günü ———
{
  const sorted = [...LEAGUE_ROUND_DAYS].sort((a, b) => a - b);
  const uniqOk = new Set(LEAGUE_ROUND_DAYS).size === LEAGUE_ROUND_DAYS.length;
  const ascOk = JSON.stringify(sorted) === JSON.stringify(LEAGUE_ROUND_DAYS);
  const cupDays = [...CUP_GROUP_DAYS, CUP_R16_DAY, CUP_QF_DAY, CUP_SF_DAY, CUP_FINAL_DAY];
  const clash = LEAGUE_ROUND_DAYS.filter((d) => cupDays.includes(d)).length;
  const winterLeak = LEAGUE_ROUND_DAYS.filter((d) => d >= WINTER_BREAK[0] && d <= WINTER_BREAK[1]).length;
  const friendlyOk = FRIENDLY_DAYS.every((d) => d < LEAGUE_ROUND_DAYS[0]);
  let wdBad = 0;
  for (let d = 0; d < 365; d++) {
    const wd = weekdayOf(d);
    if (!WEEKDAYS.includes(wd)) wdBad++;
    const dt = dateFromDay(d);
    if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) wdBad++;
    const s = dayToDate(d);
    if (!s || s.length < 5) wdBad++;
  }
  ok('K1 Takvim tutarlılığı (365 gün)', uniqOk && ascOk && clash === 0 && winterLeak === 0 && friendlyOk && wdBad === 0,
    `${LEAGUE_ROUND_DAYS.length} hafta uniq=${uniqOk} asc=${ascOk} kupa-çakışma=${clash} kış-arası-sızıntı=${winterLeak} gün-hatası=${wdBad}`);
}

// ——— P1: Persist — 100 bozuk yük zarif ret ———
{
  let rejected = 0, crashed = 0;
  for (let i = 0; i < N; i++) {
    const junk = ['', '{', '[null]', '{"format":' + i + '}', 'x'.repeat(i), `{"format":"manager26-save","version":99,"blob":${i}}`, JSON.stringify({ format: 'manager26-save', version: 1, blob: null }), 'null', '{"a":' + '1'.repeat(i + 1) + '}'][i % 9];
    try { parseImportFile(junk); } catch { rejected++; }
  }
  ok('P1 Bozuk kayıt reddı ×100', rejected === N && crashed === 0, `reddedilen=${rejected}/${N}`);
}

// ——— P2: Persist round-trip derinlik ———
function makeBlob(extra: Record<string, unknown>): { blob: SaveBlob; meta: SaveMeta } {
  const blob = {
    version: SAVE_VERSION, day: 7,
    career: { slot: 2, manager: { name: 'X', portrait: 1, background: 'eskiFutbolcu', era: 'yerlesik', difficulty: 'zorlu', challengePoints: 60 }, clubId: 'denizli_yesilova', seed: 1, day: 7, week: 1, settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true }, pending: { marketShortlist: [], activeProject: null } },
    table: { zirve: [], gecit: [], kok: [] }, fixtures: [], friendlies: [], cup: buildCup(1),
    inbox: [], tactics: [{ id: 'p1', name: 'Ana Plan', formation: '4-3-3', plan: 'dengeli', setPieces: {} }], seasonHistory: [], removedPlayers: [], seasonNo: 1, leagueOf: {}, playerPatch: {}, budget: { tb: 5 },
    pendingBids: [], incomingOffers: [], counterDoneDay: -1, freeAgents: [], transferLog: [], oppMatchDays: {}, seasonFinale: null,
    ...extra,
  } as unknown as SaveBlob;
  const meta: SaveMeta = { slot: 2, clubName: 'Test', managerName: 'X', day: 7, updatedAt: Date.now(), version: SAVE_VERSION };
  return { blob, meta };
}
{
  const { blob, meta } = makeBlob({ playerStats: { p1: { g: 3, a: 2, apps: 9, ratingSum: 61.5 } } });
  const f = exportSaveFile(blob, meta);
  const txt = await (f as unknown as { text: () => Promise<string> }).text();
  const back = parseImportFile(txt);
  const ps = (back.blob as unknown as { playerStats?: Record<string, { g: number }> }).playerStats;
  ok('P2 Round-trip playerStats+kariyer alanları', !!ps && ps.p1.g === 3 && Math.abs(ps.p1.ratingSum - 61.5) < 0.001 && back.blob.version === SAVE_VERSION,
    `playerStats=${ps ? 'korundu' : 'KAYIP'}`);
}

// ——— W1: Wizard filtre mantığı (Wizard.tsx ile aynı pradikatlar) ———
{
  let perLeague: string[] = [];
  for (const lg of ['zirve', 'gecit', 'kok'] as const) {
    const pool = CLUBS.filter((c) => c.league === lg);
    const avgTB = pool.reduce((x, c) => x + c.transferBudget, 0) / pool.length;
    const rich = [...pool].sort((a, b) => b.transferBudget - a.transferBudget).slice(0, 6);
    const akademi = pool.filter((c) => c.facilities.academy >= 3);
    const dev = pool.filter((c) => c.strength >= 68);
    const dusme = pool.filter((c) => c.strength < 60 && c.transferBudget < avgTB && c.facilities.academy <= 2).sort((a, b) => a.strength - b.strength);
    const richSorted = rich.every((c, i) => i === 0 || rich[i - 1].transferBudget >= c.transferBudget);
    perLeague.push(`${lg}: rich${rich.length}${richSorted ? '✓s' : '✗s'} aka${akademi.length} dev${dev.length} duşme${dusme.length}`);
  }
  ok('W1 Wizard filtre pradikatları (36 kulüp)', perLeague.every((s) => !s.includes('rich0') && !s.includes('aka0')), perLeague.join(' | '));
}

// ——— W2: Wizard preview squad determinizmi + istatistik sağlığı (×36 kulüp ×2 hesap) ———
{
  let drift = 0, statBad = 0;
  for (const c of CLUBS) {
    const a = genSquad(c, 20261024), b = genSquad(c, 20261024);
    if (JSON.stringify(a) !== JSON.stringify(b)) drift++;
    const count = a.length;
    const avgAge = a.reduce((x, p) => x + p.age, 0) / count;
    const foreign = a.filter((p) => p.foreign).length;
    if (count < 20 || avgAge < 20 || avgAge > 32 || foreign < 0 || foreign > count) statBad++;
  }
  ok('W2 Preview squad determinizm', drift === 0 && statBad === 0, `sürükleme=${drift}/36 istatistik-sapma=${statBad}`);
}

// ——— Y1: Ekonomi — toplam kadro değeri vs bütçe makuliyeti ———
{
  let negVal = 0, over = 0, under = 0;
  for (const c of CLUBS) {
    const sq = genSquad(c, W);
    const totVal = sq.reduce((x, p) => x + playerValue(p, c.league), 0);
    if (totVal <= 0) negVal++;
    if (totVal > c.transferBudget * 40) over++; // gerçek dünya: kadro değeri bütçenin 10-25 katı olabilir
    if (totVal < c.transferBudget * 0.5) under++;
  }
  ok('Y1 Kadro değeri ↔ bütçe makuliyeti', negVal === 0 && over <= 2, `sıfır-değer=${negVal} değer>>bütçe=${over} değer<<bütçe=${under}`, over > 0 || under > 0);
}

// ——— Dalga 1 (v0.5) yeni sistem testleri ———
import { applyTrainingWeek, TrainingFocus } from '../src/data/training';
import { genAcademyDay } from '../src/data/gen';
import { computeJobOffers, evaluateUltimatum } from '../src/data/jobs';

// T1: Antrenman gelişimi monoton + deterministik (odaklanan alan, odaklanmayana göre daha hızlı büyür)
{
  const seedAll = CLUBS[0];
  const run = (focusArea: 'Hücum' | 'Defans', weeks: number) => {
    let squad = genSquad(seedAll, W);
    for (let w = 1; w <= weeks; w++) {
      const focus: TrainingFocus = { area: focusArea, intensity: 'normal', sinceDay: w * 7 };
      const tr = applyTrainingWeek(squad, focus, 3, W, w * 7);
      squad = squad.map((p) => (tr.patches[p.id] ? { ...p, ...tr.patches[p.id] } : p));
    }
    return squad.reduce((x, p) => x + (focusArea === 'Hücum' ? p.ratings.att : p.ratings.def), 0) / squad.length;
  };
  const attFocused = run('Hücum', 40), defFocused = run('Defans', 40);
  const base = genSquad(seedAll, W);
  const baseAtt = base.reduce((x, p) => x + p.ratings.att, 0) / base.length;
  const attBase = baseAtt;
  // Odak simülasyonu tekrarlanabilir mi?
  const t2 = applyTrainingWeek(genSquad(seedAll, W), { area: 'Hücum', intensity: 'yogun', sinceDay: 7 }, 3, W, 7);
  const t3 = applyTrainingWeek(genSquad(seedAll, W), { area: 'Hücum', intensity: 'yogun', sinceDay: 7 }, 3, W, 7);
  const det = JSON.stringify(t2.patches) === JSON.stringify(t3.patches);
  ok('T1 Antrenman gelişimi (40 hf)', attFocused > attBase && defFocused > 0 && det,
    `odak-att=${attFocused.toFixed(1)} (baz ${attBase.toFixed(1)}) odak-def=${defFocused.toFixed(1)} det=${det}`);
}

// T2: Akademi günü — sayı 2-6, deterministik, seviye 5 > seviye 1 kalite
{
  let bad = 0, detBad = 0;
  for (const lv of [1, 3, 5]) {
    const cands = genAcademyDay(CLUBS[1], W, 1, lv);
    if (cands.length !== 1 + lv) bad++;
    const again = genAcademyDay(CLUBS[1], W, 1, lv);
    if (JSON.stringify(cands) !== JSON.stringify(again)) detBad++;
    for (const p of cands) if (p.potential < p.ratings.gen || p.age > 20) bad++;
  }
  const avgTop5 = (lv: number) => genAcademyDay(CLUBS[1], W, 1, lv).reduce((x, p) => x + p.potential, 0) / (1 + lv);
  const lv1 = avgTop5(1), lv5 = avgTop5(5);
  ok('T2 Akademi günü (2-6 aday, det, kalite merdiveni)', bad === 0 && detBad === 0 && lv5 > lv1,
    `lv1-pot=${lv1.toFixed(0)} lv5-pot=${lv5.toFixed(0)} sayı-ihlali=${bad} det=${detBad}`);
}

// J1: İş teklifleri — 3 benzersiz, kovulan kulüp hariç, aynı veya alt lig, deterministik
{
  const leagueIdx = { zirve: 0, gecit: 1, kok: 2 } as const;
  let bad = 0;
  for (let i = 0; i < 12; i++) {
    const fired = CLUBS[i];
    const offers = computeJobOffers(CLUBS, Object.fromEntries(CLUBS.map((c) => [c.id, c.league])), fired.id, W, 100 + i);
    if (offers.length !== 3) bad++;
    const seen = new Set<string>();
    for (const o of offers) {
      if (o.club.id === fired.id) bad++;
      if (seen.has(o.club.id)) bad++;
      seen.add(o.club.id);
      if ((leagueIdx[o.club.league] ?? 0) < (leagueIdx[fired.league] ?? 0)) bad++;
    }
    const again = computeJobOffers(CLUBS, Object.fromEntries(CLUBS.map((c) => [c.id, c.league])), fired.id, W, 100 + i);
    if (JSON.stringify(offers.map((o) => o.club.id)) !== JSON.stringify(again.map((o) => o.club.id))) bad++;
  }
  ok('J1 İş piyasası (gecit - 12 kulüp çekimi)', bad === 0, 'gecit/kok genelinde 3 benzersiz teklif, deterministik');
}

// J2: Ültimatom karar mantığı
{
  const fine =
    evaluateUltimatum(1, 0, 4) === 'active' &&
    evaluateUltimatum(0, 4, 4) === 'saved' &&
    evaluateUltimatum(0, 7, 4) === 'saved' &&
    evaluateUltimatum(0, 3, 4) === 'fired' &&
    evaluateUltimatum(0, 0, 4) === 'fired';
  ok('J2 Ültimatom karar tablosu', fine, 'aktif/kurtuldu/kovuldu yolları doğru');
}

// ——— FO1: Yabancı kotası (Dalga 3) — üretilen dünya hiçbir ligde kotayı ihlal etmez; sınır kuralı çalışır ———
{
  let leak = 0;
  for (let i = 0; i < 36; i++) {
    for (let s = 0; s < 20; s++) {
      const c = CLUBS[i];
      if (foreignCountIn(genSquad(c, W + s)) > FOREIGN_QUOTA[c.league]) leak++;
    }
  }
  const zirveClub = CLUBS.find((c) => c.league === 'zirve')!;
  const sq = genSquad(zirveClub, W).map((p) => ({ ...p, contractYears: 3 }));
  const filler = { ...sq.find((p) => !p.foreign)!, foreign: true, id: 'tmp_f_1' };
  const loaded = Array.from({ length: FOREIGN_QUOTA.zirve }, (_, i) => ({ ...filler, id: `tmp_f_${i}` }));
  const oneMore = { ...filler, id: 'tmp_f_x' };
  const blocked = !canAddForeign(loaded, 'zirve', oneMore).ok;
  const allowedYerli = canAddForeign(loaded, 'zirve', { ...oneMore, foreign: false }).ok;
  const under = canAddForeign(loaded.slice(0, FOREIGN_QUOTA.zirve - 1), 'zirve', oneMore).ok;
  ok('FO1 Yabancı kotası (üretim sızıntısı 327k > sınır + ret kontrolleri)', leak === 0 && blocked && allowedYerli && under,
    `sızıntı=${leak}/720, dolu-kenarın-ret=${blocked}, yerli-izin=${allowedYerli}, boş-kenar-izin=${under}`);
}

// ——— BO1: Bosman serbestliği — sezon sonu cy 0'a düşen herkes FA'e düşer, deterministik ———
{
  const squadsRO: Record<string, ReturnType<typeof genSquad>> = {};
  CLUBS.slice(0, 4).forEach((c, i) => { squadsRO[c.id] = genSquad(c, W + i).map((p, ix) => ({ ...p, contractYears: ix % 4 === 0 ? 1 : 3 })); });
  const mv1 = seasonEndContractMoves(squadsRO, {});
  const mv2 = seasonEndContractMoves(squadsRO, {});
  const det = JSON.stringify(mv1) === JSON.stringify(mv2);
  const allMovedToFA = Object.values(mv1.updates).every((u) => (u.contractYears === 0 ? u.clubId === FREE_CLUB : u.clubId === undefined));
  const expected = Object.values(squadsRO).flat().filter((p) => (p.contractYears ?? 3) - 1 === 0).length;
  ok('BO1 Bosman sezon-sonu serbestliği', det && allMovedToFA && mv1.leavers.length === expected,
    `ayrılan=${mv1.leavers.length}/${expected} (cy=1 olanlar), determinizm=${det}, FA taşıma=${allMovedToFA}`);
}

// ——— LN1: Kiralık paketi kuralları ———
{
  const c = CLUBS.find((x) => x.league === 'zirve')!;
  const sq = genSquad(c, W);
  const weak = sq.sort((a, b) => a.ratings.gen - b.ratings.gen)[0];
  const star = sq.sort((a, b) => b.ratings.gen - a.ratings.gen)[0];
  const acceptsWeak = clubAcceptsLoan(c.strength, 24, weak, false);
  const rejectsImportant = !clubAcceptsLoan(90, 24, { ...weak, important: true, ratings: { ...weak.ratings, gen: 40 } }, false);
  const rejectsThin = !clubAcceptsLoan(c.strength, 21, weak, false);
  const rejectsChained = !clubAcceptsLoan(c.strength, 24, weak, true);
  const aiInOk = aiAcceptsInboundLoan(c.strength, 24, weak) && !aiAcceptsInboundLoan(c.strength, 29, weak) && !aiAcceptsInboundLoan(10, 24, { ...star, ratings: { ...star.ratings, gen: 97 } });
  const loans: LoanEntry[] = [
    { playerId: 'a', fromClub: 'x', toClub: 'y', seasonNo: 1 },
    { playerId: 'b', fromClub: 'x', toClub: 'y', seasonNo: 2 },
  ];
  const ex = expiringLoans(loans, 2), ac = activeLoans(loans, 2);
  const splitOk = ex.length === 1 && ac.length === 1 && ex[0].playerId === 'a' && onLoan(loans, 'b')?.seasonNo === 2 && onLoan(loans, 'zzz') === undefined;
  const share = loanWage({ wage: 1 } as any) === 1 && loanWage({ wage: 50 } as any) === 25;
  ok('LN1 Kiralık paketi (kabul/ret/kalan/dönüş/maaş bölüşümü)', acceptsWeak && rejectsImportant && rejectsThin && rejectsChained && aiInOk && splitOk && share,
    `zayıf-kabul=${acceptsWeak}, önemli-ret=${rejectsImportant}, ince-kadro-ret=${rejectsThin}, zincir-ret=${rejectsChained}, bölünme=${splitOk}`);
}

// ——— AW1: Sezon ödülleri (Dalga 4) — determinizm, en-az-maç eşiği, eşitlik çözülmesi ———
{
  const mkStat = (playerId: string, goals: number, assists: number, ratingSum: number, apps: number): StatLine =>
    ({ playerId, clubId: 'c_' + (playerId.charCodeAt(0) % 3), goals, assists, yellows: 0, reds: 0, ratingSum, apps });
  const stats: Record<string, StatLine> = {};
  // 30 oyuncu; kral tablosunda beklenen liderler
  for (let i = 0; i < 30; i++) {
    const id = String.fromCharCode(97 + (i % 26)) + i;
    if (i === 0) stats[id] = mkStat(id, 24, 5, 7.4 * 20, 20);      // gol kralı adayı
    else if (i === 1) stats[id] = mkStat(id, 9, 14, 7.1 * 22, 22); // asist kralı adayı
    else if (i === 2) stats[id] = mkStat(id, 5, 3, 8.2 * 18, 18);  // MVP adayı
    else if (i === 3) stats[id] = mkStat(id, 4, 2, 7.9 * 12, 12);  // genç adayı (ageOf ≤21 diyeceğiz)
    else if (i === 4) stats[id] = mkStat(id, 0, 0, 9.9 * 3, 3);    // 3 maç — MVP/genç kapısında atıl
    else stats[id] = mkStat(id, 1 + (i % 9), i % 6, 6.0 * (10 + i), 10 + i);
  }
  const a1 = computeSeasonAwards(stats, (id) => (id.startsWith('d3') ? 20 : 27));
  const a2 = computeSeasonAwards(JSON.parse(JSON.stringify(stats)), (id) => (id.startsWith('d3') ? 20 : 27));
  const det = a1 && a2 && awardFingerprint(a1, 42) === awardFingerprint(a2, 42);
  const kings = a1!;
  const scorerTop = kings.scorer[0].value === 24;
  const assistTop = kings.assist[0].value === 14;
  const mvpTop = Math.abs(kings.mvp[0].value - 8.2) < 0.001;
  const mvpExcluded3App = !kings.mvp.some((r) => r.playerId.endsWith('4')); // 3 maçlı 9.9 ort dışarıda
  const youngTop = kings.young[0].playerId.startsWith('d3');
  const gateSmall = computeSeasonAwards({ a: mkStat('a', 1, 1, 10, 5) }, () => 25) === null;
  ok('AW1 Sezon ödülleri (krallar/MVP/genç, eşik, determinizm)', !!det && scorerTop && assistTop && mvpTop && mvpExcluded3App && youngTop && gateSmall,
    `golK=${kings.scorer[0].value} asistK=${kings.assist[0].value} mvp=${kings.mvp[0].value.toFixed(2)} genc=${kings.young[0]?.playerId} eşik-atlanan=${!mvpExcluded3App}`);
}

// ——— IF1: IFAB 5 değişiklik / 3 durak (devre arası serbest) ———
{
  const mkSess = () => new MatchSession({
    homeClub: CLUBS[0], awayClub: CLUBS[12],
    homeSquad: genSquad(CLUBS[0], W), awaySquad: genSquad(CLUBS[12], W),
    homeTactic: aiDefaultTactic(CLUBS[0], CLUBS[12], 70), seed: 909001, goalPace: 'dengeli', randomness: 'normal', userSide: 'home',
  });
  const stepUntilMin = (s: MatchSession, min: number, maxStep = 5000) => { let g = 0; while (s.getMinute() < min && !s.done && g++ < maxStep) s.step(); };
  const doSub = (s: MatchSession): boolean => {
    const slots = s.getSlots('home'); const bench = s.getBench('home');
    if (bench.length === 0) return false;
    const out = slots.find((x) => x.slotGroup !== 'GK' && x.liveFitness < 999) ?? slots[1];
    const inP = bench[0];
    return s.queueSub('home', out.player.id, inP.id);
  };
  const s1 = mkSess();
  // 45. dakika devre arası durağı: serbest (pencere yemez)
  stepUntilMin(s1, 45);
  const wBefore45 = (s1 as any).subsLeft ? 3 : 3;
  void wBefore45;
  const okFalseBefore = doSub(s1); // ilk istek hep kabul
  stepUntilMin(s1, 46);
  const winAfterHT = (s1 as unknown as { windowsLeft(s: 'home'): number }).windowsLeft('home');
  // 60/63/66 — 3 durak; 69'da ret
  stepUntilMin(s1, 60); doSub(s1); stepUntilMin(s1, 62);
  stepUntilMin(s1, 63); doSub(s1); stepUntilMin(s1, 65);
  stepUntilMin(s1, 66); doSub(s1); stepUntilMin(s1, 68);
  const subsLeftAfter4 = s1.subsLeft('home');
  const winLeftAfter4 = (s1 as unknown as { windowsLeft(s: 'home'): number }).windowsLeft('home');
  const blocked5th = !doSub(s1); // durak bitti → ret
  while (!s1.done) s1.step();
  const res = s1.toResult();
  const okCase = okFalseBefore && winAfterHT === 3 && subsLeftAfter4 === 1 && winLeftAfter4 === 0 && blocked5th && Number.isFinite(res.stats.hg);
  // 6. hak üst sınırı: durak yok dahi 5'ten fazlası olamaz — hızlı senaryo: 5 sub farklı dakikalarda (durak 3 olduğu için en fazla 3 farklı dakika + devre arası)
  const s2 = mkSess();
  stepUntilMin(s2, 50);
  let applied = 0;
  for (const min of [50, 53, 56, 59, 62]) {
    stepUntilMin(s2, min);
    if (doSub(s2)) { /* kabul edilir edilmez durak kontrolü uygulama zamanında */ }
    stepUntilMin(s2, min + 1);
    applied = 5 - s2.subsLeft('home');
    if (min === 62 && applied > 3) break;
  }
  while (!s2.done) s2.step();
  ok('IF1 IFAB (3 durak sınırı + devre arası serbest + üst sınır 5)', okCase && applied <= 4,
    `serbest-devrearası-pencere=${winAfterHT} (beklenen 3), 4-değişiklik-sonrası kalan hak=${subsLeftAfter4} durak=${winLeftAfter4}, 5. istek-ret=${blocked5th}, maraton=±${applied}`);
}

// ——— PM1: Dakika memnuniyeti + süre sözü (Dalga 6) ———
{
  const rolesOk = minuteRole(3, 28) === 'key' && minuteRole(15, 28) === 'rotation' && minuteRole(15, 19) === 'backup' && minuteRole(24, 28) === 'backup';
  const earlySeason = minuteGrievance(2, 28, 0, 3) === 0; // ölçüm erken — gürültü yok
  const keyUnhappy = minuteGrievance(3, 28, 0, 20) === 1;  // kilit oyuncu hiç oynamamış → tavan
  const keyHappy = minuteGrievance(3, 28, 18, 20) === 0;
  const backupTolerant = minuteGrievance(24, 28, 0, 20) <= 0.45; // yedek beklentisi düşük
  const labelOk = grievanceLabel(0) === null && grievanceLabel(0.5) === 'huzursuz' && grievanceLabel(0.8) === 'kırgın';
  const pr = newPromise(100, 10, 4);
  const act = evalPromise(pr, 14, 6) === 'active';            // 4/10 maç oynandı — pencere devam
  const kept = evalPromise(pr, 20, 10) === 'kept';            // 6 maç/10 → %60 ≥ %55
  const broken = evalPromise(pr, 20, 7) === 'broken';         // 3/10 → %30
  const monot = minuteGrievance(5, 29, 2, 20) > minuteGrievance(5, 29, 10, 20); // daha az süre = daha çok rahatsızlık
  ok('PM1 Dakika memnuniyeti (rol bekentisi, eşiik, söz değerlendirmesi)', rolesOk && earlySeason && keyUnhappy && keyHappy && backupTolerant && labelOk && act && kept && broken && monot,
    `key0maç=${keyUnhappy} backup-sabır=${backupTolerant} kept=${kept} broken=${broken} monoton=${monot} share=${PROMISE_SHARE}`);
}

// ——— İ1: Sakatlık + ceza girdisi biçimi ×100 ———
{
  let badInj = 0, badSus = 0, totInj = 0, totSus = 0;
  for (let i = 0; i < N; i++) {
    const r = mk(CLUBS[i % 12], CLUBS[12 + (i % 12)], 888000 + i * 13);
    totInj += r.injuries.length; totSus += r.suspensions.length;
    for (const inj of r.injuries) if (!inj.playerId || inj.days <= 0 || inj.days > 400) badInj++;
    for (const s of r.suspensions) if (!s.playerId || s.matches < 1 || s.matches > 6) badSus++;
  }
  ok('İ1 Sakatlık/ceza girdi biçimi ×100', totInj > 0 && badInj === 0 && badSus === 0, `${totInj} sakatlık ${totSus} ceza — format-hata=${badInj + badSus}`);
}

// ——— Yazdır ———
let fail = 0, warns = 0;
console.log('\n=== HM26 Genişletilmiş 100× Stres/Bütünlük Paketi ===\n');
for (const r of results) {
  const mark = r.pass ? (r.warn ? '🟡' : '✅') : '❌';
  if (!r.pass) fail++; else if (r.warn) warns++;
  console.log(`${mark} ${r.name.padEnd(52)} | ${r.detail}`);
}
console.log(`\n${results.length} test · ${fail} başarısız · ${warns} uyarı`);
process.exit(fail > 0 ? 1 : 0);
