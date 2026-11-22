#!/usr/bin/env python3
"""Version 16 graphics for Krypta ("Trädgården och Drömriket"): the dead garden and the dream realm, six new enemies,
the head gardener and Jon Blund (the sandman), textures, props, items, particles and HUD icons.

Run from the folder that holds retrofps/ and assets/ (e.g. /home/user/test):
    python3 retrofps/tools/props13/make.py [name ...]
(with names only those builders run, e.g. `python3 retrofps/tools/props13/make.py angel sheet`; the contact sheet
always shows everything this script has written so far, plus the two new first-person weapons)

The first-person weapons shears / dreamstaff (fp_*.png, js/weapons.js) come from tools/weapon-frames (render-static.mjs
+ pack.py, see the README there, version 16); their static-defs.json entries are built by tools/props13/fp_defs.py.

Out to retrofps/assets/gfx (all enemy cells 64x64, feet row 57, facing right; frames idle 4, movement 6, attack 6,
take_damage 3, death 6; every death ends lying / settled on the floor):
  enemies-weepingangel_*   a grey stone angel with folded wings; idle is a statue with its hands over its face (all four
                           frames the same pose: the game shows idle while it is watched), attack a claw swipe with the
                           mouth torn open, death crumbles into rubble
  enemies-thornvine_*      a rooted bramble with a thorny bud-maw; its root sits at x 24 in every frame, movement sways,
                           attack lashes a tendril out to the right edge of the cell
  enemies-gardener_*       a zombie farmhand in a straw hat with big shears
  enemies-dreameater_*     a floating tapir/eel of shadow (drawn low in the cell, the game lifts `float` enemies), its trunk
                           sucks light motes in on the attack; death sinks to a dark smear on the floor
  enemies-shadowtwin_*     (the 'Ư' SPEGLING: enemies-doppelganger_* already exists - it is the 'Ô' DUBBELGÅNGARE - so this
                           sheet has a new name) a dark silhouette of the player with a pistol; attack = shot with a flash
  enemies-sleepwalker_*    a slow figure in a nightgown and nightcap, arms forward, eyes shut; death bursts into purple
                           sleep powder and leaves the empty nightgown
  boss_gardener_{idle,attack,cast,hurt,death}.png, boss_sandman_{...}.png (116x116 cells, feet row 115; idle 5, attack 6,
      cast 6, hurt 3, death 7; attack and cast loop while the state lasts, so they start and end in similar poses).
      The head gardener's attack is a lunge with the hedge shears snapping, cast throws seeds and thorns; Jon Blund's
      attack strews sand from his bag, cast is the blink (he folds into his star cloak and sparkles - he never vanishes
      from a frame, the game moves him itself).
  prop_fountain.png (2: water / dry), prop_statue2.png (1), prop_falsedoor.png (2: shut / open with darkness and eyes),
  prop_dreamlamp.png (3, animated), item_dreamflask.png, pick_shears.png, pick_dreamstaff.png,
  part_petal.png (2, 8x8), part_dreamsand.png (2, 6x6), icon_mist.png, icon_thorns.png (8x8, white)
Out to retrofps/assets/wall:
  wall_hedge, wall_gardenwall, wall_boss_gardener, wall_dream, wall_dreamshift, wall_boss_sandman (64x128)
  floor_garden, floor_dream, floor_boss_gardener, floor_boss_sandman, floor_thorns, floor_dreammist (64x64)
Contact sheet: <scratchpad>/en/v16_sheet.png

Sources (licences checked; everything not listed is drawn procedurally below in the outlined style of
tools/props2-props12, whose helpers are reused):
  * Classic 64 Asset Pack 0.6 (Craig Snedeker, CC0): Ground/gravel_0 (the grain of the garden gravel),
    Rocks/rock_wall_2 (the grain of the garden wall stone)
Drawn: all six enemies, both bosses, every texture, all props, items, particles and icons.
Name clashes (existing files are never overwritten, save() refuses): enemies-doppelganger_*.png already exists (the 'Ô'
DUBBELGÅNGARE), so the 'Ư' SPEGLING sheet is enemies-shadowtwin_*.png (game.js: sheet 'shadowtwin').
Suggested sizes (apparent height = size x figure px / cell px; the v15 flagellant is 1.05 x 49/64): weepingangel 1.1 (53 px
of 64 with the wing tips), thornvine 1.1 (51 px), gardener 1.0 (53 px with the hat), dreameater 1.0 (30 px tall, 51 long),
shadowtwin 1.05 (51 px), sleepwalker 1.05 (54 px with the cap); bosses (116 px cells, the cardinal is 113 px at 4.0):
gardener 4.0 (114 px with the hat, 92 px wide), sandman 4.0 (113 px with the top hat).
Notes: floor_thorns is floor_garden (same array) darkened and overgrown, floor_dreammist is floor_dream (same array) under
the mist, so they sit next to their plain floors; wall_dreamshift has the wall_dream swirls and eyes but bright magenta and
teal, smeared into streaks with chevrons, so the moving walls stand out from the still ones at a distance.
"""
import importlib.util
import json
import math
import os
import random
import re
import sys

sys.dont_write_bytecode = True          # the helper modules of props2-props12 are loaded without writing __pycache__

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))


def _load(name, rel):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, '..', rel, 'make.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


P12 = _load('props12make', 'props12')          # loads props2-props10 itself
P2, P3, P5, P6, P7, P8, P10 = P12.P2, P12.P3, P12.P5, P12.P6, P12.P7, P12.P8, P12.P10
from_p2 = 'OUT Pic outline outline_same hard shift gmap tile_lum blend mask_draw glow tint shear squash strip'.split()
globals().update({k: getattr(P2, k) for k in from_p2})
cut_below, topple, pool, smoke_wisp, lace_hem = P12.cut_below, P12.topple, P12.pool, P12.smoke_wisp, P12.lace_hem
pnoise, up2, spark = P5.pnoise, P5.up2, P5.spark
dark, flash, tube, bez = P6.dark, P6.flash, P6.tube, P6.bez
puff, wrap_outline = P7.puff, P7.wrap_outline
chain, sparkles = P8.chain, P8.sparkles
paste_wrap = P12.paste_wrap
flame, candle, halo, tone, put = P10.flame, P10.candle, P10.halo, P10.tone, P10.put
I0, I1, I2, I3 = P2.I0, P2.I1, P2.I2, P2.I3
F0, F1, F2, F3 = P2.F0, P2.F1, P2.F2, P2.F3
AU0, AU1, AU2, AU3, AU4 = P5.AU0, P5.AU1, P5.AU2, P5.AU3, P5.AU4                # gold
BR0, BR1, BR2, BR3, BR4 = P7.BR0, P7.BR1, P7.BR2, P7.BR3, P7.BR4                # brass
WD0, WD1, WD2, WD3, WD4 = P10.WD0, P10.WD1, P10.WD2, P10.WD3, P10.WD4           # dark wood
SKN = P12.SKN

A = 'assets/'
C64 = A + 'textures/Classic 64 Asset Pack 0.6/- Classic 64 Asset Pack 0.6/'
G_OUT, W_OUT = 'retrofps/assets/gfx/', 'retrofps/assets/wall/'
SCR = '/tmp/claude-0/-home-user/80ee56ba-2fa6-5354-b261-a4ca4fdcb508/scratchpad/en/'
SHEET, MANIFEST = SCR + 'v16_sheet.png', SCR + 'v16_manifest.json'
WHITE = (255, 255, 255)
FW, FEET = 64, 57                                       # enemy cells
BS, BS_FEET = 116, 115                                  # boss cells (as boss_cardinal_*)

# ---------------------------------------------------------------- garden palettes
ST = ((38, 40, 46), (70, 72, 80), (106, 108, 114), (146, 148, 150), (188, 188, 184))        # weathered grey stone
ST_STOPS = [(0, ST[0]), (0.3, ST[1]), (0.6, ST[2]), (0.85, ST[3]), (1, ST[4])]
MS = ((30, 48, 24), (56, 86, 36), (92, 126, 52), (136, 166, 74))                             # moss
HG = ((12, 26, 16), (22, 46, 26), (38, 72, 36), (62, 102, 48), (100, 140, 66), (150, 180, 96))   # hedge greens
HG_STOPS = [(0, HG[0]), (0.25, HG[1]), (0.5, HG[2]), (0.72, HG[3]), (0.9, HG[4]), (1, HG[5])]
DB = ((46, 32, 20), (84, 60, 34), (126, 96, 56), (166, 136, 88))                             # dead leaves / dry stems
SW = ((112, 82, 30), (170, 132, 56), (214, 180, 94), (242, 220, 150))                        # straw
ZS = ((58, 66, 50), (94, 106, 78), (132, 144, 106), (170, 178, 138))                         # grey-green zombie skin
DEN = ((34, 40, 58), (54, 64, 90), (80, 94, 126), (112, 128, 158))                          # faded denim / overalls
RU = ((30, 24, 20), (64, 48, 36), (96, 74, 52), (128, 102, 74))                              # rags / soil brown
STEEL = ((52, 56, 64), (98, 104, 116), (156, 164, 176), (214, 220, 228), (246, 248, 252))    # shear blades
BRK = ((52, 26, 20), (90, 44, 32), (130, 66, 44), (166, 96, 66), (196, 130, 96))             # old brick
ROSE = ((96, 14, 30), (150, 24, 44), (204, 52, 70), (240, 120, 130))                         # dark red roses / berries
# ---------------------------------------------------------------- dream palettes
DP = ((14, 6, 24), (36, 16, 58), (70, 34, 106), (118, 66, 164), (176, 124, 220), (226, 196, 252))   # dream purple
DP_STOPS = [(0, DP[0]), (0.3, DP[1]), (0.55, DP[2]), (0.78, DP[3]), (0.92, DP[4]), (1, DP[5])]
TL = ((10, 34, 44), (20, 70, 84), (40, 120, 132), (90, 190, 190), (180, 246, 236))         # dreamshift teal shimmer
PK = ((70, 10, 52), (136, 30, 110), (204, 70, 170), (246, 150, 220), (255, 218, 246))        # dreamshift magenta
NB = ((8, 10, 30), (20, 26, 64), (36, 48, 104), (62, 82, 150), (110, 134, 198))             # night blue (the sandman)
SD = ((140, 100, 44), (204, 162, 84), (238, 210, 134), (255, 242, 196))                     # golden sand
SH = ((6, 4, 12), (18, 14, 30), (34, 28, 54), (60, 50, 92))                                   # shadow (the twin, the eater)
RIM = ((110, 86, 180), (168, 140, 236), (228, 214, 255))                                      # its lilac rim light
NG = ((112, 116, 134), (170, 174, 190), (210, 214, 226), (238, 240, 248))                    # nightgown linen
SLP = ((70, 30, 110), (130, 70, 190), (186, 130, 236), (232, 200, 255))                      # sleep powder
EYE = ((250, 244, 220), (200, 180, 120))                                                       # eye whites

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


EDGE = []


def check_cell(f, tag, fw, floor, allow_top=False):
    """Collect figures that touch the cell's sides or top (clipped) - printed at the end."""
    b = f.getbbox()
    if not b:
        EDGE.append((tag, 'empty'))
        return
    if b[0] == 0 or b[2] == fw or (b[1] == 0 and not allow_top):
        EDGE.append((tag, b))


def save_enemy(sheet, state, frames, fw=FW, floor=FEET):
    """fw x fw cells, nothing below the feet row, hard alpha; frames that float above the floor stay where they are
    (the feet row is only enforced downwards)."""
    out = Image.new('RGBA', (fw * len(frames), fw), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        assert f.size == (fw, fw), (sheet, state, f.size)
        f = cut_below(f, floor)
        check_cell(f, f'{sheet}_{state}_{i}', fw, floor)
        out.paste(hard(f), (i * fw, 0))
    save(out, G_OUT + f'enemies-{sheet}_{state}.png', len(frames))


def save_boss(name, state, frames):
    out = Image.new('RGBA', (BS * len(frames), BS), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        assert f.size == (BS, BS), (name, state, f.size)
        f = cut_below(f, BS_FEET)
        check_cell(f, f'boss_{name}_{state}_{i}', BS, BS_FEET)
        out.paste(hard(f), (i * BS, 0))
    save(out, G_OUT + f'boss_{name}_{state}.png', len(frames))


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


def poly_r(p, pts, c, cx, cy, a):
    """Polygon rotated by a round (cx, cy)."""
    ca, sa = math.cos(a), math.sin(a)
    p.poly([(cx + (x - cx) * ca - (y - cy) * sa, cy + (x - cx) * sa + (y - cy) * ca) for x, y in pts], c)


def limb(p, pts, w, c, hi=None):
    """A limb along a polyline with a lighter line along its upper edge."""
    p.lines(pts, c, w)
    for (x, y) in pts:
        p.e(x - w / 2 + 0.5, y - w / 2 + 0.5, x + w / 2 - 0.5, y + w / 2 - 0.5, c)
    if hi:
        p.lines([(x, y - w / 2 + 1) for x, y in pts], hi)


def dust(p, n, seed, box, pal):
    """Specks scattered in the box (rubble dust, chips, powder)."""
    r2 = random.Random(seed)
    x0, y0, x1, y1 = box
    for _ in range(n):
        x, y = r2.uniform(x0, x1), r2.uniform(y0, y1)
        if r2.random() < 0.3:
            p.r(x, y, x + 1, y + 1, pal[0])
            p.p(x, y, pal[-1])
        else:
            p.p(x, y, r2.choice(pal))


def crumble(im, k, seed, floor=FEET, pal=ST):
    """A stone figure breaking up: pixels above a falling line drop away as chips (k 0..1)."""
    a = np.array(im).copy()
    h, w = a.shape[:2]
    r2 = np.random.default_rng(seed)
    solid = a[:, :, 3] > 0
    gone = solid & (r2.random((h, w)) < k * 0.9) & (np.arange(h)[:, None] < floor - (1 - k) * 4)
    a[gone] = 0
    return Image.fromarray(a)


# ================================================================== WEEPING ANGEL (drawn, 64x64: a grey stone angel)
def angel_wing(p, x, y, lift=0.0, far=False, crack=0):
    """A folded stone wing rooted at the shoulder (x, y), its tip rising behind the head and falling to the hem: long
    overlapping flight feathers in grey stone; lift 0 folded .. 1 half spread (raised and pushed back)."""
    c0, c1, c2, c3 = (ST[0], ST[1], ST[1], ST[2]) if far else (ST[1], ST[2], ST[3], ST[4])
    wr = (x - 3 - lift * 8, y - 15 - lift * 6)                                 # the wrist: the wing's high point
    bk = (x - 11 - lift * 10, y - 9 - lift * 4)                                # where the arm of the wing bends back
    # long flight feathers hanging from the back edge, each a strip with a dark parting
    for k in range(6):
        t = k / 5
        rx, ry = bk[0] + (x - 2 - bk[0]) * t, bk[1] + (y + 6 - bk[1]) * t
        ln = 27 - lift * 10 - t * 15
        tx, ty = rx - 2 - lift * 4 + t * 2, ry + ln
        p.poly([(rx - 2, ry), (rx + 2.5, ry), (tx + 1.5, ty - 2), (tx, ty), (tx - 1.5, ty - 2)], c1 if k % 2 else c2)
        p.l(rx - 2, ry + 1, tx - 1.5, ty - 2, c0)
    # the covert feathers: a rounded shoulder of the wing
    p.poly([(x + 2, y + 3), (x, y - 8), wr, (wr[0] - 5, wr[1] - 1), bk, (bk[0] + 1, bk[1] + 6), (x - 8, y + 6), (x - 2, y + 8)], c2)
    for k in range(3):                                                         # rows of scalloped coverts
        yy_ = bk[1] + 6 + k * 4
        for j in range(4):
            xx_ = bk[0] + 3 + j * 3 + k * 1.5
            p.arc(xx_ - 2, yy_ - 2, xx_ + 2, yy_ + 2, 20, 160, c1)
    p.lines([(x, y - 8), wr, (wr[0] - 5, wr[1] - 1), bk], c3)                   # the lit leading edge
    p.l(wr[0] - 1, wr[1] + 1, wr[0] - 4, wr[1] + 1, c3)
    if crack:
        p.lines([(x - 4, y - 6), (x - 7, y + 2), (x - 6, y + 8), (x - 10, y + 14)], ST[0])


def angel_raw(pose='hide', step=0.0, bob=0, dx=0, lean=0.0, mouth=0, claw=0.0, wing=0.0, crack=0, sink=0, head=0.0):
    """Side view facing right: a weathered grey stone angel in a long robe, two folded wings, a bowed head with blank
    eyes. pose 'hide' = both hands over the face (the statue), 'reach' = arms out in front, claws spread,
    'swipe' = one arm raised high (claw 0 drawn back .. 1 slashed down) with the mouth torn open (mouth 0..2)."""
    p = Pic(64, 64)
    cx = 31 + dx
    base = FEET
    top = 11 + bob + sink
    sh = top + 15                                                             # shoulders
    hx, hy = cx + 2 + lean, top + 7                                           # head
    # far wing
    angel_wing(p, cx - 4 + lean, sh - 3, wing + 0.1, True)
    # robe to the floor, sweeping out at the hem
    sw = step * 2
    hem = base
    p.poly([(cx - 5 + lean, sh), (cx + 6 + lean, sh), (cx + 10 + sw, hem), (cx - 11 + sw, hem)], ST[2])
    p.poly([(cx - 4 + lean, sh), (cx + lean, sh), (cx - 5 + sw, hem), (cx - 10 + sw, hem)], ST[3])
    for k, kx in enumerate((-6, -1, 4)):                                       # deep stone folds
        p.l(cx + kx * 0.4 + lean, sh + 6, cx + kx + sw * (1 + k * 0.3), hem, ST[1])
    p.l(cx + 2 + lean, sh + 8, cx + 7 + sw, hem - 1, ST[4])
    p.l(cx - 11 + sw, hem, cx + 10 + sw, hem, ST[1])
    for x in (cx + 2 + sw, cx + 6 + sw):                                      # bare stone toes under the hem
        p.r(x, hem - 1, x + 2, hem, ST[3])
    p.poly([(cx - 6 + lean, sh + 10), (cx + 7 + lean, sh + 10), (cx + 7 + lean * 0.8, sh + 12), (cx - 6 + lean * 0.8, sh + 12)], ST[1])  # girdle
    # moss creeping up from the hem
    r2 = random.Random(5)
    for i in range(9):
        x = cx - 10 + sw + r2.uniform(0, 20)
        h_ = r2.uniform(2, 6)
        p.l(x, hem - 1, x + r2.uniform(-1, 1), hem - h_, MS[1] if i % 3 else MS[2])
    # near wing
    angel_wing(p, cx - 1 + lean, sh, wing, False, crack)
    # head: a bowed head with hair in stone curls
    p.e(hx - 6, hy - 6, hx + 6, hy + 7, ST[2])
    p.e(hx - 4, hy - 5, hx + 5, hy + 5, ST[3])
    p.poly([(hx + 4, hy - 2), (hx + 8, hy + 2), (hx + 5, hy + 3)], ST[3])    # the nose in profile
    p.poly([(hx + 2, hy + 5), (hx + 6, hy + 5), (hx + 4, hy + 8), (hx, hy + 8)], ST[2])   # chin
    p.poly([(hx - 7, hy + 4), (hx - 7, hy - 4), (hx - 3, hy - 7), (hx + 3, hy - 7), (hx + 5, hy - 4), (hx + 1, hy - 3), (hx - 3, hy + 4)], ST[2])
    for (u, v) in ((-5, -4), (-2, -6), (1, -6)):                           # stone curls
        p.arc(hx + u - 1, hy + v - 1, hx + u + 2, hy + v + 2, 180, 360, ST[4])
    face = pose != 'hide'
    if face:
        ex, ey = hx + 3, hy - 1
        p.e(ex - 1, ey - 1, ex + 2, ey + 1, ST[0])                            # blank, hollow eyes
        p.p(ex + 1, ey, (10, 10, 12))
        p.l(hx + 5, hy - 1, hx + 7, hy + 2, ST[3])                            # nose
        if mouth:
            mh = 1 + mouth * 2
            p.e(hx + 2, hy + 3, hx + 7, hy + 3 + mh, (12, 8, 10))             # the mouth torn open
            for k in range(3):
                p.l(hx + 3 + k * 1.5, hy + 3, hx + 3 + k * 1.5, hy + 4, ST[4])   # stone fangs
                p.l(hx + 3 + k * 1.5, hy + 3 + mh, hx + 3 + k * 1.5, hy + 2 + mh, ST[4])
        else:
            p.l(hx + 3, hy + 4, hx + 6, hy + 4, ST[1])
    if crack:
        p.lines([(hx - 1, hy - 7), (hx + 1, hy - 2), (hx - 1, hy + 2)], ST[0])
        p.lines([(cx + 2, sh + 14), (cx + 4, sh + 20), (cx + 2, sh + 26), (cx + 5, sh + 31)], ST[0])
    # arms
    s1 = (cx + 3 + lean, sh + 2)
    s2 = (cx - 1 + lean, sh + 2)
    if pose == 'hide':                                                         # both forearms up, hands over the face
        for (s, c, hi) in ((s2, ST[1], None), (s1, ST[2], ST[3])):
            e_ = (s[0] + 6, s[1] + 7)
            hnd = (hx + 5, hy + (0 if hi else 2))
            limb(p, [s, e_, hnd], 4, c, hi)
            for k in range(4):                                                 # fingers spread over the eyes and mouth
                fy = hnd[1] - 5 + k * 2
                p.l(hnd[0] - 2, fy, hnd[0] + 3, fy - 1, ST[4] if hi else ST[2])
            p.e(hnd[0] - 3, hnd[1] - 2, hnd[0] + 2, hnd[1] + 3, ST[3] if hi else ST[2])
    elif pose == 'reach':                                                      # arms out in front, claws spread
        for (s, c, hi, o) in ((s2, ST[1], None, -2), (s1, ST[2], ST[3], 2)):
            e_ = (s[0] + 8, s[1] + 4 + o)
            hnd = (s[0] + 17 + claw * 2, s[1] + 2 + o)
            limb(p, [s, e_, hnd], 4, c, hi)
            for k in range(3):                                                 # long stone claws
                p.l(hnd[0], hnd[1] - 1 + k, hnd[0] + 4, hnd[1] - 2 + k * 2.2, ST[4] if hi else ST[2])
    else:                                                                      # 'swipe'
        e_ = (s2[0] + 8, s2[1] + 6)
        limb(p, [s2, e_, (s2[0] + 15, s2[1] + 4)], 4, ST[1])
        a = -2.2 + claw * 2.9                                                  # raised back over the head .. slashed down
        el = (s1[0] + math.cos(a) * 8, s1[1] + math.sin(a) * 8)
        hnd = (el[0] + math.cos(a + 0.5) * 9, el[1] + math.sin(a + 0.5) * 9)
        limb(p, [s1, el, hnd], 4, ST[2], ST[3])
        for k in (-0.45, 0, 0.45):
            b = a + 0.5 + k
            p.l(hnd[0], hnd[1], hnd[0] + math.cos(b) * 7, hnd[1] + math.sin(b) * 7, ST[4], 1)
    return outline_same(cut_below(p.im, FEET))


def claw_streak(k, x, y, size=64):
    """White slash streaks of the claw swipe (k 0..1 how far down the arc)."""
    q = Pic(size, size)
    for j in range(3):
        r = 12 + j * 3
        q.arc(x - r, y - r, x + r, y + r, -70 + k * 40, 30 + k * 70, (236, 236, 244) if j != 1 else (180, 184, 196))
    return q.im


def angel_rubble(k):
    """The angel has crumbled into a heap of grey rubble: a broken wing on top, the head rolled off (k 0..2)."""
    p = Pic(64, 64)
    f = FEET
    p.poly([(8, f), (14, f - 7), (24, f - 11), (36, f - 10), (46, f - 6), (54, f)], ST[1])
    r2 = random.Random(40)
    for i in range(16):                                                        # blocks and chunks
        x, y = r2.uniform(12, 50), f - r2.uniform(1, 9)
        s = r2.uniform(2, 4.5)
        p.poly([(x - s, y + s * 0.6), (x - s * 0.6, y - s * 0.7), (x + s * 0.7, y - s * 0.6), (x + s, y + s * 0.5)], ST[2] if i % 3 else ST[3])
        p.l(x - s * 0.6, y - s * 0.7, x + s * 0.7, y - s * 0.6, ST[4])
    p.poly([(16, f - 10), (22, f - 18), (34, f - 16), (38, f - 11), (28, f - 9)], ST[2])   # the broken wing
    for j in range(4):
        p.l(18 + j * 4, f - 12 - j, 24 + j * 4, f - 10, ST[1])
    p.l(22, f - 18, 34, f - 16, ST[4])
    hx = 50 + k
    p.e(hx - 4, f - 8, hx + 4, f, ST[2]); p.e(hx - 3, f - 7, hx + 2, f - 2, ST[3])   # the head, face up
    p.p(hx, f - 5, ST[0]); p.p(hx + 2, f - 5, ST[0])
    q = Pic(64, 64)
    if k < 2:
        dust(q, 14 - k * 6, 50 + k, (6, f - 18 + k * 6, 58, f - 2), (ST[2], ST[3], ST[4]))
    for i in range(5):
        x = 12 + i * 9
        q.l(x, f - 1, x + 1, f - 3 - (i % 2), MS[1])
    return on(outline_same(cut_below(p.im, f)), q.im)


def angel_frame(fl=None, streak=None, chips=0, seed=0, **kw):
    im = angel_raw(**kw)
    if streak is not None:
        im = on(im, outline_same(claw_streak(streak, 40 + kw.get('dx', 0), 22)))
    if chips:
        q = Pic(64, 64)
        dust(q, chips, seed, (30, 10, 62, 50), (ST[2], ST[3], ST[4]))
        im = on(im, q.im)
    if fl:
        im = flash(im, fl)
    return im


@builder('angel')
def make_angel():
    A_ = angel_frame
    # idle: the statue, hands over its face - the same pose in every frame (it is what the player sees while watching)
    save_enemy('weepingangel', 'idle', [A_(pose='hide') for i in range(4)])
    save_enemy('weepingangel', 'movement', [A_(pose='reach', step=math.sin(i / 6 * math.tau), dx=(i % 3) - 1, lean=1, claw=(i % 2) * 0.5,
                                              wing=0.15, mouth=(0, 0, 1, 0, 0, 1)[i]) for i in range(6)])
    save_enemy('weepingangel', 'attack', [A_(pose='swipe', claw=0.0, lean=-1, wing=0.2, mouth=1),
                                         A_(pose='swipe', claw=0.15, lean=-1, wing=0.3, mouth=2, dx=1),
                                         A_(pose='swipe', claw=0.55, lean=1, wing=0.35, mouth=2, dx=1, streak=0.2),
                                         A_(pose='swipe', claw=1.0, lean=2, wing=0.3, mouth=2, dx=1, streak=0.8),
                                         A_(pose='swipe', claw=0.9, lean=1, wing=0.2, mouth=1, dx=1),
                                         A_(pose='reach', claw=0.0, wing=0.2, mouth=0)])
    save_enemy('weepingangel', 'take_damage', [A_(pose='reach', dx=-3, lean=-2, mouth=2, crack=1, fl=(255, 255, 255), chips=10, seed=1),
                                              A_(pose='reach', dx=-2, lean=-1, mouth=1, crack=1, chips=5, seed=2), A_(pose='reach', dx=-1)])
    d = [A_(pose='reach', mouth=2, crack=1, lean=-2, chips=8, seed=3),
         crumble(A_(pose='reach', mouth=2, crack=1, lean=-2, wing=0.3), 0.25, 4),
         on(crumble(A_(pose='hide', crack=1, sink=8, lean=-1), 0.5, 5), angel_rubble(0)),
         angel_rubble(0), angel_rubble(1), angel_rubble(2)]
    save_enemy('weepingangel', 'death', d)


# ================================================================== THORNVINE (drawn, 64x64: a rooted bramble with a bud-maw; root at x 24)
VROOT = 24


def bramble(p, pts, w0, w1, pal=(DB[0], (70, 70, 34), (100, 100, 46), (140, 136, 70)), thorns=True, seed=0):
    """A thick thorny stem along pts (root first), tapering from w0 to w1: dark rim, olive body, a lit line, pale thorns."""
    n = len(pts)
    for i, (x, y) in enumerate(pts):
        r = (w0 + (w1 - w0) * i / max(1, n - 1)) / 2
        p.e(x - r, y - r, x + r, y + r, pal[0])
    for i, (x, y) in enumerate(pts):
        r = (w0 + (w1 - w0) * i / max(1, n - 1)) / 2 - 0.8
        if r > 0.3:
            p.e(x - r, y - r, x + r, y + r, pal[1])
    for i, (x, y) in enumerate(pts[:-1]):
        r = (w0 + (w1 - w0) * i / max(1, n - 1)) / 2
        if r > 1.2:
            p.p(x - r * 0.4, y - r * 0.5, pal[2])
    if thorns:
        r2 = random.Random(seed)
        for i in range(2, n - 1, 3):
            x, y = pts[i]
            x2, y2 = pts[i + 1]
            dx_, dy_ = x2 - x, y2 - y
            ln = math.hypot(dx_, dy_) or 1
            nx, ny = -dy_ / ln, dx_ / ln
            sd = 1 if (i // 3) % 2 else -1
            r = (w0 + (w1 - w0) * i / max(1, n - 1)) / 2
            p.l(x + nx * sd * r, y + ny * sd * r, x + nx * sd * (r + 2.5) + dx_ / ln * 1.5, y + ny * sd * (r + 2.5) + dy_ / ln * 1.5, pal[3])


def vine_path(a, b, c, n=16):
    return bez(a, b, c, n)


def bud(p, x, y, mouth=0.0, tilt=0.0, dead=0):
    """The bud-maw at the stem's tip, facing right: a fat dark-red rosebud whose petals part into a mouth of thorns
    (mouth 0 shut .. 1 gaping); dead turns it brown and limp."""
    pal = ROSE if not dead else (DB[0], DB[1], DB[2], DB[3])
    ca, sa = math.cos(tilt), math.sin(tilt)
    R = lambda u, v: (x + u * ca - v * sa, y + u * sa + v * ca)
    p.poly([R(-6, 2), R(-4, -6), R(2, -8), R(7, -5), R(9, 0), R(7, 5), R(1, 8), R(-5, 6)], pal[0])
    p.poly([R(-5, 1), R(-3, -5), R(2, -7), R(6, -4), R(4, 0), R(-1, 2)], pal[1])
    p.poly([R(-3, -4), R(1, -6), R(4, -4), R(0, -2)], pal[2])
    p.l(*R(-3, -5), *R(2, -7), pal[3])
    for (u0, v0, u1, v1) in ((-4, 4, 2, 7), (-2, -1, 3, -5)):                 # petal seams
        p.l(*R(u0, v0), *R(u1, v1), pal[0])
    if mouth > 0:
        o = mouth * 5
        p.poly([R(3, -1 - o * 0.6), R(11 + o * 0.4, -2 - o), R(12 + o * 0.4, 1), R(11 + o * 0.4, 3 + o), R(3, 2 + o * 0.6)], (26, 6, 12))
        for k in range(3):                                                    # thorn fangs from both lips
            u = 5 + k * 2.6
            t_ = -1 - o * (0.6 + k * 0.13)
            b_ = 2 + o * (0.6 + k * 0.13)
            p.l(*R(u, t_), *R(u + 0.4, t_ + 1 + o * 0.25), (236, 226, 186))
            p.l(*R(u + 1.2, b_), *R(u + 1.5, b_ - 1 - o * 0.25), (236, 226, 186))
        p.poly([R(9 + o * 0.4, -2 - o), R(13 + o * 0.5, -3 - o * 1.1), R(11 + o * 0.4, 0)], pal[1])     # the upper lip petal
        p.poly([R(9 + o * 0.4, 3 + o), R(13 + o * 0.5, 4 + o * 1.1), R(11 + o * 0.4, 1)], pal[0])
    else:
        p.l(*R(4, 0), *R(9, 0), (40, 8, 16))
    if not dead:
        p.p(*R(6, -3), (255, 220, 120))                                       # a single glinting eye-seed


def leaf(p, x, y, ang, ln, pal=HG):
    u, v = math.cos(ang), math.sin(ang)
    pts = [(x, y), (x + u * ln * 0.5 - v * ln * 0.3, y + v * ln * 0.5 + u * ln * 0.3), (x + u * ln, y + v * ln),
           (x + u * ln * 0.5 + v * ln * 0.3, y + v * ln * 0.5 - u * ln * 0.3)]
    p.poly(pts, pal[2])
    p.l(x, y, x + u * ln * 0.9, y + v * ln * 0.9, pal[1])
    p.p(*pts[3], pal[4])


def thornvine_raw(sway=0.0, mouth=0.0, lash=None, dead=0, droop=0.0, rec=0.0):
    """Root mound at x 16; the main stem rises in an S to the bud-maw. sway -1..1 bends it; lash = list of points of the
    whipping tendril (drawn from the stem's shoulder); droop 0..1 wilts it towards the floor (death)."""
    p = Pic(64, 64)
    f = FEET
    rx = VROOT
    pal = (DB[0], (70, 70, 34), (100, 100, 46), (140, 136, 70)) if not dead else (DB[0], DB[1], DB[2], DB[3])
    # the soil mound and spreading roots
    for (x1, y1, x2) in ((rx - 13, f, rx - 6), (rx + 13, f, rx + 6), (rx - 9, f - 1, rx - 3)):
        p.lines([(rx, f - 2), ((rx + x2) / 2, f - 2), (x1, y1)], DB[0], 2)
    p.e(rx - 10, f - 5, rx + 10, f + 2, RU[1]); p.e(rx - 8, f - 5, rx + 6, f - 1, RU[2])
    for x in (rx - 6, rx - 1, rx + 4):
        p.p(x, f - 4, RU[3])
    # side tendrils with leaves (behind)
    dk = droop
    hx = rx + 6 + sway * 4 + rec * -4
    hy = 16 + dk * 32 + abs(sway) * 1
    for sd, h0 in ((-1, 30), (1, 40)):
        tp = vine_path((rx, f - 6), (rx + sd * 10, f - h0 * 0.5), (rx + sd * 7 + sway * 2, f - h0 * (1 - dk * 0.7)), 10)
        bramble(p, tp, 3, 1.4, pal, True, 3 + sd)
        ex, ey = tp[-1]
        p.arc(ex - 3, ey - 3, ex + 3, ey + 3, 180, 360, pal[1])
        if not dead:
            leaf(p, *tp[5], -math.pi / 2 + sd * 0.9, 6)
    # main stem
    st = vine_path((rx, f - 3), (rx - 8 + sway * 2, f - 22 - dk * -8), (hx, hy + 6), 18)
    bramble(p, st, 7, 4, pal, True, 7)
    if not dead:
        leaf(p, *st[6], -0.4, 7)
        leaf(p, *st[10], math.pi + 0.5, 6, HG)
    if lash:                                                                  # the whipping tendril
        bramble(p, lash, 3.4, 1.2, pal, True, 11)
        ex, ey = lash[-1]
        p.l(ex - 1, ey - 2, ex + 2, ey + 2, (230, 220, 180))
    bud(p, hx, hy, mouth, sway * 0.12 + dk * 1.2, dead)
    return outline_same(cut_below(p.im, f))


def lash_pts(k, sway=0.0):
    """The tendril from the stem's shoulder (about (27, 33)): k 0 coiled back over the bud .. 1 cracked out straight to
    the right edge .. 2 falling back."""
    s = (VROOT + 3 + sway * 2, 33)
    if k < 0.5:
        return bez(s, (s[0] - 6, 6), (s[0] + 12, 8), 14)
    if k < 1.0:
        return bez(s, (s[0] + 14, 16), (s[0] + 28, 22), 18)
    if k < 1.5:
        return bez(s, (s[0] + 16, 34), (57, 30), 24)
    return bez(s, (s[0] + 18, 44), (52, 52), 20)


def thorn_crack(x, y):
    q = Pic(64, 64)
    for j in range(6):
        a = j / 6 * math.tau
        q.l(x + math.cos(a) * 2, y + math.sin(a) * 2, x + math.cos(a) * 4.5, y + math.sin(a) * 4.5, (255, 246, 210))
    return q.im


@builder('thornvine')
def make_thornvine():
    T = thornvine_raw
    save_enemy('thornvine', 'idle', [T(sway=(0, 0.25, 0.4, 0.2)[i], mouth=(0, 0, 0.2, 0)[i]) for i in range(4)])
    save_enemy('thornvine', 'movement', [T(sway=math.sin(i / 6 * math.tau), mouth=0.15 * (i % 2)) for i in range(6)])
    atk = [T(sway=-0.6, mouth=0.5, rec=1, lash=lash_pts(0, -0.6)), T(sway=-0.3, mouth=1.0, rec=0.6, lash=lash_pts(0.7, -0.3)),
           on(T(sway=0.6, mouth=1.0, lash=lash_pts(1.2, 0.6)), outline_same(thorn_crack(57, 30))), T(sway=0.5, mouth=0.8, lash=lash_pts(1.2, 0.5)),
           T(sway=0.3, mouth=0.4, lash=lash_pts(2, 0.3)), T(sway=0.0, mouth=0.1)]
    save_enemy('thornvine', 'attack', atk)
    save_enemy('thornvine', 'take_damage', [flash(T(sway=-1, mouth=1.0, rec=1), (255, 255, 255)), T(sway=-0.7, mouth=0.6, rec=0.6), T(sway=-0.3)])
    d = [T(sway=-1, mouth=1.0, rec=1), T(sway=-0.6, mouth=0.6, droop=0.2, dead=1), T(sway=-0.3, mouth=0.3, droop=0.45, dead=1),
         T(sway=0, droop=0.7, dead=1), T(sway=0.2, droop=0.85, dead=1), T(sway=0.2, droop=0.9, dead=1)]
    save_enemy('thornvine', 'death', d)


# ================================================================== GARDENER (drawn, 64x64: a zombie farmhand in a straw hat with big shears)
def straw_hat(p, x, y, tilt=0.0, w=11):
    """A wide frayed straw hat, crown centre (x, y) on top of the head."""
    ca, sa = math.cos(tilt), math.sin(tilt)
    R = lambda u, v: (x + u * ca - v * sa, y + u * sa + v * ca)
    p.poly([R(-w, 2), R(-w + 2, 0), R(w - 2, 0), R(w, 2), R(w - 3, 3.5), R(-w + 3, 3.5)], SW[1])      # brim
    p.l(*R(-w, 2), *R(w, 2), SW[2])
    for u in range(-w + 1, w, 3):
        p.p(*R(u, 3.5), SW[0])
        p.p(*R(u + 1, 4), SW[0])                                               # frayed edge
    p.poly([R(-5, 1), R(-4, -5), R(-1, -7), R(3, -7), R(5, -5), R(5, 1)], SW[2])   # crown
    p.l(*R(-4, -5), *R(3, -7), SW[3])
    p.poly([R(-5, 0), R(5, 0), R(5, -2), R(-5, -2)], ROSE[0])                  # a faded band
    p.p(*R(1, -4), SW[0]); p.p(*R(-2, -3), SW[0])                              # a hole in the straw


def garden_shears(p, x, y, ang, open_=0.3, ln=17, glint=False):
    """Big pruning shears with the pivot at (x, y), blades pointing along ang, handles back; open_ 0 shut .. 1 wide."""
    for sd in (-1, 1):
        a = ang + sd * open_ * 0.45
        bx, by = x + math.cos(a) * ln, y + math.sin(a) * ln
        nx, ny = -math.sin(a) * sd, math.cos(a) * sd
        p.poly([(x, y), (x + math.cos(a) * ln * 0.4 + nx * 2.2, y + math.sin(a) * ln * 0.4 + ny * 2.2), (bx, by), (x - nx * 0.5, y - ny * 0.5)], STEEL[2])
        p.l(x, y, bx, by, STEEL[4] if sd < 0 else STEEL[1])
        ha = ang + math.pi - sd * open_ * 0.35
        p.l(x, y, x + math.cos(ha) * 10, y + math.sin(ha) * 10, WD2, 2)
        p.p(x + math.cos(ha) * 10, y + math.sin(ha) * 10, WD1)
    p.e(x - 1.2, y - 1.2, x + 1.2, y + 1.2, BR3)
    if glint:
        tx, ty = x + math.cos(ang) * ln * 0.9, y + math.sin(ang) * ln * 0.9
        spark(p, tx, ty, WHITE, 2)


def gardener_raw(step=0.0, bob=0, dx=0, lean=0.0, mouth=0, open_=0.3, sh_ang=0.15, reach=0.0, glint=False, hat=1, sink=0, eyes=1):
    """Side view facing right: a hunched dead farmhand - grey-green skin, a torn shirt, faded overalls, muddy boots,
    a straw hat; both hands hold big shears out in front at the waist (sh_ang, open_, reach pushes them forward)."""
    p = Pic(64, 64)
    cx = 28 + dx
    f = FEET
    top = 14 + bob + sink
    sh = top + 12
    hip = sh + 15
    L = lean
    # legs and boots (far leg first)
    for k, sd in enumerate((-1, 1)):
        kx = cx + sd * step * 4
        fx = cx + 1 + sd * step * 7
        col = DEN[1] if sd < 0 else DEN[2]
        limb(p, [(cx + L * 0.3, hip), (kx + 1, hip + 8), (fx, f - 2)], 4, col)
        p.r(fx - 2, f - 2, fx + 4, f, RU[0]); p.l(fx - 2, f - 2, fx + 3, f - 2, RU[2])
    # torso: shirt, overall bib and straps, hunched forward
    p.poly([(cx - 5 + L, sh), (cx + 5 + L, sh + 1), (cx + 6 + L * 0.5, hip), (cx - 5, hip)], RU[2])
    p.poly([(cx - 4 + L * 0.8, sh + 5), (cx + 5 + L * 0.8, sh + 5), (cx + 6 + L * 0.5, hip + 2), (cx - 5, hip + 2)], DEN[2])
    p.l(cx - 4 + L * 0.8, sh + 5, cx + 5 + L * 0.8, sh + 5, DEN[3])
    p.l(cx - 3 + L, sh, cx - 3 + L * 0.8, sh + 5, DEN[1]); p.l(cx + 3 + L, sh, cx + 3 + L * 0.8, sh + 5, DEN[1])
    p.p(cx + 3 + L * 0.8, sh + 5, BR3)
    p.poly([(cx - 5, hip - 1), (cx - 8, hip + 4), (cx - 4, hip + 3)], RU[1])  # a torn shirt tail
    p.l(cx - 2 + L * 0.6, sh + 8, cx + 1 + L * 0.6, sh + 11, ZS[1])           # skin through a rip
    # head pushed forward on the neck
    hx, hy = cx + 5 + L * 1.3, top + 5
    p.l(cx + L, sh, hx - 1, hy + 4, ZS[1], 3)
    p.e(hx - 5, hy - 5, hx + 5, hy + 6, ZS[1])
    p.e(hx - 4, hy - 4, hx + 4, hy + 3, ZS[2])
    p.poly([(hx + 3, hy - 1), (hx + 7, hy + 2), (hx + 3, hy + 3)], ZS[2])      # nose
    if eyes:
        p.e(hx + 1, hy - 2, hx + 4, hy + 1, (24, 20, 18)); p.p(hx + 3, hy - 1, (220, 230, 140))   # a sunken, glinting eye
    else:
        p.l(hx + 1, hy - 1, hx + 4, hy - 1, ZS[0])
    jaw = 1 + mouth * 1.5
    p.poly([(hx, hy + 4), (hx + 6, hy + 3), (hx + 5, hy + 4 + jaw), (hx, hy + 5 + jaw * 0.6)], (30, 16, 16))   # the slack jaw
    p.l(hx + 1, hy + 4, hx + 5, hy + 3.5, (210, 200, 150))
    p.l(hx - 2, hy + 5 + jaw * 0.6, hx + 5, hy + 4 + jaw, ZS[1])
    p.ps([(hx - 3, hy + 1), (hx - 2, hy + 3)], ZS[0])
    if hat:
        straw_hat(p, hx - 1, hy - 5, -0.12 + L * 0.03)
    # arms holding the shears
    px_, py_ = cx + 13 + reach * 5 + L, sh + 11 - reach * 2
    for far in (True, False):
        s = (cx + (-1 if far else 2) + L, sh + 2)
        e_ = (s[0] + 3 + reach * 2, s[1] + 7)
        limb(p, [s, e_, (px_ - 3, py_ + (1 if far else 0))], 3, RU[1] if far else RU[2])
        p.e(px_ - 5, py_ - 1, px_ - 1, py_ + 2 + (1 if far else 0), ZS[1] if far else ZS[2])
        if far:
            garden_shears(p, px_ - 2, py_, sh_ang, open_, 17, glint)
    return outline_same(cut_below(p.im, f))


def gardener_lying(k):
    """He lies on his back, the shears beside him, his hat rolled away (k 0..2)."""
    p = Pic(64, 64)
    f = FEET
    p.poly([(14, f), (16, f - 6), (36, f - 6), (38, f)], DEN[2])               # body and overalls
    p.poly([(28, f - 1), (30, f - 6), (46, f - 4), (48, f)], DEN[1])          # legs
    p.r(48, f - 6, 52, f, RU[0])                                              # boots up
    p.poly([(16, f - 5), (24, f - 7), (26, f - 2)], RU[2])
    p.e(4, f - 9, 15, f, ZS[1]); p.e(6, f - 8, 13, f - 3, ZS[2])               # head
    p.l(11, f - 6, 13, f - 6, (24, 20, 18)); p.e(12, f - 3, 15, f, (30, 16, 16))
    p.lines([(22, f - 6), (24, f - 13), (28, f - 15)], RU[2], 3)              # an arm thrown up
    q = Pic(64, 64)
    garden_shears(q, 30, f - 1, 0.05, 0.25, 16)
    straw_hat(q, 50 + k * 2, f - 4, 0.3 + k * 0.1, 8)
    return on(outline_same(cut_below(p.im, f)), outline_same(cut_below(q.im, f)))


@builder('gardener')
def make_gardener():
    G = gardener_raw
    save_enemy('gardener', 'idle', [G(bob=(0, 0, 1, 1)[i], open_=(0.3, 0.45, 0.3, 0.15)[i], mouth=(0, 1, 0, 0)[i], lean=1) for i in range(4)])
    # a shambling walk: the near leg drags
    save_enemy('gardener', 'movement', [G(step=math.sin(i / 6 * math.tau) * (1.0 if math.sin(i / 6 * math.tau) > 0 else 0.6), bob=(0, 1, 1, 0, -1, 0)[i],
                                          lean=1 + (i % 3 == 1), open_=0.2 + 0.1 * (i % 2), mouth=i % 2) for i in range(6)])
    # attack: he raises the shears open wide, lunges and snaps them shut
    save_enemy('gardener', 'attack', [G(sh_ang=-0.35, open_=1.0, lean=-1, mouth=1, reach=0.0),
                                      G(sh_ang=-0.25, open_=1.3, lean=0, mouth=2, reach=0.3),
                                      G(sh_ang=0.0, open_=0.8, lean=3, mouth=2, reach=0.7, dx=-1),
                                      G(sh_ang=0.05, open_=0.0, lean=3, mouth=2, reach=0.8, dx=-3, glint=True),
                                      G(sh_ang=0.1, open_=0.1, lean=2, mouth=1, reach=0.6, dx=0),
                                      G(sh_ang=0.15, open_=0.3, lean=1, reach=0.2, dx=1)])
    save_enemy('gardener', 'take_damage', [flash(G(dx=-3, lean=-3, mouth=2, eyes=0), (255, 255, 255)),
                                           G(dx=-2, lean=-2, mouth=1), G(dx=-1, lean=0)])
    d = [G(dx=-2, lean=-3, mouth=2, eyes=0, open_=0.8), G(dx=-3, lean=-4, mouth=2, eyes=0, sink=5, hat=0),
         topple(G(dx=3, lean=-2, mouth=1, eyes=0, sink=3, hat=0), 40, (32, FEET)), gardener_lying(0), gardener_lying(1), gardener_lying(2)]
    save_enemy('gardener', 'death', d)


# ================================================================== DREAMEATER (drawn, 64x64: a floating shadow tapir-eel, drawn low in the cell)
def dreameater_raw(ph=0.0, bob=0, dx=0, trunk=0.0, suck=0, eyes=1, glow=0, fade=0, tilt=0.0):
    """Side view facing right: a long eel-like body of shadow with a tapir's head and trunk, a ridge of faint stars,
    small dangling legs and a tail curling away to the left; ph moves the wave along the body, trunk 0..1 stretches the
    trunk out and opens its tip; suck draws light motes into it."""
    p = Pic(64, 64)
    by = 40 + bob
    hx, hy = 42 + dx, by - 4
    pts = []
    for i in range(14):                                                       # spine from the head back to the tail
        t = i / 13
        x = hx - 4 - t * 31
        y = by + math.sin(t * 5.5 + ph) * (2 + t * 4) - t * 3 + tilt * (hx - x) * 0.15
        pts.append((x, y))
    radii = [7.5, 8.2, 8.4, 8, 7.4, 6.6, 5.8, 5, 4.2, 3.4, 2.6, 2, 1.5, 1.1]
    # dangling legs (behind)
    for j, (u, sd) in enumerate(((2, -1), (6, 1))):
        x, y = pts[u]
        sw = math.sin(ph + j) * 2
        p.lines([(x, y + 4), (x - 1 + sw, y + 9), (x + sw * 0.5, y + 12)], SH[1], 2)
        p.p(x + sw * 0.5, y + 12, SH[2])
    tube(p, pts[::-1], radii[::-1], (SH[0], SH[2], SH[3], DP[3]), belly=DP[1])
    # wisps trailing from the underside
    r2 = random.Random(3)
    for i in range(3, 13, 3):
        x, y = pts[i]
        p.lines([(x, y + radii[i] - 1), (x - 2, y + radii[i] + 2 + r2.random() * 2), (x - 4 + math.sin(ph + i) * 1.5, y + radii[i] + 4)], SH[2])
    # the ridge of faint stars along the back
    for i in range(1, 11, 2):
        x, y = pts[i]
        c = DP[5] if (i // 2 + int(ph * 2)) % 3 == 0 else DP[4]
        p.p(x, y - radii[i] + 1.5, c)
    # head: a heavy tapir head with a drooping trunk
    p.e(hx - 8, hy - 7, hx + 6, hy + 7, SH[1])
    p.e(hx - 7, hy - 6, hx + 4, hy + 3, SH[2])
    p.l(hx - 6, hy - 6, hx + 2, hy - 7, SH[3])
    tl = 7 + trunk * 5
    ta = 0.9 - trunk * 0.85
    tpts = bez((hx + 4, hy + 1), (hx + 7 + trunk * 3, hy + 2), (hx + 4 + math.cos(ta) * tl, hy + 2 + math.sin(ta) * tl), 8)
    tube(p, tpts, [3.2, 3, 2.8, 2.6, 2.4, 2.2, 2.2, 2.4 + trunk], (SH[0], SH[2], SH[3], DP[3]))
    ex, ey = tpts[-1]
    p.e(ex - 1.5 - trunk, ey - 1.5 - trunk, ex + 1.5 + trunk, ey + 1.5 + trunk, (4, 2, 8) if trunk > 0.3 else SH[1])
    p.arc(hx - 6, hy - 9, hx, hy - 3, 200, 340, SH[2])                        # a small round ear
    if eyes:
        ec = (250, 230, 255) if eyes == 1 else (255, 140, 255)
        p.e(hx - 1, hy - 3, hx + 2, hy, DP[3]); p.p(hx + 1, hy - 2, ec)
    im = outline_same(p.im, (10, 4, 18))
    if glow:                                                                  # the stolen light glowing through it
        q = Pic(64, 64)
        for i in range(1, 9, 2):
            x, y = pts[i]
            q.p(x, y, (255, 236, 160) if glow > 1 else (200, 170, 255))
        im = on(im, q.im)
    if suck:
        q = Pic(64, 64)
        r3 = random.Random(suck)
        for j in range(6):                                                    # motes of light drawn into the trunk
            t = (j / 6 + suck * 0.13) % 1
            mx = ex + 2 + t * max(3, 57 - ex - 2)
            my = ey + (r3.uniform(-10, 10)) * t
            c = (255, 246, 200) if j % 2 else (255, 214, 110)
            if t > 0.4:
                spark(q, mx, my, c, 1)
            else:
                q.p(mx, my, c)
            q.l(mx - 2, my - (my - ey) * 0.2, mx - 1, my - (my - ey) * 0.1, (190, 160, 255))
        im = on(im, q.im)
    if fade:
        a = np.array(im)
        r4 = np.random.default_rng(7 + fade)
        m = (a[:, :, 3] > 0) & (r4.random(a.shape[:2]) < fade * 0.28)
        a[m] = 0
        im = Image.fromarray(a)
    return im


def eater_smear(k):
    """What is left: a thin dark smear on the floor with a few motes of light rising from it (k 0..2)."""
    p = Pic(64, 64)
    f = FEET
    p.e(14, f - 3, 50, f + 1, SH[1]); p.e(18, f - 2, 44, f, SH[2])
    p.l(20, f - 2, 34, f - 2, DP[2])
    q = Pic(64, 64)
    for j in range(4 - k):
        q.p(22 + j * 7, f - 6 - j * 3 - k * 3, (255, 236, 170) if j % 2 else DP[4])
    return on(outline_same(cut_below(p.im, f), (10, 4, 18)), q.im)


@builder('dreameater')
def make_dreameater():
    D = dreameater_raw
    save_enemy('dreameater', 'idle', [D(ph=i / 4 * math.tau, bob=(0, -1, -1, 0)[i]) for i in range(4)])
    save_enemy('dreameater', 'movement', [D(ph=i / 6 * math.tau, bob=(0, -1, -2, -1, 0, 1)[i], dx=1) for i in range(6)])
    save_enemy('dreameater', 'attack', [D(ph=0.3, trunk=0.3, glow=1, dx=-1), D(ph=0.6, trunk=0.8, suck=1, glow=1, eyes=2, dx=-3),
                                        D(ph=0.9, trunk=1.0, suck=2, glow=2, eyes=2, dx=-3), D(ph=1.2, trunk=1.0, suck=3, glow=2, eyes=2, dx=-3),
                                        D(ph=1.5, trunk=0.7, suck=4, glow=2, eyes=2, dx=-3), D(ph=1.8, trunk=0.2, glow=1, dx=-1)])
    save_enemy('dreameater', 'take_damage', [flash(D(ph=0.5, dx=-1, tilt=-0.4, eyes=2), (255, 255, 255)), D(ph=0.8, dx=-2, tilt=-0.2), D(ph=1.0, dx=-1)])
    d = [D(ph=0.5, dx=-1, tilt=-0.5, eyes=2, glow=2), shift(D(ph=0.8, dx=-1, tilt=-0.3, eyes=0, fade=1), 0, 4),
         shift(D(ph=1.1, tilt=0.2, eyes=0, fade=2), 0, 9), on(shift(D(ph=1.4, tilt=0.3, eyes=0, fade=3), 0, 13), eater_smear(0)),
         eater_smear(1), eater_smear(2)]
    save_enemy('dreameater', 'death', d)


# ================================================================== SHADOWTWIN (drawn, 64x64: 'Ư' SPEGLING, a dark copy of the player with a pistol)
def pistol(p, x, y, ang, s=1.0):
    """A dark pistol held at (x, y) pointing along ang."""
    u, v = math.cos(ang), math.sin(ang)
    P_ = lambda a, b: (x + u * a - v * b, y + v * a + u * b)
    p.poly([P_(-1, -2), P_(8 * s, -2), P_(8 * s, 0.5), P_(-1, 0.5)], SH[2])   # slide and barrel
    p.l(*P_(-1, -2), *P_(8 * s, -2), RIM[1])
    p.poly([P_(-1, 0), P_(2, 0), P_(1, 5), P_(-2, 5)], SH[1])                 # grip
    return P_(9 * s, -0.8)


def muzzle_flash(x, y, k):
    q = Pic(64, 64)
    r = (8, 5)[k]
    for j in range(8):
        a = j / 8 * math.tau
        rr = r if j % 2 == 0 else r * 0.5
        q.l(x, y, x + math.cos(a) * rr, y + math.sin(a) * rr * 0.8, (230, 200, 255) if j % 2 else (255, 255, 255))
    q.e(x - 1.5, y - 1.5, x + 1.5, y + 1.5, WHITE)
    return q.im


def twin_raw(step=0.0, bob=0, dx=0, aim=0.0, recoil=0, eyes=1, lean=0.0, sink=0, crack=0):
    """Side view facing right: a figure of living shadow in a long coat and hood, shaped like the player - a lilac rim
    light along its front, two white pin-prick eyes; the near hand holds a pistol, aim 0 lowered .. 1 levelled."""
    p = Pic(64, 64)
    cx = 30 + dx
    f = FEET
    top = 9 + bob + sink
    sh = top + 13
    hip = sh + 15
    L = lean
    for sd in (-1, 1):                                                        # legs and boots
        kx = cx + sd * step * 3
        fx = cx + sd * step * 6
        limb(p, [(cx, hip), (kx + 1, hip + 8), (fx, f - 1)], 4, SH[1] if sd < 0 else SH[2])
        p.r(fx - 2, f - 2, fx + 3, f, SH[0])
    # the long coat
    p.poly([(cx - 6 + L, sh), (cx + 5 + L, sh), (cx + 7 + step, hip + 9), (cx - 8 - step, hip + 10)], SH[2])
    p.poly([(cx - 5 + L, sh), (cx - 1 + L, sh), (cx - 4 - step, hip + 10), (cx - 8 - step, hip + 10)], SH[1])
    p.l(cx + 5 + L, sh, cx + 7 + step, hip + 9, RIM[0])                       # rim light down the front
    p.l(cx + 1 + L, sh + 2, cx + 2, hip + 9, SH[0])                           # the coat's opening
    p.l(cx - 6 + L, hip - 1, cx + 6 + L * 0.5, hip - 1, SH[0])                # belt
    # hooded head
    hx, hy = cx + 2 + L, top + 6
    p.e(hx - 6, hy - 6, hx + 5, hy + 6, SH[2])
    p.poly([(hx - 6, hy + 5), (hx - 7, hy - 3), (hx - 3, hy - 7), (hx + 3, hy - 7), (hx + 5, hy - 2), (hx + 2, hy + 6)], SH[1])
    p.e(hx - 1, hy - 4, hx + 5, hy + 5, SH[0])                                # the shadowed face
    p.arc(hx - 6, hy - 7, hx + 6, hy + 5, 270, 350, RIM[1])
    if eyes:
        p.p(hx + 2, hy - 1, WHITE); p.p(hx + 4, hy - 1, (220, 210, 255))
    if crack:
        p.lines([(hx - 2, hy - 6), (hx, hy), (cx + 1, sh + 8), (cx - 1, sh + 15), (cx + 2, hip + 4)], RIM[2])
    # far arm hanging, near arm with the pistol
    limb(p, [(cx - 2 + L, sh + 2), (cx - 3 + L, sh + 9), (cx - 1 + L, sh + 15)], 3, SH[1])
    s = (cx + 2 + L, sh + 2)
    a = 1.25 - aim * 1.25
    el = (s[0] + math.cos(a) * 6 - recoil, s[1] + math.sin(a) * 6)
    hnd = (el[0] + math.cos(a - 0.15 * aim) * 6, el[1] + math.sin(a - 0.15 * aim) * 6 - recoil)
    limb(p, [s, el, hnd], 3, SH[2], RIM[0])
    mz = pistol(p, hnd[0], hnd[1], a - 0.15 * aim - recoil * 0.25)
    p.e(hnd[0] - 1.5, hnd[1] - 1.5, hnd[0] + 1.5, hnd[1] + 1.5, SH[3])
    return outline_same(cut_below(p.im, f), (8, 4, 16)), mz


def twin(fl=None, flash_k=None, **kw):
    im, mz = twin_raw(**kw)
    if flash_k is not None:
        im = on(im, outline_same(muzzle_flash(mz[0] + 3, mz[1], flash_k), (8, 4, 16)))
    if fl:
        im = flash(im, fl)
    return im


def twin_shards(k):
    """It shatters like black glass: shards scattered on the floor, a shadow puddle, lilac glints (k 0..2)."""
    p = Pic(64, 64)
    f = FEET
    p.e(12, f - 3, 52, f + 1, SH[1]); p.e(16, f - 2, 46, f, SH[0])
    r2 = random.Random(9)
    for i in range(12):
        x = r2.uniform(10, 54)
        y = f - r2.uniform(0, 4)
        s = r2.uniform(1.5, 3.5)
        a = r2.uniform(0, math.tau)
        poly_r(p, [(x - s, y), (x, y - s * 0.6), (x + s, y + 0.5)], SH[2] if i % 2 else SH[3], x, y, a)
        p.p(x, y - s * 0.4, RIM[1])
    q = Pic(64, 64)
    pistol(q, 40, f - 3, 0.1)
    im = on(outline_same(cut_below(p.im, f), (8, 4, 16)), outline_same(cut_below(q.im, f), (8, 4, 16)))
    if k < 2:
        r = Pic(64, 64)
        dust(r, 8 - k * 4, 60 + k, (14, f - 20 + k * 6, 50, f - 4), (RIM[0], RIM[1], RIM[2]))
        im = on(im, r.im)
    return im


def shatter_im(im, k, seed):
    """Break a frame into drifting shards: random cells of it jump apart and fall (k 0..1)."""
    a = np.array(im)
    out = np.zeros_like(a)
    r2 = random.Random(seed)
    for by_ in range(0, 64, 5):
        for bx_ in range(0, 64, 5):
            blk = a[by_:by_ + 5, bx_:bx_ + 5]
            if not blk[:, :, 3].any():
                continue
            ddx = int((bx_ - 30) * 0.25 * k + r2.uniform(-2, 2) * k)
            ddy = int(k * k * (10 + r2.uniform(0, 8)) + (by_ - 30) * 0.1 * k)
            y0, x0 = by_ + ddy, bx_ + ddx
            if 0 <= x0 < 60 and 0 <= y0 < 60 and r2.random() > k * 0.35:
                sub = out[y0:y0 + blk.shape[0], x0:x0 + blk.shape[1]]
                m = blk[:sub.shape[0], :sub.shape[1], 3] > 0
                sub[m] = blk[:sub.shape[0], :sub.shape[1]][m]
    return Image.fromarray(out)


@builder('shadowtwin')
def make_shadowtwin():
    T = twin
    save_enemy('shadowtwin', 'idle', [T(bob=(0, 0, 1, 0)[i], eyes=0 if i == 2 else 1, aim=0.1) for i in range(4)])
    save_enemy('shadowtwin', 'movement', [T(step=math.sin(i / 6 * math.tau), bob=-(i % 3 == 1), aim=0.15, dx=1) for i in range(6)])
    # attack: the shot with its flash and recoil, then the pistol lowers
    # (the game fires the twin's shot on the very tick the attack starts - it mimics the player's shot - so the flash is
    # on frames 0-1 and the arm then lowers)
    save_enemy('shadowtwin', 'attack', [T(aim=1.0, recoil=1, flash_k=0), T(aim=1.0, recoil=1, flash_k=1), T(aim=1.0), T(aim=0.85), T(aim=0.5), T(aim=0.25)])
    save_enemy('shadowtwin', 'take_damage', [T(dx=-3, lean=-2, aim=0.3, crack=1, fl=(230, 210, 255)), T(dx=-2, lean=-1, aim=0.2, crack=1), T(dx=-1, aim=0.1)])
    base = T(lean=-2, aim=0.2, crack=1)
    d = [T(lean=-2, aim=0.2, crack=1, fl=(200, 180, 255)), shatter_im(base, 0.25, 1), on(shatter_im(base, 0.6, 2), twin_shards(0)),
         twin_shards(0), twin_shards(1), twin_shards(2)]
    save_enemy('shadowtwin', 'death', d)


# ================================================================== SLEEPWALKER (drawn, 64x64: a sleeper in a nightgown, arms out, eyes shut)
def sleepwalker_raw(step=0.0, bob=0, dx=0, arms=0.0, mouth=0, lean=0.0, swell=0.0, sink=0, cap=1):
    """Side view facing right: a tall thin sleeper in a long linen nightgown and a floppy nightcap with a pompom,
    bare feet, arms held straight out in front (arms -1 raised .. 1 dropping to grab), eyes shut; swell 0..1 puffs
    the gown up with sleep powder before it bursts."""
    p = Pic(64, 64)
    cx = 29 + dx
    f = FEET
    top = 8 + bob + sink
    sh = top + 13
    L = lean
    sw = swell
    for sd in (-1, 1):                                                        # bare feet under the hem
        fx = cx + 1 + sd * step * 5
        p.r(fx - 1, f - 2, fx + 3, f, SKN[1] if sd < 0 else SKN[2])
    hem = f - 3
    p.poly([(cx - 5 + L - sw * 2, sh), (cx + 5 + L + sw * 2, sh), (cx + 9 + step * 2 + sw * 6, hem), (cx - 10 + step * 2 - sw * 6, hem)], NG[1])
    p.poly([(cx - 4 + L, sh), (cx + L, sh), (cx - 4 + step * 2 - sw * 3, hem), (cx - 9 + step * 2 - sw * 6, hem)], NG[2])
    for kx in (-5, 0, 5):
        p.l(cx + kx * 0.3 + L, sh + 8, cx + kx + step * 2 + kx * sw, hem, NG[0])
    p.l(cx - 10 + step * 2 - sw * 6, hem, cx + 9 + step * 2 + sw * 6, hem, NG[0])
    for x in range(int(cx - 9 + step * 2 - sw * 6), int(cx + 9 + step * 2 + sw * 6), 3):   # a frill at the hem
        p.p(x, hem + 1, NG[3])
    if sw > 0.3:                                                              # powder leaking from the seams
        for j in range(5):
            p.p(cx - 6 + j * 3, sh + 10 + (j % 2) * 9, SLP[2])
    # head with the nightcap
    hx, hy = cx + 2 + L, top + 6
    p.l(cx + L, sh, hx - 1, hy + 4, SKN[1], 3)
    p.e(hx - 5, hy - 5, hx + 5, hy + 6, (196, 172, 156))
    p.e(hx - 4, hy - 4, hx + 4, hy + 3, (222, 204, 190))
    p.poly([(hx + 4, hy), (hx + 6, hy + 2), (hx + 4, hy + 2)], (210, 190, 176))   # nose
    p.l(hx + 1, hy, hx + 3, hy + 0.5, (80, 60, 64))                           # a shut eyelid with lashes
    p.p(hx + 1, hy + 1, (80, 60, 64)); p.p(hx + 3, hy + 1, (80, 60, 64))
    p.l(hx + 1, hy + 2, hx + 3, hy + 2, (184, 150, 150))                     # dark rings under the eye
    if mouth:
        p.e(hx + 2, hy + 3, hx + 5, hy + 4 + mouth * 1.5, (60, 30, 40))       # a yawn
    else:
        p.l(hx + 2, hy + 4, hx + 4, hy + 4, (140, 100, 100))
    if cap:
        p.poly([(hx - 6, hy - 2), (hx - 5, hy - 7), (hx, hy - 9), (hx + 5, hy - 6), (hx + 5, hy - 3)], NG[2])
        p.lines([(hx - 4, hy - 6), (hx - 9, hy - 6), (hx - 12, hy - 1), (hx - 12, hy + 4)], NG[1], 3)   # the floppy tip
        p.e(hx - 14, hy + 3, hx - 10, hy + 7, SLP[2])                         # pompom
        p.l(hx - 6, hy - 2, hx + 5, hy - 3, (150, 110, 190))                  # a lilac band
    # both arms straight out in front, sleeves hanging
    for far in (True, False):
        s = (cx + (0 if far else 2) + L, sh + 2)
        a = 0.05 + arms * 0.5 + (0.08 if far else 0)
        hnd = (s[0] + math.cos(a) * 15, s[1] + math.sin(a) * 15 + (1 if far else 0))
        limb(p, [s, ((s[0] + hnd[0]) / 2, (s[1] + hnd[1]) / 2), hnd], 4, NG[0] if far else NG[2])
        p.poly([(s[0] + 4, s[1] + 2), (s[0] + 8, s[1] + 2 + math.sin(a) * 4), (s[0] + 7, s[1] + 6 + math.sin(a) * 4)], NG[1] if not far else NG[0])  # drooping sleeve
        p.e(hnd[0] - 1, hnd[1] - 1.5, hnd[0] + 3, hnd[1] + 1.5, (200, 178, 164) if far else (226, 208, 194))
        for k in range(2):
            p.l(hnd[0] + 2, hnd[1] - 1 + k * 2, hnd[0] + 4, hnd[1] - 0.5 + k * 2 + arms, (180, 156, 146))
    return outline_same(cut_below(p.im, f))


def sleep_cloud(k, seed=0):
    """A billowing cloud of purple sleep powder (k 0 burst .. 3 settling, thinning)."""
    q = Pic(64, 64)
    r2 = random.Random(70 + seed)
    blobs = []
    n = (9, 11, 9, 6)[k]
    for _ in range(n):
        a = r2.uniform(0, math.tau)
        d = r2.uniform(0, (8, 15, 18, 20)[k])
        x = 30 + math.cos(a) * d
        y = (30, 32, 40, 48)[k] + math.sin(a) * d * (0.8 if k < 2 else 0.45)
        r = r2.uniform(3, 6) * (1.0, 1.1, 0.9, 0.7)[k]
        blobs.append((x, min(y, FEET - r), r))
    pal = SLP if k < 2 else (dark(SLP[0], 0.8), SLP[0], SLP[1], SLP[2])
    for x, y, r in blobs:
        puff(q, x, y, r, pal)
    dust(q, 12 + k * 4, 80 + k, (4, 8 + k * 8, 60, FEET - 1), (SLP[2], SLP[3], (255, 240, 255)))
    return q.im


def nightgown_heap(k):
    """The empty nightgown and cap lying in a heap in a ring of powder (k 0..2)."""
    p = Pic(64, 64)
    f = FEET
    p.e(8, f - 3, 56, f + 1, SLP[0]); p.e(12, f - 2, 52, f, SLP[1])
    p.poly([(16, f), (20, f - 6), (32, f - 8), (42, f - 5), (46, f)], NG[1])
    p.poly([(20, f - 6), (30, f - 8), (28, f - 4)], NG[2])
    for x in range(18, 44, 3):
        p.p(x, f - 1, NG[3])
    p.lines([(42, f - 3), (48, f - 6), (52, f - 4)], NG[1], 3)
    p.e(50, f - 7, 54, f - 3, SLP[2])
    q = Pic(64, 64)
    if k < 2:
        dust(q, 10 - k * 4, 90 + k, (10, f - 16 + k * 5, 54, f - 3), (SLP[2], SLP[3]))
    return on(outline_same(cut_below(p.im, f)), q.im)


@builder('sleepwalker')
def make_sleepwalker():
    S_ = sleepwalker_raw
    save_enemy('sleepwalker', 'idle', [S_(bob=(0, 0, 1, 1)[i], arms=(0, 0.05, 0.1, 0.05)[i], mouth=(0, 0, 1, 0)[i]) for i in range(4)])
    save_enemy('sleepwalker', 'movement', [S_(step=math.sin(i / 6 * math.tau), bob=(0, 1, 1, 0, 1, 1)[i], lean=0.5, dx=(i % 2)) for i in range(6)])
    save_enemy('sleepwalker', 'attack', [S_(arms=-0.4, mouth=1, lean=-1), S_(arms=-0.6, mouth=2, lean=-1),
                                         S_(arms=0.3, mouth=2, lean=2, dx=2), S_(arms=0.8, mouth=1, lean=3, dx=3),
                                         S_(arms=0.6, mouth=0, lean=2, dx=2), S_(arms=0.1, lean=0)])
    save_enemy('sleepwalker', 'take_damage', [flash(S_(dx=-3, lean=-2, arms=-0.3, mouth=2), (255, 255, 255)), S_(dx=-2, lean=-1, mouth=1), S_(dx=-1)])
    d = [S_(swell=0.4, mouth=2, arms=-0.3), on(S_(swell=0.9, mouth=2, arms=-0.5, bob=-1), outline_same(sleep_cloud(0, 1))),
         sleep_cloud(1), on(nightgown_heap(0), sleep_cloud(2)), on(nightgown_heap(1), sleep_cloud(3)), nightgown_heap(2)]
    save_enemy('sleepwalker', 'death', d)


# ================================================================== BOSS: TRÄDGÅRDSMÄSTAREN (drawn, 116x116: a giant head gardener with hedge shears)
def hedge_shears(p, x, y, ang, open_=0.2, ln=40, hl=20, glint=False):
    """Long two-handed hedge shears: pivot (x, y), blades along ang (open_ 0 shut .. 1 wide), wooden handles back."""
    for sd in (1, -1):
        a = ang + sd * open_ * 0.32
        u, v = math.cos(a), math.sin(a)
        nx, ny = -v * sd, u * sd
        tip = (x + u * ln, y + v * ln)
        p.poly([(x - nx, y - ny), (x + u * 6 + nx * 3.5, y + v * 6 + ny * 3.5), (x + u * ln * 0.8 + nx * 2.5, y + v * ln * 0.8 + ny * 2.5), tip,
                (x + u * ln * 0.5, y + v * ln * 0.5)], STEEL[2] if sd > 0 else STEEL[1])
        p.l(x, y, tip[0], tip[1], STEEL[4] if sd > 0 else STEEL[3])
        for k in range(1, 5):                                                  # a few nicks in the edge
            q = (x + u * ln * k / 5, y + v * ln * k / 5)
            p.p(q[0] + nx, q[1] + ny, STEEL[0])
        ha = ang + math.pi - sd * open_ * 0.25
        hu, hv = math.cos(ha), math.sin(ha)
        p.l(x, y, x + hu * hl, y + hv * hl, WD1, 4)
        p.l(x, y - 1, x + hu * hl, y + hv * hl - 1, WD3)
        p.e(x + hu * hl - 2.5, y + hv * hl - 2.5, x + hu * hl + 2.5, y + hv * hl + 2.5, WD2)
    p.e(x - 3, y - 3, x + 3, y + 3, BR2); p.p(x - 1, y - 1, BR4)
    if glint:
        a = ang
        spark(p, x + math.cos(a) * ln * 0.75, y + math.sin(a) * ln * 0.75, WHITE, 4)


def seeds_layer(k, x, y, seed=0, size=BS):
    """A spray of seeds and thorns flung from (x, y) up and forward (k 0..1 how far they have flown)."""
    q = Pic(size, size)
    r2 = random.Random(seed)
    for j in range(14):
        a = r2.uniform(-1.1, 0.15)
        d = 6 + k * r2.uniform(14, 26)
        sx, sy = x + math.cos(a) * d, y + math.sin(a) * d + k * k * 10
        if j % 3 == 0:                                                         # a thorn spike
            q.l(sx, sy, sx + math.cos(a) * 5, sy + math.sin(a) * 5, (226, 214, 160), 2)
            q.p(sx + math.cos(a) * 5, sy + math.sin(a) * 5, (255, 250, 220))
        else:                                                                  # a seed
            q.e(sx - 1.5, sy - 1, sx + 1.5, sy + 1.5, DB[2] if j % 2 else SW[1])
            q.p(sx - 0.5, sy - 0.5, SW[3])
    return outline_same(q.im)


def gardener_boss(t=0.0, bob=0, dx=0, lean=0.0, sh=(0.05, 0.25), reach=0.0, arm=None, eyes=1, mouth=0, hat=1, sink=0,
                  glint=False, fl=None, seeds=None, k=0, ln=40):
    """Side view facing right: an enormous rotting head gardener - wide frayed straw hat with a red rose, a beard of moss
    and roots, a green canvas apron with seed pockets over a brown shirt, patched trousers, huge boots; both hands on
    the long hedge shears (sh = (angle, open)); arm = the near arm free (angle) for the seed throw."""
    p = Pic(BS, BS)
    f = BS_FEET
    cx = 44 + dx
    top = 14 + bob + sink
    shy = top + 28
    hip = shy + 34
    L = lean
    # boots and legs
    for sd in (-1, 1):
        fx = cx + sd * 7
        col = RU[1] if sd < 0 else RU[2]
        limb(p, [(cx + sd * 3, hip), (fx + 2, hip + 16), (fx, f - 6)], 10, col)
        p.poly([(fx - 7, f), (fx - 6, f - 9), (fx + 6, f - 9), (fx + 13, f - 3), (fx + 13, f)], RU[0])
        p.l(fx - 6, f - 9, fx + 6, f - 9, RU[2]); p.l(fx - 7, f, fx + 13, f, (16, 12, 10))
    p.r(cx + 6, hip + 12, cx + 10, hip + 16, DB[2])                            # a patch on the knee
    # body: shirt and the big apron
    p.poly([(cx - 15 + L, shy), (cx + 13 + L, shy + 1), (cx + 16 + L * 0.5, hip + 2), (cx - 15, hip + 2)], RU[2])
    p.poly([(cx - 15 + L, shy), (cx - 6 + L, shy), (cx - 8, hip + 2), (cx - 15, hip + 2)], RU[3])
    ap = [(cx - 8 + L, shy + 8), (cx + 14 + L, shy + 8), (cx + 22 + L * 0.3, f - 16), (cx - 12, f - 14)]
    p.poly(ap, (62, 84, 48))
    p.poly([(cx - 8 + L, shy + 8), (cx + 1 + L, shy + 8), (cx - 3, f - 14), (cx - 12, f - 14)], (84, 110, 62))
    p.l(cx - 12, f - 14, cx + 22 + L * 0.3, f - 16, (40, 56, 30))
    for (px_, py_) in ((cx + 2, shy + 30), (cx + 12, shy + 30)):              # seed pockets with packets
        p.r(px_ - 4 + L * 0.5, py_, px_ + 4 + L * 0.5, py_ + 9, (50, 70, 38))
        p.r(px_ - 2 + L * 0.5, py_ - 4, px_ + 2 + L * 0.5, py_ + 1, SW[2] if px_ % 2 else ROSE[2])
    p.l(cx - 6 + L, shy + 8, cx - 2 + L, shy - 2, (50, 70, 38), 2)             # apron strap
    # vines climbing over him
    vine = bez((cx - 13, f - 18), (cx - 22, shy + 20), (cx - 8 + L, shy + 2), 14)
    p.lines(vine, HG[2], 2)
    for i in range(1, 14, 3):
        leaf(p, *vine[i], math.pi + 0.6 * (1 if i % 2 else -1), 5)
    # head: a huge grey-green face, glowing eyes under the brim, a beard of moss and roots
    hx, hy = cx + 8 + L * 1.2, top + 17
    p.e(hx - 11, hy - 11, hx + 11, hy + 12, ZS[1])
    p.e(hx - 9, hy - 9, hx + 9, hy + 6, ZS[2])
    p.poly([(hx + 8, hy - 2), (hx + 15, hy + 3), (hx + 8, hy + 5)], ZS[2]); p.l(hx + 8, hy - 2, hx + 15, hy + 3, ZS[3])   # nose
    p.e(hx + 1, hy - 6, hx + 8, hy - 1, (20, 18, 14))                          # the eye socket in shadow
    if eyes:
        ec = (255, 230, 90) if eyes == 1 else (255, 120, 40)
        p.e(hx + 3, hy - 5, hx + 6, hy - 2, ec); p.p(hx + 5, hy - 4, WHITE)
    beard = [(hx - 9, hy + 2), (hx + 12, hy + 4), (hx + 10 + L, hy + 16), (hx + 4, hy + 26), (hx - 2, hy + 20), (hx - 8, hy + 14)]
    p.poly(beard, MS[1])
    for j in range(6):
        bx = hx - 6 + j * 3
        p.l(bx, hy + 6, bx + 1, hy + 14 + (j % 3) * 4, MS[0] if j % 2 else MS[2])
    p.lines([(hx + 2, hy + 20), (hx + 3, hy + 28), (hx + 1, hy + 32)], DB[1])  # a dangling root
    if mouth:
        p.e(hx + 3, hy + 4, hx + 11, hy + 6 + mouth * 3, (34, 14, 14))
        p.l(hx + 4, hy + 5, hx + 10, hy + 5, (210, 200, 150))
    if hat:
        straw_hat(p, hx - 2, hy - 11, -0.08 + L * 0.02, 22)
        q = Pic(BS, BS)                                                       # the crown is taller on the giant
        q.poly([(hx - 11, hy - 11), (hx - 9, hy - 24), (hx - 3, hy - 28), (hx + 6, hy - 28), (hx + 10, hy - 23), (hx + 10, hy - 11)], SW[2])
        q.l(hx - 9, hy - 24, hx + 6, hy - 28, SW[3])
        q.r(hx - 11, hy - 16, hx + 10, hy - 12, ROSE[0])
        q.e(hx + 5, hy - 19, hx + 12, hy - 12, ROSE[2]); q.e(hx + 7, hy - 17, hx + 10, hy - 14, ROSE[1])   # the rose
        for x in range(int(hx - 30), int(hx + 26), 3):
            q.p(x, hy - 4, SW[0])
        q.poly([(hx - 32, hy - 8), (hx - 28, hy - 12), (hx + 24, hy - 12), (hx + 28, hy - 8), (hx + 20, hy - 5), (hx - 24, hy - 5)], SW[1])
        q.l(hx - 32, hy - 8, hx + 28, hy - 8, SW[2])
        for x in range(int(hx - 30), int(hx + 26), 4):
            q.p(x, hy - 5, SW[0]); q.p(x + 1, hy - 4, SW[0])
        p.paste(q.im, 0, 0)
    # arms and the shears
    a0, op = sh
    pv = (cx + 26 + reach * 10 + L, shy + 26 - reach * 4)
    p_far = (cx - 6 + L, shy + 4)
    limb(p, [p_far, (p_far[0] + 6, p_far[1] + 14), (pv[0] - 10, pv[1] + 2)], 8, RU[1])
    p.e(pv[0] - 14, pv[1] - 2, pv[0] - 6, pv[1] + 6, ZS[1])
    hedge_shears(p, pv[0], pv[1], a0, op, ln, 20, glint)
    s = (cx + 6 + L, shy + 4)
    if arm is None:
        hnd = (pv[0] - 14, pv[1] - 3)
        limb(p, [s, (s[0] + 4, s[1] + 16), hnd], 9, RU[2], RU[3])
        p.e(hnd[0] - 4, hnd[1] - 4, hnd[0] + 5, hnd[1] + 5, ZS[2])
    else:
        el = (s[0] + math.cos(arm) * 15, s[1] + math.sin(arm) * 15)
        hnd = (el[0] + math.cos(arm - 0.4) * 15, el[1] + math.sin(arm - 0.4) * 15)
        limb(p, [s, el, hnd], 9, RU[2], RU[3])
        p.e(hnd[0] - 5, hnd[1] - 5, hnd[0] + 5, hnd[1] + 5, ZS[2])
        for j in range(3):
            p.l(hnd[0] + 3, hnd[1] - 3 + j * 3, hnd[0] + 7, hnd[1] - 4 + j * 3, ZS[1])
    im = outline_same(cut_below(p.im, f))
    if seeds:
        im = on(im, seeds_layer(seeds[0], seeds[1], seeds[2], seeds[3]))
    if fl:
        im = flash(im, fl)
    return im


def gardener_boss_fallen(k):
    """He has fallen on his face; the vines grow over him and a few flowers open (k 0..2), the hat lies on its crown,
    the shears stuck upright in the earth."""
    p = Pic(BS, BS)
    f = BS_FEET
    pool(p, 56, f, 96, 6, (RU[0], RU[1], RU[2]), 4)
    p.poly([(10, f), (16, f - 16), (40, f - 24), (66, f - 22), (88, f - 12), (94, f)], (62, 84, 48))   # the apron-covered back
    p.poly([(16, f - 16), (40, f - 24), (50, f - 23), (34, f - 14), (20, f - 8)], (84, 110, 62))
    p.poly([(62, f - 22), (86, f - 14), (96, f - 4), (70, f - 2)], RU[2])
    p.e(88, f - 18, 108, f, ZS[1]); p.e(90, f - 16, 104, f - 6, ZS[2])        # head face down
    p.poly([(96, f - 4), (110, f - 2), (106, f)], MS[1])                       # beard
    p.r(2, f - 12, 14, f, RU[0]); p.r(6, f - 18, 16, f - 8, RU[0])             # boots
    q = Pic(BS, BS)
    hedge_shears(q, 70, f - 30, -1.75, 0.3, 30, 14)                            # stuck upright
    vine = bez((8, f - 2), (40, f - 40 + k * 0), (92, f - 10), 20)
    q.lines(vine[:8 + k * 6], HG[2], 2)
    for i in range(2, 8 + k * 6, 3):
        leaf(q, *vine[i], -math.pi / 2 + (0.8 if i % 2 else -0.8), 5)
    for j in range(k + 1):
        x, y = vine[min(len(vine) - 1, 5 + j * 6)]
        q.e(x - 2, y - 4, x + 2, y, ROSE[2]); q.p(x, y - 2, ROSE[3])
    p2 = Pic(BS, BS)
    p2.poly([(18, f), (20, f - 6), (34, f - 6), (36, f)], SW[2])               # the hat on its crown, brim up
    p2.poly([(8, f - 6), (12, f - 9), (44, f - 9), (48, f - 6)], SW[1])
    im = on(outline_same(cut_below(p.im, f)), outline_same(cut_below(p2.im, f)), outline_same(cut_below(q.im, f)))
    return im


@builder('gardenerboss')
def make_gardener_boss():
    G = gardener_boss
    sv = lambda st, fr: save_boss('gardener', st, fr)
    sv('idle', [G(bob=(0, 0, 1, 1, 0)[i], sh=(0.05, 0.2 + 0.1 * math.sin(i / 5 * math.tau)), eyes=0 if i == 4 else 1, mouth=(0, 0, 1, 0, 0)[i], k=i)
                for i in range(5)])
    # attack (the lunge): raises the shears open, lunges, snaps them shut far in front, draws back
    sv('attack', [G(sh=(-0.35, 0.8), lean=-3, mouth=1, ln=36), G(sh=(-0.2, 1.1), lean=0, reach=0.3, mouth=2, ln=36),
                  G(sh=(0.0, 0.9), lean=3, reach=0.6, mouth=2, eyes=2, ln=32), G(sh=(0.05, 0.0), lean=4, reach=0.6, mouth=2, glint=True, eyes=2, ln=32),
                  G(sh=(0.05, 0.15), lean=2, reach=0.4, mouth=1, ln=34), G(sh=(-0.1, 0.5), lean=0, reach=0.1, ln=38)])
    # cast (seeds and thorns): a hand into the pocket, wind up, fling a spray forward; the shears held low
    low = (0.9, 0.1)
    sv('cast', [G(sh=low, arm=1.6, lean=-1), G(sh=low, arm=-2.4, lean=-3, mouth=1),
                G(sh=low, arm=-0.9, lean=1, mouth=2, eyes=2, seeds=(0.1, 80, 34, 1)), G(sh=low, arm=-0.2, lean=3, mouth=2, eyes=2, seeds=(0.55, 80, 34, 1)),
                G(sh=low, arm=0.3, lean=2, mouth=1, seeds=(1.0, 80, 34, 1)), G(sh=low, arm=1.2, lean=0)])
    sv('hurt', [G(dx=-4, lean=-4, mouth=2, eyes=2, fl=(255, 255, 255), sh=(-0.1, 0.4)), G(dx=-2, lean=-2, mouth=1, sh=(0, 0.3)), G(dx=-1, sh=(0.05, 0.25))])
    d = [G(lean=-4, mouth=2, eyes=2, sh=(0.4, 0.6)), G(lean=-2, mouth=2, eyes=2, sink=8, sh=(0.9, 0.3)),
         G(lean=3, mouth=1, eyes=0, sink=20, sh=(1.2, 0.2), hat=0),
         topple(G(lean=4, eyes=0, sh=(1.3, 0.2), hat=0, dx=-36), -70, (26, BS_FEET), BS_FEET)]
    d += [gardener_boss_fallen(0), gardener_boss_fallen(1), gardener_boss_fallen(2)]
    sv('death', d)


# ================================================================== BOSS: JON BLUND (drawn, 116x116: the sandman in a starry cloak and top hat)
def star5(p, x, y, r, c, c2=None):
    pts = []
    for j in range(10):
        a = -math.pi / 2 + j * math.pi / 5
        rr = r if j % 2 == 0 else r * 0.45
        pts.append((x + math.cos(a) * rr, y + math.sin(a) * rr))
    p.poly(pts, c)
    if c2:
        p.p(x, y, c2)


def umbrella(p, x, y, ang, open_=0.0, ln=44):
    """Jon Blund's umbrella: the handle crook at (x, y), shaft along ang; open_ 0 furled .. 1 open (a dome of night-blue
    panels with pictures of stars and moons)."""
    u, v = math.cos(ang), math.sin(ang)
    tip = (x + u * ln, y + v * ln)
    p.l(x, y, tip[0], tip[1], (60, 40, 30), 2)
    p.arc(x - 5, y - 6, x + 1, y + 1, 180, 380, AU1, 2)                       # the crook
    if open_ <= 0.05:
        p.poly([(x + u * ln * 0.35 - v * 3, y + v * ln * 0.35 + u * 3), (x + u * ln * 0.95, y + v * ln * 0.95),
                (x + u * ln * 0.35 + v * 3, y + v * ln * 0.35 - u * 3)], (110, 60, 150))
        p.l(x + u * ln * 0.4, y + v * ln * 0.4, x + u * ln * 0.92, y + v * ln * 0.92, (160, 110, 200))
        p.p(x + u * ln * 0.6, y + v * ln * 0.6, AU3)
    else:
        R = 20 * open_ + 4
        cx_, cy_ = x + u * ln * 0.9, y + v * ln * 0.9
        nx, ny = -v, u
        pts = [(cx_ + nx * R * math.cos(a) + u * R * 0.55 * math.sin(a), cy_ + ny * R * math.cos(a) + v * R * 0.55 * math.sin(a))
               for a in np.linspace(0, math.pi, 13)]
        p.poly(pts + [(cx_ - u * 3, cy_ - v * 3)], NB[2])
        for j in range(0, 13, 3):                                              # ribs and scalloped edge
            p.l(tip[0] + u * 3, tip[1] + v * 3, *pts[j], NB[1])
        p.lines(pts, NB[3])
        for j, a in enumerate(np.linspace(0.3, math.pi - 0.3, 4)):            # little pictures: stars and a moon
            sx = cx_ + nx * R * 0.6 * math.cos(a) + u * R * 0.3 * math.sin(a)
            sy = cy_ + ny * R * 0.6 * math.cos(a) + v * R * 0.3 * math.sin(a)
            if j % 2:
                star5(p, sx, sy, 2.5, AU3)
            else:
                p.e(sx - 2, sy - 2, sx + 2, sy + 2, (250, 240, 200)); p.e(sx - 1, sy - 2.5, sx + 2.5, sy + 1, NB[2])
        p.l(tip[0], tip[1], tip[0] + u * 4, tip[1] + v * 4, AU2, 2)


def sandbag(p, x, y, open_=0.0):
    """A plump sack of golden sand hanging from the hand at (x, y), its neck tied with a cord."""
    p.e(x - 7, y + 2, x + 7, y + 17, SACK_C[1])
    p.e(x - 6, y + 3, x + 3, y + 12, SACK_C[2])
    p.poly([(x - 3, y + 4), (x - 2, y - 1), (x + 2, y - 1), (x + 3, y + 4)], SACK_C[1])
    p.l(x - 3, y + 3, x + 3, y + 3, AU2)
    if open_:
        p.e(x - 3, y - 2, x + 3, y + 1, SD[2])
    p.p(x - 3, y + 8, SD[1]); p.p(x + 1, y + 13, SD[1])                        # sand leaking from a seam


SACK_C = ((70, 50, 40), (128, 96, 70), (170, 134, 98))


def sand_stream(k, x, y, seed=0, size=BS):
    """Golden sand strewn in a wide fan forward from (x, y) (k 0..1)."""
    q = Pic(size, size)
    r2 = random.Random(seed)
    for j in range(60):
        a = r2.uniform(-0.9, 0.5)
        d = r2.uniform(2, 10 + k * 26)
        sx = x + math.cos(a) * d
        sy = y + math.sin(a) * d + (d / 40) ** 2 * 14
        c = SD[r2.randint(1, 3)]
        q.p(sx, sy, c)
        if r2.random() < 0.25:
            q.p(sx + 1, sy, c); q.p(sx, sy + 1, SD[0])
    for j in range(4):                                                         # a few bright sleepy sparkles
        a = r2.uniform(-0.8, 0.4)
        d = 10 + k * r2.uniform(8, 26)
        spark(q, x + math.cos(a) * d, y + math.sin(a) * d, (255, 250, 220), 1)
    return q.im


def sandman_frame(t=0.0, bob=0, dx=0, lean=0.0, sack=(1.25, 0), umb=(1.3, 0.0), eyes=1, smile=1, hat=1, sink=0, wrap=0.0,
                  sand=None, swirl=0, fl=None, k=0):
    """Side view facing right: a tall thin old man in a floor-length night-blue cloak scattered with gold stars and moons,
    a tall top hat with a crescent pin, a long pale face with a long nose, sleepy smile and half-shut eyes, a white
    nightshirt collar; the near hand holds the sand sack (sack = arm angle, opened), the far hand the umbrella
    (umb = angle, open); wrap 0..1 draws the cloak round him (the blink), swirl = ring of stars round him."""
    p = Pic(BS, BS)
    f = BS_FEET
    cx = 50 + dx
    top = 9 + bob + sink
    hy = top + 30
    shy = hy + 12
    L = lean
    # umbrella in the far hand (behind)
    ua, uo = umb
    fh = (cx - 10 + L, shy + 24) if uo > 0.05 else (cx + 13 + L * 0.6, shy + 22)
    limb(p, [(cx - 6 + L, shy + 3), ((cx - 12 + L) if uo > 0.05 else (cx + 2 + L), shy + 14), fh], 6, NB[1])
    # the long cloak, wider at the hem, drawn in by wrap
    w0 = 26 - wrap * 10
    body = [(cx - 12 + L, shy), (cx + 10 + L, shy), (cx + w0 * 0.75, f - 1), (cx - w0, f - 1)]
    p.poly(body, NB[2])
    p.poly([(cx - 12 + L, shy), (cx - 4 + L, shy), (cx - w0 * 0.45, f - 1), (cx - w0, f - 1)], NB[1])
    for kx in (-0.6, -0.2, 0.25):
        p.l(cx + kx * 10 + L, shy + 10, cx + kx * w0 * 1.2, f - 1, NB[1])
    p.l(cx + 10 + L, shy, cx + w0 * 0.75, f - 1, NB[3])
    p.l(cx - w0, f - 1, cx + w0 * 0.75, f - 1, NB[0])
    p.l(cx + 3 + L * 0.8, shy + 4, cx + 6, f - 1, NB[0])                     # the cloak's opening
    p.l(cx + 4 + L * 0.8, shy + 4, cx + 7, f - 2, (226, 228, 240))           # the nightshirt showing through
    r2 = random.Random(11)                                                    # gold stars and moons on the cloak
    for j in range(14):
        tt = r2.uniform(0.05, 0.95)
        yy = shy + 4 + tt * (f - shy - 8)
        half = 10 + tt * (w0 - 10)
        xx = cx + L * (1 - tt) + r2.uniform(-half * 0.9, half * 0.6)
        if j % 4 == 0:
            p.e(xx - 2, yy - 2, xx + 2, yy + 2, AU3); p.e(xx - 1, yy - 3, xx + 3, yy + 1, NB[2])
        elif j % 2:
            star5(p, xx, yy, 2.4, AU3, AU4)
        else:
            p.p(xx, yy, AU4)
    # head: long pale face, half-shut sleepy eyes, long nose, a sleepy smile, white wisps of hair
    hx = cx + 6 + L * 1.1
    if uo <= 0.05:                                                             # the furled umbrella, carried like a cane in front
        umbrella(p, fh[0], fh[1], ua, uo, 44)
    p.e(fh[0] - 3, fh[1] - 3, fh[0] + 3, fh[1] + 3, (226, 210, 200))
    p.e(hx - 8, hy - 9, hx + 8, hy + 10, (206, 196, 190))
    p.e(hx - 7, hy - 8, hx + 6, hy + 5, (236, 226, 216))
    p.poly([(hx + 5, hy - 2), (hx + 14, hy + 3), (hx + 5, hy + 4)], (230, 214, 204)); p.l(hx + 5, hy - 2, hx + 14, hy + 3, (250, 244, 236))
    p.p(hx + 13, hy + 3, (226, 150, 150))
    if eyes == 1:                                                              # half shut
        p.l(hx + 1, hy - 3, hx + 6, hy - 3, (70, 60, 90)); p.l(hx + 2, hy - 2, hx + 5, hy - 2, (90, 120, 200)); p.l(hx + 1, hy - 1, hx + 5, hy - 1, (150, 130, 130))
    elif eyes == 2:                                                            # wide, glinting
        p.e(hx + 1, hy - 4, hx + 6, hy, WHITE); p.e(hx + 3, hy - 3, hx + 5, hy - 1, (60, 90, 200)); p.p(hx + 4, hy - 3, WHITE)
    else:                                                                      # shut
        p.arc(hx + 1, hy - 4, hx + 6, hy - 1, 20, 160, (80, 60, 70))
    p.l(hx + 2, hy - 6, hx + 7, hy - 5, (240, 240, 250))                      # a white eyebrow
    if smile == 1:
        p.arc(hx + 2, hy + 1, hx + 10, hy + 7, 30, 120, (120, 70, 80))
    elif smile == 2:
        p.e(hx + 4, hy + 4, hx + 10, hy + 8, (70, 30, 50))
    else:
        p.l(hx + 4, hy + 6, hx + 9, hy + 6, (120, 70, 80))
    p.lines([(hx - 8, hy + 2), (hx - 10, hy + 7), (hx - 7, hy + 10)], (240, 240, 250), 2)   # white hair wisps
    # collar
    p.poly([(hx - 7, hy + 8), (hx + 5, hy + 8), (hx + 7, shy + 2), (hx - 9, shy + 2)], (226, 228, 240))
    if hat:                                                                    # the tall top hat
        bx, by = hx - 1, hy - 8
        p.poly([(bx - 13, by + 1), (bx - 12, by - 2), (bx + 12, by - 2), (bx + 14, by + 1), (bx + 10, by + 3), (bx - 10, by + 3)], NB[1])
        p.poly([(bx - 9, by - 1), (bx - 10, by - 26), (bx + 9, by - 27), (bx + 8, by - 1)], NB[2])
        p.poly([(bx - 9, by - 1), (bx - 10, by - 26), (bx - 4, by - 26), (bx - 4, by - 1)], NB[3])
        p.l(bx - 10, by - 27, bx + 9, by - 27, NB[4])
        p.r(bx - 9, by - 8, bx + 8, by - 4, (90, 50, 120))
        p.e(bx + 1, by - 22, bx + 7, by - 15, AU3); p.e(bx + 2, by - 23, bx + 8, by - 16, NB[2])   # crescent pin
        star5(p, bx - 3, by - 17, 2, AU4)
    # near arm with the sand sack
    sa, so = sack
    s = (cx + 4 + L, shy + 3)
    el = (s[0] + math.cos(sa) * 14, s[1] + math.sin(sa) * 14)
    hnd = (el[0] + math.cos(sa - 0.5) * 13, el[1] + math.sin(sa - 0.5) * 13)
    limb(p, [s, el, hnd], 7, NB[2], NB[3])
    p.e(hnd[0] - 3, hnd[1] - 3, hnd[0] + 3, hnd[1] + 3, (236, 226, 216))
    if so < 2:
        sandbag(p, hnd[0], hnd[1] + 2, so)
    if uo > 0.05:                                                              # the open umbrella in front
        umbrella(p, fh[0], fh[1], ua, uo, 46)
    im = outline_same(cut_below(p.im, f))
    if sand:
        im = on(im, outline_same(sand_stream(sand[0], hnd[0] + 4, hnd[1], sand[1]), (90, 60, 20)))
    if swirl:
        r = Pic(BS, BS)
        for j in range(12):
            a = j / 12 * math.tau + swirl * 0.55
            rx, ry = 30 + swirl * 2, 12
            x = cx + math.cos(a) * rx
            y = shy + 26 - swirl * 6 + math.sin(a) * ry + (j % 3) * 10 - 10
            if j % 3 == 0:
                star5(r, x, y, 3, AU3, AU4)
            else:
                spark(r, x, y, (230, 220, 255), 1)
        im = on(im, outline_same(r.im))
    if fl:
        im = flash(im, fl)
    return im


def sandman_heap(k):
    """All that is left: a dune of golden sand with the top hat and the folded umbrella on it, sparkles fading (k 0..2)."""
    p = Pic(BS, BS)
    f = BS_FEET
    p.poly([(16, f), (34, f - 12), (56, f - 18), (78, f - 12), (100, f)], SD[1])
    p.poly([(34, f - 12), (56, f - 18), (62, f - 16), (44, f - 8)], SD[2])
    for j in range(10):
        p.p(24 + j * 7, f - 3 - (j % 3) * 3, SD[0])
    p.poly([(26, f), (30, f - 5), (88, f - 4), (92, f)], NB[1])                # the empty cloak under the sand
    for j in range(5):
        star5(p, 34 + j * 12, f - 2, 2, AU3)
    q = Pic(BS, BS)
    umbrella(q, 28, f - 4, -0.12, 0.0, 50)
    bx, by = 64, f - 18                                                        # the hat, tipped on the dune
    poly_r(q, [(bx - 10, by), (bx - 9, by - 20), (bx + 9, by - 21), (bx + 8, by)], NB[2], bx, by, 0.25)
    poly_r(q, [(bx - 14, by + 1), (bx + 14, by + 1), (bx + 12, by + 4), (bx - 12, by + 4)], NB[1], bx, by, 0.25)
    poly_r(q, [(bx - 9, by - 6), (bx + 8, by - 6), (bx + 8, by - 3), (bx - 9, by - 3)], (90, 50, 120), bx, by, 0.25)
    im = on(outline_same(cut_below(p.im, f)), outline_same(cut_below(q.im, f)))
    if k < 2:
        r = Pic(BS, BS)
        sparkles(r, 8 - k * 3, 200 + k, (20, f - 50 + k * 14, 96, f - 10), (AU2, AU3, AU4))
        im = on(im, r.im)
    return im


@builder('sandman')
def make_sandman():
    S_ = sandman_frame
    sv = lambda st, fr: save_boss('sandman', st, fr)
    sv('idle', [S_(bob=(0, 0, 1, 1, 0)[i], sack=(1.25 + 0.06 * math.sin(i / 5 * math.tau), 0), eyes=0 if i == 3 else 1, k=i) for i in range(5)])
    # attack: he dips into the sack and strews the sand forward in a golden fan
    sv('attack', [S_(sack=(0.6, 1), lean=-2, smile=1), S_(sack=(-0.4, 1), lean=-3, smile=2, eyes=2),
                  S_(sack=(-0.05, 1), lean=1, smile=2, eyes=2, sand=(0.2, 1)), S_(sack=(0.2, 1), lean=3, smile=2, eyes=2, sand=(0.6, 2)),
                  S_(sack=(0.4, 1), lean=2, smile=1, sand=(0.7, 3)), S_(sack=(0.9, 0), lean=0)])
    # cast (the blink): the umbrella opens over him, the cloak wraps round, stars swirl - he never disappears from a frame
    sv('cast', [S_(umb=(-1.2, 0.5), wrap=0.2, swirl=1, eyes=0), S_(umb=(-1.35, 1.0), wrap=0.5, swirl=2, eyes=0, smile=2),
                S_(umb=(-1.45, 1.0), wrap=0.8, swirl=3, eyes=0, sack=(1.4, 0), fl=(200, 180, 255)), S_(umb=(-1.5, 1.0), wrap=1.0, swirl=4, eyes=0, sack=(1.4, 0), fl=(230, 220, 255)),
                S_(umb=(-1.4, 1.0), wrap=0.6, swirl=5, eyes=2, smile=2), S_(umb=(-1.25, 0.6), wrap=0.2, swirl=6, eyes=1)])
    sv('hurt', [S_(dx=-4, lean=-3, eyes=2, smile=2, fl=(255, 255, 255)), S_(dx=-2, lean=-2, eyes=2, smile=0), S_(dx=-1)])
    d = [S_(lean=-3, eyes=2, smile=2, sand=(0.3, 5)), S_(lean=-2, eyes=0, smile=0, sink=10, sack=(1.6, 0), wrap=0.3),
         on(S_(eyes=0, smile=0, sink=30, sack=(1.6, 0), hat=0, wrap=0.6), sandman_heap(0)), sandman_heap(0)]
    d += [sandman_heap(0), sandman_heap(1), sandman_heap(2)]
    sv('death', d)


# ================================================================== TEXTURES (palettized like props5-props12)
def wrap_pic(w, h, fn):
    """Draw fn(p, ox, oy) at the nine wrapped offsets into one w x h Pic (strokes that cross an edge come back on the
    other side), so the texture tiles."""
    p = Pic(w, h)
    for ox in (-w, 0, w):
        for oy in (-h, 0, h):
            fn(p, ox, oy)
    return p.im


def leafy(w, h, seed, n=None, dead=0.08, berries=0):
    """Hedge foliage w x h (tiles both ways): a dark noisy base under hundreds of small lit leaves; dead brown leaves
    here and there, a few dark red berries."""
    nz = pnoise(w, h, seed, ((8, 1.0), (4, 0.6), (2, 0.3)))
    rgb = gmap(np.clip(nz * 0.5 + 0.12, 0, 1), HG_STOPS)
    r2 = random.Random(seed)
    n = n or w * h // 5
    leaves = []
    for _ in range(n):
        x, y = r2.randrange(w), r2.randrange(h)
        d = r2.random() < dead * (1.5 if nz[y, x] > 0.6 else 1)
        lit = nz[y, x] * 0.6 + r2.random() * 0.4
        leaves.append((x, y, d, lit))

    def draw(p, ox, oy):
        for x, y, d, lit in leaves:
            pal = DB if d else HG
            c = pal[min(len(pal) - 1, 2 + int(lit * 2.2))] if not d else pal[1 + int(lit * 2)]
            p.r(x + ox, y + oy, x + ox + 1, y + oy, c)
            p.p(x + ox, y + oy + 1, pal[1] if not d else pal[0])
            if lit > 0.75:
                p.p(x + ox, y + oy, HG[5] if not d else DB[3])
        for j in range(berries):
            bx, by = (seed * 7 + j * 13) % w, (seed * 3 + j * 29) % h
            p.p(bx + ox, by + oy, ROSE[2]); p.p(bx + ox + 1, by + oy + 1, ROSE[0])
    put(rgb, wrap_pic(w, h, draw))
    return rgb


def tex_wall_hedge():
    """A dense, high clipped hedge: small leaves all over, a flat trimmed top lit from above, the shadowed base with
    bare stems and dead leaves."""
    w, h = 32, 64
    rgb = leafy(w, h, 1601, berries=3)
    yy, xx = np.mgrid[0:h, 0:w]
    sh = np.clip((yy - 46) / 18, 0, 1)                                       # darker towards the roots
    rgb = rgb * (1 - sh[..., None] * 0.55)
    top = yy <= 2 + (np.sin(xx * 0.9) > 0.6)
    rgb[top] = gmap(np.clip(pnoise(w, h, 1602)[top] * 0.4 + 0.6, 0, 1), HG_STOPS)
    rgb[yy == 0] = HG[4]
    rgb[(yy == 3) & (xx % 3 != 0)] = HG[1]
    for x in (5, 13, 22, 28):                                                # bare stems among the roots
        st = (xx == x) & (yy > 54)
        rgb[st] = DB[1]
        rgb[(xx == x + 1) & (yy > 58)] = DB[0]
    rgb[yy >= 62] = blend(rgb, yy >= 62, (24, 18, 12), 0.7)[yy >= 62]
    finish(rgb, 'wall_hedge.png', 40)


def gardenwall_rgb(seed=1611):
    """Old brick garden wall at half resolution (32 x 64): a stone coping on top, staggered courses of dark red-brown
    brick, moss creeping in the joints and over patches, ivy hanging from the top, a strip of earth and grass below."""
    w, h = 32, 64
    yy, xx = np.mgrid[0:h, 0:w]
    grain = tile_lum(C64 + 'Rocks/Materials/rock_wall_2.png', (w, h), (1, 2))
    r2 = random.Random(seed)
    rgb = np.zeros((h, w, 3))
    # bricks: 4 rows tall, 8 wide, staggered
    row = (yy - 7) // 4
    off = np.where(row % 2 == 0, 0, 4)
    bx = (xx + off) // 8
    bid = row * 13 + bx * 7
    shade = np.array([r2.uniform(-0.12, 0.12) for _ in range(400)])[(bid % 400)]
    lum = np.clip(0.45 + shade + (grain - 0.5) * 0.35, 0, 1)
    rgb[:] = gmap(lum, [(0, BRK[0]), (0.35, BRK[1]), (0.65, BRK[2]), (0.9, BRK[3]), (1, BRK[4])])
    joint = (((yy - 7) % 4) == 0) | (((xx + off) % 8) == 0)
    rgb[joint & (yy >= 7)] = (58, 50, 44)
    lit = ((((yy - 7) % 4) == 1) & ~joint)
    rgb[lit & (yy >= 7)] = blend(rgb, lit & (yy >= 7), BRK[4], 0.3)[lit & (yy >= 7)]
    # stone coping
    cop = yy < 7
    rgb[cop] = gmap(np.clip(grain[cop] * 0.4 + 0.45, 0, 1), ST_STOPS)
    rgb[yy == 0] = ST[4]
    rgb[(yy == 5) | (yy == 6)] = ST[1]
    rgb[cop & (xx % 16 == 0)] = ST[0]
    # moss: in the joints and over noisy patches, thicker low down and under the coping
    nz = pnoise(w, h, seed + 1, ((8, 1.0), (4, 0.6), (2, 0.3)))
    moss = (nz + np.clip((yy - 44) / 30, 0, 0.3) + np.where((yy >= 7) & (yy < 12), 0.15, 0)) > 0.68
    rgb[moss] = gmap(np.clip(nz[moss] * 1.2 - 0.3, 0, 1), [(0, MS[0]), (0.4, MS[1]), (0.75, MS[2]), (1, MS[3])])
    mj = joint & (nz > 0.5) & (yy >= 7)
    rgb[mj] = MS[1]
    # ivy hanging from the coping
    def ivy(p, ox, oy):
        for (x0, ln) in ((3, 20), (11, 9), (19, 26), (27, 14)):
            pts = [(x0 + ox + math.sin(t * 0.5) * 1.5, 6 + oy + t) for t in range(ln)]
            p.lines(pts, HG[1])
            for t in range(2, ln, 3):
                x, y = pts[t]
                sd = 1 if t % 2 else -1
                p.r(x + sd, y, x + sd * 2, y + 1, HG[3] if t % 4 else HG[2])
    put(rgb, wrap_pic(w, h, ivy))
    # earth and grass at the foot
    rgb[yy >= 61] = RU[1]
    for x in range(0, w, 2):
        ht = 2 + (x * 7) % 4
        rgb[(xx == x) & (yy >= h - 1 - ht)] = HG[3] if x % 4 else HG[2]
    return rgb


def tex_wall_gardenwall():
    finish(gardenwall_rgb(), 'wall_gardenwall.png', 44)


def tex_wall_boss_gardener():
    """The head gardener's wall: the mossy brick wall with a rose-grown wooden trellis arch, black hedge behind it,
    and his crossed hedge shears and a rake hung on the wall above."""
    w, h = 64, 128
    rgb = np.kron(gardenwall_rgb(1621), np.ones((2, 2, 1)))
    yy, xx = np.mgrid[0:h, 0:w]
    cx = 31.5
    arch = ((np.abs(xx - cx) <= 21) & (yy >= 46) & (yy <= 121)) | (np.hypot(xx - cx, yy - 46) <= 21)
    inner = ((np.abs(xx - cx) <= 16) & (yy >= 46) & (yy <= 121)) | (np.hypot(xx - cx, yy - 46) <= 16)
    rgb[arch] = (30, 22, 16)
    lf = np.kron(leafy(32, 64, 1622, dead=0.15), np.ones((2, 2, 1)))           # dark hedge seen through the arch
    rgb[inner] = (lf * 0.45)[inner]
    ring = arch & ~inner
    lat = ring & ((((xx + yy) % 6) < 2) | (((xx - yy) % 6) < 2))               # trellis lattice
    rgb[ring] = (40, 28, 18)
    rgb[lat] = WD3
    edge = wrap_outline(arch) & ~arch
    rgb[edge] = WD1
    rgb[wrap_outline(inner) & ring] = WD0
    p = Pic(w, h)                                                              # climbing rose bramble over the trellis
    vine = [(cx - 19 + math.sin(t * 0.3) * 2, 121 - t) for t in range(0, 76)] + \
           [(cx + math.cos(a) * 19, 46 - math.sin(a) * 19) for a in np.linspace(math.pi, 0, 30)] + \
           [(cx + 19 + math.sin(t * 0.3) * 2, 46 + t) for t in range(0, 50)]
    p.lines(vine, (60, 70, 30), 2)
    for i in range(3, len(vine), 7):
        x, y = vine[i]
        leaf(p, x, y, (i * 1.3) % math.tau, 4)
    for i in range(10, len(vine), 17):
        x, y = vine[i]
        p.e(x - 2.5, y - 2.5, x + 2.5, y + 2.5, ROSE[1]); p.e(x - 1.5, y - 2, x + 1.5, y + 1, ROSE[2]); p.p(x, y - 1, ROSE[3])
    for i in range(5, len(vine), 9):
        x, y = vine[i]
        p.p(x + 2, y, (220, 210, 160))
    put(rgb, outline_same(p.im))
    q = Pic(w, h)                                                              # crossed shears and a rake hung above
    hedge_shears(q, cx, 18, -0.55, 0.15, 22, 10)
    q.l(cx - 14, 30, cx + 14, 4, WD2, 2)
    for j in range(5):
        q.l(cx + 10 + j * 1.2 - 3, 4 + j * 1.6 - 3, cx + 10 + j * 1.2 + 1, 4 + j * 1.6 + 1, I2)
    hedge_shears(q, cx, 18, -math.pi + 0.55, 0.15, 22, 10)
    put(rgb, outline_same(q.im))
    finish(rgb, 'wall_boss_gardener.png', 64, half=False)


def gravel_rgb(seed=1631):
    """Garden path: grey-beige gravel (Classic 64 gravel_0 grain) with tufts of dry grass and patches of moss and
    weeds (tiles both ways), full 64 x 64."""
    w = h = 64
    g = tile_lum(C64 + 'Ground/Materials/gravel_0.png', (w, h), (1, 1))
    nz = pnoise(w, h, seed, ((16, 1.0), (8, 0.6), (4, 0.3)))
    rgb = gmap(np.clip(g * 0.7 + 0.1, 0, 1), [(0, (52, 48, 44)), (0.4, (98, 92, 82)), (0.75, (140, 132, 116)), (1, (184, 176, 158))])
    grass = nz > 0.6
    gg = gmap(np.clip(g * 0.6 + (nz - 0.6) * 1.5, 0, 1), [(0, HG[1]), (0.4, HG[2]), (0.7, (96, 112, 54)), (1, (150, 150, 80))])
    rgb[grass] = gg[grass]
    dry = (nz > 0.48) & (nz <= 0.6)
    rgb[dry] = blend(rgb, dry, (110, 100, 60), 0.45)[dry]
    r2 = random.Random(seed)
    tufts = [(r2.randrange(w), r2.randrange(h), r2.random()) for _ in range(26)]

    def draw(p, ox, oy):
        for x, y, k in tufts:
            c = HG[3] if k > 0.5 else (150, 140, 76)
            for j in (-1, 0, 1):
                p.l(x + ox, y + oy, x + ox + j * 1.5, y + oy - 3 - (j == 0), c)
            p.p(x + ox, y + oy - 4, HG[5] if k > 0.5 else (200, 190, 110))
    put(rgb, wrap_pic(w, h, draw))
    return rgb


def tex_floor_garden():
    finish(gravel_rgb(), 'floor_garden.png', 40, half=False)


def tex_floor_thorns():
    """floor_garden (same array) overgrown with a mat of thorny brambles: dark looping stems with pale thorns, a few
    withered leaves and dark red hips - it reads as dangerous next to the plain gravel."""
    w = h = 64
    rgb = gravel_rgb() * 0.72
    r2 = random.Random(1641)
    loops = []
    for i in range(7):
        x0, y0 = r2.uniform(0, w), r2.uniform(0, h)
        a = r2.uniform(0, math.tau)
        pts = []
        for t in range(40):
            a += math.sin(t * 0.35 + i) * 0.25
            x0 += math.cos(a) * 1.6
            y0 += math.sin(a) * 1.6
            pts.append((x0, y0))
        loops.append(pts)

    def draw(p, ox, oy):
        for i, pts in enumerate(loops):
            q = [(x + ox, y + oy) for x, y in pts]
            p.lines(q, (30, 26, 14), 3)
            p.lines(q, (78, 70, 34), 1)
            for t in range(2, len(q) - 1, 3):
                x, y = q[t]
                x2, y2 = q[t + 1]
                nx, ny = -(y2 - y), x2 - x
                sd = 1 if t % 2 else -1
                p.l(x, y, x + nx * sd * 1.6, y + ny * sd * 1.6, (226, 214, 160))
            for t in range(5, len(q), 13):
                x, y = q[t]
                p.e(x - 1, y - 1, x + 1.5, y + 1.5, ROSE[1] if (i + t) % 2 else DB[2])
    put(rgb, wrap_pic(w, h, draw))
    finish(rgb, 'floor_thorns.png', 44, half=False)


def tex_floor_boss_gardener():
    """The head gardener's floor: big mossy flagstones in a ring round a sundial-like rose of laid stone, fallen rose
    petals in the moss (tiles both ways)."""
    w = h = 64
    yy, xx = np.mgrid[0:h, 0:w]
    g = tile_lum(C64 + 'Rocks/Materials/rock_wall_2.png', (w, h), (1, 1))
    r2 = np.random.default_rng(1651)
    pts = r2.uniform(0, 64, (14, 2))                                           # voronoi flagstones (wrapping)
    dmin = np.full((h, w), 1e9)
    d2 = np.full((h, w), 1e9)
    idx = np.zeros((h, w), int)
    for i, (px, py) in enumerate(pts):
        for ox in (-64, 0, 64):
            for oy in (-64, 0, 64):
                d = np.hypot(xx - px - ox, yy - py - oy)
                closer = d < dmin
                d2 = np.where(closer, dmin, np.minimum(d2, d))
                idx = np.where(closer, i, idx)
                dmin = np.where(closer, d, dmin)
    shade = np.array([0.42, 0.5, 0.58, 0.46, 0.54, 0.62, 0.4, 0.5, 0.56, 0.48, 0.6, 0.44, 0.52, 0.58])[idx]
    rgb = gmap(np.clip(shade + (g - 0.5) * 0.4, 0, 1), ST_STOPS)
    seam = (d2 - dmin) < 1.6
    rgb[seam] = MS[1]
    rgb[(d2 - dmin) < 0.7] = MS[0]
    litm = ((d2 - dmin) >= 1.6) & ((d2 - dmin) < 2.6)
    rgb[litm] = blend(rgb, litm, ST[4], 0.25)[litm]
    # the round centrepiece: a rose of laid stone
    rr = np.hypot(xx - 31.5, yy - 31.5)
    disc = rr < 17
    a = np.arctan2(yy - 31.5, xx - 31.5)
    petal = np.cos(a * 6) * 0.5 + 0.5
    rgb[disc] = gmap(np.clip(0.35 + petal[disc] * 0.4 * (rr[disc] / 17) + (g[disc] - 0.5) * 0.3, 0, 1), ST_STOPS)
    rgb[(rr >= 16) & (rr < 18)] = ST[0]
    rgb[(rr >= 15) & (rr < 16)] = ST[4]
    rgb[rr < 5] = BR1
    rgb[rr < 4] = BR2
    rgb[(rr < 3) & (xx < 32) & (yy < 32)] = BR4
    rgb[(rr < 17) & (np.abs(np.cos(a * 6)) > 0.97) & (rr > 5)] = ST[1]
    put(rgb, wrap_pic(w, h, lambda p, ox, oy: [p.p(x + ox, y + oy, ROSE[2] if i % 2 else ROSE[1]) for i, (x, y) in
                                            enumerate([(8, 52), (9, 53), (54, 10), (50, 56), (12, 14), (57, 44), (44, 6)])]))
    finish(rgb, 'floor_boss_gardener.png', 48, half=False)


# ---------------------------------------------------------------- dream textures
def dream_base(w, h, seed, shift=0.0):
    """Swirling purple-black dream stuff at w x h (tiles both ways); shift slides the rows sideways in a wave."""
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    nz = pnoise(w, h, seed, ((16, 1.0), (8, 0.5), (4, 0.25)))
    sw = np.sin((xx / w) * math.tau * 2 + nz * 6 + (yy / h) * math.tau) * 0.5 + 0.5
    if shift:
        sh = (np.sin(yy / h * math.tau * 4) * shift).astype(int)
        sw = np.take_along_axis(sw, (xx.astype(int) + sh) % w, 1)
        nz = np.take_along_axis(nz, (xx.astype(int) + sh) % w, 1)
    return np.clip(sw * 0.55 + nz * 0.45, 0, 1)


def eye(p, x, y, wd, ht, look=0.0, shut=0.0, iris=(120, 220, 140), pal=None):
    """An almond eye centred (x, y): lids, white, iris and pupil (look -1..1 slides the iris); shut 0..1 lowers the lid."""
    lid = pal or (DP[0], DP[3], DP[4])
    pts_t = [(x - wd + i * wd / 4, y - ht * math.sin(i / 8 * math.pi)) for i in range(9)]
    pts_b = [(x + wd - i * wd / 4, y + ht * 0.8 * math.sin(i / 8 * math.pi)) for i in range(9)]
    p.poly(pts_t + pts_b, EYE[0])
    ir = ht * 0.85
    ix = x + look * wd * 0.35
    p.e(ix - ir, y - ir, ix + ir, y + ir, iris)
    p.e(ix - ir * 0.45, y - ir * 0.7, ix + ir * 0.45, y + ir * 0.7, (8, 4, 12))
    p.p(ix - ir * 0.4, y - ir * 0.4, WHITE)
    if shut > 0:
        p.poly(pts_t + [(x + wd, y - ht + shut * ht * 1.8), (x - wd, y - ht + shut * ht * 1.8)], lid[1])
    p.lines(pts_t, lid[0], 2)
    p.lines(pts_b, lid[0])
    p.lines([(px_, py_ - 2) for px_, py_ in pts_t[2:7]], lid[2])


DREAM_EYES = [(16, 24, 9, 4.5, 0.3), (46, 54, 12, 6, -0.4), (18, 88, 8, 4, 0.6), (48, 108, 9, 4.5, -0.1), (44, 12, 6, 3, 0.2)]


def tex_wall_dream():
    """The dream wall: slow swirls of black and violet, five eyes of different sizes staring out of it."""
    w, h = 64, 128
    lum = np.kron(dream_base(32, 64, 1661), np.ones((2, 2)))
    rgb = gmap(lum * 0.85, DP_STOPS)
    p = Pic(w, h)
    for (x, y, wd, ht, lk) in DREAM_EYES:
        p.e(x - wd - 3, y - ht - 3, x + wd + 3, y + ht + 3, DP[0])           # a dark hollow round each eye
    put(rgb, p.im)
    q = Pic(w, h)
    for i, (x, y, wd, ht, lk) in enumerate(DREAM_EYES):
        eye(q, x, y, wd, ht, lk, 0.0, ((120, 220, 140), (230, 190, 60), (200, 80, 220))[i % 3])
    put(rgb, outline_same(q.im, DP[0]))
    finish(rgb, 'wall_dream.png', 48, half=False)


def tex_wall_dreamshift():
    """A shifting dream wall: the same eyes, half shut, but the swirls are bright magenta and teal, smeared sideways
    into streaks with pale shimmer bands and arrow-like chevrons - clearly a different, moving wall."""
    w, h = 64, 128
    yy, xx = np.mgrid[0:h, 0:w]
    lum = np.kron(dream_base(32, 64, 1661, shift=3.0), np.ones((2, 2)))
    stops = [(0, PK[0]), (0.35, PK[1]), (0.6, PK[2]), (0.8, TL[2]), (0.92, TL[3]), (1, TL[4])]
    rgb = gmap(np.clip(lum * 0.9 + 0.1, 0, 1), stops)
    band = ((yy + xx // 2) % 24) < 2                                          # diagonal shimmer bands
    rgb[band] = blend(rgb, band, PK[4], 0.55)[band]
    for y0 in range(6, h, 16):                                                # streaks: horizontal smears
        st = (yy == y0) & (((xx * 3 + y0) % 17) < 9)
        rgb[st] = TL[4]
        rgb[(yy == y0 + 1) & (((xx * 3 + y0) % 17) < 9)] = TL[2]
    p = Pic(w, h)                                                              # chevrons that say 'moving'
    for y0 in (40, 72, 118):
        for j in range(3):
            x0 = 6 + j * 22
            p.lines([(x0, y0 - 4), (x0 + 5, y0), (x0, y0 + 4)], PK[4], 2)
    put(rgb, outline_same(p.im, PK[0]))
    q = Pic(w, h)
    for i, (x, y, wd, ht, lk) in enumerate(DREAM_EYES):
        eye(q, x, y, wd, ht, -lk, 0.55, (90, 230, 220), (PK[0], PK[2], PK[4]))
    put(rgb, outline_same(q.im, PK[0]))
    finish(rgb, 'wall_dreamshift.png', 48, half=False)


def tex_wall_boss_sandman():
    """Jon Blund's wall: a deep night sky full of stars, a great sleeping crescent moon in a nightcap, a golden
    hourglass trickling sand below it, banks of cloud at the foot."""
    w, h = 64, 128
    yy, xx = np.mgrid[0:h, 0:w]
    nz = pnoise(w, h, 1671, ((16, 1.0), (8, 0.5)))
    rgb = gmap(np.clip(yy / h * 0.6 + nz * 0.25, 0, 1), [(0, NB[0]), (0.4, NB[1]), (0.7, NB[2]), (1, NB[3])])
    r2 = random.Random(1672)
    p = Pic(w, h)
    for _ in range(40):
        x, y = r2.randrange(w), r2.randrange(h - 20)
        p.p(x, y, r2.choice([(200, 210, 255), (255, 240, 190), WHITE]))
    for (x, y) in ((8, 10), (56, 26), (12, 60), (54, 70), (30, 6)):
        star5(p, x, y, 3, AU3, AU4)
    put(rgb, p.im)
    q = Pic(w, h)                                                              # the moon with a sleeping face and a nightcap
    mx, my = 30, 38
    q.e(mx - 16, my - 16, mx + 16, my + 16, (250, 236, 170))
    q.e(mx - 8, my - 19, mx + 22, my + 13, NB[1])
    q.arc(mx - 16, my - 16, mx + 16, my + 16, 100, 250, (255, 250, 220))
    q.arc(mx - 13, my - 4, mx - 7, my + 1, 20, 160, (150, 120, 60))          # shut eye
    q.p(mx - 15, my + 3, (210, 180, 100)); q.arc(mx - 15, my + 5, mx - 9, my + 10, 20, 140, (170, 120, 70))   # nose, smile
    q.poly([(mx - 14, my - 10), (mx - 4, my - 22), (mx + 8, my - 26), (mx + 16, my - 20), (mx + 6, my - 18), (mx - 6, my - 12)], (160, 60, 80))
    q.e(mx + 13, my - 23, mx + 19, my - 17, WHITE)
    q.l(mx - 14, my - 10, mx - 6, my - 12, (230, 220, 240), 2)
    for j, (zx, zy) in enumerate(((mx + 4, my - 2), (mx + 10, my - 8), (mx + 17, my - 15))):   # Z z z
        s_ = 2 + j
        q.lines([(zx, zy), (zx + s_, zy), (zx, zy + s_), (zx + s_, zy + s_)], (230, 230, 255))
    # the hourglass
    hx, hy = 32, 90
    q.r(hx - 11, hy - 20, hx + 11, hy - 17, WD2); q.r(hx - 11, hy + 17, hx + 11, hy + 20, WD2)
    q.l(hx - 11, hy - 20, hx + 11, hy - 20, AU3); q.l(hx - 11, hy + 17, hx + 11, hy + 17, AU3)
    for sx in (-10, 10):
        q.l(hx + sx, hy - 17, hx + sx, hy + 17, AU2, 2)
    q.poly([(hx - 8, hy - 17), (hx + 8, hy - 17), (hx + 1, hy), (hx - 1, hy), (hx - 8, hy + 17), (hx + 8, hy + 17)], (150, 170, 220))
    q.poly([(hx - 8, hy - 17), (hx + 8, hy - 17), (hx + 1, hy), (hx - 1, hy)], (150, 170, 220))
    q.poly([(hx - 5, hy - 10), (hx + 5, hy - 10), (hx + 1, hy - 1), (hx - 1, hy - 1)], SD[2])
    q.l(hx, hy, hx, hy + 14, SD[1])
    q.poly([(hx - 8, hy + 17), (hx - 3, hy + 10), (hx + 3, hy + 10), (hx + 8, hy + 17)], SD[2])
    q.l(hx - 5, hy - 16, hx - 2, hy - 4, (220, 230, 255))
    put(rgb, outline_same(q.im, NB[0]))
    c = Pic(w, h)                                                              # clouds along the foot (wrapping)

    def clouds(pp, ox, oy):
        for j in range(5):
            x = j * 14 + ox
            puff(pp, x, 122 + (j % 2) * 2 + oy, 7, (NB[2], NB[3], NB[4], (170, 186, 230)))
    put(rgb, wrap_pic(w, h, clouds))
    finish(rgb, 'wall_boss_sandman.png', 64, half=False)


def dream_floor_rgb():
    """A floating chessboard: lilac and black squares that wobble in a slow wave, each lit along one edge, specks of
    starlight in the black (tiles both ways)."""
    w = h = 64
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    wx = xx + np.sin(yy / h * math.tau) * 2.0
    wy = yy + np.sin(xx / w * math.tau * 2) * 1.5
    sq = (np.floor(wx / 16) + np.floor(wy / 16)) % 2
    fx, fy = np.mod(wx, 16), np.mod(wy, 16)
    nz = pnoise(w, h, 1681, ((16, 1.0), (8, 0.5)))
    light = gmap(np.clip(0.55 + nz * 0.3 - fy / 16 * 0.15, 0, 1), DP_STOPS)
    darkc = gmap(np.clip(0.05 + nz * 0.2, 0, 1), DP_STOPS)
    rgb = np.where(sq[..., None] > 0, light, darkc)
    rgb[(fx < 1) | (fy < 1)] = DP[0]
    lit = (sq > 0) & (((fx >= 1) & (fx < 2)) | ((fy >= 1) & (fy < 2)))
    rgb[lit] = DP[5]
    sh = (sq > 0) & ((fx >= 15) | (fy >= 15))
    rgb[sh] = DP[2]
    r2 = random.Random(1682)
    for _ in range(30):
        x, y = r2.randrange(w), r2.randrange(h)
        if sq[y, x] == 0:
            rgb[y, x] = (220, 200, 255) if r2.random() < 0.7 else (255, 240, 190)
    return rgb


def tex_floor_dream():
    finish(dream_floor_rgb(), 'floor_dream.png', 40, half=False)


def tex_floor_dreammist():
    """floor_dream (same array) under a lilac mist of sleep: soft pale wisps cover most of the board."""
    w = h = 64
    rgb = dream_floor_rgb()
    nz = pnoise(w, h, 1691, ((16, 1.0), (8, 0.6), (4, 0.3)))
    yy, xx = np.mgrid[0:h, 0:w]
    k = np.clip((nz - 0.25) * 1.6, 0, 0.85)
    k = np.round(k * 4) / 4                                                    # stepped, so it reads as pixel-art bands
    mist = gmap(np.clip(nz, 0, 1), [(0, (120, 96, 170)), (0.6, (176, 150, 220)), (1, (226, 210, 250))])
    rgb = rgb * (1 - k[..., None]) + mist * k[..., None]
    wisp = (np.abs(np.sin((xx + nz * 30) / 64 * math.tau * 2 + yy / 9)) < 0.08) & (nz > 0.4)
    rgb[wisp] = (240, 230, 255)
    finish(rgb, 'floor_dreammist.png', 40, half=False)


def tex_floor_boss_sandman():
    """Jon Blund's floor: night-blue tiles with inlaid golden crescent moons and stars in gold grout, drifts of sand
    blown across them (tiles both ways)."""
    w = h = 64
    yy, xx = np.mgrid[0:h, 0:w]
    nz = pnoise(w, h, 1701, ((16, 1.0), (8, 0.5), (4, 0.25)))
    rgb = gmap(np.clip(0.35 + nz * 0.35, 0, 1), [(0, NB[0]), (0.5, NB[1]), (0.8, NB[2]), (1, NB[3])])
    gr = (xx % 32 == 0) | (yy % 32 == 0)
    rgb[gr] = AU1
    rgb[((xx % 32 == 1) | (yy % 32 == 1)) & ~gr] = NB[3]
    p = Pic(w, h)
    for (cx, cy, kind) in ((16, 16, 0), (48, 48, 0), (48, 16, 1), (16, 48, 1)):
        if kind == 0:
            p.e(cx - 8, cy - 8, cx + 8, cy + 8, AU3); p.e(cx - 4, cy - 10, cx + 10, cy + 6, NB[1])
            p.arc(cx - 8, cy - 8, cx + 8, cy + 8, 100, 230, AU4)
        else:
            star5(p, cx, cy, 8, AU2); star5(p, cx, cy, 5, AU3, AU4)
    for (x, y) in ((4, 4), (60, 30), (34, 60), (30, 34)):
        p.p(x, y, AU4)
    put(rgb, outline_same(p.im, NB[0]))
    dz = nz * 0.6 + (np.sin((xx * 2 + yy) / 64 * math.tau * 2) * 0.5 + 0.5) * 0.4
    drift = (dz > 0.62) & (yy % 3 != 0)                                       # thin wind-blown streaks of sand
    rgb[drift] = blend(rgb, drift, SD[1], 0.55)[drift]
    d2 = (dz > 0.7) & (yy % 3 == 1)
    rgb[d2] = SD[2]
    finish(rgb, 'floor_boss_sandman.png', 48, half=False)


@builder('textures')
def make_textures():
    for fn in (tex_wall_hedge, tex_wall_gardenwall, tex_wall_boss_gardener, tex_wall_dream, tex_wall_dreamshift, tex_wall_boss_sandman,
               tex_floor_garden, tex_floor_dream, tex_floor_boss_gardener, tex_floor_boss_sandman, tex_floor_thorns, tex_floor_dreammist):
        fn()


# ================================================================== PROPS
def fountain(k):
    """A round stone garden fountain: a wide moss-stained basin, a fluted pedestal with a small upper bowl; 0 = water
    spouting from the top and falling into the full basin, 1 = dry after you drank: cracked, dead leaves in the bottom."""
    p = Pic(52, 48)
    f = 47
    p.e(2, f - 14, 49, f - 2, ST[1])                                           # the basin
    p.r(2, f - 8, 49, f - 1, ST[1])
    p.e(2, f - 3, 49, f + 2, ST[0])
    p.r(3, f - 8, 48, f - 3, ST[2])
    p.l(3, f - 8, 3, f - 3, ST[3]); p.l(48, f - 8, 48, f - 3, ST[0])
    for x in range(6, 48, 6):
        p.l(x, f - 7, x, f - 3, ST[1])
    p.e(2, f - 16, 49, f - 6, ST[3])                                           # rim
    p.e(4, f - 15, 47, f - 7, (40, 52, 60) if k == 0 else (54, 50, 44))
    if k == 0:
        p.e(5, f - 14, 46, f - 8, (60, 110, 140)); p.l(10, f - 12, 22, f - 12, (150, 200, 220)); p.l(30, f - 10, 40, f - 10, (110, 170, 200))
    else:
        for (x, y) in ((12, f - 11), (20, f - 10), (33, f - 12), (38, f - 10)):
            p.e(x - 1.5, y - 1, x + 1.5, y + 1, DB[1 + (x % 3)])
        p.lines([(30, f - 15), (28, f - 11), (31, f - 8)], ST[0])
    for x in (8, 18, 30, 42):                                                  # moss on the basin
        p.l(x, f - 2, x + 2, f - 5, MS[1])
    p.r(22, f - 32, 29, f - 12, ST[2]); p.l(22, f - 32, 22, f - 12, ST[3]); p.l(29, f - 32, 29, f - 12, ST[0])   # pedestal
    p.l(25, f - 31, 25, f - 13, ST[1])
    p.e(14, f - 36, 37, f - 29, ST[3]); p.e(16, f - 35, 35, f - 31, (40, 52, 60) if k == 0 else ST[1])   # upper bowl
    p.e(23, f - 42, 28, f - 35, ST[3]); p.p(25, f - 41, ST[4])                 # finial
    im = outline_same(p.im)
    if k == 0:
        q = Pic(52, 48)
        for sd in (-1, 1):
            q.arc(25 + sd * 6 - 7, f - 46, 25 + sd * 6 + 7, f - 32, 180 if sd < 0 else 270, 270 if sd < 0 else 360, (190, 230, 250))
            q.lines([(25 + sd * 11, f - 33), (25 + sd * 14, f - 26), (25 + sd * 15, f - 14)], (150, 200, 230))
        q.l(25, f - 46, 25, f - 42, (230, 250, 255))
        for (x, y) in ((10, f - 13), (40, f - 12), (15, f - 34), (36, f - 33)):
            q.p(x, y, WHITE)
        im = on(im, q.im)
    return im


def statue2():
    """A moss-grown stone garden statue on a square plinth: a robed woman carrying an urn on her shoulder, her face
    turned down - clearly an ornament (it stands on a plinth, unlike the angels)."""
    p = Pic(30, 60)
    f = 59
    p.r(4, f - 10, 25, f, ST[2]); p.l(4, f - 10, 25, f - 10, ST[4]); p.l(4, f - 10, 4, f, ST[3]); p.l(25, f - 10, 25, f, ST[0])   # plinth
    p.r(3, f - 12, 26, f - 10, ST[3]); p.r(3, f - 2, 26, f, ST[1])
    p.r(10, f - 7, 19, f - 4, ST[1])
    cx = 15
    p.poly([(cx - 4, f - 40), (cx + 4, f - 40), (cx + 8, f - 12), (cx - 9, f - 12)], ST[2])   # robe
    p.poly([(cx - 4, f - 40), (cx - 1, f - 40), (cx - 5, f - 12), (cx - 9, f - 12)], ST[3])
    for x in (-5, -1, 3, 6):
        p.l(cx + x * 0.3, f - 32, cx + x, f - 12, ST[1])
    p.e(cx - 4, f - 49, cx + 4, f - 40, ST[2]); p.e(cx - 3, f - 48, cx + 2, f - 42, ST[3])   # head, bowed
    p.poly([(cx - 5, f - 44), (cx - 4, f - 50), (cx + 2, f - 51), (cx + 1, f - 47), (cx - 2, f - 42)], ST[2])   # veil
    p.e(cx + 2, f - 56, cx + 11, f - 46, ST[2]); p.e(cx + 3, f - 55, cx + 8, f - 49, ST[3])   # the urn on her shoulder
    p.r(cx + 4, f - 58, cx + 9, f - 55, ST[3]); p.l(cx + 4, f - 58, cx + 9, f - 58, ST[4])
    p.lines([(cx + 3, f - 38), (cx + 7, f - 44), (cx + 7, f - 48)], ST[3], 2)  # the arm up to the urn
    p.lines([(cx - 3, f - 38), (cx - 2, f - 30), (cx + 2, f - 27)], ST[1], 2)
    for (x, y, l_) in ((6, f - 1, 4), (20, f - 1, 3), (cx - 7, f - 13, 3), (cx + 4, f - 13, 4), (cx + 9, f - 50, 2)):
        p.l(x, y, x + 1, y - l_, MS[1]); p.p(x + 1, y - l_, MS[2])
    p.lines([(cx - 1, f - 36), (cx + 1, f - 28), (cx - 1, f - 20)], ST[1])     # a crack
    return outline_same(p.im)


def falsedoor(k):
    """A wooden door in a stone arch, the same planks and iron bands as the real doors (door_wood); 1 = flung open on
    a black nothing full of staring eyes and a grin of teeth."""
    p = Pic(40, 62)
    f = 61
    p.r(1, 8, 38, f, ST[2])                                                    # stone frame with an arched top
    p.e(1, 0, 38, 30, ST[2])
    p.l(1, 14, 1, f, ST[3]); p.l(38, 14, 38, f, ST[0])
    for y in range(18, f, 9):
        p.l(1, y, 5, y, ST[1]); p.l(34, y, 38, y, ST[1])
    p.r(5, 12, 34, f, (6, 4, 8))
    p.e(5, 4, 34, 26, (6, 4, 8))
    if k == 0:
        for j in range(4):                                                    # planks
            x0 = 6 + j * 7
            p.r(x0, 6 if j in (1, 2) else 10, x0 + 6, f - 1, WD2 if j % 2 else WD3)
            p.l(x0, 10, x0, f - 1, WD1)
            p.l(x0 + 2, 14 + j * 3, x0 + 2, 24 + j * 4, WD4)
        p.e(6, 5, 33, 25, (0, 0, 0, 0))
        q = Pic(40, 62)
        q.e(6, 5, 33, 25, WD3)
        for j in range(4):
            q.l(6 + j * 7, 6, 6 + j * 7, 24, WD1)
        p.paste(q.im, 0, 0)
        for y in (20, 46):                                                    # iron bands with rivets
            p.r(6, y, 33, y + 3, I1); p.l(6, y, 33, y, I3)
            for x in (9, 20, 30):
                p.p(x, y + 1, I3)
        p.e(27, 33, 31, 37, I2); p.p(28, 34, I3)                              # ring handle
    else:
        p.poly([(5, 10), (11, 14), (11, f - 3), (5, f - 1)], WD2)            # the door swung in, seen edge-on
        p.l(5, 10, 11, 14, WD4); p.r(5, 22, 11, 24, I1); p.r(5, 46, 11, 48, I1)
        for (x, y, s_) in ((18, 22, 2), (28, 18, 2), (22, 34, 3), (31, 40, 2), (16, 48, 2), (26, 52, 1)):   # eyes in the dark
            c = (255, 230, 90) if s_ > 1 else (255, 80, 60)
            p.e(x - s_, y - 1, x + s_, y + 1, c); p.p(x, y, (10, 0, 0))
            p.e(x + 4 - s_, y - 1, x + 4 + s_, y + 1, c); p.p(x + 4, y, (10, 0, 0))
        for x in range(14, 34, 2):                                            # a grin of teeth
            p.poly([(x, 56), (x + 2, 56), (x + 1, 59)], (230, 226, 210))
    p.r(0, f - 2, 39, f, ST[1])                                                # threshold
    return outline_same(p.im)


def dreamlamp(k):
    """A dream lantern floating on its own: a lilac-glass lantern in a gold frame with a crescent on top, a violet-gold
    flame flickering inside (k 0..2), motes drifting round it."""
    p = Pic(20, 34)
    cx = 10
    p.arc(cx - 4, 0, cx + 4, 7, 180, 360, AU2)                                 # ring and crescent finial
    p.e(cx - 3, 3, cx + 3, 9, AU3); p.e(cx - 1, 2, cx + 4, 8, (0, 0, 0, 0))
    p.poly([(cx - 6, 11), (cx, 8), (cx + 6, 11)], AU1)                         # roof
    p.r(cx - 6, 11, cx + 6, 26, AU1)                                           # frame
    p.r(cx - 5, 12, cx + 5, 25, (150, 110, 210))                               # lilac glass
    p.r(cx - 4, 13, cx - 3, 24, (200, 170, 240))
    p.l(cx, 12, cx, 25, AU1)
    fl = [(cx, 23, 8, 0.0), (cx, 23, 9, 0.8), (cx, 23, 7, -0.8)][k]
    flame(p, fl[0], fl[1], fl[2], fl[3], 1.0, ((150, 60, 200), (220, 130, 255), (255, 220, 140), (255, 250, 230)))
    p.r(cx - 7, 26, cx + 7, 28, AU2); p.l(cx - 7, 26, cx + 7, 26, AU4)        # base
    p.poly([(cx - 3, 28), (cx + 3, 28), (cx, 31)], AU1)
    im = outline_same(p.im)
    r = Pic(20, 34)
    for j, (x, y) in enumerate(((2, 14), (17, 18), (4, 30), (16, 6), (1, 22))):
        if (j + k) % 3:
            r.p(x, y + (k - 1), (230, 200, 255) if j % 2 else (255, 236, 170))
    return on(im, r.im)


@builder('props')
def make_props():
    save_prop('fountain', [fountain(k) for k in range(2)])
    save_prop('statue2', [statue2()])
    save_prop('falsedoor', [falsedoor(k) for k in range(2)])
    save_prop('dreamlamp', [dreamlamp(k) for k in range(3)])


# ================================================================== ITEMS, PARTICLES AND HUD ICONS
@builder('items')
def make_items():
    p = Pic(14, 20)                                                            # the dream flask (ammo for the dream staff)
    p.r(5, 0, 8, 3, DB[2]); p.l(5, 0, 8, 0, DB[3])                             # cork
    p.r(5, 3, 8, 6, (170, 160, 200))                                           # neck
    p.e(1, 5, 12, 19, (120, 110, 150))                                         # round glass belly
    p.e(2, 8, 11, 18, DP[3]); p.e(3, 11, 10, 18, DP[4])
    p.l(2, 12, 11, 12, DP[5])                                                  # the swirling surface
    star5(p, 7, 14, 2.4, AU3, AU4)
    p.p(4, 8, WHITE); p.p(3, 9, (230, 220, 255))
    save(hard(outline_same(p.im)), G_OUT + 'item_dreamflask.png')
    p = Pic(22, 22)                                                            # the shears' pickup: open, seen flat (it spins when thrown)
    for sd in (-1, 1):                                                         # an X: two blades up-right, two red grips down-left
        a = -0.785 + sd * 0.42
        u, v = math.cos(a), math.sin(a)
        p.poly([(11 - v * sd, 11 + u * sd), (11 + u * 4 - v * 2.2 * sd, 11 + v * 4 + u * 2.2 * sd), (11 + u * 10, 11 + v * 10)], STEEL[2])
        p.l(11, 11, 11 + u * 10, 11 + v * 10, STEEL[4] if sd > 0 else STEEL[1])
        p.l(11, 11, 11 - u * 9, 11 - v * 9, WD2, 2)
        p.l(11 - u * 5, 11 - v * 5, 11 - u * 9, 11 - v * 9, ROSE[1], 3)
    p.e(9.8, 9.8, 12.2, 12.2, BR3)
    save(hard(outline_same(p.im)), G_OUT + 'pick_shears.png')
    p = Pic(52, 20)                                                            # the dream staff's pickup, lying sideways
    p.l(1, 13, 38, 9, (58, 36, 82), 3); p.l(1, 12, 38, 8, (90, 60, 120))
    for x in (8, 30):
        y_ = 13 - x * 4 / 37
        p.l(x, y_ - 1.5, x, y_ + 1, AU2, 2)
    p.e(36, 6, 41, 11, AU2)
    p.e(38, 1, 51, 17, (242, 236, 200)); p.e(42, 0, 54, 14, (0, 0, 0, 0))     # crescent
    q = Pic(52, 20)
    q.e(38, 1, 51, 17, (242, 236, 200)); q.e(41, 0, 55, 15, (0, 0, 0, 0))
    q.arc(38, 1, 51, 17, 100, 250, WHITE)
    star5(q, 47, 8, 3.6, AU3, AU4)
    save(hard(on(outline_same(p.im), outline_same(q.im))), G_OUT + 'pick_dreamstaff.png')


@builder('particles')
def make_particles():
    fr = []                                                                    # a withered petal / leaf turning as it falls (2 frames 8x8)
    for k in range(2):
        p = Pic(8, 8)
        if k == 0:
            p.poly([(1, 5), (3, 2), (6, 1), (6, 4), (3, 6)], ROSE[1]); p.l(2, 5, 5, 2, ROSE[0]); p.p(5, 2, ROSE[2])
        else:
            p.poly([(1, 4), (4, 3), (7, 4), (4, 5)], DB[2]); p.l(2, 4, 6, 4, DB[1])
        fr.append(outline_same(p.im))
    save(cells(fr, 8, 8), G_OUT + 'part_petal.png', 2)
    fr = []                                                                    # a glittering grain of dream sand (2 frames 6x6)
    for k in range(2):
        p = Pic(6, 6)
        if k == 0:
            p.ps([(2, 1), (2, 3), (1, 2), (3, 2)], SD[2]); p.p(2, 2, WHITE)
        else:
            p.r(2, 2, 3, 3, SD[1]); p.p(2, 2, SD[3]); p.p(4, 1, DP[4])
        fr.append(p.im)
    save(cells(fr, 6, 6), G_OUT + 'part_dreamsand.png', 2)


@builder('icons')
def make_icons():
    p = Pic(8, 8)                                                              # HUD: the sleep mist (three wavy lines)
    p.bitmap(0, 0, ["........", ".##..##.", "#..##..#", "........", ".##..##.", "#..##..#", "........", "..##.##."], {'#': WHITE})
    save(p.im, G_OUT + 'icon_mist.png')
    p = Pic(8, 8)                                                              # HUD: caught in thorns (a thorny stem)
    p.bitmap(0, 0, ["......#.", ".#...#..", "..#.#...", "...#..#.", "..#.##..", ".#.#....", "#.#.#...", ".#......"], {'#': WHITE})
    save(p.im, G_OUT + 'icon_thorns.png')


# ================================================================== CONTACT SHEET AND CHECKS
NEW_WEAPONS = ('shears', 'dreamstaff')


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
        if name.startswith('fp_'):
            sc = 1
        elif name.startswith(('enemies', 'boss')) or path.startswith(W_OUT):
            sc = 2
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
        for i in range(n):
            c.paste((92, 92, 92, 255), (x + i * fw * sc, y, x + (i + 1) * fw * sc - (2 if n > 1 else 0), y + big.height))
        if os.path.basename(path).startswith(('enemies', 'boss')):              # the feet row
            fl = {64: FEET, 116: BS_FEET}.get(fh)
            if fl:
                for i in range(n):
                    d.line((x + i * fw * sc, y + (fl + 1) * sc - 1, x + (i + 1) * fw * sc - 3, y + (fl + 1) * sc - 1), fill=(80, 80, 80, 255))
        c.alpha_composite(big, (x, y))
    c.convert('RGB').save(SHEET)
    print('sheet', SHEET, c.size)


def check_outputs():
    """Style rules: every pixel fully opaque or fully transparent (textures are opaque), strips divide evenly into
    their frames, nothing below the feet row of enemy / boss cells, figures not clipped by the cell edges."""
    bad = []
    for path, (n, add) in SAVED.items():
        im = Image.open(path).convert('RGBA')
        a = np.array(im)[:, :, 3]
        if not np.isin(a, (0, 255)).all():
            bad.append(path)
        if im.width % n:
            print('UNEVEN STRIP:', path, im.size, n)
        fl = {64: FEET, 116: BS_FEET}.get(im.height)
        if path.startswith(G_OUT) and ('enemies-' in path or 'boss_' in path) and fl and a[fl + 1:].any():
            print('BELOW FEET:', path)
    if bad:
        print('PARTIAL ALPHA:', bad)
    for tag, b in EDGE:
        print('TOUCHES EDGE:', tag, b)


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
