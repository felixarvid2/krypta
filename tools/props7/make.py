#!/usr/bin/env python3
"""Version 9 graphics for Krypta ("Klocktornet och Molnborgen"): the clock tower and the cloud castle, six new enemies,
the clockmaker and the thunderbird, textures, props, items, particles, HUD and touch icons.

Run from the folder that holds retrofps/ and assets/ (e.g. /home/user/test):
    python3 retrofps/tools/props7/make.py [name ...]
(with names only those builders run, e.g. `python3 retrofps/tools/props7/make.py harpy sheet`; the contact sheet
always shows everything this script has written so far, plus the three new first-person weapons)

The first-person weapons sawlauncher / windgun / spear (fp_*.png, pick_*.png, js/weapons.js) come from
tools/weapon-frames (render-static.mjs + pack.py, see the README there).

Out to retrofps/assets/gfx:
  enemies-{clocksoldier,timekeeper,harpy,stormcaller,cloudgiant}_{idle,movement,attack,take_damage,death}.png (64x64)
  enemies-clocksoldier_rewind.png (the soldier winds itself up and stands again)
  enemies-gearspider_{...}.png (32x32 cells)
  boss_clockmaker_{idle,attack,cast,hurt,death}.png, boss_thunderbird_{idle,attack,cast,hurt,death,dive}.png (square)
  prop_{clockwork,lightningrod,chimes,cloudchest,sawblade,timebubble,windgust}.png
  item_{gear,feather}.png, part_{gear,spark2,feather,wind,lightning2,cloud}.png, icon_{wind,time}.png (8x8)
Out to retrofps/assets/wall:
  wall_brass, wall_gear, wall_gear2, wall_cloudstone, wall_stormwall, wall_boss_clockmaker, wall_boss_thunderbird (64x128)
  floor_brass, floor_cloud, floor_sawtrack, floor_void, floor_wind, floor_boss_clockmaker, floor_boss_thunderbird (64x64)
Out to retrofps/assets/touch: icon_spear.png (96x96, white on transparent)
Contact sheet: <scratchpad>/en/v9_sheet.png

Sources (licences checked; everything not listed is drawn procedurally below in the outlined style of
tools/props2-props6, whose helpers are reused):
  * Pixel Crawler Free Pack 2.11 (Anokolisa; free for commercial use, edits allowed, no resale of the assets):
      Characters/Body_A Idle/Walk/Pierce/Hit/Death -> clocksoldier (brass body, shako helmet, wind-up key, bayonet lance
                                                     drawn; the death played backwards is the rewind)
      Characters/Body_A Idle/Walk/Crush/Hit/Death  -> stormcaller (hooded grey-blue robe, beard, thunder staff and the
                                                     lightning drawn)
  * Kenney retro-textures-fantasy (CC0): wall_brick_stone_center, floor_wood_planks -> block layout and grain of the
      storm walls, the gear wall's back plate and the clockmaker's panelling / parquet
  * Classic 64 Asset Pack 0.6 (Craig Snedeker, CC0): Metal/metal_grunge_01, Metal/metal_diamondplate_01 -> brass grain;
      Ground/ice_05, ice_07, ice_09 (cracked ice) -> the veins of the cloud marble
  (32rogues, Super Retro World and Mana Seed are NOT used: their licences forbid AI use / redistribution.)
Drawn: timekeeper, gearspider, harpy, cloudgiant, the clockmaker, the thunderbird, all props, items, particles and icons.
Additive particles (stored opaque on black, like part_ember): part_lightning2 (part_lightning of version 6 already
exists with four frames and is left alone).
Notes: floor_sawtrack has a cross-shaped groove so it fits saws running along x or y; floor_wind's chevrons point +x.
The timekeeper is drawn (not the Gothicvania death sprite) so it cannot be mistaken for the merchant, who uses that sprite.
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
sys.dont_write_bytecode = True          # the helper modules of props2-props6 are loaded without touching their __pycache__


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
from_p2 = 'OUT Pic outline outline_same hard shift gmap tile_lum blend mask_draw glow from_arr'.split()
globals().update({k: getattr(P2, k) for k in from_p2})
strip_tool, cut_below = P3.strip_tool, P4.cut_below
mask_of, ground, pnoise, up2, tool_axis, front_hand = P5.mask_of, P5.ground, P5.pnoise, P5.up2, P5.tool_axis, P5.front_hand
dark, flash, dress, body_src, cell_of = P6.dark, P6.flash, P6.dress, P6.body_src, P6.cell_of
S0, S1, S3 = P2.S0, P2.S1, P2.S3
W0, W1, W2, W3, W4 = P2.W0, P2.W1, P2.W2, P2.W3, P2.W4
I0, I1, I2, I3 = P2.I0, P2.I1, P2.I2, P2.I3
M0, M1, M2, M3 = P2.M0, P2.M1, P2.M2, P2.M3
AU1, AU2, AU3, AU4 = P5.AU1, P5.AU2, P5.AU3, P5.AU4

A = 'assets/'
K = A + 'textures/retro-textures-fantasy/PNG/'
C64 = A + 'textures/Classic 64 Asset Pack 0.6/- Classic 64 Asset Pack 0.6/'
G_OUT, W_OUT, T_OUT = 'retrofps/assets/gfx/', 'retrofps/assets/wall/', 'retrofps/assets/touch/'
SCR = '/tmp/claude-0/-home-user/80ee56ba-2fa6-5354-b261-a4ca4fdcb508/scratchpad/en/'
SHEET, MANIFEST = SCR + 'v9_sheet.png', SCR + 'v9_manifest.json'
WHITE = (255, 255, 255)

# ---------------------------------------------------------------- clock-tower palette
BR0, BR1, BR2, BR3, BR4 = (60, 36, 18), (112, 70, 28), (170, 116, 44), (222, 174, 78), (255, 230, 150)   # brass
CU0, CU1, CU2, CU3 = (84, 36, 26), (142, 68, 40), (196, 112, 64), (236, 164, 110)                     # copper
VG0, VG1, VG2 = (40, 92, 80), (72, 140, 120), (130, 196, 168)                                          # verdigris
DI0, DI1, DI2, DI3 = (22, 20, 26), (38, 34, 42), (60, 56, 66), (92, 88, 100)                           # dark iron
GL0, GL1, GL2, GL3 = (130, 50, 16), (220, 110, 30), (255, 180, 70), (255, 236, 170)                    # furnace glow
TC0, TC1, TC2, TC3 = (40, 140, 160), (90, 210, 220), (170, 245, 245), (236, 255, 255)                  # time cyan
DIAL0, DIAL1 = (214, 204, 176), (246, 240, 220)                                                         # clock face
# ---------------------------------------------------------------- cloud-castle palette
CL0, CL1, CL2, CL3 = (118, 134, 172), (168, 184, 214), (214, 224, 242), (248, 251, 255)                # cloud
MB0, MB1, MB2, MB3 = (150, 162, 190), (196, 206, 226), (226, 232, 244), (250, 252, 255)                # marble
SK0, SK1, SK2, SK3 = (10, 14, 40), (22, 34, 78), (44, 70, 132), (96, 136, 200)                         # sky
ST0, ST1, ST2, ST3, ST4 = (22, 24, 40), (40, 44, 70), (64, 72, 106), (96, 106, 144), (140, 150, 186)    # storm slate
LT0, LT1, LT2, LT3 = (60, 100, 230), (130, 190, 255), (210, 240, 255), (255, 255, 255)                  # lightning
LY0, LY1, LY2 = (200, 150, 30), (255, 220, 80), (255, 248, 190)                                         # yellow bolt

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


BUILDERS = {}


def builder(name):
    def deco(fn):
        BUILDERS[name] = fn
        return fn
    return deco


# ================================================================== shared drawing helpers
def gear(p, cx, cy, r, n, ph=0.0, pal=(BR1, BR2, BR3, BR4), hole=OUT, spokes=4, tooth=None, hub=True):
    """A gear seen face-on: n teeth around radius r, rotated by ph; spokes cut out of the disc (0 = solid)."""
    c0, c1, c2, c3 = pal
    t = tooth if tooth is not None else max(1.5, r * 0.22)
    pts = []
    for i in range(n * 4):
        a = ph + i / (n * 4) * math.tau
        rr = r + t if (i % 4) in (1, 2) else r
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    p.poly(pts, c0)
    p.e(cx - r + 0.5, cy - r + 0.5, cx + r - 0.5, cy + r - 0.5, c1)
    p.e(cx - r + 0.5, cy - r + 0.5, cx + r * 0.55, cy + r * 0.55, c2)          # lit upper-left half of the face
    p.arc(cx - r + 0.5, cy - r + 0.5, cx + r - 0.5, cy + r - 0.5, 190, 260, c3)
    if spokes and r >= 5:
        ri, ro = r * 0.36, r * 0.72
        for k in range(spokes):
            a0 = ph * 1.0 + (k + 0.5) / spokes * math.tau
            w = math.pi / spokes * 0.55
            hp = [(cx + math.cos(a0 - w) * ri, cy + math.sin(a0 - w) * ri), (cx + math.cos(a0 - w) * ro, cy + math.sin(a0 - w) * ro),
                  (cx + math.cos(a0 + w) * ro, cy + math.sin(a0 + w) * ro), (cx + math.cos(a0 + w) * ri, cy + math.sin(a0 + w) * ri)]
            p.poly(hp, hole)
    if hub:
        hr = max(1, r * 0.26)
        p.e(cx - hr, cy - hr, cx + hr, cy + hr, c0)
        p.e(cx - hr + 0.5, cy - hr + 0.5, cx + hr - 1, cy + hr - 1, c3 if r >= 4 else c2)
        p.p(cx, cy, c0)


def bolt(p, x0, y0, x1, y1, seed, w=1, pal=(LT0, LT1, LT3), jag=3.0, branches=1):
    """A jagged lightning bolt from (x0, y0) to (x1, y1): a dark-blue rim, light body and a white core."""
    r2 = random.Random(seed)
    n = max(3, int(math.hypot(x1 - x0, y1 - y0) / 4))
    pts = [(x0, y0)]
    for i in range(1, n):
        t = i / n
        nx, ny = -(y1 - y0), (x1 - x0)
        ln = math.hypot(nx, ny) or 1
        o = r2.uniform(-jag, jag)
        pts.append((x0 + (x1 - x0) * t + nx / ln * o, y0 + (y1 - y0) * t + ny / ln * o))
    pts.append((x1, y1))
    br = []
    for _ in range(branches):
        i = r2.randrange(1, n)
        bx, by = pts[i]
        a = math.atan2(y1 - y0, x1 - x0) + r2.choice((-0.8, 0.8))
        ln = math.hypot(x1 - x0, y1 - y0) * r2.uniform(0.2, 0.35)
        br.append([(bx, by), (bx + math.cos(a) * ln * 0.5 + r2.uniform(-2, 2), by + math.sin(a) * ln * 0.5),
                   (bx + math.cos(a) * ln, by + math.sin(a) * ln)])
    for b in br:
        p.lines(b, pal[0], w + 1)
    p.lines(pts, pal[0], w + 2)
    for b in br:
        p.lines(b, pal[1], w)
    p.lines(pts, pal[1], w + 1 if w > 1 else w)
    p.lines(pts, pal[2], max(1, w - 1) if w > 1 else 1)
    return pts


def puff(p, x, y, r, pal=(CL0, CL1, CL2, CL3)):
    """One cloud puff: rim, body, light top-left."""
    p.e(x - r, y - r, x + r, y + r, pal[0])
    p.e(x - r + 1, y - r + 0.5, x + r - 0.5, y + r - 1.5, pal[1])
    p.e(x - r + 1, y - r + 0.5, x + r * 0.45, y + r * 0.2, pal[2])
    if r >= 3:
        p.e(x - r * 0.65, y - r * 0.75, x - r * 0.05, y - r * 0.25, pal[3])


def cloud(p, x, y, w, h, seed, pal=(CL0, CL1, CL2, CL3)):
    """A cluster of puffs filling an ellipse w x h around (x, y), flat-ish bottom."""
    r2 = random.Random(seed)
    blobs = []
    for i in range(max(3, int(w * h / 40))):
        a = r2.uniform(0, math.tau)
        d = r2.uniform(0, 1) ** 0.6
        bx, by = x + math.cos(a) * d * w / 2, y + min(0.2, math.sin(a)) * d * h / 2
        rr = r2.uniform(0.32, 0.5) * min(w, h * 1.4)
        blobs.append((by, bx, rr))
    blobs.sort()
    for by, bx, rr in blobs:
        p.e(bx - rr, by - rr, bx + rr, by + rr, pal[0])
    for by, bx, rr in blobs:
        p.e(bx - rr + 1, by - rr + 0.5, bx + rr - 0.5, by + rr - 1.5, pal[1])
    for by, bx, rr in blobs:
        p.e(bx - rr + 1, by - rr + 0.5, bx + rr * 0.4, by + rr * 0.1, pal[2])
    for by, bx, rr in blobs[:len(blobs) // 2]:
        if rr >= 3:
            p.e(bx - rr * 0.6, by - rr * 0.75, bx - rr * 0.1, by - rr * 0.3, pal[3])


def hourglass(p, x, y, h=8, sand=0.5, frame=BR2, frame2=BR3, glass=(196, 230, 240), sandc=AU3):
    """A small hourglass standing on (x, y) (bottom centre), h px tall; sand = share of sand in the top bulb."""
    w = max(2, h // 3)
    top, mid = y - h, y - h // 2
    p.l(x - w - 1, top, x + w + 1, top, frame); p.l(x - w - 1, y, x + w + 1, y, frame)
    for yy in range(top + 1, y):
        t = abs(yy - mid) / max(1, (h // 2))
        half = max(0, round(w * t))
        p.l(x - half, yy, x + half, yy, glass)
        if yy < mid and (mid - yy) <= (h // 2 - 1) * sand:
            p.l(x - max(0, half - 1), yy, x + max(0, half - 1), yy, sandc)
        if yy > mid and (yy - mid) >= (h // 2) * (1 - (1 - sand) * 0.9):
            p.l(x - max(0, half - 1), yy, x + max(0, half - 1), yy, sandc)
    if 0.05 < sand < 0.95:
        p.l(x, mid, x, y - 2, sandc)
    p.l(x - w - 1, top, x - w - 1, y, frame2); p.l(x + w + 1, top, x + w + 1, y, frame)


def clockface(p, cx, cy, r, t=0.0, rim=BR2, rim2=BR3, face=DIAL1, face2=DIAL0, hands=OUT, glow=False):
    """A round clock face with 12 tick marks and two hands (t = 0..1 turns of the minute hand)."""
    p.e(cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1, BR0)
    p.e(cx - r, cy - r, cx + r, cy + r, rim)
    p.arc(cx - r, cy - r, cx + r, cy + r, 180, 270, rim2)
    ri = r - max(1, r // 5)
    p.e(cx - ri, cy - ri, cx + ri, cy + ri, face)
    p.arc(cx - ri, cy - ri, cx + ri, cy + ri, 20, 160, face2)
    if r >= 5:
        for k in range(12):
            a = k / 12 * math.tau
            rr = ri - 1
            p.p(cx + math.cos(a) * rr, cy + math.sin(a) * rr, hands if k % 3 else BR1)
    am = -math.pi / 2 + t * math.tau
    ah = -math.pi / 2 + t * math.tau / 12 + 2.1
    p.l(cx, cy, cx + math.cos(ah) * ri * 0.5, cy + math.sin(ah) * ri * 0.5, hands)
    p.l(cx, cy, cx + math.cos(am) * ri * 0.8, cy + math.sin(am) * ri * 0.8, (150, 30, 30) if glow else hands)
    p.p(cx, cy, BR3)


def feather(p, x, y, ang, ln, wd, pal, rachis=None):
    """One feather from its quill at (x, y) along ang: vane (rim, body, light half) and a light shaft."""
    u = (math.cos(ang), math.sin(ang))
    v = (-u[1], u[0])
    P_ = lambda a_, b_: (x + u[0] * a_ + v[0] * b_, y + u[1] * a_ + v[1] * b_)
    p.poly([P_(0, 0), P_(ln * 0.3, -wd), P_(ln * 0.85, -wd * 0.8), P_(ln, 0), P_(ln * 0.85, wd * 0.8), P_(ln * 0.3, wd)], pal[0])
    p.poly([P_(1, 0), P_(ln * 0.3, -wd + 0.8), P_(ln * 0.82, -wd * 0.8 + 0.6), P_(ln - 1, 0), P_(ln * 0.8, wd * 0.6), P_(ln * 0.3, wd - 0.8)], pal[1])
    p.poly([P_(1, 0), P_(ln * 0.3, -wd + 0.8), P_(ln * 0.82, -wd * 0.8 + 0.6), P_(ln - 1, 0)], pal[2])
    p.l(*P_(1, 0), *P_(ln - 1.5, 0), rachis or pal[3])


# ================================================================== TEXTURES (palettized like props5/props6)
def finish(rgb, name, colors=48, half=True):
    im = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), 'RGB')
    if half:
        im = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
    save(im.quantize(colors, method=Image.Quantize.MEDIANCUT).convert('RGB'), W_OUT + name)


BR_STOPS = [(0, BR0), (0.3, BR1), (0.62, BR2), (0.88, BR3), (1, BR4)]
MB_STOPS = [(0, MB0), (0.35, MB1), (0.7, MB2), (1, MB3)]
ST_STOPS = [(0, ST0), (0.3, ST1), (0.6, ST2), (0.85, ST3), (1, ST4)]


def wrap_d(xx, yy, cx, cy, w, h):
    dx = (xx - cx + w / 2) % w - w / 2
    dy = (yy - cy + h / 2) % h - h / 2
    return dx, dy


def rivets(rgb, pts, hi=BR4, lo=BR0):
    h, w = rgb.shape[:2]
    for (x, y) in pts:
        rgb[y % h, x % w] = hi
        rgb[(y + 1) % h, x % w] = lo
        rgb[y % h, (x + 1) % w] = lo


def wrap_outline(m):
    """Pixels next to mask m (4-neighbourhood, wrapping)."""
    nb = np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)
    return nb & ~m


def tex_wall_brass():
    w, h = 32, 64
    grain = tile_lum(C64 + 'Metal/Materials/metal_grunge_01.jpg', (w, h), (1, 2))
    n = pnoise(w, h, 201, ((16, 1.0), (8, 0.5)))
    yy, xx = np.mgrid[0:h, 0:w]
    seams_y = (0, 22, 44)
    row = np.searchsorted(np.array(seams_y), yy, side='right') - 1
    off = np.where(row % 2 == 1, 8, 0)
    plate = (row * 10 + ((xx + off) // 16) % 2)
    tone = {b: v for b, v in zip(range(40), np.random.default_rng(202).uniform(0.48, 0.7, 40))}
    v = np.vectorize(tone.get)(plate) + (grain - 0.5) * 0.25 + (n - 0.5) * 0.2
    yrel = yy - np.array(seams_y)[row]
    v = v + np.where(yrel < 3, 0.08, 0) - np.clip((yrel - 14) / 30, 0, 0.12)    # each plate lit at the top, darker below
    rgb = gmap(np.clip(v, 0, 1), BR_STOPS)
    seam = np.isin(yy, seams_y) | (((xx + off) % 16) == 0)
    rgb[seam] = BR0
    rgb = blend(rgb, np.roll(seam, 1, 0) & ~seam, BR3, 0.55)
    rgb = blend(rgb, np.roll(seam, 1, 1) & ~seam & ~np.isin(yy, seams_y), BR3, 0.35)
    pts = []
    for r_, y0 in enumerate(seams_y):
        o = 8 if r_ % 2 else 0
        for x in range(2 + o, 2 + o + 32, 4):
            pts.append((x % w, y0 + 2)); pts.append((x % w, y0 + (22 if y0 < 44 else 20) - 2 - (1 if y0 == 0 else 0)))
    rivets(rgb, pts)
    # verdigris weeping down from some of the rivets
    rr = random.Random(203)
    for (x, y) in rr.sample(pts, 9):
        ln = rr.randint(3, 9)
        for j in range(1, ln):
            yy_, xx_ = (y + 1 + j) % h, (x + (j // 5)) % w
            if not seam[yy_, xx_]:
                rgb[yy_, xx_] = blend(rgb[yy_, xx_][None, None], np.ones((1, 1), bool), VG1 if j < ln - 2 else VG0, 0.6)[0, 0]
        rgb[(y + 1) % h, x] = VG2
    # decorative band with a gear-tooth edge at the bottom of the wall
    band = (yy >= 56) & (yy <= 59)
    rgb[band] = BR2
    rgb[yy == 56] = BR4
    rgb[yy == 59] = BR0
    rgb[(yy == 55) & (xx % 4 < 2)] = BR3
    rgb[(yy == 54) & (xx % 4 < 2)] = BR0
    rgb[(yy > 59)] = gmap(np.clip(v[(yy > 59)] * 0.6, 0, 1), BR_STOPS)
    finish(rgb, 'wall_brass.png')


GEAR_SPECS = [  # x, y, radius, teeth, direction, palette   (64 x 128, full res, wrapping)
    (18, 26, 15, 14, 1, 'brass'), (45, 50, 10, 10, -1, 'copper'), (58, 22, 7, 7, -1, 'iron'),
    (24, 72, 13, 12, -1, 'copper'), (50, 92, 11, 10, 1, 'brass'), (14, 108, 9, 9, 1, 'iron'), (40, 118, 6, 6, -1, 'brass')]
GEAR_PAL = {'brass': (BR1, BR2, BR3, BR4), 'copper': (CU0, CU1, CU2, CU3), 'iron': (DI2, (110, 104, 116), (150, 144, 156), (196, 192, 204))}


def tex_wall_gear():
    w, h = 64, 128
    yy, xx = np.mgrid[0:h, 0:w]
    base = up2(np.clip(tile_lum(K + 'wall_brick_stone_center.png', (32, 64), (1, 2)) * 0.3 + pnoise(32, 64, 211) * 0.4, 0, 1))
    for f in range(2):
        rgb = gmap(base * 0.7, [(0, DI0), (0.5, DI1), (1, DI2)])
        # furnace light behind the machinery: a warm glow in pools
        gl = pnoise(w, h, 212, ((32, 1.0), (16, 0.5)))
        flick = 0.04 if f else 0.0
        rgb = blend(rgb, gl > 0.56 - flick, GL0, 0.45)
        rgb = blend(rgb, gl > 0.66 - flick, GL1, 0.5)
        rgb = blend(rgb, gl > 0.74 - flick, GL2, 0.5)
        rgb[(yy % 32 == 30) | (yy % 32 == 31)] = DI2                                   # iron cross beams behind the gears
        rgb[yy % 32 == 30] = DI3
        p = Pic(w, h)
        for (x, y, r, n, d, pal) in GEAR_SPECS:
            ph = d * f * math.pi / n + x * 0.1
            for ox in (-w, 0, w):
                for oy in (-h, 0, h):
                    if -r - 4 < x + ox < w + r + 4 and -r - 4 < y + oy < h + r + 4:
                        gear(p, x + ox, y + oy, r, n, ph, GEAR_PAL[pal], hole=(0, 0, 0, 0), spokes=5 if r > 9 else 4)
        a = np.array(p.im)
        m = a[:, :, 3] > 0
        rgb[m] = a[m, :3]
        rgb[wrap_outline(m)] = OUT
        sh = np.roll(np.roll(m, 2, 0), 1, 1) & ~m & ~wrap_outline(m)                         # cast shadow on the back plate
        rgb = blend(rgb, sh, DI0, 0.7)
        # axle bolts glowing at the gear hubs
        for (x, y, r, n, d, pal) in GEAR_SPECS:
            rgb[y % h, x % w] = GL3 if f else GL2
        finish(rgb, 'wall_gear.png' if f == 0 else 'wall_gear2.png', 56, half=False)


def marble(w, h, seed, src='Ground/Materials/ice_05.jpg', k=0.35):
    """Pale marble grain: soft noise plus thin dark veins (from a cracked-ice photo) that wrap."""
    lum = tile_lum(C64 + src, (w, h), (1, max(1, h // w)))
    n = pnoise(w, h, seed, ((16, 1.0), (8, 0.5), (4, 0.25)))
    yy, xx = np.mgrid[0:h, 0:w]
    vein = np.abs(np.sin((xx / w * 2 + yy / h * 1) * math.tau + n * 9)) < 0.07
    return np.clip(0.55 + (n - 0.5) * 0.5 + (lum - 0.5) * k, 0, 1), vein, lum < 0.18


def tex_wall_cloudstone():
    w, h = 32, 64
    mortar, bid = P3.brick_mask(w, h, 16, 16, 21)
    v, vein, crack = marble(w, h, 221)
    r2 = np.random.default_rng(222)
    tone = {b: r2.uniform(-0.12, 0.08) for b in np.unique(bid)}
    v = np.clip(v + np.vectorize(tone.get)(bid), 0, 1)
    yy, xx = np.mgrid[0:h, 0:w]
    rgb = gmap(v, MB_STOPS)
    rgb = blend(rgb, vein & ~mortar, CL0, 0.6)
    rgb = blend(rgb, crack & ~mortar, CL0, 0.35)
    rgb[mortar] = CL0
    rgb = blend(rgb, np.roll(mortar, 1, 0) & ~mortar, MB3, 0.7)                 # bevelled block edges
    rgb = blend(rgb, np.roll(mortar, -1, 0) & ~mortar, MB0, 0.5)
    # gold string course and cloud wisps clinging to the foot of the wall
    rgb[(yy == 32)] = AU2
    rgb[(yy == 33)] = AU1
    rgb[(yy == 31)] = AU3
    p = Pic(w, h)
    for ox in (-w, 0, w):
        for (x, y, r) in ((4, 61, 4), (11, 62, 3), (20, 60, 5), (28, 62, 3)):
            puff(p, x + ox, y, r)
    a = np.array(p.im); m = a[:, :, 3] > 0
    rgb[m] = a[m, :3]
    finish(rgb, 'wall_cloudstone.png', 40)


def tex_wall_stormwall():
    w, h = 32, 64
    mortar, bid = P3.brick_mask(w, h, 10, 16, 31)
    grain = tile_lum(K + 'wall_brick_stone_center.png', (w, h), (1, 2))
    r2 = np.random.default_rng(232)
    tone = {b: r2.uniform(0.35, 0.62) for b in np.unique(bid)}
    yy, xx = np.mgrid[0:h, 0:w]
    v = np.clip(np.vectorize(tone.get)(bid) + (grain - 0.5) * 0.3, 0, 1)
    rgb = gmap(v, ST_STOPS)
    rgb[mortar] = ST0
    rgb = blend(rgb, np.roll(mortar, 1, 0) & ~mortar, ST4, 0.35)
    # rain streaks running down the stone
    rr = random.Random(233)
    for _ in range(14):
        x, y0, ln = rr.randrange(w), rr.randrange(h), rr.randint(4, 12)
        for j in range(ln):
            rgb[(y0 + j) % h, x] = blend(rgb[(y0 + j) % h, x][None, None], np.ones((1, 1), bool), ST4, 0.35)[0, 0]
    # a glowing lightning crack zig-zagging down the wall
    def fn(d, ox, oy):
        pts = [(9, -2), (13, 8), (8, 16), (15, 27), (11, 34), (19, 45), (15, 52), (21, 66)]
        d.line([(x + ox, y + oy) for x, y in pts], fill=255, width=1)
        d.line([(15 + ox, 27 + oy), (24 + ox, 31 + oy), (27 + ox, 38 + oy)], fill=255, width=1)
    m = mask_draw(w, h, fn) > 0.3
    g = glow(m.astype(float), 1.6)
    rgb = blend(rgb, (g > 0.08) & ~m, LT0, 0.4)
    rgb = blend(rgb, (g > 0.2) & ~m, LT1, 0.35)
    rgb[m] = LT2
    # iron storm bands with rivets
    for y0 in (20, 50):
        rgb[y0:y0 + 3] = I1
        rgb[y0] = I3
        rgb[y0 + 2] = I0
        rivets(rgb, [(x, y0 + 1) for x in range(2, 32, 6)], hi=(190, 196, 210), lo=I0)
    finish(rgb, 'wall_stormwall.png', 40)


def brass_floor(w, h, seed, k=1.0):
    plate = tile_lum(C64 + 'Metal/Materials/metal_diamondplate_01.png', (w, h))
    n = pnoise(w, h, seed)
    yy, xx = np.mgrid[0:h, 0:w]
    tread = ((xx + yy) % 4 == 0) & ((xx // 2 + yy // 2) % 2 == 0)
    v = np.clip(0.42 + (n - 0.5) * 0.3 + (plate - 0.5) * 0.2, 0, 1) * k
    rgb = gmap(v, BR_STOPS)
    rgb = blend(rgb, tread, BR3, 0.6)
    rgb = blend(rgb, np.roll(tread, 1, 0) & np.roll(tread, 1, 1), BR0, 0.5)
    seam = (xx % 16 == 0) | (yy % 16 == 0)
    rgb[seam] = BR0
    rgb = blend(rgb, (np.roll(seam, 1, 0) | np.roll(seam, 1, 1)) & ~seam, BR3, 0.4)
    rivets(rgb, [(x, y) for x in (2, 14, 18, 30) for y in (2, 14, 18, 30)])
    return rgb, n


def tex_floor_brass():
    rgb, n = brass_floor(32, 32, 241)
    yy, xx = np.mgrid[0:32, 0:32]
    rgb = blend(rgb, (n > 0.7) & ((xx + yy) % 2 == 0), VG0, 0.3)   # a faint bloom of verdigris
    finish(rgb, 'floor_brass.png', 40)


def tex_floor_cloud():
    w = h = 32
    v, vein, crack = marble(w, h, 251, 'Ground/Materials/ice_07.jpg')
    yy, xx = np.mgrid[0:h, 0:w]
    blue = ((xx // 16) + (yy // 16)) % 2 == 1
    rgb = gmap(v, MB_STOPS)
    rgb[blue] = gmap(v[blue] * 0.8, [(0, SK2), (0.4, (126, 164, 214)), (0.75, (170, 200, 236)), (1, (208, 226, 248))])
    rgb = blend(rgb, vein, CL0, 0.55)
    rgb = blend(rgb, vein & blue, SK2, 0.5)
    grout = (xx % 16 == 0) | (yy % 16 == 0)
    rgb[grout] = (128, 140, 170)
    rgb = blend(rgb, (np.roll(grout, 1, 0) | np.roll(grout, 1, 1)) & ~grout, MB3, 0.5)
    rgb[(xx % 16 == 8) & (yy % 16 == 8)] = AU3                 # a gold stud in every tile
    finish(rgb, 'floor_cloud.png', 40)


def tex_floor_sawtrack():
    """Brass floor with a cross-shaped saw groove (the blade runs along x or y), rails and hazard stripes."""
    rgb, n = brass_floor(32, 32, 261, 0.85)
    yy, xx = np.mgrid[0:32, 0:32]
    for axis in (0, 1):
        c = xx if axis == 0 else yy              # distance across the groove
        across = np.abs(c - 15.5)
        haz = (across >= 3) & (across < 5.5)
        stripe = (((xx + yy) // 2) % 2 == 0)
        rgb[haz & stripe] = LY1
        rgb[haz & ~stripe] = DI0
        rail = (across >= 2) & (across < 3)
        rgb[rail] = M1
        rgb[rail & (c < 15.5)] = M2 if axis else M1
    for axis in (0, 1):
        c = xx if axis == 0 else yy
        groove = np.abs(c - 15.5) < 2
        rgb[groove] = DI0
        rgb[groove & (np.abs(c - 15.5) < 1)] = (8, 6, 10)
        lip = (c == 13) if axis == 0 else (c == 13)
        rgb[groove & lip] = DI2
    rgb[(np.abs(xx - 15.5) < 2) & (np.abs(yy - 15.5) < 2)] = (8, 6, 10)
    finish(rgb, 'floor_sawtrack.png', 40)


def tex_floor_void():
    """Looking down past the island edge: a deep night sky far below, faint cloud banks and a few stars."""
    w = h = 64
    n = pnoise(w, h, 271, ((32, 1.0), (16, 0.5), (8, 0.25)))
    n2 = pnoise(w, h, 272, ((16, 1.0), (8, 0.6), (4, 0.3)))
    yy, xx = np.mgrid[0:h, 0:w]
    rgb = gmap(np.clip(n * 0.9, 0, 1), [(0, (4, 6, 18)), (0.45, SK0), (0.75, (18, 26, 62)), (1, SK1)])
    cl = (n2 > 0.6) & (n > 0.45)
    rgb = blend(rgb, cl, (40, 52, 96), 0.45)
    rgb = blend(rgb, cl & (n2 > 0.7), (70, 84, 130), 0.35)
    rr = random.Random(273)
    for i in range(22):
        x, y = rr.randrange(w), rr.randrange(h)
        rgb[y, x] = (200, 210, 255) if i % 4 else (255, 255, 255)
        if i % 7 == 0:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                rgb[(y + dy) % h, (x + dx) % w] = (90, 110, 170)
    finish(rgb, 'floor_void.png', 32, half=False)


def tex_floor_wind():
    w = h = 32
    v, vein, crack = marble(w, h, 281, 'Ground/Materials/ice_09.jpg', 0.2)
    yy, xx = np.mgrid[0:h, 0:w]
    rgb = gmap(v * 0.9 + 0.08, MB_STOPS)
    rgb = blend(rgb, vein, CL1, 0.5)
    grout = (yy % 32 == 0) | (xx % 32 == 0)
    rgb[grout] = CL0
    # faint chevrons (pointing +x) and swept streaks: the wind direction
    chev = np.zeros((h, w), bool)
    for cy, cx in ((8, 10), (24, 26), (8, 26), (24, 10)):
        dy = yy - cy
        chev |= (np.abs(dy) <= 3) & (np.abs((xx - cx) + np.abs(dy) - 0) <= 0.6)
        chev |= (np.abs(dy) <= 3) & (np.abs((xx - cx + 3) + np.abs(dy)) <= 0.6)
    rgb = blend(rgb, chev, SK3, 0.45)
    streak = ((yy % 8) == 3) & (((xx + yy * 3) % 16) < 6)
    rgb = blend(rgb, streak & ~chev, WHITE, 0.45)
    finish(rgb, 'floor_wind.png', 32)


def tex_boss_clockmaker():
    # wall: dark wood panelling in a brass frame; a huge clock face above, a pendulum case below
    w, h = 64, 128
    wood = up2(tile_lum(K + 'floor_wood_planks.png', (32, 64), (1, 2)))
    yy, xx = np.mgrid[0:h, 0:w]
    rgb = gmap(np.clip(wood * 0.6 + 0.15, 0, 1), [(0, (36, 20, 16)), (0.5, (70, 40, 26)), (1, (110, 66, 40))])
    frame = (xx < 3) | (xx > 60) | (yy < 3) | (yy > 124) | ((yy > 70) & (yy < 74))
    rgb[frame] = BR2
    rgb[frame & ((xx == 1) | (yy == 1) | (yy == 71))] = BR4
    rgb[frame & ((xx == 62) | (yy == 126) | (yy == 73))] = BR0
    p = Pic(w, h)
    for (x, y, r, n) in ((5, 8, 7, 8), (59, 8, 7, 8), (5, 64, 6, 7), (59, 64, 6, 7)):      # gears in the corners
        gear(p, x, y, r, n, x * 0.2, (BR0, BR1, BR2, BR3), hole=(30, 16, 12), spokes=4)
    clockface(p, 32, 36, 26, 0.13)
    # roman-numeral bars between the tick marks
    for k in range(12):
        a = k / 12 * math.tau - math.pi / 2
        x0, y0 = 32 + math.cos(a) * 19, 36 + math.sin(a) * 19
        for j in range((k % 4) + 1):
            p.l(x0 + (j - k % 4 / 2) * 1.5, y0 - 1.5, x0 + (j - k % 4 / 2) * 1.5, y0 + 1.5, (60, 40, 30))
    clockface(p, 32, 36, 4, 0.13, face=BR3, face2=BR2)
    # pendulum case: dark glass, brass rod and bob, two weights on chains
    p.r(14, 78, 49, 120, (26, 34, 44))
    p.r(15, 79, 48, 119, (34, 46, 60))
    p.l(16, 80, 26, 118, (70, 90, 110)); p.l(18, 80, 28, 118, (52, 70, 90))            # glass glint
    p.l(32, 79, 28, 108, BR3)
    p.e(23, 104, 33, 114, BR0); p.e(24, 105, 32, 113, BR2); p.e(25, 106, 29, 109, BR4)
    for x in (19, 44):
        for y in range(80, 96, 2):
            p.p(x, y, BR2)
        p.r(x - 2, 96, x + 2, 104, BR1); p.l(x - 2, 96, x - 2, 104, BR3); p.l(x - 2, 104, x + 2, 104, BR0)
    a = np.array(p.im); m = a[:, :, 3] > 0
    rgb[m] = a[m, :3]
    rgb[wrap_outline(m) & ~frame] = OUT
    finish(rgb, 'wall_boss_clockmaker.png', 56, half=False)

    # floor: dark parquet with an inlaid brass dial in every quarter
    w = h = 32
    yy, xx = np.mgrid[0:h, 0:w]
    hb = ((xx // 4 + yy // 4) % 2 == 0)
    wood = tile_lum(K + 'floor_wood_planks.png', (w, h))
    rgb = gmap(np.clip(wood * 0.5 + 0.2 + hb * 0.12, 0, 1), [(0, (34, 20, 16)), (0.5, (78, 46, 28)), (1, (120, 76, 44))])
    rgb[(xx % 4 == 0) & hb | (yy % 4 == 0) & ~hb] = (30, 16, 12)
    cx_, cy_ = xx % 16 - 7.5, yy % 16 - 7.5
    r = np.hypot(cx_, cy_)
    ring = (r > 5.2) & (r < 6.6)
    rgb[ring] = BR2
    rgb[ring & (cy_ < 0)] = BR3
    rgb[(r >= 6.6) & (r < 7.4)] = BR0
    ticks = (r > 3) & (r < 5.2) & ((np.abs(cx_) < 0.6) | (np.abs(cy_) < 0.6))
    rgb[ticks] = BR3
    rgb[r < 1.2] = AU4
    rgb[(xx % 16 == 0) | (yy % 16 == 0)] = BR1
    finish(rgb, 'floor_boss_clockmaker.png', 40)


def tex_boss_thunderbird():
    # wall: storm-slate blocks, a carved thunderbird with spread wings in gold, lightning from its wings
    w, h = 64, 128
    mortar, bid = P3.brick_mask(32, 64, 12, 16, 41)
    grain = tile_lum(K + 'wall_brick_stone_center.png', (32, 64), (1, 2))
    r2 = np.random.default_rng(291)
    tone = {b: r2.uniform(0.3, 0.55) for b in np.unique(bid)}
    v = up2(np.clip(np.vectorize(tone.get)(bid) + (grain - 0.5) * 0.25, 0, 1))
    rgb = gmap(v, ST_STOPS)
    rgb[up2(mortar)] = ST0
    yy, xx = np.mgrid[0:h, 0:w]
    zig = (yy < 10) & (np.abs((yy - 5) - 3 * np.abs(((xx % 12) - 6) / 3)) < 1.2) | (yy == 0) | (yy == 11)
    rgb[(yy < 12)] = ST1
    rgb[zig] = AU2
    p = Pic(w, h)
    cx, cy = 32, 58
    for s_ in (-1, 1):                                        # wings: stepped feather rows
        for k in range(5):
            y0 = cy - 14 + k * 5
            x1 = cx + s_ * (28 - k * 3)
            p.poly([(cx + s_ * 4, y0), (x1, y0 - 6 + k), (x1 - s_ * 2, y0 + 3), (cx + s_ * 4, y0 + 5)], AU1 if k % 2 else AU2)
            p.l(cx + s_ * 4, y0, x1, y0 - 6 + k, AU3)
    p.poly([(cx - 6, cy - 18), (cx + 6, cy - 18), (cx + 7, cy + 10), (cx, cy + 16), (cx - 7, cy + 10)], AU2)        # body
    p.l(cx - 5, cy - 17, cx - 6, cy + 9, AU3)
    for k in range(4):
        p.l(cx - 4, cy - 10 + k * 5, cx + 4, cy - 10 + k * 5, AU1)
    p.poly([(cx - 8, cy + 14), (cx + 8, cy + 14), (cx + 11, cy + 30), (cx, cy + 24), (cx - 11, cy + 30)], AU1)      # tail
    p.l(cx, cy + 15, cx, cy + 24, AU3)
    p.e(cx - 6, cy - 32, cx + 6, cy - 18, AU2)                                                                   # head
    for k in range(3):                                                                                             # swept-back crest
        p.poly([(cx - 2 + k * 2, cy - 30 + k), (cx - 14 + k * 2, cy - 38 + k * 3), (cx - 4 + k * 2, cy - 27 + k)], AU1 if k % 2 else AU3)
    p.poly([(cx + 3, cy - 28), (cx + 14, cy - 25), (cx + 12, cy - 21), (cx + 9, cy - 23), (cx + 3, cy - 21)], AU3)  # hooked beak
    p.l(cx + 4, cy - 24, cx + 10, cy - 23, AU1)
    p.r(cx + 1, cy - 27, cx + 2, cy - 26, LT2)                                                                    # eye
    for s_ in (-1, 1):
        bolt(p, cx + s_ * 26, cy - 2, cx + s_ * 20, cy + 52, 7 + s_, 1, (LY0, LY1, LY2), 3, 1)
    a = np.array(p.im); m = a[:, :, 3] > 0
    rgb = blend(rgb, glow(m.astype(float), 2.5) > 0.12, (90, 80, 60), 0.35)
    rgb[m] = a[m, :3]
    rgb[wrap_outline(m)] = OUT
    rgb[np.roll(np.roll(m, 2, 0), 2, 1) & ~m & ~wrap_outline(m)] = ST0
    finish(rgb, 'wall_boss_thunderbird.png', 56, half=False)

    # floor: cloud-marble tiles, each with a gold lightning bolt on a dark slate disc
    w = h = 32
    v, vein, crack = marble(w, h, 292)
    yy, xx = np.mgrid[0:h, 0:w]
    rgb = gmap(v, MB_STOPS)
    rgb = blend(rgb, vein, CL0, 0.5)
    cx_, cy_ = xx % 16 - 7.5, yy % 16 - 7.5
    r = np.hypot(cx_, cy_)
    rgb[r < 6.5] = ST1
    rgb[(r >= 5.5) & (r < 6.5)] = AU1
    bm = Image.new('L', (16, 16)); ImageDraw.Draw(bm).polygon([(9, 2), (5, 8), (8, 8), (6, 13), (11, 6), (8, 6), (11, 2)], fill=255)
    bm = np.tile(np.array(bm) > 0, (2, 2))
    rgb[bm] = LY1
    rgb[bm & ~np.roll(bm, 1, 1)] = LY2
    rgb[np.roll(np.roll(bm, 1, 0), 1, 1) & ~bm & (r < 5.5)] = ST0
    grout = (xx % 16 == 0) | (yy % 16 == 0)
    rgb[grout] = CL0
    finish(rgb, 'floor_boss_thunderbird.png', 40)


@builder('textures')
def make_textures():
    tex_wall_brass(); tex_wall_gear(); tex_wall_cloudstone(); tex_wall_stormwall()
    tex_floor_brass(); tex_floor_cloud(); tex_floor_sawtrack(); tex_floor_void(); tex_floor_wind()
    tex_boss_clockmaker(); tex_boss_thunderbird()


# ================================================================== Body_A helpers
def tool_line(f):
    """(hand, angle) of whatever tool a Body_A frame holds: the tool pixels are everything strip_tool removes; the hand
    is the tool pixel nearest the body, the angle points to the tool pixel farthest from it. None without a tool."""
    a = mask_of(f) & ~mask_of(strip_tool(f))
    ys, xs = np.nonzero(a)
    if len(xs) < 4:
        return None
    body = mask_of(strip_tool(f))
    by, bx = np.nonzero(body)
    cxb, cyb = bx.mean(), by.mean()
    d = np.hypot(xs - cxb, ys - cyb)
    i = int(np.argmin(d))
    hx, hy = xs[i], ys[i]
    j = int(np.argmax(np.hypot(xs - hx, ys - hy)))
    return (int(hx), int(hy)), math.atan2(ys[j] - hy, xs[j] - hx)


def back_x(g, y):
    """Back-most (left) body pixel in row y."""
    xs = np.nonzero(mask_of(g)[int(y)])[0]
    return int(xs.min()) if len(xs) else None


# ================================================================== CLOCK SOLDIER (Body_A in brass, shako, wind-up key, bayonet lance)
CS_PAL = {'head': (BR3, BR2, BR1, BR4), 'torso': ((168, 44, 40), (116, 28, 30), (70, 16, 22), (210, 84, 64)),
          'legs': (DI3, DI2, DI1, (124, 120, 134))}
PLUME0, PLUME1 = (150, 30, 34), (226, 70, 60)


def wind_key(p, x, y, ph, glow=False):
    """The wind-up key sticking out of the back at (x, y), its bow turning (ph in turns)."""
    p.l(x, y, x - 3, y, BR1)
    p.p(x - 1, y - 1, BR3)
    wdt = abs(math.cos(ph * math.tau)) * 3.2
    c = (TC2 if glow else BR3)
    for s_ in (-1, 1):
        cy = y + s_ * 3
        p.e(x - 4 - wdt, cy - 2, x - 4 + wdt, cy + 2, BR0)
        if wdt > 1.2:
            p.e(x - 4 - wdt + 1, cy - 1, x - 4 + wdt - 1, cy + 1, (0, 0, 0, 0))
        p.p(x - 4 - wdt * 0.5, cy - 1, c)
    p.l(x - 4, y - 2, x - 4, y + 2, BR2)


def shako(p, hx, hy, tilt=0.0, plume=0.0):
    """Tall brass-trimmed shako with a peak and a red plume."""
    x0, x1 = hx - 4, hx + 4
    top = hy - 11
    p.poly([(x0, hy - 3), (x0 + 0.5 + tilt, top), (x1 + 0.5 + tilt, top), (x1, hy - 3)], DI1)
    p.l(x0 + 1 + tilt, top + 1, x0 + 1, hy - 4, DI3)
    p.l(x0, hy - 3, x1, hy - 3, BR2); p.l(x0, hy - 4, x1, hy - 4, BR1)
    p.l(x0 + tilt, top + 1, x1 + tilt, top + 1, BR3)
    p.l(x1 - 1, hy - 2, x1 + 3, hy - 1, DI0)                                 # peak
    p.e(hx + 1 + tilt * 0.5, hy - 9, hx + 3 + tilt * 0.5, hy - 6, BR3); p.p(hx + 2 + tilt * 0.5, hy - 8, BR4)   # badge
    px, py = hx - 1 + tilt, top - 1
    p.e(px - 1.5, py - 4 - plume, px + 1.5, py, PLUME0)
    p.e(px - 1, py - 4 - plume, px + 0.5, py - 1, PLUME1)


def lance(p, hx, hy, ang, ln=20, back=6):
    """Musket-lance: dark wooden stock through the hand, brass ferrule, long bayonet blade."""
    u = (math.cos(ang), math.sin(ang))
    x0, y0 = hx - u[0] * back, hy - u[1] * back
    x1, y1 = hx + u[0] * ln, hy + u[1] * ln
    p.l(x0, y0, x1, y1, (58, 36, 26), 2)
    p.l(x0, y0, x1, y1, (96, 62, 40))
    p.l(x1, y1, x1 + u[0] * 2, y1 + u[1] * 2, BR3, 2)
    bx, by = x1 + u[0] * 2, y1 + u[1] * 2
    p.l(bx, by, bx + u[0] * 9, by + u[1] * 9, M1, 2)
    p.l(bx, by, bx + u[0] * 9, by + u[1] * 9, M3)
    p.p(bx + u[0] * 10, by + u[1] * 10, M3)
    return bx + u[0] * 10, by + u[1] * 10


def clocksoldier_cell(f, feet, cx, ph=0.0, weapon=None, dx=0, dy=0, fl=None, eyes=1, hat=True, key=True, keyglow=False,
                      sparks=0, plume=0.0):
    g, hc = dress(f, CS_PAL, eye=GL2 if eyes == 1 else TC2 if eyes == 2 else BR0)
    if hc is None:
        return Image.new('RGBA', (64, 64))
    hx, hy = hc
    p = Pic(64, 64)
    if weapon and weapon[3] == 'back':
        lance(p, *weapon[:3])
    if key:
        bx = back_x(g, hy + 9)
        if bx is not None:
            wind_key(p, bx, hy + 9, ph, keyglow)
    p.paste(g, 0, 0)
    a = mask_of(g)
    # brass cross-belt and waist belt on the red tunic, rivets on the joints
    for y in range(int(hy) + 6, int(hy) + 16):
        xs = np.nonzero(a[y])[0]
        if len(xs) >= 3:
            t = (y - hy - 6) / 10
            x = int(xs.min() + 1 + t * (xs.max() - xs.min() - 2))
            p.p(x, y, BR3)
    yb = int(hy) + 15
    xs = np.nonzero(a[min(63, yb)])[0]
    if len(xs) >= 3:
        p.l(xs.min() + 1, yb, xs.max() - 1, yb, BR2)
        p.p((xs.min() + xs.max()) // 2, yb, BR4)
    p.l(hx + 1, hy + 3, hx + 4, hy + 3, BR0)                                 # mouth grille
    p.p(hx + 2, hy + 4, BR0)
    if hat:
        shako(p, hx, hy, 0, plume)
    tip = None
    if weapon and weapon[3] != 'back':
        tip = lance(p, *weapon[:3])
    if sparks:
        r2 = random.Random(sparks)
        for _ in range(4):
            x, y = hx + r2.randint(-8, 6), hy + r2.randint(2, 18)
            p.p(x, y, GL3); p.p(x + 1, y - 1, GL2)
    im = cell_of(outline_same(p.im), feet, cx, dx, dy)
    if fl:
        im = flash(im, fl)
    return im


def gear_bits(p, cx, cy, n, seed, spread=10, fall=0.0, floor=57):
    r2 = random.Random(seed)
    for i in range(n):
        a = r2.uniform(math.pi, math.tau)
        d = r2.uniform(0.5, 1.0) * spread
        x, y = cx + math.cos(a) * d, min(floor - 2, cy + math.sin(a) * d + fall * fall * 10)
        gear(p, x, y, r2.choice((1.5, 2, 2.5)), 5, r2.uniform(0, 3), spokes=0, hub=False)


@builder('clocksoldier')
def make_clocksoldier():
    idle, walk, pr, hit, de = body_src('Idle'), body_src('Walk'), body_src('Pierce'), body_src('Hit'), body_src('Death')
    feet = max(f.getbbox()[3] - 1 for f in idle)
    b = idle[0].getbbox()
    cx = (b[0] + b[2]) // 2
    C = clocksoldier_cell

    def held(f, lean=0.05):                       # lance shouldered upright
        gs = strip_tool(f)
        hx, hy = front_hand(gs, gs.getbbox()[1], (14, 22))
        return (hx, hy + 1, -math.pi / 2 + lean, 'front')
    save_enemy('clocksoldier', 'idle', [C(f, feet, cx, ph=i / 4, weapon=held(f)) for i, f in enumerate(idle)], 64)
    save_enemy('clocksoldier', 'movement', [C(f, feet, cx, ph=i / 6, weapon=held(f, 0.25), dy=(0, 1, 0, 0, 1, 0)[i])
                                            for i, f in enumerate(walk)], 64)
    att, last = [], None
    for i, f in enumerate(pr):                    # lance raised, a stiff thrust with the bayonet, back to attention
        ax = tool_line(f) or last
        last = ax
        (hx, hy), ang = ax
        ang = (0.3, 0.35, 0.4, 0.02, 0.02, 0.05, 0.1, -math.pi / 2)[i]
        att.append(C(f, feet, cx, ph=i / 8, weapon=(hx, hy, ang, 'front' if i >= 3 else 'back'), dx=-3 if 3 <= i <= 5 else 0,
                     eyes=2 if 2 <= i <= 5 else 1))
    save_enemy('clocksoldier', 'attack', att, 64)
    save_enemy('clocksoldier', 'take_damage', [C(f, feet, cx, ph=0.1 * i, weapon=held(f, 0.4), dx=-1 - (i == 0), sparks=i + 1,
                                                 fl=(255, 255, 255) if i == 0 else None) for i, f in enumerate(hit)], 64)
    dfr = []
    for i, f in enumerate(de):                    # topples, springs and cogs burst out, the key stops
        c = C(f, feet, cx, ph=0.3 + i * 0.05, eyes=1 if i < 2 else 0, hat=i < 4, sparks=i + 3 if i < 4 else 0,
              weapon=held(f, 0.4 + i * 0.4) if i < 3 else None)
        p = Pic(64, 64)
        if i >= 4:
            hp = Pic(20, 20); shako(hp, 10, 16)
            p.paste(hp.im.rotate(-80, resample=Image.NEAREST, center=(10, 12)), 2 + i, 41)
            lance(p, 14, 56, -0.02, 26, 0)
        if 3 <= i <= 6:
            gear_bits(p, 38, 44, 4, i, 6 + i * 2, (i - 3) * 0.6)
        if i >= 6:
            for (x, r) in ((26, 2), (44, 2.5), (50, 1.5)):
                gear(p, x, 55, r, 5, x, spokes=0, hub=False)
            p.lines([(32, 54), (34, 51), (36, 54), (38, 51), (40, 54)], M2)          # a broken mainspring
        dfr.append(cut_below(on(c, outline_same(p.im)), 57))
    save_enemy('clocksoldier', 'death', dfr, 64)
    # rewind: the key spins and glows, the soldier pulls itself up again (the death played backwards)
    rw = []
    for k, i in enumerate((7, 6, 5, 4, 3, 2, 1, 0)):
        f = de[i]
        c = C(f, feet, cx, ph=k * 0.3, eyes=2 if k >= 5 else 0, hat=i < 4, keyglow=True)
        p, q = Pic(64, 64), Pic(64, 64)
        r_ = 8 + k
        for j in range(3):                                                          # cyan winding arcs
            a0 = k * 50 + j * 120
            q.arc(32 - r_, 40 - r_ * 0.6, 32 + r_, 40 + r_ * 0.6, a0, a0 + 50, TC1 if j % 2 else TC2)
        if i >= 4:
            hp = Pic(20, 20); shako(hp, 10, 16)
            p.paste(hp.im.rotate(-80 + k * 15, resample=Image.NEAREST, center=(10, 12)), 2 + i, 41 - k)
            lance(p, 14, 56, -0.02, 26, 0)
        if 3 <= i <= 6:
            gear_bits(p, 38, 44, 4, i, 6 + i * 2, (i - 3) * 0.6)
        if k == 7:
            for (x, y) in ((20, 22), (46, 18), (14, 40), (52, 36)):
                p.ps([(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], TC2); p.p(x, y, WHITE)
        rw.append(cut_below(on(outline_same(q.im), c, outline_same(p.im)), 57))
    save_enemy('clocksoldier', 'rewind', rw, 64)


# ================================================================== STORMCALLER (Body_A in a hooded storm robe, beard, thunder staff)
SC_PAL = {'head': ((206, 176, 150), (160, 124, 104), (110, 80, 70), (236, 210, 186)), 'torso': (ST3, ST2, ST1, ST4),
          'legs': (ST2, ST1, ST0, ST3)}
BEARD0, BEARD1 = (170, 176, 196), (226, 232, 244)


def storm_staff(p, hx, hy, ang, ln=22, back=7, glow_=1.0, t=0.0):
    """Iron staff with a forked head holding a crackling storm orb; returns the orb centre."""
    u = (math.cos(ang), math.sin(ang))
    v = (-u[1], u[0])
    x0, y0 = hx - u[0] * back, hy - u[1] * back
    x1, y1 = hx + u[0] * ln, hy + u[1] * ln
    p.l(x0, y0, x1, y1, (50, 40, 46), 2)
    p.l(x0, y0, x1, y1, (90, 82, 96))
    for s_ in (-1, 1):                                                        # the fork
        p.lines([(x1, y1), (x1 + v[0] * s_ * 3, y1 + v[1] * s_ * 3), (x1 + u[0] * 5 + v[0] * s_ * 3, y1 + u[1] * 5 + v[1] * s_ * 3)], I2)
    ox, oy = x1 + u[0] * 4, y1 + u[1] * 4
    r = 1.6 + glow_ * 0.9
    p.e(ox - r - 1, oy - r - 1, ox + r + 1, oy + r + 1, LT0)
    p.e(ox - r, oy - r, ox + r, oy + r, LT1)
    p.p(ox, oy, LT3); p.p(ox - 1, oy - 1, LT2)
    r2 = random.Random(int(t * 100) + 3)
    for _ in range(int(1 + glow_ * 2)):                                       # little arcs jumping off the orb
        a = r2.uniform(0, math.tau)
        d = r + 2 + glow_ * 2
        p.lines([(ox + math.cos(a) * (r + 1), oy + math.sin(a) * (r + 1)), (ox + math.cos(a + 0.4) * d * 0.7, oy + math.sin(a + 0.4) * d * 0.7),
                 (ox + math.cos(a) * d, oy + math.sin(a) * d)], LT2)
    return ox, oy


def storm_robe(p, g, hy, sway=0.0, flare=2.0):
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
        r = x1 + round(t * flare * 0.6) + round(sway * t)
        for x in range(l, r + 1):
            c = ST2
            if x <= l + 1:
                c = ST1
            elif (x - l) % 3 == 2 and y < feet:
                c = ST3
            p.p(x, y, c)
        if y >= feet - 1:                                                    # ragged hem in lighter storm grey
            for x in range(l, r + 1, 2):
                p.p(x, y, ST3)
    p.l(x0, belt, x1, belt, LY0)
    p.p((x0 + x1) // 2, belt, LY1)


def hood(p, hx, hy, phase=0.0):
    """A deep hood over the head (open towards the face on the right), a lightning clasp."""
    p.poly([(hx - 6, hy + 4), (hx - 6, hy - 3), (hx - 3, hy - 7), (hx + 2, hy - 8), (hx + 5, hy - 6), (hx + 6, hy - 2),
            (hx + 3, hy - 3), (hx - 1, hy - 1), (hx - 1, hy + 5)], ST2)
    p.l(hx - 5, hy - 3, hx - 2, hy - 6, ST4)
    p.l(hx - 2, hy - 6, hx + 3, hy - 7, ST4)
    p.l(hx + 3, hy - 3, hx - 1, hy - 1, ST1)
    tail = math.sin(phase) * 1.5                                              # tail of the hood flapping in the wind
    p.poly([(hx - 6, hy - 1), (hx - 11 + tail, hy + 1), (hx - 6, hy + 4)], ST1)
    p.l(hx - 1, hy + 5, hx + 1, hy + 5, LY1)


def beard(p, hx, hy, k=0.0):
    p.poly([(hx + 1, hy + 3), (hx + 6, hy + 2), (hx + 5, hy + 9 + k), (hx + 2, hy + 11 + k)], BEARD0)
    p.l(hx + 2, hy + 3, hx + 4, hy + 9 + k, BEARD1)
    p.l(hx + 3, hy + 1, hx + 6, hy + 1, BEARD1)                              # bushy brow


def stormcaller_cell(f, feet, cx, phase=0.0, staff=None, dx=0, dy=0, fl=None, glow_=1.0, sway=0.0, robe=True, hood_=True,
                     sky=None, eyes=1):
    g, hc = dress(f, SC_PAL, eye=LT2 if eyes == 1 else WHITE if eyes == 2 else (60, 50, 50))
    if hc is None:
        return Image.new('RGBA', (64, 64))
    hx, hy = hc
    p = Pic(64, 64)
    if staff and staff[3] == 'back':
        storm_staff(p, *staff[:3], *staff[4:], glow_=glow_, t=phase)
    p.paste(g, 0, 0)
    if robe:
        storm_robe(p, g, hy, sway)
    beard(p, hx, hy)
    if hood_:
        hood(p, hx, hy, phase)
    tip = None
    if staff and staff[3] != 'back':
        tip = storm_staff(p, *staff[:3], *staff[4:], glow_=glow_, t=phase)
    im = cell_of(outline_same(p.im), feet, cx, dx, dy)
    if sky and tip:                                                           # a bolt from the sky into the orb
        ox, oy = 32 - cx + dx, 57 - feet + dy
        q = Pic(64, 64)
        bolt(q, tip[0] + ox + sky[0], -2, tip[0] + ox, tip[1] + oy - 3, sky[1], 1, (LT0, LT1, LT3), 2.5, 1)
        im = on(im, outline_same(q.im))
    if fl:
        im = flash(im, fl)
    return im


@builder('stormcaller')
def make_stormcaller():
    idle, walk, cr, hit, de = body_src('Idle'), body_src('Walk'), body_src('Crush'), body_src('Hit'), body_src('Death')
    feet = max(f.getbbox()[3] - 1 for f in idle)
    b = idle[0].getbbox()
    cx = (b[0] + b[2]) // 2
    S_ = stormcaller_cell

    def held(f, lean=0.15):
        gs = strip_tool(f)
        hx, hy = front_hand(gs, gs.getbbox()[1], (14, 22))
        return (hx, hy, -math.pi / 2 + lean, 'front')
    save_enemy('stormcaller', 'idle', [S_(f, feet, cx, phase=i * 1.3, staff=held(f), glow_=0.8 + 0.4 * (i % 2)) for i, f in enumerate(idle)], 64)
    save_enemy('stormcaller', 'movement', [S_(f, feet, cx, phase=i, staff=held(f, 0.3), sway=-1, dy=(0, 1, 0, 0, 1, 0)[i])
                                           for i, f in enumerate(walk)], 64)
    # attack: the staff is lifted high, a bolt from the sky strikes the orb, then he points it forward
    att = []
    for k, i in enumerate((0, 1, 2, 2, 6, 6, 7)):
        f = cr[i]
        (hx, hy), ang = tool_axis(f)
        if k <= 3:
            st = (hx + 3, hy + 4, -math.pi / 2 + 0.1, 'front', 12)
            sky = (2 - k, 40 + k) if k >= 1 else None
            gl = (1.2, 1.8, 2.4, 3.0)[k]
        else:
            st = (hx, hy, (-0.4, -0.35, -1.1)[k - 4], 'front', 18)
            sky, gl = None, (2.6, 1.6, 1.0)[k - 4]
        c = S_(f, feet, cx, phase=k, staff=st, glow_=gl, sky=sky, eyes=2 if 1 <= k <= 5 else 1)
        if k in (4, 5):                                                       # the gathered charge is hurled forward
            q = Pic(64, 64)
            ox, oy = 32 - cx, 57 - feet
            u = (math.cos(st[2]), math.sin(st[2]))
            tx, ty = hx + ox + u[0] * 22, hy + oy + u[1] * 22
            bolt(q, tx + 2, ty, 63, ty + (6, 2)[k - 4], 70 + k, 1 if k == 5 else 2, (LT0, LT1, LT3), 2.0, 1)
            c = on(c, outline_same(q.im))
        att.append(c)
    save_enemy('stormcaller', 'attack', att, 64)
    save_enemy('stormcaller', 'take_damage', [S_(f, feet, cx, phase=i, staff=held(f, 0.5), dx=-1 - (i == 0), glow_=0.4, eyes=2,
                                                 fl=(255, 255, 255) if i == 0 else None) for i, f in enumerate(hit)], 64)
    dfr = []
    for i, f in enumerate(de):
        c = S_(f, feet, cx, phase=i, robe=i < 3, glow_=0.5, eyes=1 if i < 3 else 0, staff=held(f, 0.4 + i * 0.3) if i < 3 else None)
        p, q = Pic(64, 64), Pic(64, 64)
        if i >= 3:                                                           # the staff falls and its orb fizzles out
            storm_staff(p, 10, 56, -0.05 - max(0, 6 - i) * 0.15, 22, 0, glow_=max(0, 1.2 - (i - 3) * 0.35), t=i)
        if i == 2:
            bolt(q, 30, 0, 34, 30, 90, 1, (LT0, LT1, LT3), 3, 1)
        dfr.append(cut_below(on(outline_same(p.im), c, outline_same(q.im)), 57))
    save_enemy('stormcaller', 'death', dfr, 64)


# ================================================================== TIMEKEEPER (drawn, 64x64: a floating robed keeper with a clock for a face)
TKR = ((18, 22, 56), (32, 40, 96), (52, 66, 140), (84, 102, 184))                # robe, midnight blue


def tk_staff(p, hx, hy, tilt, sand=0.5, t=0.0, ln=24):
    """A wooden staff through the hand at (hx, hy), an hourglass in a brass cage on top; returns the hourglass centre."""
    tx, ty = hx + math.sin(tilt) * (ln - 6), hy - math.cos(tilt) * (ln - 6)
    bx, by = hx - math.sin(tilt) * 6, hy + math.cos(tilt) * 6
    p.l(bx, by, tx, ty, (70, 48, 34), 2)
    p.l(bx, by, tx, ty, (120, 86, 56))
    hg = Pic(15, 15)
    hourglass(hg, 7, 12, 10, sand)
    hg.l(5, 13, 9, 13, BR1)
    p.paste(hg.im.rotate(-math.degrees(tilt), resample=Image.NEAREST, center=(7, 13)), tx - 7, ty - 13)
    for k in range(3):                                                    # glints of time round the glass
        a_ = t * math.tau + k * 2.1
        p.p(tx + math.cos(a_) * 7, ty - 7 + math.sin(a_) * 5, TC2 if k else TC3)
    return tx, ty - 7


def timekeeper_frame(t=0.0, bob=0, sway=0.0, staff=(0, 0, 0.1), sand=0.5, ring=0, glow=0, fl=None, motes=0, lean=0.0,
                     crack=0, sink=0.0, arm=0.0, dx=0):
    """sway: the robe hem trails back (moving); staff = (hand dx, hand dy, tilt) or None; glow: the clock face lights up;
    sink: 0..1 the empty robe collapses (death)."""
    p = Pic(64, 64)
    cx = 30 + dx
    top = 12 + bob + sink * 30
    hem = 54 + bob * 0.5
    L = lean
    if ring:                                                              # time ring thrown forward
        rx, ry = cx + 14 + ring * 3, top + 18
        rr = 4 + ring * 2
        p.e(rx - rr * 0.6, ry - rr, rx + rr * 0.6, ry + rr, TC0)
        p.e(rx - rr * 0.6 + 1, ry - rr + 1, rx + rr * 0.6 - 1, ry + rr - 1, (0, 0, 0, 0))
        for k in range(8):
            a = k / 8 * math.tau + t * 3
            p.p(rx + math.cos(a) * rr * 0.6, ry + math.sin(a) * rr, TC3 if k % 2 else TC2)
    # back arm (sleeve) and the robe
    p.l(cx - 4 + L, top + 15, cx - 9 + L * 0.5, top + 24 + arm * 2, TKR[0], 4)
    sh_y = top + 13
    robe = [(cx - 6 + L, sh_y), (cx + 6 + L, sh_y), (cx + 10 + sway * 0.3, hem - 2), (cx + 8 + sway * 0.2, hem),
            (cx + 4, hem - 2), (cx, hem + 1), (cx - 4 - sway * 0.3, hem - 2), (cx - 9 - sway, hem), (cx - 12 - sway, hem - 3)]
    if sink:
        robe = [(x + (cx - x) * sink * 0.1, y + (57 - y) * sink * 0.75) for x, y in robe]
        robe = [(x - sink * 6 if x < cx else x + sink * 4, y) for x, y in robe]
    p.poly(robe, TKR[1])
    p.poly([robe[0], robe[1], ((robe[1][0] + robe[2][0]) / 2 - 2, (robe[1][1] + robe[2][1]) / 2), (cx - 2, (sh_y + hem) / 2)], TKR[2])
    for k, fx in enumerate((-5, -1, 3)):                                  # folds
        p.l(cx + fx * 0.5 + L, sh_y + 4, cx + fx * 1.4 - sway * 0.3 * (k == 0), hem - 3, TKR[0])
    p.lines(robe[2:], AU2)                                                # gold-trimmed ragged hem
    p.l(cx + L, sh_y + 2, cx + 1, hem - 2, AU1)                           # centre seam
    if sink < 0.6:
        # hood with the clock face inside, a starry lining
        hx, hy = cx + 1 + L, top + 7
        p.e(hx - 8, hy - 8, hx + 7, hy + 9, TKR[0])
        p.e(hx - 7, hy - 7, hx + 6, hy + 8, TKR[1])
        p.arc(hx - 7, hy - 7, hx + 6, hy + 8, 190, 280, TKR[3])
        p.e(hx - 5, hy - 5, hx + 6, hy + 6, (8, 10, 28))
        p.p(hx - 3, hy + 4, TC1); p.p(hx + 4, hy - 3, TC2)
        fc = (TC1, TC0) if glow else (DIAL1, DIAL0)
        clockface(p, hx + 1, hy + 1, 4, t, rim=BR2, rim2=BR3, face=TC2 if glow > 1 else fc[0], face2=fc[1], glow=glow > 0)
        if crack:
            p.l(hx - 1, hy - 2, hx + 2, hy + 1, OUT); p.l(hx + 2, hy + 1, hx + 1, hy + 4, OUT)
        # front arm: sleeve reaching for the staff, a pale bony hand
        hx2, hy2 = cx + 8 + L + (staff[0] if staff else 0), top + 22 + (staff[1] if staff else -arm * 6)
        p.l(cx + 3 + L, sh_y + 2, hx2 - 1, hy2, TKR[0], 5)
        p.l(cx + 3 + L, sh_y + 1, hx2 - 1, hy2 - 1, TKR[2], 2)
        p.p(hx2 - 2, hy2 + 1, AU2)
        if staff:
            tk_staff(p, hx2 + 1, hy2, staff[2], sand, t)
        p.e(hx2, hy2 - 1, hx2 + 2, hy2 + 1, (214, 204, 172))
    if motes:
        r2 = random.Random(motes)
        for _ in range(5):
            x, y = cx + r2.randint(-16, 14), 14 + r2.randint(0, 38)
            p.p(x, y, TC2); p.p(x, y - 1, TC0)
    im = outline_same(cut_below(p.im, 57))
    if fl:
        im = flash(im, fl)
    return im


@builder('timekeeper')
def make_timekeeper():
    T = timekeeper_frame
    save_enemy('timekeeper', 'idle', [T(t=i / 4, bob=(0, -1, -2, -1)[i], sand=0.7 - i * 0.08, motes=i + 1, sway=(0, 1, 0, -1)[i])
                                      for i in range(4)], 64)
    save_enemy('timekeeper', 'movement', [T(t=i / 6, bob=(0, -1, -1, 0, 1, 1)[i] - 1, sway=3 + (i % 2), lean=1, staff=(0, 0, 0.3))
                                          for i in range(6)], 64)
    att = [T(t=0.0, staff=(-1, -2, -0.2), sand=0.6), T(t=0.1, staff=(-2, -4, -0.45), sand=0.6, glow=1),
           T(t=0.2, staff=(1, -4, 0.3), sand=0.4, glow=2, ring=1), T(t=0.3, staff=(3, -4, 0.7), sand=0.3, glow=2, ring=2, lean=1),
           T(t=0.4, staff=(2, -2, 0.5), sand=0.2, glow=2, ring=3, lean=1), T(t=0.5, staff=(0, 0, 0.1), sand=0.2, glow=1, ring=4)]
    save_enemy('timekeeper', 'attack', att, 64)
    save_enemy('timekeeper', 'take_damage', [T(dx=-3, glow=2, fl=(255, 255, 255), staff=(0, 0, -0.35), crack=1, sway=-2),
                                              T(dx=-2, staff=(0, 0, -0.25), crack=1), T(dx=-1, staff=(0, 0, -0.05))], 64)
    d = []
    for k in range(6):                                                    # the robe empties and sinks; the staff falls, the glass cracks
        q = Pic(64, 64)
        if k >= 1:
            q.l(14, 56, 40, 56 - max(0, 3 - k) * 4, (70, 48, 34), 2); q.l(14, 56, 40, 56 - max(0, 3 - k) * 4, (120, 86, 56))
            hg = Pic(15, 15); hourglass(hg, 7, 12, 10, 0.5 if k < 4 else 0.0)
            q.paste(hg.im.rotate(90, resample=Image.NEAREST, center=(7, 7)), 2, 48)
        if k >= 4:
            q.e(4, 54, 16 + k, 57, AU2); q.l(6, 54, 14 + k, 54, AU3)           # spilled sand
            clockface(q, 46, 53, 4, 0.37)
            q.l(44, 51, 47, 54, OUT)
        c = T(t=k / 6, staff=None, glow=2 if k < 2 else 0, crack=1 if k else 0, sink=(0.0, 0.15, 0.4, 0.62, 0.78, 0.8)[k],
              motes=k + 9 if k < 4 else 0, arm=1.0 if k < 2 else 0)
        d.append(cut_below(on(outline_same(q.im), c), 57))
    save_enemy('timekeeper', 'death', d, 64)


# ================================================================== GEAR SPIDER (drawn, 32x32: a cog body on eight steel legs)
def gs_leg(p, hip, knee, foot, c=I3, c2=I1, joint=BR3):
    p.l(*hip, *knee, c2)
    p.l(*knee, *foot, c)
    p.p(*knee, joint)
    p.p(foot[0], foot[1], c2)


def gearspider_frame(t=0.0, walk=None, bob=0, lift=0.0, bite=0, eye=1, dx=0, fl=None, flip=False, curl=0.0, sparks=0):
    """Side view facing right: eight jointed steel legs (far ones darker) under a brass cog body and an iron head.
    flip draws it on its back (curl bends the legs, which then point up)."""
    p = Pic(32, 32)
    cx, cy = 14 + dx, 19 + bob - lift * 3
    for side in (-1, 1):
        col, col2, jc = (I2, I0, BR1) if side < 0 else (I3, I1, BR3)
        for k in range(4):
            ph = (walk + k * math.pi / 2 + (0 if side > 0 else math.pi)) if walk is not None else 0
            sw = math.sin(ph) * 1.5 if walk is not None else 0
            up = max(0, math.cos(ph)) * 1.5 if walk is not None else 0
            hx, hy = cx - 3 + k * 2.2 + (1 if side < 0 else 0), cy + (1 if side < 0 else 2)
            reach = (k - 1.5) * (4.2 if side < 0 else 4.4)
            kx, ky = hx + reach * 0.9 + sw * 0.5, cy - (8 if side < 0 else 7) - up
            fx, fy = hx + reach * (1.9 if side < 0 else 2.05) + sw, 28 - up
            if k == 3 and lift:                                                # front legs reach up
                kx, ky, fx, fy = hx + 4 + side, cy - 7 - lift * 2, hx + 7 + lift * 2 + side, cy - 5 - lift * 4
            if curl:                                                           # dead: legs folded towards the belly
                kx, ky = hx + reach * 0.6, hy + 3 + curl * 2
                fx, fy = hx + reach * 0.3 + side, hy + 2 + curl * 3
            gs_leg(p, (hx, hy), (kx, ky), (fx, fy), col, col2, jc)
    gear(p, cx, cy, 6, 9, t * math.tau / 9, (BR1, BR2, BR3, BR4), hole=BR0, spokes=3)
    hx_, hy_ = cx + 7, cy + 1                                                  # head: mandibles and a glowing lens
    p.e(hx_ - 3, hy_ - 3, hx_ + 3, hy_ + 2, DI2)
    p.e(hx_ - 2, hy_ - 3, hx_ + 2, hy_, DI3)
    ec = (255, 70, 50) if eye == 1 else WHITE if eye == 2 else DI1
    p.r(hx_ + 1, hy_ - 2, hx_ + 2, hy_ - 1, ec)
    p.p(hx_ - 1, hy_ - 2, (255, 160, 120) if eye else DI1)
    p.l(hx_ + 3, hy_ + 1, hx_ + 5, hy_ + 1 - bite, M2); p.l(hx_ + 3, hy_ + 2, hx_ + 5, hy_ + 3 + bite, M2)
    if sparks:
        r2 = random.Random(sparks)
        for _ in range(3):
            x, y = cx + r2.randint(-5, 9), cy + r2.randint(-6, 3)
            p.p(x, y, GL3); p.p(x + 1, y + 1, GL2)
    im = p.im
    if flip:
        im = ground(im.transpose(Image.FLIP_TOP_BOTTOM), 28)
    im = outline_same(cut_below(im, 28))
    if fl:
        im = flash(im, fl)
    return im


@builder('gearspider')
def make_gearspider():
    G = gearspider_frame
    save_enemy('gearspider', 'idle', [G(t=i / 4, bob=(0, 0, 1, 0)[i], bite=i % 2) for i in range(4)], 32)
    save_enemy('gearspider', 'movement', [G(t=i / 3, walk=i * math.tau / 6, bob=(0, -1, 0, 0, -1, 0)[i]) for i in range(6)], 32)
    save_enemy('gearspider', 'attack', [G(t=0, lift=0.5, bite=1), G(t=0.2, lift=1.0, bite=2, eye=2), G(t=0.4, lift=0.6, bite=2, eye=2, dx=2),
                                        G(t=0.6, lift=0.0, bite=0, eye=2, dx=4, sparks=3), G(t=0.8, dx=2, bite=1), G(t=1.0)], 32)
    save_enemy('gearspider', 'take_damage', [G(dx=-2, eye=2, fl=(255, 255, 255), sparks=1), G(dx=-1, sparks=2, bob=1), G()], 32)
    d = [G(eye=2, lift=0.8, bite=2, sparks=5), G(eye=0, bob=2, sparks=6, dx=-1), G(eye=0, curl=0.3, flip=True, t=0.3),
         G(eye=0, curl=0.7, flip=True, t=0.5)]
    p = Pic(32, 32)                                                            # still, a loose cog rolled away
    gear(p, 27, 26, 2, 6, 0.4, spokes=0)
    d.append(on(G(eye=0, curl=1.0, flip=True, t=0.5), outline_same(p.im)))
    save_enemy('gearspider', 'death', d, 32)


# ================================================================== HARPY (drawn, 64x64: a woman's head and chest, wings, talons)
HF = ((44, 30, 46), (86, 60, 80), (134, 98, 112), (186, 150, 150))               # feathers (dusky mauve)
HFD = ((32, 22, 34), (62, 42, 60), (98, 70, 86), (140, 108, 118))                 # far wing
HSK = ((150, 112, 120), (196, 160, 160), (226, 198, 190))                        # skin
HAIR = ((26, 18, 36), (52, 36, 66), (84, 62, 104))
LEG0, LEG1, LEG2 = (120, 76, 24), (196, 140, 50), (240, 196, 96)
TAL = (230, 226, 210)


def wing(p, root, theta, ln, pal, n=7, spread=1.0, fold=0.0, fsz=1.0, arm=3, back=math.pi):
    """A wing from root: leading edge along theta (radians), feathers hanging back (towards -x).
    fold (0..1) pulls the feathers along the leading edge (wings tucked for a dive)."""
    tip = (root[0] + math.cos(theta) * ln, root[1] + math.sin(theta) * ln)
    for j in range(n - 1, -1, -1):
        s_ = (j + 1) / n
        bx, by = root[0] + (tip[0] - root[0]) * s_, root[1] + (tip[1] - root[1]) * s_
        d_th = (theta - back + math.pi) % math.tau - math.pi
        phi = back + d_th * (s_ ** 1.6) * (1 - fold) + d_th * fold
        fl = (5 + 8 * s_ ** 1.2) * spread * (1 - fold * 0.4) * fsz
        feather(p, bx, by, phi, fl, (2.2 + s_ * 0.6) * (1 + (fsz - 1) * 0.6), pal, pal[3])
    p.l(*root, *tip, pal[1], arm)                                                 # the arm with coverts
    p.l(root[0], root[1] - 1, tip[0], tip[1] - 1, pal[2], 1)
    return tip


def talons(p, x, y, ang, open_=0.0):
    """A bird foot at (x, y), toes pointing along ang (0 = forward/right)."""
    for k, (da, ln) in enumerate(((-0.5 - open_ * 0.5, 3 + open_), (0.0, 4 + open_), (0.5 + open_ * 0.4, 3 + open_), (math.pi - 0.3, 2.5))):
        a = ang + da
        x1, y1 = x + math.cos(a) * ln, y + math.sin(a) * ln
        p.l(x, y, x1, y1, LEG1)
        p.p(x1, y1, TAL)
        p.p(x1 + math.cos(a + 1.2), y1 + math.sin(a + 1.2), TAL)


def harpy_frame(w=0.5, bob=0, tilt=0.0, reach=0.0, mouth=0, eyes=1, hair=0.0, fold=0.0, fl=None, dx=0, slash=0, limp=0.0,
                feathers=0):
    """w: wing stroke (0 = up, 1 = down); reach: legs thrown forward (0..1); tilt: degrees (negative = nose down)."""
    p = Pic(64, 64)
    cx, cy = 30, 32 + bob
    th = math.radians(-112 - w * 98)
    th_far = math.radians(-112 - min(1, w + 0.15) * 98)
    # far wing, tail, far leg
    wing(p, (cx - 2, cy - 5), th_far + limp * 1.2, 12 * (1 - fold * 0.3), HFD, spread=1 - limp * 0.3, fold=fold)
    for k, a in enumerate((2.5, 2.75, 3.0)):
        feather(p, cx - 3, cy + 7, a + limp * 0.5, 11 - k, 2.2, HF, HF[3])
    hipx, hipy = cx - 1, cy + 8
    kx, ky = hipx + 2 + reach * 7, hipy + 5 - reach * 3
    fx, fy = kx + 1 + reach * 6, ky + 5 - reach * 4
    p.l(hipx - 1, hipy, kx - 2, ky, LEG0, 2); p.l(kx - 2, ky, fx - 2, fy, LEG0, 2)
    talons(p, fx - 2, fy, -0.2 + reach * 0.4 if reach else 1.2, reach)
    # body: feathered belly, bare chest and shoulders
    p.e(cx - 6, cy - 4, cx + 5, cy + 10, HF[0])
    p.e(cx - 5, cy - 3, cx + 4, cy + 9, HF[1])
    for k in range(4):                                                         # feather scallops down the belly
        p.arc(cx - 4, cy + k * 2.5 - 1, cx + 3, cy + k * 2.5 + 3, 20, 160, HF[2])
    p.e(cx - 3, cy - 6, cx + 5, cy + 2, HSK[1])
    p.e(cx - 2, cy - 5, cx + 3, cy, HSK[2])
    p.l(cx - 4, cy + 2, cx + 5, cy + 1, HF[2])
    # near leg
    hipx, hipy = cx + 1, cy + 8
    kx, ky = hipx + 2 + reach * 8, hipy + 5 - reach * 3
    fx, fy = kx + 1 + reach * 7, ky + 5 - reach * 4
    p.e(hipx - 3, hipy - 3, hipx + 3, hipy + 4, HF[1]); p.e(hipx - 2, hipy - 3, hipx + 2, hipy + 1, HF[2])    # feathered thigh
    p.l(hipx + 1, hipy + 3, kx, ky, LEG1, 2); p.l(kx, ky, fx, fy, LEG1, 2); p.l(kx, ky - 1, fx - 1, fy, LEG2)
    talons(p, fx, fy, -0.2 + reach * 0.4 if reach else 1.2, reach)
    # head: hair streaming back, face to the right, pointed ear, yellow eyes
    hx, hy = cx + 5, cy - 11
    for k in range(5):
        a = math.pi + 0.5 - k * 0.22
        ln = 10 + k * 1.5 + hair * 2
        pts = [(hx - 1 + math.cos(a) * j * ln / 5 + math.sin(j + hair * 3 + k) * 0.8 * (j > 1),
                hy - 1 + math.sin(a) * j * ln / 5 + j * 0.6) for j in range(6)]
        p.lines(pts, HAIR[1 if k % 2 else 0], 2)
    p.e(hx - 4, hy - 4, hx + 4, hy + 5, HSK[0])                                                  # face (profile to the right)
    p.e(hx - 3, hy - 4, hx + 4, hy + 4, HSK[1])
    p.e(hx - 1, hy - 3, hx + 3, hy + 1, HSK[2])
    p.p(hx + 5, hy, HSK[1]); p.p(hx + 5, hy + 1, HSK[0])                                          # small nose
    p.p(hx + 4, hy + 4, HSK[0])                                                                    # chin
    p.e(hx - 5, hy - 6, hx + 3, hy - 1, HAIR[1])                                                  # hair crown and fringe
    p.l(hx - 4, hy - 5, hx + 1, hy - 6, HAIR[2])
    p.l(hx + 2, hy - 4, hx + 4, hy - 2, HAIR[0])
    p.l(hx - 4, hy - 2, hx - 4, hy + 5, HAIR[0]); p.l(hx - 3, hy - 1, hx - 3, hy + 4, HAIR[1])     # hair framing the cheek
    p.poly([(hx - 2, hy), (hx - 6, hy - 5), (hx - 1, hy - 2)], HSK[0])                           # pointed ear
    ec = (255, 210, 60) if eyes == 1 else WHITE if eyes == 2 else HSK[0]
    if eyes:
        p.r(hx + 1, hy - 1, hx + 2, hy - 1, ec); p.p(hx + 2, hy - 1, (120, 30, 20)); p.l(hx, hy - 2, hx + 3, hy - 2, HAIR[0])
    else:
        p.l(hx + 1, hy - 1, hx + 3, hy - 1, HSK[0])
    if mouth:
        p.r(hx + 2, hy + 2, hx + 4, hy + 2 + mouth, (110, 20, 30)); p.p(hx + 3, hy + 2, TAL)
    else:
        p.l(hx + 2, hy + 2, hx + 4, hy + 2, (150, 80, 90))
    # near wing on top
    wing(p, (cx + 1, cy - 4), th + limp * 1.4, 14 * (1 - fold * 0.3), HF, spread=1 - limp * 0.3, fold=fold)
    if feathers:
        r2 = random.Random(feathers)
        for _ in range(4):
            feather(p, cx + r2.randint(-14, 12), cy + r2.randint(-14, 10), r2.uniform(0, math.tau), 5, 1.4, HF, HF[3])
    im = p.im
    if tilt:
        im = im.rotate(tilt, resample=Image.NEAREST, center=(cx, cy))
    im = outline_same(shift(im, dx, 0))
    if slash:                                                                   # claw slash marks in front
        q = Pic(64, 64)
        for k in range(3):
            q.arc(36 + k * 3, 24 + k * 4, 70 + k * 3, 64 + k * 4, 200, 250, WHITE if k == 1 else (230, 220, 255))
        im = on(im, outline_same(q.im))
    if fl:
        im = flash(im, fl)
    return im


@builder('harpy')
def make_harpy():
    H = harpy_frame
    save_enemy('harpy', 'idle', [H(w=w, bob=b, hair=i) for i, (w, b) in enumerate(((0.0, 1), (0.45, 0), (1.0, -1), (0.45, 0)))], 64)
    save_enemy('harpy', 'movement', [H(w=w, bob=b, hair=i, tilt=-12, dx=1) for i, (w, b) in
                                     enumerate(((0.0, 1), (0.3, 1), (0.7, 0), (1.0, -1), (0.6, -1), (0.25, 0)))], 64)
    # dive: rears up with a scream, folds the wings, plunges talons first, rakes, pulls up
    att = [H(w=0.0, bob=-3, mouth=2, eyes=2, tilt=10), H(w=0.1, bob=-4, mouth=2, eyes=2, fold=0.5, tilt=-10),
           H(w=0.2, bob=-1, eyes=2, fold=1.0, reach=0.6, tilt=-35, dx=3), H(w=0.25, bob=3, eyes=2, fold=1.0, reach=1.0, tilt=-40, dx=6),
           H(w=0.9, bob=4, eyes=2, reach=1.0, tilt=-15, dx=6, slash=1, mouth=1), H(w=0.4, bob=1, reach=0.4, tilt=5, dx=2),
           H(w=0.0, bob=0)]
    save_enemy('harpy', 'attack', att, 64)
    save_enemy('harpy', 'take_damage', [H(w=0.2, dx=-3, eyes=2, mouth=2, fl=(255, 255, 255), feathers=3, tilt=12),
                                        H(w=0.5, dx=-2, feathers=4, tilt=6), H(w=0.6, dx=-1)], 64)
    d = [H(w=0.0, mouth=2, eyes=2, tilt=15, feathers=5), H(w=0.6, limp=0.4, eyes=0, tilt=-30, bob=6, feathers=6),
         H(w=0.8, limp=0.8, eyes=0, tilt=-70, bob=12, feathers=7)]
    for k in range(2):                                                          # lying on the floor, one wing spread
        im = H(w=1.0, limp=1.0, eyes=0, tilt=-95)
        im = ground(im, 57)
        q = Pic(64, 64)
        if k == 1:
            for (x, a) in ((8, -0.3), (52, 3.4), (16, 0.2)):
                feather(q, x, 56, a, 6, 1.4, HF, HF[3])
        d.append(on(im, outline_same(q.im)))
    save_enemy('harpy', 'death', d, 64)


# ================================================================== CLOUD GIANT (drawn, 64x64: a giant of billowing cloud that blows gales)
CG = ((96, 110, 150), (150, 166, 200), (204, 216, 238), (244, 248, 255))        # cloud body
CGD = ((70, 80, 116), (110, 124, 164), (160, 174, 208), (200, 210, 234))         # shaded cloud (back, base)


def wind_streaks(p, x0, y0, x1, n, seed, k=1.0, spread=10):
    """Gust lines blown from (x0, y0) towards x1: long thin wavy strokes fanning out, the middle one curling."""
    r2 = random.Random(seed)
    for i in range(n):
        dy = (i - (n - 1) / 2) * spread / max(1, n - 1)
        ln = (x1 - x0) * r2.uniform(0.7, 1.0) * k
        xs = x0 + r2.uniform(0, 5) + (i % 2) * 3
        pts = [(xs + j / 12 * ln, y0 + dy * (0.3 + 0.7 * j / 12) + math.sin(j * 0.8 + i * 1.7) * 0.9) for j in range(13)]
        p.lines(pts, CG[1], 1)
        p.lines([(x, y - 1) for x, y in pts[1:]], WHITE, 1)
        if i == n // 2:
            ex, ey = pts[-4]
            p.arc(ex - 2, ey - 5, ex + 4, ey + 1, 180, 450, WHITE)


def giant_frame(t=0.0, bob=0, lean=0.0, cheeks=0.0, blow=0.0, eyes=1, fl=None, dx=0, scatter=0.0, sink=0.0, arm=0.0, mist=0):
    """cheeks: 0..1 puffed (inhale); blow: 0..1 mouth open with a gale; scatter: 0..1 the body breaks apart (death)."""
    p = Pic(64, 64)
    r2 = random.Random(int(t * 10) + 5)
    cx, cy = 25 + dx, 32 + bob + sink
    L = lean

    def jit(a):
        return math.sin(t * math.tau + a) * 0.8

    def sc(x, y, k=1.0):                     # scatter moves pieces away from the centre and down
        if not scatter:
            return x, y
        return x + (x - cx) * scatter * 0.6 * k, y + (y - cy) * scatter * 0.3 + scatter * scatter * 14 * k
    for i, (bx, br) in enumerate(((12, 5), (20, 6), (28, 6.5), (36, 6), (43, 4.5))):     # base cloud rolling over the floor
        x, y = sc(bx + dx + jit(i) + (t * 4) % 2, 52 + 0.5 * math.sin(t * math.tau + i), 0.5)
        puff(p, x, min(y, 57 - br), br, CGD)
    if scatter < 0.9:
        for i, (yy_, rr) in enumerate(((47, 6), (42, 7), (37, 8))):                       # column rising into the body
            x, y = sc(cx - 1 + jit(i + 3), yy_ + bob + sink)
            puff(p, x, y, rr, CGD)
        sx, sy = sc(cx - 10 + L * 0.5, cy - 5)                                           # far arm
        hx, hy = sc(cx - 15 + L * 0.3, cy + 9 - arm * 4)
        for j in range(4):
            u = j / 3
            puff(p, sx + (hx - sx) * u, sy + (hy - sy) * u, 4.5 - u, CGD)
        puff(p, hx - 1, hy + 2, 4.5, CGD)
        sw = 1 + cheeks * 0.12                                                            # chest, swelling on the inhale
        for i, (ox, oy, rr) in enumerate(((-7, 0, 9), (4, 2, 8), (-2, -6, 10), (-10, -9, 6), (6, -9, 6), (-2, 7, 7))):
            x, y = sc(cx + ox * sw + L * 0.7 + jit(i), cy + oy * sw)
            puff(p, x, y, rr * sw, CG)
        sx, sy = sc(cx + 5 + L * 0.8, cy - 7)                                            # near arm, big cloud fist
        hx, hy = sc(cx + 12 + L + arm * 2, cy + 9 - arm * 6)
        for j in range(4):
            u = j / 3
            puff(p, sx + (hx - sx) * u, sy + (hy - sy) * u, 5 - u * 0.8, CG)
        puff(p, hx + 1, hy + 2, 5.5, CG)
        p.l(hx - 2, hy + 5, hx + 4, hy + 5, CG[0]); p.l(hx + 2, hy, hx + 2, hy + 4, CG[1])
        # head: hunched forward over the chest; brow, glowing eyes, big nose, cheeks / mouth, cloud beard
        hx_, hy_ = sc(cx + 9 + L, cy - 14, 1.3)
        for (ox, oy, rr) in ((-9, -3, 4.5), (-6, -8, 4.5), (0, -10, 4.5), (5, -9, 3.5)):                 # cloud hair
            puff(p, hx_ + ox, hy_ + oy, rr, CG)
        p.e(hx_ - 8, hy_ - 8, hx_ + 8, hy_ + 7, CG[0])
        p.e(hx_ - 7, hy_ - 7, hx_ + 7, hy_ + 6, CG[1])
        p.e(hx_ - 6, hy_ - 7, hx_ + 5, hy_ + 2, CG[2])
        p.e(hx_ - 4, hy_ - 6, hx_ + 1, hy_ - 2, CG[3])
        p.r(hx_ - 1, hy_ - 4, hx_ + 7, hy_ - 3, CG[0])                                                   # heavy brow
        p.l(hx_ - 1, hy_ - 5, hx_ + 6, hy_ - 5, CG[3])
        ec = LY1 if eyes == 1 else LT2 if eyes == 2 else CG[0]
        if eyes:
            p.r(hx_ + 1, hy_ - 2, hx_ + 5, hy_, (40, 46, 80)); p.r(hx_ + 2, hy_ - 2, hx_ + 4, hy_ - 1, ec)
            p.p(hx_ + 3, hy_ - 2, WHITE)
        else:
            p.l(hx_ + 2, hy_ - 1, hx_ + 5, hy_ - 1, CG[0])
        p.e(hx_ + 5, hy_ - 2, hx_ + 10, hy_ + 3, CG[0]); p.e(hx_ + 5, hy_ - 2, hx_ + 9, hy_ + 2, CG[2])    # nose
        p.p(hx_ + 7, hy_ - 1, CG[3])
        for i, (ox, oy, rr) in enumerate(((-4, 8, 4), (1, 9, 4.5), (6, 8, 3.5), (-1, 13, 3.5), (4, 13, 3))):   # beard
            puff(p, hx_ + ox + jit(i + 7) * 0.4, hy_ + oy, rr, CG)
        if cheeks:
            r_ = 2 + cheeks * 2
            p.e(hx_ + 4 - r_, hy_ + 5 - r_, hx_ + 4 + r_, hy_ + 5 + r_, CG[0])
            p.e(hx_ + 4 - r_ + 1, hy_ + 5 - r_ + 1, hx_ + 4 + r_ - 1, hy_ + 5 + r_ - 1, CG[2])
            p.e(hx_ + 3 - r_ * 0.4, hy_ + 4 - r_ * 0.5, hx_ + 4, hy_ + 4, CG[3])
            p.l(hx_ + 7, hy_ + 5, hx_ + 9, hy_ + 5, CG[0])
        elif blow:
            p.e(hx_ + 6, hy_ + 3, hx_ + 11, hy_ + 8, CG[0]); p.e(hx_ + 7, hy_ + 4, hx_ + 10, hy_ + 7, (40, 46, 80))
        else:
            p.l(hx_ + 4, hy_ + 5, hx_ + 9, hy_ + 5, CG[0]); p.l(hx_ + 4, hy_ + 6, hx_ + 8, hy_ + 6, CG[1])
    if blow:
        wind_streaks(p, 36 + L + dx, cy - 11, 66, 3, 3 + int(blow * 10), blow, 20)
    for i in range(int(scatter * 8)):                                         # drifting wisps when it breaks apart
        x, y = 8 + r2.random() * 48, 10 + r2.random() * 30 + scatter * 10
        puff(p, x, y, 2 + r2.random() * 2, CG)
    for i in range(mist):                                                      # a last flat mist on the floor
        puff(p, 10 + i * 8, 55, 3, CGD)
    im = outline_same(cut_below(p.im, 57))
    if fl:
        im = flash(im, fl)
    return im


@builder('cloudgiant')
def make_cloudgiant():
    G = giant_frame
    save_enemy('cloudgiant', 'idle', [G(t=i / 4, bob=(0, -1, -1, 0)[i]) for i in range(4)], 64)
    save_enemy('cloudgiant', 'movement', [G(t=i / 6, bob=(0, -1, -1, 0, 1, 1)[i], lean=2, dx=(0, 1, 2, 2, 1, 0)[i]) for i in range(6)], 64)
    att = [G(t=0.0, lean=-2, cheeks=0.4, arm=0.3), G(t=0.15, lean=-3, cheeks=0.8, arm=0.6, eyes=2), G(t=0.3, lean=-3, cheeks=1.0, arm=0.8, eyes=2),
           G(t=0.45, lean=2, blow=0.7, eyes=2, arm=0.2), G(t=0.6, lean=3, blow=1.0, eyes=2), G(t=0.75, lean=2, blow=0.6), G(t=0.9, lean=0)]
    save_enemy('cloudgiant', 'attack', att, 64)
    save_enemy('cloudgiant', 'take_damage', [G(t=0.2, dx=-3, eyes=2, fl=(255, 255, 255), scatter=0.08), G(t=0.4, dx=-2, scatter=0.04), G(t=0.6, dx=-1)], 64)
    save_enemy('cloudgiant', 'death', [G(t=0.0, eyes=2, cheeks=0.6, lean=-2), G(t=0.2, eyes=0, scatter=0.2, sink=2),
                                       G(t=0.4, eyes=0, scatter=0.45, sink=5), G(t=0.6, eyes=0, scatter=0.7, sink=8),
                                       G(t=0.8, eyes=0, scatter=0.95, sink=12, mist=5), G(t=1.0, eyes=0, scatter=1.0, sink=14, mist=6)], 64)


# ================================================================== BOSS: URMAKAREN (drawn: an old clockmaker riding a giant clockwork with gear arms)
CM = 116
CM_FEET = 115
SKN = ((150, 96, 76), (214, 160, 128), (240, 200, 170))
HAIRW = ((168, 168, 176), (218, 218, 226), (250, 250, 255))
VEST0, VEST1, VEST2 = (34, 56, 44), (56, 90, 66), (86, 124, 92)


def pipe(p, a, b, w=5, pal=(BR0, BR2, BR3)):
    """A thick brass rod from a to b: dark rim, brass body, a highlight along the top."""
    p.l(*a, *b, pal[0], w)
    p.l(*a, *b, pal[1], max(1, w - 2))
    dx, dy = b[0] - a[0], b[1] - a[1]
    ln = math.hypot(dx, dy) or 1
    nx, ny = dy / ln, -dx / ln
    if ny > 0:
        nx, ny = -nx, -ny
    o = (w - 2) / 2 - 0.5
    p.l(a[0] + nx * o, a[1] + ny * o, b[0] + nx * o, b[1] + ny * o, pal[2])


def clockmaker_man(p, x, y, t=0.0, arms=0.0, eyes=1, mouth=0, slump=0.0):
    """The old man in the cockpit, chest up: white wild hair and beard, glowing spectacles, green vest.
    arms: 0 on the levers, 1 raised (casting); slump: 0..1 sagging forward (death)."""
    y = y + slump * 6
    x = x + slump * 3
    p.e(x - 8, y + 4, x + 7, y + 18, VEST0); p.e(x - 7, y + 5, x + 6, y + 17, VEST1)            # torso, vest, white shirt
    p.poly([(x - 1, y + 5), (x + 3, y + 5), (x + 1, y + 12)], (230, 226, 214))
    p.p(x - 3, y + 10, BR3); p.p(x - 3, y + 14, BR3)
    for s_, dy in ((-1, 0), (1, 1)):                                                             # arms in white sleeves
        sx, sy = x + s_ * 6, y + 7
        if arms:
            hx, hy = x + s_ * 11, y - 4 - arms * 4 + dy
        else:
            hx, hy = x + s_ * 9 + 4, y + 16 + dy
        p.l(sx, sy, (sx + hx) / 2 + s_, (sy + hy) / 2 + 2, (200, 196, 184), 3)
        p.l((sx + hx) / 2 + s_, (sy + hy) / 2 + 2, hx, hy, (200, 196, 184), 3)
        p.e(hx - 1.5, hy - 1.5, hx + 1.5, hy + 1.5, SKN[1])
    hx, hy = x + 1, y - 3                                                                        # head
    for k in range(6):                                                                           # wild white hair
        a = math.pi + 0.3 - k * 0.55
        r = 7 + (k % 2) * 2
        p.e(hx + math.cos(a) * r - 3, hy - 1 + math.sin(a) * r - 3, hx + math.cos(a) * r + 3, hy - 1 + math.sin(a) * r + 3, HAIRW[1 if k % 2 else 0])
    p.e(hx - 6, hy - 6, hx + 6, hy + 6, SKN[0]); p.e(hx - 5, hy - 6, hx + 6, hy + 5, SKN[1])
    p.e(hx - 2, hy - 5, hx + 3, hy - 1, SKN[2])                                                  # bald pate shine
    p.e(hx - 7, hy - 3, hx - 3, hy + 3, HAIRW[1])                                                # side tufts
    p.poly([(hx - 4, hy + 2), (hx + 7, hy + 2), (hx + 5, hy + 10), (hx + 1, hy + 13), (hx - 3, hy + 8)], HAIRW[1])     # beard
    p.l(hx - 2, hy + 4, hx + 1, hy + 11, HAIRW[2]); p.l(hx + 3, hy + 4, hx + 4, hy + 10, HAIRW[0])
    p.l(hx + 1, hy + 2, hx + 7, hy + 2, HAIRW[2])                                                # moustache
    p.e(hx + 5, hy - 2, hx + 9, hy + 2, SKN[0]); p.e(hx + 5, hy - 2, hx + 8, hy + 1, SKN[1])      # big nose
    ec = TC2 if eyes == 1 else WHITE if eyes == 2 else BR1
    for ex in (hx + 1, hx + 5):                                                                  # round spectacles
        p.e(ex - 2, hy - 4, ex + 2, hy, BR1)
        p.e(ex - 1, hy - 3, ex + 1, hy - 1, ec)
    p.l(hx + 3, hy - 2, hx + 3, hy - 2, BR1)
    p.e(hx + 6, hy - 9, hx + 10, hy - 5, BR2); p.e(hx + 7, hy - 8, hx + 9, hy - 6, TC1)            # a loupe pushed up on the brow
    if mouth:
        p.e(hx + 3, hy + 3, hx + 6, hy + 4 + mouth, (90, 30, 30))


def cm_frame(t=0.0, bob=0, arm=None, back_arm=None, face_glow=0, hands=0.0, man_arms=0.0, eyes=1, mouth=0, fl=None,
             rings=0, sparks=0, smoke=1, tilt=0.0, crack=0, slump=0.0, legs=1.0, dx=0, impact=0):
    """arm / back_arm: (elbow, hand) of the front / back gear arm; face_glow: the clock face lights up cyan (0..2);
    hands: turns of the clock hands; rings: time rings radiating (cast)."""
    p = Pic(CM, CM)
    cx, cy = 56 + dx, 66 + bob
    if arm is None:
        arm = ((92, 78), (100, 96))
    if back_arm is None:
        back_arm = ((20, 74), (16, 92))
    # smoke from the chimney
    for k in range(smoke + 1):
        sy = cy - 50 - k * 9 - (t * 9) % 9
        puff(p, cx - 26 + k * 2 + math.sin(t * math.tau + k) * 2, sy, 4 + k, ((70, 70, 80), (110, 110, 120), (150, 150, 160), (190, 190, 200)))
    p.r(cx - 30, cy - 46, cx - 22, cy - 26, DI1); p.r(cx - 29, cy - 46, cx - 27, cy - 26, DI3)   # chimney
    p.r(cx - 32, cy - 48, cx - 20, cy - 45, BR1); p.l(cx - 32, cy - 48, cx - 20, cy - 48, BR3)
    # back gear arm (darker)
    bsh = (cx - 18, cy - 10)
    be, bh = back_arm
    pipe(p, bsh, (be[0] + dx, be[1] + bob), 6, (BR0, BR1, BR2))
    pipe(p, (be[0] + dx, be[1] + bob), (bh[0] + dx, bh[1] + bob), 5, (BR0, BR1, BR2))
    gear(p, be[0] + dx, be[1] + bob, 5, 7, -t * 2, (BR0, BR1, BR2, BR3), hole=BR0)
    clx, cly = bh[0] + dx, bh[1] + bob                                                           # pincer
    p.poly([(clx - 4, cly - 2), (clx + 4, cly - 2), (clx + 6, cly + 8), (clx + 2, cly + 4)], DI2)
    p.poly([(clx - 4, cly - 2), (clx - 6, cly + 8), (clx - 2, cly + 4)], DI2)
    # legs: pistons and heavy feet
    for k, lx in enumerate((cx - 14, cx + 12)):
        top = cy + 18
        pipe(p, (lx, top), (lx, CM_FEET - 8), 7, (DI0, DI2, DI3) if k == 0 else (BR0, BR2, BR3))
        p.r(lx - 2, top + 8, lx + 2, top + 14 * legs, M2 if k else M1)
        p.r(lx - 8, CM_FEET - 8, lx + 9, CM_FEET, BR0)
        p.r(lx - 7, CM_FEET - 7, lx + 8, CM_FEET - 1, BR2 if k else BR1)
        p.l(lx - 7, CM_FEET - 7, lx + 8, CM_FEET - 7, BR3 if k else BR2)
        for rx in (lx - 5, lx + 6):
            p.p(rx, CM_FEET - 4, BR4)
    # pendulum swinging under the body
    pa = math.sin(t * math.tau) * 0.5
    px_, py_ = cx + math.sin(pa) * 18, cy + 18 + math.cos(pa) * 18
    p.l(cx, cy + 16, px_, py_, BR3)
    p.e(px_ - 4, py_ - 4, px_ + 4, py_ + 4, BR0); p.e(px_ - 3, py_ - 3, px_ + 3, py_ + 3, BR2); p.p(px_ - 1, py_ - 1, BR4)
    # the clockwork body: a big round brass housing, gears showing through cut-outs, the clock face on the front
    p.e(cx - 30, cy - 26, cx + 30, cy + 24, BR0)
    p.e(cx - 29, cy - 25, cx + 29, cy + 23, BR1)
    p.e(cx - 28, cy - 25, cx + 24, cy + 16, BR2)
    p.arc(cx - 27, cy - 24, cx + 27, cy + 22, 190, 260, BR4)
    for (gx, gy, gr, gn, d) in ((-17, -10, 9, 10, 1), (-14, 10, 7, 8, -1), (20, -14, 6, 7, -1)):
        p.e(cx + gx - gr - 3, cy + gy - gr - 3, cx + gx + gr + 3, cy + gy + gr + 3, DI0)
        gear(p, cx + gx, cy + gy, gr, gn, d * t * math.tau / gn * 2, (CU0, CU1, CU2, CU3) if gn == 8 else (BR1, BR2, BR3, BR4), hole=DI0)
    for k in range(10):                                                                          # rivets round the rim
        a = k / 10 * math.tau
        p.p(cx + math.cos(a) * 27, cy - 1 + math.sin(a) * 23, BR4)
    fx, fy = cx + 8, cy + 2
    if face_glow:
        gr_ = 17 + face_glow * 2
        p.e(fx - gr_, fy - gr_, fx + gr_, fy + gr_, TC0)
    clockface(p, fx, fy, 15, hands, face=TC2 if face_glow > 1 else DIAL1, face2=TC1 if face_glow else DIAL0, glow=face_glow > 0)
    if crack:
        r2 = random.Random(crack)
        for _ in range(crack + 1):
            x0, y0 = fx + r2.randint(-8, 8), fy + r2.randint(-8, 8)
            for k in range(4):
                x1, y1 = x0 + r2.randint(-3, 3), y0 + r2.randint(-3, 3)
                p.l(x0, y0, x1, y1, OUT); x0, y0 = x1, y1
    # cockpit: a brass tub on top with the old clockmaker at the levers
    clockmaker_man(p, cx + 2, cy - 41, t, man_arms, eyes, mouth, slump)
    p.e(cx - 18, cy - 32, cx + 20, cy - 16, BR0)
    p.e(cx - 17, cy - 31, cx + 19, cy - 17, BR2)
    p.l(cx - 15, cy - 30, cx + 17, cy - 30, BR4)
    for k in range(5):
        p.p(cx - 12 + k * 7, cy - 24, BR4)
    p.l(cx + 12, cy - 28, cx + 16, cy - 36, I2); p.e(cx + 14, cy - 38, cx + 18, cy - 34, (200, 40, 40))    # a lever
    # front gear arm
    fsh = (cx + 22, cy - 8)
    e_, h_ = arm
    e_ = (e_[0] + dx, e_[1] + bob); h_ = (h_[0] + dx, h_[1] + bob)
    pipe(p, fsh, e_, 8)
    pipe(p, e_, h_, 7)
    gear(p, *fsh, 7, 9, t * 2, hole=BR0)
    gear(p, *e_, 6, 8, -t * 3, hole=BR0)
    # the hand: a heavy hammer head across the forearm end
    ux, uy = h_[0] - e_[0], h_[1] - e_[1]
    ln = math.hypot(ux, uy) or 1
    ux, uy = ux / ln, uy / ln
    vx, vy = -uy, ux
    hp = [(h_[0] + vx * 9, h_[1] + vy * 9), (h_[0] + vx * 9 + ux * 9, h_[1] + vy * 9 + uy * 9),
          (h_[0] - vx * 9 + ux * 9, h_[1] - vy * 9 + uy * 9), (h_[0] - vx * 9, h_[1] - vy * 9)]
    p.poly(hp, DI1)
    p.poly([hp[0], hp[1], ((hp[0][0] + hp[3][0]) / 2 + ux * 9, (hp[0][1] + hp[3][1]) / 2 + uy * 9), ((hp[0][0] + hp[3][0]) / 2, (hp[0][1] + hp[3][1]) / 2)], DI3)
    p.l(*hp[0], *hp[3], BR2, 2); p.l(*hp[1], *hp[2], M2)
    if impact:                                                                   # sparks and grit where the hammer lands
        for k in range(9):
            a = math.pi + (k + 0.5) / 9 * math.pi
            d = 10 + impact * 4
            x1, y1 = h_[0] + math.cos(a) * d, min(CM_FEET, h_[1] + 6 + math.sin(a) * d * 0.6)
            p.l(h_[0] + math.cos(a) * 4, min(CM_FEET, h_[1] + 6 + math.sin(a) * 3), x1, y1, GL2 if k % 2 else GL3)
    if rings:                                                                    # cast: rings of time rolling out from the face
        for r_ in range(rings):
            rr = 20 + r_ * 9
            p.arc(fx - rr, fy - rr * 0.8, fx + rr, fy + rr * 0.8, -60 + t * 90, 60 + t * 90, TC1 if r_ % 2 else TC2, 2)
            p.arc(fx - rr, fy - rr * 0.8, fx + rr, fy + rr * 0.8, 120 + t * 90, 240 + t * 90, TC1 if r_ % 2 else TC2, 2)
    if sparks:
        r2 = random.Random(sparks)
        for _ in range(8):
            x, y = cx + r2.randint(-30, 30), cy + r2.randint(-30, 20)
            p.ps([(x, y), (x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)], GL2); p.p(x, y, GL3)
    im = p.im
    if tilt:
        im = im.rotate(tilt, resample=Image.NEAREST, center=(cx, CM_FEET))
    im = outline_same(cut_below(ground(im, CM_FEET) if tilt else im, CM_FEET))
    if fl:
        im = flash(im, fl)
    return im


def cm_wreck(k):
    """The machine lies broken on the floor: the cracked housing on its side, scattered cogs, a sprung coil, the old
    man slumped over the rim."""
    p = Pic(CM, CM)
    cx, cy = 58, CM_FEET - 18
    for (x, r, n) in ((18, 6, 8), (30, 4, 6), (96, 5, 7), (104, 3, 5), (84, 3.5, 6)):
        gear(p, x, CM_FEET - r - 1, r, n, x * 0.3 + k, hole=BR0)
    p.lines([(70, CM_FEET - 2), (74, CM_FEET - 10), (78, CM_FEET - 2), (82, CM_FEET - 10), (86, CM_FEET - 2)], M2, 2)
    p.e(cx - 32, cy - 16, cx + 26, cy + 18, BR0)
    p.e(cx - 31, cy - 15, cx + 25, cy + 17, BR1)
    p.e(cx - 30, cy - 15, cx + 20, cy + 10, BR2)
    clockface(p, cx - 4, cy + 1, 12, 0.6)
    for (x0, y0) in ((cx - 8, cy - 6), (cx + 2, cy + 4), (cx - 10, cy + 6)):
        p.l(x0, y0, x0 + 4, y0 + 3, OUT); p.l(x0 + 4, y0 + 3, x0 + 2, y0 + 7, OUT)
    clockmaker_man(p, cx + 30, cy - 10 + k, 0, 0, 0, 0, 1.0)
    p.e(cx + 18, cy - 4, cx + 44, cy + 10, BR0); p.e(cx + 19, cy - 3, cx + 43, cy + 9, BR2)
    for k2 in range(3 - k):
        puff(p, 40 + k2 * 10, cy - 24 - k2 * 6 - k * 4, 3 + k2, ((70, 70, 80), (110, 110, 120), (150, 150, 160), (190, 190, 200)))
    return outline_same(cut_below(p.im, CM_FEET))


@builder('clockmaker')
def make_clockmaker():
    C = cm_frame
    sv = lambda st, fr: save(cells(fr, CM, CM), G_OUT + f'boss_clockmaker_{st}.png', len(fr))
    sv('idle', [C(t=i / 5, bob=(0, 0, 1, 1, 0)[i], hands=i / 60) for i in range(5)])
    sv('attack', [C(t=0.0, arm=((96, 54), (104, 34)), man_arms=0.0, eyes=2),                            # the hammer arm rises
                  C(t=0.15, arm=((94, 40), (90, 18)), eyes=2, mouth=1),
                  C(t=0.3, arm=((96, 38), (85, 16)), eyes=2, mouth=2),
                  C(t=0.45, arm=((102, 66), (106, 100)), eyes=2, impact=1, bob=1),                     # ... and slams down
                  C(t=0.6, arm=((102, 68), (106, 102)), eyes=2, impact=2, bob=1),
                  C(t=0.8, arm=((96, 74), (102, 94)))])
    sv('cast', [C(t=i / 6, face_glow=g, hands=i * 0.2, man_arms=a, eyes=2 if g > 1 else 1, rings=r, mouth=1 if g > 1 else 0)
                for i, (g, a, r) in enumerate(((1, 0.3, 0), (1, 0.7, 1), (2, 1.0, 2), (2, 1.0, 3), (2, 0.8, 3), (1, 0.3, 1)))])
    sv('hurt', [C(t=0.1, dx=-4, eyes=2, mouth=2, fl=(255, 255, 255), sparks=1), C(t=0.2, dx=-2, sparks=2, mouth=1), C(t=0.3, dx=-1)])
    d = [C(t=0.0, eyes=2, mouth=2, sparks=3, crack=2, smoke=2), C(t=0.1, eyes=2, mouth=2, sparks=4, crack=4, smoke=3, arm=((96, 84), (98, 104))),
         C(t=0.2, eyes=0, sparks=5, crack=6, smoke=3, tilt=-8, slump=0.5, arm=((98, 90), (108, 108)), legs=0.6),
         C(t=0.3, eyes=0, crack=8, smoke=2, tilt=-20, slump=1.0, arm=((100, 96), (112, 110)), legs=0.3, sparks=6)]
    d += [cm_wreck(0), cm_wreck(1), cm_wreck(2)]
    sv('death', d)


# ================================================================== BOSS: STORMFÅGELN (drawn: a giant eagle of storm with lightning plumage)
TB = 120
TBF = ((22, 24, 58), (40, 48, 104), (66, 82, 156), (120, 150, 220))              # plumage
TBD = ((16, 16, 40), (30, 34, 78), (48, 60, 120), (88, 112, 180))                 # far wing
BEAK0, BEAK1, BEAK2 = (150, 100, 20), (230, 176, 50), (255, 228, 120)


def storm_wing(p, root, theta, ln, pal, fold=0.0, spread=1.0, charge=0, seed=0):
    tip = wing(p, root, theta, ln, pal, n=10, spread=spread, fold=fold, fsz=2.3, arm=7, back=2.75)
    # lightning-yellow bars on the leading edge feathers
    for k in range(3):
        s_ = 0.35 + k * 0.2
        x, y = root[0] + (tip[0] - root[0]) * s_, root[1] + (tip[1] - root[1]) * s_
        p.l(x - 2, y + 1, x + 2, y - 1, LY1)
    if charge:                                                                  # arcs crackling along the wing
        r2 = random.Random(seed)
        for k in range(charge):
            s0 = r2.uniform(0.2, 0.9)
            x0, y0 = root[0] + (tip[0] - root[0]) * s0, root[1] + (tip[1] - root[1]) * s0
            a = r2.uniform(0, math.tau)
            bolt(p, x0, y0, x0 + math.cos(a) * 12, y0 + math.sin(a) * 12, seed + k, 1, (LT0, LT1, LT3), 2, 0)
    return tip


def tb_frame(w=0.5, bob=0, tilt=0.0, beak=0.0, eyes=1, crest=1.0, fold=0.0, reach=0.0, charge=0, fl=None, dx=0, dy=0,
             sky=0, breath=0, limp=0.0, feathers=0, t=0.0, legs=True):
    """w: wing stroke (0 up .. 1 down); beak 0..1 open; charge: arcs on the wings; sky: bolts striking down around it (cast);
    breath: a bolt shot forward from the beak (attack)."""
    p = Pic(TB, TB)
    cx, cy = 60, 66 + bob
    th = math.radians(-126 - w * 84)
    th_far = math.radians(-126 - min(1, w + 0.12) * 84)
    storm_wing(p, (cx - 6, cy - 12), th_far + limp, 26 * (1 - fold * 0.3), TBD, fold, 1 - limp * 0.3, charge // 2, 11)
    for k, a in enumerate((2.6, 2.8, 3.0, 3.2, 3.4)):                            # fanned tail with zig-zag tips
        tx, ty = cx - 14, cy + 6
        ln = 24 - abs(k - 2) * 2
        feather(p, tx, ty, a + limp * 0.4, ln, 5, TBF if k % 2 else TBD, TBF[3])
        ex, ey = tx + math.cos(a + limp * 0.4) * ln, ty + math.sin(a + limp * 0.4) * ln
        p.l(ex, ey, ex + 2, ey - 2, LY1); p.l(ex + 2, ey - 2, ex + 4, ey, LY1)
    # far leg
    def leg(hx, hy, col, col2):
        kx, ky = hx + 2 + reach * 12, hy + 9 - reach * 4
        fx, fy = kx + 2 + reach * 10, ky + 8 - reach * 6
        p.e(hx - 6, hy - 6, hx + 6, hy + 8, col)                                 # feathered 'trousers'
        p.l(hx - 3, hy + 6, hx + 3, hy + 6, TBF[3])
        p.l(hx, hy + 4, kx, ky, BEAK0, 4); p.l(kx, ky, fx, fy, BEAK0, 4)
        p.l(hx, hy + 4, kx, ky, col2, 2); p.l(kx, ky, fx, fy, col2, 2)
        for da, ln in ((-0.6 - reach * 0.4, 7), (0.0, 8), (0.6 + reach * 0.3, 7), (math.pi - 0.3, 5)):
            a = (-0.1 + reach * 0.3 if reach else 1.25) + da
            x1, y1 = fx + math.cos(a) * ln, fy + math.sin(a) * ln
            p.l(fx, fy, x1, y1, col2, 2)
            p.l(x1, y1, x1 + math.cos(a + 1.3) * 2, y1 + math.sin(a + 1.3) * 2, TAL, 2)
    if legs:
        leg(cx - 2, cy + 14, TBD[1], BEAK1)
    # body: a powerful chest leaning forward, lightning chevrons on the breast
    body = [(cx + 16, cy - 16), (cx + 18, cy + 2), (cx + 8, cy + 16), (cx - 8, cy + 18), (cx - 20, cy + 8), (cx - 22, cy - 4), (cx - 8, cy - 16)]
    p.poly(body, TBF[0])
    p.poly([(x + (cx - x) * 0.08, y + (cy - y) * 0.08) for x, y in body], TBF[1])
    p.poly([(cx + 14, cy - 14), (cx + 16, cy), (cx + 6, cy + 10), (cx - 6, cy + 2), (cx - 8, cy - 14)], TBF[2])
    for k in range(4):
        yy_ = cy - 8 + k * 6
        p.lines([(cx + 2 - k, yy_), (cx + 6 - k, yy_ + 3), (cx + 10 - k, yy_), (cx + 14 - k * 2, yy_ + 3)], LY1 if k % 2 == 0 else LT2, 1)
    if legs:
        leg(cx + 4, cy + 14, TBF[1], BEAK2)
    # neck and head: hooked beak, glowing eye, a crest of lightning-shaped plumes
    hx, hy = cx + 24, cy - 26
    p.poly([(cx + 4, cy - 16), (hx - 8, hy - 2), (hx + 2, hy + 8), (cx + 18, cy - 2)], TBF[1])
    p.poly([(cx + 2, cy - 10), (hx - 6, hy - 4), (hx + 4, hy + 6), (cx + 14, cy + 4)], TBF[1])
    p.l(cx + 4, cy - 10, hx - 4, hy - 4, TBF[3])
    for k in range(4):                                                            # crest: jagged plumes swept back
        a = math.pi + 0.55 - k * 0.28
        ln = (12 + k * 3) * crest
        x1, y1 = hx - 4 + math.cos(a) * ln, hy - 4 + math.sin(a) * ln
        mx, my = (hx - 4 + x1) / 2 + 2, (hy - 4 + y1) / 2 + 2
        p.lines([(hx - 4, hy - 4), (mx, my), (mx - 1, my - 3), (x1, y1)], LY0, 4)
        p.lines([(hx - 4, hy - 4), (mx, my), (mx - 1, my - 3), (x1, y1)], LY1 if k % 2 else LY2, 2)
    p.e(hx - 10, hy - 10, hx + 10, hy + 9, TBF[0])
    p.e(hx - 9, hy - 9, hx + 9, hy + 8, TBF[1])
    p.e(hx - 8, hy - 9, hx + 6, hy + 2, TBF[2])
    p.lines([(hx - 5, hy + 2), (hx - 1, hy + 4), (hx + 1, hy + 2), (hx + 5, hy + 4)], LY1)    # lightning mark under the eye
    o = beak * 7
    p.poly([(hx + 5, hy - 4), (hx + 18, hy - 2), (hx + 20, hy + 3), (hx + 15, hy + 1), (hx + 6, hy + 1)], BEAK0)    # upper beak
    p.poly([(hx + 6, hy - 3), (hx + 17, hy - 1.5), (hx + 18, hy + 2), (hx + 7, hy)], BEAK1)
    p.l(hx + 7, hy - 3, hx + 16, hy - 2, BEAK2)
    p.poly([(hx + 6, hy + 2), (hx + 15, hy + 2 + o), (hx + 14, hy + 4 + o), (hx + 6, hy + 5)], BEAK0)                 # lower beak
    if beak > 0.2:
        p.poly([(hx + 7, hy + 1), (hx + 15, hy + 1), (hx + 14, hy + 2 + o)], (120, 20, 40))
    ec = LT3 if eyes == 1 else LY2 if eyes == 2 else TBF[0]
    p.e(hx, hy - 5, hx + 5, hy - 1, OUT)
    if eyes:
        p.e(hx + 1, hy - 4, hx + 4, hy - 2, ec); p.p(hx + 3, hy - 3, LT0 if eyes == 1 else WHITE)
    p.l(hx - 1, hy - 6, hx + 6, hy - 5, TBF[0])                                    # fierce brow
    # near wing
    storm_wing(p, (cx + 2, cy - 10), th + limp * 1.2, 30 * (1 - fold * 0.3), TBF, fold, 1 - limp * 0.3, charge, 21)
    if feathers:
        r2 = random.Random(feathers)
        for _ in range(6):
            feather(p, cx + r2.randint(-30, 30), cy + r2.randint(-30, 26), r2.uniform(0, math.tau), 9, 2.5, TBF, TBF[3])
    im = p.im
    if tilt:
        im = im.rotate(tilt, resample=Image.NEAREST, center=(cx, cy))
    im = shift(im, dx, dy)
    q = Pic(TB, TB)
    if breath:                                                                    # a bolt shot from the beak
        mx, my = hx + 20 + dx, hy + 1 + dy
        bolt(q, mx, my, TB - 1, my + 10 * breath, 31 + breath, 2, (LT0, LT1, LT3), 3, 2)
        q.e(mx - 4, my - 4, mx + 4, my + 4, LT1); q.e(mx - 2, my - 2, mx + 2, my + 2, LT3)
    for k in range(min(3, sky)):                                                  # cast: bolts striking down around it
        x = (10, 108, 26)[k]
        bolt(q, x + (t * 7) % 5, 0, x - 4 + k * 2, TB - 2, 40 + k + int(t * 10), 1, (LT0, LT1, LT3), 3, 1)
    im = outline_same(im)
    if breath or sky:
        im = on(outline_same(q.im), im) if sky else on(im, outline_same(q.im))
    if fl:
        im = flash(im, fl)
    return im


@builder('thunderbird')
def make_thunderbird():
    B = tb_frame
    sv = lambda st, fr: save(cells(fr, TB, TB), G_OUT + f'boss_thunderbird_{st}.png', len(fr))
    sv('idle', [B(w=w, bob=b, charge=1 if i % 3 == 0 else 0, t=i / 6) for i, (w, b) in
                enumerate(((0.0, 2), (0.3, 1), (0.65, 0), (1.0, -2), (0.65, -1), (0.3, 1)))])
    sv('attack', [B(w=0.0, bob=-2, beak=0.4, eyes=2, charge=2, tilt=8), B(w=0.1, bob=-3, beak=0.8, eyes=2, charge=4, tilt=10),
                  B(w=0.5, beak=1.0, eyes=2, charge=2, breath=2, tilt=-4, dx=-5), B(w=0.8, beak=1.0, eyes=2, breath=1, tilt=-6, dx=-4),
                  B(w=0.6, beak=0.3, tilt=-2, dx=-2), B(w=0.3)])
    sv('cast', [B(w=0.0, bob=-3, beak=0.6, eyes=2, charge=3, crest=1.2, t=0.0), B(w=0.0, bob=-4, beak=1.0, eyes=2, charge=5, crest=1.3, sky=2, t=0.2),
                B(w=0.1, bob=-4, beak=1.0, eyes=2, charge=5, crest=1.3, sky=4, t=0.4), B(w=0.2, bob=-3, beak=0.8, eyes=2, charge=4, crest=1.3, sky=5, t=0.6),
                B(w=0.5, bob=-1, beak=0.4, eyes=2, charge=2, crest=1.1, sky=2, t=0.8), B(w=0.3, charge=1, t=1.0)])
    sv('hurt', [B(w=0.2, dx=-5, tilt=10, beak=0.8, eyes=2, fl=(255, 255, 255), feathers=3), B(w=0.4, dx=-3, tilt=6, feathers=4), B(w=0.5, dx=-1)])
    d = [B(w=0.0, beak=1.0, eyes=2, tilt=14, charge=6, feathers=5), B(w=0.4, beak=0.8, eyes=0, tilt=-20, limp=0.4, dy=10, feathers=6),
         B(w=0.7, beak=0.5, eyes=0, tilt=-50, limp=0.8, dy=22, feathers=7)]
    for k in range(4):                                                            # crashed, lying with the wings draped on the floor
        im = B(w=0.35, beak=0.3, eyes=0, tilt=-30, crest=0.7, charge=2 - k if k < 2 else 0, t=k, legs=False)
        im = ground(im, TB - 1)
        q = Pic(TB, TB)
        for (x, a) in ((10, -0.3), (100, 3.4), (24, 0.2), (88, 3.0))[:k + 1]:
            feather(q, x, TB - 3, a, 9, 2.4, TBF, TBF[3])
        d.append(on(im, outline_same(q.im)))
    sv('death', d)
    sv('dive', [B(w=0.0, bob=-6, beak=0.5, eyes=2, tilt=12), B(w=0.1, bob=-4, fold=0.6, eyes=2, tilt=-15),
                B(w=0.2, fold=1.0, reach=0.6, eyes=2, tilt=-40, dx=6, dy=6), B(w=0.25, fold=1.0, reach=1.0, eyes=2, beak=0.8, tilt=-48, dx=10, dy=12, charge=3),
                B(w=0.9, reach=1.0, eyes=2, beak=1.0, tilt=-15, dx=10, dy=10, charge=2), B(w=0.4, reach=0.3, tilt=4, dx=4)])


# ================================================================== PROPS
strip = P2.strip


def save_prop(name, frames, path=None):
    return save(strip(frames), path or G_OUT + f'prop_{name}.png', len(frames))


def clockwork(k):
    """A free-standing clockwork: stone-and-brass plinth, a frame of turning gears, a clock face and a swinging pendulum."""
    p = Pic(38, 50)
    p.r(3, 43, 34, 49, BR0); p.r(4, 43, 33, 47, BR1); p.l(4, 43, 33, 43, BR3)                  # plinth
    p.r(6, 8, 31, 43, DI1); p.r(7, 9, 30, 42, DI2); p.l(7, 9, 30, 9, DI3)                       # back plate
    pa = math.sin(k / 4 * math.tau) * 0.45                                                         # pendulum behind the gears
    px_, py_ = 19 + math.sin(pa) * 14, 26 + math.cos(pa) * 14
    p.l(19, 26, px_, py_, BR3); p.e(px_ - 3, py_ - 3, px_ + 3, py_ + 3, BR0); p.e(px_ - 2, py_ - 2, px_ + 2, py_ + 2, BR3)
    ph = k / 4 * math.tau / 8
    gear(p, 12, 30, 6, 8, ph, hole=DI0)
    gear(p, 26, 34, 5, 7, -ph * 8 / 7 + 0.3, (CU0, CU1, CU2, CU3), hole=DI0)
    gear(p, 27, 21, 4, 6, ph * 8 / 6, hole=DI0, spokes=0)
    clockface(p, 15, 15, 7, k / 4)
    p.r(4, 4, 33, 8, BR1); p.l(4, 4, 33, 4, BR3); p.poly([(10, 4), (19, -1 + 1), (28, 4)], BR2)   # pediment
    p.p(19, 1, BR4)
    for (x, y) in ((8, 41), (29, 41), (8, 11), (29, 11)):
        p.p(x, y, BR4)
    return outline(p.im)


def lightningrod(spark):
    """An iron lightning rod on a stone footing, a copper coil and a glass insulator; sparks crackle on its tip."""
    p = Pic(26, 64)
    p.r(5, 56, 20, 63, S1); p.r(6, 56, 19, 58, S3); p.l(5, 63, 20, 63, S0)
    p.r(11, 8, 14, 56, I1); p.l(11, 8, 11, 56, I3)
    for y in range(28, 44, 2):                                                       # copper coil
        p.l(9, y, 16, y + 1, CU1); p.p(9, y, CU3)
    p.e(8, 20, 17, 25, (120, 180, 170)); p.e(9, 20, 15, 23, (180, 230, 220))            # glass insulator
    p.poly([(12, 0), (14, 0), (15, 8), (10, 8)], M2); p.l(12, 1, 12, 8, M3)
    for y in (46, 50, 54):
        p.l(10, y, 15, y, I0)
    if spark:
        q = Pic(26, 64)
        for k, (x1, y1) in enumerate(((3, 2), (23, 6), (6, 12), (21, 0))):
            bolt(q, 13, 1, x1, y1, 50 + k, 1, (LT0, LT1, LT3), 1.2, 0)
        q.e(10, -1, 16, 4, LT2)
        return on(outline(p.im), outline(q.im))
    return outline(p.im)


def chimes(k):
    """Wind chimes: a carved frame hung with five brass tubes; k = 1 they swing and ring."""
    p = Pic(36, 52)
    p.r(2, 48, 33, 51, W0); p.r(3, 48, 32, 49, W3)
    for x in (4, 31):
        p.r(x - 1, 6, x + 1, 48, W1); p.l(x - 1, 6, x - 1, 48, W3)
    p.r(1, 3, 34, 7, W2); p.l(1, 3, 34, 3, W4); p.l(1, 7, 34, 7, W0)
    for i, (x, ln) in enumerate(((9, 26), (13, 30), (18, 34), (23, 30), (27, 26))):
        sw = (math.sin(i * 1.7) * 3 if k else 0)
        p.l(x, 8, x + sw * 0.3, 11, (160, 150, 120))
        x1 = x + sw * 0.3
        p.l(x1 + sw * 0.2, 11, x1 + sw, 11 + ln * 0.85, BR1, 3)
        p.l(x1 + sw * 0.2 - 1, 11, x1 + sw - 1, 11 + ln * 0.85, BR3)
    p.e(15, 41, 21, 45, BR2); p.l(18, 38, 18, 41, (160, 150, 120))                          # striker
    if k:
        for (x, y) in ((2, 14), (32, 18), (6, 26)):
            q = Pic(8, 9); P6.note(q, 1, 6, (255, 240, 180)); p.paste(outline_same(q.im), x - 1, y - 6)
    return outline(p.im)


def cloudchest(open_):
    """A white-and-gold chest carved with cloud swirls, resting on a little cloud; open: gold and feathers inside."""
    p = Pic(36, 34)
    for (x, r) in ((6, 4), (13, 5), (22, 5), (30, 4)):
        puff(p, x, 30, r)
    bx0, bx1, top, base = 4, 31, 15, 29
    p.r(bx0, top, bx1, base, MB1); p.r(bx0, top, bx1, top + 1, MB3)
    p.l(bx0, base, bx1, base, MB0)
    for x in (bx0 + 3, bx1 - 3):
        p.r(x - 1, top, x + 1, base, AU1); p.l(x, top, x, base, AU3)
    for cx_ in (12, 23):                                                              # cloud swirls carved in the front
        p.arc(cx_ - 3, 19, cx_ + 3, 25, 180, 450, CL0)
        p.arc(cx_ - 1, 21, cx_ + 1, 23, 0, 270, CL0)
    if open_:
        p.poly([(bx0, top), (bx0 + 2, top - 3), (bx1 - 2, top - 3), (bx1, top)], (40, 52, 90))
        p.e(10, top - 6, 26, top + 2, (90, 130, 200))                                     # pale light
        for (x, y, c) in ((11, 12, AU3), (15, 11, AU2), (20, 12, AU3), (24, 11, AU2)):
            p.e(x - 1, y - 1, x + 1, y + 1, c); p.p(x - 1, y - 1, AU4)
        feather(p, 17, 12, -1.9, 10, 2.2, (CL0, CL3, WHITE, CL1))
        lid = Pic(32, 10)
        lid.poly([(0, 9), (2, 2), (29, 2), (31, 9)], MB2); lid.l(2, 2, 29, 2, MB3); lid.l(0, 9, 31, 9, MB0)
        lid.r(4, 2, 5, 9, AU1); lid.r(26, 2, 27, 9, AU1)
        lr = lid.im.rotate(-8, resample=Image.NEAREST, expand=True)
        p.paste(lr.transpose(Image.FLIP_TOP_BOTTOM), bx0 - 1, top - 13)
        p.ps([(28, 3), (6, 5), (31, 8)], AU4)
    else:
        p.poly([(bx0, top), (bx0 + 2, top - 7), (bx1 - 2, top - 7), (bx1, top)], MB2)
        p.l(bx0 + 2, top - 7, bx1 - 2, top - 7, MB3)
        p.l(bx0 + 1, top - 3, bx1 - 1, top - 3, AU2)
        for x in (bx0 + 3, bx1 - 3):
            p.l(x, top - 7, x, top, AU1)
        p.r(16, top - 2, 19, top + 3, AU2); p.r(17, top, 18, top + 1, (40, 30, 20))
        feather(p, 22, top - 7, -1.2, 7, 1.6, (CL0, CL3, WHITE, CL1))                     # a feather tucked under the lid
    return outline(cut_below(p.im, 33))


def sawblade(k):
    """A spinning saw blade half sunk in its floor slot (the slot is in floor_sawtrack)."""
    p = Pic(30, 28)
    cx, cy, r = 15, 15, 11
    ph = k / 4 * math.tau / 14
    pts = []
    for i in range(14 * 3):
        a = ph + i / (14 * 3) * math.tau
        rr = r + 3 if i % 3 == 0 else r + 1 if i % 3 == 1 else r
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    p.poly(pts, M0)
    p.e(cx - r, cy - r, cx + r, cy + r, M1)
    p.e(cx - r + 1, cy - r + 1, cx + r * 0.4, cy + r * 0.4, M2)
    for j in range(3):                                                               # motion streaks on the disc
        a = ph * 3 + j * math.tau / 3
        p.arc(cx - 7, cy - 7, cx + 7, cy + 7, math.degrees(a), math.degrees(a) + 50, M3)
    p.e(cx - 3, cy - 3, cx + 3, cy + 3, DI1); p.e(cx - 2, cy - 2, cx + 2, cy + 2, BR2); p.p(cx, cy, BR4)
    for i in range(3):                                                               # bolts on the hub ring
        a = ph + i * math.tau / 3
        p.p(cx + math.cos(a) * 5, cy + math.sin(a) * 5, DI0)
    a = np.array(p.im); a[24:] = 0; p.im = Image.fromarray(a); p.d = ImageDraw.Draw(p.im)
    p.r(2, 23, 27, 24, DI0); p.l(2, 23, 27, 23, DI2)                                    # the slot lip
    for i in range(2):                                                               # sparks thrown off the floor
        x = 22 + ((k + i * 2) % 4) * 2
        p.p(x, 21 - i * 2 - k % 2, GL3); p.p(x + 1, 22 - i * 2, GL2)
    return outline(p.im)


def timebubble(k):
    """A big bubble of slowed time: a thin ring with clock ticks round it, a glint and slow motes (binary alpha: just the rim)."""
    p = Pic(52, 52)
    cx = cy = 25.5
    r = 23
    p.eo(cx - r, cy - r, cx + r, cy + r, TC1)
    p.eo(cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1, TC0)
    p.arc(cx - r, cy - r, cx + r, cy + r, 200, 250, TC3)
    p.arc(cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2, 205, 240, TC2)
    for i in range(12):                                                              # clock ticks, turning slowly
        a = i / 12 * math.tau + k * math.tau / 48
        x0, y0 = cx + math.cos(a) * (r - 2), cy + math.sin(a) * (r - 2)
        x1, y1 = cx + math.cos(a) * (r - (5 if i % 3 == 0 else 3)), cy + math.sin(a) * (r - (5 if i % 3 == 0 else 3))
        p.l(x0, y0, x1, y1, TC2 if i % 3 else TC3)
    gx, gy = (16, 12) if k == 0 else (14, 14)
    p.l(gx - 2, gy, gx + 2, gy, WHITE); p.l(gx, gy - 2, gx, gy + 2, WHITE)
    r2 = random.Random(k)
    for _ in range(5):
        a = r2.uniform(0, math.tau); d = r2.uniform(4, 15)
        p.p(cx + math.cos(a) * d, cy + math.sin(a) * d, TC2)
    return p.im


def windgust(k):
    """A whirl of wind: curved white streaks spiralling, with a few leaves of cloud caught in it."""
    p = Pic(36, 40)
    cx, cy = 18, 22
    for j in range(4):
        a0 = k * 90 + j * 90
        rr = 6 + j * 3
        p.arc(cx - rr, cy - rr * 0.7 - j, cx + rr, cy + rr * 0.7 - j, a0, a0 + 150, CL3 if j % 2 else CL2, 2)
        p.arc(cx - rr + 1, cy - rr * 0.7 - j + 1, cx + rr - 1, cy + rr * 0.7 - j - 1, a0 + 20, a0 + 120, WHITE)
    for j in range(3):                                                               # a funnel of streaks rising off the floor
        y = 36 - j * 3
        w = 6 + j * 3
        x0 = cx - w + ((k + j) % 4) * 2 - 3
        p.l(x0, y, x0 + w, y, CL2)
    for i in range(3):
        a = k * math.pi / 2 + i * 2.1
        x, y = cx + math.cos(a) * 12, cy - 2 + math.sin(a) * 8
        p.e(x - 1, y - 1, x + 1, y + 1, CL1); p.p(x, y - 1, WHITE)
    return outline(p.im)


@builder('props')
def make_props():
    save_prop('clockwork', [clockwork(k) for k in range(4)])
    save_prop('lightningrod', [lightningrod(False), lightningrod(True)])
    save_prop('chimes', [chimes(0), chimes(1)])
    save_prop('cloudchest', [cloudchest(False), cloudchest(True)])
    save_prop('sawblade', [sawblade(k) for k in range(4)])
    save_prop('timebubble', [timebubble(k) for k in range(2)])
    save_prop('windgust', [windgust(k) for k in range(4)])


# ================================================================== ITEMS, PARTICLES, HUD ICONS
@builder('items')
def make_items():
    p = Pic(12, 12)                                                                  # brass cog (currency / saw ammo)
    gear(p, 5.5, 5.5, 4, 8, 0.2, hole=(0, 0, 0, 0), spokes=0)
    p.e(4, 4, 7, 7, BR0); p.e(5, 5, 6, 6, (0, 0, 0, 0))
    p.p(3, 3, BR4)
    save(hard(outline_same(p.im)), G_OUT + 'item_gear.png')
    p = Pic(11, 15)                                                                  # white-blue feather
    feather(p, 2, 14, -1.15, 14, 3.4, (CL0, CL2, WHITE, SK3), LT1)
    p.l(1, 14, 3, 12, (140, 150, 170))
    save(hard(outline_same(p.im)), G_OUT + 'item_feather.png')


@builder('particles')
def make_particles():
    fr = []                                                                          # small tumbling cog (2 frames 7x7)
    for k in range(2):
        p = Pic(7, 7)
        gear(p, 3, 3, 2, 6, k * 0.5, spokes=0, hub=False)
        p.p(3, 3, BR0)
        fr.append(outline_same(p.im))
    save(cells(fr, 7, 7), G_OUT + 'part_gear.png', 2)
    fr = []                                                                          # brass spark (2 frames 5x5)
    for k in range(2):
        p = Pic(5, 5)
        if k == 0:
            p.ps([(2, 0), (2, 1), (2, 3), (2, 4), (0, 2), (1, 2), (3, 2), (4, 2)], GL2); p.p(2, 2, GL3)
        else:
            p.ps([(1, 1), (3, 3), (1, 3), (3, 1)], GL1); p.p(2, 2, GL3)
        fr.append(p.im)
    save(cells(fr, 5, 5), G_OUT + 'part_spark2.png', 2)
    fr = []                                                                          # drifting feather (2 frames 8x8)
    for k in range(2):
        p = Pic(8, 8)
        feather(p, 1, 6 if k == 0 else 4, -0.6 if k == 0 else 0.2, 7, 1.8, (HF[0], HF[2], HF[3], HF[1]), HF[3])
        fr.append(outline_same(p.im))
    save(cells(fr, 8, 8), G_OUT + 'part_feather.png', 2)
    fr = []                                                                          # light wind streaks (3 frames 16x7)
    for k in range(3):
        p = Pic(16, 7)
        for j, y in enumerate((1, 3, 5)):
            x0 = (k * 4 + j * 5) % 8
            ln = 6 + (j + k) % 3 * 2
            p.l(x0, y, min(15, x0 + ln), y, WHITE if j != 1 else CL2)
            if j == 1:
                p.p(min(15, x0 + ln), y - 1, WHITE)
        fr.append(p.im)
    save(cells(fr, 16, 7), G_OUT + 'part_wind.png', 3)
    fr = []                                                                          # tall lightning strike (additive on black, 2 frames 16x48)
    for k in range(2):
        p = Pic(16, 48)
        p.r(0, 0, 15, 47, (0, 0, 0))
        q = Pic(16, 48)
        bolt(q, 8 + (k * 3 - 1), 0, 7 - k * 2, 47, 60 + k, 1, ((40, 70, 170), (120, 170, 255), WHITE), 3.0, 1)
        a = np.array(q.im)
        g = glow((a[:, :, 3] > 0).astype(float), 1.5)
        rgb = np.zeros((48, 16, 3))
        rgb += (np.round(g * 4) / 4)[..., None] * np.array([40, 70, 160])
        m = a[:, :, 3] > 0
        rgb[m] = a[m, :3]
        fr.append(from_arr(np.clip(rgb, 0, 255)))
    save(cells(fr, 16, 48), G_OUT + 'part_lightning2.png', 2, additive=True)
    fr = []                                                                          # cloud puff (2 frames 14x10)
    for k in range(2):
        p = Pic(14, 10)
        if k == 0:
            puff(p, 4, 6, 3); puff(p, 9, 5, 4)
        else:
            puff(p, 5, 5, 4); puff(p, 10, 6, 3)
        fr.append(outline_same(p.im))
    save(cells(fr, 14, 10), G_OUT + 'part_cloud.png', 2)
    # HUD icons (8x8 white): wind, time
    W_ = WHITE
    wind = ["######..", ".......#", "#####..#", "......#.", "####....", "....#...", "##..#...", "...#...."]
    time_ = ["########", ".#....#.", "..#..#..", "...##...", "...##...", "..#..#..", ".#.##.#.", "########"]
    for name, rows in (('icon_wind', wind), ('icon_time', time_)):
        p = Pic(8, 8)
        p.bitmap(0, 0, rows, {'#': W_})
        save(p.im, G_OUT + name + '.png')


# ================================================================== TOUCH ICONS (96x96 white on transparent)
@builder('icons')
def make_icons():
    icon = P3.icon

    def spear(d, k):      # a spear thrown diagonally with speed lines
        S = lambda *v: [x * k for x in v]
        d.line(S(14, 82, 70, 26), fill=255, width=8 * k)
        d.polygon(S(64, 20, 90, 6, 76, 32), fill=255)                  # leaf blade
        d.polygon(S(66, 26, 74, 18, 78, 28, 70, 34), fill=255)
        d.rectangle(S(0, 0, 0, 0), fill=0)
        for (x0, y0, ln) in ((6, 58, 22), (22, 76, 20), (2, 72, 12)):
            d.line(S(x0, y0, x0 + ln * 0.7, y0 - ln * 0.7), fill=255, width=5 * k)
        d.line(S(18, 86, 10, 94), fill=255, width=6 * k)                # butt spike
    save(icon(spear), T_OUT + 'icon_spear.png')


# @@SECTIONS@@


# ================================================================== CONTACT SHEET
NEW_WEAPONS = ('sawlauncher', 'windgun', 'spear')


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
