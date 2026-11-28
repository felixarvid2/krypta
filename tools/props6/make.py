#!/usr/bin/env python3
"""Version 8 graphics for Krypta ("Avgrunden"): the crystal caves and the sunken city, eight new enemies, the crystal
queen and the leviathan, textures, props, items, particles, HUD and touch icons and 30 talent icons.

Run from the folder that holds retrofps/ and assets/ (e.g. /home/user/test):
    python3 retrofps/tools/props6/make.py [name ...]
(with names only those builders run, e.g. `python3 retrofps/tools/props6/make.py crab sheet`; the contact sheet
always shows everything this script has written so far, plus the three new first-person weapons)

The first-person weapons harpoon / boomerang / prism (fp_*.png, pick_*.png, js/weapons.js) come from tools/weapon-frames
(render-static.mjs + pack.py, see the README there).

Out to retrofps/assets/gfx:
  enemies-{crystalgolem,sailor,eel,siren,crab,stalker,witch}_{idle,movement,attack,take_damage,death}.png  (64x64 cells)
  enemies-shardwisp_{...}.png (32x32 cells)
  boss_crystalqueen_{idle,attack,cast,hurt,death}.png, boss_leviathan_{idle,attack,cast,hurt,death,submerge}.png (square)
  prop_{prismcrystal,glowcrystal,wreckchest,bubbles,crystalspikes,coral,sunkenpillar,talentaltar}.png, npc_cartographer.png
  item_tome.png, part_{bubble,shard,splash_big,prismbeam,note,ink,harpoonrope}.png, icon_{air,xp}.png (8x8)
  talents/<id>.png (24x24, 30 talent icons in three branches)
Out to retrofps/assets/wall:
  wall_crystal, wall_crystal_vein, wall_ruin_sunken, wall_coral, wall_boss_crystalqueen, wall_boss_leviathan (64x128),
  floor_crystal, floor_sunken_tiles, floor_deepwater, floor_deepwater2, floor_shallow, floor_boss_crystalqueen,
  floor_boss_leviathan (64x64)
Out to retrofps/assets/touch: icon_talent.png, icon_swim.png (96x96, white on transparent)
Contact sheet: <scratchpad>/en/v8_sheet.png

Sources (licences checked; everything not listed is drawn procedurally below in the outlined style of
tools/props2-props5, whose helpers are reused):
  * Pixel Crawler Free Pack 2.11 (Anokolisa; free for commercial use, edits allowed, no resale of the assets):
      Characters/Body_A Idle/Walk/Slice/Hit/Death -> sailor (drowned: pale green skin, striped shirt, cap, seaweed,
                                                     boat hook drawn)
      Npc's/Wizzard Idle/Run/Death                -> witch (recoloured, wide pointed hat, crooked staff and curse drawn)
      Npc's/Knight Idle                           -> cartographer NPC (recoloured, map scroll, compass and hat drawn)
  * Legacy Collection (Ansimuz, CC0 - "public-license.pdf" in the collection):
      Gothicvania Dancing Girl balancing/hips      -> siren (upper body recoloured sea-green, fish tail, fins, notes drawn)
      Gothicvania WereWolf idle/run/jump/fall      -> stalker (a black-violet shadow silhouette with glowing eyes)
      TinyRPG Monster Pack / Witch (witch1-5)      -> boss_crystalqueen "KRISTALLDROTTNINGEN" (recoloured ice-violet,
                                                     crystal crown, shard wings and crystal magic drawn)
  * Kenney retro-textures-fantasy (CC0): wall_rock, wall_brick_stone_center, floor_stone_pattern, floor_ground_water
      -> grain and block layout of the cave / ruin textures
  * Classic 64 Asset Pack 0.6 (Craig Snedeker, CC0): Ground/rocks_underwater_01, ice_03, gravel_04 -> grain
  (32rogues, Super Retro World and Mana Seed are NOT used: their licences forbid AI use / redistribution.)
Drawn: crystalgolem, shardwisp, eel, crab, the leviathan, all props, items, particles and icons.
Additive particles (stored opaque on black, like part_ember): part_prismbeam.
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
sys.dont_write_bytecode = True          # the helper modules of props2-props5 are loaded without touching their __pycache__


def _load(name, rel):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, '..', rel, 'make.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


P2 = _load('props2make', 'props2')
P3 = _load('props3make', 'props3')
P4 = _load('props4make', 'props4')
P5 = _load('props5make', 'props5')
from_p2 = ('OUT Pic outline outline_same hard recolor load_frames shift shear rot squash tint place gmap tile_lum blend '
           'mask_draw glow warp radial band from_arr').split()
globals().update({k: getattr(P2, k) for k in from_p2})
colors_mask, keep, voronoi_cells, edge, strip_tool = P3.colors_mask, P3.keep, P3.voronoi_cells, P3.edge, P3.strip_tool
comp, cut_below, opaque, feet_cx = P4.comp, P4.cut_below, P4.opaque, P4.feet_cx
mask_of, lum_map, line_pts, ground, pnoise, up2 = P5.mask_of, P5.lum_map, P5.line_pts, P5.ground, P5.pnoise, P5.up2
tool_axis, front_hand, eye_of = P5.tool_axis, P5.front_hand, P5.eye_of
S0, S1, S2, S3, S4 = P2.S0, P2.S1, P2.S2, P2.S3, P2.S4
W0, W1, W2, W3, W4 = P2.W0, P2.W1, P2.W2, P2.W3, P2.W4
M0, M1, M2, M3 = P2.M0, P2.M1, P2.M2, P2.M3
I0, I1, I2, I3 = P2.I0, P2.I1, P2.I2, P2.I3
B0, B1, B2, B3 = P2.B0, P2.B1, P2.B2, P2.B3
R0, R1, R2, R3 = P2.R0, P2.R1, P2.R2, P2.R3
GOLD0, GOLD1, GOLD2 = P2.GOLD0, P2.GOLD1, P2.GOLD2
PAPER0, PAPER1, PAPER2 = P2.PAPER0, P2.PAPER1, P2.PAPER2
V0, V1, V2, V3 = P2.V0, P2.V1, P2.V2, P2.V3
BL0, BL1, BL2 = P2.BL0, P2.BL1, P2.BL2
AU0, AU1, AU2, AU3, AU4 = P5.AU0, P5.AU1, P5.AU2, P5.AU3, P5.AU4
BZ0, BZ1, BZ2 = P5.BZ0, P5.BZ1, P5.BZ2

A = 'assets/'
LC = A + '2d-pixel/Legacy Collection/Legacy Collection/Assets/'
GVC = LC + 'Gothicvania/Characters/'
TRPG = LC + 'TinyRPG/Characters/Battle Sprites/Monster Pack Files/'
PCE = A + '2d-pixel/Pixel Crawler - Free Pack 2.11/Pixel Crawler - Free Pack/Entities/'
BODY = PCE + 'Characters/Body_A/Animations/'
NPC = PCE + "Npc's/"
K = A + 'textures/retro-textures-fantasy/PNG/'
C64 = A + 'textures/Classic 64 Asset Pack 0.6/- Classic 64 Asset Pack 0.6/'
G_OUT, W_OUT, T_OUT = 'retrofps/assets/gfx/', 'retrofps/assets/wall/', 'retrofps/assets/touch/'
SCR = '/tmp/claude-0/-home-user/80ee56ba-2fa6-5354-b261-a4ca4fdcb508/scratchpad/en/'
SHEET, MANIFEST = SCR + 'v8_sheet.png', SCR + 'v8_manifest.json'

# ---------------------------------------------------------------- crystal-cave palette
RK0, RK1, RK2, RK3, RK4 = (20, 18, 32), (36, 32, 54), (56, 50, 80), (82, 76, 108), (116, 110, 142)     # cave rock
CR0, CR1, CR2, CR3, CR4 = (40, 22, 82), (78, 48, 150), (120, 92, 214), (166, 158, 246), (226, 236, 255)   # crystal
CY0, CY1, CY2, CY3 = (24, 96, 150), (52, 170, 220), (130, 230, 255), (226, 252, 255)                   # glowing cyan
PK0, PK1, PK2 = (130, 40, 140), (210, 90, 210), (255, 180, 250)                                         # magenta glint
# ---------------------------------------------------------------- sunken-city palette
SK0, SK1, SK2, SK3, SK4 = (20, 34, 40), (34, 56, 60), (56, 84, 84), (86, 116, 108), (128, 154, 136)     # wet stone
AL0, AL1, AL2, AL3 = (28, 58, 34), (48, 96, 46), (86, 140, 64), (148, 192, 98)                         # algae
WA0, WA1, WA2, WA3, WA4, WA5 = (6, 18, 40), (12, 38, 72), (20, 66, 110), (40, 112, 152), (96, 176, 200), (200, 240, 240)  # water
CO0, CO1, CO2, CO3 = (96, 28, 52), (172, 58, 84), (232, 110, 112), (255, 176, 150)                     # coral pink
OR0, OR1, OR2 = (150, 70, 30), (226, 132, 52), (255, 200, 110)                                          # coral orange
DS0, DS1, DS2, DS3 = (36, 56, 60), (66, 98, 94), (104, 142, 128), (156, 190, 168)                      # drowned skin
SH0, SH1, SH2 = (150, 140, 118), (204, 196, 170), (244, 238, 216)                                      # shell / bone white

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


def lerp(a, b, t):
    return tuple(int(round(x + (y - x) * t)) for x, y in zip(a, b))


def dark(c, k=0.6):
    return tuple(int(x * k) for x in c)


def flash(im, col=(255, 255, 255), k=0.55):
    return tint(im, col, k)


def to_cell(im, fw, feet, cx, dx=0, dy=0):
    """Paste an image into an fw x fw cell: its lowest row on `feet`, its bbox centre on `cx`."""
    b = im.getbbox()
    out = Image.new('RGBA', (fw, fw), (0, 0, 0, 0))
    if b:
        out.paste(im, (int(cx - (b[0] + b[2]) // 2 + dx), int(feet - (b[3] - 1) + dy)), im)
    return out


def ripple(p, cx, y, w, col=WA4, col2=WA3, k=0):
    """A flat water ring (ellipse outline) where something breaks the surface."""
    p.arc(cx - w, y - 2, cx + w, y + 2, 0, 180, col)
    p.arc(cx - w, y - 2, cx + w, y + 2, 180, 360, col2)
    if k:
        p.ps([(cx - w - 2, y), (cx + w + 2, y)], col2)


def splash(p, cx, y, h, seed, n=7, col=WA5, col2=WA4):
    r2 = random.Random(seed)
    for i in range(n):
        a = math.pi + (i + 0.5) / n * math.pi + r2.uniform(-0.15, 0.15)
        ln = h * r2.uniform(0.5, 1.0)
        x1, y1 = cx + math.cos(a) * ln * 0.8, y + math.sin(a) * ln
        p.l(cx + math.cos(a) * 2, y, x1, y1, col2)
        p.p(x1, y1 - 1, col)


BUILDERS = {}


def builder(name):
    def deco(fn):
        BUILDERS[name] = fn
        return fn
    return deco


# ================================================================== TEXTURES (palettized like props5)
def finish(rgb, name, colors=48, half=True):
    im = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), 'RGB')
    if half:
        im = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
    save(im.quantize(colors, method=Image.Quantize.MEDIANCUT).convert('RGB'), W_OUT + name)


RK_STOPS = [(0, RK0), (0.3, RK1), (0.6, RK2), (0.85, RK3), (1, RK4)]
SK_STOPS = [(0, SK0), (0.3, SK1), (0.6, SK2), (0.85, SK3), (1, SK4)]


def crystal_mask(w, h, specs, wrap=True):
    """Hexagonal crystal prisms seen from the side: returns a label map (0 none, 1 lit face, 2 mid face, 3 dark face,
    4 ridge/edge highlight). specs: (x, y, ang, length, width) with (x, y) the root and ang the growth direction."""
    lab = np.zeros((h, w), np.uint8)

    def draw(d, ox, oy):
        for (x, y, ang, ln, wd) in specs:
            u = (math.cos(ang), math.sin(ang))
            v = (-u[1], u[0])
            P_ = lambda a_, b_: (x + ox + u[0] * a_ + v[0] * b_, y + oy + u[1] * a_ + v[1] * b_)
            body = ln * 0.78
            d.polygon([P_(0, -wd), P_(body, -wd), P_(ln, 0), P_(body * 0.98, 0), P_(0, 0)], fill=1)
            d.polygon([P_(0, 0), P_(body * 0.98, 0), P_(ln, 0), P_(body, wd * 0.55), P_(0, wd * 0.55)], fill=2)
            d.polygon([P_(0, wd * 0.55), P_(body, wd * 0.55), P_(ln, 0), P_(body, wd), P_(0, wd)], fill=3)
            d.line([P_(1, 0), P_(ln - 1, 0)], fill=4)
    m = Image.new('L', (w * 3, h * 3), 0)
    d = ImageDraw.Draw(m)
    offs = [(ox, oy) for ox in (0, w, 2 * w) for oy in (0, h, 2 * h)] if wrap else [(w, h)]
    for ox, oy in offs:
        draw(d, ox, oy)
    return np.array(m.crop((w, h, 2 * w, 2 * h)))


def paint_crystals(rgb, lab, pal=(CR3, CR2, CR1, CR4), glowk=0.0, glowcol=CR2):
    lit, mid, drk, hi = pal
    if glowk:
        g = glow((lab > 0).astype(float), 2.2)
        rgb = blend(rgb, (g > 0.12) & (lab == 0), glowcol, glowk)
    for k, c in ((1, lit), (2, mid), (3, drk), (4, hi)):
        rgb[lab == k] = c
    return rgb


def rock_base(w, h, seed, src='wall_rock.png', k=0.7):
    lum = tile_lum(K + src, (w, h), (1, max(1, h // w)))
    n = pnoise(w, h, seed)
    return np.clip(lum * k + (n - 0.5) * 0.35 + 0.12, 0, 1)


def cluster(x, y, n, seed, up=True, size=1.0, spread=0.9):
    r2 = random.Random(seed)
    base = -math.pi / 2 if up else math.pi / 2
    out = []
    for i in range(n):
        ang = base + (i - (n - 1) / 2) / max(1, n - 1) * spread * 2 + r2.uniform(-0.15, 0.15)
        ln = r2.uniform(6, 12) * size * (1.25 if i == n // 2 else 1)
        out.append((x + r2.uniform(-2, 2), y + r2.uniform(-1, 1), ang, ln, r2.uniform(1.8, 2.6) * size))
    return out


def tex_wall_crystal():
    w, h = 32, 64
    v = rock_base(w, h, 101)
    rgb = gmap(v, RK_STOPS)
    cm = P4.crack_mask(w, h, 102, n=3, steps=10, step=1.6, branch=0.2, spread=0.5)
    rgb[cm] = RK0
    rgb = blend(rgb, np.roll(cm, 1, 1) & ~cm, RK4, 0.35)
    specs = cluster(9, 24, 4, 1, up=True, size=1.25) + cluster(24, 52, 3, 2, up=True, size=1.0) + \
        cluster(26, 4, 3, 3, up=False, size=0.7) + [(2, 40, -0.4, 7, 1.6), (15, 62, -1.9, 6, 1.5)]
    lab = crystal_mask(w, h, specs)
    rgb = paint_crystals(rgb, lab, glowk=0.45, glowcol=CR1)
    # sparkle
    for (x, y) in ((8, 13), (23, 43), (27, 11)):
        rgb[y % h, x % w] = CR4
    finish(rgb, 'wall_crystal.png')


def tex_wall_crystal_vein():
    w, h = 32, 64
    v = rock_base(w, h, 111, k=0.6)
    rgb = gmap(v * 0.85, RK_STOPS)
    vein = P4.crack_mask(w, h, 112, n=2, steps=14, step=1.6, branch=0.3, spread=0.5)
    vein2 = P4.crack_mask(w, h, 113, n=1, steps=10, step=1.5, branch=0.2, spread=0.6)
    m = vein | vein2
    g = glow(m.astype(float), 1.2)
    rgb = blend(rgb, (g > 0.12) & ~m, CY0, 0.45)
    rgb = blend(rgb, (g > 0.3) & ~m, CY1, 0.35)
    rgb[m] = CY1
    core = m & (pnoise(w, h, 114, ((4, 1.0),)) > 0.5)
    rgb[core] = CY2
    rgb[core & (pnoise(w, h, 115, ((4, 1.0),)) > 0.6)] = CY3
    specs = cluster(18, 30, 3, 4, size=0.6) + [(6, 58, -1.2, 6, 1.4)]
    lab = crystal_mask(w, h, specs)
    rgb = paint_crystals(rgb, lab, pal=(CY2, CY1, CY0, CY3), glowk=0.5, glowcol=CY0)
    finish(rgb, 'wall_crystal_vein.png')


def tex_wall_ruin_sunken():
    w, h = 32, 64
    mortar, bid = P3.brick_mask(w, h, 8, 16, 7)
    grain = tile_lum(C64 + 'Ground/Materials/rocks_underwater_01.jpg', (w, h), (1, 2))
    r2 = np.random.default_rng(121)
    tone = {b: r2.uniform(0.4, 0.72) for b in np.unique(bid)}
    v = np.clip(np.vectorize(tone.get)(bid) + (grain - 0.5) * 0.35, 0, 1)
    yy, xx = np.mgrid[0:h, 0:w]
    v = v - np.clip((yy - 40) / 24, 0, 1) * 0.18                       # darker, wet lower part
    rgb = gmap(v, SK_STOPS)
    rgb[mortar] = SK0
    rgb = blend(rgb, np.roll(mortar, 1, 0) & ~mortar, SK4, 0.35)      # lit lower brick edge
    cm = P4.crack_mask(w, h, 122, n=2, steps=9, step=1.5, branch=0.2)
    rgb[cm] = SK0
    # algae: hanging strands from mortar lines, thicker towards the bottom
    n = pnoise(w, h, 123, ((8, 1.0), (4, 0.5)))
    alg = (n > 0.58) & (yy > 20)
    rgb = blend(rgb, alg, AL1, 0.65)
    rgb = blend(rgb, alg & (n > 0.68), AL2, 0.7)
    rr = random.Random(124)
    for _ in range(10):
        x = rr.randrange(w); y0 = rr.choice(range(0, h, 8)); ln = rr.randint(3, 9)
        for j in range(ln):
            rgb[(y0 + j) % h, (x + (j // 4)) % w] = AL2 if j < ln - 2 else AL1
    # tide line and barnacles
    rgb[(yy == 14) | (yy == 15)] = blend(rgb, np.ones((h, w), bool), (150, 160, 130), 0.35)[(yy == 14) | (yy == 15)]
    for _ in range(12):
        x, y = rr.randrange(w), rr.randrange(30, h)
        rgb[y, x] = SH1
        rgb[y, (x + 1) % w] = SH0
    finish(rgb, 'wall_ruin_sunken.png')


def tex_wall_coral():
    w, h = 32, 64
    v = rock_base(w, h, 131, 'wall_rock.png', 0.5)
    rgb = gmap(v * 0.8 + 0.1, SK_STOPS)
    yy, xx = np.mgrid[0:h, 0:w]

    def branches(d, ox, oy):
        rr = random.Random(132)
        for i in range(6):
            x, y = rr.uniform(0, w), rr.uniform(8, h)
            stack = [(x, y, -math.pi / 2 + rr.uniform(-0.4, 0.4), 6)]
            while stack:
                x0, y0, a, k = stack.pop()
                for _ in range(k):
                    x1, y1 = x0 + math.cos(a) * 1.6, y0 + math.sin(a) * 1.6
                    d.line([(x0 + ox, y0 + oy), (x1 + ox, y1 + oy)], fill=255, width=2 if k > 3 else 1)
                    x0, y0 = x1, y1
                    a += rr.uniform(-0.35, 0.35)
                    if rr.random() < 0.3 and k > 2:
                        stack.append((x0, y0, a + rr.choice((-0.8, 0.8)), k - 2))
                d.ellipse((x0 - 1 + ox, y0 - 1 + oy, x0 + 1 + ox, y0 + 1 + oy), fill=255)
    br = mask_draw(w, h, branches) > 0.4
    rgb[br] = CO1
    rgb[br & ~np.roll(br, 1, 1)] = CO2
    rgb[br & ~np.roll(br, 1, 0)] = CO3
    rgb = blend(rgb, np.roll(br, -1, 1) & ~br, SK0, 0.6)
    # brain-coral domes (orange) with meander grooves
    for (cx, cy, r) in ((8, 50, 6), (25, 22, 5), (20, 58, 4)):
        d = np.hypot((xx - cx + w / 2) % w - w / 2, (yy - cy + h / 2) % h - h / 2)
        dome = d <= r
        lit = dome & (((xx - cx) + (yy - cy)) < 0)
        rgb[dome] = OR1
        rgb[lit] = OR2
        groove = dome & (np.sin((xx - cx) * 1.6 + np.sin((yy - cy) * 1.3) * 2) > 0.7)
        rgb[groove] = OR0
        rgb[(d > r) & (d <= r + 1)] = SK0
    # tube sponges (purple) and anemone dots
    for (x, y) in ((28, 40), (4, 12), (14, 8)):
        rgb[y - 4:y + 1, x] = (120, 60, 150)
        rgb[y - 4:y + 1, (x + 1) % w] = (90, 40, 120)
        rgb[y - 4, x] = (200, 140, 230)
    rr = random.Random(133)
    for _ in range(16):
        x, y = rr.randrange(w), rr.randrange(h)
        if not br[y, x]:
            rgb[y, x] = rr.choice((CO2, (240, 220, 120), SH1))
    finish(rgb, 'wall_coral.png')


def tex_floor_crystal():
    w = h = 32
    v = rock_base(w, h, 141, 'floor_stone_pattern.png', 0.45)
    rgb = gmap(v * 0.9, RK_STOPS)
    pts = [(4, 6), (20, 4), (28, 18), (10, 22), (22, 28), (14, 13)]
    cell, d1, d2 = voronoi_cells(w, h, pts)
    edge_ = (d2 - d1) < 1.0
    rgb[edge_] = RK0
    # crystal shards set into the floor (flat facets seen from above)
    rr = random.Random(142)
    m = np.zeros((h, w), np.uint8)

    def shard(d, ox, oy):
        for i in range(7):
            x, y = rr.uniform(0, w), rr.uniform(0, h)
            a = rr.uniform(0, math.pi)
            ln, wd = rr.uniform(3, 6), rr.uniform(1.2, 2)
            u, vv = (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))
            P_ = lambda s, t: (x + ox + u[0] * s + vv[0] * t, y + oy + u[1] * s + vv[1] * t)
            d.polygon([P_(-ln, 0), P_(0, -wd), P_(ln, 0)], fill=1)
            d.polygon([P_(-ln, 0), P_(0, wd), P_(ln, 0)], fill=3)
    rr = random.Random(142)
    lab = np.array(Image.fromarray(np.zeros((1, 1), np.uint8)))
    mm = Image.new('L', (w * 3, h * 3)); dd = ImageDraw.Draw(mm)
    for ox in (0, w, 2 * w):
        for oy in (0, h, 2 * h):
            rr = random.Random(142)
            shard(dd, ox, oy)
    lab = np.array(mm.crop((w, h, 2 * w, 2 * h)))
    g = glow((lab > 0).astype(float), 1.5)
    rgb = blend(rgb, (g > 0.15) & (lab == 0), CR1, 0.45)
    rgb[lab == 1] = CR3
    rgb[lab == 3] = CR1
    hi = (lab == 1) & ~np.roll(lab == 1, 1, 0)
    rgb[hi] = CR4
    finish(rgb, 'floor_crystal.png', 40)


def tex_floor_sunken_tiles():
    w = h = 32
    lum = tile_lum(K + 'floor_stone_pattern.png', (w, h))
    n = pnoise(w, h, 151)
    yy, xx = np.mgrid[0:h, 0:w]
    v = np.clip(lum * 0.45 + (n - 0.5) * 0.3 + 0.32, 0, 1)
    rgb = gmap(v, SK_STOPS)
    seam = (xx % 16 == 0) | (yy % 16 == 0)
    rgb[seam] = SK0
    rgb = blend(rgb, (np.roll(seam, 1, 0) | np.roll(seam, 1, 1)) & ~seam, SK4, 0.3)
    # inlaid wave meander on every second tile
    tile = ((xx // 16) + (yy // 16)) % 2 == 0
    wave = tile & (np.abs((yy % 16) - 8 - 2.2 * np.sin((xx % 16) / 16 * math.tau)) < 0.8) & ~seam & (xx % 16 > 1) & (xx % 16 < 15)
    rgb[wave] = (66, 120, 130)
    # algae in the seams, a few broken corners, puddles
    alg = seam & (n > 0.5)
    rgb[alg] = AL1
    rgb[np.roll(alg, 1, 0) & ~seam & (n > 0.6)] = AL0
    cm = P4.crack_mask(w, h, 152, n=2, steps=6, step=1.5)
    rgb[cm] = SK0
    pud = pnoise(w, h, 153, ((8, 1.0), (4, 0.4))) > 0.74
    rgb = blend(rgb, pud, WA2, 0.55)
    rgb = blend(rgb, pud & ~np.roll(pud, 1, 0), WA4, 0.5)
    finish(rgb, 'floor_sunken_tiles.png', 40)


def caustic(w, h, seed, phase):
    """Tiling caustic network: bright lines where two warped sine fields meet."""
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    n = pnoise(w, h, seed, ((16, 1.0), (8, 0.5)))
    n2 = pnoise(w, h, seed + 7, ((8, 1.0), (4, 0.5)))
    a = np.sin((xx / w * 2 + yy / h * 1) * math.tau + n * 7 + n2 * 2 + phase)
    b = np.sin((xx / w * -1 + yy / h * 2) * math.tau + n2 * 6 + n * 2 - phase * 1.3)
    return np.clip(1 - np.abs(a + b) * 1.4, 0, 1)


def tex_floor_deepwater():
    w = h = 32
    for f in range(2):
        ph = f * math.pi / 2
        c = caustic(w, h, 161, ph)
        n = pnoise(w, h, 162, ((16, 1.0), (8, 0.5)))
        v = np.clip(0.25 + n * 0.3 + c * 0.25, 0, 1)
        rgb = gmap(v, [(0, WA0), (0.35, WA1), (0.6, WA2), (0.85, WA3), (1, WA4)])
        rgb = blend(rgb, c > 0.82, WA4, 0.55)
        rgb = blend(rgb, c > 0.93, WA5, 0.5)
        dk = pnoise(w, h, 163, ((16, 1.0),)) < 0.38                     # dark depths
        rgb = blend(rgb, dk & (c < 0.5), WA0, 0.5)
        rr = random.Random(164)
        for _ in range(6):                                             # glints drifting a pixel between the frames
            x, y = rr.randrange(w), rr.randrange(h)
            rgb[y, (x + f) % w] = WA5
        finish(rgb, 'floor_deepwater.png' if f == 0 else 'floor_deepwater2.png', 32)


def tex_floor_shallow():
    w = h = 32
    sand = tile_lum(C64 + 'Ground/Materials/gravel_04.png', (w, h))
    lum = tile_lum(K + 'floor_stone_pattern.png', (w, h))
    c = caustic(w, h, 171, 0.7)
    v = np.clip(lum * 0.35 + sand * 0.25 + 0.25, 0, 1)
    rgb = gmap(v, [(0, (40, 70, 70)), (0.4, (70, 110, 100)), (0.75, (110, 150, 128)), (1, (150, 186, 156))])
    rgb = blend(rgb, np.ones((h, w), bool), WA3, 0.3)                    # water tint
    rgb = blend(rgb, c > 0.8, (186, 236, 230), 0.55)
    rr = random.Random(172)
    for _ in range(10):                                                  # pebbles and shells
        x, y = rr.randrange(w), rr.randrange(h)
        rgb[y, x] = rr.choice((SH1, (70, 96, 90), CO2))
        rgb[(y + 1) % h, x] = (40, 64, 64)
    finish(rgb, 'floor_shallow.png', 32)


def tex_boss_crystalqueen():
    # wall: polished dark-violet stone panels with silver frames, a crown of crystals and a hanging crystal pendant
    w, h = 64, 128
    v = up2(rock_base(32, 64, 181, 'wall_brick_stone_center.png', 0.35))
    yy, xx = np.mgrid[0:h, 0:w]
    rgb = gmap(v * 0.7 + 0.08, [(0, (22, 14, 40)), (0.5, (44, 30, 80)), (1, (76, 60, 122))])
    frame = (xx < 3) | (xx > 60) | (yy < 3) | (yy > 124) | ((yy > 62) & (yy < 66))
    rgb[frame] = (150, 150, 186)
    rgb[frame & ((xx == 1) | (yy == 1) | (yy == 63))] = (220, 220, 246)
    rgb[frame & ((xx == 62) | (yy == 126) | (yy == 65))] = (80, 76, 120)
    # crown of crystals in the upper panel
    specs = [(32, 54, -math.pi / 2, 40, 5), (22, 54, -math.pi / 2 - 0.35, 30, 4), (42, 54, -math.pi / 2 + 0.35, 30, 4),
             (13, 56, -math.pi / 2 - 0.7, 20, 3.2), (51, 56, -math.pi / 2 + 0.7, 20, 3.2)]
    lab = crystal_mask(w, h, specs, wrap=False)
    rgb = paint_crystals(rgb, lab, pal=(CR3, CR2, CR1, CR4), glowk=0.4, glowcol=PK0)
    rgb[(yy >= 54) & (yy <= 58) & (xx >= 10) & (xx <= 54)] = (150, 150, 186)          # crown band
    rgb[(yy == 54) & (xx >= 10) & (xx <= 54)] = (220, 220, 246)
    for gx in (18, 32, 46):
        rgb[55:58, gx - 1:gx + 2] = PK1
        rgb[55, gx] = PK2
    # pendant in the lower panel: a big rhombic crystal on a silver chain
    for y in range(68, 82, 2):
        rgb[y, 32] = (190, 190, 220)
    pm = Image.new('L', (w, h)); d = ImageDraw.Draw(pm)
    d.polygon([(32, 82), (44, 98), (32, 118), (20, 98)], fill=1)
    d.polygon([(32, 82), (44, 98), (32, 98)], fill=2)
    d.polygon([(32, 98), (44, 98), (32, 118)], fill=3)
    d.polygon([(20, 98), (32, 98), (32, 118)], fill=2)
    lab = np.array(pm)
    g = glow((lab > 0).astype(float), 3)
    rgb = blend(rgb, (g > 0.1) & (lab == 0) & ~frame, CR1, 0.5)
    rgb[lab == 1] = CR3; rgb[lab == 2] = CR2; rgb[lab == 3] = CR1
    rgb[(lab > 0) & (np.abs(xx - 32) < 1) & (yy < 98)] = CR4
    for (x, y) in ((28, 90), (27, 91)):
        rgb[y, x] = CR4
    finish(rgb, 'wall_boss_crystalqueen.png', 56, half=False)

    # floor: polished crystal tiles in a silver grid with an eight-pointed star
    w = h = 32
    n = pnoise(w, h, 182)
    yy, xx = np.mgrid[0:h, 0:w]
    rgb = gmap(np.clip(n * 0.5 + 0.2, 0, 1), [(0, (30, 20, 60)), (0.6, (56, 40, 104)), (1, (88, 70, 150))])
    grid = (xx % 16 == 0) | (yy % 16 == 0)
    rgb[grid] = (150, 150, 186)
    cx_, cy_ = xx % 16 - 8, yy % 16 - 8
    star = (np.abs(cx_) + np.abs(cy_) <= 5) & ((np.abs(cx_) <= 1) | (np.abs(cy_) <= 1) | (np.abs(np.abs(cx_) - np.abs(cy_)) <= 1))
    rgb[star] = CR2
    rgb[star & ((cx_ < 0) | (cy_ < 0))] = CR3
    rgb[(np.abs(cx_) + np.abs(cy_)) <= 1] = CR4
    rgb = blend(rgb, ((xx + yy) % 16 == 3) & ~grid & ~star, (120, 110, 190), 0.3)   # sheen streak
    finish(rgb, 'floor_boss_crystalqueen.png', 32)


def tex_boss_leviathan():
    # wall: sunken temple blocks, a carved coiled sea serpent relief, gold trim and a trident frieze
    w, h = 64, 128
    mortar, bid = P3.brick_mask(32, 64, 16, 16, 9)
    grain = tile_lum(C64 + 'Ground/Materials/rocks_underwater_01.jpg', (32, 64), (1, 2))
    r2 = np.random.default_rng(191)
    tone = {b: r2.uniform(0.42, 0.66) for b in np.unique(bid)}
    v = up2(np.clip(np.vectorize(tone.get)(bid) + (grain - 0.5) * 0.3, 0, 1))
    rgb = gmap(v, SK_STOPS)
    rgb[up2(mortar)] = SK0
    yy, xx = np.mgrid[0:h, 0:w]
    fr = yy < 12
    rgb[fr] = SK1
    rgb[(yy == 11) | (yy == 0)] = AU1
    for x0 in range(4, 64, 12):                                         # tridents in the frieze
        rgb[2:10, x0 + 3] = AU2
        rgb[3, x0:x0 + 7] = AU2
        rgb[2, x0] = rgb[2, x0 + 6] = rgb[1, x0 + 3] = AU3
    bt = yy >= 118
    rgb[bt] = np.where((((xx[bt] + (yy[bt] - 118)) // 4) % 2 == 0)[:, None], np.array(SK1), np.array(WA2))
    rgb[yy == 117] = AU1
    # serpent relief: a thick S-curve body with fin spikes and a head at the top
    rm = Image.new('L', (w, h)); d = ImageDraw.Draw(rm)
    pts = [(32 + 14 * math.sin(t * 2.2) * (1 - t * 0.3), 104 - t * 74) for t in np.linspace(0, 1, 40)]
    d.line(pts, fill=255, width=13, joint='curve')
    for i in range(3, 36, 4):
        x, y = pts[i]
        d.polygon([(x - 3, y), (x + 3, y), (x - 7, y - 4)], fill=255)
    hx, hy = pts[-1]
    d.ellipse((hx - 8, hy - 8, hx + 8, hy + 4), fill=255)
    d.polygon([(hx, hy - 4), (hx + 14, hy - 2), (hx + 10, hy + 4), (hx, hy + 3)], fill=255)
    rel = np.array(rm) > 0
    rel_in = rel & np.roll(rel, 1, 0) & np.roll(rel, -1, 0) & np.roll(rel, 1, 1) & np.roll(rel, -1, 1)
    sc = gmap(np.clip(up2(grain) * 0.4 + 0.45, 0, 1), [(0, (40, 92, 92)), (0.6, (66, 130, 120)), (1, (110, 170, 150))])
    rgb[rel] = sc[rel]
    rgb[rel & ~np.roll(rel, 1, 0)] = (150, 200, 176)                     # top light
    rgb[rel & ~np.roll(rel, -1, 0)] = (24, 52, 56)
    rgb[np.roll(rel, -2, 0) & ~rel] = SK0                                 # cast shadow
    scale_ = rel_in & (((xx // 3) + (yy // 3)) % 2 == 0) & ((yy % 3) == 0)
    rgb[scale_] = (40, 92, 92)
    rgb[int(hy - 3):int(hy - 1), int(hx + 2):int(hx + 4)] = AU3            # gold eye
    # barnacles and algae
    rr = random.Random(192)
    for _ in range(18):
        x, y = rr.randrange(w), rr.randrange(14, 116)
        if not rel[y, x]:
            rgb[y, x] = SH1
    alg = (pnoise(32, 64, 193, ((8, 1.0), (4, 0.5))) > 0.62)
    alg = up2(alg) & (yy > 70) & ~rel
    rgb = blend(rgb, alg, AL1, 0.6)
    finish(rgb, 'wall_boss_leviathan.png', 56, half=False)

    # floor: blue-green mosaic with a gold spiral-wave in each quarter
    w = h = 32
    yy, xx = np.mgrid[0:h, 0:w]
    n = pnoise(w, h, 194)
    tess = ((xx % 2) ^ (yy % 2)) == 0
    rgb = gmap(np.clip(n * 0.6 + tess * 0.12 + 0.15, 0, 1), [(0, WA1), (0.5, WA2), (1, (50, 130, 140))])
    grid = (xx % 16 == 0) | (yy % 16 == 0)
    rgb[grid] = SK1
    cx_, cy_ = xx % 16 - 8, yy % 16 - 8
    r = np.hypot(cx_, cy_)
    ang = np.arctan2(cy_, cx_)
    spiral = (np.abs(((r - ang * 1.1) % 3.5) - 1.75) < 0.6) & (r < 6.5) & (r > 0.8)
    rgb[spiral] = AU2
    rgb[spiral & (cy_ < 0)] = AU3
    rgb[r < 1] = AU4
    rgb = blend(rgb, (n > 0.7) & ~grid & ~spiral, AL1, 0.4)
    finish(rgb, 'floor_boss_leviathan.png', 32)


@builder('textures')
def make_textures():
    tex_wall_crystal(); tex_wall_crystal_vein(); tex_wall_ruin_sunken(); tex_wall_coral()
    tex_floor_crystal(); tex_floor_sunken_tiles(); tex_floor_deepwater(); tex_floor_shallow()
    tex_boss_crystalqueen(); tex_boss_leviathan()


# ================================================================== shared drawing helpers for the drawn creatures
def pcrystal(p, x, y, ang, ln, wd, pal=(CR3, CR2, CR1, CR4)):
    """One hexagonal crystal prism (lit / mid / dark face, bright ridge) growing from (x, y) towards ang."""
    u = (math.cos(ang), math.sin(ang))
    v = (-u[1], u[0])
    P_ = lambda a_, b_: (x + u[0] * a_ + v[0] * b_, y + u[1] * a_ + v[1] * b_)
    body = ln * 0.72
    p.poly([P_(0, -wd), P_(body, -wd), P_(ln, 0), P_(0, 0)], pal[0])
    p.poly([P_(0, 0), P_(ln, 0), P_(body, wd * 0.5), P_(0, wd * 0.5)], pal[1])
    p.poly([P_(0, wd * 0.5), P_(body, wd * 0.5), P_(ln, 0), P_(body, wd), P_(0, wd)], pal[2])
    if ln > 4:
        p.l(*P_(1, -0.3), *P_(ln - 1.5, -0.3), pal[3])


def chunk(p, pts, c=(RK1, RK2, RK3)):
    """A rock chunk: dark rim, mid fill pulled up-left, light top-left edge."""
    cx = sum(q[0] for q in pts) / len(pts)
    cy = sum(q[1] for q in pts) / len(pts)
    p.poly(pts, c[0])
    inner = [(x + (cx - x) * 0.18 - 0.6, y + (cy - y) * 0.18 - 0.6) for x, y in pts]
    p.poly(inner, c[1])
    for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
        nx, ny = (y1 - y0), -(x1 - x0)                     # outward normal for clockwise points
        if nx * -0.6 + ny * -0.8 > 0.2 * math.hypot(nx, ny):
            p.l(x0 + (cx - x0) * 0.12, y0 + (cy - y0) * 0.12, x1 + (cx - x1) * 0.12, y1 + (cy - y1) * 0.12, c[2])


def tube(p, pts, radii, pal, belly=None, spots=None, seed=0):
    """A shaded tube along pts (tail first): dark rim, body colour, light stripe along the top, optional belly."""
    c0, c1, c2, c3 = pal
    for (x, y), r in zip(pts, radii):
        p.e(x - r, y - r, x + r, y + r, c0)
    for (x, y), r in zip(pts, radii):
        p.e(x - r + 0.7, y - r + 0.7, x + r - 0.7, y + r - 0.7, c1)
    if belly:
        for (x, y), r in zip(pts, radii):
            if r >= 2:
                p.e(x - r * 0.5, y + r * 0.15, x + r * 0.5, y + r - 0.8, belly)
    for (x, y), r in zip(pts, radii):
        p.e(x - r * 0.65, y - r * 0.75, x + r * 0.35, y - r * 0.05, c2)
    for i, ((x, y), r) in enumerate(zip(pts, radii)):
        if r >= 2 and i % 2 == 0:
            p.p(x - r * 0.3, y - r * 0.6, c3)
    if spots:
        r2 = random.Random(seed)
        for (x, y), r in zip(pts[::2], radii[::2]):
            if r >= 2.5:
                p.p(x + r2.uniform(-r * 0.5, r * 0.5), y + r2.uniform(-r * 0.4, r * 0.3), spots)


def bez(a, b, c, n):
    return [((1 - u) ** 2 * a[0] + 2 * u * (1 - u) * b[0] + u * u * c[0],
             (1 - u) ** 2 * a[1] + 2 * u * (1 - u) * b[1] + u * u * c[1]) for u in np.linspace(0, 1, n)]


def shard_burst(p, cx, cy, d, n, seed, fall=0.0, floor=None, pal=(CR4, CR3, CR1)):
    r2 = random.Random(seed)
    for i in range(n):
        a = i / n * math.tau + r2.uniform(-0.3, 0.3)
        dist = d * r2.uniform(0.6, 1.2)
        x, y = cx + math.cos(a) * dist, cy + math.sin(a) * dist + fall * fall * 8
        if floor is not None:
            y = min(y, floor)
        dx, dy = round(math.cos(a)), round(math.sin(a))
        p.p(x, y, pal[0]); p.p(x + dx, y + dy, pal[1]); p.p(x - dx, y - dy, pal[2])


# ================================================================== SHARDWISP (drawn, 32x32, floating crystal will-o'-wisp)
def shardwisp_frame(t=0.0, cy=14, sc=1.0, lean=0.0, core=1.0, eyes=1, orbit=1.0, aim=0.0, crack=0, dx=0, fl=None):
    p = Pic(32, 32)
    cx = 16 + dx
    shards = []
    for k in range(3):
        a = t * math.tau + k * math.tau / 3
        r = 9 * orbit
        sx, sy = cx + math.cos(a) * r, cy + 1 + math.sin(a) * 3 * orbit
        shards.append((math.sin(a), sx, sy, a))
    def draw_shard(sx, sy, a):
        ang = -math.pi / 2 + 0.4 * math.cos(a) if aim <= 0 else -0.15 * (1 - aim)
        ln = 4 if aim <= 0 else 4 + aim * 2
        pcrystal(p, sx - math.cos(ang) * ln / 2, sy - math.sin(ang) * ln / 2, ang, ln, 1.3, (CR3, CR2, CR1, CR4))
    for s_, sx, sy, a in shards:                         # back shards first
        if s_ < 0:
            draw_shard(sx, sy, a)
    # glow halo (dithered) under the body
    for y in range(int(cy - 9 * sc), int(cy + 9 * sc)):
        for x in range(int(cx - 6 * sc), int(cx + 7 * sc)):
            if ((x - cx) / (6 * sc)) ** 2 + ((y - cy) / (9 * sc)) ** 2 < 1 and (x + y) % 2 == 0:
                p.p(x, y, CY0)
    h, w = 10 * sc, 5 * sc
    L = lean
    top, bot = (cx + L, cy - h), (cx - L * 0.3, cy + h * 0.8)
    p.poly([top, (cx - w, cy), bot, (cx, cy)], CR3)
    p.poly([top, (cx + w, cy), bot, (cx, cy)], CR1)
    p.poly([(cx - w, cy), bot, (cx, cy)], CR2)
    p.l(top[0], top[1] + 1, cx, cy - 1, CR4)
    p.p(top[0], top[1], CR4)
    cr = 1.5 * core * sc
    p.e(cx - cr, cy - cr - 1, cx + cr, cy + cr - 1, CY2 if core < 1.5 else CY3)
    p.p(cx, cy - 1, CY3)
    if eyes:
        ey = cy - 4 * sc
        p.p(cx - 2, ey, CY3 if eyes == 1 else (255, 255, 255)); p.p(cx + 2, ey, CY3 if eyes == 1 else (255, 255, 255))
    for i in range(crack):
        p.l(cx - 1 + i, cy - 6 + i * 3, cx + 2 - i, cy - 2 + i * 3, CR0)
    for s_, sx, sy, a in shards:
        if s_ >= 0:
            draw_shard(sx, sy, a)
    r2 = random.Random(int(t * 40))                    # sparkle trail beneath
    for i in range(3):
        p.p(cx + r2.randint(-3, 3) - L, cy + 9 * sc + i * 2 + r2.randint(0, 1), CY2 if i == 0 else CR3)
    im = outline_same(p.im)
    if fl:
        im = flash(im, fl)
    return im


@builder('shardwisp')
def make_shardwisp():
    S = shardwisp_frame
    save_enemy('shardwisp', 'idle', [S(t=i / 6, cy=14 + (0, 0, -1, -1, -1, 0)[i], core=1 + 0.3 * (i in (2, 3))) for i in range(6)], 32)
    save_enemy('shardwisp', 'movement', [S(t=i / 6, lean=2 + (i % 2), cy=14 + (0, -1, -1, 0, 1, 1)[i]) for i in range(6)], 32)
    att = [S(t=0.0, core=1.4, eyes=2), S(t=0.1, core=1.8, eyes=2, orbit=0.7, sc=1.05),
           S(t=0.2, core=2.2, eyes=2, aim=0.6, orbit=0.8, sc=1.1), S(t=0.25, core=2.4, eyes=2, aim=1.0, orbit=1.1, sc=1.1),
           S(t=0.3, core=1.6, eyes=2, orbit=0.0, dx=-1), S(t=0.4, core=1.0)]
    att2 = []
    for i, f in enumerate(att):                         # the shards fly off forward on the release frame
        p = Pic(32, 32); p.paste(f, 0, 0)
        if i == 4:
            for k, yy in enumerate((9, 14, 19)):
                pcrystal(p, 24 + k, yy, 0.0, 6, 1.3); p.l(19, yy, 22, yy, CY2)
        att2.append(outline_same(p.im))
    save_enemy('shardwisp', 'attack', att2, 32)
    save_enemy('shardwisp', 'take_damage', [S(t=0.1, dx=-2, eyes=2, crack=1, fl=(255, 255, 255)), S(t=0.2, dx=-1, crack=1, orbit=1.3),
                                            S(t=0.3, crack=1)], 32)
    d = [S(t=0.0, core=2.6, eyes=2, crack=2, sc=1.1)]
    p = Pic(32, 32); p.e(9, 7, 23, 21, CY2); p.e(12, 10, 20, 18, CY3); shard_burst(p, 16, 14, 8, 9, 3)
    d.append(outline_same(p.im))
    for k, (dist, fall) in enumerate(((11, 0.0), (12, 0.7), (12, 1.2))):
        p = Pic(32, 32)
        if k == 0:
            p.e(14, 12, 18, 16, CY1)
        for i in range(7):
            a = i / 7 * math.tau + 0.3
            x, y = 16 + math.cos(a) * dist, min(27, 14 + math.sin(a) * dist * 0.7 + fall * fall * 10)
            pcrystal(p, x, y, a + k, 3, 1.0)
        d.append(outline_same(cut_below(p.im, 28)))
    p = Pic(32, 32)                                     # shards lying on the floor, the dim core among them
    for i, x in enumerate((7, 11, 15, 20, 24)):
        pcrystal(p, x, 28, -0.3 - i * 0.2 if i % 2 else 0.2 + i * 0.1, 3 + i % 2, 1.0)
    p.r(15, 27, 16, 28, CR1)
    d.append(outline_same(cut_below(p.im, 28)))
    save_enemy('shardwisp', 'death', d, 32)


# ================================================================== CRAB (drawn, 64x64, big claws)
CB0, CB1, CB2, CB3 = (84, 22, 26), (150, 46, 36), (206, 88, 50), (244, 146, 88)


def crab_leg(p, x, y, kx, ky, fx, fy, c=CB1, c2=CB0):
    p.l(x, y, kx, ky, c2, 2)
    p.l(kx, ky, fx, fy, c2, 2)
    p.l(x, y - 1, kx, ky - 1, c)
    p.l(kx, ky - 1, fx, fy - 1, c)
    p.p(fx, fy, c2)


def big_claw(p, x, y, ang, open_=0.0, s=1.0, pal=(CB0, CB1, CB2, CB3)):
    """Pincer seen from the side: palm at (x, y) pointing along ang; the upper finger opens by open_ (0..1)."""
    c0, c1, c2, c3 = pal
    u = (math.cos(ang), math.sin(ang))
    v = (-u[1], u[0])
    P_ = lambda a_, b_: (x + (u[0] * a_ + v[0] * b_) * s, y + (u[1] * a_ + v[1] * b_) * s)
    p.poly([P_(-5, -4), P_(3, -5), P_(6, -1), P_(6, 4), P_(-4, 5), P_(-6, 1)], c0)
    p.poly([P_(-4, -3), P_(3, -4), P_(5, -1), P_(5, 3), P_(-3, 4), P_(-5, 1)], c1)
    p.poly([P_(-4, -3), P_(3, -4), P_(4, -2), P_(-3, -1)], c3)
    # fixed lower finger
    p.poly([P_(4, 1), P_(13, 2), P_(14, 4), P_(5, 5)], c0)
    p.poly([P_(5, 2), P_(12, 2.5), P_(12, 3.5), P_(5, 4)], c2)
    # movable upper finger hinged at (4, -2)
    a = -open_ * 0.75
    ca, sa = math.cos(a), math.sin(a)
    Q = lambda a_, b_: P_(4 + a_ * ca - b_ * sa, -2 + a_ * sa + b_ * ca)
    p.poly([Q(0, -2), Q(8, -2), Q(11, 1), Q(9, 2), Q(0, 2)], c0)
    p.poly([Q(1, -1), Q(8, -1), Q(9.5, 0.5), Q(1, 1)], c2)
    p.p(*Q(3, -1), c3)
    for k in (6, 9):                                   # teeth
        p.p(*P_(k, 1.5), SH2)


def crab_frame(walk=None, t=0.0, bob=0, claw_open=0.0, claw_raise=0.0, claw_reach=0.0, small_open=0.0, eyes=1, dx=0, fl=None, mouth=0):
    p = Pic(64, 64)
    cx, cy = 30 + dx, 45 + bob
    # far legs (left side of the body, darker): splayed, knee high above the shell rim
    for k in range(4):
        ph = (walk + k * 1.6) if walk is not None else t * math.tau + k
        sw = math.sin(ph) * (2 if walk is not None else 0.4)
        up = max(0, math.cos(ph)) * (2 if walk is not None else 0)
        x0 = cx - 3 - k * 3
        crab_leg(p, x0, cy, x0 - 6 - k * 2 + sw, cy - 6 + k * 1.5 - up, x0 - 9 - k * 3 + sw * 1.5, 57 - up * 0.5, CB0, OUT)
    # small claw (left/back)
    big_claw(p, cx - 14, cy - 8 - small_open * 2, -2.6 + small_open * 0.3, small_open, 0.55)
    p.l(cx - 8, cy - 2, cx - 13, cy - 7 - small_open * 2, CB1, 2)
    # shell
    p.e(cx - 14, cy - 9, cx + 14, cy + 5, CB0)
    p.e(cx - 13, cy - 8, cx + 13, cy + 3, CB1)
    p.e(cx - 11, cy - 8, cx + 9, cy - 1, CB2)
    p.e(cx - 8, cy - 8, cx + 2, cy - 4, CB3)
    p.l(cx - 13, cy + 1, cx + 13, cy + 1, CB0)
    p.e(cx - 10, cy + 1, cx + 10, cy + 5, SH0)                 # pale underside
    p.l(cx - 8, cy + 3, cx + 8, cy + 3, SH1)
    for sx, sy in ((cx - 5, cy - 5), (cx + 3, cy - 6), (cx + 7, cy - 3), (cx - 9, cy - 2)):
        p.p(sx, sy, CB0)
    for k in range(5):                                         # serrated front edge
        p.p(cx + 13 - k * 0.5, cy - 7 + k * 2, CB3 if k % 2 else CB0)
    # eye stalks and mouth
    for ex in (cx + 6, cx + 10):
        p.l(ex, cy - 8, ex + 1, cy - 12, CB1)
        if eyes:
            p.e(ex, cy - 14, ex + 2, cy - 12, OUT); p.p(ex + 1, cy - 13, (255, 255, 230) if eyes == 1 else (255, 90, 60))
        else:
            p.l(ex, cy - 12, ex + 2, cy - 12, OUT)
    p.r(cx + 11, cy - 3, cx + 14, cy - 1 + mouth, CB0)
    if mouth:
        p.ps([(cx + 14, cy - 1), (cx + 15, cy), (cx + 14, cy + 1)], (230, 240, 240))   # foam
    # near legs
    for k in range(4):
        ph = (walk + k * 1.6 + math.pi) if walk is not None else t * math.tau + k + 1
        sw = math.sin(ph) * (2 if walk is not None else 0.4)
        up = max(0, math.cos(ph)) * (2 if walk is not None else 0)
        x0 = cx - 1 + k * 3
        crab_leg(p, x0, cy + 2, x0 + 6 + k * 2 + sw, cy - 4 + k * 1.5 - up, x0 + 9 + k * 3 + sw * 1.5, 57 - up * 0.5)
    # big claw (right/front)
    ax, ay = cx + 12, cy - 2
    hx = ax + 8 + claw_reach * 7
    hy = ay - 6 - claw_raise * 10 + claw_reach * 3
    p.l(ax, ay, (ax + hx) / 2, (ay + hy) / 2 + 2, CB0, 4)
    p.l(ax, ay - 1, (ax + hx) / 2, (ay + hy) / 2 + 1, CB2, 2)
    p.l((ax + hx) / 2, (ay + hy) / 2 + 2, hx - 2, hy, CB0, 4)
    p.l((ax + hx) / 2, (ay + hy) / 2 + 1, hx - 2, hy - 1, CB2, 2)
    big_claw(p, hx, hy, -0.5 - claw_raise * 0.5 + claw_reach * 0.5, claw_open, 1.0)
    im = outline_same(cut_below(p.im, 57))
    if fl:
        im = flash(im, fl)
    return im


@builder('crab')
def make_crab():
    C = crab_frame
    save_enemy('crab', 'idle', [C(t=i / 4, bob=(0, 0, 1, 0)[i], claw_open=(0, 0.3, 0, 0.2)[i], small_open=(0.2, 0, 0.3, 0)[i],
                                  mouth=i % 2) for i in range(4)], 64)
    save_enemy('crab', 'movement', [C(walk=i * math.tau / 6, bob=(0, -1, 0, 0, -1, 0)[i], claw_open=0.1, dx=(0, 1, 2, 2, 1, 0)[i])
                                    for i in range(6)], 64)
    att = [C(claw_raise=0.4, claw_open=0.4), C(claw_raise=1.0, claw_open=1.0, bob=-1, small_open=0.5),
           C(claw_raise=0.6, claw_open=1.0, claw_reach=0.6, dx=1, eyes=2), C(claw_raise=0.0, claw_open=0.0, claw_reach=1.0, dx=3, eyes=2),
           C(claw_raise=0.0, claw_open=0.3, claw_reach=0.7, dx=2), C(claw_open=0.1, dx=0)]
    att[3] = att[3].copy()
    p = Pic(64, 64); p.paste(att[3], 0, 0)
    for k, (x, y) in enumerate(((58, 36), (60, 40), (57, 31))):          # snap sparks
        p.l(x, y, x + 2 + k % 2, y - 1 + k, (255, 250, 220))
    att[3] = p.im
    save_enemy('crab', 'attack', att, 64)
    save_enemy('crab', 'take_damage', [C(dx=-3, eyes=2, claw_open=0.6, fl=(255, 255, 255)), C(dx=-2, claw_open=0.4, bob=1), C(dx=-1)], 64)
    up = C(eyes=0)
    dth = [C(eyes=2, claw_open=1, claw_raise=0.8, bob=-1),
           ground(up.rotate(20, resample=Image.NEAREST, center=(30, 50)), 57)]
    for k in range(3):
        im = C(walk=k * 1.7 if k < 2 else None, eyes=0, claw_raise=0.3 + k * 0.2).transpose(Image.FLIP_TOP_BOTTOM)
        if k == 2:
            a_ = np.array(im); bb = im.getbbox(); a_[:bb[1] + 4] = 0; im = Image.fromarray(a_)
        dth.append(ground(im, 57))
    save_enemy('crab', 'death', dth, 64)


# ================================================================== EEL (drawn, 64x64, rises out of deep water)
EE = ((16, 30, 30), (44, 78, 58), (88, 126, 72), (150, 178, 96))
EE_BELLY, EE_FIN, EE_SPOT = (196, 196, 126), (112, 70, 96), (26, 44, 36)


def eel_head(p, x, y, ang, mouth=0.0, eyes=1, r=4.0):
    u = (math.cos(ang), math.sin(ang))
    v = (-u[1], u[0])
    P_ = lambda a_, b_: (x + u[0] * a_ + v[0] * b_, y + u[1] * a_ + v[1] * b_)
    o = mouth * 4
    # lower jaw
    p.poly([P_(-3, 0), P_(9, 1 + o), P_(9, 3 + o), P_(-2, r)], EE[0])
    p.poly([P_(-2, 1), P_(8, 1.5 + o), P_(8, 2.5 + o), P_(-2, r - 1)], EE_BELLY)
    # upper head
    p.poly([P_(-4, -r), P_(4, -r), P_(10, -1 - o * 0.4), P_(10, 1 - o * 0.4), P_(-4, 1)], EE[0])
    p.poly([P_(-3, -r + 1), P_(4, -r + 1), P_(9, -1 - o * 0.4), P_(9, 0 - o * 0.4), P_(-3, 0)], EE[1])
    p.poly([P_(-3, -r + 1), P_(4, -r + 1), P_(6, -r + 2), P_(-3, -r + 2.5)], EE[2])
    if mouth > 0.2:
        p.poly([P_(0, 0.5), P_(9, 0 - o * 0.4 + 1), P_(9, 1 + o)], (120, 30, 40))
        for k in (3, 5, 7):
            p.p(*P_(k, 0.6 + (k / 9) * 0), (240, 240, 220))
            p.p(*P_(k, 1 + o * k / 9), (240, 240, 220))
    if eyes:
        p.p(*P_(4, -r + 2.2), (255, 220, 80) if eyes == 1 else (255, 255, 255)); p.p(*P_(5, -r + 2.2), OUT)


def eel_frame(head=(36, 36), ctrl=(30, 50), base=(26, 57), ang=-0.3, mouth=0.0, n=14, r0=5.0, rh=4.0, ring=1, fl=None,
              eyes=1, splash_=0, hump=None, fin=True):
    p = Pic(64, 64)
    # water: dark hole with ripples behind
    p.e(base[0] - 13, 54, base[0] + 13, 59, WA1)
    p.e(base[0] - 10, 55, base[0] + 10, 58, WA0)
    if hump:                                            # an arch of the body further back
        hx, hh = hump
        pts = bez((hx - 9, 57), (hx, 57 - hh * 2), (hx + 9, 57), 9)
        tube(p, pts, [3.5] * 9, EE, belly=None, spots=EE_SPOT, seed=3)
        ripple(p, hx - 9, 57, 3); ripple(p, hx + 9, 57, 3)
    pts = bez(base, ctrl, head, n)
    radii = [r0 - (r0 - rh) * i / (n - 1) for i in range(n)]
    if fin:                                             # dorsal fin along the back (left/top side of the curve)
        for i in range(2, n - 2):
            (x0, y0), (x1, y1) = pts[i - 1], pts[i + 1]
            tx, ty = x1 - x0, y1 - y0
            ln = math.hypot(tx, ty) or 1
            nx, ny = ty / ln, -tx / ln
            if nx > 0:
                nx, ny = -nx, -ny
            x, y = pts[i]
            r = radii[i]
            p.l(x, y, x + nx * (r + 2.5), y + ny * (r + 2.5), EE_FIN)
            p.p(x + nx * (r + 2), y + ny * (r + 2), (160, 110, 140))
    tube(p, pts, radii, EE, belly=EE_BELLY, spots=EE_SPOT, seed=1)
    eel_head(p, head[0], head[1], ang, mouth, eyes, rh)
    # near rim of the water, ripples
    p.arc(base[0] - 13, 53, base[0] + 13, 60, 0, 180, WA3)
    if ring:
        ripple(p, base[0], 57, 14 + ring, WA4, WA3)
    if splash_:
        splash(p, base[0], 56, splash_, 7)
    im = outline_same(cut_below(p.im, 57))
    if fl:
        im = flash(im, fl)
    return im


@builder('eel')
def make_eel():
    E = eel_frame
    idle = [E(head=(36 + dx, 38 + dy), ctrl=(28 + dx * 2, 50), ang=-0.3 + dx * 0.1, mouth=m, ring=(1, 2, 1, 0)[i])
            for i, (dx, dy, m) in enumerate(((0, 0, 0), (1, -1, 0.2), (2, -1, 0.1), (1, 0, 0)))]
    save_enemy('eel', 'idle', idle, 64)
    mv = []
    for i in range(6):                                  # swimming: head low, a hump rolling along the surface
        hx = 10 + (i * 4) % 20
        mv.append(E(head=(40 + (i % 2), 46 + (i % 3 == 0)), ctrl=(34, 54), base=(28, 57), ang=0.05, n=10, r0=4.2, rh=4,
                    hump=(hx, 4 + (i % 2)), ring=1 + i % 2, fin=True))
    save_enemy('eel', 'movement', mv, 64)
    att = [E(head=(30, 30), ctrl=(22, 48), ang=-0.6, mouth=0.3, ring=1),           # rears back
           E(head=(26, 24), ctrl=(18, 46), ang=-0.8, mouth=0.7, ring=2, eyes=2),
           E(head=(48, 34), ctrl=(30, 34), ang=0.1, mouth=1.0, ring=2, eyes=2, splash_=6),     # strikes
           E(head=(54, 42), ctrl=(36, 36), ang=0.4, mouth=0.2, ring=3, eyes=2, splash_=4),
           E(head=(44, 40), ctrl=(30, 46), ang=0.0, mouth=0.0, ring=1),
           E(head=(37, 38), ctrl=(28, 50), ang=-0.3, ring=1)]
    save_enemy('eel', 'attack', att, 64)
    save_enemy('eel', 'take_damage', [E(head=(31, 36), ctrl=(24, 48), ang=-0.6, mouth=0.6, eyes=2, fl=(255, 255, 255), splash_=4),
                                      E(head=(33, 37), ctrl=(26, 49), ang=-0.5, mouth=0.4, eyes=2), E(head=(35, 38), ctrl=(27, 50), mouth=0.1)], 64)
    d = [E(head=(30, 26), ctrl=(24, 44), ang=-1.0, mouth=1.0, eyes=2, splash_=5),
         E(head=(40, 36), ctrl=(28, 40), ang=0.6, mouth=0.6, eyes=0),
         E(head=(46, 48), ctrl=(32, 44), ang=1.0, mouth=0.4, eyes=0, ring=2),
         E(head=(44, 54), ctrl=(34, 52), ang=0.4, mouth=0.4, eyes=0, ring=3, n=8, r0=4.5, splash_=3)]
    p = Pic(64, 64)                                     # floating belly-up on the surface
    pts = bez((14, 56), (30, 52), (46, 56), 12)
    p.e(10, 54, 50, 59, WA1)
    tube(p, pts, [3.5] * 12, (EE[0], EE_BELLY, (226, 226, 170), (250, 250, 210)), belly=None)
    p.l(46, 55, 52, 56, EE[1], 2); p.p(50, 55, OUT)
    ripple(p, 30, 57, 22, WA4, WA3)
    d.append(outline_same(cut_below(p.im, 57)))
    save_enemy('eel', 'death', d, 64)


# ================================================================== CRYSTAL GOLEM (drawn, 64x64, size 1.3: rock body grown with crystals)
GR = ((50, 46, 70), (92, 86, 116), (138, 132, 164))
GR_D = ((34, 30, 50), (62, 58, 84), (92, 86, 116))


def limb(p, a, b, w, pal=GR):
    """A blocky stone limb from a to b (a quad w px wide with chunk shading)."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    ln = math.hypot(dx, dy) or 1
    nx, ny = -dy / ln * w / 2, dx / ln * w / 2
    pts = [(a[0] - nx, a[1] - ny), (b[0] - nx * 0.85, b[1] - ny * 0.85), (b[0] + nx * 0.85, b[1] + ny * 0.85), (a[0] + nx, a[1] + ny)]
    if dx * ny - dy * nx < 0:
        pts = pts[::-1]
    chunk(p, pts, pal)


def golem_frame(hip=(30, 40), lean=0.0, step=0.0, arms=None, core=1.0, eyes=1, crack=0, fl=None, dx=0, burst=0, chips=0):
    """hip = pelvis, lean tilts the torso forward (px at the shoulders), step -1..1 moves the legs,
    arms = ((back elbow, back fist), (front elbow, front fist)) relative to the shoulders."""
    p = Pic(64, 64)
    hx, hy = hip[0] + dx, hip[1]
    sh = (hx + 3 + lean, hy - 20)                       # shoulder line centre
    bs, fs = (sh[0] - 9, sh[1] + 1), (sh[0] + 9, sh[1] + 2)
    if arms is None:
        arms = (((-3, 10), (-1, 20)), ((3, 10), (5, 20)))
    (be, bf), (fe, ff) = arms
    # back arm and back leg (darker)
    limb(p, bs, (bs[0] + be[0], bs[1] + be[1]), 7, GR_D)
    limb(p, (bs[0] + be[0], bs[1] + be[1]), (bs[0] + bf[0], bs[1] + bf[1]), 7, GR_D)
    bx_, by_ = bs[0] + bf[0], bs[1] + bf[1]
    chunk(p, [(bx_ - 4, by_ - 3), (bx_ + 4, by_ - 4), (bx_ + 5, by_ + 3), (bx_ - 3, by_ + 4)], GR_D)
    kx = hx - 5 - step * 3
    limb(p, (hx - 4, hy), (kx, hy + 8), 8, GR_D)
    limb(p, (kx, hy + 8), (kx - 1 - step * 2, 55), 8, GR_D)
    chunk(p, [(kx - 6 - step * 2, 53), (kx + 4 - step * 2, 53), (kx + 5 - step * 2, 57), (kx - 6 - step * 2, 57)], GR_D)
    # front leg
    kx = hx + 4 + step * 3
    limb(p, (hx + 3, hy), (kx, hy + 8), 9)
    limb(p, (kx, hy + 8), (kx + step * 2, 55), 9)
    fx = kx + step * 2
    chunk(p, [(fx - 5, 52), (fx + 6, 52), (fx + 7, 57), (fx - 5, 57)], GR)
    # torso: big boulder chest over a narrower waist
    chunk(p, [(hx - 7, hy + 2), (hx + 8, hy + 2), (hx + 10, hy - 6), (hx - 9, hy - 6)], GR)
    torso = [(hx - 10, hy - 5), (hx + 11, hy - 5), (sh[0] + 15, sh[1] + 2), (sh[0] + 10, sh[1] - 5), (sh[0] - 6, sh[1] - 7), (sh[0] - 15, sh[1])]
    chunk(p, torso, GR)
    # crystal clusters on the back and the shoulders
    pcrystal(p, sh[0] - 10, sh[1] - 1, -2.3, 10, 2.6)
    pcrystal(p, sh[0] - 7, sh[1] - 4, -2.0, 12, 3.0)
    pcrystal(p, sh[0] - 2, sh[1] - 6, -1.7, 8, 2.4)
    pcrystal(p, sh[0] - 13, sh[1] + 5, -2.6, 8, 2.0)
    pcrystal(p, hx - 9, hy - 2, -2.9, 6, 1.6)
    # glowing core in the chest
    cxc, cyc = sh[0] + 5, sh[1] + 7
    r = 2 + core
    p.e(cxc - r - 1, cyc - r, cxc + r, cyc + r + 1, RK0)
    p.poly([(cxc, cyc - r), (cxc + r, cyc), (cxc, cyc + r), (cxc - r, cyc)], CY1 if core < 1.5 else CY2)
    p.poly([(cxc, cyc - r + 1), (cxc + 1, cyc), (cxc, cyc + 1), (cxc - 1, cyc)], CY3)
    for k in range(1 + crack):                          # glowing cracks running out of the core
        a = -0.8 + k * 1.3
        p.l(cxc, cyc, cxc + math.cos(a) * (5 + crack * 2), cyc + math.sin(a) * (5 + crack * 2), CY2 if k else CY1)
    # head: a small boulder sunk between the shoulders, glowing eyes under a heavy brow
    p0 = p
    p = Pic(64, 64)                                     # head and front arm on their own outlined layer
    hdx, hdy = sh[0] + 11 + lean * 0.5, sh[1] - 1
    chunk(p, [(hdx - 6, hdy - 5), (hdx + 5, hdy - 6), (hdx + 8, hdy - 1), (hdx + 7, hdy + 5), (hdx - 1, hdy + 6), (hdx - 6, hdy + 2)], GR)
    p.l(hdx - 3, hdy - 2, hdx + 7, hdy - 3, (34, 30, 50))           # heavy brow
    p.r(hdx + 1, hdy - 1, hdx + 7, hdy + 1, (24, 20, 36))            # eye socket
    p.l(hdx + 2, hdy + 3, hdx + 7, hdy + 3, (34, 30, 50))            # jaw line
    if eyes:
        ec = CY3 if eyes == 1 else (255, 255, 255)
        p.r(hdx + 2, hdy, hdx + 3, hdy, ec); p.r(hdx + 5, hdy, hdx + 6, hdy, ec)
    pcrystal(p, hdx - 3, hdy - 5, -2.0, 6, 1.6)
    # front arm (over the body) with a huge fist and crystal knuckles
    limb(p, fs, (fs[0] + fe[0], fs[1] + fe[1]), 8)
    limb(p, (fs[0] + fe[0], fs[1] + fe[1]), (fs[0] + ff[0], fs[1] + ff[1]), 8)
    fx_, fy_ = fs[0] + ff[0], fs[1] + ff[1]
    chunk(p, [(fx_ - 5, fy_ - 4), (fx_ + 5, fy_ - 5), (fx_ + 6, fy_ + 4), (fx_ - 4, fy_ + 5)], GR)
    pcrystal(p, fx_ + 2, fy_ - 3, -1.2, 5, 1.4)
    chunk(p, [(fs[0] - 6, fs[1] - 5), (fs[0] + 5, fs[1] - 6), (fs[0] + 7, fs[1] + 2), (fs[0] - 5, fs[1] + 3)], GR)   # shoulder plate
    pcrystal(p, fs[0], fs[1] - 5, -1.3, 7, 1.8)
    p0.paste(outline_same(p.im), 0, 0)
    p = p0
    if burst:                                           # crystal shards bursting out of the floor in front
        for k, (x, ln) in enumerate(((44, 6), (49, 9), (54, 7), (58, 4))):
            if k < burst + 1:
                pcrystal(p, x, 57, -1.4 - k * 0.1, ln * min(1, burst / 2 + 0.3), 2.0)
    if chips:
        r2 = random.Random(chips)
        for _ in range(5):
            x, y = hx + r2.randint(6, 20), hy - r2.randint(10, 26)
            p.p(x, y, RK3); p.p(x + 1, y, CR3)
    im = outline_same(cut_below(p.im, 57))
    if fl:
        im = flash(im, fl)
    return im


def golem_rubble(k, glow_=1.0):
    """Crumbled golem: a pile of boulders with crystals sticking out (k = 0..2, settling)."""
    p = Pic(64, 64)
    r2 = random.Random(5)
    rocks = [(18, 51, 7), (28, 49, 9), (40, 50, 8), (48, 53, 5), (12, 54, 4), (34, 53, 6)]
    for (x, y, r) in rocks:
        y = y + k * (57 - y) * 0.15
        pts = [(x + math.cos(a) * r * r2.uniform(0.8, 1.1), min(57, y + math.sin(a) * r * 0.7 * r2.uniform(0.8, 1.1)))
               for a in np.linspace(-math.pi, math.pi, 7)[:-1]]
        chunk(p, pts[::-1], GR)
    for (x, y, a, ln) in ((24, 45, -2.0, 11), (30, 43, -1.5, 13), (38, 46, -1.0, 9), (44, 49, -0.6, 6)):
        pcrystal(p, x, y + k, a, ln - k, 2.4)
    p.e(29, 49, 34, 53, RK0)
    p.poly([(31, 49), (33, 51), (31, 53), (29, 51)], CY1 if glow_ > 0.5 else CY0)
    return outline_same(cut_below(p.im, 57))


@builder('crystalgolem')
def make_crystalgolem():
    G = golem_frame
    idle = [G(hip=(29, 40 + b), core=c, arms=(((-3, 10), (-1, 20 - b)), ((3, 10 + b), (5, 20))))
            for b, c in ((0, 1.0), (0, 1.3), (1, 1.6), (1, 1.3))]
    save_enemy('crystalgolem', 'idle', idle, 64)
    mv = []
    for i in range(6):
        s = math.sin(i / 6 * math.tau)
        b = 0 if i % 3 == 0 else 1
        mv.append(G(hip=(29, 40 + b), step=s, lean=1, arms=(((-3 + s * 2, 10), (-1 + s * 4, 20)), ((3 - s * 2, 10), (5 - s * 4, 20)))))
    save_enemy('crystalgolem', 'movement', mv, 64)
    up = (((-2, -7), (1, -13)), ((2, -8), (5, -14)))
    att = [G(hip=(30, 41), lean=-2, arms=(((-4, 4), (-2, -6)), ((3, 3), (6, -6))), core=1.4),
           G(hip=(30, 40), lean=-3, arms=up, core=1.8, eyes=2),
           G(hip=(30, 41), lean=-3, arms=up, core=2.2, eyes=2),
           G(hip=(29, 43), lean=4, arms=(((5, 8), (11, 15)), ((7, 8), (13, 15))), core=2.0, eyes=2, burst=1),
           G(hip=(29, 43), lean=4, arms=(((5, 8), (11, 15)), ((7, 8), (13, 15))), core=1.5, burst=3),
           G(hip=(30, 41), lean=2, arms=(((2, 9), (6, 16)), ((5, 9), (9, 16))), burst=2),
           G(hip=(30, 40), core=1.0)]
    save_enemy('crystalgolem', 'attack', att, 64)
    save_enemy('crystalgolem', 'take_damage', [G(hip=(28, 40), lean=-3, eyes=2, fl=(255, 255, 255), chips=1),
                                               G(hip=(29, 40), lean=-2, chips=2), G(hip=(30, 40), lean=-1)], 64)
    d = [G(hip=(30, 40), lean=-2, crack=1, core=2.4, eyes=2), G(hip=(30, 41), lean=-1, crack=2, core=2.6, eyes=2),
         G(hip=(30, 45), lean=4, crack=3, core=2.0, eyes=0, arms=(((2, 8), (5, 14)), ((4, 8), (10, 13))))]
    p = Pic(64, 64); p.paste(golem_rubble(0), 0, -3); shard_burst(p, 31, 36, 12, 10, 4); d.append(outline_same(p.im))
    d += [golem_rubble(1), golem_rubble(2, 0.2)]
    save_enemy('crystalgolem', 'death', d, 64)


# ================================================================== Pixel Crawler Body_A helpers (shared by the sailor and the witch)
SKIN = P5.SKIN
EYE_G, EYE_W1, EYE_W2 = P5.EYE_G, P5.EYE_W1, P5.EYE_W2


def body_src(anim, idx=None):
    return load_frames(BODY + f'{anim}_Base/{anim}_Side-Sheet.png', 64, idx=idx)


def head_centre(src, g):
    e = eye_of(src)
    if e:
        return e[0] - 3, e[1] - 2
    b = g.getbbox()
    a = mask_of(g)
    xs = np.nonzero(a[b[1]:b[1] + 4].any(0))[0]
    return (xs.min() + xs.max()) / 2, b[1] + 5


def dress(src, pals, eye=None, r_head=6.5, r_torso=15.0, stripes=None, hc=None):
    """Recolour the bare Body_A by region: pals = {'head': 4 colours, 'torso': ..., 'legs': ...} in the order of
    SKIN (mid, dark, darkest, light). stripes = (colour, period): horizontal stripes on the torso."""
    g = strip_tool(src)
    if not g.getbbox():
        return g, None
    hx, hy = hc or head_centre(src, g)
    a = np.array(g)
    yy, xx = np.mgrid[0:64, 0:64]
    d = np.hypot(xx - hx, yy - hy)
    region = np.where(d < r_head, 0, np.where(d < r_torso, 1, 2))
    for ri, key in enumerate(('head', 'torso', 'legs')):
        for k, sc in enumerate(SKIN):
            m = (region == ri) & (a[:, :, 0] == sc[0]) & (a[:, :, 1] == sc[1]) & (a[:, :, 2] == sc[2]) & (a[:, :, 3] > 0)
            a[m, :3] = pals[key][k]
            if stripes and key == 'torso':
                st = m & (((yy - int(hy)) // stripes[1]) % 2 == 0)
                a[st, :3] = stripes[0] if k != 1 and k != 2 else dark(stripes[0], 0.7)
    blk = (a[:, :, 0] < 8) & (a[:, :, 1] < 8) & (a[:, :, 2] < 8) & (a[:, :, 3] > 0)
    a[blk, :3] = OUT
    for c in (EYE_W1, EYE_W2):
        m = (a[:, :, 0] == c[0]) & (a[:, :, 1] == c[1]) & (a[:, :, 2] == c[2])
        a[m, :3] = pals['head'][1]
    m = (a[:, :, 0] == EYE_G[0]) & (a[:, :, 1] == EYE_G[1]) & (a[:, :, 2] == EYE_G[2])
    a[m, :3] = eye or pals['head'][2]
    return Image.fromarray(a), (hx, hy)


def cell_of(img, feet, cx, dx=0, dy=0):
    out = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    out.paste(img, (32 - cx + dx, 57 - feet + dy), img)
    return out


# ================================================================== DROWNED SAILOR (Body_A, striped shirt, cap, boat hook)
NAVY0, NAVY1, NAVY2 = (22, 26, 48), (38, 46, 82), (60, 72, 120)
SAIL_PAL = {'head': (DS2, DS1, DS0, DS3), 'torso': ((210, 206, 190), (150, 146, 136), (96, 92, 90), (236, 232, 220)),
            'legs': (NAVY1, NAVY0, NAVY0, NAVY2)}
WEED0, WEED1 = (30, 70, 40), (70, 120, 56)
HOOK_POLE = ((70, 48, 34), (112, 80, 52))


def gaff(p, hx, hy, ang, ln=16, back=5):
    """Boat hook: wooden pole through the hand at (hx, hy) along ang, iron hook and spike at the far end."""
    u = (math.cos(ang), math.sin(ang))
    v = (-u[1], u[0])
    x0, y0 = hx - u[0] * back, hy - u[1] * back
    x1, y1 = hx + u[0] * ln, hy + u[1] * ln
    p.l(x0, y0, x1, y1, HOOK_POLE[0], 2)
    p.l(x0, y0, x1, y1, HOOK_POLE[1])
    p.l(x1, y1, x1 + u[0] * 4, y1 + u[1] * 4, I2)                         # spike
    p.p(x1 + u[0] * 4, y1 + u[1] * 4, I3)
    # hook curling back (to the side of v)
    pts = [(x1 + u[0] * 1 + v[0] * 1, y1 + u[1] * 1 + v[1] * 1), (x1 + v[0] * 3, y1 + v[1] * 3),
           (x1 - u[0] * 2 + v[0] * 4, y1 - u[1] * 2 + v[1] * 4), (x1 - u[0] * 4 + v[0] * 3, y1 - u[1] * 4 + v[1] * 3)]
    p.lines(pts, I2, 2)
    p.lines(pts, I3)
    p.p(*pts[-1], (230, 230, 230))
    p.l(x1 - u[0] * 1, y1 - u[1] * 1, x1 + u[0] * 1, y1 + u[1] * 1, R2)       # rusty collar


def sailor_extras(p, hc, top, phase=0.0, cap=True, weed=True, drip=0):
    hx, hy = hc
    if cap:                                                               # knitted navy cap with a turned-up rim
        p.e(hx - 5, hy - 7, hx + 4, hy - 1, NAVY1)
        p.e(hx - 4, hy - 7, hx + 2, hy - 3, NAVY2)
        p.l(hx - 6, hy - 2, hx + 5, hy - 2, NAVY0)
        p.l(hx - 6, hy - 1, hx + 5, hy - 1, NAVY1)
        for x in range(int(hx) - 5, int(hx) + 5, 2):
            p.p(x, hy - 1, NAVY2)
    if weed:                                                              # seaweed hanging from the head and shoulder
        for k, (sx, sy, ln) in enumerate(((hx - 5, hy, 6), (hx - 3, hy + 7, 8), (hx + 2, hy + 9, 5))):
            for i in range(ln):
                x = sx + math.sin(phase + i * 0.8 + k) * 1.0 - i * 0.2
                p.p(x, sy + i, WEED1 if i < ln - 2 else WEED0)
    for i in range(drip):                                                 # water drops
        p.p(hx - 3 + i * 3, hy + 13 + ((i * 5 + int(phase * 3)) % 7), WA4)


def sailor_cell(f, feet, cx, phase=0.0, hook=None, eyes=True, dx=0, dy=0, hunch=0.12, drip=1, cap=True, fl=None):
    g, hc = dress(f, SAIL_PAL, eye=(200, 255, 240) if eyes else DS0, stripes=(NAVY1, 2))
    if hc is None:
        return Image.new('RGBA', (64, 64))
    p = Pic(64, 64)
    if hook and hook[3] == 'back':
        gaff(p, *hook[:3])
    p.paste(g, 0, 0)
    b = g.getbbox()
    sailor_extras(p, hc, b[1], phase, cap=cap, drip=drip)
    if hook and hook[3] != 'back':
        gaff(p, *hook[:3])
    im = shear(p.im, hunch, feet - 6) if hunch else p.im
    im = cell_of(outline_same(im), feet, cx, dx, dy)
    if fl:
        im = flash(im, fl)
    return im


@builder('sailor')
def make_sailor():
    idle, walk, sl, hit, de = body_src('Idle'), body_src('Walk'), body_src('Slice'), body_src('Hit'), body_src('Death')
    feet = max(f.getbbox()[3] - 1 for f in idle)
    b = idle[0].getbbox()
    cx = (b[0] + b[2]) // 2

    def held(f):
        g = strip_tool(f)
        hx, hy = front_hand(g, g.getbbox()[1], (14, 22))
        return (hx, hy, -math.pi / 2 + 0.15, 'front')
    save_enemy('sailor', 'idle', [sailor_cell(f, feet, cx, phase=i * 1.3, hook=held(f), drip=1 + i % 2) for i, f in enumerate(idle)], 64)
    save_enemy('sailor', 'movement', [sailor_cell(f, feet, cx, phase=i, hook=held(f), hunch=0.2, dy=(0, 1, 0, 0, 1, 0)[i])
                                      for i, f in enumerate(walk)], 64)
    att, last = [], None
    for i, f in enumerate(sl):
        ax = (tool_axis(f) if i != 3 else None) or last
        last = ax
        hk = (ax[0][0], ax[0][1], ax[1], 'back' if i < 3 else 'front') if ax else None
        if i == 3:                                                         # the smear frame: hook swept forward
            gs = strip_tool(f)
            hx_, hy_ = front_hand(gs, gs.getbbox()[1], (8, 16))
            hk = (hx_, hy_, -0.25, 'front')
        c = sailor_cell(f, feet, cx, phase=i, hook=hk, hunch=0.05, dx=-3 if i >= 3 else 0)
        if i == 4:                                                         # water flung off the hook
            p = Pic(64, 64); p.paste(c, 0, 0)
            for k in range(5):
                p.p(46 + k * 2, 40 - k + (k % 2) * 3, WA4 if k % 2 else WA5)
            c = p.im
        att.append(c)
    save_enemy('sailor', 'attack', att, 64)
    save_enemy('sailor', 'take_damage', [sailor_cell(f, feet, cx, phase=i, hook=held(f), dx=-1 - (i == 0), drip=3,
                                                     fl=(255, 255, 255) if i == 0 else None) for i, f in enumerate(hit)], 64)
    dfr = []
    for i, f in enumerate(de):
        c = sailor_cell(f, feet, cx, phase=i, eyes=i < 3, hunch=0.0, cap=i < 5, drip=0)
        p = Pic(64, 64); p.paste(c, 0, 0)
        if i >= 4:                                                         # the cap rolls off, a puddle spreads
            p.e(10 - i, 55, 46 + i, 58, WA2); p.e(14 - i, 56, 40 + i, 57, WA3)
            p.paste(c, 0, 0)
        if i >= 5:
            x = 44 + (i - 5) * 2
            p.e(x, 53, x + 7, 57, NAVY1); p.l(x, 56, x + 7, 56, NAVY0); p.l(x + 1, 54, x + 4, 54, NAVY2)
        if i >= 6:                                                         # the boat hook lies beside him
            gaff(p, 6, 57, 0.0, 14, 0)
        dfr.append(outline_same(cut_below(p.im, 57)))
    save_enemy('sailor', 'death', dfr, 64)


# ================================================================== WITCH (Body_A, dress, wide pointed hat, crooked staff, curse)
WS0, WS1, WS2, WS3 = (70, 92, 56), (110, 138, 84), (150, 178, 112), (190, 214, 150)      # green-grey skin
DR0, DR1, DR2, DR3 = (24, 14, 34), (46, 26, 62), (72, 44, 96), (104, 70, 134)            # dress
WITCH_PAL = {'head': (WS2, WS1, WS0, WS3), 'torso': (DR2, DR1, DR0, DR3), 'legs': (DR1, DR0, DR0, DR2)}
HEX0, HEX1, HEX2 = (60, 150, 60), (130, 230, 90), (220, 255, 170)                         # sickly green curse light
STAFF_W = ((56, 36, 30), (92, 64, 44))


def witch_hat(p, hx, hy, tilt=0.0, buckle=True):
    p.e(hx - 9, hy - 5, hx + 8, hy - 1, DR0)                                # brim
    p.e(hx - 8, hy - 5, hx + 7, hy - 2, DR1)
    tip = (hx - 8 - tilt * 4, hy - 19 + tilt * 3)
    p.poly([(hx - 6, hy - 4), (hx + 4, hy - 4), (hx - 1, hy - 12), tip, (hx - 5, hy - 12)], DR0)
    p.poly([(hx - 5, hy - 5), (hx + 2, hy - 5), (hx - 2, hy - 11), (tip[0] + 1, tip[1] + 1), (hx - 5, hy - 11)], DR2)
    p.l(hx - 4, hy - 6, hx - 4, hy - 10, DR3)
    p.l(hx - 6, hy - 5, hx + 4, hy - 5, V1)                                 # band
    if buckle:
        p.r(hx - 1, hy - 6, hx + 1, hy - 5, AU2); p.p(hx, hy - 5, DR1)


def witch_hair(p, hx, hy, phase=0.0):
    for k in range(4):
        x0 = hx - 6 + k
        for i in range(9 - k):
            p.p(x0 - math.sin(phase + i * 0.6) * 0.8 - i * 0.25, hy - 2 + i, (60, 60, 70) if (i + k) % 3 else (96, 96, 110))


def crooked_staff(p, hx, hy, ang, ln=22, back=6, glow_=1.0):
    u = (math.cos(ang), math.sin(ang))
    v = (-u[1], u[0])
    pts = [(hx - u[0] * back, hy - u[1] * back)]
    for k, w in ((0.3, 1.0), (0.55, -1.0), (0.8, 0.8), (1.0, 0.0)):
        pts.append((hx + u[0] * ln * k + v[0] * w, hy + u[1] * ln * k + v[1] * w))
    p.lines(pts, STAFF_W[0], 2)
    p.lines(pts, STAFF_W[1])
    tx, ty = pts[-1]
    p.l(tx, ty, tx - v[0] * 3 + u[0] * 2, ty - v[1] * 3 + u[1] * 2, STAFF_W[0], 2)      # forked top
    p.l(tx, ty, tx + v[0] * 3 + u[0] * 2, ty + v[1] * 3 + u[1] * 2, STAFF_W[0], 2)
    ox, oy = tx + u[0] * 2.5, ty + u[1] * 2.5
    r = 1.5 + glow_ * 0.8
    p.e(ox - r, oy - r, ox + r, oy + r, HEX0 if glow_ < 1.5 else HEX1)
    p.p(ox - 0.5, oy - 0.5, HEX2)
    return ox, oy


def hex_curse(p, x, y, r, phase, k=1.0):
    """A curse: a sickly green ring of runes around a violet core."""
    for rr, c in ((r + 1, V0), (r, V1), (max(1, r - 1.5), V2), (max(0, r - 3), V3)):
        p.e(x - rr, y - rr, x + rr, y + rr, c)
    p.eo(x - r - 2, y - r - 2, x + r + 2, y + r + 2, HEX1)
    for i in range(6):
        a = phase + i * math.tau / 6
        p.p(x + math.cos(a) * (r + 2), y + math.sin(a) * (r + 2), HEX2)
        if k > 0.5:
            p.p(x + math.cos(a + 0.3) * (r + 4), y + math.sin(a + 0.3) * (r + 4), HEX0)
    if r >= 3:                                                               # tiny skull in the core
        p.r(x - 1, y - 1, x + 1, y, (230, 230, 210)); p.p(x - 1, y, V0); p.p(x + 1, y, V0); p.p(x, y + 1, (230, 230, 210))


def witch_robe(p, g, hy, sway=0.0, flare=1.5):
    """A long skirt from the waist to the feet, flaring out (drawn over the legs)."""
    a = mask_of(g)
    b = g.getbbox()
    feet = b[3] - 1
    belt = int(hy + 11)
    if belt >= feet - 2:
        return
    xs = np.nonzero(a[belt])[0]
    if not len(xs):
        return
    x0, x1 = xs.min(), xs.max()
    for y in range(belt, feet + 1):
        t = (y - belt) / max(1, feet - belt)
        l = x0 - round(t * flare) + round(sway * t)
        r = x1 + round(t * flare) + round(sway * t)
        for x in range(l, r + 1):
            c = DR1
            if x <= l + 1:
                c = DR0
            elif (x - l) % 3 == 1 and y < feet:
                c = DR2 if x > (l + r) // 2 else DR0
            p.p(x, y, c)
    p.l(x0 - round(flare) + round(sway), feet, x1 + round(flare) + round(sway), feet, DR0)
    p.l(x0, belt, x1, belt, V1)


def witch_cell(f, feet, cx, phase=0.0, staff=None, robe=True, hat=True, dx=0, dy=0, sway=0.0, fl=None, glow_=1.0, curse=None):
    g, hc = dress(f, WITCH_PAL, eye=HEX2)
    if hc is None:
        return Image.new('RGBA', (64, 64))
    hx, hy = hc
    p = Pic(64, 64)
    witch_hair(p, hx, hy, phase)
    if staff and staff[3] == 'back':
        crooked_staff(p, *staff[:3], glow_=glow_)
    p.paste(g, 0, 0)
    if robe:
        witch_robe(p, g, hy, sway)
    p.p(hx + 4, hy + 2, WS3); p.p(hx + 5, hy + 2, WS1)                      # long crooked nose
    p.p(hx + 6, hy + 3, WS1)
    if hat:
        witch_hat(p, hx, hy, tilt=math.sin(phase) * 0.3)
    tip = None
    if staff and staff[3] != 'back':
        tip = crooked_staff(p, *staff[:3], glow_=glow_)
    if curse and tip:
        hex_curse(p, tip[0] + curse[0], tip[1] + curse[1], curse[2], phase)
    im = cell_of(outline_same(p.im), feet, cx, dx, dy)
    if fl:
        im = flash(im, fl)
    return im


@builder('witch')
def make_witch():
    idle, walk, pr, hit, de = body_src('Idle'), body_src('Walk'), body_src('Pierce'), body_src('Hit'), body_src('Death')
    feet = max(f.getbbox()[3] - 1 for f in idle)
    b = idle[0].getbbox()
    cx = (b[0] + b[2]) // 2

    def held(f, lean=0.2):
        gs = strip_tool(f)
        hx, hy = front_hand(gs, gs.getbbox()[1], (14, 22))
        return (hx, hy, -math.pi / 2 + lean, 'front')
    save_enemy('witch', 'idle', [witch_cell(f, feet, cx, phase=i * 1.4, staff=held(f), glow_=1 + 0.4 * (i % 2)) for i, f in enumerate(idle)], 64)
    save_enemy('witch', 'movement', [witch_cell(f, feet, cx, phase=i, staff=held(f, 0.35), sway=-1, dy=(0, 1, 0, 0, 1, 0)[i])
                                     for i, f in enumerate(walk)], 64)
    # attack (curse): the staff is raised, the orb swells, a hex ring is thrown forward
    att, last = [], None
    plan = [(None, 1.2), (None, 1.6), (None, 2.0), ((3, 0, 2), 2.2), ((8, 0, 4), 1.6), ((14, 0, 5), 1.2), (None, 1.0), (None, 1.0)]
    for i, f in enumerate(pr):
        ax = tool_axis(f) or last
        last = ax
        if ax:
            st = (ax[0][0], ax[0][1], ax[1] if i >= 3 else -math.pi / 2 - 0.3 + i * 0.15, 'front')
        else:
            st = held(f)
        cu, gl = plan[min(i, len(plan) - 1)]
        att.append(witch_cell(f, feet, cx, phase=i * 0.9, staff=st, glow_=gl, curse=cu, dx=-3 if i >= 3 else 0))
    save_enemy('witch', 'attack', att, 64)
    save_enemy('witch', 'take_damage', [witch_cell(f, feet, cx, phase=i, staff=held(f, 0.5), dx=-1 - (i == 0),
                                                   fl=(255, 255, 255) if i == 0 else None) for i, f in enumerate(hit)], 64)
    dfr = []
    for i, f in enumerate(de):
        c = witch_cell(f, feet, cx, phase=i, robe=i < 3, hat=i < 3, glow_=0.5)
        p = Pic(64, 64); p.paste(c, 0, 0)
        if i >= 3:                                                           # the hat falls off and lies beside her
            hat = Pic(24, 24); witch_hat(hat, 12, 20, tilt=0.4, buckle=True)
            h_ = hat.im.rotate(-25 - i * 8, resample=Image.NEAREST, center=(12, 18))
            p.paste(h_, 34 + i, 38 + min(i, 6))
        if i >= 5:                                                           # green smoke curling up
            for k in range(3):
                p.p(24 + k * 5, 48 - i - k * 2, HEX1 if k % 2 else HEX0)
        dfr.append(outline_same(cut_below(p.im, 57)))
    save_enemy('witch', 'death', dfr, 64)


# ================================================================== SIREN (Gothicvania Dancing Girl upper body, fish tail, song)
DG = GVC + 'Dancing Girl Files/spritesheets/'
SIR_EYE = (20, 40, 60)
SIREN_MAP = {(206, 32, 56): (40, 150, 140), (138, 11, 65): (22, 90, 100), (215, 126, 75): (150, 200, 196),
             (255, 177, 100): (200, 236, 226), (121, 61, 78): (90, 140, 150), (69, 60, 60): SIR_EYE,
             (136, 140, 120): CO2, (192, 177, 10): CO3, (88, 86, 81): CO1, (91, 103, 49): CO1, (218, 223, 195): (240, 240, 230),
             (51, 26, 25): OUT, (121, 57, 10): OUT}
TAIL = ((20, 60, 72), (36, 116, 118), (76, 176, 158), (160, 232, 200))
TAIL_BELLY, FIN0, FIN1, FIN2 = (186, 226, 196), (120, 60, 140), (186, 110, 196), (236, 180, 236)


def dg(name):
    return [f.transpose(Image.FLIP_LEFT_RIGHT) for f in load_frames(DG + name + '.png', 39)]


def note(p, x, y, c=(255, 250, 220), double=False):
    """A sung note: oval head, stem, flag (or a beamed pair)."""
    p.e(x, y, x + 2, y + 1, c)
    p.l(x + 2, y, x + 2, y - 4, c)
    if double:
        p.e(x + 4, y - 1, x + 6, y, c); p.l(x + 6, y - 1, x + 6, y - 5, c); p.l(x + 2, y - 4, x + 6, y - 5, c)
    else:
        p.l(x + 3, y - 4, x + 4, y - 2, c)


def siren_tail(p, wx, wy, t=0.0, curl=1.0, flop=0.0):
    """Fish tail from the waist (wx, wy) down to the floor and back up into a fluke (to the left)."""
    sw = math.sin(t * math.tau) * 1.5
    a = (wx, wy)
    b = (wx + 6 + sw, wy + 14)
    c = (wx - 2 + sw, 55)
    pts = bez(a, b, c, 10)
    end = (wx - 12 - sw * 0.5, 54 - curl * 6 + flop * 3)
    pts += bez(c, ((c[0] + end[0]) / 2, 57), end, 6)[1:]
    radii = [4.5 - 3.0 * i / (len(pts) - 1) for i in range(len(pts))]
    ex, ey = end
    # fluke: two fins fanning back from the tail tip
    ang = math.atan2(ey - pts[-3][1], ex - pts[-3][0])
    for s_ in (-1, 1):
        a2 = ang + s_ * 0.7
        tip = (ex + math.cos(a2) * 8, ey + math.sin(a2) * 8)
        mid = (ex + math.cos(ang + s_ * 0.25) * 5, ey + math.sin(ang + s_ * 0.25) * 5)
        p.poly([(ex, ey), tip, mid], FIN0)
        p.poly([(ex, ey), (tip[0] * 0.7 + ex * 0.3, tip[1] * 0.7 + ey * 0.3), mid], FIN1)
        p.l(ex, ey, tip[0], tip[1], FIN2)
    tube(p, pts, radii, TAIL, belly=TAIL_BELLY, seed=4)
    for i, ((x, y), r) in enumerate(zip(pts, radii)):        # scale pattern
        if r > 2 and i % 2:
            p.p(x + 1, y - 1, TAIL[1]); p.p(x - 1, y + 1, TAIL[0])
    for s_ in (-1, 1):                                       # little hip fins
        p.poly([(wx + 2, wy + 4), (wx + 2 + s_ * 6, wy + 2), (wx + 3 + s_ * 4, wy + 6)], FIN1)


def siren_frame(src, t=0.0, bob=0, dx=0, sing=0, notes=0, waves=0, fl=None, hair=0, curl=1.0):
    a = np.array(recolor(src, SIREN_MAP))
    a[32:] = 0
    up = Image.fromarray(a)
    m = a[:, :, 3] > 0
    xs = np.nonzero(m[30])[0]
    wx = int((xs.min() + xs.max()) / 2) if len(xs) else 21
    em = (a[:, :, 0] == SIR_EYE[0]) & (a[:, :, 1] == SIR_EYE[1]) & (a[:, :, 2] == SIR_EYE[2]) & (a[:, :, 3] > 0)
    ys_, xs_ = np.nonzero(em)
    face = (int(xs_.max()), int(ys_.max())) if len(xs_) else (24, 16)
    p = Pic(64, 64)
    ox, oy = 26 - wx + dx, 18 + bob                           # waist at (26, 49)... body placed so the tail reaches the floor
    oy = 57 - 31 - 18 + bob
    siren_tail(p, wx + ox, 31 + oy, t, curl)
    p.paste(up, ox, oy)
    for k in range(3 + hair):                                 # long sea-green hair flowing down the back
        x0 = wx + ox - 3 - k
        for i in range(12 + k * 2):
            p.p(x0 - math.sin(t * math.tau + i * 0.5 + k) * 1.2 - i * 0.15, 11 + oy + i, (40, 150, 140) if (i + k) % 3 else (22, 90, 100))
    fx, fy = face[0] + ox, face[1] + oy
    if sing:
        p.r(fx - 1, fy + 2, fx, fy + 2 + min(2, sing), (60, 20, 40))
    for i in range(notes):
        k = (i + t * 3) % 4
        note(p, fx + 4 + i * 6, fy - 2 - (i % 2) * 5 + round(math.sin(t * math.tau + i) * 1.5),
             (255, 250, 220) if i % 2 == 0 else CY2, double=i == 1)
    for r_ in range(waves):
        rr = 4 + r_ * 4
        p.arc(fx + 1 - rr, fy + 1 - rr, fx + 1 + rr, fy + 1 + rr, -45, 45, CY2 if r_ == waves - 1 else (150, 220, 230))
    im = outline_same(cut_below(p.im, 57))
    if fl:
        im = flash(im, fl)
    return im


@builder('siren')
def make_siren():
    bal, hips = dg('balancing'), dg('hips')
    save_enemy('siren', 'idle', [siren_frame(bal[j], t=i / 6, bob=(0, 0, -1, -1, -1, 0)[i]) for i, j in enumerate((0, 1, 2, 3, 2, 1))], 64)
    save_enemy('siren', 'movement', [siren_frame(hips[i], t=i / 8, bob=-(i % 2), dx=(i % 4) // 2) for i in range(8)], 64)
    att = [siren_frame(bal[0], t=0.0, sing=1), siren_frame(bal[7], t=0.15, sing=2, notes=1, waves=1),
           siren_frame(bal[7], t=0.3, sing=2, notes=2, waves=2, bob=-1, hair=1),
           siren_frame(bal[6], t=0.45, sing=2, notes=3, waves=3, bob=-1, hair=1),
           siren_frame(bal[6], t=0.6, sing=2, notes=3, waves=2, bob=-1), siren_frame(bal[0], t=0.75, sing=1, notes=2, waves=1),
           siren_frame(bal[0], t=0.9)]
    save_enemy('siren', 'attack', att, 64)
    save_enemy('siren', 'take_damage', [siren_frame(bal[2], dx=-3, sing=1, fl=(255, 255, 255)), siren_frame(bal[2], dx=-2, t=0.3, sing=1),
                                        siren_frame(bal[2], dx=-1, t=0.6)], 64)
    # death: a last high note, she sinks down onto her tail and dissolves into sea foam
    d = [siren_frame(bal[0], sing=2, waves=1, bob=-2), siren_frame(bal[0], sing=1, bob=-1, t=0.5, curl=0.5)]
    base = siren_frame(bal[0], t=0.5, curl=0.2)
    for k, sy in enumerate((0.7, 0.45, 0.25)):
        sq = squash(base, sy, 57)
        sq = shift(sq, 0, 57 - (sq.getbbox()[3] - 1))
        a = np.array(sq)
        r2 = np.random.default_rng(k)
        inner = (a[:, :, 3] > 0) & ~((a[:, :, 0] == OUT[0]) & (a[:, :, 1] == OUT[1]) & (a[:, :, 2] == OUT[2]))
        a[(r2.random(a.shape[:2]) < 0.2 + 0.2 * k) & inner, :3] = WA5          # turning into foam
        q = Pic(64, 64); q.paste(Image.fromarray(a), 0, 0)
        for i in range(5 + k * 2):
            x = 30 + (i - (2 + k)) * 3
            q.e(x - 1, 55, x + 1, 57, WA5); q.p(x, 55, (255, 255, 255))
        d.append(outline_same(q.im))
    q = Pic(64, 64)                                           # foam and a few bubbles where she was
    q.e(16, 54, 46, 58, WA4); q.e(18, 54, 44, 57, WA5)
    for (x, y) in ((22, 52), (30, 50), (38, 53), (27, 47)):
        q.eo(x - 1, y - 1, x + 1, y + 1, WA5)
    d.append(outline_same(cut_below(q.im, 57)))
    save_enemy('siren', 'death', d, 64)


# ================================================================== STALKER (Gothicvania WereWolf as a shadow silhouette with glowing eyes)
WW = GVC + 'WereWolf/Spritesheets/'
SHD0, SHD1, SHD2, SHD3 = (10, 6, 18), (24, 16, 40), (44, 30, 70), (76, 56, 112)
STALK_EYE, STALK_EYE2 = (255, 230, 120), (255, 120, 60)
STALK_MAP = {(65, 54, 71): SHD1, (0, 0, 0): SHD0, (100, 88, 110): SHD2, (141, 128, 146): SHD3,
             (127, 6, 34): SHD1, (164, 25, 15): SHD2, (190, 196, 194): SHD3}


def ww(name):
    fr = load_frames(WW + f'werewolf-{name}.png', 96)
    return fr


def stalk_cell(f, sc=0.78, dx=0, dy=0, eyes=1, wisps=0, fl=None, feet_=57):
    g = recolor(f, STALK_MAP)
    a = np.array(g)
    a[a[:, :, 3] < 100] = 0
    g = Image.fromarray(a)
    b = g.getbbox()
    g = g.crop(b)
    g = g.resize((max(1, round(g.width * sc)), max(1, round(g.height * sc))), Image.NEAREST)
    p = Pic(64, 64)
    x0 = 32 - g.width // 2 + dx
    y0 = feet_ - g.height + 1 + dy
    p.paste(g, x0, y0)
    m = mask_of(p.im)
    if eyes:                                                     # glowing eyes near the front of the head
        cols = np.nonzero(m.any(0))[0]
        rows_top = [(x, np.nonzero(m[:, x])[0].min()) for x in cols]
        hx, hy = max(rows_top[-12:], key=lambda q: -q[1]) if len(rows_top) >= 12 else rows_top[-1]
        front = cols.max()
        ex, ey = front - 5, None
        for x in range(front - 9, front - 2):
            ys = np.nonzero(m[:, x])[0]
            if len(ys):
                ey = ys.min() + 3
                ex = x
                break
        if ey is not None:
            p.p(ex, ey, STALK_EYE if eyes == 1 else (255, 255, 255)); p.p(ex + 1, ey, STALK_EYE2)
            p.p(ex - 1, ey, (120, 60, 30))
    r2 = random.Random(wisps)
    if wisps:                                                    # shadow smoke curling off the back
        b2 = p.im.getbbox()
        for _ in range(6):
            x = r2.randint(b2[0], (b2[0] + b2[2]) // 2)
            ys = np.nonzero(m[:, min(63, max(0, x))])[0]
            if len(ys):
                y = ys.min() - r2.randint(1, 4)
                p.p(x, y, SHD2); p.p(x - 1, y - 1, SHD1)
    im = outline_same(p.im)
    if fl:
        im = flash(im, fl, 0.45)
    return im


@builder('stalker')
def make_stalker():
    idle, run, jump, fall = ww('idle'), ww('run'), ww('jump'), ww('fall')
    save_enemy('stalker', 'idle', [stalk_cell(f, wisps=i + 1) for i, f in enumerate(idle)], 64)
    save_enemy('stalker', 'movement', [stalk_cell(f, sc=0.7, wisps=i + 7) for i, f in enumerate(run)], 64)
    att = [stalk_cell(idle[0], eyes=2, dx=-2, wisps=20), stalk_cell(run[2], sc=0.7, eyes=2, dx=-3),
           stalk_cell(jump[0], sc=0.72, eyes=2, dy=-6, dx=2), stalk_cell(jump[1], sc=0.72, eyes=2, dy=-2, dx=6),
           stalk_cell(run[5], sc=0.7, eyes=2, dx=6), stalk_cell(idle[1], wisps=21)]
    p = Pic(64, 64); p.paste(att[3], 0, 0)                       # claw slash across the front
    for k in range(3):
        p.arc(34 + k * 2, 18 + k * 3, 62, 50 + k * 2, -70, 20, (220, 200, 255) if k == 1 else (150, 120, 220))
    att[3] = p.im
    save_enemy('stalker', 'attack', att, 64)
    save_enemy('stalker', 'take_damage', [stalk_cell(idle[2], dx=-3, eyes=2, fl=(200, 180, 255)), stalk_cell(idle[3], dx=-2),
                                          stalk_cell(idle[4], dx=-1)], 64)
    # death: it rears up, topples onto its side and melts into a shadow puddle with two dying sparks
    d = [stalk_cell(jump[0], sc=0.72, eyes=2), stalk_cell(fall[0], sc=0.72, eyes=2, dy=0)]
    down = stalk_cell(idle[0], eyes=0).transpose(Image.FLIP_TOP_BOTTOM)
    d.append(ground(stalk_cell(idle[0], eyes=1).rotate(-30, resample=Image.NEAREST, center=(32, 50)), 57))
    lying = ground(squash(down, 0.6, 57), 57)
    d.append(lying)
    for k, sy in enumerate((0.4, 0.22)):
        sq = ground(squash(down, sy, 57), 57)
        a = np.array(sq)
        r2 = np.random.default_rng(k)
        inner = a[:, :, 3] > 0
        a[(r2.random(a.shape[:2]) < 0.25 + k * 0.2) & inner, :3] = SHD2
        q = Pic(64, 64); q.paste(Image.fromarray(a), 0, 0)
        q.p(40 - k, 55, STALK_EYE2 if k == 0 else (120, 60, 30))
        for i in range(3):
            q.p(22 + i * 8, 50 - k * 4 - i, SHD3)
        d.append(outline_same(q.im))
    save_enemy('stalker', 'death', d, 64)


# ================================================================== BOSS: KRISTALLDROTTNINGEN (TinyRPG Monster Pack Witch, recoloured)
QW = TRPG + 'Sprites/Witch/'
QUEEN_MAP = {(219, 0, 0): (150, 112, 232), (151, 0, 0): (98, 66, 180), (73, 0, 0): (52, 30, 104), (214, 36, 17): (196, 160, 250),
             (73, 109, 146): (206, 214, 244), (36, 73, 109): (146, 154, 206), (0, 36, 36): (74, 72, 124),
             (255, 209, 0): CY2, (255, 132, 38): CY1, (0, 0, 0): OUT}
CQ = 116                     # square cell
CQ_FEET = 104                # her feet float above the floor; shards may fall to row 115


def queen_src():
    out = []
    for i in range(1, 6):
        im = Image.open(QW + f'witch{i}.png').convert('RGBA')
        a = np.array(im)
        a[82:] = 0                                                  # drop the ground shadow
        a[a[:, :, 3] < 100] = 0
        out.append(recolor(Image.fromarray(a), QUEEN_MAP))
    return out


def queen_wings(p, x, y, t=0.0, spread=1.0, k=1.0):
    """Fans of crystal shards behind her shoulders (back wing to the left, near wing to the right)."""
    for s_, base in ((-1, -2.5), (1, -0.65)):
        for i in range(4):
            a = base + s_ * (i - 1.5) * 0.28 * spread + math.sin(t * math.tau + i) * 0.04
            ln = (16 + (3 - abs(i - 1.5)) * 5) * k
            pal = (CR3, CR2, CR1, CR4) if s_ > 0 else (CR2, CR1, CR0, CR3)
            pcrystal(p, x + s_ * 3, y, a, ln, 2.6 * k, pal)


def queen_crown(p, x, y, glow_=1.0):
    for i, (dx, ln, a) in enumerate(((-6, 6, -2.2), (-3, 9, -1.9), (0, 12, -1.6), (3, 9, -1.3), (6, 6, -1.0))):
        pcrystal(p, x + dx, y, a, ln, 1.6, (CR4, CR3, CR2, (255, 255, 255)) if glow_ > 1 else (CR3, CR2, CR1, CR4))
    p.l(x - 7, y + 1, x + 7, y + 1, (200, 200, 230))
    p.p(x, y, PK2)


def queen_frame(src, t=0.0, bob=0, dx=0, wing=1.0, hand=0.0, orb=0, crown=1.0, shards=None, ring=0, fl=None, crack=0, eyes=1):
    p = Pic(CQ, CQ)
    b = src.getbbox()
    ox = CQ // 2 - (b[0] + b[2]) // 2 + dx
    oy = CQ_FEET - (b[3] - 1) + bob
    queen_wings(p, ox + 27, oy + 32, t, wing)
    if ring:                                                        # cast: a ring of crystals rising behind her
        for i in range(8):
            a = i / 8 * math.tau + t * 2
            r = 14 + ring * 6
            x, y = ox + 28 + math.cos(a) * r, oy + 20 + math.sin(a) * r * 0.45 - ring * 4
            pcrystal(p, x, y + 4, -math.pi / 2, 5 + ring, 1.6)
    p.paste(src, ox, oy)
    queen_crown(p, ox + 30, oy + 9, 1 + (crown > 1))
    if eyes:
        ec = (255, 255, 255) if eyes == 2 else CY3
        p.p(ox + 26, oy + 15, ec); p.p(ox + 29, oy + 15, ec)
    if orb:                                                          # crystal magic swelling in the front hand
        hx, hy = ox + 40 + hand * 6, oy + 26 - hand * 10
        r = orb
        p.e(hx - r - 1, hy - r - 1, hx + r + 1, hy + r + 1, CY0)
        p.e(hx - r, hy - r, hx + r, hy + r, CY1)
        p.e(hx - r + 1, hy - r + 1, hx + r - 2, hy + r - 2, CY2)
        p.p(hx - 1, hy - 1, CY3)
        for i in range(6):
            a = i / 6 * math.tau + t * 4
            p.p(hx + math.cos(a) * (r + 3), hy + math.sin(a) * (r + 3), CY3 if i % 2 else CR3)
    if shards:                                                       # shards flying forward
        for (x, y, ln) in shards:
            pcrystal(p, ox + x, oy + y, 0.0, ln, 2.0, (CR4, CR3, CR1, (255, 255, 255)))
            p.l(ox + x - 6, oy + y, ox + x - 1, oy + y, CY2)
    if crack:                                                        # white cracks spreading over the body
        r2 = random.Random(crack)
        for _ in range(crack * 3):
            x, y = ox + r2.randint(20, 38), oy + r2.randint(12, 70)
            for k in range(4):
                nx, ny = x + r2.randint(-2, 2), y + r2.randint(1, 3)
                p.l(x, y, nx, ny, (255, 255, 255)); x, y = nx, ny
    im = outline_same(p.im)
    if fl:
        im = flash(im, fl)
    return im


def shard_pile(k, n=14, seed=7):
    p = Pic(CQ, CQ)
    r2 = random.Random(seed)
    for i in range(n):
        x = CQ // 2 + r2.uniform(-24, 24) * (0.6 + 0.4 * k)
        pcrystal(p, x, 115, -math.pi / 2 + r2.uniform(-1.1, 1.1), r2.uniform(4, 9), 1.8)
    queen_crown(p, CQ // 2 + 6, 111, 1)
    return outline_same(cut_below(p.im, 115))


@builder('crystalqueen')
def make_crystalqueen():
    src = queen_src()
    Q = queen_frame
    save_enemy_sq = lambda st, fr: save(cells(fr, CQ, CQ), G_OUT + f'boss_crystalqueen_{st}.png', len(fr))
    save_enemy_sq('idle', [Q(src[i], t=i / 5, bob=(0, -1, -2, -1, 0)[i]) for i in range(5)])
    save_enemy_sq('attack', [Q(src[0], t=0.0, orb=2, hand=0.3), Q(src[1], t=0.15, orb=4, hand=0.7, eyes=2),
                             Q(src[2], t=0.3, orb=6, hand=1.0, eyes=2, crown=2),
                             Q(src[3], t=0.45, orb=3, hand=0.4, shards=[(52, 22, 10), (58, 32, 12), (50, 42, 9)], eyes=2),
                             Q(src[4], t=0.6, shards=[(66, 20, 12), (72, 32, 14), (64, 44, 10)]),
                             Q(src[0], t=0.75, shards=[(68, 22, 10), (70, 34, 11)]), Q(src[1], t=0.9)])
    save_enemy_sq('cast', [Q(src[i % 5], t=i / 6, ring=r, crown=2 if r > 1 else 1, wing=1 + r * 0.12, bob=-r, eyes=2 if r > 1 else 1)
                           for i, r in enumerate((1, 2, 3, 4, 4, 2))])
    save_enemy_sq('hurt', [Q(src[2], dx=-4, fl=(255, 255, 255), crack=1, eyes=2), Q(src[3], dx=-2, crack=1), Q(src[4], dx=-1)])
    d = [Q(src[0], crack=1, eyes=2, crown=2), Q(src[1], crack=2, eyes=2, wing=1.2, bob=-2), Q(src[2], crack=4, eyes=2, wing=1.3, bob=-3,
                                                                                               fl=(230, 240, 255))]
    p = Pic(CQ, CQ)                                                  # she bursts into light and shards
    p.paste(flash(Q(src[3], crack=5, eyes=2, wing=1.4, bob=-4), (240, 246, 255), 0.75), 0, 0)
    for i in range(12):
        a = i / 12 * math.tau
        pcrystal(p, 58 + math.cos(a) * 30, 56 + math.sin(a) * 34, a, 9, 2.0, (CR4, CR3, CR1, (255, 255, 255)))
    shard_burst(p, 58, 56, 44, 14, 2)
    d.append(outline_same(p.im))
    for k, fall in enumerate((0.5, 1.0)):
        p = Pic(CQ, CQ)
        r2 = random.Random(11)
        for i in range(14):
            a = r2.uniform(0, math.tau)
            dist = r2.uniform(14, 40)
            x, y = 58 + math.cos(a) * dist, min(113, 60 + math.sin(a) * dist * 0.8 + fall * fall * 40)
            pcrystal(p, x, y, a + k, r2.uniform(5, 9), 1.8)
        d.append(outline_same(p.im))
    d += [shard_pile(0.7), shard_pile(1.0)]
    save_enemy_sq('death', d)


# ================================================================== BOSS: LEVIATAN (drawn: a sea serpent rising out of deep water)
LV = 120
LV_WATER = 108
LVB = ((10, 30, 44), (22, 66, 84), (40, 112, 124), (110, 190, 176))
LV_BELLY = (196, 206, 150)
LVF0, LVF1, LVF2 = (110, 30, 52), (186, 64, 76), (240, 132, 116)


def lv_water(p, front=False, k=0, foam=None):
    if not front:
        p.e(4, LV_WATER - 6, LV - 4, LV_WATER + 10, WA1)
        p.e(10, LV_WATER - 4, LV - 10, LV_WATER + 8, WA2)
        for i in range(5):
            x = 14 + i * 22 + (k * 3) % 8
            p.l(x, LV_WATER - 2 + (i % 2) * 3, x + 8, LV_WATER - 2 + (i % 2) * 3, WA3)
    else:
        p.arc(4, LV_WATER - 6, LV - 4, LV_WATER + 10, 20, 160, WA4)
        p.arc(10, LV_WATER - 2, LV - 10, LV_WATER + 9, 30, 150, WA3)
        if foam:
            for (x, w) in foam:
                p.e(x - w, LV_WATER - 2, x + w, LV_WATER + 2, WA5)
                p.e(x - w + 2, LV_WATER - 1, x + w - 2, LV_WATER + 1, (255, 255, 255))


def lv_head(p, x, y, ang, jaw=0.0, eye=1, s=1.0):
    """Serpent head facing along ang (0 = right): long snout, lower jaw opens by jaw (0..1), frills and horns."""
    u = (math.cos(ang), math.sin(ang))
    v = (-u[1], u[0])
    P_ = lambda a_, b_: (x + (u[0] * a_ + v[0] * b_) * s, y + (u[1] * a_ + v[1] * b_) * s)
    o = jaw * 9
    # frill fins behind the head
    for k, (a_, b_, l_) in enumerate(((-4, -6, 12), (-6, -2, 10), (-6, 4, 9))):
        tip = P_(a_ - l_, b_ - 4)
        p.poly([P_(a_, b_), tip, P_(a_ - 3, b_ + 4)], LVF1)
        p.l(*P_(a_, b_), *tip, LVF2)
    # lower jaw
    p.poly([P_(-4, 2), P_(18, 4 + o), P_(20, 6 + o), P_(-2, 9)], LVB[0])
    p.poly([P_(-3, 3), P_(17, 4.5 + o), P_(17, 5.5 + o), P_(-2, 7)], LV_BELLY)
    if jaw > 0.15:
        p.poly([P_(-2, 2), P_(19, 1), P_(18, 4 + o)], (110, 24, 40))     # mouth inside
        p.poly([P_(0, 3), P_(14, 2.5), P_(12, 3 + o * 0.7)], (170, 50, 64))
        for kk in range(5):                                            # teeth
            tx = 3 + kk * 3.5
            p.l(*P_(tx, 1), *P_(tx + 0.5, 3), (240, 240, 224))
            p.l(*P_(tx, 4 + o * tx / 18), *P_(tx + 0.5, 2 + o * tx / 18), (240, 240, 224))
    # skull and snout
    p.poly([P_(-8, -7), P_(4, -9), P_(16, -4), P_(22, -1), P_(21, 2), P_(-6, 4)], LVB[0])
    p.poly([P_(-7, -6), P_(4, -8), P_(15, -3), P_(20, -0.5), P_(20, 1), P_(-6, 3)], LVB[1])
    p.poly([P_(-6, -6), P_(4, -8), P_(14, -3.5), P_(4, -4), P_(-5, -3)], LVB[2])
    p.l(*P_(5, -7), *P_(14, -3.5), LVB[3])
    p.p(*P_(20, -0.5), LVB[0]); p.p(*P_(19, -1), LVB[0])                 # nostril
    # horns
    p.poly([P_(-6, -6), P_(-16, -14), P_(-3, -8)], (200, 196, 170))
    p.l(*P_(-6, -6), *P_(-15, -13), (240, 236, 210))
    # eye with a heavy brow
    ex, ey = P_(4, -4)
    p.e(ex - 2, ey - 1.5, ex + 2, ey + 1.5, (20, 10, 10))
    p.e(ex - 1.5, ey - 1, ex + 1.5, ey + 1, (255, 220, 60) if eye == 1 else (255, 255, 255) if eye == 2 else (60, 50, 40))
    if eye:
        p.p(ex + 0.5, ey, (30, 10, 10) if eye == 1 else (255, 220, 60))
    p.l(*P_(0, -6.5), *P_(8, -5.5), LVB[0])


def lv_body(p, pts, r0=11, r1=7, fins=True):
    n = len(pts)
    radii = [r0 - (r0 - r1) * i / (n - 1) for i in range(n)]
    if fins:                                                          # dorsal fin spines along the back
        for i in range(2, n - 2, 2):
            (x0, y0), (x1, y1) = pts[i - 1], pts[i + 1]
            tx, ty = x1 - x0, y1 - y0
            ln = math.hypot(tx, ty) or 1
            nx, ny = ty / ln, -tx / ln
            if ny > 0 or (abs(ny) < 0.2 and nx > 0):
                nx, ny = -nx, -ny
            x, y = pts[i]
            r = radii[i]
            tip = (x + nx * (r + 7) - tx / ln * 4, y + ny * (r + 7) - ty / ln * 4)
            p.poly([(x + nx * r * 0.5 - tx / ln * 3, y + ny * r * 0.5 - ty / ln * 3), tip,
                    (x + nx * r * 0.5 + tx / ln * 3, y + ny * r * 0.5 + ty / ln * 3)], LVF1)
            p.l(x + nx * r * 0.5, y + ny * r * 0.5, *tip, LVF2)
    tube(p, pts, radii, LVB, belly=LV_BELLY, spots=LVB[0], seed=9)
    for i in range(1, n, 2):                                          # scale rows
        x, y = pts[i]
        r = radii[i]
        p.arc(x - r * 0.6, y - r * 0.6, x + r * 0.6, y + r * 0.4, 200, 340, LVB[1])


def lv_frame(head=(84, 34), ang=0.15, jaw=0.0, ctrl=(40, 30), base=(36, LV_WATER + 4), hump=True, eye=1, fl=None, k=0,
             sink=0, splash_=0, foam=True, spouts=0, roar_rings=0, s=1.3):
    p = Pic(LV, LV)
    lv_water(p, k=k)
    if hump:                                                          # coils behind, breaking the surface
        hx = 88 + (k % 3)
        pts = bez((hx - 16, LV_WATER + 6), (hx, LV_WATER - 22 + sink), (hx + 16, LV_WATER + 6), 9)
        lv_body(p, pts, 7, 7)
    hx, hy = head[0], head[1] + sink
    neck = (hx - math.cos(ang) * 12, hy - math.sin(ang) * 12 + 4)
    pts = bez(base, (ctrl[0], ctrl[1] + sink), neck, 16)
    lv_body(p, pts, 12, 8)
    lv_head(p, hx, hy, ang, jaw, eye, s)
    for i in range(spouts):                                           # water jets around her
        x = (18, 104, 60, 8, 112)[i]
        h = 18 + (i * 7 + k * 5) % 14
        p.r(x - 2, LV_WATER - h, x + 2, LV_WATER, WA3); p.r(x - 1, LV_WATER - h, x, LV_WATER, WA4)
        p.e(x - 4, LV_WATER - h - 4, x + 4, LV_WATER - h + 2, WA5)
    if roar_rings:
        mx, my = hx + math.cos(ang) * 28, hy + math.sin(ang) * 28
        for r_ in range(roar_rings):
            rr = 6 + r_ * 6
            p.arc(mx - rr, my - rr, mx + rr, my + rr, math.degrees(ang) - 40, math.degrees(ang) + 40, WA5 if r_ % 2 else WA4)
    a = np.array(p.im)
    a[LV_WATER + 3:] = 0                                              # everything below the surface line is hidden
    p.im = Image.fromarray(a); p.d = ImageDraw.Draw(p.im)
    lv_water(p, True, k, foam=[(base[0], 10), (76 if hump else -99, 6), (104 if hump else -99, 6)] if foam else None)
    if splash_:
        splash(p, hx + 10, LV_WATER, splash_, 9, 9)
        splash(p, base[0], LV_WATER, splash_ * 0.7, 3, 7)
    a = np.array(p.im)
    a[LV - 1:] = 0
    im = outline_same(Image.fromarray(a))
    if fl:
        im = flash(im, fl)
    return im


@builder('leviathan')
def make_leviathan():
    L = lv_frame
    sv = lambda st, fr: save(cells(fr, LV, LV), G_OUT + f'boss_leviathan_{st}.png', len(fr))
    sv('idle', [L(head=(84 + dx, 34 + dy), ang=0.15 + dx * 0.03, jaw=j, ctrl=(40 + dx, 30), k=i)
                for i, (dx, dy, j) in enumerate(((0, 0, 0), (1, -1, 0.1), (2, -2, 0.2), (2, -1, 0.1), (1, 0, 0), (0, 1, 0)))])
    sv('attack', [L(head=(72, 26), ang=-0.3, jaw=0.4, ctrl=(30, 24), eye=2),                 # rears back
                  L(head=(66, 25), ang=-0.5, jaw=0.9, ctrl=(26, 20), eye=2),
                  L(head=(94, 48), ang=0.5, jaw=1.0, ctrl=(50, 18), eye=2, splash_=10, k=1),    # strikes down
                  L(head=(98, 62), ang=0.7, jaw=0.2, ctrl=(56, 22), eye=2, splash_=14, k=2),
                  L(head=(90, 44), ang=0.35, jaw=0.1, ctrl=(46, 26), k=3),
                  L(head=(85, 35), ang=0.15, ctrl=(40, 30), k=4)])
    sv('cast', [L(head=(80, 26), ang=-0.4, jaw=0.5, ctrl=(38, 26), spouts=1, k=0),               # roars, the tide rises
                L(head=(76, 23), ang=-0.8, jaw=0.9, ctrl=(36, 22), spouts=2, roar_rings=1, eye=2, k=1),
                L(head=(76, 22), ang=-0.9, jaw=1.0, ctrl=(36, 20), spouts=3, roar_rings=2, eye=2, k=2),
                L(head=(76, 22), ang=-0.9, jaw=1.0, ctrl=(36, 20), spouts=5, roar_rings=3, eye=2, k=3),
                L(head=(78, 20), ang=-0.7, jaw=0.7, ctrl=(37, 22), spouts=4, roar_rings=2, k=4),
                L(head=(82, 30), ang=-0.1, jaw=0.2, ctrl=(40, 28), spouts=2, k=5)])
    sv('hurt', [L(head=(78, 30), ang=-0.2, jaw=0.7, ctrl=(36, 30), eye=2, fl=(255, 255, 255)),
                L(head=(80, 32), ang=-0.1, jaw=0.5, ctrl=(38, 30), eye=2), L(head=(83, 34), ang=0.1, jaw=0.2, ctrl=(40, 30))])
    sv('death', [L(head=(78, 24), ang=-0.9, jaw=1.0, ctrl=(38, 22), eye=2, roar_rings=2),
                 L(head=(86, 28), ang=0.6, jaw=0.8, ctrl=(46, 18), eye=2, k=1),
                 L(head=(96, 52), ang=1.0, jaw=0.6, ctrl=(56, 30), eye=0, k=2, splash_=8),
                 L(head=(98, 80), ang=1.2, jaw=0.5, ctrl=(60, 50), eye=0, k=3, splash_=16, sink=4),
                 L(head=(92, 98), ang=0.4, jaw=0.4, ctrl=(56, 80), eye=0, k=4, hump=False, splash_=10, sink=6),
                 lv_dead(0), lv_dead(1)])
    sv('submerge', [L(head=(84, 34), ctrl=(40, 30), sink=s_, k=i, splash_=6 if i in (2, 3) else 0, hump=i < 4)
                    for i, s_ in enumerate((0, 12, 26, 44, 62, 84))])


def lv_dead(k):
    """Floating dead on the surface: the long body arched along the water, head on its side, eye dark."""
    p = Pic(LV, LV)
    lv_water(p, k=k)
    pts = bez((10, LV_WATER + 2), (56, LV_WATER - 14 + k * 3), (92, LV_WATER - 2 + k), 14)
    lv_body(p, pts, 8, 7, fins=True)
    lv_head(p, 96, LV_WATER - 5 + k, 0.25, 0.3, 0, 1.3)
    a = np.array(p.im); a[LV_WATER + 3:] = 0; p.im = Image.fromarray(a); p.d = ImageDraw.Draw(p.im)
    lv_water(p, True, k, foam=[(14, 6), (90, 5)])
    return outline_same(p.im)


# ================================================================== PROPS
strip = P2.strip


def save_prop(name, frames, path=None):
    return save(strip(frames), path or G_OUT + f'prop_{name}.png', len(frames))


def rock_base_pic(p, x0, x1, y, h=5, pal=(RK1, RK2, RK3)):
    p.e(x0, y - h, x1, y + h, pal[0])
    p.e(x0 + 1, y - h, x1 - 2, y + h - 2, pal[1])
    p.l(x0 + 3, y - h + 1, (x0 + x1) // 2, y - h + 1, pal[2])


def prismcrystal(glint):
    p = Pic(30, 44)
    rock_base_pic(p, 3, 27, 41, 4)
    # one tall clear prism (pale, almost white) with two smaller ones
    pcrystal(p, 9, 40, -1.95, 14, 3.0, ((190, 210, 240), (150, 170, 220), (110, 120, 190), (255, 255, 255)))
    pcrystal(p, 22, 40, -1.2, 12, 2.6, ((190, 210, 240), (150, 170, 220), (110, 120, 190), (255, 255, 255)))
    pcrystal(p, 15, 41, -math.pi / 2, 36, 5.5, ((214, 230, 250), (170, 192, 236), (120, 134, 206), (255, 255, 255)))
    # inner refraction: a thin rainbow band through the big prism
    for k, c in enumerate(((255, 120, 120), (255, 220, 110), (120, 230, 140), (110, 170, 255), (190, 120, 255))):
        p.p(14 + (k % 2), 30 - k * 2, c)
    if glint:
        for (x, y, r) in ((13, 9, 3), (19, 24, 2), (8, 33, 2)):
            p.l(x - r, y, x + r, y, (255, 255, 255)); p.l(x, y - r, x, y + r, (255, 255, 255))
        for k, c in enumerate(((255, 120, 120), (255, 220, 110), (120, 230, 140), (110, 170, 255))):
            p.p(24 + k, 18 + k, c)                               # split light leaving the prism
    return outline(p.im)


def glowcrystal(k):
    p = Pic(34, 34)
    pulse = (0.0, 0.5, 1.0, 0.5)[k]
    halo = lerp(CY0, CY1, pulse)
    r2 = random.Random(k)
    for _ in range(3 + k % 2 * 2):                               # motes of light drifting around the cluster
        p.p(r2.randint(4, 30), r2.randint(4, 24), lerp(halo, CY3, 0.5))
    rock_base_pic(p, 5, 29, 30, 3)
    pal = (lerp(CY1, CY2, pulse), lerp(CY0, CY1, pulse), dark(CY0, 0.8), lerp(CY2, CY3, pulse))
    for (x, a, ln, w) in ((10, -2.1, 12, 2.4), (22, -1.0, 11, 2.2), (17, -1.65, 20, 3.4), (13, -1.4, 9, 2.0), (25, -0.6, 7, 1.8)):
        pcrystal(p, x, 30, a, ln + pulse * 1.5, w, pal)
    if pulse > 0.8:
        p.p(17, 10, (255, 255, 255)); p.p(16, 10, CY3); p.p(18, 10, CY3); p.p(17, 9, CY3); p.p(17, 11, CY3)
    return outline(p.im)


def wreckchest(open_):
    p = Pic(34, 30)
    bx0, bx1, top, base = 3, 30, 14, 28
    wood = ((48, 40, 34), (78, 64, 50), (104, 88, 66))       # sea-grey waterlogged wood
    p.r(bx0, top, bx1, base, wood[1])
    for y in range(top + 3, base, 4):
        p.l(bx0, y, bx1, y, wood[0])
    p.l(bx0, top, bx1, top, wood[2])
    for x in (bx0 + 3, bx1 - 3):                              # rusty bands
        p.r(x - 1, top, x + 1, base, R1); p.l(x, top, x, base, R2)
    if open_:
        p.poly([(bx0, top), (bx0 + 2, top - 3), (bx1 - 2, top - 3), (bx1, top)], (24, 20, 22))
        for i, (x, y, c) in enumerate(((8, 11, AU3), (13, 10, AU2), (18, 11, (240, 240, 250)), (23, 10, AU3), (11, 12, AU1), (20, 12, AU2))):
            p.e(x - 1, y - 1, x + 1, y + 1, c); p.p(x - 1, y - 1, AU4 if c != (240, 240, 250) else (255, 255, 255))
        lid = Pic(30, 10)
        lid.poly([(0, 9), (2, 2), (27, 2), (29, 9)], wood[1]); lid.l(2, 2, 27, 2, wood[2]); lid.l(0, 9, 29, 9, wood[0])
        lid.r(4, 2, 5, 9, R1); lid.r(24, 2, 25, 9, R1)
        lr = lid.im.rotate(-8, resample=Image.NEAREST, expand=True)
        p.paste(lr.transpose(Image.FLIP_TOP_BOTTOM), bx0 - 1, top - 13)
        p.ps([(24, 4), (26, 2), (9, 3)], AU4)
    else:
        p.poly([(bx0, top), (bx0 + 2, top - 6), (bx1 - 2, top - 6), (bx1, top)], wood[1])
        p.l(bx0 + 2, top - 6, bx1 - 2, top - 6, wood[2])
        p.l(bx0 + 1, top - 3, bx1 - 1, top - 3, wood[0])
        for x in (bx0 + 3, bx1 - 3):
            p.l(x, top - 6, x, top, R1)
        p.r(15, top - 2, 18, top + 3, AU1); p.r(16, top, 17, top + 1, (30, 20, 16))   # lock
    # barnacles, seaweed, an orange starfish
    for (x, y) in ((6, 25), (8, 26), (27, 20), (26, 24), (12, 17)):
        p.p(x, y, SH1); p.p(x + 1, y, SH0)
    for i in range(6):
        p.p(bx1 + 1 - (i % 2), base - i, AL1); p.p(bx0 - (i % 2), base - i * 0.8, AL2)
    p.ps([(22, 22), (21, 23), (23, 23), (22, 24), (21, 25), (23, 25)], OR1); p.p(22, 23, OR2)
    return outline(cut_below(p.im, 28))


def bubbles(k):
    p = Pic(18, 46)
    p.e(3, 41, 14, 45, RK1); p.e(5, 41, 12, 44, RK2); p.e(7, 42, 10, 43, WA0)   # vent
    r2 = random.Random(3)
    specs = [(r2.uniform(5, 12), r2.uniform(0, 40), r2.choice((1, 1, 2, 2, 3))) for _ in range(9)]
    for (x, y0, r) in specs:
        y = (y0 - k * 10) % 40 + 1
        x = x + math.sin((y + k) * 0.4) * 1.5
        p.eo(x - r, y - r, x + r, y + r, WA4)
        if r >= 2:
            p.p(x - r * 0.4, y - r * 0.4, (255, 255, 255))
        else:
            p.p(x, y, WA5)
    return p.im


def crystalspikes(broken):
    p = Pic(36, 24)
    rock_base_pic(p, 2, 33, 22, 2)
    pal = (CR3, CR2, CR1, CR4)
    specs = ((7, -2.0, 12), (12, -1.75, 18), (18, -1.55, 20), (24, -1.3, 16), (30, -1.05, 10), (15, -1.6, 9))
    for (x, a, ln) in specs:
        if broken:
            ln = max(3, ln * 0.3)
        pcrystal(p, x, 22, a, ln, 2.2, pal)
    if broken:
        for (x, y) in ((4, 21), (9, 20), (21, 21), (27, 20), (33, 21), (16, 19)):
            pcrystal(p, x, y, -0.3 + x * 0.2, 3, 1.0, pal)
    return outline(cut_below(p.im, 22))


def coral():
    p = Pic(40, 44)
    p.e(4, 39, 36, 43, SK1); p.e(6, 39, 34, 42, SK2)
    # sea fan (violet lattice) behind
    fan = Image.new('L', (40, 44)); d = ImageDraw.Draw(fan)
    d.pieslice((10, 10, 40, 72), 205, 335, fill=255)
    fm = np.array(fan) > 0
    yy, xx = np.mgrid[0:44, 0:40]
    lat = fm & (((xx + yy) % 4 == 0) | ((xx - yy) % 4 == 0))
    for y, x in zip(*np.nonzero(lat)):
        p.p(x, y, (150, 76, 184) if (x + y) % 8 else (196, 120, 226))
    for i in range(7):
        a_ = math.radians(210 + i * 20)
        p.l(25, 40, 25 + math.cos(a_) * 15, 41 + math.sin(a_) * 30, (110, 50, 140))
    # branching pink coral in front
    def br(x, y, a_, n, w):
        for _ in range(n):
            x1, y1 = x + math.cos(a_) * 2, y + math.sin(a_) * 2
            p.l(x, y, x1, y1, CO1, w); p.p(x1 - 0.5, y1, CO2)
            x, y = x1, y1
        p.e(x - 1, y - 1, x + 1, y + 1, CO3)
        return x, y
    r2 = random.Random(2)
    for a0, n in ((-2.4, 5), (-2.0, 7), (-1.6, 8), (-1.25, 6), (-0.9, 4)):
        x, y = br(13, 40, a0, n, 2)
        for s_ in (-0.55, 0.5):
            x2, y2 = br(x, y, a0 + s_ + r2.uniform(-0.2, 0.2), 3, 1)
            br(x2, y2, a0 + s_ * 0.3, 2, 1)
    # orange tube sponges and shells
    for (x, h) in ((29, 11), (32, 7), (26, 6)):
        p.r(x, 40 - h, x + 2, 40, OR1); p.l(x, 40 - h, x, 40, OR2); p.r(x, 40 - h, x + 2, 40 - h, OR0); p.p(x + 1, 40 - h, (60, 20, 10))
    for (x, y) in ((6, 38), (20, 39), (35, 38)):
        p.p(x, y, SH1); p.p(x + 1, y, SH0)
    return outline(cut_below(p.im, 41))


def sunkenpillar():
    p = Pic(26, 64)
    # base and shaft (fluted), broken off at the top with a jagged edge
    p.r(2, 56, 23, 63, SK1); p.r(3, 56, 22, 58, SK3); p.l(2, 63, 23, 63, SK0)
    p.r(5, 14, 20, 55, SK2)
    for x in (7, 11, 15, 19):
        p.l(x, 14, x, 55, SK1)
    p.l(6, 14, 6, 55, SK3); p.l(10, 14, 10, 55, SK3)
    top = [(5, 14), (7, 9), (9, 12), (12, 6), (15, 11), (17, 8), (20, 13)]
    p.poly(top + [(20, 16), (5, 16)], SK2)
    p.lines(top, SK4)
    p.l(12, 22, 9, 30, SK0); p.l(9, 30, 11, 34, SK0)             # crack
    # algae climbing from the bottom, barnacles, a hanging strand of kelp
    r2 = random.Random(4)
    for x in range(5, 21):
        h = r2.randint(4, 16)
        for y in range(55 - h, 56):
            if (x + y) % 3:
                p.p(x, y, AL1 if (x * y) % 5 else AL2)
    for _ in range(8):
        x, y = r2.randint(6, 19), r2.randint(18, 50)
        p.p(x, y, SH1); p.p(x + 1, y, SH0)
    for i in range(14):
        p.p(20 + math.sin(i * 0.6), 18 + i * 2, AL2); p.p(21 + math.sin(i * 0.6), 19 + i * 2, AL0)
    return outline(p.im)


def talentaltar(lit):
    p = Pic(36, 40)
    p.r(4, 30, 31, 38, S1); p.r(5, 30, 30, 31, S3); p.l(4, 38, 31, 38, S0)
    p.r(8, 16, 27, 30, S2); p.l(8, 16, 8, 30, S3); p.l(27, 16, 27, 30, S1)
    p.r(6, 13, 29, 16, S3); p.l(6, 13, 29, 13, S4)
    # three branch gems on the front and a rune star
    for (x, c, cl) in ((11, (110, 28, 30), (255, 110, 90)), (17, (70, 36, 104), (220, 150, 255)), (23, (28, 62, 130), (130, 200, 255))):
        p.e(x - 1, 22, x + 2, 25, cl if lit else c)
        if lit:
            p.p(x, 22, (255, 255, 255))
    p.l(12, 28, 23, 28, S1)
    if lit:                                                       # a floating glowing star over the altar
        for r_, c in ((6, (120, 100, 40)), (4, AU2), (2, AU4)):
            p.poly([(18, 3 - r_ + 6), (18 + r_ * 0.35, 9 - r_ * 0.35), (18 + r_, 9), (18 + r_ * 0.35, 9 + r_ * 0.35),
                    (18, 9 + r_), (18 - r_ * 0.35, 9 + r_ * 0.35), (18 - r_, 9), (18 - r_ * 0.35, 9 - r_ * 0.35)], c)
        for (x, y) in ((9, 8), (27, 6), (12, 2), (25, 12)):
            p.p(x, y, AU4)
    else:
        p.e(15, 10, 20, 12, S1)                                   # empty dish
    return outline(p.im)


@builder('props')
def make_props():
    save_prop('prismcrystal', [prismcrystal(False), prismcrystal(True)])
    save_prop('glowcrystal', [glowcrystal(k) for k in range(4)])
    save_prop('wreckchest', [wreckchest(False), wreckchest(True)])
    save_prop('bubbles', [bubbles(k) for k in range(4)])
    save_prop('crystalspikes', [crystalspikes(False), crystalspikes(True)])
    save_prop('coral', [coral()])
    save_prop('sunkenpillar', [sunkenpillar()])
    save_prop('talentaltar', [talentaltar(False), talentaltar(True)])


# ================================================================== NPC: the cartographer (Body_A, explorer coat, map, compass)
CART_PAL = {'head': ((217, 160, 102), (162, 101, 67), (118, 61, 43), (250, 200, 149)),
            'torso': ((120, 84, 52), (84, 58, 38), (56, 38, 26), (156, 112, 70)),
            'legs': ((176, 160, 120), (128, 114, 86), (84, 74, 58), (210, 196, 156))}


def npc_cartographer(k):
    f = body_src('Idle')[k]
    g, hc = dress(f, CART_PAL, eye=(40, 30, 24))
    hx, hy = hc
    p = Pic(64, 64)
    p.paste(g, 0, 0)
    # wide-brimmed explorer hat with a feather, grey beard
    p.e(hx - 8, hy - 5, hx + 7, hy - 2, (70, 50, 34)); p.e(hx - 7, hy - 5, hx + 6, hy - 3, (96, 70, 46))
    p.r(hx - 5, hy - 9, hx + 3, hy - 4, (96, 70, 46)); p.l(hx - 5, hy - 9, hx + 3, hy - 9, (124, 92, 60))
    p.l(hx - 5, hy - 5, hx + 3, hy - 5, (150, 40, 34))
    p.l(hx - 6, hy - 8, hx - 9, hy - 13, (230, 230, 220)); p.p(hx - 8, hy - 11, (200, 60, 50))
    p.r(hx + 1, hy + 3, hx + 5, hy + 5, (200, 200, 196)); p.p(hx + 3, hy + 6, (200, 200, 196))
    # an open map held in front (flutters), a brass compass on the belt
    fl = (0, 1, 0, -1)[k]
    mx, my = hx + 4, hy + 9
    p.poly([(mx, my + fl), (mx + 12, my - 1), (mx + 13, my + 9), (mx + 1, my + 10 + fl)], PAPER1)
    p.l(mx, my + fl, mx + 12, my - 1, PAPER2)
    p.l(mx + 6, my, mx + 7, my + 9, PAPER0)                     # fold
    p.l(mx + 2, my + 3, mx + 5, my + 6, (150, 40, 30)); p.l(mx + 5, my + 6, mx + 10, my + 4, (150, 40, 30))
    p.p(mx + 10, my + 4, (150, 40, 30)); p.p(mx + 9, my + 3, (150, 40, 30)); p.p(mx + 11, my + 5, (150, 40, 30))   # X marks the spot
    p.l(mx + 2, my + 7, mx + 4, my + 8, (70, 110, 150))
    p.e(hx - 4, hy + 16, hx, hy + 19, AU1); p.e(hx - 3, hy + 17, hx - 1, hy + 18, (230, 230, 210)); p.p(hx - 2, hy + 17, (200, 40, 40))
    im = outline_same(p.im)
    return im


@builder('npcs')
def make_npcs():
    save_prop('', [npc_cartographer(k) for k in range(4)], G_OUT + 'npc_cartographer.png')


# ================================================================== ITEMS, PARTICLES, HUD ICONS
@builder('items')
def make_items():
    # tome of knowledge (14x15): thick blue-leather book, gold corners and a glowing rune on the cover
    p = Pic(14, 15)
    p.r(2, 1, 13, 14, (32, 46, 110)); p.r(3, 1, 13, 12, (50, 72, 156)); p.l(3, 1, 13, 1, (90, 120, 200))
    p.r(0, 2, 2, 14, PAPER1); p.l(0, 4, 2, 4, PAPER0); p.l(0, 8, 2, 8, PAPER0); p.l(0, 12, 2, 12, PAPER0)   # page block
    p.r(1, 13, 13, 14, (24, 32, 80))
    for (x, y) in ((3, 1), (12, 1), (12, 11), (3, 11)):
        p.p(x, y, AU3)
    p.ps([(8, 3), (7, 4), (9, 4), (6, 6), (10, 6), (8, 5), (8, 7), (7, 8), (9, 8), (8, 9)], CY2)
    p.p(8, 6, (255, 255, 255))
    p.l(11, 3, 11, 10, AU2)                                     # ribbon
    p.p(11, 15 - 1, (200, 40, 50))
    save(hard(outline_same(p.im)), G_OUT + 'item_tome.png')


@builder('particles')
def make_particles():
    # air bubble (2 frames 7x7): a ring with a glint, wobbling
    fr = []
    for k in range(2):
        p = Pic(7, 7)
        if k == 0:
            p.eo(0, 0, 6, 6, WA4)
        else:
            p.eo(0, 1, 6, 5, WA4)
        p.p(2, 2, (255, 255, 255)); p.p(4, 5 - k, WA3)
        fr.append(p.im)
    save(cells(fr, 7, 7), G_OUT + 'part_bubble.png', 2)
    # crystal shard (2 frames 6x6): tumbling violet splinter
    fr = []
    for k in range(2):
        p = Pic(6, 6)
        if k == 0:
            p.l(0, 5, 5, 0, CR2); p.l(1, 5, 5, 1, CR1); p.p(4, 1, CR4); p.p(3, 2, CR3)
        else:
            p.r(2, 0, 3, 5, CR2); p.l(2, 0, 2, 5, CR3); p.p(2, 0, CR4); p.p(3, 5, CR1)
        fr.append(outline_same(p.im))
    save(cells(fr, 6, 6), G_OUT + 'part_shard.png', 2)
    # big splash (4 frames 28x24): a column and droplets thrown up in an arc, then falling back into a ring
    fr = []
    for k in range(4):
        p = Pic(28, 24)
        t = (k + 1) / 4
        w = 5 + k * 3
        p.e(14 - w, 19, 14 + w, 23, WA3); p.e(14 - w + 2, 20, 14 + w - 2, 22, WA4)
        if k < 2:                                                  # central column
            h = (8, 12)[k]
            p.e(11, 21 - h, 17, 21, WA4); p.e(12, 21 - h, 16, 19, WA5); p.e(12, 19 - h, 16, 23 - h, WA5)
        for i in range(8):
            vx = (i - 3.5) * 1.7
            vy = 15 - abs(i - 3.5) * 1.6
            x = 14 + vx * t * 1.9
            y = 21 - (vy * t * 2.2 - 14 * t * t * 1.9)
            if y < 22:
                r = 1.4 if i % 3 else 1.0
                p.e(x - r, y - r, x + r, y + r, WA5 if i % 2 else WA4)
        fr.append(outline_same(p.im))
    save(cells(fr, 28, 24), G_OUT + 'part_splash_big.png', 4)
    # prism beam (additive on black, 32x9): white core with a split rainbow fringe, flat steps
    yy, xx = np.mgrid[0:9, 0:32].astype(float)
    core = np.clip(1 - np.abs(yy - 4) / 2.2, 0, 1)
    rgb = np.zeros((9, 32, 3))
    rainbow = {0: (120, 40, 200), 1: (60, 90, 255), 2: (60, 200, 255), 3: (220, 250, 255), 4: (255, 255, 255),
               5: (220, 250, 255), 6: (255, 230, 120), 7: (255, 120, 90), 8: (160, 30, 60)}
    for y, c in rainbow.items():
        rgb[y] = np.array(c) * (0.55 + 0.45 * (0.5 + 0.5 * np.cos(xx[y] / 32 * math.tau * 2)))[:, None]
    rgb = np.round(rgb / 32) * 32
    save(from_arr(np.clip(rgb, 0, 255)), G_OUT + 'part_prismbeam.png', additive=True)
    # sung note (2 frames 8x9)
    fr = []
    for k in range(2):
        p = Pic(8, 9)
        note(p, 1, 6, (214, 248, 255), double=k == 1) if k == 1 else note(p, 2, 6, (214, 248, 255))
        fr.append(outline_same(p.im))
    save(cells(fr, 8, 9), G_OUT + 'part_note.png', 2)
    # ink blot (2 frames 9x9): the eel / leviathan squirt
    fr = []
    for k in range(2):
        p = Pic(9, 9)
        r2 = random.Random(k + 5)
        for _ in range(5):
            x, y, r = r2.uniform(2, 6), r2.uniform(2, 6), r2.uniform(1.5, 2.8)
            p.e(x - r, y - r, x + r, y + r, (30, 16, 44))
        p.e(3, 3, 5, 4, (66, 40, 90)); p.p(3, 3, (110, 80, 140))
        fr.append(outline_same(p.im))
    save(cells(fr, 9, 9), G_OUT + 'part_ink.png', 2)
    # harpoon rope (12x3, tiles horizontally): twisted hemp
    p = Pic(12, 3)
    for x in range(12):
        p.p(x, 1, (150, 120, 80))
        p.p(x, 0 if (x % 4) < 2 else 2, (196, 166, 110) if (x % 4) < 2 else (100, 76, 50))
    save(hard(p.im), G_OUT + 'part_harpoonrope.png')
    # HUD icons (8x8 white): air bubble, experience star
    W_ = (255, 255, 255)
    air = ["..####..", ".#....#.", "#..#...#", "#.#....#", "#......#", "#......#", ".#....#.", "..####.."]
    xp = ["...#....", "...#....", "..###...", "#######.", ".#####..", "..###...", ".##.##..", ".#...#.."]
    for name, rows in (('icon_air', air), ('icon_xp', xp)):
        p = Pic(8, 8)
        p.bitmap(0, 0, rows, {'#': W_})
        save(p.im, G_OUT + name + '.png')


# ================================================================== TOUCH ICONS (96x96 white on transparent)
@builder('icons')
def make_icons():
    icon = P3.icon

    def talent(d, k):     # an eight-pointed star rising out of a book-like base with an up arrow
        S = lambda *v: [x * k for x in v]
        d.polygon(S(48, 4, 56, 30, 82, 24, 64, 44, 82, 64, 56, 58, 48, 84, 40, 58, 14, 64, 32, 44, 14, 24, 40, 30), fill=255)
        d.ellipse(S(38, 34, 58, 54), fill=0)
        d.polygon(S(48, 36, 56, 46, 51, 46, 51, 52, 45, 52, 45, 46, 40, 46), fill=255)
        d.rectangle(S(20, 86, 76, 92), fill=255)
    save(icon(talent), T_OUT + 'icon_talent.png')

    def swim(d, k):       # a swimmer doing the crawl above two waves
        S = lambda *v: [x * k for x in v]
        d.ellipse(S(62, 26, 78, 42), fill=255)                        # head
        d.line(S(58, 44, 22, 52), fill=255, width=12 * k)             # body, horizontal
        d.line(S(56, 42, 64, 20, 80, 12), fill=255, width=8 * k)       # stroking arm overhead
        d.line(S(24, 52, 8, 46), fill=255, width=8 * k)                # legs
        for y0 in (64, 80):                                            # waves
            pts = []
            for i in range(25):
                x = 4 + i * 3.7
                pts += [x, y0 + 5 * math.sin(i / 24 * math.tau * 2)]
            d.line(S(*pts), fill=255, width=6 * k)
    save(icon(swim), T_OUT + 'icon_swim.png')


# ================================================================== TALENT ICONS (24x24: a glyph on a dark rounded plate in the branch colour)
BRANCH = {'warrior': ((52, 12, 16), (104, 26, 28), (214, 76, 64), (255, 170, 120)),
          'shadow': ((30, 14, 46), (66, 34, 100), (164, 96, 226), (222, 176, 255)),
          'mystic': ((10, 24, 58), (26, 58, 124), (86, 156, 236), (170, 222, 255))}
TALENTS = {'warrior': 'brawler ironskin berserk cleave secondwind juggernaut warcry executioner bulwark titan'.split(),
           'shadow': 'quickstep doubletap backstab vanish evasion poisonedge shadowstep assassin nimble phantom'.split(),
           'mystic': 'arcana manaflow leech hex frostnova chainmind soulfire prophet timewarp ascendant'.split()}
TL, TM, TD = (240, 236, 224), (178, 186, 202), (96, 98, 118)       # glyph light / metal / dark
TWOOD = ((110, 70, 40), (156, 104, 60))
TRED, TGRN, TGOLD = (220, 40, 50), (110, 220, 80), (250, 200, 80)


def plate(branch):
    c0, c1, c2, c3 = BRANCH[branch]
    p = Pic(24, 24)
    m = Image.new('L', (24, 24)); ImageDraw.Draw(m).rounded_rectangle((0, 0, 23, 23), 5, fill=255)
    a = np.array(m) > 0
    yy, _ = np.mgrid[0:24, 0:24]
    for y, x in zip(*np.nonzero(a)):
        p.p(x, y, lerp(c1, c0, y / 23))
    inner = a & np.roll(a, 1, 0) & np.roll(a, -1, 0) & np.roll(a, 1, 1) & np.roll(a, -1, 1)
    ring = a & ~inner
    for y, x in zip(*np.nonzero(ring)):
        p.p(x, y, OUT)
    ring2 = inner & ~(np.roll(inner, 1, 0) & np.roll(inner, -1, 0) & np.roll(inner, 1, 1) & np.roll(inner, -1, 1))
    for y, x in zip(*np.nonzero(ring2)):
        p.p(x, y, c2 if y < 12 or x < 3 else dark(c2, 0.7))
    return p


def blade(p, x0, y0, x1, y1, c=TM, hi=TL):
    p.l(x0, y0, x1, y1, c, 2)
    p.l(x0, y0, x1, y1, hi)


# glyphs: each draws into a 24x24 Pic (use the middle ~16x16); acc = the branch's light accent
def g_brawler(p, acc):        # clenched fist
    p.r(6, 8, 16, 16, (230, 180, 130)); p.r(7, 9, 15, 15, (246, 206, 160))
    for x in (7, 10, 13):
        p.l(x, 8, x, 11, (190, 130, 90))
    p.r(4, 11, 7, 15, (230, 180, 130)); p.l(5, 12, 7, 12, (190, 130, 90))
    p.r(8, 16, 15, 19, (110, 60, 40)); p.l(8, 17, 15, 17, acc)
    for (x, y) in ((18, 7), (19, 10), (18, 13)):
        p.l(x, y, x + 2, y, acc)


def g_ironskin(p, acc):       # riveted breastplate
    p.poly([(6, 5), (17, 5), (18, 12), (12, 19), (5, 12)], TM)
    p.poly([(7, 6), (11, 6), (11, 17), (6, 12)], TL)
    p.l(12, 6, 12, 18, TD)
    for (x, y) in ((8, 8), (15, 8), (8, 12), (15, 12)):
        p.p(x, y, TD)
    p.l(6, 5, 17, 5, acc)


def g_berserk(p, acc):        # furious eyes with blood-red veins and a jagged rage mark
    p.poly([(4, 9), (10, 11), (4, 13)], TL); p.poly([(19, 9), (13, 11), (19, 13)], TL)
    p.p(7, 11, TRED); p.p(16, 11, TRED)
    p.l(4, 7, 10, 9, TRED, 2); p.l(19, 7, 13, 9, TRED, 2)
    p.lines([(8, 16), (10, 18), (12, 15), (14, 18), (16, 16)], acc, 2)
    p.ps([(11, 4), (12, 5), (12, 3)], TRED)


def g_cleave(p, acc):         # axe with a wide arc
    p.arc(3, 3, 21, 21, 200, 330, acc, 2)
    p.l(8, 19, 15, 8, TWOOD[1], 2)
    p.poly([(13, 6), (19, 4), (20, 11), (16, 11)], TM); p.l(19, 4, 20, 11, TL)


def g_secondwind(p, acc):     # heart with a circling arrow
    p.e(5, 7, 12, 14, TRED); p.e(11, 7, 18, 14, TRED); p.poly([(5, 12), (18, 12), (12, 19)], TRED)
    p.p(8, 9, (255, 180, 180))
    p.arc(2, 3, 21, 22, 280, 160, acc)
    p.poly([(4, 15), (2, 18), (7, 18)], acc)


def g_juggernaut(p, acc):     # horned helmet charging
    p.e(6, 6, 17, 17, TM); p.r(6, 12, 17, 17, TM)
    p.r(8, 12, 15, 13, TD); p.l(11, 13, 11, 17, TD)
    p.poly([(6, 9), (2, 4), (4, 10)], TL); p.poly([(17, 9), (21, 4), (19, 10)], TL)
    p.l(8, 7, 11, 6, TL)
    for y in (18, 20):
        p.l(4, y, 9, y, acc)


def g_warcry(p, acc):         # war horn with sound waves
    p.poly([(4, 14), (13, 9), (14, 13), (5, 17)], (226, 206, 160))
    p.poly([(13, 7), (17, 6), (17, 16), (13, 14)], (190, 160, 110)); p.l(17, 6, 17, 16, TL)
    p.r(8, 11, 9, 15, TWOOD[0])
    for r_ in (3, 5):
        p.arc(18 - r_, 11 - r_, 18 + r_, 11 + r_, -60, 60, acc)


def g_executioner(p, acc):    # skull under a heavy blade
    p.e(7, 9, 16, 17, TL); p.r(9, 15, 14, 19, TL)
    p.r(9, 12, 10, 13, OUT); p.r(13, 12, 14, 13, OUT); p.p(11, 15, OUT); p.l(10, 18, 13, 18, TD)
    p.poly([(4, 3), (19, 3), (17, 7), (6, 7)], TM); p.l(6, 7, 17, 7, TL)
    p.p(12, 2, acc); p.l(11, 1, 13, 1, TRED)


def g_bulwark(p, acc):        # tower shield with a cross
    p.poly([(6, 4), (17, 4), (17, 14), (11, 20), (6, 14)], TM)
    p.poly([(7, 5), (11, 5), (11, 18), (7, 14)], TL)
    p.r(10, 6, 12, 16, acc); p.r(7, 9, 16, 10, acc)


def g_titan(p, acc):          # giant's war hammer with a crown
    p.l(12, 9, 12, 20, TWOOD[1], 2)
    p.r(5, 6, 19, 11, TM); p.r(5, 6, 19, 7, TL); p.l(5, 11, 19, 11, TD)
    p.ps([(8, 2), (12, 1), (16, 2)], TGOLD); p.r(8, 3, 16, 4, TGOLD); p.p(12, 3, TRED)


def g_quickstep(p, acc):      # winged boot with speed lines
    p.poly([(9, 5), (14, 5), (14, 14), (19, 15), (19, 18), (9, 18)], (150, 100, 70))
    p.l(9, 5, 14, 5, (190, 140, 100)); p.l(9, 18, 19, 18, TD)
    p.poly([(14, 7), (20, 4), (19, 8), (14, 10)], TL)
    for y in (8, 12, 16):
        p.l(2, y, 6, y, acc)


def g_doubletap(p, acc):      # two daggers side by side
    for x in (8, 15):
        blade(p, x, 4, x, 14)
        p.l(x - 2, 15, x + 2, 15, TGOLD); p.l(x, 16, x, 19, TWOOD[1])
    p.ps([(11, 4), (12, 5), (11, 6)], acc)


def g_backstab(p, acc):       # a dagger plunging down, a drop of blood
    blade(p, 12, 6, 12, 19)
    p.p(12, 20, TL)
    p.l(8, 6, 16, 6, TGOLD); p.r(11, 2, 13, 5, TWOOD[1])
    p.e(16, 15, 18, 18, TRED); p.p(17, 14, TRED)
    p.arc(4, 9, 20, 25, 200, 340, acc)


def g_vanish(p, acc):         # a figure dissolving into smoke
    for i, (x, y) in enumerate(((8, 6), (14, 6), (6, 11), (16, 11), (9, 16), (15, 16), (12, 12))):
        p.e(x - 2, y - 2, x + 2, y + 2, acc if i % 2 else dark(acc, 0.7))
    p.e(10, 4, 14, 8, TL)
    for (x, y) in ((4, 4), (19, 6), (5, 19), (19, 19)):
        p.p(x, y, TL)


def g_evasion(p, acc):        # an arrow curving past a ducking silhouette
    p.e(5, 9, 9, 13, TL); p.l(7, 13, 9, 19, TL, 2); p.l(8, 15, 12, 13, TL)
    p.arc(6, 2, 24, 20, 190, 300, acc, 1)
    p.poly([(18, 3), (21, 4), (18, 6)], TM); p.l(9, 7, 11, 5, TD)


def g_poisonedge(p, acc):     # a dagger dripping green poison
    blade(p, 6, 18, 16, 6, (150, 220, 120), TL)
    p.l(4, 15, 9, 20, TGOLD); p.l(3, 21, 6, 18, TWOOD[1], 2)
    p.e(16, 12, 18, 14, TGRN); p.p(17, 15, TGRN); p.e(16, 17, 18, 19, TGRN)


def g_shadowstep(p, acc):     # footprints stepping out of a portal
    p.e(3, 13, 13, 21, OUT); p.eo(3, 13, 13, 21, acc)
    for (x, y) in ((11, 11), (16, 6)):
        p.e(x, y, x + 3, y + 4, TL); p.e(x + 1, y - 2, x + 2, y - 1, TL)
    p.ps([(18, 14), (19, 16), (20, 13)], acc)


def g_assassin(p, acc):       # hooded head with glowing eyes
    p.poly([(12, 3), (19, 9), (19, 19), (5, 19), (5, 9)], (60, 50, 76))
    p.poly([(12, 4), (17, 9), (12, 8), (7, 9)], (90, 80, 110))
    p.e(8, 9, 16, 17, OUT)
    p.r(9, 12, 10, 12, acc); p.r(13, 12, 14, 12, acc)
    p.l(9, 15, 15, 15, (60, 50, 76))


def g_nimble(p, acc):         # cat's paw print
    p.e(8, 12, 16, 19, TL)
    for (x, y) in ((4, 10), (9, 5), (15, 5), (20, 10)):
        p.e(x - 1.5, y - 2, x + 1.5, y + 1.5, TL)
    p.l(4, 20, 20, 20, acc)


def g_phantom(p, acc):        # ghost
    p.e(6, 4, 18, 14, TL); p.r(6, 9, 18, 17, TL)
    for x in (6, 10, 14):
        p.poly([(x, 17), (x + 4, 17), (x + 2, 20)], TL)
    p.e(8, 8, 10, 11, OUT); p.e(13, 8, 15, 11, OUT); p.e(10, 12, 13, 15, dark(acc, 0.6))


def g_arcana(p, acc):         # open spell book with a rune above
    p.poly([(3, 12), (11, 14), (11, 20), (3, 18)], TL); p.poly([(20, 12), (12, 14), (12, 20), (20, 18)], TL)
    p.l(11, 14, 11, 20, TD); p.l(5, 15, 9, 16, TD); p.l(14, 16, 18, 15, TD)
    p.poly([(12, 2), (15, 7), (12, 11), (9, 7)], acc); p.p(12, 6, TL)


def g_manaflow(p, acc):       # mana drop with flowing streams
    p.poly([(12, 3), (17, 12), (12, 19), (7, 12)], acc); p.e(7, 9, 17, 19, acc)
    p.e(9, 11, 12, 14, TL)
    p.arc(1, 6, 9, 20, 90, 270, TL); p.arc(15, 6, 23, 20, 270, 90, TL)


def g_leech(p, acc):          # blood drop with fangs
    p.poly([(12, 2), (17, 11), (12, 18), (7, 11)], TRED); p.e(7, 9, 17, 19, TRED)
    p.e(9, 10, 11, 13, (255, 150, 150))
    p.poly([(8, 18), (10, 18), (9, 22)], TL); p.poly([(14, 18), (16, 18), (15, 22)], TL)


def g_hex(p, acc):            # a cursed eye inside a hexagram
    pts1 = [(12 + 9 * math.cos(a), 12 + 9 * math.sin(a)) for a in np.linspace(-math.pi / 2, 1.5 * math.pi, 4)[:-1]]
    pts2 = [(12 + 9 * math.cos(a), 12 + 9 * math.sin(a)) for a in np.linspace(math.pi / 2, 2.5 * math.pi, 4)[:-1]]
    p.lines(pts1 + pts1[:1], (170, 100, 220)); p.lines(pts2 + pts2[:1], (170, 100, 220))
    p.e(7, 9, 17, 15, TL); p.e(10, 10, 14, 14, TGRN); p.p(12, 12, OUT)


def g_frostnova(p, acc):      # snowflake burst
    for a in range(6):
        ang = a * math.pi / 3
        x1, y1 = 12 + math.cos(ang) * 9, 12 + math.sin(ang) * 9
        p.l(12, 12, x1, y1, TL)
        mx, my = 12 + math.cos(ang) * 6, 12 + math.sin(ang) * 6
        for s_ in (-1, 1):
            p.l(mx, my, mx + math.cos(ang + s_ * 0.9) * 2.5, my + math.sin(ang + s_ * 0.9) * 2.5, acc)
    p.e(10, 10, 14, 14, acc); p.p(12, 12, TL)


def g_chainmind(p, acc):      # chain lightning between three nodes
    nodes = [(5, 6), (18, 9), (8, 18)]
    p.lines([nodes[0], (10, 9), (9, 6), nodes[1]], acc); p.lines([nodes[1], (13, 13), (14, 16), nodes[2]], acc)
    for (x, y) in nodes:
        p.e(x - 2, y - 2, x + 2, y + 2, TL); p.p(x, y, acc)


def g_soulfire(p, acc):       # blue flame around a skull
    p.poly([(12, 2), (17, 9), (18, 15), (12, 20), (6, 15), (7, 9), (9, 11)], acc)
    p.poly([(12, 6), (15, 11), (15, 16), (12, 18), (9, 16), (9, 11)], (200, 240, 255))
    p.e(9, 11, 15, 16, TL); p.p(10, 13, OUT); p.p(14, 13, OUT); p.l(11, 16, 13, 16, TD)


def g_prophet(p, acc):        # all-seeing eye with rays
    p.poly([(3, 12), (12, 6), (21, 12), (12, 18)], TL)
    p.e(8, 8, 16, 16, acc); p.e(10, 10, 14, 14, OUT); p.p(11, 11, TL)
    for x in (6, 12, 18):
        p.l(x, 2, x + (x - 12) * 0.2, 4, TGOLD)


def g_timewarp(p, acc):       # hourglass
    p.r(6, 3, 18, 4, TWOOD[1]); p.r(6, 19, 18, 20, TWOOD[1])
    p.poly([(7, 5), (17, 5), (12, 12)], TL); p.poly([(12, 12), (17, 18), (7, 18)], TL)
    p.poly([(9, 7), (15, 7), (12, 11)], TGOLD); p.poly([(12, 14), (16, 18), (8, 18)], TGOLD)
    p.l(12, 11, 12, 15, TGOLD)
    p.arc(2, 2, 22, 22, 300, 40, acc)


def g_ascendant(p, acc):      # winged star rising
    p.poly([(12, 2), (14, 8), (20, 8), (15, 12), (17, 18), (12, 14), (7, 18), (9, 12), (4, 8), (10, 8)], TGOLD)
    p.p(12, 9, (255, 250, 220))
    for s_ in (-1, 1):
        for k in range(3):
            p.l(12 + s_ * 6, 15 + k, 12 + s_ * (10 - k), 12 + k * 2, TL)
    p.l(12, 18, 12, 22, acc)


@builder('talents')
def make_talents():
    os.makedirs(G_OUT + 'talents', exist_ok=True)
    for branch, ids in TALENTS.items():
        acc = BRANCH[branch][3]
        for tid in ids:
            p = plate(branch)
            g = Pic(24, 24)
            globals()['g_' + tid](g, acc)
            p.paste(outline_same(g.im), 0, 0)
            save(hard(p.im), G_OUT + f'talents/{tid}.png')


# @@SECTIONS@@


# ================================================================== CONTACT SHEET
NEW_WEAPONS = ('harpoon', 'boomerang', 'prism')


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
        g = 0 if '/wall/' in p else 1 if 'enemies' in p or 'boss' in p else 4 if 'fp_' in p else 3 if '/talents/' in p else 2
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
        elif name.startswith(('enemies', 'boss')) or path.startswith(W_OUT) or '/talents/' in path:
            sc = 2
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
        cw = max(w, lw) if '/talents/' not in path else max(w, 70)
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
        if '/talents/' in path:
            lab = os.path.basename(path)[:-4]
        else:
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
