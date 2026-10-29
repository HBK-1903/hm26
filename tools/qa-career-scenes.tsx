// Gerçek store + jsdom: geliş, ödül, antrenman ve salt okunur kariyer hikâyesi.
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
const played: { src: string; volume: number }[] = [];
let pauses = 0;
class AudioMock {
  src: string; volume = 1; onplaying: (() => void) | null = null; onwaiting = null; onpause = null; onended = null; onerror = null;
  constructor(src: string) { this.src = src; }
  play() { played.push({ src: this.src, volume: this.volume }); queueMicrotask(() => this.onplaying?.()); return Promise.resolve(); }
  pause() { pauses++; }
}
(dom.window as any).Audio = AudioMock;

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { GameProvider, useGame, type DemoMatchResult } from '../src/store/game';
import { readSave, SAVE_VERSION, type SaveBlob } from '../src/store/persist';
import { Hub } from '../src/screens/Hub';
import { MatchPrep } from '../src/screens/MatchPrep';
import { MatchReport } from '../src/screens/MatchReport';
import { PlaceholderScreen } from '../src/screens/Placeholder';
import { TrainingGround } from '../src/components/TrainingGround';
import { buildCareerTimeline } from '../src/data/careerTimeline';
import { selectMatchAward, MATCH_AWARD_LINES } from '../src/data/matchAward';
import { audio } from '../src/audio/engine';
import { clubById } from '../src/data/clubs';
import { MatchSession } from '../src/engine/session';
import { buildEngineInput, matchEngineToDemo } from '../src/engine/adapter';
import type { Career, DemoFixture, MatchArchiveEntry, TransferLogEntry } from '../src/types';

const career = { slot: 3, manager: { name: 'Sahne Testi', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 0 }, clubId: 'denizli_yesilova', seed: 12345, day: 1, week: 1, settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: true, matchSpeed: 'normal', suggestions: true }, pending: { marketShortlist: [], activeProject: null } } as Career;
let g: ReturnType<typeof useGame>, result: DemoMatchResult, fixture: DemoFixture;
let navigated = '', done = 0, sessionActive = false;
const setSessionActive = (active: boolean) => { sessionActive = active; };
let groundProps: React.ComponentProps<typeof TrainingGround>;
type Mode = 'none' | 'hub' | 'prep' | 'report' | 'profile' | 'ground';
const Harness: React.FC<{ mode: Mode }> = ({ mode }) => {
  g = useGame();
  if (mode === 'hub') return <Hub go={(s) => { navigated = s; }} />;
  if (mode === 'prep') return <MatchPrep go={(s) => { navigated = s; }} onMatchSessionChange={setSessionActive} />;
  if (mode === 'report') return <MatchReport result={result} fixture={fixture} onDone={() => { done++; }} />;
  if (mode === 'profile') return <PlaceholderScreen id="careerProfile" />;
  if (mode === 'ground') return <TrainingGround {...groundProps} />;
  return null;
};
const root = createRoot(dom.window.document.getElementById('root')!);
let key = 0, passed = 0;
const failures: string[] = [];
const check = (name: string, ok: unknown, detail = '') => { if (ok) passed++; else failures.push(name); console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
const q = <T extends Element = HTMLElement>(selector: string) => dom.window.document.querySelector<T>(selector);
const all = <T extends Element = HTMLElement>(selector: string) => Array.from(dom.window.document.querySelectorAll<T>(selector));
const body = () => dom.window.document.body.textContent ?? '';
const byId = (id: string) => q<HTMLButtonElement>(`[data-testid="${id}"]`);
const btn = (text: string) => all<HTMLButtonElement>('button').find((element) => element.textContent?.trim() === text) ?? null;
const click = async (element: HTMLButtonElement | null, name: string) => { if (!element || element.disabled) throw new Error(`Tıklanamadı: ${name}`); await act(async () => element.click()); };
const mount = async (mode: Mode, snapshot?: SaveBlob) => { key++; await act(async () => root.render(<GameProvider key={key} career={career} snapshot={snapshot}><Harness mode={mode} /></GameProvider>)); };

await mount('none');
await act(async () => { await g.saveNow(); });
const baseline = (await readSave(career.slot))?.blob as SaveBlob & Record<string, any>;
const own = g.mySquad[0], injuredPlayer = g.mySquad[1];
const makeReport = (id: string, seasonNo: number, day: number, hg: number, ag: number, comp = 'lig') => ({ id, seasonNo, day, comp, homeId: career.clubId, awayId: 'sakarya_vadi', hg, ag, xgHome: 1, xgAway: 1, foulsHome: 0, foulsAway: 0, yellowsHome: 0, yellowsAway: 0, redsHome: 0, redsAway: 0, playerRows: {}, playerClubIds: {} } as MatchArchiveEntry);
const transfer = (id: string, seasonNo: number, day: number, playerName: string) => ({ id, seasonNo, day, playerName, age: 22, group: 'MF', fromClubId: 'sakarya_vadi', toClubId: career.clubId, fee: 2, kind: 'in' } as TransferLogEntry);
const reports = [makeReport('s1', 1, 200, 4, 1), makeReport('s2', 2, 2, 0, 0, 'kupa-ko'), makeReport('s2', 2, 2, 0, 0, 'kupa-ko'), makeReport('future', 2, 9, 9, 0), makeReport('future-season', 3, 1, 5, 0), makeReport('cup', 2, 6, 1, 0, 'kupa-ko')];
const transfers = [transfer('one', 2, 4, 'Gerçek Transfer'), transfer('one', 2, 4, 'Gerçek Transfer'), transfer('future', 2, 12, 'Gelecek Transfer'), transfer('old', 1, 9, 'Eski Transfer')];
const trophies = [{ season: '2026–27', type: 'lig', title: 'Gerçek Lig Kupası' }, { season: '2026–27', type: 'lig', title: 'Gerçek Lig Kupası' }, { season: 'eski kayıt', type: 'kupa', title: 'Tarihsiz Kupa' }] as NonNullable<Career['trophyCabinet']>;
const source = JSON.stringify({ reports, transfers, trophies });
const timeline = buildCareerTimeline({ seasonNo: 2, day: 8, reports, transfers, trophies });
check('Hikâye kayıtları değiştirmeden sezonları büyükten küçüğe gruplar', JSON.stringify({ reports, transfers, trophies }) === source && timeline.chapters.map((c) => c.seasonNo).join(',') === '2,1');
check('Gelecek sezon/gün, mükerrer skor, transfer ve kupa görünmez', timeline.total === 7 && !JSON.stringify(timeline).includes('Gelecek Transfer') && !JSON.stringify(timeline).includes('future-season'));
check('Aynı sezonun bilinen günleri doğru sıradadır ve 0–0 kaybolmaz', timeline.chapters[0].dated.map((x) => x.day).join(',') === '6,4,2' && JSON.stringify(timeline).includes('"hg":0'));
check('Kupa kazanma günü uydurulmaz ve ayrı gruptadır', timeline.chapters[1].undated[0]?.kind === 'trophy' && timeline.chapters[1].undated[0]?.day === null);
check('Sezonu okunamayan kupa diğer sezonlarla sıralanmaz', timeline.unplaced[0]?.kind === 'trophy' && timeline.unplaced[0]?.trophy.title === 'Tarihsiz Kupa');
const oldMissing = makeReport('unknown', 0, 4, 1, 1);
const unknown = buildCareerTimeline({ seasonNo: 2, day: 8, reports: [oldMissing] });
check('Eski kayıtta sezon yoksa gün numarası tahmin edilmeden ayrı tutulur', unknown.unplaced.length === 1 && unknown.unplaced[0].day === 4 && unknown.chapters.length === 0);
check('Boş kariyer sahte olay üretmez', buildCareerTimeline({ seasonNo: 1, day: 1 }).total === 0);
check('Uzun yıl biçimli kupa sezonu doğrulanır, hatalı yıl ayrı kalır', buildCareerTimeline({ seasonNo: 2, day: 8, trophies: [{ season: '2026-2027', title: 'Kupa', type: 'kupa' }, { season: '2026–29', title: 'Eski', type: 'kupa' }] }).chapters[0]?.seasonNo === 1 && buildCareerTimeline({ seasonNo: 2, day: 8, trophies: [{ season: '2026–29', title: 'Eski', type: 'kupa' }] }).unplaced.length === 1);

const sceneSave = structuredClone(baseline) as SaveBlob & Record<string, any>;
sceneSave.seasonNo = 2; sceneSave.career.day = 8; sceneSave.career.settings.reduceMotion = true;
sceneSave.matchReports = reports; sceneSave.transferLog = transfers; sceneSave.career.trophyCabinet = trophies;
sceneSave.playerPatch[injuredPlayer.id] = { ...(sceneSave.playerPatch[injuredPlayer.id] ?? {}), injuredDays: 5 };
await mount('profile', sceneSave);
check('Kariyer profili gerçek skor, oyuncu ve kupadan hikâye kurar', !!q('[data-testid="career-timeline"]') && body().includes('Gerçek Transfer') && body().includes('Gerçek Lig Kupası') && body().includes('4–1') && !body().includes('Gelecek Transfer'));
check('Kupa için günün bilinmediği açıkça yazılır', body().includes('diğer olaylarla kesin sırası bilinmiyor') && body().includes('Sezonu bilinmeyen kayıtlar'));
await click(btn('Kupalar'), 'Kupa filtresi');
check('Kupa filtresi yalnız kupaları gösterir', all('[data-testid="career-moment"]').every((node) => node.getAttribute('data-moment-kind') === 'trophy') && all('[data-testid="career-moment"]').length === 2);
await click(btn('Transferler'), 'Transfer filtresi');
check('Transfer filtresi gerçek yön ve bedeli gösterir', body().includes('Gerçek Transfer') && body().includes('₺2,00M') && !body().includes('Gerçek Lig Kupası'));
await act(async () => { await g.saveNow(); });
let saved = (await readSave(career.slot))?.blob as SaveBlob & Record<string, any>;
check('Hikâye gezintisi şema, maç, transfer ve kupa kayıtlarını değiştirmez', SAVE_VERSION === 4 && saved.version === 4 && JSON.stringify(saved.matchReports) === JSON.stringify(sceneSave.matchReports) && JSON.stringify(saved.transferLog) === JSON.stringify(sceneSave.transferLog) && JSON.stringify(saved.career.trophyCabinet) === JSON.stringify(sceneSave.career.trophyCabinet) && !Object.keys(saved).some((k) => /^(careerTimeline|careerStory|arrivalScene|matchAward)$/i.test(k)), `v=${saved.version} reports=${JSON.stringify(saved.matchReports) === JSON.stringify(sceneSave.matchReports)} transfers=${JSON.stringify(saved.transferLog) === JSON.stringify(sceneSave.transferLog)} trophies=${JSON.stringify(saved.career.trophyCabinet) === JSON.stringify(sceneSave.career.trophyCabinet)} keys=${Object.keys(saved).filter((k) => /^(careerTimeline|careerStory|arrivalScene|matchAward)$/i.test(k))}`);

await mount('hub', sceneSave);
await click(byId('hub-career-story'), 'Kariyer kısayolu');
check('Ana merkez kariyer profiline kısayol sunar', navigated === 'careerProfile');
await click(byId('hub-training'), 'Antrenman paneli');
check('Antrenman sahnesi mevcut odağı ve azaltılmış hareket tercihini kullanır', q('[data-testid="training-ground"]')?.getAttribute('data-area') === 'Teknik' && q('[data-testid="training-ground"]')?.getAttribute('data-motion') === 'reduced');
check('Sakat oyuncu sahadan çıkar; sağlıklı gerçek oyuncular ve kondisyon/form gösterilir', !q(`[data-testid="training-player"][data-player-id="${injuredPlayer.id}"]`) && !!q(`[data-testid="training-player"][data-player-id="${own.id}"]`) && body().includes(String(Math.round(own.fitness))) && body().includes(String(Math.round(own.form))) && /sakat oyuncu sahne dışında/i.test(body()));
for (const area of ['Hücum', 'Defans', 'Fizik', 'Zekâ', 'Teknik']) {
  await click(btn(area), area);
  check(`${area} odağı gerçek seçimle sahneyi değiştirir`, q('[data-testid="training-ground"]')?.getAttribute('data-area') === area && btn(area)?.getAttribute('aria-pressed') === 'true' && g.career.trainingFocus?.area === area);
}
await click(btn('Yoğun'), 'Yoğun');
check('Yoğunluk mevcut ayara ve sahne hızına bağlanır', q('[data-testid="training-ground"]')?.getAttribute('data-intensity') === 'yogun' && btn('Yoğun')?.getAttribute('aria-pressed') === 'true' && g.career.trainingFocus?.intensity === 'yogun');
await click(btn('Özeti güncelle ✓'), 'Antrenmanı kapat');
await act(async () => { await g.saveNow(); });
saved = (await readSave(career.slot))?.blob as SaveBlob & Record<string, any>;
check('Sadece seçili mevcut antrenman ayarı değişir, oyunculara anında çalışma uygulanmaz', saved.career.trainingFocus?.intensity === 'yogun' && JSON.stringify(saved.playerPatch) === JSON.stringify(sceneSave.playerPatch) && !Object.keys(saved).some((k) => /trainingScene|trainingGround/i.test(k)));
groundProps = { club: g.myClub, squad: [], focus: { area: 'Fizik', intensity: 'normal', sinceDay: 1 }, level: 1, reducedMotion: true };
await mount('ground', sceneSave);
check('Boş kadroda sayı/form uydurulmaz, dürüst boş durum görünür', body().includes('Sahada gösterilecek sağlıklı oyuncu yok') && q('[data-testid="training-ground"]')?.textContent?.includes('—'));

const prepSave = structuredClone(baseline) as SaveBlob & Record<string, any>;
prepSave.career.settings.reduceMotion = true;
const myFixtures = prepSave.fixtures.filter((f: DemoFixture) => f.comp === 'lig' && f.league === prepSave.leagueOf[career.clubId] && (f.homeId === career.clubId || f.awayId === career.clubId));
for (const f of myFixtures) f.played = true;
fixture = myFixtures[0]; fixture.played = false; fixture.day = prepSave.career.day;
prepSave.cup.fixtures = []; prepSave.cup.rounds = []; prepSave.friendlies = []; prepSave.international.cups = [];
const earlySave = structuredClone(prepSave) as SaveBlob & Record<string, any>;
const earlyFixture = earlySave.fixtures.find((f: DemoFixture) => !f.played && f.homeId === fixture.homeId && f.awayId === fixture.awayId && f.day === fixture.day);
if (earlyFixture) earlyFixture.day++;
await mount('prep', earlySave);
check('Maç gününden önce geliş sahnesi açılmaz ve maç başlatılmaz', !!byId('open-arrival')?.disabled && !q('[data-testid="arrival-scene"]') && !sessionActive);
await mount('prep', prepSave);
check('Maç gününde geliş isteğe bağlıdır ve maç kendiliğinden başlamaz', !!byId('open-arrival') && !byId('open-arrival')?.disabled && !q('[data-testid="arrival-scene"]') && body().includes('Maça Başla'));
await click(byId('open-arrival'), 'Gelişi izle');
check('Sahne gerçek ev sahibi stadyumu ve takım otobüsünü kullanır', !!q('[data-testid="arrival-scene"]') && body().includes(g.myClub.name) && body().includes(clubById(g.nextFixture!.homeId).stadium) && q('[data-testid="arrival-scene"]')?.getAttribute('data-motion') === 'reduced');
check('Azaltılmış harekette son kare açıktır, otomatik ekran geçişi yoktur', q('[data-testid="arrival-scene"]')?.getAttribute('data-phase') === 'Takım stadyum girişinde' && !!q('[role="dialog"]') && navigated === 'careerProfile');
const slider = q<HTMLInputElement>('[aria-label="Geliş sahnesi zamanı"]')!;
const endX = Number(q('[data-testid="arrival-bus"]')?.getAttribute('data-x'));
await act(async () => { slider.value = '0'; Simulate.change(slider); });
const startX = Number(q('[data-testid="arrival-bus"]')?.getAttribute('data-x'));
check('Klavye/sürgü zamanı otobüs konumunu gerçek anlamda değiştirir', startX < endX && q('[data-testid="arrival-scene"]')?.getAttribute('data-phase') === 'Takım otobüsü yolda');
await click(btn('Hazırlığa Dön'), 'Gelişi kapat');
check('Geliş bitince hazırlık ekranı ve manuel maç düğmesi kalır', !q('[data-testid="arrival-scene"]') && !!btn('Maça Başla'));
await act(async () => { await g.saveNow(); });
saved = (await readSave(career.slot))?.blob as SaveBlob & Record<string, any>;
check('Geliş izleme sonuç, fikstür ve kayıt şemasını değiştirmez', saved.version === 4 && JSON.stringify(saved.fixtures) === JSON.stringify(prepSave.fixtures) && JSON.stringify(saved.matchReports) === JSON.stringify(prepSave.matchReports));
await click(byId('open-arrival'), 'Gelişten manuel maça geçiş');
await click(all<HTMLButtonElement>('[role="dialog"] button').find((el) => el.textContent?.trim() === 'Maça Başla') ?? null, 'Geliş içindeki maç başlatma');
check('Geliş penceresindeki maç düğmesi yalnız kullanıcı basınca gerçek canlı maçı açar', sessionActive && !q('[data-testid="arrival-scene"]') && !!q('[role="timer"]'));
await mount('none', prepSave);
check('Canlı maçtan çıkınca oturum işareti temizlenir', !sessionActive);

result = g.buildDemoMatch(fixture.homeId, fixture.awayId, g.tactics[0].name);
const award = selectMatchAward(result, g.clubOfPlayer, g.playerOf)!;
const oldSelection = Object.entries(result.playerRows).filter(([id]) => g.clubOfPlayer(id)).sort((x, y) => y[1].rating - x[1].rating || y[1].g - x[1].g || y[1].a - x[1].a || y[1].shots - x[1].shots || x[0].localeCompare(y[0]))[0];
check('Ödül kazananı mevcut rapordaki puan/gol/asist/şut/kimlik sırasıyla aynıdır', award?.id === oldSelection[0] && award.row === oldSelection[1]);
check('Oyuncu verisi yoksa ödül kazananı uydurulmaz', selectMatchAward({ playerRows: {} }, g.clubOfPlayer, g.playerOf) === null);
let parity = true;
const awardSides = new Set<string>();
for (let seed = 1; seed <= 40; seed++) {
  const live = new MatchSession(buildEngineInput({ homeClub: g.myClub, awayClub: clubById('sakarya_vadi'), homeSquad: g.mySquad, awaySquad: g.squads.sakarya_vadi, homeTactic: g.tactics[0], seed, settings: g.career.settings, userSide: 'home' })).finishNow();
  const projection = matchEngineToDemo(live);
  const expected = Object.entries(live.stats.playerRows).filter(([id]) => !!g.clubOfPlayer(id))
    .sort((a, b) => b[1].rating - a[1].rating || b[1].g - a[1].g || b[1].a - a[1].a || b[1].shots - a[1].shots || a[0].localeCompare(b[0]))[0];
  const chosen = selectMatchAward(projection, g.clubOfPlayer, g.playerOf);
  parity &&= !!chosen && chosen.id === expected?.[0] && chosen.row.rating === expected?.[1].rating;
  if (chosen) awardSides.add(chosen.clubId);
}
check('40 gerçek canlı motor maçında ödül seçimi ve puanı önceki rapor sırasıyla aynıdır', parity, `${[...awardSides].join(', ')}`);
const rivalPlayer = g.squads.sakarya_vadi[0];
const sampleRow = Object.values(result.playerRows)[0];
const homeWins = { playerRows: { [own.id]: { ...sampleRow, rating: 9 }, [rivalPlayer.id]: { ...sampleRow, rating: 7 } } };
const awayWins = { playerRows: { [own.id]: { ...sampleRow, rating: 7 }, [rivalPlayer.id]: { ...sampleRow, rating: 9 } } };
check('Puanına göre kendi takımından veya rakipten oyuncu kazanabilir', selectMatchAward(homeWins, g.clubOfPlayer, g.playerOf)?.id === own.id && selectMatchAward(awayWins, g.clubOfPlayer, g.playerOf)?.id === rivalPlayer.id);
check('Tören sesleri transfer değil, yerel Türkçe ödül anonslarıdır', MATCH_AWARD_LINES.length === 2 && MATCH_AWARD_LINES.every((line) => line.src.startsWith('/assets/match/voice/') && /maçın/i.test(line.text) && !/transfer/i.test(line.text)));
await mount('report', prepSave);
audio.init({ master: .5, fx: .4 });
const beforePlay = played.length;
check('Tören kendiliğinden açılmaz ve ses çalmaz', !q('[data-testid="match-award"]') && played.length === beforePlay && !!byId('open-match-award'));
await click(byId('open-match-award'), 'Maç ödülü');
check('Tören aynı gerçek maç oyuncusu, puanı ve kulübünü gösterir', q('[data-testid="match-award"]')?.getAttribute('data-player-id') === award.id && body().includes(award.player!.name) && body().includes(award.row.rating.toFixed(2)) && body().includes(award.player!.clubId === career.clubId ? g.myClub.name : 'Sakarya'));
check('Anons yalnız açma eyleminde çalınır ve ana ses × efekt düzeyine uyar', played.length === beforePlay + 1 && played[played.length - 1].src.startsWith('/assets/match/voice/') && Math.abs(played[played.length - 1].volume - .2) < .001);
check('Altyazı oynatılan kayıtla aynı cümledir', MATCH_AWARD_LINES.some((line) => line.src === played[played.length - 1].src && body().includes(line.text)));
await click(btn('Tören Sesini Kapat'), 'Tören sesi kapat');
check('Tören sesi kapatılınca oynatma durur', pauses > 0 && !!btn('Tören Sesini Aç'));
await click(btn('Töreni Kapat'), 'Töreni kapat');
check('Töreni kapatmak maç raporundan otomatik çıkmaz', !q('[data-testid="match-award"]') && done === 0 && !!byId('open-match-award'));
audio.init({ master: 0, fx: 1 });
const mutedCount = played.length;
await click(byId('open-match-award'), 'Sessiz tören');
check('Ana ses kapalıyken ses çalınmaz ama altyazı görünür', played.length === mutedCount && body().includes('STADYUM ANONSU'));
await click(btn('Töreni Kapat'), 'Sessiz töreni kapat');
audio.init();

await mount('prep', prepSave);
await click(btn('Simüle Et (hızlı sonuç)'), 'Hızlı sonuç');
check('Hızlı sonuçta da tören isteğe bağlıdır', !!byId('quick-open-award') && !q('[data-testid="match-award"]'));
await click(byId('quick-open-award'), 'Hızlı sonuç töreni');
const quickWinner = q('[data-testid="match-award"]')?.getAttribute('data-player-id');
check('Hızlı sonuç töreninin oyuncusu gerçek arşiv satırındadır', !!quickWinner && !!g.matchReports?.[0]?.playerRows?.[quickWinner] && !!q('[data-testid="quick-open-highlights"]'));
await click(btn('Töreni Kapat'), 'Hızlı töreni kapat');
check('Hızlı sonuç ekranı kullanıcı kapatmadan açık kalır', !!q('[role="dialog"][aria-label="Hızlı Simülasyon Sonucu"]') || body().includes('Hızlı Simülasyon Sonucu'));

await act(async () => root.unmount());
dom.window.close();
console.log(`\nKariyer sahneleri: ${passed}/${passed + failures.length} geçti.`);
if (failures.length) { console.error('Başarısız:', failures.join(' | ')); process.exitCode = 1; }
