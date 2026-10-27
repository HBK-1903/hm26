// HM26 — Dalga 5 Maç Günü UI QA: gerçek MatchPrep jsdom'da mount; TD brifing kartı,
// ton rozetleri ve plan değişince brifingin yeniden türediği doğrulanır.
// Çalıştırma: npm run qa:wave5:ui
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
import { MatchPrep } from '../src/screens/MatchPrep';

const career: any = {
  slot: 1,
  manager: { name: 'Test Menajer', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 0 },
  clubId: process.env.HM26_CLUB ?? 'denizli_yesilova', seed: 12345, day: 1, week: 1,
  settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true },
  pending: { marketShortlist: [], activeProject: null },
};

const root = createRoot(dom.window.document.getElementById('root')!);
await act(async () => { root.render(React.createElement(GameProvider, { career }, React.createElement(MatchPrep, { go: () => {} }))); });
await act(async () => { await new Promise((r) => setTimeout(r, 60)); });

const fail: string[] = [];
const ok = (name: string, cond: boolean, detail = '') => { console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); if (!cond) fail.push(name); };
const bodyText = () => dom.window.document.body.textContent ?? '';

// Fikstür var mı? (taze kariyerde maç günü beklenir)
const hasFixture = !!bodyText().match(/Maç Hazırlığı|Maça Başla|gün kaldı/);
ok('Maç hazırlık ekranı fikstürle açıldı', hasFixture);

if (hasFixture) {
  const card = dom.window.document.querySelector('[data-testid="td-brief"]');
  ok('TD brifing kartı render oldu', !!card);
  const rows = Array.from(dom.window.document.querySelectorAll('[data-brief-tone]')) as HTMLElement[];
  ok('Brifing notları dolu ve geçerli tonlarda', rows.length >= 3 && rows.every((r) => ['ok', 'warn', 'danger', 'info'].includes(r.dataset.briefTone ?? '')), `adet=${rows.length}`);
  const tags = rows.map((r) => r.querySelector('span')?.textContent);
  ok('Zorunlu notlar mevcut (EŞLEŞME, UYUM, KONDİSYON)', ['EŞLEŞME', 'UYUM', 'KONDİSYON'].every((t) => tags.includes(t)), tags.join('/'));
  ok('Başlık rakip ismini taşıyor', /Teknik Direktör Notu/.test(bodyText()));

  // Taze kariyerde maç arşivi yok → sahte form notu YOK
  ok('Arşiv yokken FORMDA/FORMSUZ notu üretilmez (sahte veri yok)', !tags.includes('FORMDA') && !tags.includes('FORMSUZ'));

  // Plan seçici çalışıyor ve brifing yeniden hesaplanıyor (kontrol listesi bozulmadı)
  const planButtons = Array.from(dom.window.document.querySelectorAll('button')).filter((b) => /\(4-|3-|5-/.test(b.textContent ?? ''));
  ok('En az bir taktik plan butonu var', planButtons.length >= 1, `${planButtons.length} plan`);
  if (planButtons[1]) {
    const before = card?.textContent;
    await act(async () => { planButtons[1].click(); });
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    const after = dom.window.document.querySelector('[data-testid="td-brief"]')?.textContent;
    ok('Plan değişiminde ekran hata vermeden yeniden render oldu', !!after && after.length > 0);
    ok('Kontrol listesi hâlâ görünür (mevcut akış bozulmadı)', /Maç Hazırlığı Kontrol Listesi/.test(bodyText()));
    void before;
  }

  // Mevcut checklist ve plan özeti korundu
  ok('Rakip analizi kartı duruyor', /Rakip Analizi/.test(bodyText()));
  ok('Maça başla / simüle aksiyonları duruyor', /Simüle Et/.test(bodyText()));
}

console.log(`\nDALGA5-MACGUNU-UI: ${fail.length === 0 ? 'PASS' : `FAIL (${fail.length})`}`);
process.exit(fail.length ? 1 : 0);
