#!/usr/bin/env python3
"""pixelstyle.py - ger de formbyggda vapnen (version 5+) samma grova, slitna 90-talslook som de äldre vapnen.

SÅ KÖR DU DET
    cd tools/weapon-frames
    python3 pixelstyle.py IN.png UT.png [--id VAPEN] [--fw BREDD] [--strength 0.8] [--pick] [--opts nowood,smoke]

    python3 pixelstyle.py orig_v20/fp_axe.png ../../assets/gfx/fp_axe.png          # id läses ur filnamnet
    python3 pixelstyle.py min/fp_flail.png ../../assets/gfx/fp_flail.png --fw 180  # nytt vapen som inte står i weapons.js
    python3 pixelstyle.py orig_v20/pick_axe.png ../../assets/gfx/pick_axe.png      # pick_* behandlas som en enda ruta
    python3 pixelstyle.py orig_v20/fp_axe_legend.png ../../assets/gfx/fp_axe_legend.png --base orig_v20/fp_axe.png   # legend
    python3 pixelstyle.py --all      # alla nya vapen: orig_v20/{fp,pick}_*.png -> assets/gfx/ (hoppar över de åtta gamla)

  --opts smoke   om krutrök/ånga är inritad i skjutrutorna (annars får röken kontur och smuts som en sten)
  --opts nowood  om orangebruna ytor är koppar, tegel eller läder (annars får de träådring)
  --strength     0.6 = lättare slitage, 0.8 = standard (valt i spelet mot gamla pistol/shotgun/smg), 1.3 = hårt

Vapen med handgjorda detaljer (nitar, band, skåror, glansstrimmor) står i tabellen DETAILS längre ned. Detaljerna
ritas i vilorutans koordinater och passas in i övriga rutor (skala + vridning kring mynningspunkten).

VIKTIGT
  * Filtret är INTE idempotent. Kör alltid från en ostilad originalbild (spara den, t.ex. i orig_v20/) till
    assets/gfx/, aldrig på en redan stilad bild.
  * Bildstorlek, rutindelning och alfakanal lämnas exakt orörda (bara RGB ändras), så js/weapons.js behöver inte ändras.
    Skriptet läser js/weapons.js (rutbredd `w` och `muzzle`) men skriver aldrig dit.
  * Rutbredden tas från weapons.js via --id (eller filnamnet fp_<id>.png, `_legend` skalas bort). Finns inte nyckeln
    måste --fw anges. Mynningspunkterna används bara för att förankra gryn och repor vid vapnet så att de följer med
    i rekylen; saknas de förankras mönstret vid rutan.
  * Kräver bara PIL och numpy. Allt är procedurellt - inga texturer eller sprites från andra spel.

VAD DET GÖR (per bildruta)
  1. delar upp pixlarna i material efter nyans/mättnad: metall, trä, färgat/målat, självlysande
  2. dämpar och smutsar ned färgerna, lägger gryn, fläckar, repor och rost på metall och ådring på trä
  3. skuggar formen från silhuetten (ljus uppifrån vänster): mörk kontur, skuggad sida, ljus kantglans,
     mörka linjer i fogar mellan delar
  4. posteriserar ljusheten i få steg med ordnad (Bayer) dithering och kvantiserar mot en fast, smutsig palett
     (k-medel ur de gamla vapnen + egna ramper för rött, mässing, grönt, blått, lila)
  Självlysande delar (kristaller, lågor, glöd) kvantiseras bara - ingen smuts.
"""
import sys, os, re, json, argparse, zlib, shutil
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
# per vapen: 'nowood' = orangebruna ytor är koppar/tegel/läder och ska inte få ådring
# 'smoke' = ljusgrå pixlar är inritad krutrök/ånga och lämnas i fred (bara palett)
OPTS = {'steamcannon': ('nowood', 'smoke'), 'musket': ('smoke',), 'flamer': ('nowood',)}

OLD = {'pistol', 'shotgun', 'smg', 'rifle', 'dbshotgun', 'sniper', 'crossbow', 'flaregun',
       'pistol_legend', 'shotgun_legend', 'rifle_legend'}

# ---------------------------------------------------------------- palett
# 56 färger: k-medel ur de åtta gamla vapnens bildrutor
_OLD_HEX = ("000000 040303 070605 0a0706 0b0a09 0e0d0b 12100e 210e05 161412 1a1816 22200f 1e1b18 311a0e 510404 "
            "211e1b 24221e 292521 252727 402515 322b1c 2c2925 7f0000 302c28 2d2e2d 4e2e12 34302b 3e3421 333332 "
            "37332e 7d1310 3c3731 383934 57351c 403a34 73390d 443e38 41413d 5f3e29 48453e 4e4a44 ab1b17 6f4c33 "
            "57514a 944e13 c7201c 5c5953 90643c 6d665d 148ca0 7f776d 8f877e dcb84c b1a69c fffcfd")


def _hsv2rgb(h, s, v):
    h = (h % 360) / 60.0
    i = int(h) % 6
    f = h - int(h)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    return [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)][i]


def _ramp(h, s, vmax, n=10, cool=18, vmin=0.07):
    """En färgramp i pixelkonststil: skuggorna dras mot blålila och mättas, ljusen dras mot gult och bleks."""
    out = []
    for i in range(n):
        t = i / (n - 1)
        v = vmin + (vmax - vmin) * t ** 0.9
        hh = h + cool * (0.5 - t) * (1 if 60 < h < 240 else -1)
        ss = min(1.0, s * (1.15 - 0.45 * t * t))
        out.append([int(round(255 * c)) for c in _hsv2rgb(hh, ss, v)])
    return out


def build_palette():
    pal = [[int(h[i:i + 2], 16) for i in (0, 2, 4)] for h in _OLD_HEX.split()]
    # (nyans, mättnad, toppljushet) - smutsiga ramper
    for h, s, v in [(0, 0.04, 0.80), (215, 0.14, 0.78), (40, 0.16, 0.82),          # neutralt stål, kallt stål, ben/järn
                    (24, 0.62, 0.74), (16, 0.50, 0.56), (32, 0.42, 0.80),          # trä, mörkt trä/rost, läder/rep
                    (4, 0.78, 0.80), (42, 0.70, 0.90), (30, 0.55, 0.70),           # rödmålat, mässing, koppar
                    (78, 0.45, 0.60), (130, 0.45, 0.62), (178, 0.45, 0.66),        # oliv, grönt, ärg
                    (222, 0.55, 0.74), (275, 0.45, 0.66), (335, 0.50, 0.72),      # blått, lila, rosa
                    (68, 0.52, 0.52), (17, 0.74, 0.82)]:                           # militärgrönt, koppar
        pal += _ramp(h, s, v)
    # klara ramper för självlysande delar
    for h, s in [(195, 0.85), (215, 0.80), (285, 0.70), (100, 0.80), (28, 0.90), (52, 0.80), (0, 0.85)]:
        pal += _ramp(h, s, 1.0, n=5, cool=10, vmin=0.45)
        pal.append([int(round(255 * c)) for c in _hsv2rgb(h, s * 0.35, 1.0)])
    return np.array(pal, dtype=np.float32)


PAL = build_palette()
_PW = np.array([0.30, 0.59, 0.11], dtype=np.float32) ** 0.5   # viktning vid närmaste färg


def nearest(rgb):
    """rgb (N,3) float 0..255 -> närmaste palettfärg (N,3)."""
    out = np.empty_like(rgb)
    pw = PAL * _PW
    for i in range(0, len(rgb), 20000):
        c = rgb[i:i + 20000] * _PW
        d = ((c[:, None, :] - pw[None]) ** 2).sum(2)
        out[i:i + 20000] = PAL[d.argmin(1)]
    return out


# ---------------------------------------------------------------- brus och mönster
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float32) / 16.0 - 0.47
T = 256


def _smooth(a, r):
    """Mjuk upp ett kaklat brus med FFT (gauss, radie r)."""
    f = np.fft.fftfreq(T)
    g = np.exp(-2 * (np.pi * r) ** 2 * (f[:, None] ** 2 + f[None, :] ** 2))
    b = np.real(np.fft.ifft2(np.fft.fft2(a) * g))
    return (b - b.mean()) / (b.std() + 1e-9)


def make_tiles(seed):
    rs = np.random.RandomState(seed)
    t = {}
    t['grain'] = rs.rand(T, T).astype(np.float32) * 2 - 1                 # pixelgryn
    t['mid'] = _smooth(rs.randn(T, T), 1.3).astype(np.float32)            # små klumpar
    t['blotch'] = _smooth(rs.randn(T, T), 5.0).astype(np.float32)         # smutsfläckar
    t['rust'] = _smooth(rs.randn(T, T), 1.7).astype(np.float32)
    t['wood'] = rs.randn(T, T).astype(np.float32)                         # ådring: [v, u//n]
    t['woodw'] = _smooth(rs.randn(T, T), 6.0).astype(np.float32)          # ådringens vågighet
    # repor: korta raka streck, ljus kärna med mörk skugga under
    sc = np.zeros((T, T), np.float32)
    for _ in range(120):
        x, y = rs.rand(2) * T
        a = rs.rand() * np.pi if rs.rand() < 0.35 else (0.35 + rs.randn() * 0.25)
        ln = 3 + rs.rand() ** 2 * 14
        amp = 0.5 + rs.rand() * 0.5
        for s in np.arange(0, ln, 0.5):
            xi, yi = int(x + np.cos(a) * s) % T, int(y - np.sin(a) * s) % T
            sc[yi, xi] = amp
            sc[(yi + 1) % T, xi] = min(sc[(yi + 1) % T, xi], -amp * 0.7) if sc[(yi + 1) % T, xi] <= 0 else sc[(yi + 1) % T, xi]
    for _ in range(260):                                                  # hack och gropar
        x, y = rs.randint(0, T, 2)
        sc[y, x] = -1.0
        if rs.rand() < 0.5:
            sc[y, (x + 1) % T] = -0.8
        sc[(y + 1) % T, x] = max(sc[(y + 1) % T, x], 0.45)
    t['scratch'] = sc
    return t


def samp(tile, x, y):
    return tile[np.mod(y, T), np.mod(x, T)]


# ---------------------------------------------------------------- bildhjälp
def rgb2hsv(c):
    mx, mn = c.max(-1), c.min(-1)
    d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    dd = np.maximum(d, 1e-6)
    h = np.where(mx == r, ((g - b) / dd) % 6, np.where(mx == g, (b - r) / dd + 2, (r - g) / dd + 4)) * 60
    h = np.where(d < 1e-6, 0, h)
    return h, s, mx


def shift(a, dx, dy):
    """Flytta bilden (dx,dy) med kantupprepning: resultat[y,x] = a[y-dy, x-dx]."""
    h, w = a.shape[:2]
    ys = np.clip(np.arange(h) - dy, 0, h - 1)
    xs = np.clip(np.arange(w) - dx, 0, w - 1)
    return a[ys][:, xs]


def box(a, r):
    """Lådfilter med kantupprepning."""
    out = np.zeros_like(a, dtype=np.float32)
    n = 0
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out += shift(a, dx, dy)
            n += 1
    return out / n


def edge_dist(m, n=6):
    """Avstånd (1..n) inåt från silhuettkanten; rutans kant räknas som fylld (kantupprepning)."""
    d = np.zeros(m.shape, np.float32)
    cur = m.copy()
    for i in range(1, n + 1):
        er = cur & shift(cur, 1, 0) & shift(cur, -1, 0) & shift(cur, 0, 1) & shift(cur, 0, -1)
        d[cur & ~er] = i
        cur = er
    d[cur] = n + 1
    return d


def pca_angle(m, x, y):
    if m.sum() < 12:
        return None
    px, py = x[m].astype(np.float32), y[m].astype(np.float32)
    px -= px.mean()
    py -= py.mean()
    cxx, cyy, cxy = (px * px).mean(), (py * py).mean(), (px * py).mean()
    return 0.5 * np.arctan2(2 * cxy, cxx - cyy)


def wrap90(a):
    return (a + np.pi / 2) % np.pi - np.pi / 2


# ---------------------------------------------------------------- en bildruta
def style_frame(rgb, alpha, tiles, off=(0, 0), ang0=None, wood0=None, strength=1.0, small=False, opts=(), det=None, aff=None):
    """rgb (h,w,3) uint8, alpha (h,w) uint8 -> (ny rgb, silhuettvinkel, trävinkel)."""
    h, w = alpha.shape
    m = alpha > 0
    if not m.any():
        return rgb, ang0, wood0
    S = strength
    c = rgb.astype(np.float32) / 255.0
    yy, xx = np.mgrid[0:h, 0:w]

    # --- objektkoordinater: förankra mönstren vid vapnet (mynningens förflyttning + ev. vridning i hugg)
    ang = pca_angle(m, xx, yy)
    rot = 0.0
    if ang0 is not None and ang is not None:
        d = wrap90(ang - ang0)
        if abs(d) > np.radians(7):
            rot = d
    dx_ = dy_ = None
    if aff is not None:                         # detaljlagret passas in mot vilorutan (skala + vridning)
        A, pf, p0 = aff[:3]
        dx_ = np.rint(A[0, 0] * (xx - pf[0]) + A[0, 1] * (yy - pf[1]) + p0[0]).astype(np.int32)
        dy_ = np.rint(A[1, 0] * (xx - pf[0]) + A[1, 1] * (yy - pf[1]) + p0[1]).astype(np.int32)
    if rot:
        cx, cy = xx[m].mean(), yy[m].mean()
        cs, sn = np.cos(-rot), np.sin(-rot)
        ox = np.rint((xx - cx) * cs - (yy - cy) * sn + cx - off[0]).astype(np.int32)
        oy = np.rint((xx - cx) * sn + (yy - cy) * cs + cy - off[1]).astype(np.int32)
    else:
        ox = (xx - int(round(off[0]))).astype(np.int32)
        oy = (yy - int(round(off[1]))).astype(np.int32)

    # --- material
    hue, sat, val = rgb2hsv(c)
    lum = c @ np.array([0.30, 0.59, 0.11], np.float32)
    cool = (hue > 150) & (hue < 335)
    emis = m & (((val > 0.80) & (sat > 0.50) & cool) | ((val > 0.93) & (sat > 0.30) & cool) |
                ((val > 0.97) & (sat < 0.12) & (box((cool & (sat > 0.4) & m).astype(np.float32), 2) > 0.15)))
    emis = emis | (m & (lum > 0.93))            # vitglödgat (avfyrningsglöd) lämnas rent
    if 'smoke' in opts:
        emis = emis | (m & (val > 0.40) & (sat < 0.17))
    metal = m & ~emis & ((sat < 0.24) | ((sat < 0.42) & cool & (val < 0.75)))
    wood = m & ~emis & ~metal & (hue >= 8) & (hue <= 46) & (sat > 0.28) & (val < 0.80) & ~((hue > 34) & (sat > 0.6) & (val > 0.6))
    if 'nowood' in opts:                        # orangebrunt är koppar/läder här, inte trä
        wood = wood & False
    paint = m & ~emis & ~metal & ~wood
    dirty = m & ~emis

    # --- form ur silhuetten
    dist = edge_dist(m, 6)
    mf = m.astype(np.float32)
    bl = box(box(mf, 2), 2)
    gx = shift(bl, -1, 0) - shift(bl, 1, 0)      # pekar mot fyllt -> normal utåt = -grad
    gy = shift(bl, 0, -1) - shift(bl, 0, 1)
    gn = np.sqrt(gx * gx + gy * gy) + 1e-6
    ndl = (gx * 0.62 + gy * 0.78) / gn           # >0: kanten vetter upp/vänster mot ljuset
    near = np.clip((5.5 - dist) / 4.5, 0, 1) * np.clip(gn * 6, 0, 1)
    thick = box((dist >= 2).astype(np.float32), 1) > 0.20     # tunna detaljer (strängar, kedjor) får ingen kontur

    # --- fogar: mörk linje där två delar med olika färg möts
    def nb_diff(dx, dy):
        o = shift(c, dx, dy)
        return np.abs(o - c).sum(-1) * shift(mf, dx, dy)
    seam = np.maximum.reduce([nb_diff(1, 0), nb_diff(0, 1), nb_diff(-1, 0), nb_diff(0, -1)])
    darker = (lum <= np.minimum.reduce([shift(lum, 1, 0), shift(lum, -1, 0), shift(lum, 0, 1), shift(lum, 0, -1)]) + 0.02)
    seam_m = dirty & (seam > 0.20) & darker & (dist > 1)
    lit_seam = dirty & (nb_diff(1, 1) > 0.22) & (lum > shift(lum, 1, 1) + 0.04) & (dist > 1)   # ljus kant ovanför en fog

    # --- brus i objektkoordinater
    grain = samp(tiles['grain'], ox, oy)
    mid = samp(tiles['mid'], ox, oy)
    blotch = samp(tiles['blotch'], ox, oy)
    rustn = samp(tiles['rust'], ox + 61, oy + 17)
    scr = samp(tiles['scratch'], ox, oy)

    # --- dämpa färgen: lite mörkare, mindre mättad, kontrast upp
    out = c.copy()
    g = lum[..., None]
    desat = np.where(paint, 0.93, np.where(wood, 0.88, 0.78))[..., None]
    mud = np.array([0.36, 0.31, 0.26], np.float32)
    o2 = g + (out - g) * desat
    o2 = o2 * 0.93 + mud * 0.07 * (1 - g)
    o2 = np.clip((o2 - 0.40) * 1.12 + 0.415, 0, 1)
    if 'legend' not in opts:
        out = np.where(dirty[..., None], o2, out)

    k = np.ones((h, w), np.float32)                                  # ljushetsfaktor
    # form: skuggad sida / ljus sida
    k *= 1 + S * 0.34 * near * ndl
    # materialgryn
    amp_g = np.where(metal, 0.10, np.where(wood, 0.07, 0.065))
    amp_m = np.where(metal, 0.09, np.where(wood, 0.06, 0.055))
    k *= 1 + S * (amp_g * grain + amp_m * mid + 0.10 * np.clip(blotch, -2, 2) * 0.6)
    # smuts samlas nedtill/skuggsidan
    k *= 1 - S * 0.10 * np.clip(blotch - 0.6, 0, 1.5)

    # trä: ådring längs träets huvudriktning
    wang = wood0
    if wang is None:
        wang = pca_angle(wood, ox, oy)
        if wang is None:
            wang = pca_angle(m, ox, oy) or 0.0
    cs, sn = np.cos(wang), np.sin(wang)
    u = ox * cs + oy * sn
    v = -ox * sn + oy * cs
    vv = v + 1.6 * samp(tiles['woodw'], np.rint(u * 0.5).astype(np.int32), np.rint(v).astype(np.int32))
    vi = np.rint(vv).astype(np.int32)
    streak = samp(tiles['wood'], vi, np.floor(u / 23.0).astype(np.int32) + (vi * 7) % 5)
    streak2 = samp(tiles['wood'], np.rint(vv * 0.5).astype(np.int32) + 90, np.floor(u / 40.0).astype(np.int32))
    wk = 0.13 * np.clip(streak, -1.6, 1.6) + 0.07 * streak2 - 0.16 * (streak < -1.15)
    k = np.where(wood, k * (1 + S * wk), k)

    # metall: repor, hack och rost
    sm = np.where(metal, 1.0, np.where(paint, 0.40, 0.0))
    k *= 1 + S * 0.42 * scr * sm * (0.5 + 0.5 * (mid > -0.4))
    rust = np.clip((rustn - 1.35) * 1.6 + 0.35 * np.clip(blotch - 0.5, 0, 2) * (rustn > 0.9) + 0.5 * (grain > 0.2) * (rustn > 1.0), 0, 1) * np.where(metal, 1.0, np.where(paint, 0.38, 0.0))
    rust = rust * (0.55 + 0.45 * np.clip((4.5 - dist) / 3, 0, 1)) * min(S, 1.2)

    # fogar och kontur
    # handgjorda detaljer (nitar, band, skåror) ritade i vilorutans koordinater, se DETAILS
    dcol = None
    if det is not None:
        kd, cd, ref0 = det
        hh, ww = kd.shape
        if dx_ is None:
            dx_, dy_ = xx, yy
        ok = m & (dx_ >= 0) & (dx_ < ww) & (dy_ >= 0) & (dy_ < hh)
        sx, sy = np.clip(dx_, 0, ww - 1), np.clip(dy_, 0, hh - 1)
        ok &= np.abs(c - ref0[sy, sx]).sum(-1) < 0.26          # bara där rutan ser ut som vilorutan (samma del)
        k = np.where(ok, k * kd[sy, sx], k)
        dcol = np.where(ok[..., None], cd[sy, sx], 0)
    k = np.where(seam_m, k * (1 - 0.34 * S), k)
    k = np.where(lit_seam & ~seam_m, k * (1 + 0.16 * S), k)
    rim = dirty & thick & (dist == 2) & (ndl > 0.30)
    k = np.where(rim, k * (1 + 0.30 * S) + 0.05 * S, k)
    outline = dirty & thick & (dist == 1)
    k = np.where(outline, k * (1 - S * np.where(ndl > 0.3, 0.30, 0.52)), k)
    if small:                                   # upplockningsbilder: för små för kontur + glans, håll det lätt
        k = np.where(outline, np.maximum(k, 0.72), k)

    if dcol is not None:
        out = out * (1 - dcol[..., 3:]) + dcol[..., :3] * dcol[..., 3:]
        dm = dcol[..., 3] > 0.5
        rust = np.where(dm, rust * 0.4, rust)
    col = out * k[..., None]
    # rost: dra mot rostbrunt, repor i målad yta visar metall
    rc = np.array([0.42, 0.20, 0.09], np.float32) * (0.70 + 0.35 * lum[..., None])
    if 'legend' in opts:                        # legendvarianter behåller sin färgskala: rost blir bara mörka fläckar
        col = col * (1 - 0.35 * rust)[..., None]
    else:
        col = col + (rc - col) * (rust * 0.75)[..., None]
    chip = paint & (scr > 0.55) & (mid > 0.2)
    col = np.where(chip[..., None], col * 0.45 + np.array([0.46, 0.44, 0.40], np.float32) * (0.35 + 0.5 * lum[..., None]), col)
    # skuggor dras svagt mot kallt, ljus mot varmt
    l2 = np.clip(col @ np.array([0.30, 0.59, 0.11], np.float32), 0, 1)[..., None]
    col = col * (1 + (l2 - 0.4) * np.array([0.10, 0.02, -0.12], np.float32) * S)
    col = np.where(dirty[..., None], np.clip(col, 0, 1), c)

    # --- posterisera ljusheten med ordnad dithering, sedan palett
    by = BAYER[np.mod(oy, 4), np.mod(ox, 4)]
    l3 = col @ np.array([0.30, 0.59, 0.11], np.float32)
    steps = np.where(emis, 10.0, 13.0)
    lq = np.floor(l3 * steps + 0.5 + by * 0.45) / steps
    col = col * (np.clip(lq, 0.02, 1) / np.maximum(l3, 0.02))[..., None]
    col = np.clip(col, 0, 1) * 255.0
    col += (by * np.where(emis, 5.0, 7.0))[..., None]
    flat = col[m].astype(np.float32) if 'legend' in opts else nearest(col[m].astype(np.float32))
    if 'legend' not in opts:
        # målade ytor (mässing, koppar, grönt, rött): håll nyansen ren - samma ramp över hela ytan i stället för
        # närmaste palettfärg, som annars hoppar mellan olika ramper och ger fläckar
        clean = (paint & (rust < 0.25) & ~chip)[m]
        if dcol is not None:
            clean &= ~(dcol[..., 3] > 0.5)[m]
        if clean.any():
            pc = col[m][clean] / 255.0
            ph, ps, pv = rgb2hsv(pc)
            oh, osat, _ = rgb2hsv(out[m][clean])                 # nyans/mättnad från den dämpade originalfärgen
            t = np.clip(pv, 0, 1)
            warm = ~((oh > 60) & (oh < 240))
            hq = oh + np.where(warm, -1, 1) * 14 * (0.5 - t)      # skugga mot rött/blått, ljus mot gult
            hq = np.round(hq / 4.0) * 4.0
            sq = np.clip(np.round(osat * (1.12 - 0.35 * t * t) * 12) / 12, 0, 1)
            vq = np.round(t * 20) / 20
            hi_ = (hq % 360) / 60.0
            ii = np.floor(hi_).astype(int) % 6
            ff = hi_ - np.floor(hi_)
            p_, q_, t_ = vq * (1 - sq), vq * (1 - sq * ff), vq * (1 - sq * (1 - ff))
            tab = np.stack([np.stack([vq, t_, p_], -1), np.stack([q_, vq, p_], -1), np.stack([p_, vq, t_], -1),
                            np.stack([p_, q_, vq], -1), np.stack([t_, p_, vq], -1), np.stack([vq, p_, q_], -1)], 0)
            flat[clean] = tab[ii, np.arange(len(ii))] * 255.0
    res = rgb.copy()
    res[m] = np.clip(np.rint(flat), 0, 255).astype(np.uint8)
    return res, (ang if ang0 is None else ang0), wang


# ---------------------------------------------------------------- handgjorda detaljer per vapen
IRON = (0.20, 0.19, 0.18)
BRASS = (0.62, 0.47, 0.16)
# Koordinater är pixlar i vilorutan (ruta 0). Varje form klipps till den del av vapnet som har samma färg som
# formens mittpunkt (eller 'at'), så linjer får gärna sticka ut över kanten.
#   ('band', punkter, bredd, färg)   rem/klämma i egen färg med ljus överkant, mörk underkant och skugga
#   ('groove', punkter)              mörk skåra med ljus kant (paneldelning)
#   ('hi', punkter, bredd)           glansstrimma        ('sh', punkter, bredd)  skuggstrimma
#   ('rivets', punkter, avstånd)     nitar längs en linje ('rivet', x, y)
#   ('ell', cx, cy, rx, ry, vinkel, typ, ...)  ellips som 'groove' eller 'rivets'
DETAILS = {
    'launcher': [
        ('band', [(0, 27), (13, 19), (30, 15)], 4, IRON, {'rivets': 7, 'at': (12, 20)}),
        ('hi', [(8, 8), (11, 17)], 3, {'at': (9, 12)}),
        ('hi', [(11, 24), (13, 30)], 3, {'at': (12, 27)}),
        ('sh', [(24, 6), (33, 28)], 4, {'at': (26, 12)}),
        ('ell', 22, 51, 14, 17, -20, 'groove', {'at': (12, 52)}),
        ('ell', 22, 51, 17, 20, -20, 'rivets', 9, {'at': (12, 52)}),
    ],
    'nailgun': [
        ('groove', [(46, 55), (74, 96)], {'at': (60, 80)}),
        ('groove', [(38, 66), (62, 66)], {'at': (50, 70)}),
        ('rivets', [(37, 58), (58, 96)], 9, {'at': (60, 80)}),
        ('rivets', [(54, 57), (80, 93)], 9, {'at': (60, 80)}),
        ('hi', [(60, 60), (76, 86)], 2, {'at': (60, 80)}),
        ('hi', [(13, 50), (27, 90)], 2, {'at': (16, 60)}),
        ('groove', [(2, 66), (16, 72), (33, 70)], {'at': (16, 62)}),
    ],
    'flamer': [
        ('rivets', [(33, 33), (41, 27), (55, 25), (64, 27), (74, 36), (84, 48), (93, 62)], 8),
        ('rivets', [(33, 57), (41, 48), (52, 42), (68, 42), (78, 47), (90, 60)], 8, {'at': (60, 41)}),
        ('hi', [(45, 62), (60, 100)], 4, {'at': (60, 70)}),
        ('hi', [(40, 30), (43, 40)], 3, {'at': (60, 34)}),
        ('sh', [(86, 68), (98, 100)], 5, {'at': (80, 80)}),
        ('groove', [(66, 46), (86, 100)], {'at': (70, 70)}),
        ('band', [(6, 42), (28, 37)], 3, BRASS, {'at': (17, 40)}),
        ('band', [(10, 78), (34, 73)], 3, BRASS, {'at': (22, 76)}),
        ('hi', [(13, 30), (24, 98)], 1, {'at': (18, 60)}),
    ],
    'steamcannon': [
        ('band', [(46, 108), (72, 104), (97, 95)], 4, IRON, {'at': (70, 100), 'rivets': 7}),
        ('hi', [(58, 80), (66, 98)], 3, {'at': (62, 90)}),
        ('hi', [(70, 108), (76, 122)], 3, {'at': (72, 114)}),
        ('sh', [(84, 82), (98, 108)], 4, {'at': (88, 92)}),
        ('rivets', [(66, 136), (78, 192)], 9, {'at': (80, 150)}),
        ('rivets', [(128, 152), (154, 190)], 9, {'at': (120, 160)}),
        ('groove', [(62, 148), (84, 160), (112, 164)], {'at': (80, 150)}),
        ('hi', [(84, 140), (96, 190)], 3, {'at': (80, 150)}),
    ],
    'hivelauncher': [
        ('band', [(10, 60), (25, 59), (42, 50)], 2, IRON, {'at': (25, 55), 'rivets': 6}),
        ('hi', [(19, 42), (26, 56)], 3, {'at': (22, 50)}),
        ('sh', [(33, 40), (42, 56)], 3, {'at': (36, 48)}),
    ],
    'sporelauncher': [
        ('band', [(60, 137), (80, 144), (102, 139)], 2, BRASS, {'at': (80, 140), 'rivets': 7}),
        ('hi', [(68, 124), (67, 152)], 3, {'at': (70, 140)}),
        ('sh', [(92, 128), (92, 150)], 3, {'at': (90, 140)}),
        ('rivets', [(8, 62), (20, 55), (38, 53)], 7, {'at': (20, 60)}),
        ('hi', [(12, 100), (22, 125)], 3, {'at': (15, 110)}),
        ('groove', [(22, 112), (40, 104), (62, 100)], {'at': (40, 100)}),
    ],
    'sawlauncher': [
        ('rivets', [(68, 113), (90, 117)], 7, {'at': (75, 112)}),
        ('rivets', [(112, 117), (131, 113)], 7, {'at': (120, 114)}),
        ('rivets', [(66, 93), (80, 91)], 7, {'at': (70, 95)}),
        ('ell', 80, 92, 50, 11, 3, 'groove', {'at': (40, 92)}),
        ('ell', 80, 92, 34, 7, 3, 'rivets', 10, {'at': (40, 92)}),
    ],
}


def _raster(shape, pts, width):
    from PIL import ImageDraw
    im = Image.new('L', (shape[1], shape[0]), 0)
    d = ImageDraw.Draw(im)
    pts = [tuple(p) for p in pts]
    if len(pts) == 1:
        d.point(pts, fill=255)
    else:
        d.line(pts, fill=255, width=width)
    return np.array(im) > 0


def _along(pts, step):
    out, carry = [], 0.0
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        ln = float(np.hypot(x1 - x0, y1 - y0))
        t = carry
        while t <= ln:
            out.append((int(round(x0 + (x1 - x0) * t / max(ln, 1e-6))), int(round(y0 + (y1 - y0) * t / max(ln, 1e-6)))))
            t += step
        carry = t - ln
    return out


def _ell(cx, cy, rx, ry, ang, n=40):
    a = np.radians(ang)
    return [(cx + rx * np.cos(t) * np.cos(a) - ry * np.sin(t) * np.sin(a), cy + rx * np.cos(t) * np.sin(a) + ry * np.sin(t) * np.cos(a))
            for t in np.linspace(0, 2 * np.pi, n + 1)]


def build_details(spec, rgb0, alpha0):
    """Rita detaljlagret för vilorutan: (ljushetsfaktor, färglager RGBA, originalfärg)."""
    h, w = alpha0.shape
    c0 = rgb0.astype(np.float32) / 255.0
    m0 = alpha0 > 0
    nrm = c0 / (c0.sum(-1, keepdims=True) + 0.10)
    kd = np.ones((h, w), np.float32)
    cd = np.zeros((h, w, 4), np.float32)
    lum0 = c0 @ np.array([0.30, 0.59, 0.11], np.float32)

    def part(x, y):
        x, y = int(np.clip(round(x), 0, w - 1)), int(np.clip(round(y), 0, h - 1))
        return m0 & (np.abs(nrm - nrm[y, x]).sum(-1) < 0.15) & (np.abs(lum0 - lum0[y, x]) < 0.45) if m0[y, x] else np.zeros_like(m0)

    def mid(pts):
        q = _along(pts, 1.0)
        return q[len(q) // 2]

    def rivet(x, y, pm):
        for dx, dy, f in ((0, 0, 1.75), (1, 0, 1.2), (0, 1, 1.05), (1, 1, 0.5), (2, 2, 0.72), (2, 1, 0.8), (1, 2, 0.8)):
            xx, yy = x + dx, y + dy
            if 0 <= xx < w and 0 <= yy < h and pm[yy, xx] and pm[min(y + 1, h - 1), min(x + 1, w - 1)] and pm[y, x]:
                kd[yy, xx] = f

    def draw(it):
        kind = it[0]
        if kind == 'ell':
            pts = _ell(*it[1:6])
            sub = it[6]
            return draw((sub, pts) + tuple(it[7:]))
        opt = it[-1] if isinstance(it[-1], dict) else {}
        if kind == 'rivet':
            return rivet(it[1], it[2], part(it[1], it[2]))
        pts = it[1]
        at = opt.get('at') or mid(pts)
        pm = part(*at)
        if kind == 'rivets':
            for x, y in _along(pts, it[2]):
                rivet(x, y, pm)
        elif kind == 'groove':
            r = _raster((h, w), pts, 1) & pm
            kd[r] *= 0.50
            lt = shift(r, 1, 1) & ~r & pm
            kd[lt] *= 1.20
        elif kind in ('hi', 'sh'):
            r = _raster((h, w), pts, it[2]) & pm
            core = _raster((h, w), pts, max(1, it[2] - 2)) & pm
            if kind == 'hi':
                kd[r] *= 1.16
                kd[core] *= 1.14
            else:
                kd[r] *= 0.84
                kd[core] *= 0.88
        elif kind == 'band':
            r = _raster((h, w), pts, it[2]) & pm
            if not r.any():
                return
            col = np.array(it[3], np.float32)
            sh_ = np.clip(lum0 / max(float(lum0[r].mean()), 0.05), 0.55, 1.6)
            cd[r, :3] = col * sh_[r, None]
            cd[r, 3] = 1.0
            kd[r] = 1.0
            top = r & ~shift(r, 0, 1)
            bot = r & ~shift(r, 0, -1)
            kd[top] = 1.45
            kd[bot] = 0.62
            under = shift(r, 0, 1) & ~r & pm
            kd[under] *= 0.66
            under2 = shift(r, 0, 2) & ~r & ~under & pm
            kd[under2] *= 0.86
            for x, y in _along(pts, opt.get('rivets', 0) or 9999)[1:] if opt.get('rivets') else []:
                if 0 <= x < w - 1 and 0 <= y < h - 1 and r[y, x]:
                    kd[y, x], kd[y + 1, x + 1] = 1.9, 0.45

    for it in spec:
        draw(it)
    return kd, cd, c0


def register(c0, m0, cf, mf, p0, pf):
    """Passa in rutan mot vilorutan med en likformig avbildning kring mynningspunkten (skala, vridning, liten
    förskjutning). Returnerar (A 2x2, pf, p0): vilorutans koordinat = A @ (p - pf) + p0."""
    h, w = mf.shape
    ys, xs = np.nonzero(mf)
    if len(xs) < 30:
        return None
    st = max(1, int(len(xs) // 2500))
    xs, ys = xs[::st].astype(np.float32), ys[::st].astype(np.float32)
    cf_s = cf[ys.astype(int), xs.astype(int)]
    h0, w0 = m0.shape

    def cost(sc, th, tx, ty):
        cs, sn = np.cos(th) / sc, np.sin(th) / sc
        dx, dy = xs - pf[0] - tx, ys - pf[1] - ty
        qx = np.rint(cs * dx - sn * dy + p0[0]).astype(int)
        qy = np.rint(sn * dx + cs * dy + p0[1]).astype(int)
        inb = (qx >= 0) & (qx < w0) & (qy >= 0) & (qy < h0)
        qx, qy = np.clip(qx, 0, w0 - 1), np.clip(qy, 0, h0 - 1)
        d = np.minimum(np.abs(c0[qy, qx] - cf_s).sum(-1), 0.6)
        d = np.where(m0[qy, qx], d, 0.6)
        d = np.where(inb, d, 0.25)
        return float(d.mean())

    best = (cost(1, 0, 0, 0) - 0.004, 1.0, 0.0, 0.0, 0.0)
    for sc in np.arange(0.70, 1.55, 0.05):
        for th in np.radians(np.arange(-24, 25, 3.0)):
            for tx in (-3, 0, 3):
                for ty in (-3, 0, 3):
                    cst = cost(sc, th, tx, ty)
                    if cst < best[0]:
                        best = (cst, sc, th, tx, ty)
    _, sc0, th0, tx0, ty0 = best
    for sc in sc0 + np.arange(-0.04, 0.041, 0.02):
        for th in th0 + np.radians(np.arange(-2, 2.1, 1.0)):
            for tx in tx0 + np.arange(-2, 3):
                for ty in ty0 + np.arange(-2, 3):
                    cst = cost(sc, th, tx, ty)
                    if cst < best[0]:
                        best = (cst, sc, th, tx, ty)
    cst, sc, th, tx, ty = best
    cs, sn = np.cos(th) / sc, np.sin(th) / sc
    return np.array([[cs, -sn], [sn, cs]], np.float32), (pf[0] + tx, pf[1] + ty), p0, cst


# ---------------------------------------------------------------- hela remsan
def load_wf():
    try:
        t = open(os.path.join(ROOT, 'js', 'weapons.js'), encoding='utf-8').read()
        a = t.index('{', t.index('WEAPON_FRAMES'))
        return json.JSONDecoder().raw_decode(t[a:])[0]
    except Exception as e:                                   # noqa
        print('varning: kunde inte läsa js/weapons.js:', e, file=sys.stderr)
        return {}


def style_image(im, wid=None, fw=None, strength=1.0, pick=False, wf=None, base_im=None, extra=()):
    """Stila en hel remsa. im: PIL-bild. Returnerar en RGBA-bild med samma storlek och orörd alfa."""
    im = im.convert('RGBA')
    a = np.array(im)
    rgb, alpha = a[..., :3].copy(), a[..., 3]
    work = alpha
    opts = None
    if base_im is not None:                     # legendvariant: glödkanten och gnistorna utanför grundvapnets silhuett lämnas orörda
        ba = np.array(base_im.convert('RGBA'))[..., 3]
        assert ba.shape == alpha.shape, 'grundbilden har annan storlek'
        work = np.where(ba >= 100, alpha, 0).astype(np.uint8)
        opts = ('legend',)
    H, W = alpha.shape
    base = re.sub(r'_legend$', '', wid or '')
    ent = None if pick else (wf if wf is not None else load_wf()).get(base)
    if pick:
        fw = W
    elif fw is None:
        if ent is None:
            raise SystemExit(f'"{base}" finns inte i js/weapons.js - ange --fw (rutbredd)')
        fw = ent['w']
    if W % fw:
        raise SystemExit(f'bildbredden {W} är inte en multipel av rutbredden {fw}')
    n = W // fw
    muz = ent.get('muzzle') if ent else None
    tiles = make_tiles(zlib.crc32(base.encode()) & 0xffff)
    orig_rgb = rgb.copy()
    ang0 = wood0 = None
    det = None
    if base in DETAILS and not pick and base_im is None:
        det = build_details(DETAILS[base], rgb[:, :fw], work[:, :fw])
    c0f = rgb[:, :fw].astype(np.float32) / 255.0
    for f in range(n):
        off = (0, 0)
        if muz and f < len(muz):
            off = (muz[f][0] - muz[0][0], muz[f][1] - muz[0][1])
        sl = slice(f * fw, (f + 1) * fw)
        aff = None
        if det is not None and f > 0 and (work[:, sl] > 0).any():
            p0 = (muz[0][0] - ent['x'], muz[0][1] - ent['y']) if muz else (0, 0)
            aff = register(c0f, work[:, :fw] > 0, orig_rgb[:, sl].astype(np.float32) / 255.0, work[:, sl] > 0,
                           p0, (p0[0] + off[0], p0[1] + off[1]))
            if os.environ.get('PIXELSTYLE_DEBUG') and aff:
                A = aff[0]
                print(f'  ruta {f}: skala {1 / np.hypot(A[0, 0], A[1, 0]):.2f} vridn {np.degrees(np.arctan2(A[1, 0], A[0, 0])):.1f} kostnad {aff[3]:.3f}')
        r, ang, wood = style_frame(rgb[:, sl], work[:, sl], tiles, off, ang0, wood0, strength, small=pick,
                                   opts=opts or (tuple(OPTS.get(base, ())) + tuple(extra)), det=det, aff=aff)
        rgb[:, sl] = r
        if f == 0:
            ang0, wood0 = ang, wood
    out = np.dstack([rgb, alpha])
    return Image.fromarray(out, 'RGBA')


def run_all(strength):
    wf = load_wf()
    src = os.path.join(HERE, 'orig_v20')
    dst = os.path.join(ROOT, 'assets', 'gfx')
    for fn in sorted(os.listdir(src)):
        mt = re.match(r'(fp|pick)_(.+)\.png$', fn)
        if not mt or mt.group(2) in OLD:
            continue
        kind, wid = mt.groups()
        base_im = None
        if wid.endswith('_legend'):
            base_im = Image.open(os.path.join(src, f'{kind}_{wid[:-7]}.png'))
            wid_l, wid = wid, wid[:-7]
        if kind == 'pick' and len(Image.open(os.path.join(src, fn)).convert('RGBA').getcolors(1 << 20)) < 64:
            shutil.copyfile(os.path.join(src, fn), os.path.join(dst, fn))      # redan handpixlad: lämnas som den är
            print('orörd (handpixlad)', fn)
            continue
        if kind == 'fp' and wid not in wf:
            print('hoppar över (saknas i weapons.js):', fn)
            continue
        style_image(Image.open(os.path.join(src, fn)), wid, None, strength * (0.7 if kind == 'pick' else 1.0), kind == 'pick', wf, base_im).save(os.path.join(dst, fn))
        print('ok', fn)


def main():
    ap = argparse.ArgumentParser(description='Doom/Duke-lik pixelstil för fp_*.png / pick_*.png')
    ap.add_argument('src', nargs='?')
    ap.add_argument('dst', nargs='?')
    ap.add_argument('--id', help='vapnets nyckel i js/weapons.js (annars ur filnamnet)')
    ap.add_argument('--fw', type=int, help='rutbredd i pixlar om vapnet inte står i weapons.js')
    ap.add_argument('--strength', type=float, default=0.8, help='hur kraftigt slitage/skuggning (0.5-1.5), standard 0.8')
    ap.add_argument('--pick', action='store_true', help='behandla hela bilden som en ruta (pick_*.png)')
    ap.add_argument('--all', action='store_true', help='orig_v20/*.png -> assets/gfx/ för alla nya vapen')
    ap.add_argument('--opts', default='', help='kommalista: nowood (orangebrunt är koppar/läder, ingen ådring), '
                    'smoke (ljusgrå pixlar är inritad krutrök/ånga och lämnas rena)')
    ap.add_argument('--base', help='för *_legend: grundvapnets OSTILADE bild (glödkant och gnistor lämnas orörda)')
    ap.add_argument('--force', action='store_true', help='tillåt även de gamla vapnen (bara för test)')
    a = ap.parse_args()
    if a.all:
        return run_all(a.strength)
    if not a.src or not a.dst:
        ap.error('ange IN och UT, eller --all')
    name = os.path.basename(a.src)
    mt = re.match(r'(fp|pick)_(.+)\.png$', name)
    wid = a.id or (mt.group(2) if mt else None)
    pick = a.pick or bool(mt and mt.group(1) == 'pick')
    if wid in OLD and not a.force:
        raise SystemExit(f'{wid} är ett av de gamla vapnen (förebilden) och ska inte stilas')
    if os.path.abspath(a.src) == os.path.abspath(a.dst):
        print('varning: IN och UT är samma fil - filtret är inte idempotent, spara originalet', file=sys.stderr)
    src = Image.open(a.src)
    if wid and wid.endswith('_legend') and not a.base:
        raise SystemExit('*_legend kräver --base (grundvapnets ostilade bild)')
    out = style_image(src, wid, a.fw, a.strength, pick, base_im=Image.open(a.base) if a.base else None,
                      extra=[o for o in a.opts.split(',') if o])
    assert out.size == src.size
    out.save(a.dst)


if __name__ == '__main__':
    main()
