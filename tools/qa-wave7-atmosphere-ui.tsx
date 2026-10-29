// HM26 — Dalga 7 Atmosfer UI QA: gerçek MatchPrep (atmosfer kartı) ve Newsroom
// (Taraftar sekmesi) jsdom'da mount; gerçek kültür verisi ve dürüst boş durum doğrulanır.
// Çalıştırma: npm run qa:wave7:ui
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

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { GameProvider } from '../src/store/game';
import { MatchPrep } from '../src/screens/MatchPrep';
import { NewsroomScreen } from '../src/screens/Newsroom';

const career: any = {
  slot: 1,
  manager: { name: 'Test Menajer', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 0 },
  clubId: process.env.HM26_CLUB ?? 'denizli_yesilova', seed: 12345, day: 1, week: 1,
  settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true },
  pending: { marketShortlist: [], activeProject: null },
};

const fail: string[] = [];
const ok = (name: string, cond: boolean, detail = '') => { console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); if (!cond) fail.push(name); };

// ——— Bölüm 1: MatchPrep atmosfer kartı ———
{
  const root = createRoot(dom.window.document.getElementById('root')!);
  await act(async () => { root.render(React.createElement(GameProvider, { career }, React.createElement(MatchPrep, { go: () => {} }))); });
  await act(async () => { await new Promise((r) => setTimeout(r, 60)); });
  const bodyText = () => dom.window.document.body.textContent ?? '';

  ok('Maç hazırlığı fikstürle açıldı', /Maç Hazırlığı|Maça Başla|gün kaldı/.test(bodyText()));
  ok('Atmosfer kartı render oldu', /Maç Günü Atmosferi/.test(bodyText()));
  const atmRows = Array.from(dom.window.document.querySelectorAll('[data-atm-tone]')) as HTMLElement[];
  ok('TRIBÜN ve BEKLENTİ satırları geçerli tonlarda', atmRows.length >= 2 && atmRows.every((r) => ['ok', 'info', 'warn', 'danger'].includes(r.dataset.atmTone ?? '')), `adet=${atmRows.length}`);
  ok('Kültür değerleri sayı olarak metne yansıdı (0-100 /100 biçimi)', /\d{1,3}\/100/.test(bodyText()));
  ok('TD Notu kartı korunuyor (Dalga 5 regresyonu)', /Teknik Direktör Notu/.test(bodyText()));
  await act(async () => root.unmount());
}

// ——— Bölüm 2: Newsroom Taraftar sekmesi ———
{
  const root = createRoot(dom.window.document.getElementById('root')!);
  await act(async () => { root.render(React.createElement(GameProvider, { career }, React.createElement(NewsroomScreen))); });
  await act(async () => { await new Promise((r) => setTimeout(r, 60)); });
  const bodyText = () => dom.window.document.body.textContent ?? '';

  ok('Basın odası açıldı', /Saha Defteri/.test(bodyText()));
  const fanTab = (Array.from(dom.window.document.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent === 'Taraftar');
  ok('Taraftar sekmesi mevcut', !!fanTab);
  await act(async () => { fanTab?.click(); });
  await act(async () => { await new Promise((r) => setTimeout(r, 30)); });

  ok('Tribün Masası kartı render oldu', !!dom.window.document.querySelector('[data-testid="fan-pulse"]'));
  ok('Dört kültür göstergesi görünür', /Taraftar güveni/.test(bodyText()) && /Taraftar ısısı/.test(bodyText()) && /Topluluk bağı/.test(bodyText()) && /Disiplin imajı/.test(bodyText()));
  ok('Maçsız kariyerde dürüst trend notu', /Trend yorumu ilk resmî maçların ardından gelecek/.test(bodyText()));
  ok('Ezeli rekabet kartı var (nemesis yoksa dürüst metin)', /Ezeli rekabet/.test(bodyText()));
  ok('Sonuç şeridi boş durumda', /şerit ilk maçla birlikte dolacak/.test(bodyText()));
  ok('Sahte sonuç noktası üretilmedi', !dom.window.document.querySelector('[data-result-strip]'));
  const headlineTab = (Array.from(dom.window.document.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent === 'Manşet');
  await act(async () => headlineTab?.click());
  ok('Mevcut Manşet sekmesi geri dönüyor', !!headlineTab && /Kulüp Basın Odası|Manşet/.test(bodyText()));

  await act(async () => root.unmount());
}

console.log(`\nDALGA7-ATMOSFER-UI: ${fail.length === 0 ? 'PASS' : `FAIL (${fail.length})`}`);
process.exit(fail.length ? 1 : 0);
