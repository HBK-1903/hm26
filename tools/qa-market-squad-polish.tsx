// Real provider: every visible market potential, filter/focus, collapsible rotation and match-day lineup.
import 'fake-indexeddb/auto';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).Element = dom.window.Element;
(globalThis as any).SVGElement = dom.window.SVGElement;
(globalThis as any).localStorage = dom.window.localStorage;
(globalThis as any).Image = dom.window.Image;
(globalThis as any).getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
dom.window.matchMedia = (() => ({ matches: false, media: '', onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } })) as any;
(globalThis as any).matchMedia = dom.window.matchMedia;

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { GameProvider, useGame, type DemoMatchResult } from '../src/store/game';
import { readSave, type SaveBlob } from '../src/store/persist';
import { MarketScreen } from '../src/screens/Market';
import { SquadScreen } from '../src/screens/Squad';
import { TacticsScreen } from '../src/screens/Tactics';
import { MatchPrep } from '../src/screens/MatchPrep';
import { MatchReport } from '../src/screens/MatchReport';
import { genFreeAgent, genSquad } from '../src/data/gen';
import { clubById } from '../src/data/clubs';
import { autoLineup } from '../src/engine/profiles';
import { boardToEngine, engineToBoard } from '../src/engine/lineupOrder';
import { pitchFormationSlots } from '../src/components/assets/pitchPresentation';
import { needleOutcome } from '../src/engine/medical';
import { canSlotGroup } from '../src/engine/tacticsStudio';
import { MatchSession } from '../src/engine/session';
import { buildEngineInput, matchEventsToDemo } from '../src/engine/adapter';
import { compactMatchEvents, EV_GOAL, EV_RED } from '../src/engine/matchEvents';
import type { Career, DemoFixture, Formation } from '../src/types';
import type { MatchStateEvent } from '../src/engine/engine';

const career: Career = {
  slot: 2, manager: { name: 'Test Menajer', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 0 },
  clubId: 'denizli_yesilova', seed: 12345, day: 1, week: 1,
  settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true },
  pending: { marketShortlist: [], activeProject: null },
} as Career;
let g: ReturnType<typeof useGame>;
type Mode = 'market' | 'squad' | 'tactics' | 'prep' | 'report' | 'none';
let fakeReport: DemoMatchResult;
let fakeFixture: DemoFixture;
const Harness: React.FC<{ mode: Mode }> = ({ mode }) => {
  g = useGame();
  return mode === 'market' ? <MarketScreen /> : mode === 'squad' ? <SquadScreen goXI={() => {}} /> : mode === 'tactics' ? <TacticsScreen />
    : mode === 'prep' ? <MatchPrep go={() => {}} /> : mode === 'report' ? <MatchReport result={fakeReport} fixture={fakeFixture} onDone={() => {}} /> : null;
};
const root = createRoot(dom.window.document.getElementById('root')!);
let providerKey = 0, passed = 0;
const failures: string[] = [];
const check = (name: string, condition: unknown, detail = '') => { if (condition) passed++; else failures.push(name); console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
const q = <T extends HTMLElement = HTMLElement>(selector: string) => dom.window.document.querySelector<T>(selector);
const all = (selector: string) => Array.from(dom.window.document.querySelectorAll<HTMLElement>(selector));
const body = () => dom.window.document.body.textContent ?? '';
const mount = async (mode: Mode, snapshot?: SaveBlob) => {
  providerKey++;
  await act(async () => root.render(<GameProvider key={providerKey} career={career} snapshot={snapshot}><Harness mode={mode} /></GameProvider>));
};
const click = async (element: HTMLButtonElement | null, label: string) => {
  if (!element || element.disabled) throw new Error(`Tıklanamadı: ${label}`);
  await act(async () => { element.click(); });
};
const textButton = (text: string) => Array.from(dom.window.document.querySelectorAll('button')).find((item) => (item.textContent ?? '').trim() === text) ?? null;
const change = async (element: HTMLInputElement, value: string) => { await act(async () => { element.value = value; Simulate.change(element); }); };
const rows = () => all('[data-testid="market-player"]');
const everyPotential = () => rows().length > 0 && rows().every((row) => !!row.querySelector('[aria-label^="Potansiyel "]') && /POT\s+(\d+|—)/.test(row.textContent ?? ''));

await mount('none');
await g.saveNow();
const baseline = (await readSave(career.slot))?.blob as SaveBlob & Record<string, any>;
if (!baseline) throw new Error('Başlangıç kaydı yok');
const originalSquad = g.mySquad;

await mount('market', baseline);
check('Fırsatlar görünümündeki tüm oyuncuların POT değeri var', everyPotential(), `${rows().length} oyuncu`);
const starButton = rows()[0]?.querySelector<HTMLButtonElement>('button[aria-label="Kısa listeye ekle"]') ?? null;
starButton?.focus();
await click(starButton, 'Kısa listeye ekle');
check('Kısa liste işlemi sonrasında aynı düğmede klavye odağı korunuyor', document.activeElement === starButton && starButton?.getAttribute('aria-pressed') === 'true');
await click(textButton('Oyuncu Ara'), 'Oyuncu Ara');
check('Oyuncu Ara görünümündeki tüm oyuncuların POT değeri var', everyPotential(), `${rows().length} oyuncu`);
check('Tüm mevkiler için filtre düğmeleri var', all('[aria-label="Mevki filtresi"] button').length === 10 && ['Bek', 'Kanat Bek', 'D.O.S', 'O.O.S'].every((name) => !!q(`[aria-label="${name}"]`)));
const accentedRow = rows().find((row) => {
  const p = g.playerOf(row.dataset.playerId ?? '');
  return !!p && /[çğıöşüİ]/i.test(p.name);
});
if (!accentedRow) throw new Error('Türkçe harfli piyasa oyuncusu yok');
const accentedPlayer = g.playerOf(accentedRow.dataset.playerId!)!;
const ascii = accentedPlayer.name.toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
const search = q<HTMLInputElement>('[aria-label="Oyuncu veya kulüp ara"]')!;
await change(search, ascii);
check('Türkçe oyuncu adı aksansız yazımla bulunur', rows().some((row) => row.dataset.playerId === accentedPlayer.id), `${accentedPlayer.name} → ${ascii}`);
await click(q<HTMLButtonElement>('[aria-label="Kanat Bek"]'), 'Kanat Bek filtresi');
check('Mevki ve arama birlikte uygulanır', rows().every((row) => row.dataset.position === 'WB'));
await click(textButton('Filtreleri temizle ✕'), 'Filtreleri temizle');
check('Filtreleri temizle aramayı, mevkiyi ve diğer filtreleri sıfırlar', search.value === '' && q('[aria-label="Tüm mevkiler"]')?.getAttribute('aria-pressed') === 'true' && rows().length > 0);
await change(search, 'olmayan oyuncu ismi qa 000');
check('Sonuç yoksa açıklayıcı boş durum gösterilir', rows().length === 0 && body().includes('Bu kriterde piyasada oyuncu yok'));
await click(textButton('Filtreleri temizle ✕'), 'Filtreleri temizle');
await click(Array.from(dom.window.document.querySelectorAll('button')).find((b) => (b.textContent ?? '').startsWith('Kısa Liste')) ?? null, 'Kısa Liste');
check('Kısa listeye eklenen oyuncunun POT değeri de görünür', everyPotential() && rows().length === 1);
await act(async () => { await g.saveNow(); });
const shortlistSave = (await readSave(career.slot))?.blob as SaveBlob;
await mount('market', shortlistSave);
await click(Array.from(dom.window.document.querySelectorAll('button')).find((b) => (b.textContent ?? '').startsWith('Kısa Liste')) ?? null, 'Kısa Liste');
check('Kısa liste ve POT kayıt/yükleme sonrası korunur', rows().length === 1 && everyPotential());
const equalPotential = genFreeAgent(77, 'kok', 2, 'free');
equalPotential.id = 'fa_equal_potential_qa'; equalPotential.potential = equalPotential.ratings.gen;
const equalSnapshot = structuredClone(baseline) as SaveBlob & Record<string, any>;
equalSnapshot.career.pending.marketShortlist = [equalPotential.id];
equalSnapshot.career.pending.marketShortlistPlayers = [equalPotential];
await mount('market', equalSnapshot);
await click(Array.from(dom.window.document.querySelectorAll('button')).find((b) => (b.textContent ?? '').startsWith('Kısa Liste')) ?? null, 'Kısa Liste');
check('POT, GEN ile eşit olsa bile gösterilir', rows()[0]?.textContent?.includes(`POT ${equalPotential.ratings.gen}`));
await mount('market', baseline);
await click(Array.from(dom.window.document.querySelectorAll('button')).find((b) => (b.textContent ?? '').startsWith('Diğer')) ?? null, 'Diğer');
await click(textButton('Sözleşmeler'), 'Sözleşmeler');
check('Piyasadaki sözleşme kartlarında da bütün oyuncuların POT değeri görünür', (body().match(/POT\s+\d+/g) ?? []).length === g.mySquad.length);

// Rotation desk: hidden by default, keyboard semantics and original manual slot indices.
const rotation = structuredClone(baseline) as SaveBlob & Record<string, any>;
const tired = originalSquad.find((p) => p.group === 'CB')!;
rotation.playerPatch[tired.id] = { ...(rotation.playerPatch[tired.id] ?? {}), fitness: 50 };
const lineup = Array(11).fill(null); lineup[2] = tired.id;
rotation.tactics[0] = { ...rotation.tactics[0], formation: '4-3-3', customLineup: lineup };
await mount('squad', rotation);
const desk = q('[data-testid="rotation-desk"]')!;
const toggle = desk.querySelector<HTMLButtonElement>('[aria-controls="rotation-desk-content"]')!;
const panel = q<HTMLElement>('#rotation-desk-content')!;
check('Rotasyon masası başlangıçta kapalı ve erişilebilir', toggle.getAttribute('aria-expanded') === 'false' && panel.hidden);
await click(toggle, 'Rotasyon masasını aç');
check('Rotasyon masası açılır ve önerileri gösterir', toggle.getAttribute('aria-expanded') === 'true' && !panel.hidden && !!panel.querySelector('[data-advice-kind="rest"]'));
const bestCB = originalSquad.filter((p) => p.id !== tired.id && p.injuredDays <= 0 && p.suspendedMatches <= 0 && p.fitness >= 70 && canSlotGroup('CB', p)).sort((a, b) => b.ratings.gen - a.ratings.gen)[0];
check('Boş ilk 11 yuvaları sonraki oyuncunun mevki indeksini kaydırmaz', !!bestCB && (panel.querySelector('[data-advice-kind="rest"]')?.textContent ?? '').includes(bestCB.name));
await click(toggle, 'Rotasyon masasını kapat');
check('Rotasyon masası tekrar kapanır', toggle.getAttribute('aria-expanded') === 'false' && panel.hidden);

// Tactics board defaults, selected XI and bench agree with the actual match engine.
await mount('tactics', baseline);
const engineXI = autoLineup(g.mySquad, g.tactics[0].formation).slots;
const slotButtons = all('button[aria-label*="değiştir"]').filter((el) => /kondisyon/.test(el.getAttribute('aria-label') ?? ''));
const automaticBoard = engineToBoard(g.tactics[0].formation, engineXI.map((slot) => slot.player));
check('Taktik tahtasının otomatik ilk 11 ve yuvaları motorla aynı', slotButtons.length === 11 && slotButtons.every((el, i) => (el.getAttribute('aria-label') ?? '').startsWith(automaticBoard[i]?.name ?? 'yanlış')));
const automaticIds = new Set(engineXI.map((slot) => slot.player.id));
const selectedBench = [...g.mySquad].reverse().find((p) => !automaticIds.has(p.id) && p.injuredDays <= 0 && p.suspendedMatches <= 0 && p.fitness >= 40)!;
const firstLine = autoLineup(g.mySquad, g.tactics[0].formation, undefined, undefined, [selectedBench.id, selectedBench.id, engineXI[0].player.id, 'missing']);
check('Seçilmiş yedek önce gelir; tekrar, ilk 11 ve olmayan oyuncu eklenmez', firstLine.bench[0]?.id === selectedBench.id && new Set(firstLine.bench.map((p) => p.id)).size === firstLine.bench.length && !firstLine.bench.some((p) => automaticIds.has(p.id)));
const homeClub = clubById(career.clubId), awayClub = clubById('sakarya_vadi');
const session = new MatchSession(buildEngineInput({ homeClub, awayClub, homeSquad: g.mySquad, awaySquad: g.squads[awayClub.id], homeTactic: { ...g.tactics[0], customBench: [selectedBench.id] }, seed: 8801, settings: career.settings }));
check('Canlı maç kulübesi seçilen yedeği gerçekten içerir', session.getBench('home')[0]?.id === selectedBench.id);

// Squad badges must reflect the production MatchSession, not the first six
// stored preferences or invalid IDs from an older manual lineup.
const sameIds = (a: string[], b: string[]) => a.length === b.length && new Set(a).size === a.length && a.every((id) => b.includes(id));
const squadBadges = () => {
  const cards = all('[data-squad-player-id]');
  const hasBadge = (card: HTMLElement, badge: string) => Array.from(card.querySelectorAll('span')).some((node) => node.textContent?.trim() === badge);
  return {
    xi: cards.filter((card) => hasBadge(card, 'XI')).map((card) => card.dataset.squadPlayerId!),
    bench: cards.filter((card) => hasBadge(card, 'YDK')).map((card) => card.dataset.squadPlayerId!),
    count: cards.length,
  };
};
const verifySquadBadges = async (snapshot: SaveBlob, label: string) => {
  await mount('squad', snapshot);
  const match = new MatchSession(buildEngineInput({ homeClub, awayClub, homeSquad: g.mySquad, awaySquad: g.squads[awayClub.id], homeTactic: g.tactics[0], seed: 8801, settings: career.settings, riskIds: g.riskPlayIds }));
  const expectedXI = match.getSlots('home').map((slot) => slot.player.id);
  const expectedBench = match.getBench('home').map((p) => p.id);
  const actual = squadBadges();
  check(`${label}: XI rozetleri gerçek ilk 11 ile eşleşir`, sameIds(actual.xi, expectedXI), `ekran=${actual.xi.length}, motor=${expectedXI.length}`);
  check(`${label}: YDK rozetleri gerçek yedeklerle eşleşir`, sameIds(actual.bench, expectedBench), `ekran=${actual.bench.length}, motor=${expectedBench.length}`);
  return { match, actual, expectedXI, expectedBench };
};
await verifySquadBadges(baseline, 'Otomatik kadro');
const bigger = structuredClone(baseline) as SaveBlob & Record<string, any>;
for (const p of g.squads['ist_halic'].slice(0, 2)) bigger.playerClub[p.id] = career.clubId;
const full = await verifySquadBadges(bigger, '24 kişilik kadro');
check('24 kişilik kadroda 11+9 rozet ve maç dışında 4 oyuncu vardır', full.actual.count === 24 && full.expectedXI.length === 11 && full.expectedBench.length === 9 && full.actual.count - full.actual.xi.length - full.actual.bench.length === 4);
const planned = structuredClone(bigger) as SaveBlob & Record<string, any>;
planned.tactics[0].formation = '4-4-2';
const plannedLineup = autoLineup(g.mySquad, '4-4-2');
const plannedBoard = engineToBoard('4-4-2', plannedLineup.slots.map((slot) => slot.player.id));
planned.tactics[0].customLineup = plannedBoard;
planned.tactics[0].customBench = plannedLineup.bench.slice(0, 6).map((p) => p.id);
await verifySquadBadges(planned, 'Manuel 11 ve altı eski yedek tercihi');
const stale = structuredClone(planned) as SaveBlob & Record<string, any>;
stale.tactics[0].customLineup[0] = 'sold-player-not-in-squad';
stale.tactics[0].customLineup[1] = stale.tactics[0].customLineup[2];
stale.tactics[0].customBench = [stale.tactics[0].customLineup[2], 'sold-player-not-in-squad', plannedLineup.bench[0].id, plannedLineup.bench[0].id];
await verifySquadBadges(stale, 'Eksik ve mükerrer eski kadro');
const unavailable = structuredClone(planned) as SaveBlob & Record<string, any>;
const injuredId = plannedBoard[1]!, suspendedId = plannedBoard[2]!;
unavailable.playerPatch[injuredId] = { ...unavailable.playerPatch[injuredId], injuredDays: 10 };
unavailable.playerPatch[suspendedId] = { ...unavailable.playerPatch[suspendedId], suspendedMatches: 2 };
const blocked = await verifySquadBadges(unavailable, 'Sakat ve cezalı oyunculu kadro');
check('Onaysız sakat ve cezalı oyuncular maç kadrosu rozeti almaz', ![...blocked.actual.xi, ...blocked.actual.bench].some((id) => id === injuredId || id === suspendedId));
const risk = structuredClone(unavailable) as SaveBlob & Record<string, any>;
risk.riskPlayIds = [injuredId];
const approved = await verifySquadBadges(risk, 'İğne onaylı kadro');
check('İğne onaylı ilk 11 oyuncusu XI rozeti alır, cezalı oyuncu almaz', approved.actual.xi.includes(injuredId) && ![...approved.actual.xi, ...approved.actual.bench].includes(suspendedId));
await act(async () => { await g.saveNow(); });
const badgesSave = (await readSave(career.slot))?.blob as SaveBlob;
await verifySquadBadges(badgesSave, 'Kayıt yeniden açıldığında');

// Older saves stored manual XIs in the original visual board order, not engine order.
// Verify all six formations keep the exact board positions and enter both match sides correctly.
const oldBoardIndices: Record<Formation, readonly number[]> = {
  '4-3-3': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  '4-2-3-1': [0, 1, 2, 3, 4, 5, 6, 7, 9, 8, 10],
  '4-4-2': [0, 1, 2, 3, 4, 6, 7, 5, 8, 9, 10],
  '4-1-4-1': [0, 1, 2, 3, 4, 5, 7, 8, 6, 9, 10],
  '3-5-2': [0, 1, 2, 3, 4, 8, 5, 6, 7, 9, 10],
  '5-3-2': [0, 2, 3, 4, 1, 5, 6, 7, 8, 9, 10],
};
const oldBoardX: Record<Formation, readonly number[]> = {
  '4-3-3': [50, 12, 33, 67, 88, 25, 50, 75, 15, 50, 85],
  '4-2-3-1': [50, 12, 33, 67, 88, 36, 64, 15, 50, 85, 50],
  '4-4-2': [50, 12, 33, 67, 88, 14, 38, 62, 86, 35, 65],
  '4-1-4-1': [50, 12, 33, 67, 88, 50, 15, 38, 62, 85, 50],
  '3-5-2': [50, 25, 50, 75, 8, 30, 50, 70, 92, 38, 62],
  '5-3-2': [50, 10, 30, 50, 70, 90, 30, 50, 70, 40, 60],
};
const pitch4231 = engineToBoard('4-2-3-1', pitchFormationSlots('4-2-3-1', 50, 'normal'));
check('4-2-3-1 hücum yuvaları tahtada ve canlı sahada aynı soldan sağa sıradadır', !!pitch4231[7] && !!pitch4231[8] && !!pitch4231[9] && pitch4231[7].x < pitch4231[8].x && pitch4231[8].x < pitch4231[9].x);
let legacy442: SaveBlob & Record<string, any> | undefined;
for (const formation of Object.keys(oldBoardIndices) as Formation[]) {
  const legacy = structuredClone(baseline) as SaveBlob & Record<string, any>;
  const legacyPlayers = autoLineup(originalSquad, formation).slots.map((slot) => slot.player.id);
  legacy.tactics[0] = { ...legacy.tactics[0], formation, customLineup: legacyPlayers };
  await mount('tactics', legacy);
  const buttons = all('button[aria-label*="değiştir"]').filter((el) => /kondisyon/.test(el.getAttribute('aria-label') ?? ''));
  const expectedEngine = oldBoardIndices[formation].map((index) => legacyPlayers[index]);
  const makeSession = (away: boolean) => new MatchSession(buildEngineInput({
    homeClub: away ? awayClub : homeClub, awayClub: away ? homeClub : awayClub,
    homeSquad: away ? g.squads[awayClub.id] : g.mySquad, awaySquad: away ? g.mySquad : g.squads[awayClub.id],
    homeTactic: away ? { ...legacy.tactics[0], customLineup: undefined } : legacy.tactics[0],
    awayTactic: away ? legacy.tactics[0] : undefined, seed: 8802, settings: career.settings,
  }));
  const homeIds = makeSession(false).getSlots('home').map((slot) => slot.player.id);
  const awayIds = makeSession(true).getSlots('away').map((slot) => slot.player.id);
  const visualOk = buttons.length === 11 && buttons.every((button, i) => (button.getAttribute('aria-label') ?? '').startsWith(g.playerOf(legacyPlayers[i])?.name ?? 'yanlış') && button.style.left === `${oldBoardX[formation][i]}%`);
  check(`Eski ${formation} dizilişi sahadaki yerlerini korur, ev/deplasman maçına doğru aktarılır`, visualOk && JSON.stringify(homeIds) === JSON.stringify(expectedEngine) && JSON.stringify(awayIds) === JSON.stringify(expectedEngine) && JSON.stringify(engineToBoard(formation, boardToEngine(formation, legacyPlayers))) === JSON.stringify(legacyPlayers));
  if (formation === '4-4-2') legacy442 = legacy;
}
await mount('tactics', legacy442);
const editable = all('button[aria-label*="değiştir"]').filter((el) => /kondisyon/.test(el.getAttribute('aria-label') ?? ''));
const beforeSwap = [...g.tactics[0].customLineup!];
await click(editable[5], 'Eski dizilişte ilk yuva');
await click(editable[6], 'Eski dizilişte ikinci yuva');
const afterSwap = g.tactics[0].customLineup!;
const swappedSession = new MatchSession(buildEngineInput({ homeClub, awayClub, homeSquad: g.mySquad, awaySquad: g.squads[awayClub.id], homeTactic: g.tactics[0], seed: 8803, settings: career.settings }));
check('Eski dizilişte değişiklik orijinal yuvalara kaydedilir ve maça aynı şekilde geçer', afterSwap[5] === beforeSwap[6] && afterSwap[6] === beforeSwap[5] && JSON.stringify(swappedSession.getSlots('home').map((slot) => slot.player.id)) === JSON.stringify(boardToEngine('4-4-2', afterSwap)));

// Match-day cards must use the chosen manual plan instead of plan 0 / an unrelated automatic XI.
const manual = structuredClone(baseline) as SaveBlob & Record<string, any>;
const plan1 = manual.tactics[1];
const automaticPlan1 = autoLineup(originalSquad, plan1.formation).slots.map((slot) => slot.player.id);
const candidate = [...originalSquad].reverse().find((p) => !automaticPlan1.includes(p.id) && p.injuredDays <= 0 && p.suspendedMatches <= 0 && p.fitness >= 40)!;
const manualIds = [...automaticPlan1]; manualIds[manualIds.length - 1] = candidate.id;
manual.tactics[1] = { ...plan1, customLineup: manualIds };
manual.playerPatch[candidate.id] = { ...(manual.playerPatch[candidate.id] ?? {}), fitness: 55 };
await mount('prep', manual);
await click(textButton(`${plan1.name} (${plan1.formation})`), 'İkinci plan');
check('Maç hazırlığındaki rotasyon uyarısı seçili manuel 11’i kullanır', (q('[data-testid="risk-desk"]')?.textContent ?? '').includes(candidate.name));
check('Maç hazırlığı sağlık kontrolü seçili ilk 11 riskini gösterir', /oyuncu yüksek risk taşıyor/.test(body()));
const quickAway = g.buildDemoMatch('sakarya_vadi', career.clubId, plan1.name, 1);
check('Hızlı deplasman maçında seçilen manuel plan kendi takımına uygulanır', (quickAway.playerRows?.[candidate.id]?.min ?? 0) > 0);

// All event fields and compact codes survive conversion, with an honest old-report empty state.
const raw: MatchStateEvent[] = [
  { minute: 9, kind: 'goal', text: 'Gol!', side: 'home', playerId: 'p', scorerId: 'p', assisterId: 'a', path: ['L-M', 'C-A'], anim: { eventType: 'shot', attackingTeamId: homeClub.id, actors: ['p'], outcome: 'goal' }, visualEvent: 'volley', visualActors: ['p', 'a'] },
  { minute: 20, kind: 'card', text: 'Kart', side: 'away', playerId: 'q', anim: { eventType: 'card', attackingTeamId: awayClub.id, actors: ['q'], outcome: 'red' } },
];
const mapped = matchEventsToDemo(raw);
const compact = compactMatchEvents(mapped);
check('Olay dönüşümü golcü, asist, animasyon ve görsel ipuçlarını korur', mapped[0].scorerId === 'p' && mapped[0].assisterId === 'a' && mapped[0].visualEvent === 'volley' && mapped[0].visualActors?.[1] === 'a' && mapped[0].path?.length === 2);
check('Arşiv golü ve kırmızı kartı kimlik ve taraflarıyla korur', compact[0][1] === EV_GOAL && compact[0][2] === 0 && compact[0][3] === 'p' && compact[1][1] === EV_RED && compact[1][2] === 1 && compact[1][3] === 'q');
fakeReport = { ...quickAway, events: [], wideH: 3, centralH: 18, wideA: 10, centralA: 10 };
fakeFixture = { homeId: 'sakarya_vadi', awayId: career.clubId, day: 1, played: true, comp: 'lig', league: 'kok' } as DemoFixture;
await mount('report', manual);
await click(textButton('Analiz'), 'Analiz');
check('Deplasman raporunda rakibin merkez payı doğru hesaplanır', /RakipMerkez %86 · Kanat %14/.test(body()));
await click(textButton('Karneler'), 'Karneler');
check('Deplasman raporunda rakip karne başlığı ev sahibini gösterir', body().includes(`Rakip — ${clubById('sakarya_vadi').short}`));
await click(textButton('Olaylar'), 'Olaylar');
check('Olay içermeyen eski raporda dürüst boş durum gösterilir', body().includes('Bu maç için olay kaydı bulunmuyor.'));

// An approved injured starter must play and the post-match risk result must not be lost
// when the match and medical updates are batched in one React event.
const risky = structuredClone(baseline) as SaveBlob & Record<string, any>;
const riskyFixture = risky.fixtures.filter((f: DemoFixture) => !f.played && (f.homeId === career.clubId || f.awayId === career.clubId)).sort((a: DemoFixture, b: DemoFixture) => a.day - b.day)[0] as DemoFixture;
let riskSeed = 12000;
while (!needleOutcome(riskSeed + riskyFixture.day * 131).aggravated) riskSeed++;
risky.career.seed = riskSeed; risky.career.day = riskyFixture.day;
const riskId = `${career.clubId}_GK_0`;
risky.playerPatch[riskId] = { ...risky.playerPatch[riskId], injuredDays: 8, injury: { type: 'adale_gerilmesi', name: 'Adale gerilmesi', daysRemaining: 8, severity: 'hafif', canPlayWithRisk: true } };
risky.riskPlayIds = [riskId];
const riskTacticIdx = riskyFixture.homeId === career.clubId ? 0 : 2;
const riskPlan = risky.tactics[riskTacticIdx] ?? risky.tactics[0];
const riskSlots = autoLineup(genSquad(homeClub, riskSeed), riskPlan.formation).slots.map((slot) => slot.player.id);
riskSlots[0] = riskId;
risky.tactics[riskTacticIdx] = { ...riskPlan, customLineup: riskSlots };
await mount('none', risky);
let riskyPlayed: string[] = [];
await act(async () => {
  const match = g.playLeagueMatch(riskyFixture, undefined, riskTacticIdx);
  riskyPlayed = Object.entries(match.playerRows ?? {}).filter(([, row]) => row.min > 0).map(([id]) => id);
  g.applyRiskOutcome(riskyPlayed);
});
check('Onaylı sakat oyuncu seçili ilk 11 ile gerçekten sahaya çıkar', riskyPlayed.includes(riskId));
check('Maç ve sağlık güncellemesi birlikte işlendiğinde nüks kaybolmaz', (g.playerOf(riskId)?.injuredDays ?? 0) > 8 && !g.riskPlayIds?.includes(riskId));

// Existing saves remain loadable and the persistent match archive stays bounded at 256.
const previousArchive = g.matchReports?.[0];
const capped = structuredClone(baseline) as SaveBlob & Record<string, any>;
capped.career.day = riskyFixture.day;
capped.matchReports = Array.from({ length: 256 }, (_, index) => ({ ...previousArchive, id: `qa-old-${index}` }));
await mount('none', capped);
await act(async () => { g.playLeagueMatch(riskyFixture); });
check('257. maçta arşiv 256 kayıtla sınırlıdır; en eski kayıt çıkar', g.matchReports?.length === 256 && g.matchReports[0]?.id !== 'qa-old-0' && g.matchReports.some((entry) => entry.id === 'qa-old-0') && !g.matchReports.some((entry) => entry.id === 'qa-old-255'));
await act(async () => { await g.saveNow(); });
const cappedSave = (await readSave(career.slot))?.blob as SaveBlob;
await mount('none', cappedSave);
check('256 maç sınırı kayıt/yükleme sonrasında da korunur', g.matchReports?.length === 256 && g.matchReports[0]?.events?.length > 0);
const legacy = structuredClone(baseline) as SaveBlob & Record<string, any>;
delete legacy.matchReports; delete legacy.sellOnClauses; delete legacy.riskPlayIds;
for (const tactic of legacy.tactics) delete tactic.customBench;
await mount('none', legacy);
check('Eski kayıtta isteğe bağlı arşiv, satış ve yedek alanları yokken oyun açılır', Array.isArray(g.matchReports) && g.matchReports.length === 0 && g.mySquad.length > 0 && g.buildDemoMatch('sakarya_vadi', career.clubId, g.tactics[0].name).playerRows !== undefined);

console.log(`\nMARKET-SQUAD-POLISH: ${passed}/${passed + failures.length} geçti`);
if (failures.length) { console.error('Başarısız:', failures.join(', ')); process.exitCode = 1; }
await act(async () => root.unmount());
