// HM26 — Analitik derinlik QA (A katmanı): oyuncu maç günlüğü/özeti, xG trendi ve
// H2H eşleşme geçmişi. Tüm girdiler gerçek MatchArchiveEntry şekline sadık sentetik
// arşiv kayıtlarıdır; yeni kalıcı alan yok, sahte çıktı üretimi test edilir.
// Çalıştırma: npm run qa:analytics
import { playerMatchLog, summarizePlayerLog, ratingTrend, contributionTrend } from '../src/engine/playerInsights';
import { xgTrend, xgVerdict, headToHead, normalizeMyMatches, type MyMatch } from '../src/engine/teamInsights';
import type { MatchArchiveEntry } from '../src/types';

const results: { name: string; pass: boolean; detail?: string }[] = [];
const check = (name: string, pass: boolean, detail = '') => results.push({ name, pass, detail });

const MINE = 'club_ben';
const OPP = 'club_rakip';
const OTHER = 'club_diger';
const P1 = 'p1'; const P2 = 'p2';

const row = (min: number, g = 0, a = 0, yellow = 0, red = 0, rating = 7) => ({ min, g, a, yellow, red, rating, posGroup: 'ST' });
const report = (over: Partial<MatchArchiveEntry>): MatchArchiveEntry => ({
  id: 'r', day: 1, seasonNo: 1, comp: 'lig', homeId: MINE, awayId: OPP,
  hg: 1, ag: 0, xgHome: 1.2, xgAway: 0.8, foulsHome: 5, foulsAway: 6,
  yellowsHome: 1, yellowsAway: 2, redsHome: 0, redsAway: 0,
  playerRows: {}, playerClubIds: {}, ...over,
});

// ——— playerMatchLog ———
{
  const reports = [
    report({ id: 'r1', day: 10, playerRows: { [P1]: row(90, 1, 0, 1, 0, 7.4), [P2]: row(30) } }),
    report({ id: 'r2', day: 17, awayId: OTHER, playerRows: { [P1]: row(30, 0, 1, 0, 0, 6.8), [P2]: row(0) } }),
    report({ id: 'r3', day: 24, homeId: OPP, awayId: MINE, playerRows: { [P1]: row(90, 2, 0, 0, 1, 8.1) } }),
  ];
  const log = playerMatchLog(P1, reports, MINE, 5);
  check('Günlük yalnız oynanan maçları içerir (min>0)', log.length === 3);
  check('Günlük en yeni önce sıralı', log[0].day === 24 && log[2].day === 10);
  check('Deplasman maçında isHome=false', log[0].isHome === false && log[0].oppClubId === OPP);
  check('Ev maçında rakip doğru', log[1].oppClubId === OTHER && log[1].isHome === true);
  check('min=0 satırı günlüğe girmez', playerMatchLog(P2, reports, MINE).length === 1);
  check('Limit uygulanır', playerMatchLog(P1, reports, MINE, 2).length === 2);
  check('Hiç oynamayan oyuncu boş döner', playerMatchLog('yok', reports, MINE).length === 0);

  const summary = summarizePlayerLog(log);
  check('Özet toplamları doğru', summary.played === 3 && summary.goals === 3 && summary.assists === 1
    && summary.yellows === 1 && summary.reds === 1 && summary.minutes === 210);
  check('Tam/yarı maç sayımı', summary.fullMatches === 2 && summary.subAppearances === 1);
  check('Ortalama reyting', Math.abs((summary.ratingAvg ?? 0) - Math.round(((7.4 + 6.8 + 8.1) / 3) * 100) / 100) < 1e-9);
  check('90 dakika başına gol/asist', summary.goalsPer90 === 1.29 && summary.assistsPer90 === 0.43);
  check('Reyting trendi en eski→yeni', JSON.stringify(ratingTrend(log)) === JSON.stringify([7.4, 6.8, 8.1]));
  check('Katkı trendi g+a sırasıyla', JSON.stringify(contributionTrend(log)) === JSON.stringify([1, 1, 2]));

  const empty = summarizePlayerLog([]);
  check('Boş özet nötr ve null ortalama', empty.played === 0 && empty.ratingAvg === null && empty.goalsPer90 === null);
  const shortMinutes = summarizePlayerLog([{ day: 1, seasonNo: 1, comp: 'lig', isHome: true, oppClubId: OPP, min: 60, g: 2, a: 0, yellow: 0, red: 0, rating: 8 }]);
  check('90 dk altı sürede per90 hesaplanmaz (sahte oran yok)', shortMinutes.goalsPer90 === null);
}

// ——— xgTrend + xgVerdict ———
{
  const mm = (day: number, xgf: number, gf: number, xga: number, ga: number, opp = OPP): MyMatch => ({
    day, comp: 'lig', isHome: true, oppClubId: opp, gf, ga, xgf, xga,
    result: gf > ga ? 'W' : gf === ga ? 'D' : 'L',
  });
  const matches = [mm(10, 2, 1, 1, 1), mm(17, 2.5, 1, 0.5, 0), mm(24, 3, 2, 1, 2), mm(31, 1.8, 1, 1.2, 2)];
  const trend = xgTrend(matches);
  check('xG trendi maç sırasını korur', trend.length === 4 && trend[0].day === 10 && trend[3].gf === 1);
  check('Trend noktaları xG ve golü birlikte taşır', trend[1].xgf === 2.5 && trend[1].gf === 1 && trend[1].xga === 0.5);

  // Toplam xGF 9.3, GF 5 → finishingDelta -4.3 → under
  const under = xgVerdict(matches);
  check('Negatif bitiricilik farkı "under" etiketler', under?.label === 'under' && under.finishingDelta === -4.3);
  check('Savunma farkı hesaplanır (GA 5 - xGA 3.7)', under?.defensiveDelta === 1.3);

  const overMatches = [mm(1, 1, 3, 1, 0), mm(2, 1.2, 3, 1, 1), mm(3, 0.8, 3, 1, 0)];
  check('Pozitif fark "over" etiketler', xgVerdict(overMatches)?.label === 'over');
  const neutral = [mm(1, 1.5, 1, 1, 1), mm(2, 2, 2, 1, 1), mm(3, 1, 1, 1, 1)];
  check('Küçük fark "neutral" etiketler', xgVerdict(neutral)?.label === 'neutral');
  check('3 maçtan az veride yargı yok (sahte içgörü yasak)', xgVerdict(matches.slice(0, 2)) === null);
}

// ——— headToHead ———
{
  const h2hReports = [
    report({ id: 'h1', day: 10, seasonNo: 1, hg: 2, ag: 1, xgHome: 1.8, xgAway: 1.0 }),           // evde W
    report({ id: 'h2', day: 20, seasonNo: 1, homeId: OPP, awayId: MINE, hg: 1, ag: 1, xgHome: 1.2, xgAway: 1.2 }), // deplasman D
    report({ id: 'h3', day: 30, seasonNo: 2, homeId: OPP, awayId: MINE, hg: 3, ag: 0, xgHome: 2.2, xgAway: 0.6 }), // deplasman L
    report({ id: 'h4', day: 5, seasonNo: 1, homeId: MINE, awayId: OTHER, hg: 4, ag: 0, xgHome: 3, xgAway: 0.2 }),  // başka rakip — elenmeli
  ];
  const h = headToHead(h2hReports, MINE, OPP, 5);
  check('H2H yalnız ilgili iki kulübü sayar', h.played === 3);
  check('H2H galibiyet/beraberlik/mağlubiyet', h.wins === 1 && h.draws === 1 && h.losses === 1);
  check('H2H gol toplamları benim perspektifimden', h.gf === 3 && h.ga === 5);
  check('H2H xG toplamları', Math.abs(h.xgf - 3.6) < 1e-9 && Math.abs(h.xga - 4.4) < 1e-9);
  check('H2H maçlar en yeni önce', h.meetings[0].day === 30 && h.meetings[2].day === 10);
  check('H2H deplasman işaretleri', h.meetings[0].isHome === false && h.meetings[2].isHome === true);
  check('H2H limit çalışır', headToHead(h2hReports, MINE, OPP, 2).meetings.length === 2);
  const none = headToHead(h2hReports, MINE, 'club_yok');
  check('Hiç karşılaşma yoksa boş H2H', none.played === 0 && none.meetings.length === 0);

  // normalizeMyMatches ile entegrasyon: H2H maçları MyMatch uyumlu
  const my = normalizeMyMatches(h2hReports, MINE, 1);
  check('normalizeMyMatches sezon filtresi ve sıralama', my.length === 3 && my[0].day === 5 && my[2].day === 20);
}

let failed = 0;
for (const r of results) {
  console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.detail ? ` | ${r.detail}` : ''}`);
  if (!r.pass) failed++;
}
console.log(`\nANALITIK-QA: ${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
