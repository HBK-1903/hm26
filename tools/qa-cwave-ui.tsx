// HM26 — C dalgası UI QA (C1+C2+C3): gerçek GameProvider üzerinde
//  C3: fikstür xG'leri (kullanıcı + AI), MatchPrep rakip xG hücresi, StatsHub tam lig xPTS tablosu
//  C2: arşivde sıkıştırılmış olaylar + gol dakika profili kartı
//  C1: sezon istatistik verimliliği kartı
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
import { MatchPrep } from '../src/screens/MatchPrep';
import { StatsHub } from '../src/screens/StatsHub';

const fail: string[] = [];
const ok = (name: string, cond: boolean, detail = '') => { console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); if (!cond) fail.push(name); };
const tick = (ms = 50) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const body = () => dom.window.document.body.textContent ?? '';

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

// ——— Kurulum: 3 maç oyna ———
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
await playNext();

// ——— C3: fikstür xG'leri ———
const playedLeague = gRef.fixtures.filter((f: any) => f.played && f.comp === 'lig');
ok('Oynanmış lig fikstürleri var', playedLeague.length >= 3, `${playedLeague.length} fikstür`);
// Motor xG'si gerçekten 0 olabilir (pozisyonsuz maç); sayısal ve ≥0 olması yeterli
const allWithXg = playedLeague.every((f: any) => typeof f.xgHome === 'number' && typeof f.xgAway === 'number' && Number.isFinite(f.xgHome) && Number.isFinite(f.xgAway) && f.xgHome >= 0 && f.xgAway >= 0);
ok('Tüm oynanmış lig fikstürleri xG taşıyor (kullanıcı + AI)', allWithXg);
// Kullanıcının maçları lig + hazırlık dizilerinde durur; üçü de xG taşımalı
const myPlayed = [
  ...gRef.fixtures.filter((f: any) => f.played && (f.homeId === gRef.career.clubId || f.awayId === gRef.career.clubId)),
  ...gRef.friendlies.filter((f: any) => f.played && (f.homeId === gRef.career.clubId || f.awayId === gRef.career.clubId)),
];
ok('Kullanıcının oynadığı tüm maçlar xG taşıyor (lig + hazırlık)', myPlayed.length === 3 && myPlayed.every((f: any) => typeof f.xgHome === 'number' && typeof f.xgAway === 'number'), `${myPlayed.length} maç`);
const sane = playedLeague.every((f: any) => f.xgHome < 6 && f.xgAway < 6);
ok('xG değerleri makul sınırda (<6)', sane);

// ——— C2: arşiv olayları ———
const reports = gRef.matchReports ?? [];
ok('3 maç raporu arşivlendi', reports.length === 3);
const withEvents = reports.filter((r: any) => Array.isArray(r.events) && r.events.length > 0);
ok('Raporlar sıkıştırılmış olay taşıyor', withEvents.length >= 1, `${withEvents.length}/3 olaylı`);
const codeOk = reports.every((r: any) => (r.events ?? []).every((e: any[]) => typeof e[0] === 'number' && e[0] >= 0 && e[0] <= 120 && [0, 1, 2, 3].includes(e[1]) && [0, 1, 2].includes(e[2])));
ok('Olay tuple şeması geçerli (dakika/tür/taraf kodları)', codeOk);
const goalEvents = reports.flatMap((r: any) => (r.events ?? []).filter((e: any[]) => e[1] === 0));
ok('Gol olayları gerçek skorla tutarlı', goalEvents.length === reports.reduce((n: number, r: any) => n + r.hg + r.ag, 0), `${goalEvents.length} olay vs ${reports.reduce((n: number, r: any) => n + r.hg + r.ag, 0)} gol`);
// C1 istatistik bloğu
const blockOk = reports.every((r: any) => typeof r.poss === 'number' && typeof r.shotsH === 'number' && typeof r.pressH === 'number' && typeof r.centralA === 'number');
ok('C1 istatistik bloğu her raporda tam', blockOk);

// ——— MatchPrep: rakip xG hücresi gerçek değer ———
await render(React.createElement(MatchPrep, { go: () => {} }));
await tick(80);
const xgCell = dom.window.document.querySelector('[data-testid="opp-scout-xg"]');
ok('Rakip xG hücresi render oldu', !!xgCell);
if (xgCell) {
  const txt = xgCell.textContent ?? '';
  ok('Hücrede uydurma "—" yerine gerçek xG/maç var', /\d+\.\d{2}/.test(txt), txt);
}
ok('xG profil notu görünür', /Beklenen gol profili/.test(body()));

// ——— StatsHub: tam lig xPTS + histogram + sezon istatistikleri ———
await render(React.createElement(StatsHub));
await tick(80);
// Analiz sekmesine geç
const analizBtn = Array.from(dom.window.document.querySelectorAll('button')).find((b) => (b.textContent ?? '').includes('Lig Analizi'));
ok('Lig Analizi sekmesi bulundu', !!analizBtn);
if (analizBtn) { await act(async () => (analizBtn as HTMLButtonElement).click()); await tick(60); }

const xptsText = body();
ok('xPTS Adalet Tablosu görünür', /xPTS Adalet Tablosu/.test(xptsText));
const clubsInLeague = (gRef.table[gRef.leagueOf[gRef.career.clubId]] ?? []).length;
const birikenCount = (xptsText.match(/veri birikiyor/g) ?? []).length;
ok('Tam lig xPTS: neredeyse tüm kulüpler kapsanıyor (eski "veri birikiyor" yok)', birikenCount <= 1, `ligde ${clubsInLeague} kulüp, biriken=${birikenCount}`);
const numericXpts = (xptsText.match(/\d+\.\d\s*xPTS/g) ?? []).length;
ok('Sayısal xPTS satırları lig ölçeğinde', numericXpts >= clubsInLeague - 1, `${numericXpts} satır`);

const minuteCard = dom.window.document.querySelector('[data-testid="goal-minute-card"]');
ok('Gol dakika profili kartı render oldu', !!minuteCard);
if (minuteCard) {
  const buckets = minuteCard.querySelectorAll('[data-minute-bucket]');
  ok('6 dakika dilimi var', buckets.length === 6);
  const txt = minuteCard.textContent ?? '';
  ok('Özet metrikleri (% ilk yarı / 76+ / geriden geliş) var', /İlk yarı gol/.test(txt) && /76\+ gol/.test(txt) && /Geriden geliş/.test(txt));
}
const seasonCard = dom.window.document.querySelector('[data-testid="season-match-stats"]');
ok('Sezon istatistik verimliliği kartı render oldu', !!seasonCard);
if (seasonCard) {
  const txt = seasonCard.textContent ?? '';
  ok('Şut isabeti yüzdesi görünüyor', /Şut isabeti/.test(txt) && /%?\d/.test(txt));
  ok('Maç sayısı notu var', /3 maçın motor istatistik/.test(txt), txt.match(/\d+ maçın/)?.[0] ?? 'not yok');
}

console.log(`\nCWAVE-UI: ${fail.length === 0 ? 'PASS' : `FAIL (${fail.length} hata)`}`);
process.exit(fail.length ? 1 : 0);
