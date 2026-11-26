// t163: version 28 (WEBGL) – mätning av CPU-tiden per bildruta (render(): värld, sprites, partiklar och utskrift; bara huvudtråden,
// ingen readPixels/finish i mätningen) med 4× CPU-strypning. Den gamla js/game.js (före version 28, GAME_JS) mot den nya med CPU och
// med WebGL, med 0, 1000 och 3000 partiklar framför spelaren (hälften additiva). OBS: i headless är grafikkortet SwiftShader, så
// siffrorna är JavaScript plus uppladdning, inte grafikkortets tid. Port 9863. Skriver out/t163/res.json.
import { setup } from './head.mjs';
import fs from 'fs';
import { execFileSync } from 'child_process'; import path from 'path';
const baseOld = () => { const p = process.env.T160_OLD || path.resolve('out/game_e7ecff3.js'); if (fs.existsSync(p)) return p; // före version 28: js/game.js vid e7ecff3 (hämtas med git show)
  try { const root = process.env.KRYPTA_ROOT || path.resolve('../..'); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, execFileSync('git', ['show', 'e7ecff3:js/game.js'], { cwd: root, maxBuffer: 1 << 27 })); return p; }
  catch (e) { console.log('SKIP  den gamla js/game.js (e7ecff3) gick inte att hämta: ' + String(e.message).slice(0, 80)); return null; } };
const PORT = 9863, OLD = baseOld(), N = +(process.env.T163_N || 150);
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/t163');
const cdp = await pg.context().newCDPSession(pg);
const sceneFn = o => { const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: false, rendering: o.mode, bloom: true, particles: 'normal' });
  const W = 20, H = 13, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[6][4] = 'P'; grid[3][12] = '2'; grid[9][12] = '3'; grid[5][14] = 'Ä'; grid[8][15] = 'Ä';
  g.playCustom({ grid, biome: 'dungeon' }); for (const e of g.ents()) { e.d = { ...e.d, speed: 0, dmg: 0 }; e.alert = false; } g.P.hp = 1e6; window.__pin = [4.5, 6.5];
  clearInterval(window.__hold); window.__hold = setInterval(() => { const P = __game.P; P.hp = 1e6; if (window.__pin) { P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = 0; P.vx = P.vy = 0; } }, 30); };
const load = async () => { await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 120000 }); };
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(100); } };
const bench = (n, N, big) => ev(([n, N, big]) => { const g = __game, fx = g.v27b.fx(), L = g.particles(); L.length = 0; let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) { const add = i % 2 === 1; L.push({ x: 6 + r() * 7, y: 4 + r() * 5, z: r() * 0.8, vx: 0, vy: 0, vz: 0, life: 1e4, maxLife: 1e4, img: add ? fx.fire[i % 16] : fx.shards[i % fx.shards.length], size: big ? 0.2 + r() * 0.3 : 0.05 + r() * 0.12, add, tint: add ? [255, 170, 80] : [190, 30, 20] }); }
  window.__pin = null; g.P.x = 4.5; g.P.y = 6.5; g.P.a = 0; g.P.look = 0;
  for (let i = 0; i < 5; i++) g.v28.render(); // uppvärmning (atlasen byggs)
  const r0 = g.v28.bench(N); const used = g.gl ? g.gl.n().used : false, inst = g.gl ? g.gl.n().inst : 0; L.length = 0; window.__pin = [4.5, 6.5];
  return { med: +r0.med.toFixed(2), p90: +r0.p90.toFixed(2), used, inst }; }, [n, N, big]);
const res = {};
const runAll = async (key, mode) => { await ev(sceneFn, { mode }); await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await until(null, 0.5);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  res[key] = {}; for (const n of [0, 1000, 3000]) res[key][n] = await bench(n, N); res[key]['3000stora'] = await bench(3000, N, true);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); console.log(key, JSON.stringify(res[key])); };
if (OLD) { process.env.GAME_JS = OLD; await load(); await runAll('före (gammal fil, CPU)', 'auto'); delete process.env.GAME_JS; }
await load(); await runAll('efter, CPU', 'cpu'); await runAll('efter, WEBGL', 'webgl');
fs.writeFileSync('out/t163/res.json', JSON.stringify(res, null, 1));
const o = res['före (gammal fil, CPU)'], c = res['efter, CPU'], w = res['efter, WEBGL'];
if (o) ok(c[0].med < o[0].med * 1.15 + 0.3, 'CPU-vägen är inte långsammare än före (0 partiklar) ' + JSON.stringify({ före: o[0].med, efter: c[0].med }));
ok(w[3000].used && w[3000].inst > 1000, 'WebGL ritar partiklarna som instanser ' + JSON.stringify(w[3000]));
ok(w[3000].med < c[3000].med * 0.85 && w['3000stora'].med < c['3000stora'].med * 0.5, '3000 partiklar: WebGL-vägen tar mindre CPU-tid än CPU-vägen ' + JSON.stringify({ små: { cpu: c[3000].med, webgl: w[3000].med }, stora: { cpu: c['3000stora'].med, webgl: w['3000stora'].med } }));
ok(w['3000stora'].med - w[0].med < (c['3000stora'].med - c[0].med) * 0.25, 'partiklarnas extra CPU-tid är liten med WebGL ' + JSON.stringify({ cpu: +(c['3000stora'].med - c[0].med).toFixed(2), webgl: +(w['3000stora'].med - w[0].med).toFixed(2) }));
await done();
