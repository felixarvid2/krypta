# Version 16: builds the static-defs.json entries of tools/weapon-frames for the garden shears (shears) and the dream staff
# (dreamstaff). Both are built of simple shapes (`"model": "none"`, `base: [2,2,2]` as the censer, so the grip sits at the
# origin and one model unit = 2 world units) and held in the melee mode.
#   python3 tools/props13/fp_defs.py out.json   (then merge its two keys into static-defs.json, json indent 1)
#
# The shears open and close round their bolt: static.html turns each part about its own centre (`partPose.rot`), so every
# primitive of the moving half gets its own name and, per frame, the rotation about the bolt (an X axis through it) plus
# the move that carries its centre round the bolt - a rigid turn of the whole half.
import json, math, sys
import numpy as np

S = lambda d: round(d / 2, 4)                                  # world size -> `scale` (largest dimension, in units of ol = 2)
P = lambda x, y, z: [round(x / 2, 4), round(y / 2, 4), round(z / 2, 4)]   # world position -> fractions of ol
H = lambda x, y, z: [round(x / 2, 4), round(y / 2, 4), round(z / 2, 4)]   # hand position (world) -> units of L = 2


def box(dims, pos, color, name, **kw):
    return {"prim": "box", "size": list(dims), "scale": S(max(dims)), "pos": P(*pos), "color": color, "name": name, **kw}


# ------------------------------------------------------------------ the shears: blades up along +Y, bolt axis along X
BOLT = np.array([0.0, 0.22, 0.0])
STEEL, EDGE, DARK, WOOD, WOOD2, BRASS = "#8a929e", "#e4eaf2", "#4a505a", "#7a4a26", "#5a3418", "#d0a850"
half_a = [   # the lower blade (fixed in the hand): it lies on the -Z side of the cut, its handle crosses to +Z
    box([0.02, 0.40, 0.08], (0.012, 0.44, -0.045), STEEL, "sa"),
    box([0.02, 0.16, 0.05], (0.012, 0.71, -0.03), STEEL, "sa"),
    box([0.021, 0.52, 0.014], (0.012, 0.50, -0.006), EDGE, "sa"),            # the ground cutting edge
    box([0.022, 0.08, 0.12], (0.012, 0.22, -0.01), DARK, "sa"),              # the blade's root round the bolt
    {"prim": "cyl", "size": [1, 0.8, 9], "seg": 8, "scale": S(0.27), "pos": P(0.012, 0.06, 0.03), "rot": [-8, 0, 0], "color": WOOD, "name": "sa"},
    {"prim": "cyl", "size": [1, 1, 1.2], "seg": 8, "scale": S(0.055), "pos": P(0.012, 0.17, 0.02), "color": BRASS, "name": "sa"},   # ferrule
]
half_b = [   # the upper blade (turns about the bolt): on the +Z side of the cut, its handle crosses to -Z
    box([0.02, 0.40, 0.08], (-0.012, 0.44, 0.045), STEEL, "sb0"),
    box([0.02, 0.16, 0.05], (-0.012, 0.71, 0.03), STEEL, "sb1"),
    box([0.021, 0.52, 0.014], (-0.012, 0.50, 0.006), EDGE, "sb2"),
    box([0.022, 0.08, 0.12], (-0.012, 0.22, 0.01), DARK, "sb3"),
    {"prim": "cyl", "size": [1, 0.8, 9], "seg": 8, "scale": S(0.27), "pos": P(-0.012, 0.06, -0.03), "rot": [8, 0, 0], "color": WOOD2, "name": "sb4"},
    {"prim": "cyl", "size": [1, 1, 1.2], "seg": 8, "scale": S(0.055), "pos": P(-0.012, 0.17, -0.02), "color": BRASS, "name": "sb5"},
]
bolt = [{"prim": "cyl", "size": [1, 1, 0.6], "seg": 10, "rot": [0, 0, 90], "scale": S(0.07), "pos": P(0, 0.22, 0), "color": BRASS, "name": "sa"}]
hand = [   # a gloved fist round both handles, the sleeve running down and back towards the camera
    box([0.13, 0.15, 0.15], (0.0, 0.0, 0.0), "#6a4630", "hand"),
    box([0.06, 0.035, 0.15], (0.07, 0.05, 0.0), "#7a5236", "hand"),
    box([0.06, 0.035, 0.15], (0.07, 0.01, 0.0), "#8a6040", "hand"),
    box([0.06, 0.035, 0.15], (0.07, -0.03, 0.0), "#7a5236", "hand"),
    box([0.05, 0.09, 0.05], (-0.03, 0.08, -0.08), "#8a6040", "hand"),        # thumb over the top
    {"prim": "cyl", "size": [1, 1, 1.0], "seg": 10, "scale": S(0.16), "pos": P(0, -0.12, 0), "color": "#4a3020", "name": "hand"},   # glove cuff
    {"prim": "cyl", "size": [0.42, 0.52, 6], "seg": 10, "scale": S(0.9), "pos": P(0, -0.6, 0), "color": "#3e4a2a", "name": "hand"},  # a moss-green sleeve
]
B_NAMES = [d["name"] for d in half_b]


def rx(deg):
    a = math.radians(deg)
    return np.array([[1, 0, 0], [0, math.cos(a), -math.sin(a)], [0, math.sin(a), math.cos(a)]])


def open_pose(theta, hide=False):
    """partPose turning the upper half by theta degrees about the bolt (rigidly), or hiding the shears."""
    if hide:
        return {n: {"hide": True} for n in ["sa"] + B_NAMES}
    pp = {}
    R = rx(theta)
    for d in half_b:
        c = np.array(d["pos"]) * 2                                            # its centre (world)
        c2 = BOLT + R @ (c - BOLT)
        pp[d["name"]] = {"rot": [theta + d.get("rot", [0])[0] * 0, 0, 0], "move": [round(v, 4) for v in (c2 - c) / 2]}
    return pp


def pose(h, ang, theta, hide=False):
    return {"hand": H(*h), "ang": ang, "partPose": open_pose(theta, hide)}


IDLE = pose((0.80, -0.26, 0.26), [-14, 0, -40], 20)
FIRE = [   # a quick double snip: open wide, snap shut (pushed forward), open, snap, back
    pose((0.78, -0.26, 0.26), [-16, 0, -38], 32),
    pose((0.88, -0.23, 0.23), [-12, 0, -48], 0),
    pose((0.82, -0.25, 0.25), [-15, 0, -41], 30),
    pose((0.90, -0.23, 0.23), [-11, 0, -49], 0),
    pose((0.84, -0.25, 0.25), [-13, 0, -43], 10),
    pose((0.81, -0.26, 0.26), [-14, 0, -40], 18),
]
THROW = [   # draws back up to the right, flings them forward (gone), the empty hand follows through
    pose((0.82, -0.21, 0.34), [-30, 0, -24], 6),
    pose((0.80, -0.17, 0.38), [-38, 0, -12], 4),
    pose((0.90, -0.21, 0.22), [-8, 0, -62], 0, hide=True),
    pose((0.84, -0.25, 0.26), [4, 0, -40], 0, hide=True),
]
EMPTY = [pose((0.80, -0.25, 0.27), [-8, 0, -30], 0, hide=True)]
shears = {"model": "none", "base": [2, 2, 2], "dur": 0.36, "sideYaw": 0, "sidePose": {"hand": {"hide": True}}, "nozzle": "sb1",
          "nozzleFront": False, "parts": half_a + half_b + bolt + hand,
          "melee": {"grip": 0.5, "idle": IDLE, "fire": FIRE, "extra": {"throw": THROW, "empty": EMPTY}}, "durs": {"throw": 0.4, "empty": 0.5}}

# ------------------------------------------------------------------ the dream staff: a dark shaft, a crescent moon and a star
SH, SH2, GOLD, MOON, STAR = "#3a2450", "#55357a", "#e0b860", "#f2ecc8", "#ffe070"
ds = [{"prim": "cyl", "size": [1.4, 1.4, 30], "seg": 10, "scale": S(0.9), "pos": P(0, 0.15, 0), "color": SH, "name": "shaft"}]
for y in (0.05, 0.46):                                                        # gold rings
    ds.append({"prim": "cyl", "size": [1, 1, 0.5], "seg": 12, "scale": S(0.05), "pos": P(0, y, 0), "color": GOLD, "name": "shaft"})
ds.append({"prim": "sphere", "size": [1], "seg": 10, "scale": S(0.07), "pos": P(0, 0.62, 0), "color": GOLD, "name": "shaft"})   # the head knob
# the crescent: a ring of spheres open to the right, in the plane facing the camera (YZ)
MC = np.array([0.0, 0.80, 0.0])
for k in range(19):
    a = math.radians(66 + k * 12.5)                                             # from the upper right round the left to the lower right
    r = 0.15
    sz = 0.06 * math.sin(math.radians(k / 18 * 180)) + 0.022
    ds.append({"prim": "sphere", "size": [1], "seg": 8, "scale": S(sz), "pos": P(0, MC[1] + math.sin(a) * r, -math.cos(a) * r * -1),
               "color": MOON, "emissive": "#403820", "name": "moon"})
# the star in the crescent's mouth: five cones round a ball, in the YZ plane
SC = np.array([0.0, 0.80, 0.07])
for k in range(5):
    a = k * 72
    d = np.array([0, math.cos(math.radians(a)), math.sin(math.radians(a))])
    c = SC + d * 0.055
    ds.append({"prim": "cone", "size": [0.4, 1], "seg": 4, "rot": [a, 0, 0], "scale": S(0.07), "pos": P(*c), "color": STAR, "emissive": "#a07010", "name": "star"})
ds.append({"prim": "sphere", "size": [1], "seg": 8, "scale": S(0.06), "pos": P(*SC), "color": "#fff4c0", "emissive": "#c09020", "name": "star"})
ds += [
    box([0.12, 0.14, 0.12], (0.0, 0.0, 0.0), "#6a4630", "hand"),
    box([0.05, 0.03, 0.13], (0.065, 0.04, 0.0), "#7a5236", "hand"),
    box([0.05, 0.03, 0.13], (0.065, 0.005, 0.0), "#8a6040", "hand"),
    box([0.05, 0.03, 0.13], (0.065, -0.03, 0.0), "#7a5236", "hand"),
    {"prim": "cyl", "size": [1, 1, 1.0], "seg": 10, "scale": S(0.14), "pos": P(0, -0.11, 0), "color": "#4a3020", "name": "hand"},
    {"prim": "cyl", "size": [0.4, 0.5, 6], "seg": 10, "scale": S(0.9), "pos": P(0, -0.58, 0), "color": "#2a2a5a", "name": "hand"},   # a night-blue sleeve
]


def dpose(h, ang, glow=None, scale=None):
    pp = {}
    if glow:
        pp["star"] = {"emissive": glow}
    if scale:
        pp.setdefault("star", {})["scale"] = scale
    return {"hand": H(*h), "ang": ang, **({"partPose": pp} if pp else {})}


D_IDLE = dpose((1.12, -0.64, 0.40), [-8, 0, -6])
D_FIRE = [dpose((1.18, -0.62, 0.40), [-8, 0, -12], "#ffd040", 1.35), dpose((1.26, -0.60, 0.39), [-8, 0, -16], "#fff0a0", 1.5),
          dpose((1.20, -0.62, 0.40), [-8, 0, -11], "#e0a020", 1.2), dpose((1.15, -0.63, 0.40), [-8, 0, -8], "#c08018", 1.05)]
D_RELOAD = [dpose((1.10, -0.67, 0.38), [-12, 0, 2], "#201000"), dpose((1.06, -0.70, 0.36), [-20, 0, 6], "#100800"),
            dpose((1.06, -0.70, 0.36), [-20, 0, 6], "#806010"), dpose((1.09, -0.67, 0.38), [-10, 0, 0], "#e0b030", 1.2),
            dpose((1.11, -0.65, 0.39), [-6, 0, -5], "#c09020")]
dreamstaff = {"model": "none", "base": [2, 2, 2], "dur": 0.4, "sideYaw": 0, "sidePose": {"hand": {"hide": True}}, "nozzle": "star",
              "nozzleFront": False, "parts": ds,
              "melee": {"grip": 0.5, "idle": D_IDLE, "fire": D_FIRE, "extra": {"reload": D_RELOAD}}, "durs": {"reload": 1.6}}

out = {"shears": shears, "dreamstaff": dreamstaff}
json.dump(out, open(sys.argv[1], 'w'), indent=1)
print('ok', [len(v["parts"]) for v in out.values()])
