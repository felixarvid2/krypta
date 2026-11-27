// t184: version 29 (VÄRLD) – LJUS (0136) med grafikkortets värld. Ljuspasset läser då världen i S× och djupet per R×-kolumn (inte zbuf
// per 1×-kolumn): eld framför spelaren lyser upp golv och väggar lika mycket som med CPU-världen (samma ljusökning per bildpunkt i
// 80×50, nästan samma medelljus), också med blicken uppåt; VATTEN speglar med grafikkortets värld. Väntan i speltid. Port 9884.
import { setup } from './head.mjs';
const PORT = 9884;
const { pg, ev, wait, ok, shot, done, errs } = await setup(PORT, 'out/t184');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon|404/.test(m.text())) cerr.push(m.text().slice(0, 160)); });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 90000) return !cond; await wait(80); } };
const sceneFn = () => { const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: false, noFlash: false, reduceMotion: true, rendering: 'webgl', bloom: false, glLight: 'on', glWater: 'off', glAir: 'off', glWorld: 'cpu', glRes: 2, mouseLook: true });
  const W = 20, H = 13, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[6][4] = 'P'; for (const [x, y] of [[8, 9], [9, 9], [10, 9], [8, 10], [9, 10], [10, 10]]) grid[y][x] = '-';
  g.playCustom({ grid, biome: 'dungeon' }); g.P.hp = 1e6; window.__pin = [4.5, 6.5];
  clearInterval(window.__hold); window.__hold = setInterval(() => { const P = __game.P; P.hp = 1e6; if (window.__pin) { P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = 0; P.vx = P.vy = 0; } }, 30); };
await ev(sceneFn); await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await until(() => __game.gl.n().used, 3);
await ev(() => { const g = __game, fx = g.v27b.fx(), L = g.particles(); L.length = 0;
  for (let i = 0; i < 40; i++) L.push({ x: 7.5 + (i % 5) * 0.12, y: 6.3 + ((i / 5) | 0) * 0.06, z: 0.2 + (i % 3) * 0.1, vx: 0, vy: 0, vz: 0, life: 1e4, maxLife: 1e4, img: fx.fire[i % 16], size: 0.5, add: true, tint: [255, 160, 60] }); });
await until(null, 0.3);
const light = look => ev(look => { const g = __game, s = g.settings, P = g.P; window.__pin = null; P.x = 4.5; P.y = 6.5; P.a = 0; P.look = look; const out = {};
  for (const w of ['cpu', 'gpu']) { s.glWorld = w; s.glLight = 'off'; const A = g.gl.snap(80, 50), on0 = g.w29.n().frameOn; s.glLight = 'on'; const f0 = g.l29.n().frames, B = g.gl.snap(80, 50), fr = g.l29.n().frames - f0;
    const d = []; let up = 0, mx = 0, la = 0, lb = 0; for (let j = 0; j < A.length; j += 3) { const e = (B[j] + B[j + 1] + B[j + 2] - A[j] - A[j + 1] - A[j + 2]) / 3; d.push(e); if (e > 6) up++; mx = Math.max(mx, e); la += A[j] + A[j + 1] + A[j + 2]; lb += B[j] + B[j + 1] + B[j + 2]; }
    out[w] = { d, up, mx: +mx.toFixed(1), k: +(lb / la).toFixed(3), fr, on: on0 && g.w29.n().frameOn }; }
  let s1 = 0, s2 = 0; for (let i = 0; i < out.cpu.d.length; i++) { s1 += Math.abs(out.cpu.d[i] - out.gpu.d[i]); s2 += Math.abs(out.cpu.d[i]); }
  P.look = 0; window.__pin = [4.5, 6.5]; s.glWorld = 'cpu'; const strip = o => ({ up: o.up, mx: o.mx, k: o.k, fr: o.fr, on: o.on }); return { cpu: strip(out.cpu), gpu: strip(out.gpu), rel: +(s1 / Math.max(1, s2)).toFixed(3) }; }, look);
const l0 = await light(0), l1 = await light(0.35);
for (const [k, l] of [['rakt fram', l0], ['upp', l1]])
  ok(l.gpu.on && !l.cpu.on && l.gpu.fr >= 1 && l.gpu.up > 40 && l.gpu.mx > 12 && l.gpu.k <= 1.12 && Math.abs(l.gpu.up - l.cpu.up) < Math.max(25, l.cpu.up * 0.25) && l.rel < 0.35,
    `LJUS med grafikkortets värld (${k}): elden lyser upp som med CPU-världen ` + JSON.stringify(l));
await ev(() => { const s = __game.settings; s.glWorld = 'gpu'; s.glLight = 'on'; }); await until(null, 0.3); await shot('eld_grafikkort_2x');
// VATTEN: speglingen körs med grafikkortets värld (passet räknar speglingar) och vattnet ser ut som med CPU-världen
const wt = await ev(() => { const g = __game, s = g.settings, P = g.P; g.particles().length = 0; window.__pin = null; P.x = 4.5; P.y = 9.5; P.a = 0; s.glLight = 'off'; const out = {};
  for (const [k, w, r] of [['cpu', 'cpu', 1], ['gpu1', 'gpu', 1], ['gpu2', 'gpu', 2]]) { s.glWorld = w; s.glRes = r; s.glWater = 'on'; g.v28.render(); const r0 = g.l29.n().refl || 0; g.v28.render(); out[k] = { on: g.gl.post(), refl: (g.l29.n().refl || 0) - r0 }; s.glWater = 'off'; g.v28.render(); out[k].off = g.gl.post(); }
  const diff = (a, b, i) => Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
  const C = out.cpu; let n = 0, eff = 0, res1 = 0, n2 = 0; for (let i = 0; i < C.on.length; i += 4) { if (diff(out.gpu2.on, out.gpu2.off, i) > 9) n2++; const d = diff(C.on, C.off, i); if (d <= 9) continue; n++; eff += d / 3; res1 += diff(out.gpu1.on, C.on, i) / 3; }
  window.__pin = [4.5, 6.5]; s.glWorld = 'cpu'; s.glRes = 2; return { reflCpu: out.cpu.refl, reflGpu: out.gpu1.refl + out.gpu2.refl, n, n2, eff: +(eff / Math.max(1, n)).toFixed(1), res1: +(res1 / Math.max(1, n)).toFixed(2) }; });
ok(wt.reflGpu >= 2 && wt.n > 200 && wt.res1 < wt.eff * 0.15 && wt.n2 > wt.n * 0.5, 'VATTEN speglar med grafikkortets värld (1×: som CPU-världen där vattnet speglar; 2×: speglar lika stor yta) ' + JSON.stringify(wt));
// LUFT i 2×: dimman (träsket) och värmedallret (vulkanen) går genom ljuspasset i S×; på CPU:ns provpunkter som CPU-världen (1×), och i 2× syns effekten lika stort
const air = {};
for (const [b, seed] of [['swamp', 8101], ['volcano', 8202]]) {
  await ev(([b, seed]) => { const g = __game, L = Gen.floor(seed, 3, { biome: b }); g.run().depth = 3; g.startLevel(L); for (const e of g.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; }
    const M = L.map, ray = (x, y, a) => { for (let d = 0.3; d < 14; d += 0.2) if (g.solid(x + Math.cos(a) * d, y + Math.sin(a) * d)) return d; return 14; }; let bs = -1, pos = null, ang = 0;
    for (let y = 1; y < M.length - 1; y++) for (let x = 1; x < M[0].length - 1; x++) { if (g.solid(x + 0.5, y + 0.5)) continue; let r = 0, ba = 0, bd = 0; for (let k = 0; k < 8; k++) { const d = ray(x + 0.5, y + 0.5, k * Math.PI / 4); r += d; if (d > bd) { bd = d; ba = k * Math.PI / 4; } } if (r > bs) { bs = r; pos = [x + 0.5, y + 0.5]; ang = ba; } }
    window.__pin = null; clearInterval(window.__hold); window.__hold = setInterval(() => { const P = __game.P; P.hp = 1e6; P.x = pos[0]; P.y = pos[1]; P.a = ang; P.vx = P.vy = 0; }, 30); Object.assign(g.settings, { reduceMotion: false, glLight: 'off', glWater: 'off' }); }, [b, seed]);
  await until(() => __game.banner() <= 0, 4); await until(null, 0.5);
  air[b] = await ev(() => { const g = __game, s = g.settings, out = {}; g.particles().length = 0;
    for (const [k, w, r] of [['cpu', 'cpu', 1], ['gpu1', 'gpu', 1], ['gpu2', 'gpu', 2]]) { s.glWorld = w; s.glRes = r; s.glAir = 'on'; g.v28.render(); const st = g.l29.n(); out[k] = { on: g.gl.post(), fx: st.fx, nh: st.nh }; s.glAir = 'off'; g.v28.render(); out[k].off = g.gl.post(); }
    const d = (a, b, i) => Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); let n = 0, eff = 0, res = 0, n2 = 0;
    for (let i = 0; i < out.cpu.on.length; i += 4) { if (d(out.gpu2.on, out.gpu2.off, i) > 9) n2++; const e = d(out.cpu.on, out.cpu.off, i); if (e <= 9) continue; n++; eff += e / 3; res += d(out.gpu1.on, out.cpu.on, i) / 3; }
    s.glWorld = 'cpu'; return { fx: out.cpu.fx, n, n2, eff: +(eff / Math.max(1, n)).toFixed(1), res1: +(res / Math.max(1, n)).toFixed(2) }; });
}
ok(Object.values(air).every(a => a.n > 300 && a.res1 < a.eff * 0.15 && a.n2 > a.n * 0.5), 'LUFT (dimma i träsket, dallret i vulkanen) med grafikkortets värld: som CPU-världen i 1×, lika stor effekt i 2× ' + JSON.stringify(air));
ok(cerr.length === 0 && errs.length === 0, 'inga fel ' + JSON.stringify(cerr.slice(0, 4)));
await done();
