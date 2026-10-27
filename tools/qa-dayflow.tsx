// HM26 — Maç sonrası gün akışı regresyon testi (kullanıcı bildirimi: maç → analiz → kaydet → sonraki gün takılması).
// Gerçek AppShell üzerinde oynatılır: canlı maç → maç sonu analizi → "Sonucu Kaydet — Ana Merkez" → Hub → "Sonraki Gün".
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

import React, { useState } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { GameProvider, useGame } from '../src/store/game';
import type { Screen } from '../src/types';
const { AppShell } = await import('../src/screens/Shell');

const tick = (ms = 50) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const body = () => dom.window.document.body.textContent ?? '';
const buttons = () => Array.from(dom.window.document.querySelectorAll('button')) as HTMLButtonElement[];
const findBtn = (patterns: RegExp[], includeDisabled = false) =>
  buttons().filter((b) => includeDisabled || !b.disabled).find((b) => patterns.some((p) => p.test((b.textContent ?? '').trim())));
const click = async (patterns: RegExp[], includeDisabled = false) => {
  const btn = findBtn(patterns, includeDisabled);
  if (!btn) return false;
  await act(async () => btn.click());
  await tick(60);
  return true;
};
// Shell alt çubuk CTA'sı (ok eki ile biter — Hub kartındaki sabit "Maç Merkezine Git" butonundan bu şekilde ayrılır)
const dayBarBtn = () => buttons().find((b) => /(Sonraki Gün|Maç Merkezine Git)\s*→/.test((b.textContent ?? '').trim()));

const checks: string[] = [];
const ok = (cond: boolean, label: string) => checks.push(`${cond ? '✅' : '❌'} ${label}`);

const career: any = {
  slot: 1,
  manager: { name: 'T', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 0 },
  clubId: process.env.HM26_CLUB ?? 'denizli_yesilova', seed: 12345, day: 1, week: 1,
  settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true },
  pending: { marketShortlist: [], activeProject: null },
};

let gRef: any = null;
const Grab: React.FC<{ children?: React.ReactNode }> = ({ children }) => { gRef = useGame(); return <>{children}</>; };
const ShellWrap: React.FC = () => {
  const [pendingScreen, setPendingScreen] = useState<Screen | null>(null);
  return <AppShell pendingScreen={pendingScreen} setPendingScreen={setPendingScreen} />;
};
const root = createRoot(dom.window.document.getElementById('root')!);
await act(async () => root.render(React.createElement(GameProvider, { career }, React.createElement(Grab, null, React.createElement(ShellWrap)))));
await tick(80);

// 1) Maç gününe ilerle
const fixture = gRef.nextFixture;
let guard = 0;
while (gRef.career.day < fixture.day && guard++ < 60) {
  const r = gRef.advanceDay();
  if (r.blocked) { ok(false, `Maç gününe giderken engel çıktı: ${r.reason}`); break; }
  await tick(5);
}
ok(gRef.career.day === fixture.day, `Maç gününe gelindi (gün ${gRef.career.day}, fikstür [${fixture.comp}])`);
ok(/Maç Merkezine Git\s*→/.test(dayBarBtn()?.textContent ?? ''), 'Maç günü alt çubuk CTA\'sı "Maç Merkezine Git →" diyor');

// 2) Maç merkezine git, canlı maçı başlat
await click([/Maç Merkezine Git\s*→/]);
await tick(80);
ok(/Maç Hazırlığı/.test(body()), 'Maç Merkezi açıldı');
ok(await click([/Maça Başla/]), 'Canlı maç başlatıldı');
await tick(120);

// 3) Maçtan erken çıkış: onExit yolu MatchPrep'te bırakmalı (kayıt yok)
ok(await click([/Maçtan çık/]), 'Maçtan erken çıkış butonu çalıştı');
await tick(80);
ok(/Maç Hazırlığı/.test(body()) && !gRef.nextFixture?.played, 'Erken çıkış maç işlemeden Maç Merkezi\'ne döndürdü');
ok(await click([/Maça Başla/]), 'Maç yeniden başlatılabildi');
await tick(120);

// 4) Maçı sonuna oynat (açılan karar/sakatlık sheet\'lerini otomatik kapat)
ok(await click([/^4×$/]), '4× hız açıldı');
let finished = false;
for (let i = 0; i < 400; i++) {
  await click([/Sessiz kal/, /Dönüşünü bekle/, /Devam Et/, /Kapat$/]);
  await tick(150);
  if (/Maç Sonu Analizine Git/.test(body())) { finished = true; break; }
  if (/Maç akışı beklenmedik/.test(body())) { ok(false, 'Maç akışı kurtarma paneline düştü'); break; }
}
ok(finished, 'Maç sona erdi ve analiz butonu belirdi');
ok(await click([/Maç Sonu Analizine Git/]), 'Maç sonu analizi açıldı');
await tick(100);
ok(/Maç Sonu Analizi/.test(body()), 'MatchReport ekranı render oldu');

// 5) Detaylı analiz sekmelerinin tamamı çalışıyor
for (const tab of [/^İstatistik$/, /^Analiz$/, /^Karneler$/, /^Olaylar$/, /^Özet$/]) {
  ok(await click([tab]), `Analiz sekmesi açılıyor: ${tab.source}`);
  await tick(30);
}

// 6) KRİTİK: "Sonucu Kaydet — Ana Merkez" gerçekten Ana Merkez'e götürmeli
const saveDay = gRef.career.day;
ok(await click([/Sonucu Kaydet/]), 'Sonucu Kaydet butonuna basıldı');
await tick(150);
const onHub = /Manşetler · Saha Defteri|Haftalık antrenman/.test(body()) && !/Maç Hazırlığı/.test(body());
ok(onHub, 'Kayıt sonrası ekran ANA MERKEZ (Hub) — MatchPrep dead-end yok');
ok(!!gRef.nextFixture && gRef.nextFixture.day > saveDay, `Fikstür ilerledi (sonraki maç gün ${gRef.nextFixture?.day})`);
ok(!!(gRef.matchReports ?? []).length, 'Maç raporu arşive işlendi');
ok(/Sonraki Gün\s*→/.test(dayBarBtn()?.textContent ?? ''), 'Hub alt çubuk CTA\'sı artık "Sonraki Gün →" diyor');

// 7) Sonraki güne geçiş
const before = gRef.career.day;
ok(await click([/Sonraki Gün\s*→/]), 'Sonraki Gün butonuna basıldı');
await tick(80);
ok(gRef.career.day === before + 1, `Gün ilerledi: ${before} → ${gRef.career.day}`);
const advanceResult = gRef.advanceDay();
ok(!advanceResult.blocked, `Bir sonraki advanceDay engelsiz (${advanceResult.blocked ? advanceResult.reason : 'gün ' + gRef.career.day})`);

console.log(checks.join('\n'));
const failed = checks.filter((c) => c.startsWith('❌')).length;
console.log(`\n${checks.length - failed}/${checks.length} kontrol PASS — ${failed ? failed + ' HATA' : 'gün akışı regresyonu temiz'}`);
process.exit(failed ? 1 : 0);
