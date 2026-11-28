#!/usr/bin/env python3
"""Version 19 graphics for Krypta ("Gruvan och Observatoriet"): the abandoned mine and the star observatory, eight new
enemies, the mine foreman and the star seer, textures, props, items, particles and HUD icons.

Run from anywhere (the paths are taken from this file's place in the repo):
    python3 tools/props16/make.py [name ...]
(with names only those builders run, e.g. `python3 tools/props16/make.py miner sheet`; the contact sheet always shows
everything this script has written so far, plus the two new first-person weapons)

The first-person weapons pickaxe / starlance (fp_*.png, js/weapons.js) come from tools/weapon-frames (render-static.mjs +
pack.py, see the README there, version 19); their static-defs.json entries are built by tools/props16/fp_defs.py.

Out to assets/gfx (all enemy cells 64x64, feet row 57, facing right; frames idle 4, movement 6, attack 6, take_damage 3,
death 6; every death ends lying / settled on the floor, flyers included):
  enemies-miner_*        a grimy miner in a leather helmet with a carbide lamp, a beard, a blue work shirt with braces
                         and a pickaxe; attack = the overhead pick blow
  enemies-coalgolem_*    a hulking golem of coal lumps with glowing orange seams and ember eyes; attack = a two-fisted
                         slam; death bursts into a smouldering heap of coal
  enemies-moleman_*      a hunched mole man with velvet brown fur, a pink star nose, tiny eyes, a miner's lamp and huge
                         digging claws; attack = the claw swipe; death sinks into a mound of dirt
  enemies-sparkwisp_*    a small will-o'-the-wisp of the mine galleries (about 16 px, drawn low - the game lifts flyers):
                         a hot core in a flickering flame with sparks; death = it pops and a smoking cinder lies on the floor
  enemies-starspawn_*    a flying violet five-pointed star creature with one eye and a stardust trail (about 26 px,
                         drawn low); attack = it flares and spits a star shard; death falls and fades on the floor
  enemies-astronomer_*   a scholar in a deep-blue starry robe and a tall hat with brass spectacles and a brass rod;
                         attack = both arms up, calling a small meteor down from above
  enemies-clockowl_*     a brass clockwork owl (about 28 px, drawn low) with gear eyes and riveted wings; attack = the
                         dive with talons forward; death falls apart into gears on the floor
  enemies-voidwatcher_*  a big hovering eye (about 40 px) in a dark violet lidded shell with a starry iris and trailing
                         tendrils, low in the cell; attack = the eye flares pale blue (the slowing star-cold ray);
                         death deflates onto the floor
  boss_foreman_{idle,attack,cast,hurt,death}.png, boss_starseer_{...}.png (116x116 cells, feet row 115; idle 5,
      attack 6, cast 6, hurt 3, death 7; attack and cast loop while the state lasts, so they start and end in similar
      poses).  The foreman (a giant miner: helmet with a burning lamp, a bushy moustache, a barrel chest in a stained
      vest with braces, rolled sleeves, heavy boots and a great sledgehammer): attack = the sledge swung overhead and
      slammed down (rock chips fly), cast = he lights a stick of dynamite in the back hand and hurls it, bellowing;
      death topples him backwards and the helmet rolls away.
      The star seer (a hovering figure in a midnight-blue mantle strewn with stars and edged in gold, a deep hood with two
      glowing eyes, a brass telescope staff; no feet, a faint glow under the hem): attack = the staff levelled and a star
      shot bursting from its lens, cast = the staff raised high with a constellation drawing itself round him; death
      collapses the empty mantle onto the floor.
  prop_minecart.png (2: empty / loaded with ore - the same picture is used for the rolling carts),
  prop_dynamite.png (1), prop_carbidelamp.png (2, flickering), prop_orrery.png (3, the planets turning),
  prop_telescope.png (1), prop_starportal.png (2, the starfield swirling), prop_boulder2.png (1, a fallen boulder),
  item_stardust.png, pick_pickaxe.png, pick_starlance.png,
  part_coal.png (2, 8x8), part_stardust.png (3, 8x8), part_meteor2.png (2, 12x12, falling down-left with a tail up-right),
  part_gasbubble.png (2, 8x8), icon_lowgrav.png, icon_gas.png (8x8, white)
Out to assets/wall:
  wall_timber, wall_orevein, wall_boss_foreman, wall_brass2, wall_starchart, wall_boss_starseer (64x128)
  floor_minedirt, floor_planks2, floor_boss_foreman, floor_brasstile, floor_boss_starseer, floor_rail (a crossing that
  reads both ways), floor_rail_h, floor_rail_v (straight track, rails left-right / up-down), floor_gas2, floor_cavein,
  floor_starmap, floor_domeslit (64x64); all palettized, mean brightness checked to stay in 40-115
Contact sheet: <scratchpad>/en/v19_sheet.png, seam check <scratchpad>/en/v19_tiles.png

Sources: everything is drawn procedurally below in the outlined style of tools/props2-props15, whose drawing helpers are
reused (no outside image is used).
Suggested sizes (skeleton = 1.0; apparent height = size x figure px / cell px; body heights measured without trails, light
pixels or held tools above the head): miner 1.0 (42 px with the helmet), coalgolem 1.35 (41 px, heavy), moleman 0.95
(34 px hunched, 38 wide), sparkwisp 0.45 (16 px flame, float), starspawn 0.6 (24 px star, float), astronomer 1.0 (52 px
with the tall hat, the man 40), clockowl 0.6 (31 px with wings, float), voidwatcher 1.0 (36 px eye + tendrils 44 px,
float - big); bosses (116 px cells): foreman 4.2 (97 px with the helmet, a giant), starseer 4.0 (103 px with the
staff, the figure 90, hovering).
Floors: floor_rail is a crossing (rails both ways); floor_rail_h / floor_rail_v are straight track for the game to pick by
the neighbouring rail tiles; floor_domeslit is an even wash of starlight (no direction).
Name clashes (existing files are never overwritten, save() refuses): wall_brass.png exists (the clockwork tower), so the
observatory's brass panel is wall_brass2.png; prop_boulder.png and part_meteor.png exist, the new ones are prop_boulder2 /
part_meteor2 as the contract says.
"""
import importlib.util
import json
import math
import os
import random
import re
import sys

sys.dont_write_bytecode = True          # the helper modules of props2-props15 are loaded without writing __pycache__

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))


def _load(name, rel):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, '..', rel, 'make.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


P15 = _load('props15make', 'props15')          # loads props2-props14 itself; only pure drawing helpers are used
P14 = P15.P14
P13, P12, P2, P3, P5, P6, P7, P8, P10 = P14.P13, P14.P12, P14.P2, P14.P3, P14.P5, P14.P6, P14.P7, P14.P8, P14.P10
from_p2 = 'OUT Pic outline outline_same hard shift gmap blend tint shear squash strip'.split()
globals().update({k: getattr(P2, k) for k in from_p2})
cut_below, topple, pool = P12.cut_below, P12.topple, P12.pool
pnoise, spark, ground = P5.pnoise, P5.spark, P5.ground
dark, flash, tube, bez = P6.dark, P6.flash, P6.tube, P6.bez
puff, feather, bolt = P7.puff, P7.feather, P7.bolt
chain, sparkles = P8.chain, P8.sparkles
flame, halo, put = P10.flame, P10.halo, P10.put
limb, dust, wrap_pic, star5, poly_r = P13.limb, P13.dust, P13.wrap_pic, P13.star5, P13.poly_r
ell, shade_ball, on, cells = P14.ell, P14.shade_ball, P14.on, P14.cells
rig, fall, pt, stops, stone_rgb = P15.rig, P15.fall, P15.pt, P15.stops, P15.stone_rgb
I0, I1, I2, I3 = P2.I0, P2.I1, P2.I2, P2.I3
F0, F1, F2, F3 = P2.F0, P2.F1, P2.F2, P2.F3
AU0, AU1, AU2, AU3, AU4 = P5.AU0, P5.AU1, P5.AU2, P5.AU3, P5.AU4                # gold
BR0, BR1, BR2, BR3, BR4 = P7.BR0, P7.BR1, P7.BR2, P7.BR3, P7.BR4                # brass
WD0, WD1, WD2, WD3, WD4 = P10.WD0, P10.WD1, P10.WD2, P10.WD3, P10.WD4           # dark wood
SKIN, BLK, PAINT = P15.SKIN, P15.BLK, P15.PAINT

G_OUT, W_OUT = ROOT + '/assets/gfx/', ROOT + '/assets/wall/'
SCR = '/tmp/claude-0/-home-user/80ee56ba-2fa6-5354-b261-a4ca4fdcb508/scratchpad/en/'
SHEET, MANIFEST = SCR + 'v19_sheet.png', SCR + 'v19_manifest.json'
WHITE = (255, 255, 255)
FW, FEET = 64, 57                                       # enemy cells
BS, BS_FEET = 116, 115                                  # boss cells
TAU = math.tau

# ---------------------------------------------------------------- mine palettes
ROCK = ((26, 24, 26), (46, 42, 44), (70, 64, 62), (98, 90, 84), (128, 118, 108))         # dark mine rock
DIRT = ((34, 24, 16), (56, 40, 26), (80, 60, 38), (106, 82, 54), (134, 108, 74))          # packed mine dirt
TIM = ((40, 24, 12), (70, 44, 22), (102, 68, 36), (136, 96, 54), (168, 128, 78))         # timber
COAL = ((10, 10, 12), (24, 24, 28), (40, 40, 46), (62, 62, 70), (92, 92, 100))
EMB = ((120, 30, 8), (200, 70, 14), (250, 140, 30), (255, 220, 120))                      # embers
ORE = ((120, 80, 10), (200, 150, 30), (250, 210, 80), (255, 245, 180))                    # gold ore
CU = ((70, 30, 14), (130, 64, 30), (190, 110, 56), (230, 160, 100))                       # copper ore
DEN = ((18, 26, 44), (34, 50, 80), (56, 80, 118), (90, 118, 158))                         # denim
LEA = ((40, 24, 14), (74, 46, 26), (110, 74, 44), (146, 104, 66))                         # leather
FUR = ((30, 20, 16), (56, 38, 30), (84, 60, 46), (116, 88, 70))                           # mole fur
PINK = ((120, 50, 60), (190, 100, 110), (236, 150, 160), (255, 200, 205))
GAS = ((40, 70, 20), (80, 130, 40), (140, 190, 70), (200, 240, 140))
LAMP = ((255, 190, 80), (255, 230, 150), (255, 250, 220))
# ---------------------------------------------------------------- observatory palettes
NAVY = ((16, 20, 46), (28, 36, 78), (44, 56, 110), (70, 86, 146), (110, 128, 186))      # midnight blue
VIO = ((34, 14, 52), (70, 30, 104), (116, 56, 160), (170, 104, 210), (220, 170, 250))    # star violet
STAR = ((150, 170, 230), (210, 220, 255), (255, 255, 255))
ICE = ((70, 110, 170), (130, 180, 230), (200, 230, 255), (240, 250, 255))                 # star cold
ROBE = ((14, 18, 44), (26, 32, 74), (42, 52, 108), (66, 80, 140))

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


def x2(rgb):
    return np.kron(rgb, np.ones((2, 2, 1)))


# ================================================================== MINE TEXTURES
def rock_rgb(w, h, seed, pal=ROCK, k=1.0):
    """Rough mine rock (tiles both ways): noisy facets with dark cracks."""
    nz = pnoise(w, h, seed, ((16, 1.0), (8, 0.6), (4, 0.4), (2, 0.2)))
    cr = pnoise(w, h, seed + 3, ((8, 1.0), (4, 0.5)))
    lum = np.clip(0.2 + nz * 0.6 * k, 0, 1)
    rgb = gmap(lum, stops(pal))
    crack = np.abs(cr - 0.5) < 0.03
    rgb[crack] = pal[0]
    return rgb


def plank_v(rgb, x0, x1, y0, y1, seed, pal=TIM, k=1.0):
    """A vertical timber post / plank drawn into rgb (columns x0..x1-1, rows y0..y1-1) with grain and an edge light."""
    r2 = random.Random(seed)
    for x in range(x0, x1):
        t = (x - x0) / max(1, x1 - x0 - 1)
        base = 0.55 - abs(t - 0.4) * 0.5 + r2.uniform(-0.05, 0.05)
        for y in range(y0, y1):
            g = base + 0.12 * math.sin(y * 0.7 + x * 2.1 + seed) * (r2.random() < 0.7)
            rgb[y % rgb.shape[0], x % rgb.shape[1]] = gmap(np.array([[np.clip(g * k, 0, 1)]]), stops(pal))[0, 0]
    rgb[y0:y1, x0 % rgb.shape[1]] = pal[3]
    rgb[y0:y1, (x1 - 1) % rgb.shape[1]] = pal[0]


def plank_h(rgb, x0, x1, y0, y1, seed, pal=TIM, k=1.0):
    t = np.transpose(rgb, (1, 0, 2)).copy()
    plank_v(t, y0, y1, x0, x1, seed, pal, k)
    rgb[:] = np.transpose(t, (1, 0, 2))


def tex_wall_timber():
    """A timbered gallery: dark rock behind, two heavy square posts carrying a cap beam, horizontal lagging boards between
    them, iron straps and bolts - the timbering ends at the wall's edges so the posts sit between tiles."""
    w, h = 32, 64
    rgb = rock_rgb(w, h, 1901)
    for y in range(12, 62, 9):                                               # lagging boards behind, rock in the gaps
        plank_h(rgb, 4, 28, y, y + 5, 1910 + y, TIM, 0.7)
    plank_v(rgb, 0, 5, 0, 64, 1902)
    plank_v(rgb, 27, 32, 0, 64, 1903)
    plank_h(rgb, 0, 32, 3, 10, 1904)
    rgb[10] = TIM[0]
    for x in (2, 29):                                                        # iron straps with bolts at the joints
        rgb[4:12, x - 2:x + 3] = I1
        rgb[5, x] = I3; rgb[10, x] = I3
    rgb[56:64] = rgb[56:64] * 0.75 + np.array(DIRT[1]) * 0.25
    finish(rgb, 'wall_timber.png', 40)


def tex_wall_orevein():
    """Mine rock run through by veins of gold and copper ore that glitter (bright specks on the veins)."""
    w, h = 32, 64
    rgb = rock_rgb(w, h, 1921)
    v1 = pnoise(w, h, 1922, ((16, 1.0), (8, 0.4)))
    v2 = pnoise(w, h, 1923, ((16, 1.0), (8, 0.4)))
    gold = np.abs(v1 - 0.5) < 0.022
    cu = (np.abs(v2 - 0.5) < 0.018) & ~gold
    rgb[cu] = gmap(np.clip(v2[cu] * 1.2, 0, 1), stops(CU))
    rgb[gold] = gmap(np.clip(0.2 + v1[gold] * 0.8, 0, 1), stops(ORE[:3]))
    r2 = random.Random(1924)
    ys, xs = np.nonzero(gold)
    for _ in range(14):
        i = r2.randrange(len(ys))
        rgb[ys[i], xs[i]] = ORE[3]
    finish(rgb, 'wall_orevein.png', 40)


def tex_wall_boss_foreman():
    """The foreman's wall: the timbered gallery with a big painted board between the posts - crossed pickaxe and sledge
    under a burning helmet lamp and a row of red dynamite sticks, nailed with iron."""
    w, h = 64, 128
    rgb = x2(rock_rgb(32, 64, 1931))
    for y in range(24, 124, 14):
        plank_h(rgb, 8, 56, y, y + 12, 1940 + y, TIM, 0.7)
    plank_v(rgb, 0, 10, 0, 128, 1932)
    plank_v(rgb, 54, 64, 0, 128, 1933)
    plank_h(rgb, 0, 64, 6, 20, 1934)
    p = Pic(w, h)
    p.r(13, 30, 50, 96, TIM[1]); p.r(15, 32, 48, 94, TIM[2])
    for y in (44, 58, 72, 86):
        p.l(15, y, 48, y, TIM[1])
    p.l(18, 88, 44, 50, WD1, 3); p.l(46, 88, 20, 50, WD1, 3)                 # crossed handles
    p.poly([(36, 46), (52, 52), (50, 55), (40, 51)], I2); p.poly([(36, 46), (24, 44), (26, 48)], I2)   # the pick head
    p.r(13, 44, 24, 54, I1); p.r(14, 45, 23, 48, I3)                        # the sledge head
    ell(p, 31.5, 38, 6, 5, BR2); ell(p, 31.5, 37, 3, 3, LAMP[1]); p.p(31, 36, WHITE)     # the lamp
    for j in range(5):
        x = 19 + j * 6
        p.r(x, 72, x + 3, 84, (180, 30, 26)); p.l(x, 72, x, 84, (230, 80, 60)); p.l(x + 1, 69, x + 2, 71, BLK[2])
    for x, y in ((16, 33), (47, 33), (16, 93), (47, 93)):
        p.p(x, y, I3)
    put(rgb, outline_same(p.im))
    finish(rgb, 'wall_boss_foreman.png', 64, half=False)


def dirt_rgb(seed=1951):
    w = h = 32
    nz = pnoise(w, h, seed, ((8, 1.0), (4, 0.6), (2, 0.4)))
    rgb = gmap(np.clip(0.15 + nz * 0.55, 0, 1), stops(DIRT))
    r2 = random.Random(seed + 1)
    for _ in range(26):                                                      # pebbles and coal crumbs
        x, y = r2.randrange(w), r2.randrange(h)
        if r2.random() < 0.5:
            rgb[y, x] = ROCK[3]; rgb[(y + 1) % h, x] = ROCK[1]
        else:
            rgb[y, x] = COAL[1]
    return rgb


def tex_floor_minedirt():
    finish(dirt_rgb(), 'floor_minedirt.png', 32)


def planks_rgb(seed=1961, pal=TIM, k=1.0):
    """Worn gallery boards running left-right (tiles both ways): 4 boards per tile with staggered butt joints, nails."""
    w = h = 32
    rgb = np.zeros((h, w, 3))
    for j in range(4):
        plank_h(rgb, 0, w, j * 8, j * 8 + 8, seed + j, pal, k)
        jx = (j * 11 + 5) % w
        rgb[j * 8:j * 8 + 8, jx] = pal[0]
        rgb[j * 8 + 2, (jx + 2) % w] = I3; rgb[j * 8 + 5, (jx + 2) % w] = I3
    nz = pnoise(w, h, seed + 9, ((8, 1.0),))
    rgb = rgb * (0.85 + nz[..., None] * 0.2)
    return rgb


def tex_floor_planks2():
    finish(planks_rgb(), 'floor_planks2.png', 32)


def tex_floor_boss_foreman():
    """The centre of the foreman's pit: dirt with a ring of sleepers round a big iron plate stamped with crossed hammers."""
    rgb = x2(dirt_rgb(1971))
    p = Pic(64, 64)
    for j in range(16):
        a = j / 16 * TAU
        x, y = 31.5 + math.cos(a) * 25, 31.5 + math.sin(a) * 25
        poly_r(p, [(x - 6, y - 2), (x + 6, y - 2), (x + 6, y + 2), (x - 6, y + 2)], TIM[2] if j % 2 else TIM[1], x, y, a + math.pi / 2)
    p.e(12, 12, 51, 51, I0); p.e(13, 13, 50, 50, I1); p.arc(13, 13, 50, 50, 200, 330, I3)
    for j in range(8):
        a = j / 8 * TAU
        p.p(31.5 + math.cos(a) * 16, 31.5 + math.sin(a) * 16, I3)
    p.l(22, 42, 41, 22, WD2, 3); p.l(22, 22, 41, 42, WD2, 3)
    p.r(17, 17, 26, 25, I2); p.r(37, 17, 46, 25, I2)
    put(rgb, outline_same(p.im))
    finish(rgb, 'floor_boss_foreman.png', 48, half=False)


def rail_layer(dirt, vertical=False, cross=False):
    """Track on dirt (64x64): wooden sleepers across the track every 16 px (so the pattern runs on into the next tile) and
    two steel rails along it at x 18-21 and 42-45; cross = both directions (the rails of the second direction over)."""
    rgb = dirt.copy()
    p = Pic(64, 64)
    def track(p, vert):
        for j in range(4):
            c = 2 + j * 16
            if vert:
                p.r(8, c, 55, c + 6, TIM[1]); p.r(8, c, 55, c + 1, TIM[3]); p.l(8, c + 6, 55, c + 6, TIM[0])
                for x in (14, 24, 38, 48):
                    p.p(x, c + 3, TIM[0])
            else:
                p.r(c, 8, c + 6, 55, TIM[1]); p.r(c, 8, c + 1, 55, TIM[3]); p.l(c + 6, 8, c + 6, 55, TIM[0])
                for y in (14, 24, 38, 48):
                    p.p(c + 3, y, TIM[0])
    def rails(p, vert):
        for r0 in (18, 42):
            if vert:
                p.r(r0 - 1, 0, r0 + 4, 63, I0); p.r(r0, 0, r0 + 3, 63, I1); p.r(r0 + 1, 0, r0 + 2, 63, (176, 180, 190))
                for j in range(4):
                    p.r(r0 - 2, 4 + j * 16, r0 + 5, 5 + j * 16, I2)            # spikes
            else:
                p.r(0, r0 - 1, 63, r0 + 4, I0); p.r(0, r0, 63, r0 + 3, I1); p.r(0, r0 + 1, 63, r0 + 2, (176, 180, 190))
                for j in range(4):
                    p.r(4 + j * 16, r0 - 2, 5 + j * 16, r0 + 5, I2)
    if cross:
        track(p, False); track(p, True); rails(p, False); rails(p, True)
    else:
        track(p, vertical); rails(p, vertical)
    put(rgb, p.im)
    return rgb


def tex_floor_rails():
    d = x2(dirt_rgb())
    finish(rail_layer(d, cross=True), 'floor_rail.png', 40, half=False)
    finish(rail_layer(d, vertical=False), 'floor_rail_h.png', 40, half=False)
    finish(rail_layer(d, vertical=True), 'floor_rail_v.png', 40, half=False)


def tex_floor_gas2():
    """A gas pocket: the mine dirt under a sickly green haze of swirls and a few rising bubbles (wraps both ways)."""
    rgb = x2(dirt_rgb())
    nz = pnoise(64, 64, 1981, ((32, 1.0), (16, 0.6), (8, 0.3)))
    sw = np.sin(nz * 18) * 0.5 + 0.5
    m = np.clip((sw - 0.35) * 1.3, 0, 1) * 0.55
    rgb = rgb * (1 - m[..., None]) + gmap(np.clip(nz, 0, 1), stops(GAS[:3])) * m[..., None]
    def bub(p, ox, oy):
        r2 = random.Random(1982)
        for _ in range(9):
            x, y, r = r2.uniform(0, 64) + ox, r2.uniform(0, 64) + oy, r2.choice((2, 2, 3))
            p.e(x - r, y - r, x + r, y + r, GAS[1]); p.e(x - r + 1, y - r + 1, x + r - 1, y + r - 1, GAS[2]); p.p(x - r + 1, y - r + 1, GAS[3])
    put(rgb, wrap_pic(64, 64, bub))
    finish(rgb, 'floor_gas2.png', 40, half=False)


def tex_floor_cavein():
    """Creaking roof above: the mine dirt strewn with cracked fallen stones, a split plank and pale dust that trickles."""
    rgb = x2(dirt_rgb())
    p = Pic(64, 64)
    r2 = random.Random(1991)
    plank = [(10, 40), (52, 30), (54, 36), (12, 46)]
    p.poly(plank, TIM[1]); p.l(10, 40, 52, 30, TIM[3]); p.l(30, 36, 34, 40, TIM[0]); p.l(34, 40, 30, 43, TIM[0])
    for _ in range(9):
        x, y, r = r2.uniform(8, 56), r2.uniform(8, 56), r2.uniform(3, 7)
        pts = [(x + math.cos(a) * r * r2.uniform(0.7, 1.1), y + math.sin(a) * r * r2.uniform(0.7, 1.1)) for a in np.linspace(0, TAU, 7)[:-1]]
        p.poly(pts, ROCK[2]); p.poly([(px - 1, py - 1) for px, py in pts[3:]] + [(x, y)], ROCK[3])
        p.l(x - r * 0.5, y, x + r * 0.3, y + r * 0.4, ROCK[0])
    im = outline_same(p.im)
    q = Pic(64, 64)
    dust(q, 70, 1992, (2, 2, 62, 62), ((150, 140, 120), (180, 170, 150), (120, 110, 94)))
    put(rgb, on(im, q.im))
    finish(rgb, 'floor_cavein.png', 40, half=False)


# ================================================================== OBSERVATORY TEXTURES
def brass_rgb(w, h, seed, pw=16, ph=16, k=1.0):
    """Riveted brass panels (tiles both ways): brushed brass, bevelled edges, a rivet in each corner."""
    yy, xx = np.mgrid[0:h, 0:w]
    nz = pnoise(w, h, seed, ((16, 1.0), (4, 0.3)))
    brush = (np.sin(yy * 2.3 + nz * 6) * 0.5 + 0.5) * 0.08
    bx, by = xx % pw, yy % ph
    lum = np.clip(0.42 + (nz - 0.5) * 0.3 + brush, 0, 1) * k
    lum = np.where((bx == 1) | (by == 1), lum + 0.18, lum)
    lum = np.where((bx == pw - 1) | (by == ph - 1), lum - 0.18, lum)
    rgb = gmap(np.clip(lum, 0, 1), stops((BR0, BR1, BR2, BR3, BR4)))
    rgb[(bx == 0) | (by == 0)] = BR0
    riv = ((bx == 3) | (bx == pw - 3)) & ((by == 3) | (by == ph - 3))
    rgb[riv] = BR4
    return rgb


def tex_wall_brass2():
    """The observatory panelling: a dark-blue lacquered field between brass frames, brass pilaster strips and a band of
    small star studs - dimmer and bluer than the clockwork tower's wall_brass."""
    w, h = 32, 64
    rgb = brass_rgb(w, h, 2001, 16, 16, 0.9)
    yy, xx = np.mgrid[0:h, 0:w]
    nz = pnoise(w, h, 2002, ((16, 1.0), (4, 0.4)))
    inset = ((xx % 16) >= 3) & ((xx % 16) <= 12) & (yy >= 14) & (yy <= 54)
    rgb[inset] = gmap(np.clip(0.35 + nz[inset] * 0.35, 0, 1), stops(NAVY))
    rgb[inset & (((xx % 16) == 3) | (yy == 14))] = NAVY[0]
    for x in (7, 23):
        for y in (22, 34, 46):
            rgb[y, x] = STAR[1]; rgb[y - 1, x] = NAVY[3]; rgb[y + 1, x] = NAVY[3]
    rgb[5:8] = gmap(np.full((3, w), 0.6), stops((BR0, BR1, BR2, BR3, BR4))); rgb[6, ::4] = BR4
    finish(rgb, 'wall_brass2.png', 40)


STAR_CHART = [((6, 10), (14, 6), (22, 12), (26, 22)), ((8, 34), (16, 40), (12, 50), (22, 54)), ((24, 32), (28, 42))]


def tex_wall_starchart():
    """A dome wall painted as a star chart: deep blue with faint grid arcs, dotted stars of three sizes and constellation
    lines in pale gold, inside a brass rib at the top and bottom."""
    w, h = 32, 64
    nz = pnoise(w, h, 2011, ((16, 1.0), (8, 0.5)))
    rgb = gmap(np.clip(0.45 + nz * 0.4, 0, 1), stops(NAVY))
    yy, xx = np.mgrid[0:h, 0:w]
    rgb[(yy % 16 == 8)] = rgb[(yy % 16 == 8)] * 0.7 + np.array(NAVY[4]) * 0.3
    rgb[(xx % 16 == 8)] = rgb[(xx % 16 == 8)] * 0.75 + np.array(NAVY[4]) * 0.25
    p = Pic(w, h)
    for con in STAR_CHART:
        p.lines(list(con), (150, 130, 80))
        for x, y in con:
            p.p(x, y, STAR[2]); p.ps([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)], STAR[0])
    r2 = random.Random(2012)
    for _ in range(26):
        p.p(r2.randrange(w), r2.randrange(4, 60), r2.choice(STAR[:2]))
    put(rgb, p.im)
    for y0 in (0, 60):
        rgb[y0:y0 + 4] = gmap(np.full((4, w), 0.55), stops((BR0, BR1, BR2, BR3, BR4)))
        rgb[y0 + 1] = BR3; rgb[y0 + 3] = BR0
    finish(rgb, 'wall_starchart.png', 40)


def tex_wall_boss_starseer():
    """The star seer's wall: the brass panelling round a great round star window - a brass ring with zodiac ticks round a
    deep-blue sky with a spiral of stars and a golden eye at its centre."""
    w, h = 64, 128
    rgb = x2(brass_rgb(32, 64, 2021, 16, 16, 0.85))
    p = Pic(w, h)
    cx, cy = 31.5, 58
    p.e(cx - 28, cy - 28, cx + 28, cy + 28, BR1); p.e(cx - 26, cy - 26, cx + 26, cy + 26, BR3); p.e(cx - 23, cy - 23, cx + 23, cy + 23, NAVY[1])
    for j in range(24):
        a = j / 24 * TAU
        p.l(cx + math.cos(a) * 23.5, cy + math.sin(a) * 23.5, cx + math.cos(a) * 26, cy + math.sin(a) * 26, BR0)
    for j in range(40):
        a = j * 0.5
        r = 3 + j * 0.5
        p.p(cx + math.cos(a) * r, cy + math.sin(a) * r, STAR[2] if j % 3 == 0 else STAR[0])
    ell(p, cx, cy, 6, 3.5, AU2); ell(p, cx, cy, 2.5, 2.5, NAVY[0]); p.p(cx - 1, cy - 1, WHITE)
    for y in (96, 104, 112):
        p.l(10, y, 53, y, BR0)
    star5(p, cx, 106, 6, AU2); star5(p, cx, 106, 3, AU3)
    put(rgb, outline_same(p.im))
    finish(rgb, 'wall_boss_starseer.png', 64, half=False)


def brasstile_rgb(seed=2031):
    """Brass and dark-blue checker tiles (8 px at half res) with brass grout lines."""
    w = h = 32
    yy, xx = np.mgrid[0:h, 0:w]
    nz = pnoise(w, h, seed, ((8, 1.0), (4, 0.5)))
    chk = ((xx // 8) + (yy // 8)) % 2 == 0
    rgb = np.where(chk[..., None], gmap(np.clip(0.35 + nz * 0.35, 0, 1), stops((BR0, BR1, BR2, BR3))),
                   gmap(np.clip(0.4 + nz * 0.4, 0, 1), stops(NAVY)))
    g = (xx % 8 == 0) | (yy % 8 == 0)
    rgb[g] = BR1
    rgb[(xx % 8 == 1) & ~g & chk] = BR3
    return rgb


def tex_floor_brasstile():
    finish(brasstile_rgb(), 'floor_brasstile.png', 32)


def tex_floor_boss_starseer():
    """The centre of the star seer's hall: dark blue with a gold compass rose of eight points in a ring of star dots."""
    nz = pnoise(64, 64, 2041, ((16, 1.0), (8, 0.5)))
    rgb = gmap(np.clip(0.45 + nz * 0.4, 0, 1), stops(NAVY))
    p = Pic(64, 64)
    p.arc(4, 4, 59, 59, 0, 360, AU1); p.arc(6, 6, 57, 57, 0, 360, BR2)
    for j in range(32):
        a = j / 32 * TAU
        p.p(31.5 + math.cos(a) * 24, 31.5 + math.sin(a) * 24, STAR[2] if j % 4 == 0 else STAR[0])
    for j in range(8):
        a = j / 8 * TAU - math.pi / 2
        L = 22 if j % 2 == 0 else 13
        tip = (31.5 + math.cos(a) * L, 31.5 + math.sin(a) * L)
        l_ = (31.5 + math.cos(a - 0.5) * 4, 31.5 + math.sin(a - 0.5) * 4)
        r_ = (31.5 + math.cos(a + 0.5) * 4, 31.5 + math.sin(a + 0.5) * 4)
        p.poly([tip, l_, (31.5, 31.5)], AU3 if j % 2 == 0 else AU2); p.poly([tip, r_, (31.5, 31.5)], AU1)
    ell(p, 31.5, 31.5, 3, 3, BR3); p.p(31, 31, WHITE)
    put(rgb, outline_same(p.im))
    finish(rgb, 'floor_boss_starseer.png', 48, half=False)


def starmap_rgb(seed=2051):
    """The low-gravity star map floor (64x64): a mid-blue field (bright enough for the luminance rule) with a fine grid,
    stars and constellation lines that wrap round the tile edges."""
    nz = pnoise(64, 64, seed, ((16, 1.0), (8, 0.5)))
    rgb = gmap(np.clip(0.5 + nz * 0.35, 0, 1), stops(NAVY))
    yy, xx = np.mgrid[0:64, 0:64]
    grid = (xx % 16 == 0) | (yy % 16 == 0)
    rgb[grid] = rgb[grid] * 0.6 + np.array(NAVY[4]) * 0.4
    def draw(p, ox, oy):
        r2 = random.Random(seed + 1)
        pts = [(r2.uniform(0, 64) + ox, r2.uniform(0, 64) + oy) for _ in range(10)]
        for a, b in ((0, 1), (1, 2), (2, 3), (4, 5), (5, 6), (6, 4), (7, 8), (8, 9)):
            p.l(*pts[a], *pts[b], (190, 170, 110))
        for x, y in pts:
            p.p(x, y, STAR[2]); p.ps([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)], STAR[1])
        for _ in range(40):
            p.p(r2.uniform(0, 64) + ox, r2.uniform(0, 64) + oy, r2.choice(STAR[:2]))
    put(rgb, wrap_pic(64, 64, draw))
    return rgb


def tex_floor_starmap():
    finish(starmap_rgb(), 'floor_starmap.png', 40, half=False)


def tex_floor_domeslit():
    """The floor under an open dome slit: the brass checker tiles washed by a band of cold starlight running across the
    tile evenly (no direction, so slit tiles join whichever way the slit runs), with glittering motes in the light."""
    rgb = x2(brasstile_rgb(2061))
    nz = pnoise(64, 64, 2063, ((32, 1.0), (16, 0.5)))                         # an even wash (no direction, so slits of any shape join)
    band = 0.55 + nz * 0.3
    rgb = rgb * (1 - band[..., None] * 0.4) + np.array(ICE[1]) * band[..., None] * 0.32
    p = Pic(64, 64)
    r2 = random.Random(2062)
    for _ in range(30):
        x, y = r2.uniform(0, 63), r2.uniform(0, 63)
        p.p(x, y, r2.choice((STAR[2], ICE[3], ICE[2])))
    put(rgb, p.im)
    finish(rgb, 'floor_domeslit.png', 40, half=False)


@builder('textures')
def make_textures():
    for fn in (tex_wall_timber, tex_wall_orevein, tex_wall_boss_foreman, tex_wall_brass2, tex_wall_starchart, tex_wall_boss_starseer,
               tex_floor_minedirt, tex_floor_planks2, tex_floor_boss_foreman, tex_floor_rails, tex_floor_gas2, tex_floor_cavein,
               tex_floor_brasstile, tex_floor_boss_starseer, tex_floor_starmap, tex_floor_domeslit):
        fn()


# ================================================================== SHARED BITS
def pickaxe(p, x, y, a, L=13, head=6, pal=(I1, I2, I3)):
    """A pickaxe held at (x, y) with the handle along a (from straight down, positive forward): an ash handle and a curved
    iron head across its end, both points bent back towards the hand."""
    ex, ey = pt(a, L, x, y)
    p.l(x, y, ex, ey, WD3, 2); p.l(x, y, (x + ex) / 2, (y + ey) / 2, WD4)
    u = (math.sin(a), math.cos(a)); v = (-u[1], u[0])
    pts = [(ex + v[0] * head - u[0] * 2.5, ey + v[1] * head - u[1] * 2.5), (ex + v[0] * head * 0.5, ey + v[1] * head * 0.5), (ex + u[0], ey + u[1]),
           (ex - v[0] * head * 0.5, ey - v[1] * head * 0.5), (ex - v[0] * head - u[0] * 2.5, ey - v[1] * head - u[1] * 2.5)]
    p.lines(pts, pal[0], 3); p.lines(pts[1:4], pal[1], 2)
    p.p(*pts[0], pal[2]); p.p(*pts[-1], pal[2])
    return pts


def star_pts(x, y, r, rot=0.0, inner=0.45, sy=1.0):
    return [(x + math.cos(-math.pi / 2 + rot + j * math.pi / 5) * (r if j % 2 == 0 else r * inner),
             y + math.sin(-math.pi / 2 + rot + j * math.pi / 5) * (r if j % 2 == 0 else r * inner) * sy) for j in range(10)]


def gear(p, x, y, r, c, c2=None, teeth=8, rot=0.0):
    for j in range(teeth):
        a = rot + j / teeth * TAU
        p.l(x + math.cos(a) * r * 0.6, y + math.sin(a) * r * 0.6, x + math.cos(a) * (r + 1), y + math.sin(a) * (r + 1), c, 2)
    ell(p, x, y, r, r, c)
    if c2:
        ell(p, x, y, r * 0.45, r * 0.45, c2)


def meteor(p, x, y, r=3, tail=10, a=-2.4):
    """A small falling meteor at (x, y): a dark rock in a fire tail pointing back along a (radians, image space)."""
    tx, ty = x + math.cos(a) * tail, y + math.sin(a) * tail
    p.l(x, y, tx, ty, F0, int(r * 2)); p.l(x, y, (x + tx) / 2, (y + ty) / 2, F1, max(1, int(r))); p.l(x, y, x + math.cos(a) * 3, y + math.sin(a) * 3, F3)
    ell(p, x, y, r, r, ROCK[1]); p.p(x - 1, y - 1, ROCK[3])


def sink(im, d, mound=None, floor=FEET):
    """Death helper: the figure pushed d px down into the floor (cut at the floor row) with a dirt mound piled over."""
    out = cut_below(shift(im, 0, d), floor)
    if mound:
        q = Pic(64, 64)
        cx, w, h = mound
        q.e(cx - w, floor - h, cx + w, floor + h, DIRT[1]); q.e(cx - w + 2, floor - h + 1, cx + w - 3, floor + h, DIRT[2])
        dust(q, 10, int(d * 7 + w), (cx - w, floor - h - 2, cx + w, floor - 1), (DIRT[3], DIRT[4], ROCK[3]))
        out = on(out, cut_below(outline_same(q.im, DIRT[0]), floor))
    return out


# ================================================================== MINER (drawn, 64x64)
def miner_raw(step=None, bob=0, lean=0.0, aF=(0.5, 0.4), aB=(-0.2, 0.4), pick=1.2, eyes=1, mouth=0, lamp=1, crouch=0, helmet=True):
    """Side view facing right: a grimy miner - a leather helmet with a brass carbide lamp on its brow (lamp 1 = lit, a
    few light pixels in front), a grey beard, a blue work shirt with leather braces and a belt, brown trousers, boots,
    gloves; the front hand holds a pickaxe (pick = handle angle) - none if pick is None."""
    p = Pic(64, 64)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.l(sx - 3, sy + 1, hx - 3, hy, LEA[1]); p.l(sx + 3, sy + 1, hx + 3, hy, LEA[1])
        p.l(hx - 6, hy, hx + 6, hy, LEA[0], 2); p.p(hx + 1, hy, BR3)
        dust(p, 5, 7, (hx - 4, sy + 3, hx + 4, hy - 2), (DEN[0], COAL[2]))
    def head(p, K):
        x, y = K['head']
        p.poly([(x - 1, y + 1), (x + 5, y + 1), (x + 4, y + 6), (x, y + 5)], (140, 136, 128)); p.l(x + 1, y + 2, x + 4, y + 2, (190, 186, 176))
        if eyes:
            p.p(x + 3, y - 1, BLK[0])
        else:
            p.l(x + 2, y - 1, x + 4, y - 1, BLK[0])
        if mouth:
            p.r(x + 2, y + 3, x + 4, y + 3 + mouth, (60, 14, 14))
        p.p(x + 5, y, SKIN[3])
        if helmet:
            p.e(x - 5, y - 7, x + 5, y - 1, LEA[2]); p.l(x - 6, y - 2, x + 7, y - 2, LEA[1], 2); p.arc(x - 4, y - 6, x + 3, y - 2, 200, 300, LEA[3])
            p.r(x + 3, y - 6, x + 6, y - 3, BR2); p.p(x + 6, y - 5, LAMP[1] if lamp else BR1); p.p(x + 6, y - 4, LAMP[0] if lamp else BR1)
    def front(p, K):
        if pick is not None:
            pickaxe(p, K['handF'][0], K['handF'][1], pick, 14, 6)
        ell(p, K['handF'][0], K['handF'][1], 1.6, 1.6, LEA[2])
    K = rig(p, 30, FEET, LL=14, TL=13, HR=5, step=step, bob=bob, lean=lean, crouch=crouch, legs=(LEA[1], LEA[2]), leg_w=5, body=(DEN[1], DEN[2]),
            body_w=(6, 6), arms=(DEN[1], DEN[2]), arm_w=4, AL=13, aB=aB, aF=aF, skin=SKIN, hands=LEA[2], shoes=BLK[1],
            on_torso=torso, on_head=head, on_front=front)
    im = outline_same(p.im)
    if lamp and helmet:
        q = Pic(64, 64)
        x, y = K['head']
        for j in range(4):
            q.p(x + 9 + j * 2, y - 5 + j * (j % 2), LAMP[2 if j == 0 else 0])
        im = on(im, q.im)
    return im


@builder('miner')
def make_miner():
    M = miner_raw
    save_enemy('miner', 'idle', [M(bob=(0, 0, -1, 0)[i], pick=1.2 + (0, 0.05, 0.1, 0.05)[i]) for i in range(4)])
    save_enemy('miner', 'movement', [M(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=1.5, pick=1.4) for i in range(6)])
    save_enemy('miner', 'attack', [M(aF=(2.2, 0.6), pick=3.3, lean=-1), M(aF=(2.9, 0.3), pick=3.9, lean=-2, mouth=1),
                                   M(aF=(2.2, 0.1), pick=2.6, lean=1, mouth=2), M(aF=(1.3, 0.1), pick=1.5, lean=3, crouch=2, mouth=2),
                                   M(aF=(0.9, 0.1), pick=0.9, lean=3, crouch=3, mouth=1), M(aF=(0.6, 0.3), pick=1.1, lean=1)])
    save_enemy('miner', 'take_damage', [flash(M(lean=-3, eyes=0, mouth=2), WHITE), M(lean=-2, mouth=1), M(lean=-1)])
    base = M(eyes=0, mouth=1, pick=None, aF=(1.2, 0.4), aB=(1.0, 0.5), lamp=0)
    q = Pic(64, 64); pickaxe(q, 40, FEET - 2, 1.75, 14, 6); pk = outline_same(q.im)
    save_enemy('miner', 'death', [flash(M(lean=-3, eyes=0, mouth=2), WHITE), on(fall(base, 0.25), pk), on(fall(base, 0.55), pk),
                                  on(fall(base, 0.85), pk), on(fall(base, 1.0), pk), on(fall(M(eyes=0, pick=None, lamp=0, aF=(1.2, 0.4)), 1.0), pk)])


# ================================================================== COAL GOLEM (drawn, 64x64)
def lump(p, x, y, r, ry=None, glow=1, lit=False):
    shade_ball(p, x, y, r, COAL[2:] if lit else COAL[1:], ry)
    if glow:
        p.l(x - r * 0.5, y + (ry or r) * 0.2, x + r * 0.3, y - (ry or r) * 0.3, EMB[1 + min(glow, 2) - 1])


def golem_raw(step=None, bob=0, lean=0.0, arms=0.0, glow=1, eyes=1, dx=0):
    """Side view facing right: a hulking golem of coal lumps - stubby legs, a huge chest, a small head sunk between the
    shoulders with ember eyes, long heavy arms with lump fists; glowing orange seams between the lumps (glow 0..3);
    arms 0 = hanging .. 1 = raised over the head .. 2 = slammed down in front."""
    p = Pic(64, 64)
    f = FEET
    cx = 28 + dx
    hy = f - 15 + bob
    for j, ph in enumerate((math.pi, 0.0)):                                   # legs (far first)
        o = math.sin((step or 0) * TAU + ph) * 3 if step is not None else (j * 2 - 1) * 3
        lx = cx + o
        lump(p, lx, f - 5, 5, 5, glow if j else 0); lump(p, lx + 0.5, hy + 3, 5, 4, 0)
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
        pal = (COAL[0], COAL[1], COAL[2]) if far else (COAL[1], COAL[2], COAL[3])
        p.l(bx, by, ex, ey, pal[0], 7); p.l(ex, ey, fx, fy, pal[0], 6)
        lump(p, ex, ey, 3.5, 3.5, 0, not far); lump(p, fx, fy, 5, 4.5, glow if not far else 0, not far)
    arm(True)
    lump(p, cx, hy - 1, 8, 6, glow)                                           # belly
    lump(p, sh[0], sh[1] + 6, 11, 9, 0)                                       # chest
    for (ax, ay), (bx2, by2) in (((sh[0] - 6, sh[1] + 2), (sh[0] + 2, sh[1] + 10)), ((sh[0] + 3, sh[1] + 1), (sh[0] - 2, sh[1] + 13)),
                                 ((cx - 5, hy - 2), (cx + 4, hy + 1))):
        p.l(ax, ay, bx2, by2, EMB[min(2, glow)] if glow else COAL[0], 1)
    lump(p, sh[0] + 4, sh[1] - 4, 6.5, 5.5, 0, True)                          # head
    p.l(sh[0] + 1, sh[1] - 5, sh[0] + 10, sh[1] - 5, COAL[0])                  # heavy brow
    if eyes:
        p.r(sh[0] + 5, sh[1] - 4, sh[0] + 9, sh[1] - 3, EMB[2 if glow < 3 else 3]); p.p(sh[0] + 9, sh[1] - 4, EMB[3])
    else:
        p.l(sh[0] + 6, sh[1] - 3, sh[0] + 8, sh[1] - 3, COAL[0])
    arm(False)
    im = outline_same(p.im, (6, 6, 8))
    if glow >= 2:
        q = Pic(64, 64)
        halo(q, sh[0], sh[1] + 6, 15, (EMB[2], EMB[1]), 10 + glow * 2, 3 + glow)
        im = on(q.im, im)
    return im


def coal_heap(k, glow=2):
    """The golem burst apart: a heap of coal lumps on the floor with embers glowing in it (k 0..2 = settling and cooling)."""
    p = Pic(64, 64)
    r2 = random.Random(37)
    f = FEET
    for j in range(13):
        x, r = 14 + r2.uniform(0, 34), r2.uniform(2.5, 5.5)
        y = f - r + 0.5 - (2 - k) * r2.uniform(0, 3) * (j % 3 == 0)
        lump(p, x, y, r, r * 0.8, glow if j % 3 == 0 else 0)
    for j in range(5):
        p.p(18 + j * 6, f - 2 - (j % 2), EMB[2] if glow > 1 else EMB[0])
    im = outline_same(p.im, (6, 6, 8))
    if glow > 1:
        q = Pic(64, 64)
        dust(q, 8, 38 + k, (12, f - 18 + k * 3, 52, f - 6), (EMB[1], EMB[2], (90, 86, 84)))
        im = on(im, q.im)
    return im


@builder('coalgolem')
def make_coalgolem():
    G = golem_raw
    save_enemy('coalgolem', 'idle', [G(bob=(0, 0, 1, 0)[i], glow=(1, 2, 2, 1)[i], arms=0.05 * (i % 2)) for i in range(4)])
    save_enemy('coalgolem', 'movement', [G(step=i / 6, bob=(0, 1, 1, 0, 1, 1)[i], lean=1, glow=1 + (i % 2)) for i in range(6)])
    save_enemy('coalgolem', 'attack', [G(arms=0.4, glow=2, lean=-1), G(arms=1.0, glow=3, lean=-2), G(arms=1.5, glow=3, lean=1),
                                       G(arms=2.0, glow=3, lean=3, bob=2), G(arms=1.6, glow=2, lean=2, bob=1), G(arms=0.3, glow=1)])
    save_enemy('coalgolem', 'take_damage', [flash(G(lean=-3, eyes=0, glow=3), WHITE), G(lean=-2, glow=2), G(lean=-1, glow=1)])
    save_enemy('coalgolem', 'death', [flash(G(glow=3, eyes=0, lean=-2), (255, 200, 120)), G(glow=3, eyes=0, bob=4, arms=0.2),
                                      coal_heap(0, 3), coal_heap(1, 2), coal_heap(2, 2), coal_heap(2, 1)])


# ================================================================== MOLE MAN (drawn, 64x64)
def claws(p, x, y, a, s=1.0):
    """Three big pale digging claws from the hand at (x, y), pointing along a."""
    for j in (-1, 0, 1):
        b = a + j * 0.35
        ex, ey = pt(b, 5 * s, x, y)
        tx, ty = pt(b - 0.5, 7 * s, x, y)
        p.lines([(x, y), (ex, ey), (tx, ty)], (214, 204, 180))
        p.p(tx, ty, (250, 246, 232))


def mole_raw(step=None, bob=0, lean=6.0, aF=(1.0, 0.6), aB=(0.6, 0.6), eyes=1, mouth=0, crouch=4):
    """Side view facing right: a hunched mole man - velvet dark brown fur, a long snout ending in a pink star nose, tiny
    eyes, a battered miner's lamp strapped to the head, a sack belt, and huge pale digging claws on both hands."""
    p = Pic(64, 64)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.l(hx - 5, hy - 1, hx + 5, hy - 2, LEA[1], 2)
        ell(p, sx + 2, sy + 7, 4, 5, FUR[2])
    def head(p, K):
        x, y = K['head']
        p.poly([(x + 2, y - 2), (x + 11, y + 1), (x + 11, y + 3), (x + 2, y + 4)], FUR[2])
        ell(p, x + 12, y + 2, 2, 2, PINK[2]); p.ps([(x + 14, y + 1), (x + 14, y + 3), (x + 12, y), (x + 12, y + 4)], PINK[1])
        if eyes:
            p.p(x + 4, y - 1, BLK[0])
        if mouth:
            p.l(x + 5, y + 4, x + 10, y + 4 + mouth, (90, 30, 30), 2); p.p(x + 9, y + 4, WHITE)
        p.l(x - 4, y - 2, x + 3, y - 4, LEA[1], 2); p.r(x + 2, y - 6, x + 4, y - 3, BR2); p.p(x + 4, y - 5, LAMP[0])
    def front(p, K):
        claws(p, *K['handF'], aF[0] + aF[1] - 0.2, 1.0)
    K = rig(p, 28, FEET, LL=12, TL=12, HR=5, step=step, bob=bob, lean=lean, crouch=crouch, legs=(FUR[1], FUR[2]), leg_w=5, body=(FUR[1], FUR[2]),
            body_w=(7, 7), arms=(FUR[1], FUR[2]), arm_w=4, AL=12, aB=aB, aF=aF, skin=FUR, hands=FUR[2], shoes=PINK[1],
            on_torso=torso, on_head=head, on_front=front)
    claws(p, *K['handB'], aB[0] + aB[1] - 0.2, 0.8)
    return outline_same(p.im)


@builder('moleman')
def make_moleman():
    M = mole_raw
    save_enemy('moleman', 'idle', [M(bob=(0, -1, -1, 0)[i], mouth=(0, 0, 1, 0)[i], aF=(1.0 + 0.1 * (i % 2), 0.6)) for i in range(4)])
    save_enemy('moleman', 'movement', [M(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=8, aF=(1.2 + 0.3 * math.sin(i / 6 * TAU), 0.6), aB=(1.0 - 0.3 * math.sin(i / 6 * TAU), 0.6)) for i in range(6)])
    save_enemy('moleman', 'attack', [M(aF=(2.2, 0.8), lean=4, mouth=1), M(aF=(2.9, 0.5), lean=3, mouth=2), M(aF=(2.0, 0.2), lean=8, mouth=2),
                                     M(aF=(1.3, 0.1), lean=10, mouth=2, crouch=6), M(aF=(0.8, 0.2), lean=9, mouth=1, crouch=6), M(aF=(1.0, 0.5), lean=6)])
    save_enemy('moleman', 'take_damage', [flash(M(lean=2, eyes=0, mouth=2), WHITE), M(lean=3, mouth=1), M(lean=5)])
    b = M(eyes=0, mouth=1, crouch=8, aF=(2.6, 0.4), aB=(2.4, 0.4))
    save_enemy('moleman', 'death', [flash(M(lean=2, eyes=0, mouth=2), WHITE), sink(b, 2, (30, 12, 3)), sink(b, 8, (30, 14, 5)), sink(b, 15, (30, 15, 6)),
                                    sink(b, 24, (30, 15, 6)), sink(b, 40, (30, 15, 5))])


# ================================================================== SPARK WISP (drawn, 64x64, flying - drawn low)
def wisp_raw(k=0, dx=0, dy=0, size=1.0, eyes=1, hot=0, burst=0, cinder=False, sparks_=1):
    """A small will-o'-the-wisp of the mine (about 16 px): a white-hot core in a flickering orange flame with spark pixels
    around it and two dark eye dots; hot 0..2 brightens it (attack), burst 1..2 = the pop (death), cinder = the burnt-out
    ember lying on the floor."""
    p = Pic(64, 64)
    cx, cy = 30 + dx, FEET - 12 + dy
    if cinder:
        ell(p, cx, FEET - 1.5, 3, 1.5, COAL[2]); p.p(cx, FEET - 2, EMB[2]); p.p(cx + 1, FEET - 1, EMB[1])
        q = Pic(64, 64)
        for j in range(3):
            q.p(cx - 1 + (j + k) % 2, FEET - 5 - j * 2 - k, (120, 116, 112))
        return on(outline_same(p.im), q.im)
    if burst:
        r2 = random.Random(50 + burst)
        for j in range(12):
            a = j / 12 * TAU + r2.uniform(-0.2, 0.2)
            d = 4 + burst * 5 + r2.uniform(0, 3)
            x, y = cx + math.cos(a) * d, cy + math.sin(a) * d
            p.l(x, y, x - math.cos(a) * 2, y - math.sin(a) * 2, EMB[2]); p.p(x, y, EMB[3])
        ell(p, cx, cy, 4 - burst, 4 - burst, EMB[2])
        return p.im
    s = size * (1 + hot * 0.2)
    flame(p, cx + (k % 2) * 0.5 - 0.25, cy + 6 * s, 15 * s, lean=(0.8, -0.8, 1.2, -0.4)[k % 4] - 1.2 - dx * 0.1, w=3.2 * s, pal=(EMB[1], EMB[2], EMB[3], WHITE))
    ell(p, cx, cy + 2, 3 * s, 3 * s, EMB[3]); ell(p, cx - 0.5, cy + 1.5, 1.6 * s, 1.6 * s, WHITE)
    if eyes:
        p.p(cx + 1, cy + 1, (120, 40, 10)); p.p(cx + 3, cy + 1, (120, 40, 10))
    im = outline_same(p.im, (90, 26, 6))
    q = Pic(64, 64)
    if sparks_:
        r2 = random.Random(60 + k)
        for j in range(4 + hot * 3):
            a = r2.uniform(0, TAU); d = r2.uniform(8, 11 + hot * 3)
            q.p(cx + math.cos(a) * d, cy + math.sin(a) * d * 0.8, r2.choice((EMB[2], EMB[3], LAMP[2])))
    if hot >= 2:
        for j in range(3):
            q.l(cx + 7 + j * 3, cy + 1 - j, cx + 9 + j * 3, cy + 1 - j, EMB[3])
    return on(im, q.im)


@builder('sparkwisp')
def make_sparkwisp():
    W = wisp_raw
    save_enemy('sparkwisp', 'idle', [W(k=i, dy=(0, -1, -2, -1)[i]) for i in range(4)])
    save_enemy('sparkwisp', 'movement', [W(k=i, dy=(0, -1, -2, -2, -1, 0)[i], dx=1) for i in range(6)])
    save_enemy('sparkwisp', 'attack', [W(k=0, hot=1), W(k=1, hot=2, size=1.1), W(k=2, hot=2, size=1.2, dx=2), W(k=3, hot=2, size=1.1, dx=3),
                                       W(k=0, hot=1, dx=1), W(k=1)])
    save_enemy('sparkwisp', 'take_damage', [flash(W(k=0, dx=-3, eyes=0), WHITE), W(k=1, dx=-2), W(k=2)])
    save_enemy('sparkwisp', 'death', [flash(W(k=0, hot=2, eyes=0), WHITE), W(burst=1), W(burst=2), W(cinder=True, k=0), W(cinder=True, k=1),
                                      W(cinder=True, k=2)])


# ================================================================== STARSPAWN (drawn, 64x64, flying - drawn low)
def starspawn_raw(k=0, dx=0, dy=0, rot=0.0, flare=0, eyes=1, shot=None, floor=0.0, dim=0):
    """A flying violet star creature (about 26 px): a five-pointed body with a lighter inner star, one big eye in the
    middle, a trail of stardust behind it; flare 0..2 = it swells and its points glow white (attack), shot = the star
    shard it spits (its x offset), floor = lying on the floor (death), dim darkens it."""
    p = Pic(64, 64)
    cx, cy = 30 + dx, FEET - 15 + dy
    sy = 1.0
    if floor:
        cy = FEET - 13 + floor * 9
        sy = 1 - floor * 0.55
    pal = VIO if not dim else tuple(dark(c, 0.65) for c in VIO)
    r = 12 + flare
    p.poly(star_pts(cx, cy, r, rot, 0.48, sy), pal[1]); p.poly(star_pts(cx - 0.5, cy - 0.5, r - 2.5, rot, 0.48, sy), pal[2])
    p.poly(star_pts(cx - 1, cy - 1, r * 0.45, rot, 0.5, sy), pal[3])
    if flare:
        for x, y in star_pts(cx, cy, r, rot, 0.48, sy)[::2]:
            p.p(x, y, WHITE)
    ey = cy
    ell(p, cx + 1, ey, 3.4, 3.4 * sy, WHITE if not dim else (180, 170, 200))
    if eyes:
        ell(p, cx + 2, ey, 1.6, 1.6 * sy, (240, 60, 120) if flare else pal[0]); p.p(cx + 1, ey - 1, WHITE)
    else:
        p.l(cx - 1, ey, cx + 3, ey, pal[0])
    im = outline_same(p.im, pal[0])
    q = Pic(64, 64)
    if not floor:
        r2 = random.Random(70 + k)
        for j in range(7):
            q.p(cx - 13 - j * 2.2 + r2.uniform(-1, 1), cy + 2 + r2.uniform(-4, 4), r2.choice((STAR[1], VIO[4], VIO[3])))
    if shot is not None:
        sx = cx + 12 + shot
        q.poly(star_pts(sx, cy, 4, 0.3, 0.45), STAR[2]); q.p(sx, cy, VIO[4])
        q.l(sx - 4, cy, sx - 9, cy, VIO[4])
    return on(im, q.im)


@builder('starspawn')
def make_starspawn():
    S = starspawn_raw
    save_enemy('starspawn', 'idle', [S(k=i, dy=(0, -1, -2, -1)[i], rot=0.08 * i) for i in range(4)])
    save_enemy('starspawn', 'movement', [S(k=i, dy=(0, -1, -2, -2, -1, 0)[i], rot=0.2 * i, dx=1) for i in range(6)])
    save_enemy('starspawn', 'attack', [S(k=0, flare=1, rot=0.1), S(k=1, flare=2, rot=0.3), S(k=2, flare=2, rot=0.5, shot=0), S(k=3, flare=1, rot=0.7, shot=6),
                                       S(k=0, rot=0.9, shot=12), S(k=1, rot=1.2)])
    save_enemy('starspawn', 'take_damage', [flash(S(dx=-3, eyes=0, rot=-0.3), WHITE), S(dx=-2, rot=-0.15), S(k=1)])
    save_enemy('starspawn', 'death', [flash(S(eyes=0, flare=2), WHITE), S(eyes=0, dy=4, rot=0.6), S(eyes=0, dy=8, rot=1.2, dim=1),
                                      S(eyes=0, floor=0.8, rot=0.3, dim=1), S(eyes=0, floor=1.0, rot=0.3, dim=1), S(eyes=0, floor=1.0, rot=0.3, dim=1)])


# ================================================================== ASTRONOMER (drawn, 64x64)
def astronomer_raw(step=None, bob=0, lean=0.0, aF=(0.6, 0.5), aB=(-0.1, 0.4), eyes=1, mouth=0, rod=True, call=0, hat=True):
    """Side view facing right: an old astronomer in a long deep-blue robe strewn with small stars and a gold hem, a tall
    conical hat with a brass crescent, brass spectacles, a long white beard, holding a brass rod tipped with a little
    globe; call 1..3 = a small meteor called down above him (attack)."""
    p = Pic(64, 64)
    K0 = {}
    def far(p, K):
        K0.update(K)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        sw = math.sin((step or 0) * TAU) * 2 if step is not None else 0
        p.poly([(sx - 5, sy + 2), (sx + 5, sy + 2), (hx + 9 + sw, FEET), (hx - 9 + sw * 0.5, FEET)], ROBE[1])
        p.poly([(sx - 3, sy + 3), (sx + 4, sy + 3), (hx + 7 + sw, FEET - 1), (hx - 4 + sw * 0.5, FEET - 1)], ROBE[2])
        p.l(hx - 9 + sw * 0.5, FEET - 1, hx + 9 + sw, FEET - 1, AU2, 2)
        for dx_, dy_ in ((-3, 8), (3, 14), (-5, 20), (5, 24), (0, 4)):
            p.p(sx + dx_, sy + dy_, STAR[1])
    def head(p, K):
        x, y = K['head']
        p.poly([(x - 1, y + 1), (x + 5, y + 1), (x + 3, y + 10), (x + 1, y + 6)], (226, 224, 218)); p.l(x + 2, y + 2, x + 3, y + 8, WHITE)
        if eyes:
            p.arc(x + 2, y - 2, x + 5, y + 1, 0, 360, BR3); p.p(x + 3, y - 1, BLK[0])
        else:
            p.l(x + 2, y - 1, x + 5, y - 1, BLK[0])
        if mouth:
            p.r(x + 3, y + 2, x + 4, y + 2 + mouth, (60, 14, 14))
        if hat:
            p.poly([(x - 6, y - 3), (x + 6, y - 3), (x - 3, y - 17)], NAVY[1]); p.poly([(x - 3, y - 4), (x + 4, y - 4), (x - 2, y - 15)], NAVY[2])
            p.l(x - 7, y - 3, x + 7, y - 3, AU2, 2); p.arc(x - 2, y - 11, x + 2, y - 7, 90, 300, BR3); p.p(x - 3, y - 17, STAR[2])
    def front(p, K):
        x, y = K['handF']
        if rod:
            ex, ey = pt(aF[0] + aF[1] + 2.2, 15, x, y) if call else (x + 2, y - 15)
            sx, sy = (x + (x - ex) * 0.4, y + (y - ey) * 0.4)
            p.l(sx, sy, ex, ey, BR2, 2); ell(p, ex, ey, 2.2, 2.2, BR3); p.p(ex - 1, ey - 1, BR4)
            if call:
                p.p(ex + 2, ey - 2, STAR[2])
        ell(p, x, y, 1.5, 1.5, SKIN[2])
    rig(p, 30, FEET, LL=14, TL=13, HR=5, step=step, bob=bob, lean=lean, legs=(ROBE[0], ROBE[1]), leg_w=6, body=(ROBE[1], ROBE[2]),
        body_w=(6, 5), arms=(ROBE[1], ROBE[3]), arm_w=4, AL=13, aB=aB, aF=aF, skin=SKIN, hands=SKIN[2], shoes=ROBE[0],
        on_far=far, on_torso=torso, on_head=head, on_front=front)
    im = outline_same(p.im, (8, 8, 22))
    if call:
        q = Pic(64, 64)
        mx, my = 52 - call * 2, 8 + call * 5
        meteor(q, mx, my, 2.2, 5 + call, -2.2)
        halo(q, mx, my, 5, (F2, F3), 8, call)
        im = on(im, outline_same(q.im, (60, 20, 10)))
    return im


@builder('astronomer')
def make_astronomer():
    A = astronomer_raw
    save_enemy('astronomer', 'idle', [A(bob=(0, 0, -1, 0)[i], aF=(0.6 + 0.05 * (i % 2), 0.5)) for i in range(4)])
    save_enemy('astronomer', 'movement', [A(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=1) for i in range(6)])
    save_enemy('astronomer', 'attack', [A(aF=(1.6, 0.6), aB=(1.2, 0.6), mouth=1), A(aF=(2.6, 0.3), aB=(2.4, 0.4), mouth=2, call=1, lean=-1),
                                        A(aF=(2.9, 0.2), aB=(2.8, 0.2), mouth=2, call=2, lean=-2), A(aF=(2.9, 0.2), aB=(2.8, 0.2), mouth=1, call=3, lean=-2),
                                        A(aF=(1.8, 0.3), aB=(1.4, 0.4), mouth=1, lean=1), A(aF=(0.8, 0.5), aB=(0.2, 0.4))])
    save_enemy('astronomer', 'take_damage', [flash(A(lean=-3, eyes=0, mouth=2), WHITE), A(lean=-2, mouth=1), A(lean=-1)])
    base = A(eyes=0, mouth=1, rod=False, hat=False, aF=(2.2, 0.3), aB=(2.4, 0.3))
    q = Pic(64, 64); x, y = 50, FEET - 3
    q.poly([(x - 6, y + 2), (x + 6, y + 2), (x + 8, y - 10)], NAVY[1]); q.l(x - 6, y + 2, x + 6, y + 2, AU2, 2)
    q.l(10, FEET - 1, 26, FEET - 2, BR2, 2); ell(q, 9, FEET - 2, 2, 2, BR3)
    hat_im = cut_below(outline_same(q.im, (8, 8, 22)), FEET)
    save_enemy('astronomer', 'death', [flash(A(lean=-3, eyes=0, mouth=2), WHITE), on(fall(base, 0.3), hat_im), on(fall(base, 0.6), hat_im),
                                       on(fall(base, 0.9), hat_im), on(fall(base, 1.0), hat_im), on(fall(base, 1.0), hat_im)])


# ================================================================== CLOCKWORK OWL (drawn, 64x64, flying - drawn low)
def owl_raw(wing=0.0, dx=0, dy=0, tilt=0.0, talon=0.0, eyes=1, on_floor=False, broken=0, k=0):
    """A brass clockwork owl (about 28 px): an egg-shaped riveted brass body with a gear on its chest, ear tufts, two big
    gear-ringed amber eyes, a steel beak, riveted plate wings (wing 0..1 = beat phase) and steel talons (talon 0..1 =
    thrust forward for the dive); on_floor + broken = lying wrecked on the floor among loose gears (death)."""
    p = Pic(64, 64)
    cx, cy = 30 + dx, FEET - 15 + dy
    if on_floor:
        cx, cy = 30, FEET - 6
        tilt = 1.4
    ca, sa = math.cos(tilt), math.sin(tilt)
    R = lambda u, v: (cx + u * ca - v * sa, cy + u * sa + v * ca)
    BRP = (BR0, BR1, BR2, BR3, BR4)
    for j in (0, 1):                                                          # talons
        x0, y0 = R(-1 + j * 3, 8)
        x1, y1 = (x0 + 1 + talon * 6, y0 + 4 - talon * 2) if not on_floor else (x0 + 3, y0)
        p.l(x0, y0, x1, y1, I2, 2); p.ps([(x1 + 1, y1), (x1 + 1, y1 + 1)], I3)
    if not on_floor:
        a = -1.6 + math.sin(wing * TAU) * 1.0
        wx, wy = R(-2, -3)
        ex, ey = wx - 7 + math.cos(a) * 4, wy + math.sin(a) * 15
        p.poly([(wx + 3, wy), (ex, ey), (ex - 5, ey + 4), (wx - 11, wy + 5)], BR1); p.l(wx, wy, ex, ey, BR3)
    ell(p, *R(0, 1), 8, 9, BR1); ell(p, *R(-0.6, 0.4), 6.8, 7.8, BR2)          # body
    gx, gy = R(1, 3)
    gear(p, gx, gy, 3, BR3, BR0, 8, k * 0.4)
    hx, hy = R(1, -7)
    ell(p, hx, hy, 6.5, 5.5, BR2); ell(p, hx - 0.5, hy - 0.5, 5.5, 4.5, BR3)    # head
    p.poly([R(-4, -11), R(-2, -15), R(-1, -11)], BR2); p.poly([R(4, -11), R(5, -15), R(6, -10)], BR2)
    for ox in (-1.5, 3.5):
        ex_, ey_ = R(ox, -7)
        gear(p, ex_, ey_, 2.4, BR0, None, 6, k * 0.5)
        ell(p, ex_, ey_, 1.6, 1.6, (255, 190, 60) if eyes else BR0)
        if eyes:
            p.p(ex_, ey_, BLK[0])
    bx, by = R(6, -5)
    p.poly([(bx, by - 1), (bx + 3, by + 1), (bx, by + 2)], I3)
    for u, v in ((-4, 3), (4, 3), (0, 8)):
        p.p(*R(u, v), BR4)
    if not on_floor:
        a = -1.4 + math.sin(wing * TAU + 0.5) * 1.0
        wx, wy = R(-1, -2)
        ex, ey = wx - 6 + math.cos(a) * 4, wy + math.sin(a) * 16
        p.poly([(wx + 4, wy), (ex, ey), (ex - 6, ey + 5), (wx - 10, wy + 7)], BR2); p.l(wx, wy, ex, ey, BR4)
        for t in (0.35, 0.65):                                                 # riveted plate seams
            p.l(wx + (ex - wx) * t, wy + (ey - wy) * t, wx - 10 + (ex - 6 - wx + 10) * t, wy + 7 + (ey + 5 - wy - 7) * t, BR1)
            p.p(wx + (ex - wx) * t, wy + (ey - wy) * t, BR4)
    im = outline_same(p.im, (40, 26, 8))
    if broken:
        q = Pic(64, 64)
        for j, (x, r) in enumerate(((12, 2.5), (18, 2), (44, 3), (50, 2), (55, 1.5))[:2 + broken]):
            gear(q, x, FEET - r - 1, r, BR2 if j % 2 else BR3, BR0, 6, j)
        q.lines([(20, FEET - 1), (23, FEET - 4), (26, FEET - 1), (29, FEET - 4)], I3)
        im = on(im, outline_same(q.im, (40, 26, 8)))
    return im


@builder('clockowl')
def make_clockowl():
    O = owl_raw
    save_enemy('clockowl', 'idle', [O(wing=i / 4, dy=(0, -1, -2, -1)[i], k=i) for i in range(4)])
    save_enemy('clockowl', 'movement', [O(wing=i / 6, dy=(0, -1, -2, -2, -1, 0)[i], tilt=0.15, dx=1, k=i) for i in range(6)])
    save_enemy('clockowl', 'attack', [O(wing=0.1, tilt=-0.2, dy=-3, dx=-2), O(wing=0.4, tilt=-0.1, dy=-4, dx=-3), O(wing=0.0, tilt=0.4, dy=0, dx=3, talon=0.6),
                                      O(wing=0.0, tilt=0.5, dy=2, dx=6, talon=1.0), O(wing=0.5, tilt=0.2, dy=0, dx=3, talon=0.5), O(wing=0.8, dx=0)])
    save_enemy('clockowl', 'take_damage', [flash(O(wing=0.2, dx=-3, tilt=-0.4, eyes=0), WHITE), O(wing=0.6, dx=-2, tilt=-0.2), O(wing=0.9)])
    save_enemy('clockowl', 'death', [flash(O(wing=0.2, tilt=-0.4, eyes=0), WHITE), O(wing=0.5, eyes=0, tilt=0.8, dy=4), O(wing=0.8, eyes=0, tilt=1.2, dy=9),
                                     O(eyes=0, on_floor=True, broken=1), O(eyes=0, on_floor=True, broken=2), O(eyes=0, on_floor=True, broken=3)])


# ================================================================== VOID WATCHER (drawn, 64x64, a big hovering eye - drawn low)
def watcher_raw(k=0, dx=0, dy=0, look=1.0, lid=0.0, glow=0, eyes=1, squash=0.0, tw=0.0):
    """A big hovering eye (about 40 px): a dark violet lidded shell round a pale eyeball with a deep-blue starry iris and
    a black pupil (look 0..1 = how far it looks right), five trailing tendrils below (tw = their sway); glow 1..3 = the
    iris flares pale blue (the star-cold ray, attack); lid 0..1 = closing; squash 0..1 = deflated on the floor (death)."""
    p = Pic(64, 64)
    cx, cy = 30 + dx, FEET - 24 + dy
    R = 14
    ry = R
    if squash:
        ry = R * (1 - squash * 0.62)
        cy = FEET - ry - 1 - (1 - squash) * 8
    for j in range(5):                                                         # tendrils
        x0 = cx - 8 + j * 4
        if squash < 0.6:
            pts = [(x0 + math.sin(t * 2 + j + tw * 4 + k) * (1 + t * 0.6), cy + ry * 0.7 + t * (1 - squash)) for t in range(0, 14, 2)]
            p.lines(pts, VIO[1], 2); p.p(*pts[-1], VIO[3])
        else:
            p.l(x0 - 4, FEET - 1, x0 + 4, FEET - 1, VIO[1], 2)
    ell(p, cx, cy, R + 2, ry + 2, VIO[0]); ell(p, cx - 0.5, cy - 0.5, R + 1, ry + 1, VIO[1])
    ell(p, cx + 1, cy, R - 2, ry - 2 if ry > 4 else 1, (226, 218, 230))     # the eyeball
    ix = cx + 1 + look * 4
    ir = 7 if not glow else 7 + glow * 0.4
    if eyes and ry > 5:
        ell(p, ix, cy, ir, min(ir, ry - 3), NAVY[2] if not glow else ICE[0]); ell(p, ix, cy, ir - 1.5, min(ir, ry - 3) - 1.5, NAVY[1] if not glow else ICE[1])
        for a in range(6):
            p.p(ix + math.cos(a + k) * 4, cy + math.sin(a + k) * min(4, ry - 4), STAR[2] if not glow else WHITE)
        ell(p, ix + 0.5, cy, 2.6, min(2.6, ry - 4), BLK[0] if glow < 3 else ICE[3]); p.p(ix - 1, cy - 2, WHITE)
        if ry > 10:
            p.l(cx - 6, cy - 9, cx - 2, cy - 10, (250, 240, 250))
    # the lids (shell rims) over the top and bottom of the eyeball
    lt = cy - ry + 1 + (ry - 1) * lid * 0.9
    if lid > 0:
        p.poly([(cx - R - 2, cy - 2), (cx - R, cy - ry), (cx + R, cy - ry), (cx + R + 2, cy - 2), (cx + R - 1, lt + 2), (cx - R + 1, lt + 2)], VIO[2])
    p.arc(cx - R - 1, cy - ry - 1, cx + R + 1, cy + ry + 1, 200, 340, VIO[3])
    for a in (-2.6, -2.0, -1.4, -0.8):                                         # spines along the top of the shell
        x, y = cx + math.cos(a) * (R + 1), cy + math.sin(a) * (ry + 1)
        p.l(x, y, x + math.cos(a) * 4, y + math.sin(a) * 4, VIO[2], 2)
    im = outline_same(p.im, (14, 4, 22))
    if glow:
        q = Pic(64, 64)
        halo(q, ix, cy, 9 + glow * 2, (ICE[2], ICE[3]), 10 + glow * 2, glow)
        if glow >= 2:
            for j in range(3):
                q.l(ix + 9 + j * 3, cy - 1 + j, ix + 12 + j * 3, cy - 1 + j, ICE[2 + (j == 1)])
        im = on(im, q.im)
    return im


@builder('voidwatcher')
def make_voidwatcher():
    V = watcher_raw
    save_enemy('voidwatcher', 'idle', [V(k=i, dy=(0, -1, -2, -1)[i], tw=i * 0.25, look=(1, 0.8, 0.6, 0.8)[i]) for i in range(4)])
    save_enemy('voidwatcher', 'movement', [V(k=i, dy=(0, -1, -2, -2, -1, 0)[i], tw=i / 6, dx=1) for i in range(6)])
    save_enemy('voidwatcher', 'attack', [V(look=1.0, glow=1, lid=0.2), V(look=1.0, glow=2, lid=0.4, k=1), V(look=1.2, glow=3, k=2),
                                         V(look=1.2, glow=3, k=3), V(look=1.0, glow=2, k=4), V(look=1.0, glow=1, k=5)])
    save_enemy('voidwatcher', 'take_damage', [flash(V(dx=-3, lid=0.7, look=0.0), WHITE), V(dx=-2, lid=0.4, look=0.3), V(look=0.7)])
    save_enemy('voidwatcher', 'death', [flash(V(lid=0.5, look=0.0, glow=1), WHITE), V(lid=0.6, dy=4, look=-0.5, tw=0.5), V(lid=0.8, squash=0.3, eyes=0),
                                        V(lid=0.95, squash=0.6, eyes=0), V(lid=1.0, squash=0.85, eyes=0), V(lid=1.0, squash=1.0, eyes=0)])


# ================================================================== THE MINE FOREMAN (drawn, 116x116)
HELM = ((80, 60, 14), (150, 116, 30), (200, 160, 50), (236, 204, 110))                    # a battered yellow hard hat


def helmet(p, x, y, s=1.0, tilt=0.0, lit=True):
    """The foreman's hard hat at (x, y) (the brim's middle): a dome with a ridge, a brim and a brass lamp in front."""
    ca, sa = math.cos(tilt), math.sin(tilt)
    R = lambda u, v: (x + (u * ca - v * sa) * s, y + (u * sa + v * ca) * s)
    p.poly([R(-12, 0), R(-10, -8), R(-4, -12), R(4, -12), R(10, -8), R(13, 0)], HELM[1])
    p.poly([R(-9, -1), R(-7, -8), R(-2, -10), R(3, -10), R(2, -2)], HELM[2])
    p.lines([R(-1, -12), R(1, -1)], HELM[3], 2)
    p.l(*R(-15, 0), *R(16, 0), HELM[0], 3)
    p.poly([R(9, -9), R(15, -9), R(15, -3), R(9, -3)], BR2); p.l(*R(15, -9), *R(15, -3), BR4)
    ell(p, *R(16, -6), 2 * s, 2.4 * s, LAMP[1] if lit else BR1)


def sledge(p, x, y, a, L=40):
    if math.cos(a) < -0.2:                                                    # raised: the handle foreshortens so the head stays in the cell
        L = min(L, (y - 24) / -math.cos(a))
    ex, ey = pt(a, L, x, y)
    p.l(x, y, ex, ey, WD2, 4); p.l(x, y, ex, ey, WD3, 2)
    u = (math.sin(a), math.cos(a)); v = (-u[1], u[0])
    c = (ex + u[0] * 2, ey + u[1] * 2)
    hw, hl = 6, 10
    pts = [(c[0] + v[0] * hl - u[0] * hw, c[1] + v[1] * hl - u[1] * hw), (c[0] + v[0] * hl + u[0] * hw, c[1] + v[1] * hl + u[1] * hw),
           (c[0] - v[0] * hl + u[0] * hw, c[1] - v[1] * hl + u[1] * hw), (c[0] - v[0] * hl - u[0] * hw, c[1] - v[1] * hl - u[1] * hw)]
    p.poly(pts, I1)
    p.poly([pts[0], ((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2), ((pts[3][0] + pts[2][0]) / 2, (pts[3][1] + pts[2][1]) / 2), pts[3]], I2)
    p.l(*pts[0], *pts[3], I3)
    return c


def dynamite(p, x, y, a=0.0, lit=True, s=1.0):
    u = (math.cos(a), math.sin(a))
    x1, y1 = x + u[0] * 9 * s, y + u[1] * 9 * s
    p.l(x, y, x1, y1, (176, 30, 26), int(4 * s)); p.l(x, y, x1, y1, (226, 70, 56), 1)
    p.lines([(x1, y1), (x1 + u[0] * 3 - u[1] * 2, y1 + u[1] * 3 + u[0] * 2)], BLK[2])
    if lit:
        sx, sy = x1 + u[0] * 3 - u[1] * 2, y1 + u[1] * 3 + u[0] * 2
        spark(p, sx, sy, LAMP[2], 2)


def foreman_frame(step=None, bob=0, lean=0.0, aF=(0.9, 0.3), aB=(-0.2, 0.5), sl=0.9, dyn=None, fly=None, eyes=1, mouth=0, hat=True,
                  chips=0, crouch=0, beam=True):
    """Side view facing right: the foreman - a giant miner with a battered yellow hard hat and a burning brass lamp (a
    beam of light pixels ahead of it), a bushy grey moustache and brows, a barrel chest in a grimy shirt under a leather
    vest with braces, rolled sleeves on thick forearms, a wide belt, dark trousers and heavy boots; the front hand holds a
    great sledgehammer (sl = handle angle), the back hand a stick of dynamite (dyn = 'lit') or nothing; fly = the thrown
    stick's position; chips = rock chips flying from the floor where the sledge struck."""
    p = Pic(BS, BS)
    f = BS_FEET
    K0 = {}
    def far(p, K):
        K0.update(K)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.e(hx - 13, sy + 4, hx + 15, hy + 4, (150, 140, 120)); p.e(hx - 10, sy + 6, hx + 12, hy + 1, (186, 176, 154))     # belly in the shirt
        p.poly([(sx - 13, sy - 1), (sx - 2, sy - 1), (hx - 2, hy + 1), (hx - 13, hy + 1)], LEA[1])                        # vest
        p.l(sx + 4, sy, hx + 6, hy, LEA[0], 3)                                                                             # brace
        p.r(hx - 13, hy - 2, hx + 15, hy + 3, LEA[0]); p.r(hx + 2, hy - 2, hx + 7, hy + 3, BR3); p.r(hx + 3, hy - 1, hx + 6, hy + 2, LEA[0])
        dust(p, 10, 9, (hx - 10, sy + 6, hx + 10, hy - 4), (COAL[2], (120, 110, 94)))
    def head(p, K):
        x, y = K['head']
        p.poly([(x - 2, y + 4), (x + 15, y + 2), (x + 17, y + 7), (x + 9, y + 9), (x + 1, y + 8)], (150, 146, 138))      # moustache
        p.l(x + 3, y + 4, x + 14, y + 3, (196, 192, 182))
        p.poly([(x + 9, y - 3), (x + 15, y + 1), (x + 9, y + 3)], SKIN[2])                                               # nose
        p.l(x + 3, y - 6, x + 11, y - 5, (150, 146, 138), 2)
        if eyes:
            ell(p, x + 7, y - 2, 1.6, 1.4, WHITE); p.p(x + 8, y - 2, BLK[0])
        else:
            p.l(x + 5, y - 2, x + 9, y - 2, BLK[0])
        if mouth:
            p.e(x + 5, y + 8, x + 12, y + 9 + mouth * 2, (80, 16, 20))
        dust(p, 6, 3, (x - 8, y - 2, x + 2, y + 8), (SKIN[0], COAL[2]))
        if hat:
            helmet(p, x + 1, y - 7, 1.0, -0.05)
    def front(p, K):
        x, y = K['handF']
        if sl is not None:
            sledge(p, x, y, sl, 36)
        ell(p, x, y, 3.5, 3.5, LEA[2])
        bx, by = K['handB']
        if dyn:
            dynamite(p, bx - 2, by - 2, -1.2, True)
    rig(p, 42, f, LL=34, TL=30, HR=10, step=step, bob=bob, lean=lean, crouch=crouch, legs=((44, 40, 46), (66, 62, 70)), leg_w=11,
        body=((150, 140, 120), (186, 176, 154)), body_w=(14, 14), arms=(SKIN[1], SKIN[2]), arm_w=8, AL=30, aB=aB, aF=aF, skin=SKIN,
        hands=LEA[2], shoes=BLK[1], on_far=far, on_torso=torso, on_head=head, on_front=front)
    for fx, fy in K0['feet']:                                                 # heavy boots
        p.r(fx - 5, f - 12, fx + 5, f - 1, LEA[0]); p.r(fx - 5, f - 3, fx + 10, f, BLK[0]); p.l(fx - 5, f - 12, fx + 5, f - 12, LEA[2])
    im = outline_same(p.im)
    q = Pic(BS, BS)
    if hat and beam:
        x, y = K0['head']
        for j in range(9):
            q.p(x + 22 + j * 3, y - 13 + (j % 3) - 1 + j * 0.4, LAMP[2] if j < 3 else LAMP[0])
    if fly:
        dynamite(q, fly[0], fly[1], fly[2] if len(fly) > 2 else 0.6, True, 1.2)
    if chips:
        r2 = random.Random(80 + chips)
        for j in range(9):
            a = -math.pi / 2 + r2.uniform(-1.2, 1.2)
            d = 4 + chips * 6 + r2.uniform(0, 6)
            x, y = 92 + math.cos(a) * d * 0.8, f - 2 + math.sin(a) * d
            q.r(x, y, x + 1, y + 1, ROCK[r2.randrange(2, 5)])
    return on(im, outline_same(q.im)) if (fly or chips) else on(im, q.im)


@builder('foreman')
def make_foreman():
    R = foreman_frame
    save_boss('foreman', 'idle', [R(bob=(0, 0, 1, 1, 0)[i], aF=(0.9 + (0, 0.03, 0.06, 0.03, 0)[i], 0.3), sl=0.9 + (0, 0.03, 0.06, 0.03, 0)[i]) for i in range(5)])
    save_boss('foreman', 'attack', [R(aF=(2.0, 0.4), sl=2.6, lean=-2, mouth=1), R(aF=(2.9, 0.3), sl=3.5, lean=-5, mouth=1),
                                    R(aF=(2.4, 0.1), sl=2.6, lean=1, mouth=2), R(aF=(1.5, 0.1), sl=0.7, lean=4, crouch=4, mouth=3, chips=1),
                                    R(aF=(1.3, 0.2), sl=0.68, lean=4, crouch=3, mouth=2, chips=2), R(aF=(1.1, 0.3), sl=0.9, lean=2, mouth=1)])
    save_boss('foreman', 'cast', [R(aB=(1.6, 1.0), dyn='lit', mouth=1), R(aB=(2.8, 0.6), dyn='lit', mouth=3, lean=-3),
                                  R(aB=(2.0, 0.1), mouth=3, lean=3, fly=(90, 34, 0.4)), R(aB=(1.0, 0.3), mouth=3, lean=4, fly=(106, 44, 1.6)),
                                  R(aB=(0.4, 0.4), mouth=2, lean=2), R(aB=(-0.2, 0.5), mouth=1)])
    save_boss('foreman', 'hurt', [flash(R(lean=-5, mouth=3, eyes=0, aF=(1.4, 0.4), sl=1.6), WHITE), R(lean=-3, mouth=2, aF=(1.1, 0.3), sl=1.2), R(lean=-1)])
    base = R(eyes=0, mouth=2, hat=False, aF=(0.4, 0.2), aB=(-0.1, 0.2), sl=None)
    fallen = lambda k: fall(base, k, 90, BS, BS_FEET)
    q = Pic(BS, BS); sledge(q, 40, BS_FEET - 5, 1.62, 30); sl_im = outline_same(q.im)
    q = Pic(BS, BS); helmet(q, 92, BS_FEET - 1, 0.85, 0.35, lit=False)
    hat_im = outline_same(q.im)
    fallen_ = fallen
    fallen = lambda k: on(sl_im, fallen_(k)) if k >= 0.9 else fallen_(k)
    save_boss('foreman', 'death', [flash(R(lean=-5, mouth=3, eyes=0, aF=(1.6, 0.5), sl=2.0), WHITE), R(lean=-7, mouth=3, eyes=0, crouch=5, hat=False, aF=(2.0, 0.4), aB=(2.2, 0.4), sl=2.6),
                                   on(fallen(0.3), hat_im), on(fallen(0.6), hat_im), on(fallen(0.9), hat_im), on(fallen(1.0), hat_im), on(fallen(1.0), hat_im)])


# ================================================================== THE STAR SEER (drawn, 116x116)
def telescope_staff(p, x, y, a, L=58, glow=0):
    """The star seer's staff: a long brass telescope held at (x, y) along a (from straight down): a dark wooden grip,
    three brass draw tubes widening towards the top, rings, and a glass lens at the top end that lights up (glow)."""
    u = (math.sin(a), math.cos(a))
    if u[1] < -0.3:                                                           # held high: keep the lens inside the cell
        L = min(L, (y - 16) / -u[1] - 2)
    P = lambda t: (x + u[0] * t, y + u[1] * t)
    p.l(*P(-L * 0.35), *P(0), WD1, 3)
    for t0, t1, w, c in ((0, L * 0.4, 3, BR1), (L * 0.4, L * 0.75, 4, BR2), (L * 0.75, L, 5, BR3)):
        p.l(*P(t0), *P(t1), c, w)
        p.l(*P(t1), *P(t1 + 1), BR4, w + 2)
    ex, ey = P(L + 2)
    ell(p, ex, ey, 3.5, 3.5, ICE[1 + min(glow, 2)]); p.p(ex - 1, ey - 1, WHITE)
    return ex, ey


def starseer_frame(bob=0, lean=0.0, staff=3.0, aF=None, aB=(0.3, 0.6), eyes=1, glow=0, shot=0, cons=0, hood=0.0, k=0):
    """Front-left three-quarter view facing right: the star seer - a hovering figure in a midnight-blue mantle strewn
    with stars and edged in gold, wide sleeves, a deep hood with two glowing eyes in the dark, a brass telescope staff
    (staff = its angle from straight down; pi = upright); no feet: the hem floats above the floor with a faint glow under
    it.  shot 1..3 = a star shot bursting from the lens (attack), cons 1..3 = a constellation drawing itself round him
    (cast), hood = how far the hood droops (death)."""
    p = Pic(BS, BS)
    f = BS_FEET
    cx = 52 + lean * 0.3
    top = 25 + bob + hood * 10
    hem = f - 10 + bob * 0.5
    sw = math.sin(k * 0.9) * 2
    # mantle
    p.poly([(cx - 8, top + 14), (cx + 10, top + 14), (cx + 26 + sw, hem - 4), (cx + 18 + sw, hem), (cx, hem - 3), (cx - 16 - sw, hem), (cx - 26 - sw, hem - 6)], ROBE[1])
    p.poly([(cx - 4, top + 16), (cx + 9, top + 16), (cx + 20 + sw, hem - 4), (cx + 4, hem - 4), (cx - 10, hem - 6)], ROBE[2])
    p.lines([(cx + 26 + sw, hem - 4), (cx + 18 + sw, hem), (cx, hem - 3), (cx - 16 - sw, hem), (cx - 26 - sw, hem - 6)], AU2, 2)
    p.l(cx + 10, top + 14, cx + 26 + sw, hem - 4, AU1, 2)
    r2 = random.Random(5)
    for j in range(26):                                                       # stars on the mantle
        t = r2.uniform(0.1, 0.95); s_ = r2.uniform(-1, 1)
        y = top + 14 + (hem - top - 16) * t
        hw = 8 + 18 * t
        x = cx + s_ * hw * 0.9
        c = STAR[2] if (j + k) % 5 == 0 else STAR[1] if j % 2 else STAR[0]
        p.p(x, y, c)
        if j % 7 == 0:
            p.ps([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)], STAR[0])
    # far sleeve and hand
    sh = (cx + 4, top + 18)
    eB = pt(aB[0], 14, *sh); hB = pt(aB[0] + aB[1], 14, *eB)
    p.lines([sh, eB, hB], ROBE[0], 9); p.lines([sh, eB], ROBE[1], 6)
    ell(p, hB[0], hB[1], 2.5, 2.5, (150, 160, 200))
    # hood
    hx, hy = cx + 4, top + 6
    p.poly([(hx - 11, hy + 12), (hx - 10, hy - 4), (hx - 2, hy - 11 + hood * 4), (hx + 8, hy - 8 + hood * 3), (hx + 12, hy + 4 + hood * 2), (hx + 9, hy + 12)], ROBE[1])
    p.poly([(hx - 8, hy + 10), (hx - 7, hy - 3), (hx - 1, hy - 8 + hood * 4), (hx + 6, hy - 5 + hood * 3), (hx + 3, hy + 10)], ROBE[2])
    p.e(hx - 1, hy - 4 + hood * 3, hx + 10, hy + 9, (6, 6, 16))
    p.arc(hx - 9, hy - 9, hx + 13, hy + 14, 250, 330, AU2)
    if eyes:
        for ex_ in (hx + 3, hx + 7):
            p.r(ex_, hy + 1 + hood * 3, ex_ + 1, hy + 2 + hood * 3, ICE[3] if not glow else WHITE)
    # near sleeve, hand and the staff
    a_f = aF or (staff - math.pi + 0.6, -0.3)
    shF = (cx + 6, top + 20)
    eF = pt(a_f[0], 13, *shF); hF = pt(a_f[0] + a_f[1], 13, *eF)
    lens = telescope_staff(p, hF[0], hF[1], staff, 58, glow)
    p.lines([shF, eF, hF], ROBE[1], 10); p.lines([shF, eF], ROBE[2], 6)
    p.l(eF[0], eF[1], hF[0], hF[1], AU2, 1)
    ell(p, hF[0], hF[1], 3, 3, (150, 160, 200))
    im = outline_same(p.im, (6, 6, 18))
    q = Pic(BS, BS)
    for j in range(9):                                                        # the faint glow under the hem
        q.p(cx - 18 + j * 4 + (k % 2) * 2, f - 2 - (j % 2) * 2, ICE[1] if j % 3 else ICE[2])
    if shot:
        lx, ly = lens
        r = 4 + shot * 2
        sx = min(lx + shot * 3, BS - r - 7)
        star5(q, sx, ly, r, WHITE, ICE[1]); star5(q, sx, ly, r * 0.5, ICE[2])
        for j in range(8):
            a = j / 8 * TAU
            q.l(sx + math.cos(a) * (r + 2), ly + math.sin(a) * (r + 2), sx + math.cos(a) * (r + 5), ly + math.sin(a) * (r + 5), ICE[2])
    if cons:
        CON = [(14, 26), (26, 16), (40, 12), (70, 14), (88, 22), (100, 36), (96, 52), (16, 46)]
        n = min(len(CON), 3 + cons * 2)
        q.lines(CON[:n], (200, 180, 110))
        for x, y in CON[:n]:
            star5(q, x, y, 4, WHITE, ICE[2])
        halo(q, lens[0], lens[1], 8 + cons * 2, (ICE[2], WHITE), 10, cons)
    return on(im, q.im)


def squash_floor(im, k, floor=BS_FEET):
    """The frame squashed down towards the floor row by k (0..1) - the mantle collapsing."""
    b = im.getbbox()
    h = b[3] - b[1]
    nh = max(4, round(h * (1 - k)))
    part = im.crop((0, b[1], im.width, b[3])).resize((im.width, nh), Image.NEAREST)
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    out.paste(part, (0, floor + 1 - nh))
    return out


def mantle_heap(k):
    p = Pic(BS, BS)
    f = BS_FEET
    p.poly([(22, f), (34, f - 12), (52, f - 16), (70, f - 12), (88, f)], ROBE[1]); p.poly([(32, f - 1), (44, f - 11), (60, f - 12), (74, f - 2)], ROBE[2])
    p.l(22, f, 88, f, AU2, 2)
    r2 = random.Random(6)
    for j in range(10):
        p.p(r2.uniform(32, 80), r2.uniform(f - 11, f - 2), STAR[1] if j >= k * 3 else ROBE[3])
    telescope_staff(p, 22, f - 4, math.pi / 2 - 0.04, 56, 0)
    return outline_same(p.im, (6, 6, 18))


@builder('starseer')
def make_starseer():
    S = starseer_frame
    save_boss('starseer', 'idle', [S(bob=(0, -1, -2, -1, 0)[i], k=i, staff=3.0 + (0, 0.02, 0.04, 0.02, 0)[i]) for i in range(5)])
    save_boss('starseer', 'attack', [S(staff=2.6, k=0), S(staff=2.0, k=1, glow=1), S(staff=1.6, k=2, glow=2, shot=1, lean=3),
                                     S(staff=1.6, k=3, glow=2, shot=2, lean=4), S(staff=1.8, k=4, glow=1, shot=3, lean=2), S(staff=2.6, k=5)])
    save_boss('starseer', 'cast', [S(staff=3.1, k=0, glow=1, cons=1), S(staff=3.3, k=1, glow=2, cons=2, bob=-2), S(staff=3.35, k=2, glow=2, cons=3, bob=-3),
                                   S(staff=3.35, k=3, glow=2, cons=3, bob=-3), S(staff=3.3, k=4, glow=2, cons=2, bob=-2), S(staff=3.1, k=5, glow=1, cons=1)])
    save_boss('starseer', 'hurt', [flash(S(lean=-6, eyes=0, staff=3.4), WHITE), S(lean=-4, staff=3.2), S(lean=-1)])
    save_boss('starseer', 'death', [flash(S(eyes=0, hood=0.3, staff=3.3), WHITE), S(eyes=0, hood=0.6, staff=3.5, bob=4),
                                    squash_floor(S(eyes=0, hood=1.0, staff=3.6, bob=8), 0.25), squash_floor(S(eyes=0, hood=1.0, staff=3.6), 0.5),
                                    mantle_heap(0), mantle_heap(1), mantle_heap(3)])


# ================================================================== PROPS
def minecart(k):
    """A mine cart on its wheels: a riveted iron tub, wider at the top, with a wooden rim, a coupling hook and four
    spoked wheels (two seen); k 0 = empty (the dark inside shows), 1 = loaded with ore - coal lumps with gold glints."""
    p = Pic(56, 40)
    f = 39
    if k:
        for j, (x, r) in enumerate(((12, 5), (19, 6), (27, 6.5), (35, 6), (43, 5), (23, 4), (32, 4.5))):
            y = 10 - r * 0.3 - (j >= 5) * 3
            shade_ball(p, x, y, r, COAL[1:], r * 0.8)
            if j % 2 == 0:
                p.p(x + 1, y - 1, ORE[2]); p.p(x - 2, y + 1, ORE[1])
    p.poly([(4, 13), (51, 13), (46, 31), (9, 31)], I1)
    p.poly([(6, 15), (49, 15), (45, 29), (10, 29)], I2)
    if not k:
        p.r(6, 13, 49, 15, (20, 18, 22))
    p.r(3, 11, 52, 14, WD1); p.l(3, 11, 52, 11, WD3)
    for x in (10, 27, 44):
        p.l(x, 15, x - 1 + (x - 27) * 0.08, 29, I1, 2)
    for x in (8, 18, 37, 47):
        p.p(x, 17, I3); p.p(x - (x - 27) * 0.1, 27, I3)
    p.l(51, 24, 55, 24, I2, 2); p.l(0, 24, 4, 24, I2, 2)
    for x in (15, 40):
        ell(p, x, f - 6, 6, 6, I0); ell(p, x, f - 6, 4.5, 4.5, I1)
        for a in range(4):
            p.l(x, f - 6, x + math.cos(a * 0.785) * 4, f - 6 + math.sin(a * 0.785) * 4, I2)
            p.l(x, f - 6, x - math.cos(a * 0.785) * 4, f - 6 - math.sin(a * 0.785) * 4, I2)
        ell(p, x, f - 6, 1.2, 1.2, I3)
    return outline_same(p.im)


def dynamite_crate():
    """A crate of dynamite: rough planks stencilled with a red band and a warning skull, a bundle of red sticks with
    fuses sticking out of the open top."""
    p = Pic(30, 30)
    for j in range(5):
        dynamite(p, 6 + j * 4, 9 - (j % 2), -1.45 + (j - 2) * 0.08, False, 1.0)
    p.r(2, 10, 27, 29, TIM[2])
    for y in (14, 19, 24):
        p.l(2, y, 27, y, TIM[1])
    p.l(2, 10, 27, 10, TIM[4]); p.r(2, 10, 4, 29, TIM[3]); p.r(25, 10, 27, 29, TIM[1])
    p.r(5, 15, 24, 21, (170, 30, 26))
    p.bitmap(12, 15, [".###.", "#.#.#", "#####", ".#.#.", ".###."], {'#': (240, 230, 210)})
    p.p(13, 16, (170, 30, 26)); p.p(15, 16, (170, 30, 26))
    return outline_same(p.im)


def carbidelamp(k):
    """A carbide lamp hung from a timber post: a brass lamp with a reflector dish and a flickering bright flame jet, and a
    few light pixels round it (2 frames)."""
    p = Pic(28, 64)
    p.r(4, 8, 8, 63, TIM[2]); p.l(4, 8, 4, 63, TIM[3]); p.l(8, 8, 8, 63, TIM[0])
    p.r(4, 8, 22, 11, TIM[2]); p.l(4, 8, 22, 8, TIM[3])
    p.l(18, 11, 18, 18, I2)
    p.r(15, 22, 21, 31, BR2); p.l(15, 22, 15, 31, BR3); p.r(16, 19, 20, 22, BR3)
    p.poly([(20, 21), (24, 18), (24, 28), (20, 25)], BR3); p.l(24, 18, 24, 28, BR4)
    flame(p, 22 + 0.5 * k, 24, 4 + k, 0.8 - k * 0.6, 0.8, (LAMP[0], LAMP[1], LAMP[2], WHITE))
    im = outline_same(p.im)
    q = Pic(28, 64)
    halo(q, 22, 22, 4 + k, (LAMP[1], LAMP[0]), 8, k + 3)
    return on(im, q.im)


def orrery(k):
    """An orrery: a brass tripod stand, a ring of the ecliptic, a golden sun ball at the centre and three planets on
    curved brass arms that turn round it (3 frames)."""
    p = Pic(48, 56)
    cx, cy = 24, 22
    p.l(cx, cy, cx, 50, BR1, 3); p.l(cx, 44, cx - 10, 55, BR1, 2); p.l(cx, 44, cx + 10, 55, BR1, 2); p.l(cx, 44, cx, 55, BR2, 2)
    p.e(cx - 6, 48, cx + 6, 51, BR0)
    back, front = [], []
    for j, (R, c, s, ph) in enumerate(((20, (200, 90, 60), 3, 0.0), (14, (90, 150, 220), 2.6, 2.1), (8, (200, 190, 160), 2, 4.0))):
        a = ph + k * TAU / 3 * (1 if j % 2 == 0 else -1) * (j + 1) * 0.4
        x, y = cx + math.cos(a) * R, cy + math.sin(a) * R * 0.35
        (back if math.sin(a) < 0 else front).append((x, y, c, s, j))
    p.arc(cx - 20, cy - 7, cx + 20, cy + 7, 180, 360, BR2)
    for x, y, c, s, j in back:
        p.l(cx, cy, x, y, BR1); shade_ball(p, x, y, s, (dark(c, 0.5), c, tuple(min(255, v + 50) for v in c)))
    shade_ball(p, cx, cy, 5.5, (AU1, AU2, AU3, AU4))
    p.arc(cx - 20, cy - 7, cx + 20, cy + 7, 0, 180, BR3)
    for x, y, c, s, j in front:
        p.l(cx, cy, x, y, BR2); shade_ball(p, x, y, s, (dark(c, 0.5), c, tuple(min(255, v + 50) for v in c)))
        if j == 0:
            p.arc(x - 5, y - 2, x + 5, y + 2, 0, 360, (220, 200, 150))
    im = outline_same(p.im)
    q = Pic(48, 56)
    halo(q, cx, cy, 8, (AU3, LAMP[1]), 8, k)
    return on(im, q.im)


def telescope_prop():
    """A big brass telescope on a wooden tripod, tilted up to the sky: draw tubes with rings, a finder scope, an eyepiece
    and a dark lens with a glint."""
    p = Pic(56, 64)
    p.l(26, 34, 12, 63, WD2, 3); p.l(28, 34, 42, 63, WD2, 3); p.l(27, 34, 30, 63, WD3, 2)
    p.l(18, 52, 37, 52, WD1, 2)
    x0, y0, x1, y1 = 10, 44, 50, 6
    for t0, t1, w, c in ((0, 0.35, 5, BR1), (0.35, 0.7, 7, BR2), (0.7, 1.0, 9, BR3)):
        p.l(x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0, x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1, c, w)
        xa, ya = x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1
        p.l(xa - 3, ya - 3, xa + 3, ya + 3, BR4, 2)
    p.l(20, 30, 40, 13, BR1, 2)
    ell(p, x1 + 1, y1 - 1, 4, 4, NAVY[0]); p.p(x1, y1 - 2, ICE[3])
    p.l(x0 - 4, y0 + 2, x0, y0, BR0, 3)
    ell(p, 27, 33, 3, 3, BR1)
    return outline_same(p.im)


def starportal(k):
    """A star gate: a standing brass ring on a stepped plinth with zodiac studs, filled with a swirling starfield in
    violet and blue (2 frames, the swirl turns)."""
    p = Pic(52, 64)
    cx, cy, R = 26, 30, 22
    p.e(cx - R - 3, cy - R - 3, cx + R + 3, cy + R + 3, BR1); p.e(cx - R - 1, cy - R - 1, cx + R + 1, cy + R + 1, BR3)
    p.e(cx - R + 2, cy - R + 2, cx + R - 2, cy + R - 2, VIO[1])
    for j in range(70):
        t = j / 70
        a = t * 9 + k * 0.6
        r = 2 + t * (R - 4)
        c = (VIO[3], NAVY[3], VIO[2], STAR[1], ICE[1])[j % 5]
        p.p(cx + math.cos(a) * r, cy + math.sin(a) * r, c)
        p.p(cx + math.cos(a + math.pi) * r * 0.8, cy + math.sin(a + math.pi) * r * 0.8, VIO[2])
    ell(p, cx, cy, 3, 3, STAR[1]); p.p(cx, cy, WHITE)
    for j in range(12):
        a = j / 12 * TAU + 0.26
        p.p(cx + math.cos(a) * (R + 1), cy + math.sin(a) * (R + 1), AU3 if (j + k) % 3 == 0 else BR2)
    p.r(cx - 16, 54, cx + 16, 58, BR1); p.r(cx - 20, 58, cx + 20, 63, BR0); p.l(cx - 16, 54, cx + 16, 54, BR3)
    p.r(cx - 4, cy + R, cx + 4, 54, BR1)
    im = outline_same(p.im, (20, 10, 30))
    q = Pic(52, 64)
    halo(q, cx, cy, R + 5, (VIO[4], STAR[1]), 14, k + 1)
    return on(im, q.im)


def boulder2():
    """A fallen boulder: a big cracked grey rock with chipped facets, a few chips and dust at its foot."""
    p = Pic(44, 38)
    pts = [(4, 37), (2, 24), (8, 10), (20, 3), (32, 5), (40, 15), (42, 30), (38, 37)]
    p.poly(pts, ROCK[2])
    p.poly([(8, 12), (20, 5), (30, 7), (24, 18), (12, 22)], ROCK[3]); p.poly([(20, 5), (30, 6), (26, 10)], ROCK[4])
    p.poly([(30, 22), (40, 18), (41, 30), (36, 35), (28, 34)], ROCK[1])
    p.lines([(18, 20), (22, 28), (19, 36)], ROCK[0]); p.lines([(30, 9), (33, 16), (38, 20)], ROCK[0])
    p.r(0, 35, 3, 37, ROCK[1]); p.r(40, 34, 43, 37, ROCK[2])
    im = outline_same(p.im)
    q = Pic(44, 38)
    dust(q, 8, 4, (2, 33, 42, 37), ((150, 140, 120), ROCK[3]))
    return on(im, q.im)


@builder('props')
def make_props():
    save_prop('minecart', [minecart(k) for k in range(2)])
    save_prop('dynamite', [dynamite_crate()])
    save_prop('carbidelamp', [carbidelamp(k) for k in range(2)])
    save_prop('orrery', [orrery(k) for k in range(3)])
    save_prop('telescope', [telescope_prop()])
    save_prop('starportal', [starportal(k) for k in range(2)])
    save_prop('boulder2', [boulder2()])


# ================================================================== ITEMS, PARTICLES AND ICONS
@builder('items')
def make_items():
    p = Pic(14, 20)                                                           # a flask of stardust (ammo for the star lance)
    p.r(5, 1, 8, 4, WD3); p.r(4, 4, 9, 5, BR3)
    p.e(1, 6, 12, 19, (150, 170, 210)); p.e(2, 8, 11, 18, VIO[1])
    for x, y, c in ((4, 11, STAR[2]), (7, 13, ICE[2]), (9, 10, STAR[1]), (5, 15, VIO[4]), (8, 16, STAR[2]), (6, 9, ICE[3])):
        p.p(x, y, c)
    p.l(3, 9, 3, 14, (220, 230, 250))
    save(hard(outline_same(p.im)), G_OUT + 'item_stardust.png')
    p = Pic(40, 26)                                                           # the pickaxe's pickup, lying on its side
    pickaxe(p, 4, 22, 2.25, 30, 11)
    save(hard(outline_same(p.im).crop(outline_same(p.im).getbbox())), G_OUT + 'pick_pickaxe.png')
    p = Pic(58, 14)                                                           # the star lance's pickup, lying sideways
    p.l(2, 7, 16, 7, WD1, 3); p.l(16, 7, 44, 7, BR2, 3); p.l(16, 6, 44, 6, BR3)
    for x in (16, 28, 40):
        p.l(x, 4, x, 10, BR4, 2)
    p.poly([(44, 3), (48, 7), (44, 11)], BR1)
    p.poly(star_pts(51, 7, 6, 0.3, 0.45), STAR[1]); p.poly(star_pts(51, 7, 3, 0.3, 0.45), WHITE)
    save(hard(outline_same(p.im)), G_OUT + 'pick_starlance.png')


@builder('particles')
def make_particles():
    fr = []                                                                   # coal chips (2 frames 8x8, tumbling)
    for k in range(2):
        p = Pic(8, 8)
        p.poly([(2, 1 + k), (6, 2), (6 - k, 6), (1, 5 - k)], COAL[2]); p.p(3, 2 + k, COAL[4]); p.p(5, 5 - k, EMB[1])
        fr.append(outline_same(p.im, COAL[0]))
    save(cells(fr, 8, 8), G_OUT + 'part_coal.png', 2)
    fr = []                                                                   # stardust (3 frames 8x8, twinkling)
    for k in range(3):
        p = Pic(8, 8)
        r2 = random.Random(300 + k)
        for j in range(4):
            x, y = r2.randrange(1, 7), r2.randrange(1, 7)
            p.p(x, y, (STAR[2], ICE[2], VIO[4], STAR[1])[(j + k) % 4])
        x = (2, 4, 5)[k]; y = (4, 2, 5)[k]
        p.ps([(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], STAR[1]); p.p(x, y, WHITE)
        fr.append(p.im)
    save(cells(fr, 8, 8), G_OUT + 'part_stardust.png', 3)
    fr = []                                                                   # a meteor falling down-left, tail up-right (2 frames 12x12)
    for k in range(2):
        p = Pic(12, 12)
        p.l(4, 8, 11, 1, F0, 3); p.l(4, 8, 9 - k, 3 + k, F1, 2); p.l(4, 8, 7, 5, F3)
        ell(p, 3.5, 8.5, 2.5, 2.5, ROCK[1]); p.p(3, 8, ROCK[3]); p.p(2 + k, 10, F2)
        fr.append(p.im)
    save(cells(fr, 12, 12), G_OUT + 'part_meteor2.png', 2)
    fr = []                                                                   # a gas bubble (2 frames 8x8: rising, popping)
    for k in range(2):
        p = Pic(8, 8)
        if k == 0:
            p.e(1, 1, 6, 6, GAS[1]); p.e(2, 2, 5, 5, GAS[2]); p.p(2, 2, GAS[3])
        else:
            for x, y in ((1, 3), (6, 3), (3, 1), (4, 6), (2, 6), (5, 1)):
                p.p(x, y, GAS[2])
            p.p(3, 3, GAS[3])
        fr.append(p.im)
    save(cells(fr, 8, 8), G_OUT + 'part_gasbubble.png', 2)


@builder('icons')
def make_icons():
    p = Pic(8, 8)                                                             # HUD: low gravity (a figure floating over an up arrow)
    p.bitmap(0, 0, ["...#....", "..###...", ".#.#.#..", "...#....", "........", ".#...#..", "#.#.#.#.", "...#...."], {'#': WHITE})
    save(p.im, G_OUT + 'icon_lowgrav.png')
    p = Pic(8, 8)                                                             # HUD: choking gas (a cloud of bubbles)
    p.bitmap(0, 0, ["..#..#..", ".#.#....", "..#..##.", "....#..#", ".##..##.", "#..#....", "#..#.##.", ".##.#..#"], {'#': WHITE})
    save(p.im, G_OUT + 'icon_gas.png')


# ================================================================== CONTACT SHEET AND CHECKS
NEW_WEAPONS = ('pickaxe', 'starlance')


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
    64x64 with a mean brightness of 40-115."""
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
            rgb = np.array(im.convert('RGB')).astype(float)
            lum = (rgb @ np.array([0.299, 0.587, 0.114])).mean()
            ok = im.size == want and 40 <= lum <= 115
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
    out.save(SCR + 'v19_tiles.png')


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
