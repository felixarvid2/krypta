// t162: version 28 (WEBGL) – partiklar i grafikkortet. Instansräkningen stämmer med antalet partiklar i bild, partiklar bakom en vägg
// syns inte, bakom en fiende döljs de av fienden och framför den syns de, genom ett fönster (ǂ) syns de. För varje grupp jämförs antalet
// ändrade bildpunkter (med och utan gruppen, samma bildruta) mellan CPU-vägen och grafikkortet. Upp/ned-blicken, lowfx och additiva
// partiklar fungerar, och partikeltaket blir ×16 med WebGL (MAX). Port 9862.
import { setup } from './head.mjs';
const PORT = 9862;
const { pg, ev, wait, ok, shot, done } = await setup(PORT, 'out/t162');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const sceneFn = o => { const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: false, noFlash: false, reduceMotion: false, rendering: 'webgl', bloom: false, particles: 'normal' });
  const W = 20, H = 13, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[6][4] = 'P'; for (const [c, x, y] of o.cells || []) grid[y][x] = c;
  g.playCustom({ grid, biome: 'dungeon' }); for (const e of g.ents()) { e.d = { ...e.d, speed: 0, dmg: 0 }; e.alert = false; }
  g.P.hp = 1e6; window.__pin = [4.5, 6.5]; g.lvl().ambient = 1.1;
  clearInterval(window.__hold); window.__hold = setInterval(() => { const P = __game.P; P.hp = Math.max(P.hp, 1e5); if (window.__pin) { P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = 0; P.vx = P.vy = 0; } }, 30); };
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 90000) return !cond; await wait(80); } };
const ready = async o => { await ev(sceneFn, o); await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await until(() => __game.gl.n().used, 2); await until(null, 0.3); };
// gruppen: n partiklar i en låda (x0..x1, y0..y1, z0..z1); add = additiva
const grp = o => ({ n: 150, x0: 7, x1: 7.6, y0: 6.1, y1: 6.9, z0: 0.15, z1: 0.6, size: 0.12, ...o });
// ändrade bildpunkter med och utan gruppen, CPU och grafikkort, samma bildruta
const test = (G, o) => ev(([G, o]) => { const g = __game, GL = g.gl, fx = g.v27b.fx(), L = g.particles(), P = g.P; window.__pin = null; P.x = 4.5; P.y = 6.5; P.a = 0; P.look = o.look || 0; P.pitch = 0; P.roll = 0;
  if (o.lowfx) g.settings.lowfx = true;
  const mk = () => { const out = []; let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < G.n; i++) out.push({ x: G.x0 + r() * (G.x1 - G.x0), y: G.y0 + r() * (G.y1 - G.y0), z: G.z0 + r() * (G.z1 - G.z0), vx: 0, vy: 0, vz: 0, life: 1e4, maxLife: 1e4,
      img: G.add ? fx.fire[i % 16] : fx.shards[i % fx.shards.length], size: G.size, add: !!G.add, tint: G.add ? [255, 170, 80] : [200, 40, 30] }); return out; };
  const cpuImg = () => { g.settings.rendering = 'cpu'; g.v28.render(); return document.getElementById('screen').getContext('2d').getImageData(0, 0, 320, 200).data; };
  const glImg = () => { g.settings.rendering = 'webgl'; g.v28.render(); return GL.post(); };
  const cnt = (A, B) => { let n = 0; for (let i = 0; i < A.length; i += 4) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 24) n++; return n; };
  L.length = 0; L.push(...mk()); const c1 = cpuImg(), g1 = glImg(), st = GL.n(); L.length = 0; const c0 = cpuImg(), g0 = glImg();
  g.settings.lowfx = false; P.look = 0; window.__pin = [4.5, 6.5];
  return { cpu: cnt(c1, c0), gpu: cnt(g1, g0), inst: st.inst, instO: st.instO, instA: st.instA, used: st.used, lk: st.lkGpu }; }, [G, o || {}]);
const near = (r, lo = 0.5, hi = 2) => r.cpu > 0 && r.gpu / r.cpu > lo && r.gpu / r.cpu < hi;
// 1) synliga partiklar i öppet rum
await ready({});
const vis = await test(grp({}));
ok(vis.used && vis.inst === 150 && vis.instO === 150 && vis.gpu > 100 && near(vis), 'synliga partiklar: 150 instanser, ungefär lika många bildpunkter som CPU-vägen ' + JSON.stringify(vis));
const add = await test(grp({ add: true, size: 0.3 }));
ok(add.instA === 150 && add.gpu > 100 && near(add, 0.4, 2.5), 'additiva partiklar (eld) ' + JSON.stringify(add));
await ev(() => { const g = __game, fx = g.v27b.fx(), L = g.particles(); L.length = 0; for (let i = 0; i < 300; i++) L.push({ x: 7 + (i % 20) * 0.08, y: 5.6 + ((i / 20) | 0) * 0.12, z: 0.1 + (i % 7) * 0.08, vx: 0, vy: 0, vz: 0, life: 1e4, maxLife: 1e4, img: i % 2 ? fx.fire[i % 16] : fx.shards[i % fx.shards.length], size: 0.15, add: !!(i % 2), tint: i % 2 ? [255, 170, 80] : [200, 40, 30] }); });
await until(null, 0.2); await shot('partiklar_gpu'); await ev(() => { __game.particles().length = 0; });
// 2) bakom en vägg: syns inte
await ready({ cells: [[ '1', 10, 5], ['1', 10, 6], ['1', 10, 7]] });
const hid = await test(grp({ x0: 12, x1: 12.6 }));
ok(hid.inst === 150 && hid.gpu === 0 && hid.cpu === 0, 'bakom väggen: instanserna ritas men inget syns ' + JSON.stringify(hid));
// 3) en fiende: bakom döljs, framför syns
await ready({ cells: [['Ä', 10, 6]] });
const behind = await test(grp({ x0: 12, x1: 12.3, y0: 6.35, y1: 6.65, z0: 0.2, z1: 0.7 })), front = await test(grp({ x0: 8, x1: 8.3, y0: 6.35, y1: 6.65, z0: 0.2, z1: 0.7 }));
await ready({});
const behindNo = await test(grp({ x0: 12, x1: 12.3, y0: 6.35, y1: 6.65, z0: 0.2, z1: 0.7 }));
ok(behind.gpu < behindNo.gpu * 0.8 && near(behind, 0.4, 2.5), 'bakom fienden: fienden döljer partiklarna (som CPU-vägen) ' + JSON.stringify({ behind, utanFiende: behindNo }));
ok(front.gpu > 100 && near(front), 'framför fienden: partiklarna syns ' + JSON.stringify(front));
// 4) genom ett fönster och ett galler
for (const c of ['ǂ', 'Ɉ']) { await ready({ cells: [[c, 10, 5], [c, 10, 6], [c, 10, 7]] }); const r = await test(grp({ x0: 12, x1: 12.6, size: 0.18 }));
  ok(r.gpu > 20 && near(r, 0.4, 2.5), `genom ${c}: partiklarna syns, ungefär som CPU-vägen ` + JSON.stringify(r)); }
await shot('genom_galler');
// 5) upp/ned-blicken och lowfx
await ready({});
const up = await test(grp({}), { look: 0.3 }), dn = await test(grp({}), { look: -0.35 });
ok(up.inst === 150 && up.lk > 0 && near(up) && near(dn), 'upp/ned-blicken: partiklarna i bufferns rum, homografin i grafikkortet ' + JSON.stringify({ up, dn }));
const lf = await test(grp({}), { lowfx: true });
ok(lf.used && lf.gpu > 100, 'lowfx: partiklarna ritas ' + JSON.stringify(lf));
// 6) partikeltaket ×16 med WebGL och MAX, ×8 med CPU
await ev(() => { __game.settings.particles = 'max'; }); await until(null, 0.3);
const pgl = await ev(() => __game.gl.pb());
await ev(() => { __game.settings.rendering = 'cpu'; }); await until(null, 0.3);
const pcpu = await ev(() => __game.gl.pb());
ok(pgl.max === 16 && pgl.k === 16 && pcpu.max === 8 && pcpu.k === 8, 'MAX: ×16 med WebGL, ×8 med CPU ' + JSON.stringify({ pgl, pcpu }));
await done();
