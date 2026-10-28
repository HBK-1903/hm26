// HM26 — Analitik derinlik UI QA (A katmanı): oyuncu tam profil maç günlüğü,
// StatsHub xG trend kartı ve MatchPrep H2H kartı. Tek GameProvider üzerinde
// gerçek store aksiyonlarıyla maçlar işlenir; sahte veri yok, yeni şema alanı yok.
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
import { SquadScreen } from '../src/screens/Squad';
import { StatsHub } from '../src/screens/StatsHub';
import { MatchPrep } from '../src/screens/MatchPrep';
import { playerMatchLog } from '../src/engine/playerInsights';

const fail: string[] = [];
const ok = (name: string, cond: boolean, detail = '') => { console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); if (!cond) fail.push(name); };
const tick = (ms = 50) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const body = () => dom.window.document.body.textContent ?? '';
const buttons = () => Array.from(dom.window.document.querySelectorAll('button')) as HTMLButtonElement[];
const clickByText = async (patterns: RegExp[]) => {
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

// ——— Kurulum: ilk iki hazırlık maçını ve ilk lig maçını gerçek store akışıyla işle ———
await render(React.createElement(React.Fragment));
await tick(60);
const playNext = async () => {
  const fx = gRef.nextFixture;
  let guard = 0;
  while (gRef.career.day < fx.day && guard++ < 60) { const r = gRef.advanceDay(); if (r.blocked) throw new Error(r.reason); await tick(5); }
  gRef.playLeagueMatch({ ...fx });
  await tick(40);
};
await playNext();
await playNext();
ok('İki hazırlık maçı arşive işlendi', (gRef.matchReports ?? []).length === 2);

// Arşivde gerçekten satırı olan bir oyuncu bul (sahte kimlik yok)
const myId = gRef.career.clubId;
const reportedPlayer = gRef.mySquad.find((p: any) => playerMatchLog(p.id, gRef.matchReports, myId, 5).length > 0);
ok('Arşivde satırı olan kadro oyuncusu bulundu', !!reportedPlayer, reportedPlayer?.name ?? '');

// ——— Bölüm 1: Kadro → tam profil → maç günlüğü ———
await render(React.createElement(SquadScreen, { goXI: () => {} }));
await tick(80);
const playerBtn = buttons().find((b) => (b.textContent ?? '').includes(reportedPlayer.name));
ok('Kadro listesinde oyuncu satırı var', !!playerBtn);
await act(async () => playerBtn?.click());
await tick(60);
ok('Hızlı profil sheet’i açıldı', await clickByText([/Tam Profili Aç/]));
await tick(80);
ok('Tam profilde maç günlüğü kartı var', /Son Maçlar · Maç Günlüğü/.test(body()));
const logRows = dom.window.document.querySelectorAll('[data-testid="player-match-row"]');
ok('Maç günlüğü gerçek arşiv satırları gösteriyor', logRows.length >= 2, `adet=${logRows.length}`);
ok('Reyting sparkline SVG’si çizildi', !!dom.window.document.querySelector('[data-testid="player-match-log"] svg'));
ok('Günlük satırlarında lig/kupa etiketi var', /Hazırlık/.test(body()));
const logText = dom.window.document.querySelector('[data-testid="player-match-log"]')?.textContent ?? '';
ok('Günlük özetinde ortalama reyting ve dakika var', /Ort\. Reyting/.test(logText) && /dk/.test(logText));

// ——— Bölüm 2: StatsHub → Lig Analizi → xG trendi (2 maç = grafik var, yargı yok) ———
await render(React.createElement(StatsHub));
await tick(80);
ok('Analiz sekmesi açıldı', await clickByText([/^Lig Analizi$/]), );
await tick(60);
const trendCard = dom.window.document.querySelector('[data-testid="xg-trend-card"]');
ok('xG trend kartı render oldu', !!trendCard);
ok('İki maçla trend çizgisi çizildi (≥2 nokta)', !!trendCard?.querySelector('svg polyline'));
ok('Az veride xG yargısı gösterilmez (sahte içgörü yasağı)', !dom.window.document.querySelector('[data-testid="xg-verdict"]'));
ok('Ev/Deplasman kartı korunuyor (Dalga 6 regresyonu)', !!dom.window.document.querySelector('[data-testid="team-split"]'));
ok('Form şeridi korunuyor (Dalga 6 regresyonu)', !!dom.window.document.querySelector('[data-testid="team-form"]'));

// ——— Bölüm 3: üçüncü maç (lig) → xG yargısı devreye girer ———
await playNext();
ok('Üçüncü maç (lig) işlendi', (gRef.matchReports ?? []).length === 3 && gRef.matchReports[0].comp === 'lig');
await render(React.createElement(StatsHub));
await tick(80);
await clickByText([/^Lig Analizi$/]);
await tick(60);
const verdict = dom.window.document.querySelector('[data-testid="xg-verdict"]');
ok('3+ maçta xG yargısı metni belirdi', !!verdict && (verdict.textContent ?? '').length > 20, (verdict?.textContent ?? '').slice(0, 60));

// ——— Bölüm 4: MatchPrep → H2H kartı (yeni rakip = dürüst boş durum) ———
await render(React.createElement(MatchPrep, { go: () => {} }));
await tick(80);
const h2h = dom.window.document.querySelector('[data-testid="h2h-card"]');
ok('H2H kartı render oldu', !!h2h);
const nextOpp = (() => { const f = gRef.nextFixture; return f.homeId === myId ? f.awayId : f.homeId; })();
const metBefore = gRef.matchReports.some((r: any) => (r.homeId === myId && r.awayId === nextOpp) || (r.homeId === nextOpp && r.awayId === myId));
if (metBefore) {
  ok('H2H dolu durum: maç satırları var', h2h?.querySelectorAll('[data-testid="h2h-meeting"]').length! > 0);
} else {
  ok('H2H boş durum dürüst metin gösteriyor (uydurma geçmiş yok)', /kayıtlı karşılaşma yok/.test(h2h?.textContent ?? ''));
}
ok('H2H kartı mevcut scout kartını bozmadı', /Rakip Scout Raporu/.test(body()));

console.log(`\nANALITIK-UI: ${fail.length === 0 ? 'PASS' : `FAIL (${fail.length} hata)`}`);
process.exit(fail.length ? 1 : 0);
