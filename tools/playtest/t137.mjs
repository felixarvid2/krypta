// t137: version 27 (BLOOD) – prestanda. Bildrutans kostnad (gfxW.bench: väder, partiklar, ljus och render) med 4× CPU-strypning:
// (a) en vägg utan stänk (kroken i renderWalls ska inte kosta något), (b) samma vägg med 60 stänk i bild (värsta fallet), (c) en strid
// där åtta fiender sprängs i bitar framför en vägg, med BLOOD på och av (v27b.set(false) = det gamla). Sidorna mäts växelvis, median
// av fem. Dessutom v27Tick med fullt golv (70 fläckar, pölkollen varje anrop). Med GAME_JS=<version 26> mäts bara (a) och (c) som
// referens (samma BENCH-rad, jämförs för hand). (d) ihållande eld mot åtta fiender (var 0,067 s i en sekund). Inga sidfel.
import { setup } from './head.mjs';
const PORT = 9837;
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/t137');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const has = await ev(() => !!__game.v27b);
const sceneFn = o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = false; if (g.v27b) { g.settings.blood = 2; g.v27b.set(true); }
  const W = o.W, H = o.H, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[o.p[1]][o.p[0]] = 'P'; grid[1][1] = 'x'; for (const [t, x, y] of o.en) grid[y][x] = t;
  g.playCustom({ grid, biome: 'dungeon' });
  const E = g.ents(), spec = E.filter(e => !e.boss).map(e => [e.type, e.x, e.y]); E.length = 0; for (const [t, x, y] of spec) g.spawnEnemy(t, x, y);
  for (const e of E) { e.d = { ...e.d, dmg: 0, speed: 0 }; e.alert = true; }
  g.P.hp = 1e6; g.P.a = 0; g.P.pitch = 0; g.P.look = 0; g.P.iframe = 99; };
const scene = o => pg.evaluate(sceneFn, o);
await scene({ W: 16, H: 11, p: [11, 5], en: [] }); await wait(1500);
const cdp = await pg.context().newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await ev(() => { __game.pause(); __game.P.x = 11.5; __game.P.y = 5.5; __game.P.a = 0; });
const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
const B = { a: [], b: [], aOff: [] };
// (a) och (b): samma vy, utan och med 60 stänk (växelvis)
for (let i = 0; i < 6; i++) {
  B.a.push(await ev(() => { const g = __game; if (g.v27b) { for (const a of g.v27b.wallMarks().values()) a.length = 0; g.v27b.st.walls.length = 0; } g.particles().length = 0; return g.gfxW.bench(60).med; }));
  if (has) {
    B.aOff.push(await ev(() => { const g = __game; g.v27b.set(false); g.particles().length = 0; const r = g.gfxW.bench(60).med; g.v27b.set(true); return r; }));
    B.b.push(await ev(() => { const g = __game; g.particles().length = 0; for (let i = 0; i < 60; i++) { const y = 1.6 + (i % 9) * 0.95, h = g.v27b.cast(11.5, y, 1, 0, 30); g.v27b.wall(h, 1, 0.15, 0.25 + (i % 6) * 0.1, g.v27b.COL.flesh, 0.16, 1.2); } return g.gfxW.bench(60).med; }));
  }
}
const ra = med(B.a.slice(1)), rb = has ? med(B.b.slice(1)) : 0, raOff = has ? med(B.aOff.slice(1)) : 0;
const vis = has ? await ev(() => __game.v27b.marks().length) : 0;
// (c) strid: åtta kultister sprängs framför väggen, de första 45 bildrutorna (partiklar, fontäner, bitar, stänk)
const fight = off => ev(off => { const g = __game; if (g.v27b) g.v27b.set(!off); g.particles().length = 0; const E = g.ents(); E.length = 0;
  for (let i = 0; i < 8; i++) { const e = g.spawnEnemy('Ä', 13.5 + (i % 2), 2.5 + i * 0.8); e.d = { ...e.d, dmg: 0, speed: 0 }; e.alert = true; }
  for (const e of E) g.hurtEnemy(e, e.hp + 999, e.x, e.y); const r = g.gfxW.bench(45); if (g.v27b) g.v27b.set(true); return { med: r.med, p90: r.p90, parts: r.parts }; }, off);
const C = { on: [], off: [] };
for (let i = 0; i < 6; i++) { C.off.push(await fight(true)); C.on.push(await fight(false)); }
const cOn = med(C.on.slice(1).map(r => r.med)), cOff = med(C.off.slice(1).map(r => r.med)), pOn = med(C.on.slice(1).map(r => r.parts)), pOff = med(C.off.slice(1).map(r => r.parts));
// (d) ihållande eld: åtta fiender träffas var 0,067 s (var fjärde bildruta) i en sekund – partiklar under taket, bildrutans tid
const hose = off => ev(off => { const g = __game; if (g.v27b) g.v27b.set(!off); g.particles().length = 0; const E = g.ents(); E.length = 0;
  for (let i = 0; i < 8; i++) { const e = g.spawnEnemy('Ä', 13.5 + (i % 2), 2.5 + i * 0.8); e.d = { ...e.d, dmg: 0, speed: 0 }; e.alert = true; e.hp = e.maxHp = 1e6; }
  const ts = []; let maxP = 0; for (let f = 0; f < 60; f++) { const t0 = performance.now(); if (f % 4 === 0) for (const e of E) g.hurtEnemy(e, 2, e.x, e.y); g.gfxW.bench(1); ts.push(performance.now() - t0); maxP = Math.max(maxP, g.particles().length); }
  if (g.v27b) g.v27b.set(true); ts.sort((a, b) => a - b); return { med: ts[30], p90: ts[54], maxP }; }, off);
const Hs = { on: [], off: [] };
for (let i = 0; i < 4; i++) { Hs.off.push(await hose(true)); Hs.on.push(await hose(false)); }
const hOn = med(Hs.on.slice(1).map(r => r.med)), hOff = med(Hs.off.slice(1).map(r => r.med)), hpOn = Math.max(...Hs.on.map(r => r.maxP)), hpOff = Math.max(...Hs.off.map(r => r.maxP));
const tick = has ? await ev(() => { const g = __game, D = g.v27b.decalArr(), f = g.v27b.fx().parts.blood_pool; while (D.length < 70) D.push({ x: 3 + (D.length % 10), y: 2 + (D.length / 10 | 0), img: f[0], size: 0.12 }); return g.v27b.tickBench(400); }) : 0;
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await ev(() => __game.resume());
console.log('BENCH', JSON.stringify({ build: has ? 'v27' : 'bas', wallNoMarks: +ra.toFixed(2), wallNoMarksModuleOff: +raOff.toFixed(2), wall60: +rb.toFixed(2), marksInView: vis, fightOn: +cOn.toFixed(2), fightOff: +cOff.toFixed(2), partsOn: pOn, partsOff: pOff, hoseOn: +hOn.toFixed(2), hoseOff: +hOff.toFixed(2), hoseMaxPartsOn: hpOn, hoseMaxPartsOff: hpOff, tickMs: +tick.toFixed(4) }));
if (has) {
  ok(vis === 60, 'värsta fallet: 60 stänk på väggen i bild ' + vis);
  ok(ra < raOff * 1.15 + 0.3, `vägg utan stänk (4× strypning): ${ra.toFixed(2)} ms med modulen, ${raOff.toFixed(2)} ms med den av`);
  ok(rb < ra * 1.25 + 1, `60 stänk i bild: ${rb.toFixed(2)} ms mot ${ra.toFixed(2)} ms utan`);
  ok(cOn < cOff * 1.3 + 1.5, `strid med åtta överdöd: ${cOn.toFixed(2)} ms med BLOOD, ${cOff.toFixed(2)} ms utan (partiklar ${pOn} / ${pOff})`);
  ok(hpOn <= 262 && hOn < hOff * 1.3 + 1.5, `ihållande eld mot åtta fiender: ${hOn.toFixed(2)} ms med BLOOD, ${hOff.toFixed(2)} ms utan (högst ${hpOn} / ${hpOff} partiklar)`);
  ok(tick < 0.05, `v27Tick med fullt golv: ${tick.toFixed(4)} ms per anrop (4× strypning)`);
}
await done();
