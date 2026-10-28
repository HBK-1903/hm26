// HM26 — C dalgası saf motor QA (C1+C2+C3):
//  C1 seasonMatchStats agregasyonu, C2 compactMatchEvents + goalMinuteProfile,
//  C3 fixtureXgPair + buildLeagueXptsTable. Geriye uyum (yeni alansız eski kayıt) da test edilir.
// Çalıştırma: npm run qa:cwave
import { fixtureXgPair, xgConfig, hash32 } from '../src/engine/leagueXg';
import { compactMatchEvents, goalMinuteProfile, firstGoalProfile, injuryTally, varStats, EV_GOAL, EV_YELLOW, EV_RED, EV_SUB, EV_SAVE, EV_VAR, EV_INJURY, SIDE_HOME, SIDE_AWAY } from '../src/engine/matchEvents';
import { buildLeagueXptsTable, expectedMatchPoints, buildRefereeProfile, buildLeagueLuckSnapshot } from '../src/engine/analytics';
import { seasonMatchStats, cardDisciplineByPosition, seasonSummary } from '../src/engine/teamInsights';
import { mulberry32 } from '../src/data/gen';
import type { DemoFixture, MatchArchiveEntry, TableRow } from '../src/types';
import type { DemoMatchEvent } from '../src/store/game';

const results: { name: string; pass: boolean; detail?: string }[] = [];
const check = (name: string, pass: boolean, detail = '') => results.push({ name, pass, detail });

const MINE = 'club_ben';
const OPP = 'club_rakip';
const THIRD = 'club_diger';

// ——— C3: fixtureXgPair ———
{
  const cfg = xgConfig({ goalPace: 'dengeli', randomness: 'normal' } as never);
  check('xgConfig ayarları simGoals çarpanlarıyla aynı', cfg.pace === 1 && cfg.jitter === 0.7);
  const rng1 = mulberry32(42);
  const rng2 = mulberry32(42);
  const a = fixtureXgPair(75, 60, rng1, cfg);
  const b = fixtureXgPair(75, 60, rng2, cfg);
  check('Aynı tohum aynı xG çifti (determinizm)', a[0] === b[0] && a[1] === b[1], `${a} vs ${b}`);
  check('xG değerleri pozitif ve makul sınırda', a.every((v) => v >= 0.1 && v <= 5), String(a));
  let fav = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const [h, aw] = fixtureXgPair(90, 45, mulberry32(seed), cfg);
    if (h > aw) fav++;
  }
  check('Güçlü ev sahibi daha çok xG üretir (istatistiksel eğilim)', fav >= 30, `${fav}/40 favori çıktı`);
  check('Düşük tempo xGyi kısar', (() => {
    const slow = xgConfig({ goalPace: 'dusuk', randomness: 'normal' } as never);
    const [h1] = fixtureXgPair(70, 70, mulberry32(7), cfg);
    const [h2] = fixtureXgPair(70, 70, mulberry32(7), slow);
    return h2 < h1;
  })());
  check('hash32 kararlı ve 32-bit işaretsiz', hash32('lig|a|b') === hash32('lig|a|b') && hash32('lig|a|b') > 0 && hash32('lig|a|b') !== hash32('lig|b|a'));
}

// ——— C2: compactMatchEvents ———
{
  const ev = (e: Partial<DemoMatchEvent>): DemoMatchEvent => ({ minute: 10, text: '', kind: 'info', ...e } as DemoMatchEvent);
  const events: DemoMatchEvent[] = [
    ev({ minute: 55, kind: 'sub', side: 'home' }),
    ev({ minute: 12, kind: 'goal', side: 'home', scorerId: 'p1' }),
    ev({ minute: 23, kind: 'card', side: 'away', anim: { eventType: 'card', outcome: 'yellow' }, playerId: 'p2' }),
    ev({ minute: 41, kind: 'card', side: 'home', anim: { eventType: 'card', outcome: 'red-direct' }, playerId: 'p3' }),
    ev({ minute: 70, kind: 'card', side: 'away', text: 'İkinci sarı → kırmızı! X oyun dışı.' }),
    ev({ minute: 30, kind: 'info', side: 'home' }),
    ev({ minute: 88, kind: 'goal', side: 'away', playerId: 'p4' }),
  ];
  const compact = compactMatchEvents(events);
  const at = (minute: number) => compact.find((c) => c[0] === minute)!;
  check('Yalnız gol/kart/değişiklik saklanır (info elenir)', compact.length === 6);
  check('Dakika sırasına dizilir', compact.every((c, i) => i === 0 || compact[i - 1][0] <= c[0]));
  check('Gol kodu/taraf/oyuncu', at(12)[1] === EV_GOAL && at(12)[2] === SIDE_HOME && at(12)[3] === 'p1');
  check('Sarı kart rengi animden', at(23)[1] === EV_YELLOW && at(23)[3] === 'p2');
  check('Direkt kırmızı kodu', at(41)[1] === EV_RED);
  check('Metin fallbacki ile ikinci sarı→kırmızı', at(70)[1] === EV_RED);
  check('Değişiklik kodu ve taraf', at(55)[1] === EV_SUB && at(55)[2] === SIDE_HOME);
  check('Deplasman golü taraf kodu', at(88)[1] === EV_GOAL && at(88)[2] === SIDE_AWAY);
  check('Tarafsız olay taraf kodu 2', compactMatchEvents([ev({ minute: 1, kind: 'goal' })])[0][2] === 2);
  check('Boş olay listesi boş döner', compactMatchEvents([]).length === 0);
}

// ——— C2: goalMinuteProfile ———
{
  const mkReport = (over: Partial<MatchArchiveEntry>): MatchArchiveEntry => ({
    id: Math.random().toString(36), day: 1, seasonNo: 1, comp: 'lig', homeId: MINE, awayId: OPP,
    hg: 0, ag: 0, xgHome: 1, xgAway: 1, foulsHome: 0, foulsAway: 0, yellowsHome: 0, yellowsAway: 0,
    redsHome: 0, redsAway: 0, playerRows: {}, playerClubIds: {}, ...over,
  });
  // Evde: 12' gol (ben), 80' gol (rakip) → geriye düşülür ama skor 2-1 kazanılır
  const homeWin = mkReport({
    hg: 2, ag: 1,
    events: [[12, EV_GOAL, SIDE_HOME], [50, EV_GOAL, SIDE_HOME], [80, EV_GOAL, SIDE_AWAY]],
  });
  // Deplasmanda: 30' rakip gol, 65' ben gol → 1-1
  const awayDraw = mkReport({
    id: 'r2', homeId: OPP, awayId: MINE, hg: 1, ag: 1,
    events: [[30, EV_GOAL, SIDE_HOME], [65, EV_GOAL, SIDE_AWAY]],
  });
  const profile = goalMinuteProfile([homeWin, awayDraw], MINE);
  check('Olay taşıyan maç sayısı', profile.matchesWithEvents === 2);
  check('Atılan gol toplamı (ev+dep perspektifi)', profile.scoredTotal === 3, String(profile.scoredTotal));
  check('Yenilen gol toplamı', profile.concededTotal === 2, String(profile.concededTotal));
  check('16-30 diliminde 1 yenilen (deplasmanda 30\'da rakip)', profile.buckets[1].conceded === 1 && profile.buckets[1].scored === 0);
  check('61-75 diliminde 1 atılan (deplasman golü 65\')', profile.buckets[4].scored === 1);
  check('76+ diliminde 1 yenilen', profile.buckets[5].conceded === 1);
  check('İlk yarı gol oranı 1/3', profile.firstHalfScoredShare !== null && Math.abs(profile.firstHalfScoredShare - 1 / 3) < 0.01);
  check('76+ geç gol oranı 0 (atılanlarda)', profile.lateScoredShare === 0);
  // İlk maçta ben öne geçtim (sayılmaz); deplasmanda geriye düşüp berabere kaldım (1 maç, 0 galibiyet)
  check('Geriye düşülen 1 maç var, galibiyet yok', profile.comeFromBehindMatches === 1 && profile.comeFromBehindWins === 0 && profile.comeFromBehindRate === 0);

  // Eski kayıt: events yok → dürüst boşluk
  const legacy = mkReport({ id: 'legacy', events: undefined });
  const legacyProfile = goalMinuteProfile([legacy], MINE);
  check('Eski kayıtta profil boş döner', legacyProfile.matchesWithEvents === 0 && legacyProfile.firstHalfScoredShare === null && legacyProfile.comeFromBehindRate === null);
}

// ——— C3: buildLeagueXptsTable ———
{
  const fx = (over: Partial<DemoFixture>): DemoFixture => ({ round: 1, day: 1, homeId: MINE, awayId: OPP, played: true, comp: 'lig', ...over });
  const fixtures: DemoFixture[] = [
    fx({ xgHome: 2.2, xgAway: 0.6 }),                          // ben favori
    fx({ day: 2, homeId: OPP, awayId: THIRD, xgHome: 1.5, xgAway: 1.4 }),
    fx({ day: 3, homeId: THIRD, awayId: MINE, xgHome: 0.5, xgAway: 1.8 }),
    fx({ day: 4, comp: 'kupa', xgHome: 3, xgAway: 0.2 }),     // kupa sayılmaz
    fx({ day: 5, played: false, xgHome: 1, xgAway: 1 }),      // oynanmamış
    fx({ day: 6, homeId: THIRD, awayId: 'club4' }),           // xG yok (eski kayıt) → sayılmaz
  ];
  const table = buildLeagueXptsTable(fixtures);
  const covered = new Set(table.map((r) => r.clubId));
  check('Yalnız lig/oynanmış/xGli fikstürler kapsanır', covered.size === 3 && !covered.has('club4'), String([...covered]));
  const mine = table.find((r) => r.clubId === MINE)!;
  check('Maç sayıları doğru', mine.matches === 2 && table.every((r) => r.matches >= 1));
  const exp1 = expectedMatchPoints(2.2, 0.6);
  const exp2 = expectedMatchPoints(0.5, 1.8); // ben deplasmandayım: awayXp kullanılır
  check('xPTS toplamı Poisson beklentisiyle aynı', Math.abs(mine.xpts - (exp1.homeXp + exp2.awayXp)) < 0.02, String(mine.xpts));
  check('Sıralama xPTS azalan', table.every((r, i) => i === 0 || table[i - 1].xpts >= r.xpts));
  check('Boş/uyumsuz girdide boş dizi', buildLeagueXptsTable([]).length === 0 && buildLeagueXptsTable([fx({ played: false })]).length === 0);
}

// ——— C1: seasonMatchStats ———
{
  const mkReport = (over: Partial<MatchArchiveEntry>): MatchArchiveEntry => ({
    id: Math.random().toString(36), day: 1, seasonNo: 1, comp: 'lig', homeId: MINE, awayId: OPP,
    hg: 0, ag: 0, xgHome: 1, xgAway: 1, foulsHome: 0, foulsAway: 0, yellowsHome: 0, yellowsAway: 0,
    redsHome: 0, redsAway: 0, playerRows: {}, playerClubIds: {}, ...over,
  });
  const reports = [
    mkReport({ id: 'h', poss: 60, shotsH: 10, shotsA: 6, shotsOnH: 5, shotsOnA: 2, cornersH: 7, cornersA: 3, savesH: 2, savesA: 4, pressH: 14, pressA: 9 }),
    // Deplasman: alanlar rakip tarafında; benim perspektifime çevrilmeli
    mkReport({ id: 'a', homeId: OPP, awayId: MINE, poss: 45, shotsH: 8, shotsA: 12, shotsOnH: 3, shotsOnA: 6, cornersH: 4, cornersA: 8, savesH: 5, savesA: 1, pressH: 10, pressA: 16 }),
    // Eski kayıt: C1 alanları yok → dışlanır
    mkReport({ id: 'legacy', poss: undefined, shotsH: undefined }),
    // Başka sezon → dışlanır
    mkReport({ id: 's2', seasonNo: 2, poss: 80, shotsH: 20, shotsA: 0, shotsOnH: 10, shotsOnA: 0, cornersH: 1, cornersA: 1, savesH: 1, savesA: 1, pressH: 1, pressA: 1 }),
  ];
  const s = seasonMatchStats(reports, MINE, 1);
  check('Yalnız C1 taşıyan 2 maç sayıldı', s.matches === 2);
  check('Sahip olma ev/dep çevirisiyle ortalanır', s.possessionAvg === Math.round((60 + 55) / 2), String(s.possessionAvg));
  check('Maç başı şut (10+12)/2=11', s.shotsPerMatch === 11, String(s.shotsPerMatch));
  check('İsabetli şut (5+6)/2=5.5', s.shotsOnPerMatch === 5.5, String(s.shotsOnPerMatch));
  check('Şut isabeti 11/22 → %50', s.shotAccuracy === 50, String(s.shotAccuracy));
  check('Korner/kurtarış/pres ortalamaları', s.cornersPerMatch === 7.5 && s.savesPerMatch === 1.5 && s.pressPerMatch === 15, String([s.cornersPerMatch, s.savesPerMatch, s.pressPerMatch]));
  const empty = seasonMatchStats([mkReport({ id: 'x', poss: undefined, shotsH: undefined })], MINE, 1);
  check('Veri yoksa tüm alanlar null dürüst boşluk', empty.matches === 0 && empty.possessionAvg === null && empty.shotAccuracy === null);
}

// ——— v4: genişletilmiş olay türleri (kurtarış/VAR/sakatlık) ———
{
  const ev = (e: Partial<DemoMatchEvent>): DemoMatchEvent => ({ minute: 10, text: '', kind: 'info', ...e } as DemoMatchEvent);
  const events: DemoMatchEvent[] = [
    ev({ minute: 20, kind: 'save', side: 'home', playerId: 'gk1' }),
    ev({ minute: 33, kind: 'var', side: 'away' }),
    // Gerçek sakatlanma: anim.eventType injury
    ev({ minute: 60, kind: 'injury', side: 'home', playerId: 'p9', anim: { eventType: 'injury' } }),
    // Geçici tedavi: anim yok → arşive alınmamalı
    ev({ minute: 61, kind: 'injury', side: 'home', playerId: 'p9' }),
  ];
  const compact = compactMatchEvents(events);
  check('Kurtarış olayı kodlanır', compact.some((c) => c[1] === EV_SAVE && c[3] === 'gk1'));
  check('VAR iptali kodlanır', compact.some((c) => c[1] === EV_VAR && c[2] === SIDE_AWAY));
  const injuryEvents = compact.filter((c) => c[1] === EV_INJURY);
  check('Yalnız gerçek sakatlanma saklanır (tedavi molası elenir)', injuryEvents.length === 1 && injuryEvents[0][3] === 'p9');
}

// ——— v4: firstGoalProfile ———
{
  const mk = (over: Partial<MatchArchiveEntry>): MatchArchiveEntry => ({
    id: Math.random().toString(36), day: 1, seasonNo: 1, comp: 'lig', homeId: MINE, awayId: OPP,
    hg: 0, ag: 0, xgHome: 1, xgAway: 1, foulsHome: 0, foulsAway: 0, yellowsHome: 0, yellowsAway: 0,
    redsHome: 0, redsAway: 0, playerRows: {}, playerClubIds: {}, ...over,
  });
  // Ben ilk golü atıp 2-1 kazandım
  const r1 = mk({ hg: 2, ag: 1, events: [[10, EV_GOAL, SIDE_HOME], [50, EV_GOAL, SIDE_AWAY], [70, EV_GOAL, SIDE_HOME]] });
  // Ben ilk golü atıp 1-1 verildim (çöküş)
  const r2 = mk({ id: 'r2', hg: 1, ag: 1, events: [[20, EV_GOAL, SIDE_HOME], [80, EV_GOAL, SIDE_AWAY]] });
  // İlk golü yiyip 2-1 döndüm
  const r3 = mk({ id: 'r3', hg: 2, ag: 1, events: [[15, EV_GOAL, SIDE_AWAY], [40, EV_GOAL, SIDE_HOME], [60, EV_GOAL, SIDE_HOME]] });
  const p = firstGoalProfile([r1, r2, r3], MINE);
  check('İlk gol attığım maç sayısı 2', p.scoredFirst.matches === 2);
  check('İlk golde 1 galibiyet 1 beraberlik', p.scoredFirst.wins === 1 && p.scoredFirst.draws === 1);
  check('Puan verimi 4/6 = 0.67', p.scoredFirst.pointRate !== null && Math.abs(p.scoredFirst.pointRate - 4 / 6) < 0.01);
  check('Geriye düşüp dönüş: 1 maç, %100', p.concededFirst.matches === 1 && p.concededFirst.comebackRate === 1);
  check('Kurşun çöküşü 1 maç', p.leadCollapses === 1);
  check('Golsüz maçlar ilk gol sayımına girmez', firstGoalProfile([mk({ id: 'z', events: [] })], MINE).matchesWithEvents === 0);
}

// ——— v4: injuryTally + varStats ———
{
  const mk = (over: Partial<MatchArchiveEntry>): MatchArchiveEntry => ({
    id: Math.random().toString(36), day: 1, seasonNo: 1, comp: 'lig', homeId: MINE, awayId: OPP,
    hg: 0, ag: 0, xgHome: 1, xgAway: 1, foulsHome: 0, foulsAway: 0, yellowsHome: 0, yellowsAway: 0,
    redsHome: 0, redsAway: 0, playerRows: {}, playerClubIds: {}, ...over,
  });
  const reports = [
    mk({ events: [[30, EV_INJURY, SIDE_HOME, 'p1']] }),
    // Deplasmandayım: benim tarafım SIDE_AWAY
    mk({ id: 'b', events: [[40, EV_INJURY, SIDE_AWAY, 'p1']], homeId: OPP, awayId: MINE }),
    mk({ id: 'c', events: [[50, EV_INJURY, SIDE_HOME, 'p2']] }),
    mk({ id: 'd', events: [[60, EV_VAR, SIDE_HOME], [70, EV_VAR, SIDE_AWAY], [80, EV_VAR, 2]] }),
  ];
  const tally = injuryTally(reports, MINE);
  check('Sakatlık sayımı oyuncu bazında ve tarafa duyarlı', tally.length === 2 && tally[0].playerId === 'p1' && tally[0].count === 2 && tally[1].count === 1);
  const vs = varStats(reports, MINE);
  check('VAR: 1 benim iptal, 1 rakip, nötr sayılmaz', vs.myCancelled === 1 && vs.oppCancelled === 1 && vs.total === 2);
  check('Olayısız arşivde sıfırlar', varStats([mk({ id: 'e', events: [] })], MINE).total === 0);
}

// ——— v4: buildRefereeProfile ———
{
  const mk = (over: Partial<MatchArchiveEntry>): MatchArchiveEntry => ({
    id: Math.random().toString(36), day: 1, seasonNo: 1, comp: 'lig', homeId: MINE, awayId: OPP,
    hg: 2, ag: 0, xgHome: 1, xgAway: 1, foulsHome: 10, foulsAway: 8, yellowsHome: 3, yellowsAway: 2,
    redsHome: 0, redsAway: 0, referee: { label: 'Hakem X', strictness: 'strict' },
    playerRows: {}, playerClubIds: {}, ...over,
  });
  const reports = [
    mk({}),
    mk({ id: 'r2', hg: 1, ag: 1, foulsHome: 6, foulsAway: 4 }),
    mk({ id: 'r3', referee: { label: 'Hakem Y', strictness: 'lenient' }, hg: 0, ag: 1, foulsHome: 2, foulsAway: 2, yellowsHome: 0, yellowsAway: 0 }),
  ];
  const profiles = buildRefereeProfile(reports, MINE);
  const x = profiles.find((p) => p.label === 'Hakem X')!;
  check('Hakem X 2 maçta toplandı', x.matches === 2 && x.strictness === 'strict');
  check('Maç başı faul ortalaması (10+8+6+4)/2 = 14', x.foulsPerMatch === 14);
  check('Benim karnem 1G 1B 0M', x.myWins === 1 && x.myDraws === 1 && x.myLosses === 0);
  check('Hakemsiz raporlar elenir', profiles.every((p) => p.matches > 0) && profiles.length === 2);
}

// ——— v4: buildLeagueLuckSnapshot ———
{
  const fx = (over: Partial<DemoFixture>): DemoFixture => ({ round: 1, day: 1, homeId: MINE, awayId: OPP, played: true, comp: 'lig', ...over });
  const fixtures = [
    fx({ xgHome: 2.5, xgAway: 0.4 }),
    fx({ day: 2, homeId: OPP, awayId: THIRD, xgHome: 1.0, xgAway: 1.0 }),
    fx({ day: 3, homeId: THIRD, awayId: MINE, xgHome: 0.5, xgAway: 2.0 }),
  ];
  const table: TableRow[] = [
    { clubId: MINE, p: 3, w: 3, d: 0, l: 0, gf: 6, ga: 1, pts: 9 },
    { clubId: OPP, p: 2, w: 0, d: 1, l: 1, gf: 1, ga: 3, pts: 1 },
    { clubId: THIRD, p: 2, w: 0, d: 1, l: 1, gf: 1, ga: 4, pts: 1 },
  ];
  const luck = buildLeagueLuckSnapshot(fixtures, table);
  check('Tüm üç kulüp kapsandı', luck.length === 3);
  check('Sıralama fark azalan (en şanslı başta)', luck[0].diff >= luck[1].diff && luck[1].diff >= luck[2].diff);
  const mine = luck.find((r) => r.clubId === MINE)!;
  check('Fark gerçek puan eksi xPTS', Math.abs(mine.diff - (9 - mine.xpts)) < 0.11);
  check('Veri yetersizse boş dizi', buildLeagueLuckSnapshot([fx({ played: false })], table).length === 0);
}

// ——— v4: cardDisciplineByPosition ———
{
  const mk = (over: Partial<MatchArchiveEntry>): MatchArchiveEntry => ({
    id: Math.random().toString(36), day: 1, seasonNo: 1, comp: 'lig', homeId: MINE, awayId: OPP,
    hg: 0, ag: 0, xgHome: 1, xgAway: 1, foulsHome: 0, foulsAway: 0, yellowsHome: 0, yellowsAway: 0,
    redsHome: 0, redsAway: 0, playerRows: {}, playerClubIds: {}, ...over,
  });
  const reports = [
    mk({
      playerRows: {
        p1: { min: 90, g: 0, a: 0, yellow: 2, red: 0, rating: 6, posGroup: 'MC' },
        p2: { min: 90, g: 0, a: 0, yellow: 0, red: 1, rating: 5, posGroup: 'DF' },
        p3: { min: 45, g: 0, a: 0, yellow: 1, red: 0, rating: 6, posGroup: 'MC' },
        opp: { min: 90, g: 1, a: 0, yellow: 1, red: 0, rating: 7, posGroup: 'ST' },
      },
      playerClubIds: { p1: MINE, p2: MINE, p3: MINE, opp: OPP },
    }),
  ];
  const disc = cardDisciplineByPosition(reports, MINE);
  check('Rakip oyuncuları dışlandı, 2 grup var', disc.length === 2);
  const mc = disc.find((d) => d.posGroup === 'MC')!;
  check('MC sarı toplamı 3', mc.yellows === 3 && mc.minutes === 135);
  check('1000 dakika kart ağırlığı hesaplı', mc.cardsPer1000 !== null && mc.cardsPer1000 > 0);
  check('Boş posGroup güvenli', cardDisciplineByPosition([mk({ id: 'x' })], MINE).length === 0);
}

// ——— v4: seasonSummary ———
{
  const mk = (over: Partial<MatchArchiveEntry>): MatchArchiveEntry => ({
    id: Math.random().toString(36), day: 1, seasonNo: 1, comp: 'lig', homeId: MINE, awayId: OPP,
    hg: 0, ag: 0, xgHome: 1.4, xgAway: 0.8, foulsHome: 0, foulsAway: 0, yellowsHome: 0, yellowsAway: 0,
    redsHome: 0, redsAway: 0, playerRows: {}, playerClubIds: {}, ...over,
  });
  const reports = [
    mk({ poss: 55, shotsH: 10, shotsA: 4, shotsOnH: 5, shotsOnA: 1, cornersH: 6, cornersA: 2 }),
    mk({ id: 'a', homeId: OPP, awayId: MINE, xgHome: 0.6, xgAway: 1.2, poss: 40, shotsH: 4, shotsA: 10, shotsOnH: 1, shotsOnA: 5, cornersH: 2, cornersA: 8 }),
    mk({ id: 's2', seasonNo: 2 }), // başka sezon — dışlanır
  ];
  const s = seasonSummary(reports, MINE, 1);
  check('2 maç sayıldı', s.matches === 2);
  check('xG toplamı perspektif çevirisiyle 2.6 – 1.4', s.xgf === 2.6 && s.xga === 1.4);
  check('Şut isabeti 10/20 = %50', s.shotAccuracy === 50);
  check('Maç başı korner 7', s.cornersPerMatch === 7);
  check('Maçsız sezon nötr özet', seasonSummary([], MINE, 1).matches === 0);
}

// ——— v4: goalMinuteProfile rakip filtresi ———
{
  const mk = (over: Partial<MatchArchiveEntry>): MatchArchiveEntry => ({
    id: Math.random().toString(36), day: 1, seasonNo: 1, comp: 'lig', homeId: MINE, awayId: OPP,
    hg: 1, ag: 0, xgHome: 1, xgAway: 1, foulsHome: 0, foulsAway: 0, yellowsHome: 0, yellowsAway: 0,
    redsHome: 0, redsAway: 0, playerRows: {}, playerClubIds: {}, ...over,
  });
  const reports = [
    mk({ events: [[10, EV_GOAL, SIDE_HOME]] }),
    mk({ id: 'other', awayId: THIRD, events: [[20, EV_GOAL, SIDE_HOME]] }),
  ];
  const vsOpp = goalMinuteProfile(reports, MINE, OPP);
  check('H2H dakika profili yalnız rakip maçlarını sayar', vsOpp.matchesWithEvents === 1 && vsOpp.scoredTotal === 1);
}

// ——— Özet ———
const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.detail ? ` | ${r.detail}` : ''}`);
console.log(`\nCWAVE-QA: ${results.length - failed.length}/${results.length} ${failed.length === 0 ? 'PASS' : `FAIL (${failed.length} hata)`}`);
process.exit(failed.length ? 1 : 0);
