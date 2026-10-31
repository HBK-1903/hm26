import { strict as assert } from 'node:assert';
import { waitForCareerSave } from './qa-browser-save.mjs';

const expected = { version: 4, manager: { name: 'Yeni Kariyer' }, settings: { goalPace: 'dengeli' } };
const stale = { version: 4, manager: { name: 'Eski Kariyer' }, settings: {} };
let reads = 0;
const eventualPage = { evaluate: async () => [null, stale, expected][Math.min(reads++, 2)] };
assert.deepEqual(await waitForCareerSave(eventualPage, 'Yeni Kariyer', { timeoutMs: 500, intervalMs: 2 }), expected);
assert.equal(reads, 3, 'An absent or stale save must not be treated as ready');
let missingReads = 0;
const missingPage = { evaluate: async () => { missingReads++; return null; } };
await assert.rejects(waitForCareerSave(missingPage, 'Eksik Kariyer', { timeoutMs: 30, intervalMs: 3 }), /did not become durable/);
assert.ok(missingReads > 1, 'The missing save should be polled before timing out');
console.log('✅ Browser save readiness waits for the right durable career and times out when it is missing');
