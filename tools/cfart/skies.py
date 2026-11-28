#!/usr/bin/env python3
"""Himmelspanoramor 512x96 för fler biomer (version 25.1) av flux-1-schnell-bilder (1024x1024).

Per biom: två bilder, var och en beskuren till himlen (raderna y0..y1, marken/dynerna klipps bort),
skalade till samma höjd, radvis färgutjämnade (båda halvorna får samma lodräta färgförlopp, annars syns
två 180°-halvor), korsblandade i fogen och runt om (360°), nedskalade till 512x96, lugnade upptill
(zenit), ljusstyrkan satt nära natthimlen, och kvantiserade: 32 färger (median cut) som dras en bit mot
närmaste färg i biomens egna texturer, med lätt 4x4 Bayer-dither.
Kör: python3 -I skies.py [biom ...]   (läser $CFART_RAW eller ../raw, skriver $CFART_OUT eller ../out och out/preview;
     de färdiga bilderna kopieras sedan till assets/gfx/ och tools/cfart/skies/)
"""
import os, sys, glob
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.environ.get('CFART_RAW', os.path.join(HERE, '..', 'raw'))  # rådata från cf.py (finns inte i repot)
OUT = os.environ.get('CFART_OUT', os.path.join(HERE, '..', 'out'))
GAME = os.environ.get('KRYPTA_ASSETS', os.path.join(HERE, '..', '..', 'assets'))  # läses bara
LUM = np.array([0.299, 0.587, 0.114])
BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16 - 0.5


def load_raw(name):
    return np.asarray(Image.open(glob.glob(os.path.join(RAW, name + '.*'))[0]).convert('RGB')).astype(np.float64)


def load_game(rel):
    return np.asarray(Image.open(os.path.join(GAME, rel)).convert('RGB')).astype(np.float64)


def resize(a, w, h):
    return np.asarray(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).resize((w, h), Image.LANCZOS)).astype(np.float64)


def palette_of(files):
    s = set()
    for f in files:
        try: s |= set(map(tuple, load_game('wall/' + f + '.png').reshape(-1, 3).astype(int)))
        except FileNotFoundError: print('  saknas', f)
    return np.array(sorted(s), dtype=np.float64)


def wrap(a, k):
    """Sömlös runt om: de sista k kolumnerna tonas in över de första; resultatet blir k smalare."""
    n = a.shape[1]; t = ((np.arange(k) + 0.5) / k)[None, :, None]
    b = a[:, :n - k].copy(); b[:, :k] = a[:, :k] * t + a[:, n - k:] * (1 - t)
    return b


def sky(name, parts, pal_files, H=400, kx=0.16, eq=0.85, target_L=62.0, top_L=None, gamma=1.0, sat=1.0, tint=(0, 0, 0),
        ncol=32, pull=0.3, amp=5, top=14, flip2=False, spots=()):
    """parts: [(raw, x0, x1, y0, y1)] (en eller två bilder). spots: [(raw, x, y, r)]. target_L: medelluminans (natthimlen 58.5). top_L: luminansen i de 14 översta raderna (zenit)."""
    ps = []
    for i, (r, x0, x1, y0, y1) in enumerate(parts):
        a = load_raw(r)
        for (pr, px, py, pr2) in spots:  # små fläckar (sol, måne, fågel, vattenmärke) ersätts med en kraftigt suddad omgivning
            if pr != r: continue
            b = np.asarray(Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.GaussianBlur(pr2 * 1.2))).astype(float)
            yy, xx = np.mgrid[:a.shape[0], :a.shape[1]]; k = np.clip((pr2 * 1.6 - np.hypot(xx - px, yy - py)) / (pr2 * 0.6), 0, 1)[..., None]
            a = a * (1 - k) + b * k
        a = a[y0:y1, x0:x1]
        if flip2 and i % 2: a = a[:, ::-1]
        ps.append(resize(a, 1024, H))
    # radvis färgutjämning: varje del dras mot det gemensamma lodräta medelförloppet
    prof = [p.mean(1, keepdims=True) for p in ps]; m = sum(prof) / len(prof)
    prof_s = [np.asarray(Image.fromarray(np.clip(np.repeat(q, 8, 1), 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4))).astype(float)[:, :1] for q in prof]
    m_s = sum(prof_s) / len(prof_s)
    ps = [p + eq * (m_s - q) for p, q in zip(ps, prof_s)]
    z = int(1024 * kx); t = ((np.arange(z) + 0.5) / z)[None, :, None]
    strip = ps[0]
    for p in ps[1:]:
        j = strip[:, -z:] * (1 - t) + p[:, :z] * t
        strip = np.concatenate([strip[:, :-z], j, p[:, z:]], 1)
    strip = wrap(strip, z)
    s = resize(strip, 512, 96)
    # zenit: de översta raderna speglas och tonas mot medelfärgen när man tittar upp - lugnare där
    blur = np.asarray(Image.fromarray(np.clip(s, 0, 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(6))).astype(float)
    w = np.clip(1 - np.arange(96) / top, 0, 1)[:, None, None] * 0.7
    s = s * (1 - w) + blur * w
    # färg: mättnad och ton
    L = s @ LUM
    s = L[..., None] + (s - L[..., None]) * sat + np.array(tint, dtype=float)
    # ljusstyrka: gamma på luminansen, sedan medel = target_L; valfritt zenit mot top_L (lodrät ramp)
    L = np.clip(s @ LUM, 1, 255); Lg = 255 * (L / 255) ** gamma; s = s * (Lg / L)[..., None]
    L = s @ LUM; s = s + (target_L - L.mean())
    if top_L is not None:
        cur = (s[:14] @ LUM).mean(); ramp = np.clip(1 - np.arange(96) / 48, 0, 1)[:, None, None]
        s = s + (top_L - cur) * ramp
    s = np.clip(s, 0, 255)
    h, wd, _ = s.shape
    noise = np.tile(BAYER, (h // 4 + 1, wd // 4 + 1))[:h, :wd][..., None] * amp
    d = np.clip(s + noise, 0, 255)
    im = Image.fromarray(d.astype(np.uint8)).quantize(ncol, method=Image.MEDIANCUT, dither=Image.NONE)
    pal = np.array(im.getpalette()[:ncol * 3], dtype=float).reshape(-1, 3); idx = np.asarray(im)
    if pull and pal_files:
        bp = palette_of(pal_files)
        dd = ((pal[:, None, :] - bp[None]) ** 2).sum(-1); near = bp[dd.argmin(1)]
        pal = pal * (1 - pull) + near * pull
    q = np.round(pal[idx])
    os.makedirs(os.path.join(OUT, 'preview'), exist_ok=True)
    Image.fromarray(q.astype(np.uint8)).save(os.path.join(OUT, name + '.png'), optimize=True)
    Image.fromarray(q.astype(np.uint8)).resize((512 * 3, 96 * 3), Image.NEAREST).save(os.path.join(OUT, 'preview', name + '_x3.png'))
    Image.fromarray(np.concatenate([q, q], 1).astype(np.uint8)).save(os.path.join(OUT, 'preview', name + '_wrap2.png'))
    Lq = q @ LUM; col = np.abs(np.diff(Lq, axis=1)).mean(); seam = np.abs(Lq[:, 0] - Lq[:, -1]).mean()
    print(f'{name:18s} L {Lq.mean():5.1f} zenit {Lq[:14].mean():5.1f} horisont {Lq[-20:].mean():5.1f}  färger {len(np.unique(q.reshape(-1, 3), axis=0))}'
          f'  skarv {seam:.2f} (grannkolumner {col:.2f})  {os.path.getsize(os.path.join(OUT, name + ".png"))} B')
    return q



PAL = {
    'desert': ['wall_sandstone', 'wall_dune', 'wall_mesa', 'floor_desertsand', 'floor_sand', 'wall_hieroglyph'],
    'purgatory': ['floor_brimstone', 'floor_ashfield', 'wall_bone', 'wall_flesh', 'floor_firestream', 'wall_boss_pyrelord'],
    'sky': ['wall_cloudstone', 'wall_stormwall', 'floor_cloud', 'floor_wind', 'wall_boss_thunderbird'],
    'volcano': ['floor_basalt', 'floor_ash', 'floor_lava', 'wall_obsidian', 'wall_boss_volcano'],
    'jungle': ['wall_jungle', 'wall_junglestone', 'floor_jungle', 'floor_templestone', 'floor_ground_dirt'],
    'harbor': ['wall_quay', 'wall_shack', 'floor_dock', 'floor_net', 'floor_deepwater'],
}
SKIES = {
    'desert': dict(parts=[('d_sky1', 0, 1024, 0, 700), ('d_sky2', 0, 1024, 0, 620)], target_L=62, top_L=48, sat=0.9),
    'purgatory': dict(parts=[('p_sky2', 0, 1024, 0, 960), ('p_sky4', 0, 1024, 0, 820)], spots=[('p_sky4', 205, 540, 14)], target_L=48, top_L=34, sat=0.55),
    'sky': dict(parts=[('s_sky1', 0, 1024, 0, 940), ('s_sky2', 0, 1024, 0, 1024)], spots=[('s_sky2', 970, 465, 40)], target_L=60, top_L=42),
    'volcano': dict(parts=[('v_sky1', 0, 1024, 0, 630), ('v_sky2', 0, 1024, 0, 940)], spots=[('v_sky1', 165, 85, 18), ('v_sky2', 680, 607, 10)], target_L=50, top_L=34),
    'jungle': dict(parts=[('j_sky1', 0, 1024, 0, 660), ('j_sky2', 180, 1024, 0, 770)], spots=[('j_sky1', 495, 290, 130), ('j_sky2', 700, 250, 70)], target_L=54, top_L=40, sat=0.85),
    'harbor': dict(parts=[('h_sky1', 0, 1024, 0, 660)], spots=[('h_sky1', 615, 505, 50)], target_L=54, top_L=40, sat=0.6),
}

if __name__ == '__main__':
    only = sys.argv[1:]
    for n, kw in SKIES.items():
        if only and n not in only: continue
        try: sky('sky_' + n, pal_files=PAL[n], **kw)
        except IndexError as e: print(n, 'saknar rådata', e)
