// Contract renewals and real-event highlights on the actual provider, with old-save regressions.
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
const played: string[] = [];
let pauses = 0;
class AudioMock {
  src: string; volume = 1; onplaying: (() => void) | null = null; onwaiting = null; onpause = null; onended = null; onerror = null;
  constructor(src: string) { this.src = src; }
  play() { played.push(this.src); queueMicrotask(() => this.onplaying?.()); return Promise.resolve(); }
  pause() { pauses++; }
}
(dom.window as any).Audio = AudioMock;

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { GameProvider, useGame, type DemoMatchEvent, type DemoMatchResult } from '../src/store/game';
import { readSave, SAVE_VERSION, type SaveBlob } from '../src/store/persist';
import { MarketScreen } from '../src/screens/Market';
import { MatchReport } from '../src/screens/MatchReport';
import { MatchPrep } from '../src/screens/MatchPrep';
import { StatsHub } from '../src/screens/StatsHub';
import { MatchHighlights } from '../src/components/match/MatchHighlights';
import { evaluateRenewalOffer, renewalDemand } from '../src/data/contractNegotiation';
import { managerRenewalLine, playerRenewalLine, renewalSignedLine, ALL_TRANSFER_VOICES } from '../src/data/transferVoices';
import { archivedHighlightEvents, makeHighlightReel, recordedPath } from '../src/engine/highlights';
import { compactMatchEvents, EV_GOAL, EV_RED, EV_SAVE, EV_VAR, SIDE_HOME, SIDE_AWAY } from '../src/engine/matchEvents';
import { matchEventsToDemo } from '../src/engine/adapter';
import { eventTeamSide } from '../src/engine/matchPresentation';
import { clubById } from '../src/data/clubs';
import type { Career, DemoFixture, MatchArchiveEntry } from '../src/types';

const career: Career = {
  slot: 3, manager: { name: 'Test Menajer', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 0 },
  clubId: 'denizli_yesilova', seed: 12345, day: 1, week: 1,
  settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true },
  pending: { marketShortlist: [], activeProject: null },
} as Career;
let g: ReturnType<typeof useGame>;
let report: DemoMatchResult;
let fixture: DemoFixture;
let done = 0;
let highlightsEvents: DemoMatchEvent[] = [];
type Mode = 'none' | 'market' | 'report' | 'prep' | 'stats' | 'highlights';
const Harness: React.FC<{ mode: Mode }> = ({ mode }) => {
  g = useGame();
  if (mode === 'market') return <MarketScreen />;
  if (mode === 'report') return <MatchReport result={report} fixture={fixture} onDone={() => { done++; }} />;
  if (mode === 'prep') return <MatchPrep go={() => { done++; }} />;
  if (mode === 'stats') return <StatsHub />;
  if (mode === 'highlights') return <MatchHighlights home={clubById(career.clubId)} away={clubById('sakarya_vadi')} homeGoals={1} awayGoals={1} events={highlightsEvents} />;
  return null;
};
const root = createRoot(dom.window.document.getElementById('root')!);
let key = 0, passed = 0;
const failures: string[] = [];
const check = (name: string, ok: unknown, detail = '') => { if (ok) passed++; else failures.push(name); console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
const q = <T extends HTMLElement = HTMLElement>(selector: string) => dom.window.document.querySelector<T>(selector);
const all = <T extends HTMLElement = HTMLElement>(selector: string) => Array.from(dom.window.document.querySelectorAll<T>(selector));
const body = () => dom.window.document.body.textContent ?? '';
const byId = (id: string) => q<HTMLButtonElement>(`[data-testid="${id}"]`);
const buttonText = (text: string) => all<HTMLButtonElement>('button').find((b) => (b.textContent ?? '').trim() === text) ?? null;
const click = async (button: HTMLButtonElement | null, label: string) => {
  if (!button || button.disabled) throw new Error(`Tıklanamadı: ${label} · ${body().slice(-500)}`);
  await act(async () => button.click());
};
const clickId = async (id: string) => click(byId(id), id);
const mount = async (mode: Mode, snapshot?: SaveBlob) => {
  key++;
  await act(async () => root.render(<GameProvider key={key} career={career} snapshot={snapshot}><Harness mode={mode} /></GameProvider>));
};
const change = async (element: HTMLInputElement, value: string) => { await act(async () => { element.value = value; Simulate.change(element); }); };
const stage = () => q('[data-testid="renewal-flow"]')?.getAttribute('data-stage');

await mount('none');
await g.saveNow();
const baseline = (await readSave(career.slot))?.blob as SaveBlob & Record<string, any>;
if (!baseline) throw new Error('Başlangıç kaydı yok');
const player = [...g.mySquad].sort((a, b) => b.ratings.gen - a.ratings.gen)[0];
const withContract = () => {
  const s = structuredClone(baseline) as SaveBlob & Record<string, any>;
  s.playerPatch[player.id] = { ...(s.playerPatch[player.id] ?? {}), contractYears: 1, wage: 150 };
  s.budget.tb = 10;
  return s;
};

let stable = true, bounded = true, matched = true, diverse = new Set<string>();
for (let seed = 1; seed <= 100; seed++) for (const tone of ['calm', 'witty', 'firm'] as const) {
  const opts = { currentWage: 1000, offeredWage: 800, tone, seed, day: 9, playerId: player.id };
  const response = evaluateRenewalOffer(opts);
  stable &&= JSON.stringify(response) === JSON.stringify(evaluateRenewalOffer(opts));
  matched &&= response.demand === evaluateRenewalOffer({ ...opts, offeredWage: response.demand }).demand && evaluateRenewalOffer({ ...opts, offeredWage: response.demand }).accepted;
  bounded &&= response.demand <= 1150 && response.demand >= 1150 - Math.floor(1150 * 0.02);
  diverse.add(managerRenewalLine(tone, `${seed}`).id);
}
check('Üslup deterministik ve maaş değişince karşı beklenti sabit', stable && matched);
check('Üslup küçük ve sınırlı bir indirim etkisi yapıyor', bounded);
check('Menajer cevaplarında birden fazla Türkçe replik var', diverse.size >= 7, `${diverse.size} replik`);
const renewalLines = Array.from({ length: 100 }, (_, i) => [managerRenewalLine('witty', String(i)), managerRenewalLine('firm', String(i)), playerRenewalLine(true, String(i)), playerRenewalLine(false, String(i)), renewalSignedLine(String(i))]).flat();
check('Yenileme sesleri transfer gelişini veya yeni oyuncu tanıtımını söylemiyor', renewalLines.every((line) => !/gelmek|gönderin|yeni transfer|formayı giymek|stadı mı alıyoruz/i.test(line.text)));

// Quotes are pure, and direct or legacy signing must recheck everything.
await mount('none', withContract());
const before = g.budget.tb;
const low = g.quoteRenewal(player.id, 4, { wage: 112, tone: 'calm' });
const accepted = g.quoteRenewal(player.id, 4, { wage: 173, tone: 'calm' });
check('Düşük maaş reddedilir, kabul/ret ön izlemesi kaydı değiştirmez', low.ok && low.accepted === false && low.demand === 173 && accepted.accepted === true && g.budget.tb === before && g.playerOf(player.id)?.contractYears === 1);
check('İmza bonusu altı mevcut maaş, bütçe ₺M ve maaş ₺B/ay', accepted.bonus === 0.9 && accepted.budgetAfter === 9.1 && accepted.wage === 173 && accepted.years === 4);
const invalids = [
  g.quoteRenewal(player.id, 2, { wage: 173, tone: 'calm' }),
  g.quoteRenewal(player.id, 6, { wage: 173, tone: 'calm' }),
  g.quoteRenewal(player.id, 3, { wage: -1, tone: 'calm' }),
  g.quoteRenewal(player.id, 3, { wage: Infinity, tone: 'calm' }),
  g.quoteRenewal(player.id, 3, { wage: 173.5, tone: 'calm' }),
  g.quoteRenewal(player.id, 3, { wage: 100000, tone: 'calm' }),
  g.quoteRenewal(player.id, 3, { wage: 173, tone: 'wrong' as any }),
];
check('Geçersiz süre, ücret ve üslup reddedilir', invalids.every((r) => !r.ok));
let first: ReturnType<typeof g.renewContract>, second: ReturnType<typeof g.renewContract>;
await act(async () => { first = g.renewContract(player.id, 4, { wage: 173, tone: 'calm' }); second = g.renewContract(player.id, 4, { wage: 173, tone: 'calm' }); });
check('Aynı olayda çift imza tek kez işlenir', first!.ok && !second!.ok && g.budget.tb === 9.1 && g.inbox.filter((m) => m.title === 'Sözleşme yenilendi').length === 1);
check('İmza gerçek sözleşme süresini ve maaşı değiştirir', g.playerOf(player.id)?.contractYears === 4 && g.playerOf(player.id)?.wage === 173);
await act(async () => { await g.saveNow(); });
const saved = (await readSave(career.slot))?.blob as SaveBlob & Record<string, any>;
check('Kayıt sürümü değişmedi, pazarlık için yeni kalıcı alan yok', saved.version === 4 && SAVE_VERSION === 4 && !Object.keys(saved).some((k) => /renewal|highlight|negotiation/i.test(k)));
await mount('none', saved);
check('Yenilenmiş maaş, süre ve bütçe kayıt/yükleme sonrasında korunuyor', g.playerOf(player.id)?.contractYears === 4 && g.playerOf(player.id)?.wage === 173 && g.budget.tb === 9.1);
await mount('none', withContract());
await act(async () => { first = g.renewContract(player.id, 3); });
check('Eski iki argümanlı yenileme çağrısı korunuyor', first!.ok && g.playerOf(player.id)?.wage === 173 && g.playerOf(player.id)?.contractYears === 3);
const noBudget = withContract(); noBudget.budget.tb = 0.899;
await mount('none', noBudget);
check('Eksik imza bonusu ön izleme ve son imzada reddedilir', !g.quoteRenewal(player.id, 3, { wage: 173, tone: 'calm' }).ok && !g.renewContract(player.id, 3, { wage: 173, tone: 'calm' }).ok);
const exact = withContract(); exact.budget.tb = 0.9;
await mount('none', exact);
await act(async () => { first = g.renewContract(player.id, 3, { wage: 173, tone: 'calm' }); });
check('Bonus kadar bütçe ile imza sonrası kasa sıfır olur', first!.ok && g.budget.tb === 0);
const loanee = withContract(); loanee.loans = [{ playerId: player.id, fromClub: 'sakarya_vadi', toClub: career.clubId, seasonNo: 0 }];
await mount('none', loanee);
check('Kiralık oyuncunun sözleşmesi yenilenemez', /Kiralık/.test(g.renewContract(player.id, 3).reason ?? ''));
const other = withContract(); other.playerClub[player.id] = 'sakarya_vadi';
await mount('none', other);
check('Başka kulübe geçmiş oyuncu yenilenemez', !g.renewContract(player.id, 3).ok);
const out = withContract(); out.removedPlayers = [player.id];
await mount('none', out);
check('Kayıttan çıkmış oyuncu yenilenemez', !g.renewContract(player.id, 3).ok);
const alreadyLong = withContract(); alreadyLong.playerPatch[player.id].contractYears = 3;
await mount('none', alreadyLong);
check('İki yıldan uzun geçerli sözleşme yeniden imzalanamaz', !g.renewContract(player.id, 3).ok);
const grievance = withContract();
const myLeagueFixtures = grievance.fixtures.filter((f: DemoFixture) => f.comp === 'lig' && (f.homeId === career.clubId || f.awayId === career.clubId));
myLeagueFixtures.slice(0, 7).forEach((f: DemoFixture) => { f.played = true; });
grievance.playerStats = {};
await mount('none', grievance);
check('Kırgın oyuncu süre sözü olmadan sözleşme konuşmaz', /kırgın/i.test(g.quoteRenewal(player.id, 3, { wage: 173, tone: 'calm' }).reason ?? ''));
await act(async () => { g.promiseMinutes(player.id); });
check('Gerçek süre sözü verilince görüşme yeniden açılır', g.quoteRenewal(player.id, 3, { wage: 173, tone: 'calm' }).ok);
const sold = withContract();
sold.incomingOffers = [{ id: 'qa-same-event', playerId: player.id, fromClubId: 'sakarya_vadi', fee: 1, day: 1, expiresDay: 5, negotiable: true, state: 'open' }];
await mount('none', sold);
let sale: ReturnType<typeof g.respondOffer>;
await act(async () => { sale = g.respondOffer('qa-same-event', true); first = g.renewContract(player.id, 3); });
check('Aynı olayda satılan oyuncuya eski görünümden imza atılamaz', sale!.ok && !first!.ok && g.playerOf(player.id)?.clubId === 'sakarya_vadi');

// Full voice/UI sequence: decline, revise, review, cancel and finally sign.
await mount('market', withContract());
await click(all<HTMLButtonElement>('button').find((b) => (b.textContent ?? '').startsWith('Diğer')) ?? null, 'Diğer');
await click(buttonText('Sözleşmeler'), 'Sözleşmeler');
const openTarget = () => all<HTMLButtonElement>('button').find((b) => b.textContent?.trim() === 'Yenile' && b.parentElement?.parentElement?.textContent?.includes(player.name)) ?? null;
await click(openTarget(), 'Oyuncu yenile');
check('Yenileme kulübe uygun hareketli, konuşmacılı masada başlar', stage() === 'offer' && q('[data-testid="transfer-theatre"]')?.getAttribute('aria-label')?.includes('SÖZLEŞME YENİLEME') && !!byId('renewal-send')?.disabled);
check('Süre seçimi 3/4/5 yıl ve mevcut/önerilen maaş açıklanır', ['3 yıl', '4 yıl', '5 yıl'].every((x) => body().includes(x)) && body().includes('₺150B/ay') && body().includes('₺173B/ay'));
await change(q<HTMLInputElement>('[data-testid="renewal-wage"]')!, '112');
await clickId('renewal-reply-calm');
const line = ALL_TRANSFER_VOICES.find((item) => item.src === played.at(-1));
check('Seçilen menajer cümlesi, altyazı ve yerel ses aynı', !!line && (q('[data-testid="transfer-subtitle"]')?.textContent ?? '').includes(line.text) && q('[data-testid="transfer-theatre"]')?.getAttribute('data-speaking') === 'manager');
await clickId('renewal-send');
check('Düşük ücret ret ve gerçek karşı beklenti gösterir; sözleşme değişmez', stage() === 'response' && body().includes('en az ₺173B/ay') && g.budget.tb === 10 && g.playerOf(player.id)?.contractYears === 1);
await clickId('renewal-match-demand');
check('Karşı beklenti düzenleme ekranına aktarılır', stage() === 'offer' && q<HTMLInputElement>('[data-testid="renewal-wage"]')?.value === '173');
await click(buttonText('4 yıl'), '4 yıl');
await clickId('renewal-send');
check('Kabul ayrı yanıt aşaması; henüz imza veya ödeme yok', stage() === 'response' && body().includes('Henüz imza atılmadı') && g.budget.tb === 10 && g.playerOf(player.id)?.contractYears === 1);
await clickId('renewal-review');
check('Son kontrol süre, yeni maaş, bonus ve kalan bütçeyi gösterir', stage() === 'review' && ['4 yıl', '₺173B/ay', '₺0.900M', '₺9.100M'].every((text) => body().includes(text)));
await click(buttonText('Vazgeç · Değişiklik Yapma'), 'Vazgeç');
check('Vazgeçmek hiçbir sözleşme veya bütçeyi değiştirmez ve sesi durdurur', !q('[data-testid="renewal-flow"]') && g.playerOf(player.id)?.contractYears === 1 && g.budget.tb === 10 && pauses > 0);
await click(openTarget(), 'Yenile tekrar');
await clickId('renewal-reply-witty');
check('Seçim yanında dürüst küçük fayda ve belirsizlik ipuçları var', /küçük ücret indirimi/i.test(body()) && /değişmeyebilir/i.test(body()));
await clickId('renewal-send'); await clickId('renewal-review');
const sign = byId('renewal-sign')!;
await act(async () => { sign.click(); sign.click(); });
check('Son imza ile tek ödeme yapılır ve transfer tanıtımı açılmaz', stage() === 'signed' && g.playerOf(player.id)?.contractYears === 3 && g.budget.tb === 9.1 && g.inbox.filter((m) => m.title === 'Sözleşme yenilendi').length === 1 && q('[data-testid="transfer-theatre"]')?.getAttribute('data-scene') === 'negotiation');

// A previously accepted quote is never authority to sign after the facts change.
await mount('market', withContract());
await click(all<HTMLButtonElement>('button').find((b) => (b.textContent ?? '').startsWith('Diğer')) ?? null, 'Diğer');
await click(buttonText('Sözleşmeler'), 'Sözleşmeler'); await click(openTarget(), 'Yenile');
await clickId('renewal-reply-calm'); await clickId('renewal-send'); await clickId('renewal-review');
await act(async () => { g.setBudget((budget) => ({ ...budget, tb: 0.1 })); });
await clickId('renewal-sign');
check('İncelemeden sonra bütçe değişirse son imza yeniden denetlenir', stage() === 'review' && /bütçe yetersiz/i.test(q('[role="alert"]')?.textContent ?? '') && g.playerOf(player.id)?.contractYears === 1 && g.budget.tb === 0.1);
await act(async () => { g.setBudget((budget) => ({ ...budget, tb: 9 })); });
await clickId('renewal-sign');
check('Bütçe yeterli ama değişmişse yeni rakam gösterilir; ilk tıklama imzalamaz', stage() === 'review' && /mali koşullar değişti/i.test(q('[role="alert"]')?.textContent ?? '') && body().includes('₺8.100M') && g.playerOf(player.id)?.contractYears === 1);
await clickId('renewal-sign');
check('Güncel mali koşullar incelendikten sonra imza işlenir', stage() === 'signed' && g.budget.tb === 8.1 && g.playerOf(player.id)?.contractYears === 3);
const saleAtReview = withContract();
saleAtReview.incomingOffers = [{ id: 'qa-at-review', playerId: player.id, fromClubId: 'sakarya_vadi', fee: 1, day: 1, expiresDay: 5, negotiable: true, state: 'open' }];
await mount('market', saleAtReview);
await click(all<HTMLButtonElement>('button').find((b) => (b.textContent ?? '').startsWith('Diğer')) ?? null, 'Diğer');
await click(buttonText('Sözleşmeler'), 'Sözleşmeler'); await click(openTarget(), 'Yenile');
await clickId('renewal-reply-calm'); await clickId('renewal-send'); await clickId('renewal-review');
await act(async () => { g.respondOffer('qa-at-review', true); });
await clickId('renewal-sign');
check('İncelemeden sonra oyuncu satılırsa son imza reddedilir', stage() === 'review' && /kadronuzda değil/i.test(q('[role="alert"]')?.textContent ?? '') && g.playerOf(player.id)?.clubId === 'sakarya_vadi' && g.playerOf(player.id)?.contractYears === 1);

// Paths and score: no made-up geometry, no cancelled VAR goal counted.
const events: DemoMatchEvent[] = [
  { minute: 10, kind: 'goal', side: 'home', text: 'Gerçek ev sahibi golü', path: ['L-D', 'C-M', 'C-A'] },
  { minute: 20, kind: 'var', side: 'away', text: 'VAR: gol iptal edildi.', path: ['L-M', 'R-A'] },
  { minute: 30, kind: 'goal', side: 'away', text: 'Gerçek deplasman golü', anim: { eventType: 'goal', path: ['L-D', 'R-A'] } },
  { minute: 40, kind: 'card', side: 'home', text: 'Gerçek kart' },
  { minute: 45, kind: 'half', text: 'Devre' },
];
const reel = makeHighlightReel(events, 1, 1);
check('Gerçek olay metni ve sırası korunur, devre dışarıda kalır', reel.moments.length === 4 && reel.moments.every((m, i) => m.text === events[i].text));
check('Ev sahibi yolu kaydedilen bölgelerden çizilir', JSON.stringify(reel.moments[0].path) === JSON.stringify([{ x: 20, y: 82 }, { x: 50, y: 50 }, { x: 50, y: 15 }]));
check('Deplasman anim yolu iki eksende aynalanır', JSON.stringify(reel.moments[2].path) === JSON.stringify([{ x: 80, y: 18 }, { x: 22, y: 82 }]));
check('VAR iptali gol sayılmaz; skora göre doğru akış var', reel.scoreIsComplete && JSON.stringify(reel.moments.map((m) => m.score)) === JSON.stringify([{ home: 1, away: 0 }, { home: 1, away: 0 }, { home: 1, away: 1 }, { home: 1, away: 1 }]));
const incomplete = makeHighlightReel(events, 2, 1);
check('Eksik gol akışında ara skor uydurulmaz', !incomplete.scoreIsComplete && incomplete.moments.every((m) => m.score === null));
check('Geçersiz veya tarafı bilinmeyen yol çizilmez', recordedPath({ ...events[0], path: ['L-D', 'fake'] }) === null && recordedPath({ ...events[0], side: undefined }) === null && reel.moments[3].path === null);
check('Birinci yol geçersizse yalnız geçerli anim yolu kullanılır', JSON.stringify(recordedPath({ ...events[0], path: ['bad'], anim: { eventType: 'goal', path: ['C-M', 'C-A'] } })) === JSON.stringify([{ x: 50, y: 50 }, { x: 50, y: 15 }]));
check('İptal yazılı çelişkili gol olayı skor üretmez', makeHighlightReel([{ minute: 3, kind: 'goal', side: 'home', text: 'Gol iptal edildi.' }], 0, 0).moments[0].score?.home === 0);
const cancelledGoals: DemoMatchEvent[] = [
  { minute: 3, kind: 'goal', side: 'home', text: 'GOL İPTAL' },
  { minute: 5, kind: 'goal', side: 'away', text: 'GOOOL!', anim: { eventType: 'goal', outcome: 'overturned' } },
];
const cancelledReel = makeHighlightReel(cancelledGoals, 0, 0);
check('Türkçe büyük harfli iptal ve VAR motor kararı gol sayılmaz', cancelledReel.scoreIsComplete && cancelledReel.moments.every((m) => m.kind === 'var' && m.score?.home === 0 && m.score?.away === 0));
const adaptedCancelled = matchEventsToDemo([
  { minute: 3, kind: 'goal', side: 'home', text: 'GOL İPTAL' },
  { minute: 5, kind: 'goal', side: 'away', text: 'GOOOL!', anim: { eventType: 'goal', outcome: 'overturned' } },
  { minute: 7, kind: 'goal', side: 'home', text: 'Gerçek gol!' },
]);
check('İptal edilen gol canlı saha, ses ve akışa gol değil VAR olayı olarak aktarılır', adaptedCancelled.map((event) => event.kind).join(',') === 'var,var,goal' && adaptedCancelled[0].text === 'GOL İPTAL');
const compactCancelled = compactMatchEvents([...cancelledGoals, { minute: 7, kind: 'goal', side: 'home', text: 'Gerçek gol!' }, { minute: 8, kind: 'card', side: 'away', text: 'KIRMIZI KART' }]);
check('Kayıt biçimi değişmeden iptal VAR, gerçek gol gol, büyük harfli kart kırmızı arşivlenir', compactCancelled.map((row) => row[1]).join(',') === `${EV_VAR},${EV_VAR},${EV_GOAL},${EV_RED}`);
const homeId = career.clubId, awayId = 'sakarya_vadi';
const homeAttackSave: DemoMatchEvent = { minute: 6, kind: 'save', side: 'home', text: 'Kaleci kurtardı', path: ['L-D', 'C-A'], anim: { eventType: 'shot', attackingTeamId: homeId, outcome: 'save' } };
const awayAttackSave: DemoMatchEvent = { minute: 7, kind: 'save', side: 'away', text: 'Ev sahibi kaleci kurtardı', path: ['L-D', 'C-A'], anim: { eventType: 'shot', attackingTeamId: awayId, outcome: 'save' } };
const setPieceSave: DemoMatchEvent = { minute: 8, kind: 'save', side: 'away', playerId: 'kaleci', text: 'Penaltıyı kurtardı' };
const unclearSave: DemoMatchEvent = { minute: 9, kind: 'save', side: 'home', text: 'Eski kurtarış' };
const saves = makeHighlightReel([homeAttackSave, awayAttackSave, setPieceSave, unclearSave], 0, 0, { homeId, awayId }).moments;
check('Özette açık oyun kurtarışını yapan takım ile şut yolu iki yönde doğru ayrılır', saves[0].side === 'away' && saves[0].pathSide === 'home' && saves[0].path?.[0].x === 20 && saves[1].side === 'home' && saves[1].pathSide === 'away' && saves[1].path?.[0].x === 80);
check('Özette duran top kurtarışında kaleci tarafı korunur; belirsiz eski kayıt tahmin edilmez', saves[2].side === 'away' && saves[3].side === undefined);
const unknownArchiveSave = archivedHighlightEvents([[6, EV_SAVE, SIDE_HOME]], () => undefined);
check('Eski arşivde açık oyun/duran top ayrımı kayıpsa kurtaran takım uydurulmaz', makeHighlightReel(unknownArchiveSave, 0, 0, { homeId, awayId }).moments[0].side === undefined);
const archiveEvents = archivedHighlightEvents([[10, EV_GOAL, SIDE_HOME, player.id], [20, EV_VAR, SIDE_AWAY], [40, EV_RED, SIDE_HOME], [45, 999, 0]], (id) => id === player.id ? player.name : undefined);
check('Arşiv yalnız gerçek tür, dakika, taraf ve bilinen oyuncuyu çözer', archiveEvents.length === 3 && archiveEvents[0].text === `Gol · ${player.name}` && archiveEvents[1].text === 'VAR incelemesi / kararı' && archiveEvents[2].text === 'Kırmızı kart' && archiveEvents.every((e) => !e.path && !e.anim));
check('Eski ve boş arşiv olayları güvenli boş liste verir', archivedHighlightEvents(undefined, () => undefined).length === 0 && archivedHighlightEvents([], () => undefined).length === 0);

await mount('none', baseline);
let realMatches = 0, exactSources = true, consistentScores = true, realSaves = 0, actualSavesCorrect = true;
for (const awayId of ['sakarya_vadi', 'mugla_gokova', 'aydin_efe', 'balikesir_korfez', 'izmir_kordon']) {
  if (!g.squads[awayId]) continue;
  const actual = g.buildDemoMatch(career.clubId, awayId, g.tactics[0].name);
  const actualReel = makeHighlightReel(actual.events, actual.hg, actual.ag, { homeId: career.clubId, awayId });
  exactSources &&= actualReel.moments.every((moment) => actual.events.some((event) => event.minute === moment.minute && event.text === moment.text && (eventTeamSide(event, career.clubId, awayId) ?? undefined) === moment.side));
  for (const source of actual.events.filter((event) => event.kind === 'save' && event.anim?.attackingTeamId)) {
    const moment = actualReel.moments.find((item) => item.kind === 'save' && item.minute === source.minute && item.text === source.text);
    const expected = source.anim?.attackingTeamId === career.clubId ? 'away' : 'home';
    realSaves++;
    actualSavesCorrect &&= !!moment && moment.side === expected && moment.pathSide === source.side;
  }
  consistentScores &&= actualReel.scoreIsComplete && (!actualReel.moments.length || actualReel.moments.at(-1)?.score?.home === actual.hg && actualReel.moments.at(-1)?.score?.away === actual.ag);
  realMatches++;
}
check('Gerçek motor maçlarında özet yalnız kayıtlı olaylardan üretilir', realMatches >= 3 && exactSources, `${realMatches} maç`);
check('Gerçek motor maçlarında son olay skoru gerçek sonuçla uyuşur', consistentScores);
check('Gerçek motor kurtarışlarında özet hücum ekibini kaleci takımı sanmaz', actualSavesCorrect && realSaves > 0, `${realSaves} açık oyun kurtarışı`);

highlightsEvents = [homeAttackSave];
await mount('highlights', baseline);
check('Özet ekranında kurtarışı yapan takım ve hücum edenin yolu ayrı gösterilir', q('[data-testid="highlight-event"]')?.textContent?.includes('Sakarya Vadi SK') && q('[data-testid="highlight-attacking-route"]')?.textContent?.includes('Denizli Yeşilova SK') && q('[data-testid="highlights-route"]')?.getAttribute('data-points') === '20,82 50,15');
highlightsEvents = [unclearSave];
await mount('highlights', baseline);
check('Belirsiz eski kurtarış ekranı yanlış kulüp adı yerine takım bilgisi yok der', q('[data-testid="highlight-event"]')?.textContent?.includes('Takım bilgisi yok') && !!q('[data-testid="highlight-no-position"]'));

highlightsEvents = events;
await mount('highlights', baseline);
check('Özet başlangıçta duraklar; ilk gerçek olay ve konum görünür', q('[data-testid="match-highlights"]')?.getAttribute('data-playing') === 'false' && body().includes('Gerçek ev sahibi golü') && q('[data-testid="highlights-route"]')?.getAttribute('data-points') === '20,82 50,50 50,15');
await clickId('highlight-next');
check('İleri ile VAR olayına geçilir ve skor değişmez', body().includes('VAR: gol iptal edildi.') && q('[data-testid="highlights-score"]')?.textContent?.includes('1–0'));
await clickId('highlight-next');
check('Sonraki olayda aynalanmış gerçek deplasman yolu görünür', q('[data-testid="highlights-route"]')?.getAttribute('data-points') === '80,18 22,82' && q('[data-testid="highlights-score"]')?.textContent?.includes('1–1'));
await clickId('highlight-next');
check('Yolu olmayan olayda konum kaydı yok denir', !!q('[data-testid="highlight-no-position"]') && !q('[data-testid="highlights-route"]'));
await clickId('highlight-previous');
check('Geri düğmesi önceki gerçek olayı gösterir', body().includes('Gerçek deplasman golü'));
await clickId('highlight-play');
check('Oynatma yalnız düğme ile başlar', q('[data-testid="match-highlights"]')?.getAttribute('data-playing') === 'true');
await clickId('highlight-play');
check('Duraklatma zamanlayıcıyı durdurur', q('[data-testid="match-highlights"]')?.getAttribute('data-playing') === 'false');
const originalTimeout = dom.window.setTimeout.bind(dom.window);
const originalClearTimeout = dom.window.clearTimeout.bind(dom.window);
const playbackTimers = new Set<number>();
(dom.window as any).setTimeout = (callback: TimerHandler, delay?: number, ...args: any[]) => {
  const id = originalTimeout(callback, delay, ...args); if (delay === 2600) playbackTimers.add(id); return id;
};
(dom.window as any).clearTimeout = (id: number) => { playbackTimers.delete(id); originalClearTimeout(id); };
await clickId('highlight-play');
check('Oynatma tek zamanlayıcı kurar', playbackTimers.size === 1);
await mount('none', baseline);
check('Özet kapatılınca oynatma zamanlayıcısı temizlenir', playbackTimers.size === 0);
(dom.window as any).setTimeout = originalTimeout;
(dom.window as any).clearTimeout = originalClearTimeout;

// Real report keeps the manual completion button; opening/closing highlights cannot finish it.
await mount('none', baseline);
fixture = g.nextFixture!;
report = { ...g.buildDemoMatch(fixture.homeId, fixture.awayId, g.tactics[0].name), events, hg: 2, ag: 1 };
done = 0;
await mount('report', baseline);
await clickId('open-highlights');
check('Maç raporundan özete kullanıcı isteğiyle erişilir; eksik skor açıkça maç sonu', !!q('[data-testid="match-highlights"]') && !!q('[data-testid="highlights-score-note"]') && q('[data-testid="highlights-score"]')?.textContent?.includes('MAÇ SONU') && done === 0);
await click(all<HTMLButtonElement>('button').find((b) => b.getAttribute('aria-label') === 'Kapat') ?? null, 'Özeti kapat');
check('Özet kapanınca rapor ve manuel sonuç butonu kalır', done === 0 && !!buttonText('Sonucu Kaydet — Ana Merkez') && !q('[data-testid="match-highlights"]'));

// Old archive without event/path fields stays honest and does not create a save schema.
const oldArchive = withContract();
oldArchive.matchReports = [{ id: 'old-report', day: 2, seasonNo: 0, comp: 'lig', homeId: career.clubId, awayId: 'sakarya_vadi', hg: 1, ag: 0, xgHome: 1, xgAway: 0.5, foulsHome: 0, foulsAway: 0, yellowsHome: 0, yellowsAway: 0, redsHome: 0, redsAway: 0, playerRows: {}, playerClubIds: {} } as MatchArchiveEntry];
await mount('stats', oldArchive);
await click(buttonText('Lig Analizi'), 'Lig Analizi');
await clickId('archive-highlight-open');
check('Eski maç arşivi kayıtsız olaylar için dürüst boş durum gösterir', !!q('[data-testid="highlights-empty"]') && body().includes('özgün anlatım ve konum kaydı saklanmaz') && !!q('[data-testid="highlights-score-note"]'));
const savedArchive = structuredClone(oldArchive); savedArchive.matchReports[0].events = [[10, EV_GOAL, SIDE_HOME, player.id], [20, EV_VAR, SIDE_AWAY]];
await mount('stats', savedArchive);
await click(buttonText('Lig Analizi'), 'Lig Analizi'); await clickId('archive-highlight-open');
check('Yeni arşivde yalnız kaydedilmiş olay ve oyuncu var, konum uydurulmaz', body().includes(`Gol · ${player.name}`) && !!q('[data-testid="highlight-no-position"]') && !q('[data-testid="highlights-route"]'));

// Last quick fixture: result sheet must survive nextFixture becoming null.
const lastFixture = structuredClone(baseline) as SaveBlob & Record<string, any>;
const league = lastFixture.leagueOf[career.clubId];
const mine = lastFixture.fixtures.filter((f: DemoFixture) => f.comp === 'lig' && f.league === league && (f.homeId === career.clubId || f.awayId === career.clubId));
const finalFx = mine[0];
for (const f of mine) f.played = true;
finalFx.played = false; finalFx.day = lastFixture.career.day;
lastFixture.cup.fixtures = []; lastFixture.cup.rounds = []; lastFixture.friendlies = [];
for (const cup of lastFixture.international.cups) {
  for (const f of cup.fixtures) if (f.homeId === career.clubId || f.awayId === career.clubId) f.played = true;
  for (const round of cup.rounds) for (const tie of round.ties) if (tie.homeId === career.clubId || tie.awayId === career.clubId) tie.winner = tie.homeId;
}
await mount('prep', lastFixture);
check('Son fikstür hızlı simülasyona hazır', !!g.nextFixture && g.nextFixture.day === g.career.day);
await click(buttonText('Simüle Et (hızlı sonuç)'), 'Son fikstürü simüle et');
check('Son fikstürden sonra sıradaki maç yok ama hızlı sonuç erişilebilir', !g.nextFixture && body().includes('Hızlı Simülasyon Sonucu') && !!byId('quick-open-highlights'), JSON.stringify(g.nextFixture));
await clickId('quick-open-highlights');
check('Hızlı sonuç gerçek olaylı özeti kullanıcı isteğiyle açar', !!q('[data-testid="match-highlights"]') && q('[data-testid="match-highlights"]')?.getAttribute('data-playing') === 'false');
await act(async () => { await g.saveNow(); });
const afterQuick = (await readSave(career.slot))?.blob as SaveBlob & Record<string, any>;
const lastArchive = afterQuick.matchReports?.[0];
check('Hızlı maçın sıkıştırılmış gerçek olayları mevcut arşive yazılır', Array.isArray(lastArchive?.events) && lastArchive.events.length > 0 && !('path' in lastArchive));
await mount('stats', afterQuick); await click(buttonText('Lig Analizi'), 'Lig Analizi'); await clickId('archive-highlight-open');
check('Kaydı yeniden açınca arşivde özete erişilir; eksik konum uydurulmaz', !!q('[data-testid="match-highlights"]') && !!q('[data-testid="highlight-no-position"]'));
await act(async () => root.unmount());
console.log(`\n${passed}/${passed + failures.length} geçti`);
if (failures.length) { console.error('Başarısız:', failures.join(', ')); process.exitCode = 1; }
