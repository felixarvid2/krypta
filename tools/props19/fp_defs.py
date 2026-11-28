# Version 22: builds the weapon definitions of tools/weapon-frames for the trident (trident) and the brimstone mortar
# (brimstone). Like version 21 they live in their own file and are rendered with DEFS=:
#   python3 -B tools/props19/fp_defs.py /tmp/defs22.json
#   cd tools/weapon-frames && DEFS=/tmp/defs22.json node render-static.mjs fp trident,brimstone /tmp/xframes22
#   python3 pack.py /tmp/xframes22 <scratch-root>/ trident,brimstone   (a scratch copy of js/weapons.js; copy the two
#   unstyled fp_*.png to tools/props19/fp_orig/, run pixelstyle.py from there into assets/gfx and add the two entries at the
#   end of js/weapons.js by hand)
#
# trident: a bronze-headed trident (`model: none`, base [1,0.1,0.1]) in a leather glove (knuckles, fingers, thumb, cuff
#   and a short sleeve - the glove of the v21 morning star), in the melee mode: a dark ash shaft with bronze bands and a
#   bronze butt cap, a bronze collar, a cross bar and three barbed iron prongs, the middle one longer (`name: head`, the
#   "muzzle"). `fire` is the long thrust forward (four frames); `throw` (melee.extra) takes aim, hurls it and the hand comes
#   back empty (the trident parts, `name: tri` / `head`, hidden); `empty` is the bare fist while it flies.
# brimstone: a squat black-iron mortar on an oak stock (gun mode) with bronze hoops, a flared mouth with a glowing ball of
#   burning brimstone in it (`name: ball`), a smouldering fuse at the breech and an upright carrying grip on the left held
#   by the same glove. `fire` hides the ball over five heavy recoil frames (pack.py draws the burning ball flying away in an
#   arc and a dithered sulphur-yellow smoke, BRIMFLY / BLUNDERSMOKE); `reload` (extra) tips the mortar and lowers a new ball
#   into the mouth.
import json
import math
import sys

import os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'weapon-frames'))
from glove_def import glove   # fas 3: den nya, rundare läderhandsken (delas med version 21)


# ------------------------------------------------------------------ the trident
SHAFT, BRONZE, BRONZE2, IRON, IRON2, IRON3 = "#4e3220", "#a87a36", "#d8a850", "#3e4048", "#5e626c", "#a4a8b2"
tr = [
    {"prim": "cyl", "size": [1, 1, 34], "seg": 8, "scale": 1.2, "pos": [0, 0.12, 0], "color": SHAFT, "name": "tri"},              # the shaft (fas 3: thicker)
    {"prim": "cyl", "size": [1.4, 1.2, 1.6], "seg": 8, "scale": 0.07, "pos": [0, -0.49, 0], "color": BRONZE, "name": "tri"},       # butt cap
]
for y in (-0.3, 0.3, 0.55):
    tr.append({"prim": "torus", "size": [1, 0.3], "rot": [90, 0, 0], "seg": 10, "scale": 0.07, "pos": [0, y, 0], "color": BRONZE, "name": "tri"})
# fas 3: a much heavier head - a bronze socket, a broad iron cross bar and three long, thick, bright iron prongs with big barbs
tr += [
    {"prim": "cyl", "size": [1.0, 1.5, 2.6], "seg": 8, "scale": 0.15, "pos": [0, 0.75, 0], "color": BRONZE, "name": "head"},       # socket
    {"prim": "torus", "size": [1, 0.3], "rot": [90, 0, 0], "seg": 10, "scale": 0.1, "pos": [0, 0.69, 0], "color": BRONZE2, "name": "head"},
    {"prim": "box", "size": [0.075, 0.075, 0.62], "scale": 0.62, "pos": [0, 0.84, 0], "color": IRON, "name": "head"},             # cross bar
    {"prim": "box", "size": [0.08, 0.022, 0.63], "scale": 0.63, "pos": [0, 0.88, 0], "color": IRON2, "name": "head"},
    {"prim": "sphere", "size": [1], "seg": 8, "scale": 0.1, "pos": [0, 0.84, 0], "color": BRONZE2, "name": "head"},                # rivet boss
]
for z, top in ((-0.28, 1.34), (0.0, 1.6), (0.28, 1.34)):                              # three prongs with barbed points
    base = 0.84
    tr.append({"prim": "box", "size": [0.07, top - base, 0.07], "rot": [0, 45, 0], "scale": round(top - base, 3), "pos": [0, round((top + base) / 2, 3), z], "color": IRON3, "name": "head"})
    tr.append({"prim": "cone", "size": [0.3, 1.0], "seg": 4, "scale": 0.36, "pos": [0, round(top + 0.15, 3), z], "color": "#e4e8ee", "name": "head"})
    for s in (-1, 1):                                                                    # barbs pointing back
        tr.append({"prim": "cone", "size": [0.34, 1.0], "seg": 4, "rot": [180 + s * 32, 0, 0], "scale": 0.15,
                   "pos": [0, round(top - 0.05, 3), round(z + s * 0.075, 3)], "color": IRON3, "name": "head"})
tr += glove(slen=0.16)
HIDE = {"tri": {"hide": True}, "head": {"hide": True}}
trident = {"model": "none", "base": [1, 0.1, 0.1], "dur": 0.42, "sideYaw": 90, "sidePose": {"hand": {"hide": True}}, "nozzle": "head", "nozzleFront": True,
           "parts": tr,
           "melee": {"grip": 0.3, "idle": {"hand": [0.5, -0.07, 0.19], "ang": [-8, 12, -54]},
                     "fire": [{"hand": [0.45, -0.08, 0.21], "ang": [-8, 12, -51]},
                              {"hand": [0.66, -0.1, 0.15], "ang": [-4, 8, -74]},
                              {"hand": [0.72, -0.09, 0.13], "ang": [-4, 8, -77]},
                              {"hand": [0.56, -0.08, 0.18], "ang": [-6, 10, -64]}],
                     "extra": {"throw": [{"hand": [0.44, -0.05, 0.3], "ang": [-15, 10, -48]},
                                         {"hand": [0.4, -0.01, 0.33], "ang": [-20, 10, -38]},
                                         {"hand": [0.66, -0.1, 0.16], "ang": [-5, 10, -76], "partPose": HIDE},
                                         {"hand": [0.52, -0.12, 0.22], "ang": [10, 10, -45], "partPose": HIDE}],
                               "empty": [{"hand": [0.48, -0.07, 0.21], "ang": [-6, 10, -30], "partPose": HIDE}]}},
           "durs": {"throw": 0.5, "empty": 0.5}}

# ------------------------------------------------------------------ the brimstone mortar
OAK, OAK2, OAK3, MIR, MIR2, MIR3 = "#6a4026", "#4e2c18", "#8a5634", "#26282c", "#3c3f46", "#6a6e78"
SUL, SUL2 = "#e8b820", "#fff080"
bm = [
    {"prim": "box", "size": [0.42, 0.15, 0.14], "rot": [0, 0, 8], "scale": 0.42, "pos": [-0.44, -0.08, 0], "color": OAK2},       # stock
    {"prim": "box", "size": [0.42, 0.03, 0.142], "rot": [0, 0, 8], "scale": 0.42, "pos": [-0.44, -0.01, 0], "color": OAK3},
    {"prim": "box", "size": [0.12, 0.28, 0.11], "rot": [0, 0, -16], "scale": 0.28, "pos": [-0.24, -0.18, 0], "color": "#3e2414"},  # pistol grip
    {"prim": "torus", "size": [1, 0.15], "rot": [90, 0, 0], "seg": 10, "scale": 0.1, "pos": [-0.13, -0.13, 0], "color": BRONZE},
    {"prim": "box", "size": [0.4, 0.1, 0.17], "scale": 0.4, "pos": [0.0, -0.08, 0], "color": OAK},                                # the bed
    {"prim": "cyl", "size": [1, 1.12, 4.2], "rot": [0, 0, -90], "seg": 10, "scale": 0.76, "pos": [0.16, 0.06, 0], "color": MIR, "name": "barrel"},   # the squat barrel
    {"prim": "sphere", "size": [1], "seg": 12, "scale": 0.4, "pos": [-0.14, 0.06, 0], "color": MIR2, "name": "barrel"},          # rounded breech
    {"prim": "cyl", "size": [1.45, 1.0, 0.7], "open": True, "rot": [0, 0, -90], "seg": 16, "scale": 0.5, "pos": [0.57, 0.06, 0], "color": MIR2, "name": "muzzle"},   # flared mouth
    {"prim": "torus", "size": [1, 0.14], "rot": [0, 90, 0], "seg": 18, "scale": 0.5, "pos": [0.62, 0.06, 0], "color": BRONZE2, "name": "muzzle"},
    {"prim": "cyl", "size": [1, 1, 0.3], "rot": [0, 0, -90], "seg": 14, "scale": 0.3, "pos": [0.57, 0.06, 0], "color": "#1a0c06"},
    {"prim": "cyl", "size": [0.5, 0.5, 1], "seg": 8, "scale": 0.06, "pos": [-0.12, 0.27, 0], "color": BRONZE2},                    # touch hole
    {"prim": "cone", "size": [0.5, 1.2], "seg": 6, "scale": 0.06, "pos": [-0.12, 0.33, 0], "color": "#ffb030", "emissive": "#c04000"},   # fuse flame
]
for x, r in ((0.0, 1.06), (0.36, 1.05)):                                    # bronze hoops
    bm.append({"prim": "cyl", "size": [r, r, 0.12], "rot": [0, 0, -90], "seg": 10, "scale": round(0.37 * r, 3), "pos": [x, 0.06, 0], "color": "#8a6428", "name": "barrel"})
for z in (-1, 1):                                                                        # dolphin lifting handles on top
    bm.append({"prim": "torus", "size": [1, 0.25], "rot": [0, 0, 0], "seg": 10, "scale": 0.09, "pos": [0.18, 0.26, z * 0.05], "color": BRONZE})
bm += [
    {"prim": "sphere", "size": [1], "seg": 12, "scale": 0.28, "pos": [0.7, 0.15, 0], "color": SUL, "emissive": "#904000", "name": "ball"},     # the burning brimstone
    {"prim": "sphere", "size": [1], "seg": 8, "scale": 0.1, "pos": [0.72, 0.22, -0.07], "color": SUL2, "emissive": "#c08000", "name": "ball"},
    {"prim": "cone", "size": [0.5, 1.3], "seg": 5, "rot": [12, 0, 10], "scale": 0.1, "pos": [0.69, 0.31, 0.03], "color": "#ff9020", "emissive": "#c03000", "name": "ball"},   # little flames
    {"prim": "cone", "size": [0.5, 1.3], "seg": 5, "rot": [-15, 0, -8], "scale": 0.08, "pos": [0.73, 0.29, -0.06], "color": "#ffc040", "emissive": "#c06000", "name": "ball"},
    {"prim": "cyl", "size": [1, 1, 5], "seg": 8, "scale": 0.24, "pos": [0.16, 0.02, -0.3], "color": OAK, "name": "grip2"},       # the upright side grip on the left
    {"prim": "box", "size": [0.06, 0.06, 0.16], "scale": 0.16, "pos": [0.16, 0.06, -0.22], "color": BRONZE},
    {"prim": "box", "size": [0.06, 0.06, 0.16], "scale": 0.16, "pos": [0.16, -0.06, -0.22], "color": BRONZE},
]
bm += glove((0.16, 0.02, -0.3), "hand", sleeve=True)
BALL = lambda dy, dx=0.0: {"ball": {"move": [dx, dy, 0]}}
HB = {"ball": {"hide": True}}
brimstone = {"model": "none", "base": [1, 0.1, 0.1], "parts": bm, "nozzle": "muzzle", "nozzleFront": True, "cam": [0.6, 0.42, -0.4, 0.8, 1.0],
             "dur": 0.8, "pitch": 7, "back": 0.12,
             "fire": [{"kick": 0.8, "dy": 0.008, "partPose": HB}, {"kick": 1.2, "dy": 0.006, "partPose": HB}, {"kick": 0.9, "dz": 0.004, "partPose": HB},
                      {"kick": 0.5, "partPose": HB}, {"kick": 0.18, "partPose": HB}],
             "extra": {"reload": [{"kick": 0.2, "roll": -12, "dy": -0.03, "partPose": HB},
                                  {"kick": 0.25, "roll": -18, "dy": -0.04, "partPose": BALL(0.34, -0.04)},
                                  {"kick": 0.25, "roll": -18, "dy": -0.04, "partPose": BALL(0.16, -0.02)},
                                  {"kick": 0.12, "roll": -8, "dy": -0.02}]},
             "durs": {"reload": 1.1}}

out = {"trident": trident, "brimstone": brimstone}
json.dump(out, open(sys.argv[1], 'w'), indent=1)
print('ok', [len(v["parts"]) for v in out.values()])
