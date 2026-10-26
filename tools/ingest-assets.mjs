// HM26 — Varlık karşılama aracı (sembol + logo paketi)
// Görev: /home/user/uploads/ altındaki metin paketlerini (`.txt/.md/.json`) ayrıştırır,
// `=== DOSYA: yol ===` işaretçileriyle bölüp gerçek dosyalara döker → manager26/assets-inbox/
// Çalıştır: node tools/ingest-assets.mjs   (idempotent: aynı içerik tekrar gelirse yazmaz)
//
// Kabul edilen biçimler:
//   === DOSYA: svg/ist_halic.svg ===      → svg içeriği
//   === DOSYA: svg_kucuk/izm_korfez.svg ===
//   === DOSYA: semboller/home.svg ===     → özel oyun sembolleri
//   JSON map: { "svg/ist_halic.svg": "<svg…>", … } veya { "ist_halic": {"full": "…", "compact": "…"} }
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const UPLOADS = '/home/user/uploads';
const OUT = new URL('../assets-inbox/', import.meta.url).pathname;
const MARK = /^===\s*DOSYA:\s*([\w/\-.]+)\s*===\s*$/m;

const results = { written: [], skipped: [], errors: [] };
const seen = new Map();

/** Güvenlik + sıhhat: yol işaretinin bazı kuralları vardır */
const sanitize = (p) => {
  if (p.includes('..') || p.startsWith('/') || /[\\<>:"|?*]/.test(p)) return null;
  return p.replace(/\.+/g, (m) => (m === '.' ? m : m === '..' ? '' : '')) || null;
};

const isSvg = (s) => /<\s*svg[\s>]/i.test(s);
const looksClosedSvg = (s) => /<\s*\/\s*svg\s*>/i.test(s);

function stage(rel, content, src) {
  const clean = sanitize(rel);
  if (!clean) return results.errors.push(`${src}: güvensiz yol '${rel}'`);
  if (seen.has(clean)) {
    if (seen.get(clean) === content) return results.skipped.push(`${clean} (tekrar — aynı içerik, atlanıyor)`);
    return results.errors.push(`${src}: çift tanım '${clean}' çelişkili içerikle`);
  }
  seen.set(clean, content);
  const warn = [];
  if (clean.endsWith('.svg')) {
    if (!isSvg(content)) warn.push('svg kökü yok');
    if (!looksClosedSvg(content)) warn.push('kapanış </svg> yok');
  }
  const dest = path.join(OUT, clean);
  mkdirSync(path.dirname(dest), { recursive: true });
  if (existsSync(dest) && readFileSync(dest, 'utf8') === content) return results.skipped.push(`${clean} (değişiklik yok)`);
  writeFileSync(dest, content);
  results.written.push(`${clean}${warn.length ? ' ⚠ ' + warn.join(', ') : ''}`);
}

// 1) işaretçi biçimli metin paketleri
for (const f of readdirSync(UPLOADS)) {
  if (!/\.(txt|md)$/i.test(f)) continue;
  const txt = readFileSync(path.join(UPLOADS, f), 'utf8');
  if (!MARK.test(txt)) continue;
  const parts = txt.split(new RegExp(MARK.source, 'gm'));
  const heads = [...txt.matchAll(new RegExp(MARK.source, 'gm'))].map((m) => m[1]);
  for (let i = 0; i < heads.length; i++) stage(heads[i], (parts[i + 1] ?? '').trim(), f);
}

// 2) JSON map paketleri
for (const f of readdirSync(UPLOADS)) {
  if (!/\.json$/i.test(f)) continue;
  let j; try { j = JSON.parse(readFileSync(path.join(UPLOADS, f), 'utf8')); } catch { continue; }
  const flat = {};
  for (const [k, v] of Object.entries(j)) {
    if (typeof v === 'string' && /<svg/i.test(v)) flat[k] = v;
    else if (v && typeof v === 'object') {
      if (typeof v.full === 'string') flat[`svg/${k}.svg`] = v.full;
      if (typeof v.compact === 'string') flat[`svg_kucuk/${k}.svg`] = v.compact;
    }
  }
  if (Object.keys(flat).length) for (const [rel, s] of Object.entries(flat)) stage(rel, s.trim(), f);
}

console.log(`assets-inbox hedef: ${OUT}`);
console.log(`✅ yazılan: ${results.written.length}`);
results.written.forEach((r) => console.log('   +', r));
console.log(`↷ atlanan: ${results.skipped.length}`);
results.skipped.slice(0, 10).forEach((r) => console.log('   ~', r));
if (seen.size === 0) console.log('   (henüz paket bulunamadı — işaretçi kılavuzu: "=== DOSYA: yol.svg ===" satırı)');
if (results.errors.length) { console.log('❌ hatalar:'); results.errors.forEach((e) => console.log('   ✗', e)); process.exit(1); }

// 3) ikili görüntü paketleri (.png/.webp) — PNG boyutu IHDR'dan okunur (CRC'siz hafif ayrıştırma)
for (const f of readdirSync(UPLOADS)) {
  if (!/\.(png|webp|jpg|jpeg)$/i.test(f)) continue;
  const src = path.join(UPLOADS, f);
  const buf = readFileSync(src);
  if (buf.length < 8) { results.errors.push(`${f}: boş/kısa ikili`); continue; }
  let dim = '';
  if (buf.readUInt32BE(0) === 0x89504e47) { // PNG imza
    dim = ` ${buf.readUInt32BE(16)}×${buf.readUInt32BE(20)}px`;
  }
  const rel = `goruntu/${f}`;
  const dest = path.join(OUT, rel);
  if (seen.has(rel)) continue;
  seen.set(rel, '');
  mkdirSync(path.dirname(dest), { recursive: true });
  if (existsSync(dest) && Buffer.compare(readFileSync(dest), buf) === 0) { results.skipped.push(`goruntu/${f} (değişiklik yok)`); continue; }
  writeFileSync(dest, buf);
  results.written.push(`goruntu/${f}${dim}`);
}

// Özet istatistiği
const buckets = {};
for (const k of seen.keys()) { const top = k.split('/')[0]; buckets[top] = (buckets[top] ?? 0) + 1; }
if (seen.size) console.log('📦 dağılım:', JSON.stringify(buckets));
