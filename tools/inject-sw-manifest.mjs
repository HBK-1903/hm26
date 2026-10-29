// Build sonrası içerik karması ve dist envanterini service worker'a enjekte eder.
// İsteğe bağlı dizin argümanı, aynı işlemi izole test fikstürlerinde sınamaya yarar.
import { createHash } from 'node:crypto';
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL('../dist', import.meta.url));
const skip = new Set(['hm26-cloudflare.zip', '_redirects', '_headers']);
// OS/mağaza varlıkları app-shell yükünü artırmasın.
const PRECACHE_EXCLUDE_PREFIXES = ['/splash/', '/screenshots/'];
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (skip.has(name)) continue;
    const rel = '/' + relative(DIST, p).split('\\').join('/');
    if (PRECACHE_EXCLUDE_PREFIXES.some((prefix) => rel.startsWith(prefix))) continue;
    files.push(rel);
  }
})(DIST);
files.sort();

const precache = ['/', ...files.filter((file) => file !== '/index.html' && file !== '/sw.js')];
const swPath = join(DIST, 'sw.js');
let sw = readFileSync(swPath, 'utf8');
const manifestAnchor = 'const PRECACHE = __PRECACHE__;';
const versionAnchor = "const BUILD_VERSION = '__BUILD_VERSION__';";
if (!sw.includes(manifestAnchor) || !sw.includes(versionAnchor)) throw new Error('SW enjeksiyon çapası bulunamadı — yeniden enjekte mi çalıştı?');

// Stable filenames can change content too. Hash the worker template, HTML and every
// precached file (not just the file list) so two releases never share a cache.
const hash = createHash('sha256');
for (const file of files) {
  hash.update(file).update('\0');
  hash.update(createHash('sha256').update(readFileSync(join(DIST, file.slice(1)))).digest());
}
const version = hash.digest('hex').slice(0, 16);
sw = sw.replace(manifestAnchor, 'const PRECACHE = ' + JSON.stringify(precache) + ';');
sw = sw.replace(versionAnchor, `const BUILD_VERSION = '${version}';`);
writeFileSync(swPath, sw);
console.log(`SW precache: ${precache.length} dosya, sürüm ${version}`);
