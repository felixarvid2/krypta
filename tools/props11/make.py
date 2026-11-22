#!/usr/bin/env python3
"""Version 14 graphics for Krypta ("Arenorna och de gamla biomernas nya invånare"): six new enemies for the middle and
late biomes (frost, volcano, tomb, crystal, sunken, sky), the arena gate and the arena reward chest, and particles.

Run from the folder that holds retrofps/ and assets/ (e.g. /home/user/test):
    python3 retrofps/tools/props11/make.py [name ...]
(with names only those builders run, e.g. `python3 retrofps/tools/props11/make.py windspirit sheet`; the contact sheet
always shows everything this script has written so far)

Out to retrofps/assets/gfx:
  enemies-{snowwraith,lavaworm2,scarabpriest,crystalspider,anglerfish,windspirit}_{idle,movement,attack,take_damage,death}.png
      (64x64 cells, feet row 57, facing right, the death ends lying / settled on the floor)
  enemies-lavaworm2_burrow.png   (3 frames: only a glowing heap in the ground while it is dug in; loop it)
  enemies-windspirit_anchored.png (3 frames: frame 0 the funnel drills into the floor, frames 1-2 the darker, denser
      anchored spirit (loop 1-2 while it can be hit))
  prop_arenagate.png  (3 fixed 64x64 cells: raised / half-way / down; an iron portcullis that fills a door opening, its
      bottom row is the floor, the top beam the lintel - draw it at size 1.0 in the door cell)
  prop_arenachest.png (2 frames: closed / open)
  part_{web,scarab,snow2}.png
Contact sheet: <scratchpad>/en/v14_sheet.png

Sources (licences checked; everything not listed is drawn procedurally below in the outlined style of
tools/props2-props10, whose helpers are reused):
  * Pixel Crawler Free Pack 2.11 (Anokolisa; free for commercial use, edits allowed, no resale of the assets):
      Characters/Body_A Idle/Walk/Collect/Hit/Death -> scarabpriest (sand robe with a lapis-and-gold hem, broad collar,
                                                      striped headcloth crowned by a winged scarab, sun-disc staff
                                                      drawn; Collect's raised hand lifts the staff for the swarm)
  (32rogues, Super Retro World and Mana Seed are NOT used: their licences forbid AI use / redistribution.)
Drawn: snowwraith, lavaworm2, crystalspider, anglerfish, windspirit, the gate, the chest and the particles.
Name clashes (existing files are never overwritten): enemies-lavaworm_*.png already exists (the LAVAMASK 'Þ', version 6,
tools/props4), so the new lava worm is enemies-lavaworm2_*.png (and enemies-lavaworm2_burrow.png). part_scarab.png did
not exist, so the flying scarab of the swarm is part_scarab.png; part_snow.png exists (3x3 flakes), so the bigger frost
crystal of the snow wraith is part_snow2.png; part_webshot.png exists (the cave spider's glob), the crystal net is
part_web.png.
Notes: the snow wraith's tail and the wind spirit's funnel are dithered (binary alpha) so they read as half see-through.
The floaters (snowwraith, anglerfish, windspirit) are drawn low in the cell (lowest row 57 / 55 / 51), like the harpy,
because the game lifts `float` enemies itself; their deaths end on the floor. Frame counts: idle 4, movement 6,
attack 7 (lavaworm2 6), take_damage 3 (scarabpriest 4, Body_A Hit), death 6 (scarabpriest 8, Body_A Death).
Suggested sizes (skeleton = 1.0, Body_A human = 1.05; apparent height = size x figure px / 64): snowwraith 0.95
(54 px, about the banshee), lavaworm2 1.0 (49 px reared, a little taller than a man), scarabpriest 1.05 (Body_A),
crystalspider 0.9 (same leg span as the cave spider at 1.2, so a smaller spider), anglerfish 1.1 (54 px long, 37 px
with the rod), windspirit 1.1 (47 px, about the harpy).
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
from_p2 = 'OUT Pic outline outline_same hard shift tint shear squash strip'.split()
globals().update({k: getattr(P2, k) for k in from_p2})
strip_tool, cut_below = P3.strip_tool, P4.cut_below
mask_of, ground, front_hand = P5.mask_of, P5.ground, P5.front_hand
dark, flash, dress, body_src, cell_of = P6.dark, P6.flash, P6.dress, P6.body_src, P6.cell_of
pcrystal, chunk, tube, bez, shard_burst = P6.pcrystal, P6.chunk, P6.tube, P6.bez, P6.shard_burst
puff, wind_streaks = P7.puff, P7.wind_streaks
I0, I1, I2, I3 = P2.I0, P2.I1, P2.I2, P2.I3
R0, R1, R2, R3 = P2.R0, P2.R1, P2.R2, P2.R3
ICE0, ICE1, ICE2, ICE3, ICE4 = P3.ICE0, P3.ICE1, P3.ICE2, P3.ICE3, P3.ICE4
SNOW0, SNOW1, SNOW2 = P3.SNOW0, P3.SNOW1, P3.SNOW2
MAG0, MAG1, MAG2, MAG3, MAG4 = P4.MAG0, P4.MAG1, P4.MAG2, P4.MAG3, P4.MAG4
BAS0, BAS1, BAS2, BAS3 = P4.BAS0, P4.BAS1, P4.BAS2, P4.BAS3
ASH0, ASH1, ASH2, ASH3 = P4.ASH0, P4.ASH1, P4.ASH2, P4.ASH3
SD0, SD1, SD2, SD3, SD4 = P5.SD0, P5.SD1, P5.SD2, P5.SD3, P5.SD4
LP0, LP1, LP2, LP3 = P5.LP0, P5.LP1, P5.LP2, P5.LP3
AU0, AU1, AU2, AU3, AU4 = P5.AU0, P5.AU1, P5.AU2, P5.AU3, P5.AU4
TQ0, TQ1, TQ2 = P5.TQ0, P5.TQ1, P5.TQ2
SC0, SC1, SC2, SC3 = P5.SC0, P5.SC1, P5.SC2, P5.SC3                               # scarab teal (enemies-scarab)
RK0, RK1, RK2, RK3, RK4 = P6.RK0, P6.RK1, P6.RK2, P6.RK3, P6.RK4
CR0, CR1, CR2, CR3, CR4 = P6.CR0, P6.CR1, P6.CR2, P6.CR3, P6.CR4
PK0, PK1, PK2 = P6.PK0, P6.PK1, P6.PK2
CY0, CY1, CY2, CY3 = P6.CY0, P6.CY1, P6.CY2, P6.CY3
WA0, WA1, WA2, WA3, WA4, WA5 = P6.WA0, P6.WA1, P6.WA2, P6.WA3, P6.WA4, P6.WA5
SH0, SH1, SH2 = P6.SH0, P6.SH1, P6.SH2
CG, CGD = P7.CG, P7.CGD                                                                # cloud giant's cloud
ST0, ST1, ST2, ST3, ST4 = P7.ST0, P7.ST1, P7.ST2, P7.ST3, P7.ST4                      # storm slate
LT0, LT1, LT2, LT3 = P7.LT0, P7.LT1, P7.LT2, P7.LT3

G_OUT = 'retrofps/assets/gfx/'
SCR = '/tmp/claude-0/-home-user/80ee56ba-2fa6-5354-b261-a4ca4fdcb508/scratchpad/en/'
SHEET, MANIFEST = SCR + 'v14_sheet.png', SCR + 'v14_manifest.json'
WHITE = (255, 255, 255)

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
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


def dither_fade(im, y0, y1, k0=0.0, k1=0.75, x_ph=0):
    """Binary-alpha 'see-through': from row y0 (nothing removed, share k0) to y1 (share k1 of the pixels removed in an
    ordered 4x4 dither). Rows below y1 keep share k1. Applied after the outline, so the holes are not outlined."""
    a = np.array(im).copy()
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    t = np.clip((yy - y0) / max(1, y1 - y0), 0, 1)
    k = np.where(yy < y0, 0, k0 + (k1 - k0) * t)
    cut = BAYER[yy % 4, (xx + x_ph) % 4] < k
    a[cut] = 0
    return Image.fromarray(a)


def ring_dither(im, cx, cy, r0, r1, k1=0.7):
    """Like dither_fade but radial: pixels farther than r0 from (cx, cy) thin out towards r1."""
    a = np.array(im).copy()
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.hypot(xx - cx, (yy - cy) * 1.2)
    k = np.clip((d - r0) / max(1, r1 - r0), 0, 1) * k1
    a[BAYER[yy % 4, xx % 4] < k] = 0
    return Image.fromarray(a)


def flakes(p, n, seed, box, pal=(WHITE, ICE4, SNOW1), cross=0.3):
    """Loose snowflakes (single pixels, some as tiny crosses) inside box = (x0, y0, x1, y1)."""
    r2 = random.Random(seed)
    for _ in range(n):
        x, y = r2.uniform(box[0], box[2]), r2.uniform(box[1], box[3])
        c = r2.choice(pal)
        p.p(x, y, c)
        if r2.random() < cross:
            p.ps([(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], pal[min(1, len(pal) - 1)])


def embers(p, n, seed, box, pal=(MAG4, MAG3, MAG2)):
    r2 = random.Random(seed)
    for _ in range(n):
        x, y = r2.uniform(box[0], box[2]), r2.uniform(box[1], box[3])
        p.p(x, y, r2.choice(pal))
        if r2.random() < 0.3:
            p.p(x, y + 1, pal[-1])


def bubbles(p, n, seed, box):
    r2 = random.Random(seed)
    for _ in range(n):
        x, y = r2.uniform(box[0], box[2]), r2.uniform(box[1], box[3])
        if r2.random() < 0.4:
            p.eo(x - 1, y - 1, x + 1, y + 1, WA4); p.p(x - 1, y - 1, WA5)
        else:
            p.p(x, y, WA5)


def mini_scarab(p, x, y, k=0, ang=0.0):
    """A tiny flying scarab (5x4 + wings) centred on (x, y), facing ang; k toggles the wing beat."""
    u = (math.cos(ang), math.sin(ang))
    v = (-u[1], u[0])
    P_ = lambda a_, b_: (x + u[0] * a_ + v[0] * b_, y + u[1] * a_ + v[1] * b_)
    wy = -2.5 if k == 0 else -1.2
    p.poly([P_(-1, -1), P_(-3.5, wy - 0.5), P_(-4, wy + 1.5), P_(-1.5, 0)], (214, 168, 84))
    p.e(x - 2, y - 1.5, x + 2, y + 1.5, SC1)
    p.p(x - 1, y - 1, SC3); p.p(x, y - 1, SC2)
    p.p(*P_(2.5, 0), SC0)
    p.p(*P_(-0.5, 1.5), AU2)


# ================================================================== PARTICLES
@builder('particles')
def make_particles():
    fr = []                                                              # crystal net (2 frames 13x13): whole / breaking
    for k in range(2):
        p = Pic(13, 13)
        c = 6
        ang = [j * math.tau / 8 + 0.2 for j in range(8)]
        spokes = [(c + math.cos(a) * 6, c + math.sin(a) * 6) for a in ang]
        if k == 0:
            for (x, y) in spokes:
                p.l(c, c, x, y, (190, 178, 232))
            for rr, col in ((2.5, WHITE), (4.6, (226, 218, 255))):
                p.lines([(c + math.cos(a) * rr, c + math.sin(a) * rr) for a in ang + ang[:1]], col)
            q = Pic(13, 13)                                              # crystal beads on the outer ring, outlined
            for j in (0, 2, 4, 6):
                x, y = c + math.cos(ang[j]) * 5, c + math.sin(ang[j]) * 5
                q.p(x, y, PK2 if j % 4 else CR3)
            q.p(c, c, CR4)
            p.paste(outline_same(q.im), 0, 0)
        else:                                                            # snapped strands and flying shards
            for j, (x, y) in enumerate(spokes):
                if j % 2 == 0:
                    p.l(c + (x - c) * 0.2, c + (y - c) * 0.2, c + (x - c) * 0.5, c + (y - c) * 0.5, (190, 178, 232))
            q = Pic(13, 13)
            for j, (x, y) in enumerate(spokes):
                if j % 2:
                    pcrystal(q, c + (x - c) * 0.7, c + (y - c) * 0.7, ang[j], 3.5, 1.0, (PK2, PK1, PK0, WHITE) if j % 4 == 1 else (CR3, CR2, CR1, CR4))
            p.paste(outline_same(q.im), 0, 0)
            p.p(c, c, WHITE)
        fr.append(p.im)
    save(cells(fr, 13, 13), G_OUT + 'part_web.png', 2)
    fr = []                                                              # flying scarab (2 frames 8x7): wings up / down
    for k in range(2):
        p = Pic(8, 7)
        mini_scarab(p, 4, 4, k)
        fr.append(outline_same(p.im))
    save(cells(fr, 8, 7), G_OUT + 'part_scarab.png', 2)
    fr = []                                                              # frost crystal (2 frames 7x7): flake / glint
    for k in range(2):
        p = Pic(7, 7)
        if k == 0:
            p.l(3, 0, 3, 6, ICE3); p.l(0, 3, 6, 3, ICE3)
            p.ps([(1, 1), (5, 5), (1, 5), (5, 1)], ICE4)
            p.ps([(3, 1), (3, 5), (1, 3), (5, 3)], ICE4)
            p.p(3, 3, WHITE)
        else:
            p.l(1, 1, 5, 5, ICE3); p.l(1, 5, 5, 1, ICE3)
            p.ps([(3, 0), (3, 6), (0, 3), (6, 3)], ICE4)
            p.r(2, 2, 4, 4, ICE4); p.p(3, 3, WHITE)
        fr.append(p.im)
    save(cells(fr, 7, 7), G_OUT + 'part_snow2.png', 2)


# ================================================================== PROPS
def arenagate(k):
    """64x64 cell: an iron portcullis in a door opening. k = 0 raised (only the spiked foot hangs below the lintel),
    1 half-way, 2 down (the spikes on the floor, bottom row 63)."""
    p = Pic(64, 64)
    gb = (13, 37, 63)[k]                                                 # row of the spike tips
    bars = list(range(7, 58, 7))
    for x in bars:                                                       # vertical bars, pointed at the foot
        top = 4
        p.r(x - 1, top, x + 1, gb - 3, I1)
        p.l(x - 1, top, x - 1, gb - 3, I2)
        p.l(x, top, x, gb - 3, I2 if (x // 7) % 2 else I3)
        p.poly([(x - 1, gb - 3), (x + 1, gb - 3), (x, gb)], I1)
        p.p(x, gb - 2, I3)
        if (x * 7) % 3 == 0:                                             # a rust streak here and there
            p.l(x + 1, gb - 14, x + 1, gb - 8, R1)
    for j in range(5):                                                   # cross bars, fixed to the grid
        y = gb - 8 - j * 14
        if y < 6:
            break
        p.r(3, y - 1, 60, y + 1, I1)
        p.l(3, y - 1, 60, y - 1, I3)
        p.l(3, y + 1, 60, y + 1, I0)
        for x in bars:                                                   # rivets where the bars cross
            p.p(x, y, (176, 178, 192)); p.p(x + 1, y + 1, I0)
        p.l(20 + j * 5, y + 1, 24 + j * 5, y + 1, R2)
    for x0 in (0, 60):                                                   # guide channels in the jambs
        p.r(x0, 0, x0 + 3, 63, I0)
        p.r(x0 + 1, 0, x0 + 2, 63, I1)
        p.l(x0 + (1 if x0 == 0 else 2), 0, x0 + (1 if x0 == 0 else 2), 63, I2)
        for y in range(6, 64, 10):
            p.p(x0 + 1, y, (176, 178, 192)); p.p(x0 + 2, y + 1, I0)
    p.r(0, 0, 63, 4, I1)                                                 # the lintel the gate drops from
    p.l(0, 0, 63, 0, I3); p.l(0, 4, 63, 4, I0)
    for x in range(4, 64, 8):
        p.p(x, 2, (176, 178, 192)); p.p(x + 1, 3, I0)
    return outline_same(p.im)


def arenachest(open_):
    """The arena's reward: a heavy chest of dark wood bound in iron, red lacquer panels and gold corners, crossed
    swords on the lid; open: gold, a gem and light inside."""
    p = Pic(40, 36)
    bx0, bx1, top, base = 3, 36, 18, 34
    WD = ((44, 26, 22), (70, 42, 32), (100, 62, 44), (130, 86, 58))
    RD = ((80, 14, 22), (130, 26, 30), (172, 46, 40))
    p.r(bx0, top, bx1, base, WD[1])
    p.r(bx0 + 3, top + 3, bx1 - 3, base - 3, RD[1])                         # lacquered front panel
    p.l(bx0 + 3, top + 3, bx1 - 3, top + 3, RD[2]); p.l(bx0 + 3, base - 3, bx1 - 3, base - 3, RD[0])
    for x in range(bx0 + 6, bx1 - 4, 6):
        p.l(x, top + 4, x, base - 4, RD[0])
    for x in (bx0, bx1 - 2):                                                # iron bands and gold corners
        p.r(x, top, x + 2, base, I1); p.l(x, top, x, base, I3 if x == bx0 else I2)
    p.r(bx0, base - 1, bx1, base, I0)
    for (x, y) in ((bx0, top), (bx1 - 3, top), (bx0, base - 3), (bx1 - 3, base - 3)):
        p.r(x, y, x + 3, y + 3, AU2); p.p(x + 1, y + 1, AU4); p.p(x + 3, y + 3, AU0)
    if open_:
        lid = Pic(36, 13)                                                    # the lid thrown back: its dark inside shows
        lid.poly([(0, 12), (2, 1), (33, 1), (35, 12)], WD[0]); lid.l(2, 1, 33, 1, WD[2])
        lid.r(4, 3, 31, 10, (54, 12, 18)); lid.l(4, 3, 31, 3, RD[0])
        lid.r(0, 1, 2, 12, AU1); lid.r(33, 1, 35, 12, AU1); lid.p(1, 2, AU3); lid.p(34, 2, AU3)
        p.paste(lid.im, bx0 - 1, top - 17)
        p.poly([(bx0, top), (bx0 + 2, top - 4), (bx1 - 2, top - 4), (bx1, top)], (30, 16, 16))
        p.r(bx0 + 2, top - 4, bx1 - 2, top, (30, 16, 16))
        p.e(8, top - 8, 32, top + 2, AU1)                                    # a heap of gold
        p.e(9, top - 7, 31, top, AU2)
        p.e(12, top - 7, 22, top - 3, AU3)
        for (x, y) in ((11, 14), (15, 12), (19, 14), (24, 12), (28, 14), (17, 16), (26, 16), (21, 11)):
            p.p(x, y, AU4); p.p(x + 1, y + 1, AU0)
        p.poly([(21, 7), (24, 10), (21, 13), (18, 10)], (30, 130, 80)); p.poly([(21, 7), (24, 10), (21, 10), (18, 10)], (70, 200, 120))
        p.p(20, 9, (210, 255, 220))
        p.poly([(29, 9), (31, 11), (29, 13), (27, 11)], (150, 30, 50)); p.p(28, 10, (255, 150, 160))   # a ruby
        for (x, y) in ((5, 4), (35, 6), (15, 3), (27, 2)):                   # sparkles
            p.ps([(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], AU3); p.p(x, y, AU4)
    else:
        p.poly([(bx0, top), (bx0 + 2, top - 8), (bx1 - 2, top - 8), (bx1, top)], WD[2])   # domed lid
        p.l(bx0 + 2, top - 8, bx1 - 2, top - 8, WD[3])
        p.r(bx0 + 4, top - 6, bx1 - 4, top - 2, RD[1]); p.l(bx0 + 4, top - 6, bx1 - 4, top - 6, RD[2])
        p.r(bx0, top - 1, bx1, top, I1); p.l(bx0, top - 1, bx1, top - 1, I3)
        for x in (bx0 + 1, bx1 - 2):
            p.r(x, top - 7, x + 1, top, AU2)
        cx_ = (bx0 + bx1) // 2                                               # crossed swords on the lid
        for s_ in (-1, 1):
            p.l(cx_ - 6 * s_, top - 7, cx_ + 6 * s_, top - 2, (200, 204, 216))
            p.p(cx_ - 6 * s_, top - 7, WHITE)
            p.l(cx_ + 4 * s_, top - 4, cx_ + 6 * s_, top - 5, AU2)
        p.r(cx_ - 2, top - 1, cx_ + 1, top + 4, AU2); p.r(cx_ - 1, top + 1, cx_, top + 2, (30, 16, 16))   # lock plate
        p.p(cx_ - 2, top - 1, AU4)
    return outline(cut_below(p.im, 35))


@builder('props')
def make_props():
    save(cells([arenagate(k) for k in range(3)], 64, 64), G_OUT + 'prop_arenagate.png', 3)
    save_prop('arenachest', [arenachest(False), arenachest(True)])


# ================================================================== SNOW WRAITH (drawn, 64x64: a gliding hooded shroud of snow and ice)
WR = ((86, 118, 164), (152, 188, 224), (208, 228, 246), (244, 250, 255))               # snow shroud (banshee blue-white)
WRD = ((70, 96, 140), (118, 152, 196), (160, 192, 226), (200, 222, 244))               # far side
ICEP = (ICE3, ICE2, ICE1, ICE4)
FACE = (22, 30, 62)


def ice_claw(p, x, y, ang, spread=0.35, ln=6.5, far=False):
    """Three long claws of ice fanning out from the hand at (x, y) along ang."""
    for k in (-1, 0, 1):
        a = ang + k * spread
        pcrystal(p, x, y, a, ln - abs(k) * 1.2, 1.1, ICEP if not far else (ICE2, ICE1, ICE0, ICE3))


def wraith_arm(p, sx, sy, ang, ln, far=False, claw=1.0):
    """A thin tattered sleeve from the shoulder along ang (0 = forward, + = down), ending in an ice claw."""
    pal = WRD if far else WR
    ex, ey = sx + math.cos(ang) * ln, sy + math.sin(ang) * ln
    pts = [(sx + (ex - sx) * t, sy + (ey - sy) * t + math.sin(t * math.pi) * 1.5) for t in np.linspace(0, 1, 6)]
    tube(p, pts, [3.2, 3.0, 2.7, 2.4, 2.0, 1.8], pal)
    for t in (0.35, 0.7):                                               # rags hanging from the sleeve
        x, y = sx + (ex - sx) * t, sy + (ey - sy) * t + 2
        p.poly([(x - 2, y), (x + 1, y), (x - 1.5, y + 4)], pal[1])
        p.p(x - 1, y + 1, pal[0])
    ice_claw(p, ex + math.cos(ang), ey + math.sin(ang), ang, 0.25 + claw * 0.2, 6.5, far)
    return ex, ey


def wraith_raw(t=0.0, bob=0, lean=0.0, sway=0.0, arm=(0.9, 10), farm=(1.1, 8), eyes=1, dx=0, frost=0, slash=0,
               hood=True, crown=True):
    p = Pic(64, 64)
    hx, hy = 35 + lean + dx, 19 + bob
    ph = t * math.tau
    # body: a tube along a spine from the neck through the hips to the tail tip curling back over the floor
    tip = (hx - 18 + sway * 3 + math.sin(ph) * 1.5, 55)
    spine = bez((hx - 1, hy + 4), (hx - 2 + lean * 0.3, hy + 30), tip, 12)
    radii = [6.0, 8.0, 9.0, 8.8, 8.0, 7.0, 5.8, 4.6, 3.6, 2.6, 1.8, 1.2]
    wraith_arm(p, hx - 3, hy + 7, farm[0], farm[1], True)
    tube(p, spine, radii, WR)
    for j in range(3, 10):                                              # folds of the shroud
        x, y = spine[j]
        r = radii[j]
        p.l(x + r * 0.2, y - r * 0.5, x - r * 0.3, y + r * 0.6, (124, 160, 204))
    for j, (x, y) in enumerate(spine[4:10]):                            # ragged hem hanging from the front
        r = radii[j + 4]
        q = math.sin(ph + j * 1.3) * 1.2
        p.poly([(x + r * 0.2, y + r * 0.5), (x + r * 0.9, y + r * 0.2), (x + r * 0.6 + q, y + r + 3)], WR[1])
        p.p(x + r * 0.6 + q, y + r + 2, WR[0])
    r2 = random.Random(int(t * 40) + 7)                                 # snow sparkle in the shroud
    for _ in range(26):
        j = r2.randrange(1, 10)
        x, y = spine[j]
        r = radii[j]
        p.p(x + r2.uniform(-r, r) * 0.7, y + r2.uniform(-r, r) * 0.6, r2.choice((WR[3], WHITE, WR[2])))
    if hood:                                                            # the hood, its point trailing back
        p.poly([(hx - 5, hy - 5), (hx - 12 - sway, hy - 1 + math.sin(ph) * 0.8), (hx - 6, hy + 4)], WR[1])
        p.l(hx - 6, hy - 4, hx - 11 - sway, hy - 1, WR[2])
        p.e(hx - 6, hy - 7, hx + 6, hy + 6, WR[0])
        p.e(hx - 5, hy - 7, hx + 6, hy + 5, WR[1])
        p.e(hx - 5, hy - 7, hx + 2, hy - 1, WR[2])
        p.p(hx - 3, hy - 5, WR[3]); p.p(hx - 2, hy - 6, WR[3])
        p.e(hx + 1, hy - 4, hx + 7, hy + 5, FACE)                          # the empty face, eyes glowing in it
        p.l(hx + 1, hy - 4, hx + 1, hy + 4, WR[0])
        if eyes:
            ec = CY2 if eyes == 1 else WHITE
            for ex in (hx + 3, hx + 5):
                p.p(ex, hy, ec); p.p(ex, hy + 1, CY1 if eyes == 1 else CY2)
            p.l(hx + 3, hy + 3, hx + 5, hy + 3, (40, 56, 100))
    if crown:                                                           # a crown of icicles on the hood
        for (ox, a, ln) in ((-4, -2.1, 5), (-1, -1.75, 7), (2, -1.45, 6), (4, -1.15, 4)):
            pcrystal(p, hx + ox, hy - 5, a, ln, 1.3, ICEP)
    hand = wraith_arm(p, hx + 1, hy + 7, arm[0], arm[1], False, 1.0 if frost or slash else 0.5)
    im = outline_same(p.im)
    im = dither_fade(im, 40, 57, 0.0, 0.72, int(t * 4))               # the tail thins out to nothing
    q = Pic(64, 64)
    flakes(q, 6, int(t * 37) + 3, (tip[0] - 4, 40, hx + 4, 57))
    if frost:                                                           # frost gathering round the claws
        cx_, cy_ = hand[0] + math.cos(arm[0]) * 6, hand[1] + math.sin(arm[0]) * 6
        for j in range(5 + frost * 2):
            a = j / (5 + frost * 2) * math.tau + frost
            d = 3 + frost * 1.5
            x, y = cx_ + math.cos(a) * d, cy_ + math.sin(a) * d
            q.ps([(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], ICE4); q.p(x, y, WHITE)
    if slash:                                                           # the icy swipe: a pale arc in front
        cx_, cy_ = hx + 3, hy + 12
        r = 15 + slash * 2
        q.arc(cx_ - r, cy_ - r, cx_ + r, cy_ + r, -55 + slash * 25, 50 + slash * 25, ICE3, 3)
        q.arc(cx_ - r + 1, cy_ - r + 1, cx_ + r - 1, cy_ + r - 1, -45 + slash * 25, 42 + slash * 25, WHITE, 1)
        shard_burst(q, hx + 16, hy + 20, 5 + slash * 3, 5, 9 + slash, 0.0, 57, (WHITE, ICE4, ICE2))
    return on(im, q.im)


def wraith_frame(fl=None, **kw):
    im = wraith_raw(**kw)
    if fl:
        im = flash(im, fl)
    return im


def snowdrift(k, seed=4):
    """What is left: a drift of snow on the floor with the icicle crown lying in it; k = 0..2 settles it."""
    p = Pic(64, 64)
    SNP = ((132, 156, 194), SNOW0, SNOW1, SNOW2)
    for (x, r) in ((18, 4.5 - k * 0.5), (25, 6 - k), (33, 7 - k), (41, 5.5 - k), (47, 3.5)):
        puff(p, x, 57 - r * 0.7, r, SNP)
    for (ox, a, ln) in ((26, -2.6, 5), (30, -2.9, 6), (36, -0.4, 5), (39, -0.15, 4)):
        pcrystal(p, ox, 51 + k, a, ln - k * 0.5, 1.2, ICEP)
    im = outline_same(cut_below(p.im, 57))
    q = Pic(64, 64)
    if k == 0:
        q.p(36, 50, CY1); q.p(38, 50, CY0)
    flakes(q, 6 - k * 2, 60 + k, (12, 30 + k * 6, 52, 50))
    return on(im, q.im)


@builder('snowwraith')
def make_snowwraith():
    F = wraith_frame
    save_enemy('snowwraith', 'idle', [F(t=i / 4, bob=(0, -1, -1, 0)[i], sway=(0, 0.3, 0.6, 0.3)[i],
                                        arm=(0.9 + (0, 0.05, 0.1, 0.05)[i], 10), farm=(1.1 - (0, 0.05, 0.1, 0.05)[i], 8)) for i in range(4)], 64)
    save_enemy('snowwraith', 'movement', [F(t=i / 6, bob=(0, -1, -1, -2, -1, -1)[i], lean=2, sway=-1.2 + math.sin(i / 6 * math.tau) * 0.5,
                                            arm=(1.15 + math.sin(i / 6 * math.tau) * 0.1, 10), farm=(1.3, 8)) for i in range(6)], 64)
    att = [F(t=0.0, lean=-1, arm=(-0.6, 11), eyes=2, frost=1),
           F(t=0.15, lean=-2, arm=(-1.05, 12), farm=(1.5, 8), eyes=2, frost=2, bob=-1),
           F(t=0.3, lean=-2, arm=(-1.3, 13), farm=(1.6, 8), eyes=2, frost=3, bob=-2),
           F(t=0.45, lean=3, dx=2, arm=(0.15, 14), farm=(0.6, 9), eyes=2, slash=1, bob=-1),
           F(t=0.6, lean=3, dx=2, arm=(0.85, 13), farm=(0.9, 9), eyes=2, slash=2),
           F(t=0.75, lean=1, dx=1, arm=(0.9, 11)),
           F(t=0.9)]
    save_enemy('snowwraith', 'attack', att, 64)
    save_enemy('snowwraith', 'take_damage', [F(t=0.2, dx=-3, eyes=2, arm=(0.4, 9), farm=(0.6, 7), sway=1, fl=(255, 255, 255)),
                                             F(t=0.4, dx=-2, eyes=2, arm=(0.6, 10), sway=0.6), F(t=0.6, dx=-1)], 64)
    d0 = F(t=0.1, eyes=2, lean=-2, arm=(-1.3, 11), farm=(-1.0, 8), bob=-2)
    d1 = dither_fade(F(t=0.3, eyes=1, lean=-1, arm=(1.4, 9), farm=(1.5, 7), bob=1), 10, 57, 0.15, 0.8)
    d2 = dither_fade(squash(F(t=0.5, eyes=0, arm=(1.5, 8), farm=(1.5, 7), bob=3, crown=True), 0.6, 57), 30, 57, 0.3, 0.85)
    fall = Pic(64, 64)
    flakes(fall, 14, 77, (16, 14, 50, 56))
    d1, d2 = on(d1, fall.im), on(d2, fall.im)
    save_enemy('snowwraith', 'death', [d0, d1, d2, snowdrift(0), snowdrift(1), snowdrift(2)], 64)


# ================================================================== LAVA WORM 2 (drawn, 64x64: a basalt-plated worm rearing out of a lava pool)
CRUST = (BAS1, BAS2, BAS3, ASH2)
TEETH = P4.TEETH


def lava_pool(p, cx, w, glow_=1.0, crust=0.0, y=55):
    """A pool of lava on the floor around cx; crust (0..1) cools it over."""
    h = 5
    p.e(cx - w / 2, y - h / 2, cx + w / 2, y + h / 2 + 1, BAS1)
    if crust < 1:
        p.e(cx - w / 2 + 2, y - h / 2 + 1, cx + w / 2 - 2, y + h / 2, MAG1 if glow_ > 0.5 else MAG0)
        p.e(cx - w / 2 + 5, y - 1.5, cx + w / 2 - 5, y + 1.5, MAG2 if glow_ > 0.5 else MAG1)
        if glow_ > 0.7:
            p.e(cx - w / 4, y - 1, cx + w / 4, y + 1, MAG3)
            p.l(cx - w / 4 + 1, y - 1, cx - 1, y - 1, MAG4)
    if crust:
        r2 = random.Random(5)
        for _ in range(int(crust * 10)):
            x = cx + r2.uniform(-w / 2 + 3, w / 2 - 3)
            yy = y + r2.uniform(-1.5, 1.5)
            p.r(x - 1.5, yy - 0.5, x + 1.5, yy + 0.5, r2.choice((BAS1, BAS2, BAS0)))
    for (ox, rr) in ((-w / 2 + 1, 2.0), (w / 2 - 2, 1.8), (-w / 2 + 6, 1.5), (w / 2 - 7, 1.2)):  # crust rocks on the rim
        p.e(cx + ox - rr, y + 1 - rr, cx + ox + rr, y + 1 + rr * 0.6, BAS2)
        p.p(cx + ox - rr * 0.4, y + 1 - rr * 0.6, BAS3)


def worm_head(p, x, y, ang, mouth=0.0, eyes=1, glow_=1.0):
    """The head at (x, y) facing ang: plated jaws (upper swings up, lower down by mouth 0..1), a glowing maw and teeth."""
    u = (math.cos(ang), math.sin(ang))
    v = (-u[1], u[0])

    def P_(a_, b_, rot=0.0):
        c_, s_ = math.cos(rot), math.sin(rot)
        a2, b2 = a_ * c_ - b_ * s_, a_ * s_ + b_ * c_
        return (x + u[0] * a2 + v[0] * b2, y + u[1] * a2 + v[1] * b2)
    up, lo = -mouth * 0.55, mouth * 0.45
    for (a_, b_) in ((-5, -6), (-1, -7.5), (3, -7)):                      # basalt spikes along the crest
        p.poly([P_(a_, b_ + 2), P_(a_ - 4, b_ - 2.5), P_(a_ + 2.5, b_ + 2)], BAS1)
        p.l(*P_(a_ - 0.5, b_ + 1), *P_(a_ - 3.5, b_ - 2), BAS3)
    lower = [P_(-4, 0, lo), P_(2, 0.5, lo), P_(11, 1, lo), P_(9.5, 3.5, lo), P_(4, 5, lo), P_(-3, 4.5, lo)]
    p.poly(lower, BAS1)
    p.poly([P_(-3, 1, lo), P_(9, 1.2, lo), P_(8, 3, lo), P_(-2, 3.6, lo)], BAS2)
    if mouth > 0.05:                                                      # the maw: magma throat, teeth on both jaws
        p.poly([P_(0, 0), P_(12, 0, up), P_(11, 0.8, lo)], MAG1)
        tx, ty = P_(2.5, 0.4)
        p.e(tx - 2.5, ty - 2.5, tx + 2.5, ty + 2.5, MAG3 if glow_ > 0.5 else MAG2)
        p.p(*P_(2, 0), MAG4)
        for k in range(4):
            a_ = 4 + k * 2.2
            p.p(*P_(a_, -0.2, up), TEETH); p.p(*P_(a_ + 1, 0.8, lo), TEETH)
            p.p(*P_(a_ + 1.1, 0.7 + mouth * 0.8, up), TEETH)
    upper = [P_(-5, -5.5, up), P_(1, -7, up), P_(7, -5.5, up), P_(11.5, -2.5, up), P_(12.5, 0, up), P_(2, 0, up), P_(-5, 0, up)]
    p.poly(upper, BAS2)
    p.poly([P_(-4, -5, up), P_(1, -6.4, up), P_(7, -5, up), P_(10.5, -2.5, up), P_(4, -3.5, up), P_(-3, -3, up)], BAS3)
    p.l(*P_(-4, -3, up), *P_(6, -4.5, up), ASH3)
    p.l(*P_(-2, -1, up), *P_(9, -1.5, up), MAG2)                        # a glowing seam along the jaw
    p.l(*P_(1, 2.5, lo), *P_(7, 2.5, lo), MAG1)
    if mouth <= 0.05:
        for k in range(3):                                               # closed: teeth showing over the lip
            p.p(*P_(6 + k * 2, 0.6), TEETH)
    if eyes:
        ex, ey = P_(5, -3.5, up)
        p.p(ex, ey, MAG4 if eyes == 1 else WHITE); p.p(ex - u[0], ey - u[1], MAG3 if eyes == 1 else MAG4)
    else:
        p.p(*P_(5, -3.5, up), BAS0)


def worm_raw(head=(39, 21), ctrl=(19, 32), tilt=0.35, mouth=0.0, eyes=1, glow_=1.0, sink=0, t=0.0, spit=None,
             pool_w=30, crust=0.0, chips=0):
    p = Pic(64, 64)
    base = (27, 60)
    hx, hy = head[0], head[1] + sink
    pts = bez(base, (ctrl[0], ctrl[1] + sink * 0.8), (hx, hy), 15)
    n = len(pts)
    radii = [6.8 - 2.0 * j / (n - 1) for j in range(n)]
    tube(p, pts, radii, CRUST, belly=MAG0)
    for j in range(1, n - 1, 2):                                          # glowing seams between the plates
        (x0, y0), (x1, y1) = pts[j - 1], pts[j + 1]
        ln = math.hypot(x1 - x0, y1 - y0) or 1
        nx, ny = -(y1 - y0) / ln, (x1 - x0) / ln
        x, y = pts[j]
        r = radii[j] - 0.8
        p.l(x - nx * r, y - ny * r, x + nx * r, y + ny * r, MAG1 if glow_ < 0.6 else MAG2)
        p.l(x - nx * r * 0.4, y - ny * r * 0.4, x + nx * r * 0.6, y + ny * r * 0.6, MAG2 if glow_ < 0.6 else MAG3)
        if glow_ >= 0.6:
            p.p(x + nx * r * 0.5, y + ny * r * 0.5, MAG4)
    (x0, y0), (x1, y1) = pts[-3], pts[-1]
    ang = max(-1.0, math.atan2(y1 - y0, x1 - x0) + tilt)                 # never straight up
    worm_head(p, hx, hy, ang, mouth, eyes, glow_)
    lava_pool(p, base[0], pool_w, glow_, crust)
    im = outline_same(cut_below(p.im, 57))
    q = Pic(64, 64)
    embers(q, 3 + int(glow_ * 3), int(t * 50) + 11, (base[0] - 14, 30 + sink, base[0] + 14, 52))
    if chips:                                                             # bits of crust knocked off
        r2 = random.Random(chips)
        for _ in range(5):
            x, y = hx + r2.uniform(-12, -2), hy + r2.uniform(-4, 10)
            q.r(x, y, x + 1, y, BAS3); q.p(x, y + 1, MAG2)
    im = on(im, q.im)
    if spit:                                                              # a gob of lava flying forward
        gx, gy, r = spit
        s_ = Pic(64, 64)
        s_.e(gx - r, gy - r, gx + r, gy + r, MAG1)
        s_.e(gx - r + 0.5, gy - r + 0.5, gx + r - 1, gy + r - 1, MAG2)
        s_.e(gx - r * 0.4 - 0.5, gy - r * 0.6, gx + r * 0.2, gy, MAG4)
        for k in range(1, 4):                                             # the trail of drops
            tx, ty = gx - k * (r + 2), gy - k * 0.6 + k * k * 0.2
            s_.e(tx - 1.2 + k * 0.3, ty - 1, tx + 1 - k * 0.3, ty + 1 - k * 0.3, MAG2 if k < 3 else MAG1)
        im = on(im, outline_same(s_.im))
    return im


def worm_frame(fl=None, **kw):
    im = worm_raw(**kw)
    if fl:
        im = flash(im, fl)
    return im


def glow_heap(k, t=0.0, w=26, h=8):
    """Dug in: a heap of ash and basalt on the floor with glowing cracks; k = 0..2 pulses the glow."""
    p = Pic(64, 64)
    cx = 30
    for (ox, r) in ((-9, 4.5), (-3, 6.5), (4, 6), (10, 4)):
        puff(p, cx + ox, 57 - r * 0.6, r, (BAS1, BAS2, BAS3, ASH2))
    gl = (MAG1, MAG2, MAG3)[k]
    for (pts) in (((cx - 8, 54), (cx - 5, 51), (cx - 2, 52), (cx + 1, 49)), ((cx + 2, 55), (cx + 5, 52), (cx + 8, 53)),
                  ((cx - 3, 56), (cx, 54))):
        p.lines(pts, gl)
        if k == 2:
            p.p(*pts[1], MAG4)
    p.e(cx - 2, 48, cx + 2, 51, (MAG1, MAG2, MAG3)[k]); p.p(cx, 49, MAG4 if k else MAG3)   # the vent on top
    im = outline_same(cut_below(p.im, 57))
    q = Pic(64, 64)
    embers(q, 2 + k, 30 + k, (cx - 6, 38, cx + 6, 47))
    if k:
        q.p(cx - 1, 44 - k, ASH2); q.p(cx + 1, 42 - k, ASH1)                  # a thread of smoke
    return on(im, q.im)


@builder('lavaworm2')
def make_lavaworm2():
    F = worm_frame
    save_enemy('lavaworm2', 'idle', [F(head=(39 + (0, 1, 1, 0)[i], 21 + (0, 0, 1, 1)[i]), ctrl=(19 + (0, 1, 2, 1)[i], 32),
                                       tilt=0.35 + (0, 0.05, 0.1, 0.05)[i], mouth=(0, 0, 0.15, 0)[i], t=i / 4) for i in range(4)], 64)
    mv = []
    for i in range(6):
        s_ = math.sin(i / 6 * math.tau)
        mv.append(F(head=(40 + s_ * 2, 24 + math.cos(i / 6 * math.tau) * 1.5), ctrl=(18 - s_ * 4, 36), tilt=0.3 + s_ * 0.1,
                    t=i / 6, pool_w=30 + (i % 2) * 2))
    save_enemy('lavaworm2', 'movement', mv, 64)
    att = [F(head=(33, 19), ctrl=(17, 30), tilt=0.0, mouth=0.1, eyes=2, glow_=1.0, t=0.0),
           F(head=(29, 17), ctrl=(15, 28), tilt=0.1, mouth=0.35, eyes=2, glow_=1.0, t=0.15),
           F(head=(42, 25), ctrl=(24, 33), tilt=0.15, mouth=1.0, eyes=2, t=0.3, spit=(54, 26, 3.0)),
           F(head=(43, 26), ctrl=(24, 34), tilt=0.2, mouth=0.8, eyes=2, t=0.45, spit=(62, 28, 2.6)),
           F(head=(41, 23), ctrl=(21, 33), tilt=0.3, mouth=0.3, t=0.6),
           F(head=(39, 21), ctrl=(19, 32), t=0.8)]
    save_enemy('lavaworm2', 'attack', att, 64)
    save_enemy('lavaworm2', 'take_damage', [F(head=(34, 22), ctrl=(17, 32), tilt=-0.2, mouth=0.6, eyes=2, fl=(255, 255, 255), chips=3),
                                            F(head=(36, 21), ctrl=(18, 32), tilt=0.0, mouth=0.3, eyes=2, chips=5),
                                            F(head=(38, 21), ctrl=(19, 32), tilt=0.25)], 64)
    dth = [F(head=(33, 16), ctrl=(18, 30), tilt=0.0, mouth=0.45, eyes=2, t=0.1),
           F(head=(38, 26), ctrl=(22, 36), tilt=0.7, mouth=0.6, eyes=1, glow_=1.0, t=0.3, sink=4),
           F(head=(38, 30), ctrl=(24, 40), tilt=0.9, mouth=0.4, eyes=0, glow_=0.8, t=0.5, sink=12),
           F(head=(34, 34), ctrl=(26, 44), tilt=1.0, mouth=0.2, eyes=0, glow_=0.7, t=0.7, sink=19),
           F(head=(30, 40), ctrl=(26, 50), tilt=1.2, eyes=0, glow_=0.5, t=0.9, sink=24, crust=0.5),
           F(head=(28, 46), ctrl=(27, 54), tilt=1.2, eyes=0, glow_=0.3, t=1.0, sink=30, crust=1.0)]
    save_enemy('lavaworm2', 'death', dth, 64)
    save_enemy('lavaworm2', 'burrow', [glow_heap(k) for k in (0, 1, 2)], 64)


# ================================================================== SCARAB PRIEST (Body_A: sand robe, broad collar, striped headcloth with a winged scarab)
PR_PAL = {'head': ((150, 98, 62), (112, 70, 46), (76, 46, 34), (190, 134, 88)), 'torso': (SD3, SD2, SD1, SD4),
          'legs': (SD2, SD1, SD0, SD3)}
SUN = ((150, 40, 30), (220, 90, 50), (255, 176, 96))


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


def sun_staff(p, hx, hy, ang, ln=24, back=7, glow_=1.0):
    """A gilded staff banded in lapis, topped by a scarab holding up a red sun disc; returns the disc centre."""
    u = (math.cos(ang), math.sin(ang))
    v = (-u[1], u[0])
    x0, y0 = hx - u[0] * back, hy - u[1] * back
    x1, y1 = hx + u[0] * ln, hy + u[1] * ln
    p.l(x0, y0, x1, y1, AU1, 2)
    p.l(x0 + v[0] * 0.5, y0 + v[1] * 0.5, x1 + v[0] * 0.5, y1 + v[1] * 0.5, AU3)
    n = int(ln + back)
    for k in range(3, n - 2, 6):                                          # lapis bands
        x, y = x0 + u[0] * k, y0 + u[1] * k
        p.l(x - v[0], y - v[1], x + v[0], y + v[1], LP2)
    sx, sy = x1 + u[0] * 2, y1 + u[1] * 2                                  # the scarab gripping the disc
    p.e(sx - 2.5, sy - 2.5, sx + 2.5, sy + 2.5, SC1)
    p.p(sx - 1, sy - 1, SC3); p.p(sx, sy - 1, SC2)
    for s_ in (-1, 1):                                                    # its forelegs reaching up round the disc
        p.l(sx + v[0] * s_ * 2, sy + v[1] * s_ * 2, sx + u[0] * 3 + v[0] * s_ * 3, sy + u[1] * 3 + v[1] * s_ * 3, SC0)
    dx_, dy_ = sx + u[0] * 5.5, sy + u[1] * 5.5
    r = 2.8
    p.e(dx_ - r, dy_ - r, dx_ + r, dy_ + r, SUN[0])
    p.e(dx_ - r + 0.6, dy_ - r + 0.6, dx_ + r - 0.6, dy_ + r - 0.6, SUN[1])
    p.p(dx_ - 1, dy_ - 1, SUN[2]); p.p(dx_, dy_ - 1, SUN[2] if glow_ > 1 else SUN[1])
    return dx_, dy_


def sun_glow(p, x, y, k):
    """A ring of turquoise light round the sun disc (not outlined); k = 1..3."""
    r = 3.5 + k
    for j in range(8 + k * 2):
        a = j / (8 + k * 2) * math.tau + k * 0.3
        p.p(x + math.cos(a) * r, y + math.sin(a) * r, TQ2 if j % 2 else TQ1)
    if k >= 2:
        for j in range(4):
            a = j * math.pi / 2 + 0.4
            p.l(x + math.cos(a) * (r + 1), y + math.sin(a) * (r + 1), x + math.cos(a) * (r + 2 + k), y + math.sin(a) * (r + 2 + k), TQ2)


def priest_robe(p, g, hy, sway=0.0, flare=2.0):
    """An ankle-length linen robe from the belt, pleated, with a lapis-and-gold hem and a gold sash."""
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
            c = SD2
            if x <= l + 1:
                c = SD1
            elif (x - l) % 3 == 2:
                c = SD3
            if y >= feet - 2:
                c = LP2 if y == feet - 1 else (AU2 if (x - l) % 2 == 0 else LP1)
            p.p(x, y, c)
    p.l(x0, belt, x1, belt, AU2)
    p.l(x1 - 1, belt + 1, x1 - 2, belt + 5, AU2)                             # the end of the sash
    p.p(x1 - 1, belt, AU4)


def headdress(p, hx, hy, phase=0.0, wings=1.0):
    """Striped headcloth over the crown and down behind the head, a gold brow band, and a small scarab with spread
    gold wings on top."""
    p.poly([(hx - 5, hy - 4), (hx - 2, hy - 7), (hx + 3, hy - 7), (hx + 5, hy - 4), (hx + 1, hy - 3), (hx - 1, hy - 1),
            (hx - 2, hy + 4), (hx - 4, hy + 7), (hx - 7, hy + 6), (hx - 6, hy + 1)], LP1)
    for y in range(int(hy) - 5, int(hy) + 8, 2):                          # gold stripes across the cloth
        xs = [x for x in range(int(hx) - 9, int(hx) + 7) if p.get(x, y)[:3] == LP1]
        if xs:
            p.l(min(xs), y, max(xs), y, AU2)
    p.l(hx - 1, hy - 3, hx + 4, hy - 4, AU3)                               # brow band
    p.p(hx + 4, hy - 4, AU4)
    sx, sy = hx - 0.5, hy - 8.5                                           # the scarab crest
    w = wings * (1 + 0.15 * math.sin(phase))
    for j, c in enumerate((AU1, AU3)):                                     # small gold wings swept back
        p.poly([(sx - 1, sy), (sx - 4 - 3 * w + j, sy - 3 - 1.5 * w + j * 1.5), (sx - 3 - 2 * w, sy + 1)], c)
    p.e(sx - 2.5, sy - 2, sx + 2.5, sy + 1.5, SC1)
    p.p(sx - 1, sy - 1, SC3); p.p(sx, sy - 1, SC2)
    p.l(sx - 2, sy + 1.5, sx + 2, sy + 1.5, AU2)
    p.e(sx + 2, sy - 1, sx + 4, sy + 1, SC1)                                # head and rake
    p.p(sx + 4.5, sy - 1, SC0)


def broad_collar(p, hx, hy):
    for k, c in enumerate((AU2, LP2, TQ1, AU3)):
        r = 3 + k
        p.arc(hx - 2 - r, hy + 5 - r, hx - 2 + r, hy + 5 + r, 0, 160, c)


def priest_cell(f, feet, cx, phase=0.0, staff=None, dx=0, dy=0, fl=None, glow_=1.0, sway=0.0, robe=True, hat=True, eyes=1,
                swarm=None, glow_ring=0, hc=None):
    g, hc = dress(f, PR_PAL, eye=TQ2 if eyes == 1 else WHITE if eyes == 2 else (60, 40, 30), hc=hc)
    if hc is None:
        return Image.new('RGBA', (64, 64))
    hx, hy = hc
    p = Pic(64, 64)
    if staff and staff[3] == 'back':
        sun_staff(p, *staff[:3], *staff[4:], glow_=glow_)
    p.paste(g, 0, 0)
    if robe:
        priest_robe(p, g, hy, sway)
        broad_collar(p, hx, hy)
    if hat:
        headdress(p, hx, hy, phase)
    disc = None
    if staff and staff[3] != 'back':
        disc = sun_staff(p, *staff[:3], *staff[4:], glow_=glow_)
    im = cell_of(outline_same(p.im), feet, cx, dx, dy)
    ox, oy = 32 - cx + dx, 57 - feet + dy
    q = Pic(64, 64)
    if disc and glow_ring:
        sun_glow(q, disc[0] + ox, disc[1] + oy, glow_ring)
    im = on(im, q.im)
    if swarm:                                                             # beetles pouring out of the sun disc
        n, d, seed = swarm
        s_ = Pic(64, 64)
        r2 = random.Random(seed)
        bx, by = (disc[0] + ox, disc[1] + oy) if disc else (40, 20)
        for j in range(n):
            a = r2.uniform(-0.9, 0.5)
            dd = d * r2.uniform(0.4, 1.0) + j
            x, y = bx + math.cos(a) * dd, by + math.sin(a) * dd * 0.8 + r2.uniform(-2, 2)
            if x < 62:
                mini_scarab(s_, x, y, j % 2, a * 0.5)
        im = on(im, outline_same(s_.im))
    if fl:
        im = flash(im, fl)
    return im


@builder('scarabpriest')
def make_scarabpriest():
    idle, walk, co, hit, de = body_src('Idle'), body_src('Walk'), body_src('Collect'), body_src('Hit'), body_src('Death')
    feet = max(f.getbbox()[3] - 1 for f in idle)
    b = idle[0].getbbox()
    cx = (b[0] + b[2]) // 2
    C = priest_cell

    def held(f, lean=0.12, ln=22):
        gs = strip_tool(f)
        hx, hy = front_hand(gs, gs.getbbox()[1], (14, 22))
        return (hx, hy, -math.pi / 2 + lean, 'front', ln, 9)
    save_enemy('scarabpriest', 'idle', [C(f, feet, cx, phase=i * 1.3, staff=held(f), glow_=1 + (i % 2)) for i, f in enumerate(idle)], 64)
    save_enemy('scarabpriest', 'movement', [C(f, feet, cx, phase=i, staff=held(f, 0.28), sway=-1, dy=(0, 1, 0, 0, 1, 0)[i])
                                            for i, f in enumerate(walk)], 64)
    # attack: the staff is lifted high in the raised hand, the sun disc flares and a swarm of scarabs pours out
    att = []
    for k, (i, ring, sw) in enumerate(((0, 1, None), (6, 2, None), (7, 3, (3, 6, 1)), (7, 3, (6, 16, 2)), (6, 2, (7, 26, 3)),
                                       (0, 1, (3, 34, 4)), (0, 0, None))):
        f = co[i]
        g, hc = dress(f, PR_PAL)
        if i:
            h = raised_hand(g, hc)
            st = (h[0], h[1] + 2, -math.pi / 2 + 0.05, 'front', 14, 5)
        else:
            st = held(f)
        att.append(C(f, feet, cx, phase=k, staff=st, glow_=2 if ring else 1, glow_ring=ring, swarm=sw, eyes=2 if 1 <= k <= 4 else 1))
    save_enemy('scarabpriest', 'attack', att, 64)
    save_enemy('scarabpriest', 'take_damage', [C(f, feet, cx, phase=i, staff=held(f, 0.45), dx=-1 - (i == 0), eyes=2,
                                                 fl=(255, 255, 255) if i == 0 else None) for i, f in enumerate(hit)], 64)
    # death: he staggers and falls, the staff drops, the last beetles flee and the disc goes dark
    dfr = []
    for i, f in enumerate(de):
        c = C(f, feet, cx, phase=i, robe=i < 3, hat=i < 5, eyes=1 if i < 3 else 0, staff=held(f, 0.4 + i * 0.3) if i < 3 else None)
        p, s_ = Pic(64, 64), Pic(64, 64)
        if i >= 3:
            sun_staff(p, 6, 56, -0.04, 22, 0, glow_=0)
            if i <= 5:
                for j in range(3):
                    mini_scarab(s_, 14 + j * 9 + (i - 3) * 5, 40 - (i - 3) * 9 - j * 3, (i + j) % 2, -0.5)
        dfr.append(cut_below(on(outline_same(p.im), c, outline_same(s_.im)), 57))
    save_enemy('scarabpriest', 'death', dfr, 64)


# ================================================================== CRYSTAL SPIDER (drawn, 64x64: a rock spider grown over with violet and pink crystals)
CSL = (RK2, RK3, RK4, (164, 154, 200))                                                # dark violet rock of its legs and body
PKP = (PK2, PK1, PK0, (255, 226, 252))
CRP = (CR3, CR2, CR1, CR4)


def web_ball(p, x, y, r, k=0):
    """The shot net: a star of strands with a ring and crystal beads (drawn on its own layer, outlined)."""
    ang = [j * math.tau / 8 + k * 0.3 for j in range(8)]
    for a in ang:
        p.l(x, y, x + math.cos(a) * r, y + math.sin(a) * r, (200, 190, 236))
    p.lines([(x + math.cos(a) * r * 0.6, y + math.sin(a) * r * 0.6) for a in ang + ang[:1]], WHITE)
    for a in ang[::2]:
        p.p(x + math.cos(a) * r, y + math.sin(a) * r, PK2)
    p.r(x - 1, y - 1, x, y, CR4)


def cspider_frame(t=0.0, walk=0.0, bob=0, lift=0.0, front_up=0.0, fang=0, glow_=1, splay=0, dx=0, eyes=1, web=None, fl=None):
    """Facing right; t gait phase, walk stride, lift rears the front, front_up raises the front legs, glow_ 0..2."""
    p = Pic(64, 64)
    gy = 56
    ax, ay = 22 + dx, 42 - bob
    piv = (ax + 7, ay + 3)

    def R(x, y):
        c, s_ = math.cos(-lift), math.sin(-lift)
        x0, y0 = x - piv[0], y - piv[1]
        return piv[0] + x0 * c - y0 * s_, piv[1] + x0 * s_ + y0 * c
    cx, cy = R(ax + 14, ay + 3)
    hips = [R(ax + 16 - 2.5 * i, ay + 4) for i in range(4)]
    feet_near = [(ax + 32, gy), (ax + 23, gy), (ax + 3, gy), (ax - 11, gy)]
    feet_far = [(ax + 27, gy - 2), (ax + 18, gy - 2), (ax - 2, gy - 2), (ax - 15, gy - 2)]
    knee_dx = [0.45, 0.45, 0.35, 0.3]

    def gait(i, side, f):
        ph = 2 * math.pi * t + ((i + side) % 2) * math.pi
        fx, fy = f
        fx += walk * math.sin(ph) + splay * (1 if i < 2 else -1)
        fy -= max(0.0, walk * 0.8 * math.cos(ph))
        if i < 2 and front_up > 0:
            ux, uy = cx + 11 + 5 * i - 6 * (1 - front_up), cy - 15 * front_up + 7 * i
            fx, fy = fx + (ux - fx) * front_up, fy + (uy - fy) * front_up
        return fx, fy

    def leg(i, h, f, far=False):
        hx, hy = h
        fx, fy = f
        kx = hx + (fx - hx) * knee_dx[i]
        ky = min(cy - 9 - (2 if i in (1, 2) else 0), fy - 8) + (2 if far else 0)
        p.lines([(hx, hy), (kx, ky), (fx, fy)], CSL[0], 3 if far else 4)
        p.lines([(hx, hy), (kx, ky), (fx, fy)], CSL[1] if far else CSL[2], 1 if far else 2)
        if not far:
            p.l(hx, hy - 1, kx, ky - 1, CSL[3])
        # a crystal spike on the knee and a crystal claw at the foot
        pcrystal(p, kx, ky, -1.7 + (0.4 if fx > hx else -0.4), 3.5 if not far else 2.5, 1.0, CRP if not far else (CR2, CR1, CR0, CR3))
        a = math.atan2(fy - ky, fx - kx)
        pcrystal(p, fx - math.cos(a) * 2.5, fy - math.sin(a) * 2.5, a, 3, 0.9, PKP if i % 2 else CRP)
    for i in range(4):
        leg(i, hips[i], gait(i, 1, feet_far[i]), True)
    # abdomen: a rock egg cracked open by a cluster of crystals growing up and back
    p.e(ax - 11, ay - 7, ax + 9, ay + 7, CSL[0])
    p.e(ax - 10, ay - 7, ax + 7, ay + 5, CSL[1])
    p.e(ax - 7, ay - 6, ax + 1, ay - 2, CSL[2])
    cl = (CR4, CR3, CR2, WHITE) if glow_ >= 2 else CRP
    pk = (PK2, (255, 210, 250), PK1, WHITE) if glow_ >= 2 else PKP
    for (ox, oy, a, ln, wd, pal) in ((-8, -2, -2.5, 9, 2.0, cl), (-4, -5, -2.0, 13, 2.6, pk), (0, -5, -1.6, 10, 2.2, cl),
                                     (3, -3, -1.25, 7, 1.8, pk), (-9, 2, -2.9, 7, 1.6, pk), (-6, -4, -2.3, 6, 1.4, cl)):
        x, y = R(ax + ox, ay + oy)
        pcrystal(p, x, y, a - lift, ln, wd, pal)
    p.r(ax - 12, ay, ax - 11, ay + 1, CSL[0])                                # spinnerets
    # cephalothorax and head
    p.e(cx - 6, cy - 4, cx + 5, cy + 4, CSL[0])
    p.e(cx - 5, cy - 4, cx + 3, cy + 1, CSL[1])
    p.l(cx - 3, cy - 3, cx + 1, cy - 3, CSL[3])
    pcrystal(p, cx - 2, cy - 3, -1.9 - lift, 4, 1.2, cl)
    hx, hy = R(ax + 21, ay + 2)
    hx, hy = int(round(hx)), int(round(hy))
    p.e(hx - 3, hy - 3, hx + 3, hy + 3, CSL[1])
    p.r(hx - 1, hy - 3, hx + 3, hy - 1, OUT)
    fx0, fy0 = hx + 2, hy + 2
    p.lines([(fx0, fy0), (fx0 + 1 + fang, fy0 + 2), (fx0 + fang, fy0 + 4)], PK1)
    p.lines([(fx0 - 2, fy0 + 1), (fx0 - 1 - fang, fy0 + 3), (fx0 - 2 - fang, fy0 + 5)], PK0)
    for i in range(4):
        leg(i, hips[i], gait(i, 0, feet_near[i]))
    p.outline()
    ec = (CY2, CY3) if eyes == 1 else (WHITE, PK2) if eyes == 2 else (RK3, RK2)
    p.ps([(hx, hy - 2), (hx + 2, hy - 2), (hx + 3, hy - 1), (hx - 1, hy - 2)], ec[0])
    p.p(hx, hy - 3, ec[1]); p.p(hx + 2, hy - 3, ec[1])
    im = p.crop()
    q = Pic(64, 64)
    if glow_ >= 2:                                                           # glints off the charged crystals
        r2 = random.Random(int(t * 10) + glow_)
        for _ in range(4):
            x, y = ax + r2.uniform(-12, 6), ay + r2.uniform(-20, -8)
            q.ps([(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], PK2); q.p(x, y, WHITE)
    im = on(im, q.im)
    if web:
        w_ = Pic(64, 64)
        wx, wy, wr = web
        x0_, y0_ = fx0 + 2, fy0
        if wx - x0_ > 6:                                                     # the strand back to the spider
            w_.l(x0_, y0_, wx - wr, wy, (200, 190, 236))
        web_ball(w_, wx, wy, wr, int(wx))
        im = on(im, outline_same(w_.im))
    if fl:
        im = flash(im, fl)
    return im


def cspider_dead(stage):
    """Belly up on the floor; the crystals of its back broken off and lying round it; stage 1..3 curls the legs."""
    p = Pic(64, 64)
    gy = 56
    ax, ay = 24, gy - 5
    curl = {1: 0.0, 2: 0.5, 3: 1.0}[stage]
    for (x, a, ln, pal) in ((8, -0.2, 7, CRP), (14, -2.9, 5, PKP), (44, -0.3, 6, PKP), (50, -3.0, 5, CRP), (20, -0.1, 4, CRP)):
        pcrystal(p, x, 55, a, ln, 1.6, pal)
    p.e(ax - 12, ay - 6, ax + 8, ay + 5, CSL[0])
    p.e(ax - 10, ay - 5, ax + 6, ay + 1, CSL[1])
    pcrystal(p, ax - 4, ay - 4, -1.9, 5 - stage, 2, PKP)                      # a stump of crystal left on it
    p.e(ax + 5, ay - 5, ax + 18, ay + 4, CSL[0])
    p.e(ax + 6, ay - 4, ax + 16, ay + 1, CSL[1])
    hips = [(ax + 15 - 2.5 * i, ay - 3) for i in range(4)]
    for side, col in ((1, CSL[1]), (0, CSL[2])):
        for i, (hx, hy) in enumerate(hips):
            sgn = 1 if i < 2 else -1
            spread = (14 - 3 * i if i < 2 else 6 + 3 * i) * (1 - 0.55 * curl)
            kx, ky = hx + sgn * spread * 0.6 + side * 2, hy - 11 + 4 * curl
            fx, fy = kx + sgn * (spread * 0.5 * (1 - curl)) - sgn * 4 * curl, ky - 2 + 8 * curl
            p.lines([(hx, hy), (kx, ky), (fx, fy)], OUT, 4 if side == 0 else 3)
            p.lines([(hx, hy), (kx, ky), (fx, fy)], col, 2 if side == 0 else 1)
            if side == 0:
                p.p(fx, fy, PK1 if i % 2 else CR3)
    p.outline()
    im = p.crop()
    return ground(im, 57)


@builder('crystalspider')
def make_crystalspider():
    F = cspider_frame
    save_enemy('crystalspider', 'idle', [F(bob=(0, 0, 1, 1)[i], fang=(0, 1, 0, 1)[i], glow_=1 + (i == 2), t=i / 4) for i in range(4)], 64)
    save_enemy('crystalspider', 'movement', [F(t=i / 6, walk=4, bob=i % 2) for i in range(6)], 64)
    att = [F(bob=-1, fang=1, glow_=2),
           F(lift=0.25, front_up=0.5, fang=1, dx=-1, glow_=2, eyes=2),
           F(lift=0.5, front_up=1.0, fang=2, dx=-2, glow_=2, eyes=2, t=0.3),
           F(lift=0.45, front_up=1.0, fang=2, dx=-1, glow_=1, eyes=2, web=(47, 30, 3.5)),
           F(lift=0.35, front_up=0.8, fang=1, glow_=1, web=(56, 31, 5.5)),
           F(lift=0.15, front_up=0.3, fang=0),
           F(bob=1)]
    save_enemy('crystalspider', 'attack', att, 64)
    save_enemy('crystalspider', 'take_damage', [F(dx=-3, splay=3, fang=2, bob=-1, eyes=2, fl=(255, 255, 255)), F(dx=-2, splay=2, fang=2, eyes=2),
                                                F(dx=-1, splay=1, bob=1)], 64)
    d0 = F(dx=-3, splay=4, fang=2, bob=-2, eyes=2, glow_=2)
    q = Pic(64, 64)
    shard_burst(q, 20, 32, 10, 9, 5, 0.0, 57, (PK2, CR3, CR1))
    d1 = on(F(dx=-2, splay=6, bob=3, fang=1, eyes=0), outline_same(q.im))
    death = [d0, d1, ground(P2.rot(cspider_dead(1), -35, (30, 50)), 57), cspider_dead(1), cspider_dead(2), cspider_dead(3)]
    save_enemy('crystalspider', 'death', death, 64)


# ================================================================== ANGLERFISH (drawn, 64x64: a deep-sea angler swimming, a glowing lure on its rod)
AF = ((12, 22, 34), (26, 44, 60), (44, 72, 88), (82, 114, 122))            # dark teal hide (the leviathan's deep water)
AF_BELLY = (104, 116, 104)
MAW = (50, 12, 24)
LURE = ((190, 150, 50), (255, 228, 110), (255, 252, 220))
NEEDLE = SH2


def angler_frame(t=0.0, bob=0, dx=0, jaw=0.15, lure=1, eyes=1, sway=0.0, fl=None, lunge=0.0, bub=0, fins=1.0):
    """Facing right; jaw 0..1 opens the underbite, lure 0 (dead) .. 2 (flaring), lunge stretches it forward."""
    p = Pic(64, 64)
    cx, cy = 27 + dx + lunge * 3, 42 + bob
    wag = math.sin(t * math.tau) * 3
    # tail fin and the far pectoral fin
    p.poly([(cx - 12, cy - 2), (cx - 23, cy - 10 + wag), (cx - 20, cy + wag * 0.3), (cx - 23, cy + 9 + wag), (cx - 12, cy + 3)], AF[1])
    for k in (-1, 0, 1):
        p.l(cx - 13, cy, cx - 21, cy + k * 8 + wag * (0.8 if k else 0.3), AF[2])
    fa = math.sin(t * math.tau + 1.5) * 0.4 * fins
    p.poly([(cx - 1, cy + 4), (cx - 9, cy + 12 + fa * 6), (cx - 4, cy + 13 + fa * 5)], dark(AF[1], 0.8))
    # body: a round warty sack
    p.e(cx - 15, cy - 12, cx + 13, cy + 11, AF[0])
    p.e(cx - 14, cy - 11, cx + 12, cy + 9, AF[1])
    p.e(cx - 12, cy - 11, cx + 6, cy - 2, AF[2])
    p.e(cx - 10, cy + 3, cx + 6, cy + 10, AF_BELLY)
    p.e(cx - 9, cy + 6, cx + 5, cy + 11, dark(AF_BELLY, 0.75))
    r2 = random.Random(3)
    for _ in range(16):                                                      # warts and pale specks
        x, y = cx + r2.uniform(-12, 8), cy + r2.uniform(-10, 3)
        p.p(x, y, AF[3] if r2.random() < 0.6 else AF[0])
    for k in range(4):                                                       # dorsal spines with a ragged membrane
        x = cx - 9 + k * 3
        p.l(x, cy - 10, x - 2, cy - 15 + k % 2, AF[2])
    p.poly([(cx - 10, cy - 10), (cx - 12, cy - 14), (cx - 4, cy - 13), (cx - 1, cy - 10)], AF[1])
    # the jaws: an underbite hinged under the eye, needle teeth on both
    hx, hy = cx + 3, cy + 1
    up_tip = (cx + 15, cy - 3 - jaw * 3)
    lo_tip = (cx + 18, cy + 1 + jaw * 10)
    p.poly([(hx, hy), up_tip, lo_tip], MAW)
    if jaw > 0.3:
        p.e(hx + 1, hy - 1, hx + 7, hy + 4 + jaw * 3, (90, 20, 36))
    for k in range(5):                                                       # upper teeth hanging down
        u = (k + 1) / 6
        x, y = hx + (up_tip[0] - hx) * u, hy + (up_tip[1] - hy) * u
        ln = 2 + (k % 2) + jaw * 1.5
        p.l(x, y + 1, x + 0.5, y + ln, NEEDLE)
    for k in range(5):                                                       # lower teeth jutting up and forward
        u = (k + 1) / 6
        x, y = hx + 1 + (lo_tip[0] - hx - 1) * u, hy + 4 + (lo_tip[1] - hy - 4) * u
        ln = 2 + ((k + 1) % 2) + jaw * 2
        p.l(x, y - 1, x + 1, y - ln, NEEDLE)
    p.poly([(hx - 1, hy + 4), lo_tip, (lo_tip[0] - 2, lo_tip[1] + 3), (hx - 2, hy + 9)], AF[1])   # lower jaw
    p.l(hx, hy + 5, lo_tip[0] - 1, lo_tip[1] + 1, AF[2])
    p.poly([(cx - 2, cy - 4), (up_tip[0] - 1, up_tip[1] - 1), up_tip, (hx, hy - 1)], AF[1])        # upper lip
    p.l(cx + 2, cy - 2, up_tip[0] - 1, up_tip[1] - 1, AF[3])
    # eye
    ex, ey = cx + 7, cy - 6
    p.e(ex - 2, ey - 2, ex + 2, ey + 2, AF[0])
    if eyes:
        p.e(ex - 1.5, ey - 1.5, ex + 1.5, ey + 1.5, (226, 222, 180) if eyes == 1 else WHITE)
        p.p(ex + 1, ey, OUT)
    else:
        p.l(ex - 1, ey, ex + 1, ey, AF[2])
    # near pectoral fin
    p.poly([(cx - 3, cy + 2), (cx - 12, cy + 7 + fa * 7), (cx - 6, cy + 10 + fa * 5), (cx - 1, cy + 5)], AF[2])
    p.l(cx - 3, cy + 3, cx - 10, cy + 8 + fa * 6, AF[3])
    # the rod over the head and the bulb
    rod = bez((cx + 3, cy - 11), (cx + 13, cy - 27), (cx + 21 + sway, cy - 13 + abs(sway) * 0.5), 14)
    p.lines(rod, AF[0], 2)
    p.lines(rod[:-1], AF[3])
    lx, ly = rod[-1]
    lc = LURE if lure else ((70, 66, 50), (110, 104, 74), (140, 132, 96))
    p.e(lx - 2.5, ly - 1, lx + 2.5, ly + 4, lc[0])
    p.e(lx - 1.5, ly - 0.5, lx + 1.5, ly + 3, lc[1])
    p.p(lx - 0.5, ly + 0.5, lc[2])
    im = outline_same(cut_below(p.im, 57))
    q = Pic(64, 64)
    if lure:                                                                 # its light (not outlined)
        r = 4 + lure * 1.5
        for j in range(10 + lure * 4):
            a = j / (10 + lure * 4) * math.tau + t * 2
            q.p(lx + math.cos(a) * r, ly + 1.5 + math.sin(a) * r, LURE[1] if j % 2 else (250, 240, 170))
        if lure >= 2:
            for j in range(4):
                a = j * math.pi / 2 + 0.785
                q.l(lx + math.cos(a) * (r + 1), ly + 1.5 + math.sin(a) * (r + 1), lx + math.cos(a) * (r + 3), ly + 1.5 + math.sin(a) * (r + 3), LURE[2])
    if bub:
        bubbles(q, bub, int(t * 30) + bub, (cx - 4, cy - 14, cx + 22, cy + 8))
    im = on(im, q.im)
    if fl:
        im = flash(im, fl)
    return im


@builder('anglerfish')
def make_anglerfish():
    F = angler_frame
    save_enemy('anglerfish', 'idle', [F(t=i / 4, bob=(0, -1, -1, 0)[i], sway=(0, 1, 2, 1)[i], jaw=(0.15, 0.2, 0.25, 0.2)[i],
                                       lure=1 + (i % 2), bub=(0, 0, 2, 0)[i]) for i in range(4)], 64)
    save_enemy('anglerfish', 'movement', [F(t=i / 6, bob=(0, -1, -2, -1, 0, 1)[i], sway=-2 + math.sin(i / 6 * math.tau),
                                           dx=(0, 1, 1, 0, 0, 0)[i], fins=1.4) for i in range(6)], 64)
    att = [F(t=0.0, sway=3, lure=2, jaw=0.2, eyes=1),
           F(t=0.15, sway=2, lure=2, jaw=0.6, dx=-2, eyes=2),
           F(t=0.3, sway=0, lure=2, jaw=1.0, dx=-3, eyes=2, bub=2),
           F(t=0.45, sway=-3, lure=1, jaw=1.0, lunge=1.5, eyes=2, bub=3),
           F(t=0.6, sway=-4, lure=1, jaw=0.0, lunge=2, eyes=2, bub=5),
           F(t=0.75, sway=-1, lure=1, jaw=0.1, lunge=1),
           F(t=0.9)]
    save_enemy('anglerfish', 'attack', att, 64)
    save_enemy('anglerfish', 'take_damage', [F(t=0.2, dx=-3, jaw=0.7, eyes=2, sway=3, fl=(255, 255, 255), bub=3),
                                             F(t=0.4, dx=-2, jaw=0.5, eyes=2, sway=2, bub=2), F(t=0.6, dx=-1, jaw=0.3, sway=1)], 64)
    # death: it jerks, rolls over, the light goes out and it sinks belly up to the floor
    d0 = F(t=0.1, jaw=0.9, eyes=2, sway=4, lure=2, bub=4)
    d1 = F(t=0.3, jaw=0.6, eyes=0, sway=2, lure=1, bob=2)
    d2 = ground(F(t=0.5, jaw=0.5, eyes=0, lure=0, fins=0.2).rotate(-75, resample=Image.NEAREST, center=(30, 40)), 52)
    belly = [ground(F(t=0.5 + k * 0.1, jaw=0.4, eyes=0, lure=0, fins=0.1).transpose(Image.FLIP_TOP_BOTTOM), 57) for k in range(3)]
    q = Pic(64, 64)
    bubbles(q, 4, 9, (18, 26, 44, 44))
    save_enemy('anglerfish', 'death', [d0, d1, on(d2, q.im), shift(belly[0], 0, -3), belly[1], belly[2]], 64)


# ================================================================== WIND SPIRIT (drawn, 64x64: a whirlwind with a cloud head and a face)
STP = ((40, 44, 70), (64, 72, 106), (96, 106, 144), (140, 150, 186))      # anchored: storm slate (ST1-ST4)
FACE_H = (40, 46, 80)


def wind_frame(t=0.0, bob=0, lean=0.0, cheeks=0.0, blow=0.0, eyes=1, fl=None, dx=0, scatter=0.0, anchored=0.0, mist=0,
               arms=0.0):
    """cheeks 0..1 inhale, blow 0..1 the gust, scatter 0..1 breaking apart, anchored 0..1 drilled into the floor (darker,
    denser, the funnel down to the floor)."""
    p = Pic(64, 64)
    pal = STP if anchored >= 1 else CG
    cx, hy = 30 + dx, 19 + bob + scatter * 10
    ph = t * math.tau
    top = 27 + bob + scatter * 14
    tip = 51 + bob * 0.5 + anchored * 6
    if anchored:
        tip = 57
    # the funnel: a twisting column narrowing to a point, spiral bands winding down it, ragged edges
    if scatter < 0.95:
        rows = list(range(int(top), int(tip) + 1))
        for y in rows:
            u = min(1.0, max(0.0, (y - top) / max(1, tip - top)))
            w = (10 - 8.8 * u ** 0.85) * (1 - scatter * 0.5) * (1 + 0.14 * math.sin(y * 0.9 - ph * 2))
            xc = cx - 1 + math.sin(ph + u * 5) * 3.0 * u + lean * (1 - u) * 0.6
            for x in range(int(round(xc - w)), int(round(xc + w)) + 1):
                d = (x - xc) / max(1, w)
                c = pal[1]
                if d < -0.65:
                    c = pal[0]
                elif d > 0.4:
                    c = pal[2]
                band = ((x - xc) * 1.3 + y * 0.9 - t * 18 + d * d * 3) % 6.5
                if band < 1.1:
                    c = pal[3] if anchored >= 1 else WHITE
                elif 3.2 < band < 4.0:
                    c = pal[0]
                p.p(x, y, c)
    # wisps curling at its sides (its 'hands')
    for k, (ox, oy) in enumerate(((-11, 10), (11, 9))):
        a = ph + k * math.pi
        x = cx + ox + math.cos(a) * 1.5 + (arms * 4 if k else -arms * 2)
        y = hy + oy + math.sin(a) * 1.5 - arms * 3
        x, y = x + (x - cx) * scatter, y + scatter * scatter * 18
        puff(p, x, y, 2.8 - scatter, pal)
        sgn = 1 if k else -1
        p.arc(x - 3 + sgn * 2, y - 4, x + 3 + sgn * 2, y + 2, 200 if k else -20, 380 if k else 160, pal[2])
    # head: a cloud swelling on the inhale, its back streaming away into the wind like a comet
    sw = 1 + cheeks * 0.15
    for j, (ox, oy, r) in enumerate(((-17, -7, 2.2), (-13, -4, 3.2), (-8, -2, 4.6), (-3, -4, 6), (2, 1, 6.5), (5, -4, 4.5), (-1, 5, 5))):
        x, y = cx + ox * sw + lean * 0.5, hy + oy * sw
        x, y = x + (x - cx) * scatter * 1.2, y + scatter * scatter * 16
        puff(p, x, y, r * sw * (1 - scatter * 0.4), pal)
    for j in range(3):                                                     # streaks trailing back from the head
        y0 = hy - 8 + j * 4 + math.sin(ph + j) * 0.8
        pts = [(cx - 6 - k * 2.2, y0 + math.sin(k * 0.9 + ph + j) * 1.2 - k * 0.3) for k in range(8 - j)]
        pts = [(x + (x - cx) * scatter, y + scatter * scatter * 16) for x, y in pts]
        p.lines(pts, pal[2] if j != 1 else pal[3])
    if scatter < 0.4:                                                      # the face
        fx = cx + 2 + lean * 0.5
        fy = hy
        ec = (LT2 if anchored < 1 else LT1) if eyes == 1 else WHITE if eyes == 2 else pal[0]
        for ex in (fx, fx + 5):
            p.e(ex - 1, fy - 3, ex + 1.5, fy + 1, FACE_H if anchored < 1 else (16, 18, 34))
            if eyes:
                p.p(ex, fy - 1, ec); p.p(ex + 1, fy - 1, ec if eyes == 2 else LT1)
        p.l(fx - 2, fy - 4, fx + 1, fy - 5, pal[0]); p.l(fx + 4, fy - 5, fx + 7, fy - 4, pal[0])    # brows
        mx, my = fx + 3, fy + 4
        if blow:
            r = 1.8 + blow
            p.e(mx - r + 1, my - r, mx + r + 1, my + r, pal[0]); p.e(mx - r + 2, my - r + 1, mx + r, my + r - 1, FACE_H)
        elif cheeks:
            p.e(mx - 2 - cheeks * 2, my - 2, mx - cheeks * 1.5 + 1, my + 2, pal[3])     # puffed cheek
            p.e(mx + 1, my - 1, mx + 3, my + 1, pal[0])
        else:
            p.e(mx - 1, my - 1, mx + 2, my + 2, FACE_H)
    for i in range(mist):                                                  # what is left: a flat mist on the floor
        puff(p, 12 + i * 8, 55, 3, CGD)
    im = outline_same(cut_below(p.im, 57))
    if not anchored:
        im = dither_fade(im, int(top) + 4, int(tip) + 1, 0.12, 0.72, int(t * 4))
    if scatter:
        im = dither_fade(im, 0, 57, scatter * 0.5, scatter * 0.6)
    q = Pic(64, 64)
    r2 = random.Random(int(t * 20) + 1)
    for j in range(3):                                                     # loose gust lines circling it (not outlined)
        y = top + 4 + j * 7 + r2.uniform(-1, 1)
        w = 13 - j * 2.5
        xc = cx + math.sin(ph + j) * 2
        a0 = (t * 360 + j * 120) % 360
        q.arc(xc - w, y - 2, xc + w, y + 2, a0, a0 + 150, pal[3] if anchored >= 1 else WHITE)
    if anchored:                                                           # dust whirled up where it grips the floor
        q.arc(cx - 9, 54, cx + 9, 58, 180 + t * 200, 330 + t * 200, ASH3)
        for j in range(4):
            q.p(cx - 8 + j * 5 + (t * 7) % 3, 52 - (j % 2) * 3, ASH2)
    if blow:
        wind_streaks(q, cx + 10, hy + 5, 66, 3, 3 + int(blow * 10), blow, 16)
    im = on(im, q.im)
    if fl:
        im = flash(im, fl)
    return im


@builder('windspirit')
def make_windspirit():
    F = wind_frame
    save_enemy('windspirit', 'idle', [F(t=i / 4, bob=(0, -1, -1, 0)[i], arms=(0, 0.3, 0.5, 0.3)[i]) for i in range(4)], 64)
    save_enemy('windspirit', 'movement', [F(t=i / 6, bob=(0, -1, -1, 0, 1, 1)[i], lean=2, dx=(0, 1, 1, 1, 0, 0)[i]) for i in range(6)], 64)
    att = [F(t=0.0, lean=-2, cheeks=0.4, arms=0.5), F(t=0.15, lean=-3, cheeks=0.8, eyes=2, arms=0.8), F(t=0.3, lean=-3, cheeks=1.0, eyes=2, arms=1.0),
           F(t=0.45, lean=2, blow=0.7, eyes=2, arms=0.3), F(t=0.6, lean=3, blow=1.0, eyes=2), F(t=0.75, lean=2, blow=0.5), F(t=0.9)]
    save_enemy('windspirit', 'attack', att, 64)
    save_enemy('windspirit', 'take_damage', [F(t=0.2, dx=-3, eyes=2, fl=(255, 255, 255), scatter=0.08), F(t=0.4, dx=-2, eyes=2, scatter=0.04),
                                             F(t=0.6, dx=-1)], 64)
    save_enemy('windspirit', 'death', [F(t=0.0, eyes=2, cheeks=0.6, lean=-2), F(t=0.2, eyes=0, scatter=0.25),
                                       F(t=0.4, eyes=0, scatter=0.5), F(t=0.6, eyes=0, scatter=0.75, mist=3),
                                       F(t=0.8, eyes=0, scatter=0.97, mist=5), F(t=1.0, eyes=0, scatter=1.0, mist=6)], 64)
    save_enemy('windspirit', 'anchored', [F(t=0.0, anchored=0.6, eyes=2, arms=-0.3), F(t=0.33, anchored=1.0, arms=-0.5),
                                          F(t=0.66, anchored=1.0, arms=-0.4, bob=1)], 64)


# ================================================================== CONTACT SHEET
def make_sheet():
    man = _manifest()
    font = ImageFont.load_default()

    def order(kv):
        p = kv[0]
        g = 1 if 'enemies' in p else 2 if 'prop_' in p else 3
        return (g, p)
    items = []
    for path, (n, add) in sorted(man.items(), key=order):
        if not os.path.exists(path):
            continue
        im = Image.open(path).convert('RGBA')
        name = os.path.basename(path)
        sc = 2 if name.startswith(('enemies', 'prop_arenagate')) else 4 if name.startswith('part_') else 3
        while im.width * sc > 1780 and sc > 1:
            sc -= 1
        items.append((path, n, add, im, sc))
    W = 1800
    x, y, rowh = 8, 8, 0
    places = []
    for path, n, add, im, sc in items:
        w, h = im.width * sc, im.height * sc
        lw = len(os.path.basename(path)) * 6 + 70
        cw = max(w, lw)
        if x + cw > W - 8:
            x, y, rowh = 8, y + rowh + 22, 0
        places.append((path, n, add, im, sc, x, y + 14))
        x += cw + 14
        rowh = max(rowh, h + 14)
    H = y + rowh + 12
    c = Image.new('RGBA', (W, H), (104, 104, 104, 255))
    d = ImageDraw.Draw(c)
    for path, n, add, im, sc, x, y in places:
        fw = im.width // n
        lab = f'{os.path.basename(path)[:-4]} {n}f {fw}x{im.height}' + (' additive' if add else '')
        d.text((x, y - 13), lab, fill=(255, 255, 255, 255), font=font)
        big = im.resize((im.width * sc, im.height * sc), Image.NEAREST)
        if add:
            c.paste((0, 0, 0, 255), (x, y, x + big.width, y + big.height))
        else:
            for i in range(n):
                c.paste((92, 92, 92, 255), (x + i * fw * sc, y, x + (i + 1) * fw * sc - (2 if n > 1 else 0), y + big.height))
        if os.path.basename(path).startswith('enemies'):                  # the feet row
            for i in range(n):
                d.line((x + i * fw * sc, y + 58 * sc - 1, x + (i + 1) * fw * sc - 3, y + 58 * sc - 1), fill=(80, 80, 80, 255))
        c.alpha_composite(big, (x, y))
    c.convert('RGB').save(SHEET)
    print('sheet', SHEET, c.size)


def check_outputs():
    """Style rules: every pixel fully opaque or fully transparent, strips divide evenly into their frames, nothing
    below the feet row of enemy cells."""
    bad = []
    for path, (n, add) in SAVED.items():
        im = Image.open(path).convert('RGBA')
        a = np.array(im)[:, :, 3]
        if not np.isin(a, (0, 255)).all():
            bad.append(path)
        if im.width % n:
            print('UNEVEN STRIP:', path, im.size, n)
        if 'enemies-' in path and a[58:].any():
            print('BELOW FEET:', path)
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
