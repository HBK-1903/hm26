// HM26 — B katmanı QA: kanıta dayalı basın haberleri, rakip scout raporu,
// röportaj tonu geriye çözümleme ve menajer basın profili. Sahte veri yasağı ve
// yeni kalıcı alan yok kuralı korunur.
// Çalıştırma: npm run qa:scout
import { buildMatchNews } from '../src/data/newsroom';
import { opponentScout } from '../src/engine/scout';
import { interviewToneOfQuote, buildPostMatchInterview, INTERVIEW_INBOX_TITLE } from '../src/data/interview';
import { buildPressProfile } from '../src/engine/pressProfile';
import type { DemoFixture, InboxMsg, MatchArchiveEntry, TableRow } from '../src/types';

const results: { name: string; pass: boolean; detail?: string }[] = [];
const check = (name: string, pass: boolean, detail = '') => results.push({ name, pass, detail });

const MINE = 'club_ben';
const OPP = 'club_rakip';
const RIVAL = 'club_derbi';

const rep = (over: Partial<MatchArchiveEntry>): MatchArchiveEntry => ({
  id: 'r', day: 1, seasonNo: 1, comp: 'lig', homeId: MINE, awayId: OPP,
  hg: 1, ag: 0, xgHome: 1.2, xgAway: 0.8, foulsHome: 4, foulsAway: 6,
  yellowsHome: 1, yellowsAway: 2, redsHome: 0, redsAway: 0,
  playerRows: {}, playerClubIds: {}, ...over,
});
const names = (id: string) => (id === MINE ? 'Benim' : id === OPP ? 'Rakip' : id === RIVAL ? 'DerbiTakım' : id);
const derby = (h: string, a: string) => (h === MINE && a === RIVAL) || (h === MINE && a === RIVAL);

// ——— buildMatchNews ———
{
  const reports = [
    rep({ id: 'r1', day: 10, homeId: MINE, awayId: RIVAL, hg: 2, ag: 1, xgHome: 2.1 }),       // derbi
    rep({ id: 'r2', day: 17, hg: 4, ag: 0, xgHome: 1.4 }),                                    // farklı + temiz → farklı önceliği
    rep({ id: 'r3', day: 24, hg: 1, ag: 1, xgHome: 3.1 }),                                    // xG negatif sapma -2.1 (beraberlik)
    rep({ id: 'r4', day: 31, homeId: OPP, awayId: MINE, hg: 3, ag: 3, xgAway: 1.1, xgHome: 2 }), // gollü 6 gol
  ];
  const news = buildMatchNews(reports, MINE, names, derby, 10);
  check('Her maç en fazla bir haber üretir', news.length === 4);
  check('Haberler gün sırasına göre yeni→eski', news[0].day === 31 && news[3].day === 10);
  check('Derbi haberi öncelikli ve etiketli', news.find((n) => n.id === 'news-derby-r1')?.tag === 'derbi');
  check('Farklı skor haberi (temizlikten önce gelir)', news.find((n) => n.id === 'news-margin-r2')?.tag === 'farkli');
  const xgNews = news.find((n) => n.id === 'news-xg-r3');
  check('xG sapması haberi gerçek sayıları taşır', !!xgNews && xgNews.detail.includes('3.1') && xgNews.detail.includes('-2.1'));
  check('Gollü maç haberi', news.find((n) => n.id === 'news-goals-r4')?.tag === 'gollu');
  check('Temiz galibiyet haberi (farksız, 1-0, normal xG)',
    buildMatchNews([rep({ id: 'c1', hg: 1, ag: 0, xgHome: 1.1 })], MINE, names, derby)[0].tag === 'temiz');
  check('Limit uygulanır', buildMatchNews(reports, MINE, names, derby, 2).length === 2);
  check('Haber detayında skor ve kulüp adları var', news.every((n) => n.detail.includes('Benim')));
  // Sözleşme revizesi: özel hikâyesi olmayan maç da jenerik haberle basında yer alır (uydurma yok)
  const silent = buildMatchNews([rep({ id: 'q1', hg: 1, ag: 1, xgHome: 1.0, xgAway: 0.9 })], MINE, names, derby);
  check('Sessiz maç artık jenerik sonuç haberi üretir (1-1, dengeli xG)',
    silent.length === 1 && silent[0].tag === 'sonuc' && silent[0].id === 'news-result-q1' && silent[0].detail.includes('1–1'));

  // ——— Olay temalı etiketler yalnız sıkıştırılmış olay kanıtından türer ———
  const comeback = buildMatchNews([rep({
    id: 'cb1', hg: 2, ag: 1, xgHome: 1.3, xgAway: 1.1,
    events: [[14, 0, 1], [33, 0, 0], [71, 0, 0]],
  })], MINE, names, derby)[0];
  check('İlk golü yiyip kazanınca geri dönüş haberi', comeback.tag === 'geri-donus' && comeback.id === 'news-comeback-cb1');

  const collapse = buildMatchNews([rep({
    id: 'co1', hg: 1, ag: 2, xgHome: 1.3, xgAway: 1.1,
    events: [[11, 0, 0], [50, 0, 1], [80, 0, 1]],
  })], MINE, names, derby)[0];
  check('Öne geçip kaybedince çöküş haberi', collapse.tag === 'cokus' && collapse.id === 'news-collapse-co1');

  const red = buildMatchNews([rep({ id: 'rd1', hg: 1, ag: 0, xgHome: 1.1, redsHome: 1 })], MINE, names, derby)[0];
  check('Kırmızı kart olan maçta kırmızı etiket', red.tag === 'kirmizi' && red.detail.includes('1 kırmızı kart'));

  const varNews = buildMatchNews([rep({
    id: 'var1', hg: 1, ag: 0, xgHome: 1.1,
    events: [[40, 5, 2], [66, 0, 0]],
  })], MINE, names, derby)[0];
  check('VAR olayı olan maçta VAR etiketi', varNews.tag === 'var' && varNews.detail.includes('1 VAR'));

  const late = buildMatchNews([rep({
    id: 'late1', hg: 1, ag: 0, xgHome: 1.1,
    events: [[82, 0, 0]],
  })], MINE, names, derby)[0];
  check('76+ dakika galibiyet golü son dakika haberi', late.tag === 'son-dakika' && late.detail.includes('82.'));

  check('Geri dönüş derbiden öncelikli (kanıt en ayırt edici hikâye)', buildMatchNews([rep({
    id: 'cbd', homeId: MINE, awayId: RIVAL, hg: 2, ag: 1, xgHome: 1.3, xgAway: 1.1,
    events: [[9, 0, 1], [40, 0, 0], [88, 0, 0]],
  })], MINE, names, derby)[0].tag === 'geri-donus');

  // Başlık varyantları aynı girdi için kararlı; farklı maçlar farklı varyant alabilir
  const again = buildMatchNews([rep({ id: 'cb1', hg: 2, ag: 1, xgHome: 1.3, xgAway: 1.1, events: [[14, 0, 1], [33, 0, 0], [71, 0, 0]] })], MINE, names, derby)[0];
  check('Varyant seçimi deterministik (aynı id → aynı başlık)', again.title === comeback.title);
  check('Tüm haber başlık ve detayları dolu', [...news, comeback, collapse, red, varNews, late].every((n) => n.title.length > 3 && n.detail.includes('—')));
}

// ——— opponentScout ———
{
  const fx = (day: number, home: string, away: string, hg: number, ag: number): DemoFixture =>
    ({ round: 1, day, homeId: home, awayId: away, played: true, hg, ag, comp: 'lig' });
  const fixtures = [
    fx(10, OPP, 'c2', 2, 0),  // opp evinde W
    fx(17, 'c3', OPP, 1, 1),  // opp deplasman D
    fx(24, OPP, 'c4', 0, 3),  // opp evinde L
    fx(31, 'c5', OPP, 2, 1),  // opp deplasman W
    fx(38, OPP, 'c6', 1, 0),  // opp evinde W
    fx(45, 'c7', MINE, 3, 3), // alakasız maç — elenmeli
    { round: 1, day: 52, homeId: OPP, awayId: 'c8', played: false, comp: 'lig' } as DemoFixture, // oynanmamış — elenmeli
  ];
  const table: TableRow[] = [
    { clubId: 'x', p: 6, w: 5, d: 0, l: 1, gf: 10, ga: 4, pts: 15 },
    { clubId: OPP, p: 5, w: 3, d: 1, l: 1, gf: 6, ga: 5, pts: 10 },
  ];
  const scout = opponentScout(fixtures, OPP, table);
  check('Yalnız oynanmış lig maçları sayılır', scout.played === 5);
  check('Form şeridi son 5 maç, eski→yeni', JSON.stringify(scout.form) === JSON.stringify(['W', 'D', 'L', 'L', 'W']));
  check('Ev/deplasman splitleri doğru', scout.home.played === 3 && scout.home.wins === 2 && scout.away.played === 2 && scout.away.draws === 1 && scout.away.losses === 1);
  check('Toplam gol ve puan', scout.gf === 5 && scout.ga === 6 && scout.home.points + scout.away.points === 7);
  check('Lig sırası tablodan okunur', scout.rank === 2 && scout.points === 10);
  const unknown = opponentScout(fixtures, 'club_yok', table);
  check('Hiç maçı olmayan rakip nötr döner', unknown.played === 0 && unknown.form.length === 0 && unknown.rank === null && unknown.points === null);
  // C3: xG'siz eski tip fikstürlerde xG üretilmez (dürüst boşluk)
  check('xG olmayan fikstürlerde xG üretilmez', scout.xgAvailable === false && scout.xgForPerMatch === null && scout.xgAgainstPerMatch === null);

  // C3: xG taşıyan fikstürlerde maç başı ortalamalar doğru türetilir
  const xgFixtures: DemoFixture[] = [
    { round: 1, day: 10, homeId: OPP, awayId: 'c2', played: true, hg: 2, ag: 0, comp: 'lig', xgHome: 2.0, xgAway: 0.5 },
    { round: 1, day: 17, homeId: 'c3', awayId: OPP, played: true, hg: 1, ag: 1, comp: 'lig', xgHome: 1.2, xgAway: 0.8 },
    { round: 1, day: 24, homeId: OPP, awayId: 'c4', played: true, hg: 0, ag: 3, comp: 'lig' }, // xG yok — dışlanır
  ];
  const xgScout = opponentScout(xgFixtures, OPP, table);
  check('xG yalnız taşıyan maçlardan ortalanır', xgScout.xgAvailable === true && xgScout.xgForPerMatch === 1.4 && xgScout.xgAgainstPerMatch === 0.85);
}

// ——— interviewToneOfQuote + buildPressProfile ———
{
  const win = buildPostMatchInterview('win', 'R');
  const loss = buildPostMatchInterview('loss', 'R');
  const q1 = win.options[0].quote;
  const q2 = loss.options[2].quote;
  check('Sözden ton geriye çözülür (galibiyet)', interviewToneOfQuote(q1)?.outcome === 'win' && interviewToneOfQuote(q1)?.optionId === win.options[0].id);
  check('Sözden ton geriye çözülür (mağlubiyet)', interviewToneOfQuote(q2)?.outcome === 'loss');
  check('Bilinmeyen söz null döner (uydurma sınıf yok)', interviewToneOfQuote('bu söz hiçbir seçenekte yok') === null);

  const msg = (quote: string): InboxMsg => ({ id: `m${Math.random()}`, kind: 'yonetim', title: INTERVIEW_INBOX_TITLE, body: `“${quote}” — Menajer`, day: 1, read: false });
  const inbox: InboxMsg[] = [
    msg(q1), msg(win.options[1].quote), msg(q2), msg(loss.options[0].quote),
    { id: 'other', kind: 'lig', title: 'Maç sonucu: x', body: 'normal mesaj', day: 2, read: false },
  ];
  const profile = buildPressProfile(inbox);
  check('Profil yalnız röportaj mesajlarını sayar', profile.total === 4);
  check('Sonuç dağılımı doğru', profile.byOutcome.win === 2 && profile.byOutcome.loss === 2 && profile.byOutcome.draw === 0);
  check('En çok kullanılan ton raporlanır', profile.mostUsedTone?.count === 1 && typeof profile.mostUsedTone.label === 'string');
  check('Reddedilen röportajlar profile girmez (başlık yok)', buildPressProfile([{ id: 'd', kind: 'lig', title: 'Maç sonucu', body: 'x', day: 1, read: false }]).total === 0);
  const empty = buildPressProfile([]);
  check('Boş inbox nötr profil', empty.total === 0 && empty.mostUsedTone === null);
  // Eski format gövde (tırnaksız) güvenli elenir
  const legacy = buildPressProfile([{ id: 'legacy', kind: 'yonetim', title: INTERVIEW_INBOX_TITLE, body: 'tırnaksız eski gövde', day: 1, read: false }]);
  check('Eski format mesajı sınıflandırılmaz', legacy.total === 0);
}

let failed = 0;
for (const r of results) {
  console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.detail ? ` | ${r.detail}` : ''}`);
  if (!r.pass) failed++;
}
console.log(`\nSCOUT-QA: ${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
