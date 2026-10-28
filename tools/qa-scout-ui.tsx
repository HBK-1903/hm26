// HM26 — B katmanı UI QA: Newsroom maç haberleri + menajer basın profili,
// MatchPrep gerçek scout kartı (sahte "G─B─M" kaldırıldı) ve risk/rotasyon masası.
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
import { GameProvider, useGame, type DemoMatchResult } from '../src/store/game';
import { NewsroomScreen } from '../src/screens/Newsroom';
import { MatchPrep } from '../src/screens/MatchPrep';
import { PostMatchInterview } from '../src/screens/PostMatchInterview';
import { buildPostMatchInterview, outcomeOfResult, buildPostMatchInterviewWithContext } from '../src/data/interview';
import { detectInterviewContext } from '../src/engine/interviewContext';
import { compactMatchEvents } from '../src/engine/matchEvents';
import { normalizeMyMatches } from '../src/engine/teamInsights';
import { CLUBS } from '../src/data/clubs';
import type { DemoFixture } from '../src/types';

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

// ——— Kurulum: 3 maç işle; üçüncüde gerçek röportaj seçimi gönder ———
await render(React.createElement(React.Fragment));
await tick(60);
const playNext = async (withInterview = false) => {
  const fx = gRef.nextFixture;
  let guard = 0;
  while (gRef.career.day < fx.day && guard++ < 60) { const r = gRef.advanceDay(); if (r.blocked) throw new Error(r.reason); await tick(5); }
  if (withInterview) {
    const outcome = outcomeOfResult; // gerçek sonucu store üretecek; seçeneklerden birini nötr gönder
    void outcome;
    const sample = buildPostMatchInterview('win', 'R').options[0];
    gRef.playLeagueMatch({ ...fx }, undefined, 0, sample);
  } else {
    gRef.playLeagueMatch({ ...fx });
  }
  await tick(40);
};
await playNext();
await playNext();
await playNext(true);
ok('Üç maç arşivlendi, sonuncuda röportaj var', (gRef.matchReports ?? []).length === 3);
ok('Röportaj inbox mesajı oluştu', gRef.inbox.some((m: any) => m.title === 'Maç sonu röportajı'));

// ——— Bölüm 1: Newsroom Manşet ———
await render(React.createElement(NewsroomScreen));
await tick(80);
const press = dom.window.document.querySelector('[data-testid="press-profile"]');
ok('Basın profili kartı render oldu', !!press);
if (press) {
  const total = Number((press.textContent?.match(/(\d+)\s*röportajda konuştu/) ?? [])[1]);
  ok('Basın profili en az 1 röportaj sayıyor', total >= 1, `toplam=${total}`);
  ok('Sonuç dağılımı üç kutu olarak var', /Galibiyet sonrası|Beraberlik sonrası|Mağlubiyet sonrası/.test(press.textContent ?? ''));
}
const newsItems = dom.window.document.querySelectorAll('[data-testid="match-news-item"]');
const validTags = ['derbi', 'farkli', 'temiz', 'xg', 'gollu', 'geri-donus', 'cokus', 'kirmizi', 'var', 'son-dakika', 'sonuc'];
ok('Her oynanmış maç için tam bir haber render oldu (jenerik dahil)', newsItems.length === (gRef.matchReports ?? []).length);
ok('Maç haberleri geçerli etiketlerle render oldu', (() => {
  const tags = Array.from(newsItems).map((el) => (el as HTMLElement).dataset.newsTag);
  return tags.length > 0 && tags.every((t) => t && validTags.includes(t));
})(), Array.from(newsItems).map((el) => (el as HTMLElement).dataset.newsTag).join(','));
ok('Haber detaylarında skor/gerçek sayı var', Array.from(newsItems).every((el) => /\d+–\d+|\d+\.\d/.test(el.textContent ?? '')));
ok('Fikstür manşetleri korundu (regresyon)', /Gün \d+/.test(body()));

// ——— Bölüm 1b: Bağlama duyarlı röportaj ekranı (olay kanıtından tema) ———
{
  const myId: string = gRef.myClub.id;
  const rivalIds: string[] = gRef.myClub.rivalIds ?? [];
  const opp = CLUBS.find((c) => c.id !== myId && !rivalIds.includes(c.id))!;
  const emptyResult = (over: Partial<DemoMatchResult>): DemoMatchResult => ({
    homeId: myId, awayId: opp.id, hg: 1, ag: 0, events: [], xgHome: 1.1, xgAway: 0.9,
    posHome: 50, shotsH: 4, shotsA: 3, shotsOnH: 2, shotsOnA: 1, insights: [],
    cornersH: 0, cornersA: 0, foulsH: 0, foulsA: 0, yellowH: 0, yellowA: 0,
    redH: 0, redA: 0, savesH: 0, savesA: 0, wideH: 0, wideA: 0, centralH: 0, centralA: 0,
    pressWinsH: 0, pressWinsA: 0, shotsLog: [], playerRows: {}, ...over,
  });
  const fixtureOf = (hg: number, ag: number): DemoFixture =>
    ({ round: 1, day: 99, homeId: myId, awayId: opp.id, played: true, hg, ag, comp: 'lig' });

  // Geri dönüş: ilk golü yiyip 2-1 kazanan maç
  let chosen: any = null;
  const comeback = emptyResult({
    hg: 2, ag: 1, xgHome: 1.4, xgAway: 1.1,
    events: [
      { minute: 14, text: 'Deplasman golü', kind: 'goal', side: 'away' },
      { minute: 40, text: 'Beraberlik', kind: 'goal', side: 'home' },
      { minute: 71, text: 'Dönüş golü', kind: 'goal', side: 'home' },
    ],
  });
  await render(React.createElement(PostMatchInterview, { result: comeback, fixture: fixtureOf(2, 1), onChoose: (o: any) => { chosen = o; } }));
  await tick(60);
  ok('Geri dönüş temalı soru ekranda', /pes etmeyip üç puanı/.test(body()));
  ok('Temalı 3 seçenek render oldu', dom.window.document.querySelectorAll('[data-testid^="interview-option-"]').length === 3);
  const opt0 = dom.window.document.querySelector('[data-testid="interview-option-0"]') as HTMLButtonElement;
  await act(async () => opt0.click());
  await tick(40);
  ok('Seçilen seçenek tema önekli id taşıyor', !!chosen && String(chosen.id).startsWith('comeback-'), chosen?.id);

  // Kırmızı kart: olaysız ama redH=1 olan 1-0 galibiyeti → redcard teması
  const red = emptyResult({ redH: 1 });
  await render(React.createElement(PostMatchInterview, { result: red, fixture: fixtureOf(1, 0), onChoose: () => {} }));
  await tick(60);
  ok('Kırmızı kart temalı soru ekranda', /eksik kaldı/.test(body()));

  // Kanıtsız maç: ekran, kamusal bağlam API'sinin ürettiği diyalogla birebir örtüşmeli
  // (seri varsa streak teması, yoksa klasik win diyalogu — ekran da aynı dağıtıcıyı kullanır)
  const plain = emptyResult({});
  const prior = normalizeMyMatches(gRef.matchReports ?? [], myId, gRef.seasonNo).map((m: any) =>
    m.result === 'W' ? 'win' : m.result === 'D' ? 'draw' : 'loss');
  const expectedCtx = detectInterviewContext({
    myClubId: myId, homeId: myId, awayId: opp.id, hg: 1, ag: 0,
    xgHome: 1.1, xgAway: 0.9, redsHome: 0, redsAway: 0,
    isDerby: rivalIds.includes(opp.id), events: compactMatchEvents(plain.events), priorOutcomes: prior,
  });
  const expectedId = buildPostMatchInterviewWithContext(expectedCtx, opp.short ?? opp.name).options[0].id;
  let plainPick: any = null;
  await render(React.createElement(PostMatchInterview, { result: plain, fixture: fixtureOf(1, 0), onChoose: (o: any) => { plainPick = o; } }));
  await tick(60);
  const plainOpt = dom.window.document.querySelector('[data-testid="interview-option-0"]') as HTMLButtonElement;
  await act(async () => plainOpt.click());
  await tick(40);
  ok('Ekran bağlam dağıtıcısıyla aynı diyaloğu üretiyor', plainPick?.id === expectedId, `ekran=${plainPick?.id} beklenen=${expectedId} tema=${expectedCtx.theme}`);
}

// ——— Bölüm 2: MatchPrep scout + risk ———
await render(React.createElement(MatchPrep, { go: () => {} }));
await tick(80);
ok('Yeni scout kartı başlıkta', /Rakip Scout Raporu/.test(body()));
ok('Sahte "Son biçim G─B─M" verisi tamamen kaldırıldı', !/Son biçim|G─B─M/.test(body()));
const scout = dom.window.document.querySelector('[data-testid="opp-scout"]');
ok('Scout gövdesi render oldu', !!scout);
const form = dom.window.document.querySelector('[data-testid="opp-scout-form"]');
if (form) {
  const letters = (form.textContent ?? '').replace(/\s/g, '');
  ok('Form şeridi yalnız G/B/M harflerinden oluşur', [...letters].every((ch) => ['G', 'B', 'M'].includes(ch)) && letters.length <= 5, letters);
} else {
  ok('Rakibin lig maçı yoksa dürüst boş durum metni var', /kayıtlı lig maçı yok/.test(scout?.textContent ?? ''));
}
// C3: fikstürler artık xG taşıyor; rakip xG hücresi gerçek ortalama gösterir (ya da veri yoksa "—")
const xgCell = dom.window.document.querySelector('[data-testid="opp-scout-xg"]');
ok('Rakip xG hücresi var', !!xgCell);
if (xgCell) {
  const txt = xgCell.textContent ?? '';
  ok('Rakip xG gerçek değer veya dürüst "—" gösterir', /\d+\.\d{2}/.test(txt) || /—/.test(txt), txt);
}
const risk = dom.window.document.querySelector('[data-testid="risk-desk"]');
ok('Risk & rotasyon masası render oldu', !!risk && (risk.textContent ?? '').length > 10);
const adviceKinds = Array.from(dom.window.document.querySelectorAll('[data-advice-kind]')).map((el) => (el as HTMLElement).dataset.adviceKind);
ok('Risk uyarıları geçerli türlerde', adviceKinds.every((k) => ['injury', 'rest', 'hotbench'].includes(k ?? '')), adviceKinds.join(','));
ok('H2H kartı hâlâ duruyor (A katmanı regresyonu)', !!dom.window.document.querySelector('[data-testid="h2h-card"]'));

console.log(`\nSCOUT-UI: ${fail.length === 0 ? 'PASS' : `FAIL (${fail.length} hata)`}`);
process.exit(fail.length ? 1 : 0);
