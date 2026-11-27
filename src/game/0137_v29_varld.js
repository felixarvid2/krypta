// ---------- Version 29 (VÄRLD): väggar, golv, tak och himmel ritas av grafikkortet, i högre upplösning ----------
// VÄRLD (BILD, bara med WebGL): CPU = som förut · GRAFIKKORT = hybrid. CPU:n kastar strålarna per kolumn (samma v28Cast/cast som
// renderWalls, alltså samma zbuf, väggsida, galler och seen) och lämnar per kolumn avstånd, texturens kolumn i en atlas, ljus och
// färgat ljus. Vid UPPLÖSNING 2×/3× kastas också mellankolumnerna (x + 1/R) med samma strålkastning utan att något sparas (inga lager,
// ingen karta). Grafikkortet fyller sedan varje bildpunkt i R× upplösning: väggen ur atlasen, golv och tak per bildpunkt ur kartan
// (golvtextur, öppen himmel och takfläckar per ruta, ljus och färgat ljus per ruta, samma dimma och samma shadeFog-matte), himlen
// (panoramat, zenitfärgen, månen, molnen, stjärnfallet, vulkanens glöd och blixten). Texturerna samplas skarpt (närmaste texel).
// Det CPU:n fortfarande ritar i px (1×) blir ett lager ovanpå: sprites, väggmärken (kulhål, blod, v27-stänk, spindelväv och sot),
// galler, fönster och glas (v28Draw, i rätt ordning mot sprites som förut). px töms (alfa 0) och lagrets alfa säger hur det läggs på:
// 255 ersätter, 0 = världen, 1 = additivt (eld över världen), 2 = multiplicera (sotet), 3–254 = blanda med alfa/255 (glaset).
// Reserv: ett program som inte byggs, ett fel i passet eller en förlorad kontext ger CPU-världen i samma bildruta (w29Redo).
// Passet ritar i bufferns rum (upp/ned-blickens homografi görs sedan i 0135 som förut): i 1× i en 1×-FBO (sedan allt som med CPU:ns
// bild), i 2×/3× i en FBO i scenens skala S. LJUS (0136) läser då världen i S× och djupet och väggsidan per R×-kolumn (w29ColTex).
// UPPLÖSNING: 1×, 2×, 3× (högst S) eller AUTO (dator S, högst 4×; telefon 2× så länge bildrutorna hinner, annars 1×; lowfx 1×).
// Flaggor: W29.flags.stain (takfläckar), .sky (himlen i grafikkortet), .sub (mellankolumnerna). Testerna: window.__game.w29.
const W29_CW = 1024, W29_CR = Math.ceil(LK_W * 4 / W29_CW), W29_MAXC = W29_CW * W29_CR; // kolumnerna (högst LK_W × 4) i en 1024 bred textur med flera rader (WebGL2 lovar bara 2048 i bredd)
const W29 = { cur: false, frameOn: false, ok: false, failed: false, err: '', brk: false, P: null, T: {}, F: {}, S: 0, R: 1, cols: 0, fr: null,
  c0: new Float32Array(W29_MAXC * 4), c1: new Float32Array(W29_MAXC * 4), cs: new Float32Array(W29_MAXC * 2), atlas: null, fl: new Float32Array(256 * 4), cell: null, map: null, cellN: 0,
  seenD: null, farD: null, cleanObj: null, dynTick: -1, palN: -1, t0: 0, ft: 16, slowT: 0, fastT: 0, slow: false,
  sc: { d: new Float32Array(2), wx: new Float32Array(2), fl: new Uint8Array(2), L: new Float32Array(2), ci: new Int32Array(2), t: [null, null], pend: new Uint8Array(1), gd: new Float32Array(1), zb: new Float32Array(1), n: { cols: 0, drawn: 0, capped: 0, exits: 0, early: 0, flushed: 0, backed: 0 } },
  flags: { stain: true, sky: true, sub: true },
  n: { frames: 0, cpu: 0, passes: 0, redo: 0, fails: 0, atlasImgs: 0, atlasResets: 0, dynUp: 0, subCasts: 0 } };
const W29_AT = 2048;
const W29_FS = `#version 300 es
precision highp float; precision highp int;
uniform sampler2D uA, uOv, uMap, uPat, uPal; uniform highp sampler2D uC0, uC1, uCell, uFl;
uniform vec4 uCam, uDir, uDim, uFog, uCe, uSky, uSkyP, uMoon, uClo, uFx, uStar, uMisc; uniform vec3 uZen; uniform int uStain, uSkyFx; out vec4 o;
const float TAU = 6.283185307179586;
vec4 at(float x, float y) { return texelFetch(uA, ivec2(int(x), int(y)), 0) * 255.0; }
vec3 shade(vec3 c, float L, float d, vec3 lc) { float ff = exp(-d * uFog.w); vec3 k = max(vec3(L * ff) + lc * ff, 0.0); return floor(min(c * k + uFog.rgb * (1.0 - ff), 255.0)); } // som shadeFog
vec3 ceilPx(vec3 c, int b, vec2 fr, int ci) { // som v28CeilPx: takfläckens mönster (åtta vridningar per ruta) och färg
  int k = b - 1; uint h = (uint(ci) * 2654435761u) >> 29u; int u = min(int(fr.x * 32.0), 31), v = min(int(fr.y * 32.0), 31);
  if ((h & 1u) != 0u) u = 31 - u; if ((h & 2u) != 0u) v = 31 - v; if ((h & 4u) != 0u) { int t = u; u = v; v = t; }
  float a = floor(texelFetch(uPat, ivec2(u, (k & 3) * 32 + v), 0).r * 255.0 + 0.5); if (a == 0.0) return c;
  vec3 p = texelFetch(uPal, ivec2(k >> 2, 0), 0).rgb * 255.0; float f = a / 255.0, g = 1.0 - f, I = 0.55 + 0.45 * ((c.r + c.g + c.b) / 600.0);
  return floor(c * g + p * I * f); }
vec3 skyCol(float x, float y, float a) { // som golvslingans himmel och skyPixel
  float hor = uCam.w, top = hor - y, sk = (hor - y) / max(40.0, hor - uSkyP.x + 130.0), skm = mod((sk - 1.0) * 24.0 / 14.0, 2.0), skb = sk > 1.0 ? min(1.0, (sk - 1.0) * 0.7) : 0.0;
  float rv = sk > 1.0 ? (skm < 1.0 ? skm : 2.0 - skm) * 13.0 : uSky.w * (1.0 - sk); int sv = clamp(int(rv), 0, int(uSky.w) - 1);
  int cx = int(floor((a / TAU + 1.0) * uSky.z)) % int(uSky.z); vec3 c = at(uSky.x + float(cx), uSky.y + float(sv)).rgb;
  if (skb > 0.0) c = floor(c * (1.0 - skb) + uZen * skb);
  if (uSkyFx == 0) return c;
  if (uFx.x > 0.5) { float da = atan(sin(a - 0.9), cos(a - 0.9)), mx = (da / 0.16 + 0.5) * uMoon.z, my = uMoon.w - (top - 34.0) / 26.0 * uMoon.w;
    if (mx >= 0.0 && mx < uMoon.z && my >= 0.0 && my < uMoon.w) { vec4 m = at(uMoon.x + floor(mx), uMoon.y + floor(my)); if (m.a > 0.5) { c = m.rgb; if (uMisc.y > 0.5) { c.b = 0.0; c.g = float(int(c.g) | 96); } } } }
  if (uFx.y > 0.5 && top > 6.0 && top < 30.0) { int u = int(floor((a / TAU + 1.0) * uClo.z * 2.0 + uMisc.x * 3.0)) % int(uClo.z), v = int((top - 6.0) / 24.0 * uClo.w);
    vec4 m = at(uClo.x + float(u), uClo.y + uClo.w - 1.0 - float(v)); if (m.a > 0.5) c = m.rgb; }
  if (uFx.z > 0.5) c = floor(vec3(min(255.0, c.r * 1.3 + 40.0 + (top > 20.0 ? 0.0 : (20.0 - top) * 2.0)), min(255.0, c.g * 0.6 + 8.0), min(255.0, c.b * 0.5)));
  if (uFx.w > 0.0) c = floor(min(c + uFx.w * vec3(0.95, 1.0, 1.15), 255.0));
  if (uStar.w > 0.5) { float da = a - uStar.x; da = atan(sin(da), cos(da)); float sx = uStar.y * 0.5, sy = uStar.z + uStar.y * 14.0; if (abs(da - sx) < 0.05 && abs(top - (40.0 - sy) + da * 60.0) < 1.2 && da < sx) c = vec3(255.0); }
  return c; }
void main() {
  float R = uMisc.z; ivec2 gi = ivec2(gl_FragCoord.xy) * int(uMisc.z + 0.5) / int(uMisc.w + 0.5); vec2 q = vec2(gi) / R; float x = q.x, y = q.y; int ci = gi.x; // R×-rutnätets hörn i heltal (1× = heltalen, som CPU:n)
  vec4 ov = texelFetch(uOv, ivec2(q), 0); int oa = int(ov.a * 255.0 + 0.5);
  if (oa == 255) { o = vec4(ov.rgb, 1.0); return; } // sprite, väggmärke eller galler: CPU:ns bildpunkt
  vec3 col; ivec2 cc = ivec2(ci % 1024, ci / 1024); vec4 c0 = texelFetch(uC0, cc, 0); float perp = c0.x, lh = 166.0 / perp, top = uCam.w - lh * (1.0 - uCam.z);
  if (y >= top && y <= top + lh - 0.001) { vec4 c1 = texelFetch(uC1, cc, 0); float v = (y - top) * c0.w / lh; // väggen
    col = shade(at(c0.y, c0.z + float(min(int(c0.w) - 1, int(v)))).rgb, c1.x, perp, c1.yzw); }
  else if (y == uCam.w) col = floor(uFog.rgb);
  else { bool fl = y > uCam.w; float rd = fl ? 166.0 * uCam.z / (y - uCam.w) : 166.0 * (1.0 - uCam.z) / (uCam.w - y);
    vec2 f = uCam.xy + (uDir.xy - uDir.zw) * rd + (2.0 * uDir.zw * rd / uDim.x) * x, cf = floor(f);
    bool ins = cf.x >= 0.0 && cf.y >= 0.0 && cf.x < uDim.y && cf.y < uDim.z; vec4 mp = ins ? floor(texelFetch(uMap, ivec2(cf), 0) * 255.0 + 0.5) : vec4(0.0);
    if (!fl && (ins ? mp.g > 0.5 : uSkyP.y > 0.5)) { float cx = 2.0 * x / uDim.x - 1.0; col = skyCol(x, y, atan(uDir.y + uDir.w * cx, uDir.x + uDir.z * cx)); } // öppen himmel
    else { vec4 r = fl ? texelFetch(uFl, ivec2(int(mp.r), 0), 0) : uCe; vec2 fr = f - cf;
      vec3 c = at(r.x + float(min(int(fr.x * r.z), int(r.z) - 1)), r.y + float(min(int(fr.y * r.w), int(r.w) - 1))).rgb;
      if (!fl && ins && mp.b > 0.5 && uStain == 1) c = ceilPx(c, int(mp.b), fr, int(cf.y) * int(uDim.y) + int(cf.x)); // version 28: takfläck
      vec4 ce = ins ? texelFetch(uCell, ivec2(cf), 0) : vec4(uDim.w, 0.0, 0.0, 0.0); col = shade(c, ce.x * (fl ? 1.0 : 0.62), rd, ce.yzw); } }
  if (oa == 1) col = min(col + floor(ov.rgb * 255.0 + 0.5), 255.0); // additivt (eld)
  else if (oa == 2) col = floor(col * ov.rgb); // multiplicera (sot)
  else if (oa >= 3) col = floor(mix(col, floor(ov.rgb * 255.0 + 0.5), float(oa) / 255.0)); // blanda (glas)
  o = vec4(col / 255.0, 1.0);
}`;
// ---- program och resurser (från glBuild; ett fel stänger av bara VÄRLD GRAFIKKORT) ----
function w29Build() {
  W29.P = null; W29.T = {}; W29.F = {}; W29.S = 0; W29.atlas = null; W29.palN = -1; W29.dynTick = -1; W29.ok = false; W29.err = '';
  try { W29.P = glProg(GL_VS, W29.brk ? W29_FS.replace('void main', 'void main( ') : W29_FS);
    if (GLR.gl.getParameter(GLR.gl.MAX_TEXTURE_SIZE) < W29_AT) throw new Error('MAX_TEXTURE_SIZE'); W29.T.c0 = w29TexF(W29_CW, W29_CR); W29.T.c1 = w29TexF(W29_CW, W29_CR); W29.T.fl = w29TexF(256, 1);
    W29.T.pat = w29R8(V28_S, V28_S * 4, (() => { const a = new Uint8Array(V28_S * V28_S * 4); for (let k = 0; k < 4; k++) a.set(V28_PAT[k], k * V28_S * V28_S); return a; })());
    W29.T.pal = glTex(64, 1, 'rgba'); W29.ok = true; }
  catch (e) { W29.ok = false; W29.err = String(e && e.message || e).slice(0, 120); try { console.warn('VÄRLD (v29) → CPU:', W29.err); } catch (e2) { /* tyst */ } }
}
function w29R8(w, h, data) { const gl = GLR.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, h, 0, gl.RED, gl.UNSIGNED_BYTE, data); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return { t, w, h }; }
function w29TexF(w, h) { // RGBA32F (kartans ljus)
  const gl = GLR.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, null);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return { t, w, h }; }
// ---- inställningen och valet per bildruta ----
function w29Want() {
  return settings.glWorld === 'gpu' && W29.ok && !W29.failed && GLR.ok && !GLR.failed && glMode() === 'webgl' && glWant() && !GLR.flags.cpuGrade && (!LK.on || GLR.flags.gpuLK !== false) && !!lvl && !!cellFloor && !!light && !!map;
}
function w29Auto() { // AUTO: dator scenens skala S (högst 4: ett helt antal skärmpunkter per världspunkt), telefon 2× bara när bildrutorna hinner (annars 1×), lowfx 1×
  if (settings.lowfx) return 1; if (DEVICE === 'mobil') return W29.slow ? 1 : 2; return Math.min(4, GLR.S || 1);
}
function w29Res() { const s = settings.glRes; return Math.max(1, Math.min(s === 1 || s === 2 || s === 3 ? s : w29Auto(), GLR.S || 1, 4)); } // (ett val som inte delar S ger ojämna punkter, t.ex. 3× med S = 4)
function w29Tick(now) { // bildrutans tid (AUTO på telefon): över 24 ms i 2 s → 1×, under 18 ms i 4 s → 2× igen (efter andra nedgången först efter 60 s)
  const dt = W29.t0 ? Math.min(250, now - W29.t0) : 16; W29.t0 = now; W29.ft = W29.ft * 0.9 + dt * 0.1;
  if (W29.ft > 24) { W29.slowT += dt; W29.fastT = 0; if (W29.slowT > 2000 && !W29.slow) { W29.slow = true; W29.drops = (W29.drops || 0) + 1; } } else if (W29.ft < 18) { W29.fastT += dt; W29.slowT = 0; if (W29.fastT > (W29.drops > 1 ? 60000 : 4000)) W29.slow = false; } else { W29.slowT = W29.fastT = 0; } // efter andra nedgången: 1× i minst en minut (inget fram och tillbaka)
}
function w29Begin() { // från render (efter lkBegin): grafikkortets värld i den här bildrutan?
  W29.cur = W29.frameOn = false; if (settings.glWorld !== 'gpu') return;
  w29Tick(performance.now());
  if (!w29Want()) { W29.n.cpu++; return; }
  W29.R = w29Res(); W29.cur = W29.frameOn = true; W29.n.frames++;
}
// ---- från renderWorld: i stället för golvslingan och renderWalls (px blir lagret ovanpå) ----
function w29World(W, VH, px, dirX, dirY, qX, qY, hor, camZ, nd, plX, plY, sky, sdat, outdoor, ce) {
  w29Frame0(); px.fill(0, 0, W * VH);
  w29Walls(W, VH, px, dirX, dirY, qX, qY, hor, camZ, nd);
  W29.fr = { W, VH, dirX, dirY, qX, qY, hor, camZ, x: P.x, y: P.y, HOR: HORIZON, sky, sdat, outdoor, ce, skyFx, skyOwn, R: W29.R, cols: W29.cols };
  glPreSprites(); // version 28 (WEBGL): partiklar i grafikkortet
  renderSprites(plX, plY);
  v28Flush();
}
function w29Tex(hit) { // väggens textur (som renderWalls)
  return hit.cell === 'D' ? tex.door_wood : hit.cell === 'G' || hit.cell === '|' ? tex.door_metal_gate : hit.cell === ']' ? tex.door_locked : hit.cell === '*' ? tex[wallTexFor[lvl.secretWall] || wallTexFor[1]]
    : hit.cell === '9' && (hit.mx * 7 + hit.my * 3) % 3 === 0 ? tex.wall_house_window : tex[wallTexFor[hit.cell]];
}
function w29Col(j, hit, rdx, rdy, perp) { // kolumnen j (R× bredd): avstånd, texturens kolumn i atlasen, ljus och färgat ljus; returnerar ljuset
  const t = w29Tex(hit), r = w29Rect(t);
  let u = (hit.wx * t.w) | 0; if ((hit.side === 0 && rdx > 0) || (hit.side === 1 && rdy < 0)) u = t.w - 1 - u;
  let L = lightAt(hit.lx, hit.ly); if (hit.side === 1) L *= 0.8; if (t === tex.wall_house_window) L *= 0.85 + 0.15 * Math.sin(tmr * 9 + hit.mx * 3 + hit.my);
  const wci = hit.lx >= 0 && hit.ly >= 0 && hit.lx < mw && hit.ly < mh ? (hit.ly | 0) * mw + (hit.lx | 0) : -1, a = W29.c0, b = W29.c1, i = j * 4;
  a[i] = perp; a[i + 1] = r ? r[0] + Math.min(t.w - 1, Math.max(0, u)) : 0; a[i + 2] = r ? r[1] : 0; a[i + 3] = r ? t.h : 1;
  b[i] = L; if (wci >= 0 && lcol) { const k = wci * 3; b[i + 1] = lcol[k]; b[i + 2] = lcol[k + 1]; b[i + 3] = lcol[k + 2]; } else b[i + 1] = b[i + 2] = b[i + 3] = 0;
  W29.cs[j * 2] = perp; W29.cs[j * 2 + 1] = hit.side; // ljuspasset (0136): djupet och väggsidan per R×-kolumn
  W29.wci = wci; return L;
}
function w29ColTex() { // från l29LightPass: djupet och sidan per R×-kolumn (exaktare än zbuf per 1×-kolumn)
  const gl = GLR.gl; if (!W29.T.cs) W29.T.cs = glTex(W29_CW, W29_CR, 'rg32f'); const rows = Math.ceil(W29.fr.cols / W29_CW); gl.bindTexture(gl.TEXTURE_2D, W29.T.cs.t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W29_CW, rows, gl.RG, gl.FLOAT, W29.cs.subarray(0, W29_CW * rows * 2)); return W29.T.cs;
}
function w29SubBegin() { // mellankolumnernas strålar: samma strålkastning (v28Cast), men lager, karta och räknare skrivs i en kladd (en gång per bildruta)
  if (!V28.glass) return null; const T = V28T, S = W29.sc, sv = W29.sv || (W29.sv = new Array(13));
  if (!W29.seenD || W29.seenD.length !== seen.length) { W29.seenD = new Uint8Array(seen.length); W29.farD = new Uint8Array(seen.length); }
  sv[0] = T.d; sv[1] = T.wx; sv[2] = T.fl; sv[3] = T.L; sv[4] = T.ci; sv[5] = T.t; sv[6] = T.pend; sv[7] = T.gd; sv[8] = T.zb; sv[9] = T.n; sv[10] = T.any; sv[11] = T.far; sv[12] = seen;
  T.d = S.d; T.wx = S.wx; T.fl = S.fl; T.L = S.L; T.ci = S.ci; T.t = S.t; T.pend = S.pend; T.gd = S.gd; T.zb = S.zb; T.n = S.n; if (T.far) T.far = W29.farD; seen = W29.seenD; return sv;
}
function w29SubEnd(sv) { if (sv === null) return; const T = V28T; T.d = sv[0]; T.wx = sv[1]; T.fl = sv[2]; T.L = sv[3]; T.ci = sv[4]; T.t = sv[5]; T.pend = sv[6]; T.gd = sv[7]; T.zb = sv[8]; T.n = sv[9]; T.any = sv[10]; T.far = sv[11]; seen = sv[12]; }
function w29SubCast(ox, oy, dx, dy) { return V28.glass ? v28Cast(ox, oy, dx, dy, 0) : cast(ox, oy, dx, dy, 48, false); } // (mellan w29SubBegin och w29SubEnd)
function w29Sub(ox, oy, dx, dy) { const sv = w29SubBegin(); try { return w29SubCast(ox, oy, dx, dy); } finally { w29SubEnd(sv); } } // en enda stråle (testerna)
function w29Walls(W, VH, px, dirX, dirY, qX, qY, hor, camZ, nd) { // som renderWalls, men väggens bildpunkter ritar grafikkortet; märkena hamnar i lagret
  v28Begin(); const R = W29.flags.sub ? W29.R : 1;
  for (let x = 0; x < W; x++) {
    const camX = 2 * x / W - 1, rdx = dirX + qX * camX, rdy = dirY + qY * camX;
    const hit = V28.glass ? v28Cast(P.x, P.y, rdx, rdy, x) : cast(P.x, P.y, rdx, rdy, 48, true);
    const perp = Math.max(0.05, hit.dist);
    zbuf[x] = perp;
    l29Side(x, hit.side);
    const L = w29Col(x * R, hit, rdx, rdy, perp), wci = W29.wci;
    if (hit.mx !== undefined && wallMarks.size) w29Marks(px, W, VH, x, hit, rdx, rdy, hor - (PSC / perp) * (1 - camZ), PSC / perp, L, perp, wci);
  }
  if (R > 1) { const sv = w29SubBegin(); // mellankolumnerna (x + k/R)
    try { for (let x = 0; x < W; x++) for (let k = 1; k < R; k++) { const cX = 2 * (x + k / R) / W - 1, sx = dirX + qX * cX, sy = dirY + qY * cX, h2 = w29SubCast(P.x, P.y, sx, sy); w29Col(x * R + k, h2, sx, sy, Math.max(0.05, h2.dist)); }
      W29.n.subCasts += W * (R - 1); } finally { w29SubEnd(sv); } }
  if (R === 1 && W29.R > 1) { // flags.sub av (test): samma kolumn R gånger
    for (let x = W - 1; x >= 0; x--) for (let k = W29.R - 1; k >= 0; k--) { for (let c = 0; c < 4; c++) { W29.c0[(x * W29.R + k) * 4 + c] = W29.c0[x * 4 + c]; W29.c1[(x * W29.R + k) * 4 + c] = W29.c1[x * 4 + c]; } W29.cs[(x * W29.R + k) * 2] = W29.cs[x * 2]; W29.cs[(x * W29.R + k) * 2 + 1] = W29.cs[x * 2 + 1]; }
  }
  W29.cols = W * W29.R;
}
function w29Marks(px, W, VH, x, hit, rdx, rdy, top, lh, L, perp, wci) { // kulhål och blodstänk (som renderWalls); sotet multiplicerar världen under (alfa 2)
  const marks = wallMarks.get((hit.my * mw + hit.mx) * 4 + faceOf(hit.side, rdx, rdy)); if (!marks) return;
  for (const m of marks) {
    const du = Math.abs(m.u - hit.wx); if (du > m.r) continue;
    if (m.v27) { v27WallPx(px, W, VH, x, m, hit.wx, top, lh, L, perp); continue; }
    const hh = Math.sqrt(m.r * m.r - du * du) * (m.kind === 'blood' ? 1.6 : 1), cy = top + (1 - m.z) * lh;
    const ya = Math.max(0, Math.ceil(cy - hh * lh)), yb = Math.min(VH - 1, Math.floor(cy + hh * lh));
    const col = m.kind === 'blood' ? shadeFog(0xff10109a, L, perp) : m.kind === 'web' ? shadeFog(0xffc8c8c8, L, perp) : shadeFog(0xff101418, L * 0.8, perp);
    if (m.kind === 'scorch') { const ku = du / m.r, kl = 1 / (m.r * lh); for (let y = ya; y <= yb; y++) { const i = y * W + x, dv = (y - cy) * kl, rr = ku * ku + dv * dv, c = px[i];
      if (c >>> 24 !== 255) { if (rr < 0.2) px[i] = 0x02606060; else if (rr < 0.6) px[i] = 0x02808080; else if (((y * 5 + x * 3 + m.seed) % 3) > 1.4) px[i] = 0x02c0c0c0; continue; } // världen under: multiplicera (0,375 / 0,5 / 0,75)
      if (rr < 0.2) px[i] = 0xff000000 | (((c >> 2) & 0x3f3f3f) + ((c >> 3) & 0x1f1f1f)); else if (rr < 0.6) px[i] = 0xff000000 | ((c >> 1) & 0x7f7f7f); else if (((y * 5 + x * 3 + m.seed) % 3) > 1.4) px[i] = 0xff000000 | (((c >> 1) & 0x7f7f7f) + ((c >> 2) & 0x3f3f3f)); } continue; }
    for (let y = ya; y <= yb; y++) if ((m.kind !== 'blood' || ((y * 7 + x * 3 + m.seed) % 5) > 0.8) && (m.kind !== 'web' || ((y + x) % 3 === 0 || (y * 3 + x * 5) % 7 === 0))) px[y * W + x] = col;
    if (m.kind === 'blood' && yb + 1 < VH) for (let y = yb + 1; y < Math.min(VH, yb + 1 + Math.round(lh * 0.06 * ((m.seed + x) % 3) / 2)); y++) px[y * W + x] = col;
  }
}
// ---- lagrets blandningar (från drawSprite och v28Draw, bara när bildpunkten under är världen) ----
function w29AddPx(d, c, kr, kg, kb) { // additiv sprite över världen: summan sparas (alfa 1) och läggs på i grafikkortet
  const a = d >>> 24, r = Math.min(255, (d & 255) + (c & 255) * kr), g = Math.min(255, ((d >> 8) & 255) + ((c >> 8) & 255) * kg), b = Math.min(255, ((d >> 16) & 255) + ((c >> 16) & 255) * kb);
  return ((a === 0 ? 1 : a) << 24 | (b << 16) | (g << 8) | r) >>> 0;
}
// ---- atlasen: väggar, golv, tak och himlar ({w, h, data}) packas lat i hyllor; full atlas töms och byggs om i nästa bildruta ----
function w29Rect(t) {
  if (!t || !t.data) return null; let A = W29.atlas; const gl = GLR.gl;
  if (!A) { if (!W29.T.atlas) W29.T.atlas = glTex(W29_AT, W29_AT, 'rgba'); A = W29.atlas = { map: new WeakMap(), x: 0, y: 0, rh: 0, full: false, dyn: [] }; }
  const hit = A.map.get(t); if (hit) return hit;
  const w = t.w, h = t.h; if (!(w > 0 && h > 0) || w > 1024 || h > 512 || t.data.length < w * h) return null;
  if (A.x + w > W29_AT) { A.x = 0; A.y += A.rh + 1; A.rh = 0; }
  if (A.y + h > W29_AT) { A.full = true; return null; }
  w29Up(t, A.x, A.y); const r = [A.x, A.y]; A.map.set(t, r); A.x += w + 1; A.rh = Math.max(A.rh, h); W29.n.atlasImgs++;
  let dyn = t === gfxW.banBuf; for (const k in gfxW.buf) if (gfxW.buf[k] === t) dyn = true; if (dyn) A.dyn.push([t, r]); // vattnets vågor (gfxWWarp) och fanan (gfxWBanner) skrivs om på plats: laddas upp igen när gfxW.ticks ändras
  return r;
}
function w29Up(t, x, y) { const gl = GLR.gl; gl.bindTexture(gl.TEXTURE_2D, W29.T.atlas.t); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, t.w, t.h, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(t.data.buffer, t.data.byteOffset, t.w * t.h * 4)); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4); }
function w29Frame0() { // före kolumnerna (från renderWorld via w29World): atlasen töms om den blev full, vågorna laddas upp igen
  const A = W29.atlas; if (A && A.full) { W29.atlas = null; W29.n.atlasResets++; }
  if (W29.atlas && gfxW.ticks !== W29.dynTick) { W29.dynTick = gfxW.ticks; for (const [t, r] of W29.atlas.dyn) { w29Up(t, r[0], r[1]); W29.n.dynUp++; } }
}
// ---- från glDraw: grafikkortets värld i bufferns rum (S×, R× rutnät) → FBO som ljuspasset och världspasset läser; null = CPU:ns bild ----
function w29Pass(bw, bh, lk, S) {
  const f = W29.fr; if (!W29.frameOn) return null;
  let out = null;
  if (f && W29.ok && f.W === bw && f.VH === bh) try { if (W29.brkRun) throw new Error('test'); out = w29Draw(bw, bh, S, f); }
  catch (e) { W29.err = String(e && e.message || e).slice(0, 120); W29.failed = true; W29.n.fails++; try { console.warn('VÄRLD (v29) → CPU:', W29.err); } catch (e2) { /* tyst */ } }
  if (out) return out;
  const gl = GLR.gl; gl.bindFramebuffer(gl.FRAMEBUFFER, null); w29Redo(); const src = lk ? tpx : spx; // samma bildruta: CPU-världen och en ny uppladdning (fel, eller full atlas: töms nästa bildruta)
  gl.bindTexture(gl.TEXTURE_2D, GLR.T.world.t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, bw, bh, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(src.buffer, 0, bw * bh * 4)); return null;
}
function w29Draw(bw, bh, S, f) {
  const gl = GLR.gl, T = W29.T, p = W29.P;
  if (W29.S !== S || !W29.F.w) { if (W29.F.w) { glFboFree(W29.F.w); glFboFree(W29.F.lit); } W29.F.w = glFbo(LK_W * S, LK_H * S, false, false); W29.F.lit = glFbo(LK_W * S, LK_H * S, false, false); W29.F.w.sc = S; W29.S = S; }
  if (!W29.F.w1) { W29.F.w1 = glFbo(LK_W, LK_H, false, false); W29.F.w1.sc = 1; } // 1×: världen i bufferns upplösning (ljuset och världspasset som med CPU:ns bild)
  const dst = f.R === 1 ? W29.F.w1 : W29.F.w, sc = dst.sc;
  // kartan: golvtextur, öppen himmel och takfläck per ruta (RGBA8), ljus och färgat ljus per ruta (RGBA32F)
  const n = mw * mh; if (!W29.map || W29.cellN !== n) { W29.map = new Uint8Array(n * 4); W29.cell = new Float32Array(n * 4); W29.cellN = n; }
  if (!T.map || T.map.w !== mw || T.map.h !== mh) { if (T.map) { gl.deleteTexture(T.map.t); gl.deleteTexture(T.cell.t); } T.map = glTex(mw, mh, 'rgba'); T.cell = w29TexF(mw, mh); }
  const M = W29.map, C = W29.cell, cs = W29.flags.stain && V28C.m && V28C.m.length === n ? V28C.m : null, lc = lcol;
  for (let i = 0, j = 0; i < n; i++, j += 4) { M[j] = cellFloor[i]; M[j + 1] = cellSky && cellSky[i] ? 1 : 0; M[j + 2] = cs !== null ? cs[i] : 0; M[j + 3] = 255;
    C[j] = light[i]; if (lc) { const k = i * 3; C[j + 1] = lc[k]; C[j + 2] = lc[k + 1]; C[j + 3] = lc[k + 2]; } else C[j + 1] = C[j + 2] = C[j + 3] = 0; }
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.bindTexture(gl.TEXTURE_2D, T.map.t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, mw, mh, gl.RGBA, gl.UNSIGNED_BYTE, M); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  gl.bindTexture(gl.TEXTURE_2D, T.cell.t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, mw, mh, gl.RGBA, gl.FLOAT, C);
  if (cs !== null && V28C.pal.length !== W29.palN) { const pd = new Uint8Array(64 * 4); V28C.pal.forEach((c, i) => { pd[i * 4] = c[0]; pd[i * 4 + 1] = c[1]; pd[i * 4 + 2] = c[2]; pd[i * 4 + 3] = 255; }); gl.bindTexture(gl.TEXTURE_2D, T.pal.t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 64, 1, gl.RGBA, gl.UNSIGNED_BYTE, pd); W29.palN = V28C.pal.length; }
  // golvtexturerna (per index), taket och himlarna i atlasen
  const fl = W29.fl, nf = Math.min(256, floorTexs.length); W29.n.floors = Math.max(W29.n.floors || 0, floorTexs.length); for (let i = 0; i < nf; i++) { const t = floorTexs[i], r = w29Rect(t); fl[i * 4] = r ? r[0] : 0; fl[i * 4 + 1] = r ? r[1] : 0; fl[i * 4 + 2] = r ? t.w : 1; fl[i * 4 + 3] = r ? t.h : 1; }
  gl.bindTexture(gl.TEXTURE_2D, T.fl.t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, Math.max(1, nf), 1, gl.RGBA, gl.FLOAT, fl.subarray(0, Math.max(1, nf) * 4));
  const ce = f.ce, rc = w29Rect(ce) || [0, 0], sk = f.sky, sd = f.sdat === sk.data ? sk : (W29.cleanObj && W29.cleanObj.data === f.sdat ? W29.cleanObj : (W29.cleanObj = { w: sk.w, h: sk.h, data: f.sdat })), rs = w29Rect(sd) || [0, 0];
  const mo = spr.moon, cl = spr.clouds, rm = mo ? w29Rect(mo) : null, rl = cl ? w29Rect(cl) : null;
  if (W29.atlas && W29.atlas.full) { W29.n.atlasFull = (W29.n.atlasFull || 0) + 1; return null; } // töms nästa bildruta; den här bildrutan går CPU-vägen
  // kolumnerna
  const rows = Math.ceil(f.cols / W29_CW); // hela rader à 1024 kolumner
  gl.bindTexture(gl.TEXTURE_2D, T.c0.t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W29_CW, rows, gl.RGBA, gl.FLOAT, W29.c0.subarray(0, W29_CW * rows * 4));
  gl.bindTexture(gl.TEXTURE_2D, T.c1.t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W29_CW, rows, gl.RGBA, gl.FLOAT, W29.c1.subarray(0, W29_CW * rows * 4));
  gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb); gl.viewport(0, 0, bw * sc, bh * sc); gl.bindVertexArray(GLR.vao); gl.useProgram(p);
  const tx = [['uA', W29.T.atlas], ['uOv', GLR.T.world], ['uMap', T.map], ['uPat', T.pat], ['uPal', T.pal], ['uC0', T.c0], ['uC1', T.c1], ['uCell', T.cell], ['uFl', T.fl]];
  tx.forEach(([u, t], i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t.t); gl.uniform1i(p.u(u), i); });
  gl.uniform4f(p.u('uCam'), f.x, f.y, f.camZ, f.hor); gl.uniform4f(p.u('uDir'), f.dirX, f.dirY, f.qX, f.qY); gl.uniform4f(p.u('uDim'), bw, mw, mh, lvl.ambient);
  gl.uniform4f(p.u('uFog'), fogR, fogG, fogB, fogK); gl.uniform4f(p.u('uCe'), rc[0], rc[1], ce.w, ce.h); gl.uniform4f(p.u('uSky'), rs[0], rs[1], sd.w, sd.h);
  gl.uniform4f(p.u('uSkyP'), f.HOR, f.outdoor ? 1 : 0, 0, 0); gl.uniform3f(p.u('uZen'), skyZen[0], skyZen[1], skyZen[2]);
  gl.uniform4f(p.u('uMoon'), rm ? rm[0] : 0, rm ? rm[1] : 0, mo ? mo.w : 1, mo ? mo.h : 1); gl.uniform4f(p.u('uClo'), rl ? rl[0] : 0, rl ? rl[1] : 0, cl ? cl.w : 1, cl ? cl.h : 1);
  gl.uniform4f(p.u('uFx'), rm && !f.skyOwn ? 1 : 0, rl && !f.skyOwn ? 1 : 0, lvl.biome === 'volcano' && !f.skyOwn ? 1 : 0, lightning > 0.05 && !settings.noFlash ? lightning * 120 : 0);
  gl.uniform4f(p.u('uStar'), star ? star.a : 0, star ? star.t : 0, star ? star.y : 0, star && !f.skyOwn ? 1 : 0); gl.uniform4f(p.u('uMisc'), tmr, floorEvent === 'bloodmoon' ? 1 : 0, f.R, sc);
  gl.uniform1i(p.u('uStain'), cs !== null ? 1 : 0); gl.uniform1i(p.u('uSkyFx'), f.skyFx && W29.flags.sky ? 1 : 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3); gl.activeTexture(gl.TEXTURE0); W29.n.passes++;
  return dst;
}
// ---- reserv i samma bildruta: CPU-världen (från glPost när WebGL föll, och från w29Pass när passet föll) ----
function w29Redo() { if (!W29.frameOn) return; W29.frameOn = W29.cur = false; W29.n.redo++; const lk = lkBegin(); try { renderWorld(W, VH, px); if (lk) lkProject(); } finally { if (lk) lkEnd(); } }
function w29Lost() { if (W29.frameOn) w29Redo(); } // från glPost (WebGL föll i den här bildrutan)
function w29Settings(select) { // från glSettings (BILD), bara med WebGL: VÄRLD och UPPLÖSNING
  if (settings.glWorld === undefined) settings.glWorld = 'cpu'; if (settings.glRes === undefined) settings.glRes = 'auto';
  if (glMode() !== 'webgl') return;
  select('VÄRLD', 'glWorld', [['cpu', 'CPU'], ['gpu', 'GRAFIKKORT']], () => { W29.failed = false; W29.err = ''; });
  select('UPPLÖSNING', 'glRes', [['auto', 'AUTO'], [1, '1×'], [2, '2×'], [3, '3×']]);
}
function w29Api() { // window.__game.w29: för t180–t184
  return { W29, want: w29Want, res: w29Res, auto: w29Auto, n: () => ({ ...W29.n, ok: W29.ok, failed: W29.failed, err: W29.err, R: W29.R, S: W29.S, cols: W29.cols, frameOn: W29.frameOn, slow: W29.slow, ft: +W29.ft.toFixed(2) }),
    grab: (w = 160, h = 100) => { // scenens bild före bloom och vinjett (F.post, alla S×S delpunkter), nedskalad till w×h (medel); rad 0 = överst
      const gl = GLR.gl, S = GLR.S, cw = SW * S, ch = SVH * S, a = new Uint8Array(cw * ch * 4), o = new Float32Array(w * h * 3), kx = cw / w, ky = ch / h;
      gl.bindFramebuffer(gl.FRAMEBUFFER, GLR.F.post.fb); gl.readPixels(0, 0, cw, ch, gl.RGBA, gl.UNSIGNED_BYTE, a); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      for (let y = 0; y < ch; y++) { const ty = Math.min(h - 1, (y / ky) | 0); for (let x = 0; x < cw; x++) { const i = (y * cw + x) * 4, j = (ty * w + Math.min(w - 1, (x / kx) | 0)) * 3; o[j] += a[i]; o[j + 1] += a[i + 1]; o[j + 2] += a[i + 2]; } }
      const k = 1 / (kx * ky); return Array.from(o, v => Math.round(v * k * 10) / 10); },
    png: () => { // scenens bild (F.post, S×) som PNG (dataURL), för skärmbilder utan HUD och pausens oskärpa
      const gl = GLR.gl, S = GLR.S, cw = SW * S, ch = SVH * S, a = new Uint8Array(cw * ch * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, GLR.F.post.fb); gl.readPixels(0, 0, cw, ch, gl.RGBA, gl.UNSIGNED_BYTE, a); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d'), im = g.createImageData(cw, ch); for (let i = 0; i < a.length; i += 4) { im.data[i] = a[i]; im.data[i + 1] = a[i + 1]; im.data[i + 2] = a[i + 2]; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); return c.toDataURL('image/png'); },
    mark: (kind, n = 6) => { let k = 0; for (let i = 0; i < n; i++) { const a = P.a + (i - n / 2) * 0.04, dx = Math.cos(a), dy = Math.sin(a), h = cast(P.x, P.y, dx, dy, 48); // t183: märken på väggen framför
        if (kind === 'v27') { if (v27Wall(h, dx, dy, 0.3 + (i % 3) * 0.2, [150, 10, 8], 0.12, 1)) k++; } else { const s0 = wallMarks.size; wallMark(h, dx, dy, 0.3 + (i % 3) * 0.2, kind); if (h.mx !== undefined) k++; } } return k; },
    decal: (kind, x, y) => { const f = fx.parts[kind]; if (!f) return false; decals.push({ x, y, img: f[0], size: kind === 'blood_pool' ? 0.09 : 0.04, life: 1e4 }); return true; },
    bench: (n = 60) => { // t182: render() i två delar: världen (CPU:ns del: strålar, golv/tak eller lagret, sprites) och utskriften (uppladdning och WebGL-anrop)
      const a = [], w = [], q = [], med = x => { x.sort((u, v) => u - v); return +x[x.length >> 1].toFixed(2); };
      for (let i = 0; i < n; i++) { const t0 = performance.now(), lk = lkBegin(); w29Begin(); try { renderWorld(W, VH, px); if (lk) lkProject(); } finally { if (lk) lkEnd(); W29.cur = false; } const t1 = performance.now(); renderPost(); const t2 = performance.now(); a.push(t2 - t0); w.push(t1 - t0); q.push(t2 - t1); }
      return { med: med(a), world: med(w), post: med(q), p90: +a.sort((u, v) => u - v)[(n * 0.9) | 0].toFixed(2), on: W29.frameOn, R: W29.R }; },
    sky: o => { // t183: himlens lägen (blodmåne, stjärnfall, blixt); null = som förut
      if ('blood' in o) { if (o.blood) { W29.fe0 = floorEvent; floorEvent = 'bloodmoon'; } else floorEvent = W29.fe0 === undefined ? floorEvent : W29.fe0; }
      if ('star' in o) star = o.star; if ('lightning' in o) lightning = o.lightning; return { floorEvent, star: !!star, lightning }; },
    tick: w29Tick, breakShader: on => { W29.brk = !!on; GLR.ok = false; GLR.P = {}; glInit(); W29.brk = false; return { ok: W29.ok, err: W29.err, glOk: GLR.ok }; },
    castCheck: () => { // mellankolumnens strålkastning mot v28Cast i samma riktning (heltalskolumner): samma träff, och inget sparas
      const v = view, out = { n: 0, same: 0, bad: [] }, sv = { pend: V28T.pend.slice(), gd: V28T.gd.slice(), n: { ...V28T.n }, seen: seen.slice() };
      for (let x = 0; x < SW; x += 3) { const camX = 2 * x / SW - 1, dx = v.dirX + v.plX * camX, dy = v.dirY + v.plY * camX, a = w29Sub(P.x, P.y, dx, dy), b = V28.glass ? v28Cast(P.x, P.y, dx, dy, x) : cast(P.x, P.y, dx, dy, 48, true); out.n++;
        if (a.dist === b.dist && a.cell === b.cell && a.wx === b.wx && a.side === b.side) out.same++; else if (out.bad.length < 4) out.bad.push({ x, a: [a.dist, a.cell, a.wx], b: [b.dist, b.cell, b.wx] }); }
      V28T.pend.set(sv.pend); V28T.gd.set(sv.gd); Object.assign(V28T.n, sv.n); seen.set(sv.seen); return out; },
    subSide: () => { const sv = seen.slice(), n0 = { ...V28T.n }; let ch = 0; for (let x = 0; x < SW; x++) { const camX = 2 * x / SW - 1; w29Sub(P.x, P.y, view.dirX + view.plX * camX, view.dirY + view.plY * camX); } for (let i = 0; i < seen.length; i++) if (seen[i] !== sv[i]) ch++; return { seenChanged: ch, nSame: JSON.stringify(n0) === JSON.stringify(V28T.n) }; } };
}
