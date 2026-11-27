// ---------- Version 29 (LJUS): dynamiskt ljus, vatten och efterbehandling i grafikkortet även i pausen, simningen och fotoläget ----------
// LJUS (BILD, med WebGL): glödande partiklar (eld, magi, gnistor), mynningsflammor, smällar, ljus som falnar och lysande projektiler
// lyser upp väggar, golv, tak och fiender runt sig i sin färg, med ett lätt flimmer. Ett eget pass i bufferns rum (1×, före scenen):
// världspositionen per bildpunkt räknas fram ur kolumnen, raden, väggens avstånd per kolumn (zbuf), väggsidan (krok i renderWalls),
// spritedjupet (när det redan finns) och kameran; ljuset läggs på multiplikativt mot ytans färg och dämpas med dimman.
// Mot bloom-felet i v28 (varmt upplysta rum tvättades ut): ljuset får aldrig lyfta en bildpunkt över ljusheten L29_CAP (0,62), alltså
// under bloomens tröskel (0,74). En ljus vägg blir inte ljusare, en mörk vägg nära en låga blir tydligt ljusare (t175).
// Ingen dubbelbelysning: facklor, lavans ljus och eldkastaren (strålen, brinnande mark och fiender, 0210) lyser redan på CPU:n och är
// inte med; eldkastarens egna lågor (partiklar) räknas inte som ljus medan den sprutar. MÖRKER: bara de rörliga ljusen, som på CPU:n.
// Flaggor: GLR.flags.light (LJUS), .modes (pausen, simningen och fotoläget i grafikkortet), .swim (VATTEN: vågor, blågrönt och kaustik
// under ytan). lowfx stänger av ljuset och vattnets vågor. Ett program som inte går att bygga stänger av bara sin effekt, inte WebGL.
const L29_MAX = 24, L29_CAP = 0.62;
const L29 = { P: {}, F: {}, ok: { light: false, fin: false }, err: '', n: 0, lp: new Float32Array(4 * L29_MAX), lc: new Float32Array(4 * L29_MAX), side: new Uint8Array(LK_W),
  col: new Float32Array(2 * LK_W), cap: null, imgCol: new WeakMap(), cl: [], clMap: new Map(), mz: null, cvDummy: null, swimSave: null, forceLights: null, title: false,
  st: { frames: 0, lights: 0, gatherMs: 0, passes: 0, finFrames: 0, pause: 0, photo: 0, swim: 0, mz: 0 } };
const L29_FS = {
  light: `#version 300 es
precision highp float; uniform sampler2D uW, uMask; uniform highp sampler2D uCol, uSd; uniform int uN, uSdOn, uOut, uNh; uniform vec4 uLp[${L29_MAX}], uLc[${L29_MAX}], uHot[6], uV, uC, uK, uM, uFx, uRay; uniform vec3 uFogC, uRayC; uniform int uRayN; out vec4 o;
float skyAt(vec2 p) { // LJUSSTRÅLAR: är bildpunkten p (bufferns rum) öppen himmel? Takplanet framför väggen i kolumnen, och kartans himmel (B)
  float dy = p.y - uC.w; if (dy >= -0.5 || p.x < 0.0 || p.x >= uK.x || p.y < 0.0) return 0.0; float pd = 166.0 * (1.0 - uC.z) / -dy, zw = texelFetch(uCol, ivec2(p.x, 0), 0).r; if (pd >= zw) return 0.0;
  vec2 q = uC.xy + (uV.xy + uV.zw * (2.0 * floor(p.x) / uK.x - 1.0)) * pd; return q.x < 0.0 || q.y < 0.0 || q.x >= uM.x || q.y >= uM.y ? float(uOut) : texelFetch(uMask, ivec2(q), 0).b; }
void main() {
  ivec2 ip = ivec2(gl_FragCoord.xy); vec3 c = texelFetch(uW, ip, 0).rgb; // rad 0 = buffertens översta rad, som i världspasset
  float camX = 2.0 * float(ip.x) / uK.x - 1.0; vec2 rd = uV.xy + uV.zw * camX, cs = texelFetch(uCol, ivec2(ip.x, 0), 0).rg; // samma stråle som renderWalls
  float dy = float(ip.y) - uC.w, d, z; vec3 n; bool sky = false, flo = false;
  float pd = dy > 0.0 ? 166.0 * uC.z / dy : dy < 0.0 ? 166.0 * (1.0 - uC.z) / -dy : 1e9; // golvets och takets radavstånd (PSC = 166)
  if (pd < cs.r) { d = pd; z = dy > 0.0 ? 0.0 : 1.0; n = vec3(0.0, 0.0, dy > 0.0 ? 1.0 : -1.0); sky = dy < 0.0 && uOut == 1; flo = dy > 0.0; }
  else { d = cs.r; z = uC.z - dy * d / 166.0; n = cs.g < 0.5 ? vec3(-sign(rd.x), 0.0, 0.0) : vec3(0.0, -sign(rd.y), 0.0); } // väggen: sidan mot kameran
  if (uSdOn == 1) { float s = texelFetch(uSd, ip, 0).r; if (s < d) { d = s; z = uC.z - dy * d / 166.0; n = vec3(-normalize(rd), 0.0); sky = false; flo = false; } } // fiender och galler
  vec3 wp = vec3(uC.xy + rd * d, z); vec2 mc = wp.xy - n.xy * 0.45; bool inMap = mc.x >= 0.0 && mc.y >= 0.0 && mc.x < uM.x && mc.y < uM.y;
  if (uFx.y > 0.0 && !sky) { // VÄRMEDALLER: över lava (kartans G, mjukt filtrerad) och nära eld; bilden förskjuts lätt
    float h = inMap ? texture(uMask, mc / uM.xy).g : 0.0; for (int i = 0; i < 6; i++) { if (i >= uNh) break; float q = length(wp.xy - uHot[i].xy) / uHot[i].z; h += uHot[i].w * max(0.0, 1.0 - q); }
    h = min(1.0, h) * uFx.y * (1.0 - smoothstep(4.0, 9.0, d));
    if (h > 0.02) { vec2 sp = vec2(ip) + vec2(sin(uM.z * 7.0 + float(ip.y) * 0.55 + wp.x * 3.0) * 1.3, sin(uM.z * 5.3 + float(ip.x) * 0.35) * 0.6) * h; c = texelFetch(uW, clamp(ivec2(sp + 0.5), ivec2(0), ivec2(uK.xy) - 1), 0).rgb; } }
  if (flo && uFx.x > 0.0 && inMap && texelFetch(uMask, ivec2(mc), 0).r > 0.5) { // VATTEN: golvet speglar väggen i samma kolumn (spegling kring väggens fotlinje), svagt och krusigt
    float yb = uC.w + 166.0 * uC.z / cs.r, yr = 2.0 * yb - float(ip.y) + sin(uM.z * 2.1 + wp.x * 4.0 + wp.y * 3.0) * 1.2;
    if (yr >= 0.0) { vec3 r = texelFetch(uW, ivec2(clamp(float(ip.x) + sin(uM.z * 1.7 + wp.y * 5.0), 0.0, uK.x - 1.0), int(yr)), 0).rgb;
      c = mix(c, r * vec3(0.64, 0.74, 0.8), uFx.x * (0.16 + 0.26 * clamp(d / 6.0, 0.0, 1.0))); } } // längre bort speglar ytan mer (Fresnel); vattnet tar ljus (spegelbilden är mörkare än väggen)
  if (!sky && uN > 0) {
    vec3 L = vec3(0.0);
    for (int i = 0; i < ${L29_MAX}; i++) { if (i >= uN) break; vec3 lv = uLp[i].xyz - wp; float dd = length(lv), r = uLp[i].w; if (dd >= r) continue;
      float a = 1.0 - dd / r; a *= a; float nl = clamp(dot(n, lv) / max(dd, 0.05) * 0.7 + 0.3, 0.0, 1.0); L += uLc[i].rgb * (uLc[i].a * a * nl); }
    float y0 = dot(c, vec3(0.299, 0.587, 0.114)); L *= exp(-d * uK.z) * (1.0 - smoothstep(0.1, 0.55, y0)); // dimman, och mörka ytor får mest (mellantoner lite, ljusa inget)
    vec3 l = min(c * (1.0 + L), vec3(1.0)); float y1 = dot(l, vec3(0.299, 0.587, 0.114));
    if (y1 > uK.w && y1 > y0) l = c + (l - c) * clamp((uK.w - y0) / (y1 - y0), 0.0, 1.0); // taket: aldrig över L29_CAP (under bloomens tröskel)
    c = l; }
  if (uRayN > 0) { // LJUSSTRÅLAR (skärmrymd): korta steg mot ljuskällan (månen/solen), samla öppen himmel; väggar skuggar (strålar under himlakanten och genom glipor, ingen slöja)
    vec2 st = normalize(uRay.xy - vec2(ip) + vec2(0.0, -0.001)) * uRay.z; float acc = 0.0, w = 1.0; vec2 p = vec2(ip) + 0.5;
    for (int i = 0; i < 16; i++) { if (i >= uRayN) break; p += st; acc += skyAt(p) * w; w *= 0.88; }
    float r = acc / float(uRayN) * uRay.w * (sky ? 0.35 : 1.0); c += uRayC * r * (vec3(1.0) - c); }
  if (uFx.z > 0.0) { // DIMMA som driver sakta: bankar i världens rum, tätast nära golvet och längre bort
    float nz = sin(wp.x * 0.9 + uM.z * 0.13) * sin(wp.y * 0.7 - uM.z * 0.11) + 0.5 * sin((wp.x + wp.y) * 1.7 + uM.z * 0.23);
    float f = uFx.z * clamp(0.45 + 0.55 * nz, 0.0, 1.0) * (1.0 - exp(-min(d, 30.0) * 0.35)) * clamp(1.25 - (sky ? 1.0 : z) * 1.3, 0.0, 1.0); c = mix(c, uFogC, f); }
  o = vec4(c, 1.0);
}`,
  fin: `#version 300 es
precision highp float; uniform sampler2D uP, uB1, uB2, uB3, uPz; uniform vec2 uCv; uniform float uRoll, uRs, uBloom, uVig, uAb, uT, uSwim, uWave, uPzK; uniform int uPh; uniform vec4 uMz; uniform vec3 uMzc; out vec4 o;
void main() {
  vec2 v = gl_FragCoord.xy / uCv, q = vec2(v.x * 320.0, (1.0 - v.y) * 200.0);
  if (uRoll != 0.0) { vec2 d = q - vec2(160.0, 100.0); float cs = cos(-uRoll), sn = sin(-uRoll); q = vec2(cs * d.x - sn * d.y, sn * d.x + cs * d.y) / uRs + vec2(160.0, 100.0); }
  if (q.x < 0.0 || q.y < 0.0 || q.x >= 320.0 || q.y >= 200.0) { o = vec4(0.0, 0.0, 0.0, 1.0); return; }
  if (uWave > 0.0) { q.x += sin(uT * 2.6 + q.y * 0.06) * 1.6 * uWave; q.y += sin(uT * 1.9 + q.x * 0.045) * 0.7 * uWave; q = clamp(q, vec2(0.0), vec2(319.9, 199.9)); } // under ytan: bilden böljar (som CPU:ns remsor, fast mjukt)
  vec2 uv = q / vec2(320.0, 200.0); vec3 c;
  if (uAb > 0.0) { vec2 dd = (uv - 0.5) * uAb * 0.01; c = vec3(texture(uP, uv + dd).r, texture(uP, uv).g, texture(uP, uv - dd).b); } else c = texture(uP, uv).rgb;
  if (uPzK > 0.0) c = mix(c, texture(uPz, uv).rgb, uPzK); // pausen: oskärpan
  if (uBloom > 0.0) { vec3 b = min((texture(uB1, uv).rgb * 0.55 + texture(uB2, uv).rgb * 0.35 + texture(uB3, uv).rgb * 0.25) * uBloom, vec3(1.0)); c = c + b * (1.0 - c); }
  if (uSwim > 0.0) { vec2 w = uv * vec2(9.0, 6.0); float ca = sin(w.x + uT * 1.3 + sin(w.y * 1.7 + uT)) * sin(w.y * 1.1 - uT * 0.9 + sin(w.x * 1.3)); // ljuset bryts: kaustik uppifrån
    c = mix(c, c * vec3(0.55, 0.86, 0.92) + vec3(0.0, 0.035, 0.06), 0.65 * uSwim); c *= 1.0 + 0.12 * uSwim * ca * ca * (1.0 - uv.y); }
  if (uMz.w > 0.0) { float g = max(0.0, 1.0 - length((q - uMz.xy) / uMz.z)); c += uMzc * (g * g * uMz.w) * (1.0 - c); } // mynningsglöden läggs till (screen), inte över
  if (uVig > 0.0) { vec2 k = (uv - 0.5) * vec2(1.0, 0.8); c *= 1.0 - uVig * smoothstep(0.08, 0.5, dot(k, k)); }
  if (uPh > 0) { float l = dot(min(c, vec3(1.0)), vec3(0.3, 0.59, 0.11)); c = vec3(l); // fotolägets filter, som 2D-dukens saturation/multiply/screen
    if (uPh == 2) c *= vec3(0.878, 0.722, 0.502); else if (uPh == 3) { c *= vec3(0.376, 1.0, 0.439); c += (vec3(1.0) - (vec3(1.0) - c) * (vec3(1.0) - vec3(0.078, 0.314, 0.078)) - c) * 0.4; } }
  o = vec4(min(c, vec3(1.0)), 1.0);
}`
};
function l29Build() { // från glBuild: egna program, var för sig; ett fel stänger av bara den effekten
  L29.P = {}; L29.F = {}; L29.ok = { light: false, fin: false }; L29.err = '';
  for (const k in L29_FS) { try { L29.P[k] = glProg(GL_VS, L29.brk === k ? L29_FS[k].replace('void main', 'void main( ') : L29_FS[k]); L29.ok[k] = true; } catch (e) { L29.err = (k + ': ' + String(e && e.message || e)).slice(0, 120); try { console.warn('LJUS (v29) → av:', L29.err); } catch (e2) { /* tyst */ } } }
  try { L29.maskOf = null; L29.T = { col: glTex(LK_W, 1, 'rg32f') }; }
  catch (e) { L29.ok.light = false; L29.err = 'col'; }
}
function l29Pref(k) { const v = settings[k]; return v === 'on' || (v === undefined && !navigator.webdriver); } // AUTO: på för spelaren, av under webdriver (gamla tester och bildhasher)
function l29LightOn() { return GLR.flags.light !== false && L29.ok.light && !settings.lowfx && l29Pref('glLight'); }
function l29ReflOn() { return GLR.flags.refl !== false && L29.ok.light && !settings.lowfx && l29Pref('glWater'); } // VATTEN: speglande vatten
function l29AirOn() { return L29.ok.light && !settings.lowfx && l29Pref('glAir'); } // LUFT: värmedaller (flags.haze) och drivande dimma (flags.fog)
function l29SwimOn() { return GLR.flags.swim !== false && L29.ok.fin && l29Pref('glWater'); }
function l29Mode(m) { // glWant: pausen, fotoläget och simningen i grafikkortet (annars CPU-vägen som i v28)
  if (GLR.flags.modes === false || !L29.ok.fin) return false;
  return m !== 'swim' || l29SwimOn(); // VATTEN AV: simningen går CPU-vägen som förut (remsorna)
}
// ---- från lkBegin (upp/ned-blicken): bufferten har annars bara de rader och punkter som skärmen läser; speglingen och dallret läser
// andra bildpunkter, så när de användes förra bildrutan ritas hela bufferten (inte på telefon: där står de över i upp/ned-blicken) ----
function l29LkFull(d) {
  L29.lkFull = false; if (!L29.wantFull) return;
  LK.need.fill(1, 0, d.TH); LK.sZ.fill(0, 0, d.TH); LK.xa.fill(0, 0, d.TH); LK.xb.fill(d.TW - 1, 0, d.TH); L29.lkFull = true; L29.st.lkFull = (L29.st.lkFull || 0) + 1;
}
// ---- från renderWalls: väggsidan per kolumn (bara en skrivning; CPU-vägen läser den aldrig) ----
function l29Side(x, s) { L29.side[x] = s; }
// ---- från drawWeapon: mynningsflammans plats på skärmen (glöden i nästa bildruta, och ett ljus i världen) ----
function l29Muzzle(mq, s, wp) { const m = L29.mz || (L29.mz = { x: 0, y: 0, s: 0, t: -9, col: null }); m.x = mq[0]; m.y = mq[1]; m.s = s; m.t = tmr; m.col = FX27_MCOL[wp.id] || MUZZLE_COL[wp.id] || [255, 200, 120]; }
function l29ImgCol(img) { // glödens färg ur bilden (en gång per bild): medel av de synliga bildpunkterna, starkaste kanalen = 1
  let c = L29.imgCol.get(img); if (c) return c; const d = img.data; let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 3) { const p = d[i]; if (p >>> 24 < 100) continue; r += p & 255; g += (p >> 8) & 255; b += (p >> 16) & 255; n++; }
  const m = Math.max(1, r, g, b); c = n ? [r / m, g / m, b / m] : [1, 0.7, 0.4]; L29.imgCol.set(img, c); return c;
}
function l29Add(x, y, z, r, cr, cg, cb, k) { // ett ljus till listan (färg 0–1, styrka k)
  if (!(k > 0.02)) return; const dx = x - P.x, dy = y - P.y, cl = L29.cl, pool = L29.pool || (L29.pool = []); if (cl.length >= 512) return;
  const o = pool[cl.length] || (pool[cl.length] = {}); o.x = x; o.y = y; o.z = z; o.r = r; o.cr = cr; o.cg = cg; o.cb = cb; o.k = k; o.sc = k / (1 + (dx * dx + dy * dy) * 0.04); cl.push(o); // återanvända objekt, sorteras en gång
}
// ---- från glPreSprites (en gång per bildruta med WebGL): ljuslistan, kameran och väggarnas avstånd för ljuspasset ----
const L29_WATER = ['water', 'deep', 'shallow', 'oasis', 'piranha'], L29_HEAT = ['lava', 'molten'];
function l29Mask() { // kartans mask (en gång per våning): R = vatten, G = värme (lava), B = öppen himmel; mjukt filtrerad för värmen
  const gl = GLR.gl, n = mw * mh, d = new Uint8Array(n * 4), wi = new Set(L29_WATER.map(k => animTex[k]).filter(v => v !== undefined)), hi = new Set(L29_HEAT.map(k => animTex[k]).filter(v => v !== undefined));
  let wat = 0, hot = 0; for (let i = 0; i < n; i++) { const f = cellFloor[i]; if (wi.has(f)) { d[i * 4] = 255; wat++; } if (hi.has(f)) { d[i * 4 + 1] = 255; hot++; } d[i * 4 + 2] = cellSky && cellSky[i] ? 255 : 0; d[i * 4 + 3] = 255; }
  if (!L29.T.mask || L29.T.mask.w !== mw || L29.T.mask.h !== mh) { if (L29.T.mask) gl.deleteTexture(L29.T.mask.t); L29.T.mask = glTex(mw, mh, 'rgba', true); }
  gl.bindTexture(gl.TEXTURE_2D, L29.T.mask.t); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, mw, mh, gl.RGBA, gl.UNSIGNED_BYTE, d); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  L29.maskOf = lvl; L29.maskCf = cellFloor; L29.wat = wat; L29.hot = hot; L29.maskData = d; L29.st.masks = (L29.st.masks || 0) + 1;
}
function l29Gather() {
  L29.cap = null; L29.n = 0; L29.nh = 0; L29.fx = null; L29.wantFull = false; if (!lvl || !cellFloor) return;
  const lon = l29LightOn(), ron = l29ReflOn(), aon = l29AirOn(); if (!lon && !ron && !aon) return;
  if ((ron || aon) && (L29.maskOf !== lvl || L29.maskCf !== cellFloor)) l29Mask();
  const bf = BIOME_FX[lvl.biome], fogOn = aon && GLR.flags.fog !== false && bf && (bf.weather === 'groundfog' || bf.weather === 'swamp');
  const fx29 = [ron && L29.wat > 0 ? (settings.noFlash ? 0.7 : 1) : 0, aon && GLR.flags.haze !== false && !settings.reduceMotion ? 1 : 0, fogOn ? 0.4 : 0];
  if (fx29[2] > 0) { const k = 1.5; L29.fogC = [Math.min(1, fogR / 255 * k + 0.16), Math.min(1, fogG / 255 * k + 0.17), Math.min(1, fogB / 255 * k + 0.19)]; }
  L29.ray = null; if (aon && GLR.flags.rays !== false && lvl.sky && !lvl.dark && view) { // ljusstrålar: utomhus, från månens/solens håll (MOON_A) högt över horisonten
    let da = MOON_A - view.a; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < 1.2) { const q = Math.hypot(view.plX, view.plY) || 1, cx = Math.tan(da) / q;
      L29.ray = [(cx + 1) * W / 2, view.hor - 58, DEVICE === 'mobil' ? 3 : 2.2, Math.min(0.4, 0.4 * Math.cos(da)) * (settings.noFlash ? 0.6 : 1), DEVICE === 'mobil' ? 8 : 12]; fx29[3] = 1; } }
  if (fx29[0] || fx29[1] || fx29[2] || fx29[3]) L29.fx = fx29;
  L29.wantFull = DEVICE !== 'mobil' && ((fx29[0] > 0 && L29.wat > 0) || (fx29[1] > 0 && L29.hot > 0)); // upp/ned-blicken: hela bufferten nästa bildruta (l29LkFull)
  if (!lon) { if (L29.fx) l29Cap(); return; }
  const t0 = performance.now(), cl = L29.cl; cl.length = 0; const nf = settings.noFlash ? 0.5 : 1;
  const flaming = P.flameAt !== undefined && tmr - P.flameAt < 0.12 && tmr >= P.flameAt, flameFr = flaming ? (fx.parts && fx.parts.flame) || fx.fire : null;
  // glödande partiklar, samlade per halv ruta
  const cm = L29.clMap; cm.clear(); const ps = particles;
  const ex = L29.ex || (L29.ex = new Float32Array(48)); let ne = 0; // brinnande mark och brinnande fiender lyser redan (0210): deras lågor räknas inte
  for (const g of groundFires) { if (ne >= 24) break; if (Math.abs(g.x - P.x) < 14 && Math.abs(g.y - P.y) < 14) { ex[ne * 2] = g.x; ex[ne * 2 + 1] = g.y; ne++; } }
  for (const e of ents) { if (ne >= 24) break; if (e.burn > 0 && !e.dead && !e.dormant && Math.abs(e.x - P.x) < 14 && Math.abs(e.y - P.y) < 14) { ex[ne * 2] = e.x; ex[ne * 2 + 1] = e.y; ne++; } }
  const stp = Math.max(1, Math.ceil(ps.length / 600)); // många partiklar (MAX ×16): var stp:e räknas, med stp gånger vikten (tiden hålls nere)
  for (let i = 0; i < ps.length; i += stp) { const o = ps[i]; if (!o.add || !o.img || !o.img.data) continue; if (flameFr !== null && o.frames === flameFr) continue; // eldkastarens lågor lyser redan (0210)
    const dx = o.x - P.x, dy = o.y - P.y; if (dx * dx + dy * dy > 196) continue;
    if (ne) { let near = false; for (let j = 0; j < ne; j++) { const ax = o.x - ex[j * 2], ay = o.y - ex[j * 2 + 1]; if (ax * ax + ay * ay < 0.8) { near = true; break; } } if (near) continue; }
    const fl = o.fade ? Math.min(1, o.life * 2, ((o.maxLife || o.life) - o.life) * 2 + 0.3) : Math.min(1, o.life * 4), w = (o.size || 0.3) * Math.max(0, fl) * stp; if (!(w > 0.004)) continue;
    const t = o.tint, ic = t ? null : l29ImgCol(o.img), cr = t ? t[0] / 255 : ic[0], cg = t ? t[1] / 255 : ic[1], cb = t ? t[2] / 255 : ic[2];
    const key = ((o.x * 2) | 0) * 8192 + ((o.y * 2) | 0); let c = cm.get(key); if (!c) { c = { x: 0, y: 0, z: 0, w: 0, r: 0, g: 0, b: 0 }; cm.set(key, c); }
    c.x += o.x * w; c.y += o.y * w; c.z += (o.z || 0.3) * w; c.w += w; c.r += cr * w; c.g += cg * w; c.b += cb * w; }
  let ci = 0; for (const c of cm.values()) { if (++ci > 400) break; const iw = 1 / c.w, s = Math.sqrt(c.w), m = Math.max(c.r, c.g, c.b) * iw || 1;
    l29Add(c.x * iw, c.y * iw, Math.min(0.95, c.z * iw), Math.min(2.8, 1 + s * 0.75), c.r * iw / m, c.g * iw / m, c.b * iw / m, Math.min(1, 0.38 * s) * (0.9 + 0.1 * Math.sin(tmr * 19 + c.x * 5 + c.y * 3))); }
  // mynningsflamman (inte eldkastaren: dess stråle lyser redan)
  const wp = WEAPONS[P.weapon], mz = L29.mz;
  if (!flaming && wp && (P.flash > 0.005 || (mz && tmr - mz.t < 0.06 && tmr >= mz.t))) { const c = FX27_MCOL[wp.id] || MUZZLE_COL[wp.id] || [255, 200, 120], k = Math.min(0.9, Math.max(P.flash * 10, mz && tmr - mz.t < 0.06 ? 0.6 : 0)) * nf; // CPU:n lyser redan (P.flash): en mjuk pöl ovanpå
    l29Add(P.x + Math.cos(P.a) * 0.45, P.y + Math.sin(P.a) * 0.45, Math.max(0.2, P.camZ - 0.12), 3.2, c[0] / 255, c[1] / 255, c[2] / 255, k); }
  // smällar, blixtar och ljus som falnar lyser redan på CPU:n (per ruta): här bara en svag, mjuk ljuspöl i sin färg ovanpå (ingen dubbel styrka)
  for (const f of flashes) { const c = f.col || [255, 150, 60]; l29Add(f.x, f.y, 0.45, Math.min(4, 1.5 + (f.r || 3) * 0.5), c[0] / 255, c[1] / 255, c[2] / 255, Math.min(0.7, f.t * 2) * nf); }
  for (const l of WP.lights) { const c = l.col || [255, 120, 40]; l29Add(l.x, l.y, 0.4, Math.min(4, l.r * 0.65), c[0] / 255, c[1] / 255, c[2] / 255, Math.min(0.6, l.s * 0.3 * Math.pow(l.t / l.life, 1.6)) * nf); }
  for (const pr of projectiles) { const c = PROJ_TINT[pr.kind] || (pr.friendly ? null : [255, 130, 50]); if (!c) continue; l29Add(pr.x, pr.y, pr.z !== undefined ? clamp(pr.z, 0.1, 0.9) : 0.5, 2.2, c[0] / 255, c[1] / 255, c[2] / 255, 0.8); } // eldklot och magi
  if (L29.forceLights) for (const l of L29.forceLights) l29Add(...l); // t175–t177: ljus som testet ställer dit
  cl.sort((a, b) => b.sc - a.sc); const n = Math.min(L29_MAX, cl.length), lp = L29.lp, lc = L29.lc;
  for (let i = 0; i < n; i++) { const l = cl[i], j = i * 4; lp[j] = l.x; lp[j + 1] = l.y; lp[j + 2] = l.z; lp[j + 3] = l.r; lc[j] = l.cr; lc[j + 1] = l.cg; lc[j + 2] = l.cb; lc[j + 3] = l.k; }
  L29.n = n; L29.st.lights = n; L29.st.gatherMs = L29.st.gatherMs * 0.9 + (performance.now() - t0) * 0.1;
  if (L29.fx && L29.fx[1]) { const hs = L29.hotA || (L29.hotA = new Float32Array(24)); let h = 0; // värmedaller: de varmaste ljusen (eld) och eldkastarens stråle
    if (flaming) for (const t of [0.5, 1]) if (h < 6) { hs.set([P.x + (P.flameEx - P.x) * t, P.y + (P.flameEy - P.y) * t, 1.4, 0.7], h * 4); h++; }
    for (let i = 0; i < n && h < 6; i++) { const l = cl[i]; if (l.cr > 0.85 && l.cb < 0.6 && l.k > 0.4 && l.r > 1.5) { hs.set([l.x, l.y, 1.3, Math.min(0.8, l.k * 0.6)], h * 4); h++; } }
    for (const g of groundFires) { if (h >= 6) break; hs.set([g.x, g.y, 1.1, 0.5 * Math.min(1, g.t)], h * 4); h++; }
    L29.nh = h; }
  if (!n && !L29.fx) return;
  l29Cap();
}
function l29Cap() { // kameran och väggarnas avstånd för passet (zbuf före spritesen: bakväggen bakom galler)
  const col = L29.col; for (let x = 0; x < W; x++) { col[x * 2] = zbuf[x]; col[x * 2 + 1] = L29.side[x]; }
  L29.cap = { bw: W, bh: VH, dirX: view.dirX, dirY: view.dirY, plX: view.plX, plY: view.plY, hor: view.hor, camZ: view.camZ, px: P.x, py: P.y, fog: fogK, out: lvl.sky ? 1 : 0 };
}
// ---- från glDraw: ljuspasset (bufferns rum, 1×) → texturen som världspasset läser; null = inget ljus i den här bildrutan ----
function l29LightPass(bw, bh, lk) {
  const c = L29.cap; if (!c || !(L29.n || L29.fx) || c.bw !== bw || c.bh !== bh || (LK.on && !lk)) return null; // CPU:ns homografi: inte bufferns rum
  const gl = GLR.gl, T = GLR.T, p = L29.P.light;
  if (!L29.F.lit) L29.F.lit = glFbo(LK_W, LK_H, false, false);
  gl.bindTexture(gl.TEXTURE_2D, L29.T.col.t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, bw, 1, gl.RG, gl.FLOAT, L29.col.subarray(0, bw * 2));
  const sdOn = GLR.sd !== null && GLR.parts && GLR.sdAny !== false && GLR.partsW === bw && GLR.partsH === bh; // spritedjupet bara när partiklarna redan laddar upp det
  gl.bindFramebuffer(gl.FRAMEBUFFER, L29.F.lit.fb); gl.viewport(0, 0, bw, bh); gl.bindVertexArray(GLR.vao); gl.useProgram(p);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T.world.t); gl.uniform1i(p.u('uW'), 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, L29.T.col.t); gl.uniform1i(p.u('uCol'), 1);
  gl.activeTexture(gl.TEXTURE2); if (sdOn) { gl.bindTexture(gl.TEXTURE_2D, T.sd.t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, bw, bh, gl.RED, gl.FLOAT, GLR.sd.subarray(0, bw * bh)); GLR.l29sdUp = true; } else gl.bindTexture(gl.TEXTURE_2D, T.far.t);
  gl.uniform1i(p.u('uSd'), 2); gl.uniform1i(p.u('uSdOn'), sdOn ? 1 : 0); gl.uniform1i(p.u('uOut'), c.out); gl.uniform1i(p.u('uN'), L29.n);
  if (L29.n) { gl.uniform4fv(p.u('uLp'), L29.lp.subarray(0, L29.n * 4)); gl.uniform4fv(p.u('uLc'), L29.lc.subarray(0, L29.n * 4)); }
  // upp/ned-blicken: utan hela bufferten (l29LkFull) har den glesa rader, och då står speglingen och dallret (som läser andra bildpunkter) över
  const f0 = L29.fx || [0, 0, 0], fx = lk && !L29.lkFull ? [0, 0, f0[2], f0[3]] : f0; gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, (L29.T.mask || T.lut).t); gl.uniform1i(p.u('uMask'), 3);
  gl.uniform4f(p.u('uM'), L29.T.mask ? L29.T.mask.w : 1, L29.T.mask ? L29.T.mask.h : 1, settings.reduceMotion ? 0 : tmr % 1000, 0); gl.uniform4f(p.u('uFx'), fx[0], fx[1], fx[2], 0); // reduceMotion: dimman och krusningen står still
  const fc = L29.fogC || [0.5, 0.5, 0.5]; gl.uniform3f(p.u('uFogC'), fc[0], fc[1], fc[2]); gl.uniform1i(p.u('uNh'), fx[1] ? L29.nh : 0); if (fx[1] && L29.nh) gl.uniform4fv(p.u('uHot'), L29.hotA.subarray(0, L29.nh * 4));
  const ry = fx[3] && L29.ray; gl.uniform1i(p.u('uRayN'), ry ? ry[4] : 0); if (ry) { gl.uniform4f(p.u('uRay'), ry[0], ry[1], ry[2], ry[3]); const rc = BIOME_TINT[lvl.biome] || [235, 230, 255]; gl.uniform3f(p.u('uRayC'), 0.6 + rc[0] / 640, 0.6 + rc[1] / 640, 0.6 + rc[2] / 640); L29.st.rays = (L29.st.rays || 0) + 1; }
  if (fx[0]) L29.st.refl = (L29.st.refl || 0) + 1; if (fx[1]) L29.st.haze = (L29.st.haze || 0) + 1; if (fx[2]) L29.st.fog = (L29.st.fog || 0) + 1;
  gl.uniform4f(p.u('uV'), c.dirX, c.dirY, c.plX, c.plY); gl.uniform4f(p.u('uC'), c.px, c.py, c.camZ, c.hor); gl.uniform4f(p.u('uK'), bw, bh, c.fog, L29_CAP);
  gl.drawArrays(gl.TRIANGLES, 0, 3); gl.activeTexture(gl.TEXTURE0); L29.st.frames++; L29.st.passes++;
  return L29.F.lit;
}
// ---- från glDraw: ut på duken med v29-programmet (pausens oskärpa, vatten, mynningsglöd, fotofilter); null = v28:s program ----
function l29Swim() { return state === 'play' && BF.swim > 0 && l29SwimOn() && !settings.lowfx ? BF.swim : 0; }
function l29FinNeed() {
  if (!L29.ok.fin || GLR.flags.modes === false) return false;
  const mz = L29.mz; return state === 'pause' || (photo && state === 'play') || l29Swim() > 0 || !!(mz && tmr - mz.t < 0.06 && tmr >= mz.t && !settings.lowfx);
}
function l29Final(bk) { // bk = bloomens styrka; gör pausens oskärpa och returnerar programmet med sina extra uniformer satta (övriga sätter glDraw)
  if (!l29FinNeed()) return null;
  const gl = GLR.gl, F = GLR.F, P5 = GLR.P, fp = L29.P.fin; let pz = 0;
  if (state === 'pause' && !settings.lowfx) { pz = settings.reduceMotion || MF.st !== 'pause' ? 1 : clamp((performance.now() - MF.stT) / 280, 0, 1); // som drawPause
    if (!L29.F.pz) { L29.F.pz = glFbo(160, 100, true); L29.F.pzb = glFbo(160, 100, true); }
    const pass = (prog, src, dst, set) => { gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb); gl.viewport(0, 0, dst.w, dst.h); gl.useProgram(prog); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.t);
      gl.uniform1i(prog.u('uT'), 0); gl.uniform2f(prog.u('uInv'), 1 / dst.w, 1 / dst.h); if (set) set(prog); gl.drawArrays(gl.TRIANGLES, 0, 3); };
    gl.bindTexture(gl.TEXTURE_2D, F.post.t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    pass(P5.down, F.post, L29.F.pz); pass(P5.blur, L29.F.pz, L29.F.pzb, p => gl.uniform2f(p.u('uDir'), 1, 0)); pass(P5.blur, L29.F.pzb, L29.F.pz, p => gl.uniform2f(p.u('uDir'), 0, 1));
    L29.st.passes += 3; L29.st.pause++; }
  gl.useProgram(fp); gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, (L29.F.pz || F.b1).t); gl.uniform1i(fp.u('uPz'), 4); gl.uniform1f(fp.u('uPzK'), pz * 0.85);
  const sw = l29Swim(); gl.uniform1f(fp.u('uSwim'), sw); gl.uniform1f(fp.u('uWave'), sw > 0 && !settings.reduceMotion ? sw : 0); gl.uniform1f(fp.u('uT'), tmr % 1000); if (sw > 0) L29.st.swim++;
  const ph = photo && state === 'play' ? PHOTO_FILTERS[(settings.photoFilter || 0) % PHOTO_FILTERS.length] : null; gl.uniform1i(fp.u('uPh'), ph === 'svartvit' ? 1 : ph === 'sepia' ? 2 : ph === 'nattseende' ? 3 : 0); if (photo && state === 'play') L29.st.photo++;
  const mz = L29.mz, mzOn = mz && tmr - mz.t < 0.06 && tmr >= mz.t && !settings.lowfx && state === 'play' && !photo;
  if (mzOn) { const c = mz.col; gl.uniform4f(fp.u('uMz'), mz.x, mz.y, Math.max(8, mz.s * 1.6), (settings.noFlash ? 0.25 : 0.55) * (1 - (tmr - mz.t) / 0.06)); gl.uniform3f(fp.u('uMzc'), c[0] / 255, c[1] / 255, c[2] / 255); L29.st.mz++; }
  else gl.uniform4f(fp.u('uMz'), 0, 0, 1, 0);
  gl.activeTexture(gl.TEXTURE0); L29.st.finFrames++;
  return fp;
}
// ---- fotoläget: filtret görs i shadern (2D-dukens saturation/multiply över en genomskinlig duk skulle bli en grå hinna) ----
function l29Photo() { // från photoFilter: true = grafikkortet har gjort filtret; skriver bara raden med filtrets namn
  if (!GLR.used || !L29.ok.fin) return false; const f = PHOTO_FILTERS[(settings.photoFilter || 0) % PHOTO_FILTERS.length]; if (!f) return true;
  const t = 'FILTER: ' + f.toUpperCase() + ' (1–4 BYTER)'; txt(t, 4, 4, '#e8d9b0', 1, true, 0.7); return true;
}
// ---- simningen: CPU:ns remsor (kopior av 2D-duken) hoppas över när grafikkortet gör vågorna; krokar före och efter raden ----
function l29SwimPre() { if (!GLR.used || !(BF.swim > 0) || !l29Swim()) return; if (!L29.cvDummy) { L29.cvDummy = document.createElement('canvas'); L29.cvDummy.width = L29.cvDummy.height = 1; }
  L29.swimSave = [BF.wcv, BF.wg]; BF.wcv = L29.cvDummy; BF.wg = L29.cvDummy.getContext('2d'); } // en tom 1×1-duk: remsorna ritar ingenting (vapnet blir inte dubbelt)
function l29SwimPost() { if (L29.swimSave) { [BF.wcv, BF.wg] = L29.swimSave; L29.swimSave = null; } }
// ---- startskärmen: kameraflykten (160×100) ut genom grafikkortet med bloom; vinjetten ritas som förut på 2D-duken ----
function l29Title() { // från tlRender: true = grafikkortet har ritat bilden (2D-duken töms och får vinjetten)
  if (GLR.flags.modes === false || GLR.flags.title === false || glMode() !== 'webgl' || GLR.failed || !TL.buf || !glInit()) return false;
  const gl = GLR.gl; if (gl.isContextLost()) { glFail('KONTEXTEN FÖRLORADES'); return false; }
  GLR.img = { buf: TL.buf, w: TL_W, h: TL_H }; try { glDraw(); } catch (e) { GLR.img = null; glFail(String(e && e.message || e).slice(0, 80)); return false; } GLR.img = null;
  if (gl.isContextLost()) { glFail('KONTEXTEN FÖRLORADES'); return false; }
  ctx.clearRect(0, 0, SW, H); ctx.drawImage(TL.vig, 0, 0); glShow(true); L29.title = true; L29.st.title = (L29.st.title || 0) + 1; return true;
}
// ---- döden: färgen rinner ur bilden i shadern (glDraw, uDes); 2D-dukens saturation-fyllning ritas osynlig (globalAlpha 0) ----
function l29DeadOn() { return GLR.used && GLR.flags.modes !== false && state === 'dead'; }
function l29DeadPre(g) { if (l29DeadOn()) { L29.deadA = g.globalAlpha; g.globalAlpha = 0; } }
function l29DeadPost(g) { if (L29.deadA !== undefined) { g.globalAlpha = L29.deadA; L29.deadA = undefined; } }
function l29Settings(select) { // från glSettings (BILD): LJUS, VATTEN (under ytan och speglingar) och LUFT (värmedaller och dimma)
  if (settings.glLight === undefined) settings.glLight = navigator.webdriver ? 'off' : 'on'; if (settings.glWater === undefined) settings.glWater = navigator.webdriver ? 'off' : 'on';
  select('LJUS', 'glLight', [['on', 'PÅ'], ['off', 'AV']]);
  select('VATTEN', 'glWater', [['on', 'PÅ'], ['off', 'AV']]);
  if (settings.glAir === undefined) settings.glAir = navigator.webdriver ? 'off' : 'on'; select('LUFT', 'glAir', [['on', 'PÅ'], ['off', 'AV']]); // värmedaller och dimma
}
function l29Api() { // window.__game.l29: för t175–t179
  return { L29, n: () => ({ ...L29.st, n: L29.n, ok: { ...L29.ok }, err: L29.err, lightOn: l29LightOn(), swimOn: l29SwimOn(), reflOn: l29ReflOn(), airOn: l29AirOn(), fx: L29.fx && [...L29.fx], wat: L29.wat || 0, hot: L29.hot || 0, nh: L29.nh || 0 }),
    mask: () => L29.maskData ? { w: mw, h: mh, d: Array.from(L29.maskData) } : null, lights: () => Array.from(L29.lp.subarray(0, L29.n * 4)),
    gather: () => { l29Gather(); return L29.n; },
    probe: (rgb, o = {}) => { // en jämn färg som vägg 2 rutor fram (alla kolumner), ljus som testet anger (annars ett varmt ljus framför väggen); bildpunkten i mitten med ljuset av och på
      if (!glInit() || !L29.ok.light) return null; const n = SW * SVH, save = spx.slice(0, n), col = 0xff000000 | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0]; spx.fill(col, 0, n);
      const lk = LK.on, parts = GLR.parts, vig = GLR.flags.vig, gl = GLR.gl; LK.on = false; GLR.parts = false; GLR.flags.vig = false; const dist = o.dist || 2, out = {};
      const lights = o.lights || [[P.x + Math.cos(view.a) * (dist - 0.6), P.y + Math.sin(view.a) * (dist - 0.6), 0.5, 3, 1, 0.62, 0.28, 1.3]];
      for (let x = 0; x < SW; x++) { L29.col[x * 2] = dist; L29.col[x * 2 + 1] = 0; }
      const rd = (fx, fy) => { const p = new Uint8Array(4); gl.readPixels(Math.round(fx * GLR.cw), Math.round((1 - fy) * GLR.ch), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p); return [p[0], p[1], p[2]]; };
      try { for (const on of [false, true]) { L29.n = on ? lights.length : 0;
          for (let i = 0; i < lights.length; i++) { const l = lights[i], j = i * 4; L29.lp.set(l.slice(0, 4), j); L29.lc.set(l.slice(4, 8), j); }
          L29.fx = null; L29.cap = { bw: SW, bh: SVH, dirX: view.dirX, dirY: view.dirY, plX: view.plX, plY: view.plY, hor: SHOR, camZ: view.camZ, px: P.x, py: P.y, fog: o.fog !== undefined ? o.fog : 0, out: 0 };
          glDraw(); out[on ? 'on' : 'off'] = { mid: rd(0.5, 0.5 * SVH / H), side: rd(0.5 + 40 / SW, 0.5 * SVH / H), far: rd(0.04, 0.5 * SVH / H) }; } }
      finally { spx.set(save); LK.on = lk; GLR.parts = parts; GLR.flags.vig = vig; L29.cap = null; L29.n = 0; L29.fx = null; } return out; },
    breakShader: k => { L29.brk = k; GLR.ok = false; GLR.P = {}; glInit(); L29.brk = null; return { ...L29.ok, err: L29.err, glOk: GLR.ok }; } };
}
