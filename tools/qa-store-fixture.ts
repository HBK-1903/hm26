// QA: maç bitiş/tekrar oynama akışını gerçek GameProvider ve jsdom ile sınar (fikstür played işaretlenir, nextFixture ilerler).
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).Element = dom.window.Element;
(globalThis as any).SVGElement = dom.window.SVGElement;
(globalThis as any).getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
dom.window.matchMedia = dom.window.matchMedia || (() => ({ matches: false, media: '', onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } }));
Object.defineProperty(globalThis, 'matchMedia', { value: dom.window.matchMedia, configurable: true, writable: true });
(globalThis as any).localStorage = dom.window.localStorage;
(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16) as unknown as number;
(globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
(globalThis as any).performance = dom.window.performance;

import React from 'react';
import { createRoot } from 'react-dom/client';
import { GameProvider, useGame, type DemoMatchResult } from '../src/store/game';
import { MatchSession } from '../src/engine/session';
import { buildEngineInput } from '../src/engine/adapter';
import { tacticalFamiliarity } from '../src/engine/tacticsStudio';
import { recentRatings, rotationAdvice } from '../src/engine/squadInsights';
import { FORMATION_SLOTS } from '../src/engine/profiles';
import { clubById } from '../src/data/clubs';

const ZONES: Record<string, { x: number; y: number }> = {
  'L-D': { x: 20, y: 82 }, 'C-D': { x: 50, y: 84 }, 'R-D': { x: 80, y: 82 },
  'L-M': { x: 20, y: 50 }, 'C-M': { x: 50, y: 50 }, 'R-M': { x: 80, y: 50 },
  'L-A': { x: 22, y: 18 }, 'C-A': { x: 50, y: 15 }, 'R-A': { x: 78, y: 18 },
};

const tick = () => new Promise((r) => setTimeout(r, 30));

const errors: string[] = [];
const origErr = console.error;
console.error = (...a: any[]) => { errors.push(a.map((x) => (x instanceof Error ? x.stack : String(x))).join(' ').slice(0, 600)); };
process.on('uncaughtException', (e) => errors.push('UNCAUGHT: ' + e.stack));
process.on('unhandledRejection', (e) => errors.push('REJECTION: ' + String(e)));

function Harness({ done }: { done: (report: string[]) => void }) {
  const g0 = useGame();
  const gRef = React.useRef(g0);
  gRef.current = g0;
  React.useEffect(() => {
    void (async () => {
      const log: string[] = [];
      try {
        const g = () => gRef.current; // her çağrıda güncel context
        // önce önemsiz bir güncelleme çalışıyor mu?
        g().setInbox((ms) => [...ms, { id: 'harness-probe', kind: 'kadro' as const, title: 'probe', body: 'x', day: 1, read: false }]);
        await tick();
        log.push(`probe sonrası inbox: ${g().inbox.length} (artmalıydı)`);
        const f0 = g().nextFixture;
        if (!f0) { done(['❌ nextFixture boş — fikstür kurulamadı']); return; }
        log.push(`İlk fikstür: gün ${f0.day} ${f0.homeId} vs ${f0.awayId} [${f0.comp}] played=${f0.played}`);
        log.push('friendlies başlangıç: ' + JSON.stringify(g().friendlies));
        const gun1 = [...g().fixtures, ...g().friendlies].filter((x) => x.day === 1).map((x) => `${x.comp}:${x.homeId}-${x.awayId}`);
        log.push('gün-1 fikstürleri: ' + JSON.stringify(gun1));
        const ligGunler = g().fixtures.filter((x) => x.homeId === g().myClub.id || x.awayId === g().myClub.id).map((x) => `lig${x.day}`);
        const hazGunler = g().friendlies.map((x) => `haz${x.day}`);
        log.push('tüm maçlarım günleri: ' + JSON.stringify([...ligGunler, ...hazGunler]));

        // maç gününe gel
        let guard = 0;
        while (g().career.day < f0.day && guard++ < 60) {
          const res = g().advanceDay();
          if (res.blocked) { log.push(`❌ advanceDay engellendi gün ${g().career.day}: ${res.reason}`); break; }
          await tick();
        }
        log.push(`Maç günü: career.day=${g().career.day}, fixture.day=${f0.day}`);

        // LiveMatch'in yaptığı gibi gerçek oturumu bitir
        const mySide = f0.homeId === g().myClub.id ? 'home' : 'away';
        const session = new MatchSession(buildEngineInput({
          homeClub: clubById(f0.homeId), awayClub: clubById(f0.awayId),
          homeSquad: g().squads[f0.homeId] ?? [], awaySquad: g().squads[f0.awayId] ?? [],
          homeTactic: mySide === 'home' ? g().tactics[0] : (undefined as any),
          awayTactic: mySide === 'away' ? g().tactics[0] : undefined,
          seed: 20260803 + f0.day * 101 + f0.homeId.length * 13,
          settings: g().career.settings,
          derby: clubById(f0.homeId).derby === f0.awayId,
          userSide: mySide, challengeClubId: g().career.clubId,
          challengePoints: g().career.manager.challengePoints, riskIds: [],
        }));
        const rr = session.finishNow();
        const finResult: DemoMatchResult = {
          homeId: f0.homeId, awayId: f0.awayId, hg: rr.stats.hg, ag: rr.stats.ag,
          events: [], xgHome: rr.stats.xgH, xgAway: rr.stats.xgA, posHome: rr.stats.posH,
          shotsH: rr.stats.shotsH, shotsA: rr.stats.shotsA, shotsOnH: rr.stats.onH, shotsOnA: rr.stats.onA,
          insights: rr.insights,
          cornersH: rr.stats.cornersH, cornersA: rr.stats.cornersA, foulsH: rr.stats.foulsH, foulsA: rr.stats.foulsA,
          yellowH: rr.stats.yellowH, yellowA: rr.stats.yellowA, redH: rr.stats.redH, redA: rr.stats.redA,
          savesH: rr.stats.savesH, savesA: rr.stats.savesA,
          wideH: rr.stats.wideAttH, wideA: rr.stats.wideAttA, centralH: rr.stats.centralAttH, centralA: rr.stats.centralAttA,
          pressWinsH: rr.stats.pressWinsH, pressWinsA: rr.stats.pressWinsA,
          shotsLog: rr.shotsLog.map((s) => { const z = ZONES[s.zone] ?? ZONES['C-M']; return s.side === 'home' ? { minute: s.minute, side: s.side, x: z.x, y: z.y, xg: s.xg, outcome: s.outcome } : { minute: s.minute, side: s.side, x: 100 - z.x, y: 96 - z.y, xg: s.xg, outcome: s.outcome }; }),
          playerRows: JSON.parse(JSON.stringify(rr.stats.playerRows)),
          ...(rr.referee ? { referee: { label: rr.referee.label, strictness: rr.referee.strictness } } : {}),
        };
        const inboxBefore = g().inbox.length;
        const returned = g().playLeagueMatch(f0, finResult);
        log.push(`playLeagueMatch döndü: ${returned.hg}-${returned.ag}`);
        await tick();
        log.push('friendlies maç sonrası: ' + JSON.stringify(g().friendlies));
        log.push(`inbox ${inboxBefore} → ${g().inbox.length}`);

        // Dalga 1: kaleci kurtarışları playerStats'a sindi mi?
        const gkEngineRows = Object.entries(rr.stats.playerRows).filter(([, r]) => r.posGroup === 'GK');
        const engineSaves = gkEngineRows.reduce((sum, [, r]) => sum + r.saves, 0);
        const persistedGkSaves = Object.values(g().playerStats ?? {})
          .filter((r) => g().playerOf(r.playerId)?.group === 'GK')
          .reduce((sum, r) => sum + (r.saves ?? 0), 0);
        log.push(persistedGkSaves === engineSaves && engineSaves >= 0
          ? `✅ Kaleci kurtarışları sindi (motor ${engineSaves} = kayıt ${persistedGkSaves})`
          : `❌ Kurtarış uyuşmazlığı: motor ${engineSaves}, kayıt ${persistedGkSaves}`);
        const archived = (g().matchReports ?? [])[0];
        log.push(archived && archived.xgHome === rr.stats.xgH && archived.xgAway === rr.stats.xgA
          ? `✅ Maç raporu xG ile arşivlendi (${archived.xgHome.toFixed(2)}-${archived.xgAway.toFixed(2)})`
          : '❌ Maç raporu xG arşivi eksik/hatalı');

        const f1 = g().nextFixture;
        const sameAgain = f1 && f1.day === f0.day && f1.homeId === f0.homeId && f1.awayId === f0.awayId;
        log.push(`Maç sonrası nextFixture: ${f1 ? `gün ${f1.day} ${f1.homeId} vs ${f1.awayId} [${f1.comp}] played=${f1.played}` : 'YOK'}`);
        log.push(sameAgain ? '❌ HATA DOĞRULANDI: aynı fikstür hâlâ sırada — maç tekrar oynanabilir!' : '✅ Fikstür ilerledi, aynı maç tekrar sunulmuyor.');

        // ikinci maç da işlenebiliyor mu (tüm zincir)
        if (f1 && !sameAgain) {
          let g2 = 0;
          while (g().career.day < f1.day && g2++ < 60) { g().advanceDay(); await tick(); }
          const r2 = g().playLeagueMatch({ ...f1 });
          await tick();
          const f2 = g().nextFixture;
          log.push(`2. maç (hızlı sim) işlendi ${r2.hg}-${r2.ag}; sonraki: ${f2 ? `gün ${f2.day} ${f2.homeId} vs ${f2.awayId}` : 'yok'}`);

          // Dalga 2: iki maç da plan A uyum sayacını işledi (canlı + hızlı sim, varsayılan plan 0)
          const plan0 = g().tactics[0];
          const fam = tacticalFamiliarity(plan0);
          log.push(plan0.familiarityMatches === 2 && plan0.familiarityFormation === plan0.formation && fam.percent === 66
            ? `✅ Taktiksel uyum iki maçla işlendi (${fam.matches} maç · %${fam.percent})`
            : `❌ Uyum sayacı hatalı: maç=${plan0.familiarityMatches}, formasyon=${plan0.familiarityFormation}, %${fam.percent}`);

          // Dalga 3: gerçek maç arşivinden son reytingler ve rotasyon masası uçtan uca
          const reports = g().matchReports ?? [];
          const playedId = reports[0] ? Object.keys(reports[0].playerRows).find((id) => reports[0].playerRows[id].min > 0) : undefined;
          const rr = playedId ? recentRatings(playedId, reports) : [];
          const liveAdvice = rotationAdvice({ squad: g().mySquad, xi: g().tactics[0].customLineup ? g().tactics[0].customLineup!.filter(Boolean).map((id, i) => ({ playerId: id as string, slotGroup: FORMATION_SLOTS[g().tactics[0].formation][i] })) : [], reports });
          log.push(reports.length === 2 && playedId && rr.length >= 1 && rr.every((v) => v >= 0 && v <= 10)
            ? `✅ Son maç reytingleri gerçek arşivden türedi (${playedId}: ${rr.map((v) => v.toFixed(1)).join(', ')})`
            : `❌ Reyting türetimi hatalı: rapor=${reports.length}, oyuncu=${playedId ?? 'yok'}`);
          log.push(Array.isArray(liveAdvice) && liveAdvice.every((a) => a.reason && a.playerId)
            ? `✅ Rotasyon masası gerçek kadroyla çalıştı (${liveAdvice.length} öneri)`
            : '❌ Rotasyon masası geçersiz çıktı');
        }
        if (errors.length) log.push('YAKALANAN HATALAR:\n' + errors.slice(0, 5).join('\n---\n'));
        done(log);
      } catch (err) {
        log.push('❌ HARNESS İSTİSNASI: ' + ((err as Error).stack ?? err));
        if (errors.length) log.push('YAKALANAN HATALAR:\n' + errors.slice(0, 5).join('\n---\n'));
        done(log);
      }
    })();
  }, []);
  return React.createElement('div');
}

const career: any = {
  slot: 1,
  manager: { name: 'Test Menajer', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 0 },
  clubId: 'denizli_yesilova', seed: 12345, day: 1, week: 1,
  settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true },
  pending: { marketShortlist: [], activeProject: null },
};

const rootEl = dom.window.document.getElementById('root')!;
const root = createRoot(rootEl);
const report = await new Promise<string[]>((resolve) => {
  root.render(React.createElement(GameProvider, { career }, React.createElement(Harness, { done: resolve })));
});
await tick();
console.log(report.join('\n'));
process.exit(report.some((l) => l.includes('❌')) ? 1 : 0);
