// Transfer görüşmesi: gerçek GameProvider üzerinde etkileşim, kayıt ve sınır kontrolleri.
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
const audioPlays: { src: string; volume: number }[] = [];
const audioInstances: MockAudio[] = [];
let rejectAudio = false;
let deferAudio = false;
class MockAudio {
  src: string; volume = 1;
  onplaying: (() => void) | null = null; onwaiting: (() => void) | null = null; onpause: (() => void) | null = null;
  onended: (() => void) | null = null; onerror: (() => void) | null = null;
  constructor(src: string) { this.src = src; audioInstances.push(this); }
  play() {
    audioPlays.push({ src: this.src, volume: this.volume });
    if (rejectAudio) return Promise.reject(new Error('autoplay blocked'));
    if (!deferAudio) queueMicrotask(() => this.onplaying?.());
    return Promise.resolve();
  }
  pause() { audioPauses++; this.onpause?.(); }
}
let audioPauses = 0;
(dom.window as any).Audio = MockAudio;

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { GameProvider, useGame } from '../src/store/game';
import { deleteSave, readSave, SAVE_VERSION, writeSave, type SaveBlob } from '../src/store/persist';
import { OfferFlow } from '../src/screens/Market';
import { genFreeAgent, playerValue } from '../src/data/gen';
import { clubByIdSafe } from '../src/data/clubs';
import { FOREIGN_QUOTA } from '../src/data/market';
import { inWindow } from '../src/data/calendar';
import { ALL_TRANSFER_VOICES } from '../src/data/transferVoices';
import { audio } from '../src/audio/engine';
import type { Career, Player } from '../src/types';

const failures: string[] = [];
let total = 0;
const check = (name: string, condition: boolean, detail = '') => { total++; console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); if (!condition) failures.push(name); };
const body = () => dom.window.document.body.textContent ?? '';
const q = <T extends HTMLElement = HTMLElement>(selector: string) => dom.window.document.querySelector<T>(selector);
const byId = (id: string) => q<HTMLButtonElement>(`[data-testid="${id}"]`);
const stage = () => q('[data-testid="transfer-flow"]')?.getAttribute('data-stage');
const scene = () => q('[data-testid="transfer-theatre"]')?.getAttribute('data-scene');
const click = async (element: HTMLButtonElement | null, name: string) => {
  if (!element || element.disabled) throw new Error(`Tıklanamadı: ${name}; aşama=${stage()} gövde=${body().slice(-800)}`);
  await act(async () => element.click());
};
const clickId = (id: string) => click(byId(id), id);
const clickText = (text: string) => click(Array.from(dom.window.document.querySelectorAll('button')).find((el) => (el.textContent ?? '').trim() === text) ?? null, text);
const setInput = async (label: string, value: number) => {
  const input = q<HTMLInputElement>(`input[aria-label="${label}"]`);
  if (!input) throw new Error(`Alan bulunamadı: ${label}`);
  await act(async () => { input.value = String(value); Simulate.change(input); });
};
const selectValue = async (label: string, value: string) => {
  const select = q<HTMLSelectElement>(`select[aria-label="${label}"]`);
  if (!select) throw new Error(`Seçim alanı bulunamadı: ${label}`);
  await act(async () => { select.value = value; Simulate.change(select); });
};

const career: Career = {
  slot: 1,
  manager: { name: 'Test Menajer', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 0 },
  clubId: 'denizli_yesilova', seed: 12345, day: 1, week: 1,
  settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true },
  pending: { marketShortlist: [], activeProject: null },
} as Career;
let gRef: ReturnType<typeof useGame>;
let buyCalls = 0;
let done: { ok: boolean; message: string }[] = [];
let homeCalls = 0;
let cancels = 0;
type TestProps = { p?: Player; price?: number; tb?: number; wageHeadroom?: number; inWindow?: boolean; flowKey?: string };
const Harness: React.FC<TestProps> = ({ p, price = 0, tb, wageHeadroom = 100000, inWindow: windowOpen = true, flowKey }) => {
  const g = useGame();
  gRef = g;
  return p ? <OfferFlow key={flowKey} p={p} price={price} tb={tb ?? g.budget.tb} wageHeadroom={wageHeadroom} inWindow={windowOpen}
    buy={(...args) => { buyCalls++; return g.buyPlayer(...args); }} onDone={(ok, message) => done.push({ ok, message })}
    onHome={() => { homeCalls++; }} onCancel={() => { cancels++; }} /> : null;
};
const root = createRoot(dom.window.document.getElementById('root')!);
let providerKey = 0;
const mount = async (props: TestProps, day = 1, resetProvider = false) => {
  if (resetProvider) providerKey++;
  await act(async () => root.render(<GameProvider key={providerKey} career={{ ...career, day }}><Harness {...props} /></GameProvider>));
};
const fresh = async (day = 1) => {
  // A new career requires an actually empty slot, just as the real slot picker does.
  await act(async () => root.render(<></>));
  await deleteSave(career.slot);
  await mount({}, day, true);
  buyCalls = 0; done = []; homeCalls = 0; cancels = 0;
};
const free = (id: string, gen: number, foreign = false): Player => {
  const template = genFreeAgent(831, 'kok', 2, 'FA');
  return { ...template, id: `fa_${id}`, clubId: 'FA', name: `Test ${id}`, foreign, wage: 100, ratings: { ...template.ratings, gen }, kitNumber: undefined };
};
const sellerCandidates = () => Object.values(gRef.squads).flat().filter((p) => p.clubId !== gRef.career.clubId && p.clubId !== 'FA' && !p.foreign && !p.id.startsWith('fa_'));
const valueOf = (p: Player) => playerValue(p, clubByIdSafe(p.clubId)?.league ?? gRef.myLeague);

// Bedelsiz 85 GEN: pencere dışında da yıldız stadyumu; sesli ve sessiz çalışma.
await fresh(100);
check('Kurulum: gün 100 kulüplü transfer penceresi dışında', !inWindow(gRef.career.day));
const star = free('yildiz', 85);
const beforeStarLog = gRef.transferLog.length, beforeStarBudget = gRef.budget.tb;
await mount({ p: star, price: 0, flowKey: 'star' }, 100);
check('Serbest oyuncu için kulüp aşaması atlanabilir, henüz transfer yok', stage() === 'offer' && body().includes('Serbest oyuncu') && gRef.transferLog.length === beforeStarLog);
await clickId('transfer-send-seller');
check('Serbest oyuncu doğrudan sözleşme masasına geçti', stage() === 'player' && scene() === 'negotiation');
await setInput('Aylık maaş teklifi', 100);
deferAudio = true;
await clickId('transfer-reply-player-calm');
const selectedText = q('[data-testid="transfer-reply-player-calm"] .transfer-reply__label')?.textContent?.replace(/[“”]/g, '') ?? '';
const playedLine = ALL_TRANSFER_VOICES.find((line) => line.src === audioPlays.at(-1)?.src);
check('Seçilen replik, oynatılan kaynak ve görünür altyazı eşleşiyor', !!playedLine && playedLine.text === selectedText && (q('[data-testid="transfer-subtitle"]')?.textContent ?? '').includes(playedLine.text));
const theatreSpeaker = () => q('[data-testid="transfer-theatre"]')?.getAttribute('data-speaking');
const activePuppets = () => dom.window.document.querySelectorAll('[data-testid="transfer-theatre"] .transfer-puppet.is-talking').length;
const firstVoice = audioInstances.at(-1)!;
check('Ses yüklenirken yalnız altyazı görünür, karakter henüz konuşmaz', theatreSpeaker() === 'none' && activePuppets() === 0);
await act(async () => firstVoice.onplaying?.());
check('Ses gerçekten başlayınca yalnız menajer konuşur', theatreSpeaker() === 'manager' && activePuppets() === 1 && q('[data-testid="transfer-theatre"] .transfer-puppet--manager')?.getAttribute('data-talking') === 'true');
await act(async () => firstVoice.onwaiting?.());
check('Ara belleğe alma sırasında dudak hareketi durur', theatreSpeaker() === 'none' && activePuppets() === 0);
await act(async () => firstVoice.onplaying?.());
const latePlaying = firstVoice.onplaying, lateEnd = firstVoice.onended;
await clickId('transfer-reply-player-calm');
const replacementVoice = audioInstances.at(-1)!;
await act(async () => { latePlaying?.(); lateEnd?.(); });
check('Önceki repliğin geç gelen olayları yeni repliği başlatmaz veya bitirmez', theatreSpeaker() === 'none' && replacementVoice !== firstVoice);
await act(async () => replacementVoice.onplaying?.());
check('Yeni replik yalnız kendi oynatma olayıyla başlar', theatreSpeaker() === 'manager' && activePuppets() === 1);
await clickId('transfer-send-player');
check('Düşük maaş teklifi oyuncudan ret alıyor, imza yok', stage() === 'player' && /en az ₺/.test(body()) && !byId('transfer-review') && gRef.transferLog.length === beforeStarLog);
const playerVoice = audioInstances.at(-1)!;
await act(async () => playerVoice.onplaying?.());
check('Oyuncu yanıtında doğru yüz konuşur', theatreSpeaker() === 'player' && q('[data-testid="transfer-theatre"] .transfer-puppet--opponent')?.getAttribute('data-talking') === 'true' && activePuppets() === 1);
await act(async () => playerVoice.onpause?.());
check('Dışarıdan duraklatılan ses yüz animasyonunu da durdurur', theatreSpeaker() === 'none');
await act(async () => playerVoice.onplaying?.());
await act(async () => playerVoice.onended?.());
check('Replik bitince yüz tekrar dinlenme durumuna geçer', theatreSpeaker() === 'none' && activePuppets() === 0);
deferAudio = false;
await clickId('transfer-reply-player-witty');
await clickId('transfer-send-player');
const demandAfterWitty = (body().match(/güncel beklentisi ₺(\d+)B/) ?? [])[1];
check('Kullanılan oyuncu üslubunda tekrar indirim ipucu verilmiyor', /Bu üslupta ek indirim kalmadı/.test(byId('transfer-reply-player-witty')?.textContent ?? ''));
await clickId('transfer-reply-player-witty');
await clickId('transfer-send-player');
check('Aynı üslup ve teklif art arda indirim üretmez', demandAfterWitty === (body().match(/güncel beklentisi ₺(\d+)B/) ?? [])[1]);
await setInput('Aylık maaş teklifi', 200);
await clickId('transfer-reply-player-witty');
await clickId('transfer-send-player');
check('Yeterli maaş kabul ediliyor ama kendiliğinden imzalanmıyor', !!byId('transfer-review') && gRef.transferLog.length === beforeStarLog);
await clickId('transfer-review');
check('Son kontrol imzadan önce açık ve bütçe değişmedi', stage() === 'review' && gRef.budget.tb === beforeStarBudget && gRef.transferLog.length === beforeStarLog);
const sign = byId('transfer-sign');
if (!sign) throw new Error('İmza butonu yok');
await act(async () => { sign.click(); sign.click(); });
check('Çift tıklama bir kez imzalar', buyCalls === 1 && gRef.transferLog.length === beforeStarLog + 1, `buy=${buyCalls}, log=${gRef.transferLog.length - beforeStarLog}`);
check('85 GEN bedelsiz oyuncu yıldız stadyumu ve gerçek kulüp/stadyum bilgisiyle tanıtılır', stage() === 'signed' && scene() === 'star' && q('[data-testid="transfer-complete"]')?.getAttribute('data-reveal-tier') === 'star' && body().includes(gRef.myClub.stadium) && body().includes(gRef.myClub.name));
check('İmzalanan bedelsiz oyuncu gerçek kadro, maaş, söz ve geçmişe işlendi', gRef.mySquad.some((x) => x.id === star.id && x.wage === 200) && gRef.transferLog[0]?.fee === 0 && !!gRef.promises?.[star.id] && gRef.budget.tb === beforeStarBudget);
await gRef.saveNow();
const storedStar = await readSave(career.slot);
const savedData = storedStar?.blob as (SaveBlob & Record<string, any>) | undefined;
check('İmza IndexedDB kaydına yazılıyor, sürüm 5 ve yeni sahne alanı yok', !!savedData && savedData.version === SAVE_VERSION && SAVE_VERSION === 5 && savedData.playerClub?.[star.id] === career.clubId && !Object.keys(savedData).some((key) => /transferScene|dialogueTone|negotiationStage/i.test(key)));
await clickId('transfer-announcement');
check('85 GEN anonsu yalnız yıldız bağlamındaki ses ve altyazıyı kullanır', audioPlays.at(-1)?.src.endsWith('/announcer-3.mp3') === true && (q('[data-testid="transfer-subtitle"]')?.textContent ?? '').includes('Yıldız transferimizi'));
await clickText('Ana Merkeze Dön');
check('Tanıtım sonrası önceki ana merkez dönüşü korunuyor', homeCalls === 1 && done.at(-1)?.ok === true);
if (!savedData) throw new Error('Kaydedilmiş kariyer yok');
providerKey++;
await act(async () => root.render(<GameProvider key={providerKey} career={savedData.career} snapshot={savedData}><Harness /></GameProvider>));
check('Kayıt yeniden açılınca oyuncu, sözleşme ve süre sözü korunuyor', gRef.mySquad.some((x) => x.id === star.id && x.wage === 200 && x.contractYears === 3) && !!gRef.promises?.[star.id] && gRef.transferLog[0]?.playerName === star.name);
const legacy = structuredClone(savedData) as SaveBlob & Record<string, any>;
legacy.version = 3;
delete legacy.sellOnClauses; delete legacy.promises; delete legacy.matchReports;
await writeSave(legacy);
const restoredLegacy = await readSave(career.slot);
providerKey++;
await act(async () => root.render(<GameProvider key={providerKey} career={career} snapshot={restoredLegacy!.blob}><Harness /></GameProvider>));
check('Eksik opsiyonel alanlı eski kayıt güvenle açılır; oyuncu korunur', restoredLegacy?.blob.version === SAVE_VERSION && gRef.mySquad.some((x) => x.id === star.id) && Object.keys(gRef.sellOnClauses ?? {}).length === 0);

// Ses kapalı veya tarayıcı oynatmayı reddettiğinde karar ve altyazı çalışır.
await fresh(100);
localStorage.setItem('m26_audio', JSON.stringify({ master: 0, fx: 0.9, crowd: 0, music: 0 }));
audio.setPrefs({ master: 0, fx: 0.9, crowd: 0, music: 0 });
const silent = free('sessiz', 79);
await mount({ p: silent, price: 0, flowKey: 'silent' }, 100);
await clickId('transfer-send-seller');
const audioCount = audioPlays.length;
await clickId('transfer-reply-player-calm');
check('Ana ses kapalıyken ses çalmaz; altyazı ve uyarı görünür', audioPlays.length === audioCount && /Ana ses veya efektler ayarlardan kapalı/.test(body()) && /[“”]/.test(q('[data-testid="transfer-subtitle"]')?.textContent ?? ''));
await clickId('transfer-send-player');
check('Ana ses kapalıyken görüşme ilerler', !!byId('transfer-review'));
localStorage.setItem('m26_audio', JSON.stringify({ master: 0.8, fx: 0.9, crowd: 0, music: 0 }));
audio.setPrefs({ master: 0.8, fx: 0.9, crowd: 0, music: 0 });
await click(q<HTMLButtonElement>('[aria-label="Transfer sesini kapat"]'), 'transfer sesini kapat');
const pausedCount = audioPlays.length;
await click(q<HTMLButtonElement>('[aria-label="Son repliği tekrar dinle"]'), 'sessiz tekrar');
check('Sahnenin sessize alma seçeneği tekrar oynatmada da sesi kapatır', audioPlays.length === pausedCount);
await click(q<HTMLButtonElement>('[aria-label="Transfer sesini aç"]'), 'transfer sesini aç');
await click(q<HTMLButtonElement>('[aria-label="Son repliği tekrar dinle"]'), 'tekrar dinle');
const afterReplayPauses = audioPauses;
await click(q<HTMLButtonElement>('[aria-label="Repliği atla"]'), 'repliği atla');
check('Tekrar dinle/atla, ana ses × efekt düzeyi ve altyazıyla çalışır', audioPlays.length === pausedCount + 1 && Math.abs(audioPlays.at(-1)!.volume - 0.72) < 0.001 && audioPauses > afterReplayPauses && /Oyuncu/.test(q('[data-testid="transfer-subtitle"]')?.textContent ?? ''));
await fresh(100);
const blocked = free('blocked', 80);
await mount({ p: blocked, price: 0, flowKey: 'blocked' }, 100);
await clickId('transfer-send-seller');
rejectAudio = true;
await clickId('transfer-reply-player-calm');
await clickId('transfer-send-player');
rejectAudio = false;
check('Tarayıcı ses oynatımını reddetse de metin ve oyuncu kararı çalışır', !!byId('transfer-review') && /Oyuncu/.test(q('[data-testid="transfer-subtitle"]')?.textContent ?? ''));
await clickId('transfer-review');
await clickId('transfer-sign');
check('80 GEN tanıtımı stadyumda; yok numara uydurulmadı', scene() === 'stadium' && q('[data-testid="transfer-complete"]')?.getAttribute('data-reveal-tier') === 'stadium' && !q('.transfer-theatre__shirt text'));
await clickText('Piyasada Kal');
check('Tanıtım sonrası piyasada kal seçeneği korunuyor', done.at(-1)?.ok === true && homeCalls === 0);

// Gerçek kulüp pazarlığı: karşı teklif, satış payı, ret/yeniden deneme, tek imza.
await fresh(1);
const target = sellerCandidates().map((p) => ({ p, price: valueOf(p) })).filter(({ price }) => price > 0.3 && price * 1.3 < gRef.budget.tb).sort((a, b) => a.price - b.price)[0];
if (!target) throw new Error('Uygun kulüp oyuncusu bulunamadı');
const sellerBudget = gRef.budget.tb, sellerLog = gRef.transferLog.length;
await mount({ p: target.p, price: target.price, flowKey: 'seller' });
check('Kulüplü oyuncuda seçenek seçmeden teklif verilemiyor', !!byId('transfer-send-seller')?.disabled && scene() === 'negotiation');
await setInput('Nakit bonservis teklifi', 0);
await clickText('10%');
await clickId('transfer-reply-seller-witty');
check('Kulüp seçeneği ve risk/fayda ipuçları görünür', byId('transfer-reply-seller-witty')?.getAttribute('aria-pressed') === 'true' && /indirim ihtimali|sabır riski/i.test(body()));
await clickId('transfer-send-seller');
check('Kulüp yanıtı ayrı aşama; transfer henüz yazılmadı', stage() === 'seller' && !!byId('transfer-accept-counter') && gRef.transferLog.length === sellerLog);
await clickId('transfer-accept-counter');
check('Karşı teklif kabulü doğrudan imzalamaz; oyuncuyla ayrı görüşülür', stage() === 'player' && gRef.transferLog.length === sellerLog);
await setInput('Aylık maaş teklifi', Math.ceil(target.p.wage * 2));
await clickId('transfer-reply-player-firm');
await clickId('transfer-send-player');
await clickId('transfer-review');
check('Son kontrolde satış payı ve oyuncu koşulları var', /Sonraki satıştan %10/.test(body()) && body().includes(target.p.name));
const reviewText = body();
const feeMatch = reviewText.match(/Nakit bonservis₺([0-9.]+)M/);
const agreedCash = feeMatch ? Number(feeMatch[1]) : Number.NaN;
await clickId('transfer-sign');
check('Gerçek kulüp transferi ve satış payı store’a işlendi', gRef.mySquad.some((x) => x.id === target.p.id) && gRef.transferLog[0]?.sellOnPct === 10 && gRef.sellOnClauses?.[target.p.id]?.[0]?.pct === 10);
check('İmzalanan bedel ve kalan bütçe hesapla aynı', Number.isFinite(agreedCash) && gRef.transferLog[0]?.fee === agreedCash && gRef.budget.tb === Math.round((sellerBudget - agreedCash) * 10) / 10 && body().includes(`₺${gRef.budget.tb.toFixed(1)}M`), `fee=${agreedCash} budget=${gRef.budget.tb}`);

// Sıfır nakitli oyuncu takası, gerçekte serbest oyuncu olmadığı için bedelsiz etiketlenmez.
await fresh(1);
const swap = [...gRef.mySquad].filter((p) => !p.id.startsWith('fa_')).sort((a, b) => playerValue(b, gRef.myLeague) - playerValue(a, gRef.myLeague))[0];
const swapValue = Math.round(playerValue(swap, gRef.myLeague) * 0.85 * 10) / 10;
const swapTarget = sellerCandidates().map((p) => ({ p, price: valueOf(p) })).filter(({ price }) => price * 1.2 <= swapValue).sort((a, b) => a.price - b.price)[0];
if (!swapTarget) throw new Error('Sıfır nakit takası için aday bulunamadı');
await mount({ p: swapTarget.p, price: swapTarget.price, flowKey: 'swap' });
await selectValue('Takas oyuncusu', swap.id);
await setInput('Nakit bonservis teklifi', 0);
await clickId('transfer-reply-seller-calm');
await clickId('transfer-send-seller');
await clickId('transfer-meet-player');
await setInput('Aylık maaş teklifi', Math.ceil(swapTarget.p.wage * 2));
await clickId('transfer-reply-player-calm');
await clickId('transfer-send-player');
await clickId('transfer-review');
check('Sıfır nakitli takas, serbest/bedelsiz diye etiketlenmez', /Nakit bonservis₺0\.00M/.test(body()) && !/Bedelsiz · ₺0M/.test(body()) && body().includes(swap.name));
await clickId('transfer-sign');
check('Takas edilen oyuncu satıcıya geçti, isim tanıtımda korundu', gRef.playerOf(swap.id)?.clubId === swapTarget.p.clubId && body().includes(`Takas: ${swap.name}`));
check('79 ve altı oyuncu basın tanıtımı alıyor', swapTarget.p.ratings.gen < 80 && scene() === 'press');

// Bütçe, maaş, kota ve kadro sınırları.
await fresh(1);
const limited = sellerCandidates().map((p) => ({ p, price: valueOf(p) })).find(({ price }) => price > 0.3)!;
await mount({ p: limited.p, price: limited.price, tb: 0, inWindow: false, flowKey: 'limits' });
await clickId('transfer-reply-seller-calm');
check('Kapalı pencere / bütçe aşımında kulüplü teklif devre dışı', !!byId('transfer-send-seller')?.disabled && /Pencere kapalı/.test(body()) && /Bütçe aşılıyor/.test(body()));
await mount({ p: free('maas', 70), price: 0, wageHeadroom: 0, flowKey: 'salary' });
await clickId('transfer-send-seller');
await clickId('transfer-reply-player-calm');
check('Maaş bütçesi aşılırsa oyuncu teklifi engellenir', !!byId('transfer-send-player')?.disabled && /Maaş bütçesi aşılıyor/.test(body()));

await fresh(1);
const quota = FOREIGN_QUOTA[gRef.myLeague];
const foreignNeeded = Math.max(0, quota - gRef.mySquad.filter((p) => p.foreign).length);
await act(async () => { for (let i = 0; i < foreignNeeded; i++) gRef.addSquadPlayer({ ...free(`quota-fill-${i}`, 65, true), clubId: gRef.career.clubId }, 0); });
const foreignTarget = free('quota-target', 70, true);
check('Kota testi: yabancı sınırı dolduruldu', gRef.mySquad.filter((p) => p.foreign).length === quota);
await mount({ p: foreignTarget, price: 0, flowKey: 'quota' });
await clickId('transfer-send-seller');
await setInput('Aylık maaş teklifi', 200);
await clickId('transfer-reply-player-calm');
await clickId('transfer-send-player');
await clickId('transfer-review');
check('Kota doluyken imza düğmesi engelli ve gerçek sınır gösteriliyor', !!byId('transfer-sign')?.disabled && /Yabancı kotası dolu/.test(body()));
const quotaResult = gRef.buyPlayer(foreignTarget, 0, 200);
check('Store da yabancı kotasını bağımsız uygular', !quotaResult.ok && /kotası/.test(quotaResult.reason ?? ''));

await fresh(1);
const missing = Math.max(0, 30 - gRef.mySquad.length);
await act(async () => { for (let i = 0; i < missing; i++) gRef.addSquadPlayer({ ...free(`squad-fill-${i}`, 60), clubId: gRef.career.clubId }, 0); });
const fullTarget = free('full-target', 70);
await mount({ p: fullTarget, price: 0, flowKey: 'full' });
await clickId('transfer-send-seller');
await setInput('Aylık maaş teklifi', 200);
await clickId('transfer-reply-player-calm');
await clickId('transfer-send-player');
await clickId('transfer-review');
check('30 kişilik kadro doluyken takassız imza engellenir', gRef.mySquad.length === 30 && !!byId('transfer-sign')?.disabled && /Kadro üst sınırı 30/.test(body()));
const fullResult = gRef.buyPlayer(fullTarget, 0, 200);
check('Store kadro sınırını bağımsız uygular', !fullResult.ok && /Kadro üst sınırı/.test(fullResult.reason ?? ''));

await act(async () => root.unmount());
console.log(`\nTRANSFER-SCENE-UI: ${total - failures.length}/${total}`);
if (failures.length) process.exit(1);
