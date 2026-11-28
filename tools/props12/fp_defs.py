# Version 15: builds the static-defs.json entries of tools/weapon-frames for the censer (censer + censer_h, the hand that
# pack.py lays over it, MERGE) and the hive launcher. The censer poses are given as a hand position and the direction the
# chain hangs in (world units, camera at the origin looking along +X, +Z to the right); the angles are worked out here
# (Rodrigues -> three.js XZY Euler) so that the chain and the sleeve point where they should.
#   python3 tools/props12/fp_defs.py out.json   (then merge its three keys into static-defs.json, json indent 1)
import json, math, sys
import numpy as np

def euler_xzy(R):
    m = R
    z = math.asin(-max(-1, min(1, m[0][1])))
    if abs(m[0][1]) < 0.9999999:
        x = math.atan2(m[2][1], m[1][1]); y = math.atan2(m[0][2], m[0][0])
    else:
        x = math.atan2(-m[1][2], m[2][2]); y = 0
    return x, y, z

def compose_xzy(x, y, z):
    Rx = np.array([[1, 0, 0], [0, math.cos(x), -math.sin(x)], [0, math.sin(x), math.cos(x)]])
    Ry = np.array([[math.cos(y), 0, math.sin(y)], [0, 1, 0], [-math.sin(y), 0, math.cos(y)]])
    Rz = np.array([[math.cos(z), -math.sin(z), 0], [math.sin(z), math.cos(z), 0], [0, 0, 1]])
    return Rx @ Rz @ Ry

def rot_to(a, b, roll=0.0):
    """Rotation taking unit a to unit b (Rodrigues), then a roll about b."""
    a = np.array(a, float) / np.linalg.norm(a); b = np.array(b, float) / np.linalg.norm(b)
    v = np.cross(a, b); c = float(np.dot(a, b))
    if np.linalg.norm(v) < 1e-9:
        R = np.eye(3) if c > 0 else np.diag([1, -1, -1]) if abs(a[0]) < 0.9 else np.diag([-1, -1, 1])
    else:
        vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
        R = np.eye(3) + vx + vx @ vx * (1 / (1 + c))
    if roll:
        k = b; K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
        Rr = np.eye(3) + math.sin(roll) * K + (1 - math.cos(roll)) * K @ K
        R = Rr @ R
    return R

def ang_for(a, b, roll=0.0):
    R = rot_to(a, b, roll)
    x, y, z = euler_xzy(R)
    assert np.allclose(compose_xzy(x, y, z), R, atol=1e-6)
    return [round(math.degrees(x), 2), round(math.degrees(y), 2), round(math.degrees(z), 2)]

L = 2.0          # base box [2,2,2]: the body's height, and ol (its x length) = 2
P = lambda x, y, z: [round(x / 2, 4), round(y / 2, 4), round(z / 2, 4)]   # world (model) units -> fractions of ol
S = lambda d: round(d / 2, 4)

# ------------------------------------------------------------------ censer: chain from the pivot (origin) down -Y to the pot
cp = []
n_links = 9
for i in range(n_links):
    y = -0.03 - i * 0.042
    cp.append({"prim": "torus", "size": [1, 0.28], "seg": 8, "rot": [0, 90 if i % 2 else 0, 0], "scale": S(0.052), "pos": P(0, y, 0),
               "color": "#a07a38" if i % 2 else "#d0a850", "name": "chain"})
cp.append({"prim": "torus", "size": [1, 0.22], "seg": 12, "scale": S(0.08), "pos": P(0, 0.01, 0), "color": "#e0b860", "name": "chain"})   # the ring held in the fist
PY = -0.52                                            # pot centre
cp += [
    {"prim": "sphere", "size": [1], "seg": 8, "scale": S(0.03), "pos": P(0, PY + 0.155, 0), "color": "#f0c868", "name": "lid"},
    {"prim": "cone", "size": [1, 1.1], "seg": 10, "scale": S(0.16), "pos": P(0, PY + 0.085, 0), "color": "#b8862e", "name": "lid"},
    {"prim": "sphere", "size": [1], "seg": 14, "scale": S(0.21), "pos": P(0, PY - 0.02, 0), "color": "#c89a42", "name": "pot"},
    {"prim": "torus", "size": [1, 0.12], "seg": 16, "rot": [90, 0, 0], "scale": S(0.235), "pos": P(0, PY + 0.03, 0), "color": "#f0d070", "name": "pot"},
    {"prim": "torus", "size": [1, 0.12], "seg": 16, "rot": [90, 0, 0], "scale": S(0.2), "pos": P(0, PY - 0.06, 0), "color": "#9a7030", "name": "pot"},
    {"prim": "cyl", "size": [0.7, 1, 0.5], "seg": 10, "scale": S(0.09), "pos": P(0, PY - 0.125, 0), "color": "#9a7030", "name": "pot"},
]
for k in range(7):                                    # embers glowing through the holes of the lid and bowl
    a = k / 7 * math.tau
    yy = PY + (0.065 if k % 2 == 0 else 0.0)
    r = 0.085 if k % 2 == 0 else 0.105
    cp.append({"prim": "sphere", "size": [1], "seg": 6, "scale": S(0.026), "pos": P(math.cos(a) * r, yy, math.sin(a) * r),
               "color": "#ffb040", "emissive": "#ff6010", "name": "ember"})

# ------------------------------------------------------------------ the hand: a gloved fist round the ring, the sleeve along +Y
hp = [
    {"prim": "box", "size": [1, 0.9, 1], "scale": S(0.1), "pos": P(0, 0.03, 0), "color": "#6a4630", "name": "hand"},
    {"prim": "box", "size": [1, 0.6, 1.1], "scale": S(0.06), "pos": P(0.045, 0.0, 0.0), "color": "#7a5236", "name": "hand"},
    {"prim": "box", "size": [1, 0.6, 1.1], "scale": S(0.06), "pos": P(0.045, 0.04, 0.0), "color": "#8a6040", "name": "hand"},
    {"prim": "box", "size": [0.6, 1, 0.8], "scale": S(0.06), "pos": P(-0.02, 0.05, 0.05), "color": "#7a5236", "name": "hand"},   # thumb
    {"prim": "cyl", "size": [1, 1, 1.0], "seg": 10, "scale": S(0.12), "pos": P(0, 0.11, 0), "color": "#4a3020", "name": "hand"},  # glove cuff
    {"prim": "torus", "size": [1, 0.25], "seg": 12, "rot": [90, 0, 0], "scale": S(0.13), "pos": P(0, 0.16, 0), "color": "#c89a42", "name": "hand"},
    {"prim": "cyl", "size": [0.42, 0.55, 7], "seg": 10, "scale": S(0.95), "pos": P(0, 0.64, 0), "color": "#5a1a26", "name": "sleeve"},   # a scarlet sleeve
    {"prim": "torus", "size": [1, 0.2], "seg": 12, "rot": [90, 0, 0], "scale": S(0.16), "pos": P(0, 0.2, 0), "color": "#e8d8b0", "name": "sleeve"},  # lace cuff
]

SH = np.array([0.3, -0.95, 0.6])                      # the shoulder the sleeve runs back to (world)

def pose(H, D, roll=0.0):
    """Hand at world H, the censer hanging along D from it."""
    H = np.array(H, float)
    D = np.array(D, float); D /= np.linalg.norm(D)
    c = {"hand": [round(v / L, 4) for v in H], "ang": ang_for([0, -1, 0], D, roll)}
    h = {"hand": [round(v / L, 4) for v in H], "ang": ang_for([0, 1, 0], SH - H)}
    return c, h

def orb(phi, dip=0.3):
    """Chain direction for an orbit round the hand: phi in degrees, 0 = straight ahead, 90 = right, -90 = left."""
    p = math.radians(phi)
    return [math.cos(p), -dip, math.sin(p)]

IDLE = ([1.05, 0.28, 0.3], [0.06, -1, 0.04])
HF = [0.92, 0.1, 0.2]
FIRE = [  # a full turn: the hand lifts, the censer swings out ahead, round to the left, past the camera and back from the right
    ([0.98, 0.2, 0.26], orb(50, 0.8)),
    (HF, orb(-10, 0.3)),
    (HF, orb(-75, 0.25)),
    (HF, orb(-140, 0.3)),
    ([0.94, 0.1, 0.22], orb(175, 0.45)),
    ([0.96, 0.14, 0.24], orb(105, 0.15)),
    ([1.0, 0.2, 0.27], orb(60, 0.6)),
    ([1.03, 0.25, 0.29], [0.25, -1, 0.2]),
]
ci, hi = pose(*IDLE)
cf, hf = zip(*[pose(*f) for f in FIRE])
censer = {"model": "none", "base": [2, 2, 2], "dur": 0.6, "sideYaw": 0, "nozzle": "pot", "nozzleFront": False, "parts": cp,
          "melee": {"grip": 0.5, "idle": ci, "fire": list(cf)}}
censer_h = {"model": "none", "base": [2, 2, 2], "dur": 0.6, "parts": hp, "melee": {"grip": 0.5, "idle": hi, "fire": list(hf)}}

# ------------------------------------------------------------------ hive launcher: a wooden hive on a stock, a brass pipe
W = {"wood": "#8a5a30", "wood2": "#6e4026", "dark": "#4a2a18", "brass": "#c89a42", "brass2": "#e8c060", "wax": "#e8b840", "wax2": "#f8d870", "honey": "#e08a10"}
hl = [
    {"prim": "box", "size": [0.45, 0.17, 0.15], "scale": 0.45, "pos": [-0.36, -0.03, 0], "color": W["wood2"]},                  # stock
    {"prim": "box", "size": [0.12, 0.3, 0.11], "rot": [0, 0, -18], "scale": 0.27, "pos": [-0.2, -0.17, 0], "color": "#5a3420"},  # grip
    {"prim": "cyl", "size": [1, 1, 3], "rot": [0, 0, -90], "seg": 12, "scale": 0.5, "pos": [0.12, 0.04, 0], "color": W["wood"], "name": "hive"},
]
for k in range(12):                                                                       # dark seams between the staves
    a = k / 12 * math.tau + math.pi / 12
    hl.append({"prim": "box", "size": [1, 0.04, 0.04], "scale": 0.5, "pos": [0.12, 0.04 + math.sin(a) * 0.163, math.cos(a) * 0.163], "color": W["dark"], "name": "hive"})
for x in (-0.07, 0.12, 0.31):                                                             # brass hoops
    hl.append({"prim": "cyl", "size": [1.04, 1.04, 0.1], "rot": [0, 0, -90], "seg": 12, "scale": 0.345, "pos": [x, 0.04, 0], "color": W["brass"], "name": "hive"})
hl.append({"prim": "cyl", "size": [1, 1, 0.18], "rot": [0, 0, -90], "seg": 12, "scale": 0.33, "pos": [0.385, 0.04, 0], "color": W["wax"], "name": "comb"})   # waxed front
for (dy, dz) in ((0, 0), (0.075, 0.043), (0.075, -0.043), (-0.075, 0.043), (-0.075, -0.043), (0, 0.087), (0, -0.087)):   # honeycomb cells on the front
    hl.append({"prim": "cyl", "size": [1, 1, 0.5], "rot": [0, 0, -90], "seg": 6, "scale": 0.05, "pos": [0.4, 0.04 + dy, dz], "color": W["wax2"], "name": "comb"})
    hl.append({"prim": "cyl", "size": [1, 1, 0.5], "rot": [0, 0, -90], "seg": 6, "scale": 0.035, "pos": [0.41, 0.04 + dy, dz], "color": "#a05808", "emissive": "#301000", "name": "comb"})
hl += [
    {"prim": "box", "size": [1, 0.2, 0.7], "scale": 0.2, "pos": [0.0, 0.21, 0], "color": W["wood2"], "name": "lid"},       # a little roof on top
    {"prim": "box", "size": [1, 0.15, 0.5], "scale": 0.17, "pos": [0.0, 0.235, 0], "color": W["wood"], "name": "lid"},
    {"prim": "sphere", "size": [1], "seg": 8, "scale": 0.045, "pos": [0.0, 0.265, 0], "color": W["brass2"], "name": "lid"},
    {"prim": "cyl", "size": [0.5, 0.5, 2], "rot": [0, 0, -90], "seg": 12, "scale": 0.46, "pos": [0.6, 0.1, 0], "color": W["brass"]},   # the pipe
    {"prim": "cyl", "size": [1, 1, 0.22], "rot": [0, 0, -90], "seg": 12, "scale": 0.15, "pos": [0.5, 0.1, 0], "color": "#8a4a26"},
    {"prim": "cyl", "size": [1, 0.55, 0.8], "open": True, "rot": [0, 0, -90], "seg": 16, "scale": 0.26, "pos": [0.87, 0.1, 0], "color": W["brass2"], "name": "muzzle"},
    {"prim": "torus", "size": [1, 0.14], "rot": [0, 90, 0], "seg": 16, "scale": 0.27, "pos": [0.96, 0.1, 0], "color": "#f0d070", "name": "muzzle"},
    {"prim": "cyl", "size": [1, 0.6, 3], "seg": 8, "scale": 0.07, "pos": [0.36, -0.13, 0.06], "color": W["honey"], "emissive": "#301800", "name": "drip"},   # honey drips
    {"prim": "sphere", "size": [1], "seg": 8, "scale": 0.035, "pos": [0.36, -0.165, 0.06], "color": W["honey"], "name": "drip"},
    {"prim": "cyl", "size": [1, 0.6, 3], "seg": 8, "scale": 0.05, "pos": [0.25, -0.13, -0.08], "color": W["honey"], "name": "drip"},
    {"prim": "torus", "size": [1, 0.15], "rot": [90, 0, 0], "seg": 10, "scale": 0.1, "pos": [-0.1, -0.12, 0], "color": W["brass"]},   # trigger guard
]
hive = {"model": "none", "base": [1, 0.1, 0.1], "parts": hl, "nozzle": "muzzle", "nozzleFront": True, "cam": [0.5, 0.55, -0.35, 0.8, 1.2],
        "dur": 0.55, "pitch": 3, "back": 0.08,
        "fire": [{"kick": 0.6, "partPose": {"comb": {"emissive": "#603000"}}}, {"kick": 1.0, "partPose": {"comb": {"emissive": "#804000"}}},
                 {"kick": 0.7}, {"kick": 0.35}, {"kick": 0.12}],
        "extra": {"reload": [{"kick": 0.2, "roll": -10, "dy": -0.02, "partPose": {"lid": {"move": [0, 0.06, 0]}}},
                             {"kick": 0.2, "roll": -14, "dy": -0.03, "partPose": {"lid": {"move": [-0.05, 0.14, 0], "rot": [0, 0, 25]}}},
                             {"kick": 0.2, "roll": -14, "dy": -0.03, "partPose": {"lid": {"move": [-0.05, 0.14, 0], "rot": [0, 0, 25]}, "comb": {"emissive": "#805010"}}},
                             {"kick": 0.15, "roll": -10, "dy": -0.02, "partPose": {"lid": {"move": [0, 0.05, 0]}}},
                             {"kick": 0.05, "roll": -4}]},
        "durs": {"reload": 1.5}}
out = {"censer": censer, "censer_h": censer_h, "hivelauncher": hive}
json.dump(out, open(sys.argv[1], 'w'), indent=1)
print('ok', [len(v["parts"]) for v in out.values()])
