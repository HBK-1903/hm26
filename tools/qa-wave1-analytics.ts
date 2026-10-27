// HM26 — Dalga 1 analitik QA: xG zaman çizelgesi, Poisson xPTS modeli,
// sezonluk xPTS/Fair Play agregatı ve kaleci kurtarış yüzdesi. Saf fonksiyonlar.
// Çalıştırma: npx tsx tools/qa-wave1-analytics.ts
import {
  buildXgTimeline, expectedMatchPoints, buildXptsTable, buildFairPlayTable, goalkeeperSaveRate,
} from '../src/engine/analytics';
import type { MatchArchiveEntry } from '../src/types';
import type { EngineShot } from '../src/engine/engine';

const results: { name: string; pass: boolean; detail?: string }[] = [];
const check = (name: string, pass: boolean, detail = '') => results.push({ name, pass, detail });

// ——— xG zaman çizelgesi ———
{
  const shots: EngineShot[] = [
    { minute: 12, side: 'home', zone: 'C-A', xg: 0.3, outcome: 'save' },
    { minute: 34, side: 'away', zone: 'L-A', xg: 0.12, outcome: 'miss' },
    { minute: 34, side: 'home', zone: 'R-A', xg: 0.5, outcome: 'goal' },
    { minute: 77, side: 'home', zone: 'C-A', xg: 0.08, outcome: 'woodwork' },
  ];
  const tl = buildXgTimeline(shots);
  check('Çizelge 0,0 ile başlar', tl[0].minute === 0 && tl[0].home === 0 && tl[0].away === 0);
  const last = tl[tl.length - 1];
  check('Kümülatif xG doğru toplanır', Math.abs(last.home - 0.88) < 1e-9 && Math.abs(last.away - 0.12) < 1e-9, `home=${last.home} away=${last.away}`);
  check('Aynı dakika şutları tek noktada birleşir', tl.filter((p) => p.minute === 34).length === 1);
  check('Boş şut listesi sadece başlangıç noktası verir', buildXgTimeline([]).length === 1);
  // sırasız giriş de doğru çalışır
  const shuffled = buildXgTimeline([...shots].reverse());
  check('Sırasız giriş dakika sırasına göre işlenir', shuffled[1].minute === 12);
}

// ——— Poisson modeli ———
{
  const balanced = expectedMatchPoints(1.35, 1.15);
  check('Olasılıklar 1’e yakınsar', Math.abs(balanced.pHomeWin + balanced.pDraw + balanced.pAwayWin - 1) < 1e-9);
  check('Güçlü ev sahibi kazanma olasılığı yüksek', balanced.pHomeWin > balanced.pAwayWin);
  check('Beklenen puan 0..3 aralığında', balanced.homeXp > 0 && balanced.homeXp <= 3 && balanced.awayXp >= 0 && balanced.awayXp <= 3);
  const huge = expectedMatchPoints(4, 0.2);
  check('Aşırı favori %90’ın üzerinde kazanır', huge.pHomeWin > 0.9, `pw=${huge.pHomeWin.toFixed(3)}`);
  const even = expectedMatchPoints(1.2, 1.2);
  check('Eşit xG’de simetrik model eşit puan verir (ev avantajı motor xG’sinde)', Math.abs(even.homeXp - even.awayXp) < 1e-9);
  const zero = expectedMatchPoints(0, 0);
  check('Sıfır xG maçta 0-0 kesinliği', Math.abs(zero.pDraw - 1) < 1e-9 && zero.homeXp === 1 && zero.awayXp === 1);
}

// ——— Agregat için sentetik arşiv ———
const rep = (partial: Partial<MatchArchiveEntry>): MatchArchiveEntry => ({
  id: Math.random().toString(36).slice(2),
  day: 1, seasonNo: 1, comp: 'lig',
  homeId: 'A', awayId: 'B', hg: 0, ag: 0,
  xgHome: 0, xgAway: 0, foulsHome: 0, foulsAway: 0,
  yellowsHome: 0, yellowsAway: 0, redsHome: 0, redsAway: 0,
  playerRows: {}, playerClubIds: {}, ...partial,
});

const reports: MatchArchiveEntry[] = [
  rep({ id: 'r1', homeId: 'A', awayId: 'B', xgHome: 2.0, xgAway: 0.5, hg: 1, ag: 1, yellowsHome: 1, redsAway: 1, foulsHome: 8, foulsAway: 14 }),
  rep({ id: 'r2', homeId: 'C', awayId: 'A', xgHome: 0.8, xgAway: 1.4, hg: 0, ag: 2, yellowsAway: 2, foulsHome: 10, foulsAway: 6 }),
  rep({ id: 'r3', homeId: 'B', awayId: 'C', xgHome: 1.1, xgAway: 1.1, hg: 2, ag: 2, yellowsHome: 3, redsHome: 1, foulsHome: 18, foulsAway: 9 }),
  // başka sezon + hazırlık maçı filtrelenmeli
  rep({ id: 'r4', seasonNo: 2, homeId: 'A', awayId: 'B', xgHome: 5, xgAway: 0 }),
  rep({ id: 'r5', comp: 'hazirlik', homeId: 'A', awayId: 'C', xgHome: 5, xgAway: 0 }),
];

{
  const table = buildXptsTable(reports, 1);
  const ids = table.map((r) => r.clubId).sort();
  check('Sadece sezon 1 lig maçlarındaki 3 kulüp var', ids.join(',') === 'A,B,C', ids.join(','));
  const rowA = table.find((r) => r.clubId === 'A')!;
  check('Maç sayıları doğru (A 2 maç)', rowA.matches === 2);
  const expA = expectedMatchPoints(2.0, 0.5).homeXp + expectedMatchPoints(0.8, 1.4).awayXp;
  check('xPTS maç başına toplanır', Math.abs(rowA.xpts - Math.round(expA * 100) / 100) < 0.02, `xpts=${rowA.xpts} beklenen≈${expA.toFixed(2)}`);
  check('xPTS/maç ortalaması tutarlı', Math.abs(rowA.xptsPerMatch - Math.round((rowA.xpts / 2) * 100) / 100) < 0.02);
  check('Sıralama xPTS’e göre azalan', table.every((r, i) => i === 0 || table[i - 1].xpts >= r.xpts));
  check('Yabancı sezon verisi sızmadı', table.every((r) => r.xgf < 10));
}

{
  const fp = buildFairPlayTable(reports, 1);
  const byId = new Map(fp.map((r) => [r.clubId, r]));
  const a = byId.get('A')!;
  check('Kart ve faul toplamları doğru (A: 3 sarı, 0 kırmızı, 14 faul)', a.yellows === 3 && a.reds === 0 && a.fouls === 14, `sarı=${a.yellows} faul=${a.fouls}`);
  check('Skor formülü (sarı + 3×kırmızı + 0.25×faul)', Math.abs(a.score - (3 + 0.25 * 14)) < 1e-9);
  const b = byId.get('B')!;
  check('B’de kırmızı kart ağırlığı uygulanır (2 maçta 2 kırmızı)', b.reds === 2 && b.score > a.score);
  check('En centilmen ilk sırada', fp[0].clubId === 'C', fp.map((r) => `${r.clubId}:${r.score}`).join(' '));
  check('Hazırlık maçı Fair Play’e karışmaz', fp.every((r) => r.matches === 2));
}

// ——— Kaleci kurtarış yüzdesi ———
{
  check('Kurtarış yüzdesi doğru', goalkeeperSaveRate(24, 6) === 80);
  check('Kurtarış yok ama gol varsa %0', goalkeeperSaveRate(0, 3) === 0);
  check('Hiç şut yememişse null (sahte yüzde yok)', goalkeeperSaveRate(0, 0) === null);
  check('Tanımsız veri null döner', goalkeeperSaveRate(undefined, undefined) === null);
  check('Yuvarlama tek ondalık', goalkeeperSaveRate(1, 3) === 25);
}

let failed = 0;
for (const r of results) {
  console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.detail ? ` | ${r.detail}` : ''}`);
  if (!r.pass) failed++;
}
console.log(`\nDALGA1-ANALITIK-QA: ${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
