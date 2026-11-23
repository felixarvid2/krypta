# Version 21: builds the weapon definitions of tools/weapon-frames for the morning star (flail) and the blunderbuss
# (blunderbuss). They are kept in their own file (not spliced into static-defs.json) and rendered with DEFS=:
#   python3 -B tools/props18/fp_defs.py /tmp/defs21.json
#   cd tools/weapon-frames && DEFS=/tmp/defs21.json node render-static.mjs fp flail,blunderbuss xframes21
#   python3 pack.py xframes21 <scratch-root>/ flail,blunderbuss    (a scratch copy of js/weapons.js; then copy the two
#   fp_*.png into assets/gfx and add the two entries at the end of js/weapons.js by hand)
#
# flail: a morning star (`model: none`, base [1,0.1,0.1]) in its own leather glove (knuckles, fingers, thumb, cuff, a short sleeve),
#   in the melee mode: an ash handle with leather wrapping, an iron cap and ring, a chain of seven links and a spiked iron
#   ball (`name: ball`, the "muzzle"). The chain is laid out per frame from a direction given in camera space (+X ahead,
#   +Y up, +Z right), turned into the weapon's own frame here (three.js XZY Euler), and each link / the ball is moved
#   there with partPose move. `fire` is the heavy blow (wind up behind to the right, over the top, down across to the
#   lower left); `spin` (melee.extra, four frames that loop) is the chain whirled over the head while right click is held.
# blunderbuss: a flared brass "trombone" gun on a walnut stock with brass furniture and a flintlock (gun mode, built of
#   simple shapes). `fire` is five heavy recoil frames (pack.py draws a grey dithered powder cloud, BLUNDERSMOKE); `reload` (extra) tips the
#   gun and drives a ramrod (`name: rod`, hidden except there) down into the bell.
import json
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
defs = json.load(open(os.path.join(HERE, '..', 'weapon-frames', 'static-defs.json')))


def compose_xzy(ax, ay, az):
    x, y, z = (math.radians(v) for v in (ax, ay, az))
    Rx = np.array([[1, 0, 0], [0, math.cos(x), -math.sin(x)], [0, math.sin(x), math.cos(x)]])
    Ry = np.array([[math.cos(y), 0, math.sin(y)], [0, 1, 0], [-math.sin(y), 0, math.cos(y)]])
    Rz = np.array([[math.cos(z), -math.sin(z), 0], [math.sin(z), math.cos(z), 0], [0, 0, 1]])
    return Rx @ Rz @ Ry


# ------------------------------------------------------------------ the morning star
# (version 21, round 2: its own gloved hand with knuckles and a thumb and a short sleeve instead of the boomerang's arm,
# an iron-banded ash haft with langets, a much bigger spiked ball and heavier chain)
ASH, ASH2, IRON, IRON2, IRON3, STEELS = "#8a6238", "#5a3c22", "#2e3036", "#4a4e56", "#8a8e98", "#c4c8d0"
GLOVE, GLOVE2, GLOVE3, CUFF, SLEEVE = "#5a3820", "#7a5030", "#9a6a40", "#3a2414", "#4e4034"
TIP = np.array([0.0, 0.3, 0.0])                        # the top of the haft (the chain's anchor) in the weapon frame
NL, STEP = 6, 0.07                                     # links and link spacing
BR_ = 0.23                                             # the ball's radius
BALL = 0.03 + NL * STEP + BR_ * 0.85                   # distance from the tip to the ball's centre


def spike_rot(v):
    a = np.array([0, 1.0, 0]); c = float(a @ v); w = np.cross(a, v)
    if np.linalg.norm(w) < 1e-6:
        R = np.eye(3) if c > 0 else np.diag([1, -1, -1])
    else:
        vx = np.array([[0, -w[2], w[1]], [w[2], 0, -w[0]], [-w[1], w[0], 0]])
        R = np.eye(3) + vx + vx @ vx / (1 + c)
    z = math.asin(-max(-1, min(1, R[0][1])))
    ex = math.atan2(R[2][1], R[1][1]); ey = math.atan2(R[0][2], R[0][0])
    return [round(math.degrees(ex), 2), round(math.degrees(ey), 2), round(math.degrees(z), 2)]


fl = [
    {"prim": "cyl", "size": [1, 1, 11], "seg": 10, "scale": 0.5, "pos": [0, 0.05, 0], "color": ASH},                    # the haft
    {"prim": "box", "size": [0.012, 0.16, 0.02], "scale": 0.16, "pos": [0.046, 0.22, 0], "color": IRON2},                    # langets
    {"prim": "box", "size": [0.012, 0.16, 0.02], "scale": 0.16, "pos": [-0.046, 0.22, 0], "color": IRON2},
    {"prim": "cyl", "size": [1.25, 1.05, 1.4], "seg": 10, "scale": 0.08, "pos": [0, 0.285, 0], "color": IRON},          # iron cap
    {"prim": "torus", "size": [1, 0.35], "seg": 10, "scale": 0.06, "pos": [0, 0.33, 0], "color": IRON3},                 # staple ring
    {"prim": "sphere", "size": [1], "seg": 10, "scale": 0.085, "pos": [0, -0.21, 0], "color": IRON2},                    # pommel
]
for y in (-0.16, 0.12, 0.2):                                                             # iron bands round the haft
    fl.append({"prim": "torus", "size": [1, 0.28], "rot": [90, 0, 0], "seg": 12, "scale": 0.075, "pos": [0, y, 0], "color": IRON2})
for i in range(NL):
    fl.append({"prim": "torus", "size": [1, 0.32], "rot": [0, 90 if i % 2 else 0, 0], "seg": 8, "scale": 0.085,
               "pos": [0, round(TIP[1] + 0.03 + i * STEP, 4), 0], "color": IRON3 if i % 2 else IRON2, "name": f"c{i}"})
BY = TIP[1] + BALL
fl.append({"prim": "sphere", "size": [1], "seg": 16, "scale": BR_ * 2, "pos": [0, round(BY, 4), 0], "color": IRON, "name": "ball"})
fl.append({"prim": "sphere", "size": [1], "seg": 8, "scale": 0.08, "pos": [-0.06, round(BY + 0.07, 4), 0.04], "color": IRON2, "name": "ball"})
fl.append({"prim": "torus", "size": [1, 0.18], "rot": [90, 0, 0], "seg": 16, "scale": BR_ * 2.05, "pos": [0, round(BY, 4), 0], "color": IRON2, "name": "ball"})   # a welded band
golden = math.pi * (3 - math.sqrt(5))
for k in range(18):                                                                      # big spikes all round the ball
    yv = 1 - 2 * (k + 0.5) / 18
    r = math.sqrt(1 - yv * yv)
    v = np.array([math.cos(k * golden) * r, yv, math.sin(k * golden) * r])
    fl.append({"prim": "cone", "size": [0.38, 1.0], "seg": 5, "scale": 0.15, "rot": spike_rot(v),
               "pos": [round(v[0] * (BR_ + 0.05), 4), round(BY + v[1] * (BR_ + 0.05), 4), round(v[2] * (BR_ + 0.05), 4)], "color": STEELS, "name": "ball"})
# the gloved fist round the haft (the back of the hand to the right, the knuckles ahead, the thumb over the left side)
hd = [
    {"prim": "box", "size": [0.13, 0.17, 0.07], "scale": 0.17, "pos": [0.0, -0.045, 0.05], "color": GLOVE, "name": "hand"},          # back of the hand
    {"prim": "sphere", "size": [1], "seg": 10, "scale": 0.13, "pos": [-0.01, -0.06, 0.045], "color": GLOVE, "name": "hand"},
    {"prim": "box", "size": [0.09, 0.16, 0.07], "scale": 0.16, "pos": [-0.05, -0.04, 0.0], "color": GLOVE, "name": "hand"},          # palm side
    {"prim": "cyl", "size": [1, 1, 4], "rot": [0, 0, -70], "seg": 8, "scale": 0.11, "pos": [0.025, 0.055, -0.05], "color": GLOVE2, "name": "hand"},   # thumb
    {"prim": "sphere", "size": [1], "seg": 8, "scale": 0.05, "pos": [0.065, 0.07, -0.04], "color": GLOVE3, "name": "hand"},
    {"prim": "cyl", "size": [1, 1, 0.9], "seg": 12, "scale": 0.2, "pos": [0, -0.19, 0.01], "color": CUFF, "name": "hand"},          # cuff
    {"prim": "cyl", "size": [1, 1.1, 1.6], "seg": 12, "scale": 0.36, "pos": [0, -0.42, 0.02], "color": SLEEVE, "name": "hand"},    # short sleeve
]
for j in range(4):                                                                       # four fingers wrapped round the front
    y = 0.03 - j * 0.042
    hd.append({"prim": "cyl", "size": [1, 1, 5.2], "rot": [90, 0, 0], "seg": 8, "scale": 0.13, "pos": [0.058, round(y, 4), 0.005], "color": GLOVE2, "name": "hand"})
    hd.append({"prim": "sphere", "size": [1], "seg": 8, "scale": 0.026, "pos": [0.058, round(y, 4), -0.06], "color": GLOVE2, "name": "hand"})  # finger tip
    hd.append({"prim": "sphere", "size": [1], "seg": 10, "scale": 0.058, "pos": [0.045, round(y, 4), 0.068], "color": GLOVE3, "name": "hand"})   # knuckle
for j in range(4):
    a = j / 4 * 2 * math.pi
    hd.append({"prim": "sphere", "size": [1], "seg": 6, "scale": 0.025, "pos": [round(math.cos(a) * 0.1, 4), -0.19, round(math.sin(a) * 0.1, 4)], "color": "#c89a42", "name": "hand"})


def chain(ang, d0, d1=None):
    """partPose moving the links and the ball so that the chain leaves the tip along d0 and bends towards d1 (camera
    space directions) at the ball."""
    R = compose_xzy(*ang)
    def loc(d):
        d = np.array(d, float); d /= np.linalg.norm(d)
        return R.T @ d
    a = loc(d0); b = loc(d1 if d1 is not None else d0)
    pose = {}
    def at(s):
        t = s / BALL
        dd = a * (1 - t) + b * t
        # integrate the bending direction for a smooth curve
        n = 8
        p = np.zeros(3)
        for j in range(n):
            tt = (j + 0.5) / n * t
            dj = a * (1 - tt) + b * tt
            p += dj / np.linalg.norm(dj) * s / n
        return TIP + p
    for i in range(NL):
        s = 0.03 + i * STEP
        p0 = TIP + np.array([0, s, 0])
        pose[f"c{i}"] = {"move": [round(float(x), 4) for x in at(s) - p0]}
    pose["ball"] = {"move": [round(float(x), 4) for x in at(BALL) - (TIP + np.array([0, BALL, 0]))]}
    return pose


def P(hand_, ang, d0, d1=None, **kw):
    return {"hand": hand_, "ang": ang, "partPose": chain(ang, d0, d1), **kw}


FIRE = [
    P([0.78, -0.16, 0.4], [36, 0, 14], [-0.3, 0.5, 1], [-0.3, -0.2, 1]),                # wound up behind to the right
    P([0.8, -0.1, 0.3], [18, 0, 6], [0.0, 1, 0.45], [0.5, 0.9, 0.15]),                 # the ball comes over the top
    P([0.86, -0.12, 0.16], [-16, 0, -18], [0.6, 0.8, -0.1], [1, 0.25, -0.2]),             # whipping forward
    P([0.88, -0.16, 0.06], [-34, 0, -22], [0.9, -0.2, -0.45], [0.6, -0.8, -0.5]),         # down across to the lower left
    P([0.86, -0.2, 0.06], [-40, 0, -22], [0.3, -1, -0.5], [-0.1, -1, -0.3]),
    P([0.82, -0.22, 0.24], [-18, 0, -12], [0.3, -1, 0.2], [0.15, -1, 0.25]),               # recovering
]
IDLE = P([0.92, -0.06, 0.36], [-10, 0, -20], [0.45, -0.5, -0.75], [0.2, -1, -0.45])
SPIN = []
for phi in (10, 95, 185, 275):                                                           # whirled over the head
    pr = math.radians(phi)
    d = [math.cos(pr) * 0.6 + 0.35, 0.4, math.sin(pr)]
    lag = [math.cos(pr - 0.5) * 0.6 + 0.35, 0.25, math.sin(pr - 0.5)]
    SPIN.append(P([0.9, -0.1, 0.2], [6, 0, -4], d, lag))
flail = {"model": "none", "base": [1, 0.1, 0.1], "dur": 0.55, "sideYaw": 90, "sidePose": {"hand": {"hide": True}}, "nozzle": "ball",
         "parts": fl + hd, "melee": {"grip": 0.3, "idle": IDLE, "fire": FIRE, "extra": {"spin": SPIN}}, "durs": {"spin": 0.5}}

# ------------------------------------------------------------------ the blunderbuss
# (version 21, round 2: an eight-sided brass barrel with iron bands flaring into a wide bell, a grained walnut stock and
# an iron flintlock with a cock, frizzen and pan)
WAL, WAL2, WAL3, GRAIN = "#5e3820", "#462816", "#7c4c2a", "#8e5a32"
BRASS, BRASS2, BRASSD, IRONB, IRONB2, IRONB3 = "#9c7a34", "#d0ae5a", "#5e4618", "#3a3c42", "#5a5e66", "#9a9ea8"
bb = [
    {"prim": "box", "size": [0.5, 0.15, 0.12], "rot": [0, 0, 7], "scale": 0.5, "pos": [-0.5, -0.075, 0], "color": WAL2},     # butt stock
    {"prim": "box", "size": [0.5, 0.03, 0.122], "rot": [0, 0, 7], "scale": 0.5, "pos": [-0.5, -0.01, 0], "color": WAL3},
    {"prim": "box", "size": [0.04, 0.17, 0.13], "rot": [0, 0, 7], "scale": 0.17, "pos": [-0.75, -0.1, 0], "color": BRASS},    # brass butt plate
    {"prim": "box", "size": [0.13, 0.26, 0.1], "rot": [0, 0, -18], "scale": 0.26, "pos": [-0.26, -0.16, 0], "color": WAL},      # wrist
    {"prim": "torus", "size": [1, 0.15], "rot": [90, 0, 0], "seg": 10, "scale": 0.1, "pos": [-0.15, -0.115, 0], "color": BRASS},   # trigger guard
    {"prim": "box", "size": [0.012, 0.05, 0.012], "scale": 0.05, "pos": [-0.15, -0.1, 0], "color": IRONB2},                  # trigger
    {"prim": "box", "size": [0.5, 0.08, 0.13], "scale": 0.5, "pos": [0.03, -0.035, 0], "color": WAL},                        # fore stock
    {"prim": "box", "size": [0.5, 0.02, 0.132], "scale": 0.5, "pos": [0.03, 0.002, 0], "color": WAL3},
    {"prim": "cyl", "size": [1, 1.08, 7], "rot": [0, 0, -90], "seg": 8, "scale": 0.66, "pos": [0.2, 0.045, 0], "color": BRASS, "name": "barrel"},   # 8-sided barrel
    {"prim": "cyl", "size": [1.15, 1.15, 0.9], "rot": [0, 0, -90], "seg": 8, "scale": 0.25, "pos": [-0.1, 0.045, 0], "color": BRASSD, "name": "barrel"},  # breech
    {"prim": "box", "size": [0.2, 0.09, 0.03], "scale": 0.2, "pos": [-0.16, 0.035, -0.065], "color": IRONB},                   # lock plate
    {"prim": "box", "size": [0.04, 0.03, 0.05], "scale": 0.05, "pos": [-0.11, 0.09, -0.065], "color": IRONB2},                  # pan
    {"prim": "box", "size": [0.025, 0.08, 0.035], "rot": [0, 0, -12], "scale": 0.08, "pos": [-0.1, 0.125, -0.065], "color": IRONB3},   # frizzen
    {"prim": "box", "size": [0.03, 0.09, 0.03], "rot": [0, 0, 30], "scale": 0.09, "pos": [-0.215, 0.105, -0.07], "color": IRONB2},     # cock neck
    {"prim": "box", "size": [0.06, 0.025, 0.035], "rot": [0, 0, 10], "scale": 0.06, "pos": [-0.19, 0.15, -0.07], "color": IRONB2},     # cock jaws
    {"prim": "box", "size": [0.03, 0.02, 0.03], "scale": 0.03, "pos": [-0.185, 0.17, -0.07], "color": "#6a6a5a"},                     # the flint
    {"prim": "cyl", "size": [0.3, 0.3, 6], "rot": [0, 0, -90], "seg": 6, "scale": 0.5, "pos": [0.1, -0.085, 0], "color": "#3a2214"},   # ramrod under the barrel
]
for x in range(5):                                                                       # grain on the stock
    bb.append({"prim": "box", "size": [0.3, 0.008, 0.124], "rot": [0, 0, 7 + (x % 2) * 3], "scale": 0.3, "pos": [round(-0.62 + x * 0.06, 3), round(-0.06 - x * 0.012, 3), 0], "color": GRAIN})
for x, r in ((0.02, 1.1), (0.3, 1.05)):                                    # iron bands round the barrel
    bb.append({"prim": "cyl", "size": [r, r, 0.18], "rot": [0, 0, -90], "seg": 8, "scale": round(0.2 * r, 3), "pos": [x, 0.045, 0], "color": IRONB, "name": "barrel"})
bb += [
    {"prim": "cyl", "size": [3.3, 1.0, 2.8], "open": True, "rot": [0, 0, -90], "seg": 18, "scale": 0.34, "pos": [0.64, 0.045, 0], "color": BRASS, "name": "muzzle"},    # the flared bell
    {"prim": "cyl", "size": [3.1, 0.9, 2.6], "open": True, "rot": [0, 0, -90], "seg": 18, "scale": 0.31, "pos": [0.645, 0.045, 0], "color": BRASSD},                   # its darker inside
    {"prim": "torus", "size": [1, 0.1], "rot": [0, 90, 0], "seg": 20, "scale": 0.36, "pos": [0.765, 0.045, 0], "color": BRASS2, "name": "muzzle"},                    # rolled lip
    {"prim": "cyl", "size": [1, 1, 0.3], "rot": [0, 0, -90], "seg": 14, "scale": 0.08, "pos": [0.55, 0.045, 0], "color": "#0c0c10"},                                 # the dark bore
    {"prim": "cyl", "size": [0.3, 0.3, 8], "rot": [0, 0, -90], "seg": 6, "scale": 0.6, "pos": [0.95, 0.045, 0], "color": "#4a2a16", "name": "rod", "hidden": True},   # ramrod (reload)
]
ROD = lambda dx: {"rod": {"show": True, "move": [dx, 0, 0]}}
blunderbuss = {"model": "none", "base": [1, 0.1, 0.1], "parts": bb, "nozzle": "muzzle", "nozzleFront": True, "cam": [0.42, 0.34, -0.3, 0.8, 0.9],
               "dur": 0.75, "pitch": 8, "back": 0.14,
               "fire": [{"kick": 0.9, "dy": 0.008}, {"kick": 1.3, "dy": 0.006}, {"kick": 1.0, "dz": 0.004}, {"kick": 0.55}, {"kick": 0.2}],
               "extra": {"reload": [{"kick": 0.2, "roll": -14, "dy": -0.03},
                                    {"kick": 0.25, "roll": -22, "dy": -0.05, "partPose": ROD(0.25)},
                                    {"kick": 0.25, "roll": -22, "dy": -0.05, "partPose": ROD(0.0)},
                                    {"kick": 0.25, "roll": -22, "dy": -0.05, "partPose": ROD(0.22)},
                                    {"kick": 0.08, "roll": -6}]},
               "durs": {"reload": 1.2}}

out = {"flail": flail, "blunderbuss": blunderbuss}
json.dump(out, open(sys.argv[1], 'w'), indent=1)
print('ok', [len(v["parts"]) for v in out.values()])
