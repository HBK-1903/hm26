import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { startQaPreview, stopQaPreview } from './qa-preview.mjs';

const probe = createServer();
await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const url = `http://127.0.0.1:${port}`;
const preview = startQaPreview(process.cwd(), port);
try {
  let ready = false;
  for (let i = 0; i < 80 && !ready; i++) {
    if (preview.exitCode !== null || preview.signalCode !== null) throw new Error('Preview stopped before it became ready');
    try { ready = (await fetch(url, { signal: AbortSignal.timeout(500) })).ok; } catch { /* wait for Vite */ }
    if (!ready) await delay(50);
  }
  assert.ok(ready, 'Preview must serve the built game');
  await stopQaPreview(preview);
  assert.ok(preview.exitCode !== null || preview.signalCode !== null, 'Preview process must exit');
  await assert.rejects(fetch(url, { signal: AbortSignal.timeout(1000) }), 'Preview port must be closed');
} finally {
  await stopQaPreview(preview);
}

// An uncooperative child must not leave the QA runner or its server hanging.
const stubborn = spawn(process.execPath, ['-e', "process.on('SIGTERM', () => {}); console.log('ready'); setInterval(() => {}, 1000)"], { stdio: ['ignore', 'pipe', 'ignore'] });
try {
  await once(stubborn.stdout, 'data');
  await stopQaPreview(stubborn, 100);
  assert.equal(stubborn.signalCode, 'SIGKILL');
} finally {
  await stopQaPreview(stubborn);
}
console.log('✅ QA preview serves the build and releases its port; stubborn children are force-stopped');
