// HM26 — v0.9.6 Logo paketi (revizyon 02) doğrulaması
// Çalıştır: npx --yes tsx tools/qa9-logopack.ts
// Doğrular: 36 kulüp ID birebir eşleşme, renk tablosu (önceki→yeni) uygulanmış, accent/color3 dolu, ikili tutarlılık
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLUBS, clubById } from '../src/data/clubs';

// Depo kökü: ortamdan bağımsız göreli yol çözümü
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
import { SYMBOL_IVORY, SYMBOL_DARK } from '../src/data/assetManifest';
import { ICONS } from '../src/components/icons/index';
import { identityConsistent } from '../src/data/clubIdentities';

let failures = 0;
const ok = (n: string, c: boolean, x = '') => { console.log((c ? '✅ ' : '❌ ') + n + (x ? ` | ${x}` : '')); if (!c) failures++; };

// CSV + JSON paketi oku
const csvTxt = readFileSync(path.join(ROOT, 'assets-inbox/spec/renk-eslestirmesi.csv'), 'utf8').replace(/^﻿/, '');
const csvLines = csvTxt.trim().split(/\r?\n/);
const csvHead = csvLines[0].split(',');
const csv = csvLines.slice(1).map((ln) => {
  const v = ln.split(',');
  const o: Record<string, string> = {};
  csvHead.forEach((h, i) => (o[h.trim()] = (v[i] ?? '').trim()));
  return o;
});
const pack = JSON.parse(readFileSync(path.join(ROOT, 'assets-inbox/spec/kulup-logolari.json'), 'utf8')) as { clubs: { id: string; name: string; short: string; primary: string; secondary: string; accent: string }[] };

// L1: 36/36 kulüp, ad/short/id birebir
{
  const byId = new Map(CLUBS.map((c) => [c.id, c]));
  const packIds = pack.clubs.map((c) => c.id);
  const miss = packIds.filter((id) => !byId.has(id));
  const extra = CLUBS.filter((c) => !packIds.includes(c.id));
  const nameBad = pack.clubs.filter((c) => byId.get(c.id)?.name !== c.name || byId.get(c.id)?.short !== c.short);
  ok('L1 ID+ad+kısaltma birebir (paket↔oyun)', miss.length === 0 && extra.length === 0 && nameBad.length === 0 && CLUBS.length === 36,
    `eksik=${miss.length} fazla=${extra.length} isim-sapma=${nameBad.length} oyun=${CLUBS.length} paket=${pack.clubs.length}`);
}

// L2: renk tablosu uygulanmış: color1=yeni_ana, color2=yeni_ikincil, color3=yeni_vurgu; önceki renkler artık yok
{
  let bad = 0, stale = 0, noAccent = 0; const samples: string[] = [];
  csv.forEach((r) => {
    const c = clubById(r.id);
    if (!c) { bad++; return; }
    if (c.color1.toUpperCase() !== r.yeni_ana.toUpperCase() || c.color2.toUpperCase() !== r.yeni_ikincil.toUpperCase()) { bad++; samples.push(r.id); }
    if ((c.color3 ?? '').toUpperCase() !== r.yeni_vurgu.toUpperCase()) noAccent++;
    if (c.color1.toUpperCase() === r.onceki_ana.toUpperCase() && r.onceki_ana.toUpperCase() !== r.yeni_ana.toUpperCase()) stale++;
  });
  ok('L2 36/36 yeni renk + accent uygulanmış, eski renk kalmamış', bad === 0 && stale === 0 && noAccent === 0,
    `uygulanmamış=${bad}${samples.length ? ' [' + samples.slice(0, 3).join(',') + '…]' : ''} bayat=${stale} accent-eksik=${noAccent}`);
}

// L3: adaptör tek-doğruluk tutarlılığı + denizli revizyon 2 notu (paket özel dikkat)
{
  const dz = clubById('denizli_yesilova');
  const cLd = csv.find((r) => r.id === 'denizli_yesilova')!;
  ok('L3 adaptör tutarlı + Denizli revizyon-02 renkleri', identityConsistent() && dz!.color1 === cLd.yeni_ana && dz!.color2 === cLd.yeni_ikincil && dz!.color3 === cLd.yeni_vurgu,
    `identityConsistent=${identityConsistent()} denizli=${dz!.color1}/${dz!.color2}/${dz!.color3}`);
}

// L4 (v0.9.8): gömülü PNG envanteri — her kulüp için full+compact, PNG imzası ve boyut ≥ görüntü ihtiyacı
{
  const ids = CLUBS.map((c) => c.id);
  // v0.9.8 format revizyonu: armalar WebP (RIFF....WEBP imzasi), boyutlar VP8/VP8L headerdan
  const isWebp = (p: string) => { const b = readFileSync(p); return b.length > 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP'; };
  const webpDims = (p: string) => {
    const b = readFileSync(p); const fmt = b.toString('ascii', 12, 16);
    if (fmt === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff] as const;
    if (fmt === 'VP8L') { const n = b.readUInt32LE(21); return [(n & 0x3fff) + 1, ((n >> 14) & 0x3fff) + 1] as const; }
    /* VP8X */ return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)] as const;
  };
  let bad = 0, small = 0; const badIds: string[] = [];
  for (const id of ids) {
    for (const v of ['full', 'compact'] as const) {
      const p = path.join(ROOT, `public/assets/crests/${v}/${id}.webp`);
      try {
        if (!isWebp(p)) { bad++; badIds.push(id + ':' + v); continue; }
        const [w, h] = webpDims(p);
        if (Math.min(w, h) < (v === 'full' ? 256 : 128)) small++;
      } catch { bad++; badIds.push(id + ':' + v); }
    }
  }
  ok('L4 36/36 kulüp × full+compact WebP gömülü, imza+boyut geçerli', bad === 0 && small === 0,
    `bozuk=${bad}${badIds.length ? ' [' + badIds.slice(0, 3).join(',') + '…]' : ''} küçük=${small}`);
}

// L5 (v0.9.8): sembol seti — ICONS anahtarları gömülü PNG ile eşleşiyor; marka seti tamam
{
  const keys = Object.keys(ICONS);
  const ivoryKeys = Object.keys(SYMBOL_IVORY);
  const missingCore = keys.filter((k) => !SYMBOL_IVORY[k] && !SYMBOL_DARK[k]); // iki tonda da yoksa gerçek SVG fallback
  const orphan = ivoryKeys.filter((k) => !ICONS[k]);
  const isSvg = (p: string) => { try { return readFileSync(p, 'utf8').includes('<svg') && readFileSync(p, 'utf8').includes('<path'); } catch { return false; } };
  const fileBad = ivoryKeys.filter((k) => !isSvg(path.join(ROOT, `public/assets/symbols/sembol_${k}.svg`)));
  const darkFileBad = Object.keys(SYMBOL_DARK).filter((k) => !isSvg(path.join(ROOT, `public/assets/symbols-dark/sembol_${k}.svg`)));
  const brand = ['HM26_Lacivert.webp', 'HM26_Seffaf.webp', 'icon.webp', 'icon-monochrome.webp', 'icon-transparent.webp'];
  const brandBad = brand.filter((f) => !existsSync(path.join(ROOT, `public/assets/brand/${f}`)));
  // Eksik çekirdek 6 (more chevron search star starF info) bilinçli SVG fallback — 0.9.8 kabul kriteri
  const KNOWN_GAP = ['more', 'chevron', 'search', 'star', 'starF', 'info'];
  const unexpected = missingCore.filter((k) => !KNOWN_GAP.includes(k));
  // sahipsiz (orphan) PNG'ler gelecek modül yüzeyleri için envanter — bilgilendirme, hata değil
  ok('L5 sembol PNG envanteri bütün (ivory+dark+marka), beklenmeyen boşluk yok',
    fileBad.length === 0 && darkFileBad.length === 0 && brandBad.length === 0 && unexpected.length === 0,
    `ivory=${ivoryKeys.length} dark=${Object.keys(SYMBOL_DARK).length} icons=${keys.length} svg-fallback=${missingCore.length} modül-envanteri=${orphan.length} dosya=${fileBad.length}+${darkFileBad.length} marka-eksik=${brandBad.length}`);
}

console.log(failures === 0 ? `\n5 test, 0 başarısız` : `\n${failures} BAŞARISIZ`);
if (failures) process.exit(1);
