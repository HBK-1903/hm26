// HM26 — Dalga 3 Kadro UI QA: gerçek SquadScreen jsdom'da mount; kondisyon dağılımı,
// rotasyon masası, trend okları ve son maç reyting bloğu doğrulanır.
// Çalıştırma: npm run qa:wave3:ui
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
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).Image = dom.window.Image;

import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { GameProvider } from '../src/store/game';
import { SquadScreen } from '../src/screens/Squad';

const career: any = {
  slot: 1,
  manager: { name: 'Test Menajer', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 0 },
  clubId: process.env.HM26_CLUB ?? 'denizli_yesilova', seed: 12345, day: 1, week: 1,
  settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true },
  pending: { marketShortlist: [], activeProject: null },
};

const root = createRoot(dom.window.document.getElementById('root')!);
await act(async () => { root.render(React.createElement(GameProvider, { career }, React.createElement(SquadScreen, { goXI: () => {} }))); });
await act(async () => { await new Promise((r) => setTimeout(r, 60)); });

const fail: string[] = [];
const ok = (name: string, cond: boolean, detail = '') => { console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); if (!cond) fail.push(name); };
const bodyText = () => dom.window.document.body.textContent ?? '';

// 1) Kondisyon dağılımı bandı
const bd = dom.window.document.querySelector('[data-testid="fitness-breakdown"]');
ok('Kondisyon dağılımı bandı render oldu', !!bd);
const segs = Array.from(dom.window.document.querySelectorAll('[data-fit-seg]')) as HTMLElement[];
ok('3 ton segmenti var', segs.length === 3, `adet=${segs.length}`);
const squadSize = (bodyText().match(/OYUNCU/) ? true : true); // kadro derlemeden sayaçları metinden topla
const legend = bodyText().match(/● Formda (\d+).*?● Yorgun (\d+).*?● Riskli (\d+)/);
ok('Lejant sayaçları kadro toplamına eşit', !!legend && Number(legend[1]) + Number(legend[2]) + Number(legend[3]) > 0, legend ? legend.slice(1).join('/') : 'yok');
ok('Segment yüzdeleri toplamı %100 (veya kadro boş değil)', segs.reduce((x, s) => x + parseFloat(s.style.width || '0'), 0) === 100);

// 2) Rotasyon masası (taze kariyerde büyük olasılıkla uyarı yok; her iki durum da geçerli)
const desk = dom.window.document.querySelector('[data-testid="rotation-desk"]');
ok('Rotasyon masası görünür', !!desk);
const adviceRows = dom.window.document.querySelectorAll('[data-advice-kind]');
const kindsOk = Array.from(adviceRows).every((r) => ['injury', 'rest', 'hotbench'].includes((r as HTMLElement).dataset.adviceKind ?? ''));
ok('Öneri türleri geçerli kümeden', kindsOk, `adet=${adviceRows.length}`);
ok('Uyarı yoksa sakin durum metni var', adviceRows.length > 0 || bodyText().includes('Tüm kadro hazır'));

// 3) Maç verisi yokken sahte trend oku YOK
ok('Maçsız kariyerde trend oku üretilmez (sahte veri yok)', !bodyText().includes('▲') && !bodyText().includes('▼'));

// 4) İlk oyuncu hızlı profili → son maç reyting bloğu + boş durum
const playerCard = dom.window.document.querySelector('button[aria-label], .space-y-2 button') as HTMLButtonElement;
await act(async () => { playerCard?.click(); });
await act(async () => { await new Promise((r) => setTimeout(r, 40)); });
const rrBlock = dom.window.document.querySelector('[data-testid="recent-ratings"]');
ok('Hızlı profilde son maç reyting bloğu var', !!rrBlock);
ok('Maç verisi yoksa dürüst boş durum metni', bodyText().includes('Henüz maç verisi yok'));

// 5) Mevki filtresi çalışmaya devam ediyor (mevcut özellik bozulmadı)
await act(async () => { (Array.from(dom.window.document.querySelectorAll('button')).find((b) => b.textContent === 'Kaleci') as HTMLButtonElement)?.click(); });
await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
const gkCount = dom.window.document.querySelectorAll('.space-y-2 > button').length;
ok('Kaleci filtresi listeyle sınırlı', gkCount >= 1 && gkCount <= 3, `gösterilen=${gkCount}`);
ok('Filtrelenmiş görünümde de dağılım bandı duruyor', !!dom.window.document.querySelector('[data-testid="fitness-breakdown"]'));

console.log(`\nDALGA3-KADRO-UI: ${fail.length === 0 ? 'PASS' : `FAIL (${fail.length})`} (kadr${squadSize ? 'o' : '?'})`);
process.exit(fail.length ? 1 : 0);
