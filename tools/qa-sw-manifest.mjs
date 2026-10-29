// Verify that build cache identities change with content, not merely filenames.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = mkdtempSync(join(tmpdir(), 'hm26-sw-build-'));
const template = readFileSync('public/sw.js', 'utf8');
let passed = 0;
const check = (name, condition) => { assert.ok(condition, name); passed++; console.log(`✅ ${name}`); };
function build(dir, options = {}) {
  mkdirSync(join(dir, 'assets'), { recursive: true });
  mkdirSync(join(dir, 'screenshots'), { recursive: true });
  writeFileSync(join(dir, 'sw.js'), template + (options.workerChange ? '\n// changed worker\n' : ''));
  writeFileSync(join(dir, 'index.html'), options.html ?? '<html>A</html>');
  writeFileSync(join(dir, 'assets', 'logo.webp'), options.asset ?? 'same-url-A');
  writeFileSync(join(dir, 'screenshots', 'preview.png'), options.excluded ?? 'excluded-A');
  const run = spawnSync(process.execPath, ['tools/inject-sw-manifest.mjs', dir], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const worker = readFileSync(join(dir, 'sw.js'), 'utf8');
  return { version: /const BUILD_VERSION = '([0-9a-f]{16})';/.exec(worker)?.[1], worker };
}
try {
  const a = build(join(root, 'a'));
  const same = build(join(root, 'same'));
  const html = build(join(root, 'html'), { html: '<html>B</html>' });
  const asset = build(join(root, 'asset'), { asset: 'same-url-B' });
  const worker = build(join(root, 'worker'), { workerChange: true });
  const excluded = build(join(root, 'excluded'), { excluded: 'excluded-B' });
  check('Aynı içerik deterministik cache sürümü üretir', !!a.version && a.version === same.version);
  check('HTML değişikliği cache sürümünü değiştirir', a.version !== html.version);
  check('Sabit adlı varlığın içeriği değişince cache sürümü değişir', a.version !== asset.version);
  check('Worker kodu değişince cache sürümü değişir', a.version !== worker.version);
  check('Hariç tutulmuş mağaza görseli uygulama cache sürümünü değiştirmez', a.version === excluded.version);
  check('İşaretler doldurulur ve uygulama kabuğu precache listesinde yer alır', !a.worker.includes('__PRECACHE__') && !a.worker.includes('__BUILD_VERSION__') && a.worker.includes('const PRECACHE = ["/","/assets/logo.webp"];'));
} finally { rmSync(root, { recursive: true, force: true }); }
console.log(`\n${passed}/${passed} içerik-karması kontrolü geçti.`);
