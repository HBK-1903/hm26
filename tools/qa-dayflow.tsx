// HM26 — Maç sonu akışı regresyon testi.
// Kapsam: canlı maçta "Maçtan çık" olmaması · maç bitince röportajın yalnız kullanıcı isteğiyle açılması ·
// röportaj seçiminin kültür + inbox etkisi · reddetme yolunun kayıtsız kalması ·
// maç sonu analizi → "Sonucu Kaydet — Ana Merkez" → Hub → "Sonraki Gün" zinciri ·
// röportaj sonrası "Kaydet ve Günü Bitir" kısayolu (kaydet + gün ilerletme + özet sheet).
// Gerçek AppShell üzerinde oynatılır.
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

import React, { useState } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { GameProvider, useGame } from '../src/store/game';
import type { Screen } from '../src/types';
import { applyInterviewEffect, buildPostMatchInterview, outcomeOfResult, INTERVIEW_DECLINE_ID, INTERVIEW_INBOX_TITLE } from '../src/data/interview';
import { clubById } from '../src/data/clubs';
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
const clickTestId = async (testid: string) => {
  const btn = dom.window.document.querySelector(`[data-testid="${testid}"]`) as HTMLButtonElement | null;
  if (!btn) return false;
  await act(async () => btn.click());
  await tick(80);
  return true;
};
// Shell alt çubuk CTA'sı (ok eki ile biter — Hub kartındaki sabit "Maç Merkezine Git" butonundan bu şekilde ayrılır)
const dayBarBtn = () => buttons().find((b) => /(Sonraki Gün|Maç Merkezine Git)\s*→/.test((b.textContent ?? '').trim()));
const clamp100 = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

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

// Bir canlı maçı baştan sona oynatır; röportajda seçim veya reddetme yapar.
// endDay=true ise rapor ekranında "Kaydet ve Günü Bitir" kısayolu kullanılır.
async function playLiveMatch(mode: 'answer' | 'decline', endDay = false) {
  const fixture = gRef.nextFixture;
  // maç gününe ilerle
  let guard = 0;
  while (gRef.career.day < fixture.day && guard++ < 60) {
    const r = gRef.advanceDay();
    if (r.blocked) { ok(false, `Maç gününe giderken engel: ${r.reason}`); return; }
    await tick(5);
  }
  ok(gRef.career.day === fixture.day, `Maç gününe gelindi (gün ${gRef.career.day} [${fixture.comp}])`);
  ok(await click([/Maç Merkezine Git\s*→/]), 'Maç Merkezine gidildi');
  await tick(80);
  ok(/Maç Hazırlığı/.test(body()), 'Maç Merkezi açıldı');
  ok(await click([/Maça Başla/]), 'Canlı maç başlatıldı');
  await tick(120);

  // YENİ KURAL: canlı maç sırasında "Maçtan çık" yok; manuel röportaj geçişini anlatan şerit var
  ok(!findBtn([/Maçtan çık/], true), 'Canlı maçta "Maçtan çık" butonu YOK');
  const liveNotice = dom.window.document.querySelector('footer [aria-live="polite"]')?.textContent ?? '';
  ok(/düdükten sonra.*röportaja.*sen geç/i.test(liveNotice), 'Manuel röportaj geçişi bilgilendirme şeridi görünüyor');

  ok(await click([/^4×$/]), '4× hız açıldı');
  let ctaSeen = false;
  let autoJumped = false;
  for (let i = 0; i < 400; i++) {
    await click([/Sessiz kal/, /Dönüşünü bekle/, /Devam Et/, /Kapat$/]);
    await tick(150);
    if (/Maç Sonu Röportajına Geç/.test(body())) { ctaSeen = true; break; }
    if (/Flash Röportaj/.test(body())) { autoJumped = true; break; }
    if (/Maç akışı beklenmedik/.test(body())) { ok(false, 'Maç akışı kurtarma paneline düştü'); return; }
  }
  ok(ctaSeen, 'Maç bitince röportaja geçiş butonu belirdi');
  ok(!autoJumped, 'Röportaj kendiliğinden açılmadı (kullanıcı tıklaması bekleniyor)');

  // Düdük sonrası bekleyince de otomatik geçiş olmamalı; canlı ekran incelemeye açık kalmalı
  await tick(450);
  ok(!/Flash Röportaj/.test(body()) && /Maç Sonu Röportajına Geç/.test(body()), 'Bekleyince de otomatik geçiş olmadı; canlı ekran açık kaldı');

  // Maç sonrası canlı sekmeler hâlâ incelenebiliyor mu?
  ok(await click([/^Analiz$/]), 'Maç sonrası canlı Analiz sekmesi açıldı');
  await tick(60);
  ok(/Analiz & Şut Haritası/.test(body()), 'Analiz sekmesi içeriği (şut haritası) görüntüleniyor');
  ok(await click([/^Spiker$/]), 'Maç sonrası Spiker sekmesi açıldı');
  await tick(60);
  ok(!!dom.window.document.querySelector('[role="log"]'), 'Spiker maç günlüğü görüntüleniyor');
  ok(await click([/^Saha$/]), 'Saha sekmesine geri dönüldü');

  // Manuel geçiş: butona basınca röportaj açılır
  ok(await click([/Maç Sonu Röportajına Geç/]), 'Röportaja geçiş butonuna basıldı');
  await tick(100);
  ok(/Flash Röportaj/.test(body()), 'Röportaj ekranı buton tıklaması sonrası açıldı');

  if (mode === 'answer') {
    // 3 röportaj seçeneği ve reddetme kontrolü
    const optButtons = [0, 1, 2].map((i) => dom.window.document.querySelector(`[data-testid="interview-option-${i}"]`));
    ok(optButtons.every(Boolean), 'Üç röportaj seçeneği render oldu');
    ok(!!dom.window.document.querySelector(`[data-testid="${INTERVIEW_DECLINE_ID}"]`), 'Röportajı reddetme seçeneği var');
    ok(await clickTestId('interview-option-0'), 'İlk röportaj seçeneği işaretlendi');
  } else {
    ok(await clickTestId(INTERVIEW_DECLINE_ID), 'Röportaj reddedildi');
  }
  await tick(100);
  ok(/Maç Sonu Analizi/.test(body()), 'Maç sonu analizi (MatchReport) açıldı');

  // analiz sekmeleri
  for (const tab of [/^İstatistik$/, /^Analiz$/, /^Karneler$/, /^Olaylar$/, /^Özet$/]) {
    ok(await click([tab]), `Analiz sekmesi açılıyor: ${tab.source}`);
    await tick(30);
  }
  if (endDay) {
    // Yeni kısayol: röportaj sonrası tek dokunuşta kaydet + günü bitir
    const endDayBtn = findBtn([/Kaydet ve Günü Bitir/]);
    ok(!!endDayBtn, 'Rapor ekranında "Kaydet ve Günü Bitir" butonu var');
    const matchDay = gRef.career.day;
    const reportsBefore = (gRef.matchReports ?? []).length;
    ok(await click([/Kaydet ve Günü Bitir/]), 'Kaydet ve Günü Bitir butonuna basıldı');
    await tick(150);
    ok(gRef.career.day === matchDay + 1, `Gün tek dokunuşla ilerledi: ${matchDay} → ${gRef.career.day}`);
    ok((gRef.matchReports ?? []).length === reportsBefore + 1, 'Maç raporu yine de arşive işlendi');
    ok(/Gün Sonu Özeti/.test(body()), 'Gün Sonu Özeti sheet’i açıldı');
    ok(!/Maç Hazırlığı/.test(body()), 'Ekran maç merkezinde kalmadı (Hub’a dönüldü)');
    ok(await click([/^Tamam$/]), 'Özet sheet kapatıldı');
    await tick(60);
    return;
  }
  ok(await click([/Sonucu Kaydet/]), 'Sonucu Kaydet butonuna basıldı');
  await tick(150);
  const onHub = /Manşetler · Saha Defteri|Haftalık antrenman/.test(body()) && !/Maç Hazırlığı/.test(body());
  ok(onHub, 'Kayıt sonrası ekran ANA MERKEZ (Hub)');
  ok(!!(gRef.matchReports ?? []).length, 'Maç raporu arşive işlendi');
}

// ——— 1. MAÇ: röportaja cevap ver ———
const cultureBefore = { ...gRef.career.culture };
const interviewInboxBefore = gRef.inbox.filter((m: any) => m.title === INTERVIEW_INBOX_TITLE).length;
await playLiveMatch('answer');

// Inbox kaydı ve kültür etkisi doğrulaması
const interviewMsg = gRef.inbox.find((m: any) => m.title === INTERVIEW_INBOX_TITLE);
ok(!!interviewMsg && interviewMsg.body.includes('“') && interviewMsg.body.includes(gRef.career.manager.name), 'Röportaj sözü ve menajer adıyla inbox kaydı oluştu');
ok(gRef.inbox.filter((m: any) => m.title === INTERVIEW_INBOX_TITLE).length === interviewInboxBefore + 1, 'Tam bir röportaj inbox mesajı eklendi');

{
  const report = gRef.matchReports[0];
  const mine = report.homeId === gRef.myClub.id ? 'home' : 'away';
  const oppId = mine === 'home' ? report.awayId : report.homeId;
  const outcome = outcomeOfResult(gRef.myClub.id, report.homeId, report.awayId, report.hg, report.ag);
  const option = buildPostMatchInterview(outcome, clubById(oppId).short ?? clubById(oppId).name).options[0];
  const myReds = mine === 'home' ? report.redsHome : report.redsAway;
  const isDerby = (clubById(report.homeId).rivalIds ?? []).includes(report.awayId) || (clubById(report.awayId).rivalIds ?? []).includes(report.homeId);
  // Store sırası: kırmızı kart disiplin cezası → röportaj etkisi (derbi mantığı hazırlık maçında tetiklenmez)
  const afterReds = { ...cultureBefore, discipline: clamp100(cultureBefore.discipline - (myReds ? Math.min(8, myReds * 4) : 0)) };
  const expected = applyInterviewEffect(afterReds, option.effect);
  ok(!isDerby, 'Hazırlık maçı derbi değil (kültür beklentisi saf röportaj etkisi)');
  ok(gRef.career.culture.fanTrust === expected.fanTrust, `fanTrust beklenen değerde (${expected.fanTrust})`);
  ok(gRef.career.culture.discipline === expected.discipline, `discipline beklenen değerde (${expected.discipline})`);
  ok(gRef.career.culture.ultrasHeat === expected.ultrasHeat, `ultrasHeat beklenen değerde (${expected.ultrasHeat})`);
  ok(gRef.career.culture.communityTrust === cultureBefore.communityTrust, 'Röportaj topluluk güvenine dokunmadı');
}

// Hub gün akışı
const saveDay = gRef.career.day;
ok(!!gRef.nextFixture && gRef.nextFixture.day > saveDay, `Fikstür ilerledi (sonraki maç gün ${gRef.nextFixture?.day})`);
ok(/Sonraki Gün\s*→/.test(dayBarBtn()?.textContent ?? ''), 'Hub alt çubuk CTA\'sı "Sonraki Gün →" diyor');
const before = gRef.career.day;
ok(await click([/Sonraki Gün\s*→/]), 'Sonraki Gün butonuna basıldı');
await tick(80);
ok(gRef.career.day === before + 1, `Gün ilerledi: ${before} → ${gRef.career.day}`);

// ——— 2. MAÇ: röportajı reddet ———
const interviewInboxMid = gRef.inbox.filter((m: any) => m.title === INTERVIEW_INBOX_TITLE).length;
const cultureBefore2 = { ...gRef.career.culture };
await playLiveMatch('decline');
ok(gRef.inbox.filter((m: any) => m.title === INTERVIEW_INBOX_TITLE).length === interviewInboxMid, 'Reddetmede yeni röportaj inbox mesajı YOK');
{
  // Reddetme yalnızca röportajı etkisiz kılar; maçın kendi kırmızı kart cezası dışında kültür değişmez
  const report = gRef.matchReports[0];
  const mine = report.homeId === gRef.myClub.id ? 'home' : 'away';
  const myReds = mine === 'home' ? report.redsHome : report.redsAway;
  ok(gRef.career.culture.fanTrust === cultureBefore2.fanTrust && gRef.career.culture.ultrasHeat === cultureBefore2.ultrasHeat, 'Reddetmede fanTrust/ultrasHeat değişmedi');
  ok(gRef.career.culture.discipline === clamp100(cultureBefore2.discipline - (myReds ? Math.min(8, myReds * 4) : 0)), 'Reddetmede discipline yalnızca kart cezası kadar değişti');
  ok(gRef.inbox.some((m: any) => m.title.startsWith('Maç sonucu:')), 'Maç sonucu inbox mesajı yine de oluştu');
}
const before2 = gRef.career.day;
ok(await click([/Sonraki Gün\s*→/]), 'İkinci maç sonrası Sonraki Gün çalıştı');
await tick(80);
ok(gRef.career.day === before2 + 1, `Gün ilerledi: ${before2} → ${gRef.career.day}`);

// ——— 3. MAÇ: röportaj sonrası "Kaydet ve Günü Bitir" kısayolu ———
const reportsBefore3 = (gRef.matchReports ?? []).length;
await playLiveMatch('answer', true);
ok((gRef.matchReports ?? []).length === reportsBefore3 + 1, 'Kısayol maçı arşive işlendi');
ok(/Sonraki Gün\s*→|Maç Merkezine Git\s*→/.test(dayBarBtn()?.textContent ?? ''), 'Kısayol sonrası Hub gün çubuğu normal akışta çalışıyor');

console.log(checks.join('\n'));
const failed = checks.filter((c) => c.startsWith('❌')).length;
console.log(`\n${checks.length - failed}/${checks.length} kontrol PASS — ${failed ? failed + ' HATA' : 'maç sonu akışı regresyonu temiz'}`);
process.exit(failed ? 1 : 0);
