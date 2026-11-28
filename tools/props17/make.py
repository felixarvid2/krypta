#!/usr/bin/env python3
"""Version 20 graphics for Krypta ("Kloakerna och Öknen"): the sewers and the desert, eight new enemies, the rat king and
the sphinx, textures, props, items, particles and HUD icons.

Run from anywhere (the paths are taken from this file's place in the repo):
    python3 tools/props17/make.py [name ...]
(with names only those builders run, e.g. `python3 tools/props17/make.py alligator sheet`; the contact sheet always shows
everything this script has written so far, plus the two new first-person weapons)

The first-person weapons scimitar / trapthrower (fp_*.png, js/weapons.js) come from tools/weapon-frames (render-static.mjs
+ pack.py, see the README there, version 20); their static-defs.json entries are built by tools/props17/fp_defs.py.

Out to assets/gfx (all enemy cells 64x64, feet row 57, facing right; frames idle 4, movement 6, attack 6, take_damage 3,
death 6; every death ends lying / settled on the floor, flyers included):
  enemies-alligator_*    a long low alligator (about 58 px long, 14 px high) with a ridged olive back, a pale belly and
                         a yellow eye; attack = the jaws snap open and shut; death rolls it over belly up
  enemies-sludgeman_*    a slouching man-shaped heap of green-brown sewer sludge, dripping, with two pale eyes; attack =
                         he scoops a sludge clump and lobs it; death melts him into a puddle
  enemies-plumber_*      a plumber zombie - grey-green skin, a red cap, blue overalls, rubber boots and a big pipe wrench;
                         attack = the overhead wrench blow
  enemies-leech_*        a small black-violet leech (about 18 px long) with ringed segments and a red sucker; attack =
                         it rears up and lunges with the round toothed mouth; death shrivels it flat
  enemies-scorpion_*     a desert scorpion (about 34 px long) in amber and brown with pincers and a stinger curled over its
                         back; attack = the tail strikes forward; death flips it on its back
  enemies-nomad_*        a desert nomad in an indigo robe with a sand-coloured sash and a veiled head cloth, with a
                         curved scimitar; attack = the slash
  enemies-sandwraith_*   a flying whirl of sand (about 30 px funnel, drawn low - the game lifts flyers) with two glowing
                         eyes in the swirl; attack = it widens and lashes; death collapses into a sand heap
  enemies-vulture_*      a vulture (about 34 px with spread wings, drawn low) with a bald pink head and a ruff; attack =
                         the dive with talons forward; death lies on the floor with spread wings
  boss_ratking_{idle,attack,cast,hurt,death}.png, boss_sphinx_{...}.png (116x116 cells, feet row 115; idle 5, attack 6,
      cast 6, hurt 3, death 7; attack and cast loop while the state lasts, so they start and end in similar poses).
      The rat king (a giant knot of rats grown together, their tails tangled below, a big central rat head with red eyes
      and a crooked gold crown): attack = the bite and a spray of sludge, cast = the mouth opens wide and rats pour out
      over the floor; death = the knot falls apart into dead rats and the crown rolls away.
      The sphinx (a giant sandstone sphinx lying down: lion body, a human face under a striped blue and gold head cloth):
      attack = it rears up on its hind legs and strikes with a front paw, cast = the eyes light up and shoot two rays;
      death cracks it and it crumbles into a heap of sandstone blocks with the head.
  prop_sluicewheel.png (2: closed / open), prop_sluice.png (2: closed = a grate, open = empty), prop_ratnest.png (2: whole
  / broken), prop_cactus.png (1), prop_amphora.png (2: whole / broken), prop_brazier2.png (2, the fire flickers),
  prop_beartrap.png (2: open / snapped shut - the trap on the floor), item_trapbox.png, pick_scimitar.png,
  pick_trapthrower.png, part_sludge.png (2, 8x8), part_sand2.png (2, 8x8), part_steam2.png (2, 10x10),
  icon_sludge.png, icon_leech.png (8x8, white)
Out to assets/wall:
  wall_sewerbrick, wall_pipes, wall_boss_ratking, wall_dune, wall_mesa, wall_boss_sphinx (64x128)
  floor_sewer, floor_grate, floor_boss_ratking, floor_desertsand, floor_ruintile, floor_boss_sphinx, floor_sludge,
  floor_spray (a grate with a steam pipe vent), floor_oasis, floor_mirage (the same picture as floor_oasis) (64x64); all
  palettized, mean brightness checked to stay in 40-115 (the desert sand kept at 90-105 so it never glares)
Contact sheet: <scratchpad>/en/v20_sheet.png, seam check <scratchpad>/en/v20_tiles.png

Sources: everything is drawn procedurally below in the outlined style of tools/props2-props16, whose drawing helpers are
reused (no outside image is used).
Suggested sizes (skeleton = 1.0; apparent height = size x figure px / cell px; bbox_report() prints the idle boxes):
alligator 1.1 (16 px high, 58 long - low and long), sludgeman 1.05 (43 px), plumber 1.0 (42 px with the cap), leech 0.45
(9 px high, 23 long - small), scorpion 0.8 (32 px with the raised tail, 48 long), nomad 1.0 (43 px), sandwraith 0.9 (38 px
funnel, float), vulture 0.8 (34 px with wings, float); bosses (116 px cells): ratking 4.0 (87 px with the crown, 101 wide),
sphinx 4.4 (79 px lying, 110 long - it rears to about 100 px in the attack).
Name clashes: none of the new names existed (part_sand / part_steam exist, the new ones are part_sand2 / part_steam2 as the
contract says; floor_sand, wall_sandstone and floor_quicksand exist and are not touched).
"""
import importlib.util
import json
import math
import os
import random
import re
import sys

sys.dont_write_bytecode = True          # the helper modules of props2-props16 are loaded without writing __pycache__

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))


def _load(name, rel):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, '..', rel, 'make.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


P16 = _load('props16make', 'props16')          # loads props2-props15 itself; only pure drawing helpers are used
P15 = P16.P15
P14 = P15.P14
P13, P12, P2, P5, P6, P7, P8, P10 = P14.P13, P14.P12, P14.P2, P14.P5, P14.P6, P14.P7, P14.P8, P14.P10
from_p2 = 'OUT Pic outline outline_same hard shift gmap blend tint shear squash strip'.split()
globals().update({k: getattr(P2, k) for k in from_p2})
cut_below, pool = P12.cut_below, P12.pool
pnoise, spark = P5.pnoise, P5.spark
dark, flash, tube, bez = P6.dark, P6.flash, P6.tube, P6.bez
puff = P7.puff
flame, halo, put = P10.flame, P10.halo, P10.put
dust, wrap_pic, poly_r = P13.dust, P13.wrap_pic, P13.poly_r
ell, shade_ball, on, cells = P14.ell, P14.shade_ball, P14.on, P14.cells
rig, fall, pt, stops, stone_rgb = P15.rig, P15.fall, P15.pt, P15.stops, P15.stone_rgb
x2, plank_v, plank_h = P16.x2, P16.plank_v, P16.plank_h
I0, I1, I2, I3 = P2.I0, P2.I1, P2.I2, P2.I3
F0, F1, F2, F3 = P2.F0, P2.F1, P2.F2, P2.F3
AU0, AU1, AU2, AU3, AU4 = P5.AU0, P5.AU1, P5.AU2, P5.AU3, P5.AU4                # gold
BR0, BR1, BR2, BR3, BR4 = P7.BR0, P7.BR1, P7.BR2, P7.BR3, P7.BR4                # brass / bronze
WD0, WD1, WD2, WD3, WD4 = P10.WD0, P10.WD1, P10.WD2, P10.WD3, P10.WD4           # dark wood
SKIN, BLK = P15.SKIN, P15.BLK

G_OUT, W_OUT = ROOT + '/assets/gfx/', ROOT + '/assets/wall/'
SCR = '/tmp/claude-0/-home-user/80ee56ba-2fa6-5354-b261-a4ca4fdcb508/scratchpad/en/'
SHEET, MANIFEST = SCR + 'v20_sheet.png', SCR + 'v20_manifest.json'
WHITE = (255, 255, 255)
FW, FEET = 64, 57                                       # enemy cells
BS, BS_FEET = 116, 115                                  # boss cells
TAU = math.tau

# ---------------------------------------------------------------- sewer palettes
SBR = ((28, 20, 18), (54, 36, 30), (80, 54, 42), (106, 74, 56), (134, 98, 76))           # sewer brick, soot-dark
SST = ((26, 28, 28), (46, 50, 48), (68, 72, 66), (92, 96, 86), (120, 124, 110))           # wet grey-green stone
SLG = ((26, 30, 12), (48, 56, 20), (78, 88, 32), (112, 122, 50), (156, 166, 84))          # sludge
SLIME = ((40, 70, 20), (80, 124, 34), (130, 176, 60), (190, 220, 110))                    # bright slime highlights
RUST = ((50, 26, 16), (92, 48, 24), (136, 76, 36), (178, 112, 60))                         # rusty iron
WAT = ((10, 16, 16), (18, 30, 30), (28, 46, 44), (44, 66, 60))                            # dark sewer water
OVR = ((22, 34, 66), (36, 54, 100), (56, 80, 138), (90, 114, 170))                        # overalls
ZSK = ((70, 84, 64), (104, 120, 92), (140, 156, 122), (176, 190, 156))                    # zombie skin
GATOR = ((22, 30, 14), (44, 58, 26), (70, 88, 40), (100, 118, 60), (140, 156, 90))
BELLY = ((120, 116, 78), (166, 160, 110), (204, 198, 150))
LEECH = ((18, 12, 22), (38, 26, 46), (62, 44, 74), (96, 72, 110))
RAT = ((34, 28, 26), (62, 52, 46), (92, 78, 68), (124, 108, 94), (160, 144, 128))
PINK = ((120, 60, 64), (176, 104, 104), (220, 150, 146), (250, 200, 196))
# ---------------------------------------------------------------- desert palettes
SAND = ((70, 52, 32), (98, 76, 48), (122, 96, 62), (146, 118, 80), (172, 144, 104))       # dim desert sand (lum ~ 100)
SDS = ((60, 42, 28), (92, 66, 42), (120, 92, 60), (146, 116, 80), (174, 144, 104))        # sandstone
MESA = ((54, 26, 18), (88, 44, 28), (122, 66, 40), (152, 92, 58), (180, 122, 82))         # red mesa rock
CACT = ((20, 44, 22), (36, 72, 34), (58, 102, 48), (92, 136, 70))
OAS = ((16, 50, 58), (26, 82, 90), (42, 118, 120), (80, 160, 160), (170, 220, 214))       # oasis water
INDIGO = ((20, 20, 48), (34, 36, 80), (54, 58, 116), (84, 90, 150))
CLOTH = ((96, 80, 56), (140, 120, 86), (180, 160, 120), (214, 198, 160))
AMBER = ((60, 30, 10), (110, 62, 20), (164, 104, 36), (210, 156, 70))
VUL = ((24, 18, 16), (44, 34, 30), (68, 54, 46), (98, 82, 70))
NEMES_B = ((20, 34, 80), (34, 60, 130), (60, 96, 176))
EYE = ((255, 170, 40), (255, 220, 110), (255, 250, 210))

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


def save_prop(name, frames, w=None, h=None):
    """A prop strip; with w, h the frames are cells of that size (so an empty frame keeps its width)."""
    im = cells(frames, w, h) if w else strip(frames)
    return save(im, G_OUT + f'prop_{name}.png', len(frames))


def finish(rgb, name, colors=48, half=True):
    """RGB array -> (nearest x2 upscale of a half-res texture) -> palettized, through the guarded save()."""
    im = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), 'RGB')
    if half:
        im = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
    return save(im.quantize(colors, method=Image.Quantize.MEDIANCUT).convert('RGB'), W_OUT + name)


BUILDERS = {}


def builder(name):
    def deco(fn):
        BUILDERS[name] = fn
        return fn
    return deco


def lum_of(rgb):
    return float((np.asarray(rgb, float)[..., :3] @ np.array([0.299, 0.587, 0.114])).mean())


# ================================================================== SEWER TEXTURES
def brick_rgb(w, h, seed, pal=SBR, slime=0.25):
    """Soot-dark sewer brick (tiles both ways): staggered bricks 8x4 (half-res), dark mortar, slime creeping in the
    joints."""
    yy, xx = np.mgrid[0:h, 0:w]
    bw, bh = 8, 4
    row = yy // bh
    off = (row % 2) * (bw // 2)
    bx, by = (xx + off) % bw, yy % bh
    r2 = random.Random(seed)
    shade = np.array([[r2.uniform(-0.12, 0.12) for _ in range(w // bw + 2)] for _ in range(h // bh + 1)])
    nz = pnoise(w, h, seed, ((8, 1.0), (4, 0.5), (2, 0.3)))
    lum = np.clip(0.42 + shade[row, (xx + off) // bw % shade.shape[1]] + (nz - 0.5) * 0.35, 0, 1)
    lum = np.where(by == 1, lum + 0.12, lum)
    lum = np.where(by == bh - 1, lum - 0.1, lum)
    rgb = gmap(lum, stops(pal))
    joint = (bx == 0) | (by == 0)
    rgb[joint] = pal[0]
    mz = pnoise(w, h, seed + 5, ((16, 1.0), (4, 0.5)))
    mm = (mz > 1 - slime) & (joint | (mz > 1 - slime * 0.4))
    rgb[mm] = gmap(np.clip(mz[mm] * 0.8, 0, 1), stops(SLG))
    return rgb


def wet_base(rgb, y0, seed):
    """Slime tide line and drips from row y0 down (half-res array)."""
    h, w = rgb.shape[:2]
    nz = pnoise(w, h, seed, ((8, 1.0), (4, 0.5)))
    for y in range(y0, h):
        k = min(1.0, (y - y0 + 1) / 4)
        rgb[y] = rgb[y] * (1 - 0.6 * k) + gmap(np.clip(0.2 + nz[y] * 0.6, 0, 1), stops(SLG)) * 0.6 * k
    rgb[y0] = SLIME[1]
    r2 = random.Random(seed + 1)
    for _ in range(6):
        x = r2.randrange(w)
        L = r2.randint(3, 10)
        rgb[y0 - L:y0, x] = rgb[y0 - L:y0, x] * 0.4 + np.array(SLG[2]) * 0.6
        rgb[y0 - L, x] = SLIME[2]


def tex_wall_sewerbrick():
    """The vaulted sewer tunnel: soot-dark brick, a curved arch rib of headers at the top (the vault springs from the tile
    edges), green slime in the joints, a slime tide line and drips near the floor."""
    w, h = 32, 64
    rgb = brick_rgb(w, h, 2001)
    yy, xx = np.mgrid[0:h, 0:w]
    arch = 4 + ((xx - 15.5) / 16) ** 2 * 10                                  # the arch rib (headers set on edge)
    rib = (yy > arch) & (yy < arch + 4)
    rgb[rib] = gmap(np.clip(0.55 + (pnoise(w, h, 2002, ((4, 1.0),))[rib] - 0.5) * 0.4, 0, 1), stops(SBR))
    rgb[rib & (xx % 3 == 0)] = SBR[0]
    edge = (np.abs(yy - arch) < 0.6) | (np.abs(yy - arch - 4) < 0.6)
    rgb[edge] = SBR[0]
    rgb[(yy < arch) & (yy >= 0)] = rgb[(yy < arch) & (yy >= 0)] * 0.55
    wet_base(rgb, 52, 2003)
    finish(rgb, 'wall_sewerbrick.png', 40)


def pipe_h(rgb, y, r, pal=RUST, x0=0, x1=None):
    x1 = rgb.shape[1] if x1 is None else x1
    for dy in range(-r, r + 1):
        t = (dy + r) / (2 * r)
        c = pal[3] if t < 0.25 else pal[2] if t < 0.55 else pal[1] if t < 0.85 else pal[0]
        rgb[y + dy, x0:x1] = c
    rgb[y - r, x0:x1] = pal[0]; rgb[y + r, x0:x1] = pal[0]


def pipe_v(rgb, x, r, y0, y1, pal=RUST):
    for dx in range(-r, r + 1):
        t = (dx + r) / (2 * r)
        c = pal[3] if t < 0.25 else pal[2] if t < 0.55 else pal[1] if t < 0.85 else pal[0]
        rgb[y0:y1, x + dx] = c
    rgb[y0:y1, x - r] = pal[0]; rgb[y0:y1, x + r] = pal[0]


def tex_wall_pipes():
    """A pipe wall: the sewer brick behind two big rusty pipes running along (they carry on into the next tile), a
    thinner vertical pipe with flanges, a valve wheel and a green leak running down."""
    w, h = 32, 64
    rgb = brick_rgb(w, h, 2011, slime=0.18)
    pipe_v(rgb, 22, 2, 0, 64, (I0, I1, I2, I3))
    for y in (8, 40):
        rgb[y:y + 2, 19:26] = I3; rgb[y + 2, 19:26] = I0
    pipe_h(rgb, 18, 4)
    pipe_h(rgb, 31, 3, (RUST[0], RUST[1], RUST[2], RUST[3]))
    for x in (6, 14, 30):
        rgb[13:24, x] = RUST[0]; rgb[14:23, x + 1] = RUST[3]
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.hypot(xx - 9, yy - 45)
    rgb[(d > 3.2) & (d < 4.6)] = (150, 30, 24)                                # the red valve wheel
    rgb[(d < 1.2)] = I2
    rgb[(np.abs(xx - 9) < 0.6) & (d < 4)] = (120, 24, 20); rgb[(np.abs(yy - 45) < 0.6) & (d < 4)] = (120, 24, 20)
    rgb[46:60, 9] = I1
    for y in range(22, 60):                                                   # a leak from the big pipe
        x = 12 + (y % 5 == 0)
        rgb[y, x] = rgb[y, x] * 0.3 + np.array(SLIME[1]) * 0.7
    wet_base(rgb, 56, 2013)
    finish(rgb, 'wall_pipes.png', 40)


def tex_wall_boss_ratking():
    """The rat king's wall: the sewer brick round a big round culvert with a rusted grate - red rat eyes glint in the dark
    behind it - and a crude gold crown daubed above it, with rat skulls set into the brick."""
    w, h = 64, 128
    rgb = x2(brick_rgb(32, 64, 2021, slime=0.3))
    p = Pic(w, h)
    cx, cy, R = 31.5, 70, 24
    p.e(cx - R - 4, cy - R - 4, cx + R + 4, cy + R + 4, SBR[3]); p.e(cx - R - 2, cy - R - 2, cx + R + 2, cy + R + 2, SBR[1])
    p.e(cx - R, cy - R, cx + R, cy + R, (8, 8, 8))
    r2 = random.Random(2022)
    for _ in range(7):
        x, y = cx + r2.uniform(-18, 18), cy + r2.uniform(-12, 16)
        p.p(x, y, (220, 40, 30)); p.p(x + 3, y, (220, 40, 30))
    for j in range(-3, 4):
        x = cx + j * 6.5
        hh = math.sqrt(max(0, R * R - (j * 6.5) ** 2))
        p.l(x, cy - hh, x, cy + hh, RUST[1], 2); p.l(x - 1, cy - hh, x - 1, cy + hh, RUST[3])
    p.l(cx - R, cy, cx + R, cy, RUST[1], 2)
    for j in range(12):
        a = j / 12 * TAU
        p.p(cx + math.cos(a) * (R + 3), cy + math.sin(a) * (R + 3), SBR[0])
    crown = [(18, 34), (18, 20), (25, 28), (31.5, 16), (38, 28), (45, 20), (45, 34)]
    p.poly(crown, AU1); p.poly([(20, 32), (20, 24), (25, 30), (31.5, 20), (38, 30), (43, 24), (43, 32)], AU2)
    for x in (18, 31.5, 45):
        p.p(x, crown[1][1] if x == 18 else 16 if x == 31.5 else 20, AU4)
    p.p(31.5, 28, (200, 30, 30)); p.p(24, 31, (40, 90, 200)); p.p(39, 31, (40, 90, 200))
    for x, y in ((8, 108), (54, 104), (6, 40)):
        p.e(x - 3, y - 2, x + 3, y + 3, (200, 190, 170)); p.p(x - 1, y, BLK[0]); p.p(x + 1, y, BLK[0]); p.l(x + 2, y + 2, x + 5, y + 2, (200, 190, 170))
    put(rgb, outline_same(p.im))
    sm = rgb[::2, ::2].copy()
    wet_base(sm, 112 // 2, 2023)
    rgb[112:] = x2(sm)[112:]
    finish(rgb, 'wall_boss_ratking.png', 64, half=False)


def flag_rgb(seed, pal=SST, wet=0.25):
    """Wet sewer flagstones (32x32 half-res, tiles both ways): irregular slabs with dark joints and puddle sheen."""
    w = h = 32
    rgb = stone_rgb(w, h, seed, 16, 10, 0.0, pal)
    nz = pnoise(w, h, seed + 3, ((16, 1.0), (8, 0.5)))
    m = nz > 1 - wet
    rgb[m] = rgb[m] * 0.6 + np.array(WAT[3]) * 0.4
    rgb[m & (nz > 1 - wet * 0.35)] = WAT[3]
    sl = pnoise(w, h, seed + 4, ((8, 1.0),)) > 0.78
    rgb[sl] = rgb[sl] * 0.5 + np.array(SLG[2]) * 0.5
    return rgb


def tex_floor_sewer():
    finish(flag_rgb(2031), 'floor_sewer.png', 32)


def grate_rgb(seed=2041, bars=8):
    """An iron grate over dark water (64x64, tiles): crossing flat bars with highlights, water glints underneath."""
    nz = pnoise(64, 64, seed, ((16, 1.0), (8, 0.5)))
    rgb = gmap(np.clip(nz * 0.8, 0, 1), stops(WAT))
    r2 = random.Random(seed)
    for _ in range(14):
        x, y = r2.randrange(64), r2.randrange(64)
        rgb[y, x:x + 2] = WAT[3] + np.array((20, 30, 26))
    yy, xx = np.mgrid[0:64, 0:64]
    s = 64 // bars
    barx = (xx % s) < 3
    bary = (yy % s) < 3
    rgb[bary] = I1; rgb[bary & ((yy % s) == 0)] = I2; rgb[bary & ((yy % s) == 2)] = I0
    rgb[barx] = I1; rgb[barx & ((xx % s) == 0)] = I2; rgb[barx & ((xx % s) == 2)] = I0
    rgb[barx & bary & ((xx % s) == 1) & ((yy % s) == 1)] = I3
    rust = (pnoise(64, 64, seed + 2, ((8, 1.0), (4, 0.5))) > 0.65) & (barx | bary)
    rgb[rust] = rgb[rust] * 0.4 + np.array(RUST[2]) * 0.6
    return rgb


def tex_floor_grate():
    finish(grate_rgb(), 'floor_grate.png', 40, half=False)


def tex_floor_boss_ratking():
    """The centre of the rat king's lair: flagstones round a big round drain grate, gnawed bones and a crown scratched in."""
    rgb = x2(flag_rgb(2051, wet=0.3))
    p = Pic(64, 64)
    p.e(10, 10, 53, 53, SST[0]); p.e(12, 12, 51, 51, RUST[1]); p.e(15, 15, 48, 48, WAT[0])
    for j in range(-2, 3):
        x = 31.5 + j * 6
        hh = math.sqrt(max(0, 16.5 ** 2 - (j * 6) ** 2))
        p.l(x, 31.5 - hh, x, 31.5 + hh, I1, 2); p.l(x - 1, 31.5 - hh, x - 1, 31.5 + hh, I2)
    p.l(15, 31.5, 48, 31.5, I1, 2)
    for x, y, a in ((6, 8, 0.4), (55, 52, 2.0), (52, 6, 1.2), (8, 56, -0.5)):
        u = (math.cos(a) * 4, math.sin(a) * 4)
        p.l(x - u[0], y - u[1], x + u[0], y + u[1], (196, 186, 160), 2)
        p.p(x - u[0], y - u[1], (230, 222, 200)); p.p(x + u[0], y + u[1], (230, 222, 200))
    put(rgb, outline_same(p.im))
    finish(rgb, 'floor_boss_ratking.png', 48, half=False)


def sludge_rgb(seed=2061):
    """Sewer sludge (64x64, tiles): green-brown muck with swirls, scum patches and a few bubbles."""
    nz = pnoise(64, 64, seed, ((32, 1.0), (16, 0.6), (8, 0.3)))
    sw = np.sin(nz * 16) * 0.5 + 0.5
    lum = np.clip(0.25 + nz * 0.35 + sw * 0.2, 0, 1)
    rgb = gmap(lum, stops(SLG))
    def bub(p, ox, oy):
        r2 = random.Random(seed + 1)
        for _ in range(8):
            x, y, r = r2.uniform(0, 64) + ox, r2.uniform(0, 64) + oy, r2.choice((1.5, 2, 3))
            p.e(x - r, y - r, x + r, y + r, SLG[1]); p.e(x - r + 0.7, y - r + 0.7, x + r - 0.7, y + r - 0.7, SLG[3]); p.p(x - r + 1, y - r + 1, SLIME[3])
    put(rgb, wrap_pic(64, 64, bub))
    return rgb


def tex_floor_sludge():
    finish(sludge_rgb(), 'floor_sludge.png', 40, half=False)


def tex_floor_spray():
    """A steam vent: the iron grate with a heavy round pipe mouth in the middle (a bronze flange with bolts), its dark
    throat and white wisps of steam curling out."""
    rgb = grate_rgb(2071)
    p = Pic(64, 64)
    p.e(17, 17, 46, 46, BR0); p.e(19, 19, 44, 44, BR2); p.e(20, 20, 43, 43, BR1)
    for j in range(8):
        a = j / 8 * TAU
        p.p(31.5 + math.cos(a) * 10.5, 31.5 + math.sin(a) * 10.5, BR4)
    p.e(24, 24, 39, 39, I0); p.e(26, 26, 37, 37, (6, 6, 6))
    p.arc(19, 19, 44, 44, 200, 300, BR3)
    im = outline_same(p.im)
    q = Pic(64, 64)
    for j, (x, y, r) in enumerate(((31, 30, 5), (27, 26, 3), (36, 27, 3.5), (33, 23, 2.5))):
        q.e(x - r, y - r, x + r, y + r, (170, 176, 176)); q.e(x - r + 1, y - r + 1, x + r - 1, y + r - 1, (210, 214, 212))
    put(rgb, on(im, q.im))
    finish(rgb, 'floor_spray.png', 40, half=False)


# ================================================================== DESERT TEXTURES
def sand_rgb(seed=2101, k=1.0):
    """Wind-rippled desert sand (32x32 half-res, tiles both ways): soft ripples running across, grains, a dimmed palette."""
    w = h = 32
    yy, xx = np.mgrid[0:h, 0:w]
    nz = pnoise(w, h, seed, ((16, 1.0), (8, 0.5), (4, 0.3)))
    rip = np.sin((yy + np.sin(xx / w * TAU) * 2 + nz * 4) / h * TAU * 5) * 0.5 + 0.5
    lum = np.clip((0.3 + nz * 0.35 + rip * 0.18) * k, 0, 1)
    rgb = gmap(lum, stops(SAND))
    r2 = random.Random(seed + 1)
    for _ in range(30):
        x, y = r2.randrange(w), r2.randrange(h)
        rgb[y, x] = SAND[r2.choice((0, 3))]
    return rgb


def tex_floor_desertsand():
    finish(sand_rgb(), 'floor_desertsand.png', 32)


def sandstone_rgb(w, h, seed, bw=16, bh=8, k=1.0):
    rgb = stone_rgb(w, h, seed, bw, bh, 0.0, SDS)
    return rgb * k


def tex_wall_dune():
    """Ruined sandstone: big worn blocks, a cracked and missing corner, wind-scoured hollows, and a drift of sand piled
    up along the foot of the wall (the drift's crest waves across, so it carries on into the next tile)."""
    w, h = 32, 64
    rgb = sandstone_rgb(w, h, 2111, 16, 10)
    nz = pnoise(w, h, 2112, ((8, 1.0), (4, 0.5)))
    pit = nz > 0.72
    rgb[pit] = rgb[pit] * 0.7
    rgb[18:20, 4:9] = SDS[0]; rgb[20:24, 7] = SDS[0]
    yy, xx = np.mgrid[0:h, 0:w]
    crest = 46 + np.sin(xx / w * TAU) * 3 + np.sin(xx / w * TAU * 2 + 1) * 1.5
    s = sand_rgb(2113)
    sd = np.vstack([s, s])[:h]
    m = yy > crest
    rgb[m] = sd[m]
    rgb[np.abs(yy - crest) < 0.8] = SAND[4]
    finish(rgb, 'wall_dune.png', 40)


def tex_wall_mesa():
    """A red mesa cliff: horizontal strata in rust, ochre and dark red, cracks, ledges with sand on them, and a small
    saguaro cactus standing in front at the foot."""
    w, h = 32, 64
    yy, xx = np.mgrid[0:h, 0:w]
    nz = pnoise(w, h, 2121, ((16, 1.0), (8, 0.5), (4, 0.3)))
    band = np.sin((yy + nz * 6) / h * TAU * 6) * 0.5 + 0.5
    lum = np.clip(0.25 + band * 0.4 + (nz - 0.5) * 0.3, 0, 1)
    rgb = gmap(lum, stops(MESA))
    for y in (14, 33, 50):
        ly = (y + (np.sin(xx / w * TAU) * 1.5)).astype(int)
        rgb[ly, xx[0]] = MESA[0]
        rgb[ly - 1, xx[0]] = SAND[3]
    cr = np.abs(pnoise(w, h, 2122, ((8, 1.0),)) - 0.5) < 0.025
    rgb[cr & (yy % 2 == 0)] = MESA[0]
    p = Pic(w, h)
    p.r(19, 40, 22, 63, CACT[2]); p.l(19, 40, 19, 63, CACT[3])
    p.r(14, 46, 16, 54, CACT[2]); p.r(14, 53, 19, 55, CACT[2])
    p.r(25, 44, 27, 50, CACT[2]); p.r(22, 50, 27, 52, CACT[2])
    for y in range(42, 63, 3):
        p.p(21, y, CACT[0])
    put(rgb, outline_same(p.im, CACT[0]))
    rgb[60:] = rgb[60:] * 0.5 + np.array(SAND[2]) * 0.5
    finish(rgb, 'wall_mesa.png', 40)


def tex_wall_boss_sphinx():
    """The sphinx's wall: sandstone blocks carved with a frieze - a great eye in gold and lapis in the middle, rows of
    small glyphs above and below, and a sun disc with wings at the top."""
    w, h = 64, 128
    rgb = x2(sandstone_rgb(32, 64, 2131, 16, 10, 0.95))
    p = Pic(w, h)
    p.r(4, 44, 59, 84, SDS[1]); p.r(5, 45, 58, 83, SDS[2])
    p.e(14, 55, 50, 73, SDS[0]); p.e(16, 57, 48, 71, (210, 196, 160))
    p.e(26, 57, 38, 71, NEMES_B[1]); p.e(28, 59, 36, 69, BLK[0]); p.p(30, 60, WHITE)
    p.arc(10, 50, 54, 64, 200, 340, AU2, 2)
    p.l(16, 72, 12, 82, NEMES_B[1], 2); p.l(36, 72, 42, 80, NEMES_B[1], 2); p.arc(36, 74, 46, 82, 0, 180, NEMES_B[1], 2)
    r2 = random.Random(2132)
    for row in (32, 92, 104):
        for x in range(6, 58, 8):
            g = r2.randrange(4)
            if g == 0:
                p.e(x, row, x + 4, row + 4, SDS[0])
            elif g == 1:
                p.l(x + 2, row, x + 2, row + 6, SDS[0]); p.l(x, row + 2, x + 4, row + 2, SDS[0])
            elif g == 2:
                p.poly([(x, row + 6), (x + 2, row), (x + 4, row + 6)], SDS[0])
            else:
                p.arc(x, row, x + 5, row + 6, 180, 360, SDS[0]); p.l(x + 2, row + 3, x + 2, row + 6, SDS[0])
    p.e(26, 8, 38, 20, AU1); p.e(28, 10, 36, 18, AU3)
    for s in (-1, 1):
        for j in range(4):
            x0 = 31.5 + s * (8 + j * 5)
            p.poly([(x0, 12 + j), (x0 + s * 6, 10 + j * 1.5), (x0 + s * 6, 16 + j), (x0, 18)], (AU2 if j % 2 else NEMES_B[1]))
    put(rgb, outline_same(p.im, SDS[0]))
    finish(rgb, 'wall_boss_sphinx.png', 64, half=False)


def tile_rgb(seed=2141, pal=SDS):
    """Worn sandstone floor tiles (32x32 half-res, tiles): 16x16 slabs, chipped corners, sand drifted into the joints."""
    w = h = 32
    rgb = stone_rgb(w, h, seed, 16, 16, 0.0, pal)
    yy, xx = np.mgrid[0:h, 0:w]
    nz = pnoise(w, h, seed + 1, ((8, 1.0), (4, 0.5)))
    j = ((xx % 16) <= 1) | ((yy % 16) <= 1)
    m = j & (nz > 0.4)
    rgb[m] = SAND[2]
    drift = nz > 0.68
    rgb[drift] = rgb[drift] * 0.4 + np.array(SAND[3]) * 0.6
    return rgb


def tex_floor_ruintile():
    finish(tile_rgb(), 'floor_ruintile.png', 32)


def tex_floor_boss_sphinx():
    """The centre of the sphinx's court: the sandstone tiles with an inlaid sun disc - a gold ring with rays and a lapis
    centre - half covered by drifting sand."""
    rgb = x2(tile_rgb(2151))
    p = Pic(64, 64)
    for j in range(16):
        a = j / 16 * TAU
        p.l(31.5 + math.cos(a) * 15, 31.5 + math.sin(a) * 15, 31.5 + math.cos(a) * (24 if j % 2 else 20), 31.5 + math.sin(a) * (24 if j % 2 else 20), AU2, 2)
    p.e(15, 15, 48, 48, AU1); p.e(17, 17, 46, 46, AU2); p.e(21, 21, 42, 42, NEMES_B[1]); p.e(25, 25, 38, 38, NEMES_B[2])
    p.e(28, 28, 35, 35, AU3)
    im = outline_same(p.im, SDS[0])
    put(rgb, im)
    nz = pnoise(64, 64, 2152, ((16, 1.0), (8, 0.5)))
    m = nz > 0.62
    s = x2(sand_rgb(2153))
    rgb[m] = s[m]
    finish(rgb, 'floor_boss_sphinx.png', 48, half=False)


def oasis_rgb(seed=2161):
    """Shallow clear oasis water (64x64, tiles): the rippled sand bottom showing through teal water, caustic light lines
    and a few lily pads."""
    s = x2(sand_rgb(seed + 1, 0.9))
    nz = pnoise(64, 64, seed, ((32, 1.0), (16, 0.6), (8, 0.3)))
    water = gmap(np.clip(0.3 + nz * 0.4, 0, 1), stops(OAS))
    rgb = s * 0.35 + water * 0.65
    c = pnoise(64, 64, seed + 2, ((16, 1.0), (8, 0.5)))
    caus = np.abs(np.sin(c * 22)) < 0.12
    rgb[caus] = rgb[caus] * 0.5 + np.array(OAS[4]) * 0.5
    def pads(p, ox, oy):
        r2 = random.Random(seed + 3)
        for _ in range(3):
            x, y = r2.uniform(0, 64) + ox, r2.uniform(0, 64) + oy
            p.e(x - 4, y - 3, x + 4, y + 3, CACT[1]); p.e(x - 3, y - 2, x + 3, y + 2, CACT[2]); p.l(x, y, x + 4, y - 1, OAS[1])
    put(rgb, wrap_pic(64, 64, pads))
    return rgb


def tex_floor_oasis():
    im = finish(oasis_rgb(), 'floor_oasis.png', 40, half=False)
    save(im.copy(), W_OUT + 'floor_mirage.png')               # the mirage looks just like the oasis (the game swaps to sand up close)


@builder('textures')
def make_textures():
    for fn in (tex_wall_sewerbrick, tex_wall_pipes, tex_wall_boss_ratking, tex_wall_dune, tex_wall_mesa, tex_wall_boss_sphinx,
               tex_floor_sewer, tex_floor_grate, tex_floor_boss_ratking, tex_floor_sludge, tex_floor_spray,
               tex_floor_desertsand, tex_floor_ruintile, tex_floor_boss_sphinx, tex_floor_oasis):
        fn()


# ================================================================== SHARED BITS
def flipv(im, floor=FEET):
    """Death helper: the figure rolled over (upside down), set back down on the floor row."""
    b = im.getbbox()
    f = im.transpose(Image.FLIP_TOP_BOTTOM)
    fb = f.getbbox()
    return cut_below(shift(f, 0, floor - fb[3] + 1), floor)


def ground_it(im, floor=FEET):
    b = im.getbbox()
    return shift(im, 0, floor - b[3] + 1)


def scimitar(p, x, y, a, L=14, w=2.4, pal=(I1, I2, (220, 224, 232))):
    """A curved scimitar held at (x, y), the blade along a (from straight down, positive forward), curving back at the tip;
    a brass guard and a dark grip."""
    u = (math.sin(a), math.cos(a)); v = (u[1], -u[0])
    pts = []
    for j in range(9):
        t = j / 8
        bend = t * t * L * 0.35
        pts.append((x + u[0] * (2 + t * L) - v[0] * bend, y + u[1] * (2 + t * L) - v[1] * bend))
    back = [(px + v[0] * w * (1 - t) * (1 + t), py + v[1] * w * (1 - t) * (1 + t)) for (px, py), t in zip(pts, np.linspace(0, 1, 9))]
    p.poly(pts + back[::-1], pal[0])
    p.lines(pts, pal[2])
    p.l(x - u[0] * 2, y - u[1] * 2, x, y, WD1, 2)
    p.l(x + v[0] * 2.5 + u[0] * 1.5, y + v[1] * 2.5 + u[1] * 1.5, x - v[0] * 2.5 + u[0] * 1.5, y - v[1] * 2.5 + u[1] * 1.5, BR3)
    return pts[-1]


def rat(p, x, y, s=1.0, d=1, pal=RAT, eye=(200, 30, 30), tail=True, dead=False):
    """A sewer rat at (x, y) (body centre), s scale, d = 1 facing right / -1 left: a hunched body, a pointed snout with a
    pink nose, a round ear, a red eye and a long pink tail."""
    if tail:
        p.lines([(x - d * 5 * s, y + 1 * s), (x - d * 9 * s, y + 3 * s), (x - d * 13 * s, y + 1 * s)], PINK[1])
    ell(p, x, y, 6 * s, 3.6 * s, pal[1]); ell(p, x - 0.5 * d, y - 1 * s, 4.5 * s, 2.2 * s, pal[2])
    p.poly([(x + d * 4 * s, y - 3 * s), (x + d * 10 * s, y + 0.5 * s), (x + d * 4 * s, y + 2.5 * s)], pal[2])
    p.p(x + d * 10 * s, y + 0.5 * s, PINK[2])
    ell(p, x + d * 3.5 * s, y - 3.2 * s, 1.6 * s, 1.6 * s, pal[3])
    if s >= 1.5:
        p.p(x + d * 3.5 * s, y - 3.2 * s, PINK[0])
    if dead:
        p.p(x + d * 6 * s, y - 1 * s, BLK[0]); p.p(x + d * 6 * s + 1, y - 1 * s, BLK[0])
    else:
        p.p(x + d * 6 * s, y - 1 * s, eye)


# ================================================================== ALLIGATOR (drawn, 64x64, long and low)
def gator_raw(k=0.0, jaw=0.0, dx=0, legs=True, eyes=1, tailw=0.0):
    """Side view facing right: a long low alligator - a tapering tail (sways with k), a ridged olive back with darker
    scutes, a pale belly, four short splayed legs (walking with k), a long flat head with a yellow eye on a bump and jaws
    that open by jaw (radians)."""
    p = Pic(64, 64)
    f = FEET
    cy = f - 5
    sw = math.sin(k * TAU) * 1.2 + tailw
    pts = [(5 + dx + j * 2.4, cy - 1 + sw * (1 - j / 16) ** 2 - (j / 16) * 1.5) for j in range(17)]
    rad = [0.8 + (j / 16) ** 0.8 * 5.2 for j in range(17)]
    if legs:
        for j, (lx, ph) in enumerate(((22, 0.0), (40, math.pi))):            # far legs
            o = math.sin(k * TAU + ph + math.pi) * 2
            p.l(lx + dx, cy + 1, lx + dx + o - 1, f - 1, GATOR[0], 3)
    tube(p, pts, rad, GATOR[1:], BELLY[1], GATOR[0], 7)
    hx = pts[-1][0]
    hy = cy - 1.5
    # the head: upper jaw rotates up by jaw round the hinge
    hinge = (hx - 2, hy + 1)
    ca, sa = math.cos(-jaw), math.sin(-jaw)
    R = lambda u, v: (hinge[0] + u * ca - v * sa, hinge[1] + u * sa + v * ca)
    p.poly([R(0, 2), R(17, 3.2), R(17, 4.4), R(0, 5)], BELLY[0])                                  # lower jaw (stays)
    if jaw > 0.1:
        p.poly([R(1, -1.2), R(15, 0.5), R(15, 2), R(1, 2)], (150, 40, 40))
        lw = [(hinge[0] + 2 + i * 3, hinge[1] + 1.5 + i * 0.25) for i in range(5)]
        for x, y in lw:
            p.p(x, y, WHITE)
    up = lambda u, v: (hinge[0] + u * math.cos(-jaw) - v * math.sin(-jaw), hinge[1] + u * math.sin(-jaw) + v * math.cos(-jaw))
    p.poly([up(-2, -5), up(6, -5.5), up(17, -2), up(18, 0), up(17, 1.5), up(-2, 1.5)], GATOR[2])
    p.l(*up(0, -5), *up(16, -2), GATOR[3])
    p.p(*up(17, -1), GATOR[0])
    for i in range(5):
        p.p(*up(4 + i * 3, 1.5), WHITE)
    ex, ey = up(3, -6)
    ell(p, ex, ey, 2, 1.6, GATOR[2])
    if eyes:
        p.p(ex, ey - 0.5, (240, 210, 60)); p.p(ex + 0.6, ey - 0.5, BLK[0])
    else:
        p.l(ex - 1, ey - 0.5, ex + 1, ey - 0.5, GATOR[0])
    for j in range(2, 15, 2):                                                  # back scutes
        x, y = pts[j]
        p.p(x, y - rad[j], GATOR[0]); p.p(x, y - rad[j] - 1, GATOR[3] if j % 4 == 0 else GATOR[1])
    if legs:
        for j, (lx, ph) in enumerate(((25, math.pi), (43, 0.0))):            # near legs
            o = math.sin(k * TAU + ph) * 2
            p.l(lx + dx, cy + 2, lx + dx + o - 1, f - 1, GATOR[2], 3)
            p.l(lx + dx + o - 3, f, lx + dx + o + 1, f, GATOR[1], 1)
    return outline_same(p.im)


@builder('alligator')
def make_alligator():
    G = gator_raw
    save_enemy('alligator', 'idle', [G(k=0, tailw=(0, 0.6, 1.0, 0.6)[i], jaw=(0, 0, 0.05, 0)[i]) for i in range(4)])
    save_enemy('alligator', 'movement', [G(k=i / 6) for i in range(6)])
    save_enemy('alligator', 'attack', [G(jaw=0.2), G(jaw=0.55, dx=1), G(jaw=0.7, dx=2), G(jaw=0.0, dx=2), G(jaw=0.0, dx=1), G(jaw=0.15)])
    save_enemy('alligator', 'take_damage', [flash(G(jaw=0.4, eyes=0, tailw=2), WHITE), G(jaw=0.3, tailw=1.5), G(tailw=0.5)])
    base = G(eyes=0, jaw=0.25, legs=True)
    q = Pic(64, 64)
    save_enemy('alligator', 'death', [flash(G(jaw=0.5, eyes=0, tailw=2.5), WHITE), G(jaw=0.5, eyes=0, tailw=-2),
                                      ground_it(squash(base, 0.6, FEET)), flipv(squash(base, 0.7, FEET)), flipv(base), flipv(G(eyes=0, jaw=0.1))])


# ================================================================== SLUDGE MAN (drawn, 64x64)
def sludge_raw(bob=0, arm=0.0, clump=None, eyes=1, mouth=0, melt=0.0, k=0, lean=0):
    """Side view facing right: a slouching man-shaped heap of sewer sludge - a broad base spreading over the floor, a
    lumpy torso, a sunken head with two pale glowing eyes and a gaping mouth, long dripping arms; arm 0 = hanging .. 1 =
    raised behind with a clump .. 2 = flung forward; clump = (x, y) of a flying sludge clump."""
    p = Pic(64, 64)
    f = FEET
    cx = 30
    top = f - 40 + bob
    r2 = random.Random(31 + k)
    ell(p, cx, f - 3, 15, 4, SLG[1])                                              # the base on the floor
    shade_ball(p, cx - 1, f - 14 + bob * 0.5, 11, SLG[1:], 10)                    # hips
    shade_ball(p, cx + 1 + lean, top + 16, 10, SLG[1:], 11)                       # torso
    # far arm
    p.l(cx - 4 + lean, top + 10, cx - 10, top + 26, SLG[0], 5)
    shade_ball(p, cx + 3 + lean, top + 5, 6.5, SLG[1:], 6)                        # head
    ex, ey = cx + 6 + lean, top + 4
    if eyes:
        p.p(ex, ey, (230, 240, 150)); p.p(ex + 3, ey, (230, 240, 150))
    else:
        p.l(ex - 1, ey, ex + 1, ey, SLG[0]); p.l(ex + 2, ey, ex + 4, ey, SLG[0])
    p.e(ex, ey + 3, ex + 4, ey + 4 + mouth * 1.5, SLG[0])
    sx, sy = cx + 6 + lean, top + 11
    if arm <= 1:
        hx, hy = sx + 8 - arm * 18, sy + 14 - arm * 22
    else:
        t = arm - 1
        hx, hy = sx - 10 + t * 26, sy - 8 + t * 14
    p.l(sx, sy, (sx + hx) / 2 + 2, (sy + hy) / 2 + 2, SLG[2], 5); p.l((sx + hx) / 2 + 2, (sy + hy) / 2 + 2, hx, hy, SLG[2], 4)
    shade_ball(p, hx, hy, 3, SLG[1:])
    if 0.5 < arm <= 1.2:
        shade_ball(p, hx, hy - 3, 4, (SLG[0], SLG[2], SLG[3], SLIME[2]))
    for _ in range(6):                                                            # drips
        x = cx + r2.uniform(-12, 12)
        y = f - r2.uniform(8, 30)
        p.l(x, y, x, y + r2.randint(2, 4), SLG[3])
    im = outline_same(p.im, SLG[0])
    if clump:
        q = Pic(64, 64)
        shade_ball(q, clump[0], clump[1], 3.5, (SLG[0], SLG[2], SLG[3], SLIME[2]))
        q.l(clump[0] - 6, clump[1] + 2, clump[0] - 3, clump[1] + 1, SLG[2])
        im = on(im, outline_same(q.im, SLG[0]))
    if melt:
        im = squash(im, 1 - melt * 0.85, f + 1)
        q = Pic(64, 64)
        pool(q, cx, f + 1, 22 + melt * 20, 4 + melt * 2, (SLG[0], SLG[2], SLG[3]), 5)
        im = on(outline_same(q.im, SLG[0]), im)
    return im


@builder('sludgeman')
def make_sludgeman():
    S = sludge_raw
    save_enemy('sludgeman', 'idle', [S(bob=(0, 1, 1, 0)[i], k=i % 2) for i in range(4)])
    save_enemy('sludgeman', 'movement', [S(bob=(0, 1, 2, 1, 0, 1)[i], lean=(0, 1, 2, 1, 0, -1)[i], arm=0.1 * (i % 3), k=i) for i in range(6)])
    save_enemy('sludgeman', 'attack', [S(arm=0.5), S(arm=1.0, mouth=1), S(arm=1.5, mouth=2, lean=2), S(arm=2.0, mouth=2, lean=3, clump=(54, 22)),
                                       S(arm=1.6, mouth=1, lean=1), S(arm=0.4)])
    save_enemy('sludgeman', 'take_damage', [flash(S(eyes=0, mouth=2, lean=-3), WHITE), S(mouth=1, lean=-2), S(lean=-1)])
    save_enemy('sludgeman', 'death', [flash(S(eyes=0, mouth=2, lean=-3), WHITE)] + [S(eyes=0, mouth=2, melt=m) for m in (0.25, 0.5, 0.75, 0.95)] +
               [S(eyes=0, melt=1.0)])


# ================================================================== PLUMBER ZOMBIE (drawn, 64x64)
def wrench(p, x, y, a, L=14):
    ex, ey = pt(a, L, x, y)
    p.l(x, y, ex, ey, I1, 3); p.l(x, y, ex, ey, I2, 1)
    u = (math.sin(a), math.cos(a)); v = (-u[1], u[0])
    c = (ex + u[0] * 2, ey + u[1] * 2)
    p.poly([(c[0] + v[0] * 4 - u[0] * 2, c[1] + v[1] * 4 - u[1] * 2), (c[0] + v[0] * 4 + u[0] * 3, c[1] + v[1] * 4 + u[1] * 3),
            (c[0] + u[0] * 3, c[1] + u[1] * 3), (c[0] + u[0] * 1, c[1] + u[1] * 1), (c[0] - v[0] * 3 + u[0], c[1] - v[1] * 3 + u[1]),
            (c[0] - v[0] * 3 - u[0] * 2, c[1] - v[1] * 3 - u[1] * 2)], I1)
    p.l(c[0] + v[0] * 4 - u[0] * 2, c[1] + v[1] * 4 - u[1] * 2, c[0] - v[0] * 3 - u[0] * 2, c[1] - v[1] * 3 - u[1] * 2, I3)
    p.l(x + u[0] * 2, y + u[1] * 2, x + u[0] * 6, y + u[1] * 6, (170, 30, 26), 3)


def plumber_raw(step=None, bob=0, lean=1.5, aF=(1.2, 0.5), aB=(0.9, 0.6), wr=1.4, eyes=1, mouth=1, crouch=0, cap=True):
    """Side view facing right: a plumber zombie - grey-green skin, a red cap, a moustache, blue overalls with a bib and
    brass buttons over a dirty shirt, rubber boots, arms reaching forward; the front hand holds a big red-handled pipe
    wrench (wr = angle)."""
    p = Pic(64, 64)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.r(sx - 4, sy + 2, sx + 4, hy - 3, OVR[2]); p.l(sx - 4, sy + 2, sx + 4, sy + 2, OVR[3])
        p.l(sx - 3, sy - 1, sx - 3, sy + 3, OVR[1], 2); p.p(sx + 3, sy + 3, BR3); p.p(sx - 3, sy + 3, BR3)
        p.r(sx - 1, sy + 6, sx + 2, sy + 8, OVR[1])
        dust(p, 5, 11, (hx - 4, sy + 4, hx + 4, hy), (SLG[1], OVR[0]))
    def head(p, K):
        x, y = K['head']
        if eyes:
            p.p(x + 3, y - 1, (230, 230, 150)); p.p(x + 2, y - 1, BLK[0])
        else:
            p.l(x + 2, y - 1, x + 4, y - 1, BLK[0])
        p.l(x + 2, y + 2, x + 6, y + 2, (60, 40, 30), 2)
        if mouth:
            p.r(x + 3, y + 3, x + 5, y + 3 + mouth, (50, 16, 16))
        p.p(x + 5, y, ZSK[3])
        if cap:
            p.e(x - 5, y - 7, x + 4, y - 1, (160, 30, 26)); p.l(x - 4, y - 3, x + 9, y - 3, (110, 20, 18), 2); p.arc(x - 3, y - 6, x + 2, y - 3, 200, 300, (210, 70, 60))
    def front(p, K):
        if wr is not None:
            wrench(p, K['handF'][0], K['handF'][1], wr, 13)
        ell(p, K['handF'][0], K['handF'][1], 1.6, 1.6, ZSK[2])
    rig(p, 30, FEET, LL=14, TL=13, HR=5, step=step, bob=bob, lean=lean, crouch=crouch, legs=(OVR[1], OVR[2]), leg_w=5, body=((110, 100, 80), (140, 128, 104)),
        body_w=(6, 6), arms=((110, 100, 80), (140, 128, 104)), arm_w=4, AL=13, aB=aB, aF=aF, skin=ZSK, hands=ZSK[2], shoes=(30, 30, 30),
        on_torso=torso, on_head=head, on_front=front)
    return outline_same(p.im)


@builder('plumber')
def make_plumber():
    M = plumber_raw
    save_enemy('plumber', 'idle', [M(bob=(0, 0, 1, 0)[i], wr=1.4 + (0, 0.05, 0.1, 0.05)[i], mouth=(1, 1, 2, 1)[i]) for i in range(4)])
    save_enemy('plumber', 'movement', [M(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=2, aF=(1.0, 0.5), wr=1.2) for i in range(6)])
    save_enemy('plumber', 'attack', [M(aF=(2.2, 0.6), wr=3.3, lean=-1), M(aF=(2.9, 0.3), wr=3.9, lean=-2, mouth=2),
                                     M(aF=(2.2, 0.1), wr=2.6, lean=1, mouth=3), M(aF=(1.2, 0.1), wr=1.2, lean=2, crouch=2, mouth=3),
                                     M(aF=(0.9, 0.1), wr=0.9, lean=3, crouch=3, mouth=2), M(aF=(1.1, 0.4), wr=1.2, lean=2)])
    save_enemy('plumber', 'take_damage', [flash(M(lean=-3, eyes=0, mouth=3), WHITE), M(lean=-2, mouth=2), M(lean=0)])
    base = M(eyes=0, mouth=2, wr=None, aF=(1.2, 0.4), aB=(1.0, 0.5))
    q = Pic(64, 64); wrench(q, 40, FEET - 2, 1.75, 13); wk = outline_same(q.im)
    save_enemy('plumber', 'death', [flash(M(lean=-3, eyes=0, mouth=3), WHITE), on(fall(base, 0.25), wk), on(fall(base, 0.55), wk),
                                    on(fall(base, 0.85), wk), on(fall(base, 1.0), wk), on(fall(M(eyes=0, wr=None, cap=False, aF=(1.2, 0.4)), 1.0), wk)])


# ================================================================== LEECH (drawn, 64x64, small)
def leech_raw(k=0.0, rear=0.0, mouth=0, flat=0.0, dx=0, eyes=1):
    """Side view facing right: a small black-violet leech (about 18 px) with ringed segments, a lighter stripe, a red
    sucker mouth at the front; k = the inching wave; rear lifts the front end (0..1); mouth opens a round toothed sucker."""
    p = Pic(64, 64)
    f = FEET
    pts, rad = [], []
    n = 12
    for j in range(n):
        t = j / (n - 1)
        x = 23 + dx + t * 17 * (1 - 0.15 * math.sin(k * TAU) ** 2)
        y = f - 3 - max(0, math.sin(k * TAU)) * 3 * math.sin(t * math.pi) * (1 - flat)
        if rear > 0 and t > 0.5:
            u = (t - 0.5) / 0.5
            x = 23 + dx + 8.5 + u * 8.5 * (1 - rear * 0.5) + rear * u * 3
            y = y - rear * u * u * 12
        pts.append((x, y))
        rad.append((1.5 + 2.2 * math.sin(t * math.pi) ** 0.6) * (1 - flat * 0.4))
    tube(p, pts, rad, LEECH, None, None)
    for j in range(1, n - 1, 2):
        x, y = pts[j]
        p.l(x, y - rad[j] + 1, x, y + rad[j] - 1, LEECH[0])
    hx, hy = pts[-1]
    if mouth:
        ell(p, hx + 1, hy, 2.4, 2.4, (150, 30, 40)); ell(p, hx + 1, hy, 1.2, 1.2, (40, 6, 10))
        for a in range(6):
            p.p(hx + 1 + math.cos(a) * 2, hy + math.sin(a) * 2, WHITE)
    else:
        p.p(hx + 1, hy, (190, 40, 50))
    if eyes:
        p.p(hx - 1, hy - rad[-1], (200, 60, 70))
    return outline_same(p.im, LEECH[0])


@builder('leech')
def make_leech():
    L = leech_raw
    save_enemy('leech', 'idle', [L(k=0.05 * i, rear=(0, 0.1, 0.15, 0.1)[i]) for i in range(4)])
    save_enemy('leech', 'movement', [L(k=i / 6) for i in range(6)])
    save_enemy('leech', 'attack', [L(rear=0.4), L(rear=0.8, mouth=1), L(rear=0.6, mouth=1, dx=3), L(rear=0.2, mouth=1, dx=5), L(rear=0.1, dx=3), L(rear=0.1)])
    save_enemy('leech', 'take_damage', [flash(L(rear=0.5, mouth=1, eyes=0), WHITE), L(rear=0.3), L()])
    save_enemy('leech', 'death', [flash(L(rear=0.6, mouth=1, eyes=0), WHITE), L(rear=0.3, mouth=1, eyes=0), L(flat=0.3, eyes=0), L(flat=0.6, eyes=0),
                                  L(flat=0.9, eyes=0), L(flat=1.0, eyes=0)])


# ================================================================== SCORPION (drawn, 64x64)
def scorpion_raw(k=0.0, strike=0.0, claw=0.0, eyes=1, dx=0):
    """Side view facing right: a desert scorpion in amber and brown - a segmented body on four pairs of thin legs (k = the
    walk), two pincers in front (claw opens them), and a five-segment tail curled up over the back with a dark stinger;
    strike 0..1 swings the tail forward over the head."""
    p = Pic(64, 64)
    f = FEET
    by = f - 6
    for j in range(4):                                                            # far legs
        x = 18 + dx + j * 5
        o = math.sin(k * TAU + j * 1.5) * 1.5
        p.lines([(x, by), (x - 2 + o, by - 3), (x - 4 + o, f - 1)], AMBER[0])
    for j in range(5):                                                            # body segments
        x = 16 + dx + j * 4.6
        shade_ball(p, x, by - 0.5, 3.8, AMBER, 3)
        p.l(x + 2, by - 3, x + 2, by + 2, AMBER[0])
    # tail: from the back end, up, over, stinger forward
    a0 = 1.1 - 0.15 * strike
    pts = []
    x, y = 13 + dx, by - 1
    for j in range(6):
        ang = a0 + j * (0.33 + strike * 0.25)
        x, y = x - math.cos(ang) * 4.6, y - math.sin(ang) * 4.6
        pts.append((x, y))
    for j, (tx, ty) in enumerate(pts[:-1]):
        shade_ball(p, tx, ty, 2.6 - j * 0.15, AMBER)
    sx, sy = pts[-1]
    p.poly([(sx - 2, sy - 1), (sx + 2, sy - 1), (sx + 3 + strike * 2, sy + 3)], (40, 20, 10)); p.p(sx + 3 + strike * 2, sy + 3, (230, 220, 160))
    # head and pincers
    hx = 38 + dx
    shade_ball(p, hx, by - 0.5, 4, AMBER, 3.2)
    if eyes:
        p.p(hx + 1, by - 3, BLK[0]); p.p(hx + 2, by - 3, BLK[0])
    for j, yy_ in enumerate((by - 1, by + 1)):
        cx_, cy_ = hx + 7, yy_ - 2 + j * 1
        p.l(hx + 2, yy_, cx_, cy_, AMBER[1 + j], 2)
        ell(p, cx_ + 2, cy_, 3, 2, AMBER[2 + (j == 0) * 0])
        p.l(cx_ + 3, cy_ - 1, cx_ + 7, cy_ - 2 - claw * 2, AMBER[1], 1); p.l(cx_ + 3, cy_ + 1, cx_ + 7, cy_ + 1 + claw * 2, AMBER[1], 1)
    for j in range(4):                                                            # near legs
        x = 20 + dx + j * 5
        o = math.sin(k * TAU + j * 1.5 + math.pi) * 1.5
        p.lines([(x, by + 1), (x + 2 + o, by - 2), (x + 3 + o, f - 1)], AMBER[1])
    return outline_same(p.im, (30, 16, 6))


@builder('scorpion')
def make_scorpion():
    S = scorpion_raw
    save_enemy('scorpion', 'idle', [S(claw=(0, 0.4, 0.8, 0.4)[i]) for i in range(4)])
    save_enemy('scorpion', 'movement', [S(k=i / 6, claw=0.3) for i in range(6)])
    save_enemy('scorpion', 'attack', [S(strike=-0.3, claw=1), S(strike=0.3, claw=1), S(strike=0.8, claw=0.6), S(strike=1.0, claw=0.4, dx=2),
                                      S(strike=0.6, claw=0.6, dx=1), S(strike=0.1, claw=0.6)])
    save_enemy('scorpion', 'take_damage', [flash(S(strike=-0.3, eyes=0), WHITE), S(strike=-0.2), S()])
    base = S(eyes=0, claw=1.0, strike=-0.2)
    save_enemy('scorpion', 'death', [flash(S(eyes=0, strike=-0.3, claw=1), WHITE), S(eyes=0, strike=-0.6, claw=1), ground_it(squash(base, 0.6, FEET)),
                                     flipv(squash(base, 0.8, FEET)), flipv(base), flipv(S(eyes=0, claw=0.2, strike=-0.6))])


# ================================================================== NOMAD (drawn, 64x64)
def nomad_raw(step=None, bob=0, lean=0.0, aF=(0.7, 0.5), aB=(-0.1, 0.4), sw=1.4, eyes=1, crouch=0, veil=True, side=0):
    """Side view facing right: a desert nomad - a long indigo robe to the ankles with a sand-coloured sash, a head cloth
    wrapped round the head and a veil over the face (only the eyes show), soft boots; the front hand holds a curved
    scimitar (sw = blade angle)."""
    p = Pic(64, 64)
    K0 = {}
    def far(p, K):
        K0.update(K)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.poly([(hx - 6, hy - 2), (hx + 6, hy - 2), (hx + 9 + (K0.get('st', 0)), FEET - 3), (hx - 9, FEET - 3)], INDIGO[1])
        p.l(hx - 6, hy - 2, hx - 9, FEET - 3, INDIGO[0]); p.l(hx + 2, hy, hx + 3, FEET - 4, INDIGO[2])
        p.r(hx - 6, hy - 3, hx + 6, hy, CLOTH[2]); p.l(hx - 6, hy - 3, hx + 6, hy - 3, CLOTH[3]); p.l(hx - 4, hy, hx - 6, hy + 7, CLOTH[1], 2)
        p.l(sx - 2, sy, hx + 2, hy - 3, INDIGO[3])
    def head(p, K):
        x, y = K['head']
        p.e(x - 6, y - 7, x + 5, y + 1, CLOTH[2]); p.arc(x - 5, y - 6, x + 3, y - 1, 200, 320, CLOTH[3])
        p.l(x - 6, y - 1, x - 9, y + 8, CLOTH[1], 3)
        if veil:
            p.poly([(x - 2, y), (x + 6, y), (x + 5, y + 6), (x - 3, y + 6)], INDIGO[2])
        p.r(x + 1, y - 2, x + 5, y - 1, SKIN[1])
        if eyes:
            p.p(x + 3, y - 2, BLK[0])
        else:
            p.l(x + 2, y - 2, x + 4, y - 2, BLK[0])
    def front(p, K):
        if sw is not None:
            scimitar(p, K['handF'][0], K['handF'][1], sw, 15)
        ell(p, K['handF'][0], K['handF'][1], 1.6, 1.6, SKIN[1])
    rig(p, 30, FEET, LL=15, TL=13, HR=5, step=step, bob=bob, lean=lean, crouch=crouch, legs=(INDIGO[0], INDIGO[1]), leg_w=5, body=(INDIGO[1], INDIGO[2]),
        body_w=(6, 6), arms=(INDIGO[1], INDIGO[2]), arm_w=4, AL=13, aB=aB, aF=aF, skin=SKIN, hands=SKIN[1], shoes=CLOTH[0],
        on_far=far, on_torso=torso, on_head=head, on_front=front)
    return outline_same(p.im)


@builder('nomad')
def make_nomad():
    N = nomad_raw
    save_enemy('nomad', 'idle', [N(bob=(0, 0, 1, 0)[i], sw=1.3 + (0, 0.05, 0.1, 0.05)[i]) for i in range(4)])
    save_enemy('nomad', 'movement', [N(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=1.5, sw=1.6) for i in range(6)])
    save_enemy('nomad', 'attack', [N(aF=(2.2, 0.8), sw=3.0, lean=-1), N(aF=(2.4, 0.4), sw=2.9, lean=-2), N(aF=(2.0, 0.1), sw=2.4, lean=2),
                                   N(aF=(1.4, 0.0), sw=1.4, lean=3, crouch=2), N(aF=(0.8, 0.1), sw=0.6, lean=3, crouch=2), N(aF=(0.7, 0.4), sw=1.2, lean=1)])
    save_enemy('nomad', 'take_damage', [flash(N(lean=-3, eyes=0), WHITE), N(lean=-2), N(lean=-1)])
    base = N(eyes=0, sw=None, aF=(1.2, 0.4), aB=(1.0, 0.5))
    q = Pic(64, 64); scimitar(q, 38, FEET - 2, 1.62, 15); sc = outline_same(q.im)
    save_enemy('nomad', 'death', [flash(N(lean=-3, eyes=0), WHITE), on(fall(base, 0.25), sc), on(fall(base, 0.55), sc), on(fall(base, 0.85), sc),
                                  on(fall(base, 1.0), sc), on(fall(N(eyes=0, sw=None, veil=False, aF=(1.2, 0.4)), 1.0), sc)])


# ================================================================== SAND WRAITH (drawn, 64x64, flying - drawn low)
SWR = ((96, 72, 44), (130, 102, 64), (164, 134, 90), (200, 176, 130))


def wraith_raw(k=0, dx=0, dy=0, wide=1.0, eyes=1, glow=0, size=1.0, heap=0.0):
    """A whirl of sand: a funnel narrowing to a point near the floor (drawn low, the game lifts flyers), made of swirling
    bands that turn with k, a cloud of grains round it and two glowing amber eyes in the upper swirl; wide widens the
    top (the lash), size shrinks it into the floor (death), heap = a sand heap growing on the floor."""
    p = Pic(64, 64)
    f = FEET
    H = 30 * size
    base = f - 3 + dy
    cx = 32 + dx
    r2 = random.Random(70 + k)
    n = 9
    for j in range(n):
        t = j / (n - 1)
        y = base - t * H
        r = (2 + t * 11 * wide) * size
        ox = math.sin(t * 5 + k * 1.6) * 2.5 * size
        ell(p, cx + ox, y, r + 1, 3 * size + 0.5, SWR[0])
        ell(p, cx + ox, y - 0.5, r, 2.6 * size, SWR[1 + (j + k) % 2])
        p.arc(cx + ox - r, y - 2.6 * size, cx + ox + r, y + 2.6 * size, 20 + k * 40, 150 + k * 40, SWR[3])
    for _ in range(int(22 * size)):
        a = r2.uniform(0, TAU)
        t = r2.uniform(0, 1)
        r = (4 + t * 14 * wide) * size
        p.p(cx + math.cos(a) * r, base - t * H + math.sin(a) * 2, SWR[r2.randrange(1, 4)])
    if eyes and size > 0.5:
        ey = base - H * 0.72
        c = EYE[2] if glow else EYE[1]
        p.r(cx + 2, ey, cx + 3, ey + 1, c); p.r(cx + 7, ey, cx + 8, ey + 1, c)
    im = p.im
    if heap:
        q = Pic(64, 64)
        q.e(cx - 10 * heap - 2, f - 6 * heap, cx + 10 * heap + 2, f + 4 * heap, SWR[1]); q.e(cx - 8 * heap, f - 5 * heap, cx + 6 * heap, f, SWR[2])
        dust(q, 8, 3, (cx - 12, f - 6, cx + 12, f - 1), (SWR[3], SWR[0]))
        im = on(outline_same(q.im, SWR[0]), im)
    return im


@builder('sandwraith')
def make_sandwraith():
    W = wraith_raw
    save_enemy('sandwraith', 'idle', [W(k=i, dy=(0, -1, -2, -1)[i]) for i in range(4)])
    save_enemy('sandwraith', 'movement', [W(k=i, dx=(0, 1, 2, 2, 1, 0)[i], dy=(0, -1, -1, 0, -1, -1)[i]) for i in range(6)])
    save_enemy('sandwraith', 'attack', [W(k=0, wide=1.2), W(k=1, wide=1.5, glow=1), W(k=2, wide=1.75, glow=1, dx=2), W(k=3, wide=1.75, glow=1, dx=3),
                                        W(k=4, wide=1.4, glow=1, dx=1), W(k=5, wide=1.1)])
    save_enemy('sandwraith', 'take_damage', [flash(W(k=0, eyes=0), WHITE), W(k=1, wide=0.8), W(k=2)])
    save_enemy('sandwraith', 'death', [flash(W(k=0, eyes=0, wide=1.3), WHITE), W(k=1, size=0.8, eyes=0, heap=0.3), W(k=2, size=0.6, eyes=0, heap=0.6),
                                       W(k=3, size=0.4, eyes=0, heap=0.85), W(k=4, size=0.2, eyes=0, heap=1.0), W(k=4, size=0.0001, eyes=0, heap=1.0)])


# ================================================================== VULTURE (drawn, 64x64, flying - drawn low)
def vulture_raw(wing=0.0, dx=0, dy=0, dive=0.0, talon=0.0, eyes=1, on_floor=False):
    """Side view facing right: a vulture - a dark brown body, a pale ruff, a long bare pink neck and head with a hooked
    pale beak, broad fingered wings (wing -1 = down .. 1 = up), a short tail and yellow talons (talon reaches forward);
    dive tips the whole bird nose down; on_floor = lying dead on its back with the wings spread."""
    p = Pic(64, 64)
    f = FEET
    cx, cy = 30 + dx, f - 14 + dy
    if on_floor:
        cy = f - 4
    def wingf(far):
        a = (-0.2 - wing * 0.9) if not on_floor else (0.05 if far else -0.05)
        L = 24
        root = (cx - 2, cy - 3)
        tip = (root[0] - math.cos(a) * L * 0.5 - (6 if not on_floor else 0), root[1] + math.sin(a) * L)
        if on_floor:
            tip = (root[0] + (-20 if far else 22), f - 2)
        pal = VUL[0:3] if far else VUL[1:4]
        p.poly([root, (root[0] + 6, root[1]), (tip[0] + 6, tip[1]), tip], pal[1])
        for j in range(4):
            fx = tip[0] + j * 2
            p.l(fx, tip[1], fx - 1 - j * 0.5, tip[1] + (2 if wing <= 0 or on_floor else -2) * (1 if tip[1] > root[1] else -1), pal[0], 1)
        p.l(*root, *tip, pal[2])
    wingf(True)
    ell(p, cx, cy, 9, 5.5, VUL[1]); ell(p, cx - 1, cy - 1.5, 7, 3, VUL[2])
    p.poly([(cx - 8, cy - 1), (cx - 15, cy + 1), (cx - 14, cy + 3), (cx - 8, cy + 3)], VUL[1])          # tail
    ell(p, cx + 7, cy - 3, 4, 3, (200, 190, 170))                                                       # ruff
    hx, hy = cx + 12, cy - 9 + dive * 6
    if on_floor:
        hx, hy = cx + 14, f - 3
    p.l(cx + 8, cy - 4, hx - 1, hy + 1, PINK[1], 3)
    ell(p, hx, hy, 3, 2.5, PINK[2])
    p.poly([(hx + 2, hy - 1), (hx + 6, hy), (hx + 5, hy + 2), (hx + 2, hy + 1)], (220, 210, 170)); p.p(hx + 5, hy + 2, (80, 70, 50))
    if eyes:
        p.p(hx + 1, hy - 1, BLK[0])
    else:
        p.l(hx, hy - 1, hx + 2, hy - 1, BLK[0])
    tx, ty = cx + 2 + talon * 8, cy + 5 + talon * 1
    if on_floor:
        tx, ty = cx + 2, f - 9
    p.l(cx + 1, cy + 3, tx, ty, (200, 170, 60), 2)
    p.ps([(tx + 1, ty + 1), (tx + 2, ty), (tx - 1, ty + 1)], (200, 170, 60))
    if not on_floor:
        wingf(False)
    im = outline_same(p.im)
    if dive:
        im = im.rotate(-dive * 25, resample=Image.NEAREST, center=(cx, cy))
    return im


@builder('vulture')
def make_vulture():
    V = vulture_raw
    save_enemy('vulture', 'idle', [V(wing=(1, 0.3, -0.6, 0.3)[i], dy=(0, -1, 0, 1)[i]) for i in range(4)])
    save_enemy('vulture', 'movement', [V(wing=(1, 0.5, -0.3, -0.8, -0.2, 0.5)[i], dx=(0, 1, 2, 2, 1, 0)[i] - 1, dy=(0, -1, -1, 0, 0, -1)[i]) for i in range(6)])
    save_enemy('vulture', 'attack', [V(wing=1, dy=-4), V(wing=0.8, dive=0.4, dy=-2), V(wing=0.6, dive=0.8, talon=0.6, dx=2),
                                     V(wing=0.4, dive=0.6, talon=1, dx=4, dy=2), V(wing=-0.5, dive=0.2, talon=0.6, dx=2), V(wing=0.5)])
    save_enemy('vulture', 'take_damage', [flash(V(wing=0.8, eyes=0, dy=-2), WHITE), V(wing=0.4, dy=-1), V(wing=0)])
    save_enemy('vulture', 'death', [flash(V(wing=1, eyes=0), WHITE), V(wing=0.6, eyes=0, dive=0.5, dy=4), V(wing=0.2, eyes=0, dive=1.0, dy=8),
                                    ground_it(V(wing=-0.2, eyes=0, dive=1.2, dy=10)), V(eyes=0, on_floor=True), V(eyes=0, on_floor=True)])


# ================================================================== THE RAT KING (drawn, 116x116)
def crown(p, x, y, s=1.0, tilt=0.0):
    """A crooked gold crown with five points and red / blue stones, its base centred on (x, y)."""
    ca, sa = math.cos(tilt), math.sin(tilt)
    R = lambda u, v: (x + (u * ca - v * sa) * s, y + (u * sa + v * ca) * s)
    p.poly([R(-10, 0), R(-11, -10), R(-6, -5), R(-3, -13), R(0, -6), R(4, -14), R(6, -5), R(11, -11), R(10, 0)], AU1)
    p.poly([R(-8, -1), R(-9, -7), R(-5, -3), R(-3, -10), R(0, -4), R(4, -11), R(5, -3), R(9, -8), R(8, -1)], AU2)
    p.l(*R(-10, -1), *R(10, -1), AU3, 2)
    for u, c in ((-6, (40, 80, 200)), (0, (200, 30, 30)), (6, (40, 80, 200))):
        p.p(*R(u, -2), c)
    for u, v in ((-11, -10), (-3, -13), (4, -14), (11, -11)):
        p.p(*R(u, v), AU4)


RK_RATS = [(-24, -6, 2.1, 1), (-18, -20, 1.9, 1), (-6, -28, 2.0, 1), (-26, 8, 2.0, 1), (-12, 6, 2.2, -1), (4, -14, 2.1, 1),
           (12, 4, 2.1, 1), (-2, 16, 2.3, -1), (-20, 20, 2.0, 1), (16, 18, 1.9, 1), (-10, -10, 2.2, -1), (6, 24, 1.9, -1)]


def ratking_frame(k=0, dx=0, head=(0, 0), mouth=0.0, eyes=1, spray=0, pour=0, scatter=0.0, crowned=True, alive=True):
    """Side view facing right: the rat king - a giant knot of a dozen rats grown together (they wriggle with k), their
    pink tails tangled into a knot below, and in front a huge rat head with red eyes, yellow incisors and a crooked gold
    crown; head = (dx, dy) of the head (the bite lunge), mouth 0..1, spray = sludge flying from the mouth (step),
    pour = rats pouring out over the floor (step), scatter 0..1 = the knot falling apart (death)."""
    p = Pic(BS, BS)
    f = BS_FEET
    cx, cy = 50 + dx, 80
    r2 = random.Random(5)
    for j in range(16):                                                        # the tail knot
        a = j / 16 * TAU
        x0, y0 = cx + math.cos(a) * 12, f - 6 + math.sin(a) * 3
        p.lines(bez((x0, y0), (cx + r2.uniform(-28, 28), f - r2.uniform(0, 12)), (cx + r2.uniform(-36, 36), f - 1), 6), PINK[(j % 2) + 0], 2)
    if scatter < 0.3:
        ell(p, cx, cy + 4, 30, 24, RAT[0])
    for i, (ox, oy, s_, d) in enumerate(RK_RATS):
        w = math.sin(k * TAU / 5 + i * 1.7) * 1.5
        sx, sy = ox * (1 + scatter * 0.15), oy * (1 - scatter) + scatter * (f - cy - 6)
        rat(p, cx + sx + w, cy + sy + abs(w) * 0.5, s_, d, eye=(200, 30, 30) if alive else BLK[0], tail=False, dead=not alive)
    # the big head
    hx, hy = cx + 30 + head[0], cy - 22 + head[1]
    if scatter < 0.5:
        ell(p, hx - 6, hy + 4, 16, 14, RAT[1]); ell(p, hx - 8, hy, 12, 9, RAT[2])
        op = mouth * 9
        p.poly([(hx + 2, hy - 8), (hx + 26, hy - 1 - op * 0.3), (hx + 26, hy + 3 - op * 0.3), (hx + 2, hy + 4)], RAT[2])      # snout / upper jaw
        p.l(hx + 4, hy - 7, hx + 25, hy - 1 - op * 0.3, RAT[3])
        ell(p, hx + 26, hy + 0.5 - op * 0.3, 2.5, 2, PINK[2])
        if mouth > 0.1:
            p.poly([(hx + 2, hy + 4), (hx + 24, hy + 3 + op * 0.2), (hx + 22, hy + 6 + op), (hx + 2, hy + 9)], (110, 30, 34))
            p.poly([(hx + 2, hy + 8), (hx + 22, hy + 6 + op), (hx + 20, hy + 9 + op), (hx + 2, hy + 12)], RAT[1])
            p.r(hx + 22, hy + 3 - op * 0.3, hx + 24, hy + 7 - op * 0.3, (230, 200, 90))
            p.r(hx + 19, hy + 2 + op, hx + 21, hy + 6 + op, (230, 200, 90))
        else:
            p.poly([(hx + 2, hy + 4), (hx + 22, hy + 3), (hx + 18, hy + 9), (hx + 2, hy + 10)], RAT[1])
            p.r(hx + 21, hy + 3, hx + 23, hy + 7, (230, 200, 90))
        for j in range(3):
            p.l(hx + 20, hy - 1 + j, hx + 28, hy - 4 + j * 3, RAT[4])                                                    # whiskers
        ell(p, hx - 4, hy - 13, 5, 6, RAT[2]); ell(p, hx - 4, hy - 12, 3, 4, PINK[1])                                    # ear
        if eyes:
            ell(p, hx + 6, hy - 5, 2.6, 2.2, (230, 40, 30)); p.p(hx + 7, hy - 6, (255, 200, 160))
        else:
            p.l(hx + 4, hy - 5, hx + 9, hy - 5, BLK[0])
        p.lines([(hx - 16, hy + 12), (hx - 20, hy + 2), (hx - 14, hy - 6)], RAT[0])
    im = outline_same(p.im)
    q = Pic(BS, BS)
    if crowned and scatter < 0.5:
        crown(q, hx - 2, hy - 14, 1.0, 0.15 + math.sin(k * TAU / 5) * 0.05)
    if spray:
        r3 = random.Random(40 + spray)
        for j in range(9):
            t = r3.uniform(0.2, 1.0) * spray / 2
            x, y = hx + 16 + t * 10 + r3.uniform(-3, 3), hy + 10 + t * 40 + r3.uniform(-4, 4)
            if x < BS - 4:
                shade_ball(q, x, y, r3.uniform(1.6, 3.2), (SLG[0], SLG[2], SLG[3], SLIME[2]))
    if pour:
        for j in range(pour + 1):
            x = cx + 30 + j * 14 + pour * 2
            if x < BS - 14:
                rat(q, x, f - 4 - (j % 2), 1.3, 1, tail=True)
        for j in range(pour):
            rat(q, cx - 34 - j * 9, f - 4, 1.2, -1, tail=True) if cx - 34 - j * 9 > 16 else None
    return on(im, outline_same(q.im))


@builder('ratking')
def make_ratking():
    R = ratking_frame
    save_boss('ratking', 'idle', [R(k=i, head=(0, (0, 1, 2, 1, 0)[i])) for i in range(5)])
    save_boss('ratking', 'attack', [R(k=0, head=(-3, -2), mouth=0.3), R(k=1, head=(-5, -4), mouth=0.8), R(k=2, head=(3, 2), mouth=1.0, spray=1),
                                    R(k=3, head=(4, 3), mouth=0.2, spray=2), R(k=4, head=(2, 1), mouth=0.6, spray=3), R(k=0, head=(0, 0), mouth=0.2)])
    save_boss('ratking', 'cast', [R(k=0, head=(-2, -6), mouth=0.6), R(k=1, head=(-3, -10), mouth=1.0, pour=1), R(k=2, head=(-3, -10), mouth=1.0, pour=2),
                                  R(k=3, head=(-3, -10), mouth=1.0, pour=3), R(k=4, head=(-2, -6), mouth=0.7, pour=4), R(k=0, head=(0, -2), mouth=0.3)])
    save_boss('ratking', 'hurt', [flash(R(k=0, head=(-6, -4), mouth=1.0, eyes=0), WHITE), R(k=1, head=(-4, -2), mouth=0.6), R(k=2, head=(-1, 0), mouth=0.2)])
    q = Pic(BS, BS); crown(q, 96, BS_FEET - 1, 0.9, 1.4); cr = outline_same(q.im)
    save_boss('ratking', 'death', [flash(R(k=0, head=(-6, -4), mouth=1.0, eyes=0), WHITE), R(k=1, head=(-4, 6), mouth=1.0, eyes=0, crowned=False),
                                   on(R(k=2, scatter=0.25, eyes=0, crowned=False, head=(0, 12), mouth=1.0), cr), on(R(k=3, scatter=0.5, alive=False, crowned=False), cr),
                                   on(R(k=4, scatter=0.75, alive=False, crowned=False), cr), on(R(k=4, scatter=1.0, alive=False, crowned=False), cr),
                                   on(R(k=4, scatter=1.0, alive=False, crowned=False), cr)])


# ================================================================== THE SPHINX (drawn, 116x116)
def sphinx_frame(rise=0.0, paw=None, eyes=1, glow=0, beam=0, crack=0, head_only=False, breath=0):
    """Side view facing right: the sphinx - a giant sandstone lion lying down: the haunch and a curled tail behind, a long
    body, the far front leg stretched along the floor, the chest, and a human face under a striped blue and gold head
    cloth (nemes) with a false beard. rise 0..1 lifts the chest (it rears up); paw = the near front paw (None = on the
    floor, 0..1 = raised .. struck down in front); glow lights the eyes, beam = two rays from them (strength); crack
    0..3 = more and more cracks."""
    p = Pic(BS, BS)
    f = BS_FEET
    chx, chy = 78, 82 - rise * 20 + breath
    p.lines(bez((14, f - 4), (2, f - 6), (6, f - 14), 6), SDS[1], 3)                                       # the tail
    ell(p, 6, f - 15, 2.5, 3, SDS[0])
    p.poly([(12, f), (10, 86), (20, 70 + breath), (44, 66 + breath), (chx - 6, chy - 12), (chx + 10, chy - 4), (chx + 12, chy + 14),
            (chx + 4, f - 8 - rise * 4), (40, f)], SDS[2])                                               # the body
    p.poly([(12, f - 1), (14, 82), (26, 74 + breath), (38, 80), (40, f - 1)], SDS[3])                       # haunch
    p.arc(14, 74, 44, 112, 190, 300, SDS[4], 2)
    p.l(20, 70 + breath, chx - 6, chy - 12, SDS[4])
    for j in range(4):                                                                                       # ribs / block joints
        x = 46 + j * 7
        p.l(x, 70 + breath + j * (chy - 82) * 0.1, x - 2, f - 6, SDS[1])
    p.l(14, f - 2, 50, f - 2, SDS[1], 2)
    p.r(30, f - 7, 52, f, SDS[2]); p.l(30, f - 7, 52, f - 7, SDS[4])                                       # hind paw
    fx = chx + 2
    p.poly([(fx - 4, chy + 6), (fx + 6, chy + 4), (fx + 8, f - 6), (108, f - 6), (110, f), (fx - 6, f)], SDS[1])     # far front leg
    p.l(fx + 8, f - 6, 108, f - 6, SDS[3])
    hx, hy = chx + 12, chy - 26
    # the head cloth (nemes) behind the face
    p.poly([(hx - 12, hy - 6), (hx + 6, hy - 14), (hx + 12, hy - 4), (hx + 12, hy + 16), (hx + 4, hy + 30), (hx - 14, hy + 28)], NEMES_B[1])
    for j in range(6):
        y = hy - 8 + j * 6
        p.l(hx - 13, y + 4, hx + 10, y - 2, AU2, 2)
    p.poly([(hx - 2, hy - 10), (hx + 10, hy - 9), (hx + 14, hy + 2), (hx + 13, hy + 14), (hx + 4, hy + 18), (hx - 2, hy + 10)], SDS[3])   # the face
    p.l(hx + 13, hy + 2, hx + 16, hy + 8, SDS[3], 2); p.l(hx + 16, hy + 8, hx + 13, hy + 9, SDS[1])               # nose
    p.l(hx + 9, hy + 13, hx + 13, hy + 13, SDS[0])                                                                # mouth
    p.r(hx + 6, hy + 18, hx + 10, hy + 28, SDS[2]); p.l(hx + 6, hy + 28, hx + 10, hy + 28, AU2)                   # beard
    p.l(hx - 2, hy - 11, hx + 11, hy - 10, AU3, 2)                                                                # band
    p.poly([(hx + 6, hy - 14), (hx + 9, hy - 18), (hx + 11, hy - 13)], AU3)                                       # the cobra on the brow
    if eyes:
        ell(p, hx + 8, hy - 1, 2.6, 1.6, EYE[1] if glow else WHITE); p.p(hx + 9, hy - 1, EYE[2] if glow else BLK[0])
        p.l(hx + 5, hy - 4, hx + 11, hy - 4, SDS[0])
        p.l(hx + 10, hy, hx + 13, hy + 1, NEMES_B[0])
    else:
        p.l(hx + 5, hy - 1, hx + 11, hy - 1, SDS[0])
    p.poly([(chx - 6, chy - 6), (chx + 12, chy - 4), (chx + 12, chy + 14), (chx - 4, chy + 16)], SDS[3])          # chest
    # the near front leg
    if paw is None:
        px, py = 104, f
        p.poly([(chx - 2, chy + 8), (chx + 10, chy + 6), (chx + 14, f - 7), (px, f - 7), (px + 2, f), (chx, f)], SDS[2])
        p.l(chx + 14, f - 7, px, f - 7, SDS[4])
        for j in range(3):
            p.l(px - 2 - j * 3, f - 6, px - 2 - j * 3, f - 1, SDS[0])
    else:
        t = paw
        ex, ey = (chx + 18, chy - 6) if t < 0.5 else (chx + 20 + (t - 0.5) * 8, chy + 2 + (t - 0.5) * 40)
        p.l(chx + 4, chy + 8, ex, ey, SDS[2], 11)
        p.l(chx + 4, chy + 3, ex, ey - 5, SDS[4])
        ell(p, ex + 2, ey + 2, 7, 6, SDS[3])
        for j in range(3):
            p.l(ex + 6, ey - 2 + j * 3, ex + 10, ey - 1 + j * 3, (230, 220, 190))
    if crack:
        r2 = random.Random(9)
        for j in range(crack * 4):
            x, y = r2.uniform(20, 100), r2.uniform(chy - 30, f - 10)
            pts = [(x, y)]
            for _ in range(3):
                x, y = x + r2.uniform(-5, 5), y + r2.uniform(2, 6)
                pts.append((x, y))
            p.lines(pts, SDS[0])
    im = outline_same(p.im, SDS[0])
    q = Pic(BS, BS)
    if glow:
        halo(q, hx + 8, hy - 1, 5 + glow * 2, (EYE[2], EYE[1]), 10, glow)
    if beam:
        for j, oy in enumerate((0, 3)):
            x0, y0 = hx + 10, hy - 1 + oy
            x1, y1 = 113, hy + 10 + oy + j * 4
            q.l(x0, y0, x1, y1, EYE[0], 3 if beam > 1 else 2); q.l(x0, y0, x1, y1, EYE[2], 1)
    return on(im, q.im), (hx, hy)


def rubble(k, seed=21):
    """A heap of fallen sandstone blocks growing with k (0..1) on the floor, with dust above."""
    p = Pic(BS, BS)
    f = BS_FEET
    r2 = random.Random(seed)
    n = int(6 + k * 16)
    for j in range(n):
        x = r2.uniform(14, 104)
        h_ = (1 - abs(x - 60) / 50) * 26 * k
        y = f - r2.uniform(0, max(1, h_)) - 3
        w, hh = r2.uniform(5, 11), r2.uniform(4, 8)
        poly_r(p, [(x - w / 2, y - hh / 2), (x + w / 2, y - hh / 2), (x + w / 2, y + hh / 2), (x - w / 2, y + hh / 2)], SDS[r2.randrange(1, 4)], x, y, r2.uniform(-0.5, 0.5))
    im = outline_same(p.im, SDS[0])
    q = Pic(BS, BS)
    dust(q, int(30 * (1 - k * 0.5)), seed, (10, int(f - 50 * (1 - k * 0.4)), 106, f - 4), (SAND[3], SAND[4], SDS[2]))
    return on(im, q.im)


@builder('sphinx')
def make_sphinx():
    S = lambda **kw: sphinx_frame(**kw)[0]
    save_boss('sphinx', 'idle', [S(breath=(0, 1, 2, 1, 0)[i]) for i in range(5)])
    save_boss('sphinx', 'attack', [S(rise=0.4), S(rise=0.9, paw=0.0), S(rise=1.0, paw=0.3), S(rise=0.7, paw=0.8), S(rise=0.3, paw=1.0), S(rise=0.1)])
    save_boss('sphinx', 'cast', [S(glow=1), S(glow=2, rise=0.2), S(glow=3, rise=0.3, beam=1), S(glow=3, rise=0.3, beam=2), S(glow=2, rise=0.2, beam=1), S(glow=1)])
    save_boss('sphinx', 'hurt', [flash(S(rise=0.3, eyes=0), WHITE), S(rise=0.2), S(rise=0.05)])
    full, (hx, hy) = sphinx_frame(eyes=0, crack=3)
    head = full.crop((hx - 16, hy - 20, hx + 18, hy + 32))
    def crumble(k):
        body = squash(full, 1 - k * 0.75, BS_FEET + 1)
        out = on(body, rubble(k))
        if k >= 0.6:
            hd = head.rotate(-20, expand=True, resample=Image.NEAREST)
            out = on(out, shift(Image.new('RGBA', (BS, BS)), 0, 0))
            out.alpha_composite(hd, (64, BS_FEET + 1 - hd.height + 2 - int(14 * (1 - k))))
        return out
    save_boss('sphinx', 'death', [flash(S(rise=0.3, eyes=0), WHITE), S(eyes=0, crack=1), S(eyes=0, crack=3), crumble(0.3), crumble(0.6), crumble(0.9), crumble(1.0)])


# ================================================================== PROPS
def sluicewheel(k):
    """A sluice wheel: a big red iron valve wheel with six spokes on a geared iron post, a lever plate showing the state
    (k 0 = closed: the wheel straight and a red mark; 1 = open: the wheel turned and a green mark)."""
    p = Pic(36, 56)
    p.r(14, 26, 21, 55, I1); p.l(14, 26, 14, 55, I2); p.l(21, 26, 21, 55, I0)
    p.r(9, 50, 26, 55, I0); p.r(10, 50, 25, 52, I2)
    cx, cy, R = 17.5, 18, 13
    rot = k * 0.5
    p.e(cx - R, cy - R, cx + R, cy + R, (120, 24, 20)); p.e(cx - R + 3, cy - R + 3, cx + R - 3, cy + R - 3, (0, 0, 0, 0))
    p.arc(cx - R, cy - R, cx + R, cy + R, 200, 300, (200, 70, 60), 2)
    for j in range(6):
        a = rot + j / 6 * TAU
        p.l(cx, cy, cx + math.cos(a) * (R - 1), cy + math.sin(a) * (R - 1), (150, 30, 26), 2)
        p.p(cx + math.cos(a) * R, cy + math.sin(a) * R, (230, 110, 90))
    ell(p, cx, cy, 3, 3, I2); p.p(cx - 1, cy - 1, I3)
    p.r(13, 36, 22, 42, BR1); p.r(16, 37, 19, 41, (60, 200, 70) if k else (220, 40, 30))
    return outline_same(p.im)


def sluice(k):
    """The sluice gate as a sprite (64x64): k 0 = closed - a heavy rusty iron grate of bars and cross rails filling the
    opening; 1 = open - nothing (the game shows the sludge channel)."""
    p = Pic(64, 64)
    if k:
        return p.im
    p.r(2, 2, 61, 6, RUST[1]); p.r(2, 57, 61, 61, RUST[1]); p.l(2, 2, 61, 2, RUST[3])
    for x in range(4, 61, 7):
        p.r(x, 6, x + 2, 57, I1); p.l(x, 6, x, 57, I2)
    for y in (22, 40):
        p.r(2, y, 61, y + 3, RUST[1]); p.l(2, y, 61, y, RUST[3])
        for x in range(5, 61, 7):
            p.p(x, y + 1, I3)
    return outline_same(p.im)


def ratnest(k):
    """A rat nest: a heap of rotten straw, rags and gnawed bones with red eyes glinting in its holes; k 1 = broken
    (flattened, scattered straw and bones, no eyes)."""
    p = Pic(48, 36)
    r2 = random.Random(77)
    if not k:
        p.e(2, 8, 46, 40, (70, 58, 36)); p.e(6, 10, 42, 36, (104, 88, 52))
        for _ in range(40):
            x, y = r2.uniform(4, 44), r2.uniform(10, 34)
            a = r2.uniform(-0.8, 0.8)
            p.l(x, y, x + math.cos(a) * 5, y + math.sin(a) * 2, r2.choice(((150, 128, 72), (120, 100, 58), (88, 72, 44))))
        p.r(14, 18, 22, 22, (120, 60, 70)); p.r(30, 14, 38, 19, (80, 90, 110))
        for x, y in ((12, 26), (32, 25), (24, 14)):
            p.e(x - 3, y - 2, x + 3, y + 2, (14, 10, 8)); p.p(x - 1, y, (230, 40, 30)); p.p(x + 1, y, (230, 40, 30))
        p.l(36, 30, 44, 27, (210, 200, 176), 2); p.l(4, 31, 10, 33, (210, 200, 176), 2)
    else:
        p.e(2, 26, 46, 40, (70, 58, 36)); p.e(6, 28, 42, 38, (104, 88, 52))
        for _ in range(40):
            x, y = r2.uniform(2, 46), r2.uniform(26, 35)
            a = r2.uniform(-0.6, 0.6)
            p.l(x, y, x + math.cos(a) * 5, y + math.sin(a) * 2, r2.choice(((150, 128, 72), (120, 100, 58), (88, 72, 44))))
        p.l(30, 30, 38, 33, (210, 200, 176), 2); p.l(6, 32, 12, 30, (210, 200, 176), 2); p.r(16, 30, 22, 33, (120, 60, 70))
    return outline_same(p.im)


def cactus():
    """A saguaro cactus: a tall ribbed trunk with two arms, spines, and a pink flower on top, in a little sand mound."""
    p = Pic(36, 60)
    def arm(x0, y0, x1, y1, ytop):
        p.r(min(x0, x1), y1 - 3, max(x0, x1), y1 + 1, CACT[2])
        p.r(x1 - 2, ytop, x1 + 2, y1 + 1, CACT[2]); p.e(x1 - 2, ytop - 2, x1 + 2, ytop + 2, CACT[2])
        p.l(x1 - 2, ytop, x1 - 2, y1, CACT[3])
    arm(16, 30, 6, 32, 16)
    arm(20, 24, 29, 26, 12)
    p.r(13, 6, 22, 57, CACT[2]); p.e(13, 2, 22, 10, CACT[2])
    p.l(14, 6, 14, 56, CACT[3]); p.l(17, 4, 17, 56, CACT[1]); p.l(20, 5, 20, 56, CACT[1])
    for y in range(8, 56, 4):
        p.p(12, y, (230, 226, 190)); p.p(23, y + 2, (230, 226, 190))
    ell(p, 17.5, 3, 2.5, 2, (230, 110, 150)); p.p(17, 2, (255, 200, 220))
    p.e(6, 54, 30, 62, SAND[2]); p.l(8, 55, 26, 55, SAND[4])
    return outline_same(p.im, CACT[0])


def amphora(k):
    """A tall clay amphora (water jar) with two handles and a painted black band; k 1 = smashed: the lower half standing
    in shards with a wet stain."""
    p = Pic(30, 44)
    TC = ((90, 44, 24), (140, 74, 40), (180, 106, 62), (210, 144, 96))
    if not k:
        p.poly([(11, 4), (19, 4), (18, 9), (25, 16), (26, 28), (20, 38), (17, 43), (13, 43), (10, 38), (4, 28), (5, 16), (12, 9)], TC[1])
        p.poly([(12, 10), (16, 10), (12, 18), (8, 28), (11, 37), (7, 28), (7, 17)], TC[2])
        p.r(10, 2, 20, 5, TC[2]); p.l(10, 2, 20, 2, TC[3])
        p.arc(4, 6, 12, 18, 90, 270, TC[1], 2); p.arc(18, 6, 26, 18, 270, 450, TC[1], 2)
        p.l(5, 22, 25, 22, (30, 20, 16), 2)
        for x in range(7, 24, 4):
            p.p(x, 25, (30, 20, 16))
    else:
        p.poly([(6, 30), (9, 26), (12, 30), (16, 25), (20, 29), (24, 27), (24, 32), (20, 38), (17, 43), (13, 43), (10, 38), (6, 32)], TC[1])
        p.e(12, 28, 20, 32, (30, 16, 10))
        p.e(0, 40, 30, 44, (70, 60, 44))
        for x, y in ((2, 40), (25, 39), (7, 41), (22, 42)):
            p.poly([(x, y), (x + 4, y - 2), (x + 3, y + 2)], TC[2])
    return outline_same(p.im)


def brazier2(k):
    """A bronze fire bowl on three legs with a burning fire (2 frames, the flames flicker)."""
    p = Pic(32, 48)
    p.l(16, 30, 8, 47, BR1, 2); p.l(16, 30, 24, 47, BR1, 2); p.l(16, 30, 16, 47, BR2, 2)
    p.poly([(3, 22), (29, 22), (24, 32), (8, 32)], BR1); p.l(3, 22, 29, 22, BR3, 2)
    for x in (8, 16, 24):
        p.p(x, 27, BR4)
    flame(p, 11 + k, 21, 10 + k * 2, -1.2, 1.4); flame(p, 21 - k, 21, 9 + (1 - k) * 3, 1.0, 1.3); flame(p, 16, 21, 14 + (1 - k) * 2, 0.5 - k, 1.8)
    im = outline_same(p.im)
    q = Pic(32, 48)
    halo(q, 16, 12, 10, (F3, F2), 10, k + 7)
    return on(im, q.im)


def beartrap(k, s=1.0, w=40, h=24):
    """A bear trap on the floor: a round iron base plate and spring, two toothed jaws; k 0 = open (the jaws lie flat
    each side, teeth up), 1 = snapped shut (the jaws stand up, teeth meshed)."""
    p = Pic(w, h)
    cx, b = w / 2, h - 3
    p.e(cx - 16 * s, b - 4 * s, cx + 16 * s, b + 2 * s, I0)
    p.e(cx - 6 * s, b - 3 * s, cx + 6 * s, b + 1 * s, I2); p.e(cx - 3 * s, b - 2 * s, cx + 3 * s, b, BR2)
    p.l(cx - 18 * s, b, cx - 13 * s, b - 1 * s, I1, 2); p.l(cx + 13 * s, b - 1 * s, cx + 18 * s, b, I1, 2)
    if not k:
        for sg in (-1, 1):
            p.arc(cx + sg * 10 * s - 8 * s, b - 5 * s, cx + sg * 10 * s + 8 * s, b + 3 * s, 180, 360, I2, 2)
            for j in range(5):
                x = cx + sg * (4 + j * 3) * s
                p.l(x, b - 4 * s, x, b - 7 * s, I3)
    else:
        p.arc(cx - 12 * s, b - 18 * s, cx + 12 * s, b + 2 * s, 180, 360, I2, 3)
        p.arc(cx - 11 * s, b - 16 * s, cx + 11 * s, b + 2 * s, 180, 360, I1, 1)
        for j in range(7):
            x = cx - 9 * s + j * 3 * s
            p.l(x, b - 9 * s - (j % 2) * 2, x + 1, b - 13 * s + (j % 2) * 2, I3)
    return outline_same(p.im)


@builder('props')
def make_props():
    save_prop('sluicewheel', [sluicewheel(k) for k in range(2)])
    save_prop('sluice', [sluice(k) for k in range(2)], 64, 64)
    save_prop('ratnest', [ratnest(k) for k in range(2)], 48, 36)
    save_prop('cactus', [cactus()])
    save_prop('amphora', [amphora(k) for k in range(2)], 30, 44)
    save_prop('brazier2', [brazier2(k) for k in range(2)])
    save_prop('beartrap', [beartrap(k) for k in range(2)], 40, 24)


# ================================================================== ITEMS, PARTICLES AND ICONS
@builder('items')
def make_items():
    p = Pic(22, 18)                                                           # a crate of bear traps (ammo for the trap thrower)
    p.r(1, 5, 20, 17, WD2); p.l(1, 5, 20, 5, WD4); p.l(1, 11, 20, 11, WD1); p.r(1, 5, 3, 17, WD3); p.r(18, 5, 20, 17, WD1)
    p.arc(5, 0, 16, 10, 180, 360, I2, 2)
    for x in range(6, 16, 2):
        p.p(x, 2 + (x % 4 == 0), I3)
    p.r(8, 12, 13, 15, I1); p.p(10, 13, I3)
    save(hard(outline_same(p.im)), G_OUT + 'item_trapbox.png')
    p = Pic(44, 16)                                                           # the scimitar's pickup, lying on its side
    scimitar(p, 8, 8, 1.57, 30, 3.2)
    im = outline_same(p.im)
    save(hard(im.crop(im.getbbox())), G_OUT + 'pick_scimitar.png')
    im = beartrap(1, 0.8, 32, 20)                                             # the trap thrower's pickup: a shut bear trap with a sling strap
    q = Pic(32, 20); q.arc(4, 2, 28, 22, 200, 340, (110, 70, 40), 2)
    im = on(outline_same(q.im), im)
    save(hard(im.crop(im.getbbox())), G_OUT + 'pick_trapthrower.png')


@builder('particles')
def make_particles():
    fr = []                                                                   # a sludge blob (2 frames 8x8: flying, splatting)
    for k in range(2):
        p = Pic(8, 8)
        if k == 0:
            shade_ball(p, 3.5, 3.5, 3, (SLG[0], SLG[2], SLG[3], SLIME[2]))
        else:
            p.e(0, 4, 7, 7, SLG[1]); p.e(1, 4, 6, 6, SLG[2]); p.p(0, 2, SLG[2]); p.p(6, 1, SLG[2]); p.p(3, 3, SLIME[2])
        fr.append(p.im)
    save(cells(fr, 8, 8), G_OUT + 'part_sludge.png', 2)
    fr = []                                                                   # blowing sand grains (2 frames 8x8)
    for k in range(2):
        p = Pic(8, 8)
        r2 = random.Random(500 + k)
        for j in range(6):
            x, y = r2.randrange(0, 7), r2.randrange(0, 8)
            p.p(x, y, SAND[(j % 3) + 2]); p.p(x + 1, y, SAND[2])
        fr.append(p.im)
    save(cells(fr, 8, 8), G_OUT + 'part_sand2.png', 2)
    fr = []                                                                   # a puff of hot steam (2 frames 10x10: small, spreading)
    for k in range(2):
        p = Pic(10, 10)
        r = 3 + k
        p.e(5 - r, 5 - r, 5 + r - 1, 5 + r - 1, (170, 176, 176)); p.e(5 - r + 1, 5 - r, 5 + r - 2, 5 + r - 3, (214, 218, 216))
        p.p(4 - k, 3 - k, WHITE)
        fr.append(p.im)
    save(cells(fr, 10, 10), G_OUT + 'part_steam2.png', 2)


@builder('icons')
def make_icons():
    p = Pic(8, 8)                                                             # HUD: in sludge (drips over a puddle)
    p.bitmap(0, 0, ["#..#..#.", "#..#..#.", "...#....", "#.....#.", "........", ".######.", "########", ".######."], {'#': WHITE})
    save(p.im, G_OUT + 'icon_sludge.png')
    p = Pic(8, 8)                                                             # HUD: a leech stuck on you (a ringed worm with a sucker)
    p.bitmap(0, 0, ["........", "....###.", "...#.#.#", "..#.###.", ".#.#....", "#.#.....", ".#......", "........"], {'#': WHITE})
    save(p.im, G_OUT + 'icon_leech.png')


# ================================================================== CONTACT SHEET AND CHECKS
NEW_WEAPONS = ('scimitar', 'trapthrower')


def make_sheet():
    man = _manifest()
    try:   # the first-person weapons come from tools/weapon-frames (render-static.mjs + pack.py)
        wf = json.loads(re.search(r'= (\{.*\});', open(ROOT + '/js/weapons.js').read()).group(1))
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
        if im.width > 1780 and n > 1:
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
    """Style rules: every pixel fully opaque or fully transparent (textures are opaque), strips divide evenly into their
    frames, nothing below the feet row of enemy / boss cells, figures not clipped by the cell edges; textures 64x128 /
    64x64 with a mean brightness of 40-115 (desert sand 90-105)."""
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
        if path.startswith(W_OUT):
            want = (64, 128) if '/wall_' in path else (64, 64)
            lum = lum_of(np.array(im.convert('RGB')))
            lo, hi = (90, 105) if os.path.basename(path) in ('floor_desertsand.png', 'wall_dune.png') else (40, 115)
            ok = im.size == want and lo <= lum <= hi
            print(f'  {os.path.basename(path)}: {im.size[0]}x{im.size[1]} mean luminance {lum:.0f}' + ('' if ok else '  <-- OUT OF RANGE'))
    if bad:
        print('PARTIAL ALPHA:', bad)
    for tag, b in EDGE:
        print('TOUCHES EDGE:', tag, b)


def bbox_report():
    """Figure sizes per sheet (idle frame 0) for the suggested sizes: apparent height = size x figure px / cell px."""
    for path in sorted(SAVED):
        nm = os.path.basename(path)
        if nm.endswith('_idle.png'):
            im = Image.open(path)
            c = im.crop((0, 0, im.height, im.height))
            b = c.getbbox()
            print(f'  {nm}: cell {im.height}, figure {b[2] - b[0]}x{b[3] - b[1]} px, rows {b[1]}..{b[3] - 1}')


def tile_preview():
    """Scratch check of the seams: every texture tiled 3x2."""
    ws = [p for p in sorted(_manifest()) if p.startswith(W_OUT) and os.path.exists(p)]
    if not ws:
        return
    out = Image.new('RGB', (len(ws) * 200, 264), (104, 104, 104))
    for i, p in enumerate(ws):
        im = Image.open(p).convert('RGB')
        for tx in range(3):
            for ty in range(2):
                if im.height == 128 and ty:
                    continue
                out.paste(im, (i * 200 + tx * 64, ty * 64))
    out.save(SCR + 'v20_tiles.png')


@builder('sheet')
def _sheet_placeholder():
    pass


# ================================================================== MAIN
if __name__ == '__main__':
    want = sys.argv[1:]
    for name, fn in BUILDERS.items():
        if not want or name in want:
            fn()
    check_outputs()
    bbox_report()
    tile_preview()
    make_sheet()
    print('klart')
