// HM26 — Aşama 1 veri çekirdeği: IndexedDB 3 yuvası + migrasyon + dışa/içe aktarma (§3.3/§16.2)
import { Career } from '../types';
import { clubByIdSafe } from '../data/clubs';
import { careerSeasonLabel } from '../data/careerTimeline';

const DB_NAME = 'manager26';
const DB_VERSION = 1;
// v3: C1 maç istatistik bloğu + C2 sıkıştırılmış olaylar + C3 fikstür xG çiftleri
// v4: olay türleri genişletildi (kurtarış/VAR/sakatlık) + sezon geçmişi özet alanları (hepsi opsiyonel)
export const SAVE_VERSION = 4;

// FIX P1: singleton — upgrade hâlâ çalışırken resolve yok; bütün çağrılar hazır bağla da çalışır
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
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
      // FIX P1: başka sekme upgrade istiyorsa ona yol ver — hata şeridi yerine doomed re-open
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('db-blocked-by-old-tab'));
  });
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

export async function writeSave(blob: SaveBlob): Promise<SaveMeta> {
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
    tx.objectStore('saves').put({ slot: blob.career.slot, meta, blob });
    tx.objectStore('meta').put({ lastSlot: blob.career.slot }, 'lastActive');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return meta;
}

export async function writeSaveRetry(blob: SaveBlob, retries = 3): Promise<SaveMeta | null> {
  for (let i = 0; i < retries; i++) {
    try { return await writeSave(blob); }
    catch { await new Promise((r) => setTimeout(r, 250 * (i + 1))); }
  }
  return null; // sessiz kayıp yerine null — çağırıcı toast gösterir
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

export function parseImportFile(text: string): { blob: SaveBlob } {
  const data = JSON.parse(text);
  // 'manager26-save' rebrand öncesi (≤v0.7.x) dosyaların formatı — geriye dönük uyum
  if (data?.format !== 'hm26-save' && data?.format !== 'manager26-save') throw new Error('Dosya HM26 kariyer dosyası değil.');
  if (typeof data.version !== 'number' || data.version > SAVE_VERSION) throw new Error(`Sürüm uyumsuz: dosya v${data.version}, uygulama v${SAVE_VERSION}. Güncelleyin.`);
  const blob = data.blob as SaveBlob;
  if (!blob?.career?.clubId || !blob.career.manager?.name) throw new Error('Dosya içeriği bozuk görünüyor.');
  return { blob: migrateBlob(blob) };
}
