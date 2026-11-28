#!/usr/bin/env python3
"""Version 15 graphics for Krypta ("Katedralen och Bikupan"): the blood cathedral and the hive, six new enemies, the
cardinal and the queen bee, textures, props, items, particles, HUD and touch icons.

Run from the folder that holds retrofps/ and assets/ (e.g. /home/user/test):
    python3 retrofps/tools/props12/make.py [name ...]
(with names only those builders run, e.g. `python3 retrofps/tools/props12/make.py cherub sheet`; the contact sheet
always shows everything this script has written so far, plus the two new first-person weapons)

The first-person weapons censer / hivelauncher (fp_*.png, js/weapons.js) come from tools/weapon-frames (render-static.mjs
+ pack.py, see the README there, version 15); their static-defs.json entries are built by tools/props12/fp_defs.py.

Out to retrofps/assets/gfx:
  enemies-{choirboy,flagellant,stingerknight}_{idle,movement,attack,take_damage,death}.png (64x64 cells, feet row 57)
  enemies-cherub_{...}.png (48x48 cells, feet row 42)
  enemies-{workerbee,larva}_{...}.png (32x32 cells, feet row 28)
      facing right; the fliers (cherub, workerbee, stingerknight) are drawn low in the cell (the game lifts `float`
      enemies itself) and their deaths end on the floor; every death ends lying / settled.
      Frames: idle 4, movement 6, attack 6 (workerbee and larva 5), take_damage 3, death 6.
  boss_cardinal_{idle,attack,cast,hurt,death}.png, boss_queenbee_{idle,attack,cast,hurt,death}.png (116x116 cells;
      idle 5, attack 6, cast 6, hurt 3, death 7). The cardinal's attack is the 'ring' (the censer whirled round on its
      chain, a ring of smoke), cast the 'light' (censer raised, red rays, blood rain); the queen's attack is the dash
      (rears back, lunges with the sting curled forwards), cast the honey / swarm (her abdomen pulses, honey globs,
      workers swarm out).
  prop_pew.png (1), prop_bloodfont.png (2: full / smashed), prop_bell.png (2: still / swinging),
  prop_larvasac.png (2: whole / burst - the game shows frame 1 both when it hatches and when it is shot)
  item_beehive.png (the bees' ammo: a straw skep), pick_censer.png, pick_hivelauncher.png (drawn here, not from the side
  views), part_note2.png (2, 8x8), part_honey.png (2, 6x6), part_smoke3.png (3, 12x12),
  icon_bless.png, icon_honey.png (8x8, white)
Out to retrofps/assets/wall:
  wall_cathedral, wall_stainedglass, wall_boss_cardinal, wall_wax, wall_honeycomb, wall_boss_queenbee (64x128)
  floor_cathedral, floor_lightbeam, floor_boss_cardinal, floor_hivefloor, floor_honey, floor_boss_queenbee (64x64)
Out to retrofps/assets/touch: icon_bell.png (96x96, white on transparent)
Contact sheet: <scratchpad>/en/v15_sheet.png

Sources (licences checked; everything not listed is drawn procedurally below in the outlined style of
tools/props2-props10, whose helpers are reused):
  * Classic 64 Asset Pack 0.6 (Craig Snedeker, CC0): Rocks/rock_wall_2 (the grain of the cathedral stone)
  (32rogues, Super Retro World and Mana Seed are NOT used: their licences forbid AI use / redistribution.)
Drawn: all six enemies, both bosses, every other texture, all props, items, particles and icons.
Name clashes (existing files are never overwritten, save() refuses): part_note.png already exists (version 8), so the
golden note is part_note2.png; part_smoke.png and part_smoke2.png exist, so the incense smoke is part_smoke3.png.
Notes: wall_cathedral and wall_stainedglass share the ashlar courses, and all three cathedral walls end in the same half
pilasters (64x128 scale: shaft 6 px either side of the seam, capital rows 16-22, base rows 116-124), so they stand side by
side; wall_boss_queenbee ends in half wax pillars. floor_lightbeam is floor_cathedral (same array) with a
window's coloured light lying across it, fading out before the edges; floor_honey tiles with itself. The stained glass is
bright and saturated so that it reads as lit. Suggested sizes (skeleton = 1.0; apparent height = size x figure px / cell
px): choirboy 0.85 (46 px of 64), flagellant 1.05 (49 px to the hood's tip), cherub 0.65 (32 px of 48 with the wings),
workerbee 0.5 (23 px of 32, 30 long), stingerknight 1.2 (50 px of 64), larva 0.65 (13 px tall, 27 long of 32); bosses
(116 px cells, the pharaoh is 114 px at 3.8, the librarian 116 px at 4.2): cardinal 4.0 (113 px with the mitre),
queenbee 4.2 (99 px, 89 px wide).
"""
import importlib.util
import json
import math
import os
import random
import re
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.dont_write_bytecode = True          # the helper modules of props2-props10 are loaded without touching their __pycache__


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
P10 = _load('props10make', 'props10')
from_p2 = 'OUT Pic outline outline_same hard shift gmap tile_lum blend mask_draw glow tint shear squash strip'.split()
globals().update({k: getattr(P2, k) for k in from_p2})
cut_below = P4.cut_below
pnoise, up2, spark = P5.pnoise, P5.up2, P5.spark
dark, flash, tube, bez = P6.dark, P6.flash, P6.tube, P6.bez
puff, wrap_outline = P7.puff, P7.wrap_outline
chain, sparkles = P8.chain, P8.sparkles
paste_wrap = P9.paste_wrap
flame, candle, halo, tone, put = P10.flame, P10.candle, P10.halo, P10.tone, P10.put
I0, I1, I2, I3 = P2.I0, P2.I1, P2.I2, P2.I3
F0, F1, F2, F3 = P2.F0, P2.F1, P2.F2, P2.F3
G0, G1, G2, G3 = P2.G0, P2.G1, P2.G2, P2.G3                                    # acid green
AU0, AU1, AU2, AU3, AU4 = P5.AU0, P5.AU1, P5.AU2, P5.AU3, P5.AU4                # gold
BR0, BR1, BR2, BR3, BR4 = P7.BR0, P7.BR1, P7.BR2, P7.BR3, P7.BR4                # brass
WAX0, WAX1, WAX2 = P10.WAX0, P10.WAX1, P10.WAX2                                 # candle wax
WD0, WD1, WD2, WD3, WD4 = P10.WD0, P10.WD1, P10.WD2, P10.WD3, P10.WD4           # dark wood
WD_STOPS = P10.WD_STOPS

A = 'assets/'
C64 = A + 'textures/Classic 64 Asset Pack 0.6/- Classic 64 Asset Pack 0.6/'
G_OUT, W_OUT, T_OUT = 'retrofps/assets/gfx/', 'retrofps/assets/wall/', 'retrofps/assets/touch/'
SCR = '/tmp/claude-0/-home-user/80ee56ba-2fa6-5354-b261-a4ca4fdcb508/scratchpad/en/'
SHEET, MANIFEST = SCR + 'v15_sheet.png', SCR + 'v15_manifest.json'
WHITE = (255, 255, 255)

# ---------------------------------------------------------------- cathedral palettes
CS0, CS1, CS2, CS3, CS4 = (20, 16, 24), (36, 30, 42), (56, 48, 62), (82, 72, 88), (114, 104, 118)    # dark cathedral stone
CS_STOPS = [(0, CS0), (0.3, CS1), (0.6, CS2), (0.85, CS3), (1, CS4)]
BL0, BL1, BL2, BL3 = (72, 6, 12), (128, 14, 22), (184, 32, 34), (230, 84, 70)                  # blood
RD0, RD1, RD2, RD3, RD4 = (58, 8, 16), (104, 14, 26), (152, 26, 36), (200, 50, 50), (236, 104, 88)   # cardinal scarlet
LW0, LW1, LW2, LW3 = (138, 134, 150), (188, 186, 200), (224, 224, 234), (250, 250, 255)       # white linen / lace
SKN = ((112, 64, 58), (176, 116, 96), (222, 164, 134), (246, 206, 176))                        # skin
PALE = ((110, 96, 104), (168, 152, 156), (210, 196, 194), (238, 228, 224))                     # the cardinal's grey skin
GL_R = ((120, 10, 24), (206, 30, 40), (255, 92, 76), (255, 196, 170))                          # stained glass: red
GL_B = ((20, 34, 120), (40, 84, 214), (100, 160, 255), (196, 228, 255))                        # blue
GL_Y = ((150, 96, 10), (240, 180, 30), (255, 230, 110), (255, 250, 210))                       # yellow
GL_G = ((20, 90, 40), (50, 160, 70), (130, 220, 120), (220, 255, 200))                         # green (accents)
LEAD = (26, 22, 30)
OAK = ((40, 22, 14), (70, 42, 24), (104, 66, 36), (140, 96, 54), (176, 130, 76))               # oak pews / bell frame
BZ0, BZ1, BZ2, BZ3, BZ4 = (52, 34, 18), (100, 66, 30), (152, 104, 42), (204, 156, 70), (244, 214, 140)   # bell bronze
SMK = ((118, 112, 138), (168, 164, 188), (206, 204, 224), (236, 236, 248))                       # incense smoke
SACK = ((62, 48, 32), (100, 80, 52), (138, 114, 76), (176, 152, 106))                          # sackcloth
# ---------------------------------------------------------------- hive palettes
WX0, WX1, WX2, WX3, WX4 = (110, 70, 16), (168, 114, 30), (212, 160, 54), (240, 202, 104), (255, 236, 178)   # beeswax
WX_STOPS = [(0, WX0), (0.3, WX1), (0.6, WX2), (0.85, WX3), (1, WX4)]
HN0, HN1, HN2, HN3, HN4 = (96, 40, 4), (160, 80, 8), (218, 132, 16), (250, 190, 52), (255, 238, 160)        # honey
HN_STOPS = [(0, HN0), (0.35, HN1), (0.65, HN2), (0.88, HN3), (1, HN4)]
BY0, BY1, BY2, BY3 = (150, 96, 8), (232, 176, 30), (255, 220, 90), (255, 246, 180)            # bee yellow
BK0, BK1, BK2, BK3 = (16, 12, 14), (38, 30, 30), (64, 54, 50), (96, 84, 76)                   # bee black
WG0, WG1, WG2, WG3 = (112, 136, 160), (170, 196, 218), (214, 234, 246), (246, 252, 255)       # wings
CH0, CH1, CH2, CH3, CH4 = (34, 20, 10), (74, 42, 14), (126, 78, 20), (182, 126, 36), (230, 182, 80)   # chitin armour
LV0, LV1, LV2, LV3 = (150, 136, 92), (204, 192, 136), (234, 228, 184), (252, 250, 228)        # larva
RJ0, RJ1, RJ2 = (200, 186, 150), (236, 228, 200), (255, 252, 236)                             # royal jelly

SAVED = {}


def _manifest():
    return json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}


def save(im, path, n=1, additive=False):
    """Writes a strip; never overwrites a file this script did not write itself (listed in its manifest)."""
    man = _manifest()
    assert not os.path.exists(path) or path in man, ('name clash, would overwrite', path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path)
    SAVED[path] = (n, additive)
    man[path] = (n, additive)
    os.makedirs(SCR, exist_ok=True)
    json.dump(man, open(MANIFEST, 'w'), indent=0)
    return im


def save_enemy(sheet, state, frames, fw, floor=None):
    """fw x fw cells, nothing below the feet row (57 / 42 / 28 for 64 / 48 / 32 cells), hard alpha."""
    floor = floor if floor is not None else {64: 57, 48: 42, 32: 28}[fw]
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


def finish(rgb, name, colors=48, half=True):
    """RGB array -> (nearest x2 upscale of a half-res texture) -> palettized, through the guarded save()."""
    im = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), 'RGB')
    if half:
        im = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
    save(im.quantize(colors, method=Image.Quantize.MEDIANCUT).convert('RGB'), W_OUT + name)


BUILDERS = {}


def builder(name):
    def deco(fn):
        BUILDERS[name] = fn
        return fn
    return deco


# ================================================================== shared drawing helpers
def note_glyph(p, x, y, k, c, hi=None):
    """A little musical note with its head's top-left at (x, y): k 0 = quaver, 1 = two beamed quavers."""
    if k % 2 == 0:
        p.e(x, y, x + 2, y + 1.6, c); p.l(x + 2, y - 4, x + 2, y + 1, c); p.l(x + 2, y - 4, x + 4, y - 2, c)
    else:
        p.e(x, y, x + 2, y + 1.6, c); p.e(x + 4, y - 1, x + 6, y + 0.6, c)
        p.l(x + 2, y - 4, x + 2, y + 1, c); p.l(x + 6, y - 5, x + 6, y, c); p.l(x + 2, y - 4, x + 6, y - 5, c)
    if hi:
        p.p(x + 0.5, y + 0.3, hi)


def notes_layer(size, pts, pal=(AU3, AU4)):
    """Outlined golden notes at pts [(x, y, k)]."""
    q = Pic(size, size)
    for i, (x, y, k) in enumerate(pts):
        note_glyph(q, x, y, k, pal[0], pal[1])
    return outline_same(q.im)


def smoke_wisp(p, x, y, n, seed, k=0.0, pal=SMK, spread=1.0):
    """Incense smoke: a column of small puffs curling up from (x, y), n puffs; k (0..1) thins and spreads it."""
    r2 = random.Random(seed)
    for i in range(n):
        t = i / max(1, n - 1)
        px = x + math.sin(t * 5 + seed) * (2 + t * 4) * spread + r2.uniform(-1, 1)
        py = y - i * 3.2 * (1 + k * 0.3)
        r = max(1.0, 0.9 + t * 1.3 + k * 0.6)
        puff(p, px, py, r, pal if t < 0.6 else (dark(pal[0], 0.9), pal[0], pal[1], pal[2]))


def blood_drops(p, n, seed, box, pal=(BL1, BL2, BL3)):
    r2 = random.Random(seed)
    x0, y0, x1, y1 = box
    for _ in range(n):
        x, y = r2.uniform(x0, x1), r2.uniform(y0, y1)
        if r2.random() < 0.4:
            p.e(x - 1, y - 1, x + 1, y + 1.5, pal[0]); p.p(x, y, pal[2])
        else:
            p.p(x, y, r2.choice(pal))


def pool(p, cx, base, w, h, pal, seed=0):
    """A flat puddle on the floor row `base`: dark rim, body, a glossy streak."""
    r2 = random.Random(seed)
    p.e(cx - w / 2, base - h, cx + w / 2, base, pal[0])
    p.e(cx - w / 2 + 1, base - h + 0.5, cx + w / 2 - 1, base - 0.6, pal[1])
    for _ in range(3):
        x = cx + r2.uniform(-w * 0.45, w * 0.45)
        p.e(x - 2.5, base - h * 0.6, x + 2.5, base + 0.4, pal[1])
    p.l(cx - w * 0.25, base - h + 1, cx + w * 0.05, base - h + 1, pal[2])


def bee_wing(p, x, y, ang, ln, wd, pal=(WG0, WG1, WG2, WG3), veins=True):
    """A bee wing from its root (x, y) along ang: a long rounded leaf of pale blue membrane with a lit edge and veins."""
    u = (math.cos(ang), math.sin(ang))
    v = (-u[1], u[0])
    P_ = lambda a_, b_: (x + u[0] * a_ + v[0] * b_, y + u[1] * a_ + v[1] * b_)
    pts = [P_(0, -wd * 0.25), P_(ln * 0.35, -wd * 0.55), P_(ln * 0.75, -wd * 0.5), P_(ln, -wd * 0.1), P_(ln * 0.92, wd * 0.3),
           P_(ln * 0.6, wd * 0.45), P_(ln * 0.2, wd * 0.3), P_(0, wd * 0.2)]
    p.poly(pts, pal[1])
    p.poly([P_(ln * 0.1, -wd * 0.2), P_(ln * 0.4, -wd * 0.45), P_(ln * 0.75, -wd * 0.4), P_(ln * 0.6, -wd * 0.05), P_(ln * 0.2, 0)], pal[2])
    p.lines(pts[:5], pal[3])
    if veins and ln >= 6:
        p.l(*P_(0, 0), *P_(ln * 0.8, -wd * 0.15), pal[0])
        p.l(*P_(ln * 0.35, -wd * 0.1), *P_(ln * 0.55, wd * 0.35), pal[0])


def bee_body(p, x, y, ang=0.0, s=1.0, stripes=3, sting=True, curl=0.0, pal_y=(BY0, BY1, BY2, BY3), pal_k=(BK0, BK1, BK2, BK3)):
    """A bee's abdomen from the waist (x, y) backwards along ang + pi (s = scale): a striped yellow-black egg with a light
    top, and a stinger at its tip (curl bends it under / forwards)."""
    L = 11 * s
    a = ang + math.pi
    ca, sa = math.cos(a + curl * 0.5), math.sin(a + curl * 0.5)
    pts = [(x + ca * L * t, y + sa * L * t) for t in np.linspace(0, 1, 7)]
    rad = [r * s for r in (3.0, 4.6, 5.2, 5.0, 4.2, 3.0, 1.6)]
    for (px, py), r in zip(pts, rad):
        p.e(px - r, py - r, px + r, py + r, pal_k[0])
    for (px, py), r in zip(pts, rad):
        p.e(px - r + 0.7, py - r + 0.7, px + r - 0.7, py + r - 0.7, pal_y[1])
    for j in range(stripes):                                                  # black bands across it
        t = 0.28 + j * 0.24
        cx_, cy_ = x + ca * L * t, y + sa * L * t
        r = 5.2 * s * (1 - abs(t - 0.4) * 0.6)
        nx, ny = -sa, ca
        p.l(cx_ - nx * r, cy_ - ny * r, cx_ + nx * r, cy_ + ny * r, pal_k[1], max(1, int(round(2 * s))))
    for (px, py), r in list(zip(pts, rad))[1:5]:                              # light along the top
        p.e(px - r * 0.55, py - r * 0.8, px + r * 0.25, py - r * 0.35, pal_y[2])
    tip = pts[-1]
    if sting:
        ln = 4 * s
        p.l(tip[0], tip[1], tip[0] + math.cos(a + curl) * ln, tip[1] + math.sin(a + curl) * ln, pal_k[2])
    return tip


# ================================================================== TEXTURES (palettized like props5-props10)
def stone_lum(w, h, seed, src='Rocks/Materials/rock_wall_2.png', reps=(1, 2)):
    """Stone grain 0..1: a Classic 64 rock photo (CC0) plus soft tiling noise."""
    lum = tile_lum(C64 + src, (w, h), reps)
    n = pnoise(w, h, seed, ((8, 1.0), (4, 0.5)))
    return np.clip(0.5 + (lum - 0.5) * 0.5 + (n - 0.5) * 0.45, 0, 1)


def ashlar(w, h, rows, seed, off=None):
    """Course lines of an ashlar wall: returns (block id, mortar mask, top edge mask, left edge mask)."""
    yy, xx = np.mgrid[0:h, 0:w]
    r2 = random.Random(seed)
    edges = np.array(rows)
    row = np.searchsorted(edges, yy, side='right') - 1
    bid = np.zeros((h, w), int)
    mortar = np.zeros((h, w), bool)
    top = np.zeros((h, w), bool)
    left = np.zeros((h, w), bool)
    for k in range(len(rows)):
        y0 = rows[k]
        y1 = rows[k + 1] if k + 1 < len(rows) else h + rows[0]
        joints = off[k] if off else sorted(r2.sample(range(2, w - 2), 2))
        m = row == k
        seg = np.searchsorted(np.array(joints), xx, side='right') % len(joints)
        bid[m] = (k * 7 + seg[m] * 3)
        mortar |= m & (yy == y0)
        top |= m & (yy == (y0 + 1) % h)
        for j in joints:
            mortar |= m & (xx == j)
            left |= m & (xx == (j + 1) % w)
    return bid, mortar, top, left


def pilaster(rgb, g, x0, x1, h, cap=(10, 13), base=(56, 60), lit=True):
    """A flat stone pilaster between columns x0..x1 (may wrap): lit left edge, shadowed right edge, a fluted shaft,
    a moulded capital and base."""
    w = rgb.shape[1]
    yy, xx = np.mgrid[0:h, 0:w]
    cols = [(x0 + i) % w for i in range(x1 - x0 + 1)]
    m = np.isin(xx, cols)
    rgb[m] = gmap(g * 0.5 + 0.35, CS_STOPS)[m]
    rgb[m & (xx == cols[0])] = CS4
    rgb[m & (xx == cols[1])] = CS3
    rgb[m & (xx == cols[-1])] = CS0
    rgb[m & (xx == cols[-2])] = CS1
    for c in cols[3:-3:3]:                                                     # flutes
        fl = m & (xx == c) & (yy > cap[1] + 1) & (yy < base[0] - 1)
        rgb[fl] = CS1
    for (y0, y1) in (cap, base):
        band = m & (yy >= y0) & (yy <= y1)
        rgb[band] = gmap(g * 0.4 + 0.45, CS_STOPS)[band]
        rgb[m & (yy == y0)] = CS4
        rgb[m & (yy == y1)] = CS0
    ext = np.isin(xx, [(x0 - 1) % w, (x1 + 1) % w])                          # the capital and base stick out a pixel
    for (y0, y1) in (cap, base):
        e = ext & (yy >= y0) & (yy <= y1)
        rgb[e] = CS2
        rgb[e & (yy == y1)] = CS0
    return m


def pointed(xx, yy, cx, hw, y0, y1, k=1.7):
    """Mask of a pointed (gothic) arch opening: hw half width, apex at y0, bottom at y1."""
    R = hw * k
    spring = y0 + math.sqrt(R * R - (R - hw) ** 2)
    m = (np.abs(xx - cx) <= hw) & (yy >= y0) & (yy <= y1)
    pa = (np.hypot(xx - (cx - hw + R), yy - spring) <= R) & (np.hypot(xx - (cx + hw - R), yy - spring) <= R)
    return m & ((yy >= spring) | pa)


def tex_wall_cathedral():
    """Dark cathedral stone: tall ashlar courses with a faint blood stain, a pointed blind arch between two pilasters
    (a half pilaster at each edge, so tiles side by side meet in a whole one)."""
    w, h = 32, 64
    yy, xx = np.mgrid[0:h, 0:w]
    g = stone_lum(w, h, 701)
    bid, mortar, top, left = ashlar(w, h, [0, 9, 18, 27, 36, 45, 54], 702,
                                    off=[(6, 19), (12, 26), (6, 19), (12, 26), (6, 19), (12, 26), (6, 19)])
    shade = np.array([random.Random(b).uniform(-0.08, 0.08) for b in range(80)])[bid % 80]
    rgb = gmap(np.clip(g * 0.55 + 0.18 + shade, 0, 1), CS_STOPS)
    rgb[top | left] = blend(rgb, top | left, CS4, 0.35)[top | left]
    rgb[mortar] = CS0
    # the pointed blind arch (a recessed niche) in the middle
    cx = 15.5
    arch = pointed(xx, yy, cx, 7, 16, 58)
    rgb[arch] = gmap(g * 0.35 + 0.05, CS_STOPS)[arch]
    edge = wrap_outline(arch) & ~arch
    rgb[edge & (xx < cx)] = CS3
    rgb[edge & (xx >= cx)] = CS1
    rgb[edge & (yy > 58)] = CS3
    rgb[arch & (yy == 59 - 1)] = CS1
    # a dark red stain seeping down from the arch's sill
    n = pnoise(w, h, 703, ((4, 1.0), (2, 0.5)))
    st = (yy > 56) & (yy < 63) & (n > 0.6) & (np.abs(xx - cx) < 7)
    for x0, ln in ((11, 7), (18, 4), (14, 9)):
        st |= (xx == x0) & (yy >= 58) & (yy < 58 + ln)
    rgb[st] = blend(rgb, st, BL0, 0.65)[st]
    pilaster(rgb, g, 29, 34, h, cap=(8, 11), base=(58, 62))
    finish(tone(rgb, 0.98, 2), 'wall_cathedral.png', 40)


def glass_window(rgb, x0, x1, y0, y1, seed, motif='rose', bright=1.0):
    """A lancet window of leaded glass in the box (full res): a pointed arch, lead cames dividing panes of red, blue and
    yellow glass, each pane lit from its middle; motif 'rose' (a quatrefoil roundel over diamond panes) or 'cross'."""
    h, w = rgb.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    cx = (x0 + x1) / 2
    hw = (x1 - x0) / 2
    R = hw * 1.7
    win = pointed(xx, yy, cx, hw, y0, y1)
    r2 = random.Random(seed)
    pal = [GL_R, GL_B, GL_Y, GL_B, GL_R, GL_Y]
    pane = np.full((h, w), -1)
    lead = np.zeros((h, w), bool)
    # diamond lattice
    u, v = (xx - cx) + (yy - y0), (xx - cx) - (yy - y0)
    s = 9.0
    iu, iv = np.floor(u / s), np.floor(v / s)
    pane[win] = ((iu * 3 + iv * 5) % 6).astype(int)[win]
    lead |= win & ((np.mod(u, s) < 1.0) | (np.mod(v, s) < 1.0))
    if motif == 'rose':                                                       # quatrefoil roundel in the arch
        rcy = y0 + R * 0.75
        rr = np.hypot(xx - cx, yy - rcy)
        ring = win & (rr <= hw * 0.9)
        pane[ring] = 2
        a = np.arctan2(yy - rcy, xx - cx)
        lobes = hw * (0.52 + 0.16 * np.abs(np.cos(2 * a)))
        inner = ring & (rr <= lobes)
        pane[inner] = 0
        pane[ring & (rr <= hw * 0.2)] = 2
        lead &= ~ring
        lead |= ring & ((np.abs(rr - hw * 0.9) < 0.8) | (np.abs(rr - lobes) < 0.8) | (np.abs(rr - hw * 0.2) < 0.7))
        for k in range(4):
            aa = k * math.pi / 2 + math.pi / 4
            d_ = np.abs((xx - cx) * math.sin(aa) - (yy - rcy) * math.cos(aa))
            lead |= ring & (d_ < 0.6) & (rr > hw * 0.2) & (((xx - cx) * math.cos(aa) + (yy - rcy) * math.sin(aa)) > 0)
    else:                                                                    # a tall cross of yellow glass on blue
        cross = win & (((np.abs(xx - cx) <= 2.5) & (yy > y0 + R * 0.35) & (yy < y1 - 8)) | ((np.abs(yy - (y0 + R * 0.95)) <= 2.5) & (np.abs(xx - cx) <= hw * 0.7)))
        pane[win] = np.where(((iu + iv) % 2 == 0)[win], 1, 3)
        pane[cross] = 2
        lead |= wrap_outline(cross) & win
    # crossbars (saddle bars) of iron
    for yb in np.arange(y0 + R * 1.25, y1, 14):
        lead |= win & (np.abs(yy - yb) < 0.8)
    for k in range(6):
        m = win & (pane == k)
        col = pal[k]
        dist = glow(m.astype(float), 1.0)
        lum = np.clip(0.25 + dist * 0.5 * bright + (yy - y0) / (y1 - y0) * -0.12, 0, 1)
        rgb[m] = gmap(lum, [(0, col[0]), (0.45, col[1]), (0.8, col[2]), (1, col[3])])[m]
    sp = np.zeros((h, w), bool)                                              # bright specks: light glinting through
    for _ in range(int((x1 - x0) * (y1 - y0) / 40)):
        x, y = r2.randint(x0, x1), r2.randint(y0, y1)
        sp[y % h, x % w] = True
    sp &= win & ~lead
    rgb[sp] = (255, 252, 236)
    rgb[lead] = LEAD
    frame = wrap_outline(win)
    rgb[frame] = CS0
    return win, frame


def tex_wall_stainedglass():
    """A tall lancet window of leaded glass glowing red, blue and yellow, set in the cathedral stone with a sill,
    pilasters at the edges like wall_cathedral."""
    w, h = 64, 128
    yy, xx = np.mgrid[0:h, 0:w]
    g = np.kron(stone_lum(32, 64, 711), np.ones((2, 2)))
    bid, mortar, top, left = ashlar(32, 64, [0, 9, 18, 27, 36, 45, 54], 702,
                                    off=[(6, 19), (12, 26), (6, 19), (12, 26), (6, 19), (12, 26), (6, 19)])
    shade = np.array([random.Random(b).uniform(-0.08, 0.08) for b in range(80)])[bid % 80]
    rgb = gmap(np.clip(g * 0.55 + 0.18 + np.kron(shade, np.ones((2, 2))), 0, 1), CS_STOPS)
    tl = np.kron(top | left, np.ones((2, 2), bool)) & ((yy % 2 == 0) | (xx % 2 == 0))
    rgb[tl] = blend(rgb, tl, CS4, 0.35)[tl]
    rgb[np.kron(mortar, np.ones((2, 2), bool))] = CS0
    # deep splayed reveal round the window
    x0, x1, y0, y1 = 14, 49, 8, 108
    rev = (xx >= x0 - 4) & (xx <= x1 + 4) & (yy >= y0 - 2) & (yy <= y1 + 2)
    rgb[rev] = gmap(g * 0.3 + 0.12, CS_STOPS)[rev]
    win, frame = glass_window(rgb, x0, x1, y0, y1, 712, 'rose')
    halo_m = glow(win.astype(float), 3.0)                                    # coloured light spilling on the reveal
    spill = (halo_m > 0.08) & ~win & ~frame
    avg = np.array([255, 150, 120], float)
    rgb[spill] = (rgb * (1 - halo_m[..., None] * 0.6) + avg * halo_m[..., None] * 0.6)[spill]
    rgb[(yy >= y1 + 2) & (yy <= y1 + 5) & (xx >= x0 - 6) & (xx <= x1 + 6)] = CS3           # the sill
    rgb[(yy == y1 + 2) & (xx >= x0 - 6) & (xx <= x1 + 6)] = CS4
    rgb[(yy == y1 + 5) & (xx >= x0 - 6) & (xx <= x1 + 6)] = CS0
    p = Pic(w, h)                                                            # three votive candles on the sill
    for x in (20, 31, 43):
        candle(p, x, y1 + 1, 4 + x % 3, 1, k=x % 3, w=1.2)
    put(rgb, outline_same(p.im))
    pil = rgb.copy()                                                         # pilasters at the edges, as wall_cathedral
    m = pilaster(pil, g, 58, 69, h, cap=(16, 22), base=(116, 124))
    ext = np.isin(xx, [57, 6]) & (((yy >= 16) & (yy <= 22)) | ((yy >= 116) & (yy <= 124)))
    rgb[m | ext] = pil[m | ext]
    finish(rgb, 'wall_stainedglass.png', 64, half=False)


def tex_wall_boss_cardinal():
    """The cardinal's wall: cathedral stone between pilasters, a long scarlet banner with a gold border, the crossed
    keys and a mitre over a dripping chalice, blood running from its fringe, candles below."""
    w, h = 64, 128
    yy, xx = np.mgrid[0:h, 0:w]
    g = np.kron(stone_lum(32, 64, 721), np.ones((2, 2)))
    rgb = gmap(g * 0.5 + 0.12, CS_STOPS)
    for y0 in range(0, h, 18):                                               # courses
        rgb[yy == y0] = CS0
        rgb[(yy == y0 + 1)] = blend(rgb, yy == y0 + 1, CS4, 0.25)[yy == y0 + 1]
        off = 10 if (y0 // 18) % 2 else 30
        rgb[(yy > y0) & (yy < y0 + 18) & ((xx == off) | (xx == off + 32))] = CS0
    # the banner
    bx0, bx1, by0, by1 = 13, 50, 6, 96
    cl = pnoise(w, h, 722, ((8, 1.0), (4, 0.5)))
    folds = 0.5 + 0.25 * np.sin((xx - bx0) / (bx1 - bx0) * math.pi * 3)
    ban = (xx >= bx0) & (xx <= bx1) & (yy >= by0) & (yy <= by1 + np.where((xx - bx0) % 6 < 3, 4, 0))
    lum = np.clip(folds * 0.8 + cl * 0.3, 0, 1)
    rgb[ban] = gmap(lum, [(0, RD0), (0.35, RD1), (0.7, RD2), (1, RD3)])[ban]
    bd = ban & ((xx <= bx0 + 1) | (xx >= bx1 - 1) | (yy <= by0 + 2) | (yy >= by1 - 1))
    rgb[bd] = gmap(lum, [(0, AU0), (0.5, AU2), (1, AU3)])[bd]
    rgb[(yy == by0 - 1) & (xx >= bx0 - 3) & (xx <= bx1 + 3)] = WD1                 # the rod
    rgb[(yy == by0 - 2) & (xx >= bx0 - 3) & (xx <= bx1 + 3)] = WD3
    for x in (bx0 - 4, bx1 + 4):
        rgb[(yy >= by0 - 3) & (yy <= by0) & (xx == x)] = AU2
    p = Pic(w, h)
    cx = 31.5
    # mitre
    p.poly([(cx - 8, 30), (cx - 7, 18), (cx, 10), (cx + 7, 18), (cx + 8, 30)], AU2)
    p.poly([(cx - 6.5, 29), (cx - 5.5, 19), (cx, 12.5), (cx + 5.5, 19), (cx + 6.5, 29)], LW2)
    p.l(cx, 13, cx, 29, AU3); p.l(cx - 6, 23, cx + 6, 23, AU3)
    p.r(cx - 8, 28, cx + 8, 31, AU1); p.l(cx - 8, 28, cx + 8, 28, AU3)
    p.e(cx - 1.5, 20, cx + 1.5, 26, RD2)
    # crossed keys
    for sd in (-1, 1):
        p.l(cx - 13 * sd, 50, cx + 11 * sd, 34, AU1, 3); p.l(cx - 13 * sd, 49, cx + 11 * sd, 33, AU3)
        kx, ky = cx - 13 * sd, 50
        p.e(kx - 3, ky - 3, kx + 3, ky + 3, AU1); p.e(kx - 1, ky - 1, kx + 1, ky + 1, RD1)
        tx, ty = cx + 11 * sd, 34
        p.r(tx - 1 + sd, ty - 1, tx + 2 * sd + 1, ty + 3, AU2)
    # chalice dripping blood
    p.poly([(cx - 7, 58), (cx + 7, 58), (cx + 4, 66), (cx - 4, 66)], AU2)
    p.l(cx - 7, 58, cx + 7, 58, AU4); p.l(cx + 4, 66, cx - 4, 66, AU0)
    p.e(cx - 6, 56, cx + 6, 60, BL1); p.l(cx - 4, 57, cx + 2, 57, BL3)
    p.r(cx - 1, 66, cx + 1, 74, AU1); p.l(cx - 1, 66, cx - 1, 74, AU3)
    p.e(cx - 2.5, 68, cx + 2.5, 71, AU2)
    p.poly([(cx - 6, 77), (cx + 6, 77), (cx + 3, 74), (cx - 3, 74)], AU1); p.l(cx - 6, 77, cx + 6, 77, AU3)
    for x, ln in ((cx - 6, 10), (cx + 5, 6), (cx - 2, 16)):
        p.l(x, 58, x, 58 + ln, BL2); p.p(x, 59 + ln, BL3)
    put(rgb, outline_same(p.im))
    # blood soaking the fringe and running down the wall below it
    for x in range(bx0 + 2, bx1 - 1, 3):
        ln = (x * 7) % 13
        base_ = by1 + (4 if (x - bx0) % 6 < 3 else 0)
        rgb[(xx == x) & (yy >= base_ - 2) & (yy <= base_ + ln)] = BL1
        rgb[(xx == x) & (yy == base_ + ln + 1)] = BL2
    rgb[ban & (yy >= by1 - 8)] = blend(rgb, ban & (yy >= by1 - 8), BL0, 0.5)[ban & (yy >= by1 - 8)]
    # candles on a ledge at the foot
    rgb[(yy >= 118) & (yy <= 121)] = CS3; rgb[yy == 118] = CS4; rgb[yy == 121] = CS0
    q = Pic(w, h)
    for i, x in enumerate((10, 19, 45, 54)):
        candle(q, x, 117, 6 + i % 2 * 3, 1, k=i % 3, w=1.3)
    put(rgb, outline_same(q.im))
    pil = rgb.copy()                                                         # the same pilasters as wall_stainedglass
    m = pilaster(pil, g, 58, 69, h, cap=(16, 22), base=(116, 124))
    ext = np.isin(xx, [57, 6]) & (((yy >= 16) & (yy <= 22)) | ((yy >= 116) & (yy <= 124)))
    rgb[m | ext] = pil[m | ext]
    finish(rgb, 'wall_boss_cardinal.png', 64, half=False)


def tex_floor_cathedral():
    """Black and red marble in a checker of 16 px squares, veined, with little gold-and-white mosaic diamonds where the
    corners meet (full res, tiles)."""
    rgb, _ = cathedral_floor_rgb()
    finish(rgb, 'floor_cathedral.png', 48, half=False)


def cathedral_floor_rgb(seed=731):
    w = h = 64
    yy, xx = np.mgrid[0:h, 0:w]
    n = pnoise(w, h, seed, ((16, 1.0), (8, 0.6), (4, 0.3)))
    vein = np.abs(np.sin((xx * 0.7 + yy * 0.45 + n * 28) * 0.35))
    vm = vein < 0.09
    chk = ((xx // 16 + yy // 16) % 2) == 0
    blk = gmap(np.clip(n * 0.6, 0, 1), [(0, (10, 8, 12)), (0.5, (24, 20, 26)), (1, (46, 40, 48))])
    red = gmap(np.clip(n * 0.8, 0, 1), [(0, (70, 8, 16)), (0.5, (116, 20, 28)), (1, (156, 42, 44))])
    rgb = np.where(chk[..., None], blk, red)
    rgb[vm & chk] = (70, 64, 72)
    rgb[vm & ~chk] = (190, 96, 86)
    gx, gy = xx % 16, yy % 16
    rgb[(gx == 0) | (gy == 0)] = (8, 6, 8)                                  # joints
    rgb[((gx == 1) | (gy == 1)) & ~chk] = blend(rgb, ((gx == 1) | (gy == 1)) & ~chk, (200, 90, 80), 0.3)[((gx == 1) | (gy == 1)) & ~chk]
    dx, dy = (xx + 8) % 16 - 8, (yy + 8) % 16 - 8                          # mosaic diamonds at the corners
    dd = np.abs(dx + 0.5) + np.abs(dy + 0.5)
    dia = dd <= 3
    rgb[dia] = AU1
    rgb[dd <= 2] = AU2
    rgb[dd <= 1] = (240, 236, 226)
    return rgb, (xx, yy)


def tex_floor_lightbeam():
    """floor_cathedral with a pool of coloured light thrown by a window: the panes of a lancet (red, blue, yellow) lie
    stretched across it, divided by the shadows of the lead, fading out towards the edges so it sits among the plain
    cathedral floor."""
    rgb, (xx, yy) = cathedral_floor_rgb()
    w = h = 64
    cx, cy = 32, 34
    u = (xx - cx) * 0.95 + (yy - cy) * 0.3
    v = (yy - cy) * 0.95 - (xx - cx) * 0.3
    shape = (np.abs(u) < 17) & (v < 24) & ((v > -6) | (np.hypot(u, (v + 6) * 0.9) < 17))
    shape &= ~((v < -6) & ((np.hypot(u + 17 - 34 * 0.82, v + 6) > 34 * 0.82) | (np.hypot(u - 17 + 34 * 0.82, v + 6) > 34 * 0.82)))
    s = 9.0
    iu, iv = np.floor((u + v) / s), np.floor((u - v) / s)
    k = ((iu * 3 + iv * 5) % 3).astype(int)
    cols = np.array([GL_R[2], GL_B[2], GL_Y[2]], float)
    light = cols[k]
    soft = glow(shape.astype(float), 1.6)
    edge_fade = np.clip(np.minimum.reduce([xx, yy, 63 - xx, 63 - yy]) / 6.0, 0, 1)
    a = np.clip(soft * 1.1, 0, 1) * edge_fade * 0.78
    lead = shape & ((np.mod(u + v, s) < 1.0) | (np.mod(u - v, s) < 1.0))
    a[lead] *= 0.25
    base = rgb.astype(float)
    lit = base * (1 - a[..., None]) + (base * 0.5 + light * 0.9) * a[..., None]
    lit = np.clip(lit, 0, 255)
    r2 = random.Random(741)
    for _ in range(14):                                                      # dust motes caught in the beam
        x, y = r2.randint(14, 50), r2.randint(12, 54)
        if shape[y, x]:
            lit[y, x] = (255, 250, 230)
    finish(lit, 'floor_lightbeam.png', 64, half=False)


def tex_floor_boss_cardinal():
    """The cardinal's floor: scarlet and black marble with a gold-inlaid quatrefoil in the middle of every tile, a gold
    border band and dark blood soaked into the joints."""
    w = h = 64
    yy, xx = np.mgrid[0:h, 0:w]
    n = pnoise(w, h, 751, ((16, 1.0), (8, 0.6), (4, 0.3)))
    rgb = gmap(np.clip(n * 0.8, 0, 1), [(0, RD0), (0.5, RD1), (1, RD2)])
    vein = np.abs(np.sin((xx * 0.5 - yy * 0.7 + n * 26) * 0.33)) < 0.08
    rgb[vein] = RD3
    cx = cy = 31.5
    r = np.hypot(xx - cx, yy - cy)
    a = np.arctan2(yy - cy, xx - cx)
    lob = 15 + 5 * np.abs(np.cos(2 * a))
    inner = r < lob
    rgb[inner] = gmap(np.clip(n[inner] * 0.6, 0, 1), [(0, (10, 8, 12)), (1, (40, 34, 42))])
    ring = np.abs(r - lob) < 1.3
    rgb[ring] = AU2
    rgb[np.abs(r - lob - 1.2) < 0.5] = AU0
    cross = ((np.abs(xx - cx) < 1.6) & (np.abs(yy - cy) < 10)) | ((np.abs(yy - cy + 2) < 1.6) & (np.abs(xx - cx) < 7))
    rgb[cross] = AU3
    rgb[wrap_outline(cross) & inner] = AU0
    bd = (xx < 3) | (yy < 3)
    rgb[bd] = (14, 10, 14)
    rgb[(xx == 1) | (yy == 1)] = AU1
    blood = (pnoise(w, h, 752, ((8, 1.0), (4, 0.5))) > 0.66) & ~inner
    rgb[blood] = blend(rgb, blood, BL0, 0.75)[blood]
    finish(rgb, 'floor_boss_cardinal.png', 48, half=False)


# ---------------------------------------------------------------- hive textures
def hex_cells(w, h, ncol, nrow, seed=0, jitter=0.0):
    """A wrapping hex lattice (flat-topped columns, odd columns offset half a row) as a Voronoi diagram: returns
    (cell id, distance to own centre, wall distance = d2 - d1, centres)."""
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    cw, rh = w / ncol, h / nrow
    r2 = random.Random(seed)
    cen = []
    for i in range(ncol):
        for j in range(nrow):
            cen.append((i * cw + cw / 2 + r2.uniform(-jitter, jitter), j * rh + (rh / 2 if i % 2 else 0) + r2.uniform(-jitter, jitter)))
    d1 = np.full((h, w), 1e9); d2 = np.full((h, w), 1e9); cid = np.zeros((h, w), int)
    for k, (cx, cy) in enumerate(cen):
        dx = np.abs(xx - cx); dx = np.minimum(dx, w - dx)
        dy = np.abs(yy - cy); dy = np.minimum(dy, h - dy)
        d = np.hypot(dx * 1.0, dy)
        closer = d < d1
        d2 = np.where(closer, d1, np.minimum(d2, d))
        cid = np.where(closer, k, cid)
        d1 = np.where(closer, d, d1)
    return cid, d1, d2 - d1, cen


def tex_wall_wax():
    """A wall of old beeswax: lumpy amber layers that have run and set (a height field lit from the top left), drips
    frozen down the face with fat beads at their ends, the ghost of comb cells pressed into it."""
    w, h = 32, 64
    yy, xx = np.mgrid[0:h, 0:w]
    hf = pnoise(w, h, 761, ((16, 1.0), (8, 0.45)))
    hf = hf + 0.35 * np.sin(yy / h * math.tau * 5 + pnoise(w, h, 762, ((8, 1.0),)) * 5) * 0.3   # sagging layers
    gx = (np.roll(hf, -1, 1) - np.roll(hf, 1, 1)); gy = (np.roll(hf, -1, 0) - np.roll(hf, 1, 0))
    lum = np.clip(0.5 - (gx + gy) * 1.8 + (hf - 0.5) * 0.6, 0, 1)
    rgb = gmap(lum, [(0, WX0), (0.35, WX1), (0.62, WX2), (0.85, WX3), (1, WX4)])
    cid, d1, wall, cen = hex_cells(w, h, 4, 6, 763, 0.6)
    ghost = (wall < 0.8) & (hf > 0.5)
    rgb[ghost] = blend(rgb, ghost, WX0, 0.35)[ghost]
    r2 = random.Random(764)
    for _ in range(7):                                                       # frozen drips: a lit run with a bead
        x = r2.randrange(w); y0 = r2.randrange(h); ln = r2.randint(5, 12)
        for y in range(y0, y0 + ln):
            rgb[y % h, x] = WX3
            rgb[y % h, (x + 1) % w] = WX1
            rgb[y % h, (x - 1) % w] = blend(rgb[y % h, (x - 1) % w][None, None], np.ones((1, 1), bool), WX0, 0.5)[0, 0]
        yb = (y0 + ln) % h
        rgb[yb, x] = WX4; rgb[yb, (x + 1) % w] = WX2; rgb[(yb + 1) % h, x] = WX1; rgb[(yb + 1) % h, (x + 1) % w] = WX0
    finish(tone(rgb, 0.92, 2), 'wall_wax.png', 40)


def honeycomb_rgb(w, h, ncol, nrow, seed, fill=0.6, capped=0.2, scale=1.0, royal=None):
    """Honeycomb: wax walls round hexagonal cells; a cell is empty (dark, its back wall showing), full of glossy honey
    or capped with pale wax."""
    yy, xx = np.mgrid[0:h, 0:w]
    cid, d1, wall, cen = hex_cells(w, h, ncol, nrow, seed)
    r2 = random.Random(seed + 1)
    kind = [0 if r2.random() > fill else (2 if r2.random() < capped / fill else 1) for _ in cen]
    if royal:
        for k in royal:
            kind[k] = 3
    kind = np.array(kind)[cid]
    rad = min(w / ncol, h / nrow) * 0.58
    t = np.clip(d1 / rad, 0, 1)
    rgb = np.zeros((h, w, 3))
    emp = kind == 0
    rgb[emp] = gmap(0.15 + 0.25 * (1 - t[emp]) + 0.1 * (yy[emp] % 3 == 0), [(0, (40, 20, 6)), (0.5, (82, 46, 12)), (1, (130, 80, 22))])
    hon = kind == 1
    cxs = np.array([c[0] for c in cen])[cid]; cys = np.array([c[1] for c in cen])[cid]
    dx = (xx - cxs + w / 2) % w - w / 2; dy = (yy - cys + h / 2) % h - h / 2     # offsets from the cell centre (wrapping)
    hl = np.clip(0.42 + dy / rad * 0.3 + (1 - t) * 0.15, 0, 1)               # a concave pool: dark under the top wall
    gl = (np.abs(dy - rad * 0.35) < 0.8 * scale) & (np.abs(dx) < rad * 0.35)
    gl |= (np.hypot(dx + rad * 0.35, dy + rad * 0.15) < 0.9 * scale)
    rgb[hon] = gmap(hl[hon], HN_STOPS)
    rgb[hon & gl] = HN4
    cap = kind == 2
    rgb[cap] = gmap(0.55 + 0.4 * (1 - t[cap]) - 0.15 * (dy[cap] > 0), WX_STOPS)
    roy = kind == 3
    rgb[roy] = gmap(0.6 + 0.4 * (1 - t[roy]), [(0, RJ0), (0.6, RJ1), (1, RJ2)])
    wt = 1.1 * scale
    wl = wall < wt
    rgb[wl] = gmap(np.clip(0.6 + (dy[wl] < 0) * 0.25 - wall[wl] * 0.2, 0, 1), WX_STOPS)
    rim = (wall >= wt) & (wall < wt + 0.9 * scale)
    rgb[rim & (dy < 0)] = blend(rgb, rim & (dy < 0), WX0, 0.6)[rim & (dy < 0)]
    rgb[rim & (dy >= 0)] = blend(rgb, rim & (dy >= 0), WX3, 0.4)[rim & (dy >= 0)]
    return rgb, cid, kind, wall, cen


def tex_wall_honeycomb():
    """A wall of honeycomb: hexagonal wax cells, many brimming with glossy honey, some capped with pale wax, a few empty
    and dark; honey has run out of the broken ones in long drips (full res, tiles)."""
    w, h = 64, 128
    rgb, cid, kind, wall, cen = honeycomb_rgb(w, h, 6, 10, 771, fill=0.68, capped=0.22)
    r2 = random.Random(772)
    yy, xx = np.mgrid[0:h, 0:w]
    for _ in range(5):                                                       # honey running down from a full cell
        k = r2.randrange(len(cen))
        x0 = int(cen[k][0]) % w; y0 = int(cen[k][1]); ln = r2.randint(10, 26)
        for y in range(y0, y0 + ln):
            ww = 2 if y < y0 + ln - 3 else 1
            rgb[y % h, x0:x0 + ww] = HN2
            rgb[y % h, x0] = HN3
        rgb[(y0 + ln) % h, x0] = HN1
        rgb[(y0 + ln - 1) % h, x0] = HN4
    finish(rgb, 'wall_honeycomb.png', 64, half=False)


def tex_wall_boss_queenbee():
    """The queen's wall: honeycomb framed by two thick wax pillars, a row of long royal cells hanging in the middle (pale
    wax peanuts dripping royal jelly), and a gold crown pressed into the wax above them."""
    w, h = 64, 128
    rgb, cid, kind, wall, cen = honeycomb_rgb(w, h, 6, 10, 781, fill=0.75, capped=0.35)
    yy, xx = np.mgrid[0:h, 0:w]
    n = pnoise(w, h, 782, ((8, 1.0), (4, 0.5)))
    # a smooth wax panel in the middle
    pan = (xx >= 12) & (xx <= 51) & (yy >= 8) & (yy <= 112)
    rgb[pan] = gmap(np.clip(0.45 + n[pan] * 0.35 + (yy[pan] % 9 == 0) * -0.1, 0, 1), WX_STOPS)
    rgb[wrap_outline(pan)] = WX0
    rgb[(xx == 12) & pan] = WX4; rgb[(yy == 8) & pan] = WX4
    p = Pic(w, h)
    cx = 31.5
    # the crown
    p.poly([(cx - 13, 36), (cx - 15, 18), (cx - 8, 27), (cx - 4, 14), (cx, 24), (cx + 4, 14), (cx + 8, 27), (cx + 15, 18), (cx + 13, 36)], AU2)
    p.poly([(cx - 11, 35), (cx - 12, 24), (cx - 8, 30), (cx - 4, 19), (cx, 28), (cx + 4, 19), (cx + 8, 30), (cx + 12, 24), (cx + 11, 35)], AU3)
    p.r(cx - 13, 32, cx + 13, 36, AU1); p.l(cx - 13, 32, cx + 13, 32, AU4)
    for (x, y) in ((cx - 15, 18), (cx - 4, 14), (cx + 4, 14), (cx + 15, 18)):
        p.e(x - 1.5, y - 1.5, x + 1.5, y + 1.5, AU4)
    for x, c in ((cx - 7, GL_R[1]), (cx, GL_B[1]), (cx + 7, GL_R[1])):
        p.e(x - 1.5, 33, x + 1.5, 35.5, c)
    # the royal cells: long pitted peanuts of wax hanging from a ledge
    p.r(14, 46, 49, 49, WX2); p.l(14, 46, 49, 46, WX4); p.l(14, 49, 49, 49, WX0)
    for i, x in enumerate((20, 31.5, 43)):
        ln = (30, 38, 30)[i]
        p.e(x - 5, 48, x + 5, 48 + ln, WX1)
        p.e(x - 4, 49, x + 3, 47 + ln, WX2)
        p.e(x - 3, 50, x, 46 + ln * 0.6, WX3)
        for j in range(4):
            for k in range(2):
                p.p(x - 2 + k * 3 + j % 2, 54 + j * 6, WX0)
        p.e(x - 2, 46 + ln, x + 2, 50 + ln, RJ1)                             # royal jelly at the open tip
        p.l(x, 50 + ln, x, 54 + ln + i * 3, RJ1); p.p(x, 55 + ln + i * 3, RJ2)
    put(rgb, outline_same(p.im))
    # wax pillars at the edges (half a pillar each side)
    for xs, sd in ((range(0, 5), 1), (range(59, 64), -1)):
        for x in xs:
            t = (x if sd > 0 else 63 - x) / 5
            rgb[:, x] = gmap(np.clip(0.35 + 0.5 * (1 - t) * (sd < 0) + 0.5 * t * (sd > 0) + n[:, x] * 0.2, 0, 1), WX_STOPS)
    rgb[:, 5] = WX0; rgb[:, 58] = WX0
    for y in range(0, h, 32):
        rgb[y:y + 3, :5] = WX3; rgb[y:y + 3, 59:] = WX3; rgb[y + 3, :6] = WX0; rgb[y + 3, 58:] = WX0
    finish(rgb, 'wall_boss_queenbee.png', 64, half=False)


def hivefloor_rgb(seed=791):
    w = h = 32
    yy, xx = np.mgrid[0:h, 0:w]
    n = pnoise(w, h, seed, ((16, 1.0), (8, 0.6), (4, 0.3)))
    cid, d1, wall, cen = hex_cells(w, h, 4, 4, seed + 1, 0.4)
    lum = np.clip(n * 0.55 + 0.3 - (wall < 0.9) * 0.18 + (np.abs(wall - 1.4) < 0.5) * 0.1, 0, 1)
    rgb = gmap(lum, WX_STOPS)
    r2 = random.Random(seed + 2)
    for _ in range(10):
        x, y = r2.randrange(w), r2.randrange(h)
        rgb[y, x] = WX4 if lum[y, x] > 0.4 else WX0
    return rgb, n


def tex_floor_hivefloor():
    """Trodden wax: a pale amber floor with the worn print of comb cells, lumps and glints (half res, tiles)."""
    rgb, n = hivefloor_rgb()
    finish(tone(rgb, 0.85, 6), 'floor_hivefloor.png', 40)


def tex_floor_honey():
    """A pool of glossy honey: deep amber with slow swirls, bright highlights and bubbles; a few lumps of wax poke out
    (half res, tiles with itself and sits among floor_hivefloor)."""
    w = h = 32
    yy, xx = np.mgrid[0:h, 0:w]
    base, n = hivefloor_rgb()
    sw = pnoise(w, h, 801, ((16, 1.0), (8, 0.5)))
    lum = np.clip(0.45 + 0.35 * np.sin((sw * 9 + yy / 32 * math.tau * 2)) * 0.5 + sw * 0.3, 0, 1)
    rgb = gmap(lum, HN_STOPS)
    hi = (pnoise(w, h, 804, ((4, 1.0),)) > 0.74) & (np.sin(sw * 9 + yy / 32 * math.tau * 2) > 0.3)
    rgb[hi] = HN3
    rgb[hi & ~np.roll(hi, 1, 0)] = HN4
    isl = pnoise(w, h, 802, ((8, 1.0), (4, 0.4))) > 0.7                    # wax islands
    rgb[isl] = base[isl]
    rgb[wrap_outline(isl)] = HN1
    r2 = random.Random(803)
    for _ in range(6):                                                       # bubbles
        x, y = r2.randrange(w), r2.randrange(h)
        if not isl[y, x]:
            rgb[y, x] = HN4; rgb[(y + 1) % h, x] = HN1
    finish(rgb, 'floor_honey.png', 40)


def tex_floor_boss_queenbee():
    """The queen's floor: big hexagonal tiles of golden wax, each with a pool of honey or a cap of royal jelly in its
    middle (full res, tiles)."""
    w = h = 64
    rgb, cid, kind, wall, cen = honeycomb_rgb(w, h, 4, 4, 811, fill=0.85, capped=0.3, scale=1.8)
    yy, xx = np.mgrid[0:h, 0:w]
    cxs = np.array([c[0] for c in cen])[cid]; cys = np.array([c[1] for c in cen])[cid]
    d = np.hypot((xx - cxs + w / 2) % w - w / 2, (yy - cys + h / 2) % h - h / 2)
    ring = (d > 4.5) & (d < 5.6) & (wall > 2.5)
    rgb[ring] = AU1
    rgb[(d <= 1.5)] = AU3
    finish(rgb, 'floor_boss_queenbee.png', 64, half=False)


@builder('textures')
def make_textures():
    for fn in (tex_wall_cathedral, tex_wall_stainedglass, tex_wall_boss_cardinal, tex_floor_cathedral, tex_floor_lightbeam,
               tex_floor_boss_cardinal, tex_wall_wax, tex_wall_honeycomb, tex_wall_boss_queenbee, tex_floor_hivefloor,
               tex_floor_honey, tex_floor_boss_queenbee):
        fn()


def topple(im, deg, pivot, floor=57):
    """A falling frame: the standing figure tipped over by deg (positive = backwards, to the left) round the pivot on the
    floor, nothing below the floor row."""
    return P5.ground(im.rotate(deg, resample=Image.NEAREST, center=pivot), floor)


# ================================================================== CHOIRBOY (drawn, 64x64: a choirboy in a red cassock and white surplice with a psalm book)
HAIR_C = ((70, 40, 22), (112, 70, 36), (156, 106, 58))
BOOK_C = ((70, 10, 18), (130, 22, 30), (176, 50, 50))


def lace_hem(p, x0, x1, y, c, c2):
    """A scalloped lace hem along row y from x0 to x1."""
    for x in range(int(x0), int(x1) + 1):
        if x % 3 != 1:
            p.p(x, y + 1, c)
        if x % 3 == 0:
            p.p(x, y + 2, c2)


def psalm_book(p, x, y, open_=1.0, tilt=0.0):
    """The red psalm book seen from the side, held up open before the face (x, y = the spine): two thick scarlet covers
    opening in a V towards him (open_ 0 shut .. 1 wide), the page blocks between them, a gold clasp and a ribbon."""
    ca, sa = math.cos(tilt), math.sin(tilt)
    R = lambda u, v: (x + u * ca - v * sa, y + u * sa + v * ca)
    L = 9
    for sd in (-1, 1):
        a = -math.pi / 2 + sd * (0.12 + open_ * 0.42)
        tip = R(math.cos(a) * L, math.sin(a) * L)
        p.l(*R(0, 0), *tip, BOOK_C[1], 3)
        p.l(*R(0, 0), *tip, BOOK_C[2] if sd > 0 else BOOK_C[0])
        a2 = -math.pi / 2 + sd * (0.12 + open_ * 0.42) * 0.55
        p.l(*R(sd * 0.6, -1), *R(math.cos(a2) * (L - 1.5), math.sin(a2) * (L - 1.5)), LW3 if sd > 0 else LW2, 2)
    p.e(x - 1.2, y - 1.2, x + 1.2, y + 1.2, AU2)
    p.lines([R(0, 0), R(0.6, 3), R(-0.4, 5)], AU3)                          # the ribbon / tassel


def choirboy_raw(t=0.0, bob=0, step=0.0, mouth=0, eyes=1, tilt=0.0, book=1.0, arm=0.0, dx=0, lean=0.0, sink=0):
    """Side view facing right: a boy in a scarlet cassock to the ankles, a white lace surplice and ruff, a pudding-basin
    haircut; both hands hold a psalm book open before his chest. step -1..1 swings the hem / feet; tilt leans the head
    back to sing; arm 0..1 lifts the book; mouth 0..2."""
    p = Pic(64, 64)
    cx = 30 + dx
    base = 57
    top = 17 + bob + sink
    sh = top + 13                                                           # shoulders
    # feet / shoes
    for k, sd in enumerate((-1, 1)):
        fx = cx + sd * 3 + step * sd * 3
        p.r(fx - 2, base - 2, fx + 3, base, (24, 18, 22)); p.l(fx - 1, base - 2, fx + 2, base - 2, (60, 50, 58))
    # cassock
    hem = base - 2 - abs(step)
    sw = step * 1.5
    p.poly([(cx - 5, sh), (cx + 5, sh), (cx + 9 + sw, hem), (cx - 10 + sw, hem)], RD1)
    p.poly([(cx - 4, sh), (cx - 1, sh), (cx - 4 + sw, hem), (cx - 9 + sw, hem)], RD2)
    for k in range(3):
        p.l(cx - 3 + k * 4, sh + 14, cx - 5 + k * 5 + sw, hem, RD0)
    p.l(cx - 10 + sw, hem, cx + 9 + sw, hem, RD0)
    # surplice
    sy = sh + 12
    p.poly([(cx - 6, sh - 1), (cx + 6, sh - 1), (cx + 11 + sw * 0.6, sy), (cx - 12 + sw * 0.6, sy)], LW2)
    p.poly([(cx - 5, sh), (cx - 1, sh), (cx - 6 + sw * 0.6, sy), (cx - 11 + sw * 0.6, sy)], LW3)
    p.l(cx + 2, sh + 3, cx + 4 + sw * 0.6, sy - 1, LW1); p.l(cx - 3, sh + 5, cx - 5 + sw * 0.6, sy - 1, LW1)
    lace_hem(p, cx - 12 + sw * 0.6, cx + 11 + sw * 0.6, sy, LW2, LW1)
    # head
    hx, hy = cx + 1, top + 5
    ta, tb = math.cos(tilt), math.sin(tilt)
    H = lambda u, v: (hx + u * ta + v * tb * 0.6, hy + v * ta - u * tb)
    p.e(hx - 6, hy - 6, hx + 6, hy + 6, SKN[2])
    p.e(hx - 5, hy - 5, hx + 4, hy + 3, SKN[3])
    p.poly([H(-7, -1), H(-7, -5), H(-3, -8), H(3, -8), H(6, -5), H(7, -2), H(2, -3), H(-2, -2), H(-3, 2), H(-6, 2)], HAIR_C[1])
    p.lines([H(-6, -5), H(-2, -7), H(3, -7)], HAIR_C[2])
    p.l(*H(-6, 1), *H(-6, -3), HAIR_C[0])
    p.p(*H(-2, 0), SKN[1])                                                  # ear
    ex, ey = H(3.5, -0.5)
    if eyes == 1:
        p.ps([(ex, ey), (ex, ey + 1)], (30, 20, 30))
    elif eyes == 2:                                                         # eyes closed in rapture
        p.l(ex - 1, ey + 1, ex + 1, ey + 1, (60, 30, 30))
    else:                                                                   # eyes rolled white
        p.ps([(ex, ey), (ex, ey + 1)], LW3)
    p.p(ex + 3, ey + 1, SKN[1])                                              # nose
    p.e(*H(2, 2), *H(4, 3.4), (236, 140, 130))                                # rosy cheek
    mx, my = H(4.5, 3.5)
    if mouth == 0:
        p.l(mx - 1, my, mx, my, SKN[0])
    else:
        r = 0.8 + mouth * 0.7
        p.e(mx - r * 0.7, my - r * 0.6, mx + r * 0.7, my + r, (80, 20, 30))
    # ruff collar
    for k in range(5):
        p.e(cx - 6 + k * 2.6, sh - 3, cx - 3 + k * 2.6, sh + 1, LW3 if k % 2 else LW2)
    # arms in wide surplice sleeves, hands under the book
    bx, by = cx + 9 + arm * 2, sh + 9 - arm * 6
    for far in (True, False):                                                  # wide white sleeves
        sx = cx - 2 if far else cx + 1
        p.lines([(sx, sh + 2), (sx + 1, sh + 9 - arm * 3), (bx - 1, by + 1)], LW1 if far else LW2, 4)
        if not far:
            p.l(sx, sh + 2, sx, sh + 8, LW3)
            p.l(sx + 1, sh + 11 - arm * 3, bx - 2, by + 3, LW1)
    if book > 0:
        psalm_book(p, bx + 1, by, book, 0.35 - arm * 0.35)
    p.e(bx - 1, by - 1, bx + 2, by + 2, SKN[2])
    return outline_same(cut_below(p.im, 57))


def choir_glow(k, cx=31, cy=20, r=10):
    """A golden ring of light behind the singer's head (k 0..2 strength)."""
    q = Pic(64, 64)
    if k:
        q.eo(cx - r, cy - r, cx + r, cy + r, AU2)
        if k > 1:
            q.eo(cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1, AU3)
        halo(q, cx, cy, r + 3, (AU3, AU4), 8 + k * 4, k)
    return q.im


def choirboy_frame(fl=None, notes=None, ring=0, **kw):
    im = choirboy_raw(**kw)
    if ring:
        im = on(choir_glow(ring, 31 + kw.get('dx', 0), 21 + kw.get('bob', 0)), im)
    if notes:
        im = on(im, notes_layer(64, notes))
    if fl:
        im = flash(im, fl)
    return im


def choirboy_lying(k):
    """He lies on his back on the floor, the surplice crumpled over the scarlet cassock, the book fallen beside him;
    the last notes fade away."""
    p = Pic(64, 64)
    f = 57
    p.poly([(15, f), (17, f - 7), (44, f - 6), (47, f)], RD1)                # cassock
    p.l(17, f - 7, 44, f - 6, RD2)
    for x in (24, 32, 40):
        p.l(x, f - 6, x + 1, f, RD0)
    p.poly([(15, f - 1), (17, f - 9), (30, f - 9), (32, f - 1)], LW2)        # surplice
    p.l(17, f - 9, 30, f - 9, LW3)
    lace_hem(p, 30, 32, f - 8, LW1, LW1)
    p.r(46, f - 4, 50, f, (24, 18, 22)); p.r(44, f - 7, 48, f - 4, (24, 18, 22))   # shoes, toes up
    p.e(4, f - 11, 16, f, SKN[2])                                            # head, face up
    p.poly([(3, f - 3), (4, f - 9), (9, f - 12), (14, f - 11), (10, f - 8), (6, f - 2)], HAIR_C[1])
    p.l(12, f - 8, 14, f - 8, (30, 20, 30)); p.p(15, f - 6, SKN[1])
    for x in (16, 18):
        p.e(x - 1.5, f - 10, x + 1.5, f - 5, LW3)                            # ruff
    p.lines([(22, f - 8), (26, f - 14), (30, f - 15)], LW2, 4)               # an arm flung up
    p.e(30, f - 17, 33, f - 14, SKN[2])
    q = Pic(64, 64)
    psalm_book(q, 56, f, 0.7, 0.0)
    im = outline_same(cut_below(p.im, f))
    im = on(im, outline_same(cut_below(q.im, f)))
    if k < 2:
        im = on(im, notes_layer(64, [(46 - k * 2, 30 - k * 6, 0), (38, 36 - k * 6, 1)][:2 - k], (AU2, AU3)))
    return im


@builder('choirboy')
def make_choirboy():
    C = choirboy_frame
    save_enemy('choirboy', 'idle', [C(bob=(0, 0, -1, 0)[i], eyes=0 if i == 3 else 1, mouth=(0, 1, 0, 0)[i], step=0) for i in range(4)], 64)
    save_enemy('choirboy', 'movement', [C(step=math.sin(i / 6 * math.tau), bob=-(i % 3 == 1), dx=1) for i in range(6)], 64)
    # attack: he lifts the book, throws his head back and sings; a ring of light kindles and golden notes rise
    save_enemy('choirboy', 'attack', [C(arm=0.4, tilt=0.1, mouth=1, eyes=2, ring=1),
                                      C(arm=0.8, tilt=0.25, mouth=2, eyes=2, ring=2, bob=-1, notes=[(40, 20, 0)]),
                                      C(arm=1.0, tilt=0.3, mouth=2, eyes=2, ring=2, bob=-1, notes=[(42, 14, 0), (47, 22, 1)]),
                                      C(arm=1.0, tilt=0.3, mouth=2, eyes=2, ring=1, bob=-1, notes=[(44, 8, 1), (50, 16, 0), (40, 24, 0)]),
                                      C(arm=0.6, tilt=0.15, mouth=1, eyes=2, ring=1, notes=[(47, 6, 0), (53, 13, 1)]),
                                      C(arm=0.2, mouth=0)], 64)
    save_enemy('choirboy', 'take_damage', [C(dx=-3, eyes=0, mouth=2, tilt=-0.2, fl=(255, 255, 255), book=0.5),
                                           C(dx=-2, eyes=0, mouth=1, tilt=-0.1), C(dx=-1)], 64)
    d = [C(dx=-2, eyes=0, mouth=2, tilt=-0.3, book=0.3), C(dx=-3, eyes=0, mouth=2, tilt=-0.4, book=0, sink=6, arm=0.6),
         topple(C(dx=-2, eyes=0, mouth=1, book=0, sink=4), 38, (28, 57)), choirboy_lying(0), choirboy_lying(1), choirboy_lying(2)]
    save_enemy('choirboy', 'death', d, 64)


# ================================================================== FLAGELLANT (drawn, 64x64: a hooded penitent in sackcloth with a flail, his back flayed)
def flail(p, hx, hy, ang, ln=14, spread=0.35, curl=0.0, n=4):
    """The flagellum from the fist (hx, hy): a short wooden handle along ang, then n knotted cords fanning out with
    iron barbs at their ends; curl bends them."""
    ux, uy = math.cos(ang), math.sin(ang)
    ex, ey = hx + ux * 5, hy + uy * 5
    p.l(hx - ux * 2, hy - uy * 2, ex, ey, WD3, 2); p.l(hx - ux * 2, hy - uy * 2, ex, ey, WD2)
    p.p(ex, ey, I2)
    tips = []
    for k in range(n):
        a = ang + (k - (n - 1) / 2) * spread
        pts = []
        for j in range(7):
            t = j / 6
            aa = a + curl * t * t
            pts.append((ex + math.cos(aa) * ln * t, ey + math.sin(aa) * ln * t + t * t * 2))
        p.lines(pts, SACK[3])
        for j in (2, 4):
            p.p(*pts[j], SACK[1])
        p.e(pts[-1][0] - 1, pts[-1][1] - 1, pts[-1][0] + 1, pts[-1][1] + 1, I3)
        tips.append(pts[-1])
    return tips


def flagellant_raw(t=0.0, bob=0, step=0.0, arm=(2.6, 0.9), farm=0.4, dx=0, lean=0.0, hood=1, eye=1, sink=0, cords=None,
                   wounds=4):
    """Side view facing right, hunched: a pointed sackcloth hood over the face with one dark eye-hole, a bare torso whose
    back is scored with bloody stripes, a sackcloth skirt tied with a rope, bare feet. arm = (angle of the fore arm from
    the shoulder, flail angle offset) - the flail in its fist; farm = the back arm's angle."""
    p = Pic(64, 64)
    cx = 29 + dx
    base = 57
    top = 15 + bob + sink
    hip = top + 26
    # back leg / feet
    for sd in (-1, 1):
        fx = cx + sd * 3 + step * sd * 4
        p.l(cx + sd, hip + 8, fx, base - 1, SKN[1] if sd < 0 else SKN[2], 3)
        p.r(fx - 1, base - 1, fx + 3, base, SKN[1])
    # sackcloth skirt
    sw = step * 2
    p.poly([(cx - 7, hip), (cx + 6, hip), (cx + 9 + sw, hip + 14), (cx - 10 + sw * 0.5, hip + 15)], SACK[1])
    p.poly([(cx - 6, hip + 1), (cx - 2, hip + 1), (cx - 5 + sw * 0.5, hip + 14), (cx - 9 + sw * 0.5, hip + 14)], SACK[2])
    for k in range(4):
        p.l(cx - 6 + k * 4, hip + 2, cx - 8 + k * 5 + sw, hip + 14, SACK[0])
    for x in range(int(cx - 10 + sw * 0.5), int(cx + 9 + sw)):              # ragged hem
        if x % 3 == 0:
            p.p(x, hip + 15, SACK[1])
    p.l(cx - 7, hip, cx + 6, hip, (186, 160, 110), 2)                        # the rope belt
    p.lines([(cx + 3, hip + 1), (cx + 4, hip + 7), (cx + 3, hip + 10)], (186, 160, 110))
    # hunched bare torso, leaning forward
    sx, sy = cx + 2 + lean, top + 12
    p.poly([(cx - 7, hip), (cx - 9 + lean * 0.5, top + 17), (cx - 5 + lean, top + 9), (sx + 4, top + 10), (cx + 6, hip)], SKN[2])
    p.poly([(cx + 1, hip), (sx + 4, top + 11), (cx + 6, hip)], SKN[1])
    p.l(cx - 9 + lean * 0.5, top + 17, cx - 5 + lean, top + 9, SKN[3])
    p.l(cx - 4 + lean * 0.3, top + 14, cx - 3, hip - 2, SKN[1])               # spine
    r2 = random.Random(7)
    for k in range(wounds):                                                   # lash wounds across the back
        y = top + 12 + k * 3.5
        x0 = cx - 9 + lean * 0.5 + k * 0.4
        p.l(x0, y, x0 + 6, y - 2 + r2.uniform(-0.5, 0.5), BL1)
        p.p(x0 + 2, y, BL3)
        if k % 2:
            p.l(x0 + 1, y + 1, x0 + 1, y + 3, BL1)
    # the far (back) arm
    fa = farm
    fsx, fsy = cx - 3 + lean, top + 13
    p.lines([(fsx, fsy), (fsx + math.cos(fa) * 8, fsy + math.sin(fa) * 8), (fsx + math.cos(fa) * 8 + math.cos(fa + 0.5) * 7, fsy + math.sin(fa) * 8 + math.sin(fa + 0.5) * 7)], SKN[1], 3)
    # hood: a tall sackcloth cone pulled over the head, a dark eye-hole
    hx, hy = cx + 3 + lean, top + 4
    p.poly([(hx - 7, hy + 9), (hx - 6, hy - 1), (hx - 3 - hood * 2, hy - 10), (hx + 3, hy - 3), (hx + 6, hy + 3), (hx + 6, hy + 10)], SACK[2])
    p.poly([(hx - 6, hy - 1), (hx - 3 - hood * 2, hy - 10), (hx - 1, hy - 4), (hx - 3, hy + 6)], SACK[3])
    p.poly([(hx - 8, hy + 8), (hx + 7, hy + 8), (hx + 8, hy + 12), (hx - 9, hy + 12)], SACK[1])   # the hood's cape
    p.l(hx + 3, hy - 3, hx + 6, hy + 3, SACK[1])
    if eye:
        p.e(hx + 1, hy + 1, hx + 5, hy + 4, (14, 8, 10))
        if eye == 2:
            p.p(hx + 3, hy + 2, (255, 70, 50))
        else:
            p.p(hx + 3, hy + 2, (200, 190, 170))
    for k in range(3):                                                        # stitches
        p.p(hx - 2 + k * 2, hy + 10, SACK[0])
    p.l(hx - 4, hy + 2, hx - 1, hy + 9, BL0)                                 # a blood stain soaked into the hood
    # fore arm with the flail
    a, fo = arm
    ax, ay = cx + 4 + lean, top + 13
    ex, ey = ax + math.cos(a) * 8, ay + math.sin(a) * 8
    hx2, hy2 = ex + math.cos(a + 0.6) * 7, ey + math.sin(a + 0.6) * 7
    p.lines([(ax, ay), (ex, ey), (hx2, hy2)], SKN[2], 3)
    p.l(ax, ay - 1, ex, ey - 1, SKN[3])
    p.e(hx2 - 2, hy2 - 2, hx2 + 2, hy2 + 2, SKN[1])
    q = Pic(64, 64)
    c = cords or {}
    flail(q, hx2, hy2, a + 0.6 + fo, c.get('ln', 13), c.get('spread', 0.3), c.get('curl', 0.6))
    im = outline_same(cut_below(p.im, 57))
    return on(im, outline_same(cut_below(q.im, 57)))


def flagellant_frame(fl=None, blood=0, seed=0, **kw):
    im = flagellant_raw(**kw)
    if blood:
        q = Pic(64, 64)
        blood_drops(q, blood, seed, (8, 14, 30, 40))
        im = on(im, q.im)
    if fl:
        im = flash(im, fl)
    return im


def flagellant_lying(k):
    """Face down on the floor, the flayed back up, the hood's point flopped forward, the flail dropped; blood pools."""
    p = Pic(64, 64)
    f = 57
    pool(p, 30, f, 34 + k * 6, 3, (BL0, BL1, BL3), 3)
    p.poly([(10, f), (12, f - 5), (26, f - 7), (28, f)], SACK[1])            # skirt
    p.l(26, f - 7, 26, f, (186, 160, 110), 2)
    p.poly([(27, f), (28, f - 7), (44, f - 6), (46, f)], SKN[2])              # back
    for x in range(30, 44, 3):
        p.l(x, f - 7, x + 2, f - 3, BL1)
    p.poly([(45, f), (46, f - 8), (52, f - 9), (58, f - 4), (59, f)], SACK[2]) # hood
    p.poly([(54, f - 8), (60, f - 12), (59, f - 6)], SACK[3])
    p.l(5, f - 1, 12, f - 2, SKN[1], 2)                                       # feet
    p.l(40, f - 2, 50, f - 1, SKN[1], 2)
    q = Pic(64, 64)
    flail(q, 50, f - 2, 0.1, 9, 0.2, 0.0)
    return shift(on(outline_same(cut_below(p.im, f)), outline_same(cut_below(q.im, f))), -2, 0)


@builder('flagellant')
def make_flagellant():
    C = flagellant_frame
    # idle: he scourges himself, the flail flicked back over his shoulder onto his back
    save_enemy('flagellant', 'idle', [C(arm=(-1.6, -1.1), bob=0, cords={'curl': 1.4, 'ln': 7}),
                                      C(arm=(-2.2, -0.8), bob=0, cords={'curl': 1.7, 'ln': 7}),
                                      C(arm=(-2.5, -0.5), bob=0, cords={'curl': 1.2, 'ln': 7}, blood=4, seed=2),
                                      C(arm=(-1.7, -1.0), bob=0, cords={'curl': 1.4, 'ln': 7})], 64)
    save_enemy('flagellant', 'movement', [C(step=math.sin(i / 6 * math.tau), bob=-(i % 3 == 1), arm=(0.9 + math.sin(i / 6 * math.tau) * 0.2, 0.5), lean=1, dx=1,
                                            cords={'curl': 0.8}) for i in range(6)], 64)
    # attack: the flail swings up behind him, then lashes down in front with a spray of blood
    save_enemy('flagellant', 'attack', [C(arm=(-1.5, -1.6), lean=-2, eye=2, cords={'curl': -0.6}),
                                        C(arm=(-2.4, -1.4), lean=-3, eye=2, cords={'curl': -0.8}, bob=-1),
                                        C(arm=(-0.6, 0.0), lean=1, eye=2, cords={'curl': 0.4, 'ln': 11}),
                                        C(arm=(0.1, 0.0), lean=3, eye=2, cords={'curl': 0.5, 'ln': 14, 'spread': 0.2}, blood=6, seed=5),
                                        C(arm=(0.5, 0.3), lean=3, eye=2, cords={'curl': 0.9}),
                                        C(arm=(0.9, 0.5), lean=1)], 64)
    save_enemy('flagellant', 'take_damage', [C(dx=-3, lean=-3, eye=2, fl=(255, 255, 255), blood=5, seed=9),
                                             C(dx=-2, lean=-2, eye=2), C(dx=-1)], 64)
    d = [C(eye=2, lean=-2, blood=6, seed=12, arm=(-0.8, 0.4)),
         C(eye=0, lean=2, sink=8, arm=(1.2, 0.6), farm=1.2),
         topple(C(eye=0, lean=4, sink=6, arm=(1.4, 0.8), farm=1.4, dx=-6), -48, (28, 57)),
         flagellant_lying(0), flagellant_lying(1), flagellant_lying(2)]
    save_enemy('flagellant', 'death', d, 64)


# ================================================================== CHERUB (drawn, 48x48: a winged child's head that flies and shrieks)
CHB = ((150, 88, 96), (214, 148, 144), (244, 196, 184), (255, 230, 218))     # cherub skin
FEATH = ((150, 146, 170), (204, 202, 220), (236, 236, 246), (255, 255, 255))  # white feathers
CF = 42                                                                       # feet row of a 48 cell


def feather_wing(p, x, y, ang, ln, spread=1.0, far=False):
    """A small white feathered wing from its root (x, y): a covert lump and four long primaries fanning along ang."""
    pal = tuple(dark(c, 0.8) for c in FEATH) if far else FEATH
    for k in range(4):
        a = ang + (k - 1.5) * 0.28 * spread
        l2 = ln * (1.0 - k * 0.12)
        ex, ey = x + math.cos(a) * l2, y + math.sin(a) * l2
        p.l(x, y, ex, ey, pal[0], 4)
        p.l(x, y, ex, ey, pal[2 if k % 2 else 1], 2)
    p.e(x - 3, y - 3, x + 3, y + 3, pal[2])
    p.e(x - 2, y - 3, x + 1, y, pal[3])


def cherub_raw(bob=0, wing=0.0, mouth=0, eyes=1, dx=0, tilt=0.0, halo_=1, sink=0, tears=0):
    """Side view facing right, low in the cell: a chubby child's head with golden curls, a tarnished halo above, two
    little white wings beating at its sides (wing -1 down .. 1 up); mouth 0 shut, 1 open, 2 a wide shriek."""
    p = Pic(48, 48)
    cx, cy = 28 + dx, 27 + bob + sink
    feather_wing(p, cx - 5, cy - 1, -2.35 + wing * 0.6, 15, 1.2, far=True)    # the far wing
    if halo_:
        p.eo(cx - 7, cy - 17, cx + 7, cy - 13, AU1)
        p.arc(cx - 7, cy - 17, cx + 7, cy - 13, 180, 360, AU3)
    ta = tilt
    H = lambda u, v: (cx + u * math.cos(ta) - v * math.sin(ta), cy + u * math.sin(ta) + v * math.cos(ta))
    p.e(cx - 10, cy - 10, cx + 10, cy + 10, CHB[1])                            # the head
    p.e(cx - 9, cy - 9, cx + 8, cy + 7, CHB[2])
    p.e(cx - 6, cy - 8, cx + 4, cy + 1, CHB[3])
    p.e(*[v for v in H(3, 2)], *[v + 5 for v in H(3, 2)], (240, 150, 150))   # a fat cheek
    for (u, v, r) in ((-8, -6, 4), (-4, -9, 4), (1, -10, 3.5), (5, -8, 3), (-9, -1, 3.5), (-8, 4, 3)):   # curls
        x, y = H(u, v)
        p.e(x - r, y - r, x + r, y + r, AU1)
        p.e(x - r + 1, y - r + 0.5, x + r - 1.5, y + r - 1.5, AU2)
        p.p(x - r * 0.3, y - r * 0.4, AU4)
        p.p(x + r * 0.2, y + r * 0.3, AU0)
    ex, ey = H(5, -2)
    if eyes == 1:                                                              # big, black, glistening
        p.e(ex - 1.5, ey - 2, ex + 1.5, ey + 1, (24, 12, 20)); p.p(ex - 0.5, ey - 1, WHITE)
    elif eyes == 2:                                                            # screwed shut
        p.l(ex - 2, ey - 1, ex + 1, ey, CHB[0]); p.l(ex - 2, ey + 1, ex + 1, ey, CHB[0])
    else:
        p.e(ex - 1.5, ey - 2, ex + 1.5, ey + 1, LW3); p.p(ex, ey - 0.5, CHB[0])
    if tears:
        p.l(ex, ey + 2, ex - 1, ey + 6, (160, 200, 255))
    p.p(*H(9, 0), CHB[1])                                                     # nose
    mx, my = H(6, 5)
    if mouth == 0:
        p.e(mx - 1, my - 0.5, mx + 1.5, my + 1, (190, 70, 80))
    else:
        rw, rh = (1.5, 2) if mouth == 1 else (3, 4.5)
        p.e(mx - rw, my - rh * 0.5, mx + rw, my + rh, (60, 10, 24))
        p.l(mx - rw + 1, my + rh - 0.5, mx + rw - 1, my + rh - 0.5, (200, 80, 90))
    p.p(*H(-3, 2), CHB[1])                                                    # ear
    feather_wing(p, cx - 8, cy + 2, -2.6 + wing * 0.65, 16, 1.25)              # the near wing, out of the back of the head
    return outline_same(cut_below(p.im, CF))


def shriek_rings(k, x, y, size=48):
    """Sound rings bursting from the mouth towards the right (k = how far they have spread)."""
    q = Pic(size, size)
    for j in range(3):
        r = 3 + j * 4 + k * 3
        q.arc(x - r, y - r, x + r, y + r, -45, 45, WHITE if j == 0 else (220, 220, 240))
        q.arc(x - r - 1, y - r - 1, x + r + 1, y + r + 1, -40, 40, OUT)
    return q.im


def cherub_frame(fl=None, rings=None, motes=0, seed=0, **kw):
    im = cherub_raw(**kw)
    if rings is not None:
        im = on(im, shriek_rings(rings, 34 + kw.get('dx', 0), 33 + kw.get('bob', 0)))
    if motes:
        q = Pic(48, 48)
        sparkles(q, motes, seed, (4, 6, 44, 30), (AU2, AU3, AU4))
        im = on(im, q.im)
    if fl:
        im = flash(im, fl)
    return im


def cherub_down(k):
    """Fallen: the head lies on its side on the floor, the wings spread flat and crumpled, the halo rolled away."""
    p = Pic(48, 48)
    f = CF
    feather_wing(p, 17, f - 4, -2.9, 13, 0.8, far=True)
    feather_wing(p, 19, f - 3, -3.05, 15, 0.7)
    p.e(13, f - 15, 33, f, CHB[1]); p.e(14, f - 14, 31, f - 2, CHB[2])
    for (x, y) in ((14, f - 10), (17, f - 14), (22, f - 15), (14, f - 5)):
        p.e(x - 3, y - 3, x + 3, y + 3, AU1); p.e(x - 2, y - 2, x + 2, y + 1, AU2)
    p.l(26, f - 9, 29, f - 8, CHB[0])                                         # closed eye
    p.e(26, f - 4, 29, f - 2, (110, 30, 44))
    p.e(37, f - 3, 45, f, AU1); p.e(38, f - 2, 44, f - 1, (0, 0, 0, 0))
    im = outline_same(cut_below(p.im, f))
    q = Pic(48, 48)
    r2 = random.Random(40 + k)
    for _ in range(4 - k):                                                    # loose feathers settling
        x, y = r2.uniform(4, 44), r2.uniform(14 + k * 8, 34 + k * 2)
        q.l(x, y, x + 3, y - 1, FEATH[2]); q.p(x, y, FEATH[0])
    return on(im, outline_same(q.im))


@builder('cherub')
def make_cherub():
    C = cherub_frame
    save_enemy('cherub', 'idle', [C(wing=(-1, 0, 1, 0)[i], bob=(1, 0, -1, 0)[i], eyes=0 if i == 3 else 1) for i in range(4)], 48)
    save_enemy('cherub', 'movement', [C(wing=(-1, -0.3, 0.6, 1, 0.3, -0.6)[i], bob=(1, 0, -1, -1, 0, 1)[i], tilt=0.12, dx=1) for i in range(6)], 48)
    # attack: it draws back, screws up its face and shrieks, rings of sound bursting from its mouth
    save_enemy('cherub', 'attack', [C(wing=1, tilt=-0.2, mouth=1, eyes=2, dx=-2),
                                    C(wing=-1, tilt=0.1, mouth=2, eyes=2, rings=0, dx=1),
                                    C(wing=1, tilt=0.15, mouth=2, eyes=2, rings=1, dx=1, bob=-1),
                                    C(wing=-1, tilt=0.15, mouth=2, eyes=2, rings=2, dx=1),
                                    C(wing=0.5, tilt=0.05, mouth=1, eyes=1, rings=3),
                                    C(wing=-0.5)], 48)
    save_enemy('cherub', 'take_damage', [C(dx=-2, tilt=-0.3, mouth=2, eyes=2, fl=(255, 255, 255), tears=1),
                                         C(dx=-2, tilt=-0.15, mouth=1, eyes=2, tears=1), C(dx=-1, wing=0.5)], 48)
    d = [C(mouth=2, eyes=2, tilt=-0.3, wing=1, tears=1, motes=4, seed=5), C(mouth=2, eyes=0, tilt=0.6, wing=-1, sink=6, halo_=0),
         C(mouth=1, eyes=0, tilt=1.3, wing=0.3, sink=12, halo_=0), cherub_down(0), cherub_down(1), cherub_down(2)]
    save_enemy('cherub', 'death', d, 48)


# ================================================================== WORKER BEE (drawn, 32x32: a bee that flies in swarms)
def workerbee_raw(wing=0.0, bob=0, dx=0, tilt=0.0, sting=0.0, eye=1, legs=1):
    """Side view facing right, low in the cell: a fuzzy amber thorax, a big compound eye, antennae, a striped abdomen
    with its stinger (sting 0 trailing .. 1 curled forwards to stab), wings blurred up / down (wing -1..1)."""
    p = Pic(32, 32)
    cx, cy = 18 + dx, 20 + bob
    ca, sa = math.cos(tilt), math.sin(tilt)
    bee_wing(p, cx - 1, cy - 4, -1.9 - wing * 0.9, 11, 5, tuple(dark(c, 0.85) for c in (WG0, WG1, WG2, WG3)), False)
    bee_body(p, cx - 3 * ca, cy - 3 * sa + 1, tilt - sting * 0.6, 0.85, 3, True, curl=-sting * 2.2)
    if legs:
        for k in range(3):
            lx = cx - 2 + k * 2.5
            p.lines([(lx, cy + 3), (lx - 1 + k, cy + 6), (lx - 2 + k * 1.5, cy + 8)], BK1)
    p.e(cx - 4, cy - 4, cx + 3, cy + 4, BY0)                                 # fuzzy thorax
    p.e(cx - 3, cy - 4, cx + 2, cy + 2, BY1)
    p.e(cx - 2, cy - 4, cx + 1, cy - 1, BY2)
    p.ps([(cx - 4, cy - 1), (cx + 3, cy + 1), (cx - 1, cy + 4), (cx + 1, cy - 4)], BY3)
    hx, hy = cx + 5 * ca, cy + 5 * sa
    p.e(hx - 3, hy - 3, hx + 3, hy + 3, BK1)                                 # head
    p.e(hx - 1, hy - 3, hx + 3, hy + 1, BK0)                                 # compound eye
    p.p(hx + 1, hy - 2, (120, 110, 130) if eye else BK2)
    p.lines([(hx + 1, hy - 3), (hx + 3, hy - 7), (hx + 6, hy - 8)], BK1)     # antennae
    p.l(hx + 3, hy + 2, hx + 4, hy + 4, BK2)                                 # mandible
    bee_wing(p, cx + 1, cy - 4, -1.6 - wing * 0.9, 12, 5)
    return outline_same(cut_below(p.im, 28))


def workerbee_frame(fl=None, lines_=0, **kw):
    im = workerbee_raw(**kw)
    if lines_:
        q = Pic(32, 32)
        for j in range(3):
            q.l(1, 14 + j * 4, 4 + j, 14 + j * 4, WHITE)
        im = on(q.im, im)
    if fl:
        im = flash(im, fl)
    return im


def workerbee_dead(k):
    """On its back on the floor, legs curled up, a wing bent under it."""
    p = Pic(32, 32)
    f = 28
    bee_body(p, 14, f - 3, 0.0, 0.75, 3, True)
    p.e(11, f - 7, 18, f, BY0); p.e(12, f - 6, 17, f - 1, BY1)
    p.e(17, f - 6, 22, f - 1, BK1)
    for k_ in range(3):
        x = 12 + k_ * 2.5
        p.lines([(x, f - 6), (x + 1, f - 9 + k * 0.5), (x + 2, f - 10 + k * 0.5)], BK1)
    p.lines([(21, f - 4), (24, f - 6), (26, f - 5)], BK1)
    bee_wing(p, 13, f - 2, 3.0, 10, 4)
    return outline_same(cut_below(p.im, f))


@builder('workerbee')
def make_workerbee():
    B = workerbee_frame
    save_enemy('workerbee', 'idle', [B(wing=(1, -1)[i % 2], bob=(0, -1, 0, 1)[i]) for i in range(4)], 32)
    save_enemy('workerbee', 'movement', [B(wing=(1, -1)[i % 2], bob=(0, -1, -1, 0, 1, 1)[i], tilt=0.15, dx=1, lines_=i % 2) for i in range(6)], 32)
    save_enemy('workerbee', 'attack', [B(wing=1, tilt=-0.3, sting=0.3, dx=-2), B(wing=-1, tilt=-0.2, sting=0.8, dx=-2),
                                       B(wing=1, tilt=0.35, sting=1.0, dx=2, lines_=1), B(wing=-1, tilt=0.3, sting=1.0, dx=2),
                                       B(wing=1, tilt=0.1, sting=0.3, dx=1)], 32)
    save_enemy('workerbee', 'take_damage', [B(wing=1, dx=-2, tilt=-0.4, eye=0, fl=(255, 255, 255)), B(wing=-1, dx=-1, tilt=-0.2), B(wing=1, dx=0)], 32)
    d = [B(wing=1, tilt=-0.6, eye=0, bob=1), B(wing=-1, tilt=0.9, eye=0, bob=4), B(wing=0.5, tilt=1.6, eye=0, bob=7, legs=0),
         workerbee_dead(0), workerbee_dead(1), workerbee_dead(1)]
    save_enemy('workerbee', 'death', d, 32)


# ================================================================== STINGER KNIGHT (drawn, 64x64: a great bee in chitin armour with a lance of a sting)
def stingerknight_raw(wing=0.0, bob=0, dx=0, tilt=0.0, aim=0.0, lance=1.0, visor=1, crack=0, sink=0, legs=0.0):
    """Side view facing right, hovering low: a helmed head with a slit visor and antenna plumes, a thorax under amber
    chitin plates and gold rivets, a striped abdomen curled forwards under the body so that its sting - long as a lance,
    banded in iron - points ahead (aim tips it; lance 0..1.4 how far it is thrust out), big wings."""
    p = Pic(64, 64)
    cx, cy = 29 + dx, 33 + bob + sink
    bee_wing(p, cx - 2, cy - 8, -1.95 - wing * 0.8, 21, 9, tuple(dark(c, 0.8) for c in (WG0, WG1, WG2, WG3)))
    # the abdomen, curled under and forwards
    pts = bez((cx - 4, cy + 2), (cx - 16, cy + 14), (cx - 2, cy + 18 + aim * 2), 7)
    rad = [6, 7.5, 8, 7.5, 6.5, 5.2, 4]
    for (x, y), r in zip(pts, rad):
        p.e(x - r, y - r, x + r, y + r, BK0)
    for (x, y), r in zip(pts, rad):
        p.e(x - r + 1, y - r + 1, x + r - 1, y + r - 1, BY1)
    for j in (1, 3, 5):
        (x, y), r = pts[j], rad[j]
        p.l(x - r + 1, y - r * 0.6, x + r - 1, y + r * 0.6, BK1, 3)
    for (x, y), r in list(zip(pts, rad))[1:4]:
        p.e(x - r * 0.6, y - r * 0.8, x + r * 0.1, y - r * 0.3, BY2)
    # the lance: from the abdomen's tip along aim
    tx, ty = pts[-1]
    a = -0.05 + aim
    L = 22 * lance
    ux, uy = math.cos(a), math.sin(a)
    ex, ey = tx + ux * L, ty + uy * L
    p.poly([(tx - uy * 3.5, ty + ux * 3.5), (tx + uy * 3.5, ty - ux * 3.5), (ex, ey)], BK1)
    p.poly([(tx + uy * 0.5, ty - ux * 0.5), (tx + uy * 3.2, ty - ux * 3.2), (ex, ey)], BK3)
    for t in (0.12, 0.35, 0.58):                                              # iron bands
        bx, by = tx + ux * L * t, ty + uy * L * t
        w = 3.6 * (1 - t)
        p.l(bx - uy * w, by + ux * w, bx + uy * w, by - ux * w, I3, 2)
        p.p(bx + uy * w * 0.6, by - ux * w * 0.6, (200, 204, 220))
    p.p(ex, ey, WHITE)
    # legs (a pair clutching at the lance)
    for k in range(3):
        lx = cx - 1 + k * 3
        p.lines([(lx, cy + 5), (lx + 1 + legs, cy + 10), (lx + 3 + legs * 2, cy + 12 + k)], BK1, 2)
    # thorax under chitin plates
    p.e(cx - 9, cy - 9, cx + 7, cy + 8, CH1)
    p.e(cx - 8, cy - 9, cx + 6, cy + 4, CH2)
    p.e(cx - 6, cy - 8, cx + 2, cy - 1, CH3)
    p.arc(cx - 9, cy - 9, cx + 7, cy + 8, 200, 300, CH4)
    p.l(cx - 1, cy - 9, cx + 1, cy + 7, CH0)                                  # plate seam
    for (x, y) in ((cx - 5, cy - 5), (cx + 3, cy - 4), (cx - 6, cy + 3), (cx + 4, cy + 4)):
        p.p(x, y, AU3)
    p.e(cx - 11, cy - 4, cx - 5, cy + 3, BY1)                                 # fuzz at the waist
    p.ps([(cx - 10, cy - 2), (cx - 8, cy + 2), (cx - 11, cy)], BY3)
    if crack:
        p.lines([(cx - 3, cy - 8), (cx - 1, cy - 3), (cx - 4, cy + 1)], CH0)
    # the helmed head
    hx, hy = cx + 10, cy - 6
    p.e(hx - 7, hy - 7, hx + 7, hy + 7, CH1)
    p.e(hx - 6, hy - 7, hx + 6, hy + 4, CH2)
    p.poly([(hx - 2, hy - 1), (hx + 7, hy - 2), (hx + 8, hy + 4), (hx + 2, hy + 6)], CH0)   # the face guard
    p.l(hx + 1, hy + 1, hx + 7, hy, (255, 200, 60) if visor == 1 else (255, 90, 40) if visor == 2 else CH0, 1)   # glowing visor slit
    p.l(hx + 1, hy + 2, hx + 7, hy + 1, CH1)
    p.arc(hx - 7, hy - 7, hx + 7, hy + 7, 200, 290, CH4)
    p.r(hx - 6, hy - 8, hx + 2, hy - 7, AU2)                                 # gold crest band
    for j, (ax_, ay_) in enumerate(((hx + 1, hy - 8), (hx - 2, hy - 8))):   # antenna plumes
        p.lines([(ax_, ay_), (ax_ + 4 - j * 2, ay_ - 7), (ax_ + 9 - j * 2, ay_ - 9)], BK1 if j else BK2)
        p.e(ax_ + 7 - j * 2, ay_ - 11, ax_ + 11 - j * 2, ay_ - 7, BY2 if j == 0 else BY1)
    p.l(hx + 6, hy + 6, hx + 9, hy + 9, BK2, 2)                              # mandibles
    p.l(hx + 4, hy + 6, hx + 6, hy + 10, BK2, 2)
    bee_wing(p, cx, cy - 9, -1.7 - wing * 0.8, 23, 10)
    return outline_same(cut_below(p.im, 57))


def stinger_frame(fl=None, lines_=0, **kw):
    im = stingerknight_raw(**kw)
    if lines_:
        q = Pic(64, 64)
        for j in range(4):
            y = 22 + j * 8
            q.l(2, y, 8 + lines_ * 4 - j, y, WHITE)
        im = on(q.im, im)
    if fl:
        im = flash(im, fl)
    return im


def stinger_wreck(k):
    """Crashed on its side: the abdomen limp on the floor, the lance snapped, a wing torn, the visor dark."""
    p = Pic(64, 64)
    f = 57
    bee_wing(p, 24, f - 8, -2.8, 20, 8)
    for (x, r) in ((12, 5), (17, 7), (23, 7.5)):
        p.e(x - r, f - r * 2, x + r, f, BK0); p.e(x - r + 1, f - r * 2 + 1, x + r - 1, f - 1, BY1)
    for x in (14, 20):
        p.l(x, f - 12, x + 1, f - 1, BK1, 3)
    p.e(26, f - 14, 42, f, CH1); p.e(27, f - 13, 41, f - 4, CH2)
    p.e(39, f - 12, 51, f, CH1); p.e(40, f - 11, 50, f - 3, CH2)
    p.l(44, f - 6, 50, f - 7, CH0)
    for k_ in range(3):
        p.lines([(30 + k_ * 3, f - 13), (31 + k_ * 3, f - 18), (34 + k_ * 3, f - 20 + k)], BK1, 2)
    p.poly([(4, f), (5, f - 3), (14, f - 2)], BK2)                            # the broken lance stump
    p.poly([(51, f), (60, f - 1), (53, f - 3)], BK2)                          # its point, lying in front
    im = outline_same(cut_below(p.im, f))
    if k < 2:
        q = Pic(64, 64)
        sparkles(q, 4 - k * 2, 30 + k, (20, 30, 50, 50), (WG1, WG2, WG3))
        im = on(im, q.im)
    return im


@builder('stingerknight')
def make_stingerknight():
    S = stinger_frame
    save_enemy('stingerknight', 'idle', [S(wing=(1, -1)[i % 2], bob=(0, -1, -1, 0)[i]) for i in range(4)], 64)
    save_enemy('stingerknight', 'movement', [S(wing=(1, -1)[i % 2], bob=(0, -1, -2, -1, 0, 1)[i], dx=1, aim=0.05) for i in range(6)], 64)
    # attack: it rears back, the lance drawn in, then rushes forwards with the sting thrust out
    save_enemy('stingerknight', 'attack', [S(wing=1, dx=-2, aim=-0.15, lance=0.8, visor=2, bob=-1),
                                           S(wing=-1, dx=-3, aim=-0.2, lance=0.7, visor=2, bob=-2),
                                           S(wing=1, dx=2, aim=0.05, lance=1.3, visor=2, lines_=1),
                                           S(wing=-1, dx=4, aim=0.05, lance=1.4, visor=2, lines_=2),
                                           S(wing=1, dx=5, aim=0.08, lance=1.3, visor=2, lines_=1),
                                           S(wing=-1, dx=2, aim=0.0, lance=1.0)], 64)
    save_enemy('stingerknight', 'take_damage', [S(wing=1, dx=-2, aim=-0.2, visor=0, fl=(255, 255, 255), crack=1),
                                                S(wing=-1, dx=-2, aim=-0.1, crack=1), S(wing=1, dx=-1)], 64)
    d = [S(wing=1, dx=-1, visor=2, crack=1, aim=-0.3), S(wing=0.3, visor=0, crack=1, sink=8, aim=0.3, legs=1),
         topple(S(wing=-0.5, visor=0, crack=1, sink=14, aim=0.5, legs=2, dx=-5), -30, (26, 57)), stinger_wreck(0), stinger_wreck(1), stinger_wreck(2)]
    save_enemy('stingerknight', 'death', d, 64)


# ================================================================== LARVA (drawn, 32x32: a fat white grub that crawls and spits acid)
def larva_raw(t=0.0, rear=0.0, mouth=0, eyes=1, dx=0, squash_=1.0, sink=0):
    """Side view facing right: a pale segmented grub on row 28, its body rippling as it crawls (t = phase), rear (0..1)
    lifts the head end to spit; a dark-amber head with little mandibles."""
    p = Pic(32, 32)
    f = 28
    n = 7
    seg = []
    for i in range(n):
        u = i / (n - 1)
        x = 6 + dx + u * 14 * squash_
        hump = math.sin(u * math.pi * 2 - t * math.tau) * 1.6
        y = f - 3.5 - max(0, hump) - rear * max(0, u - 0.45) * 16
        r = (2.6, 3.6, 4.2, 4.4, 4.2, 3.8, 3.4)[i] / squash_ ** 0.3
        seg.append((x, y, r))
    for (x, y, r) in seg:
        p.e(x - r, y - r, x + r, y + r, LV0)
    for (x, y, r) in seg:
        p.e(x - r + 0.8, y - r + 0.6, x + r - 0.8, y + r - 1.2, LV1)
    for (x, y, r) in seg:
        p.e(x - r * 0.6, y - r * 0.85, x + r * 0.3, y - r * 0.2, LV2)
        p.p(x - r * 0.3, y - r * 0.7, LV3)
    for (x, y, r) in seg[1:-1]:                                              # segment creases
        p.l(x + r * 0.7, y - r * 0.8, x + r * 0.7, y + r * 0.8, LV0)
    for (x, y, r) in seg[1:-1:2]:                                            # stubby legs
        p.l(x, y + r, x + 1, y + r + 1.5, LV0)
    hx, hy, hr = seg[-1]
    hx += 3
    p.e(hx - 3, hy - 3, hx + 3, hy + 3, (150, 96, 30))
    p.e(hx - 2, hy - 3, hx + 2, hy, (196, 140, 50))
    p.p(hx + 1, hy - 1, (20, 10, 10) if eyes else (150, 96, 30))
    if mouth:
        p.e(hx + 1, hy, hx + 4, hy + 3, (60, 20, 10)); p.p(hx + 3, hy + 1, G3)
    p.l(hx + 2, hy + 2, hx + 4, hy + 3, (60, 36, 14)); p.l(hx + 1, hy + 3, hx + 3, hy + 4, (60, 36, 14))
    return outline_same(cut_below(p.im, f))


def acid_glob(x, y, k, size=32):
    q = Pic(size, size)
    r = (2.0, 2.6, 3.0)[min(k, 2)]
    q.e(x - r, y - r, x + r, y + r, G1); q.p(x - r * 0.3, y - r * 0.4, G3)
    for j in range(k + 1):
        q.p(x - r - 1 - j * 2, y + 0.5, G2 if j % 2 else G1)
    return outline_same(q.im)


def larva_frame(fl=None, spit=None, drool=0, **kw):
    im = larva_raw(**kw)
    if spit:
        im = on(im, acid_glob(*spit))
    if drool:
        q = Pic(32, 32)
        q.l(25 + kw.get('dx', 0), 15, 25 + kw.get('dx', 0), 19, G2)
        im = on(im, q.im)
    if fl:
        im = flash(im, fl)
    return im


def larva_splat(k):
    """Burst: a deflated skin in a puddle of pale goo and acid."""
    p = Pic(32, 32)
    f = 28
    pool(p, 15, f, 26 - k * 0, 3, (G0, G1, G2), 4)
    p.e(5, f - 5 + k, 22, f, LV0); p.e(6, f - 4 + k, 21, f - 1, LV1)
    for x in (9, 13, 17):
        p.l(x, f - 4 + k, x, f - 1, LV0)
    p.e(21, f - 4, 26, f, (150, 96, 30)); p.p(24, f - 3, (60, 30, 10))
    return outline_same(cut_below(p.im, f))


@builder('larva')
def make_larva():
    L_ = larva_frame
    save_enemy('larva', 'idle', [L_(t=i / 4 * 0.3, rear=(0, 0.05, 0.1, 0.05)[i], eyes=0 if i == 3 else 1) for i in range(4)], 32)
    save_enemy('larva', 'movement', [L_(t=i / 6, squash_=(1.0, 0.94, 0.88, 0.94, 1.0, 1.04)[i], dx=(0, 0, 1, 2, 2, 1)[i]) for i in range(6)], 32)
    # attack: it rears its head up, gapes and spits a glob of acid forwards
    save_enemy('larva', 'attack', [L_(rear=0.3, mouth=1), L_(rear=0.6, mouth=1, drool=1), L_(rear=0.45, mouth=1, spit=(27, 10, 0)),
                                   L_(rear=0.25, spit=(29, 12, 2)), L_(rear=0.1)], 32)
    save_enemy('larva', 'take_damage', [L_(squash_=0.85, dx=-1, eyes=0, fl=(255, 255, 255)), L_(squash_=0.92, dx=-1, mouth=1), L_()], 32)
    d = [L_(rear=0.5, mouth=1, eyes=0, squash_=0.9), L_(rear=0.2, eyes=0, squash_=0.8), L_(eyes=0, squash_=0.7, sink=2),
         larva_splat(0), larva_splat(1), larva_splat(2)]
    save_enemy('larva', 'death', d, 32)


# ================================================================== BOSS: KARDINALEN (drawn: a towering cardinal in scarlet with a mitre and a great censer)
BS = 116
BS_FEET = 115


def censer_pot(p, x, y, r=6, lit=1, tilt=0.0):
    """A brass censer (thurible) hanging from its chains at (x, y - r - 4): a pierced lid with a finial, a round bowl
    with a band, embers glowing through the holes (lit 0 cold .. 2 blazing)."""
    ca, sa = math.cos(tilt), math.sin(tilt)
    R = lambda u, v: (x + u * ca - v * sa, y + u * sa + v * ca)
    p.e(x - r, y - r * 0.4, x + r, y + r, BR1)                               # bowl
    p.e(x - r + 1, y - r * 0.3, x + r - 1.5, y + r - 1.5, BR2)
    p.arc(x - r, y - r * 0.4, x + r, y + r, 200, 260, BR4)
    p.poly([R(-r, 0), R(-r * 0.7, -r * 0.9), R(0, -r * 1.4), R(r * 0.7, -r * 0.9), R(r, 0)], BR2)   # domed lid
    p.l(*R(-r, 0), *R(r, 0), BR0)
    p.l(*R(-r * 0.6, -r * 0.8), *R(0, -r * 1.3), BR4)
    p.e(*[v - 1.2 for v in R(0, -r * 1.55)], *[v + 1.2 for v in R(0, -r * 1.55)], BR3)   # finial
    hole = [F1, F2, F3][min(lit, 2)] if lit else BR0
    for (u, v) in ((-r * 0.45, -r * 0.45), (0, -r * 0.75), (r * 0.45, -r * 0.45), (-r * 0.5, r * 0.35), (r * 0.3, r * 0.45)):
        p.p(*R(u, v), hole)
    p.l(x - r + 1, y + r * 0.15, x + r - 1, y + r * 0.15, BR3)               # band
    return R(0, -r * 1.6)


def censer_on_chain(p, hx, hy, ang, ln, r=6, lit=1, smoke=2, seed=0, q=None):
    """A censer hanging from the hand (hx, hy) on ln px of chain along ang (pi/2 = straight down); smoke curls up from
    it into the layer q (or p)."""
    x, y = hx + math.cos(ang) * ln, hy + math.sin(ang) * ln
    top = (x - math.cos(ang) * (r * 1.6), y - math.sin(ang) * (r * 1.6))
    chain(p, [(hx, hy), top], (BR0, BR2, BR4))
    censer_pot(p, x, y, r, lit, ang - math.pi / 2)
    if smoke:
        smoke_wisp(q or p, x + 1, y - r * 2, smoke + 2, seed, 0.2)
    return x, y


def cardinal_frame(t=0.0, bob=0, arm=(0.9, 22), farm=(1.9, 20), cs_ang=1.35, cs_ln=30, eyes=1, mouth=0, lean=0.0, dx=0,
                   lit=1, smoke=2, sink=0, mitre=1, crozier=True, fl=None, rays=0, blood=0, trail=None, k=0):
    """Side view facing right: a tall gaunt cardinal - a scarlet cassock to the floor, its hem soaked black with blood,
    a white lace rochet, a scarlet mozzetta with gold buttons, a gold pectoral cross, a tall red-and-gold mitre with
    lappets; the near arm (arm = angle, length) swings a great brass censer on a chain (cs_ang / cs_ln), the far hand
    holds a crozier."""
    p = Pic(BS, BS)
    f = BS_FEET
    cx = 52 + dx
    top = 10 + bob + sink
    sh_y = top + 34
    ld = lean
    # crozier (behind)
    fsx, fsy = cx - 6 + ld, sh_y + 4
    fa, fl_ = farm
    fhx, fhy = fsx + math.cos(fa) * fl_ * 0.5 + math.cos(fa - 0.6) * fl_ * 0.5, fsy + math.sin(fa) * fl_ * 0.5 + math.sin(fa - 0.6) * fl_ * 0.5
    if crozier:
        sx0, sy0 = fhx + 2, fhy + 34
        sx1, sy1 = fhx - 2, max(fhy - 40, top + 14)
        p.l(sx0, sy0, sx1, sy1, AU1, 3); p.l(sx0 - 1, sy0, sx1 - 1, sy1, AU3)
        p.arc(sx1 - 2, sy1 - 12, sx1 + 10, sy1 + 1, 180, 450, AU1, 3)
        p.arc(sx1 - 2, sy1 - 12, sx1 + 10, sy1 + 1, 200, 320, AU4)
        p.e(sx1 - 2, sy1 - 2, sx1 + 2, sy1 + 3, AU2)
    p.lines([(fsx, fsy), (fsx + math.cos(fa) * fl_ * 0.5, fsy + math.sin(fa) * fl_ * 0.5), (fhx, fhy)], RD0, 7)
    p.e(fhx - 3, fhy - 3, fhx + 3, fhy + 3, PALE[1])
    # cassock
    hem = f - 1
    body = [(cx - 9 + ld, sh_y), (cx + 9 + ld, sh_y), (cx + 22, hem), (cx - 26, hem)]
    p.poly(body, RD1)
    p.poly([(cx - 9 + ld, sh_y), (cx - 3 + ld, sh_y), (cx - 12, hem), (cx - 26, hem)], RD2)
    for kx in (-16, -6, 4, 13):
        p.l(cx + kx * 0.3 + ld * 0.5, sh_y + 30, cx + kx, hem, RD0)
    p.l(cx - 26, hem, cx + 22, hem, RD0)
    # blood soaked hem
    bh = 10 + blood * 4
    p.poly([(cx - 26, hem), (cx - 24.5, hem - bh), (cx + 21, hem - bh + 2), (cx + 22, hem)], BL0)
    for x in range(int(cx - 24), int(cx + 21), 4):
        p.l(x, hem - bh, x + 1, hem - bh - 3 - (x * 7) % 5, BL0, 2)
    p.l(cx - 24, hem - bh, cx + 20, hem - bh + 2, BL1)
    # rochet (white lace)
    ry = sh_y + 40
    p.poly([(cx - 10 + ld, sh_y + 2), (cx + 10 + ld, sh_y + 2), (cx + 16 + ld * 0.4, ry), (cx - 18 + ld * 0.4, ry)], LW2)
    p.poly([(cx - 9 + ld, sh_y + 2), (cx - 3 + ld, sh_y + 2), (cx - 8 + ld * 0.4, ry), (cx - 17 + ld * 0.4, ry)], LW3)
    for kx in (-8, 0, 8):
        p.l(cx + kx * 0.4 + ld, sh_y + 20, cx + kx + ld * 0.4, ry, LW1)
    lace_hem(p, cx - 18 + ld * 0.4, cx + 16 + ld * 0.4, ry, LW2, LW1)
    for x in range(int(cx - 16 + ld * 0.4), int(cx + 15 + ld * 0.4), 3):  # lace holes
        p.p(x, ry - 3, LW0)
    # mozzetta (shoulder cape)
    p.poly([(cx - 13 + ld, sh_y - 1), (cx + 12 + ld, sh_y - 2), (cx + 15 + ld, sh_y + 17), (cx - 16 + ld, sh_y + 18)], RD2)
    p.poly([(cx - 12 + ld, sh_y), (cx - 4 + ld, sh_y - 1), (cx - 7 + ld, sh_y + 17), (cx - 15 + ld, sh_y + 17)], RD3)
    p.l(cx - 16 + ld, sh_y + 18, cx + 15 + ld, sh_y + 17, RD0)
    for y in range(int(sh_y + 2), int(sh_y + 17), 4):
        p.p(cx + 10 + ld, y, AU3)
    # pectoral cross
    pcx, pcy = cx + 6 + ld, sh_y + 21
    p.lines([(cx + 2 + ld, sh_y), (pcx, pcy - 4)], AU1)
    p.r(pcx - 1, pcy - 4, pcx + 1, pcy + 6, AU2); p.r(pcx - 3, pcy - 2, pcx + 3, pcy, AU2)
    p.p(pcx, pcy - 1, BL2)
    # head
    hx, hy = cx + 3 + ld, top + 26
    p.e(hx - 7, hy - 8, hx + 8, hy + 8, PALE[1])
    p.e(hx - 5, hy - 7, hx + 7, hy + 5, PALE[2])
    p.poly([(hx + 6, hy - 3), (hx + 11, hy + 3), (hx + 6, hy + 4)], PALE[2])   # long nose
    p.l(hx + 6, hy - 3, hx + 11, hy + 3, PALE[3])
    p.l(hx + 1, hy + 5, hx + 5, hy + 7, PALE[0])                                # hollow cheek
    ec = (255, 60, 40) if eyes == 2 else (255, 230, 200) if eyes == 3 else (200, 30, 30)
    if eyes:
        p.e(hx + 2, hy - 3, hx + 6, hy, (40, 16, 24)); p.p(hx + 4, hy - 1.5, ec)
        if eyes >= 2:
            p.p(hx + 5, hy - 2, ec)
    else:
        p.l(hx + 2, hy - 1, hx + 6, hy - 1, PALE[0])
    p.l(hx + 3, hy - 4, hx + 7, hy - 3, PALE[0])                                # brow
    if mouth:
        p.e(hx + 4, hy + 5, hx + 8, hy + 6 + mouth * 1.5, (50, 10, 20))
    else:
        p.l(hx + 5, hy + 6, hx + 8, hy + 5, PALE[0])
    # mitre with lappets
    if mitre:
        mx, my = hx - 1, hy - 7
        p.lines([(mx - 6, my + 4), (mx - 9, my + 16), (mx - 8, my + 24)], AU1, 3)    # lappet
        p.poly([(mx - 8, my + 2), (mx - 7, my - 14), (mx + 1, my - 25), (mx + 8, my - 14), (mx + 9, my + 2)], RD2)
        p.poly([(mx - 7, my + 1), (mx - 6, my - 13), (mx + 1, my - 23), (mx - 1, my - 10), (mx - 3, my + 1)], RD3)
        p.l(mx + 1, my - 24, mx + 1, my + 1, AU2, 2)                                # orphrey
        p.r(mx - 8, my - 2, mx + 9, my + 2, AU2); p.l(mx - 8, my - 2, mx + 9, my - 2, AU4)
        p.r(mx - 2, my - 18, mx + 4, my - 16, AU3); p.r(mx, my - 21, mx + 2, my - 12, AU3)
        p.e(mx - 1, my - 1, mx + 2, my + 1, GL_R[2])
    # near arm and the censer
    a, ln = arm
    sx, sy = cx + 6 + ld, sh_y + 4
    ex, ey = sx + math.cos(a) * ln * 0.5, sy + math.sin(a) * ln * 0.5
    hx2, hy2 = ex + math.cos(a - 0.5) * ln * 0.5, ey + math.sin(a - 0.5) * ln * 0.5
    q = Pic(BS, BS)
    if trail:                                                                      # the smoke ring left by the swing
        a0, a1 = trail[0], trail[-1]
        n = int(abs(a1 - a0) / 0.09) + 1
        for j in range(n):
            ta = a0 + (a1 - a0) * j / max(1, n - 1)
            u = j / max(1, n - 1)
            rr = cs_ln + math.sin(j * 1.7) * 1.5
            puff(q, hx2 + math.cos(ta) * rr, hy2 + math.sin(ta) * rr, 3.2 - u * 1.4, SMK)
    p.lines([(sx, sy), (ex, ey), (hx2, hy2)], RD1, 8)
    p.lines([(sx, sy - 2), (ex, ey - 2)], RD3, 2)
    p.l(hx2 - math.cos(a - 0.5) * 4, hy2 - math.sin(a - 0.5) * 4, hx2 - math.cos(a - 0.5) * 2, hy2 - math.sin(a - 0.5) * 2, LW3, 7)   # lace cuff
    p.e(hx2 - 3, hy2 - 3, hx2 + 3, hy2 + 3, PALE[1]); p.e(hx2 - 2, hy2 - 3, hx2 + 2, hy2, PALE[2])
    p.p(hx2 + 2, hy2 - 2, GL_R[1])                                                  # the cardinal's ring
    censer_on_chain(p, hx2, hy2, cs_ang, cs_ln, 8, lit, smoke, int(t * 10) + k, q)
    im = outline_same(cut_below(p.im, f))
    im = on(im, outline_same(cut_below(q.im, f)))
    if rays:                                                                       # blood-red holy light
        r = Pic(BS, BS)
        for j in range(12):
            aa = j / 12 * math.tau + t
            r0, r1 = 26, 26 + rays * 10 + (j % 2) * 8
            r.l(hx + math.cos(aa) * r0, hy - 10 + math.sin(aa) * r0, hx + math.cos(aa) * r1, hy - 10 + math.sin(aa) * r1, (255, 110, 90) if j % 2 else (255, 220, 160), 2 if j % 2 == 0 else 1)
        im = on(outline_same(r.im), im)
    if blood:
        r = Pic(BS, BS)
        blood_drops(r, 6 + blood * 6, 30 + k, (cx - 40, top, cx + 40, f - 4))
        im = on(im, r.im)
    if fl:
        im = flash(im, fl)
    return im


def cardinal_fallen(k):
    """He has collapsed face down in a heap of scarlet; the mitre has rolled off, the censer lies on its side still
    smoking, and a pool of blood spreads from under him (k = 0..2)."""
    p = Pic(BS, BS)
    f = BS_FEET
    pool(p, 54, f, 70 + k * 12, 5, (BL0, BL1, BL3), 7)
    p.poly([(18, f), (26, f - 14), (50, f - 20), (72, f - 16), (86, f - 6), (90, f)], RD1)
    p.poly([(26, f - 13), (50, f - 19), (60, f - 18), (44, f - 10), (30, f - 6)], RD2)
    p.poly([(44, f - 18), (58, f - 22), (70, f - 18), (60, f - 12)], LW2)        # rochet lace
    for x0 in (32, 46, 62, 76):
        p.l(x0, f - 14, x0 + 4, f, RD0)
    p.e(76, f - 16, 90, f - 4, PALE[1]); p.e(78, f - 15, 88, f - 7, PALE[2])      # the head, face down
    p.l(60, f - 12, 94, f - 3, RD1, 7); p.e(92, f - 6, 98, f, PALE[1])            # an arm stretched out
    p.lines([(14, f - 10), (40, f - 6), (70, f - 2)], AU1, 3)                     # the crozier
    p.arc(8, f - 16, 20, f - 4, 90, 360, AU1, 3)
    q = Pic(BS, BS)
    q.poly([(100, f), (102, f - 9), (110, f - 16), (113, f - 10), (110, f)], RD2)  # the mitre, rolled off
    q.l(102, f - 8, 111, f - 14, AU2, 2); q.r(101, f - 2, 111, f, AU2)
    censer_pot(q, 26, f - 7, 7, 2 - k, 1.4)
    chain(q, [(30, f - 2), (48, f - 1), (64, f - 3)], (BR0, BR2, BR4))
    im = on(outline_same(cut_below(p.im, f)), outline_same(cut_below(q.im, f)))
    s_ = Pic(BS, BS)
    smoke_wisp(s_, 24, f - 14, 4 - k, 50 + k, 0.4 + k * 0.2)
    return on(im, outline_same(s_.im))


@builder('cardinal')
def make_cardinal():
    C = cardinal_frame
    sv = lambda st, fr: save(cells(fr, BS, BS), G_OUT + f'boss_cardinal_{st}.png', len(fr))
    sv('idle', [C(t=i / 5, bob=(0, 0, 1, 1, 0)[i], cs_ang=1.35 + math.sin(i / 5 * math.tau) * 0.18, k=i, eyes=0 if i == 4 else 1) for i in range(5)])
    # attack (the 'ring'): he whirls the censer round in a full circle on its chain, leaving a ring of smoke
    angs = [0.6, -0.4, -1.9, 2.9, 1.8, 1.35]
    sv('attack', [C(t=i / 6, arm=(0.2 - (i in (1, 2, 3)) * 0.4, 22), cs_ang=angs[i], cs_ln=28, eyes=2, mouth=(1 if i in (1, 2, 3) else 0),
                    lean=(-1, 0, 2, 3, 1, 0)[i], trail=[angs[i] - 0.5 - j * 0.45 for j in range(4)] if 0 < i < 5 else None, lit=2, k=i)
                  for i in range(6)])
    # cast (the 'light'): he lifts the censer high, red light blazes round him and blood rains down
    sv('cast', [C(t=i / 6 * 0.5, arm=(-1.2 - (i in (2, 3, 4)) * 0.3, 22), farm=(-1.6, 20), cs_ang=1.4, cs_ln=16, eyes=(2, 3, 3, 3, 3, 2)[i],
                  mouth=(0, 1, 2, 2, 1, 0)[i], rays=(0, 1, 2, 3, 2, 0)[i], blood=(0, 0, 1, 2, 1, 0)[i], lit=2, smoke=3, bob=-(i in (2, 3)) * 2, k=i)
                for i in range(6)])
    sv('hurt', [C(dx=-4, eyes=2, mouth=2, lean=-3, fl=(255, 255, 255), cs_ang=1.0, k=1), C(dx=-2, eyes=2, mouth=1, cs_ang=1.15, k=2), C(dx=-1, cs_ang=1.3)])
    d = [C(eyes=3, mouth=2, rays=2, blood=1, lean=-3, cs_ang=0.9, arm=(-0.4, 22)),
         C(eyes=2, mouth=2, blood=2, sink=6, lean=-2, cs_ang=1.6, arm=(1.2, 20), crozier=False),
         C(eyes=0, mouth=1, blood=1, sink=18, lean=2, cs_ang=1.7, arm=(1.5, 20), crozier=False, mitre=0, smoke=1),
         topple(C(eyes=0, lean=4, cs_ang=1.7, arm=(1.6, 20), crozier=False, mitre=0, smoke=0, dx=-34), -66, (32, BS_FEET), BS_FEET)]
    d += [cardinal_fallen(0), cardinal_fallen(1), cardinal_fallen(2)]
    sv('death', d)


# ================================================================== BOSS: BIDROTTNINGEN (drawn: an enormous queen bee with a crown, great wings and a sting)
def mini_bee(p, x, y, k=0):
    """A tiny worker bee (6 px) for swarms round the queen."""
    p.e(x - 3, y - 1.5, x + 1, y + 2, BY1); p.l(x - 2, y - 1, x - 2, y + 2, BK1); p.l(x, y - 1, x, y + 2, BK1)
    p.e(x + 1, y - 1, x + 3, y + 1.5, BK1)
    p.e(x - 2, y - 4 + k % 2, x + 1, y - 1, WG2)


def queenbee_frame(t=0.0, bob=0, wing=0.0, lean=0.0, dx=0, sting=0.0, eyes=1, mouth=0, sink=0, crown=1, pulse=0.0, legs=0.0,
                   fl=None, lines_=0, swarm=0, honey=None, k=0):
    """Side view facing right, hovering low: a long queen's abdomen sweeping down behind her (pulse swells it) with its
    sting (sting 0 trailing .. 1 curled forwards), a fuzzy golden thorax with a white ruff like ermine, six clawed legs,
    a head with great dark eyes, feathered antennae and a gold crown, two pairs of great wings (wing -1..1)."""
    p = Pic(BS, BS)
    f = BS_FEET
    cx, cy = 64 + dx, 59 + bob + sink
    L = lean
    bee_wing(p, cx - 6, cy - 12, -2.05 - wing * 0.7, 40, 17, tuple(dark(c, 0.78) for c in (WG0, WG1, WG2, WG3)))
    bee_wing(p, cx - 8, cy - 8, -2.5 - wing * 0.6, 34, 14, tuple(dark(c, 0.78) for c in (WG0, WG1, WG2, WG3)))
    # far legs
    for j in range(3):
        lx = cx - 2 + j * 7 + L
        p.lines([(lx, cy + 10), (lx + 2 + legs * 4, cy + 22), (lx + 6 + legs * 8 + j * 2, cy + 30)], BK1, 3)
    # abdomen
    tip = (cx - 38 - L * 0.5 + sting * 26, f - 6 - sting * 22)
    pts = bez((cx - 8, cy + 6), (cx - 36, cy + 14), tip, 9)
    rad = [11, 14, 16, 16.5, 16, 15, 12.5, 9.5, 6]
    rad = [r * (1 + pulse * 0.08 * math.sin(i * 1.3)) for i, r in enumerate(rad)]
    for (x, y), r in zip(pts, rad):
        p.e(x - r, y - r, x + r, y + r, BK0)
    for (x, y), r in zip(pts, rad):
        p.e(x - r + 1.5, y - r + 1.5, x + r - 1.5, y + r - 1.5, BY1)
    for j in (1, 3, 5, 7):
        (x, y), r = pts[j], rad[j]
        (x2, y2) = pts[j + 1]
        nx, ny = -(y2 - y), (x2 - x)
        nl = math.hypot(nx, ny) or 1
        nx, ny = nx / nl, ny / nl
        p.l(x - nx * (r - 1), y - ny * (r - 1), x + nx * (r - 1), y + ny * (r - 1), BK1, 5)
    for (x, y), r in list(zip(pts, rad))[1:7]:
        p.e(x - r * 0.55, y - r * 0.85, x + r * 0.15, y - r * 0.35, BY2)
        p.p(x - r * 0.3, y - r * 0.7, BY3)
    if pulse > 0.5:
        (x, y), r = pts[4], rad[4]
        p.e(x - r * 0.4, y - r * 0.2, x + r * 0.4, y + r * 0.6, HN3)
    (tx, ty) = pts[-1]
    (px, py) = pts[-2]
    ux, uy = tx - px, ty - py
    ul = math.hypot(ux, uy) or 1
    ux, uy = ux / ul, uy / ul
    ca = math.atan2(uy, ux) + sting * 1.2
    p.poly([(tx - uy * 3, ty + ux * 3), (tx + uy * 3, ty - ux * 3), (tx + math.cos(ca) * 14, ty + math.sin(ca) * 14)], BK2)
    p.l(tx, ty, tx + math.cos(ca) * 13, ty + math.sin(ca) * 13, BK3)
    # thorax
    p.e(cx - 16 + L, cy - 16, cx + 12 + L, cy + 14, BY0)
    p.e(cx - 15 + L, cy - 16, cx + 10 + L, cy + 8, BY1)
    p.e(cx - 11 + L, cy - 15, cx + 3 + L, cy - 2, BY2)
    r2 = random.Random(9)
    for _ in range(26):                                                               # fuzz
        a = r2.uniform(0, math.tau); rr = r2.uniform(10, 14)
        p.p(cx - 2 + L + math.cos(a) * rr, cy - 1 + math.sin(a) * rr * 1.05, r2.choice((BY3, BY0, BY2)))
    for j in range(7):                                                                # the ermine ruff
        a = -0.9 + j * 0.3
        x, y = cx + 8 + L + math.cos(a) * 5, cy - 4 + math.sin(a) * 9
        p.e(x - 4, y - 4, x + 4, y + 4, LW3 if j % 2 else LW2)
        if j % 3 == 1:
            p.p(x, y, BK0)
    # near legs
    for j in range(3):
        lx = cx + j * 7 + L
        kx, ky = lx + 4 + legs * 5, cy + 22 - j * 2
        ex, ey = kx + 6 + legs * 10 + j * 3, cy + 34 + j * 2 - legs * 6
        p.lines([(lx, cy + 8), (kx, ky), (ex, ey)], BK0, 3)
        p.lines([(lx, cy + 7), (kx, ky - 1), (ex, ey - 1)], BK2)
        p.e(kx - 1.5, ky - 1.5, kx + 1.5, ky + 1.5, BK1)
        p.l(ex, ey, ex + 3, ey + 1, BK2, 2); p.l(ex, ey, ex + 2, ey - 2, BK2, 2)
    # head
    hx, hy = cx + 20 + L * 1.5, cy - 8
    p.e(hx - 11, hy - 11, hx + 11, hy + 11, BK1)
    p.e(hx - 10, hy - 11, hx + 9, hy + 6, BK2)
    p.e(hx - 3, hy - 9, hx + 9, hy + 5, BK0)                                          # the great compound eye
    for (ex_, ey_) in ((hx + 1, hy - 5), (hx + 4, hy - 3), (hx + 1, hy - 1), (hx + 5, hy + 1)):
        p.p(ex_, ey_, (70, 60, 90))
    if eyes:
        p.e(hx + 1, hy - 7, hx + 4, hy - 4, (150, 140, 180) if eyes == 1 else (255, 120, 60))
    p.e(hx + 5, hy + 5, hx + 12, hy + 12, BK1)                                        # mandibles
    jaw = 3 if mouth else 0
    p.l(hx + 8, hy + 8, hx + 14, hy + 10 - jaw, BK3, 2); p.l(hx + 7, hy + 10, hx + 12, hy + 14 + jaw, BK3, 2)
    for j, (ax_, ay_) in enumerate(((hx + 2, hy - 10), (hx - 2, hy - 10))):        # feathered antennae
        pts_a = [(ax_, ay_), (ax_ + 6 - j * 3, ay_ - 10), (ax_ + 16 - j * 4, ay_ - 14 + j * 2)]
        p.lines(pts_a, BK2 if j == 0 else BK1, 2)
        for s_ in range(4):
            x_, y_ = ax_ + 8 + s_ * 2 - j * 3, ay_ - 11 - s_ * 0.6 + j * 2
            p.l(x_, y_, x_ + 1, y_ - 3, BK1)
    if crown:                                                                       # a tall gold crown set with jewels
        cxw, cyw = hx - 3, hy - 12
        S = 1.5
        C_ = lambda pts: [(cxw + u * S, cyw + v * S) for u, v in pts]
        p.poly(C_([(-8, 3), (-9, -6), (-5, -2), (-2, -9), (1, -2), (5, -8), (6, 3)]), AU2)
        p.poly(C_([(-7, 2), (-7, -3), (-5, 0), (-2, -6), (0, 0)]), AU3)
        p.poly(C_([(-8, 1), (6, 1), (6, 4), (-8, 4)]), AU1); p.l(*C_([(-8, 1)])[0], *C_([(6, 1)])[0], AU4)
        for (u, v) in ((-9, -6), (-2, -9), (5, -8)):
            x_, y_ = C_([(u, v)])[0]
            p.e(x_ - 1.6, y_ - 1.6, x_ + 1.6, y_ + 1.6, AU4)
        for (u, c) in ((-5, GL_R[1]), (-1, GL_B[1]), (3, GL_R[1])):
            x_, y_ = C_([(u, 2.5)])[0]
            p.e(x_ - 1.3, y_ - 1.3, x_ + 1.3, y_ + 1.3, c)
    bee_wing(p, cx - 3, cy - 14, -1.85 - wing * 0.7, 43, 19)
    bee_wing(p, cx - 5, cy - 9, -2.35 - wing * 0.6, 34, 14)
    im = outline_same(cut_below(p.im, f))
    q = Pic(BS, BS)
    if lines_:
        for j in range(5):
            y = 30 + j * 14
            q.l(2, y, 12 + lines_ * 6 - j * 2, y, WHITE)
        im = on(q.im, im)
        q = Pic(BS, BS)
    if swarm:
        r3 = random.Random(60 + k)
        for _ in range(swarm):
            mini_bee(q, r3.uniform(8, 108), r3.uniform(8, 80), r3.randrange(2))
    if honey:
        for (x, y, r) in honey:
            q.e(x - r, y - r, x + r, y + r, HN2); q.e(x - r + 1, y - r + 1, x + r * 0.2, y + r * 0.2, HN3); q.p(x - r * 0.4, y - r * 0.4, HN4)
            q.l(x - r - 2, y, x - r - 6, y + 1, HN2)
    if swarm or honey:
        im = on(im, outline_same(q.im))
    if fl:
        im = flash(im, fl)
    return im


def queenbee_fallen(k):
    """Fallen on her side: the long abdomen across the floor, the wings crumpled and torn over her, the legs curled,
    the crown rolled away in a spreading puddle of honey (k = 0..2)."""
    p = Pic(BS, BS)
    f = BS_FEET
    pool(p, 56, f, 78 + k * 10, 5, (HN0, HN2, HN4), 9)
    pts = [(14 + i * 7, f - 13 + abs(i - 3) * 0.6) for i in range(7)]
    rad = [8, 11, 12.5, 13, 12.5, 11.5, 10]
    for (x, y), r in zip(pts, rad):
        p.e(x - r, y - r, x + r, y + r, BK0)
    for (x, y), r in zip(pts, rad):
        p.e(x - r + 1.5, y - r + 1.5, x + r - 1.5, y + r - 1.5, BY1)
    for j in (1, 3, 5):
        (x, y), r = pts[j], rad[j]
        p.l(x, y - r + 1, x, y + r - 1, BK1, 4)
    p.poly([(4, f - 12), (8, f - 15), (8, f - 9)], BK2)                               # the sting
    p.e(56, f - 26, 84, f, BY0); p.e(58, f - 25, 82, f - 6, BY1)                       # thorax
    p.e(80, f - 22, 100, f - 2, BK1); p.e(81, f - 21, 98, f - 8, BK2); p.e(87, f - 19, 98, f - 9, BK0)   # head
    p.ps([(90, f - 16), (93, f - 14), (95, f - 17)], (70, 60, 90)); p.l(88, f - 12, 92, f - 12, BK3)        # dull eye, shut
    p.l(97, f - 5, 103, f - 2, BK3, 2); p.l(96, f - 3, 101, f, BK3, 2)                                       # mandibles
    for j in range(3):
        x = 62 + j * 7
        p.lines([(x, f - 24), (x + 2, f - 32 + k), (x + 6, f - 34 + k * 1.5)], BK1, 3)
    bee_wing(p, 62, f - 22, -2.7, 40, 14, tuple(dark(c, 0.85) for c in (WG0, WG1, WG2, WG3)))
    bee_wing(p, 66, f - 20, -2.95, 34, 12)
    q = Pic(BS, BS)
    q.poly([(102, f), (101, f - 7), (104, f - 4), (107, f - 9), (110, f - 4), (113, f - 8), (113, f)], AU2)   # the crown, toppled
    q.r(101, f - 2, 113, f, AU1); q.p(107, f - 9, AU4)
    return on(outline_same(cut_below(p.im, f)), outline_same(cut_below(q.im, f)))


@builder('queenbee')
def make_queenbee():
    Q = queenbee_frame
    sv = lambda st, fr: save(cells(fr, BS, BS), G_OUT + f'boss_queenbee_{st}.png', len(fr))
    sv('idle', [Q(t=i / 5, wing=(1, -1, 1, -1, 1)[i], bob=(0, -1, -2, -1, 0)[i], pulse=(0, 0.3, 0.6, 0.3, 0)[i], eyes=0 if i == 4 else 1) for i in range(5)])
    # attack (the dash): she rears back, then lunges forwards, legs reaching and the sting curled under like a lance
    sv('attack', [Q(wing=1, lean=-4, dx=-6, sting=0.3, eyes=2, mouth=1),
                  Q(wing=-1, lean=-6, dx=-8, sting=0.6, eyes=2, mouth=1, bob=-2),
                  Q(wing=1, lean=2, dx=0, sting=1.0, eyes=2, mouth=1, legs=0.6, lines_=1),
                  Q(wing=-1, lean=3, dx=2, sting=1.0, eyes=2, mouth=1, legs=0.6, lines_=2),
                  Q(wing=1, lean=3, dx=4, sting=0.6, eyes=2, legs=0.5),
                  Q(wing=-1, dx=0, sting=0.2)])
    # cast (honey / the swarm): her abdomen pulses, she spits globs of honey and the workers swarm out round her
    sv('cast', [Q(t=i / 6, wing=(1, -1)[i % 2], pulse=(0.4, 0.8, 1.0, 1.0, 0.8, 0.3)[i], eyes=2, mouth=(0, 1, 1, 1, 1, 0)[i],
                  swarm=(0, 3, 6, 9, 7, 2)[i], k=i,
                  honey=[[], [(96, 52, 3)], [(102, 50, 4), (92, 62, 3)], [(108, 48, 4), (100, 64, 4)], [(110, 60, 3)], []][i])
                for i in range(6)])
    sv('hurt', [Q(wing=1, dx=-5, lean=-4, eyes=0, fl=(255, 255, 255), mouth=1), Q(wing=-1, dx=-3, lean=-2, eyes=2), Q(wing=1, dx=-1)])
    d = [Q(wing=1, lean=-4, eyes=2, mouth=1, pulse=1.0, swarm=4, k=7), Q(wing=-0.5, lean=-2, eyes=0, mouth=1, sink=14, sting=0.4),
         Q(wing=0.2, eyes=0, sink=30, crown=0, legs=1, sting=0.6), topple(Q(wing=-0.2, eyes=0, sink=40, crown=0, legs=1, dx=-12), -35, (50, BS_FEET), BS_FEET)]
    d += [queenbee_fallen(0), queenbee_fallen(1), queenbee_fallen(2)]
    sv('death', d)


# ================================================================== PROPS
def pew():
    """An oak church pew seen from the front and a little to the side: a slatted backrest, the seat, carved bench ends
    with poppyhead finials, a hymn book left on the seat."""
    p = Pic(52, 32)
    O = OAK
    p.poly([(6, 4), (44, 4), (46, 16), (8, 16)], O[1])                        # backrest
    for y in (6, 10, 14):
        p.l(7, y, 45, y, O[2]); p.l(7, y + 1, 45, y + 1, O[0])
    p.l(6, 4, 44, 4, O[4])
    p.poly([(8, 16), (46, 16), (48, 21), (10, 21)], O[2])                     # seat
    p.l(8, 16, 46, 16, O[4]); p.l(10, 21, 48, 21, O[0])
    p.r(10, 21, 48, 23, O[1])
    for x in (14, 42):                                                        # legs / kneeler rail
        p.r(x, 23, x + 2, 30, O[0])
    p.l(12, 28, 46, 28, O[1], 2)
    for x0, sd in ((2, -1), (44, 1)):                                         # the carved bench ends
        p.poly([(x0, 31), (x0, 6), (x0 + 2, 2), (x0 + 5, 2), (x0 + 7, 6), (x0 + 7, 31)], O[2])
        p.l(x0, 6, x0, 31, O[3]); p.l(x0 + 7, 6, x0 + 7, 31, O[0])
        p.e(x0 + 1, -1, x0 + 6, 5, O[3]); p.p(x0 + 3, 0, O[4])               # poppyhead
        p.r(x0 + 2, 10, x0 + 5, 26, O[1]); p.l(x0 + 2, 10, x0 + 5, 10, O[0])   # sunk panel
        p.arc(x0 + 2, 9, x0 + 5, 14, 180, 360, O[4])
    p.r(24, 13, 31, 16, BOOK_C[1]); p.l(24, 13, 31, 13, BOOK_C[2]); p.r(31, 14, 31, 16, LW2)   # a hymn book on the seat
    p.p(26, 14, AU2)
    return outline(cut_below(p.im, 31))


def bloodfont(k):
    """A stone baptismal font brimming with blood: an octagonal bowl on a moulded pedestal, blood running over the lip
    (0); smashed (1): the bowl broken open, a chunk fallen, the blood spilled in a pool."""
    p = Pic(40, 40)
    f = 39
    if k == 1:
        pool(p, 20, f, 38, 5, (BL0, BL1, BL3), 3)
    p.r(14, 22, 25, 34, CS2); p.l(14, 22, 14, 34, CS4); p.l(25, 22, 25, 34, CS0)   # pedestal
    for y in (26, 30):
        p.l(14, y, 25, y, CS1)
    p.poly([(10, 39), (11, 34), (28, 34), (29, 39)], CS2); p.l(11, 34, 28, 34, CS4); p.l(10, 39, 29, 39, CS0)   # base
    p.poly([(12, 22), (27, 22), (30, 19), (9, 19)], CS1)                       # stem collar
    if k == 0:
        p.poly([(4, 8), (35, 8), (33, 16), (27, 21), (12, 21), (6, 16)], CS2)      # the bowl
        p.poly([(4, 8), (13, 8), (12, 21), (6, 16)], CS3)
        p.l(13, 9, 12, 20, CS4); p.l(27, 9, 27, 20, CS1)
        for x in (8, 20, 31):                                                    # carved quatrefoils
            p.e(x - 2, 12, x + 2, 16, CS1); p.p(x, 14, CS3)
        p.e(4, 5, 35, 11, CS3); p.e(5, 6, 34, 10, BL1)                           # rim and the blood
        p.e(8, 6, 26, 9, BL2); p.l(10, 7, 18, 7, BL3)
        for (x, ln) in ((7, 6), (15, 10), (30, 8), (23, 4)):
            p.l(x, 9, x, 9 + ln, BL1); p.p(x, 10 + ln, BL2)
    else:
        p.poly([(4, 11), (16, 9), (17, 14), (13, 21), (12, 21), (6, 16)], CS2)  # what is left of the bowl
        p.poly([(4, 11), (11, 10), (11, 20), (6, 16)], CS3)
        p.poly([(23, 12), (34, 10), (33, 16), (27, 21), (22, 18)], CS2)
        p.lines([(16, 9), (18, 13), (17, 16), (19, 19)], CS0)
        p.e(13, 12, 25, 16, BL0); p.l(15, 13, 20, 13, BL1)
        for (x, ln) in ((14, 13), (20, 16), (25, 12)):
            p.l(x, 15, x, 15 + ln, BL1)
        p.poly([(30, 33), (33, 28), (39, 29), (38, 35), (33, 36)], CS2)        # a fallen chunk
        p.l(33, 28, 39, 29, CS4)
        p.poly([(1, 36), (3, 33), (7, 34), (6, 37)], CS1)
    im = outline(cut_below(p.im, f))
    if k == 0:
        r = Pic(im.width, im.height)
        halo(r, 21, 8, 16, (BL2, BL3), 8, 2)
        im = on(r.im, im)
    return im


def bell(k):
    """A great bronze bell in a heavy oak frame (two posts, a crossbeam, braces): 0 hangs still; 1 swings, its clapper
    striking, with rings of sound."""
    p = Pic(48, 56)
    O = OAK
    for x in (3, 40):                                                          # posts
        p.r(x, 6, x + 4, 55, O[2]); p.l(x, 6, x, 55, O[3]); p.l(x + 4, 6, x + 4, 55, O[0])
        p.r(x - 2, 52, x + 6, 55, O[1])
    p.r(1, 3, 46, 8, O[2]); p.l(1, 3, 46, 3, O[4]); p.l(1, 8, 46, 8, O[0])      # crossbeam
    for (x0, x1) in ((7, 13), (40, 34)):                                       # braces
        p.l(x0, 22, x1, 8, O[1], 2)
    p.r(20, 8, 27, 11, I1); p.l(20, 8, 27, 8, I3)                              # headstock
    q = Pic(48, 56)
    cx, top = 23.5, 11
    q.poly([(cx - 4, top), (cx + 4, top), (cx + 6, top + 6), (cx + 7, top + 20), (cx + 12, top + 27), (cx - 12, top + 27), (cx - 7, top + 20), (cx - 6, top + 6)], BZ2)
    q.poly([(cx - 4, top), (cx - 1, top), (cx - 3, top + 6), (cx - 4, top + 20), (cx - 9, top + 27), (cx - 12, top + 27), (cx - 7, top + 20), (cx - 6, top + 6)], BZ3)
    q.l(cx - 5, top + 2, cx - 6, top + 19, BZ4)
    q.l(cx + 5, top + 6, cx + 6, top + 20, BZ1)
    q.r(cx - 12, top + 24, cx + 12, top + 27, BZ1); q.l(cx - 12, top + 24, cx + 12, top + 24, BZ4)   # sound bow
    q.l(cx - 6, top + 8, cx + 6, top + 8, BZ1)
    q.e(cx - 2, top + 12, cx + 2, top + 16, BZ3); q.p(cx, top + 14, BZ1)       # a little cross / medallion
    q.l(cx, top + 27, cx + (3 if k else 0), top + 31, I2, 2)                   # clapper
    q.e(cx - 2 + (3 if k else 0), top + 30, cx + 2 + (3 if k else 0), top + 33, I1)
    bl = outline_same(q.im)
    if k:
        bl = bl.rotate(-24, resample=Image.NEAREST, center=(cx, top))
    p.paste(bl, 0, 0)
    p.l(44, 20, 46, 50, (200, 180, 140))                                       # the bell rope
    im = outline(cut_below(p.im, 55))
    if k:
        r = Pic(im.width, im.height)
        for j in range(2):
            rr = 8 + j * 5
            r.arc(40 - rr, 34 - rr, 40 + rr, 34 + rr, -60, 20, WHITE if j == 0 else (220, 220, 236))
            r.arc(8 - rr, 34 - rr, 8 + rr, 34 + rr, 160, 240, WHITE if j == 0 else (220, 220, 236))
        im = on(im, r.im)
    return im


def larvasac(k):
    """A sac of pale wax stuck to the floor with a larva curled up inside, showing through as a darker shape (0); burst
    (1): the shell split open and empty, goo and acid spilled round it (hatched or smashed)."""
    p = Pic(30, 32)
    f = 31
    pool(p, 15, f, 28, 4, (WX1, WX2, WX3), 5) if k == 0 else pool(p, 15, f, 30, 4, (G0, G1, G2), 5)
    if k == 0:
        p.e(4, 4, 26, 31, WX2); p.e(5, 4, 24, 28, RJ0); p.e(7, 5, 17, 18, RJ1)   # a translucent sac of pale wax
        for j, (x, y) in enumerate(((19, 13), (20, 18), (18, 23), (14, 25), (10, 22), (10, 17))):   # the curled larva inside
            p.e(x - 3, y - 3, x + 3, y + 3, (196, 160, 96) if j % 2 else (176, 140, 80))
        p.e(11, 11, 17, 16, (150, 100, 40)); p.p(15, 13, (60, 30, 10))
        p.e(13, 16, 17, 21, RJ0)
        for y in (12, 17, 22):
            p.l(5, y, 7, y + 1, WX2)
        p.p(9, 7, RJ2); p.p(8, 9, RJ2); p.p(10, 6, RJ2)
        p.l(15, 1, 15, 4, WX2); p.l(13, 2, 15, 4, WX1)                           # wax strands up to the ceiling
    else:
        p.poly([(3, 31), (4, 18), (7, 10), (10, 15), (12, 31)], WX1)           # the two halves of the shell
        p.poly([(5, 30), (5, 19), (7, 13), (9, 17), (10, 30)], WX2)
        p.poly([(17, 31), (19, 14), (22, 9), (25, 16), (27, 31)], WX1)
        p.poly([(19, 30), (20, 17), (22, 12), (24, 18), (25, 30)], WX3)
        p.e(9, 24, 21, 31, (70, 40, 14)); p.e(10, 25, 20, 30, G1)              # goo inside
        for (x, y) in ((7, 10), (22, 9), (12, 15), (25, 16)):
            p.p(x, y, WX0)
    return outline(cut_below(p.im, f))


@builder('props')
def make_props():
    save_prop('pew', [pew()])
    save_prop('bloodfont', [bloodfont(k) for k in range(2)])
    save_prop('bell', [bell(k) for k in range(2)])
    save_prop('larvasac', [larvasac(k) for k in range(2)])


# ================================================================== ITEMS, PARTICLES, HUD AND TOUCH ICONS
@builder('items')
def make_items():
    p = Pic(18, 18)                                                            # a straw skep of bees (ammo for the hive launcher)
    p.e(1, 2, 16, 22, WX1)
    for j, y in enumerate((4, 7, 10, 13)):                                     # coiled straw bands
        w = (4, 6, 7, 7.5)[j]
        p.l(8.5 - w, y, 8.5 + w, y, WX0); p.l(8.5 - w + 1, y - 1, 8.5 + w - 1, y - 1, WX3)
    p.e(4, 1, 13, 7, WX2); p.p(6, 2, WX4)
    p.e(6, 12, 11, 17, (40, 20, 6))                                            # entrance
    p.r(0, 15, 17, 17, WD2); p.l(0, 15, 17, 15, WD4)                           # board
    p.p(9, 13, HN3)
    im = outline_same(cut_below(p.im, 17))
    q = Pic(18, 18)
    mini_bee(q, 15, 4, 0); mini_bee(q, 3, 9, 1)
    save(hard(on(im, outline_same(q.im))), G_OUT + 'item_beehive.png')
    # the censer's pickup: a brass censer hanging from its chain and ring, a wisp of smoke
    p = Pic(18, 30)
    p.eo(6, 0, 11, 4, BR3)
    chain(p, [(8.5, 4), (8.5, 13)], (BR0, BR2, BR4))
    censer_pot(p, 8.5, 22, 7, 2)
    im = outline_same(p.im)
    q = Pic(18, 30)
    smoke_wisp(q, 14, 14, 3, 5, 0.0, spread=0.5)
    save(hard(on(outline_same(q.im), im)), G_OUT + 'pick_censer.png')
    # the hive launcher's pickup: a wooden hive on a stock with a brass pipe, wax oozing at the seams, a bee
    p = Pic(52, 22)
    p.poly([(0, 11), (14, 9), (15, 14), (2, 17)], WD2); p.l(0, 11, 14, 9, WD4)   # stock
    p.poly([(11, 13), (16, 13), (14, 20), (10, 20)], WD1)                         # grip
    p.r(15, 3, 36, 17, WD2)                                                       # hive body: staves and hoops
    for x in (17, 21, 25, 29, 33):
        p.l(x, 3, x, 17, WD1)
    p.l(15, 3, 36, 3, WD4); p.l(15, 17, 36, 17, WD0)
    for x in (19, 31):
        p.r(x, 2, x + 1, 18, BR2); p.l(x, 2, x, 18, BR4)
    p.poly([(14, 3), (11, 6), (11, 14), (14, 17)], WX2); p.poly([(36, 3), (39, 6), (39, 14), (36, 17)], WX2)   # waxed ends
    p.l(37, 7, 37, 13, WX4)
    p.r(39, 8, 49, 12, BR2); p.l(39, 8, 49, 8, BR4); p.l(39, 12, 49, 12, BR0)    # the pipe
    p.r(48, 6, 51, 14, BR3); p.l(48, 6, 48, 14, BR4)
    p.e(22, 11, 28, 16, HN2); p.l(23, 16, 23, 20, HN2); p.p(23, 21, HN3)          # a honey leak
    im = outline_same(p.im)
    q = Pic(52, 22)
    mini_bee(q, 44, 4, 0)
    save(hard(on(im, outline_same(q.im))), G_OUT + 'pick_hivelauncher.png')


@builder('particles')
def make_particles():
    fr = []                                                                    # a golden note (2 frames 8x8)
    for k in range(2):
        p = Pic(8, 8)
        note_glyph(p, 0.5 + k * 0.5, 5 - k * 0.5 + (k == 1) * 1, k, AU3, AU4)
        fr.append(outline_same(p.im))
    save(cells(fr, 8, 8), G_OUT + 'part_note2.png', 2)                         # part_note.png exists
    fr = []                                                                    # a honey drop (2 frames 6x6)
    for k in range(2):
        p = Pic(6, 6)
        if k == 0:
            p.e(1, 1, 4, 5, HN2); p.p(2, 0, HN2); p.p(2, 2, HN4)
        else:
            p.e(0, 2, 5, 5, HN2); p.p(1, 3, HN4); p.p(4, 4, HN1)
        fr.append(outline_same(p.im))
    save(cells(fr, 6, 6), G_OUT + 'part_honey.png', 2)
    fr = []                                                                    # incense smoke (3 frames 12x12, curling and thinning)
    for k in range(3):
        p = Pic(12, 12)
        pal = SMK if k < 2 else (dark(SMK[0], 0.9), SMK[0], SMK[1], SMK[2])
        puff(p, 6 - k * 0.5, 7, (2.0, 3.0, 3.6)[k], pal)
        if k:
            puff(p, 4 + k, 4 - k * 0.5, (0, 2.0, 2.6)[k], pal)
        if k == 2:
            puff(p, 8, 9, 2.0, pal)
        fr.append(outline_same(p.im))
    save(cells(fr, 12, 12), G_OUT + 'part_smoke3.png', 3)                       # part_smoke / part_smoke2 exist
    p = Pic(8, 8)                                                               # HUD: blessed (a radiant cross)
    p.bitmap(0, 0, ["...#....", ".#.#.#..", "..###...", "#######.", "..###...", ".#.#.#..", "...#....", "...#...."], {'#': WHITE})
    save(p.im, G_OUT + 'icon_bless.png')
    p = Pic(8, 8)                                                               # HUD: stuck in honey (a drop on a comb cell)
    p.bitmap(0, 0, ["..####..", ".#....#.", "#..##..#", "#.####.#", "#.####.#", ".#.##.#.", "..####..", "........"], {'#': WHITE})
    save(p.im, G_OUT + 'icon_honey.png')


@builder('icons')
def make_icons():
    def bell_(d, k):     # a bell with its clapper, swinging, and two arcs of sound
        S = lambda *v: [x * k for x in v]
        d.polygon(S(36, 18, 60, 18, 66, 30, 68, 58, 80, 72, 16, 72, 28, 58, 30, 30), fill=255)
        d.rectangle(S(42, 10, 54, 18), fill=255)
        d.rectangle(S(18, 66, 78, 70), fill=0)
        d.ellipse(S(40, 72, 56, 88), fill=255)
        for r in (10, 18):
            d.arc(S(82 - r, 36 - r, 82 + r, 36 + r), -70, 40, fill=255, width=5 * k)
            d.arc(S(14 - r, 36 - r, 14 + r, 36 + r), 140, 250, fill=255, width=5 * k)
    save(P3.icon(bell_), T_OUT + 'icon_bell.png')



# ================================================================== CONTACT SHEET
NEW_WEAPONS = ('censer', 'hivelauncher')


def make_sheet():
    man = _manifest()
    try:   # the first-person weapons come from tools/weapon-frames (render-static.mjs + pack.py)
        wf = json.loads(re.search(r'= (\{.*\});', open('retrofps/js/weapons.js').read()).group(1))
        for w in NEW_WEAPONS:
            if w in wf and os.path.exists(G_OUT + f'fp_{w}.png'):
                man[G_OUT + f'fp_{w}.png'] = (sum(len(v) for v in wf[w]['states'].values()), False)
    except (OSError, AttributeError):
        pass
    font = ImageFont.load_default()

    def order(kv):
        p = kv[0]
        g = 0 if '/wall/' in p else 1 if 'enemies' in p else 2 if 'boss' in p else 4 if 'fp_' in p else 3
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
            sc = 4 if im.height <= 40 else 3
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
        if os.path.basename(path).startswith('enemies'):                  # the feet row
            fl = {64: 57, 48: 42, 32: 28}.get(fh)
            if fl:
                for i in range(n):
                    d.line((x + i * fw * sc, y + (fl + 1) * sc - 1, x + (i + 1) * fw * sc - 3, y + (fl + 1) * sc - 1), fill=(80, 80, 80, 255))
        c.alpha_composite(big, (x, y))
    c.convert('RGB').save(SHEET)
    print('sheet', SHEET, c.size)


def check_outputs():
    """Style rules: every pixel fully opaque or fully transparent (textures are opaque), strips divide evenly into
    their frames, nothing below the feet row of enemy cells."""
    bad = []
    for path, (n, add) in SAVED.items():
        im = Image.open(path).convert('RGBA')
        a = np.array(im)[:, :, 3]
        if not np.isin(a, (0, 255)).all():
            bad.append(path)
        if im.width % n:
            print('UNEVEN STRIP:', path, im.size, n)
        fl = {64: 57, 48: 42, 32: 28}.get(im.height)
        if 'enemies-' in path and fl and a[fl + 1:].any():
            print('BELOW FEET:', path)
    if bad:
        print('PARTIAL ALPHA:', bad)


def bbox_report():
    """Figure heights per sheet (idle frame 0) for the suggested sizes: apparent height = size x figure px / cell px."""
    for path in sorted(SAVED):
        nm = os.path.basename(path)
        if nm.endswith('_idle.png'):
            im = Image.open(path)
            c = im.crop((0, 0, im.height, im.height))
            b = c.getbbox()
            print(f'  {nm}: cell {im.height}, figure {b[2] - b[0]}x{b[3] - b[1]} px, rows {b[1]}..{b[3] - 1}')


if __name__ == '__main__':
    want = sys.argv[1:]
    for name, fn in BUILDERS.items():
        if not want or name in want:
            fn()
    check_outputs()
    bbox_report()
    make_sheet()
    print('klart')
