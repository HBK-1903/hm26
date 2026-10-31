// Real IndexedDB regression: a stale save must not satisfy the career-ready wait.
import { strict as assert } from 'node:assert';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { waitForCareerSave } from './qa-browser-save.mjs';

const base = process.env.HM26_BASE_URL ?? 'http://127.0.0.1:4173';
const executablePath = process.env.HM26_CHROMIUM;
const launchOptions = executablePath ? { executablePath, args: ['--no-sandbox', '--single-process', '--no-zygote', '--disable-dev-shm-usage'] } : {};
const browser = await chromium.launch(launchOptions);
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route('**/__qa_delayed_save__', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>QA</title>' }));
  await page.goto(new URL('/__qa_delayed_save__', base).href);
  const write = (name) => page.evaluate(async (managerName) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('manager26', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('saves', { keyPath: 'slot' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('saves', 'readwrite');
      tx.objectStore('saves').put({ slot: 1, blob: { version: 4, career: { manager: { name: managerName }, settings: { goalPace: 'dengeli' } } } });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Write aborted'));
    });
    db.close();
  }, name);
  await write('Eski Kariyer');

  let reads = 0, resolveFirst, rejectFirst;
  const firstRead = new Promise((resolve, reject) => { resolveFirst = resolve; rejectFirst = reject; });
  const observedPage = { evaluate: async (fn) => {
    try {
      const result = await page.evaluate(fn);
      reads++;
      if (reads === 1) resolveFirst(result);
      return result;
    } catch (error) { rejectFirst(error); throw error; }
  } };
  const waiting = waitForCareerSave(observedPage, 'Yeni Kariyer', { timeoutMs: 5000, intervalMs: 30 });
  let settled = false;
  waiting.then(() => { settled = true; }, () => { settled = true; });
  assert.equal((await firstRead)?.manager?.name, 'Eski Kariyer');
  await delay(120);
  assert.equal(settled, false, 'The wait must not finish while only the old save exists');
  await write('Yeni Kariyer');
  const saved = await waiting;
  assert.equal(saved.manager.name, 'Yeni Kariyer');
  assert.ok(reads >= 2, 'The updated save must be read after the stale one');
  console.log(`✅ Delayed IndexedDB save is awaited and stale career is rejected | reads=${reads}`);
} finally {
  await browser.close();
}
