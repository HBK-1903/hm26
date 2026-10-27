// HM26 — BUG-SW-03: build sonrası dist envanterini sw.js __PRECACHE__ yerine yerleştirir.
// Kullanım: npm run build zincirinde otomatik çağrılır (vite build'ten sonra).
import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

const DIST = new URL('../dist', import.meta.url).pathname;
const skip = new Set(['hm26-cloudflare.zip', '_redirects', '_headers']);
// Sistem/mağaza seviyesi varlıklar app-shell precache'ine girmez:
//  - /splash/*      → iOS apple-touch-startup-image (açılıştan önce OS tarafından okunur)
//  - /screenshots/* → Android kurulum diyaloğu/mağaza tanıtım görselleri
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

// SPA kökü hem '/' hem '/index.html' olarak önbellekte
const precache = ['/', ...files.filter((f) => f !== '/index.html' && f !== '/sw.js')];
const swPath = join(DIST, 'sw.js');
let sw = readFileSync(swPath, 'utf8');
const anchor = 'const PRECACHE = __PRECACHE__;';
if (!sw.includes(anchor)) throw new Error('PRECACHE çapası bulunamadı — yeniden enjekte mi çalıştı?');
sw = sw.replace(anchor, 'const PRECACHE = ' + JSON.stringify(precache) + ';');
writeFileSync(swPath, sw);
console.log('SW precache: ' + precache.length + ' dosya enjekte edildi');
