# Förlustfri PNG-omkodning med Pillow (avkodning) + egen kodare (numpy + zlib).
# Provar färgtyp (RGBA, RGB, RGB+tRNS, grå, grå+alfa, palett+tRNS, lägre bitdjup), filter (0-4 + adaptivt)
# och zlib-strategier; skriver bara om resultatet är mindre. Färgchunkar (sRGB, gAMA, cHRM, iCCP, sBIT) kopieras byte för byte.
#   python3 -I tools/assets/pngopt.py <katalog> [--dry]       (version 29: kördes på assets/gfx, assets/wall och assets/touch)
# Kontrollera alltid efteråt mot en kopia av katalogen före körningen: python3 -I tools/assets/png_verify.py <ny> <kopia>.
# assets/cards lämnades orörd i version 29: korten är fullfärg (>256 färger) och blir bara 2 % mindre, men artefaktens
# kortpaket (p-cards-1, 10,7 MB) skulle då behöva laddas upp och hämtas på nytt.
# 16-bitarsbilder hoppas över. Utfallet är deterministiskt (samma indata ger samma fil).
import os, sys, struct, zlib
import numpy as np
from PIL import Image

KEEP = (b'sRGB', b'gAMA', b'cHRM', b'iCCP', b'sBIT')
SIG = b'\x89PNG\r\n\x1a\n'

def chunks(d):
    i = 8
    while i < len(d):
        L, = struct.unpack('>I', d[i:i + 4]); t = d[i + 4:i + 8]
        yield t, d[i + 8:i + 8 + L]; i += 12 + L

def chunk(t, data): return struct.pack('>I', len(data)) + t + data + struct.pack('>I', zlib.crc32(t + data) & 0xffffffff)

def pack_bits(a, bd):  # a: h x w uint8 värden < 2**bd -> h x ceil(w*bd/8)
    if bd == 8: return a
    h, w = a.shape; per = 8 // bd; W = (w + per - 1) // per
    p = np.zeros((h, W * per), np.uint8); p[:, :w] = a
    p = p.reshape(h, W, per).astype(np.uint16)
    out = np.zeros((h, W), np.uint16)
    for k in range(per): out |= p[:, :, k] << (8 - bd * (k + 1))
    return out.astype(np.uint8)

def filters(raw, bpp):  # raw: h x rowbytes uint8 -> dict filtertyp -> h x rowbytes (filtrerat)
    r = raw.astype(np.int16); h, n = r.shape
    left = np.zeros_like(r); left[:, bpp:] = r[:, :-bpp]
    up = np.zeros_like(r); up[1:] = r[:-1]
    ul = np.zeros_like(r); ul[1:, bpp:] = r[:-1, :-bpp]
    p = left + up - ul; pa = np.abs(p - left); pb = np.abs(p - up); pc = np.abs(p - ul)
    pred = np.where((pa <= pb) & (pa <= pc), left, np.where(pb <= pc, up, ul))
    return {0: raw, 1: ((r - left) & 255).astype(np.uint8), 2: ((r - up) & 255).astype(np.uint8),
            3: ((r - ((left + up) >> 1)) & 255).astype(np.uint8), 4: ((r - pred) & 255).astype(np.uint8)}

def streams(raw, bpp):
    f = filters(raw, bpp); h = raw.shape[0]
    for t, a in f.items(): yield np.concatenate([np.full((h, 1), t, np.uint8), a], 1).tobytes()
    # adaptivt: minsta summa av |signerade| byte per rad
    cost = np.stack([np.abs(f[t].astype(np.int8).astype(np.int16)).sum(1) for t in range(5)])
    best = cost.argmin(0)
    rows = np.stack([f[t] for t in range(5)])[best, np.arange(h)]
    yield np.concatenate([best.astype(np.uint8)[:, None], rows], 1).tobytes()

def deflate(b):
    best = None
    for strat in (zlib.Z_DEFAULT_STRATEGY, zlib.Z_FILTERED):
        for wb in (15,):
            c = zlib.compressobj(9, zlib.DEFLATED, wb, 9, strat); z = c.compress(b) + c.flush()
            if best is None or len(z) < len(best): best = z
    return best

def candidates(px):  # px: h x w x 4 uint8 (RGBA)
    h, w, _ = px.shape
    a = px[:, :, 3]; opaque = bool((a == 255).all())
    grey = bool(((px[:, :, 0] == px[:, :, 1]) & (px[:, :, 1] == px[:, :, 2])).all())
    yield 6, 8, px.reshape(h, w * 4), 4, b''
    if opaque:
        yield 2, 8, px[:, :, :3].reshape(h, w * 3), 3, b''
    else:  # RGB + tRNS: allt är antingen helt ogenomskinligt eller helt genomskinligt med en enda färg som inte finns bland de ogenomskinliga
        if bool(((a == 0) | (a == 255)).all()):
            tr = px[a == 0][:, :3]
            if len(np.unique(tr, axis=0)) == 1:
                c = tr[0]; op = px[a == 255][:, :3]
                if not bool((op == c).all(1).any()):
                    yield 2, 8, px[:, :, :3].reshape(h, w * 3), 3, chunk(b'tRNS', struct.pack('>HHH', *map(int, c)))
    if grey:
        g = px[:, :, 0]
        if opaque:
            for bd, s in ((1, 255), (2, 85), (4, 17), (8, 1)):
                if bool((g % s == 0).all()):
                    yield 0, bd, pack_bits(g // s, bd), 1, b''; break
        yield 4, 8, px[:, :, [0, 3]].reshape(h, w * 2), 2, b''
    flat = px.reshape(-1, 4).view(np.uint32).ravel()
    u, inv, cnt = np.unique(flat, return_inverse=True, return_counts=True)
    if len(u) <= 256:
        cols = u.view(np.uint8).reshape(-1, 4)
        orders = [np.lexsort((-cnt, cols[:, 3] == 255)),                       # genomskinliga först, sedan efter frekvens
                  np.lexsort((cols[:, 0].astype(int) * 3 + cols[:, 1].astype(int) * 6 + cols[:, 2], cols[:, 3] == 255))]  # efter ljushet
        bd = 1 if len(u) <= 2 else 2 if len(u) <= 4 else 4 if len(u) <= 16 else 8
        for o in orders:
            rank = np.empty(len(u), np.int64); rank[o] = np.arange(len(u))
            idx = rank[inv.ravel()].reshape(h, w).astype(np.uint8)
            pal = cols[o]; plte = chunk(b'PLTE', pal[:, :3].tobytes())
            al = pal[:, 3]; nt = int(np.nonzero(al != 255)[0].max()) + 1 if (al != 255).any() else 0
            trns = chunk(b'tRNS', al[:nt].tobytes()) if nt else b''
            yield 3, bd, pack_bits(idx, bd), 1, plte + trns
            if bd < 8: yield 3, 8, idx, 1, plte + trns

def encode(path):
    d = open(path, 'rb').read(); assert d[:8] == SIG
    cs = list(chunks(d)); hdr = dict(cs)[b'IHDR']
    w, h, bd0, ct0, _, _, il = struct.unpack('>IIBBBBB', hdr)
    if bd0 == 16: return None, d
    keep = b''.join(chunk(t, x) for t, x in cs if t in KEEP)
    im = Image.open(path); im.load(); px = np.asarray(im.convert('RGBA')).copy()
    best = None
    for ct, bd, raw, bpp, extra in candidates(px):
        bpp = max(1, bpp * bd // 8)
        for s in streams(np.ascontiguousarray(raw), bpp):
            z = deflate(s)
            if best is None or len(z) + len(extra) < best[0]:
                best = (len(z) + len(extra), ct, bd, extra, z)
    _, ct, bd, extra, z = best
    out = SIG + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, bd, ct, 0, 0, 0)) + keep + extra + chunk(b'IDAT', z) + chunk(b'IEND', b'')
    return out, d

def main():
    root = sys.argv[1]; dry = '--dry' in sys.argv
    tot0 = tot1 = n = 0
    files = sorted(os.path.join(dp, f) for dp, _, fs in os.walk(root) for f in fs if f.endswith('.png'))
    for p in files:
        out, d = encode(p); tot0 += len(d)
        if out is not None and len(out) < len(d):
            # kontroll direkt: samma RGBA
            import io
            a = np.asarray(Image.open(p).convert('RGBA')); b = np.asarray(Image.open(io.BytesIO(out)).convert('RGBA'))
            assert a.shape == b.shape and (a == b).all(), p
            if not dry: open(p, 'wb').write(out)
            tot1 += len(out); n += 1
        else: tot1 += len(d)
    print('%d filer, %d omkodade, %d -> %d byte (%.1f %%)' % (len(files), n, tot0, tot1, 100 * (tot1 - tot0) / tot0))

if __name__ == '__main__': main()
