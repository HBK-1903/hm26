// Real provider + score fingerprint, plus focused edge cases. No production saves are used.
import 'fake-indexeddb/auto';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { GameProvider, useGame } from '../src/store/game';
import { aiGoalScorers, aiStartingPlayers, recordAiMatch } from '../src/engine/aiMatchStats';
import { seasonRatings } from '../src/engine/seasonRatings';
import { aiDefaultTactic } from '../src/engine/tactics';
import { autoLineup } from '../src/engine/profiles';
import { clubById } from '../src/data/clubs';
import { computeSeasonAwards } from '../src/data/awards';
import { deleteSave, parseImportFile, readSave, writeSave, SAVE_VERSION } from '../src/store/persist';
import scoreFingerprint from './fixtures/ai-score-fingerprint.json';
import oldBackup from './fixtures/save-v2-original.json';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, SVGElement: dom.window.SVGElement, localStorage: dom.window.localStorage, requestAnimationFrame: (cb: any) => setTimeout(cb, 16), cancelAnimationFrame: (id: any) => clearTimeout(id), IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
dom.window.matchMedia = () => ({ matches: false, media: '', onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } });
Object.defineProperty(globalThis, 'matchMedia', { value: dom.window.matchMedia, configurable: true });

const career: any = { slot: 1, manager: { name: 'QA', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 0 }, clubId: 'denizli_yesilova', seed: 12345, day: 1, week: 1, settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true }, pending: { marketShortlist: [], activeProject: null } };
let game!: ReturnType<typeof useGame>;
const Capture = () => { game = useGame(); return null; };
const root = createRoot(dom.window.document.getElementById('root')!);
let passed = 0, failed = 0;
const check = (name: string, condition: unknown, detail = '') => { condition ? passed++ : failed++; console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
let key = 0;
async function mount(snapshot?: any) {
  await act(async () => root.render(<GameProvider key={++key} career={snapshot?.career ?? career} snapshot={snapshot}><Capture /></GameProvider>));
}
async function advance() {
  let result: ReturnType<typeof game.advanceDay> | undefined;
  await act(async () => { result = game.advanceDay(); });
  if (result?.blocked) throw new Error(`Gün ilerlemesi engellendi: ${result.reason}`);
}

try {
  await mount();
  const original: any = clone(game.snapshotForBackup());
  const squad = game.squads['ist_halic'];
  const starting = aiStartingPlayers(squad, '4-3-3');
  const rng = () => 0.1;
  const goalless = recordAiMatch({}, 'ist_halic', starting, 0, rng);
  check('0–0: 11 oyuncunun hepsi bir kez sayılır, hiç gol/asist/reyting üretilmez', starting.length === 11 && Object.values(goalless).length === 11 && Object.values(goalless).every((row) => row.apps === 1 && row.goals === 0 && row.assists === 0 && row.ratingSum === 0));
  let roll = 0;
  const many = recordAiMatch({}, 'ist_halic', starting, 6, () => [0.01, 0.1, 0.99][roll++ % 3]);
  check('6 gol ve 6 asist: gol/asist katkıları maç sayısını şişirmez', Math.max(...Object.values(many).map((row) => row.goals)) === 6 && Math.max(...Object.values(many).map((row) => row.assists)) === 6 && Object.values(many).every((row) => row.apps === 1));
  const unique = recordAiMatch({}, 'ist_halic', [starting[0], starting[0]], 0, rng);
  check('Çift oyuncu kimliği tek katılım sayılır', unique[starting[0].id].apps === 1);
  const specialPlayer = { ...starting[0], id: '__proto__' };
  const specialStats = recordAiMatch({}, 'ist_halic', [specialPlayer], 1, rng);
  check('Özel oyuncu kimliği kayıt anahtarı olarak güvenle işlenir', Object.getPrototypeOf(specialStats) === Object.prototype && Object.prototype.hasOwnProperty.call(specialStats, '__proto__') && specialStats.__proto__.apps === 1 && specialStats.__proto__.goals === 1 && !(Object.prototype as any).apps);
  const duplicateLineup = autoLineup([...squad, ...squad], '4-3-3');
  const matchIds = [...duplicateLineup.slots.map((slot) => slot.player.id), ...duplicateLineup.bench.map((p) => p.id)];
  check('Mükerrer eski kadro kimlikleri maçın 11+9 listesinde tekrarlanmaz', duplicateLineup.slots.length === 11 && duplicateLineup.bench.length === 9 && new Set(matchIds).size === 20);
  const reserve = squad.find((player) => !starting.some((p) => p.id === player.id))!;
  const previousReserve: any = { [reserve.id]: { playerId: reserve.id, clubId: 'ist_halic', apps: 2, goals: 1, assists: 0, yellows: 0, reds: 0, ratingSum: 0 } };
  const forcedOutsider = recordAiMatch(previousReserve, 'ist_halic', starting, 1, rng, true, [reserve]);
  check('Oynamayan yedek gole veya yeni katılıma yazılmaz', forcedOutsider[reserve.id].apps === 2 && forcedOutsider[reserve.id].goals === 1);
  const unfit = squad.map((p, i) => i === 0 ? { ...p, injuredDays: 5 } : i === 1 ? { ...p, suspendedMatches: 1 } : i === 2 ? { ...p, fitness: 20 } : p);
  const available = aiStartingPlayers(unfit, '4-3-3');
  check('Sakat, cezalı ve kondisyonu yetersiz AI oyuncuları seçilmez', available.length === 11 && !available.some((p) => unfit.slice(0, 3).some((q) => q.id === p.id)));
  let draws = 0;
  const noAvailable = recordAiMatch({}, 'ist_halic', [], 2, () => { draws++; return 0.1; }, true);
  let intlDraws = 0;
  aiGoalScorers([], 2, () => { intlDraws++; return 0.5; }, true);
  check('Uygun oyuncu yoksa sahte oyuncu üretilmez; skor RNG akışı korunur', Object.keys(noAvailable).length === 0 && draws === 6 && intlDraws === 2);

  // Same score fixture was captured on the original PR head before the fix.
  const mixed = clone(original); mixed.career.day = 26; mixed.day = 26;
  mixed.playerStats = {}; // existing optional save field, populated when matches are played
  const fixtures = mixed.fixtures.filter((f: any) => f.day === 27 && f.homeId !== career.clubId && f.awayId !== career.clubId);
  mixed.friendlies = [{ ...fixtures[0], comp: 'hazirlik' }];
  mixed.cup.fixtures = [{ ...fixtures[1], comp: 'kupa', group: 'A' }, { ...fixtures[2], comp: 'kupa', group: 'A' }];
  mixed.cup.rounds = [{ name: 'Son 16', day: 27, played: false, ties: [{ homeId: fixtures[3].homeId, awayId: fixtures[3].awayId }, { homeId: fixtures[4].homeId, awayId: fixtures[4].awayId }] }];
  for (const cup of mixed.international.cups) cup.fixtures = cup.fixtures.filter((f: any) => f.homeId !== career.clubId && f.awayId !== career.clubId).slice(0, 2).map((f: any) => ({ ...f, day: 27 }));
  await mount(mixed);
  const beforeKeys = Object.keys(game.snapshotForBackup()).sort();
  const beforeSquads = game.squads;
  await advance();
  const mixedResult = {
    league: game.fixtures.filter((f) => f.day === 27 && f.played).map((f) => [f.homeId, f.awayId, f.hg, f.ag]),
    friendlies: game.friendlies.map((f) => [f.hg, f.ag]), cup: game.cup.fixtures.map((f) => [f.hg, f.ag]),
    ko: game.cup.rounds[0].ties.map((f) => [f.hg, f.ag, f.pens ?? false, f.winner]),
    intl: game.international.cups.map((cup) => cup.fixtures.map((f) => [f.homeId, f.awayId, f.hg, f.ag])),
  };
  check('Lig, hazırlık, kupa, eleme ve kıta skorları eski RNG parmak iziyle aynı', JSON.stringify(mixedResult) === JSON.stringify(scoreFingerprint));
  const played: any[] = [
    ...game.fixtures.filter((f) => f.day === 27 && f.played), ...game.friendlies.filter((f) => f.day === 27 && f.played),
    ...game.cup.fixtures.filter((f) => f.day === 27 && f.played), ...game.cup.rounds[0].ties.map((t) => ({ ...t, played: !!t.winner })),
    ...game.international.cups.flatMap((cup) => cup.fixtures.filter((f) => f.day === 27 && f.played)),
  ];
  const expectedApps: Record<string, number> = {}, expectedGoals: Record<string, number> = {};
  for (const f of played) for (const [cid, opponent, goals] of [[f.homeId, f.awayId, f.hg], [f.awayId, f.homeId, f.ag]] as [string, string, number][]) {
    const formation = aiDefaultTactic(clubById(cid), clubById(opponent)).formation;
    for (const p of aiStartingPlayers(beforeSquads[cid] ?? [], formation)) expectedApps[p.id] = (expectedApps[p.id] ?? 0) + 1;
    expectedGoals[cid] = (expectedGoals[cid] ?? 0) + goals;
  }
  const rows = game.playerStats ?? {};
  const mismatched = Object.entries(expectedApps).filter(([id, apps]) => rows[id]?.apps !== apps);
  check('Gerçek provider: her müsabakada yalnız seçilen 11, her maç için bir kez sayılır', mismatched.length === 0 && Object.keys(rows).length === Object.keys(expectedApps).length, `${played.length} maç; ${Object.keys(expectedApps).length} oyuncu; hata=${mismatched.length}`);
  const totalsByClub: Record<string, number> = {};
  Object.values(rows).forEach((r) => { totalsByClub[r.clubId] = (totalsByClub[r.clubId] ?? 0) + r.goals; });
  check('Gerçek provider: takım golleri fikstür skorlarıyla eşleşir', Object.entries(expectedGoals).every(([cid, count]) => (totalsByClub[cid] ?? 0) === count));
  const zero = game.fixtures.find((f) => f.day === 27 && f.played && f.hg === 0 && f.ag === 0)!;
  const zeroPlayers = zero ? [zero.homeId, zero.awayId].flatMap((cid) => aiStartingPlayers(beforeSquads[cid], aiDefaultTactic(clubById(cid), clubById(cid === zero.homeId ? zero.awayId : zero.homeId)).formation)) : [];
  check('Gerçek provider: 0–0 maçın katkısız oyuncuları da sayılır', zeroPlayers.length === 22 && zeroPlayers.every((p) => (rows[p.id]?.apps ?? 0) >= 1) && zeroPlayers.some((p) => rows[p.id].goals === 0 && rows[p.id].assists === 0));
  check('AI maçlarına sahte puan veya kart eklenmez', Object.values(rows).every((r) => r.ratingSum === 0 && r.yellows === 0 && r.reds === 0));
  check('Menajerin oynanmamış maçı ve kadrosu AI sayacına girmez', game.fixtures.some((f) => f.day === 27 && !f.played && (f.homeId === career.clubId || f.awayId === career.clubId)) && (beforeSquads[career.clubId] ?? []).every((p) => !rows[p.id]));
  const mixedSnapshot: any = clone(game.snapshotForBackup());
  check('AI katılımı ek kalıcı alan oluşturmaz', mixedSnapshot.version === SAVE_VERSION && JSON.stringify(Object.keys(mixedSnapshot).sort()) === JSON.stringify(beforeKeys), `eklenen=${Object.keys(mixedSnapshot).filter((key) => !beforeKeys.includes(key)).join(',')} kaybolan=${beforeKeys.filter((key) => !(key in mixedSnapshot)).join(',')}`);
  const savedStats = clone(mixedSnapshot.playerStats);
  const imported: any = parseImportFile(JSON.stringify({ format: 'hm26-save', version: 4, exportedAt: 1, blob: { ...mixedSnapshot, version: 4 } })).blob;
  await mount(imported);
  check('Yedekten yüklemede yeni katılım/gol toplamları korunur', JSON.stringify(game.playerStats) === JSON.stringify(savedStats));
  await deleteSave(1);
  await writeSave(game.snapshotForBackup());
  const durable = await readSave(1);
  check('IndexedDB kaydı gerçek oyuncu katılımlarını korur', durable?.blob.version === SAVE_VERSION && JSON.stringify(durable?.blob.playerStats) === JSON.stringify(savedStats));
  await deleteSave(1);
  const repeated = clone(imported); repeated.career.day = 26; repeated.day = 26;
  await mount(repeated); await advance();
  check('Oynanmış fikstürler aynı gün yeniden işlenmez', JSON.stringify(game.playerStats) === JSON.stringify(savedStats));

  // A single continental fixture: the cup's scorers must be the same people as
  // the season aggregate, not an independently sampled set of scorers.
  const international = clone(original); international.career.day = 26; international.day = 26;
  international.friendlies = []; international.fixtures = international.fixtures.map((f: any) => ({ ...f, day: 200 }));
  international.cup.fixtures = international.cup.fixtures.map((f: any) => ({ ...f, day: 200 }));
  international.cup.rounds = [];
  const comp = international.international.cups[0];
  const selected = comp.fixtures.find((f: any) => f.homeId !== career.clubId && f.awayId !== career.clubId);
  comp.fixtures = comp.fixtures.map((f: any) => ({ ...f, day: f.homeId === selected.homeId && f.awayId === selected.awayId ? 27 : 200 }));
  international.international.cups[1].fixtures = international.international.cups[1].fixtures.map((f: any) => ({ ...f, day: 200 }));
  await mount(international); await advance();
  const playedIntl = game.international.cups[0].fixtures.find((f) => f.homeId === selected.homeId && f.awayId === selected.awayId)!;
  const scorerRows = Object.values(game.international.cups[0].scorers ?? {});
  const seasonGoals = Object.values(game.playerStats ?? {}).filter((row) => row.goals > 0);
  check('Kıta gol krallığı ve sezon toplamı aynı gerçek seçilmiş golcüleri kullanır', playedIntl.played && (playedIntl.hg ?? 0) + (playedIntl.ag ?? 0) > 0 && scorerRows.length === seasonGoals.length && scorerRows.every((row) => game.playerStats?.[row.playerId]?.goals === row.goals));
  check('Kıta maçında gol atmayan 11’ler ve oynamayan yedekler ayrılır', Object.values(game.playerStats ?? {}).length === 22 && Object.values(game.playerStats ?? {}).every((row) => row.apps === 1));
  const knockout = clone(international);
  const koCup = knockout.international.cups[0];
  koCup.fixtures = koCup.fixtures.map((f: any) => ({ ...f, day: 200 }));
  koCup.rounds = [{ name: 'Quarter-final', day: 27, played: false, ties: [{ id: 'qa-intl-ko', homeId: selected.homeId, awayId: selected.awayId }] }];
  await mount(knockout); await advance();
  const koTie = game.international.cups[0].rounds[0].ties[0];
  const koScorers = Object.values(game.international.cups[0].scorers ?? {});
  check('Kıta elemesinde katılım, golcüler ve kazanan birlikte işlenir', !!koTie.winner && Object.values(game.playerStats ?? {}).length === 22 && koScorers.every((row) => game.playerStats?.[row.playerId]?.goals === row.goals));

  // An actual quick-engine match after AI participation adds exactly the engine's
  // playerRows, with report-derived ratings rather than dividing by AI games.
  await mount(imported);
  const myFixture = game.fixtures.find((f) => f.day === 27 && !f.played && (f.homeId === career.clubId || f.awayId === career.clubId))!;
  const beforeEngine = clone(game.playerStats ?? {});
  let match!: ReturnType<typeof game.playLeagueMatch>;
  await act(async () => { match = game.playLeagueMatch(myFixture); });
  const engineRows = Object.entries(match.playerRows).filter(([, row]) => row.min > 0);
  check('Gerçek hızlı maç: motorun oynattığı her oyuncuya bir katılım daha yazılır', engineRows.length >= 22 && engineRows.every(([id]) => (game.playerStats?.[id]?.apps ?? 0) === (beforeEngine[id]?.apps ?? 0) + 1));
  const ratingMap = seasonRatings(game.playerStats ?? {}, game.matchReports ?? [], game.seasonNo);
  check('AI geçmişi + motor maçı: ortalama yalnız puanlı maçlardan hesaplanır', engineRows.every(([id, row]) => ratingMap[id]?.source === 'archive' && ratingMap[id]?.games === 1 && Math.abs(ratingMap[id].average - row.rating) < 1e-9));

  // Preserve old, unverifiable numbers, while correctly adding newly selected XI.
  const legacy = clone(original); legacy.career.day = 26; legacy.day = 26;
  legacy.friendlies = []; legacy.cup.fixtures = legacy.cup.fixtures.map((f: any) => ({ ...f, day: 200 }));
  for (const cup of legacy.international.cups) cup.fixtures = cup.fixtures.map((f: any) => ({ ...f, day: 200 }));
  const leagueFixture = legacy.fixtures.find((f: any) => f.day === 27 && f.homeId !== career.clubId && f.awayId !== career.clubId);
  const legacyPlayer = aiStartingPlayers(beforeSquads[leagueFixture.homeId], aiDefaultTactic(clubById(leagueFixture.homeId), clubById(leagueFixture.awayId)).formation)[0];
  legacy.playerStats = { [legacyPlayer.id]: { playerId: legacyPlayer.id, clubId: leagueFixture.homeId, apps: 2, goals: 2, assists: 0, yellows: 0, reds: 0, ratingSum: 0 } };
  await mount(legacy); check('Geçmişteki doğrulanamayan sayaç sessizce uydurularak değiştirilmez', game.playerStats?.[legacyPlayer.id]?.apps === 2);
  await advance();
  check('Eski sayaca sadece yeni maçın bir katılımı eklenir', game.playerStats?.[legacyPlayer.id]?.apps === 3);
  const missing = clone(legacy); missing.playerStats = {};
  const affected = beforeSquads[leagueFixture.homeId].slice(0, 2);
  missing.playerPatch[affected[0].id] = { injuredDays: 10 };
  missing.playerPatch[affected[1].id] = { suspendedMatches: 2 };
  await mount(missing); const selectedAfterPatch = aiStartingPlayers(game.squads[leagueFixture.homeId], aiDefaultTactic(clubById(leagueFixture.homeId), clubById(leagueFixture.awayId)).formation);
  await advance();
  check('Gerçek provider sakat/cezalı AI oyuncularını saymaz, uygun ilk 11’i sayar', affected.every((p) => !game.playerStats?.[p.id]) && selectedAfterPatch.length === 11 && selectedAfterPatch.every((p) => game.playerStats?.[p.id]?.apps === 1));
  const jobless = clone(original); jobless.career.day = 26; jobless.day = 26;
  jobless.career.jobSearch = { sinceDay: 20, offers: [], firedFrom: career.clubId, firedFromLeague: 'gecit', reason: 'QA' };
  jobless.friendlies = []; jobless.fixtures = jobless.fixtures.map((f: any) => ({ ...f, day: 200 }));
  jobless.cup.fixtures = jobless.cup.fixtures.map((f: any) => ({ ...f, day: 200 }));
  for (const cup of jobless.international.cups) cup.fixtures = cup.fixtures.map((f: any) => ({ ...f, day: 200 }));
  jobless.cup.rounds = [{ name: 'Son 16', day: 27, played: false, ties: [{ id: 'qa-jobless', homeId: career.clubId, awayId: 'ist_halic' }] }];
  await mount(jobless); await advance();
  check('İşsiz menajerin eski kulübünün kupa elemesi AI tarafından oynanır ve sayılır', !!game.cup.rounds[0].ties[0].winner && (game.squads[career.clubId] ?? []).filter((p) => game.playerStats?.[p.id]?.apps === 1).length === 11);

  const rollover = clone(original); rollover.career.day = 300; rollover.day = 300;
  rollover.fixtures = rollover.fixtures.map((f: any) => ({ ...f, played: true, hg: 0, ag: 0 }));
  rollover.friendlies = [];
  rollover.cup.fixtures = rollover.cup.fixtures.map((f: any) => ({ ...f, played: true, hg: 0, ag: 0 }));
  rollover.cup.champion = 'ist_halic';
  rollover.cup.rounds = [{ name: 'Final', day: 299, played: true, ties: [{ id: 'final', homeId: 'ist_halic', awayId: 'ist_bogaz', hg: 1, ag: 0, winner: 'ist_halic' }] }];
  for (const cup of rollover.international.cups) { cup.champion = cup.qualifiers[0].clubId; cup.fixtures = cup.fixtures.map((f: any) => ({ ...f, played: true, hg: 0, ag: 0 })); }
  const ratedPlayer = beforeSquads[career.clubId][0], aiOnly = beforeSquads['ist_halic'][0];
  const line = (p: any, apps: number, ratingSum: number) => ({ playerId: p.id, clubId: p.clubId, apps, goals: 0, assists: 0, yellows: 0, reds: 0, ratingSum });
  rollover.playerStats = { [ratedPlayer.id]: line(ratedPlayer, 12, 14), [aiOnly.id]: line(aiOnly, 10, 0) };
  rollover.matchReports = [0, 1].map((i) => ({ id: `season-rating-${i}`, day: 40 + i, seasonNo: 1, comp: 'lig', homeId: career.clubId, awayId: 'ist_halic', hg: 0, ag: 0, xgHome: 1, xgAway: 1, foulsHome: 0, foulsAway: 0, yellowsHome: 0, yellowsAway: 0, redsHome: 0, redsAway: 0, playerRows: { [ratedPlayer.id]: { min: 90, rating: 7, g: 0, a: 0, yellow: 0, red: 0, posGroup: ratedPlayer.group } }, playerClubIds: { [ratedPlayer.id]: career.clubId } }));
  await mount(rollover); await advance();
  const ratedHistory = game.playerOf(ratedPlayer.id)?.careerHistory?.at(-1), aiHistory = game.playerOf(aiOnly.id)?.careerHistory?.at(-1);
  check('Gerçek sezon kapanışı raporlu ortalamayı ve puansız oyuncuda boş işaretini korur', game.seasonNo === 2 && ratedHistory?.apps === 12 && ratedHistory.avgRating === 7 && aiHistory?.apps === 10 && aiHistory.avgRating === 0);
  await mount(oldBackup.blob);
  check('Gerçek v2 kariyeri açılır, uluslararası alanlar güvenle tamamlanır', game.career.clubId === oldBackup.blob.career.clubId && game.international.cups.length === 2);
  await advance();
  check('Gerçek v2 kariyerinde gün ilerler ve geçerli sürümde yedek üretilir', game.career.day === 2 && game.snapshotForBackup().version === SAVE_VERSION);

  const ratingStats: any = { mixed: { apps: 12, ratingSum: 14 }, ungraded: { apps: 12, ratingSum: 0 }, legacy: { apps: 4, ratingSum: 28 } };
  const row = (rating: number) => ({ min: 90, rating, g: 0, a: 0, yellow: 0, red: 0, posGroup: 'CM' });
  const rated = seasonRatings(ratingStats, [{ seasonNo: 1, playerRows: { mixed: row(7) } }, { seasonNo: 1, playerRows: { mixed: row(7) } }, { seasonNo: 2, playerRows: { mixed: row(2) } }] as any, 1);
  check('Puan ortalaması AI maçlarıyla seyrelmez; puansız oyuncu dışarıda, eski toplam yaklaşık', rated.mixed?.games === 2 && rated.mixed.average === 7 && !rated.ungraded && rated.legacy?.average === 7 && rated.legacy.source === 'legacy');
  const specialReport = JSON.parse('{"__proto__":{"min":90,"rating":7},"missing":null}');
  const specialRatingStats = JSON.parse('{"__proto__":{"apps":1,"ratingSum":7},"missing":null}');
  const specialRatings = seasonRatings(specialRatingStats, [{ seasonNo: 1, playerRows: specialReport }] as any, 1);
  check('Eksik eski karne satırı atlanır; özel kimlik prototipi değiştirmez', specialRatings.__proto__?.average === 7 && Object.getPrototypeOf(specialRatings) === null && !(Object.prototype as any).games && !specialRatings.missing);
  const awardStats: any = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`p${i}`, { playerId: `p${i}`, clubId: 'x', apps: 20, goals: i, assists: 0, yellows: 0, reds: 0, ratingSum: 0 }]));
  awardStats.p0.ratingSum = 64;
  const awards = computeSeasonAwards(awardStats, () => 20, 8, { p0: { games: 8, average: 8, source: 'archive' } });
  check('Sezon ödülleri puansız AI maçlarını sıfır reyting olarak sıralamaz', awards?.mvp.length === 1 && awards.mvp[0].playerId === 'p0' && awards.young.length === 1 && awards.scorer[0].playerId === 'p19');
} catch (error) { failed++; console.error(error); }
finally { await act(async () => root.unmount()); dom.window.close(); }
console.log(`\n${passed}/${passed + failed} AI katılım ve kayıt kontrolü geçti.`);
if (failed) process.exitCode = 1;
