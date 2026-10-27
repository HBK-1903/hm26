// HM26 — Dalga 3 Kadro İçgörüleri QA: kondisyon dağılımı, gerçek reyting trendi, rotasyon önerileri.
// Çalıştırma: npm run qa:wave3
import { fitnessBreakdown, recentRatings, formTrend, rotationAdvice } from '../src/engine/squadInsights';
import type { MatchArchiveEntry, Player } from '../src/types';

const results: { name: string; pass: boolean; detail?: string }[] = [];
const check = (name: string, pass: boolean, detail = '') => results.push({ name, pass, detail });

const mkPlayer = (over: Partial<Player>): Player => ({
  id: over.id ?? 'p_x', clubId: 'c', name: over.name ?? 'Oyuncu', age: 24, group: 'CM', side: 'ANY',
  secondary: [], ratings: { gen: 70, tek: 70, att: 70, def: 70, fiz: 70, men: 70 },
  form: 60, fitness: 90, sharpness: 70, potential: 75, wage: 100, foreign: false,
  injuredDays: 0, suspendedMatches: 0, ...over,
}) as Player;

// ——— fitnessBreakdown ———
{
  const b = fitnessBreakdown([mkPlayer({ fitness: 95 }), mkPlayer({ fitness: 80 }), mkPlayer({ fitness: 79 }), mkPlayer({ fitness: 60 }), mkPlayer({ fitness: 59 }), mkPlayer({ fitness: 0 })]);
  check('Dağılım tonları doğru (2 yeşil / 2 sarı / 2 kırmızı)', b.green === 2 && b.amber === 2 && b.red === 2 && b.total === 6, JSON.stringify(b));
  check('Boş kadroda toplam 0', fitnessBreakdown([]).total === 0);
  check('Eşik değerleri taktik stüdyosuyla aynı (80 yeşil, 60 sarı)', fitnessBreakdown([mkPlayer({ fitness: 80 }), mkPlayer({ fitness: 60 })]).green === 1);
}

// ——— recentRatings ———
{
  const report = (day: number, rows: [string, number, number][]): MatchArchiveEntry => ({
    id: `m${day}`, day, seasonNo: 1, comp: 'lig', homeId: 'c', awayId: 'x', hg: 1, ag: 0,
    xgHome: 1, xgAway: 0, foulsHome: 0, foulsAway: 0, yellowsHome: 0, yellowsAway: 0, redsHome: 0, redsAway: 0,
    playerRows: Object.fromEntries(rows.map(([id, min, rating]) => [id, { min, g: 0, a: 0, yellow: 0, red: 0, rating, posGroup: 'CM' }])),
    playerClubIds: {},
  });
  // raporlar en yeni önce
  const reports = [report(3, [['p1', 90, 7.8]]), report(2, [['p1', 0, 4.0]]), report(1, [['p1', 70, 6.5]])];
  const r = recentRatings('p1', reports);
  check('Yalnız oynanan maçlar (min>0) dahil', r.length === 2 && r[0] === 7.8 && r[1] === 6.5, JSON.stringify(r));
  check('Limit çalışıyor', recentRatings('p1', [report(9, [['p1', 90, 7]]), ...reports], 2).length === 2);
  check('Hiç maçı olmayan oyuncu → boş dizi (sahte veri yok)', recentRatings('nobody', reports).length === 0);
}

// ——— formTrend ———
{
  check('4 maçtan az veri → null', formTrend([7, 7.2, 7.1]) === null && formTrend([]) === null);
  check('Yükseliş trendi', formTrend([8.2, 8.0, 6.5, 6.4]) === 'up');
  check('Düşüş trendi', formTrend([5.8, 6.0, 7.8, 7.6]) === 'down');
  check('Yatay trend (fark < 0.3)', formTrend([7.0, 7.1, 6.9, 7.0]) === 'flat');
  check('Eşik sınırı: tam 0.3 fark yükseliş sayılır', formTrend([7.3, 7.3, 7.0, 7.0]) === 'up');
}

// ——— rotationAdvice ———
{
  const xiStar = mkPlayer({ id: 'star', name: 'Yıldız', group: 'ST', fitness: 55, ratings: { gen: 80 } as Player['ratings'] });
  const tired = mkPlayer({ id: 'tired', name: 'Yorgun', group: 'CM', fitness: 50 });
  const fitMid = mkPlayer({ id: 'fitmid', name: 'Hazır Orta', group: 'CM', fitness: 88, ratings: { gen: 74 } as Player['ratings'] });
  const fitFwd = mkPlayer({ id: 'fitfwd', name: 'Hazır Forvet', group: 'ST', fitness: 92, ratings: { gen: 73 } as Player['ratings'] });
  const defender = mkPlayer({ id: 'def', name: 'Stoper', group: 'CB', fitness: 95 });
  const hotForm = mkPlayer({ id: 'hot', name: 'Formda Yedek', group: 'WG', fitness: 90, form: 88 });
  const cold = mkPlayer({ id: 'cold', name: 'Silik Yedek', group: 'CM', fitness: 80, form: 55 });
  const injured = mkPlayer({ id: 'inj', name: 'Sakat', group: 'CB', fitness: 70, injuredDays: 5 });

  // Senaryo 1: yorgun XI + uyumlu alternatif
  const a1 = rotationAdvice({
    squad: [tired, fitMid, cold],
    xi: [{ playerId: 'tired', slotGroup: 'DM/CM' }],
    reports: [],
  });
  check('Yorgun XI oyuncusu için dinlenme önerisi var', a1.some((x) => x.kind === 'rest' && x.playerId === 'tired'));
  check('Alternatif mevki uyumuna göre seçiliyor', a1.find((x) => x.kind === 'rest')?.altId === 'fitmid');
  check('Öneri metni oyuncu isimlerini içeriyor', a1[0].reason.includes('Yorgun') && a1[0].reason.includes('Hazır Orta'));

  // Senaryo 2: sakat oyuncu + mevki dışı yedek (uygunsuz alternatif önerilmez)
  const a2 = rotationAdvice({
    squad: [injured, fitFwd],
    xi: [{ playerId: 'inj', slotGroup: 'CB' }],
    reports: [],
  });
  const injAdvice = a2.find((x) => x.kind === 'injury');
  check('Sakat XI için injury önerisi', !!injAdvice && injAdvice.reason.includes('sakat (5g)'));
  check('Mevki dışı oyuncu alternatif önerilmez', injAdvice?.altId === undefined);

  // Senaryo 3: cezalı oyuncu
  const susp = mkPlayer({ id: 'susp', name: 'Cezalı', group: 'FB', suspendedMatches: 1, fitness: 90 });
  const fbAlt = mkPlayer({ id: 'fba', name: 'Bek Yedek', group: 'FB', fitness: 75 });
  const a3 = rotationAdvice({ squad: [susp, fbAlt], xi: [{ playerId: 'susp', slotGroup: 'FB/WB' }], reports: [] });
  check('Cezalı oyuncuya uygun bek alternatifi gelir', a3[0].kind === 'injury' && a3[0].altId === 'fba');

  // Senaryo 4: formda yedek (form eşiği)
  const a4 = rotationAdvice({
    squad: [xiStar, hotForm, cold],
    xi: [{ playerId: 'star', slotGroup: 'ST' }],
    reports: [],
  });
  check('Form eşiğini geçen yedek hotbench önerisi alır', a4.some((x) => x.kind === 'hotbench' && x.playerId === 'hot'));
  check('Silik yedek önerilmez', !a4.some((x) => x.playerId === 'cold'));

  // Senaryo 5: hotbench gerçek reytingle de tetiklenir (form düşük ama son maçlar iyi)
  const matchRated = mkPlayer({ id: 'mr', name: 'Reytingli', group: 'AM', form: 60, fitness: 85 });
  const rep: MatchArchiveEntry = {
    id: 'r1', day: 1, seasonNo: 1, comp: 'lig', homeId: 'c', awayId: 'x', hg: 2, ag: 1,
    xgHome: 2, xgAway: 1, foulsHome: 0, foulsAway: 0, yellowsHome: 0, yellowsAway: 0, redsHome: 0, redsAway: 0,
    playerRows: { mr: { min: 90, g: 1, a: 0, yellow: 0, red: 0, rating: 7.9, posGroup: 'AM' } }, playerClubIds: {},
  };
  const rep2 = { ...rep, id: 'r2', day: 2, playerRows: { mr: { min: 80, g: 0, a: 1, yellow: 0, red: 0, rating: 7.6, posGroup: 'AM' } } };
  const a5 = rotationAdvice({ squad: [xiStar, matchRated], xi: [{ playerId: 'star', slotGroup: 'ST' }], reports: [rep2, rep] });
  check('Son maç reytingi yüksek yedek önerilir', a5.some((x) => x.kind === 'hotbench' && x.reason.includes('7.8')));

  // Senaryo 6: sağlıklı kadro → boş öneri (ekran empty state gösterecek)
  const a6 = rotationAdvice({ squad: [defender, fitMid], xi: [{ playerId: 'defender', slotGroup: 'CB' }], reports: [] });
  check('Sorun yoksa öneri üretilmez', a6.length === 0);

  // Senaryo 7: hotbench tavanı 3
  const many = Array.from({ length: 5 }, (_, i) => mkPlayer({ id: `h${i}`, name: `H ${i}`, group: 'WG', form: 90 + i, fitness: 85 }));
  const a7 = rotationAdvice({ squad: [xiStar, ...many], xi: [{ playerId: 'star', slotGroup: 'ST' }], reports: [] });
  check('Hotbench önerisi en fazla 3', a7.filter((x) => x.kind === 'hotbench').length === 3);

  // Senaryo 8: düşük kondisyonlu alternatif elenir (70 eşiği)
  const rusty = mkPlayer({ id: 'rusty', name: 'Kondi Düşük', group: 'CM', fitness: 65 });
  const a8 = rotationAdvice({ squad: [tired, rusty], xi: [{ playerId: 'tired', slotGroup: 'CM' }], reports: [] });
  check('Kondisi yetersiz yedek alternatif olamaz', a8.find((x) => x.kind === 'rest')?.altId === undefined);
}

let failed = 0;
for (const r of results) {
  console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.detail ? ` | ${r.detail}` : ''}`);
  if (!r.pass) failed++;
}
console.log(`\nDALGA3-KADRO-QA: ${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
