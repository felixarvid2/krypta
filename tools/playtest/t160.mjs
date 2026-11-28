// t160: version 28 (WEBGL) – utskriften. Under webdriver är AUTO = CPU och bilden är exakt densamma som före version 28 (hash mot
// den gamla js/game.js, GAME_JS=..., två laddningar var). Med RENDERING WEBGL startar WebGL (SwiftShader i headless), och med färgton
// och gråning på CPU:n (flags.cpuGrade) är grafikkortets bild exakt CPU-vägens bild. Med färgtonen i shadern: högst några steg ifrån.
// Upp/ned-blicken med homografin i grafikkortet: nästan samma bild som lkProject. Gråning vid låg hälsa och färgblindläge likaså.
// Port 9860. Gammal fil: T160_OLD, annars js/game.js vid e7ecff3 (git show → out/game_e7ecff3.js).
import { setup } from './head.mjs';
import fs from 'fs';
import { execFileSync } from 'child_process'; import path from 'path';
const baseOld = () => { const p = process.env.T160_OLD || path.resolve('out/game_e7ecff3.js'); if (fs.existsSync(p)) return p; // före version 28: js/game.js vid e7ecff3 (hämtas med git show)
  try { const root = process.env.KRYPTA_ROOT || path.resolve('../..'); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, execFileSync('git', ['show', 'e7ecff3:js/game.js'], { cwd: root, maxBuffer: 1 << 27 })); return p; }
  catch (e) { console.log('SKIP  den gamla js/game.js (e7ecff3) gick inte att hämta: ' + String(e.message).slice(0, 80)); return null; } };
const PORT = 9860, OLD = baseOld();
const { pg, ev, wait, ok, shot, done } = await setup(PORT, 'out/t160');
const sceneFn = o => { const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: false, noFlash: false, reduceMotion: false, rendering: o.mode || 'auto', bloom: o.bloom !== false });
  const W = 20, H = 13, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[6][4] = 'P'; grid[3][12] = '2'; grid[9][12] = '3';
  g.playCustom({ grid, biome: o.biome || 'dungeon' }); g.P.hp = 1e6; window.__pin = [4.5, 6.5];
  clearInterval(window.__hold); window.__hold = setInterval(() => { const P = __game.P; P.hp = Math.max(P.hp, 1e5); if (window.__pin) { P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = 0.15; P.vx = P.vy = 0; } }, 30); };
const load = async () => { await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 }); };
const gt = () => ev(() => window.__game.v27b ? __game.v27b.t() : performance.now() / 1000);
const until = async (cond, sec) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 90000) return !cond; await wait(80); } };
const ready = async o => { await ev(sceneFn, o || {}); await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await until(null, 0.4); };
// CPU-bilden (pausad: inget rör sig) som hash
const cpuHash = () => ev(() => { const g = __game; g.pause(); const P = g.P; P.x = 4.5; P.y = 6.5; P.a = 0.15; P.look = 0; P.pitch = 0; P.roll = 0; g.particles().length = 0;
  const c = document.getElementById('screen'), cx = c.getContext('2d'), out = []; for (let k = 0; k < 2; k++) { g.v28.render(); const d = cx.getImageData(0, 0, c.width, c.height).data; let h = 2166136261; for (let i = 0; i < d.length; i++) h = Math.imul(h ^ d[i], 16777619); out.push(h >>> 0); }
  g.resume(); return { h: out[0], same: out[0] === out[1], gl: !!document.getElementById('glscreen') }; });
// gammal fil: två laddningar
const old = [], neu = [];
if (OLD) { process.env.GAME_JS = OLD; for (let k = 0; k < 2; k++) { await load(); await ready(); old.push(await cpuHash()); } delete process.env.GAME_JS; }
for (let k = 0; k < 2; k++) { await load(); await ready(); neu.push(await cpuHash()); }
if (OLD) { ok(old[0].h === old[1].h && old[0].same, 'den gamla filen ger samma bild vid två laddningar (jämförelsen betyder något) ' + JSON.stringify(old));
  ok(neu[0].h === old[0].h && neu[1].h === old[0].h && !neu[0].gl, 'AUTO under webdriver = CPU: exakt samma bild som före version 28, ingen WebGL-duk ' + JSON.stringify(neu)); }
else ok(neu[0].h === neu[1].h && !neu[0].gl, 'AUTO under webdriver = CPU, samma bild vid två laddningar, ingen WebGL-duk (utan jämförelse mot den gamla filen) ' + JSON.stringify(neu));
ok(await ev(() => __game.gl.mode()) === 'cpu', 'AUTO under webdriver ger CPU');
// WEBGL
await ready({ mode: 'webgl', bloom: false }); await until(() => __game.gl.n().used, 3);
const st = await ev(() => ({ n: __game.gl.n(), info: __game.gl.info(), mode: __game.gl.mode(), el: !!document.getElementById('glscreen'), bg: getComputedStyle(document.getElementById('screen')).backgroundColor }));
ok(st.n.ok && st.n.used && st.n.frames > 5 && st.el && st.mode === 'webgl', 'WebGL startar och ritar (SwiftShader) ' + JSON.stringify(st));
await shot('webgl');
// jämförelse i samma bildruta: CPU-vägen mot grafikkortet (lutning 0, bloom av)
const cmp = o => ev(o => { const g = __game, GL = g.gl, P = g.P; P.roll = 0; P.look = o.look || 0; P.pitch = 0; window.__pin = null; g.particles().length = 0; if (o.hp) P.hp = o.hp; g.settings.cb = o.cb || '';
  GL.GLR.flags.cpuGrade = !!o.cpuGrade; const c = document.getElementById('screen'), cx = c.getContext('2d');
  g.settings.rendering = 'cpu'; g.v28.render(); const A = cx.getImageData(0, 0, 320, 200).data;
  g.settings.rendering = 'webgl'; g.v28.render(); const used = GL.n().used, B = GL.post(), lk = GL.n().lkGpu; GL.GLR.flags.cpuGrade = false; g.settings.cb = ''; window.__pin = [4.5, 6.5]; if (o.hp) P.hp = 1e6;
  let eq = 0, max = 0, sum = 0, big = 0; for (let i = 0; i < A.length; i += 4) { let d = 0; for (let k = 0; k < 3; k++) { const e = Math.abs(A[i + k] - B[i + k]); d = Math.max(d, e); sum += e; } if (d === 0) eq++; if (d > 6) big++; max = Math.max(max, d); }
  return { used, eq, n: A.length / 4, max, mean: +(sum / (A.length * 0.75)).toFixed(3), big, lk }; }, o);
const ex = await cmp({ cpuGrade: true });
ok(ex.used && ex.eq === ex.n, 'färgton på CPU:n: grafikkortets bild är exakt CPU-bilden ' + JSON.stringify(ex));
const gg = await cmp({});
ok(gg.used && gg.max <= 3 && gg.mean < 0.6, 'färgtonen i shadern: högst några steg från CPU-bilden ' + JSON.stringify(gg));
const lo = await cmp({ hp: 10 });
ok(lo.used && lo.mean < 1 && lo.big < lo.n * 0.01, 'gråning vid låg hälsa i shadern ≈ CPU ' + JSON.stringify(lo));
const cbr = await cmp({ cb: 'deutan' });
ok(cbr.used && cbr.mean < 1 && cbr.big < cbr.n * 0.01, 'färgblindläge i shadern ≈ CPU ' + JSON.stringify(cbr));
const lk = await cmp({ look: 0.35 }), lk2 = await cmp({ look: -0.4 });
ok(lk.used && lk.lk > 0 && lk.big < lk.n * 0.03 && lk2.big < lk2.n * 0.03, 'upp/ned-blicken med homografin i grafikkortet ≈ lkProject ' + JSON.stringify({ upp: lk, ned: lk2 }));
// hela duken (alla S×S delpunkter, medel 80×50) mot CPU-bilden under blicken: luckor i glesa rader får inte synas
const full = look => ev(look => { const g = __game, GL = g.gl, P = g.P; window.__pin = null; P.roll = 0; P.look = look; g.particles().length = 0; g.settings.bloom = false;
  g.settings.rendering = 'cpu'; g.v28.render(); const d = document.getElementById('screen').getContext('2d').getImageData(0, 0, 320, 200).data, A = new Float32Array(4000 * 3);
  for (let y = 0; y < 200; y++) for (let x = 0; x < 320; x++) { const i = (y * 320 + x) * 4, j = ((y >> 2) * 80 + (x >> 2)) * 3; for (let k = 0; k < 3; k++) A[j + k] += d[i + k] / 16; }
  g.settings.rendering = 'webgl'; const B = GL.snap(80, 50); window.__pin = [4.5, 6.5]; let s = 0, mx = 0; for (let j = 0; j < A.length; j++) { const e = Math.abs(A[j] - B[j]); s += e; mx = Math.max(mx, e); } return { mean: +(s / A.length).toFixed(2), max: +mx.toFixed(1) }; }, look);
const f1 = await full(0.35), f2 = await full(-0.45), f3 = await full(0.6);
ok([f1, f2, f3].every(f => f.mean < 1.5 && f.max < 40), 'upp/ned-blicken på hela duken (alla delpunkter) ≈ CPU-bilden ' + JSON.stringify({ f1, f2, f3 }));
await ev(() => { __game.P.look = 0.35; }); await until(null, 0.3); await shot('webgl_upp'); await ev(() => { __game.P.look = 0; });
// pausen: utan v29:s lägen (flags.modes av) CPU-vägen som i v28 (2D-duken läses tillbaka); med dem grafikkortet (version 29, t177)
const pz = await ev(() => { const g = __game, F = g.gl.GLR.flags; g.pause(); F.modes = false; g.v28.render(); const a = g.gl.n(); F.modes = true; g.v28.render(); const b = g.gl.n(); g.resume(); return { used: a.used, shown: a.shown, v29: b.used }; });
ok(!pz.used && !pz.shown && pz.v29, 'pausen: CPU utan v29-lägena (oskärpan läser 2D-duken), grafikkortet med dem ' + JSON.stringify(pz));
await done();
