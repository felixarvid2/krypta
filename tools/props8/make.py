#!/usr/bin/env python3
"""Version 10 graphics for Krypta ("Nya invånare"): six new enemies for the early biomes, all six pets, the legend
altar, legendary first-person weapons and pickups, particles and icons.

Run from the folder that holds retrofps/ and assets/ (e.g. /home/user/test):
    python3 retrofps/tools/props8/make.py [name ...]
(with names only those builders run, e.g. `python3 retrofps/tools/props8/make.py toad sheet`; the contact sheet
always shows everything this script has written so far)

Out to retrofps/assets/gfx:
  enemies-{jailer,burrower,gravedigger,rootling,crossbowman,toad}_{idle,movement,attack,take_damage,death}.png (64x64)
  enemies-burrower_dig.png (optional: it digs itself down again, the attack's eruption played the other way)
  pet_{raven,lantern,pup,firefly,minigolem,owl}_{idle,movement,attack}.png (32x32 cells)
  prop_legendaltar.png (2 frames: unlit, lit)
  fp_{shotgun,rifle,pistol,staff,axe,bow}_legend.png  (same cell size and frame count as fp_<base>.png, so the
      js/weapons.js entry of the base weapon is reused as is)
  pick_{shotgun,rifle,pistol,staff,axe,bow}_legend.png (same size as pick_<base>.png)
  part_{chain,root,tongue,legend,dirt}.png, icon_legend.png (8x8)
Out to retrofps/assets/touch: icon_pet.png (96x96, white on transparent)
Contact sheet: <scratchpad>/en/v10_sheet.png

Sources (licences checked; everything not listed is drawn procedurally below in the outlined style of
tools/props2-props7, whose helpers are reused):
  * Pixel Crawler Free Pack 2.11 (Anokolisa; free for commercial use, edits allowed, no resale of the assets):
      Characters/Body_A Idle/Walk/Fishing/Hit/Death -> jailer (leather jerkin, iron collar, key ring, chain over the
                                                      shoulder and an iron-banded club drawn; the fishing cast is the
                                                      chain throw)
      Characters/Body_A Idle/Walk/Crush/Hit/Death   -> gravedigger (slouch hat, long coat, lantern and spade drawn;
                                                      the pickaxe swing is the spade blow)
      Characters/Body_A Idle/Walk/Pierce/Hit/Death  -> crossbowman (kettle hat, quartered tabard, quiver and crossbow
                                                      drawn)
  * retrofps/assets/gfx/fp_{shotgun,rifle,pistol,staff,axe,bow}.png and pick_*.png (the game's own renders) -> the
      legendary variants (recoloured by material, hard alpha, a glowing rim and motes)
  (32rogues, Super Retro World and Mana Seed are NOT used: their licences forbid AI use / redistribution.)
Drawn: burrower, rootling, toad, all six pets (pet_pup redraws props3's pup with a 4-frame attack), the altar,
particles and icons.
Additive particles (stored opaque on black, like part_ember): part_legend.
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
sys.dont_write_bytecode = True          # the helper modules of props2-props7 are loaded without touching their __pycache__


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
from_p2 = 'OUT Pic outline outline_same hard shift gmap blend glow from_arr shear squash'.split()
globals().update({k: getattr(P2, k) for k in from_p2})
strip_tool, cut_below = P3.strip_tool, P4.cut_below
mask_of, ground, tool_axis, front_hand = P5.mask_of, P5.ground, P5.tool_axis, P5.front_hand
dark, flash, dress, body_src, cell_of = P6.dark, P6.flash, P6.dress, P6.body_src, P6.cell_of
puff, feather, tool_line, back_x = P7.puff, P7.feather, P7.tool_line, P7.back_x
S0, S1, S2, S3, S4 = P2.S0, P2.S1, P2.S2, P2.S3, P2.S4
W0, W1, W2, W3, W4 = P2.W0, P2.W1, P2.W2, P2.W3, P2.W4
I0, I1, I2, I3 = P2.I0, P2.I1, P2.I2, P2.I3
M0, M1, M2, M3 = P2.M0, P2.M1, P2.M2, P2.M3
F0, F1, F2, F3 = P2.F0, P2.F1, P2.F2, P2.F3
BL0, BL1, BL2 = P2.BL0, P2.BL1, P2.BL2
AU0, AU1, AU2, AU3, AU4 = P5.AU0, P5.AU1, P5.AU2, P5.AU3, P5.AU4

G_OUT, T_OUT = 'retrofps/assets/gfx/', 'retrofps/assets/touch/'
SCR = '/tmp/claude-0/-home-user/80ee56ba-2fa6-5354-b261-a4ca4fdcb508/scratchpad/en/'
SHEET, MANIFEST = SCR + 'v10_sheet.png', SCR + 'v10_manifest.json'
WHITE = (255, 255, 255)
CLEAR = (0, 0, 0, 0)

# ---------------------------------------------------------------- shared palettes
DT0, DT1, DT2, DT3 = (44, 30, 26), (78, 54, 40), (116, 84, 58), (152, 116, 80)          # earth / dirt
MS0, MS1, MS2, MS3 = (30, 62, 34), (52, 98, 44), (88, 140, 58), (140, 186, 84)           # moss
BK0, BK1, BK2, BK3 = (48, 32, 26), (82, 56, 38), (118, 84, 56), (156, 118, 80)           # bark
LANT0, LANT1, LANT2 = (220, 140, 40), (255, 210, 90), (255, 246, 196)                    # lantern light

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
def chain(p, pts, pal=(I1, M1, M3), every=2):
    """An iron chain along a polyline: a dark core with alternating bright (face-on) and dim (edge-on) links."""
    seg = []
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(1, int(math.hypot(x1 - x0, y1 - y0)))
        seg += [(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n) for i in range(n)]
    seg.append(pts[-1])
    for i, (x, y) in enumerate(seg):
        k = (i // every) % 2
        p.p(x, y, pal[2] if k == 0 and i % every == 0 else pal[1] if k == 0 else pal[0])
        if k == 0 and i % every == 0:                     # face-on link: one more pixel across the run
            j = min(len(seg) - 1, i + 1)
            dx_, dy_ = seg[j][0] - x, seg[j][1] - y
            ln = math.hypot(dx_, dy_) or 1
            p.p(x - dy_ / ln, y + dx_ / ln, pal[1])


def shackle(p, x, y, ang=0.0, open_=0.0):
    """An open iron manacle (the weight at the end of the jailer's chain)."""
    r = 2.6
    a0 = math.degrees(ang) + 40 + open_ * 30
    p.arc(x - r, y - r, x + r, y + r, a0, a0 + 290, I2, 2)
    p.arc(x - r, y - r, x + r, y + r, a0 + 40, a0 + 150, M3)
    p.p(x - math.cos(ang) * r, y - math.sin(ang) * r, M2)


def keyring(p, x, y, sw=0.0):
    """A ring of three big keys hanging at (x, y); sw swings them (-1..1)."""
    p.eo(x - 1, y, x + 1, y + 2, AU1)
    for k, (dx_, ln) in enumerate(((-1, 3), (0.5, 4), (2, 3))):
        ox = dx_ + sw * (0.6 + k * 0.4)
        x0, y0 = x + dx_ * 0.6, y + 2
        x1, y1 = x + ox, y + 2 + ln
        c = (AU2, M2, AU3)[k]
        p.l(x0, y0, x1, y1, c)
        p.p(x1 + 1, y1, c)                                                    # the bit


def clods(p, x, y, n, seed, spread=8, rise=6.0, pal=(DT1, DT2, DT3), floor=57):
    """Dirt clods and pebbles thrown up from (x, y)."""
    r2 = random.Random(seed)
    for _ in range(n):
        cx_ = x + r2.uniform(-spread, spread)
        cy_ = min(floor, y - r2.uniform(0.2, 1.0) * rise)
        s_ = r2.choice((1, 1, 2))
        p.r(cx_, cy_, cx_ + s_ - 1, cy_ + s_ - 1, r2.choice(pal))
        if s_ == 2:
            p.p(cx_, cy_, pal[-1])


def dirt_mound(p, cx, w, h, seed, floor=57, cracks=0.0, stones=True):
    """A heap of loose earth on the floor around cx (w wide, h tall); cracks (0..1) split its top open."""
    r2 = random.Random(seed)
    n = max(3, int(w / 5))
    for i in range(n):
        t = i / (n - 1)
        x = cx - w / 2 + t * w
        hh = h * (1 - (2 * t - 1) ** 2) * 0.9 + 2 + r2.uniform(-0.8, 0.8)
        r_ = max(2.5, hh * 0.75 + 1)
        puff(p, x, floor - hh + r_ * 0.8, r_, (DT0, DT1, DT2, DT3))
    p.r(cx - w / 2 - 2, floor - 1, cx + w / 2 + 2, floor, DT0)
    if stones:
        for _ in range(int(w / 7)):
            x = cx + r2.uniform(-w / 2.5, w / 2.5)
            y = floor - r2.uniform(1, h * 0.8)
            p.r(x, y, x + 1, y, S3); p.p(x, y - 1, S4)
    if cracks:
        top = floor - h - 1
        for k in (-1, 1):
            pts = [(cx + k * 1, top + 2), (cx + k * (2 + cracks * 3), top + 3 + cracks * 2), (cx + k * (3 + cracks * 5), top + 6 + cracks * 3)]
            p.lines(pts, DT0)
        p.e(cx - cracks * 4, top + 1, cx + cracks * 4, top + 2 + cracks * 3, (22, 14, 12))


def sparkles(p, n, seed, box, pal=(AU2, AU3, AU4)):
    r2 = random.Random(seed)
    x0, y0, x1, y1 = box
    for _ in range(n):
        x, y = r2.uniform(x0, x1), r2.uniform(y0, y1)
        if r2.random() < 0.4:
            p.ps([(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], pal[1]); p.p(x, y, pal[2])
        else:
            p.p(x, y, r2.choice(pal))



# ================================================================== JAILER (Body_A: leather hood and jerkin, iron collar, key ring, chain, club)
JL_PAL = {'head': ((206, 150, 120), (156, 102, 82), (104, 64, 56), (232, 190, 160)),
          'torso': ((126, 86, 58), (92, 62, 44), (62, 40, 32), (164, 116, 76)),
          'legs': ((72, 64, 68), (52, 46, 52), (36, 30, 38), (98, 90, 94))}
HOOD0, HOOD1, HOOD2 = (30, 22, 26), (50, 38, 40), (76, 58, 58)
CLUB = ((92, 58, 36), (140, 96, 58), (184, 134, 84))


def club(p, hx, hy, ang, ln=13, back=3):
    """An iron-banded cudgel through the hand at (hx, hy): a thin grip widening to a heavy studded head."""
    u = (math.cos(ang), math.sin(ang))
    v = (-u[1], u[0])
    x0, y0 = hx - u[0] * back, hy - u[1] * back
    x1, y1 = hx + u[0] * ln, hy + u[1] * ln
    p.l(x0, y0, x1, y1, CLUB[0], 2)
    p.l(x0, y0, x1, y1, CLUB[1])
    hx0, hy0 = hx + u[0] * (ln - 6), hy + u[1] * (ln - 6)
    p.l(hx0, hy0, x1, y1, CLUB[0], 4)
    p.l(hx0 + v[0], hy0 + v[1], x1 + v[0], y1 + v[1], CLUB[2])
    for t in (ln - 5, ln - 1):                                                # two iron bands
        bx, by = hx + u[0] * t, hy + u[1] * t
        p.l(bx - v[0] * 2, by - v[1] * 2, bx + v[0] * 2, by + v[1] * 2, I2)
        p.p(bx + v[0] * 2, by + v[1] * 2, M3)
    for t, s_ in ((ln - 3, 1), (ln - 3, -1), (ln + 0.5, 1)):                   # studs sticking out
        p.p(hx + u[0] * t + v[0] * s_ * 3, hy + u[1] * t + v[1] * s_ * 3, M2)
    return x1, y1


def jailer_hood(p, hx, hy):
    """A close leather skullcap with rivets, a heavy black beard round the jaw."""
    p.poly([(hx - 7, hy - 3), (hx - 6, hy - 7), (hx - 2, hy - 9), (hx + 2, hy - 9), (hx + 5, hy - 7), (hx + 6, hy - 4)], HOOD1)
    p.l(hx - 4, hy - 8, hx + 2, hy - 8, HOOD2)
    p.l(hx - 7, hy - 3, hx + 6, hy - 4, HOOD0)
    for x in (hx - 4, hx - 1, hx + 2):                                       # rivets on the band
        p.p(x, hy - 4, M2)
    p.poly([(hx - 1, hy + 1), (hx + 1, hy + 4), (hx + 4, hy + 5), (hx + 5, hy + 2), (hx + 4, hy + 3), (hx + 1, hy + 2)], HOOD1)
    p.l(hx + 1, hy + 4, hx + 4, hy + 4, HOOD2)


def jailer_cell(f, feet, cx, phase=0.0, cl=None, dx=0, dy=0, fl=None, eyes=1, hood=True, coil=True, keys=True, sw=0.0,
                chained=None):
    g, hc = dress(f, JL_PAL, eye=(255, 210, 120) if eyes == 1 else (255, 80, 50) if eyes == 2 else (90, 60, 50))
    if hc is None:
        return Image.new('RGBA', (64, 64))
    hx, hy = hc
    p = Pic(64, 64)
    if cl and cl[3] == 'back':
        club(p, *cl[:3])
    p.paste(g, 0, 0)
    a = mask_of(g)
    p.l(hx - 3, hy + 5, hx + 2, hy + 5, I2); p.p(hx, hy + 5, M3)              # iron collar
    p.r(hx + 1, hy + 3, hx + 4, hy + 3, HOOD0)                               # stubble under the mouth
    p.p(hx + 3, hy + 2, HOOD0)
    if coil:                                                                 # chain worn across the chest
        rows = [y for y in range(int(hy) + 6, int(hy) + 16) if len(np.nonzero(a[y])[0]) >= 3]
        if rows:
            pts = []
            for y in rows:
                xs = np.nonzero(a[y])[0]
                t = (y - rows[0]) / max(1, len(rows) - 1)
                pts.append((xs.max() - 1 - t * (xs.max() - xs.min() - 2), y))
            chain(p, pts, (I1, M1, M3))
    yb = int(hy) + 15
    xs = np.nonzero(a[min(63, yb)])[0]
    if len(xs) >= 3:                                                         # belt, buckle and the key ring
        p.l(xs.min() + 1, yb, xs.max() - 1, yb, HOOD0)
        p.p(xs.max() - 2, yb, AU3)
        if keys:
            keyring(p, xs.max() - 2, yb + 1, sw)
    for (ox, oy) in ((-2, 9), (2, 10), (-1, 12)):                            # studs on the jerkin
        if a[int(hy + oy), int(hx + ox)]:
            p.p(hx + ox, hy + oy, M2)
    if hood:
        jailer_hood(p, hx, hy)
    if chained:
        chained(p)
    if cl and cl[3] != 'back':
        club(p, *cl[:3])
    im = cell_of(outline_same(p.im), feet, cx, dx, dy)
    if fl:
        im = flash(im, fl)
    return im


@builder('jailer')
def make_jailer():
    idle, walk, fi, hit, de = body_src('Idle'), body_src('Walk'), body_src('Fishing'), body_src('Hit'), body_src('Death')
    feet = max(f.getbbox()[3] - 1 for f in idle)
    b = idle[0].getbbox()
    cx = (b[0] + b[2]) // 2
    J = jailer_cell

    def held(f, ang=-1.3):                        # club held up in front of the chest
        gs = strip_tool(f)
        hx, hy = front_hand(gs, gs.getbbox()[1], (14, 22))
        return (hx, hy, ang, 'front')
    save_enemy('jailer', 'idle', [J(f, feet, cx, phase=i, cl=held(f), sw=(0, 0.4, 0, -0.4)[i]) for i, f in enumerate(idle)], 64)
    save_enemy('jailer', 'movement', [J(f, feet, cx, phase=i, cl=held(f, -1.15), sw=(0.8, 0, -0.8, 0.8, 0, -0.8)[i], dy=(0, 1, 0, 0, 1, 0)[i])
                                      for i, f in enumerate(walk)], 64)
    # attack: the chain is whirled over the head (fishing wind-up), then cast forward with the shackle at its end,
    # then hauled back in.
    att = []
    for i, f in enumerate(fi):
        (hx, hy), ang = tool_line(f)

        def throw(p, i=i, hx=hx, hy=hy):
            if i <= 2:                                                       # a loop of chain swung round over the head
                r_ = 9 + i
                cxl, cyl = hx - 3, hy - 15
                a0 = i * 2.1
                pts = [(cxl + math.cos(a0 + k * 0.35) * r_, cyl + math.sin(a0 + k * 0.35) * r_ * 0.4) for k in range(17)]
                chain(p, [(hx, hy)] + pts)
                ex, ey = pts[-1]
                shackle(p, ex, ey, a0 + 16 * 0.35 + 1.5)
                p.arc(cxl - r_ - 2, cyl - r_ * 0.4 - 2, cxl + r_ + 2, cyl + r_ * 0.4 + 2, math.degrees(a0) + 200, math.degrees(a0) + 290, M2)
            elif i <= 6:                                                     # cast forward: the chain pays out to the right
                ln = (12, 22, 30, 30)[i - 3]
                sag = (1.0, 2.5, 1.5, 3.5)[i - 3]
                ex = min(62, hx + ln); ey = hy - (3, 4, 2, 0)[i - 3]
                pts = [(hx + (ex - hx) * k / 10, hy + (ey - hy) * k / 10 + math.sin(k / 10 * math.pi) * sag) for k in range(11)]
                chain(p, pts)
                shackle(p, ex, ey, 0.0, 1.0 if i < 6 else 0.3)
                if i == 4:
                    for k in range(3):
                        p.l(hx + 4 + k * 5, ey - 4 - k % 2, hx + 7 + k * 5, ey - 4 - k % 2, M3)
            else:                                                            # hauled in, hanging from the hand
                pts = [(hx, hy), (hx + 2, hy + 4), (hx + 1, hy + 8), (hx + 3, hy + 11)]
                chain(p, pts)
                shackle(p, hx + 3, hy + 13, math.pi / 2)
        att.append(J(f, feet, cx, phase=i, cl=None, coil=False, eyes=2 if 2 <= i <= 5 else 1, sw=(0, 0.5, 1, -1, -0.5, 0, 0.5, 0)[i],
                     chained=throw))
    save_enemy('jailer', 'attack', att, 64)
    save_enemy('jailer', 'take_damage', [J(f, feet, cx, phase=i, cl=held(f, -1.5), dx=-1 - (i == 0), eyes=2, sw=1 - i * 0.6,
                                           fl=(255, 255, 255) if i == 0 else None) for i, f in enumerate(hit)], 64)
    dfr = []
    for i, f in enumerate(de):                    # falls; the club drops, the keys scatter, the chain lies coiled
        c = J(f, feet, cx, phase=i, cl=held(f, -1.5 + i * 0.5) if i < 2 else None, eyes=1 if i < 3 else 0, keys=i < 4,
              coil=i < 5)
        p = Pic(64, 64)
        if i >= 2:
            club(p, 12 + min(i, 4), 56, -0.15 + min(i, 4) * 0.03, 13, 0)
        if i >= 4:
            keyring(p, 45 + min(i - 4, 2) * 2, 52, 1.5)
        if i >= 5:
            pts = [(18, 57), (22, 55), (26, 57), (30, 55), (34, 57)]
            chain(p, pts); shackle(p, 36, 55, 0.4)
        dfr.append(cut_below(on(outline_same(p.im), c), 57) if i >= 2 else c)
    save_enemy('jailer', 'death', dfr, 64)



# ================================================================== GRAVEDIGGER (Body_A: slouch hat, long coat, lantern at the belt, spade)
GD_PAL = {'head': ((176, 170, 148), (132, 124, 108), (90, 82, 76), (208, 202, 182)),
          'torso': ((90, 80, 56), (64, 56, 42), (42, 36, 30), (118, 106, 74)),
          'legs': ((64, 56, 50), (46, 40, 38), (32, 28, 28), (86, 78, 70))}
HAT0, HAT1, HAT2 = (28, 24, 28), (48, 42, 46), (74, 66, 68)
COAT0, COAT1, COAT2 = (42, 36, 30), (64, 56, 42), (90, 80, 56)


def spade(p, hx, hy, ang, ln=14, back=8, dirt=True):
    """A spade through the hand at (hx, hy): a T-grip at the back end, an iron blade at the far end. Returns the tip."""
    u = (math.cos(ang), math.sin(ang))
    v = (-u[1], u[0])
    x0, y0 = hx - u[0] * back, hy - u[1] * back
    x1, y1 = hx + u[0] * ln, hy + u[1] * ln
    p.l(x0, y0, x1, y1, W1, 2)
    p.l(x0, y0, x1, y1, W3)
    p.l(x0 - v[0] * 2, y0 - v[1] * 2, x0 + v[0] * 2, y0 + v[1] * 2, W2)            # T-grip
    P_ = lambda a_, b_: (x1 + u[0] * a_ + v[0] * b_, y1 + u[1] * a_ + v[1] * b_)
    p.poly([P_(0, -2.5), P_(5, -2.5), P_(7, -1), P_(7.5, 0), P_(7, 1), P_(5, 2.5), P_(0, 2.5)], M1)
    p.poly([P_(1, -1.5), P_(5, -1.5), P_(6, 0), P_(5, 1), P_(1, 1)], M2)
    p.l(*P_(1, -1.5), *P_(5, -1.5), M3)
    p.l(*P_(-1, 0), *P_(1, 0), I1)                                                # socket
    if dirt:
        p.p(*P_(6, 1), DT2); p.p(*P_(5, 2), DT1)
    return P_(7.5, 0)


def lantern(p, x, y, lit=True, sw=0.0):
    """A small iron lantern hanging from (x, y) by a short chain; sw swings it."""
    lx, ly = x + sw * 2, y + 3
    p.l(x, y, lx, ly, I2)
    p.r(lx - 2, ly, lx + 2, ly, I1)                                               # cap
    p.r(lx - 2, ly + 1, lx + 2, ly + 4, LANT1 if lit else (70, 64, 60))
    p.l(lx, ly + 1, lx, ly + 4, I1 if lit else I0)
    if lit:
        p.p(lx - 1, ly + 2, LANT2); p.p(lx + 1, ly + 3, LANT0)
    p.r(lx - 2, ly + 5, lx + 2, ly + 5, I1)
    return lx, ly + 2


def light_ring(p, x, y, r, k=0, col=LANT1):
    """A broken ring of light motes round a lamp (binary-alpha stand-in for a glow)."""
    for i in range(8):
        a = i / 8 * math.tau + k * 0.4
        if (i + k) % 3:
            p.p(x + math.cos(a) * r, y + math.sin(a) * r, col)


def slouch_hat(p, hx, hy, tilt=0.0):
    p.poly([(hx - 5, hy - 5), (hx - 4, hy - 10 + tilt), (hx + 2, hy - 11), (hx + 4, hy - 9), (hx + 4, hy - 5)], HAT1)
    p.l(hx - 3, hy - 10 + tilt, hx + 1, hy - 10, HAT2)
    p.l(hx - 9, hy - 4 + tilt, hx + 8, hy - 5, HAT1, 2)                           # wide drooping brim
    p.l(hx - 9, hy - 3 + tilt, hx + 8, hy - 4, HAT0)
    p.p(hx + 9, hy - 3, HAT1); p.p(hx - 10, hy - 3 + tilt, HAT1)
    p.l(hx - 4, hy - 6, hx + 4, hy - 6, (110, 30, 34))                           # faded red band


def long_coat(p, g, hy, sway=0.0):
    """Coat tails from the belt to the knees, flaring behind him."""
    a = mask_of(g)
    b = g.getbbox()
    feet = b[3] - 1
    belt = int(hy + 13)
    stop = min(feet - 3, belt + 7)
    if belt >= stop:
        return
    xs = np.nonzero(a[belt])[0]
    if not len(xs):
        return
    x0, x1 = xs.min(), xs.max()
    for y in range(belt, stop + 1):
        t = (y - belt) / max(1, stop - belt)
        l = x0 - round(t * 3) + round(sway * t)
        r = x1 + round(t * 1) + round(sway * t)
        for x in range(l, r + 1):
            p.p(x, y, COAT0 if x <= l + 1 else COAT2 if (x - l) % 4 == 3 else COAT1)
        if y == stop:
            for x in range(l, r + 1, 3):
                p.p(x, y + 1, COAT1)


def gravedigger_cell(f, feet, cx, phase=0.0, sp=None, dx=0, dy=0, fl=None, eyes=1, hat=True, lamp=True, lit=True, sway=0.0,
                     coat=True, extra=None):
    g, hc = dress(f, GD_PAL, eye=(220, 230, 140) if eyes == 1 else (255, 120, 60) if eyes == 2 else (70, 66, 60))
    if hc is None:
        return Image.new('RGBA', (64, 64))
    hx, hy = hc
    p = Pic(64, 64)
    if sp and sp[3] == 'back':
        spade(p, *sp[:3], *sp[4:])
    a = mask_of(g)
    p.paste(g, 0, 0)
    if coat:
        long_coat(p, g, hy, sway)
    yb = int(hy) + 13
    xs = np.nonzero(a[min(63, yb)])[0]
    if len(xs) >= 3:
        p.l(xs.min(), yb, xs.max(), yb, (34, 26, 22))                              # rope belt
        p.p(xs.max() - 1, yb + 1, (34, 26, 22))
    p.l(hx + 4, hy, hx + 6, hy + 1, GD_PAL['head'][1])                             # long nose
    p.p(hx + 1, hy + 4, (60, 56, 50)); p.p(hx + 3, hy + 4, (60, 56, 50))           # stubble
    if hat:
        slouch_hat(p, hx, hy)
    if lamp:
        bx = back_x(g, yb)
        if bx is not None:
            lx, ly = lantern(p, bx - 1, yb, lit, math.sin(phase * 1.3) * 0.7)
            if lit:
                light_ring(p, lx, ly + 1, 5, int(phase))
    if extra:
        extra(p)
    if sp and sp[3] != 'back':
        spade(p, *sp[:3], *sp[4:])
    im = cell_of(outline_same(p.im), feet, cx, dx, dy)
    if fl:
        im = flash(im, fl)
    return im


@builder('gravedigger')
def make_gravedigger():
    idle, walk, cr, hit, de = body_src('Idle'), body_src('Walk'), body_src('Crush'), body_src('Hit'), body_src('Death')
    feet = max(f.getbbox()[3] - 1 for f in idle)
    b = idle[0].getbbox()
    cx = (b[0] + b[2]) // 2
    G = gravedigger_cell

    def planted(f, lean=0.12):                   # leaning on the spade, blade in the ground in front of him
        gs = strip_tool(f)
        hx, hy = front_hand(gs, gs.getbbox()[1], (14, 22))
        return (hx, hy, math.pi / 2 - lean, 'front', max(3, feet - hy - 7), 9)

    def carried(f):                               # carried upright, blade up
        gs = strip_tool(f)
        hx, hy = front_hand(gs, gs.getbbox()[1], (14, 22))
        return (hx, hy, -math.pi / 2 + 0.3, 'front', 11, 4)
    save_enemy('gravedigger', 'idle', [G(f, feet, cx, phase=i, sp=planted(f)) for i, f in enumerate(idle)], 64)
    save_enemy('gravedigger', 'movement', [G(f, feet, cx, phase=i, sp=carried(f), sway=-1, dy=(0, 1, 0, 0, 1, 0)[i])
                                           for i, f in enumerate(walk)], 64)
    # attack: the pickaxe swing of Body_A Crush becomes an overhead spade blow that bites into the ground
    att = []
    for i, f in enumerate(cr):
        (hx, hy), ang = tool_line(f)
        if i <= 2:
            sp = (hx, hy, ang - 0.25 - i * 0.12, 'back', 8, 4)
        elif i <= 6:
            sp = (hx, hy, (0.55, 0.6, 0.45, 0.2)[i - 3], 'front', 6, 3)
        else:
            sp = (hx, hy, -math.pi / 2 + 0.2, 'front', 9, 4)

        def dirt(p, i=i, hx=hx, hy=hy):
            if i in (3, 4, 5):
                tx = hx + 12
                clods(p, tx, 47, (6, 8, 4)[i - 3], 30 + i, 5 + (i - 3) * 3, (5, 9, 6)[i - 3], floor=47)
                if i == 3:
                    for k in (-1, 1):
                        p.l(tx + k * 3, 46, tx + k * 6, 43, DT3)
        att.append(G(f, feet, cx, phase=i, sp=sp, eyes=2 if 2 <= i <= 5 else 1, extra=dirt))
    save_enemy('gravedigger', 'attack', att, 64)
    save_enemy('gravedigger', 'take_damage', [G(f, feet, cx, phase=i * 2, sp=carried(f), dx=-1 - (i == 0), eyes=2,
                                                fl=(255, 255, 255) if i == 0 else None) for i, f in enumerate(hit)], 64)
    dfr = []
    for i, f in enumerate(de):                    # the hat flies off, the spade falls, the lantern rolls away and dies
        c = G(f, feet, cx, phase=i, eyes=1 if i < 3 else 0, hat=i < 2, lamp=i < 3, coat=i < 3,
              sp=carried(f) if i < 2 else None)
        p = Pic(64, 64)
        if i >= 2:
            spade(p, 6, 56, -0.04, 14, 0)
            hp = Pic(24, 16); slouch_hat(hp, 12, 13)
            hr = hp.im.rotate(-20 + min(i, 5) * 4, resample=Image.NEAREST, center=(12, 10))
            p.paste(hr, 34 + min(i, 5) * 2, 44 + min(i - 2, 2))
        if i >= 3:
            lx = 50 + min(i - 3, 2) * 2
            lp = Pic(10, 10); lantern(lp, 5, 0, i < 6)
            p.paste(lp.im.rotate(-90 * min(1, (i - 2) / 3), resample=Image.NEAREST, center=(5, 5)), lx, 49)
            if i < 6:
                light_ring(p, lx + 5, 54, 4, i)
        dfr.append(cut_below(on(outline_same(p.im), c), 57) if i >= 2 else c)
    save_enemy('gravedigger', 'death', dfr, 64)



# ================================================================== CROSSBOWMAN (Body_A: kettle hat, quartered tabard, quiver, crossbow)
TB0, TB1, TB2, TB3 = (22, 30, 70), (36, 52, 112), (58, 82, 156), (96, 124, 196)          # tabard blue
CB_PAL = {'head': ((214, 162, 124), (166, 112, 84), (112, 70, 56), (240, 200, 166)),
          'torso': (TB2, TB1, TB0, TB3),
          'legs': ((112, 80, 54), (80, 56, 40), (54, 38, 30), (146, 108, 72))}
FLETCH = (196, 40, 40)


def crossbow(p, hx, hy, ang, cocked=True, bolt=True, back=7, fwd=7):
    """A crossbow held at the grip (hx, hy) pointing along ang: stock, steel prod, string and bolt. Returns the bolt tip."""
    u = (math.cos(ang), math.sin(ang))
    v = (-u[1], u[0])
    P_ = lambda a_, b_: (hx + u[0] * a_ + v[0] * b_, hy + u[1] * a_ + v[1] * b_)
    p.l(*P_(-back, 1), *P_(fwd, 0), W1, 2)                                         # stock
    p.l(*P_(-back, 0), *P_(fwd, 0), W3)
    p.l(*P_(-back, 1), *P_(-back + 2, 1), W1)                                      # butt
    p.l(*P_(0, 1), *P_(1, 3), W1)                                                  # trigger / grip
    px_ = fwd - 1
    for s_ in (-1, 1):                                                             # the prod, its tips swept back
        p.lines([P_(px_, 0), P_(px_ - 0.5, s_ * 3), P_(px_ - 2, s_ * 5)], I2, 1)
        p.p(*P_(px_ - 2, s_ * 5), M3)
    p.p(*P_(px_, -1), M3)
    nut = 1 if cocked else px_ - 1.5
    for s_ in (-1, 1):
        p.l(*P_(px_ - 2, s_ * 5), *P_(nut, 0), (214, 206, 184))
    tip = P_(fwd + 3, -1)
    if bolt:
        p.l(*P_(nut, -1), *P_(fwd + 2, -1), M2)
        p.p(*tip, M3)
        p.p(*P_(nut, -2), FLETCH); p.p(*P_(nut + 1, -2), FLETCH)
    return tip


def kettle_hat(p, hx, hy, tilt=0.0):
    p.e(hx - 5, hy - 11, hx + 4, hy - 3, I2)                                       # dome
    p.e(hx - 4, hy - 10, hx + 1, hy - 6, I3)
    p.p(hx - 2, hy - 9, M3)
    p.l(hx - 8, hy - 3 + tilt, hx + 7, hy - 3 - tilt, I1, 2)                       # broad brim
    p.l(hx - 8, hy - 4 + tilt, hx + 7, hy - 4 - tilt, M1)
    p.l(hx - 1, hy - 11, hx - 1, hy - 4, I1)                                       # ridge


def quiver(p, x, y):
    p.l(x, y, x - 3, y + 9, (86, 56, 36), 3)
    p.l(x + 1, y, x - 2, y + 9, (126, 86, 54))
    p.l(x - 1, y + 3, x - 2, y + 4, (60, 40, 28))
    for k in range(3):                                                             # bolt fletchings sticking out
        p.p(x + k - 1, y - 1 - (k % 2), FLETCH)
        p.p(x + k - 1, y, M2)


def crossbowman_cell(f, feet, cx, phase=0.0, cb=None, dx=0, dy=0, fl=None, eyes=1, hat=True, quiv=True, extra=None):
    g, hc = dress(f, CB_PAL, eye=(40, 30, 30) if eyes == 1 else (255, 230, 120) if eyes == 2 else (90, 60, 50))
    if hc is None:
        return Image.new('RGBA', (64, 64))
    hx, hy = hc
    p = Pic(64, 64)
    a = mask_of(g)
    if quiv:
        bx = back_x(g, hy + 7)
        if bx is not None:
            quiver(p, bx + 1, hy + 5)
    p.paste(g, 0, 0)
    for y in range(int(hy) + 6, int(hy) + 15):                                     # gold edge of the tabard and a cross on it
        xs = np.nonzero(a[y])[0]
        if len(xs) >= 3:
            p.p(xs.max() - 1, y, AU2)
            if y in (int(hy) + 9, int(hy) + 10, int(hy) + 11):
                p.p((xs.min() + xs.max()) // 2 + 1, y, AU3)
    y = int(hy) + 10
    xs = np.nonzero(a[y])[0]
    if len(xs) >= 3:
        m_ = (xs.min() + xs.max()) // 2 + 1
        p.l(m_ - 1, y, m_ + 1, y, AU3)
    yb = int(hy) + 14
    xs = np.nonzero(a[min(63, yb)])[0]
    if len(xs) >= 3:
        p.l(xs.min(), yb, xs.max(), yb, (60, 40, 28))
        p.p(xs.max() - 2, yb, AU3)
        for y in (yb + 1, yb + 2, yb + 3):                                         # tabard skirt with a gold hem
            p.l(xs.min(), y, xs.max(), y, TB1 if y < yb + 3 else AU2)
            p.p(xs.min(), y, TB0)
    if hat:
        kettle_hat(p, hx, hy)
    if extra:
        extra(p)
    if cb:
        crossbow(p, *cb)
    im = cell_of(outline_same(p.im), feet, cx, dx, dy)
    if fl:
        im = flash(im, fl)
    return im


@builder('crossbowman')
def make_crossbowman():
    idle, walk, pi, hit, de = body_src('Idle'), body_src('Walk'), body_src('Pierce'), body_src('Hit'), body_src('Death')
    feet = max(f.getbbox()[3] - 1 for f in idle)
    b = idle[0].getbbox()
    cx = (b[0] + b[2]) // 2
    C = crossbowman_cell

    def low(f, ang=0.45, rows=(14, 22)):          # carried at the hip, pointing at the floor ahead
        gs = strip_tool(f)
        hx, hy = front_hand(gs, gs.getbbox()[1], rows)
        return (hx, hy, ang)
    save_enemy('crossbowman', 'idle', [C(f, feet, cx, phase=i, cb=low(f)) for i, f in enumerate(idle)], 64)
    save_enemy('crossbowman', 'movement', [C(f, feet, cx, phase=i, cb=low(f, 0.35), dy=(0, 1, 0, 0, 1, 0)[i])
                                           for i, f in enumerate(walk)], 64)
    # attack: raised to the shoulder, aimed, loosed (the bolt streaks off to the right), then cranked and reloaded
    att = []
    plan = ((0, 0.25, True, True, 0, 1), (1, 0.05, True, True, 0, 2), (2, 0.0, True, True, 0, 2), (2, -0.04, False, False, -2, 2),
            (2, 0.1, False, False, -1, 1), (7, 0.8, False, False, 0, 1), (7, 0.6, True, True, 0, 1))
    for k, (i, ang, cocked, bolt, dx, eyes) in enumerate(plan):
        f = pi[i]
        gs = strip_tool(f)
        hx, hy = front_hand(gs, gs.getbbox()[1], (12, 19))

        def fx(p, k=k, hx=hx, hy=hy):
            if k == 3:                                                             # the bolt flies off with a streak
                y = hy - 1
                p.l(hx + 14, y, 63, y, M3)
                p.l(hx + 12, y + 1, hx + 30, y + 1, (200, 200, 210))
                for s_ in (-1, 1):                                                 # the string's twang
                    p.p(hx + 7, hy + s_ * 7, WHITE)
            if k == 5:                                                             # a fresh bolt in the off hand
                p.l(hx - 2, hy - 6, hx + 4, hy - 3, M2); p.p(hx - 2, hy - 6, FLETCH)
        att.append(C(f, feet, cx, phase=k, cb=(hx, hy, ang, cocked, bolt), dx=dx, eyes=eyes, extra=fx))
    save_enemy('crossbowman', 'attack', att, 64)
    save_enemy('crossbowman', 'take_damage', [C(f, feet, cx, phase=i, cb=low(f, 0.7), dx=-1 - (i == 0), eyes=2,
                                                fl=(255, 255, 255) if i == 0 else None) for i, f in enumerate(hit)], 64)
    dfr = []
    for i, f in enumerate(de):                    # the kettle hat rolls off, the crossbow clatters down
        c = C(f, feet, cx, phase=i, eyes=1 if i < 3 else 0, hat=i < 3, cb=low(f, 0.9 + i * 0.3) if i < 2 else None)
        p = Pic(64, 64)
        if i >= 2:
            crossbow(p, 12, 55, 0.0, False, False)
        if i >= 3:
            hp = Pic(20, 14); kettle_hat(hp, 10, 13)
            p.paste(hp.im.rotate(-15 - min(i, 6) * 6, resample=Image.NEAREST, center=(10, 8)), 32 + min(i, 6) * 2, 45)
        dfr.append(cut_below(on(outline_same(p.im), c), 57) if i >= 2 else c)
    save_enemy('crossbowman', 'death', dfr, 64)



# ================================================================== BURROWER (drawn, 64x64: a hulking blind cave mole with spade claws)
FUR = ((34, 28, 36), (58, 48, 56), (88, 74, 80), (124, 108, 108))
FURD = ((24, 20, 26), (42, 34, 42), (64, 54, 60), (92, 80, 84))
PINK = ((130, 70, 80), (190, 118, 118), (232, 170, 160))
CLAW0, CLAW1 = (160, 150, 128), (232, 226, 200)


def spade_claws(p, x, y, ang, ln=6, spread=0.35, curl=0.6):
    """Three long curved digging claws from a paw at (x, y) pointing along ang."""
    for k in (-1, 0, 1):
        a = ang + k * spread
        pts = []
        for j in range(5):
            t = j / 4
            aa = a + curl * t * t
            pts.append((x + math.cos(aa) * ln * t + math.cos(a + 1.57) * k * 1.2, y + math.sin(aa) * ln * t + math.sin(a + 1.57) * k * 1.2))
        p.lines(pts, CLAW0, 2 if k == 0 else 1)
        p.lines(pts[1:], CLAW1)


def burrower_limb(p, sx, sy, ang, ln, pal, claw=True, cl=6):
    ex, ey = sx + math.cos(ang) * ln, sy + math.sin(ang) * ln
    p.l(sx, sy, ex, ey, pal[1], 5)
    p.l(sx, sy - 1, ex, ey - 1, pal[2], 2)
    p.e(ex - 3, ey - 2.5, ex + 3, ey + 2.5, PINK[0] if pal is FUR else dark(PINK[0], 0.75))
    p.e(ex - 2, ey - 2, ex + 2, ey + 1, PINK[1] if pal is FUR else PINK[0])
    if claw:
        spade_claws(p, ex + math.cos(ang) * 2, ey + math.sin(ang) * 2, ang + 0.2, cl)
    return ex, ey


def burrower_raw(t=0.0, bob=0, lean=0.0, arm=1.0, farm=1.1, mouth=0, eyes=1, dx=0, hump=0.0, curl=0.0):
    """Side view facing right, not outlined. arm/farm: angles (radians, 0 = forward, + = down) of the near/far claw arm."""
    p = Pic(64, 64)
    cx, cy = 26 + dx, 40 + bob
    br = math.sin(t * math.tau) * 0.6
    burrower_limb(p, cx + 4, cy + 1, farm, 10, FURD, cl=5)                       # far arm
    p.l(cx - 11, cy + 6, cx - 12, 56, FURD[1], 4)                                # far hind leg
    puff(p, cx - 9, cy + 1, 10 + br * 0.3, FUR)                                  # haunch
    puff(p, cx + 1, cy - 4 - hump, 13 + br, FUR)                                 # the great hunched back
    p.e(cx - 6, cy + 2, cx + 10, cy + 13, FUR[2])                                # belly
    p.e(cx - 4, cy + 5, cx + 8, cy + 13, (148, 128, 124))
    for k in range(5):                                                           # bristles along the spine
        a = math.pi * (1.1 + k * 0.17)
        x, y = cx + 1 + math.cos(a) * (12 + br), cy - 4 - hump + math.sin(a) * (12 + br)
        p.l(x, y, x - 2 + k * 0.5, y - 2, FUR[0])
    p.l(cx - 13, cy + 6, cx - 12, 56, FUR[1], 4)                                 # near hind leg and foot
    p.l(cx - 15, 56, cx - 9, 56, FUR[0], 2)
    for k in range(3):
        p.p(cx - 8 + k * 0, 56 - k, CLAW1) if k == 0 else None
    hx, hy = cx + 14 + lean, cy + 1 + curl * 2                                   # head low in front of the hump
    p.e(hx - 6, hy - 6, hx + 6, hy + 5, FUR[1])
    p.e(hx - 5, hy - 6, hx + 4, hy + 1, FUR[2])
    p.poly([(hx + 3, hy - 3), (hx + 11, hy), (hx + 11, hy + 3), (hx + 3, hy + 4)], FUR[2])   # long snout
    p.l(hx + 3, hy - 3, hx + 10, hy - 1, FUR[3])
    p.e(hx + 9, hy - 1, hx + 13, hy + 3, PINK[1])                                # fleshy nose with star tendrils
    p.p(hx + 12, hy, PINK[2])
    for (ox, oy) in ((14, -1), (14, 2), (13, 4), (12, -2)):
        p.p(hx + ox + (t * 4) % 2 * (oy > 0), hy + oy, PINK[1])
    if mouth:
        p.poly([(hx + 2, hy + 3), (hx + 10, hy + 3), (hx + 8, hy + 4 + mouth * 2), (hx + 2, hy + 4 + mouth)], (40, 12, 20))
        for x in range(int(hx) + 3, int(hx) + 10, 2):
            p.p(x, hy + 3, CLAW1)
        p.p(hx + 4, hy + 4 + mouth, CLAW1); p.p(hx + 7, hy + 4 + mouth, CLAW1)
    else:
        p.l(hx + 2, hy + 4, hx + 9, hy + 3, FUR[0])
        p.p(hx + 5, hy + 4, CLAW1)
    ec = (255, 220, 120) if eyes == 1 else (255, 90, 60) if eyes == 2 else FUR[0]
    p.p(hx + 2, hy - 2, ec)                                                      # tiny milky eye
    if eyes:
        p.p(hx + 1, hy - 2, (150, 130, 90) if eyes == 1 else (160, 40, 40))
    burrower_limb(p, cx + 6, cy + 3, arm, 11, FUR, cl=7)                         # near arm with the big claws
    return p.im


def burrower_frame(rise=1.0, roll=0.0, fl=None, mound=None, debris=0, seed=0, hole=0, belly_up=False, **kw):
    """rise (0..1): how far it has broken out of the ground (the rest is cut away under the floor and hidden by the
    torn-up earth); roll: degrees it keels over (death); mound = (cx, w, h, cracks): an earth heap drawn over it."""
    im = burrower_raw(**kw)
    if roll:
        im = ground(im.rotate(roll, resample=Image.NEAREST, center=(26, 57)), 57)
    if belly_up:                                                                 # dead on its back, claws in the air
        im = ground(squash(im.transpose(Image.FLIP_TOP_BOTTOM), 0.8, 63), 57)
    if rise < 1.0:
        im = shift(im, 0, int(round((1 - rise) * 34)))
    a = np.array(im); a[58:] = 0; im = Image.fromarray(a)
    p = Pic(64, 64)
    p.paste(outline_same(im), 0, 0)
    if hole:                                                                     # the torn ground round the hole
        q = Pic(64, 64)
        dirt_mound(q, 15, 16, 5, seed + 3, stones=False)
        dirt_mound(q, 46, 18, 6, seed + 4)
        dirt_mound(q, 31, 30, 2, seed + 5, stones=False)
        p.paste(outline_same(q.im), 0, 0)
    if mound:
        q = Pic(64, 64)
        dirt_mound(q, *mound[:3], seed, cracks=mound[3] if len(mound) > 3 else 0.0)
        p.paste(outline_same(q.im), 0, 0)
    if debris:
        q = Pic(64, 64)
        clods(q, 32, 46, debris, seed + 7, 18, 26)
        p.paste(outline_same(q.im), 0, 0)
    im = cut_below(p.im, 57)
    if fl:
        im = flash(im, fl)
    return im


@builder('burrower')
def make_burrower():
    B = burrower_frame
    save_enemy('burrower', 'idle', [B(t=i / 4, bob=(0, 0, 1, 1)[i], arm=1.0 + (0, 0.1, 0.15, 0.05)[i], mouth=i == 2) for i in range(4)], 64)
    # movement: only a heap of earth travelling under the floor, clods flicked off behind it, claw tips breaking through
    mv = []
    for i in range(6):
        q = Pic(64, 64)
        mx = 30 + (0, 1, 2, 3, 2, 1)[i]
        dirt_mound(q, mx, 26 + (i % 2) * 2, 8 + (0, 1, 2, 1, 0, 1)[i], 40 + i)
        if i in (1, 2, 4):                                                       # the claws scrape through the crest
            spade_claws(q, mx + 9, 50 - (i == 2), -0.9, 4, 0.4, 0.4)
        clods(q, mx - 14, 50, 3 + i % 2, 60 + i, 4, 8)
        mv.append(cut_below(outline_same(q.im), 57))
    save_enemy('burrower', 'movement', mv, 64)
    att = [B(rise=0.0, mound=(30, 28, 11, 0.3), seed=1, debris=2),
           B(rise=0.0, mound=(30, 30, 13, 0.9), seed=2, debris=6),
           B(rise=0.55, arm=-1.3, farm=-1.0, mouth=2, eyes=2, hole=1, debris=12, seed=3),
           B(rise=1.0, arm=-1.5, farm=-1.2, mouth=2, eyes=2, lean=1, hump=2, hole=1, debris=6, seed=4),
           B(rise=1.0, arm=0.2, farm=-0.6, mouth=1, eyes=2, lean=3, hole=1, seed=5),
           B(rise=1.0, arm=0.9, farm=0.4, mouth=1, eyes=2, lean=2, hole=1, debris=4, seed=6),
           B(rise=1.0, arm=1.0, farm=1.1, hole=1, seed=7)]
    q = Pic(64, 64)                                                              # slash streaks of the swipe
    for k in range(3):
        q.arc(26 + k * 2, 22 + k * 3, 62, 56 - k * 2, 290, 360, WHITE if k == 1 else CLAW1)
    att[4] = on(att[4], q.im)
    save_enemy('burrower', 'attack', att, 64)
    save_enemy('burrower', 'take_damage', [B(dx=-3, eyes=2, mouth=2, arm=0.4, fl=(255, 255, 255)), B(dx=-2, eyes=2, mouth=1, arm=0.7),
                                           B(dx=-1, arm=0.9)], 64)
    save_enemy('burrower', 'death', [B(eyes=2, mouth=2, arm=-0.8, farm=-0.6, hump=1), B(eyes=0, mouth=2, arm=0.2, bob=2, lean=-1),
                                     B(eyes=0, mouth=1, arm=0.8, roll=14, bob=3, curl=1), B(eyes=0, mouth=1, arm=1.2, roll=34, bob=6, curl=1),
                                     B(eyes=0, mouth=1, arm=0.9, farm=0.7, belly_up=True, curl=1, debris=3, seed=9),
                                     B(eyes=0, mouth=1, arm=1.1, farm=0.9, belly_up=True, curl=1)], 64)
    # optional: it digs itself down again (the eruption backwards)
    save_enemy('burrower', 'dig', [B(arm=1.3, farm=1.4, lean=2, debris=4, seed=11), B(rise=0.75, arm=1.5, lean=2, hole=1, debris=8, seed=12),
                                   B(rise=0.4, arm=1.5, hole=1, debris=8, seed=13), B(rise=0.0, mound=(30, 30, 12, 0.6), seed=14, debris=5),
                                   B(rise=0.0, mound=(30, 28, 10, 0.0), seed=15)], 64)



# ================================================================== ROOTLING (drawn, 64x64: a small stump sprite of wood and moss)
RGL0, RGL1, RGL2 = (60, 150, 60), (140, 240, 100), (230, 255, 190)                     # spirit light in its eyes


def root_spike(p, x, base, h, lean=0.0, w=3, pal=(BK0, BK1, BK2, BK3), seed=0, moss=True):
    """A gnarled root bursting up from the floor at x: thick at the base, curling to a point."""
    r2 = random.Random(seed)
    pts = []
    for j in range(h + 1):
        t = j / max(1, h)
        pts.append((x + lean * t * t * h * 0.5 + math.sin(t * 5 + seed) * 0.8, base - j))
    for j in range(len(pts) - 1):
        t = j / max(1, h)
        ww = max(1, round(w * (1 - t) + 0.4))
        x0, y0 = pts[j]
        p.l(x0 - ww / 2, y0, x0 + ww / 2 - 0.5, y0, pal[1])
        p.p(x0 - ww / 2, y0, pal[0])
        if ww >= 2:
            p.p(x0 + ww / 2 - 0.5, y0, pal[2])
    p.p(*pts[-1], pal[3])
    for _ in range(max(1, h // 6)):                                               # little side rootlets
        j = r2.randint(2, max(2, h - 2))
        x0, y0 = pts[min(j, len(pts) - 1)]
        sd = r2.choice((-1, 1))
        p.l(x0, y0, x0 + sd * 2, y0 - 2, pal[1])
    if moss and h > 6:
        x0, y0 = pts[h // 3]
        p.p(x0 - 1, y0, MS2); p.p(x0, y0 - 1, MS3)
    return pts[-1]


def twig_arm(p, sx, sy, ang, ln=7, spread=0.5):
    ex, ey = sx + math.cos(ang) * ln, sy + math.sin(ang) * ln
    p.l(sx, sy, ex, ey, BK1, 2)
    p.l(sx, sy - 1, ex, ey - 1, BK2)
    for k in (-1, 0, 1):                                                          # three twig fingers
        a = ang + k * spread
        p.l(ex, ey, ex + math.cos(a) * 3, ey + math.sin(a) * 3, BK2)
    return ex, ey


def rootling_frame(t=0.0, step=None, bob=0, crouch=0, arm=0.9, farm=1.1, eyes=1, mouth=0, sprout=0.0, dx=0, lean=0.0,
                   fl=None, chips=0, roots=None, collapse=0.0):
    """Side view facing right. roots = list of (x, height) root spikes bursting from the floor in front of it;
    collapse (0..1): it splits and falls apart into a heap of sticks and moss."""
    p = Pic(64, 64)
    cx, by = 27 + dx, 57
    top = by - 22 + bob + crouch
    if collapse < 0.6:
        legs = ((-4, -6), (0, -1), (4, 5))                                         # hip offset, foot offset
        for k, (hx_, fx_) in enumerate(legs):                                     # root legs splayed to the floor
            ph = (step + k * 2.1) if step is not None else 0
            lift = max(0, math.sin(ph)) * 2 if step is not None else 0
            fx = cx + fx_ + (math.cos(ph) * 2 if step is not None else 0)
            p.lines([(cx + hx_, by - 7 + crouch), (cx + hx_ + (fx - cx - hx_) * 0.5, by - 3 - lift), (fx, by - lift)],
                    BK1 if k != 1 else BK0, 2)
            p.l(fx, by - lift, fx + 2, by - lift, BK0)
        twig_arm(p, cx - 2, top + 11, math.pi - farm if farm > 0 else farm, 6)       # far arm
        body = [(cx - 6, by - 6 + crouch), (cx - 7, top + 8), (cx - 6, top + 3), (cx - 3, top), (cx + 3, top), (cx + 6, top + 3),
                (cx + 7, top + 9), (cx + 6, by - 6 + crouch)]
        if lean:
            body = [(x + lean * (by - y) / 22, y) for x, y in body]
        p.poly(body, BK1)
        for k in range(4):                                                        # bark grain
            x = cx - 4 + k * 2.5 + lean * 0.3
            p.l(x, top + 4 + (k % 2) * 2, x + 0.5, by - 8 + crouch, BK0 if k % 2 else BK2)
        p.l(cx + 6 + lean * 0.4, top + 4, cx + 6, by - 7 + crouch, BK3)
        ox = lean * 0.6                                                           # face: knot-hole eyes and mouth
        fy = top + 8
        for ex_ in (cx + 1 + ox, cx + 5 + ox):
            p.e(ex_ - 1, fy - 1, ex_ + 1, fy + 1, (20, 12, 10))
            if eyes:
                p.p(ex_, fy, RGL1 if eyes == 1 else RGL2)
                if eyes == 2:
                    p.p(ex_ + 1, fy - 1, RGL1)
        if mouth:
            p.e(cx + 1 + ox, fy + 4, cx + 5 + ox, fy + 5 + mouth, (20, 12, 10))
        else:
            p.l(cx + 2 + ox, fy + 4, cx + 5 + ox, fy + 5, (20, 12, 10))
        for (mx, my, r_) in ((-4, 0, 3.5), (0, -1, 4), (4, 0, 3)):                 # mossy cap
            puff(p, cx + mx + lean * 0.9, top + my + 1, r_, (MS0, MS1, MS2, MS3))
        sx = cx + 1 + lean
        sw = math.sin(t * math.tau) * 1.2 + sprout
        p.lines([(sx, top - 2), (sx + sw * 0.5, top - 5), (sx + sw, top - 7)], MS1)   # sprout with two leaves
        p.e(sx + sw - 3, top - 9, sx + sw, top - 7, MS2); p.e(sx + sw, top - 10, sx + sw + 3, top - 8, MS3)
        twig_arm(p, cx + 3 + lean * 0.5, top + 11, arm, 7)                         # near arm
    if collapse:
        r2 = random.Random(5)
        n = int(3 + collapse * 6)
        for k in range(n):                                                        # split logs and sticks on the floor
            x = cx - 12 + k * 3.5 * collapse + r2.uniform(-1, 1)
            y = by - 1 - (k % 2) - (1 - collapse) * r2.uniform(0, 8)
            a = r2.uniform(-0.6, 0.6)
            p.l(x, y, x + math.cos(a) * 6, y + math.sin(a) * 2, BK1, 2)
            p.l(x, y - 1, x + math.cos(a) * 6, y + math.sin(a) * 2 - 1, BK2)
        puff(p, cx + 2, by - 2, 3 + collapse * 2, (MS0, MS1, MS2, MS3))
        puff(p, cx - 7, by - 1, 2 + collapse, (MS0, MS1, MS2, MS3))
        if collapse < 1:
            for k in range(2):
                p.p(cx + 2 + k * 4, by - 10 * (1 - collapse) - 3, RGL1 if collapse < 0.7 else RGL0)
    if chips:
        r2 = random.Random(chips)
        for _ in range(4):
            x, y = cx + r2.randint(-8, 8), top + r2.randint(0, 14)
            p.r(x, y, x + 1, y, BK3); p.p(x + 1, y + 1, BK2)
    q = Pic(64, 64)
    for k, (x, h) in enumerate(roots or ()):
        root_spike(q, x, by, h, (-1) ** k * 0.5, 4 if h > 10 else 3, seed=k + 3)
        clods(q, x, by, 3, 40 + k + h, 3, 4)
    im = outline_same(cut_below(on(p.im, q.im), 57))
    if fl:
        im = flash(im, fl)
    return im


@builder('rootling')
def make_rootling():
    R = rootling_frame
    save_enemy('rootling', 'idle', [R(t=i / 4, bob=(0, 0, 1, 1)[i], arm=0.9 + (0, 0.1, 0.2, 0.1)[i]) for i in range(4)], 64)
    save_enemy('rootling', 'movement', [R(t=i / 6, step=i * math.tau / 6, bob=(0, -1, 0, 0, -1, 0)[i], lean=1, arm=0.6 + (i % 3) * 0.2)
                                        for i in range(6)], 64)
    # attack: it thrusts its twig hands into the ground and roots spear up in front of it, then sink back
    save_enemy('rootling', 'attack', [R(arm=0.2, farm=0.3, eyes=2, mouth=1, sprout=-1),
                                      R(arm=1.3, farm=1.3, crouch=3, eyes=2, mouth=2, lean=2, sprout=1.5, roots=[(41, 5)]),
                                      R(arm=1.4, farm=1.4, crouch=4, eyes=2, mouth=2, lean=2, sprout=2, roots=[(41, 14), (48, 8), (55, 4)]),
                                      R(arm=1.4, farm=1.4, crouch=4, eyes=2, mouth=2, lean=2, sprout=2, roots=[(41, 22), (48, 18), (55, 13), (61, 7)]),
                                      R(arm=1.3, farm=1.3, crouch=3, eyes=2, mouth=1, lean=1, sprout=1, roots=[(41, 17), (48, 21), (55, 18), (61, 12)]),
                                      R(arm=1.0, farm=1.1, crouch=1, eyes=1, roots=[(41, 6), (48, 8), (55, 7), (61, 4)]),
                                      R(arm=0.9)], 64)
    save_enemy('rootling', 'take_damage', [R(dx=-2, eyes=2, mouth=2, chips=1, arm=0.3, fl=(255, 255, 255), sprout=-2),
                                           R(dx=-1, eyes=2, mouth=1, chips=2, arm=0.6, sprout=-1), R(arm=0.9)], 64)
    save_enemy('rootling', 'death', [R(eyes=2, mouth=2, arm=-0.5, farm=-0.5, chips=3, sprout=-2), R(eyes=1, mouth=2, lean=-2, crouch=2, chips=4),
                                     R(eyes=0, lean=-4, crouch=5, collapse=0.3), R(eyes=0, collapse=0.6), R(eyes=0, collapse=0.85),
                                     R(eyes=0, collapse=1.0)], 64)



# ================================================================== TOAD (drawn, 64x64: a giant warty swamp toad)
TD = ((34, 50, 28), (62, 88, 40), (100, 128, 56), (146, 168, 82))
TDB = ((150, 140, 84), (200, 190, 120), (232, 224, 164))                               # belly / throat
TEYE = ((170, 120, 30), (232, 186, 60), (255, 230, 130))
TONG = ((176, 52, 84), (236, 110, 140), (255, 184, 200))
MOUTH_IN = (58, 12, 22)


def tongue(p, x0, y0, x1, y1, w=3, tip=True):
    """The toad's tongue from the mouth (x0, y0) to (x1, y1): a thick pink band with a sticky round tip."""
    p.l(x0, y0, x1, y1, TONG[0], w)
    p.l(x0, y0 - 1, x1, y1 - 1, TONG[1], max(1, w - 2))
    if tip:
        p.e(x1 - 3, y1 - 3, x1 + 2, y1 + 2, TONG[0])
        p.e(x1 - 2, y1 - 3, x1 + 1, y1 + 1, TONG[1])
        p.p(x1 - 1, y1 - 2, TONG[2])


def toad_raw(t=0.0, bob=0, sq=1.0, pouch=0.0, mouth=0.0, tong=0, eyes=1, legs='sit', dx=0, blink=False):
    p = Pic(64, 64)
    cx, cy = 28 + dx, 43 + bob
    rx, ry = 19 * (2 - sq) ** 0.5, 12 * sq
    # far legs
    if legs == 'jump':
        p.lines([(cx - 10, cy + 2), (cx - 18, cy + 10), (cx - 26, cy + 14)], TD[0], 4)
        p.l(cx + 10, cy + 4, cx + 17, cy + 10, TD[0], 3)
    else:
        p.l(cx + 10, cy + 6, cx + 12, 56, TD[0], 3)
    # hind thigh folded at the back
    if legs == 'jump':
        p.lines([(cx - 12, cy + 2), (cx - 20, cy + 8), (cx - 28, cy + 12)], TD[1], 5)
        for k in range(3):
            p.l(cx - 28, cy + 12, cx - 31 - k, cy + 10 + k * 2, TD[1])
    else:
        puff(p, cx - 12, cy + 4, 9, TD)
        p.l(cx - 18, 56, cx - 6, 56, TD[1], 2)                                   # long webbed foot
        for k in range(3):
            p.p(cx - 4 + k * 0, 56 - k * 0, TD[2]) if k == 0 else p.p(cx - 5 + k * 2, 56, TD[0])
    # body
    p.e(cx - rx, cy - ry, cx + rx, cy + ry, TD[0])
    p.e(cx - rx + 1, cy - ry + 1, cx + rx - 1, cy + ry - 1, TD[1])
    p.e(cx - rx + 3, cy - ry + 1, cx + rx * 0.5, cy - ry * 0.2, TD[2])
    p.e(cx - rx * 0.2, cy + ry * 0.1, cx + rx - 2, cy + ry - 1, TDB[0])               # pale belly
    p.e(cx, cy + ry * 0.2, cx + rx - 4, cy + ry - 2, TDB[1])
    r2 = random.Random(4)
    for _ in range(14):                                                           # warts
        a = r2.uniform(math.pi * 0.95, math.pi * 2.05)
        d = r2.uniform(0.45, 0.85)
        x, y = cx + math.cos(a) * rx * d, cy + math.sin(a) * ry * d
        p.p(x, y, TD[0]); p.p(x - 1, y - 1, TD[3])
    # head: broad and flat at the front, wide mouth
    hx, hy = cx + rx - 6, cy - 4
    p.e(hx - 8, hy - 7, hx + 10, hy + 7, TD[1])
    p.e(hx - 7, hy - 7, hx + 6, hy, TD[2])
    if pouch:                                                                     # throat pouch swelling
        r_ = 3 + pouch * 4
        p.e(hx - r_, hy + 5 - r_ * 0.4, hx + r_ + 2, hy + 5 + r_ * 0.9, TDB[0])
        p.e(hx - r_ + 1, hy + 5 - r_ * 0.4 + 1, hx + r_, hy + 5 + r_ * 0.7, TDB[2])
    if mouth:
        o = mouth * 6
        p.poly([(hx - 5, hy + 2), (hx + 10, hy - 1 - o * 0.4), (hx + 10, hy + 2 + o)], MOUTH_IN)
        p.l(hx - 5, hy + 2, hx + 10, hy - 1 - o * 0.4, TD[0])
        p.l(hx - 5, hy + 2, hx + 10, hy + 2 + o, TDB[0])
    else:
        p.l(hx - 6, hy + 2, hx + 9, hy + 1, TD[0])
        p.p(hx + 9, hy, TD[0])
    p.p(hx + 7, hy - 3, TD[0])                                                    # nostril
    if tong:
        tongue(p, hx + 6, hy + 1 + mouth * 2, hx + 6 + tong, hy - 1 + mouth * 2 - tong * 0.05, 3)
    # big bulging eye on top
    ex, ey = hx - 1, hy - 8
    p.e(ex - 5, ey - 4, ex + 4, ey + 4, TD[1])
    p.e(ex - 4, ey - 3, ex + 3, ey + 3, TEYE[0] if eyes else TD[2])
    if eyes and not blink:
        p.e(ex - 3, ey - 3, ex + 2, ey + 2, TEYE[1] if eyes == 1 else (255, 120, 60))
        p.l(ex - 3, ey, ex + 2, ey, (16, 10, 12))                                  # horizontal pupil
        p.p(ex - 2, ey - 2, TEYE[2])
    else:
        p.l(ex - 4, ey, ex + 3, ey, TD[0])
        p.l(ex - 4, ey - 1, ex + 3, ey - 1, TD[2])
    p.l(ex - 4, ey - 4, ex + 3, ey - 4, TD[2])                                     # heavy lid
    # near front leg
    if legs == 'jump':
        p.lines([(cx + 8, cy + 6), (cx + 15, cy + 9), (cx + 20, cy + 8)], TD[1], 3)
    else:
        p.lines([(cx + 11, cy + 3), (cx + 16, cy + 8), (cx + 15, 56)], TD[0], 4)
        p.lines([(cx + 11, cy + 3), (cx + 16, cy + 8), (cx + 15, 55)], TD[2], 2)
        p.l(cx + 13, 56, cx + 19, 56, TD[1], 1)
        p.p(cx + 19, 55, TD[3]); p.p(cx + 17, 56, TD[3])
    return p.im


def toad_frame(fl=None, belly_up=False, splash=0, **kw):
    im = toad_raw(**kw)
    if belly_up:
        im = ground(squash(im.transpose(Image.FLIP_TOP_BOTTOM), 0.75, 63), 57)
    im = cut_below(im, 57)
    if splash:                                                                    # mud and water thrown up on landing
        q = Pic(64, 64)
        clods(q, 30, 57, splash, 77 + splash, 26, 7, ((60, 70, 40), (90, 100, 56), (130, 170, 150)))
        im = on(im, q.im)
    im = outline_same(im)
    if fl:
        im = flash(im, fl)
    return im


@builder('toad')
def make_toad():
    T = toad_frame
    save_enemy('toad', 'idle', [T(t=i / 4, pouch=(0.2, 0.7, 1.0, 0.5)[i], blink=i == 3) for i in range(4)], 64)
    save_enemy('toad', 'movement', [T(sq=0.85, bob=2), T(sq=1.15, bob=-6, legs='jump', dx=2), T(sq=1.1, bob=-12, legs='jump', dx=4),
                                    T(sq=1.0, bob=-8, legs='jump', dx=5), T(sq=0.8, bob=3, dx=6, splash=6), T(sq=0.95, bob=1, dx=6)], 64)
    att = [T(pouch=0.6, eyes=2), T(sq=0.92, bob=1, mouth=0.4, eyes=2), T(mouth=1.0, tong=7, eyes=2), T(mouth=1.0, tong=14, eyes=2),
           T(mouth=0.9, tong=12, eyes=2, dx=1), T(mouth=0.6, tong=5, eyes=1), T(mouth=0.0, pouch=0.4)]
    save_enemy('toad', 'attack', att, 64)
    save_enemy('toad', 'take_damage', [T(dx=-3, eyes=2, mouth=0.5, fl=(255, 255, 255)), T(dx=-2, eyes=2, mouth=0.3, sq=0.95), T(dx=-1)], 64)
    save_enemy('toad', 'death', [T(eyes=2, mouth=1.0, tong=6, sq=1.1, bob=-2), T(eyes=0, mouth=0.8, tong=4, sq=0.85, bob=2),
                                 T(eyes=0, mouth=0.6, sq=1.1, bob=-8, legs='jump'), T(eyes=0, mouth=0.6, legs='jump', belly_up=True, splash=5),
                                 T(eyes=0, mouth=0.4, legs='jump', belly_up=True), T(eyes=0, mouth=0.4, tong=8, legs='jump', belly_up=True)], 64)



# ================================================================== PETS (drawn, 32x32 cells facing right; pup and golem stand on row 28)
wing, talons = P7.wing, P7.talons
RVN = ((20, 18, 30), (40, 40, 62), (72, 76, 108), (124, 132, 176))                  # raven
OWL = ((70, 44, 26), (124, 84, 46), (176, 130, 76), (222, 186, 128))                # tawny owl
OWLD = ((54, 34, 22), (96, 64, 38), (140, 102, 60), (186, 150, 100))
OWLF = ((190, 170, 140), (232, 220, 196), (250, 244, 228))                          # facial disc
FFY = ((20, 22, 28), (44, 46, 58), (76, 80, 96))                                    # firefly shell
FGL = ((150, 200, 40), (210, 250, 90), (250, 255, 190))                             # firefly light
WNG = ((110, 150, 190), (160, 200, 232), (220, 240, 255))                           # thin insect wings


def save_pet(pid, state, frames):
    save(cells(frames, 32, 32), G_OUT + f'pet_{pid}_{state}.png', len(frames))


def raven_frame(w=0.5, tilt=0.0, beak=0, dy=0, fold=0.0, eye=1, reach=0.0):
    p = Pic(32, 32)
    cx, cy = 15, 15 + dy
    th = math.radians(-112 - w * 98)
    wing(p, (cx - 1, cy - 2), math.radians(-112 - min(1, w + 0.15) * 98), 7 * (1 - fold * 0.3), (RVN[0], RVN[1], RVN[2], RVN[2]),
         n=5, fold=fold, fsz=0.55, arm=2)
    for k, a in enumerate((2.75, 2.95, 3.15)):                                       # wedge tail
        feather(p, cx - 4, cy + 1, a, 7 - k, 1.6, (RVN[0], RVN[1], RVN[2], RVN[1]))
    p.e(cx - 6, cy - 3, cx + 4, cy + 3, RVN[0])                                       # body
    p.e(cx - 5, cy - 3, cx + 3, cy + 2, RVN[1])
    p.l(cx - 4, cy - 2, cx + 2, cy - 2, RVN[2])
    hx, hy = cx + 5, cy - 3
    p.e(hx - 3, hy - 3, hx + 2, hy + 2, RVN[1])
    p.p(hx - 1, hy - 2, RVN[3])
    p.poly([(hx + 2, hy - 1), (hx + 6, hy), (hx + 2, hy + 1)], (60, 58, 70))          # heavy beak
    p.l(hx + 2, hy - 1, hx + 5, hy - 1, (110, 108, 120))
    if beak:
        p.poly([(hx + 2, hy + 1), (hx + 5, hy + 3), (hx + 2, hy + 2)], (60, 58, 70))
    p.p(hx, hy - 1, (240, 220, 140) if eye == 1 else (255, 90, 60))
    fx, fy = cx + 1 + reach * 4, cy + 4 + (1 - reach) * 1
    p.l(cx, cy + 2, fx, fy, (70, 66, 74)); p.p(fx + 1, fy, (90, 86, 94))              # feet
    wing(p, (cx + 1, cy - 2), th, 9 * (1 - fold * 0.3), RVN, n=5, fold=fold, fsz=0.6, arm=2)
    im = p.im
    if tilt:
        im = im.rotate(tilt, resample=Image.NEAREST, center=(cx, cy))
    return outline_same(im)


def owl_frame(w=0.5, tilt=0.0, dy=0, fold=0.0, eye=1, reach=0.0, blink=False):
    p = Pic(32, 32)
    cx, cy = 14, 15 + dy
    th = math.radians(-112 - w * 98)
    wing(p, (cx - 1, cy - 3), math.radians(-112 - min(1, w + 0.15) * 98), 8 * (1 - fold * 0.3), OWLD, n=5, fold=fold, fsz=0.6, arm=2)
    for k, a in enumerate((2.6, 2.85)):
        feather(p, cx - 4, cy + 3, a, 5, 1.8, OWLD)
    p.e(cx - 6, cy - 4, cx + 5, cy + 6, OWL[0])                                        # round body
    p.e(cx - 5, cy - 3, cx + 4, cy + 5, OWL[1])
    p.e(cx - 2, cy - 1, cx + 4, cy + 5, OWL[3])                                        # pale barred breast
    for y in (cy + 1, cy + 3):
        p.l(cx - 1, y, cx + 3, y, OWL[2])
    fx, fy = cx + 1 + reach * 5, cy + 6 + (1 - reach)
    p.l(cx, cy + 5, fx, fy, P7.LEG1, 2)
    talons(p, fx, fy, -0.2 + reach * 0.4 if reach else 1.2, reach)
    hx, hy = cx + 3, cy - 6                                                          # big head, facing us three-quarter right
    p.e(hx - 6, hy - 5, hx + 5, hy + 4, OWL[1])
    p.poly([(hx - 5, hy - 3), (hx - 6, hy - 8), (hx - 3, hy - 4)], OWL[1])             # ear tufts
    p.poly([(hx + 2, hy - 4), (hx + 4, hy - 8), (hx + 5, hy - 3)], OWL[2])
    p.e(hx - 4, hy - 3, hx + 1, hy + 3, OWLF[1]); p.e(hx, hy - 3, hx + 5, hy + 3, OWLF[1])   # facial disc, two lobes
    p.l(hx + 0.5, hy - 3, hx + 0.5, hy + 1, OWLF[0])
    for ex in (hx - 2, hx + 3):
        if eye and not blink:
            p.e(ex - 1.5, hy - 1.5, ex + 1.5, hy + 1.5, (250, 150, 30) if eye == 1 else (255, 230, 90))
            p.p(ex, hy, (14, 10, 10))
            p.p(ex - 1, hy - 1, WHITE)
        else:
            p.l(ex - 1, hy, ex + 1, hy, OWL[0])
    p.poly([(hx, hy + 1), (hx + 2, hy + 1), (hx + 1, hy + 4)], (70, 60, 50))            # hooked beak
    wing(p, (cx + 1, cy - 2), th, 10 * (1 - fold * 0.3), OWL, n=5, fold=fold, fsz=0.65, arm=2)
    im = p.im
    if tilt:
        im = im.rotate(tilt, resample=Image.NEAREST, center=(cx, cy))
    return outline_same(im)


def lantern_pet(k=0, bob=0, tilt=0.0, mood=0, flare=0.0):
    """A floating lantern with a little face on its glass; mood 1 = angry, flare (0..1) = the flame bursts out."""
    p = Pic(32, 32)
    cx, top = 16, 6 + bob
    p.eo(cx - 3, top - 4, cx + 3, top + 1, I2)                                         # ring handle
    p.r(cx - 6, top + 1, cx + 6, top + 2, I1); p.l(cx - 5, top, cx + 5, top, I2)        # cap
    p.r(cx - 6, top + 3, cx + 6, top + 15, LANT0)                                      # glass
    p.r(cx - 5, top + 4, cx + 5, top + 14, LANT1)
    p.r(cx - 3, top + 5, cx + 3, top + 12, LANT2 if flare < 0.5 else WHITE)
    for x in (cx - 6, cx + 6):
        p.l(x, top + 3, x, top + 15, I1)                                               # frame
    p.r(cx - 6, top + 16, cx + 6, top + 17, I1); p.r(cx - 4, top + 18, cx + 4, top + 18, I0)
    ey = top + 8
    for ex in (cx - 2, cx + 3):                                                        # the face on the glass
        p.r(ex - 1 if mood else ex, ey, ex, ey + 1, (90, 40, 20))
        if mood:
            p.l(ex - 2, ey - 2 + (ex > cx), ex + 1, ey - 1 - (ex > cx) * 0 + (ex < cx) * 0, (90, 40, 20))
    if mood:
        p.e(cx - 1, ey + 3, cx + 2, ey + 5, (90, 40, 20))
    else:
        p.arc(cx - 2, ey + 1, cx + 3, ey + 4, 20, 160, (90, 40, 20))
        p.p(cx - 4, ey + 3, (255, 150, 90)); p.p(cx + 5, ey + 3, (255, 150, 90))          # glowing cheeks
    if flare:                                                                          # flame bursting from the top
        h = int(3 + flare * 6)
        for j in range(h):
            w_ = max(0, (h - j) // 2)
            p.l(cx - w_ + math.sin(j + k) * 0.6, top - 1 - j, cx + w_ + math.sin(j + k) * 0.6, top - 1 - j,
                (F3, F2, F1, F0)[min(3, j * 4 // h)])
    im = p.im
    if tilt:
        im = im.rotate(tilt, resample=Image.NEAREST, center=(cx, top))
    im = outline_same(im)
    q = Pic(32, 32)                                                                    # drifting sparks (not outlined)
    r2 = random.Random(k * 7 + int(flare * 10))
    for _ in range(2 + int(flare * 6)):
        a = r2.uniform(0, math.tau); d = r2.uniform(9, 13 + flare * 3)
        q.p(cx + math.cos(a) * d, top + 9 + math.sin(a) * d * 0.9, r2.choice((LANT1, LANT2, F2)))
    return on(q.im, im)


def firefly_frame(k=0, dy=0, tilt=0.0, flash_=0.0, wing_=0):
    p = Pic(32, 32)
    cx, cy = 15, 15 + dy
    # glowing abdomen at the back, thorax and head to the right
    r_ = 5 + flash_ * 1.5
    p.e(cx - 10, cy - 3, cx - 10 + r_ * 2, cy + 5, FGL[0])
    p.e(cx - 9, cy - 2, cx - 11 + r_ * 2, cy + 4, FGL[1] if flash_ < 0.5 else FGL[2])
    p.e(cx - 8, cy - 1, cx - 13 + r_ * 2, cy + 2, FGL[2] if flash_ < 0.5 else WHITE)
    for x in (cx - 7, cx - 4):
        p.l(x, cy - 2, x, cy + 4, FGL[0])                                              # segments
    p.e(cx - 1, cy - 3, cx + 5, cy + 3, FFY[1])                                        # thorax
    p.l(cx, cy - 2, cx + 4, cy - 2, FFY[2])
    p.e(cx + 1, cy - 4, cx + 6, cy - 1, (196, 60, 40)); p.p(cx + 3, cy - 3, (240, 120, 80))   # red pronotum shield
    p.e(cx + 5, cy - 1, cx + 8, cy + 2, FFY[0])                                        # head
    p.p(cx + 7, cy, (230, 230, 240))
    p.lines([(cx + 7, cy - 1), (cx + 9, cy - 5), (cx + 11, cy - 6)], FFY[2])           # antennae
    p.lines([(cx + 6, cy - 1), (cx + 7, cy - 5), (cx + 9, cy - 7)], FFY[1])
    for j in range(3):                                                                 # legs
        p.l(cx + j * 2, cy + 3, cx + j * 2 + 1, cy + 5, FFY[1])
    # wings: two pale membranes, beating
    wa = (-2.2, -1.6, -1.0, -1.6)[wing_ % 4]
    for off, c in ((0.3, WNG[0]), (0.0, WNG[1])):
        a = wa + off
        x1, y1 = cx + math.cos(a) * 8, cy - 3 + math.sin(a) * 8
        p.poly([(cx + 1, cy - 3), (x1 - 2, y1), (x1 + 1, y1 + 2), (cx + 3, cy - 2)], c)
        p.l(cx + 1, cy - 3, x1 - 1, y1 + 1, WNG[2])
    im = p.im
    if tilt:
        im = im.rotate(tilt, resample=Image.NEAREST, center=(cx, cy))
    im = outline_same(im)
    q = Pic(32, 32)                                                                    # light motes / the blinding burst
    lx, ly = cx - 6, cy + 1
    if flash_:
        for j in range(8):
            a = j / 8 * math.tau + 0.2
            r0, r1 = 8 + flash_ * 2, 10 + flash_ * 5
            q.l(lx + math.cos(a) * r0, ly + math.sin(a) * r0, lx + math.cos(a) * r1, ly + math.sin(a) * r1, FGL[2] if j % 2 else WHITE)
    else:
        r2 = random.Random(k + 3)
        for _ in range(4):
            a = r2.uniform(0, math.tau); d = r2.uniform(8, 12)
            q.p(lx + math.cos(a) * d, ly + math.sin(a) * d, r2.choice(FGL))
    return on(q.im, im)


GOLEM = (S0, S1, S2, S3, S4)
RUNE0, RUNE1, RUNE2 = (40, 120, 200), (110, 200, 255), (220, 250, 255)


def minigolem_frame(step=None, bob=0, arms=0.0, slam=0.0, rune=1, eyes=1, dust=0, lean=0.0):
    """A knee-high stone golem: boulder body, pebble head, big fists; arms 0 down .. 1 raised; slam: fists on the floor."""
    p = Pic(32, 32)
    cx, by = 14, 28
    top = 10 + bob + slam * 3
    for k, (lx, side) in enumerate(((-4, 0), (3, 1))):                                # stubby legs
        ph = (step + k * math.pi) if step is not None else 0
        lift = max(0, math.sin(ph)) * 2 if step is not None else 0
        sx = math.cos(ph) * 1.5 if step is not None else 0
        c = GOLEM[1] if side == 0 else GOLEM[2]
        p.r(cx + lx + sx - 2, by - 5 - lift, cx + lx + sx + 2, by - lift, c)
        p.l(cx + lx + sx - 2, by - lift, cx + lx + sx + 2, by - lift, GOLEM[0])
    def arm(side, ax):
        c = GOLEM[1] if side == 0 else GOLEM[3]
        sx_, sy_ = cx + (-6 if side == 0 else 6) + lean, top + 6
        if slam:
            ex, ey = cx + 9 + (side * 2) + lean, by - 2
        else:
            ex, ey = sx_ + 2 + ax * 3, sy_ + 8 - ax * 16
        p.l(sx_, sy_, ex, ey, c, 3)
        p.e(ex - 3, ey - 3, ex + 3, ey + 3, GOLEM[0 if side == 0 else 1])                 # fist
        p.e(ex - 2, ey - 3, ex + 2, ey + 1, GOLEM[2 if side == 0 else 3])
    arm(0, arms)
    p.e(cx - 8 + lean, top + 2, cx + 8 + lean, by - 3, GOLEM[1])                       # boulder body
    p.e(cx - 7 + lean, top + 3, cx + 6 + lean, by - 5, GOLEM[2])
    p.e(cx - 5 + lean, top + 3, cx + 2 + lean, top + 8, GOLEM[3])
    p.l(cx - 4 + lean, by - 6, cx + 1 + lean, top + 9, GOLEM[1])                        # a crack
    puff(p, cx - 5 + lean, top + 3, 2.5, (MS0, MS1, MS2, MS3))                         # moss on the shoulder
    rc = (RUNE0, RUNE1, RUNE2)[min(2, rune)] if rune else GOLEM[1]
    rx_, ry_ = cx + 3 + lean, top + 10                                                 # chest rune
    p.ps([(rx_, ry_ - 2), (rx_ - 1, ry_ - 1), (rx_ + 1, ry_ - 1), (rx_ - 2, ry_), (rx_ + 2, ry_), (rx_ - 1, ry_ + 1), (rx_ + 1, ry_ + 1),
          (rx_, ry_ + 2)], rc)
    p.p(rx_, ry_, RUNE2 if rune else GOLEM[0])
    hx, hy = cx + 4 + lean * 1.3, top
    p.e(hx - 4, hy - 4, hx + 4, hy + 3, GOLEM[2])                                      # pebble head
    p.e(hx - 3, hy - 4, hx + 2, hy, GOLEM[3])
    p.l(hx - 1, hy - 1, hx + 4, hy - 2, GOLEM[0])                                      # brow
    ec = RUNE1 if eyes == 1 else RUNE2 if eyes == 2 else GOLEM[0]
    p.p(hx + 1, hy, ec); p.p(hx + 3, hy, ec)
    arm(1, arms)
    im = p.im
    if dust:
        q = Pic(32, 32)
        for k in range(dust):
            x = cx + 10 + (k - dust / 2) * 3
            puff(q, x, by - 1 - (k % 2), 1.5 + (k % 2), (S2, S3, S4, (200, 198, 206)))
        im = on(im, q.im)
    return outline_same(cut_below(im, 28))


@builder('pets')
def make_pets():
    R = raven_frame
    save_pet('raven', 'idle', [R(w=w, dy=d) for w, d in ((0.0, 0), (0.35, 1), (0.75, 1), (0.35, 0))])
    save_pet('raven', 'movement', [R(w=w, tilt=-8, dy=d) for w, d in ((0.0, -1), (0.5, 0), (1.0, 1), (0.5, 0))])
    save_pet('raven', 'attack', [R(w=0.0, fold=0.4, tilt=10, eye=2), R(w=0.1, fold=0.9, tilt=-25, eye=2, dy=1, beak=1),
                                 R(w=0.2, fold=1.0, tilt=-35, eye=2, dy=3, beak=1, reach=1.0), R(w=0.9, tilt=-10, eye=2, dy=2, reach=0.6),
                                 R(w=0.4, dy=0)])
    L = lantern_pet
    save_pet('lantern', 'idle', [L(k=i, bob=(0, 1, 1, 0)[i]) for i in range(4)])
    save_pet('lantern', 'movement', [L(k=i, bob=(0, 1, 0, -1)[i], tilt=(-8, -10, -8, -6)[i]) for i in range(4)])
    save_pet('lantern', 'attack', [L(k=0, mood=1, flare=0.3), L(k=1, mood=1, flare=0.8, bob=-1), L(k=2, mood=1, flare=1.0, bob=-1),
                                   L(k=3, mood=1, flare=0.5)])
    U = P3.pup_frame
    save_pet('pup', 'idle', [U(bob=(0, 0, 1, 1)[i], tail=(0, 1, 2, 1)[i]) for i in range(4)])
    save_pet('pup', 'movement', [U(step=i, bob=(0, -1, 0, -1)[i], tail=1) for i in range(4)])
    save_pet('pup', 'attack', [U(crouch=2, tail=0), U(lunge=3, bob=-2, mouth=1, tail=2), U(lunge=5, bob=-1, mouth=2, tail=2),
                               U(lunge=2, mouth=1, tail=1)])
    Fy = firefly_frame
    save_pet('firefly', 'idle', [Fy(k=i, dy=(0, 1, 1, 0)[i], wing_=i) for i in range(4)])
    save_pet('firefly', 'movement', [Fy(k=i + 4, dy=(0, 1, 0, -1)[i], tilt=-10, wing_=i * 2 + 1) for i in range(4)])
    save_pet('firefly', 'attack', [Fy(k=8, wing_=0, flash_=0.3), Fy(k=9, wing_=2, flash_=1.0), Fy(k=10, wing_=1, flash_=0.7),
                                   Fy(k=11, wing_=3, flash_=0.0)])
    G = minigolem_frame
    save_pet('minigolem', 'idle', [G(bob=(0, 0, 1, 1)[i], rune=(1, 2, 2, 1)[i]) for i in range(4)])
    save_pet('minigolem', 'movement', [G(step=i * math.tau / 6, bob=(0, -1, 0, 0, -1, 0)[i], arms=0.2 * (i % 2), lean=1) for i in range(6)])
    save_pet('minigolem', 'attack', [G(arms=0.6, eyes=2, rune=2), G(arms=1.0, eyes=2, rune=2, bob=-1), G(slam=1.0, eyes=2, rune=2, dust=4, lean=2),
                                     G(slam=0.7, eyes=1, rune=1, dust=2, lean=1), G(arms=0.1)])
    O = owl_frame
    save_pet('owl', 'idle', [O(w=w, dy=d, blink=i == 3) for i, (w, d) in enumerate(((0.0, 0), (0.35, 1), (0.75, 1), (0.35, 0)))])
    save_pet('owl', 'movement', [O(w=w, tilt=-8, dy=d) for w, d in ((0.0, -1), (0.5, 0), (1.0, 1), (0.5, 0))])
    save_pet('owl', 'attack', [O(w=0.0, fold=0.4, eye=2, tilt=8), O(w=0.15, fold=0.9, eye=2, tilt=-20, dy=1, reach=0.5),
                               O(w=0.25, fold=1.0, eye=2, tilt=-15, dy=2, reach=1.0), O(w=0.9, eye=2, dy=1, reach=0.7), O(w=0.4)])



# ================================================================== PROP: LEGEND ALTAR (2 frames: unlit, lit)
strip = P2.strip


def save_prop(name, frames, path=None):
    return save(strip(frames), path or G_OUT + f'prop_{name}.png', len(frames))


def float_sword(p, x, y, lit):
    """A sword hanging point-down in the air over the altar."""
    bl = (M1, M2, M3) if not lit else (AU2, AU3, AU4)
    p.l(x, y, x, y + 11, bl[0], 3)
    p.l(x, y, x, y + 11, bl[1])
    p.l(x - 1, y + 1, x - 1, y + 10, bl[2])
    p.p(x, y + 12, bl[2])
    p.l(x - 4, y - 1, x + 4, y - 1, AU1 if lit else I2, 2)                         # crossguard
    p.p(x - 4, y - 1, (200, 40, 50)); p.p(x + 4, y - 1, (200, 40, 50))
    p.l(x, y - 2, x, y - 6, W2, 2)                                                 # grip
    p.e(x - 1.5, y - 8, x + 1.5, y - 5, AU2 if lit else I3)                        # pommel


def legendaltar(lit):
    p = Pic(34, 44)
    p.r(2, 38, 31, 43, S1); p.r(3, 38, 30, 39, S3); p.l(2, 43, 31, 43, S0)          # stone step
    p.r(6, 26, 27, 38, AU1); p.l(6, 26, 6, 38, AU3); p.l(27, 26, 27, 38, AU0)        # golden altar block
    p.r(8, 28, 25, 36, AU2)
    p.r(4, 23, 29, 26, AU2); p.l(4, 23, 29, 23, AU4); p.l(4, 26, 29, 26, AU0)        # top slab
    for x in (10, 23):                                                             # carved pillars
        p.l(x, 28, x, 36, AU0); p.l(x + 1, 28, x + 1, 36, AU3)
    p.e(14, 29, 19, 34, (120, 20, 30) if not lit else (230, 60, 60))               # ruby set in front
    p.p(15, 30, (255, 170, 170) if lit else (170, 60, 70))
    float_sword(p, 16.5, 7 if lit else 10, lit)
    if lit:                                                                        # rays and sparkles
        p.arc(7, 1, 26, 20, 150, 390, AU3)                                         # a ring of light round the sword
        p.arc(8, 2, 25, 19, 200, 340, AU4)
        sparkles(p, 6, 3, (2, 0, 31, 20))
        p.l(10, 22, 23, 22, AU4)
    else:
        p.l(10, 22, 23, 22, AU0)
    return outline(p.im)


@builder('props')
def make_props():
    save_prop('legendaltar', [legendaltar(False), legendaltar(True)])


# ================================================================== LEGENDARY FIRST-PERSON WEAPONS AND PICKUPS
LEGENDS = {   # base: (name, metal stops, wood/warm stops, accent stops, glow rim, motes)
    'shotgun': ('dragonshotgun', [(0, (36, 8, 10)), (0.35, (110, 22, 18)), (0.7, (196, 60, 28)), (1, (255, 196, 90))],
                [(0, (70, 36, 8)), (0.5, (190, 128, 36)), (1, (255, 232, 140))], None, (230, 80, 20), ((255, 160, 40), (255, 230, 120))),
    'rifle': ('frostrifle', [(0, (12, 24, 54)), (0.4, (40, 90, 150)), (0.75, (120, 190, 232)), (1, (232, 250, 255))],
              [(0, (60, 80, 110)), (0.5, (150, 184, 214)), (1, (240, 250, 255))], None, (70, 170, 240), ((170, 230, 255), WHITE)),
    'pistol': ('soulpistol', [(0, (14, 38, 30)), (0.45, (60, 136, 100)), (0.8, (150, 226, 180)), (1, (232, 255, 240))],
               [(0, (30, 60, 46)), (0.5, (110, 180, 140)), (1, (220, 255, 230))], None, (90, 210, 150), ((170, 255, 200), (235, 255, 240))),
    'staff': ('stormstaff', [(0, (80, 50, 10)), (0.5, (210, 150, 40)), (1, (255, 240, 160))],
              [(0, (70, 40, 10)), (0.45, (176, 118, 30)), (0.8, (236, 190, 70)), (1, (255, 244, 180))],
              [(0, (20, 40, 140)), (0.5, (70, 150, 255)), (0.85, (180, 230, 255)), (1, WHITE)], (60, 140, 255), ((150, 210, 255), (255, 240, 140))),
    'axe': ('bloodaxe', [(0, (20, 2, 6)), (0.4, (70, 8, 14)), (0.75, (132, 22, 28)), (1, (226, 90, 80))],
            [(0, (30, 10, 10)), (0.5, (90, 30, 26)), (1, (170, 80, 60))], None, (170, 10, 20), ((230, 40, 40), (255, 140, 120))),
    'bow': ('moonbow', [(0, (40, 46, 70)), (0.5, (150, 162, 196)), (1, (250, 252, 255))],
            [(0, (40, 46, 70)), (0.45, (130, 144, 184)), (0.8, (206, 216, 240)), (1, (252, 252, 255))],
            [(0, (20, 50, 140)), (0.5, (80, 150, 240)), (1, (200, 236, 255))], (110, 160, 255), ((190, 220, 255), WHITE)),
}


def legend_recolor(im, spec, n, seed=0, motes=True, smooth=False):
    """Recolour an fp/pick strip by material (grey metal, warm wood/leather/flame, blue accents) with gradient maps
    over the original luminance, harden the alpha, then add a 1-px glowing rim and a few motes per frame."""
    _, metal, wood, accent, rim, mote = spec
    a = np.array(im.convert('RGBA')).astype(float)
    alpha = a[:, :, 3] >= 100
    rgb = a[:, :, :3] / 255
    mx, mn = rgb.max(2), rgb.min(2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    lum = rgb @ np.array([0.3, 0.55, 0.15])
    if smooth:                                                                   # calm a noisy render texture (the rifle)
        lum = np.array(Image.fromarray((lum * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3)), float) / 255
    blue = ((rgb[:, :, 2] > rgb[:, :, 0] + 0.08) & (sat > 0.25)) | ((lum > 0.85) & (sat < 0.25))   # gems, magic light
    warm = (sat >= 0.22) & ~blue
    if smooth:                                                                   # and its speckled material map
        cls = np.where(blue, 2, np.where(warm, 1, 0)).astype(np.uint8) * 100
        cls = np.array(Image.fromarray(cls).filter(ImageFilter.MedianFilter(5))) // 100
        blue, warm = cls == 2, cls == 1
    grey = ~warm & ~blue
    out = np.zeros_like(rgb[:, :, :3]) * 255
    for m, stops in ((grey, metal), (warm, wood), (blue, accent or metal)):
        mm = m & alpha
        if not mm.any():
            continue
        hi = max(np.percentile(lum[mm], 98), 0.6)              # no stretch from black: dark parts stay dark
        t = np.clip(lum / hi, 0, 1) ** 0.9
        out[mm] = gmap(t, stops)[mm]
    res = np.zeros(a.shape, np.uint8)
    res[alpha, :3] = np.clip(out[alpha], 0, 255)
    res[alpha, 3] = 255
    H, W = alpha.shape
    fw = W // n
    r2 = random.Random(seed)
    for i in range(n):                                                           # per frame, so nothing bleeds between cells
        m = alpha[:, i * fw:(i + 1) * fw]
        pm = np.pad(m, 1)
        nb = pm[:-2, 1:-1] | pm[2:, 1:-1] | pm[1:-1, :-2] | pm[1:-1, 2:]
        ring = nb & ~m
        sub = res[:, i * fw:(i + 1) * fw]
        sub[ring, :3] = rim
        sub[ring, 3] = 255
        if motes and m.any():
            pm2 = np.pad(nb | m, 3)
            near = np.zeros_like(m)
            for dy in range(-3, 4):
                for dx in range(-3, 4):
                    near |= pm2[3 + dy:3 + dy + H, 3 + dx:3 + dx + fw]
            ys, xs = np.nonzero(near & ~nb & ~m)
            k = min(len(xs), max(3, int(m.sum() ** 0.5 / 3)))
            for j in r2.sample(range(len(xs)), k):
                c = mote[j % 2]
                sub[ys[j], xs[j], :3] = c
                sub[ys[j], xs[j], 3] = 255
    return Image.fromarray(res)


@builder('legend')
def make_legend():
    wf = json.loads(re.search(r'= (\{.*\});', open('retrofps/js/weapons.js').read()).group(1))
    for base, spec in LEGENDS.items():
        n = sum(len(v) for v in wf[base]['states'].values())
        src = Image.open(G_OUT + f'fp_{base}.png')
        assert src.width % n == 0, (base, src.size, n)
        save(legend_recolor(src, spec, n, seed=len(base), smooth=base == 'rifle'), G_OUT + f'fp_{base}_legend.png', n)
        pk = Image.open(G_OUT + f'pick_{base}.png')
        save(legend_recolor(pk, spec, 1, seed=3, motes=False), G_OUT + f'pick_{base}_legend.png')


# ================================================================== PARTICLES, HUD ICON, TOUCH ICON
@builder('particles')
def make_particles():
    p = Pic(7, 5)                                                                # one chain link (tile it along the chain)
    p.eo(0, 0, 6, 4, I2); p.l(1, 0, 4, 0, M3); p.p(5, 1, M2); p.l(2, 4, 4, 4, I1)
    p.eo(1, 1, 5, 3, I0)
    p.l(2, 2, 4, 2, CLEAR)
    save(hard(outline_same(p.im)), G_OUT + 'part_chain.png')
    fr = []                                                                      # roots bursting up under the player (2 frames 16x20)
    for k, hs in enumerate(((6, 9, 4), (13, 18, 10))):
        p = Pic(16, 20)
        for j, (x, h) in enumerate(zip((3, 8, 12), hs)):
            root_spike(p, x, 19, h, (-1) ** j * 0.5, 3 if h > 8 else 2, seed=j + 5)
        clods(p, 8, 19, 4 - k, 90 + k, 6, 4, floor=19)
        fr.append(outline_same(p.im))
    save(cells(fr, 16, 20), G_OUT + 'part_root.png', 2)
    p = Pic(6, 6)                                                                # tongue segment (tile it from mouth to target)
    p.e(0, 0, 5, 5, TONG[0]); p.e(1, 0, 4, 3, TONG[1]); p.p(2, 1, TONG[2])
    save(hard(outline_same(p.im)), G_OUT + 'part_tongue.png')
    fr = []                                                                      # golden legend sparks (additive on black, 2 frames 7x7)
    for k in range(2):
        p = Pic(7, 7)
        p.r(0, 0, 6, 6, (0, 0, 0))
        if k == 0:
            p.l(3, 0, 3, 6, (150, 100, 20)); p.l(0, 3, 6, 3, (150, 100, 20))
            p.l(3, 1, 3, 5, AU3); p.l(1, 3, 5, 3, AU3); p.p(3, 3, WHITE)
        else:
            p.ps([(2, 2), (4, 4), (2, 4), (4, 2)], (170, 120, 30)); p.p(3, 3, AU4)
            p.ps([(3, 2), (3, 4), (2, 3), (4, 3)], AU2)
        fr.append(p.im)
    save(cells(fr, 7, 7), G_OUT + 'part_legend.png', 2, additive=True)
    fr = []                                                                      # dirt clod (2 frames 6x6)
    for k in range(2):
        p = Pic(6, 6)
        if k == 0:
            p.e(0, 1, 5, 5, DT1); p.e(1, 1, 3, 3, DT3); p.p(4, 4, DT0)
        else:
            p.e(1, 0, 4, 4, DT1); p.p(2, 1, DT3); p.p(4, 5, DT2); p.p(0, 5, S3)
        fr.append(outline_same(p.im))
    save(cells(fr, 6, 6), G_OUT + 'part_dirt.png', 2)
    crown = ["........", "#..##..#", "##.##.##", "########", "########", ".######.", "........", ".######."]   # HUD: legendary
    p = Pic(8, 8)
    p.bitmap(0, 0, crown, {'#': WHITE})
    save(p.im, G_OUT + 'icon_legend.png')


@builder('icons')
def make_icons():
    def paw(d, k):        # a paw print: big pad and four toes
        S = lambda *v: [x * k for x in v]
        d.ellipse(S(24, 44, 72, 86), fill=255)
        d.ellipse(S(14, 74, 34, 90), fill=255); d.ellipse(S(62, 74, 82, 90), fill=255)
        for (x, y) in ((8, 26), (28, 8), (52, 8), (72, 26)):
            d.ellipse(S(x, y, x + 18, y + 24), fill=255)
    save(P3.icon(paw), T_OUT + 'icon_pet.png')


# @@SECTIONS@@


# ================================================================== CONTACT SHEET
def make_sheet():
    man = {}
    if os.path.exists(MANIFEST):
        man = json.load(open(MANIFEST))
    for k, v in SAVED.items():
        man[k] = v
    os.makedirs(SCR, exist_ok=True)
    json.dump(man, open(MANIFEST, 'w'), indent=0)
    font = ImageFont.load_default()

    def order(kv):
        p = kv[0]
        g = 1 if 'enemies' in p else 4 if 'fp_' in p else 2 if 'pet_' in p else 3
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
        elif name.startswith(('enemies', 'boss')):
            sc = 2
        elif name.startswith('pet_'):
            sc = 3
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
    """Style rules: every pixel fully opaque or fully transparent (opaque strips: additive on black),
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
