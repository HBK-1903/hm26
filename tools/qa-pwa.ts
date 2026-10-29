import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const pass = (label: string) => console.log(`✅ ${label}`);

const manifest = JSON.parse(read('public/manifest.json')) as {
  name?: string;
  short_name?: string;
  description?: string;
  start_url?: string;
  scope?: string;
  display?: string;
  orientation?: string;
  icons?: Array<{ src: string; sizes: string; type: string; purpose: string }>;
  shortcuts?: Array<{ name: string; url: string; icons?: Array<{ src: string; sizes: string; type: string }> }>;
  screenshots?: Array<{ src: string; sizes: string; type: string; form_factor?: string }>;
};
assert.ok(manifest.name && manifest.short_name && manifest.description, 'Manifest identity fields must be present');
assert.equal(manifest.start_url, '/');
assert.equal(manifest.scope, '/');
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.orientation, 'any');
for (const size of [192, 512]) {
  const iconPath = `/icons/icon-${size}.png`;
  const icon = manifest.icons?.find((entry) => entry.src === iconPath);
  assert.ok(icon, `Missing ${size}px manifest icon`);
  assert.equal(icon?.sizes, `${size}x${size}`);
  assert.equal(icon?.type, 'image/png');
  assert.equal(icon?.purpose, 'any maskable');
  assert.ok(existsSync(join(root, 'public', iconPath.slice(1))), `Missing icon file ${iconPath}`);
  assert.ok(existsSync(join(root, 'dist', iconPath.slice(1))), `Build did not copy ${iconPath}`);
}
assert.ok(existsSync(join(root, 'public/icons/apple-touch-icon.png')));
pass('Manifest metadata and 192/512 maskable PNG icons');

const headers = read('public/_headers');
assert.ok(headers.includes('/sw.js\n  Cache-Control: no-cache, no-store, must-revalidate'));
assert.ok(headers.includes('/manifest.json\n  Cache-Control: no-cache, no-store, must-revalidate'));
assert.equal(read('dist/_headers'), headers, 'Cloudflare _headers must be copied to dist unchanged');
pass('Cloudflare no-cache headers for service worker and manifest');

const workerSource = read('public/sw.js');
assert.ok(workerSource.includes('const PRECACHE = __PRECACHE__;'), 'Injector anchor must remain unchanged');
assert.match(workerSource, /(?:e|event)\.data\.type === 'SKIP_WAITING'/, 'Worker must accept user-approved activation');
assert.ok(!workerSource.includes('.then(() => self.skipWaiting())'), 'Worker must wait for the user on updates');
const builtWorker = read('dist/sw.js');
assert.ok(!builtWorker.includes('__PRECACHE__'), 'Build must inject the precache manifest');
assert.ok(!builtWorker.includes('__BUILD_VERSION__'), 'Build must inject a content-derived version');
assert.match(builtWorker, /const BUILD_VERSION = '[0-9a-f]{16}';/);
assert.match(builtWorker, /const PRECACHE = \[/);
for (const path of ['/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png']) {
  assert.ok(builtWorker.includes(JSON.stringify(path)), `Precache is missing ${path}`);
}
pass('Service-worker activation message and intact build-time precache injection');

const hook = read('src/hooks/useServiceWorker.ts');
assert.ok(hook.includes('!import.meta.env.PROD'), 'Service worker must be production-only');
assert.ok(hook.includes("register('/sw.js', { updateViaCache: 'none' })"));
assert.ok(hook.includes('candidate.waiting'));
assert.ok(hook.includes("type: 'SKIP_WAITING'"));
const html = read('dist/index.html');
assert.ok(html.includes('href="/manifest.json"'));
assert.ok(html.includes('apple-touch-icon'));
assert.ok(html.includes('name="theme-color"'));
assert.ok(html.includes('property="og:title"'));
pass('Production-only update UI wiring and PWA/SEO document metadata');

// Manifest kısayolları ve tanıtım ekran görüntüleri: dosyalar hem public hem dist'te olmalı
const NAV_HASHES = ['#hub', '#squad', '#tactics', '#market', '#club', '#comps', '#stats', '#inbox',
  '#careerProfile', '#settings', '#backup', '#matchPrep', '#newsroom'];
assert.ok(manifest.shortcuts && manifest.shortcuts.length >= 1, 'Manifest must declare shortcuts');
for (const shortcut of manifest.shortcuts!) {
  assert.ok(NAV_HASHES.includes(shortcut.url.replace('/', '')), `Shortcut URL must target a NAV screen: ${shortcut.url}`);
  assert.ok(/^\/#/.test(shortcut.url), 'Shortcut URL must use the in-app hash route');
  for (const icon of shortcut.icons ?? []) {
    assert.ok(existsSync(join(root, 'public', icon.src.slice(1))), `Missing shortcut icon ${icon.src}`);
    assert.ok(existsSync(join(root, 'dist', icon.src.slice(1))), `Build did not copy ${icon.src}`);
  }
}
for (const shot of manifest.screenshots ?? []) {
  assert.ok(existsSync(join(root, 'public', shot.src.slice(1))), `Missing screenshot ${shot.src}`);
  assert.ok(existsSync(join(root, 'dist', shot.src.slice(1))), `Build did not copy ${shot.src}`);
  assert.equal(shot.form_factor, 'narrow');
}
// Kısayollar gerçek derin link ister: Shell ilk ekranı hash'ten çözmeli ve #hub'a ezmemeli
const shell = read('src/screens/Shell.tsx');
assert.ok(shell.includes('function screenFromHash'), 'Shell must expose a hash-to-screen resolver');
assert.ok(shell.includes('useState<Screen>(screenFromHash)'), 'Initial screen must honor the launch hash');
assert.ok(!/replaceState\(\{ hm26s: 'hub' \}, '', '#hub'\)/.test(shell), 'Initial load must not overwrite a deep-link hash with #hub');
pass('Manifest shortcuts (hash-routed) and promo screenshots with shipped files');

// iOS launch screen etiketleri: her link dist'te gerçekten var olan PNG'e işaret etmeli
const splashLinks = [...html.matchAll(/rel="apple-touch-startup-image" href="(\/splash\/[^"]+)"/g)].map((m) => m[1]);
assert.ok(splashLinks.length >= 8, `Expected at least 8 iOS splash links, got ${splashLinks.length}`);
for (const href of splashLinks) {
  assert.ok(existsSync(join(root, 'dist', href.slice(1))), `iOS launch image missing in dist: ${href}`);
}
// Splash ve mağaza görselleri app-shell precache'ini şişirmemeli
for (const excluded of ['/splash/', '/screenshots/']) {
  assert.ok(!new RegExp(`"${excluded}[^"]+"`).test(builtWorker), `Precache must not contain ${excluded} entries`);
}
pass('iOS apple-touch-startup-image links and precache exclusion of store-level assets');

console.log('\nPWA-QA: 6/6 PASS');
