// t182: version 29 (VÄRLD) – CPU-tiden per bildruta med 4× CPU-strypning (duken 640×400, S = 2) i riktiga banor (Gen.floor): kryptan, skogen (utomhus, himmel),
// fängelset (galler och fönster) och slakteriet, rakt fram och med blicken uppåt. render() mäts (värld, sprites, partiklar, uppladdning
// och WebGL-anropen; ingen readPixels). RENDERING WEBGL med spelarens inställningar (BLOOM, LJUS, VATTEN, LUFT på). VÄRLD CPU (1×)
// mot VÄRLD GRAFIKKORT 1×, 2× och 3×. Krav: GRAFIKKORT 2× ≤ CPU 1× (median) i varje bana. OBS: i headless är grafikkortet SwiftShader,
// så siffrorna är huvudtrådens tid (JavaScript och uppladdning), inte grafikkortets. Världens del (renderWorld) och utskriften
// (renderPost: uppladdning och WebGL-anrop) mäts var för sig; bästa medianen av tre omgångar för CPU 1× och GRAFIKKORT 2×. Port 9882. Skriver out/t182/res.json.
import { setup } from './head.mjs';
import fs from 'fs';
const PORT = 9882, N = +(process.env.T182_N || 60);
const { pg, ev, wait, ok, done, errs } = await setup(PORT, 'out/t182');
const cdp = await pg.context().newCDPSession(pg);
if (!process.env.T182_BIG) await pg.setViewportSize({ width: 640, height: 400 }); // scenens skala S = 2 (som på en telefon); T182_BIG=1: 960×600, S = 3
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 90000) return !cond; await wait(80); } };
await ev(() => { localStorage.removeItem('krypta.run'); const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: false, noFlash: false, rendering: 'webgl', bloom: true, glLight: 'on', glWater: 'on', glAir: 'on', glWorld: 'cpu', glRes: 1, particles: 'normal', mouseLook: true }); g.begin('new'); });
await wait(1500); await pg.keyboard.press('Escape'); await wait(500);
const visit = (biome, seed) => ev(([biome, seed]) => { const g = __game, d = 3, L = Gen.floor(seed, d, { biome }); g.run().depth = d; g.startLevel(L);
  for (const e of g.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } g.P.hp = 1e6;
  const M = L.map, ray = (x, y, a) => { for (let d = 0.3; d < 14; d += 0.2) if (g.solid(x + Math.cos(a) * d, y + Math.sin(a) * d)) return d; return 14; };
  let bs = -1, pos = null, ang = 0; for (let y = 1; y < M.length - 1; y++) for (let x = 1; x < M[0].length - 1; x++) { if (g.solid(x + 0.5, y + 0.5)) continue; let r = 0, ba = 0, bd = 0; for (let k = 0; k < 8; k++) { const d = ray(x + 0.5, y + 0.5, k * Math.PI / 4); r += d; if (d > bd) { bd = d; ba = k * Math.PI / 4; } } if (r > bs) { bs = r; pos = [x + 0.5, y + 0.5]; ang = ba + 0.2; } }
  window.__pin = [pos[0], pos[1], ang]; clearInterval(window.__hold); window.__hold = setInterval(() => { const P = __game.P; P.hp = 1e6; if (window.__pin) { P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = window.__pin[2]; P.vx = P.vy = 0; } }, 30);
  return { biome: g.lvl().biome, cells: g.v28.cells().length }; }, [biome, seed]);
const bench1 = (w, r, look) => ev(([w, r, look, N]) => { const g = __game, s = g.settings; s.glWorld = w; s.glRes = r; g.P.look = look; for (let i = 0; i < 6; i++) g.v28.render();
  const b = g.w29.bench(N); g.P.look = 0; return { ...b, used: g.gl.n().used, S: g.gl.n().S }; }, [w, r, look, N]);
const bench = async (w, r, look, k = 1) => { let best = null; for (let i = 0; i < k; i++) { const b = await bench1(w, r, look); if (!best || b.med < best.med) best = { ...b, world: Math.min(b.world, best ? best.world : 1e9) }; } return best; }; // bästa medianen av k omgångar (bruset i headless)
const res = {}, bad = [];
for (const [b, seed] of [['dungeon', 7101], ['forest', 7202], ['prison', 7303], ['abattoir', 7404]]) {
  const v = await visit(b, seed); await until(() => __game.banner() <= 0, 4); await until(null, 0.4);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  for (const look of [0, 0.35]) { const k = b + (look ? ' upp' : ''), o = res[k] = { cells: v.cells };
    o.cpu1 = await bench('cpu', 1, look, 3); o.gpu1 = await bench('gpu', 1, look); o.gpu2 = await bench('gpu', 2, look, 3); o.gpu3 = await bench('gpu', 3, look);
    console.log(k, JSON.stringify(o)); if (!(o.gpu2.on && o.gpu2.R === 2 && o.gpu2.med <= o.cpu1.med)) bad.push(k + ' ' + JSON.stringify({ cpu1: o.cpu1.med, gpu2: o.gpu2.med, R: o.gpu2.R })); }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
}
fs.writeFileSync('out/t182/res.json', JSON.stringify(res, null, 1));
ok(Object.keys(res).length === 8 && bad.length === 0, 'CPU-tiden med GRAFIKKORT 2× ≤ CPU-världen 1× (median, 4× strypning) i alla banor ' + bad.join(' | '));
const sum = k => Object.values(res).reduce((a, o) => a + o[k].med, 0) / Object.keys(res).length;
const sumW = k => Object.values(res).reduce((a, o) => a + o[k].world, 0) / Object.keys(res).length;
console.log('medel över banorna, hela render() (ms):', JSON.stringify({ cpu1: +sum('cpu1').toFixed(2), gpu1: +sum('gpu1').toFixed(2), gpu2: +sum('gpu2').toFixed(2), gpu3: +sum('gpu3').toFixed(2) }));
console.log('medel över banorna, världens del (ms):', JSON.stringify({ cpu1: +sumW('cpu1').toFixed(2), gpu1: +sumW('gpu1').toFixed(2), gpu2: +sumW('gpu2').toFixed(2), gpu3: +sumW('gpu3').toFixed(2) }));
ok(sumW('gpu2') < sumW('cpu1'), 'världens CPU-del med GRAFIKKORT 2× är mindre än CPU-världens (medel över banorna)');
ok(errs.length === 0, 'inga fel');
await done();
