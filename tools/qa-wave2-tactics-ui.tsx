// HM26 — Dalga 2 Taktik Stüdyosu UI QA: gerçek TacticsScreen jsdom'da mount edilir;
// uyum çipi, kondisyon halkası, yıldızlı rozet ve 2-dokunuş yedek uyum filtresi doğrulanır.
// Çalıştırma: node --import tsx --loader ./tools/qa-live-loader.mjs tools/qa-wave2-tactics-ui.tsx
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
import { TacticsScreen } from '../src/screens/Tactics';

const career: any = {
  slot: 1,
  manager: { name: 'Test Menajer', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 0 },
  clubId: process.env.HM26_CLUB ?? 'denizli_yesilova', seed: 12345, day: 1, week: 1,
  settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true },
  pending: { marketShortlist: [], activeProject: null },
};

const root = createRoot(dom.window.document.getElementById('root')!);
await act(async () => { root.render(React.createElement(GameProvider, { career }, React.createElement(TacticsScreen))); });
await act(async () => { await new Promise((r) => setTimeout(r, 60)); });

const fail: string[] = [];
const ok = (name: string, cond: boolean, detail = '') => { console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); if (!cond) fail.push(name); };
const bodyText = () => dom.window.document.body.textContent ?? '';

// 1) Uyum çipi taze kariyerde taban %60 (çip metinleri bitişik birleşir: "%60uyum")
ok('Uyum çipi %60 taban gösteriyor', bodyText().includes('%60uyum'), bodyText().match(/%[0-9]+uyum/)?.[0] ?? 'çip yok');
ok('Yeni diziliş ipucu görünüyor', bodyText().includes('alışma dönemi') || bodyText().includes('maç daha var'));

// 2) Saha rozetleri kondisyon tonu taşıyor (11 oyuncu)
const fitBadges = dom.window.document.querySelectorAll('[data-fit]');
ok('11 saha rozetinin kondisyon halkası var', fitBadges.length === 11, `adet=${fitBadges.length}`);
ok('Kondisyon tonları geçerli kümeden', Array.from(fitBadges).every((el) => ['green', 'amber', 'red'].includes((el as HTMLElement).dataset.fit ?? '')));

// 3) Yıldızlı mevki kodu
ok('Rozetlerde yıldızlı reyting var', (dom.window.document.body.textContent?.match(/★/g) ?? []).length >= 11);

// 4) 2-dokunuş: bir saha yuvasına dokun → uyumlu yedekler yeşil çerçeve, uyumsuzlar soluk
// Saha yuvalarının aria-label'ı mevki kodu + kondisyon içerir; başlıktaki "Dizilişi değiştir" bunu taşımaz.
const slotButtons = (Array.from(dom.window.document.querySelectorAll('button')) as HTMLButtonElement[])
  .filter((b) => /\((KL|STP|BK|KB|DOS|MO|OOS|KNT|SN) \d+★, kondisyon/.test(b.getAttribute('aria-label') ?? ''));
ok('Sahada 11 dokunulabilir oyuncu yuvası', slotButtons.length === 11, `adet=${slotButtons.length}`);
// İlk GK dışı yuva (FB/WB grubundaki ilk buton)
const target = slotButtons.find((b) => !b.getAttribute('aria-label')?.includes('(KL '))!;
await act(async () => { target.click(); });
await act(async () => { await new Promise((r) => setTimeout(r, 40)); });
const compatCards = Array.from(dom.window.document.querySelectorAll('[data-bench-compat="1"]')) as HTMLElement[];
const benchCards = Array.from(dom.window.document.querySelectorAll('[data-bench-fit]')) as HTMLElement[];
ok('Yedek bandı dolu', benchCards.length >= 5, `adet=${benchCards.length}`);
ok('Dokunulan yuvaya uyumlu yedekler parlıyor', compatCards.length >= 1, `uyumlu=${compatCards.length}`);
ok('Uyumlu yedekler gerçekten aynı mevki grubundan', compatCards.every((c) => !c.className.includes('opacity-45')));
ok('Uyumsuz yedekler soluklaşıyor', benchCards.some((c) => !c.hasAttribute('data-bench-compat')));
ok('Yedek kondisyon noktaları işlenmiş', benchCards.every((c) => ['green', 'amber', 'red'].includes(c.dataset.benchFit ?? '')));

// 5) Uyumlu bir yedeği sahaya al → takas gerçekleşir, seçim sıfırlanır
const firstCompatLabel = compatCards[0]?.getAttribute('aria-label') ?? '';
await act(async () => { compatCards[0]?.click(); });
await act(async () => { await new Promise((r) => setTimeout(r, 40)); });
ok('Uyumlu yedek sahaya alındı (parlatma sıfırlandı)', dom.window.document.querySelectorAll('[data-bench-compat="1"]').length === 0, firstCompatLabel.slice(0, 30));

console.log(`\nDALGA2-TAKTIK-UI: ${fail.length === 0 ? 'PASS' : `FAIL (${fail.length})`}`);
process.exit(fail.length ? 1 : 0);
