"""Läderhandsken som håller närstridsvapnen från version 21/22 (morgonstjärna, treudd, mortelns sidogrepp).

Version 22, fas 3: rundare och grövre än den första handsken så att den läses som en hand i 320x200: fyra tjocka fingrar
med mörka springor emellan, ljusa knogar, en tydlig tumme, handrygg och handflata som tillplattade klot, en söm vid
handleden och en nitad manschett. Färgerna är ett grått, slitet läder (låg mättnad) som pixelstyle.py känner igen som
läder (`leather` i OPTS) och inte som trä. Skaftet står upprätt i origo: handryggen åt +z, knogarna framåt (+x), tummen
över vänstersidan (-z)."""
import math

GLOVE, GLOVE2, GLOVE3, GDARK = "#5c4a3a", "#74604c", "#9a8468", "#241a12"
CUFF, CUFF2, STUD, SLEEVE = "#3e3026", "#6c5844", "#c89a42", "#343c4c"


def glove(off=(0.0, 0.0, 0.0), name="hand", sleeve=True, slen=0.36, k=1.12):
    o = off
    P = lambda x, y, z: [round(x * k + o[0], 4), round(y * k + o[1], 4), round(z * k + o[2], 4)]
    S = lambda s: round(s * k, 4)
    hd = [
        {"prim": "sphere", "size": [1], "seg": 12, "stretch": [0.75, 1.0, 0.55], "scale": S(0.2), "pos": P(0.0, -0.035, 0.058), "color": GLOVE},     # handrygg
        {"prim": "sphere", "size": [1], "seg": 12, "stretch": [0.6, 1.0, 0.55], "scale": S(0.18), "pos": P(-0.05, -0.035, 0.0), "color": GLOVE},     # handflata
        {"prim": "cyl", "size": [1, 1, 4.4], "rot": [0, 0, -70], "seg": 8, "scale": S(0.115), "pos": P(0.022, 0.062, -0.052), "color": GLOVE2},      # tumme
        {"prim": "sphere", "size": [1], "seg": 8, "scale": S(0.058), "pos": P(0.07, 0.08, -0.046), "color": GLOVE3},
        {"prim": "torus", "size": [1, 0.13], "rot": [90, 0, 0], "seg": 12, "scale": S(0.2), "pos": P(0, -0.135, 0.012), "color": GLOVE3},            # söm vid handleden
        {"prim": "cyl", "size": [1.18, 1.0, 0.75], "seg": 12, "scale": S(0.25), "pos": P(0, -0.2, 0.012), "color": CUFF},                            # manschett
        {"prim": "torus", "size": [1, 0.1], "rot": [90, 0, 0], "seg": 12, "scale": S(0.255), "pos": P(0, -0.245, 0.012), "color": CUFF2},
    ]
    if sleeve:
        if slen >= 0.36:
            hd.append({"prim": "cyl", "size": [1, 1.1, 1.6], "seg": 12, "scale": 0.36, "pos": P(0, -0.42, 0.02), "color": SLEEVE})
        else:
            hd.append({"prim": "cyl", "size": [1, 1.05, 0.84], "seg": 12, "scale": 0.3, "pos": P(0, -0.31, 0.02), "color": SLEEVE})
    for j in range(4):                                                                   # fyra tjocka fingrar runt framsidan
        y = 0.048 - j * 0.047
        hd.append({"prim": "cyl", "size": [1, 1, 5.4], "rot": [90, 0, 0], "seg": 8, "scale": S(0.118), "pos": P(0.062, y, 0.0), "color": GLOVE2})
        hd.append({"prim": "sphere", "size": [1], "seg": 8, "scale": S(0.046), "pos": P(0.05, y, -0.064), "color": GLOVE2})      # fingertopp
        hd.append({"prim": "sphere", "size": [1], "seg": 10, "scale": S(0.064), "pos": P(0.05, y, 0.068), "color": GLOVE3})      # knoge
        if j < 3:                                                                        # mörk springa mellan fingrarna
            hd.append({"prim": "box", "size": [0.03, 0.007, 0.125], "scale": S(0.125), "pos": P(0.066, y - 0.0235, 0.0), "color": GDARK})
    for j in range(5):                                                                   # nitar runt manschetten
        a = j / 5 * 2 * math.pi + 0.5
        hd.append({"prim": "sphere", "size": [1], "seg": 6, "scale": S(0.03), "pos": P(math.cos(a) * 0.118, -0.2, math.sin(a) * 0.118 + 0.012), "color": STUD})
    for d in hd:
        d["name"] = name
    return hd
