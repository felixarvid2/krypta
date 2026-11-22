# Version 20: builds the static-defs.json entries of tools/weapon-frames for the scimitar (scimitar) and the trap thrower
# (trapthrower).
#   python3 -B tools/props17/fp_defs.py out.json   (then splice its two keys in at the end of static-defs.json, json indent 1)
#
# scimitar: a curved desert sabre (`model: none`, base [1,0.1,0.1]) held in the gloved hand with the dark-blue sleeve of the
#   boomerang, in the melee mode: a dark leather grip with a brass pommel and a brass cross guard, and a steel blade built
#   from short boxes that bend further and further to the right and widen a little before the point (`name: blade`). `fire`
#   is the quick sweep: the blade cocks up to the right and sweeps across to the lower left (pack.py draws a pale swoosh
#   behind the edge, SWEEP). `dash` (melee.extra, three frames) is the lunge: the arm thrusts the blade straight forward
#   and comes back.
# trapthrower: a bear trap (`name: trap`) held by its chain in the same gloved hand: a ring of iron jaws standing up with
#   teeth round the inside, a round trigger plate and two spring arms. `fire` is the throw: the arm takes aim, swings
#   forward, the trap leaves the hand (hidden) and the hand comes back empty; pack.py draws the open trap spinning away
#   towards the sight (TRAPFLY). `reload` (melee.extra) brings a new trap up into the hand from below.
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
defs = json.load(open(os.path.join(HERE, '..', 'weapon-frames', 'static-defs.json')))
hand = [d for d in defs['boomerang']['parts'] if d.get('name') == 'hand']          # the boomerang's gloved hand and sleeve

GRIP, BRASS, BRASS2, STEEL, STEEL2, EDGE = "#3a2414", "#b8862c", "#e0b452", "#9aa0ac", "#6c7280", "#e8ecf4"
sc = [
    {"prim": "cyl", "size": [1, 1, 6], "seg": 10, "scale": 0.15, "pos": [0, -0.02, 0], "color": GRIP},                     # the grip
    {"prim": "sphere", "size": [1], "seg": 10, "scale": 0.05, "pos": [0, -0.11, 0], "color": BRASS},                       # pommel
    {"prim": "box", "size": [0.4, 0.35, 2.2], "scale": 0.16, "pos": [0, 0.07, 0.01], "color": BRASS, "name": "guard"},     # cross guard
    {"prim": "sphere", "size": [1], "seg": 8, "scale": 0.035, "pos": [0, 0.07, 0.09], "color": BRASS2, "name": "guard"},
    {"prim": "sphere", "size": [1], "seg": 8, "scale": 0.035, "pos": [0, 0.07, -0.07], "color": BRASS2, "name": "guard"},
]
y, z, th = 0.09, 0.0, 0.0
SEG = 0.1
for j in range(7):                                                                       # the blade: bending to the right
    w = 0.045 + 0.012 * math.sin(j / 6 * math.pi * 0.9)
    cy, cz = y + math.cos(th) * SEG / 2, z + math.sin(th) * SEG / 2
    sc.append({"prim": "box", "size": [0.12, SEG * 1.12, w], "rot": [round(math.degrees(th), 2), 0, 0], "scale": round(SEG * 1.12, 4),
               "pos": [0, round(cy, 4), round(cz, 4)], "color": STEEL, "name": "blade"})
    nx, nz = -math.sin(th), math.cos(th)                                                 # the edge on the left (convex) side
    sc.append({"prim": "box", "size": [0.06, SEG * 1.12, 0.012], "rot": [round(math.degrees(th), 2), 0, 0], "scale": round(SEG * 1.12, 4),
               "pos": [0.004, round(cy - nx * w / 2, 4), round(cz - nz * w / 2, 4)], "color": EDGE, "name": "blade"})
    y, z = y + math.cos(th) * SEG, z + math.sin(th) * SEG
    th += 0.11
sc.append({"prim": "cone", "size": [0.3, 1.2], "rot": [round(math.degrees(th), 2), 0, 0], "seg": 4, "scale": 0.07,
           "pos": [0, round(y + math.cos(th) * 0.03, 4), round(z + math.sin(th) * 0.03, 4)], "color": EDGE, "name": "blade"})
scimitar = {"model": "none", "base": [1, 0.1, 0.1], "dur": 0.32, "sideYaw": 90, "sidePose": {"hand": {"hide": True}},
            "parts": sc + hand,
            "melee": {"grip": 0.42, "idle": {"hand": [1.3, -0.5, 0.42], "ang": [-14, 0, -6]},
                      "fire": [{"hand": [1.25, -0.4, 0.6], "ang": [40, 0, 10]},
                               {"hand": [1.35, -0.38, 0.45], "ang": [10, 0, -10]},
                               {"hand": [1.45, -0.46, 0.25], "ang": [-35, 0, -25]},
                               {"hand": [1.45, -0.58, 0.1], "ang": [-68, 0, -35]},
                               {"hand": [1.35, -0.56, 0.3], "ang": [-28, 0, -16]}],
                      "extra": {"dash": [{"hand": [1.3, -0.45, 0.36], "ang": [-6, 0, -30]},
                                         {"hand": [1.7, -0.36, 0.22], "ang": [8, 0, -48]},
                                         {"hand": [1.45, -0.45, 0.36], "ang": [-10, 0, -22]}]}},
            "durs": {"dash": 0.36}}

IRON, IRON2, IRON3, PLATE = "#4a4a54", "#6c6c78", "#b8bcc8", "#8a6a3a"
tr = [
    {"prim": "torus", "size": [1, 0.11], "rot": [0, 90, 0], "seg": 20, "scale": 0.38, "pos": [0, 0.32, 0], "color": IRON, "name": "trap"},      # the jaws
    {"prim": "torus", "size": [1, 0.06], "rot": [0, 90, 0], "seg": 20, "scale": 0.34, "pos": [-0.012, 0.32, 0], "color": IRON2, "name": "trap"},
    {"prim": "cyl", "size": [1, 1, 0.2], "rot": [0, 0, 90], "seg": 14, "scale": 0.12, "pos": [0.01, 0.32, 0], "color": PLATE, "name": "trap"},   # trigger plate
    {"prim": "box", "size": [0.3, 0.3, 4], "scale": 0.54, "pos": [0.01, 0.16, 0], "color": IRON, "name": "trap"},                            # spring arms
    {"prim": "cyl", "size": [1, 1, 0.6], "rot": [90, 0, 0], "seg": 8, "scale": 0.05, "pos": [0.01, 0.16, 0.27], "color": IRON2, "name": "trap"},
    {"prim": "cyl", "size": [1, 1, 0.6], "rot": [90, 0, 0], "seg": 8, "scale": 0.05, "pos": [0.01, 0.16, -0.27], "color": IRON2, "name": "trap"},
    {"prim": "torus", "size": [1, 0.3], "seg": 8, "scale": 0.05, "pos": [0, 0.1, 0], "color": IRON2, "name": "trap"},                        # chain
    {"prim": "torus", "size": [1, 0.3], "rot": [0, 90, 0], "seg": 8, "scale": 0.05, "pos": [0, 0.055, 0], "color": IRON2, "name": "trap"},
    {"prim": "torus", "size": [1, 0.3], "seg": 8, "scale": 0.05, "pos": [0, 0.01, 0], "color": IRON2, "name": "trap"},
]
for j in range(12):                                                                     # teeth round the inside of the jaws
    a = j / 12 * 2 * math.pi
    tr.append({"prim": "cone", "size": [0.4, 1.2], "rot": [round(180 + math.degrees(a), 2), 0, 0], "seg": 4, "scale": 0.055,
               "pos": [0, round(0.32 + math.cos(a) * 0.145, 4), round(math.sin(a) * 0.145, 4)], "color": IRON3, "name": "trap"})
HIDE = {"trap": {"hide": True}}
trapthrower = {"model": "none", "base": [1, 0.1, 0.1], "dur": 0.5, "sideYaw": 90, "sidePose": {"hand": {"hide": True}}, "nozzle": "trap",
               "parts": tr + hand,
               "melee": {"grip": 0.42, "idle": {"hand": [1.6, -0.52, 0.48], "ang": [-8, 0, 0]},
                         "fire": [{"hand": [1.5, -0.44, 0.66], "ang": [-38, 0, 12]},
                                  {"hand": [1.62, -0.38, 0.42], "ang": [10, 0, -8]},
                                  {"hand": [1.75, -0.44, 0.22], "ang": [34, 0, -12], "partPose": HIDE},
                                  {"hand": [1.7, -0.6, 0.32], "ang": [16, 0, -4], "partPose": HIDE}],
                         "extra": {"reload": [{"hand": [1.62, -0.66, 0.46], "ang": [-4, 0, 0], "partPose": HIDE},
                                              {"hand": [1.62, -0.66, 0.46], "ang": [-4, 0, 0], "partPose": {"trap": {"move": [0, -0.3, 0]}}},
                                              {"hand": [1.6, -0.6, 0.47], "ang": [-6, 0, 0], "partPose": {"trap": {"move": [0, -0.14, 0]}}},
                                              {"hand": [1.6, -0.54, 0.48], "ang": [-8, 0, 0]}]}},
               "durs": {"reload": 0.8}}

out = {"scimitar": scimitar, "trapthrower": trapthrower}
json.dump(out, open(sys.argv[1], 'w'), indent=1)
print('ok', [len(v["parts"]) for v in out.values()])
