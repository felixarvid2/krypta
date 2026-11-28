// t164: version 28 (WEBGL) – uthållighet i riktiga banor. RENDERING WEBGL, PARTIKLAR MAX och BLOOM: fyra våningar av en runda
// (olika biomer), springa, skjuta, smällar, titta upp och ned, byta fönsterstorlek (ny skala S, de gamla bufferterna släpps) och dö.
// Inga sidfel, inga fel i bildrutan (console.error), ingen reserv, inga partiklar utan bild, atlasen töms inte om och om igen.
// Bloom tvättar inte ut ljusa biomer (medelljuset med bloom högst ~15 % över utan). Skärmbilder: skott med CPU och med WebGL.
// Väntan i speltid. Port 9864.
import { setup } from './head.mjs';
const PORT = 9864;
const { pg, ev, wait, ok, shot, done, errs } = await setup(PORT, 'out/t164');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) cerr.push(m.text().slice(0, 160)); });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&seed=webgl28`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await pg.evaluate(() => { localStorage.removeItem('krypta.run'); const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: false, rendering: 'webgl', particles: 'max', bloom: true, noFlash: false }); g.begin('new'); });
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(100); } };
const closeUI = () => ev(() => { try { if (window.CardUI && CardUI.isOpen()) CardUI.close(); } catch (e) { /* inget */ } if (__game.state() === 'ui' || __game.state() === 'pause') __game.resume && __game.resume(); }); // talangval och kort: stäng (som t140)
const biomes = [], blooms = []; let maxInst = 0;
for (const d of [1, 3, 4, 5]) {
  await ev(d => { __game.loadFloor(d); }, d); await until(() => __game.state() === 'play' && __game.levelTime() > 0.5, 8); await closeUI();
  await until(() => __game.state() === 'play', 4);
  const b = await ev(() => { const g = __game, P = g.P; P.hp = 1e6; P.iframe = 1e6; if (P.ammo) for (const k in P.ammo) P.ammo[k] = 999; return g.lvl().biome; }); biomes.push(b);
  await pg.keyboard.down('w'); await ev(() => __game.setMouse(true, false));
  for (let k = 0; k < 6; k++) { await ev(k => { const g = __game, P = g.P; P.look = Math.sin(k) * 0.4; P.a += 0.4; P.hp = 1e6; const e = g.ents().find(x => !x.dead); g.explode(P.x + Math.cos(P.a) * 2.5, P.y + Math.sin(P.a) * 2.5, 0, 1.5, false, k % 2 === 0); }, k); await until(null, 0.35);
    maxInst = Math.max(maxInst, await ev(() => __game.gl.n().inst)); await closeUI(); }
  await ev(() => __game.setMouse(false, false)); await pg.keyboard.up('w');
  await closeUI(); await until(null, 0.3); await shot('v' + d + '_' + b);
  // bloom av/på i samma bildruta: medelljuset
  blooms.push(await ev(b => { const g = __game; g.P.look = 0; const lum = B => { let s = 0; for (const v of B) s += v; return s / B.length; }; g.settings.bloom = false; const A = g.gl.snap(80, 50); g.settings.bloom = true; const C = g.gl.snap(80, 50); if (!A || !C) return { b, cpu: true, st: g.state() }; const a = lum(A), c = lum(C); return { b, utan: +a.toFixed(1), med: +c.toFixed(1), k: +(c / Math.max(1, a)).toFixed(3) }; }, b));
}
const n1 = await ev(() => ({ ...__game.gl.n(), parts: __game.particles().length, pb: __game.gl.pb() }));
ok(biomes.length === 4 && n1.used && !n1.failed && n1.fallbacks === 0, 'fyra våningar med WebGL utan reserv ' + JSON.stringify({ biomes, n: { frames: n1.frames, fallbacks: n1.fallbacks, reason: n1.reason } }));
ok(maxInst > 100 && n1.pb.max === 16 && n1.noImg === 0 && !(n1.atlasMiss > 50) && n1.atlasResets <= 3, 'partiklarna i grafikkortet: instanser, bild till alla, atlasen stabil ' + JSON.stringify({ maxInst, noImg: n1.noImg, atlasMiss: n1.atlasMiss || 0, resets: n1.atlasResets, imgs: n1.atlasImgs, pb: n1.pb }));
ok(blooms.filter(x => !x.cpu).length >= 1 && blooms.every(x => x.cpu || x.k < 1.15), 'bloom tvättar inte ut bilden (medelljus med/utan) ' + JSON.stringify(blooms));
// CPU-tid i en riktig bana (render(), huvudtråden, SwiftShader): CPU mot WebGL med ~20 och ~1000 partiklar framför spelaren
const rb = await ev(() => { const g = __game, fx = g.v27b.fx(), L = g.particles(), P = g.P, out = {}; P.look = 0; let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (const n of [20, 1000]) { L.length = 0; for (let i = 0; i < n; i++) { const add = i % 2 === 1, d = 1 + r() * 5, a = P.a + (r() - 0.5) * 0.8; L.push({ x: P.x + Math.cos(a) * d, y: P.y + Math.sin(a) * d, z: r() * 0.8, vx: 0, vy: 0, vz: 0, life: 1e4, maxLife: 1e4, img: add ? fx.fire[i % 16] : fx.shards[i % fx.shards.length], size: 0.05 + r() * 0.2, add, tint: add ? [255, 170, 80] : [190, 30, 20] }); }
    for (const m of ['cpu', 'webgl']) { g.settings.rendering = m; for (let i = 0; i < 5; i++) g.v28.render(); const b = g.gl.bench(40); out[m + n] = { med: +b.med.toFixed(2), p90: +b.p90.toFixed(2), inst: b.inst }; } }
  L.length = 0; g.settings.rendering = 'webgl'; return { biome: g.lvl().biome, props: g.props().length, ents: g.ents().length, ...out }; });
console.log('BENCH riktig bana', JSON.stringify(rb));
// bara en mätning (ingen gräns): i SwiftShader kostar WebGL-vägens fasta del (uppladdningar, spritedjupet) ungefär lika mycket som partiklarna sparar i en mörk bana
// skott: CPU och WebGL (skärmbilder för ögat)
for (const m of ['cpu', 'webgl']) { await ev(m => { const g = __game; g.settings.rendering = m; g.P.look = 0; g.setMouse(true, false); }, m); await until(null, 0.12); await shot('skott_' + m); await ev(() => __game.setMouse(false, false)); await until(null, 0.3); }
// fönsterstorleken byts: ny skala, gamla bufferter släpps
const s0 = await ev(() => __game.gl.n()); await pg.setViewportSize({ width: 1440, height: 900 }); await until(null, 0.5);
const s1 = await ev(() => __game.gl.n()); await pg.setViewportSize({ width: 640, height: 400 }); await until(null, 0.5); const s2 = await ev(() => __game.gl.n());
ok(s1.S === 4 && s2.S === 2 && s1.used && s2.used && (s2.freed || 0) >= 4 && s2.cw === 640, 'ny fönsterstorlek: ny skala och de gamla bufferterna släpps ' + JSON.stringify({ före: s0.S, stor: s1.S, liten: s2.S, freed: s2.freed, cw: s2.cw }));
await until(null, 0.3);
// döden: bilden fortsätter (lutning och dödsskärm)
await closeUI(); await ev(() => { const P = __game.P; P.iframe = 0; __game.hurtPlayer(1e7); }); await until(() => __game.state() === 'dead', 3); await until(null, 1.5);
const dn = await ev(() => ({ st: __game.state(), n: __game.gl.n() })); await shot('doden');
ok(dn.st === 'dead' || dn.st === 'runover', 'döden med WebGL ' + JSON.stringify({ st: dn.st, used: dn.n.used, failed: dn.n.failed }));
ok(cerr.length === 0 && errs.length === 0, 'inga fel i bildrutorna ' + JSON.stringify(cerr.slice(0, 4)));
await done();
