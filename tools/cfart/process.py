#!/usr/bin/env python3
"""Efterbehandling av Cloudflare-bilder till Krypta-texturer.

Steg per textur (se ASSETS längst ned):
  1. utsnitt ur rådatan (crop) - för mönster med fogar väljs bredd/höjd som en hel period (autokorrelation),
  2. sömlöst: korsblandning över kanten (wrap) vågrätt och lodrätt - kort zon för fogmönster, lång för lera/halm,
  3. nedskalning till exakt storlek (64x128 vägg, 64x64 golv, 512x96 himmel),
  4. ljusstyrka: luminansens medel och spridning matchas mot den gamla texturen som ersätts,
  5. palett: biomens befintliga texturer (unionen av deras färger, ~200 st), lätt Bayer-dither (4x4, låg amplitud),
     sedan högst MAXC färger per textur (de mest använda) och en ny mappning - de gamla har 30-40 färger var.
Kör: python3 -I process.py   (läser ../raw, skriver ../out och ../out/preview)
"""
import os, sys, glob
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..')
RAW, OUT = os.path.join(ROOT, 'raw'), os.path.join(ROOT, 'out')
GAME = '/home/user/krypta/assets'  # läses bara
os.makedirs(os.path.join(OUT, 'preview'), exist_ok=True)
LUM = np.array([0.299, 0.587, 0.114])
BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16 - 0.5
MAXC = 40


def load_raw(name):
    return np.asarray(Image.open(glob.glob(os.path.join(RAW, name + '.*'))[0]).convert('RGB')).astype(np.float64)


def load_game(rel):
    return np.asarray(Image.open(os.path.join(GAME, rel)).convert('RGB')).astype(np.float64)


def best_period(a, axis, lo, hi):
    """Förskjutningen s i [lo, hi] där bilden liknar sig själv mest (fogmönster upprepas)."""
    g = np.asarray(Image.fromarray((a @ LUM).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))).astype(float)
    if axis == 1: g = g.T
    n = g.shape[0]; best, bs = 1e9, lo
    for s in range(lo, min(hi, n - 16) + 1):
        e = np.abs(g[:n - s] - g[s:]).mean()
        if e < best: best, bs = e, s
    return bs, best


def wrap(a, axis, k):
    """Sömlös över kanten: de sista k raderna/kolumnerna tonas in över de första; resultatet blir k kortare."""
    if axis == 1: a = a.transpose(1, 0, 2)
    n = a.shape[0]; t = ((np.arange(k) + 0.5) / k)[:, None, None]
    b = a[:n - k].copy(); b[:k] = a[:k] * t + a[n - k:] * (1 - t)
    return b.transpose(1, 0, 2) if axis == 1 else b


def resize(a, w, h):
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).resize((w, h), Image.LANCZOS)
    return np.asarray(im).astype(np.float64)


def match_lum(a, ref, k_col=0.35):
    """Luminansens medel/spridning som ref; färgtonen dras k_col mot ref:s medelfärg."""
    L = a @ LUM; Lr = ref.reshape(-1, 3) @ LUM
    L2 = (L - L.mean()) / max(L.std(), 1e-3) * Lr.std() + Lr.mean()
    out = a + (L2 - L)[..., None]
    mc, mr = out.reshape(-1, 3).mean(0), ref.reshape(-1, 3).mean(0)
    out = out + k_col * ((mr - mr @ LUM) - (mc - mc @ LUM))
    return np.clip(out, 0, 255)


def palette_of(files):
    s = set()
    for f in files: s |= set(map(tuple, load_game(f).reshape(-1, 3).astype(int)))
    return np.array(sorted(s), dtype=np.float64)


def nearest(a, pal):
    flat = a.reshape(-1, 3); idx = np.empty(len(flat), dtype=np.int64)
    for i in range(0, len(flat), 8192):
        d = ((flat[i:i + 8192, None, :] - pal[None]) ** 2).sum(-1); idx[i:i + 8192] = d.argmin(1)
    return idx


def quantize(a, pal, amp=10, maxc=MAXC):
    h, w, _ = a.shape
    noise = np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w][..., None] * amp
    d = np.clip(a + noise, 0, 255)
    idx = nearest(d, pal)
    if maxc:
        used, cnt = np.unique(idx, return_counts=True)
        pal = pal[used[np.argsort(-cnt)][:maxc]]; idx = nearest(d, pal)
    return pal[idx].reshape(h, w, 3)


def save(a, name):
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(os.path.join(OUT, name + '.png'))


def preview(a, name, tiles=(3, 3), scale=3):
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)); w, h = im.size
    big = Image.new('RGB', (w * tiles[0], h * tiles[1]))
    for y in range(tiles[1]):
        for x in range(tiles[0]): big.paste(im, (x * w, y * h))
    big.resize((big.width * scale, big.height * scale), Image.NEAREST).save(os.path.join(OUT, 'preview', name + '_3x3.png'))


def texture(name, raw, out_name, ref, pal, size, crop=None, per=None, kx=0.12, ky=0.12, amp=10, k_col=0.35):
    """crop=(x0, y0, w, h) i rådatan; per={'x': (lo, hi), 'y': (lo, hi)} väljer w/h som en hel period i stället."""
    a = load_raw(raw)
    x0, y0, cw, ch = crop or (0, 0, 0, 0)
    cw, ch = cw or a.shape[1] - x0, ch or a.shape[0] - y0  # 0 = resten av bilden
    info = []
    if per and 'x' in per:
        cw, e = best_period(a[y0:y0 + ch, x0:], 1, *per['x']); info.append(f'period x {cw} ({e:.1f})')
    if per and 'y' in per:
        ch, e = best_period(a[y0:, x0:x0 + cw], 0, *per['y']); info.append(f'period y {ch} ({e:.1f})')
    zx, zy = int(cw * kx), int(ch * ky)  # blandningszonen tas utöver perioden (perioden blir exakt bredden efter wrap)
    c = a[y0:y0 + ch + zy, x0:x0 + cw + zx]
    if zx: c = wrap(c, 1, zx)
    if zy: c = wrap(c, 0, zy)
    c = resize(c, *size)
    c = match_lum(c, load_game(ref), k_col)
    q = quantize(c, pal, amp)
    save(q, out_name); preview(q, out_name)
    L, Lr = (q @ LUM), (load_game(ref).reshape(-1, 3) @ LUM)
    print(f'{out_name:28s} crop {cw}x{ch}@{x0},{y0} {" ".join(info)} -> {size}  L {L.mean():.1f}/{L.std():.1f} (gammal {Lr.mean():.1f}/{Lr.std():.1f})  färger {len(np.unique(q.reshape(-1, 3), axis=0))}')
    return q


def sky(raws, out_name, size=(512, 96), crop_bottom=0, kx=0.08, target_L=64.0, ncol=32, amp=6, top=14):
    """Himmelspanorama: rådatabilderna läggs efter varandra med korsblandning i skarvarna (även runt om), 512x96."""
    parts = [load_raw(r) for r in raws]
    if crop_bottom: parts = [p[:p.shape[0] - crop_bottom] for p in parts]
    z = int(parts[0].shape[1] * kx); t = ((np.arange(z) + 0.5) / z)[None, :, None]
    strip = parts[0]
    for p in parts[1:]:
        j = strip[:, -z:] * (1 - t) + p[:, :z] * t
        strip = np.concatenate([strip[:, :-z], j, p[:, z:]], 1)
    strip = wrap(strip, 1, z)  # sista bilden tonas över i den första: sömlös runt 360°
    s = resize(strip, *size)
    # de översta raderna speglas och tonas mot zenitfärgen när man tittar upp: gör dem lugnare
    blur = np.asarray(Image.fromarray(s.astype(np.uint8)).filter(ImageFilter.BoxBlur(6))).astype(float)
    w = np.clip(1 - np.arange(size[1]) / top, 0, 1)[:, None, None] * 0.7
    s = s * (1 - w) + blur * w
    L = s @ LUM; s = np.clip(s + (target_L - L.mean()), 0, 255)
    h, wd, _ = s.shape
    noise = np.tile(BAYER, (h // 4 + 1, wd // 4 + 1))[:h, :wd][..., None] * amp
    im = Image.fromarray(np.clip(s + noise, 0, 255).astype(np.uint8)).quantize(ncol, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    q = np.asarray(im).astype(float)
    save(q, out_name)
    Image.fromarray(q.astype(np.uint8)).resize((size[0] * 3, size[1] * 3), Image.NEAREST).save(os.path.join(OUT, 'preview', out_name + '_x3.png'))
    two = np.concatenate([q, q], 1); Image.fromarray(two.astype(np.uint8)).save(os.path.join(OUT, 'preview', out_name + '_wrap2.png'))
    old = load_game('gfx/sky_night.png') @ LUM
    print(f'{out_name:28s} {strip.shape[1]}x{strip.shape[0]} -> {size}  L {(q @ LUM).mean():.1f} (sky_night {old.mean():.1f})  färger {len(np.unique(q.reshape(-1, 3), axis=0))}')


if __name__ == '__main__':
    W = 'wall/'
    P_PAL = palette_of([W + f for f in ['wall_prisonstone.png', 'wall_cellbars.png', 'floor_prison.png', 'floor_straw.png', 'wall_boss_executioner.png', 'floor_boss_executioner.png']])
    B_PAL = palette_of([W + f for f in ['wall_palisade.png', 'wall_earthwork.png', 'floor_battlemud.png', 'floor_trench.png', 'wall_boss_warlord.png', 'floor_boss_warlord.png']])
    print('paletter: fängelset', len(P_PAL), 'slagfältet', len(B_PAL))
    only = sys.argv[1:]
    A = [  # (utnamn, kwargs)
        ('wall_prisonstone_a', dict(raw='m_dev', ref=W + 'wall_prisonstone.png', pal=P_PAL, size=(64, 128), crop=(0, 0, 0, 0), per={'x': (960, 980), 'y': (900, 915)}, kx=0.05, ky=0.05)),
        ('wall_prisonstone_b', dict(raw='p_wall2', ref=W + 'wall_prisonstone.png', pal=P_PAL, size=(64, 128), crop=(0, 0, 0, 0), per={'x': (780, 840), 'y': (820, 850)}, kx=0.05, ky=0.05)),
        ('wall_cellbars_a', dict(raw='p_bars', ref=W + 'wall_cellbars.png', pal=P_PAL, size=(64, 128), crop=(80, 0, 0, 1024), per={'x': (595, 610)}, kx=0.05, ky=0)),
        ('floor_prison_a', dict(raw='p_floor', ref=W + 'floor_prison.png', pal=P_PAL, size=(64, 64), crop=(60, 60, 0, 0), per={'x': (300, 315), 'y': (300, 315)}, kx=0.08, ky=0.08)),
        ('floor_straw_a', dict(raw='p_straw', ref=W + 'floor_straw.png', pal=P_PAL, size=(64, 64), crop=(130, 130, 520, 520), kx=0.3, ky=0.3)),
        ('floor_straw_b', dict(raw='p_straw2', ref=W + 'floor_straw.png', pal=P_PAL, size=(64, 64), crop=(0, 0, 820, 820), kx=0.2, ky=0.2)),
        ('floor_battlemud_a', dict(raw='b_mud', ref=W + 'floor_battlemud.png', pal=B_PAL, size=(64, 64), crop=(0, 0, 640, 640), kx=0.3, ky=0.3)),
        ('floor_trench_a', dict(raw='b_trench', ref=W + 'floor_trench.png', pal=B_PAL, size=(64, 64), crop=(0, 0, 0, 512), per={'x': (505, 515)}, kx=0.1, ky=0.25)),
    ]
    for n, kw in A:
        if only and n not in only: continue
        try: texture(n, out_name=n, **kw)
        except Exception as e: print(n, 'FEL', e)
    if not only or 'sky_battlefield' in only:
        sky(['b_sky1', 'b_sky2'], 'sky_battlefield', crop_bottom=20)
