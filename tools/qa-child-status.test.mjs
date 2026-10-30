import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { qaChildStatus } from './qa-child-status.mjs';

const child = (script, options = {}) => spawnSync(process.execPath, ['-e', script], { encoding: 'utf8', ...options });
assert.equal(qaChildStatus(child('process.exit(0)')).code, 0);
assert.equal(qaChildStatus(child('process.exit(7)')).code, 7);
const killed = qaChildStatus(child("process.kill(process.pid, 'SIGTERM')"));
assert.equal(killed.code, 1);
assert.match(killed.error, /SIGTERM/);
const timeout = qaChildStatus(child('setTimeout(() => {}, 5000)', { timeout: 150 }));
assert.equal(timeout.code, 1);
assert.match(timeout.error, /ETIMEDOUT/);
console.log('✅ QA runner reports exit errors, signals and timeouts as failures');
