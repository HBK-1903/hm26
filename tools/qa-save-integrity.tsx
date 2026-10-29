// Store-level save validation, migration, transaction conflicts and restore ordering.
import 'fake-indexeddb/auto';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { GameProvider, useGame } from '../src/store/game';
import { parseImportFile, readSave, writeSave, deleteSave, SaveConflictError, SAVE_VERSION, type SaveBlob } from '../src/store/persist';
import type { Career } from '../src/types';

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
const career = { slot: 1, manager: { name: 'Kayıt Testi', portrait: 0, background: 'eskiFutbolcu', era: 'gecis', difficulty: 'dengeli', challengePoints: 40 }, clubId: 'denizli_yesilova', seed: 12345, day: 1, week: 1, settings: { goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli', boardPressure: 'orta', injuryRate: 'normal', textSize: 'normal', highContrast: false, reduceMotion: false, matchSpeed: 'normal', suggestions: true }, pending: { marketShortlist: [], activeProject: null } } as Career;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const envelope = (blob: unknown, format = 'hm26-save', version = 4) => JSON.stringify({ format, version, exportedAt: 123, blob });
const root = createRoot(dom.window.document.getElementById('root')!);
let game: ReturnType<typeof useGame>;
const Capture = () => { game = useGame(); return null; };

try {
  const originalOpen = indexedDB.open.bind(indexedDB);
  let firstOpen = true;
  (indexedDB as any).open = (...args: Parameters<IDBFactory['open']>) => {
    if (firstOpen) { firstOpen = false; throw new DOMException('temporary', 'UnknownError'); }
    return originalOpen(...args);
  };
  let openFailed = false;
  try { await readSave(1); } catch { openFailed = true; }
  check('Geçici veritabanı açılış hatasından sonra tekrar deneme çalışır', openFailed && await readSave(1) === null);
  (indexedDB as any).open = originalOpen;

  await act(async () => root.render(<GameProvider career={career}><Capture /></GameProvider>));
  let saved = false;
  await act(async () => { saved = await game.saveNow(); });
  let original = await readSave(1);
  check('Gerçek GameProvider durumu sürüm 4 ile yazılır', saved && original?.blob.version === SAVE_VERSION && SAVE_VERSION === 4);
  if (!original) throw new Error('Başlangıç kaydı yok');
  await act(async () => {
    game.setCareer((c) => ({ ...c, settings: { ...c.settings, reduceMotion: true } }));
    game.setBudget((budget) => ({ ...budget, tb: budget.tb + 1 }));
    game.setInbox((inbox) => [...inbox, { id: 'qa-save', kind: 'yonetim', title: 'Test', body: 'Kayıt', day: 1, read: false }]);
  });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 450)); });
  original = await readSave(1);
  check('Ayar, bütçe ve gelen kutusu değişiklikleri kendiliğinden birlikte kaydedilir', !!original?.blob.career.settings.reduceMotion && (original.blob as any).budget.tb === game.budget.tb && (original.blob as any).inbox.some((m: any) => m.id === 'qa-save'));
  if (!original) throw new Error('Otomatik kayıt yok');
  const baseline = original.blob as SaveBlob & Record<string, any>;
  // Stop the fresh-career startup timer before the isolated transaction tests.
  await act(async () => root.render(<></>));
  const roundTrip = parseImportFile(envelope(baseline));
  check('Tam yedek başarıyla doğrulanır', roundTrip.blob.career.manager.name === career.manager.name && roundTrip.blob.version === 4);

  const legacy = clone(baseline);
  legacy.version = 1;
  delete legacy.career.clubFacilities; delete legacy.career.boardConfidence; delete legacy.career.trophyCabinet;
  delete legacy.seasonNo; delete legacy.seasonHistory; delete legacy.matchReports; delete legacy.international;
  const migrated = parseImportFile(envelope(legacy, 'manager26-save', 1)).blob as SaveBlob & Record<string, any>;
  check('Eski ad, eski sürüm ve opsiyonel alan eksikleri migrasyonla kabul edilir', migrated.version === 4 && migrated.career.boardConfidence === 70 && !!migrated.career.clubFacilities);
  // Synthetic career created by the actual initial public release (commit 3fb2aa7314), not a real user's data.
  const historical = parseImportFile(readFileSync('tools/fixtures/save-v2-original.json', 'utf8')).blob as SaveBlob & Record<string, any>;
  check('Gerçek eski uygulamanın ürettiği v2 yedek korunarak açılır', historical.version === 4 && historical.career.manager.name === 'Eski Sürüm Testi' && historical.fixtures.length === 396);
  const reports = clone(baseline);
  reports.matchReports = Array.from({ length: 256 }, (_, i) => ({ id: String(i), day: i + 1 }));
  check('256 maçlık mevcut arşiv import sırasında kesilmez veya çoğaltılmaz', (parseImportFile(envelope(reports)).blob as any).matchReports.length === 256);

  const corruptions: Array<[string, (b: any) => void]> = [
    ['kariyer eksik', (b) => { delete b.career; }],
    ['bilinmeyen kulüp', (b) => { b.career.clubId = 'olmayan_kulup'; }],
    ['menajer eksik', (b) => { delete b.career.manager; }],
    ['menajer dönemi bozuk', (b) => { b.career.manager.era = 'x'; }],
    ['ayarlar eksik', (b) => { delete b.career.settings; }],
    ['ayarlar boş', (b) => { b.career.settings = {}; }],
    ['ayar türü bozuk', (b) => { b.career.settings.reduceMotion = 'evet'; }],
    ['bilinmeyen ayar değeri', (b) => { b.career.settings.goalPace = 'bilinmiyor'; }],
    ['yuva aralığı bozuk', (b) => { b.career.slot = 9; }],
    ['gün bozuk', (b) => { b.career.day = -3; }],
    ['fikstür eksik', (b) => { delete b.fixtures; }],
    ['fikstür satırı bozuk', (b) => { b.fixtures = [{}]; }],
    ['fikstürde bilinmeyen kulüp', (b) => { b.fixtures[0].homeId = 'olmayan'; }],
    ['hazırlık maçları bozuk', (b) => { b.friendlies = {}; }],
    ['gelen kutusu bozuk', (b) => { b.inbox = [null]; }],
    ['taktikler eksik', (b) => { b.tactics = []; }],
    ['taktik satırı bozuk', (b) => { b.tactics = [{}]; }],
    ['bütçe eksik', (b) => { delete b.budget; }],
    ['puan tablosu bozuk', (b) => { b.table.zirve = null; }],
    ['kupa grupları eksik', (b) => { delete b.cup.groups; }],
    ['kupa eleme turu bozuk', (b) => { b.cup.rounds = [{}]; }],
    ['dünya kadrosu bozuk', (b) => { b.extraSquads = { x: null }; }],
    ['arşiv satırı bozuk', (b) => { b.matchReports = [null]; }],
    ['oyuncu listesi bozuk', (b) => { b.removedPlayers = [null]; }],
    ['iç sürüm gelecekten', (b) => { b.version = 5; }],
  ];
  let rejected = 0;
  for (const [name, mutate] of corruptions) {
    const bad = clone(baseline); mutate(bad);
    try { parseImportFile(envelope(bad)); } catch { rejected++; continue; }
    console.error(`   Kabul edilmemeliydi: ${name}`);
  }
  check('Eksik/bozuk çekirdek ve yanlış türler yazılmadan reddedilir', rejected === corruptions.length, `${rejected}/${corruptions.length}`);
  let invalidVersions = 0;
  for (const version of [0, -1, 1.5, 5, '4', null]) {
    try { parseImportFile(envelope(baseline, 'hm26-save', version as number)); } catch { invalidVersions++; }
  }
  check('Geçersiz veya gelecek yedek sürümleri reddedilir', invalidVersions === 6);
  check('Doğrulama kaynak kariyer nesnesini değiştirmez', baseline.career.manager.name === career.manager.name && baseline.version === 4);

  const now = Date.now;
  Date.now = () => 42;
  const first = await writeSave(baseline, { expectedUpdatedAt: original.meta.updatedAt });
  const second = await writeSave(baseline, { expectedUpdatedAt: first.updatedAt });
  Date.now = now;
  check('Aynı milisaniyedeki iki kayıt bile ayrı revision alır', second.updatedAt > first.updatedAt && first.updatedAt > original.meta.updatedAt);
  let conflict = false;
  try { await writeSave({ ...baseline, career: { ...baseline.career, manager: { ...baseline.career.manager, name: 'Bayat' } } }, { expectedUpdatedAt: first.updatedAt }); }
  catch (error) { conflict = error instanceof SaveConflictError; }
  check('Bayat sekme transaction içinde durdurulur, yeni kayıt korunur', conflict && (await readSave(1))?.blob.career.manager.name === career.manager.name);
  let occupied = false;
  try { await writeSave(baseline, { onlyIfEmpty: true }); } catch (error) { occupied = error instanceof SaveConflictError; }
  check('Dolu yuvaya boş-yuva importu atomik olarak reddedilir', occupied && (await readSave(1))?.meta.updatedAt === second.updatedAt);

  await act(async () => root.render(<GameProvider key="restore" career={career} snapshot={baseline} initialUpdatedAt={second.updatedAt}><Capture /></GameProvider>));
  const replacement = clone(baseline);
  replacement.career.manager.name = 'İçe Alınan';
  let pendingResult = true, restoreResult = false;
  await act(async () => {
    const pending = game.saveNow();
    const restore = game.restoreBackup(replacement);
    [pendingResult, restoreResult] = await Promise.all([pending, restore]);
  });
  await act(async () => { window.dispatchEvent(new dom.window.Event('pagehide')); });
  check('İçe aktarma, sıradaki eski kaydı ve sonraki pagehide kaydını geçersiz kılar', !pendingResult && restoreResult && (await readSave(1))?.blob.career.manager.name === 'İçe Alınan');
  check('İçe aktarma sonrası eski oturum yeniden yazamaz', !(await game.saveNow()));

  const firstRestore = await readSave(1);
  if (!firstRestore) throw new Error('İçe alınan kayıt yok');
  await act(async () => root.render(<GameProvider key="inflight" career={firstRestore.blob.career} snapshot={firstRestore.blob} initialUpdatedAt={firstRestore.meta.updatedAt}><Capture /></GameProvider>));
  const secondReplacement = clone(baseline); secondReplacement.career.manager.name = 'Sıralı Yedek';
  let inFlight = false, afterInFlight = false;
  await act(async () => {
    const pending = game.saveNow();
    // Let the write enter IndexedDB before starting the restore.
    await Promise.resolve(); await Promise.resolve();
    const restore = game.restoreBackup(secondReplacement);
    [inFlight, afterInFlight] = await Promise.all([pending, restore]);
  });
  check('Başlamış kayıt biter, yedek sırayla en son yazılır', inFlight && afterInFlight && (await readSave(1))?.blob.career.manager.name === 'Sıralı Yedek');

  const current = await readSave(1);
  if (!current) throw new Error('İçe alınan kayıt yok');
  await act(async () => root.render(<GameProvider key="failure" career={current.blob.career} snapshot={current.blob} initialUpdatedAt={current.meta.updatedAt}><Capture /></GameProvider>));
  const originalTransaction = IDBDatabase.prototype.transaction;
  (IDBDatabase.prototype as any).transaction = function (...args: any[]) {
    if (args[1] === 'readwrite') throw new DOMException('quota', 'QuotaExceededError');
    return (originalTransaction as any).apply(this, args);
  };
  let failureResult = true;
  await act(async () => { failureResult = await game.restoreBackup(baseline); });
  (IDBDatabase.prototype as any).transaction = originalTransaction;
  check('İçe aktarma yazılamazsa önceki kayıt korunur ve hata görünür', !failureResult && !!game.saveError && (await readSave(1))?.blob.career.manager.name === 'Sıralı Yedek');
  let retried = false;
  await act(async () => { retried = await game.saveNow(); });
  check('Başarısız içe aktarma kilidi kaldırır; kayıt yeniden denenebilir', retried && game.saveError === null);
  const unmountedSave = game.saveNow;
  await act(async () => root.render(<></>));
  const newer = clone(baseline); newer.career.manager.name = 'Yeni Oturum';
  await writeSave(newer);
  check('Kapanmış oturumun gecikmeli kaydı yeni oturumu değiştiremez', !(await unmountedSave()) && (await readSave(1))?.blob.career.manager.name === 'Yeni Oturum');
  await act(async () => root.unmount());
  await deleteSave(1);
} catch (error) { failed++; console.error(error); }
finally { dom.window.close(); }
console.log(`\n${passed}/${passed + failed} kayıt bütünlüğü kontrolü geçti.`);
if (failed) process.exitCode = 1;
