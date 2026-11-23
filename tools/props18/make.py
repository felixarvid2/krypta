#!/usr/bin/env python3
"""Version 21 graphics for Krypta ("Järnfängelset och Fiskeläget"): the iron prison and the fog-bound fishing harbour,
eight new enemies, the executioner and the tide priest, textures, props, items, particles and HUD icons.

Run from anywhere (the paths are taken from this file's place in the repo):
    python3 -B tools/props18/make.py [name ...]
(with names only those builders run, e.g. `python3 -B tools/props18/make.py convict sheet`; the contact sheet always shows
everything this script has written so far, plus the two new first-person weapons)

The first-person weapons flail / blunderbuss (fp_*.png, js/weapons.js) come from tools/weapon-frames (render-static.mjs +
pack.py + pixelstyle.py); their definitions are built by tools/props18/fp_defs.py (see there), the unstyled packed strips
are kept in tools/props18/fp_orig/ (pixelstyle.py must always run from an unstyled picture).

Sheet names: the contract's jailer / hound / crab already exist as older enemies (FÅNGVAKTARE, HELVETESHUND, JÄTTEKRABBA),
so the new sheets are called turnkey (jailer), watchdog (hound), shorecrab (crab) and drownedfisher (drowned); convict,
torturer, fishman and gulls keep their names. Nothing that exists is overwritten (save() asserts it).

Out to assets/gfx (all enemy cells 64x64, feet row 57, facing right; frames idle 4, movement 6, attack 6, take_damage 3,
death 6; every death ends lying / settled on the floor, flyers included):
  enemies-turnkey_*        a prison guard in a dark blue-grey greatcoat with brass buttons and a peaked cap, a lit lantern
                           in the back hand and a club in the front hand; attack = the overhead club blow (frame 0 has
                           the whistle at the mouth)
  enemies-convict_*        a shaven convict in grey-and-black striped prison clothes with an iron shackle round the ankle;
                           he swings a heavy iron ball on its chain; attack = the wide sweep of the ball round him
  enemies-torturer_*       a fat torturer in a black hood with eye holes, bare arms, a leather apron; long tongs with a
                           glowing iron in the front hand; attack = he throws the hot iron (the tongs come back empty)
  enemies-watchdog_*       a lean black-and-tan prison hound (low, about 22 px high) with a spiked collar; attack = the
                           lunge with open jaws
  enemies-drownedfisher_*  a bloated blue-grey drowned fisherman in a torn yellow oilskin and sou'wester, dripping, with a
                           long harpoon; attack = the long thrust forward
  enemies-fishman_*        a hunched green-scaled fish man with a fish head (a big yellow eye, a wide mouth), a dorsal fin
                           and webbed claws; attack = the leap (crouch, airborne, claws forward, landing)
  enemies-shorecrab_*      a big armoured shore crab (dark red shell, side view, about 40 px wide) with two big claws;
                           attack = the claws rise and snap; death flips it on its back
  enemies-gulls_*          a flock of three herring gulls (drawn low - the game lifts flyers); attack = the front gull
                           dives with its beak; death = feathers and the gulls lying on the floor
  boss_executioner_{idle,attack,cast,hurt,death}.png, boss_tidepriest_{...}.png (116x116 cells, feet row 115; idle 5,
      attack 6, cast 6, hurt 3, death 7; attack and cast loop while the state lasts).
      The executioner (a giant in a black hood with eye slits, a bare scarred chest with leather straps, a leather apron
      and boots, a huge executioner's axe): attack = the axe heaved overhead and chopped into the floor (stone chips fly -
      the chop wave), cast = the chain hook thrown from the back hand and hauled in; death = he topples backwards.
      The tide priest (a fish-headed priest in a ragged sea-green mantle with a hood, barnacles and seaweed, holding a
      staff topped with a big spiral shell): attack = the staff swept forward with a wave splash, cast = the staff raised,
      the shell glows sea-green and water rises round his feet; death = he falls and melts into a puddle of brine.
  prop_hangcage.png (2: hanging from the ceiling chain / fallen and burst open on the floor, 32x64 cells), prop_rack.png
  (1), prop_gallows.png (2, the noose sways), prop_harborlamp.png (2, the flame flickers), prop_fishbarrel.png (2: whole /
  broken with fish spilled), prop_anchor.png (1), pick_scrap.png = item_scrap.png (a sack of scrap), pick_flail.png,
  pick_blunderbuss.png, part_scrap.png (2, 8x8), part_brine.png (2, 8x8: a drip / a splash), part_hotiron.png (2, 8x8: a
  glowing iron bar turning), icon_net.png, icon_alarm.png (8x8, white)
Out to assets/wall:
  wall_prisonstone, wall_cellbars, wall_boss_executioner, wall_shack, wall_quay, wall_boss_tidepriest (64x128)
  floor_prison, floor_straw, floor_boss_executioner, floor_dock, floor_cobble, floor_boss_tidepriest, floor_alarmplate,
  floor_net (64x64); all palettized, mean brightness checked to stay in 40-115
Contact sheets: <scratchpad>/en/v21_sheet.png, seam check <scratchpad>/en/v21_tiles.png

Sources: everything is drawn procedurally below in the outlined style of tools/props2-props17, whose drawing helpers are
reused (no outside image is used).
Suggested sizes (skeleton = 1.0; bbox_report() prints the idle boxes): turnkey 1.0, convict 1.0, torturer 1.1,
watchdog 0.8 (low), drownedfisher 1.05, fishman 1.0, shorecrab 0.75, gulls 0.7 (float); bosses (116 px cells):
executioner 4.2, tidepriest 4.2.
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


P17 = _load('props17make', 'props17')          # loads props2-props16 itself; only pure drawing helpers are used
P16 = P17.P16
for _k in ('Pic outline outline_same hard shift gmap blend tint shear squash strip cut_below pool pnoise spark dark flash tube '
           'bez puff flame halo put dust wrap_pic poly_r ell shade_ball on cells rig fall pt stops stone_rgb x2 plank_v plank_h '
           'I0 I1 I2 I3 F0 F1 F2 F3 AU0 AU1 AU2 AU3 AU4 BR0 BR1 BR2 BR3 BR4 WD0 WD1 WD2 WD3 WD4 SKIN BLK RUST SLG SLIME PINK '
           'flipv ground_it brick_rgb wet_base pipe_h pipe_v').split():
    globals()[_k] = getattr(P17, _k)
sink, helmet = P16.sink, P16.helmet

G_OUT, W_OUT = ROOT + '/assets/gfx/', ROOT + '/assets/wall/'
SCR = '/tmp/claude-0/-home-user/80ee56ba-2fa6-5354-b261-a4ca4fdcb508/scratchpad/en/'
SHEET, MANIFEST = SCR + 'v21_sheet.png', SCR + 'v21_manifest.json'
WHITE = (255, 255, 255)
FW, FEET = 64, 57                                       # enemy cells
BS, BS_FEET = 116, 115                                  # boss cells
TAU = math.tau

# ---------------------------------------------------------------- prison palettes
PST = ((26, 26, 30), (46, 46, 50), (68, 66, 68), (92, 90, 88), (120, 116, 108))            # damp prison stone
STRAW = ((64, 50, 22), (104, 84, 38), (144, 120, 58), (182, 160, 90))
DIRT = ((30, 24, 18), (52, 42, 32), (76, 62, 46), (100, 84, 62))
COAT = ((22, 26, 36), (36, 42, 58), (54, 62, 82), (78, 88, 110))                           # the guard's greatcoat
STRIPE = ((36, 36, 40), (130, 128, 118), (176, 174, 162))
LEATH = ((34, 22, 16), (58, 38, 26), (86, 58, 38), (118, 84, 56))
HOOD = ((14, 12, 14), (30, 26, 30), (48, 42, 48))
BLOOD = ((70, 10, 10), (110, 18, 16), (150, 30, 24))
DOG = ((20, 16, 14), (40, 32, 26), (66, 50, 38), (120, 78, 42), (160, 110, 64))
GLOW = ((180, 60, 10), (240, 120, 30), (255, 200, 90), (255, 246, 200))                   # hot iron / lantern light
# ---------------------------------------------------------------- harbour palettes
QST = ((28, 32, 38), (46, 52, 58), (68, 74, 80), (92, 98, 102), (120, 124, 126))           # blue-grey quay stone
SHK = ((34, 30, 28), (58, 52, 46), (84, 76, 66), (110, 100, 86), (138, 128, 110))          # weathered shack planks
DOCKW = ((40, 30, 22), (66, 50, 36), (92, 72, 50), (118, 94, 66), (146, 120, 86))          # dock planks
SEA = ((6, 14, 20), (12, 26, 34), (20, 40, 50), (34, 60, 70), (60, 92, 100))               # dark harbour water
WEED = ((14, 26, 16), (26, 44, 26), (42, 66, 38), (66, 92, 52))
ROPE = ((70, 58, 38), (108, 92, 62), (146, 128, 90), (184, 168, 126))
OIL = ((86, 70, 14), (138, 116, 28), (184, 160, 52), (222, 204, 104))                      # yellow oilskin
DRN = ((52, 66, 72), (82, 100, 106), (118, 136, 138), (160, 174, 172))                      # drowned skin
FISH = ((16, 38, 34), (28, 64, 54), (48, 96, 78), (80, 134, 106), (130, 180, 146))         # fish-man scales
FBELLY = ((120, 130, 100), (164, 172, 138), (204, 208, 176))
CRAB = ((60, 16, 12), (104, 34, 22), (150, 60, 36), (196, 100, 62), (226, 150, 108))
GULL = ((86, 90, 98), (130, 134, 142), (184, 186, 192), (226, 228, 230), (250, 250, 250))
ROBE = ((18, 34, 34), (30, 52, 50), (46, 74, 68), (68, 100, 88))
SHELL = ((120, 80, 70), (176, 126, 108), (220, 178, 150), (248, 226, 204))
TEAL = ((20, 110, 100), (40, 170, 150), (120, 230, 200), (220, 255, 240))

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


# ================================================================== PRISON TEXTURES
def damp(rgb, seed, n=7, k=0.35):
    """Dark damp streaks running down from the joints (half-res array)."""
    h, w = rgb.shape[:2]
    r2 = random.Random(seed)
    for _ in range(n):
        x = r2.randrange(w)
        y0 = r2.randrange(h // 2)
        L = r2.randint(8, 26)
        for y in range(y0, min(h, y0 + L)):
            t = 1 - (y - y0) / L
            rgb[y, x] = rgb[y, x] * (1 - k * t)


def prison_rgb(w, h, seed, moss=0.12):
    rgb = stone_rgb(w, h, seed, 16, 8, 0.0, PST)
    nz = pnoise(w, h, seed + 3, ((16, 1.0), (4, 0.5)))
    m = nz > 0.8
    rgb[m] = rgb[m] * 0.55 + np.array(WEED[1]) * 0.45
    damp(rgb, seed + 4)
    return rgb


def tex_wall_prisonstone():
    """Damp prison masonry: big grey blocks, dark damp streaks, a little green rot in the joints, an iron wall ring with a
    short hanging chain, a dark wet foot."""
    w, h = 32, 64
    rgb = prison_rgb(w, h, 2201)
    p = Pic(w, h)
    p.r(14, 20, 18, 22, I1); p.p(16, 19, I3)                                   # ring bracket
    p.e(13, 22, 19, 28, I1); p.e(14, 23, 18, 27, (0, 0, 0, 0))
    for j in range(4):
        y = 29 + j * 3
        p.e(15, y, 17, y + 3, I2 if j % 2 else I1)
    put(rgb, outline_same(p.im))
    for y in range(56, 64):
        rgb[y] = rgb[y] * (1 - 0.4 * (y - 55) / 8) + np.array(WEED[0]) * 0.4 * (y - 55) / 8
    finish(rgb, 'wall_prisonstone.png', 40)


def tex_wall_cellbars():
    """A cell front: a stone lintel and stone jambs, a dark cell behind (a straw pallet, a bucket and a chain on the back
    wall in the gloom) and heavy iron bars with two cross rails and rivets in front."""
    w, h = 32, 64
    rgb = prison_rgb(w, h, 2211)
    cell = (slice(8, 64), slice(2, 30))
    back = prison_rgb(w, h, 2212) * 0.32
    rgb[cell] = back[cell]
    rgb[54:64, 2:30] = rgb[54:64, 2:30] * 0.6 + np.array(STRAW[1]) * 0.25          # straw on the cell floor
    p = Pic(w, h)
    p.r(4, 50, 15, 55, (60, 50, 28)); p.l(4, 50, 15, 50, (90, 74, 40))            # pallet
    p.r(21, 50, 26, 56, (44, 34, 24)); p.l(21, 50, 26, 50, (70, 56, 40))          # bucket
    for j in range(5):
        p.p(24, 18 + j * 3, (54, 54, 58)); p.p(25, 19 + j * 3, (40, 40, 44))
    put(rgb, p.im)
    rgb[6:9, :] = np.array(PST[1]); rgb[6, :] = PST[3]; rgb[8, :] = PST[0]       # lintel edge
    for x in range(3, 30, 4):                                                   # bars
        rgb[8:64, x] = I1; rgb[8:64, x + 1] = I0
        rgb[8:64, x - 1] = rgb[8:64, x - 1] * 0.6
        for y in range(10, 64, 9):
            rgb[y, x] = I2
    for y in (22, 46):                                                          # cross rails with rivets
        rgb[y:y + 2, 1:31] = I1; rgb[y, 1:31] = I2; rgb[y + 2, 1:31] = I0
        for x in range(3, 30, 4):
            rgb[y, x] = I3
    rgb[8:64, 0:2] = prison_rgb(w, h, 2213)[8:64, 0:2] * 0.9
    rgb[8:64, 30:32] = prison_rgb(w, h, 2213)[8:64, 30:32] * 0.9
    rust = pnoise(w, h, 2214, ((4, 1.0),)) > 0.72
    m = rust & (np.abs(rgb - np.array(I1)).sum(-1) < 30)
    rgb[m] = np.array(RUST[2])
    finish(rgb, 'wall_cellbars.png', 40)


def tex_wall_boss_executioner():
    """The executioner's wall: prison stone round a dark red banner with a black executioner's axe and block sign,
    shackles on chains both sides and old blood running down to the floor."""
    w, h = 64, 128
    rgb = x2(prison_rgb(32, 64, 2221))
    p = Pic(w, h)
    p.r(16, 10, 47, 92, BLOOD[0]); p.r(18, 12, 45, 90, BLOOD[1]); p.l(18, 12, 45, 12, BLOOD[2])
    p.poly([(16, 92), (24, 100), (31.5, 92), (39, 100), (47, 92)], BLOOD[0])    # swallow tail
    p.r(14, 8, 49, 10, WD1); p.p(14, 9, I3); p.p(49, 9, I3)                    # the rod
    p.r(22, 66, 41, 74, (20, 14, 12)); p.l(22, 66, 41, 66, (50, 36, 28))         # the block
    p.l(31.5, 22, 31.5, 66, (24, 18, 16), 3)                                      # the axe haft
    p.poly([(31, 24), (44, 18), (48, 30), (44, 42), (31, 36)], (24, 22, 26))      # the axe head
    p.l(44, 18, 48, 30, (120, 120, 130)); p.l(48, 30, 44, 42, (120, 120, 130))
    for sx in (6, 57):
        for j in range(8):
            p.e(sx - 1, 14 + j * 5, sx + 1, 18 + j * 5, I2 if j % 2 else I1)
        p.e(sx - 4, 56, sx + 4, 63, I1); p.e(sx - 2, 58, sx + 2, 61, (0, 0, 0, 0))
    put(rgb, outline_same(p.im))
    r2 = random.Random(2222)
    for _ in range(6):
        x = r2.randrange(4, 60); y0 = r2.randrange(70, 100)
        for y in range(y0, 128):
            rgb[y, x] = rgb[y, x] * 0.4 + np.array(BLOOD[0]) * 0.6
    rgb[112:] = rgb[112:] * 0.75
    finish(rgb, 'wall_boss_executioner.png', 64, half=False)


def flagstones(seed, pal=PST, dirt=0.25):
    w = h = 32
    rgb = stone_rgb(w, h, seed, 16, 10, 0.0, pal)
    nz = pnoise(w, h, seed + 3, ((16, 1.0), (8, 0.5)))
    m = nz > 1 - dirt
    rgb[m] = rgb[m] * 0.6 + np.array(DIRT[1]) * 0.4
    return rgb


def tex_floor_prison():
    finish(flagstones(2231), 'floor_prison.png', 32)


def straw_pic(seed, n=140):
    def fn(p, ox, oy):
        r2 = random.Random(seed)
        for _ in range(n):
            x, y = r2.uniform(0, 64) + ox, r2.uniform(0, 64) + oy
            a = r2.uniform(-0.6, 0.6) + (math.pi / 2 if r2.random() < 0.3 else 0)
            L = r2.uniform(4, 10)
            p.l(x, y, x + math.cos(a) * L, y + math.sin(a) * L, STRAW[r2.randrange(0, 4)])
    return wrap_pic(64, 64, fn)


def tex_floor_straw():
    rgb = x2(flagstones(2241, dirt=0.5)) * 0.8
    put(rgb, straw_pic(2242))
    finish(rgb, 'floor_straw.png', 40, half=False)


def tex_floor_boss_executioner():
    """The centre of the executioner's yard: flagstones round a round iron drain, a big dark blood stain and axe scars."""
    rgb = x2(flagstones(2251, dirt=0.3))
    yy, xx = np.mgrid[0:64, 0:64]
    nz = pnoise(64, 64, 2252, ((16, 1.0), (8, 0.5)))
    st = (np.hypot(xx - 31.5, yy - 31.5) + (nz - 0.5) * 18) < 22
    rgb[st] = rgb[st] * 0.45 + np.array(BLOOD[0]) * 0.55
    p = Pic(64, 64)
    p.e(24, 24, 39, 39, I0); p.e(25, 25, 38, 38, I1)
    for j in range(-2, 3):
        p.l(31.5 + j * 3, 26, 31.5 + j * 3, 37, (8, 8, 8))
    for x, y, a in ((10, 12, 0.5), (50, 48, -0.4), (48, 14, 2.2), (14, 50, 1.0)):
        p.l(x, y, x + math.cos(a) * 7, y + math.sin(a) * 7, PST[0], 2); p.l(x + 1, y, x + 1 + math.cos(a) * 7, y + math.sin(a) * 7, PST[4])
    put(rgb, outline_same(p.im))
    finish(rgb, 'floor_boss_executioner.png', 48, half=False)


def tex_floor_alarmplate():
    """An alarm plate: the prison floor with a square iron pressure plate, a dull red glow round its rim and a bell sign."""
    rgb = x2(flagstones(2261))
    p = Pic(64, 64)
    p.r(13, 13, 50, 50, (120, 24, 18)); p.r(15, 15, 48, 48, I0); p.r(17, 17, 46, 46, I1)
    p.l(17, 17, 46, 17, I2); p.l(17, 17, 17, 46, I2)
    for x, y in ((19, 19), (44, 19), (19, 44), (44, 44)):
        p.p(x, y, I3)
    p.poly([(31.5, 22), (38, 30), (39, 38), (24, 38), (25, 30)], (150, 40, 30)); p.r(30, 39, 33, 41, (150, 40, 30))   # bell
    p.l(27, 30, 30, 25, (210, 90, 70))
    put(rgb, outline_same(p.im))
    yy, xx = np.mgrid[0:64, 0:64]
    d = np.maximum(np.abs(xx - 31.5), np.abs(yy - 31.5))
    ring = (d > 17) & (d < 23)
    rgb[ring] = rgb[ring] * 0.75 + np.array((150, 30, 20)) * 0.25
    finish(rgb, 'floor_alarmplate.png', 40, half=False)


# ================================================================== HARBOUR TEXTURES
def planks_v_rgb(w, h, seed, pal, pw=8):
    rgb = np.zeros((h, w, 3))
    r2 = random.Random(seed)
    for i, x0 in enumerate(range(0, w, pw)):
        plank_v(rgb, x0, x0 + pw, 0, h, seed + i, pal)
        rgb[:, x0] = pal[0]
        y = r2.randrange(h)                                                   # a butt joint
        rgb[y, x0:x0 + pw] = pal[0]
    return rgb


def tex_wall_shack():
    """A fish shack: weathered grey-brown vertical boards with dark tarred seams, rusty nails, a small dim window with a
    warm glow, a red-and-white float hanging on a rope and salt and green rot along the foot."""
    w, h = 32, 64
    rgb = planks_v_rgb(w, h, 2301, SHK)
    for x in range(0, 32, 8):
        for y in (6, 30, 56):
            rgb[y, x + 1] = RUST[2]; rgb[y, x + 6] = RUST[2]
    rgb[3:5, :] = WD1; rgb[3, :] = WD3                                         # a cross batten
    p = Pic(w, h)
    p.r(5, 14, 18, 26, WD1); p.r(6, 15, 17, 25, (30, 24, 16)); p.r(7, 16, 16, 24, (120, 86, 40))   # window
    p.l(11.5, 16, 11.5, 24, WD1); p.l(7, 20, 16, 20, WD1); p.p(9, 18, (200, 150, 70))
    p.l(25, 8, 25, 38, ROPE[1])
    p.e(21, 38, 29, 46, (190, 40, 30)); p.r(21, 41, 29, 43, (220, 220, 210)); p.p(23, 39, (240, 120, 110))
    put(rgb, outline_same(p.im))
    for y in range(54, 64):
        k = (y - 53) / 10
        rgb[y] = rgb[y] * (1 - 0.5 * k) + np.array(WEED[1]) * 0.5 * k
    r2 = random.Random(2302)
    for _ in range(30):
        rgb[r2.randrange(48, 64), r2.randrange(32)] = (170, 172, 166)          # salt
    finish(rgb, 'wall_shack.png', 40)


def quay_rgb(w, h, seed):
    rgb = stone_rgb(w, h, seed, 16, 10, 0.0, QST)
    nz = pnoise(w, h, seed + 3, ((8, 1.0), (4, 0.5)))
    m = nz > 0.82
    rgb[m] = rgb[m] * 0.6 + np.array(WEED[2]) * 0.4
    return rgb


def tex_wall_quay():
    """The quay wall: big blue-grey dressed blocks, an iron mooring ring, black-green weed and white barnacles where the
    tide reaches, a dark wet band at the foot."""
    w, h = 32, 64
    rgb = quay_rgb(w, h, 2311)
    for y in range(40, 64):
        k = min(1, (y - 39) / 8)
        rgb[y] = rgb[y] * (1 - 0.55 * k) + np.array(WEED[0]) * 0.55 * k
    rgb[40] = WEED[3]
    r2 = random.Random(2312)
    for _ in range(26):
        x, y = r2.randrange(32), r2.randrange(41, 63)
        rgb[y, x] = (196, 196, 186)
    for _ in range(8):
        x = r2.randrange(32); L = r2.randint(3, 9)
        rgb[41:41 + L, x] = WEED[2]
    p = Pic(w, h)
    p.r(14, 22, 18, 25, I1)
    p.e(11, 25, 21, 35, I1); p.e(13, 27, 19, 33, (0, 0, 0, 0)); p.arc(11, 25, 21, 35, 190, 300, RUST[3])
    put(rgb, outline_same(p.im))
    finish(rgb, 'wall_quay.png', 40)


def tex_wall_boss_tidepriest():
    """The tide priest's wall: quay stone with a great carved spiral shell sigil inlaid in glowing sea-green, carved
    tentacles curling out from it, weed and barnacles at the foot."""
    w, h = 64, 128
    rgb = x2(quay_rgb(32, 64, 2321))
    p = Pic(w, h)
    cx, cy = 31.5, 50
    pts = [(cx + math.cos(t) * t * 2.6, cy + math.sin(t) * t * 2.6) for t in np.linspace(0.4, 3.2 * math.pi, 60)]
    p.lines(pts, TEAL[0], 3); p.lines(pts, TEAL[1], 1)
    p.e(cx - 2, cy - 2, cx + 2, cy + 2, TEAL[2])
    for s in (-1, 1):
        tp = [(cx + s * (22 + j * 2), cy + 14 + j * 7 + math.sin(j) * 3 * s) for j in range(7)]
        p.lines(tp, QST[0], 4); p.lines(tp, QST[3], 1)
        for j in range(1, 6, 2):
            p.p(tp[j][0] - s, tp[j][1], TEAL[1])
    p.poly([(cx - 10, 12), (cx, 4), (cx + 10, 12), (cx, 20)], QST[0]); p.poly([(cx - 6, 12), (cx, 7), (cx + 6, 12), (cx, 17)], TEAL[0])
    put(rgb, outline_same(p.im))
    sm = rgb[::2, ::2].copy()
    for y in range(48, 64):
        k = min(1, (y - 47) / 6)
        sm[y] = sm[y] * (1 - 0.55 * k) + np.array(WEED[0]) * 0.55 * k
    rgb[96:] = x2(sm)[96:]
    finish(rgb, 'wall_boss_tidepriest.png', 64, half=False)


def dock_rgb(seed=2331, gaps=True):
    """Dock planks (32x32 half-res): horizontal boards with dark gaps showing the water below, nail heads."""
    w = h = 32
    rgb = np.zeros((h, w, 3))
    for i, y0 in enumerate(range(0, h, 8)):
        plank_h(rgb, 0, w, y0, y0 + 7, seed + i, DOCKW)
        rgb[y0 + 7, :] = SEA[1] if gaps else DOCKW[0]
        x = (seed * 7 + i * 13) % w
        rgb[y0:y0 + 7, x] = DOCKW[0]
        for xx in (x + 2, (x + 18) % w):
            rgb[y0 + 2, xx % w] = I2; rgb[y0 + 5, xx % w] = I2
    nz = pnoise(w, h, seed + 5, ((16, 1.0), (8, 0.5)))
    m = nz > 0.78
    rgb[m] = rgb[m] * 0.7 + np.array(WEED[1]) * 0.3
    return rgb


def tex_floor_dock():
    finish(dock_rgb(), 'floor_dock.png', 32)


def cobble_rgb(seed=2341, pal=QST, wet=0.25):
    """Rounded cobbles (64x64, tiles): a jittered grid of stones with dark gaps, a light top-left rim, puddle sheen."""
    W = 64
    rgb = np.zeros((W, W, 3)) + np.array(pal[0])
    yy, xx = np.mgrid[0:W, 0:W]
    r2 = random.Random(seed)
    best = np.full((W, W), 1e9); second = np.full((W, W), 1e9); idx = np.zeros((W, W), int)
    cents = []
    for gy in range(8):
        for gx in range(8):
            cents.append(((gx + 0.5 + r2.uniform(-0.25, 0.25) + (0.5 if gy % 2 else 0)) * 8, (gy + 0.5 + r2.uniform(-0.2, 0.2)) * 8))
    for k, (cx, cy) in enumerate(cents):
        dx = (xx - cx + W / 2) % W - W / 2; dy = (yy - cy + W / 2) % W - W / 2
        d = np.hypot(dx, dy * 1.1)
        m = d < best
        second = np.where(m, best, np.minimum(second, d)); best = np.where(m, d, best); idx = np.where(m, k, idx)
    edge = second - best
    shade = np.array([r2.uniform(0.35, 0.7) for _ in cents])[idx]
    nz = pnoise(W, W, seed + 1, ((8, 1.0), (4, 0.5)))
    lum = np.clip(shade + (nz - 0.5) * 0.25 - np.clip(1.6 - edge, 0, 1.6) * 0.25, 0, 1)
    rgb = gmap(lum, stops(pal))
    rgb[edge < 1.1] = pal[0]
    wz = pnoise(W, W, seed + 2, ((32, 1.0), (16, 0.5))) > 1 - wet
    rgb[wz] = rgb[wz] * 0.6 + np.array(SEA[3]) * 0.4
    return rgb


def tex_floor_cobble():
    finish(cobble_rgb(), 'floor_cobble.png', 40, half=False)


def tex_floor_boss_tidepriest():
    """The tide priest's altar floor: wet cobbles round a round inlaid spiral of sea-green stone, puddles and weed."""
    rgb = cobble_rgb(2351, wet=0.35)
    p = Pic(64, 64)
    p.e(12, 12, 51, 51, QST[0]); p.e(14, 14, 49, 49, QST[2])
    pts = [(31.5 + math.cos(t) * t * 1.7, 31.5 + math.sin(t) * t * 1.7) for t in np.linspace(0.5, 3.0 * math.pi, 50)]
    p.lines(pts, TEAL[0], 2)
    for j in range(8):
        a = j / 8 * TAU
        p.p(31.5 + math.cos(a) * 18.5, 31.5 + math.sin(a) * 18.5, TEAL[1])
    put(rgb, outline_same(p.im))
    finish(rgb, 'floor_boss_tidepriest.png', 48, half=False)


def tex_floor_net():
    """A fishing net spread on the dock planks: a diamond mesh of brown rope with knots, a cork float (tiles)."""
    rgb = x2(dock_rgb(2361))
    def fn(p, ox, oy):
        for k in range(-8, 9):
            p.l(k * 8 + ox, oy, k * 8 + 64 + ox, 64 + oy, ROPE[0], 2)
            p.l(k * 8 + ox, 64 + oy, k * 8 + 64 + ox, oy, ROPE[0], 2)
        for k in range(-8, 9):
            p.l(k * 8 + ox, oy, k * 8 + 64 + ox, 64 + oy, ROPE[2])
            p.l(k * 8 + ox, 64 + oy, k * 8 + 64 + ox, oy, ROPE[1])
        for i in range(8):
            for j in range(8):
                p.p(i * 8 + ox, j * 8 + oy, ROPE[3])
                p.p(i * 8 + 4 + ox, j * 8 + 4 + oy, ROPE[3])
        p.e(40 + ox, 18 + oy, 48 + ox, 24 + oy, (160, 110, 60)); p.l(41 + ox, 19 + oy, 46 + ox, 19 + oy, (200, 150, 90))
    put(rgb, wrap_pic(64, 64, fn))
    finish(rgb, 'floor_net.png', 40, half=False)


@builder('textures')
def make_textures():
    for fn in (tex_wall_prisonstone, tex_wall_cellbars, tex_wall_boss_executioner, tex_wall_shack, tex_wall_quay,
               tex_wall_boss_tidepriest, tex_floor_prison, tex_floor_straw, tex_floor_boss_executioner, tex_floor_alarmplate,
               tex_floor_dock, tex_floor_cobble, tex_floor_boss_tidepriest, tex_floor_net):
        fn()


# ================================================================== SHARED BITS
def club(p, x, y, a, L=12):
    ex, ey = pt(a, L, x, y)
    p.l(x, y, ex, ey, WD1, 3); p.l(x, y, ex, ey, WD3, 1)
    p.e(ex - 2, ey - 2, ex + 2, ey + 2, WD1)
    p.l(x - math.sin(a) * 2, y - math.cos(a) * 2, x, y, LEATH[0], 3)
    return ex, ey


def lantern(p, x, y, lit=1):
    """A small iron lantern hanging from the hand at (x, y): a ring, a cage with a warm glass."""
    p.l(x, y, x, y + 2, I1)
    p.r(x - 2, y + 2, x + 2, y + 8, I0)
    p.r(x - 1, y + 3, x + 1, y + 7, GLOW[2] if lit else (60, 50, 30)); p.p(x, y + 4, GLOW[3] if lit else (80, 70, 40))
    p.l(x - 3, y + 2, x + 3, y + 2, I1); p.l(x - 2, y + 9, x + 2, y + 9, I1)


def glow_pic(x, y, r, n=10, seed=0):
    q = Pic(64, 64)
    halo(q, x, y, r, (GLOW[1], GLOW[2]), n, seed)
    return q.im


def ballchain(p, hx, hy, bx, by, r=3.2):
    n = 6
    for j in range(1, n):
        t = j / n
        sag = math.sin(t * math.pi) * 2
        p.p(hx + (bx - hx) * t, hy + (by - hy) * t + sag, I2 if j % 2 else I1)
    shade_ball(p, bx, by, r, (I0, I1, I2, I3))


def tongs(p, x, y, a, L=12, hot=True):
    ex, ey = pt(a, L, x, y)
    p.l(x, y, ex, ey, I1, 2); p.l(x, y, ex, ey, I2)
    if hot:
        hx, hy = pt(a, 5, ex, ey)
        p.l(ex, ey, hx, hy, GLOW[1], 3); p.l(ex, ey, hx, hy, GLOW[2]); p.p(hx, hy, GLOW[3])
    return ex, ey


def harpoon(p, x, y, a, L=26, back=6):
    sx, sy = pt(a + math.pi, back, x, y)
    ex, ey = pt(a, L, x, y)
    p.l(sx, sy, ex, ey, WD2, 2); p.l(sx, sy, ex, ey, WD3)
    u = (math.sin(a), math.cos(a)); v = (u[1], -u[0])
    tip = (ex + u[0] * 6, ey + u[1] * 6)
    p.poly([(ex + v[0] * 2.5, ey + v[1] * 2.5), tip, (ex - v[0] * 2.5, ey - v[1] * 2.5)], I2)
    p.l(ex, ey, tip[0], tip[1], I3)
    p.l(ex - v[0] * 3 - u[0] * 1, ey - v[1] * 3 - u[1] * 1, ex + u[0] * 2, ey + u[1] * 2, I1)
    return tip


def drips(p, x0, y0, x1, y1, seed, n=5):
    r2 = random.Random(seed)
    for _ in range(n):
        x, y = r2.uniform(x0, x1), r2.uniform(y0, y1)
        p.p(x, y, (120, 170, 200)); p.p(x, y + 1, (70, 110, 150))


# ================================================================== TURNKEY (jailer) (drawn, 64x64)
def turnkey_raw(step=None, bob=0, lean=0.5, aF=(0.9, 0.5), aB=(0.0, 0.2), cl=1.3, eyes=1, crouch=0, whistle=0, lit=1, cap=True, lamp=True):
    """Side view facing right: a prison guard - a long dark blue-grey greatcoat with two rows of brass buttons and a
    belt with a key ring, a peaked cap, a grey moustache; a lantern hangs from the back hand, a club in the front."""
    p = Pic(64, 64)
    K0 = {}
    def far(p, K):
        K0.update(K)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.poly([(hx - 6, hy - 3), (hx + 6, hy - 3), (hx + 8, FEET - 6), (hx - 8, FEET - 6)], COAT[1])
        p.l(hx + 1, hy, hx + 2, FEET - 7, COAT[0])
        p.r(sx - 5, sy + 1, sx + 5, hy - 2, COAT[2]); p.l(sx - 5, sy + 1, sx + 5, sy + 1, COAT[3])
        for j in range(4):
            p.p(sx + 3, sy + 3 + j * 3, BR3); p.p(sx, sy + 3 + j * 3, BR2)
        p.r(hx - 6, hy - 3, hx + 6, hy - 1, LEATH[1]); p.p(hx + 2, hy - 2, BR4)
        p.arc(hx - 5, hy - 1, hx - 1, hy + 3, 0, 360, I2); p.p(hx - 3, hy + 3, I3)     # key ring
    def head(p, K):
        x, y = K['head']
        p.l(x + 2, y + 2, x + 6, y + 2, (150, 146, 140), 2)
        if eyes:
            p.p(x + 3, y - 1, BLK[0])
        else:
            p.l(x + 2, y - 1, x + 4, y - 1, BLK[0])
        if whistle:
            p.l(x + 5, y + 3, x + 9, y + 3, BR3, 2); p.p(x + 9, y + 2, BR4)
            for j in range(whistle):
                p.arc(x + 9 + j * 3, y - 2, x + 13 + j * 3, y + 6, -60, 60, WHITE)
        if cap:
            p.r(x - 5, y - 8, x + 4, y - 4, COAT[1]); p.l(x - 5, y - 8, x + 4, y - 8, COAT[3])
            p.l(x - 4, y - 3, x + 8, y - 3, BLK[1], 2); p.p(x + 1, y - 6, BR4)
    def front(p, K):
        if cl is not None:
            club(p, K['handF'][0], K['handF'][1], cl, 12)
        ell(p, K['handF'][0], K['handF'][1], 1.6, 1.6, SKIN[1])
    rig(p, 30, FEET, LL=14, TL=13, HR=5, step=step, bob=bob, lean=lean, crouch=crouch, legs=(BLK[1], BLK[2]), leg_w=5, body=(COAT[1], COAT[2]),
        body_w=(6, 6), arms=(COAT[1], COAT[2]), arm_w=4, AL=13, aB=aB, aF=aF, skin=SKIN, hands=SKIN[1], shoes=BLK[0],
        on_far=far, on_torso=torso, on_head=head, on_front=front)
    if lamp:
        lantern(p, K0['handB'][0] - 3, K0['handB'][1], lit)
    im = outline_same(p.im)
    if lamp and lit:
        hb = K0['handB']
        im = on(glow_pic(hb[0] - 3, hb[1] + 5, 5, 8, 3), im)
    return im


@builder('turnkey')
def make_turnkey():
    T = turnkey_raw
    save_enemy('turnkey', 'idle', [T(bob=(0, 0, 1, 0)[i], cl=1.3 + (0, 0.05, 0.1, 0.05)[i], lit=1) for i in range(4)])
    save_enemy('turnkey', 'movement', [T(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=1.5, aB=(0.3 * math.sin(i / 6 * TAU), 0.2), cl=1.5) for i in range(6)])
    save_enemy('turnkey', 'attack', [T(whistle=2, aF=(0.6, 0.3), cl=1.0), T(aF=(2.4, 0.6), cl=3.4, lean=-1), T(aF=(2.9, 0.3), cl=3.9, lean=-2),
                                     T(aF=(2.0, 0.1), cl=2.4, lean=1), T(aF=(1.2, 0.1), cl=1.1, lean=3, crouch=2), T(aF=(1.0, 0.4), cl=1.2, lean=2)])
    save_enemy('turnkey', 'take_damage', [flash(T(lean=-3, eyes=0), WHITE), T(lean=-2), T(lean=-1)])
    base = T(eyes=0, cl=None, lamp=False, aF=(1.2, 0.4), aB=(1.0, 0.5))
    q = Pic(64, 64); club(q, 38, FEET - 2, 1.62, 12); lantern(q, 14, FEET - 10, 0); cb = outline_same(q.im)
    save_enemy('turnkey', 'death', [flash(T(lean=-3, eyes=0), WHITE), on(fall(base, 0.25), cb), on(fall(base, 0.55), cb), on(fall(base, 0.85), cb),
                                    on(fall(base, 1.0), cb), on(fall(T(eyes=0, cl=None, lamp=False, cap=False, aF=(1.2, 0.4)), 1.0), cb)])


# ================================================================== CONVICT (drawn, 64x64)
def convict_raw(step=None, bob=0, lean=1.0, aF=(0.5, 0.3), aB=(0.1, 0.3), ball=None, eyes=1, crouch=0, mouth=0):
    """Side view facing right: a shaven convict in grey-and-black striped prison clothes, an iron shackle on the ankle,
    swinging an iron ball on a chain held in both hands (ball = the ball's (dx, dy) from the front hand, None = hanging)."""
    p = Pic(64, 64)
    K0 = {}
    def far(p, K):
        K0.update(K)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.r(sx - 5, sy + 1, sx + 5, hy, STRIPE[1])
        for y in range(int(sy) + 2, int(hy), 3):
            p.l(sx - 5, y, sx + 5, y, STRIPE[0])
        p.l(sx - 5, sy + 1, sx + 5, sy + 1, STRIPE[2])
    def head(p, K):
        x, y = K['head']
        p.arc(x - 5, y - 5, x + 5, y + 5, 200, 330, SKIN[0])
        if eyes:
            p.p(x + 3, y - 1, BLK[0]); p.l(x + 2, y - 2, x + 4, y - 2, SKIN[0])
        else:
            p.l(x + 2, y - 1, x + 4, y - 1, BLK[0])
        p.l(x + 2, y + 3, x + 5, y + 3 + mouth, (70, 30, 26))
        p.p(x - 3, y + 1, (90, 60, 50)); p.p(x - 2, y + 3, (90, 60, 50))           # stubble
    def front(p, K):
        hx, hy = K['handF']
        bx, by = (hx + 3, hy + 10) if ball is None else (hx + ball[0], hy + ball[1])
        ballchain(p, hx, hy, bx, by, 3.6)
        ell(p, hx, hy, 1.7, 1.7, SKIN[1])
    rig(p, 28, FEET, LL=14, TL=13, HR=5, step=step, bob=bob, lean=lean, crouch=crouch, legs=(STRIPE[1], STRIPE[2]), leg_w=5, body=(STRIPE[1], STRIPE[2]),
        body_w=(6, 6), arms=(STRIPE[1], STRIPE[2]), arm_w=4, AL=13, aB=aB, aF=aF, skin=SKIN, hands=SKIN[1], shoes=LEATH[0],
        on_far=far, on_torso=torso, on_head=head, on_front=front)
    for fx, fy in K0['feet'][:1]:
        p.r(fx - 2, FEET - 4, fx + 2, FEET - 2, I1); p.l(fx - 2, FEET - 4, fx + 2, FEET - 4, I3)
        p.lines([(fx - 2, FEET - 2), (fx - 6, FEET - 1), (fx - 10, FEET - 2)], I2)
    return outline_same(p.im)


@builder('convict')
def make_convict():
    C = convict_raw
    save_enemy('convict', 'idle', [C(bob=(0, 0, 1, 0)[i], ball=(3, 10 + (0, 1, 1, 0)[i])) for i in range(4)])
    save_enemy('convict', 'movement', [C(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=2, ball=(2 + math.sin(i / 6 * TAU) * 2, 11)) for i in range(6)])
    arc_ = [(-10, 4), (-8, -10), (4, -14), (14, -4), (13, 8), (5, 11)]
    save_enemy('convict', 'attack', [C(aF=(1.6 + j * 0.25, 0.2), lean=(-1, -2, 0, 2, 3, 1)[j], ball=arc_[j], mouth=1 + (j in (2, 3)), crouch=(0, 0, 1, 2, 2, 0)[j]) for j in range(6)])
    save_enemy('convict', 'take_damage', [flash(C(lean=-3, eyes=0, mouth=2), WHITE), C(lean=-2, mouth=1), C(lean=-1)])
    base = C(eyes=0, mouth=2, aF=(1.2, 0.4), aB=(1.0, 0.5), ball=(2, 6))
    q = Pic(64, 64); shade_ball(q, 46, FEET - 4, 3.6, (I0, I1, I2, I3)); bl = outline_same(q.im)
    save_enemy('convict', 'death', [flash(C(lean=-3, eyes=0, mouth=2), WHITE), fall(base, 0.25), fall(base, 0.55), on(fall(base, 0.85), bl), on(fall(base, 1.0), bl), on(fall(base, 1.0), bl)])


# ================================================================== TORTURER (drawn, 64x64)
def torturer_raw(step=None, bob=0, lean=1.0, aF=(0.7, 0.6), aB=(0.0, 0.4), tg=1.4, hot=True, eyes=1, crouch=0, fly=None):
    """Side view facing right: a fat torturer - a black hood with eye holes over the head and shoulders, bare pale arms,
    a big belly under a stained leather apron, dark breeches and boots; long tongs with a glowing iron in the front
    hand (tg = angle); fly = a thrown iron in flight (x, y)."""
    p = Pic(64, 64)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.e(sx - 6, sy + 1, sx + 9, hy + 2, SKIN[1]); p.e(sx - 4, sy + 3, sx + 7, hy, SKIN[2])
        p.poly([(sx + 2, sy + 4), (sx + 9, sy + 6), (hx + 9, FEET - 8), (hx + 1, FEET - 8)], LEATH[2])
        p.l(sx + 9, sy + 6, hx + 9, FEET - 8, LEATH[3]); p.l(sx + 2, sy + 4, sx - 2, hy - 3, LEATH[0])
        p.p(hx + 5, hy, BLOOD[1]); p.p(hx + 4, hy + 4, BLOOD[0]); p.p(hx + 7, hy - 4, BLOOD[1])
    def head(p, K):
        x, y = K['head']
        p.poly([(x - 6, y - 6), (x, y - 9), (x + 6, y - 5), (x + 7, y + 4), (x + 4, y + 9), (x - 7, y + 9)], HOOD[1])
        p.l(x, y - 9, x + 6, y - 5, HOOD[2])
        if eyes:
            p.r(x + 2, y - 2, x + 3, y - 1, (220, 200, 160)); p.p(x + 3, y - 1, BLK[0])
        else:
            p.l(x + 2, y - 1, x + 4, y - 1, HOOD[0])
        p.r(x + 3, y + 3, x + 5, y + 4, SKIN[1])
    def front(p, K):
        if tg is not None:
            tongs(p, K['handF'][0], K['handF'][1], tg, 12, hot)
        ell(p, K['handF'][0], K['handF'][1], 1.8, 1.8, SKIN[1])
    rig(p, 28, FEET, LL=13, TL=13, HR=5, step=step, bob=bob, lean=lean, crouch=crouch, legs=(LEATH[0], LEATH[1]), leg_w=6, body=(SKIN[1], SKIN[2]),
        body_w=(7, 8), arms=(SKIN[1], SKIN[2]), arm_w=4, AL=13, aB=aB, aF=aF, skin=SKIN, hands=SKIN[1], shoes=BLK[0],
        on_torso=torso, on_head=head, on_front=front)
    im = outline_same(p.im)
    if fly:
        q = Pic(64, 64)
        q.l(fly[0] - 3, fly[1] + 1, fly[0] + 3, fly[1] - 1, GLOW[1], 2); q.p(fly[0] + 3, fly[1] - 1, GLOW[3])
        im = on(im, glow_pic(fly[0], fly[1], 4, 6, 5), outline_same(q.im))
    return im


@builder('torturer')
def make_torturer():
    T = torturer_raw
    save_enemy('torturer', 'idle', [T(bob=(0, 0, 1, 0)[i], tg=1.4 + (0, 0.05, 0.1, 0.05)[i]) for i in range(4)])
    save_enemy('torturer', 'movement', [T(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=1.5, tg=1.6) for i in range(6)])
    save_enemy('torturer', 'attack', [T(aF=(-0.4, 0.4), tg=-0.2, lean=-1), T(aF=(-0.9, 0.5), tg=-0.6, lean=-2), T(aF=(1.2, 0.3), tg=1.5, lean=1),
                                      T(aF=(2.0, 0.1), tg=2.1, lean=3, hot=False, fly=(52, 24)), T(aF=(1.6, 0.2), tg=1.7, lean=2, hot=False, fly=(55, 22)),
                                      T(aF=(0.9, 0.5), tg=1.3, lean=1, hot=False)])
    save_enemy('torturer', 'take_damage', [flash(T(lean=-3, eyes=0), WHITE), T(lean=-2), T(lean=-1)])
    base = T(eyes=0, tg=None, aF=(1.2, 0.4), aB=(1.0, 0.5))
    q = Pic(64, 64); tongs(q, 40, FEET - 2, 1.62, 12, False); tg_im = outline_same(q.im)
    save_enemy('torturer', 'death', [flash(T(lean=-3, eyes=0), WHITE), on(fall(base, 0.25), tg_im), on(fall(base, 0.55), tg_im), on(fall(base, 0.85), tg_im),
                                     on(fall(base, 1.0), tg_im), on(fall(base, 1.0), tg_im)])


# ================================================================== WATCHDOG (hound) (drawn, 64x64, low)
def dog_raw(step=None, jaw=0.0, lunge=0.0, dx=0, eyes=1, dead=False, crouch=0, tail=0):
    """Side view facing right: a lean black-and-tan prison hound - a deep chest, a tucked belly, long legs, a long muzzle
    with tan cheeks and brows, pricked ears, a spiked iron collar, a whip tail; jaw 0..1 opens the mouth, lunge 0..1
    stretches it forward and up; dead = lying on its side."""
    p = Pic(64, 64)
    f = FEET
    cx, cy = 28 + dx + lunge * 6, f - 15 + crouch - lunge * 6
    ph = (step or 0) * TAU
    def leg(x, y, a, far):
        col = DOG[0] if far else DOG[1]
        kx, ky = pt(a, 6, x, y)
        fx, fy = pt(a * -0.4, 6, kx, ky)
        if not dead:
            fy = min(fy, f - 1) if lunge < 0.5 else fy
        p.l(x, y, kx, ky, col, 3); p.l(kx, ky, fx, fy, col, 2); p.p(fx + 1, fy, DOG[3])
    legs = [(cx + 8, 0.0), (cx - 8, math.pi)]
    for j, (lx, o) in enumerate(legs):
        a = (math.sin(ph + o) * 0.5 if step is not None else 0) + (0.8 if lunge and j == 0 else -0.6 if lunge else 0)
        leg(lx + 1, cy + 2, a, True)
    p.lines([(cx - 11, cy - 1), (cx - 16, cy - 5 - tail), (cx - 19, cy - 9 - tail)], DOG[1], 2)          # tail
    ell(p, cx, cy, 11, 5, DOG[1]); ell(p, cx + 5, cy - 1, 7, 5.5, DOG[1]); ell(p, cx - 1, cy - 2, 9, 2.5, DOG[2])
    p.e(cx + 2, cy + 1, cx + 10, cy + 5, DOG[3])                                                          # tan chest
    hx, hy = cx + 14 + lunge * 2, cy - 7 - lunge * 1
    p.l(cx + 9, cy - 3, hx - 2, hy + 1, DOG[1], 4)
    ell(p, hx, hy, 4, 3.4, DOG[1])
    p.poly([(hx + 2, hy - 1), (hx + 10, hy + 1), (hx + 10, hy + 2.5), (hx + 2, hy + 3)], DOG[1])         # muzzle top
    p.poly([(hx + 2, hy + 3), (hx + 9, hy + 3 + jaw * 4), (hx + 8, hy + 5 + jaw * 4), (hx + 1, hy + 5)], DOG[0])   # lower jaw
    if jaw > 0.3:
        p.l(hx + 3, hy + 3, hx + 9, hy + 3, WHITE); p.l(hx + 3, hy + 4 + jaw * 2, hx + 8, hy + 3 + jaw * 4, (150, 40, 40))
    p.p(hx + 10, hy + 1, BLK[0]); p.p(hx + 4, hy + 2, DOG[3]); p.p(hx + 2, hy - 2, DOG[3])
    p.poly([(hx - 3, hy - 2), (hx - 1, hy - 8), (hx + 1, hy - 2)], DOG[0])
    if eyes:
        p.p(hx + 3, hy - 1, (230, 180, 60))
    else:
        p.l(hx + 2, hy - 1, hx + 4, hy - 1, BLK[0])
    p.l(hx - 4, hy + 1, hx - 1, hy + 5, I1, 2)
    for j in range(3):
        p.p(hx - 4 + j * 1.5, hy + j * 2 - 1, I3)
    for j, (lx, o) in enumerate(legs):
        a = (math.sin(ph + o + math.pi) * 0.5 if step is not None else 0.1) + (1.0 if lunge and j == 0 else -0.8 if lunge else 0)
        leg(lx, cy + 3, a, False)
    im = outline_same(p.im)
    if dead:
        im = ground_it(im.rotate(180, resample=Image.NEAREST, center=(cx, cy)).transpose(Image.FLIP_LEFT_RIGHT))
    return im


@builder('watchdog')
def make_watchdog():
    D = dog_raw
    save_enemy('watchdog', 'idle', [D(jaw=(0, 0.2, 0.4, 0.2)[i], tail=(0, 1, 2, 1)[i]) for i in range(4)])
    save_enemy('watchdog', 'movement', [D(step=i / 6, tail=2, crouch=(0, -1, -1, 0, -1, -1)[i]) for i in range(6)])
    save_enemy('watchdog', 'attack', [D(crouch=2, jaw=0.3), D(crouch=3, jaw=0.6, dx=-2), D(lunge=0.6, jaw=1.0), D(lunge=1.0, jaw=1.0, dx=-2),
                                      D(lunge=0.5, jaw=0.2, dx=2), D(jaw=0.4)])
    save_enemy('watchdog', 'take_damage', [flash(D(jaw=0.8, eyes=0, dx=-2), WHITE), D(jaw=0.6, dx=-2), D(jaw=0.2)])
    save_enemy('watchdog', 'death', [flash(D(jaw=0.8, eyes=0), WHITE), D(jaw=1.0, eyes=0, crouch=3, dx=-2), ground_it(D(jaw=1.0, eyes=0).rotate(-30, resample=Image.NEAREST, center=(30, 44))),
                                     ground_it(D(jaw=1.0, eyes=0).rotate(-60, resample=Image.NEAREST, center=(30, 44))), D(eyes=0, dead=True, jaw=0.6), D(eyes=0, dead=True, jaw=0.6)])


# ================================================================== DROWNED FISHERMAN (drawn, 64x64)
def drowned_raw(step=None, bob=0, lean=2.0, aF=(1.2, 0.4), aB=(1.0, 0.5), hp=1.45, reach=0, eyes=1, crouch=0, hat=True, drip=0):
    """Side view facing right: a bloated drowned fisherman - blue-grey swollen skin, a torn yellow oilskin coat and a
    sou'wester, seaweed hanging off him, water dripping; holds a long harpoon in both hands (hp = angle, reach shoves it
    forward)."""
    p = Pic(64, 64)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.poly([(sx - 6, sy), (sx + 6, sy + 1), (hx + 8, FEET - 7), (hx + 2, FEET - 9), (hx - 2, FEET - 6), (hx - 8, FEET - 8)], OIL[1])
        p.l(sx + 6, sy + 1, hx + 8, FEET - 7, OIL[3]); p.l(sx, sy + 2, hx, FEET - 8, OIL[0])
        p.r(sx + 1, sy + 3, sx + 4, sy + 7, DRN[2])                                     # a tear showing skin
        p.lines([(sx - 4, sy + 2), (sx - 5, sy + 8), (sx - 3, sy + 13)], WEED[2])
    def head(p, K):
        x, y = K['head']
        ell(p, x, y, 5.5, 5, DRN[2])
        if eyes:
            p.p(x + 3, y - 1, (220, 230, 220)); p.p(x + 4, y - 1, (40, 60, 60))
        else:
            p.l(x + 2, y - 1, x + 4, y - 1, BLK[0])
        p.l(x + 2, y + 3, x + 5, y + 3, (40, 50, 50)); p.p(x - 2, y + 2, DRN[1])
        if hat:
            p.poly([(x - 8, y - 2), (x - 4, y - 8), (x + 4, y - 8), (x + 8, y - 3), (x + 2, y - 4), (x - 3, y - 4)], OIL[1])
            p.l(x - 4, y - 8, x + 4, y - 8, OIL[3]); p.l(x - 8, y - 2, x - 9, y + 3, OIL[0], 2)
    def front(p, K):
        hx, hy = K['handF']
        if hp is not None:
            harpoon(p, hx + reach * 2, hy, hp, 8 + reach * 3, 14)
        ell(p, hx, hy, 1.8, 1.8, DRN[2])
    rig(p, 24, FEET, LL=14, TL=13, HR=5, step=step, bob=bob, lean=lean, crouch=crouch, legs=(OIL[0], OIL[1]), leg_w=5, body=(OIL[1], OIL[2]),
        body_w=(7, 7), arms=(OIL[1], OIL[2]), arm_w=4, AL=13, aB=aB, aF=aF, skin=DRN, hands=DRN[2], shoes=(30, 30, 30),
        on_torso=torso, on_head=head, on_front=front)
    drips(p, 18, 30, 40, FEET - 1, 900 + drip, 6)
    return outline_same(p.im)


@builder('drownedfisher')
def make_drownedfisher():
    D = drowned_raw
    save_enemy('drownedfisher', 'idle', [D(bob=(0, 0, 1, 0)[i], hp=1.45 + (0, 0.03, 0.06, 0.03)[i], drip=i) for i in range(4)])
    save_enemy('drownedfisher', 'movement', [D(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=3, drip=i) for i in range(6)])
    save_enemy('drownedfisher', 'attack', [D(aF=(1.0, 0.7), hp=1.5, lean=0, reach=-1, drip=1), D(aF=(0.9, 0.9), hp=1.5, lean=-2, reach=-2, drip=2),
                                           D(aF=(1.5, 0.2), hp=1.55, lean=3, reach=1, drip=3), D(aF=(1.6, 0.0), hp=1.57, lean=3, reach=1.2, crouch=2, drip=4),
                                           D(aF=(1.4, 0.3), hp=1.52, lean=3, reach=0.5, drip=5), D(drip=6)])
    save_enemy('drownedfisher', 'take_damage', [flash(D(lean=-2, eyes=0), WHITE), D(lean=-1), D(lean=1)])
    base = D(eyes=0, hp=None, aF=(1.2, 0.4), aB=(1.0, 0.5))
    q = Pic(64, 64); harpoon(q, 22, FEET - 2, 1.57, 22, 4); hq = outline_same(q.im)
    save_enemy('drownedfisher', 'death', [flash(D(lean=-2, eyes=0), WHITE), on(fall(base, 0.25), hq), on(fall(base, 0.55), hq), on(fall(base, 0.85), hq),
                                          on(fall(base, 1.0), hq), on(fall(D(eyes=0, hp=None, hat=False, aF=(1.2, 0.4)), 1.0), hq)])


# ================================================================== FISH MAN (drawn, 64x64)
def fishman_raw(step=None, bob=0, lean=4.0, aF=(1.0, 0.8), aB=(0.6, 0.8), eyes=1, crouch=0, mouth=0, air=0, dy=0):
    """Side view facing right: a hunched fish man - green scales with a pale belly, a fish head with a big round yellow
    eye and a wide down-turned mouth, gill slits, a spiny dorsal fin down the back, webbed clawed hands and feet;
    air lifts the whole figure off the floor (the leap)."""
    p = Pic(64, 64)
    def far(p, K):
        sx, sy = K['sh']; hx, hy = K['hip']
        for j in range(5):
            t = j / 4
            x, y = sx - 4 + (hx - sx - 3) * t, sy - 1 + (hy - sy) * t
            p.poly([(x, y), (x - 4, y - 3 + j * 0.5), (x - 1, y + 2)], FISH[3] if j % 2 else FISH[2])
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.e(min(sx, hx) - 1, sy + 1, max(sx, hx) + 6, hy + 1, FBELLY[1]); p.l(sx + 4, sy + 3, hx + 5, hy - 1, FBELLY[2])
        for y in range(int(sy) + 2, int(hy), 3):
            p.p(hx - 2, y, FISH[0]); p.p(hx - 4, y + 1, FISH[3])
    def head(p, K):
        x, y = K['head']
        ell(p, x + 2, y, 6.5, 5, FISH[2]); p.poly([(x + 4, y - 2), (x + 11, y + 1), (x + 9, y + 5), (x + 3, y + 5)], FISH[2])
        p.l(x + 4, y + 4 + mouth, x + 10, y + 2, (40, 20, 24), 1 + mouth)
        p.l(x - 1, y + 1, x - 1, y + 4, FISH[0]); p.l(x + 1, y + 1, x + 1, y + 4, FISH[0])
        if eyes:
            ell(p, x + 5, y - 2, 2.2, 2.2, (230, 200, 60)); p.p(x + 6, y - 2, BLK[0])
        else:
            p.l(x + 3, y - 2, x + 7, y - 2, BLK[0])
    def front(p, K):
        hx, hy = K['handF']
        for j in range(3):
            p.l(hx, hy, hx + 3 + j * 0.5, hy - 1 + j * 2, FISH[1])
        ell(p, hx, hy, 1.8, 1.8, FISH[3])
    rig(p, 28, FEET, LL=12, TL=13, HR=5, step=step, bob=bob, lean=lean, crouch=crouch, legs=(FISH[1], FISH[2]), leg_w=5, body=(FISH[1], FISH[2]),
        body_w=(7, 7), arms=(FISH[1], FISH[2]), arm_w=4, AL=13, aB=aB, aF=aF, skin=FISH, hands=FISH[3], shoes=FISH[0],
        on_far=far, on_torso=torso, on_head=head, on_front=front)
    im = outline_same(p.im)
    if air or dy:
        im = shift(im, 0, -air + dy)
    return im


@builder('fishman')
def make_fishman():
    F = fishman_raw
    save_enemy('fishman', 'idle', [F(bob=(0, 0, 1, 0)[i], mouth=(0, 0, 1, 0)[i]) for i in range(4)])
    save_enemy('fishman', 'movement', [F(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=6, aF=(1.2 + 0.3 * math.sin(i / 6 * TAU), 0.7), aB=(0.8 - 0.3 * math.sin(i / 6 * TAU), 0.7)) for i in range(6)])
    save_enemy('fishman', 'attack', [F(crouch=4, lean=6, mouth=1), F(crouch=6, lean=8, mouth=1, aF=(0.4, 0.4)), F(air=8, lean=9, aF=(2.0, 0.2), aB=(1.8, 0.2), mouth=2),
                                     F(air=6, lean=10, aF=(2.2, 0.0), aB=(2.0, 0.1), mouth=2), F(crouch=5, lean=8, aF=(1.6, 0.2), mouth=1), F(lean=5)])
    save_enemy('fishman', 'take_damage', [flash(F(lean=1, eyes=0, mouth=2), WHITE), F(lean=2, mouth=1), F(lean=3)])
    base = F(eyes=0, mouth=2, aF=(1.2, 0.4), aB=(1.0, 0.5), lean=2)
    save_enemy('fishman', 'death', [flash(F(lean=1, eyes=0, mouth=2), WHITE), fall(base, 0.3), fall(base, 0.6), fall(base, 0.9), fall(base, 1.0), fall(base, 1.0)])


# ================================================================== SHORE CRAB (drawn, 64x64)
def crab_raw(k=0, claw=0.0, snap=0, eyes=1, dx=0, dy=0):
    """Side-on shore crab (it walks sideways towards the viewer's left / right): a wide dark-red domed shell with lighter
    rim and spots, two eye stalks, four jointed legs each side (k = walk phase) and two big claws (claw 0 = low, 1 =
    raised high; snap = pincers shut)."""
    p = Pic(64, 64)
    f = FEET
    cx, cy = 32 + dx, f - 11 + dy
    for s in (-1, 1):
        for j in range(4):
            ph = k * TAU / 6 + j * 1.3 + (0 if s > 0 else math.pi)
            x0 = cx + s * (6 + j * 3)
            kx, ky = x0 + s * (5 + math.sin(ph) * 1.5), cy - 2 - j * 0.3 + math.cos(ph) * 1
            fx, fy = kx + s * 3, f - 1
            p.l(x0, cy + 2, kx, ky, CRAB[1], 2); p.l(kx, ky, fx, fy, CRAB[1], 2); p.p(fx, fy, CRAB[0])
    for s in (-1, 1):                                                          # claws
        ax, ay = cx + s * 9, cy - 2
        ex, ey = cx + s * (16 - claw * 3), cy - 6 - claw * 12
        p.l(ax, ay, ex, ey, CRAB[2], 3)
        ell(p, ex + s * 2, ey - 2, 4.5, 3.5, CRAB[2]); p.p(ex + s * 1, ey - 4, CRAB[4])
        op = 0 if snap else 2.5
        p.poly([(ex + s * 4, ey - 4), (ex + s * 9, ey - 6 - op), (ex + s * 6, ey - 2)], CRAB[3])
        p.poly([(ex + s * 4, ey), (ex + s * 9, ey + op - 1), (ex + s * 5, ey + 1)], CRAB[2])
    p.e(cx - 13, cy - 8, cx + 13, cy + 5, CRAB[1]); p.e(cx - 11, cy - 7, cx + 11, cy + 1, CRAB[2])
    p.arc(cx - 11, cy - 7, cx + 11, cy + 3, 200, 340, CRAB[4])
    for x, y in ((-5, -4), (2, -5), (6, -2), (-2, -1)):
        p.p(cx + x, cy + y, CRAB[3])
    p.l(cx - 12, cy + 3, cx + 12, cy + 3, CRAB[0])
    for s in (-1, 1):
        p.l(cx + s * 3, cy - 7, cx + s * 4, cy - 11, CRAB[1])
        p.e(cx + s * 4 - 1, cy - 13, cx + s * 4 + 1, cy - 11, BLK[0] if eyes else CRAB[1])
    return outline_same(p.im)


@builder('shorecrab')
def make_shorecrab():
    C = crab_raw
    save_enemy('shorecrab', 'idle', [C(claw=(0, 0.1, 0.15, 0.1)[i], snap=i % 2) for i in range(4)])
    save_enemy('shorecrab', 'movement', [C(k=i, dx=(0, 1, 2, 1, 0, -1)[i] - 0, claw=0.1) for i in range(6)])
    save_enemy('shorecrab', 'attack', [C(claw=0.4), C(claw=0.9), C(claw=1.0, snap=1, dy=-1), C(claw=0.6, snap=1), C(claw=0.3), C(claw=0.1, snap=1)])
    save_enemy('shorecrab', 'take_damage', [flash(C(claw=0.5, eyes=0), WHITE), C(claw=0.4, dx=-1), C(claw=0.2)])
    base = C(eyes=0, claw=0.2)
    save_enemy('shorecrab', 'death', [flash(C(claw=0.6, eyes=0), WHITE), C(eyes=0, claw=0.8, dy=-3), ground_it(base.rotate(60, resample=Image.NEAREST, center=(32, 46))),
                                      ground_it(base.rotate(130, resample=Image.NEAREST, center=(32, 46))), flipv(base), flipv(C(eyes=0, claw=0.0, snap=1))])


# ================================================================== GULLS (drawn, 64x64, a flock of three, flying - drawn low)
def gull(p, x, y, wing=0.0, s=1.0, dive=0.0, beak=0, dead=False):
    """A herring gull at (x, y) facing right: a white body and head, grey wings with black tips (wing -1 down .. 1 up),
    a yellow beak with a red spot, pink feet; dive tips it nose down; dead = lying on its back on the floor."""
    if dead:
        ell(p, x, y, 5 * s, 2.5 * s, GULL[3]); p.l(x - 6 * s, y, x - 12 * s, y + 1, GULL[1], 2); p.l(x + 2, y, x + 9 * s, y + 1, GULL[1], 2)
        p.p(x - 12 * s, y + 1, BLK[0]); p.p(x + 9 * s, y + 1, BLK[0])
        p.l(x + 5 * s, y - 1, x + 8 * s, y - 1, (230, 190, 40)); p.l(x - 1, y - 3, x - 1, y - 5, (220, 140, 130))
        return
    wy = -wing * 7 * s
    p.poly([(x - 2 * s, y - 1), (x + 2 * s, y - 1), (x - 3 * s, y + wy - 1), (x - 8 * s, y + wy)], GULL[1])        # far wing
    ell(p, x, y, 5 * s, 2.6 * s, GULL[3]); p.poly([(x - 4 * s, y - 1), (x - 9 * s, y), (x - 4 * s, y + 2)], GULL[2])
    hx, hy = x + 5 * s, y - 2 * s + dive * 3
    ell(p, hx, hy, 2.4 * s, 2.2 * s, GULL[4])
    p.l(hx + 2 * s, hy + 0.5, hx + 5 * s, hy + 1 + beak, (230, 190, 40)); p.p(hx + 4 * s, hy + 1.5, (200, 40, 30))
    p.p(hx + 1, hy - 1, BLK[0])
    p.poly([(x - 1 * s, y - 1), (x + 3 * s, y - 1), (x + 1 * s, y + wy * 1.1 - 1), (x - 6 * s, y + wy * 1.2)], GULL[2])   # near wing
    p.p(x - 6 * s, y + wy * 1.2, BLK[0]); p.p(x - 5 * s, y + wy * 1.2, BLK[0])


def gulls_raw(t=0, dive=None, eyes=1, scatter=None, dead=None):
    """Three gulls in a loose flock low in the cell; t = wing phase; dive = the front gull's dive 0..1; dead = how many
    lie on the floor (0..3) with scatter = falling progress for the others."""
    p = Pic(64, 64)
    f = FEET
    base = [(18, f - 22, 0.0), (34, f - 14, 2.0), (46, f - 25, 4.0)]
    for j, (x, y, o) in enumerate(base):
        w = math.sin(t * TAU / 4 + o)
        if dead is not None and j < dead:
            gull(p, 14 + j * 16, f - 3, dead=True)
            continue
        if scatter is not None:
            y = y + scatter * (f - 4 - y) * (0.5 + j * 0.25)
        if dive is not None and j == 1:
            gull(p, x + dive * 8, y + dive * 6, w * 0.3 + 0.8, 1.0, dive, beak=1)
        else:
            gull(p, x, y + math.sin(t + j) * 1, w, 0.9 if j != 1 else 1.0)
    im = outline_same(p.im)
    if dive:
        pass
    return im


@builder('gulls')
def make_gulls():
    G = gulls_raw
    save_enemy('gulls', 'idle', [G(t=i) for i in range(4)])
    save_enemy('gulls', 'movement', [G(t=i * 4 / 6) for i in range(6)])
    save_enemy('gulls', 'attack', [G(t=0, dive=0.0), G(t=1, dive=0.3), G(t=2, dive=0.7), G(t=3, dive=1.0), G(t=0, dive=0.6), G(t=1, dive=0.2)])
    save_enemy('gulls', 'take_damage', [flash(G(t=1), WHITE), G(t=2), G(t=3)])
    q = Pic(64, 64)
    r2 = random.Random(31)
    for _ in range(7):
        x, y = r2.uniform(10, 54), r2.uniform(FEET - 30, FEET - 6)
        q.l(x, y, x + 3, y - 1, GULL[3]); q.p(x, y, GULL[1])
    fe = outline_same(q.im)
    save_enemy('gulls', 'death', [flash(G(t=1), WHITE), on(G(t=2, scatter=0.3), fe), on(G(t=3, scatter=0.6), fe), on(G(t=0, scatter=0.9, dead=1), fe),
                                  G(dead=3), G(dead=3)])


# ================================================================== THE EXECUTIONER (drawn, 116x116)
def big_axe(p, x, y, a, L=44):
    """The executioner's axe held at (x, y): a long dark haft along a (from straight down, positive forward) with iron
    bands, and a huge crescent blade at the far end on the forward side, with a bright edge and a blood stain."""
    ex, ey = pt(a, L, x, y)
    bx, by = pt(a + math.pi, 6, x, y)
    p.l(bx, by, ex, ey, (40, 26, 18), 5); p.l(bx, by, ex, ey, (70, 46, 30), 2)
    for t in (0.55, 0.9):
        q = pt(a, L * t, x, y)
        p.l(q[0] - 2, q[1] - 2, q[0] + 2, q[1] + 2, I2, 2)
    u = (math.sin(a), math.cos(a)); v = (u[1], -u[0])                       # v = the blade side (forward when the haft is up)
    c = (ex - u[0] * 5, ey - u[1] * 5)
    P_ = lambda a_, b_: (c[0] + v[0] * a_ + u[0] * b_, c[1] + v[1] * a_ + u[1] * b_)
    pts = [P_(0, -6), P_(9, -9), P_(14, -13), P_(17, -6), P_(18, 1), P_(16, 8), P_(12, 11), P_(7, 7), P_(0, 5)]
    p.poly(pts, (46, 46, 52)); p.poly([P_(0, -5), P_(8, -4), P_(9, 3), P_(0, 4)], (66, 66, 74))
    p.lines(pts[2:7], (190, 194, 204), 2)
    p.p(c[0] + v[0] * 14, c[1] + v[1] * 14, BLOOD[1]); p.p(c[0] + v[0] * 17 + u[0] * 4, c[1] + v[1] * 17 + u[1] * 4, BLOOD[2])
    return c[0] + v[0] * 20, c[1] + v[1] * 20


def hook(p, x, y, a=0.0, s=1.0):
    """A big iron chain hook at (x, y)."""
    p.arc(x - 6 * s, y - 2 * s, x + 4 * s, y + 10 * s, 0 + a, 200 + a, I2, 3)
    p.poly([(x - 6 * s, y + 3 * s), (x - 9 * s, y + 1 * s), (x - 6 * s, y + 7 * s)], I3)
    p.e(x - 1.5 * s, y - 5 * s, x + 1.5 * s, y - 1 * s, I1)


def execu_frame(step=None, bob=0, lean=0.0, aF=(0.9, 0.3), aB=(-0.2, 0.5), ax=0.9, eyes=1, crouch=0, chips=0, chain=None, hooded=True):
    """Side view facing right: the executioner - a giant in a black hood with eye slits (red eyes glinting) hanging down
    over his shoulders, a bare scarred barrel chest with crossed leather straps and a big iron buckle, a leather apron
    over dark breeches, wide wrist guards, heavy boots; the front hand holds the huge axe (ax = haft angle); chain = the
    thrown chain hook's position from the back hand; chips = stone chips and a crack where the axe struck."""
    p = Pic(BS, BS)
    f = BS_FEET
    K0 = {}
    def far(p, K):
        K0.update(K)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.e(min(sx, hx) - 13, sy + 2, max(sx, hx) + 14, hy + 3, SKIN[1]); p.e(min(sx, hx) - 9, sy + 4, max(sx, hx) + 10, hy - 2, SKIN[2])
        p.l(sx - 10, sy + 2, hx + 10, hy - 2, LEATH[1], 4); p.l(sx + 10, sy + 2, hx - 10, hy - 2, LEATH[1], 4)
        p.e(sx - 3, (sy + hy) / 2 - 4, sx + 5, (sy + hy) / 2 + 4, I2); p.e(sx - 1, (sy + hy) / 2 - 2, sx + 3, (sy + hy) / 2 + 2, I1)
        p.l(sx + 4, sy + 8, sx + 9, sy + 14, SKIN[0]); p.l(sx - 6, sy + 16, sx - 2, sy + 20, SKIN[0])    # scars
        p.r(hx - 13, hy - 2, hx + 13, hy + 3, LEATH[0]); p.r(hx - 2, hy - 2, hx + 3, hy + 3, I2)
        p.poly([(hx - 4, hy + 2), (hx + 14, hy + 2), (hx + 16, f - 16), (hx - 2, f - 18)], LEATH[2])          # apron
        p.l(hx + 14, hy + 2, hx + 16, f - 16, LEATH[3]); p.p(hx + 8, hy + 14, BLOOD[1]); p.p(hx + 10, hy + 20, BLOOD[0])
    def head(p, K):
        x, y = K['head']
        if hooded:
            p.poly([(x - 12, y + 14), (x - 12, y - 4), (x - 4, y - 18), (x + 2, y - 14), (x + 12, y - 4), (x + 12, y + 10), (x + 4, y + 16)], HOOD[1])
            p.l(x - 4, y - 18, x + 12, y - 4, HOOD[2]); p.l(x - 12, y - 4, x - 12, y + 14, HOOD[0], 2)
            if eyes:
                p.r(x + 3, y - 3, x + 9, y - 1, (8, 6, 8)); p.p(x + 7, y - 2, (230, 40, 30)); p.p(x + 5, y - 2, (130, 20, 16))
            else:
                p.r(x + 3, y - 3, x + 9, y - 1, (8, 6, 8))
            p.r(x + 5, y + 6, x + 10, y + 8, (8, 6, 8))
        else:
            ell(p, x, y, 9, 9, SKIN[1]); p.p(x + 5, y - 2, BLK[0]); p.l(x + 3, y + 5, x + 8, y + 5, (90, 30, 30))
            p.arc(x - 9, y - 9, x + 9, y + 9, 200, 320, SKIN[0])
    def front(p, K):
        x, y = K['handF']
        if ax is not None:
            big_axe(p, x, y, ax, 34)
        ell(p, x, y, 4, 4, SKIN[1]); p.r(x - 4, y - 7, x + 4, y - 3, LEATH[1])
    rig(p, 40, f, LL=32, TL=28, HR=10, step=step, bob=bob, lean=lean, crouch=crouch, legs=(LEATH[0], LEATH[1]), leg_w=11,
        body=(SKIN[1], SKIN[2]), body_w=(14, 14), arms=(SKIN[1], SKIN[2]), arm_w=8, AL=26, aB=aB, aF=aF, skin=SKIN,
        hands=SKIN[1], shoes=BLK[1], on_far=far, on_torso=torso, on_head=head, on_front=front)
    for fx, fy in K0['feet']:
        p.r(fx - 5, f - 12, fx + 5, f - 1, LEATH[0]); p.r(fx - 5, f - 3, fx + 10, f, BLK[0]); p.l(fx - 5, f - 12, fx + 5, f - 12, LEATH[2])
    if chain is not None:
        bx, by = K0['handB']
        cx_, cy_ = chain
        n = int(max(abs(cx_ - bx), abs(cy_ - by)) / 3) + 1
        for j in range(1, n):
            t = j / n
            p.p(bx + (cx_ - bx) * t, by + (cy_ - by) * t + math.sin(t * math.pi) * 3, I2 if j % 2 else I1)
        hook(p, cx_, cy_, 0, 1.2)
    im = outline_same(p.im)
    if chips:
        q = Pic(BS, BS)
        r2 = random.Random(70 + chips)
        for j in range(10):
            a = -math.pi / 2 + r2.uniform(-1.2, 1.2)
            d = 4 + chips * 6 + r2.uniform(0, 6)
            x, y = 98 + math.cos(a) * d * 0.8, f - 2 + math.sin(a) * d
            q.r(x, y, x + 1, y + 1, PST[r2.randrange(2, 5)])
        q.lines([(86, f), (92, f - 1), (100, f), (108, f - 1), (113, f)], (20, 20, 20))
        im = on(im, outline_same(q.im))
    return im


@builder('executioner')
def make_executioner():
    R = execu_frame
    save_boss('executioner', 'idle', [R(bob=(0, 0, 1, 1, 0)[i], aF=(0.9 + (0, 0.03, 0.06, 0.03, 0)[i], 0.3), ax=0.9 + (0, 0.03, 0.06, 0.03, 0)[i]) for i in range(5)])
    save_boss('executioner', 'attack', [R(aF=(1.9, 0.4), ax=2.4, lean=-2, crouch=2), R(aF=(2.2, 0.3), ax=2.6, lean=-5, crouch=7),
                                        R(aF=(2.2, 0.1), ax=2.3, lean=1, crouch=2), R(aF=(1.5, 0.1), ax=1.0, lean=4, crouch=4, chips=1),
                                        R(aF=(1.3, 0.2), ax=0.95, lean=4, crouch=3, chips=2), R(aF=(1.1, 0.3), ax=0.9, lean=2)])
    save_boss('executioner', 'cast', [R(aB=(2.6, 0.6), lean=-3, chain=(30, 18)), R(aB=(2.2, 0.2), lean=2, chain=(84, 30)),
                                      R(aB=(1.8, 0.0), lean=3, chain=(104, 44)), R(aB=(1.4, 0.2), lean=-2, chain=(92, 60)),
                                      R(aB=(0.8, 0.6), lean=-4, chain=(74, 66)), R(aB=(0.2, 0.6), lean=-1)])
    save_boss('executioner', 'hurt', [flash(R(lean=-5, eyes=0, aF=(1.4, 0.4), ax=1.6), WHITE), R(lean=-3, aF=(1.1, 0.3), ax=1.2), R(lean=-1)])
    base = R(eyes=0, aF=(0.4, 0.2), aB=(-0.1, 0.2), ax=None)
    q = Pic(BS, BS); big_axe(q, 40, BS_FEET - 6, 1.62, 34); ax_im = outline_same(q.im)
    fallen = lambda k: fall(base, k, 90, BS, BS_FEET)
    save_boss('executioner', 'death', [flash(R(lean=-5, eyes=0, aF=(1.6, 0.5), ax=2.0), WHITE), R(lean=-7, eyes=0, crouch=6, aF=(1.8, 0.4), aB=(2.0, 0.4), ax=2.3),
                                       fallen(0.3), fallen(0.6), on(ax_im, fallen(0.9)), on(ax_im, fallen(1.0)), on(ax_im, fallen(1.0))])


# ================================================================== THE TIDE PRIEST (drawn, 116x116)
def shell_staff(p, x, y, a, L=70, glow=0):
    """A driftwood staff held at (x, y), along a (from straight down, positive forward; the top end is the far end of
    the upper part) with a big spiral shell on top; glow 1..3 lights the shell sea-green."""
    tx, ty = pt(a, L * 0.7, x, y)
    bx, by = pt(a + math.pi, L * 0.3, x, y)
    p.l(bx, by, tx, ty, (70, 60, 46), 3); p.l(bx, by, tx, ty, (110, 96, 72), 1)
    for t in (0.2, 0.5):
        q = pt(a, L * 0.7 * t, x, y)
        p.p(q[0], q[1], WEED[2]); p.p(q[0] + 1, q[1] + 1, WEED[3])
    sx, sy = pt(a, 6, tx, ty)
    ell(p, sx, sy, 9, 7, SHELL[1]); ell(p, sx - 1, sy - 1, 7, 5, SHELL[2])
    pts = [(sx + math.cos(t) * t * 1.1, sy + math.sin(t) * t * 0.85) for t in np.linspace(0.5, 3 * math.pi, 26)]
    p.lines(pts, SHELL[0])
    p.poly([(sx + 7, sy - 3), (sx + 13, sy - 1), (sx + 8, sy + 3)], SHELL[3])
    if glow:
        p.e(sx - 2, sy - 2, sx + 2, sy + 2, TEAL[min(3, glow)])
    return sx, sy


def tide_frame(step=None, bob=0, lean=0.0, aF=(0.4, 0.6), aB=(-0.2, 0.5), st=2.8, glow=0, eyes=1, mouth=0, crouch=0, splash=0, water=0, hooded=True):
    """Side view facing right: the tide priest - a tall fish-headed priest (green-grey scales, a huge pale eye, a wide
    lipless mouth with needle teeth, gill flaps) in a ragged sea-green mantle and hood with barnacles and hanging
    seaweed and a frayed hem, webbed hands; the front hand holds the shell staff (st = angle, glow lights it); splash =
    a wave thrown forward along the floor (1..3), water = brine rising round his feet (1..3)."""
    p = Pic(BS, BS)
    f = BS_FEET
    K0 = {}
    def far(p, K):
        K0.update(K)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        hem = [(hx + 18 - j * 6, f - 2 - (j % 2) * 4) for j in range(7)]
        p.poly([(sx - 12, sy - 2), (sx + 10, sy - 2), (hx + 18, f - 2)] + hem + [(hx - 18, f - 3)], ROBE[1])
        p.l(sx + 10, sy - 2, hx + 18, f - 2, ROBE[3]); p.l(sx - 2, sy + 4, hx - 4, f - 6, ROBE[0], 2); p.l(sx + 4, sy + 6, hx + 6, f - 8, ROBE[2])
        r2 = random.Random(7)
        for _ in range(8):
            x, y = r2.uniform(hx - 12, hx + 12), r2.uniform(sy + 4, f - 12)
            p.p(x, y, (190, 190, 176)); p.p(x + 1, y, (140, 140, 130))
        for x0 in (sx - 8, sx + 2, hx + 10):
            p.lines([(x0, sy + 2), (x0 - 1, sy + 14), (x0 + 1, sy + 24)], WEED[2], 2)
        p.r(hx - 14, hy - 2, hx + 14, hy + 2, WEED[1])
    def head(p, K):
        x, y = K['head']
        if hooded:
            p.poly([(x - 14, y + 14), (x - 12, y - 8), (x - 2, y - 16), (x + 8, y - 12), (x + 4, y - 6), (x - 4, y + 2), (x - 2, y + 16)], ROBE[1])
            p.l(x - 2, y - 16, x + 8, y - 12, ROBE[3])
        ell(p, x + 6, y + 1, 10, 8, FISH[2]); p.poly([(x + 8, y - 4), (x + 22, y + 1), (x + 20, y + 8), (x + 6, y + 9)], FISH[2])
        p.arc(x - 3, y - 6, x + 15, y + 8, 200, 330, FISH[4])
        p.l(x + 8, y + 7 + mouth, x + 21, y + 3, (30, 14, 18), 2 + mouth)
        for j in range(5):
            p.p(x + 10 + j * 2, y + 5 - j * 0.3, WHITE)
        for j in range(3):
            p.l(x + 1 + j * 2, y + 2, x + j * 2, y + 7, FISH[0])
        if eyes:
            ell(p, x + 11, y - 2, 3.4, 3.4, (226, 230, 200)); p.e(x + 11, y - 3, x + 13, y - 1, BLK[0])
        else:
            p.l(x + 8, y - 2, x + 14, y - 2, BLK[0], 2)
        for j, cx_ in enumerate((x - 6, x, x + 6)):                        # a crown of shells and coral
            p.poly([(cx_ - 2, y - 12), (cx_, y - 20 + (j % 2) * 3), (cx_ + 2, y - 12)], SHELL[2] if j != 1 else (200, 80, 70))
    def front(p, K):
        x, y = K['handF']
        if st is not None:
            shell_staff(p, x, y, st, 56, glow)
        for j in range(3):
            p.l(x, y, x + 4, y - 2 + j * 2, FISH[1])
        ell(p, x, y, 3.6, 3.6, FISH[3])
    rig(p, 38, f, LL=32, TL=28, HR=10, step=step, bob=bob, lean=lean, crouch=crouch, legs=(ROBE[0], ROBE[1]), leg_w=10,
        body=(ROBE[1], ROBE[2]), body_w=(13, 13), arms=(ROBE[1], ROBE[2]), arm_w=7, AL=28, aB=aB, aF=aF, skin=FISH,
        hands=FISH[3], shoes=FISH[1], on_far=far, on_torso=torso, on_head=head, on_front=front)
    im = outline_same(p.im)
    q = Pic(BS, BS)
    if glow:
        sx, sy = pt(st, 56 * 0.7 + 6, *K0['handF'])
        halo(q, sx, sy, 4 + glow * 2, (TEAL[1], TEAL[2]), 8 + glow * 2, glow)
    if water:
        for j in range(water * 3 + 2):
            y = f - j
            w = 28 + water * 6 - j * 2
            q.l(max(2, 40 - w), y, 40 + w, y, SEA[3] if j % 2 else SEA[4])
        for x in range(max(3, 40 - 28 - water * 6), 40 + 28 + water * 6, 6):
            q.p(x, f - water * 3 - 2, WHITE)
    if splash:
        x0 = 66 + splash * 7
        for j in range(5 + splash * 2):
            a = j / (4 + splash * 2) * math.pi
            q.l(x0 - math.cos(a) * 10, f - math.sin(a) * (8 + splash * 5), x0 - math.cos(a) * 10 + 2, f - math.sin(a) * (8 + splash * 5) - 2, TEAL[2] if j % 2 else WHITE, 2)
        q.poly([(x0 - 14, f), (x0 - 4, f - 8 - splash * 4), (x0 + 6, f - 4), (x0 + 12, f)], SEA[3])
    return on(im, outline_same(q.im) if (water or splash) else q.im)


def brine(k):
    q = Pic(BS, BS)
    w = 20 + k * 34
    q.e(56 - w, BS_FEET - 4 - (1 - k) * 2, 56 + w, BS_FEET, SEA[3]); q.e(56 - w + 4, BS_FEET - 3, 56 + w - 6, BS_FEET - 1, SEA[4])
    return outline_same(q.im)


@builder('tidepriest')
def make_tidepriest():
    R = tide_frame
    save_boss('tidepriest', 'idle', [R(bob=(0, 0, 1, 1, 0)[i], st=2.8 + (0, 0.03, 0.06, 0.03, 0)[i], glow=(0, 0, 1, 0, 0)[i]) for i in range(5)])
    save_boss('tidepriest', 'attack', [R(aF=(0.0, 0.6), st=3.6, lean=-3), R(aF=(-0.1, 0.6), st=3.45, lean=-3, glow=1),
                                       R(aF=(1.3, 0.2), st=2.4, lean=2, splash=1), R(aF=(1.4, 0.0), st=2.45, lean=3, splash=2, mouth=1),
                                       R(aF=(1.4, 0.2), st=2.45, lean=3, splash=3, mouth=1), R(aF=(0.8, 0.5), st=2.6, lean=1)])
    save_boss('tidepriest', 'cast', [R(aF=(1.3, 0.6), st=2.6, glow=1, mouth=1), R(aF=(1.5, 0.5), st=2.65, glow=2, mouth=2, water=1),
                                     R(aF=(1.45, 0.4), st=2.6, glow=3, mouth=2, water=2), R(aF=(1.45, 0.4), st=2.6, glow=3, mouth=2, water=3),
                                     R(aF=(1.5, 0.5), st=2.65, glow=2, mouth=1, water=2), R(aF=(1.3, 0.6), st=2.6, glow=1, water=1)])
    save_boss('tidepriest', 'hurt', [flash(R(lean=-5, eyes=0, mouth=2), WHITE), R(lean=-3, mouth=1), R(lean=-1)])
    base = R(eyes=0, mouth=2, aF=(0.4, 0.2), aB=(-0.1, 0.2), st=None)
    q = Pic(BS, BS); shell_staff(q, 34, BS_FEET - 5, 1.62, 60); stf = outline_same(q.im)
    fallen = lambda k: fall(base, k, 90, BS, BS_FEET)
    melt = lambda k: on(brine(k), squash(fallen(1.0), 1 - k * 0.8, BS_FEET + 1))
    save_boss('tidepriest', 'death', [flash(R(lean=-5, eyes=0, mouth=2), WHITE), fallen(0.3), fallen(0.65), on(stf, fallen(1.0)),
                                      on(stf, melt(0.4)), on(stf, melt(0.75)), on(stf, brine(1.0))])


# ================================================================== PROPS
def hangcage(k):
    """A hanging cage (32x64 cell): k 0 = hanging from a ceiling chain - a domed iron birdcage of bars with a skeleton
    slumped inside; 1 = fallen and burst open on the floor (bent bars, the door off, bones spilled)."""
    p = Pic(32, 64)
    if not k:
        for j in range(7):
            p.e(15, j * 3, 17, j * 3 + 3, I2 if j % 2 else I1)
        p.e(14, 20, 18, 24, I1)
        x0, x1, y0, y1 = 5, 27, 26, 50
        p.r(x0, y0 + 4, x1, y1, (14, 12, 12))                                  # dark inside
        ell(p, 13, y1 - 9, 3, 3, (210, 204, 186)); p.p(12, y1 - 9, BLK[0]); p.p(14, y1 - 9, BLK[0])  # skull
        p.l(14, y1 - 6, 17, y1 - 1, (200, 194, 176), 2); p.l(11, y1 - 4, 20, y1 - 3, (190, 184, 166)); p.l(17, y1 - 1, 23, y1 - 2, (190, 184, 166))
        p.arc(x0, y0 - 2, x1, y0 + 10, 180, 360, I1, 2)
        for x in range(x0, x1 + 1, 4):
            p.l(x, y0 + 4, x, y1, I1); p.p(x, y0 + 4, I2)
        p.l(x0, y1, x1, y1, I1, 2); p.l(x0, y0 + 14, x1, y0 + 14, I1); p.l(x0, y1, x1, y1, I0)
        p.l(16, y0 - 2, 16, y0 + 4, I1)
    else:
        b = 61
        p.poly([(3, b), (5, b - 12), (12, b - 17), (22, b - 15), (29, b - 8), (29, b)], (14, 12, 12))
        for x in (5, 9, 13, 17, 21, 25):
            p.l(x, b, x + (x - 16) * 0.3, b - 14 + abs(x - 16) * 0.3, I1)
        p.arc(4, b - 18, 28, b - 6, 190, 350, I1, 2); p.l(2, b, 30, b, I1, 2)
        p.l(24, b - 4, 31, b - 9, I2)
        ell(p, 10, b - 3, 3, 2.5, (210, 204, 186)); p.p(9, b - 3, BLK[0]); p.l(14, b - 1, 22, b - 2, (200, 194, 176), 2)
        for j in range(4):
            p.e(15 + j * 2, b - 22 + j * 3, 17 + j * 2, b - 19 + j * 3, I2 if j % 2 else I1)
    return outline_same(p.im)


def rack():
    """A torture rack: a heavy wooden bed frame on four legs with a roller and spoked wheel at each end, ropes and iron
    cuffs."""
    p = Pic(56, 40)
    for x in (4, 48):
        p.r(x, 18, x + 3, 39, WD1); p.l(x, 18, x, 39, WD3)
    p.r(2, 16, 53, 22, WD2); p.l(2, 16, 53, 16, WD4); p.r(2, 22, 53, 24, WD1)
    for x in (8, 46):
        ell(p, x, 14, 5, 5, WD1); ell(p, x, 14, 3.5, 3.5, WD3)
        for j in range(4):
            a = j / 4 * math.pi + 0.3
            p.l(x - math.cos(a) * 7, 14 - math.sin(a) * 7, x + math.cos(a) * 7, 14 + math.sin(a) * 7, WD2, 2)
        p.p(x, 14, I3)
    p.l(12, 14, 44, 14, ROPE[1]); p.l(12, 13, 44, 13, ROPE[2])
    for x in (20, 36):
        p.e(x - 2, 11, x + 2, 15, I1); p.p(x, 12, I3)
    p.p(28, 21, BLOOD[1]); p.p(31, 20, BLOOD[0])
    return outline_same(p.im)


def gallows(k):
    """A gallows: a tall post on a stepped base, a cross beam with a brace, a rope with a noose swinging gently (2)."""
    p = Pic(48, 64)
    p.r(4, 58, 30, 63, WD1); p.l(4, 58, 30, 58, WD3)
    p.r(10, 4, 14, 58, WD2); p.l(10, 4, 10, 58, WD4); p.l(14, 4, 14, 58, WD0)
    p.r(8, 2, 44, 6, WD2); p.l(8, 2, 44, 2, WD4)
    p.l(14, 18, 26, 6, WD1, 3)
    sw = (-1.5, 1.5)[k]
    tx, ty = 38 + sw, 26
    p.l(38, 6, tx, ty, ROPE[1], 2)
    p.e(tx - 4, ty, tx + 4, ty + 10, ROPE[1]); p.e(tx - 2, ty + 2, tx + 2, ty + 8, (0, 0, 0, 0))
    p.r(tx - 1, ty - 2, tx + 1, ty + 1, ROPE[3])
    return outline_same(p.im)


def harborlamp(k):
    """A harbour lamp post: a black iron post with a scrolled arm, a four-sided lantern with a warm flame (2 frames, it
    flickers) and a glow halo."""
    p = Pic(36, 64)
    p.r(16, 18, 19, 60, (28, 28, 32)); p.l(16, 18, 16, 60, (60, 60, 66))
    p.r(12, 58, 23, 63, (28, 28, 32)); p.l(12, 58, 23, 58, (60, 60, 66))
    p.arc(10, 14, 22, 26, 180, 270, (28, 28, 32), 2)
    p.poly([(11, 4), (25, 4), (22, 0), (14, 0)], (28, 28, 32))
    p.r(12, 5, 24, 18, (28, 28, 32)); p.r(14, 6, 22, 17, GLOW[1]); p.r(15, 7, 21, 16, GLOW[2])
    p.l(18, 6, 18, 17, (28, 28, 32))
    flame(p, 18, 15, 6 + k, 0.4 - k * 0.8, 0.9)
    im = outline_same(p.im)
    q = Pic(36, 64)
    halo(q, 18, 11, 12, (GLOW[1], GLOW[2]), 14, k + 3)
    return on(q.im, im)


def fishbarrel(k):
    """A fish barrel: an oak barrel with iron hoops, silver fish tails sticking out of the brine at the top; k 1 = broken:
    burst staves and fish spilled on the floor."""
    p = Pic(30, 36)
    FS = ((90, 100, 110), (150, 160, 170), (210, 216, 220))
    if not k:
        p.poly([(5, 8), (25, 8), (27, 20), (25, 34), (5, 34), (3, 20)], WD2)
        for x in (8, 13, 18, 23):
            p.l(x, 9, x, 33, WD1)
        p.l(6, 9, 6, 33, WD4)
        for y in (11, 20, 30):
            p.l(4, y, 26, y, I1, 2); p.l(4, y - 1, 26, y - 1, I2)
        p.e(5, 5, 25, 11, SEA[2]); p.e(7, 6, 23, 9, SEA[3])
        for x, a in ((10, -0.5), (16, 0.2), (21, 0.7)):
            p.poly([(x, 7), (x - 2 + a * 2, 1), (x + a * 2, 3), (x + 2 + a * 2, 0), (x + 2, 7)], FS[1]); p.p(x + 1, 5, FS[2])
    else:
        p.poly([(5, 24), (9, 20), (13, 24), (17, 19), (21, 23), (25, 21), (27, 28), (25, 34), (5, 34), (3, 28)], WD2)
        p.l(4, 30, 26, 30, I1, 2)
        for x, y, a in ((2, 33, 0.3), (24, 32, -0.4)):
            p.l(x, y, x + 6, y - 3 + a * 4, WD3, 2)
        for x, y in ((6, 35), (16, 35), (22, 34)):
            ell(p, x, y - 1, 4, 1.5, FS[1]); p.poly([(x - 4, y - 1), (x - 7, y - 3), (x - 7, y + 1)], FS[0]); p.p(x + 3, y - 2, BLK[0])
    return outline_same(p.im)


def anchor():
    """A big rusty ship's anchor standing on its crown against a coil of rope: shank, stock, two flukes, a ring."""
    p = Pic(40, 52)
    p.e(4, 40, 36, 51, ROPE[1]); p.arc(6, 41, 34, 50, 180, 360, ROPE[2]); p.arc(10, 43, 30, 49, 180, 360, ROPE[0])
    p.r(18, 8, 22, 46, I1); p.l(18, 8, 18, 46, I2)
    p.r(9, 12, 31, 15, WD2); p.l(9, 12, 31, 12, WD4)
    p.e(15, 1, 25, 10, I1); p.e(17, 3, 23, 8, (0, 0, 0, 0))
    p.arc(6, 28, 34, 48, 0, 180, I1, 3)
    p.poly([(4, 36), (8, 30), (10, 38)], I2); p.poly([(36, 36), (32, 30), (30, 38)], I2)
    rust = [(20, 20), (19, 30), (12, 44), (28, 42), (21, 38)]
    for x, y in rust:
        p.p(x, y, RUST[2]); p.p(x + 1, y + 1, RUST[1])
    return outline_same(p.im)


@builder('props')
def make_props():
    save_prop('hangcage', [hangcage(k) for k in range(2)], 32, 64)
    save_prop('rack', [rack()])
    save_prop('gallows', [gallows(k) for k in range(2)], 48, 64)
    save_prop('harborlamp', [harborlamp(k) for k in range(2)], 36, 64)
    save_prop('fishbarrel', [fishbarrel(k) for k in range(2)], 30, 36)
    save_prop('anchor', [anchor()])


# ================================================================== ITEMS, PARTICLES AND ICONS
def scrap_sack():
    p = Pic(22, 20)
    p.poly([(3, 19), (2, 10), (6, 5), (16, 5), (20, 10), (19, 19)], (120, 100, 66)); p.poly([(5, 18), (4, 11), (7, 7), (10, 7), (8, 18)], (150, 128, 88))
    p.l(7, 5, 15, 5, ROPE[0], 2)
    p.poly([(8, 5), (7, 1), (10, 3)], I2); p.l(12, 5, 14, 0, I3); p.r(15, 2, 17, 4, RUST[2]); p.e(9, 0, 12, 3, I1)
    for x, y in ((12, 12), (15, 15), (10, 16)):
        p.p(x, y, (80, 64, 40))
    return outline_same(p.im)


def flail_pick():
    """The morning star lying on its side: a short ash handle with a leather grip, an iron cap, a chain and the spiked ball."""
    p = Pic(46, 20)
    p.l(2, 14, 18, 12, (110, 80, 48), 3); p.l(2, 14, 8, 13, LEATH[1], 3); p.e(0, 13, 3, 16, I2)
    p.r(18, 10, 21, 14, I1)
    for j in range(5):
        x = 22 + j * 3
        p.e(x, 10 + (j % 2), x + 3, 13 + (j % 2), I2 if j % 2 else I1)
    cx, cy = 38, 11
    for j in range(10):
        a = j / 10 * TAU
        p.l(cx, cy, cx + math.cos(a) * 7.5, cy + math.sin(a) * 7.5, I3)
    shade_ball(p, cx, cy, 5, (I0, I1, I2, I3))
    return outline_same(p.im)


def blunder_pick():
    """The blunderbuss lying on its side: a walnut stock, a brass barrel flaring into a wide bell, a flintlock."""
    p = Pic(52, 18)
    p.poly([(1, 11), (16, 8), (22, 9), (22, 12), (16, 13), (2, 17)], (86, 52, 30)); p.l(1, 11, 16, 8, (120, 76, 46))
    p.l(1, 11, 2, 17, BR3, 2)
    p.r(20, 7, 40, 10, BR2); p.l(20, 7, 40, 7, BR4); p.l(20, 10, 40, 10, BR0)
    p.poly([(40, 7), (48, 2), (50, 2), (50, 16), (48, 16), (40, 11)], BR2); p.l(48, 2, 48, 16, BR4); p.l(50, 3, 50, 15, BR0)
    p.r(16, 6, 20, 9, (90, 94, 104)); p.l(15, 5, 17, 3, (120, 124, 134))
    p.r(22, 11, 38, 12, (60, 36, 20))
    return outline_same(p.im)


@builder('items')
def make_items():
    im = scrap_sack()
    save(hard(im.crop(im.getbbox())), G_OUT + 'pick_scrap.png')
    save(hard(im.crop(im.getbbox())), G_OUT + 'item_scrap.png')
    im = flail_pick()
    save(hard(im.crop(im.getbbox())), G_OUT + 'pick_flail.png')
    im = blunder_pick()
    save(hard(im.crop(im.getbbox())), G_OUT + 'pick_blunderbuss.png')


@builder('particles')
def make_particles():
    fr = []                                                                   # flying scrap (2 frames 8x8: nail / bent bit)
    for k in range(2):
        p = Pic(8, 8)
        if k == 0:
            p.l(1, 6, 6, 1, I2); p.p(6, 1, I3); p.l(0, 5, 2, 7, I1)
        else:
            p.lines([(1, 2), (4, 3), (5, 6)], RUST[2]); p.p(6, 6, I2); p.p(2, 1, I3)
        fr.append(p.im)
    save(cells(fr, 8, 8), G_OUT + 'part_scrap.png', 2)
    fr = []                                                                   # brine (a drip, a splash)
    for k in range(2):
        p = Pic(8, 8)
        if k == 0:
            p.e(2, 2, 5, 7, (70, 120, 150)); p.p(3, 3, (180, 220, 230)); p.p(3, 1, (70, 120, 150))
        else:
            p.e(0, 5, 7, 7, (50, 90, 110)); p.p(1, 3, (120, 170, 190)); p.p(6, 2, (120, 170, 190)); p.p(3, 4, (180, 220, 230))
        fr.append(p.im)
    save(cells(fr, 8, 8), G_OUT + 'part_brine.png', 2)
    fr = []                                                                   # a glowing iron bar turning (the torturer's throw)
    for k in range(2):
        p = Pic(8, 8)
        if k == 0:
            p.l(0, 5, 7, 2, GLOW[1], 2); p.l(4, 3, 7, 2, GLOW[3])
        else:
            p.l(2, 0, 5, 7, GLOW[1], 2); p.l(4, 4, 5, 7, GLOW[3])
        fr.append(p.im)
    save(cells(fr, 8, 8), G_OUT + 'part_hotiron.png', 2)


@builder('icons')
def make_icons():
    p = Pic(8, 8)                                                             # HUD: caught in a net
    p.bitmap(0, 0, ["#..#..#.", ".#.#.#..", "..###...", "#######.", "..###...", ".#.#.#..", "#..#..#.", "........"], {'#': WHITE})
    save(p.im, G_OUT + 'icon_net.png')
    p = Pic(8, 8)                                                             # HUD: the alarm is raised (a bell)
    p.bitmap(0, 0, ["...#....", "..###...", ".#####..", ".#####..", ".#####..", "#######.", "...#....", "........"], {'#': WHITE})
    save(p.im, G_OUT + 'icon_alarm.png')


# ================================================================== CONTACT SHEET AND CHECKS
NEW_WEAPONS = ('flail', 'blunderbuss')


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
    for sh in ('turnkey', 'convict', 'torturer', 'watchdog', 'drownedfisher', 'fishman', 'shorecrab', 'gulls'):
        have = [st for st in ('idle', 'movement', 'attack', 'take_damage', 'death') if G_OUT + f'enemies-{sh}_{st}.png' in man]
        if have and len(have) != 5:
            print('INCOMPLETE ENEMY SET:', sh, have)
    for b in ('executioner', 'tidepriest'):
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
    out.save(SCR + 'v21_tiles.png')


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
