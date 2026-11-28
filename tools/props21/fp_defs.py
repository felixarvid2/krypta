# Version 30: builds the weapon definitions of tools/weapon-frames for the sling (sling) and the glass gun (glassgun).
# Like versions 21-23 they live in their own file and are rendered with DEFS=:
#   python3 -B tools/props21/fp_defs.py /tmp/defs30.json
#   cd tools/weapon-frames && DEFS=/tmp/defs30.json node render-static.mjs fp sling,glassgun /tmp/xframes30
#   python3 pack.py /tmp/xframes30 <scratch-root>/ sling,glassgun   (a scratch copy of js/weapons.js; copy the two
#   unstyled fp_*.png to tools/props21/fp_orig/, add the two entries at the end of js/weapons.js by hand and run
#   pixelstyle.py from fp_orig/ into assets/gfx - sling with `--opts leather`, glassgun with `--opts leather,nowood`)
#
# sling: a plaited leather sling held up in the leather glove of tools/weapon-frames/glove_def.py, in the melee mode: two
#   cords (rows of beads named c1..c16 from the fist outwards) up to a cupped leather pouch (`name: pouch`, the "muzzle") with a grey stone
#   in it (`name: stone`). `fire` is the overhand cast (wound back, whipped forward; the stone hidden from the third frame,
#   pack.py draws it flying at the sight, SLINGSTONE); `charge` (melee.extra, four frames, 1.0 s) whirls the pouch round
#   over the hand: each cord bead is moved by its share of the pouch's offset round the circle.
# glassgun: a brass-bound glass gun - a short walnut stock, a brass barrel with three bands, a cold blue glass reservoir
#   globe on top with a glowing orange core (`name: globe`), and a flared brass bell muzzle ringed with glass teeth
#   (`name: muzzle`); an upright side grip on the left held by the glove. `fire` is four recoil frames (pack.py draws the
#   cone of glass shards at the sight, SHARDFAN); `reload` (extra) tips the gun and lowers a new globe into its seat.
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'weapon-frames'))
from glove_def import glove   # the round leather glove shared with versions 21-23

# ------------------------------------------------------------------ the sling
COR, COR2, POU, POU2, STN, STN2 = "#8a6a44", "#6a4e30", "#5a4430", "#7a5e40", "#80786c", "#a8a090"
F0, PO = (0.02, 0.11, 0.0), (0.08, 0.5, -0.24)          # where the cords leave the fist (x, y, z) and the pouch centre
NSEG = 16


sl = [{"prim": "torus", "size": [1, 0.3], "rot": [90, 0, 0], "seg": 10, "scale": 0.06, "pos": [0.02, 0.1, 0.0], "color": COR2}]   # the knot
for side in (-1, 1):                                                                     # each cord: a row of overlapping beads
    for j in range(NSEG):
        t = (j + 0.5) / NSEG
        q = [F0[i] + (PO[i] - F0[i]) * t for i in range(3)]
        sp = 0.022 * (0.5 + t) * side                                              # the two cords spread towards the pouch
        q[0] += sp * 0.6; q[1] -= sp * 0.3
        sl.append({"prim": "sphere", "size": [1], "seg": 6, "scale": 0.034, "pos": [round(v, 4) for v in q],
                   "color": COR if j % 2 else COR2, "name": f"c{j + 1}"})
sl += [
    {"prim": "sphere", "size": [1], "seg": 12, "stretch": [1.0, 0.55, 1.0], "scale": 0.16, "pos": list(PO), "color": POU, "name": "pouch"},
    {"prim": "torus", "size": [1, 0.18], "rot": [90, 0, 0], "seg": 12, "scale": 0.16, "pos": [PO[0], PO[1] + 0.02, PO[2]], "color": POU2, "name": "pouch"},
    {"prim": "sphere", "size": [1], "seg": 10, "scale": 0.11, "pos": [PO[0], PO[1] + 0.045, PO[2]], "color": STN, "name": "stone"},
    {"prim": "sphere", "size": [1], "seg": 6, "scale": 0.04, "pos": [PO[0] - 0.03, PO[1] + 0.08, PO[2] - 0.02], "color": STN2, "name": "stone"},
]
sl += glove(slen=0.16)
HS = {"stone": {"hide": True}}


def whirl(theta, r=0.2, c=(0.12, 0.4, -0.06)):
    """partPose for the pouch at angle theta on a circle over the fist (x forward, z right): the pouch and stone move by
    the whole offset, each cord segment by its share."""
    pos = (c[0] + math.cos(theta) * r, c[1] + math.sin(theta) * 0.05, c[2] + math.sin(theta) * r)
    d = tuple(pos[i] - PO[i] for i in range(3))
    pose = {"pouch": {"move": [round(v, 4) for v in d]}, "stone": {"move": [round(v, 4) for v in d]}}
    for j in range(NSEG):
        t = (j + 0.5) / NSEG
        pose[f"c{j + 1}"] = {"move": [round(v * t, 4) for v in d]}
    return pose


sling = {"model": "none", "base": [1, 0.1, 0.1], "dur": 0.5, "sideYaw": 90, "sidePose": {"hand": {"hide": True}}, "nozzle": "pouch",
         "parts": sl,
         "melee": {"grip": 0.3, "idle": {"hand": [1.15, -0.24, 0.42], "ang": [-6, 0, -8]},
                   "fire": [{"hand": [1.1, -0.2, 0.5], "ang": [18, 0, 28]},
                            {"hand": [1.15, -0.12, 0.42], "ang": [6, 0, 14]},
                            {"hand": [1.2, -0.1, 0.3], "ang": [-16, 0, -34], "partPose": HS},
                            {"hand": [1.18, -0.2, 0.22], "ang": [-34, 0, -54], "partPose": HS},
                            {"hand": [1.15, -0.24, 0.36], "ang": [-12, 0, -20], "partPose": HS}],
                   "extra": {"charge": [{"hand": [1.15, -0.3, 0.38], "ang": [-4, 0, -2], "partPose": whirl(th)}
                                        for th in (0.0, math.pi / 2, math.pi, math.pi * 1.5)]}},
         "durs": {"charge": 1.0}}

# ------------------------------------------------------------------ the glass gun
WD, WD2, BRA, BRA2, BRA3, IR, GL, GL2, GL3 = "#5a3620", "#3e2414", "#8a6224", "#b88c3a", "#e0bc68", "#3a3c44", "#2c6488", "#5aa8d0", "#b4e4f4"
gg = [
    {"prim": "box", "size": [0.5, 0.14, 0.13], "rot": [0, 0, 8], "scale": 0.5, "pos": [-0.52, -0.08, 0], "color": WD},          # stock
    {"prim": "box", "size": [0.5, 0.03, 0.132], "rot": [0, 0, 8], "scale": 0.5, "pos": [-0.52, -0.02, 0], "color": BRA},
    {"prim": "box", "size": [0.12, 0.27, 0.11], "rot": [0, 0, -16], "scale": 0.27, "pos": [-0.24, -0.18, 0], "color": WD2},      # grip
    {"prim": "torus", "size": [1, 0.15], "rot": [90, 0, 0], "seg": 10, "scale": 0.1, "pos": [-0.13, -0.13, 0], "color": BRA},
    {"prim": "cyl", "size": [1, 1, 4.6], "rot": [0, 0, -90], "seg": 12, "scale": 0.74, "pos": [0.12, 0.05, 0], "color": BRA, "name": "barrel"},
    {"prim": "sphere", "size": [1], "seg": 10, "scale": 0.3, "pos": [-0.22, 0.05, 0], "color": BRA, "name": "barrel"},
    {"prim": "cyl", "size": [0.5, 0.5, 1], "seg": 8, "scale": 0.1, "pos": [-0.06, 0.15, 0], "color": IR},                        # globe seat
    {"prim": "torus", "size": [1, 0.2], "rot": [90, 0, 0], "seg": 12, "scale": 0.13, "pos": [-0.06, 0.18, 0], "color": BRA2},
    {"prim": "sphere", "size": [1], "seg": 14, "scale": 0.26, "pos": [-0.06, 0.27, 0], "color": GL, "name": "globe"},              # the glass globe
    {"prim": "sphere", "size": [1], "seg": 10, "scale": 0.13, "pos": [-0.15, 0.31, -0.02], "color": "#ff9a3c", "emissive": "#c04400", "name": "globe"},
    {"prim": "sphere", "size": [1], "seg": 6, "scale": 0.05, "pos": [-0.11, 0.35, -0.08], "color": GL3, "emissive": "#3a6a80", "name": "globe"},
    {"prim": "cone", "size": [1, 1.4], "rot": [0, 0, 90], "seg": 14, "scale": 0.36, "pos": [0.62, 0.05, 0], "color": BRA2, "name": "muzzle"},   # bell
    {"prim": "torus", "size": [1, 0.1], "rot": [0, 90, 0], "seg": 16, "scale": 0.36, "pos": [0.74, 0.05, 0], "color": BRA3, "name": "muzzle"},
    {"prim": "cyl", "size": [1, 1, 0.3], "rot": [0, 0, -90], "seg": 14, "scale": 0.24, "pos": [0.73, 0.05, 0], "color": "#0c1418"},
]
for j in range(8):                                                                        # glass teeth round the bell
    a = j / 8 * math.tau
    gg.append({"prim": "cone", "size": [0.3, 1.2], "rot": [0, 0, -90], "seg": 4, "scale": 0.08,
               "pos": [0.78, round(0.05 + math.cos(a) * 0.17, 4), round(math.sin(a) * 0.17, 4)], "color": GL2 if j % 2 else GL3, "name": "muzzle"})
for x in (-0.06, 0.18, 0.4):                                                              # brass bands
    gg.append({"prim": "cyl", "size": [1.12, 1.12, 0.14], "rot": [0, 0, -90], "seg": 12, "scale": 0.3, "pos": [x, 0.05, 0], "color": BRA3, "name": "barrel"})
gg += [
    {"prim": "cyl", "size": [1, 1, 5], "seg": 8, "scale": 0.24, "pos": [0.16, 0.0, -0.3], "color": WD, "name": "grip2"},       # side grip
    {"prim": "box", "size": [0.06, 0.06, 0.16], "scale": 0.16, "pos": [0.16, 0.04, -0.22], "color": BRA},
    {"prim": "box", "size": [0.06, 0.06, 0.16], "scale": 0.16, "pos": [0.16, -0.08, -0.22], "color": BRA},
]
gg += glove((0.16, 0.0, -0.3), "hand", sleeve=True)
GLOBE = lambda dy, dx=0.0: {"globe": {"move": [dx, dy, 0]}}
HG = {"globe": {"hide": True}}
glassgun = {"model": "none", "base": [1, 0.1, 0.1], "parts": gg, "nozzle": "muzzle", "nozzleFront": True, "cam": [0.6, 0.42, -0.4, 0.8, 1.0],
            "dur": 0.55, "pitch": 7, "back": 0.12,
            "fire": [{"kick": 0.8, "dy": 0.006}, {"kick": 1.0, "dy": 0.004}, {"kick": 0.6, "dz": 0.003}, {"kick": 0.25}],
            "extra": {"reload": [{"kick": 0.2, "roll": -12, "dy": -0.03, "partPose": HG},
                                 {"kick": 0.25, "roll": -16, "dy": -0.04, "partPose": GLOBE(0.36, -0.02)},
                                 {"kick": 0.25, "roll": -16, "dy": -0.04, "partPose": GLOBE(0.14, -0.01)},
                                 {"kick": 0.12, "roll": -8, "dy": -0.02}]},
            "durs": {"reload": 1.0}}

out = {"sling": sling, "glassgun": glassgun}
json.dump(out, open(sys.argv[1], 'w'), indent=1)
print('ok', [len(v["parts"]) for v in out.values()])
