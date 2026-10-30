// Sales, deterministic negotiation, settlement and old-save integration on the real provider.
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
const plays: string[] = [];
class AudioMock {
  src: string; volume = 1; onplaying: (() => void) | null = null; onwaiting = null; onpause = null; onended = null; onerror = null;
  constructor(src: string) { this.src = src; }
  play() { plays.push(this.src); queueMicrotask(() => this.onplaying?.()); return Promise.resolve(); }
  pause() {}
}
(dom.window as any).Audio = AudioMock;

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { GameProvider, useGame } from '../src/store/game';
import { MarketScreen } from '../src/screens/Market';
import { readSave, SAVE_VERSION, type SaveBlob } from '../src/store/persist';
import { mulberry32 } from '../src/data/gen';
import { evaluateIncomingCounter } from '../src/data/saleNegotiation';
import { ALL_TRANSFER_VOICES } from '../src/data/transferVoices';
import { clubById } from '../src/data/clubs';
import type { Career, IncomingOffer, Player } from '../src/types';

const career: Career = {
  slot: 1, manager: { name: 'Test Menajer', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 0 },
  clubId: 'denizli_yesilova', seed: 12345, day: 1, week: 1,
  settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true },
  pending: { marketShortlist: [], activeProject: null },
} as Career;
let g: ReturnType<typeof useGame>;
const Harness = () => { g = useGame(); return <MarketScreen />; };
const root = createRoot(dom.window.document.getElementById('root')!);
let providerKey = 0;
let pass = 0;
const failures: string[] = [];
const check = (name: string, condition: unknown, detail = '') => { if (condition) pass++; else failures.push(name); console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
const q = <T extends HTMLElement = HTMLElement>(selector: string) => dom.window.document.querySelector<T>(selector);
const body = () => dom.window.document.body.textContent ?? '';
const stage = () => q('[data-testid="sale-flow"]')?.getAttribute('data-stage');
const button = (id: string) => q<HTMLButtonElement>(`[data-testid="${id}"]`);
const click = async (element: HTMLButtonElement | null, name: string) => {
  if (!element || element.disabled) throw new Error(`Tıklanamadı: ${name}, aşama=${stage()}, gövde=${body().slice(-700)}`);
  await act(async () => { element.click(); });
};
const clickId = (id: string) => click(button(id), id);
const clickText = (text: string) => click(Array.from(dom.window.document.querySelectorAll('button')).find((item) => (item.textContent ?? '').trim() === text) ?? null, text);
const setCounter = async (value: number) => {
  const el = q<HTMLInputElement>('input[aria-label="Karşı teklif bedeli"]');
  if (!el) throw new Error('Karşı teklif alanı yok');
  await act(async () => { el.value = String(value); Simulate.change(el); });
};
const mount = async (snapshot?: SaveBlob) => {
  providerKey++;
  await act(async () => root.render(<GameProvider key={providerKey} career={career} snapshot={snapshot}><Harness /></GameProvider>));
};
const offer: IncomingOffer = { id: 'qa-sale', playerId: '', fromClubId: 'sakarya_vadi', fee: 2, day: 1, expiresDay: 5, negotiable: true, state: 'open' };

await mount();
await g.saveNow();
const initial = (await readSave(career.slot))?.blob as SaveBlob & Record<string, any>;
if (!initial) throw new Error('Başlangıç kaydı yok');
const originalPlayer = g.mySquad[0];
offer.playerId = originalPlayer.id;
const buyer = clubById(offer.fromClubId);
const snapshot = (gen = 79, paid = true): SaveBlob & Record<string, any> => {
  const s = structuredClone(initial) as SaveBlob & Record<string, any>;
  s.incomingOffers = [{ ...offer }, { ...offer, id: 'qa-second', fromClubId: 'mugla_gokova', fee: 1.8 }];
  s.playerPatch[originalPlayer.id] = { ...(s.playerPatch[originalPlayer.id] ?? {}), ratings: { ...originalPlayer.ratings, gen } };
  s.sellOnClauses = paid ? { [originalPlayer.id]: [{ beneficiaryClubId: 'aydin_efe', pct: 20, signedFee: 1, signedDay: 0 }] } : {};
  return s;
};
const openIncoming = async () => {
  const more = Array.from(dom.window.document.querySelectorAll('button')).find((item) => (item.textContent ?? '').startsWith('Diğer')) ?? null;
  await click(more, 'Diğer');
  const incoming = Array.from(dom.window.document.querySelectorAll('button')).find((item) => (item.textContent ?? '').includes('Gelen Teklifler')) ?? null;
  await click(incoming, 'Gelen Teklifler');
};
const openSale = async () => { await openIncoming(); await clickId('sale-open-qa-sale'); };
const selectTone = async (name: 'calm' | 'witty' | 'firm') => clickId(`sale-reply-${name}`);
const toReview = async () => { await selectTone('calm'); await clickId('sale-original'); await clickId('sale-review'); };

// Existing counter semantics are preserved without tone; tones only change a boundary by five points.
let oldRulePreserved = true, boundedTone = true, deterministic = true;
for (let seed = 1; seed <= 100; seed++) {
  for (const ratio of [1, 1.25, 1.3, 1.55, 1.6, 1.7]) {
    const fee = offer.fee * ratio;
    const expected = fee <= offer.fee * 1.25 || (offer.negotiable && fee <= offer.fee * 1.6 && mulberry32(seed + offer.day * 7 + offer.fee * 100)() < 0.5);
    const base = evaluateIncomingCounter({ seed, offer, fee });
    oldRulePreserved &&= base.accepted === expected;
    for (const tone of ['calm', 'witty', 'firm'] as const) {
      const first = evaluateIncomingCounter({ seed, offer, fee, tone });
      const again = evaluateIncomingCounter({ seed, offer, fee, tone });
      deterministic &&= JSON.stringify(first) === JSON.stringify(again);
      boundedTone &&= Math.abs(first.chance - base.chance) < 0.051;
    }
  }
}
check('Üslupsuz karşı teklif eski deterministik kabul sınırlarını koruyor', oldRulePreserved);
check('Üslup yalnızca sınırda en fazla 5 puan etkiliyor ve tekrar açınca değişmiyor', boundedTone && deterministic);
check('Pazarlığa kapalı alıcı yakın üstü bedeli reddediyor', !evaluateIncomingCounter({ seed: 1, offer: { ...offer, negotiable: false }, fee: 2.6, tone: 'firm' }).accepted);

// Direct offer: cancellation at review leaves all state untouched.
await mount(snapshot());
const startingBudget = g.budget.tb, startingLog = g.transferLog.length;
await openIncoming();
const incomingCard = button('sale-open-qa-sale')?.parentElement?.parentElement;
check('Gelen teklif kartında oyuncunun potansiyeli de görünür', (incomingCard?.textContent ?? '').includes(`POT ${originalPlayer.potential}`));
await clickId('sale-open-qa-sale');
check('Gelen teklif sesli hareketli satış masasında açılıyor; hemen satış yok', stage() === 'offer' && q('[data-testid="transfer-theatre"]')?.getAttribute('data-scene') === 'negotiation' && g.mySquad.some((p) => p.id === originalPlayer.id));
check('Menajer cevap seçmeden teklif ilerlemiyor', !!button('sale-original')?.disabled && !!button('sale-counter')?.disabled);
await selectTone('witty');
const chosenLine = q('[data-testid="sale-reply-witty"] .transfer-reply__label')?.textContent?.replace(/[“”]/g, '');
const spoken = ALL_TRANSFER_VOICES.find((line) => line.src === plays.at(-1));
check('Satışta seçilen cümle, ses dosyası ve altyazı aynı', !!spoken && spoken.text === chosenLine && (q('[data-testid="transfer-subtitle"]')?.textContent ?? '').includes(spoken.text));
check('Risk/fayda ipuçları görünür ve menajer konuşuyor', /küçük kabul şansı/i.test(body()) && /ters tepki/i.test(body()) && q('[data-testid="transfer-theatre"]')?.getAttribute('data-speaking') === 'manager');
await clickId('sale-original');
check('Alıcı yanıtı ayrı aşama; bütçe ve teklif hâlâ değişmedi', stage() === 'response' && g.budget.tb === startingBudget && g.incomingOffers[0].state === 'open');
await clickId('sale-review');
check('Son kontrolde brüt, önceki kulüp payı, net ve bütçe açıkça görülüyor', stage() === 'review' && body().includes('₺2.00M') && body().includes('₺0.40M') && body().includes('₺1.60M') && body().includes('Aydın Efe'));
await clickText('Vazgeç · Teklif Açık Kalsın');
check('Son kontrolden vazgeçmek satış veya ret yapmaz', !q('[data-testid="sale-flow"]') && g.mySquad.some((p) => p.id === originalPlayer.id) && g.budget.tb === startingBudget && g.incomingOffers[0].state === 'open');
await clickId('sale-open-qa-sale');
await toReview();
const confirm = button('sale-confirm');
if (!confirm) throw new Error('Son onay yok');
await act(async () => { confirm.click(); confirm.click(); });
const closed = g.incomingOffers.find((item) => item.id === offer.id);
check('Çift son onay tek satış ve tek bütçe hareketi yapar', g.transferLog.length === startingLog + 1 && g.budget.tb === Math.round((startingBudget + 1.6) * 100) / 100 && closed?.state === 'accepted');
check('Oyuncu alıcı kadrosuna geçer, diğer açık teklif geçersizleşir', !g.mySquad.some((p) => p.id === originalPlayer.id) && g.squads[buyer.id].some((p) => p.id === originalPlayer.id) && g.incomingOffers.find((item) => item.id === 'qa-second')?.state === 'expired');
check('Önceki satış payı yalnız bir kez ödenir ve transfer geçmişine yazılır', g.transferLog[0]?.sellOnPaid === 0.4 && !g.sellOnClauses?.[originalPlayer.id]);
check('79 GEN satış alıcı kulübün basın odasında tanıtılır', stage() === 'signed' && q('[data-testid="sale-complete"]')?.getAttribute('data-reveal-tier') === 'press' && body().includes(buyer.name));
await clickId('sale-announcement');
check('Satış tanıtım anonsu ses ve altyazıyla oynar', plays.at(-1)?.includes('/announcer-') && /Sunucu/.test(q('[data-testid="transfer-subtitle"]')?.textContent ?? ''));
await act(async () => { await g.saveNow(); });
const soldSave = (await readSave(career.slot))?.blob as SaveBlob & Record<string, any>;
check('Satış kaydı sürüm 4; sahne veya üslup için yeni kalıcı alan yok', !!soldSave && soldSave.version === SAVE_VERSION && SAVE_VERSION === 4 && !Object.keys(soldSave).some((key) => /saleFlow|saleStage|dialogueTone|negotiationStage/i.test(key)));
await mount(soldSave);
check('Kaydı yeniden açınca satılan oyuncu, net bütçe ve geçmiş korunur', g.squads[buyer.id].some((p) => p.id === originalPlayer.id) && !g.mySquad.some((p) => p.id === originalPlayer.id) && g.budget.tb === Math.round((startingBudget + 1.6) * 100) / 100 && g.transferLog[0]?.sellOnPaid === 0.4);
let duplicate: ReturnType<typeof g.respondOffer>;
await act(async () => { duplicate = g.respondOffer('qa-second', true); });
check('Eski ikinci teklif satışı tekrarlayamaz', !duplicate!.ok && g.transferLog.length === startingLog + 1);

// Accepted counter needs an additional explicit confirmation.
await mount(snapshot(80, true));
const beforeCounter = g.budget.tb;
check('Önceki kulübün satış payı kayıt yüklenirken korunur', g.sellOnClauses?.[originalPlayer.id]?.[0]?.pct === 20);
await openSale(); await setCounter(2.4); await selectTone('firm'); await clickId('sale-counter');
check('Kabul edilen karşı teklif yalnız ön anlaşmadır', stage() === 'response' && g.budget.tb === beforeCounter && g.incomingOffers[0].state === 'open' && g.mySquad.some((p) => p.id === originalPlayer.id));
await clickId('sale-review'); await clickId('sale-confirm');
check('Onaylanan karşı teklifte pay gerçek bedelden düşülür ve bütçeye net tutar eklenir', g.transferLog[0]?.fee === 2.4 && g.transferLog[0]?.sellOnPaid === 0.48 && g.budget.tb === Math.round((beforeCounter + 1.92) * 100) / 100 && !g.sellOnClauses?.[originalPlayer.id]);
check('80 GEN alıcı kulübün stadyumunda tanıtılır', q('[data-testid="sale-complete"]')?.getAttribute('data-reveal-tier') === 'stadium' && body().includes(buyer.stadium));

// A real counter rejection closes the offer without a transfer.
await mount(snapshot(85, false));
const beforeReject = g.budget.tb;
await openSale(); await setCounter(3.8); await selectTone('calm'); await clickId('sale-counter');
check('Yüksek karşı teklif reddinde teklif kapanır, oyuncu ve bütçe korunur', stage() === 'declined' && g.incomingOffers[0].state === 'rejected' && g.mySquad.some((p) => p.id === originalPlayer.id) && g.budget.tb === beforeReject && /masadan kalktı/i.test(body()));
await clickText('Piyasaya Dön');
check('Reddedilen teklif yeniden satış masasına açılamaz', !button('sale-open-qa-sale'));

// Star threshold and failed audio still permit a confirmed sale.
await mount(snapshot(85, false)); await openSale(); await toReview(); await clickId('sale-confirm');
check('85 GEN için alıcı kulüpte özel yıldız/stadyum tanıtımı var', q('[data-testid="sale-complete"]')?.getAttribute('data-reveal-tier') === 'star' && q('[data-testid="transfer-theatre"]')?.getAttribute('data-scene') === 'star' && body().includes(buyer.stadium));
await clickId('sale-announcement');
check('Yıldız tanıtımında yıldız anonsu kullanılıyor', plays.at(-1)?.endsWith('/announcer-3.mp3'));

// Stale, expired and loaned offers cannot sell a player, even via the store directly.
const stale = snapshot(); stale.playerClub[originalPlayer.id] = 'aydin_efe';
await mount(stale);
let staleResponse: ReturnType<typeof g.respondOffer>;
await act(async () => { staleResponse = g.respondOffer(offer.id, true); });
check('Artık kadroda olmayan oyuncunun açık teklifi güvenle reddedilir', !staleResponse!.ok && g.transferLog.length === 0);
const expired = snapshot(); expired.incomingOffers[0].expiresDay = 0;
await mount(expired);
let expiredResponse: ReturnType<typeof g.respondOffer>;
await act(async () => { expiredResponse = g.respondOffer(offer.id, true); });
check('Süresi dolan teklif finansal işlem yapmaz', !expiredResponse!.ok && g.transferLog.length === 0);
const loaned = snapshot(); loaned.loans = [{ playerId: originalPlayer.id, fromClub: 'aydin_efe', toClub: career.clubId, seasonNo: 1 }];
await mount(loaned);
let loanResponse: ReturnType<typeof g.respondOffer>;
await act(async () => { loanResponse = g.respondOffer(offer.id, true); });
check('Kiralık oyuncu satılamaz', !loanResponse!.ok && /Kiralık/.test(loanResponse!.reason ?? '') && g.transferLog.length === 0);

// Migrated / academy players stored in extraSquads must actually move to the buyer.
const extra = snapshot(79, false);
const academy: Player = { ...originalPlayer, id: 'qa-academy-sale', name: 'Akademi Satış', clubId: career.clubId, wage: 1200 };
const retainedAcademy: Player = { ...originalPlayer, id: 'qa-academy-retained', name: 'Akademi Kalan', clubId: career.clubId, wage: 800 };
extra.extraSquads = { ...(extra.extraSquads as Record<string, Player[]>), [career.clubId]: [academy, retainedAcademy] };
extra.incomingOffers = [{ ...offer, id: 'academy-offer', playerId: academy.id }];
await mount(extra);
let extraResult: ReturnType<typeof g.respondOffer>;
await act(async () => { extraResult = g.respondOffer('academy-offer', true); });
check('Eski kayıt/akademi oyuncusu gerçekten alıcı kulübün kadrosuna taşınır', extraResult!.ok && !g.mySquad.some((p) => p.id === academy.id) && g.squads[buyer.id].some((p) => p.id === academy.id));
await act(async () => { await g.saveNow(); });
const monthly = (await readSave(career.slot))?.blob as SaveBlob & Record<string, any>;
monthly.career.day = 29; monthly.career.week = 5;
for (const fixture of [...monthly.fixtures, ...monthly.friendlies, ...monthly.cup.fixtures]) if (fixture.day === 29) fixture.played = true;
await mount(monthly);
const club = clubById(career.clubId);
const facilities = g.career.clubFacilities ?? club.facilities;
const expectedExpenses = g.mySquad.reduce((sum, p) => sum + (p.wage ?? 0), 0) / 1000
  + Object.values(facilities).reduce((sum, level) => sum + (level ?? 1) * 0.05, 0);
const expectedNet = Math.round((club.strength * 0.02 - expectedExpenses) * 100) / 100;
const expectedBudget = Math.round((g.budget.tb + expectedNet) * 10) / 10;
let advanced: ReturnType<typeof g.advanceDay>;
await act(async () => { advanced = g.advanceDay(); });
const finance = g.inbox.find((item) => item.id === 'fin-30');
check('Aylık maaşta satılan altyapı oyuncusu sayılmaz, kalan oyuncu bir kez sayılır', !advanced!.blocked && g.budget.tb === expectedBudget && (finance?.body ?? '').includes(`₺${expectedExpenses.toFixed(2)}M`));

console.log(`\nSALE-FLOW: ${pass}/${pass + failures.length} geçti`);
if (failures.length) { console.error('Başarısız:', failures.join(', ')); process.exitCode = 1; }
await act(async () => root.unmount());
