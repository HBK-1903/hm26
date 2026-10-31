// HM26 — Aşama 1 veri çekirdeği: IndexedDB 3 yuvası + migrasyon + dışa/içe aktarma (§3.3/§16.2)
import { Career } from '../types';
import { clubByIdSafe } from '../data/clubs';
import { careerSeasonLabel } from '../data/careerTimeline';
import { restoreLiveCheckpoint, validLiveCheckpoint, type LiveMatchCheckpoint } from '../engine/liveCheckpoint';

const DB_NAME = 'manager26';
const DB_VERSION = 1;
// v3: C1 maç istatistik bloğu + C2 sıkıştırılmış olaylar + C3 fikstür xG çiftleri
// v4: olay türleri ve sezon geçmişi. v5: isteğe bağlı, doğrulanabilir canlı maç devam kaydı.
// The version bump prevents older builds from silently overwriting an active match.
export const SAVE_VERSION = 5;

// FIX P1: singleton — upgrade hâlâ çalışırken resolve yok; bütün çağrılar hazır bağla da çalışır
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    let abandoned = false;
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      const oldV = e.oldVersion;
      // §16.5 — sürüm kontrolü: v1 temel mağazalar
      if (oldV < 1) {
        if (!db.objectStoreNames.contains('saves')) {
          const st = db.createObjectStore('saves', { keyPath: 'slot' });
          st.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      }
      // ⛔ burada resolve YOK — upgrade transaction'ı hâlâ sürüyor
    };
    req.onsuccess = () => {
      const db = req.result as unknown as IDBDatabase;
      // A blocked request can succeed after its caller has already given up.
      if (abandoned) { db.close(); return; }
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => { abandoned = true; reject(new Error('db-blocked-by-old-tab')); };
  });
  // A transient permission/connection failure must not poison every later retry.
  dbPromise = opening.catch((error) => { dbPromise = null; throw error; });
  return dbPromise;
}

/** İlk kurulursa hemen ısıtıcıyı ateşle (fire-and-forget) — kullanıcı "Başla" diyerek germez */
export function warmDb(): void { void openDB().catch(() => { /* sessiz */ }); }

export interface SaveMeta {
  slot: number;
  clubId: string;
  clubName: string;
  managerName: string;
  eraName: string;
  kzp: number;
  day: number;
  week: number;
  season: string; // "2026–27"
  updatedAt: number;
}

/** Human-readable fast-continue label; kept pure so metadata fallbacks stay regression-tested. */
export function quickContinueLabel(meta: Pick<SaveMeta, 'clubName' | 'day'>): string {
  return `${meta.clubName?.trim() || 'Kulüp'} · Gün ${meta.day}`;
}

export interface SaveBlob {
  version: number;
  career: Career;
  day: number;
  /** Mevcut oyun durumunda saklanan 1 tabanlı sezon; eski kayıtlarda bulunmayabilir. */
  seasonNo?: number;
  tableState: unknown;
  fixtureState: unknown;
  cupState: unknown;
  inboxState: unknown;
  tacticState: unknown;
  extraSquads: unknown;
  liveMatchCheckpoint?: LiveMatchCheckpoint;
}

/** Kayıt verisindeki mevcut sezondan yuva etiketini üretir; eski kayıt verisini değiştirmez. */
function recordedSeasonLabel(blob: SaveBlob): string | null {
  const seasonNo = blob?.seasonNo;
  return typeof seasonNo === 'number' && Number.isSafeInteger(seasonNo) && seasonNo >= 1
    ? careerSeasonLabel(seasonNo)
    : null;
}

function displayMeta(meta: SaveMeta, blob: SaveBlob): SaveMeta {
  const season = recordedSeasonLabel(blob);
  return season && season !== meta.season ? { ...meta, season } : meta;
}

export class SaveConflictError extends Error {
  constructor() { super('Bu yuva başka bir sekmede değişti. İlerlemeni kaybetmemek için diğer sekmeyi kontrol et ve kariyeri yeniden aç.'); this.name = 'SaveConflictError'; }
}

interface SaveWriteOptions {
  /** Refuse to replace a slot that another tab filled while the picker was open. */
  onlyIfEmpty?: boolean;
  /** Compare the existing metadata revision inside the same IndexedDB transaction. */
  expectedUpdatedAt?: number | null;
}

export async function writeSave(blob: SaveBlob, options: SaveWriteOptions = {}): Promise<SaveMeta> {
  const db = await openDB();
  const meta: SaveMeta = {
    slot: blob.career.slot,
    clubId: blob.career.clubId,
    clubName: clubByIdSafe(blob.career.clubId)?.name ?? '',
    managerName: blob.career.manager.name,
    eraName: blob.career.manager.era,
    kzp: blob.career.manager.challengePoints,
    day: blob.day,
    week: blob.career.week,
    season: recordedSeasonLabel(blob) ?? '2026–27',
    updatedAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = (db as IDBDatabase).transaction(['saves', 'meta'], 'readwrite');
    const saves = tx.objectStore('saves');
    let conflict: SaveConflictError | null = null;
    const get = saves.get(blob.career.slot);
    get.onsuccess = () => {
      const current = get.result as { meta?: { updatedAt?: number } } | undefined;
      const currentRevision = current?.meta?.updatedAt;
      if ((options.onlyIfEmpty && current) ||
          (options.expectedUpdatedAt === null && current) ||
          (typeof options.expectedUpdatedAt === 'number' && (!current || currentRevision !== options.expectedUpdatedAt))) {
        conflict = new SaveConflictError();
        tx.abort();
        return;
      }
      // Reuse the existing updatedAt field as a monotonic revision, including same-millisecond writes.
      meta.updatedAt = Math.max(Date.now(), typeof currentRevision === 'number' && Number.isFinite(currentRevision) ? currentRevision + 1 : 0);
      saves.put({ slot: blob.career.slot, meta, blob });
      tx.objectStore('meta').put({ lastSlot: blob.career.slot }, 'lastActive');
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(conflict ?? tx.error ?? new Error('Kayıt yazılamadı.'));
    tx.onabort = () => reject(conflict ?? tx.error ?? new Error('Kayıt işlemi iptal edildi.'));
  });
  return meta;
}

export async function writeSaveRetry(blob: SaveBlob, retries = 3, options: SaveWriteOptions = {}): Promise<SaveMeta | null> {
  for (let i = 0; i < retries; i++) {
    try { return await writeSave(blob, options); }
    catch (error) {
      if (error instanceof SaveConflictError) throw error;
      if (i + 1 < retries) await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
  return null;
}

export async function readSave(slot: number): Promise<{ meta: SaveMeta; blob: SaveBlob } | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = (db as IDBDatabase).transaction('saves', 'readonly');
    const req = tx.objectStore('saves').get(slot);
    req.onsuccess = () => {
      const r = req.result;
      if (!r) return resolve(null);
      // Sürüm kontrol (§3.3): bilinmeyen sürümü reddetmek yerine migrasyon denemesi
      const blob = r.blob as SaveBlob;
      if (typeof blob.version === 'number' && blob.version > SAVE_VERSION) return reject(new Error('Bu kayıt daha yeni bir sürümdeyken oluşturulmuş.'));
      resolve({ meta: displayMeta(r.meta, blob), blob: migrateBlob(blob) });
    };
    req.onerror = () => reject(req.error);
  });
}

function migrateBlob(blob: SaveBlob): SaveBlob {
  // v1 → v2 (SPEC Böl.III): yeni kariyer alanlarını varsayılanlarla doldur
  const club = clubByIdSafe(blob.career?.clubId ?? '');
  const car = blob.career as unknown as Record<string, unknown>;
  return {
    ...blob,
    career: {
      ...blob.career,
      clubFacilities: (car.clubFacilities as Career['clubFacilities']) ?? (club ? { ...club.facilities } : { training: 2, health: 2, academy: 2, analysis: 2 }),
      boardConfidence: (car.boardConfidence as number) ?? 70,
      trophyCabinet: (car.trophyCabinet as Career['trophyCabinet']) ?? [],
      shortlist: (car.shortlist as string[]) ?? [],
    },
    version: SAVE_VERSION,
  };
}

export async function listSaves(): Promise<SaveMeta[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = (db as IDBDatabase).transaction('saves', 'readonly');
    const req = tx.objectStore('saves').getAll();
    req.onsuccess = () => resolve((req.result as { meta: SaveMeta; blob: SaveBlob }[])
      .map(({ meta, blob }) => displayMeta(meta, blob))
      .sort((a, b) => a.slot - b.slot));
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSave(slot: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    // v0.9.4: silinen yuva son aktif kayıttıysa lastActive meta'sı da temizlenir (splash "Devam Et" hayaleti kalmasın)
    const tx = (db as IDBDatabase).transaction(['saves', 'meta'], 'readwrite');
    tx.objectStore('saves').delete(slot);
    const la = tx.objectStore('meta').get('lastActive');
    la.onsuccess = () => {
      if ((la.result as { lastSlot?: number } | undefined)?.lastSlot === slot) {
        tx.objectStore('meta').delete('lastActive');
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function lastActiveSlot(): Promise<number | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = (db as IDBDatabase).transaction('meta', 'readonly');
    const req = tx.objectStore('meta').get('lastActive');
    req.onsuccess = () => resolve(req.result?.lastSlot ?? null);
    req.onerror = () => resolve(null);
  });
}

export function exportFileName(clubName: string, day: number): string {
  const safe = clubName.replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `hm26-${safe}-gun${day}.json`;
}

// Dışa aktarma: masa v1 imzalı JSON dosyası
export function exportSaveFile(blob: SaveBlob, meta: SaveMeta): Blob {
  const payload = { format: 'hm26-save', version: SAVE_VERSION, exportedAt: Date.now(), meta, blob };
  return new Blob([JSON.stringify(payload)], { type: 'application/json' });
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isPositiveInteger = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 1;
const isObjectArray = (value: unknown): value is Record<string, unknown>[] => Array.isArray(value) && value.every(isRecord);

/** Validate the core the game actually reads before a backup can overwrite a slot.
 * Older optional fields remain optional and continue through the existing migration. */
function validImportedBlob(value: unknown): value is SaveBlob {
  if (!isRecord(value) || !isRecord(value.career)) return false;
  const career = value.career;
  if (!isRecord(career.manager) || !isRecord(career.settings)) return false;
  const manager = career.manager;
  const settings = career.settings;
  const settingChoices: Record<string, string[]> = {
    goalPace: ['dusuk', 'dengeli', 'yuksek'], randomness: ['low', 'normal', 'high'],
    marketRefresh: ['sakin', 'dengeli', 'yogun'], boardPressure: ['dusuk', 'orta', 'yuksek'],
    injuryRate: ['dusuk', 'normal', 'yuksek'], textSize: ['kucuk', 'normal', 'buyuk'],
    matchSpeed: ['yavas', 'normal', 'hizli'],
  };
  // Legacy saves may omit later settings, but any setting they do contain must have a valid type/value.
  if (Object.entries(settingChoices).some(([key, choices]) => settings[key] !== undefined && !choices.includes(String(settings[key]))) ||
      ['highContrast', 'reduceMotion', 'suggestions'].some((key) => settings[key] !== undefined && typeof settings[key] !== 'boolean') ||
      !Object.keys(settings).length || (career.pending != null && !isRecord(career.pending))) return false;
  if (typeof career.clubId !== 'string' || !clubByIdSafe(career.clubId) ||
      !isPositiveInteger(career.slot) || career.slot > 3 || !isFiniteNumber(career.seed) ||
      !isPositiveInteger(career.day) || !isPositiveInteger(career.week) || !isPositiveInteger(value.day) ||
      typeof manager.name !== 'string' || !manager.name.trim() ||
      !['eskiFutbolcu', 'analist', 'altyapi', 'planlamaci'].includes(String(manager.background)) ||
      !['yerlesik', 'gecis', 'acik'].includes(String(manager.era)) ||
      !['rahat', 'dengeli', 'zorlu', 'efsanevi', 'ozel'].includes(String(manager.difficulty)) ||
      !isFiniteNumber(manager.challengePoints)) return false;
  if (value.version !== undefined && (!isPositiveInteger(value.version) || value.version > SAVE_VERSION)) return false;
  if (value.seasonNo !== undefined && !isPositiveInteger(value.seasonNo)) return false;
  if (value.liveMatchCheckpoint !== undefined) {
    if (!validLiveCheckpoint(value.liveMatchCheckpoint)) return false;
    const cp = value.liveMatchCheckpoint;
    if (cp.fixture.day !== career.day || (cp.fixture.homeId !== career.clubId && cp.fixture.awayId !== career.clubId) ||
        (value.seasonNo !== undefined && cp.seasonNo !== value.seasonNo)) return false;
  }
  if (!isObjectArray(value.fixtures) || !isObjectArray(value.friendlies) ||
      !isObjectArray(value.inbox) || !isObjectArray(value.tactics) || !value.tactics.length ||
      (value.seasonHistory != null && !isObjectArray(value.seasonHistory)) ||
      !isRecord(value.budget) || !isFiniteNumber(value.budget.tb)) return false;
  const validFixture = (fixture: Record<string, unknown>) =>
    typeof fixture.homeId === 'string' && !!clubByIdSafe(fixture.homeId) &&
    typeof fixture.awayId === 'string' && !!clubByIdSafe(fixture.awayId) &&
    isFiniteNumber(fixture.day) && typeof fixture.played === 'boolean';
  if (![...value.fixtures, ...value.friendlies].every(validFixture) ||
      !value.tactics.every((plan) => typeof plan.id === 'string' && typeof plan.name === 'string' &&
        typeof plan.formation === 'string' && typeof plan.plan === 'string' && isRecord(plan.setPieces)) ||
      !value.inbox.every((message) => typeof message.id === 'string' && typeof message.title === 'string' && typeof message.body === 'string')) return false;
  for (const key of ['extraPlayers', 'incomingOffers', 'transferLog', 'matchReports', 'loans', 'internationalArchive', 'transfers']) {
    if (value[key] != null && !isObjectArray(value[key])) return false;
  }
  for (const key of ['removedPlayers', 'transferListed']) {
    if (value[key] != null && (!Array.isArray(value[key]) || !(value[key] as unknown[]).every((item) => typeof item === 'string'))) return false;
  }
  for (const key of ['playerClub', 'playerPatch', 'extraSquads', 'oppMatchDays', 'promises', 'minuteNoted', 'playerStats']) {
    if (value[key] != null && !isRecord(value[key])) return false;
  }
  if (isRecord(value.extraSquads) && !Object.values(value.extraSquads).every(isObjectArray)) return false;
  if (value.leagueOf !== undefined && (!isRecord(value.leagueOf) ||
      !Object.values(value.leagueOf).every((league) => league === 'zirve' || league === 'gecit' || league === 'kok'))) return false;
  if (value.table !== undefined && (!isRecord(value.table) ||
      !['zirve', 'gecit', 'kok'].every((league) => isObjectArray((value.table as Record<string, unknown>)[league])))) return false;
  if (value.cup !== undefined) {
    const cup = value.cup;
    if (!isRecord(cup) || !isRecord(cup.groups)) return false;
    const groups = cup.groups;
    if (!'ABCDEFGHI'.split('').every((group) => Array.isArray(groups[group])) ||
        !Object.values(groups).every((group) => Array.isArray(group) && group.every((id) => typeof id === 'string' && !!clubByIdSafe(id))) ||
        !isObjectArray(cup.fixtures) || !cup.fixtures.every(validFixture) || !isObjectArray(cup.rounds) ||
        !cup.rounds.every((round) => typeof round.name === 'string' && isFiniteNumber(round.day) && isObjectArray(round.ties))) return false;
  }
  if (value.liveMatchCheckpoint !== undefined) {
    // A matching checksum only detects accidental edits. Verify the real replay
    // before allowing an imported backup to replace an existing career slot.
    try {
      const cp = value.liveMatchCheckpoint as LiveMatchCheckpoint;
      restoreLiveCheckpoint(cp, typeof value.seasonNo === 'number' ? value.seasonNo : 1, career.clubId, career.day as number);
    } catch { return false; }
  }
  return true;
}

export function parseImportFile(text: string): { blob: SaveBlob } {
  let data: unknown;
  try { data = JSON.parse(text); }
  catch { throw new Error('Dosya okunamadı veya JSON biçimi bozuk.'); }
  // 'manager26-save' rebrand öncesi dosyaların formatıdır; eski yedekler desteklenir.
  if (!isRecord(data) || (data.format !== 'hm26-save' && data.format !== 'manager26-save')) throw new Error('Dosya HM26 kariyer dosyası değil.');
  if (!isPositiveInteger(data.version) || data.version > SAVE_VERSION ||
      (isRecord(data.blob) && isFiniteNumber(data.blob.version) && data.blob.version > SAVE_VERSION)) {
    throw new Error(`Sürüm uyumsuz: dosya v${String(data.version)}, uygulama v${SAVE_VERSION}. Güncelleyin.`);
  }
  if (!validImportedBlob(data.blob)) throw new Error('Yedek dosyası eksik veya bozuk; mevcut kariyer değiştirilmedi.');
  return { blob: migrateBlob(data.blob) };
}
