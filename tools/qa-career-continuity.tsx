// Career continuity: real provider, deterministic match evidence and persisted player patches.
import 'fake-indexeddb/auto';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).Element = dom.window.Element;
(globalThis as any).SVGElement = dom.window.SVGElement;
(globalThis as any).localStorage = dom.window.localStorage;
(globalThis as any).Image = dom.window.Image;
(globalThis as any).getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
dom.window.matchMedia = (() => ({ matches: false, media: '', onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } })) as any;

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { GameProvider, useGame, type DemoMatchResult } from '../src/store/game';
import { readSave, SAVE_VERSION, type SaveBlob } from '../src/store/persist';
import { autoLineup } from '../src/engine/profiles';
import { MatchSession } from '../src/engine/session';
import { buildEngineInput, matchEngineToDemo, matchEventsToDemo } from '../src/engine/adapter';
import { makeLiveCheckpoint, restoreLiveCheckpoint, type LiveMatchViewState } from '../src/engine/liveCheckpoint';
import { aiDefaultTactic } from '../src/engine/tactics';
import { clubById } from '../src/data/clubs';
import { applyTrainingWeek } from '../src/data/training';
import { needleOutcome } from '../src/engine/medical';
import type { Career, DemoFixture } from '../src/types';

const career = { slot: 3, manager: { name: 'Süreklilik Testi', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 0 }, clubId: 'denizli_yesilova', seed: 12345, day: 1, week: 1, settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: true, matchSpeed: 'normal', suggestions: true }, pending: { marketShortlist: [], activeProject: null } } as Career;
let g: ReturnType<typeof useGame>;
const Capture = () => { g = useGame(); return null; };
const root = createRoot(document.getElementById('root')!);
let run = 0, passed = 0, failed = 0;
const check = (name: string, ok: unknown, details = '') => { ok ? passed++ : failed++; console.log(`${ok ? '✅' : '❌'} ${name}${details ? ` | ${details}` : ''}`); };
const mount = async (snapshot?: SaveBlob) => { await act(async () => root.render(<GameProvider key={++run} career={career} snapshot={snapshot}><Capture /></GameProvider>)); };
const clone = <T,>(value: T): T => structuredClone(value);
try {
  await mount();
  const baseline = g.snapshotForBackup() as SaveBlob & Record<string, any>;
  const baseSquad = g.mySquad;
  const target = baseSquad[1];
  const mentor = baseSquad.find((p) => p.id !== target.id && p.age >= 29)!;
  if (!mentor || !g.nextFixture) throw new Error('Test kadrosu veya fikstür yok');

  const withContracts = clone(baseline);
  const history = [{ season: 1, clubId: career.clubId, apps: 12, goals: 2, assists: 1, avgRating: 7.1 }];
  withContracts.playerPatch[target.id] = { ...(withContracts.playerPatch[target.id] ?? {}), age: 21, wage: 777, contractYears: 4, mentorId: mentor.id, careerHistory: history };
  await mount(withContracts);
  let advanced: ReturnType<typeof g.advanceDay>;
  await act(async () => { advanced = g.advanceDay(); });
  const evolved = g.playerOf(target.id);
  check('Maçsız gün ilerlerken sözleşme, ücret, yaş, mentor ve kariyer geçmişi korunur', !advanced!.blocked && evolved?.wage === 777 && evolved.contractYears === 4 && evolved.age === 21 && evolved.mentorId === mentor.id && JSON.stringify(evolved.careerHistory) === JSON.stringify(history));
  const saveOk = await act(async () => g.saveNow());
  const saved = await readSave(career.slot);
  check('Güncellemeden sonra aynı oyuncu alanları IndexedDB kaydında korunur', saveOk && (saved?.blob as any)?.playerPatch[target.id]?.wage === 777 && (saved?.blob as any)?.playerPatch[target.id]?.mentorId === mentor.id && saved?.blob.version === SAVE_VERSION);
  if (saved) { await mount(saved.blob); check('Kariyer yeniden açılınca sözleşme ve mentor hâlâ aynı', g.playerOf(target.id)?.wage === 777 && g.playerOf(target.id)?.mentorId === mentor.id); }

  const bans = clone(baseline);
  bans.playerPatch[target.id] = { ...bans.playerPatch[target.id], suspendedMatches: 3 };
  await mount(bans);
  await act(async () => { g.advanceDay(); });
  check('Maç oynanmayan günde maç cezası eksilmez', g.playerOf(target.id)?.suspendedMatches === 3, `kalan=${g.playerOf(target.id)?.suspendedMatches}`);

  const matchday = clone(baseline);
  const fixture = (g.nextFixture ?? null) as DemoFixture | null;
  if (!fixture) throw new Error('Maç günü fikstürü yok');
  matchday.career.day = fixture.day;
  matchday.career.week = Math.ceil(fixture.day / 7);
  for (const p of baseSquad) matchday.playerPatch[p.id] = { ...(matchday.playerPatch[p.id] ?? {}), fitness: 80, injuredDays: 0, suspendedMatches: 0 };
  await mount(matchday);
  let match: DemoMatchResult;
  await act(async () => { match = g.playLeagueMatch({ ...fixture }); });
  const playedIds = new Set(Object.entries(match!.playerRows).filter(([, row]) => row.min > 0).map(([id]) => id));
  const played = baseSquad.filter((p) => playedIds.has(p.id));
  const resting = baseSquad.filter((p) => !playedIds.has(p.id));
  const before = autoLineup(baseSquad.map((p) => ({ ...p, fitness: 80, injuredDays: 0, suspendedMatches: 0 })), g.tactics[0].formation);
  check('Gerçek sonuçta oynayan ve dinlenen oyuncular ayırt edilebilir', played.length >= 11 && resting.length > 0 && before.bench.length > 0, `${played.length} oynadı, ${resting.length} dinlendi`);
  const badRest = resting.filter((p) => g.playerOf(p.id)?.fitness !== 80);
  const badPlayed = played.filter((p) => { const fit = g.playerOf(p.id)?.fitness ?? 0; return fit < 67 || fit > 73; });
  check('Maç sonrası yalnız gerçek dakika alanlar yorulur; oynamayanlar ikinci kez toparlanmaz', badRest.length === 0 && badPlayed.length === 0, `yanlış dinlenen=${badRest.length}, yanlış yorulan=${badPlayed.length}`);
  const once = g.snapshotForBackup() as SaveBlob & Record<string, any>;
  let repeated: DemoMatchResult;
  await act(async () => { repeated = g.playLeagueMatch({ ...fixture }); });
  const twice = g.snapshotForBackup() as SaveBlob & Record<string, any>;
  check('Aynı hızlı maça çift tıklama sonucu ve kariyer etkilerini tekrarlamaz', repeated! === match! && ['playerPatch', 'playerStats', 'matchReports', 'inbox', 'career'].every((key) => JSON.stringify(once[key]) === JSON.stringify(twice[key])));
  await act(async () => { await g.saveNow(); });
  const committedSave = (await readSave(career.slot))!.blob as SaveBlob & Record<string, any>;
  await mount(committedSave);
  await act(async () => { g.playLeagueMatch({ ...fixture }); });
  const afterReloadRepeat = g.snapshotForBackup() as SaveBlob & Record<string, any>;
  check('Kaydı açıp aynı sonucu tekrar istemek de istatistik ve yorgunluğu çoğaltmaz', ['playerPatch', 'playerStats', 'matchReports', 'inbox', 'career'].every((key) => JSON.stringify(committedSave[key]) === JSON.stringify(afterReloadRepeat[key])));

  const nextSeason = clone(matchday);
  nextSeason.seasonNo = 2;
  nextSeason.matchReports = [committedSave.matchReports[0]];
  await mount(nextSeason);
  await act(async () => { g.playLeagueMatch({ ...fixture }); });
  const bothSeasons = g.matchReports!.filter((report) => report.id === committedSave.matchReports[0].id);
  check('Aynı gün ve rakiple sonraki sezonda oynanan maç önceki sezon arşivini silmez', bothSeasons.length === 2 && bothSeasons.some((report) => report.seasonNo === 1) && bothSeasons.some((report) => report.seasonNo === 2));
  await act(async () => { await g.saveNow(); });
  await mount((await readSave(career.slot))!.blob);
  check('İki sezona ait maçlar kayıt açılınca 256 sınırı içinde birlikte korunur', g.matchReports!.length === 2 && g.matchReports!.some((report) => report.seasonNo === 1) && g.matchReports!.some((report) => report.seasonNo === 2));


  // Use the store's actual no-override quick-match path on both sides of the
  // fixture, rather than only injecting an already-adapted engine result.
  for (const [label, index] of [['ev', 0], ['deplasman', 1]] as const) {
    await mount(matchday);
    const upcoming: DemoFixture = matchday.friendlies[index];
    let chosenDay = 0;
    let preview: DemoMatchResult | undefined;
    for (let day = upcoming.day; day < upcoming.day + 200; day++) {
      await act(async () => { g.setCareer((current) => ({ ...current, day })); });
      const candidate = g.buildDemoMatch(upcoming.homeId, upcoming.awayId, g.tactics[0].name, 0);
      const ours = new Set(g.mySquad.map((player) => player.id));
      if (candidate.injuries?.some((row) => ours.has(row.playerId))) { chosenDay = day; preview = candidate; break; }
    }
    if (!preview) { check(`Gerçek ${label} hızlı maçında sakatlık senaryosu bulunur`, false); continue; }
    const quickSave = clone(matchday);
    quickSave.career.day = chosenDay;
    quickSave.friendlies[index] = { ...quickSave.friendlies[index], day: chosenDay };
    const quickFixture = quickSave.friendlies[index] as DemoFixture;
    await mount(quickSave);
    const ours = new Set(g.mySquad.map((player) => player.id));
    let actual: DemoMatchResult;
    await act(async () => { actual = g.playLeagueMatch(quickFixture); });
    const medical = actual!.injuries?.filter((row) => ours.has(row.playerId)) ?? [];
    check(`Gerçek ${label} hızlı maçındaki sakatlık kadroya ve arşive geçer`, medical.length > 0 && JSON.stringify(actual!.injuries) === JSON.stringify(preview.injuries) && medical.every((row) => (g.playerOf(row.playerId)?.injuredDays ?? 0) >= row.days) && !!g.friendlies[index].played && g.matchReports!.length === 1, `gün=${chosenDay}`);
    await act(async () => { await g.saveNow(); });
    await mount((await readSave(career.slot))!.blob);
    check(`Gerçek ${label} hızlı maçının sağlık sonucu yeniden açılınca korunur`, medical.every((row) => (g.playerOf(row.playerId)?.injuredDays ?? 0) >= row.days) && g.matchReports!.length === 1);
  }

  // A ban is measured in matches: a suspended player misses this match, one
  // game is served, then advancing a normal day does not serve another.
  const matchBan = clone(matchday);
  matchBan.playerPatch[target.id].suspendedMatches = 3;
  await mount(matchBan);
  let bannedMatch: DemoMatchResult;
  await act(async () => { bannedMatch = g.playLeagueMatch({ ...fixture }); });
  check('Üç maç cezalı oyuncu oynamaz ve yalnız bir maç cezasını çeker', !(bannedMatch!.playerRows[target.id]?.min > 0) && g.playerOf(target.id)?.suspendedMatches === 2);
  await act(async () => { advanced = g.advanceDay(); });
  check('Maç sonrası takvim günü aynı cezayı tekrar eksiltmez', !advanced!.blocked && g.playerOf(target.id)?.suspendedMatches === 2);

  const realDay = clone(matchday);
  realDay.career.day = fixture.day - 1;
  await mount(realDay);
  await act(async () => { advanced = g.advanceDay(); });
  const beforeGame = new Map(g.mySquad.map((p) => [p.id, p.fitness]));
  let normalMatch: DemoMatchResult;
  await act(async () => { normalMatch = g.playLeagueMatch({ ...fixture }); });
  const unusedToday = [...beforeGame].filter(([id]) => !(normalMatch!.playerRows[id]?.min > 0));
  check('Gerçek takvimden maç gününe geçince oynamayan yedekler iki kez dinlenmez', !advanced!.blocked && unusedToday.length > 0 && unusedToday.every(([id, fitness]) => g.playerOf(id)?.fitness === fitness));


  // Weekly training must start with today's recovered fitness and availability.
  const training = clone(baseline);
  training.career.day = 0; training.career.week = 1;
  training.career.trainingFocus = { area: 'Teknik', intensity: 'normal', sinceDay: 1 };
  for (const p of baseSquad) training.playerPatch[p.id] = { ...(training.playerPatch[p.id] ?? {}), fitness: 80, injuredDays: 0 };
  const oneDay = baseSquad.find((p) => p.age > 21)!;
  training.playerPatch[oneDay.id] = { ...training.playerPatch[oneDay.id], injuredDays: 1, injury: { type: 'adale_gerilmesi', name: 'Adale gerilmesi', daysRemaining: 1, severity: 'hafif', canPlayWithRisk: true } };
  training.riskPlayIds = [oneDay.id];
  await mount(training);
  const recoveredForTraining = g.mySquad.map((p) => ({ ...p, fitness: 86, injuredDays: 0, injury: p.id === oneDay.id ? undefined : p.injury }));
  const facility = g.career.clubFacilities?.training ?? clubById(g.career.clubId).facilities.training;
  const expectedTraining = applyTrainingWeek(recoveredForTraining, training.career.trainingFocus, facility, g.career.seed, 1);
  await act(async () => { advanced = g.advanceDay(); });
  const expectedFit = expectedTraining.patches[oneDay.id]?.fitness ?? 86;
  check('Haftalık antrenman güncel dinlenme ve aynı gün iyileşen oyuncuyu kullanır', !advanced!.blocked && g.playerOf(oneDay.id)?.fitness === expectedFit, `beklenen=${expectedFit}, gerçek=${g.playerOf(oneDay.id)?.fitness}`);
  check('Doğal iyileşmede eski iğne onayı temizlenir', !g.riskPlayIds?.includes(oneDay.id));

  // A short injury is not reduced again on match completion, even for a real
  // approved starter who spends the match on the pitch.
  const risk = clone(matchday);
  const keeper = baseSquad.find((p) => p.group === 'GK')!;
  risk.playerPatch[keeper.id] = { ...risk.playerPatch[keeper.id], injuredDays: 1, injury: { type: 'adale_gerilmesi', name: 'Adale gerilmesi', daysRemaining: 1, severity: 'hafif', canPlayWithRisk: true } };
  risk.riskPlayIds = [keeper.id];
  const riskPlan = risk.tactics[0];
  const chosen = autoLineup(baseSquad.map((p) => ({ ...p, fitness: 80, injuredDays: 0, suspendedMatches: 0 })), riskPlan.formation).slots.map((slot) => slot.player.id);
  chosen[0] = keeper.id; riskPlan.customLineup = chosen;
  await mount(risk);
  let riskResult: DemoMatchResult;
  let aggravated: string[] = [];
  await act(async () => {
    riskResult = g.playLeagueMatch({ ...fixture });
    aggravated = g.applyRiskOutcome(Object.entries(riskResult.playerRows).filter(([, row]) => row.min > 0).map(([id]) => id));
  });
  const needle = needleOutcome(career.seed + fixture.day * 131);
  const newEngineDays = riskResult!.injuries?.filter((entry) => entry.playerId === keeper.id).reduce((max, injury) => Math.max(max, injury.days), 1) ?? 1;
  const expectedDays = newEngineDays + needle.extraDays;
  check('Bir gün sakatlıkla onaylı başlayan oyuncunun süresi maç sonrası ikinci kez düşmez', (riskResult!.playerRows[keeper.id]?.min ?? 0) > 0 && g.playerOf(keeper.id)?.injuredDays === expectedDays && aggravated.includes(keeper.id) === needle.aggravated, `beklenen=${expectedDays}, gerçek=${g.playerOf(keeper.id)?.injuredDays}`);
  check('İğne onayı maç sonunda tüketilir', !g.riskPlayIds?.includes(keeper.id));

  const reserveRisk = clone(matchday);
  const automatic = autoLineup(baseSquad.map((p) => ({ ...p, fitness: 80, injuredDays: 0, suspendedMatches: 0 })), reserveRisk.tactics[0].formation);
  const reserve = automatic.bench.find((p) => p.group !== 'GK')!;
  reserveRisk.playerPatch[reserve.id] = { ...reserveRisk.playerPatch[reserve.id], injuredDays: 8, injury: { type: 'adale_gerilmesi', name: 'Adale gerilmesi', daysRemaining: 8, severity: 'hafif', canPlayWithRisk: true } };
  reserveRisk.riskPlayIds = [reserve.id];
  reserveRisk.tactics[0].customBench = [reserve.id, ...automatic.bench.filter((p) => p.id !== reserve.id).slice(0, 8).map((p) => p.id)];
  await mount(reserveRisk);
  const reserveHome = clubById(fixture.homeId), reserveAway = clubById(fixture.awayId);
  const reserveSide = fixture.homeId === career.clubId ? 'home' : 'away';
  const reserveSession = new MatchSession(buildEngineInput({ homeClub: reserveHome, awayClub: reserveAway, homeSquad: g.squads[reserveHome.id], awaySquad: g.squads[reserveAway.id], homeTactic: reserveSide === 'home' ? g.tactics[0] : aiDefaultTactic(reserveHome, reserveAway), awayTactic: reserveSide === 'away' ? g.tactics[0] : undefined, seed: 42000, settings: g.career.settings, userSide: reserveSide, riskIds: g.riskPlayIds }));
  const reserveSelected = reserveSession.getBench(reserveSide).some((p) => p.id === reserve.id);
  const reserveReport = { ...matchEngineToDemo(reserveSession.finishNow()), homeId: fixture.homeId, awayId: fixture.awayId };
  let benchAggravated: string[] = [];
  await act(async () => { g.playLeagueMatch({ ...fixture }, reserveReport); benchAggravated = g.applyRiskOutcome(Object.entries(reserveReport.playerRows).filter(([, row]) => row.min > 0).map(([id]) => id)); });
  check('Onaylı ama kullanılmayan sakat yedek nüks yaşamaz ve ikinci kez iyileşmez', reserveSelected && !(reserveReport.playerRows[reserve.id]?.min > 0) && !benchAggravated.includes(reserve.id) && g.playerOf(reserve.id)?.injuredDays === 8 && !g.riskPlayIds?.includes(reserve.id));


  // Heal in clinic; reload proves both zero-day UI state and no inherited risk.
  const clinic = clone(baseline);
  clinic.playerPatch[target.id] = { ...clinic.playerPatch[target.id], injuredDays: 5, injury: { type: 'adale_gerilmesi', name: 'Adale gerilmesi', daysRemaining: 5, severity: 'hafif', canPlayWithRisk: true } };
  clinic.riskPlayIds = [target.id];
  await mount(clinic);
  let treated: ReturnType<typeof g.clinicTreat>;
  await act(async () => { treated = g.clinicTreat(target.id); });
  check('Klinik kısa sakatlığı tamamen iyileştirir ve onayı kaldırır', treated!.ok && g.playerOf(target.id)?.injuredDays === 0 && !g.playerOf(target.id)?.injury && !g.riskPlayIds?.includes(target.id));
  await act(async () => { await g.saveNow(); });
  const healedSave = await readSave(career.slot);
  await mount(healedSave!.blob);
  check('Klinik sonucu kayıt açılınca da sağlıklı kalır', g.playerOf(target.id)?.injuredDays === 0 && !g.playerOf(target.id)?.injury && !g.riskPlayIds?.includes(target.id));

  const legacyBase = clone(healedSave!.blob);
  const healedTransferId = 'qa-healed-transferred';
  const healedLegacyId = 'qa-healed-legacy';
  const originalInjury = { type: 'adale_gerilmesi' as const, name: 'Adale', daysRemaining: 5, severity: 'hafif' as const, canPlayWithRisk: true };
  legacyBase.extraPlayers = [...legacyBase.extraPlayers, { ...target, id: healedTransferId, injuredDays: 5, injury: originalInjury }];
  legacyBase.extraSquads[career.clubId] = [...(legacyBase.extraSquads[career.clubId] ?? []), { ...target, id: healedLegacyId, injuredDays: 5, injury: originalInjury }];
  legacyBase.playerPatch[healedTransferId] = { injuredDays: 0 };
  legacyBase.playerPatch[healedLegacyId] = { injuredDays: 0 };
  await mount(legacyBase);
  await act(async () => { await g.saveNow(); });
  await mount((await readSave(career.slot))!.blob);
  check('Transfer ve eski kadrolarda iyileşen oyuncunun eski tanısı kayıt açılınca geri dönmez', [healedTransferId, healedLegacyId].every((id) => g.playerOf(id)?.injuredDays === 0 && !g.playerOf(id)?.injury));


  // Old saves may contain approval IDs even though the player is healthy.
  // New matches filter them; old serialized match inputs must still replay.
  const stale = clone(matchday);
  stale.riskPlayIds = [keeper.id, 'missing-player'];
  await mount(stale);
  const home = clubById(fixture.homeId), away = clubById(fixture.awayId);
  const side = fixture.homeId === career.clubId ? 'home' : 'away';
  const inputFor = (seed: number) => buildEngineInput({ homeClub: home, awayClub: away,
    homeSquad: g.squads[home.id], awaySquad: g.squads[away.id], homeTactic: side === 'home' ? g.tactics[0] : aiDefaultTactic(home, away), awayTactic: side === 'away' ? g.tactics[0] : undefined,
    seed, settings: g.career.settings, userSide: side, challengeClubId: career.clubId, riskIds: stale.riskPlayIds });
  const freshInput = inputFor(45500);
  const freshSession = new MatchSession(freshInput);
  const historicalSession = new MatchSession({ ...freshInput, riskIds: [keeper.id] });
  const freshKeeper = freshSession.getSlots(side).find((slot) => slot.player.id === keeper.id);
  const oldKeeper = historicalSession.getSlots(side).find((slot) => slot.player.id === keeper.id);
  check('Eski kayıttaki sağlıklı oyuncu onayı yeni maç kondisyonunu düşürmez', !g.riskPlayIds?.includes(keeper.id) && !freshInput.riskIds?.includes(keeper.id) && !!freshKeeper && !!oldKeeper && freshKeeper.liveFitness > oldKeeper.liveFitness && oldKeeper.liveFitness === 50);
  for (let i = 0; i < 10; i++) historicalSession.step();
  const view: LiveMatchViewState = { events: matchEventsToDemo(historicalSession.getEvents()), speed: 'x2', paused: true, activeTab: 'pitch', pitchView: 'pitch', heatEnabled: false, heatTeam: 'all', heatSamples: [], showTouchline: false, showTeamTalk: false, teamTalkPromptShown: false, crowdShoutUsed: false, decision: null, lastDecisionShown: '', showSubPicker: false, showTacticPicker: false, coachFired: [], phase: 'live', interviewChoice: null, managerSuspendedAtStart: false, managerCards: 0 };
  const oldCheckpoint = makeLiveCheckpoint(historicalSession, fixture, g.seasonNo, 0, view);
  const replayed = restoreLiveCheckpoint(oldCheckpoint, g.seasonNo, career.clubId, fixture.day);
  check('Eski canlı maçın ham iğne girdisi değiştirilmeden deterministik tekrar açılır', replayed.getSimulationInput().riskIds?.includes(keeper.id) && replayed.getStepCount() === historicalSession.getStepCount());

  // Search real deterministic matches for each rarer health/card event. Each
  // result is tested independently against its own starting snapshot.
  const own = new Set(g.mySquad.map((p) => p.id));
  let injuryEvidence: ReturnType<MatchSession['toResult']> | undefined;
  let banEvidence: ReturnType<MatchSession['toResult']> | undefined;
  for (let seed = 45500; seed < 48500 && (!injuryEvidence || !banEvidence); seed++) {
    const result = new MatchSession(inputFor(seed)).finishNow();
    if (!injuryEvidence && result.injuries.some((row) => own.has(row.playerId))) injuryEvidence = result;
    if (!banEvidence && result.suspensions.some((row) => own.has(row.playerId))) banEvidence = result;
  }
  if (!injuryEvidence || !banEvidence) throw new Error('Gerçek sakatlık veya kırmızı kart senaryosu bulunamadı');
  const injuryReport = { ...matchEngineToDemo(injuryEvidence), homeId: fixture.homeId, awayId: fixture.awayId };
  const injuries = injuryEvidence.injuries.filter((row) => own.has(row.playerId));
  check('Hızlı maç adaptörü motorun gerçek sakatlıklarını taşır', JSON.stringify(injuryReport.injuries) === JSON.stringify(injuryEvidence.injuries), `seed=${injuryEvidence.seed}, sakat=${injuries.length}`);
  await act(async () => { g.playLeagueMatch({ ...fixture }, injuryReport); g.applyRiskOutcome(Object.entries(injuryReport.playerRows).filter(([, row]) => row.min > 0).map(([id]) => id)); });
  check('Gerçek maç sakatlığı süreyi kaydeder; bilinmeyen tanı uydurulmaz', injuries.every((row) => (g.playerOf(row.playerId)?.injuredDays ?? 0) >= row.days && g.playerOf(row.playerId)?.injury?.type === 'bilinmeyen' && !g.playerOf(row.playerId)?.injury?.canPlayWithRisk));
  check('Maç sakatlığı gelen kutusunda görünür', g.inbox.some((message) => message.title === 'Maç sonrası sağlık ve ceza raporu' && injuries.every((row) => message.body.includes(g.playerOf(row.playerId)!.name))));
  const opposingInjury = injuryEvidence.injuries.find((row) => !own.has(row.playerId));
  check('Rakibin sonuç odaklı AI takvimine çözülemeyen sakatlık yazılmaz', !opposingInjury || !g.playerPatch[opposingInjury.playerId]);
  await act(async () => { await g.saveNow(); });
  let evidenceSave = await readSave(career.slot);
  await mount(evidenceSave!.blob);
  check('Gerçek maç sakatlığı kayıt/yeniden açma sonrasında korunur', injuries.every((row) => (g.playerOf(row.playerId)?.injuredDays ?? 0) >= row.days));

  await mount(stale);
  const banReport = { ...matchEngineToDemo(banEvidence), homeId: fixture.homeId, awayId: fixture.awayId };
  const suspensions = banEvidence.suspensions.filter((row) => own.has(row.playerId));
  check('Hızlı maç adaptörü motorun gerçek kırmızı kart cezalarını taşır', JSON.stringify(banReport.suspensions) === JSON.stringify(banEvidence.suspensions), `seed=${banEvidence.seed}, ceza=${suspensions.length}`);
  await act(async () => { g.playLeagueMatch({ ...fixture }, banReport); });
  check('Gerçek kırmızı kart cezası sonraki maçlar için eksilmeden kaydedilir', suspensions.every((row) => g.playerOf(row.playerId)?.suspendedMatches === row.matches));
  check('Maç cezası gelen kutusunda görünür', g.inbox.some((message) => message.title === 'Maç sonrası sağlık ve ceza raporu' && suspensions.every((row) => message.body.includes(g.playerOf(row.playerId)!.name))));
  await act(async () => { await g.saveNow(); });
  evidenceSave = await readSave(career.slot);
  await mount(evidenceSave!.blob);
  check('Gerçek kırmızı kart cezası kayıt/yeniden açma sonrasında korunur', suspensions.every((row) => g.playerOf(row.playerId)?.suspendedMatches === row.matches));
  const directBan = suspensions.find((row) => row.matches === 3);
  if (directBan) {
    let correct = true;
    for (const remaining of [2, 1, 0]) {
      const nextFixture = g.nextFixture;
      if (!nextFixture) { correct = false; break; }
      while (g.career.day < nextFixture.day) {
        const previous = g.playerOf(directBan.playerId)?.suspendedMatches;
        await act(async () => { advanced = g.advanceDay(); });
        if (advanced!.blocked || g.playerOf(directBan.playerId)?.suspendedMatches !== previous) { correct = false; break; }
      }
      if (!correct) break;
      let served: DemoMatchResult;
      await act(async () => { served = g.playLeagueMatch({ ...nextFixture }); });
      if ((served!.playerRows[directBan.playerId]?.min ?? 0) > 0 || g.playerOf(directBan.playerId)?.suspendedMatches !== remaining) correct = false;
    }
    check('Üç maçlık kırmızı kart cezası maçsız günlerde sabit kalır ve sonraki üç maçta çekilir', correct);
  } else check('Üç maçlık kırmızı kart cezası gerçek motorda bulunur', false);


} catch (error) { failed++; console.error('❌', error); }
finally { await act(async () => root.unmount()); dom.window.close(); }
console.log(`\nCAREER-CONTINUITY: ${passed}/${passed + failed}`);
if (failed) process.exitCode = 1;
