// QA: gerçek LiveMatch bileşenini jsdom'da maç sonuna kadar sürer (HM26_CLUB/HM26_SEED/HM26_TARGET_COMP/HM26_FAULT env)
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
// HM26_CANCELLED_GOAL=1: çelişkili iptal edilmiş golün canlı sunumunu dene.
const faultMode = process.env.HM26_FAULT;
const halftimeBatch = process.env.HM26_HALFTIME_BATCH;
const finalBatch = process.env.HM26_FINAL_BATCH;
const cancelledGoal = process.env.HM26_CANCELLED_GOAL === '1';
const injuryDecisionTest = process.env.HM26_INJURY_DECISION_TEST === '1';
let injectedInjury: { side: 'home' | 'away'; playerId: string } | null = null;
let injuryPhase: 'none' | 'injured' | 'waiting' | 'returned' = 'none';
let injuryWaitCalls = 0, allowInjuryReturn = false, injuryReturned = false;
if (injuryDecisionTest) {
  const originalSlots = MatchSession.prototype.getSlots;
  MatchSession.prototype.getSlots = function injuryTestSlots(side) {
    const slots = originalSlots.call(this, side);
    return slots.map((slot) => injectedInjury?.side === side && slot.player.id === injectedInjury.playerId
      ? { ...slot, injured: injuryPhase === 'injured' || injuryPhase === 'waiting' }
      : slot);
  };
  MatchSession.prototype.waitForInjuredPlayer = function injuryTestWait(playerId) {
    if (injectedInjury?.playerId !== playerId || injuryPhase !== 'injured') return false;
    injuryWaitCalls++;
    injuryPhase = 'waiting';
    return true;
  };
}
let halftimeInjected = false;
let finalInjected = false;
let cancelledInjected = false;
let cancelledChecked = false;
const cancelledAudio: string[] = [];
const successfulTalks: string[] = [];
if (cancelledGoal) {
  const { audio } = await import('../src/audio/engine');
  const play = audio.play.bind(audio);
  audio.play = (kind) => {
    if (cancelledInjected && !cancelledChecked) cancelledAudio.push(kind);
    return play(kind);
  };
}
if (faultMode || halftimeBatch || finalBatch || cancelledGoal || injuryDecisionTest) {
  const origStep = MatchSession.prototype.step;
  let calls = 0;
  MatchSession.prototype.step = function patchedStep(...args: any[]) {
    calls += 1;
    if (faultMode && calls >= 8) {
      // fatal modunda bir daha hiç düzelmez; diğer modlarda tek seferlik
      if (faultMode === 'fatal' || calls === 8) throw new Error('ENJEKTE_EDİLMİŞ_ADIM_HATASI');
    }
    const events = origStep.apply(this, args as any);
    if (injuryDecisionTest && !injectedInjury && calls === 5) {
      const side = this.getSimulationInput().userSide ?? 'home';
      const slot = this.getSlots(side).find((candidate) => candidate.slotGroup !== 'GK');
      if (!slot) throw new Error('QA injury fixture needs an outfield player');
      injectedInjury = { side, playerId: slot.player.id };
      injuryPhase = 'injured';
      events.push({ minute: this.getMinute(), kind: 'injury', side, playerId: slot.player.id, text: 'QA: sakatlık için karar gerekli.' });
    } else if (injuryDecisionTest && injectedInjury && injuryPhase === 'waiting' && allowInjuryReturn) {
      injuryPhase = 'returned';
      injuryReturned = true;
      events.push({ minute: this.getMinute(), kind: 'injury', side: injectedInjury.side, playerId: injectedInjury.playerId, text: 'QA: oyuncu tedavi sonrası oyuna döndü.' });
    }
    if (cancelledGoal && !cancelledInjected && calls === 5) {
      cancelledInjected = true;
      events.push({ minute: this.getMinute(), kind: 'goal', side: 'home', text: 'QA: GOL İPTAL' });
    }
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
        if (injuryDecisionTest) {
          const deadline = Date.now() + 12000;
          while (Date.now() < deadline) {
            const dialogs = Array.from(dom.window.document.querySelectorAll('[role="dialog"]'));
            const injected = dialogs.find((dialog) => dialog.textContent?.includes('QA: sakatlık için karar gerekli.'));
            if (injected) {
              const selected = await clickByText([/Dönüşünü bekle/]);
              await tick(150);
              const repeated = Array.from(dom.window.document.querySelectorAll('[role="dialog"]')).some((dialog) => dialog.textContent?.includes('Tedavi kararı: iki maç dakikası'));
              log.push(selected && injuryWaitCalls === 1 && !repeated
                ? '✅ Tedaviyi bekleme seçimi motorca bir kez alındı ve aynı karar açılmadı'
                : `❌ Tedavi kararı tekrar açıldı veya motor isteği yanlış: selected=${selected} calls=${injuryWaitCalls} repeated=${repeated}`);
              if (repeated) { done(log); return; }
              allowInjuryReturn = true;
              while (!injuryReturned && Date.now() < deadline) await tick(80);
              await tick(150);
              const returnDialog = Array.from(dom.window.document.querySelectorAll('[role="dialog"]')).some((dialog) => dialog.textContent?.includes('QA: oyuncu tedavi sonrası oyuna döndü.'));
              await clickByText([/^Spiker$/]);
              const feed = dom.window.document.querySelector('[role="log"][aria-label="Maç olay akışı"]')?.textContent ?? '';
              log.push(injuryReturned && !returnDialog && feed.includes('Tedavi kararı: iki maç dakikası') && feed.includes('QA: oyuncu tedavi sonrası oyuna döndü.')
                ? '✅ Tedavi ve sahaya dönüş akışta kalır, dönüş yeni bir sakatlık kararı açmaz'
                : `❌ Dönüş akışı veya karar durumu yanlış: returned=${injuryReturned} dialog=${returnDialog} feed=${feed}`);
              done(log);
              return;
            }
            if (dialogs.length) await clickByText([/Sessiz kal/, /Dönüşünü bekle/, /Devam Et/, /Kapat$/]);
            await tick(80);
          }
          done([...log, '❌ Enjekte edilen sakatlık kararı zamanında açılmadı']);
          return;
        }
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
          if (cancelledGoal && !cancelledChecked && dialogText.includes('QA: GOL İPTAL')) {
            const pitchKind = dom.window.document.querySelector('[aria-label="pitch-stub"]')?.getAttribute('data-event-kind');
            const falseGoalBanner = Array.from(dom.window.document.querySelectorAll('[role="status"]')).some((el) => el.textContent?.includes('QA: GOL İPTAL'));
            const handled = dialogText.includes('VAR İncelemesi') && pitchKind === 'var' && !falseGoalBanner && cancelledAudio.includes('var') && !cancelledAudio.includes('goal');
            log.push(handled ? '✅ İptal gol canlı sahada ve seslerde VAR kararıdır; gol kutlaması açılmaz' : `❌ İptal gol yanlış sunuldu: saha=${pitchKind}, ses=${cancelledAudio.join(',')}, sahte-banner=${falseGoalBanner}`);
            cancelledChecked = true;
          }
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
        if (cancelledGoal && (!cancelledInjected || !cancelledChecked)) log.push('❌ İptal gol sınaması canlı ekranda görünmedi');
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

        // Röportajda önce cevap sahnede kalır; analiz yalnız devam düğmesiyle açılır.
        const interviewOption = dom.window.document.querySelector('[data-testid="interview-option-0"]') as HTMLButtonElement | null;
        log.push(interviewOption ? '✅ Maç sonu röportaj seçenekleri render oldu' : '❌ Röportaj seçeneği bulunamadı');
        if (interviewOption) { await act(async () => interviewOption.click()); await tick(150); }
        const answerVisible = !!dom.window.document.querySelector('[data-testid="interview-answer"]') && !/Sonucu Kaydet — Ana Merkez/.test(dom.window.document.body.textContent ?? '');
        log.push(answerVisible ? '✅ Röportaj cevabı sahnede bekler, analiz otomatik açılmaz' : '❌ Röportaj cevabı beklemedi');
        const continueInterview = dom.window.document.querySelector('[data-testid="interview-continue"]') as HTMLButtonElement | null;
        if (continueInterview) { await act(async () => continueInterview.click()); await tick(150); }
        const reportOpen = /Sonucu Kaydet — Ana Merkez/.test(dom.window.document.body.textContent ?? '');
        log.push(reportOpen ? '✅ Röportaj sonrası maç raporu açıldı' : '❌ Rapor açılmadı');
        const engineResult = finalEngineResult as MatchResult | null;
        // Tören, gerçek canlı maç motorunun oyuncu satırlarından mevcut rapor sırasını kullanır.
        const realAward = Object.entries(engineResult?.stats.playerRows ?? {}).filter(([id]) => !!g().clubOfPlayer(id))
          .sort((a, b) => b[1].rating - a[1].rating || b[1].g - a[1].g || b[1].a - a[1].a || b[1].shots - a[1].shots || a[0].localeCompare(b[0]))[0];
        const { audio: liveAudio } = await import('../src/audio/engine');
        const priorPrefs = liveAudio.getPrefs();
        liveAudio.setPrefs({ master: 0 }); // jsdom medya oynatmaz; gerçek ses ayrı browser testinde doğrulanır.
        const awardButton = dom.window.document.querySelector('[data-testid="open-match-award"]') as HTMLButtonElement | null;
        if (awardButton) { await act(async () => awardButton.click()); await tick(80); }
        const awardScene = dom.window.document.querySelector('[data-testid="match-award"]');
        const awardCorrect = !!realAward && awardScene?.getAttribute('data-player-id') === realAward[0]
          && !!awardScene.textContent?.includes(realAward[1].rating.toFixed(2))
          && !!awardScene.textContent?.includes(g().playerOf(realAward[0])?.name ?? 'Oyuncu bilgisi yok');
        log.push(awardCorrect ? '✅ Canlı maç ödül töreni gerçek oyuncu ve motor puanını gösterdi' : '❌ Canlı maç ödül oyuncusu veya puanı yanlış');
        await clickByText([/^Töreni Kapat$/]);
        log.push(/Sonucu Kaydet — Ana Merkez/.test(dom.window.document.body.textContent ?? '') ? '✅ Tören kapanınca maç raporu otomatik değişmedi' : '❌ Tören maç raporundan çıkardı');
        liveAudio.setPrefs(priorPrefs);
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
