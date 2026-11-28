#!/usr/bin/env python3
"""Version 18 graphics for Krypta ("Cirkusen och Djungeltemplet"): the abandoned circus and the jungle temple, twelve new
enemies, the ringmaster and the feathered serpent, textures, props, items, particles and HUD icons.

Run from the folder that holds retrofps/ and assets/ (e.g. /home/user/test):
    python3 retrofps/tools/props15/make.py [name ...]
(with names only those builders run, e.g. `python3 retrofps/tools/props15/make.py clown sheet`; the contact sheet always
shows everything this script has written so far, plus the two new first-person weapons)

The first-person weapons pinthrower / blowgun (fp_*.png, js/weapons.js) come from tools/weapon-frames (render-static.mjs +
pack.py, see the README there, version 18); their static-defs.json entries are built by tools/props15/fp_defs.py.

Out to retrofps/assets/gfx (all enemy cells 64x64, feet row 57, facing right; frames idle 4, movement 6, attack 6,
take_damage 3, death 6; every death ends lying / settled on the floor):
  enemies-clown_*          a sad clown in a baggy yellow polka-dot suit, a ruff, orange frizz, a tiny bowler and big red
                           shoes; a bulb horn (honks) and a rubber mallet; attack = the mallet smash
  enemies-juggler_*        a thin harlequin with a jester cap juggling three pins; attack throws them in an arc
  enemies-stiltwalker_*    a tall stilt walker (striped trousers over wooden stilts, a tailcoat, a tall striped hat) - the
                           tallest figure in the cell, attack = a stilt kick, death topples him and his hat rolls away
  enemies-knifethrower_*   black bolero with a bandolier of knives, a red sash, a curled moustache; attack throws a fan of
                           three knives
  enemies-lion_*           a circus lion with a dark mane and a red collar; attack a roar and a leaping bite
  enemies-marionette_*     a jointed wooden puppet on strings up to a control cross near the top of the cell; it moves in
                           jerky hops; death cuts the strings and it collapses into a heap of wooden limbs
  enemies-lizardman_*      a green lizard warrior with a hide shield in front and a spear; attack = a spear thrust
  enemies-blowgunner_*     a crouching painted hunter with a feather headband and a long blowgun; attack puffs a dart
  enemies-monkey_*         a small thieving monkey; attack grabs and runs off with a box of ammo
  enemies-jaguar_*         the jaguar: the lion's body lower and spotted, green eyes, a leaping bite
  enemies-mosquito_*       a mosquito about 26 px with wings, drawn low (the game lifts flying enemies); attack stabs and
                           swells red with blood; death falls on its back on the floor
  enemies-templeguardian_* a squat mossy stone statue with a jade jaguar mask; attack = the eyes light up and fire a ray;
                           death cracks it into rubble
  boss_ringmaster_{idle,attack,cast,hurt,death}.png, boss_serpent_{...}.png (116x116 cells, feet row 115; idle 5, attack 6,
      cast 6, hurt 3, death 7; attack and cast loop while the state lasts, so they start and end in similar poses).
      The ringmaster (tall top hat, waxed moustache, red tailcoat with gold frogging, white breeches, riding boots, a
      bullwhip): attack = the whip lash ending in a crack, cast = he lifts his hat and points with the whip while a
      spotlight cone falls on him; death falls backwards and the hat rolls away.
      The feathered serpent (a heavy coil on the floor - its ground contact stays at x 22-82 in every frame - a rearing
      scaled neck, a gold belly, a crest and a collar of red, green, gold and blue feathers): attack = the strike down and
      forward, cast = the collar fans out and it spits venom; death sinks the neck down onto the coil.
  prop_knifewheel.png (2, turning), prop_prizewheel.png (2, spun), prop_balloons.png (2, bobbing), prop_marquee.png (2,
  bulbs chasing), prop_goldidol.png (2: with / without the idol), prop_dartidol.png (2: resting / firing),
  prop_poisonflower.png (2: closed / open with spores), prop_tikitorch.png (2, flickering),
  item_pinbox.png, item_dartquiver.png, pick_pinthrower.png, pick_blowgun.png,
  part_confetti.png (3, 8x8), part_pin.png (2, 10x10), part_dart.png (1, 10x3, pointing right like part_knife),
  part_leaf2.png (2, 8x8), icon_spotlight.png, icon_poison2.png (8x8, white)
Out to retrofps/assets/wall:
  wall_tent, wall_cage, wall_boss_ringmaster, wall_junglestone, wall_jungle, wall_boss_serpent (64x128)
  floor_sawdust, floor_ring, floor_boss_ringmaster, floor_jungle, floor_templestone, floor_boss_serpent, floor_trapdoor,
  floor_spotlight, floor_piranha, floor_vines (64x64); all palettized, mean brightness checked to stay in 40-115
Contact sheet: <scratchpad>/en/v18_sheet.png, seam check <scratchpad>/en/v18_tiles.png

Sources: everything is drawn procedurally below in the outlined style of tools/props2-props14, whose drawing helpers are
reused (no outside image is used).
Name clashes (existing files are never overwritten, save() refuses): part_leaf.png exists, so the new one is part_leaf2.png
as the contract says; nothing else clashed.
Suggested sizes (skeleton = 1.0; apparent height = size x figure px / cell px; figure heights from bbox_report, idle
frame 0): clown 1.0 (43 px of 64), juggler 1.0 (53 px with the pins in the air), stiltwalker 1.35 (56 px - tall on
purpose), knifethrower 1.0 (43 px), lion 1.3 (34 px tall, 46 long), marionette 1.05 (55 px with strings, the puppet 38),
lizardman 1.1 (41 px), blowgunner 1.0 (40 px crouched), monkey 0.7 (29 px), jaguar 1.2 (28 px tall, 46 long), mosquito 0.5
(27 px with wings, float - tiny), templeguardian 1.25 (55 px, heavy); bosses (116 px cells): ringmaster 4.0 (105 px with the
hat), serpent 4.4 (104 px tall, 92 wide).
Notes: floor_spotlight and floor_trapdoor are floor_sawdust (same array) lit / with the hatch, floor_vines is floor_jungle
(same array) overgrown, so they sit next to their plain floors.
"""
import importlib.util
import json
import math
import os
import random
import re
import sys

sys.dont_write_bytecode = True          # the helper modules of props2-props14 are loaded without writing __pycache__

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))


def _load(name, rel):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, '..', rel, 'make.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


P14 = _load('props14make', 'props14')          # loads props2-props13 itself; only its pure drawing helpers are used
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
I0, I1, I2, I3 = P2.I0, P2.I1, P2.I2, P2.I3
F0, F1, F2, F3 = P2.F0, P2.F1, P2.F2, P2.F3
AU0, AU1, AU2, AU3, AU4 = P5.AU0, P5.AU1, P5.AU2, P5.AU3, P5.AU4                # gold
BR0, BR1, BR2, BR3, BR4 = P7.BR0, P7.BR1, P7.BR2, P7.BR3, P7.BR4                # brass
WD0, WD1, WD2, WD3, WD4 = P10.WD0, P10.WD1, P10.WD2, P10.WD3, P10.WD4           # dark wood
STEEL = P13.STEEL

G_OUT, W_OUT, T_OUT = 'retrofps/assets/gfx/', 'retrofps/assets/wall/', 'retrofps/assets/touch/'
SCR = '/tmp/claude-0/-home-user/80ee56ba-2fa6-5354-b261-a4ca4fdcb508/scratchpad/en/'
SHEET, MANIFEST = SCR + 'v18_sheet.png', SCR + 'v18_manifest.json'
WHITE = (255, 255, 255)
FW, FEET = 64, 57                                       # enemy cells
BS, BS_FEET = 116, 115                                  # boss cells
TAU = math.tau

# ---------------------------------------------------------------- circus palettes
TR = ((54, 12, 16), (96, 22, 26), (132, 34, 34), (164, 58, 50), (196, 96, 82))            # faded tent red
TW = ((84, 76, 62), (118, 108, 88), (146, 136, 112), (170, 160, 134), (196, 188, 160))     # dingy tent white (never bright)
SAW = ((70, 50, 28), (104, 78, 44), (134, 104, 62), (160, 128, 80), (188, 156, 104))      # sawdust
CR = ((40, 10, 14), (80, 18, 24), (120, 30, 34), (158, 50, 48), (196, 84, 72))            # costume red
CY = ((70, 50, 8), (140, 110, 20), (200, 170, 40), (240, 220, 110))                        # costume yellow
CB = ((14, 22, 50), (30, 46, 96), (54, 80, 150), (100, 130, 200))                          # costume blue
CG = ((14, 46, 22), (30, 90, 40), (60, 140, 64), (120, 196, 110))                          # costume green
CP = ((40, 14, 50), (80, 30, 96), (124, 56, 140), (176, 110, 196))                         # costume purple
PAINT = ((150, 146, 140), (206, 202, 196), (236, 234, 228), (252, 252, 250))               # clown greasepaint
SKIN = ((80, 46, 30), (140, 90, 60), (190, 136, 100), (226, 182, 146))
BLK = ((14, 12, 16), (30, 28, 34), (52, 48, 58), (80, 76, 88))
LIO = ((70, 40, 14), (128, 80, 30), (184, 128, 52), (226, 180, 96))
MANE = ((50, 24, 10), (90, 44, 16), (130, 70, 26))
WOODP = ((50, 30, 16), (86, 56, 30), (124, 86, 48), (160, 120, 72))                        # puppet wood
# ---------------------------------------------------------------- jungle palettes
LZ = ((18, 40, 20), (36, 76, 34), (70, 120, 52), (130, 170, 80), (190, 210, 120))         # lizard scales
JG = ((10, 30, 12), (22, 58, 22), (40, 92, 32), (70, 130, 46), (120, 170, 70))           # foliage
EARTH = ((30, 20, 12), (52, 36, 22), (76, 54, 32), (100, 74, 46), (126, 96, 62))
STN = ((40, 44, 38), (66, 72, 62), (94, 100, 86), (124, 128, 110), (154, 156, 136))      # temple stone
MOSS = ((24, 44, 14), (44, 76, 24), (74, 110, 36), (110, 146, 56))
JADE = ((10, 50, 40), (24, 100, 76), (60, 160, 120), (140, 220, 180))
MONK = ((40, 24, 14), (74, 46, 26), (110, 74, 44), (150, 108, 70))
MSK = ((60, 40, 30), (120, 90, 64), (176, 140, 100), (220, 190, 150))                       # monkey face
JAG = ((80, 50, 14), (150, 100, 30), (206, 150, 56), (240, 200, 110))
TRIBE = ((60, 30, 18), (104, 60, 36), (146, 96, 62), (180, 130, 90))                        # blowgunner skin
FEA = {'r': ((90, 14, 14), (180, 40, 30), (240, 100, 70)), 'g': ((10, 70, 40), (30, 140, 80), (110, 210, 140)),
       'b': ((16, 40, 100), (40, 100, 200), (120, 180, 250)), 'y': ((110, 80, 10), (220, 170, 30), (255, 230, 120))}
SERP = ((14, 40, 30), (28, 80, 56), (50, 126, 84), (100, 180, 120), (170, 226, 170))      # serpent scales
BELLY = ((90, 80, 30), (160, 146, 60), (210, 196, 110), (240, 230, 170))
POISON = ((30, 70, 10), (80, 160, 20), (160, 230, 60), (220, 255, 150))

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


def pt(a, ln, x=0.0, y=0.0):
    """The point ln away from (x, y) at angle a measured from straight down, positive = forward (to the right)."""
    return (x + math.sin(a) * ln, y + math.cos(a) * ln)


def rig(p, cx, f, LL=14, TL=13, HR=5, step=None, bob=0, lean=0.0, crouch=0, stride=4, legs=(BLK[1], BLK[2]), leg_w=4,
        body=(CR[1], CR[2]), body_w=(5, 6), arms=(CR[1], CR[2]), arm_w=3, AL=13, aB=(0.2, 0.3), aF=(0.4, 0.4),
        skin=SKIN, hands=None, shoes=None, on_torso=None, on_head=None, on_far=None, on_front=None, head=True, feet_off=(0, 0)):
    """A side-view figure facing right on the floor row f: two legs (step = walk phase 0..1, None = standing), a torso, two
    arms (aB / aF = shoulder and elbow angles, from straight down, positive forward) and a round head.  The hooks draw
    costume parts at the right depth: on_far (behind everything), on_torso (over the body), on_head (the face / hat),
    on_front (over the near arm).  Returns the key points."""
    hip = (cx, f - LL + crouch + bob)
    sh = (cx + lean, hip[1] - TL)
    hd = (sh[0] + 1 + lean * 0.3, sh[1] - HR - 1)
    K = {'hip': hip, 'sh': sh, 'head': hd, 'f': f}
    foot = []
    for j, ph in enumerate((0.0, math.pi)):
        o = math.sin(((step or 0) * TAU) + ph) * stride if step is not None else (-1.5 if j == 0 else 1.5)
        fx = cx + o + feet_off[j]
        kx, ky = (hip[0] + fx) / 2 + 1.5 + crouch * 0.4, (hip[1] + f) / 2 - (1 if step is not None and o > 0 else 0)
        foot.append(((hip[0], hip[1]), (kx, ky), (fx, f - 1)))
    K['feet'] = [ft[2] for ft in foot]

    def arm(a):
        e = pt(a[0], AL / 2, sh[0], sh[1] + 1)
        h = pt(a[0] + a[1], AL / 2, *e)
        return e, h
    eB, hB = arm(aB)
    eF, hF = arm(aF)
    K.update(elbowB=eB, handB=hB, elbowF=eF, handF=hF)
    if on_far:
        on_far(p, K)
    limb(p, list(foot[0]), leg_w, dark(legs[0], 0.8))
    if shoes:
        p.r(foot[0][2][0] - 2, f - 1, foot[0][2][0] + 3, f, dark(shoes, 0.8))
    limb(p, [(sh[0] - 1, sh[1] + 1), eB, hB], arm_w, dark(arms[0], 0.8))
    if hands:
        ell(p, hB[0], hB[1], 1.5, 1.5, dark(hands, 0.8))
    p.poly([(hip[0] - body_w[0], hip[1] + 1), (hip[0] + body_w[0], hip[1] + 1), (sh[0] + body_w[1] - 1, sh[1]), (sh[0] - body_w[1], sh[1])], body[0])
    p.poly([(hip[0] - body_w[0] + 2, hip[1]), (hip[0] + body_w[0] - 1, hip[1]), (sh[0] + body_w[1] - 2, sh[1] + 1), (sh[0] - body_w[1] + 2, sh[1] + 1)], body[1])
    limb(p, list(foot[1]), leg_w, legs[0], legs[1])
    if shoes:
        p.r(foot[1][2][0] - 2, f - 1, foot[1][2][0] + 3, f, shoes)
    if on_torso:
        on_torso(p, K)
    if head:
        p.l(sh[0], sh[1], hd[0], hd[1] + HR - 1, skin[1], 3)
        ell(p, hd[0], hd[1], HR, HR + 0.5, skin[1]); ell(p, hd[0] - 0.4, hd[1] - 0.4, HR - 1, HR - 0.5, skin[2])
    if on_head:
        on_head(p, K)
    limb(p, [(sh[0] + 1, sh[1] + 1), eF, hF], arm_w, arms[0], arms[1])
    if hands:
        ell(p, hF[0], hF[1], 1.6, 1.6, hands)
    if on_front:
        on_front(p, K)
    return K


# ================================================================== CIRCUS TEXTURES
def stops(pal):
    n = len(pal)
    return [(i / (n - 1), c) for i, c in enumerate(pal)]


def tent_rgb(w, h, seed, sw=8, kr=1.0, kw=1.0):
    """Striped tent canvas (tiles both ways): vertical red and dingy white stripes sw px wide with soft hanging folds,
    seam stitches between the stripes and a weave of noise."""
    yy, xx = np.mgrid[0:h, 0:w]
    nz = pnoise(w, h, seed, ((16, 1.0), (4, 0.4)))
    fold = np.sin(xx / w * TAU * 4 + 0.6) * 0.5 + 0.5                         # folds hang straight down
    lum = np.clip(0.32 + fold * 0.32 + (nz - 0.5) * 0.35 + ((xx + yy) % 2) * 0.03, 0, 1)
    red = ((xx // sw) % 2) == 0
    rgb = np.where(red[..., None], gmap(lum * kr, stops(TR)), gmap(lum * kw, stops(TW)))
    seam = (xx % sw) == 0
    rgb[seam] = rgb[seam] * 0.72
    rgb[seam & (yy % 3 == 0)] = TW[3]
    return rgb


def tex_wall_tent():
    """The big top from inside: faded red and dingy white stripes with folds, a scalloped valance with a gold fringe at
    the top, a rope tie, and grime rising from the sawdust at the foot - kept dim so the stripes never glare."""
    w, h = 32, 64
    rgb = tent_rgb(w, h, 1801)
    yy, xx = np.mgrid[0:h, 0:w]
    val = yy < 7 + (np.abs(((xx % 8) - 3.5)) < 3) * 2 - (np.abs((xx % 8) - 3.5) < 1.5)    # scalloped valance
    rgb[val] = gmap(np.clip(0.35 + pnoise(w, h, 1802)[val] * 0.4, 0, 1), stops(CR))
    rgb[yy == 0] = CR[0]
    edge = (~val) & np.roll(val, 1, 0)
    rgb[edge] = CY[1]
    rgb[edge & (xx % 2 == 0)] = CY[2]
    sh = np.clip((yy - 46) / 18, 0, 1)
    rgb = rgb * (1 - sh[..., None] * 0.45) + sh[..., None] * np.array(SAW[1]) * 0.2
    finish(rgb, 'wall_tent.png', 40)


def tex_wall_cage():
    """An animal cage: thick iron bars in front of a dark straw-strewn pen, a heavy rail top and bottom with rivets,
    straw sticking through the bars and a pair of glinting eyes in the dark."""
    w, h = 32, 64
    yy, xx = np.mgrid[0:h, 0:w]
    nz = pnoise(w, h, 1811, ((16, 1.0), (8, 0.5)))
    back = gmap(np.clip(0.25 + nz * 0.35 + yy / h * 0.25, 0, 1), [(0, (22, 16, 14)), (0.5, (52, 40, 28)), (1, (96, 76, 44))])
    rgb = back
    r2 = random.Random(1812)
    for _ in range(40):                                                      # straw on the floor of the pen
        x, y = r2.randrange(w), r2.randrange(44, 60)
        L = r2.randint(2, 4)
        for j in range(L):
            rgb[min(h - 1, y + (j if r2.random() < 0.5 else 0)), (x + j) % w] = SAW[3] if j % 2 else SAW[2]
    rgb[27, 9] = (230, 200, 60); rgb[27, 12] = (230, 200, 60)                # eyes in the dark
    bars = (xx % 8 >= 2) & (xx % 8 <= 4)
    bl = np.clip(1 - np.abs((xx % 8) - 2.6) / 2.2, 0, 1)
    rgb[bars] = gmap(bl[bars] * 0.8 + 0.1, stops((I0, I1, I2, I3)))
    for y0 in (0, 56):
        band = (yy >= y0) & (yy < y0 + 7)
        rgb[band] = gmap(np.clip(0.4 + nz[band] * 0.3, 0, 1), stops((I0, I1, I2, I3)))
        rgb[yy == y0 + 1] = I3
        rgb[yy == y0 + 6] = I0
        for x in range(3, w, 8):
            rgb[y0 + 3, x] = (200, 190, 170)
    rgb[30:33] = np.where(bars[30:33, :, None], np.array(I3), rgb[30:33])     # a cross strap mid-height
    rgb[30, :] = I2; rgb[32, :] = I0; rgb[31, :] = I1
    finish(rgb, 'wall_cage.png', 40)


def tex_wall_boss_ringmaster():
    """The ringmaster's wall: dark red and gold stripes, a great poster frame of light bulbs round a painted top hat with
    a whip curling round it and a gold star - 'the greatest show'."""
    w, h = 64, 128
    rgb = np.kron(tent_rgb(32, 64, 1821, 8, 0.85, 0.7), np.ones((2, 2, 1)))
    p = Pic(w, h)
    p.r(6, 18, 57, 98, (40, 12, 30)); p.r(8, 20, 55, 96, (70, 20, 44))
    for x in range(8, 56, 6):                                                # bulbs round the frame
        for y in (19, 97):
            ell(p, x + 1, y, 1.5, 1.5, (255, 220, 120)); p.p(x + 1, y, WHITE)
    for y in range(25, 94, 6):
        for x in (7, 56):
            ell(p, x, y, 1.5, 1.5, (255, 220, 120)); p.p(x, y, WHITE)
    star5(p, 31.5, 36, 10, AU2); star5(p, 31.5, 36, 6, AU3)
    p.r(20, 56, 43, 80, BLK[1]); p.r(21, 57, 25, 79, BLK[2])               # the top hat
    p.r(20, 74, 43, 77, CR[2])
    p.r(13, 80, 50, 84, BLK[1]); p.l(13, 80, 50, 80, BLK[3])
    pts = [(10, 88), (16, 66), (30, 52), (48, 56), (54, 70), (46, 88), (36, 92)]
    p.lines(pts, (120, 70, 30), 2)                                            # the whip
    p.l(8, 92, 14, 86, WD1, 3)
    put(rgb, outline_same(p.im))
    finish(rgb, 'wall_boss_ringmaster.png', 64, half=False)


def sawdust_rgb(seed=1831):
    w = h = 32
    nz = pnoise(w, h, seed, ((8, 1.0), (4, 0.6), (2, 0.4)))
    rgb = gmap(np.clip(0.1 + nz * 0.5, 0, 1), stops(SAW))
    r2 = random.Random(seed + 1)
    for _ in range(36):                                                      # wood chips and dark specks
        x, y = r2.randrange(w), r2.randrange(h)
        if r2.random() < 0.5:
            rgb[y, x] = SAW[4]; rgb[y, (x + 1) % w] = SAW[3]
        else:
            rgb[y, x] = SAW[0]
    return rgb


def tex_floor_sawdust():
    finish(sawdust_rgb(), 'floor_sawdust.png', 32)


def ring_rgb(seed=1841):
    """The ring's worn red mat: a woven carpet with a darker border weave and threadbare patches."""
    w = h = 32
    yy, xx = np.mgrid[0:h, 0:w]
    nz = pnoise(w, h, seed, ((16, 1.0), (4, 0.5)))
    lum = np.clip(0.3 + nz * 0.35 + ((xx + yy) % 2) * 0.06 - ((xx % 4 == 0) | (yy % 4 == 0)) * 0.05, 0, 1)
    rgb = gmap(lum, stops(CR))
    worn = pnoise(w, h, seed + 1, ((8, 1.0),)) > 0.72
    rgb[worn] = rgb[worn] * 0.6 + np.array(SAW[1]) * 0.4
    return rgb


def tex_floor_ring():
    finish(ring_rgb(), 'floor_ring.png', 32)


def tex_floor_boss_ringmaster():
    """The centre of the ringmaster's ring: the red mat with a gold-ringed star in a dark circle."""
    rgb = np.kron(ring_rgb(1851), np.ones((2, 2, 1)))
    p = Pic(64, 64)
    p.e(4, 4, 59, 59, AU1); p.e(6, 6, 57, 57, (60, 14, 22)); p.arc(6, 6, 57, 57, 0, 360, AU2)
    star5(p, 31.5, 33, 22, AU1); star5(p, 31.5, 33, 18, AU2); star5(p, 31.5, 33, 8, AU3)
    put(rgb, p.im)
    finish(rgb, 'floor_boss_ringmaster.png', 48, half=False)


def tex_floor_trapdoor():
    """A trap door in the stage: a square wooden hatch of planks sunk in the sawdust with a dark gap all round, iron
    hinges, a ring pull and a painted warning chevron edge - the same sawdust round it as floor_sawdust."""
    rgb = np.kron(sawdust_rgb(), np.ones((2, 2, 1)))
    p = Pic(64, 64)
    p.r(9, 9, 54, 54, (12, 8, 6))                                              # the gap
    p.r(11, 11, 52, 52, WD2)
    for x in range(11, 53, 7):                                                # planks
        p.l(x, 11, x, 52, WD0); p.l(x + 1, 11, x + 1, 52, WD3)
    for x0 in range(11, 52, 6):                                               # yellow and black warning edge
        p.poly([(x0, 11), (x0 + 3, 11), (x0 + 1, 14), (x0 - 2, 14)], (170, 130, 20))
        p.poly([(x0, 52), (x0 + 3, 52), (x0 + 1, 49), (x0 - 2, 49)], (170, 130, 20))
    for y in (18, 44):                                                        # hinges
        p.r(11, y, 20, y + 3, I1); p.l(11, y, 20, y, I3); p.p(13, y + 1, I3); p.p(18, y + 1, I3)
    p.arc(38, 28, 48, 38, 0, 360, I2, 2); p.p(43, 28, I3)                      # ring pull
    put(rgb, p.im)
    finish(rgb, 'floor_trapdoor.png', 40, half=False)


def tex_floor_spotlight():
    """A pool of spotlight on the sawdust (floor_sawdust's array): a warm lit circle with a crisp rim, bright but held
    under the glare limit."""
    rgb = np.kron(sawdust_rgb(), np.ones((2, 2, 1))).astype(float)
    yy, xx = np.mgrid[0:64, 0:64]
    d = np.hypot(xx - 31.5, yy - 31.5)
    inside = d < 27
    rgb[inside] = rgb[inside] * 1.1 + np.array((16, 13, 2))
    rim = (d >= 25.5) & (d < 27)
    rgb[rim] = rgb[rim] * 0.9 + np.array((40, 34, 10))
    finish(rgb, 'floor_spotlight.png', 40, half=False)


# ================================================================== JUNGLE TEXTURES
def stone_rgb(w, h, seed, bw=16, bh=8, moss=0.3, pal=STN):
    """Mossy temple masonry (tiles both ways): staggered blocks with dark joints, chipped bevels and moss in the joints."""
    yy, xx = np.mgrid[0:h, 0:w]
    row = yy // bh
    off = (row % 2) * (bw // 2)
    bx = (xx + off) % bw
    by = yy % bh
    r2 = random.Random(seed)
    shade = np.array([[r2.uniform(-0.12, 0.12) for _ in range(w // bw + 2)] for _ in range(h // bh + 1)])
    nz = pnoise(w, h, seed, ((8, 1.0), (4, 0.5)))
    lum = np.clip(0.45 + shade[row, (xx + off) // bw % shade.shape[1]] + (nz - 0.5) * 0.4, 0, 1)
    lum = np.where((bx == 1) | (by == 1), lum + 0.15, lum)
    lum = np.where((bx == bw - 1) | (by == bh - 1), lum - 0.15, lum)
    rgb = gmap(np.clip(lum, 0, 1), stops(pal))
    joint = (bx == 0) | (by == 0)
    rgb[joint] = pal[0]
    mz = pnoise(w, h, seed + 7, ((8, 1.0), (4, 0.5)))
    mm = (mz > 1 - moss) & (joint | (by <= 2) | (mz > 1 - moss * 0.5))
    rgb[mm] = gmap(np.clip(mz[mm] * 0.9, 0, 1), stops(MOSS))
    return rgb


def tex_wall_junglestone():
    """Overgrown temple wall: mossy staggered blocks, moss hanging from the joints, a carved glyph band."""
    w, h = 32, 64
    rgb = stone_rgb(w, h, 1901, 16, 8, 0.32)
    for x in range(0, w, 4):                                                 # a carved band of step glyphs
        rgb[24 + (x // 4) % 2, x:x + 3] = STN[0]
        rgb[25 + (x // 4) % 2, x + 1] = STN[3]
    r2 = random.Random(1902)
    for _ in range(6):                                                       # moss drips
        x, y = r2.randrange(w), r2.choice((8, 16, 32, 40, 48))
        for j in range(r2.randint(2, 5)):
            rgb[(y + j) % h, x] = MOSS[1 + (j % 2)]
    finish(rgb, 'wall_junglestone.png', 40)


def leaf(p, x, y, a, ln, wd, pal):
    """A pointed leaf from its stem (x, y) along a: dark rim, body, a light midrib."""
    u, v = (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))
    P_ = lambda s, t: (x + u[0] * s + v[0] * t, y + u[1] * s + v[1] * t)
    p.poly([P_(0, 0), P_(ln * 0.35, -wd), P_(ln * 0.75, -wd * 0.7), P_(ln, 0), P_(ln * 0.75, wd * 0.7), P_(ln * 0.35, wd)], pal[0])
    p.poly([P_(1, 0), P_(ln * 0.35, -wd + 1), P_(ln * 0.75, -wd * 0.7 + 0.6), P_(ln - 1, 0), P_(ln * 0.35, 0)], pal[2])
    p.poly([P_(1, 0), P_(ln - 1, 0), P_(ln * 0.75, wd * 0.7 - 0.6), P_(ln * 0.35, wd - 1)], pal[1])
    p.l(*P_(0, 0), *P_(ln * 0.85, 0), pal[3])


def tex_wall_jungle():
    """A wall of dense jungle: layer on layer of broad leaves over deep green shadow, hanging lianas, a few red flowers;
    drawn wrapped so it tiles."""
    w, h = 64, 128
    yy, xx = np.mgrid[0:h, 0:w]
    rgb = gmap(np.clip(0.3 + pnoise(w, h, 1911, ((32, 1.0), (16, 0.5)))* 0.4, 0, 1), [(0, (10, 24, 10)), (1, (34, 66, 26))])
    r2 = random.Random(1912)
    for layer in range(3):
        pal = tuple(dark(c, 0.62 + layer * 0.18) for c in JG[1:])
        items = [(r2.uniform(0, w), r2.uniform(0, h), r2.uniform(0, TAU), r2.uniform(10, 18), r2.uniform(3.5, 6)) for _ in range(34)]
        im = wrap_pic(w, h, lambda p, ox, oy: [leaf(p, x + ox, y + oy, a, ln, wd, pal) for x, y, a, ln, wd in items])
        put(rgb, outline_same(im, (6, 16, 6)))
    vines = [(r2.uniform(0, w), r2.uniform(0, TAU)) for _ in range(3)]
    def vine(p, ox, oy):
        for x0, ph in vines:
            pts = [(x0 + ox + math.sin(y / 14 + ph) * 4, y + oy) for y in range(0, h + 1, 4)]
            p.lines(pts, (70, 54, 26), 2)
            p.lines([(x - 1, y) for x, y in pts], (110, 90, 44))
    vp = wrap_pic(w, h, vine)
    put(rgb, vp)
    for _ in range(4):
        x, y = r2.randrange(2, w - 2), r2.randrange(2, h - 2)
        for dx, dy in ((0, -1), (1, 0), (0, 1), (-1, 0)):
            rgb[y + dy, x + dx] = (180, 40, 40)
        rgb[y, x] = (240, 200, 60)
    finish(rgb, 'wall_jungle.png', 48, half=False)


def tex_wall_boss_serpent():
    """The feathered serpent's wall: big temple blocks with a carved relief of the serpent's head - jaws open, fangs, a
    jade eye - framed by a fan of painted red, green and gold feathers."""
    w, h = 64, 128
    rgb = np.kron(stone_rgb(32, 64, 1921, 16, 16, 0.18), np.ones((2, 2, 1)))
    p = Pic(w, h)
    cx, cy = 32, 60
    cols = [FEA['r'], FEA['g'], FEA['y'], FEA['b']]
    for j in range(11):                                                      # the feather fan
        a = math.pi + j / 10 * math.pi
        feather(p, cx + math.cos(a) * 10, cy + math.sin(a) * 10, a, 20, 4, cols[j % 4] + (cols[j % 4][2],))
    ell(p, cx, cy, 15, 13, STN[2]); ell(p, cx - 1, cy - 1, 13, 11, STN[3])
    p.poly([(cx - 8, cy + 2), (cx + 18, cy + 4), (cx + 14, cy + 12), (cx - 6, cy + 10)], STN[1])   # the open jaw
    p.poly([(cx - 4, cy + 4), (cx + 14, cy + 5), (cx + 10, cy + 9)], (60, 16, 16))
    for x in (cx + 2, cx + 9):
        p.poly([(x, cy + 3), (x + 2, cy + 3), (x + 1, cy + 8)], (230, 226, 200))
    ell(p, cx + 4, cy - 4, 3.5, 3, JADE[2]); p.p(cx + 4, cy - 4, JADE[3]); p.p(cx + 5, cy - 4, BLK[0])
    for j in range(4):                                                       # scale rows below
        for i in range(5):
            ell(p, cx - 12 + i * 6 + (j % 2) * 3, cy + 22 + j * 7, 3, 3, STN[2]); p.p(cx - 13 + i * 6 + (j % 2) * 3, cy + 21 + j * 7, STN[4])
    p.r(2, 104, 61, 110, AU1); p.l(2, 104, 61, 104, AU3)
    for x in range(4, 61, 6):
        p.r(x, 106, x + 2, 108, JADE[2])
    put(rgb, outline_same(p.im, (20, 22, 18)))
    finish(rgb, 'wall_boss_serpent.png', 64, half=False)


def jungle_rgb(seed=1931):
    """Dark jungle earth with fallen leaves and a root."""
    w = h = 32
    nz = pnoise(w, h, seed, ((8, 1.0), (4, 0.5), (2, 0.3)))
    rgb = gmap(np.clip(0.25 + nz * 0.55, 0, 1), stops(EARTH))
    r2 = random.Random(seed + 1)
    lp = Pic(w, h)
    items = [(r2.uniform(0, w), r2.uniform(0, h), r2.uniform(0, TAU), r2.uniform(4, 7),
              r2.choice((JG[1:4], ((60, 50, 14), (100, 84, 26), (140, 120, 40), (170, 150, 60)), ((70, 34, 14), (110, 60, 24), (150, 90, 40), (180, 120, 60))))) for _ in range(12)]
    lp = wrap_pic(w, h, lambda p, ox, oy: [leaf(p, x + ox, y + oy, a, ln, 1.6, tuple(pal) + ((pal[-1]),)) for x, y, a, ln, pal in items])
    put(rgb, lp)
    return rgb


def tex_floor_jungle():
    finish(jungle_rgb(), 'floor_jungle.png', 40)


def tex_floor_templestone():
    finish(stone_rgb(32, 32, 1941, 16, 16, 0.22), 'floor_templestone.png', 40)


def tex_floor_boss_serpent():
    """The serpent's altar floor: the temple flagstones with an inlaid coiled serpent of jade scales round a gold sun."""
    rgb = np.kron(stone_rgb(32, 32, 1951, 16, 16, 0.12), np.ones((2, 2, 1)))
    p = Pic(64, 64)
    pts = [(32 + math.cos(t) * (6 + t * 2.6), 32 + math.sin(t) * (6 + t * 2.6)) for t in np.linspace(0, 3.4 * math.pi, 60)]
    for (x, y), r in zip(pts, np.linspace(1.5, 4, 60)):
        ell(p, x, y, r, r, JADE[1])
    for (x, y) in pts[::3]:
        p.p(x, y, JADE[3])
    hx, hy = pts[-1]
    ell(p, hx, hy, 5, 4, JADE[2]); p.p(hx + 1, hy - 1, AU3)
    ell(p, 32, 32, 5, 5, AU2); ell(p, 31, 31, 3, 3, AU3)
    put(rgb, outline_same(p.im, (20, 30, 24)))
    finish(rgb, 'floor_boss_serpent.png', 48, half=False)


def tex_floor_piranha():
    """Shallow brown jungle water: murky ripples, floating leaf bits and the dark fins and backs of piranhas cutting the
    surface (fins drawn wrapped, the water tiles)."""
    w = h = 64
    yy, xx = np.mgrid[0:h, 0:w]
    nz = pnoise(w, h, 1961, ((16, 1.0), (8, 0.5)))
    rip = np.sin((xx * 0.5 + yy * 0.9) / 64 * TAU * 3 + nz * 6) * 0.5 + 0.5
    rgb = gmap(np.clip(0.25 + nz * 0.35 + rip * 0.18, 0, 1), [(0, (34, 26, 14)), (0.4, (66, 52, 26)), (0.75, (96, 80, 42)), (1, (130, 116, 70))])
    fins = [(14, 18, 1), (44, 12, -1), (30, 44, 1), (54, 50, -1)]
    def fin(p, ox, oy):
        for x, y, d in fins:
            x += ox; y += oy
            p.arc(x - 9, y - 1, x + 9, y + 5, 200, 340, (150, 136, 90))     # the wake
            p.poly([(x - 3 * d, y + 2), (x + 3 * d, y + 2), (x - 1 * d, y - 4)], (40, 30, 26))
            p.l(x - 3 * d, y + 2, x - 1 * d, y - 4, (90, 70, 60))
            p.p(x + 4 * d, y + 1, (160, 40, 30))
    fp = wrap_pic(w, h, fin)
    put(rgb, fp)
    finish(rgb, 'floor_piranha.png', 40, half=False)


def tex_floor_vines():
    """Lianas over the jungle earth (floor_jungle's array): thick tangled vines with leaves, wrapped so they tile."""
    rgb = np.kron(jungle_rgb(), np.ones((2, 2, 1)))
    r2 = random.Random(1971)
    curves = [(r2.uniform(0, 64), r2.uniform(0, TAU), r2.choice((0, 1))) for _ in range(5)]
    def vines(p, ox, oy):
        for c0, ph, horiz in curves:
            pts = [(t, c0 + math.sin(t / 64 * TAU * 2 + ph) * 6) for t in range(-2, 67, 3)]
            if horiz:
                pts = [(x + ox, y + oy) for x, y in pts]
            else:
                pts = [(y + ox, x + oy) for x, y in pts]
            p.lines(pts, (52, 70, 20), 3)
            p.lines([(x, y - 1) for x, y in pts], (96, 120, 40))
            for i, (x, y) in enumerate(pts[1::4]):
                leaf(p, x, y, ph + i * 2.1, 6, 2, JG[1:] )
    vp = wrap_pic(64, 64, vines)
    put(rgb, outline_same(vp, (14, 22, 8)))
    finish(rgb, 'floor_vines.png', 40, half=False)


@builder('textures')
def make_textures():
    for fn in (tex_wall_tent, tex_wall_cage, tex_wall_boss_ringmaster, tex_wall_junglestone, tex_wall_jungle, tex_wall_boss_serpent,
               tex_floor_sawdust, tex_floor_ring, tex_floor_boss_ringmaster, tex_floor_trapdoor, tex_floor_spotlight,
               tex_floor_jungle, tex_floor_templestone, tex_floor_boss_serpent, tex_floor_piranha, tex_floor_vines):
        fn()


def fall(im, k, deg=88, cell=64, feet=FEET):
    """Death helper: the standing figure tipped backwards (head to the left) by k (0..1) of deg round its feet, grounded
    on the floor row and kept inside the cell (drawn on a larger canvas, so nothing is clipped while it turns)."""
    W, H = cell * 3, cell * 2
    big = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    big.paste(im, (cell, cell // 2))
    b = im.getbbox()
    cx0 = (b[0] + b[2]) / 2 + cell
    piv = (cx0, feet + cell // 2)
    r = big.rotate(deg * k, resample=Image.NEAREST, center=piv)
    rb = r.getbbox()
    x0 = round(cx0 - (b[0] + b[2]) / 2) if k < 0.5 else round((rb[0] + rb[2]) / 2 - cell / 2)
    x0 = min(max(x0, rb[2] - cell + 1), rb[0] - 1)
    y0 = rb[3] - 1 - feet
    return r.crop((x0, y0, x0 + cell, y0 + cell))


def honk_horn(p, x, y, sq=0.0):
    """A clown's bulb horn held at (x, y): a red rubber bulb behind, a brass trumpet bell forward."""
    ell(p, x - 2, y, 2.6 - sq, 2.6 + sq * 0.5, (200, 30, 30)); p.p(x - 3, y - 1, (255, 120, 110))
    p.poly([(x, y - 1), (x + 5, y - 3), (x + 5, y + 3), (x, y + 1)], BR2); p.l(x + 5, y - 3, x + 5, y + 3, BR4)


# ================================================================== CLOWN (drawn, 64x64: a sad, sinister circus clown)
def clown_raw(step=None, bob=0, lean=0.0, aF=(0.5, 0.3), aB=(-0.1, 0.3), mouth=0, eyes=1, honk=0, mallet=None, crouch=0):
    """Side view facing right: a baggy yellow suit with red polka dots and a white ruff, big red shoes, a white
    greasepaint face with a red nose, a frizz of orange hair round a tiny bowler hat; the back hand holds a bulb horn
    (honk 1..2 = the honk lines), the front hand a big rubber mallet (mallet = its angle) or nothing."""
    p = Pic(64, 64)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.e(hx - 8, sy + 2, hx + 9, hy + 3, CY[1]); p.e(hx - 7, sy + 3, hx + 7, hy + 1, CY[2])     # baggy belly
        for dx, dy in ((-4, 4), (2, 6), (-1, 10), (5, 11), (-5, 12)):
            ell(p, hx + dx, sy + dy, 1.2, 1.2, CR[2])
        for j in range(5):                                                   # the ruff
            ell(p, sx - 5 + j * 2.5, sy, 2, 1.6, PAINT[2] if j % 2 else PAINT[1])
    def head(p, K):
        x, y = K['head']
        for j in range(5):
            ell(p, x - 5 + math.cos(j) * 1.5, y - 1 + (j - 2) * 1.6, 2.4, 2, (230, 110, 30))
        ell(p, x, y, 4.5, 5, PAINT[1]); ell(p, x - 0.4, y - 0.4, 3.6, 4.2, PAINT[2])
        ell(p, x + 5, y + 1, 2, 2, (220, 30, 30)); p.p(x + 4, y, (255, 140, 130))
        if eyes:
            p.l(x + 1, y - 3, x + 1, y - 1, CB[1]); p.p(x + 2, y - 2, BLK[0]); p.l(x + 1, y + 0, x + 1, y + 2, CB[2])   # painted tear
        else:
            p.l(x, y - 2, x + 3, y - 2, BLK[0])
        mw = 1 + mouth
        p.arc(x - 1, y + 2, x + 4, y + 4 + mw, 0, 180, (200, 20, 30))      # the red grin
        if mouth:
            p.e(x + 0, y + 3, x + 3, y + 3 + mw, (60, 10, 10))
        p.r(x - 3, y - 7, x + 2, y - 4, BLK[1]); p.l(x - 5, y - 4, x + 4, y - 4, BLK[2]); p.l(x - 2, y - 6, x + 1, y - 6, CR[2])
    def front(p, K):
        hx, hy = K['handB']
        honk_horn(p, hx + 1, hy, 0.6 if honk else 0)
        if honk:
            for j in range(honk + 1):
                p.arc(hx + 4 - j * 3, hy - 6 - j * 3, hx + 10 + j * 3, hy + 6 + j * 3, -40, 40, (250, 240, 200))
        if mallet is not None:
            x, y = K['handF']
            ex, ey = pt(mallet, 11, x, y)
            p.l(x, y, ex, ey, WD3, 2)
            u = (math.sin(mallet), math.cos(mallet)); v = (-u[1], u[0])
            p.poly([(ex + v[0] * 5 - u[0], ey + v[1] * 5 - u[1]), (ex - v[0] * 5 - u[0], ey - v[1] * 5 - u[1]),
                    (ex - v[0] * 5 + u[0] * 4, ey - v[1] * 5 + u[1] * 4), (ex + v[0] * 5 + u[0] * 4, ey + v[1] * 5 + u[1] * 4)], CR[2])
            p.l(ex + v[0] * 5 - u[0], ey + v[1] * 5 - u[1], ex - v[0] * 5 - u[0], ey - v[1] * 5 - u[1], CR[3])
    rig(p, 30, FEET, LL=15, TL=13, HR=5, step=step, bob=bob, lean=lean, crouch=crouch, legs=(CY[1], CY[2]), leg_w=6, body=(CY[1], CY[2]),
        body_w=(7, 5), arms=(CY[1], CY[2]), arm_w=4, AL=13, aB=aB, aF=aF, skin=PAINT, hands=PAINT[2], shoes=(200, 30, 30),
        on_torso=torso, on_head=head, on_front=front, feet_off=(0, 3))
    return outline_same(p.im)


@builder('clown')
def make_clown():
    C = clown_raw
    save_enemy('clown', 'idle', [C(bob=(0, -1, -1, 0)[i], honk=(0, 0, 1, 0)[i], mouth=(0, 0, 1, 0)[i], mallet=0.3, aF=(0.3, 0.2)) for i in range(4)])
    save_enemy('clown', 'movement', [C(step=i / 6, bob=(0, -1, -2, 0, -1, -2)[i], lean=1, mallet=0.3, aF=(0.3, 0.2)) for i in range(6)])
    save_enemy('clown', 'attack', [C(aF=(1.6, 1.2), mallet=3.0, lean=-1, mouth=1), C(aF=(2.6, 0.6), mallet=3.6, lean=-2, mouth=2, honk=1),
                                   C(aF=(2.0, 0.2), mallet=2.4, lean=1, mouth=2), C(aF=(1.2, 0.1), mallet=1.4, lean=2, mouth=2, crouch=2),
                                   C(aF=(0.8, 0.1), mallet=0.8, lean=2, mouth=1, crouch=2, honk=2), C(aF=(0.4, 0.2), mallet=0.3, mouth=0)])
    save_enemy('clown', 'take_damage', [flash(C(lean=-3, mouth=2, eyes=0, mallet=0.3, aF=(0.3, 0.2)), WHITE), C(lean=-2, mouth=1, mallet=0.3, aF=(0.3, 0.2)), C(lean=-1, mallet=0.3, aF=(0.3, 0.2))])
    base = C(eyes=0, mouth=2, mallet=0.3, aF=(0.3, 0.2))
    save_enemy('clown', 'death', [flash(C(lean=-3, eyes=0, mouth=2, mallet=0.3, aF=(0.3, 0.2), honk=2), WHITE), fall(base, 0.25), fall(base, 0.55),
                                  fall(base, 0.85), fall(base, 1.0), fall(C(eyes=0, mouth=0, aF=(0.3, 0.2)), 1.0)])


# ================================================================== JUGGLER (drawn, 64x64: a harlequin who juggles three pins)
def pin(p, x, y, a, s=1.0):
    """A juggling pin centred at (x, y), its neck along a: white body with a red band, a red knob."""
    u = (math.cos(a), math.sin(a))
    P_ = lambda t: (x + u[0] * t * s, y + u[1] * t * s)
    ell(p, *P_(-1.5), 2.4 * s, 2.4 * s, PAINT[2]); p.p(*P_(-2.4), PAINT[3])
    p.l(*P_(0), *P_(3.5), PAINT[1], max(1, round(1.6 * s)))
    p.l(*P_(0.5), *P_(1.2), (210, 30, 30), max(1, round(2 * s)))
    ell(p, *P_(4.2), 1.0 * s, 1.0 * s, (210, 30, 30))


def juggler_raw(step=None, bob=0, lean=0.0, aF=(1.2, 1.4), aB=(1.0, 1.5), ph=0.0, pins=3, eyes=1, mouth=0, throw=None):
    """Side view facing right: a thin harlequin in a purple and yellow diamond suit, a two-pointed jester cap with bells,
    a white half-mask; three pins circle above the hands (ph = their phase) or fly forward (throw = 0..1)."""
    p = Pic(64, 64)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        for j in range(3):
            for i in range(2):
                x, y = hx - 3 + i * 4 + (j % 2) * 2, sy + 2 + j * 4
                p.poly([(x, y - 2), (x + 2, y), (x, y + 2), (x - 2, y)], CY[2])
        p.l(sx - 4, sy, sx + 4, sy, PAINT[2], 2)
    def head(p, K):
        x, y = K['head']
        p.poly([(x - 4, y - 3), (x - 9, y - 9), (x - 1, y - 5), (x + 2, y - 11), (x + 4, y - 3)], CP[2])
        p.poly([(x - 1, y - 5), (x + 2, y - 11), (x + 4, y - 3)], CY[2])
        ell(p, x - 9, y - 9, 1.3, 1.3, AU3); ell(p, x + 2, y - 11, 1.3, 1.3, AU3)
        p.r(x - 1, y - 2, x + 4, y + 1, PAINT[2])
        p.p(x + 2, y - 1, BLK[0] if eyes else PAINT[1])
        p.l(x + 1, y + 3, x + 3, y + 3 + mouth, (120, 30, 30))
    def front(p, K):
        (bx, by), (fx, fy) = K['handB'], K['handF']
        mx, my = (bx + fx) / 2, min(by, fy)
        if throw is None:
            for j in range(pins):
                a = ph + j * TAU / 3
                pin(p, mx + math.cos(a) * 6, my - 9 + math.sin(a) * 6, a * 2 + 0.5)
        else:
            for j in range(pins):
                d = throw * (8 + j * 2)
                pin(p, fx + 3 + d, fy - 4 - j * 5 + throw * j * 3 - math.sin(throw * math.pi) * 6, throw * 9 + j * 2)
    rig(p, 30, FEET, LL=17, TL=13, HR=4.5, step=step, bob=bob, lean=lean, legs=(CP[1], CP[2]), leg_w=3, body=(CP[1], CP[2]), body_w=(4, 5),
        arms=(CP[1], CP[3]), arm_w=3, AL=12, aB=aB, aF=aF, skin=PAINT, hands=PAINT[2], shoes=CP[0], on_torso=torso, on_head=head, on_front=front)
    return outline_same(p.im)


@builder('juggler')
def make_juggler():
    J = juggler_raw
    save_enemy('juggler', 'idle', [J(bob=(0, -1, 0, -1)[i], ph=i * TAU / 12, aF=(1.2 + (i % 2) * 0.3, 1.4), aB=(1.3 - (i % 2) * 0.3, 1.4)) for i in range(4)])
    save_enemy('juggler', 'movement', [J(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=1, ph=i * TAU / 18, aF=(1.2 + (i % 2) * 0.3, 1.4), aB=(1.3 - (i % 2) * 0.3, 1.4)) for i in range(6)])
    save_enemy('juggler', 'attack', [J(aF=(-0.4, 1.8), lean=-2, ph=0.3, mouth=1), J(aF=(-0.9, 2.2), lean=-3, ph=0.6, mouth=1),
                                     J(aF=(1.9, 0.3), lean=2, throw=0.15, mouth=2), J(aF=(1.7, 0.1), lean=2, throw=0.5, mouth=2),
                                     J(aF=(1.3, 0.3), lean=1, throw=0.85, mouth=1), J(aF=(1.2, 1.4), pins=0)])
    save_enemy('juggler', 'take_damage', [flash(J(lean=-3, eyes=0, mouth=2, pins=0, aF=(2.2, 0.6), aB=(2.4, 0.5)), WHITE), J(lean=-2, pins=0, aF=(1.8, 0.6), aB=(2.0, 0.5), mouth=1), J(lean=-1, ph=1.0)])
    base = J(eyes=0, pins=0, aF=(0.4, 0.2), aB=(-0.3, 0.2), mouth=1)
    d = [flash(J(lean=-3, eyes=0, mouth=2, pins=0, aF=(2.2, 0.6), aB=(2.4, 0.5)), WHITE), fall(base, 0.3), fall(base, 0.6), fall(base, 0.9), fall(base, 1.0)]
    last = d[-1].copy(); q = Pic(64, 64)
    for j, x in enumerate((14, 30, 47)):
        pin(q, x, FEET - 2, 0.1 + j * 0.3)
    d.append(on(last, outline_same(q.im)))
    save_enemy('juggler', 'death', d)


# ================================================================== STILT WALKER (drawn, 64x64: a tall figure on stilts)
def stilt_raw(step=None, bob=0, lean=0.0, kick=0.0, aF=(0.3, 0.3), aB=(-0.2, 0.3), eyes=1, mouth=0, hat=1):
    """Side view facing right: a tall stilt walker - long striped trousers over wooden stilts (most of the height), a
    short tailcoat, white face and a tall striped hat; kick 0..1 swings the near stilt forward."""
    p = Pic(64, 64)
    f = FEET
    cx = 30
    hip = (cx, f - 29 + bob)
    sh = (cx + lean, hip[1] - 10)
    feet = []
    for j, ph in enumerate((0.0, math.pi)):
        o = math.sin((step or 0) * TAU + ph) * 3 if step is not None else (-2 if j == 0 else 2)
        if j == 1 and kick:
            fx, fy = cx + o + kick * 16, f - 1 - kick * 14
        else:
            fx, fy = cx + o, f - 1
        feet.append((fx, fy))
    for j, (fx, fy) in enumerate(feet):                                       # trousers to mid-length, then bare stilt
        mx, my = hip[0] + (fx - hip[0]) * 0.55, hip[1] + (fy - hip[1]) * 0.55
        c = dark(CR[2], 0.75) if j == 0 else CR[2]
        p.l(hip[0], hip[1], mx, my, c, 4)
        for t in np.linspace(0.1, 0.9, 5):
            p.l(hip[0] + (mx - hip[0]) * t - 1.5, hip[1] + (my - hip[1]) * t, hip[0] + (mx - hip[0]) * t + 1.5, hip[1] + (my - hip[1]) * t, TW[3] if j else TW[1])
        p.l(mx, my, fx, fy, WD1 if j == 0 else WD3, 2)
        p.r(fx - 1, fy - 1, fx + 1, fy, WD0)
    p.poly([(hip[0] - 5, hip[1] + 3), (hip[0] + 4, hip[1] + 2), (sh[0] + 4, sh[1]), (sh[0] - 4, sh[1])], BLK[2])
    p.poly([(hip[0] - 5, hip[1] - 1), (hip[0] - 9, hip[1] + 7), (hip[0] - 5, hip[1] + 6)], BLK[1])   # coat tail
    p.l(sh[0] + 2, sh[1] + 1, hip[0] + 2, hip[1], CY[2])
    for a, c in ((aB, BLK[1]), (aF, BLK[3])):
        e = pt(a[0], 5, sh[0], sh[1] + 1); h = pt(a[0] + a[1], 5, *e)
        limb(p, [sh, e, h], 2, c); ell(p, h[0], h[1], 1.2, 1.2, PAINT[2])
    hx, hy = sh[0] + 1, sh[1] - 4
    ell(p, hx, hy, 3.5, 4, PAINT[1]); ell(p, hx - 0.3, hy - 0.3, 2.8, 3.2, PAINT[2])
    p.p(hx + 2, hy - 1, BLK[0] if eyes else PAINT[0]); p.p(hx + 4, hy, (210, 40, 40))
    p.l(hx, hy + 2 + mouth, hx + 2, hy + 2, (140, 30, 30))
    if hat:
        p.r(hx - 2, hy - 11, hx + 2, hy - 4, CR[2]); p.l(hx - 2, hy - 8, hx + 2, hy - 8, TW[3]); p.l(hx - 2, hy - 10, hx + 2, hy - 10, TW[3])
        p.l(hx - 4, hy - 4, hx + 4, hy - 4, CR[1])
    return outline_same(p.im)


@builder('stiltwalker')
def make_stiltwalker():
    S = stilt_raw
    save_enemy('stiltwalker', 'idle', [S(bob=(0, 0, -1, -1)[i], lean=(0, 0.5, 1, 0.5)[i]) for i in range(4)])
    save_enemy('stiltwalker', 'movement', [S(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=1 + math.sin(i)) for i in range(6)])
    save_enemy('stiltwalker', 'attack', [S(lean=-1, kick=0.2, aF=(1.0, 0.4)), S(lean=-2, kick=0.5, aF=(1.6, 0.4), mouth=1), S(lean=-3, kick=1.0, aF=(2.0, 0.3), mouth=2),
                                         S(lean=-3, kick=0.9, aF=(2.0, 0.3), mouth=2), S(lean=-1, kick=0.4, aF=(1.0, 0.3), mouth=1), S(lean=0)])
    save_enemy('stiltwalker', 'take_damage', [flash(S(lean=-3, eyes=0, mouth=2, aF=(2.4, 0.3), aB=(2.6, 0.2)), WHITE), S(lean=-2, mouth=1), S(lean=-1)])
    base = S(eyes=0, mouth=1, aF=(2.6, 0.2), aB=(2.8, 0.2))
    d = [flash(S(lean=-3, eyes=0, mouth=2, aF=(2.4, 0.3), aB=(2.6, 0.2)), WHITE), fall(base, 0.2), fall(base, 0.5), fall(base, 0.8), fall(base, 1.0, 90)]
    q = Pic(64, 64)                                                           # the hat rolled away
    q.r(50, FEET - 4, 58, FEET, CR[2]); q.l(52, FEET - 4, 52, FEET, TW[3]); q.l(55, FEET - 4, 55, FEET, TW[3])
    d.append(on(fall(S(eyes=0, hat=0, aF=(2.6, 0.2), aB=(2.8, 0.2)), 1.0, 90), outline_same(q.im)))
    save_enemy('stiltwalker', 'death', d)


# ================================================================== KNIFE THROWER (drawn, 64x64)
def knife(p, x, y, a, ln=8):
    u = (math.cos(a), math.sin(a))
    p.l(x, y, x + u[0] * 3, y + u[1] * 3, (40, 26, 20), 2)
    p.l(x + u[0] * 3, y + u[1] * 3, x + u[0] * ln, y + u[1] * ln, STEEL[3] if len(STEEL) > 3 else (220, 224, 230))
    p.p(x + u[0] * ln, y + u[1] * ln, WHITE)


def kthrower_raw(step=None, bob=0, lean=0.0, aF=(0.3, 0.3), aB=(-0.2, 0.4), held=True, fly=None, eyes=1, mouth=0):
    """Side view facing right: a knife thrower - black trousers, a red sash, a white shirt under a black bolero hung with
    a bandolier of knives, slicked hair and a curled moustache; the front hand holds a knife (held) and fly = 0..1 sends a
    fan of three knives forward."""
    p = Pic(64, 64)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.poly([(sx - 1, sy + 1), (sx + 4, sy + 1), (hx + 3, hy - 3), (hx, hy - 3)], PAINT[1])
        p.r(hx - 5, hy - 3, hx + 5, hy, CR[2]); p.l(hx - 5, hy - 3, hx + 5, hy - 3, CR[3])
        p.l(sx - 4, sy + 1, hx + 4, hy - 4, (80, 50, 30), 2)
        for t in (0.25, 0.5, 0.75):
            x, y = sx - 4 + (hx + 8 - sx) * t, sy + 1 + (hy - 5 - sy) * t
            p.l(x, y, x, y - 3, (200, 204, 210))
    def head(p, K):
        x, y = K['head']
        p.poly([(x - 5, y - 1), (x - 4, y - 5), (x + 2, y - 6), (x + 4, y - 3), (x - 2, y - 3)], BLK[1])
        p.p(x + 2, y - 1, BLK[0] if eyes else SKIN[1])
        p.l(x + 1, y - 2, x + 3, y - 2, BLK[1])
        p.lines([(x + 1, y + 2), (x + 4, y + 1), (x + 6, y - 1)], BLK[0]); p.lines([(x + 1, y + 2), (x - 1, y + 1)], BLK[0])
        if mouth:
            p.l(x + 2, y + 3, x + 3, y + 3 + mouth, (90, 20, 20))
    def front(p, K):
        x, y = K['handF']
        if held:
            knife(p, x, y, aF[0] * -1 + 0.6 - (aF[0] > 1.5) * 2.5)
        if fly is not None:
            sx, sy = K['sh']
            for j, da in enumerate((-0.25, 0, 0.25)):
                d = 4 + fly * 12
                knife(p, sx + 4 + math.cos(da) * d, sy + 2 + math.sin(da) * d, da)
    rig(p, 30, FEET, LL=16, TL=13, HR=4.5, step=step, bob=bob, lean=lean, legs=(BLK[1], BLK[2]), leg_w=4, body=(BLK[1], BLK[2]), body_w=(5, 6),
        arms=(PAINT[0], PAINT[1]), arm_w=3, AL=13, aB=aB, aF=aF, skin=SKIN, hands=SKIN[2], shoes=BLK[0], on_torso=torso, on_head=head, on_front=front)
    return outline_same(p.im)


@builder('knifethrower')
def make_knifethrower():
    K_ = kthrower_raw
    save_enemy('knifethrower', 'idle', [K_(bob=(0, 0, -1, 0)[i], aF=(0.3 + (0, 0.1, 0.2, 0.1)[i], 0.6)) for i in range(4)])
    save_enemy('knifethrower', 'movement', [K_(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=1, aF=(0.4, 0.6)) for i in range(6)])
    save_enemy('knifethrower', 'attack', [K_(aF=(2.4, 0.8), lean=-2), K_(aF=(3.0, 0.6), lean=-3, mouth=1), K_(aF=(1.8, 0.1), lean=2, held=False, fly=0.0, mouth=2),
                                          K_(aF=(1.6, 0.1), lean=2, held=False, fly=0.45, mouth=1), K_(aF=(1.2, 0.2), lean=1, held=False, fly=0.9), K_(aF=(0.5, 0.6))])
    save_enemy('knifethrower', 'take_damage', [flash(K_(lean=-3, eyes=0, mouth=2, aF=(2.2, 0.5)), WHITE), K_(lean=-2, mouth=1), K_(lean=-1)])
    base = K_(eyes=0, held=False, aF=(2.6, 0.2), aB=(2.8, 0.2), mouth=1)
    d = [flash(K_(lean=-3, eyes=0, mouth=2, aF=(2.2, 0.5)), WHITE), fall(base, 0.3), fall(base, 0.6), fall(base, 0.9), fall(base, 1.0)]
    q = Pic(64, 64); knife(q, 46, FEET - 1, 0.05); knife(q, 52, FEET - 2, 2.9)
    d.append(on(d[-1], outline_same(q.im)))
    save_enemy('knifethrower', 'death', d)


# ================================================================== MARIONETTE (drawn, 64x64: a wooden puppet hanging from strings)
def marionette_raw(step=None, bob=0, lean=0.0, aF=(0.6, 0.6), aB=(-0.4, 0.6), eyes=1, mouth=0, strings=1, crouch=0, ctrl=0.0):
    """Side view facing right: a jointed wooden puppet (ball joints, a painted red tunic, a carved face with a hinged
    jaw and painted cheeks) on strings that run up from the hands, head and knees to a wooden control cross near the top
    of the cell (ctrl tilts it); strings=0 = cut (the collapse)."""
    p = Pic(64, 64)
    K = {}
    def far(p, K_):
        K.update(K_)
    def torso(p, K_):
        hx, hy = K_['hip']; sx, sy = K_['sh']
        p.poly([(hx - 4, hy + 2), (hx + 4, hy + 2), (sx + 4, sy + 1), (sx - 4, sy + 1)], CR[2])
        p.l(sx, sy + 2, hx, hy + 1, CY[2])
        for (x, y) in (K_['hip'], K_['elbowB'], K_['elbowF']):
            ell(p, x, y, 1.6, 1.6, WOODP[2])
    def head(p, K_):
        x, y = K_['head']
        p.poly([(x - 2, y - 5), (x + 3, y - 6), (x + 4, y - 3), (x + 1, y - 4)], (60, 40, 20))     # carved hair
        ell(p, x + 2, y + 1, 1.2, 1, (220, 90, 80))
        p.p(x + 2, y - 2, BLK[0] if eyes else WOODP[1]); p.p(x + 1, y - 2, WHITE if eyes else WOODP[1])
        p.l(x, y + 3 + mouth, x + 4, y + 3 + mouth, WOODP[0])               # the hinged jaw line
        p.l(x, y + 2, x, y + 3 + mouth, WOODP[0])
    rig(p, 30, FEET, LL=15, TL=11, HR=4.5, step=step, bob=bob, lean=lean, crouch=crouch, legs=(WOODP[1], WOODP[2]), leg_w=3, body=(CR[1], CR[2]),
        body_w=(4, 4), arms=(WOODP[1], WOODP[3]), arm_w=2, AL=12, aB=aB, aF=aF, skin=WOODP, hands=WOODP[3], shoes=WOODP[0],
        on_far=far, on_torso=torso, on_head=head)
    im = outline_same(p.im)
    q = Pic(64, 64)
    if strings:
        cy = 5
        cxx = 30 + lean * 0.5
        bar = [(cxx - 10 * math.cos(ctrl), cy + 10 * math.sin(ctrl)), (cxx + 10 * math.cos(ctrl), cy - 10 * math.sin(ctrl))]
        q.l(*bar[0], *bar[1], WD3, 2); q.l(cxx, cy - 2, cxx, cy + 3, WD3, 2)
        hx, hy = K['head']
        ends = [bar[0], (cxx, cy + 2), bar[1]]
        for (x, y), e in ((K['handB'], ends[0]), ((hx, hy - 5), ends[1]), (K['handF'], ends[2])):
            q.l(e[0], e[1], x, y, (200, 196, 180))
    return on(im, q.im)


def puppet_heap(k):
    """The collapsed puppet: a heap of jointed wooden limbs with the head on top, strings slack (k 0..1 how settled)."""
    p = Pic(64, 64)
    f = FEET
    for x0, x1, y0 in ((18, 30, f - 1), (24, 40, f - 2), (34, 46, f - 1)):
        p.l(x0, y0, x1, y0 - 1, WOODP[2], 3); ell(p, x0, y0, 1.6, 1.6, WOODP[1]); ell(p, x1, y0 - 1, 1.6, 1.6, WOODP[1])
    p.e(24, f - 7, 36, f - 1, CR[2]); p.l(25, f - 6, 35, f - 6, CR[3])
    hx, hy = 38 - k * 2, f - 9 + k * 3
    ell(p, hx, hy, 4, 4.5, WOODP[2]); ell(p, hx - 0.4, hy - 0.4, 3, 3.5, WOODP[3]); p.p(hx + 1, hy - 1, WOODP[0]); ell(p, hx + 2, hy + 1, 1, 1, (220, 90, 80))
    for x in (20, 32, 44):
        p.lines([(x, f - 3), (x + 2, f - 1), (x + 5, f - 2)], (200, 196, 180))
    return outline_same(p.im)


@builder('marionette')
def make_marionette():
    M = marionette_raw
    save_enemy('marionette', 'idle', [M(bob=(0, -1, -2, -1)[i], aF=(0.6 + (i % 2) * 0.3, 0.6), aB=(-0.4, 0.6 + (i % 2) * 0.4), ctrl=(0, 0.08, 0, -0.08)[i]) for i in range(4)])
    save_enemy('marionette', 'movement', [M(step=(0.0, 0.25, 0.25, 0.5, 0.75, 0.75)[i], bob=(0, -4, -2, 0, -4, -2)[i], lean=1, aF=(0.4 + (i % 3) * 0.4, 0.8), aB=(-0.6, 1.0),
                                            ctrl=(0, 0.15, 0.05, 0, -0.15, -0.05)[i]) for i in range(6)])
    save_enemy('marionette', 'attack', [M(aF=(2.0, 0.8), aB=(1.6, 0.6), lean=-1, ctrl=0.2, mouth=1), M(aF=(2.8, 0.5), aB=(2.4, 0.5), lean=-2, ctrl=0.3, bob=-3, mouth=2),
                                        M(aF=(1.6, 0.0), aB=(1.4, 0.0), lean=3, ctrl=-0.2, bob=-1, mouth=2), M(aF=(1.4, 0.0), aB=(1.2, 0.1), lean=3, ctrl=-0.25, mouth=1),
                                        M(aF=(1.0, 0.4), aB=(0.6, 0.4), lean=1, ctrl=-0.1), M()])
    save_enemy('marionette', 'take_damage', [flash(M(lean=-3, eyes=0, mouth=2, aF=(2.2, 0.5), aB=(2.4, 0.5), ctrl=0.3), WHITE), M(lean=-2, ctrl=0.2, mouth=1), M(lean=-1, ctrl=0.1)])
    d = [flash(M(lean=-2, eyes=0, mouth=2, aF=(2.2, 0.5), aB=(2.4, 0.5), ctrl=0.3), WHITE), M(eyes=0, strings=0, crouch=4, aF=(0.2, 0.0), aB=(0.0, 0.0), mouth=2),
         M(eyes=0, strings=0, crouch=9, lean=2, aF=(0.6, 0.6), aB=(-0.6, 0.6), mouth=2), puppet_heap(0), puppet_heap(0.6), puppet_heap(1)]
    save_enemy('marionette', 'death', d)


# ================================================================== LION AND JAGUAR (drawn, 64x64: a quadruped cat)
def cat_raw(kind='lion', step=0.0, bob=0, dx=0, lean=0.0, bite=0.0, leap=0.0, eyes=1, down=0.0, tail=0.0, roar=0):
    """Side view facing right: a big cat - the lion (tawny, a dark mane, a tuft on the tail, a red circus collar) or the
    jaguar (golden with black rosettes, lower and longer); bite opens the jaws, leap 0..1 lifts and stretches it, down
    folds the legs (death)."""
    p = Pic(64, 64)
    f = FEET
    jag = kind == 'jaguar'
    pal = JAG if jag else LIO
    cx = 30 + dx + leap * 2
    by = f - (15 if jag else 18) + bob + down * 10 - leap * 8
    L = lean
    bl = 13 + leap * 2
    tp = bez((cx - bl + 1, by - 2), (cx - bl - 7, by + 4 - tail * 6), (cx - bl - 5 + tail * 2, by - 9 - tail * 5), 10)
    p.lines(tp, pal[1], 2)
    if not jag:
        ell(p, *tp[-1], 2, 2, MANE[1])
    def legs(near):
        for x, ph in ((cx - bl + 5, 0.0 if near else math.pi), (cx + bl - 4, math.pi if near else 0.0)):
            o = math.sin(step * TAU + ph) * 3
            if leap:
                o = (6 if x > cx else -7) * leap
            kneel = down * 6
            c = pal[1] if near else dark(pal[1], 0.75)
            limb(p, [(x, by + 3), (x + o * 0.5, by + 9 + (f - by - 9) * 0.4 - kneel), (x + o, f - 1 - leap * 6 - kneel * 0.6)], 4, c, pal[2] if near else None)
            p.r(x + o - 2, f - 1 - leap * 6 - kneel * 0.6, x + o + 2, f - leap * 6 - kneel * 0.6, dark(pal[0], 0.9))
    legs(False)
    ell(p, cx, by, bl, 7 if not jag else 6, pal[1]); ell(p, cx - 1, by - 1.5, bl - 1.5, 5, pal[2])
    p.e(cx - bl + 4, by + 2, cx + bl - 4, by + 6, pal[3])                    # pale belly
    if jag:
        r2 = random.Random(7)
        for _ in range(12):
            x, y = cx + r2.uniform(-bl + 3, bl - 3), by + r2.uniform(-4, 3)
            p.arc(x - 1.5, y - 1.2, x + 1.5, y + 1.2, 0, 360, BLK[0]); p.p(x, y, pal[0])
    legs(True)
    hx, hy = cx + bl + 2 + L + bite * 2, by - 5 - leap * 2 + bite
    if not jag:                                                              # the mane
        for j in range(10):
            a = j / 10 * TAU
            ell(p, hx - 2 + math.cos(a) * 5.5, hy + 1 + math.sin(a) * 6, 3.5, 3.5, MANE[j % 3])
        p.r(hx - 5, hy + 5, hx - 2, hy + 8, (200, 30, 30)); p.p(hx - 4, hy + 6, AU3)   # circus collar
    ell(p, hx, hy, 4.5, 4.2, pal[2]); ell(p, hx - 0.5, hy - 0.8, 3.6, 3.2, pal[3])
    jaw = bite * 5
    p.poly([(hx + 2, hy - 1), (hx + 8, hy), (hx + 8, hy + 2), (hx + 2, hy + 3)], pal[2]); p.p(hx + 8, hy, (40, 20, 20))
    p.poly([(hx + 1, hy + 3), (hx + 7, hy + 3 + jaw * 0.3), (hx + 6, hy + 5 + jaw), (hx + 1, hy + 5)], pal[1])
    if bite > 0.2:
        p.poly([(hx + 2, hy + 3), (hx + 7, hy + 2.5), (hx + 6, hy + 3 + jaw)], (80, 10, 14))
        p.ps([(hx + 3, hy + 3), (hx + 6, hy + 3), (hx + 5, hy + 3 + jaw)], WHITE)
    p.poly([(hx - 3, hy - 3), (hx - 1, hy - 6), (hx, hy - 3)], pal[1])        # ear
    if eyes:
        p.p(hx + 3, hy - 2, (250, 220, 80) if not jag else (160, 240, 90)); p.p(hx + 4, hy - 2, BLK[0])
    else:
        p.l(hx + 2, hy - 2, hx + 4, hy - 2, pal[0])
    im = outline_same(cut_below(p.im, f))
    if roar:
        q = Pic(64, 64)
        for j in range(roar):
            q.arc(hx + 4 + j * 3, hy - 4 - j * 2, hx + 12 + j * 4, hy + 8 + j * 2, -50, 50, (240, 230, 200))
        im = on(im, q.im)
    return im


def make_cat(kind):
    C = lambda **kw: cat_raw(kind, **kw)
    save_enemy(kind, 'idle', [C(bob=(0, 0, 1, 1)[i], tail=(0, 0.3, 0.6, 0.3)[i]) for i in range(4)])
    save_enemy(kind, 'movement', [C(step=i / 6, bob=(0, -1, 0, 0, -1, 0)[i], tail=0.3 + 0.2 * math.sin(i), lean=1) for i in range(6)])
    save_enemy(kind, 'attack', [C(down=0.3, lean=-2, tail=0.8, roar=1 if kind == 'lion' else 0), C(down=0.4, lean=-2, bite=0.3, tail=1.0),
                                C(leap=0.6, bite=0.8, dx=1, tail=0.6), C(leap=1.0, bite=1.0, dx=2, tail=0.3),
                                C(leap=0.4, bite=0.6, dx=3, tail=0.2), C(bite=0.0, dx=1, tail=0.4)])
    save_enemy(kind, 'take_damage', [flash(C(lean=-3, bite=0.6, eyes=0, dx=-2), WHITE), C(lean=-2, bite=0.3, dx=-1), C()])
    save_enemy(kind, 'death', [flash(C(bite=0.8, eyes=0, dx=-2), WHITE), C(bite=0.6, eyes=0, down=0.3, dx=-2), C(bite=0.3, eyes=0, down=0.6, dx=-1),
                               C(eyes=0, down=0.85, tail=-0.3), C(eyes=0, down=1.0, tail=-0.5), C(eyes=0, down=1.1, tail=-0.6)])


@builder('lion')
def make_lion():
    make_cat('lion')


@builder('jaguar')
def make_jaguar():
    make_cat('jaguar')


# ================================================================== LIZARDMAN (drawn, 64x64: spear and shield)
def lizard_raw(step=None, bob=0, lean=0.0, thrust=0.0, raise_=0.0, eyes=1, mouth=0, shield=1, tail=0.0, spear=1):
    """Side view facing right: a green lizard warrior - a long snout with teeth, a frill, a bone necklace, a loincloth,
    a heavy tail; a round hide shield with a painted sun on the front arm (held forward) and a spear in the back hand
    over the shoulder (thrust 0..1 drives it forward, raise_ lifts it)."""
    p = Pic(64, 64)
    def far(p, K):
        hx, hy = K['hip']
        tp = bez((hx - 3, hy - 1), (hx - 14, hy + 2 + tail * 3), (hx - 18, FEET - 2), 10)
        tube(p, tp, [3.5 - i * 0.3 for i in range(10)], LZ[:4])
        sx, sy = K['sh']
        ln = 24
        bx, by = sx - 9 + thrust * 7, sy + 4 - raise_ * 4
        ex, ey = bx + ln * math.cos(-0.12 - raise_ * 0.3), by + ln * math.sin(-0.12 - raise_ * 0.3)
        if not spear:
            return
        p.l(bx, by, ex, ey, WD3, 2)
        p.poly([(ex, ey - 2), (ex + 6, ey), (ex, ey + 2)], (200, 206, 214)); p.p(ex + 5, ey, WHITE)
        p.ps([(ex - 2, ey + 2), (ex - 3, ey + 4)], FEA['r'][1])
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.e(hx - 2, sy + 3, hx + 6, hy, LZ[3])                                # pale belly scales
        p.poly([(hx - 5, hy - 1), (hx + 5, hy - 1), (hx + 4, hy + 5), (hx - 3, hy + 6)], EARTH[3])
        for j in range(4):
            p.p(sx - 2 + j * 2, sy + 2 + (j % 2), (230, 224, 200))
    def head(p, K):
        x, y = K['head']
        p.poly([(x - 4, y - 4), (x - 7, y - 1), (x - 4, y + 3)], FEA['r'][1])  # frill
        jaw = mouth * 2
        p.poly([(x, y - 3), (x + 9, y - 1), (x + 9, y + 1), (x, y + 2)], LZ[2])
        p.poly([(x, y + 2), (x + 8, y + 1 + jaw), (x + 7, y + 3 + jaw), (x, y + 4)], LZ[1])
        if mouth:
            p.ps([(x + 3, y + 2), (x + 5, y + 2), (x + 7, y + 2)], WHITE)
        p.p(x + 2, y - 2, (240, 200, 40) if eyes else LZ[0]); p.p(x + 3, y - 2, BLK[0] if eyes else LZ[0])
    def front(p, K):
        x, y = K['handF']
        if shield:
            ell(p, x + 3, y - 3, 3.5, 8, WD1); ell(p, x + 3, y - 3, 2.8, 7, EARTH[3])
            p.l(x + 3, y - 9, x + 3, y + 3, FEA['r'][1]); ell(p, x + 3, y - 3, 1.5, 2, AU2)
    rig(p, 30, FEET, LL=15, TL=13, HR=4.5, step=step, bob=bob, lean=lean, legs=(LZ[1], LZ[2]), leg_w=4, body=(LZ[1], LZ[2]), body_w=(5, 6),
        arms=(LZ[1], LZ[2]), arm_w=3, AL=12, aB=(1.0, 0.6), aF=(1.2, 0.6), skin=LZ, hands=LZ[2], shoes=LZ[0],
        on_far=far, on_torso=torso, on_head=head, on_front=front)
    return outline_same(p.im)


@builder('lizardman')
def make_lizardman():
    Z = lizard_raw
    save_enemy('lizardman', 'idle', [Z(bob=(0, 0, -1, 0)[i], tail=(0, 0.5, 1, 0.5)[i]) for i in range(4)])
    save_enemy('lizardman', 'movement', [Z(step=i / 6, bob=(0, -1, -1, 0, -1, -1)[i], lean=1, tail=math.sin(i)) for i in range(6)])
    save_enemy('lizardman', 'attack', [Z(raise_=0.5, lean=-1, mouth=1), Z(raise_=0.8, thrust=-0.3, lean=-2, mouth=1), Z(thrust=0.6, lean=2, mouth=2),
                                       Z(thrust=1.0, lean=3, mouth=2), Z(thrust=0.6, lean=1, mouth=1), Z(thrust=0.0)])
    save_enemy('lizardman', 'take_damage', [flash(Z(lean=-3, eyes=0, mouth=2), WHITE), Z(lean=-2, mouth=1), Z(lean=-1)])
    base = Z(eyes=0, mouth=1, shield=0, spear=0)
    d = [flash(Z(lean=-3, eyes=0, mouth=2), WHITE), fall(base, 0.3), fall(base, 0.6), fall(base, 0.9), fall(base, 1.0)]
    q = Pic(64, 64); q.l(8, FEET - 1, 40, FEET - 2, WD3, 2); q.poly([(40, FEET - 4), (46, FEET - 2), (40, FEET)], (200, 206, 214)); ell(q, 50, FEET - 3, 7, 3, WD1); ell(q, 50, FEET - 3, 6, 2.2, EARTH[3]); ell(q, 50, FEET - 3, 2, 1.2, AU2)
    d.append(on(d[-1], outline_same(q.im)))
    save_enemy('lizardman', 'death', d)


# ================================================================== BLOWGUNNER (drawn, 64x64: a crouching jungle hunter)
def dart(p, x, y, a=0.0, ln=6):
    u = (math.cos(a), math.sin(a))
    p.l(x, y, x + u[0] * ln, y + u[1] * ln, (200, 190, 150))
    p.p(x + u[0] * ln, y + u[1] * ln, POISON[2])
    p.ps([(x - u[0], y - u[1] - 1), (x - u[0], y - u[1] + 1)], FEA['r'][1])


def blowgunner_raw(step=None, bob=0, lean=0.0, crouch=5, aim=1.0, puff_=0, fly=None, eyes=1, cheeks=0):
    """Side view facing right: a crouching jungle hunter - dark skin with white paint stripes, a leaf skirt, a headband
    of red, green and yellow feathers; a long blowgun (aim 0..1 from carried low to raised at the lips), puff_ = the
    breath at the far end, fly = a dart in flight."""
    p = Pic(64, 64)
    K_ = {}
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        for j in range(3):
            p.l(sx - 2, sy + 3 + j * 3, sx + 3, sy + 3 + j * 3, (220, 214, 200))
        for j in range(5):
            leaf(p, hx - 4 + j * 2, hy - 1, 1.3 + (j - 2) * 0.15, 6, 1.5, JG[1:])
    def head(p, K):
        x, y = K['head']
        K_.update(K)
        for j, c in enumerate(('r', 'g', 'y', 'b')):
            feather(p, x - 2, y - 3, -1.9 - j * 0.3, 8, 1.6, FEA[c] + (FEA[c][2],))
        p.l(x - 4, y - 2, x + 4, y - 3, FEA['r'][1], 2)
        p.l(x + 1, y + 1, x + 4, y + 1, (220, 214, 200))
        if cheeks:
            ell(p, x + 3, y + 2, 1.6, 1.4, TRIBE[2])
        p.p(x + 2, y - 1, BLK[0] if eyes else TRIBE[1])
    def front(p, K):
        x, y = K['head']
        a = -0.05 - (1 - aim) * 0.9
        mx, my = x + 4, y + 2
        if aim < 1:
            mx, my = K['handF']
        ln = 21
        ex, ey = mx + math.cos(a) * ln, my + math.sin(a) * ln
        p.l(mx, my, ex, ey, (130, 110, 50), 2)
        for t in (0.25, 0.5, 0.8):
            p.p(mx + (ex - mx) * t, my + (ey - my) * t, (80, 60, 30))
        ell(p, *K['handF'], 1.6, 1.6, TRIBE[2])
        if puff_:
            for j in range(puff_):
                puff(p, ex + 2 + j * 3, ey - 1 - j, 1.5 + j * 0.5, ((140, 140, 130), (190, 190, 180), (220, 220, 210), WHITE))
        if fly is not None:
            dart(p, ex + 1 + fly * 2, ey, 0, 5)
    rig(p, 25, FEET, LL=14, TL=12, HR=4.5, step=step, bob=bob, lean=lean + 2, crouch=crouch, legs=(TRIBE[1], TRIBE[2]), leg_w=3, body=(TRIBE[1], TRIBE[2]),
        body_w=(4, 5), arms=(TRIBE[1], TRIBE[2]), arm_w=3, AL=12, aB=(1.3, 1.2), aF=(1.5, 0.9) if aim >= 1 else (0.8, 0.6), skin=TRIBE, hands=TRIBE[2],
        on_torso=torso, on_head=head, on_front=front)
    return outline_same(p.im)


@builder('blowgunner')
def make_blowgunner():
    B = blowgunner_raw
    save_enemy('blowgunner', 'idle', [B(aim=0.3, bob=(0, 0, 1, 0)[i], crouch=(5, 5, 6, 5)[i]) for i in range(4)])
    save_enemy('blowgunner', 'movement', [B(aim=0.3, step=i / 6, crouch=6, bob=(0, -1, 0, 0, -1, 0)[i], lean=1) for i in range(6)])
    save_enemy('blowgunner', 'attack', [B(aim=0.6), B(aim=1.0, cheeks=1), B(aim=1.0, cheeks=1, crouch=6), B(aim=1.0, puff_=2, fly=0.0, lean=-1),
                                        B(aim=1.0, fly=0.6), B(aim=0.6)])
    save_enemy('blowgunner', 'take_damage', [flash(B(aim=0.3, lean=-3, eyes=0), WHITE), B(aim=0.3, lean=-2), B(aim=0.3, lean=-1)])
    base = B(aim=0.3, eyes=0, crouch=2)
    save_enemy('blowgunner', 'death', [flash(B(aim=0.3, lean=-3, eyes=0), WHITE), fall(base, 0.3), fall(base, 0.6), fall(base, 0.9), fall(base, 1.0),
                                       fall(B(aim=0.3, eyes=0, crouch=2, lean=-1), 1.0)])


# ================================================================== MONKEY (drawn, 64x64: a small thieving monkey)
def monkey_raw(bob=0, dx=0, lean=0.0, step=0.0, reach=0.0, hop=0, eyes=1, mouth=0, tail=0.0, loot=False, down=0.0):
    """Side view facing right: a small brown monkey crouched on all fours with long arms, a pale face and ears, a curled
    tail; reach 0..1 stretches a grabbing arm forward, loot = it clutches a stolen box of ammo, hop lifts it."""
    p = Pic(64, 64)
    f = FEET - hop
    cx = 30 + dx
    by = f - 12 + bob + down * 6
    tp = bez((cx - 7, by), (cx - 18, by + 6), (cx - 14 - tail * 3, by - 12 + tail * 4), 10)
    p.lines(tp, MONK[1], 2)
    p.arc(tp[-1][0] - 3, tp[-1][1] - 3, tp[-1][0] + 2, tp[-1][1] + 2, 180, 450, MONK[1], 2)
    for x, ph, c in ((cx - 5, 0.0, MONK[0]), (cx + 5, math.pi, MONK[0])):
        o = math.sin(step * TAU + ph) * 3
        limb(p, [(x, by + 2), (x - 2 + o * 0.5, by + 7), (x + o, f - 1)], 3, c)
    ell(p, cx, by, 8, 6, MONK[1]); ell(p, cx - 1, by - 1, 6.5, 4.5, MONK[2])
    for x, ph in ((cx - 4, math.pi), (cx + 6, 0.0)):
        o = math.sin(step * TAU + ph) * 3
        limb(p, [(x, by + 2), (x - 1 + o * 0.5, by + 8 - down * 3), (x + o, f - 1)], 3, MONK[1], MONK[2])
    hx, hy = cx + 8 + lean, by - 6 + down * 4
    ell(p, hx - 3, hy - 1, 2.2, 2.2, MSK[1])
    ell(p, hx, hy, 5, 5, MONK[1]); ell(p, hx + 1.5, hy + 1, 3.5, 3.5, MSK[2])
    if eyes:
        p.ps([(hx + 2, hy - 1), (hx + 4, hy - 1)], BLK[0])
    else:
        p.l(hx + 1, hy - 1, hx + 4, hy - 1, MSK[0])
    p.l(hx + 2, hy + 3, hx + 4, hy + 3 + mouth, (90, 30, 30))
    sx, sy = cx + 6, by - 2
    ex, ey = sx + 4 + reach * 14, sy + 6 - reach * 6
    limb(p, [(sx, sy), (sx + 3 + reach * 6, sy + 4 - reach * 3), (ex, ey)], 3, MONK[1], MONK[3])
    if loot:
        p.r(ex - 3, ey - 3, ex + 3, ey + 2, (90, 110, 50)); p.l(ex - 3, ey - 3, ex + 3, ey - 3, (140, 160, 80)); p.p(ex, ey - 1, AU3)
    else:
        ell(p, ex, ey, 1.6, 1.6, MSK[2])
    return outline_same(cut_below(p.im, FEET))


@builder('monkey')
def make_monkey():
    M = monkey_raw
    save_enemy('monkey', 'idle', [M(bob=(0, -1, 0, 0)[i], tail=(0, 0.5, 1, 0.5)[i], lean=(0, 0, 1, 0)[i]) for i in range(4)])
    save_enemy('monkey', 'movement', [M(step=i / 6, hop=(0, 3, 6, 3, 0, 0)[i], tail=math.sin(i), lean=1) for i in range(6)])
    save_enemy('monkey', 'attack', [M(hop=2, reach=0.3, mouth=1), M(hop=4, reach=0.8, mouth=2, dx=2), M(hop=3, reach=1.0, dx=4, mouth=2),
                                    M(hop=1, reach=0.6, loot=True, dx=3, mouth=1), M(reach=0.2, loot=True, lean=-1, dx=1), M(loot=True, reach=0.1)])
    save_enemy('monkey', 'take_damage', [flash(M(lean=-3, eyes=0, mouth=2), WHITE), M(lean=-2, mouth=1), M(lean=-1)])
    d = [flash(M(eyes=0, mouth=2, lean=-2), WHITE), M(eyes=0, mouth=2, hop=3), M(eyes=0, mouth=1, down=0.4), M(eyes=0, down=0.8), M(eyes=0, down=1.0, tail=-0.5),
         M(eyes=0, down=1.0, tail=-0.8)]
    save_enemy('monkey', 'death', d)


# ================================================================== MOSQUITO (drawn, 64x64: a small blood-sucking mosquito, drawn low)
def mosquito_raw(wing=0.0, dx=0, dy=0, tilt=0.0, stab=0.0, full=0.0, eyes=1, legs_up=False, on_floor=False):
    """Side view facing right: a mosquito about 18 px long - a thin striped abdomen (full swells it red with blood), a
    humped thorax, big red eyes, a long proboscis (stab pushes it forward), six dangling legs and two glassy wings
    (wing 0..1 = beat phase); drawn low in the cell (the game lifts flying enemies)."""
    p = Pic(64, 64)
    cx, cy = 30 + dx, FEET - 12 + dy
    if on_floor:
        cy = FEET - 4
    ca, sa = math.cos(tilt), math.sin(tilt)
    R = lambda u, v: (cx + u * ca - v * sa, cy + u * sa + v * ca)
    for j in range(3):                                                       # legs
        x0, y0 = R(-1 + j * 2, 2)
        if legs_up:
            p.lines([(x0, y0), (x0 - 2 + j * 2, y0 - 5), (x0 - 4 + j * 3, y0 - 3)], (60, 50, 40))
        else:
            p.lines([(x0, y0), (x0 - 2 + j, y0 + 4), (x0 - 4 + j * 2, y0 + 8)], (60, 50, 40))
    ab = 2.2 + full * 1.6
    for i in range(6):
        x, y = R(-3 - i * 1.6, 1 + i * 0.4)
        ell(p, x, y, ab - i * 0.2, ab - i * 0.25, (150, 30, 30) if full > 0.5 else ((70, 60, 50) if i % 2 else (130, 116, 90)))
    ell(p, *R(1, -1), 3, 3, (80, 70, 56)); ell(p, *R(0.5, -1.5), 2, 2, (120, 104, 80))
    hx, hy = R(5, -1)
    ell(p, hx, hy, 2, 2, (60, 50, 40))
    ell(p, hx + 1, hy - 0.5, 1.4, 1.4, (200, 40, 40) if eyes else (80, 60, 50))
    px, py = R(7 + stab * 5, 1.5)
    p.l(hx + 1, hy + 1, px + 3, py, (40, 30, 26))
    p.lines([R(6, -3), R(8, -6)], (60, 50, 40)); p.lines([R(6, -3), R(9, -5)], (60, 50, 40))   # antennae
    im = outline_same(p.im)
    q = Pic(64, 64)
    if not on_floor:
        for j, k in enumerate((0, 1)):
            a = -1.9 + math.sin(wing * TAU + j * 0.6) * 0.9
            wx, wy = R(0, -3)
            ex, ey = wx + math.cos(a) * 11, wy + math.sin(a) * 11
            q.poly([(wx, wy), (ex - 2, ey), (ex + 2, ey + 1)], (190, 210, 220) if j else (150, 170, 186))
            q.l(wx, wy, ex, ey, (230, 240, 250))
    else:
        wx, wy = R(-2, -2)
        q.poly([(wx, wy), (wx - 11, wy + 2), (wx - 10, wy + 3)], (170, 190, 200))
    return on(on(Image.new('RGBA', (64, 64)), outline_same(q.im, (40, 50, 60))), im)


@builder('mosquito')
def make_mosquito():
    Q = mosquito_raw
    save_enemy('mosquito', 'idle', [Q(wing=i / 4, dy=(0, -1, -2, -1)[i]) for i in range(4)])
    save_enemy('mosquito', 'movement', [Q(wing=i / 3, dy=(0, -1, -2, -2, -1, 0)[i], tilt=0.15, dx=1) for i in range(6)])
    save_enemy('mosquito', 'attack', [Q(wing=0.0, tilt=-0.1), Q(wing=0.33, dx=-2, tilt=-0.2), Q(wing=0.66, dx=3, tilt=0.35, stab=1.0, dy=2),
                                      Q(wing=0.0, dx=3, tilt=0.35, stab=1.0, dy=2, full=0.6), Q(wing=0.33, dx=2, tilt=0.2, stab=0.5, full=1.0), Q(wing=0.66, full=0.4)])
    save_enemy('mosquito', 'take_damage', [flash(Q(wing=0.2, dx=-3, tilt=-0.4, eyes=0), WHITE), Q(wing=0.6, dx=-2, tilt=-0.2), Q(wing=0.9)])
    save_enemy('mosquito', 'death', [flash(Q(wing=0.2, tilt=-0.4, eyes=0), WHITE), Q(wing=0.5, eyes=0, tilt=0.8, dy=4), Q(wing=0.8, eyes=0, tilt=1.6, dy=8),
                                     Q(eyes=0, on_floor=True, tilt=math.pi, legs_up=True), Q(eyes=0, on_floor=True, tilt=math.pi, legs_up=True, dx=1),
                                     Q(eyes=0, on_floor=True, tilt=math.pi, legs_up=True, dx=1)])


# ================================================================== TEMPLE GUARDIAN (drawn, 64x64: a stone statue with a mask)
def guardian_raw(bob=0, dx=0, lean=0.0, glow=0, step=0.0, crack=0, eyes=1, beam=0, broken=0.0):
    """Side view facing right: a squat temple statue of mossy stone - blocky legs and arms, a stepped headdress and a
    jade jaguar mask with deep eye holes; glow 0..3 lights the eyes (attack: the laser stare, beam = the ray's length),
    crack adds fissures (hurt / death)."""
    p = Pic(64, 64)
    f = FEET
    cx = 30 + dx
    top = 15 + bob
    o = math.sin(step * TAU) * 2
    p.r(cx - 8 - o, f - 12, cx - 3 - o, f - 1, STN[1]); p.r(cx + 2 + o, f - 12, cx + 7 + o, f - 1, STN[2])
    p.r(cx - 10, f - 14, cx + 9, f - 11, STN[1])
    p.r(cx - 10 + lean, top + 14, cx + 9 + lean, f - 13, STN[2]); p.r(cx - 9 + lean, top + 15, cx + 6 + lean, f - 15, STN[3])
    for y in range(top + 18, f - 14, 5):
        p.l(cx - 9 + lean, y, cx + 8 + lean, y, STN[1])
    p.r(cx - 14 + lean, top + 15, cx - 10 + lean, top + 30, STN[1]); p.r(cx + 9 + lean, top + 15, cx + 13 + lean, top + 30, STN[2])
    hx = cx + lean
    p.r(hx - 9, top, hx + 9, top + 14, STN[2])                               # head block
    p.r(hx - 11, top - 4, hx + 11, top, STN[3]); p.r(hx - 7, top - 8, hx + 7, top - 4, STN[2]); p.r(hx - 3, top - 11, hx + 3, top - 8, STN[3])
    p.poly([(hx - 3, top + 1), (hx + 11, top + 2), (hx + 11, top + 13), (hx - 3, top + 13)], JADE[1])   # the mask
    p.l(hx - 3, top + 1, hx + 11, top + 2, JADE[3])
    ec = [(10, 10, 10), (200, 120, 20), (255, 200, 60), (255, 250, 200)][glow if eyes else 0]
    p.r(hx + 2, top + 4, hx + 5, top + 6, ec); p.r(hx + 7, top + 4, hx + 10, top + 6, ec)
    for x in range(int(hx) + 1, int(hx) + 11, 2):
        p.l(x, top + 10, x, top + 12, (230, 226, 200))                       # fangs
    p.l(hx, top + 9, hx + 11, top + 9, JADE[0])
    r2 = random.Random(90)
    for _ in range(14):
        x, y = r2.uniform(cx - 12, cx + 12), r2.uniform(top - 6, f - 2)
        if p.solid(x, y):
            p.p(x, y, MOSS[r2.randrange(1, 4)])
    for j in range(crack):
        x = cx - 6 + j * 5
        p.lines([(x, top + 16), (x + 2, top + 22), (x - 1, top + 28), (x + 1, top + 34)], STN[0])
    im = outline_same(p.im, (18, 20, 16))
    if glow and eyes:
        q = Pic(64, 64)
        for ex in (hx + 3.5, hx + 8.5):
            halo(q, ex, top + 5, 3 + glow, ((255, 220, 100), (255, 160, 40)), 8, glow)
        if beam:
            q.l(hx + 10, top + 5, hx + 10 + beam, top + 5 + beam * 0.15, (255, 230, 120), 2)
            q.l(hx + 10, top + 5, hx + 10 + beam, top + 5 + beam * 0.15, WHITE)
        im = on(im, q.im)
    return im


def rubble(k):
    p = Pic(64, 64)
    f = FEET
    r2 = random.Random(91)
    for j in range(11):
        x, w, h = 14 + r2.uniform(0, 34), r2.uniform(4, 8), r2.uniform(3, 6) - k
        p.r(x, f - h, x + w, f, STN[r2.randrange(1, 4)]); p.l(x, f - h, x + w, f - h, STN[4])
    p.poly([(30, f - 10 + k * 2), (42, f - 9 + k * 2), (42, f), (30, f)], JADE[1]); p.r(33, f - 7 + k * 2, 35, f - 6 + k * 2, (10, 10, 10))
    return outline_same(p.im, (18, 20, 16))


@builder('templeguardian')
def make_templeguardian():
    G = guardian_raw
    save_enemy('templeguardian', 'idle', [G(glow=(0, 0, 1, 0)[i]) for i in range(4)])
    save_enemy('templeguardian', 'movement', [G(step=i / 6, bob=(0, 1, 0, 0, 1, 0)[i], dx=(0, 0, 1, 1, 1, 0)[i]) for i in range(6)])
    save_enemy('templeguardian', 'attack', [G(glow=1), G(glow=2), G(glow=3, beam=8), G(glow=3, beam=18, lean=1), G(glow=3, beam=18, lean=1), G(glow=1)])
    save_enemy('templeguardian', 'take_damage', [flash(G(crack=1, dx=-1), WHITE), G(crack=1), G(crack=1)])
    save_enemy('templeguardian', 'death', [flash(G(crack=3, eyes=0), WHITE), G(crack=3, eyes=0, bob=1), shift(G(crack=4, eyes=0), 0, 4), rubble(0), rubble(1), rubble(2)])


# ================================================================== THE RINGMASTER (drawn, 116x116)
def top_hat(p, x, y, s=1.0, tilt=0.0):
    """A tall black top hat with a red band, its brim centred on (x, y)."""
    ca, sa = math.cos(tilt), math.sin(tilt)
    R = lambda u, v: (x + (u * ca - v * sa) * s, y + (u * sa + v * ca) * s)
    p.poly([R(-7, 0), R(-7, -20), R(7, -20), R(7, 0)], BLK[1])
    p.poly([R(-6, -1), R(-6, -19), R(-3, -19), R(-3, -1)], BLK[3])
    p.poly([R(-7, -4), R(7, -4), R(7, 0), R(-7, 0)], CR[2])
    p.poly([R(-12, 0), R(12, 0), R(12, 2), R(-12, 2)], BLK[1]); p.l(*R(-12, 0), *R(12, 0), BLK[3])


def whip_line(p, pts, crack=False):
    p.lines(pts, (60, 30, 14), 3)
    p.lines(pts, (130, 76, 34), 1)
    if crack:
        x, y = pts[-1]
        for j in range(8):
            a = j / 8 * TAU
            p.l(x, y, x + math.cos(a) * (7 if j % 2 else 4), y + math.sin(a) * (7 if j % 2 else 4), (255, 240, 180))
        p.p(x, y, WHITE)


def ringmaster_frame(step=None, bob=0, lean=0.0, aF=(0.5, 0.3), aB=(-0.2, 0.4), whip=None, crack=False, hat='head', eyes=1, mouth=0,
                     spot=0, crouch=0):
    """Side view facing right: the ringmaster - a tall top hat, a sharp waxed moustache and sideburns, a red tailcoat with
    gold frogging and long tails, a white waistcoat, white breeches and black riding boots; a coiled bullwhip in the
    front hand (whip = list of points of the lash, or None for the coil); hat 'head' / 'hand' (raised in the back hand)
    / None; spot 1..2 = the spotlight cone falling on him (cast)."""
    p = Pic(BS, BS)
    f = BS_FEET
    K0 = {}
    def far(p, K):
        K0.update(K)
        hx, hy = K['hip']
        p.poly([(hx - 10, hy - 6), (hx - 26 + lean * 0.3, hy + 26), (hx - 16, hy + 28), (hx - 2, hy)], CR[1])     # coat tails
        p.l(hx - 26 + lean * 0.3, hy + 26, hx - 16, hy + 28, AU2, 2)
    def torso(p, K):
        hx, hy = K['hip']; sx, sy = K['sh']
        p.poly([(sx + 2, sy + 2), (sx + 9, sy + 2), (hx + 8, hy + 2), (hx + 2, hy + 2)], PAINT[1])                # waistcoat
        for j in range(4):
            y = sy + 8 + j * 7
            p.l(sx - 6 + lean * 0.2, y, sx + 4, y, AU2, 2); ell(p, sx + 5, y, 1.5, 1.5, AU3)
        p.poly([(sx - 10, sy - 2), (sx + 9, sy - 2), (sx + 10, sy + 5), (sx - 11, sy + 5)], CR[3])              # shoulders
        for j in range(5):
            p.l(sx + 1 + j * 2, sy + 5, sx + 1 + j * 2, sy + 9, AU3)
        p.l(sx + 4, sy - 1, sx + 10, sy + 6, PAINT[3], 3)                                                         # cravat
    def head(p, K):
        x, y = K['head']
        p.poly([(x + 1, y + 4), (x + 14, y + 2), (x + 16, y - 1), (x + 9, y + 6), (x + 2, y + 7)], BLK[1])     # moustache
        p.poly([(x + 1, y + 4), (x - 10, y + 2), (x - 12, y - 1), (x - 6, y + 6)], BLK[1]) if False else None
        p.r(x - 8, y - 4, x - 5, y + 6, BLK[1])                                                                   # sideburn
        p.poly([(x + 8, y - 3), (x + 14, y + 1), (x + 8, y + 2)], SKIN[2])                                       # nose
        if eyes:
            ell(p, x + 5, y - 3, 1.8, 1.6, WHITE); p.p(x + 6, y - 3, BLK[0]); p.l(x + 2, y - 7, x + 8, y - 6, BLK[1], 2)
        else:
            p.l(x + 3, y - 3, x + 7, y - 3, BLK[0])
        if mouth:
            p.e(x + 4, y + 6, x + 9, y + 7 + mouth * 2, (80, 16, 20))
        if hat == 'head':
            top_hat(p, x, y - 8, 1.0, -0.05)
    def front(p, K):
        x, y = K['handF']
        p.l(x - 2, y, x + 6, y - 8, WD1, 4)                                                                       # whip handle
        if whip is None:
            for j in range(3):
                p.arc(x - 2 + j, y + 2, x + 10 - j, y + 14 - j * 2, 0, 360, (90, 50, 20), 2)
        else:
            whip_line(p, [(x + 6, y - 8)] + whip, crack)
        if hat == 'hand':
            bx, by = K['handB']
            top_hat(p, bx, by + 5, 1.0, -0.3)
    rig(p, 50, f, LL=36, TL=28, HR=9, step=step, bob=bob, lean=lean, crouch=crouch, legs=(PAINT[1], PAINT[2]), leg_w=9, body=(CR[1], CR[2]),
        body_w=(11, 11), arms=(CR[1], CR[3]), arm_w=7, AL=30, aB=aB, aF=aF, skin=SKIN, hands=PAINT[3], shoes=BLK[1],
        on_far=far, on_torso=torso, on_head=head, on_front=front)
    for fx, fy in K0['feet']:                                                 # riding boots over the breeches
        p.r(fx - 4, f - 16, fx + 4, f - 1, BLK[1]); p.l(fx - 4, f - 16, fx + 4, f - 16, BLK[3]); p.r(fx - 4, f - 2, fx + 8, f, BLK[0])
    im = outline_same(p.im)
    if spot:
        q = Pic(BS, BS)
        cx = K0['head'][0]
        for y in range(2, f - 2, 2):
            w = 6 + y * 0.32
            for x in range(int(cx - w), int(cx + w) + 1, 3):
                if (x + y // 2 + spot) % 2 == 0 and 1 <= x < BS - 1:
                    q.p(x, y + 1, (255, 236, 150) if spot == 2 else (230, 210, 130))
        q.e(cx - 34, f - 4, cx + 34, f, (255, 236, 150))
        im = on(q.im, im)
    return im


@builder('ringmaster')
def make_ringmaster():
    R = ringmaster_frame
    save_boss('ringmaster', 'idle', [R(bob=(0, -1, -1, 0, 0)[i], aF=(0.5 + (0, 0.05, 0.1, 0.05, 0)[i], 0.3), aB=(-0.3, 1.6)) for i in range(5)])
    # attack: the whip lash (loops: starts and ends near the ready pose)
    W = lambda pts: [(x, y) for x, y in pts]
    save_boss('ringmaster', 'attack', [
        R(aF=(2.6, 0.6), aB=(-0.3, 1.6), lean=-3, whip=W([(30, 34), (14, 30), (6, 44)]), mouth=1),
        R(aF=(3.0, 0.4), aB=(-0.3, 1.6), lean=-5, whip=W([(40, 14), (20, 8), (6, 18)]), mouth=1),
        R(aF=(2.0, 0.2), aB=(-0.3, 1.6), lean=2, whip=W([(70, 20), (86, 16), (96, 26)]), mouth=2),
        R(aF=(1.6, 0.1), aB=(-0.3, 1.6), lean=4, whip=W([(78, 50), (92, 56), (102, 58)]), crack=True, mouth=3),
        R(aF=(1.2, 0.2), aB=(-0.3, 1.6), lean=3, whip=W([(76, 76), (88, 96), (100, 110)]), mouth=1),
        R(aF=(0.6, 0.3), aB=(-0.3, 1.6), lean=0, whip=W([(64, 100), (76, 112), (90, 113)]))])
    # cast: lifts the hat and points with the whip into the spotlight - the next act!
    save_boss('ringmaster', 'cast', [R(aF=(1.5, 0.2), aB=(2.2, 0.8), hat='hand', mouth=1, spot=1), R(aF=(1.7, 0.0), aB=(2.8, 0.4), hat='hand', mouth=2, spot=2),
                                     R(aF=(1.8, 0.0), aB=(3.0, 0.2), hat='hand', mouth=3, spot=2, lean=-1), R(aF=(1.8, 0.0), aB=(3.0, 0.2), hat='hand', mouth=2, spot=2, lean=-1),
                                     R(aF=(1.7, 0.0), aB=(2.8, 0.4), hat='hand', mouth=1, spot=1), R(aF=(1.5, 0.2), aB=(2.2, 0.8), hat='hand', spot=1)])
    save_boss('ringmaster', 'hurt', [flash(R(lean=-4, mouth=3, eyes=0, aF=(1.6, 0.5), aB=(1.2, 0.6)), WHITE), R(lean=-3, mouth=2, aF=(1.0, 0.4)), R(lean=-1)])
    base = R(eyes=0, mouth=2, hat=None, aF=(2.4, 0.3), aB=(2.6, 0.3))
    fallen = lambda k: fall(base, k, 90, BS, BS_FEET)
    q = Pic(BS, BS); top_hat(q, 96, BS_FEET - 3, 1.0, 0.25)
    hat_im = outline_same(q.im)
    save_boss('ringmaster', 'death', [flash(R(lean=-4, mouth=3, eyes=0, aF=(1.6, 0.5)), WHITE), R(lean=-6, mouth=3, eyes=0, crouch=4, hat=None, aF=(2.0, 0.4), aB=(2.2, 0.4)),
                                      on(fallen(0.3), hat_im), on(fallen(0.6), hat_im), on(fallen(0.9), hat_im), on(fallen(1.0), hat_im), on(fallen(1.0), hat_im)])


# ================================================================== THE FEATHERED SERPENT (drawn, 116x116)
def serpent_frame(hx=84, hy=30, mouth=0, collar=0.4, eyes=1, sink=0.0, spit=0, coil_ph=0.0, flash_=None):
    """Side view facing right: a giant feathered serpent - a heavy coil on the floor (its ground contact stays at x 22-82
    in every frame), a scaled neck rearing up to the head at (hx, hy), a gold belly, a crest and a collar of red, green,
    gold and blue feathers round the neck (collar 0..1 = folded .. fanned out), jade eyes, fangs (mouth 0..1); spit = the
    venom blobs; sink 0..1 lowers it onto the coil (death)."""
    p = Pic(BS, BS)
    f = BS_FEET
    hy = hy + (f - 22 - hy) * sink
    hx = hx - 14 * sink
    coil = [(52 + math.cos(t) * 30, f - 9 + math.sin(t) * 5) for t in np.linspace(math.pi * 0.95 + coil_ph, math.pi * 2.9 + coil_ph, 26)]
    tail = [(22 + i * 0.8, f - 5 - i * 0.2) for i in range(6)]
    tube(p, coil, [6 + 3 * math.sin(i / 25 * math.pi) for i in range(26)], SERP[:4])
    neck = bez((76, f - 12), (64 - 6 * sink, f - 40 + sink * 20), (hx - 6, hy + 10), 22)
    radii = [9 - i * 0.18 for i in range(22)]
    tube(p, neck, radii, SERP[:4])
    for (x, y), r in list(zip(neck, radii))[2::2]:                            # belly plates on the front edge
        p.l(x + r * 0.55, y - 1, x + r * 0.9, y + 1, BELLY[2], 2)
    cols = [FEA['r'], FEA['g'], FEA['y'], FEA['b']]
    nx, ny = neck[-6]
    n = 9
    for j in range(n):                                                       # the feather collar
        a = -math.pi / 2 - (0.6 + collar * 1.2) + j / (n - 1) * (1.2 + collar * 2.4) - 0.3
        ln = 14 + collar * 12
        c = cols[j % 4]
        feather(p, nx, ny, a + math.pi, ln, 3.5 + collar, c + (c[2],))
    # head
    ell(p, hx, hy, 11, 8, SERP[1]); ell(p, hx - 1, hy - 1.5, 9.5, 6, SERP[2])
    jaw = mouth * 9
    p.poly([(hx + 2, hy - 4), (hx + 20, hy - 1), (hx + 20, hy + 2), (hx + 2, hy + 3)], SERP[2])                  # upper jaw
    p.l(hx + 4, hy - 4, hx + 19, hy - 1, SERP[4])
    p.poly([(hx + 2, hy + 3), (hx + 18, hy + 3 + jaw * 0.6), (hx + 16, hy + 6 + jaw), (hx, hy + 6)], BELLY[1])   # lower jaw
    if mouth > 0.2:
        p.poly([(hx + 3, hy + 3), (hx + 18, hy + 2), (hx + 15, hy + 3 + jaw)], (90, 14, 30))
        p.poly([(hx + 15, hy + 2), (hx + 17, hy + 2), (hx + 16, hy + 7)], WHITE); p.poly([(hx + 9, hy + 2), (hx + 11, hy + 2), (hx + 10, hy + 6)], WHITE)
        p.lines([(hx + 8, hy + 4 + jaw * 0.5), (hx + 14, hy + 3 + jaw * 0.6), (hx + 16, hy + 1 + jaw * 0.6)], (220, 60, 90))   # tongue
    for j in range(4):                                                       # the crest
        c = cols[(j + 1) % 4]
        feather(p, hx - 2 - j * 2, hy - 6, -2.1 - j * 0.25, 10 + collar * 4, 2.5, c + (c[2],))
    if eyes:
        ell(p, hx + 6, hy - 3, 2.5, 2, JADE[3]); p.l(hx + 7, hy - 5, hx + 7, hy - 1, BLK[0])
    else:
        p.l(hx + 4, hy - 3, hx + 9, hy - 3, SERP[0])
    im = outline_same(cut_below(p.im, f), (8, 20, 14))
    if spit:
        q = Pic(BS, BS)
        for j in range(spit):
            bx, by = hx + 19 + j * 5, hy + 5 + j * j * 1.5
            ell(q, bx, by, 3 - j * 0.4, 2.5 - j * 0.3, POISON[1]); q.p(bx - 1, by - 1, POISON[3])
        im = on(im, outline_same(q.im, POISON[0]))
    return im


@builder('serpent')
def make_serpent():
    S = serpent_frame
    save_boss('serpent', 'idle', [S(hy=30 + (0, -1, -2, -1, 0)[i], hx=84 + (0, 1, 1, 0, -1)[i], coil_ph=i * 0.03, collar=0.4 + (0, 0.05, 0.1, 0.05, 0)[i]) for i in range(5)])
    save_boss('serpent', 'attack', [S(hx=78, hy=26, mouth=0.3), S(hx=72, hy=22, mouth=0.7, collar=0.6), S(hx=86, hy=44, mouth=1.0, collar=0.5),
                                    S(hx=88, hy=66, mouth=1.0, collar=0.4), S(hx=86, hy=48, mouth=0.5), S(hx=82, hy=32, mouth=0.1)])
    save_boss('serpent', 'cast', [S(collar=0.6, mouth=0.3), S(collar=0.9, hx=80, hy=26, mouth=0.6), S(collar=1.0, hx=80, hy=26, mouth=1.0, spit=1),
                                  S(collar=1.0, hx=82, hy=28, mouth=1.0, spit=3), S(collar=0.9, hx=84, hy=30, mouth=0.6, spit=2), S(collar=0.6, mouth=0.2)])
    save_boss('serpent', 'hurt', [flash(S(hx=78, hy=26, mouth=1.0, eyes=0, collar=0.9), WHITE), S(hx=80, hy=28, mouth=0.6, collar=0.7), S(hx=82, hy=29)])
    save_boss('serpent', 'death', [flash(S(hx=78, hy=24, mouth=1.0, eyes=0, collar=1.0), WHITE), S(hx=80, mouth=1.0, eyes=0, collar=0.8, sink=0.15),
                                   S(mouth=0.8, eyes=0, collar=0.5, sink=0.35), S(mouth=0.5, eyes=0, collar=0.3, sink=0.6), S(mouth=0.3, eyes=0, collar=0.1, sink=0.8),
                                   S(mouth=0.2, eyes=0, collar=0.0, sink=0.95), S(mouth=0.2, eyes=0, collar=0.0, sink=1.0)])


# ================================================================== PROPS
def knifewheel(k):
    """The knife thrower's wheel: a red and white spoked wheel on a stand with a painted target, knives stuck in the rim;
    k = turned by a quarter step (2 frames, it spins)."""
    p = Pic(52, 64)
    cx, cy, R_ = 26, 26, 23
    p.poly([(cx - 4, cy), (cx + 4, cy), (cx + 9, 63), (cx - 9, 63)], WD2); p.r(cx - 14, 60, cx + 14, 63, WD1)
    ell(p, cx, cy, R_, R_, WD1)
    for j in range(8):
        a0 = j / 8 * TAU + k * TAU / 16
        a1 = a0 + TAU / 8
        p.poly([(cx, cy)] + [(cx + math.cos(a0 + (a1 - a0) * t) * (R_ - 2), cy + math.sin(a0 + (a1 - a0) * t) * (R_ - 2)) for t in np.linspace(0, 1, 5)],
               TR[2] if j % 2 else TW[2])
    for r_, c in ((12, TW[3]), (8, TR[2]), (4, TW[3]), (2, CR[3])):
        ell(p, cx, cy, r_, r_, c)
    p.arc(cx - R_, cy - R_, cx + R_, cy + R_, 0, 360, AU2, 2)
    for j in range(4):
        a = j / 4 * TAU + 0.4 + k * TAU / 16
        x, y = cx + math.cos(a) * (R_ - 4), cy + math.sin(a) * (R_ - 4)
        knife(p, x, y, a + math.pi, 7)
    ell(p, cx, cy, 2, 2, I2)
    return outline_same(p.im)


def prizewheel(k):
    """The wheel of fortune: a big coloured wheel with numbered wedges, gold rim with bulbs and a pointer on top, on a
    painted stand; k = spun (the wedges turned)."""
    p = Pic(50, 64)
    cx, cy, R_ = 25, 25, 21
    p.r(cx - 3, cy, cx + 3, 60, WD2); p.poly([(cx - 14, 63), (cx - 10, 56), (cx + 10, 56), (cx + 14, 63)], CR[1])
    cols = [CR[2], CY[2], CB[2], CG[2], CP[2], (230, 120, 30)]
    for j in range(12):
        a0 = j / 12 * TAU + k * TAU / 24
        a1 = a0 + TAU / 12
        p.poly([(cx, cy)] + [(cx + math.cos(a0 + (a1 - a0) * t) * R_, cy + math.sin(a0 + (a1 - a0) * t) * R_) for t in np.linspace(0, 1, 4)], cols[j % 6])
        am = (a0 + a1) / 2
        p.p(cx + math.cos(am) * (R_ - 5), cy + math.sin(am) * (R_ - 5), WHITE)
    p.arc(cx - R_ - 1, cy - R_ - 1, cx + R_ + 1, cy + R_ + 1, 0, 360, AU2, 2)
    for j in range(12):
        a = j / 12 * TAU
        p.p(cx + math.cos(a) * (R_ + 1), cy + math.sin(a) * (R_ + 1), (255, 240, 170) if (j + k) % 2 else AU3)
    ell(p, cx, cy, 3, 3, AU2); p.p(cx - 1, cy - 1, AU4)
    p.poly([(cx - 3, 0), (cx + 3, 0), (cx, 6)], (230, 226, 210))
    return outline_same(p.im)


def balloons(k):
    """A cluster of five circus balloons tied to a sandbag (k bobs them)."""
    p = Pic(36, 64)
    cols = [CR[3], CY[3], CB[3], CG[3], CP[3]]
    pos = [(10, 12), (24, 10), (17, 20), (7, 27), (27, 25)]
    for j, ((x, y), c) in enumerate(zip(pos, cols)):
        y += (k if j % 2 else -k)
        p.lines([(x, y + 6), (17 + (x - 17) * 0.3, 44), (18, 56)], (200, 196, 180))
        ell(p, x, y, 6, 7, dark(c, 0.6)); ell(p, x - 0.5, y - 0.5, 5, 6, c); ell(p, x - 2, y - 3, 1.5, 2, (255, 255, 240))
        p.poly([(x - 1, y + 7), (x + 1, y + 7), (x, y + 8)], dark(c, 0.6))
    p.e(10, 54, 26, 63, (110, 90, 60)); p.l(12, 56, 24, 56, (150, 130, 90))
    return outline_same(p.im)


def marquee(k):
    """A circus marquee sign on two posts: a red board framed by light bulbs (k = which bulbs are lit, 2 frames)
    with a gold star in the middle and painted stripes."""
    p = Pic(56, 48)
    for x in (4, 50):
        p.r(x - 1, 20, x + 1, 47, WD2)
    p.r(1, 1, 54, 28, CR[1]); p.r(3, 3, 52, 26, CR[2])
    for x in range(8, 50, 8):
        p.l(x, 6, x - 4, 23, CR[3])
    star5(p, 27.5, 14, 9, AU2); star5(p, 27.5, 14, 5, AU3)
    for i, x in enumerate(range(3, 54, 5)):
        for y in (1, 28):
            lit = (i + (y > 1) + k) % 2
            ell(p, x, y, 1.5, 1.5, (255, 236, 150) if lit else (110, 90, 50))
            if lit:
                p.p(x, y, WHITE)
    for i, y in enumerate(range(6, 26, 5)):
        for x in (1, 54):
            lit = (i + k) % 2
            ell(p, x, y, 1.5, 1.5, (255, 236, 150) if lit else (110, 90, 50))
    return outline_same(p.im)


def goldidol(k):
    """A stone altar with a golden idol (a squat seated figure with a jade-eyed mask); k = 1: the idol is gone, only a
    dusty outline and a sandbag-sized gap."""
    p = Pic(36, 52)
    p.r(2, 30, 33, 51, STN[2]); p.r(4, 32, 31, 49, STN[3]); p.l(2, 30, 33, 30, STN[4])
    p.r(0, 28, 35, 31, STN[1])
    for x in range(6, 31, 6):
        p.r(x, 38, x + 3, 41, STN[1])
    ell(p, 17.5, 40, 4, 3, MOSS[2])
    if k == 0:
        p.r(9, 22, 26, 28, AU1); p.r(10, 10, 25, 23, AU2); p.r(11, 11, 17, 22, AU3)
        p.r(7, 2, 28, 12, AU2); p.r(8, 3, 14, 11, AU3); p.l(7, 2, 28, 2, AU4)
        p.r(11, 5, 14, 7, JADE[2]); p.r(21, 5, 24, 7, JADE[2])
        p.l(12, 9, 23, 9, AU0)
        sparkles(p, 4, 2001, (4, 0, 32, 26))
    else:
        p.r(9, 26, 26, 28, STN[1]); dust(p, 8, 2002, (8, 22, 28, 28), (STN[3], STN[4], AU1))
    return outline_same(p.im)


def dartidol(k):
    """A carved stone head on a pillar with a gaping mouth - the dart trap; k = 1: a puff and a dart leaving the mouth."""
    p = Pic(40, 56)
    p.r(10, 26, 29, 55, STN[2]); p.r(12, 28, 27, 53, STN[3])
    for y in range(32, 54, 6):
        p.l(10, y, 29, y, STN[1])
    p.r(5, 2, 34, 27, STN[2]); p.r(7, 4, 27, 25, STN[3]); p.r(3, 0, 36, 4, STN[1])
    p.r(9, 8, 15, 12, STN[0]); p.r(22, 8, 28, 12, STN[0]); p.p(11, 10, (200, 40, 40)); p.p(24, 10, (200, 40, 40))
    p.r(13, 16, 26, 22, (12, 10, 8)); p.l(13, 16, 26, 16, STN[4])
    for x in range(14, 26, 3):
        p.p(x, 17, (220, 214, 190))
    ell(p, 6, 20, 2, 3, MOSS[2]); ell(p, 32, 14, 2, 2, MOSS[1])
    if k:
        puff(p, 22, 19, 2.5, ((120, 120, 110), (170, 170, 160), (210, 210, 200), WHITE))
        dart(p, 28, 19, 0, 8)
    return outline_same(p.im)


def poisonflower(k):
    """A giant poison flower: broad leaves, a fat stem and a purple-spotted bloom; 0 = closed bud, 1 = open, a cloud of
    green spores puffing out."""
    p = Pic(40, 52)
    p.l(20, 51, 20, 22, JG[2], 3)
    leaf(p, 19, 48, math.pi + 0.5, 15, 4, JG[1:]); leaf(p, 21, 46, -0.5, 15, 4, JG[1:]); leaf(p, 20, 40, -0.9, 11, 3, JG[1:])
    if k == 0:
        ell(p, 20, 18, 7, 9, CP[1]); ell(p, 19, 17, 5, 7, CP[2])
        for x in (17, 22):
            p.l(x, 10, x - 1 + (x > 20) * 2, 26, CP[0])
        p.ps([(18, 14), (22, 19), (17, 21)], (200, 230, 80))
    else:
        for j in range(5):
            a = -math.pi / 2 + (j - 2) * 0.62
            ex, ey = 20 + math.cos(a) * 14, 20 + math.sin(a) * 11
            p.poly([(20, 22), (20 + math.cos(a - 0.3) * 8, 22 + math.sin(a - 0.3) * 8), (ex, ey), (20 + math.cos(a + 0.3) * 8, 22 + math.sin(a + 0.3) * 8)], CP[2])
            p.p(20 + math.cos(a) * 9, 22 + math.sin(a) * 8, (220, 240, 90))
        ell(p, 20, 21, 4, 3, (200, 180, 40)); p.ps([(19, 20), (21, 21)], (140, 110, 20))
        q = Pic(40, 52)
        for j, (x, y, r) in enumerate(((12, 8, 3), (20, 4, 3.5), (28, 9, 3), (16, 2, 2))):
            puff(q, x, y, r, (POISON[0], POISON[1], POISON[2], POISON[3]))
        return on(outline_same(p.im), outline_same(q.im, POISON[0]))
    return outline_same(p.im)


def tikitorch(k):
    """A tiki torch: a carved bamboo pole with a grinning tiki face, a woven cup and a flickering fire (2 frames)."""
    p = Pic(20, 64)
    cx = 10
    p.r(cx - 2, 24, cx + 2, 63, (150, 120, 60))
    for y in range(30, 63, 7):
        p.l(cx - 2, y, cx + 2, y, (100, 76, 36))
    p.r(cx - 4, 34, cx + 4, 46, WD2); p.r(cx - 3, 36, cx - 1, 38, BLK[0]); p.r(cx + 1, 36, cx + 3, 38, BLK[0])
    p.r(cx - 3, 41, cx + 3, 43, (230, 220, 190)); p.l(cx - 3, 42, cx + 3, 42, BLK[0])
    p.poly([(cx - 6, 16), (cx + 6, 16), (cx + 3, 25), (cx - 3, 25)], (120, 90, 40))
    for y in (18, 21, 24):
        p.l(cx - 5 + (y - 16) * 0.3, y, cx + 5 - (y - 16) * 0.3, y, (170, 136, 70))
    flame(p, cx + (0.5 if k else -0.5), 16, 13 + k * 2, (1.5 if k else -1.5), 2.2)
    im = outline_same(p.im)
    q = Pic(20, 64)
    halo(q, cx, 8, 7 + k, ((255, 210, 110), (255, 170, 60)), 8, 2 + k)
    return on(im, q.im)


@builder('props')
def make_props():
    save_prop('knifewheel', [knifewheel(k) for k in range(2)])
    save_prop('prizewheel', [prizewheel(k) for k in range(2)])
    save_prop('balloons', [balloons(k) for k in range(2)])
    save_prop('marquee', [marquee(k) for k in range(2)])
    save_prop('goldidol', [goldidol(k) for k in range(2)])
    save_prop('dartidol', [dartidol(k) for k in range(2)])
    save_prop('poisonflower', [poisonflower(k) for k in range(2)])
    save_prop('tikitorch', [tikitorch(k) for k in range(2)])


# ================================================================== ITEMS, PARTICLES AND ICONS
@builder('items')
def make_items():
    p = Pic(22, 18)                                                           # a box of juggling pins (ammo)
    p.r(1, 7, 20, 17, CR[2]); p.l(1, 7, 20, 7, CR[3]); p.r(1, 11, 20, 12, CY[2])
    for x in range(3, 20, 4):
        p.p(x, 14, CY[3])
    for j, (x, a) in enumerate(((6, -1.9), (11, -1.6), (16, -1.3))):
        pin(p, x, 5, a, 0.9)
    save(hard(outline_same(p.im)), G_OUT + 'item_pinbox.png')
    p = Pic(14, 22)                                                           # a quiver of poison darts
    p.poly([(3, 6), (11, 6), (10, 21), (4, 21)], (110, 80, 40)); p.l(3, 6, 11, 6, (160, 120, 60))
    for y in (10, 15):
        p.l(3, y, 11, y, (70, 50, 24))
    p.l(5, 12, 9, 12, FEA['r'][1]); p.p(7, 18, POISON[2])
    for x in (5, 7, 9):
        p.l(x, 1, x, 6, (200, 190, 150)); p.ps([(x - 1, 1), (x + 1, 1)], FEA['r'][1] if x != 7 else FEA['y'][1])
    save(hard(outline_same(p.im)), G_OUT + 'item_dartquiver.png')
    p = Pic(40, 22)                                                           # the pin thrower's pickup: three pins in a fan
    for x, y, a in ((9, 12, -2.2), (20, 11, -1.57), (31, 12, -0.95)):
        pin(p, x, y, a, 1.5)
    save(hard(outline_same(p.im)), G_OUT + 'pick_pinthrower.png')
    p = Pic(56, 12)                                                           # the blowgun's pickup, lying sideways
    p.r(1, 5, 54, 7, (150, 120, 60)); p.l(1, 5, 54, 5, (200, 170, 100))
    for x in (6, 18, 30, 42):
        p.l(x, 5, x, 7, (90, 66, 30))
    p.r(0, 4, 4, 8, (110, 80, 40)); p.r(51, 4, 54, 8, (110, 80, 40))
    for x in (10, 24):
        p.r(x, 4, x + 2, 8, FEA['r'][1])
    p.lines([(12, 8), (14, 11), (17, 10)], FEA['g'][1])
    dart(p, 40, 2, 0, 7)
    save(hard(outline_same(p.im)), G_OUT + 'pick_blowgun.png')


@builder('particles')
def make_particles():
    cols = [CR[3], CY[3], CB[3], CG[3], CP[3], (255, 150, 60)]
    fr = []                                                                   # confetti (3 frames 8x8: scattered flakes turning)
    for k in range(3):
        p = Pic(8, 8)
        r2 = random.Random(2100 + k)
        for j in range(5):
            x, y = r2.randrange(0, 7), r2.randrange(0, 7)
            c = cols[(j + k) % 6]
            if (j + k) % 2:
                p.r(x, y, x + 1, y, c)
            else:
                p.r(x, y, x, y + 1, c)
        fr.append(p.im)
    save(cells(fr, 8, 8), G_OUT + 'part_confetti.png', 3)
    fr = []                                                                   # a spinning juggling pin (2 frames 10x10)
    for k in range(2):
        p = Pic(10, 10)
        pin(p, 4.5, 4.5, -0.8 + k * math.pi / 2, 0.9)
        fr.append(outline_same(p.im))
    save(cells(fr, 10, 10), G_OUT + 'part_pin.png', 2)
    p = Pic(10, 3)                                                            # a poison dart (1 frame, 10x3, pointing right like part_knife)
    p.l(1, 1, 8, 1, (200, 190, 150)); p.p(9, 1, POISON[2]); p.ps([(0, 0), (0, 2), (1, 0), (1, 2)], FEA['r'][1])
    save(p.im, G_OUT + 'part_dart.png')
    fr = []                                                                   # a jungle leaf (2 frames 8x8)
    for k in range(2):
        p = Pic(8, 8)
        leaf(p, 1, 6 - k * 2, -0.7 + k * 0.7, 7, 2, JG[1:])
        fr.append(p.im)
    save(cells(fr, 8, 8), G_OUT + 'part_leaf2.png', 2)


@builder('icons')
def make_icons():
    p = Pic(8, 8)                                                             # HUD: in the spotlight (a lamp and a cone of light)
    p.bitmap(0, 0, ["..##....", ".####...", "..##....", ".#..#...", "#.##.#..", ".####.#.", "######.#", "#.#.#.#."], {'#': WHITE})
    save(p.im, G_OUT + 'icon_spotlight.png')
    p = Pic(8, 8)                                                             # HUD: poisoned by a dart (a dart and a drop)
    p.bitmap(0, 0, ["#.......", ".#......", "..#.....", "...#..#.", "....###.", "....###.", "...#####", "....###."], {'#': WHITE})
    save(p.im, G_OUT + 'icon_poison2.png')


# ================================================================== CONTACT SHEET AND CHECKS
NEW_WEAPONS = ('pinthrower', 'blowgun')


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
    """Style rules: every pixel fully opaque or fully transparent (textures are opaque), strips divide evenly into their
    frames, nothing below the feet row of enemy / boss cells, figures not clipped by the cell edges; textures 64x128 /
    64x64 with a mean brightness of 40-115 (the red and white tent must not glare)."""
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
    out.save(SCR + 'v18_tiles.png')


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
