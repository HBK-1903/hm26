// Deterministic board decisions plus real GameProvider/IndexedDB save and reload.
import 'fake-indexeddb/auto';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { clubById } from '../src/data/clubs';
import { genSquad } from '../src/data/gen';
import { assessBoardBudget, boardBudgetMessageId, boardTargetRank, type BoardBudgetInput } from '../src/data/boardBudget';
import { clubSeasonTransferTotals } from '../src/data/culture';
import { GameProvider, useGame } from '../src/store/game';
import { deleteSave, parseImportFile, readSave, writeSave } from '../src/store/persist';
import type { Career, InboxMsg, TableRow, TransferLogEntry } from '../src/types';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).Element = dom.window.Element;
(globalThis as any).SVGElement = dom.window.SVGElement;
(globalThis as any).localStorage = dom.window.localStorage;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
dom.window.matchMedia = (() => ({ matches: false, media: '', onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } })) as any;

let passed = 0, failed = 0;
const check = (name: string, condition: unknown, detail = '') => { condition ? passed++ : failed++; console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const career: Career = { slot: 1, manager: { name: 'Bütçe Testi', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 40 }, clubId: 'denizli_yesilova', seed: 12345, day: 60, week: 9, boardConfidence: 70, settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true }, pending: { marketShortlist: [], activeProject: null } };
const club = clubById(career.clubId);
const squad = genSquad(club, career.seed);
const rows: TableRow[] = Array.from({ length: 12 }, (_, i) => ({ clubId: i ? `rakip_${i}` : club.id, p: 4, w: i ? 0 : 4, d: 0, l: i ? 4 : 0, gf: i ? 1 : 8, ga: i ? 8 : 1, pts: i ? 0 : 12 }));
const base: BoardBudgetInput = { career, club, seasonNo: 1, leagueTable: rows, squad, transferLog: [], inbox: [], budget: { tb: 6 } };
const message = (day: number, approved: boolean, seasonNo = 1, clubId = club.id): InboxMsg => ({ id: boardBudgetMessageId(clubId, seasonNo, day, approved), kind: 'yonetim', title: 'Yanıt', body: 'Test', day, read: false });
const transaction = (patch: Partial<TransferLogEntry>): TransferLogEntry => ({ id: 't', day: 50, seasonNo: 1, playerName: 'Oyuncu', age: 25, group: 'ST', fromClubId: club.id, toClubId: 'another_club', fee: 0, kind: 'out', ...patch });

const favorable = assessBoardBudget(base);
check('Uygun koşullarda onay: dört maç, %60 üzeri güven, hedefe yakın sıra, mali uyum ve ihtiyaç', favorable.canRequest && favorable.approved && favorable.amount === 1.2 && favorable.rank === 1 && favorable.ffp.status !== 'breach');
check('Karar yalnız girdilerden, rastgelelik olmadan üretilir', JSON.stringify(assessBoardBudget(base)) === JSON.stringify(favorable));
check('Güven sınırı %60 dahil; altı gerekçeli ret', assessBoardBudget({ ...base, career: { ...career, boardConfidence: 60 } }).approved && !assessBoardBudget({ ...base, career: { ...career, boardConfidence: 59 } }).approved);
check('Dört lig maçından önce ret', !assessBoardBudget({ ...base, leagueTable: rows.map((r) => r.clubId === club.id ? { ...r, p: 3 } : r) }).approved);
check('Kalan kaynak sınırı %60 dahil; üzeri ret', favorable.approved && !assessBoardBudget({ ...base, budget: { tb: 6.01 } }).approved);
check('Hedefin üç sıra gerisi ret', !assessBoardBudget({ ...base, leagueTable: rows.map((r) => r.clubId === club.id ? { ...r, pts: 0, gf: 0, ga: 10 } : { ...r, pts: 12 }) }).approved);
check('Maaş tavanı ihlali ek kaynak verilmesini engeller', !assessBoardBudget({ ...base, squad: squad.map((p) => ({ ...p, wage: 1000 })) }).approved);
check('Net transfer harcaması mali ihlalse ret', !assessBoardBudget({ ...base, transferLog: [transaction({ kind: 'in', fromClubId: 'other', toClubId: club.id, fee: 15.1 })] }).approved);
const academyFee = transaction({ kind: 'youth', fromClubId: null, toClubId: club.id, fee: 0.3 });
check('Akademi kayıt bedeli de aynı kulübün transfer harcamasıdır', clubSeasonTransferTotals([academyFee], club.id, 1).spendM === 0.3 && !assessBoardBudget({ ...base, transferLog: [transaction({ kind: 'in', toClubId: club.id, fee: 14.9 }), academyFee] }).approved);
check('Eski kayıtlarda güven eksikse mevcut 70 varsayılanı kullanılır', assessBoardBudget({ ...base, career: { ...career, boardConfidence: undefined } }).approved);
check('Şampiyonluk ve açık lig hedefleri yorumlanır', boardTargetRank('Şampiyonluk', 12) === 1 && boardTargetRank('Yükselme yarışı (ilk 4)', 12) === 4 && boardTargetRank('Ligde kal', 12) === 10);
check('Kulüp ölçeğine göre tutar alt ve üst sınırlıdır', assessBoardBudget({ ...base, club: { ...club, transferBudget: 0.5 }, budget: { tb: 0 } }).amount === 0.2 && assessBoardBudget({ ...base, club: { ...club, transferBudget: 100 }, budget: { tb: 0 } }).amount === 5);
const otherClubEntry = transaction({ kind: 'in', fromClubId: 'another', toClubId: 'old_club', fee: 999 });
const ownSale = transaction({ fee: 10, sellOnPaid: 4 });
const totals = clubSeasonTransferTotals([otherClubEntry, ownSale, transaction({ seasonNo: 2, kind: 'in', toClubId: club.id, fee: 99 })], club.id, 1);
check('Mali hesap yalnız ilgili kulüp/sezonu ve satış payı sonrası net geliri kullanır', totals.spendM === 0 && totals.incomeM === 6 && assessBoardBudget({ ...base, transferLog: [otherClubEntry] }).approved);
const refusal = message(60, false);
check('Retten sonra 30 gün bekleme; 30. gün tekrar mümkün', !assessBoardBudget({ ...base, inbox: [refusal] }).canRequest && !assessBoardBudget({ ...base, career: { ...career, day: 89 }, inbox: [refusal] }).canRequest && assessBoardBudget({ ...base, career: { ...career, day: 90 }, inbox: [refusal] }).canRequest);
check('Onay sezon boyunca tekrarlanamaz', !assessBoardBudget({ ...base, career: { ...career, day: 200 }, inbox: [message(60, true)] }).canRequest);
check('Yeni sezon veya farklı kulüp önceki kararla kilitlenmez', assessBoardBudget({ ...base, seasonNo: 2, inbox: [message(60, true)] }).canRequest && assessBoardBudget({ ...base, inbox: [message(60, true, 1, 'another_club')] }).canRequest);
const old = { id: `board-budget-request-${club.id}-60`, kind: 'yonetim', title: 'Bütçe talebi yanıtlandı', body: 'Eski sabit yanıt', day: 60, read: false } as InboxMsg;
check('Eski sabit yanıt ve bozuk/yabancı kimlikler yeni özelliği kilitlemez', assessBoardBudget({ ...base, inbox: [old, { ...message(60, true), day: 59 }, { ...message(60, true), id: `${message(60, true).id}:extra` }] }).canRequest);
check('İşsiz menajer talep gönderemez', !assessBoardBudget({ ...base, career: { ...career, jobSearch: { sinceDay: 60, offers: [], firedFrom: club.id, firedFromLeague: 'gecit', reason: 'Test' } } }).canRequest);

const root = createRoot(dom.window.document.getElementById('root')!);
let game!: ReturnType<typeof useGame>;
const Capture = () => { game = useGame(); return null; };
try {
  await deleteSave(1);
  await act(async () => root.render(<GameProvider career={career}><Capture /></GameProvider>));
  const snapshot = clone(game.snapshotForBackup()) as any;
  snapshot.career.day = 60; snapshot.career.boardConfidence = 70; snapshot.day = 60;
  snapshot.budget.tb = 6;
  snapshot.table.gecit = snapshot.table.gecit.map((r: TableRow) => r.clubId === club.id ? { ...r, p: 4, w: 4, d: 0, l: 0, gf: 8, ga: 1, pts: 12 } : { ...r, p: 4, w: 0, d: 0, l: 4, gf: 1, ga: 8, pts: 0 });
  snapshot.inbox.push(old);
  await act(async () => root.render(<></>));
  const revision = await writeSave(snapshot);
  await act(async () => root.render(<GameProvider key="approve" career={snapshot.career} snapshot={snapshot} initialUpdatedAt={revision.updatedAt}><Capture /></GameProvider>));
  const beforeRequest = parseImportFile(JSON.stringify({ format: 'hm26-save', version: 4, exportedAt: 1, blob: game.snapshotForBackup() })).blob as any; // compare after ordinary import/read normalization
  let first: ReturnType<typeof game.requestBoardBudget> | undefined, second: ReturnType<typeof game.requestBoardBudget> | undefined;
  await act(async () => { first = game.requestBoardBudget(); second = game.requestBoardBudget(); });
  check('Gerçek store onayı bakiyeyi artırır; aynı işlemde ikinci tıklama durur', !!first?.ok && first.approved === true && first.amount === 1.2 && second?.ok === false && game.budget.tb === 7.2);
  check('Onay haberi ve bakiye aynı state içinde tek kez üretilir', game.inbox.filter((m) => m.id === boardBudgetMessageId(club.id, 1, 60, true)).length === 1 && game.inbox.some((m) => m.title === 'Ek bütçe talebi onaylandı' && m.body.includes('₺1.2M')));
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 500)); });
  const saved = await readSave(1);
  const blob = saved?.blob as any;
  check('Onay ve bütçe elle kayıt gerektirmeden aynı IndexedDB kaydına yazılır', blob?.budget.tb === 7.2 && blob.inbox.some((m: InboxMsg) => m.id === boardBudgetMessageId(club.id, 1, 60, true)));
  check('Yeni kalıcı alan veya kayıt sürümü eklenmez', blob?.version === 4 && JSON.stringify(Object.keys(blob).sort()) === JSON.stringify(Object.keys(beforeRequest).sort()) && JSON.stringify(Object.keys(blob.career).sort()) === JSON.stringify(Object.keys(beforeRequest.career).sort()), `top=${Object.keys(blob ?? {}).filter((key) => !(key in beforeRequest)).join(',')}; career=${Object.keys(blob?.career ?? {}).filter((key) => !(key in beforeRequest.career)).join(',')}`);
  if (!saved) throw new Error('Onay kaydedilmedi');
  const imported = parseImportFile(JSON.stringify({ format: 'hm26-save', version: 4, exportedAt: 1, blob: saved.blob })).blob;
  await act(async () => root.render(<GameProvider key="reload" career={imported.career} snapshot={imported} initialUpdatedAt={saved.meta.updatedAt}><Capture /></GameProvider>));
  check('Yedek doğrulama ve yeniden açılışta para ve sezon sınırı korunur', game.budget.tb === 7.2 && !game.boardBudgetRequest.canRequest && game.requestBoardBudget().ok === false);
  await act(async () => root.render(<></>));
  await deleteSave(1);
  await act(async () => root.unmount());
} catch (error) { failed++; console.error(error); }
finally { dom.window.close(); }
console.log(`\n${passed}/${passed + failed} yönetim bütçesi kontrolü geçti.`);
if (failed) process.exitCode = 1;
