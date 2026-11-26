// ---------- Version 28 (WEBGL): grafikkortet ritar ut bilden, efterbehandlingen och partiklarna ----------
// RENDERING (BILD): AUTO = WebGL om det finns, annars CPU (under navigator.webdriver är AUTO = CPU, så att gamla tester och
// bildhasher inte påverkas) · CPU = som förut (putImageData) · WEBGL. CPU-vägen är orörd; WebGL-vägen tar över i renderPost.
// Lager: en WebGL-duk (#glscreen, skapas först när läget blir WebGL) ligger under #screen, som då är genomskinlig där världen är:
// HUD, vapen, menyer och text ritas på 2D-duken precis som förut. Bildrutor som läser tillbaka 2D-duken (pausens oskärpa, simningens
// vågor, fotoläget) och lägen utan värld går CPU-vägen. Förlorad kontext, ett fel eller en duk som inte går att skapa ger CPU-vägen
// direkt (samma bildruta) utan att spelet stannar; att välja RENDERING igen försöker på nytt.
// Pass (alla i grafikkortet): 1) världen (px, 320×200 eller upp/ned-blickens större buffert) som textur → scen-FBO i S× upplösning,
// sedan partiklarna som instansierade quads med djuptest mot zbuf (per kolumn) och spritedjupet (per bildpunkt, skrivs av drawSprite);
// 2) upp/ned-blickens homografi (samma rad- och kolumnmatte som lkProject), färgton (gradeLUT som textur), färgblindläge och gråning;
// 3) BLOOM: ljusa och varma bildpunkter trösklas, suddas i tre nedskalade steg och läggs ovanpå; 4) lutning (P.roll), mjuk vinjett och
// lätt kromatisk aberration vid skada, ut på duken (närmaste granne, eller mjuk med MJUK UPPSKALNING).
// Djupordning mot fiender: CPU:n skriver spritedjupet (GLR.sd) för ogenomskinliga sprite-pixlar och gallerpixlar (glGrateDepth), så en
// partikel bakom en fiende eller ett gallers spjälor syns inte, och en framför syns framför. Additiva sprites skriver inget djup.
// Partikelbudgeten: med partiklar i grafikkortet är PB.max ×16 (MAX ×16, HÖG ×8, AUTO upp till ×8).
const GLR = { cv: null, gl: null, ok: false, failed: false, reason: '', lost: 0, used: false, shown: false, S: 0, cw: 0, ch: 0, P: {}, T: {}, F: {}, vao: null, pvao: null, pbuf: null,
  atlas: null, sdBuf: new Float32Array(LK_W * LK_H), sd: null, zb: new Float32Array(LK_W), skipLK: false, forceLK: false, parts: false, partsW: 0, partsH: 0,
  io: new Float32Array(20 * 256), ia: new Float32Array(20 * 256), no: 0, na: 0, lut: new Uint8Array(1024), flags: { parts: true, gpuLK: true, cpuGrade: false, bloom: true },
  n: { frames: 0, cpu: 0, fallbacks: 0, inst: 0, instO: 0, instA: 0, culled: 0, noImg: 0, atlasImgs: 0, atlasResets: 0, lkGpu: 0, bloom: 0 } };
const GL_VS = '#version 300 es\nin vec2 aP; void main() { gl_Position = vec4(aP, 0.0, 1.0); }';
const GL_FS = { // bildpunkten i varje pass räknas från gl_FragCoord; alla mellanbuffertar har rad 0 = bildens översta rad
  world: `#version 300 es
precision highp float; uniform sampler2D uW; uniform float uS; out vec4 o;
void main() { o = vec4(texelFetch(uW, ivec2(gl_FragCoord.xy / uS), 0).rgb, 1.0); }`,
  post: `#version 300 es
precision highp float; uniform sampler2D uScene, uLut; uniform float uS, uDes; uniform int uLK, uGrade, uCb; uniform vec4 uL; uniform vec2 uBuf; uniform mat3 uM; out vec4 o;
void main() {
  vec2 q = (gl_FragCoord.xy - 0.5) / uS, b = q;
  if (uLK == 1) { vec2 qi = floor(q); float yn = (qi.y - 100.0) / 166.0, iz = 1.0 / (yn * uL.y + uL.x); // som lkBegin/lkProject: samma rad och kolumn i den vågräta bufferten
    // som CPU:n per hel skärmpunkt (bara de raderna och punkterna är ritade, glesa rader har luckor); delpunkten (S×) läggs till inom texeln
    vec2 t = vec2(clamp(floor(uL.w + 0.5 + (qi.x - 160.0) * iz), 0.0, uBuf.x - 1.0), clamp(floor(uL.z + 166.0 * (yn * uL.x - uL.y) * iz + 0.5), 0.0, uBuf.y - 1.0)); b = t + (q - qi); }
  vec3 c = texelFetch(uScene, ivec2(b * uS), 0).rgb;
  if (uGrade == 1) { ivec3 i = ivec3(c * 255.0 + 0.5); c = vec3(texelFetch(uLut, ivec2(i.r, 0), 0).r, texelFetch(uLut, ivec2(i.g, 0), 0).g, texelFetch(uLut, ivec2(i.b, 0), 0).b); }
  if (uCb == 1) { vec3 e = c - uM * c; c = vec3(c.r, clamp(c.g + 0.7 * e.r + e.g, 0.0, 1.0), clamp(c.b + 0.7 * e.r + e.b, 0.0, 1.0)); }
  if (uDes > 0.0) { float l = dot(c, vec3(0.3, 0.59, 0.11)); c += (l - c) * uDes; }
  o = vec4(c, 1.0);
}`,
  bright: `#version 300 es
precision highp float; uniform sampler2D uT; uniform vec2 uInv; uniform float uThr; out vec4 o;
void main() { vec2 uv = gl_FragCoord.xy * uInv, d = uInv * 0.25; vec3 s = vec3(0.0);
  for (int k = 0; k < 4; k++) { vec3 c = texture(uT, uv + d * vec2(k == 0 || k == 2 ? -1.0 : 1.0, k < 2 ? -1.0 : 1.0)).rgb; float m = max(c.r, max(c.g, c.b));
    // tröskeln på ljusheten (inte starkaste kanalen): en varmt upplyst vägg (~0,70) glöder inte, lågor, magi och smällar (>0,8) gör det; varmt och mättat väger mest
    float l = dot(c, vec3(0.299, 0.587, 0.114)), w = smoothstep(uThr, uThr + 0.18, l) * clamp(0.55 + (c.r - c.b) * 0.9 + (m - (c.r + c.g + c.b) / 3.0) * 0.6, 0.35, 1.0); s += c * w; }
  o = vec4(s * 0.25, 1.0); }`,
  blur: `#version 300 es
precision highp float; uniform sampler2D uT; uniform vec2 uInv, uDir; out vec4 o;
void main() { vec2 uv = gl_FragCoord.xy * uInv, d = uDir * uInv; vec3 c = texture(uT, uv).rgb * 0.227;
  c += (texture(uT, uv + d * 1.385).rgb + texture(uT, uv - d * 1.385).rgb) * 0.316; c += (texture(uT, uv + d * 3.231).rgb + texture(uT, uv - d * 3.231).rgb) * 0.070; o = vec4(c, 1.0); }`,
  down: `#version 300 es
precision highp float; uniform sampler2D uT; uniform vec2 uInv; out vec4 o;
void main() { vec2 uv = gl_FragCoord.xy * uInv, d = uInv * 0.25; o = vec4((texture(uT, uv + vec2(-d.x, -d.y)).rgb + texture(uT, uv + vec2(d.x, -d.y)).rgb + texture(uT, uv + vec2(-d.x, d.y)).rgb + texture(uT, uv + d).rgb) * 0.25, 1.0); }`,
  final: `#version 300 es
precision highp float; uniform sampler2D uP, uB1, uB2, uB3; uniform vec2 uCv; uniform float uRoll, uRs, uBloom, uVig, uAb; out vec4 o;
void main() {
  vec2 v = gl_FragCoord.xy / uCv, q = vec2(v.x * 320.0, (1.0 - v.y) * 200.0);
  if (uRoll != 0.0) { vec2 d = q - vec2(160.0, 100.0); float cs = cos(-uRoll), sn = sin(-uRoll); q = vec2(cs * d.x - sn * d.y, sn * d.x + cs * d.y) / uRs + vec2(160.0, 100.0); } // som ctx.rotate/scale i renderPost
  if (q.x < 0.0 || q.y < 0.0 || q.x >= 320.0 || q.y >= 200.0) { o = vec4(0.0, 0.0, 0.0, 1.0); return; }
  vec2 uv = q / vec2(320.0, 200.0); vec3 c;
  if (uAb > 0.0) { vec2 dd = (uv - 0.5) * uAb * 0.01; c = vec3(texture(uP, uv + dd).r, texture(uP, uv).g, texture(uP, uv - dd).b); } else c = texture(uP, uv).rgb;
  if (uBloom > 0.0) { vec3 b = min((texture(uB1, uv).rgb * 0.55 + texture(uB2, uv).rgb * 0.35 + texture(uB3, uv).rgb * 0.25) * uBloom, vec3(1.0)); c = c + b * (1.0 - c); } // "screen": glöden kan aldrig göra bilden vit
  if (uVig > 0.0) { vec2 k = (uv - 0.5) * vec2(1.0, 0.8); c *= 1.0 - uVig * smoothstep(0.08, 0.5, dot(k, k)); }
  o = vec4(min(c, vec3(1.0)), 1.0);
}`,
  part: `#version 300 es
precision highp float; uniform sampler2D uA; uniform highp sampler2D uZb, uSd; uniform float uS; in vec2 vUV; in vec3 vT, vM, vA; in float vD; flat in vec4 vR; flat in float vMode; out vec4 o;
void main() {
  ivec2 ip = ivec2(gl_FragCoord.xy / uS);
  if (vD >= min(texelFetch(uZb, ivec2(ip.x, 0), 0).r, texelFetch(uSd, ip, 0).r)) discard; // bakom väggen, en fiende eller ett gallers spjälor
  vec4 c = texture(uA, clamp(vUV, vR.xy, vR.zw));
  if (vMode < 0.5) { if (c.a < 0.392) discard; o = vec4(min(min(c.rgb * vT, vec3(1.0)) * vM + vA, vec3(1.0)), 1.0); } // som drawSprite: färgton, ljus och dimma
  else { if (c.a < 0.392) discard; o = vec4(c.rgb * (c.a * vM) * vT, 1.0); } // additiv: blandas ONE, ONE; svaga bildpunkter hoppas över som i drawSprite
}`
};
const GL_VS_PART = `#version 300 es
in vec2 aC; in vec4 iR, iUV, iT, iM, iA; uniform vec2 uB; uniform vec2 uAh; out vec2 vUV; out vec3 vT, vM, vA; out float vD; flat out vec4 vR; flat out float vMode;
void main() { vec2 p = mix(iR.xy, iR.zw, aC); vUV = mix(iUV.xy, iUV.zw, aC); vR = vec4(min(iUV.xy, iUV.zw) + uAh, max(iUV.xy, iUV.zw) - uAh);
  vT = iT.rgb; vD = iT.a; vM = iM.rgb; vMode = iM.a; vA = iA.rgb; gl_Position = vec4(p / uB * 2.0 - 1.0, clamp(vD / 128.0, 0.0, 1.0) * 2.0 - 1.0, 1.0); }`;
const GL_AT = 2048; // atlasens sida
function glMode() { const m = settings.rendering || 'auto'; return m === 'webgl' ? 'webgl' : m === 'cpu' ? 'cpu' : navigator.webdriver ? 'cpu' : 'webgl'; }
function glWant() { return glMode() === 'webgl' && !GLR.failed && !!map && state !== 'title' && state !== 'pause' && !photo && !(BF.swim > 0); } // bildrutor som läser tillbaka 2D-duken går CPU-vägen
function glPartsOn() { return GLR.flags.parts && settings.glParts !== false && GLR.ok && glWant(); }
function glFail(why) {
  if (GLR.failed) { glShow(false); return false; } // redan på CPU-vägen (förlusten märks både i glPost och i händelsen)
  GLR.failed = true; GLR.ok = false; GLR.reason = why; GLR.n.fallbacks++; glShow(false); GLR.skipLK = false;
  try { console.warn('WEBGL → CPU:', why); if (state === 'play') say('WEBGL GICK INTE – RITAR MED CPU', 2.5); } catch (e) { /* inget att visa på */ }
  return false;
}
function glShow(on) { // WebGL-duken syns och 2D-duken blir genomskinlig (eller tvärtom)
  if (GLR.shown === on) return; GLR.shown = on;
  if (GLR.cv) GLR.cv.style.display = on ? '' : 'none';
  canvas.style.background = on ? 'transparent' : ''; canvas.style.position = on ? 'relative' : ''; canvas.style.zIndex = on ? '1' : '';
}
function glInit() {
  if (GLR.ok) return true; if (GLR.failed) return false;
  try {
    if (!GLR.cv) {
      const cv = document.createElement('canvas'); cv.id = 'glscreen'; cv.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:0;background:#000;display:none';
      const gl = cv.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
      if (!gl) return glFail('INGEN WEBGL2');
      cv.addEventListener('webglcontextlost', e => { e.preventDefault(); GLR.lost++; glFail('KONTEXTEN FÖRLORADES'); });
      cv.addEventListener('webglcontextrestored', () => { GLR.failed = false; GLR.reason = ''; GLR.T = {}; GLR.F = {}; GLR.P = {}; GLR.atlas = null; GLR.S = 0; });
      GLR.cv = cv; GLR.gl = gl; canvas.parentNode.insertBefore(cv, canvas); GLR.shown = true; glShow(false);
    }
    glBuild(); GLR.ok = true; return true;
  } catch (e) { return glFail(String(e && e.message || e).slice(0, 80)); }
}
function glProg(vs, fs) {
  const gl = GLR.gl, mk = (t, s) => { const h = gl.createShader(t); gl.shaderSource(h, s); gl.compileShader(h); if (!gl.getShaderParameter(h, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error('SHADER: ' + gl.getShaderInfoLog(h)); return h; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  if (vs === GL_VS) gl.bindAttribLocation(p, 0, 'aP'); else { ['aC', 'iR', 'iUV', 'iT', 'iM', 'iA'].forEach((n, i) => gl.bindAttribLocation(p, i, n)); }
  gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error('LINK: ' + gl.getProgramInfoLog(p));
  const u = {}; p.u = n => u[n] !== undefined ? u[n] : (u[n] = gl.getUniformLocation(p, n)); return p;
}
function glTex(w, h, kind, lin) {
  const gl = GLR.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  if (kind === 'r32f') gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, w, h, 0, gl.RED, gl.FLOAT, null); else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const f = lin ? gl.LINEAR : gl.NEAREST; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return { t, w, h };
}
function glFbo(w, h, lin, depth) {
  const gl = GLR.gl, tx = glTex(w, h, 'rgba', lin), fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tx.t, 0);
  let rb = null; if (depth) { rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb); }
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE && !gl.isContextLost()) throw new Error('FBO ' + w + 'x' + h);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); return { ...tx, fb, rb };
}
function glFboFree(f) { if (!f) return; const gl = GLR.gl; gl.deleteFramebuffer(f.fb); gl.deleteTexture(f.t); if (f.rb) gl.deleteRenderbuffer(f.rb); GLR.n.freed = (GLR.n.freed || 0) + 1; } // ny skala: de gamla bufferterna släpps
function glBuild() { // program, bufferter och de texturer som inte beror på dukens storlek
  const gl = GLR.gl;
  for (const k in GL_FS) GLR.P[k] = glProg(k === 'part' ? GL_VS_PART : GL_VS, GL_FS[k]);
  GLR.vao = gl.createVertexArray(); gl.bindVertexArray(GLR.vao); const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  GLR.pvao = gl.createVertexArray(); gl.bindVertexArray(GLR.pvao); const cb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, cb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  GLR.pbuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, GLR.pbuf);
  for (let i = 0; i < 5; i++) { gl.enableVertexAttribArray(1 + i); gl.vertexAttribPointer(1 + i, 4, gl.FLOAT, false, 80, i * 16); gl.vertexAttribDivisor(1 + i, 1); }
  gl.bindVertexArray(null);
  GLR.T.world = glTex(LK_W, LK_H, 'rgba'); GLR.T.zb = glTex(LK_W, 1, 'r32f'); GLR.T.sd = glTex(LK_W, LK_H, 'r32f'); GLR.T.lut = glTex(256, 1, 'rgba');
  GLR.T.far = glTex(LK_W, LK_H, 'r32f'); { const f = new Float32Array(LK_W * LK_H).fill(1e9); gl.bindTexture(gl.TEXTURE_2D, GLR.T.far.t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, LK_W, LK_H, gl.RED, gl.FLOAT, f); } // inget spritedjup
  GLR.atlas = null; GLR.S = 0;
}
function glPlace() { // duken följer #screen (samma plats och storlek, i enhetens bildpunkter); S = scenens skala
  const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, cw = Math.max(1, Math.round(r.width * dpr)), ch = Math.max(1, Math.round(r.height * dpr)), cv = GLR.cv;
  if (cw !== GLR.cw || ch !== GLR.ch || cv._l !== r.left || cv._t !== r.top) { GLR.cw = cw; GLR.ch = ch; cv.width = cw; cv.height = ch; cv._l = r.left; cv._t = r.top;
    cv.style.left = r.left + 'px'; cv.style.top = r.top + 'px'; cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px'; }
  const S = clamp(Math.round(ch / SVH), 1, DEVICE === 'mobil' ? 2 : 4); // telefon: högst 2× (fyllnaden i scenbufferten)
  if (S !== GLR.S) { GLR.S = S; glFboFree(GLR.F.scene); glFboFree(GLR.F.post); GLR.F.scene = glFbo(LK_W * S, LK_H * S, false, true); GLR.F.post = glFbo(SW * S, SVH * S, false, false); GLR.n.rescale = (GLR.n.rescale || 0) + 1; }
  if (!GLR.F.b1) { GLR.F.b1 = glFbo(160, 100, true); GLR.F.b1b = glFbo(160, 100, true); GLR.F.b2 = glFbo(80, 50, true); GLR.F.b2b = glFbo(80, 50, true); GLR.F.b3 = glFbo(40, 25, true); GLR.F.b3b = glFbo(40, 25, true); }
}
// ---- atlasen: partiklarnas bilder ({w, h, data}) packas lat i hyllor; full atlas töms och byggs om ----
function glAtlasRect(img) {
  const gl = GLR.gl; let A = GLR.atlas;
  if (!A) { A = GLR.atlas = { tex: GLR.T.atlas || (GLR.T.atlas = glTex(GL_AT, GL_AT, 'rgba')), map: new WeakMap(), gen: (GLR.atlas && GLR.atlas.gen || 0) + 1, x: 0, y: 0, rh: 0, full: false }; }
  const hit = A.map.get(img); if (hit) return hit;
  const w = img.w, h = img.h; if (!(w > 0 && h > 0) || w > 512 || h > 512 || !img.data || img.data.length < w * h) return null;
  if (A.x + w > GL_AT) { A.x = 0; A.y += A.rh + 1; A.rh = 0; }
  if (A.y + h > GL_AT) { A.full = true; return null; } // töms i nästa bildruta
  gl.bindTexture(gl.TEXTURE_2D, A.tex.t); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, A.x, A.y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(img.data.buffer, img.data.byteOffset, w * h * 4)); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  const r = [A.x / GL_AT, A.y / GL_AT, (A.x + w) / GL_AT, (A.y + h) / GL_AT]; A.map.set(img, r); A.x += w + 1; A.rh = Math.max(A.rh, h); GLR.n.atlasImgs++;
  return r;
}
// ---- från renderWorld (före renderSprites): bestämmer om partiklarna ritas i grafikkortet i den här bildrutan ----
function glPreSprites() {
  GLR.parts = false; GLR.sd = null; GLR.no = GLR.na = 0;
  if (!particles.length || !glPartsOn()) return; // inga partiklar: inget spritedjup att skriva
  if (GLR.atlas && GLR.atlas.full) { GLR.atlas = null; GLR.n.atlasResets++; }
  GLR.parts = true; GLR.partsW = W; GLR.partsH = VH; GLR.zb.set(zbuf.subarray(0, W)); // zbuf före spritesen: bakväggen (gallren ritas senare och skriver spritedjupet)
  GLR.sd = GLR.sdBuf; GLR.sd.fill(1e9, 0, W * VH); GLR.sdAny = false;
}
const GL_NOPARTS = Object.freeze([]);
function glPartsSwap() { // från renderSprites: partiklarna blir instanser och sprite-listan ser en tom lista (inga listobjekt, ingen sortering)
  if (!GLR.parts) return null;
  const ps = particles; for (let i = 0; i < ps.length; i++) { try { glPartAdd(ps[i]); } catch (e) { spriteError(e, { o: ps[i] }); } }
  particles = GL_NOPARTS; return ps;
}
function glPartsBack(ps) { if (ps !== null) particles = ps; } // raden direkt efter: listan tillbaka
function glPartAdd(o) { // samma projektion, storlek, ljus, dimma och färgton som drawSprite (spriteSX/SY = 1)
  const img = o.img; if (!img || !img.data) { GLR.n.noImg++; return; }
  const rx = o.x - P.x, ry = o.y - P.y; if (rx * rx + ry * ry < 0.2 && o.size < 0.3) { GLR.n.culled++; return; } // småpartiklar alldeles framför kameran
  const { dirX, dirY, plX, plY, hor, camZ } = view, inv = 1 / (plX * dirY - dirX * plY);
  const tx = inv * (dirY * rx - dirX * ry), ty = inv * (-plY * rx + plX * ry); if (ty < 0.12) { GLR.n.culled++; return; }
  const scale = PSC / ty, sh = scale * o.size, sw = sh * img.w / img.h, cx = (W / 2) * (1 + tx / ty), bottom = hor + scale * (camZ - o.z), top = bottom - sh, left = cx - sw / 2;
  if (left + sw < 0 || left > W || bottom < 0 || top > VH) { GLR.n.culled++; return; }
  const r = glAtlasRect(img); if (!r) { GLR.n.atlasMiss = (GLR.n.atlasMiss || 0) + 1; return; } // för stor bild eller full atlas (töms nästa bildruta)
  const add = !!o.add, ff = Math.exp(-ty * fogK), t = o.tint, tr = t ? t[0] / 255 * 1.3 : 1, tg = t ? t[1] / 255 * 1.3 : 1, tb = t ? t[2] / 255 * 1.3 : 1;
  let mr, mg, mb, ar = 0, ag = 0, ab = 0;
  if (add) { const fl = o.fade ? 2 * Math.min(1, o.life * 2, (o.maxLife - o.life) * 2) : 2, k = ff * Math.min(1.2, fl / 2); if (!(k > 0)) { GLR.n.culled++; return; } mr = mg = mb = k; }
  else { const L = Math.max(0, lightAt(o.x, o.y)), sci = o.x >= 0 && o.y >= 0 && o.x < mw && o.y < mh ? (o.y | 0) * mw + (o.x | 0) : -1; mr = mg = mb = L * ff;
    if (sci >= 0 && lcol) { const j = sci * 3; mr = Math.max(0, mr + lcol[j] * ff); mg = Math.max(0, mg + lcol[j + 1] * ff); mb = Math.max(0, mb + lcol[j + 2] * ff); }
    ar = fogR * (1 - ff) / 255; ag = fogG * (1 - ff) / 255; ab = fogB * (1 - ff) / 255; }
  let a, n; if (add) { n = GLR.na++; if ((n + 1) * 20 > GLR.ia.length) { const b = new Float32Array(GLR.ia.length * 2); b.set(GLR.ia); GLR.ia = b; } a = GLR.ia; }
  else { n = GLR.no++; if ((n + 1) * 20 > GLR.io.length) { const b = new Float32Array(GLR.io.length * 2); b.set(GLR.io); GLR.io = b; } a = GLR.io; }
  const i = n * 20; a[i] = left; a[i + 1] = top; a[i + 2] = left + sw; a[i + 3] = bottom; a[i + 4] = r[0]; a[i + 5] = r[1]; a[i + 6] = r[2]; a[i + 7] = r[3];
  a[i + 8] = tr; a[i + 9] = tg; a[i + 10] = tb; a[i + 11] = ty; a[i + 12] = mr; a[i + 13] = mg; a[i + 14] = mb; a[i + 15] = add ? 1 : 0; a[i + 16] = ar; a[i + 17] = ag; a[i + 18] = ab; a[i + 19] = 0;
}
function glSprDepth(img, x0, x1, y0, y1, left, sw, topY, vsc, flip, ty, ghost, nd) { // från drawSprite (bara med partiklar i grafikkortet): spritens ogenomskinliga pixlar i spritedjupet, samma urval som ritslingan
  const sd = GLR.sd, d = img.data, iw = img.w, ih = img.h; GLR.sdAny = true;
  for (let x = x0; x <= x1; x++) {
    if (ty >= zbuf[x]) continue;
    let u = Math.floor((x - left) / sw * iw); if (flip) u = iw - 1 - u; if (u < 0 || u >= iw) continue;
    for (let y = y0; y <= y1; y++) { if (nd !== null && !nd[y]) continue; const v = ((y - topY) * vsc) | 0; if (v < 0 || v >= ih || d[v * iw + u] >>> 24 < 100) continue;
      if (ghost && ((x * 7 + y * 13) % 10) < ghost * 10) continue; sd[y * W + x] = ty; }
  }
}
function glGrateDepth(x, y0, y1, top, step, u, t, perp, nd) { // från v28Draw: gallrets ogenomskinliga pixlar i spritedjupet (partiklar bakom spjälorna syns inte)
  const sd = GLR.sd, dd = t.data, tw = t.w, th1 = t.h - 1; let v = (y0 - top) * step; GLR.sdAny = true;
  for (let y = y0; y <= y1; y++, v += step) { if (nd !== null && !nd[y]) continue; if (dd[Math.min(th1, v | 0) * tw + u] >>> 24 >= 128) sd[y * W + x] = perp; }
}
function glSkipLK() { if (GLR.forceLK || !GLR.flags.gpuLK || GLR.flags.cpuGrade || !GLR.ok || !glWant()) return false; GLR.skipLK = true; return true; } // från lkProject: homografin görs i grafikkortet
function glLKFix() { if (!GLR.skipLK) return; GLR.skipLK = false; GLR.forceLK = true; try { lkProject(); } finally { GLR.forceLK = false; } } // reserv i samma bildruta
// ---- från renderPost: true = bildrutan är utritad av grafikkortet ----
function glPost() {
  GLR.used = false;
  if (!glWant() || !glInit()) { if (GLR.shown) glShow(false); glLKFix(); GLR.n.cpu++; return false; }
  const gl = GLR.gl;
  if (gl.isContextLost()) { glFail('KONTEXTEN FÖRLORADES'); glLKFix(); return false; }
  try { glDraw(); } catch (e) { glFail(String(e && e.message || e).slice(0, 80)); glLKFix(); return false; }
  if (gl.isContextLost()) { glFail('KONTEXTEN FÖRLORADES'); glLKFix(); return false; }
  ctx.clearRect(0, 0, SW, H); glShow(true); GLR.used = true; GLR.n.frames++; GLR.skipLK = false;
  return true;
}
function glDraw() {
  const gl = GLR.gl, F = GLR.F, T = GLR.T, P5 = GLR.P; glPlace(); const S = GLR.S;
  const lk = LK.on && GLR.skipLK, bw = lk ? LK.TW : SW, bh = lk ? LK.TH : SVH, src = lk ? tpx : spx, cpuG = GLR.flags.cpuGrade && !lk;
  let des = P.hp < maxHp() * 0.3 && state === 'play' && settings.lowHpGray !== false ? 0.55 * (1 - P.hp / (maxHp() * 0.3)) : 0;
  if (cpuG) { applyGrade(); if (des > 0) desaturate(des); des = 0; } // för jämförelsen med CPU-vägen (t160): färgton och gråning som förut
  gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
  gl.bindTexture(gl.TEXTURE_2D, T.world.t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, bw, bh, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(src.buffer, 0, bw * bh * 4));
  // 1) världen och partiklarna i bufferns rum (S× upplösning)
  gl.bindFramebuffer(gl.FRAMEBUFFER, F.scene.fb); gl.viewport(0, 0, bw * S, bh * S); gl.bindVertexArray(GLR.vao);
  gl.useProgram(P5.world); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T.world.t); gl.uniform1i(P5.world.u('uW'), 0); gl.uniform1f(P5.world.u('uS'), S); gl.drawArrays(gl.TRIANGLES, 0, 3);
  const np = GLR.parts && GLR.partsW === bw && GLR.partsH === bh ? GLR.no + GLR.na : 0; GLR.n.inst = np; GLR.n.instO = np ? GLR.no : 0; GLR.n.instA = np ? GLR.na : 0;
  if (np) glDrawParts(bw, bh, S);
  // 2) till skärmen: upp/ned-blickens homografi, färgton, färgblindläge och gråning
  for (let i = 0; i < 256; i++) { GLR.lut[i * 4] = gradeLUT[0][i]; GLR.lut[i * 4 + 1] = gradeLUT[1][i]; GLR.lut[i * 4 + 2] = gradeLUT[2][i]; GLR.lut[i * 4 + 3] = 255; }
  gl.bindTexture(gl.TEXTURE_2D, T.lut.t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 1, gl.RGBA, gl.UNSIGNED_BYTE, GLR.lut);
  gl.bindFramebuffer(gl.FRAMEBUFFER, F.post.fb); gl.viewport(0, 0, SW * S, SVH * S); gl.bindVertexArray(GLR.vao);
  const pp = P5.post; gl.useProgram(pp); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, F.scene.t); gl.uniform1i(pp.u('uScene'), 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, T.lut.t); gl.uniform1i(pp.u('uLut'), 1);
  gl.uniform1f(pp.u('uS'), S); gl.uniform1i(pp.u('uLK'), lk ? 1 : 0); gl.uniform4f(pp.u('uL'), LK.c, LK.s, LK.hor, LK.TW / 2); gl.uniform2f(pp.u('uBuf'), bw, bh); if (lk) GLR.n.lkGpu++;
  gl.uniform1i(pp.u('uGrade'), cpuG ? 0 : 1); const cb = !cpuG && settings.cb && CB[settings.cb]; gl.uniform1i(pp.u('uCb'), cb ? 1 : 0);
  if (cb) gl.uniformMatrix3fv(pp.u('uM'), false, [cb[0], cb[3], cb[6], cb[1], cb[4], cb[7], cb[2], cb[5], cb[8]]); gl.uniform1f(pp.u('uDes'), des);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  // 3) bloom: tröskel → 160×100 → 80×50 → 40×25, suddat i varje steg
  const bk = glBloomK(); if (bk > 0) glBloom(); GLR.n.bloom = bk;
  // 4) ut på duken: lutning, bloom, vinjett och aberration
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, GLR.cw, GLR.ch);
  const fp = P5.final; gl.useProgram(fp); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, F.post.t);
  const lin = settings.smooth ? gl.LINEAR : gl.NEAREST; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, lin); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, lin);
  gl.uniform1i(fp.u('uP'), 0); [F.b1, F.b2, F.b3].forEach((f, i) => { gl.activeTexture(gl.TEXTURE1 + i); gl.bindTexture(gl.TEXTURE_2D, f.t); gl.uniform1i(fp.u('uB' + (i + 1)), 1 + i); });
  const roll = Math.abs(P.roll) > 0.002 && (state === 'play' || state === 'dead') ? P.roll : 0, ar = Math.abs(roll), rs = roll ? Math.max(1.05, Math.min(1.35, Math.cos(ar) + (SW / SVH) * Math.sin(ar))) : 1;
  const fxOn = settings.bloom !== false && !settings.lowfx && GLR.flags.bloom;
  gl.uniform2f(fp.u('uCv'), GLR.cw, GLR.ch); gl.uniform1f(fp.u('uRoll'), roll); gl.uniform1f(fp.u('uRs'), rs); gl.uniform1f(fp.u('uBloom'), bk);
  gl.uniform1f(fp.u('uVig'), fxOn && GLR.flags.vig !== false ? 0.22 : 0); gl.uniform1f(fp.u('uAb'), fxOn && !settings.noFlash && !settings.reduceMotion && state === 'play' ? Math.min(1, (P.hurt || 0) * 2.5) : 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null);
}
function glBloomK() { return settings.bloom !== false && !settings.lowfx && GLR.flags.bloom ? (settings.noFlash ? 0.45 : 0.9) : 0; } // BLOOM: på som standard; noFlash dämpar, lowfx stänger av
function glBloom() {
  const gl = GLR.gl, F = GLR.F, P5 = GLR.P;
  const pass = (prog, src, dst, set) => { gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb); gl.viewport(0, 0, dst.w, dst.h); gl.useProgram(prog); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.t);
    gl.uniform1i(prog.u('uT'), 0); gl.uniform2f(prog.u('uInv'), 1 / dst.w, 1 / dst.h); if (set) set(prog); gl.drawArrays(gl.TRIANGLES, 0, 3); };
  const blur = (a, b) => { pass(P5.blur, a, b, p => gl.uniform2f(p.u('uDir'), 1, 0)); pass(P5.blur, b, a, p => gl.uniform2f(p.u('uDir'), 0, 1)); };
  gl.bindTexture(gl.TEXTURE_2D, F.post.t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  pass(P5.bright, F.post, F.b1, p => gl.uniform1f(p.u('uThr'), 0.74)); blur(F.b1, F.b1b); // tröskeln: bara ljuset över den (ljusa och varmt upplysta rum tvättas inte ut, t161/t164)
  pass(P5.down, F.b1, F.b2); blur(F.b2, F.b2b); pass(P5.down, F.b2, F.b3); blur(F.b3, F.b3b);
}
function glDrawParts(bw, bh, S) {
  const gl = GLR.gl, T = GLR.T, pp = GLR.P.part;
  gl.bindTexture(gl.TEXTURE_2D, T.zb.t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, bw, 1, gl.RED, gl.FLOAT, GLR.zb.subarray(0, bw));
  const sdt = GLR.sdAny !== false ? T.sd : T.far; // inget ogenomskinligt sprite-djup i bildrutan: ingen uppladdning
  if (sdt === T.sd) { gl.bindTexture(gl.TEXTURE_2D, T.sd.t); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, bw, bh, gl.RED, gl.FLOAT, GLR.sd.subarray(0, bw * bh)); }
  gl.useProgram(pp); gl.bindVertexArray(GLR.pvao);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, GLR.atlas.tex.t); gl.uniform1i(pp.u('uA'), 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, T.zb.t); gl.uniform1i(pp.u('uZb'), 1);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, sdt.t); gl.uniform1i(pp.u('uSd'), 2);
  gl.uniform1f(pp.u('uS'), S); gl.uniform2f(pp.u('uB'), bw, bh); gl.uniform2f(pp.u('uAh'), 0.5 / GL_AT, 0.5 / GL_AT);
  gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST);
  gl.bindBuffer(gl.ARRAY_BUFFER, GLR.pbuf);
  if (GLR.no) { gl.depthFunc(gl.LESS); gl.depthMask(true); gl.bufferData(gl.ARRAY_BUFFER, GLR.io.subarray(0, GLR.no * 20), gl.STREAM_DRAW); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, GLR.no); }
  if (GLR.na) { gl.depthFunc(gl.LEQUAL); gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.bufferData(gl.ARRAY_BUFFER, GLR.ia.subarray(0, GLR.na * 20), gl.STREAM_DRAW); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, GLR.na); }
  gl.depthMask(true); gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
}
function glFrame() { if (GLR.shown && (state === 'title' || !map)) glShow(false); } // från frameStep: startskärmen ritar själv på 2D-duken
function glPbTick(m) { // från pbTick: med partiklar i grafikkortet är taket ×16 (MAX ×16, HÖG ×8, AUTO upp till ×8)
  const on = glMode() === 'webgl' && GLR.ok && !GLR.failed && GLR.flags.parts && settings.glParts !== false && (glWant() || state === 'pause'); // simning och fotoläge (CPU-vägen): taket ×8 som förut
  if (!on) { if (PB.max !== 8) { PB.max = 8; PB.autoMax = 4; if (PB.k > 8) pbApply(8); } return false; }
  if (PB.max !== 16) { PB.max = 16; PB.autoMax = 8; }
  if (m === 'max' || m === 'high') { const k = m === 'max' ? 16 : 8; if (k !== PB.k) pbApply(k); return true; }
  return false;
}
function glSettings(select, check) { // från openSettings (BILD)
  if (settings.rendering === undefined) settings.rendering = 'auto'; if (settings.bloom === undefined) settings.bloom = true;
  select('RENDERING', 'rendering', [['auto', 'AUTO'], ['cpu', 'CPU'], ['webgl', 'WEBGL']], glApply);
  check('BLOOM', 'bloom');
}
function glApply() { GLR.failed = false; GLR.reason = ''; if (glMode() !== 'webgl') glShow(false); } // ett nytt val försöker igen efter ett fel
function glShot() { // från screenshot: WebGL-bilden och 2D-duken ihop
  if (!GLR.used || !GLR.ok) return false;
  try { glDraw(); const c = document.createElement('canvas'); c.width = GLR.cw; c.height = GLR.ch; const g = c.getContext('2d'); g.drawImage(GLR.cv, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(canvas, 0, 0, c.width, c.height);
    c.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `krypta-${Date.now()}.png`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }, 'image/png');
    say('SKÄRMBILD SPARAD', 1.2); play('click', 0.5, 1.8); return true; } catch (e) { return false; }
}
function glApi() { // window.__game.gl: för t160–t164
  const read = (fb, w, h) => { const gl = GLR.gl, o = new Uint8Array(w * h * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, o); gl.bindFramebuffer(gl.FRAMEBUFFER, null); return o; };
  return { GLR, mode: glMode, want: glWant, partsOn: glPartsOn, init: glInit, n: () => ({ ...GLR.n, failed: GLR.failed, reason: GLR.reason, ok: GLR.ok, used: GLR.used, shown: GLR.shown, S: GLR.S, cw: GLR.cw, ch: GLR.ch, lost: GLR.lost }),
    info: () => { const gl = GLR.gl; if (!gl) return null; const e = gl.getExtension('WEBGL_debug_renderer_info'); return { ver: gl.getParameter(gl.VERSION), gpu: e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?' }; },
    post: () => { const S = GLR.S, a = read(GLR.F.post.fb, SW * S, SVH * S), o = new Uint8Array(SW * SVH * 4); for (let y = 0; y < SVH; y++) for (let x = 0; x < SW; x++) { const i = ((y * S) * SW * S + x * S) * 4, j = (y * SW + x) * 4; o[j] = a[i]; o[j + 1] = a[i + 1]; o[j + 2] = a[i + 2]; o[j + 3] = a[i + 3]; } return Array.from(o); }, // rad 0 = översta raden
    snap: (w = 80, h = 50) => { render(); if (!GLR.used) return null; const gl = GLR.gl, cw = GLR.cw, ch = GLR.ch, a = new Uint8Array(cw * ch * 4); gl.readPixels(0, 0, cw, ch, gl.RGBA, gl.UNSIGNED_BYTE, a); // dukens bild nedskalad (medel), rad 0 = överst
      const o = new Float32Array(w * h * 3), n = new Float32Array(w * h); for (let y = 0; y < ch; y++) { const ty = Math.min(h - 1, ((ch - 1 - y) * h / ch) | 0); for (let x = 0; x < cw; x++) { const tx = Math.min(w - 1, (x * w / cw) | 0), i = (y * cw + x) * 4, j = ty * w + tx; o[j * 3] += a[i]; o[j * 3 + 1] += a[i + 1]; o[j * 3 + 2] += a[i + 2]; n[j]++; } }
      for (let j = 0; j < w * h; j++) for (let k = 0; k < 3; k++) o[j * 3 + k] /= Math.max(1, n[j]); return Array.from(o); },
    lose: () => { const e = GLR.loseExt = GLR.gl && GLR.gl.getExtension('WEBGL_lose_context'); if (e) e.loseContext(); return !!e; }, restore: () => { const e = GLR.loseExt; if (e) e.restoreContext(); return !!e; }, // tillägget hämtas före förlusten
    sd: () => GLR.sd, bench: (n = 60) => { const ts = []; for (let i = 0; i < n; i++) { const t0 = performance.now(); render(); ts.push(performance.now() - t0); } ts.sort((a, b) => a - b); return { med: ts[n >> 1], p90: ts[(n * 0.9) | 0], mean: ts.reduce((a, b) => a + b, 0) / n, used: GLR.used, inst: GLR.n.inst, parts: particles.length }; },
    pb: () => ({ max: PB.max, autoMax: PB.autoMax, k: PB.k }),
    probe: (rgb, spot) => { // t161: en jämn färg (och en liten ljus fläck) som världsbild, ut på duken; bildpunkter (r,g,b) i mitten och bredvid fläcken
      if (!glInit()) return null; const n = SW * SVH, save = spx.slice(0, n), col = 0xff000000 | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0]; spx.fill(col, 0, n);
      if (spot) for (let y = 96; y < 104; y++) for (let x = 156; x < 164; x++) spx[y * SW + x] = 0xff000000 | (spot[2] << 16) | (spot[1] << 8) | spot[0];
      const lk = LK.on, parts = GLR.parts; LK.on = false; GLR.parts = false; let out = null;
      try { glDraw(); const gl = GLR.gl, rd = (fx, fy) => { const o = new Uint8Array(4); gl.readPixels(Math.round(fx * GLR.cw), Math.round((1 - fy) * GLR.ch), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, o); return [o[0], o[1], o[2]]; };
        out = { mid: rd(0.5, 0.5 * SVH / H), near: rd(0.5 + 10 / SW, 0.5 * SVH / H), edge: rd(0.2, 0.3 * SVH / H) }; }
      finally { spx.set(save); LK.on = lk; GLR.parts = parts; } return out; } };
}
