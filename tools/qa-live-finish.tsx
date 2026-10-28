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

// Arıza enjeksiyonu: HM26_FAULT=retry|finish → 8. step çağrısında tek seferlik istisna fırlat
const faultMode = process.env.HM26_FAULT;
if (faultMode) {
  const origStep = MatchSession.prototype.step;
  let calls = 0;
  MatchSession.prototype.step = function patchedStep(...args: any[]) {
    calls += 1;
    if (calls >= 8) {
      // fatal modunda bir daha hiç düzelmez; diğer modlarda tek seferlik
      if (faultMode === 'fatal' || calls === 8) throw new Error('ENJEKTE_EDİLMİŞ_ADIM_HATASI');
    }
    return origStep.apply(this, args as any);
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
    if (patterns.some((p) => p.test(txt))) {
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
        await clickByText([/4 kat hız/]);
        const startedAt = Date.now();
        let finished = false;
        let lastClock = '';
        let coachChecked = false;
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
          // açılan sheet/kararları otomatik kapat (sakatlıkta bekle tercihi)
          await clickByText([/Sessiz kal/, /Dönüşünü bekle/, /Devam Et/, /Kapat$/]);
          const body = dom.window.document.body.textContent ?? '';
          const timer = dom.window.document.querySelector('[role="timer"]')?.textContent ?? '';
          if (timer && timer !== lastClock) { lastClock = timer; log.push('akış: ' + timer.replace(/\s+/g, ' ')); }
          // Dalga 5: antrenör notları (45/75/90) canlı maç akışına düşüyor mu?
          // Maç bitimi otomatik röportaja geçtiği için kontrol maç sürerken, Spiker sekmesinde yapılır.
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
          if (/Flash Röportaj/.test(body)) { finished = true; break; }
          await tick(200);
        }
        log.push(finished ? '✅ Maç tamamlandı, maç sonu röportajı otomatik açıldı' : '❌ 60sn içinde maç tamamlanmadı (donmuş olabilir)');
        if (!finished) { done(log); return; }

        // Röportaj ekranı: ilk seçeneği işaretle, ardından maç sonu analizi açılmalı
        const interviewOption = dom.window.document.querySelector('[data-testid="interview-option-0"]') as HTMLButtonElement | null;
        log.push(interviewOption ? '✅ Maç sonu röportaj seçenekleri render oldu' : '❌ Röportaj seçeneği bulunamadı');
        if (interviewOption) { await act(async () => interviewOption.click()); await tick(150); }
        const reportOpen = /Sonucu Kaydet — Ana Merkez/.test(dom.window.document.body.textContent ?? '');
        log.push(reportOpen ? '✅ Röportaj sonrası maç raporu açıldı' : '❌ Rapor açılmadı');

        await clickByText([/Sonucu Kaydet/]);
        await tick(200);
        const after = g().nextFixture;
        const sameAgain = after && after.day === target.day && after.homeId === target.homeId && after.awayId === target.awayId;
        log.push(`Maç sonrası nextFixture: ${after ? `gün ${after.day} ${after.homeId} vs ${after.awayId} played=${after.played}` : 'yok'}`);
        log.push(sameAgain ? '❌ HATA: aynı maç tekrar oynanabilir durumda!' : '✅ Fikstür ilerledi');
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
