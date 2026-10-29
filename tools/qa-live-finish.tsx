// QA: gerçek LiveMatch bileşenini jsdom'da maç sonuna kadar sürer (HM26_CLUB/HM26_SEED/HM26_TARGET_COMP/HM26_FAULT env)
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
import { MatchSession } from '../src/engine/session';
import { matchEventsToDemo } from '../src/engine/adapter';
import { compactMatchEvents, EV_GOAL } from '../src/engine/matchEvents';
import type { MatchResult } from '../src/engine/engine';

let finalEngineResult: MatchResult | null = null;
const originalToResult = MatchSession.prototype.toResult;
MatchSession.prototype.toResult = function observedResult() {
  const result = originalToResult.call(this);
  finalEngineResult = result;
  return result;
};

// Arıza enjeksiyonu: HM26_FAULT=retry|finish → 8. step çağrısında tek seferlik istisna fırlat.
// HM26_HALFTIME_BATCH=trailing|decision: devre düdüğünden sonra aynı adımda başka olay üret.
// HM26_FINAL_BATCH=card: son düdükle aynı adımda bir kartı gösterim partisine ekle.
const faultMode = process.env.HM26_FAULT;
const halftimeBatch = process.env.HM26_HALFTIME_BATCH;
const finalBatch = process.env.HM26_FINAL_BATCH;
let halftimeInjected = false;
let finalInjected = false;
const successfulTalks: string[] = [];
if (faultMode || halftimeBatch || finalBatch) {
  const origStep = MatchSession.prototype.step;
  let calls = 0;
  MatchSession.prototype.step = function patchedStep(...args: any[]) {
    calls += 1;
    if (faultMode && calls >= 8) {
      // fatal modunda bir daha hiç düzelmez; diğer modlarda tek seferlik
      if (faultMode === 'fatal' || calls === 8) throw new Error('ENJEKTE_EDİLMİŞ_ADIM_HATASI');
    }
    const events = origStep.apply(this, args as any);
    if (halftimeBatch && events.some((e) => e.kind === 'half' && e.minute === 45)) {
      halftimeInjected = true;
      events.push({ minute: 45, kind: halftimeBatch === 'decision' ? 'card' : 'info', text: 'QA: düdükten sonraki aynı adım olayı.' });
    }
    if (finalBatch && this.done && !finalInjected) {
      finalInjected = true;
      const whistle = events.findIndex((e) => e.kind === 'half' && e.minute >= 90);
      events.splice(whistle < 0 ? events.length : whistle, 0, { minute: this.getMinute(), kind: 'card', side: 'home', text: 'QA: son adım kartı.' });
    }
    return events;
  };
}
if (halftimeBatch) {
  const origTalk = MatchSession.prototype.applyTeamTalk;
  MatchSession.prototype.applyTeamTalk = function patchedTalk(side, choice) {
    const accepted = origTalk.call(this, side, choice);
    if (accepted) successfulTalks.push(choice);
    return accepted;
  };
}

// PhaserPitch, qa-live-loader.mjs ile jsdom stub'ına yönlendiriliyor
const { LiveMatch } = await import('../src/screens/LiveMatch');

const tick = (ms = 50) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const clickByText = async (patterns: RegExp[]) => {
  const buttons = Array.from(dom.window.document.querySelectorAll('button')) as HTMLButtonElement[];
  for (const btn of buttons) {
    if (btn.disabled) continue; // jsdom'da layout yok; offsetParent kontrolü yapma
    const txt = (btn.textContent ?? '').trim();
    const ariaLabel = btn.getAttribute('aria-label') ?? '';
    if (patterns.some((p) => p.test(txt) || p.test(ariaLabel))) {
      await act(async () => { btn.click(); });
      await tick(60);
      return true;
    }
  }
  return false;
};

function Harness({ done }: { done: (report: string[]) => void }) {
  const g0 = useGame();
  const gRef = React.useRef(g0);
  gRef.current = g0;
  const [fixture, setFixture] = React.useState<any>(null);
  const [phase, setPhase] = React.useState<'prep' | 'live'>('prep');

  React.useEffect(() => {
    void (async () => {
      const log: string[] = [];
      try {
        const g = () => gRef.current;
        const targetComp = process.env.HM26_TARGET_COMP; // örn. 'lig'
        // hedef comp'ten önceki maçları hızlı simüle et, günleri ilerlet
        let f0 = g().nextFixture!;
        let guard2 = 0;
        while (targetComp && f0 && f0.comp !== targetComp && guard2++ < 40) {
          while (g().career.day < f0.day) {
            const res = g().advanceDay();
            if (res.blocked) break;
            await tick(5);
          }
          g().playLeagueMatch({ ...f0 });
          await tick(20);
          f0 = g().nextFixture!;
        }
        const target = g().nextFixture!;
        let guard = 0;
        while (g().career.day < target.day && guard++ < 200) {
          const res = g().advanceDay();
          if (res.blocked) { log.push(`engellendi: ${res.reason}`); break; }
          await tick(5);
        }
        log.push(`Maç günü: day=${g().career.day}, fikstür gün ${target.day} [${target.comp}]`);
        await act(async () => setFixture(g().nextFixture));
        await act(async () => setPhase('live'));

        // Dalga 1: Analiz sekmesi açılınca kümülatif xG grafiği render oluyor mu?
        await clickByText([/Analiz/]);
        await tick(150);
        log.push(/Kümülatif xG/.test(dom.window.document.body.textContent ?? '')
          ? '✅ Analiz sekmesinde kümülatif xG grafiği render oldu'
          : '❌ xG grafiği Analiz sekmesinde bulunamadı');
        await clickByText([/Saha/]);

        // Otomatik karar kapatıcı + maç sonu bekleyici
        if (finalBatch) await clickByText([/Kulübe & Tribün/]);
        await clickByText([/4 kat hız/]);
        const startedAt = Date.now();
        let finished = false;
        let lastClock = '';
        let coachChecked = false;
        let halftimeDialogs = 0;
        let batchDecisionSeen = false;
        while (Date.now() - startedAt < 60000) {
          // arıza kurtarma paneli
          if (/Maç akışı beklenmedik bir sorun/.test(dom.window.document.body.textContent ?? '')) {
            log.push('Kurtarma paneli göründü');
            const recovered = await clickByText(faultMode === 'retry' ? [/Tekrar Dene/] : [/Maçı Güvenli Bitir/]);
            log.push(recovered ? '✅ Kurtarma butonu çalıştı' : '❌ Kurtarma butonu bulunamadı');
            if (faultMode === 'fatal') {
              await tick(150);
              const exited = (dom.window.document.body.textContent ?? '').includes('prep');
              const fx = g().nextFixture!;
              const unplayed = fx.day === target.day && !fx.played;
              log.push(exited ? '✅ Kalıcı hatada ekran güvenle kapatıldı (kilitlenme yok)' : '❌ Ekran kilitlendi');
              log.push(unplayed ? '✅ Fikstür bozulmadan korundu, tekrar oynanabilir' : '❌ Fikstür durumu bozuldu');
              done(log);
              return;
            }
          }
          // Devre olayının, aynı step'te onu izleyen olaylar olsa da bir kez açıldığını
          // gerçek bileşenle sınarken konuşma sırasında saatin durduğunu da doğrula.
          const dialogText = Array.from(dom.window.document.querySelectorAll('[role="dialog"]')).map((el) => el.textContent ?? '').join(' ');
          if (halftimeBatch && /QA: düdükten sonraki aynı adım olayı/.test(dialogText)) batchDecisionSeen = true;
          if (halftimeBatch && /Devre Arası · Soyunma Odası/.test(dialogText)) {
            halftimeDialogs++;
            const before = dom.window.document.querySelector('[role="timer"]')?.textContent;
            await tick(350);
            const after = dom.window.document.querySelector('[role="timer"]')?.textContent;
            log.push(before === after ? '✅ Devre konuşması boyunca maç saati durdu' : '❌ Devre konuşması sırasında maç saati ilerledi');
            const selected = await clickByText([/Sakinleştir/]);
            log.push(selected && successfulTalks.join(',') === 'calm' ? '✅ Devre tercihi motora bir kez uygulandı' : '❌ Devre tercihi uygulanmadı');
          } else {
            // açılan sheet/kararları otomatik kapat (sakatlıkta bekle tercihi)
            await clickByText([/Sessiz kal/, /Dönüşünü bekle/, /Devam Et/, /Kapat$/]);
          }
          const body = dom.window.document.body.textContent ?? '';
          const timer = dom.window.document.querySelector('[role="timer"]')?.textContent ?? '';
          if (timer && timer !== lastClock) { lastClock = timer; log.push('akış: ' + timer.replace(/\s+/g, ' ')); }
          // Dalga 5: antrenör notları (45/75/90) canlı maç akışına düşüyor mu?
          // Kontrol maç sürerken, Spiker sekmesinde yapılır (maç sonrası canlı ekran da incelemeye açık kalır).
          if (!coachChecked) {
            const minute = Number((timer ?? '').trim().split(/[:\n]/)[0]);
            if (Number.isFinite(minute) && minute >= 46) {
              coachChecked = true;
              await clickByText([/^Spiker$/]);
              await tick(150);
              const coachNotes = dom.window.document.querySelectorAll('[data-coach-note]').length;
              const coachText = dom.window.document.querySelector('[data-coach-note]')?.textContent ?? '';
              log.push(coachNotes >= 1 && coachText.includes('TD') ? `✅ Antrenör notu maç akışına düştü (${coachNotes} TD notu render oldu)` : '❌ TD notu akışta görünmedi');
              await clickByText([/^Saha$/]);
              await tick(80);
            }
          }
          if (/Maç Sonu Röportajına Geç/.test(body)) { finished = true; break; }
          await tick(200);
        }
        if (halftimeBatch) {
          log.push(halftimeInjected && halftimeDialogs === 1 && successfulTalks.length === 1
            ? '✅ Aynı adımdaki sonraki olay devre konuşmasını gizlemedi; konuşma yalnız bir kez açıldı'
            : `❌ Devre kontrolü başarısız: enjekte=${halftimeInjected}, pencere=${halftimeDialogs}, tercih=${successfulTalks.length}`);
          if (halftimeBatch === 'decision') log.push(batchDecisionSeen ? '✅ Aynı adımdaki karar da devre konuşmasından önce gösterildi' : '❌ Aynı adımdaki karar gösterilmedi');
        }
        log.push(finished ? '✅ Maç tamamlandı, röportaja geçiş butonu belirdi (otomatik geçiş yok)' : '❌ 60sn içinde maç tamamlanmadı (donmuş olabilir)');
        if (!finished) { done(log); return; }
        if (finalBatch) {
          const scene = dom.window.document.querySelector('[data-testid="live-atmosphere"]');
          log.push(finalInjected && scene?.getAttribute('data-reaction') === 'card' && scene.getAttribute('data-motion') === 'paused' && scene.textContent?.includes('QA: son adım kartı.')
            ? '✅ Son düdükle aynı adımda gelen gerçek olay türü donmuş sahnede korunur'
            : '❌ Son düdükle aynı adımda gelen tepki sahnede kayboldu');
        }

        // Düdük sonrası otomatik geçiş olmamalı: kısa bekleyişte hâlâ canlı ekrandayız
        await tick(400);
        const stayedLive = !/Flash Röportaj/.test(dom.window.document.body.textContent ?? '');
        log.push(stayedLive ? '✅ Bekleyince röportaj kendiliğinden açılmadı, canlı ekran incelemeye açık kaldı' : '❌ Röportaj otomatik açıldı');
        if (faultMode === 'finish') {
          await clickByText([/^Spiker$/]);
          const recoveredFeed = dom.window.document.querySelector('[role="log"][aria-label="Maç olay akışı"]')?.textContent ?? '';
          log.push(recoveredFeed.includes('Maç sona erdi.')
            ? '✅ Güvenli bitiriş sonrası canlı günlük de son düdüğe kadar tamamlandı'
            : '❌ Güvenli bitirişten sonra canlı günlük eksik kaldı');
        }

        // Manuel geçiş: butona basınca röportaj ekranı açılmalı
        await clickByText([/Maç Sonu Röportajına Geç/]);
        await tick(150);
        const interviewOpen = /Flash Röportaj/.test(dom.window.document.body.textContent ?? '');
        log.push(interviewOpen ? '✅ Buton sonrası maç sonu röportajı açıldı' : '❌ Röportaj ekranı açılmadı');

        // Röportaj ekranı: ilk seçeneği işaretle, ardından maç sonu analizi açılmalı
        const interviewOption = dom.window.document.querySelector('[data-testid="interview-option-0"]') as HTMLButtonElement | null;
        log.push(interviewOption ? '✅ Maç sonu röportaj seçenekleri render oldu' : '❌ Röportaj seçeneği bulunamadı');
        if (interviewOption) { await act(async () => interviewOption.click()); await tick(150); }
        const reportOpen = /Sonucu Kaydet — Ana Merkez/.test(dom.window.document.body.textContent ?? '');
        log.push(reportOpen ? '✅ Röportaj sonrası maç raporu açıldı' : '❌ Rapor açılmadı');
        const engineResult = finalEngineResult as MatchResult | null;
        const expectedEvents = matchEventsToDemo(engineResult?.events ?? []);
        const actualGoals = expectedEvents.filter((event) => event.kind === 'goal');
        log.push(engineResult && actualGoals.filter((event) => event.side === 'home').length === engineResult.stats.hg && actualGoals.filter((event) => event.side === 'away').length === engineResult.stats.ag
          ? '✅ Gerçek olay akışındaki goller motor skoruyla tutarlı' : '❌ Olay golleri ve skor uyuşmuyor');
        await clickByText([/^Olaylar$/]);
        const eventRows = dom.window.document.querySelectorAll('[data-testid="match-report-event"]');
        const eventText = dom.window.document.querySelector('[data-testid="match-report-events"]')?.textContent ?? '';
        log.push(expectedEvents.length > 0 && eventRows.length === expectedEvents.length && eventText.includes('Maç sona erdi.')
          ? `✅ Rapor son düdük dahil tüm gerçek olayları gösteriyor (${eventRows.length})` : `❌ Rapor olayları eksik: gösterilen=${eventRows.length}, motor=${expectedEvents.length}`);
        await clickByText([/^Önemli anlar$/]);
        const importantCount = expectedEvents.filter((event) => ['goal', 'card', 'save', 'var', 'sub', 'injury', 'half'].includes(event.kind)).length;
        log.push(dom.window.document.querySelectorAll('[data-testid="match-report-event"]').length === importantCount
          ? '✅ Önemli anlar filtresi gerçek olayları süzüyor' : '❌ Önemli olay filtresi tutarsız');

        await clickByText([/Sonucu Kaydet/]);
        await tick(200);
        const after = g().nextFixture;
        const sameAgain = after && after.day === target.day && after.homeId === target.homeId && after.awayId === target.awayId;
        log.push(`Maç sonrası nextFixture: ${after ? `gün ${after.day} ${after.homeId} vs ${after.awayId} played=${after.played}` : 'yok'}`);
        log.push(sameAgain ? '❌ HATA: aynı maç tekrar oynanabilir durumda!' : '✅ Fikstür ilerledi');
        const archive = g().matchReports.find((entry) => entry.day === target.day && entry.homeId === target.homeId && entry.awayId === target.awayId);
        const expectedArchive = compactMatchEvents(expectedEvents);
        log.push(archive && JSON.stringify(archive.events) === JSON.stringify(expectedArchive)
          ? `✅ Gerçek önemli olaylar arşive doğru sıkıştırıldı (${expectedArchive.length})` : '❌ Arşiv olayları motor akışıyla uyuşmuyor');
        const archiveGoals = archive?.events?.filter((event) => event[1] === EV_GOAL) ?? [];
        log.push(archive && archiveGoals.filter((event) => event[2] === 0).length === archive.hg && archiveGoals.filter((event) => event[2] === 1).length === archive.ag
          ? '✅ Arşiv gol sayısı kaydedilen skorla eşleşiyor' : '❌ Arşiv golleri skorla uyuşmuyor');
        done(log);
      } catch (err) {
        done(['❌ İSTİSNA: ' + ((err as Error).stack ?? err)]);
      }
    })();
  }, []);

  return phase === 'live' && fixture
    ? React.createElement(LiveMatch, { fixture, tacticIdx: 0, onExit: () => setPhase('prep') })
    : React.createElement('div', null, 'prep');
}

const clubId = process.env.HM26_CLUB ?? 'denizli_yesilova';
const seed = Number(process.env.HM26_SEED ?? '12345');
const career: any = {
  slot: 1,
  manager: { name: 'Test Menajer', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 0 },
  clubId, seed, day: 1, week: 1,
  settings: { goalPace: 'yuksek', randomness: 'high', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'yuksek', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true },
  pending: { marketShortlist: [], activeProject: null },
};

const root = createRoot(dom.window.document.getElementById('root')!);
const report = await new Promise<string[]>((resolve) => {
  root.render(React.createElement(GameProvider, { career }, React.createElement(Harness, { done: resolve })));
});
await act(async () => { await new Promise((r) => setTimeout(r, 100)); });
console.log(report.join('\n'));
process.exit(report.some((l) => l.includes('❌')) ? 1 : 0);
