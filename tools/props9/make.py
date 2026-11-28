#!/usr/bin/env python3
"""Version 11 graphics for Krypta ("Svampriket och Spegelpalatset"): the fungus realm and the mirror palace, six new
enemies, the mycel mother and the mirror king, textures, props, items, particles, HUD and touch icons.

Run from the folder that holds retrofps/ and assets/ (e.g. /home/user/test):
    python3 retrofps/tools/props9/make.py [name ...]
(with names only those builders run, e.g. `python3 retrofps/tools/props9/make.py sporling sheet`; the contact sheet
always shows everything this script has written so far, plus the three new first-person weapons)

The first-person weapons sporelauncher / mirrorshield / whip (fp_*.png, pick_*.png, js/weapons.js) come from
tools/weapon-frames (render-static.mjs + pack.py, see the README there, version 11).

Out to retrofps/assets/gfx:
  enemies-{mycelbrute,myconid,mirrorknight,illusionist}_{idle,movement,attack,take_damage,death}.png (64x64)
  enemies-mirrorknight_block.png (the shield raised in front of the face; the last frame is the held pose)
  enemies-{sporling,shardling}_{...}.png (32x32 cells)
  boss_mycelmother_{idle,attack,cast,hurt,death}.png, boss_mirrorking_{idle,attack,cast,hurt,death}.png (square)
  prop_{glowshroom,mirrorstatue,bouncecap,teleportfx,sporecloud}.png
  item_sporesack.png, part_{spore2,glassshard,whip,illusion}.png, icon_spore.png (8x8)
Out to retrofps/assets/wall:
  wall_mycel, wall_mushroomcap, wall_marble, wall_mirror, wall_boss_mycelmother, wall_boss_mirrorking (64x128)
  floor_moss, floor_marble, floor_bouncepad, floor_sporepool, floor_teleport, floor_boss_mycelmother,
  floor_boss_mirrorking (64x64)
Out to retrofps/assets/touch: icon_shield.png (96x96, white on transparent)
Contact sheet: <scratchpad>/en/v11_sheet.png

Sources (licences checked; everything not listed is drawn procedurally below in the outlined style of
tools/props2-props8, whose helpers are reused):
  * Pixel Crawler Free Pack 2.11 (Anokolisa; free for commercial use, edits allowed, no resale of the assets):
      Characters/Body_A Idle/Walk/Slice/Hit/Death -> mirrorknight (mirror-polished plate, great helm with a plume, a
                                                    kite shield with a mirror face and the sword drawn; the block strip
                                                    raises the shield over the Idle frames)
      Characters/Body_A Idle/Walk/Collect/Hit/Death -> illusionist (slim hooded cloak with stars, white porcelain mask,
                                                    light orb drawn; Collect's raised hand is the gesture with light)
  * Classic 64 Asset Pack 0.6 (Craig Snedeker, CC0): Ground/ice_05, ice_07, ice_09 (cracked ice) -> the veins of the
      white and black marble (through tools/props7's marble())
  (32rogues, Super Retro World and Mana Seed are NOT used: their licences forbid AI use / redistribution.)
Drawn: sporling, mycelbrute, myconid, shardling, the mycel mother, the mirror king, all props, items, particles and icons.
Additive particles (stored opaque on black, like part_ember): part_illusion.
Notes: part_spore.png already exists (version 4, additive 8x8, used by the svampman's gas), so the new outlined spore
ball is part_spore2.png. floor_teleport, floor_bouncepad and floor_sporepool are single-tile pads (they tile, but are
meant to be seen one at a time); wall_mirror and wall_boss_mirrorking keep marble / silver pilasters at their edges so
walls of them tile side by side. Suggested sizes (skeleton = 1.0, Body_A human = 1.05): sporling 0.6, shardling 0.6,
mycelbrute 1.3, myconid 1.0, mirrorknight 1.1, illusionist 1.05; bosses (116 px cells, the pharaoh is 114 px at 3.8):
mycelmother 4.2, mirrorking 4.0.
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
sys.dont_write_bytecode = True          # the helper modules of props2-props8 are loaded without touching their __pycache__


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
from_p2 = 'OUT Pic outline outline_same hard shift gmap tile_lum blend mask_draw glow from_arr shear squash strip'.split()
globals().update({k: getattr(P2, k) for k in from_p2})
strip_tool, cut_below = P3.strip_tool, P4.cut_below
mask_of, ground, pnoise, up2, front_hand = P5.mask_of, P5.ground, P5.pnoise, P5.up2, P5.front_hand
dark, flash, dress, body_src, cell_of = P6.dark, P6.flash, P6.dress, P6.body_src, P6.cell_of
puff, feather, tool_line, back_x, marble, wrap_outline, bolt = P7.puff, P7.feather, P7.tool_line, P7.back_x, P7.marble, P7.wrap_outline, P7.bolt
S0, S1, S2, S3, S4 = P2.S0, P2.S1, P2.S2, P2.S3, P2.S4
W0, W1, W2, W3, W4 = P2.W0, P2.W1, P2.W2, P2.W3, P2.W4
I0, I1, I2, I3 = P2.I0, P2.I1, P2.I2, P2.I3
M0, M1, M2, M3 = P2.M0, P2.M1, P2.M2, P2.M3
AU0, AU1, AU2, AU3, AU4 = P5.AU0, P5.AU1, P5.AU2, P5.AU3, P5.AU4

A = 'assets/'
C64 = A + 'textures/Classic 64 Asset Pack 0.6/- Classic 64 Asset Pack 0.6/'
G_OUT, W_OUT, T_OUT = 'retrofps/assets/gfx/', 'retrofps/assets/wall/', 'retrofps/assets/touch/'
SCR = '/tmp/claude-0/-home-user/80ee56ba-2fa6-5354-b261-a4ca4fdcb508/scratchpad/en/'
SHEET, MANIFEST = SCR + 'v11_sheet.png', SCR + 'v11_manifest.json'
WHITE = (255, 255, 255)
CLEAR = (0, 0, 0, 0)

# ---------------------------------------------------------------- fungus palettes
MY0, MY1, MY2, MY3 = (74, 62, 66), (134, 120, 114), (192, 180, 164), (234, 226, 208)     # mycelium threads
STK0, STK1, STK2, STK3 = (116, 96, 84), (172, 152, 130), (214, 198, 172), (242, 232, 212)  # mushroom stalk / flesh
CP0, CP1, CP2, CP3 = (58, 20, 64), (104, 38, 106), (156, 68, 148), (208, 126, 192)       # purple caps
RC0, RC1, RC2, RC3 = (96, 18, 24), (156, 36, 36), (210, 70, 52), (246, 136, 96)          # red caps (bounce caps)
SPOT0, SPOT1 = (206, 196, 186), (246, 240, 230)                                          # cap spots
GW0, GW1, GW2, GW3 = (16, 96, 104), (44, 186, 170), (140, 248, 214), (226, 255, 244)       # bioluminescence
SP0, SP1, SP2, SP3 = (64, 96, 26), (122, 164, 44), (190, 224, 84), (238, 255, 166)         # green spores
PU0, PU1, PU2, PU3 = (66, 28, 96), (124, 66, 168), (186, 128, 228), (234, 202, 255)        # purple spores
DT0, DT1, DT2, DT3 = (40, 28, 26), (70, 50, 40), (104, 78, 56), (140, 110, 78)            # earth
MS0, MS1, MS2, MS3 = (28, 58, 34), (50, 94, 44), (86, 136, 58), (138, 182, 82)            # moss
BK0, BK1, BK2, BK3 = (48, 32, 26), (82, 56, 38), (118, 84, 56), (156, 118, 80)            # roots / bark
# ---------------------------------------------------------------- mirror-palace palettes
MB0, MB1, MB2, MB3 = (148, 146, 162), (194, 192, 206), (224, 222, 234), (250, 249, 255)   # white marble
DM0, DM1, DM2, DM3 = (16, 14, 24), (32, 30, 46), (56, 54, 76), (92, 90, 118)              # black marble
MR0, MR1, MR2, MR3, MR4 = (34, 52, 82), (72, 110, 150), (132, 176, 212), (196, 224, 244), (246, 252, 255)   # mirror glass
SV0, SV1, SV2, SV3 = (70, 74, 96), (128, 134, 160), (184, 190, 212), (232, 236, 248)       # polished silver
IL0, IL1, IL2, IL3 = (46, 18, 74), (96, 46, 150), (164, 104, 226), (228, 196, 255)         # illusion violet
GS0, GS1, GS2, GS3 = (52, 100, 132), (100, 172, 206), (172, 226, 244), (236, 254, 255)     # glass shards
TP0, TP1, TP2, TP3 = (30, 70, 150), (70, 160, 240), (160, 230, 255), (240, 255, 255)       # teleport light
MG1, MG2 = (200, 80, 220), (250, 170, 255)                                               # teleport magenta

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
def spotted_cap(p, cx, top, w, h, pal=(CP0, CP1, CP2, CP3), spots=SPOT1, seed=0, nsp=4, gills=None, glowsp=False, tilt=0.0):
    """A mushroom cap seen from the side: a dome w wide and h tall whose flat underside sits at row top+h, lit from the
    upper left, with round spots; gills = colour of the gill band under the rim (None = no gills)."""
    c0, c1, c2, c3 = pal
    base = top + h
    x0, x1 = cx - w / 2, cx + w / 2
    pts = []
    for i in range(25):
        a = math.pi + i / 24 * math.pi
        pts.append((cx + math.cos(a) * w / 2, base + math.sin(a) * h + (i / 24 - 0.5) * tilt * w))
    p.poly(pts + [(x1, base + 1 + tilt * w * 0.5), (x0, base + 1 - tilt * w * 0.5)], c0)
    inner = [(cx + (x - cx) * 0.94, base + (y - base) * 0.92) for x, y in pts]
    p.poly(inner + [(x1 - 1, base - tilt * w * 0.5 + 0.5), (x0 + 1, base + tilt * w * 0.5 + 0.5)], c1)
    hl = [(cx - w * 0.06 + (x - cx) * 0.78, base - h * 0.1 + (y - base) * 0.82) for x, y in pts[:16]]
    p.poly(hl + [(cx - w * 0.06, base - h * 0.25)], c2)
    if h >= 4:
        p.arc(x0 + w * 0.14, top + h * 0.12, cx + w * 0.1, base + h * 0.4, 200, 255, c3)
    r2 = random.Random(seed)
    for k in range(nsp):
        a = math.pi * (1.12 + (k + r2.uniform(0.15, 0.85)) / nsp * 0.76)
        d = r2.uniform(0.5, 0.8)
        sx, sy = cx + math.cos(a) * w / 2 * d, base + math.sin(a) * h * d
        rr = max(0.6, min(w, h * 2) * r2.uniform(0.06, 0.1))
        if glowsp:
            p.e(sx - rr - 0.5, sy - rr * 0.8 - 0.5, sx + rr + 0.5, sy + rr * 0.8 + 0.5, GW1)
        p.e(sx - rr, sy - rr * 0.8, sx + rr, sy + rr * 0.8, spots if not glowsp else GW2)
        if rr >= 1.5:
            p.p(sx - rr * 0.4, sy - rr * 0.4, SPOT1 if not glowsp else GW3)
    if gills:
        p.l(x0 + 1, base + 1, x1 - 1, base + 1, gills)
        for x in range(int(x0) + 2, int(x1) - 1, 2):
            p.p(x, base + 2, gills)
    return base


def spore_motes(p, n, seed, box, pal=(SP1, SP2, SP3)):
    r2 = random.Random(seed)
    x0, y0, x1, y1 = box
    for _ in range(n):
        x, y = r2.uniform(x0, x1), r2.uniform(y0, y1)
        if r2.random() < 0.3:
            p.ps([(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], pal[0]); p.p(x, y, pal[2])
        else:
            p.p(x, y, r2.choice(pal))


def spore_cloud(p, cx, cy, w, h, seed, pal=(PU0, PU1, PU2, PU3), motes=(SP1, SP2, SP3), nm=8):
    """A billowing spore cloud: clustered puffs plus drifting motes on top."""
    P7.cloud(p, cx, cy, w, h, seed, pal)
    spore_motes(p, nm, seed + 1, (cx - w / 2, cy - h / 2 - 2, cx + w / 2, cy + h / 2), motes)


def shard(p, x, y, ang, ln, wd, pal=(GS0, GS1, GS2, GS3)):
    """A long glass shard from (x, y) along ang: a sharp kite with a dark edge, light facet and a white glint."""
    u = (math.cos(ang), math.sin(ang))
    v = (-u[1], u[0])
    P_ = lambda a_, b_: (x + u[0] * a_ + v[0] * b_, y + u[1] * a_ + v[1] * b_)
    p.poly([P_(0, 0), P_(ln * 0.35, -wd), P_(ln, 0), P_(ln * 0.3, wd)], pal[0])
    p.poly([P_(0.5, 0), P_(ln * 0.35, -wd + 0.6), P_(ln - 0.8, 0)], pal[2])
    p.poly([P_(0.5, 0.3), P_(ln - 0.8, 0.2), P_(ln * 0.3, wd - 0.6)], pal[1])
    p.l(*P_(1, -0.2), *P_(ln * 0.6, -0.2), pal[3])
    return P_(ln, 0)


def mirror_glass(p, x0, y0, x1, y1, seed=0, oval=False, streaks=2, pal=(MR0, MR1, MR2, MR3, MR4)):
    """A reflecting mirror pane: a cold gradient (dark below, bright above), a soft reflected horizon, and the two
    sharp diagonal white glints that make it read as glass."""
    w, h = x1 - x0 + 1, y1 - y0 + 1
    q = Pic(int(w), int(h))
    for j in range(int(h)):
        t = j / max(1, h - 1)
        c = pal[3] if t < 0.18 else pal[2] if t < 0.45 else pal[1] if t < 0.8 else pal[0]
        q.l(0, j, w - 1, j, c)
    q.l(0, int(h * 0.45), w - 1, int(h * 0.45), pal[3])                     # reflected horizon line
    for k in range(streaks):
        o = w * (0.25 + k * 0.32)
        bw = max(1, w * (0.16 if k == 0 else 0.08))
        q.poly([(o, -1), (o + bw, -1), (o + bw - h * 0.7, h), (o - h * 0.7, h)], pal[4] if k == 0 else pal[3])
    q.l(0, 0, w - 1, 0, pal[4]); q.l(0, 0, 0, h - 1, pal[3])
    a = np.array(q.im)
    if oval:
        yy, xx = np.mgrid[0:int(h), 0:int(w)]
        m = ((xx - (w - 1) / 2) / (w / 2)) ** 2 + ((yy - (h - 1) / 2) / (h / 2)) ** 2 <= 1.0
        a[~m] = 0
    p.paste(Image.fromarray(a), x0, y0)


def mask_face(p, hx, hy, eyes=1, crack=False):
    """The illusionist's white porcelain mask: a smooth oval, gold brow line, almond eye holes, a painted tear."""
    p.e(hx - 3, hy - 4, hx + 4, hy + 4, (226, 222, 230))
    p.e(hx - 2, hy - 4, hx + 3, hy + 1, (250, 248, 255))
    p.l(hx - 1, hy - 3, hx + 4, hy - 3, AU2)
    ec = IL3 if eyes == 1 else (255, 255, 255) if eyes == 2 else (60, 50, 70)
    for ex in (hx + 1, hx + 3):
        p.p(ex, hy - 1, (30, 20, 40)); p.p(ex, hy - 1, ec) if eyes else None
    p.p(hx + 1, hy + 1, IL2); p.p(hx + 1, hy + 2, IL1)                       # painted tear
    p.l(hx + 2, hy + 3, hx + 3, hy + 3, (180, 170, 190))                      # thin closed lips
    if crack:
        p.lines([(hx, hy - 4), (hx + 1, hy - 2), (hx, hy), (hx + 1, hy + 2)], (40, 30, 50))



# ================================================================== TEXTURES (palettized like props5-props7)
def tone(rgb, k=0.8, lift=8):
    # blank marmor blir annars helt vit i mynningsblixtens ljus: pressa ned högdagrarna
    return np.asarray(rgb, dtype=np.float32) * k + lift


def finish(rgb, name, colors=48, half=True):
    im = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), 'RGB')
    if half:
        im = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
    save(im.quantize(colors, method=Image.Quantize.MEDIANCUT).convert('RGB'), W_OUT + name)


EARTH_STOPS = [(0, (20, 14, 16)), (0.4, DT0), (0.75, DT1), (1, DT2)]
MY_STOPS = [(0, MY0), (0.4, MY1), (0.75, MY2), (1, MY3)]
MB_STOPS = [(0, MB0), (0.35, MB1), (0.7, MB2), (1, MB3)]
DM_STOPS = [(0, DM0), (0.4, DM1), (0.75, DM2), (1, DM3)]
MS_STOPS = [(0, (20, 40, 26)), (0.3, MS0), (0.6, MS1), (0.85, MS2), (1, MS3)]


def paste_wrap(rgb, im, x, y):
    """Composite an RGBA sprite into a wrapping texture array (opaque pixels only); returns its mask."""
    h, w = rgb.shape[:2]
    a = np.array(im)
    m = a[:, :, 3] > 0
    ys, xs = np.nonzero(m)
    out = np.zeros((h, w), bool)
    for yy_, xx_ in zip(ys, xs):
        ty, tx = (yy_ + y) % h, (xx_ + x) % w
        rgb[ty, tx] = a[yy_, xx_, :3]
        out[ty, tx] = True
    return out


def mycel_net(w, h, seed, n=14, ln=(10, 26)):
    """Fibrous mycelium threads: branching random walks drawn 1 px wide on a wrapping canvas; returns (halo strength,
    thread mask). The halo is the fuzz round the threads (a blurred copy of them)."""
    r2 = random.Random(seed)

    def fn(d, ox, oy):
        rr = random.Random(seed)
        for _ in range(n):
            x, y = rr.uniform(0, w), rr.uniform(0, h)
            a = rr.uniform(0, math.tau)
            pts = [(x, y)]
            for j in range(rr.randint(*ln)):
                a += rr.uniform(-0.55, 0.55)
                x, y = x + math.cos(a) * 1.6, y + math.sin(a) * 1.6
                pts.append((x, y))
                if rr.random() < 0.12:                                     # a side branch
                    b = a + rr.choice((-1, 1)) * rr.uniform(0.7, 1.3)
                    bx, by = x, y
                    br = [(bx, by)]
                    for _k in range(rr.randint(3, 7)):
                        b += rr.uniform(-0.4, 0.4)
                        bx, by = bx + math.cos(b) * 1.6, by + math.sin(b) * 1.6
                        br.append((bx, by))
                    d.line([(px + ox, py + oy) for px, py in br], fill=255, width=1)
            d.line([(px + ox, py + oy) for px, py in pts], fill=255, width=1)
    m = mask_draw(w, h, fn) > 0.5
    return glow(m.astype(float), 1.2), m


def tex_wall_mycel():
    """Dark earth overgrown by a white mycelium net, roots and a few small purple caps sprouting from it."""
    w, h = 32, 64
    n = pnoise(w, h, 401, ((16, 1.0), (8, 0.5), (4, 0.3)))
    yy, xx = np.mgrid[0:h, 0:w]
    rgb = gmap(np.clip(n * 0.9, 0, 1), EARTH_STOPS)
    clod = (pnoise(w, h, 402, ((4, 1.0), (2, 0.4))) > 0.62)
    rgb = blend(rgb, clod, DT2, 0.4)
    s, net = mycel_net(w, h, 403, 16)
    mat = pnoise(w, h, 404, ((16, 1.0), (8, 0.5))) > 0.6                    # where the mat is thick and felted
    rgb = blend(rgb, mat, MY0, 0.5)
    rgb = blend(rgb, mat & (pnoise(w, h, 405, ((2, 1.0),)) > 0.6), MY1, 0.5)
    rgb = blend(rgb, (s > 0.12) & ~net, MY0, 0.5)
    rgb[net] = MY2
    rgb[net & (mat | (s > 0.45))] = MY3
    rgb = blend(rgb, np.roll(net, -1, 0) & ~net, (14, 10, 12), 0.5)        # a shadow under every thread
    # roots creeping down
    q = Pic(w, h)
    for (x, y0, ln, sd) in ((6, 0, 30, 1), (22, 20, 26, -1), (14, 44, 22, 1)):
        P8 = [(x + math.sin(j * 0.5 + sd) * 2, y0 + j) for j in range(ln)]
        q.lines(P8, BK1, 2); q.lines([(px - 0.5, py) for px, py in P8], BK2)
    m = paste_wrap(rgb, q.im, 0, 0)
    rgb[wrap_outline(m)] = blend(rgb, np.ones((h, w), bool), (14, 10, 12), 0.6)[wrap_outline(m)]
    # little caps sprouting out of the wall in clusters
    q = Pic(w, h)
    for (x, y, s_) in ((9, 14, 1.0), (12, 16, 0.7), (25, 38, 1.2), (27, 41, 0.8), (4, 57, 0.9)):
        q.l(x, y, x, y + 3 * s_, STK2)
        spotted_cap(q, x, y - 2.5 * s_, 6 * s_, 2.5 * s_, seed=int(x * y), nsp=1 if s_ > 0.8 else 0)
    a = np.array(outline_same(q.im))
    m = a[:, :, 3] > 0
    rgb[m] = a[m, :3]
    finish(rgb, 'wall_mycel.png', 40)


def tex_wall_mushroomcap():
    """A wall of giant shelf fungi: rows of purple brackets, their spotted tops lit, their gills glowing cyan."""
    w, h = 32, 64
    n = pnoise(w, h, 411, ((8, 1.0), (4, 0.5)))
    yy, xx = np.mgrid[0:h, 0:w]
    rgb = gmap(np.clip(n * 0.7, 0, 1), [(0, (12, 8, 20)), (0.5, (26, 18, 36)), (1, (46, 32, 56))])
    s, net = mycel_net(w, h, 412, 10)
    rgb = blend(rgb, net, MY1, 0.4)
    q = Pic(w * 3, h)
    rows = ((2, 3, 22), (18, 14, 20), (6, 27, 24), (22, 39, 20), (4, 52, 22), (20, 62, 18))   # (x, y of the underside, width)
    for (x, y, bw) in rows:
        for ox in (-w, 0, w):
            X = x + ox + w
            # glowing gill fan under the shelf
            q.poly([(X - bw / 2 + 1, y), (X + bw / 2 - 1, y), (X + bw / 2 - 4, y + 3), (X - bw / 2 + 4, y + 3)], GW1)
            for gx in range(int(X - bw / 2 + 2), int(X + bw / 2 - 1), 2):
                q.l(gx, y, X + (gx - X) * 0.7, y + 3, GW2)
            q.l(X - bw / 2 + 4, y + 3, X + bw / 2 - 4, y + 3, GW0)
            spotted_cap(q, X, y - 6, bw, 6, seed=x * 7 + y, nsp=3, glowsp=True)
    big = np.array(q.im)
    a = big[:, w:2 * w].copy()
    for ox in (0, 2 * w):                       # fold the wrapped thirds back in (sprites cross the edges)
        part = big[:, ox:ox + w]
        mm = part[:, :, 3] > 0
        a[mm] = part[mm]
    m = a[:, :, 3] > 0
    gl = glow(m.astype(float), 2.0)
    under = np.zeros((h, w), bool)
    for (x, y, bw) in rows:                     # cyan light cast down the wall below every shelf
        for ox in (-w, 0, w):
            under |= (np.abs(xx - (x + ox)) < bw / 2 - 2) & (yy > y + 3) & (yy < y + 9)
    rgb = blend(rgb, under & ~m, GW0, 0.45)
    rgb = blend(rgb, (gl > 0.15) & ~m, CP0, 0.4)
    rgb[m] = a[m, :3]
    rgb[wrap_outline(m) & ~(np.roll(m, -1, 0))] = OUT
    rgb[np.roll(m, 1, 0) & ~m & ~under] = (10, 6, 14)
    finish(rgb, 'wall_mushroomcap.png', 40)


def marble_blocks(w, h, bh, bw, seed, stops=MB_STOPS, vein_col=MB0, src='Ground/Materials/ice_05.jpg'):
    mortar, bid = P3.brick_mask(w, h, bh, bw, seed)
    v, vein, crack = marble(w, h, seed + 1, src)
    r2 = np.random.default_rng(seed + 2)
    tone = {b: r2.uniform(-0.1, 0.08) for b in np.unique(bid)}
    v = np.clip(v + np.vectorize(tone.get)(bid), 0, 1)
    rgb = gmap(v, stops)
    rgb = blend(rgb, vein & ~mortar, vein_col, 0.6)
    rgb = blend(rgb, crack & ~mortar, vein_col, 0.3)
    return rgb, mortar


def tex_wall_marble():
    """Polished white marble ashlar with grey veins, a gold string course and a black marble skirting."""
    w, h = 32, 64
    rgb, mortar = marble_blocks(w, h, 12, 16, 421)
    yy, xx = np.mgrid[0:h, 0:w]
    rgb[mortar] = (150, 146, 160)
    rgb = blend(rgb, np.roll(mortar, 1, 0) & ~mortar, MB3, 0.8)
    rgb = blend(rgb, np.roll(mortar, -1, 0) & ~mortar, MB0, 0.5)
    rgb = blend(rgb, np.roll(mortar, -1, 1) & ~mortar, MB0, 0.3)
    v, vein, crack = marble(w, h, 425, 'Ground/Materials/ice_09.jpg')
    sk = yy >= 54                                                          # black marble skirting
    rgb[sk] = gmap(v[sk] * 0.8, DM_STOPS)[...]
    rgb[sk & vein] = DM3
    rgb[yy == 54] = AU1
    rgb[yy == 53] = AU3
    rgb[(yy == 52)] = MB0
    for y0 in (24,):                                                       # gold string course with a bead row
        rgb[y0] = AU3; rgb[y0 + 1] = AU2; rgb[y0 + 2] = AU0
        rgb[(yy == y0 + 1) & (xx % 4 == 1)] = AU4
    finish(tone(rgb, 0.86), 'wall_marble.png', 40)


def tex_wall_mirror():
    """A tall mirror in a gilt frame set in white marble: it reflects a dim hall (columns, an arch, the chequered floor),
    with the two diagonal glints across the glass. The marble pilasters at the edges let it tile side by side."""
    w, h = 64, 128
    yy, xx = np.mgrid[0:h, 0:w]
    v, vein, crack = marble(32, 64, 431)
    rgb = up2(gmap(v, MB_STOPS))
    rgb = blend(rgb, up2(vein), MB0, 0.6)
    p = Pic(w, h)
    x0, x1, y0, y1 = 9, 54, 12, 118                                    # glass, arched top
    p.r(x0 - 4, y0 - 2, x1 + 4, y1 + 5, AU0)
    p.e(x0 - 4, y0 - 12, x1 + 4, y0 + 14, AU0)
    p.r(x0 - 3, y0 - 1, x1 + 3, y1 + 4, AU2)
    p.e(x0 - 3, y0 - 11, x1 + 3, y0 + 13, AU2)
    p.l(x0 - 3, y0 + 2, x0 - 3, y1 + 4, AU3); p.arc(x0 - 3, y0 - 11, x1 + 3, y0 + 13, 180, 270, AU4)
    p.l(x1 + 3, y0 + 2, x1 + 3, y1 + 4, AU1)
    p.r(x0 - 1, y0, x1 + 1, y1 + 1, AU0)
    p.e(x0 - 1, y0 - 9, x1 + 1, y0 + 11, AU0)
    a = np.array(p.im); fm = a[:, :, 3] > 0
    rgb[fm] = a[fm, :3]
    # the glass: a reflected hall
    gw, gh = x1 - x0 + 1, y1 - (y0 - 8) + 1
    gy0 = y0 - 8
    G = np.zeros((gh, gw, 3))
    gyy, gxx = np.mgrid[0:gh, 0:gw]
    t = gyy / (gh - 1)
    G[:] = gmap(np.clip(0.95 - t * 0.8, 0, 1), [(0, MR0), (0.4, MR1), (0.75, MR2), (1, MR3)])
    hor = int(gh * 0.62)
    fl = gyy > hor                                                       # reflected chequered floor in perspective
    depth = (gyy - hor) / (gh - hor)
    with np.errstate(divide='ignore', invalid='ignore'):
        u = (gxx - gw / 2) / np.maximum(depth, 0.05) / 9
        vv = 6 / np.maximum(depth, 0.05)
    chk = ((np.floor(u) + np.floor(vv)) % 2 == 0) & fl
    G[fl] = blend(G, fl, MR1, 0.5)[fl]
    G[chk] = blend(G, chk, MR0, 0.7)[chk]
    for cx_ in (gw * 0.2, gw * 0.8):                                    # reflected columns and an arch between them
        col = (np.abs(gxx - cx_) < 3) & (gyy > gh * 0.18) & (gyy <= hor)
        G[col] = blend(G, col, MR1, 0.75)[col]
        G[col & (gxx - cx_ < -1.5)] = MR2
    arch = (np.abs(np.hypot(gxx - gw / 2, (gyy - gh * 0.3) * 1.2) - gw * 0.3) < 1.6) & (gyy < gh * 0.3)
    G[arch] = blend(G, arch, MR1, 0.7)[arch]
    G[gyy == hor] = MR3
    # the glints: two sharp diagonal bands and a bright top-left rim
    for o, bw_, c in ((gw * 0.18, 7, MR4), (gw * 0.5, 3, MR3), (gw * 0.62, 1.5, MR4)):
        band = (gxx + gyy * 0.55 > o + gh * 0.25) & (gxx + gyy * 0.55 < o + gh * 0.25 + bw_)
        G[band] = blend(G, band, c, 0.85)[band]
    G[:, 0] = MR3; G[0, :] = MR4
    gm = np.zeros((gh, gw), bool)
    gm[gyy >= 8] = True
    arch_m = ((gxx - (gw - 1) / 2) / (gw / 2)) ** 2 + ((gyy - 9) / 17) ** 2 <= 1.0
    gm |= arch_m
    sub = rgb[gy0:gy0 + gh, x0:x0 + gw]
    sub[gm] = G[gm]
    # small gilt crest on top of the frame, rosettes at the frame corners
    q = Pic(w, h)
    q.poly([(31.5 - 5, 3), (31.5, -1 + 0), (31.5 + 5, 3), (31.5, 6)], AU2); q.p(31.5, 2, AU4); q.p(31.5, 3, (200, 40, 60))
    for (x, y) in ((x0 - 2, y1 + 3), (x1 + 2, y1 + 3)):
        q.e(x - 2, y - 2, x + 2, y + 2, AU1); q.p(x, y, AU4)
    a = np.array(q.im); m2 = a[:, :, 3] > 0
    rgb[m2] = a[m2, :3]
    allm = fm | m2
    rgb[wrap_outline(allm)] = (120, 112, 126)
    rgb[np.roll(np.roll(allm, 2, 0), 1, 1) & ~allm & ~wrap_outline(allm)] = blend(rgb, np.ones((h, w), bool), MB0, 0.6)[np.roll(np.roll(allm, 2, 0), 1, 1) & ~allm & ~wrap_outline(allm)]
    finish(rgb, 'wall_mirror.png', 56, half=False)


def tex_floor_moss():
    """Soft green moss with darker hollows, a few pale sprouts and small stones."""
    w = h = 32
    n = pnoise(w, h, 441, ((8, 1.0), (4, 0.6), (2, 0.3)))
    n2 = pnoise(w, h, 442, ((16, 1.0), (8, 0.5)))
    yy, xx = np.mgrid[0:h, 0:w]
    v = np.clip(n * 0.7 + n2 * 0.4 - 0.1, 0, 1)
    rgb = gmap(v, MS_STOPS)
    tuft = pnoise(w, h, 443, ((2, 1.0),)) > 0.66
    rgb = blend(rgb, tuft, MS3, 0.45)
    hol = n2 < 0.32
    rgb = blend(rgb, hol, DT0, 0.55)
    rr = random.Random(444)
    for _ in range(4):                                                     # pebbles
        x, y = rr.randrange(w), rr.randrange(h)
        rgb[y, x] = S3; rgb[y, (x + 1) % w] = S2; rgb[(y + 1) % h, x] = S1
    for _ in range(9):                                                     # sprouts / tiny flowers
        x, y = rr.randrange(w), rr.randrange(h)
        rgb[y, x] = rr.choice((SP3, (240, 230, 200), GW2))
        rgb[(y + 1) % h, x] = MS1
    finish(rgb, 'floor_moss.png', 32)


def tex_floor_marble():
    """Chequered floor of white and black marble, polished, with gold studs at the tile corners."""
    w = h = 32
    yy, xx = np.mgrid[0:h, 0:w]
    v, vein, crack = marble(w, h, 451, 'Ground/Materials/ice_07.jpg')
    v2, vein2, _ = marble(w, h, 452, 'Ground/Materials/ice_05.jpg')
    blk = ((xx // 16) + (yy // 16)) % 2 == 1
    rgb = gmap(v, MB_STOPS)
    rgb = blend(rgb, vein, MB0, 0.55)
    rgb[blk] = gmap(v2[blk] * 0.85, DM_STOPS)
    rgb[blk & vein2] = DM3
    grout = (xx % 16 == 0) | (yy % 16 == 0)
    rgb[grout] = (96, 92, 110)
    rgb = blend(rgb, (np.roll(grout, 1, 0) | np.roll(grout, 1, 1)) & ~grout & ~blk, MB3, 0.6)
    rgb = blend(rgb, (np.roll(grout, 1, 0) | np.roll(grout, 1, 1)) & ~grout & blk, DM3, 0.5)
    # a soft polished glint on every tile
    gl = ((xx % 16 + yy % 16) >= 6) & ((xx % 16 + yy % 16) <= 7) & (xx % 16 > 1) & (yy % 16 > 1)
    rgb = blend(rgb, gl, WHITE, 0.25)
    for (x, y) in ((0, 0), (16, 0), (0, 16), (16, 16)):
        rgb[y, x] = AU3
        rgb[y, (x + 1) % w] = AU1; rgb[(y + 1) % h, x] = AU1; rgb[y, (x - 1) % w] = AU1; rgb[(y - 1) % h, x] = AU1
    finish(tone(rgb, 0.78), 'floor_marble.png', 40)


def tex_floor_bouncepad():
    """A huge red bounce cap seen from above, filling the tile: radial ridges, white spots, a pale crown in the middle,
    moss in the corners."""
    w = h = 64
    yy, xx = np.mgrid[0:h, 0:w]
    cx = cy = 31.5
    r = np.hypot(xx - cx, yy - cy)
    ang = np.arctan2(yy - cy, xx - cx)
    n = pnoise(w, h, 461, ((8, 1.0), (4, 0.5)))
    rgb = gmap(np.clip(n * 0.8, 0, 1), MS_STOPS)
    cap = r < 30.5
    light = np.clip(0.75 - (xx - cx + yy - cy) / 80 - (r / 30) ** 2 * 0.35 + (n - 0.5) * 0.15, 0, 1)
    rgb[cap] = gmap(light, [(0, RC0), (0.35, RC1), (0.7, RC2), (1, RC3)])[cap]
    ridge = cap & (np.abs(((ang / math.tau * 18) % 1) - 0.5) < 0.08) & (r > 8)
    rgb = blend(rgb, ridge, RC0, 0.4)
    rgb[(r >= 30.5) & (r < 31.8)] = OUT
    rgb = blend(rgb, cap & (r > 28.5), RC0, 0.6)
    rng = random.Random(462)
    for k in range(13):                                                   # white spots
        a_ = k / 13 * math.tau + rng.uniform(-0.2, 0.2)
        d = rng.choice((11, 19, 24)) + rng.uniform(-2, 2)
        sx, sy = cx + math.cos(a_) * d, cy + math.sin(a_) * d
        rr = 2.4 + rng.uniform(0, 1.8)
        sp = np.hypot(xx - sx, yy - sy) < rr
        rgb[sp & cap] = SPOT0
        rgb[sp & cap & (np.hypot(xx - sx + 0.8, yy - sy + 0.8) < rr * 0.7)] = SPOT1
    ctr = r < 6.5
    rgb[ctr] = SPOT0
    rgb[r < 5] = SPOT1
    rgb[(r < 2.5)] = (250, 220, 200)
    rgb = blend(rgb, (r >= 6.5) & (r < 7.5), RC0, 0.8)
    finish(rgb, 'floor_bouncepad.png', 40, half=False)


def tex_floor_sporepool():
    """A pool of thick violet ooze with green swirls, rising bubbles and floating spores."""
    w = h = 32
    n = pnoise(w, h, 471, ((16, 1.0), (8, 0.6), (4, 0.3)))
    n2 = pnoise(w, h, 472, ((8, 1.0), (4, 0.5)))
    yy, xx = np.mgrid[0:h, 0:w]
    sw = np.sin((xx / w + n * 1.2) * math.tau * 2 + yy / h * math.tau)
    v = np.clip(n * 0.8 + sw * 0.12, 0, 1)
    rgb = gmap(v, [(0, (28, 10, 40)), (0.4, PU0), (0.7, PU1), (1, PU2)])
    gr = (np.abs(sw) < 0.18) & (n2 > 0.45)
    rgb = blend(rgb, gr, SP1, 0.65)
    rgb = blend(rgb, gr & (n2 > 0.6), SP2, 0.6)
    rr = random.Random(473)
    for _ in range(7):                                                    # bubbles
        x, y, s_ = rr.randrange(w), rr.randrange(h), rr.choice((1, 1, 2))
        for dx in range(-s_, s_ + 1):
            for dy in range(-s_, s_ + 1):
                if abs(dx) + abs(dy) == s_ or (s_ == 1 and abs(dx) + abs(dy) == 1):
                    rgb[(y + dy) % h, (x + dx) % w] = PU3 if dy < 0 else PU1
        rgb[(y - s_ + 1) % h, (x - 1) % w] = WHITE
    for _ in range(10):
        x, y = rr.randrange(w), rr.randrange(h)
        rgb[y, x] = rr.choice((SP3, SP2, PU3))
    finish(rgb, 'floor_sporepool.png', 32)


def rune_ring(rgb, cx, cy, r0, r1, cols, n_runes=8, seed=0, ph=0.0):
    """A glowing ring between r0 and r1 with little angular runes standing in it (full-res numpy drawing)."""
    h, w = rgb.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.hypot(xx - cx, yy - cy)
    ang = (np.arctan2(yy - cy, xx - cx) + ph) % math.tau
    rgb[(r >= r0) & (r < r0 + 1.2)] = cols[1]
    rgb[(r >= r1 - 1.2) & (r < r1)] = cols[1]
    mid = (r0 + r1) / 2
    for k in range(n_runes):
        a0 = k / n_runes * math.tau
        da = (ang - a0 + math.pi) % math.tau - math.pi
        sx = da * mid
        sy = r - mid
        kind = (k + seed) % 4
        if kind == 0:
            m = (np.abs(sx) < 0.7) & (np.abs(sy) < 2.2) | (np.abs(sy + sx) < 0.7) & (np.abs(sx) < 1.8)
        elif kind == 1:
            m = (np.abs(np.abs(sx) - 1.4) < 0.7) & (np.abs(sy) < 2.2) | (np.abs(sy) < 0.6) & (np.abs(sx) < 2)
        elif kind == 2:
            m = (np.abs(sy - np.abs(sx) + 1) < 0.7) & (np.abs(sx) < 2.2) | (np.abs(sx) < 0.6) & (np.abs(sy) < 2.2)
        else:
            m = (np.abs(np.hypot(sx, sy) - 1.6) < 0.6)
        rgb[m & (np.abs(sy) < (r1 - r0) / 2)] = cols[2]


def tex_floor_teleport():
    """A teleport pad set in black marble: a glowing double ring of runes round a bright swirling core."""
    w = h = 64
    yy, xx = np.mgrid[0:h, 0:w]
    v, vein, crack = marble(32, 32, 481, 'Ground/Materials/ice_07.jpg')
    rgb = up2(gmap(v * 0.8, DM_STOPS))
    rgb[up2(vein)] = DM2
    cx = cy = 31.5
    r = np.hypot(xx - cx, yy - cy)
    ang = np.arctan2(yy - cy, xx - cx)
    g = np.clip(1 - np.abs(r - 22) / 9, 0, 1)
    rgb = blend(rgb, g > 0.3, TP0, 0.35)
    rgb = blend(rgb, (r < 30) & (r > 28.5), AU1, 1.0)
    rgb = blend(rgb, (r < 28.5) & (r > 27.5), AU3, 1.0)
    rgb[(r < 27.5)] = blend(rgb, np.ones((h, w), bool), (10, 18, 40), 0.65)[r < 27.5]
    rune_ring(rgb, cx, cy, 18, 26.5, (TP0, TP1, TP2), 10, 2)
    sw = np.sin(ang * 3 + r * 0.45)                                       # the swirl in the core
    core = r < 17
    rgb[core] = gmap(np.clip(0.4 + sw * 0.3 + (1 - r / 17) * 0.5, 0, 1), [(0, (20, 30, 80)), (0.4, TP0), (0.7, TP1), (0.9, TP2), (1, TP3)])[core]
    arm = core & (np.abs(sw) > 0.82) & (r > 4)
    rgb[arm] = blend(rgb, arm, MG1, 0.6)[arm]
    rgb[r < 4] = TP3
    rgb[(r >= 17) & (r < 18)] = TP1
    for k in range(4):                                                    # gold studs at the cardinal points
        x, y = int(round(cx + math.cos(k * math.pi / 2) * 29.2)), int(round(cy + math.sin(k * math.pi / 2) * 29.2))
        rgb[y - 1:y + 2, x - 1:x + 2] = AU2
        rgb[y, x] = AU4
    finish(rgb, 'floor_teleport.png', 48, half=False)


def tex_boss_mycelmother():
    # wall: a relief of the mother grown out of the mycelium: her great spotted cap glowing, gills, two eyes, root arms
    w, h = 64, 128
    n = pnoise(32, 64, 491, ((16, 1.0), (8, 0.5), (4, 0.3)))
    rgb = up2(gmap(np.clip(n * 0.9, 0, 1), EARTH_STOPS))
    s, net = mycel_net(64, 128, 492, 40, (14, 34))
    rgb = blend(rgb, (s > 0.12) & ~net, MY0, 0.45)
    rgb[net] = MY2
    p = Pic(w, h)
    cx = 32
    for sd in (-1, 1):                                                   # root arms spreading to the corners
        pts = [(cx + sd * 8, 60), (cx + sd * 16, 72), (cx + sd * 22, 92), (cx + sd * 28, 118), (cx + sd * 30, 127)]
        p.lines(pts, BK0, 6); p.lines(pts, BK1, 4); p.lines([(x - 1, y) for x, y in pts], BK2, 1)
        for k in range(3):
            bx, by = pts[k + 1]
            p.lines([(bx, by), (bx + sd * 6, by + 3), (bx + sd * 9, by + 9)], BK1, 2)
    p.poly([(cx - 9, 52), (cx + 9, 52), (cx + 12, 120), (cx - 12, 120)], STK1)          # her stalk-body
    p.poly([(cx - 7, 52), (cx + 2, 52), (cx - 2, 120), (cx - 10, 120)], STK2)
    for k in range(5):
        p.l(cx - 8 + k * 4, 70, cx - 10 + k * 5, 118, STK0)
    for k in range(9):                                                   # the ring: a frilled skirt hanging off the stalk
        x = cx - 16 + k * 4
        p.poly([(x - 1, 74), (x + 3, 74), (x + 4 + (k - 4) * 0.4, 86 + (k % 2) * 2), (x - 0.5 + (k - 4) * 0.4, 86 + (k % 2) * 2)],
               STK1 if k % 2 else STK2)
        p.l(x + 3, 75, x + 3.5 + (k - 4) * 0.4, 85 + (k % 2) * 2, STK0)
    p.l(cx - 17, 74, cx + 17, 74, STK3)
    p.poly([(cx - 7, 54), (cx + 7, 54), (cx + 5, 69), (cx, 72), (cx - 5, 69)], STK2)   # a long pale face under the cap
    p.l(cx - 6, 55, cx - 4, 69, STK3)
    for sd in (-1, 1):                                                   # slanted glowing eyes, no mouth, tear lines
        ex = cx + sd * 3
        p.poly([(ex - 2.5, 58 - sd * 0.0), (ex + 2.5, 58 + 0), (ex + sd * 1.5, 60.5)], (14, 6, 18))
        p.l(ex - 1.5, 58.5, ex + 1.5, 58.5, GW3); p.p(ex, 59.5, GW2)
        p.l(ex, 62, ex + sd * 0.5, 67, STK0)
    spotted_cap(p, cx, 14, 62, 36, seed=5, nsp=7, gills=GW1, glowsp=True)
    for k in range(17):                                                  # glowing gill fan under the cap
        x = cx - 28 + k * 3.5
        p.l(x, 51, cx + (x - cx) * 0.4, 55, GW2 if k % 2 else GW1)
    a = np.array(p.im); m = a[:, :, 3] > 0
    rgb = blend(rgb, (glow(m.astype(float), 3) > 0.1) & ~m, GW0, 0.45)
    rgb[m] = a[m, :3]
    rgb[wrap_outline(m)] = OUT
    rr = random.Random(493)
    for _ in range(26):                                                  # floating spores
        x, y = rr.randrange(w), rr.randrange(h)
        if not m[y, x]:
            rgb[y, x] = rr.choice((GW2, GW3, SP3))
    finish(rgb, 'wall_boss_mycelmother.png', 56, half=False)

    # floor: dark earth woven with mycelium, a fairy ring of little glowing caps in every tile
    w = h = 32
    n = pnoise(w, h, 494)
    yy, xx = np.mgrid[0:h, 0:w]
    rgb = gmap(np.clip(n * 0.8, 0, 1), EARTH_STOPS)
    s, net = mycel_net(w, h, 495, 7, (8, 18))
    rgb = blend(rgb, (s > 0.15) & ~net, MY0, 0.4)
    rgb[net] = MY1
    r = np.hypot(xx - 15.5, yy - 15.5)
    rgb = blend(rgb, (r > 7) & (r < 13), (20, 60, 60), 0.35)             # the ring's faint glow on the earth
    q = Pic(w, h)
    for k in range(9):
        a_ = k / 9 * math.tau + 0.3
        x, y = 15.5 + math.cos(a_) * 10, 15.5 + math.sin(a_) * 10
        q.l(x, y, x, y + 1, STK2)
        q.e(x - 1.5, y - 1.5, x + 1.5, y + 0.5, GW1); q.p(x - 0.5, y - 1, GW3)
    q.e(14, 14, 17, 17, CP1); q.p(15, 15, CP3)                            # a purple button cap in the middle
    a = np.array(outline_same(q.im)); m = a[:, :, 3] > 0
    rgb[m] = a[m, :3]
    finish(rgb, 'floor_boss_mycelmother.png', 40)


def tex_boss_mirrorking():
    # wall: black marble, a tall diamond-shaped mirror under a silver crown, framed in silver, glass shards around it
    w, h = 64, 128
    v, vein, crack = marble(32, 64, 501, 'Ground/Materials/ice_09.jpg')
    rgb = up2(gmap(v * 0.85, DM_STOPS))
    rgb[up2(vein)] = DM3
    yy, xx = np.mgrid[0:h, 0:w]
    for x0 in (2, 61):                                                   # silver pilasters at the edges (tiles)
        rgb[:, x0 - 2:x0 + 1] = SV1 if x0 < 32 else SV1
    rgb[:, 0] = SV2; rgb[:, 63] = SV0
    p = Pic(w, h)
    cx, cy = 31.5, 74
    dia = [(cx, cy - 46), (cx + 24, cy), (cx, cy + 46), (cx - 24, cy)]
    p.poly([(x + (1 if x > cx else -1 if x < cx else 0) * 3, y + (1 if y > cy else -1 if y < cy else 0) * 3) for x, y in dia], SV0)
    p.poly([(x + (1 if x > cx else -1 if x < cx else 0) * 2, y + (1 if y > cy else -1 if y < cy else 0) * 2) for x, y in dia], SV2)
    p.l(cx - 26, cy, cx, cy - 48, SV3)
    a = np.array(p.im); fm = a[:, :, 3] > 0
    rgb[fm] = a[fm, :3]
    q = Pic(w, h)
    mirror_glass(q, int(cx - 24), int(cy - 46), int(cx + 24), int(cy + 46), streaks=3)
    ga = np.array(q.im)
    dm = (np.abs(xx - cx) / 24 + np.abs(yy - cy) / 46) <= 1.0
    ga[~dm] = 0
    gm = ga[:, :, 3] > 0
    rgb[gm] = ga[gm, :3]
    c = Pic(w, h)                                                        # the crown on top: silver band, glass spikes
    by = int(cy - 49)
    c.r(cx - 13, by - 3, cx + 13, by + 3, SV0)
    c.r(cx - 12, by - 2, cx + 12, by + 2, SV2)
    c.l(cx - 12, by - 2, cx + 12, by - 2, SV3)
    for k, (dx, ht) in enumerate(((-11, 8), (-5.5, 12), (0, 17), (5.5, 12), (11, 8))):
        shard(c, cx + dx, by - 2, -math.pi / 2 + dx * 0.025, ht, 2.6)
    for k in range(5):
        c.e(cx - 10.5 + k * 5, by - 1, cx - 8.5 + k * 5, by + 1, (200, 40, 80) if k == 2 else GS1)
    for (sx, sy, a_, ln) in ((8, 30, 0.6, 12), (54, 40, 2.4, 10), (10, 110, -0.5, 11), (52, 104, 3.6, 12), (6, 70, 1.2, 8), (57, 76, 2.0, 8)):
        shard(c, sx, sy, a_, ln, 2.2)
    a = np.array(c.im); m = a[:, :, 3] > 0
    rgb[m] = a[m, :3]
    allm = fm | m
    rgb[wrap_outline(allm)] = OUT
    rgb = blend(rgb, (glow(gm.astype(float), 3) > 0.1) & ~allm & ~gm, MR1, 0.35)
    finish(rgb, 'wall_boss_mirrorking.png', 56, half=False)

    # floor: black and white marble chequer, a silver-rimmed mirror lozenge inlaid where four tiles meet
    w = h = 32
    v, vein, crack = marble(w, h, 502, 'Ground/Materials/ice_07.jpg')
    yy, xx = np.mgrid[0:h, 0:w]
    blk = ((xx // 16) + (yy // 16)) % 2 == 1
    rgb = gmap(v, MB_STOPS)
    rgb = blend(rgb, vein, MB0, 0.5)
    rgb[blk] = gmap(v[blk] * 0.8, DM_STOPS)
    rgb[blk & vein] = DM3
    grout = (xx % 16 == 0) | (yy % 16 == 0)
    rgb[grout] = SV1
    cx_, cy_ = ((xx + 8) % 16) - 7.5, ((yy + 8) % 16) - 7.5
    d_ = np.abs(cx_) + np.abs(cy_)
    loz = d_ <= 4.5
    t = (cy_ + 4.5) / 9
    rgb[loz] = MR2
    rgb[loz & (cy_ > 0)] = MR1
    rgb[loz & (cy_ > 2.5)] = MR0
    rgb[loz & (cy_ < -2.5)] = MR3
    rgb[loz & (np.abs(cx_ + cy_ + 1) < 0.8)] = MR4
    rgb[(d_ > 4.5) & (d_ <= 5.5)] = SV3
    rgb[(d_ > 5.5) & (d_ <= 6.3)] = SV0
    finish(tone(rgb, 0.78), 'floor_boss_mirrorking.png', 40)


@builder('textures')
def make_textures():
    tex_wall_mycel(); tex_wall_mushroomcap(); tex_wall_marble(); tex_wall_mirror()
    tex_floor_moss(); tex_floor_marble(); tex_floor_bouncepad(); tex_floor_sporepool(); tex_floor_teleport()
    tex_boss_mycelmother(); tex_boss_mirrorking()


# ================================================================== PROPS
GLOW_DIM = (dark(GW0, 0.7), GW0, GW1, GW2)
GLOW_MID = (GW0, GW1, GW2, GW3)
GLOW_HI = (GW1, GW2, GW3, WHITE)


def glowshroom(k):
    """A cluster of three glowing mushrooms; k = 0..3 runs through one pulse (dim, rising, bright, falling)."""
    p = Pic(34, 40)
    pal = (GLOW_DIM, GLOW_MID, GLOW_HI, GLOW_MID)[k]
    q = Pic(34, 40)                                                      # light motes and the halo (not outlined)
    if k in (1, 2, 3):
        r2 = random.Random(k)
        n = (0, 6, 12, 6)[k]
        for _ in range(n):
            a = r2.uniform(math.pi, math.tau); d = r2.uniform(13, 16 + k)
            q.p(17 + math.cos(a) * d, 20 + math.sin(a) * d * 0.9, r2.choice((GW1, GW2, GW3) if k == 2 else (GW0, GW1, GW2)))
    for (x, top, w, h, sh, seed) in ((9, 18, 12, 5, 10, 1), (25, 22, 10, 4, 8, 2), (17, 4, 18, 7, 14, 3)):
        base = top + h
        p.r(x - 1.5, base, x + 1.5, base + sh, STK1)                     # stalk
        p.l(x - 1.5, base, x - 1.5, base + sh, STK3)
        p.l(x + 1.5, base + 1, x + 1.5, base + sh, STK0)
        spotted_cap(p, x, top, w, h, pal, spots=WHITE if k == 2 else pal[3], seed=seed, nsp=3, gills=pal[1])
    puff(p, 17, 37, 4, (MS0, MS1, MS2, MS3)); puff(p, 8, 38, 3, (MS0, MS1, MS2, MS3)); puff(p, 27, 38, 3, (MS0, MS1, MS2, MS3))
    im = outline(cut_below(p.im, 38))
    if k == 2:                                                           # the bright beat: a broken ring of light round the caps
        for i in range(14):
            a = math.pi + i / 13 * math.pi
            if i % 3 != 1:
                q.p(18 + math.cos(a) * 18, 15 + math.sin(a) * 12, GW2)
    out = Image.new('RGBA', im.size)
    out.paste(q.im, (1, 1))
    return on(out, im)


def mirrorstatue():
    """A white marble lady on a pedestal holding up a great oval mirror before her; the mirror catches the light."""
    p = Pic(34, 62)
    p.r(3, 54, 30, 61, MB0); p.r(4, 54, 29, 57, MB2); p.l(3, 61, 30, 61, (120, 118, 134))     # pedestal
    p.r(5, 50, 28, 53, MB1); p.l(5, 50, 28, 50, MB3); p.l(5, 52, 28, 52, AU2)
    p.r(9, 56, 24, 59, MB1); p.l(9, 56, 24, 56, AU1)                                          # plaque
    p.poly([(8, 50), (11, 24), (22, 24), (26, 50)], MB1)                                      # robe
    p.poly([(10, 50), (12, 24), (16, 24), (14, 50)], MB2)
    for x in (13, 17, 21):
        p.l(x, 30, x + (x - 17) * 0.35, 50, MB0)                                              # folds
    p.l(9, 49, 25, 49, MB3)
    p.e(11, 15, 22, 25, MB1)                                                                  # shoulders
    p.l(16.5, 14, 16.5, 17, MB0)                                                              # neck
    p.e(12, 3, 21, 14, MB1)                                                                   # head with the hair drawn back
    p.e(13, 6, 20, 14, MB2); p.e(14, 7, 17, 10, MB3)                                          # the face
    p.l(13, 5, 20, 5, MB3); p.p(16.5, 6, MB0)                                                 # parting
    p.l(14, 10, 15, 10, MB0); p.l(18, 10, 19, 10, MB0); p.l(16, 12, 17, 12, MB0)              # closed eyes and mouth
    for (sx, hx) in ((12, 8), (21, 25)):                                                      # arms raised to the mirror's rim
        p.l(sx, 19, hx, 25, MB0, 3); p.l(sx, 18, hx, 24, MB2)
    p.e(5, 19, 28, 47, SV0)                                                                    # the mirror: silver rim
    p.e(6, 20, 27, 46, SV2)
    p.arc(6, 20, 27, 46, 160, 260, SV3)
    mirror_glass(p, 8, 22, 25, 44, seed=1, oval=True)
    for (x, y) in ((16.5, 18), (16.5, 47)):
        p.e(x - 1.5, y - 1.5, x + 1.5, y + 1.5, AU2); p.p(x - 0.5, y - 0.5, AU4)
    p.e(6, 23, 10, 28, MB2); p.e(23, 23, 27, 28, MB2)                                          # hands round the rim
    return outline(p.im)


def bouncecap(k):
    """A big red bounce mushroom: 0 = at rest, 1 = squashed flat under a weight, 2 = springing up (stretched)."""
    p = Pic(40, 34)
    cw, ch, sh = ((32, 11, 8), (38, 8, 3), (26, 14, 13))[k]
    base = 31
    top = base - sh - ch
    sw = (5, 7, 4)[k]
    p.poly([(20 - sw, base), (20 - sw + 1, base - sh), (20 + sw - 1, base - sh), (20 + sw, base)], STK1)
    p.l(20 - sw + 1, base - sh, 20 - sw, base, STK3)
    p.l(20 + sw - 1, base - sh + 1, 20 + sw, base, STK0)
    for j in range(1, sh, 3):
        p.p(20 + (j % 2) * 2 - 1, base - j, STK0)
    spotted_cap(p, 20, top, cw, ch, (RC0, RC1, RC2, RC3), seed=7, nsp=5, gills=(150, 120, 100))
    puff(p, 11, 32, 3, (MS0, MS1, MS2, MS3)); puff(p, 29, 32, 3.5, (MS0, MS1, MS2, MS3)); puff(p, 20, 33, 2.5, (MS0, MS1, MS2, MS3))
    im = outline(cut_below(p.im, 33))
    if k == 2:                                                           # springing: motion lines and a puff of spores
        q = Pic(im.width, im.height)
        for x in (6, 34):
            q.l(x, top + 3, x, top + 9, WHITE)
        spore_motes(q, 6, 3, (8, top - 6, 32, top - 1))
        im = on(im, q.im)
    if k == 1:
        q = Pic(im.width, im.height)
        for x in (1, 39):
            q.l(x, base - 3, x + (2 if x < 20 else -2), base - 6, WHITE)
        im = on(im, q.im)
    return im


def teleportfx(k):
    """A swirl of light rising from the teleport pad: four spiral ribbons (cyan and magenta) turning round a bright
    axis, dim where they pass behind it (binary alpha, no outline)."""
    p = Pic(38, 54)
    cx, base = 19, 49
    p.e(cx - 17, base - 4, cx + 17, base + 4, TP0)                         # the lit ring on the floor
    p.e(cx - 14, base - 3, cx + 14, base + 3, (0, 0, 0, 0))
    p.arc(cx - 17, base - 4, cx + 17, base + 4, 0, 180, TP1)
    p.arc(cx - 15, base - 3, cx + 15, base + 3, 200 + k * 25, 330 + k * 25, TP3)
    arms = []
    for j in range(4):
        pts = []
        for i in range(34):
            t = i / 33
            a = k * math.pi / 4 + j * math.tau / 4 + t * 4.6
            r = 15 * (1 - t * 0.6)
            pts.append((cx + math.cos(a) * r, base - 2 - t * 44 + math.sin(a) * r * 0.28, math.sin(a)))
        arms.append(pts)
    for j, pts in enumerate(arms):                                         # behind the axis: thin and dark
        for a_, b_ in zip(pts, pts[1:]):
            if a_[2] < 0:
                p.l(a_[0], a_[1], b_[0], b_[1], IL1 if j % 2 else TP0, 1)
    p.l(cx, base - 3, cx, base - 44 + (k % 2) * 3, TP1)                    # the bright axis
    p.l(cx, base - 8, cx, base - 34, TP3)
    for j, pts in enumerate(arms):                                         # in front: wide, with a light core
        for a_, b_ in zip(pts, pts[1:]):
            if a_[2] >= 0:
                p.l(a_[0], a_[1], b_[0], b_[1], MG1 if j % 2 else TP1, 2)
        for a_, b_ in zip(pts, pts[1:]):
            if a_[2] >= 0.45:
                p.l(a_[0], a_[1], b_[0], b_[1], MG2 if j % 2 else TP3, 1)
    r2 = random.Random(k + 40)
    for _ in range(9):
        x, y = cx + r2.uniform(-15, 15), base - r2.uniform(6, 50)
        if r2.random() < 0.4:
            p.ps([(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], TP2); p.p(x, y, TP3)
        else:
            p.p(x, y, r2.choice((TP3, MG2, TP2)))
    return p.im


def sporecloud(k):
    """A drifting cloud of violet spores with green motes; k turns the puffs slowly."""
    p = Pic(36, 30)
    r2 = random.Random(k * 3 + 5)
    blobs = [(10 + k, 18, 6), (18, 13 - (k == 1), 8), (26 - k, 17, 6.5), (16 + k, 21, 6), (24, 22 + (k == 2), 5)]
    for (x, y, r) in blobs:
        puff(p, x, y, r, (PU0, PU1, PU2, PU3))
    im = outline(p.im)
    q = Pic(im.width, im.height)
    spore_motes(q, 10, 20 + k, (3, 2, 33, 27), (SP1, SP2, SP3))
    for (x, y) in ((4 + k * 3, 3 + k), (31 - k * 2, 5)):
        q.p(x, y, PU3)
    return on(im, q.im)


@builder('props')
def make_props():
    save_prop('glowshroom', [glowshroom(k) for k in range(4)])
    save_prop('mirrorstatue', [mirrorstatue()])
    save_prop('bouncecap', [bouncecap(k) for k in range(3)])
    save_prop('teleportfx', [teleportfx(k) for k in range(4)])
    save_prop('sporecloud', [sporecloud(k) for k in range(3)])


# ================================================================== ITEMS, PARTICLES, HUD ICONS
SACK0, SACK1, SACK2, SACK3 = (88, 64, 40), (140, 106, 66), (184, 148, 96), (216, 186, 132)


def sporesack(p, x, y):
    """A bulging burlap sack (bottom centre at x, y) tied at the neck, spores glowing out of its mouth."""
    p.e(x - 7, y - 11, x + 7, y, SACK1)
    p.e(x - 6, y - 11, x + 3, y - 3, SACK2)
    p.arc(x - 6, y - 10, x + 2, y - 2, 180, 260, SACK3)
    for j in range(3):                                                   # burlap weave
        p.l(x - 5 + j * 4, y - 9, x - 6 + j * 4, y - 1, SACK0)
    p.poly([(x - 3, y - 11), (x + 3, y - 11), (x + 4, y - 15), (x - 4, y - 15)], SACK1)   # gathered neck
    p.l(x - 4, y - 11, x + 4, y - 11, (60, 40, 30)); p.p(x + 3, y - 10, (60, 40, 30)); p.p(x + 4, y - 9, (60, 40, 30))   # cord
    p.e(x - 4, y - 17, x + 4, y - 14, PU1); p.e(x - 3, y - 17, x + 2, y - 15, PU2)          # spores heaped in the mouth
    p.p(x - 1, y - 16, SP3); p.p(x + 2, y - 16, SP2)
    p.l(x - 1, y - 7, x + 1, y - 7, CP2); p.r(x - 2, y - 8, x + 2, y - 8, CP2); p.l(x, y - 6, x, y - 4, STK3)  # stamped mushroom


@builder('items')
def make_items():
    p = Pic(16, 20)
    sporesack(p, 8, 19)
    im = outline_same(p.im)
    q = Pic(16, 20)
    q.p(4, 1, SP2); q.p(10, 0, SP3); q.p(13, 3, PU3); q.p(2, 4, PU2)
    save(hard(on(im, q.im)), G_OUT + 'item_sporesack.png')


@builder('particles')
def make_particles():
    fr = []                                                              # spore ball (2 frames 9x9): violet with green specks
    for k in range(2):
        p = Pic(9, 9)
        p.e(0.5, 0.5, 7.5, 7.5, PU1)
        p.e(1, 1, 5.5, 5.5, PU2)
        p.p(2, 2, PU3)
        for (x, y) in (((5, 3), (3, 6), (6, 6)), ((4, 5), (6, 3), (2, 5)))[k]:
            p.p(x, y, SP2 if (x + y) % 2 else SP3)
        fr.append(outline_same(p.im))
    save(cells(fr, 9, 9), G_OUT + 'part_spore2.png', 2)
    fr = []                                                              # glass shard (2 frames 7x7, tumbling)
    for k in range(2):
        p = Pic(7, 7)
        shard(p, 0.5 if k == 0 else 1, 5.5 if k == 0 else 1, -0.75 if k == 0 else 0.9, 6.5, 1.8)
        fr.append(outline_same(p.im))
    save(cells(fr, 7, 7), G_OUT + 'part_glassshard.png', 2)
    p = Pic(8, 5)                                                        # braided whip lash segment (tile it along the lash)
    p.r(0, 1, 7, 3, (96, 60, 34))
    for x in range(0, 8, 4):
        p.l(x, 3, x + 2, 1, (150, 100, 58)); p.p(x + 3, 2, (60, 36, 22))
    p.l(0, 1, 7, 1, (176, 124, 74))
    save(hard(outline_same(p.im)), G_OUT + 'part_whip.png')
    fr = []                                                              # illusion shimmer (additive on black, 2 frames 8x8)
    for k in range(2):
        p = Pic(8, 8)
        p.r(0, 0, 7, 7, (0, 0, 0))
        if k == 0:
            p.l(3.5, 0, 3.5, 7, (70, 30, 110)); p.l(0, 3.5, 7, 3.5, (70, 30, 110))
            p.l(3.5, 1, 3.5, 6, IL2); p.l(1, 3.5, 6, 3.5, IL2)
            p.r(3, 3, 4, 4, IL3); p.p(3, 3, WHITE)
        else:
            p.ps([(1, 1), (6, 6), (1, 6), (6, 1)], (60, 26, 96))
            p.ps([(2, 2), (5, 5), (2, 5), (5, 2)], IL1)
            p.r(3, 3, 4, 4, IL2); p.ps([(3, 2), (4, 5), (2, 4), (5, 3)], (200, 150, 240)); p.p(4, 3, WHITE)
        fr.append(p.im)
    save(cells(fr, 8, 8), G_OUT + 'part_illusion.png', 2, additive=True)
    spore = ["..####..", ".######.", "##.##.##", "########", "...##...", "...##...", "..####..", "........"]  # HUD: spore ammo
    p = Pic(8, 8)
    p.bitmap(0, 0, spore, {'#': WHITE})
    save(p.im, G_OUT + 'icon_spore.png')


# ================================================================== TOUCH ICONS (96x96 white on transparent)
@builder('icons')
def make_icons():
    def shield(d, k):     # a round mirror shield: rim, face, two diagonal glints cut through it
        S = lambda *v: [x * k for x in v]
        d.ellipse(S(6, 6, 90, 90), fill=255)
        d.ellipse(S(14, 14, 82, 82), fill=0)
        d.ellipse(S(19, 19, 77, 77), fill=255)
        d.polygon(S(34, 22, 46, 22, 22, 74, 18, 64), fill=0)
        d.polygon(S(54, 24, 59, 26, 34, 78, 29, 76), fill=0)
        d.ellipse(S(44, 44, 52, 52), fill=0)
        d.ellipse(S(46, 46, 50, 50), fill=255)
    save(P3.icon(shield), T_OUT + 'icon_shield.png')


# ================================================================== SPORLING (drawn, 32x32: a little walking mushroom that bursts into spores)
SPL_CAP = (CP0, CP1, CP2, CP3)


def sporling_frame(t=0.0, step=None, bob=0, sq=1.0, tilt=0.0, eyes=1, mouth=0, swell=0.0, dx=0, fl=None, arms=0.0,
                   cap_dy=0, legs=True):
    """Side view facing right, feet on row 28. sq: squash (<1) / stretch (>1) of the whole body; swell (0..1): the cap
    puffs up before it bursts; arms: 0 hanging .. 1 thrown up."""
    p = Pic(32, 32)
    cx, by = 15 + dx, 28
    body_h = 9 * sq
    top = by - 3 - body_h + bob
    if legs:
        for k, ox in enumerate((-2, 2)):                                  # two stubby feet
            ph = (step + k * math.pi) if step is not None else 0
            lift = max(0, math.sin(ph)) * 1.5 if step is not None else 0
            fx = cx + ox + (math.cos(ph) * 1.5 if step is not None else 0)
            p.r(fx - 1, by - 3 - lift, fx + 1, by - lift, STK0 if k == 0 else STK1)
            p.l(fx - 1, by - lift, fx + 2, by - lift, (80, 60, 52))
    p.poly([(cx - 4, by - 3 + bob * 0.5), (cx - 3.5, top + 1), (cx + 3.5, top + 1), (cx + 4, by - 3 + bob * 0.5)], STK2)   # stalk body
    p.l(cx - 3.5, top + 1, cx - 4, by - 3, STK3)
    p.l(cx + 3.5, top + 2, cx + 4, by - 3, STK1)
    fy = top + 5 + body_h * 0.12
    ec = (24, 14, 22)
    if eyes == 1:
        p.r(cx + 1, fy - 1, cx + 1, fy, ec); p.r(cx + 3, fy - 1, cx + 3, fy, ec)
    elif eyes == 2:                                                      # angry: slanted brows and red eyes
        p.p(cx + 1, fy, (200, 40, 50)); p.p(cx + 3, fy, (200, 40, 50)); p.l(cx, fy - 1, cx + 1, fy - 1, ec); p.l(cx + 3, fy - 1, cx + 4, fy - 2, ec)
    elif eyes == 3:                                                      # x-eyes
        for ex in (cx + 1, cx + 3):
            p.p(ex, fy, ec)
        p.p(cx + 1, fy - 1, ec); p.p(cx + 3, fy + 1, ec)
    else:
        p.l(cx + 1, fy, cx + 3, fy, ec)
    if mouth:
        p.e(cx + 1.5, fy + 2, cx + 3.5, fy + 2 + mouth, (60, 20, 30))
    else:
        p.p(cx + 2, fy + 2, (120, 90, 80))
    for sd, ang in ((-1, arms), (1, arms)):                               # little arms
        ax = cx + sd * 4
        ex, ey = ax + sd * 2, fy + 3 - arms * 6
        p.l(ax, fy + 2, ex, ey, STK1 if sd < 0 else STK2)
    w = 17 + swell * 7
    h = 7 * (2 - sq) ** 0.4 + swell * 3
    im_cap = Pic(32, 32)
    spotted_cap(im_cap, cx, top - h + 2 + cap_dy, w, h, SPL_CAP if swell < 0.6 else (CP1, CP2, CP3, (240, 190, 240)),
                seed=3, nsp=4 + int(swell * 2), gills=STK1)
    cim = im_cap.im
    if tilt:
        cim = cim.rotate(tilt, resample=Image.NEAREST, center=(cx, top))
    im = on(p.im, cim)
    im = outline_same(cut_below(im, 28))
    if fl:
        im = flash(im, fl)
    return im


def spore_burst(size, cx, cy, r, seed, k=1.0, motes=10):
    """A burst of spores: small outlined violet puffs spread round (cx, cy) with gaps between them and green motes
    flung outwards; k (0..1) = how far it has spread and thinned."""
    p = Pic(size, size)
    r2 = random.Random(seed)
    n = max(3, int(10 * (1 - k * 0.55)))
    for i in range(n):
        a = i / n * math.tau + r2.uniform(-0.3, 0.3); d = r * r2.uniform(0.25, 0.75) * (0.8 + k * 0.4)
        rr = r * r2.uniform(0.22, 0.34) * (1 - k * 0.4)
        puff(p, cx + math.cos(a) * d, cy + math.sin(a) * d * 0.8, max(1.5, rr), (PU0, PU1, PU2, PU3))
    if k < 0.5:
        puff(p, cx, cy, r * 0.3, (PU1, PU2, PU3, (250, 230, 255)))
    im = outline_same(p.im)
    q = Pic(size, size)
    for i in range(motes):
        a = r2.uniform(0, math.tau); d = r * (0.8 + k * 0.6) * r2.uniform(0.5, 1.1)
        x, y = cx + math.cos(a) * d, cy + math.sin(a) * d * 0.85
        q.p(x, y, r2.choice((SP1, SP2, SP3, PU3)))
    return on(im, q.im)


def sporling_dead(k):
    """The empty cap lying deflated on the floor, the last spores drifting off it."""
    p = Pic(32, 32)
    p.poly([(5, 28), (8, 24), (14, 22), (21, 23), (26, 26), (27, 28)], CP0)
    p.poly([(6, 27), (9, 24), (14, 23), (20, 24), (25, 27)], CP1)
    p.l(9, 25, 15, 23.5, CP2)
    p.p(11, 25, SPOT1); p.p(18, 25, SPOT0); p.p(22, 26, SPOT0)
    p.r(17, 26, 21, 28, STK1); p.l(17, 26, 21, 26, STK2)                   # the shrivelled stalk
    im = outline_same(cut_below(p.im, 28))
    q = Pic(32, 32)
    spore_motes(q, 5 - k * 2, 60 + k, (6, 12 - k * 2, 26, 22), (SP1, SP2, PU2))
    return on(im, q.im)


@builder('sporling')
def make_sporling():
    S = sporling_frame
    save_enemy('sporling', 'idle', [S(t=i / 4, bob=(0, 0, 1, 1)[i], sq=(1.0, 1.02, 0.96, 0.98)[i], eyes=0 if i == 3 else 1,
                                      swell=(0, 0.05, 0.1, 0.05)[i]) for i in range(4)], 32)
    save_enemy('sporling', 'movement', [S(t=i / 6, step=i * math.tau / 6, bob=(0, -1, 0, 0, -1, 0)[i], tilt=(-6, 0, 6, -6, 0, 6)[i] * 0.6,
                                          arms=0.2 * (i % 2)) for i in range(6)], 32)
    # attack: crouches, hops forward and puffs a cloud of spores out of its cap at you
    att = [S(sq=0.8, eyes=2, swell=0.2), S(sq=1.15, bob=-4, eyes=2, dx=2, tilt=-10, arms=0.7, swell=0.35, mouth=1),
           S(sq=0.85, eyes=2, dx=3, swell=0.5, mouth=2, tilt=-14, arms=1.0), S(sq=0.95, eyes=2, dx=3, mouth=1, tilt=-6, arms=0.5),
           S(sq=1.0, dx=1)]
    att[2] = on(att[2], spore_burst(32, 25, 12, 6, 5, 0.0, 6))
    att[3] = on(att[3], spore_burst(32, 26, 11, 7, 6, 0.5, 8))
    save_enemy('sporling', 'attack', att, 32)
    save_enemy('sporling', 'take_damage', [S(dx=-2, eyes=3, mouth=1, tilt=10, fl=(255, 255, 255)), S(dx=-1, eyes=2, tilt=5, mouth=1), S()], 32)
    # death: it swells up and bursts in a cloud of spores, leaving its limp cap on the floor
    d = [S(eyes=3, mouth=2, swell=0.5, sq=1.05), S(eyes=3, mouth=2, swell=1.0, sq=1.1, bob=-1, arms=1.0)]
    d.append(on(sporling_dead(0), spore_burst(32, 15, 16, 11, 9, 0.0, 12)))
    d.append(on(sporling_dead(0), spore_burst(32, 15, 15, 13, 10, 0.4, 12)))
    d.append(on(sporling_dead(1), spore_burst(32, 15, 13, 13, 11, 0.8, 10)))
    d.append(sporling_dead(2))
    save_enemy('sporling', 'death', d, 32)


# ================================================================== SHARDLING (drawn, 32x32: a little spiky creature of glass shards)
def shardling_frame(t=0.0, step=None, bob=0, flare=0.0, lean=0.0, eyes=1, dx=0, fl=None, crack=0, core=1):
    """A bristling ball of glass shards on four needle legs, a glowing core in the middle; flare (0..1) spreads the
    shards out (attack), lean tips it forward."""
    p = Pic(32, 32)
    cx, cy = 15 + dx, 19 + bob
    for k, (hx, fx) in enumerate(((-4, -7), (-1, -2), (2, 3), (4, 8))):   # needle legs
        ph = (step + k * 1.7) if step is not None else 0
        lift = max(0, math.sin(ph)) * 2 if step is not None else 0
        sx = math.cos(ph) * 1.5 if step is not None else 0
        c = GS0 if k in (0, 2) else GS1
        p.lines([(cx + hx, cy + 3), (cx + (hx + fx) / 2 + sx, cy + 5 - lift), (cx + fx + sx, 28 - lift)], c)
        p.p(cx + fx + sx, 28 - lift, GS2)
    spikes = [(-2.5, 7), (-2.0, 8), (-1.5, 9), (-1.0, 9), (-0.5, 8), (0.1, 7), (0.6, 6), (2.6, 7), (3.0, 7)]
    r2 = random.Random(7)
    back = []
    for a, ln in spikes:                                                 # far shards (darker) then the near ones
        a2 = a + lean * 0.2 + math.sin(t * math.tau + a) * 0.05
        ln2 = ln * (1 + flare * 0.5)
        back.append((a2, ln2))
        shard(p, cx, cy, a2 + 0.25, ln2 * 0.85, 2.0, (dark(GS0, 0.7), GS0, GS1, GS2))
    p.e(cx - 5, cy - 4, cx + 5, cy + 4, GS0)                              # the body
    p.e(cx - 4, cy - 4, cx + 3, cy + 2, GS1)
    if core:
        cc = (GW3, WHITE) if core == 2 else (TP2, TP3)
        p.e(cx - 2, cy - 2, cx + 2, cy + 2, cc[0]); p.p(cx, cy - 1, cc[1])
    for a2, ln2 in back:
        shard(p, cx + math.cos(a2) * 2, cy + math.sin(a2) * 2, a2, ln2 * 0.7, 1.6)
    ec = (150, 30, 80) if eyes == 1 else (255, 70, 110) if eyes == 2 else GS0
    for ex in (cx + 1, cx + 4):
        p.r(ex, cy - 1, ex, cy, ec)
    if crack:
        r3 = random.Random(crack)
        for _ in range(crack):
            x0, y0 = cx + r3.randint(-3, 3), cy + r3.randint(-3, 2)
            p.lines([(x0, y0), (x0 + r3.randint(-2, 2), y0 + 2), (x0 + r3.randint(-2, 2), y0 + 4)], (30, 50, 70))
    im = p.im
    if lean:
        im = im.rotate(-lean * 8, resample=Image.NEAREST, center=(cx, 28))
    im = outline_same(cut_below(im, 28))
    if fl:
        im = flash(im, fl)
    return im


def shard_heap(k, seed=3):
    """Shards scattered and lying flat on the floor after it shattered; k (0..2) = how far they have scattered."""
    p = Pic(32, 32)
    r2 = random.Random(seed)
    for i in range(9):
        x = 15 + r2.uniform(-5, 5) * (1 + k * 0.8)
        y = 27 - (2 - k) * r2.uniform(0, 4) if k < 2 else 27 - r2.uniform(0, 1)
        a = r2.uniform(-0.4, 0.4) + (math.pi if r2.random() < 0.5 else 0)
        shard(p, x, y, a, r2.uniform(3, 6), 1.3)
    im = outline_same(cut_below(p.im, 28))
    q = Pic(32, 32)
    for i in range(4 - k):
        x, y = 15 + r2.uniform(-10, 10), 26 - r2.uniform(0, 10)
        q.ps([(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], GS2); q.p(x, y, WHITE)
    return on(im, q.im)


@builder('shardling')
def make_shardling():
    S = shardling_frame
    save_enemy('shardling', 'idle', [S(t=i / 4, bob=(0, 0, 1, 1)[i], core=2 if i == 2 else 1) for i in range(4)], 32)
    save_enemy('shardling', 'movement', [S(t=i / 6, step=i * math.tau / 6, bob=(0, -1, 0, -1, 0, -1)[i], lean=0.5) for i in range(6)], 32)
    att = [S(flare=0.3, eyes=2, bob=1, lean=-0.5), S(flare=0.8, eyes=2, lean=1.5, dx=3, bob=-2, core=2),
           S(flare=1.0, eyes=2, lean=2.0, dx=5, bob=-1, core=2), S(flare=0.5, eyes=2, lean=1.0, dx=3), S(flare=0.1, dx=1)]
    q = Pic(32, 32)                                                      # glints of the lunge
    for k in range(3):
        q.l(28, 13 + k * 3, 31, 12 + k * 3, WHITE if k == 1 else GS2)
    att[2] = on(att[2], q.im)
    save_enemy('shardling', 'attack', att, 32)
    save_enemy('shardling', 'take_damage', [S(dx=-2, eyes=2, crack=2, fl=(255, 255, 255), lean=-1), S(dx=-1, eyes=2, crack=2), S(crack=1)], 32)
    d = [S(eyes=2, crack=3, flare=0.4, core=2), S(eyes=0, crack=5, flare=0.8, core=2, bob=-1)]
    burst = Pic(32, 32)                                                  # the shattering: shards flung out round a flash
    r2 = random.Random(11)
    for i in range(10):
        a = i / 10 * math.tau + r2.uniform(-0.2, 0.2)
        shard(burst, 15 + math.cos(a) * 5, 19 + math.sin(a) * 5, a, r2.uniform(4, 7), 1.5)
    bim = outline_same(cut_below(burst.im, 28))
    fq = Pic(32, 32); fq.e(11, 15, 19, 23, WHITE); fq.e(13, 17, 17, 21, GW3)
    d.append(on(fq.im, bim))
    d += [shard_heap(0), shard_heap(1), shard_heap(2)]
    save_enemy('shardling', 'death', d, 32)


# ================================================================== MYCELBRUTE (drawn, 64x64: a hulking beast of mycelium and roots)
MYD = (dark(MY0, 0.8), dark(MY1, 0.75), dark(MY2, 0.75), dark(MY3, 0.75))          # far side
ORC = ((110, 50, 20), (176, 96, 36), (226, 150, 64), (250, 204, 120))                # orange shelf caps


def root_arm(p, sx, sy, ang, ln, far=False, claw=1.0, seed=0):
    """A twisted root arm from the shoulder (sx, sy) along ang (0 = forward/right, + = down) ending in four root
    fingers; claw (0..1) spreads them. Returns the hand point."""
    pal = (BK0, dark(BK1, 0.8), dark(BK2, 0.8)) if far else (BK0, BK1, BK2)
    r2 = random.Random(seed)
    pts = []
    for j in range(7):
        t = j / 6
        wob = math.sin(t * 5 + seed) * 1.2
        pts.append((sx + math.cos(ang) * ln * t - math.sin(ang) * wob, sy + math.sin(ang) * ln * t + math.cos(ang) * wob))
    p.lines(pts, pal[0], 5)
    p.lines(pts, pal[1], 3)
    p.lines([(x - 0.5, y - 1) for x, y in pts], pal[2], 1)
    for j in (2, 4):                                                     # mycelium wound round the root
        x, y = pts[j]
        p.l(x - 2, y - 2, x + 2, y + 2, MY2 if not far else MYD[2])
    hx, hy = pts[-1]
    for k in range(4):
        a = ang + (k - 1.5) * (0.35 + claw * 0.25)
        fpts = [(hx, hy)]
        x, y = hx, hy
        for j in range(3):
            x += math.cos(a + j * 0.35) * 2.6
            y += math.sin(a + j * 0.35) * 2.6
            fpts.append((x, y))
        p.lines(fpts, pal[0], 2)
        p.lines(fpts[:-1], pal[2] if k % 2 else pal[1], 1)
    return hx, hy


def brute_raw(t=0.0, bob=0, lean=0.0, arm=(1.25, 21), farm=(1.35, 19), eyes=1, mouth=0, dx=0, step=None, spores=0, hump=0.0):
    """Side view facing right: a hunched ape-like mass of felted mycelium bound with roots, caps growing on its back,
    knuckle-walking on two root arms. arm / farm: (angle, length) of the near / far root arm (0 = forward, + = down)."""
    p = Pic(64, 64)
    cx, cy = 24 + dx, 34 + bob
    br = math.sin(t * math.tau) * 0.7
    hx, hy = cx + 17 + lean, cy - 5 + bob * 0.3
    root_arm(p, cx + 6 + lean * 0.5, cy - 7, farm[0], farm[1], True, seed=3)
    for k, (hx_, fx) in enumerate(((-11, -13), (-4, -3))):               # hind legs: bundles of roots
        ph = (step + k * math.pi) if step is not None else 0
        lift = max(0, math.sin(ph)) * 2 if step is not None else 0
        sx = math.cos(ph) * 2 if step is not None else 0
        col = (BK0, dark(BK1, 0.8)) if k == 0 else (BK0, BK1)
        p.l(cx + hx_, cy + 6, cx + fx + sx, 55 - lift, col[0], 7)
        p.l(cx + hx_, cy + 6, cx + fx + sx, 55 - lift, col[1], 5)
        p.l(cx + hx_ - 1, cy + 7, cx + fx + sx - 1, 54 - lift, BK2)
        for j in range(3):                                               # root toes
            p.l(cx + fx + sx - 3 + j * 3, 56 - lift, cx + fx + sx - 4 + j * 3.5, 57 - lift, BK1, 2)
    # the hunched body: a felted mass, lit along the hump, darker under the belly
    top = cy - 19 - hump - br
    body = [(cx - 15, cy + 8), (cx - 17, cy - 2), (cx - 13, top + 6), (cx - 5, top), (cx + 4, top + 1), (cx + 11, top + 6),
            (cx + 15, cy - 6), (cx + 14, cy + 6), (cx + 6, cy + 11), (cx - 6, cy + 12)]
    p.poly(body, MY1)
    p.poly([(x + (cx - x) * 0.08, y + (cy - y) * 0.08 - 1) for x, y in body], MY2)
    p.poly([(cx - 14, cy - 1), (cx - 11, top + 7), (cx - 4, top + 2), (cx + 4, top + 3), (cx + 9, top + 8), (cx + 2, top + 9),
            (cx - 6, top + 9), (cx - 11, cy - 2)], MY3)
    p.poly([(cx - 13, cy + 5), (cx + 12, cy + 2), (cx + 6, cy + 10), (cx - 6, cy + 11)], MY1)   # shadowed belly
    r2 = random.Random(5)
    for k in range(22):                                                  # fibres combed along the hide
        x = cx + r2.uniform(-13, 11); y = r2.uniform(top + 5, cy + 9)
        a = 0.9 + (x - cx) * 0.03
        c = MY0 if y > cy + 2 else (MY1 if k % 2 else (250, 244, 228))
        p.l(x, y, x + math.cos(a) * 3, y + math.sin(a) * 3, c)
    for (x0, x1, sag) in ((-12, 2, 3), (-4, 10, 4), (-14, -8, 2)):        # roots wrapped round the body
        pts = [(cx + x0 + (x1 - x0) * j / 8, top + 4 + j * 2.4 + math.sin(j / 8 * math.pi) * sag) for j in range(9)]
        p.lines(pts, BK0, 3); p.lines(pts, BK1, 1)
    for (ox, oy, r) in ((-7, 1, 4), (4, 2, 3.5)):                         # moss on the back
        puff(p, cx + ox, top + oy, r, MOSS_C)
    # caps growing out of the hump and shoulders
    for (ox, oy, w, h, pal, sd) in ((-11, -4, 11, 5, ORC, 1), (-2, -9, 15, 6, (CP0, CP1, CP2, CP3), 2), (8, -2, 9, 4, ORC, 3)):
        x, y = cx + ox + math.sin(t * math.tau + sd) * 0.6, top + oy
        p.l(x, y + h, x, y + h + 4, STK1, 2)
        spotted_cap(p, x, y, w, h, pal, seed=sd, nsp=2 + (w > 10), gills=STK1)
    # the head: low and forward, shelf fungi for horns, a gaping maw of root splinters
    p.e(hx - 7, hy - 6, hx + 8, hy + 7, MY1)
    p.e(hx - 6, hy - 6, hx + 7, hy + 6, MY2)
    p.e(hx - 5, hy - 6, hx + 3, hy - 1, MY3)
    p.l(hx - 3, hy - 3, hx + 8, hy - 2, MY0, 2)                          # heavy brow
    p.e(hx, hy - 2, hx + 7, hy + 1, (34, 22, 28))                        # deep eye hollow
    ec = GW3 if eyes == 1 else (255, 150, 60) if eyes == 2 else MY0
    if eyes:
        p.p(hx + 2, hy - 1, ec); p.p(hx + 5, hy - 1, ec)
        p.p(hx + 3, hy - 1, GW1 if eyes == 1 else (200, 60, 30))
    o = mouth * 3
    p.poly([(hx + 1, hy + 2), (hx + 9, hy + 2), (hx + 8, hy + 5 + o), (hx + 2, hy + 5 + o)], (40, 16, 24))
    for x in range(int(hx) + 2, int(hx) + 9, 2):                         # root-splinter teeth
        p.p(x, hy + 2, BK3); p.p(x + 1, hy + 5 + o - (o > 0), BK2)
    p.l(hx + 1, hy + 2, hx + 9, hy + 2, MY0)
    spotted_cap(p, hx - 6, hy - 10, 8, 3.5, ORC, seed=9, nsp=1, tilt=-0.15)   # shelf-fungus horns
    root_arm(p, cx + 9 + lean, cy - 3, arm[0], arm[1], False, seed=7)
    im = p.im
    if spores:
        q = Pic(64, 64)
        spore_motes(q, spores, int(t * 10) + 3, (cx - 20, top - 14, cx + 18, top + 2), (GW1, GW2, SP2))
        im = on(im, q.im)
    return im


def brute_frame(fl=None, roll=0.0, impact=0, **kw):
    im = brute_raw(**kw)
    if roll:
        im = ground(im.rotate(roll, resample=Image.NEAREST, center=(36, 57)), 57)
    im = outline_same(cut_below(im, 57))
    if impact:                                                           # roots hit the floor: dust, clods and spores
        q = Pic(64, 64)
        dust = ((84, 70, 60), (126, 108, 90), (168, 150, 124), (206, 192, 166))
        for (x, y, r) in (((44, 55, 3), (58, 55, 3.5), (51, 54, 2.5)), ((41, 54, 4), (60, 54, 4), (50, 52, 3), (55, 50, 2)))[impact - 1]:
            puff(q, x, y, r, dust)
        P8.clods(q, 51, 50, 4 + impact * 2, 70 + impact, 9, 5 + impact * 4, (DT1, DT2, DT3))
        im = on(im, outline_same(cut_below(q.im, 57)))
        r = Pic(64, 64)
        spore_motes(r, 6, 80 + impact, (40, 36, 62, 52), (GW2, SP2, GW3))
        im = on(im, r.im)
    if fl:
        im = flash(im, fl)
    return im


def brute_heap(k):
    """Fallen apart: a heap of mycelium on the floor, roots sticking out, caps lying on top; k = 0..2 settles it."""
    p = Pic(64, 64)
    for (x, r) in ((16, 6), (24, 8 - k * 0.5), (34, 9 - k), (44, 7 - k * 0.5), (52, 4)):
        puff(p, x, 56 - r * 0.6, r, (MY0, MY1, MY2, MY3))
    for (x0, a) in ((10, -2.6), (50, -0.4), (40, -0.9)):
        P8.root_spike(p, x0, 56, 6 - k, -1 if a < -1 else 1, 3, seed=int(x0))
    for (x, y, w, h, pal) in ((26, 44 + k * 2, 14, 5, (CP0, CP1, CP2, CP3)), (40, 47 + k, 10, 4, ORC)):
        spotted_cap(p, x, y, w, h, pal, seed=x, nsp=2, gills=STK1)
    if k < 2:                                                            # the glow leaving its eyes
        p.p(48, 50 - k, GW3 if k == 0 else GW1); p.p(50, 50 - k, GW2 if k == 0 else GW0)
    im = outline_same(cut_below(p.im, 57))
    q = Pic(64, 64)
    spore_motes(q, 6 - k * 2, 90 + k, (14, 30 - k * 4, 52, 46), (GW1, GW2, SP2))
    return on(im, q.im)


@builder('mycelbrute')
def make_mycelbrute():
    B = brute_frame
    save_enemy('mycelbrute', 'idle', [B(t=i / 4, bob=(0, 0, 1, 1)[i], arm=(1.25 - (0, 0.03, 0.06, 0.03)[i], 21 - (0, 0, 1, 1)[i]),
                                        farm=(1.35, 19 - (0, 0, 1, 1)[i]), spores=3 + i % 2) for i in range(4)], 64)
    save_enemy('mycelbrute', 'movement', [B(t=i / 6, step=i * math.tau / 6, bob=(0, -1, 0, 0, -1, 0)[i], lean=1,
                                            arm=(1.15 + math.sin(i * math.tau / 6) * 0.3, 21 + (0, 1, 0, 0, 1, 0)[i]),
                                            farm=(1.3 - math.sin(i * math.tau / 6) * 0.25, 19 + (0, 1, 0, 0, 1, 0)[i])) for i in range(6)], 64)
    # attack: both root arms rear up over the head, then slam into the floor in front of it
    save_enemy('mycelbrute', 'attack', [B(arm=(0.2, 18), farm=(0.6, 16), eyes=2, mouth=1, lean=-1),
                                        B(arm=(-1.3, 19), farm=(-1.0, 17), eyes=2, mouth=2, lean=-2, hump=1, bob=-1),
                                        B(arm=(-1.75, 19), farm=(-1.45, 17), eyes=2, mouth=2, lean=-2, hump=2, bob=-2, spores=4),
                                        B(arm=(0.62, 26), farm=(0.8, 24), eyes=2, mouth=2, lean=3, bob=2, impact=1),
                                        B(arm=(0.66, 26), farm=(0.84, 24), eyes=2, mouth=1, lean=3, bob=2, impact=2, spores=6),
                                        B(arm=(0.95, 23), farm=(1.1, 21), eyes=1, lean=1, bob=1),
                                        B()], 64)
    save_enemy('mycelbrute', 'take_damage', [B(dx=-3, eyes=2, mouth=2, arm=(0.8, 20), fl=(255, 255, 255), spores=5),
                                             B(dx=-2, eyes=2, mouth=1, arm=(1.0, 20), spores=3), B(dx=-1)], 64)
    save_enemy('mycelbrute', 'death', [B(eyes=2, mouth=2, arm=(-0.8, 18), farm=(-0.5, 16), hump=1, spores=6),
                                       B(eyes=0, mouth=2, arm=(0.6, 20), bob=2, lean=-1, spores=4),
                                       B(eyes=0, mouth=1, arm=(1.0, 18), roll=-18, bob=4, spores=3),
                                       brute_heap(0), brute_heap(1), brute_heap(2)], 64)


# ================================================================== MYCONID (drawn, 64x64: a mushroom shaman with a spore staff)
MOSS_C = (MS0, MS1, MS2, MS3)


def spore_orb(p, x, y, r, lvl=1):
    """A glowing spore orb: rings of green-cyan light round a white core; lvl 0 dim .. 2 blazing."""
    pal = ((SP0, SP1, SP2), (SP1, SP2, SP3), (SP2, SP3, WHITE))[lvl]
    p.e(x - r, y - r, x + r, y + r, pal[0])
    p.e(x - r + 1, y - r + 1, x + r - 1.5, y + r - 1.5, pal[1])
    p.e(x - r * 0.5, y - r * 0.5, x + r * 0.2, y + r * 0.2, pal[2])


def spore_staff(p, hx, hy, ang=-1.45, ln=30, back=9, glow_=1, t=0.0):
    """A gnarled wooden staff through the hand (hx, hy), a cage of twigs round a glowing orb at its head."""
    u = (math.cos(ang), math.sin(ang))
    x0, y0 = hx - u[0] * back, hy - u[1] * back
    x1, y1 = hx + u[0] * ln, hy + u[1] * ln
    pts = [(x0 + (x1 - x0) * j / 6 + math.sin(j * 1.7) * 0.6, y0 + (y1 - y0) * j / 6) for j in range(7)]
    p.lines(pts, BK0, 3); p.lines(pts, BK2, 1)
    for j in (2, 4):
        p.p(*pts[j], BK3)
    ox, oy = x1 + u[0] * 3, y1 + u[1] * 3
    for s_ in (-1, 1):                                                   # twig cage
        p.lines([(x1, y1), (ox + s_ * 4, oy + 1), (ox + s_ * 3, oy - 3), (ox + s_ * 1, oy - 5)], BK1)
    spore_orb(p, ox, oy, 3 + (glow_ >= 2), glow_)
    return ox, oy


def myconid_raw(t=0.0, step=None, bob=0, tilt=0.0, eyes=1, mouth=0, staff=None, farm=(0.9, 0.0), ball=0.0, dx=0, cap=True,
                cap_tilt=0.0, sag=0.0):
    """Side view facing right. staff = (hand dx, hand dy, angle, glow) relative to the shoulder (None = no staff);
    farm = (angle, raise) of the free arm; ball (0..1.5): a spore ball growing in the free hand."""
    p = Pic(64, 64)
    cx, by = 28 + dx, 57
    top = 27 + bob + sag
    for k, ox in enumerate((-3, 3)):                                     # stubby legs and splayed root toes
        ph = (step + k * math.pi) if step is not None else 0
        lift = max(0, math.sin(ph)) * 2 if step is not None else 0
        sx = math.cos(ph) * 2 if step is not None else 0
        c = STK0 if k == 0 else STK1
        p.r(cx + ox + sx - 2, by - 7 - lift, cx + ox + sx + 1, by - lift, c)
        p.l(cx + ox + sx - 3, by - lift, cx + ox + sx + 3, by - lift, BK1)
        p.p(cx + ox + sx + 3, by - lift - 1, BK2)
    sh = (cx - 2, top + 9)
    fa_ang, fa_up = farm                                                 # far arm
    fhx, fhy = cx - 5 + math.cos(fa_ang + math.pi) * 2, top + 9
    fex, fey = cx + 3 + math.cos(fa_ang) * 9, top + 12 + math.sin(fa_ang) * 9 - fa_up * 10
    p.lines([(cx - 2, top + 9), ((cx - 2 + fex) / 2, (top + 9 + fey) / 2 + 2), (fex, fey)], STK0, 2)
    # stalk body in a moss shawl, a string of bone charms
    p.poly([(cx - 7, by - 6), (cx - 6, top + 4), (cx + 6, top + 4), (cx + 7, by - 6)], STK2)
    p.l(cx - 6, top + 5, cx - 7, by - 6, STK3); p.l(cx + 6, top + 5, cx + 7, by - 6, STK0)
    for j in range(3):
        p.l(cx - 3 + j * 3, top + 14, cx - 3 + j * 3, by - 7, STK1)
    for (ox, oy, r) in ((-6, 9, 4), (-1, 10, 4.5), (5, 9, 4), (-8, 14, 3), (7, 14, 3)):
        puff(p, cx + ox, top + oy, r, MOSS_C)
    for j, ox in enumerate((-4, -1, 2, 5)):
        p.l(cx + ox, top + 13, cx + ox, top + 15 + j % 2, (120, 100, 70)); p.p(cx + ox, top + 16 + j % 2, (230, 222, 196))
    # face under the cap
    p.e(cx - 5, top - 1, cx + 7, top + 7, STK2)
    p.l(cx - 5, top + 2, cx - 5, top + 6, STK3)
    ec = GW3 if eyes == 1 else (255, 230, 90) if eyes == 2 else (60, 40, 40)
    for ex in (cx + 1, cx + 5):
        p.r(ex - 1, top + 2, ex, top + 3, (20, 12, 20))
        if eyes:
            p.p(ex, top + 2, ec)
    if mouth:
        p.e(cx + 2, top + 5, cx + 5, top + 5 + mouth, (50, 20, 26))
    else:
        p.l(cx + 2, top + 5, cx + 4, top + 5, (110, 86, 70))
    if cap:
        q = Pic(64, 64)
        spotted_cap(q, cx + 1, top - 12, 30, 12, (CP0, CP1, CP2, CP3), seed=11, nsp=6, gills=STK0)
        for x in range(int(cx - 12), int(cx + 15), 3):                   # frills of gills hanging under the rim
            q.l(x, top, x + 0.5, top + 1, STK1)
        cim = q.im
        if cap_tilt:
            cim = cim.rotate(cap_tilt, resample=Image.NEAREST, center=(cx, top))
        p.paste(cim, 0, 0)
    if staff:
        sdx, sdy, sang, sglow = staff
        hx, hy = cx + 6 + sdx, top + 12 + sdy
        p.l(cx + 4, top + 8, hx, hy, STK1, 2)                            # near arm up to the staff
        spore_staff(p, hx, hy, sang, 30, 9, sglow, t)
        p.e(hx - 1.5, hy - 1.5, hx + 1.5, hy + 1.5, STK3)
    if ball:
        r = 1.5 + ball * 2.5
        spore_orb(p, fex, fey - r * 0.5, r, 2 if ball > 1 else 1)
    else:
        p.e(fex - 1.5, fey - 1.5, fex + 1.5, fey + 1.5, STK1)
    im = p.im
    if tilt:
        im = im.rotate(tilt, resample=Image.NEAREST, center=(cx, by))
    return im


def myconid_frame(fl=None, fx=None, **kw):
    im = outline_same(cut_below(myconid_raw(**kw), 57))
    if fx:
        q = Pic(64, 64)
        fx(q)
        im = on(im, outline_same(q.im))
    if fl:
        im = flash(im, fl)
    return im


def myconid_dead(k):
    """Slumped on the floor: the body lies on its side, the cap has rolled off, the staff lies beside it."""
    body = myconid_raw(eyes=0, cap=False, staff=None, farm=(1.4, 0.0))
    body = ground(body.rotate(78, resample=Image.NEAREST, center=(28, 57)), 57)
    body = shift(body, 4, 0)
    p = Pic(64, 64)
    spore_staff(p, 14, 56, -0.05, 32, 6, 0 if k else 1)
    q = Pic(64, 64)
    spotted_cap(q, 46, 44, 26, 10, (CP0, CP1, CP2, CP3), seed=11, nsp=6, gills=STK0)
    cap = q.im.rotate(-150 + k * 4, resample=Image.NEAREST, center=(46, 50))
    im = on(outline_same(cut_below(p.im, 57)), outline_same(body), outline_same(ground(cap, 57)))
    r = Pic(64, 64)
    spore_motes(r, 4 - k, 40 + k, (20, 36, 54, 50), (SP1, SP2, GW2))
    return cut_below(on(im, r.im), 57)


@builder('myconid')
def make_myconid():
    M = myconid_frame
    hold = lambda g=1, dy=0: (0, dy, -1.5, g)
    save_enemy('myconid', 'idle', [M(t=i / 4, bob=(0, 0, 1, 1)[i], staff=hold(1 + (i == 2), (0, 0, 1, 1)[i]), farm=(0.9 + 0.05 * i, 0.0))
                                   for i in range(4)], 64)
    save_enemy('myconid', 'movement', [M(t=i / 6, step=i * math.tau / 6, bob=(0, -1, 0, 0, -1, 0)[i], tilt=-3,
                                         staff=(1, (0, -1, 0, 0, -1, 0)[i], -1.4, 1), farm=(0.6 + math.sin(i * math.tau / 6) * 0.4, 0.0))
                                       for i in range(6)], 64)
    # attack: the staff blazes, a spore ball swells in the free hand, he winds up and hurls it at you
    def flying(x, y, r, trail):
        def f(q):
            for k in range(trail):
                q.p(x - 4 - k * 3, y + (k % 2), (SP1, SP2, PU2)[k % 3])
            spore_orb(q, x, y, r, 2)
        return f
    save_enemy('myconid', 'attack', [M(staff=hold(2), farm=(0.5, 0.1), ball=0.4, eyes=2),
                                     M(staff=hold(2, -2), farm=(0.2, 0.3), ball=0.9, eyes=2, mouth=1, bob=-1),
                                     M(staff=hold(2, -2), farm=(2.7, 0.3), ball=1.3, eyes=2, mouth=2, bob=-1, tilt=5),
                                     M(staff=hold(1), farm=(-0.1, 0.3), eyes=2, mouth=2, tilt=-6, fx=flying(48, 34, 3.5, 2)),
                                     M(staff=hold(1), farm=(0.3, 0.0), eyes=2, mouth=1, tilt=-4, fx=flying(58, 33, 3, 5)),
                                     M(staff=hold(1), farm=(0.6, 0.0), tilt=-1),
                                     M(staff=hold(1), farm=(0.9, 0.0))], 64)
    save_enemy('myconid', 'take_damage', [M(dx=-2, eyes=2, mouth=2, staff=hold(0), tilt=8, cap_tilt=8, fl=(255, 255, 255)),
                                          M(dx=-1, eyes=2, mouth=1, staff=hold(1), tilt=4, cap_tilt=4), M(staff=hold(1))], 64)
    save_enemy('myconid', 'death', [M(eyes=2, mouth=2, staff=hold(0), tilt=6, cap_tilt=10, farm=(-1.0, 0.8)),
                                    M(eyes=0, mouth=2, staff=(4, 4, -0.9, 0), tilt=12, cap_tilt=22, sag=2),
                                    M(eyes=0, mouth=1, staff=None, tilt=24, cap_tilt=50, sag=5, farm=(1.4, 0.0)),
                                    myconid_dead(0), myconid_dead(1), myconid_dead(2)], 64)


# ================================================================== MIRROR KNIGHT (Body_A: mirror-polished plate, great helm, kite shield with a mirror face)
MK_PAL = {'head': (SV2, SV1, SV0, SV3), 'torso': (SV2, SV1, SV0, SV3),
          'legs': ((150, 156, 182), (100, 106, 132), (64, 68, 90), (200, 206, 226))}
PLUME = (IL0, IL1, IL2)


def knight_helm(hx, hy, eyes=1, sw=0.0, ang=0.0):
    """A polished great helm with a visor slit and a violet plume streaming back; drawn on its own canvas centred on
    the head (hx, hy) and turned by ang degrees (death). Returns (image, x, y) to paste."""
    q = Pic(30, 30)
    cx, cy = 15, 16
    for k in range(4):                                                   # plume from the crest, blowing back
        a = math.pi + 0.5 - k * 0.25 + sw * 0.15
        x1, y1 = cx - 1 + math.cos(a) * (6 + k), cy - 6 + math.sin(a) * (4 + k * 0.5)
        q.lines([(cx, cy - 6), ((cx + x1) / 2, cy - 8 - k * 0.3), (x1, y1)], PLUME[k % 3], 2)
    q.e(cx - 5, cy - 7, cx + 5, cy + 2, SV0)
    q.r(cx - 5, cy - 3, cx + 5, cy + 3, SV0)
    q.e(cx - 4, cy - 6, cx + 4, cy + 1, SV1)
    q.r(cx - 4, cy - 3, cx + 4, cy + 2, SV1)
    q.e(cx - 3, cy - 6, cx + 1, cy - 2, SV2)
    q.l(cx - 3, cy - 4, cx - 3, cy + 2, SV3)                             # the mirror shine down the side
    q.p(cx - 2, cy - 5, WHITE)
    q.l(cx + 1, cy - 1, cx + 5, cy - 1, (16, 14, 26))                    # visor slit
    if eyes:
        q.p(cx + 3, cy - 1, TP3 if eyes == 1 else (255, 90, 120)); q.p(cx + 4, cy - 1, TP1 if eyes == 1 else (200, 40, 70))
    q.p(cx + 3, cy + 1, SV0); q.p(cx + 1, cy + 1, SV0)                   # breathing holes
    q.l(cx - 5, cy + 3, cx + 5, cy + 3, AU2)                             # gilt gorget rim
    q.l(cx, cy - 7, cx, cy - 2, AU1)                                     # gilt crest ridge
    im = q.im
    if ang:
        im = im.rotate(ang, resample=Image.NEAREST, center=(cx, cy))
    return im, int(hx - cx), int(hy - cy)


def kite_shield(glint=0):
    """A tall kite shield: silver rim, a mirror face with diagonal glints, a gilt boss; glint (0..2) flashes it."""
    w, h = 11, 17
    p = Pic(w, h)
    pts = [(0, 1), (5, 0), (10, 1), (10, 7), (5, 16), (0, 7)]
    p.poly(pts, SV0)
    g = Pic(w, h)
    mirror_glass(g, 1, 1, 9, 14, streaks=2)
    gm = Image.new('L', (w, h)); ImageDraw.Draw(gm).polygon([(1, 2), (5, 1), (9, 2), (9, 7), (5, 14), (1, 7)], fill=255)
    gi = g.im.copy(); gi.putalpha(Image.fromarray(np.minimum(np.array(gi)[:, :, 3], np.array(gm))))
    p.paste(gi, 0, 0)
    p.l(0, 1, 5, 0, SV3); p.l(0, 1, 0, 7, SV2)
    p.e(3.5, 4.5, 6.5, 7.5, AU1); p.p(4.5, 5.5, AU4)
    if glint:
        p.l(2, 3, 4, 3, WHITE); p.l(3, 2, 3, 4, WHITE)
        if glint == 2:
            p.p(7, 10, WHITE); p.l(7, 3, 9, 3, MR4)
    return outline(p.im)


def knight_sword(p, hx, hy, ang, ln=14, back=3):
    """A long sword through the hand (hx, hy) along ang: leather grip, gilt crossguard, a bright double-edged blade."""
    u = (math.cos(ang), math.sin(ang))
    v = (-u[1], u[0])
    P_ = lambda a_, b_: (hx + u[0] * a_ + v[0] * b_, hy + u[1] * a_ + v[1] * b_)
    p.l(*P_(-back, 0), *P_(1, 0), (70, 44, 30), 2)
    p.p(*P_(-back - 1, 0), AU2)                                          # pommel
    p.l(*P_(1.5, -3), *P_(1.5, 3), AU1, 1); p.p(*P_(1.5, -3), AU3)       # crossguard
    p.l(*P_(2.5, 0), *P_(ln, 0), SV1, 2)
    p.l(*P_(2.5, -0.5), *P_(ln - 1, -0.5), SV3)
    p.p(*P_(ln + 0.8, 0), SV2)
    return P_(ln + 1, 0)


def knight_shine(p, g, hy):
    """Mirror polish on the plate: a cold reflection band down the front edge, white glints, a gilt belt."""
    a = mask_of(g)
    for y in range(int(hy) + 6, min(57, int(hy) + 30)):
        xs = np.nonzero(a[y])[0]
        if len(xs) >= 3:
            p.p(xs.max() - 1, y, MR2 if (y // 3) % 2 else MR3)
            if y % 5 == 0:
                p.p(xs.min() + 2, y, WHITE)
    yb = int(hy) + 14
    xs = np.nonzero(a[min(63, yb)])[0]
    if len(xs) >= 3:
        p.l(xs.min(), yb, xs.max(), yb, AU1)
        p.p(xs.max() - 2, yb, AU4)


def knight_cell(f, feet, cx, sw=None, sh=(0, 0, 0), dx=0, dy=0, fl=None, eyes=1, helm_ang=0.0, plume=0.0, shield=True,
                extra=None, helm=True):
    """sw = (hand x, hand y, angle, 'front'|'back') of the sword; sh = (dx, dy, glint) of the shield relative to its
    place in front of the chest (dy = -14 raises it before the visor)."""
    g, hc = dress(f, MK_PAL, eye=TP3)
    if hc is None:
        return Image.new('RGBA', (64, 64))
    hx, hy = hc
    p = Pic(64, 64)
    if sw and sw[3] == 'back':
        knight_sword(p, *sw[:3])
    p.paste(g, 0, 0)
    knight_shine(p, g, hy)
    if helm:
        him, ox, oy = knight_helm(hx, hy, eyes, plume, helm_ang)
        p.paste(outline_same(him), ox, oy)
    if shield:
        s_ = kite_shield(sh[2])
        p.paste(s_, int(hx - 3 + sh[0]), int(hy + 6 + sh[1]))
    if sw and sw[3] != 'back':
        knight_sword(p, *sw[:3])
    if extra:
        extra(p)
    im = cell_of(outline_same(p.im), feet, cx, dx, dy)
    if fl:
        im = flash(im, fl)
    return im


@builder('mirrorknight')
def make_mirrorknight():
    idle, walk, sl, hit, de = body_src('Idle'), body_src('Walk'), body_src('Slice'), body_src('Hit'), body_src('Death')
    feet = max(f.getbbox()[3] - 1 for f in idle)
    b = idle[0].getbbox()
    cx = (b[0] + b[2]) // 2
    K_ = knight_cell

    def low(f, ang=1.15):                     # sword held low and forward
        gs = strip_tool(f)
        hx, hy = front_hand(gs, gs.getbbox()[1], (14, 22))
        return (hx + 1, hy, ang, 'front')
    save_enemy('mirrorknight', 'idle', [K_(f, feet, cx, sw=low(f, -1.2), plume=i * 0.5, sh=(0, 0, 1 if i == 2 else 0)) for i, f in enumerate(idle)], 64)
    save_enemy('mirrorknight', 'movement', [K_(f, feet, cx, sw=low(f, -1.0), plume=(0, 1, 2, 0, 1, 2)[i], sh=(0, -(i % 3 == 1), 0),
                                               dy=(0, 1, 0, 0, 1, 0)[i]) for i, f in enumerate(walk)], 64)
    # attack: the sword comes up behind the helm, is swung in a wide arc and cuts forward low (Slice)
    att = []
    for i, f in enumerate(sl):
        (hx, hy), ang = tool_line(f)
        if i <= 2:
            sw = (hx, hy, ang + 0.1, 'back')
        elif i == 3:
            sw = (hx, hy, 0.05, 'front')
        else:
            sw = (hx, hy, (0.05, -0.1, 0.5, 1.0)[i - 4], 'front')

        def slash(p, i=i, hx=hx, hy=hy):
            if i == 3:
                for k in range(3):
                    p.arc(hx - 16 + k, hy - 16 + k * 2, hx + 18 - k, hy + 12 - k, 300 + k * 6, 400, (WHITE, MR3, MR2)[k], 1)
            if i == 4:
                p.arc(hx - 12, hy - 10, hx + 16, hy + 10, 330, 390, MR3)
        att.append(K_(f, feet, cx, sw=sw, eyes=2 if 2 <= i <= 5 else 1, sh=(-3 if 3 <= i <= 5 else -1, 0, 0), plume=i * 0.3, extra=slash))
    save_enemy('mirrorknight', 'attack', att, 64)
    save_enemy('mirrorknight', 'take_damage', [K_(f, feet, cx, sw=low(f, 1.4), dx=-1 - (i == 0), eyes=2, sh=(-1, -1, 2 if i == 0 else 0),
                                                  fl=(255, 255, 255) if i == 0 else None) for i, f in enumerate(hit)], 64)
    # death: falls; the shield topples off and lies flat, the sword clatters down behind
    dfr = []
    angs = (0, 0, 5, -15, -30, -50, -85, -90)
    for i, f in enumerate(de):
        c = K_(f, feet, cx, sw=low(f, 1.4 + i * 0.3) if i < 2 else None, eyes=1 if i < 3 else 0, helm_ang=angs[i], shield=i < 2,
               plume=1)
        p = Pic(64, 64)
        if i >= 2:
            knight_sword(p, 8 + min(i, 4), 56, -0.03, 15, 2)
            s_ = kite_shield(0)
            s2 = s_.rotate((-30, -60, -90, -90, -90, -90)[i - 2], resample=Image.NEAREST, expand=True)
            if i >= 4:
                s2 = squash(s2, 0.55, s2.height)
            s2 = s2.crop(s2.getbbox())
            p.paste(s2, 36 + min(i, 5) * 2, 58 - s2.height)
        dfr.append(cut_below(on(p.im, c) if i < 4 else on(c, p.im), 57) if i >= 2 else c)
    save_enemy('mirrorknight', 'death', dfr, 64)
    # block: the shield is raised before the visor; the last frame is the held pose (loop it while blocking)
    blk = [K_(idle[0], feet, cx, sw=low(idle[0], 1.3), sh=(1, -6, 0)),
           K_(idle[1], feet, cx, sw=low(idle[1], 1.4), sh=(3, -13, 1)),
           K_(idle[2], feet, cx, sw=low(idle[2], 1.4), sh=(3, -13, 2)),
           K_(idle[3], feet, cx, sw=low(idle[3], 1.4), sh=(3, -13, 1))]
    save_enemy('mirrorknight', 'block', blk, 64)


# ================================================================== ILLUSIONIST (Body_A: slim hooded cloak with stars, porcelain mask, light)
IL_PAL = {'head': ((226, 222, 230), (190, 186, 200), (150, 146, 160), (250, 248, 255)),
          'torso': (IL1, IL0, (28, 10, 46), IL2),
          'legs': (IL0, (28, 10, 46), (18, 6, 30), IL1)}


def raised_hand(g, hc):
    """The skin pixel of a Body_A frame highest above the shoulders and outside the head (a raised hand), or None."""
    a = mask_of(g)
    ys, xs = np.nonzero(a)
    hx, hy = hc
    sel = (np.hypot(xs - hx, ys - hy) > 7) & (ys < hy + 4)
    if not sel.any():
        return None
    i = np.argmin(np.where(sel, ys, 999))
    return int(xs[i]), int(ys[i])


def light_orb(p, x, y, r, k=0):
    """A ball of pale violet light with a white heart and a few rays (binary-alpha glow)."""
    p.e(x - r, y - r, x + r, y + r, IL2)
    p.e(x - r * 0.65, y - r * 0.65, x + r * 0.65, y + r * 0.65, IL3)
    p.e(x - r * 0.3, y - r * 0.3, x + r * 0.3, y + r * 0.3, WHITE)
    for j in range(4):
        a = j * math.pi / 2 + k * 0.4
        p.l(x + math.cos(a) * (r + 1), y + math.sin(a) * (r + 1), x + math.cos(a) * (r + 2 + r * 0.4), y + math.sin(a) * (r + 2 + r * 0.4), IL3)


def star_cloak(p, g, hy, sway=0.0, seed=0, floor=57):
    """A long cloak from the shoulders to the floor, flaring behind, sprinkled with gold stars."""
    a = mask_of(g)
    top = int(hy) + 6
    rows = [y for y in range(top, floor + 1) if a[y].any()]
    if not rows:
        return
    stop = max(rows)
    r2 = random.Random(seed)
    for y in range(top, stop + 1):
        xs = np.nonzero(a[y])[0]
        if not len(xs):
            continue
        t = (y - top) / max(1, stop - top)
        l = xs.min() - round(t * 7) + round(sway * t * 2)
        r = xs.min() + 3 + round(t * 2)
        for x in range(l, r + 1):
            p.p(x, y, IL0 if x <= l + 1 else IL1 if (x - l) % 5 != 2 else (70, 30, 116))
    for _ in range(6):
        y = r2.randint(top + 2, stop - 1)
        xs = np.nonzero(a[y])[0]
        if len(xs):
            p.p(xs.min() - r2.randint(1, 3), y, AU3 if r2.random() < 0.6 else WHITE)


def illusionist_hood(p, hx, hy, sway=0.0):
    p.poly([(hx - 6, hy + 5), (hx - 7, hy - 3), (hx - 3, hy - 8), (hx + 3, hy - 8), (hx + 6, hy - 4), (hx + 5, hy + 5)], IL0)
    p.poly([(hx - 5, hy - 4), (hx - 10 - sway, hy - 2), (hx - 6, hy + 1)], IL0)           # the point of the hood trailing back
    p.arc(hx - 6, hy - 8, hx + 6, hy + 4, 190, 300, IL2)
    p.l(hx - 6, hy + 5, hx + 5, hy + 5, AU2)


def illusionist_cell(f, feet, cx, phase=0.0, dx=0, dy=0, fl=None, eyes=1, mask=True, cloak=True, orb=None, sway=0.0,
                     extra=None, crack=False):
    pal = IL_PAL if mask else {**IL_PAL, 'head': ((40, 20, 60), (28, 12, 44), (18, 6, 30), (60, 34, 90))}   # nothing under the mask
    g, hc = dress(f, pal, eye=IL2 if mask else (130, 70, 200))
    if hc is None:
        return Image.new('RGBA', (64, 64))
    hx, hy = hc
    p = Pic(64, 64)
    if cloak:
        star_cloak(p, g, hy, sway, int(phase * 7))
    if mask:
        illusionist_hood(p, hx, hy, sway)
    p.paste(g, 0, 0)
    if mask:
        q = Pic(64, 64)
        illusionist_hood(q, hx, hy, sway)
        a = np.array(q.im); a[int(hy) - 3:int(hy) + 5, int(hx) - 4:int(hx) + 6] = 0      # the hood frames the mask
        p.paste(Image.fromarray(a), 0, 0)
        mask_face(p, hx + 1, hy, eyes, crack)
    if extra:
        extra(p, g, hc)
    im = outline_same(p.im)
    if orb:                                                              # light is not outlined
        q = Pic(64, 64)
        light_orb(q, *orb)
        im = on(im, q.im)
    im = cell_of(im, feet, cx, dx, dy)
    if fl:
        im = flash(im, fl)
    return im


@builder('illusionist')
def make_illusionist():
    idle, walk, co, hit, de = body_src('Idle'), body_src('Walk'), body_src('Collect'), body_src('Hit'), body_src('Death')
    feet = max(f.getbbox()[3] - 1 for f in idle)
    b = idle[0].getbbox()
    cx = (b[0] + b[2]) // 2
    I_ = illusionist_cell

    def palm(f):                                   # a small light hovering over the front hand
        gs = strip_tool(f)
        hx, hy = front_hand(gs, gs.getbbox()[1], (14, 22))
        return hx + 2, hy - 3
    save_enemy('illusionist', 'idle', [I_(f, feet, cx, phase=i, orb=(*palm(f), 1.5 + (i % 2) * 0.5, i), sway=(0, 0.5, 1, 0.5)[i])
                                       for i, f in enumerate(idle)], 64)
    save_enemy('illusionist', 'movement', [I_(f, feet, cx, phase=i, sway=-1 + (i % 3) * 0.3, dy=(0, 1, 0, 0, 1, 0)[i])
                                           for i, f in enumerate(walk)], 64)
    # attack: the hand rises (Collect's raised hand), a ball of light swells above it and bursts towards you
    att = []
    for k, (i, r, burst) in enumerate(((0, 1.5, 0), (6, 2.5, 0), (7, 4, 0), (7, 3, 1), (6, 1.5, 2), (0, 0, 0))):
        f = co[i]
        g, hc = dress(f, IL_PAL)
        h = raised_hand(g, hc) or palm(f)
        orb = (h[0] + 1, h[1] - r - 1, r, k) if r else None

        def fx(p, g, hc, burst=burst, h=h):
            if burst:
                ox, oy = h[0] + 1, h[1] - 4
                for j in range(5):
                    a = -0.7 + j * 0.35
                    r0, r1 = 5 + burst * 3, 11 + burst * 6
                    p.l(ox + math.cos(a) * r0, oy + math.sin(a) * r0, ox + math.cos(a) * r1, oy + math.sin(a) * r1, IL3 if j % 2 else WHITE)
                sparkle = random.Random(burst)
                for _ in range(4):
                    x, y = ox + sparkle.uniform(8, 22), oy + sparkle.uniform(-9, 9)
                    p.ps([(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], IL2); p.p(x, y, WHITE)
        att.append(I_(f, feet, cx, phase=k, eyes=2 if 1 <= k <= 4 else 1, orb=orb, extra=fx, sway=0.5))
    save_enemy('illusionist', 'attack', att, 64)
    save_enemy('illusionist', 'take_damage', [I_(f, feet, cx, phase=i, dx=-1 - (i == 0), eyes=2, crack=i == 0, sway=1.5 - i * 0.5,
                                                 fl=(255, 255, 255) if i == 0 else None) for i, f in enumerate(hit)], 64)
    # death: the mask cracks and drops to the floor, the body falls and the cloak settles, the light dies in motes
    dfr = []
    for i, f in enumerate(de):
        c = I_(f, feet, cx, phase=i, eyes=0 if i >= 2 else 2, mask=i < 3, crack=i >= 1, sway=1)
        p = Pic(64, 64)
        if i >= 3:
            q = Pic(20, 20)
            mask_face(q, 9, 10, 0, True)
            mi = outline_same(q.im).rotate(-90 + min(i, 6) * 3, resample=Image.NEAREST, center=(10, 10))
            p.paste(mi, 12 + min(i - 3, 2) * 2, 44)
            spore_motes(p, 5 - min(i, 7) // 2, 50 + i, (22, 34, 56, 54), (IL1, IL2, IL3))
        dfr.append(cut_below(on(c, p.im), 57) if i >= 3 else c)
    save_enemy('illusionist', 'death', dfr, 64)


# ================================================================== BOSS: MYCELMODERN (drawn: a towering mushroom mother, her cap a glowing hat)
MM = 116
MM_FEET = 115


def dome_spots(p, cx, base, w, h, n, seed, cols, min_d=7.0, rr=(2.2, 4.2), droop=0.0):
    """Round spots scattered over a cap dome (base row `base`, w wide, h high), kept apart from each other."""
    r2 = random.Random(seed)
    pts = []
    for _ in range(n * 30):
        if len(pts) >= n:
            break
        x = r2.uniform(-0.82, 0.82)
        y = r2.uniform(0.18, 0.85) * math.sqrt(max(0, 1 - x * x))
        X, Y = cx + x * w / 2, base - y * h + droop * x * w * 0.5
        if all(math.hypot(X - a, Y - b) > min_d for a, b, _ in pts):
            pts.append((X, Y, r2.uniform(*rr) * (1 - abs(x) * 0.35)))
    for X, Y, r in pts:
        p.e(X - r - 1, Y - r * 0.8 - 1, X + r + 1, Y + r * 0.8 + 1, cols[0])
        p.e(X - r, Y - r * 0.8, X + r, Y + r * 0.8, cols[1])
        p.e(X - r * 0.7, Y - r * 0.7, X, Y, cols[2])


def mm_cap(p, cx, top, w, h, glow_=1, droop=0.0, seed=21):
    """Her great cap: a wide purple dome with glowing spots, a frilled glowing gill fan under the rim."""
    gl = ((CP1, CP2, CP3), (GW1, GW2, GW3), (GW2, GW3, WHITE))[glow_]
    base = top + h
    for k in range(int(w / 3)):                                          # gill fan
        x = cx - w / 2 + 4 + k * 3
        p.l(x, base + droop * (x - cx) * 0.5, cx + (x - cx) * 0.55, base + 5, (GW0, GW1, GW2)[min(2, glow_)] if k % 2 else gl[0], 2)
    spotted_cap(p, cx, top, w, h, (CP0, CP1, CP2, CP3), seed=seed, nsp=0, gills=None, tilt=droop)
    dome_spots(p, cx, base, w, h, 9, seed, (CP0, gl[0], gl[2]) if glow_ else (CP0, CP2, CP3), min_d=12, rr=(3.0, 5.5), droop=droop)
    for k in range(int(w / 4)):                                          # wavy frilled rim
        x = cx - w / 2 + 2 + k * 4
        p.e(x - 2, base - 1 + droop * (x - cx) * 0.5, x + 2, base + 2 + droop * (x - cx) * 0.5, CP0)
        p.p(x, base + droop * (x - cx) * 0.5, CP1)


def mm_frame(t=0.0, bob=0, glow_=1, eyes=1, mouth=0, arm=(1.3, 34), farm=(1.45, 32), lean=0.0, fl=None, dx=0, sink=0.0,
             cap_dy=0, droop=0.0, spores=8, clouds=0, roots=None, cap=True, cap_h=0.0):
    """arm / farm: (angle, length) of the near / far root arm from the shoulders; clouds (0..3): spore clouds pouring
    off the cap (cast); roots = [(x, height)] roots bursting from the floor (attack)."""
    p = Pic(MM, MM)
    cx = 54 + dx
    top = 46 + bob + sink                                                # the underside of the cap
    base_y = MM_FEET
    sh_y = top + 27
    # volva: the root-mat she stands on
    for (x, r) in ((cx - 24, 6), (cx - 14, 8), (cx, 9), (cx + 14, 8), (cx + 24, 6)):
        puff(p, x, base_y - r * 0.5, r, (MY0, MY1, MY2, MY3))
    for (x, a) in ((cx - 30, -0.6), (cx + 30, 0.6), (cx - 20, -0.2), (cx + 22, 0.3)):
        P8.root_spike(p, x, base_y, 8, a * 4, 3, seed=int(x))
    root_arm(p, cx + 2 + lean * 0.5, sh_y, farm[0], farm[1], True, seed=31)
    # the stalk-body, a long gilled gown to the floor
    p.poly([(cx - 22, base_y - 4), (cx - 11, top + 4), (cx + 11, top + 4), (cx + 22, base_y - 4)], STK0)
    p.poly([(cx - 20, base_y - 5), (cx - 10, top + 5), (cx + 9, top + 5), (cx + 19, base_y - 5)], STK1)
    p.poly([(cx - 17, base_y - 6), (cx - 8, top + 6), (cx - 2, top + 6), (cx - 5, base_y - 6)], STK2)
    for k in range(7):                                                   # long grooves down the gown
        x0 = cx - 10 + k * 3.3
        p.l(x0, sh_y + 8, x0 + (x0 - cx) * 0.6, base_y - 6, STK0 if k % 2 else STK1)
    p.l(cx - 11, top + 6, cx - 21, base_y - 5, STK3)
    for k in range(11):                                                  # frilled ring: a ruff at her shoulders
        x = cx - 22 + k * 4.4
        p.poly([(x - 2, sh_y), (x + 2.4, sh_y), (x + 3 + (k - 5) * 0.5, sh_y + 10 + (k % 2) * 3), (x - 1.5 + (k - 5) * 0.5, sh_y + 10 + (k % 2) * 3)],
               STK2 if k % 2 else STK3)
        p.l(x + 2.4, sh_y + 1, x + 3 + (k - 5) * 0.5, sh_y + 9 + (k % 2) * 3, STK0)
    p.l(cx - 22, sh_y, cx + 22, sh_y, STK3)
    for (ox, oy, w_, sd) in ((-17, 30, 7, 1), (-13, 44, 5, 2), (14, 38, 6, 3), (17, 50, 5, 4)):   # little caps on the gown
        x, y = cx + ox, sh_y + oy - 26
        p.l(x, y + 2, x - (1 if ox < 0 else -1) * 2, y + 4, STK3)
        spotted_cap(p, x, y - 1, w_, 3, (GW0, GW1, GW2, GW3) if glow_ else (CP0, CP1, CP2, CP3), seed=sd, nsp=1)
    # the long pale face under the cap
    fx_, fy = cx + 3 + lean, top + 4
    p.poly([(fx_ - 9, fy), (fx_ + 9, fy), (fx_ + 7, fy + 15), (fx_, fy + 20), (fx_ - 7, fy + 15)], STK2)
    p.l(fx_ - 8, fy + 1, fx_ - 6, fy + 14, STK3)
    ec = GW3 if eyes == 1 else (255, 220, 120) if eyes == 2 else STK0
    for sd in (-1, 1):
        ex = fx_ + sd * 4 + 1
        p.poly([(ex - 3.5, fy + 5), (ex + 3.5, fy + 5), (ex + sd * 2, fy + 8.5)], (14, 6, 18))
        if eyes:
            p.l(ex - 2, fy + 6, ex + 2, fy + 6, ec); p.p(ex + sd, fy + 7, GW1 if eyes == 1 else (200, 120, 40))
        p.l(ex + sd * 0.5, fy + 10, ex + sd, fy + 14, STK0)              # tear-lines of gill
    if mouth:
        p.e(fx_ - 3, fy + 12, fx_ + 4, fy + 13 + mouth * 2.5, (30, 10, 24))
    else:
        p.l(fx_ - 2, fy + 14, fx_ + 3, fy + 14, STK0)
    if cap:
        q = Pic(MM, MM)
        ch = 30 + cap_h
        mm_cap(q, cx + 2 + lean * 0.5, top - ch + cap_dy, 88, ch, glow_, droop)
        p.paste(q.im, 0, 0)
    root_arm(p, cx + 12 + lean, sh_y + 2, arm[0], arm[1], False, seed=33)
    im = outline_same(cut_below(p.im, MM_FEET))
    q = Pic(MM, MM)                                                      # spores drifting round her
    spore_motes(q, spores, int(t * 13) + 7, (cx - 50, 4, cx + 54, top + 30), (GW1, GW2, GW3) if glow_ else (SP1, SP2, PU2))
    im = on(im, q.im)
    if clouds:
        r_ = Pic(MM, MM)
        for k, (ox, oy) in enumerate(((-34, -22), (36, -18), (0, -34))[:clouds]):
            spore_cloud(r_, cx + ox, top + oy - clouds, 20 + clouds * 3, 11 + clouds, 50 + k + clouds, nm=10)
        im = on(im, outline_same(r_.im))
    if roots:
        r_ = Pic(MM, MM)
        for k, (x, hgt) in enumerate(roots):
            P8.root_spike(r_, x, MM_FEET, hgt, (-1) ** k * 0.6, 6 if hgt > 18 else 4, seed=k + 70)
            P8.clods(r_, x, MM_FEET, 4, 90 + k + hgt, 5, 8, floor=MM_FEET)
        im = on(im, outline_same(cut_below(r_.im, MM_FEET)))
    if fl:
        im = flash(im, fl)
    return im


def mm_fallen(k):
    """She has collapsed: the gown slumped into a heap on the root mat, the great cap sunk down over it, tilted, the
    glow going out of her spots."""
    p = Pic(MM, MM)
    for (x, r) in ((22, 6), (34, 8), (50, 9), (66, 8), (82, 6)):
        puff(p, x, MM_FEET - r * 0.5, r, (MY0, MY1, MY2, MY3))
    for (x, r) in ((40, 10), (56, 12), (70, 9)):
        puff(p, x, MM_FEET - r * 0.7, r, (STK0, STK1, STK2, STK3))
    root_arm(p, 70, MM_FEET - 10, 0.05, 30, False, seed=33)
    q = Pic(MM, MM)
    mm_cap(q, 56, MM_FEET - 54, 84, 26, 0, 0.0, seed=21)
    cap = q.im.rotate(-16 - k * 2, resample=Image.NEAREST, center=(56, MM_FEET - 28))
    cap = shift(cap, -4, 22 - k)
    p.paste(cap, 0, 0)
    im = outline_same(cut_below(p.im, MM_FEET))
    r = Pic(MM, MM)
    spore_motes(r, 10 - k * 3, 120 + k, (10, 40 - k * 8, 106, 100), (GW0, GW1, SP1))
    return on(im, r.im)


@builder('mycelmother')
def make_mycelmother():
    C = mm_frame
    sv = lambda st, fr: save(cells(fr, MM, MM), G_OUT + f'boss_mycelmother_{st}.png', len(fr))
    sv('idle', [C(t=i / 5, bob=(0, 0, 1, 1, 0)[i], cap_h=(0, 1, 2, 1, 0)[i], eyes=0 if i == 4 else 1, glow_=2 if i == 2 else 1,
                  arm=(1.3 + (0, 0.05, 0.1, 0.05, 0)[i], 34), farm=(1.45 - (0, 0.05, 0.1, 0.05, 0)[i], 32)) for i in range(5)])
    # attack: the root arms rear and lash, and roots spear up out of the floor in front of her
    sv('attack', [C(t=0.0, arm=(-0.6, 30), farm=(-0.2, 28), eyes=2, mouth=1, lean=-2),
                  C(t=0.15, arm=(-1.2, 32), farm=(-0.9, 30), eyes=2, mouth=2, lean=-3, bob=-1),
                  C(t=0.3, arm=(0.4, 40), farm=(0.6, 38), eyes=2, mouth=2, lean=3, roots=[(84, 10)]),
                  C(t=0.45, arm=(0.5, 40), farm=(0.7, 38), eyes=2, mouth=2, lean=3, roots=[(84, 26), (96, 18), (106, 10)]),
                  C(t=0.6, arm=(0.8, 36), farm=(1.0, 34), eyes=2, mouth=1, lean=2, roots=[(84, 18), (96, 30), (106, 22)]),
                  C(t=0.8, arm=(1.1, 32), farm=(1.3, 30), roots=[(84, 6), (96, 10), (106, 8)])])
    # cast: the cap swells and blazes, clouds of spores billow up off it
    sv('cast', [C(t=i / 6, glow_=g, cap_h=hh, clouds=cl, eyes=2 if g == 2 else 1, mouth=1 if cl else 0, spores=10 + cl * 4,
                  arm=(1.0 - a, 30), farm=(1.2 - a, 28), bob=-int(a * 2))
                for i, (g, hh, cl, a) in enumerate(((1, 1, 0, 0.2), (2, 3, 1, 0.6), (2, 4, 2, 1.0), (2, 4, 3, 1.0), (2, 2, 2, 0.6), (1, 1, 1, 0.2)))])
    sv('hurt', [C(t=0.1, dx=-4, eyes=2, mouth=2, fl=(255, 255, 255), droop=0.05, spores=14), C(t=0.2, dx=-2, mouth=1, spores=10), C(t=0.3, dx=-1)])
    d = [C(t=0.0, eyes=2, mouth=2, glow_=2, spores=16), C(t=0.1, eyes=0, mouth=2, glow_=1, droop=0.06, sink=3, spores=12),
         C(t=0.2, eyes=0, mouth=1, glow_=0, droop=0.12, sink=8, cap_dy=4, arm=(1.5, 26), farm=(1.6, 24), spores=8),
         C(t=0.3, eyes=0, glow_=0, droop=0.2, sink=14, cap_dy=10, arm=(1.6, 22), farm=(1.65, 20), spores=6)]
    d += [mm_fallen(0), mm_fallen(1), mm_fallen(2)]
    sv('death', d)


# ================================================================== BOSS: SPEGELKUNGEN (drawn: a king of mirrors and glass with a crown of shards)
MK = 116
MK_FEET = 115
CAPE = ((30, 10, 48), (58, 24, 88), (90, 44, 130), (130, 76, 176))
ROBE = ((24, 22, 40), (44, 42, 66), (72, 70, 100), (110, 108, 140))


def mirror_plate(p, pts, seed=0):
    """A flat mirror panel in a silver frame filling the polygon pts (glints run diagonally across it)."""
    p.poly(pts, SV0)
    xs = [x for x, _ in pts]; ys = [y for _, y in pts]
    x0, y0, x1, y1 = int(min(xs)) + 1, int(min(ys)) + 1, int(max(xs)) - 1, int(max(ys)) - 1
    if x1 - x0 < 2 or y1 - y0 < 2:
        return
    g = Pic(p.im.width, p.im.height)
    mirror_glass(g, x0, y0, x1, y1, seed, streaks=1 + (x1 - x0 > 8))
    m = Image.new('L', p.im.size)
    cxp, cyp = sum(xs) / len(xs), sum(ys) / len(ys)
    ImageDraw.Draw(m).polygon([(x + (cxp - x) * 0.18, y + (cyp - y) * 0.18) for x, y in pts], fill=255)
    gi = g.im
    gi.putalpha(Image.fromarray(np.minimum(np.array(gi)[:, :, 3], np.array(m))))
    p.paste(gi, 0, 0)


def glass_blade(p, hx, hy, ang, ln=34, w=4.5):
    """The king's sword: a long blade of mirror glass on a silver hilt."""
    u = (math.cos(ang), math.sin(ang))
    v = (-u[1], u[0])
    P_ = lambda a_, b_: (hx + u[0] * a_ + v[0] * b_, hy + u[1] * a_ + v[1] * b_)
    p.l(*P_(-6, 0), *P_(2, 0), SV0, 3)
    p.e(*P_(-7.5, 0), *P_(-7.5, 0), SV2)
    p.l(*P_(2, -5), *P_(2, 5), SV1, 3); p.l(*P_(2, -5), *P_(2, 5), SV3, 1)
    p.poly([P_(3, -w), P_(ln - 6, -w * 0.8), P_(ln, 0), P_(ln - 6, w * 0.8), P_(3, w)], GS0)
    p.poly([P_(4, -w + 1), P_(ln - 6, -w * 0.8 + 1), P_(ln - 1, 0), P_(4, 0)], GS2)
    p.poly([P_(4, 0), P_(ln - 1, 0), P_(ln - 6, w * 0.8 - 1), P_(4, w - 1)], GS1)
    p.l(*P_(6, -1), *P_(ln - 4, -1), GS3)
    return P_(ln, 0)


def floating_mirror(p, x, y, r, k=0, flash_=False):
    """A small diamond mirror hovering beside the king."""
    pts = [(x, y - r * 1.3), (x + r, y), (x, y + r * 1.3), (x - r, y)]
    mirror_plate(p, pts, k)
    if flash_:
        p.l(x - r - 3, y, x + r + 3, y, WHITE); p.l(x, y - r * 1.3 - 3, x, y + r * 1.3 + 3, WHITE)


def mirrorking_frame(t=0.0, bob=0, lean=0.0, eyes=1, blade=(-1.2, None), cape=0.0, orbit=1.0, flash_=0, beams=0, cracks=0,
                     fl=None, dx=0, crown=True, arc=0, burst=0, sink=0, mirrors=True):
    """blade = (angle, hand) of the glass sword (hand None = at his side); orbit: radius factor of the three hovering
    mirrors (cast spreads them); beams: light beams between them; cracks: cracks across his mirror armour."""
    p = Pic(MK, MK)
    cx, top = 54 + dx, 18 + bob + sink
    feet = MK_FEET
    sw = math.sin(t * math.tau) * 1.5 + cape
    # the cape, sweeping behind him
    p.poly([(cx - 4, top + 26), (cx - 30 - sw * 2, feet - 2), (cx - 12, feet), (cx + 8, feet - 1), (cx + 10, top + 28)], CAPE[0])
    p.poly([(cx - 4, top + 28), (cx - 27 - sw * 2, feet - 3), (cx - 13, feet - 1), (cx + 2, top + 30)], CAPE[1])
    for k in range(4):
        p.l(cx - 6 - k * 2, top + 32, cx - 26 - sw * 2 + k * 5, feet - 3, CAPE[2] if k % 2 else CAPE[0])
    p.l(cx - 30 - sw * 2, feet - 2, cx - 12, feet, SV2, 2)                 # silver hem
    # robe skirt to the floor
    p.poly([(cx - 12, top + 52), (cx + 12, top + 52), (cx + 17, feet), (cx - 16, feet)], ROBE[1])
    p.poly([(cx - 10, top + 54), (cx - 1, top + 54), (cx - 4, feet - 1), (cx - 14, feet - 1)], ROBE[2])
    for k in range(5):
        p.l(cx - 8 + k * 5, top + 56, cx - 11 + k * 6.5, feet - 1, ROBE[0])
    p.l(cx - 16, feet, cx + 17, feet, SV1, 2)
    p.poly([(cx - 2, top + 54), (cx + 3, top + 54), (cx + 5, feet - 1), (cx - 3, feet - 1)], CAPE[1])   # a violet panel down the front
    p.l(cx - 2, top + 54, cx - 3, feet - 1, AU2); p.l(cx + 3, top + 54, cx + 5, feet - 1, AU1)
    for k in range(6):                                                   # mirror shards sewn on the hem
        mirror_plate(p, [(cx - 13 + k * 5.5, feet - 7), (cx - 10.5 + k * 5.5, feet - 10), (cx - 8 + k * 5.5, feet - 7), (cx - 10.5 + k * 5.5, feet - 4)], 20 + k)
    # torso: a breastplate of mirror panels
    body = [(cx - 13, top + 26), (cx + 13, top + 26), (cx + 15, top + 40), (cx + 11, top + 54), (cx - 11, top + 54), (cx - 15, top + 40)]
    p.poly(body, SV0)
    mirror_plate(p, [(cx - 11, top + 28), (cx, top + 28), (cx, top + 41), (cx - 13, top + 40)], 1)
    mirror_plate(p, [(cx + 1, top + 28), (cx + 11, top + 28), (cx + 13, top + 40), (cx + 1, top + 41)], 2)
    mirror_plate(p, [(cx - 12, top + 42), (cx, top + 42), (cx, top + 53), (cx - 10, top + 53)], 3)
    mirror_plate(p, [(cx + 1, top + 42), (cx + 13, top + 42), (cx + 10, top + 53), (cx + 1, top + 53)], 4)
    p.l(cx - 13, top + 54, cx + 13, top + 54, AU2, 2)                      # belt
    p.e(cx - 3, top + 52, cx + 3, top + 57, AU1); p.p(cx, top + 54, (200, 40, 80))
    for (sx, sd) in ((cx - 16, -1), (cx + 16, 1)):                         # pauldrons: stacked mirror scales
        for k in range(3):
            mirror_plate(p, [(sx - 6 + k * sd, top + 24 + k * 4), (sx + 6 + k * sd, top + 24 + k * 4), (sx + 4 + k * sd, top + 30 + k * 4),
                             (sx - 4 + k * sd, top + 30 + k * 4)], 10 + k)
    if cracks:
        r2 = random.Random(cracks)
        for _ in range(cracks + 1):
            x0, y0 = cx + r2.randint(-10, 10), top + r2.randint(28, 52)
            for j in range(4):
                x1, y1 = x0 + r2.randint(-4, 4), y0 + r2.randint(-4, 4)
                p.l(x0, y0, x1, y1, OUT); p.p(x1, y1, WHITE)
                x0, y0 = x1, y1
    # head: a smooth silver mirror-mask, white eyes, a beard of glass shards, framed by a high violet collar
    hx, hy = cx + 3 + lean, top + 14
    p.poly([(cx - 14, top + 27), (cx - 17, top + 6), (cx - 8, top + 12), (cx + 14, top + 12), (cx + 20, top + 5), (cx + 16, top + 27)], CAPE[0])
    p.poly([(cx - 13, top + 25), (cx - 15, top + 9), (cx - 8, top + 14), (cx + 1, top + 14), (cx - 2, top + 25)], CAPE[2])
    p.l(cx - 17, top + 6, cx - 8, top + 12, SV2); p.l(cx + 20, top + 5, cx + 14, top + 12, SV2)
    p.e(hx - 9, hy - 10, hx + 9, hy + 10, SV0)
    p.e(hx - 8, hy - 9, hx + 8, hy + 9, SV1)
    p.e(hx - 7, hy - 9, hx + 4, hy + 3, SV2)
    p.arc(hx - 7, hy - 8, hx + 6, hy + 6, 200, 250, SV3)
    ec = WHITE if eyes == 1 else (255, 120, 160) if eyes == 2 else SV0
    for ex in (hx + 1, hx + 6):
        p.poly([(ex - 2.5, hy - 1), (ex + 2.5, hy - 1), (ex + 1, hy + 1.5), (ex - 1.5, hy + 1.5)], (14, 12, 24))
        if eyes:
            p.l(ex - 1.5, hy, ex + 1.5, hy, ec)
    p.l(hx + 4, hy - 4, hx + 4, hy + 3, SV2); p.l(hx + 5, hy + 3, hx + 6, hy + 3, SV0)   # nose ridge
    for k in range(5):                                                   # glass beard
        shard(p, hx - 4 + k * 2.5, hy + 7, math.pi / 2 + (k - 2) * 0.18, 9 - abs(k - 2) * 1.5, 1.6)
    if crown:
        for k, (ddx, ht) in enumerate(((-8, 9), (-4, 13), (1, 17), (5, 13), (9, 9))):
            shard(p, hx + ddx, hy - 9, -math.pi / 2 + ddx * 0.03, ht, 2.4)
        p.r(hx - 10, hy - 11, hx + 10, hy - 7, SV0)
        p.r(hx - 9, hy - 10, hx + 9, hy - 8, AU2); p.l(hx - 9, hy - 10, hx + 9, hy - 10, AU4)
        for k in range(4):
            p.p(hx - 6 + k * 4, hy - 9, (200, 40, 80) if k == 1 else GS2)
    # the sword arm
    ang, hand = blade
    shx, shy = cx + 13, top + 30
    hx_, hy_ = hand if hand else (shx + 6, shy + 14)
    hx_ += dx
    p.l(shx, shy, (shx + hx_) / 2 + 2, (shy + hy_) / 2 + 3, ROBE[2], 5)
    p.l((shx + hx_) / 2 + 2, (shy + hy_) / 2 + 3, hx_, hy_, ROBE[2], 5)
    glass_blade(p, hx_, hy_, ang)
    p.e(hx_ - 3, hy_ - 3, hx_ + 3, hy_ + 3, SV1); p.p(hx_ - 1, hy_ - 1, SV3)
    im = outline_same(cut_below(p.im, MK_FEET))
    q = Pic(MK, MK)
    if arc:                                                              # the sweep of the glass sword
        for k in range(3):
            q.arc(cx - 10 + k * 2, top + 4 + k * 3, cx + 62 - k * 2, top + 86 - k * 3, 290 + k * 5, 395, (WHITE, GS3, GS2)[k], 2 if k == 0 else 1)
    if mirrors:
        for k in range(3):
            a = t * math.tau / 3 + k * math.tau / 3
            r = 40 * orbit
            mx, my = cx + 2 + math.cos(a) * r, top + 40 + math.sin(a) * r * 0.45
            floating_mirror(q, mx, my, 5 + orbit, k, flash_ > 0 and k == (flash_ - 1) % 3 or flash_ >= 3)
        if beams:
            pts = [(cx + 2 + math.cos(t * math.tau / 3 + k * math.tau / 3) * 40 * orbit,
                    top + 40 + math.sin(t * math.tau / 3 + k * math.tau / 3) * 40 * orbit * 0.45) for k in range(3)]
            for k in range(3):
                a_, b_ = pts[k], pts[(k + 1) % 3]
                q.l(*a_, *b_, IL3 if beams > 1 else IL2)
                if beams > 1:
                    q.l(a_[0], a_[1] + 1, b_[0], b_[1] + 1, WHITE)
    if burst:
        r2 = random.Random(burst)
        for k in range(14):
            a = r2.uniform(0, math.tau); d = 10 + burst * 12 * r2.uniform(0.5, 1.2)
            shard(q, cx + math.cos(a) * d, top + 40 + math.sin(a) * d * 0.8, a, r2.uniform(5, 9), 2)
    im = on(im, outline_same(cut_below(q.im, MK_FEET))) if (arc or mirrors or burst) else im
    if fl:
        im = flash(im, fl)
    return im


def mk_shattered(k):
    """All that is left: a heap of mirror shards, the empty cape spread on the floor, the shard crown lying on top."""
    p = Pic(MK, MK)
    p.poly([(20, MK_FEET), (30, MK_FEET - 8), (70, MK_FEET - 10), (90, MK_FEET)], CAPE[1])
    p.poly([(28, MK_FEET - 1), (34, MK_FEET - 6), (64, MK_FEET - 7), (80, MK_FEET - 1)], CAPE[2])
    p.l(20, MK_FEET, 90, MK_FEET, SV2)
    r2 = random.Random(7)
    for i in range(22):
        x = 54 + r2.uniform(-30, 30) * (1 + k * 0.1)
        y = MK_FEET - r2.uniform(0, 12 - k * 3)
        shard(p, x, y, r2.uniform(0, math.tau), r2.uniform(4, 9), 2)
    q = Pic(40, 30)
    for ddx, ht in ((-8, 9), (-4, 13), (1, 17), (5, 13), (9, 9)):
        shard(q, 20 + ddx, 24, -math.pi / 2 + ddx * 0.03, ht, 2.4)
    q.r(10, 22, 30, 26, AU2); q.l(10, 22, 30, 22, AU4)
    cr = q.im.rotate(-28, resample=Image.NEAREST, expand=True)
    p.paste(cr, 52, MK_FEET - cr.getbbox()[3] + 2 - k)
    im = outline_same(cut_below(p.im, MK_FEET))
    s_ = Pic(MK, MK)
    for i in range(6 - k * 2):
        x, y = r2.uniform(20, 96), MK_FEET - r2.uniform(4, 30)
        s_.ps([(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], GS2); s_.p(x, y, WHITE)
    return on(im, s_.im)


def mk_burst():
    """The moment he shatters: a white flash where he stood, shards flung outwards, the crown tumbling, the cape
    falling empty."""
    im = mk_shattered(0)
    q = Pic(MK, MK)
    q.e(38, 34, 74, 84, (230, 240, 255)); q.e(46, 44, 66, 74, WHITE)
    r2 = random.Random(31)
    for k in range(20):
        a = r2.uniform(0, math.tau); d = r2.uniform(18, 46)
        shard(q, 56 + math.cos(a) * d, 60 + math.sin(a) * d * 0.85, a, r2.uniform(5, 10), 2.2)
    c = Pic(40, 30)
    for ddx, ht in ((-8, 9), (-4, 13), (1, 17), (5, 13), (9, 9)):
        shard(c, 20 + ddx, 24, -math.pi / 2 + ddx * 0.03, ht, 2.4)
    c.r(10, 22, 30, 26, AU2); c.l(10, 22, 30, 22, AU4)
    q.paste(c.im.rotate(35, resample=Image.NEAREST, expand=True), 50, 6)
    return on(im, outline_same(cut_below(q.im, MK_FEET)))


@builder('mirrorking')
def make_mirrorking():
    C = mirrorking_frame
    sv = lambda st, fr: save(cells(fr, MK, MK), G_OUT + f'boss_mirrorking_{st}.png', len(fr))
    sv('idle', [C(t=i / 5, bob=(0, 0, 1, 1, 0)[i], blade=(-1.25 + 0.03 * i, None), flash_=1 if i == 2 else 0) for i in range(5)])
    # attack: the glass sword is raised high and swept down and forward in a glittering arc
    sv('attack', [C(t=0.0, blade=(-1.9, (70, 34)), eyes=2, lean=-1),
                  C(t=0.1, blade=(-2.4, (66, 30)), eyes=2, lean=-2, bob=-1),
                  C(t=0.2, blade=(-0.2, (82, 46)), eyes=2, lean=3, arc=1),
                  C(t=0.3, blade=(0.5, (84, 56)), eyes=2, lean=3, arc=1),
                  C(t=0.4, blade=(0.9, (80, 58)), eyes=2, lean=2),
                  C(t=0.5, blade=(-1.0, None))])
    # cast: the three hovering mirrors spread out, flash in turn and join in a triangle of light
    sv('cast', [C(t=i / 6, orbit=o, flash_=fl_, beams=bm, eyes=2 if bm else 1, blade=(-1.6, (72, 36)) if bm else (-1.25, None))
                for i, (o, fl_, bm) in enumerate(((1.1, 0, 0), (1.25, 1, 0), (1.35, 2, 1), (1.35, 3, 2), (1.3, 3, 2), (1.1, 0, 0)))])
    sv('hurt', [C(t=0.1, dx=-4, eyes=2, cracks=2, fl=(255, 255, 255), flash_=3), C(t=0.2, dx=-2, cracks=2), C(t=0.3, dx=-1, cracks=1)])
    d = [C(t=0.0, eyes=2, cracks=4, flash_=3), C(t=0.1, eyes=2, cracks=7, orbit=1.4, lean=-2),
         C(t=0.2, eyes=0, cracks=10, sink=6, orbit=1.6, blade=(1.3, (72, 74)), mirrors=False, burst=1),
         mk_burst()]
    d += [mk_shattered(0), mk_shattered(1), mk_shattered(2)]
    sv('death', d)


# @@SECTIONS@@


# ================================================================== CONTACT SHEET
NEW_WEAPONS = ('sporelauncher', 'mirrorshield', 'whip')


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
