"""Compose Zepp store screenshots from the real sprites and the page layouts.

The Zepp store wants 360x360 PNGs with a transparent background; for square
screens the screen is centered with equal left/right margins and no top/bottom
margin. Positions, sizes and colors mirror page/lake/index.js and page/aquarium/index.js.

    python3 tools/store_screenshots.py      # writes store/screenshots/*.png
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets/default.s'
OUT = ROOT / 'store/screenshots'
W, H = 390, 450
CORNER = 70  # rounded display corners
FONT = '/System/Library/Fonts/SFNS.ttf'
ROD_TIP = (46 * 6 + 3, 52 * 6 + 3)
REEL_END = (262, 300)

SPECIES = ['minnow', 'perch', 'carp', 'trout', 'pike', 'catfish', 'eel', 'koi', 'goldfish', 'boot', 'duck', 'moonfish']
NAMES = {'minnow': 'Minnow', 'perch': 'Perch', 'carp': 'Carp', 'trout': 'Trout', 'pike': 'Pike', 'catfish': 'Catfish',
         'eel': 'Eel', 'koi': 'Koi', 'goldfish': 'Goldfish', 'boot': 'Old Boot', 'duck': 'Rubber Duck', 'moonfish': 'Moon Fish'}


def font(size):
    return ImageFont.truetype(FONT, size)


def hexc(v):
    return f'#{v:06x}'


def img(rel):
    return Image.open(ASSETS / rel).convert('RGBA')


def text_box(d, x, y, w, h, s, size, color):
    f = font(size)
    box = d.textbbox((0, 0), s, font=f)
    tw, th = box[2] - box[0], box[3] - box[1]
    d.text((x + (w - tw) / 2 - box[0], y + (h - th) / 2 - box[1]), s, font=f, fill=hexc(color))


def text_center(d, y, h, s, size, color, shadow=False):
    if shadow:  # mirrors the drop-shadow widgets on the lake page
        text_box(d, 2, y + 2, W, h, s, size, 0x0a1422)
    text_box(d, 0, y, W, h, s, size, color)


def lake(tod, clock, title, sub, title_color=0xffffff, hint=True):
    im = img(f'scene/{tod}.png')
    d = ImageDraw.Draw(im)
    text_center(d, 10, 28, clock, 22, 0xffffff, shadow=True)
    text_center(d, 44, 36, title, 30, title_color, shadow=True)
    text_center(d, 80, 26, sub, 18, 0xe0e0e0, shadow=True)
    if hint:
        text_center(d, 414, 24, 'Swipe up for your aquarium', 16, 0xcfd8dc, shadow=True)
    return im, d


def bobber(im, d, bx, by, dip, reeling=False, ripple=True, bang=False):
    for i in range(10):
        t = (i + 1) / 11
        sag = math.sin(t * math.pi) * (4 if reeling else 14)
        x = ROD_TIP[0] + (bx + 14 - ROD_TIP[0]) * t
        y = ROD_TIP[1] + (by + 4 - ROD_TIP[1]) * t + sag
        d.rectangle((round(x), round(y), round(x) + 2, round(y) + 2), fill='#eeeeee')
    if ripple:
        im.alpha_composite(img('ui/ripple.png'), (bx - 8, by + 18))
    im.alpha_composite(img('ui/bobber_dip.png' if dip else 'ui/bobber.png'), (bx, by))
    if bang:
        im.alpha_composite(img('ui/bang.png'), (bx + 6, by - 44))


def bar(d, x, y, w, h, frac, color, bg=0x1a1a2e):
    d.rounded_rectangle((x, y, x + w, y + h), radius=h // 2, fill=hexc(bg))
    d.rounded_rectangle((x, y, x + max(h, round(w * frac)), y + h), radius=h // 2, fill=hexc(color))


def shot_idle():
    im, d = lake('day', '11:32', 'Flick to cast', 'Day · koi glimmer in the sun')
    return im


def shot_bite():
    im, d = lake('dusk', '19:08', 'BITE!', 'Turn/press button or flick!', 0xffd54f, hint=False)
    bobber(im, d, 168, 238, dip=True, bang=True)
    return im


def shot_reel():
    im, d = lake('night', '22:47', 'Reel it in!', 'Turn/press button · stop on pulls', hint=False)
    bar(d, 60, 114, 270, 12, 0.62, 0x66bb6a)
    bar(d, 60, 132, 270, 8, 0.22, 0xffca28)
    t = 0.62
    bx = round(150 + (REEL_END[0] - 150) * t)
    by = round(230 + (REEL_END[1] - 230) * t)
    bobber(im, d, bx, by, dip=True, reeling=True)
    return im


def shot_catch():
    im, d = lake('day', '12:15', 'Flick to cast', 'Day · koi glimmer in the sun', hint=False)
    d.rounded_rectangle((45, 104, 345, 354), radius=24, fill='#0e1a26')
    im.alpha_composite(img('fish/koi.png'), (147, 124))
    text_center(d, 192, 36, 'Koi', 28, 0xffffff)
    text_center(d, 228, 28, '54 cm', 22, 0xb0bec5)
    text_center(d, 260, 30, 'NEW!', 24, 0xffd54f)
    text_center(d, 304, 26, 'Flick to cast again', 18, 0x90a4ae)
    return im


def shot_aquarium():
    caught = {'minnow': (7, 8), 'perch': (4, 27), 'carp': (3, 71), 'trout': (1, 44), 'catfish': (2, 96),
              'koi': (1, 54), 'boot': (2, 43), 'duck': (1, 11)}
    im = Image.new('RGBA', (W, H), '#0b2135')
    d = ImageDraw.Draw(im)
    text_center(d, 44, 36, 'Aquarium', 30, 0xffffff)
    total = sum(c for c, _ in caught.values())
    text_center(d, 80, 26, f'{len(caught)}/12 species · {total} caught · 38 casts', 17, 0x90caf9)
    for i, fid in enumerate(SPECIES):
        x = 36 + (i % 3) * 106
        y = 118 + (i // 3) * 116
        if y > H:
            break
        d.rounded_rectangle((x + 4, y + 4, x + 102, y + 112), radius=14, fill='#12304a')
        rec = caught.get(fid)
        im.alpha_composite(img(f'fish/{fid}_s.png' if rec else f'fish/{fid}_q.png'), (x + 21, y + 12))
        text_box(d, x + 6, y + 56, 94, 24, NAMES[fid] if rec else '???', 17, 0xffffff if rec else 0x546e7a)
        if rec:
            size = f'EU {rec[1]}' if fid == 'boot' else f'{rec[1]} cm'
            text_box(d, x + 6, y + 80, 94, 22, f'×{rec[0]} · {size}', 14, 0x90a4ae)
    return im


def to_store(screen):
    """Round the display corners, scale to 360 high and center on a transparent 360x360 canvas."""
    mask = Image.new('L', (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, W - 1, H - 1), radius=CORNER, fill=255)
    screen = screen.copy()
    screen.putalpha(mask)
    w = round(W * 360 / H)
    screen = screen.resize((w, 360), Image.LANCZOS)
    out = Image.new('RGBA', (360, 360), (0, 0, 0, 0))
    out.alpha_composite(screen, ((360 - w) // 2, 0))
    return out


SHOTS = {
    '1-cast': shot_idle,
    '2-bite': shot_bite,
    '3-reel': shot_reel,
    '4-catch': shot_catch,
    '5-aquarium': shot_aquarium,
}

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for name, make in SHOTS.items():
        to_store(make()).save(OUT / f'{name}.png')
    print(f'wrote {len(SHOTS)} screenshots to {OUT.relative_to(ROOT)}')
