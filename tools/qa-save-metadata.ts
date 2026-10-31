// Yuva sezon etiketleri: mevcut kayıt verisinden türetim, eski kayıt ve IndexedDB uyumu.
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { listSaves, readSave, SAVE_VERSION, writeSave, type SaveBlob, type SaveMeta } from '../src/store/persist';

const sample = (slot: number, seasonNo?: number) => ({
  version: SAVE_VERSION,
  day: 12,
  ...(seasonNo === undefined ? {} : { seasonNo }),
  career: {
    slot,
    clubId: 'denizli_yesilova',
    day: 12,
    week: 2,
    manager: { name: `Teknik Direktör ${slot}`, era: 'gecis', challengePoints: 0 },
  },
  matchReports: [{ id: 'korunacak-mac' }],
} as unknown as SaveBlob);

let passed = 0;
const check = (name: string, fn: () => void) => { fn(); passed++; console.log(`✅ ${name}`); };
const first = sample(1, 1);
const second = sample(2, 2);
const before = JSON.stringify(second);
const firstMeta = await writeSave(first);
const secondMeta = await writeSave(second);
const awaitedSecond = await readSave(2);
if (!awaitedSecond) throw new Error('İkinci yuva okunamadı.');
check('İlk sezon doğru yazılır', () => assert.equal(firstMeta.season, '2026–27'));
check('İkinci sezon doğru yazılır', () => assert.equal(secondMeta.season, '2027–28'));
check('Kayıt verisi ve sürümü değiştirilmez', () => {
  assert.equal(JSON.stringify(second), before);
  assert.equal(SAVE_VERSION, 5);
  assert.deepEqual((awaitedSecond.blob as SaveBlob & { matchReports: unknown[] }).matchReports, [{ id: 'korunacak-mac' }]);
});

// Ham eski kayıtta yanlış etiket bulunduğunda okumak etiketi düzeltir, dosyayı yeniden yazmaz.
const rawDb = await new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('manager26', 1);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
const putRaw = async (meta: SaveMeta, blob: SaveBlob) => new Promise<void>((resolve, reject) => {
  const tx = rawDb.transaction('saves', 'readwrite');
  tx.objectStore('saves').put({ slot: meta.slot, meta, blob });
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error);
});
const getRaw = async (slot: number) => new Promise<{ meta: SaveMeta; blob: SaveBlob }>((resolve, reject) => {
  const request = rawDb.transaction('saves', 'readonly').objectStore('saves').get(slot);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const third = sample(3, 5);
await putRaw({ ...firstMeta, slot: 3, season: '2026–27' }, third);
const list = await listSaves();
const readThird = await readSave(3);
const rawThird = await getRaw(3);
check('Eski yuva listesinde gerçek sezon gösterilir', () => assert.equal(list.find((m) => m.slot === 3)?.season, '2030–31'));
check('Tekil kayıt okuması da aynı etiketi gösterir', () => assert.equal(readThird?.meta.season, '2030–31'));
check('Yalnız okumak eski kayıt veya metaveriyi değiştirmez', () => {
  assert.equal(rawThird.meta.season, '2026–27');
  assert.deepEqual(rawThird.blob, third);
});

const legacy = sample(3);
await putRaw({ ...firstMeta, slot: 3, season: 'Eski kayıt etiketi' }, legacy);
const legacyList = await listSaves();
const legacyRead = await readSave(3);
check('Sezon numarası bulunmayan eski kayıt etiketi korunur', () => {
  assert.equal(legacyList.find((m) => m.slot === 3)?.season, 'Eski kayıt etiketi');
  assert.equal(legacyRead?.meta.season, 'Eski kayıt etiketi');
});
check('Yuva sırası korunur', () => assert.deepEqual(legacyList.map((m) => m.slot), [1, 2, 3]));

const invalid = sample(3, -1);
await putRaw({ ...firstMeta, slot: 3, season: 'Eski etiket' }, invalid);
const invalidRead = await readSave(3);
check('Geçersiz sezon numarası etiket olarak kullanılmaz', () => assert.equal(invalidRead?.meta.season, 'Eski etiket'));

rawDb.close();
console.log(`\n${passed}/${passed} sezon metaverisi kontrolü geçti.`);
