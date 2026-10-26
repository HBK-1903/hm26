#!/usr/bin/env python3
# HM26 — gomulu varlik donusumu: tek-renk semboller PNG→SVG (potrace), cok-renkli armalar+marka PNG→WebP
# Not: 4096px ustalar silindigi icin kaynak = public/assets'teki 256px kopyalar (duz zemin, temiz izlenebilir).
# Çalıştır: sudo apt-get install -y potrace && python3 tools/convert-assets.py
import os, subprocess, sys, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'public', 'assets')

from PIL import Image

def dominant_fill(paths):
    from collections import Counter
    cnt = Counter()
    for p in paths:
        im = Image.open(p).convert('RGBA'); px = im.load()
        for y in range(0, im.size[1], 3):
            for x in range(0, im.size[0], 3):
                r, g, b, a = px[x, y]
                if a > 200: cnt[(r, g, b)] += 1
    c = cnt.most_common(1)[0][0]
    return '#%02X%02X%02X' % c

def png_to_svg(src, dst, fill):
    im = Image.open(src).convert('RGBA')
    w, h = im.size
    mask = im.split()[3].point(lambda v: 0 if v > 127 else 255)  # potrace: siyah=iz
    tmp = dst + '.tmp.pgm'
    mask.save(tmp)
    subprocess.run(['potrace', '-s', '--flat', '-o', dst, tmp], check=True, capture_output=True)
    os.remove(tmp)
    s = open(dst).read()
    # stroke/svgwrap duzelt: tum path'leri tek fill ile
    s = re.sub(r'<g[^>]*>', f'<g fill="{fill}" transform="scale(1,-1) translate(0,-{h})">', s, count=1)
    if '<path' not in s:
        raise RuntimeError('bos svg')
    open(dst, 'w').write(s)
    return True

def png_to_webp(src, dst, q):
    im = Image.open(src).convert('RGBA')
    im.save(dst, 'WEBP', quality=q, method=6)
    Image.open(dst).verify()
    return os.path.getsize(dst)

report = {}
# 1) semboller → SVG
for d, fill in [('symbols', '#F3F1EA'), ('symbols-dark', '#1D2B23')]:
    dp = os.path.join(A, d)
    pngs = sorted(f for f in os.listdir(dp) if f.endswith('.png'))
    b = a = 0; fails = []
    for f in pngs:
        sp = os.path.join(dp, f); sv = sp[:-4] + '.svg'
        s0 = os.path.getsize(sp)
        try:
            png_to_svg(sp, sv, fill)
            os.remove(sp) if os.path.getsize(sv) < s0 else None
            s1 = os.path.getsize(sv)
            if s1 >= s0:  # svg daha buyukse png'yi koru
                os.remove(sv); s1 = s0
            else:
                pass
        except Exception as e:
            fails.append(f + ':' + str(e)[:40]); s1 = s0
        b += s0; a += s1
    report[d] = (len(pngs), b, a, fails)

# 2) armalar + marka → WebP
for d, q in [('crests/full', 82), ('crests/compact', 84), ('brand', 86)]:
    dp = os.path.join(A, d)
    pngs = sorted(f for f in os.listdir(dp) if f.endswith('.png'))
    b = a = 0; fails = []
    for f in pngs:
        sp = os.path.join(dp, f); wp = sp[:-4] + '.webp'
        s0 = os.path.getsize(sp)
        try:
            s1 = png_to_webp(sp, wp, q)
            os.remove(sp)
        except Exception as e:
            fails.append(f + ':' + str(e)[:40]); s1 = s0
        b += s0; a += s1
    report[d] = (len(pngs), b, a, fails)

for d, (n, b, a, fails) in report.items():
    print(f'{d:22s} {n:3d} dosya  {b/1e6:6.2f} MB -> {a/1e6:5.2f} MB' + (f'  HATA: {fails}' if fails else ''))
