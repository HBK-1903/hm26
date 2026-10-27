// HM26 — Dalga 6 Takım İçgörüleri UI QA: gerçek StatsHub jsdom'da mount; analiz sekmesindeki
// yeni takım kartları, dürüst boş durum ve mevcut sekmelerin korunduğu doğrulanır.
// Çalıştırma: npm run qa:wave6:ui
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
import { StatsHub } from '../src/screens/StatsHub';

const career: any = {
  slot: 1,
  manager: { name: 'Test Menajer', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 0 },
  clubId: process.env.HM26_CLUB ?? 'denizli_yesilova', seed: 12345, day: 1, week: 1,
  settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true },
  pending: { marketShortlist: [], activeProject: null },
};

const root = createRoot(dom.window.document.getElementById('root')!);
await act(async () => { root.render(React.createElement(GameProvider, { career }, React.createElement(StatsHub))); });
await act(async () => { await new Promise((r) => setTimeout(r, 60)); });

const fail: string[] = [];
const ok = (name: string, cond: boolean, detail = '') => { console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); if (!cond) fail.push(name); };
const bodyText = () => dom.window.document.body.textContent ?? '';
const clickTab = async (label: string) => {
  const btn = (Array.from(dom.window.document.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent === label);
  await act(async () => { btn?.click(); });
  await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
};

// 1) Varsayılan Krallıklar sekmesi ve dürüst boş durum bozulmadı
ok('StatsHub açıldı', /İstatistik & Ödüller/.test(bodyText()));
ok('Krallıklar boş durumu korunuyor', /Henüz istatistik birikmedi/.test(bodyText()));

// 2) Analiz sekmesi: yeni takım kartları
await clickTab('Lig Analizi');
ok('Ev/Deplasman kartı render oldu', !!dom.window.document.querySelector('[data-testid="team-split"]'));
ok('Form şeridi kartı render oldu', !!dom.window.document.querySelector('[data-testid="team-form"]'));
ok('Arşiv yokken dürüst boş durum (split)', /ilk maçlardan sonra ev\/deplasman/.test(bodyText()));
ok('Arşiv yokken dürüst boş durum (form)', /Form şeridi oynanan maçlarla dolar/.test(bodyText()));
ok('Sahte performans satırı üretilmedi', !dom.window.document.querySelector('[data-form-dot]'));
ok('Mevcut xPTS ve Fair Play kartları duruyor', /xPTS Adalet Tablosu/.test(bodyText()) && /Fair Play Ligi/.test(bodyText()));

// 3) Diğer sekmeler regresyonu
await clickTab('Karakter');
ok('Karakter sekmesi boş durumu çalışıyor', /Takım karakteri okunamıyor/.test(bodyText()));
await clickTab('Ödüller');
ok('Ödüller sekmesi açılıyor (kupa vitrini)', /Kupa Vitrini/.test(bodyText()));
await clickTab('Krallıklar');
ok('Sekme geçişleri sonrası krallıklar geri geliyor', /Gol Kralı|Henüz istatistik/.test(bodyText()));

console.log(`\nDALGA6-TAKIM-UI: ${fail.length === 0 ? 'PASS' : `FAIL (${fail.length})`}`);
process.exit(fail.length ? 1 : 0);
