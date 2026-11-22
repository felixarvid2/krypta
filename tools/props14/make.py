#!/usr/bin/env python3
"""Version 17 graphics for Krypta ("Spökskeppet och Laboratoriet"): the ghost ship and the alchemist's laboratory, twelve
new enemies, the ghost captain and the alchemist, textures, props, items, particles, HUD icons and a touch icon.

Run from the folder that holds retrofps/ and assets/ (e.g. /home/user/test):
    python3 retrofps/tools/props14/make.py [name ...]
(with names only those builders run, e.g. `python3 retrofps/tools/props14/make.py rat sheet`; the contact sheet always
shows everything this script has written so far, plus the two new first-person weapons)

The first-person weapons chaincannon / acidsprayer (fp_*.png, js/weapons.js) come from tools/weapon-frames (render-static.mjs
+ pack.py, see the README there, version 17); their static-defs.json entries are built by tools/props14/fp_defs.py.

Out to retrofps/assets/gfx (all enemy cells 64x64, feet row 57, facing right; frames idle 4, movement 6, attack 6,
take_damage 3, death 6; every death ends lying / settled on the floor):
  enemies-ghostpirate_*    a see-through blue-green ghost pirate in a bandana with a cutlass; his legs fade into a wisp;
                           attack a cutlass slash, death dissolves and leaves the cutlass and the bandana on the deck
  enemies-gunner_*         a dead ship's gunner, broad and slow, carrying a short iron mortar on his shoulder; attack lights
                           the fuse and lobs (fire and smoke at the mouth), death drops him and the mortar
  enemies-drownedsailor_*  a bloated blue-grey drowned sailor in a white cap, hung with seaweed, dripping; death collapses
                           into a pool of sea water (the game leaves a puddle there)
  enemies-ghostparrot_*    a small ghost parrot with ragged wings, drawn low in the cell (the game lifts `float` enemies);
                           attack a diving peck; death flutters down to a heap of feathers on the floor
  enemies-tentacle_*       a purple sea tentacle with suckers, rooted in a broken hole in the deck; the hole and the root sit
                           at x 22 in every frame; attack slams down at x ~50; death sinks back into the hole (no _burrow
                           sheet: the death frames played backwards / forwards serve as emerge / dive)
  enemies-rat_*            a ship's rat - a very small figure (12 px tall, 32 long with the tail) in the 64 cell
  enemies-homunculus_*     a small stitched flesh homunculus with a big head and a glass eye; death splits it open
  enemies-ooze_*           a green acid slime with bubbles and a skull inside; death melts flat into a puddle
  enemies-apprentice_*     a young alchemist in a hooded robe, goggles and an apron; attack throws a flask overhand
  enemies-mercurygolem_*   a heavy golem of liquid quicksilver; death melts into a shining puddle (it rises again)
  enemies-vialwisp_*       a floating stoppered flask with a face in the glowing potion, drawn low; attack swells red;
                           death bursts into glass shards and a splash on the floor
  enemies-chimera_*        a lion with a goat's head on its back and a snake for a tail; attack a lunging bite while the
                           goat spits fire and the snake rears; death sinks down onto folded legs
  boss_captain_{idle,attack,cast,hurt,death}.png, boss_alchemist_{...}.png (116x116 cells, feet row 115; idle 5, attack 6,
      cast 6, hurt 3, death 7; attack and cast loop while the state lasts, so they start and end in similar poses).
      The ghost captain (tricorn, long coat, sabre and flintlock, see-through blue-green glow): attack = a sabre cut, cast =
      he points with the sabre and fires the flintlock (the cannon salvo order); death dissolves and leaves hat and sabre.
      The alchemist (leather mask with round goggles and a beak filter, a long coat, a belt of flasks): attack = throws a
      flask, cast = drinks a potion; death falls and the flasks spill.
  prop_cannon.png (2: loaded / fired, smoking), prop_shiplantern.png (2, animated), prop_powderkeg.png (1),
  prop_flaskshelf.png (2: whole / smashed), prop_teslacoil.png (3: resting / sparking, sparking), prop_alembic.png (2,
  bubbling), item_chaincrate.png, item_acidflask.png, pick_chaincannon.png, pick_acidsprayer.png,
  part_acid.png (2, 8x8), part_chainball.png (2, 10x10), part_bubble2.png (2, 7x7), part_feather2.png (2, 8x8),
  icon_acid.png, icon_gold2.png (8x8, white)
Out to retrofps/assets/wall:
  wall_hull, wall_rigging, wall_boss_captain, wall_labtile, wall_jars, wall_boss_alchemist (64x128)
  floor_deck, floor_hold, floor_boss_captain, floor_labtile, floor_boss_alchemist, floor_rotplank, floor_wetdeck,
  floor_acid, floor_transmute (64x64)
Out to retrofps/assets/touch: icon_cannon.png (96x96, white on transparent)
Contact sheet: <scratchpad>/en/v17_sheet.png

Sources: everything is drawn procedurally below in the outlined style of tools/props2-props13, whose drawing helpers are
reused (no outside image is used).
Name clashes (existing files are never overwritten, save() refuses): part_bubble.png and part_feather.png exist, so the new
ones are part_bubble2.png / part_feather2.png as the contract says; nothing else clashed.
Suggested sizes (skeleton = 1.0; apparent height = size x figure px / cell px; figure heights from bbox_report, idle
frame 0): ghostpirate 1.1 (48 px of 64), gunner 1.15 (49 px, broad), drownedsailor 1.1 (50 px), ghostparrot 0.8 (25 px tall,
38 long, float), tentacle 1.2 (51 px), rat 0.6 (12 px tall, 32 long - tiny on purpose), homunculus 0.8 (32 px),
ooze 0.9 (23 px tall, 37 wide), apprentice 1.0 (51 px), mercurygolem 1.3 (49 px, heavy), vialwisp 0.8 (38 px, float),
chimera 1.4 (42 px tall, 52 long, heavy); bosses (116 px cells, the cardinal is 113 px at 4.0): captain 4.0 (109 px with the
hat, 73 px wide with the sabre), alchemist 4.2 (109 px, 46 px wide).
Notes: floor_rotplank and floor_wetdeck are floor_deck (same array) rotted / washed, floor_acid and floor_transmute are
floor_labtile (same array) eaten by acid / with the glowing circle, so they sit next to their plain floors.
"""
import importlib.util
import json
import math
import os
import random
import re
import sys

sys.dont_write_bytecode = True          # the helper modules of props2-props13 are loaded without writing __pycache__

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))


def _load(name, rel):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, '..', rel, 'make.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


P13 = _load('props13make', 'props13')          # loads props2-props12 itself; only its pure drawing helpers are used
P12, P2, P3, P5, P6, P7, P8, P10 = P13.P12, P13.P2, P13.P3, P13.P5, P13.P6, P13.P7, P13.P8, P13.P10
from_p2 = 'OUT Pic outline outline_same hard shift gmap tile_lum blend mask_draw glow tint shear squash strip'.split()
globals().update({k: getattr(P2, k) for k in from_p2})
cut_below, topple, pool, smoke_wisp = P12.cut_below, P12.topple, P12.pool, P12.smoke_wisp
pnoise, up2, spark = P5.pnoise, P5.up2, P5.spark
dark, flash, tube, bez = P6.dark, P6.flash, P6.tube, P6.bez
puff, wrap_outline, feather, bolt = P7.puff, P7.wrap_outline, P7.feather, P7.bolt
chain, sparkles = P8.chain, P8.sparkles
flame, halo, put = P10.flame, P10.halo, P10.put
limb, dust, wrap_pic, star5, poly_r = P13.limb, P13.dust, P13.wrap_pic, P13.star5, P13.poly_r
I0, I1, I2, I3 = P2.I0, P2.I1, P2.I2, P2.I3
F0, F1, F2, F3 = P2.F0, P2.F1, P2.F2, P2.F3
AU0, AU1, AU2, AU3, AU4 = P5.AU0, P5.AU1, P5.AU2, P5.AU3, P5.AU4                # gold
BR0, BR1, BR2, BR3, BR4 = P7.BR0, P7.BR1, P7.BR2, P7.BR3, P7.BR4                # brass
WD0, WD1, WD2, WD3, WD4 = P10.WD0, P10.WD1, P10.WD2, P10.WD3, P10.WD4           # dark wood
SKN = P12.SKN
STEEL = P13.STEEL

G_OUT, W_OUT, T_OUT = 'retrofps/assets/gfx/', 'retrofps/assets/wall/', 'retrofps/assets/touch/'
SCR = '/tmp/claude-0/-home-user/80ee56ba-2fa6-5354-b261-a4ca4fdcb508/scratchpad/en/'
SHEET, MANIFEST = SCR + 'v17_sheet.png', SCR + 'v17_manifest.json'
WHITE = (255, 255, 255)
FW, FEET = 64, 57                                       # enemy cells
BS, BS_FEET = 116, 115                                  # boss cells

# ---------------------------------------------------------------- ship palettes
GH = ((8, 36, 44), (20, 78, 88), (44, 136, 138), (102, 206, 190), (190, 252, 236))           # ghost blue-green
GHO = (6, 26, 34)                                                                              # ghost outline
PL = ((34, 22, 14), (64, 42, 24), (98, 66, 38), (134, 96, 58), (170, 130, 84))              # weathered deck planks
PL_STOPS = [(0, PL[0]), (0.25, PL[1]), (0.55, PL[2]), (0.82, PL[3]), (1, PL[4])]
TAR = ((14, 12, 12), (30, 24, 20), (50, 38, 30), (74, 56, 40))                               # tarred hull
SEA = ((14, 36, 44), (28, 68, 76), (60, 112, 118), (120, 170, 170), (200, 232, 228))         # sea water / drowned skin
DRW = ((40, 56, 60), (72, 94, 96), (110, 132, 128), (154, 172, 164))                         # drowned blue-grey skin
KELP = ((16, 40, 20), (34, 72, 32), (62, 110, 46), (104, 150, 70))                           # seaweed
RED = ((70, 12, 16), (130, 24, 28), (186, 48, 44), (230, 104, 90))                           # bandana / coat red
NAVY = ((14, 18, 36), (28, 36, 66), (48, 60, 104), (80, 96, 146))                           # sailor blue
ROPE = ((70, 50, 26), (118, 90, 52), (166, 134, 86), (204, 178, 128))
CANVAS = ((92, 86, 70), (140, 132, 108), (186, 178, 150), (222, 216, 192))                   # sailcloth
TNT = ((40, 10, 40), (88, 26, 76), (140, 50, 112), (194, 96, 156), (236, 170, 206))          # tentacle purple
RAT = ((34, 26, 24), (64, 50, 44), (96, 78, 66), (134, 112, 94))
PAR = ((20, 70, 40), (40, 130, 70), (90, 200, 110), (180, 250, 190))                         # ghost parrot green
# ---------------------------------------------------------------- lab palettes
TILE = ((70, 82, 78), (128, 142, 134), (176, 188, 178), (204, 214, 202), (226, 232, 220))    # glazed tile
TILE_STOPS = [(0, TILE[0]), (0.3, TILE[1]), (0.6, TILE[2]), (0.85, TILE[3]), (1, TILE[4])]
TG = ((16, 44, 38), (30, 74, 62), (52, 110, 90), (86, 150, 120))                             # dark green tiles
AC = ((18, 54, 8), (44, 120, 18), (100, 200, 40), (180, 250, 100), (236, 255, 196))          # acid green
MERC = ((40, 44, 54), (88, 94, 110), (148, 156, 172), (204, 210, 222), (246, 248, 255))      # quicksilver
MERC_T = ((150, 110, 170), (110, 170, 200))                                                    # its pink / blue sheen
FLESH = ((96, 44, 46), (160, 84, 80), (206, 132, 118), (236, 184, 164))                      # homunculus
ROBE = ((34, 24, 40), (62, 42, 72), (96, 66, 108), (132, 100, 144))                          # apprentice robe
LEA = ((30, 20, 14), (58, 38, 24), (90, 60, 36), (126, 88, 54))                              # leather (alchemist)
LION = ((70, 40, 14), (128, 80, 30), (184, 128, 52), (226, 180, 96))
GOAT = ((60, 56, 50), (110, 104, 92), (162, 154, 136), (210, 204, 186))
SNK = ((20, 50, 24), (40, 90, 40), (80, 140, 60), (150, 200, 100))
GLASS = ((60, 90, 100), (120, 170, 180), (190, 230, 236), (240, 252, 255))
POT = {'red': ((90, 10, 20), (180, 30, 40), (240, 90, 90)), 'blue': ((16, 36, 110), (40, 90, 210), (120, 170, 255)),
       'green': AC[:3], 'purple': ((60, 16, 90), (120, 50, 180), (190, 120, 240)), 'amber': ((110, 60, 10), (210, 140, 30), (255, 210, 100))}

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
    json.dump(man, open(MANIFEST, 'w'), indent=0, sort_keys=True)
    return im


EDGE = []


def check_cell(f, tag, fw, floor, allow_top=False):
    b = f.getbbox()
    if not b:
        EDGE.append((tag, 'empty'))
        return
    if b[0] == 0 or b[2] == fw or (b[1] == 0 and not allow_top):
        EDGE.append((tag, b))


def save_enemy(sheet, state, frames, fw=FW, floor=FEET):
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


def ell(p, x, y, rx, ry, c):
    rx, ry = max(0.0, rx), max(0.0, ry)
    p.e(x - rx, y - ry, x + rx, y + ry, c)


def shade_ball(p, x, y, r, pal, ry=None):
    """A lit ball / blob: dark rim, body, light upper left, a glint."""
    ry = ry or r
    ell(p, x, y, r, ry, pal[0])
    ell(p, x - 0.4, y - 0.4, r - 0.8, ry - 0.8, pal[1])
    ell(p, x - r * 0.25, y - ry * 0.3, r * 0.55, ry * 0.5, pal[2])
    if len(pal) > 3 and r >= 2.5:
        p.p(x - r * 0.4, y - ry * 0.5, pal[3])


def drips(p, n, seed, box, pal):
    """Falling drops in the box (water / acid)."""
    r2 = random.Random(seed)
    x0, y0, x1, y1 = box
    for _ in range(n):
        x, y = r2.uniform(x0, x1), r2.uniform(y0, y1)
        p.l(x, y, x, y + 1, pal[1])
        p.p(x, y + 2, pal[0])


def ghostly(im, seed=0, k=0.18, below=None):
    """Thin a ghost figure: drop a sparse dither of pixels (more towards the bottom) so it reads as see-through."""
    a = np.array(im).copy()
    h, w = a.shape[:2]
    r2 = np.random.default_rng(seed)
    yy = np.arange(h)[:, None] / h
    prob = k * (0.3 + yy * 1.2)
    if below is not None:
        prob = np.where(np.arange(h)[:, None] > below, prob * 2.2, prob * 0.6)
    chk = ((np.arange(h)[:, None] + np.arange(w)[None, :]) % 2 == 0)
    gone = (a[:, :, 3] > 0) & chk & (r2.random((h, w)) < prob)
    a[gone] = 0
    return Image.fromarray(a)


# ================================================================== SHIP TEXTURES
def planks_rgb(w, h, seed, pw=8, pal=PL_STOPS, horiz=False, k=1.0, nails=True, stagger=True):
    """Wooden planks (tiles both ways): boards pw wide running along the long axis with grain, butt joints and
    nail heads; horiz lays them across (rows) instead of along (columns)."""
    if horiz:
        w, h = h, w
    yy, xx = np.mgrid[0:h, 0:w]
    r2 = random.Random(seed)
    bid = xx // pw
    nb = w // pw
    shade = np.array([r2.uniform(-0.14, 0.12) for _ in range(nb + 1)])
    off = np.array([r2.randrange(h) for _ in range(nb + 1)])
    grain = pnoise(w, h, seed, ((16, 1.0), (4, 0.3)))
    streak = np.sin((yy + off[bid]) * 0.35 + grain * 7 + xx * 1.7) * 0.5 + 0.5
    lum = np.clip(0.5 + shade[bid] + (streak - 0.5) * 0.25 * k + (grain - 0.5) * 0.3, 0, 1)
    rgb = gmap(lum, pal)
    seam = (xx % pw) == 0
    rgb[seam] = gmap(np.full(seam.sum(), 0.04), pal)
    lit = (xx % pw) == 1
    rgb[lit] = rgb[lit] * 1.12 + 6
    butt = ((yy + off[bid]) % (h // 2 if stagger else h)) == 0
    rgb[butt & ~seam] = gmap(np.full((butt & ~seam).sum(), 0.08), pal)
    if nails:
        for b in range(nb):
            for j in (2, 5):
                yn = (off[b] + j) % h
                for xn in (b * pw + 2, b * pw + pw - 2):
                    if 0 <= xn < w:
                        rgb[yn, xn] = (24, 20, 18)
                        rgb[(yn - 1) % h, xn] = (110, 100, 90)
    if horiz:
        rgb = rgb.transpose(1, 0, 2)
    return rgb


def tex_wall_hull():
    """The ship's side from within: dark tarred horizontal strakes with treenails, two heavy ribs (frames) running up
    at the tile edges (half a rib on each side, so walls meet in a rib), iron knees and a line of bolts."""
    w, h = 32, 64
    rgb = planks_rgb(w, h, 1701, 6, [(0, TAR[0]), (0.35, TAR[1]), (0.7, TAR[2]), (1, TAR[3])], horiz=True)
    rgb = blend(rgb, np.ones((h, w), bool), PL[2], 0.3)
    yy, xx = np.mgrid[0:h, 0:w]
    rib = (xx < 4) | (xx >= w - 4)
    rl = gmap(np.clip(pnoise(w, h, 1702, ((16, 1.0), (4, 0.3)))[rib] * 0.6 + 0.25, 0, 1), PL_STOPS)
    rgb[rib] = rl
    rgb[(xx == 3) | (xx == w - 4)] = PL[0]
    rgb[(xx == 0) | (xx == w - 1)] = PL[1]
    rgb[(xx == w - 3)] = PL[3]
    for y in range(5, h, 12):                                                 # bolts in the ribs
        rgb[y, 1] = (150, 140, 120); rgb[y, w - 2] = (150, 140, 120)
    for yb in (10, 42):                                                       # iron knee straps across the strakes
        band = (yy >= yb) & (yy <= yb + 1) & ~rib
        rgb[band] = I1
        rgb[(yy == yb) & ~rib] = I2
        for x in range(6, w - 5, 5):
            rgb[yb, x] = I3
    sh = np.clip((yy - 54) / 10, 0, 1)                                        # bilge grime at the foot
    rgb = rgb * (1 - sh[..., None] * 0.4)
    finish(rgb, 'wall_hull.png', 40)


def tex_wall_rigging():
    """The mast: a thick round spar in the middle with iron bands, a furled sail on its yard, shrouds and ratlines (rope
    ladders) running down both sides against a foggy night sky with a few stars."""
    w, h = 32, 64
    yy, xx = np.mgrid[0:h, 0:w]
    nz = pnoise(w, h, 1711, ((16, 1.0), (8, 0.5)))
    sky = gmap(np.clip(yy / h * 0.5 + nz * 0.4, 0, 1), [(0, (8, 12, 26)), (0.5, (18, 26, 44)), (1, (44, 54, 66))])
    rgb = sky
    for (x, y) in ((3, 4), (27, 9), (6, 30), (25, 40), (11, 2)):
        rgb[y, x] = (200, 210, 230)
    # ratlines: the shrouds fan out from the mast top to the sides, crossed by ladder steps
    p = Pic(w, h)
    for sd in (-1, 1):
        for j in range(3):
            x0 = 16 + sd * 2
            x1 = 16 + sd * (8 + j * 3.5)
            p.l(x0, 14, x1, h - 1, ROPE[1])
        for y in range(22, h, 5):
            t = (y - 14) / (h - 15)
            p.l(16 + sd * (2 + 6 * t), y, 16 + sd * (2 + 13 * t), y, ROPE[0])
    # the yard with the furled sail
    p.r(1, 10, 30, 12, WD2); p.l(1, 10, 30, 10, WD3)
    for x in range(1, 31):
        sag = 3 + math.sin(x / 31 * math.pi) * 3
        p.l(x, 13, x, 13 + sag, CANVAS[1] if x % 4 else CANVAS[0])
        p.p(x, 13, CANVAS[3])
    for x in (5, 11, 21, 27):
        p.l(x, 12, x, 18, ROPE[2])                                            # gaskets tying the sail
    rgb = rgb.copy()
    put(rgb, outline_same(p.im))
    # the mast (opaque, over everything)
    mast = np.abs(xx - 15.5) <= 5
    sh = np.clip(1 - np.abs(xx - 13.5) / 6, 0, 1)
    grain = pnoise(w, h, 1712, ((16, 1.0), (4, 0.4)))
    rgb[mast] = gmap(np.clip(sh * 0.6 + grain * 0.3 + 0.1, 0, 1), PL_STOPS)[mast]
    rgb[mast & (np.abs(xx - 15.5) > 4.5)] = PL[0]
    for yb in (6, 30, 52):
        band = mast & (yy >= yb) & (yy <= yb + 1)
        rgb[band] = I1
        rgb[mast & (yy == yb)] = I3
    finish(rgb, 'wall_rigging.png', 44)


def tex_wall_boss_captain():
    """The captain's cabin wall: the hull planks with the great ship's wheel, a skull-and-crossed-sabres flag above it
    and two lit lanterns."""
    w, h = 64, 128
    base = planks_rgb(32, 64, 1721, 6, [(0, TAR[0]), (0.35, TAR[1]), (0.7, TAR[2]), (1, TAR[3])], horiz=True)
    rgb = np.kron(blend(base, np.ones((64, 32), bool), PL[1], 0.3), np.ones((2, 2, 1)))
    p = Pic(w, h)
    # flag
    p.r(10, 6, 53, 34, (16, 14, 18)); p.l(10, 6, 53, 6, (40, 36, 44))
    for x in range(10, 54, 3):
        p.p(x, 34 + (x % 2), (16, 14, 18))
    cx = 31.5
    ell(p, cx, 16, 6, 6, (220, 214, 196)); p.r(cx - 3, 20, cx + 3, 24, (220, 214, 196))
    ell(p, cx - 2.5, 16, 1.6, 1.8, (16, 14, 18)); ell(p, cx + 2.5, 16, 1.6, 1.8, (16, 14, 18))
    p.l(cx - 2, 22, cx - 2, 24, (16, 14, 18)); p.l(cx + 1, 22, cx + 1, 24, (16, 14, 18))
    for sd in (-1, 1):
        p.l(cx - 14 * sd, 30, cx + 14 * sd, 10, STEEL[3], 2)
        p.l(cx - 14 * sd, 30, cx - 10 * sd, 26, BR3, 2)
    # wheel
    wy = 80
    for k in range(8):
        a = k / 8 * math.tau
        p.l(cx + math.cos(a) * 4, wy + math.sin(a) * 4, cx + math.cos(a) * 26, wy + math.sin(a) * 26, WD3, 3)
        ex, ey = cx + math.cos(a) * 25, wy + math.sin(a) * 25
        ell(p, ex, ey, 2.2, 2.2, WD2); p.p(ex - 0.6, ey - 0.6, WD4)
    p.arc(cx - 19, wy - 19, cx + 19, wy + 19, 0, 360, WD2, 4)
    p.arc(cx - 19, wy - 19, cx + 19, wy + 19, 200, 300, WD4, 1)
    ell(p, cx, wy, 5, 5, BR2); ell(p, cx - 1, wy - 1, 2.5, 2.5, BR4)
    # lanterns
    for lx in (6, 57):
        p.l(lx, 44, lx, 50, I2)
        p.r(lx - 4, 50, lx + 4, 62, I1)
        p.r(lx - 3, 52, lx + 3, 60, (255, 200, 90))
        p.l(lx, 53, lx, 59, (255, 250, 200))
        p.poly([(lx - 5, 50), (lx, 46), (lx + 5, 50)], I2)
    put(rgb, outline_same(p.im))
    finish(rgb, 'wall_boss_captain.png', 64, half=False)


def deck_rgb(seed=1731):
    """Weathered deck planks running up and down the 64 x 64 tile, light grey-brown with dark caulked seams."""
    rgb = planks_rgb(64, 64, seed, 8, [(0, (40, 32, 26)), (0.3, (80, 64, 48)), (0.6, (116, 96, 72)), (0.85, (146, 124, 96)), (1, (176, 156, 124))])
    return rgb


def tex_floor_deck():
    finish(deck_rgb(), 'floor_deck.png', 40, half=False)


def tex_floor_hold():
    """The hold: rough dark planks across the tile, grime, scattered straw and a coil of rope."""
    rgb = planks_rgb(64, 64, 1741, 10, PL_STOPS, horiz=True, k=1.4) * 0.72
    nz = pnoise(64, 64, 1742, ((16, 1.0), (8, 0.5)))
    grime = nz > 0.62
    rgb[grime] = blend(rgb, grime, (20, 22, 16), 0.5)[grime]
    r2 = random.Random(1743)
    straws = [(r2.randrange(64), r2.randrange(64), r2.uniform(0, math.pi), r2.randrange(3, 7)) for _ in range(30)]

    def draw(p, ox, oy):
        for x, y, a, ln in straws:
            p.l(x + ox, y + oy, x + ox + math.cos(a) * ln, y + oy + math.sin(a) * ln, (170, 150, 80) if ln % 2 else (130, 110, 56))
        pts = [(42 + ox + math.cos(t) * (2 + t * 0.55), 20 + oy + math.sin(t) * (2 + t * 0.45)) for t in np.linspace(0, 6 * math.pi, 90)]
        p.lines(pts, ROPE[1], 2)                                              # a coil of rope
        p.lines(pts[::3], ROPE[2])
        p.lines([pts[-1], (60 + ox, 30 + oy), (66 + ox, 28 + oy)], ROPE[1], 2)
    put(rgb, outline_same(wrap_pic(64, 64, draw)))
    finish(rgb, 'floor_hold.png', 40, half=False)


def tex_floor_boss_captain():
    """The captain's deck: the planks with a brass-inlaid compass rose in the middle."""
    rgb = deck_rgb(1751) * 0.85
    p = Pic(64, 64)
    c = 31.5
    p.arc(c - 24, c - 24, c + 24, c + 24, 0, 360, BR2, 2)
    p.arc(c - 20, c - 20, c + 20, c + 20, 0, 360, BR1, 1)
    for k in range(8):
        a = k / 8 * math.tau - math.pi / 2
        ln = 22 if k % 2 == 0 else 13
        tip = (c + math.cos(a) * ln, c + math.sin(a) * ln)
        l_ = (c + math.cos(a - 0.5) * 4, c + math.sin(a - 0.5) * 4)
        r_ = (c + math.cos(a + 0.5) * 4, c + math.sin(a + 0.5) * 4)
        p.poly([(c, c), l_, tip], BR3 if k % 2 == 0 else BR2)
        p.poly([(c, c), r_, tip], BR1 if k % 2 == 0 else BR0)
    ell(p, c, c, 2.5, 2.5, BR4)
    p.poly([(c - 2, 4), (c, 0), (c + 2, 4)], RED[2])                          # north marker
    put(rgb, outline_same(p.im))
    finish(rgb, 'floor_boss_captain.png', 48, half=False)


def tex_floor_rotplank():
    """Rotten deck: the deck planks gone black-green and soft, split along the grain, with holes into the dark below,
    fungus and a broken board end - clearly weaker than plain deck."""
    rgb = deck_rgb() * 0.7
    rgb = blend(rgb, np.ones((64, 64), bool), (44, 40, 26), 0.3)
    nz = pnoise(64, 64, 1761, ((16, 1.0), (8, 0.6), (4, 0.3)))
    rot = nz > 0.55
    rgb[rot] = blend(rgb, rot, (28, 30, 18), 0.55)[rot]
    p = Pic(64, 64)
    r2 = random.Random(1762)
    for b in range(8):                                                        # cracks along each board
        x = b * 8 + r2.randrange(2, 6)
        y0 = r2.randrange(64)
        ln = r2.randrange(14, 30)
        pts = [(x + math.sin(t * 0.5 + b) * 0.8, y0 + t) for t in range(ln)]
        p.lines(pts, (8, 6, 6))
    for (x, y, rw, rh) in ((19, 22, 6, 9), (44, 46, 5, 7), (53, 10, 3, 5)):    # holes with jagged edges
        p.poly([(x - rw, y - rh + 2), (x - rw + 2, y - rh), (x + rw - 1, y - rh + 1), (x + rw, y + rh - 3), (x + rw - 2, y + rh),
                (x - rw + 1, y + rh - 1)], (4, 4, 6))
        p.l(x - rw + 2, y - rh, x + rw - 1, y - rh + 1, (120, 96, 60))
        for j in range(3):
            p.l(x - rw + j * 3, y + rh - 1, x - rw + j * 3 + 1, y + rh + 2, (74, 60, 40))
    for (x, y) in ((8, 50), (36, 30), (60, 12)):                              # pale fungus
        ell(p, x, y, 2.2, 1.4, (196, 190, 150)); p.p(x - 1, y - 1, (230, 226, 196))
    put(rgb, wrap_pic(64, 64, lambda q, ox, oy: q.paste(p.im, ox, oy)))
    finish(rgb, 'floor_rotplank.png', 40, half=False)


def tex_floor_wetdeck():
    """Wave-washed deck: the deck planks darkened and glossy with water, bright streaks along the boards and lines of
    white foam."""
    rgb = deck_rgb() * 0.62
    rgb = blend(rgb, np.ones((64, 64), bool), SEA[1], 0.35)
    yy, xx = np.mgrid[0:64, 0:64]
    nz = pnoise(64, 64, 1771, ((16, 1.0), (8, 0.5)))
    gloss = (xx % 8 == 3) & (np.sin(yy * 0.21 + nz * 9 + xx) > 0.55)
    rgb[gloss] = SEA[3]
    rgb[(xx % 8 == 4) & (np.sin(yy * 0.21 + nz * 9 + xx) > 0.9)] = SEA[4]
    p = Pic(64, 64)

    def foam(q, ox, oy):
        r3 = random.Random(1772)
        for j, y0 in enumerate((14, 46)):
            fy = lambda x: y0 + oy + math.sin(x / 64 * math.tau + j * 2) * 3 + math.sin(x / 64 * math.tau * 3 + j) * 1.5
            for x0 in range(0, 64, 4):
                if r3.random() < 0.75:
                    q.l(x0 + ox, fy(x0), x0 + ox + 3, fy(x0 + 3), (222, 238, 238) if r3.random() < 0.6 else (180, 208, 210), 2 if r3.random() < 0.5 else 1)
            for _ in range(14):
                x = r3.uniform(0, 64)
                q.p(x + ox, fy(x) + r3.uniform(2, 6), (190, 214, 214))
    put(rgb, wrap_pic(64, 64, foam))
    finish(rgb, 'floor_wetdeck.png', 40, half=False)


# ================================================================== LAB TEXTURES
def labtile_rgb(w=64, h=64, seed=1801, tw=8, th=8, glaze=TILE_STOPS):
    """Glazed square tiles with grey grout and grime in the joints (tiles both ways)."""
    yy, xx = np.mgrid[0:h, 0:w]
    r2 = random.Random(seed)
    tid = (yy // th) * 31 + (xx // tw)
    shade = np.array([r2.uniform(-0.08, 0.06) for _ in range(4000)])[tid % 4000]
    nz = pnoise(w, h, seed, ((16, 1.0), (4, 0.3)))
    lum = np.clip(0.62 + shade + (nz - 0.5) * 0.2, 0, 1)
    rgb = gmap(lum, glaze)
    gx, gy = xx % tw, yy % th
    rgb[(gx == 1) | (gy == 1)] = rgb[(gx == 1) | (gy == 1)] * 1.06 + 6
    rgb[(gx == tw - 1) | (gy == th - 1)] = rgb[(gx == tw - 1) | (gy == th - 1)] * 0.86
    grout = (gx == 0) | (gy == 0)
    rgb[grout] = (74, 78, 70)
    dirt = grout & (nz > 0.55)
    rgb[dirt] = (50, 56, 44)
    return rgb


def tex_wall_labtile():
    """Laboratory wall: cream glazed tiles above a dark green tiled dado with a moulded border, stains running down
    under a pipe."""
    w, h = 32, 64
    rgb = labtile_rgb(w, h, 1811, 8, 4)
    yy, xx = np.mgrid[0:h, 0:w]
    low = yy >= 44
    g = labtile_rgb(w, h, 1812, 4, 4, [(0, TG[0]), (0.4, TG[1]), (0.7, TG[2]), (1, TG[3])])
    rgb[low] = g[low]
    rgb[(yy == 42) | (yy == 43)] = TG[3]
    rgb[yy == 44] = TG[0]
    rgb[yy == 42] = (120, 170, 140)
    # a copper pipe along the top with stains below
    rgb[(yy >= 3) & (yy <= 5)] = (150, 84, 44)
    rgb[yy == 3] = (210, 140, 84)
    rgb[yy == 5] = (90, 46, 24)
    for x in (7, 22):
        st = (np.abs(xx - x - np.sin(yy * 0.3)) < 1.2) & (yy > 5) & (yy < 30 + x % 7)
        rgb[st] = blend(rgb, st, (110, 130, 90), 0.45)[st]
    rgb = rgb * 0.88
    finish(rgb, 'wall_labtile.png', 44)


JAR_COLS = [POT['green'], POT['red'], POT['blue'], POT['amber'], POT['purple'], ((70, 80, 60), (120, 140, 100), (170, 190, 150))]


def jar(p, x, base, w, h, liq, fill=0.7, lid=True, thing=None):
    """A glass jar standing on `base`: rim, glass, coloured contents up to fill, a highlight, a cork or cap."""
    p.r(x - w, base - h, x + w, base, GLASS[0])
    p.r(x - w + 1, base - h + 1, x + w - 1, base - 1, (40, 54, 58))
    lt = base - 1 - (h - 2) * fill
    p.r(x - w + 1, lt, x + w - 1, base - 1, liq[1])
    p.l(x - w + 1, lt, x + w - 1, lt, liq[2])
    p.r(x - w + 1, base - 2, x + w - 1, base - 1, liq[0])
    if thing == 'eye':
        ell(p, x, lt + (base - lt) * 0.5, 1.6, 1.6, (230, 226, 210)); p.p(x + 0.5, lt + (base - lt) * 0.5, (20, 60, 120))
    elif thing == 'bones':
        p.l(x - w + 2, base - 3, x + w - 2, lt + 2, (220, 214, 190))
    p.l(x - w + 1, base - h + 2, x - w + 1, base - 3, GLASS[3])
    if lid:
        p.r(x - w + 1, base - h - 2, x + w - 1, base - h, WD2 if (x * 7) % 3 else (150, 80, 40))
        p.l(x - w + 1, base - h - 2, x + w - 1, base - h - 2, WD4)


def tex_wall_jars():
    """Shelves of jars: three dark wooden shelves full of jars and bottles - coloured liquids, specimens, an eye, bones -
    against the tiled wall, the uprights at the tile edges."""
    w, h = 64, 128
    rgb = np.kron(labtile_rgb(32, 64, 1821, 8, 4), np.ones((2, 2, 1))) * 0.45
    p = Pic(w, h)
    r2 = random.Random(1822)
    shelves = (40, 82, 124)
    for sy in shelves:
        p.r(0, sy, 63, sy + 3, WD2); p.l(0, sy, 63, sy, WD4); p.l(0, sy + 3, 63, sy + 3, WD0)
    p.r(0, 0, 2, 127, WD1); p.r(61, 0, 63, 127, WD1); p.l(2, 0, 2, 127, WD3)
    for si, sy in enumerate(shelves):
        x = 6
        while x < 58:
            wj = r2.choice((3, 3, 4, 5))
            hj = r2.choice((14, 16, 18, 20, 24, 30))
            if x + wj > 59:
                break
            liq = r2.choice(JAR_COLS)
            thing = r2.choice((None, None, 'eye', 'bones', None))
            if hj > 22:   # a tall bottle with a neck
                p.r(x - wj, sy - hj + 7, x + wj, sy - 1, GLASS[0]); p.r(x - wj + 1, sy - hj + 9, x + wj - 1, sy - 1, liq[1])
                p.l(x - wj + 1, sy - hj + 9, x + wj - 1, sy - hj + 9, liq[2])
                p.r(x - 1, sy - hj, x + 1, sy - hj + 7, GLASS[1]); p.r(x - 1, sy - hj - 2, x + 1, sy - hj, WD3)
                p.l(x - wj + 1, sy - hj + 8, x - wj + 1, sy - 3, GLASS[3])
            else:
                jar(p, x, sy - 1, wj, hj, liq, r2.uniform(0.4, 0.9), True, thing)
            x += wj * 2 + r2.choice((2, 3, 3, 4))
    put(rgb, outline_same(p.im))
    finish(rgb, 'wall_jars.png', 64, half=False)


def tex_wall_boss_alchemist():
    """The alchemist's wall: the tiled wall with a slate panel bearing a great chalk-and-gold transmutation diagram
    (circle, triangle, square, the seven metal signs), copper pipes and two glowing retorts."""
    w, h = 64, 128
    rgb = np.kron(labtile_rgb(32, 64, 1831, 8, 4), np.ones((2, 2, 1))) * 0.8
    p = Pic(w, h)
    p.r(4, 10, 59, 96, (22, 26, 30)); p.r(4, 10, 59, 11, WD3); p.r(4, 95, 59, 96, WD1)
    p.r(4, 10, 5, 96, WD2); p.r(58, 10, 59, 96, WD2)
    cx, cy = 31.5, 53
    p.arc(cx - 24, cy - 24, cx + 24, cy + 24, 0, 360, AU3, 1)
    p.arc(cx - 21, cy - 21, cx + 21, cy + 21, 0, 360, (200, 200, 190), 1)
    tri = [(cx + math.cos(a) * 21, cy + math.sin(a) * 21) for a in (-math.pi / 2, math.pi / 6, 5 * math.pi / 6)]
    p.lines(tri + [tri[0]], AU3)
    p.r(cx - 7, cy - 4, cx + 7, cy + 10, (0, 0, 0, 0))
    p.lines([(cx - 7, cy - 4), (cx + 7, cy - 4), (cx + 7, cy + 10), (cx - 7, cy + 10), (cx - 7, cy - 4)], (200, 200, 190))
    p.arc(cx - 3, cy - 1, cx + 3, cy + 5, 0, 360, AU4)
    p.p(cx, cy + 2, AU4)
    for k in range(7):                                                        # the seven planetary signs round the ring
        a = k / 7 * math.tau - math.pi / 2
        sx, sy = cx + math.cos(a) * 27.5, cy + math.sin(a) * 27.5
        if k % 3 == 0:
            p.arc(sx - 2, sy - 2, sx + 2, sy + 2, 0, 360, AU4); p.l(sx, sy + 2, sx, sy + 4, AU4)
        elif k % 3 == 1:
            p.arc(sx - 2, sy - 2, sx + 2, sy + 2, 90, 270, AU4); p.l(sx - 2, sy + 3, sx + 2, sy + 3, AU4)
        else:
            p.l(sx - 2, sy, sx + 2, sy, AU4); p.l(sx, sy - 2, sx, sy + 3, AU4)
    # pipes and retorts below
    p.r(0, 102, 63, 105, (150, 84, 44)); p.l(0, 102, 63, 102, (210, 140, 84)); p.l(0, 105, 63, 105, (80, 40, 20))
    for rx, col in ((14, POT['green']), (49, POT['purple'])):
        ell(p, rx, 116, 7, 7, GLASS[0]); ell(p, rx, 117, 6, 5, col[1]); p.l(rx - 5, 114, rx + 5, 114, col[2])
        p.r(rx - 1, 104, rx + 1, 109, GLASS[1]); p.p(rx - 4, 112, GLASS[3])
        p.r(rx - 8, 123, rx + 8, 125, I1)
    put(rgb, outline_same(p.im))
    finish(rgb, 'wall_boss_alchemist.png', 64, half=False)


def tex_floor_labtile():
    finish(floor_lab_rgb(), 'floor_labtile.png', 40, half=False)


def floor_lab_rgb():
    """Laboratory floor: a black and cream checker of glazed tiles (8 px), worn and stained (tiles both ways)."""
    yy, xx = np.mgrid[0:64, 0:64]
    rgb = labtile_rgb(64, 64, 1841, 8, 8)
    chk = ((xx // 8 + yy // 8) % 2 == 1) & (xx % 8 != 0) & (yy % 8 != 0)
    rgb[chk] = rgb[chk] * 0.28 + np.array((14, 20, 22))
    nz = pnoise(64, 64, 1842, ((16, 1.0), (8, 0.5)))
    st = nz > 0.66
    rgb[st] = blend(rgb, st, (90, 100, 60), 0.35)[st]
    return rgb * 0.82


def tex_floor_boss_alchemist():
    """The alchemist's floor: copper-edged octagon tiles of dark slate with small cream square insets at the corners
    and a gold sigil in each octagon."""
    yy, xx = np.mgrid[0:64, 0:64]
    u, v = (xx % 32 - 15.5) / 2, (yy % 32 - 15.5) / 2
    octo = (np.abs(u) + np.abs(v) <= 10.5) & (np.abs(u) <= 7) & (np.abs(v) <= 7)
    nz = pnoise(64, 64, 1851, ((16, 1.0), (4, 0.4)))
    rgb = np.zeros((64, 64, 3))
    rgb[:] = gmap(np.clip(nz * 0.5 + 0.2, 0, 1), [(0, (12, 16, 20)), (0.5, (34, 40, 46)), (1, (64, 70, 76))])
    ins = ~octo
    rgb[ins] = gmap(np.clip(nz[ins] * 0.4 + 0.3, 0, 1), TILE_STOPS)
    edge = octo & ~((np.abs(u) + np.abs(v) <= 10) & (np.abs(u) <= 6.5) & (np.abs(v) <= 6.5))
    rgb[edge] = (170, 96, 50)
    rgb[edge & (v < 0)] = (220, 150, 90)
    sig = octo & (((np.abs(u) < 0.3) & (np.abs(v - 1) < 3)) | ((np.abs(v - 1) < 0.3) & (np.abs(u) < 2)) | (np.abs(np.hypot(u, v + 3) - 1.5) < 0.35))
    rgb[sig] = AU3
    finish(rgb, 'floor_boss_alchemist.png', 40, half=False)


def tex_floor_acid():
    """An acid vat: bubbling bright green acid over the whole tile, the checker tiles of the lab floor showing through
    dissolved at the bottom, scum and bubbles on the surface."""
    base = floor_lab_rgb()
    yy, xx = np.mgrid[0:64, 0:64]
    nz = pnoise(64, 64, 1861, ((16, 1.0), (8, 0.6), (4, 0.3)))
    rgb = gmap(np.clip(nz * 0.8 + 0.1, 0, 1), [(0, AC[0]), (0.35, AC[1]), (0.7, AC[2]), (1, AC[3])])
    rgb = rgb * 0.8 + base * 0.2 * (nz[..., None] < 0.4)
    swirl = np.abs(np.sin(xx * 0.25 + nz * 9 + yy * 0.1)) < 0.08
    rgb[swirl] = AC[3]
    p = Pic(64, 64)
    r2 = random.Random(1862)
    bubbles = [(r2.randrange(64), r2.randrange(64), r2.choice((1.5, 2, 2.5, 3.5))) for _ in range(16)]

    def draw(q, ox, oy):
        for x, y, r in bubbles:
            q.arc(x + ox - r, y + oy - r, x + ox + r, y + oy + r, 0, 360, AC[0])
            q.e(x + ox - r + 1, y + oy - r + 1, x + ox + r - 1, y + oy + r - 1, AC[2])
            q.p(x + ox - r * 0.4, y + oy - r * 0.4, AC[4])
    put(rgb, wrap_pic(64, 64, draw))
    finish(rgb, 'floor_acid.png', 40, half=False)


def tex_floor_transmute():
    """A transmutation circle: the lab floor with a glowing gold circle chalked across it - two rings, a hexagram,
    signs between the rings and a bright core."""
    rgb = floor_lab_rgb() * 0.8
    yy, xx = np.mgrid[0:64, 0:64]
    d = np.hypot(xx - 31.5, yy - 31.5)
    halo_ = np.clip(1 - np.abs(d - 26) / 6, 0, 1)
    rgb = rgb + halo_[..., None] * np.array((60, 44, 6))
    p = Pic(64, 64)
    c = 31.5
    for r, col, wd in ((28, AU3, 2), (22, AU4, 1), (8, AU4, 1)):
        p.arc(c - r, c - r, c + r, c + r, 0, 360, col, wd)
    for s in (0, 1):
        tri = [(c + math.cos(a) * 21, c + math.sin(a) * 21) for a in [(-math.pi / 2 + s * math.pi) + k * math.tau / 3 for k in range(3)]]
        p.lines(tri + [tri[0]], AU3)
    for k in range(6):
        a = k / 6 * math.tau + math.pi / 6
        sx, sy = c + math.cos(a) * 25, c + math.sin(a) * 25
        [lambda: p.l(sx - 1.5, sy, sx + 1.5, sy, WHITE), lambda: p.l(sx, sy - 1.5, sx, sy + 1.5, WHITE),
         lambda: p.ps([(sx - 1, sy - 1), (sx + 1, sy + 1), (sx, sy)], WHITE)][k % 3]()
    ell(p, c, c, 3, 3, AU4); p.p(c, c, WHITE)
    put(rgb, p.im)
    finish(rgb, 'floor_transmute.png', 40, half=False)


@builder('textures')
def make_textures():
    for fn in (tex_wall_hull, tex_wall_rigging, tex_wall_boss_captain, tex_wall_labtile, tex_wall_jars, tex_wall_boss_alchemist,
               tex_floor_deck, tex_floor_hold, tex_floor_boss_captain, tex_floor_rotplank, tex_floor_wetdeck,
               tex_floor_labtile, tex_floor_boss_alchemist, tex_floor_acid, tex_floor_transmute):
        fn()


# ================================================================== GHOST PIRATE (drawn, 64x64: a see-through blue-green pirate, legs fading into a wisp)
def cutlass(p, x, y, ang, ln=17, pal=GH, glint=False):
    """A curved cutlass with the hilt at (x, y) along ang: a basket guard, a broad blade bowing back to the tip."""
    u, v = (math.cos(ang), math.sin(ang)), (-math.sin(ang), math.cos(ang))
    P_ = lambda a, b: (x + u[0] * a + v[0] * b, y + u[1] * a + v[1] * b)
    p.poly([P_(2, -1.5), P_(ln * 0.6, -2.4), P_(ln, 0.6), P_(ln * 0.6, 0.4), P_(2, 1.2)], pal[3])
    p.l(*P_(2, -1.5), *P_(ln * 0.6, -2.4), pal[4])
    p.l(*P_(ln * 0.6, -2.4), *P_(ln, 0.6), pal[4])
    p.l(*P_(-3, 0), *P_(1, 0), pal[1], 2)
    p.arc(x - 3, y - 3, x + 3, y + 3, 0, 360, pal[2])
    if glint:
        spark(p, *P_(ln * 0.8, -1), WHITE, 2)


def wisp_tail(p, x, top, base, w, ph, pal):
    """A ghost's lower body: a tapering, curling wisp from (x, top) down to the floor row, swaying with ph."""
    n = 14
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append((x + math.sin(t * 3 + ph) * 3 * t - t * t * 6, top + (base - top) * t, w * (1 - t * 0.85) + 0.6))
    for (px_, py_, r) in pts:
        p.e(px_ - r, py_ - r * 0.6, px_ + r, py_ + r * 0.6, pal[1])
    for (px_, py_, r) in pts[:-3]:
        p.e(px_ - r * 0.6 - 0.5, py_ - r * 0.5, px_ + r * 0.25, py_ + r * 0.3, pal[2])
    tx, ty, _ = pts[-1]
    p.lines([(tx, ty), (tx - 4, ty - 1 + math.sin(ph) * 1.5), (tx - 7, ty - 3)], pal[1], 2)


def ghostpirate_raw(bob=0, dx=0, lean=0.0, arm=0.6, ph=0.0, mouth=0, eyes=1, slash=None, glint=False, hat=1):
    """Side view facing right: a ghost pirate - bandana with knot tails, an eye patch and a glowing eye, a stubbly jaw,
    a striped shirt under an open waistcoat, a sash; the back arm swings loose, the front arm holds a cutlass (arm =
    blade angle: -2.2 raised behind the head .. 0.6 hanging forward .. 1.2 cut through low); below the waist a wisp."""
    p = Pic(64, 64)
    cx = 29 + dx
    top = 12 + bob
    sh = top + 13
    hip = sh + 14
    L = lean
    wisp_tail(p, cx - 1, hip - 2, FEET - 2, 7, ph, GH)
    # back arm
    limb(p, [(cx - 3 + L, sh + 2), (cx - 7 + L, sh + 9 + math.sin(ph) * 2), (cx - 6 + L, sh + 15)], 3, GH[1])
    # torso: shirt with stripes, waistcoat, sash
    p.poly([(cx - 6 + L, sh), (cx + 6 + L, sh), (cx + 5, hip), (cx - 6, hip)], GH[3])
    for y in range(sh + 2, hip, 3):
        p.l(cx - 5 + L * (1 - (y - sh) / 14), y, cx + 5 + L * (1 - (y - sh) / 14), y, GH[2])
    p.poly([(cx - 6 + L, sh), (cx - 1 + L, sh), (cx - 2, hip), (cx - 6, hip)], GH[1])
    p.poly([(cx + 3 + L, sh), (cx + 6 + L, sh), (cx + 5, hip), (cx + 3, hip)], GH[1])
    p.r(cx - 6, hip - 3, cx + 5, hip, GH[0]); p.p(cx + 1, hip - 2, GH[4])
    p.poly([(cx - 6, hip - 1), (cx - 10, hip + 6), (cx - 7, hip + 6), (cx - 4, hip)], GH[0])   # sash tail
    # head
    hx, hy = cx + 2 + L * 1.2, top + 6
    p.l(cx + L, sh, hx - 1, hy + 4, GH[2], 3)
    ell(p, hx, hy, 5.5, 6, GH[2]); ell(p, hx - 0.5, hy - 0.5, 4.5, 5, GH[3])
    p.poly([(hx + 3, hy), (hx + 7, hy + 2), (hx + 3, hy + 3)], GH[3])           # nose
    jaw = 1 + mouth * 1.4
    p.poly([(hx - 3, hy + 4), (hx + 5, hy + 4), (hx + 4, hy + 5 + jaw), (hx - 2, hy + 6 + jaw * 0.5)], GH[1])   # stubbled jaw
    if mouth:
        p.l(hx, hy + 5, hx + 4, hy + 5 + jaw * 0.6, GHO)
    p.ps([(hx - 2, hy + 6), (hx, hy + 7), (hx + 2, hy + 6)], GH[0])
    if eyes:
        p.e(hx + 1, hy - 2, hx + 4, hy + 1, GH[4]); p.p(hx + 3, hy - 1, WHITE)
    else:
        p.l(hx + 1, hy - 1, hx + 4, hy - 1, GH[0])
    p.l(hx - 4, hy - 3, hx + 4, hy - 1, GHO)                                  # eye patch strap
    if hat:                                                                   # bandana with knot tails
        p.poly([(hx - 6, hy - 1), (hx - 5, hy - 6), (hx, hy - 8), (hx + 5, hy - 6), (hx + 6, hy - 2)], GH[1])
        p.l(hx - 5, hy - 6, hx + 4, hy - 7, GH[2])
        for j in (0, 1):
            p.lines([(hx - 6, hy - 3), (hx - 10, hy - 2 + j * 3 + math.sin(ph) * 1.5), (hx - 12, hy + j * 4 + math.sin(ph))], GH[1], 2)
        p.p(hx + 2, hy - 5, GH[3]); p.p(hx - 2, hy - 4, GH[3])
    # front arm with the cutlass
    s = (cx + 2 + L, sh + 2)
    hx2, hy2 = s[0] + math.cos(arm + 0.7) * 10, s[1] + math.sin(arm + 0.7) * 10
    e_ = ((s[0] + hx2) / 2 + 1, (s[1] + hy2) / 2 + 1)
    limb(p, [s, e_, (hx2, hy2)], 3, GH[2], GH[3])
    cutlass(p, hx2, hy2, arm, 17, GH, glint)
    ell(p, hx2, hy2, 1.8, 1.8, GH[3])
    if slash is not None:                                                     # the streak of the cut
        a0, a1 = slash
        for r_, c in ((24, GH[4]), (22, GH[3])):
            p.arc(s[0] - r_, s[1] - r_, s[0] + r_, s[1] + r_, a0, a1, c, 2 if r_ == 24 else 1)
    return p.im


def gp_cell(seed=0, fade=0.16, **kw):
    return ghostly(outline_same(cut_below(ghostpirate_raw(**kw), FEET), GHO), seed, fade, below=40)


def gp_remains(k):
    """What the dissolved ghost leaves: the cutlass and the bandana on the deck, a last curl of mist (k 0..2)."""
    p = Pic(64, 64)
    f = FEET
    cutlass(p, 24, f - 1, 0.05, 17, GH)
    p.poly([(40, f), (42, f - 3), (48, f - 3), (51, f)], GH[1]); p.l(42, f - 3, 48, f - 3, GH[2])
    p.lines([(40, f), (36, f - 1), (34, f)], GH[1], 2)
    im = outline_same(p.im, GHO)
    if k < 2:
        q = Pic(64, 64)
        for j in range(3 - k):
            puff(q, 30 + j * 5, f - 8 - j * 5 - k * 4, 2.5 - k * 0.5, (GH[0], GH[1], GH[2], GH[3]))
        im = on(ghostly(outline_same(q.im, GHO), 5 + k, 0.4), im)
    return im


@builder('ghostpirate')
def make_ghostpirate():
    G = gp_cell
    save_enemy('ghostpirate', 'idle', [G(i, bob=(0, -1, -1, 0)[i], ph=i * 1.57, arm=0.6 + (0, 0.05, 0.1, 0.05)[i]) for i in range(4)])
    save_enemy('ghostpirate', 'movement', [G(10 + i, bob=(0, -1, -2, -1, 0, 1)[i], ph=i * 1.05, lean=1.5, arm=0.5 + 0.1 * math.sin(i)) for i in range(6)])
    save_enemy('ghostpirate', 'attack', [G(20, arm=-1.0, lean=-1, mouth=1), G(21, arm=-2.2, lean=-2, mouth=1, ph=0.5),
                                         G(22, arm=-0.6, lean=2, mouth=2, dx=2, slash=(-120, -40), ph=1.0),
                                         G(23, arm=0.6, lean=3, mouth=2, dx=3, slash=(-90, 30), glint=True, ph=1.5),
                                         G(24, arm=1.1, lean=2, mouth=1, dx=2, ph=2.0), G(25, arm=0.7, lean=0, ph=2.5)])
    save_enemy('ghostpirate', 'take_damage', [flash(G(30, dx=-3, lean=-3, mouth=2, eyes=0, fade=0.45), GH[4]),
                                              G(31, dx=-2, lean=-2, mouth=1, fade=0.3), G(32, dx=-1)])
    d = [flash(G(40, dx=-2, lean=-3, mouth=2, eyes=0), WHITE), G(41, dx=-2, bob=-3, mouth=2, eyes=0, fade=0.45, arm=1.2),
         G(42, dx=-1, bob=-6, eyes=0, fade=0.75, arm=1.3, hat=0), gp_remains(0), gp_remains(1), gp_remains(2)]
    save_enemy('ghostpirate', 'death', d)


# ================================================================== GUNNER (drawn, 64x64: a dead gunner with a hand mortar on his shoulder)
DSK = ((62, 70, 62), (100, 110, 96), (140, 150, 130), (178, 186, 164))                       # dead grey-green skin


def mortar(p, x, y, ang, fuse=0, ln=14):
    """A short iron hand mortar with its breech at (x, y), mouth along ang: a fat flared barrel with a bronze ring."""
    u, v = (math.cos(ang), math.sin(ang)), (-math.sin(ang), math.cos(ang))
    P_ = lambda a, b: (x + u[0] * a + v[0] * b, y + u[1] * a + v[1] * b)
    p.poly([P_(0, -4.5), P_(ln - 3, -4), P_(ln, -5.5), P_(ln, 5.5), P_(ln - 3, 4), P_(0, 4.5)], I1)
    p.poly([P_(0, -4.5), P_(ln - 3, -4), P_(ln - 3, -1.5), P_(0, -2)], I2)
    p.l(*P_(1, -3.5), *P_(ln - 4, -3), I3)
    p.l(*P_(ln - 3, -4.5), *P_(ln - 3, 4.5), BR2, 2)
    ell(p, *P_(-1, 0), 4, 4, I1)
    p.e(*P_(ln, -4), *P_(ln + 1, 4), (10, 10, 12)) if False else p.l(*P_(ln, -4), *P_(ln, 4), (14, 14, 16), 2)
    if fuse:
        fx, fy = P_(2, -5)
        p.l(fx, fy, fx - 2, fy - 3, ROPE[2])
        spark(p, fx - 2, fy - 4, (255, 220, 120), 1 + (fuse > 1))


def gunner_raw(step=0.0, bob=0, dx=0, lean=0.0, ang=-0.75, lift=0.0, fuse=0, mouth=0, eyes=1, hat=1, mz=None):
    """Side view facing right: a broad, heavy dead gunner - grey-green skin, a black knit cap, a short navy coat with
    brass buttons over a striped shirt, a red sash, wide canvas trousers, bare feet; a hand mortar braced on his
    shoulder (ang = barrel angle, lift raises it), mz = muzzle blast size (0..3)."""
    p = Pic(64, 64)
    cx = 27 + dx
    f = FEET
    top = 13 + bob
    sh = top + 12
    hip = sh + 16
    L = lean
    for sd in (-1, 1):                                                        # legs in wide trousers
        kx = cx + sd * step * 4
        fx = cx + 2 + sd * step * 6
        col = CANVAS[0] if sd < 0 else CANVAS[1]
        limb(p, [(cx + L * 0.3 + sd, hip), (kx + 1, hip + 7), (fx, f - 2)], 6, col)
        p.r(fx - 2, f - 1, fx + 4, f, DSK[1]); p.p(fx + 4, f, DSK[0])
    p.poly([(cx - 8 + L, sh), (cx + 8 + L, sh), (cx + 9 + L * 0.5, hip + 1), (cx - 8, hip + 1)], NAVY[2])   # coat
    p.poly([(cx - 1 + L, sh + 1), (cx + 6 + L, sh + 1), (cx + 6 + L * 0.5, hip - 2), (cx, hip - 2)], CANVAS[3])
    for y in range(sh + 3, hip - 2, 3):
        p.l(cx + L * 0.8, y, cx + 6 + L * 0.7, y, NAVY[1])
    p.l(cx - 8 + L, sh, cx + 8 + L, sh, NAVY[3])
    for y in (sh + 4, sh + 8, sh + 12):
        p.p(cx - 1 + L * 0.8, y, BR3)
    p.r(cx - 8, hip - 3, cx + 9, hip, RED[1]); p.l(cx - 8, hip - 3, cx + 9, hip - 3, RED[2])
    p.poly([(cx - 8, hip - 1), (cx - 11, hip + 6), (cx - 8, hip + 6)], RED[0])
    hx, hy = cx + 4 + L * 1.2, top + 5                                        # head
    p.l(cx + 2 + L, sh, hx - 1, hy + 4, DSK[1], 4)
    ell(p, hx, hy, 5.5, 6, DSK[1]); ell(p, hx, hy - 0.5, 4.5, 5, DSK[2])
    p.poly([(hx + 3, hy - 1), (hx + 7, hy + 2), (hx + 3, hy + 3)], DSK[2])
    if eyes:
        p.e(hx + 1, hy - 2, hx + 4, hy + 1, (20, 18, 18)); p.p(hx + 3, hy - 1, (255, 200, 80))
    else:
        p.l(hx + 1, hy - 1, hx + 4, hy - 1, DSK[0])
    jaw = 1 + mouth * 1.5
    p.poly([(hx - 1, hy + 4), (hx + 6, hy + 3), (hx + 5, hy + 4 + jaw), (hx - 1, hy + 5 + jaw * 0.6)], (40, 22, 20))
    p.l(hx, hy + 4, hx + 5, hy + 3.5, (200, 196, 150))
    p.ps([(hx - 4, hy + 2), (hx - 3, hy + 4), (hx - 1, hy + 6), (hx + 1, hy + 6)], DSK[0])   # sideburns
    if hat:
        p.poly([(hx - 6, hy - 1), (hx - 5, hy - 6), (hx, hy - 8), (hx + 5, hy - 6), (hx + 6, hy - 2)], (36, 34, 40))
        p.l(hx - 6, hy - 2, hx + 6, hy - 2, (60, 58, 66), 2)
    # the mortar held at the hip, pointing up and forward, both hands on it
    a = ang - lift * 0.3
    bx, by = cx + 3 + L, hip - 4 - lift * 2
    u = (math.cos(a), math.sin(a))
    limb(p, [(cx - 2 + L, sh + 2), (cx + 1 + L, sh + 9), (bx + u[0] * 4, by + u[1] * 4 + 3)], 4, NAVY[1])
    mortar(p, bx, by, a, fuse, 15)
    limb(p, [(cx + 3 + L, sh + 2), (cx + 7 + L, sh + 8), (bx + u[0] * 9, by + u[1] * 9 + 3)], 4, NAVY[2])
    ell(p, bx + u[0] * 9, by + u[1] * 9 + 3, 2.2, 2.2, DSK[2])
    im = p.im
    if mz:
        q = Pic(64, 64)
        mx, my = bx + u[0] * 17, by + u[1] * 17
        if mz == 1:
            for j in range(8):
                aa = j / 8 * math.tau
                q.l(mx, my, mx + math.cos(aa) * (6 if j % 2 else 3), my + math.sin(aa) * (6 if j % 2 else 3), (255, 200, 90), 2)
            ell(q, mx, my, 2.5, 2.5, (255, 248, 210))
        for j in range(mz + 1):
            puff(q, mx + 3 + j * 4, my - 1 - j * 1.5, 3 + j * 0.6, ((70, 70, 74), (130, 130, 134), (176, 176, 178), (214, 214, 214)))
        return on(outline_same(im), outline_same(q.im))
    return outline_same(im)


def gunner_lying(k):
    p = Pic(64, 64)
    f = FEET
    p.poly([(12, f), (14, f - 7), (36, f - 7), (38, f)], NAVY[2])
    p.poly([(30, f), (32, f - 6), (50, f - 5), (52, f)], CANVAS[1])
    p.r(50, f - 3, 54, f, DSK[1])
    ell(p, 8, f - 5, 5.5, 5, DSK[1]); ell(p, 8, f - 6, 4, 3.5, DSK[2])
    p.poly([(3, f - 8), (6, f - 11), (11, f - 10)], (36, 34, 40)) if k == 0 else None
    p.r(18, f - 6, 34, f - 3, RED[1])
    im = outline_same(cut_below(p.im, f))
    q = Pic(64, 64)
    mortar(q, 36 + k * 3, f - 4, -0.15 + k * 0.4)
    if k == 2:
        ell(q, 20, f - 13, 3, 3, (36, 34, 40)); q.poly([(17, f - 12), (23, f - 12), (22, f - 10), (18, f - 10)], (36, 34, 40))
    return on(im, outline_same(cut_below(q.im, f)))


@builder('gunner')
def make_gunner():
    G = gunner_raw
    save_enemy('gunner', 'idle', [G(bob=(0, 0, 1, 1)[i], ang=-0.75 + (0, 0.03, 0.06, 0.03)[i], mouth=(0, 0, 1, 0)[i]) for i in range(4)])
    save_enemy('gunner', 'movement', [G(step=math.sin(i / 6 * math.tau), bob=(0, 1, 1, 0, 1, 1)[i], lean=1, ang=-0.7 + 0.05 * math.sin(i)) for i in range(6)])
    save_enemy('gunner', 'attack', [G(ang=-0.9, lift=0.3, fuse=1), G(ang=-1.0, lift=0.5, fuse=2, mouth=1),
                                    G(ang=-1.0, lift=0.5, fuse=0, mouth=2, mz=1, dx=-1), G(ang=-0.85, lift=0.2, mouth=2, mz=2, dx=-3, lean=-2),
                                    G(ang=-0.8, lift=0.1, mouth=1, mz=3, dx=-2, lean=-1), G(ang=-0.75, dx=-1)])
    save_enemy('gunner', 'take_damage', [flash(G(dx=-3, lean=-3, mouth=2, eyes=0), WHITE), G(dx=-2, lean=-2, mouth=1), G(dx=-1)])
    d = [G(dx=-2, lean=-3, mouth=2, eyes=0, ang=-0.5), G(dx=-3, lean=-4, mouth=2, eyes=0, ang=-0.2, bob=4, hat=0),
         topple(G(dx=8, lean=-3, eyes=0, ang=0.2, bob=3, hat=0), 45, (34, FEET)), gunner_lying(0), gunner_lying(1), gunner_lying(2)]
    save_enemy('gunner', 'death', d)


# ================================================================== DROWNED SAILOR (drawn, 64x64: bloated, kelp-hung, dripping)
def drowned_raw(step=0.0, bob=0, dx=0, lean=0.0, arms=0.0, mouth=0, eyes=1, cap=1, sag=0.0, drip=0):
    """Side view facing right: a bloated drowned sailor - blue-grey swollen skin, a white sailor cap, a torn striped
    jersey and bell-bottoms, seaweed hung over the shoulders, arms reaching forward (arms 0..1 raises them), water
    dripping (drip = seed)."""
    p = Pic(64, 64)
    cx = 28 + dx
    f = FEET
    top = 11 + bob + sag * 6
    sh = top + 12
    hip = sh + 15
    L = lean
    for sd in (-1, 1):
        kx = cx + sd * step * 3
        fx = cx + sd * step * 5
        col = NAVY[1] if sd < 0 else NAVY[2]
        limb(p, [(cx + L * 0.3, hip), (kx + 1, hip + 7), (fx, f - 3)], 5, col)
        p.poly([(fx - 4, f - 3), (fx + 4, f - 3), (fx + 5, f), (fx - 4, f)], col)   # bell bottoms
        p.r(fx - 1, f - 1, fx + 4, f, DRW[1])
    # bloated body
    ell(p, cx + L * 0.5, (sh + hip) / 2, 9, 10, DRW[0])
    ell(p, cx + L * 0.5, (sh + hip) / 2 - 0.5, 8, 9, (200, 206, 210))
    for y in range(int(sh) - 1, int(hip) + 2, 3):
        p.l(cx - 8 + L * 0.5, y, cx + 8 + L * 0.5, y, NAVY[2])
    p.poly([(cx + 2 + L * 0.5, sh + 6), (cx + 7 + L * 0.5, sh + 5), (cx + 6 + L * 0.5, sh + 12), (cx + 3 + L * 0.5, sh + 11)], DRW[2])   # torn hole
    p.l(cx + 3 + L * 0.5, sh + 7, cx + 6 + L * 0.5, sh + 7, DRW[3])
    # head
    hx, hy = cx + 3 + L, top + 5
    ell(p, hx, hy, 6, 6.5, DRW[1]); ell(p, hx - 0.5, hy - 0.5, 5, 5.5, DRW[2])
    p.poly([(hx + 4, hy - 1), (hx + 7, hy + 1), (hx + 4, hy + 3)], DRW[2])
    if eyes:
        ell(p, hx + 2.5, hy - 1, 1.6, 1.6, (230, 236, 226)); p.p(hx + 3, hy - 1, (40, 60, 60))
    else:
        p.l(hx + 1, hy - 1, hx + 4, hy - 1, DRW[0])
    jaw = 1 + mouth * 1.6
    p.e(hx + 1, hy + 2.5, hx + 5, hy + 3 + jaw, (20, 30, 32))
    p.ps([(hx - 4, hy + 1), (hx - 3, hy + 3)], DRW[0])
    if cap:
        p.poly([(hx - 6, hy - 3), (hx - 5, hy - 7), (hx + 4, hy - 7), (hx + 6, hy - 4)], (226, 230, 232))
        p.l(hx - 6, hy - 3, hx + 6, hy - 4, NAVY[2], 2)
        p.p(hx - 1, hy - 6, (180, 186, 190))
    # kelp over the shoulders, hanging down the back and front
    for j, (x0, ln) in enumerate(((cx - 5, 18), (cx + 1, 10), (hx - 4, 8))):
        pts = [(x0 + L * 0.5 + math.sin(t * 0.6 + j) * 1.5, sh - 1 + t) for t in range(ln)]
        p.lines(pts, KELP[1 + (j % 2)], 2)
        p.p(*pts[-1], KELP[3])
    # arms reaching forward
    for far in (True, False):
        s = (cx + (-1 if far else 3) + L * 0.6, sh + 3)
        ex = s[0] + 7
        ey = s[1] + 5 - arms * 6
        hx2, hy2 = s[0] + 14 + arms * 1, s[1] + 4 - arms * 10
        limb(p, [s, (ex, ey), (hx2, hy2)], 4, DRW[1] if far else DRW[2])
        ell(p, hx2 + 1, hy2, 2.5, 2.2, DRW[1] if far else DRW[3])
    im = outline_same(cut_below(p.im, f))
    q = Pic(64, 64)
    drips(q, 6, 300 + drip, (cx - 8, sh + 4, cx + 14, f - 2), SEA[2:4])
    return on(im, q.im)


def sea_puddle(k, cap=True):
    """What is left of the drowned sailor: a spreading pool of sea water with kelp and his white cap (k 0..2)."""
    p = Pic(64, 64)
    f = FEET
    pool(p, 30, f, 30 + k * 6, 4 + k * 0.5, (SEA[0], SEA[1], SEA[3]), 7)
    for (x, ln) in ((18, 7), (36, 9)):
        p.lines([(x, f - 1), (x + 3, f - 2), (x + ln, f - 1)], KELP[2], 2)
    if cap:
        p.poly([(38, f - 1), (39, f - 4), (46, f - 4), (48, f - 1)], (226, 230, 232)); p.l(38, f - 1, 48, f - 1, NAVY[2])
    if k == 0:
        p.ps([(24, f - 4), (34, f - 6), (28, f - 7)], SEA[3])
    return outline_same(p.im)


@builder('drownedsailor')
def make_drownedsailor():
    D = drowned_raw
    save_enemy('drownedsailor', 'idle', [D(bob=(0, 0, 1, 1)[i], arms=0.2 + (0, 0.05, 0.1, 0.05)[i], drip=i, mouth=(0, 1, 1, 0)[i]) for i in range(4)])
    save_enemy('drownedsailor', 'movement', [D(step=math.sin(i / 6 * math.tau) * 0.8, bob=(0, 1, 1, 0, 1, 1)[i], lean=1, arms=0.35, drip=10 + i) for i in range(6)])
    save_enemy('drownedsailor', 'attack', [D(arms=0.8, lean=-1, mouth=1, drip=20), D(arms=1.0, lean=-1, mouth=2, drip=21),
                                           D(arms=0.4, lean=3, mouth=2, dx=2, drip=22), D(arms=0.1, lean=4, mouth=2, dx=3, drip=23),
                                           D(arms=0.2, lean=2, mouth=1, dx=2, drip=24), D(arms=0.3, lean=1, drip=25)])
    save_enemy('drownedsailor', 'take_damage', [flash(D(dx=-3, lean=-3, mouth=2, eyes=0, drip=30), WHITE), D(dx=-2, lean=-2, mouth=1, drip=31), D(dx=-1, drip=32)])
    d = [D(dx=-1, lean=-2, mouth=2, eyes=0, drip=40), squash(D(dx=-1, lean=-1, mouth=2, eyes=0, sag=0.3, drip=41), 0.8, FEET),
         on(sea_puddle(0, False), squash(D(eyes=0, sag=0.5, cap=0, drip=42), 0.5, FEET)), sea_puddle(0), sea_puddle(1), sea_puddle(2)]
    save_enemy('drownedsailor', 'death', d)


# ================================================================== GHOST PARROT (drawn, 64x64: a small ghost parrot, drawn low)
def parrot_raw(w=0.5, dx=0, dy=0, tilt=0.0, beak=0, eyes=1, fold=0.0):
    """Side view facing right: a ragged ghost parrot - green body, a red-tinged ghostly tail of long feathers, a hooked
    beak, a bright eye; w = wing beat (0 up .. 1 down), tilt dives the body, fold folds the wings."""
    p = Pic(64, 64)
    cx, cy = 30 + dx, 42 + dy
    ca, sa = math.cos(tilt), math.sin(tilt)
    R = lambda u, v: (cx + u * ca - v * sa, cy + u * sa + v * ca)
    # tail: long feathers trailing back
    for j, ln in enumerate((15, 13, 11)):
        x0, y0 = R(-6, 1)
        a = math.pi + tilt - 0.15 + j * 0.15
        feather(p, x0, y0, a, ln, 1.8, (GH[1], PAR[1], RED[2] if j == 1 else PAR[2], GH[4]))
    # far wing
    wy = -12 + w * 22
    sx, sy = R(-1, -3)
    p.poly([(sx, sy), R(-6, wy * 0.7 - 2), R(-14, wy), R(-8, -1)], PAR[0])
    # body
    pts = [R(-7, 1), R(-3, -4), R(4, -5), R(7, -2), R(7, 3), R(1, 6), R(-5, 5)]
    p.poly(pts, PAR[1])
    p.poly([R(-6, 0), R(-2, -4), R(4, -4), R(2, 0)], PAR[2])
    p.poly([R(0, 4), R(6, 2), R(5, 5), R(1, 6)], RED[2])                      # red belly
    # head
    hx, hy = R(7, -5)
    ell(p, hx, hy, 4.5, 4.5, PAR[1]); ell(p, hx - 0.5, hy - 0.7, 3.5, 3.3, PAR[2])
    p.poly([R(4, -11), R(6, -9), R(3, -8)], RED[2])                           # crest
    bx, by = R(10, -5)
    p.poly([R(10, -7), R(14, -5), R(13, -2), R(11, -3)], (226, 214, 160))     # beak
    if beak:
        p.poly([R(10, -3), R(13, -1 + beak), R(10, -1)], (180, 170, 120))
    p.p(*R(13, -3), (90, 80, 60))
    if eyes:
        p.e(hx, hy - 2, hx + 3, hy + 1, WHITE); p.p(hx + 2, hy - 1, (10, 10, 10))
    else:
        p.l(hx, hy - 1, hx + 3, hy - 1, PAR[0])
    # near wing
    wy2 = -13 + w * 24 if not fold else 2
    p.poly([R(1, -2), R(-3, wy2 * 0.6 - 2), R(-13 + fold * 6, wy2), R(-12 + fold * 6, wy2 + 3), R(-5, 3)], PAR[2])
    for k in range(3):
        a0 = R(-5 - k * 2.5, 1 + wy2 * 0.3 * (k + 1) / 3)
        p.l(*a0, *R(-12 - k + fold * 6, wy2 + 1 - k), PAR[1])
    p.p(*R(-13 + fold * 6, wy2 + 1), PAR[3])
    # feet tucked
    p.l(*R(0, 6), *R(1, 8), (200, 190, 120)); p.l(*R(3, 6), *R(4, 8), (200, 190, 120))
    return p.im


def parrot(seed=0, fade=0.16, **kw):
    return ghostly(tint(outline_same(cut_below(parrot_raw(**kw), FEET), GHO), GH[3], 0.3), seed, fade)


def feather_heap(k):
    p = Pic(64, 64)
    f = FEET
    r2 = random.Random(77 + k)
    for j in range(7 + k * 2):
        x = 22 + r2.uniform(0, 20)
        feather(p, x, f - r2.uniform(0, 2), r2.choice((0.1, -0.2, 3.0, 2.9)), r2.uniform(5, 8), 1.4, (PAR[0], PAR[1] if j % 3 else RED[1], PAR[2] if j % 3 else RED[2], PAR[3]))
    if k == 0:
        ell(p, 32, f - 3, 6, 3, PAR[1]); p.poly([(36, f - 4), (40, f - 3), (37, f - 1)], (226, 214, 160))
    return ghostly(tint(outline_same(p.im, GHO), GH[3], 0.3), 90 + k, 0.1 + k * 0.08)


@builder('ghostparrot')
def make_ghostparrot():
    Pp = parrot
    save_enemy('ghostparrot', 'idle', [Pp(i, w=(0.0, 0.4, 1.0, 0.5)[i], dy=(0, 1, 2, 1)[i]) for i in range(4)])
    save_enemy('ghostparrot', 'movement', [Pp(10 + i, w=(0.0, 0.35, 0.8, 1.0, 0.65, 0.3)[i], dy=(0, 1, 2, 2, 1, 0)[i], tilt=0.12) for i in range(6)])
    save_enemy('ghostparrot', 'attack', [Pp(20, w=0.0, dy=-4, tilt=-0.3, beak=1), Pp(21, w=0.2, dy=-2, tilt=0.2, fold=0.6, beak=2, dx=2),
                                         Pp(22, w=0.5, dy=2, tilt=0.55, fold=1.0, beak=3, dx=6), Pp(23, w=0.5, dy=4, tilt=0.6, fold=1.0, beak=0, dx=8),
                                         Pp(24, w=0.9, dy=2, tilt=0.2, beak=1, dx=5), Pp(25, w=0.3, dy=0, tilt=0.0, dx=2)])
    save_enemy('ghostparrot', 'take_damage', [flash(Pp(30, w=0.7, dx=-4, dy=-2, tilt=-0.4, beak=2, eyes=0, fade=0.3), GH[4]),
                                              Pp(31, w=0.3, dx=-3, dy=-1, tilt=-0.2, beak=1), Pp(32, w=0.5, dx=-1)])
    d = [flash(Pp(40, w=1.0, dx=-2, tilt=-0.5, beak=2, eyes=0), WHITE), Pp(41, w=0.2, dy=6, tilt=0.9, eyes=0, fade=0.25, fold=0.5),
         Pp(42, w=0.6, dy=11, tilt=1.4, eyes=0, fade=0.35, fold=0.8), feather_heap(0), feather_heap(1), feather_heap(2)]
    save_enemy('ghostparrot', 'death', d)


# ================================================================== TENTACLE (drawn, 64x64: rooted in a hole in the deck at x 22)
TROOT = 22


def deck_hole(p, k=0):
    """The broken hole in the deck the tentacle comes out of: dark water inside, splintered plank ends round it."""
    f = FEET
    ell(p, TROOT, f - 1.5, 12, 3.5, (40, 30, 22))
    ell(p, TROOT, f - 1.5, 10, 2.5, (6, 14, 18))
    p.l(TROOT - 8, f - 2, TROOT - 4, f - 2, SEA[1])
    for j, x in enumerate((-12, -7, 6, 11)):
        p.poly([(TROOT + x, f), (TROOT + x + 1, f - 4 - j % 2), (TROOT + x + 3, f)], PL[3 - j % 2])


def tentacle_raw(path, r0=6.0, curl=0.0, suck=True, k=0):
    """A tentacle as a tube along path (root first): purple-red on top, a pale belly row of suckers underneath, tapering
    to a curled tip (curl winds the last points round)."""
    p = Pic(64, 64)
    deck_hole(p)
    n = len(path)
    radii = [max(0.8, r0 * (1 - i / n) ** 0.8) for i in range(n)]
    pts = list(path)
    if curl:
        x, y = pts[-1]
        a0 = math.atan2(pts[-1][1] - pts[-2][1], pts[-1][0] - pts[-2][0])
        for j in range(1, 6):
            a = a0 + curl * j * 0.6
            x, y = x + math.cos(a) * 1.6, y + math.sin(a) * 1.6
            pts.append((x, y))
            radii.append(0.8)
    tube(p, pts, radii, (TNT[0], TNT[2], TNT[3], TNT[4]))
    if suck:
        for i in range(2, len(path) - 2, 2):
            (x0, y0), (x1, y1) = pts[i], pts[i + 1]
            a = math.atan2(y1 - y0, x1 - x0)
            nx, ny = -math.sin(a), math.cos(a)
            r = radii[i] * 0.75
            sx, sy = x0 + nx * r, y0 + ny * r
            ell(p, sx, sy, max(0.8, r * 0.35), max(0.8, r * 0.35), (236, 200, 200))
            p.p(sx, sy, TNT[1])
    return outline_same(cut_below(p.im, FEET))


def tpath(tip, ctrl, n=18, top=None):
    """Points from the root in the hole through ctrl to tip."""
    return bez((TROOT, FEET - 1), ctrl, tip, n)


@builder('tentacle')
def make_tentacle():
    T = tentacle_raw
    idle = []
    for i in range(4):
        s = math.sin(i / 4 * math.tau)
        idle.append(T(tpath((TROOT + 6 + s * 4, 10), (TROOT - 6 - s * 3, 34)), curl=1.0 + s * 0.3))
    save_enemy('tentacle', 'idle', idle)
    mv = []
    for i in range(6):
        s = math.sin(i / 6 * math.tau)
        c = math.cos(i / 6 * math.tau)
        mv.append(T(tpath((TROOT + 10 + s * 6, 12 + c * 3), (TROOT - 8 + s * 6, 32)), curl=1.2 + c * 0.4))
    save_enemy('tentacle', 'movement', mv)
    at = [T(tpath((TROOT - 6, 6), (TROOT + 2, 30)), curl=1.4), T(tpath((TROOT - 14, 8), (TROOT - 2, 26)), curl=1.6),
          T(tpath((TROOT + 18, 4), (TROOT - 6, 18)), curl=0.4), T(tpath((50, 44), (TROOT + 14, 8)), curl=-0.2),
          T(tpath((50, 53), (TROOT + 18, 16)), curl=-0.6), T(tpath((TROOT + 20, 18), (TROOT + 4, 26)), curl=0.8)]
    q = Pic(64, 64)                                                           # the slam's splash and splinters
    for j in range(6):
        q.l(50 + j % 3, 52, 44 + j * 2.5, 44 - (j % 2) * 3, SEA[3])
    at[4] = on(at[4], q.im)
    save_enemy('tentacle', 'attack', at)
    save_enemy('tentacle', 'take_damage', [flash(T(tpath((TROOT - 2, 14), (TROOT - 12, 32)), curl=2.0), WHITE),
                                           T(tpath((TROOT + 0, 12), (TROOT - 10, 34)), curl=1.8), T(tpath((TROOT + 4, 11), (TROOT - 7, 34)), curl=1.2)])
    d = [flash(T(tpath((TROOT - 4, 14), (TROOT - 12, 30)), curl=2.2), WHITE), T(tpath((TROOT + 2, 26), (TROOT - 10, 40), 14), 4.5, curl=2.0),
         T(tpath((TROOT + 2, 40), (TROOT - 6, 48), 10), 3.5, curl=1.5), T(tpath((TROOT + 1, 50), (TROOT - 3, 54), 6), 2.6, curl=0.8, suck=False)]
    for k in range(2):
        p = Pic(64, 64)
        deck_hole(p)
        for j in range(4 - k * 2):
            p.p(TROOT - 6 + j * 4, FEET - 3 - (j % 2), SEA[3])
        d.append(outline_same(cut_below(p.im, FEET)))
    save_enemy('tentacle', 'death', d)


# ================================================================== RAT (drawn, 64x64: a very small ship's rat)
def rat_raw(step=0.0, bob=0, dx=0, lunge=0.0, mouth=0, eyes=1, tail=0.0, up=0.0):
    """Side view facing right, very small: a brown rat 24 px long with its tail, pink ears and feet, red eyes; lunge
    stretches it forward, up rears the head."""
    p = Pic(64, 64)
    f = FEET
    cx = 30 + dx + lunge * 3
    cy = f - 4 + bob
    p.lines([(cx - 5, cy + 1), (cx - 10, cy + 2 + tail), (cx - 15, cy + tail * 2), (cx - 18, cy - 1 + tail)], (190, 130, 130))
    for sd, ph in ((-1, 0), (1, math.pi)):
        o = math.sin(step * math.pi + ph) * 2
        p.l(cx - 3 + o, cy + 2, cx - 3 + o * 1.3, f, (170, 110, 110))
        p.l(cx + 3 - o, cy + 2, cx + 3 - o * 1.3, f, (170, 110, 110))
    ell(p, cx, cy, 6 + lunge, 3.2, RAT[1]); ell(p, cx - 0.5, cy - 0.8, 5 + lunge, 2.2, RAT[2])
    hx, hy = cx + 6 + lunge * 2, cy - 1 - up * 2
    p.poly([(hx - 2, hy - 2.5), (hx + 5, hy), (hx - 2, hy + 2.5)], RAT[2])
    p.l(hx - 2, hy - 2.5, hx + 4, hy - 0.5, RAT[3])
    ell(p, hx - 1.5, hy - 3, 1.5, 1.5, (210, 140, 140))
    p.p(hx + 5, hy, (60, 30, 30))
    if mouth:
        p.l(hx + 1, hy + 1.5, hx + 4, hy + 1 + mouth, (40, 10, 10)); p.p(hx + 4, hy + 1, WHITE)
    if eyes:
        p.p(hx + 1, hy - 1, (230, 40, 40))
    else:
        p.p(hx + 1, hy - 1, RAT[0])
    return outline_same(cut_below(p.im, f))


def rat_dead(k):
    p = Pic(64, 64)
    f = FEET
    cx, cy = 30, f - 2
    ell(p, cx, cy, 6, 2.6, RAT[1]); ell(p, cx, cy + 0.5, 5, 1.6, (170, 140, 130))
    p.poly([(cx + 5, cy - 2), (cx + 11, cy), (cx + 5, cy + 2)], RAT[2]); p.l(cx + 7, cy - 1, cx + 9, cy - 1, RAT[0])
    for x in (-3, 3):
        p.l(cx + x, cy - 2, cx + x + 1, cy - 4 - (k == 0), (170, 110, 110))
    p.lines([(cx - 6, cy), (cx - 12, cy + 1), (cx - 17, cy)], (190, 130, 130))
    return outline_same(cut_below(p.im, f))


@builder('rat')
def make_rat():
    R = rat_raw
    save_enemy('rat', 'idle', [R(up=(0, 0.5, 1, 0.3)[i], tail=(0, 1, 0, -1)[i]) for i in range(4)])
    save_enemy('rat', 'movement', [R(step=i / 3, bob=(0, -1, 0, 0, -1, 0)[i], tail=math.sin(i), dx=-1 + (i % 2)) for i in range(6)])
    save_enemy('rat', 'attack', [R(up=1, mouth=1), R(lunge=-0.5, mouth=2, dx=-1), R(lunge=1.0, mouth=2, dx=2), R(lunge=1.2, mouth=0, dx=3),
                                 R(lunge=0.5, mouth=1, dx=1), R()])
    save_enemy('rat', 'take_damage', [flash(R(dx=-3, up=1, mouth=2, eyes=0), WHITE), R(dx=-2, mouth=1), R(dx=-1)])
    save_enemy('rat', 'death', [flash(R(dx=-2, up=1, mouth=2, eyes=0), WHITE), R(dx=-3, up=1.5, mouth=2, eyes=0, bob=-3, tail=2),
                                R(dx=-3, up=0.5, eyes=0, bob=-1, tail=1), rat_dead(0), rat_dead(1), rat_dead(1)])


# ================================================================== HOMUNCULUS (drawn, 64x64: a small stitched flesh homunculus)
def homunculus_raw(step=0.0, bob=0, dx=0, lean=0.0, mouth=0, eyes=1, claw=0.0, crouch=0, split=0.0):
    """Side view facing right: a small fleshy homunculus 30 px tall - a big bald head with a stitched seam and one
    brass-ringed glass eye, a stub of a body, thin limbs, a cloth wrap round the hips; claw 0..1 reaches the arms out;
    split pulls the two halves apart along the seam (its death: it divides)."""
    p = Pic(64, 64)
    f = FEET
    cx = 31 + dx
    top = 28 + bob + crouch
    hy = top + 7
    sh = top + 14
    hip = sh + 7
    L = lean
    for sd in (-1, 1):
        kx = cx + sd * step * 4
        fx = cx + sd * step * 6
        limb(p, [(cx + sd, hip), (kx + 2, hip + (f - hip) / 2 - crouch * 0.3), (fx, f - 1)], 2, FLESH[1] if sd < 0 else FLESH[2])
        p.r(fx - 1, f - 1, fx + 2, f, FLESH[1])
    p.poly([(cx - 4 + L, sh), (cx + 4 + L, sh), (cx + 4, hip), (cx - 4, hip)], FLESH[2])
    p.r(cx - 4, hip - 2, cx + 4, hip + 1, (150, 140, 110)); p.l(cx - 4, hip - 2, cx + 4, hip - 2, (190, 180, 150))
    p.lines([(cx + L * 0.5, sh + 1), (cx + L * 0.5, hip - 3)], FLESH[0])                    # a stitch down the chest
    for y in range(int(sh) + 2, int(hip) - 2, 2):
        p.l(cx - 1 + L * 0.5, y, cx + 1 + L * 0.5, y, (60, 30, 30))
    hx = cx + 1 + L * 1.4
    ell(p, hx, hy, 8, 7.5, FLESH[1]); ell(p, hx - 0.8, hy - 0.8, 7, 6.5, FLESH[2])
    ell(p, hx - 3, hy - 3, 3, 2.5, FLESH[3])
    p.lines([(hx - 7, hy - 1), (hx - 3, hy - 6), (hx + 2, hy - 7)], FLESH[0])           # the scalp seam with stitches
    for t in (0.2, 0.5, 0.8):
        x_, y_ = hx - 7 + t * 9, hy - 1 - t * 6
        p.l(x_ - 1, y_ - 1, x_ + 1, y_ + 1, (60, 30, 30))
    p.poly([(hx + 6, hy), (hx + 10, hy + 2), (hx + 6, hy + 3)], FLESH[2])               # nose
    if eyes:
        ell(p, hx + 3, hy - 1, 2.8, 2.8, BR3); ell(p, hx + 3, hy - 1, 2, 2, (190, 230, 240)); p.p(hx + 3.5, hy - 1, (20, 20, 30)); p.p(hx + 2.4, hy - 2, WHITE)
    else:
        p.l(hx + 1, hy - 1, hx + 5, hy - 1, FLESH[0])
    jaw = 1 + mouth * 1.4
    p.e(hx + 1, hy + 3, hx + 7, hy + 3 + jaw, (60, 14, 20))
    if mouth:
        p.ps([(hx + 2, hy + 3), (hx + 4, hy + 3), (hx + 6, hy + 3)], (240, 236, 210))
    ell(p, hx - 6, hy + 1, 1.5, 2, FLESH[1])                                         # ear
    for far in (True, False):
        s_ = (cx + (-1 if far else 2) + L, sh + 1)
        e_ = (s_[0] + 3 + claw * 3, s_[1] + 4 - claw * 2)
        h_ = (s_[0] + 5 + claw * 8, s_[1] + 7 - claw * 5)
        limb(p, [s_, e_, h_], 2, FLESH[1] if far else FLESH[2])
        for j in range(3):
            p.l(h_[0], h_[1], h_[0] + 2, h_[1] - 1 + j, (230, 220, 200))
    im = outline_same(cut_below(p.im, f))
    if split:
        a = np.array(im)
        left, right = a.copy(), a.copy()
        cut = int(cx + 1 + L * 1.4)
        left[:, cut:] = 0
        right[:, :cut] = 0
        L_ = Image.fromarray(left).rotate(split * 25, resample=Image.NEAREST, center=(cut - 4, f))
        R_ = Image.fromarray(right).rotate(-split * 25, resample=Image.NEAREST, center=(cut + 4, f))
        out = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        out.alpha_composite(shift(L_, -int(split * 6), 0))
        out.alpha_composite(shift(R_, int(split * 6), 0))
        im = P5.ground(out, f) if split >= 1.5 else out
    return im


def homunculus_halves(k):
    """The homunculus split in two: two small pink lumps of flesh in a little red pool, twitching (k 0..2)."""
    p = Pic(64, 64)
    f = FEET
    pool(p, 32, f, 26, 3, (RED[0], RED[1], RED[2]), 3)
    for j, x in enumerate((22, 42)):
        ell(p, x, f - 3 - (k == 0) * (j == 0), 5, 3.5, FLESH[1]); ell(p, x - 1, f - 4, 3.5, 2, FLESH[2])
        p.l(x - 3, f - 5, x + 2, f - 6, FLESH[0])
    p.e(43, f - 7, 46, f - 4, BR3); p.p(44.5, f - 5.5, (190, 230, 240))
    return outline_same(cut_below(p.im, f))


@builder('homunculus')
def make_homunculus():
    H = homunculus_raw
    save_enemy('homunculus', 'idle', [H(bob=(0, 1, 1, 0)[i], mouth=(0, 0, 1, 0)[i], claw=(0, 0.1, 0.2, 0.1)[i]) for i in range(4)])
    save_enemy('homunculus', 'movement', [H(step=math.sin(i / 6 * math.tau) * 1.2, bob=(0, -2, -1, 0, -2, -1)[i], lean=2, claw=0.2) for i in range(6)])
    save_enemy('homunculus', 'attack', [H(crouch=3, lean=-1, mouth=1, claw=0.2), H(crouch=4, lean=-2, mouth=2, claw=0.4),
                                        H(bob=-6, lean=3, mouth=2, claw=1.0, dx=3), H(bob=-4, lean=3, mouth=2, claw=1.2, dx=5),
                                        H(lean=2, mouth=1, claw=0.6, dx=3), H(lean=1, claw=0.2, dx=1)])
    save_enemy('homunculus', 'take_damage', [flash(H(dx=-3, lean=-3, mouth=2, eyes=0), WHITE), H(dx=-2, lean=-2, mouth=1), H(dx=-1)])
    save_enemy('homunculus', 'death', [flash(H(dx=-2, mouth=2, eyes=0, lean=-2), WHITE), H(mouth=2, eyes=0, split=0.4),
                                       H(mouth=2, eyes=0, split=1.0), homunculus_halves(0), homunculus_halves(1), homunculus_halves(2)])


# ================================================================== OOZE (drawn, 64x64: a green acid slime)
def ooze_raw(w=1.0, h=1.0, dx=0, lean=0.0, eyes=1, mouth=0, seed=0, melt=0.0, reach=0.0):
    """Side view facing right: a dome of bright acid slime with a skull and bubbles suspended inside, two pale eyes,
    drips; w / h squash and stretch it, lean pushes the top forward, reach stretches a pseudopod to the right."""
    p = Pic(64, 64)
    f = FEET
    cx = 30 + dx
    rw, rh = 15 * w, 20 * h * (1 - melt)
    pts = []
    for i in range(25):
        a = math.pi + i / 24 * math.pi
        x = cx + math.cos(a) * rw + lean * (math.sin(a) ** 2) * (-math.sin(a)) * 4
        y = f - (-math.sin(a)) * rh + math.sin(i * 1.7 + seed) * 0.8
        pts.append((x, y))
    pts = [(cx - rw - 2, f)] + pts + [(cx + rw + 2, f)]
    p.poly(pts, AC[1])
    inner = [(cx + (x - cx) * 0.8 - 1, f - (f - y) * 0.85) for x, y in pts]
    p.poly(inner, AC[2])
    p.poly([(cx + (x - cx) * 0.5 - 4, f - (f - y) * 0.8) for x, y in pts[4:12]] + [(cx - 4, f - rh * 0.4)], AC[3])
    if reach:
        rx = cx + rw + reach * 10
        p.poly([(cx + rw - 4, f - rh * 0.5), (rx, f - rh * 0.35 - 2), (rx + 2, f - rh * 0.25), (cx + rw - 2, f - 2)], AC[1])
        ell(p, rx, f - rh * 0.3, 3.5, 3.5, AC[2])
    if melt < 0.7:                                                            # the skull inside
        sx, sy = cx - 3, f - rh * 0.45
        ell(p, sx, sy, 4, 3.5, (150, 190, 110)); p.r(sx - 2, sy + 2, sx + 2, sy + 4, (150, 190, 110))
        p.p(sx - 1.5, sy, AC[0]); p.p(sx + 1.5, sy, AC[0])
    r2 = random.Random(seed)
    for _ in range(5):
        bx, by = cx + r2.uniform(-rw * 0.6, rw * 0.6), f - r2.uniform(2, max(3, rh * 0.8))
        p.arc(bx - 1.5, by - 1.5, bx + 1.5, by + 1.5, 0, 360, AC[4])
    if eyes and melt < 0.5:
        ex, ey = cx + rw * 0.45 + lean * 2, f - rh * 0.72
        for j in (0, 4):
            ell(p, ex + j, ey, 1.6, 2.2, (240, 255, 220)); p.p(ex + j + 0.5, ey, (10, 30, 0))
        if mouth:
            p.e(ex - 1, ey + 3, ex + 6, ey + 3 + mouth * 1.5, AC[0])
    im = outline_same(cut_below(p.im, f), AC[0])
    q = Pic(64, 64)
    drips(q, 4, 500 + seed, (cx - rw, f - rh * 0.6, cx + rw, f - 2), (AC[0], AC[3]))
    return on(im, q.im)


def ooze_puddle(k):
    p = Pic(64, 64)
    pool(p, 30, FEET, 34 + k * 4, 4 - k * 0.5, (AC[0], AC[1], AC[3]), 11)
    ell(p, 27, FEET - 2, 3.5, 2, (150, 190, 110)); p.p(26, FEET - 2, AC[0]); p.p(28, FEET - 2, AC[0])
    for j in range(3 - k):
        p.arc(18 + j * 9 - 1.5, FEET - 3 - 1.5, 18 + j * 9 + 1.5, FEET - 3 + 1.5, 0, 360, AC[4])
    return outline_same(cut_below(p.im, FEET), AC[0])


@builder('ooze')
def make_ooze():
    O = ooze_raw
    save_enemy('ooze', 'idle', [O(w=(1.0, 1.04, 1.06, 1.03)[i], h=(1.0, 0.97, 0.95, 0.98)[i], seed=i) for i in range(4)])
    save_enemy('ooze', 'movement', [O(w=(1.0, 1.1, 1.15, 1.05, 0.95, 0.92)[i], h=(1.0, 0.9, 0.86, 0.95, 1.06, 1.08)[i], lean=(0, 0.5, 1, 1.5, 1, 0.5)[i],
                                      dx=(0, 1, 2, 2, 1, 0)[i], seed=10 + i) for i in range(6)])
    save_enemy('ooze', 'attack', [O(w=0.9, h=1.12, lean=-1, mouth=1, seed=20), O(w=0.85, h=1.2, lean=-1.5, mouth=2, seed=21),
                                  O(w=1.0, h=1.0, lean=2, mouth=2, reach=0.6, seed=22), O(w=1.1, h=0.9, lean=2.5, mouth=2, reach=1.0, seed=23),
                                  O(w=1.08, h=0.94, lean=1.5, mouth=1, reach=0.4, seed=24), O(seed=25)])
    save_enemy('ooze', 'take_damage', [flash(O(w=1.15, h=0.85, dx=-3, mouth=2, eyes=0, seed=30), WHITE), O(w=1.1, h=0.9, dx=-2, mouth=1, seed=31), O(dx=-1, seed=32)])
    save_enemy('ooze', 'death', [flash(O(w=1.2, h=0.85, mouth=2, eyes=0, seed=40), WHITE), O(w=1.4, h=0.8, eyes=0, melt=0.35, seed=41),
                                 O(w=1.7, h=0.8, eyes=0, melt=0.7, seed=42), ooze_puddle(0), ooze_puddle(1), ooze_puddle(2)])


# ================================================================== APPRENTICE (drawn, 64x64: a young alchemist who throws flasks)
def flask(p, x, y, col, s=1.0, tilt=0.0):
    """A small round potion flask centred on its belly (x, y) with a neck and cork."""
    ell(p, x, y, 3 * s, 3 * s, GLASS[0]); ell(p, x, y + 0.4, 2.3 * s, 2.3 * s, col[1]); p.p(x - 1, y - 1, col[2]); p.p(x - 1.2 * s, y - 1.5 * s, WHITE)
    nx, ny = x + math.sin(tilt) * 3.5 * s, y - math.cos(tilt) * 3.5 * s
    p.l(x, y - 2 * s, nx, ny, GLASS[1], 2)
    p.p(nx + math.sin(tilt), ny - math.cos(tilt), WD3)


def apprentice_raw(step=0.0, bob=0, dx=0, lean=0.0, arm=0.0, held=True, col=POT['red'], mouth=0, eyes=1, hood=1, gog=0):
    """Side view facing right: a thin young apprentice in a long hooded purple robe, a leather apron, brass goggles
    pushed up on the brow (gog 1 = over the eyes), satchel of flasks at the hip; the front arm throws: arm 0 = flask held
    at the chest .. 1 = drawn back over the shoulder .. 2 = flung forward (flask gone)."""
    p = Pic(64, 64)
    f = FEET
    cx = 29 + dx
    top = 10 + bob
    sh = top + 13
    hip = sh + 15
    L = lean
    for sd in (-1, 1):                                                        # robe hem and feet
        fx = cx + sd * step * 5
        p.r(fx - 2, f - 2, fx + 3, f, LEA[0])
    p.poly([(cx - 6 + L, sh), (cx + 5 + L, sh), (cx + 9 + step * 2, f - 2), (cx - 9 - step * 2, f - 2)], ROBE[2])
    p.poly([(cx - 6 + L, sh), (cx - 2 + L, sh), (cx - 5 - step * 2, f - 2), (cx - 9 - step * 2, f - 2)], ROBE[1])
    for x in (-3, 2):
        p.l(cx + x + L * 0.6, sh + 6, cx + x * 2, f - 3, ROBE[1])
    p.poly([(cx + 1 + L, sh + 3), (cx + 6 + L, sh + 3), (cx + 8, hip + 8), (cx + 2, hip + 8)], LEA[2])   # apron
    p.l(cx + 2 + L, sh + 3, cx + 6 + L, sh + 3, LEA[3])
    p.l(cx - 6 + L * 0.5, hip - 2, cx + 7, hip - 2, LEA[0], 2)               # belt
    p.r(cx - 9, hip - 2, cx - 4, hip + 4, LEA[1]); p.l(cx - 9, hip - 2, cx - 4, hip - 2, LEA[3])   # satchel
    for j, c in enumerate((POT['green'], POT['blue'])):
        p.r(cx - 8 + j * 3, hip - 5, cx - 7 + j * 3, hip - 2, c[1])
    # back arm
    limb(p, [(cx - 3 + L, sh + 2), (cx - 4 + L, sh + 9), (cx - 1 + L, sh + 13)], 3, ROBE[1])
    hx, hy = cx + 3 + L * 1.3, top + 6                                        # head in the hood
    if hood:
        ell(p, hx - 1, hy - 0.5, 7, 7.5, ROBE[1]); p.poly([(hx - 7, hy), (hx - 10, hy + 6), (hx - 4, hy + 8)], ROBE[1])
    ell(p, hx + 1, hy + 0.5, 4.5, 5, SKN[1]); ell(p, hx + 1.5, hy, 3.8, 4.2, SKN[2])
    p.poly([(hx + 4, hy), (hx + 7, hy + 2), (hx + 4, hy + 3)], SKN[2])
    if eyes:
        p.p(hx + 3, hy - 0.5, (30, 20, 20))
    jaw = mouth
    p.l(hx + 3, hy + 3.5, hx + 5, hy + 3.5 + jaw, (100, 40, 40))
    gy = hy - 1 if gog else hy - 5                                            # goggles
    p.l(hx - 4, gy, hx + 5, gy, LEA[0], 2)
    ell(p, hx + 3.5, gy, 2.2, 2.2, BR2); ell(p, hx + 3.5, gy, 1.3, 1.3, (120, 200, 210)); p.p(hx + 3, gy - 0.6, WHITE)
    if hood:
        p.arc(hx - 7, hy - 7.5, hx + 6, hy + 6, 190, 300, ROBE[3])
    # throwing arm
    s_ = (cx + 2 + L, sh + 2)
    if arm <= 1:
        a = -0.4 - arm * 2.2                                                  # from the chest round to over the shoulder
        h_ = (s_[0] + math.cos(a + 1.4) * 7 + 3 * (1 - arm), s_[1] + math.sin(a + 1.4) * 7 - 3 * arm)
        if arm > 0.5:
            h_ = (s_[0] - 5 * arm, s_[1] - 9 * arm)
    else:
        k = arm - 1
        h_ = (s_[0] + 9 + k * 2, s_[1] - 2 + k * 3)
    e_ = ((s_[0] + h_[0]) / 2 + 1, (s_[1] + h_[1]) / 2 + 2)
    limb(p, [s_, e_, h_], 3, ROBE[2], ROBE[3])
    ell(p, h_[0], h_[1], 1.8, 1.8, SKN[2])
    if held:
        flask(p, h_[0] + 1, h_[1] - 3, col, 1.0, 0.3 if arm < 1 else -0.6)
    return outline_same(cut_below(p.im, f))


def flask_fly(im, x, y, col, k):
    q = Pic(64, 64)
    flask(q, x, y, col, 1.0, k * 1.6)
    for j in range(3):
        q.p(x - 4 - j * 3, y + 1 + j * 0.5, col[2])
    return on(im, outline_same(q.im))


def apprentice_lying(k):
    p = Pic(64, 64)
    f = FEET
    p.poly([(14, f), (16, f - 7), (44, f - 6), (50, f)], ROBE[2]); p.l(16, f - 7, 44, f - 6, ROBE[3])
    p.poly([(26, f - 6), (40, f - 6), (40, f - 2), (26, f - 2)], LEA[2])
    ell(p, 10, f - 4, 5, 4.5, ROBE[1]); ell(p, 9, f - 4, 3, 3, SKN[1])
    p.r(50, f - 2, 54, f, LEA[0])
    pool(p, 54, f, 8 + k * 2, 2.5, (POT['green'][0], POT['green'][1], POT['green'][2]), 4)
    p.ps([(52, f - 3), (56, f - 2), (50, f - 1)], GLASS[2])
    return outline_same(cut_below(p.im, f))


@builder('apprentice')
def make_apprentice():
    A_ = apprentice_raw
    c = POT['green']
    save_enemy('apprentice', 'idle', [A_(bob=(0, 0, 1, 1)[i], arm=(0, 0.05, 0.1, 0.05)[i], col=c) for i in range(4)])
    save_enemy('apprentice', 'movement', [A_(step=math.sin(i / 6 * math.tau), bob=(0, -1, 0, 0, -1, 0)[i], lean=1, col=c) for i in range(6)])
    at = [A_(arm=0.5, lean=-1, col=c, gog=1), A_(arm=1.0, lean=-2, col=c, gog=1, mouth=1), A_(arm=1.6, lean=2, held=False, col=c, gog=1, mouth=2),
          A_(arm=2.0, lean=3, held=False, col=c, gog=1, mouth=1), A_(arm=1.8, lean=2, held=False, col=c, gog=1), A_(arm=0.2, lean=0, col=c, gog=1)]
    at[2] = flask_fly(at[2], 50, 18, c, 0.5)
    at[3] = flask_fly(at[3], 55, 22, c, 1.0)
    save_enemy('apprentice', 'attack', at)
    save_enemy('apprentice', 'take_damage', [flash(A_(dx=-3, lean=-3, mouth=2, eyes=0, col=c), WHITE), A_(dx=-2, lean=-2, mouth=1, col=c), A_(dx=-1, col=c)])
    d = [A_(dx=-2, lean=-3, mouth=2, eyes=0, held=False, arm=2.0, col=c), A_(dx=-3, lean=-4, mouth=2, eyes=0, held=False, arm=1.5, bob=4, hood=1, col=c),
         topple(A_(dx=12, lean=-2, eyes=0, held=False, arm=1.5, bob=3, col=c), 50, (40, FEET)), apprentice_lying(0), apprentice_lying(1), apprentice_lying(2)]
    save_enemy('apprentice', 'death', d)


# ================================================================== QUICKSILVER GOLEM (drawn, 64x64: a heavy golem of liquid metal)
def merc_blob(p, x, y, rx, ry, k=0):
    """One shining lump of quicksilver: dark rim, body, a pink and a blue sheen, a white glint."""
    ell(p, x, y, rx, ry, MERC[1])
    ell(p, x - 0.5, y - 0.5, rx - 0.8, ry - 0.8, MERC[2])
    ell(p, x - rx * 0.3, y - ry * 0.35, rx * 0.5, ry * 0.4, MERC[3])
    p.l(x + rx * 0.2, y + ry * 0.5, x + rx * 0.6, y + ry * 0.3, MERC_T[k % 2])
    p.p(x - rx * 0.45, y - ry * 0.5, MERC[4])


def mgolem_raw(step=0.0, bob=0, dx=0, lean=0.0, arm=0.0, eyes=1, melt=0.0, drip=0, mouth=0):
    """Side view facing right: a big hunched golem of quicksilver - a smooth shining head with two dark eye pits, huge
    rounded shoulders and fists, stubby legs; arm 0 = fists low .. 1 raised overhead .. 2 smashed down in front;
    melt slumps it into a puddle."""
    p = Pic(64, 64)
    f = FEET
    cx = 30 + dx
    sq = 1 - melt
    top = f - 46 * sq + bob
    sh = top + 12 * sq
    hip = f - 16 * sq
    L = lean
    if melt > 0:
        pool(p, cx, f, 30 + melt * 20, 3 + melt * 2, (MERC[1], MERC[2], MERC[4]), 9)
    for sd in (-1, 1):                                                        # legs
        fx = cx + sd * (4 + step * 4)
        merc_blob(p, fx, hip + (f - hip) * 0.5, 4.5, (f - hip) * 0.55 + 0.5, sd > 0)
        ell(p, fx + 1, f - 1.5, 5, 2, MERC[1])
    # far arm
    def arm_(far):
        s_ = (cx + (-6 if far else 7) + L, sh + 3)
        if arm <= 1:
            h_ = (s_[0] + 4 - arm * 6, s_[1] + 16 * sq - arm * 30)
        else:
            k = arm - 1
            h_ = (s_[0] + 4 + k * 12, s_[1] - 14 + k * 26)
        e_ = ((s_[0] + h_[0]) / 2 + (2 if far else 3), (s_[1] + h_[1]) / 2)
        for t in (0.0, 0.5, 1.0):
            pt = (s_[0] + (e_[0] - s_[0]) * t * 2, s_[1] + (e_[1] - s_[1]) * t * 2) if t <= 0.5 else (e_[0] + (h_[0] - e_[0]) * (t - 0.5) * 2, e_[1] + (h_[1] - e_[1]) * (t - 0.5) * 2)
            merc_blob(p, pt[0], pt[1], 3.5 * sq + 0.8, 3.5 * sq + 0.8, int(far))
        merc_blob(p, h_[0], h_[1], 5 * sq + 1, 5 * sq + 1, int(far) + 1)
    if sq > 0.3:
        arm_(True)
    # torso: a heavy rounded mass
    merc_blob(p, cx + L * 0.6, (sh + hip) / 2, 12 * (0.6 + 0.4 * sq), (hip - sh) / 2 + 3, 0)
    merc_blob(p, cx - 2 + L, sh + 2, 10 * (0.6 + 0.4 * sq), 6 * sq + 1, 1)
    hx, hy = cx + 6 + L * 1.4, top + 6 * sq
    if sq > 0.3:
        merc_blob(p, hx, hy, 6.5, 6 * sq + 0.5, 0)
        if eyes:
            ell(p, hx + 2, hy - 1, 1.4, 1.8, (20, 22, 30)); ell(p, hx + 5, hy - 1, 1.2, 1.6, (20, 22, 30))
            p.p(hx + 2, hy - 1, (180, 220, 255)); p.p(hx + 5, hy - 1, (180, 220, 255))
        if mouth:
            p.l(hx + 1, hy + 3, hx + 5, hy + 3 + mouth, (30, 32, 40))
        arm_(False)
    im = outline_same(cut_below(p.im, f), (24, 26, 34))
    if drip:
        q = Pic(64, 64)
        drips(q, 5, 600 + drip, (cx - 12, sh + 4, cx + 16, f - 2), (MERC[1], MERC[3]))
        im = on(im, q.im)
    return im


@builder('mercurygolem')
def make_mercurygolem():
    M = mgolem_raw
    save_enemy('mercurygolem', 'idle', [M(bob=(0, 1, 1, 0)[i], arm=(0, 0.03, 0.06, 0.03)[i], drip=i % 2) for i in range(4)])
    save_enemy('mercurygolem', 'movement', [M(step=math.sin(i / 6 * math.tau), bob=(0, 1, 2, 0, 1, 2)[i], lean=1.5, drip=(i % 3 == 0) * (10 + i)) for i in range(6)])
    save_enemy('mercurygolem', 'attack', [M(arm=0.5, lean=-1, mouth=1), M(arm=1.0, lean=-2, mouth=2), M(arm=1.4, lean=1, mouth=2, dx=1),
                                          M(arm=2.0, lean=3, mouth=2, dx=-2, drip=20), M(arm=1.7, lean=2, mouth=1, dx=-2, drip=21), M(arm=0.3, lean=0)])
    save_enemy('mercurygolem', 'take_damage', [flash(M(dx=-3, lean=-3, mouth=2, eyes=0), WHITE), M(dx=-2, lean=-2, mouth=1, drip=30), M(dx=-1)])
    save_enemy('mercurygolem', 'death', [flash(M(dx=-2, lean=-3, mouth=2, eyes=0), WHITE), M(dx=-1, eyes=0, melt=0.25, drip=40, mouth=2),
                                         M(eyes=0, melt=0.5, drip=41), M(eyes=0, melt=0.75), M(eyes=0, melt=0.9), M(eyes=0, melt=0.97)])


# ================================================================== VIAL WISP (drawn, 64x64: a floating flask with a face, drawn low)
VW = ((40, 10, 60), (120, 40, 170), (200, 100, 240), (250, 200, 255))         # the glowing violet potion
VW_HOT = ((90, 10, 10), (200, 40, 30), (255, 130, 80), (255, 230, 180))


def vialwisp_raw(bob=0, dx=0, tilt=0.0, sw=1.0, pal=VW, mouth=0, eyes=1, ph=0.0, crack=0):
    """A round-bellied flask floating on its own, tipped forward: a cork, a long neck, the glowing potion inside with a
    face in it (two eyes, a grin), a wisp of vapour trailing beneath; sw swells the belly, crack draws cracks."""
    p = Pic(64, 64)
    cx, cy = 30 + dx, 40 + bob
    ca, sa = math.cos(tilt), math.sin(tilt)
    R = lambda u, v: (cx + u * ca - v * sa, cy + u * sa + v * ca)
    for i in range(8):                                                        # vapour trail
        t = i / 7
        x, y = R(-3 - t * 10 + math.sin(ph + t * 4) * 2, 9 + t * 6)
        ell(p, x, y, 2.5 * (1 - t) + 0.8, 1.6 * (1 - t) + 0.6, pal[1] if i % 2 else pal[2])
    r = 9 * sw
    ell(p, *R(0, 0), r, r, GLASS[0])
    ell(p, *R(0, 1), r - 1.2, r - 1.6, pal[1])
    p.poly([R(-r + 1.5, -1), R(r - 1.5, -1), R(r - 2.5, -3), R(-r + 2.5, -3)], pal[2])   # the surface
    ell(p, *R(-2, 3), r * 0.5, r * 0.4, pal[2])
    p.poly([R(-2.5, -r + 1), R(2.5, -r + 1), R(2.5, -r - 7), R(-2.5, -r - 7)], GLASS[1])  # neck
    p.poly([R(-3, -r - 7), R(3, -r - 7), R(3, -r - 11), R(-3, -r - 11)], WD3)              # cork
    p.l(*R(-3, -r - 11), *R(3, -r - 11), WD4)
    ex, ey = R(3, 1)
    if eyes:
        for j in (-1.5, 3):
            ell(p, ex + j, ey - 1, 1.5, 2, pal[3]); p.p(ex + j + 0.4, ey - 1, (20, 0, 30))
    else:
        p.l(ex - 3, ey - 1, ex + 4, ey - 1, pal[0])
    p.arc(ex - 2, ey, ex + 5, ey + 4 + mouth, 10, 170, pal[0], 1 + (mouth > 1))
    p.p(*R(-r * 0.55, -r * 0.4), WHITE); p.p(*R(-r * 0.6, -r * 0.2), GLASS[3])
    if crack:
        for (a, b) in (((-2, -6), (2, -1)), ((5, -4), (2, 3)), ((-6, 2), (-1, 6)))[:crack]:
            p.l(*R(*a), *R(*b), WHITE)
    return outline_same(cut_below(p.im, FEET))


def glass_burst(k):
    """The flask bursts: shards flying out and a splash; k 0..3 from the burst to shards lying in a violet stain."""
    p = Pic(64, 64)
    f = FEET
    r2 = random.Random(700)
    if k <= 1:
        for j in range(12):
            a = j / 12 * math.tau + r2.uniform(-0.2, 0.2)
            d = 6 + k * 9 + r2.uniform(0, 5)
            x, y = 30 + math.cos(a) * d, 40 + math.sin(a) * d * 0.8 + k * 4
            p.poly([(x, y), (x + 2, y + 1), (x + 1, y + 3)], GLASS[2 + j % 2])
        for j in range(6):
            a = j / 6 * math.tau
            x, y = 30 + math.cos(a) * (4 + k * 6), 40 + math.sin(a) * (4 + k * 6)
            ell(p, x, y, 2.5 - k, 2.5 - k, VW[2])
        if k == 0:
            ell(p, 30, 40, 5, 5, VW[3])
    else:
        pool(p, 30, f, 26 + (k - 2) * 6, 3, (VW[0], VW[1], VW[2]), 8)
        for j in range(8):
            x = 16 + r2.uniform(0, 30)
            p.poly([(x, f), (x + 2, f - 2 - j % 2), (x + 3, f)], GLASS[2 + j % 2])
        p.r(40, f - 3, 44, f, WD3)
    return outline_same(cut_below(p.im, f))


@builder('vialwisp')
def make_vialwisp():
    V = vialwisp_raw
    save_enemy('vialwisp', 'idle', [V(bob=(0, -1, -2, -1)[i], ph=i * 1.57, tilt=0.1) for i in range(4)])
    save_enemy('vialwisp', 'movement', [V(bob=(0, -1, -2, -2, -1, 0)[i], ph=i * 1.05, tilt=0.35, dx=1) for i in range(6)])
    save_enemy('vialwisp', 'attack', [V(tilt=0.2, sw=1.08, mouth=1, ph=0), V(tilt=0.4, sw=1.16, mouth=2, ph=1, crack=1),
                                      V(tilt=0.6, sw=1.22, mouth=3, ph=2, pal=VW_HOT, crack=2, dx=3), V(tilt=0.7, sw=1.28, mouth=3, ph=3, pal=VW_HOT, crack=3, dx=6),
                                      V(tilt=0.5, sw=1.15, mouth=2, ph=4, pal=VW_HOT, crack=2, dx=4), V(tilt=0.3, sw=1.05, mouth=1, ph=5, dx=2)])
    save_enemy('vialwisp', 'take_damage', [flash(V(dx=-3, tilt=-0.3, mouth=2, eyes=0, crack=1), WHITE), V(dx=-2, tilt=-0.2, mouth=1), V(dx=-1)])
    save_enemy('vialwisp', 'death', [flash(V(sw=1.25, pal=VW_HOT, crack=3, mouth=3, eyes=0), WHITE), glass_burst(0), glass_burst(1),
                                     glass_burst(2), glass_burst(3), glass_burst(3)])


# ================================================================== CHIMERA (drawn, 64x64: lion, goat and snake in one beast)
def chimera_raw(step=0.0, bob=0, dx=0, lean=0.0, bite=0.0, goat=0.0, snake=0.0, fire=0, eyes=1, down=0.0):
    """Side view facing right: a heavy lion body with a dark mane, a goat's head with curled horns rising from the back,
    a snake for a tail rearing behind; bite 0..1 lunges the lion's jaws open, goat 0..1 throws the goat head forward
    (fire 1..3 = its flame), snake 0..1 rears the tail-snake; down folds the legs (death)."""
    p = Pic(64, 64)
    f = FEET
    cx = 27 + dx + bite * 3
    by = f - 20 + bob + down * 12
    L = lean
    # snake tail (behind)
    sx0, sy0 = cx - 14, by - 2
    ctrl = (cx - 26, by + 6 - snake * 8)
    tip = (cx - 22 + snake * 2, by - 14 - snake * 10)
    pts = bez((sx0, sy0), ctrl, tip, 14)
    tube(p, pts, [3.2 - i * 0.12 for i in range(14)], (SNK[0], SNK[1], SNK[2], SNK[3]))
    hx_, hy_ = tip
    ell(p, hx_ + 1, hy_ - 1, 3.5, 2.5, SNK[1]); p.p(hx_ + 2, hy_ - 2, (255, 220, 60))
    if snake > 0.5:
        p.l(hx_ + 4, hy_ - 1, hx_ + 7, hy_ - 2, (220, 40, 40)); p.l(hx_ + 4, hy_, hx_ + 6, hy_ + 1, (240, 236, 210))
    # far legs
    for x, ph in ((cx - 10, 0.0), (cx + 9, math.pi)):
        o = math.sin(step * math.pi + ph) * 3
        limb(p, [(x, by + 4), (x + o * 0.5, by + 12 - down * 6), (x + o, f - 1)], 4, LION[0])
    # body
    ell(p, cx, by, 15, 8, LION[1]); ell(p, cx - 1, by - 1.5, 13.5, 6, LION[2])
    p.l(cx - 12, by - 6, cx + 6, by - 7, LION[3])
    # near legs
    for x, ph in ((cx - 8, math.pi), (cx + 11, 0.0)):
        o = math.sin(step * math.pi + ph) * 3
        limb(p, [(x, by + 4), (x + o * 0.5, by + 12 - down * 6), (x + o, f - 1)], 4, LION[1], LION[2])
        p.r(x + o - 2, f - 1, x + o + 3, f, LION[0])
    # goat neck and head from the back
    gx, gy = cx - 2 + goat * 6, by - 13 - goat * 2
    p.lines([(cx - 3, by - 5), (gx - 1, gy + 3)], GOAT[1], 4)
    ell(p, gx, gy, 4, 3.5, GOAT[1]); ell(p, gx - 0.5, gy - 0.5, 3, 2.5, GOAT[2])
    p.poly([(gx + 2, gy - 1), (gx + 7, gy + 1), (gx + 6, gy + 3), (gx + 2, gy + 2)], GOAT[2])
    p.arc(gx - 6, gy - 7, gx + 1, gy, 200, 360, GOAT[3], 2)                  # curled horn
    p.l(gx + 3, gy + 3, gx + 5, gy + 6, GOAT[1])                              # beard
    p.p(gx + 1, gy - 1, (220, 180, 40)) if eyes else p.p(gx + 1, gy - 1, GOAT[0])
    # lion head with mane
    lx, ly = cx + 15 + L + bite * 3, by - 6 - bite * 1
    for j in range(9):
        a = j / 9 * math.tau
        ell(p, lx - 2 + math.cos(a) * 5, ly + math.sin(a) * 5.5, 3.5, 3.5, (110, 56, 20) if j % 2 else (80, 40, 14))
    ell(p, lx + 1, ly, 5, 5, LION[2]); ell(p, lx + 0.5, ly - 0.8, 4, 3.8, LION[3])
    jaw = bite * 5
    p.poly([(lx + 3, ly - 1), (lx + 9, ly + 0), (lx + 9, ly + 2), (lx + 3, ly + 3)], LION[2])   # muzzle
    p.p(lx + 9, ly, (40, 20, 20))
    p.poly([(lx + 2, ly + 3), (lx + 8, ly + 3 + jaw * 0.3), (lx + 7, ly + 5 + jaw), (lx + 2, ly + 5)], LION[1])   # jaw
    if bite > 0.2:
        p.poly([(lx + 3, ly + 3), (lx + 8, ly + 2.5), (lx + 7, ly + 3 + jaw)], (60, 10, 14))
        p.ps([(lx + 4, ly + 3), (lx + 6, ly + 3), (lx + 5, ly + 3 + jaw)], WHITE)
    if eyes:
        p.p(lx + 3, ly - 2, (250, 220, 80)); p.p(lx + 3, ly - 3, (20, 10, 10))
    else:
        p.l(lx + 2, ly - 2, lx + 4, ly - 2, LION[0])
    im = outline_same(cut_below(p.im, f))
    if fire:
        q = Pic(64, 64)
        fx, fy = gx + 7, gy + 1
        for j in range(fire + 1):
            puff(q, fx + 3 + j * 4, fy - j * 0.8, 1.8 + j * 0.8, (F0, F1, F2, F3))
        im = on(im, outline_same(q.im))
    return im


@builder('chimera')
def make_chimera():
    C = chimera_raw
    save_enemy('chimera', 'idle', [C(bob=(0, 0, 1, 1)[i], snake=(0.2, 0.3, 0.4, 0.3)[i], goat=(0, 0.1, 0.1, 0)[i]) for i in range(4)])
    save_enemy('chimera', 'movement', [C(step=i / 3, bob=(0, -1, 0, 0, -1, 0)[i], snake=0.3 + 0.1 * math.sin(i), lean=1) for i in range(6)])
    save_enemy('chimera', 'attack', [C(bite=0.0, snake=0.5, lean=-2, goat=0.2), C(bite=0.3, snake=0.8, lean=-2, goat=0.5, fire=1),
                                     C(bite=0.9, snake=1.0, lean=1, goat=0.8, fire=2, dx=2), C(bite=1.0, snake=1.0, lean=2, goat=0.9, fire=3, dx=1),
                                     C(bite=0.4, snake=0.7, lean=1, goat=0.5, fire=1, dx=2), C(bite=0.0, snake=0.4, goat=0.1)])
    save_enemy('chimera', 'take_damage', [flash(C(dx=0, lean=-3, bite=0.6, eyes=0, snake=0.8), WHITE), C(dx=1, lean=-2, bite=0.3, snake=0.6), C(dx=2, snake=0.4)])
    d = [flash(C(dx=-2, bite=0.8, eyes=0, snake=1.0), WHITE), C(dx=-2, bite=0.6, eyes=0, snake=0.6, down=0.3),
         C(dx=1, bite=0.3, eyes=0, snake=0.2, down=0.6), C(dx=1, eyes=0, snake=0.0, down=0.85), C(dx=1, eyes=0, snake=-0.3, down=0.95),
         C(dx=1, eyes=0, snake=-0.4, down=1.0)]
    save_enemy('chimera', 'death', d)


# ================================================================== THE GHOST CAPTAIN (drawn, 116x116)
GAU = ((60, 70, 40), (130, 150, 80), (200, 214, 120), (240, 250, 190))        # tarnished gold trim under the ghost light


def tricorn(p, x, y, tilt=0.0, s=1.0):
    """A captain's tricorn hat centred on the crown (x, y): black-teal felt, gold-trimmed brim, a white feather."""
    ca, sa = math.cos(tilt), math.sin(tilt)
    R = lambda u, v: (x + (u * ca - v * sa) * s, y + (u * sa + v * ca) * s)
    p.poly([R(-16, 2), R(-12, -6), R(-4, -3), R(4, -3), R(13, -7), R(17, 1), R(10, 5), R(-10, 5)], GH[0])
    p.poly([R(-9, 0), R(-7, -10), R(0, -13), R(7, -10), R(9, 0)], GH[1])
    p.poly([R(-6, -2), R(-5, -9), R(0, -11), R(4, -8)], GH[2])
    p.lines([R(-16, 2), R(-10, 5), R(10, 5), R(17, 1)], GAU[2], 2)
    p.lines([R(-16, 2), R(-12, -6), R(-4, -3)], GAU[1])
    p.lines([R(4, -3), R(13, -7), R(17, 1)], GAU[1])
    for j in range(5):                                                       # the feather plume
        a = R(-6 + j * 1.5, -9 - j * 0.6)
        b = R(-16 + j * 1.2, -15 + j * 0.8)
        p.l(*a, *b, GH[4] if j % 2 else (230, 250, 246), 2)
    ell(p, *R(0, -1), 3, 2.5, GAU[2]); p.p(*R(0, -1), WHITE)                  # skull cockade
    p.p(*R(-1, -1), GH[0]); p.p(*R(1, -1), GH[0])


def sabre(p, x, y, ang, ln=40, glint=False):
    """A cavalry sabre with its grip at (x, y) along ang: a gold knuckle-bow guard, a long slightly curved blade."""
    u, v = (math.cos(ang), math.sin(ang)), (-math.sin(ang), math.cos(ang))
    P_ = lambda a, b: (x + u[0] * a + v[0] * b, y + u[1] * a + v[1] * b)
    p.l(*P_(-7, 0), *P_(0, 0), GH[1], 3)
    p.arc(x - 5, y - 5, x + 5, y + 5, 0, 360, GAU[2], 2)
    blade = [P_(2, -2), P_(ln * 0.5, -2.8), P_(ln * 0.85, -2), P_(ln, 1.2), P_(ln * 0.85, 1.2), P_(ln * 0.5, 0.8), P_(2, 1.2)]
    p.poly(blade, GH[3])
    p.lines([P_(2, -2), P_(ln * 0.5, -2.8), P_(ln * 0.85, -2), P_(ln, 1.2)], GH[4], 1)
    p.l(*P_(4, -0.5), *P_(ln * 0.8, -0.5), GH[2])
    if glint:
        spark(p, *P_(ln * 0.75, -2), WHITE, 3)


def flintlock(p, x, y, ang, cocked=True):
    """A long flintlock pistol held at the grip (x, y), barrel along ang."""
    u, v = (math.cos(ang), math.sin(ang)), (-math.sin(ang), math.cos(ang))
    P_ = lambda a, b: (x + u[0] * a + v[0] * b, y + u[1] * a + v[1] * b)
    p.poly([P_(-3, 4), P_(-1, -2), P_(5, -2), P_(4, 3)], GH[1])                       # grip
    p.poly([P_(3, -3), P_(20, -2.5), P_(20, 0.5), P_(3, 1)], GH[2])                    # barrel and stock
    p.l(*P_(3, -3), *P_(20, -2.5), GH[3])
    p.l(*P_(6, -3), *P_(6, 1), GAU[2]); p.l(*P_(18, -3), *P_(18, 1), GAU[2])
    p.l(*P_(4, -3), *P_(1, -6 if cocked else -4), GAU[1], 2)                           # the cock
    ell(p, *P_(-3, 4), 1.5, 1.5, GAU[2])


def captain_frame(t=0.0, bob=0, dx=0, lean=0.0, sab=(0.4, 0), pis=(0.5, 0), eyes=1, mouth=0, hat=1, slash=None,
                  glint=False, fade=0.14, seed=0, muzzle=0, aura=0, sink=0, wisp=1.0):
    """Side view facing right: the ghost captain - a tricorn, a gaunt bearded face with burning eyes, a long open frock
    coat with gold-trimmed cuffs and skirts over a waistcoat and sash, a sabre in the front hand (sab = blade angle,
    reach) and a flintlock in the back hand (pis = barrel angle, reach); below the skirts his legs fade into a wisp."""
    p = Pic(BS, BS)
    cx = 48 + dx
    top = 17 + bob + sink
    sh = top + 26
    hip = sh + 30
    L = lean
    f = BS_FEET
    if wisp:                                                                  # the wisp below the skirts
        n = 12
        for i in range(n + 1):
            k = i / n
            x = cx - 4 + math.sin(k * 3 + t * math.tau) * 5 * k - k * k * 14
            y = hip + 16 + (f - 2 - hip - 16) * k
            r = 13 * (1 - k * 0.8) * wisp
            ell(p, x, y, r, r * 0.6, GH[1])
            ell(p, x - r * 0.3, y - r * 0.2, r * 0.55, r * 0.35, GH[2])
    # back arm with the flintlock
    pa, pr = pis
    s_ = (cx - 8 + L, sh + 4)
    h_ = (s_[0] + 4 + pr * 18 + math.cos(pa) * 6, s_[1] + 22 - pr * 16)
    limb(p, [s_, ((s_[0] + h_[0]) / 2 - 3, (s_[1] + h_[1]) / 2 + 2), h_], 7, GH[1])
    ell(p, h_[0] - 1, h_[1] - 1, 4.5, 4.5, GAU[1])                             # cuff
    flintlock(p, h_[0] + 2, h_[1] + 1, pa)
    # coat skirts and body
    sw = math.sin(t * math.tau) * 2
    p.poly([(cx - 14 + L, sh + 2), (cx + 12 + L, sh + 2), (cx + 16 + sw, hip + 20), (cx - 22 + sw, hip + 22)], GH[1])
    p.poly([(cx - 14 + L, sh + 2), (cx - 6 + L, sh + 2), (cx - 14 + sw, hip + 22), (cx - 22 + sw, hip + 22)], GH[0])
    p.lines([(cx + 16 + sw, hip + 20), (cx - 22 + sw, hip + 22)], GAU[1], 2)
    p.poly([(cx - 4 + L, sh + 2), (cx + 9 + L, sh + 2), (cx + 9 + L * 0.5, hip + 4), (cx - 4, hip + 4)], GH[3])   # waistcoat
    for y in range(int(sh) + 6, int(hip), 6):
        ell(p, cx + 7 + L * 0.6, y, 1.2, 1.2, GAU[2])
    p.r(cx - 6, hip - 3, cx + 11, hip + 3, (40, 110, 100)); p.l(cx - 6, hip - 3, cx + 11, hip - 3, GH[3])   # sash
    p.poly([(cx - 6, hip), (cx - 12, hip + 16), (cx - 6, hip + 15), (cx - 2, hip + 2)], (30, 90, 84))
    p.poly([(cx + 9 + L, sh + 2), (cx + 13 + L, sh + 2), (cx + 16 + sw, hip + 20), (cx + 11 + sw, hip + 20)], GH[2])   # coat front edge
    p.l(cx + 13 + L, sh + 2, cx + 16 + sw, hip + 20, GAU[2])
    p.poly([(cx - 14 + L, sh - 2), (cx + 13 + L, sh - 1), (cx + 12 + L, sh + 6), (cx - 15 + L, sh + 6)], GH[2])   # shoulders / epaulettes
    for j in range(5):
        p.l(cx + 2 + L + j * 2, sh + 6, cx + 2 + L + j * 2, sh + 9, GAU[2])
    # head: gaunt face, beard, burning eyes
    hx, hy = cx + 5 + L * 1.3, top + 14
    p.l(cx + L, sh - 2, hx - 2, hy + 8, GH[2], 6)
    ell(p, hx, hy, 9, 10, GH[2]); ell(p, hx - 0.5, hy - 1, 7.5, 8.5, GH[3])
    p.poly([(hx + 6, hy - 2), (hx + 12, hy + 3), (hx + 6, hy + 5)], GH[3])    # nose
    p.poly([(hx - 7, hy + 2), (hx + 9, hy + 6), (hx + 6, hy + 15), (hx - 2, hy + 17), (hx - 7, hy + 8)], GH[1])   # beard
    for j in range(4):
        p.l(hx - 5 + j * 3, hy + 6, hx - 4 + j * 3, hy + 15, GH[0])
    if mouth:
        p.e(hx + 1, hy + 6, hx + 8, hy + 7 + mouth * 2, GHO)
    if eyes:
        ell(p, hx + 4, hy - 2, 2.5, 2, GH[4]); p.p(hx + 5, hy - 2, WHITE)
        p.l(hx + 1, hy - 5, hx + 7, hy - 4, GH[0], 2)
    else:
        p.l(hx + 1, hy - 2, hx + 7, hy - 2, GH[0], 2)
    if hat:
        tricorn(p, hx - 1, hy - 8, -0.08 + L * 0.02)
    # front arm with the sabre
    sa_, sr = sab
    s2 = (cx + 6 + L, sh + 4)
    if sa_ < -1.2:                                                            # raised over the shoulder
        h2 = (s2[0] - 4, s2[1] - 14)
    else:
        h2 = (s2[0] + 10 + sr * 14, s2[1] + 18 - sr * 16)
    limb(p, [s2, ((s2[0] + h2[0]) / 2 + 4, (s2[1] + h2[1]) / 2 + 3), h2], 7, GH[2], GH[3])
    ell(p, h2[0], h2[1], 4.5, 4.5, GAU[2])
    sabre(p, h2[0] + 1, h2[1], sa_, 36, glint)
    if slash is not None:
        a0, a1 = slash
        for r_, c, w in ((40, GH[4], 3), (36, GH[3], 2), (32, GH[2], 1)):
            p.arc(s2[0] - r_, s2[1] - r_, s2[0] + r_, s2[1] + r_, a0, a1, c, w)
    im = ghostly(outline_same(cut_below(p.im, f), GHO), seed, fade, below=hip + 16)
    q = Pic(BS, BS)
    if muzzle:
        u = (math.cos(pa), math.sin(pa))
        mx, my = h_[0] + 2 + u[0] * 22, h_[1] + 1 + u[1] * 22
        if muzzle == 1:
            for j in range(10):
                a = j / 10 * math.tau
                q.l(mx, my, mx + math.cos(a) * (12 if j % 2 else 6), my + math.sin(a) * (12 if j % 2 else 6), GH[4], 2)
            ell(q, mx, my, 4, 4, WHITE)
        for j in range(muzzle):
            puff(q, mx + 4 + j * 5, my - 2 - j * 3, 4 + j, (GH[0], GH[1], GH[2], GH[3]))
    if aura:
        halo(q, hx - 4, hy + 30, 34 + aura * 3, (GH[3], GH[4]), 18, aura)
    return on(im, outline_same(q.im, GHO))


def captain_remains(k):
    """The captain gone: his sabre and his tricorn on the deck, the last mist sinking (k 0..2)."""
    p = Pic(BS, BS)
    f = BS_FEET
    sabre(p, 24, f - 2, -0.03, 42)
    tricorn(p, 86, f - 5, 0.15, 0.9)
    im = outline_same(cut_below(p.im, f), GHO)
    if k < 2:
        q = Pic(BS, BS)
        for j in range(5 - k * 2):
            puff(q, 40 + j * 9, f - 14 - (j % 2) * 8 - k * 6, 4 - k, (GH[1], GH[2], GH[3], GH[4]))
        im = on(ghostly(q.im, 70 + k, 0.6 + k * 0.2), im)
    return im


@builder('captain')
def make_captain():
    C = captain_frame
    save_boss('captain', 'idle', [C(t=i / 5, bob=(0, -1, -2, -1, 0)[i], seed=i, sab=(0.45 + 0.04 * math.sin(i), 0)) for i in range(5)])
    # attack: the sabre cut (loops: starts and ends near the ready pose)
    save_boss('captain', 'attack', [C(t=0.0, sab=(-0.6, 0.3), lean=-1, mouth=1, seed=10), C(t=0.2, sab=(-2.4, 0), lean=-3, mouth=1, seed=11),
                                    C(t=0.4, sab=(-0.8, 0.7), lean=3, dx=2, mouth=2, slash=(-110, -30), seed=12),
                                    C(t=0.6, sab=(0.5, 0.6), lean=4, dx=0, mouth=2, slash=(-70, 40), glint=True, seed=13),
                                    C(t=0.8, sab=(0.9, 0.6), lean=3, dx=3, mouth=1, seed=14), C(t=1.0, sab=(0.1, 0.3), lean=0, seed=15)])
    # cast: points with the sabre and fires the flintlock - the order for the cannon salvo
    save_boss('captain', 'cast', [C(t=0.0, sab=(-0.2, 0.6), pis=(0.3, 0.3), mouth=2, aura=1, seed=20),
                                  C(t=0.2, sab=(-0.25, 0.65), pis=(-0.1, 0.8), mouth=2, aura=2, seed=21),
                                  C(t=0.4, sab=(-0.25, 0.65), pis=(-0.15, 1.0), mouth=3, aura=3, muzzle=1, lean=-1, seed=22),
                                  C(t=0.6, sab=(-0.25, 0.65), pis=(-0.3, 0.9), mouth=2, aura=2, muzzle=2, lean=-2, seed=23),
                                  C(t=0.8, sab=(-0.2, 0.6), pis=(0.0, 0.6), mouth=1, aura=1, muzzle=3, seed=24),
                                  C(t=1.0, sab=(-0.2, 0.6), pis=(0.3, 0.3), mouth=1, aura=1, seed=25)])
    save_boss('captain', 'hurt', [flash(C(dx=-4, lean=-4, mouth=3, eyes=0, fade=0.4, seed=30), GH[4]), C(dx=-3, lean=-3, mouth=2, fade=0.3, seed=31),
                                  C(dx=-1, lean=-1, seed=32)])
    d = [flash(C(dx=-3, lean=-4, mouth=3, eyes=0, seed=40), WHITE), C(bob=-2, mouth=3, eyes=0, fade=0.4, seed=41, sab=(1.0, 0.2)),
         C(bob=-5, mouth=2, eyes=0, fade=0.65, seed=42, sab=(1.3, 0.1), wisp=0.6), C(bob=-8, eyes=0, fade=0.85, seed=43, hat=0, sab=(1.5, 0), wisp=0.3),
         captain_remains(0), captain_remains(1), captain_remains(2)]
    save_boss('captain', 'death', d)


# ================================================================== THE ALCHEMIST (drawn, 116x116)
BELT_COLS = [POT['red'], POT['green'], POT['blue'], POT['amber'], POT['purple'], POT['green'], POT['red']]


def alchemist_frame(step=0.0, bob=0, dx=0, lean=0.0, arm=(0.0, 0.0), held=None, eyes=1, kneel=0.0, glow=0, fly=None,
                    lift=0.0, sw=0.0):
    """Side view facing right: the alchemist - a long dark leather coat, a leather hood and protective mask with two
    round brass-rimmed goggles and a short beaked filter, heavy gloves, a bandolier and a belt full of coloured flasks;
    arm = (front arm mode, k): mode 0 hang, 1 reach to the belt, 2 drawn back over the shoulder, 3 flung forward,
    4 bottle raised to the mask (drinking); held = colour of a flask in the hand; lift raises the mask's beak."""
    p = Pic(BS, BS)
    f = BS_FEET
    cx = 54 + dx
    top = 8 + bob + kneel * 22
    sh = top + 26
    hip = sh + 32
    L = lean
    # legs and boots
    for sd in (-1, 1):
        fx = cx + sd * (5 + step * 7)
        kx = cx + sd * step * 4 + (kneel * 10 if sd > 0 else -kneel * 4)
        ky = hip + 16 - kneel * 6
        limb(p, [(cx + sd * 3, hip), (kx, ky), (fx, f - 4)], 8, LEA[0] if sd < 0 else LEA[1])
        p.r(fx - 5, f - 6, fx + 7, f, (24, 18, 14)); p.l(fx - 5, f - 6, fx + 7, f - 6, LEA[2])
    # back arm
    limb(p, [(cx - 8 + L, sh + 4), (cx - 12 + L, sh + 18), (cx - 8 + L, sh + 30)], 7, LEA[1])
    ell(p, cx - 8 + L, sh + 32, 4.5, 4.5, (40, 30, 26))
    # coat
    swing = sw * 3
    p.poly([(cx - 15 + L, sh), (cx + 13 + L, sh), (cx + 18 + swing, f - 10 - kneel * 10), (cx - 22 + swing, f - 8 - kneel * 10)], LEA[2])
    p.poly([(cx - 15 + L, sh), (cx - 6 + L, sh), (cx - 14 + swing, f - 8 - kneel * 10), (cx - 22 + swing, f - 8 - kneel * 10)], LEA[1])
    for x in (-8, 2, 10):
        p.l(cx + x * 0.6 + L, sh + 30, cx + x * 1.2 + swing, f - 10 - kneel * 10, LEA[1])
    p.l(cx + 13 + L, sh, cx + 18 + swing, f - 10 - kneel * 10, LEA[3])
    # bandolier across the chest, belt round the waist, both with flasks
    p.l(cx - 12 + L, sh + 2, cx + 12 + L * 0.6, hip - 4, (30, 22, 16), 4)
    for j in range(4):
        t = (j + 0.5) / 4
        x, y = cx - 12 + L + t * 24, sh + 2 + t * (hip - 6 - sh)
        p.r(x - 1.5, y - 5, x + 1.5, y + 1, BELT_COLS[j][1]); p.p(x - 1, y - 4, BELT_COLS[j][2]); p.r(x - 1, y - 7, x + 1, y - 5, WD3)
    p.r(cx - 15, hip - 4, cx + 15, hip + 2, (34, 24, 16)); p.r(cx + 3, hip - 4, cx + 8, hip + 2, BR2)
    for j in range(5):
        x = cx - 13 + j * 6 + (j > 2) * 6
        if x > cx + 14:
            continue
        ell(p, x, hip + 6, 2.6, 3, GLASS[0]); ell(p, x, hip + 6.5, 2, 2.2, BELT_COLS[j + 2][1]); p.p(x - 1, hip + 5, BELT_COLS[j + 2][2])
        p.r(x - 1, hip + 1, x + 1, hip + 3, GLASS[1])
    # head: hood and mask
    hx, hy = cx + 4 + L * 1.3, top + 13
    ell(p, hx - 2, hy, 12, 13, LEA[1]); ell(p, hx - 3, hy - 1, 10, 11, LEA[2])
    p.poly([(hx - 12, hy + 2), (hx - 16, hy + 18), (hx - 4, hy + 14)], LEA[1])
    ell(p, hx + 2, hy + 1, 8, 9, (60, 44, 32)); ell(p, hx + 2, hy, 7, 8, (84, 62, 44))         # mask face
    for gx in (hx + 4, hx - 2):                                                                  # goggles (the near one in front)
        ell(p, gx, hy - 2, 4, 4, BR1); ell(p, gx, hy - 2, 3, 3, (40, 70, 60) if not glow else (120, 255, 140))
        p.p(gx - 1, hy - 3, WHITE if gx > hx else (140, 180, 160))
    bk = lift * 6
    p.poly([(hx + 4, hy + 3 - bk), (hx + 15, hy + 7 - bk), (hx + 14, hy + 11 - bk), (hx + 4, hy + 10 - bk)], LEA[0])   # beaked filter
    p.l(hx + 4, hy + 3 - bk, hx + 15, hy + 7 - bk, LEA[3])
    ell(p, hx + 15, hy + 9 - bk, 2.5, 2.5, BR2); p.p(hx + 15, hy + 9 - bk, BR4)
    for y_ in (hy + 5, hy + 8):
        p.l(hx + 7, y_ - bk, hx + 11, y_ + 1 - bk, (24, 18, 14))
    if lift > 0.4:
        p.e(hx + 3, hy + 8, hx + 9, hy + 12, (30, 10, 10))                  # his mouth under the lifted beak
    # front arm
    mode, k = arm
    s_ = (cx + 6 + L, sh + 4)
    if mode == 0:
        h_ = (s_[0] + 6, s_[1] + 26)
    elif mode == 1:
        h_ = (s_[0] + 2 - k * 4, hip + 4 - k * 4)
    elif mode == 2:
        h_ = (s_[0] - 6 - k * 4, s_[1] - 12 - k * 4)
    elif mode == 3:
        h_ = (s_[0] + 18 + k * 6, s_[1] - 4 + k * 10)
    else:
        h_ = (hx + 12 - k * 2, hy + 14 - k * 4)
    e_ = ((s_[0] + h_[0]) / 2 + (6 if mode != 2 else -2), (s_[1] + h_[1]) / 2 + 6)
    limb(p, [s_, e_, h_], 7, LEA[2], LEA[3])
    ell(p, h_[0], h_[1], 5, 5, (40, 30, 26)); ell(p, h_[0] - 1, h_[1] - 1, 3, 3, (64, 48, 40))
    if held:
        if mode == 4:
            fx_, fy_ = h_[0] + 2, h_[1] - 4
            ell(p, fx_, fy_, 4, 4, GLASS[0]); ell(p, fx_, fy_, 3, 3, held[1]); p.p(fx_ - 1, fy_ - 1, held[2])
            p.l(fx_ - 2, fy_ - 3, fx_ - 6, fy_ - 6, GLASS[1], 3)
        else:
            flask(p, h_[0] + 1, h_[1] - 6, held, 1.6, 0.4 if mode != 2 else -0.5)
    im = outline_same(cut_below(p.im, f))
    q = Pic(BS, BS)
    if fly is not None:
        fxp, fyp, col, kk = fly
        flask(q, fxp, fyp, col, 1.6, kk * 2)
        for j in range(4):
            q.p(fxp - 6 - j * 4, fyp + 2 + j, col[2])
    if glow:
        halo(q, hx, hy + 30, 30 + glow * 3, ((120, 255, 140), (200, 255, 200)), 16, glow + 3)
        for j in range(glow * 2):
            q.p(hx - 20 + j * 7, hy + 4 - (j % 3) * 5, (180, 255, 190))
    return on(im, outline_same(q.im))


def alchemist_fallen(k):
    """The alchemist lying face down, coat spread, flasks broken round him in coloured pools (k 0..2)."""
    p = Pic(BS, BS)
    f = BS_FEET
    for j, (x, col) in enumerate(((12, POT['red']), (60, POT['green']), (96, POT['purple']))):
        pool(p, x, f, 16 + k * 4, 3, (col[0], col[1], col[2]), j)
    p.poly([(14, f), (18, f - 14), (70, f - 16), (90, f - 8), (94, f)], LEA[2])
    p.poly([(18, f - 14), (40, f - 15), (36, f - 6), (16, f - 4)], LEA[1])
    p.r(88, f - 8, 100, f, (24, 18, 14))
    ell(p, 10, f - 9, 9, 8, LEA[1]); ell(p, 10, f - 10, 7, 6, LEA[2])
    p.poly([(2, f - 6), (-2, f - 2), (6, f - 2)], LEA[0])
    ell(p, 14, f - 12, 3, 3, BR1); ell(p, 14, f - 12, 2, 2, (40, 70, 60))
    p.r(30, f - 15, 70, f - 12, (34, 24, 16))
    for x in (34, 44, 54):
        p.ps([(x, f - 1), (x + 2, f - 3), (x + 3, f - 1)], GLASS[2])
    im = outline_same(cut_below(p.im, f))
    if k < 2:
        q = Pic(BS, BS)
        for j in range(3 - k):
            q.p(58 + j * 4, f - 20 - j * 3 - k * 4, (180, 255, 190))
        im = on(im, q.im)
    return shift(im, 5, 0)


@builder('alchemist')
def make_alchemist():
    A_ = alchemist_frame
    save_boss('alchemist', 'idle', [A_(bob=(0, 0, 1, 1, 0)[i], sw=math.sin(i / 5 * math.tau), arm=(0, 0)) for i in range(5)])
    r, g = POT['red'], POT['green']
    save_boss('alchemist', 'attack', [A_(arm=(1, 0.0), lean=-1), A_(arm=(1, 1.0), held=r, lean=-2), A_(arm=(2, 1.0), held=r, lean=-4, sw=-1),
                                      A_(arm=(3, 0.0), lean=4, dx=1, sw=1, fly=(96, 34, r, 0.3)), A_(arm=(3, 1.0), lean=3, dx=0, sw=1, fly=(106, 40, r, 0.8)),
                                      A_(arm=(0, 0), lean=0, dx=0)])
    save_boss('alchemist', 'cast', [A_(arm=(1, 1.0), held=g, lean=-1), A_(arm=(4, 0.0), held=g, lift=0.6, lean=-2),
                                    A_(arm=(4, 1.0), held=g, lift=1.0, lean=-4, glow=1), A_(arm=(4, 1.0), held=g, lift=1.0, lean=-4, glow=2),
                                    A_(arm=(4, 0.0), held=g, lift=0.5, lean=-1, glow=3), A_(arm=(0, 0), lean=0, glow=1)])
    save_boss('alchemist', 'hurt', [flash(A_(dx=-4, lean=-5, eyes=0), WHITE), A_(dx=-3, lean=-3), A_(dx=-1, lean=-1)])
    d = [flash(A_(dx=-3, lean=-5, eyes=0), WHITE), A_(dx=-2, lean=-4, sw=-1), A_(dx=0, lean=2, kneel=0.5, sw=1), A_(dx=2, lean=6, kneel=1.0),
         topple(A_(dx=-22, lean=6, kneel=1.0), -55, (40, BS_FEET), BS_FEET), alchemist_fallen(0), alchemist_fallen(2)]
    save_boss('alchemist', 'death', d)


# ================================================================== PROPS
def cannon(k):
    """A ship's cannon on its wooden carriage, the muzzle to the right (the game turns it): 0 = loaded, a ball stacked
    beside it and the fuse in the touch hole; 1 = fired - rolled back, smoke curling from the mouth, no ball."""
    p = Pic(64, 40)
    f = 39
    dx = -3 if k else 0
    p.poly([(8 + dx, f - 6), (12 + dx, f - 16), (40 + dx, f - 16), (44 + dx, f - 6)], WD2)                 # carriage cheeks
    p.l(12 + dx, f - 16, 40 + dx, f - 16, WD4); p.l(8 + dx, f - 6, 44 + dx, f - 6, WD0)
    p.r(10 + dx, f - 7, 42 + dx, f - 4, WD1)
    for wx in (14, 38):                                                       # trucks (wheels)
        ell(p, wx + dx, f - 4, 4.5, 4.5, WD1); ell(p, wx + dx, f - 4, 2, 2, I1); p.p(wx + dx - 1, f - 6, WD3)
    # barrel: breech knob at the left, tapering to a muzzle swell on the right
    bx0, bx1, by = 6 + dx, 58 + dx, f - 20
    p.poly([(bx0 + 6, by - 7), (bx1 - 6, by - 5), (bx1 - 6, by + 5), (bx0 + 6, by + 7)], I1)
    p.poly([(bx0 + 6, by - 7), (bx1 - 6, by - 5), (bx1 - 6, by - 2), (bx0 + 6, by - 3)], I2)
    p.l(bx0 + 7, by - 5, bx1 - 8, by - 4, I3)
    p.r(bx1 - 7, by - 6, bx1 - 1, by + 6, I1); p.l(bx1 - 7, by - 6, bx1 - 1, by - 6, I3)
    p.r(bx1 - 1, by - 4, bx1 + 1, by + 4, (10, 10, 12))
    ell(p, bx0 + 6, by, 6, 7, I1); ell(p, bx0 + 5, by - 2, 3, 3, I2)
    ell(p, bx0, by, 2.5, 2.5, I1)                                             # cascabel
    for x in (bx0 + 16, bx0 + 32):
        p.l(x, by - 7, x, by + 7, I0, 2); p.l(x + 1, by - 6, x + 1, by - 3, I3)
    ell(p, 26 + dx, by + 1, 2, 2, BR2)                                        # trunnion
    if k == 0:
        p.l(bx0 + 10, by - 8, bx0 + 8, by - 12, ROPE[2]); p.p(bx0 + 8, by - 13, (255, 190, 80))
        shade_ball(p, 56, f - 4, 4, (I0, I1, I2, I3))                         # a ball beside it
    im = outline_same(p.im)
    if k:
        q = Pic(64, 40)
        for j, (x, y, r) in enumerate(((bx1 + 2, by - 1, 3.5), (bx1 + 4, by - 6, 3), (bx1 + 1, by - 10, 2.5), (bx0 + 8, by - 11, 2))):
            puff(q, x, y, r, ((70, 70, 74), (130, 130, 134), (176, 176, 178), (214, 214, 214)))
        im = on(im, outline_same(q.im))
    return im


def shiplantern(k):
    """A ship's lantern on a hook bracket: a black iron cage with glass panes and a candle flame flickering (k 0..1)."""
    p = Pic(22, 40)
    cx = 11
    p.l(cx, 0, cx, 5, I2); p.arc(cx - 3, 3, cx + 3, 9, 180, 360, I2)
    p.poly([(cx - 6, 12), (cx, 7), (cx + 6, 12)], I1); p.l(cx - 6, 12, cx + 6, 12, I3)
    p.r(cx - 6, 12, cx + 6, 31, I0)
    p.r(cx - 5, 13, cx + 5, 30, (255, 196, 90))
    p.r(cx - 4, 14, cx - 3, 29, (255, 232, 160))
    for x in (cx - 6, cx, cx + 6):
        p.l(x, 12, x, 31, I1)
    flame(p, cx + (1 if k else -1) * 0.5, 27, 8 + k, (0.8 if k else -0.8), 1.0, ((230, 120, 30), (255, 200, 70), (255, 245, 190), WHITE))
    p.r(cx - 7, 31, cx + 7, 34, I1); p.l(cx - 7, 31, cx + 7, 31, I3)
    p.poly([(cx - 3, 34), (cx + 3, 34), (cx, 38)], I1)
    im = outline_same(p.im)
    q = Pic(22, 40)
    halo(q, cx, 21, 10 + k, ((255, 220, 130), (255, 190, 90)), 8, 3 + k)
    return on(im, q.im)


def powderkeg():
    """A gunpowder keg with iron hoops, 'XXX' and a skull painted on it, black powder spilling from a split stave and a
    short fuse."""
    p = Pic(30, 36)
    f = 35
    p.e(2, 4, 27, 10, WD1)
    p.poly([(2, 7), (27, 7), (29, 20), (27, f - 3), (2, f - 3), (0, 20)], WD2)
    for x in (6, 11, 16, 21):
        p.l(x, 8, x - (1 if x < 14 else -1) * 1, f - 3, WD1)
    p.l(3, 8, 1, 20, WD4)
    ell(p, 14.5, f - 3, 13, 3, WD1)
    for y in (10, 20, 29):
        p.l(1 if y == 20 else 2, y, 28 if y == 20 else 27, y, I1, 2); p.l(3, y - 1, 26, y - 1, I3)
    ell(p, 14.5, 7, 12, 3, WD3); ell(p, 14.5, 7, 9, 2, WD2)
    p.ps([(8, 14), (10, 16), (12, 14), (10, 18)], (230, 220, 190))            # XXX skull mark
    ell(p, 19, 15, 3, 3, (230, 220, 190)); p.p(18, 15, WD0); p.p(20, 15, WD0); p.l(18, 18, 20, 18, (230, 220, 190))
    p.l(15, 5, 18, 1, ROPE[2]); p.p(18, 1, (60, 40, 20))
    p.poly([(22, f - 2), (29, f - 2), (30, f), (20, f)], (30, 28, 30))        # spilled powder
    p.ps([(24, f - 1), (27, f)], (70, 66, 70))
    return outline_same(p.im)


def flaskshelf(k):
    """A free-standing shelf of explosive flasks (red, blue, green, purple, corked and glowing); 1 = smashed: boards
    split, glass shards and coloured spills."""
    p = Pic(40, 52)
    f = 51
    p.r(1, 2, 4, f, WD2); p.r(35, 2, 38, f, WD2); p.l(1, 2, 1, f, WD4); p.l(38, 2, 38, f, WD0)
    rows = (18, 34, 50)
    cols = [POT['red'], POT['blue'], POT['green'], POT['purple'], POT['amber']]
    r2 = random.Random(1901)
    for ri, sy in enumerate(rows):
        broken = k and ri < 2
        if broken:
            p.poly([(4, sy), (16, sy - 1), (19, sy + 3), (4, sy + 3)], WD2); p.poly([(24, sy + 2), (35, sy), (35, sy + 3), (26, sy + 4)], WD1)
        else:
            p.r(4, sy, 35, sy + 2, WD2); p.l(4, sy, 35, sy, WD4)
        for j in range(4):
            x = 9 + j * 7
            col = cols[(ri * 4 + j) % 5]
            if broken and (j + ri) % 2 == 0:
                p.ps([(x - 1, sy - 1), (x + 1, sy - 2), (x + 2, sy - 1)], GLASS[2])
                continue
            if k and ri < 2:
                continue
            ell(p, x, sy - 4, 3, 3.5, GLASS[0]); ell(p, x, sy - 3.5, 2.4, 2.8, col[1]); p.p(x - 1, sy - 5, col[2]); p.p(x - 1.5, sy - 5.5, WHITE)
            p.r(x - 1, sy - 10, x + 1, sy - 7, GLASS[1]); p.r(x - 1, sy - 12, x + 1, sy - 10, WD3)
    if k:
        for x, col in ((8, POT['red']), (20, POT['green']), (30, POT['blue'])):
            p.e(x - 6, f - 2, x + 6, f + 1, col[0]); p.e(x - 4, f - 2, x + 4, f, col[1])
        dust(p, 14, 1902, (4, 30, 36, 50), (GLASS[1], GLASS[2], GLASS[3]))
    p.r(0, 0, 39, 2, WD3); p.l(0, 0, 39, 0, WD4)
    return outline_same(p.im)


def teslacoil(k):
    """A tesla coil: a copper-wound column on a brass and slate base, a polished brass torus on top; 0 = resting with a
    faint glow, 1-2 = sparking: lightning arcs crackle from the torus (two different arc sets)."""
    p = Pic(44, 64)
    cx, f = 22, 63
    p.r(cx - 12, f - 6, cx + 12, f, (40, 44, 50)); p.l(cx - 12, f - 6, cx + 12, f - 6, (90, 96, 104))
    p.r(cx - 9, f - 10, cx + 9, f - 6, BR1); p.l(cx - 9, f - 10, cx + 9, f - 10, BR3)
    p.r(cx - 5, 24, cx + 5, f - 10, (110, 54, 26))
    for y in range(25, f - 10, 2):                                            # copper windings
        p.l(cx - 5, y, cx + 5, y, (196, 110, 56)); p.p(cx - 4, y, (240, 170, 110))
    p.l(cx + 5, 24, cx + 5, f - 10, (70, 34, 16))
    p.r(cx - 2, 16, cx + 2, 24, BR2)
    ell(p, cx, 14, 13, 5, BR1); ell(p, cx - 1, 13, 11, 3.5, BR3); p.l(cx - 8, 12, cx - 2, 11, BR4)
    ell(p, cx, 14, 4, 1.5, BR0)
    for x in (cx - 9, cx + 9):
        p.r(x - 1, f - 4, x + 1, f - 2, BR3)
    im = outline_same(p.im)
    q = Pic(44, 64)
    if k == 0:
        halo(q, cx, 13, 15, ((170, 220, 255), (120, 170, 255)), 6, 5)
    else:
        arcs = [((cx - 12, 13), (2, 2)), ((cx + 12, 14), (42, 6)), ((cx, 9), (cx + 6, 0))] if k == 1 else \
               [((cx + 12, 12), (40, 26)), ((cx - 12, 15), (1, 10)), ((cx - 4, 9), (cx - 9, 0))]
        for j, (a, b) in enumerate(arcs):
            bolt(q, a[0], a[1], b[0], b[1], 1911 + j + k * 7, 1, ((40, 60, 170), (150, 200, 255), (250, 252, 255)), 2.5, 0)
        halo(q, cx, 13, 16, ((210, 240, 255), (150, 200, 255)), 10, 6 + k)
    return on(im, q.im)


def alembic(k):
    """An alembic on a brass stand over a spirit burner: a round glass flask of bubbling green-gold liquid, the long
    beak running down to a small receiving flask; k = which bubbles are up (animated, 2 frames)."""
    p = Pic(50, 48)
    f = 47
    p.r(4, f - 2, 30, f, WD2); p.l(4, f - 2, 30, f - 2, WD4)                   # wooden base
    for x in (8, 26):
        p.l(x, f - 2, x + (3 if x < 16 else -3), f - 14, BR2)
    p.arc(6, f - 16, 28, f - 10, 0, 180, BR3)                                 # tripod ring
    ell(p, 17, f - 5, 3, 2, BR1); flame(p, 17, f - 6, 4 + k, (0.5 if k else -0.5), 0.8, ((40, 80, 200), (90, 160, 255), (200, 230, 255), WHITE))
    ell(p, 17, f - 22, 10, 10, GLASS[0])                                      # the flask
    ell(p, 17, f - 20, 8.5, 7.5, (150, 170, 40)); ell(p, 17, f - 19, 7.5, 6, (200, 200, 60))
    p.l(10, f - 25, 24, f - 25, (240, 230, 120))
    for j, (bx, by) in enumerate(((13, f - 21), (20, f - 18), (16, f - 16), (21, f - 23))):
        if (j + k) % 2:
            p.arc(bx - 1.5, by - 1.5, bx + 1.5, by + 1.5, 0, 360, (250, 250, 180))
    p.p(11, f - 27, WHITE); p.p(12, f - 28, GLASS[3])
    p.r(15, f - 38, 19, f - 31, GLASS[1])                                      # neck
    ell(p, 17, f - 41, 5, 4, GLASS[0]); ell(p, 16, f - 42, 2.5, 2, GLASS[2])   # still head
    p.lines([(21, f - 41), (34, f - 35), (40, f - 24)], GLASS[1], 2)          # beak
    ell(p, 42, f - 7, 6, 6, GLASS[0]); ell(p, 42, f - 5, 4.5, 4, (180, 160, 40)); p.r(41, f - 20, 43, f - 12, GLASS[1])
    p.p(39, f - 9, WHITE)
    p.r(36, f - 1, 48, f, WD2)
    im = outline_same(p.im)
    q = Pic(50, 48)
    for j in range(3):                                                         # vapour curling from the beak
        y = f - 44 - j * 2 - k
        q.p(20 + j * 2 - k, y, (220, 230, 200))
    q.p(40 + k, f - 24 + k, (200, 200, 60))                                    # a drip
    return on(im, q.im)


@builder('props')
def make_props():
    save_prop('cannon', [cannon(k) for k in range(2)])
    save_prop('shiplantern', [shiplantern(k) for k in range(2)])
    save_prop('powderkeg', [powderkeg()])
    save_prop('flaskshelf', [flaskshelf(k) for k in range(2)])
    save_prop('teslacoil', [teslacoil(k) for k in range(3)])
    save_prop('alembic', [alembic(k) for k in range(2)])


# ================================================================== ITEMS, PARTICLES AND ICONS
def chainball(p, x, y, r, ang, sp=None):
    """Two iron balls joined by a short chain, centre (x, y), turned by ang."""
    sp = sp or r * 1.9
    ax, ay = x + math.cos(ang) * sp, y + math.sin(ang) * sp
    bx, by = x - math.cos(ang) * sp, y - math.sin(ang) * sp
    p.l(ax, ay, bx, by, (110, 114, 122))
    for t in (0.35, 0.65):
        p.p(ax + (bx - ax) * t, ay + (by - ay) * t, (190, 194, 202))
    for cx_, cy_ in ((ax, ay), (bx, by)):
        shade_ball(p, cx_, cy_, r, (I0, I1, I2, I3))


@builder('items')
def make_items():
    p = Pic(22, 18)                                                            # the chain-ball crate (ammo)
    p.r(1, 6, 20, 17, WD2); p.l(1, 6, 20, 6, WD4); p.l(1, 11, 20, 11, WD1)
    p.r(1, 6, 2, 17, WD1); p.r(19, 6, 20, 17, WD1); p.r(10, 6, 11, 17, I1)
    chainball(p, 7, 4, 2.4, 0.3)
    chainball(p, 15, 3, 2.4, -0.4)
    p.p(10, 13, BR3)
    save(hard(outline_same(p.im)), G_OUT + 'item_chaincrate.png')
    p = Pic(14, 20)                                                            # the acid flask
    p.r(5, 0, 8, 3, (60, 60, 64)); p.l(5, 0, 8, 0, (120, 120, 126))            # rubber stopper
    p.r(5, 3, 8, 6, GLASS[1])
    p.poly([(5, 6), (8, 6), (13, 18), (0, 18)], GLASS[0])                      # conical flask
    p.poly([(4, 10), (9, 10), (12, 17), (1, 17)], AC[2]); p.l(4, 10, 9, 10, AC[3]); p.r(1, 16, 12, 17, AC[1])
    p.ps([(5, 13), (8, 15), (6, 15)], AC[4]); p.l(3, 9, 1, 15, GLASS[3])
    p.ps([(10, 3), (11, 1)], AC[3])                                            # a fuming wisp
    save(hard(outline_same(p.im)), G_OUT + 'item_acidflask.png')
    p = Pic(52, 22)                                                            # the chain cannon's pickup, lying sideways
    p.r(1, 12, 15, 17, WD2); p.l(1, 12, 15, 12, WD4); p.poly([(12, 16), (17, 16), (14, 21), (10, 21)], WD1)
    p.poly([(14, 6), (44, 8), (44, 17), (14, 18)], I1); p.l(14, 7, 44, 9, I2); p.l(16, 9, 42, 10, I3)
    ell(p, 14, 12, 5, 6.5, I1); ell(p, 13, 10, 2.5, 2.5, I2)
    for x in (22, 32, 41):
        p.l(x, 7, x, 18, BR1, 2); p.l(x, 7, x, 9, BR3)
    p.r(44, 5, 48, 19, I1); p.l(44, 5, 48, 5, I3); p.r(48, 8, 49, 16, (10, 10, 12))
    chainball(p, 47, 4, 2.6, -0.2, 4)
    save(hard(outline_same(p.im)), G_OUT + 'pick_chaincannon.png')
    p = Pic(52, 22)                                                            # the acid sprayer's pickup
    p.r(1, 12, 10, 16, (90, 58, 34)); p.poly([(9, 15), (14, 15), (12, 21), (8, 21)], (74, 46, 26))
    p.r(8, 3, 30, 11, GLASS[0]); p.r(9, 4, 29, 10, AC[2]); p.l(9, 4, 29, 4, AC[3]); p.r(9, 9, 29, 10, AC[1])
    for x in (8, 18, 30):
        p.r(x - 1, 2, x + 1, 12, BR2); p.l(x - 1, 2, x + 1, 2, BR4)
    p.ps([(14, 7), (22, 6), (25, 8)], AC[4])
    p.r(8, 12, 32, 15, BR1); p.l(8, 12, 32, 12, BR3)
    p.r(30, 12, 47, 14, BR2); p.l(30, 12, 47, 12, BR4)
    p.r(42, 11, 44, 15, (50, 140, 30)); p.poly([(47, 11), (51, 13), (47, 15)], BR3)
    p.p(51, 13, AC[3])
    for j in range(3):
        p.arc(20 + j * 3, 14, 23 + j * 3, 18, 0, 360, (40, 40, 44))
    save(hard(outline_same(p.im)), G_OUT + 'pick_acidsprayer.png')


@builder('particles')
def make_particles():
    fr = []                                                                    # an acid splash drop (2 frames 8x8)
    for k in range(2):
        p = Pic(8, 8)
        if k == 0:
            ell(p, 3.5, 4, 2.5, 2.5, AC[1]); ell(p, 3, 3.5, 1.5, 1.5, AC[2]); p.p(2, 2, AC[4]); p.p(6, 1, AC[3])
        else:
            p.e(1, 4, 6, 6, AC[1]); p.l(2, 4, 5, 4, AC[3]); p.p(1, 2, AC[2]); p.p(6, 1, AC[2])
        fr.append(outline_same(p.im, AC[0]))
    save(cells(fr, 8, 8), G_OUT + 'part_acid.png', 2)
    fr = []                                                                    # a spinning chain ball (2 frames 10x10)
    for k in range(2):
        p = Pic(10, 10)
        chainball(p, 4.5, 4.5, 1.8, 0.4 + k * math.pi / 2, 2.6)
        fr.append(p.im)
    save(cells(fr, 10, 10), G_OUT + 'part_chainball.png', 2)
    fr = []                                                                    # a rising bubble (2 frames 7x7: round, wobbling)
    for k in range(2):
        p = Pic(7, 7)
        if k == 0:
            p.arc(1, 1, 5, 5, 0, 360, (170, 236, 220)); p.p(2, 2, WHITE)
        else:
            p.arc(1, 2, 5, 5, 0, 360, (170, 236, 220)); p.p(2, 3, WHITE)
        fr.append(p.im)
    save(cells(fr, 7, 7), G_OUT + 'part_bubble2.png', 2)
    fr = []                                                                    # a parrot feather (2 frames 8x8)
    for k in range(2):
        p = Pic(8, 8)
        if k == 0:
            feather(p, 1, 6, -0.75, 7, 1.6, (PAR[0], PAR[1], PAR[2], RED[2]))
        else:
            feather(p, 1, 4, 0.0, 7, 1.4, (RED[0], RED[1], RED[2], PAR[2]))
        fr.append(p.im)
    save(cells(fr, 8, 8), G_OUT + 'part_feather2.png', 2)


@builder('icons')
def make_icons():
    p = Pic(8, 8)                                                              # HUD: corroded by acid (a drop with bubbles)
    p.bitmap(0, 0, ["...#....", "..###..#", "..###...", ".#####..", ".#####.#", ".#####..", "..###...", "........"], {'#': WHITE})
    save(p.im, G_OUT + 'icon_acid.png')
    p = Pic(8, 8)                                                              # HUD: turned to gold (a little figure in a ring)
    p.bitmap(0, 0, ["..###...", ".#.#.#..", "#..#..#.", "#.###.#.", "#..#..#.", "#.#.#.#.", ".#...#..", "..###..."], {'#': WHITE})
    save(p.im, G_OUT + 'icon_gold2.png')

    def cannon_(d, k):     # a ship's cannon on its carriage, firing a ball with a puff
        S = lambda *v: [x * k for x in v]
        d.polygon(S(8, 40, 62, 34, 66, 36, 66, 54, 62, 56, 8, 52), fill=255)      # barrel
        d.ellipse(S(2, 38, 20, 56), fill=255)
        d.rectangle(S(64, 32, 72, 58), fill=255)
        d.polygon(S(14, 58, 58, 58, 62, 76, 10, 76), fill=255)                  # carriage
        for x in (22, 50):
            d.ellipse(S(x - 9, 70, x + 9, 88), fill=255)
            d.ellipse(S(x - 3, 76, x + 3, 82), fill=0)
        d.line(S(30, 47, 56, 46), fill=0, width=3 * k)
        for x, y, r in ((82, 40, 8), (90, 28, 6), (78, 26, 5)):
            d.ellipse(S(x - r, y - r, x + r, y + r), fill=255)
        d.ellipse(S(82, 6, 94, 18), fill=255)
    save(P3.icon(cannon_), T_OUT + 'icon_cannon.png')


# ================================================================== CONTACT SHEET AND CHECKS
NEW_WEAPONS = ('chaincannon', 'acidsprayer')


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
        elif name.startswith(('enemies', 'boss')) or path.startswith(W_OUT) or path.startswith(T_OUT):
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


# ================================================================== MAIN
if __name__ == '__main__':
    want = sys.argv[1:]
    for name, fn in BUILDERS.items():
        if not want or name in want:
            fn()
    check_outputs()
    bbox_report()
    make_sheet()
    print('klart')
