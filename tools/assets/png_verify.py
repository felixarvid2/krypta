# Jämför en omkodad assets-katalog mot en referenskopia. Avslutar med kod 1 vid minsta avvikelse.
#   python3 -I tools/assets/png_verify.py <ny assets> <referens assets> [--deleted rel/väg ...] [--no-ffmpeg]
# Kontrollerar: samma filmängd (utom uttryckligen borttagna), icke-PNG byte för byte lika, PNG: samma storlek,
# samma RGBA-pixlar (Pillow) och samma färgchunkar (sRGB, gAMA, cHRM, iCCP, sBIT) byte för byte, och för ändrade
# PNG även samma RGBA avkodat med en andra avkodare (ffmpeg, -pix_fmt rgba).
import os, sys, struct, subprocess
import numpy as np
from PIL import Image

KEEP = (b'sRGB', b'gAMA', b'cHRM', b'iCCP', b'sBIT')

def colour_chunks(d):
    i, out = 8, []
    while i < len(d):
        L, = struct.unpack('>I', d[i:i + 4]); t = d[i + 4:i + 8]
        if t in KEEP: out.append((t, d[i + 8:i + 8 + L]))
        i += 12 + L
    return out

def ff(path, w, h):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], capture_output=True)
    if r.returncode: raise RuntimeError(r.stderr.decode())
    return np.frombuffer(r.stdout, np.uint8).reshape(h, w, 4)

def main():
    new, ref = sys.argv[1], sys.argv[2]; args = sys.argv[3:]
    deleted = set(); use_ff = '--no-ffmpeg' not in args
    if '--deleted' in args:
        for a in args[args.index('--deleted') + 1:]:
            if a.startswith('--'): break
            deleted.add(a)
    files = lambda root: {os.path.relpath(os.path.join(dp, f), root) for dp, _, fs in os.walk(root) for f in fs}
    fn, fr = files(new), files(ref); bad = []
    for p in sorted(fn - fr): bad.append('ny fil som inte finns i referensen: ' + p)
    for p in sorted(fr - fn):
        if p not in deleted: bad.append('saknas: ' + p)
    for p in sorted(deleted & fn): bad.append('skulle vara borttagen: ' + p)
    nsame = nchg = nff = 0; b0 = b1 = 0
    for p in sorted(fn & fr):
        a, b = open(os.path.join(ref, p), 'rb').read(), open(os.path.join(new, p), 'rb').read(); b0 += len(a); b1 += len(b)
        if a == b: nsame += 1; continue
        if not p.endswith('.png'): bad.append('icke-PNG ändrad: ' + p); continue
        nchg += 1
        ia, ib = Image.open(os.path.join(ref, p)), Image.open(os.path.join(new, p))
        if ia.size != ib.size: bad.append('storlek: ' + p); continue
        ra, rb = np.asarray(ia.convert('RGBA')), np.asarray(ib.convert('RGBA'))
        if not np.array_equal(ra, rb): bad.append('RGBA (Pillow): ' + p); continue
        if colour_chunks(a) != colour_chunks(b): bad.append('färgchunkar: ' + p); continue
        if use_ff:
            w, h = ia.size
            try:
                fa, fb = ff(os.path.join(ref, p), w, h), ff(os.path.join(new, p), w, h)
                if not np.array_equal(fa, fb): bad.append('RGBA (ffmpeg): ' + p); continue
                if not np.array_equal(fb, rb): bad.append('ffmpeg och Pillow är oense om den nya filen: ' + p); continue
                nff += 1
            except Exception as e: bad.append('ffmpeg: %s %s' % (p, e))
    print('%d filer lika, %d PNG omkodade (%d även kontrollerade med ffmpeg), %d borttagna; %d -> %d byte' % (nsame, nchg, nff, len(deleted), b0, b1))
    for x in bad[:50]: print('FEL', x)
    print('KONTROLL OK' if not bad else 'KONTROLL MISSLYCKADES (%d fel)' % len(bad))
    sys.exit(1 if bad else 0)

if __name__ == '__main__': main()
