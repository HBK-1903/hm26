#!/usr/bin/env python3
# HM26 — assets-inbox → public/assets senkronu + src/data/assetManifest.ts üretimi
# Kaynaklar (4096px ustalar) assets-inbox'ta KORUNUR; burada uygulamaya küçültülmüş kopyalar düşer.
# Not: 2026-10-25 ustalar silindi + convert-assets.py PNG->WebP/SVG donusumu yapti; bu betik yeniden ustalar gelirse PNG uretir (manifest iletisim bilgileri .webp/.svg kabul eder — elle donusum gerekir).
# Çalıştır: python3 tools/sync-assets.py
import json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INBOX = os.path.join(ROOT, 'assets-inbox')
OUT = os.path.join(ROOT, 'public', 'assets')

# (kaynak dizin, hedef dizin, maks kenar)
JOBS = [
    ('crests/full',    'crests/full',    512),
    ('crests/compact', 'crests/compact', 256),
    ('symbols',        'symbols',        256),
    ('symbols-dark',   'symbols-dark',   256),
    ('brand',          'brand',         1024),
]

def downscale(src, dst, maxedge):
    im = Image.open(src).convert('RGBA')
    w, h = im.size
    if max(w, h) > maxedge:
        r = maxedge / max(w, h)
        im = im.resize((max(1, round(w * r)), max(1, round(h * r))), Image.LANCZOS)
    im.save(dst, optimize=True)

total_in = total_out = 0
counts = {}
for srcd, dstd, edge in JOBS:
    sp, dp = os.path.join(INBOX, srcd), os.path.join(OUT, dstd)
    os.makedirs(dp, exist_ok=True)
    n = 0
    for f in sorted(os.listdir(sp)):
        if not f.endswith('.png'):
            continue
        si = os.path.getsize(os.path.join(sp, f))
        downscale(os.path.join(sp, f), os.path.join(dp, f), edge)
        so = os.path.getsize(os.path.join(dp, f))
        total_in += si; total_out += so; n += 1
    counts[dstd] = n

# assetManifest.ts üret
man = json.load(open(os.path.join(INBOX, 'MANIFEST.json')))
def rel_ids(d):
    p = os.path.join(INBOX, d)
    return sorted(f[:-4].replace('sembol_', '') for f in os.listdir(p) if f.endswith('.png'))

full_ids = rel_ids('crests/full')
comp_ids = rel_ids('crests/compact')
sym_ivory = rel_ids('symbols')
sym_dark = rel_ids('symbols-dark')

def rec(ids):
    return '{ ' + ', '.join(f"'{i}': true" for i in ids) + ' }'

ts = f"""// HM26 — GÖMÜLÜ GÖRSEL VARLIK MANIFESTİ (tools/sync-assets.py üretir — ELLE DÜZENLEME)
// public/assets altındaki PNG envanteri; Crest/GameIcon bu listeye göre <img> dener, yoksa prosedürel/SVG fallback.
export const CREST_FULL: Readonly<Record<string, true>> = {rec(full_ids)};
export const CREST_COMPACT: Readonly<Record<string, true>> = {rec(comp_ids)};
export const SYMBOL_IVORY: Readonly<Record<string, true>> = {rec(sym_ivory)};
export const SYMBOL_DARK: Readonly<Record<string, true>> = {rec(sym_dark)};

export const crestSrc = (id: string, variant: 'full' | 'compact') =>
  `/assets/crests/${{variant}}/${{id}}.webp`; // convert-assets.py sonrasi
export const symbolSrc = (id: string, dark: boolean) =>
  `/assets/symbols${{dark ? '-dark' : ''}}/sembol_${{id}}.svg`; // convert-assets.py sonrasi
"""
mp = os.path.join(ROOT, 'src', 'data', 'assetManifest.ts')
open(mp, 'w').write(ts)

print(f"senkron tamam: {counts}")
print(f"boyut: {total_in/1e6:.1f} MB → {total_out/1e6:.2f} MB")
print(f"manifest: full={len(full_ids)} compact={len(comp_ids)} ivory={len(sym_ivory)} dark={len(sym_dark)} → {mp}")
