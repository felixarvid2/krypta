# Version 23: builds the weapon definitions of tools/weapon-frames for the butcher's hook on a chain (hookchain) and the
# bombard (bombard). Like versions 21-22 they live in their own file and are rendered with DEFS=:
#   python3 -B tools/props20/fp_defs.py /tmp/defs23.json
#   cd tools/weapon-frames && DEFS=/tmp/defs23.json node render-static.mjs fp hookchain,bombard /tmp/xframes23
#   python3 pack.py /tmp/xframes23 <scratch-root>/ hookchain,bombard   (a scratch copy of js/weapons.js; copy the two
#   unstyled fp_*.png to tools/props20/fp_orig/, run pixelstyle.py from there into assets/gfx - hookchain with
#   `--opts leather`, bombard with `--opts leather,smoke` - and add the two entries at the end of js/weapons.js by hand)
#
# hookchain: a big steel meat hook (`name: hook`, the "muzzle") on three chain links above a short iron-ferruled ash
#   handle, in the leather glove of tools/weapon-frames/glove_def.py, in the melee mode. `fire` is the strike (the hook
#   cocked up to the right and ripped down across to the lower left, five frames); `throw` (melee.extra, four frames)
#   winds up, hurls the hook (hidden from the third frame; pack.py draws the chain running out to the sight with the hook
#   at its end, HOOKLINE) and holds; `empty` is the hand holding the chain while the hook is out.
# bombard: a squat eight-sided iron hand cannon on a wooden tiller with iron straps, three reinforcing rings, a bronze
#   muzzle lip with a heavy iron cannonball in it (`name: ball`), a glowing slow match at the touch hole and an upright side
#   grip on the left held by the glove. `fire` hides the ball over five heavy recoil frames (pack.py draws the ball flying
#   straight at the sight and the grey dithered powder smoke, BALLFLY / BLUNDERSMOKE); `reload` (extra) tips the gun and
#   lowers a new ball into the mouth.
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'weapon-frames'))
from glove_def import glove   # the round leather glove shared with versions 21-22


def rot_x(a):
    return [round(a, 2), 0, 0]


# ------------------------------------------------------------------ the hook on a chain
ASH, IRON, IRON2, STEEL, STEEL2, RUSTC = "#6e4a2c", "#34363c", "#55595f", "#a2a6ae", "#d2d6dc", "#7a4a2a"
hk = [
    {"prim": "cyl", "size": [1, 1, 10], "seg": 8, "scale": 0.34, "pos": [0, 0.03, 0], "color": ASH},                       # handle
    {"prim": "cyl", "size": [1.3, 1.2, 1.4], "seg": 8, "scale": 0.07, "pos": [0, 0.215, 0], "color": IRON},                   # ferrule
    {"prim": "sphere", "size": [1], "seg": 8, "scale": 0.075, "pos": [0, -0.15, 0], "color": IRON2},                          # pommel
]
for i in range(3):                                                                       # chain links (they stay in the hand)
    hk.append({"prim": "torus", "size": [1, 0.32], "rot": [0, 90 if i % 2 else 0, 0], "seg": 8, "scale": 0.07,
               "pos": [0, round(0.26 + i * 0.055, 3), 0], "color": IRON2 if i % 2 else STEEL, "name": "chain"})
hk.append({"prim": "torus", "size": [1, 0.3], "seg": 10, "scale": 0.08, "pos": [0, 0.43, 0], "color": STEEL, "name": "hook"})    # eye
SH0, SH1, R, T = 0.47, 0.64, 0.15, 0.052                                                 # shank, curve radius, thickness
hk.append({"prim": "box", "size": [T, SH1 - SH0, T], "scale": round(SH1 - SH0, 3), "pos": [0, round((SH0 + SH1) / 2, 3), 0], "color": STEEL, "name": "hook"})
# the curve lies in the y-z plane (sideways to the right), so the camera behind the hand sees its shape
n = 12
for j in range(n):
    a0 = math.pi - j / n * math.pi * 1.3
    a1 = math.pi - (j + 1) / n * math.pi * 1.3
    am = (a0 + a1) / 2
    py, pz = SH1 + math.sin(am) * R, R + math.cos(am) * R
    seg = 2 * R * math.sin((a0 - a1) / 2) * 1.2
    th = T * (1 - 0.4 * j / n)
    hk.append({"prim": "box", "size": [th, th, seg], "rot": [round(-math.degrees(am) - 90, 2), 0, 0], "scale": round(max(seg, th), 4),
               "pos": [0, round(py, 4), round(pz, 4)], "color": STEEL if j % 3 else STEEL2, "name": "hook"})
ae = math.pi - math.pi * 1.3
ty, tz = SH1 + math.sin(ae) * R, R + math.cos(ae) * R
dy, dz = -math.cos(ae), math.sin(ae)
hk.append({"prim": "cone", "size": [0.32, 1.0], "seg": 4, "rot": [round(math.degrees(math.atan2(dz, dy)), 2), 0, 0], "scale": 0.09,
           "pos": [0, round(ty + dy * 0.035, 4), round(tz + dz * 0.035, 4)], "color": STEEL2, "name": "hook"})   # the point
hk.append({"prim": "box", "size": [0.056, 0.06, 0.02], "scale": 0.06, "pos": [0, 0.56, 0.006], "color": RUSTC, "name": "hook"})   # rust stain
hk += glove(slen=0.16)
HIDE = {"hook": {"hide": True}}
hookchain = {"model": "none", "base": [1, 0.1, 0.1], "dur": 0.42, "sideYaw": 90, "sidePose": {"hand": {"hide": True}}, "nozzle": "hook",
             "parts": hk,
             "melee": {"grip": 0.41, "idle": {"hand": [1.0, -0.12, 0.4], "ang": [-10, 0, -15]},
                       "fire": [{"hand": [1.0, -0.02, 0.5], "ang": [35, 0, 12]},
                                {"hand": [1.05, -0.05, 0.32], "ang": [5, 0, -12]},
                                {"hand": [1.1, -0.13, 0.12], "ang": [-40, 0, -30]},
                                {"hand": [1.06, -0.2, 0.06], "ang": [-62, 0, -34]},
                                {"hand": [1.02, -0.17, 0.26], "ang": [-25, 0, -18]}],
                       "extra": {"throw": [{"hand": [0.98, 0.0, 0.5], "ang": [22, 0, 25]},
                                           {"hand": [1.1, -0.05, 0.3], "ang": [-5, 0, -32]},
                                           {"hand": [1.15, -0.09, 0.26], "ang": [-8, 0, -42], "partPose": HIDE},
                                           {"hand": [1.06, -0.11, 0.34], "ang": [-10, 0, -24], "partPose": HIDE}],
                                 "empty": [{"hand": [1.02, -0.12, 0.38], "ang": [-10, 0, -20], "partPose": HIDE}]}},
             "durs": {"throw": 0.5, "empty": 0.6}}

# ------------------------------------------------------------------ the bombard
WD, WD2, WD3, IR, IR2, IR3, BRZ, BRZ2 = "#5e3a22", "#442814", "#7c5030", "#2e3036", "#484c54", "#70747e", "#9a7032", "#c89a4a"
bd = [
    {"prim": "box", "size": [0.5, 0.13, 0.13], "rot": [0, 0, 6], "scale": 0.5, "pos": [-0.5, -0.07, 0], "color": WD2},        # the tiller
    {"prim": "box", "size": [0.5, 0.03, 0.132], "rot": [0, 0, 6], "scale": 0.5, "pos": [-0.5, -0.01, 0], "color": WD3},
    {"prim": "box", "size": [0.12, 0.27, 0.11], "rot": [0, 0, -16], "scale": 0.27, "pos": [-0.24, -0.17, 0], "color": "#3a2212"},  # grip
    {"prim": "torus", "size": [1, 0.15], "rot": [90, 0, 0], "seg": 10, "scale": 0.1, "pos": [-0.13, -0.12, 0], "color": IR2},
    {"prim": "box", "size": [0.46, 0.1, 0.18], "scale": 0.46, "pos": [0.02, -0.08, 0], "color": WD},                           # the bed
    {"prim": "cyl", "size": [1, 1.06, 4.6], "rot": [0, 0, -90], "seg": 8, "scale": 0.8, "pos": [0.18, 0.07, 0], "color": IR, "name": "barrel"},     # 8-sided barrel
    {"prim": "sphere", "size": [1], "seg": 10, "scale": 0.36, "pos": [-0.2, 0.07, 0], "color": IR2, "name": "barrel"},          # breech
    {"prim": "cyl", "size": [1.3, 1.0, 0.8], "rot": [0, 0, -90], "seg": 8, "scale": 0.46, "pos": [0.6, 0.07, 0], "color": IR2, "name": "muzzle"},  # muzzle swell
    {"prim": "torus", "size": [1, 0.13], "rot": [0, 90, 0], "seg": 16, "scale": 0.46, "pos": [0.66, 0.07, 0], "color": BRZ2, "name": "muzzle"},
    {"prim": "cyl", "size": [1, 1, 0.3], "rot": [0, 0, -90], "seg": 14, "scale": 0.26, "pos": [0.62, 0.07, 0], "color": "#0c0c10"},
    {"prim": "cyl", "size": [0.5, 0.5, 1], "seg": 6, "scale": 0.05, "pos": [-0.16, 0.26, 0], "color": BRZ},                     # touch hole
    {"prim": "cyl", "size": [0.3, 0.3, 6], "rot": [0, 0, 40], "seg": 6, "scale": 0.16, "pos": [-0.22, 0.31, 0.02], "color": "#6a5a40"},   # slow match
    {"prim": "sphere", "size": [1], "seg": 6, "scale": 0.035, "pos": [-0.17, 0.37, 0.02], "color": "#ff8030", "emissive": "#c03000"},
    {"prim": "box", "size": [0.5, 0.025, 0.2], "scale": 0.5, "pos": [-0.5, -0.03, 0], "color": IR2},                             # iron straps on the tiller
]
for x, r in ((-0.06, 1.12), (0.18, 1.1), (0.42, 1.09)):                                  # reinforcing rings
    bd.append({"prim": "cyl", "size": [r, r, 0.14], "rot": [0, 0, -90], "seg": 8, "scale": round(0.35 * r, 3), "pos": [x, 0.07, 0], "color": IR3, "name": "barrel"})
bd += [
    {"prim": "sphere", "size": [1], "seg": 12, "scale": 0.27, "pos": [0.68, 0.11, 0], "color": "#3c3e44", "name": "ball"},      # the cannonball
    {"prim": "sphere", "size": [1], "seg": 8, "scale": 0.08, "pos": [0.7, 0.18, -0.06], "color": "#7a7e88", "name": "ball"},
    {"prim": "cyl", "size": [1, 1, 5], "seg": 8, "scale": 0.24, "pos": [0.16, 0.02, -0.3], "color": WD, "name": "grip2"},       # side grip
    {"prim": "box", "size": [0.06, 0.06, 0.16], "scale": 0.16, "pos": [0.16, 0.06, -0.22], "color": IR2},
    {"prim": "box", "size": [0.06, 0.06, 0.16], "scale": 0.16, "pos": [0.16, -0.06, -0.22], "color": IR2},
]
bd += glove((0.16, 0.02, -0.3), "hand", sleeve=True)
BALL = lambda dy, dx=0.0: {"ball": {"move": [dx, dy, 0]}}
HB = {"ball": {"hide": True}}
bombard = {"model": "none", "base": [1, 0.1, 0.1], "parts": bd, "nozzle": "muzzle", "nozzleFront": True, "cam": [0.6, 0.42, -0.4, 0.8, 1.0],
           "dur": 0.85, "pitch": 8, "back": 0.14,
           "fire": [{"kick": 0.9, "dy": 0.008, "partPose": HB}, {"kick": 1.3, "dy": 0.006, "partPose": HB}, {"kick": 1.0, "dz": 0.004, "partPose": HB},
                    {"kick": 0.55, "partPose": HB}, {"kick": 0.2, "partPose": HB}],
           "extra": {"reload": [{"kick": 0.2, "roll": -12, "dy": -0.03, "partPose": HB},
                                {"kick": 0.25, "roll": -18, "dy": -0.04, "partPose": BALL(0.34, -0.04)},
                                {"kick": 0.25, "roll": -18, "dy": -0.04, "partPose": BALL(0.15, -0.02)},
                                {"kick": 0.12, "roll": -8, "dy": -0.02}]},
           "durs": {"reload": 1.2}}

out = {"hookchain": hookchain, "bombard": bombard}
json.dump(out, open(sys.argv[1], 'w'), indent=1)
print('ok', [len(v["parts"]) for v in out.values()])
