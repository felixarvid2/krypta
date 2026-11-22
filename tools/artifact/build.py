# Bygger artefakten: index.html (kod + laddarshim) + stabila paketfiler med tillgångarna.
#
#   KRYPTA_ROOT=/home/user/krypta python3 build_art2.py            bygg; lista paket som ändrats sedan senaste publicering
#   python3 build_art2.py --mark-published                          (efter publicering) gör nuvarande paket till ny baslinje
#   KRYPTA_PACK=bin ...                                             experimentellt: binära .bin-paket i stället för base64-JSON
#   KRYPTA_MANIFEST=/väg/manifest.json ...                          annan manifestfil (för tester; standard art_manifest_stable.json)
#
# Stabila paket: art_manifest_stable.json minns vilka filer (och i vilken ordning) som ligger i varje paket.
# En fil som en gång lagts i ett paket stannar där. Nya filer grupperas (music, snd, enemies, boss, cards, wall, misc) och läggs
# i gruppens senaste paket om det är "öppet" (< SEAL byte) och får plats, annars i ett nytt paket. Paket som nått SEAL ändras
# alltså aldrig av nya filer – bara om en av deras egna filer ändras eller tas bort.
import os, re, sys, json, base64, hashlib, struct, shutil
ROOT = os.environ.get('KRYPTA_ROOT', os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))); SP = os.path.join(os.path.dirname(os.path.abspath(__file__)), '')
OUT = os.path.join(os.environ.get('KRYPTA_OUT', SP + 'out/'), ''); os.makedirs(OUT, exist_ok=True)
MAN = os.environ.get('KRYPTA_MANIFEST', SP + 'manifest_stable.json')
SHA_LAST = os.path.splitext(MAN)[0] + '.last_sha256.json'       # paketens sha256 vid förra bygget
SHA_PUB = os.path.splitext(MAN)[0] + '.published_sha256.json'   # paketens sha256 vid senaste --mark-published
PLAN = os.path.splitext(MAN)[0] + '.publish_plan.json'          # vad som ska laddas upp/tas bort nästa publicering
FMT = os.environ.get('KRYPTA_PACK', 'json'); assert FMT in ('json', 'bin'), FMT
TARGET, SEAL, CAP = 11_000_000, 3_000_000, 12_000_000  # fyllnadsmål, "förseglat" över, hård gräns per paketfil (byte)
PACK_RE = re.compile(r'^(pack\d+\.json|p-[a-z0-9]+-\d+\.(json|bin))$')

if '--mark-published' in sys.argv:
    shutil.copy(SHA_LAST, SHA_PUB); print('baslinje för publicering uppdaterad:', SHA_PUB); sys.exit(0)

REMOVE = []  # css/cards.css och assets/cards/back.png togs bort i version 19 för att ge plats åt paketen
pub = set()  # allt läggs i paketen (inga resurser publiceras som lösa filer)
MIME = {'.png': 'image/png', '.ogg': 'audio/ogg', '.ttf': 'font/ttf', '.json': 'application/json'}
raw = {}
for root, _, fs in os.walk(ROOT + '/assets'):
    for f in sorted(fs):
        p = os.path.relpath(os.path.join(root, f), ROOT); ext = os.path.splitext(f)[1].lower()
        if p in pub or ext not in MIME: continue
        raw[p] = open(os.path.join(ROOT, p), 'rb').read()
b64 = {}
def enc(p):
    if p not in b64: b64[p] = base64.b64encode(raw[p]).decode()
    return b64[p]
def cost(p): return (len(raw[p]) + 2) // 3 * 4 + len(p) + 8 if FMT == 'json' else len(raw[p]) + len(p) + 24

def group(p):
    for pre, g in (('assets/music/', 'music'), ('assets/snd/', 'snd'), ('assets/gfx/enemies', 'enemies'), ('assets/gfx/boss_', 'boss'), ('assets/cards/', 'cards'), ('assets/wall/', 'wall')):
        if p.startswith(pre): return g
    return 'misc'

# ---- manifest: befintliga paket behåller sina filer (borttagna filer faller bort), nya filer läggs till ----
man = json.load(open(MAN)) if os.path.exists(MAN) else {'version': 1, 'packs': {}}
packs = {}  # namn -> {'group', 'files'} i manifestordning (paketordningen = ordningen de skapades)
gone = []
for n, pk in man['packs'].items():
    fs = [p for p in pk['files'] if p in raw]; gone += [p for p in pk['files'] if p not in raw]
    if fs: packs[n] = {'group': pk['group'], 'files': fs}
evicted = []  # en fil som vuxit så att paketet går över CAP: sista filerna flyttas ut och placeras som nya
for n, pk in packs.items():
    while len(pk['files']) > 1 and sum(cost(q) for q in pk['files']) > CAP: evicted.append(pk['files'].pop())
placed = {p for pk in packs.values() for p in pk['files']}
new = sorted(p for p in raw if p not in placed)
appended, created = {}, []
for p in sorted(new, key=lambda p: (group(p), p)):
    g = group(p); mine = [n for n in packs if packs[n]['group'] == g]
    last = mine[-1] if mine else None
    size = sum(cost(q) for q in packs[last]['files']) if last else 0
    fresh = last in created  # paket som skapas i detta bygge fylls till TARGET, äldre bara medan de är öppna (< SEAL)
    if last and size + cost(p) <= TARGET and (fresh or size < SEAL):
        packs[last]['files'].append(p)
        if not fresh: appended.setdefault(last, []).append(p)
    else:
        i = 1 + max([int(n.rsplit('-', 1)[1]) for n in mine] or [0]); n = 'p-%s-%d' % (g, i)
        packs[n] = {'group': g, 'files': [p]}; created.append(n)

# ---- skriv paketfilerna (deterministiskt: bara manifestets ordning styr innehållet) ----
def pack_bytes(files):
    if FMT == 'json':
        return ('{' + ','.join(json.dumps(p) + ':"' + enc(p) + '"' for p in files) + '}').encode()
    idx, off = [], 0
    for p in files: idx.append([p, off, len(raw[p])]); off += len(raw[p])
    ij = json.dumps(idx, separators=(',', ':'), ensure_ascii=False).encode()
    return b'KPK1' + struct.pack('<I', len(ij)) + ij + b''.join(raw[p] for p in files)
prev_present = {}  # det som ligger i utkatalogen innan bygget (används som baslinje om ingen finns)
for f in os.listdir(OUT):
    if PACK_RE.match(f): prev_present[f] = hashlib.sha256(open(OUT + f, 'rb').read()).hexdigest()
names, info, shas = [], [], {}
for n, pk in packs.items():
    data = pack_bytes(pk['files']); fn = n + '.' + FMT
    assert len(data) <= CAP or len(pk['files']) == 1, (fn, len(data))
    if len(data) > CAP: print('VARNING: %s är %d byte (en enda fil större än gränsen)' % (fn, len(data)))
    if not os.path.exists(OUT + fn) or open(OUT + fn, 'rb').read() != data: open(OUT + fn, 'wb').write(data)
    shas[fn] = hashlib.sha256(data).hexdigest(); names.append(fn); info.append([fn, len(data), len(pk['files'])])
for f in prev_present:
    if f not in shas: os.remove(OUT + f)  # gamla paketfiler (t.ex. pack1..6.json) ska inte ligga kvar
json.dump({'version': 1, 'target': TARGET, 'seal': SEAL, 'packs': packs}, open(MAN, 'w'), indent=0, ensure_ascii=False)  # först när alla paket är skrivna

# ---- index.html ----
SHIM = r'''(() => { // Krypta-artefakten: tillgångarna ligger i paketfiler som hämtas asynkront (parallellt, med förlopp och ett omförsök per paket).
  // Spelets skript ligger som <script type="text/plain" data-krypta> och körs i ordning först när alla paket är inne.
  // Sökvägar under assets/ pekas om till blob-adresser (img.src, fetch, CSS-url, setProperty, nya <img>).
  const PK = __PACKS__, BIN = __BIN__; // [[fil, byte, antal filer], ...]
  const D = window.__INL = {}, M = { png: 'image/png', ogg: 'audio/ogg', ttf: 'font/ttf', json: 'application/json' }, B = {};
  const me = document.currentScript, nonce = me && me.nonce, F = window.fetch.bind(window), t0 = performance.now();
  const type = k => M[k.split('.').pop()] || '';
  const unb64 = s => { if (Uint8Array.fromBase64) return Uint8Array.fromBase64(s); const t = atob(s), a = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) a[i] = t.charCodeAt(i); return a; };
  const norm = u => { try { const a = new URL(String(u), location.href); return decodeURIComponent(a.pathname).replace(/^.*?(assets\/)/, '$1'); } catch (e) { return String(u); } };
  const res = u => { if (typeof u !== 'string' || u.startsWith('data:') || u.startsWith('blob:')) return u; const k = norm(u), v = D[k]; if (!v) return u;
    return B[k] || (B[k] = URL.createObjectURL(v)); };
  window.__res = res;
  const d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src'); Object.defineProperty(HTMLImageElement.prototype, 'src', { get() { return d.get.call(this); }, set(v) { d.set.call(this, res(v)); }, configurable: true });
  window.fetch = (u, o) => F(typeof u === 'string' ? res(u) : u, o);
  const fixUrl = v => typeof v === 'string' ? v.replace(/url\((["']?)([^)"']+)\1\)/g, (m, q, u) => 'url("' + res(u) + '")') : v;
  for (const k of ['maskImage', 'webkitMaskImage', 'backgroundImage', 'background']) { const pd = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, k); if (pd && pd.set) Object.defineProperty(CSSStyleDeclaration.prototype, k, { get() { return pd.get.call(this); }, set(v) { pd.set.call(this, fixUrl(v)); }, configurable: true }); }
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) for (const im of [n, ...n.querySelectorAll('img')]) if (im.tagName === 'IMG') { const v = im.getAttribute('src'); if (v && res(v) !== v) im.src = v; } }).observe(document.documentElement, { childList: true, subtree: true });
  const sp = CSSStyleDeclaration.prototype.setProperty; CSSStyleDeclaration.prototype.setProperty = function (n, v, p) { return sp.call(this, n, fixUrl(v), p); };

  // ---- förlopp: startskärmens statusrad och laddningsstapel om de finns, annars en egen ruta ----
  let st = document.getElementById('status'), bar = document.getElementById('loadbar');
  if (!st) { st = document.createElement('div'); st.id = 'kpload'; st.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;font:14px monospace;color:#ddd;text-align:center'; (document.body || document.documentElement).appendChild(st); }
  const TOT = PK.reduce((s, p) => s + p[1], 0), got = {}; let shown = 0;
  const show = force => { const now = performance.now(); if (!force && now - shown < 120) return; shown = now;
    const g = Object.values(got).reduce((a, b) => a + b, 0);
    st.textContent = 'Hämtar spelets filer… ' + (Math.min(g, TOT) / 1e6).toFixed(1) + ' av ' + (TOT / 1e6).toFixed(1) + ' MB';
    if (bar) bar.style.width = (100 * Math.min(g, TOT) / TOT).toFixed(1) + '%'; };

  // ---- hämta ett paket; kastar vid nätfel, fel status, fel storlek eller trasigt innehåll ----
  const get = async (n, size, cnt, retry) => {
    got[n] = 0; const r = await F(n, retry ? { cache: 'reload' } : {});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const ch = [], rd = r.body && r.body.getReader();
    if (rd) for (;;) { const x = await rd.read(); if (x.done) break; ch.push(x.value); got[n] += x.value.length; show(); }
    else ch.push(new Uint8Array(await r.arrayBuffer()));
    const blob = new Blob(ch); if (blob.size !== size) throw new Error('fel storlek ' + blob.size + ' (väntat ' + size + ')');
    const out = {}; let k = 0;
    if (BIN) { const h = new DataView(await blob.slice(0, 8).arrayBuffer()); if (h.getUint32(0, true) !== 0x314B504B) throw new Error('fel format');
      const L = h.getUint32(4, true), base = 8 + L; for (const [p, o, l] of JSON.parse(await blob.slice(8, base).text())) { out[p] = blob.slice(base + o, base + o + l, type(p)); k++; } }
    else { const j = JSON.parse(await blob.text()); for (const p in j) { out[p] = new Blob([unb64(j[p])], { type: type(p) }); k++; } }
    if (k !== cnt) throw new Error(k + ' filer (väntat ' + cnt + ')');
    got[n] = size; return out; };

  const fail = [];
  const one = async ([n, size, cnt]) => {
    let out; try { out = await get(n, size, cnt, false); }
    catch (e) { console.warn('paket misslyckades, försöker igen:', n, e); got[n] = 0; show(true); await new Promise(r => setTimeout(r, 700));
      try { out = await get(n, size, cnt, true); } catch (e2) { console.error('paket misslyckades igen:', n, e2); got[n] = 0; fail.push(n + ' (' + (e2 && e2.message || e2) + ')'); return; } }
    Object.assign(D, out); show(true); };
  let next = 0; const worker = async () => { while (next < PK.length) await one(PK[next++]); };
  show(true);
  Promise.all([worker(), worker(), worker()]).then(() => {
    window.__kpTime = Math.round(performance.now() - t0);
    if (fail.length) { // tydligt fel: vilket paket, och att man ska ladda om. Spelet startas inte.
      st.textContent = 'FEL: kunde inte hämta ' + fail.join(', ') + '. Kontrollera nätet och ladda om sidan.';
      st.style.color = '#ff7a6a'; if (bar) { bar.style.width = '100%'; bar.style.background = '#a33'; }
      const b = document.createElement('button'); b.type = 'button'; b.textContent = 'LADDA OM'; b.onclick = () => location.reload(); b.style.marginTop = '8px'; st.after(b);
      return; }
    st.textContent = 'Laddar…'; if (bar) bar.style.width = '0%';
    for (const s of [...document.querySelectorAll('script[type="text/plain"][data-krypta]')]) { // riktiga script-element: delar global lexikal miljö (const/let)
      const e = document.createElement('script'); if (nonce) e.nonce = nonce; e.textContent = s.textContent; e.dataset.krypta = s.dataset.krypta; s.replaceWith(e); }
  });
})();'''
def data_url(p): return 'data:%s;base64,%s' % (MIME[os.path.splitext(p)[1].lower()], enc(p))
def fix_css(css):
    def rep(m):
        u = m.group(2).replace('../', '')
        return 'url(%s)' % (('"' + data_url(u) + '"') if u in raw else ('"' + u + '"'))
    return re.sub(r'url\((["\']?)([^)"\']+)\1\)', rep, css)
html = open(ROOT + '/index.html', encoding='utf-8').read()
css = fix_css(open(ROOT + '/css/cards.css', encoding='utf-8').read())
html = re.sub(r'(<style>)(.*?)(</style>)', lambda m: m.group(1) + fix_css(m.group(2)) + m.group(3), html, count=1, flags=re.S)
html = html.replace('<link rel="stylesheet" href="css/cards.css">', '<link rel="stylesheet" href="data:text/css,/*cards.css*/">\n<style>\n' + css + '\n</style>')  # cardui.js letar efter en länk till cards.css
shim = SHIM.replace('__PACKS__', json.dumps(info)).replace('__BIN__', 'true' if FMT == 'bin' else 'false')
html = html.replace('<script src="js/rng.js"></script>', '<script>\n' + shim + '\n</script>\n<script src="js/rng.js"></script>', 1)
for js in ['rng', 'gen', 'cards', 'cardui', 'music', 'weapons', 'game']:  # körs av shimmen, i denna ordning, när paketen är inne
    src = open(ROOT + '/js/%s.js' % js, encoding='utf-8').read().replace('</script', '<\\/script')
    tag = '<script src="js/%s.js"></script>' % js
    assert tag in html, tag
    html = html.replace(tag, '<script type="text/plain" data-krypta="%s">\n' % js + src + '\n</script>', 1)
open(OUT + 'index.html', 'w', encoding='utf-8').write(html)
json.dump({'packs': names, 'remove': REMOVE, 'nfiles': len(raw), 'format': FMT}, open(OUT + 'manifest.json', 'w'))

# ---- rapport: vad har ändrats? ----
last = json.load(open(SHA_LAST)) if os.path.exists(SHA_LAST) else None
json.dump(shas, open(SHA_LAST, 'w'), indent=0)
if not os.path.exists(SHA_PUB):  # första gången: det som låg i utkatalogen räknas som publicerat
    json.dump(prev_present, open(SHA_PUB, 'w'), indent=0)
pubsha = json.load(open(SHA_PUB))
def diff(base):
    ch = [f for f in names if base.get(f) != shas[f]]; rm = sorted(f for f in base if f not in shas)
    return ch, rm
mb = lambda b: round(b / 1e6, 2)
print(len(raw), 'filer i', len(names), 'paket (%s), index %.2f MB, totalt %.2f MB' % (FMT, os.path.getsize(OUT + 'index.html') / 1e6, sum(i[1] for i in info) / 1e6))
for fn, sz, nf in info: print('  %-20s %6.2f MB %5d filer%s' % (fn, sz / 1e6, nf, '  (ny)' if fn[:-len(FMT) - 1] in created else ''))
if evicted: print('filer flyttade ur paket som blivit för stora:', evicted)
if gone: print('borttagna filer (deras paket ändras):', len(gone), gone[:5])
if appended: print('OBS nya filer lades i befintliga öppna paket (<%d MB):' % (SEAL // 1e6), {k: len(v) for k, v in appended.items()})
if last is not None:
    ch, rm = diff(last); print('jämfört med förra bygget: ändrade', ch or 'inga', '| borttagna', rm or 'inga')
ch, rm = diff(pubsha)
up = sum(os.path.getsize(OUT + f) for f in ch) + os.path.getsize(OUT + 'index.html')
print('ATT PUBLICERA (jämfört med senaste --mark-published): ändrade paket', ch or 'inga', '| uppladdning %.2f MB inkl. index.html' % mb(up))
if rm: print('  ta bort (null) när den nya sidan bekräftats fungera på värden:', rm)
plan = {'upload': {f: OUT + f for f in ch}, 'remove': {f: None for f in rm}, 'upload_mb': mb(up)}
if up > 60e6:  # för stort för en publicering (64 MB): dela upp, index.html och null-raderna sist
    b1, s = [], 0
    for f in ch:
        if s + os.path.getsize(OUT + f) > 55e6: break
        b1.append(f); s += os.path.getsize(OUT + f)
    plan['batches'] = [{'files': b1, 'page': 'OFÖRÄNDRAD (den publicerade index.html)', 'mb': mb(s)},
                       {'files': [f for f in ch if f not in b1], 'page': 'nya index.html', 'mb': mb(up - s)}]
    if rm: plan['batches'].append({'files': [], 'page': 'nya index.html (oförändrad)', 'remove': rm, 'mb': 0, 'note': 'först när nya sidan fungerar'})
    print('UPPLADDNINGEN ÄR > 60 MB – dela upp i flera publiceringar:')
    for i, bt in enumerate(plan['batches']): print('  omgång %d (%.2f MB): %s + sida: %s%s' % (i + 1, bt['mb'], bt['files'], bt['page'], (' + null för ' + str(bt['remove'])) if bt.get('remove') else ''))
json.dump(plan, open(PLAN, 'w'), indent=1, ensure_ascii=False)
print('publiceringsplan:', PLAN, '– kör "python3 build_art2.py --mark-published" när den är publicerad')
