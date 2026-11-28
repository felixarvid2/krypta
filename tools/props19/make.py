#!/usr/bin/env python3
"""Version 22 graphics for Krypta ("Badhuset och Skärselden"): the ruined Roman bathhouse and purgatory, eight new enemies,
the bath master and the fire lord, textures, props, items, particles and HUD icons.

Run from anywhere:  python3 -B tools/props19/make.py [name ...]   (contact sheet <scratchpad>/en/v22_sheet.png, seams v22_tiles.png)
The first-person weapons trident / brimstone come from tools/props19/fp_defs.py + tools/weapon-frames (render-static.mjs,
pack.py, pixelstyle.py); the unstyled packed strips are kept in tools/props19/fp_orig/.

Name clashes: floor_ash and prop_fountain already exist, so the purgatory ash floor is floor_ashfield and the bath fountain
is prop_bathfountain; the imp sheet is taken, the fire imp is fireimp (as the contract says). Nothing is overwritten.

Out to assets/gfx (enemy cells 64x64, feet row 57, idle 4, movement 6, attack 6, take_damage 3, death 6):
  enemies-attendant_*    a drowned bath attendant in a stained tunic with a wet towel (attack = the towel lash)
  enemies-steamghost_*   a wavering ghost of steam, dithered so it looks see-through (attack = vapour arms reach out)
  enemies-gladiator_*    crested bronze helmet, red scutum held in front, trident (attack = the thrust)
  enemies-moldcrawler_*  a lumpy fungal grub on short legs with pale caps (attack = rears; death bursts into spores)
  enemies-fireimp_*      a small glowing fire imp with horns, flame mane and bat wings (attack = throws a fireball)
  enemies-lostsoul_*     a burning skull with a flame trail (attack = the charge; death = explosion and skull shards)
  enemies-fleshbrute_*   a hulking flayed flesh brute with bone spikes and huge fists (attack = the ground slam)
  enemies-ashwalker_*    an ash-caked walker with glowing seams (death = crumbles into an ash heap with embers)
  boss_bathmaster_{idle,attack,cast,hurt,death} (116x116; a bloated bath master with a bronze ladle: attack = scalding
      water thrown in an arc, cast = steam clouds) and boss_pyrelord_{...} (a horned charred fire demon: attack = fire
      pillar from the floor, cast = fire rain, death = burns down to embers)
  prop_bathstatue (1), prop_bathfountain (2, 48x48), prop_bathbench (1), prop_chainedsoul (2, 32x64, hangs from row 0),
  prop_bonepillar (1), prop_brimpot (2, 40x44), pick_trident, pick_brimstone, item_brimstone, part_steam3 (2, 10x10),
  part_ash2 (2, 8x8), part_brimstone (2, 8x8), icon_scald, icon_stream (8x8)
Out to assets/wall: wall_bathmosaic, wall_bathcolumn, wall_boss_bathmaster, wall_flesh, wall_bone, wall_boss_pyrelord (64x128);
  floor_bathtile, floor_mosaic, floor_boss_bathmaster, floor_hotpool, floor_coldpool, floor_steamvent, floor_ashfield,
  floor_brimstone, floor_boss_pyrelord, floor_firestream, floor_runecircle (64x64), mean brightness 40-115.
Everything is drawn procedurally with the helpers of tools/props2-props18 (no outside image).
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


P18 = _load('props18make', 'props18')          # loads props2-props17 itself; only pure drawing helpers are used
P17 = P18.P17
P16 = P17.P16
for _k in ('Pic outline outline_same hard shift gmap blend tint shear squash strip cut_below pool pnoise spark dark flash tube '
           'bez puff flame halo put dust wrap_pic poly_r ell shade_ball on cells rig fall pt stops stone_rgb x2 plank_v plank_h '
           'I0 I1 I2 I3 F0 F1 F2 F3 AU0 AU1 AU2 AU3 AU4 BR0 BR1 BR2 BR3 BR4 WD0 WD1 WD2 WD3 WD4 SKIN BLK RUST SLG SLIME PINK '
           'flipv ground_it').split():
    globals()[_k] = getattr(P17, _k)
for _k in 'GLOW SEA TEAL STRAW DIRT LEATH HOOD BLOOD drips glow_pic shade_ball'.split():
    globals()[_k] = getattr(P18, _k)
sink, helmet = P16.sink, P16.helmet

G_OUT, W_OUT = ROOT + '/assets/gfx/', ROOT + '/assets/wall/'
SCR = '/tmp/claude-0/-home-user/80ee56ba-2fa6-5354-b261-a4ca4fdcb508/scratchpad/en/'
SHEET, MANIFEST = SCR + 'v22_sheet.png', SCR + 'v22_manifest.json'
WHITE = (255, 255, 255)
FW, FEET = 64, 57                                       # enemy cells
BS, BS_FEET = 116, 115                                  # boss cells
TAU = math.tau

# ---------------------------------------------------------------- bathhouse palettes
MARB = ((52, 52, 56), (82, 80, 80), (112, 108, 104), (142, 138, 130), (172, 168, 158))   # dim old marble
VEIN = ((40, 46, 44), (64, 72, 66))
TESS = ((150, 70, 40), (168, 128, 52), (40, 104, 104), (40, 58, 104), (186, 176, 146), (30, 28, 26))   # mosaic tesserae
HOTW = ((34, 60, 58), (52, 88, 82), (80, 120, 108), (130, 166, 150), (200, 214, 204))     # hot murky bath water
COLDW = ((16, 40, 70), (24, 64, 104), (40, 100, 140), (90, 150, 190), (180, 220, 236))    # clear cold water
TOGA = ((96, 92, 84), (140, 134, 122), (180, 174, 160), (214, 208, 194))
PALE = ((92, 100, 96), (130, 138, 130), (166, 172, 160), (198, 202, 188))                  # drowned pale skin
MOLD = ((30, 40, 22), (54, 68, 36), (84, 100, 56), (124, 138, 84), (176, 184, 130))
STEAMC = ((120, 124, 128), (160, 164, 168), (200, 204, 206), (236, 238, 238))
# ---------------------------------------------------------------- purgatory palettes
FLESH = ((56, 14, 14), (96, 28, 26), (136, 48, 42), (174, 78, 66), (206, 118, 100))
BONE = ((66, 60, 48), (106, 98, 80), (146, 138, 116), (186, 178, 156), (218, 212, 194))
ASHP = ((26, 22, 22), (44, 38, 36), (64, 56, 52), (88, 78, 72), (114, 102, 94))
BRIM = ((64, 54, 10), (110, 94, 18), (156, 136, 36), (196, 182, 72), (232, 222, 130))
LAVA = ((70, 8, 0), (150, 36, 0), (220, 92, 10), (255, 170, 40), (255, 236, 150))
CHAR = ((16, 12, 12), (34, 24, 22), (56, 38, 32), (80, 56, 46))                          # charred demon hide
IMP = ((90, 24, 10), (150, 50, 20), (200, 90, 30), (236, 140, 60))

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


def put_rgb(rgb, im):
    """Composite an RGBA picture onto an RGB array of the same size."""
    put(rgb, im)


# ================================================================== BATHHOUSE TEXTURES
def marble_rgb(w, h, seed, k=1.0):
    """Old marble (tiles both ways): pale stone with soft clouds and thin dark veins."""
    nz = pnoise(w, h, seed, ((16, 1.0), (8, 0.5), (4, 0.25)))
    rgb = gmap(np.clip((0.35 + nz * 0.45) * k, 0, 1), stops(MARB))
    yy, xx = np.mgrid[0:h, 0:w]
    v = np.abs(np.sin((xx * 0.7 + yy * 0.35 + pnoise(w, h, seed + 1, ((16, 1.0), (8, 0.5))) * 14) / 3.0))
    rgb[v < 0.08] = VEIN[1]
    rgb[v < 0.03] = VEIN[0]
    return rgb


def blocks(rgb, bw, bh, col=MARB[0], stagger=True):
    h, w = rgb.shape[:2]
    for y in range(0, h, bh):
        rgb[y, :] = col
        off = (bw // 2) if (stagger and (y // bh) % 2) else 0
        for x in range(off, w + bw, bw):
            rgb[y:y + bh, x % w] = col


def tess_band(rgb, y0, y1, seed, pattern='wave'):
    """A mosaic band of 1-pixel tesserae (half-res) between rows y0..y1: a running wave (or key) pattern in colour on cream."""
    h, w = rgb.shape[:2]
    r2 = random.Random(seed)
    for y in range(y0, y1):
        for x in range(w):
            t = (y - y0) / max(1, y1 - y0 - 1)
            wave = 0.5 + 0.4 * math.sin((x / w) * TAU * 2)
            if pattern == 'wave':
                c = TESS[2] if abs(t - wave) < 0.18 else TESS[3] if t > wave else TESS[4]
            else:
                c = TESS[0] if (x // 3 + y // 3) % 4 == 0 else TESS[4]
            c = np.array(c) * r2.uniform(0.82, 1.0)
            rgb[y, x] = c
        if (y - y0) % 2 == 0:
            rgb[y, ::2] = rgb[y, ::2] * 0.8
    rgb[y0] = TESS[5]; rgb[y1 - 1] = TESS[5]


def tex_wall_bathmosaic():
    """A bathhouse wall: marble ashlar below, a mosaic frieze of blue waves on cream above with dark borders, a red-and-cream
    key band at the top, cracks, a few lost tesserae and damp at the foot."""
    w, h = 32, 64
    rgb = marble_rgb(w, h, 2401)
    blocks(rgb, 16, 10)
    tess_band(rgb, 8, 24, 2402, 'wave')
    tess_band(rgb, 2, 7, 2403, 'key')
    r2 = random.Random(2404)
    for _ in range(10):
        x, y = r2.randrange(w), r2.randrange(9, 23)
        rgb[y, x] = MARB[1]
    for y in range(28, 50):
        x = 20 + int(math.sin(y * 0.5) * 2)
        rgb[y, x] = VEIN[0]
    for y in range(56, 64):
        k = (y - 55) / 9
        rgb[y] = rgb[y] * (1 - 0.4 * k) + np.array(HOTW[0]) * 0.4 * k
    finish(rgb, 'wall_bathmosaic.png', 48)


def tex_wall_bathcolumn():
    """A colonnade: a fluted marble column with a scrolled capital and a moulded base in front of a dark arcade, a mosaic band
    on the architrave above."""
    w, h = 32, 64
    rgb = marble_rgb(w, h, 2411, 0.45)
    rgb[:] = rgb * 0.6
    tess_band(rgb, 1, 6, 2412, 'key')
    nz = marble_rgb(w, h, 2413)
    for x in range(8, 24):
        t = (x - 8) / 15
        sh = 0.55 + 0.55 * math.sin(t * math.pi) - (0.25 if (x - 8) % 3 == 0 else 0)
        rgb[10:57, x] = np.clip(nz[10:57, x] * sh, 0, 255)
    rgb[6:10, 5:27] = MARB[3]; rgb[6, 5:27] = MARB[4]; rgb[9, 5:27] = MARB[1]
    for x, d in ((6, 1), (25, -1)):
        rgb[7:10, x:x + 2] = MARB[2]; rgb[8, x + (1 if d > 0 else 0)] = MARB[0]
    rgb[57:62, 6:26] = MARB[3]; rgb[57, 6:26] = MARB[4]; rgb[61, 6:26] = MARB[1]; rgb[62:, 4:28] = MARB[2]
    finish(rgb, 'wall_bathcolumn.png', 40)


def tex_wall_boss_bathmaster():
    """The bath master's wall: marble with a big bronze lion-head spout pouring hot water into a basin, mosaic waves round
    it and steam stains."""
    w, h = 64, 128
    rgb = x2(marble_rgb(32, 64, 2421))
    sm = rgb[::2, ::2].copy(); tess_band(sm, 4, 14, 2422, 'wave'); tess_band(sm, 46, 52, 2423, 'key')
    rgb[:] = x2(sm)
    p = Pic(w, h)
    cx, cy = 31.5, 50
    p.e(cx - 15, cy - 15, cx + 15, cy + 15, BR1); p.e(cx - 12, cy - 13, cx + 12, cy + 11, BR2)       # mane
    for j in range(12):
        a = j / 12 * TAU
        p.l(cx + math.cos(a) * 10, cy + math.sin(a) * 10, cx + math.cos(a) * 16, cy + math.sin(a) * 16, BR0, 2)
    p.e(cx - 8, cy - 8, cx + 8, cy + 9, BR3); p.e(cx - 3, cy - 2, cx + 3, cy + 3, BR2)               # face, nose
    p.r(cx - 5, cy - 4, cx - 2, cy - 2, (20, 14, 8)); p.r(cx + 2, cy - 4, cx + 5, cy - 2, (20, 14, 8))
    p.e(cx - 4, cy + 4, cx + 4, cy + 9, (14, 10, 6))                                                      # mouth
    for y in range(int(cy) + 8, 112):                                                                     # the stream
        p.l(cx - 2 + math.sin(y * 0.4), y, cx + 2 + math.sin(y * 0.4), y, HOTW[3] if y % 3 else HOTW[4])
    p.e(cx - 22, 106, cx + 22, 120, MARB[1]); p.e(cx - 20, 106, cx + 20, 114, HOTW[2]); p.l(cx - 22, 106, cx + 22, 106, MARB[4])
    for j, (x, y) in enumerate(((cx - 10, 96), (cx + 9, 92), (cx - 6, 84))):
        p.e(x - 4, y - 3, x + 4, y + 3, STEAMC[2 + j % 2])
    put(rgb, outline_same(p.im))
    finish(rgb, 'wall_boss_bathmaster.png', 64, half=False)


def bathtile_rgb(seed, pal=MARB, size=8):
    w = h = 32
    rgb = marble_rgb(w, h, seed, 1.12)
    blocks(rgb, size, size, MARB[0], stagger=False)
    nz = pnoise(w, h, seed + 2, ((16, 1.0), (8, 0.5)))
    m = nz > 0.78
    rgb[m] = rgb[m] * 0.7 + np.array(HOTW[1]) * 0.3
    return rgb


def tex_floor_bathtile():
    finish(bathtile_rgb(2431), 'floor_bathtile.png', 32)


def mosaic_rgb(seed=2441):
    """A floor mosaic (64x64 full res, tiles): 2-px tesserae - a dark border, a cream field and a rosette of red, ochre and
    blue petals in the middle."""
    rgb = np.zeros((64, 64, 3))
    r2 = random.Random(seed)
    for ty in range(32):
        for tx in range(32):
            x, y = tx * 2 + 1, ty * 2 + 1
            d = math.hypot(x - 32, y - 32)
            a = math.atan2(y - 32, x - 32)
            if min(x, y, 63 - x, 63 - y) < 5:
                c = TESS[5] if min(x, y, 63 - x, 63 - y) < 2 else TESS[0]
            elif d < 4:
                c = TESS[1]
            elif d < 22 and math.cos(a * 8) * 8 + 12 > d:
                c = TESS[0] if d < 12 else TESS[3]
            elif abs(d - 25) < 1.5:
                c = TESS[2]
            else:
                c = TESS[4]
            rgb[ty * 2:ty * 2 + 2, tx * 2:tx * 2 + 2] = np.array(c) * r2.uniform(0.7, 0.9)
            rgb[ty * 2 + 1, tx * 2:tx * 2 + 2] *= 0.78
            rgb[ty * 2:ty * 2 + 2, tx * 2 + 1] *= 0.85
    return rgb


def tex_floor_mosaic():
    finish(mosaic_rgb(), 'floor_mosaic.png', 48, half=False)


def tex_floor_boss_bathmaster():
    """The bath master's floor: mosaic waves round a big round bronze drain."""
    rgb = mosaic_rgb(2451) * 0.92
    p = Pic(64, 64)
    p.e(18, 18, 45, 45, BR0); p.e(20, 20, 43, 43, BR2); p.e(23, 23, 40, 40, (16, 20, 20))
    for j in range(-2, 3):
        p.l(31.5 + j * 3.5, 24, 31.5 + j * 3.5, 39, BR1)
    p.arc(20, 20, 43, 43, 200, 300, BR4)
    put(rgb, outline_same(p.im))
    finish(rgb, 'floor_boss_bathmaster.png', 48, half=False)


def water_rgb(pal, seed, ripple=6):
    nz = pnoise(64, 64, seed, ((32, 1.0), (16, 0.6), (8, 0.3)))
    yy, xx = np.mgrid[0:64, 0:64]
    caus = np.abs(np.sin((xx + nz * 20) / 64 * TAU * 3) * np.sin((yy + nz * 16) / 64 * TAU * 3))
    lum = np.clip(0.2 + nz * 0.4 + (caus > 0.85) * 0.25, 0, 1)
    return gmap(lum, stops(pal))


def tex_floor_hotpool():
    """A hot pool: murky green-grey water with a red heat tinge, rising bubbles and white steam wisps."""
    rgb = water_rgb(HOTW, 2461)
    rgb = rgb * 0.85 + np.array((60, 20, 10)) * 0.15
    def fn(p, ox, oy):
        r2 = random.Random(2462)
        for _ in range(10):
            x, y, r = r2.uniform(0, 64) + ox, r2.uniform(0, 64) + oy, r2.choice((1, 1.5, 2))
            p.e(x - r, y - r, x + r, y + r, HOTW[4])
        for _ in range(4):
            x, y = r2.uniform(0, 64) + ox, r2.uniform(0, 64) + oy
            p.lines([(x, y), (x + 3, y - 2), (x + 6, y), (x + 9, y - 2)], STEAMC[3])
    put(rgb, wrap_pic(64, 64, fn))
    finish(rgb, 'floor_hotpool.png', 40, half=False)


def tex_floor_coldpool():
    """A cold plunge pool: clear blue water over pale tiles (the grout shows through), light ripples."""
    rgb = x2(bathtile_rgb(2471)) * 0.45 + water_rgb(COLDW, 2472) * 0.6
    finish(rgb, 'floor_coldpool.png', 40, half=False)


def tex_floor_steamvent():
    """A steam vent: the bath tiles with a round bronze grate over the hypocaust and white wisps rising."""
    rgb = x2(bathtile_rgb(2481))
    p = Pic(64, 64)
    p.e(16, 16, 47, 47, BR0); p.e(18, 18, 45, 45, BR2); p.e(21, 21, 42, 42, (20, 10, 6))
    for j in range(-3, 4):
        p.l(31.5 + j * 3, 21, 31.5 + j * 3, 42, BR1)
    p.e(28, 28, 35, 35, (180, 60, 20))
    im = outline_same(p.im)
    q = Pic(64, 64)
    for x, y, r in ((30, 28, 5), (26, 23, 3.5), (36, 24, 4), (32, 18, 3)):
        q.e(x - r, y - r, x + r, y + r, STEAMC[1]); q.e(x - r + 1, y - r + 1, x + r - 1, y + r - 1, STEAMC[3])
    put(rgb, on(im, q.im))
    finish(rgb, 'floor_steamvent.png', 40, half=False)


# ================================================================== PURGATORY TEXTURES
def flesh_rgb(w, h, seed):
    nz = pnoise(w, h, seed, ((16, 1.0), (8, 0.6), (4, 0.3)))
    yy, xx = np.mgrid[0:h, 0:w]
    folds = np.abs(np.sin((yy + nz * 10) / 5.0)) 
    lum = np.clip(0.3 + nz * 0.35 + folds * 0.25, 0, 1)
    rgb = gmap(lum, stops(FLESH))
    vz = pnoise(w, h, seed + 1, ((8, 1.0), (4, 0.5)))
    rgb[np.abs(vz - 0.5) < 0.025] = (40, 10, 30)
    return rgb


def tex_wall_flesh():
    """A wall of flesh: wet red folds and muscle, dark veins, a few pustules, a lidded eye and teeth pushing through."""
    w, h = 32, 64
    rgb = flesh_rgb(w, h, 2501)
    p = Pic(w, h)
    for x, y in ((6, 12), (24, 40), (10, 52)):
        p.e(x - 2, y - 2, x + 2, y + 2, (210, 190, 110)); p.p(x - 1, y - 1, (250, 240, 180))
    p.e(16, 24, 26, 30, FLESH[0]); p.e(18, 25, 24, 29, (220, 210, 190)); p.e(20, 26, 22, 28, (140, 20, 10)); p.l(16, 24, 26, 24, FLESH[4])
    for j in range(4):
        p.poly([(3 + j * 3, 36), (4 + j * 3, 32), (5 + j * 3, 36)], (220, 210, 186))
    put(rgb, outline_same(p.im, FLESH[0]))
    finish(rgb, 'wall_flesh.png', 40)


def bone_pic(w, h, seed):
    p = Pic(w, h)
    r2 = random.Random(seed)
    for row, y in enumerate(range(3, h + 4, 7)):
        off = (row % 2) * 4
        for x in range(-4 + off, w + 4, 8):
            if r2.random() < 0.45:                                             # a skull
                p.e(x - 3, y - 3, x + 3, y + 2, BONE[3]); p.r(x - 2, y + 1, x + 2, y + 3, BONE[2])
                p.p(x - 1, y - 1, BONE[0]); p.p(x + 1, y - 1, BONE[0]); p.p(x, y + 1, BONE[0])
                p.p(x - 2, y - 2, BONE[4])
            else:                                                              # a bone end on
                a = r2.uniform(-0.4, 0.4)
                p.l(x - 4, y + a * 4, x + 4, y - a * 4, BONE[2], 2); p.e(x - 5, y - 2, x - 3, y + 1, BONE[3]); p.e(x + 3, y - 2, x + 5, y + 1, BONE[3])
    return p.im


def tex_wall_bone():
    """A wall of bones: skulls and long bones packed in rows in black mortar, stained with soot."""
    w, h = 32, 64
    rgb = gmap(np.clip(pnoise(w, h, 2511, ((8, 1.0),)) * 0.4, 0, 1), stops(ASHP))
    put(rgb, outline_same(bone_pic(w, h, 2512), (20, 16, 14)))
    nz = pnoise(w, h, 2513, ((16, 1.0), (8, 0.5)))
    rgb[nz > 0.7] = rgb[nz > 0.7] * 0.55
    for y in range(56, 64):
        rgb[y] = rgb[y] * (1 - 0.4 * (y - 55) / 8)
    finish(rgb, 'wall_bone.png', 40)


def tex_wall_boss_pyrelord():
    """The fire lord's wall: black basalt split by glowing cracks, a burning horned demon face in a ring of fire runes."""
    w, h = 64, 128
    nz = pnoise(32, 64, 2521, ((8, 1.0), (4, 0.5)))
    rgb = x2(gmap(np.clip(0.2 + nz * 0.6, 0, 1), stops(ASHP)))
    p = Pic(w, h)
    cx, cy = 31.5, 46
    for j in range(12):
        a = j / 12 * TAU
        x, y = cx + math.cos(a) * 24, cy + math.sin(a) * 24
        p.l(x - 2, y - 2, x + 2, y + 2, LAVA[3]); p.l(x - 2, y + 2, x + 2, y - 2, LAVA[2])
    p.arc(cx - 20, cy - 20, cx + 20, cy + 20, 0, 360, LAVA[1], 2)
    p.poly([(cx - 10, cy - 6), (cx - 22, cy - 22), (cx - 16, cy - 30), (cx - 14, cy - 18)], BONE[2])      # horns
    p.poly([(cx + 10, cy - 6), (cx + 22, cy - 22), (cx + 16, cy - 30), (cx + 14, cy - 18)], BONE[2])
    p.e(cx - 11, cy - 11, cx + 11, cy + 13, CHAR[2]); p.e(cx - 9, cy - 9, cx + 9, cy + 11, CHAR[3])
    p.poly([(cx - 8, cy - 2), (cx - 3, cy - 1), (cx - 6, cy + 2)], LAVA[4]); p.poly([(cx + 8, cy - 2), (cx + 3, cy - 1), (cx + 6, cy + 2)], LAVA[4])
    p.poly([(cx - 6, cy + 5), (cx + 6, cy + 5), (cx, cy + 11)], LAVA[2])
    for j in range(4):
        p.poly([(cx - 5 + j * 3, cy + 5), (cx - 4 + j * 3, cy + 8), (cx - 3 + j * 3, cy + 5)], BONE[4])
    put(rgb, outline_same(p.im))
    r2 = random.Random(2522)
    for _ in range(7):                                                                        # glowing cracks
        x, y = r2.randrange(64), r2.randrange(70, 128)
        for _ in range(18):
            if 0 <= x < 64 and 0 <= y < 128:
                rgb[y, x] = LAVA[2]
            x += r2.choice((-1, 0, 1)); y += r2.choice((-1, 0, 1, 1))
    finish(rgb, 'wall_boss_pyrelord.png', 64, half=False)


def ash_rgb(seed=2531, ember=12):
    w = h = 32
    nz = pnoise(w, h, seed, ((16, 1.0), (8, 0.6), (4, 0.3)))
    rgb = gmap(np.clip(0.25 + nz * 0.55, 0, 1), stops(ASHP))
    r2 = random.Random(seed + 1)
    for _ in range(ember):
        x, y = r2.randrange(w), r2.randrange(h)
        rgb[y, x] = LAVA[2] if r2.random() < 0.6 else LAVA[3]
    for _ in range(5):
        x, y = r2.randrange(w), r2.randrange(h)
        for _ in range(6):
            rgb[y % h, x % w] = ASHP[0]; x += r2.choice((-1, 1)); y += r2.choice((0, 1))
    return rgb


def tex_floor_ashfield():
    finish(ash_rgb(), 'floor_ashfield.png', 32)


def tex_floor_brimstone():
    """A brimstone crust: cracked dark-yellow sulphur with ochre seams and bubbling pockets."""
    w = h = 32
    nz = pnoise(w, h, 2541, ((16, 1.0), (8, 0.6), (4, 0.3)))
    rgb = gmap(np.clip(0.2 + nz * 0.5, 0, 1), stops(BRIM))
    rgb = rgb * 0.78
    vz = pnoise(w, h, 2542, ((8, 1.0), (4, 0.4)))
    rgb[np.abs(vz - 0.5) < 0.035] = (54, 36, 8)
    r2 = random.Random(2543)
    for _ in range(6):
        x, y = r2.randrange(w), r2.randrange(h)
        rgb[y, x] = BRIM[4]; rgb[y, (x + 1) % w] = BRIM[3]
    finish(rgb, 'floor_brimstone.png', 32)


def tex_floor_boss_pyrelord():
    """The fire lord's arena floor: black cracked basalt with glowing seams and a burning rune circle with a five-pointed star."""
    nz = pnoise(64, 64, 2551, ((16, 1.0), (8, 0.5)))
    rgb = gmap(np.clip(nz * 0.5, 0, 1), stops(CHAR)) + 8
    p = Pic(64, 64)
    p.arc(6, 6, 57, 57, 0, 360, LAVA[1], 2); p.arc(10, 10, 53, 53, 0, 360, LAVA[2])
    pts = [(31.5 + math.cos(-math.pi / 2 + j * TAU * 2 / 5) * 21, 31.5 + math.sin(-math.pi / 2 + j * TAU * 2 / 5) * 21) for j in range(6)]
    p.lines(pts, LAVA[3])
    for j in range(10):
        a = j / 10 * TAU
        p.p(31.5 + math.cos(a) * 24, 31.5 + math.sin(a) * 24, LAVA[4])
    put(rgb, p.im)
    finish(rgb, 'floor_boss_pyrelord.png', 48, half=False)


def tex_floor_firestream():
    """A river of fire: dark crusted lava with bright orange flow streaks running along the tile (left to right) and a few
    floating black crust plates; kept dim enough (the game's light adds the glow)."""
    yy, xx = np.mgrid[0:64, 0:64]
    nz = pnoise(64, 64, 2561, ((32, 1.0), (16, 0.6), (8, 0.3)))
    flow = np.sin((yy + np.sin(xx / 64 * TAU) * 3 + nz * 8) / 64 * TAU * 6) * 0.5 + 0.5
    lum = np.clip(0.12 + nz * 0.35 + flow * 0.3, 0, 1)
    rgb = gmap(lum, stops(LAVA)) * 0.62
    crust = pnoise(64, 64, 2562, ((16, 1.0), (8, 0.5))) > 0.72
    rgb[crust] = CHAR[2]
    finish(rgb, 'floor_firestream.png', 40, half=False)


def tex_floor_runecircle():
    """A rune circle in the ash: a red-glowing double ring with runes and a star."""
    rgb = x2(ash_rgb(2571, 6))
    p = Pic(64, 64)
    p.arc(5, 5, 58, 58, 0, 360, (150, 20, 10), 2); p.arc(10, 10, 53, 53, 0, 360, (200, 40, 20))
    pts = [(31.5 + math.cos(-math.pi / 2 + j * TAU * 2 / 5) * 20, 31.5 + math.sin(-math.pi / 2 + j * TAU * 2 / 5) * 20) for j in range(6)]
    p.lines(pts, (220, 60, 30))
    for j in range(8):
        a = j / 8 * TAU + 0.2
        x, y = 31.5 + math.cos(a) * 25.5, 31.5 + math.sin(a) * 25.5
        p.l(x - 1, y - 1, x + 1, y + 1, (255, 110, 60)); p.p(x + 1, y - 1, (255, 110, 60))
    put(rgb, p.im)
    finish(rgb, 'floor_runecircle.png', 40, half=False)


@builder('textures')
def make_textures():
    for fn in (tex_wall_bathmosaic, tex_wall_bathcolumn, tex_wall_boss_bathmaster, tex_wall_flesh, tex_wall_bone, tex_wall_boss_pyrelord,
               tex_floor_bathtile, tex_floor_mosaic, tex_floor_boss_bathmaster, tex_floor_hotpool, tex_floor_coldpool, tex_floor_steamvent,
               tex_floor_ashfield, tex_floor_brimstone, tex_floor_boss_pyrelord, tex_floor_firestream, tex_floor_runecircle):
        fn()


# ================================================================== SHARED BITS
def dither_hole(im, k, seed=0):
    """Knock out pixels on an ordered 4x4 pattern (k 0..1 = share removed): a see-through look with hard alpha."""
    a = np.array(im)
    B = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    m = B[(yy + seed) % 4, (xx + seed) % 4] < k
    a[m] = 0
    return Image.fromarray(a)


def towel(p, x, y, a, L=12, snap=0.0):
    """A wet towel hanging from the hand at (x, y): a limp cloth strip; snap 0..1 straightens it into a lash along a."""
    pts = []
    for j in range(7):
        t = j / 6
        hang = (1 - snap) * t * t * L * 0.9
        px, py = pt(a, L * t * (0.4 + 0.6 * snap), x, y)
        pts.append((px, py + hang))
    p.lines(pts, TOGA[1], 3); p.lines(pts, TOGA[3], 1)
    if snap > 0.7:
        ex, ey = pts[-1]
        p.p(ex + 2, ey - 2, WHITE); p.p(ex + 3, ey + 1, WHITE); p.p(ex + 1, ey + 3, (180, 200, 220))


def trident_s(p, x, y, a, L=22, back=8):
    sx, sy = pt(a + math.pi, back, x, y)
    ex, ey = pt(a, L, x, y)
    p.l(sx, sy, ex, ey, (70, 50, 30), 2)
    u = (math.sin(a), math.cos(a)); v = (u[1], -u[0])
    p.l(ex + v[0] * 3, ey + v[1] * 3, ex - v[0] * 3, ey - v[1] * 3, BR2, 2)
    for s in (-3, 0, 3):
        bx, by = ex + v[0] * s, ey + v[1] * s
        L2 = 6 if s == 0 else 4
        p.l(bx, by, bx + u[0] * L2, by + u[1] * L2, I3)
        p.p(bx + u[0] * L2 + v[0] * 0.8, by + u[1] * L2 + v[1] * 0.8, I3)
    return ex + u[0] * 6, ey + u[1] * 6


def scutum(p, x, y, h=16, w=10):
    """A tall curved red legion shield with a gold boss and border, seen from the side-front."""
    p.r(x - w / 2, y - h / 2, x + w / 2, y + h / 2, (130, 26, 22)); p.l(x - w / 2, y - h / 2, x - w / 2, y + h / 2, (90, 16, 14), 2)
    p.r(x - w / 2, y - h / 2, x + w / 2, y - h / 2 + 1, AU2); p.r(x - w / 2, y + h / 2 - 1, x + w / 2, y + h / 2, AU2)
    p.l(x + w / 2, y - h / 2, x + w / 2, y + h / 2, AU2)
    p.e(x - 2, y - 2, x + 2, y + 2, AU3); p.p(x - 1, y - 1, AU4)
    p.l(x - w / 2 + 2, y - 4, x + w / 2 - 2, y - 4, AU1); p.l(x - w / 2 + 2, y + 4, x + w / 2 - 2, y + 4, AU1)


def flames(p, x, y, n, h, seed, spread=4, lean=0.0):
    r2 = random.Random(seed)
    for _ in range(n):
        fx = x + r2.uniform(-spread, spread)
        flame(p, fx, y, h * r2.uniform(0.6, 1.0), lean + r2.uniform(-0.4, 0.4), 0.9)


# ================================================================== BATH ATTENDANT (drawn, 64x64)
def attendant_raw(step=None, bob=0, lean=1.5, aF=(1.0, 0.5), aB=(0.6, 0.6), snap=0.0, ta=1.2, eyes=1, mouth=1, crouch=0, tw=True):
    """Side view facing right: a drowned bath attendant - a pale, wrinkled, greenish zombie in a stained grey-white tunic
    belted with a cord, bare legs and sandals, wet hair plastered down; a wet towel hangs from the front hand (snap = the
    lash)."""
    p = Pic(64, 64)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.poly([(sx - 5, sy), (sx + 5, sy), (hx + 7, FEET - 12), (hx - 7, FEET - 12)], TOGA[1])
        p.l(sx + 5, sy, hx + 7, FEET - 12, TOGA[3]); p.l(sx - 1, sy + 2, hx - 2, FEET - 13, TOGA[0])
        p.l(hx - 5, hy - 2, hx + 5, hy - 2, (90, 70, 50))
        p.p(hx + 2, hy + 4, MOLD[2]); p.p(sx, sy + 6, MOLD[1])
    def head(p, K):
        x, y = K['head']
        p.arc(x - 5, y - 6, x + 5, y + 4, 180, 330, (40, 46, 40), 2)
        p.l(x - 5, y - 2, x - 6, y + 5, (40, 46, 40))
        if eyes:
            p.p(x + 3, y - 1, (230, 230, 200)); p.p(x + 4, y - 1, BLK[0])
        else:
            p.l(x + 2, y - 1, x + 4, y - 1, BLK[0])
        if mouth:
            p.r(x + 3, y + 3, x + 5, y + 3 + mouth, (40, 20, 20))
    def front(p, K):
        if tw:
            towel(p, K['handF'][0], K['handF'][1], ta, 11, snap)
        ell(p, K['handF'][0], K['handF'][1], 1.6, 1.6, PALE[2])
    rig(p, 30, FEET, LL=14, TL=13, HR=5, step=step, bob=bob, lean=lean, crouch=crouch, legs=(PALE[1], PALE[2]), leg_w=4, body=(TOGA[1], TOGA[2]),
        body_w=(6, 6), arms=(PALE[1], PALE[2]), arm_w=3, AL=13, aB=aB, aF=aF, skin=PALE, hands=PALE[2], shoes=(80, 60, 40),
        on_torso=torso, on_head=head, on_front=front)
    drips(p, 22, 30, 40, FEET - 1, 300 + bob + int(snap * 9), 4)
    return outline_same(p.im)


@builder('attendant')
def make_attendant():
    A = attendant_raw
    save_enemy('attendant', 'idle', [A(bob=(0, 0, 1, 0)[i], mouth=(1, 1, 2, 1)[i]) for i in range(4)])
    save_enemy('attendant', 'movement', [A(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=2.5, aF=(1.1 + 0.2 * math.sin(i / 6 * TAU), 0.5)) for i in range(6)])
    save_enemy('attendant', 'attack', [A(aF=(2.6, 0.5), ta=3.6, lean=-1), A(aF=(2.8, 0.3), ta=3.9, lean=-2, mouth=2), A(aF=(2.0, 0.0), ta=1.8, snap=0.6, lean=1, mouth=2),
                                       A(aF=(1.6, 0.0), ta=1.6, snap=1.0, lean=3, crouch=2, mouth=3), A(aF=(1.3, 0.2), ta=1.4, snap=0.5, lean=2, mouth=2), A()])
    save_enemy('attendant', 'take_damage', [flash(A(lean=-2, eyes=0, mouth=3), WHITE), A(lean=-1, mouth=2), A(lean=0)])
    base = A(eyes=0, mouth=2, aF=(1.2, 0.4), aB=(1.0, 0.5), tw=False)
    q = Pic(64, 64); q.lines([(36, FEET - 1), (42, FEET - 2), (48, FEET - 1), (52, FEET - 1)], TOGA[1], 3); tw_im = outline_same(q.im)
    save_enemy('attendant', 'death', [flash(A(lean=-2, eyes=0, mouth=3), WHITE), on(fall(base, 0.25), tw_im), on(fall(base, 0.55), tw_im), on(fall(base, 0.85), tw_im),
                                      on(fall(base, 1.0), tw_im), on(fall(base, 1.0), tw_im)])


# ================================================================== STEAM GHOST (drawn, 64x64, floating - drawn low)
def steamghost_raw(k=0, dx=0, dy=0, wide=1.0, eyes=1, arms=0.0, fade=0.0, mouth=0):
    """A ghost of steam: a tall wavering white-grey column that tapers into wisps below, two dark hollow eyes and a moaning
    mouth, long vapour arms (arms 0..1 reach forward); fade 0..1 thins it out (an ordered dither knocks out pixels so it
    looks see-through - the game also hides it outside steam)."""
    p = Pic(64, 64)
    f = FEET
    cx, cy = 31 + dx, f - 24 + dy
    for j in range(8):
        t = j / 7
        y = cy - 10 + t * 30
        r = (8 - t * 6) * wide + math.sin(k * 1.3 + j) * 1.2
        x = cx + math.sin(k * 0.9 + j * 0.8) * 2 * t
        p.e(x - r, y - 4, x + r, y + 4, STEAMC[1] if j % 2 else STEAMC[2])
    ell(p, cx, cy - 10, 7 * wide, 7, STEAMC[2]); ell(p, cx - 1, cy - 12, 5 * wide, 4, STEAMC[3])
    for s in (-1, 1):
        ax = cx + 6 + arms * 10
        p.lines([(cx + s * 2, cy - 3), (cx + 4 + arms * 5, cy - 2 + s * 2), (ax, cy - 4 + s * 3)], STEAMC[1], 2)
    if eyes:
        p.e(cx + 1, cy - 13, cx + 4, cy - 9, (30, 34, 40)); p.e(cx + 5, cy - 13, cx + 7, cy - 9, (30, 34, 40))
    p.e(cx + 3, cy - 7, cx + 6, cy - 4 + mouth * 2, (40, 44, 50))
    im = outline_same(p.im, (90, 96, 104))
    return dither_hole(im, 0.25 + fade * 0.7, k % 4)


@builder('steamghost')
def make_steamghost():
    G = steamghost_raw
    save_enemy('steamghost', 'idle', [G(k=i, dy=(0, -1, -2, -1)[i]) for i in range(4)])
    save_enemy('steamghost', 'movement', [G(k=i, dx=(0, 1, 2, 2, 1, 0)[i] - 1, dy=-(i % 2)) for i in range(6)])
    save_enemy('steamghost', 'attack', [G(k=0, arms=0.3, mouth=1), G(k=1, arms=0.7, wide=1.1, mouth=2), G(k=2, arms=1.0, wide=1.2, dx=3, mouth=2),
                                        G(k=3, arms=1.0, wide=1.2, dx=4, mouth=2), G(k=0, arms=0.6, dx=2, mouth=1), G(k=1, arms=0.2)])
    save_enemy('steamghost', 'take_damage', [flash(G(k=0, eyes=0, mouth=2), WHITE), G(k=1, wide=0.9, mouth=1), G(k=2)])
    save_enemy('steamghost', 'death', [flash(G(k=0, eyes=0, mouth=2), WHITE), G(k=1, wide=1.3, fade=0.3, mouth=2), G(k=2, wide=1.5, fade=0.5, dy=4),
                                       G(k=3, wide=1.7, fade=0.7, dy=10), ground_it(G(k=0, wide=1.8, fade=0.85, dy=16)), ground_it(G(k=1, wide=2.0, fade=0.95, dy=18))])


# ================================================================== GLADIATOR (drawn, 64x64)
def gladiator_raw(step=None, bob=0, lean=1.0, aF=(1.0, 0.6), aB=(0.9, 0.9), ta=1.45, reach=0, eyes=1, crouch=0, shield=True, net=0):
    """Side view facing right: a gladiator - a crested bronze helmet with a grilled visor, a bare muscled torso with a
    leather belt and kilt, a manica on the sword arm, greaves; a tall red scutum on the back arm held in front of the body
    (it blocks shots from ahead), a trident in the front hand (reach shoves it forward); net 1..3 = the thrown net."""
    p = Pic(64, 64)
    K0 = {}
    def far(p, K):
        K0.update(K)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.r(hx - 6, hy - 2, hx + 6, hy + 1, LEATH[1]); p.p(hx + 1, hy - 1, AU3)
        p.poly([(hx - 6, hy + 1), (hx + 7, hy + 1), (hx + 8, hy + 9), (hx - 7, hy + 9)], LEATH[2])
        for x in range(int(hx) - 5, int(hx) + 7, 3):
            p.l(x, hy + 2, x + 1, hy + 8, LEATH[0])
        p.l(sx + 2, sy + 4, sx + 4, sy + 8, SKIN[0])
    def head(p, K):
        x, y = K['head']
        p.e(x - 6, y - 7, x + 6, y + 5, BR2); p.arc(x - 5, y - 6, x + 4, y + 2, 200, 300, BR4)
        p.r(x + 1, y - 3, x + 6, y + 3, BR1)
        for yy in (-2, 0, 2):
            p.l(x + 2, y + yy, x + 6, y + yy, (20, 16, 10))
        if eyes:
            p.p(x + 4, y - 1, (230, 200, 160))
        p.poly([(x - 8, y - 6), (x - 3, y - 12), (x + 4, y - 11), (x + 1, y - 7)], (150, 30, 24))      # crest
        p.l(x - 6, y + 4, x + 6, y + 5, BR0, 2)
    def front(p, K):
        hx, hy = K['handF']
        if ta is not None:
            trident_s(p, hx + reach * 2, hy, ta, 10 + reach * 2, 10)
        ell(p, hx, hy, 1.7, 1.7, SKIN[1])
    rig(p, 25, FEET, LL=14, TL=13, HR=5, step=step, bob=bob, lean=lean, crouch=crouch, legs=(SKIN[1], SKIN[2]), leg_w=5, body=(SKIN[1], SKIN[2]),
        body_w=(6, 7), arms=(SKIN[1], SKIN[2]), arm_w=4, AL=13, aB=aB, aF=aF, skin=SKIN, hands=SKIN[1], shoes=BR1,
        on_far=far, on_torso=torso, on_head=head, on_front=front)
    if shield:
        bx, by = K0['handB']
        scutum(p, bx + 4, by - 3, 18, 9)
    if net:
        cx, cy = 40 + net * 6, FEET - 26 + net * 4
        r = 4 + net * 2
        for j in range(-2, 3):
            p.l(cx - r, cy + j * r / 2.5, cx + r, cy + j * r / 2.5 + 2, ROPE_N)
            p.l(cx + j * r / 2.5, cy - r, cx + j * r / 2.5 + 2, cy + r, ROPE_N)
    return outline_same(p.im)


ROPE_N = (150, 132, 96)


@builder('gladiator')
def make_gladiator():
    G = gladiator_raw
    save_enemy('gladiator', 'idle', [G(bob=(0, 0, 1, 0)[i], ta=1.45 + (0, 0.03, 0.06, 0.03)[i]) for i in range(4)])
    save_enemy('gladiator', 'movement', [G(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=2) for i in range(6)])
    save_enemy('gladiator', 'attack', [G(aF=(0.9, 0.9), reach=-1, lean=-1), G(aF=(0.8, 1.0), reach=-2, lean=-2), G(aF=(1.5, 0.1), ta=1.55, reach=1.2, lean=1),
                                       G(aF=(1.6, 0.0), ta=1.57, reach=1.5, lean=1, crouch=2), G(aF=(1.3, 0.4), reach=0.5, lean=2), G()])
    save_enemy('gladiator', 'take_damage', [flash(G(lean=-2, eyes=0), WHITE), G(lean=-1), G()])
    base = G(eyes=0, ta=None, shield=False, aF=(1.2, 0.4), aB=(1.0, 0.5))
    q = Pic(64, 64); scutum(q, 44, FEET - 3, 6, 18); trident_s(q, 18, FEET - 2, 1.57, 18, 4); sh = outline_same(q.im)
    save_enemy('gladiator', 'death', [flash(G(lean=-2, eyes=0), WHITE), fall(G(eyes=0, ta=None, aF=(1.2, 0.4)), 0.25), on(fall(base, 0.55), sh), on(fall(base, 0.85), sh),
                                      on(fall(base, 1.0), sh), on(fall(base, 1.0), sh)])


# ================================================================== MOLD CRAWLER (drawn, 64x64, low)
def mold_raw(k=0, rear=0.0, dx=0, eyes=1, puff=0, flat=0.0):
    """A mould crawler: a long lumpy grey-green fungal grub (about 34 px) crawling on many short legs, a pale fruiting
    crown of little caps along its back, a round toothed mouth; rear lifts its front (attack), puff = spores bursting,
    flat 0..1 flattens it into a spore-dusted smear (death)."""
    p = Pic(64, 64)
    f = FEET
    cx = 30 + dx
    for j in range(7):
        t = j / 6
        x = cx - 16 + t * 30
        lift = rear * max(0, t - 0.5) * 2 * 10
        y = f - 5 - lift + math.sin(k * 1.2 + j) * 0.8 * (1 - flat) + flat * 3
        r = (4.5 - abs(t - 0.45) * 3) * (1 - flat * 0.3)
        if not flat:
            p.l(x, y + 2, x - 1 + math.sin(k + j) * 1.5, f - 1, MOLD[0])
        ell(p, x, y, r + 1, r * (1 - flat * 0.6), MOLD[1]); ell(p, x - 0.5, y - 1, r * 0.7, r * 0.5 * (1 - flat * 0.6), MOLD[2])
        if j % 2 == 0 and flat < 0.5:
            p.e(x - 1.5, y - r - 2, x + 1.5, y - r, MOLD[4]); p.l(x, y - r, x, y - r + 1, MOLD[3])
    hx, hy = cx + 16, f - 6 - rear * 10 + flat * 3
    ell(p, hx, hy, 4, 3.5 * (1 - flat * 0.5), MOLD[2]); p.e(hx + 1, hy - 1, hx + 4, hy + 2, (40, 20, 20))
    for j in range(3):
        p.p(hx + 2 + j, hy - 1 + j, MOLD[4])
    if eyes and not flat:
        p.p(hx - 1, hy - 2, (210, 200, 60))
    im = outline_same(p.im)
    if puff:
        q = Pic(64, 64)
        r2 = random.Random(70 + puff)
        for _ in range(6 + puff * 4):
            x, y = cx + r2.uniform(-16, 16), f - 10 - r2.uniform(0, 6 + puff * 5)
            q.e(x - 1.5, y - 1.5, x + 1.5, y + 1.5, MOLD[3] if r2.random() < 0.5 else (170, 160, 90))
        im = on(im, q.im)
    return im


@builder('moldcrawler')
def make_moldcrawler():
    M = mold_raw
    save_enemy('moldcrawler', 'idle', [M(k=i) for i in range(4)])
    save_enemy('moldcrawler', 'movement', [M(k=i, dx=(0, 1, 2, 2, 1, 0)[i] - 1) for i in range(6)])
    save_enemy('moldcrawler', 'attack', [M(k=0, rear=0.3), M(k=1, rear=0.7), M(k=2, rear=1.0, dx=2), M(k=3, rear=0.6, dx=4, puff=1), M(k=0, rear=0.2, dx=2), M(k=1)])
    save_enemy('moldcrawler', 'take_damage', [flash(M(k=0, eyes=0, rear=0.3), WHITE), M(k=1, rear=0.2), M(k=2)])
    save_enemy('moldcrawler', 'death', [flash(M(k=0, eyes=0, rear=0.4), WHITE), M(k=1, eyes=0, puff=1), M(k=2, eyes=0, flat=0.4, puff=2), M(k=3, eyes=0, flat=0.8, puff=3),
                                        M(eyes=0, flat=1.0, puff=2), M(eyes=0, flat=1.0, puff=1)])


# ================================================================== FIRE IMP (drawn, 64x64, small)
def fireimp_raw(step=None, bob=0, lean=2.0, aF=(0.8, 0.8), aB=(0.4, 0.8), ball=0, eyes=1, crouch=0, mouth=0, fly=None):
    """Side view facing right: a small fire imp (about 30 px) - glowing red-orange hide with dark cracks, a flickering
    flame mane, two black horns, small bat wings, a barbed tail, clawed feet; ball 1..2 = a fireball growing in the raised
    hand, fly = the thrown fireball's position."""
    p = Pic(64, 64)
    K0 = {}
    def far(p, K):
        K0.update(K)
        sx, sy = K['sh']
        p.poly([(sx - 2, sy + 1), (sx - 12, sy - 8), (sx - 10, sy - 2), (sx - 13, sy + 2), (sx - 4, sy + 5)], CHAR[2])   # wing
        hx, hy = K['hip']
        p.lines([(hx - 2, hy + 1), (hx - 9, hy + 3), (hx - 12, hy - 1)], IMP[1], 2); p.poly([(hx - 12, hy - 1), (hx - 15, hy - 3), (hx - 13, hy + 1)], IMP[0])
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.l(sx, sy + 2, hx + 1, hy - 1, IMP[0]); p.p(sx + 2, sy + 4, IMP[3])
    def head(p, K):
        x, y = K['head']
        flame(p, x - 2, y - 2, 7 + bob, -0.8, 0.9)
        p.poly([(x - 2, y - 3), (x - 5, y - 9), (x, y - 4)], BLK[1]); p.poly([(x + 2, y - 3), (x + 2, y - 9), (x + 4, y - 3)], BLK[1])
        if eyes:
            p.p(x + 3, y - 1, (255, 240, 120)); p.p(x + 4, y - 1, (255, 240, 120))
        else:
            p.l(x + 2, y - 1, x + 4, y - 1, BLK[0])
        p.l(x + 2, y + 2, x + 5, y + 2 + mouth, (60, 10, 0))
    def front(p, K):
        hx, hy = K['handF']
        ell(p, hx, hy, 1.5, 1.5, IMP[2])
    rig(p, 30, FEET, LL=9, TL=9, HR=4.5, step=step, bob=bob, lean=lean, crouch=crouch, legs=(IMP[0], IMP[1]), leg_w=3, body=(IMP[1], IMP[2]),
        body_w=(5, 5), arms=(IMP[1], IMP[2]), arm_w=2, AL=10, aB=aB, aF=aF, skin=IMP, hands=IMP[2], shoes=BLK[1],
        on_far=far, on_torso=torso, on_head=head, on_front=front)
    im = outline_same(p.im)
    q = Pic(64, 64)
    if ball:
        hx, hy = K0['handF']
        r = 2 + ball
        q.e(hx - r, hy - r - 2, hx + r, hy + r - 2, LAVA[2]); q.e(hx - r + 1, hy - r - 1, hx + r - 1, hy + r - 3, LAVA[4])
        im = on(im, glow_pic(hx, hy - 2, 3 + ball * 2, 8, ball), outline_same(q.im, LAVA[0]))
    if fly:
        q2 = Pic(64, 64)
        x, y = fly
        q2.e(x - 4, y - 4, x + 4, y + 4, LAVA[2]); q2.e(x - 2, y - 3, x + 3, y + 2, LAVA[4]); q2.l(x - 9, y + 1, x - 4, y, LAVA[1], 2)
        im = on(im, outline_same(q2.im, LAVA[0]))
    return im


@builder('fireimp')
def make_fireimp():
    F = fireimp_raw
    save_enemy('fireimp', 'idle', [F(bob=(0, 0, 1, 0)[i], aF=(0.8 + 0.1 * (i % 2), 0.8)) for i in range(4)])
    save_enemy('fireimp', 'movement', [F(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=4) for i in range(6)])
    save_enemy('fireimp', 'attack', [F(aF=(2.6, 0.3), ball=1, lean=-1, mouth=1), F(aF=(2.9, 0.2), ball=2, lean=-2, mouth=2), F(aF=(1.8, 0.0), lean=3, mouth=2, fly=(48, 34)),
                                     F(aF=(1.4, 0.2), lean=4, mouth=1, fly=(56, 32)), F(aF=(1.0, 0.6), lean=2), F()])
    save_enemy('fireimp', 'take_damage', [flash(F(lean=-2, eyes=0, mouth=2), WHITE), F(lean=-1, mouth=1), F()])
    base = F(eyes=0, mouth=2, aF=(1.2, 0.4), aB=(1.0, 0.5))
    q = Pic(64, 64); flames(q, 30, FEET - 1, 3, 6, 5); fl_im = q.im
    save_enemy('fireimp', 'death', [flash(F(lean=-2, eyes=0, mouth=2), WHITE), fall(base, 0.3), fall(base, 0.65), on(fall(base, 1.0), fl_im), on(fall(base, 1.0), fl_im),
                                    on(squash(fall(base, 1.0), 0.6, FEET + 1), fl_im)])


# ================================================================== LOST SOUL (drawn, 64x64, flying - drawn low)
def lostsoul_raw(k=0, dx=0, dy=0, charge=0.0, jaw=0.0, eyes=1, boom=0, frag=False):
    """A burning skull (about 20 px) with a long flame trail streaming back from it (charge 0..1 stretches the trail and
    tips it forward), glowing eye sockets, a snapping jaw; boom 1..3 = it explodes; frag = skull fragments on the floor."""
    p = Pic(64, 64)
    f = FEET
    if frag:
        for x, y, r in ((22, f - 2, 3), (32, f - 3, 4), (42, f - 2, 2.5), (28, f - 1, 2)):
            p.e(x - r, y - r * 0.7, x + r, y + r * 0.5, BONE[3]); p.p(x, y - 1, BONE[1])
        p.e(30, f - 6, 36, f - 1, BONE[3]); p.p(32, f - 4, BLK[0]); p.p(34, f - 4, BLK[0])
        return outline_same(p.im)
    cx, cy = 34 + dx + charge * 6, f - 18 + dy
    q = Pic(64, 64)
    for j in range(6):
        t = j / 5
        L = 12 + charge * 10
        x = cx - 5 - t * L
        y = cy - 2 + math.sin(k * 1.4 + j) * 2 - t * 3 * (1 - charge)
        r = 6 - t * 4
        q.e(x - r, y - r, x + r, y + r, LAVA[2] if j % 2 else LAVA[3])
    q.e(cx - 9, cy - 9, cx + 5, cy + 5, LAVA[3])
    im_fl = q.im
    p.e(cx - 6, cy - 7, cx + 6, cy + 4, BONE[3]); p.arc(cx - 5, cy - 6, cx + 4, cy + 2, 200, 300, BONE[4])
    p.e(cx - 1, cy - 4, cx + 2, cy - 1, (20, 10, 4)); p.e(cx + 3, cy - 4, cx + 6, cy - 1, (20, 10, 4))
    if eyes:
        p.p(cx + 1, cy - 3, LAVA[4]); p.p(cx + 4, cy - 3, LAVA[4])
    p.p(cx + 5, cy + 1, (20, 10, 4))
    jy = cy + 4 + jaw * 3
    p.r(cx - 3, jy - 1, cx + 5, jy + 1, BONE[2])
    for x in range(int(cx) - 2, int(cx) + 6, 2):
        p.p(x, cy + 3, BONE[4]); p.p(x, jy - 2, BONE[4])
    im = on(im_fl, outline_same(p.im))
    if boom:
        b = Pic(64, 64)
        r = 6 + boom * 7
        b.e(cx - r, cy - r, cx + r, cy + r, LAVA[2]); b.e(cx - r * 0.6, cy - r * 0.6, cx + r * 0.6, cy + r * 0.6, LAVA[3]); b.e(cx - r * 0.3, cy - r * 0.3, cx + r * 0.3, cy + r * 0.3, LAVA[4])
        im = b.im if boom >= 2 else on(im, b.im)
    return im


@builder('lostsoul')
def make_lostsoul():
    L = lostsoul_raw
    save_enemy('lostsoul', 'idle', [L(k=i, dy=(0, -1, -2, -1)[i], jaw=(0, 0.3, 0.6, 0.3)[i]) for i in range(4)])
    save_enemy('lostsoul', 'movement', [L(k=i, dx=(0, 1, 2, 2, 1, 0)[i] - 3, dy=-(i % 2)) for i in range(6)])
    save_enemy('lostsoul', 'attack', [L(k=0, charge=0.2, jaw=0.4, dx=-4), L(k=1, charge=0.6, jaw=0.8, dx=-3), L(k=2, charge=1.0, jaw=1.0, dx=-2),
                                      L(k=3, charge=1.0, jaw=1.0, dx=-1), L(k=0, charge=0.6, jaw=0.6, dx=-3), L(k=1, charge=0.2, dx=-4)])
    save_enemy('lostsoul', 'take_damage', [flash(L(k=0, eyes=0, jaw=1.0, dx=-4), WHITE), L(k=1, jaw=0.8, dx=-5), L(k=2, dx=-4)])
    save_enemy('lostsoul', 'death', [flash(L(k=0, eyes=0, jaw=1.0, dx=-4), WHITE), L(k=1, boom=1, dx=-4), L(k=2, boom=2, dx=-4), L(k=3, boom=3, dx=-4),
                                     L(frag=True), L(frag=True)])


# ================================================================== FLESH BRUTE (drawn, 64x64, big)
def brute_raw(step=None, bob=0, lean=3.0, aF=(0.9, 0.5), aB=(0.6, 0.6), eyes=1, crouch=0, mouth=1, slam=0):
    """Side view facing right: a hulking flesh brute - flayed red muscle with pale tendons and bone spikes bursting from the
    back, a tiny eyeless head sunk between huge shoulders with a jaw full of teeth, enormous fists, stumpy legs; slam 1..2 =
    shock-wave cracks and debris at the fists."""
    p = Pic(64, 64)
    K0 = {}
    def far(p, K):
        K0.update(K)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.e(sx - 12, sy - 5, sx + 3, sy + 9, FLESH[1])                                       # the hump
        p.e(min(sx, hx) - 8, sy, max(sx, hx) + 8, hy + 3, FLESH[2]); p.e(min(sx, hx) - 5, sy + 2, max(sx, hx) + 6, hy, FLESH[3])
        for j in range(3):                                                                   # pale tendons
            p.l(sx + 1 + j * 2, sy + 2, hx + 2 + j * 2, hy - 1, FLESH[4])
        for j, (dx, dy, L) in enumerate(((-9, -2, 8), (-6, -5, 9), (-2, -6, 7))):            # bone spikes from the hump
            bx, by = sx + dx, sy + dy
            p.poly([(bx - 1.5, by + 2), (bx - 4 - j, by - L), (bx + 1.5, by + 1)], BONE[3]); p.l(bx - 1, by + 1, bx - 3 - j, by - L + 2, BONE[4])
    def head(p, K):
        x, y = K['head']
        x, y = x + 3, y + 5
        ell(p, x, y, 5, 4.5, FLESH[2]); p.arc(x - 5, y - 5, x + 4, y + 2, 200, 320, FLESH[4])
        p.poly([(x + 1, y + 1), (x + 9, y + 1), (x + 8, y + 4 + mouth), (x + 1, y + 4 + mouth)], (40, 6, 6))
        for j in range(4):
            p.p(x + 2 + j * 2, y + 1, BONE[4]); p.p(x + 2 + j * 2, y + 3 + mouth, BONE[4])
        if eyes:
            p.p(x + 3, y - 2, (255, 220, 80)); p.p(x + 5, y - 2, (255, 220, 80))
    def front(p, K):
        hx, hy = K['handF']
        ell(p, hx, hy, 4.5, 4, FLESH[2]); p.arc(hx - 4, hy - 4, hx + 4, hy + 3, 200, 330, FLESH[4])
    rig(p, 27, FEET, LL=11, TL=14, HR=4, step=step, bob=bob, lean=lean, crouch=crouch, legs=(FLESH[1], FLESH[2]), leg_w=7, body=(FLESH[2], FLESH[3]),
        body_w=(9, 10), arms=(FLESH[2], FLESH[3]), arm_w=6, AL=17, aB=aB, aF=aF, skin=FLESH, hands=FLESH[2], shoes=FLESH[0],
        on_far=far, on_torso=torso, on_head=head, on_front=front)
    bx, by = K0['handB']
    ell(p, bx, by, 4, 3.5, FLESH[1])
    im = outline_same(p.im)
    if slam:
        q = Pic(64, 64)
        r2 = random.Random(60 + slam)
        for j in range(8):
            a = -math.pi / 2 + r2.uniform(-1.3, 1.3)
            d = 3 + slam * 5 + r2.uniform(0, 4)
            x, y = 45 + math.cos(a) * d, FEET - 1 + math.sin(a) * d * 0.7
            q.r(x, y, x + 1, y + 1, ASHP[r2.randrange(2, 5)])
        q.lines([(34, FEET), (42, FEET - 1), (50, FEET), (57, FEET - 1)], (20, 10, 8))
        im = on(im, outline_same(q.im))
    return im


@builder('fleshbrute')
def make_fleshbrute():
    B = brute_raw
    save_enemy('fleshbrute', 'idle', [B(bob=(0, 0, 1, 1)[i], mouth=(1, 1, 2, 1)[i]) for i in range(4)])
    save_enemy('fleshbrute', 'movement', [B(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=5, aF=(0.9 + 0.3 * math.sin(i / 6 * TAU), 0.5), aB=(0.6 - 0.3 * math.sin(i / 6 * TAU), 0.6)) for i in range(6)])
    save_enemy('fleshbrute', 'attack', [B(aF=(2.6, 0.4), aB=(2.4, 0.4), lean=-1, mouth=2), B(aF=(3.0, 0.2), aB=(2.9, 0.2), lean=-2, mouth=3),
                                        B(aF=(1.8, 0.0), aB=(1.7, 0.0), lean=4, crouch=3, mouth=3), B(aF=(1.2, 0.0), aB=(1.1, 0.0), lean=7, crouch=5, mouth=2, slam=1),
                                        B(aF=(1.1, 0.1), aB=(1.0, 0.1), lean=6, crouch=4, mouth=1, slam=2), B()])
    save_enemy('fleshbrute', 'take_damage', [flash(B(lean=0, eyes=0, mouth=3), WHITE), B(lean=1, mouth=2), B(lean=2)])
    base = B(eyes=0, mouth=3, aF=(1.2, 0.4), aB=(1.0, 0.5), lean=1)
    save_enemy('fleshbrute', 'death', [flash(B(lean=0, eyes=0, mouth=3), WHITE), fall(base, 0.25), fall(base, 0.55), fall(base, 0.85), fall(base, 1.0), fall(base, 1.0)])


# ================================================================== ASH WALKER (drawn, 64x64)
def ashwalker_raw(step=None, bob=0, lean=2.0, aF=(1.0, 0.6), aB=(0.7, 0.7), eyes=1, crouch=0, mouth=1, glow=1):
    """Side view facing right: a shambling ash walker - a gaunt figure caked in grey ash, cracked all over with glowing
    orange seams, ember eyes, a tattered burnt cloth round the hips, ash flaking off (glow 0..2 = how hot the seams are)."""
    p = Pic(64, 64)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.poly([(hx - 5, hy - 1), (hx + 6, hy - 1), (hx + 5, hy + 7), (hx + 2, hy + 4), (hx - 1, hy + 8), (hx - 5, hy + 5)], CHAR[2])
        cr = LAVA[1 + glow] if glow else ASHP[0]
        p.lines([(sx - 2, sy + 2), (sx + 1, sy + 6), (sx - 1, sy + 9), (hx + 1, hy - 3)], cr)
        p.lines([(sx + 3, sy + 1), (sx + 4, sy + 5)], cr)
    def head(p, K):
        x, y = K['head']
        p.l(x - 4, y - 3, x + 1, y + 1, LAVA[1 + glow] if glow else ASHP[0])
        if eyes:
            p.p(x + 3, y - 1, LAVA[3 + min(1, glow)]); p.p(x + 1, y - 1, LAVA[2])
        p.l(x + 2, y + 3, x + 5, y + 3, (20, 14, 12))
    rig(p, 30, FEET, LL=14, TL=13, HR=5, step=step, bob=bob, lean=lean, crouch=crouch, legs=(ASHP[2], ASHP[3]), leg_w=4, body=(ASHP[2], ASHP[3]),
        body_w=(5, 6), arms=(ASHP[2], ASHP[3]), arm_w=3, AL=13, aB=aB, aF=aF, skin=ASHP, hands=ASHP[3], shoes=ASHP[1],
        on_torso=torso, on_head=head)
    r2 = random.Random(400 + bob + int(lean))
    for _ in range(5):
        x, y = r2.uniform(20, 42), r2.uniform(14, FEET - 4)
        p.p(x, y, ASHP[4])
    return outline_same(p.im)


def ash_heap(k):
    q = Pic(64, 64)
    w = 10 + k * 10
    q.e(31 - w, FEET - 3 - k * 4, 31 + w, FEET + 2, ASHP[2]); q.e(31 - w + 3, FEET - 2 - k * 4, 31 + w - 4, FEET, ASHP[3])
    r2 = random.Random(5)
    for _ in range(4 + int(k * 4)):
        q.p(31 + r2.uniform(-w + 2, w - 2), FEET - r2.uniform(0, 2 + k * 3), LAVA[2])
    return outline_same(q.im)


@builder('ashwalker')
def make_ashwalker():
    A = ashwalker_raw
    save_enemy('ashwalker', 'idle', [A(bob=(0, 0, 1, 0)[i], glow=(1, 1, 2, 1)[i]) for i in range(4)])
    save_enemy('ashwalker', 'movement', [A(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=3, aF=(1.2 + 0.2 * math.sin(i / 6 * TAU), 0.5)) for i in range(6)])
    save_enemy('ashwalker', 'attack', [A(aF=(2.4, 0.5), lean=-1, glow=2), A(aF=(2.9, 0.3), lean=-2, glow=2, mouth=2), A(aF=(1.8, 0.0), lean=3, glow=2),
                                       A(aF=(1.1, 0.0), lean=5, crouch=2, glow=2), A(aF=(1.0, 0.3), lean=3, glow=1), A()])
    save_enemy('ashwalker', 'take_damage', [flash(A(lean=-2, eyes=0, glow=2), WHITE), A(lean=-1), A()])
    b = A(eyes=0, glow=0, aF=(1.6, 0.4), aB=(1.5, 0.5))
    save_enemy('ashwalker', 'death', [flash(A(lean=-2, eyes=0, glow=2), WHITE), on(ash_heap(0.2), sink(b, 6)), on(ash_heap(0.45), sink(b, 14)), on(ash_heap(0.7), sink(b, 24)),
                                      ash_heap(0.9), ash_heap(1.0)])


# ================================================================== THE BATH MASTER (drawn, 116x116)
def ladle(p, x, y, a, L=30, full=False):
    """A long bronze bath ladle held at (x, y) along a, a deep round bowl at the end (full = steaming water in it)."""
    ex, ey = pt(a, L, x, y)
    p.l(x, y, ex, ey, BR1, 3); p.l(x, y, ex, ey, BR3, 1)
    u = (math.sin(a), math.cos(a))
    bx, by = ex + u[0] * 6, ey + u[1] * 6
    p.e(bx - 7, by - 5, bx + 7, by + 5, BR1); p.e(bx - 6, by - 4, bx + 6, by + 3, BR2); p.arc(bx - 7, by - 5, bx + 7, by + 5, 200, 320, BR4)
    if full:
        p.e(bx - 5, by - 4, bx + 5, by - 1, HOTW[3])
    return bx, by


def bathmaster_frame(step=None, bob=0, lean=0.0, aF=(0.8, 0.4), aB=(0.3, 0.5), la=1.2, full=False, eyes=1, mouth=0, crouch=0, splash=None, steam=0):
    """Side view facing right: the bath master - a giant bloated man with a vast round belly, pale pink skin blotched red
    from the heat, a towel knotted round his hips, a little bald head with a laurel wreath and heavy jowls, thick arms;
    the front hand holds a long bronze ladle (la = angle, full = scalding water in it); splash = the thrown water arc
    position (x, y, size); steam 1..3 = clouds of steam rolling round him."""
    p = Pic(BS, BS)
    f = BS_FEET
    K0 = {}
    PK = ((150, 96, 90), (196, 140, 128), (226, 176, 160), (246, 206, 190))
    def far(p, K):
        K0.update(K)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.e(min(sx, hx) - 18, sy - 2, max(sx, hx) + 22, hy + 10, PK[1]); p.e(min(sx, hx) - 13, sy + 2, max(sx, hx) + 16, hy + 4, PK[2])
        p.arc(min(sx, hx) - 14, sy + 4, max(sx, hx) + 18, hy + 8, 280, 360, PK[0])
        p.e(hx + 4, hy - 6, hx + 8, hy - 3, PK[0])                                           # navel
        for x, y in ((sx - 6, sy + 10), (sx + 8, sy + 18), (hx - 4, hy - 8)):
            p.e(x - 3, y - 2, x + 3, y + 2, (200, 100, 90))
        p.poly([(hx - 16, hy + 4), (hx + 18, hy + 4), (hx + 20, hy + 20), (hx + 6, hy + 24), (hx - 6, hy + 22), (hx - 16, hy + 18)], TOGA[2])
        p.l(hx - 16, hy + 4, hx + 18, hy + 4, TOGA[3], 2); p.poly([(hx + 10, hy + 4), (hx + 16, hy + 14), (hx + 12, hy + 15)], TOGA[1])
    def head(p, K):
        x, y = K['head']
        p.e(x - 2, y + 2, x + 12, y + 14, PK[1])                                             # jowls
        p.poly([(x + 8, y - 3), (x + 13, y + 2), (x + 8, y + 3)], PK[2])
        if eyes:
            p.l(x + 5, y - 3, x + 8, y - 3, BLK[0]); p.p(x + 7, y - 2, (60, 40, 40))
        else:
            p.l(x + 5, y - 2, x + 8, y - 2, BLK[0])
        p.e(x + 5, y + 6, x + 11, y + 8 + mouth * 3, (90, 30, 30))
        for j in range(7):                                                                   # laurel wreath
            a = math.pi + j / 6 * math.pi
            p.e(x + math.cos(a) * 9 - 2, y - 2 + math.sin(a) * 8 - 1, x + math.cos(a) * 9 + 2, y - 2 + math.sin(a) * 8 + 1, (70, 120, 50))
    def front(p, K):
        x, y = K['handF']
        if la is not None:
            ladle(p, x, y, la, 30, full)
        ell(p, x, y, 4.5, 4.5, PK[2])
    rig(p, 40, f, LL=26, TL=30, HR=10, step=step, bob=bob, lean=lean, crouch=crouch, legs=(PK[1], PK[2]), leg_w=13,
        body=(PK[1], PK[2]), body_w=(16, 16), arms=(PK[1], PK[2]), arm_w=10, AL=26, aB=aB, aF=aF, skin=SKIN,
        hands=PK[2], shoes=(110, 80, 50), on_far=far, on_torso=torso, on_head=head, on_front=front)
    im = outline_same(p.im)
    q = Pic(BS, BS)
    if splash:
        sx, sy, s = splash
        for j in range(5 + s * 2):
            a = -0.6 + j * 0.25
            q.e(sx + math.cos(a) * j * 2 - 2, sy + math.sin(a) * j * 2 - 2, sx + math.cos(a) * j * 2 + 2, sy + math.sin(a) * j * 2 + 2, HOTW[3] if j % 2 else HOTW[4])
        q.e(sx - 3 * s, sy - 2 * s, sx + 3 * s, sy + 2 * s, HOTW[2])
    if steam:
        r2 = random.Random(90 + steam)
        for _ in range(4 + steam * 3):
            x, y, r = r2.uniform(14, 102), r2.uniform(40, 108), r2.uniform(5, 8 + steam * 2)
            q.e(x - r, y - r * 0.7, x + r, y + r * 0.7, STEAMC[2]); q.e(x - r + 2, y - r * 0.7 + 1, x + r - 3, y + r * 0.5, STEAMC[3])
    if splash or steam:
        qi = dither_hole(outline_same(q.im, (110, 116, 120)), 0.3 if steam else 0.0)
        im = on(im, qi)
    return im


@builder('bathmaster')
def make_bathmaster():
    R = bathmaster_frame
    save_boss('bathmaster', 'idle', [R(bob=(0, 0, 1, 1, 0)[i], la=1.2 + (0, 0.03, 0.06, 0.03, 0)[i], mouth=(0, 0, 1, 0, 0)[i]) for i in range(5)])
    save_boss('bathmaster', 'attack', [R(aF=(2.0, 0.5), la=2.6, lean=-3, full=True), R(aF=(2.4, 0.3), la=2.75, lean=-5, full=True, mouth=1, crouch=6),
                                       R(aF=(2.2, 0.0), la=2.3, lean=2, mouth=2, splash=(92, 30, 1)), R(aF=(1.6, 0.1), la=1.7, lean=4, mouth=2, splash=(94, 44, 2)),
                                       R(aF=(1.2, 0.3), la=1.3, lean=3, mouth=1, splash=(96, 60, 2)), R(aF=(0.9, 0.4), la=1.2, lean=1)])
    save_boss('bathmaster', 'cast', [R(aF=(1.4, 0.6), aB=(1.4, 0.6), mouth=1, steam=1), R(aF=(2.4, 0.4), aB=(2.4, 0.4), mouth=2, steam=2, lean=-2),
                                     R(aF=(2.8, 0.3), aB=(2.8, 0.3), mouth=3, steam=3, lean=-3), R(aF=(2.8, 0.3), aB=(2.8, 0.3), mouth=3, steam=3, lean=-3),
                                     R(aF=(2.2, 0.4), aB=(2.2, 0.4), mouth=2, steam=2), R(aF=(1.2, 0.5), aB=(1.2, 0.5), mouth=1, steam=1)])
    save_boss('bathmaster', 'hurt', [flash(R(lean=-5, eyes=0, mouth=2, la=1.6), WHITE), R(lean=-3, mouth=1, la=1.4), R(lean=-1)])
    base = R(eyes=0, mouth=2, aF=(0.4, 0.2), aB=(-0.1, 0.2), la=None)
    q = Pic(BS, BS); ladle(q, 30, BS_FEET - 6, 1.62, 28); ld = outline_same(q.im)
    fallen = lambda k: fall(base, k, 90, BS, BS_FEET)
    save_boss('bathmaster', 'death', [flash(R(lean=-5, eyes=0, mouth=3, la=1.8), WHITE), R(lean=-6, eyes=0, mouth=3, crouch=5, la=2.2, steam=1),
                                      fallen(0.3), on(ld, fallen(0.6)), on(ld, fallen(0.9)), on(ld, fallen(1.0)), on(ld, squash(fallen(1.0), 0.85, BS_FEET + 1))])


# ================================================================== THE FIRE LORD (drawn, 116x116)
def pyre_frame(step=None, bob=0, lean=0.0, aF=(0.6, 0.6), aB=(0.2, 0.6), eyes=1, mouth=0, crouch=0, glow=1, pillar=0, rain=0, ember=0.0, k=0):
    """Side view facing right: the fire lord - a towering horned demon of charred black hide split by glowing seams, a
    mane of flames streaming back from the skull, great curled ram horns, burning eyes and a fanged maw, huge clawed
    hands, digitigrade legs with hooves; pillar 1..3 = a pillar of fire bursting from the floor ahead, rain 1..2 = burning
    drops falling all round, ember 0..1 = burning down to embers (death)."""
    p = Pic(BS, BS)
    f = BS_FEET
    K0 = {}
    seam = LAVA[1 + glow]
    def far(p, K):
        K0.update(K)
        x, y = K['head']
        flames(p, x - 8, y + 4, 8, 24 + glow * 6, 30 + k, 9, -1.3)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.e(min(sx, hx) - 13, sy - 3, max(sx, hx) + 13, hy + 4, CHAR[2]); p.e(min(sx, hx) - 9, sy, max(sx, hx) + 9, hy, CHAR[3])
        p.lines([(sx - 6, sy + 2), (sx - 2, sy + 10), (sx - 5, sy + 18), (hx, hy - 2)], seam, 2)
        p.lines([(sx + 6, sy + 4), (sx + 3, sy + 12), (sx + 7, sy + 20)], seam)
        p.r(hx - 12, hy - 2, hx + 12, hy + 3, CHAR[0]); p.e(hx - 3, hy - 3, hx + 3, hy + 4, BONE[3])        # belt with a skull
        p.p(hx - 1, hy, BLK[0]); p.p(hx + 1, hy, BLK[0])
    def head(p, K):
        x, y = K['head']
        p.e(x - 8, y - 9, x + 10, y + 10, CHAR[2]); p.poly([(x + 4, y - 2), (x + 15, y + 3), (x + 12, y + 10), (x + 2, y + 9)], CHAR[2])
        p.lines([(x - 2, y - 7), (x - 8, y - 16), (x - 18, y - 18), (x - 24, y - 12), (x - 22, y - 5), (x - 17, y - 6)], BONE[2], 5)   # curled ram horn
        p.lines([(x - 2, y - 7), (x - 8, y - 16), (x - 18, y - 18), (x - 24, y - 12), (x - 22, y - 5), (x - 17, y - 6)], BONE[3], 2)
        p.lines([(x + 4, y - 8), (x + 8, y - 17), (x + 16, y - 22), (x + 20, y - 18)], BONE[3], 4); p.p(x + 20, y - 18, BONE[4])
        p.l(x + 4, y + 6, x + 14, y + 4 + mouth * 2, LAVA[2], 2 + mouth)
        for j in range(4):
            p.p(x + 5 + j * 2.5, y + 5, BONE[4]); p.p(x + 6 + j * 2.5, y + 7 + mouth * 2, BONE[4])
        if eyes:
            p.poly([(x + 4, y - 3), (x + 11, y - 2), (x + 5, y)], LAVA[4])
        else:
            p.l(x + 4, y - 2, x + 11, y - 2, BLK[0], 2)
    def front(p, K):
        x, y = K['handF']
        ell(p, x, y, 5, 5, CHAR[2])
        for j in range(3):
            p.l(x + 2, y - 2 + j * 2, x + 7, y - 4 + j * 3, BONE[3])
    rig(p, 44, f, LL=34, TL=30, HR=11, step=step, bob=bob, lean=lean, crouch=crouch, legs=(CHAR[2], CHAR[3]), leg_w=14,
        body=(CHAR[2], CHAR[3]), body_w=(19, 19), arms=(CHAR[2], CHAR[3]), arm_w=11, AL=28, aB=aB, aF=aF, skin=CHAR,
        hands=CHAR[2], shoes=CHAR[0], on_far=far, on_torso=torso, on_head=head, on_front=front)
    for fx, fy in K0['feet']:
        p.poly([(fx - 4, f - 6), (fx + 6, f - 6), (fx + 7, f), (fx - 4, f)], BLK[1])
    bx, by = K0['handB']
    ell(p, bx, by, 4.5, 4.5, CHAR[1])
    im = outline_same(p.im)
    q = Pic(BS, BS)
    if pillar:
        x0 = 90
        hgt = 20 + pillar * 25
        for j in range(4 + pillar * 2):
            flame(q, x0 + (j % 3 - 1) * 4, f, hgt * (0.6 + 0.4 * ((j * 7) % 5) / 4), (j % 3 - 1) * 0.2, 1.4)
    if rain:
        r2 = random.Random(55 + rain + k)
        for _ in range(6 + rain * 5):
            x, y = r2.uniform(8, 108), r2.uniform(12, 100)
            q.l(x, y, x - 2, y - 6, LAVA[2], 2); q.p(x, y, LAVA[4])
    if pillar or rain:
        im = on(im, q.im)
    if ember:
        im = dither_hole(im, ember * 0.8, k)
        e = Pic(BS, BS)
        r2 = random.Random(9)
        w = 18 + ember * 22
        e.e(44 - w, f - 4 - ember * 6, 44 + w, f + 2, CHAR[1]); e.e(44 - w + 4, f - 3 - ember * 6, 44 + w - 5, f, CHAR[2])
        for _ in range(int(10 + ember * 20)):
            e.p(44 + r2.uniform(-w + 3, w - 3), f - r2.uniform(0, 3 + ember * 5), LAVA[r2.randrange(2, 5)])
        im = on(im, outline_same(e.im))
    return im


@builder('pyrelord')
def make_pyrelord():
    R = pyre_frame
    save_boss('pyrelord', 'idle', [R(bob=(0, 0, 1, 1, 0)[i], k=i, glow=(1, 1, 2, 1, 1)[i]) for i in range(5)])
    save_boss('pyrelord', 'attack', [R(aF=(2.4, 0.4), lean=-3, k=0, glow=2, mouth=1), R(aF=(2.9, 0.3), lean=-5, k=1, glow=2, mouth=2),
                                     R(aF=(1.6, 0.0), lean=3, crouch=3, k=2, glow=2, mouth=2, pillar=1), R(aF=(1.2, 0.1), lean=4, crouch=4, k=3, glow=2, mouth=1, pillar=2),
                                     R(aF=(1.0, 0.3), lean=3, crouch=2, k=4, glow=1, pillar=3), R(aF=(0.7, 0.5), lean=1, k=0, glow=1)])
    save_boss('pyrelord', 'cast', [R(aF=(2.0, 0.6), aB=(2.0, 0.6), k=0, glow=2, mouth=1), R(aF=(2.7, 0.4), aB=(2.7, 0.4), k=1, glow=2, mouth=2, rain=1, lean=-2),
                                   R(aF=(2.9, 0.3), aB=(2.9, 0.3), k=2, glow=3 - 1, mouth=3, rain=2, lean=-3), R(aF=(2.9, 0.3), aB=(2.9, 0.3), k=3, glow=2, mouth=3, rain=2, lean=-3),
                                   R(aF=(2.4, 0.4), aB=(2.4, 0.4), k=4, glow=2, mouth=2, rain=1), R(aF=(1.6, 0.6), aB=(1.6, 0.6), k=0, glow=1, mouth=1)])
    save_boss('pyrelord', 'hurt', [flash(R(lean=-5, eyes=0, mouth=2, k=1), WHITE), R(lean=-3, mouth=1, k=2), R(lean=-1, k=3)])
    save_boss('pyrelord', 'death', [flash(R(lean=-5, eyes=0, mouth=3, k=0), WHITE), R(lean=-7, eyes=0, mouth=3, crouch=6, k=1, glow=2),
                                    R(eyes=0, mouth=3, crouch=12, k=2, ember=0.25), R(eyes=0, crouch=20, k=3, ember=0.5), R(eyes=0, crouch=26, k=0, ember=0.75),
                                    R(eyes=0, crouch=30, k=1, ember=0.95), R(eyes=0, crouch=30, k=2, ember=1.0)])


# ================================================================== PROPS
def bathstatue():
    """A marble statue of a bather pouring from an amphora on a moulded plinth, worn and streaked."""
    p = Pic(36, 64)
    p.r(5, 50, 30, 63, MARB[2]); p.r(3, 48, 32, 51, MARB[3]); p.l(3, 48, 32, 48, MARB[4]); p.r(3, 61, 32, 63, MARB[1])
    rig(p, 17, 48, LL=13, TL=12, HR=4.5, lean=1, legs=(MARB[2], MARB[3]), leg_w=4, body=(MARB[2], MARB[3]), body_w=(5, 6),
        arms=(MARB[2], MARB[3]), arm_w=3, AL=12, aB=(2.6, 0.6), aF=(2.2, 1.6), skin=MARB, hands=MARB[3], shoes=MARB[2])
    p.e(20, 6, 28, 15, MARB[2]); p.l(23, 15, 25, 18, MARB[1], 2)                                      # the amphora on the shoulder
    p.poly([(9, 38), (27, 38), (25, 46), (11, 46)], MARB[3])                                            # drapery
    p.l(14, 20, 13, 46, VEIN[1]); p.l(22, 30, 23, 47, VEIN[0])
    return outline_same(p.im)


def bathfountain(k):
    """A round marble fountain basin with a fluted central pillar and a bronze fish spout; water arcs into the basin
    (2 frames, the jets and drops move)."""
    p = Pic(48, 48)
    p.e(2, 32, 45, 46, MARB[1]); p.e(3, 30, 44, 42, MARB[3]); p.e(6, 32, 41, 40, COLDW[2]); p.arc(6, 32, 41, 40, 200, 340, COLDW[4])
    p.r(20, 14, 27, 36, MARB[2]); p.l(22, 14, 22, 36, MARB[1]); p.l(25, 14, 25, 36, MARB[4]); p.r(18, 12, 29, 15, MARB[3])
    p.e(19, 5, 28, 13, BR2); p.poly([(27, 7), (31, 5), (31, 11)], BR1); p.p(21, 8, BLK[0])
    for s in (-1, 1):
        pts = [(23.5 + s * (2 + j * 3), 9 - math.sin(j / 5 * math.pi) * 5 + j * 4 + k) for j in range(6)]
        p.lines(pts, COLDW[3], 2); p.lines(pts, COLDW[4])
    r2 = random.Random(10 + k)
    for _ in range(5):
        p.p(r2.uniform(8, 40), r2.uniform(28, 36), COLDW[4])
    return outline_same(p.im)


def bathbench():
    """A marble bench on two lion-foot legs with folded towels and a bronze strigil."""
    p = Pic(48, 30)
    p.r(2, 12, 45, 17, MARB[3]); p.l(2, 12, 45, 12, MARB[4]); p.r(2, 17, 45, 18, MARB[1])
    for x in (5, 38):
        p.r(x, 18, x + 5, 28, MARB[2]); p.e(x - 1, 25, x + 6, 29, MARB[2])
    p.r(8, 5, 20, 11, TOGA[2]); p.l(8, 8, 20, 8, TOGA[1]); p.r(10, 1, 19, 5, (150, 60, 50)); p.l(10, 3, 19, 3, (120, 40, 34))
    p.arc(28, 6, 38, 14, 180, 330, BR3, 2)
    return outline_same(p.im)


def chainedsoul(k):
    """A chained soul (32x64): a gaunt grey-blue naked figure hanging by the wrists from two chains, head thrown back and
    mouth open in a wail, legs dangling, ghostly blue glow (2 frames, it sways)."""
    p = Pic(32, 64)
    sw = (-1.5, 1.5)[k]
    GH = ((70, 80, 96), (110, 122, 140), (150, 162, 176), (196, 206, 216))
    for x0 in (8, 24):
        for j in range(8):
            p.e(x0 + sw * j / 8 - 1, j * 3, x0 + sw * j / 8 + 1, j * 3 + 3, I2 if j % 2 else I1)
    hx, hy = 16 + sw, 24
    p.l(8 + sw, 24, hx - 3, hy + 6, GH[2], 2); p.l(24 + sw, 24, hx + 3, hy + 6, GH[2], 2)
    p.e(8 + sw - 2, 22, 8 + sw + 2, 26, I1); p.e(24 + sw - 2, 22, 24 + sw + 2, 26, I1)
    p.e(hx - 4, hy, hx + 4, hy + 7, GH[2]); p.e(hx - 2.5, hy + 3, hx - 0.5, hy + 4, BLK[0]); p.e(hx + 0.5, hy + 3, hx + 2.5, hy + 4, BLK[0]); p.e(hx - 1, hy + 5, hx + 1, hy + 7, (20, 20, 30))
    p.r(hx - 4, hy + 8, hx + 4, hy + 24, GH[1]); p.l(hx - 2, hy + 10, hx + 2, hy + 10, GH[0]); p.l(hx - 2, hy + 13, hx + 2, hy + 13, GH[0])
    p.l(hx - 2, hy + 24, hx - 3 - sw * 0.5, hy + 38, GH[1], 3); p.l(hx + 2, hy + 24, hx + 2 - sw * 0.5, hy + 38, GH[2], 3)
    p.r(hx - 4, hy + 20, hx + 4, hy + 25, (60, 50, 44))
    return outline_same(p.im)


def bonepillar():
    """A pillar of skulls and long bones stacked on a bone base, a few candle stubs burning on top."""
    p = Pic(30, 64)
    p.r(3, 56, 26, 63, BONE[1]); p.l(3, 56, 26, 56, BONE[3])
    r2 = random.Random(31)
    for row in range(8):
        y = 52 - row * 6
        for j in range(3):
            x = 7 + j * 8 + (row % 2) * 2 - 1
            p.e(x - 3.5, y - 3, x + 3.5, y + 2, BONE[3 if j != 1 else 2]); p.p(x - 1, y - 1, BLK[0]); p.p(x + 1, y - 1, BLK[0]); p.p(x, y + 1, BLK[1])
            p.p(x - 2, y - 2, BONE[4])
    for x in (9, 19):
        p.r(x, 2, x + 2, 8, (200, 190, 160)); flame(p, x + 1, 2, 4, 0, 0.6)
    return outline_same(p.im)


def brimpot(k):
    """A squat iron cauldron on three legs full of bubbling yellow brimstone with blue-yellow sulphur flames (2 frames)."""
    p = Pic(40, 44)
    for x in (8, 20, 32):
        p.l(x, 34, x - 2 + (x - 20) * 0.2, 43, I1, 2)
    p.e(3, 18, 37, 40, I0); p.e(5, 19, 35, 36, I1); p.arc(5, 19, 35, 36, 200, 300, I2)
    p.e(4, 16, 36, 24, I2); p.e(6, 17, 34, 23, BRIM[2]); p.e(9, 18, 31, 22, BRIM[3])
    r2 = random.Random(70 + k)
    for _ in range(4):
        x = r2.uniform(10, 30)
        p.e(x - 1.5, 18 + k, x + 1.5, 21 + k, BRIM[4])
    for j, x in enumerate((12, 20, 28)):
        flame(p, x, 18, 8 + ((j + k) % 2) * 4, (j - 1) * 0.3, 1.0, (BRIM[2], BRIM[3], (160, 200, 230), WHITE))
    return outline_same(p.im)


@builder('props')
def make_props():
    save_prop('bathstatue', [bathstatue()])
    save_prop('bathfountain', [bathfountain(k) for k in range(2)], 48, 48)
    save_prop('bathbench', [bathbench()])
    save_prop('chainedsoul', [chainedsoul(k) for k in range(2)], 32, 64)
    save_prop('bonepillar', [bonepillar()])
    save_prop('brimpot', [brimpot(k) for k in range(2)], 40, 44)


# ================================================================== ITEMS, PARTICLES AND ICONS
def trident_pick():
    p = Pic(56, 20)
    p.l(1, 12, 40, 10, (78, 52, 32), 3); p.l(1, 11, 40, 9, (110, 76, 46))
    for x in (8, 26):
        p.l(x, 9, x, 13, BR3, 1)
    p.r(40, 7, 43, 13, BR2); p.l(44, 3, 44, 17, BR2, 2)
    for y, L in ((4, 8), (10, 11), (16, 8)):
        p.l(45, y, 45 + L, y, I3, 2); p.poly([(45 + L, y - 2), (48 + L, y), (45 + L, y + 2)], I3)
    return outline_same(p.im)


def mortar_pick():
    p = Pic(40, 26)
    p.poly([(1, 18), (12, 14), (16, 16), (16, 22), (4, 24)], (90, 56, 34)); p.l(1, 18, 12, 14, (120, 76, 46))
    p.r(14, 8, 30, 20, (40, 42, 48)); p.l(14, 8, 30, 8, (80, 84, 92)); p.e(10, 8, 20, 20, (50, 52, 58))
    p.poly([(30, 6), (36, 3), (36, 25), (30, 22)], (56, 58, 66)); p.l(36, 3, 36, 25, BR3, 2)
    for x in (18, 26):
        p.l(x, 8, x, 20, BR1, 2)
    p.e(32, 9, 38, 17, BRIM[3]); p.p(34, 11, BRIM[4]); flame(p, 35, 9, 5, 0.2, 0.7)
    return outline_same(p.im)


def brim_lump():
    p = Pic(18, 16)
    p.poly([(2, 12), (3, 6), (7, 3), (12, 3), (16, 7), (15, 13), (9, 15)], BRIM[2]); p.poly([(4, 8), (7, 5), (11, 5), (9, 9), (5, 11)], BRIM[3])
    p.p(7, 6, BRIM[4]); p.p(12, 10, BRIM[1]); p.l(5, 13, 13, 12, BRIM[1])
    flame(p, 10, 4, 5, 0.3, 0.6, (BRIM[2], BRIM[3], (160, 200, 230), WHITE))
    return outline_same(p.im)


@builder('items')
def make_items():
    for name, im in (('pick_trident', trident_pick()), ('pick_brimstone', mortar_pick()), ('item_brimstone', brim_lump())):
        save(hard(im.crop(im.getbbox())), G_OUT + name + '.png')


@builder('particles')
def make_particles():
    fr = []                                                                   # a puff of bath steam (2 frames 10x10)
    for k in range(2):
        p = Pic(10, 10)
        r = 3 + k
        p.e(5 - r, 5 - r, 5 + r - 1, 5 + r - 1, STEAMC[1]); p.e(5 - r + 1, 5 - r, 5 + r - 2, 5 + r - 3, STEAMC[3])
        fr.append(dither_hole(p.im, 0.25 * (k + 1), k))
    save(cells(fr, 10, 10), G_OUT + 'part_steam3.png', 2)
    fr = []                                                                   # ash flakes with a live ember (2 frames 8x8)
    for k in range(2):
        p = Pic(8, 8)
        r2 = random.Random(800 + k)
        for j in range(4):
            x, y = r2.randrange(0, 7), r2.randrange(0, 7)
            p.p(x, y, ASHP[3 + j % 2]); p.p(x + 1, y, ASHP[2])
        p.p(3 + k, 4 - k, LAVA[3])
        fr.append(p.im)
    save(cells(fr, 8, 8), G_OUT + 'part_ash2.png', 2)
    fr = []                                                                   # a burning brimstone glob (2 frames 8x8: flying, splashing)
    for k in range(2):
        p = Pic(8, 8)
        if k == 0:
            shade_ball(p, 3.5, 4, 2.5, (BRIM[1], BRIM[2], BRIM[3], BRIM[4])); p.p(1, 1, LAVA[3]); p.p(5, 0, LAVA[2])
        else:
            p.e(0, 5, 7, 7, BRIM[2]); p.p(1, 3, BRIM[3]); p.p(6, 2, BRIM[3]); p.p(3, 4, BRIM[4])
        fr.append(p.im)
    save(cells(fr, 8, 8), G_OUT + 'part_brimstone.png', 2)


@builder('icons')
def make_icons():
    p = Pic(8, 8)                                                             # HUD: scalded (steam over a wave)
    p.bitmap(0, 0, [".#..#...", "#..#..#.", ".#..#.#.", "........", "........", ".##..##.", "#..##..#", "........"], {'#': WHITE})
    save(p.im, G_OUT + 'icon_scald.png')
    p = Pic(8, 8)                                                             # HUD: pulled by the fire stream (arrows)
    p.bitmap(0, 0, ["........", "#...#...", ".#...#..", "..#...#.", ".#...#..", "#...#...", "........", "........"], {'#': WHITE})
    save(p.im, G_OUT + 'icon_stream.png')


# ================================================================== CONTACT SHEET AND CHECKS
NEW_WEAPONS = ('trident', 'brimstone')


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
    for sh in ('attendant', 'steamghost', 'gladiator', 'moldcrawler', 'fireimp', 'lostsoul', 'fleshbrute', 'ashwalker'):
        have = [st for st in ('idle', 'movement', 'attack', 'take_damage', 'death') if G_OUT + f'enemies-{sh}_{st}.png' in man]
        if have and len(have) != 5:
            print('INCOMPLETE ENEMY SET:', sh, have)
    for b in ('bathmaster', 'pyrelord'):
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
    out.save(SCR + 'v22_tiles.png')


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
