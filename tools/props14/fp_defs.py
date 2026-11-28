# Version 17: builds the static-defs.json entries of tools/weapon-frames for the chain-ball hand cannon (chaincannon) and
# the acid sprayer (acidsprayer). Both are gun-mode weapons built of simple shapes (`"model": "none"`, `base: [1,0.1,0.1]`
# as the steam cannon and the hive launcher, so one model unit = the gun's length; positions and `scale` are fractions of it).
#   python3 tools/props14/fp_defs.py out.json   (then splice its two keys in at the end of static-defs.json, json indent 1)
#
# chaincannon: a stubby iron hand cannon on an oak stock - a thick black barrel with bronze hoops, a flared mouth and a
#   chain ball (two iron balls joined by a short chain, `name: ball`) sitting in the mouth. `fire` hides the ball (pack.py
#   draws it spinning away towards the sight, CHAINFLY) over five heavy recoil frames; `reload` tips the cannon and lowers a
#   new chain ball into the mouth from above (`partPose move`).
# acidsprayer: a brass pressure sprayer - a pistol grip and a short stock, a green glass tank on top (`name: tank`, the acid
#   glows with `emissive` in the fire frames), a pump handle, a coiled rubber hose and a long nozzle with a green tip
#   (`name: muzzle`). `fire` is four small shake frames whose last one flows back into the first (the weapon is automatic,
#   the game repeats the fire frames while the trigger is held and draws the stream itself, like the flamer); pack.py adds a
#   little green spit at the nozzle (ACIDFX).
import json
import math
import sys

IRON, IRON2, IRON3, BRONZE, BRONZE2, OAK, OAK2, OAK3 = "#2e3034", "#45484e", "#62666e", "#a8743a", "#d0a058", "#7a4a28", "#5e3820", "#94603a"

cc = [
    {"prim": "box", "size": [0.40, 0.16, 0.14], "scale": 0.40, "pos": [-0.40, -0.05, 0], "color": OAK2},                     # stock
    {"prim": "box", "size": [0.40, 0.03, 0.142], "scale": 0.40, "pos": [-0.40, 0.02, 0], "color": OAK3},                     # its lit top edge
    {"prim": "box", "size": [0.12, 0.3, 0.11], "rot": [0, 0, -16], "scale": 0.27, "pos": [-0.22, -0.18, 0], "color": "#4e2e1a"},   # pistol grip
    {"prim": "torus", "size": [1, 0.15], "rot": [90, 0, 0], "seg": 10, "scale": 0.1, "pos": [-0.12, -0.13, 0], "color": BRONZE},   # trigger guard
    {"prim": "box", "size": [0.36, 0.10, 0.16], "scale": 0.36, "pos": [-0.04, -0.06, 0], "color": OAK},                     # the oak bed under the barrel
    {"prim": "cyl", "size": [1, 1.12, 6], "rot": [0, 0, -90], "seg": 14, "scale": 0.86, "pos": [0.32, 0.04, 0], "color": IRON, "name": "barrel"},   # the barrel, thicker at the breech
    {"prim": "sphere", "size": [1], "seg": 14, "scale": 0.30, "pos": [-0.11, 0.04, 0], "color": IRON2, "name": "barrel"},   # the rounded breech
    {"prim": "cyl", "size": [0.5, 0.5, 1], "seg": 8, "scale": 0.05, "pos": [-0.09, 0.19, 0], "color": BRONZE2},             # touch hole
    {"prim": "box", "size": [0.10, 0.08, 0.02], "rot": [0, 0, 20], "scale": 0.10, "pos": [-0.16, 0.17, 0], "color": IRON3},  # flint hammer
]
for x, r in ((0.05, 1.18), (0.30, 1.1), (0.55, 1.04)):                                    # bronze hoops along the barrel
    cc.append({"prim": "cyl", "size": [r, r, 0.12], "rot": [0, 0, -90], "seg": 14, "scale": 0.30 * r, "pos": [x, 0.04, 0], "color": BRONZE, "name": "barrel"})
cc += [
    {"prim": "cyl", "size": [1.3, 1.0, 1.0], "open": True, "rot": [0, 0, -90], "seg": 16, "scale": 0.30, "pos": [0.78, 0.04, 0], "color": IRON2, "name": "muzzle"},   # flared mouth
    {"prim": "torus", "size": [1, 0.16], "rot": [0, 90, 0], "seg": 16, "scale": 0.30, "pos": [0.85, 0.04, 0], "color": BRONZE2, "name": "muzzle"},
    {"prim": "cyl", "size": [1, 1, 0.3], "rot": [0, 0, -90], "seg": 14, "scale": 0.2, "pos": [0.80, 0.04, 0], "color": "#0c0c10"},   # the dark bore
]
# the chain ball in the mouth: two iron balls side by side, a short chain between them across the bore
for z in (-0.06, 0.06):
    cc.append({"prim": "sphere", "size": [1], "seg": 10, "scale": 0.12, "pos": [0.96, 0.10, z], "color": "#3a3c42", "name": "ball"})
    cc.append({"prim": "sphere", "size": [1], "seg": 8, "scale": 0.04, "pos": [0.99, 0.135, z - 0.02], "color": "#9aa0aa", "name": "ball"})   # a glint
for k in range(4):
    cc.append({"prim": "torus", "size": [1, 0.3], "rot": [0, 90 if k % 2 else 0, 0], "seg": 8, "scale": 0.035, "pos": [0.98, 0.13, -0.03 + k * 0.02], "color": "#8a8e96", "name": "ball"})
cc += [   # a spare chain ball hung under the stock from a hook
    {"prim": "sphere", "size": [1], "seg": 8, "scale": 0.07, "pos": [-0.30, -0.17, 0.08], "color": "#34363c"},
    {"prim": "cyl", "size": [0.3, 0.3, 4], "seg": 6, "scale": 0.08, "pos": [-0.30, -0.11, 0.08], "color": "#6a6e76"},
]
DOWN = lambda dy: {"ball": {"move": [0.06, dy, 0]}}
chaincannon = {"model": "none", "base": [1, 0.1, 0.1], "parts": cc, "nozzle": "muzzle", "nozzleFront": True, "cam": [0.5, 0.5, -0.35, 0.8, 1.2],
               "dur": 0.7, "pitch": 6, "back": 0.12,
               "fire": [{"kick": 0.7, "partPose": {"ball": {"hide": True}}}, {"kick": 1.0, "partPose": {"ball": {"hide": True}}},
                        {"kick": 0.8, "partPose": {"ball": {"hide": True}}}, {"kick": 0.45, "partPose": {"ball": {"hide": True}}},
                        {"kick": 0.15, "partPose": {"ball": {"hide": True}}}],
               "extra": {"reload": [{"kick": 0.2, "roll": -12, "dy": -0.03, "partPose": {"ball": {"hide": True}}},
                                    {"kick": 0.25, "roll": -18, "dy": -0.04, "partPose": {"ball": {"move": [0.02, 0.34, 0]}}},
                                    {"kick": 0.25, "roll": -18, "dy": -0.04, "partPose": {"ball": {"move": [0.0, 0.16, 0]}}},
                                    {"kick": 0.2, "roll": -12, "dy": -0.03, "partPose": {"ball": {"move": [-0.02, 0.0, 0]}}},
                                    {"kick": 0.05, "roll": -4}]},
               "durs": {"reload": 1.4}}

BR, BR2, BRD, GL, AC, AC2, RUB = "#b08840", "#e0b860", "#6a4a20", "#9ad0a0", "#46c02a", "#a8f060", "#2a2a2c"
asp = [
    {"prim": "box", "size": [0.30, 0.14, 0.12], "scale": 0.30, "pos": [-0.44, -0.06, 0], "color": "#5a3a22"},               # short stock
    {"prim": "box", "size": [0.12, 0.3, 0.11], "rot": [0, 0, -16], "scale": 0.27, "pos": [-0.26, -0.18, 0], "color": "#4a2e1a"},   # grip
    {"prim": "torus", "size": [1, 0.15], "rot": [90, 0, 0], "seg": 10, "scale": 0.1, "pos": [-0.16, -0.13, 0], "color": BR},
    {"prim": "box", "size": [0.40, 0.09, 0.12], "scale": 0.40, "pos": [-0.12, -0.04, 0], "color": BRD},                      # the brass body / valve block
    {"prim": "cyl", "size": [1, 1, 3.0], "rot": [0, 0, -90], "seg": 14, "scale": 0.36, "pos": [-0.16, 0.08, 0.09], "color": GL, "name": "tank"},   # the glass tank, on the far side
    {"prim": "cyl", "size": [0.9, 0.9, 2.8], "rot": [0, 0, -90], "seg": 14, "scale": 0.33, "pos": [-0.16, 0.07, 0.09], "color": AC, "emissive": "#0c3006", "name": "tank"},   # the acid in it
    {"prim": "sphere", "size": [1], "seg": 8, "scale": 0.03, "pos": [-0.10, 0.12, 0.03], "color": AC2, "emissive": "#205010", "name": "tank"},    # bubbles
    {"prim": "sphere", "size": [1], "seg": 8, "scale": 0.022, "pos": [-0.04, 0.10, 0.03], "color": AC2, "emissive": "#205010", "name": "tank"},
    {"prim": "sphere", "size": [1], "seg": 8, "scale": 0.026, "pos": [-0.22, 0.11, 0.03], "color": AC2, "emissive": "#205010", "name": "tank"},
]
for x in (-0.34, 0.02):                                                                  # brass end caps
    asp.append({"prim": "cyl", "size": [1.12, 1.12, 0.6], "rot": [0, 0, -90], "seg": 14, "scale": 0.135, "pos": [x, 0.08, 0.09], "color": BR})
for x in (-0.22, -0.10):                                                                 # straps round the glass
    asp.append({"prim": "cyl", "size": [1.04, 1.04, 0.12], "rot": [0, 0, -90], "seg": 14, "scale": 0.125, "pos": [x, 0.08, 0.09], "color": BRD})
asp += [
    {"prim": "cyl", "size": [0.4, 0.4, 3], "seg": 8, "scale": 0.10, "pos": [-0.30, 0.17, 0.09], "color": BR},              # pump rod
    {"prim": "box", "size": [0.03, 0.03, 0.14], "scale": 0.14, "pos": [-0.30, 0.22, 0.09], "color": "#3a2a1a"},           # pump handle
    {"prim": "cyl", "size": [0.45, 0.45, 6], "rot": [0, 0, -90], "seg": 10, "scale": 0.62, "pos": [0.38, 0.03, -0.02], "color": BR},   # the long nozzle tube
    {"prim": "cyl", "size": [1, 1, 0.3], "rot": [0, 0, -90], "seg": 12, "scale": 0.075, "pos": [0.14, 0.03, -0.02], "color": BRD},
    {"prim": "cyl", "size": [1, 1, 0.3], "rot": [0, 0, -90], "seg": 12, "scale": 0.075, "pos": [0.46, 0.03, -0.02], "color": BRD},
    {"prim": "cyl", "size": [0.8, 0.8, 1.2], "rot": [0, 0, -90], "seg": 10, "scale": 0.09, "pos": [0.64, 0.03, -0.02], "color": "#3a9a20", "emissive": "#0a2a04"},   # green-painted tip
    {"prim": "cone", "size": [0.5, 1.2], "rot": [0, 0, -90], "seg": 10, "scale": 0.09, "pos": [0.72, 0.03, -0.02], "color": BR2, "name": "muzzle"},
    {"prim": "sphere", "size": [1], "seg": 8, "scale": 0.04, "pos": [0.765, 0.025, -0.02], "color": AC, "emissive": "#206010", "name": "muzzle"},   # a green drop on the tip
    {"prim": "cyl", "size": [0.5, 0.5, 1], "rot": [90, 0, 0], "seg": 8, "scale": 0.08, "pos": [0.02, 0.05, 0.04], "color": BR},   # tank outlet
]
for k in range(5):                                                                       # the coiled rubber hose from the tank to the nozzle
    asp.append({"prim": "torus", "size": [1, 0.28], "rot": [0, 90, 0], "seg": 10, "scale": 0.07, "pos": [0.05 + k * 0.03, 0.03, 0.02], "color": RUB})
TANK = lambda c: {"tank": {"emissive": c}}
acidsprayer = {"model": "none", "base": [1, 0.1, 0.1], "parts": asp, "nozzle": "muzzle", "nozzleFront": True, "cam": [0.5, 0.4, -0.35, 0.8, 1.0],
               "dur": 0.3, "pitch": 3, "back": 0.05,
               "fire": [{"kick": 0.25, "dy": 0.004, "partPose": TANK("#2a8010")}, {"kick": 0.35, "dy": -0.004, "partPose": TANK("#3aa018")},
                        {"kick": 0.3, "dz": 0.004, "partPose": TANK("#2a8010")}, {"kick": 0.2, "dz": -0.004, "partPose": TANK("#1e6010")}]}

out = {"chaincannon": chaincannon, "acidsprayer": acidsprayer}
json.dump(out, open(sys.argv[1], 'w'), indent=1)
print('ok', [len(v["parts"]) for v in out.values()])
