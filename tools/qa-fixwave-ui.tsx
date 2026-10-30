// HM26 — Fix dalgası UI QA:
//  1) Hub: "Rakip Analizi" yanlış rota (comps) düzeltildi → matchPrep; ölü formArr kaldırıldı,
//     rakip rozeti opponentScout (gerçek lig formu + sıra) ile besleniyor.
//  2) Inbox: maç sonu röportaj mesajı "İlgili Bölüme Git" artık Basın Odası'na (newsroom) gidiyor;
//     diğer yönetim mesajları eskisi gibi kulüp bölümüne (club).
//  3) MatchReport: xG çiftinden türetilen xPTS kartı (yeni kalıcı alan yok).
//  4) Kariyer Profili: basın profili özeti.
import 'fake-indexeddb/auto';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).Element = dom.window.Element;
(globalThis as any).SVGElement = dom.window.SVGElement;
(globalThis as any).getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
dom.window.matchMedia = () => ({ matches: false, media: '', onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } });
Object.defineProperty(globalThis, 'matchMedia', { value: dom.window.matchMedia, configurable: true, writable: true });
(globalThis as any).localStorage = dom.window.localStorage;
(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16) as unknown as number;
(globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
(globalThis as any).performance = dom.window.performance;
if (!dom.window.HTMLCanvasElement.prototype.getContext) {
  dom.window.HTMLCanvasElement.prototype.getContext = (() => ({ fillRect() {}, clearRect() {}, drawImage() {}, getImageData: () => ({ data: [] }), putImageData() {}, createImageData: () => [], setTransform() {}, drawFocusIfNeeded() {}, save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, stroke() {}, fill() {}, arc() {}, translate() {}, scale() {}, rotate() {}, rect() {}, fillText() {}, strokeText() {}, measureText: () => ({ width: 0 }), clip() {}, createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), createPattern: () => ({}), transform() {}, ellipse() {}, isPointInPath: () => false, })) as any;
}
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).Image = dom.window.Image;

import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { GameProvider, useGame } from '../src/store/game';
import { Hub } from '../src/screens/Hub';
import { InboxScreen } from '../src/screens/Inbox';
import { MatchReport } from '../src/screens/MatchReport';
import { PlaceholderScreen } from '../src/screens/Placeholder';
import { buildPostMatchInterview, outcomeOfResult, INTERVIEW_INBOX_TITLE } from '../src/data/interview';
import type { DemoMatchResult, DemoFixture, InboxMsg, Screen } from '../src/types';

const fail: string[] = [];
const ok = (name: string, cond: boolean, detail = '') => { console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); if (!cond) fail.push(name); };
const tick = (ms = 50) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const body = () => dom.window.document.body.textContent ?? '';
const buttons = () => Array.from(dom.window.document.querySelectorAll('button')) as HTMLButtonElement[];
const clickByText = async (patterns: RegExp[]): Promise<boolean> => {
  const btn = buttons().find((b) => !b.disabled && patterns.some((p) => p.test((b.textContent ?? '').trim())));
  if (!btn) return false;
  await act(async () => btn.click());
  await tick(60);
  return true;
};

const career: any = {
  slot: 1,
  manager: { name: 'Test Menajer', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 0 },
  clubId: process.env.HM26_CLUB ?? 'denizli_yesilova', seed: 12345, day: 1, week: 1,
  settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true },
  pending: { marketShortlist: [], activeProject: null },
};

let gRef: any = null;
const Grab: React.FC<{ children?: React.ReactNode }> = ({ children }) => { gRef = useGame(); return <>{children}</>; };
const root = createRoot(dom.window.document.getElementById('root')!);
const render = (el: React.ReactElement) => act(async () => root.render(React.createElement(GameProvider, { career }, React.createElement(Grab, null, el))));

// ——— Kurulum: 3 maç; üçüncüde röportaj; sonuçlardan sonuncusunu sakla ———
await render(React.createElement(React.Fragment));
await tick(60);
let lastResult: DemoMatchResult | null = null;
let lastFixture: DemoFixture | null = null;
const playNext = async (withInterview = false) => {
  const fx = gRef.nextFixture as DemoFixture;
  let guard = 0;
  while (gRef.career.day < fx.day && guard++ < 60) { const r = gRef.advanceDay(); if (r.blocked) throw new Error(r.reason); await tick(5); }
  if (withInterview) {
    void outcomeOfResult;
    const sample = buildPostMatchInterview('win', 'R').options[0];
    lastResult = gRef.playLeagueMatch({ ...fx }, undefined, 0, sample);
  } else {
    lastResult = gRef.playLeagueMatch({ ...fx });
  }
  lastFixture = { ...fx };
  await tick(40);
};
await playNext();
await playNext();
await playNext(true);
ok('Kurulum: 3 maç arşivlendi, röportaj mesajı var', (gRef.matchReports ?? []).length === 3 && gRef.inbox.some((m: InboxMsg) => m.title === INTERVIEW_INBOX_TITLE));

// ——— Bölüm 1: Hub ———
const routes: Screen[] = [];
await render(React.createElement(Hub, { go: (s: Screen) => routes.push(s) }));
await tick(80);
ok('Hub maç kartı rakip rozetini gösteriyor', /Rakip lig formu/.test(body()));
const formMatch = body().match(/Rakip lig formu:\s*([G─BM—]+)/);
ok('Rakip form rozeti dürüst biçimde (G/B/M şeridi veya "—")', !!formMatch && (/^—$/.test(formMatch[1]) || [...formMatch[1].replace(/─/g, '')].every((ch) => ['G', 'B', 'M'].includes(ch))), formMatch?.[1] ?? 'yok');
const rankMatch = body().match(/Lig sırası:\s*(\d+)/);
ok('Lig sırası rozeti (varsa) sayısal değer taşıyor', !rankMatch || Number(rankMatch[1]) >= 1, rankMatch?.[1] ?? 'gizli (rank null — dürüst boşluk)');
ok('Eski ölü "formArr" izi UI metnine sızmıyor', !/formArr/.test(body()));
routes.length = 0;
ok('"Rakip Analizi" butonu bulundu', await clickByText([/Rakip Analizi/]));
ok('"Rakip Analizi" artık matchPrep ekranına gidiyor (eski yanlış: comps)', routes.length > 0 && routes[routes.length - 1] === 'matchPrep', routes.join(','));
routes.length = 0;
ok('"Maç Merkezine Git" butonu bulundu', await clickByText([/Maç Merkezine Git/]));
ok('Maç merkezi butonu da matchPrep\'e gidiyor', routes.length > 0 && routes[routes.length - 1] === 'matchPrep', routes.join(','));

// ——— Bölüm 2: Inbox yönlendirmeleri ———
routes.length = 0;
await render(React.createElement(InboxScreen, { go: (s: Screen) => routes.push(s) }));
await tick(80);
// Röportaj mesaj kartını aç (Card tıklanabilir div; başlığı içeren en yakın kart)
const openCardByTitle = async (title: string) => {
  const cards = Array.from(dom.window.document.querySelectorAll('div')) as HTMLDivElement[];
  const card = cards.find((el) => (el.textContent ?? '').includes(title) && typeof el.onclick !== 'undefined' && el.className && typeof el.className === 'string' && el.className.includes('!p-3'));
  if (!card) return false;
  await act(async () => card.click());
  await tick(60);
  return true;
};
ok('Röportaj mesaj kartı açıldı', await openCardByTitle(INTERVIEW_INBOX_TITLE));
ok('Sheet içinde "İlgili Bölüme Git" butonu var', await clickByText([/İlgili Bölüme Git/]));
ok('Röportaj yönlendirmesi Basın Odası (newsroom)', routes.length > 0 && routes[routes.length - 1] === 'newsroom', routes.join(','));

// Röportaj OLMAYAN sıradan bir yönetim mesajı: eski harita (club) bozulmamalı
routes.length = 0;
const boardMsg: InboxMsg = { id: 'qa-board-1', kind: 'yonetim', title: 'Yönetim kurulu brifingi', body: 'Bütçe gözden geçirilecek.', day: gRef.career.day, read: false };
await act(async () => gRef.setInbox((ms: InboxMsg[]) => [boardMsg, ...ms]));
await tick(40);
ok('Sıradan yönetim mesaj kartı açıldı', await openCardByTitle('Yönetim kurulu brifingi'));
ok('Yönlendirme butonu çalıştı', await clickByText([/İlgili Bölüme Git/]));
ok('Diğer yönetim mesajları kulüp bölümüne (club) gidiyor — regresyon yok', routes.length > 0 && routes[routes.length - 1] === 'club', routes.join(','));
await act(async () => gRef.setInbox((ms: InboxMsg[]) => ms.filter((m) => m.id !== 'qa-board-1')));

// ——— Bölüm 3: MatchReport xPTS kartı ———
ok('Saklanan maç sonucu mevcut', !!lastResult && !!lastFixture);
await render(React.createElement(MatchReport, { result: lastResult, fixture: lastFixture, onDone: () => {} }));
await tick(80);
const xptsCard = dom.window.document.querySelector('[data-testid="xpts-card"]');
ok('xPTS kartı render oldu', !!xptsCard);
if (xptsCard) {
  const cardText = xptsCard.textContent ?? '';
  const xp = Number((cardText.match(/(\d+\.\d+)/) ?? [])[1]);
  ok('xPTS 0–3 aralığında geçerli sayı', Number.isFinite(xp) && xp >= 0 && xp <= 3, String(xp));
  const percents = Array.from(cardText.matchAll(/(\d+)%/g)).map((m) => Number(m[1]));
  ok('Üç sonuç olasılığı (galibiyet/beraberlik/mağlubiyet) yüzde olarak var', percents.length === 3 && percents.every((v) => v >= 0 && v <= 100), percents.join('/'));
  ok('Olasılıklar %100’e yakınsıyor (normalize)', percents.length === 3 && Math.abs(percents[0] + percents[1] + percents[2] - 100) <= 2, `${percents.reduce((a, b) => a + b, 0)}%`);
  ok('Gerçek puan 0/1/3 olarak gösteriliyor', /gerçek puan:\s*[013]/.test(cardText));
  ok('Beklenti yargısı var (üstü/altı/yakın)', /Beklenti (üstü|altı|yakın)/.test(cardText));
}

// ——— Bölüm 4: Kariyer Profili basın profili ———
await render(React.createElement(PlaceholderScreen, { id: 'careerProfile' }));
await tick(80);
const careerPress = dom.window.document.querySelector('[data-testid="career-press-profile"]');
ok('Kariyer profilinde basın profili kartı var', !!careerPress);
if (careerPress) {
  const txt = careerPress.textContent ?? '';
  const total = Number((txt.match(/(\d+)\s*röportajda konuştun/) ?? [])[1]);
  ok('Konuşulan röportaj sayısı doğru (en az 1)', Number.isFinite(total) && total >= 1, String(total));
  ok('Sonuç dağılımı üç kutu (Galibiyet/Beraberlik/Mağlubiyet)', /Galibiyet/.test(txt) && /Beraberlik/.test(txt) && /Mağlubiyet/.test(txt));
  ok('En sık kullanılan ton satırı var', /En sık tercih ettiğin ton/.test(txt));
}

console.log(`\nFIXWAVE-UI: ${fail.length === 0 ? 'PASS' : `FAIL (${fail.length} hata)`}`);
process.exit(fail.length ? 1 : 0);
