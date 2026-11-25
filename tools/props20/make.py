#!/usr/bin/env python3
"""Version 23 graphics for Krypta ("Slakteriet och Slagfältet"): the abattoir and the eternal battlefield, eight new
enemies, the master butcher and the warlord, textures, props, items, particles and HUD icons.

Run from anywhere:  python3 -B tools/props20/make.py [name ...]   (contact sheet <scratchpad>/en/v23_sheet.png, seams v23_tiles.png)
The first-person weapons hookchain / bombard come from tools/props20/fp_defs.py + tools/weapon-frames (render-static.mjs,
pack.py, pixelstyle.py, the glove of glove_def.py); the unstyled packed strips are kept in tools/props20/fp_orig/.

Name clash: floor_mud already exists, so the battlefield mud is floor_battlemud. The boss id 'butcher' was free, so the
master butcher is boss_butcher_* (with wall_boss_butcher / floor_boss_butcher); the enemy butcher is enemies-butcher_*.
The abattoir is kept grim but not gory: old dark stains, wrapped meat, a crawler wrapped in rags.

Out to assets/gfx (enemy cells 64x64, feet row 57, idle 4, movement 6, attack 6, take_damage 3, death 6):
  enemies-butcher_*      a heavy butcher in a stained apron and flat cap (attack = throws his cleaver)
  enemies-pigman_*       a stocky pig-headed man in dungarees (attack = the head-down charge, dust behind)
  enemies-flies_*        a buzzing cloud of black flies in three clumps (attack = they pack together and dive)
  enemies-crawler_*      the upper half of a pale ghoul dragging itself on its arms, rags trailing (low)
  enemies-ghostsoldier_* a dithered spectral foot soldier with kettle helm, round shield and sword
  enemies-ghostarcher_*  a hooded spectral archer with a longbow (attack = aims high, draws, looses)
  enemies-ghostrider_*   a spectral knight on a ghost horse with a couched lance (attack = rears and charges)
  enemies-crows_*        a flock of three crows (attack = the front crow dives)
  boss_butcher_{idle,attack,cast,hurt,death} (116x116; attack = cleaver chop with tile chips, cast = hook on a chain)
  boss_warlord_{...} (ghost knight with horned helm and greatsword; attack = sword whirl, cast = war horn; death fades out)
  prop_meathook (2, 32x64, hangs from row 0), prop_butcherblock (1), prop_bandsaw (2, 36x64), prop_catapult (1),
  prop_warbanner (2, 36x64), prop_stakes (1), pick_hookchain, pick_bombard, item_cannonballs, part_flies, part_mud
  (2, 8x8), part_ghostwisp (2, 10x10), icon_slick, icon_mud (8x8)
Out to assets/wall: wall_abattoirtile, wall_coldroom, wall_boss_butcher, wall_palisade, wall_earthwork, wall_boss_warlord
  (64x128); floor_abattoir, floor_bloodgrate, floor_boss_butcher, floor_bloodslick, floor_grinder, floor_battlemud,
  floor_trench, floor_deepmud, floor_target, floor_boss_warlord (64x64), mean brightness 40-115.
Everything is drawn procedurally with the helpers of tools/props2-props19 (no outside image).
"""
import importlib.util
import json
import math
import os
import random
import re
import sys

sys.dont_write_bytecode = True

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))


def _load(name, rel):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, '..', rel, 'make.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


P19 = _load('props19make', 'props19')          # loads props2-props18 itself; only pure drawing helpers are used
P18, P17 = P19.P18, P19.P17
P16 = P17.P16
for _k in ('Pic outline outline_same hard shift gmap blend tint shear squash strip cut_below pool pnoise spark dark flash tube '
           'bez puff flame halo put dust wrap_pic poly_r ell shade_ball on cells rig fall pt stops stone_rgb x2 plank_v plank_h '
           'I0 I1 I2 I3 F0 F1 F2 F3 AU0 AU1 AU2 AU3 AU4 BR0 BR1 BR2 BR3 BR4 WD0 WD1 WD2 WD3 WD4 SKIN BLK RUST SLG SLIME PINK '
           'flipv ground_it').split():
    globals()[_k] = getattr(P17, _k)
for _k in 'GLOW SEA DIRT LEATH HOOD BLOOD drips glow_pic'.split():
    globals()[_k] = getattr(P18, _k)
for _k in ('dither_hole flames LAVA ASHP BONE FLESH CHAR STEAMC TOGA MOLD PALE marble_rgb blocks').split():
    globals()[_k] = getattr(P19, _k)
sink, helmet = P16.sink, P16.helmet

G_OUT, W_OUT = ROOT + '/assets/gfx/', ROOT + '/assets/wall/'
SCR = '/tmp/claude-0/-home-user/80ee56ba-2fa6-5354-b261-a4ca4fdcb508/scratchpad/en/'
SHEET, MANIFEST = SCR + 'v23_sheet.png', SCR + 'v23_manifest.json'
WHITE = (255, 255, 255)
FW, FEET = 64, 57                                       # enemy cells
BS, BS_FEET = 116, 115                                  # boss cells
TAU = math.tau

# ---------------------------------------------------------------- abattoir palettes
TILE = ((46, 50, 46), (74, 80, 72), (104, 110, 98), (132, 138, 124), (156, 160, 146))    # grimy white tiles, dimmed
GROUT = (34, 32, 28)
STAIN = ((54, 14, 10), (84, 22, 16), (112, 34, 24))                                       # old dark blood stains
STEELC = ((40, 44, 50), (66, 72, 80), (98, 106, 114), (140, 148, 156), (188, 196, 204))
FROST = ((120, 140, 156), (160, 180, 196), (206, 222, 232))
APRON = ((96, 92, 84), (138, 132, 120), (176, 170, 156), (206, 200, 186))
PIG = ((112, 64, 62), (160, 102, 96), (198, 140, 130), (226, 180, 168))
MEAT = ((70, 20, 18), (110, 36, 30), (150, 60, 48), (184, 96, 80))
FLY = ((12, 14, 12), (30, 34, 30), (60, 110, 90), (120, 170, 150))
# ---------------------------------------------------------------- battlefield palettes
MUD = ((32, 24, 18), (52, 40, 28), (74, 58, 40), (98, 80, 56), (124, 104, 76))
GHO = ((34, 56, 64), (62, 96, 104), (100, 144, 150), (156, 204, 204), (214, 246, 240))   # spectral cyan-grey
ARM = ((44, 48, 56), (72, 78, 88), (108, 116, 126), (156, 164, 172))
BAN = ((80, 18, 16), (128, 32, 24), (170, 56, 38), (206, 96, 64))
CROW = ((14, 14, 18), (30, 30, 38), (52, 52, 64), (84, 84, 100))
SKYG = ((60, 62, 66), (84, 86, 90), (110, 112, 114))

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
    im = cells(frames, w, h) if w else strip(frames)
    return save(im, G_OUT + f'prop_{name}.png', len(frames))


# Ersatta av AI-texturer (tools/cfart/, Cloudflare Workers AI + efterbehandling): skrivs inte över härifrån.
CFART = {'floor_battlemud.png', 'floor_trench.png'}


def finish(rgb, name, colors=48, half=True):
    if name in CFART:
        return None
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


def put_rgb(rgb, im):
    """Composite an RGBA picture onto an RGB array of the same size."""
    put(rgb, im)


# ================================================================== ABATTOIR TEXTURES
def tile_rgb(w, h, seed, size=8, k=1.0, stains=0.18):
    """Square glazed tiles (half-res, tiles both ways): grimy off-white with darker grout, chips and old stains."""
    nz = pnoise(w, h, seed, ((16, 1.0), (8, 0.5), (4, 0.25)))
    rgb = gmap(np.clip((0.4 + nz * 0.45) * k, 0, 1), stops(TILE))
    yy, xx = np.mgrid[0:h, 0:w]
    r2 = random.Random(seed)
    shade = np.array([[r2.uniform(-0.1, 0.1) for _ in range(w // size + 1)] for _ in range(h // size + 1)])
    rgb = rgb * (1 + shade[yy // size, xx // size][..., None])
    rgb[(xx % size == 0) | (yy % size == 0)] = GROUT
    rgb[(xx % size == 1) & (yy % size != 0)] *= 1.12
    sz = pnoise(w, h, seed + 3, ((16, 1.0), (8, 0.5)))
    m = sz > 1 - stains
    rgb[m] = rgb[m] * 0.5 + np.array(STAIN[1]) * 0.5
    for _ in range(6):
        x, y = r2.randrange(w), r2.randrange(h)
        rgb[y, x] = TILE[0]
    return rgb


def splash(rgb, seed, n=3, y0=0, y1=None):
    """A few old dark splash marks with short runs down (half-res)."""
    h, w = rgb.shape[:2]
    y1 = y1 or h
    r2 = random.Random(seed)
    for _ in range(n):
        cx, cy = r2.randrange(w), r2.randrange(y0, y1)
        for _ in range(10):
            x, y = (cx + r2.randint(-3, 3)) % w, min(h - 1, max(0, cy + r2.randint(-2, 2)))
            rgb[y, x] = STAIN[r2.randrange(0, 2)]
        x = cx
        for y in range(cy, min(h, cy + r2.randint(4, 12))):
            rgb[y, x % w] = rgb[y, x % w] * 0.4 + np.array(STAIN[0]) * 0.6


def tex_wall_abattoirtile():
    """Slaughterhouse wall: grimy square tiles over a dark tiled dado, a steel hanging rail near the top, old dark splashes."""
    w, h = 32, 64
    rgb = tile_rgb(w, h, 2601)
    rgb[44:] = tile_rgb(w, 20, 2602, 4, 0.7)[:20]
    rgb[43] = GROUT; rgb[44] = TILE[1]
    rgb[5:7] = STEELC[2]; rgb[5] = STEELC[3]; rgb[7] = STEELC[0]
    for x in (4, 20):
        rgb[3:5, x] = STEELC[1]
    splash(rgb, 2603, 3, 20, 56)
    finish(rgb, 'wall_abattoirtile.png', 40)


def tex_wall_coldroom():
    """A cold-room wall: riveted steel panels, frost creeping in from the edges, a thermometer and a door handle."""
    w, h = 32, 64
    nz = pnoise(w, h, 2611, ((16, 1.0), (8, 0.4)))
    rgb = gmap(np.clip(0.35 + nz * 0.35, 0, 1), stops(STEELC))
    for y in (0, 21, 42):
        rgb[y] = STEELC[0]; rgb[y + 1] = STEELC[3]
        for x in range(2, 32, 5):
            rgb[y + 3, x] = STEELC[4]; rgb[y + 18, x] = STEELC[4]
    rgb[:, 0] = STEELC[0]; rgb[:, 16] = STEELC[0]; rgb[:, 17] = STEELC[3]
    fz = pnoise(w, h, 2612, ((8, 1.0), (4, 0.5)))
    yy, xx = np.mgrid[0:h, 0:w]
    edge = np.minimum(np.minimum(xx, w - 1 - xx), np.minimum(yy, h - 1 - yy)) / 10
    m = fz - edge > 0.35
    rgb[m] = rgb[m] * 0.4 + np.array(FROST[1]) * 0.6
    rgb[m & (fz - edge > 0.55)] = FROST[2]
    p = Pic(w, h)
    p.r(24, 26, 26, 36, FROST[2]); p.r(25, 30, 25, 35, (170, 30, 24)); p.e(23, 35, 27, 38, (170, 30, 24))
    p.r(9, 30, 12, 40, STEELC[1]); p.l(9, 30, 12, 30, STEELC[4])
    put(rgb, outline_same(p.im))
    finish(rgb, 'wall_coldroom.png', 40)


def tex_wall_boss_butcher():
    """The butcher's wall: tiles behind a big rusty cleaver hung on two hooks with a chain, a row of meat hooks and a pig
    skull mounted above, old dark stains running to the floor."""
    w, h = 64, 128
    rgb = x2(tile_rgb(32, 64, 2621, 8, 0.95))
    p = Pic(w, h)
    p.l(4, 10, 59, 10, STEELC[2], 2); p.l(4, 9, 59, 9, STEELC[4])
    for x in (10, 22, 42, 54):
        p.arc(x - 3, 11, x + 3, 19, 0, 180, STEELC[3], 2); p.l(x + 3, 11, x + 3, 15, STEELC[3])
    p.poly([(14, 40), (48, 40), (50, 74), (14, 74)], STEELC[2]); p.l(14, 74, 50, 74, STEELC[4], 2); p.l(48, 40, 50, 74, STEELC[3])
    p.e(40, 45, 45, 50, (0, 0, 0, 0)); p.r(22, 74, 30, 98, (60, 40, 26)); p.l(22, 74, 22, 98, (90, 64, 40))
    for j in range(4):
        p.p(26, 78 + j * 5, BR3)
    rust = random.Random(2622)
    for _ in range(30):
        p.p(rust.uniform(15, 49), rust.uniform(41, 73), RUST[rust.randrange(1, 4)])
    p.l(20, 40, 26, 22, STEELC[1]); p.l(44, 40, 38, 22, STEELC[1])
    p.e(25, 22, 39, 34, BONE[3]); p.poly([(29, 30), (35, 30), (36, 36), (28, 36)], BONE[3]); p.e(28, 31, 31, 34, BONE[1]); p.e(33, 31, 36, 34, BONE[1])
    p.e(27, 26, 30, 29, GROUT); p.e(34, 26, 37, 29, GROUT); p.poly([(25, 22), (21, 16), (27, 21)], BONE[2]); p.poly([(39, 22), (43, 16), (37, 21)], BONE[2])
    put(rgb, outline_same(p.im))
    sm = rgb[::2, ::2].copy(); splash(sm, 2623, 4, 40, 60); rgb[:] = x2(sm)
    finish(rgb, 'wall_boss_butcher.png', 64, half=False)


def tex_floor_abattoir():
    finish(tile_rgb(32, 32, 2631, 8, 0.9, 0.12), 'floor_abattoir.png', 32)


def grate_pic(x0, y0, x1, y1):
    p = Pic(64, 64)
    p.r(x0 - 2, y0 - 2, x1 + 2, y1 + 2, STEELC[0]); p.r(x0, y0, x1, y1, (10, 8, 8))
    for x in range(int(x0) + 2, int(x1), 4):
        p.l(x, y0, x, y1, STEELC[2]); p.l(x + 1, y0, x + 1, y1, STEELC[1])
    p.l(x0, y0, x1, y0, STEELC[3])
    return p


def tex_floor_bloodgrate():
    """Tiles round a square steel drain grate with dark stains running into it."""
    rgb = x2(tile_rgb(32, 32, 2641, 8, 0.9, 0.2))
    yy, xx = np.mgrid[0:64, 0:64]
    nz = pnoise(64, 64, 2642, ((16, 1.0), (8, 0.5)))
    m = (np.hypot(xx - 31.5, yy - 31.5) + (nz - 0.5) * 20) < 20
    rgb[m] = rgb[m] * 0.45 + np.array(STAIN[0]) * 0.55
    put(rgb, outline_same(grate_pic(20, 20, 43, 43).im))
    finish(rgb, 'floor_bloodgrate.png', 40, half=False)


def tex_floor_boss_butcher():
    """The butcher's floor: tiles round a big round drain, chop marks and a wide old stain."""
    rgb = x2(tile_rgb(32, 32, 2651, 8, 0.85, 0.35))
    p = Pic(64, 64)
    p.e(16, 16, 47, 47, STEELC[0]); p.e(18, 18, 45, 45, STEELC[2]); p.e(21, 21, 42, 42, (10, 8, 8))
    for j in range(-3, 4):
        p.l(31.5 + j * 3, 22, 31.5 + j * 3, 41, STEELC[1])
    for x, y, a in ((8, 10, 0.4), (54, 50, -0.6), (50, 8, 2.1), (10, 54, 1.1)):
        p.l(x, y, x + math.cos(a) * 7, y + math.sin(a) * 7, GROUT, 2)
    put(rgb, outline_same(p.im))
    finish(rgb, 'floor_boss_butcher.png', 48, half=False)


def tex_floor_bloodslick():
    """A slick floor: the tiles under a glossy dark-red film with bright highlight streaks (it reads as slippery)."""
    rgb = x2(tile_rgb(32, 32, 2661, 8, 0.85, 0.0)) * 0.45 + np.array(STAIN[1]) * 0.55
    yy, xx = np.mgrid[0:64, 0:64]
    nz = pnoise(64, 64, 2662, ((16, 1.0), (8, 0.5)))
    hl = np.abs(np.sin((xx * 0.6 + yy + nz * 30) / 9)) > 0.96
    rgb[hl] = (176, 92, 80)
    finish(rgb, 'floor_bloodslick.png', 40, half=False)


def tex_floor_grinder():
    """A meat grinder pit: two rows of toothed steel rollers in a dark trough, a yellow-black hazard border round it."""
    rgb = x2(tile_rgb(32, 32, 2671, 8, 0.8, 0.1))
    p = Pic(64, 64)
    for j in range(0, 64, 6):
        p.poly([(j, 0), (j + 3, 0), (j - 3, 6), (j - 6, 6)], (190, 160, 30))
        p.poly([(j, 58), (j + 3, 58), (j - 3, 64), (j - 6, 64)], (190, 160, 30))
    p.r(4, 8, 59, 55, (8, 6, 6))
    for row, y in enumerate((18, 40)):
        p.r(5, y - 7, 58, y + 7, STEELC[1]); p.l(5, y - 7, 58, y - 7, STEELC[3])
        for x in range(7, 58, 4):
            p.poly([(x, y - 7), (x + 2, y - 10), (x + 3, y - 7)], STEELC[4])
            p.poly([(x, y + 7), (x + 2, y + 10), (x + 3, y + 7)], STEELC[3])
        p.l(5, y, 58, y, STEELC[0])
    p.r(5, 26, 58, 32, MEAT[0])
    put(rgb, outline_same(p.im))
    finish(rgb, 'floor_grinder.png', 40, half=False)


# ================================================================== BATTLEFIELD TEXTURES
def mud_rgb(seed, k=1.0, wet=0.2):
    w = h = 32
    nz = pnoise(w, h, seed, ((16, 1.0), (8, 0.6), (4, 0.3)))
    yy, xx = np.mgrid[0:h, 0:w]
    rut = np.sin((xx + nz * 10) / w * TAU * 3) * 0.5 + 0.5
    rgb = gmap(np.clip((0.25 + nz * 0.45 + rut * 0.15) * k, 0, 1), stops(MUD))
    wz = pnoise(w, h, seed + 2, ((16, 1.0), (8, 0.5))) > 1 - wet
    rgb[wz] = rgb[wz] * 0.5 + np.array(SKYG[0]) * 0.5
    return rgb


def tex_wall_palisade():
    """A palisade: tall sharpened logs lashed together with rope, the pointed tops against a grey smoky sky, a dark muddy
    foot."""
    w, h = 32, 64
    rgb = np.zeros((h, w, 3)) + np.array(SKYG[1])
    for i, x0 in enumerate(range(0, 32, 8)):
        top = 6 + (i % 2) * 3
        plank_v(rgb, x0, x0 + 8, top + 3, 64, 2701 + i, (WD0, WD1, WD2, WD3, WD4))
        for d in range(4):
            rgb[top + d, x0 + 3 - d:x0 + 5 + d] = WD2
        rgb[top + 3:, x0] = WD0
    for y in (20, 44):
        rgb[y:y + 2, :] = (120, 100, 66); rgb[y + 2, :] = (70, 56, 36)
    for y in range(54, 64):
        rgb[y] = rgb[y] * (1 - 0.5 * (y - 53) / 10) + np.array(MUD[1]) * 0.5 * (y - 53) / 10
    finish(rgb, 'wall_palisade.png', 40)


def tex_wall_earthwork():
    """An earthwork rampart: packed earth in layers with stones, a revetment of wicker gabions and stakes along the top."""
    w, h = 32, 64
    rgb = mud_rgb(2711, 1.1, 0.0)
    rgb = np.concatenate([rgb, mud_rgb(2712, 1.05, 0.0)], 0)
    yy, xx = np.mgrid[0:h, 0:w]
    rgb[(yy % 9) == 0] *= 0.7
    r2 = random.Random(2713)
    for _ in range(14):
        x, y = r2.randrange(w), r2.randrange(12, h)
        rgb[y, x] = (110, 104, 96); rgb[y, (x + 1) % w] = (84, 80, 74)
    for x0 in range(0, 32, 8):
        for y in range(2, 14):
            for x in range(x0, x0 + 8):
                rgb[y, x] = (120, 96, 60) if (x + y) % 3 else (80, 62, 40)
        rgb[2:14, x0] = WD0
    finish(rgb, 'wall_earthwork.png', 40)


def tex_wall_boss_warlord():
    """The warlord's wall: dark timber behind a great tattered war banner - a white skull over crossed swords on red -
    hung from a spear, spectral light seeping from its frayed edges."""
    w, h = 64, 128
    base = np.zeros((64, 32, 3))
    for i, x0 in enumerate(range(0, 32, 8)):
        plank_v(base, x0, x0 + 8, 0, 64, 2721 + i, (WD0, WD1, WD2, WD3, WD4))
    rgb = x2(base) * 0.75
    p = Pic(w, h)
    p.l(6, 12, 58, 12, WD1, 3); p.poly([(58, 8), (63, 12), (58, 16)], ARM[3])
    pts = [(12, 14), (52, 14), (52, 86), (46, 80), (40, 92), (34, 84), (28, 96), (22, 84), (16, 90), (12, 82)]
    p.poly(pts, BAN[1]); p.lines(pts + [pts[0]], BAN[0], 2); p.l(14, 16, 14, 80, BAN[2])
    for a in (-1, 1):
        p.l(32 - a * 12, 66, 32 + a * 12, 44, ARM[3], 2); p.l(32 - a * 12, 66, 32 - a * 9, 63, AU2, 2)
    p.e(24, 34, 40, 50, BONE[4]); p.r(27, 47, 37, 54, BONE[3]); p.e(26, 39, 31, 44, GROUT); p.e(33, 39, 38, 44, GROUT)
    for x in range(28, 37, 2):
        p.p(x, 52, GROUT)
    put(rgb, outline_same(p.im))
    for x, y in ((10, 88), (53, 84), (30, 98), (47, 94)):
        for j in range(6):
            yy = y + j * 2
            if yy < 128:
                rgb[yy, x] = GHO[3] if j % 2 else GHO[2]
    finish(rgb, 'wall_boss_warlord.png', 64, half=False)


def tex_floor_battlemud():
    rgb = mud_rgb(2731)
    r2 = random.Random(2732)
    for _ in range(3):                                                                   # a broken arrow, a hoof print
        x, y = r2.randrange(4, 26), r2.randrange(4, 28)
        rgb[y, x:x + 5] = WD2; rgb[y, x + 5] = I2
    for _ in range(3):
        x, y = r2.randrange(2, 28), r2.randrange(2, 28)
        rgb[y:y + 2, x:x + 2] = MUD[0]
    finish(rgb, 'floor_battlemud.png', 32)


def tex_floor_trench():
    """A trench floor: duckboards (slatted planks on two runners) over wet mud."""
    rgb = mud_rgb(2741, 0.8, 0.35)
    for y0 in range(0, 32, 4):
        plank_h(rgb, 4, 28, y0, y0 + 3, 2742 + y0, (WD0, WD1, WD2, WD3, WD4))
    rgb[:, 6] = WD0; rgb[:, 25] = WD0
    finish(rgb, 'floor_trench.png', 32)


def tex_floor_deepmud():
    """Deep mud: dark, wet and glossy with water standing in the ruts and a few bubbles."""
    rgb = mud_rgb(2751, 0.75, 0.45)
    r2 = random.Random(2752)
    for _ in range(5):
        x, y = r2.randrange(1, 31), r2.randrange(1, 31)
        rgb[y, x] = SKYG[2]; rgb[y + 1, x] = MUD[0]
    finish(rgb, 'floor_deepmud.png', 32)


def tex_floor_target():
    """A catapult target: churned mud with a smashed crater and a red-daubed ring and cross where the stones fall."""
    rgb = x2(mud_rgb(2761))
    p = Pic(64, 64)
    p.e(18, 20, 46, 44, MUD[0]); p.e(21, 23, 43, 40, MUD[1]); p.arc(18, 20, 46, 44, 200, 340, MUD[4], 2)
    p.arc(5, 5, 58, 58, 0, 360, BAN[1], 2)
    p.l(12, 12, 20, 20, BAN[1], 2); p.l(51, 12, 43, 20, BAN[1], 2); p.l(12, 51, 20, 43, BAN[1], 2); p.l(51, 51, 43, 43, BAN[1], 2)
    for x, y in ((28, 28), (36, 33), (31, 37)):
        p.e(x - 2, y - 2, x + 2, y + 2, (96, 92, 86))
    put(rgb, outline_same(p.im))
    finish(rgb, 'floor_target.png', 40, half=False)


def tex_floor_boss_warlord():
    """The warlord's field: trampled mud with a ring of broken shields and spears driven in round a burnt circle."""
    rgb = x2(mud_rgb(2771, 0.95))
    p = Pic(64, 64)
    p.e(14, 14, 49, 49, (30, 24, 20)); p.e(18, 18, 45, 45, MUD[1])
    for j in range(8):
        a = j / 8 * TAU
        x, y = 31.5 + math.cos(a) * 25, 31.5 + math.sin(a) * 25
        if j % 2:
            p.e(x - 4, y - 4, x + 4, y + 4, BAN[1]); p.e(x - 1, y - 1, x + 1, y + 1, ARM[3])
        else:
            p.l(x, y - 4, x, y + 4, WD2, 2); p.p(x, y - 5, ARM[3])
    put(rgb, outline_same(p.im))
    finish(rgb, 'floor_boss_warlord.png', 48, half=False)


@builder('textures')
def make_textures():
    for fn in (tex_wall_abattoirtile, tex_wall_coldroom, tex_wall_boss_butcher, tex_wall_palisade, tex_wall_earthwork, tex_wall_boss_warlord,
               tex_floor_abattoir, tex_floor_bloodgrate, tex_floor_boss_butcher, tex_floor_bloodslick, tex_floor_grinder,
               tex_floor_battlemud, tex_floor_trench, tex_floor_deepmud, tex_floor_target, tex_floor_boss_warlord):
        fn()


# ================================================================== SHARED BITS
def cleaver(p, x, y, a, L=10):
    """A meat cleaver held at (x, y): a short dark handle along a and a broad rectangular steel blade at the end."""
    ex, ey = pt(a, 4, x, y)
    p.l(x, y, ex, ey, WD1, 2)
    u = (math.sin(a), math.cos(a)); v = (u[1], -u[0])
    q = [(ex, ey), (ex + u[0] * L, ey + u[1] * L), (ex + u[0] * L + v[0] * 6, ey + u[1] * L + v[1] * 6), (ex + v[0] * 6, ey + v[1] * 6)]
    p.poly(q, STEELC[2]); p.l(q[2][0], q[2][1], q[3][0], q[3][1], STEELC[4]); p.l(q[0][0], q[0][1], q[1][0], q[1][1], STEELC[1])
    p.p(ex + u[0] * 2 + v[0] * 1.5, ey + u[1] * 2 + v[1] * 1.5, STEELC[0])
    return q[2]


def sword(p, x, y, a, L=13, pal=None):
    pal = pal or (ARM[3], GHO[4], AU2)
    ex, ey = pt(a, L, x, y)
    p.l(x, y, ex, ey, pal[0], 2); p.l(x, y, ex, ey, pal[1])
    u = (math.sin(a), math.cos(a)); v = (u[1], -u[0])
    p.l(x + v[0] * 3, y + v[1] * 3, x - v[0] * 3, y - v[1] * 3, pal[2], 2)
    p.l(x, y, x - u[0] * 3, y - u[1] * 3, WD1, 2)


def ghostly(im, k=0.15, seed=0):
    """Spectral look: a light ordered dither (see-through) on a figure already drawn in ghost colours."""
    return dither_hole(im, k, seed)


# ================================================================== BUTCHER (drawn, 64x64)
def butcher_raw(step=None, bob=0, lean=1.0, aF=(1.0, 0.6), aB=(0.4, 0.5), cl=1.4, eyes=1, crouch=0, mouth=0, fly=None):
    """Side view facing right: a heavy-set butcher - a stained grey-white apron over a dark shirt with rolled sleeves, a
    flat cap, a thick moustache and stubble, rubber boots; a cleaver in the front hand (cl = angle, None = thrown); fly =
    the thrown cleaver spinning through the air."""
    p = Pic(64, 64)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.e(min(sx, hx) - 6, sy, max(sx, hx) + 7, hy + 2, (60, 56, 52))
        p.poly([(sx + 1, sy + 2), (sx + 7, sy + 3), (hx + 8, FEET - 10), (hx - 3, FEET - 10)], APRON[1])
        p.l(sx + 7, sy + 3, hx + 8, FEET - 10, APRON[3]); p.l(sx + 1, sy + 2, sx - 3, hy - 2, APRON[0])
        p.p(hx + 4, hy + 2, STAIN[1]); p.p(hx + 2, hy + 6, STAIN[0]); p.p(sx + 4, sy + 7, STAIN[1])
    def head(p, K):
        x, y = K['head']
        p.l(x + 1, y + 2, x + 6, y + 2, (70, 50, 40), 2)
        if eyes:
            p.p(x + 3, y - 1, BLK[0])
        else:
            p.l(x + 2, y - 1, x + 4, y - 1, BLK[0])
        if mouth:
            p.r(x + 3, y + 3, x + 5, y + 3 + mouth, (60, 20, 20))
        p.e(x - 5, y - 7, x + 4, y - 2, (60, 58, 56)); p.l(x - 4, y - 3, x + 8, y - 3, (40, 38, 36), 2)
        p.p(x - 2, y + 3, SKIN[0]); p.p(x, y + 4, SKIN[0])
    def front(p, K):
        if cl is not None:
            cleaver(p, K['handF'][0], K['handF'][1], cl, 9)
        ell(p, K['handF'][0], K['handF'][1], 1.8, 1.8, SKIN[1])
    rig(p, 28, FEET, LL=14, TL=13, HR=5, step=step, bob=bob, lean=lean, crouch=crouch, legs=((44, 46, 50), (60, 62, 68)), leg_w=5, body=((60, 56, 52), (80, 74, 68)),
        body_w=(7, 8), arms=(SKIN[1], SKIN[2]), arm_w=4, AL=13, aB=aB, aF=aF, skin=SKIN, hands=SKIN[1], shoes=(30, 34, 30),
        on_torso=torso, on_head=head, on_front=front)
    im = outline_same(p.im)
    if fly:
        q = Pic(64, 64); cleaver(q, fly[0], fly[1], fly[2], 7); im = on(im, outline_same(q.im))
    return im


@builder('butcher')
def make_butcher():
    B = butcher_raw
    save_enemy('butcher', 'idle', [B(bob=(0, 0, 1, 0)[i], cl=1.4 + (0, 0.05, 0.1, 0.05)[i]) for i in range(4)])
    save_enemy('butcher', 'movement', [B(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=2) for i in range(6)])
    save_enemy('butcher', 'attack', [B(aF=(2.4, 0.6), cl=3.2, lean=-1, mouth=1), B(aF=(2.9, 0.3), cl=3.8, lean=-2, mouth=2), B(aF=(2.0, 0.1), cl=None, lean=2, mouth=2, fly=(46, 22, 2.0)),
                                     B(aF=(1.4, 0.1), cl=None, lean=3, crouch=2, mouth=1, fly=(54, 28, 3.5)), B(aF=(1.1, 0.4), cl=None, lean=2), B(cl=1.4)])
    save_enemy('butcher', 'take_damage', [flash(B(lean=-3, eyes=0, mouth=2), WHITE), B(lean=-2, mouth=1), B(lean=-1)])
    base = B(eyes=0, cl=None, aF=(1.2, 0.4), aB=(1.0, 0.5), mouth=2)
    q = Pic(64, 64); cleaver(q, 40, FEET - 3, 1.57, 9); cq = outline_same(q.im)
    save_enemy('butcher', 'death', [flash(B(lean=-3, eyes=0, mouth=2), WHITE), on(fall(base, 0.25), cq), on(fall(base, 0.55), cq), on(fall(base, 0.85), cq),
                                    on(fall(base, 1.0), cq), on(fall(base, 1.0), cq)])


# ================================================================== PIGMAN (drawn, 64x64)
def pigman_raw(step=None, bob=0, lean=3.0, aF=(1.2, 0.6), aB=(0.9, 0.6), eyes=1, crouch=0, mouth=0, charge=0):
    """Side view facing right: a stocky pig man - a pink-grey pig head with a big snout, small eyes, floppy ears and short
    tusks, a hunched hairy body in torn dungarees with one strap, thick arms, trotter-like boots; charge 1..2 = head
    down, rushing (dust behind)."""
    p = Pic(64, 64)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.e(min(sx, hx) - 7, sy - 1, max(sx, hx) + 8, hy + 3, PIG[1]); p.e(min(sx, hx) - 4, sy + 1, max(sx, hx) + 6, hy, PIG[2])
        p.poly([(hx - 7, hy - 4), (hx + 8, hy - 4), (hx + 7, hy + 6), (hx - 6, hy + 6)], (60, 70, 90))
        p.l(sx + 3, sy + 1, hx + 4, hy - 4, (50, 58, 76), 2); p.p(hx + 4, hy - 3, BR3)
    def head(p, K):
        x, y = K['head']
        x += 1 + charge; y += charge * 2
        ell(p, x, y, 6, 5.5, PIG[1]); ell(p, x - 1, y - 1, 4.5, 4, PIG[2])
        p.e(x + 4, y - 1, x + 10, y + 5, PIG[2]); p.e(x + 8, y, x + 11, y + 4, PIG[1]); p.p(x + 9, y + 1, PIG[0]); p.p(x + 9, y + 3, PIG[0])
        p.poly([(x - 4, y - 4), (x - 1, y - 9), (x + 1, y - 4)], PIG[0])
        p.poly([(x + 6, y + 5), (x + 8, y + 2), (x + 7, y + 6)], BONE[4])
        if eyes:
            p.p(x + 3, y - 2, BLK[0])
        else:
            p.l(x + 2, y - 2, x + 4, y - 2, BLK[0])
        if mouth:
            p.l(x + 5, y + 5, x + 9, y + 5 + mouth, (70, 20, 24))
    def front(p, K):
        hx, hy = K['handF']
        ell(p, hx, hy, 2.4, 2.4, PIG[2])
    rig(p, 28, FEET, LL=12, TL=13, HR=5, step=step, bob=bob, lean=lean, crouch=crouch, legs=((60, 70, 90), (74, 84, 106)), leg_w=6, body=(PIG[1], PIG[2]),
        body_w=(8, 8), arms=(PIG[1], PIG[2]), arm_w=5, AL=12, aB=aB, aF=aF, skin=PIG, hands=PIG[2], shoes=(40, 30, 26),
        on_torso=torso, on_head=head, on_front=front)
    im = outline_same(p.im)
    if charge:
        q = Pic(64, 64)
        r2 = random.Random(5 + charge)
        for _ in range(4 + charge * 3):
            x, y = r2.uniform(6, 22), r2.uniform(FEET - 8, FEET - 1)
            q.e(x - 2, y - 1.5, x + 2, y + 1.5, MUD[3])
        im = on(q.im, im)
    return im


@builder('pigman')
def make_pigman():
    G = pigman_raw
    save_enemy('pigman', 'idle', [G(bob=(0, 0, 1, 0)[i], mouth=(0, 0, 1, 0)[i]) for i in range(4)])
    save_enemy('pigman', 'movement', [G(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=5, aF=(1.2 + 0.3 * math.sin(i / 6 * TAU), 0.6)) for i in range(6)])
    save_enemy('pigman', 'attack', [G(crouch=3, lean=6, charge=1, mouth=1), G(step=0.25, lean=8, charge=2, mouth=2, aF=(1.6, 0.2), aB=(1.4, 0.3)),
                                    G(step=0.6, lean=9, charge=2, mouth=2, aF=(1.8, 0.1), aB=(1.6, 0.2)), G(lean=8, charge=2, mouth=2, aF=(2.0, 0.0), aB=(1.8, 0.1)),
                                    G(lean=5, charge=1, mouth=1), G()])
    save_enemy('pigman', 'take_damage', [flash(G(lean=0, eyes=0, mouth=2), WHITE), G(lean=1, mouth=1), G(lean=2)])
    base = G(eyes=0, mouth=2, aF=(1.2, 0.4), aB=(1.0, 0.5), lean=1)
    save_enemy('pigman', 'death', [flash(G(lean=0, eyes=0, mouth=2), WHITE), fall(base, 0.25), fall(base, 0.55), fall(base, 0.85), fall(base, 1.0), fall(base, 1.0)])


# ================================================================== FLY SWARM (drawn, 64x64, flying - drawn low)
def flies_raw(k=0, dx=0, dy=0, tight=1.0, n=46, fall_=0.0):
    """A buzzing cloud of fat black flies with green-glinting wings (each 1-2 px): three loose clumps that churn round each
    other; tight < 1 packs them for the dive; fall_ 0..1 drops them dead to the floor."""
    p = Pic(64, 64)
    f = FEET
    r2 = random.Random(300)
    centres = [(22, f - 22), (34, f - 16), (44, f - 24)]
    for j in range(n):
        cx, cy = centres[j % 3]
        a = r2.uniform(0, TAU) + k * 0.9 * (1 if j % 2 else -1)
        rr = r2.uniform(1, 10) * tight
        x = cx + dx + math.cos(a) * rr
        y = cy + dy + math.sin(a) * rr * 0.7
        if fall_:
            y = y + (f - 1 - y) * fall_
        p.r(x, y, x + 1, y + 1, FLY[1]); p.p(x + 1, y, FLY[0])
        if not fall_ and (j + k) % 3 == 0:
            p.p(x - 1, y - 1, FLY[3]); p.p(x + 1, y - 1, FLY[2])
    return p.im


@builder('flies')
def make_flies():
    F = flies_raw
    save_enemy('flies', 'idle', [F(k=i) for i in range(4)])
    save_enemy('flies', 'movement', [F(k=i, dx=(0, 1, 2, 2, 1, 0)[i] - 1, dy=-(i % 2)) for i in range(6)])
    save_enemy('flies', 'attack', [F(k=0, tight=0.8), F(k=1, tight=0.6, dx=3, dy=2), F(k=2, tight=0.45, dx=6, dy=5), F(k=3, tight=0.45, dx=7, dy=6),
                                   F(k=0, tight=0.7, dx=4, dy=3), F(k=1)])
    save_enemy('flies', 'take_damage', [flash(F(k=0, tight=1.2), WHITE), F(k=1, tight=1.3), F(k=2)])
    save_enemy('flies', 'death', [F(k=0, tight=1.3), F(k=1, tight=1.4, fall_=0.3, n=34), F(k=2, tight=1.5, fall_=0.6, n=26), F(k=3, tight=1.6, fall_=0.9, n=20),
                                  F(k=0, tight=1.6, fall_=1.0, n=16), F(k=0, tight=1.6, fall_=1.0, n=16)])


# ================================================================== CRAWLER (drawn, 64x64, low)
def crawler_raw(k=0, reach=0.0, dx=0, eyes=1, mouth=0, flat=0.0):
    """A crawler: the upper half of a pale, grey-skinned ghoul dragging itself on two long arms, wrapped at the waist in
    filthy bandages and rags that trail behind (nothing gory shows); reach lunges the front arm forward."""
    p = Pic(64, 64)
    f = FEET
    cx = 28 + dx
    ty = f - 9 + flat * 4
    p.lines([(cx - 10, ty + 3), (cx - 16, ty + 6), (cx - 22, ty + 7)], APRON[0], 3)             # trailing rags
    p.lines([(cx - 10, ty + 1), (cx - 18, ty + 2)], APRON[1], 2)
    ph = k * TAU / 6
    bx, by = cx + 4 + math.sin(ph + math.pi) * 2, f - 1
    p.l(cx + 2, ty - 2, cx + 6, ty + 2, PALE[1], 3); p.l(cx + 6, ty + 2, bx, by, PALE[1], 2)       # far arm
    p.e(cx - 11, ty - 4, cx + 6, ty + 5, PALE[1]); p.e(cx - 9, ty - 3, cx + 4, ty + 2, PALE[2])
    p.r(cx - 11, ty - 3, cx - 7, ty + 5, APRON[1]); p.l(cx - 9, ty - 3, cx - 9, ty + 5, APRON[0])
    for j in range(3):
        p.l(cx - 6 + j * 3, ty - 3, cx - 5 + j * 3, ty + 1, PALE[0])
    hx, hy = cx + 9 + reach * 2, ty - 5 + flat * 3
    ell(p, hx, hy, 4, 3.5, PALE[2]); p.arc(hx - 4, hy - 4, hx + 4, hy + 2, 200, 330, (40, 40, 40), 2)
    if eyes:
        p.p(hx + 2, hy - 1, (230, 220, 120))
    p.l(hx + 1, hy + 2, hx + 4, hy + 2 + mouth, (40, 14, 14))
    fx, fy = cx + 12 + math.sin(ph) * 3 + reach * 8, f - 1 - reach * 3
    p.l(cx + 3, ty - 3, (cx + 3 + fx) / 2 + 1, ty - 6 - reach * 2, PALE[2], 3); p.l((cx + 3 + fx) / 2 + 1, ty - 6 - reach * 2, fx, fy, PALE[2], 2)
    for j in range(3):
        p.p(fx + 1 + j * 0.5, fy - j, PALE[3])
    return outline_same(p.im)


@builder('crawler')
def make_crawler():
    C = crawler_raw
    save_enemy('crawler', 'idle', [C(k=i, mouth=(0, 1, 1, 0)[i]) for i in range(4)])
    save_enemy('crawler', 'movement', [C(k=i, dx=(0, 1, 2, 2, 1, 0)[i] - 1) for i in range(6)])
    save_enemy('crawler', 'attack', [C(k=0, reach=0.3, mouth=1), C(k=1, reach=0.8, mouth=2, dx=2), C(k=2, reach=1.0, mouth=2, dx=4), C(k=3, reach=0.6, mouth=1, dx=3), C(k=4, reach=0.2), C(k=5)])
    save_enemy('crawler', 'take_damage', [flash(C(k=0, eyes=0, mouth=2), WHITE), C(k=1, mouth=1, dx=-2), C(k=2)])
    save_enemy('crawler', 'death', [flash(C(k=0, eyes=0, mouth=2), WHITE), C(k=1, eyes=0, mouth=2, flat=0.3), C(k=2, eyes=0, flat=0.6), C(k=3, eyes=0, flat=0.9),
                                    C(k=3, eyes=0, flat=1.0), C(k=3, eyes=0, flat=1.0)])


# ================================================================== GHOST SOLDIER (drawn, 64x64)
def gsoldier_raw(step=None, bob=0, lean=1.0, aF=(1.0, 0.6), aB=(0.9, 0.9), sw=1.5, eyes=1, crouch=0, fade=0.12, shield=True):
    """Side view facing right: a ghostly foot soldier in pale spectral cyan - a kettle helmet, a mail shirt, a round shield
    with a boss on the back arm held forward, a sword in the front hand; hollow glowing eyes; lightly dithered so it looks
    see-through."""
    p = Pic(64, 64)
    K0 = {}
    def far(p, K):
        K0.update(K)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        for y in range(int(sy) + 2, int(hy) + 4, 2):
            p.l(sx - 4, y, sx + 5, y, GHO[1])
        p.r(hx - 6, hy - 1, hx + 6, hy + 1, GHO[0])
        p.poly([(hx - 6, hy + 1), (hx + 6, hy + 1), (hx + 7, hy + 8), (hx - 7, hy + 8)], GHO[2])
    def head(p, K):
        x, y = K['head']
        p.e(x - 4, y - 4, x + 4, y + 4, GHO[2])
        p.poly([(x - 8, y - 2), (x + 8, y - 2), (x + 5, y - 5), (x, y - 8), (x - 5, y - 5)], ARM[2]); p.l(x - 8, y - 2, x + 8, y - 2, GHO[3])
        if eyes:
            p.p(x + 2, y, GHO[4]); p.p(x + 4, y, GHO[4])
        p.l(x + 1, y + 3, x + 4, y + 3, GHO[0])
    def front(p, K):
        hx, hy = K['handF']
        if sw is not None:
            sword(p, hx, hy, sw, 13)
        ell(p, hx, hy, 1.6, 1.6, GHO[3])
    rig(p, 27, FEET, LL=14, TL=13, HR=5, step=step, bob=bob, lean=lean, crouch=crouch, legs=(GHO[1], GHO[2]), leg_w=4, body=(GHO[1], GHO[2]),
        body_w=(6, 6), arms=(GHO[1], GHO[2]), arm_w=4, AL=13, aB=aB, aF=aF, skin=GHO, hands=GHO[3], shoes=GHO[0],
        on_far=far, on_torso=torso, on_head=head, on_front=front)
    if shield:
        bx, by = K0['handB']
        p.e(bx - 2, by - 9, bx + 6, by + 7, ARM[1]); p.e(bx - 1, by - 8, bx + 5, by + 6, GHO[2]); p.e(bx + 1, by - 2, bx + 3, by + 1, GHO[4])
        p.arc(bx - 2, by - 9, bx + 6, by + 7, 200, 320, GHO[4])
    return ghostly(outline_same(p.im, GHO[0]), fade)


@builder('ghostsoldier')
def make_ghostsoldier():
    G = gsoldier_raw
    save_enemy('ghostsoldier', 'idle', [G(bob=(0, 0, 1, 0)[i], sw=1.5 + (0, 0.03, 0.06, 0.03)[i]) for i in range(4)])
    save_enemy('ghostsoldier', 'movement', [G(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=2) for i in range(6)])
    save_enemy('ghostsoldier', 'attack', [G(aF=(2.3, 0.7), sw=3.2, lean=-1), G(aF=(2.8, 0.3), sw=3.7, lean=-2), G(aF=(2.0, 0.1), sw=2.3, lean=2),
                                          G(aF=(1.4, 0.0), sw=1.4, lean=3, crouch=2), G(aF=(1.0, 0.2), sw=0.9, lean=2, crouch=1), G()])
    save_enemy('ghostsoldier', 'take_damage', [flash(G(lean=-2, eyes=0), WHITE), G(lean=-1, fade=0.3), G(fade=0.2)])
    base = G(eyes=0, sw=None, aF=(1.2, 0.4), aB=(1.0, 0.5), fade=0.0)
    save_enemy('ghostsoldier', 'death', [flash(G(lean=-2, eyes=0), WHITE), ghostly(fall(base, 0.3), 0.3), ghostly(fall(base, 0.6), 0.5), ghostly(fall(base, 0.9), 0.65),
                                         ghostly(fall(base, 1.0), 0.8), ghostly(fall(base, 1.0), 0.92)])


# ================================================================== GHOST ARCHER (drawn, 64x64)
def garcher_raw(step=None, bob=0, lean=0.5, draw=0.0, eyes=1, crouch=0, fade=0.12, bow=True, arrow=True, aim=0.0):
    """Side view facing right: a ghostly archer in a hood and a long jerkin, a longbow held out in the front hand (aim
    raises it for the volley) and the string drawn back to the cheek by draw 0..1, a quiver on the back."""
    p = Pic(64, 64)
    K0 = {}
    aF = (1.55 + aim, 0.05)
    aB = (1.55 + aim - 0.4 * draw, 1.5 * draw + 0.2)
    def far(p, K):
        K0.update(K)
        sx, sy = K['sh']
        p.r(sx - 6, sy - 2, sx - 3, sy + 10, GHO[0]); p.l(sx - 5, sy - 4, sx - 5, sy - 2, GHO[4]); p.l(sx - 3, sy - 5, sx - 3, sy - 2, GHO[4])
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.poly([(sx - 5, sy), (sx + 5, sy), (hx + 7, hy + 9), (hx - 7, hy + 9)], GHO[1]); p.l(sx + 5, sy, hx + 7, hy + 9, GHO[3])
        p.r(hx - 6, hy - 1, hx + 6, hy + 1, GHO[0])
    def head(p, K):
        x, y = K['head']
        p.poly([(x - 6, y + 4), (x - 5, y - 5), (x + 1, y - 8), (x + 6, y - 3), (x + 5, y + 5)], GHO[1])
        p.e(x, y - 3, x + 5, y + 3, (20, 34, 40))
        if eyes:
            p.p(x + 3, y - 1, GHO[4])
    rig(p, 26, FEET, LL=14, TL=13, HR=5, step=step, bob=bob, lean=lean, crouch=crouch, legs=(GHO[1], GHO[2]), leg_w=4, body=(GHO[1], GHO[2]),
        body_w=(5, 6), arms=(GHO[1], GHO[2]), arm_w=3, AL=13, aB=aB, aF=aF, skin=GHO, hands=GHO[3], shoes=GHO[0],
        on_far=far, on_torso=torso, on_head=head)
    if bow:
        hx, hy = K0['handF']
        a = aF[0] + aF[1]
        u = (math.sin(a), math.cos(a)); v = (u[1], -u[0])
        t1 = (hx + v[0] * 12 - u[0] * 2, hy + v[1] * 12 - u[1] * 2); t2 = (hx - v[0] * 12 - u[0] * 2, hy - v[1] * 12 - u[1] * 2)
        p.lines([t1, (hx + u[0] * 2, hy + u[1] * 2), t2], WD2, 2)
        nx, ny = K0['handB']
        p.lines([t1, (nx, ny), t2], GHO[4])
        if arrow:
            ex, ey = hx + u[0] * 5, hy + u[1] * 5
            p.l(nx, ny, ex, ey, GHO[3]); p.p(ex, ey, ARM[3])
    return ghostly(outline_same(p.im, GHO[0]), fade)


@builder('ghostarcher')
def make_ghostarcher():
    A = garcher_raw
    save_enemy('ghostarcher', 'idle', [A(bob=(0, 0, 1, 0)[i], aim=-0.6, draw=0.1) for i in range(4)])
    save_enemy('ghostarcher', 'movement', [A(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=1.5, aim=-0.7) for i in range(6)])
    save_enemy('ghostarcher', 'attack', [A(aim=0.2, draw=0.2), A(aim=0.35, draw=0.6), A(aim=0.4, draw=1.0), A(aim=0.4, draw=0.0, arrow=False), A(aim=0.3, draw=0.3), A(aim=0.0, draw=0.1)])
    save_enemy('ghostarcher', 'take_damage', [flash(A(lean=-2, eyes=0, aim=-0.5), WHITE), A(lean=-1, aim=-0.5, fade=0.3), A(aim=-0.5, fade=0.2)])
    base = A(eyes=0, bow=False, fade=0.0, aim=-0.4)
    save_enemy('ghostarcher', 'death', [flash(A(lean=-2, eyes=0, aim=-0.5), WHITE), ghostly(fall(base, 0.3), 0.3), ghostly(fall(base, 0.6), 0.5), ghostly(fall(base, 0.9), 0.65),
                                        ghostly(fall(base, 1.0), 0.8), ghostly(fall(base, 1.0), 0.92)])


# ================================================================== GHOST RIDER (drawn, 64x64)
def rider_raw(k=0, rear=0.0, lance=1.6, eyes=1, fade=0.1, dx=0, down=0.0, mounted=True):
    """Side view facing right: a spectral knight on a gaunt ghost horse - the horse (about 46 px long) with a streaming
    mane and tail of pale mist, galloping (k = gait phase 0..5); the rider in a great helm with a tattered cape, a lance
    couched forward; rear lifts the horse's forehand; down 0..1 = horse and rider collapsing."""
    p = Pic(64, 64)
    f = FEET
    cx, cy = 28 + dx, f - 15 + down * 8
    ph = k / 6 * TAU
    def leg(x, y, a, b, col):
        kx, ky = x + math.sin(a) * 6, y + math.cos(a) * 6
        fx, fy = kx + math.sin(a + b) * 6, min(f - 1, ky + math.cos(a + b) * 6)
        if down:
            fy = min(f - 1, fy); ky = min(f - 2, ky)
        p.l(x, y, kx, ky, col, 2); p.l(kx, ky, fx, fy, col, 2); p.p(fx + 1, fy, GHO[4])
    for x, o in ((cx + 9, 0.0), (cx - 9, math.pi)):
        leg(x, cy + 3 - rear * 4 * (x > cx), math.sin(ph + o + 0.5) * 0.7 - rear * (x > cx), 0.5, GHO[0])
    p.lines([(cx - 13, cy - 2), (cx - 19, cy - 4 + math.sin(ph) * 2), (cx - 23, cy + 2)], GHO[3], 3)    # tail
    p.e(cx - 14, cy - 5 - rear * 2, cx + 13, cy + 5, GHO[1]); p.e(cx - 12, cy - 4 - rear * 2, cx + 11, cy + 1, GHO[2])
    hx, hy = cx + 16, cy - 10 - rear * 6 + down * 6
    p.l(cx + 9, cy - 3 - rear * 3, hx, hy + 2, GHO[1], 5)
    p.poly([(hx - 2, hy - 3), (hx + 8, hy + 1), (hx + 8, hy + 5), (hx - 1, hy + 4)], GHO[2])
    p.poly([(hx - 1, hy - 3), (hx + 1, hy - 7), (hx + 2, hy - 3)], GHO[2])
    if eyes:
        p.p(hx + 2, hy, GHO[4])
    for j in range(4):
        p.l(cx + 8 - j * 2, cy - 6 - rear * 3 - j, cx + 2 - j * 3, cy - 10 - j - rear * 2, GHO[4])
    for x, o in ((cx + 10, math.pi), (cx - 8, 0.0)):
        leg(x, cy + 4 - rear * 4 * (x > cx), math.sin(ph + o) * 0.7 - rear * (x > cx), 0.5, GHO[1])
    if mounted:
        rx, ry = cx - 1, cy - 12 - rear * 2
        p.poly([(rx - 3, ry), (rx - 12, ry + 4 + math.sin(ph) * 2), (rx - 10, ry - 4)], BAN[0])              # cape
        p.r(rx - 3, ry - 2, rx + 4, ry + 8, ARM[2]); p.l(rx + 4, ry - 2, rx + 4, ry + 8, GHO[3])
        p.r(rx - 3, ry - 9, rx + 4, ry - 2, ARM[2]); p.l(rx, ry - 6, rx + 4, ry - 6, (20, 30, 36)); p.p(rx + 3, ry - 6, GHO[4])
        p.l(rx + 2, ry + 8, rx + 5, ry + 13, ARM[1], 2)
        if lance is not None:
            ex, ey = pt(lance, 22, rx + 4, ry + 3)
            bx, by = pt(lance + math.pi, 8, rx + 4, ry + 3)
            p.l(bx, by, ex, ey, WD3, 2); p.poly([(ex, ey - 1.5), (ex + 4, ey), (ex, ey + 1.5)], ARM[3])
    return ghostly(outline_same(p.im, GHO[0]), fade)


@builder('ghostrider')
def make_ghostrider():
    R = rider_raw
    save_enemy('ghostrider', 'idle', [R(k=(0, 0, 1, 1)[i] * 0, rear=(0, 0.05, 0.1, 0.05)[i], dx=-2) for i in range(4)])
    save_enemy('ghostrider', 'movement', [R(k=i, dx=-2) for i in range(6)])
    save_enemy('ghostrider', 'attack', [R(k=0, rear=0.6, lance=1.9, dx=0), R(k=1, rear=1.0, lance=2.1, dx=0), R(k=2, rear=0.3, lance=1.6, dx=-2),
                                        R(k=3, lance=1.55, dx=0), R(k=4, lance=1.55, dx=0), R(k=5, lance=1.6, dx=-2)])
    save_enemy('ghostrider', 'take_damage', [flash(R(k=0, rear=0.4, eyes=0, dx=1), WHITE), R(k=1, rear=0.3, fade=0.3, dx=1), R(k=2, fade=0.2, dx=-2)])
    save_enemy('ghostrider', 'death', [flash(R(k=0, rear=0.6, eyes=0, dx=1), WHITE), R(k=1, rear=0.8, eyes=0, fade=0.3, lance=None, dx=1),
                                       ground_it(R(k=2, eyes=0, fade=0.45, lance=None, down=0.6, dx=-2)), ground_it(R(k=3, eyes=0, fade=0.6, lance=None, down=1.0, mounted=False, dx=-2)),
                                       ground_it(R(k=3, eyes=0, fade=0.8, lance=None, down=1.0, mounted=False, dx=-2)), ground_it(R(k=3, eyes=0, fade=0.93, lance=None, down=1.0, mounted=False, dx=-2))])


# ================================================================== CROWS (drawn, 64x64, a flock of three, flying - drawn low)
def crow(p, x, y, wing=0.0, s=1.0, dive=0.0, beak=0, dead=False):
    """A black carrion crow at (x, y) facing right: glossy black with blue-grey sheen, fingered wings (wing -1 down .. 1
    up), a heavy black beak, a pale eye; dead = lying on the floor with a wing out."""
    if dead:
        ell(p, x, y, 5 * s, 2.5 * s, CROW[1]); p.l(x - 4, y, x - 11 * s, y + 1, CROW[2], 2); p.l(x + 5 * s, y - 1, x + 8 * s, y, CROW[0], 2)
        return
    wy = -wing * 7 * s
    p.poly([(x - 2 * s, y - 1), (x + 2 * s, y - 1), (x - 3 * s, y + wy - 1), (x - 8 * s, y + wy)], CROW[0])
    ell(p, x, y, 5 * s, 2.6 * s, CROW[1]); p.poly([(x - 4 * s, y - 1), (x - 10 * s, y + 1), (x - 4 * s, y + 2)], CROW[0])
    hx, hy = x + 5 * s, y - 2 * s + dive * 3
    ell(p, hx, hy, 2.4 * s, 2.2 * s, CROW[1])
    p.poly([(hx + 1.5 * s, hy - 0.5), (hx + 5.5 * s, hy + 0.8 + beak), (hx + 1.5 * s, hy + 1.5)], (40, 40, 44)); p.p(hx + 1, hy - 1, (200, 190, 160))
    p.poly([(x - 1 * s, y - 1), (x + 3 * s, y - 1), (x + 1 * s, y + wy * 1.1 - 1), (x - 6 * s, y + wy * 1.2)], CROW[2])
    for j in range(3):
        p.p(x - 6 * s + j, y + wy * 1.2 + (1 if wing > 0 else -1) * j * 0.6, CROW[0])
    p.l(x - 1, y - 1, x + 3, y - 2, CROW[3])


def crows_raw(t=0, dive=None, scatter=None, dead=None):
    p = Pic(64, 64)
    f = FEET
    base = [(18, f - 22, 0.0), (34, f - 14, 2.0), (46, f - 25, 4.0)]
    for j, (x, y, o) in enumerate(base):
        w = math.sin(t * TAU / 4 + o)
        if dead is not None and j < dead:
            crow(p, 14 + j * 16, f - 3, dead=True)
            continue
        if scatter is not None:
            y = y + scatter * (f - 4 - y) * (0.5 + j * 0.25)
        if dive is not None and j == 1:
            crow(p, x + dive * 8, y + dive * 6, w * 0.3 + 0.8, 1.0, dive, beak=1)
        else:
            crow(p, x, y + math.sin(t + j), w, 0.9 if j != 1 else 1.0)
    return outline_same(p.im, (8, 8, 10))


@builder('crows')
def make_crows():
    C = crows_raw
    save_enemy('crows', 'idle', [C(t=i) for i in range(4)])
    save_enemy('crows', 'movement', [C(t=i * 4 / 6) for i in range(6)])
    save_enemy('crows', 'attack', [C(t=0, dive=0.0), C(t=1, dive=0.3), C(t=2, dive=0.7), C(t=3, dive=1.0), C(t=0, dive=0.6), C(t=1, dive=0.2)])
    save_enemy('crows', 'take_damage', [flash(C(t=1), WHITE), C(t=2), C(t=3)])
    q = Pic(64, 64)
    r2 = random.Random(41)
    for _ in range(7):
        x, y = r2.uniform(10, 54), r2.uniform(FEET - 30, FEET - 6)
        q.l(x, y, x + 3, y - 1, CROW[2]); q.p(x, y, CROW[0])
    fe = q.im
    save_enemy('crows', 'death', [flash(C(t=1), WHITE), on(C(t=2, scatter=0.3), fe), on(C(t=3, scatter=0.6), fe), on(C(t=0, scatter=0.9, dead=1), fe), C(dead=3), C(dead=3)])


# ================================================================== THE BUTCHER (boss, drawn, 116x116)
def big_cleaver(p, x, y, a, L=30):
    ex, ey = pt(a, 10, x, y)
    p.l(x, y, ex, ey, WD1, 4); p.l(x, y, ex, ey, WD3, 1)
    u = (math.sin(a), math.cos(a)); v = (u[1], -u[0])
    q = [(ex, ey), (ex + u[0] * L, ey + u[1] * L), (ex + u[0] * L + v[0] * 15, ey + u[1] * L + v[1] * 15), (ex + v[0] * 15, ey + v[1] * 15)]
    p.poly(q, STEELC[2]); p.poly([q[0], q[1], (q[1][0] + v[0] * 5, q[1][1] + v[1] * 5), (q[0][0] + v[0] * 5, q[0][1] + v[1] * 5)], STEELC[1])
    p.l(q[2][0], q[2][1], q[3][0], q[3][1], STEELC[4], 2)
    c = (ex + u[0] * 5 + v[0] * 4, ey + u[1] * 5 + v[1] * 4); p.e(c[0] - 2, c[1] - 2, c[0] + 2, c[1] + 2, (0, 0, 0, 0))
    r2 = random.Random(int(a * 100))
    for _ in range(8):
        t, s = r2.uniform(0.1, 0.9), r2.uniform(0.2, 0.9)
        p.p(ex + u[0] * L * t + v[0] * 15 * s, ey + u[1] * L * t + v[1] * 15 * s, RUST[r2.randrange(1, 3)])
    return q[2]


def meathook_s(p, x, y, s=1.0):
    p.arc(x - 5 * s, y - 1 * s, x + 3 * s, y + 9 * s, 0, 200, STEELC[3], 2)
    p.poly([(x - 5 * s, y + 3 * s), (x - 7 * s, y), (x - 4 * s, y + 1 * s)], STEELC[4])
    p.e(x - 1.5, y - 4 * s, x + 1.5, y - 1 * s, STEELC[1])


def butcherboss_frame(step=None, bob=0, lean=0.0, aF=(0.9, 0.3), aB=(-0.2, 0.5), cl=0.9, eyes=1, crouch=0, chips=0, chain=None, mouth=0):
    """Side view facing right: the master butcher - a giant with a huge round belly under a long stained leather apron, a
    dark shirt with rolled sleeves on enormous forearms, a stitched leather half-mask over a bald head, rubber boots, a
    belt of hanging hooks; the front hand holds a huge rusty cleaver (cl = angle); chain = a hook on a chain thrown from the
    back hand; chips = tile chips where the cleaver struck."""
    p = Pic(BS, BS)
    f = BS_FEET
    K0 = {}
    def far(p, K):
        K0.update(K)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.e(min(sx, hx) - 14, sy - 2, max(sx, hx) + 18, hy + 6, (56, 52, 50)); p.e(min(sx, hx) - 10, sy + 1, max(sx, hx) + 14, hy + 2, (74, 68, 64))
        p.poly([(sx + 2, sy + 2), (sx + 16, sy + 6), (hx + 20, f - 14), (hx - 2, f - 14)], LEATH[2])
        p.l(sx + 16, sy + 6, hx + 20, f - 14, LEATH[3]); p.l(sx + 2, sy + 2, hx - 2, f - 14, LEATH[0], 2)
        for x, y in ((hx + 8, hy + 2), (hx + 12, hy + 12), (sx + 10, sy + 14)):
            p.e(x - 2, y - 1, x + 2, y + 2, STAIN[1])
        p.r(hx - 14, hy - 2, hx + 14, hy + 2, LEATH[0])
        for x in (hx - 10, hx - 4):
            meathook_s(p, x, hy + 4, 0.9)
    def head(p, K):
        x, y = K['head']
        ell(p, x, y, 10, 10, SKIN[1]); p.arc(x - 10, y - 10, x + 10, y + 10, 200, 320, SKIN[0])
        p.poly([(x - 4, y - 6), (x + 12, y - 6), (x + 12, y + 2), (x - 4, y + 3)], LEATH[1])
        for xx in range(int(x) - 2, int(x) + 12, 3):
            p.l(xx, y - 6, xx + 1, y - 4, LEATH[3])
        if eyes:
            p.e(x + 5, y - 4, x + 9, y - 1, (10, 8, 8)); p.p(x + 7, y - 3, (230, 200, 120))
        else:
            p.l(x + 5, y - 3, x + 9, y - 3, BLK[0], 2)
        p.r(x + 4, y + 5, x + 11, y + 7 + mouth * 2, (60, 20, 20))
        p.l(x - 2, y + 8, x + 9, y + 9, (60, 50, 40), 2)
    def front(p, K):
        x, y = K['handF']
        if cl is not None:
            big_cleaver(p, x, y, cl, 30)
        ell(p, x, y, 4.5, 4.5, SKIN[1])
    rig(p, 40, f, LL=30, TL=30, HR=10, step=step, bob=bob, lean=lean, crouch=crouch, legs=((40, 42, 46), (58, 60, 66)), leg_w=12,
        body=((56, 52, 50), (74, 68, 64)), body_w=(15, 15), arms=(SKIN[1], SKIN[2]), arm_w=9, AL=28, aB=aB, aF=aF, skin=SKIN,
        hands=SKIN[1], shoes=(30, 34, 30), on_far=far, on_torso=torso, on_head=head, on_front=front)
    if chain is not None:
        bx, by = K0['handB']
        cx_, cy_ = chain
        n = int(max(abs(cx_ - bx), abs(cy_ - by)) / 3) + 1
        for j in range(1, n):
            t = j / n
            p.p(bx + (cx_ - bx) * t, by + (cy_ - by) * t + math.sin(t * math.pi) * 3, STEELC[3] if j % 2 else STEELC[1])
        meathook_s(p, cx_, cy_, 1.6)
    im = outline_same(p.im)
    if chips:
        q = Pic(BS, BS)
        r2 = random.Random(70 + chips)
        for j in range(10):
            a = -math.pi / 2 + r2.uniform(-1.2, 1.2)
            d = 4 + chips * 6 + r2.uniform(0, 6)
            x, y = 92 + math.cos(a) * d * 0.8, f - 2 + math.sin(a) * d
            q.r(x, y, x + 1, y + 1, TILE[r2.randrange(1, 5)])
        q.lines([(80, f), (88, f - 1), (96, f), (104, f - 1), (110, f)], (20, 20, 20))
        im = on(im, outline_same(q.im))
    return im


@builder('butcherboss')
def make_butcherboss():
    R = butcherboss_frame
    save_boss('butcher', 'idle', [R(bob=(0, 0, 1, 1, 0)[i], aF=(0.9 + (0, 0.03, 0.06, 0.03, 0)[i], 0.3), cl=0.9 + (0, 0.03, 0.06, 0.03, 0)[i]) for i in range(5)])
    save_boss('butcher', 'attack', [R(aF=(1.9, 0.4), cl=2.3, lean=-2, crouch=2, mouth=1), R(aF=(2.1, 0.3), cl=2.4, lean=-5, crouch=7, mouth=2),
                                    R(aF=(2.0, 0.1), cl=2.2, lean=1, crouch=2, mouth=2), R(aF=(1.5, 0.1), cl=1.0, lean=4, crouch=4, chips=1, mouth=2),
                                    R(aF=(1.3, 0.2), cl=0.95, lean=4, crouch=3, chips=2, mouth=1), R(aF=(1.1, 0.3), cl=0.9, lean=2)])
    save_boss('butcher', 'cast', [R(aB=(2.5, 0.6), lean=-3, chain=(30, 20), mouth=1), R(aB=(2.2, 0.2), lean=2, chain=(80, 30), mouth=2),
                                  R(aB=(1.8, 0.0), lean=3, chain=(102, 44), mouth=2), R(aB=(1.4, 0.2), lean=-2, chain=(90, 60), mouth=1),
                                  R(aB=(0.8, 0.6), lean=-4, chain=(72, 66)), R(aB=(0.2, 0.6), lean=-1)])
    save_boss('butcher', 'hurt', [flash(R(lean=-5, eyes=0, aF=(1.4, 0.4), cl=1.6, mouth=2), WHITE), R(lean=-3, aF=(1.1, 0.3), cl=1.2, mouth=1), R(lean=-1)])
    base = R(eyes=0, aF=(0.4, 0.2), aB=(-0.1, 0.2), cl=None, mouth=2)
    q = Pic(BS, BS); big_cleaver(q, 30, BS_FEET - 8, 1.62, 26); cq = outline_same(q.im)
    fallen = lambda k: fall(base, k, 90, BS, BS_FEET)
    save_boss('butcher', 'death', [flash(R(lean=-5, eyes=0, aF=(1.6, 0.5), cl=2.0, mouth=2), WHITE), R(lean=-7, eyes=0, crouch=6, aF=(1.8, 0.4), aB=(2.0, 0.4), cl=2.2, mouth=2),
                                   fallen(0.3), fallen(0.6), on(cq, fallen(0.9)), on(cq, fallen(1.0)), on(cq, fallen(1.0))])


# ================================================================== THE WARLORD (boss, drawn, 116x116)
def greatsword(p, x, y, a, L=40):
    ex, ey = pt(a, L, x, y)
    u = (math.sin(a), math.cos(a)); v = (u[1], -u[0])
    p.poly([(x + v[0] * 2.5, y + v[1] * 2.5), (ex + v[0] * 1.5, ey + v[1] * 1.5), (ex + u[0] * 5, ey + u[1] * 5), (ex - v[0] * 1.5, ey - v[1] * 1.5), (x - v[0] * 2.5, y - v[1] * 2.5)], ARM[2])
    p.l(x, y, ex + u[0] * 4, ey + u[1] * 4, GHO[4])
    p.l(x + v[0] * 7, y + v[1] * 7, x - v[0] * 7, y - v[1] * 7, ARM[3], 3)
    p.l(x, y, x - u[0] * 8, y - u[1] * 8, BAN[0], 3); p.e(x - u[0] * 9 - 2, y - u[1] * 9 - 2, x - u[0] * 9 + 2, y - u[1] * 9 + 2, AU2)
    return ex, ey


def warlord_frame(step=None, bob=0, lean=0.0, aF=(0.8, 0.4), aB=(0.3, 0.5), sw=1.2, eyes=1, crouch=0, horn=0, whirl=0, fade=0.1, k=0):
    """Side view facing right: the eternal warlord - a towering ghost knight in pale spectral plate armour, a great horned
    helm with a slit visor and a burning stare, a long tattered red cloak, a fur mantle, a greatsword in the front hand;
    horn 1..2 = a war horn raised to the visor with sound rings; whirl 1..3 = the sword whirl (pale arcs round him); fade
    dithers him out (death)."""
    p = Pic(BS, BS)
    f = BS_FEET
    K0 = {}
    def far(p, K):
        K0.update(K)
        sx, sy = K['sh']
        r2 = random.Random(k)
        pts = [(sx - 4, sy - 2), (sx - 30, f - 10 + r2.randint(-2, 2)), (sx - 22, f - 4), (sx - 14, f - 8), (sx - 6, f - 3), (sx + 2, sy + 6)]
        p.poly(pts, BAN[0]); p.lines(pts[:3], BAN[1], 2)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.e(min(sx, hx) - 12, sy - 3, max(sx, hx) + 12, hy + 4, ARM[1]); p.e(min(sx, hx) - 9, sy, max(sx, hx) + 9, hy, ARM[2])
        for j in range(3):
            p.l(sx - 8, sy + 6 + j * 7, sx + 9, sy + 7 + j * 7, ARM[0])
        p.e(sx - 14, sy - 6, sx + 6, sy + 4, (110, 104, 92)); p.e(sx - 12, sy - 5, sx + 3, sy + 1, (140, 134, 120))      # fur mantle
        p.poly([(hx - 12, hy), (hx + 12, hy), (hx + 14, hy + 14), (hx - 13, hy + 14)], ARM[1])
        for x in range(int(hx) - 10, int(hx) + 13, 5):
            p.l(x, hy + 1, x, hy + 13, ARM[0])
        p.l(sx + 9, sy, hx + 12, hy, GHO[4])
    def head(p, K):
        x, y = K['head']
        p.e(x - 9, y - 10, x + 10, y + 10, ARM[2]); p.r(x - 9, y - 4, x + 10, y + 9, ARM[2])
        p.l(x - 9, y - 4, x + 10, y - 4, ARM[3]); p.r(x + 2, y - 1, x + 10, y + 1, (14, 22, 26))
        if eyes:
            p.p(x + 5, y, GHO[4]); p.p(x + 8, y, GHO[4])
        for j in range(3):
            p.p(x + 6 + j, y + 4 + j, ARM[0])
        p.lines([(x - 4, y - 8), (x - 12, y - 16), (x - 14, y - 24)], BONE[3], 4); p.lines([(x + 4, y - 9), (x + 8, y - 18), (x + 6, y - 26)], BONE[4], 4)
    def front(p, K):
        x, y = K['handF']
        if sw is not None:
            greatsword(p, x, y, sw, 40)
        ell(p, x, y, 4.5, 4.5, ARM[3])
    rig(p, 42, f, LL=34, TL=30, HR=10, step=step, bob=bob, lean=lean, crouch=crouch, legs=(ARM[1], ARM[2]), leg_w=12,
        body=(ARM[1], ARM[2]), body_w=(16, 16), arms=(ARM[1], ARM[2]), arm_w=9, AL=28, aB=aB, aF=aF, skin=GHO,
        hands=ARM[3], shoes=ARM[0], on_far=far, on_torso=torso, on_head=head, on_front=front)
    if horn:
        hx_, hy_ = K0['head']
        bx, by = K0['handB']
        p.poly([(bx, by), (hx_ + 10, hy_ + 4), (hx_ + 18, hy_ - 4), (hx_ + 22, hy_ + 2)], BONE[3]); p.e(hx_ + 17, hy_ - 6, hx_ + 25, hy_ + 4, BONE[2])
    im = outline_same(p.im, GHO[0])
    q = Pic(BS, BS)
    if horn:
        hx_, hy_ = K0['head']
        for j in range(horn + 1):
            r = 6 + j * 7
            q.arc(hx_ + 22 - r, hy_ - r, hx_ + 22 + r, hy_ + r, -50, 50, GHO[4] if j % 2 else GHO[3])
    if whirl:
        cx, cy = K0['sh']
        for j in range(whirl + 1):
            r = 22 + j * 5
            q.arc(cx - r, cy - r * 0.45 + 18, cx + r, cy + r * 0.45 + 18, 20 + j * 40, 200 + j * 40, GHO[4] if j % 2 else GHO[3])
    if horn or whirl:
        im = on(im, q.im)
    return dither_hole(im, fade, k)


@builder('warlord')
def make_warlord():
    R = warlord_frame
    save_boss('warlord', 'idle', [R(bob=(0, 0, 1, 1, 0)[i], sw=1.2 + (0, 0.03, 0.06, 0.03, 0)[i], k=i) for i in range(5)])
    save_boss('warlord', 'attack', [R(aF=(2.0, 0.4), sw=2.5, lean=-3, crouch=3, k=0), R(aF=(1.8, 0.0), sw=2.0, lean=1, whirl=1, k=1), R(aF=(1.3, 0.0), sw=1.2, lean=2, whirl=2, k=2),
                                    R(aF=(0.6, 0.2), sw=0.6, lean=2, whirl=3, k=3), R(aF=(0.4, 0.4), sw=0.4, whirl=2, k=4), R(aF=(0.8, 0.4), sw=1.1, k=0)])
    save_boss('warlord', 'cast', [R(aB=(1.8, 1.4), k=0), R(aB=(2.6, 1.0), horn=1, k=1, lean=-2), R(aB=(2.6, 1.0), horn=2, k=2, lean=-3), R(aB=(2.6, 1.0), horn=2, k=3, lean=-3),
                                  R(aB=(2.6, 1.0), horn=1, k=4, lean=-2), R(aB=(1.2, 0.8), k=0)])
    save_boss('warlord', 'hurt', [flash(R(lean=-5, eyes=0, k=1), WHITE), R(lean=-3, k=2, fade=0.25), R(lean=-1, k=3)])
    base = R(eyes=0, aF=(0.4, 0.2), aB=(-0.1, 0.2), sw=None, fade=0.0)
    q = Pic(BS, BS); greatsword(q, 22, BS_FEET - 4, 1.62, 40); sq = outline_same(q.im, GHO[0])
    fallen = lambda k_: fall(base, k_, 90, BS, BS_FEET)
    save_boss('warlord', 'death', [flash(R(lean=-5, eyes=0, k=0), WHITE), R(lean=-7, eyes=0, crouch=6, k=1, fade=0.2), dither_hole(on(sq, fallen(0.4)), 0.3, 2),
                                   dither_hole(on(sq, fallen(0.8)), 0.45, 3), dither_hole(on(sq, fallen(1.0)), 0.6, 0), dither_hole(on(sq, fallen(1.0)), 0.78, 1),
                                   dither_hole(on(sq, fallen(1.0)), 0.92, 2)])


# ================================================================== PROPS
def meathook(k):
    """A ceiling meat hook (32x64 cell, hanging from row 0): a chain on a rail trolley and a big hook carrying a side of
    meat wrapped in stained sacking (2 frames, it swings)."""
    p = Pic(32, 64)
    sw = (-1.5, 1.5)[k]
    p.r(10, 0, 22, 2, STEELC[1]); p.e(12, 1, 15, 4, STEELC[2]); p.e(17, 1, 20, 4, STEELC[2])
    for j in range(8):
        p.e(15 + sw * j / 8, 4 + j * 3, 17 + sw * j / 8, 7 + j * 3, STEELC[3] if j % 2 else STEELC[1])
    hx, hy = 16 + sw, 30
    p.arc(hx - 5, hy - 2, hx + 3, hy + 8, 0, 200, STEELC[3], 2)
    p.e(hx - 7, hy + 4, hx + 7, hy + 30, MEAT[1]); p.e(hx - 6, hy + 5, hx + 5, hy + 26, (150, 140, 118))       # sack over the meat
    for y in range(int(hy) + 8, int(hy) + 28, 4):
        p.l(hx - 5, y, hx + 4, y + 1, (110, 100, 82))
    p.e(hx - 2, hy + 14, hx + 2, hy + 18, STAIN[1]); p.e(hx - 4, hy + 26, hx + 4, hy + 31, MEAT[2]); p.p(hx, hy + 32, STAIN[0])
    return outline_same(p.im)


def butcherblock():
    """A thick end-grain chopping block on stout legs with a cleaver stuck in it and a dark scrubbed hollow on top."""
    p = Pic(40, 40)
    for x in (6, 30):
        p.r(x, 24, x + 4, 39, WD1)
    p.r(3, 12, 36, 26, WD2); p.e(3, 8, 36, 16, WD3); p.e(10, 10, 28, 14, (80, 52, 32))
    for x in range(6, 35, 5):
        p.l(x, 16, x, 25, WD1)
    p.e(12, 11, 18, 13, STAIN[0])
    p.poly([(22, 2), (32, 0), (34, 10), (24, 12)], STEELC[2]); p.l(24, 12, 34, 10, STEELC[4]); p.l(27, 1, 30, -6 + 6, WD1)
    p.l(31, 0, 36, -4 + 4, WD0, 2)
    return outline_same(p.im)


def bandsaw(k):
    """A butcher's band saw: a tall grey steel housing with two big wheels behind guards, a table and the bright blade
    running down through it (2 frames: the blade teeth move)."""
    p = Pic(36, 64)
    p.r(6, 2, 30, 30, STEELC[1]); p.r(6, 34, 30, 60, STEELC[1]); p.l(6, 2, 30, 2, STEELC[3])
    p.e(8, 4, 28, 26, STEELC[2]); p.e(8, 38, 28, 58, STEELC[2]); p.e(16, 13, 20, 17, STEELC[0]); p.e(16, 46, 20, 50, STEELC[0])
    p.r(2, 30, 34, 34, STEELC[3]); p.l(2, 30, 34, 30, STEELC[4])
    for y in range(4, 60, 2):
        p.p(18, y, STEELC[4] if (y // 2 + k) % 2 else STEELC[2])
    p.r(28, 8, 32, 14, (180, 40, 30)); p.r(29, 10, 31, 12, (230, 70, 50) if k else (120, 20, 16))
    p.r(8, 60, 28, 63, STEELC[0])
    return outline_same(p.im)


def catapult():
    """A wrecked siege catapult: a heavy timber frame on broken wheels, the throwing arm snapped and hanging, a rope
    tangle and a stone left in the sling cup."""
    p = Pic(64, 48)
    p.r(4, 30, 58, 35, WD1); p.l(4, 30, 58, 30, WD3)
    for x in (12, 48):
        p.e(x - 7, 33, x + 7, 47, WD0); p.e(x - 5, 35, x + 5, 45, (0, 0, 0, 0)); p.l(x - 5, 40, x + 5, 40, WD1)
    p.l(20, 30, 32, 8, WD2, 3); p.l(44, 30, 32, 8, WD2, 3); p.r(30, 6, 34, 10, WD1)
    p.l(32, 10, 54, 22, WD2, 3); p.l(54, 22, 58, 30, WD1, 3)                                   # the snapped arm
    p.e(52, 24, 60, 30, WD1); p.e(54, 23, 59, 28, (110, 104, 96))
    p.lines([(20, 30), (26, 24), (24, 18), (30, 16)], ROPE_C, 1)
    return outline_same(p.im)


ROPE_C = (140, 120, 84)


def warbanner(k):
    """A war banner: a spear-tipped pole driven into a heap of earth with a tattered red banner bearing a white skull
    (2 frames, it flaps)."""
    p = Pic(36, 64)
    p.e(6, 56, 30, 64, MUD[2]); p.l(12, 4, 12, 60, WD2, 2); p.poly([(10, 4), (12, -1 + 1), (14, 4)], ARM[3])
    wv = (0, 2)[k]
    pts = [(13, 6), (33, 7 + wv), (32, 22 + wv), (28, 19 + wv), (26, 26), (21, 22 - wv), (16, 28), (13, 24)]
    p.poly(pts, BAN[1]); p.lines(pts[:3], BAN[0], 1)
    p.e(19, 10 + wv // 2, 27, 18 + wv // 2, BONE[4]); p.p(21, 13 + wv // 2, GROUT); p.p(25, 13 + wv // 2, GROUT)
    p.l(13, 6, 33, 7 + wv, WD1)
    return outline_same(p.im)


def stakes():
    """A row of sharpened stakes slanted outwards in a mud bank (4 damage on contact)."""
    p = Pic(48, 36)
    p.e(2, 26, 46, 36, MUD[2]); p.l(4, 27, 44, 27, MUD[4])
    for j, x in enumerate((8, 18, 28, 38)):
        tip = (x + 8, 4 + (j % 2) * 3)
        p.poly([(x - 2, 30), (x + 2, 30), tip], WD2); p.l(x + 2, 30, tip[0], tip[1], WD4); p.p(tip[0], tip[1], (170, 150, 110))
    return outline_same(p.im)


@builder('props')
def make_props():
    save_prop('meathook', [meathook(k) for k in range(2)], 32, 64)
    save_prop('butcherblock', [butcherblock()])
    save_prop('bandsaw', [bandsaw(k) for k in range(2)], 36, 64)
    save_prop('catapult', [catapult()])
    save_prop('warbanner', [warbanner(k) for k in range(2)], 36, 64)
    save_prop('stakes', [stakes()])


# ================================================================== ITEMS, PARTICLES AND ICONS
def hook_pick():
    p = Pic(50, 22)
    p.l(1, 14, 14, 12, (110, 74, 44), 3); p.r(14, 10, 17, 14, STEELC[1])
    for j in range(5):
        x = 18 + j * 4
        p.e(x, 10 + (j % 2), x + 4, 13 + (j % 2), STEELC[3] if j % 2 else STEELC[1])
    p.arc(36, 2, 48, 16, 100, 400, STEELC[3], 3); p.arc(36, 2, 48, 16, 100, 400, STEELC[4], 1)
    p.poly([(36, 10), (34, 5), (38, 8)], STEELC[4])
    return outline_same(p.im)


def bombard_pick():
    p = Pic(46, 24)
    p.poly([(1, 16), (14, 12), (16, 14), (16, 20), (3, 22)], (90, 56, 34))
    p.r(14, 6, 36, 18, (46, 48, 54)); p.l(14, 6, 36, 6, (90, 94, 104))
    for x in (18, 25, 32):
        p.l(x, 5, x, 19, (110, 114, 122), 2)
    p.r(36, 4, 42, 20, (60, 62, 70)); p.l(42, 4, 42, 20, BR3, 2)
    p.e(38, 8, 45, 16, (50, 52, 58)); p.p(40, 10, (130, 134, 144))
    return outline_same(p.im)


def ball_bag():
    p = Pic(22, 20)
    p.poly([(3, 19), (2, 10), (6, 6), (16, 6), (20, 10), (19, 19)], (120, 100, 66)); p.l(6, 6, 16, 6, ROPE_C, 2)
    for x, y in ((6, 3), (11, 2), (16, 4)):
        shade_ball(p, x, y + 1, 2.6, ((30, 30, 34), (52, 54, 60), (80, 84, 92), (140, 144, 152)))
    p.l(5, 14, 16, 13, (96, 80, 52))
    return outline_same(p.im)


@builder('items')
def make_items():
    for name, im in (('pick_hookchain', hook_pick()), ('pick_bombard', bombard_pick()), ('item_cannonballs', ball_bag())):
        save(hard(im.crop(im.getbbox())), G_OUT + name + '.png')


@builder('particles')
def make_particles():
    fr = []                                                                   # a few flies (2 frames 8x8)
    for k in range(2):
        p = Pic(8, 8)
        r2 = random.Random(900 + k)
        for _ in range(4):
            x, y = r2.randrange(0, 7), r2.randrange(0, 7)
            p.p(x, y, FLY[1]); p.p(x + 1, y, FLY[0]); p.p(x, y - 1 if y else y, FLY[3])
        fr.append(p.im)
    save(cells(fr, 8, 8), G_OUT + 'part_flies.png', 2)
    fr = []                                                                   # a clod of mud (flying / splatted)
    for k in range(2):
        p = Pic(8, 8)
        if k == 0:
            shade_ball(p, 3.5, 4, 2.5, (MUD[0], MUD[1], MUD[2], MUD[3]))
        else:
            p.e(0, 5, 7, 7, MUD[1]); p.p(1, 3, MUD[2]); p.p(6, 2, MUD[2]); p.p(3, 4, MUD[3])
        fr.append(p.im)
    save(cells(fr, 8, 8), G_OUT + 'part_mud.png', 2)
    fr = []                                                                   # a spectral wisp (ghost soldiers)
    for k in range(2):
        p = Pic(10, 10)
        r = 2 + k
        p.e(5 - r, 5 - r, 5 + r - 1, 5 + r - 1, GHO[2]); p.e(5 - r + 1, 5 - r, 5 + r - 2, 5 + r - 3, GHO[4])
        fr.append(dither_hole(p.im, 0.2 * (k + 1), k))
    save(cells(fr, 10, 10), G_OUT + 'part_ghostwisp.png', 2)


@builder('icons')
def make_icons():
    p = Pic(8, 8)                                                             # HUD: slipping (a foot skidding)
    p.bitmap(0, 0, ["........", "...##...", "...##...", "..###...", ".####...", "######..", "......#.", ".#.#.#.#"], {'#': WHITE})
    save(p.im, G_OUT + 'icon_slick.png')
    p = Pic(8, 8)                                                             # HUD: stuck in deep mud
    p.bitmap(0, 0, ["...##...", "...##...", "..####..", "...##...", "...##...", "#.#..#.#", "########", ".######."], {'#': WHITE})
    save(p.im, G_OUT + 'icon_mud.png')


# ================================================================== CONTACT SHEET AND CHECKS
NEW_WEAPONS = ('hookchain', 'bombard')


def make_sheet():
    man = _manifest()
    try:
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
        if os.path.basename(path).startswith(('enemies', 'boss')):
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
    64x64 with a mean brightness of 40-115; every enemy sheet has all five states."""
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
            ok = im.size == want and 40 <= lum <= 115
            print(f'  {os.path.basename(path)}: {im.size[0]}x{im.size[1]} mean luminance {lum:.0f}' + ('' if ok else '  <-- OUT OF RANGE'))
    if bad:
        print('PARTIAL ALPHA:', bad)
    for tag, b in EDGE:
        print('TOUCHES EDGE:', tag, b)
    man = _manifest()
    for sh in ('butcher', 'pigman', 'flies', 'crawler', 'ghostsoldier', 'ghostarcher', 'ghostrider', 'crows'):
        have = [st for st in ('idle', 'movement', 'attack', 'take_damage', 'death') if G_OUT + f'enemies-{sh}_{st}.png' in man]
        if have and len(have) != 5:
            print('INCOMPLETE ENEMY SET:', sh, have)
    for b in ('butcher', 'warlord'):
        have = [st for st in ('idle', 'attack', 'cast', 'hurt', 'death') if G_OUT + f'boss_{b}_{st}.png' in man]
        if have and len(have) != 5:
            print('INCOMPLETE BOSS SET:', b, have)


def bbox_report():
    for path in sorted(SAVED):
        nm = os.path.basename(path)
        if nm.endswith('_idle.png'):
            im = Image.open(path)
            c = im.crop((0, 0, im.height, im.height))
            b = c.getbbox()
            print(f'  {nm}: cell {im.height}, figure {b[2] - b[0]}x{b[3] - b[1]} px, rows {b[1]}..{b[3] - 1}')


def tile_preview():
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
    out.save(SCR + 'v23_tiles.png')


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
