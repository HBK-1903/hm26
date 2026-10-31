import { setTimeout as delay } from 'node:timers/promises';

/** Read the durable career, not the wizard's in-memory state. */
export async function readCareerSave(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('manager26', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const saved = await new Promise((resolve, reject) => {
        const request = db.transaction('saves').objectStore('saves').get(1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      return saved?.blob ? { version: saved.blob.version, manager: saved.blob.career.manager, settings: saved.blob.career.settings } : null;
    } finally {
      db.close();
    }
  });
}

/**
 * Poll from Node: Playwright's waitForFunction can treat an unresolved async
 * predicate as truthy even when that promise eventually resolves to false.
 * The expected manager name also rules out a stale save from a previous test.
 */
export async function waitForCareerSave(page, expectedName, { timeoutMs = 12_000, intervalMs = 50 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  do {
    last = await readCareerSave(page);
    if (last?.manager?.name === expectedName) return last;
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await delay(Math.min(intervalMs, remaining));
  } while (Date.now() < deadline);
  throw new Error(`Career save for ${expectedName} did not become durable within ${timeoutMs}ms; last=${JSON.stringify(last)}`);
}
