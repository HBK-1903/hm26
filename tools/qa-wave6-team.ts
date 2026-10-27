// HM26 — Dalga 6 Takım İçgörüleri QA: normalizeMyMatches, teamSplit, formStrip, goalBuckets.
// Çalıştırma: npm run qa:wave6
import { normalizeMyMatches, teamSplit, formStrip, goalBuckets, perMatch } from '../src/engine/teamInsights';
import type { MatchArchiveEntry } from '../src/types';

const results: { name: string; pass: boolean; detail?: string }[] = [];
const check = (name: string, pass: boolean, detail = '') => results.push({ name, pass, detail });

const ME = 'ben';
const OPP1 = 'rakip1';
const OPP2 = 'rakip2';
const OPP3 = 'rakip3';
const OTHER = 'baska';

let seq = 0;
const rep = (over: Partial<MatchArchiveEntry> & Pick<MatchArchiveEntry, 'day' | 'homeId' | 'awayId' | 'hg' | 'ag'>): MatchArchiveEntry => ({
  id: `r${seq++}`, seasonNo: 1, comp: 'lig',
  xgHome: over.hg, xgAway: over.ag, foulsHome: 0, foulsAway: 0, yellowsHome: 0, yellowsAway: 0, redsHome: 0, redsAway: 0,
  playerRows: {}, playerClubIds: {}, ...over,
});

const reports: MatchArchiveEntry[] = [
  // gün 10: evde 2-1 galibiyet (xg 2.1-0.8)
  rep({ day: 10, homeId: ME, awayId: OPP1, hg: 2, ag: 1, xgHome: 2.1, xgAway: 0.8 }),
  // gün 7: deplasmanda 0-0 beraberlik — bilerek gün sırasız eklendi
  rep({ day: 7, homeId: OPP2, awayId: ME, hg: 0, ag: 0, xgHome: 1.2, xgAway: 0.5 }),
  // gün 14: deplasmanda 1-3 mağlubiyet
  rep({ day: 14, homeId: OPP3, awayId: ME, hg: 3, ag: 1, xgHome: 2.6, xgAway: 1.1 }),
  // gün 18: evde 0-1 mağlubiyet
  rep({ day: 18, homeId: ME, awayId: OPP2, hg: 0, ag: 1, xgHome: 0.9, xgAway: 1.0 }),
  // başka sezon ve başka takım maçları — elenmeli
  rep({ day: 3, homeId: OTHER, awayId: OPP1, hg: 5, ag: 0, seasonNo: 2 }),
  rep({ day: 4, homeId: OTHER, awayId: OPP1, hg: 5, ag: 0 }),
];

// ——— normalizeMyMatches ———
const mine = normalizeMyMatches(reports, ME, 1);
{
  check('Yalnız kendi maçlarım ve doğru sezon filtrelenir', mine.length === 4, `${mine.length}`);
  check('Takvim sırasına dizilir (gün artan)', mine.map((m) => m.day).join(',') === '7,10,14,18');
  check('Ev sahibi bayrağı ve rakip eşleşmesi', mine[1].isHome === true && mine[1].oppClubId === OPP1 && mine[0].isHome === false && mine[0].oppClubId === OPP2);
  check('Ev maçında gol/xG yönü doğru', mine[1].gf === 2 && mine[1].ga === 1 && mine[1].xgf === 2.1 && mine[1].xga === 0.8);
  check('Deplasman maçında gol/xG yönü çevrilir', mine[2].gf === 1 && mine[2].ga === 3 && mine[2].xgf === 1.1 && mine[2].xga === 2.6);
  check('Sonuç harfleri doğru (D/W/L/L)', mine.map((m) => m.result).join(',') === 'D,W,L,L');
  check('Boş arşivde boş dizi (sahte veri yok)', normalizeMyMatches([], ME, 1).length === 0);
}

// ——— teamSplit ———
const split = teamSplit(mine);
{
  check('Toplam: 4 maç, 1G 1B 2M, 4 puan', split.all.played === 4 && split.all.wins === 1 && split.all.draws === 1 && split.all.losses === 2 && split.all.points === 4, JSON.stringify(split.all));
  check('Toplam gol/xG toplamları', split.all.gf === 3 && split.all.ga === 5 && Math.abs(split.all.xgf - 4.6) < 1e-9 && Math.abs(split.all.xga - 5.6) < 1e-9, `${split.all.xgf}-${split.all.xga}`);
  check('Ev/deplasman xG ayrımı', [split.home.xgf - 3.0, split.home.xga - 1.8, split.away.xgf - 1.6, split.away.xga - 3.8].every((d) => Math.abs(d) < 1e-9));
  check('Ev spliti: 2 maç (1G 1M, 2-2)', split.home.played === 2 && split.home.wins === 1 && split.home.losses === 1 && split.home.gf === 2 && split.home.ga === 2 && split.home.points === 3);
  check('Deplasman spliti: 2 maç (1B 1M, 1-3)', split.away.played === 2 && split.away.draws === 1 && split.away.losses === 1 && split.away.gf === 1 && split.away.ga === 3);
  check('Boş girdi sıfır satır üretir', Object.values(teamSplit([]).all).every((v) => v === 0));
}

// ——— formStrip ———
{
  const strip = formStrip(mine, 3);
  check('Form şeridi son N maçı en eskiden yeniye verir', strip.length === 3 && strip.map((m) => m.day).join(',') === '10,14,18', strip.map((m) => m.day).join(','));
  check('Form şeridi sonuç harfleri W,L,L', strip.map((m) => m.result).join(',') === 'W,L,L');
  check('Kısa listede tavan zarar vermez', formStrip(mine, 99).length === 4 && formStrip([], 5).length === 0);
}

// ——— goalBuckets ———
{
  const b = goalBuckets(mine);
  // atılan goller: 0,2,1,0 → zero 2, one 1, twoPlus 1
  check('Atılan gol kovaları', b.scored.zero === 2 && b.scored.one === 1 && b.scored.twoPlus === 1, JSON.stringify(b.scored));
  // yenilen goller: 0,1,3,1 → zero 1, one 2, twoPlus 1
  check('Yenilen gol kovaları', b.conceded.zero === 1 && b.conceded.one === 2 && b.conceded.twoPlus === 1, JSON.stringify(b.conceded));
  check('Boş arşivde kovalar sıfır', Object.values(goalBuckets([]).scored).every((v) => v === 0));
}

// ——— perMatch ———
{
  check('Maç başına ortalama yuvarlanır', perMatch(7, 4) === 1.75 && perMatch(10, 3, 1) === 3.3);
  check('Oynanmamış sezonda 0 (NaN yok)', perMatch(5, 0) === 0);
}

let failed = 0;
for (const r of results) {
  console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.detail ? ` | ${r.detail}` : ''}`);
  if (!r.pass) failed++;
}
console.log(`\nDALGA6-TAKIM-QA: ${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
