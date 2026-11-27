#!/usr/bin/env python3
"""Version 30 graphics for Krypta ("Ruinstaden och Glasbruket"): the ruined town and the glassworks, eight new enemies,
the mayor and the glass master, textures, props, items, particles and HUD icons.

Run from anywhere:  python3 -B tools/props21/make.py [name ...]   (contact sheet <scratchpad>/g30/v30_sheet.png, seams v30_tiles.png)
The first-person weapons sling / glassgun come from tools/props21/fp_defs.py + tools/weapon-frames (render-static.mjs,
pack.py, pixelstyle.py, the glove of glove_def.py); the unstyled packed strips are kept in tools/props21/fp_orig/.

Names: every name of the contract was free. Particles part_dust / part_ember / part_rock / part_shard / part_glassshard
already exist, so the new ones are part_ruindust, part_kilnember, part_rubble30 and part_moltenglass (glass shards reuse
part_glassshard, two blue 7x7 shards).

Out to assets/gfx (enemy cells 64x64, feet row 57, idle 4, movement 6, attack 6, take_damage 3, death 6):
  enemies-looter_*       a hooded scavenger in rags with a sack and throwing knives (attack = throws a knife, low on hp he runs)
  enemies-rubblegolem_*  a hulking golem of masonry: brick and plaster blocks, a door lintel for shoulders (attack = hurls a block)
  enemies-rooftopper_*   a crossbowman in a wide hat and dusty scarf (attack = aims, looses a bolt)
  enemies-dustdevil_*    a whirl of ochre dust with stones, straw and paper in it, two dim eyes (flying, drawn low)
  enemies-glassblower_*  a glassblower in a leather apron and goggles with a long blowpipe (attack = blows a glass bubble)
  enemies-glassgolem_*   a see-through golem of cold blue glass (ordered dither) with a glowing orange core (death = shatters)
  enemies-slagcrawler_*  a low, glowing crawler of black slag crust with orange cracks and stubby legs
  enemies-kilnspirit_*   a flying flame spirit in a cracked kiln-clay mask (attack = dives as a streak, death = bursts)
  boss_mayor_{idle,attack,cast,hurt,death} (116x116): a ghostly giant mayor in a fur-trimmed robe and tall hat, the gold
      chain of office, a mace-like staff of office (attack = staff slam with roof debris, cast = raises the staff with dust rings)
  boss_glassmaster_{...}: a giant glassblower, half turned to glass, with a blowpipe and a glowing gather (attack = pipe swing,
      cast = blows a great bubble / dome; death = shatters into glass)
  prop_brokencolumn, prop_fallenbeam, prop_ruinstatue, prop_furnace (2 frames), prop_glassrack, prop_glassrack_broken,
  prop_glassbench, pick_sling, pick_glassgun, item_slingstones, item_glass, part_ruindust (3, 10x10),
  part_kilnember (2, 6x6), part_rubble30 (3, 8x8), part_moltenglass (2, 8x8), icon_heat, icon_shards (8x8)
Out to assets/wall: wall_ruinbrick, wall_ruinplaster, wall_boss_mayor, wall_kilnbrick, wall_glassshelf,
  wall_boss_glassmaster (64x128); floor_ruincobble, floor_ruinplaza, floor_boss_mayor, floor_glassworks, floor_slag,
  floor_boss_glassmaster, floor_cracked30, floor_rubble, floor_moltenglass, floor_shards, floor_furnacevent (64x64),
  mean brightness 40-115.
Everything is drawn procedurally with the helpers of tools/props2-props20 (no outside image).
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


P20 = _load('props20make', 'props20')          # loads props2-props19 itself; only pure drawing helpers are used
P19, P18, P17, P16 = P20.P19, P20.P18, P20.P17, P20.P16
for _k in ('Pic outline_same hard shift gmap blend tint shear squash strip cut_below pool pnoise spark dark flash tube '
           'bez puff flame halo put dust wrap_pic poly_r ell shade_ball on cells rig fall pt stops stone_rgb x2 plank_v plank_h '
           'I0 I1 I2 I3 F0 F1 F2 F3 AU0 AU1 AU2 AU3 AU4 BR0 BR1 BR2 BR3 BR4 WD0 WD1 WD2 WD3 WD4 SKIN BLK RUST '
           'ground_it dither_hole flames BONE LEATH GLOW cobble_rgb STEELC TILE GROUT ARM').split():
    globals()[_k] = next(getattr(m, _k) for m in (P20, P19, P18, P17, P16) if hasattr(m, _k))

G_OUT, W_OUT = ROOT + '/assets/gfx/', ROOT + '/assets/wall/'
SCR = '/tmp/claude-0/-home-user/80ee56ba-2fa6-5354-b261-a4ca4fdcb508/scratchpad/g30/'
SHEET, MANIFEST = SCR + 'v30_sheet.png', SCR + 'v30_manifest.json'
WHITE = (255, 255, 255)
FW, FEET = 64, 57                                       # enemy cells
BS, BS_FEET = 116, 115                                  # boss cells
TAU = math.tau

# ---------------------------------------------------------------- ruined town palettes (grey-ochre, dusty)
RST = ((44, 40, 34), (70, 64, 54), (100, 92, 78), (132, 122, 102), (164, 152, 128))     # weathered limestone
PLA = ((92, 84, 70), (124, 114, 96), (154, 144, 122), (182, 172, 148))                   # old plaster
BRK = ((58, 30, 24), (90, 46, 32), (120, 66, 44), (150, 92, 62))                         # faded red brick
DUS = ((96, 84, 64), (128, 114, 88), (160, 146, 114), (196, 182, 148))                   # dust / sand
SKYR = ((118, 110, 92), (146, 136, 112), (174, 164, 136))                                # grey-ochre sky
RAG = ((50, 44, 38), (76, 68, 56), (104, 94, 76), (134, 122, 100))                       # dusty rags
GHM = ((44, 58, 54), (70, 92, 84), (110, 136, 124), (166, 190, 174), (218, 238, 224))    # the mayor's pale spectral green
ROBE = ((40, 22, 30), (70, 34, 46), (104, 52, 64), (140, 78, 88))                        # faded plum robe
FUR = ((100, 92, 80), (140, 132, 116), (186, 178, 160), (220, 214, 198))
# ---------------------------------------------------------------- glassworks palettes (orange glow against cold blue glass)
KBR = ((40, 24, 20), (66, 36, 26), (96, 50, 32), (128, 70, 44), (160, 96, 60))           # kiln brick
SOOT = (22, 18, 18)
HOT = ((110, 30, 8), (190, 70, 16), (240, 128, 34), (255, 196, 90), (255, 240, 196))     # orange glow
GLS = ((26, 48, 72), (52, 100, 132), (100, 172, 206), (172, 226, 244), (236, 254, 255))  # cold blue glass (part_glassshard)
GLG = ((24, 60, 52), (44, 104, 88), (92, 164, 140), (170, 226, 204))                     # green bottle glass
SLAG = ((20, 18, 20), (36, 32, 34), (56, 50, 50), (80, 72, 70))

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
    return save(hard(im), G_OUT + f'prop_{name}.png', len(frames))


def finish(rgb, name, colors=48, half=True):
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


def mix(a, b, t):
    return tuple(int(round(a[i] * (1 - t) + b[i] * t)) for i in range(3))


# ================================================================== RUINED TOWN TEXTURES
def brick_rows(w, h, seed, bw=8, bh=4, pal=BRK, mortar=None, k=1.0):
    """Half-res running-bond brickwork (tiles both ways): faded red bricks of varied shade, dusty mortar, chipped corners."""
    mortar = mortar or DUS[0]
    nz = pnoise(w, h, seed, ((16, 1.0), (8, 0.5), (4, 0.25)))
    rgb = gmap(np.clip((0.3 + nz * 0.5) * k, 0, 1), stops(pal))
    yy, xx = np.mgrid[0:h, 0:w]
    r2 = random.Random(seed)
    row = yy // bh
    col = (xx + (row % 2) * (bw // 2)) // bw
    shade = np.array([[r2.uniform(-0.16, 0.12) for _ in range(w // bw + 2)] for _ in range(h // bh + 2)])
    rgb = rgb * (1 + shade[row, col % shade.shape[1]][..., None])
    m = (yy % bh == 0) | (((xx + (row % 2) * (bw // 2)) % bw) == 0)
    rgb[m] = mortar
    rgb[(yy % bh == 1) & ~m] *= 1.1
    return rgb


def stone_blocks(w, h, seed, bw=16, bh=8, pal=RST, k=1.0, stagger=True):
    """Half-res dressed stone blocks (limestone): noise per block, dark joints, a light top edge."""
    nz = pnoise(w, h, seed, ((16, 1.0), (8, 0.5), (4, 0.3)))
    rgb = gmap(np.clip((0.3 + nz * 0.45) * k, 0, 1), stops(pal))
    yy, xx = np.mgrid[0:h, 0:w]
    r2 = random.Random(seed)
    row = yy // bh
    off = (row % 2) * (bw // 2) if stagger else 0
    col = (xx + off) // bw
    shade = np.array([[r2.uniform(-0.12, 0.12) for _ in range(w // bw + 2)] for _ in range(h // bh + 2)])
    rgb = rgb * (1 + shade[row, col % shade.shape[1]][..., None])
    j = (yy % bh == 0) | (((xx + off) % bw) == 0)
    rgb[j] = pal[0]
    rgb[(yy % bh == 1) & ~j] = rgb[(yy % bh == 1) & ~j] * 1.12
    return rgb


def cracks(rgb, seed, n=3, col=None, box=None, length=(10, 22), w=1):
    """Jagged dark cracks (random walks with a branch) on a half- or full-res array."""
    h, wd = rgb.shape[:2]
    col = col if col is not None else (24, 20, 16)
    r2 = random.Random(seed)
    x0, y0, x1, y1 = box or (0, 0, wd, h)
    for _ in range(n):
        x, y = r2.uniform(x0, x1), r2.uniform(y0, y1)
        a = r2.uniform(0, TAU)
        for s in range(r2.randint(*length)):
            a += r2.uniform(-0.7, 0.7)
            x, y = x + math.cos(a), y + math.sin(a)
            xi, yi = int(x) % wd, int(min(h - 1, max(0, y)))
            rgb[yi, xi] = col
            if w > 1:
                rgb[yi, (xi + 1) % wd] = col
            if s == 6 and r2.random() < 0.7:
                bx, by, ba = x, y, a + r2.choice((-1.1, 1.1))
                for _ in range(r2.randint(3, 7)):
                    ba += r2.uniform(-0.5, 0.5)
                    bx, by = bx + math.cos(ba), by + math.sin(ba)
                    rgb[int(min(h - 1, max(0, by))), int(bx) % wd] = col


def ragged_top(rgb, seed, y0, y1, sky=SKYR, rim=None):
    """A broken wall top: everything above a jagged line between rows y0..y1 is sky, the line itself gets a light rim."""
    h, w = rgb.shape[:2]
    r2 = random.Random(seed)
    y = r2.uniform(y0, y1)
    for x in range(w):
        y = min(y1, max(y0, y + r2.choice((-2, -1, 0, 0, 1, 2))))
        if x % 8 == 0 and r2.random() < 0.4:
            y = min(y1, y + 3)
        for yy in range(int(y)):
            rgb[yy, x] = sky[min(2, yy * 3 // max(1, int(y)))]
        if rim is not None:
            rgb[int(y), x] = rim


def tex_wall_ruinbrick():
    """A ruined brick wall: faded red running bond, a broken jagged top against the dusty grey-ochre sky, holes knocked
    through where bricks fell out, a soot-dark patch and pale dust drifted against its foot."""
    w, h = 32, 64
    rgb = brick_rows(w, h, 3001)
    ragged_top(rgb, 3002, 3, 11, rim=BRK[3])
    r2 = random.Random(3003)
    for _ in range(4):                                                               # missing bricks
        x, y = r2.randrange(0, 4) * 8 + (4 if r2.random() < 0.5 else 0), r2.randrange(4, 13) * 4
        rgb[y + 1:y + 4, x + 1:x + 8] = (22, 18, 16)
        rgb[y + 1, x + 1:x + 8] = (40, 32, 26)
    cracks(rgb, 3004, 3, (34, 22, 18), (0, 14, 32, 60))
    yy = np.arange(h)[:, None, None]
    rgb[:] = np.where(yy > 54, rgb * 0.55 + np.array(DUS[2]) * 0.45, rgb)
    finish(rgb, 'wall_ruinbrick.png', 40)


def tex_wall_ruinplaster():
    """A cracked plaster house wall: dirty ochre plaster flaking off to show the stone and brick behind, a boarded-up
    window, long cracks and a dark rain stain."""
    w, h = 32, 64
    nz = pnoise(w, h, 3011, ((16, 1.0), (8, 0.5), (4, 0.25)))
    rgb = gmap(np.clip(0.35 + nz * 0.45, 0, 1), stops(PLA))
    under = brick_rows(w, h, 3012, k=0.9)
    fl = pnoise(w, h, 3013, ((8, 1.0), (4, 0.5)))
    m = fl > 0.66
    rgb[m] = under[m]
    edge = (fl > 0.62) & ~m
    rgb[edge] = PLA[3]
    p = Pic(w, h)                                                                    # boarded window
    p.r(9, 16, 22, 34, (20, 18, 16)); p.r(8, 15, 23, 15, RST[3]); p.r(8, 35, 23, 36, RST[3])
    for y, a in ((19, 1), (25, -1), (31, 1)):
        p.poly([(8, y - 1 + a), (23, y - 1 - a), (23, y + 1 - a), (8, y + 1 + a)], WD2); p.l(8, y - 1 + a, 23, y - 1 - a, WD3)
        p.p(10, y + a, I1); p.p(21, y - a, I1)
    put(rgb, outline_same(p.im))
    cracks(rgb, 3014, 4, (52, 44, 34), (0, 0, 32, 64), (12, 26))
    st = pnoise(w, h, 3015, ((16, 1.0), (8, 0.4)))
    yy, xx = np.mgrid[0:h, 0:w]
    sm = (st > 0.62) & (yy > 36)
    rgb[sm] *= 0.8
    rgb[:2] = RST[1]; rgb[2] = RST[3]
    finish(rgb, 'wall_ruinplaster.png', 40)


def tex_wall_boss_mayor():
    """The mayor's wall: the dressed stone facade of the ruined town hall - a cracked stone clock with stopped hands at the
    top, a torn civic banner (a gold key under a crown on deep blue) hanging from an iron rod, a chain of office carved in
    relief and rubble at the foot."""
    w, h = 64, 128
    rgb = x2(stone_blocks(32, 64, 3021, 16, 8, RST, 0.95))
    p = Pic(w, h)
    p.e(16, 6, 47, 37, RST[0]); p.e(18, 8, 45, 35, RST[4]); p.e(20, 10, 43, 33, (206, 196, 170))
    for j in range(12):
        a = j / 12 * TAU
        p.l(31.5 + math.cos(a) * 9, 21.5 + math.sin(a) * 9, 31.5 + math.cos(a) * 11, 21.5 + math.sin(a) * 11, RST[1], 2 if j % 3 == 0 else 1)
    p.l(31.5, 21.5, 31.5, 13, BLK[1], 2); p.l(31.5, 21.5, 38, 25, BLK[1], 2)
    p.lines([(22, 12), (27, 18), (25, 24), (30, 30), (28, 34)], RST[0], 1)
    p.l(8, 44, 56, 44, I1, 2); p.e(6, 42, 10, 46, I2); p.e(54, 42, 58, 46, I2)
    pts = [(12, 46), (52, 46), (52, 92), (46, 86), (42, 98), (36, 90), (30, 100), (24, 88), (18, 94), (12, 86)]
    p.poly(pts, (36, 48, 92)); p.lines(pts + [pts[0]], (22, 30, 60), 2); p.l(14, 48, 14, 84, (60, 76, 130))
    p.poly([(24, 56), (27, 50), (30, 54), (32, 49), (34, 54), (37, 50), (40, 56)], AU2); p.r(24, 56, 40, 58, AU3)
    p.e(28, 62, 36, 70, AU2); p.e(30, 64, 34, 68, (36, 48, 92)); p.r(31, 70, 33, 84, AU2); p.r(33, 76, 37, 78, AU2); p.r(33, 81, 36, 83, AU2)
    for j in range(9):
        x = 14 + j * 4.5
        p.e(x - 1.5, 104 + math.sin(j / 8 * math.pi) * 6 - 1.5, x + 1.5, 104 + math.sin(j / 8 * math.pi) * 6 + 1.5, AU1)
    p.e(28, 109, 36, 117, AU1); p.e(30, 111, 34, 115, AU3)
    put(rgb, outline_same(p.im))
    sm = rgb[::2, ::2].copy(); cracks(sm, 3022, 3, (30, 26, 20), (0, 20, 32, 64)); rgb[:] = x2(sm)
    yy = np.arange(h)[:, None, None]
    rgb[:] = np.where(yy > 118, rgb * 0.6 + np.array(DUS[1]) * 0.4, rgb)
    finish(rgb, 'wall_boss_mayor.png', 64, half=False)


def tex_floor_ruincobble():
    rgb = cobble_rgb(3031, RST, 0.0)
    dz = pnoise(64, 64, 3032, ((32, 1.0), (16, 0.5))) > 0.6
    rgb[dz] = rgb[dz] * 0.55 + np.array(DUS[2]) * 0.45
    finish(rgb, 'floor_ruincobble.png', 40, half=False)


def plaza_rgb(seed, k=1.0):
    """Plaza flagstones (half-res 32x32, tiles): worn limestone slabs of two sizes, dusty joints, chips, a cracked slab."""
    rgb = stone_blocks(32, 32, seed, 8, 8, RST, k)
    nz = pnoise(32, 32, seed + 5, ((8, 1.0), (4, 0.5), (2, 0.3)))
    rgb *= (0.88 + nz * 0.24)[..., None]
    yy, xx = np.mgrid[0:32, 0:32]
    j = (yy % 8 == 0) | (((xx + ((yy // 8) % 2) * 4) % 8) == 0)
    rgb[j] = DUS[0]
    r2 = random.Random(seed + 1)
    for _ in range(10):
        x, y = r2.randrange(32), r2.randrange(32)
        rgb[y, x] = RST[0]
    cracks(rgb, seed + 2, 2, RST[0], (2, 2, 30, 30), (5, 9))
    return rgb


def tex_floor_ruinplaza():
    finish(plaza_rgb(3041), 'floor_ruinplaza.png', 32)


def tex_floor_boss_mayor():
    """The town-hall floor: plaza slabs round a cracked mosaic medallion - the town's gold key on deep blue in a ring."""
    rgb = x2(plaza_rgb(3051, 0.9))
    p = Pic(64, 64)
    p.e(10, 10, 53, 53, RST[0]); p.e(12, 12, 51, 51, AU1); p.e(15, 15, 48, 48, (36, 48, 92))
    for j in range(16):
        a = j / 16 * TAU
        p.p(31.5 + math.cos(a) * 18.5, 31.5 + math.sin(a) * 18.5, AU3)
    p.e(24, 18, 34, 28, AU2); p.e(27, 21, 31, 25, (36, 48, 92)); p.r(28, 28, 30, 44, AU2); p.r(30, 36, 35, 38, AU2); p.r(30, 41, 34, 43, AU2)
    put(rgb, outline_same(p.im))
    cracks(rgb, 3052, 3, (24, 22, 18), (10, 10, 54, 54), (14, 28))
    finish(rgb, 'floor_boss_mayor.png', 48, half=False)


def tex_floor_cracked30():
    """A floor under a sagging roof: the town cobbles split by a web of wide dark cracks round a sunken centre, plaster
    dust and grit fallen from above (it reads as unsafe, not as a hole)."""
    rgb = cobble_rgb(3061, RST, 0.0) * 0.95
    yy, xx = np.mgrid[0:64, 0:64]
    d = np.hypot(xx - 31.5, yy - 31.5)
    rgb[d < 16] *= 0.78
    rgb[d < 9] *= 0.85
    p = Pic(64, 64)
    r2 = random.Random(3062)
    for j in range(9):                                                               # radiating cracks from the sunken middle
        a = j / 9 * TAU + r2.uniform(-0.2, 0.2)
        x, y, pts = 31.5, 31.5, [(31.5, 31.5)]
        for s_ in range(r2.randint(5, 8)):
            a += r2.uniform(-0.45, 0.45)
            x, y = x + math.cos(a) * 4, y + math.sin(a) * 4
            pts.append((x, y))
        p.lines(pts, (12, 10, 8), 2 if j % 2 else 1)
        if len(pts) > 4:
            bx, by = pts[3]
            p.l(bx, by, bx + math.cos(a + 1.2) * 6, by + math.sin(a + 1.2) * 6, (12, 10, 8))
    for k_ in range(3):                                                              # a ring crack
        r = 10 + k_ * 0.5
        p.arc(31.5 - r, 31.5 - r, 31.5 + r, 31.5 + r, 20 + k_ * 120, 100 + k_ * 120, (12, 10, 8), 2)
    put(rgb, p.im)
    for _ in range(60):                                                              # fallen grit and plaster flakes
        x, y = r2.randrange(64), r2.randrange(64)
        rgb[y, x] = PLA[r2.randrange(2, 4)]
    finish(rgb, 'floor_cracked30.png', 40, half=False)


def rubble_pic(seed, n=26, box=(2, 6, 62, 62), pal=None, size=(4, 10)):
    """A heap of broken bricks and stone lumps (outlined, light from the top left)."""
    p = Pic(64, 64)
    r2 = random.Random(seed)
    x0, y0, x1, y1 = box
    for j in range(n):
        x, y = r2.uniform(x0, x1), r2.uniform(y0, y1)
        w, hh = r2.uniform(*size), r2.uniform(size[0] * 0.7, size[1] * 0.7)
        if r2.random() < 0.45:
            c = BRK[r2.randrange(1, 4)]
            poly_r(p, [(x - w / 2, y - hh / 2), (x + w / 2, y - hh / 2), (x + w / 2, y + hh / 2), (x - w / 2, y + hh / 2)], c, x, y, r2.uniform(-0.8, 0.8))
            p.l(x - w / 2 + 1, y - hh / 2 + 1, x + w / 2 - 2, y - hh / 2 + 1, BRK[3])
        else:
            c = (pal or RST)[r2.randrange(1, 5)]
            pts = [(x + math.cos(a) * w / 2 * r2.uniform(0.7, 1.1), y + math.sin(a) * hh / 2 * r2.uniform(0.7, 1.1)) for a in np.linspace(0, TAU, 7)[:-1]]
            p.poly(pts, c); p.p(x - w / 4, y - hh / 4, RST[4])
    return outline_same(p.im, (30, 26, 22))


def tex_floor_rubble():
    """A heap of rubble on the cobbles: broken brick, limestone lumps, a splintered lath, a pale skin of plaster dust."""
    rgb = cobble_rgb(3071, RST, 0.0) * 0.8
    dz = pnoise(64, 64, 3072, ((16, 1.0), (8, 0.5))) > 0.45
    rgb[dz] = rgb[dz] * 0.5 + np.array(DUS[1]) * 0.5
    p = Pic(64, 64)
    p.l(8, 44, 40, 30, WD2, 2); p.l(8, 43, 40, 29, WD3)
    put(rgb, outline_same(p.im))
    put(rgb, rubble_pic(3073))
    finish(rgb, 'floor_rubble.png', 48, half=False)


# ================================================================== GLASSWORKS TEXTURES
def kiln_rgb(w, h, seed, k=1.0, soot=0.35):
    """Half-res kiln firebrick: dark red-brown bricks, black soot creeping up, a few bricks scorched pale."""
    rgb = brick_rows(w, h, seed, 8, 4, KBR[1:], (30, 20, 18), k)
    sz = pnoise(w, h, seed + 7, ((16, 1.0), (8, 0.5)))
    m = sz > 1 - soot
    rgb[m] = rgb[m] * 0.45 + np.array(SOOT) * 0.55
    return rgb


def tex_wall_kilnbrick():
    """A kiln wall: sooty firebrick round a small arched annealing-oven door with a glowing slit, the mortar near the door
    glowing hot orange, an iron tie bar across."""
    w, h = 32, 64
    rgb = kiln_rgb(w, h, 3101)
    p = Pic(w, h)
    p.e(7, 30, 24, 44, KBR[0]); p.r(7, 37, 24, 56, KBR[0])
    p.e(9, 32, 22, 42, (20, 12, 10)); p.r(9, 37, 22, 54, (20, 12, 10))
    p.r(10, 44, 21, 52, I1); p.l(10, 44, 21, 44, I2); p.r(11, 47, 20, 48, HOT[2]); p.l(12, 47, 19, 47, HOT[3])
    p.r(14, 50, 17, 51, I3)
    p.l(0, 12, 31, 12, I1, 2); p.l(0, 11, 31, 11, I2); p.e(3, 10, 6, 13, I2); p.e(25, 10, 28, 13, I2)
    put(rgb, outline_same(p.im))
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.hypot((xx - 15.5) / 1.2, yy - 46)
    mort = (rgb.sum(-1) < 150) & (d < 16) & (d > 10)
    rgb[mort] = HOT[1]
    rgb[mort & (d < 12.5)] = HOT[2]
    finish(rgb, 'wall_kilnbrick.png', 40)


def bottle(p, x, y, kind, pal):
    """A glass vessel standing on (x, y): 0 = bottle, 1 = round flask, 2 = vase, 3 = goblet; a bright highlight."""
    c0, c1, c2, c3 = pal[0], pal[1], pal[2], pal[3]
    if kind == 0:
        p.r(x - 2, y - 7, x + 2, y, c1); p.r(x - 1, y - 11, x + 1, y - 7, c1); p.p(x - 1, y - 6, c3); p.l(x - 1, y - 5, x - 1, y - 2, c2)
    elif kind == 1:
        p.e(x - 4, y - 7, x + 4, y, c1); p.r(x - 1, y - 11, x + 1, y - 7, c1); p.p(x - 2, y - 5, c3); p.p(x - 1, y - 6, c2)
    elif kind == 2:
        p.poly([(x - 3, y), (x + 3, y), (x + 4, y - 5), (x + 2, y - 9), (x - 2, y - 9), (x - 4, y - 5)], c1); p.l(x - 2, y - 7, x - 3, y - 3, c3)
    else:
        p.poly([(x - 4, y - 9), (x + 4, y - 9), (x + 1, y - 4), (x - 1, y - 4)], c1); p.l(x, y - 4, x, y - 1, c1); p.l(x - 2, y, x + 2, y, c1)
        p.l(x - 3, y - 8, x - 1, y - 5, c3)
    p.p(x + 1, y - 1, c0)


def tex_wall_glassshelf():
    """The glass workshop panel: dark timber boards with three shelves of finished glass - blue and green bottles, flasks,
    vases and goblets catching the light - and a dusty iron bracket under each shelf."""
    w, h = 32, 64
    rgb = np.zeros((h, w, 3))
    for i, x0 in enumerate(range(0, 32, 8)):
        plank_v(rgb, x0, x0 + 8, 0, 64, 3111 + i, (WD0, WD1, WD2, WD3, WD4))
    rgb *= 0.75
    p = Pic(w, h)
    r2 = random.Random(3112)
    for sy in (20, 40, 60):
        p.r(0, sy, 31, sy + 1, WD3); p.l(0, sy + 2, 31, sy + 2, WD0)
        for bx in (4, 27):
            p.l(bx, sy + 2, bx, sy + 3, I1)
        x = 3
        while x < 30:
            kind = r2.randrange(4)
            pal = GLS[1:] if r2.random() < 0.65 else GLG
            bottle(p, x, sy - 1, kind, pal)
            x += r2.choice((6, 7, 8))
    put(rgb, outline_same(p.im))
    finish(rgb, 'wall_glassshelf.png', 48)


def tex_wall_boss_glassmaster():
    """The glass master's wall: kiln brick round a great round window of stained glass - a cold blue and amber rosette in
    an iron frame - and below it the arched mouth of the great furnace, roaring orange."""
    w, h = 64, 128
    rgb = x2(kiln_rgb(32, 64, 3121, 0.95, 0.3))
    p = Pic(w, h)
    cx, cy = 31.5, 34
    p.e(cx - 26, cy - 26, cx + 26, cy + 26, I0); p.e(cx - 23, cy - 23, cx + 23, cy + 23, GLS[1])
    for j in range(12):
        a0, a1 = j / 12 * 360, (j + 1) / 12 * 360
        col = (GLS[2], HOT[2], GLS[3], (200, 140, 40))[j % 4]
        p.d.pieslice((cx - 21, cy - 21, cx + 21, cy + 21), a0, a1, fill=col + (255,))
    for j in range(12):
        a = j / 12 * TAU
        p.l(cx, cy, cx + math.cos(a) * 22, cy + math.sin(a) * 22, I0, 2)
    p.e(cx - 12, cy - 12, cx + 12, cy + 12, I0); p.e(cx - 10, cy - 10, cx + 10, cy + 10, GLS[3])
    p.e(cx - 5, cy - 5, cx + 5, cy + 5, HOT[3]); p.e(cx - 2, cy - 2, cx + 2, cy + 2, HOT[4])
    p.e(10, 76, 53, 104, KBR[0]); p.r(10, 90, 53, 127, KBR[0])
    p.e(14, 80, 49, 104, HOT[0]); p.r(14, 92, 49, 127, HOT[0])
    p.e(18, 86, 45, 108, HOT[1]); p.r(18, 98, 45, 127, HOT[1])
    p.e(23, 96, 40, 116, HOT[2]); p.r(23, 106, 40, 127, HOT[2]); p.e(27, 106, 36, 122, HOT[3]); p.r(27, 114, 36, 127, HOT[3])
    put(rgb, outline_same(p.im))
    finish(rgb, 'wall_boss_glassmaster.png', 64, half=False)


def works_rgb(seed, k=1.0):
    """The glassworks floor (half-res 32x32): worn dark stone flags with soot, glints of broken blue glass in the joints."""
    rgb = stone_blocks(32, 32, seed, 16, 8, ((30, 28, 30), (50, 46, 48), (72, 66, 66), (96, 88, 86), (120, 112, 106)), k)
    sz = pnoise(32, 32, seed + 3, ((16, 1.0), (8, 0.5))) > 0.62
    rgb[sz] = rgb[sz] * 0.6 + np.array(SOOT) * 0.4
    r2 = random.Random(seed + 4)
    for _ in range(7):
        x, y = r2.randrange(32), r2.randrange(32)
        rgb[y, x] = GLS[r2.randrange(2, 5)]
    return rgb


def tex_floor_glassworks():
    finish(works_rgb(3131), 'floor_glassworks.png', 32)


def slag_rgb(seed, hot=0.08):
    """Slag (full 64x64): black-brown glassy lumps with dull rims and a few faintly glowing cracks."""
    nz = pnoise(64, 64, seed, ((16, 1.0), (8, 0.6), (4, 0.3)))
    rgb = gmap(np.clip(0.2 + nz * 0.6, 0, 1), stops(SLAG + ((104, 92, 86),)))
    yy, xx = np.mgrid[0:64, 0:64]
    lz = pnoise(64, 64, seed + 1, ((8, 1.0), (4, 0.5)))
    rgb[(lz > 0.48) & (lz < 0.52)] = SLAG[0]
    hz = pnoise(64, 64, seed + 2, ((16, 1.0), (8, 0.5)))
    m = (np.abs(hz - 0.5) < hot * 0.4)
    rgb[m] = HOT[0]
    rgb[m & (np.abs(hz - 0.5) < hot * 0.15)] = HOT[1]
    return rgb


def tex_floor_slag():
    finish(slag_rgb(3141), 'floor_slag.png', 40, half=False)


def tex_floor_boss_glassmaster():
    """The glass master's floor: riveted iron plates round a circular grate over the glow, ringed by a band of blue glass."""
    rgb = np.zeros((64, 64, 3)) + np.array(I1)
    nz = pnoise(64, 64, 3151, ((16, 1.0), (8, 0.5)))
    rgb = gmap(np.clip(0.3 + nz * 0.4, 0, 1), stops((I0, I1, I2, I3)))
    yy, xx = np.mgrid[0:64, 0:64]
    rgb[(xx % 32 == 0) | (yy % 32 == 0)] = I0
    for x in (3, 28, 35, 60):
        for y in (3, 28, 35, 60):
            rgb[y, x] = I3
    p = Pic(64, 64)
    p.e(12, 12, 51, 51, I0); p.e(14, 14, 49, 49, GLS[1]); p.arc(14, 14, 49, 49, 200, 320, GLS[3], 2)
    p.e(19, 19, 44, 44, I0); p.e(21, 21, 42, 42, HOT[1]); p.e(25, 25, 38, 38, HOT[2]); p.e(28, 28, 35, 35, HOT[3])
    for j in range(-2, 3):
        p.l(31.5 + j * 4, 21, 31.5 + j * 4, 42, I0); p.l(21, 31.5 + j * 4, 42, 31.5 + j * 4, I0)
    put(rgb, outline_same(p.im))
    finish(rgb, 'floor_boss_glassmaster.png', 48, half=False)


def tex_floor_moltenglass():
    """A spill of molten glass: a glowing orange pool with yellow-white swirls, a dark cooled crust at its ragged edge and
    on the soot-black floor round it (kept dark enough on average that it does not wash out)."""
    rgb = x2(works_rgb(3161, 0.7)) * 0.6
    yy, xx = np.mgrid[0:64, 0:64]
    nz = pnoise(64, 64, 3162, ((16, 1.0), (8, 0.5)))
    d = np.hypot(xx - 31.5, (yy - 31.5) * 1.15) + (nz - 0.5) * 22
    crust = d < 27
    rgb[crust] = SLAG[1]
    pool = d < 23
    sw = np.sin((xx * 0.4 + yy * 0.25 + nz * 9)) * 0.5 + 0.5
    lv = np.clip(0.25 + sw * 0.45 - (d / 23) * 0.35, 0, 1)
    rgb[pool] = gmap(lv, stops(HOT[:4]))[pool]
    rgb[pool & (sw > 0.93) & (d < 16)] = HOT[4]
    rgb[(d > 22) & (d < 23.6)] = HOT[0]
    finish(rgb, 'floor_moltenglass.png', 40, half=False)


def shard(p, x, y, s, a, pal=GLS):
    """A sharp glass shard lying at (x, y): a thin triangle, a dark edge and a bright glint."""
    u, v = (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))
    pts = [(x + u[0] * s, y + u[1] * s), (x - u[0] * s * 0.5 + v[0] * s * 0.35, y - u[1] * s * 0.5 + v[1] * s * 0.35),
           (x - u[0] * s * 0.4 - v[0] * s * 0.3, y - u[1] * s * 0.4 - v[1] * s * 0.3)]
    p.poly(pts, pal[2]); p.l(pts[0][0], pts[0][1], pts[1][0], pts[1][1], pal[3]); p.p(x, y, pal[4] if len(pal) > 4 else pal[3])


def tex_floor_shards():
    """Broken glass all over the glassworks floor: dozens of sharp blue and a few green shards with bright glints."""
    rgb = x2(works_rgb(3171, 0.9))
    p = Pic(64, 64)
    r2 = random.Random(3172)
    for j in range(34):
        shard(p, r2.uniform(3, 61), r2.uniform(3, 61), r2.uniform(2.5, 6), r2.uniform(0, TAU), GLS if j % 5 else GLG + (GLG[3],))
    put(rgb, outline_same(p.im, (14, 20, 28)))
    finish(rgb, 'floor_shards.png', 40, half=False)


def tex_floor_furnacevent():
    """A furnace vent: a heat-blackened ring of firebrick round a heavy iron grate with a deep orange glow beneath."""
    rgb = x2(works_rgb(3181, 0.8))
    yy, xx = np.mgrid[0:64, 0:64]
    d = np.hypot(xx - 31.5, yy - 31.5)
    rgb[d < 30] = rgb[d < 30] * 0.5 + np.array(SOOT) * 0.5
    p = Pic(64, 64)
    p.e(9, 9, 54, 54, KBR[1]); p.e(11, 11, 52, 52, KBR[0])
    for j in range(16):
        a = j / 16 * TAU
        p.l(31.5 + math.cos(a) * 18, 31.5 + math.sin(a) * 18, 31.5 + math.cos(a) * 22, 31.5 + math.sin(a) * 22, (30, 20, 18))
    p.e(14, 14, 49, 49, HOT[0]); p.e(18, 18, 45, 45, HOT[1]); p.e(23, 23, 40, 40, HOT[2]); p.e(28, 28, 35, 35, HOT[3])
    for j in range(-3, 4):
        p.l(31.5 + j * 4.5, 14, 31.5 + j * 4.5, 49, I0, 2); p.l(31.5 + j * 4.5 + 1, 15, 31.5 + j * 4.5 + 1, 48, I2)
    p.l(14, 31.5, 49, 31.5, I0, 3)
    put(rgb, outline_same(p.im))
    finish(rgb, 'floor_furnacevent.png', 40, half=False)


@builder('textures')
def make_textures():
    for fn in (tex_wall_ruinbrick, tex_wall_ruinplaster, tex_wall_boss_mayor, tex_wall_kilnbrick, tex_wall_glassshelf, tex_wall_boss_glassmaster,
               tex_floor_ruincobble, tex_floor_ruinplaza, tex_floor_boss_mayor, tex_floor_cracked30, tex_floor_rubble,
               tex_floor_glassworks, tex_floor_slag, tex_floor_boss_glassmaster, tex_floor_moltenglass, tex_floor_shards, tex_floor_furnacevent):
        fn()


# ================================================================== SHARED BITS
def knife(p, x, y, a, L=6):
    """A throwing knife held at (x, y): a short wrapped grip and a narrow steel blade along a."""
    ex, ey = pt(a, 3, x, y)
    p.l(x, y, ex, ey, RAG[0], 2)
    tx, ty = pt(a, L, ex, ey)
    p.l(ex, ey, tx, ty, STEELC[3], 2); p.l(ex, ey, tx, ty, STEELC[4])
    return tx, ty


def stone_block(p, x, y, w, h, pal=RST, brick=False, a=0.0):
    """A masonry block centred on (x, y): brick or limestone, a lit top edge and a chipped corner."""
    pal_ = BRK if brick else pal
    pts = [(x - w / 2, y - h / 2), (x + w / 2, y - h / 2), (x + w / 2, y + h / 2), (x - w / 2, y + h / 2)]
    poly_r(p, pts, pal_[2], x, y, a)
    poly_r(p, [(x - w / 2, y - h / 2), (x + w / 2, y - h / 2), (x + w / 2, y - h / 2 + 1.5), (x - w / 2, y - h / 2 + 1.5)], pal_[3], x, y, a)
    poly_r(p, [(x - w / 2, y + h / 2 - 1.5), (x + w / 2, y + h / 2 - 1.5), (x + w / 2, y + h / 2), (x - w / 2, y + h / 2)], pal_[1], x, y, a)
    if brick and h > 5:
        p.l(x - w / 2 + 1, y, x + w / 2 - 1, y, DUS[0])


def bubble(p, x, y, r, pal=GLS):
    """A blown glass bubble: a thin blue rim, a darker see-through inside (mostly empty), two bright glints."""
    p.e(x - r, y - r, x + r, y + r, pal[2]); p.e(x - r + 1.5, y - r + 1.5, x + r - 1.5, y + r - 1.5, pal[1])
    p.arc(x - r, y - r, x + r, y + r, 190, 300, pal[3], 1)
    p.p(x - r * 0.45, y - r * 0.5, pal[4]); p.p(x - r * 0.3, y - r * 0.6, pal[3]); p.p(x + r * 0.5, y + r * 0.4, pal[2])


def gather(p, x, y, r=2.5, hot=2):
    """The glowing lump of molten glass on the end of a blowpipe."""
    ell(p, x, y, r + 0.8, r, HOT[max(0, hot - 1)]); ell(p, x - 0.3, y - 0.3, r - 0.6, r - 1, HOT[hot]); p.p(x - 0.5, y - 0.6, HOT[min(4, hot + 2)])


# ================================================================== LOOTER (drawn, 64x64)
def looter_raw(step=None, bob=0, lean=2.0, aF=(1.0, 0.6), aB=(0.5, 0.5), kn=1.2, eyes=1, crouch=0, fly=None, sack=True):
    """Side view facing right: a lean town scavenger - a ragged dusty hood, a cloth mask over the face up to the eyes, a
    patched brown coat with a rope belt and a bundle of knives at it, a lumpy plunder sack on the back; a throwing knife in
    the front hand (kn = angle, None = thrown); fly = (x, y, a) the knife spinning through the air."""
    p = Pic(64, 64)
    def far(p, K):
        if sack:
            sx, sy = K['sh']
            p.e(sx - 13, sy - 1, sx - 2, sy + 12, (110, 92, 62)); p.e(sx - 11, sy, sx - 5, sy + 6, (140, 120, 84))
            p.l(sx - 9, sy - 1, sx - 4, sy - 3, (80, 64, 40)); p.p(sx - 7, sy + 8, AU2); p.p(sx - 10, sy + 4, (90, 74, 50))
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.poly([(sx - 5, sy), (sx + 5, sy), (hx + 7, hy + 7), (hx - 6, hy + 7)], RAG[1]); p.l(sx + 5, sy, hx + 7, hy + 7, RAG[3])
        p.l(hx - 6, hy, hx + 6, hy, (120, 100, 66), 1); p.r(hx + 2, hy - 3, hx + 3, hy + 1, STEELC[2]); p.r(hx + 4, hy - 3, hx + 5, hy + 1, STEELC[3])
        p.r(sx - 2, sy + 4, sx + 1, sy + 7, (90, 60, 40))
    def head(p, K):
        x, y = K['head']
        p.poly([(x - 6, y + 5), (x - 6, y - 4), (x - 1, y - 8), (x + 5, y - 5), (x + 6, y + 1), (x + 3, y + 5)], RAG[2])
        p.e(x - 1, y - 4, x + 5, y + 4, (44, 34, 28)); p.r(x, y, x + 6, y + 4, RAG[3]); p.l(x, y, x + 6, y, RAG[1])
        if eyes:
            p.p(x + 3, y - 2, (230, 210, 150)); p.p(x + 5, y - 2, (230, 210, 150))
        else:
            p.l(x + 2, y - 2, x + 5, y - 2, BLK[0])
    def front(p, K):
        hx, hy = K['handF']
        if kn is not None:
            knife(p, hx, hy, kn, 6)
        ell(p, hx, hy, 1.5, 1.5, SKIN[1])
    rig(p, 28, FEET, LL=14, TL=12, HR=5, step=step, bob=bob, lean=lean, crouch=crouch, stride=5, legs=((54, 46, 38), (78, 68, 54)), leg_w=4,
        body=(RAG[1], RAG[2]), body_w=(5, 6), arms=(RAG[1], RAG[2]), arm_w=3, AL=12, aB=aB, aF=aF, skin=SKIN, hands=SKIN[1], shoes=(40, 30, 24),
        on_far=far, on_torso=torso, on_head=head, on_front=front)
    im = outline_same(p.im)
    if fly:
        q = Pic(64, 64); knife(q, fly[0], fly[1], fly[2], 6); im = on(im, outline_same(q.im))
    return im


@builder('looter')
def make_looter():
    L = looter_raw
    save_enemy('looter', 'idle', [L(bob=(0, 0, 1, 0)[i], kn=1.2 + (0, 0.1, 0.2, 0.1)[i], lean=2 + (0, 0, 0.5, 0)[i]) for i in range(4)])
    save_enemy('looter', 'movement', [L(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=4, aF=(1.0 + 0.4 * math.sin(i / 6 * TAU), 0.6),
                                        aB=(0.5 - 0.4 * math.sin(i / 6 * TAU), 0.5)) for i in range(6)])
    save_enemy('looter', 'attack', [L(aF=(2.6, 0.5), kn=3.4, lean=-1), L(aF=(3.0, 0.3), kn=3.9, lean=-2), L(aF=(1.9, 0.1), kn=None, lean=3, fly=(44, 26, 1.6)),
                                    L(aF=(1.3, 0.1), kn=None, lean=4, crouch=1, fly=(55, 28, 2.8)), L(aF=(1.1, 0.4), kn=None, lean=3), L(kn=1.2)])
    save_enemy('looter', 'take_damage', [flash(L(lean=-2, eyes=0), WHITE), L(lean=-1), L(lean=1)])
    base = L(eyes=0, kn=None, aF=(1.2, 0.4), aB=(1.0, 0.5))
    q = Pic(64, 64); knife(q, 42, FEET - 1, 1.62, 6); kq = outline_same(q.im)
    save_enemy('looter', 'death', [flash(L(lean=-3, eyes=0), WHITE), on(fall(base, 0.25), kq), on(fall(base, 0.55), kq), on(fall(base, 0.85), kq),
                                   on(fall(base, 1.0), kq), on(fall(base, 1.0), kq)])


# ================================================================== RUBBLE GOLEM (drawn, 64x64)
def rgolem_raw(step=None, bob=0, lean=0.0, arms=0.0, eyes=1, dx=0, boulder=None):
    """Side view facing right: a hulking golem of fallen masonry - legs of stacked limestone, a chest of red brick still in
    its bond, a cracked door lintel across the shoulders, a small stone head with two dim amber eyes in a slot, long arms of
    blocks with lump fists; arms 0 = hanging .. 1 = a block raised overhead .. 2 = thrown forward; boulder = (x, y) a block
    flying (thrown)."""
    p = Pic(64, 64)
    f = FEET
    cx = 28 + dx
    hy = f - 15 + bob
    for j, ph in enumerate((math.pi, 0.0)):
        o = math.sin((step or 0) * TAU + ph) * 3 if step is not None else (j * 2 - 1) * 3
        lx = cx + o
        pal = RST if j else tuple(dark(c, 0.8) for c in RST)
        stone_block(p, lx, f - 3, 9, 6, pal); stone_block(p, lx + 0.5, hy + 4, 8, 7, pal)
    sh = (cx + 2 + lean, hy - 16)
    def arm(far):
        ox = -5 if far else 5
        bx, by = sh[0] + ox * 0.4, sh[1] + 2
        if arms <= 1:
            t = arms
            ex, ey = bx + 4 * (1 - t) + 2 * t, by + 9 * (1 - t) - 9 * t
            fx, fy = ex + 3 * (1 - t) - 1 * t, ey + 9 * (1 - t) - 9 * t
        else:
            t = arms - 1
            ex, ey = bx + 2 + 8 * t, by - 9 + 14 * t
            fx, fy = ex + (-1) * (1 - t) + 6 * t, ey - 9 + 21 * t
        pal = tuple(dark(c, 0.7) for c in RST) if far else tuple(mix(c, (255, 240, 210), 0.12) for c in RST)
        p.l(bx, by, ex, ey, pal[1], 7); p.l(ex, ey, fx, fy, pal[1], 6)
        stone_block(p, bx, by, 8, 7, pal); stone_block(p, ex, ey, 7, 7, pal); stone_block(p, fx, fy, 10, 8, pal)
        return fx, fy
    arm(True)
    stone_block(p, cx, hy - 1, 14, 8, RST)
    for r in range(3):                                                              # the brick chest
        for c in range(3):
            stone_block(p, sh[0] - 8 + c * 7 + (r % 2) * 3, sh[1] + 3 + r * 4.5, 7, 4.5, brick=True)
    stone_block(p, sh[0] + 1, sh[1] - 1, 28, 6, RST)                                # the lintel
    p.l(sh[0] - 4, sh[1] - 3, sh[0] - 2, sh[1] + 1, RST[0])
    stone_block(p, sh[0] + 4, sh[1] - 7, 10, 8, RST)                                # head
    p.r(sh[0] + 4, sh[1] - 8, sh[0] + 9, sh[1] - 6, (24, 20, 16))
    if eyes:
        p.p(sh[0] + 5, sh[1] - 7, (240, 190, 90)); p.p(sh[0] + 8, sh[1] - 7, (240, 190, 90))
    hx, hy2 = arm(False)
    if arms > 0.6 and arms <= 1.2 and boulder is None:
        stone_block(p, hx + 1, hy2 - 5, 12, 8, RST)
    im = outline_same(p.im, (24, 20, 16))
    if boulder:
        q = Pic(64, 64); stone_block(q, boulder[0], boulder[1], 11, 8, RST, a=boulder[2] if len(boulder) > 2 else 0.4)
        im = on(im, outline_same(q.im, (24, 20, 16)))
    return im


def rubble_heap(k, seed=40):
    """The golem fallen apart: a heap of blocks and bricks settling on the floor with dust above (k 0..1)."""
    p = Pic(64, 64)
    r2 = random.Random(seed)
    f = FEET
    for j in range(14):
        x = r2.uniform(12, 52)
        top = (1 - abs(x - 32) / 22) * 14 * (1.4 - k * 0.5)
        y = f - 2 - r2.uniform(0, max(1, top))
        stone_block(p, x, y, r2.uniform(5, 9), r2.uniform(4, 6), RST, brick=j % 3 == 0, a=r2.uniform(-0.6, 0.6))
    im = outline_same(p.im, (24, 20, 16))
    q = Pic(64, 64)
    dust(q, int(26 * (1 - k * 0.6)), seed + 1, (8, f - 30 + k * 10, 56, f - 6), (DUS[1], DUS[2], DUS[3]))
    return on(im, q.im)


@builder('rubblegolem')
def make_rubblegolem():
    G = rgolem_raw
    save_enemy('rubblegolem', 'idle', [G(bob=(0, 0, 1, 0)[i], arms=0.05 * (i % 2)) for i in range(4)])
    save_enemy('rubblegolem', 'movement', [G(step=i / 6, bob=(0, 1, 1, 0, 1, 1)[i], lean=1) for i in range(6)])
    save_enemy('rubblegolem', 'attack', [G(arms=0.4, lean=-1), G(arms=0.8, lean=-2, bob=1), G(arms=0.95, lean=-2, bob=2), G(arms=1.6, lean=2, boulder=(50, 16, 0.3)),
                                         G(arms=1.9, lean=3, bob=1, boulder=(54, 24, 0.9)), G(arms=0.3)])
    save_enemy('rubblegolem', 'take_damage', [flash(G(lean=-3, eyes=0), WHITE), G(lean=-2), G(lean=-1)])
    save_enemy('rubblegolem', 'death', [flash(G(eyes=0, lean=-2), WHITE), on(G(eyes=0, bob=3, arms=0.2), rubble_heap(0.0)), rubble_heap(0.1), rubble_heap(0.4),
                                        rubble_heap(0.8), rubble_heap(1.0)])


# ================================================================== ROOFTOPPER (drawn, 64x64)
def crossbow(p, hx, hy, bx, by, loaded=True, drawn=True):
    """A crossbow held at the front hand (hx, hy) with the stock back to the rear hand (bx, by): a wooden tiller, a steel
    prod crosswise at the front, the string and a bolt."""
    a = math.atan2(hx - bx, hy - by)
    u = (math.sin(a), math.cos(a)); v = (u[1], -u[0])
    fx, fy = hx + u[0] * 5, hy + u[1] * 5
    p.l(bx - u[0] * 3, by - u[1] * 3, fx, fy, WD2, 2)
    t1 = (fx + v[0] * 6 - u[0] * 2, fy + v[1] * 6 - u[1] * 2); t2 = (fx - v[0] * 6 - u[0] * 2, fy - v[1] * 6 - u[1] * 2)
    p.lines([t1, (fx, fy), t2], STEELC[2], 2)
    nx, ny = (hx - u[0] * 1, hy - u[1] * 1) if drawn else (fx - u[0] * 1, fy - u[1] * 1)
    p.lines([t1, (nx, ny), t2], (200, 190, 160))
    if loaded:
        p.l(nx, ny, fx + u[0] * 3, fy + u[1] * 3, WD3); p.p(fx + u[0] * 3, fy + u[1] * 3, STEELC[4])


def rooftop_raw(step=None, bob=0, lean=0.5, aim=0.0, eyes=1, crouch=0, loaded=True, drawn=True, bow=True, recoil=0):
    """Side view facing right: a rooftop crossbowman - a wide, dusty felt hat, a scarf wound over the lower face, a long
    weathered coat with a bolt quiver at the hip, knee boots; the crossbow held level (aim raises it)."""
    p = Pic(64, 64)
    aF = (1.7 + aim * 0.8, -0.2)
    aB = (1.2 + aim * 0.6, 0.6)
    K0 = {}
    def far(p, K):
        K0.update(K)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.poly([(sx - 5, sy), (sx + 5, sy), (hx + 8, FEET - 9), (hx - 8, FEET - 9)], (86, 66, 46)); p.l(sx + 5, sy, hx + 8, FEET - 9, (118, 94, 64))
        p.r(hx - 8, hy - 2, hx - 4, hy + 8, LEATH[1]); p.l(hx - 7, hy - 4, hx - 7, hy - 2, WD3); p.l(hx - 5, hy - 5, hx - 5, hy - 2, WD3)
        p.l(hx - 7, hy, hx + 7, hy, (50, 38, 28))
    def head(p, K):
        x, y = K['head']
        p.r(x - 1, y + 1, x + 6, y + 5, (140, 60, 44)); p.l(x - 2, y + 5, x - 4, y + 9, (140, 60, 44), 2)
        p.e(x - 4, y - 7, x + 4, y - 1, (70, 58, 44)); p.l(x - 9, y - 2, x + 10, y - 3, (60, 48, 36), 2); p.l(x - 9, y - 3, x + 10, y - 4, (96, 80, 60))
        if eyes:
            p.p(x + 3, y - 1, BLK[0])
        else:
            p.l(x + 2, y - 1, x + 4, y - 1, BLK[0])
    rig(p, 27 - recoil, FEET, LL=14, TL=13, HR=5, step=step, bob=bob, lean=lean - recoil, crouch=crouch, legs=((50, 40, 32), (70, 56, 44)), leg_w=4,
        body=((86, 66, 46), (104, 82, 58)), body_w=(5, 6), arms=((86, 66, 46), (110, 88, 62)), arm_w=3, AL=13, aB=aB, aF=aF, skin=SKIN,
        hands=SKIN[1], shoes=(36, 26, 20), on_far=far, on_torso=torso, on_head=head)
    if bow:
        q = Pic(64, 64)
        hx, hy = K0['handF'] if 'handF' in K0 else (0, 0)
        crossbow(p, K0['handF'][0], K0['handF'][1], K0['handB'][0], K0['handB'][1], loaded, drawn)
    return outline_same(p.im)


@builder('rooftopper')
def make_rooftopper():
    R = rooftop_raw
    save_enemy('rooftopper', 'idle', [R(bob=(0, 0, 1, 0)[i], aim=-0.6) for i in range(4)])
    save_enemy('rooftopper', 'movement', [R(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=2, aim=-0.7) for i in range(6)])
    save_enemy('rooftopper', 'attack', [R(aim=-0.2, crouch=1), R(aim=0.05, crouch=2), R(aim=0.05, crouch=2, eyes=1), R(aim=0.1, crouch=2, loaded=False, drawn=False, recoil=2),
                                        R(aim=-0.3, loaded=False, drawn=False, recoil=1), R(aim=-0.6, loaded=True)])
    save_enemy('rooftopper', 'take_damage', [flash(R(lean=-2, eyes=0, aim=-0.5), WHITE), R(lean=-1, aim=-0.5), R(aim=-0.5)])
    base = R(eyes=0, bow=False, aim=-0.4)
    q = Pic(64, 64); crossbow(q, 46, FEET - 2, 34, FEET - 1, loaded=False); cq = outline_same(q.im)
    save_enemy('rooftopper', 'death', [flash(R(lean=-3, eyes=0, aim=-0.4), WHITE), on(fall(base, 0.25), cq), on(fall(base, 0.55), cq), on(fall(base, 0.85), cq),
                                       on(fall(base, 1.0), cq), on(fall(base, 1.0), cq)])


# ================================================================== DUST DEVIL (drawn, 64x64, flying - drawn low)
def devil_raw(k=0, dx=0, dy=0, wide=1.0, eyes=1, size=1.0, heap=0.0, pull=0):
    """A spinning dust devil: a funnel of grey-ochre dust narrowing to the floor, bands that turn with k, pebbles, straw and
    a scrap of paper caught in it, two dim eyes in the upper swirl; wide widens the top (the pull, with dust streaming in
    from the right when pull), size shrinks it (death), heap = a dust heap on the floor."""
    p = Pic(64, 64)
    f = FEET
    H = 32 * size
    base = f - 3 + dy
    cx = 32 + dx
    r2 = random.Random(90 + k)
    n = 9
    for j in range(n):
        t = j / (n - 1)
        y = base - t * H
        r = (2 + t * 11 * wide) * size
        ox = math.sin(t * 5 + k * 1.6) * 2.5 * size
        ell(p, cx + ox, y, r + 1, 3 * size + 0.5, DUS[0])
        ell(p, cx + ox, y - 0.5, r, 2.6 * size, DUS[1 + (j + k) % 2])
        p.arc(cx + ox - r, y - 2.6 * size, cx + ox + r, y + 2.6 * size, 20 + k * 40, 150 + k * 40, DUS[3])
    for _ in range(int(20 * size)):
        a = r2.uniform(0, TAU)
        t = r2.uniform(0, 1)
        r = (4 + t * 14 * wide) * size
        p.p(cx + math.cos(a) * r, base - t * H + math.sin(a) * 2, DUS[r2.randrange(0, 4)])
    for j in range(int(5 * size)):                                                  # debris in the whirl
        a = k * 1.1 + j * 1.3
        t = 0.2 + j * 0.15
        x, y = cx + math.cos(a) * (3 + t * 10 * wide) * size, base - t * H
        if j % 3 == 0:
            p.l(x - 2, y, x + 2, y - 1, (190, 170, 90))
        elif j % 3 == 1:
            p.r(x, y, x + 1, y + 1, RST[1])
        else:
            p.r(x - 1, y - 1, x + 1, y + 1, (210, 204, 186)); p.p(x, y, (150, 140, 120))
    if pull:
        for j in range(6):
            y = base - H * (0.3 + j * 0.1)
            x0 = min(57, cx + 13 * wide + 1 + j % 3 * 2)
            p.l(x0, y, min(61, x0 + 3 + pull), y + 1, DUS[2])
    if eyes and size > 0.5:
        ey = base - H * 0.7
        c = (230, 200, 120) if pull else (180, 150, 90)
        p.r(cx + 2, ey, cx + 3, ey + 1, c); p.r(cx + 7, ey, cx + 8, ey + 1, c)
    im = p.im
    if heap:
        q = Pic(64, 64)
        q.e(cx - 10 * heap - 2, f - 6 * heap, cx + 10 * heap + 2, f + 4 * heap, DUS[1]); q.e(cx - 8 * heap, f - 5 * heap, cx + 6 * heap, f, DUS[2])
        dust(q, 8, 3, (cx - 12, f - 6, cx + 12, f - 1), (DUS[3], DUS[0]))
        im = on(outline_same(q.im, DUS[0]), im)
    return im


@builder('dustdevil')
def make_dustdevil():
    W = devil_raw
    save_enemy('dustdevil', 'idle', [W(k=i, dy=(0, -1, -2, -1)[i]) for i in range(4)])
    save_enemy('dustdevil', 'movement', [W(k=i, dx=(0, 1, 2, 2, 1, 0)[i] - 1, dy=(0, -1, -1, 0, -1, -1)[i]) for i in range(6)])
    save_enemy('dustdevil', 'attack', [W(k=0, wide=1.15, pull=1), W(k=1, wide=1.35, pull=2), W(k=2, wide=1.5, pull=3), W(k=3, wide=1.5, pull=3),
                                       W(k=4, wide=1.3, pull=2), W(k=5, wide=1.1)])
    save_enemy('dustdevil', 'take_damage', [flash(W(k=0, eyes=0), WHITE), W(k=1, wide=0.8), W(k=2)])
    save_enemy('dustdevil', 'death', [flash(W(k=0, eyes=0, wide=1.3), WHITE), W(k=1, size=0.8, eyes=0, heap=0.3), W(k=2, size=0.6, eyes=0, heap=0.6),
                                      W(k=3, size=0.4, eyes=0, heap=0.85), W(k=4, size=0.2, eyes=0, heap=1.0), W(k=4, size=0.0001, eyes=0, heap=1.0)])


# ================================================================== GLASSBLOWER (drawn, 64x64)
def blower_raw(step=None, bob=0, lean=0.5, pipe=0.0, bub=0.0, puff_=0, eyes=1, crouch=0, hot=2, fly=None, has_pipe=True):
    """Side view facing right: a glassblower - a scorched leather apron over a sweat-dark shirt, rolled sleeves, a leather
    cap and round blue goggles, the long iron blowpipe held to the lips with both hands and a glowing gather of glass at its
    end; pipe tilts it (+ = up); bub 0..1 = a bubble growing on the end; puff_ = cheeks blown out; fly = (x, y, r) a bubble
    released into the air."""
    p = Pic(64, 64)
    K0 = {}
    a = 1.45 - pipe
    def far(p, K):
        K0.update(K)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.poly([(sx + 1, sy + 2), (sx + 6, sy + 3), (hx + 7, FEET - 10), (hx - 3, FEET - 10)], LEATH[2])
        p.l(sx + 6, sy + 3, hx + 7, FEET - 10, LEATH[3]); p.p(hx + 3, hy + 4, (40, 26, 20)); p.p(hx + 5, hy - 2, (40, 26, 20))
    def head(p, K):
        x, y = K['head']
        p.e(x - 5, y - 7, x + 4, y - 2, LEATH[1]); p.l(x - 5, y - 3, x + 5, y - 3, LEATH[0])
        p.e(x + 1, y - 3, x + 5, y + 1, I1); p.e(x + 2, y - 2, x + 4, y, GLS[2] if eyes else GLS[1]); p.l(x - 4, y - 1, x + 1, y - 1, LEATH[0])
        if puff_:
            ell(p, x + 4, y + 3, 2 + puff_ * 0.6, 2 + puff_ * 0.4, SKIN[2])
        p.p(x + 6, y + 3, SKIN[0])
    rig(p, 21, FEET, LL=14, TL=13, HR=5, step=step, bob=bob, lean=lean, crouch=crouch, legs=((52, 46, 44), (72, 66, 62)), leg_w=4,
        body=((92, 74, 60), (116, 96, 78)), body_w=(6, 6), arms=(SKIN[1], SKIN[2]), arm_w=3, AL=12, aB=(1.9 + pipe * 0.5, 0.5), aF=(1.7 + pipe * 0.5, 0.7),
        skin=SKIN, hands=SKIN[1], shoes=(40, 30, 24), on_far=far, on_torso=torso, on_head=head)
    if has_pipe:
        hx, hy = K0['head']
        mx, my = hx + 6, hy + 3
        ex, ey = pt(a, 19, mx, my)
        p.l(mx, my, ex, ey, I2, 1); p.l(mx, my + 1, ex, ey + 1, I1, 1)
        for t in (0.3, 0.55):                                                       # both hands on the pipe
            px_, py_ = mx + (ex - mx) * t, my + (ey - my) * t + 1
            ell(p, px_, py_, 1.7, 1.6, SKIN[1] if t > 0.4 else dark(SKIN[1], 0.8))
        if bub > 0:
            r = 2 + bub * 5
            bubble(p, ex + r * 0.6, ey, r)
        gather(p, ex, ey, 2.4, hot)
    im = outline_same(p.im)
    if fly:
        q = Pic(64, 64); bubble(q, fly[0], fly[1], fly[2]); im = on(im, outline_same(q.im, GLS[0]))
    return im


@builder('glassblower')
def make_glassblower():
    B = blower_raw
    save_enemy('glassblower', 'idle', [B(bob=(0, 0, 1, 0)[i], pipe=(-0.2, -0.18, -0.15, -0.18)[i], hot=(2, 2, 3, 2)[i]) for i in range(4)])
    save_enemy('glassblower', 'movement', [B(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=1.5, pipe=-0.3) for i in range(6)])
    save_enemy('glassblower', 'attack', [B(pipe=0.05, puff_=1, bub=0.2), B(pipe=0.05, puff_=2, bub=0.5), B(pipe=0.05, puff_=3, bub=0.85, lean=1),
                                         B(pipe=0.1, puff_=1, lean=2, fly=(54, 22, 6)), B(pipe=0.0, fly=(54, 16, 5)), B(pipe=-0.15)])
    save_enemy('glassblower', 'take_damage', [flash(B(lean=-2, eyes=0, pipe=-0.4), WHITE), B(lean=-1, pipe=-0.35), B(pipe=-0.25)])
    base = B(eyes=0, has_pipe=False)
    q = Pic(64, 64); q.l(26, FEET - 1, 52, FEET - 2, I2); gather(q, 52, FEET - 2.5, 2.2, 1); pq = outline_same(q.im)
    save_enemy('glassblower', 'death', [flash(B(lean=-3, eyes=0, pipe=-0.4), WHITE), on(fall(base, 0.25), pq), on(fall(base, 0.55), pq), on(fall(base, 0.85), pq),
                                        on(fall(base, 1.0), pq), on(fall(base, 1.0), pq)])


# ================================================================== GLASS GOLEM (drawn, 64x64, see-through)
def facet(p, pts, pal, light=True):
    p.poly(pts, pal[1])
    if light:
        p.l(pts[0][0], pts[0][1], pts[1][0], pts[1][1], pal[3])
    p.p((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2 + 1, pal[4] if len(pal) > 4 else pal[3])


def ggolem_raw(step=None, bob=0, lean=0.0, arms=0.0, eyes=1, dx=0, core=2, fade=0.22, crack=0):
    """Side view facing right: a golem of thick cold blue glass - angular faceted blocks for legs, chest and arms, light
    edges and glints, a glowing orange core visible through the chest, two orange eye points; ordered dither makes it look
    see-through; arms 0 hanging .. 1 raised .. 2 slammed; crack = white fracture lines spreading (death)."""
    p = Pic(64, 64)
    f = FEET
    cx = 28 + dx
    hy = f - 15 + bob
    for j, ph in enumerate((math.pi, 0.0)):
        o = math.sin((step or 0) * TAU + ph) * 3 if step is not None else (j * 2 - 1) * 3
        lx = cx + o
        pal = GLS if j else tuple(dark(c, 0.75) for c in GLS)
        facet(p, [(lx - 4, f - 8), (lx + 4, f - 8), (lx + 5, f), (lx - 5, f)], pal)
        facet(p, [(lx - 3, hy + 1), (lx + 4, hy + 1), (lx + 3, f - 8), (lx - 3, f - 8)], pal)
    sh = (cx + 2 + lean, hy - 16)
    def arm(far):
        ox = -5 if far else 5
        bx, by = sh[0] + ox * 0.4, sh[1] + 2
        if arms <= 1:
            t = arms
            ex, ey = bx + 4 * (1 - t) + 2 * t, by + 9 * (1 - t) - 9 * t
            fx, fy = ex + 3 * (1 - t) - 1 * t, ey + 9 * (1 - t) - 9 * t
        else:
            t = arms - 1
            ex, ey = bx + 2 + 8 * t, by - 9 + 14 * t
            fx, fy = ex + (-1) * (1 - t) + 6 * t, ey - 9 + 21 * t
        pal = tuple(dark(c, 0.7) for c in GLS) if far else GLS
        p.l(bx, by, ex, ey, pal[1], 5); p.l(ex, ey, fx, fy, pal[1], 5); p.l(bx, by - 1, ex, ey - 1, pal[3])
        facet(p, [(fx - 4, fy - 3), (fx + 3, fy - 4), (fx + 5, fy + 3), (fx - 3, fy + 4)], pal)
    arm(True)
    facet(p, [(cx - 7, hy - 4), (cx + 7, hy - 4), (cx + 6, hy + 3), (cx - 6, hy + 3)], GLS)
    facet(p, [(sh[0] - 10, sh[1] - 1), (sh[0] + 10, sh[1] - 3), (sh[0] + 7, sh[1] + 13), (sh[0] - 7, sh[1] + 14)], GLS)
    p.l(sh[0] - 4, sh[1] + 1, sh[0] - 1, sh[1] + 12, GLS[2]); p.l(sh[0] + 4, sh[1], sh[0] + 3, sh[1] + 11, GLS[0])
    if core:
        ell(p, sh[0], sh[1] + 6, 3.5, 3.5, HOT[core - 1]); ell(p, sh[0], sh[1] + 6, 2, 2, HOT[min(4, core + 1)])
    facet(p, [(sh[0] + 1, sh[1] - 10), (sh[0] + 9, sh[1] - 9), (sh[0] + 8, sh[1] - 2), (sh[0] + 1, sh[1] - 2)], GLS)
    if eyes:
        p.p(sh[0] + 5, sh[1] - 6, HOT[3]); p.p(sh[0] + 8, sh[1] - 6, HOT[3])
    arm(False)
    for j in range(crack * 3):
        r2 = random.Random(j)
        x, y = sh[0] + r2.uniform(-8, 8), sh[1] + r2.uniform(-6, 14)
        p.l(x, y, x + r2.uniform(-5, 5), y + r2.uniform(-5, 5), GLS[4])
    im = outline_same(p.im, GLS[0])
    return dither_hole(im, fade, 1)


def shard_heap(k, seed=50, glow=1):
    """The glass golem shattered: a spray of blue shards on the floor (k 0 = still flying up .. 1 = settled), the core
    cooling to a dull ember."""
    p = Pic(64, 64)
    r2 = random.Random(seed)
    f = FEET
    for j in range(26):
        x0 = 30 + r2.uniform(-6, 6)
        y0 = f - 18 + r2.uniform(-8, 8)
        x1 = r2.uniform(8, 56)
        y1 = f - 1 - r2.uniform(0, 3)
        x, y = x0 + (x1 - x0) * k, y0 + (y1 - y0) * k - math.sin(k * math.pi) * 8
        shard(p, x, y, r2.uniform(2, 4.5), r2.uniform(0, TAU))
    if glow:
        ell(p, 30, f - 2, 2.5, 1.8, HOT[glow]); p.p(30, f - 2, HOT[min(4, glow + 2)])
    return outline_same(p.im, GLS[0])


@builder('glassgolem')
def make_glassgolem():
    G = ggolem_raw
    save_enemy('glassgolem', 'idle', [G(bob=(0, 0, 1, 0)[i], core=(2, 3, 3, 2)[i], arms=0.05 * (i % 2)) for i in range(4)])
    save_enemy('glassgolem', 'movement', [G(step=i / 6, bob=(0, 1, 1, 0, 1, 1)[i], lean=1) for i in range(6)])
    save_enemy('glassgolem', 'attack', [G(arms=0.4, lean=-1, core=3), G(arms=1.0, lean=-2, core=4), G(arms=1.5, lean=1, core=4),
                                        G(arms=2.0, lean=3, bob=2, core=3), G(arms=1.6, lean=2, bob=1), G(arms=0.3)])
    save_enemy('glassgolem', 'take_damage', [flash(G(lean=-3, eyes=0, core=4), WHITE), G(lean=-2, crack=1), G(lean=-1)])
    save_enemy('glassgolem', 'death', [flash(G(eyes=0, lean=-2, crack=2, core=4), WHITE), G(eyes=0, crack=4, bob=1, fade=0.3), shard_heap(0.3, glow=3),
                                       shard_heap(0.7, glow=2), shard_heap(1.0, glow=1), shard_heap(1.0, glow=0)])


# ================================================================== SLAG CRAWLER (drawn, 64x64, low)
def slag_raw(k=0, lunge=0.0, dx=0, eyes=1, glow=2, flat=0.0, crumble=0.0):
    """A low crawler of half-cooled slag: a segmented black crust body like a fat lizard, glowing orange cracks between
    the plates, six stubby legs, a blunt head with a glowing maw that opens on the lunge; glow 0..3; crumble breaks it
    into cooled lumps (death)."""
    p = Pic(64, 64)
    f = FEET
    cx = 30 + dx + lunge * 5
    by = f - 5 + flat * 2
    ph = k * TAU / 6
    for j in range(3):                                                              # far legs
        x = cx - 10 + j * 9
        p.l(x, by + 1, x + math.sin(ph + j * 2) * 3 + 2, f - 1, SLAG[1], 2)
    segs = [(cx - 16, by + 1, 4), (cx - 10, by, 5.5), (cx - 3, by - 1, 6.5), (cx + 5, by - 1, 6)]
    for j, (x, y, r) in enumerate(segs):
        if crumble and j % 2:
            y += crumble * 2
        ell(p, x, y, r, r * 0.75, SLAG[1]); ell(p, x - 0.5, y - 1, r - 1.5, r * 0.5, SLAG[2]); p.p(x - r * 0.4, y - r * 0.5, SLAG[3])
    if glow:
        for j in range(1, len(segs)):
            x = (segs[j][0] + segs[j - 1][0]) / 2
            p.l(x, by - 3, x + 1, by + 3, HOT[glow])
        p.l(cx - 6, by - 2, cx + 2, by + 1, HOT[max(0, glow - 1)])
    hx, hy = cx + 12 + lunge * 3, by - 2 - lunge * 2
    ell(p, hx, hy, 5, 4, SLAG[1]); ell(p, hx - 0.5, hy - 1, 3.5, 2.5, SLAG[2])
    jaw = 1 + lunge * 3
    p.poly([(hx + 1, hy + 1), (hx + 6, hy + 0.5), (hx + 6, hy + 1 + jaw), (hx + 1, hy + 2)], HOT[min(4, glow + 1)] if glow else SLAG[0])
    if eyes:
        p.p(hx + 1, hy - 2, HOT[3] if glow else SLAG[3])
    for j in range(3):                                                              # near legs
        x = cx - 8 + j * 9
        p.l(x, by + 2, x + math.sin(ph + j * 2 + math.pi) * 3 + 2, f, SLAG[2], 2)
    im = outline_same(p.im, (10, 8, 8))
    if glow >= 2:
        q = Pic(64, 64)
        halo(q, cx - 3, by - 1, 12, (HOT[1], HOT[2]), 8 + glow * 2, k)
        im = on(q.im, im)
    return im


@builder('slagcrawler')
def make_slagcrawler():
    S = slag_raw
    save_enemy('slagcrawler', 'idle', [S(k=i, glow=(2, 2, 3, 2)[i]) for i in range(4)])
    save_enemy('slagcrawler', 'movement', [S(k=i, dx=(0, 1, 2, 2, 1, 0)[i] - 1, glow=2 + (i % 2)) for i in range(6)])
    save_enemy('slagcrawler', 'attack', [S(k=0, lunge=0.2, glow=3), S(k=1, lunge=0.6, glow=3), S(k=2, lunge=1.0, glow=3), S(k=3, lunge=0.8, glow=3),
                                         S(k=4, lunge=0.3, glow=2), S(k=5)])
    save_enemy('slagcrawler', 'take_damage', [flash(S(k=0, eyes=0, glow=3), WHITE), S(k=1, dx=-2), S(k=2)])
    save_enemy('slagcrawler', 'death', [flash(S(k=0, eyes=0, glow=3), (255, 200, 120)), S(k=1, eyes=0, glow=2, flat=0.5), S(k=2, eyes=0, glow=1, flat=1, crumble=0.5),
                                        S(k=3, eyes=0, glow=1, flat=1, crumble=1), S(k=3, eyes=0, glow=0, flat=1.2, crumble=1.4), S(k=3, eyes=0, glow=0, flat=1.2, crumble=1.4)])


# ================================================================== KILN SPIRIT (drawn, 64x64, flying - drawn low)
def kspirit_raw(k=0, dx=0, dy=0, dive=0.0, eyes=1, size=1.0, burst=0, smoke=0.0, mask=True):
    """A flying flame spirit: a tall tongue of fire wearing a cracked kiln-clay mask with two glowing slit eyes and a round
    mouth, sparks round it; dive 0..1 tilts and stretches it into a streak; burst 1..3 = the weak explosion (a ring of
    flame and embers), smoke = a grey puff left behind."""
    p = Pic(64, 64)
    f = FEET
    cx, cy = 32 + dx + dive * 8, f - 10 + dy + dive * 4
    if burst:
        r = 6 + burst * 5
        for j in range(10):
            a = j / 10 * TAU + burst
            flame(p, cx + math.cos(a) * r * 0.5, cy - 6 + math.sin(a) * r * 0.5, 5 + burst, math.cos(a) * 3, 1.0, HOT[:4])
        p.e(cx - r * 0.5, cy - 6 - r * 0.5, cx + r * 0.5, cy - 6 + r * 0.5, HOT[3])
        q = Pic(64, 64)
        halo(q, cx, cy - 6, r + 3, (HOT[2], HOT[3], HOT[1]), 14, burst)
        dust(q, 10 + burst * 4, burst, (cx - r - 4, cy - 6 - r - 4, cx + r + 4, cy - 6 + r + 4), (HOT[1], HOT[2], (120, 110, 100)))
        return on(p.im, q.im)
    if smoke:
        for j in range(5):
            r2 = random.Random(j)
            x, y = cx + r2.uniform(-8, 8), cy - 8 - smoke * 10 + r2.uniform(-6, 6)
            rr = 3 + smoke * 4
            ell(p, x, y, rr, rr * 0.8, (96, 90, 88)); ell(p, x - 1, y - 1, rr * 0.6, rr * 0.5, (130, 124, 118))
        return dither_hole(outline_same(p.im, (60, 56, 54)), 0.25 + smoke * 0.6, 2)
    lean = -dive * 10
    h = 22 * size * (1 + dive * 0.3)
    flame(p, cx + 2, cy + 3, h * 0.7, lean - 3 + math.sin(k) * 2, 2.2 * size, HOT[:4])
    flame(p, cx - 3, cy + 3, h * 0.6, lean - 2 + math.cos(k) * 2, 1.8 * size, HOT[:4])
    flame(p, cx, cy + 4, h, lean + math.sin(k * 1.7) * 2, 3.2 * size, HOT[:4])
    if mask:
        mx, my = cx + 1 - dive * 3, cy - 6
        ell(p, mx, my, 5.5 * size, 6 * size, KBR[3]); ell(p, mx - 0.5, my - 1, 4.5 * size, 4.5 * size, KBR[4])
        p.l(mx - 4, my - 4, mx - 1, my + 1, KBR[1])
        if eyes:
            p.r(mx - 3, my - 2, mx - 1, my - 1, HOT[4]); p.r(mx + 1, my - 2, mx + 3, my - 1, HOT[4])
        else:
            p.r(mx - 3, my - 2, mx - 1, my - 1, KBR[0]); p.r(mx + 1, my - 2, mx + 3, my - 1, KBR[0])
        p.e(mx - 1, my + 2, mx + 1, my + 4, HOT[2] if eyes else KBR[0])
    im = outline_same(p.im, (60, 20, 8))
    q = Pic(64, 64)
    r2 = random.Random(k)
    for _ in range(6):
        x, y = cx + r2.uniform(-12, 12) + dive * 6, cy - r2.uniform(0, 24)
        q.p(x, y, HOT[r2.randrange(2, 5)])
    if dive:
        for j in range(4):
            q.l(cx - 6 - j * 4 - dive * 6, cy - 14 + j * 3, cx - 10 - j * 4 - dive * 10, cy - 16 + j * 3, HOT[1])
    return on(im, q.im)


@builder('kilnspirit')
def make_kilnspirit():
    K = kspirit_raw
    save_enemy('kilnspirit', 'idle', [K(k=i, dy=(0, -1, -2, -1)[i]) for i in range(4)])
    save_enemy('kilnspirit', 'movement', [K(k=i, dx=(0, 1, 2, 2, 1, 0)[i] - 1, dy=-(i % 2)) for i in range(6)])
    save_enemy('kilnspirit', 'attack', [K(k=0, dive=0.0, dy=-2), K(k=1, dive=0.3, dy=-1), K(k=2, dive=0.7), K(k=3, dive=1.0, dy=1),
                                        K(k=4, dive=0.9, dy=1), K(k=5, dive=0.3)])
    save_enemy('kilnspirit', 'take_damage', [flash(K(k=0, eyes=0), WHITE), K(k=1, size=0.85), K(k=2)])
    save_enemy('kilnspirit', 'death', [flash(K(k=0, eyes=0), WHITE), K(burst=1), K(burst=2), K(burst=3), K(smoke=0.4), K(smoke=0.9)])


# ================================================================== THE MAYOR (boss, drawn, 116x116)
def mace_staff(p, x, y, a, L=44, back=10):
    """The staff of office held at (x, y): a long dark rod with gold bands and a heavy gilt crowned head at the end."""
    sx, sy = pt(a + math.pi, back, x, y)
    ex, ey = pt(a, L, x, y)
    p.l(sx, sy, ex, ey, WD1, 3); p.l(sx, sy, ex, ey, WD3, 1)
    for t in (0.25, 0.55, 0.85):
        bx, by = sx + (ex - sx) * t, sy + (ey - sy) * t
        p.e(bx - 2, by - 2, bx + 2, by + 2, AU2)
    hx, hy = pt(a, 5, ex, ey)
    ell(p, hx, hy, 6, 6, AU1); ell(p, hx - 1, hy - 1, 4.5, 4.5, AU2); p.p(hx - 2, hy - 2, AU4)
    u = (math.sin(a), math.cos(a)); v = (u[1], -u[0])
    for s in (-1, 0, 1):
        cx_, cy_ = hx + u[0] * 6 + v[0] * s * 4, hy + u[1] * 6 + v[1] * s * 4
        p.poly([(cx_ - 1.5, cy_), (cx_ + 1.5, cy_), (cx_ + u[0] * 4, cy_ + u[1] * 4)], AU3)
    return hx, hy


def debris(p, seed, n, box, k=1.0):
    """Roof debris falling: broken tiles, plank ends and stones in the box."""
    r2 = random.Random(seed)
    x0, y0, x1, y1 = box
    for j in range(n):
        x, y = r2.uniform(x0, x1), r2.uniform(y0, y1)
        if j % 3 == 0:
            poly_r(p, [(x - 4, y - 1.5), (x + 4, y - 1.5), (x + 4, y + 1.5), (x - 4, y + 1.5)], BRK[2], x, y, r2.uniform(-1, 1))
        elif j % 3 == 1:
            p.l(x - 4, y, x + 3, y + r2.uniform(-3, 3), WD2, 2)
        else:
            ell(p, x, y, 2.5, 2, RST[r2.randrange(2, 5)])


def mayor_frame(step=None, bob=0, lean=0.0, aF=(0.9, 0.4), aB=(0.3, 0.5), st=1.3, eyes=1, crouch=0, rings=0, deb=0, fade=0.1, k=0, mouth=0):
    """Side view facing right: the ghostly mayor - a towering pale spectral figure in a long faded plum robe with a broad
    fur collar and cuffs, the heavy gold chain of office with a medallion across his chest, a tall old-fashioned hat with a
    cockade, gaunt hollow face with burning pale eyes and long side-whiskers; the staff of office in the front hand
    (st = angle); rings = dust rings when he raises it (cast); deb = roof debris raining in front (the slam)."""
    p = Pic(BS, BS)
    f = BS_FEET
    K0 = {}
    def far(p, K):
        K0.update(K)
        sx, sy = K['sh']; hx, hy = K['hip']
        pts = [(sx - 12, sy), (sx + 10, sy), (hx + 22, f - 1), (hx - 20, f - 1)]
        p.poly(pts, ROBE[1])
        for j in range(5):
            x = hx - 16 + j * 8
            p.l(x + 2, hy + 6, x, f - 2, ROBE[0])
        p.l(hx - 20, f - 2, hx + 22, f - 2, FUR[1], 2)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.poly([(sx - 11, sy - 2), (sx + 10, sy - 2), (hx + 12, hy + 4), (hx - 12, hy + 4)], ROBE[2]); p.l(sx + 10, sy - 2, hx + 12, hy + 4, ROBE[3])
        p.e(sx - 15, sy - 7, sx + 11, sy + 5, FUR[1]); p.e(sx - 12, sy - 6, sx + 8, sy + 1, FUR[2])
        for j in range(9):                                                              # the chain of office
            t = j / 8
            x, y = sx - 8 + t * 18, sy + 2 + math.sin(t * math.pi) * 12
            p.e(x - 2, y - 1.5, x + 2, y + 1.5, AU2 if j % 2 else AU3)
        mx, my = sx + 1, sy + 16
        p.e(mx - 5, my - 5, mx + 5, my + 5, AU1); p.e(mx - 3.5, my - 3.5, mx + 3.5, my + 3.5, AU3); p.p(mx - 1, my - 1, AU4)
        p.r(hx - 12, hy - 1, hx + 12, hy + 2, ROBE[0])
    def head(p, K):
        x, y = K['head']
        ell(p, x + 1, y, 9, 10, GHM[2]); p.arc(x - 8, y - 10, x + 10, y + 10, 200, 320, GHM[1])
        p.e(x + 1, y - 4, x + 7, y + 1, GHM[0]); p.e(x + 7, y - 4, x + 10, y + 0, GHM[0])
        if eyes:
            p.p(x + 4, y - 2, GHM[4]); p.p(x + 8, y - 2, GHM[4]); p.p(x + 5, y - 2, GHM[3])
        p.l(x + 3, y + 6, x + 9, y + 6 + mouth, GHM[0], 2)
        p.poly([(x - 7, y - 1), (x - 3, y + 12), (x - 1, y + 4)], GHM[3]); p.poly([(x + 6, y + 4), (x + 4, y + 13), (x + 9, y + 6)], GHM[3])
        p.r(x - 7, y - 26, x + 9, y - 9, (30, 26, 34)); p.l(x - 13, y - 9, x + 14, y - 9, (30, 26, 34), 3); p.l(x - 7, y - 12, x + 9, y - 12, AU1, 2)
        p.e(x + 6, y - 16, x + 11, y - 11, ROBE[3]); p.p(x + 8, y - 14, AU3)
    def front(p, K):
        x, y = K['handF']
        if st is not None:
            mace_staff(p, x, y, st, 30, 8)
        ell(p, x, y, 4, 4, GHM[2]); p.e(x - 6, y - 6, x - 1, y + 2, FUR[2])
    rig(p, 39, f, LL=34, TL=30, HR=10, step=step, bob=bob, lean=lean, crouch=crouch, legs=(ROBE[0], ROBE[1]), leg_w=10,
        body=(ROBE[1], ROBE[2]), body_w=(14, 14), arms=(ROBE[1], ROBE[2]), arm_w=8, AL=28, aB=aB, aF=aF, skin=GHM,
        hands=GHM[2], shoes=ROBE[0], on_far=far, on_torso=torso, on_head=head, on_front=front)
    im = outline_same(p.im, (20, 30, 28))
    q = Pic(BS, BS)
    if rings:
        x, y = K0['handF']
        hx, hy = pt(st, 35, x, y) if st is not None else (x, y)
        for j in range(rings + 1):
            r = 5 + j * 6
            q.arc(hx - r, hy - r * 0.35, hx + r, hy + r * 0.35, 0, 360, DUS[3] if j % 2 else DUS[2])
        dust(q, 12 * rings, k + 3, (max(1, hx - 22), max(1, hy - 6), min(114, hx + 22), hy + 22), (DUS[2], DUS[3], GHM[3]))
    if deb:
        debris(q, 7 + deb, 5 + deb * 3, (66, f - 70 + deb * 18, 106, f - 46 + deb * 22))
        if deb >= 2:
            dust(q, 30, deb, (60, f - 14, 110, f - 1), (DUS[1], DUS[2], DUS[3]))
    if rings or deb:
        im = on(im, outline_same(q.im, (30, 26, 22)) if deb else q.im)
    return dither_hole(im, fade, k)


@builder('mayor')
def make_mayor():
    R = mayor_frame
    save_boss('mayor', 'idle', [R(bob=(0, 0, 1, 1, 0)[i], st=1.3 + (0, 0.03, 0.06, 0.03, 0)[i], k=i) for i in range(5)])
    save_boss('mayor', 'attack', [R(aF=(2.1, 0.4), st=2.3, lean=-3, crouch=3, k=0, mouth=1), R(aF=(2.2, 0.2), st=2.2, lean=-5, crouch=6, k=1, mouth=2),
                                  R(aF=(1.8, 0.1), st=2.2, lean=1, k=2, mouth=2), R(aF=(1.2, 0.0), st=1.55, lean=4, crouch=4, deb=1, k=3, mouth=2),
                                  R(aF=(1.1, 0.1), st=1.55, lean=4, crouch=3, deb=2, k=0, mouth=1), R(aF=(0.9, 0.3), st=1.35, lean=2, deb=3, k=1)])
    save_boss('mayor', 'cast', [R(aF=(1.6, 0.6), st=2.2, k=0), R(aF=(2.1, 0.5), st=2.0, rings=1, k=1, lean=-2, mouth=1), R(aF=(2.3, 0.4), st=2.0, rings=2, k=2, lean=-3, mouth=2),
                                R(aF=(2.3, 0.4), st=2.0, rings=3, k=3, lean=-3, mouth=2), R(aF=(2.1, 0.5), st=2.0, rings=2, k=4, lean=-2), R(aF=(1.4, 0.5), st=1.9, k=0)])
    save_boss('mayor', 'hurt', [flash(R(lean=-5, eyes=0, k=1, mouth=2), WHITE), R(lean=-3, k=2, fade=0.25, mouth=1), R(lean=-1, k=3)])
    base = R(eyes=0, aF=(0.4, 0.2), aB=(-0.1, 0.2), st=None, fade=0.0, mouth=2)
    q = Pic(BS, BS); mace_staff(q, 40, BS_FEET - 5, 1.6, 30, 4); sq = outline_same(q.im, (20, 30, 28))
    fallen = lambda k_: fall(base, k_, 90, BS, BS_FEET)
    save_boss('mayor', 'death', [flash(R(lean=-5, eyes=0, k=0, mouth=2), WHITE), R(lean=-7, eyes=0, crouch=6, k=1, fade=0.2, mouth=2), dither_hole(on(sq, fallen(0.4)), 0.3, 2),
                                 dither_hole(on(sq, fallen(0.8)), 0.45, 3), dither_hole(on(sq, fallen(1.0)), 0.6, 0), dither_hole(on(sq, fallen(1.0)), 0.78, 1),
                                 on(sq, dither_hole(fallen(1.0), 0.94, 2))])


# ================================================================== THE GLASS MASTER (boss, drawn, 116x116)
def blowpipe(p, x, y, a, L=50, back=14, hot=3, bub=0.0):
    """The glass master's long iron blowpipe held at (x, y) along a with a big glowing gather at the end; bub = a blown
    bubble growing round the gather."""
    sx, sy = pt(a + math.pi, back, x, y)
    ex, ey = pt(a, L, x, y)
    p.l(sx, sy, ex, ey, I1, 3); p.l(sx, sy, ex, ey, I3, 1)
    p.l(sx, sy, *pt(a, 8, sx, sy), WD2, 4)
    if bub:
        r = 5 + bub * 10
        cx_, cy_ = pt(a, r * 0.75, ex, ey)
        bubble(p, cx_, cy_, r)
    gather(p, ex, ey, 5, hot)
    return ex, ey


def gmaster_frame(step=None, bob=0, lean=0.0, aF=(1.4, 0.2), aB=(1.2, 0.5), pa=1.2, eyes=1, crouch=0, hot=3, bub=0.0, swing=0, glass=0.0, k=0, mouth=0):
    """Side view facing right: the glass master - a huge glassblower in a scorched leather apron and heavy gauntlets, his
    left shoulder and back grown over with jagged crystals of cold blue glass, a leather hood and a mask with two round
    goggles glowing orange; the blowpipe in both hands (pa = angle); swing 1..3 = orange arcs of the pipe swing; bub = the
    great bubble he blows (cast); glass 0..1 = his body turning to glass and shattering (death)."""
    p = Pic(BS, BS)
    f = BS_FEET
    K0 = {}
    def far(p, K):
        K0.update(K)
        sx, sy = K['sh']
        r2 = random.Random(9)
        for j in range(7):                                                              # glass crystals on the back
            bx, by = sx - 12 + r2.uniform(-4, 6), sy - 2 + j * 4 + r2.uniform(-2, 2)
            L = r2.uniform(8, 16)
            a = r2.uniform(-2.6, -1.8)
            tx, ty = bx + math.sin(a) * L, by - abs(math.cos(a)) * L * 0.8
            p.poly([(bx - 3, by), (bx + 3, by + 1), (tx, ty)], GLS[1 + j % 2]); p.l(bx - 3, by, tx, ty, GLS[3])
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.e(min(sx, hx) - 13, sy - 2, max(sx, hx) + 15, hy + 6, (70, 58, 50)); p.e(min(sx, hx) - 10, sy + 1, max(sx, hx) + 12, hy + 2, (92, 78, 66))
        p.poly([(sx + 2, sy + 2), (sx + 15, sy + 6), (hx + 18, f - 14), (hx - 2, f - 14)], LEATH[2])
        p.l(sx + 15, sy + 6, hx + 18, f - 14, LEATH[3]); p.l(sx + 2, sy + 2, hx - 2, f - 14, LEATH[0], 2)
        for x, y in ((hx + 8, hy + 2), (hx + 12, hy + 14), (sx + 10, sy + 14)):
            p.e(x - 2, y - 1, x + 2, y + 2, (30, 20, 16))
        facet(p, [(sx - 12, sy - 6), (sx + 2, sy - 8), (sx + 4, sy + 6), (sx - 10, sy + 8)], GLS)          # glass pauldron
        p.r(hx - 13, hy - 2, hx + 13, hy + 2, LEATH[0]); p.r(hx - 2, hy - 2, hx + 2, hy + 2, BR2)
    def head(p, K):
        x, y = K['head']
        ell(p, x, y, 10, 10, LEATH[1]); p.arc(x - 10, y - 10, x + 10, y + 10, 200, 320, LEATH[0])
        p.poly([(x - 2, y - 6), (x + 12, y - 6), (x + 12, y + 7), (x - 2, y + 8)], (52, 44, 40))
        for gx in (x + 4, x + 10):
            p.e(gx - 3, y - 4, gx + 3, y + 2, I1); p.e(gx - 2, y - 3, gx + 2, y + 1, HOT[3] if eyes else HOT[0])
        p.l(x - 9, y - 1, x + 1, y - 1, LEATH[0], 2)
        p.r(x + 5, y + 4, x + 12, y + 6 + mouth * 2, (30, 20, 16))
        facet(p, [(x - 8, y - 9), (x - 2, y - 12), (x - 4, y - 4), (x - 10, y - 4)], GLS)
    def front(p, K):
        x, y = K['handF']
        bx, by = K['handB']
        if pa is not None:
            blowpipe(p, x, y, pa, 30 if bub else 36, 12, hot, bub)
        ell(p, bx, by, 5, 4.5, LEATH[3]); ell(p, x, y, 5, 4.5, LEATH[3]); p.p(x - 1, y - 2, LEATH[2])
    rig(p, 40, f, LL=30, TL=30, HR=10, step=step, bob=bob, lean=lean, crouch=crouch, legs=((46, 40, 38), (64, 56, 52)), leg_w=12,
        body=((70, 58, 50), (92, 78, 66)), body_w=(15, 15), arms=(SKIN[1], SKIN[2]), arm_w=9, AL=28, aB=aB, aF=aF, skin=SKIN,
        hands=LEATH[3], shoes=(40, 30, 24), on_far=far, on_torso=torso, on_head=head, on_front=front)
    im = outline_same(p.im)
    q = Pic(BS, BS)
    if swing:
        cx, cy = K0['sh']
        for j in range(swing + 1):
            r = 40 + j * 5
            q.arc(cx - r, cy - r, cx + r, cy + r, -80 + j * 20, 10 + j * 20, HOT[3] if j % 2 else HOT[2], 2)
        im = on(im, q.im)
    if glass:
        a = np.array(im)
        m = a[:, :, 3] > 0
        lum = (a[:, :, :3] @ np.array([0.299, 0.587, 0.114])) / 255
        g = np.array(gmap(np.clip(lum * 1.4, 0, 1), stops(GLS)), dtype=np.uint8)
        yy = np.mgrid[0:BS, 0:BS][0]
        rr = random.Random(k)
        sel = m & (yy > BS - glass * BS * 1.2)
        a[sel, :3] = g[sel]
        im = Image.fromarray(a)
    return im


def glass_burst(k, seed=60):
    """The glass master shattered: a great spray of blue shards over the floor, a few large pieces, the blowpipe dropped."""
    p = Pic(BS, BS)
    r2 = random.Random(seed)
    f = BS_FEET
    for j in range(60):
        x0, y0 = 50 + r2.uniform(-14, 14), f - 50 + r2.uniform(-30, 30)
        x1, y1 = r2.uniform(8, 108), f - 1 - r2.uniform(0, 5)
        x, y = x0 + (x1 - x0) * k, y0 + (y1 - y0) * k - math.sin(k * math.pi) * 18
        shard(p, x, y, r2.uniform(2.5, 7 if j % 6 == 0 else 4.5), r2.uniform(0, TAU))
    blowpipe(p, 30, f - 4, 1.62, 40, 0, max(0, int(2 - k * 2)))
    return outline_same(p.im, GLS[0])


@builder('glassmaster')
def make_glassmaster():
    R = gmaster_frame
    save_boss('glassmaster', 'idle', [R(bob=(0, 0, 1, 1, 0)[i], pa=1.2 + (0, 0.03, 0.06, 0.03, 0)[i], hot=(3, 3, 4, 3, 3)[i], k=i) for i in range(5)])
    save_boss('glassmaster', 'attack', [R(aF=(2.1, 0.3), aB=(1.9, 0.5), pa=2.4, lean=-3, crouch=4), R(aF=(2.3, 0.2), aB=(2.1, 0.4), pa=2.6, lean=-5, crouch=7, mouth=1),
                                        R(aF=(1.9, 0.1), aB=(1.8, 0.3), pa=2.0, lean=1, swing=1, mouth=2), R(aF=(1.2, 0.0), aB=(1.1, 0.3), pa=1.2, lean=4, crouch=3, swing=2, mouth=2),
                                        R(aF=(0.9, 0.1), aB=(0.8, 0.4), pa=0.8, lean=3, crouch=2, swing=3, mouth=1), R(aF=(1.3, 0.2), pa=1.15, lean=1)])
    save_boss('glassmaster', 'cast', [R(pa=2.0, aF=(2.0, 0.1), aB=(1.9, 0.3), hot=4, mouth=1), R(pa=2.0, aF=(2.0, 0.1), aB=(1.9, 0.3), bub=0.25, mouth=2, lean=-1),
                                      R(pa=2.0, aF=(2.0, 0.1), aB=(1.9, 0.3), bub=0.55, mouth=2, lean=-2), R(pa=2.0, aF=(2.0, 0.1), aB=(1.9, 0.3), bub=0.85, mouth=2, lean=-2),
                                      R(pa=2.0, aF=(2.0, 0.1), aB=(1.9, 0.3), bub=0.8, mouth=1, lean=-1), R(pa=1.3)])
    save_boss('glassmaster', 'hurt', [flash(R(lean=-5, eyes=0, pa=1.6, mouth=2), WHITE), R(lean=-3, pa=1.4, mouth=1), R(lean=-1)])
    save_boss('glassmaster', 'death', [flash(R(lean=-5, eyes=0, pa=1.6, mouth=2), WHITE), R(lean=-6, eyes=0, crouch=5, pa=None, glass=0.4, mouth=2),
                                       R(lean=-6, eyes=0, crouch=7, pa=None, glass=1.0, mouth=2), glass_burst(0.25), glass_burst(0.6), glass_burst(0.9), glass_burst(1.0)])


# ================================================================== PROPS
def broken_column():
    """A broken fluted limestone column on a square plinth: the shaft snapped off jagged at half height, a drum of it
    lying at the foot, cracks and dust."""
    p = Pic(40, 60)
    p.r(4, 50, 35, 59, RST[1]); p.r(4, 50, 35, 51, RST[3]); p.r(6, 46, 33, 50, RST[2]); p.l(6, 46, 33, 46, RST[4])
    top = [(10, 46), (10, 16), (13, 12), (16, 18), (19, 10), (23, 15), (26, 9), (29, 14), (29, 46)]
    p.poly(top, RST[2])
    for x in (12, 16, 20, 24, 27):
        p.l(x, 18, x, 45, RST[1] if x % 8 else RST[3])
    p.l(10, 16, 10, 46, RST[3]); p.l(29, 14, 29, 46, RST[0])
    p.lines([(13, 12), (16, 18), (19, 10), (23, 15), (26, 9)], RST[4])
    p.lines([(18, 22), (20, 30), (17, 36)], RST[0])
    p.e(26, 52, 38, 59, RST[2]); p.e(27, 52, 37, 56, RST[3]); p.l(30, 52, 30, 59, RST[1]); p.l(34, 52, 34, 59, RST[1])
    q = Pic(40, 60); dust(q, 14, 5, (2, 54, 38, 59), (DUS[1], DUS[2], RST[3]))
    return on(outline_same(p.im, (30, 26, 22)), q.im)


def fallen_beam():
    """A fallen roof beam: a heavy squared timber come down at a slant from the left, its top end still on a stub of
    wall, the lower end in a heap of broken roof tiles and rubble, a few laths and nails sticking out."""
    p = Pic(60, 48)
    for j in range(6):
        stone_block(p, 6, 44 - j * 5, 10, 5, RST, brick=j % 2 == 1)
    p.poly([(4, 10), (11, 6), (58, 38), (52, 44)], WD2); p.l(11, 6, 58, 38, WD3); p.l(4, 10, 52, 44, WD0, 2)
    for t in (0.25, 0.5, 0.75):
        x, y = 8 + 48 * t, 8 + 33 * t
        p.l(x - 1, y - 2, x + 1, y + 3, WD1)
    p.l(30, 22, 34, 14, WD3); p.p(34, 14, I3); p.l(44, 30, 49, 24, WD3)
    r2 = random.Random(31)
    for j in range(14):
        x, y = r2.uniform(30, 58), r2.uniform(40, 47)
        poly_r(p, [(x - 3.5, y - 1.2), (x + 3.5, y - 1.2), (x + 3.5, y + 1.2), (x - 3.5, y + 1.2)], BRK[r2.randrange(1, 4)], x, y, r2.uniform(-0.6, 0.6))
    return outline_same(p.im, (30, 26, 22))


def ruin_statue():
    """A headless statue of a robed town father on a tall plinth with a worn inscription: the head gone at the neck, one
    arm broken off at the elbow, the robe in deep folds, cracks and a dusty rim."""
    p = Pic(36, 64)
    p.r(5, 46, 30, 63, RST[1]); p.r(5, 46, 30, 47, RST[3]); p.r(3, 60, 32, 63, RST[2]); p.r(3, 60, 32, 60, RST[4])
    for x in range(9, 27, 3):
        p.l(x, 52, x + 1, 52, RST[0])
    p.l(10, 55, 25, 55, RST[0])
    p.poly([(10, 46), (12, 16), (16, 12), (21, 12), (25, 16), (27, 46)], RST[2])
    for x, c in ((13, RST[1]), (17, RST[3]), (21, RST[1]), (24, RST[3])):
        p.l(x, 20, x - 1 + (x % 3), 45, c)
    p.r(15, 9, 21, 12, RST[2]); p.lines([(15, 9), (17, 8), (19, 10), (21, 8)], RST[4])                   # the broken neck
    p.l(25, 17, 30, 25, RST[2], 3); p.l(30, 25, 31, 28, RST[3], 3)                                      # the broken arm
    p.l(12, 17, 10, 30, RST[2], 3); p.e(8, 29, 12, 33, RST[3])
    p.e(4, 24, 13, 36, RST[2]); p.l(5, 26, 12, 34, RST[4])                                              # a scroll held to the chest
    p.lines([(20, 22), (22, 30), (19, 38)], RST[0])
    return outline_same(p.im, (30, 26, 22))


def furnace(k):
    """A glass furnace: a squat beehive dome of sooty firebrick on a stone base, two round glory holes roaring orange-white,
    flames licking out of the top flue, an iron band round its waist (2 frames, the fire flickers)."""
    p = Pic(48, 64)
    p.r(3, 52, 44, 63, RST[1]); p.r(3, 52, 44, 53, RST[3])
    p.e(4, 14, 43, 62, KBR[1])
    for y in range(18, 56, 4):
        for x in range(5, 44, 6):
            xo = x + (3 if (y // 4) % 2 else 0)
            if (xo - 23.5) ** 2 / 400 + (y - 38) ** 2 / 576 < 1:
                p.l(xo, y, xo + 4, y, KBR[2 + (x + y) % 2])
    p.arc(4, 14, 43, 62, 190, 290, KBR[3], 2); p.l(6, 40, 42, 40, I1, 2)
    p.r(19, 6, 28, 16, KBR[1]); p.r(19, 6, 28, 7, KBR[3])
    flame(p, 23.5, 7, 9 + k * 3, (-1, 1)[k], 2.6, HOT[:4]); flame(p, 21, 7, 6 + (1 - k) * 2, -1.5, 1.4, HOT[:4])
    for cx, cy, r in ((15, 30, 6), (33, 25, 4.5)):
        p.e(cx - r, cy - r, cx + r, cy + r, KBR[0]); p.e(cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1, HOT[1])
        p.e(cx - r + 2.5, cy - r + 2.5 + k, cx + r - 2.5, cy + r - 2.5, HOT[2]); p.e(cx - r + 4, cy - r + 4 + k * 0.5, cx + r - 4, cy + r - 4 + k * 0.5, HOT[3 + k])
    p.e(17, 44, 30, 54, KBR[0]); p.r(17, 49, 30, 54, KBR[0]); p.e(19, 46, 28, 54, HOT[0 + k]); p.r(19, 50, 28, 54, HOT[0 + k])
    im = outline_same(p.im, (20, 12, 10))
    q = Pic(48, 64)
    r2 = random.Random(70 + k)
    for _ in range(6):
        q.p(r2.uniform(14, 34), r2.uniform(0, 8), HOT[r2.randrange(2, 5)])
    return on(im, q.im)


def glass_rack(broken=False):
    """A tall wooden rack of finished glass: three shelves of blue and green bottles, flasks, vases and goblets with bright
    glints. broken = the same rack shot to pieces - a shelf hanging, most glass gone, a spray of shards at its foot."""
    p = Pic(40, 58)
    for x in (3, 35):
        p.r(x, 4, x + 2, 57, WD2); p.l(x, 4, x, 57, WD3)
    r2 = random.Random(77)
    for j, sy in enumerate((19, 36, 53)):
        if broken and j == 1:
            p.poly([(3, sy - 1), (20, sy + 6), (20, sy + 8), (3, sy + 1)], WD3); p.l(3, sy + 1, 20, sy + 8, WD1)
        else:
            p.r(3, sy, 37, sy + 1, WD3); p.l(3, sy + 2, 37, sy + 2, WD1)
        x = 8
        while x < 34:
            kind = r2.randrange(4)
            pal = GLS[1:] if r2.random() < 0.6 else GLG
            if not broken or (j == 2 and x < 14) or (j == 0 and x > 28):
                bottle(p, x, sy - 1, kind, pal)
            elif broken and r2.random() < 0.5:
                shard(p, x, sy - 2, 2.5, r2.uniform(-2.5, -0.6))
            x += r2.choice((6, 7))
    p.r(3, 3, 37, 4, WD3)
    im = outline_same(p.im)
    if broken:
        q = Pic(40, 58)
        for j in range(16):
            shard(q, r2.uniform(2, 38), r2.uniform(54, 57), r2.uniform(1.8, 3.2), r2.uniform(0, TAU))
        im = on(im, outline_same(q.im, GLS[0]))
    return im


def glass_bench():
    """A glassblower's bench: a heavy wooden seat between two long flat arms, a blowpipe resting across the arms with a
    glowing gather at its end, a pair of steel jacks and a wooden water bucket beside it."""
    p = Pic(52, 40)
    for x in (8, 38):
        p.r(x, 22, x + 2, 39, WD1)
    p.r(4, 18, 46, 22, WD2); p.l(4, 18, 46, 18, WD3)
    p.r(10, 24, 36, 27, WD2); p.l(10, 24, 36, 24, WD3)
    p.l(0, 15, 50, 13, I1); p.l(0, 14, 50, 12, I3); gather(p, 47, 12.5, 3, 3)
    p.l(16, 17, 22, 10, STEELC[3]); p.l(18, 17, 24, 10, STEELC[2]); p.e(14, 15, 19, 19, STEELC[1])
    p.r(40, 28, 50, 39, WD2); p.l(40, 31, 50, 31, I1); p.l(40, 36, 50, 36, I1); p.e(40, 26, 50, 30, GLS[1]); p.p(43, 28, GLS[3])
    return outline_same(p.im)


@builder('props')
def make_props():
    save_prop('brokencolumn', [broken_column()])
    save_prop('fallenbeam', [fallen_beam()])
    save_prop('ruinstatue', [ruin_statue()])
    save_prop('furnace', [furnace(k) for k in range(2)], 48, 64)
    save_prop('glassrack', [glass_rack()], 40, 58)
    save_prop('glassrack_broken', [glass_rack(True)], 40, 58)
    save_prop('glassbench', [glass_bench()])


# ================================================================== ITEMS, PARTICLES AND ICONS
def sling_pick():
    """The sling: two plaited leather cords looped together with a cupped pouch holding a grey stone."""
    p = Pic(44, 22)
    p.lines([(2, 6), (10, 9), (18, 12), (24, 14)], (130, 96, 58), 2); p.lines([(2, 8), (10, 13), (18, 16), (24, 16)], (104, 74, 44), 2)
    p.e(0, 4, 5, 9, (150, 112, 70)); p.e(1, 5, 4, 8, (0, 0, 0, 0))
    p.e(22, 10, 36, 20, LEATH[2]); p.e(24, 11, 34, 16, LEATH[3])
    shade_ball(p, 29, 12, 4, (RST[1], RST[2], RST[3], RST[4]))
    p.lines([(36, 15), (42, 13)], (130, 96, 58), 2)
    return outline_same(p.im)


def glassgun_pick():
    """The glass gun: a brass-bound blunderbuss-like stock, a blue glass reservoir globe with an orange glow on top and a
    flared bell muzzle bristling with glass teeth."""
    p = Pic(50, 26)
    p.poly([(1, 18), (14, 13), (16, 15), (16, 21), (3, 24)], WD2); p.l(1, 18, 14, 13, WD3)
    p.r(14, 12, 36, 17, BR1); p.l(14, 12, 36, 12, BR3)
    for x in (18, 26, 33):
        p.l(x, 11, x, 18, BR3)
    p.poly([(36, 11), (46, 6), (46, 23), (36, 18)], BR2); p.l(36, 11, 46, 6, BR4); p.l(46, 6, 46, 23, BR1, 2)
    for y in (9, 13, 17, 21):
        p.poly([(46, y), (49, y + 1), (46, y + 2)], GLS[3])
    shade_ball(p, 24, 7, 6, (GLS[0], GLS[1], GLS[2], GLS[3])); p.e(22, 5, 26, 9, HOT[2]); p.p(23, 6, HOT[4]); p.p(21, 3, GLS[4])
    return outline_same(p.im)


def stone_bag():
    p = Pic(24, 20)
    p.poly([(3, 19), (2, 10), (6, 6), (17, 6), (21, 10), (20, 19)], LEATH[2]); p.l(6, 6, 17, 6, (140, 110, 70), 2)
    p.l(5, 14, 17, 13, LEATH[1])
    for x, y in ((7, 3), (12, 2), (17, 4)):
        shade_ball(p, x, y + 1, 2.8, (RST[1], RST[2], RST[3], RST[4]))
    return outline_same(p.im)


def glass_bits():
    p = Pic(22, 18)
    facet(p, [(2, 16), (6, 6), (11, 9), (10, 17)], GLS)
    facet(p, [(9, 17), (13, 4), (19, 8), (17, 17)], GLS)
    facet(p, [(15, 17), (17, 12), (21, 14), (20, 17)], GLG + (GLG[3],))
    return outline_same(p.im, GLS[0])


@builder('items')
def make_items():
    for name, im in (('pick_sling', sling_pick()), ('pick_glassgun', glassgun_pick()), ('item_slingstones', stone_bag()), ('item_glass', glass_bits())):
        save(hard(im.crop(im.getbbox())), G_OUT + name + '.png')


@builder('particles')
def make_particles():
    fr = []                                                                   # a puff of dust (grows and thins)
    for k in range(3):
        p = Pic(10, 10)
        r = 2.5 + k * 1.2
        ell(p, 5, 5.5, r, r * 0.85, DUS[1]); ell(p, 4.5, 4.8, r * 0.7, r * 0.55, DUS[3])
        fr.append(dither_hole(p.im, 0.18 * k, k))
    save(cells(fr, 10, 10), G_OUT + 'part_ruindust.png', 3)
    fr = []                                                                   # a kiln ember (2 frames, flickers)
    for k in range(2):
        p = Pic(6, 6)
        ell(p, 2.5, 2.5, 2 - k * 0.5, 2 - k * 0.5, HOT[2]); p.p(2, 2, HOT[4 - k])
        fr.append(p.im)
    save(cells(fr, 6, 6), G_OUT + 'part_kilnember.png', 2)
    fr = []                                                                   # stone chunks (limestone, brick, small chip)
    for k in range(3):
        p = Pic(8, 8)
        if k == 1:
            poly_r(p, [(1, 2.5), (7, 2.5), (7, 5.5), (1, 5.5)], BRK[2], 4, 4, 0.4); p.l(2, 3, 6, 4, BRK[3])
        else:
            s_ = 3.3 if k == 0 else 2.2
            pts = [(3.5 + math.cos(a) * s_ * (0.75 + 0.25 * ((j * 7) % 3) / 2), 3.8 + math.sin(a) * s_ * 0.85) for j, a in enumerate(np.linspace(0, TAU, 7)[:-1])]
            p.poly(pts, RST[2]); p.p(2.5, 2.5, RST[4]); p.p(4.5, 5, RST[1])
        fr.append(outline_same(p.im, (30, 26, 22)))
    save(cells(fr, 8, 8), G_OUT + 'part_rubble30.png', 3)
    fr = []                                                                   # a glob of molten glass (flying / splatted)
    for k in range(2):
        p = Pic(8, 8)
        if k == 0:
            ell(p, 3.5, 4, 2.6, 2.4, HOT[1]); ell(p, 3.2, 3.6, 1.6, 1.4, HOT[3]); p.p(3, 3, HOT[4])
        else:
            p.e(0, 5, 7, 7, HOT[1]); p.r(2, 5, 5, 6, HOT[2]); p.p(3, 5, HOT[4]); p.p(1, 4, HOT[2]); p.p(6, 4, HOT[2])
        fr.append(p.im)
    save(cells(fr, 8, 8), G_OUT + 'part_moltenglass.png', 2)


@builder('icons')
def make_icons():
    p = Pic(8, 8)                                                             # HUD: scorching heat (heat waves over a flame)
    p.bitmap(0, 0, ["#..#..#.", ".#..#..#", "#..#..#.", "...#....", "..###...", ".#####..", ".##.##..", "..###..."], {'#': WHITE})
    save(p.im, G_OUT + 'icon_heat.png')
    p = Pic(8, 8)                                                             # HUD: cut by glass shards
    p.bitmap(0, 0, ["......#.", ".....##.", "....###.", "...###..", "..###...", ".##.....", "#..#.#..", ".#....#."], {'#': WHITE})
    save(p.im, G_OUT + 'icon_shards.png')




# ================================================================== CONTACT SHEET AND CHECKS
NEW_WEAPONS = ('sling', 'glassgun')


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


ENEMY_SHEETS = ('looter', 'rubblegolem', 'rooftopper', 'dustdevil', 'glassblower', 'glassgolem', 'slagcrawler', 'kilnspirit')
BOSSES = ('mayor', 'glassmaster')


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
    for sh in ENEMY_SHEETS:
        have = [st for st in ('idle', 'movement', 'attack', 'take_damage', 'death') if G_OUT + f'enemies-{sh}_{st}.png' in man]
        if len(have) != 5:
            print('INCOMPLETE ENEMY SET:', sh, have)
    for b in BOSSES:
        have = [st for st in ('idle', 'attack', 'cast', 'hurt', 'death') if G_OUT + f'boss_{b}_{st}.png' in man]
        if len(have) != 5:
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
    out.save(SCR + 'v30_tiles.png')


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
