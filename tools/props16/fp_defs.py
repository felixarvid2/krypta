# Version 19: builds the static-defs.json entries of tools/weapon-frames for the pickaxe (pickaxe) and the star lance
# (starlance).
#   python3 tools/props16/fp_defs.py out.json   (then splice its two keys in at the end of static-defs.json, json indent 1)
#
# pickaxe: a miner's pickaxe (`model: none`, base [1,0.1,0.1]) held in the gloved hand with the dark-blue sleeve of the
#   boomerang, in the melee mode: an ash handle with a leather wrap and an iron head across its top - two points bent
#   down a little (`name: pick`). `fire` is the heavy blow: the arm heaves the pick up and back, swings it forward and
#   down, the point bites (pack.py draws the spark and rock chips there, PICKHIT) and the arm comes back up.
# starlance: the star lance (`model: none`, base [1,0.1,0.1] as the blowgun): a dark wooden grip with a brass pommel, a
#   brass shaft with rings, a crown of four brass prongs and a five-pointed crystal star at the tip (`name: star`, the
#   muzzle). `charge` (extra, four frames) is the held trigger: the lance draws back a little and the star swells and
#   glows brighter frame by frame (`partPose emissive`, `scale`; pack.py adds a growing ring of light, LANCEGLOW) - the
#   last frame is the one held at full charge. `fire` is three frames: the release kicks the lance and pack.py draws a
#   star flash at the tip (LANCEFLASH; the beam itself is drawn by the game, as the prism's). `reload` (extra) tips the lance, the spent star dims and shrinks and is lit again.
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
defs = json.load(open(os.path.join(HERE, '..', 'weapon-frames', 'static-defs.json')))
hand = [d for d in defs['boomerang']['parts'] if d.get('name') == 'hand']          # the boomerang's gloved hand and sleeve

ASH, ASH2, WRAP, IRON, IRON2, EDGE = "#a07a48", "#c49a62", "#5a3a22", "#4a4a54", "#6c6c78", "#b8bcc8"
pk = [
    {"prim": "cyl", "size": [1.5, 1.5, 26], "seg": 10, "scale": 0.66, "pos": [0, 0.26, 0], "color": ASH},                  # the handle
    {"prim": "cyl", "size": [1.5, 1.5, 26], "seg": 10, "scale": 0.66, "pos": [-0.008, 0.26, -0.008], "color": ASH2, "stretch": [0.6, 1, 0.6]},
    {"prim": "cyl", "size": [1.3, 1.3, 4], "seg": 10, "scale": 0.1, "pos": [0, -0.01, 0], "color": WRAP},              # the leather wrap
    {"prim": "box", "size": [1, 1.4, 1.2], "scale": 0.1, "pos": [0, 0.6, 0], "color": IRON, "name": "pick"},         # the eye of the head
]
for sgn in (1, -1):                                                                     # the two points, bent down a little
    a = 105 * sgn
    dy, dz = math.cos(math.radians(a)), math.sin(math.radians(a))
    pk.append({"prim": "cone", "size": [0.55, 4], "rot": [a, 0, 0], "seg": 8, "scale": 0.32,
               "pos": [0, round(0.6 + dy * 0.16, 4), round(dz * 0.16, 4)], "color": IRON2, "name": "pick"})
    pk.append({"prim": "cone", "size": [0.2, 4], "rot": [a, 0, 0], "seg": 6, "scale": 0.3,
               "pos": [0.012, round(0.605 + dy * 0.16, 4), round(dz * 0.16, 4)], "color": EDGE, "name": "pick"})
pickaxe = {"model": "none", "base": [1, 0.1, 0.1], "dur": 0.7, "sideYaw": 90, "sidePose": {"hand": {"hide": True}},
           "parts": pk + hand,
           "melee": {"grip": 0.42, "idle": {"hand": [1.25, -0.5, 0.4], "ang": [-12, 0, -8]},
                     "fire": [{"hand": [1.2, -0.42, 0.42], "ang": [-14, 0, 25]},
                              {"hand": [1.15, -0.32, 0.4], "ang": [-16, 0, 45]},
                              {"hand": [1.3, -0.45, 0.34], "ang": [-4, 0, -10]},
                              {"hand": [1.45, -0.62, 0.28], "ang": [6, 0, -40]},
                              {"hand": [1.5, -0.68, 0.3], "ang": [6, 0, -46]},
                              {"hand": [1.35, -0.56, 0.38], "ang": [-6, 0, -22]}]}}

WOOD, BR1, BR2, BR3, ST, ST_E = "#3e2614", "#8a6224", "#c8973c", "#ecc874", "#cfe0ff", "#203050"
s = [
    {"prim": "cyl", "size": [1, 1, 12], "rot": [0, 0, -90], "seg": 12, "scale": 0.36, "pos": [-0.33, 0, 0], "color": WOOD},     # the grip
    {"prim": "sphere", "size": [1], "seg": 10, "scale": 0.075, "pos": [-0.52, 0, 0], "color": BR2},                            # pommel
    {"prim": "cyl", "size": [1, 1, 22], "rot": [0, 0, -90], "seg": 12, "scale": 0.6, "pos": [0.13, 0, 0], "color": BR2},       # the shaft
    {"prim": "cyl", "size": [1, 1, 22], "rot": [0, 0, -90], "seg": 12, "scale": 0.6, "pos": [0.13, 0.01, -0.005], "color": BR3, "stretch": [1, 0.5, 0.5]},
]
for x in (-0.15, 0.02, 0.2, 0.36):                                                      # rings
    s.append({"prim": "cyl", "size": [1.5, 1.5, 1], "rot": [0, 0, -90], "seg": 12, "scale": 0.045, "pos": [x, 0, 0], "color": BR1})
for j in range(4):                                                                      # the crown of prongs
    a = j * 90 + 45
    dy, dz = math.cos(math.radians(a)), math.sin(math.radians(a))
    s.append({"prim": "cone", "size": [0.3, 3], "rot": [0, 0, -90], "seg": 6, "scale": 0.11,
              "pos": [0.47, round(dy * 0.035, 4), round(dz * 0.035, 4)], "color": BR3})
s.append({"prim": "sphere", "size": [1], "seg": 12, "scale": 0.09, "pos": [0.56, 0, 0], "color": ST, "emissive": ST_E, "name": "star"})
for j in range(5):                                                                      # the five crystal points, facing the sight
    a = j * 72
    dy, dz = math.cos(math.radians(a)), math.sin(math.radians(a))
    s.append({"prim": "cone", "size": [0.45, 2.2], "rot": [a, 0, 0], "seg": 6, "scale": 0.11,
              "pos": [0.56, round(dy * 0.075, 4), round(dz * 0.075, 4)], "color": ST, "emissive": ST_E, "name": "star"})
G = lambda e, sc: {"star": {"emissive": e, "scale": sc}}
starlance = {"model": "none", "base": [1, 0.1, 0.1], "parts": s, "nozzle": "star", "nozzleFront": True, "cam": [0.5, 0.4, -0.35, 0.8, 1.0],
             "dur": 0.4, "pitch": 3, "back": 0.06, "idlePose": G("#203050", 1.0),
             "fire": [{"kick": 1.0, "dy": 0.01, "partPose": G("#e0f0ff", 1.3)}, {"kick": 0.6, "dy": 0.006, "partPose": G("#6080b0", 0.9)},
                      {"kick": 0.25, "partPose": G("#304060", 0.8)}],
             "extra": {"charge": [{"kick": 0.08, "dy": -0.005, "partPose": G("#405a90", 1.1)}, {"kick": 0.14, "dy": -0.008, "partPose": G("#7090d0", 1.25)},
                                  {"kick": 0.2, "dy": -0.01, "partPose": G("#a8c4ff", 1.4)}, {"kick": 0.24, "dy": -0.012, "partPose": G("#e8f2ff", 1.55)}],
                       "reload": [{"kick": 0.1, "roll": -10, "dy": -0.03, "partPose": G("#101820", 0.6)},
                                  {"kick": 0.15, "roll": -16, "dy": -0.04, "partPose": G("#101820", 0.4)},
                                  {"kick": 0.15, "roll": -16, "dy": -0.04, "partPose": G("#5070a0", 0.8)},
                                  {"kick": 0.05, "roll": -6, "dy": -0.01, "partPose": G("#203050", 1.0)}]},
             "durs": {"charge": 1.2, "reload": 0.9}}

out = {"pickaxe": pickaxe, "starlance": starlance}
json.dump(out, open(sys.argv[1], 'w'), indent=1)
print('ok', [len(v["parts"]) for v in out.values()])
