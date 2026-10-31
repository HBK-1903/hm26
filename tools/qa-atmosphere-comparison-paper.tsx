// Real provider/jsdom + pure evidence and match parity tests for the three read-only features.
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
(globalThis as any).matchMedia = dom.window.matchMedia;

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { GameProvider, useGame, type DemoMatchEvent } from '../src/store/game';
import { readSave, SAVE_VERSION, type SaveBlob } from '../src/store/persist';
import { SquadScreen } from '../src/screens/Squad';
import { MarketScreen } from '../src/screens/Market';
import { NewsroomScreen } from '../src/screens/Newsroom';
import { LiveAtmosphere } from '../src/components/match/LiveAtmosphere';
import { comparisonCandidates, comparisonClubName, comparisonPositionDetails, comparisonPositionSearchText, comparisonSearchKey, comparisonValues, currentMarketFreeAgents, marketRefreshDays } from '../src/data/playerComparison';
import { buildWeeklyIssue } from '../src/data/weeklyPaper';
import { liveReactionForEvent, reactionFromBatch, recentLiveReactions } from '../src/engine/liveReaction';
import { MatchSession } from '../src/engine/session';
import { buildEngineInput, matchEventsToDemo } from '../src/engine/adapter';
import { clubById } from '../src/data/clubs';
import type { Career, DemoFixture, MatchArchiveEntry, TransferLogEntry } from '../src/types';

const career = {
  slot: 3, manager: { name: 'Test Menajer', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 0 },
  clubId: 'denizli_yesilova', seed: 12345, day: 1, week: 1,
  settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true },
  pending: { marketShortlist: [], activeProject: null },
} as Career;
let g: ReturnType<typeof useGame>;
let atmosphereProps: React.ComponentProps<typeof LiveAtmosphere>;
type Mode = 'none' | 'squad' | 'market' | 'newsroom' | 'atmosphere';
const Harness: React.FC<{ mode: Mode }> = ({ mode }) => {
  g = useGame();
  if (mode === 'squad') return <SquadScreen goXI={() => {}} />;
  if (mode === 'market') return <MarketScreen />;
  if (mode === 'newsroom') return <NewsroomScreen initialTab="weekly" />;
  if (mode === 'atmosphere') return <LiveAtmosphere {...atmosphereProps} />;
  return null;
};
const root = createRoot(dom.window.document.getElementById('root')!);
let key = 0, passed = 0;
const failures: string[] = [];
const check = (name: string, ok: unknown, detail = '') => { if (ok) passed++; else failures.push(name); console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
const q = <T extends HTMLElement = HTMLElement>(selector: string) => dom.window.document.querySelector<T>(selector);
const all = <T extends HTMLElement = HTMLElement>(selector: string) => Array.from(dom.window.document.querySelectorAll<T>(selector));
const body = () => dom.window.document.body.textContent ?? '';
const buttonText = (text: string) => all<HTMLButtonElement>('button').find((b) => (b.textContent ?? '').trim() === text) ?? null;
const click = async (button: HTMLButtonElement | null, label: string) => { if (!button || button.disabled) throw new Error(`Tıklanamadı: ${label}`); await act(async () => button.click()); };
const mount = async (mode: Mode, snapshot?: SaveBlob) => { key++; await act(async () => root.render(<GameProvider key={key} career={career} snapshot={snapshot}><Harness mode={mode} /></GameProvider>)); };
const change = async (element: HTMLInputElement, value: string) => { await act(async () => { element.value = value; Simulate.change(element); }); };

await mount('none');
await act(async () => { await g.saveNow(); });
const baseline = (await readSave(career.slot))?.blob as SaveBlob & Record<string, any>;
if (!baseline) throw new Error('Başlangıç kaydı yok');
const own = g.mySquad[0], opponentId = 'sakarya_vadi', opponent = g.squads[opponentId][0];

// Side interpretation is different for open-play and set-piece saves in the engine.
const event = (kind: DemoMatchEvent['kind'], side: DemoMatchEvent['side'], extra: Partial<DemoMatchEvent> = {}): DemoMatchEvent => ({ minute: 25, kind, side, text: 'Gerçek maç olayı', ...extra });
const goalHome = event('goal', 'home'), goalAway = event('goal', 'away');
check('Ev sahibi menajer kendi golünde sevinir, rakip golünde üzülür', liveReactionForEvent(goalHome, 'home', career.clubId, opponentId)?.mood === 'celebrate' && liveReactionForEvent(goalAway, 'home', career.clubId, opponentId)?.mood === 'concern');
check('Deplasman menajeri için gol tarafları tersine doğru çevrilir', liveReactionForEvent(goalAway, 'away', opponentId, career.clubId)?.mood === 'celebrate' && liveReactionForEvent(goalHome, 'away', opponentId, career.clubId)?.mood === 'concern');
const openSave = event('save', 'home', { anim: { eventType: 'shot', attackingTeamId: opponentId, outcome: 'save' } });
const setPieceSave = event('save', 'away', { playerId: own.id });
check('Açık oyun kurtarışında hücum tarafı değil kaleci tarafı kullanılır', liveReactionForEvent(openSave, 'away', opponentId, career.clubId)?.eventSide === 'away' && liveReactionForEvent(openSave, 'away', opponentId, career.clubId)?.mood === 'celebrate');
check('Duran top kurtarışında kayıtlı kaleci tarafı kullanılır', liveReactionForEvent(setPieceSave, 'away', opponentId, career.clubId)?.eventSide === 'away' && liveReactionForEvent(setPieceSave, 'away', opponentId, career.clubId)?.mood === 'celebrate');
check('Tarafı belirsiz kurtarışta sevinç veya takım uydurulmaz', liveReactionForEvent(event('save', 'home'), 'home', career.clubId, opponentId)?.mood === 'neutral' && liveReactionForEvent(event('save', 'home'), 'home', career.clubId, opponentId)?.eventSide === null);
check('Kart her iki takımda da gerçek taraf ve temkinli tepki taşır', liveReactionForEvent(event('card', 'away', { text: 'Direkt kırmızı kart' }), 'away', opponentId, career.clubId)?.title === 'KIRMIZI KART · TAKIMIMIZ' && liveReactionForEvent(event('card', 'home'), 'away', opponentId, career.clubId)?.mood === 'tense');
check('VAR, şans, antrenör notu ve iptal edilmiş gol kutlama üretmez', ['var', 'chance', 'coach', 'info'].every((kind) => !liveReactionForEvent(event(kind as DemoMatchEvent['kind'], 'home'), 'home', career.clubId, opponentId)) && !liveReactionForEvent(event('goal', 'home', { text: 'Gol iptal edildi.' }), 'home', career.clubId, opponentId));
check('Aynı olay partisinin son satırı bilgi olsa da gerçek kurtarış bulunur', reactionFromBatch([openSave, event('info', 'home')], 'away', opponentId, career.clubId)?.event === openSave);
const overturned = event('goal', 'home', { text: 'GOOOL!', anim: { eventType: 'goal', outcome: 'overturned' } });
check('VAR sonucu ve büyük İ ile yazılmış iptal golü de kutlama üretmez', !liveReactionForEvent(overturned, 'home', career.clubId, opponentId) && !liveReactionForEvent(event('goal', 'home', { text: 'GOL İPTAL' }), 'home', career.clubId, opponentId));
check('Kırmızı kart motor kararı veya Türkçe büyük harflerden doğru anlaşılır', liveReactionForEvent(event('card', 'home', { text: 'Oyundan çıktı', anim: { eventType: 'card', outcome: 'red-direct' } }), 'home', career.clubId, opponentId)?.title.startsWith('KIRMIZI KART') && liveReactionForEvent(event('card', 'away', { text: 'KIRMIZI KART' }), 'home', career.clubId, opponentId)?.title.startsWith('KIRMIZI KART'));
check('Geçersiz taraf ya da bilinmeyen hücum kulübü takım uydurmaz', liveReactionForEvent(event('goal', 'neutral' as any), 'home', career.clubId, opponentId)?.eventSide === null && liveReactionForEvent(event('save', 'home', { playerId: own.id, anim: { eventType: 'shot', attackingTeamId: 'bilinmeyen' } }), 'home', career.clubId, opponentId)?.eventSide === null);
const card = event('card', 'away', { text: 'Sarı kart' });
const reactionHistory = recentLiveReactions([goalHome, event('info', 'home'), openSave, card, overturned], 'home', career.clubId, opponentId);
check('Aynı adımda gelen birden çok gerçek olay son tepkilerde sırasıyla korunur', reactionHistory.length === 3 && reactionHistory[0].event === card && reactionHistory[1].event === openSave && reactionHistory[2].event === goalHome && recentLiveReactions([goalHome], 'home', career.clubId, opponentId, 0).length === 0);

// The reaction adapter reads real MatchSession batches, without consuming RNG or changing any match data.
let parity = true, sourceExact = true, realReactions = 0, openPlaySaves = 0;
for (let seed = 1; seed <= 8; seed++) {
  const mySide = seed % 2 ? 'home' : 'away';
  const home = mySide === 'home' ? clubById(career.clubId) : clubById(opponentId);
  const away = mySide === 'home' ? clubById(opponentId) : clubById(career.clubId);
  const input = buildEngineInput({ homeClub: home, awayClub: away, homeSquad: g.squads[home.id], awaySquad: g.squads[away.id], homeTactic: g.tactics[0], seed, settings: career.settings, userSide: mySide });
  const withScene = new MatchSession(input), withoutScene = new MatchSession(input);
  while (!withScene.done && !withoutScene.done) {
    const fresh = matchEventsToDemo(withScene.step());
    const before = JSON.stringify(fresh);
    const cue = reactionFromBatch(fresh, mySide, home.id, away.id);
    if (cue) { realReactions++; sourceExact &&= fresh.includes(cue.event) && ['goal', 'save', 'card'].includes(cue.event.kind); }
    sourceExact &&= before === JSON.stringify(fresh);
    for (const e of fresh.filter((row) => row.kind === 'save' && row.anim?.attackingTeamId)) {
      openPlaySaves++;
      const savedBy = e.anim?.attackingTeamId === home.id ? 'away' : 'home';
      sourceExact &&= liveReactionForEvent(e, mySide, home.id, away.id)?.eventSide === savedBy;
    }
    withoutScene.step();
  }
  parity &&= withScene.done && withoutScene.done && JSON.stringify(withScene.toResult()) === JSON.stringify(withoutScene.toResult());
}
check('Sekiz gerçek maçta tepkiler yalnız gerçek ve değiştirilmemiş olaylardan seçilir', sourceExact && realReactions > 0 && openPlaySaves > 0, `${realReactions} tepki · ${openPlaySaves} açık oyun kurtarışı`);
check('Ev/deplasman dahil sekiz maçta sahne açık/kapalı skor, olay ve istatistik eşittir', parity);

// Read-only comparison data, canonical ownership and the same market free agents.
const pool = comparisonCandidates({ squads: g.squads, ownClubId: career.clubId, seed: career.seed, cycleNo: 0, league: g.myLeague, initial: own });
const free = currentMarketFreeAgents(career.seed, 0, g.myLeague);
check('Karşılaştırma havuzu gerçek kadro ve güncel serbest oyuncuları kimlik başına bir kez içerir', !!pool.find((p) => p.id === own.id) && !!pool.find((p) => p.id === opponent.id) && free.every((p) => pool.some((item) => item.id === p.id)) && new Set(pool.map((p) => p.id)).size === pool.length);
const duplicate = { ...own, clubId: 'free', wage: 9999 };
check('Eski piyasa snapshotı güncel kadro, kulüp ve maaşı ezmez', comparisonCandidates({ squads: g.squads, ownClubId: career.clubId, seed: career.seed, cycleNo: 0, league: g.myLeague, initial: duplicate, shortlistIds: [own.id], shortlistSnapshots: [duplicate] }).find((p) => p.id === own.id)?.wage === own.wage);
check('Piyasa yenileme aralıkları özgün akışla aynı', marketRefreshDays('sakin') === 30 && marketRefreshDays('dengeli') === 14 && marketRefreshDays('yogun') === 7);
check('Türkçe/ASCII arama ve gerçek serbest statüsü doğru', comparisonSearchKey('ÇAĞRI IŞIK') === 'cagri isik' && comparisonClubName(free[0]) === 'Serbest oyuncu');
const missing = { ...own, ratings: {} as any, potential: undefined, wage: undefined, fitness: undefined } as any;
check('Eski/eksik GEN, POT, maaş ve kondisyon sıfır yerine bilinmiyor', [0, 1, 3, 4].every((index) => comparisonValues(missing)[index] === '—'));
const vals = comparisonValues({ ...own, wage: 150, fitness: 87 });
check('Maaş birimi aylık bin TL ve kondisyon yüzdesi doğru', vals[3] === '₺150 bin/ay' && vals[4] === '%87');
const flexible = { ...own, group: 'WG' as const, side: 'L' as const, secondary: ['AM', 'ST', 'AM'] as ('AM' | 'ST')[] };
const positionDetails = comparisonPositionDetails(flexible);
check('Karşılaştırmada mevcut tercih edilen taraf ve alternatif mevkiler görünür', positionDetails.side === 'Sol' && positionDetails.secondary === 'Ofansif orta saha, Santrfor');
check('Eksik eski mevki bilgileri tahmin edilmez, gerçekten boş alternatif Yok gösterilir', comparisonPositionDetails({ ...own, side: undefined, secondary: undefined } as any).side === '—' && comparisonPositionDetails({ ...own, side: undefined, secondary: undefined } as any).secondary === '—' && comparisonPositionDetails({ ...own, secondary: [] }).secondary === 'Yok');
check('Türkçe mevki, alternatif mevki ve taraf araması gerçek kayıtları kullanır', ['Kanat', 'Ofansif orta saha', 'Santrfor', 'Sol'].every((word) => comparisonSearchKey(comparisonPositionSearchText(flexible)).includes(comparisonSearchKey(word))));

const fixture = (day: number, homeId = career.clubId, awayId = opponentId, hg?: number, ag?: number, played = true): DemoFixture => ({ day, homeId, awayId, hg, ag, played, round: 1, comp: 'lig', league: 'gecit' });
const report = (f: DemoFixture, day: number, seasonNo: number): MatchArchiveEntry => ({
  id: `report-${f.comp}-${f.day}-${f.homeId}-${f.awayId}`, day, seasonNo, comp: f.comp, homeId: f.homeId, awayId: f.awayId,
  hg: 3, ag: 1, xgHome: 1, xgAway: 1, foulsHome: 0, foulsAway: 0, yellowsHome: 0, yellowsAway: 0,
  redsHome: 0, redsAway: 0, playerRows: {}, playerClubIds: {},
});
const transfer = (id: string, day: number, seasonNo: number, name = id): TransferLogEntry => ({ id, day, seasonNo, playerName: name, age: 22, group: 'CM', fromClubId: opponentId, toClubId: career.clubId, fee: 1.25, kind: 'in' });
const delayed = fixture(3, career.clubId, opponentId, 0, 0);
const valid = fixture(8, 'aydin_efe', 'mugla_gokova', 0, 0);
const archived = report(delayed, 5, 2);
const week = buildWeeklyIssue({ day: 10, seasonNo: 2, myClubId: career.clubId, fixtures: [delayed, { ...delayed }, valid, { ...valid }, fixture(10, career.clubId, 'mugla_gokova', undefined, undefined), fixture(11, career.clubId, 'mugla_gokova', 5, 0), fixture(9, career.clubId, 'mugla_gokova', 2, 1, false)],
  reports: [archived, report(fixture(8, career.clubId, 'aydin_efe', 1, 0), 8, 1)], transfers: [transfer('this-week', 4, 2), transfer('this-week', 4, 2), transfer('before', 3, 2), transfer('future', 11, 2), transfer('previous-season', 8, 1)] });
check('Gazete gün 4–10 aralığına tam yedi günü alır', week.fromDay === 4 && week.toDay === 10);
check('Oynanmamış, skorsuz ve gelecek maçlar dışarıda; sıfır sıfır korunur', week.matches.length === 2 && week.matches.some((m) => m.hg === 0 && m.ag === 0) && week.matches.every((m) => m.day <= 10));
check('Tekrarlanan fikstür ve transfer tek kayıt sayılır', week.matches.filter((m) => m.homeId === career.clubId).length === 1 && week.transfers.length === 1);
check('Gerçek arşivin oynanma günü/skoru ertelenmiş fikstürün önüne geçer', week.matches.some((m) => m.day === 5 && m.hg === 3 && m.ag === 1));
const duplicateReports = buildWeeklyIssue({ day: 10, seasonNo: 2, myClubId: career.clubId, fixtures: [delayed, { ...delayed }], reports: [archived, { ...archived }, { ...archived, id: 'eski-kopya' }] });
check('Ertelenmiş maçın mükerrer arşivleri de tek skor sayılır', duplicateReports.matches.length === 1 && duplicateReports.form.length === 1);
const futureReport = buildWeeklyIssue({ day: 10, seasonNo: 2, myClubId: career.clubId, fixtures: [delayed], reports: [report(delayed, 11, 2)] });
check('Oynanma günü gelecekteki arşiv varsa fikstür geçmiş sonuç diye sunulmaz', futureReport.matches.length === 0 && futureReport.form.length === 0);
check('Önceki sezonun aynı gün numaralı transfer/maçları yeni haftaya karışmaz', week.transfers.every((t) => t.seasonNo === 2) && !week.matches.some((m) => m.awayId === 'aydin_efe'));
check('Takım formu mevcut sezonun gerçek kendi skorlarından çıkar', week.form.length === 1 && week.form[0].result === 'G' && week.form[0].day === 5);
const noFixture = buildWeeklyIssue({ day: 6, seasonNo: 2, myClubId: career.clubId, fixtures: [], reports: [archived] });
check('Eksik fikstürde mevcut maç arşivi gerçek skor kaynağı olabilir', noFixture.matches.length === 1 && noFixture.matches[0].hg === 3);
const boundary = buildWeeklyIssue({ day: 2, seasonNo: 2, myClubId: career.clubId, fixtures: [fixture(1, career.clubId, opponentId, 1, 2)], reports: [report(fixture(1), 1, 1)], transfers: [transfer('eski', 1, 1), transfer('yeni', 1, 2)] });
check('Sezon başlangıcında bitiş günü bilinmeyen önceki sezon haftaya eklenmez', boundary.crossesUnknownSeasonBoundary && boundary.fromDay === 1 && boundary.matches.length === 1 && boundary.transfers.length === 1 && boundary.transfers[0].id === 'yeni');
const empty = buildWeeklyIssue({ day: 1, seasonNo: 1, myClubId: career.clubId, fixtures: [], reports: [], transfers: [] });
check('Boş hafta sahte sonuç, transfer veya form üretmez', empty.lead.kind === 'empty' && !empty.matches.length && !empty.transfers.length && !empty.form.length);
const transferOnly = buildWeeklyIssue({ day: 9, seasonNo: 1, myClubId: career.clubId, fixtures: [], transfers: [transfer('alone', 8, 1)] });
check('Maçsız ama transferli haftada manşet gerçek transferdir', transferOnly.lead.kind === 'transfer' && transferOnly.lead.transfer.id === 'alone');

// UI selection, prefilling, duplicate blocking and no career writes.
await mount('squad', baseline);
await click(buttonText('Karşılaştır'), 'Kadro karşılaştırma');
check('Kadrodan erişilebilir karşılaştırma penceresi açılır', !!q('[role="dialog"][aria-modal="true"]') && !!q('[data-testid="comparison-desk"]') && !!q('[aria-label="1. oyuncu ara"]'));
const firstCandidate = q<HTMLButtonElement>('[data-testid="comparison-candidate"]')!;
const chosenId = firstCandidate.dataset.playerId;
await click(firstCandidate, 'Birinci oyuncu');
check('İlk oyuncu seçilince ikinci seçim açılır ve aynı oyuncu tekrar seçilemez', q('[data-testid="comparison-player-1"]')?.getAttribute('data-player-id') === chosenId && !!q('[aria-label="2. oyuncu ara"]') && !!q<HTMLButtonElement>(`[data-testid="comparison-candidate"][data-player-id="${chosenId}"]`)?.disabled);
await change(q<HTMLInputElement>('[aria-label="2. oyuncu ara"]')!, 'Sakarya Vadi');
await click(q<HTMLButtonElement>('[data-testid="comparison-candidate"]'), 'İkinci oyuncu');
check('İki gerçek oyuncu ve yedi ölçüt yan yana görünür', all('[data-testid="comparison-table"] tbody tr').length === 7 && body().includes('Sakarya Vadi SK') && q('[data-testid="comparison-player-2"]')?.getAttribute('data-player-id') !== chosenId);
check('Maaş ve doğal mevki karşılaştırma tablosunda gösterilir', body().includes('bin/ay') && body().includes('Doğal mevki') && body().includes('Kondisyon'));
check('Her iki oyuncunun kayıtlı tarafı ve alternatif mevkileri tabloda gösterilir', [1, 2].every((index) => { const text = q(`[data-testid="comparison-position-${index}"]`)?.textContent ?? ''; return text.includes('Taraf:') && text.includes('Diğer:'); }));
await click(q<HTMLButtonElement>('[role="dialog"] [aria-label="Kapat"]'), 'Karşılaştırmayı kapat');
await act(async () => { await g.saveNow(); });
const afterComparison = (await readSave(career.slot))?.blob as SaveBlob & Record<string, any>;
check('Karşılaştırma yeni kayıt alanı eklemez; bütçe ve oyuncu yamaları değişmez', SAVE_VERSION === 5 && afterComparison.version === SAVE_VERSION && JSON.stringify(afterComparison.playerPatch) === JSON.stringify(baseline.playerPatch) && JSON.stringify(afterComparison.budget) === JSON.stringify(baseline.budget) && !Object.keys(afterComparison).some((key) => /comparison|weeklyPaper|atmosphere/i.test(key)));
await mount('market', baseline);
const marketRow = q<HTMLElement>('[data-testid="market-player"]')!;
const marketId = marketRow.dataset.playerId;
await click(marketRow.querySelector<HTMLButtonElement>('button[aria-label$=" karşılaştır"]'), 'Piyasa oyuncusunu karşılaştır');
check('Piyasadaki oyuncu karşılaştırmanın ilk tarafına taşınır', q('[data-testid="comparison-player-1"]')?.getAttribute('data-player-id') === marketId && !!q('[aria-label="2. oyuncu ara"]'));

const newsSave = structuredClone(baseline) as SaveBlob & Record<string, any>;
newsSave.seasonNo = 2; newsSave.career.day = 2; newsSave.fixtures = [fixture(1, career.clubId, opponentId, 1, 2)];
newsSave.friendlies = []; newsSave.cup.fixtures = []; newsSave.cup.rounds = []; newsSave.international.cups = [];
newsSave.matchReports = [report(fixture(1, career.clubId, opponentId), 1, 1)];
newsSave.transferLog = [transfer('eski', 1, 1, 'Eski Sezon Oyuncusu'), transfer('yeni', 1, 2, 'Yeni Sezon Oyuncusu')];
await mount('newsroom', newsSave);
check('Gazete gerçek skor, form ve yalnız bu sezon transferini gösterir', !!q('[data-testid="weekly-paper"]') && body().includes('1–2') && body().includes('Yeni Sezon Oyuncusu') && !body().includes('Eski Sezon Oyuncusu'));
check('Bilinmeyen sezon sınırı gazetenin üzerinde dürüstçe açıklanır', !!q('[data-testid="weekly-boundary-note"]') && body().includes('bitiş günü kaydedilmediğinden'));
check('Basın Odasının eski beş bölümü korunur ve Gazete ayrıca açılır', ['Manşet', 'Gazete', 'Lig Nabzı', 'Haftanın 11’i', 'Hakemler', 'Taraftar'].every((label) => !!buttonText(label)));

atmosphereProps = { club: clubById(career.clubId), manager: career.manager, bench: g.mySquad.slice(1, 4), managerSuspended: false,
  reaction: liveReactionForEvent(goalHome, 'home', career.clubId, opponentId), recentReactions: reactionHistory, reactionSequence: 1, paused: false, done: false, reducedMotion: false };
await mount('atmosphere', baseline);
check('Sahne gerçek menajer ve mevcut yedek oyuncuları içerir', !!q('[aria-label="MENAJER: Test Menajer"]') && all('[aria-label^="YEDEK:"]').length === 3 && q('[data-testid="live-atmosphere"]')?.getAttribute('data-reaction') === 'goal');
check('Sahnedeki yedeklerin gerçek adları gözle okunabilir', atmosphereProps.bench.every((p) => q('[aria-label="Sahnede görünen yedekler"]')?.textContent?.includes(p.name)));
check('Son tepkiler çoklu gerçek olayları yeniden incelemeye sunar', all('[data-testid="live-reaction-history"] li').length === 3 && q('[data-testid="live-reaction-history"]')?.textContent?.includes(card.text) && q('[data-testid="live-reaction-history"]')?.textContent?.includes(openSave.text));
atmosphereProps = { ...atmosphereProps, managerSuspended: true, paused: true };
await mount('atmosphere', baseline);
check('Cezalı menajer tribünde, duraklatılmış sahne donmuş olarak etiketlenir', !!q('[aria-label="MENAJER · TRİBÜNDE: Test Menajer"]') && q('[data-testid="live-atmosphere"]')?.getAttribute('data-motion') === 'paused');
atmosphereProps = { ...atmosphereProps, reducedMotion: true, paused: false };
await mount('atmosphere', baseline);
check('Azaltılmış hareket ve metinli gerçek olay sahnede gösterilir', q('[data-testid="live-atmosphere"]')?.getAttribute('data-motion') === 'reduced' && body().includes('Gerçek maç olayı'));
const subSession = new MatchSession(buildEngineInput({ homeClub: clubById(career.clubId), awayClub: clubById(opponentId), homeSquad: g.squads[career.clubId], awaySquad: g.squads[opponentId], homeTactic: g.tactics[0], seed: 1406, settings: career.settings, userSide: 'home' }));
const incoming = subSession.getBench('home')[0], outgoing = subSession.getSlots('home')[0];
const queued = !!incoming && !!outgoing && subSession.queueSub('home', outgoing.player.id, incoming.id);
const subEvents = subSession.step();
atmosphereProps = { ...atmosphereProps, bench: subSession.getBench('home') };
await mount('atmosphere', baseline);
check('Gerçek değişiklik uygulanınca sahnedeki yedek listesi motorla güncellenir', queued && subEvents.some((e) => e.kind === 'sub') && !atmosphereProps.bench.some((p) => p.id === incoming.id) && !q('[aria-label="Sahnede görünen yedekler"]')?.textContent?.includes(incoming.name) && atmosphereProps.bench.slice(0, 3).every((p) => q('[aria-label="Sahnede görünen yedekler"]')?.textContent?.includes(p.name)));
atmosphereProps = { ...atmosphereProps, bench: [] };
await mount('atmosphere', baseline);
check('Yedek olmadığında isim uydurulmaz ve boş durum görünür', body().includes('Kayıtlı yedek yok') && !q('[aria-label="Sahnede görünen yedekler"]'));

await act(async () => root.unmount());
console.log(`\n${passed}/${passed + failures.length} geçti`);
if (failures.length) { console.error('Başarısız:', failures.join(', ')); process.exitCode = 1; }
