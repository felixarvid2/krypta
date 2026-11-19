#!/usr/bin/env python3
"""Version 7 graphics for Krypta: the tomb biome (Graven), five new enemies, the pharaoh boss, props, NPCs, items,
particles, HUD icons and touch icons.

Run from the folder that holds retrofps/ and assets/ (e.g. /home/user/test):
    python3 retrofps/tools/props5/make.py [name ...]
(with names only those builders run, e.g. `python3 retrofps/tools/props5/make.py mummy sheet`; the contact sheet
always shows everything this script has written so far, plus the three new first-person weapons)

The first-person weapons knives / hammer / musket (fp_*.png, pick_*.png, js/weapons.js) come from tools/weapon-frames
(render-static.mjs + pack.py, see the README there).

Out to retrofps/assets/gfx:
  enemies-{mummy,jackal,thief,doppelganger}_{idle,movement,attack,take_damage,death}.png  (64x64 cells)
  enemies-scarab_{...}.png (32x32 cells)
  boss_pharaoh_{idle,attack,cast,hurt,death}.png (square frames)
  prop_{sarcophagus,boulder,alarmbell,goldheap}.png, npc_{gambler,banker,wanderer}.png
  item_{page,battery,stone}.png, part_{knife,bandage,sand,smoke2,beam,dust_mote}.png, icon_{eye,ear}.png (8x8)
Out to retrofps/assets/wall:
  wall_sandstone, wall_hieroglyph, wall_boss_pharaoh (64x128), floor_sand, floor_gold_tiles, floor_quicksand,
  floor_boss_pharaoh (64x64)
Out to retrofps/assets/touch: icon_lamp.png, icon_stone.png, icon_sneak.png (96x96, white on transparent)
Contact sheet: <scratchpad>/en/v7_sheet.png

Sources (licences checked; everything not listed is drawn procedurally below in the outlined style of
tools/props2-props4, whose helpers are reused):
  * Pixel Crawler Free Pack 2.11 (Anokolisa; free for commercial use, edits allowed, no resale of the assets):
      Characters/Body_A Idle/Walk/Run/Slice/Hit/Death -> mummy (bandaged, glowing eyes, the axe swing becomes a
                                                         thrown bandage) and jackal (black fur, jackal head, collar,
                                                         kilt and bronze khopesh drawn)
      Npc's/Rogue Idle/Run/Death                      -> thief (recoloured, sack and grabbing arm drawn)
      Npc's/Knight, Wizzard, Rogue Idle               -> banker, wanderer, gambler NPCs (recoloured, props drawn)
  * Legacy Collection (Ansimuz, CC0 - "public-license.pdf" in the collection):
      TinyRPG Battle Sprites / Monster Pack / Demon   -> boss_pharaoh "DEN GYLLENE FARAONEN" (recoloured gold, lapis
                                                         and bandage, nemes headdress, beard, crook and magic drawn)
      Warped / cyberpunk-detective walk/gun-walk/shot/death -> doppelganger (turned into a dark-violet silhouette)
  * Kenney retro-textures-fantasy (CC0): wall_brick_sand_center, floor_tiles_sand_large, floor_ground_sand
      -> block layout and grain of the tomb textures
  * Classic 64 Asset Pack 0.6 (Craig Snedeker, CC0): Ground/sand_0x, Rocks -> sand grain
  (32rogues, Super Retro World and Mana Seed are NOT used: their licences forbid AI use / redistribution.)
Additive particles (stored opaque on black, like part_ember): part_beam, part_dust_mote.
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


def _load(name, rel):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, '..', rel, 'make.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


P2 = _load('props2make', 'props2')
P3 = _load('props3make', 'props3')
P4 = _load('props4make', 'props4')
from_p2 = ('OUT Pic outline outline_same hard recolor load_frames shift shear rot squash tint place gmap tile_lum blend '
           'mask_draw glow warp radial band from_arr').split()
globals().update({k: getattr(P2, k) for k in from_p2})
colors_mask, keep, voronoi_cells, edge, strip_tool = P3.colors_mask, P3.keep, P3.voronoi_cells, P3.edge, P3.strip_tool
comp, cut_below, opaque, feet_cx = P4.comp, P4.cut_below, P4.opaque, P4.feet_cx
S0, S1, S2, S3, S4 = P2.S0, P2.S1, P2.S2, P2.S3, P2.S4
W0, W1, W2, W3, W4 = P2.W0, P2.W1, P2.W2, P2.W3, P2.W4
M0, M1, M2, M3 = P2.M0, P2.M1, P2.M2, P2.M3
I0, I1, I2, I3 = P2.I0, P2.I1, P2.I2, P2.I3
B0, B1, B2, B3 = P2.B0, P2.B1, P2.B2, P2.B3
GOLD0, GOLD1, GOLD2 = P2.GOLD0, P2.GOLD1, P2.GOLD2
PAPER0, PAPER1, PAPER2 = P2.PAPER0, P2.PAPER1, P2.PAPER2
V0, V1, V2, V3 = P2.V0, P2.V1, P2.V2, P2.V3

A = 'assets/'
LC = A + '2d-pixel/Legacy Collection/Legacy Collection/Assets/'
TRPG = LC + 'TinyRPG/Characters/Battle Sprites/Monster Pack Files/'
DET = LC + 'Warped/Characters/cyberpunk-detective/spritesheets/'
PCE = A + '2d-pixel/Pixel Crawler - Free Pack 2.11/Pixel Crawler - Free Pack/Entities/'
BODY = PCE + 'Characters/Body_A/Animations/'
NPC = PCE + "Npc's/"
K = A + 'textures/retro-textures-fantasy/PNG/'
C64 = A + 'textures/Classic 64 Asset Pack 0.6/- Classic 64 Asset Pack 0.6/'
G_OUT, W_OUT, T_OUT = 'retrofps/assets/gfx/', 'retrofps/assets/wall/', 'retrofps/assets/touch/'
SCR = '/tmp/claude-0/-home-user/80ee56ba-2fa6-5354-b261-a4ca4fdcb508/scratchpad/en/'
SHEET, MANIFEST = SCR + 'v7_sheet.png', SCR + 'v7_manifest.json'

# ---------------------------------------------------------------- tomb palette
SD0, SD1, SD2, SD3, SD4 = (86, 56, 38), (136, 96, 58), (184, 140, 84), (218, 180, 116), (242, 214, 160)   # sand
SS0, SS1, SS2, SS3, SS4 = (74, 48, 40), (122, 84, 60), (168, 122, 82), (204, 160, 108), (232, 198, 146)   # sandstone
LP0, LP1, LP2, LP3 = (18, 24, 70), (32, 52, 132), (56, 92, 190), (118, 160, 236)                          # lapis
AU0, AU1, AU2, AU3, AU4 = (106, 66, 22), (164, 112, 34), (214, 162, 52), (246, 208, 96), (255, 244, 190)   # gold
BD0, BD1, BD2, BD3 = (84, 66, 50), (142, 122, 92), (194, 178, 140), (232, 222, 188)                        # bandage
TQ0, TQ1, TQ2 = (24, 110, 110), (64, 200, 180), (190, 255, 236)                                             # turquoise magic
BZ0, BZ1, BZ2 = (120, 72, 34), (188, 126, 56), (238, 190, 110)                                              # bronze
DV0, DV1, DV2, DV3, DV4 = (14, 6, 24), (30, 14, 48), (52, 28, 84), (88, 56, 136), (150, 110, 214)          # doppelganger

SAVED = {}


def save(im, path, n=1, additive=False):
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


def ground(f, feet=57):
    """Shift a cell so its lowest pixel sits on the feet row."""
    b = f.getbbox()
    return shift(f, 0, feet - (b[3] - 1)) if b else f


def mask_of(im):
    return np.array(im)[:, :, 3] > 0


def lum_map(im, stops, keep_cols=()):
    """Recolour by luminance through a gradient (keeps alpha); colours in keep_cols stay."""
    a = np.array(im.convert('RGBA')).astype(float)
    l = (a[:, :, 0] * 0.3 + a[:, :, 1] * 0.55 + a[:, :, 2] * 0.15) / 255
    rgb = gmap(l, stops)
    out = a.copy()
    out[:, :, :3] = rgb
    for c in keep_cols:
        m = (a[:, :, 0] == c[0]) & (a[:, :, 1] == c[1]) & (a[:, :, 2] == c[2])
        out[m, :3] = c
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def line_pts(x0, y0, x1, y1):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    return [(round(x0 + (x1 - x0) * i / max(1, n - 1)), round(y0 + (y1 - y0) * i / max(1, n - 1))) for i in range(n)]


def spark(p, x, y, c=(255, 255, 230), r=2):
    p.p(x, y, c)
    for d in range(1, r + 1):
        cc = c if d < r else AU3
        p.ps([(x + d, y), (x - d, y), (x, y + d), (x, y - d)], cc)


BUILDERS = {}


def builder(name):
    def deco(fn):
        BUILDERS[name] = fn
        return fn
    return deco


# ================================================================== Pixel Crawler Body_A helpers
SKIN = [(217, 160, 102), (162, 101, 67), (118, 61, 43), (250, 200, 149)]
EYE_G, EYE_W1, EYE_W2 = (76, 181, 40), (167, 172, 174), (255, 252, 252)
HANDLE = [(72, 52, 37), (108, 73, 47)]
METAL = [(64, 69, 69), (146, 143, 136), (204, 201, 194)]


def body_src(anim, idx=None):
    return load_frames(BODY + f'{anim}_Base/{anim}_Side-Sheet.png', 64, idx=idx)


def eye_of(f):
    m = colors_mask(f, [EYE_G])
    ys, xs = np.nonzero(m)
    return (int(xs.mean()), int(ys.mean())) if len(xs) else None


def tool_axis(f):
    """(hand, direction) of the tool in a Slice/Pierce frame: hand = handle pixel nearest the body, direction towards
    the far end of the metal; None when the tool is hidden."""
    hm = colors_mask(f, HANDLE)
    mm = colors_mask(f, METAL)
    sk = colors_mask(f, SKIN)
    if not hm.any() or not sk.any():
        return None
    sy, sx = np.nonzero(sk)
    c = np.array([sx.mean(), sy.mean()])
    hy, hx = np.nonzero(hm)
    pts = np.stack([hx, hy], 1)
    hand = pts[np.argmin(((pts - c) ** 2).sum(1))]
    if mm.any():
        my, mx = np.nonzero(mm)
        far = np.stack([mx, my], 1)
        tip = far[np.argmax(((far - hand) ** 2).sum(1))]
    else:
        tip = pts[np.argmax(((pts - hand) ** 2).sum(1))]
    d = tip - hand
    return (int(hand[0]), int(hand[1])), math.atan2(d[1], d[0])


def front_hand(f, top, rows=(15, 24)):
    """The front-most body pixel in the arm rows (relative to the head top)."""
    a = mask_of(f)
    best = None
    for y in range(top + rows[0], min(64, top + rows[1])):
        xs = np.nonzero(a[y])[0]
        if len(xs) and (best is None or xs.max() > best[0]):
            best = (int(xs.max()), y)
    return best


# ================================================================== MUMMY (Pixel Crawler Body_A, bandaged)
MUMMY_MAP = {SKIN[0]: BD2, SKIN[1]: BD1, SKIN[2]: BD0, SKIN[3]: BD3, (0, 0, 0): OUT,
             EYE_W1: (40, 26, 22), EYE_W2: (40, 26, 22), EYE_G: TQ2}


def bandage_tail(p, x, y, length, phase, dirx=-1, droop=0.5, w=1):
    """A loose bandage strip flowing from (x, y): a wavy 1-2 px line."""
    pts = []
    for i in range(length):
        xx = x + dirx * i
        yy = y + i * droop + math.sin(phase + i * 0.7) * 1.2
        pts.append((xx, yy))
    for i, (xx, yy) in enumerate(pts):
        c = BD3 if i % 3 else BD1
        p.p(xx, yy, c)
        if w > 1:
            p.p(xx, yy + 1, BD2)


def mummify(f, hunch=0.18, phase=0.0, arms=True, tails=True, eyes=1.0):
    src = f
    g = strip_tool(f)
    b = g.getbbox()
    if not b:
        return g
    feet = b[3] - 1
    e = eye_of(src)
    top = b[1]
    g = recolor(g, MUMMY_MAP)
    a = np.array(g)
    m = a[:, :, 3] > 0
    inner = m & np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1)
    yy, xx = np.mgrid[0:64, 0:64]
    wrap = inner & (((yy + xx // 4) % 3) == 0)          # wound bandage bands (stepped, slightly slanted)
    wrap2 = inner & (((yy - xx // 3) % 7) == 0) & (yy > top + 13)
    for msk in (wrap, wrap2):
        cur = a[msk, :3].astype(int)
        a[msk, :3] = np.clip(cur - 46, 0, 255)
    g = Image.fromarray(a)
    p = Pic(64, 64)
    p.paste(g, 0, 0)
    if e:                                              # dark slit with glowing eyes
        ex, ey = e
        p.r(ex - 4, ey - 1, ex + 1, ey, (52, 34, 28))
        if eyes:
            p.p(ex, ey, TQ2 if eyes > 0.5 else TQ1)
            p.p(ex - 3, ey, TQ1 if eyes > 0.5 else TQ0)
    if arms and e:                                     # arm stretched forward (the classic mummy pose)
        sx, sy = e[0] - 4, top + 16
        p.r(sx, sy, sx + 9, sy + 2, BD2)
        p.l(sx, sy, sx + 9, sy, BD3)
        p.ps([(sx + 3, sy + 1), (sx + 6, sy + 2)], BD1)
        p.r(sx + 10, sy + 1, sx + 11, sy + 3, BD1)     # drooping hand
        p.p(sx + 11, sy + 4, BD1)
    if tails:
        bandage_tail(p, b[0] + 1, top + 20, 6, phase, -1, 0.7)
        bandage_tail(p, b[0] + 2, top + 9, 5, phase + 1.5, -1, 0.4)
    g = shear(p.im, hunch, feet - 8)
    return g


@builder('mummy')
def make_mummy():
    idle, walk, sl, hit, de = body_src('Idle'), body_src('Walk'), body_src('Slice'), body_src('Hit'), body_src('Death')
    feet = max(f.getbbox()[3] - 1 for f in idle)
    b = idle[0].getbbox()
    cx = (b[0] + b[2]) // 2

    def P(g, dx=0, dy=0):
        return outline_same(place(g, 64, feet, cx, dx=dx - 3, dy=dy))
    save_enemy('mummy', 'idle', [P(mummify(f, phase=i * 1.2, eyes=1 if i != 2 else 0.4)) for i, f in enumerate(idle)], 64)
    save_enemy('mummy', 'movement', [P(mummify(f, hunch=0.24, phase=i * 1.0), dy=(0, 1, 0, 0, 1, 0)[i]) for i, f in enumerate(walk)], 64)
    # attack: winds up and lashes a long bandage forward, then reels it back
    att = []
    reach = [0, 0, 0, 10, 22, 16, 6, 0]
    last = None
    for i, f in enumerate(sl):
        ax = tool_axis(f) or last
        last = ax
        g = mummify(f, hunch=0.1, phase=i, arms=False)
        p = Pic(64, 64)
        p.paste(g, 0, 0)
        if ax and i <= 2:                                  # coil of bandage in the raised hand
            (hx, hy), _ = ax
            p.e(hx - 2, hy - 3, hx + 2, hy + 1, BD2); p.eo(hx - 2, hy - 3, hx + 2, hy + 1, BD1); p.p(hx, hy - 1, BD3)
        if reach[i] and ax:
            gs = strip_tool(f)
            hx, hy = front_hand(gs, gs.getbbox()[1], (12, 22))
            n = reach[i]
            for k in range(n):
                x = hx + k
                y = hy + math.sin(k * 0.55 + i) * (1.5 if k > 3 else 0.5) - (k * 0.12 if i == 3 else 0)
                p.p(x, y, BD3 if (k // 2) % 2 else BD2)
                p.p(x, y + 1, BD1)
            if i == 4:                                     # the flying end snaps
                p.ps([(hx + n, hy - 1), (hx + n + 1, hy - 2), (hx + n, hy + 2)], BD3)
        att.append(P(p.im, dx=1 if 3 <= i <= 5 else 0))
    save_enemy('mummy', 'attack', att, 64)
    hurt = []
    for i, f in enumerate(hit):
        g = mummify(f, phase=i * 2, eyes=0.4)
        if i == 0:
            g = tint(g, (255, 250, 230), 0.45)
        p = Pic(64, 64)
        p.paste(g, 0, 0)
        r2 = random.Random(i)
        gb = g.getbbox()
        for _ in range(4 if i < 2 else 0):                 # dust of old linen
            p.p(gb[2] + r2.randint(-2, 3), gb[1] + r2.randint(8, 20), BD3)
        hurt.append(P(p.im, dx=-1 - (i == 0)))
    save_enemy('mummy', 'take_damage', hurt, 64)
    dfr = []
    for i, f in enumerate(de):
        g = mummify(f, hunch=0.1 if i < 4 else 0, phase=i, arms=i < 2, tails=True, eyes=max(0, 1 - i / 5))
        p = Pic(64, 64)
        p.paste(g, 0, 0)
        if i >= 5:                                          # unravelled linen on the floor
            gb = g.getbbox()
            fy = feet
            for k in range(6 + (i - 5) * 3):
                p.p(gb[0] - 2 - k, fy - (k % 2), BD2 if k % 3 else BD3)
        dfr.append(P(p.im))
    save_enemy('mummy', 'death', dfr, 64)


# ================================================================== JACKAL WARRIOR (Body_A, jackal head, bronze khopesh)
FUR0, FUR1, FUR2, FUR3 = (28, 24, 34), (50, 46, 62), (76, 70, 92), (116, 110, 134)
JACKAL_MAP = {SKIN[0]: FUR2, SKIN[1]: FUR1, SKIN[2]: FUR0, SKIN[3]: FUR3, (0, 0, 0): OUT,
              EYE_W1: FUR2, EYE_W2: FUR2, EYE_G: AU3}
LINEN0, LINEN1 = (196, 188, 168), (240, 236, 222)


def khopesh(p, hx, hy, ang, s=1.0):
    """Bronze sickle sword: grip at (hx, hy), blade along `ang`, the hook bends to the left of the blade direction."""
    u = (math.cos(ang), math.sin(ang))
    v = (u[1], -u[0])
    P_ = lambda a_, b_: (hx + (u[0] * a_ + v[0] * b_) * s, hy + (u[1] * a_ + v[1] * b_) * s)
    for t in np.linspace(-2, 1, 7):
        p.p(*P_(t, 0), W1)
    p.p(*P_(1.5, 0.8), AU2); p.p(*P_(1.5, -0.8), AU2)
    spine = [(2, 0), (5, 0.2), (7, 0.8), (8.6, 2.0), (9.4, 3.6), (9.0, 5.2), (7.8, 6.0)]
    for (a0, b0), (a1, b1) in zip(spine, spine[1:]):
        for t in np.linspace(0, 1, 6):
            a_, b_ = a0 + (a1 - a0) * t, b0 + (b1 - b0) * t
            p.p(*P_(a_, b_), BZ1)
            p.p(*P_(a_ - 0.3, b_ - 0.9), BZ2)        # sharp outer edge
    p.p(*P_(5, -0.6), BZ2)


def slash_arc(p, cx, cy, r, a0, a1, c=(255, 248, 220), c2=(236, 190, 110)):
    for k, rr in enumerate((r, r - 1)):
        for t in np.linspace(a0, a1, int(abs(a1 - a0) * rr) + 2):
            p.p(cx + math.cos(t) * rr, cy + math.sin(t) * rr, c if k == 0 else c2)


def jackalify(f, sword=None, upright=True, dead=False, clothes=True):
    src = f
    g = strip_tool(f)
    b = g.getbbox()
    if not b:
        return g
    e = eye_of(src)
    if e is None:                       # eyes closed (death): guess the eye from the head's top and front edge
        m0 = mask_of(g)
        ey = b[1] + 10
        xs = np.nonzero(m0[ey])[0]
        e = (int(xs.max()) - 3, ey) if len(xs) else None
    g = recolor(g, JACKAL_MAP)
    p = Pic(64, 64)
    a = mask_of(g)
    top, feet = b[1], b[3] - 1
    if e and upright:
        ex, ey = e
        htop = ey - 10
        # nemes-like striped lappet behind the head
        for y in range(htop + 5, htop + 15):
            for x in range(ex - 10, ex - 7):
                if 0 <= y < 64:
                    p.p(x, y, AU2 if (y % 2) else LP1)
        # tall ears
        for (ox, h) in ((-8, 6), (-3, 7)):
            for k in range(h):
                w = 3 if k < 2 else 2 if k < h - 2 else 1
                for j in range(w):
                    p.p(ex + ox + j + (k >= h - 2), htop + 2 - k, FUR1 if j == 0 else FUR2)
            for k in range(1, h - 2):
                p.p(ex + ox + 1, htop + 2 - k, (170, 70, 60) if ox < -5 else AU2)
    p.paste(g, 0, 0)
    if e:
        ex, ey = e
        htop = ey - 10
        if upright:
            # long snout and dark nose, from the edge of the head
            row = np.nonzero(a[ey])[0]
            hr = int(row[row <= ex + 4].max()) if len(row[row <= ex + 4]) else ex + 2
            for k in range(6):
                hgt = 3 if k < 3 else 2
                for j in range(hgt):
                    p.p(hr + 1 + k, ey - 1 + j + (k >= 3), FUR3 if j == 0 else FUR2 if j < hgt - 1 else FUR1)
            p.p(hr + 7, ey + 1, (16, 12, 18)); p.p(hr + 6, ey + 2, FUR1)
            p.l(hr - 1, ey + 2, hr + 3, ey + 2, (150, 40, 40))   # mouth line
            p.p(ex, ey, AU3); p.p(ex - 1, ey, AU2)
            # gold-and-lapis collar
            cy = htop + 13 if clothes else -99
            xs = np.nonzero(a[cy])[0] if 0 <= cy < 64 else []
            if len(xs):
                for x in range(xs.min(), xs.max() + 1):
                    p.p(x, cy, AU2 if x % 2 else LP2)
                    p.p(x, cy + 1, AU1 if x % 2 else AU3)
            # linen kilt with a gold belt
            wy = htop + 21
            for y in range(wy, min(feet - 2, wy + 5) if clothes else wy):
                xs = np.nonzero(a[y])[0]
                if len(xs):
                    fl = (y - wy) // 2
                    for x in range(xs.min() - fl, xs.max() + 1 + fl // 2):
                        p.p(x, y, AU2 if y == wy else (LINEN1 if (x + y) % 4 else LINEN0))
        else:
            p.p(ex, ey, AU1)
    if sword:
        (hx, hy), ang = sword
        khopesh(p, hx, hy, ang)
    return p.im


@builder('jackal')
def make_jackal():
    idle, run, sl, hit, de = body_src('Idle'), body_src('Run'), body_src('Slice'), body_src('Hit'), body_src('Death')
    feet = max(f.getbbox()[3] - 1 for f in idle)
    b = idle[0].getbbox()
    cx = (b[0] + b[2]) // 2

    def P(g, dx=0, dy=0):
        return outline_same(place(g, 64, feet, cx, dx=dx - 3, dy=dy))

    def held(f, ang=-1.15, dy=0):
        g = strip_tool(f)
        bb = g.getbbox()
        h = front_hand(g, bb[1])
        return (h[0], h[1] + dy), ang
    save_enemy('jackal', 'idle', [P(jackalify(f, held(f, 0.55))) for f in idle], 64)
    save_enemy('jackal', 'movement', [P(jackalify(f, held(f, -0.25)), dy=0) for f in run], 64)
    att = []
    last = None
    for i, f in enumerate(sl):
        ax = tool_axis(f)
        if ax is None:
            ax = last
        last = ax
        (hx, hy), ang = ax
        g = jackalify(f, ((hx, hy), ang))
        p = Pic(64, 64)
        p.paste(g, 0, 0)
        if i == 3:
            slash_arc(p, hx - 2, hy - 2, 12, -2.4, 0.9)
        if i == 4:
            slash_arc(p, hx - 4, hy - 4, 13, -0.6, 1.2)
        att.append(P(p.im))
    save_enemy('jackal', 'attack', att, 64)
    # take_damage doubles as a parry: the khopesh is held across the body, sparks fly on the first frame
    hurt = []
    for i, f in enumerate(hit):
        g0 = strip_tool(f)
        bb = g0.getbbox()
        e = eye_of(f)
        hx, hy = (e[0] + 1, e[1] + 9) if e else (bb[2] - 2, bb[1] + 18)
        g = jackalify(f, ((hx, hy), -1.95))
        p = Pic(64, 64)
        p.paste(g, 0, 0)
        if i == 0:
            spark(p, hx + 3, hy - 7, r=3)
            p.ps([(hx + 7, hy - 10), (hx + 8, hy - 4), (hx + 6, hy - 12)], AU3)
        hurt.append(P(p.im, dx=-1 if i < 2 else 0))
    save_enemy('jackal', 'take_damage', hurt, 64)
    dfr = []
    for i, f in enumerate(de):
        up = i < 3
        g = jackalify(f, held(f, -1.2) if up else None, upright=True, clothes=i < 3)
        p = Pic(64, 64)
        if i >= 3:                                 # the khopesh falls and lies in front
            fb = g.getbbox()
            khopesh(p, fb[2] + 3, feet - 1 - max(0, 5 - i), 0.2 if i > 4 else -0.4)
        p.paste(g, 0, 0)
        dfr.append(P(p.im))
    save_enemy('jackal', 'death', dfr, 64)


# ================================================================== THIEF (Pixel Crawler Rogue NPC, sack drawn)
THIEF_MAP = {(146, 130, 48): (104, 88, 78), (95, 86, 37): (74, 60, 56), (55, 58, 32): (50, 40, 40), (37, 39, 22): (32, 24, 28),
             (147, 45, 139): (150, 42, 36), (95, 46, 92): (104, 30, 30), (51, 30, 50): (58, 18, 22),
             (12, 152, 214): (255, 216, 96), (28, 56, 69): (130, 92, 30), (20, 20, 18): OUT}
SACK0, SACK1, SACK2 = (92, 64, 40), (138, 100, 62), (176, 136, 86)


def rogue_src(anim, fw):
    return load_frames(NPC + f'Rogue/{anim}/{anim}-Sheet.png', fw)


def sack(p, x, y, bob=0, full=1.0):
    """A bulging coin sack, its neck at (x, y)."""
    r = round(4 + full)
    cy = y + 2 + r + bob
    p.e(x - r, cy - r, x + r, cy + r - 1, SACK1)
    p.e(x - r, cy - r, x + r - 2, cy + r - 3, SACK2)
    p.l(x - r + 1, cy + r - 1, x + r - 1, cy + r - 1, SACK0)
    p.r(x - 1, y + bob, x + 1, y + 2 + bob, SACK1)
    p.l(x - 2, y + 2 + bob, x + 2, y + 2 + bob, (60, 40, 30))
    p.p(x + 1, cy - 1, AU3); p.p(x - 2, cy + 1, AU2)


def thief_frame(f, feet_src, cx_src, sack_dx=-7, sack_dy=0, hunch=0.0, dx=0, dy=0):
    g = recolor(f, THIEF_MAP)
    g = place(g, 64, feet_src, cx_src, dx=dx, dy=dy)
    b = g.getbbox()
    p = Pic(64, 64)
    if b:
        sack(p, b[0] + 2 + sack_dx + 4, b[1] + 11 + sack_dy, 0)
    p.paste(g, 0, 0)
    if b:   # strap across the chest
        for k in range(5):
            p.p(b[0] + 4 + k, b[1] + 12 + k, SACK0)
    im = p.im
    if hunch:
        im = shear(im, hunch, 57)
    return outline_same(im)


@builder('thief')
def make_thief():
    idle = rogue_src('Idle', 32)
    run = rogue_src('Run', 64)
    death = rogue_src('Death', 64)
    ib = idle[0].getbbox()
    ifeet, icx = ib[3] - 1, (ib[0] + ib[2]) // 2
    rfeet = max(f.getbbox()[3] - 1 for f in run)
    rb = run[0].getbbox()
    rcx = (rb[0] + rb[2]) // 2
    idl = [thief_frame(f, ifeet, icx, sack_dy=(0, 0, 1, 1)[i]) for i, f in enumerate(idle)]
    save_enemy('thief', 'idle', idl, 64)
    # fast sneaking run: crouched lower, leaning forward, the sack bouncing
    mov = [thief_frame(squash(f, 0.92, rfeet), rfeet, rcx, sack_dy=(0, -1, 0, 1, 0, -1)[i], hunch=0.2) for i, f in enumerate(run)]
    save_enemy('thief', 'movement', mov, 64)
    # attack: a quick lunge, the arm snatches forward, a coin glints, then the thief springs back
    base = idle[0]
    att = []
    for i, (ddx, reach, sq, glint) in enumerate(((0, 0, 0.94, 0), (2, 3, 0.9, 0), (5, 9, 0.9, 0), (6, 11, 0.92, 1),
                                                   (3, 6, 0.95, 2), (0, 0, 1.0, 0))):
        g = recolor(squash(base, sq, ifeet), THIEF_MAP)
        g = place(g, 64, ifeet, icx, dx=ddx)
        b = g.getbbox()
        p = Pic(64, 64)
        sack(p, b[0] - 1, b[1] + 11, 0)
        p.paste(g, 0, 0)
        if reach:
            sx, sy = b[2] - 4, b[1] + 15
            p.l(sx, sy, sx + reach, sy - 1, (74, 60, 56), 2)
            p.r(sx + reach, sy - 2, sx + reach + 1, sy, (240, 154, 83))   # the grabbing hand
            p.p(sx + reach + 2, sy - 2, (240, 154, 83))
        im = outline_same(p.im)
        p = Pic(64, 64)
        p.paste(im, 0, 0)
        if glint:
            gx, gy = b[2] + reach - 2, b[1] + 12
            p.e(gx, gy, gx + 2, gy + 2, AU2); p.p(gx + 1, gy + 1, AU4)
            if glint == 1:
                spark(p, gx + 4, gy - 2, AU4, 1)
        att.append(p.im)
    save_enemy('thief', 'attack', att, 64)
    hurt = [tint(thief_frame(base, ifeet, icx, dx=-3), (255, 255, 255), 0.5), thief_frame(base, ifeet, icx, dx=-2),
            thief_frame(base, ifeet, icx, dx=-1)]
    save_enemy('thief', 'take_damage', hurt, 64)
    db = death[0].getbbox()
    dfeet, dcx = max(f.getbbox()[3] - 1 for f in death), (db[0] + db[2]) // 2
    dfr = []
    for i, f in enumerate(death):
        g = place(recolor(f, THIEF_MAP), 64, dfeet, dcx)
        p = Pic(64, 64)
        gb = g.getbbox()
        if i < 2:
            sack(p, gb[0] - 1, gb[1] + 11, 0)
        else:                                              # the sack drops behind and spills coins
            sx = 18 - i
            p.e(sx - 4, 51, sx + 4, 57, SACK1); p.e(sx - 4, 51, sx + 2, 55, SACK2)
            for k in range(min(6, (i - 1) * 2)):
                cx_ = sx + 6 + k * 3 + (k % 2)
                p.e(cx_, 55, cx_ + 2, 57, AU2); p.p(cx_ + 1, 55, AU4)
        p.paste(g, 0, 0)
        dfr.append(outline_same(p.im))
    save_enemy('thief', 'death', dfr, 64)


# ================================================================== SCARAB (drawn, 32x32, low to the ground)
SC0, SC1, SC2, SC3 = (14, 20, 30), (26, 46, 60), (40, 90, 96), (120, 210, 190)


def scarab_frame(t=0.0, walk=None, bob=0, lean=0.0, wings=0.0, jaw=0.0, dx=0, flash=False):
    p = Pic(32, 32)
    base = 28
    by = base - 5 + bob                 # underside of the shell (legs show below it)
    x0, x1 = 5 + dx, 21 + dx
    L = round(lean * 2)
    # legs: three visible, splayed, two segments each (front pair reaches forward)
    for k, (lx, reach) in enumerate(((x0 + 3, -3), (x0 + 8, 0), (x0 + 13, 3))):
        ph = (walk + k * 2.1) if walk is not None else 0.5 * math.sin(t * math.tau + k)
        sw = math.sin(ph) * 2 if walk is not None else ph * 0.6
        up = max(0, math.cos(ph)) * 1.5 if walk is not None else 0
        kx, ky = lx + reach * 0.6 + sw * 0.5, by + 2 - up
        fx, fy = lx + reach + sw, base - up * 0.6
        p.l(lx, by, kx, ky, SC0)
        p.l(kx, ky, fx, fy, SC0)
        p.p(fx + (1 if reach >= 0 else -1), fy, SC0)
    # wings (spread when attacking): an amber membrane fanning up and back under a lifted wing case
    if wings > 0:
        cxw, cyw = (x0 + x1) // 2, by - 7 + L
        tip = (cxw - 4 - 8 * wings, cyw - 4 - 8 * wings)
        p.poly([(cxw, cyw), tip, (tip[0] - 3, tip[1] + 5), (cxw - 6, cyw + 2)], (214, 168, 84))
        p.l(cxw, cyw, tip[0] - 1, tip[1] + 2, (150, 104, 40))
        p.l(cxw - 2, cyw + 1, tip[0] - 3, tip[1] + 5, (150, 104, 40))
        p.poly([(cxw + 1, cyw), (cxw - 3 - 4 * wings, cyw - 5 - 5 * wings), (cxw - 6, cyw - 1)], SC2)   # wing case
    # shell
    sh_top = by - 9 + L
    p.e(x0, sh_top, x1, by + 1, SC1)
    p.e(x0 + 1, sh_top + 1, x1 - 1, by - 1, SC2)
    p.e(x0 + 3, sh_top + 1, x0 + 9, sh_top + 4, SC3)       # glossy highlight
    p.p(x0 + 4, sh_top + 2, (230, 255, 240))
    p.l(x0 + 1, by, x1 - 1, by, AU1)                        # gold rim
    p.l(x0 + 2, by - 1, x1 - 2, by - 1, AU2)
    p.l((x0 + x1) // 2, sh_top + 1, (x0 + x1) // 2 + 1, by - 2, SC0)   # wing seam
    # pronotum, toothed head (clypeus) and mandibles
    hx = x1 - 2
    p.e(hx, by - 6 + L, hx + 5, by, SC1)
    p.l(hx + 1, by - 5 + L, hx + 4, by - 5 + L, SC2)
    p.p(hx + 4, by - 3 + L, (255, 90, 60))                  # eye
    for k in range(3):                                      # rake-like teeth
        p.p(hx + 6, by - 5 + k * 2 + L, SC1)
    for sgn in (-1, 1):
        o = 1 + jaw * 2
        p.l(hx + 5, by - 2 + L, hx + 8, by - 2 + sgn * o + L, SC0)
    im = outline_same(p.im)
    if flash:
        im = tint(im, (255, 255, 255), 0.55)
    return im


@builder('scarab')
def make_scarab():
    S = scarab_frame
    save_enemy('scarab', 'idle', [S(t=i / 4, jaw=(0, 0.3, 0, 0.3)[i]) for i in range(4)], 32)
    save_enemy('scarab', 'movement', [S(walk=i * math.tau / 6, bob=(0, -1, 0, 0, -1, 0)[i]) for i in range(6)], 32)
    save_enemy('scarab', 'attack', [S(lean=-0.5, wings=0.4, jaw=0.6), S(lean=-1, wings=1.0, jaw=1.0, dx=-1),
                                    S(lean=0.5, wings=0.8, jaw=1.0, dx=3), S(lean=0.5, wings=0.3, jaw=0.0, dx=4),
                                    S(dx=2, jaw=0.4)], 32)
    save_enemy('scarab', 'take_damage', [S(flash=True, dx=-2), S(dx=-1, lean=-0.5), S(jaw=0.5)], 32)
    # death: flips onto its back (legs up), kicks, curls up
    up = S()
    dth = [ground(up.rotate(25, resample=Image.NEAREST, center=(16, 24)), 28),
           ground(up.rotate(90, resample=Image.NEAREST, center=(16, 22)), 28)]
    for k in range(3):
        im = S(walk=k * 1.9 if k < 2 else None).transpose(Image.FLIP_TOP_BOTTOM)
        if k == 2:   # legs curled: squash the upturned legs
            a_ = np.array(im)
            bb = im.getbbox()
            a_[:bb[1] + 2] = 0
            im = Image.fromarray(a_)
        dth.append(ground(im, 28))
    save_enemy('scarab', 'death', dth, 32)


# ================================================================== DOPPELGANGER (Warped detective as a violet silhouette)
def det(name, fw=32):
    im = Image.open(DET + name + '.png').convert('RGBA')
    return [im.crop((i * fw, 0, i * fw + fw, im.height)) for i in range(im.width // fw)]


def shadowify(f, eyes=True, flicker=0, gunlit=True):
    a = np.array(f.convert('RGBA'))
    m = a[:, :, 3] > 0
    l = a[:, :, :3].astype(float).mean(2)
    out = np.zeros_like(a)
    levels = [DV1, DV2, DV3]
    q = np.clip((l / 70).astype(int), 0, 2)
    for k, c in enumerate(levels):
        out[m & (q == k)] = c + (255,)
    gun = m & (a[:, :, 0] == 2) & (a[:, :, 1] == 10)          # the darkest colour: gun and shoes
    if gunlit:
        out[gun] = (120, 104, 150, 255)
    # rim light along the top edge
    top = m & ~np.roll(m, 1, 0)
    out[top & ~gun] = DV4 + (255,)
    im = Image.fromarray(out)
    p = Pic(im.width, im.height)
    p.paste(im, 0, 0)
    ys, xs = np.nonzero(m)
    if eyes and len(xs):
        y0 = ys.min()
        row = np.nonzero(m[y0 + 3])[0]
        if len(row):
            ex = row.max() - 1
            p.p(ex, y0 + 3, (255, 140, 255)); p.p(ex - 2, y0 + 3, (220, 90, 230))
    if flicker:                                           # a few loose shadow wisps
        r2 = random.Random(flicker)
        for _ in range(5):
            i = r2.randrange(len(xs))
            p.p(xs[i] + r2.choice((-2, -1, 1, 2)), ys[i] + r2.choice((-1, 0, 1)), DV2)
    return p.im


def gun_hand(g):
    """Right-most pixel of the arm rows (4..9 below the top of the head) of a silhouette cell."""
    m = mask_of(g)
    ys = np.nonzero(m.any(1))[0]
    best = None
    for y in range(ys.min() + 4, ys.min() + 10):
        xs = np.nonzero(m[y])[0]
        if len(xs) and (best is None or xs.max() > best[0]):
            best = (int(xs.max()), y)
    return best


def dop_cell(f, feet_src, cx_src, dx=0, gun=False, **kw):
    g = shadowify(f, **kw)
    g = place(g, 64, feet_src, cx_src, dx=dx)
    if gun:                                               # a plain pistol shape in the outstretched hand
        hx, hy = gun_hand(g)
        q = Pic(64, 64)
        q.paste(g, 0, 0)
        q.r(hx, hy - 1, hx + 4, hy, (120, 104, 156))
        q.l(hx, hy - 1, hx + 4, hy - 1, (176, 156, 214))
        q.r(hx, hy + 1, hx + 1, hy + 2, (96, 80, 128))
        g = q.im
    p = Pic(64, 64)
    b = g.getbbox()
    if b:                                                 # a pool of darkness under the feet
        cx_ = (b[0] + b[2]) // 2
        p.e(cx_ - 7, 55, cx_ + 7, 58, DV0)
        p.e(cx_ - 4, 55, cx_ + 3, 57, DV1)
    p.paste(g, 0, 0)
    return outline_same(p.im)


@builder('doppelganger')
def make_doppelganger():
    gw, shot, death, walk = det('gun-walk'), det('shot'), det('death', 46), det('draw-gun')
    allf = gw + shot
    feet = max(f.getbbox()[3] - 1 for f in allf)
    b = shot[0].getbbox()
    cx = (b[0] + b[2]) // 2
    aim = shot[0]
    idle = [dop_cell(aim, feet, cx, flicker=i + 1, gun=True) for i in range(4)]
    idle[2] = dop_cell(aim, feet, cx, flicker=3, eyes=False, gun=True)  # blink
    save_enemy('doppelganger', 'idle', idle, 64)
    save_enemy('doppelganger', 'movement', [dop_cell(f, feet, cx, flicker=i + 7) for i, f in enumerate(gw)], 64)
    att = []
    for i, (fr, flash, ddx) in enumerate(((shot[0], 0, 0), (shot[1], 0, 0), (shot[2], 2, -1), (shot[2], 1, -1), (shot[1], 0, 0), (shot[0], 0, 0))):
        im = dop_cell(fr, feet, cx, dx=ddx, flicker=i + 20, gun=i in (0, 2, 3, 5))
        if flash:
            sb = shadowify(fr)
            m = np.array(sb)[:, :, 3] > 0
            ys, xs = np.nonzero(m[:, :])
            # muzzle: right-most pixel in the arm rows
            rows = range(ys.min() + 4, ys.min() + 10)
            mx, my = max(((int(np.nonzero(m[y])[0].max()), y) for y in rows if m[y].any()))
            mx, my = mx + (32 - cx) + ddx + 4, my + (57 - feet)
            p = Pic(64, 64)
            p.paste(im, 0, 0)
            r = 4 if flash == 2 else 2
            p.e(mx + 1, my - r, mx + 1 + 2 * r, my + r, (200, 120, 255))
            p.e(mx + 2, my - r + 1, mx + 2 * r - 1, my + r - 1, (255, 220, 255))
            if flash == 2:
                p.ps([(mx + 2 * r + 2, my), (mx + 2 * r + 3, my), (mx + r + 1, my - r - 2), (mx + r + 1, my + r + 2)], (255, 200, 255))
            im = p.im
        att.append(im)
    save_enemy('doppelganger', 'attack', att, 64)
    # take_damage: the silhouette glitches (rows slide apart) and flashes
    hurt = []
    for i in range(3):
        g = dop_cell(aim, feet, cx, dx=-1, gun=True)
        a = np.array(g)
        r2 = random.Random(i + 40)
        for y in range(0, 64, 3):
            s = r2.choice((-2, -1, 0, 1, 2)) if i < 2 else 0
            a[y:y + 3] = np.roll(a[y:y + 3], s, 1)
        g = Image.fromarray(a)
        if i == 0:
            g = tint(g, (255, 200, 255), 0.4)
        hurt.append(g)
    save_enemy('doppelganger', 'take_damage', hurt, 64)
    dfeet = max(f.getbbox()[3] - 1 for f in death)
    dfr = [dop_cell(f, dfeet, 23 + 0, dx=0, eyes=i < 3, gunlit=True, flicker=i + 50) for i, f in enumerate(death)]
    last = dfr[-1]                                       # the shadow seeps into the floor
    a = np.array(last)
    m = a[:, :, 3] > 0
    r2 = np.random.default_rng(3)
    fade = Image.fromarray(np.where((m & (r2.random(m.shape) < 0.55))[..., None], a, 0).astype(np.uint8))
    dfr.append(squash(fade, 0.6, 57))
    save_enemy('doppelganger', 'death', dfr, 64)


# ================================================================== BOSS: DEN GYLLENE FARAONEN (TinyRPG Demon, recoloured)
PHARAOH_MAP = {(181, 0, 0): AU2, (127, 6, 34): AU1, (74, 0, 0): (70, 38, 20), (0, 0, 0): OUT,
               (104, 46, 10): BD0, (182, 81, 18): BD1, (255, 132, 38): BD3}
PH_SC = 0.66          # source 112x153 -> ~74x101 body


def ph_src():
    fr = [Image.open(TRPG + f'Sprites/Demon/demon{i}.png').convert('RGBA') for i in range(1, 6)]
    out = []
    for f in fr:
        a = np.array(f)
        col = (a[:, :, 3] > 0) & (a[:, :, :3].sum(2) > 0)
        low = np.nonzero(col.any(1))[0].max()
        blk = (a[:, :, 3] > 0) & ~col
        for _ in range(3):                                       # drop the ground shadow (black far from colour)
            p_ = np.pad(col, 2)
            near = np.zeros_like(col)
            for dy in range(-2, 3):
                for dx in range(-2, 3):
                    near |= p_[2 + dy:2 + dy + col.shape[0], 2 + dx:2 + dx + col.shape[1]]
            rm = blk & ~near & (np.arange(a.shape[0])[:, None] > low - 12)
            a[rm] = 0
            blk &= ~rm
        out.append(Image.fromarray(a))
    return out


def ph_dress(f, eyes=1.0):
    """Recolour and kitbash at source resolution: nemes headdress instead of horns and hair, gold death mask,
    turquoise eyes, false beard and a broad usekh collar."""
    a = np.array(f)
    org = ((a[:, :, 0] == 255) & (a[:, :, 1] == 132)) | ((a[:, :, 0] == 182) & (a[:, :, 1] == 81))
    eye = org & (np.arange(a.shape[0])[:, None] >= 40) & (np.arange(a.shape[0])[:, None] <= 47) & \
        (np.arange(a.shape[1])[None, :] > 44) & (np.arange(a.shape[1])[None, :] < 68)
    g = recolor(f, PHARAOH_MAP)
    a = np.array(g)
    a[:39] = 0                                                    # horns and hair go
    a[eye] = (TQ2 if eyes > 0.5 else TQ1) + (255,)
    g = Image.fromarray(a)
    p = Pic(112, 153)
    # nemes: striped headcloth over the head, flaring behind the ears, lappets down the chest
    cx = 55

    def stripe(y):
        return AU3 if y % 4 < 2 else LP1
    for y in range(16, 50):
        if y < 36:
            t = (y - 16) / 20
            hw = 7 + 8 * math.sqrt(t)
        else:
            hw = 15 + (y - 36) * 1.1
        for x in range(round(cx - hw), round(cx + hw) + 1):
            p.p(x, y, stripe(y) if abs(x - cx) < hw - 1 else LP0)
    p.paste(g, 0, 0)
    for side in (-1, 1):                                         # lappets hang in front of the shoulders
        for y in range(42, 70):
            x0 = cx + side * 12
            w = 7 if y < 63 else 7 - (y - 63)
            for k in range(max(0, w)):
                p.p(x0 + side * k, y, LP0 if k in (0, w - 1) else stripe(y + 1))
    # gold band across the brow and the uraeus cobra
    p.r(cx - 12, 36, cx + 12, 38, AU3)
    p.l(cx - 12, 39, cx + 12, 39, AU1)
    p.r(cx - 1, 28, cx + 1, 36, AU2)
    p.r(cx - 2, 27, cx + 2, 29, AU3)
    p.p(cx, 31, LP2); p.p(cx, 33, (200, 40, 40))
    # false beard
    for y in range(55, 68):
        w = 3 if y < 64 else 2
        for x in range(cx - w + 1, cx + w):
            p.p(x, y, AU2 if y % 3 else LP1)
    p.l(cx - 2, 68, cx + 1, 68, AU1)
    # usekh collar: three arcs of lapis, gold and turquoise over the chest
    for r, c in ((14, LP1), (12, AU3), (10, TQ1), (8, AU2)):
        for t in np.linspace(0.15, math.pi - 0.15, 60):
            for rr in (r, r - 0.5):
                p.p(cx + math.cos(t) * rr * 1.45, 52 + math.sin(t) * rr * 0.7, c)
    return p.im


def ph_small(im):
    """Source resolution -> boss resolution (box filter, colours snapped back to the sprite's own palette)."""
    a0 = np.array(im)
    pal = np.unique(a0[a0[:, :, 3] > 0][:, :3], axis=0).astype(float)
    w, h = round(im.width * PH_SC), round(im.height * PH_SC)
    b = np.array(im.resize((w, h), Image.BOX))
    m = b[:, :, 3] >= 120
    rgb = b[:, :, :3].reshape(-1, 3).astype(float)
    idx = ((rgb[:, None, :] - pal[None]) ** 2).sum(2).argmin(1)
    out = np.zeros((h, w, 4), np.uint8)
    out[:, :, :3] = pal[idx].reshape(h, w, 3)
    out[:, :, 3] = np.where(m, 255, 0)
    out[~m] = 0
    return Image.fromarray(out)


def crook(p, hx, hy, ang, ln=34):
    """The heka crook: a striped gold/lapis shaft held at (hx, hy), pointing along `ang`, hooked at the top."""
    u = (math.cos(ang), math.sin(ang))
    v = (-u[1], u[0])
    pts = [(hx - u[0] * 6 + u[0] * k, hy - u[1] * 6 + u[1] * k) for k in range(ln)]
    for k, (x, y) in enumerate(pts):
        c = AU3 if (k // 3) % 2 else LP2
        p.p(x, y, c); p.p(x + v[0], y + v[1], AU1 if c == AU3 else LP0); p.p(x - v[0], y - v[1], AU4 if c == AU3 else LP2)
    ex, ey = pts[-1]
    for k, t in enumerate(np.linspace(0, math.pi * 1.3, 22)):   # the hook
        x = ex + u[0] * 5 * math.sin(t) - v[0] * 5 * (1 - math.cos(t))
        y = ey + u[1] * 5 * math.sin(t) - v[1] * 5 * (1 - math.cos(t))
        c = AU3 if (k // 4) % 2 else LP2
        p.p(x, y, c); p.p(x + 0.7, y + 0.7, AU1 if c == AU3 else LP0)


def ankh(p, x, y, s, c=TQ2, c2=TQ1):
    """Glowing ankh centred on (x, y), size s (height ~ 3s)."""
    p.eo(x - s, y - 3 * s, x + s, y - s, c2)
    p.eo(x - s + 1, y - 3 * s + 1, x + s - 1, y - s - 1, c)
    p.r(x - 2 * s, y - s, x + 2 * s, y - s + max(1, s // 2), c)
    p.r(x - max(1, s // 3), y - s, x + max(1, s // 3), y + 2 * s, c)


def sand_burst(p, cx, cy, r, n, seed, k=1.0):
    r2 = random.Random(seed)
    for i in range(n):
        a = r2.uniform(math.pi, math.tau)
        d = r * r2.uniform(0.3, 1.0) * k
        x, y = cx + math.cos(a) * d * 1.5, cy + math.sin(a) * d * 0.7
        c = (SD4, SD3, SD2)[r2.randrange(3)]
        p.p(x, y, c)
        if r2.random() < 0.4:
            p.p(x + 1, y, SD2)


@builder('pharaoh')
def make_pharaoh():
    src = ph_src()
    base = [ph_small(ph_dress(f)) for f in src]
    dim = [ph_small(ph_dress(f, eyes=0.3)) for f in src]
    feet = max(np.nonzero(np.array(f)[:, :, 3].any(1))[0].max() for f in base)
    H_ = base[0].height
    W_ = base[0].width
    PAD = 30                                                    # room for the crook, magic and sand
    CW, CH = W_ + 2 * PAD, H_ + PAD

    def cell(im, dx=0, dy=0):
        c = Image.new('RGBA', (CW, CH))
        c.paste(im, (PAD + dx, PAD + dy), im)
        return c
    FEET = PAD + feet
    sc = PH_SC
    hand_l = (PAD + round(22 * sc), PAD + round(112 * sc))      # crook hand (viewer's left)
    hand_r = (PAD + round(90 * sc), PAD + round(108 * sc))
    head = (PAD + round(55 * sc), PAD + round(22 * sc))

    def with_crook(im, ang, dx=0, dy=0, front=True):
        p = Pic(CW, CH)
        if not front:
            crook(p, hand_l[0] + dx, hand_l[1] + dy, ang)
        p.paste(im, 0, 0)
        if front:
            crook(p, hand_l[0] + dx, hand_l[1] + dy, ang)
        return p.im
    UP = -math.pi / 2 - 0.12
    idle = [with_crook(cell(base[i]), UP + 0.03 * math.sin(i)) for i in range(5)]
    idle[3] = with_crook(cell(dim[3]), UP)                      # the eyes pulse
    # attack: raises the crook high, slams it down in front, a burst of sand rolls out
    att = []
    for k, (ang, sq, dy, burst) in enumerate(((UP - 0.25, 1.0, 0, 0), (UP - 0.6, 1.0, -2, 0), (UP - 0.9, 0.97, -3, 0),
                                               (-0.4, 0.95, 1, 1), (0.25, 0.93, 2, 2), (0.15, 0.96, 1, 3), (UP + 0.2, 1.0, 0, 0))):
        im = cell(squash(base[k % 5], sq, feet), 0, 0)
        im = with_crook(im, ang, 0, dy)
        if burst:
            p = Pic(CW, CH)
            p.paste(im, 0, 0)
            bx = hand_l[0] + 18
            sand_burst(p, bx, FEET, 10 + burst * 8, 30 + burst * 10, k, 1.0)
            for j in range(burst * 3):                         # a rolling dune wave along the floor
                x = bx + 6 + j * 3
                p.e(x - 3, FEET - 3 - (j % 3), x + 3, FEET, SD2 if j % 2 else SD3)
            im = p.im
        att.append(cut_below(im, FEET))
    # cast: the eyes blaze, a turquoise ankh grows above the head, sand swirls round
    cast = []
    for k in range(5):
        p = Pic(CW, CH)
        p.paste(with_crook(cell(base[k]), UP + 0.15), 0, 0)
        s_ = 2 + k
        ankh(p, head[0], head[1] - 6 - k, s_ if k < 4 else 6, TQ2 if k % 2 else (230, 255, 250), TQ1)
        for hx, hy in (hand_r,):
            p.e(hx - 2 - k // 2, hy - 2 - k // 2, hx + 2 + k // 2, hy + 2 + k // 2, TQ1)
            p.p(hx, hy, TQ2)
        r2 = random.Random(k)
        for i in range(10 + 4 * k):                            # swirling sand
            a = i / (10 + 4 * k) * math.tau + k * 0.6
            rr = 26 + 8 * math.sin(i * 1.3)
            p.p(PAD + W_ // 2 + math.cos(a) * rr * 1.5, FEET - 22 + math.sin(a) * rr * 0.45, SD3 if i % 2 else SD4)
        cast.append(p.im)
    i0 = idle[0]
    hurt = [tint(shift(i0, -4, 0), (255, 255, 255), 0.5), shift(with_crook(cell(dim[1]), UP - 0.3), -3, 0), shift(i0, -1, 0)]
    # death: staggers, the gold dulls, the body sinks and crumbles into a heap of sand, the mask is left on top
    dfr = [tint(with_crook(cell(base[0]), UP - 0.4), (255, 250, 220), 0.4), with_crook(cell(dim[2]), -0.6)]
    rng = np.random.default_rng(9)
    for k, (sq, keep_) in enumerate(((0.8, 0.85), (0.6, 0.6), (0.4, 0.35))):
        im = cell(squash(dim[0], sq, feet))
        a = np.array(im)
        m = a[:, :, 3] > 0
        drop = m & (rng.random(m.shape) > keep_)
        a[drop, :3] = SD3 if k < 2 else SD2
        im = Image.fromarray(a)
        p = Pic(CW, CH)
        hw = 16 + k * 8
        p.e(PAD + W_ // 2 - hw, FEET - 4 - k * 3, PAD + W_ // 2 + hw, FEET + 3, SD2)
        p.e(PAD + W_ // 2 - hw + 3, FEET - 4 - k * 3, PAD + W_ // 2 + hw - 5, FEET - 1, SD3)
        p.paste(im, 0, 0)
        sand_burst(p, PAD + W_ // 2, FEET - 30 + k * 8, 20, 20, 30 + k, 0.8)
        dfr.append(cut_below(p.im, FEET))
    # final heap with the golden mask lying on it
    mask_im = ph_small(ph_dress(src[0]).crop((36, 14, 76, 62)))
    p = Pic(CW, CH)
    cxh = PAD + W_ // 2
    p.e(cxh - 36, FEET - 12, cxh + 36, FEET + 4, SD1)
    p.e(cxh - 34, FEET - 12, cxh + 32, FEET + 1, SD2)
    p.e(cxh - 26, FEET - 11, cxh + 18, FEET - 4, SD3)
    for i in range(6):                                          # loose bandages in the sand
        x = cxh - 30 + i * 11
        p.l(x, FEET - 3 - (i % 2) * 2, x + 6, FEET - 2, BD2)
    mr = mask_im.rotate(-78, resample=Image.NEAREST, expand=True)      # the mask lies on its side in the sand
    p.paste(mr, cxh - mr.width // 2 + 4, FEET - 7 - mr.height + 4)
    p.e(cxh - 14, FEET - 6, cxh + 22, FEET + 1, SD2)
    dfr.append(cut_below(p.im, FEET))
    dfr.append(dfr[-1])
    allf = idle + att + cast + hurt + dfr
    bb = None
    for im in allf:
        b = im.getbbox()
        bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
    bb = (bb[0] - 1, bb[1] - 1, bb[2] + 1, FEET + 2)
    Wb, Hb = bb[2] - bb[0], bb[3] - bb[1]
    n_ = max(Wb, Hb)                                           # square frames, the feet on the bottom rows
    bb = (bb[0] - (n_ - Wb) // 2, bb[3] - n_, bb[0] - (n_ - Wb) // 2 + n_, bb[3])

    def save_b(name, frames):
        out = Image.new('RGBA', (n_ * len(frames), n_), (0, 0, 0, 0))
        for i, f in enumerate(frames):
            out.paste(hard(outline_same(f.crop(bb))), (i * n_, 0))
        save(out, G_OUT + f'boss_pharaoh_{name}.png', len(frames))
    save_b('idle', idle)
    save_b('attack', att)
    save_b('cast', cast)
    save_b('hurt', hurt)
    save_b('death', dfr)
    print('boss_pharaoh frame', (n_, n_), 'body height', feet + 1)


# ================================================================== TEXTURES (palettized like tools/biome-textures)
def finish(rgb, name, colors=48, half=True):
    """RGB array -> (x2 nearest when half-res) -> palettized, saved as RGB like the earlier biome textures."""
    im = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), 'RGB')
    if half:
        im = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
    save(im.quantize(colors, method=Image.Quantize.MEDIANCUT).convert('RGB'), W_OUT + name)


def up2(a):
    return np.repeat(np.repeat(a, 2, 0), 2, 1)


def pnoise(w, h, seed, octaves=((16, 1.0), (8, 0.5), (4, 0.25))):
    """Value noise that tiles in both directions (bicubic over a 3x3 tiled grid, middle cut out)."""
    rng = np.random.default_rng(seed)
    out = np.zeros((h, w))
    for cell, amp in octaves:
        gx, gy = max(1, w // cell), max(1, h // cell)
        g = np.tile(rng.random((gy, gx)), (3, 3))
        im = Image.fromarray((g * 255).astype(np.uint8)).resize((gx * 3 * cell, gy * 3 * cell), Image.BICUBIC)
        out += np.array(im, float)[gy * cell:gy * cell + h, gx * cell:gx * cell + w] / 255 * amp
    return out / sum(a for _, a in octaves)


SS_STOPS = [(0, SS0), (0.3, SS1), (0.6, SS2), (0.85, SS3), (1, SS4)]
SD_STOPS = [(0, SD0), (0.3, SD1), (0.6, SD2), (0.85, SD3), (1, SD4)]


def sandstone_base(w=32, h=64, seed=1):
    lum = tile_lum(K + 'wall_brick_sand_center.png', (w, h))
    grain = tile_lum(C64 + 'Ground/Materials/sand_02.png', (w, h), (1, 2))
    n = pnoise(w, h, seed)
    v = np.clip(lum * 0.75 + (grain - 0.5) * 0.25 + (n - 0.5) * 0.18 + 0.05, 0, 1)
    return v


def sand_drift(rgb, seed, h0=6):
    """Sand piled against the foot of a wall (half-res, wraps horizontally)."""
    h, w = rgb.shape[:2]
    xs = np.arange(w)
    top = h - h0 + np.round(2 * np.sin(xs / w * math.tau * 2 + seed) + np.sin(xs / w * math.tau * 3 + seed * 2)).astype(int)
    for x in range(w):
        for y in range(max(0, top[x]), h):
            t = (y - top[x]) / max(1, h - top[x])
            rgb[y, x] = SD3 if y == top[x] else SD2 if t < 0.5 else SD1
    return rgb


def tex_wall_sandstone():
    v = sandstone_base(seed=3)
    rgb = gmap(v, SS_STOPS)
    r2 = np.random.default_rng(4)
    pits = r2.random(v.shape) < 0.03                           # weathering pits
    rgb[pits] = SS1
    rgb[np.roll(pits, 1, 0) & ~pits] = blend(rgb, np.ones(v.shape, bool), SS4, 0.3)[np.roll(pits, 1, 0) & ~pits]
    cm = P4.crack_mask(32, 64, 21, n=2, steps=8, step=1.6, branch=0.15, spread=0.5)
    rgb[cm] = SS0
    rgb = sand_drift(rgb, 1.0, 5)
    finish(rgb, 'wall_sandstone.png')
    return v


# hieroglyphs: little polyline/shape drawings in a 10x12 box, carved into the stone
def glyph(d, k, x, y, s=1.0):
    L = lambda *pts: d.line([(x + a * s, y + b * s) for a, b in pts], fill=255, width=1)
    E = lambda a, b, c, e: d.ellipse((x + a * s, y + b * s, x + c * s, y + e * s), outline=255)
    if k == 0:   # ankh
        E(2, 0, 6, 4); L((0, 5), (8, 5)); L((4, 5), (4, 11))
    elif k == 1:  # eye of Horus
        E(1, 2, 8, 6); d.point((x + 4, y + 4), fill=255); L((1, 1), (8, 1)); L((3, 6), (2, 10)); L((6, 6), (8, 8), (9, 6))
    elif k == 2:  # ibis / bird
        E(2, 4, 7, 8); L((7, 4), (8, 1), (9, 1)); L((9, 1), (9, 4)); L((3, 8), (3, 11)); L((6, 8), (6, 11)); L((2, 6), (0, 9))
    elif k == 3:  # water (zigzag lines)
        L((0, 3), (2, 1), (4, 3), (6, 1), (8, 3), (9, 2)); L((0, 8), (2, 6), (4, 8), (6, 6), (8, 8), (9, 7))
    elif k == 4:  # reed leaf
        L((3, 11), (3, 3), (5, 0)); L((3, 4), (6, 2)); L((4, 11), (6, 11))
    elif k == 5:  # sun disc with rays
        E(2, 2, 7, 7); d.point((x + 4, y + 4), fill=255); L((0, 9), (9, 9)); L((4, 9), (4, 11))
    elif k == 6:  # cobra
        L((2, 11), (8, 11)); L((7, 11), (7, 6), (5, 4), (6, 1), (8, 2)); L((5, 4), (4, 6))
    elif k == 7:  # arm / hand
        L((0, 7), (6, 7), (8, 5)); L((0, 8), (6, 8)); L((8, 5), (9, 6))
    elif k == 8:  # scarab
        E(2, 3, 7, 10); L((4, 3), (4, 1)); L((5, 3), (5, 1)); L((1, 5), (2, 6)); L((8, 5), (7, 6)); L((4, 4), (4, 9))
    elif k == 9:  # seated figure
        E(1, 0, 4, 3); L((2, 3), (2, 8), (6, 8), (6, 11)); L((2, 5), (5, 4)); L((1, 11), (6, 11))


def carve(rgb, m, deep=SS0, lit=SS4, mid=None):
    """Recessed carving: the groove is dark, its lower/right rim catches light."""
    out = rgb.copy()
    if mid is not None:
        out[m] = mid
    else:
        out[m] = out[m] * 0.55 + np.array(deep) * 0.45
    sh = np.roll(m, 1, 0) & ~m
    out[sh] = out[sh] * 0.5 + np.array(lit) * 0.5
    sh2 = np.roll(m, -1, 1) & ~m & ~sh
    out[sh2] = out[sh2] * 0.75 + np.array(deep) * 0.25
    return out


def tex_wall_hieroglyph():
    v = sandstone_base(seed=5)
    rgb = up2(gmap(np.clip(v * 0.7 + 0.2, 0, 1), SS_STOPS))   # full res so the glyphs stay readable
    W, H = 64, 128
    r2 = random.Random(8)
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    rules = Image.new('L', (W, H), 0)
    dr = ImageDraw.Draw(rules)
    for cx0 in (3, 34):                                        # two columns of glyphs between carved rules
        dr.line((cx0 - 2, 4, cx0 - 2, 117), fill=255)
        for row in range(6):
            k_ = r2.randrange(10)
            glyph(d, k_, cx0 + 4 + r2.randint(0, 6), 8 + row * 18, 1.5)
    dr.line((62, 4, 62, 117), fill=255)
    dr.line((0, 3, 63, 3), fill=255)
    mk = np.array(m) > 0
    rl = np.array(rules) > 0
    # faded paint: some glyph cells keep traces of lapis and red ochre
    rr = np.random.default_rng(6)
    yy, xx = np.mgrid[0:H, 0:W]
    cellid = ((yy - 8) // 18) * 2 + (xx // 32)
    tint_ = {c: rr.choice([0, 0, 1, 2]) for c in np.unique(cellid)}
    tid = np.vectorize(tint_.get)(cellid)
    rgb = carve(rgb, mk | rl)
    col_l = mk & (tid == 1)
    col_r = mk & (tid == 2)
    rgb[col_l] = rgb[col_l] * 0.4 + np.array(LP1) * 0.6
    rgb[col_r] = rgb[col_r] * 0.45 + np.array((150, 52, 34)) * 0.55
    # wear: a few chipped spots across the carvings, sand at the foot
    chips = rr.random((H, W)) < 0.012
    rgb[chips] = SS1
    low = rgb[::2, ::2].copy()
    low = sand_drift(low, 2.0, 5)
    sand_rows = np.zeros((64, 32), bool)
    for x in range(32):
        col = low[:, x]
        sand_rows[:, x] = (np.abs(col - np.array(SD2)).sum(1) < 2) | (np.abs(col - np.array(SD1)).sum(1) < 2) | (np.abs(col - np.array(SD3)).sum(1) < 2)
    sm = up2(sand_rows)
    rgb[sm] = up2(low)[sm]
    finish(rgb, 'wall_hieroglyph.png', 56, half=False)


def ripples(w, h, seed, k=3, amp=0.5):
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    n = pnoise(w, h, seed, ((16, 1.0), (8, 0.4)))
    ph = (yy / h * k + xx / w * 1 + n * amp) * math.tau
    return np.sin(ph)


def tex_floor_sand():
    w = h = 32
    grain = tile_lum(C64 + 'Ground/Materials/sand_01.jpg', (w, h))
    rp = ripples(w, h, 11, 4, 0.6)
    v = np.clip(0.55 + (grain - 0.5) * 0.35 + rp * 0.16, 0, 1)
    rgb = gmap(v, SD_STOPS)
    crest = (rp > 0.85)
    rgb = blend(rgb, crest, SD4, 0.5)
    r2 = np.random.default_rng(12)
    rgb[r2.random((h, w)) < 0.025] = SD1                        # pebbles / dark grains
    finish(rgb, 'floor_sand.png', 32)


def tex_floor_gold_tiles():
    w = h = 32
    lum = tile_lum(K + 'floor_tiles_sand_large.png', (w, h))
    n = pnoise(w, h, 15)
    yy, xx = np.mgrid[0:h, 0:w]
    v = np.clip(lum * 0.6 + (n - 0.5) * 0.3 + 0.25, 0, 1)
    rgb = gmap(v, [(0, AU0), (0.35, AU1), (0.65, AU2), (0.9, AU3), (1, AU4)])
    seam = (xx % 16 == 0) | (yy % 16 == 0)
    rgb[seam] = LP0
    inlay = ((xx % 16 == 2) | (xx % 16 == 14) | (yy % 16 == 2) | (yy % 16 == 14)) & ~seam & \
        ((xx % 16 >= 2) & (xx % 16 <= 14) & (yy % 16 >= 2) & (yy % 16 <= 14))
    rgb[inlay] = LP1
    cxm, cym = xx % 16 - 8, yy % 16 - 8
    dia = (np.abs(cxm) + np.abs(cym) <= 2)
    rgb[dia] = TQ1
    rgb[(np.abs(cxm) + np.abs(cym) == 0)] = TQ2
    hl = np.roll(seam, 1, 0) & ~seam | np.roll(seam, 1, 1) & ~seam
    rgb = blend(rgb, hl, AU4, 0.4)
    wear = (n > 0.72) & ~seam
    rgb = blend(rgb, wear, AU0, 0.35)
    finish(rgb, 'floor_gold_tiles.png', 40)


def tex_floor_quicksand():
    w = h = 32
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    dx, dy = xx - 15.5, yy - 15.5
    r = np.hypot(dx, dy)
    ang = np.arctan2(dy, dx)
    n = pnoise(w, h, 21)
    fall = np.clip(1 - r / 16, 0, 1)
    swirl = np.sin(ang * 2 + r * 0.55 + n * 3) * fall
    base_n = pnoise(w, h, 22, ((8, 1.0), (4, 0.5)))
    v = np.clip(0.42 + swirl * 0.22 + (base_n - 0.5) * 0.3 - fall * 0.12, 0, 1)
    WET = [(0, (44, 30, 22)), (0.35, (78, 56, 36)), (0.65, (112, 82, 52)), (1, (150, 116, 74))]
    rgb = gmap(v, WET)
    glint = (swirl > 0.55) & (base_n > 0.45)
    rgb = blend(rgb, glint, (186, 158, 112), 0.6)
    centre = r < 2.5
    rgb = blend(rgb, centre, (30, 20, 16), 0.7)
    bub = np.zeros((h, w), bool)
    for (bx, by) in ((6, 24), (25, 7), (22, 25)):
        bub[by, bx] = True
    rgb[bub] = (170, 140, 96)
    rgb[np.roll(bub, 1, 0)] = (40, 28, 20)
    finish(rgb, 'floor_quicksand.png', 32)


def tex_boss_pharaoh():
    # wall: big sandstone blocks under a lapis-and-gold frieze, a gold cartouche with the eye of Horus
    w, h = 32, 64
    mortar, bid = P3.brick_mask(w, h, 16, 16, 5)
    grain = tile_lum(C64 + 'Ground/Materials/sand_02.png', (w, h), (1, 2))
    r2 = np.random.default_rng(31)
    tone = {b: r2.uniform(0.45, 0.75) for b in np.unique(bid)}
    v = np.clip(np.vectorize(tone.get)(bid) + (grain - 0.5) * 0.3, 0, 1)
    rgb = up2(gmap(v, SS_STOPS))
    m2 = up2(mortar)
    rgb[m2] = SS0
    yy, xx = np.mgrid[0:128, 0:64]
    # frieze at the top: lapis/gold stripes and a row of uraeus-like teeth
    fr = yy < 14
    rgb[fr] = np.where(((yy[fr] // 2) % 2 == 0)[:, None], np.array(LP1), np.array(AU2))
    teeth = (yy >= 14) & (yy < 18) & ((xx % 6) < (18 - yy) * 1.2) & ((xx % 6) > 0)
    rgb[teeth] = AU3
    rgb[(yy == 18)] = AU1
    # bottom band
    bt = yy >= 116
    rgb[bt] = np.where(((xx[bt] // 4) % 2 == 0)[:, None], np.array(LP0), np.array(AU1))
    rgb[yy == 115] = AU3
    # cartouche (gold oval with lapis rim) and eye of Horus inside
    cm_ = Image.new('L', (64, 128)); d = ImageDraw.Draw(cm_)
    d.rounded_rectangle((18, 36, 46, 100), 12, fill=255)
    ci = np.array(cm_) > 0
    rim = ci & ~(np.roll(ci, 2, 0) & np.roll(ci, -2, 0) & np.roll(ci, 2, 1) & np.roll(ci, -2, 1))
    rgb[ci] = gmap(np.clip(up2(grain)[ci] * 0.5 + 0.35, 0, 1), [(0, AU1), (0.6, AU2), (1, AU3)])
    rgb[rim] = LP1
    rgb[(yy == 101) & (xx >= 20) & (xx <= 44)] = LP0
    rgb[(yy >= 102) & (yy <= 104) & (xx >= 22) & (xx <= 42)] = AU2   # cartouche tie bar
    em = Image.new('L', (64, 128)); d = ImageDraw.Draw(em)
    d.ellipse((22, 56, 42, 68), outline=255, width=2)
    d.ellipse((29, 58, 35, 66), fill=255)
    d.line((21, 52, 43, 52), fill=255, width=2)
    d.line((27, 68, 25, 80), fill=255, width=2)
    d.line((36, 68, 40, 75, 43, 72), fill=255, width=2)
    eye = np.array(em) > 0
    rgb[eye] = LP0
    rgb[np.roll(eye, 1, 0) & ~eye & ci] = AU4
    # ankh under it
    am = Image.new('L', (64, 128)); d = ImageDraw.Draw(am)
    d.ellipse((28, 82, 36, 89), outline=255, width=2); d.line((25, 90, 39, 90), fill=255, width=2); d.line((32, 90, 32, 98), fill=255, width=2)
    an = np.array(am) > 0
    rgb[an] = TQ0
    rgb[np.roll(an, 1, 0) & ~an & ci] = TQ1
    finish(rgb, 'wall_boss_pharaoh.png', 56, half=False)

    # floor: lapis tiles in a gold grid, each with a golden sun disc
    w = h = 32
    lum = tile_lum(C64 + 'Ground/Materials/sand_02.png', (w, h))
    yy, xx = np.mgrid[0:h, 0:w]
    rgb = gmap(np.clip(lum * 0.4 + 0.3, 0, 1), [(0, LP0), (0.6, LP1), (1, LP2)])
    grid = (xx % 16 == 0) | (yy % 16 == 0)
    rgb[grid] = AU2
    rgb[(xx % 16 == 1) & ~grid] = rgb[(xx % 16 == 1) & ~grid] * 0.6
    cx_, cy_ = xx % 16 - 8, yy % 16 - 8
    rr = np.hypot(cx_, cy_)
    rgb[rr <= 3.2] = AU3
    rgb[(rr > 3.2) & (rr <= 4.2)] = AU1
    rays = (rr > 4.6) & (rr < 6.5) & ((np.round(np.degrees(np.arctan2(cy_, cx_))) % 45) < 12)
    rgb[rays] = AU2
    rgb[rr <= 1] = AU4
    finish(rgb, 'floor_boss_pharaoh.png', 32)


@builder('textures')
def make_textures():
    tex_wall_sandstone(); tex_wall_hieroglyph(); tex_floor_sand(); tex_floor_gold_tiles(); tex_floor_quicksand(); tex_boss_pharaoh()


# ================================================================== PROPS
strip = P2.strip


def save_prop(name, frames, path=None):
    return save(strip(frames), path or G_OUT + f'prop_{name}.png', len(frames))


def sarcophagus(open_):
    p = Pic(46, 30)
    bx0, bx1, top, front, base = 3, 40, 12, 18, 28        # box: top surface 12..18, front face 18..28
    # stone chest: front face with a carved lapis band
    p.r(bx0, front, bx1, base, SS2)
    p.r(bx0, front, bx1, front + 1, SS3)
    p.r(bx0, base - 1, bx1, base, SS1)
    p.r(bx0 + 2, front + 4, bx1 - 2, front + 6, LP1)
    for x in range(bx0 + 3, bx1 - 2, 4):
        p.p(x, front + 5, AU2)
    for x in (bx0 + 5, bx0 + 14, bx0 + 23, bx0 + 32):     # little carved glyph marks
        p.p(x, front + 8, SS0); p.p(x + 1, front + 8, SS0); p.p(x, front + 7, SS1)
    p.l(bx1, front, bx1, base, SS1)
    # top surface (foreshortened) of the chest
    p.poly([(bx0, front), (bx0 + 4, top), (bx1 + 3, top), (bx1, front)], SS3)
    if open_:
        p.poly([(bx0 + 3, front - 1), (bx0 + 6, top + 2), (bx1 + 1, top + 2), (bx1 - 2, front - 1)], (30, 20, 22))   # empty hollow
        p.l(bx0 + 4, front - 2, bx1 - 3, front - 2, (52, 36, 34))
        for i in range(4):                                  # loose linen scraps inside
            p.p(bx0 + 10 + i * 6, front - 2 - (i % 2), BD1)
        # the lid shoved aside, leaning on the far side
        lid = Pic(40, 12)
        lid_body(lid)
        lr = lid.im.rotate(14, resample=Image.NEAREST, expand=True)
        p.paste(lr, bx0 + 8, top - lr.height + 5)
    else:
        lid = Pic(40, 12)
        lid_body(lid)
        p.paste(lid.im, bx0 + 2, top - 6)
    return p.im


def lid_body(p):
    """Anthropoid lid seen from the side: gold body with lapis bands, nemes head at the right."""
    p.poly([(0, 9), (2, 6), (28, 5), (31, 3), (36, 2), (39, 5), (39, 10), (0, 11)], AU2)
    p.l(1, 6, 28, 5, AU3)
    for x in range(4, 28, 5):                               # lapis bands across the wrapped body
        p.l(x, 6, x, 10, LP1)
        p.l(x + 1, 6, x + 1, 10, LP2)
    p.r(28, 2, 36, 9, AU2)                                  # head: striped nemes and gold face
    for y in range(2, 10, 2):
        p.l(29, y, 33, y, LP1)
    p.r(34, 3, 37, 7, AU3)
    p.p(36, 4, LP0); p.p(37, 8, AU1); p.l(36, 8, 37, 10, AU1)   # eye, beard
    p.l(16, 7, 22, 9, AU4); p.l(16, 9, 22, 7, AU4)          # crossed arms (crook and flail)
    p.l(0, 11, 39, 11, AU0)


def boulder(ph, r=22):
    n = 2 * r + 2
    a = np.zeros((n, n, 4), np.uint8)
    yy, xx = np.mgrid[0:n, 0:n].astype(float)
    dx, dy = (xx - r) / r, (yy - r) / r
    d2 = dx * dx + dy * dy
    m = d2 <= 1.0
    nz = np.sqrt(np.clip(1 - d2, 0, 1))
    # rotate the surface point about the horizontal axis (rolling towards the viewer)
    c, s_ = math.cos(ph), math.sin(ph)
    ry = dy * c - nz * s_
    rz = dy * s_ + nz * c
    rx = dx
    tex = (np.sin(rx * 5.1 + ry * 2.3) + np.sin(ry * 6.7 - rz * 3.1) * 0.8 + np.sin(rz * 7.9 + rx * 4.4) * 0.6)
    crack = (np.abs(np.sin(rx * 3.3 + ry * 7.1 + rz * 1.7)) < 0.09) | (np.abs(np.sin(ry * 4.1 - rx * 2.2 + rz * 5.3)) < 0.07)
    band = np.abs(ry) < 0.12                                # carved groove round the ball
    light = np.clip(-dx * 0.55 - dy * 0.65 + nz * 0.6, 0, 1)
    v = np.clip(light * 0.8 + tex * 0.07 + 0.12, 0, 1)
    v = np.round(v * 5) / 5
    rgb = gmap(v, [(0, SS0), (0.25, SS1), (0.5, SS2), (0.75, SS3), (1, SS4)])
    rgb[crack & m] = rgb[crack & m] * 0.55
    rgb[band & m & (rz > 0)] = rgb[band & m & (rz > 0)] * 0.65
    a[m, :3] = rgb[m].astype(np.uint8)
    a[m, 3] = 255
    im = Image.fromarray(a)
    return outline(im)


def alarmbell(ring):
    p = Pic(30, 44)
    p.r(5, 4, 7, 42, W1)                                    # post
    p.l(5, 4, 5, 42, W2)
    p.r(3, 41, 10, 43, W0)
    p.r(5, 4, 22, 6, W1)                                    # arm
    p.l(5, 4, 22, 4, W2)
    p.l(8, 7, 11, 6, W1); p.l(8, 8, 8, 7, W1)               # brace
    bell = Pic(16, 18)
    bell.r(7, 0, 8, 2, I1)                                  # hanger
    bell.poly([(4, 4), (11, 4), (12, 9), (14, 13), (1, 13), (3, 9)], BZ1)
    bell.e(4, 2, 11, 7, BZ1)
    bell.l(5, 4, 4, 11, BZ2); bell.l(6, 3, 6, 6, (255, 230, 170))
    bell.r(1, 12, 14, 13, BZ0)
    bell.r(7, 14, 8, 15, I1)                                # clapper
    b = bell.im
    if ring:
        b = b.rotate(-18, resample=Image.NEAREST, center=(8, 1), expand=False)
    p.paste(b, 13, 6)
    if ring:                                                # sound lines
        for k, (x, y) in enumerate(((28, 12), (29, 17), (27, 22))):
            p.l(x - 2, y, x, y - 1 + k, (255, 236, 170))
        p.ps([(11, 13), (10, 17), (12, 21)], (255, 236, 170))
    return p.im


def goldheap():
    p = Pic(36, 20)
    r2 = random.Random(4)
    p.e(1, 6, 34, 26, AU1)
    p.e(4, 4, 30, 22, AU2)
    p.e(9, 3, 24, 14, AU3)
    for i in range(26):                                     # coins on the slope
        x = r2.uniform(3, 32)
        top = 19 - 14 * (1 - abs(x - 17) / 17)
        y = r2.uniform(top + 1, 18)
        p.e(x - 1.5, y - 1, x + 1.5, y + 1, AU3 if i % 3 else AU2)
        p.p(x - 0.5, y - 0.5, AU4)
        p.p(x + 1, y + 1, AU1)
    for (x, y, c) in ((11, 9, (200, 40, 50)), (23, 12, TQ1), (17, 6, LP2)):   # gems
        p.r(x, y, x + 1, y + 1, c); p.p(x, y, (255, 255, 255))
    p.p(16, 3, AU4); p.p(15, 4, AU4)
    return cut_below(p.im, 18)


@builder('props')
def make_props():
    save_prop('sarcophagus', [outline(sarcophagus(False)), outline(sarcophagus(True))])
    save_prop('boulder', [boulder(k * math.pi / 8) for k in range(4)])
    save_prop('alarmbell', [outline(alarmbell(False)), outline(alarmbell(True))])
    save_prop('goldheap', [outline(goldheap())])


# ================================================================== NPCs (32 px tall, 4 idle frames)
GAMB_MAP = {(146, 130, 48): (62, 44, 92), (95, 86, 37): (44, 30, 70), (55, 58, 32): (30, 20, 50), (37, 39, 22): (20, 14, 34),
            (147, 45, 139): (190, 150, 60), (95, 46, 92): (140, 104, 40), (51, 30, 50): (90, 64, 26),
            (12, 152, 214): (255, 230, 140), (28, 56, 69): (130, 100, 40), (20, 20, 18): OUT}
WAND_MAP = {(146, 130, 48): (120, 112, 104), (95, 86, 37): (88, 80, 76), (55, 58, 32): (62, 56, 56), (37, 39, 22): (40, 36, 38),
            (147, 45, 139): (150, 120, 80), (95, 46, 92): (110, 86, 58), (51, 30, 50): (70, 54, 38),
            (12, 152, 214): (190, 230, 255), (28, 56, 69): (70, 100, 120), (20, 20, 18): OUT}


def die(p, x, y, pips):
    p.r(x, y, x + 2, y + 2, (240, 236, 222))
    p.p(x + 2, y + 2, (180, 172, 160))
    for (a, b) in pips:
        p.p(x + a, y + b, (30, 20, 20))


def npc_gambler(k):
    idle = rogue_src('Idle', 32)
    f = recolor(idle[k], GAMB_MAP)
    p = Pic(46, 34)
    p.paste(f, 0, 2)
    # small table in front (to the right)
    p.r(24, 21, 43, 23, W2)
    p.l(24, 21, 43, 21, W3)
    p.r(26, 24, 27, 33, W1); p.r(40, 24, 41, 33, W1)
    p.r(24, 24, 43, 24, W0)
    # three cups / dice and a candle; the hand shakes the dice
    rolls = [((29, 18), (0, 0)), ((33, 17), (1, 1)), ((30, 17), (2, 0))]
    pips = [[(1, 1)], [(0, 0), (2, 2)], [(0, 0), (1, 1), (2, 2)], [(0, 0), (2, 0), (0, 2), (2, 2)]]
    for i, ((x, y), _) in enumerate(rolls[:2]):
        die(p, x + (k % 2) * (1 - 2 * i), y - (1 if (k + i) % 2 else 0), pips[(k + i * 2) % 4])
    p.r(37, 17, 39, 20, (90, 60, 40)); p.l(37, 17, 39, 17, (130, 90, 60))     # dice cup
    p.r(42, 16, 42, 20, (230, 220, 190)); p.p(42, 15, (255, 200, 80))        # candle
    if k % 2:
        p.p(42, 14, (255, 240, 160))
    # the hand reaching over the table
    hx = 22 + (k in (1, 2))
    p.l(17, 16, hx, 17, (62, 44, 92), 2)
    p.r(hx + 1, 16, hx + 2, 17, (240, 154, 83))
    p.p(p.w - 4, 21, AU2)                                   # a coin on the table
    return p.im


def npc_banker(k):
    f = recolor(body_src('Idle')[k], {EYE_G: (60, 36, 26), EYE_W1: (240, 230, 220)})
    b = f.getbbox()
    top, feet = b[1], b[3] - 1
    # plump: widen everything below the head
    body = f.crop((0, top + 13, 64, 64))
    body = body.resize((round(64 * 1.35), body.height), Image.NEAREST)
    g = Image.new('RGBA', (64, 64))
    g.paste(body, (32 - body.width // 2 + 1, top + 13), body)
    g.paste(f.crop((0, 0, 64, top + 14)), (0, 0), f.crop((0, 0, 64, top + 14)))
    a = mask_of(g)
    p = Pic(64, 64)
    p.paste(g, 0, 0)
    # robe over the widened body (deep green with gold trim), white shirt front
    for y in range(top + 14, feet - 1):
        xs = np.nonzero(a[y])[0]
        if len(xs):
            for x in range(xs.min() + 1, xs.max()):
                c = (34, 84, 60) if (x - xs.min()) > 2 else (24, 60, 44)
                if y in (top + 20, top + 21):
                    c = AU2                                 # belt
                p.p(x, y, c)
            p.p(xs.max() - 3, y, (220, 214, 200) if y < top + 20 else (34, 84, 60))
    for y in range(feet - 1, feet + 1):                     # shoes
        xs = np.nonzero(a[y])[0]
        for x in xs:
            p.p(x, y, (40, 30, 26))
    # hat (a tall red cap with a gold band) and moustache
    e = eye_of(body_src('Idle')[k])
    if e:
        ex, ey = e
        p.r(ex - 8, top - 3, ex + 1, top + 2, (150, 30, 34))
        p.l(ex - 8, top + 2, ex + 1, top + 2, AU2)
        p.l(ex - 7, top - 3, ex, top - 3, (190, 50, 50))
        p.l(ex - 1, ey + 3, ex + 2, ey + 3, (90, 56, 34))
    # gold chain on the belly
    p.ps([(30, top + 17), (31, top + 18), (33, top + 18), (34, top + 17)], AU3)
    # ledger: an open book held in front, a quill
    lx, ly = 37, top + 15
    p.r(lx, ly, lx + 7, ly + 5, (230, 222, 196))
    p.l(lx + 3, ly, lx + 3, ly + 5, (150, 120, 90))
    p.l(lx, ly + 5, lx + 7, ly + 5, (110, 40, 30))
    for j in range(2):
        p.l(lx + 1, ly + 1 + j * 2, lx + 2, ly + 1 + j * 2, (120, 110, 100))
        p.l(lx + 4 + (k % 2), ly + 1 + j * 2, lx + 6, ly + 1 + j * 2, (120, 110, 100))
    p.l(lx + 6, ly - 4 + (k == 2), lx + 5, ly + 1, (240, 240, 240))
    # coin chest beside him (left)
    cx_, cy_ = 13, feet - 7
    p.r(cx_, cy_, cx_ + 10, cy_ + 7, W2)
    p.r(cx_, cy_, cx_ + 10, cy_ + 1, W3)
    p.r(cx_ + 4, cy_ + 2, cx_ + 6, cy_ + 4, AU2)
    p.e(cx_ + 1, cy_ - 3, cx_ + 9, cy_ + 2, AU2)            # heap of coins in the open chest
    p.p(cx_ + 3, cy_ - 2, AU4); p.p(cx_ + 7, cy_ - 1, AU4)
    if k == 3:
        spark(p, cx_ + 5, cy_ - 4, AU4, 1)
    im = outline_same(p.im)
    bb = (8, top - 5, 52, feet + 2)
    return im.crop(bb)


def npc_wanderer(k):
    idle = rogue_src('Idle', 32)
    f = recolor(idle[k], WAND_MAP)
    p = Pic(36, 36)
    # staff (behind) with a carved top
    p.l(6, 6, 6, 35, W2); p.l(7, 6, 7, 35, W1)
    p.e(4, 3, 9, 7, W3); p.p(6, 4, W4)
    p.paste(f, 4, 4)
    # long cloak hem over the legs
    a = mask_of(p.im)
    for y in range(26, 33):
        xs = np.nonzero(a[y, 8:30])[0]
        if len(xs):
            for x in range(xs.min() + 8 - (y - 26) // 3, xs.max() + 9 + (y - 26) // 4):
                p.p(x, y, (88, 80, 76) if (x + y) % 5 else (62, 56, 56))
    # hand holding the lantern out in front
    sway = (0, 1, 0, -1)[k]
    p.r(24, 20, 25, 21, (240, 154, 83))
    lx, ly = 26 + sway, 22
    p.l(25, 20, lx + 1, ly, I2)
    p.r(lx - 1, ly + 1, lx + 3, ly + 1, I1)
    p.r(lx - 1, ly + 2, lx + 3, ly + 6, (255, 200, 90) if k % 2 == 0 else (255, 220, 120))
    p.l(lx - 1, ly + 2, lx - 1, ly + 6, I1); p.l(lx + 3, ly + 2, lx + 3, ly + 6, I1)
    p.p(lx + 1, ly + 4, (255, 250, 220))
    p.r(lx - 1, ly + 7, lx + 3, ly + 7, I1)
    im = outline_same(p.im)
    p = Pic(36, 36)
    p.paste(im, 0, 0)
    for (dx, dy) in ((5, 2), (6, 5), (-3, 4), (5, 8)):     # warm glow specks
        if (dx + k) % 2:
            p.p(lx + 1 + dx, ly + dy, (255, 210, 120))
    return p.im


@builder('npcs')
def make_npcs():
    save_prop('', [npc_gambler(k) for k in range(4)], G_OUT + 'npc_gambler.png')
    save_prop('', [npc_banker(k) for k in range(4)], G_OUT + 'npc_banker.png')
    save_prop('', [npc_wanderer(k) for k in range(4)], G_OUT + 'npc_wanderer.png')


# ================================================================== ITEMS, PARTICLES, HUD ICONS
@builder('items')
def make_items():
    # torn chronicle page (12x14)
    p = Pic(12, 14)
    p.poly([(0, 1), (3, 0), (6, 1), (9, 0), (11, 1), (11, 10), (10, 12), (8, 11), (6, 13), (4, 11), (2, 13), (0, 12)], PAPER1)
    p.l(0, 1, 0, 12, PAPER0); p.l(11, 1, 11, 10, PAPER0)
    for y in (3, 5, 7, 9):
        p.l(2, y, 9 - (y == 9) * 3, y, (110, 80, 54))
    p.p(2, 3, (150, 40, 30)); p.p(3, 3, (150, 40, 30))      # red initial
    p.p(9, 2, PAPER2); p.p(8, 6, PAPER2)
    save(hard(outline_same(p.im)), G_OUT + 'item_page.png')
    # lantern oil flask (10x14): cork, glass neck, round body with amber oil and a label
    p = Pic(10, 14)
    p.r(4, 0, 5, 1, (140, 100, 60))
    p.r(3, 2, 6, 4, (170, 200, 200))
    p.e(0, 4, 9, 13, (170, 200, 200))
    p.e(1, 7, 8, 13, (226, 150, 40))
    p.l(2, 8, 7, 8, (255, 210, 110))
    p.r(2, 9, 7, 11, PAPER1); p.l(3, 10, 6, 10, (150, 40, 30))
    p.p(2, 5, (240, 255, 255)); p.p(1, 7, (240, 255, 255))
    save(hard(outline_same(p.im)), G_OUT + 'item_battery.png')
    # small throwing stone (6x5)
    p = Pic(6, 5)
    p.e(0, 0, 5, 4, S2); p.e(0, 0, 3, 2, S3); p.p(1, 1, S4); p.p(4, 3, S1)
    save(hard(outline_same(p.im)), G_OUT + 'item_stone.png')


@builder('particles')
def make_particles():
    # thrown knife (10x3, side view, flying right)
    p = Pic(10, 3)
    p.r(0, 0, 2, 2, W1); p.p(1, 1, W2)
    p.l(3, 0, 3, 2, AU1)
    p.l(4, 1, 9, 1, M2); p.l(4, 0, 8, 0, M3); p.l(4, 2, 7, 2, M1)
    save(hard(p.im), G_OUT + 'part_knife.png')
    # flying bandage strip (2 frames 16x4)
    fr = []
    for k in range(2):
        p = Pic(16, 4)
        for x in range(16):
            y = 1.5 + math.sin(x * 0.7 + k * math.pi) * 1.2
            p.p(x, y, BD3 if (x // 2) % 2 else BD2)
            p.p(x, y + 1, BD1)
        fr.append(p.im)
    save(cells(fr, 16, 4), G_OUT + 'part_bandage.png', 2)
    # sand grains (2 frames 3x3)
    g1 = Pic(3, 3); g1.ps([(0, 1), (1, 0), (1, 1), (2, 2)], SD3); g1.p(1, 1, SD4)
    g2 = Pic(3, 3); g2.ps([(0, 0), (1, 1), (2, 1), (1, 2)], SD2); g2.p(1, 1, SD3)
    save(cells([g1.im, g2.im], 3, 3), G_OUT + 'part_sand.png', 2)
    # grey musket smoke (4 frames 16x16, normal blending): a dense puff that grows, greys and frays
    fr = []
    for k in range(4):
        p = Pic(16, 16)
        r2 = random.Random(70 + k)
        n = 4 + k
        shade = [(196, 194, 190), (168, 166, 164), (138, 136, 136), (112, 110, 112)][k]
        dark = tuple(max(0, c - 34) for c in shade)
        lite = tuple(min(255, c + 30) for c in shade)
        blobs = [(8 + r2.uniform(-1, 1) * (1 + k), 8 + r2.uniform(-1, 1) * (1 + k), 2.5 + k * 0.6 + r2.uniform(0, 1)) for _ in range(n)]
        for bx, by, br in blobs:
            p.e(bx - br, by - br, bx + br, by + br, dark)
        for bx, by, br in blobs:
            p.e(bx - br + 0.6, by - br + 0.3, bx + br - 0.6, by + br - 1, shade)
        for bx, by, br in blobs[:2]:
            p.e(bx - br * 0.6, by - br * 0.7, bx + br * 0.1, by, lite)
        im = p.im
        if k >= 2:                                           # fraying: knock out a dither of pixels
            a = np.array(im)
            yy, xx = np.mgrid[0:16, 0:16]
            hole = ((xx + yy * 2) % (5 if k == 2 else 3) == 0) & (np.hypot(xx - 8, yy - 8) > 3 + (3 - k))
            a[hole] = 0
            im = Image.fromarray(a)
        fr.append(im)
    save(cells(fr, 16, 16), G_OUT + 'part_smoke2.png', 4)
    # light shaft (additive on black): soft vertical beam, flat steps, brightest in the middle and the upper part
    yy, xx = np.mgrid[0:64, 0:16].astype(float)
    across = np.clip(1 - (np.abs(xx - 7.5) / 8) ** 2, 0, 1)
    along = np.clip(1 - yy / 80, 0, 1) ** 0.5 * np.clip(yy / 5, 0, 1)
    v = np.round(across * along * 6) / 6
    dust = np.zeros_like(v)
    r2 = np.random.default_rng(5)
    for _ in range(9):
        dust[r2.integers(4, 60), r2.integers(4, 12)] = 0.35
    save(from_arr(np.clip(v + dust * (v > 0), 0, 1)[..., None] * np.array((190, 168, 116))), G_OUT + 'part_beam.png', additive=True)
    # dust mote (2x2, additive)
    save(from_arr(np.array([[[200, 180, 130], [110, 96, 70]], [[110, 96, 70], [60, 52, 38]]], float)), G_OUT + 'part_dust_mote.png', additive=True)
    # HUD icons (8x8, white): eye (seen) and ear (heard)
    W_ = (255, 255, 255)
    eye = ["........", "...##...", ".##..##.", "#..##..#", "#..##..#", ".##..##.", "...##...", "........"]
    ear = [".####...", "#....#..", "#.##..#.", "#.#.#.#.", ".#..#.#.", "...#..#.", "..#..#..", "..###..."]
    for name, rows in (('icon_eye', eye), ('icon_ear', ear)):
        p = Pic(8, 8)
        p.bitmap(0, 0, rows, {'#': W_})
        save(p.im, G_OUT + name + '.png')


# ================================================================== TOUCH ICONS (96x96 white on transparent)
@builder('icons')
def make_icons():
    icon = P3.icon

    def lamp(d, k):     # hanging lantern with a flame
        S = lambda *v: [x * k for x in v]
        d.arc(S(34, 2, 62, 26), 180, 360, fill=255, width=5 * k)    # handle ring
        d.rectangle(S(28, 18, 68, 26), fill=255)                     # cap
        d.polygon(S(32, 26, 64, 26, 70, 76, 26, 76), fill=255)       # glass body
        d.polygon(S(38, 32, 58, 32, 62, 70, 34, 70), fill=0)
        d.polygon(S(48, 38, 56, 56, 48, 66, 40, 56), fill=255)       # flame
        d.rectangle(S(22, 76, 74, 86), fill=255)                     # base
        d.rectangle(S(46, 26, 50, 34), fill=255)
    save(icon(lamp), T_OUT + 'icon_lamp.png')

    def stone(d, k):    # a stone flying along a dashed arc
        S = lambda *v: [x * k for x in v]
        d.polygon(S(52, 50, 66, 40, 84, 44, 92, 60, 82, 76, 60, 78, 50, 66), fill=255)
        d.line(S(64, 52, 78, 50), fill=0, width=3 * k)
        for i in range(5):                                           # motion arc
            t0, t1 = 200 + i * 14, 208 + i * 14
            d.arc(S(6, 30, 86, 120), t0, t1, fill=255, width=6 * k)
    save(icon(stone), T_OUT + 'icon_stone.png')

    def sneak(d, k):    # crouching figure creeping forward on bent knees
        S = lambda *v: [x * k for x in v]
        d.ellipse(S(60, 22, 78, 40), fill=255)                       # head, low and forward
        d.line(S(62, 44, 34, 58), fill=255, width=16 * k)            # torso leaning forward
        d.ellipse(S(26, 50, 42, 66), fill=255)                       # hips
        d.line(S(58, 48, 74, 58, 82, 54), fill=255, width=7 * k)     # arm reaching forward
        d.line(S(34, 60, 18, 74, 30, 88), fill=255, width=9 * k)     # back leg, deeply bent
        d.line(S(38, 62, 58, 70, 58, 88), fill=255, width=9 * k)     # front leg
        d.line(S(26, 90, 36, 88), fill=255, width=6 * k)             # tiptoe feet
        d.line(S(56, 90, 66, 90), fill=255, width=6 * k)
        d.line(S(4, 34, 16, 34), fill=255, width=4 * k)              # "quiet" marks
        d.line(S(8, 44, 18, 44), fill=255, width=4 * k)
    save(icon(sneak), T_OUT + 'icon_sneak.png')


# ================================================================== CONTACT SHEET
NEW_WEAPONS = ('knives', 'hammer', 'musket')


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
    order = lambda kv: (0 if '/wall/' in kv[0] else 1 if 'enemies' in kv[0] or 'boss' in kv[0] else 3 if 'fp_' in kv[0] else 2, kv[0])
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
