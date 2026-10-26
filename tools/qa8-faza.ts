// HM26 — v0.9.5 Şartname FAZ A doğrulaması: kaleci conceded / clean-sheet zinciri
// Çalıştır: npx --yes tsx tools/qa8-faza.ts
import { MatchSession } from '../src/engine/session';
import { aiDefaultTactic } from '../src/engine/engine';
import { CLUBS } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';

let failures = 0;
const ok = (n: string, c: boolean, x = '') => { console.log((c ? '✅ ' : '❌ ') + n + (x ? ` | ${x}` : '')); if (!c) failures++; };
const W = 999000;
const N = 60;

// F1: kaleci conceded toplamı == rakip gol; clean-sheet sayım mantığı doğru
{
  let wrong = 0, nonGK = 0, benchLeak = 0, cleanSheets = 0, gkSeen = 0;
  for (let i = 0; i < N; i++) {
    const c1 = CLUBS[i % 12], c2 = CLUBS[12 + ((i * 7) % 12)];
    const hs = genSquad(c1, W + i), as = genSquad(c2, W + i);
    const sess = new MatchSession({
      homeClub: c1, awayClub: c2, homeSquad: hs, awaySquad: as,
      homeTactic: aiDefaultTactic(c1, c2, c2.strength), seed: 660000 + i * 13, goalPace: 'dengeli', randomness: 'normal',
    });
    let steps = 0;
    while (!sess.done && steps < 160) { sess.step(); steps++; }
    const r = sess.toResult();
    const homeIds = new Set(hs.map((p) => p.id)), awayIds = new Set(as.map((p) => p.id));
    let homeCon = 0, awayCon = 0;
    Object.entries(r.stats.playerRows).forEach(([pid, row]) => {
      const isHome = homeIds.has(pid);
      if (row.posGroup === 'GK') {
        gkSeen++;
        if (isHome) homeCon += row.conceded; else if (awayIds.has(pid)) awayCon += row.conceded;
        if (row.min > 0 && row.conceded === 0) cleanSheets++; // StatsHub cleanSheet kuralıyla aynı
      } else if (row.conceded > 0) nonGK++;
      if (row.min === 0 && row.conceded > 0) benchLeak++;
    });
    if (homeCon !== r.stats.ag || awayCon !== r.stats.hg) wrong++;
  }
  ok('F1 GK conceded ↔ skor tutarlılığı ×60', wrong === 0 && nonGK === 0 && benchLeak === 0,
    `yanlış=${wrong} GK-dışı-lekelenme=${nonGK} yedek-sızıntısı=${benchLeak} kaleci-satırı=${gkSeen} clean-sheet=${cleanSheets}`);
}

// F2: conceded belirli aralıkta (mantık sınırı): hiçbir kalecı maçta ≥10 gol yemiyor (motor toparlanmasın)
{
  let absurd = 0;
  for (let i = 0; i < N; i++) {
    const c1 = CLUBS[i % 12], c2 = CLUBS[12 + ((i * 5) % 12)];
    const sess = new MatchSession({
      homeClub: c1, awayClub: c2, homeSquad: genSquad(c1, W), awaySquad: genSquad(c2, W),
      homeTactic: aiDefaultTactic(c1, c2, c2.strength), seed: 440000 + i, goalPace: 'dengeli', randomness: 'normal',
    });
    let steps = 0;
    while (!sess.done && steps < 160) { sess.step(); steps++; }
    const r = sess.toResult();
    Object.values(r.stats.playerRows).forEach((row) => { if (row.conceded >= 10) absurd++; });
  }
  ok('F2 conceded mantık sınırı (≥10 yok) ×60', absurd === 0, `absürt=${absurd}`);
}

console.log(failures === 0 ? `\nFAZ A doğrulama: ${2 - failures} test, 0 başarısız` : `\nFAZ A doğrulama: ${failures} BAŞARISIZ`);
if (failures) process.exit(1);
