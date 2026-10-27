// HM26 — Dalga 0 düzeltmeleri QA:
// 1) İsim kara listesi (Modric ve gerçek futbolcu adları üretilmez)
// 2) Kaleci sakatlık/kırmızı kart: gol yeme/kurtarış asla savunmacıya yazılmaz
// 3) Maaş bütçesi dengelemeleri yalnız hedef kulüplerde
// 4) Ortak dünya tarihçesi: 2025 demiri, tek sezonluk lig geçişleri, sıra benzersizliği, determinizm
// Çalıştırma: npx tsx tools/qa-wave0-fixes.ts
import { CLUBS } from '../src/data/clubs';
import { genSquad, genFreeAgent, genYouthRegen } from '../src/data/gen';
import { REAL_PLAYER_BLACKLIST, isBlacklistedName, FOREIGN_SURNAME } from '../src/data/names';
import { aiDefaultTactic } from '../src/engine/engine';
import { MatchSession } from '../src/engine/session';
import { clubArchive, archiveSummary } from '../src/data/history';
import type { LeagueId } from '../src/types';

const results: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail = '') => results.push({ name, pass, detail });

// ——— 1. İsim güvenliği ———
{
  check("'Modric' yabancı soyad havuzundan çıkarıldı", !FOREIGN_SURNAME.includes('Modric'), `havuz: ${FOREIGN_SURNAME.join(',')}`);
  check('Kara liste dolu ve sorgulayıcı çalışıyor', REAL_PLAYER_BLACKLIST.size >= 15 && isBlacklistedName(' Luka Modric '));

  let blacklistHits = 0;
  let modricHits = 0;
  const total = new Set<string>();
  for (const club of CLUBS) {
    for (let seed = 1; seed <= 8; seed++) {
      for (const p of genSquad(club, seed * 7919)) {
        total.add(p.name);
        if (isBlacklistedName(p.name)) blacklistHits++;
        if (p.name.includes('Modric')) modricHits++;
      }
    }
  }
  for (let seed = 1; seed <= 400; seed++) {
    const fa = genFreeAgent(seed * 131, 'zirve', seed % 8, CLUBS[seed % CLUBS.length].id);
    const yr = genYouthRegen(CLUBS[seed % CLUBS.length], seed, 2, seed % 9);
    for (const n of [fa.name, yr.name]) {
      total.add(n);
      if (isBlacklistedName(n)) blacklistHits++;
      if (n.includes('Modric')) modricHits++;
    }
  }
  check('Üretilen hiçbir isim kara listeye düşmüyor', blacklistHits === 0, `${total.size} benzersiz isim tarandı, vaka=${blacklistHits}`);
  check('Hiçbir üretilen isim "Modric" içermiyor', modricHits === 0);
}

// ——— 2. Kaleci istatistik bütünlüğü ———
function buildSession(seed: number) {
  const home = CLUBS[seed % CLUBS.length];
  const away = CLUBS[(seed * 7 + 3) % CLUBS.length];
  const input = {
    homeClub: home, awayClub: away,
    homeSquad: genSquad(home, seed + 101), awaySquad: genSquad(away, seed + 202),
    homeTactic: aiDefaultTactic(home, away, away.strength),
    awayTactic: aiDefaultTactic(away, home, home.strength),
    seed, goalPace: 'yuksek' as const, randomness: 'high' as const, userSide: 'home' as const,
    derby: home.derby === away.id, challengeClubId: home.id, challengePoints: 0, riskIds: [],
  };
  return new MatchSession(input);
}

{
  let outfieldConceded = 0;
  let outfieldSaves = 0;
  let gkConcededMismatch = 0;
  let sessionsChecked = 0;
  for (let seed = 1; seed <= 24; seed++) {
    const session = buildSession(seed * 37);
    // Her iki takımın kalecisini maç başlamadan saha dışına it (sakatlık + kırmızı kart karışık)
    for (const side of ['home', 'away'] as const) {
      const gk = session.getSlots(side).find((s) => s.slotGroup === 'GK');
      if (!gk) continue;
      if (seed % 2 === 0) gk.injured = true;
      else gk.sentOff = true;
    }
    session.finishNow();
    const res = session.toResult();
    sessionsChecked++;
    for (const [pid, row] of Object.entries(res.stats.playerRows)) {
      if (row.posGroup !== 'GK') {
        if ((row.conceded ?? 0) > 0) outfieldConceded++;
        if (row.saves > 0) outfieldSaves++;
      }
    }
    // Takımın yediği gol sayısı ile GK satırlarındaki conceded toplamı örtüşmeli
    const gkRows = Object.values(res.stats.playerRows).filter((r) => r.posGroup === 'GK');
    const concededTotal = gkRows.reduce((sum, r) => sum + (r.conceded ?? 0), 0);
    if (concededTotal !== res.stats.hg + res.stats.ag) gkConcededMismatch++;
  }
  check('GK saha dışındayken hiçbir savunmacıya gol yeme yazılmıyor', outfieldConceded === 0, `24 oturum, hatalı satır=${outfieldConceded}`);
  check('GK saha dışındayken hiçbir savunmacıya kurtarış yazılmıyor', outfieldSaves === 0, `hatalı satır=${outfieldSaves}`);
  check('Yenen goller hep GK satırlarında toplanıyor', gkConcededMismatch === 0, `${sessionsChecked} oturumda mutabakat`);
}

// Normal maçlarda da GK istatistiği mantıklı kalmalı (regresyon koruması)
{
  let anomalies = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const session = buildSession(seed * 53);
    session.finishNow();
    const res = session.toResult();
    for (const row of Object.values(res.stats.playerRows)) {
      if (row.posGroup !== 'GK' && ((row.conceded ?? 0) > 0 || row.saves > 0)) anomalies++;
    }
  }
  check('Normal oturumlarda GK dışı oyuncu kurtarış/gol yeme almıyor', anomalies === 0);
}

// ——— 3. Bütçe dengelemeleri ———
{
  const byId = new Map(CLUBS.map((c) => [c.id, c]));
  check('Ordu Boztepe maaş bütçesi 0.78M', byId.get('ordu_boztepe')!.wageBudget === 0.78);
  check('Konya Ova maaş bütçesi 2.60M', byId.get('konya_ova')!.wageBudget === 2.6);
  check('İstanbul Kule bütçesi değişmedi (1.6M)', byId.get('ist_kule')!.wageBudget === 1.6);
  check('Sivas Kızılkaya bütçesi değişmedi (0.42M)', byId.get('sivas_kizilkaya')!.wageBudget === 0.42);
  check('Tüm bütçeler pozitif', CLUBS.every((c) => c.wageBudget > 0 && c.transferBudget > 0));
}

// ——— 4. Ortak dünya tarihçesi ———
{
  const order: LeagueId[] = ['kok', 'gecit', 'zirve'];
  const level = (lg: LeagueId) => order.indexOf(lg);
  let anchorFail = 0;
  let jumpFail = 0;
  let rankFail = 0;
  let spanFail = 0;
  let noteFail = 0;
  for (const c of CLUBS) {
    const rows = clubArchive(c); // en yeni başta
    const newest = rows[0];
    if (newest.year !== 2025 || newest.league !== c.league) anchorFail++;
    const founded = Math.max(1980, c.founded);
    if (rows[rows.length - 1].year !== founded) spanFail++;
    if (rows.length !== 2025 - founded + 1) spanFail++;
    // ardışık sezonlarda en fazla 1 lig değişimi
    for (let i = 0; i < rows.length - 1; i++) {
      if (Math.abs(level(rows[i].league) - level(rows[i + 1].league)) > 1) jumpFail++;
    }
    // notlar ile lig hareketi uyumlu
    for (let i = 0; i < rows.length - 1; i++) {
      const up = level(rows[i].league) > level(rows[i + 1].league);
      const down = level(rows[i].league) < level(rows[i + 1].league);
      if (up && rows[i + 1].note !== '🏆 Şampiyon' && !rows[i + 1].note?.startsWith('⬆️')) noteFail++;
      if (down && rows[i + 1].note !== '⬇️ Düşüş') noteFail++;
    }
  }
  check('2025 satırı her kulübü gerçek liginde demirliyor', anchorFail === 0);
  check('Hiçbir kulüp bir sezonda 2 lig atlamıyor', jumpFail === 0);
  check('Arşiv kulübün kuruluş yılından 2025’e kesintisiz uzanıyor', spanFail === 0);
  check('Yükselme/düşme notları lig hareketiyle uyumlu', noteFail === 0);

  // (yıl, lig) bazında sıralar benzersiz ve 1..N
  const matrix = new Map<string, typeof CLUBS[number][]>();
  for (const c of CLUBS) {
    for (const r of clubArchive(c)) {
      const key = `${r.year}:${r.league}`;
      if (!matrix.has(key)) matrix.set(key, []);
      matrix.get(key)!.push(c);
    }
  }
  for (const c of CLUBS) {
    const byYear = new Map(clubArchive(c).map((r) => [r.year, r]));
    for (const [key, members] of matrix) {
      const [y, lg] = key.split(':');
      const ranks = members.map((m) => clubArchive(m).find((r) => r.year === Number(y) && r.league === (lg as LeagueId))!.rank).sort((a, b) => a - b);
      const expected = members.map((_, i) => i + 1);
      if (JSON.stringify(ranks) !== JSON.stringify(expected)) { rankFail++; break; }
      void byYear;
    }
  }
  check('Her (yıl, lig) içinde sıralar 1..N benzersiz', rankFail === 0);

  // determinizm
  const a = JSON.stringify(clubArchive(CLUBS[0]));
  const b = JSON.stringify(clubArchive(CLUBS[0]));
  check('Tarihçe deterministik (aynı girdi → aynı çıktı)', a === b);
  const summary = archiveSummary(CLUBS[0]);
  check('Özet hesapları çalışıyor', summary.rows.length > 30 && typeof summary.titles === 'number');
}

// ——— Rapor ———
let failed = 0;
for (const r of results) {
  console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.detail ? ` | ${r.detail}` : ''}`);
  if (!r.pass) failed++;
}
console.log(`\nDALGA0-QA: ${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
