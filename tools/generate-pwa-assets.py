#!/usr/bin/env python3
# HM26 — PWA görsel varlık üretimi (offline, deterministik, harici servis yok):
#   1) public/splash-cover.webp kaynağından iOS apple-touch-startup-image PNG'leri
#      (cover-crop + 256 renk octree kuantalama; launch ekranı kısa gösterildiği için
#       fotoğraf kalitesi pratikte kayıpsıza yakın, boyut ~%80 düşer)
#   2) Manifest shortcuts için 96x96 marka ikonları (lacivert yuvarlak köşe + altın harf)
#   3) Android kurulum diyaloğu için markalı tanıtım ekran görüntüleri (1080x1920).
#      Bunlar canlı UI yakalama DEĞİLDİR; gerçek ekran görüntüsüyle değiştirmek için
#      tools/e2e-assets.mjs içindeki Playwright screenshot akışı kullanılabilir.
# Gereksinim: pip install pillow. Çalıştırma: python3 tools/generate-pwa-assets.py
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
NAVY = (7, 24, 34)        # ikon arka planı ile aynı lacivert
NAVY_DEEP = (5, 14, 22)
GOLD = (220, 166, 87)     # HM26 wordmark altını
PAPER = (250, 245, 234)
MUTED = (173, 184, 192)
PITCH = (35, 77, 50)
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# (fiziksel px genişlik × yükseklik, CSS device-width, device-height, pixel-ratio)
SPLASH_TARGETS = [
    (750, 1334, 375, 667, 2),    # iPhone SE2/SE3/8
    (1242, 2208, 414, 736, 3),   # iPhone 8 Plus
    (1125, 2436, 375, 812, 3),   # iPhone X/XS/11 Pro/12 mini/13 mini
    (828, 1792, 414, 896, 2),    # iPhone XR/11
    (1242, 2688, 414, 896, 3),   # iPhone XS Max/11 Pro Max
    (1170, 2532, 390, 844, 3),   # iPhone 12/13/14/15/16
    (1179, 2556, 393, 852, 3),   # iPhone 14 Pro/15 Pro/16 (düz)
    (1206, 2622, 402, 874, 3),   # iPhone 16 Pro
    (1290, 2796, 430, 932, 3),   # iPhone Plus kuşağı (14/15/16 Plus; aynı CSS noktası)
    (1320, 2868, 440, 956, 3),   # iPhone 16 Pro Max
]

SHORTCUTS = [
    ("kadro", "K"),
    ("transfer", "M"),  # Transfer Masası / Market
    ("taktik", "T"),
]

# Tanıtım ekran görüntüsü içerikleri (yalnızca gerçek oyunda var olan özellikler)
PROMO_SHOTS = [
    {
        "file": "shot-match-1080x1920.png",
        "title": "MAÇ GÜNÜ\nCEBİNDE",
        "bullets": [
            "Canlı maç konsolu ve 2D saha animasyonu",
            "Kenar komutları, protestolar ve VAR anları",
            "Şut haritası, xG ve oyuncu reytingleri",
        ],
        "pitch": True,
    },
    {
        "file": "shot-club-1080x1920.png",
        "title": "KULÜBÜNÜ\nİNŞA ET",
        "bullets": [
            "Transfer masası: takas ve sonraki satış payı",
            "Altyapı, kültür ve milli takım kararları",
            "İnternetsiz çalışır; kayıtlar cihazında kalır",
        ],
        "pitch": False,
    },
]


def cover_crop(src: Image.Image, w: int, h: int) -> Image.Image:
    sw, sh = src.size
    scale = max(w / sw, h / sh)
    resized = src.resize((round(sw * scale), round(sh * scale)), Image.LANCZOS)
    rw, rh = resized.size
    left = (rw - w) // 2
    top = (rh - h) // 2
    return resized.crop((left, top, left + w, top + h))


def generate_splashes() -> list[str]:
    src = Image.open(os.path.join(PUBLIC, "splash-cover.webp")).convert("RGB")
    out_dir = os.path.join(PUBLIC, "splash")
    os.makedirs(out_dir, exist_ok=True)
    written = []
    for w, h, *_ in SPLASH_TARGETS:
        frame = cover_crop(src, w, h)
        # 256 renk octree + FS dither: gradyanlarda bantlaşmayı önler, boyutu ~%80 azaltır
        frame = frame.quantize(colors=256, method=Image.FASTOCTREE, dither=Image.FLOYDSTEINBERG)
        path = os.path.join(out_dir, f"apple-splash-{w}x{h}.png")
        frame.save(path, "PNG", optimize=True)
        written.append(os.path.relpath(path, ROOT))
    return written


def rounded_tile(size: int, radius: int) -> Image.Image:
    tile = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    tile.paste(Image.new("RGBA", (size, size), NAVY + (255,)), (0, 0), mask)
    return tile


def generate_shortcut_icons() -> list[str]:
    out_dir = os.path.join(PUBLIC, "icons", "shortcuts")
    os.makedirs(out_dir, exist_ok=True)
    written = []
    for name, glyph in SHORTCUTS:
        size = 96
        tile = rounded_tile(size, radius=20)
        draw = ImageDraw.Draw(tile)
        font = ImageFont.truetype(FONT_BOLD, 54)
        bbox = draw.textbbox((0, 0), glyph, font=font)
        gw, gh = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(
            ((size - gw) / 2 - bbox[0], (size - gh) / 2 - bbox[1] - 2),
            glyph, font=font, fill=GOLD + (255,),
        )
        path = os.path.join(out_dir, f"{name}-96.png")
        tile.save(path, "PNG", optimize=True)
        written.append(os.path.relpath(path, ROOT))
    return written


def _wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        current = ""
        for word in paragraph.split(" "):
            candidate = word if not current else current + " " + word
            if draw.textlength(candidate, font=font) <= max_w:
                current = candidate
            else:
                if current:
                    lines.append(current)
                current = word
        lines.append(current)
    return lines


def _draw_pitch(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(box, radius=28, fill=PITCH, outline=(93, 138, 104), width=4)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    draw.line((cx, y0, cx, y1), fill=(93, 138, 104), width=4)
    draw.ellipse((cx - 90, cy - 90, cx + 90, cy + 90), outline=(120, 168, 132), width=4)
    draw.ellipse((cx - 10, cy - 10, cx + 10, cy + 10), fill=(120, 168, 132))
    for side in ("left", "right"):
        big_w, small_w = 150, 75
        bx0, bx1 = (x0, x0 + big_w) if side == "left" else (x1 - big_w, x1)
        sx0, sx1 = (x0, x0 + small_w) if side == "left" else (x1 - small_w, x1)
        draw.rectangle((bx0, cy - 210, bx1, cy + 210), outline=(93, 138, 104), width=4)
        draw.rectangle((sx0, cy - 100, sx1, cy + 100), outline=(93, 138, 104), width=4)


def generate_promo_screenshots() -> list[str]:
    out_dir = os.path.join(PUBLIC, "screenshots")
    os.makedirs(out_dir, exist_ok=True)
    wordmark = Image.open(os.path.join(PUBLIC, "assets", "brand", "HM26_Seffaf.webp")).convert("RGBA")
    written = []
    W, H = 1080, 1920
    for shot in PROMO_SHOTS:
        # dikey lacivert gradyan
        canvas = Image.new("RGB", (W, H), NAVY_DEEP)
        px = canvas.load()
        for y in range(H):
            t = y / H
            r = int(NAVY_DEEP[0] + (NAVY[0] - NAVY_DEEP[0]) * t)
            g = int(NAVY_DEEP[1] + (NAVY[1] - NAVY_DEEP[1]) * t)
            b = int(NAVY_DEEP[2] + (NAVY[2] - NAVY_DEEP[2]) * t)
            for x in range(W):
                px[x, y] = (r, g, b)
        draw = ImageDraw.Draw(canvas)
        # altın üst çizgi
        draw.rectangle((0, 0, W, 14), fill=GOLD)

        # wordmark (620px genişlik; başlıkla nefes payı bırakır)
        wm_w = 620
        wm_h = round(wordmark.size[1] * wm_w / wordmark.size[0])
        wm = wordmark.resize((wm_w, wm_h), Image.LANCZOS)
        canvas.paste(wm, ((W - wm_w) // 2, 120), wm)

        title_font = ImageFont.truetype(FONT_BOLD, 92)
        bullet_font = ImageFont.truetype(FONT_REG, 40)
        gold_font = ImageFont.truetype(FONT_BOLD, 42)

        y = 430
        for line in shot["title"].split("\n"):
            tw = draw.textlength(line, font=title_font)
            draw.text(((W - tw) / 2, y), line, font=title_font, fill=PAPER)
            y += 112
        y += 30

        # İçerik slotu üst sınırı ~700, maddeler en geç 1580'de biter; slogan 1700'e sabit
        if shot["pitch"]:
            _draw_pitch(draw, (150, y + 10, W - 150, y + 470))
            y += 520
        else:
            # sade altın ayraç
            draw.line((W // 2 - 120, y + 20, W // 2 + 120, y + 20), fill=GOLD, width=6)
            y += 90

        for bullet in shot["bullets"]:
            draw.ellipse((120, y + 14, 146, y + 40), fill=GOLD)
            for line in _wrap(draw, bullet, bullet_font, W - 260):
                draw.text((180, y), line, font=bullet_font, fill=MUTED)
                y += 56
            y += 30

        tag = "ÇEVRİMDIŞI OYNANABİLİR PWA"
        tw = draw.textlength(tag, font=gold_font)
        draw.text(((W - tw) / 2, H - 220), tag, font=gold_font, fill=GOLD)

        path = os.path.join(out_dir, shot["file"])
        canvas = canvas.quantize(colors=256, method=Image.FASTOCTREE, dither=Image.FLOYDSTEINBERG)
        canvas.save(path, "PNG", optimize=True)
        written.append(os.path.relpath(path, ROOT))
    return written


if __name__ == "__main__":
    splashes = generate_splashes()
    print(f"✓ {len(splashes)} iOS splash PNG → public/splash/")
    icons = generate_shortcut_icons()
    print(f"✓ {len(icons)} shortcut ikonu → public/icons/shortcuts/")
    shots = generate_promo_screenshots()
    print(f"✓ {len(shots)} tanıtım ekran görüntüsü → public/screenshots/")
