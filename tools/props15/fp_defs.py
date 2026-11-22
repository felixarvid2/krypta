# Version 18: builds the static-defs.json entries of tools/weapon-frames for the pin thrower (pinthrower) and the blowgun
# (blowgun).
#   python3 tools/props15/fp_defs.py out.json   (then splice its two keys in at the end of static-defs.json, json indent 1)
#
# pinthrower: a juggling pin (white body, red bands and a red knob, `name: pin`) held by the neck in the gloved hand with
#   the dark-blue sleeve of the boomerang (`model: none`, base [1,0.1,0.1], held in the melee mode, the hand parts are the
#   boomerang's). `fire` is the throw: the arm takes aim, swings forward, the pin leaves the hand (hidden) and a new pin
#   comes up from below into the hand; pack.py draws the three pins spinning away towards the sight (PINFLY).
# blowgun: a long bamboo blowgun (`model: none`, base [1,0.1,0.1] as the chain cannon, so one model unit = its length):
#   nodes, red thread bindings, a carved wooden mouthpiece at the near end, a feather tassel and a bone ring at the far end
#   (`name: muzzle`). `fire` is three small frames (a puff, the tube kicks up a little); pack.py draws the breath and the
#   dart flying towards the sight (DARTFLY). `reload` (extra) tips the tube and slides a new dart (`name: dart`, hidden
#   except in these frames) down into the mouthpiece.
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
defs = json.load(open(os.path.join(HERE, '..', 'weapon-frames', 'static-defs.json')))
hand = [d for d in defs['boomerang']['parts'] if d.get('name') == 'hand']          # the boomerang's gloved hand and sleeve

WH, WH2, RD, RD2 = "#f2ece0", "#d8d0c0", "#c42820", "#e85040"
pin = [
    {"prim": "sphere", "size": [1], "seg": 10, "scale": 0.07, "pos": [0, -0.01, 0], "color": RD, "name": "pin"},             # the knob below the hand
    {"prim": "cyl", "size": [0.55, 0.75, 4], "seg": 10, "scale": 0.28, "pos": [0, 0.14, 0], "color": WH2, "name": "pin"},     # the neck
    {"prim": "torus", "size": [1, 0.25], "rot": [90, 0, 0], "seg": 12, "scale": 0.085, "pos": [0, 0.2, 0], "color": RD2, "name": "pin"},
    {"prim": "sphere", "size": [1], "seg": 14, "stretch": [1, 1.9, 1], "scale": 0.32, "pos": [0, 0.44, 0], "color": WH, "name": "pin"},   # the body
    {"prim": "torus", "size": [1, 0.16], "rot": [90, 0, 0], "seg": 14, "scale": 0.18, "pos": [0, 0.40, 0], "color": RD, "name": "pin"},
    {"prim": "torus", "size": [1, 0.16], "rot": [90, 0, 0], "seg": 14, "scale": 0.155, "pos": [0, 0.51, 0], "color": RD, "name": "pin"},
]
HIDE = {"pin": {"hide": True}}
pinthrower = {"model": "none", "base": [1, 0.1, 0.1], "dur": 0.42, "sideYaw": 90, "sidePose": {"hand": {"hide": True}}, "nozzle": "pin",
              "parts": pin + hand,
              "melee": {"grip": 0.42, "idle": {"hand": [1.6, -0.5, 0.5], "ang": [-10, 0, 0]},
                        "fire": [{"hand": [1.5, -0.42, 0.66], "ang": [-40, 0, 10]},
                                 {"hand": [1.62, -0.36, 0.42], "ang": [10, 0, -6]},
                                 {"hand": [1.75, -0.42, 0.2], "ang": [36, 0, -10], "partPose": HIDE},
                                 {"hand": [1.7, -0.58, 0.3], "ang": [18, 0, -4], "partPose": HIDE},
                                 {"hand": [1.62, -0.54, 0.46], "ang": [-4, 0, 0], "partPose": {"pin": {"move": [0, -0.22, 0]}}}]}}

BAM, BAM2, BAM3, NODE, THR, WOOD, BONE = "#b89a50", "#d6bc70", "#8a7034", "#6e5626", "#b02a1c", "#5a3a20", "#e4dcc4"
bg = [
    {"prim": "cyl", "size": [1, 1, 30], "rot": [0, 0, -90], "seg": 12, "scale": 0.92, "pos": [0.02, 0, 0], "color": BAM},     # the bamboo tube
    {"prim": "cyl", "size": [1, 1, 30], "rot": [0, 0, -90], "seg": 12, "scale": 0.92, "pos": [0.02, 0.012, -0.006], "color": BAM2, "stretch": [1, 0.55, 0.55]},   # a light streak
]
for x in (-0.3, -0.08, 0.14, 0.34):                                                     # nodes
    bg.append({"prim": "cyl", "size": [1.25, 1.25, 1], "rot": [0, 0, -90], "seg": 12, "scale": 0.04, "pos": [x, 0, 0], "color": NODE})
for x in (-0.2, 0.25, 0.42):                                                            # red thread bindings
    bg.append({"prim": "cyl", "size": [1.15, 1.15, 2.2], "rot": [0, 0, -90], "seg": 12, "scale": 0.045, "pos": [x, 0, 0], "color": THR})
bg += [
    {"prim": "cyl", "size": [1.5, 1.1, 2.4], "rot": [0, 0, -90], "seg": 12, "scale": 0.09, "pos": [-0.46, 0, 0], "color": WOOD},   # mouthpiece
    {"prim": "torus", "size": [1, 0.3], "rot": [0, 90, 0], "seg": 12, "scale": 0.05, "pos": [0.49, 0, 0], "color": BONE, "name": "muzzle"},   # bone ring
    {"prim": "cyl", "size": [1, 1, 0.5], "rot": [0, 0, -90], "seg": 10, "scale": 0.03, "pos": [0.5, 0, 0], "color": "#1a120a", "name": "muzzle"},
    {"prim": "cyl", "size": [0.3, 0.3, 4], "seg": 6, "scale": 0.08, "pos": [0.42, -0.05, 0.0], "color": "#3a2a18"},           # tassel cord
    {"prim": "cone", "size": [0.5, 1.6], "rot": [180, 0, 0], "seg": 8, "scale": 0.06, "pos": [0.42, -0.1, 0], "color": "#2a8a3a"},   # feather tassel
    {"prim": "cone", "size": [0.4, 1.6], "rot": [180, 0, 20], "seg": 8, "scale": 0.05, "pos": [0.40, -0.1, 0.01], "color": "#d84a20"},
    {"prim": "cyl", "size": [0.25, 0.25, 12], "rot": [0, 0, -90], "seg": 6, "scale": 0.16, "pos": [-0.58, 0.12, 0], "color": "#d8cca8", "name": "dart", "hidden": True},   # a new dart
    {"prim": "cone", "size": [0.9, 1.4], "rot": [0, 0, 90], "seg": 8, "scale": 0.035, "pos": [-0.67, 0.12, 0], "color": THR, "name": "dart", "hidden": True},   # its fluff
]
SHOW = lambda m: {"dart": {"show": True, "move": m}}
blowgun = {"model": "none", "base": [1, 0.1, 0.1], "parts": bg, "nozzle": "muzzle", "nozzleFront": True, "cam": [0.5, 0.4, -0.35, 0.8, 1.0],
           "dur": 0.45, "pitch": 2, "back": 0.04,
           "fire": [{"kick": 0.35, "dy": 0.006}, {"kick": 0.55, "dy": 0.004}, {"kick": 0.25}],
           "extra": {"reload": [{"kick": 0.1, "roll": -10, "dy": -0.03, "partPose": SHOW([0, 0.08, 0])},
                                {"kick": 0.15, "roll": -16, "dy": -0.04, "partPose": SHOW([0.06, 0.0, 0])},
                                {"kick": 0.15, "roll": -16, "dy": -0.04, "partPose": SHOW([0.12, -0.12, 0])},
                                {"kick": 0.05, "roll": -6, "dy": -0.01}]},
           "durs": {"reload": 1.0}}

out = {"pinthrower": pinthrower, "blowgun": blowgun}
json.dump(out, open(sys.argv[1], 'w'), indent=1)
print('ok', [len(v["parts"]) for v in out.values()])
