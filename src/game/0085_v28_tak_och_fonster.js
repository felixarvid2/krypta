// ---------- Version 28 (REND): blod i taket och genomsiktliga galler och fönster ----------
// TAK: en glest besatt fläckkarta (Uint8Array, en byte per ruta: 0 = ingen fläck, annars 1 + färg*4 + form). Golv- och takslingan
// (renderWorld) läser kartan bara på takrader och bara när banan har fläckar (V28C.m är null annars); en ruta med fläck kostar en
// tabelluppslagning och ett anrop till v28CeilPx. Fläckar kommer från överdöd/avrättning av köttfiender och smällar som dödar dem
// (v28Kill, efter v27Kill), och sot från stora smällar (v28Boom). Bara inomhus (ingen öppen himmel). Tak: 48 (MYCKET), 24 (NORMAL),
// 12 (lowfx), äldsta först. BLOD AV (eller V27B.on = false): inga blodfläckar och de som finns tas bort. Droppar (inte lowfx) går
// via gfxEPart utan force, så partikelbudgeten gäller.
// FÖNSTER: `ǂ` är en vägg (isWallChar: kollision, kulor, hasLOS och fiendernas vägsökning) som man ser igenom; cellgallren `Ɉ`
// likaså. Bara väggkolumnernas strålkastning (v28Cast) går förbi dem: högst två genomsiktliga lager per kolumn (ett med lowfx),
// ett lager per sammanhängande följd. Bakväggen ritas som vanligt och zbuf får dess avstånd, så sprites bakom syns. Gallret
// ritas ovanpå i rätt ordning: drawSprite ritar en kolumns galler först när en sprite framför gallret ritas där (v28Over), resten
// ritas efter alla sprites (v28Flush), och zbuf sätts då till gallrets avstånd. Ett galler med en vägg direkt bakom (fängelsets
// målade cellfronter) ritas ogenomskinligt som förut. V28.ceil / V28.glass = false ger det gamla (t150 jämför bilden och kartan).
const V28 = { ceil: true, glass: true };
const V28C = { m: null, cnt: 0, list: [], pal: [], palKey: new Map(), drip: [], n: { blood: 0, soot: 0, recycled: 0, drips: 0, cleared: 0, px: 0 } };
const V28T = { any: false, gd: new Float32Array(LK_W), pend: new Uint8Array(LK_W), d: new Float32Array(LK_W * 2), wx: new Float32Array(LK_W * 2), fl: new Uint8Array(LK_W * 2),
  L: new Float32Array(LK_W * 2), ci: new Int32Array(LK_W * 2), t: new Array(LK_W * 2).fill(null), cellTex: new Map(), frames: new Map(), bars: null, barsSrc: null, cells: [], scanT: 0, wallCh: '1',
  zb: new Float32Array(LK_W), far: null, opq: null, // version 29: bakväggens djup per kolumn (livmätare bakom galler), rutor som bara skymtats genom galler/fönster, pelare (ogenomskinliga)
  n: { cols: 0, drawn: 0, capped: 0, exits: 0, early: 0, flushed: 0, backed: 0 } };
IWC['ǂ'] = true; // FÖNSTER är en vägg för allt utom bilden (isWallChar cachar per tecken)
wallTexFor['ǂ'] = 'wall_v28win'; // ogenomskinlig reserv (lagertaket, V28.glass av): ramen med mörk öppning, byggs i v28Start
const V28TR = Object.create(null); V28TR['ǂ'] = 1; V28TR['Ɉ'] = 1; // genomsiktliga väggtecken
const V28_S = 32; // fläckmönstrens upplösning per ruta
const v28Abgr = (r, g, b) => (0xff000000 | (Math.min(255, b) << 16) | (Math.min(255, g) << 8) | Math.min(255, r)) >>> 0;

// ---- takfläckarnas mönster (förbakade, alfa 0–255): 0 stort stänk, 1 stråk, 2 droppar, 3 sot ----
const V28_PAT = (() => {
  const S = V28_S, out = [], h = n => ((Math.imul(n | 0, 2654435761) >>> 8) & 65535) / 65536;
  for (let s = 0; s < 4; s++) {
    const a = new Uint8Array(S * S), blobs = [];
    if (s === 0) { blobs.push([0.5, 0.5, 0.2]); for (let i = 0; i < 12; i++) { const an = h(i * 7 + 1) * TAU, r = 0.2 + h(i * 7 + 2) * 0.2; blobs.push([0.5 + Math.cos(an) * r, 0.5 + Math.sin(an) * r, 0.025 + h(i * 7 + 3) * 0.05]); } }
    else if (s === 1) { for (let i = 0; i < 11; i++) { const k = i / 10; blobs.push([0.12 + k * 0.74, 0.5 + (h(i * 5 + 11) - 0.5) * 0.22, (0.05 + h(i * 5 + 12) * 0.07) * (1 - k * 0.6)]); } for (let i = 0; i < 7; i++) blobs.push([0.2 + h(i * 3 + 40) * 0.65, 0.3 + h(i * 3 + 41) * 0.4, 0.02 + h(i * 3 + 42) * 0.03]); }
    else if (s === 2) { for (let i = 0; i < 9; i++) blobs.push([0.15 + h(i * 3 + 70) * 0.7, 0.15 + h(i * 3 + 71) * 0.7, 0.03 + h(i * 3 + 72) * 0.07]); }
    else blobs.push([0.5, 0.5, 0.36]);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = (x + 0.5) / S, v = (y + 0.5) / S; let best = 0;
      for (const [bx, by, br] of blobs) { const d = Math.hypot(u - bx, v - by) / br; if (d < 1) best = Math.max(best, s === 3 ? (1 - d) * (0.55 + 0.45 * h(x * 31 + y * 17)) : d < 0.8 ? 1 : (1 - d) * 5); }
      if (s !== 3 && best > 0 && h(x * 13 + y * 7 + s) < 0.06) best *= 0.5; // ojämn kant
      a[y * S + x] = Math.min(255, Math.round(best * (s === 3 ? 200 : 170 + 45 * h(x * 5 + y * 11 + s * 3)))); // ojämn täthet
    }
    out.push(a);
  }
  return out;
})();
function v28Pal(c) { // färgindex (0–59) för [r, g, b]
  const key = (c[0] << 16) | (c[1] << 8) | c[2]; let i = V28C.palKey.get(key);
  if (i === undefined) { if (V28C.pal.length >= 60) return 0; i = V28C.pal.length; V28C.pal.push([c[0], c[1], c[2]]); V28C.palKey.set(key, i); }
  return i;
}
v28Pal([150, 10, 8]); // 0: kött (förvalt)
function v28CeilPx(c, b, fu, fv, ci) { // från renderWorld: takets texel c i en ruta med fläck b (fu, fv = läget i rutan 0–1)
  const k = b - 1, S = V28_S, hsh = Math.imul(ci, 2654435761) >>> 29;
  let u = (fu * S) | 0, v = (fv * S) | 0; if (u > S - 1) u = S - 1; if (v > S - 1) v = S - 1;
  if (hsh & 1) u = S - 1 - u; if (hsh & 2) v = S - 1 - v; if (hsh & 4) { const t = u; u = v; v = t; } // åtta vridningar per ruta
  const a = V28_PAT[k & 3][v * S + u]; if (a === 0) return c;
  const p = V28C.pal[k >> 2] || V28C.pal[0], f = a / 255, g = 1 - f, I = 0.55 + 0.45 * (((c & 255) + ((c >> 8) & 255) + ((c >> 16) & 255)) / 600); // texturens ljus syns genom fläcken
  return 0xff000000 | (((((c >> 16) & 255) * g + p[2] * I * f) | 0) << 16) | (((((c >> 8) & 255) * g + p[1] * I * f) | 0) << 8) | (((c & 255) * g + p[0] * I * f) | 0);
}
const v28CeilCap = () => settings.lowfx ? 12 : v27B() === 2 ? 48 : 24;
function v28Indoor(x, y) { if (x < 0 || y < 0 || x >= mw || y >= mh) return false; const ci = (y | 0) * mw + (x | 0); return !!cellSky && !cellSky[ci] && !isWallChar(map[y | 0][x | 0]); } // under tak (renderWorld ritar tak där cellSky är 0)
function v28Stain(x, y, col, shape, soot) { // en fläck i taket ovanför (x, y); returnerar rutans index eller -1
  if (!V28.ceil || !map || !v28Indoor(x, y)) return -1;
  const ci = (y | 0) * mw + (x | 0);
  if (!V28C.m || V28C.m.length !== mw * mh) V28C.m = new Uint8Array(mw * mh);
  const b = 1 + v28Pal(col) * 4 + (shape & 3);
  const old = V28C.list.findIndex(s => s.ci === ci); if (old >= 0) V28C.list.splice(old, 1); // samma ruta igen: ersätts, räknas en gång
  V28C.m[ci] = b; V28C.list.push({ ci, soot: !!soot, t: tmr });
  for (const cap = v28CeilCap(); V28C.list.length > cap;) { const o = V28C.list.shift(); V28C.m[o.ci] = 0; V28C.n.recycled++; }
  V28C.cnt = V28C.list.length; if (soot) V28C.n.soot++; else V28C.n.blood++;
  return ci;
}
function v28Clear(blood) { // tar bort blodfläckarna (blood) eller alla
  if (!V28C.m) return;
  for (let i = V28C.list.length - 1; i >= 0; i--) { const s = V28C.list[i]; if (blood && s.soot) continue; V28C.m[s.ci] = 0; V28C.list.splice(i, 1); V28C.n.cleared++; }
  V28C.cnt = V28C.list.length; V28C.drip.length = 0; if (!V28C.cnt) V28C.m = null;
}
function v28Kill(e) { // från gfxEKill (efter v27Kill): överdöd, avrättning eller en smäll som dödar en köttfiende stänker upp i taket
  const L = v27B(); if (!V28.ceil || L <= 0 || e.boss || e.frozen > 0 || (e.burn > 0 && !e.overkill)) return;
  const kc = killCtx || {}, over = !!e.overkill || !!kc.exec, boom = !!kc.boom; if (!over && !boom) return;
  const c = v27Col(e); if (!c || c === V27_COL.dust) return;
  const big = L === 2 && over, n = big ? 3 : over ? 2 : 1; let any = -1;
  for (let i = 0; i < n; i++) { const a = rnd(0, TAU), r = i ? rnd(0.5, 1.1) : rnd(0, 0.3), ci = v28Stain(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, c, i ? 2 : boom && !over ? 2 : (Math.random() < 0.6 ? 0 : 1)); if (ci >= 0 && any < 0) any = ci; }
  if (any >= 0 && !settings.lowfx && V28C.drip.length < 12) V28C.drip.push({ x: e.x, y: e.y, c, until: tmr + rnd(2.5, 4.5), acc: 0 });
}
function v28Boom(x, y, r) { // från explode (efter v27Boom): en stor smäll inomhus sotar taket ovanför
  if (!V28.ceil || r < 1.5) return; v28Stain(x, y, [24, 22, 20], 3, true);
}
function v28Tick(dt) { // från gfxETick (efter v27Tick)
  if (V28C.m && !V28.ceil) v28Clear(false); // V28.ceil av: inga fläckar alls (renderWorld läser bara V28C.m)
  if (V28C.m && (v27B() <= 0) && V28C.list.some(s => !s.soot)) v28Clear(true); // BLOD AV: blodet i taket försvinner (sotet blir kvar)
  if (V28C.drip.length) {
    if (settings.lowfx || v27B() <= 0) V28C.drip.length = 0;
    for (let i = V28C.drip.length - 1; i >= 0; i--) { const d = V28C.drip[i]; if (tmr > d.until) { V28C.drip.splice(i, 1); continue; }
      d.acc += dt * 5; while (d.acc >= 1) { d.acc -= 1 + Math.random() * 0.5; const f = v27Drops(d.c); if (!f) break;
        const x = d.x + rnd(-0.45, 0.45), y = d.y + rnd(-0.45, 0.45); if (!v28Indoor(x, y)) continue;
        if (!gfxEPart({ x, y, z: 0.96, vx: 0, vy: 0, vz: -0.2, life: 0.75, img: f[(Math.random() * f.length) | 0], size: rnd(0.025, 0.04), grav: true })) break; V28C.n.drips++; } }
  }
  if ((V28T.scanT -= dt) <= 0) { V28T.scanT = 1; v28Scan(); } // cellgallren (version 21) kan stängas och öppnas under spelet
  f29Tick(dt); // version 29: glas och rostiga galler (tips)
}
// ---- fönster och galler: texturer ----
function v28BarsTex(src) { // cellgallret: stänger och tvärslåar ur version 21:s textur (kolumner och rader som är ljusa i minst 60 %), resten genomsiktligt
  const w = src.w, h = src.h, d = src.data, lum = p => (p & 255) + ((p >> 8) & 255) + ((p >> 16) & 255);
  let mean = 0; for (let i = 0; i < d.length; i++) mean += lum(d[i]); mean /= d.length;
  const col = new Uint8Array(w), row = new Uint8Array(h);
  for (let x = 0; x < w; x++) { let n = 0; for (let y = 0; y < h; y++) if (lum(d[y * w + x]) > mean) n++; col[x] = n >= h * 0.6 ? 1 : 0; }
  for (let y = 0; y < h; y++) { let n = 0; for (let x = 0; x < w; x++) if (lum(d[y * w + x]) > mean) n++; row[y] = n >= w * 0.6 ? 1 : 0; }
  let nb = 0; for (let x = 0; x < w; x++) if (col[x] && !col[x - 1]) nb++;
  if (nb < 2) return v28GrateTex(src, true); // okänd textur: egna stänger
  const out = new Uint32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (col[x] || row[y]) out[y * w + x] = (d[y * w + x] | 0xff000000) >>> 0;
  return v28Op({ w, h, data: out });
}
function v28GrateTex(base, barsOnly) { // fönstret: ram av väggens textur, järngaller i öppningen (alfa 0 mellan stängerna)
  const w = base.w, h = base.h, d = base.data, out = new Uint32Array(w * h), solidT = new Uint32Array(w * h);
  const top = Math.round(h * (barsOnly ? 0.06 : 0.2)), bot = Math.round(h * (barsOnly ? 0.97 : 0.76)), l = Math.round(w * (barsOnly ? 0.04 : 0.14)), r = w - l, bw = Math.max(2, Math.round(w / 22));
  const nb = barsOnly ? 5 : 3, bars = []; for (let i = 0; i < nb; i++) bars.push(Math.round(l + (r - l) * (i + 1) / (nb + 1) - bw / 2));
  const my = Math.round((top + bot) / 2 - bw / 2), hsh = n => ((Math.imul(n | 0, 2654435761) >>> 8) & 255) / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, frame = y < top || y >= bot || x < l || x >= r;
    if (frame) { let p = d[i] | 0xff000000; if (!barsOnly && (y === top - 1 || y === bot || x === l - 1 || x === r)) p = 0xff000000 | ((p >> 1) & 0x7f7f7f); out[i] = solidT[i] = p >>> 0; continue; } // inre kanten mörkare (djup)
    let bar = -1; for (const b of bars) if (x >= b && x < b + bw) bar = x - b; const rail = y >= my && y < my + bw;
    if (bar >= 0 || rail) { const k = bar >= 0 ? bar / Math.max(1, bw - 1) : (y - my) / Math.max(1, bw - 1), hi = 1 - Math.abs(k - 0.35) * 1.4, rust = hsh(x * 7 + y * 13) < 0.12;
      const g = 38 + 46 * Math.max(0, hi); out[i] = solidT[i] = rust ? v28Abgr(g * 1.3, g * 0.75, g * 0.5) : v28Abgr(g, g * 0.95, g * 0.9); continue; }
    solidT[i] = v28Abgr(16, 14, 13); // den ogenomskinliga reserven: mörkt bakom gallret
  }
  const t = v28Op({ w, h, data: out }); t.solid = { w, h, data: solidT }; return t;
}
function v28Op(t) { const op = new Uint8Array(t.w); for (let x = 0; x < t.w; x++) for (let y = 0; y < t.h; y++) if (t.data[y * t.w + x] >>> 24) { op[x] = 1; break; } t.op = op; return t; } // kolumner helt utan galler hoppas över
function v28FrameFor(name) { const base = tex[name] || tex[wallTexFor[1]] || tex.wall_stone; let t = V28T.frames.get(base); if (!t) { t = v28GrateTex(base, false); V28T.frames.set(base, t); } return t; }
function v28Ovl(c, mx, my) { // gallret för rutan (cachas per ruta)
  const k29 = F29_CH[c]; if (k29) return f29Ovl(k29, mx, my); // version 29: glas, krossat glas, rostigt och uppböjt galler
  if (c === 'Ɉ') { const src = tex.wall_cellbars; if (V28T.barsSrc !== src || !V28T.bars) { V28T.barsSrc = src; V28T.bars = src ? v28BarsTex(src) : v28GrateTex(tex.wall_stone, true); } return V28T.bars; }
  const ci = my * mw + mx; let t = V28T.cellTex.get(ci); if (t) return t;
  let ch = null; for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = (map[my + ay] || [])[mx + ax]; if (q && isWallChar(q) && !V28TR[q] && wallTexFor[q]) { ch = q; break; } } // ramen i grannväggens textur
  t = v28FrameFor(wallTexFor[ch || V28T.wallCh]); V28T.cellTex.set(ci, t); return t;
}
function v28Scan() { // vilka rutor som är genomsiktliga (kartan och testerna)
  const out = []; if (map) for (let y = 0; y < mh; y++) { const r = map[y]; for (let x = 0; x < mw; x++) if (V28TR[r[x]] === 1) out.push(y * mw + x); }
  V28T.cells = out;
  // version 29: en genomsiktlig ruta med genomsiktliga grannar åt både sidan och uppåt/nedåt hör till ett block (fängelsets gallerpelare 2×2,
  // bland annat i bödelns arena): den ritas ogenomskinligt som före version 28, annars ser pelaren ut som en bur utan baksida
  if (!V28T.opq || V28T.opq.length !== mw * mh) V28T.opq = new Uint8Array(mw * mh); else V28T.opq.fill(0);
  const tr = (x, y) => x >= 0 && y >= 0 && x < mw && y < mh && V28TR[map[y][x]] === 1;
  for (const ci of out) { const x = ci % mw, y = (ci / mw) | 0; if ((tr(x - 1, y) || tr(x + 1, y)) && (tr(x, y - 1) || tr(x, y + 1))) V28T.opq[ci] = 1; }
}
function v28Start() { // från startLevel (efter v27Start)
  V28C.m = null; V28C.cnt = 0; V28C.list.length = 0; V28C.drip.length = 0;
  V28T.cellTex.clear(); V28T.any = false; V28T.gd.fill(0); V28T.scanT = 1; V28T.far = new Uint8Array(mw * mh); V28T.zb.fill(0);
  const cnt = {}; let best = '1', bn = 0; // banans vanligaste vägg: ramen för fönster utan grannvägg och reserven
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { const c = map[y][x]; if (isWallChar(c) && !V28TR[c] && wallTexFor[c] && !/[#%~&=]/.test(c)) { const n = cnt[c] = (cnt[c] || 0) + 1; if (n > bn) { bn = n; best = c; } } }
  V28T.wallCh = best; tex.wall_v28win = v28FrameFor(wallTexFor[best]).solid;
  WP_TEXMAT['ǂ'] = 'metal'; // skott mot fönstret: gnistor mot gallret (WP_TEXMAT står efter den här delen, därför här)
  f29Start(); // version 29: en del fönster blir glas eller rostiga galler (eget slumpflöde), texturer och rutornas tillstånd
  v28Scan();
}
// ---- fönster och galler: strålen ----
function v28Cast(ox, oy, dx, dy, x) { // som cast(…, 48, true) men förbi `ǂ` och `Ɉ`: lagren sparas för kolumnen x
  let mx = ox | 0, my = oy | 0;
  const ddx = Math.abs(1 / (dx || 1e-9)), ddy = Math.abs(1 / (dy || 1e-9)), cap = settings.lowfx ? 1 : 2, j0 = x * 2;
  let sx, sy, sdx, sdy;
  if (dx < 0) { sx = -1; sdx = (ox - mx) * ddx; } else { sx = 1; sdx = (mx + 1 - ox) * ddx; }
  if (dy < 0) { sy = -1; sdy = (oy - my) * ddy; } else { sy = 1; sdy = (my + 1 - oy) * ddy; }
  let side = 0, dist = 0, n = 0, inT = false, first = null, run = null, runN = 0, far = false; // far: bakom ett galler/fönster (version 29: skymtat, inte sett)
  const fa = V28T.far, opq = V28T.opq, o2 = V28T.o2 > 0; // o2: banan har öppna ramar (version 29)
  for (let i = 0; i < 120; i++) {
    const lx = mx, ly = my;
    if (far) fa[my * mw + mx] = 1; else seen[my * mw + mx] = 1;
    if (sdx < sdy) { dist = sdx; sdx += ddx; mx += sx; side = 0; } else { dist = sdy; sdy += ddy; my += sy; side = 1; }
    if (dist > 48 || mx < 0 || my < 0 || mx >= mw || my >= mh) { if (first) { V28T.n.exits++; return v28Fin(x, 0, first); } return v28Fin(x, 0, { dist: Math.min(dist, 48), side, cell: '1', wx: 0, lx, ly }); } // ut ur kartan bakom gallret: gallret blir ogenomskinligt
    const c = map[my][mx];
    if (isWallChar(c)) {
      if (far) fa[my * mw + mx] = 1; else seen[my * mw + mx] = 1;
      if (V28TR[c] === 1 && (opq === null || !opq[my * mw + mx])) { // (version 29: inte rutor i ett gallerblock)
        if (inT) continue; // samma följd: ett lager
        inT = true; const wx = wallX(ox, oy, dx, dy, dist, side); run = { dist, side, cell: c, wx, mx, my, lx, ly }; runN = n;
        if (n < cap) { const j = j0 + n; V28T.d[j] = dist; V28T.wx[j] = wx; V28T.fl[j] = (side === 0 && dx > 0) || (side === 1 && dy < 0) ? 1 : 0;
          V28T.L[j] = lightAt(lx, ly) * (side === 1 ? 0.8 : 1); V28T.ci[j] = ly * mw + lx; V28T.t[j] = v28Ovl(c, mx, my);
          if (!first) first = { dist, side, cell: c, wx, mx, my, lx, ly }; n++; far = fa !== null; continue; }
        V28T.n.capped++; return v28Fin(x, n, { dist, side, cell: c, wx, mx, my, lx, ly }); // lagertaket: det här gallret ritas ogenomskinligt
      }
      if (inT) { V28T.n.backed++; return v28Fin(x, runN, run); } // galler med vägg direkt bakom (fängelsets målade celler): ogenomskinligt som förut
      return v28Fin(x, n, { dist, side, cell: c, wx: wallX(ox, oy, dx, dy, dist, side), mx, my, lx, ly });
    }
    inT = false;
    if (o2 && V28TR[c] === 2) { // version 29: en öppen ram (krossat glas, uppböjt galler) är ingen vägg: ett lager om det finns plats, aldrig reserv
      if (n < cap) { const j = j0 + n, wx = wallX(ox, oy, dx, dy, dist, side); V28T.d[j] = dist; V28T.wx[j] = wx; V28T.fl[j] = (side === 0 && dx > 0) || (side === 1 && dy < 0) ? 1 : 0;
        V28T.L[j] = lightAt(lx, ly) * (side === 1 ? 0.8 : 1); V28T.ci[j] = ly * mw + lx; V28T.t[j] = v28Ovl(c, mx, my); n++; }
      continue;
    }
    if (isDoorChar(c)) {
      const d = doors[mx + ',' + my];
      if (far) fa[my * mw + mx] = 1; else seen[my * mw + mx] = 1; // som cast: dörrar, låsta dörrar, galler och hemliga väggar syns på kartan
      if (d.open >= 0.999) continue;
      const wx = wallX(ox, oy, dx, dy, dist, side);
      if (wx < d.open) continue;
      return v28Fin(x, n, { dist, side, cell: c, wx: wx - d.open, mx, my, lx, ly, door: d });
    }
  }
  return v28Fin(x, 0, first || { dist: 48, side, cell: '1', wx: 0, lx: mx, ly: my });
}
function v28Fin(x, n, hit) { V28T.pend[x] = n; V28T.gd[x] = n ? V28T.d[x * 2 + n - 1] : 0; V28T.zb[x] = n ? Math.max(0.05, hit.dist) : 0; if (n) { V28T.any = true; V28T.n.cols++; } return hit; } // (zb: bakväggen, version 29)
function v28Begin() { V28T.any = false; } // från renderWalls (före kolumnerna)
function v28Draw(x, j) { // en kolumn av gallret j (alfa per texel: genomsiktliga texlar hoppas över)
  const t = V28T.t[j]; if (!t) return;
  let u = (V28T.wx[j] * t.w) | 0; if (u >= t.w) u = t.w - 1; if (V28T.fl[j]) u = t.w - 1 - u;
  if (!t.op[u]) return;
  const perp = V28T.d[j], scale = PSC / perp, top = view.hor - scale * (1 - view.camZ), lh = scale, step = t.h / lh, L = V28T.L[j], ci = V28T.ci[j], dd = t.data, tw = t.w, th1 = t.h - 1, nd = LK.on ? LK.need : null;
  const y0 = Math.max(0, Math.ceil(top)), y1 = Math.min(VH - 1, Math.floor(top + lh - 0.001)), gl = t.glass === true, lf = settings.lowfx ? 1 : 0; // gl: glas (version 29): halvgenomskinliga texlar blandas in (lowfx: varannan bildpunkt i schackmönster)
  let v = (y0 - top) * step;
  for (let y = y0; y <= y1; y++, v += step) { if (nd !== null && !nd[y]) continue; const c = dd[Math.min(th1, v | 0) * tw + u], a = c >>> 24;
    if (a < 128) { if (a === 0 || !gl || ((x + y) & lf)) continue; const s = shadeFog(c, L, perp, ci), i = y * W + x, p = px[i]; // glasrutan: en fjärdedel (reflexen hälften) av glasets färg över bakgrunden
      px[i] = a >= 64 ? 0xff000000 | (((p >> 1) & 0x7f7f7f) + ((s >> 1) & 0x7f7f7f)) : 0xff000000 | (((p >> 2) & 0x3f3f3f) * 3 + ((s >> 2) & 0x3f3f3f)); continue; }
    px[y * W + x] = shadeFog(c, L, perp, ci); }
  if (GLR.sd !== null) glGrateDepth(x, y0, y1, top, step, u, t, perp, nd); // version 28 (WEBGL): spjälorna i spritedjupet
  V28T.n.drawn++;
}
function v28Over(x, ty) { // från drawSprite: spriten ligger framför gallret i kolumnen x – rita gallret (och de bakom) först
  const gd = V28T.gd;
  while (ty < gd[x]) { const k = --V28T.pend[x], j = x * 2 + k; v28Draw(x, j); zbuf[x] = V28T.d[j]; gd[x] = k ? V28T.d[j - 1] : 0; V28T.n.early++; }
}
function v28Flush() { // från renderWorld (efter renderSprites): galler som ingen sprite har ritat än
  if (!V28T.any) return; const gd = V28T.gd;
  for (let x = 0; x < W; x++) if (gd[x] > 0) { v28Over(x, 0); V28T.n.flushed++; }
}
function v28Map(s, ox, oy, inside) { // från drawMapCells: fönster och galler som en ljus streck i väggen
  if (!V28T.cells.length || s < 2) return;
  for (const ci of V28T.cells) { const x = ci % mw, y = (ci / mw) | 0; if (!inside(x, y) || !seen[ci]) continue;
    ctx.fillStyle = '#2a2420'; ctx.fillRect(ox + x * s + (s > 3 ? 1 : 0), oy + y * s + (s > 3 ? 1 : 0), s > 3 ? s - 2 : s, s > 3 ? s - 2 : s);
    ctx.fillStyle = map[y][x] === 'Ɉ' ? '#8a8a96' : F29_MAPCOL[map[y][x]] || '#a8c8d8'; const h = (map[y][x - 1] && isWallChar(map[y][x - 1])) || (map[y][x + 1] && isWallChar(map[y][x + 1]));
    if (h) ctx.fillRect(ox + x * s, oy + y * s + (s >> 1), s, 1); else ctx.fillRect(ox + x * s + (s >> 1), oy + y * s, 1, s); }
}
function v28Api() { // window.__game.v28: tillstånd, räknare och av/på för t150–t154
  return { V28, C: V28C, T: V28T, stain: (x, y, c, sh) => v28Stain(x, y, c || V27_COL.flesh, sh || 0), clear: () => v28Clear(false), cap: v28CeilCap, cells: () => V28T.cells.slice(), scan: v28Scan,
    stains: () => V28C.list.map(s => ({ x: s.ci % mw, y: (s.ci / mw) | 0, soot: s.soot, b: V28C.m ? V28C.m[s.ci] : 0 })), n: () => ({ ...V28C.n, ...V28T.n, cnt: V28C.cnt, drip: V28C.drip.length }),
    render: () => render(), zbuf: () => zbuf, seen: () => seen, far: () => V28T.far, opq: () => V28T.opq, isWall: c => isWallChar(c), solid: (x, y) => solid(x, y), los: (a, b, c, d) => hasLOS(a, b, c, d), walk: (x, y) => walkableForEnemy(x, y), cast: (x, y, dx, dy) => cast(x, y, dx, dy),
    bench: (n = 60) => { const ts = []; for (let i = 0; i < n; i++) { const t0 = performance.now(); render(); ts.push(performance.now() - t0); } ts.sort((a, b) => a - b); return { med: ts[n >> 1], p90: ts[(n * 0.9) | 0] }; } };
}
