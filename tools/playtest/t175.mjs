// t175: version 29 (LJUS) – dynamiskt ljus i grafikkortet. Samma geometri och samma ljus för båda väggarna (probe: en jämn färg som
// vägg två rutor fram, ett varmt ljus framför): med LJUS och BLOOM på mot båda av blir en ljus, varm vägg [217,178,115] högst +14 per
// kanal ljusare (bloom-felet i v28), en mörk vägg blir tydligt ljusare. I en riktig scen (eld framför spelaren): ljuslistan fylls,
// bilden ljusnar kring elden men medelljuset högst ~12 %. Eldkastarens lågor räknas inte som ljus medan den sprutar (0210 lyser redan).
// lowfx och LJUS AV stänger av passet. Ett trasigt ljusprogram stänger av bara ljuset, inte WebGL. Väntan i speltid. Port 9875.
import { setup } from './head.mjs';
const PORT = 9875;
const { pg, ev, wait, ok, shot, done, errs } = await setup(PORT, 'out/t175');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) cerr.push(m.text().slice(0, 160)); });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const sceneFn = o => { const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: false, noFlash: false, reduceMotion: false, rendering: 'webgl', bloom: true, glLight: 'on' });
  const W = 20, H = 13, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[6][4] = 'P'; grid[3][12] = '2'; grid[9][12] = '3';
  g.playCustom({ grid, biome: o.biome || 'dungeon' }); g.P.hp = 1e6; window.__pin = [4.5, 6.5];
  clearInterval(window.__hold); window.__hold = setInterval(() => { const P = __game.P; P.hp = Math.max(P.hp, 1e5); if (window.__pin) { P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = 0; P.vx = P.vy = 0; } }, 30); };
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 90000) return !cond; await wait(80); } };
await ev(sceneFn, {}); await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await until(() => __game.gl.n().used, 2);
const st = await ev(() => __game.l29.n());
ok(st.ok.light && st.ok.fin && st.err === '' && st.lightOn, 'ljusprogrammen byggs (SwiftShader) och LJUS är på ' + JSON.stringify(st));
// 1) probe: samma geometri och ljus för en ljus och en mörk vägg; båda av (bloom av, ljus av) mot båda på (bloom på, ljus på)
const pr = await ev(() => { const g = __game, L = g.l29, out = {};
  for (const [k, rgb] of [['ljus', [217, 178, 115]], ['mork', [60, 45, 32]]]) { g.settings.bloom = false; const a = L.probe(rgb); g.settings.bloom = true; const b = L.probe(rgb); out[k] = { av: a.off.mid, pa: b.on.mid, baraBloom: b.off.mid, baraLjus: a.on.mid }; }
  return out; });
const dB = pr.ljus.pa.map((v, i) => v - pr.ljus.av[i]), dD = pr.mork.pa.map((v, i) => v - pr.mork.av[i]), dDl = pr.mork.baraLjus.map((v, i) => v - pr.mork.av[i]);
ok(pr.ljus.av[0] > 150 && Math.max(...dB) <= 14, 'ljus varm vägg: ljus + bloom lägger till högst +14 per kanal ' + JSON.stringify({ d: dB, ...pr.ljus }));
ok(dDl[0] >= 30 && dDl[1] >= 15 && dDl[0] > dDl[2], 'mörk vägg nära ljuset: tydligt ljusare, i ljusets varma färg ' + JSON.stringify({ d: dDl, dBada: dD, ...pr.mork }));
// ljuset dämpas med avståndet: samma ljus 2 rutor bakom väggen (fel sida) lyser inte upp den
const back = await ev(() => { const g = __game, P = g.P, a = g.view ? 0 : 0; const r = g.l29.probe([60, 45, 32], { lights: [[P.x + Math.cos(P.a) * 3.2, P.y + Math.sin(P.a) * 3.2, 0.5, 3, 1, 0.62, 0.28, 1.3]] }); return r; });
ok(Math.max(...back.on.mid.map((v, i) => v - back.off.mid[i])) <= 3, 'ljus bakom väggen (fel sida) lyser inte igenom ' + JSON.stringify(back));
// 2) en riktig scen: eld framför spelaren
const fire = () => ev(() => { const g = __game, fx = g.v27b.fx(), L = g.particles(); L.length = 0;
  for (let i = 0; i < 40; i++) L.push({ x: 7.5 + (i % 5) * 0.12, y: 6.3 + ((i / 5) | 0) * 0.06, z: 0.2 + (i % 3) * 0.1, vx: 0, vy: 0, vz: 0, life: 1e4, maxLife: 1e4, img: fx.fire[i % 16], size: 0.5, add: true, tint: [255, 160, 60] }); return L.length; });
await fire(); await until(null, 0.3);
const lum = B => { let s = 0; for (const v of B) s += v; return s / B.length; };
const sc = await ev(() => { const g = __game; window.__pin = null; const P = g.P; P.x = 4.5; P.y = 6.5; P.a = 0; g.settings.glLight = 'off'; const A = g.gl.snap(80, 50); g.settings.glLight = 'on'; const B = g.gl.snap(80, 50);
  const n = g.l29.n(); window.__pin = [4.5, 6.5]; let up = 0, mx = 0; for (let j = 0; j < A.length; j += 3) { const d = (B[j] + B[j + 1] + B[j + 2] - A[j] - A[j + 1] - A[j + 2]) / 3; if (d > 6) up++; mx = Math.max(mx, d); }
  return { A: Array.from(A), B: Array.from(B), up, mx: +mx.toFixed(1), n }; });
const ka = lum(sc.A), kb = lum(sc.B);
ok(sc.n.lights > 0 && sc.n.frames > 0, 'eld framför spelaren: ljuslistan fylls och ljuspasset körs ' + JSON.stringify({ lights: sc.n.lights, frames: sc.n.frames, gatherMs: +sc.n.gatherMs.toFixed(3) }));
ok(sc.up > 40 && sc.mx > 12, 'golv och väggar runt elden ljusnar ' + JSON.stringify({ up: sc.up, mx: sc.mx }));
ok(kb / ka <= 1.12, 'medelljuset med ljus högst +12 % ' + JSON.stringify({ utan: +ka.toFixed(1), med: +kb.toFixed(1), k: +(kb / ka).toFixed(3) }));
// upp/ned-blicken (homografin i grafikkortet): ljuset görs i den större bufferten och följer med
const lk = await ev(() => { const g = __game; window.__pin = null; const P = g.P; P.look = 0.35; g.settings.glLight = 'off'; const A = g.gl.snap(80, 50); g.settings.glLight = 'on'; const f0 = g.l29.n().frames; const B = g.gl.snap(80, 50);
  const lkGpu = g.gl.n().lkGpu, fr = g.l29.n().frames - f0; P.look = 0; window.__pin = [4.5, 6.5]; let up = 0; for (let j = 0; j < A.length; j += 3) if ((B[j] + B[j + 1] + B[j + 2] - A[j] - A[j + 1] - A[j + 2]) / 3 > 6) up++; return { up, fr, lkGpu }; });
ok(lk.up > 40 && lk.fr >= 1 && lk.lkGpu > 0, 'upp/ned-blicken: ljuset följer med i bufferns rum ' + JSON.stringify(lk));
await ev(() => { __game.settings.glLight = 'off'; }); await until(null, 0.3); await shot('eld_ljus_av');
await ev(() => { __game.settings.glLight = 'on'; }); await until(null, 0.3); await shot('eld_ljus_pa');
// 3) eldkastaren: dess egna lågor (partiklar) räknas inte som ljus medan den sprutar
const fl = await ev(() => { const g = __game, fx = g.v27b.fx(), L = g.particles(), P = g.P, fr = (fx.parts && fx.parts.flame) || fx.fire; L.length = 0;
  for (let i = 0; i < 20; i++) L.push({ x: P.x + 1 + i * 0.15, y: P.y, z: 0.4, vx: 0, vy: 0, vz: 0, life: 0.5, maxLife: 0.6, frames: fr, img: fr[0], size: 0.35, add: true, tint: [255, 150, 50] });
  P.flash = 0; P.flameAt = undefined; const off = g.l29.gather(); P.flameAt = g.v27b.t(); P.flameEx = P.x + 4; P.flameEy = P.y; const on = g.l29.gather(); P.flameAt = undefined; L.length = 0; return { utanStrale: off, medStrale: on }; });
// brinnande mark: dess lågor (additiva partiklar) räknas inte heller som ljus (0210 lyser upp marken)
const gf = await ev(() => { const g = __game, fx = g.v27b.fx(), L = g.particles(), P = g.P, G = g.flame.groundFires(); L.length = 0; P.flameAt = undefined; P.flash = 0;
  const x = P.x + 2, y = P.y; for (let i = 0; i < 10; i++) L.push({ x: x + (i % 3 - 1) * 0.2, y: y + ((i / 3) | 0) * 0.15 - 0.2, z: 0.1, vx: 0, vy: 0, vz: 0, life: 0.4, maxLife: 0.5, frames: fx.fire, img: fx.fire[0], size: 0.3, add: true, drift: true });
  const utan = g.l29.gather(); G.push({ x, y, t: 3, acc: 0 }); const med = g.l29.gather(); G.length = 0; L.length = 0; return { utanMark: utan, medMark: med }; });
ok(gf.utanMark > 0 && gf.medMark === 0, 'brinnande mark: dess lågor lyser inte dubbelt ' + JSON.stringify(gf));
ok(fl.utanStrale > 0 && fl.medStrale === 0, 'eldkastarens lågor lyser inte dubbelt (0210 lyser redan på CPU:n) ' + JSON.stringify(fl));
// 4) lowfx och LJUS AV: inget ljuspass; WebGL ritar ändå
await fire();
const lf = await ev(() => { const g = __game; g.settings.lowfx = true; const f0 = g.l29.n().frames; g.v28.render(); g.v28.render(); const a = { frames: g.l29.n().frames - f0, n: g.l29.n().n, used: g.gl.n().used, lightOn: g.l29.n().lightOn };
  g.settings.lowfx = false; g.settings.glLight = 'off'; const f1 = g.l29.n().frames; g.v28.render(); const b = { frames: g.l29.n().frames - f1, used: g.gl.n().used }; g.settings.glLight = 'on'; const f2 = g.l29.n().frames; g.v28.render(); return { lowfx: a, av: b, pa: g.l29.n().frames - f2 }; });
ok(lf.lowfx.frames === 0 && !lf.lowfx.lightOn && lf.lowfx.used && lf.av.frames === 0 && lf.av.used && lf.pa === 1, 'lowfx och LJUS AV stänger av ljuspasset, WebGL ritar ändå ' + JSON.stringify(lf));
// 4b) förlorad kontext med LJUS, VATTEN och LUFT på (en telefon som lägger fliken i bakgrunden): CPU-vägen, sedan ritar passet igen
const cl0 = await ev(() => { const g = __game; Object.assign(g.settings, { glWater: 'on', glAir: 'on' }); return g.gl.lose(); }); await until(null, 0.5);
const cl1 = await ev(() => ({ failed: __game.gl.n().failed, used: __game.gl.n().used }));
await ev(() => __game.gl.restore()); await until(() => __game.gl.n().used, 3); await until(null, 0.3);
const cl2 = await ev(() => { const g = __game, f0 = g.l29.n().passes; g.v28.render(); return { used: g.gl.n().used, pass: g.l29.n().passes - f0, ok: g.l29.n().ok, lights: g.l29.n().lights }; });
ok(cl0 && cl1.failed && !cl1.used && cl2.used && cl2.pass === 1 && cl2.ok.light && cl2.ok.fin, 'förlorad kontext med v29 på: CPU-vägen, sedan ljuspasset igen ' + JSON.stringify({ cl1, cl2 }));
await ev(() => { Object.assign(__game.settings, { glWater: 'off', glAir: 'off' }); });
// 5) ett ljusprogram som inte går att bygga stänger av bara ljuset
const br = await ev(() => { const g = __game, r = g.l29.breakShader('light'); g.v28.render(); return { r, n: g.gl.n(), l: g.l29.n() }; });
await until(null, 0.3); const br2 = await ev(() => ({ used: __game.gl.n().used, failed: __game.gl.n().failed, light: __game.l29.n().ok.light }));
ok(!br.r.light && br.r.fin && br.r.glOk && br2.used && !br2.failed && !br2.light, 'trasigt ljusprogram: bara ljuset av, WebGL ritar vidare ' + JSON.stringify({ r: br.r, efter: br2 }));
const fix = await ev(() => { const g = __game; g.gl.GLR.ok = false; g.gl.GLR.P = {}; g.gl.init(); g.v28.render(); return g.l29.n().ok; });
ok(fix.light && fix.fin, 'programmen byggs igen ' + JSON.stringify(fix));
ok(cerr.length === 0 && errs.length === 0, 'inga fel i bildrutorna ' + JSON.stringify(cerr.slice(0, 4)));
await done();
