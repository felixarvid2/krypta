#!/usr/bin/env python3
"""Version 13 graphics for Krypta ("Biblioteket och Gjuteriet"): the forbidden library and the foundry, six new enemies,
the librarian and the forge colossus, textures, props, items, particles, HUD and touch icons.

Run from the folder that holds retrofps/ and assets/ (e.g. /home/user/test):
    python3 retrofps/tools/props10/make.py [name ...]
(with names only those builders run, e.g. `python3 retrofps/tools/props10/make.py grimoire sheet`; the contact sheet
always shows everything this script has written so far, plus the two new first-person weapons)

The first-person weapons runebook / steamcannon (fp_*.png, pick_*.png, js/weapons.js) come from tools/weapon-frames
(render-static.mjs + pack.py, see the README there, version 13).

Out to retrofps/assets/gfx:
  enemies-{archivist,moltengolem,steambot}_{idle,movement,attack,take_damage,death}.png (64x64 cells, feet row 57)
  enemies-{grimoire,inkslime,sparkdrone}_{...}.png (32x32 cells, feet row 28; grimoire and sparkdrone fly)
  boss_librarian_{idle,attack,cast,hurt,death}.png, boss_colossus_{idle,attack,cast,hurt,death}.png (116x116)
  prop_{lectern,chandelier,press,anvil2,steamjet,inkblot}.png
  item_inkflask.png, pick_runebook.png (the runebook's pickup; the side view of the 3D book shows only its edge),
  part_{page,ink2,steam,ember2}.png, icon_ink.png (8x8)
Out to retrofps/assets/wall:
  wall_bookshelf, wall_libpanel, wall_boss_librarian, wall_ironplate, wall_furnace, wall_boss_colossus (64x128)
  floor_carpet, floor_irongrate, floor_ink, floor_conveyor, floor_conveyor2, floor_molten, floor_vent,
  floor_boss_librarian, floor_boss_colossus (64x64)
Out to retrofps/assets/touch: icon_book.png (96x96, white on transparent)
Contact sheet: <scratchpad>/en/v13_sheet.png

Sources (licences checked; everything not listed is drawn procedurally below in the outlined style of
tools/props2-props9, whose helpers are reused):
  * Classic 64 Asset Pack 0.6 (Craig Snedeker, CC0): Wood/wood_fancy_01 (grain of the library panelling and the lectern
      wood), Metal/metal_grunge_02 and metal_rusty_04 (grain of the iron plates, the furnace front and the colossus
      wall), Floor/carpet_brown_01 (the weave of the carpets)
  (32rogues, Super Retro World and Mana Seed are NOT used: their licences forbid AI use / redistribution.)
Drawn: all six enemies, both bosses, all props, items, particles and icons.
Additive particles (stored opaque on black, like part_ember): part_ember2.
Name clashes (existing files are never overwritten): prop_anvil.png already exists (the smithy, '(' since version 3), so
the foundry's casting anvil is prop_anvil2.png; part_ink.png already exists (version 5), so the new ink drop is
part_ink2.png.
Notes: floor_conveyor / floor_conveyor2 are the two frames of the belt: chevron ribs pointing +x with a 16 px period,
the second frame shifted 8 px (half a rib) along +x; the steel rails at the y edges stay put. floor_vent and
floor_ink are pads that also tile. wall_furnace and wall_boss_colossus keep iron pilasters at their edges so they
tile side by side. Suggested sizes (skeleton = 1.0): grimoire 0.55, inkslime 0.75 (the two halves it splits into
0.5), sparkdrone 0.55, archivist 1.05, steambot 1.05, moltengolem 1.35; bosses (116 px cells, the pharaoh is 114 px at
3.8): librarian 4.2, colossus 4.4.
"""
import importlib.util
import json
import math
import os
import random
import re
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.dont_write_bytecode = True          # the helper modules of props2-props9 are loaded without touching their __pycache__


def _load(name, rel):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, '..', rel, 'make.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


P2 = _load('props2make', 'props2')
P3 = _load('props3make', 'props3')
P4 = _load('props4make', 'props4')
P5 = _load('props5make', 'props5')
P6 = _load('props6make', 'props6')
P7 = _load('props7make', 'props7')
P8 = _load('props8make', 'props8')
P9 = _load('props9make', 'props9')
from_p2 = 'OUT Pic outline outline_same hard shift gmap tile_lum blend mask_draw glow from_arr shear squash strip'.split()
globals().update({k: getattr(P2, k) for k in from_p2})
cut_below = P4.cut_below
mask_of, ground, pnoise, up2, spark = P5.mask_of, P5.ground, P5.pnoise, P5.up2, P5.spark
dark, flash = P6.dark, P6.flash
puff, wrap_outline, bolt, gear, rivets = P7.puff, P7.wrap_outline, P7.bolt, P7.gear, P7.rivets
chain, sparkles, clods = P8.chain, P8.sparkles, P8.clods
rune_ring, paste_wrap = P9.rune_ring, P9.paste_wrap
S0, S1, S2, S3, S4 = P2.S0, P2.S1, P2.S2, P2.S3, P2.S4
I0, I1, I2, I3 = P2.I0, P2.I1, P2.I2, P2.I3
M0, M1, M2, M3 = P2.M0, P2.M1, P2.M2, P2.M3
F0, F1, F2, F3 = P2.F0, P2.F1, P2.F2, P2.F3
AU0, AU1, AU2, AU3, AU4 = P5.AU0, P5.AU1, P5.AU2, P5.AU3, P5.AU4
BR0, BR1, BR2, BR3, BR4 = P7.BR0, P7.BR1, P7.BR2, P7.BR3, P7.BR4

A = 'assets/'
C64 = A + 'textures/Classic 64 Asset Pack 0.6/- Classic 64 Asset Pack 0.6/'
G_OUT, W_OUT, T_OUT = 'retrofps/assets/gfx/', 'retrofps/assets/wall/', 'retrofps/assets/touch/'
SCR = '/tmp/claude-0/-home-user/80ee56ba-2fa6-5354-b261-a4ca4fdcb508/scratchpad/en/'
SHEET, MANIFEST = SCR + 'v13_sheet.png', SCR + 'v13_manifest.json'
WHITE = (255, 255, 255)
CLEAR = (0, 0, 0, 0)

# ---------------------------------------------------------------- library palettes
WD0, WD1, WD2, WD3, WD4 = (34, 18, 14), (60, 32, 22), (92, 52, 32), (128, 78, 46), (166, 110, 66)   # mahogany
BOOKS = [((70, 16, 20), (128, 34, 34), (176, 62, 50)),        # red
         ((20, 52, 36), (36, 90, 56), (68, 132, 78)),         # green
         ((22, 32, 74), (38, 60, 122), (70, 98, 168)),        # blue
         ((92, 62, 22), (146, 104, 38), (194, 152, 68)),      # ochre
         ((50, 26, 66), (86, 46, 108), (126, 78, 148)),       # purple
         ((58, 36, 24), (94, 60, 36), (132, 92, 56)),         # brown leather
         ((30, 28, 34), (52, 50, 58), (84, 80, 90))]          # black
PA0, PA1, PA2, PA3 = (150, 124, 90), (196, 172, 130), (226, 208, 168), (246, 236, 208)     # parchment
IK0, IK1, IK2, IK3, IK4 = (8, 8, 16), (20, 22, 42), (40, 48, 88), (92, 112, 170), (206, 222, 255)   # glossy ink
RN0, RN1, RN2, RN3 = (120, 64, 16), (222, 150, 40), (255, 214, 100), (255, 248, 214)       # gold runes
GH0, GH1, GH2, GH3 = (54, 70, 104), (104, 132, 168), (164, 194, 220), (228, 244, 255)       # ghost light
WAX0, WAX1, WAX2 = (196, 172, 140), (232, 218, 188), (250, 244, 226)                       # candle wax
CR0, CR1, CR2, CR3 = (70, 12, 20), (112, 24, 30), (150, 40, 40), (186, 70, 56)             # library carpet red
# ---------------------------------------------------------------- foundry palettes
FE0, FE1, FE2, FE3, FE4 = (22, 22, 28), (40, 40, 48), (62, 62, 72), (92, 92, 104), (134, 136, 150)   # iron
RU0, RU1, RU2 = (88, 42, 24), (132, 70, 34), (170, 102, 52)                                  # rust
MO0, MO1, MO2, MO3, MO4 = (110, 20, 10), (190, 50, 14), (240, 112, 20), (255, 192, 60), (255, 248, 196)  # molten metal
SL0, SL1, SL2 = (30, 24, 24), (54, 42, 40), (80, 64, 58)                                     # slag crust
ST0, ST1, ST2, ST3 = (140, 146, 158), (186, 192, 202), (220, 224, 232), (248, 250, 252)     # steam
CU0, CU1, CU2, CU3 = (80, 36, 22), (140, 70, 40), (196, 112, 66), (236, 166, 112)           # copper
SPK = (MO3, MO4, WHITE)
STEAM = (ST0, ST1, ST2, ST3)

SAVED = {}


def save(im, path, n=1, additive=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path)
    SAVED[path] = (n, additive)
    return im


def save_enemy(sheet, state, frames, fw, floor=None):
    """fw x fw cells, nothing below the feet row (57 / 28), hard alpha."""
    floor = floor if floor is not None else (57 if fw == 64 else 28)
    out = Image.new('RGBA', (fw * len(frames), fw), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        assert f.size == (fw, fw), (sheet, state, f.size)
        b = f.getbbox()
        if b and b[3] - 1 > floor:
            f = shift(f, 0, floor - (b[3] - 1))
        out.paste(hard(f), (i * fw, 0))
    save(out, G_OUT + f'enemies-{sheet}_{state}.png', len(frames))


def cells(frames, w, h):
    out = Image.new('RGBA', (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        out.paste(hard(f.crop((0, 0, w, h))), (i * w, 0))
    return out


def on(base, *layers):
    """Copy of an RGBA image with more RGBA images composited over it."""
    out = base.copy()
    for im in layers:
        out.alpha_composite(im)
    return out


def save_prop(name, frames, path=None):
    return save(strip(frames), path or G_OUT + f'prop_{name}.png', len(frames))


BUILDERS = {}


def builder(name):
    def deco(fn):
        BUILDERS[name] = fn
        return fn
    return deco


# ================================================================== shared drawing helpers
def flame(p, x, y, h, lean=0.0, w=1.0, pal=(F0, F1, F2, F3)):
    """A candle / fire tongue standing on (x, y), h tall: a dark-orange rim, yellow body, a white-hot core."""
    pts = []
    for i in range(9):
        t = i / 8
        pts.append((x - w * 1.6 * math.sin(t * math.pi) ** 0.7 + lean * t * t, y - h * t))
    pts2 = [(x + (x - px) + 2 * lean * ((y - py) / h) ** 2, py) for px, py in pts]
    p.poly(pts + pts2[::-1], pal[0])
    p.poly([(x + (px - x) * 0.62 + lean * 0.1, y - (y - py) * 0.85) for px, py in pts] +
           [(x + (px - x) * 0.62 + lean * 0.1, y - (y - py) * 0.85) for px, py in pts2[::-1]], pal[1])
    p.l(x, y - 1, x + lean * 0.3, y - h * 0.45, pal[2])
    p.p(x, y - 1, pal[3])


def candle(p, x, base, h, lit=1, k=0, w=1.5):
    """A wax candle from row base up h px with a drip; lit: 0 out (a curl of smoke), 1 burning; k varies the flicker."""
    p.r(x - w, base - h, x + w, base, WAX1)
    p.l(x - w, base - h, x - w, base, WAX2)
    p.l(x + w, base - h + 1, x + w, base, WAX0)
    p.l(x - w, base - h, x + w, base - h, WAX2)
    p.ps([(x + w, base - h + 1), (x + w, base - h + 2)], WAX2)
    p.p(x, base - h - 1, (40, 30, 26))
    if lit:
        hh = (5, 6, 4)[k % 3]
        flame(p, x, base - h - 1, hh, lean=(0, 0.8, -0.6)[k % 3], w=0.9)


def halo(p, x, y, r, cols, n=10, seed=0):
    """A broken ring of light pixels round (x, y) - the 'glow' of a light source in binary-alpha pixel art."""
    r2 = random.Random(seed)
    for i in range(n):
        a = i / n * math.tau + r2.uniform(-0.15, 0.15)
        p.p(x + math.cos(a) * r, y + math.sin(a) * r * 0.9, cols[i % len(cols)])


RUNES = [["#..#", "#.#.", "##..", "#.#."], ["###.", ".#..", ".#..", "###."], ["#.#", ".#.", "#.#", "..."],
         ["##.", "#.#", "##.", "#.."], [".#.", "###", ".#.", "#.#"], ["#..", "###", "..#", "..#"]]


def rune(p, x, y, k, c, glow_=None):
    """A small angular rune glyph (one of RUNES) with its top-left at (x, y); glow_ = colour of a ring behind it."""
    g = RUNES[k % len(RUNES)]
    if glow_:
        for j, row in enumerate(g):
            for i, ch in enumerate(row):
                if ch == '#':
                    p.ps([(x + i - 1, y + j), (x + i + 1, y + j), (x + i, y + j - 1), (x + i, y + j + 1)], glow_)
    p.bitmap(x, y, g, {'#': c})


def flying_rune(p, x, y, k, sz=1, trail=0.0):
    """A thrown rune: a gold glyph in a ring of light with a short trail behind it (to the left)."""
    if trail:
        for j in range(int(trail)):
            p.p(x - 2 - j, y + 1.5 + math.sin(j) * 0.8, RN1 if j % 2 else RN2)
    p.e(x - 3 - sz, y - 2 - sz, x + 5 + sz, y + 5 + sz, RN2)
    p.e(x - 2 - sz, y - 1 - sz, x + 4 + sz, y + 4 + sz, (64, 30, 10))
    p.p(x - 2 - sz, y + 1, RN3)
    rune(p, x - 0.5, y - 0.5, k, RN3)


def page_sheet(p, x, y, ang, w=5, h=4, lines=True):
    """A single loose page turning in the air: a parchment quad tilted by ang (radians) with ink lines."""
    ca, sa = math.cos(ang), math.sin(ang)
    P_ = lambda u, v: (x + u * ca - v * sa * 0.6, y + u * sa + v * ca)
    q = [P_(-w / 2, -h / 2), P_(w / 2, -h / 2), P_(w / 2, h / 2), P_(-w / 2, h / 2)]
    p.poly(q, PA2)
    p.l(*q[0], *q[1], PA3)
    p.l(*q[2], *q[3], PA0)
    if lines and h >= 4:
        for k in range(1, int(h) - 1, 2):
            a_, b_ = P_(-w / 2 + 1, -h / 2 + k), P_(w / 2 - 1.5, -h / 2 + k)
            p.l(*a_, *b_, PA0)


def steam_puff(p, x, y, r, k=0):
    """One steam puff: white body, grey underside; k > 0 thins and greys it."""
    pal = STEAM if k < 2 else (dark(ST0, 0.9), ST0, ST1, ST2)
    puff(p, x, y, r, pal)


def steam_cloud(size, cx, cy, w, h, seed, k=0.0, floor=None):
    """An outlined steam cloud: clustered puffs (tools/props7 cloud) filling w x h round (cx, cy); k (0..1) spreads it
    out, thins it and greys it."""
    p = Pic(*size) if isinstance(size, tuple) else Pic(size, size)
    pal = STEAM if k < 0.5 else (dark(ST0, 0.85), ST0, ST1, ST2)
    P7.cloud(p, cx, cy, w * (1 + k * 0.3), h * (1 - k * 0.25), seed, pal)
    im = p.im if floor is None else cut_below(p.im, floor)
    return outline_same(im)


def molten_drops(p, n, seed, box, pal=(MO2, MO3, MO4)):
    r2 = random.Random(seed)
    x0, y0, x1, y1 = box
    for _ in range(n):
        x, y = r2.uniform(x0, x1), r2.uniform(y0, y1)
        if r2.random() < 0.35:
            p.r(x, y, x + 1, y + 1, pal[0]); p.p(x, y, pal[2])
        else:
            p.p(x, y, r2.choice(pal))


def explosion(size, cx, cy, r, k, seed):
    """A fiery burst (white core, yellow, orange, dark smoke rim) that grows and breaks up with k (0..1)."""
    p = Pic(size, size)
    r2 = random.Random(seed)
    if k < 0.75:
        for i in range(9):
            a = i / 9 * math.tau + r2.uniform(-0.3, 0.3); d = r * r2.uniform(0.3, 0.7) * (0.6 + k)
            rr = r * r2.uniform(0.35, 0.5) * (1.1 - k * 0.6)
            puff(p, cx + math.cos(a) * d, cy + math.sin(a) * d * 0.85, max(1.5, rr), (MO0, MO1, MO2, MO3))
        if k < 0.4:
            p.e(cx - r * 0.45, cy - r * 0.45, cx + r * 0.45, cy + r * 0.45, MO3)
            p.e(cx - r * 0.25, cy - r * 0.25, cx + r * 0.25, cy + r * 0.25, MO4)
    else:
        for i in range(6):
            a = r2.uniform(0, math.tau); d = r * r2.uniform(0.2, 0.8)
            puff(p, cx + math.cos(a) * d, cy - r * 0.3 + math.sin(a) * d * 0.6, max(1.5, r * 0.3), ((28, 24, 26), (54, 48, 50), (84, 78, 80), (120, 114, 112)))
    im = outline_same(p.im)
    q = Pic(size, size)
    for i in range(8 + int(k * 6)):
        a = r2.uniform(0, math.tau); d = r * (0.9 + k * 0.9) * r2.uniform(0.6, 1.1)
        q.p(cx + math.cos(a) * d, cy + math.sin(a) * d * 0.85, r2.choice(SPK))
    return on(im, q.im)


# ================================================================== TEXTURES (palettized like props5-props9)
def tone(rgb, k=0.8, lift=8):
    return np.asarray(rgb, dtype=np.float32) * k + lift


def finish(rgb, name, colors=48, half=True):
    im = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), 'RGB')
    if half:
        im = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
    save(im.quantize(colors, method=Image.Quantize.MEDIANCUT).convert('RGB'), W_OUT + name)


def put(rgb, im, dx=0, dy=0):
    """Composite an RGBA image onto an RGB array (opaque pixels only, no wrap); returns the mask."""
    a = np.array(im)
    h, w = rgb.shape[:2]
    m = np.zeros((h, w), bool)
    sub = a[max(0, -dy):h - dy, max(0, -dx):w - dx]
    mm = sub[:, :, 3] > 0
    tgt = rgb[max(0, dy):max(0, dy) + sub.shape[0], max(0, dx):max(0, dx) + sub.shape[1]]
    tgt[mm] = sub[mm, :3]
    m[max(0, dy):max(0, dy) + sub.shape[0], max(0, dx):max(0, dx) + sub.shape[1]] = mm
    return m


WD_STOPS = [(0, WD0), (0.3, WD1), (0.6, WD2), (0.85, WD3), (1, WD4)]
FE_STOPS = [(0, FE0), (0.3, FE1), (0.6, FE2), (0.85, FE3), (1, FE4)]
MO_STOPS = [(0, MO0), (0.3, MO1), (0.6, MO2), (0.85, MO3), (1, MO4)]
INK_STOPS = [(0, IK0), (0.45, IK1), (0.75, IK2), (1, IK3)]


def wood_grain(w, h, seed, src='Wood/Materials/wood_fancy_01.jpg', vertical=True):
    """Wood grain 0..1: a Classic 64 photo (CC0) stretched along the grain plus soft noise."""
    lum = tile_lum(C64 + src, (w, h) if vertical else (h, w), (1, max(1, h // w)) if vertical else (max(1, h // w), 1))
    if not vertical:
        lum = lum.T
    n = pnoise(w, h, seed, ((8, 1.0), (4, 0.5)))
    return np.clip(0.5 + (lum - 0.5) * 0.55 + (n - 0.5) * 0.4, 0, 1)


def shelf_books(p, x0, x1, base, hmax, seed, dim=1.0):
    """A row of books standing on row `base` between x0 and x1: varied heights, widths and colours, gold bands, labels,
    the odd leaning book, gaps and little stacks of books lying flat."""
    r2 = random.Random(seed)
    x = x0
    pal = [tuple(dark(c, dim) for c in b) for b in BOOKS]
    while x <= x1:
        roll = r2.random()
        if roll < 0.06 and x1 - x > 12:                                   # a stack lying flat
            wdt = r2.randint(9, 12)
            y = base
            for k in range(r2.randint(2, 3)):
                c = pal[r2.randrange(len(pal))]
                th = r2.choice((2, 3, 3))
                ox = r2.randint(-1, 1)
                p.r(x + ox, y - th + 1, x + ox + wdt - 1, y, c[1])
                p.l(x + ox, y - th + 1, x + ox + wdt - 1, y - th + 1, c[2])
                p.l(x + ox + wdt - 1, y - th + 1, x + ox + wdt - 1, y, PA2)        # page edges at the end
                p.p(x + ox + 2, y - th + 2, AU2) if th == 3 else None
                y -= th
            x += wdt + 1
            continue
        if roll < 0.12:                                                    # a gap
            x += r2.randint(1, 3)
            continue
        wdt = r2.choice((2, 3, 3, 4, 4, 5))
        if x + wdt - 1 > x1:
            wdt = x1 - x + 1
            if wdt < 2:
                break
        ht = r2.randint(int(hmax * 0.62), hmax)
        c = pal[r2.randrange(len(pal))]
        lean = r2.random() < 0.08 and wdt <= 4
        if lean:                                                           # leaning on its neighbour
            k = 3
            p.poly([(x, base), (x + wdt - 1, base), (x + wdt - 1 + k, base - ht + 1), (x + k, base - ht + 1)], c[1])
            p.l(x, base, x + k, base - ht + 1, c[2])
            p.l(x + 1, base - ht * 0.25, x + wdt - 1 + 1, base - ht * 0.25, AU2)
            x += wdt + k
            continue
        top = base - ht + 1
        p.r(x, top, x + wdt - 1, base, c[1])
        p.l(x, top, x, base, c[2])
        if wdt >= 3:
            p.l(x + wdt - 1, top, x + wdt - 1, base, c[0])
        p.l(x, top, x + wdt - 1, top, c[2])
        if r2.random() < 0.6:                                              # gold bands
            p.l(x, top + 2, x + wdt - 1, top + 2, AU1 if dim < 1 else AU2)
            p.l(x, base - 2, x + wdt - 1, base - 2, AU1)
        if wdt >= 3 and r2.random() < 0.5:                                 # a label
            ly = top + ht // 3
            p.r(x + 1, ly, x + wdt - 2, ly + 2, dark(PA1, dim))
        elif wdt >= 3 and r2.random() < 0.5:
            p.l(x + 1, top + ht // 2, x + wdt - 2, top + ht // 2, AU1)
        x += wdt


def tex_wall_bookshelf():
    """Floor-to-ceiling bookcase: four shelves crammed with books between two mahogany posts, a crown moulding on top
    and a kick plate below (full resolution so the spines read)."""
    w, h = 64, 128
    yy, xx = np.mgrid[0:h, 0:w]
    g = wood_grain(w, h, 601)
    rgb = gmap(g * 0.35, WD_STOPS)                                         # the dark back of the case
    rgb = blend(rgb, np.ones((h, w), bool), (12, 6, 6), 0.45)
    p = Pic(w, h)
    boards = [(34, 37), (65, 68), (96, 99)]
    bays = [(6, 33), (38, 64), (69, 95), (100, 123)]
    for k, (y0, y1) in enumerate(bays):
        shelf_books(p, 4, 59, y1, y1 - y0 - 2, 610 + k)
    a = np.array(p.im); bm = a[:, :, 3] > 0
    rgb[bm] = a[bm, :3]
    for (y0, y1) in bays:                                                  # the shelf above casts a shadow on the book tops
        sh = (yy >= y0) & (yy <= y0 + 3)
        rgb[sh] = blend(rgb, sh, (10, 4, 4), 0.55)[sh]
    for (y0, y1) in boards:                                                # shelf boards
        rgb[(yy >= y0) & (yy <= y1)] = gmap(g * 0.4 + 0.45, WD_STOPS)[(yy >= y0) & (yy <= y1)]
        rgb[yy == y0] = WD4
        rgb[yy == y1] = WD1
        rgb[yy == y1 + 1] = blend(rgb, yy == y1 + 1, (8, 4, 4), 0.6)[yy == y1 + 1]
    cr = yy <= 5                                                           # crown moulding
    rgb[cr] = gmap(g * 0.4 + 0.4, WD_STOPS)[cr]
    rgb[yy == 0] = WD1; rgb[yy == 1] = WD4; rgb[yy == 3] = WD2; rgb[yy == 4] = WD3; rgb[yy == 5] = WD0
    rgb[(yy == 2) & (xx % 4 == 1)] = WD1                                   # dentils
    kp = yy >= 124
    rgb[kp] = gmap(g * 0.4 + 0.3, WD_STOPS)[kp]
    rgb[yy == 124] = WD4; rgb[yy == 127] = WD0
    for (x0, x1) in ((0, 3), (60, 63)):                                    # the posts (side by side they read as cases)
        m = (xx >= x0) & (xx <= x1)
        rgb[m] = gmap(g * 0.45 + 0.4, WD_STOPS)[m]
        rgb[(xx == x0)] = WD4 if x0 == 0 else WD3
        rgb[(xx == x1)] = WD0
        rgb[m & ((yy == 20) | (yy == 50) | (yy == 82) | (yy == 112))] = AU1   # little brass shelf pins
    rgb[(xx == 4) & (yy > 5) & (yy < 124)] = blend(rgb, (xx == 4), (8, 4, 4), 0.5)[(xx == 4) & (yy > 5) & (yy < 124)]
    finish(rgb, 'wall_bookshelf.png', 64, half=False)


def tex_wall_libpanel():
    """Dark mahogany wainscot: two raised panels with bevelled edges framed by stiles and rails, a gilt chair rail, a
    carved cornice and a skirting board."""
    w, h = 32, 64
    yy, xx = np.mgrid[0:h, 0:w]
    g = wood_grain(w, h, 621)
    rgb = gmap(g * 0.5 + 0.3, WD_STOPS)                                    # stiles and rails
    gh = wood_grain(w, h, 622, vertical=False)
    for (y0, y1) in ((6, 33), (40, 56)):                                   # the raised panels
        x0, x1 = 3, 28
        m = (xx >= x0) & (xx <= x1) & (yy >= y0) & (yy <= y1)
        rgb[m] = gmap(gh * 0.5 + 0.22, WD_STOPS)[m]
        inner = (xx >= x0 + 2) & (xx <= x1 - 2) & (yy >= y0 + 2) & (yy <= y1 - 2)
        rgb[inner] = gmap(g * 0.5 + 0.35, WD_STOPS)[inner]
        rgb[(yy == y0) & (xx >= x0) & (xx <= x1)] = WD0                     # shadowed recess (light from the top left)
        rgb[(xx == x0) & (yy >= y0) & (yy <= y1)] = WD0
        rgb[(yy == y1) & (xx >= x0) & (xx <= x1)] = WD3
        rgb[(xx == x1) & (yy >= y0) & (yy <= y1)] = WD3
        rgb[(yy == y0 + 2) & (xx >= x0 + 2) & (xx <= x1 - 2)] = WD4        # bevel of the raised field
        rgb[(xx == x0 + 2) & (yy >= y0 + 2) & (yy <= y1 - 2)] = WD4
        rgb[(yy == y1 - 2) & (xx >= x0 + 2) & (xx <= x1 - 2)] = WD1
        rgb[(xx == x1 - 2) & (yy >= y0 + 2) & (yy <= y1 - 2)] = WD1
    rgb[yy <= 3] = gmap(g[yy <= 3] * 0.3 + 0.5, WD_STOPS)                  # cornice
    rgb[yy == 0] = WD0; rgb[yy == 1] = WD4; rgb[yy == 3] = WD1
    rgb[(yy == 2) & (xx % 3 == 0)] = WD1
    for y0 in (36,):                                                       # gilt chair rail
        rgb[yy == y0] = AU3; rgb[yy == y0 + 1] = AU1; rgb[yy == y0 + 2] = WD0
        rgb[(yy == y0 + 1) & (xx % 4 == 2)] = AU3
    rgb[yy >= 59] = gmap(g[yy >= 59] * 0.3 + 0.2, WD_STOPS)                # skirting
    rgb[yy == 59] = WD3; rgb[yy == 63] = WD0
    rgb[xx == 0] = blend(rgb, xx == 0, WD4, 0.4)[xx == 0]
    finish(tone(rgb, 0.95, 4), 'wall_libpanel.png', 40)


def open_book(p, cx, cy, w, h, glow_=1, seed=0, k=0):
    """An open book seen from the front, slightly from above: two page blocks curving up from the gutter, leather
    covers under them, lines of gold runes; glow_ 0 = plain ink text, 1/2 = runes glowing."""
    cov = BOOKS[0]
    p.poly([(cx - w / 2 - 1, cy - h / 2 + 2), (cx, cy - h / 2 + 4), (cx + w / 2 + 1, cy - h / 2 + 2),
            (cx + w / 2 + 1, cy + h / 2 + 2), (cx, cy + h / 2 + 3), (cx - w / 2 - 1, cy + h / 2 + 2)], cov[0])
    for sd in (-1, 1):
        x_out = cx + sd * w / 2
        pg = [(cx, cy - h / 2 + 3), (cx + sd * w * 0.25, cy - h / 2 - 1), (x_out, cy - h / 2 + 1),
              (x_out, cy + h / 2), (cx + sd * w * 0.25, cy + h / 2 - 2), (cx, cy + h / 2 + 1)]
        p.poly(pg, PA2 if sd < 0 else PA1)
        p.l(x_out, cy - h / 2 + 1, x_out, cy + h / 2, PA0)
        p.lines([(cx, cy + h / 2 + 1), (cx + sd * w * 0.25, cy + h / 2 - 2 + 1), (x_out, cy + h / 2 + 1)], PA0)
        r2 = random.Random(seed + sd)
        for j in range(3, int(h) - 2, 3):                                 # lines of writing / runes
            y = cy - h / 2 + j
            xa, xb = cx + sd * 2, x_out - sd * 2
            if glow_:
                xx_ = min(xa, xb)
                while xx_ < max(xa, xb) - 2:
                    if r2.random() < 0.7:
                        p.l(xx_, y, xx_ + 1, y, RN1 if glow_ == 1 else RN2)
                        if glow_ == 2 and r2.random() < 0.4:
                            p.p(xx_, y - 1, RN3)
                    xx_ += 3
            else:
                p.l(xa, y, xb + (r2.randint(-3, 0) * sd), y, (110, 96, 80))
    p.l(cx, cy - h / 2 + 3, cx, cy + h / 2 + 1, PA0)


def tex_wall_boss_librarian():
    # wall: dim bookcases round a carved arch; in it the librarian's great book floats open, blazing with runes, under
    # a ring of runes, candles burning on the arch's plinths
    w, h = 64, 128
    yy, xx = np.mgrid[0:h, 0:w]
    rgb = gmap(wood_grain(w, h, 631) * 0.3, WD_STOPS) * 0.6
    p = Pic(w, h)
    for k, (y0, y1) in enumerate(((4, 30), (35, 62), (67, 94), (99, 123))):
        shelf_books(p, 0, 63, y1, y1 - y0 - 2, 640 + k, dim=0.55)
    a = np.array(p.im); m = a[:, :, 3] > 0
    rgb[m] = a[m, :3]
    for y0 in (31, 63, 95, 124):
        rgb[(yy >= y0) & (yy <= y0 + 3)] = WD2
        rgb[yy == y0] = WD3; rgb[yy == y0 + 3] = WD0
    cx = 31.5
    q = Pic(w, h)                                                          # the arch
    q.r(cx - 22, 30, cx + 22, 127, WD1)
    q.e(cx - 22, 6, cx + 22, 54, WD1)
    q.r(cx - 20, 30, cx + 20, 118, AU1)
    q.e(cx - 20, 8, cx + 20, 52, AU1)
    q.r(cx - 18, 30, cx + 18, 117, (16, 10, 26))
    q.e(cx - 18, 10, cx + 18, 50, (16, 10, 26))
    q.arc(cx - 20, 8, cx + 20, 52, 180, 270, AU3)
    q.l(cx - 20, 30, cx - 20, 118, AU3)
    for sd in (-1, 1):                                                     # plinths with candles
        q.r(cx + sd * 21 - 4, 112, cx + sd * 21 + 4, 127, WD2)
        q.l(cx + sd * 21 - 4, 112, cx + sd * 21 + 4, 112, WD4)
        q.l(cx + sd * 21 - 4, 116, cx + sd * 21 + 4, 116, AU2)
        for j, ox in enumerate((-2, 2)):
            candle(q, cx + sd * 21 + ox, 111, 6 + j * 3, 1, k=j)
    a = np.array(q.im); am = a[:, :, 3] > 0
    rgb[am] = a[am, :3]
    niche = (np.abs(xx - cx) < 18) & ((yy > 30) | (np.hypot((xx - cx) / 18, (yy - 30) / 20) < 1)) & (yy < 117)
    rr = np.hypot(xx - cx, (yy - 66) * 0.8)
    rgb[niche] = gmap(np.clip(1 - rr / 34, 0, 1)[niche], [(0, (16, 10, 26)), (0.5, (52, 28, 40)), (0.8, RN0), (1, RN1)])
    b = Pic(w, h)
    rune_bits = Pic(w, h)
    for k in range(10):                                                    # a ring of runes round the book
        a_ = k / 10 * math.tau - math.pi / 2
        rune(rune_bits, cx + math.cos(a_) * 15 - 1.5, 62 + math.sin(a_) * 20 - 1.5, k, RN2, RN0)
    open_book(b, cx, 66, 28, 15, 2, seed=3)
    sparkles(b, 14, 655, (cx - 15, 44, cx + 15, 56), (RN1, RN2, RN3))
    a = np.array(rune_bits.im); m2 = a[:, :, 3] > 0
    rgb[m2 & niche] = a[m2 & niche, :3]
    a = np.array(outline_same(b.im)); m3 = a[:, :, 3] > 0
    rgb[m3] = a[m3, :3]
    rgb[wrap_outline(am)] = OUT
    finish(rgb, 'wall_boss_librarian.png', 64, half=False)

    # floor: deep blue carpet with a gold rune medallion in every tile and a border of gold lozenges
    w = h = 32
    yy, xx = np.mgrid[0:h, 0:w]
    weave = tile_lum(C64 + 'Floor/Materials/carpet_brown_01.png', (w, h))
    n = pnoise(w, h, 651, ((8, 1.0), (4, 0.5)))
    rgb = gmap(np.clip(weave * 0.4 + n * 0.4, 0, 1), [(0, (14, 14, 40)), (0.5, (28, 26, 70)), (1, (46, 42, 100))])
    cxx = cyy = 15.5
    rune_ring(rgb, cxx, cyy, 8, 13.5, ((40, 30, 60), RN0, RN2), 6, 1)
    r = np.hypot(xx - cxx, yy - cyy)
    rgb[r < 4] = RN1
    rgb[r < 2] = RN3
    star = (np.abs(xx - cxx) + np.abs(yy - cyy) < 7) & (r >= 4) & ((np.abs(xx - cxx) < 0.8) | (np.abs(yy - cyy) < 0.8))
    rgb[star] = RN2
    edge = (xx == 0) | (yy == 0)
    rgb[edge] = RN0
    loz = (np.abs(xx - 0) + np.abs(yy - 0) < 3) | (np.abs(xx - 32) + np.abs(yy - 0) < 3) | (np.abs(xx - 0) + np.abs(yy - 32) < 3) | (np.abs(xx - 32) + np.abs(yy - 32) < 3)
    rgb[loz] = RN1
    finish(tone(rgb, 0.95, 4), 'floor_boss_librarian.png', 40)


def tex_floor_carpet():
    """Wine-red library carpet: a woven ground, a gold lattice of diamonds with little rosettes where they cross and a
    dark motif inside every diamond (tiles seamlessly)."""
    w = h = 32
    yy, xx = np.mgrid[0:h, 0:w]
    weave = tile_lum(C64 + 'Floor/Materials/carpet_brown_01.png', (w, h))
    n = pnoise(w, h, 661, ((8, 1.0), (4, 0.5)))
    rgb = gmap(np.clip(weave * 0.45 + n * 0.45, 0, 1), [(0, CR0), (0.45, CR1), (0.8, CR2), (1, CR3)])
    u, v = (xx + yy) % 16, (xx - yy) % 16
    lat = (u == 0) | (v == 0)
    rgb[lat] = (176, 128, 52)
    rgb[np.roll(lat, 1, 0) & ~lat] = blend(rgb, np.ones((h, w), bool), (40, 6, 10), 0.4)[np.roll(lat, 1, 0) & ~lat]
    cx_, cy_ = ((xx + 8) % 16) - 8, (yy % 16) - 8
    ros = (np.abs(cx_) + np.abs(cy_ + 0) <= 2) & ~lat
    rgb[(np.abs(((xx) % 16) - 0) + np.abs((yy % 16) - 0) <= 1)] = (220, 176, 80)
    d_ = np.abs(((xx + 8) % 16) - 8) + np.abs(((yy) % 16) - 8)
    rgb[(d_ <= 3) & (d_ >= 2)] = (40, 12, 24)
    rgb[d_ <= 1] = (150, 110, 48)
    finish(tone(rgb, 0.92, 4), 'floor_carpet.png', 32)
    return ros


def tex_floor_ink():
    """A glossy pool of black ink: deep blue-black with a violet sheen, slow swirls, ripple rings and sharp white
    highlights where the candlelight is reflected."""
    w = h = 32
    yy, xx = np.mgrid[0:h, 0:w]
    n = pnoise(w, h, 671, ((16, 1.0), (8, 0.6), (4, 0.25)))
    sw = np.sin((xx / w + n * 1.4) * math.tau + yy / h * math.tau * 2)
    v = np.clip(n * 0.55 + sw * 0.1 - 0.05, 0, 1)
    rgb = gmap(v, INK_STOPS)
    sheen = np.clip(sw * 0.6 + (n - 0.5) * 1.2, -1, 1)                      # broad oily sheen bands
    rgb = blend(rgb, sheen > 0.55, (52, 40, 100), 0.55)
    rgb = blend(rgb, sheen > 0.8, IK3, 0.5)
    for (cx, cy, r) in ((9, 22, 5), (24, 8, 4)):                           # ripple rings
        d = np.hypot(((xx - cx + 16) % 32) - 16, ((yy - cy + 16) % 32) - 16)
        rgb[(np.abs(d - r) < 0.5)] = IK2
        rgb[(np.abs(d - r - 3) < 0.5) & (yy % 2 == 0)] = IK1
    for (x, y, L) in ((5, 6, 5), (19, 17, 4), (27, 27, 3)):               # reflected highlights
        for j in range(L):
            rgb[(y + j // 2) % h, (x + j) % w] = IK4 if j < L - 1 else IK3
    finish(rgb, 'floor_ink.png', 24)


def tex_wall_ironplate():
    """Riveted iron plates: staggered seams with rows of rivets, a grungy grain, rust streaks running down from the
    rivets and a dark band of soot at the foot."""
    w, h = 32, 64
    yy, xx = np.mgrid[0:h, 0:w]
    grain = tile_lum(C64 + 'Metal/Materials/metal_grunge_02.jpg', (w, h), (1, 2))
    n = pnoise(w, h, 681, ((16, 1.0), (8, 0.5)))
    rows = (0, 21, 42)
    row = np.searchsorted(np.array(rows), yy, side='right') - 1
    off = np.where(row % 2 == 1, 16, 0)
    pid = row * 10 + ((xx + off) // 32)
    tonev = {i: v for i, v in zip(range(40), np.random.default_rng(682).uniform(-0.08, 0.08, 40))}
    v = np.clip(0.45 + (grain - 0.5) * 0.35 + (n - 0.5) * 0.25 + np.vectorize(lambda q: tonev[q % 40])(pid), 0, 1)
    rgb = gmap(v, FE_STOPS)
    seam_h = np.isin(yy, rows)
    seam_v = ((xx + off) % 32 == 0)
    rgb[seam_h | seam_v] = FE0
    rgb[np.roll(seam_h, 1, 0) & ~seam_h] = FE4
    rgb[np.roll(seam_v, 1, 1) & ~seam_v] = FE3
    rust = (pnoise(w, h, 683, ((4, 1.0), (2, 0.5))) > 0.7) & (pnoise(w, h, 684, ((8, 1.0),)) > 0.5)
    rgb = blend(rgb, rust & ~seam_h, RU1, 0.35)
    pts = []
    for y0 in rows:
        for x in range(2, 32, 4):
            pts.append((x, (y0 + 2) % h))
    for y0, o in zip(rows, (0, 16, 0)):
        pts.append(((o + 2) % w, (y0 + 10) % h)); pts.append(((o - 3) % w, (y0 + 10) % h))
    for (x, y) in pts:                                                     # rust streaks under some rivets
        if (x * 7 + y * 3) % 5 == 0:
            for j in range(2, 7):
                rgb[(y + j) % h, x] = blend(rgb[(y + j) % h, x], np.array(True), RU1, 0.7 - j * 0.08)
    rivets(rgb, pts, FE4, FE0)
    soot = yy >= 56
    rgb = blend(rgb, soot, (14, 12, 14), 0.5 * ((yy - 56) / 8).clip(0, 1))
    finish(tone(rgb, 1.0, 0), 'wall_ironplate.png', 40)


def tex_wall_furnace():
    """A smelting furnace set in firebrick: a riveted iron arch round a roaring fire behind a grate, a hood above, an
    ash slot of embers below; the bricks round the mouth glow orange. Iron pilasters at the edges (it tiles)."""
    w, h = 64, 128
    yy, xx = np.mgrid[0:h, 0:w]
    mortar, bid = P3.brick_mask(32, 64, 6, 12, 691)
    n = pnoise(32, 64, 692, ((8, 1.0), (4, 0.5)))
    tb = np.random.default_rng(693).uniform(-0.1, 0.1, 10000)
    vb = np.clip(n * 0.5 + 0.25 + tb[bid % 10000], 0, 1)
    rgb = up2(gmap(vb, [(0, (40, 16, 14)), (0.5, (84, 34, 26)), (1, (124, 58, 40))]))
    rgb[up2(mortar)] = (24, 14, 14)
    cx, cy = 31.5, 80                                                      # the mouth of the furnace
    rr = np.hypot((xx - cx) / 1.0, (yy - cy) * 1.1)
    lit = np.clip(1 - rr / 34, 0, 1) ** 1.2                               # the bricks round the mouth catch the fire
    rgb = rgb * (1 + lit[..., None] * 1.3) + np.array(MO1, float) * lit[..., None] * 0.35
    p = Pic(w, h)
    # iron frame
    p.r(cx - 20, 58, cx + 20, 110, FE1)
    p.e(cx - 20, 42, cx + 20, 76, FE1)
    p.r(cx - 18, 58, cx + 18, 108, FE2)
    p.e(cx - 18, 44, cx + 18, 74, FE2)
    p.arc(cx - 18, 44, cx + 18, 74, 180, 270, FE4)
    p.l(cx - 18, 58, cx - 18, 108, FE3)
    p.r(cx - 14, 60, cx + 14, 104, OUT)
    p.e(cx - 14, 48, cx + 14, 72, OUT)
    a = np.array(p.im); fm = a[:, :, 3] > 0
    rgb[fm] = a[fm, :3]
    mouth = ((np.abs(xx - cx) <= 13) & (yy >= 60) & (yy <= 103)) | ((((xx - cx) / 13.5) ** 2 + ((yy - 60) / 11.5) ** 2) <= 1)
    fy = np.clip((yy - 48) / 56, 0, 1)
    fn = pnoise(w, h, 694, ((8, 1.0), (4, 0.6)))
    heat = np.clip(fy * 0.9 + (fn - 0.5) * 0.6 + (1 - np.abs(xx - cx) / 14) * 0.25, 0, 1)
    tongues = np.sin((xx - cx) * 0.9 + fn * 6) * 0.5 + 0.5
    heat = np.clip(heat + (tongues - 0.5) * 0.35 * (1 - fy), 0, 1)
    rgb[mouth] = gmap(heat, [(0, (80, 14, 8)), (0.3, MO1), (0.55, MO2), (0.78, MO3), (1, MO4)])[mouth]
    for k in range(-12, 13, 5):                                            # the grate bars, lit from inside
        bar = mouth & (np.abs(xx - (cx + k)) <= 0.6) & (yy > 52)
        rgb[bar] = FE1
        rgb[bar & (xx < cx + k)] = MO1
    for y0 in (70, 88):
        bar = mouth & (np.abs(yy - y0) <= 0.6)
        rgb[bar] = FE1
        rgb[bar & (yy < y0)] = MO1
    for k in range(-16, 17, 8):                                            # rivets round the frame
        for y_ in (62, 82, 102):
            for sx in (-1, 1):
                x_ = int(cx + sx * 16)
                rgb[y_, x_] = FE4; rgb[y_ + 1, x_] = FE0
    q = Pic(w, h)                                                          # hood over the mouth, ash slot below
    q.poly([(cx - 24, 40), (cx + 24, 40), (cx + 20, 30), (cx - 20, 30)], FE2)
    q.l(cx - 20, 30, cx + 20, 30, FE4)
    q.l(cx - 24, 40, cx + 24, 40, FE0)
    for x_ in range(int(cx - 18), int(cx + 19), 6):
        q.p(x_, 35, FE4)
    q.r(cx - 16, 112, cx + 16, 120, FE1)
    q.r(cx - 14, 114, cx + 14, 118, (60, 10, 8))
    for x_ in range(int(cx - 13), int(cx + 14), 2):
        q.p(x_, 117 - (x_ % 3 == 0), MO2 if x_ % 4 else MO3)
    q.l(cx - 16, 112, cx + 16, 112, FE4)
    a = np.array(q.im); qm = a[:, :, 3] > 0
    rgb[qm] = a[qm, :3]
    allm = fm | qm
    rgb[wrap_outline(allm) & ~mouth] = OUT
    for x0 in (0, 60):                                                     # iron pilasters
        m = (xx >= x0) & (xx <= x0 + 3)
        rgb[m] = FE2
        rgb[m & (xx == x0)] = FE3 if x0 == 0 else FE1
        rgb[m & (xx == x0 + 3)] = FE0
        rgb[m & (yy % 16 == 4) & (xx == x0 + 1)] = FE4
    rgb[yy >= 124] = FE1; rgb[yy == 124] = FE3
    finish(rgb, 'wall_furnace.png', 64, half=False)


def tex_wall_boss_colossus():
    # wall: a forged iron mask of the colossus: a great helm with a glowing T-visor, a round furnace port below it,
    # molten seams running down to the floor, a frame of riveted plates
    w, h = 64, 128
    yy, xx = np.mgrid[0:h, 0:w]
    grain = up2(tile_lum(C64 + 'Metal/Materials/metal_rusty_04.jpg', (32, 64), (1, 2)))
    n = up2(pnoise(32, 64, 701, ((16, 1.0), (8, 0.5))))
    rgb = gmap(np.clip(0.32 + (grain - 0.5) * 0.3 + (n - 0.5) * 0.3, 0, 1), FE_STOPS)
    for y0 in (0, 42, 86):
        rgb[yy == y0] = FE0; rgb[yy == y0 + 1] = FE3
    pts = [(x, y + 3) for y in (0, 42, 86) for x in range(2, 64, 6)]
    rivets(rgb, pts, FE4, FE0)
    cx = 31.5
    for sd in (-1, 1):                                                     # molten seams
        xs = cx + sd * 25
        seam = (np.abs(xx - xs - np.sin(yy * 0.2) * 1.2) < 1.2)
        rgb[seam] = MO2
        rgb[seam & (np.abs(xx - xs - np.sin(yy * 0.2) * 1.2) < 0.5)] = MO3
        rgb = blend(rgb, (np.abs(xx - xs) < 3.5) & ~seam, MO0, 0.4)
    p = Pic(w, h)
    p.poly([(cx - 17, 14), (cx + 17, 14), (cx + 20, 30), (cx + 18, 56), (cx + 10, 64), (cx - 10, 64), (cx - 18, 56), (cx - 20, 30)], FE1)
    p.poly([(cx - 15, 16), (cx + 15, 16), (cx + 18, 30), (cx + 16, 54), (cx + 9, 61), (cx - 9, 61), (cx - 16, 54), (cx - 18, 30)], FE2)
    p.poly([(cx - 15, 16), (cx - 2, 16), (cx - 4, 60), (cx - 9, 61), (cx - 16, 54), (cx - 18, 30)], FE3)
    p.l(cx, 8, cx, 64, FE1, 3); p.l(cx - 1, 8, cx - 1, 64, FE4)            # crest ridge
    p.poly([(cx - 4, 6), (cx + 4, 6), (cx + 2, 14), (cx - 2, 14)], FE2)
    p.r(cx - 14, 30, cx + 14, 34, (40, 6, 4))                              # the T-visor
    p.r(cx - 2, 30, cx + 2, 52, (40, 6, 4))
    p.r(cx - 13, 31, cx + 13, 33, MO2); p.r(cx - 1, 31, cx + 1, 51, MO2)
    p.l(cx - 12, 32, cx + 12, 32, MO4); p.l(cx, 33, cx, 50, MO3)
    for (x, y) in ((cx - 12, 20), (cx + 12, 20), (cx - 13, 44), (cx + 13, 44), (cx - 7, 58), (cx + 7, 58)):
        p.p(x, y, FE4); p.p(x + 1, y + 1, FE0)
    p.e(cx - 16, 70, cx + 16, 102, FE1)                                    # the furnace port
    p.e(cx - 14, 72, cx + 14, 100, FE3)
    p.e(cx - 11, 75, cx + 11, 97, (60, 10, 6))
    a = np.array(p.im); m = a[:, :, 3] > 0
    rgb[m] = a[m, :3]
    r = np.hypot(xx - cx, yy - 86)
    port = r < 10.5
    fn = pnoise(w, h, 702, ((8, 1.0), (4, 0.5)))
    rgb[port] = gmap(np.clip(1 - r / 11 + (fn - 0.5) * 0.5, 0, 1), [(0, MO0), (0.3, MO1), (0.6, MO2), (0.85, MO3), (1, MO4)])[port]
    for k in range(-8, 9, 4):
        bar = port & (np.abs(xx - cx - k) < 0.7)
        rgb[bar] = FE1
    rgb[wrap_outline(m)] = OUT
    rgb = blend(rgb, (np.abs(r - 18) < 2) & ~m, MO0, 0.4)
    for x0 in (0, 61):
        mm_ = (xx >= x0) & (xx <= x0 + 2)
        rgb[mm_] = FE2
        rgb[mm_ & (xx == x0)] = FE3
    finish(rgb, 'wall_boss_colossus.png', 64, half=False)

    # floor: heavy iron deck plates, riveted, the seams between them glowing with molten metal
    w = h = 64
    yy, xx = np.mgrid[0:h, 0:w]
    grain = up2(tile_lum(C64 + 'Metal/Materials/metal_rusty_04.jpg', (32, 32)))
    n = up2(pnoise(32, 32, 703, ((8, 1.0), (4, 0.5))))
    rgb = gmap(np.clip(0.3 + (grain - 0.5) * 0.3 + (n - 0.5) * 0.3, 0, 1), FE_STOPS)
    seam = (xx % 32 <= 1) | (yy % 32 <= 1)
    rgb[seam] = MO2
    rgb[(xx % 32 == 0) | (yy % 32 == 0)] = MO3
    near = ((xx % 32 == 2) | (yy % 32 == 2)) & ~seam
    rgb[near] = MO0
    dg = (np.abs((xx % 32) - (yy % 32)) <= 0) & (xx % 32 > 6) & (xx % 32 < 26)
    rgb[dg] = FE1
    pts = [(x, y) for x in (5, 26, 37, 58) for y in (5, 26, 37, 58)]
    rivets(rgb, pts, FE4, FE0)
    finish(rgb, 'floor_boss_colossus.png', 40, half=False)


def tex_floor_irongrate():
    """A heavy iron floor grating: crossed bars with lit top edges over a dark pit, a faint orange glow far below."""
    w = h = 64
    yy, xx = np.mgrid[0:h, 0:w]
    n = up2(pnoise(32, 32, 711, ((8, 1.0), (4, 0.5))))
    grain = up2(tile_lum(C64 + 'Metal/Materials/metal_grunge_02.jpg', (32, 32)))
    gl = np.clip(0.5 + np.sin(xx / 64 * math.tau) * 0.25 + (n - 0.5) * 0.6, 0, 1)
    rgb = gmap(gl * 0.5, [(0, (12, 8, 10)), (0.5, (34, 14, 10)), (1, (84, 30, 14))])   # the pit
    bx = (xx % 16 <= 3)
    by = (yy % 16 <= 3)
    bars = bx | by
    v = np.clip(0.45 + (grain - 0.5) * 0.4 + (n - 0.5) * 0.2, 0, 1)
    rgb[bars] = gmap(v, FE_STOPS)[bars]
    rgb[bx & (xx % 16 == 0)] = FE4
    rgb[by & (yy % 16 == 0) & ~bx] = FE4
    rgb[bx & (xx % 16 == 3)] = FE1
    rgb[by & (yy % 16 == 3) & ~bx] = FE1
    cross = bx & by
    rgb[cross & (xx % 16 == 1) & (yy % 16 == 1)] = FE4                     # weld spots
    rgb[np.roll(by, 4, 0) & ~bars] = (6, 4, 6)                             # the bars' shadows in the pit
    rgb[np.roll(bx, 4, 1) & ~bars] = (6, 4, 6)
    finish(rgb, 'floor_irongrate.png', 32, half=False)


def conveyor(shift_px):
    w = h = 64
    yy, xx = np.mgrid[0:h, 0:w]
    n = up2(pnoise(32, 32, 721, ((8, 1.0), (4, 0.5))))
    cy = 31.5
    xs = (xx - shift_px) % 64
    belt = (yy >= 6) & (yy <= 57)
    rgb = gmap(np.clip(0.18 + (n - 0.5) * 0.15, 0, 1), FE_STOPS)
    ph = (xs + np.abs(yy - cy) * 0.55) % 16                                 # chevron ribs pointing +x
    rib = belt & (ph < 4)
    rgb[belt] = gmap(np.clip(0.12 + np.roll(n, shift_px, 1)[belt] * 0.1, 0, 1), FE_STOPS)
    rgb[rib] = FE3
    rgb[rib & (ph < 1)] = FE4
    rgb[rib & (ph >= 3)] = FE2
    rgb[belt & (ph >= 4) & (ph < 5.5)] = (8, 8, 10)
    paint = rib & (np.abs(yy - cy) < 9)                                    # painted yellow tips on the chevrons
    rgb[paint] = (214, 168, 40)
    rgb[paint & (ph < 1)] = (250, 214, 90)
    rgb[paint & (ph >= 3)] = (150, 110, 24)
    for (y0, y1) in ((0, 5), (58, 63)):                                    # the steel rails (still)
        m = (yy >= y0) & (yy <= y1)
        rgb[m] = FE2
        rgb[yy == y0] = FE4
        rgb[yy == y1] = FE0
        rgb[m & ((yy == y0 + 2) | (yy == y0 + 3)) & (xx % 8 == 3)] = FE4   # bolt heads
        rgb[m & ((yy == y0 + 2) | (yy == y0 + 3)) & (xx % 8 == 4)] = FE0
        rgb[m & (yy == y0 + 2) & (xx % 16 < 8) & ((xx % 8) > 4)] = (200, 160, 40)   # hazard stripes
    rgb[(yy == 6) | (yy == 57)] = (8, 8, 10)
    return rgb


def tex_floor_conveyor():
    finish(conveyor(0), 'floor_conveyor.png', 32, half=False)
    finish(conveyor(8), 'floor_conveyor2.png', 32, half=False)


def tex_floor_molten():
    """Liquid metal: swirling orange and yellow with white-hot veins and dark crusts of slag drifting on it."""
    w = h = 32
    yy, xx = np.mgrid[0:h, 0:w]
    n = pnoise(w, h, 731, ((16, 1.0), (8, 0.6), (4, 0.3)))
    n2 = pnoise(w, h, 732, ((8, 1.0), (4, 0.5)))
    sw = np.sin((xx / w + n * 1.3) * math.tau * 2 + yy / h * math.tau)
    v = np.clip(n * 0.6 + sw * 0.18 + 0.2, 0, 1)
    rgb = gmap(v, MO_STOPS)
    vein = np.abs(sw) < 0.12
    rgb[vein & (n > 0.45)] = MO4
    crust = n2 > 0.66
    rgb[crust] = gmap(n2[crust] * 0.5, [(0, SL0), (0.5, SL1), (1, SL2)])
    edge = wrap_outline(crust)
    rgb[edge] = MO1
    rgb[np.roll(crust, 1, 0) & ~crust & ~edge] = MO0
    rr = random.Random(733)
    for _ in range(5):                                                    # bubbles
        x, y = rr.randrange(w), rr.randrange(h)
        if not crust[y, x]:
            rgb[y, x] = MO4; rgb[(y + 1) % h, x] = MO1; rgb[y, (x + 1) % w] = MO3
    finish(rgb, 'floor_molten.png', 32)


def tex_floor_vent():
    """A steam vent: a square iron grille of round holes in a bolted frame set in iron plate; dark depths with a wisp of
    steam showing in some holes."""
    w = h = 64
    yy, xx = np.mgrid[0:h, 0:w]
    grain = up2(tile_lum(C64 + 'Metal/Materials/metal_grunge_02.jpg', (32, 32)))
    n = up2(pnoise(32, 32, 741, ((8, 1.0), (4, 0.5))))
    rgb = gmap(np.clip(0.38 + (grain - 0.5) * 0.35 + (n - 0.5) * 0.2, 0, 1), FE_STOPS)
    fr = (np.abs(xx - 31.5) <= 27) & (np.abs(yy - 31.5) <= 27)
    inner = (np.abs(xx - 31.5) <= 23) & (np.abs(yy - 31.5) <= 23)
    rgb[fr & ~inner] = gmap(np.clip(0.55 + (grain - 0.5) * 0.3, 0, 1), FE_STOPS)[fr & ~inner]
    rgb[(np.abs(xx - 31.5) == 27.5) & (np.abs(yy - 31.5) <= 27.5)] = FE0
    rgb[(np.abs(yy - 31.5) == 27.5) & (np.abs(xx - 31.5) <= 27.5)] = FE0
    rgb[(yy == 4) & fr] = FE4
    rgb[(xx == 4) & fr] = FE4
    rgb[inner] = gmap(np.clip(0.3 + (grain - 0.5) * 0.3, 0, 1), FE_STOPS)[inner]
    rgb[(yy == 8) & inner] = FE0; rgb[(xx == 8) & inner] = FE0
    rr = random.Random(742)
    for i in range(6):
        for j in range(6):
            hx, hy = 12.5 + i * 7.8, 12.5 + j * 7.8
            d = np.hypot(xx - hx, yy - hy)
            hole = d < 2.9
            rgb[hole] = (6, 6, 8)
            rgb[hole & (yy < hy - 1)] = (20, 20, 24)
            rgb[(d >= 2.9) & (d < 3.8) & (yy > hy)] = FE4                  # lit lower rim
            if rr.random() < 0.3:
                rgb[int(hy), int(hx)] = ST0; rgb[int(hy) - 1, int(hx) + 1] = ST1
    for (x, y) in ((6, 6), (57, 6), (6, 57), (57, 57)):
        rgb[y - 1:y + 2, x - 1:x + 2] = FE3
        rgb[y, x] = FE4; rgb[y + 1, x + 1] = FE0
    finish(rgb, 'floor_vent.png', 32, half=False)


@builder('textures')
def make_textures():
    tex_wall_bookshelf(); tex_wall_libpanel(); tex_wall_boss_librarian()
    tex_wall_ironplate(); tex_wall_furnace(); tex_wall_boss_colossus()
    tex_floor_carpet(); tex_floor_irongrate(); tex_floor_ink(); tex_floor_conveyor(); tex_floor_molten(); tex_floor_vent()


# ================================================================== GRIMOIRE (drawn, 32x32: a flying book that bites)
GR_LEATHER = ((52, 14, 26), (96, 26, 40), (142, 44, 52), (184, 80, 72))
MAW = (58, 12, 22)
FANG = (240, 234, 214)


def book_cover(p, hx, hy, ang, L, side, th=3, pal=GR_LEATHER):
    """One cover from the hinge (hx, hy) along ang, th thick, on the upper (side=-1) or lower (+1) side. Returns
    (u, v, tip): direction, outward normal and the tip of the inner edge."""
    u = (math.cos(ang), math.sin(ang))
    v = (u[1], -u[0]) if side < 0 else (-u[1], u[0])
    tip = (hx + u[0] * L, hy + u[1] * L)
    o = lambda pt, k: (pt[0] + v[0] * k, pt[1] + v[1] * k)
    p.poly([(hx, hy), tip, o(tip, th), o((hx, hy), th)], pal[1])
    p.l(*o((hx, hy), th), *o(tip, th), pal[2] if side < 0 else pal[0])
    if side < 0:
        p.l(*o((hx + u[0] * 2, hy + u[1] * 2), th - 1), *o((tip[0] - u[0] * 3, tip[1] - u[1] * 3), th - 1), pal[3])
    p.poly([tip, o(tip, th), o((tip[0] - u[0] * 3, tip[1] - u[1] * 3), th), (tip[0] - u[0] * 3, tip[1] - u[1] * 3)], AU2)   # gold corner
    p.p(*o((tip[0] - u[0] * 1, tip[1] - u[1] * 1), th - 1), AU4)
    return u, v, tip


def page_wing(p, x, y, ang, ln, wd):
    """A page flapping like a wing from (x, y) along ang: a curved parchment leaf with ink lines and a lit edge."""
    u = (math.cos(ang), math.sin(ang))
    v = (-u[1], u[0])
    P_ = lambda a_, b_: (x + u[0] * a_ + v[0] * b_, y + u[1] * a_ + v[1] * b_)
    p.poly([P_(0, -wd * 0.4), P_(ln * 0.6, -wd * 0.55), P_(ln, -wd * 0.2), P_(ln * 0.9, wd * 0.5), P_(0, wd * 0.5)], PA2)
    p.lines([P_(0, -wd * 0.4), P_(ln * 0.6, -wd * 0.55), P_(ln, -wd * 0.2)], PA3)
    p.lines([P_(ln, -wd * 0.2), P_(ln * 0.9, wd * 0.5), P_(0, wd * 0.5)], PA0)
    for k in (0.3, 0.6):
        p.l(*P_(1.5, -wd * 0.4 + wd * k), *P_(ln * 0.75, -wd * 0.45 + wd * k), PA0)


def grimoire_raw(open_=0.6, bob=0, wing=0.0, eye=1, dx=0, tilt=0.0, tongue=1):
    """Side view facing right, hovering: the book's spine at the back, its covers opening like jaws (open_ in radians)
    over two thick page blocks with page-fangs, a bookmark for a tongue, an eye on the front cover and loose pages
    flapping like wings above the spine (wing -1..1)."""
    p = Pic(32, 32)
    hx, hy = 8 + dx, 16 + bob
    L = 17
    page_wing(p, hx, hy - 3, -2.3 + wing * 0.7, 11, 5)                    # the far wing page
    au, al = tilt - open_ / 2, tilt + open_ / 2
    ul, vl, tl = book_cover(p, hx, hy + 1, al, L, 1)
    uu, vu, tu = book_cover(p, hx, hy - 1, au, L, -1)
    p.poly([(hx + 1, hy), (tu[0] - vu[0] * 3, tu[1] - vu[1] * 3), (tl[0] - vl[0] * 3, tl[1] - vl[1] * 3)], MAW)   # the maw
    for (u, v, tip, sd, y0) in ((uu, vu, tu, -1, hy - 1), (ul, vl, tl, 1, hy + 1)):   # page blocks lining each cover
        q = lambda t, k: (hx + u[0] * L * t - v[0] * k, y0 + u[1] * L * t - v[1] * k)
        p.poly([q(0.08, 0), q(0.97, 0), q(0.97, 3), q(0.08, 2)], PA2)
        p.l(*q(0.1, 1.2), *q(0.95, 1.2), PA1)
        p.l(*q(0.08, 2.6), *q(0.97, 3), PA0)
        p.l(*q(0.97, 0), *q(0.97, 3), PA3 if sd < 0 else PA1)
        for t in (0.5, 0.72, 0.92):                                        # fangs cut from the page edges
            ln = 1.5 + open_ * 1.8
            p.poly([(q(t, 2.6)[0] - u[0] * 1.3, q(t, 2.6)[1] - u[1] * 1.3), (q(t, 2.6)[0] + u[0] * 1.3, q(t, 2.6)[1] + u[1] * 1.3), q(t, 2.6 + ln)], FANG)
    if tongue and open_ > 0.45:                                            # the bookmark ribbon lolling out
        pts = [(hx + 4, hy), (hx + 10, hy + open_ * 2), (hx + 15, hy + 2 + open_ * 3), (hx + 16 + open_ * 2, hy + 5 + open_ * 3)]
        p.lines(pts, (176, 36, 40), 1)
    p.e(hx - 3, hy - 3, hx + 2, hy + 3, GR_LEATHER[1])                     # the round spine with gold bands
    p.arc(hx - 3, hy - 3, hx + 2, hy + 3, 120, 250, GR_LEATHER[3])
    p.l(hx - 2, hy - 2, hx - 2, hy + 2, AU2)
    p.l(hx, hy - 3, hx, hy + 3, AU1)
    page_wing(p, hx + 1, hy - 3, -2.0 + wing * 0.7, 12, 5)                 # the near wing page
    ex, ey = hx + uu[0] * 9 + vu[0] * 1.5, hy - 1 + uu[1] * 9 + vu[1] * 1.5   # the eye on the front cover
    if eye:
        p.e(ex - 2.5, ey - 1.5, ex + 2.5, ey + 1.5, (250, 220, 110) if eye == 1 else (255, 120, 60))
        p.l(ex + 0.5, ey - 1, ex + 0.5, ey + 1, (30, 10, 10))
        p.l(ex - 2.5, ey - 2, ex + 2.5, ey - 1.5 + (eye == 2), GR_LEATHER[0])
    else:
        p.l(ex - 2, ey, ex + 2, ey, GR_LEATHER[0])
    return p.im


def grimoire_frame(fl=None, motes=0, seed=0, **kw):
    im = outline_same(grimoire_raw(**kw))
    if motes:                                                              # loose letters / ink specks shaken off
        q = Pic(32, 32)
        sparkles(q, motes, seed, (2, 4, 28, 24), (RN0, RN1, RN2))
        im = on(im, q.im)
    if fl:
        im = flash(im, fl)
    return im


def loose_pages(n, seed, box, floor=None, size=32):
    q = Pic(size, size)
    r2 = random.Random(seed)
    for _ in range(n):
        x, y = r2.uniform(box[0], box[2]), r2.uniform(box[1], box[3])
        if floor is not None and y > floor - 1:
            y = floor - 1
        page_sheet(q, x, y, r2.uniform(-1.2, 1.2) if floor is None else r2.uniform(-0.15, 0.15), r2.choice((4, 5)), 3 if floor is not None else r2.choice((3, 4)))
    return outline_same(q.im)


def grimoire_dead(k):
    """The book lies shut on the floor, its eye closed, a few torn pages round it."""
    p = Pic(32, 32)
    p.poly([(6, 28), (25, 28), (26, 25), (7, 25)], GR_LEATHER[1])            # bottom cover
    p.r(8, 23, 24, 25, PA2); p.l(8, 23, 24, 23, PA3); p.l(25, 23, 25, 25, PA0)   # page block
    p.poly([(6, 22), (24, 22), (25, 20), (8, 19)], GR_LEATHER[1])            # top cover, a bit askew
    p.l(8, 19, 25, 20, GR_LEATHER[3])
    p.r(23, 19, 25, 21, AU2); p.r(6, 26, 8, 28, AU2)
    p.e(4, 20, 8, 28, GR_LEATHER[1]); p.l(5, 22, 5, 26, AU2)                 # spine
    p.l(14, 21, 17, 21, GR_LEATHER[0])                                       # closed eye
    if k == 0:
        p.lines([(25, 24), (28, 25), (29, 27)], (150, 30, 34), 1)            # the ribbon
    im = outline_same(cut_below(p.im, 28))
    return on(loose_pages(3 - k, 70 + k, (2, 26, 30, 28), floor=28), im) if k < 2 else im


@builder('grimoire')
def make_grimoire():
    G = grimoire_frame
    save_enemy('grimoire', 'idle', [G(open_=(0.5, 0.62, 0.74, 0.62)[i], bob=(0, -1, -1, 0)[i], wing=(-1, -0.3, 0.6, 0.2)[i])
                                    for i in range(4)], 32)
    save_enemy('grimoire', 'movement', [G(open_=(0.5, 0.7, 0.85, 0.7, 0.5, 0.4)[i], bob=(0, -1, -2, -1, 0, 1)[i], tilt=0.12,
                                          wing=(-1, -0.4, 0.4, 1, 0.4, -0.4)[i], dx=1) for i in range(6)], 32)
    # attack: rears back with its jaws thrown wide, lunges and snaps shut
    save_enemy('grimoire', 'attack', [G(open_=1.0, bob=-1, tilt=-0.25, wing=1, eye=2, dx=-1),
                                      G(open_=1.4, bob=-2, tilt=-0.3, wing=-1, eye=2, dx=-2),
                                      G(open_=0.12, bob=0, tilt=0.15, wing=0.6, eye=2, dx=4, tongue=0, motes=4, seed=3),
                                      G(open_=0.05, bob=0, tilt=0.1, wing=-0.6, eye=2, dx=3, tongue=0),
                                      G(open_=0.6, dx=1)], 32)
    save_enemy('grimoire', 'take_damage', [G(open_=0.9, dx=-3, tilt=-0.4, eye=0, fl=(255, 255, 255), motes=5, seed=8),
                                           G(open_=0.75, dx=-2, tilt=-0.2, eye=2), G(open_=0.6)], 32)
    # death: the pages are torn out of it, it flaps wildly, falls and lies shut on the floor
    d = [G(open_=1.1, eye=0, tilt=-0.5, wing=1, motes=6, seed=11),
         on(G(open_=1.3, eye=0, tilt=0.6, bob=3, wing=-1), loose_pages(5, 21, (2, 2, 30, 14))),
         on(G(open_=0.6, eye=0, tilt=1.2, bob=8, wing=0.5), loose_pages(4, 22, (0, 4, 30, 18))),
         grimoire_dead(0), grimoire_dead(1), grimoire_dead(2)]
    save_enemy('grimoire', 'death', d, 32)


# ================================================================== INK SLIME (drawn, 32x32: a glossy blob of ink with a drowned quill in it)
def inkslime_raw(sq=1.0, lean=0.0, eyes=1, mouth=0, dx=0, quill=True, drip=0, w0=20):
    """Side view facing right: a dome of ink sitting on row 28, sq = squash (<1) / stretch (>1), lean shifts the top
    forward; glossy highlights, two white eyes, a quill stuck in its top."""
    p = Pic(32, 32)
    base = 28
    cx = 15 + dx
    w = w0 / sq ** 0.5
    hgt = 13 * sq
    pts = []
    for i in range(21):
        t = i / 20
        a = math.pi + t * math.pi
        x = cx + math.cos(a) * w / 2 + lean * math.sin(t * math.pi) ** 2
        y = base - math.sin(t * math.pi) ** 0.8 * hgt
        pts.append((x, y))
    foot = [(cx + w / 2 + 1.5, base), (cx - w / 2 - 1.5, base)]
    if quill:                                                              # the drowned quill, stuck in at an angle
        qx, qy = cx - 2 + lean * 0.8, base - hgt + 2
        P7.feather(p, qx, qy, -2.2, 10, 2.2, ((200, 196, 186), (232, 228, 218), (250, 248, 240), (150, 140, 130)))
    p.poly(pts + foot, IK1)
    inner = [(cx + (x - cx) * 0.85 - 1, base - (base - y) * 0.88 - 0.5) for x, y in pts[:12]]
    p.poly(inner + [(cx - 1, base - hgt * 0.35)], IK2)
    p.poly([(x, y) for x, y in pts[14:]] + [(cx + w / 2 + 1.5, base), (cx + w * 0.2, base)], IK0)   # shadowed front-bottom
    p.l(cx - w / 2 - 1, base, cx + w / 2 + 1, base, IK0)
    hx, hy = cx - w * 0.22 + lean * 0.4, base - hgt * 0.72                 # the gloss: a bright streak and a dot
    p.l(hx - 2, hy + 2, hx + 1, hy - 1, IK4)
    p.l(hx - 2, hy + 3, hx - 3, hy + 4, IK3)
    p.p(hx + 3, hy - 1.5, IK3)
    p.arc(cx - w / 2 + 1, base - hgt + 1, cx + w / 2 - 1, base + hgt - 2, 195, 240, IK3)
    ex, ey = cx + w * 0.18 + lean * 0.7, base - hgt * 0.55
    if eyes:
        for k, ox in enumerate((0, 4)):
            p.e(ex + ox - 1.5, ey - 2, ex + ox + 1.5, ey + 1.5, (236, 240, 250))
            p.r(ex + ox + (0 if eyes == 1 else -0.5), ey - 1 + (eyes == 2), ex + ox + 1, ey + 0.5, (10, 10, 20) if eyes == 1 else (180, 30, 40))
            if eyes == 2:
                p.l(ex + ox - 1.5, ey - 2.5, ex + ox + 1.5, ey - 1.5 - k * 0, IK0)
    else:
        for ox in (0, 4):
            p.l(ex + ox - 1, ey, ex + ox + 1, ey, IK3)
    if mouth:
        p.e(ex + 0.5, ey + 2.5, ex + 4 + mouth, ey + 3 + mouth * 1.5, (60, 20, 50))
        p.l(ex + 1, ey + 2.5, ex + 3.5 + mouth, ey + 2.5, (90, 110, 160))
    for k in range(drip):                                                  # drips running down its sides
        x = cx - w / 2 + 3 + k * 5
        p.l(x, base - hgt * 0.3, x, base - 1, IK2)
    return cut_below(p.im, 28)


def inkslime_frame(fl=None, spit=None, splash=0, **kw):
    im = outline_same(inkslime_raw(**kw))
    if spit:                                                               # an ink glob flying off forwards
        x, y, r = spit
        q = Pic(32, 32)
        q.e(x - r, y - r, x + r, y + r, IK1)
        q.e(x - r + 0.5, y - r + 0.5, x + r * 0.3, y + r * 0.2, IK2)
        q.p(x - r * 0.4, y - r * 0.4, IK4)
        q.l(x - r - 3, y, x - r - 1, y, IK2)
        im = on(im, outline_same(q.im))
    if splash:
        q = Pic(32, 32)
        r2 = random.Random(splash)
        for _ in range(6):
            x, y = r2.uniform(3, 29), r2.uniform(8, 24)
            q.r(x, y, x + 1, y + 1, IK1); q.p(x, y, IK3)
        im = on(im, outline_same(q.im))
    if fl:
        im = flash(im, fl)
    return im


def ink_puddle(p, cx, base, w, h=2.5, seed=0):
    """A flat glossy pool of ink on the floor: dark body, a lit rim at the back, white glints."""
    p.e(cx - w / 2, base - h, cx + w / 2, base + h * 0.6, IK1)
    p.e(cx - w / 2 + 1, base - h, cx + w / 4, base - 0.5, IK2)
    p.l(cx - w / 4, base - h + 1, cx - w / 4 + 3, base - h + 1, IK4)
    p.p(cx + w / 5, base - h + 1.5, IK3)
    r2 = random.Random(seed)
    for _ in range(3):
        x = cx + r2.uniform(-w / 2 - 4, w / 2 + 4)
        p.e(x - 1, base - 1, x + 1, base, IK1)


def inkslime_dead(k):
    """Burst into a pool of ink, the quill lying in it, the eyes going under (k = 0..2)."""
    p = Pic(32, 32)
    ink_puddle(p, 15, 28, (22, 25, 26)[k], (4, 3, 2.5)[k], seed=4)
    P7.feather(p, 18 + k, 26 - (k < 1), 0.25 + k * 0.05, 9, 2, ((200, 196, 186), (232, 228, 218), (250, 248, 240), (150, 140, 130)))
    if k < 2:
        p.e(9, 23 + k, 12, 26, (236, 240, 250)); p.p(11, 24 + k, (10, 10, 20))
    if k == 0:
        p.e(13, 23, 16, 26, (236, 240, 250)); p.p(15, 24, (10, 10, 20))
    return outline_same(cut_below(p.im, 28))


@builder('inkslime')
def make_inkslime():
    S = inkslime_frame
    save_enemy('inkslime', 'idle', [S(sq=(1.0, 0.95, 0.92, 0.97)[i], lean=(0, 0.5, 1, 0.5)[i], eyes=0 if i == 2 else 1, drip=(1, 1, 2, 2)[i])
                                    for i in range(4)], 32)
    save_enemy('inkslime', 'movement', [S(sq=(1.0, 0.85, 0.8, 1.1, 1.18, 1.05)[i], lean=(1, 3, 4, 2, 0, 0)[i], dx=(0, 0, 1, 2, 2, 1)[i], drip=i % 3)
                                        for i in range(6)], 32)
    # attack: it rears up, gapes and spits a glob of ink forwards
    save_enemy('inkslime', 'attack', [S(sq=0.82, eyes=2, lean=-1), S(sq=1.28, eyes=2, mouth=1, lean=-2),
                                      S(sq=1.12, eyes=2, mouth=2, lean=3, spit=(25, 13, 2.5)),
                                      S(sq=0.95, eyes=2, mouth=1, lean=2, spit=(29, 12, 2)), S(sq=1.0)], 32)
    save_enemy('inkslime', 'take_damage', [S(sq=0.78, dx=-2, eyes=2, mouth=1, fl=(255, 255, 255), splash=3), S(sq=0.9, dx=-1, eyes=2, splash=5), S()], 32)
    d = [S(sq=1.2, eyes=2, mouth=2, splash=7), S(sq=0.65, eyes=0, mouth=1, w0=24, splash=9), S(sq=0.4, eyes=0, w0=27, quill=True),
         inkslime_dead(0), inkslime_dead(1), inkslime_dead(2)]
    save_enemy('inkslime', 'death', d, 32)


# ================================================================== SPARK DRONE (drawn, 32x32: a little hovering drone that crackles)
SPARK_PAL = ((150, 110, 20), (255, 226, 90), (255, 255, 236))


def drone_raw(rot=0, bob=0, tilt=0.0, eye=1, dx=0, charge=0, wreck=False):
    """Side view facing right: a riveted iron ball with a brass band, a rotor on a mast (rot 0/1 = blade phase), a big
    lens eye in front, two electrode prongs underneath."""
    p = Pic(32, 32)
    cx, cy = 15 + dx, 16 + bob
    if not wreck:
        p.l(cx, cy - 6, cx, cy - 10, FE3, 2)                             # mast
        p.l(cx - 0.5, cy - 6, cx - 0.5, cy - 10, FE4)
        if rot == 0:                                                       # rotor: two blades, then a blur
            p.poly([(cx - 11, cy - 11), (cx, cy - 12), (cx, cy - 10), (cx - 10, cy - 10)], ST1)
            p.poly([(cx, cy - 12), (cx + 11, cy - 11.5), (cx + 10, cy - 10.5), (cx, cy - 10)], ST2)
        else:
            p.e(cx - 11, cy - 12.5, cx + 11, cy - 9.5, (150, 156, 170))
            p.e(cx - 9, cy - 12, cx + 9, cy - 10, (110, 116, 130))
            p.l(cx - 4, cy - 12, cx + 4, cy - 12, ST2)
        p.r(cx - 1.5, cy - 12.5, cx + 1.5, cy - 10, BR2)
        for sd in (-1, 1):                                                 # electrode prongs
            p.l(cx + sd * 3, cy + 5, cx + sd * 4 + 2, cy + 10, FE2, 2)
            p.p(cx + sd * 4 + 2, cy + 10, CU3 if not charge else (255, 240, 150))
    p.e(cx - 7, cy - 7, cx + 7, cy + 6, FE2)                               # the body
    p.e(cx - 6, cy - 6, cx + 4, cy + 3, FE3)
    p.e(cx - 5, cy - 6, cx, cy - 2, FE4)
    p.r(cx - 7, cy - 1, cx + 7, cy + 1, BR2)                               # brass band with rivets
    p.l(cx - 7, cy - 1, cx + 7, cy - 1, BR3)
    for x in range(int(cx) - 5, int(cx) + 7, 3):
        p.p(x, cy, BR4)
    ec = ((40, 20, 20), (255, 90, 60), (255, 220, 120))[eye]
    p.e(cx + 2, cy - 5, cx + 9, cy + 2, FE1)                               # the lens
    p.e(cx + 3, cy - 4, cx + 8, cy + 1, ec)
    p.e(cx + 5, cy - 3, cx + 7, cy - 1, WHITE if eye else (70, 40, 40))
    p.l(cx - 4, cy + 3, cx + 2, cy + 3, FE1)
    im = p.im
    if tilt:
        im = im.rotate(tilt, resample=Image.NEAREST, center=(cx, cy))
    return im


def drone_frame(fl=None, zap=None, crackle=0, seed=0, **kw):
    im = outline_same(drone_raw(**kw))
    cx, cy = 15 + kw.get('dx', 0), 16 + kw.get('bob', 0)
    q = Pic(32, 32)
    if crackle:                                                            # sparks arcing between the prongs
        bolt(q, cx - 2, cy + 10, cx + 6, cy + 10, seed, 1, SPARK_PAL, 1.5, 0)
        sparkles(q, crackle, seed + 1, (cx - 8, cy + 4, cx + 12, cy + 14), SPARK_PAL)
    if zap:                                                                # the bolt it shoots forwards
        bolt(q, cx + 6, cy + 10, zap[0], zap[1], seed + 3, 1, SPARK_PAL, 2.5, 1)
    im = on(im, q.im)
    if fl:
        im = flash(im, fl)
    return im


def drone_wreck(k):
    """The wreck lying on the floor: dented body on its side, the rotor snapped off and bent, smoke curling up."""
    w = drone_raw(eye=0, wreck=True, bob=7)
    w = w.rotate(-70, resample=Image.NEAREST, center=(15, 23))
    w = ground(w, 28)
    p = Pic(32, 32)
    p.lines([(22, 28), (25, 26), (29, 27)], ST1, 2)                         # snapped rotor blade
    p.l(4, 28, 8, 27, FE3, 2)
    im = outline_same(cut_below(on(w, p.im), 28))
    q = Pic(32, 32)
    for j in range(3 - k):
        puff(q, 13 + j * 2 + k, 18 - j * 4 - k * 2, 2.5 - j * 0.4, ((50, 46, 48), (80, 76, 78), (110, 106, 108), (140, 136, 136)))
    sparkles(q, 2 - min(2, k), 40 + k, (8, 20, 24, 27), SPARK_PAL)
    return on(im, outline_same(q.im))


@builder('sparkdrone')
def make_sparkdrone():
    D = drone_frame
    save_enemy('sparkdrone', 'idle', [D(rot=i % 2, bob=(0, -1, -1, 0)[i], crackle=(0, 2, 0, 1)[i], seed=i) for i in range(4)], 32)
    save_enemy('sparkdrone', 'movement', [D(rot=i % 2, bob=(0, -1, -1, 0)[i % 4], tilt=-12, dx=1, crackle=i % 2, seed=10 + i) for i in range(4)], 32)
    # attack: the prongs charge up crackling, it fires a bolt forwards
    save_enemy('sparkdrone', 'attack', [D(rot=0, eye=2, crackle=3, seed=20), D(rot=1, eye=2, crackle=6, seed=21, tilt=6),
                                        D(rot=0, eye=2, zap=(31, 24), seed=22, tilt=-6, dx=-1),
                                        D(rot=1, eye=2, zap=(31, 22), crackle=2, seed=23, tilt=-4, dx=-1), D(rot=0)], 32)
    save_enemy('sparkdrone', 'take_damage', [D(rot=1, dx=-3, tilt=25, eye=0, crackle=4, seed=30, fl=(255, 255, 255)),
                                             D(rot=0, dx=-2, tilt=12, crackle=2, seed=31), D(rot=1)], 32)
    # death: it sparks, swells into a fireball and drops as a smoking wreck
    d = [D(rot=1, eye=2, crackle=8, seed=40, tilt=20), on(D(rot=0, eye=0, crackle=6, seed=41, tilt=-30), explosion(32, 15, 15, 7, 0.1, 5)),
         explosion(32, 15, 15, 12, 0.35, 6), on(drone_wreck(0), explosion(32, 15, 13, 13, 0.8, 7)), drone_wreck(0), drone_wreck(1), drone_wreck(2)]
    save_enemy('sparkdrone', 'death', d, 32)


# ================================================================== ARCHIVIST (drawn, 64x64: a spectral archivist in a hood, spectacles, swirling papers)
RB = ((34, 38, 62), (58, 66, 98), (88, 100, 136), (130, 146, 182))     # dusty spectral robe


def orbit_pages(p, cx, cy, rx, ry, t, n, front, seed=0, sz=(5, 4)):
    """Pages circling round (cx, cy): only those in front (front=True) or behind the body are drawn."""
    for k in range(n):
        a = t * math.tau + k * math.tau / n
        if (math.sin(a) >= 0) != front:
            continue
        x, y = cx + math.cos(a) * rx, cy + math.sin(a) * ry - k % 2 * 3
        page_sheet(p, x, y, a * 1.3 + k, sz[0] - (0 if front else 1), sz[1] - (0 if front else 1))


def archivist_raw(t=0.0, bob=0, sway=0.0, arm=0.0, eyes=1, mouth=0, dx=0, pages=5, rx=17, book=True, sink=0):
    """Side view facing right, floating: a hooded robe that ends in ragged wisps instead of feet, a pale bearded face
    with round spectacles, an open ledger held to the chest, the front hand free (arm 0 low .. 1 raised forwards),
    loose pages orbiting him."""
    p = Pic(64, 64)
    cx, top = 30 + dx, 9 + bob + sink
    orbit_pages(p, cx + 1, top + 28, rx, 6, t, pages, False)
    sw = sway
    hem = []
    for k in range(7):                                                    # the ragged hem, trailing back
        x = cx + 11 - k * 4.2 - sw * k * 0.4
        y = top + 41 + (k % 2) * 3 + k * 0.6 - abs(sw) * 0.5
        hem.append((x, y))
    body = [(cx - 7, top + 12), (cx + 6, top + 12), (cx + 10, top + 24), (cx + 12, top + 36)] + hem + \
           [(cx - 19 - sw * 3, top + 40), (cx - 23 - sw * 4, top + 33), (cx - 15, top + 34), (cx - 11, top + 24)]
    p.poly(body, RB[1])
    p.poly([(cx - 7, top + 13), (cx - 2, top + 13), (cx - 5, top + 30), (cx - 12, top + 36), (cx - 14, top + 33), (cx - 10, top + 24)], RB[2])
    p.lines([(cx - 7, top + 13), (cx - 10, top + 24), (cx - 15, top + 34)], RB[3])
    for k in range(4):                                                    # folds
        x0 = cx - 4 + k * 4
        p.l(x0, top + 18, x0 - 2 - k - sw, top + 41 + (k % 2) * 2, RB[0])
    for i in range(len(hem) - 1):
        p.l(*hem[i], *hem[i + 1], RB[0])
    # hood and face
    hx, hy = cx + 3, top + 6
    p.poly([(hx - 9, hy + 8), (hx - 10, hy), (hx - 5, hy - 7), (hx + 2, hy - 7), (hx + 7, hy - 2), (hx + 8, hy + 8)], RB[2])
    p.poly([(hx - 9, hy + 8), (hx - 10, hy), (hx - 5, hy - 7), (hx - 3, hy - 6), (hx - 6, hy + 1), (hx - 6, hy + 8)], RB[3])
    p.e(hx - 2, hy - 4, hx + 7, hy + 8, (14, 14, 30))
    p.e(hx, hy - 3, hx + 7, hy + 6, GH1)
    p.e(hx + 1, hy - 3, hx + 6, hy + 4, GH2)
    p.poly([(hx + 1, hy + 3), (hx + 7, hy + 3), (hx + 6, hy + 14 + sw), (hx + 3, hy + 17 + sw), (hx + 1, hy + 9)], GH2)   # wispy beard
    p.l(hx + 2, hy + 5, hx + 4, hy + 16 + sw, GH3)
    p.l(hx + 6, hy + 5, hx + 6, hy + 11, GH1)
    p.p(hx + 7, hy + 1, GH3)                                               # nose
    ec = (GH3, RN3, (110, 120, 140))[min(eyes, 2)] if eyes else None
    for ox in (2, 5):                                                      # round spectacles
        p.e(hx + ox - 1.5, hy - 1.5, hx + ox + 1.5, hy + 1.5, AU2)
        p.p(hx + ox, hy, ec if ec else GH0)
        p.p(hx + ox - 1, hy - 1, WHITE)
    p.l(hx + 3, hy - 1, hx + 4, hy - 1, AU2)
    if eyes == 2:
        p.l(hx + 1, hy - 3, hx + 6, hy - 2, (14, 14, 30))
    if mouth:
        p.e(hx + 3, hy + 4, hx + 6, hy + 5 + mouth * 1.5, (14, 14, 30))
    if book:                                                               # the ledger held against his chest
        p.poly([(cx - 1, top + 22), (cx + 9, top + 20), (cx + 10, top + 27), (cx, top + 29)], (86, 46, 108))
        p.poly([(cx, top + 22), (cx + 4.5, top + 20.5), (cx + 4.5, top + 27), (cx + 0.5, top + 28)], PA2)
        p.poly([(cx + 4.5, top + 20.5), (cx + 9, top + 20), (cx + 9.5, top + 26.5), (cx + 4.5, top + 27)], PA1)
        p.l(cx + 1, top + 23, cx + 4, top + 22, PA0); p.l(cx + 5.5, top + 22, cx + 8.5, top + 21.5, PA0)
        p.l(cx + 1, top + 25, cx + 4, top + 24, PA0)
        p.e(cx - 2, top + 25, cx + 2, top + 29, GH2)                       # the back hand under it
    sx, sy = cx + 3, top + 15                                              # the front arm: wide sleeve, pale hand
    hx2, hy2 = cx + 12 + arm * 6, top + 26 - arm * 14
    mx, my = (sx + hx2) / 2 + 2, (sy + hy2) / 2 + 3 - arm * 2
    p.lines([(sx, sy), (mx, my), (hx2 - 2, hy2)], RB[1], 6)
    p.lines([(sx, sy - 1), (mx, my - 1)], RB[2], 2)
    p.l(hx2 - 3, hy2 - 2.5, hx2 - 2, hy2 + 2.5, RB[3], 2)
    p.e(hx2 - 1.5, hy2 - 2, hx2 + 2.5, hy2 + 2, GH2)
    for k in range(3):                                                     # long bony fingers
        p.l(hx2 + 1, hy2 - 1 + k, hx2 + 4, hy2 - 2 + k * 1.5 - arm * 1.5, GH3 if k == 0 else GH2)
    if arm < 0.4:                                                          # the quill in the hand
        p.l(hx2 + 1, hy2 + 1, hx2 + 6, hy2 - 7, (230, 226, 216))
        p.l(hx2 + 4, hy2 - 3, hx2 + 7, hy2 - 9, (200, 196, 186))
    im = outline_same(cut_below(p.im, 57))
    q = Pic(64, 64)
    orbit_pages(q, cx + 1, top + 28, rx, 6, t, pages, True)
    sparkles(q, 3, int(t * 10) + 5, (cx - 22, top + 30, cx + 10, top + 48), (GH1, GH2, GH3))   # ghost-light motes
    return on(im, outline_same(cut_below(q.im, 57)))


def archivist_frame(fl=None, runes=None, seed=0, **kw):
    im = archivist_raw(**kw)
    if runes:                                                              # runes conjured at the hand / thrown
        q = Pic(64, 64)
        for (x, y, k, tr) in runes:
            flying_rune(q, x, y, k, 0, tr)
        im = on(im, outline_same(q.im))
    if fl:
        im = flash(im, fl)
    return im


def archivist_heap(k):
    """Gone: the empty robe lies crumpled on the floor, the spectacles on top, pages settling round it."""
    p = Pic(64, 64)
    p.poly([(14, 57), (18, 51), (26, 48), (36, 47), (44, 50), (50, 57)], RB[1])
    p.poly([(18, 52), (26, 49), (34, 48.5), (30, 52), (20, 55)], RB[2])
    p.poly([(36, 47), (44, 44), (49, 47), (47, 53), (40, 52)], RB[2])        # the hood, fallen in
    p.e(41, 46, 46, 51, (14, 14, 30))
    for x0 in (22, 30, 38):
        p.l(x0, 50, x0 + 3, 57, RB[0])
    p.e(30, 46, 33, 49, AU2); p.e(34, 46, 37, 49, AU2)                       # the spectacles
    p.p(31, 47, GH2); p.p(35, 47, GH2); p.l(33, 47, 34, 47, AU2)
    p.poly([(22, 47), (29, 46), (30, 50), (23, 51)], (86, 46, 108))          # the ledger
    im = outline_same(cut_below(p.im, 57))
    pg = loose_pages(4, 90 + k, (8, 50, 58, 57), floor=57, size=64)
    q = Pic(64, 64)
    sparkles(q, 4 - k * 2, 95 + k, (16, 34 - k * 4, 48, 48), (GH1, GH2, GH3))
    return on(pg, im, q.im)


@builder('archivist')
def make_archivist():
    C = archivist_frame
    save_enemy('archivist', 'idle', [C(t=i / 4 * 0.25, bob=(0, -1, -2, -1)[i], sway=(0, 0.5, 1, 0.5)[i], eyes=0 if i == 3 else 1) for i in range(4)], 64)
    save_enemy('archivist', 'movement', [C(t=i / 6 * 0.5, bob=(0, -1, -2, -2, -1, 0)[i], sway=(1, 1.5, 2, 1.5, 1, 0.5)[i], dx=1, arm=0.1) for i in range(6)], 64)
    # attack: the hand rises, runes kindle round it one by one and are flung forwards
    save_enemy('archivist', 'attack', [C(t=0.0, arm=0.5, eyes=2, rx=19),
                                       C(t=0.06, arm=1.0, eyes=2, mouth=1, rx=21, runes=[(46, 14, 0, 0)]),
                                       C(t=0.12, arm=1.0, eyes=2, mouth=1, rx=22, runes=[(46, 14, 0, 0), (40, 8, 2, 0), (50, 22, 4, 0)]),
                                       C(t=0.18, arm=0.7, eyes=2, mouth=2, rx=20, sway=-1, runes=[(54, 16, 0, 4), (49, 9, 2, 3), (58, 24, 4, 4)]),
                                       C(t=0.24, arm=0.4, eyes=2, rx=18, runes=[(60, 18, 0, 6)]),
                                       C(t=0.3)], 64)
    save_enemy('archivist', 'take_damage', [C(dx=-3, eyes=2, mouth=2, sway=-1.5, fl=(255, 255, 255), rx=21),
                                            C(dx=-2, eyes=2, mouth=1, sway=-1, t=0.05), C(dx=-1, t=0.1)], 64)
    # death: he wails, the papers burst out of their orbit, the robe collapses empty onto the floor
    d = [C(eyes=2, mouth=2, arm=1.0, rx=24, pages=7, sway=-2), C(eyes=0, mouth=2, arm=0.6, rx=28, pages=7, sink=6, t=0.1, sway=-3),
         on(C(eyes=0, mouth=1, arm=0.2, rx=30, pages=6, sink=14, t=0.2, book=False, sway=-3)),
         archivist_heap(0), archivist_heap(1), archivist_heap(2)]
    save_enemy('archivist', 'death', d, 64)


# ================================================================== MOLTEN GOLEM (drawn, 64x64: a hulk of slag crust over molten metal)
CRUST = (SL0, SL1, SL2, (108, 88, 76))


def cracks_in(p_im, seed, n=9, ln=(3, 7), pal=(MO1, MO2, MO3), hot=0.0, box=(0, 0, 64, 64)):
    """Glowing cracks drawn only where p_im is opaque: branching jagged lines; hot (0..1) widens and whitens them."""
    q = Pic(p_im.width, p_im.height)
    r2 = random.Random(seed)
    m = np.array(p_im)[:, :, 3] > 0
    ys, xs = np.nonzero(m[box[1]:box[3], box[0]:box[2]])
    if not len(xs):
        return p_im
    for _ in range(n):
        i = r2.randrange(len(xs))
        x, y = xs[i] + box[0], ys[i] + box[1]
        a = r2.uniform(0, math.tau)
        pts = [(x, y)]
        for j in range(r2.randint(*ln)):
            a += r2.uniform(-0.9, 0.9)
            x, y = x + math.cos(a) * 2, y + math.sin(a) * 2
            pts.append((x, y))
        q.lines(pts, pal[0], 2 if hot > 0.3 else 1)
        q.lines(pts, pal[1] if hot < 0.6 else pal[2])
        if hot > 0.5:
            q.ps(pts[1:-1:2], MO4)
    a = np.array(q.im)
    a[~m] = 0
    return on(p_im, Image.fromarray(a))


def golem_raw(t=0.0, bob=0, step=None, arm=(1.2, 18), farm=(1.35, 16), eyes=1, mouth=0, lean=0.0, dx=0, hot=0.0, core=1, sink=0):
    """Side view facing right: a huge hunched body of dark slag plates with glowing cracks, a molten core in the chest,
    a small head sunk between the shoulders, long heavy arms (angle, length; 0 = forward, + = down) ending in fists that
    drip molten metal, short pillar legs."""
    p = Pic(64, 64)
    cx, cy = 28 + dx, 32 + bob + sink
    br = math.sin(t * math.tau) * 0.6

    def limb(sx, sy, ang, ln, far):
        pal = tuple(dark(c, 0.75) for c in CRUST) if far else CRUST
        ex, ey = sx + math.cos(ang) * ln, sy + math.sin(ang) * ln
        mx, my = (sx + ex) / 2, (sy + ey) / 2
        p.l(sx, sy, mx, my, pal[0], 9); p.l(sx, sy, mx, my, pal[1], 7)
        p.l(mx, my, ex, ey, pal[0], 8); p.l(mx, my, ex, ey, pal[1], 6)
        p.l(sx - 1, sy - 2, mx - 1, my - 2, pal[2], 2)
        p.e(mx - 3, my - 3, mx + 3, my + 3, MO1 if not far else dark(MO1, 0.7))   # glowing elbow joint
        p.e(mx - 2, my - 2, mx + 1, my + 1, MO2 if not far else dark(MO2, 0.7))
        p.e(ex - 5.5, ey - 5, ex + 5.5, ey + 5, pal[0])                      # the fist
        p.e(ex - 4.5, ey - 4.5, ex + 4, ey + 3.5, pal[1])
        p.e(ex - 4, ey - 4.5, ex + 1, ey - 1, pal[2])
        for k in range(3):
            p.l(ex + 1, ey - 2 + k * 2, ex + 4, ey - 2 + k * 2, pal[0])
        return ex, ey
    f1 = limb(cx + 6 + lean * 0.5, cy - 9, farm[0], farm[1], True)
    for k, (hx_, fx) in enumerate(((-6, -8), (5, 6))):                     # pillar legs
        ph = (step + k * math.pi) if step is not None else 0
        lift = max(0, math.sin(ph)) * 2.5 if step is not None else 0
        sx_ = math.cos(ph) * 2.5 if step is not None else 0
        col = tuple(dark(c, 0.75) for c in CRUST) if k == 0 else CRUST
        p.l(cx + hx_, cy + 6, cx + fx + sx_, 54 - lift, col[0], 10)
        p.l(cx + hx_, cy + 6, cx + fx + sx_, 54 - lift, col[1], 8)
        p.l(cx + hx_ - 2, cy + 7, cx + fx + sx_ - 2, 53 - lift, col[2], 2)
        p.r(cx + fx + sx_ - 6, 53 - lift, cx + fx + sx_ + 6, 57 - lift, col[0])
        p.r(cx + fx + sx_ - 5, 53 - lift, cx + fx + sx_ + 5, 56 - lift, col[1])
        p.l(cx + fx + sx_ - 5, 53 - lift, cx + fx + sx_ + 4, 53 - lift, col[2])
    top = cy - 22 - br
    body = [(cx - 15, cy + 10), (cx - 19, cy - 2), (cx - 16, top + 8), (cx - 8, top), (cx + 6, top - 1), (cx + 15, top + 6),
            (cx + 18, cy - 6), (cx + 15, cy + 8), (cx + 4, cy + 13), (cx - 8, cy + 13)]
    p.poly(body, CRUST[1])
    p.poly([(x + (cx - x) * 0.1, y + (cy - y) * 0.1 - 1) for x, y in body[:6]] + [(cx, cy)], CRUST[2])
    p.poly([(cx - 16, cy - 2), (cx - 14, top + 8), (cx - 7, top + 2), (cx - 4, top + 6), (cx - 11, top + 14)], CRUST[3])
    p.poly([(cx - 14, cy + 7), (cx + 14, cy + 4), (cx + 4, cy + 12), (cx - 8, cy + 12)], CRUST[0])
    r2 = random.Random(3)
    for k in range(6):                                                    # plate seams of the crust
        x = cx + r2.uniform(-14, 12); y = r2.uniform(top + 4, cy + 8)
        p.l(x, y, x + r2.uniform(-4, 4), y + r2.uniform(2, 5), CRUST[0])
    # the molten core in the chest, behind a broken grille of crust
    ccx, ccy = cx + 6, cy - 6
    cr = 6 + core
    p.e(ccx - cr - 1, ccy - cr - 1, ccx + cr + 1, ccy + cr + 1, CRUST[0])
    p.e(ccx - cr, ccy - cr, ccx + cr, ccy + cr, MO1)
    p.e(ccx - cr + 1.5, ccy - cr + 1.5, ccx + cr - 1.5, ccy + cr - 1.5, MO2)
    p.e(ccx - cr * 0.5, ccy - cr * 0.5, ccx + cr * 0.4, ccy + cr * 0.4, MO3 if core < 2 else MO4)
    if core >= 2:
        p.e(ccx - 2, ccy - 2, ccx + 1, ccy + 1, WHITE)
    for k in (-3, 1):
        p.l(ccx + k, ccy - cr, ccx + k + 1, ccy + cr, CRUST[0], 2)
    # head sunk between the shoulders
    hx, hy = cx + 13 + lean, top + 5
    p.e(hx - 6, hy - 6, hx + 6, hy + 6, CRUST[1])
    p.e(hx - 5, hy - 6, hx + 3, hy, CRUST[2])
    p.l(hx - 3, hy - 3, hx + 7, hy - 2, CRUST[0], 2)                      # brow ridge
    ec = (MO3, MO4, (90, 60, 50))[0 if eyes == 1 else 1 if eyes == 2 else 2]
    p.e(hx + 1, hy - 1, hx + 7, hy + 2, (30, 8, 4))
    if eyes:
        p.l(hx + 2, hy, hx + 3, hy, ec); p.l(hx + 5, hy, hx + 6, hy, ec)
    if mouth:
        p.poly([(hx + 1, hy + 3), (hx + 7, hy + 3), (hx + 6, hy + 4 + mouth * 2), (hx + 2, hy + 4 + mouth * 2)], MO2)
        p.l(hx + 2, hy + 4, hx + 6, hy + 4, MO4)
    else:
        p.l(hx + 2, hy + 4, hx + 6, hy + 4, MO1)
    f0 = limb(cx + 10 + lean, cy - 6, arm[0], arm[1], False)
    im = cracks_in(p.im, 11, 10 + int(hot * 6), (3, 7), hot=hot)
    return im, f0, f1


def golem_frame(fl=None, roll=0.0, splash=0, drips=2, seed=0, **kw):
    im, f0, f1 = golem_raw(**kw)
    if roll:
        im = ground(im.rotate(roll, resample=Image.NEAREST, center=(32, 57)), 57)
    im = outline_same(cut_below(im, 57))
    q = Pic(64, 64)
    r2 = random.Random(seed + 7)
    for (fx, fy) in ([f0] if drips else []):                               # molten drops falling from the fist
        for j in range(drips):
            y = fy + 5 + j * 3 + r2.uniform(0, 2)
            if y < 57:
                q.l(fx - 1 + j, y, fx - 1 + j, y + 1, MO2); q.p(fx - 1 + j, y + 1, MO3)
    if splash:                                                             # fists hit the floor: a splash of molten metal
        for (x, y, r) in (((48, 55, 3), (58, 55, 2.5)), ((44, 54, 4), (56, 53, 4), (62, 55, 2)))[splash - 1]:
            q.e(x - r, y - r * 0.6, x + r, y + r * 0.4, MO1); q.e(x - r + 1, y - r * 0.6, x + r * 0.4, y, MO3)
        molten_drops(q, 6 + splash * 3, seed + splash, (40, 38, 63, 54))
    im = on(im, outline_same(cut_below(q.im, 57)))
    if fl:
        im = flash(im, fl)
    return im


def golem_heap(k):
    """Crumbled: a heap of cracked slag blocks on the floor, the glow in the cracks dying away (k = 0..2)."""
    p = Pic(64, 64)
    r2 = random.Random(5)
    for (x, y, w, h) in ((14, 51, 10, 7), (22, 46, 13, 12), (34, 47, 12, 11), (44, 50, 10, 8), (28, 42, 9, 7), (52, 53, 6, 5), (9, 54, 5, 4)):
        ww = w * r2.uniform(0.9, 1.1)
        p.poly([(x - ww / 2, y + h / 2), (x - ww / 2 + 1, y - h / 2 + 1), (x + ww / 2 - 2, y - h / 2), (x + ww / 2, y + h / 2)], CRUST[1])
        p.l(x - ww / 2 + 1, y - h / 2 + 1, x + ww / 2 - 2, y - h / 2, CRUST[3])
        p.l(x - ww / 2 + 1, y - h / 2 + 2, x - ww / 2 + 1, y + h / 2 - 1, CRUST[2])
    if k == 0:
        p.e(33, 44, 41, 52, MO2); p.e(35, 46, 39, 50, MO3)                 # the core, still glowing
    elif k == 1:
        p.e(34, 45, 40, 51, MO1); p.p(37, 48, MO2)
    else:
        p.e(34, 45, 40, 51, (70, 24, 14))
    im = cut_below(p.im, 57)
    im = cracks_in(im, 40, (10, 7, 4)[k], (2, 4), pal=((MO1, MO2, MO3), (MO0, MO1, MO2), ((60, 20, 12), MO0, MO1))[k], box=(0, 38, 64, 58))
    im = outline_same(im)
    q = Pic(64, 64)
    for j in range(3 - k):                                                 # smoke
        puff(q, 30 + j * 4 + k * 2, 36 - j * 5 - k * 3, 3 - j * 0.5, ((50, 44, 44), (80, 72, 70), (108, 100, 96), (136, 128, 122)))
    return on(im, outline_same(q.im))


@builder('moltengolem')
def make_moltengolem():
    G = golem_frame
    save_enemy('moltengolem', 'idle', [G(t=i / 4, bob=(0, 0, 1, 1)[i], core=(1, 1, 2, 1)[i], arm=(1.2 - (0, 0.03, 0.06, 0.03)[i], 18), seed=i) for i in range(4)], 64)
    save_enemy('moltengolem', 'movement', [G(t=i / 6, step=i * math.tau / 6, bob=(0, -1, 0, 0, -1, 0)[i], lean=1,
                                             arm=(1.1 + math.sin(i * math.tau / 6) * 0.3, 18), farm=(1.3 - math.sin(i * math.tau / 6) * 0.25, 16), seed=10 + i)
                                           for i in range(6)], 64)
    # attack: both fists rise over the head and smash into the floor in a splash of molten metal
    save_enemy('moltengolem', 'attack', [G(arm=(0.2, 16), farm=(0.5, 14), eyes=2, mouth=1, lean=-1, core=2, drips=0),
                                         G(arm=(-1.4, 17), farm=(-1.1, 15), eyes=2, mouth=2, lean=-2, bob=-2, core=2, hot=0.4, drips=0),
                                         G(arm=(-1.7, 17), farm=(-1.45, 15), eyes=2, mouth=2, lean=-2, bob=-3, core=2, hot=0.5, drips=0),
                                         G(arm=(0.62, 24), farm=(0.8, 22), eyes=2, mouth=2, lean=3, bob=2, splash=1, drips=0, seed=4),
                                         G(arm=(0.66, 24), farm=(0.84, 22), eyes=2, mouth=1, lean=3, bob=2, splash=2, drips=0, seed=5),
                                         G(arm=(0.95, 21), farm=(1.1, 19), lean=1, bob=1),
                                         G()], 64)
    save_enemy('moltengolem', 'take_damage', [G(dx=-3, eyes=2, mouth=2, arm=(0.8, 18), fl=(255, 255, 255), hot=0.6, core=2),
                                              G(dx=-2, eyes=2, mouth=1, arm=(1.0, 18)), G(dx=-1)], 64)
    # death: the cracks blaze white-hot, it buckles and crumbles into a heap of slag whose glow dies away
    save_enemy('moltengolem', 'death', [G(eyes=2, mouth=2, arm=(-0.8, 16), farm=(-0.5, 14), hot=0.8, core=2),
                                        G(eyes=0, mouth=2, arm=(0.6, 18), bob=2, lean=-1, hot=1.0, core=2, sink=3),
                                        G(eyes=0, mouth=1, arm=(1.0, 16), roll=-16, bob=5, hot=0.7, sink=6),
                                        golem_heap(0), golem_heap(1), golem_heap(2)], 64)


# ================================================================== STEAMBOT (drawn, 64x64: a brass boiler automaton with a steam nozzle)
def steambot_raw(t=0.0, bob=0, step=None, nozzle=0.0, eye=1, dx=0, gauge=0.3, fire=1, lean=0.0, puffs=1, claw=0.0, burst=0):
    """Side view facing right: a riveted brass boiler for a body on two piston legs, a chimney at the back, a domed
    head with a glowing slot eye, a pressure gauge on the chest, a firebox door glowing below it, a hose arm ending in
    a flared nozzle in front (nozzle 0 = lowered .. 1 = levelled at you), a pincer claw on the far arm."""
    p = Pic(64, 64)
    cx, cy = 28 + dx, 32 + bob
    # far arm: pincer
    sx, sy = cx - 2, cy - 4
    ex, ey = sx + 10, sy + 12
    p.l(sx, sy, ex, ey, dark(BR1, 0.7), 4)
    p.l(ex, ey, ex + 4, ey - 2 - claw * 2, dark(FE3, 0.8), 2); p.l(ex, ey, ex + 4, ey + 2 + claw * 2, dark(FE3, 0.8), 2)
    for k, (hx_, fx) in enumerate(((-5, -7), (4, 6))):                     # piston legs
        ph = (step + k * math.pi) if step is not None else 0
        lift = max(0, math.sin(ph)) * 2.5 if step is not None else 0
        s_ = math.cos(ph) * 2.5 if step is not None else 0
        dk = 0.75 if k == 0 else 1.0
        kx, ky = cx + hx_ + s_ * 0.5 - 3, cy + 15 - lift * 0.5               # the knee bends back
        p.l(cx + hx_, cy + 8, kx, ky, dark(FE3, dk), 4)
        p.l(kx, ky, cx + fx + s_, 53 - lift, dark(FE2, dk), 4)
        p.l(kx + 1, ky, cx + fx + s_ + 1, 52 - lift, dark(M2, dk))           # bright piston rod
        p.e(kx - 2.5, ky - 2.5, kx + 2.5, ky + 2.5, dark(BR2, dk)); p.p(kx - 0.5, ky - 0.5, dark(BR4, dk))
        p.r(cx + fx + s_ - 5, 53 - lift, cx + fx + s_ + 6, 57 - lift, dark(FE2, dk))
        p.l(cx + fx + s_ - 5, 53 - lift, cx + fx + s_ + 6, 53 - lift, dark(FE4, dk))
    # chimney at the back
    p.r(cx - 13, cy - 22, cx - 8, cy - 6, FE1)
    p.r(cx - 12, cy - 22, cx - 9, cy - 6, FE2)
    p.l(cx - 12, cy - 22, cx - 12, cy - 6, FE3)
    p.r(cx - 14, cy - 24, cx - 7, cy - 21, FE2); p.l(cx - 14, cy - 24, cx - 7, cy - 24, FE4)
    # the boiler body
    p.r(cx - 10, cy - 14, cx + 10, cy + 9, BR1)
    p.e(cx - 10, cy - 20, cx + 10, cy - 8, BR1)
    p.r(cx - 9, cy - 14, cx + 6, cy + 8, BR2)
    p.e(cx - 9, cy - 19, cx + 6, cy - 9, BR2)
    p.r(cx - 8, cy - 14, cx - 4, cy + 8, BR3)
    p.l(cx - 7, cy - 14, cx - 7, cy + 8, BR4)
    for y in (cy - 12, cy + 1, cy + 8):                                    # copper bands with rivets
        p.r(cx - 10, y - 1, cx + 10, y + 1, CU1)
        p.l(cx - 10, y - 1, cx + 10, y - 1, CU3)
        for x in range(int(cx) - 8, int(cx) + 10, 3):
            p.p(x, y, CU3)
    p.r(cx - 1, cy + 2, cx + 9, cy + 7, FE1)                                # firebox door
    p.r(cx, cy + 3, cx + 8, cy + 6, (MO1, MO2, MO3)[fire] if fire >= 0 else FE0)
    for x in range(int(cx) + 1, int(cx) + 9, 2):
        p.l(x, cy + 3, x, cy + 6, FE1)
    gx, gy = cx + 3, cy - 6                                                 # pressure gauge
    p.e(gx - 4, gy - 4, gx + 4, gy + 4, BR0)
    p.e(gx - 3, gy - 3, gx + 3, gy + 3, (236, 230, 210))
    a = math.pi * (0.8 + gauge * 1.4)
    p.l(gx, gy, gx + math.cos(a) * 3, gy + math.sin(a) * 3, (200, 30, 30) if gauge > 0.8 else OUT)
    p.p(gx + 2, gy - 2, (200, 60, 50))
    # the domed head with the slot eye
    hx, hy = cx + 1 + lean, cy - 22
    p.e(hx - 7, hy - 6, hx + 7, hy + 5, FE2)
    p.e(hx - 6, hy - 6, hx + 4, hy + 2, FE3)
    p.e(hx - 5, hy - 6, hx, hy - 2, FE4)
    p.r(hx - 1, hy - 2, hx + 7, hy + 1, FE0)
    ec = ((60, 30, 20), (255, 170, 60), (255, 236, 160))[eye]
    p.l(hx, hy - 1, hx + 6, hy - 1, ec)
    p.l(hx + 2, hy, hx + 5, hy, dark(ec, 0.7))
    p.l(hx - 7, hy + 4, hx + 7, hy + 4, BR2)
    p.p(hx, hy - 8, BR3); p.l(hx, hy - 7, hx, hy - 6, FE3)                  # whistle
    # the hose arm and nozzle
    sx, sy = cx + 6, cy - 6
    a = 1.1 - nozzle * 1.1
    ex, ey = sx + math.cos(a) * 15, sy + math.sin(a) * 15
    mx, my = sx + math.cos(a + 0.35) * 8, sy + math.sin(a + 0.35) * 8
    p.lines([(sx, sy), (mx, my), (ex, ey)], (40, 34, 30), 5)
    p.lines([(sx, sy), (mx, my), (ex, ey)], (78, 64, 54), 3)
    for k in range(1, 5):                                                  # hose ribs
        t_ = k / 5
        x_, y_ = (sx + (mx - sx) * t_ * 2, sy + (my - sy) * t_ * 2) if t_ < 0.5 else (mx + (ex - mx) * (t_ - 0.5) * 2, my + (ey - my) * (t_ - 0.5) * 2)
        p.p(x_, y_, (120, 100, 84))
    u = (math.cos(a), math.sin(a)); v = (-u[1], u[0])
    nz = [(ex - v[0] * 2, ey - v[1] * 2), (ex + u[0] * 6 - v[0] * 4, ey + u[1] * 6 - v[1] * 4),
          (ex + u[0] * 6 + v[0] * 4, ey + u[1] * 6 + v[1] * 4), (ex + v[0] * 2, ey + v[1] * 2)]
    p.poly(nz, BR1)
    p.poly([nz[0], nz[1], ((nz[1][0] + nz[2][0]) / 2, (nz[1][1] + nz[2][1]) / 2), (ex, ey)], BR3)
    p.l(*nz[1], *nz[2], BR4)
    im = outline_same(cut_below(p.im, 57))
    q = Pic(64, 64)
    if puffs:                                                              # steam from the chimney
        for j in range(puffs):
            steam_puff(q, cx - 10 + j * 1.5 + math.sin(t * math.tau + j) * 1.5, cy - 27 - j * 4, 3 - j * 0.6)
    tip = (ex + u[0] * 6, ey + u[1] * 6)
    return on(im, outline_same(q.im)), tip, (gx, gy)


def steam_cone(tip, k, seed, ang=0.0, reach=13):
    """The scalding cone of steam out of the nozzle: puffs widening along ang, k (0..1) how far it has spread."""
    p = Pic(64, 64)
    r2 = random.Random(seed)
    n = 7
    for i in range(n):
        t = (i + 1) / n * (0.4 + k * 0.6)
        d = reach * t
        spread = d * 0.75
        x = tip[0] + math.cos(ang) * d
        y = tip[1] + math.sin(ang) * d + r2.uniform(-spread, spread) * 0.5
        steam_puff(p, x, y, 1.8 + d * 0.2, 0 if t < 0.7 else 1)
        if spread > 3:
            steam_puff(p, x - 1, y - spread * 0.6, 1.4 + d * 0.14, 1)
            steam_puff(p, x - 1, y + spread * 0.6, 1.4 + d * 0.14, 1)
    im = outline_same(cut_below(p.im, 57))
    q = Pic(64, 64)
    for _ in range(6):
        d = r2.uniform(4, reach * (0.4 + k * 0.6))
        q.p(tip[0] + d, tip[1] + r2.uniform(-d * 0.4, d * 0.4), WHITE)
    return on(im, q.im)


def steambot_frame(fl=None, cone=None, leak=0, seed=0, **kw):
    im, tip, g = steambot_raw(**kw)
    if cone is not None:
        im = on(im, steam_cone(tip, cone, seed, 0.05))
    if leak:                                                               # steam hissing out of the seams
        q = Pic(64, 64)
        cx, cy = 28 + kw.get('dx', 0), 32 + kw.get('bob', 0)
        for j, (x, y, a) in enumerate(((cx - 11, cy - 4, math.pi), (cx + 10, cy - 13, -0.3), (cx - 11, cy + 6, math.pi + 0.3))[:leak]):
            for s_ in range(3):
                steam_puff(q, x + math.cos(a) * (3 + s_ * 3), y + math.sin(a) * (3 + s_ * 3) - s_, 1.5 + s_ * 0.8)
        im = on(im, outline_same(cut_below(q.im, 57)))
    if fl:
        im = flash(im, fl)
    return im


def steambot_wreck(k):
    """Burst apart: the split boiler lies on its side, a leg and the head beside it, steam still rising (k = 0..2)."""
    im, _, _ = steambot_raw(eye=0, fire=-1, puffs=0)
    body = im.crop((14, 6, 46, 42))
    body = body.rotate(-90, resample=Image.NEAREST, expand=True)
    p = Pic(64, 64)
    p.paste(body, 18, 57 - body.height + 1)
    p.l(6, 56, 16, 54, FE2, 4); p.r(4, 54, 8, 57, FE2)                      # a leg
    p.l(50, 57, 58, 52, (40, 34, 30), 4)                                    # the hose
    im2 = outline_same(cut_below(p.im, 57))
    q = Pic(64, 64)
    for j in range(4 - k):
        steam_puff(q, 32 + j * 2 - k, 40 - j * 6 - k * 3, 4 - j * 0.6, k)
    if k == 0:
        sparkles(q, 3, 70, (20, 40, 50, 54), SPARK_PAL)
    return on(im2, outline_same(q.im))


@builder('steambot')
def make_steambot():
    B = steambot_frame
    save_enemy('steambot', 'idle', [B(t=i / 4, bob=(0, 0, 1, 1)[i], gauge=0.3 + 0.05 * (i % 2), fire=(1, 2, 1, 1)[i], puffs=(1, 2, 2, 1)[i]) for i in range(4)], 64)
    save_enemy('steambot', 'movement', [B(t=i / 6, step=i * math.tau / 6, bob=(0, -1, 0, 0, -1, 0)[i], lean=1, nozzle=0.2, puffs=1 + i % 2) for i in range(6)], 64)
    # attack: it levels the nozzle, the gauge climbs and a cone of scalding steam blasts out
    save_enemy('steambot', 'attack', [B(nozzle=0.6, eye=2, gauge=0.6, fire=2, dx=-3), B(nozzle=1.0, eye=2, gauge=0.9, fire=2, puffs=2, dx=-8),
                                      B(nozzle=1.0, eye=2, gauge=0.95, cone=0.3, seed=1, dx=-10),
                                      B(nozzle=1.0, eye=2, gauge=0.7, cone=0.8, seed=2, dx=-12),
                                      B(nozzle=1.0, eye=1, gauge=0.4, cone=1.0, seed=3, dx=-12),
                                      B(nozzle=0.5)], 64)
    save_enemy('steambot', 'take_damage', [B(dx=-3, eye=2, gauge=0.9, leak=2, fl=(255, 255, 255)), B(dx=-2, eye=2, leak=1), B(dx=-1)], 64)
    # death: the needle hits red, steam screams out of every seam, it bursts in a cloud and lies in pieces
    d = [B(eye=2, gauge=1.0, leak=2, fire=2, seed=4), B(eye=2, gauge=1.0, leak=3, fire=2, bob=-1, seed=5)]
    d.append(on(B(eye=0, gauge=1.0, leak=3, fire=2, puffs=0), steam_cloud(64, 28, 32, 38, 26, 9, 0.0, 57)))
    d.append(on(steambot_wreck(0), steam_cloud(64, 30, 40, 36, 22, 10, 0.5, 57)))
    d += [steambot_wreck(0), steambot_wreck(1), steambot_wreck(2)]
    save_enemy('steambot', 'death', d, 64)


# ================================================================== BOSS: BIBLIOTEKARIEN (drawn: a towering six-armed librarian, books orbiting her)
BS = 116
BS_FEET = 115
LB = ((40, 14, 40), (70, 26, 64), (104, 44, 92), (146, 74, 128))        # plum robe
SK = ((140, 96, 96), (196, 150, 138), (230, 192, 176), (250, 226, 212))  # pale skin
HAIR = ((96, 96, 116), (150, 150, 170), (196, 196, 212), (236, 236, 246))


def little_book(p, x, y, ang=0.0, col=0, flap=0.0, far=False):
    """A small flying book (centre x, y): two covers in a V opening by flap, pages between, gold corners."""
    c = BOOKS[col % len(BOOKS)]
    if far:
        c = tuple(dark(q, 0.65) for q in c)
    u = (math.cos(ang), math.sin(ang)); v = (-u[1], u[0])
    P_ = lambda a_, b_: (x + u[0] * a_ + v[0] * b_, y + u[1] * a_ + v[1] * b_)
    o = 1.5 + flap * 2.5
    p.poly([P_(-4, 0), P_(4, 0), P_(4, -o - 1.5), P_(-4, -o - 1.5)], c[1])         # upper cover
    p.poly([P_(-4, 0), P_(4, 0), P_(4, o + 1.5), P_(-4, o + 1.5)], c[0])           # lower cover
    p.poly([P_(-3.5, -o + 0.5), P_(3.5, -o + 0.5), P_(3.5, o - 0.5), P_(-3.5, o - 0.5)], PA2 if not far else PA0)
    p.l(*P_(-3.5, 0), *P_(3.5, 0), PA0)
    p.l(*P_(-4, -o - 1.5), *P_(4, -o - 1.5), c[2])
    p.p(*P_(4, -o - 1.5), AU2); p.p(*P_(4, o + 1.5), AU2)


def lib_arm(p, sx, sy, ang, ln, far=False, item=None, k=0, bend=0.5):
    """A long robed arm from the shoulder (sx, sy) along ang (0 = forward, + = down), elbow bent by `bend`, a pale hand
    holding an item: 'candle', 'book', 'quill', 'scroll' or None. Returns the hand point."""
    rp = tuple(dark(c, 0.7) for c in LB) if far else LB
    sk = tuple(dark(c, 0.7) for c in SK) if far else SK
    ex, ey = sx + math.cos(ang - bend) * ln * 0.5, sy + math.sin(ang - bend) * ln * 0.5
    hx, hy = ex + math.cos(ang + bend * 0.4) * ln * 0.5, ey + math.sin(ang + bend * 0.4) * ln * 0.5
    p.l(sx, sy, ex, ey, rp[0], 7); p.l(sx, sy, ex, ey, rp[1], 5)
    p.l(sx, sy - 1.5, ex, ey - 1.5, rp[2], 1)
    p.l(ex, ey, hx, hy, rp[0], 6); p.l(ex, ey, hx, hy, rp[1], 4)
    p.l(ex, ey - 1, hx, hy - 1, rp[3] if not far else rp[2], 1)
    cx_, cy_ = ex + (hx - ex) * 0.82, ey + (hy - ey) * 0.82
    p.e(cx_ - 3, cy_ - 3, cx_ + 3, cy_ + 3, AU1 if not far else dark(AU1, 0.7))        # gold cuff
    p.e(hx - 2.5, hy - 2.5, hx + 2.5, hy + 2.5, sk[1])
    p.e(hx - 2, hy - 2.5, hx + 1, hy + 0.5, sk[2])
    if item == 'candle':
        candle(p, hx, hy - 1, 7, 1 if k >= 0 else 0, k=abs(k), w=1.5)
    elif item == 'book':
        q = Pic(18, 14)
        open_book(q, 9, 7, 14, 7, 1 if k >= 0 else 0, seed=int(sx))
        p.paste(q.im, hx - 9, hy - 10)
    elif item == 'quill':
        p.l(hx, hy, hx + 5, hy - 9, (230, 226, 216), 2); p.l(hx + 2, hy - 5, hx + 6, hy - 11, WHITE)
    elif item == 'scroll':
        p.r(hx - 2, hy - 1, hx + 6, hy + 2, PA2); p.l(hx - 2, hy - 1, hx + 6, hy - 1, PA3)
        p.e(hx + 5, hy - 2, hx + 8, hy + 3, PA1)
    return hx, hy


LIB_IDLE_NEAR = [(-0.6, 30, 'candle', 0.5), (0.05, 30, 'book', 0.6), (0.85, 28, 'quill', 0.5)]
LIB_IDLE_FAR = [(-2.5, 28, 'candle', -0.4), (2.95, 26, 'book', -0.4), (2.2, 26, 'scroll', -0.4)]


def librarian_frame(t=0.0, bob=0, near=None, far=None, eyes=1, mouth=0, lean=0.0, dx=0, books=5, orbit=1.0, fl=None, lit=True,
                    runes=0, sink=0, throw=None, k=0):
    """Side view facing right: a towering figure in a plum robe trimmed with gold, a ruffled collar, a silver bun stuck
    with quills, half-moon spectacles; six arms (near / far: [(angle, length, item, bend)]) hold candles, books, a quill
    and a scroll; small books circle her (orbit = speed / radius factor)."""
    near = near or LIB_IDLE_NEAR
    far = far or LIB_IDLE_FAR
    p = Pic(BS, BS)
    cx = 52 + dx
    top = 12 + bob + sink
    sh_y = top + 30
    oy, rx, ry = top + 56, 44 * orbit, 11 * orbit
    for i in range(books):                                                # books behind her
        a = t * math.tau * orbit + i * math.tau / books
        if math.sin(a) < 0:
            little_book(p, cx + math.cos(a) * rx, oy + math.sin(a) * ry - (i % 2) * 6, math.sin(a + i) * 0.4, i, (math.sin(a * 3) + 1) / 2, far=True)
    if runes:                                                             # a ring of runes behind her (cast)
        for i in range(10):
            a = i / 10 * math.tau + t * 2
            rune(p, cx + math.cos(a) * (30 + runes * 3) - 1.5, top + 40 + math.sin(a) * (30 + runes * 3) - 1.5, i, RN2 if runes > 1 else RN1, RN0)
    for j, (a, ln, it, bd) in enumerate(far):
        lib_arm(p, cx - 1 + lean * 0.5, sh_y + 2 + j * 6, a, ln, True, it, k if lit else -1, bd)
    # the robe: a long bell to the floor
    hem = BS_FEET - 2
    p.poly([(cx - 9, sh_y), (cx + 10, sh_y), (cx + 15, top + 62), (cx + 22, hem), (cx - 24, hem), (cx - 14, top + 62)], LB[1])
    p.poly([(cx - 9, sh_y + 1), (cx - 2, sh_y + 1), (cx - 6, top + 62), (cx - 14, hem - 1), (cx - 22, hem - 1), (cx - 13, top + 62)], LB[2])
    p.lines([(cx - 9, sh_y + 1), (cx - 13, top + 62), (cx - 23, hem)], LB[3])
    for k_ in range(5):                                                   # folds
        x0 = cx - 6 + k_ * 4
        p.l(x0, top + 50, x0 + (x0 - cx) * 0.8, hem - 1, LB[0])
    p.poly([(cx + 2, sh_y + 2), (cx + 6, sh_y + 2), (cx + 14, hem), (cx + 9, hem)], AU1)           # gold front panel
    p.l(cx + 3, sh_y + 2, cx + 10, hem, AU3)
    for y_ in range(int(sh_y) + 8, hem, 9):
        p.p(cx + 4 + (y_ - sh_y) * 0.19, y_, AU4)
    p.r(cx - 24, hem, cx + 22, hem + 1, AU1); p.l(cx - 24, hem, cx + 22, hem, AU3)
    p.r(cx - 10, top + 44, cx + 13, top + 47, AU1)                        # belt with a key ring
    p.l(cx - 10, top + 44, cx + 13, top + 44, AU3)
    p.e(cx + 9, top + 47, cx + 14, top + 52, AU2); p.e(cx + 10, top + 48, cx + 13, top + 51, LB[1])
    p.l(cx + 13, top + 51, cx + 15, top + 57, AU3)
    for (bx, by, c) in ((cx - 28, hem, 0), (cx - 20, hem, 2), (cx + 18, hem, 1), (cx + 26, hem, 3)):   # a pile of books at her hem
        bc = BOOKS[c]
        p.r(bx - 5, by - 3, bx + 5, by, bc[1]); p.l(bx - 5, by - 3, bx + 5, by - 3, bc[2]); p.l(bx + 5, by - 3, bx + 5, by, PA2)
    # head: ruffled collar, gaunt face in profile, spectacles, a tall silver bun with quills
    hx, hy = cx + 4 + lean, top + 16
    for i in range(7):
        a = math.pi * (0.95 + i / 6 * 1.1)
        p.e(hx - 1 + math.cos(a) * 9 - 3, hy + 11 + math.sin(a) * 3 - 2, hx - 1 + math.cos(a) * 9 + 3, hy + 11 + math.sin(a) * 3 + 3, PA3 if i % 2 else PA2)
    p.e(hx - 8, hy - 9, hx + 7, hy + 9, SK[1])
    p.e(hx - 7, hy - 9, hx + 4, hy + 4, SK[2])
    p.poly([(hx + 6, hy - 3), (hx + 10, hy + 2), (hx + 6, hy + 3)], SK[1])                     # long nose
    p.l(hx + 6, hy - 3, hx + 9, hy + 1, SK[3])
    p.l(hx + 1, hy + 5, hx + 5, hy + 6, SK[0])                                                 # cheek
    if mouth:
        p.e(hx + 2, hy + 5, hx + 6, hy + 6 + mouth * 2, (40, 14, 30))
    else:
        p.l(hx + 2, hy + 6, hx + 5, hy + 6, SK[0])
    ec = (SK[0], (60, 40, 70), RN2, RN3)[eyes]
    p.e(hx + 1, hy - 2, hx + 6, hy + 1, AU2)                                                    # half-moon spectacles
    p.e(hx + 2, hy - 1, hx + 5, hy + 0.5, (220, 230, 240) if eyes < 2 else RN1)
    p.l(hx + 1, hy - 2, hx + 6, hy - 2, SK[1])
    p.p(hx + 3, hy - 1, ec)
    p.l(hx - 6, hy - 1, hx + 1, hy - 1, AU2)                                                    # the temple arm
    p.l(hx + 1, hy - 4, hx + 6, hy - 3 - (eyes >= 2), SK[0])                                    # brow
    p.e(hx - 14, hy - 17, hx - 3, hy - 6, HAIR[1])                                              # the bun at the back
    p.e(hx - 13, hy - 17, hx - 6, hy - 11, HAIR[2])
    p.arc(hx - 14, hy - 17, hx - 3, hy - 6, 200, 260, HAIR[3])
    p.e(hx - 9, hy - 11, hx + 6, hy - 3, HAIR[1]); p.l(hx - 7, hy - 8, hx + 4, hy - 7, HAIR[2])   # hair drawn back tight
    p.l(hx - 7, hy - 3, hx - 7, hy + 4, HAIR[1], 2)
    for (a, ln) in ((-2.5, 9), (-2.0, 8)):                                                      # quills in the bun
        x0, y0 = hx - 8, hy - 12
        x1, y1 = x0 + math.cos(a) * ln, y0 + math.sin(a) * ln
        p.l(x0, y0, x1, y1, (230, 226, 216), 2); p.l(x0 + (x1 - x0) * 0.4, y0 + (y1 - y0) * 0.4, x1, y1, WHITE)
    for j, (a, ln, it, bd) in enumerate(near):
        lib_arm(p, cx + 11 + lean, sh_y + 1 + j * 6, a, ln, False, it, k if lit else -1, bd)
    im = outline_same(cut_below(p.im, BS_FEET))
    q = Pic(BS, BS)
    for i in range(books):                                                # books in front of her
        a = t * math.tau * orbit + i * math.tau / books
        if math.sin(a) >= 0:
            little_book(q, cx + math.cos(a) * rx, oy + math.sin(a) * ry - (i % 2) * 6, math.sin(a + i) * 0.4, i, (math.sin(a * 3) + 1) / 2)
    if throw:                                                             # books hurled forwards
        for (x, y, c) in throw:
            little_book(q, x, y, -0.3, c, 1.0)
            for j in range(3):
                q.l(x - 7 - j * 3, y - 2 + j * 2, x - 5 - j * 3, y - 2 + j * 2, WHITE)
    im = on(im, outline_same(cut_below(q.im, BS_FEET)))
    r = Pic(BS, BS)
    sparkles(r, 6 if lit else 0, int(t * 20) + 3, (cx - 40, top, cx + 40, top + 60), (RN1, RN2, RN3))   # floating motes of candlelight
    im = on(im, r.im)
    if fl:
        im = flash(im, fl)
    return im


def librarian_fallen(k):
    """She has collapsed: a heap of plum robe on the floor, the arms limp across it, books and snuffed candles strewn
    round, the spectacles lying in front (k = 0..2 settles it, the smoke thins)."""
    p = Pic(BS, BS)
    f = BS_FEET
    p.poly([(16, f), (24, f - 12), (40, f - 18), (60, f - 20), (80, f - 15), (96, f)], LB[1])
    p.poly([(24, f - 11), (40, f - 17), (56, f - 18), (48, f - 10), (30, f - 6)], LB[2])
    for x0 in (34, 50, 66, 80):
        p.l(x0, f - 14, x0 + 4, f, LB[0])
    p.r(16, f - 1, 96, f, AU1)
    p.e(70, f - 26, 86, f - 14, HAIR[1]); p.e(72, f - 25, 80, f - 19, HAIR[2])          # the head with the bun, face down
    p.e(80, f - 18, 92, f - 8, SK[1]); p.e(82, f - 17, 89, f - 12, SK[2])
    for (x0, y0, x1, y1) in ((60, f - 14, 98, f - 3), (44, f - 16, 20, f - 4), (56, f - 10, 78, f - 1)):   # limp arms
        p.l(x0, y0, x1, y1, LB[0], 6); p.l(x0, y0, x1, y1, LB[1], 4)
        p.e(x1 - 2.5, y1 - 2.5, x1 + 2.5, y1 + 2.5, SK[1])
    for (x, c, ang) in ((8, 0, 0.1), (28, 2, -0.2), (100, 1, 0.3), (108, 3, 0.0), (46, 4, 0.2)):
        little_book(p, x, f - 2, ang, c, 0.0)
    for x in (12, 104):                                                   # fallen candles
        p.r(x - 4, f - 2, x + 4, f, WAX1); p.l(x - 4, f - 2, x + 4, f - 2, WAX2)
    p.e(94, f - 4, 98, f - 1, AU2); p.e(99, f - 4, 103, f - 1, AU2); p.l(98, f - 3, 99, f - 3, AU2)   # spectacles
    im = outline_same(cut_below(p.im, f))
    q = Pic(BS, BS)
    for x in (12, 104):
        for j in range(3 - k):
            puff(q, x + 2 + j, f - 7 - j * 5 - k * 2, 2.2 - j * 0.4, ((60, 56, 62), (96, 92, 98), (130, 126, 132), (160, 156, 160)))
    pg = loose_pages(5 - k, 130 + k, (10, f - 3, 106, f), floor=f, size=BS)
    return on(pg, im, outline_same(q.im))


@builder('librarian')
def make_librarian():
    C = librarian_frame
    sv = lambda st, fr: save(cells(fr, BS, BS), G_OUT + f'boss_librarian_{st}.png', len(fr))
    sv('idle', [C(t=i / 5 * 0.2, bob=(0, 0, 1, 1, 0)[i], k=i % 3, eyes=0 if i == 4 else 1) for i in range(5)])
    # attack: the book-holding arms rear back and hurl heavy books at you
    N, F_ = LIB_IDLE_NEAR, LIB_IDLE_FAR
    sv('attack', [C(t=0.0, eyes=2, mouth=1, lean=-2, near=[N[0], (-1.9, 30, 'book', 0.4), N[2]], far=[F_[0], (-2.6, 26, 'book', -0.3), F_[2]]),
                  C(t=0.05, eyes=2, mouth=2, lean=-3, bob=-1, near=[N[0], (-2.3, 30, 'book', 0.3), (-0.4, 28, 'quill', 0.5)], far=[F_[0], (-2.2, 26, 'book', -0.3), F_[2]], k=1),
                  C(t=0.1, eyes=2, mouth=2, lean=3, near=[N[0], (-0.1, 32, None, 0.1), (0.4, 28, 'quill', 0.3)], far=[F_[0], (-0.6, 30, None, 0.2), F_[2]],
                    throw=[(92, 46, 0), (86, 36, 2)], k=2),
                  C(t=0.15, eyes=2, mouth=1, lean=2, near=[N[0], (0.2, 32, None, 0.2), N[2]], far=[F_[0], (-0.2, 30, None, 0.2), F_[2]],
                    throw=[(106, 50, 0), (100, 40, 2)], k=0),
                  C(t=0.2, eyes=1, lean=1, near=[N[0], (0.1, 30, None, 0.4), N[2]], k=1),
                  C(t=0.25, k=2)])
    # cast: every arm raised, the orbit of books spins wide, a ring of runes kindles behind her
    up_n = [(-1.1, 30, 'candle', 0.3), (-1.0, 30, 'book', 0.4), (-0.4, 28, 'quill', 0.4)]
    up_f = [(-1.9, 28, 'candle', -0.3), (-2.4, 26, 'book', -0.3), (-2.9, 26, 'scroll', -0.3)]
    sv('cast', [C(t=i / 6 * 0.4, near=up_n if i in (1, 2, 3, 4) else None, far=up_f if i in (1, 2, 3, 4) else None, eyes=3 if i in (2, 3) else 2,
                  mouth=1 if i in (2, 3) else 0, books=5 + (i in (2, 3, 4)) * 2, orbit=(1.0, 1.1, 1.25, 1.3, 1.2, 1.0)[i],
                  runes=(0, 1, 2, 3, 2, 0)[i], bob=-(i in (2, 3)) * 2, k=i % 3) for i in range(6)])
    sv('hurt', [C(t=0.02, dx=-4, eyes=2, mouth=2, fl=(255, 255, 255), lean=-2, k=1), C(t=0.04, dx=-2, eyes=2, mouth=1, k=2), C(t=0.06, dx=-1)])
    limp_n = [(-0.3, 30, 'candle', 0.6), (0.6, 30, 'book', 0.5), (1.2, 28, None, 0.3)]
    limp_f = [(-2.5, 28, 'candle', -0.6), (2.6, 26, None, -0.4), (2.0, 26, None, -0.3)]
    drop_n = [(1.1, 28, None, 0.2), (1.3, 28, None, 0.2), (1.45, 26, None, 0.1)]
    drop_f = [(1.9, 26, None, -0.2), (1.8, 26, None, -0.2), (1.7, 24, None, -0.1)]
    d = [C(t=0.0, eyes=3, mouth=2, runes=1, orbit=1.3, books=7, near=up_n, far=up_f),
         C(t=0.05, eyes=0, mouth=2, near=limp_n, far=limp_f, orbit=1.5, books=4, sink=4),
         C(t=0.1, eyes=0, mouth=1, near=drop_n, far=drop_f, books=0, lit=False, sink=14),
         C(t=0.15, eyes=0, near=drop_n, far=drop_f, books=0, lit=False, sink=30, lean=3)]
    d += [librarian_fallen(0), librarian_fallen(1), librarian_fallen(2)]
    sv('death', d)


# ================================================================== BOSS: SMIDESKOLOSSEN (drawn: an iron forge colossus, a furnace in its chest, a hammer arm)
def colossus_frame(t=0.0, bob=0, hammer=(1.0, 40), farm=(1.35, 30), eyes=1, lean=0.0, dx=0, door=0.0, fire=1, smoke=2, fl=None,
                   step=0.0, impact=0, blast=0, cracks=0, sink=0, chimney_fire=0):
    """Side view facing right: a hulking iron giant of riveted plates, two chimneys smoking on its back, a small helm
    with a glowing T-visor, a furnace in its chest (door 0 shut .. 1 open, fire 0..2), a huge forge hammer for a right
    forearm (angle, length; 0 = forward, + = down), tongs for the left hand."""
    p = Pic(BS, BS)
    cx, cy = 50 + dx, 67 + bob + sink
    F = BS_FEET

    def plate(x0, y0, x1, y1, pal=(FE0, FE1, FE2, FE3)):
        p.r(x0, y0, x1, y1, pal[1]); p.l(x0, y0, x1, y0, pal[3]); p.l(x0, y0, x0, y1, pal[2]); p.l(x0, y1, x1, y1, pal[0])
    # far arm with tongs
    sx, sy = cx - 4, cy - 26
    ex, ey = sx + math.cos(farm[0]) * farm[1] * 0.5 - 4, sy + math.sin(farm[0]) * farm[1] * 0.5
    hx, hy = ex + math.cos(farm[0] - 0.3) * farm[1] * 0.5, ey + math.sin(farm[0] - 0.3) * farm[1] * 0.5
    p.l(sx, sy, ex, ey, dark(FE2, 0.7), 10); p.l(ex, ey, hx, hy, dark(FE2, 0.7), 8)
    p.e(ex - 5, ey - 5, ex + 5, ey + 5, dark(FE3, 0.7))
    for sd in (-1, 1):
        p.lines([(hx, hy), (hx + 6, hy + sd * 4), (hx + 12, hy + sd * 2)], dark(FE3, 0.7), 3)
    # legs: thick plated pillars
    for k_, (lx, sdx) in enumerate(((-12, -1), (8, 1))):
        dk = 0.72 if k_ == 0 else 1.0
        off = math.sin(step + k_ * math.pi) * 3 if step else 0
        lift = max(0, math.sin(step + k_ * math.pi)) * 3 if step else 0
        x = cx + lx + off
        p.r(x - 8, cy + 14, x + 8, F - 6 - lift, dark(FE1, dk))
        p.r(x - 7, cy + 14, x + 6, F - 7 - lift, dark(FE2, dk))
        p.l(x - 7, cy + 14, x - 7, F - 7 - lift, dark(FE3, dk))
        p.e(x - 7, cy + 26 - lift * 0.5, x + 7, cy + 36 - lift * 0.5, dark(FE3, dk))       # knee plate
        p.p(x - 2, cy + 29, dark(FE4, dk))
        p.r(x - 11, F - 7 - lift, x + 13, F - lift, dark(FE1, dk))                         # boot
        p.l(x - 11, F - 7 - lift, x + 13, F - 7 - lift, dark(FE3, dk))
        for rx_ in range(int(x) - 8, int(x) + 12, 5):
            p.p(rx_, F - 4 - lift, dark(FE4, dk))
    # chimneys on its back
    for (ox, h_) in ((-22, 12), (-14, 18)):
        p.r(cx + ox - 3, cy - 40 - h_ * 0.4, cx + ox + 3, cy - 22, FE1)
        p.l(cx + ox - 2, cy - 40 - h_ * 0.4, cx + ox - 2, cy - 22, FE3)
        p.r(cx + ox - 5, cy - 43 - h_ * 0.4, cx + ox + 5, cy - 40 - h_ * 0.4, FE2)
        p.l(cx + ox - 5, cy - 43 - h_ * 0.4, cx + ox + 5, cy - 43 - h_ * 0.4, FE4)
    # the torso: a great barrel chest of riveted plates
    body = [(cx - 26, cy - 30), (cx + 18, cy - 34), (cx + 26, cy - 18), (cx + 22, cy + 8), (cx + 12, cy + 18), (cx - 18, cy + 18), (cx - 28, cy + 2)]
    p.poly(body, FE1)
    p.poly([(x + (cx - x) * 0.07, y + (cy - 8 - y) * 0.07) for x, y in body], FE2)
    p.poly([(cx - 25, cy - 29), (cx - 4, cy - 31), (cx - 10, cy - 20), (cx - 26, cy - 4)], FE3)
    for y_ in (cy - 22, cy - 6, cy + 10):                                  # plate seams with rivets
        p.l(cx - 26, y_, cx + 23, y_ - 3, FE0)
        for x_ in range(int(cx) - 24, int(cx) + 22, 5):
            p.p(x_, y_ - 2 - (x_ - cx + 24) * 0.06, FE4)
    for k_ in range(cracks):                                               # glowing cracks (dying)
        r2 = random.Random(k_ + 3)
        x0, y0 = cx + r2.uniform(-22, 16), cy + r2.uniform(-26, 12)
        pts = [(x0, y0)]
        for j in range(4):
            x0 += r2.uniform(-4, 4); y0 += r2.uniform(1, 4); pts.append((x0, y0))
        p.lines(pts, MO2, 2); p.lines(pts, MO4)
    # the furnace in the chest
    fx, fy = cx - 3, cy - 6
    p.e(fx - 14, fy - 14, fx + 14, fy + 14, FE0)
    p.e(fx - 12, fy - 12, fx + 12, fy + 12, FE3)
    fc = ((80, 20, 10), MO1, MO2, MO3, MO4)
    p.e(fx - 10, fy - 10, fx + 10, fy + 10, fc[min(4, fire + 1)])
    p.e(fx - 7, fy - 5, fx + 7, fy + 9, fc[min(4, fire + 2)])
    if fire >= 1:
        flame(p, fx - 3, fy + 7, 9 + fire * 2, -1, 2.0, (MO2, MO3, MO4, WHITE))
        flame(p, fx + 4, fy + 7, 7 + fire * 2, 1, 1.6, (MO2, MO3, MO4, WHITE))
    if door < 0.5:                                                         # the grate door (swings open)
        w_ = 10 * (1 - door * 1.6)
        for k_ in range(-2, 3):
            x_ = fx + k_ * 4 * (1 - door * 1.6)
            p.l(x_, fy - 10 + abs(k_) * 1.5, x_, fy + 10 - abs(k_) * 1.5, FE1, 2)
        p.l(fx - w_, fy, fx + w_, fy, FE1, 2)
    else:
        p.poly([(fx + 12, fy - 10), (fx + 20, fy - 14), (fx + 20, fy + 14), (fx + 12, fy + 10)], FE2)   # the open door
        p.l(fx + 20, fy - 14, fx + 20, fy + 14, FE4)
    p.arc(fx - 12, fy - 12, fx + 12, fy + 12, 190, 260, FE4)
    # shoulder pauldron and head
    hx, hy = cx + 8 + lean, cy - 38
    p.e(hx - 9, hy - 8, hx + 9, hy + 8, FE1)
    p.e(hx - 8, hy - 8, hx + 6, hy + 5, FE2)
    p.e(hx - 7, hy - 8, hx, hy - 2, FE3)
    p.r(hx - 1, hy - 3, hx + 10, hy, (40, 6, 4))                            # the T-visor
    p.r(hx + 4, hy - 3, hx + 7, hy + 6, (40, 6, 4))
    vc = ((90, 40, 30), MO3, MO4)[eyes]
    p.l(hx, hy - 2, hx + 9, hy - 2, vc); p.l(hx + 5, hy - 1, hx + 5, hy + 5, vc)
    p.l(hx - 9, hy, hx - 9, hy - 10, FE3, 2)                                # crest
    # hammer arm (near)
    sx, sy = cx + 20 + lean, cy - 24
    p.e(sx - 11, sy - 9, sx + 11, sy + 9, FE1)                              # pauldron
    p.e(sx - 10, sy - 9, sx + 8, sy + 5, FE3)
    p.l(sx - 9, sy - 2, sx + 9, sy - 2, FE0)
    a, ln = hammer
    ex, ey = sx + math.cos(a + 0.5) * ln * 0.45, sy + math.sin(a + 0.5) * ln * 0.45
    hx2, hy2 = ex + math.cos(a) * ln * 0.55, ey + math.sin(a) * ln * 0.55
    p.l(sx, sy, ex, ey, FE1, 11); p.l(sx, sy, ex, ey, FE2, 9)
    p.e(ex - 6, ey - 6, ex + 6, ey + 6, FE3); p.p(ex - 2, ey - 2, FE4)
    p.l(ex, ey, hx2, hy2, FE1, 8); p.l(ex, ey, hx2, hy2, FE2, 6)
    u = (math.cos(a), math.sin(a)); v = (-u[1], u[0])
    H = lambda a_, b_: (hx2 + u[0] * a_ + v[0] * b_, hy2 + u[1] * a_ + v[1] * b_)
    p.poly([H(-5, -15), H(11, -15), H(11, 15), H(-5, 15)], FE1)             # the hammer head
    p.poly([H(-4, -14), H(10, -14), H(10, 13), H(-4, 13)], FE2)
    p.poly([H(-4, -14), H(10, -14), H(10, -8), H(-4, -8)], FE3)
    p.l(*H(-4, -14), *H(10, -14), FE4)
    p.poly([H(-5, 14), H(11, 14), H(11, 18), H(-5, 18)], MO1 if impact else FE3)   # striking face
    p.l(*H(-5, 0), *H(11, 0), BR1, 2)                                     # a brass band round the head
    for b_ in (-8, 0, 8):
        p.p(*H(2, b_), FE4)
    im = outline_same(cut_below(p.im, F))
    q = Pic(BS, BS)
    for (ox, h_) in ((-22, 12), (-14, 18)):                                # smoke or fire out of the chimneys
        x, y = cx + ox, cy - 46 - h_ * 0.4
        if chimney_fire:
            flame(q, x, y + 2, 6 + chimney_fire * 4, 0.5, 2.5, (MO1, MO2, MO3, MO4))
        for j in range(smoke):
            puff(q, x - j * 2 + math.sin(t * math.tau + j + ox) * 1.5, y - 3 - j * 6, 3.5 - j * 0.6, ((40, 36, 38), (70, 64, 66), (100, 94, 94), (130, 124, 122)))
    im = on(outline_same(q.im), im)
    if impact:                                                             # sparks and a shockwave where the hammer lands
        r = Pic(BS, BS)
        x0 = hx2 + u[0] * 12
        for j in range(2):
            rr_ = 6 + impact * 6 + j * 6
            r.arc(x0 - rr_, F - rr_ * 0.25, x0 + rr_, F + rr_ * 0.25, 180, 360, MO3 if j == 0 else MO2, 2)
        molten_drops(r, 10 + impact * 4, 50 + impact, (x0 - 16, F - 20 - impact * 4, x0 + 16, F - 2))
        P8.clods(r, x0, F, 6, 60 + impact, 12, 10, (FE1, FE2, FE3), floor=F)
        im = on(im, r.im)
    if blast:                                                              # gouts of molten metal and fire out of the open furnace
        r = Pic(BS, BS)
        for j in range(blast):
            x = fx + 16 + j * 12; y = fy - 2 + j * 2 - j * j
            P4.fireball(r, x, y, 4 + j, t + j * 0.3)
        molten_drops(r, 8 + blast * 3, 70 + blast, (fx + 10, fy - 16, fx + 50, fy + 10))
        im = on(im, outline_same(r.im))
    if fl:
        im = flash(im, fl)
    return im


def colossus_fallen(k):
    """Fallen: the iron body lies on its back in a heap of plates, the hammer arm out across the floor, the furnace
    spilling its last embers (k = 0..2: the glow dies, the smoke thins)."""
    p = Pic(BS, BS)
    F = BS_FEET
    for (x, y, w, h) in ((18, F - 8, 16, 8), (34, F - 14, 30, 14), (62, F - 12, 20, 12), (12, F - 5, 10, 5), (84, F - 6, 10, 6)):
        p.r(x, y, x + w, F, FE1); p.r(x + 1, y + 1, x + w - 1, F - 1, FE2); p.l(x, y, x + w, y, FE3)
        for x_ in range(x + 2, x + w - 1, 4):
            p.p(x_, y + 2, FE4)
    p.l(64, F - 8, 92, F - 6, FE1, 7); p.l(64, F - 8, 92, F - 6, FE2, 5)    # the hammer arm on the floor
    p.r(90, F - 18, 104, F, FE1); p.r(91, F - 17, 103, F - 1, FE2); p.l(91, F - 17, 103, F - 17, FE3)
    p.e(42, F - 26, 58, F - 10, FE0); p.e(44, F - 24, 56, F - 12, ((MO2, MO3), (MO1, MO2), ((80, 20, 10), MO0))[k][0])   # the furnace
    p.e(47, F - 21, 53, F - 15, ((MO2, MO3), (MO1, MO2), ((80, 20, 10), MO0))[k][1])
    p.e(24, F - 20, 36, F - 9, FE2); p.l(26, F - 15, 34, F - 15, ((MO3, MO1, (60, 20, 10))[k]))    # the head, visor dimming
    im = outline_same(cut_below(p.im, F))
    q = Pic(BS, BS)
    molten_drops(q, 10 - k * 4, 80 + k, (36, F - 6, 70, F), (MO1, MO2, MO3) if k < 2 else (MO0, MO1, MO1))
    for j in range(4 - k):
        puff(q, 50 + j * 3, F - 30 - j * 8 - k * 4, 4 - j * 0.6, ((40, 36, 38), (70, 64, 66), (100, 94, 94), (130, 124, 122)))
    return on(im, outline_same(q.im))


@builder('colossus')
def make_colossus():
    C = colossus_frame
    sv = lambda st, fr: save(cells(fr, BS, BS), G_OUT + f'boss_colossus_{st}.png', len(fr))
    sv('idle', [C(t=i / 5, bob=(0, 0, 1, 1, 0)[i], fire=(1, 2, 1, 2, 1)[i], hammer=(1.0 + (0, 0.03, 0.06, 0.03, 0)[i], 40), eyes=0 if i == 4 else 1)
                for i in range(5)])
    # attack: the hammer arm rises high over the helm and crashes down in front of it
    sv('attack', [C(t=0.0, hammer=(-0.6, 38), eyes=2, lean=-2, fire=2),
                  C(t=0.1, hammer=(-1.6, 29), eyes=2, lean=-3, bob=-2, fire=2),
                  C(t=0.2, hammer=(-2.1, 29), eyes=2, lean=-3, bob=-3, fire=2, chimney_fire=1),
                  C(t=0.3, hammer=(0.75, 46), eyes=2, lean=3, bob=3, impact=1, fire=2),
                  C(t=0.4, hammer=(0.8, 46), eyes=2, lean=3, bob=3, impact=2),
                  C(t=0.5, hammer=(1.0, 42), lean=1)])
    # cast: the furnace door swings open, the chimneys roar and gouts of molten metal are spat out
    sv('cast', [C(t=i / 6, door=(0.2, 0.6, 1, 1, 1, 0.3)[i], fire=(1, 2, 3, 3, 3, 2)[i], eyes=2, chimney_fire=(0, 1, 2, 2, 1, 0)[i],
                  blast=(0, 0, 1, 2, 3, 0)[i], smoke=3, lean=(0, -1, 1, 2, 1, 0)[i], hammer=(0.9, 40)) for i in range(6)])
    sv('hurt', [C(t=0.1, dx=-4, eyes=2, fl=(255, 255, 255), fire=3, cracks=2), C(t=0.2, dx=-2, eyes=2, fire=2), C(t=0.3, dx=-1)])
    d = [C(eyes=2, fire=3, cracks=3, chimney_fire=2, door=1, smoke=3), C(eyes=2, fire=3, cracks=6, door=1, blast=2, chimney_fire=2, lean=-2),
         on(C(eyes=0, fire=3, cracks=9, door=1, sink=10, hammer=(1.4, 38), farm=(1.6, 28)), explosion(BS, 56, 52, 22, 0.2, 11)),
         on(C(eyes=0, fire=1, cracks=9, door=1, sink=30, hammer=(1.5, 38), farm=(1.6, 28), smoke=0), explosion(BS, 54, 70, 26, 0.6, 12))]
    d += [colossus_fallen(0), colossus_fallen(1), colossus_fallen(2)]
    sv('death', d)


# ================================================================== PROPS
def lectern(k):
    """A carved mahogany reading desk with an open book: 0 = unread (the runes glow gold, motes of light rise),
    1 = read (the glow gone, plain ink lines, a ribbon laid in)."""
    p = Pic(34, 46)
    p.r(9, 41, 25, 45, WD1); p.l(9, 41, 25, 41, WD3); p.r(7, 44, 27, 45, WD0)             # foot
    p.r(14, 22, 20, 41, WD2); p.l(14, 22, 14, 41, WD4); p.l(20, 22, 20, 41, WD0)          # column with carved rings
    for y in (26, 33, 38):
        p.r(13, y, 21, y + 1, WD3); p.l(13, y + 1, 21, y + 1, WD1)
    p.poly([(3, 20), (31, 14), (32, 18), (4, 24)], WD2)                                    # the slanted desk top
    p.l(3, 20, 31, 14, WD4); p.l(4, 24, 32, 18, WD0)
    p.poly([(4, 24), (32, 18), (30, 22), (6, 27)], WD1)
    p.p(17, 23, AU2)
    q = Pic(34, 46)                                                       # the book, lying on the slope
    open_book(q, 17, 11, 22, 9, 1 if k == 0 else 0, seed=5)
    bk = q.im.transform(q.im.size, Image.AFFINE, (1, 0, 0, 0.21, 1, -3.6), resample=Image.NEAREST)
    p.paste(bk, 0, 0)
    if k == 1:
        p.lines([(17, 10), (18, 18), (17, 24)], (176, 36, 40))
    im = outline(cut_below(p.im, 45))
    if k == 0:
        r = Pic(im.width, im.height)
        sparkles(r, 9, 7, (6, 0, 30, 10), (RN1, RN2, RN3))
        halo(r, 18, 9, 14, (RN1, RN2), 9, 3)
        im = on(r.im, im)
    return im


def chandelier(k):
    """A tall brass candelabrum: tripod foot, a knobbed stem, five arms in a fan each holding a candle; k = 0..2 flicker."""
    p = Pic(40, 64)
    cx = 20
    for sd in (-1, 0, 1):                                                 # tripod foot
        p.l(cx, 56, cx + sd * 9, 62, BR1, 2); p.e(cx + sd * 9 - 2, 60, cx + sd * 9 + 2, 63, BR2)
    p.e(cx - 4, 53, cx + 4, 58, BR2); p.arc(cx - 4, 53, cx + 4, 58, 180, 270, BR4)
    p.r(cx - 1, 24, cx + 1, 54, BR2); p.l(cx - 1, 24, cx - 1, 54, BR4)
    for y in (32, 44):                                                    # knobs
        p.e(cx - 3, y - 2, cx + 3, y + 2, BR2); p.p(cx - 1, y - 1, BR4)
    p.e(cx - 4, 22, cx + 4, 27, BR1); p.l(cx - 3, 23, cx + 2, 23, BR3)
    arms = [(-15, 14), (-8, 10), (0, 8), (8, 10), (15, 14)]
    for (ox, top) in arms:                                                # curved arms and drip cups
        if ox:
            p.lines([(cx, 25), (cx + ox * 0.5, 27), (cx + ox, 22), (cx + ox, top + 6)], BR1, 2)
            p.lines([(cx, 24), (cx + ox * 0.5, 26), (cx + ox, 21)], BR3)
        p.e(cx + ox - 3, top + 5, cx + ox + 3, top + 8, BR2); p.l(cx + ox - 2, top + 5, cx + ox + 2, top + 5, BR4)
    for i, (ox, top) in enumerate(arms):
        candle(p, cx + ox, top + 5, 6 - abs(ox) // 8, 1, k=(k + i) % 3, w=1.2)
    im = outline(cut_below(p.im, 63))
    r = Pic(im.width, im.height)
    for i, (ox, top) in enumerate(arms):
        halo(r, cx + ox + 1, top - 3, 5 + (k + i) % 2, (F2, F3), 6, i + k)
    sparkles(r, 3, 20 + k, (2, 0, 38, 12), (F2, F3, WHITE))
    return on(r.im, im)


def press(k):
    """A stamping press: two riveted iron columns, a crossbeam with a steam cylinder, the ram (k = 0 up, 1 on its way,
    2 slammed down with sparks) over an iron bed with a glowing ingot."""
    p = Pic(44, 64)
    for x in (4, 35):                                                     # the columns
        p.r(x, 6, x + 5, 58, FE2); p.l(x, 6, x, 58, FE4); p.l(x + 5, 6, x + 5, 58, FE0)
        for y in range(10, 58, 8):
            p.p(x + 2, y, FE4)
    p.r(1, 2, 42, 9, FE1); p.l(1, 2, 42, 2, FE4); p.l(1, 9, 42, 9, FE0)     # crossbeam
    p.r(15, 0, 28, 3, BR1); p.l(15, 0, 28, 0, BR3)                         # steam cylinder on top
    for x in range(5, 42, 6):
        p.p(x, 5, FE4)
    p.r(2, 52, 41, 58, FE1); p.l(2, 52, 41, 52, FE3); p.r(0, 58, 43, 63, FE0); p.l(0, 58, 43, 58, FE2)   # the bed
    p.r(15, 48, 28, 52, MO2); p.l(15, 48, 28, 48, MO4); p.l(15, 51, 28, 51, MO1)  # glowing ingot / plate on the bed
    ry = (12, 28, 40)[k]                                                  # the ram
    p.r(19, 9, 24, ry, M1); p.l(19, 9, 19, ry, M3); p.l(24, 9, 24, ry, M0)  # bright piston rod
    p.r(9, ry, 34, ry + 9, FE2); p.l(9, ry, 34, ry, FE4); p.l(9, ry + 9, 34, ry + 9, FE0); p.l(9, ry, 9, ry + 9, FE3)
    p.r(9, ry + 7, 34, ry + 9, (220, 168, 40)); p.ps([(x, ry + 8) for x in range(10, 34, 4)], OUT)   # hazard stripe
    for x in (12, 31):
        p.p(x, ry + 3, FE4)
    if k == 2:
        p.r(15, 48, 28, 49, MO3)
    im = outline(cut_below(p.im, 63))
    r = Pic(im.width, im.height)
    if k == 1:
        for x in (6, 38):
            r.l(x + 1, 14, x + 1, 22, ST2)                                  # motion lines
    if k == 2:
        molten_drops(r, 12, 33, (3, 40, 42, 51))
        steam_puff(r, 18, 4, 3); steam_puff(r, 26, 2, 2.5)
    return on(im, r.im)


def anvil2():
    """The foundry's casting anvil: a heavy horned iron anvil on a riveted block, a glowing ingot on its face, tongs."""
    p = Pic(40, 30)
    p.r(10, 18, 30, 29, FE1); p.l(10, 18, 30, 18, FE3); p.l(10, 18, 10, 29, FE2)         # block
    for x in (13, 27):
        p.p(x, 21, FE4); p.p(x, 26, FE4)
    p.poly([(12, 18), (28, 18), (25, 13), (15, 13)], FE2)                                  # waist
    p.poly([(2, 7), (8, 6), (34, 6), (36, 12), (8, 12), (5, 10)], FE2)                     # face and horn
    p.l(8, 6, 34, 6, FE4); p.l(2, 7, 8, 6, FE3); p.l(5, 10, 8, 12, FE0); p.l(8, 12, 36, 12, FE0)
    p.poly([(2, 7), (-1, 8), (2, 9)], FE2)
    p.r(14, 3, 26, 5, MO2); p.l(14, 3, 26, 3, MO4); p.l(14, 5, 26, 5, MO1)                 # the ingot
    p.lines([(26, 4), (33, 1), (38, 1)], FE3, 2); p.lines([(26, 5), (34, 4), (39, 4)], FE2, 2)   # tongs
    im = outline(cut_below(p.im, 29))
    r = Pic(im.width, im.height)
    molten_drops(r, 4, 8, (12, 0, 30, 4), (MO3, MO4, WHITE))
    return on(im, r.im)


def steamjet(k):
    """A jet of scalding steam blasting up out of a vent: 0 = the first hiss, 1 = rising, 2 = full plume, 3 = falling
    away (outlined, binary alpha)."""
    p = Pic(36, 64)
    cx, base = 18, 62
    hgt = (14, 40, 58, 50)[k]
    r2 = random.Random(k + 5)
    n = int(hgt / 6) + 2
    for i in range(n):
        t = i / max(1, n - 1)
        y = base - t * hgt
        w = 2 + t * (9 if k < 3 else 11)
        x = cx + math.sin(t * 5 + k) * t * 3
        if k == 3 and t < 0.3:
            continue
        steam_puff(p, x + r2.uniform(-w * 0.4, w * 0.4), y, max(1.6, w * 0.6), 0 if t < 0.6 else 1)
    im = outline_same(cut_below(p.im, 63))
    r = Pic(36, 64)
    for _ in range(4 + k * 2):
        r.p(cx + r2.uniform(-12, 12), base - r2.uniform(4, hgt), WHITE)
    return on(im, r.im)


def inkblot(k):
    """A splash of ink on the floor: a glossy pool with splatter drops round it; k = 1 adds a fresh ripple."""
    p = Pic(34, 12)
    ink_puddle(p, 17, 7, 24, 3, seed=6)
    for (x, y, r) in ((3, 8, 1.2), (30, 7, 1.5), (8, 4, 1), (27, 3, 1), (33, 9, 0.8)):
        p.e(x - r, y - r * 0.6, x + r, y + r * 0.6, IK1)
    if k == 1:
        p.arc(10, 4, 24, 9, 180, 360, IK3)
        p.p(19, 5, IK4)
    return outline(cut_below(p.im, 11))


@builder('props')
def make_props():
    save_prop('lectern', [lectern(k) for k in range(2)])
    save_prop('chandelier', [chandelier(k) for k in range(3)])
    save_prop('press', [press(k) for k in range(3)])
    save_prop('anvil2', [anvil2()])                                        # prop_anvil.png is the smithy (version 3)
    save_prop('steamjet', [steamjet(k) for k in range(4)])
    save_prop('inkblot', [inkblot(k) for k in range(2)])


# ================================================================== ITEMS, PARTICLES, HUD ICONS
@builder('items')
def make_items():
    p = Pic(14, 20)                                                       # ink flask: a squat glass bottle of ink
    p.e(1, 7, 12, 19, (150, 170, 196))
    p.e(2, 9, 11, 18, IK1); p.e(2, 9, 8, 14, IK2)
    p.l(3, 10, 4, 9, IK4)
    p.r(4, 3, 9, 7, (150, 170, 196)); p.r(5, 4, 8, 7, IK1)
    p.r(4, 0, 9, 3, (150, 104, 60)); p.l(4, 0, 9, 0, (196, 150, 96))       # cork
    p.r(3, 12, 10, 15, PA2); p.l(3, 12, 10, 12, PA3); p.l(4, 13, 9, 13, IK2); p.l(4, 14, 7, 14, IK2)   # label
    p.p(2, 11, WHITE)
    save(hard(outline_same(cut_below(p.im, 19))), G_OUT + 'item_inkflask.png')
    # the runebook's pickup: a closed grimoire with a glowing gold rune on its cover (drawn, not from the side view)
    p = Pic(24, 20)
    p.poly([(2, 4), (19, 2), (22, 15), (5, 18)], GR_LEATHER[0])
    p.poly([(2, 3), (19, 1), (21, 14), (4, 17)], GR_LEATHER[1])
    p.poly([(4, 17), (21, 14), (22, 16), (5, 19)], PA2); p.l(5, 18, 22, 15, PA0)
    p.l(2, 3, 19, 1, GR_LEATHER[3]); p.l(2, 3, 4, 17, GR_LEATHER[2])
    for (x, y) in ((2, 3), (18, 1), (20, 13), (4, 16)):
        p.r(x, y, x + 1, y + 1, AU2)
    p.e(7, 5, 16, 14, RN0); p.e(8, 6, 15, 13, (64, 30, 10))
    p.l(11.5, 7, 11.5, 13, RN3); p.l(11.5, 9, 14, 7, RN3); p.l(11.5, 11, 9, 9, RN2)   # the rune: a stave with two twigs
    im = outline_same(p.im)
    q = Pic(24, 20)
    q.p(1, 0, RN3); q.p(22, 3, RN2); q.p(23, 9, RN1)
    save(hard(on(im, q.im)), G_OUT + 'pick_runebook.png')


@builder('particles')
def make_particles():
    fr = []                                                              # a fluttering page (2 frames 8x8)
    for k in range(2):
        p = Pic(8, 8)
        if k == 0:
            p.poly([(0, 2), (6, 0), (7, 5), (1, 7)], PA2); p.l(0, 2, 6, 0, PA3); p.l(2, 3, 5, 2, PA0); p.l(2, 5, 5, 4, PA0)
        else:
            p.poly([(1, 3), (7, 2), (6, 5), (0, 6)], PA1); p.l(1, 3, 7, 2, PA3); p.l(2, 4, 5, 4, PA0)
        fr.append(outline_same(p.im))
    save(cells(fr, 8, 8), G_OUT + 'part_page.png', 2)
    fr = []                                                              # an ink drop (2 frames 6x6)
    for k in range(2):
        p = Pic(6, 6)
        if k == 0:
            p.e(1, 1, 4, 5, IK1); p.p(2, 0, IK1); p.p(2, 2, IK4)
        else:
            p.e(0, 2, 5, 5, IK1); p.p(1, 3, IK3)
        fr.append(outline_same(p.im))
    save(cells(fr, 6, 6), G_OUT + 'part_ink2.png', 2)                     # part_ink.png exists (version 5)
    fr = []                                                              # a steam puff (3 frames 12x12, growing and thinning)
    for k in range(3):
        p = Pic(12, 12)
        steam_puff(p, 6, 6, (2.5, 3.8, 4.6)[k], k)
        if k:
            steam_puff(p, 4, 7, (0, 2.5, 3)[k], k)
        fr.append(outline_same(p.im))
    save(cells(fr, 12, 12), G_OUT + 'part_steam.png', 3)
    fr = []                                                              # a molten spark (additive on black, 2 frames 7x7)
    for k in range(2):
        p = Pic(7, 7)
        p.r(0, 0, 6, 6, (0, 0, 0))
        if k == 0:
            p.l(3, 0, 3, 6, (120, 40, 10)); p.l(0, 3, 6, 3, (120, 40, 10))
            p.l(3, 1, 3, 5, MO2); p.l(1, 3, 5, 3, MO2); p.p(3, 3, MO4)
        else:
            p.ps([(1, 1), (5, 5), (1, 5), (5, 1)], (110, 36, 10)); p.ps([(2, 2), (4, 4), (2, 4), (4, 2)], MO2)
            p.p(3, 3, MO4); p.ps([(3, 2), (3, 4), (2, 3), (4, 3)], MO3)
        fr.append(p.im)
    save(cells(fr, 7, 7), G_OUT + 'part_ember2.png', 2, additive=True)
    drop = ["...#....", "...##...", "..####..", ".######.", ".######.", ".####.#.", "..####..", "........"]  # HUD: ink ammo
    p = Pic(8, 8)
    p.bitmap(0, 0, drop, {'#': WHITE})
    save(p.im, G_OUT + 'icon_ink.png')


@builder('icons')
def make_icons():
    def book(d, k):     # an open book seen from the front, a rune glowing on the right page
        S = lambda *v: [x * k for x in v]
        d.polygon(S(6, 24, 46, 32, 90, 24, 90, 76, 46, 84, 6, 76), fill=255)
        d.polygon(S(13, 31, 43, 38, 43, 74, 13, 68), fill=0)
        d.polygon(S(83, 31, 53, 38, 53, 74, 83, 68), fill=0)
        for y in (42, 50, 58):
            d.line(S(18, y, 38, y + 4), fill=255, width=3 * k)
        d.line(S(68, 42, 68, 66), fill=255, width=4 * k)
        d.line(S(68, 50, 76, 44), fill=255, width=4 * k)
        d.line(S(68, 58, 60, 52), fill=255, width=4 * k)
    save(P3.icon(book), T_OUT + 'icon_book.png')


# @@SECTIONS@@


# ================================================================== CONTACT SHEET
NEW_WEAPONS = ('runebook', 'steamcannon')


def make_sheet():
    man = {}
    if os.path.exists(MANIFEST):
        man = json.load(open(MANIFEST))
    for k, v in SAVED.items():
        man[k] = v
    try:   # the first-person weapons and pickups come from tools/weapon-frames (render-static.mjs + pack.py)
        wf = json.loads(re.search(r'= (\{.*\});', open('retrofps/js/weapons.js').read()).group(1))
        for w in NEW_WEAPONS:
            if w in wf:
                man[G_OUT + f'fp_{w}.png'] = (sum(len(v) for v in wf[w]['states'].values()), False)
                man[G_OUT + f'pick_{w}.png'] = (1, False)
    except (OSError, AttributeError):
        pass
    os.makedirs(SCR, exist_ok=True)
    json.dump(man, open(MANIFEST, 'w'), indent=0)
    font = ImageFont.load_default()

    def order(kv):
        p = kv[0]
        g = 0 if '/wall/' in p else 1 if 'enemies' in p or 'boss' in p else 4 if 'fp_' in p else 2
        return (g, p)
    items = []
    for path, (n, add) in sorted(man.items(), key=order):
        if not os.path.exists(path):
            continue
        im = Image.open(path).convert('RGBA')
        name = os.path.basename(path)
        total = n
        if im.width > 1780 and n > 1:      # very long strips wrap onto several rows
            fw_ = im.width // n
            per = max(1, 1780 // fw_)
            rows = (n + per - 1) // per
            w2 = Image.new('RGBA', (fw_ * per, im.height * rows), (0, 0, 0, 0))
            for i in range(n):
                w2.paste(im.crop((i * fw_, 0, (i + 1) * fw_, im.height)), ((i % per) * fw_, (i // per) * im.height))
            im = w2
            n = per
        if path.startswith(T_OUT) or name.startswith('fp_'):
            sc = 1
        elif name.startswith(('enemies', 'boss')) or path.startswith(W_OUT):
            sc = 2 if im.height > 32 or path.startswith(W_OUT) else 3
        else:
            sc = 4
        while im.width * sc > 1780 and sc > 1:
            sc -= 1
        items.append((path, n, add, im, sc, total))
    W = 1800
    x, y, rowh = 8, 8, 0
    places = []
    for path, n, add, im, sc, total in items:
        w, h = im.width * sc, im.height * sc
        lw = len(os.path.basename(path)) * 6 + 70
        cw = max(w, lw)
        if x + cw > W - 8:
            x, y, rowh = 8, y + rowh + 22, 0
        places.append((path, n, add, im, sc, x, y + 14, total))
        x += cw + 14
        rowh = max(rowh, h + 14)
    H = y + rowh + 12
    c = Image.new('RGBA', (W, H), (104, 104, 104, 255))
    d = ImageDraw.Draw(c)
    for path, n, add, im, sc, x, y, total in places:
        fw = im.width // n
        fh = im.height if total == n else im.height // ((total + n - 1) // n)
        lab = f'{os.path.basename(path)[:-4]} {total}f {fw}x{fh}' + (' additive' if add else '')
        d.text((x, y - 13), lab, fill=(255, 255, 255, 255), font=font)
        big = im.resize((im.width * sc, im.height * sc), Image.NEAREST)
        if add:
            c.paste((0, 0, 0, 255), (x, y, x + big.width, y + big.height))
        elif path.startswith(T_OUT):
            c.paste((40, 44, 56, 255), (x, y, x + big.width, y + big.height))
        else:
            for i in range(n):
                c.paste((92, 92, 92, 255), (x + i * fw * sc, y, x + (i + 1) * fw * sc - (2 if n > 1 else 0), y + big.height))
        c.alpha_composite(big, (x, y))
    c.convert('RGB').save(SHEET)
    print('sheet', SHEET, c.size)


def check_outputs():
    """Style rules: every pixel fully opaque or fully transparent (opaque strips: additive on black / textures),
    strips divide evenly into their frames."""
    bad = []
    for path, (n, add) in SAVED.items():
        im = Image.open(path).convert('RGBA')
        a = np.array(im)[:, :, 3]
        if not np.isin(a, (0, 255)).all():
            bad.append(path)
        if im.width % n:
            print('UNEVEN STRIP:', path, im.size, n)
    if bad:
        print('PARTIAL ALPHA:', bad)


if __name__ == '__main__':
    want = sys.argv[1:]
    for name, fn in BUILDERS.items():
        if not want or name in want:
            fn()
    check_outputs()
    make_sheet()
    print('klart')
