#!/usr/bin/env python3
"""Efterbehandling: Effekseer-bildrutor (out/raw/<namn>/NNN.png, svart bakgrund) -> spritestrippar i spelets pixelstil.

Steg per strip (se "strips" i effects.json):
  1. bildrutefönster: första/sista bildrutan med innehåll (eller "range"), sedan "n" bildrutor jämnt fördelade,
  2. ett gemensamt utsnitt för alla bildrutor (unionen av det som lyser), med bildförhållandet w:h;
     anchor "bottom" lägger marken i nederkanten (partikelns z är spritens underkant i spelet),
  3. nedskalning med ytmedelvärde (BOX) till w x h,
  4. "white": luminans (spelet färgar med tint) / "color": färgerna behålls,
  5. lätt Bayer-dither (4x4) och palett: "color" mot färgerna i spelets fire.png + fireball.png, "white" mot en grå trappa,
  6. alfa är 0 eller 255 (drawSprite hoppar över alfa < 100 och väger additiv RGB med alfa): svart blir genomskinligt.
Kör: python3 -I tools/effekseer/process.py   (miljö: EFK_OUT som för render.mjs; skriver assets/gfx/efx_*.png)
"""
import os, sys, json, glob
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.environ.get('EFK_OUT', os.path.join(HERE, 'out'))
GFX = os.path.join(ROOT, 'assets', 'gfx')
LUM = np.array([0.299, 0.587, 0.114])
BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16 - 0.5


def frames_of(name):
    fs = sorted(glob.glob(os.path.join(OUT, 'raw', name, '*.png')))
    if not fs: sys.exit(f'saknar bildrutor för {name}: kör render.mjs först')
    return [np.asarray(Image.open(f).convert('RGB')).astype(np.float64) for f in fs]


def game_palette(files, k):
    """Spelets eldfärger (opaka pixlar) reducerade till k färger med median cut."""
    px = []
    for f in files:
        a = np.asarray(Image.open(os.path.join(GFX, f)).convert('RGBA'))
        px.append(a[a[..., 3] > 128][:, :3])
    px = np.concatenate(px).astype(np.uint8)
    im = Image.fromarray(px.reshape(1, -1, 3)).quantize(k, method=Image.Quantize.MEDIANCUT)
    pal = np.array(im.getpalette()[:k * 3]).reshape(-1, 3).astype(np.float64)
    return np.vstack([[0, 0, 0], pal])


def nearest(a, pal):
    d = ((a[..., None, :] - pal[None, None, :, :]) ** 2).sum(-1)
    return pal[d.argmin(-1)]


def bake(s):
    fr = frames_of(s['src'])
    lum = np.array([(f @ LUM).sum() for f in fr]); thr = lum.max() * s.get('cut', 0.02)
    st, en = s.get('range') or [int(np.argmax(lum > thr)), int(len(fr) - 1 - np.argmax(lum[::-1] > thr))]
    n = s['n']; idx = [round(st + i * (en - st) / (n - 1)) for i in range(n)] if n > 1 else [st]
    if s.get('ease'):  # fler bildrutor i början (snabba förlopp)
        idx = [round(st + (en - st) * (i / (n - 1)) ** s['ease']) for i in range(n)]
    pick = [fr[i] for i in idx]
    m = np.zeros(pick[0].shape[:2], bool)
    for f in pick: m |= (f @ LUM) > s.get('bbox', 12)
    ys, xs = np.nonzero(m); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    w, h = s['w'], s['h']; bw, bh = x1 - x0, y1 - y0
    sc = max(bw / w, bh / h) * s.get('pad', 1.06); cw, ch = w * sc, h * sc
    cx = (x0 + x1) / 2; cy = (y1 - ch / 2) if s.get('anchor') == 'bottom' else (y0 + y1) / 2
    M = 256  # svart marginal: utsnittet får gå utanför den renderade bilden
    box = (cx - cw / 2 + M, cy - ch / 2 + M, cx + cw / 2 + M, cy + ch / 2 + M)
    pal = game_palette(['fire.png', 'fireball.png'], s.get('colors', 24)) if s['mode'] == 'color' else None
    levels = s.get('levels', 7)
    strip = np.zeros((h, w * n, 4), np.uint8)
    for i, f in enumerate(pick):
        a = np.asarray(Image.fromarray(np.pad(f, ((M, M), (M, M), (0, 0))).astype(np.uint8)).resize((w, h), Image.BOX, box=box)).astype(np.float64)
        a = np.clip(a * s.get('gain', 1.0), 0, 255)
        dith = np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w][..., None]
        if s['mode'] == 'white':
            L = (a @ LUM) / 255.0
            L = np.clip(L ** s.get('gamma', 0.8) + dith[..., 0] * s.get('dither', 0.6) / levels, 0, 1)
            q = np.round(L * levels) / levels * 255
            rgb = np.repeat(q[..., None], 3, -1)
        else:
            rgb = nearest(np.clip(a + dith * s.get('dither', 0.6) * 32, 0, 255), pal)
        alpha = ((rgb @ LUM) > s.get('floor', 10)).astype(np.uint8) * 255
        strip[:, i * w:(i + 1) * w, :3] = rgb.astype(np.uint8); strip[:, i * w:(i + 1) * w, 3] = alpha
    out = os.path.join(GFX, s['file'])
    Image.fromarray(strip, 'RGBA').save(out, optimize=True)
    prev = os.path.join(OUT, 'preview'); os.makedirs(prev, exist_ok=True)
    bg = Image.new('RGBA', (w * n, h), (24, 22, 30, 255)); bg.alpha_composite(Image.fromarray(strip, 'RGBA'))
    bg.resize((w * n * 4, h * 4), Image.NEAREST).save(os.path.join(prev, s['file']))
    print(f"{s['file']}: {n} bildrutor {w}x{h} från {s['src']}[{idx[0]}..{idx[-1]}], {os.path.getsize(out)} byte")


if __name__ == '__main__':
    conf = json.load(open(os.path.join(HERE, 'effects.json')))
    only = sys.argv[1:]
    for s in conf['strips']:
        if not only or s['file'] in only or s['src'] in only: bake(s)
