// Version 30 (SPEL): ljuset i Ruinstaden och Glasbruket (som t176): med LJUS + BLOOM tvättas bilden inte ut (högst +12 % mot båda av),
// ruinerna är dammiga men läsbara och glasbruket varmt. Riktiga våningar från bangeneratorn, WebGL (SwiftShader). Skärmbilder av
// fienderna och förstapersonsvapnen (slungan och glasbössan). Port 9892.
import { setup } from './head.mjs';
const PORT = 9892;
const { pg, ev, wait, ok, shot, done, start, gwait } = await setup(PORT, 'out/t192');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) cerr.push(m.text().slice(0, 160)); });
await start(); await gwait(1);
const res = [];
// som t176: ett rum i biomen med eld och en smäll framför spelaren, plus biomens egna ljuskällor i bild (ugnsmun som sprutar, smältugn, smält glas)
const sceneFn = o => { const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: false, noFlash: false, reduceMotion: false, rendering: 'webgl', bloom: true, glLight: 'on', glWater: 'off', glAir: 'off', particles: 'max' });
  const W = 20, H = 13, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? (o.biome === 'ruins' ? 'ʘ' : 'ʚ') : '.'); grid.push(r); }
  for (let x = 8; x <= 10; x++) grid[2][x] = o.biome === 'ruins' ? 'ʗ' : 'ʛ'; grid[6][4] = 'P'; grid[4][15] = 'f';
  if (o.biome === 'glassworks') { grid[6][9] = 'ʡ'; grid[4][12] = 'ʥ'; grid[8][11] = 'ʟ'; grid[8][12] = 'ʟ'; grid[5][13] = 'ʦ'; } else { grid[4][12] = 'ʢ'; grid[8][11] = 'ʞ'; grid[5][13] = 'ʤ'; }
  g.playCustom({ grid, biome: o.biome }); g.P.hp = 1e6; window.__pin = [4.5, 6.5];
  clearInterval(window.__hold); window.__hold = setInterval(() => { const P = __game.P; P.hp = Math.max(P.hp, 1e5); if (window.__pin) { P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = 0.1; P.vx = P.vy = 0; } }, 30); };
const fire = () => ev(() => { const g = __game, fx = g.v27b.fx(), L = g.particles(); L.length = 0;
  for (let i = 0; i < 30; i++) L.push({ x: 7.2 + (i % 5) * 0.12, y: 5.6 + ((i / 5) | 0) * 0.06, z: 0.15 + (i % 3) * 0.1, vx: 0, vy: 0, vz: 0, life: 1e4, maxLife: 1e4, img: fx.fire[i % 16], size: 0.45, add: true, tint: [255, 160, 60] }); return L.length; });
for (const biome of ['ruins', 'glassworks']) {
  await ev(sceneFn, { biome }); await gwait(1.5);
  if (biome === 'glassworks') { await ev(() => { const V = __game.v30().V30L(); for (const v of V.vents) v.ph = 3.6; }); await gwait(0.15); }
  await fire(); await ev(() => { const g = __game, P = g.P; g.explode(P.x + 3, P.y - 1.2, 0, 1.2, false, false); }); await gwait(0.05);
  const m = await ev(() => { const g = __game, s = g.settings, lum = B => { let t = 0; for (const v of B) t += v; return t / B.length; }; window.__pin = null;
    if (!g.gl || !g.gl.snap) return { cpu: true };
    s.glLight = 'off'; s.bloom = false; const A = g.gl.snap(80, 50); s.bloom = true; const B = g.gl.snap(80, 50); s.glLight = 'on'; const C = g.gl.snap(80, 50); window.__pin = [4.5, 6.5]; if (!A || !C) return { cpu: true };
    let up = 0, r = 0, b = 0; for (let j = 0; j < C.length; j += 3) { r += C[j]; b += C[j + 2]; if ((C[j] + C[j + 1] + C[j + 2] - B[j] - B[j + 1] - B[j + 2]) / 3 > 6) up++; }
    const n = g.l29 && g.l29.n ? g.l29.n() : {}, a = lum(A), bb = lum(B), c = lum(C), V = g.v30().V30L();
    return { biome: g.lvl().biome, aa: +a.toFixed(1), ab: +bb.toFixed(1), lb: +c.toFixed(1), kAlla: +(c / Math.max(1, a)).toFixed(3), kLjus: +(c / Math.max(1, bb)).toFixed(3), up, lights: n.lights, rb: +(r / Math.max(1, b)).toFixed(2), vent: V.vents.map(v => v.state).join('') }; });
  res.push(m); await pg.keyboard.press('KeyK'); await wait(300); await ev(() => { __game.settings.glLight = 'off'; }); await wait(250); await shot(biome + '_ljus_av');
  await ev(() => { __game.settings.glLight = 'on'; }); await wait(250); await shot(biome + '_ljus_pa'); await pg.keyboard.press('KeyK'); await wait(200);
}
await ev(() => { clearInterval(window.__hold); window.__pin = null; });
console.log('LJUS', JSON.stringify(res));
const real = res.filter(m => !m.cpu);
ok(real.length === 2, 'WebGL i headless ' + JSON.stringify(res));
ok(real.every(m => m.lights > 0 && m.up > 30), 'LJUS gör något: ljuset ljusnar bilden lokalt ' + JSON.stringify(real.map(m => [m.biome, m.lights, m.up, m.vent])));
ok(real.every(m => m.kAlla <= 1.12 && m.kLjus <= 1.12), 'LJUS + BLOOM tvättar inte ut Ruinstaden eller Glasbruket (högst +12 %) ' + JSON.stringify(real.map(m => [m.biome, m.aa, m.lb, m.kAlla, m.kLjus])));
ok(real.every(m => m.lb > 10), 'bilden är läsbar (medelljus > 10) ' + JSON.stringify(real.map(m => [m.biome, m.lb])));
ok(real.filter(m => m.biome === 'glassworks').every(m => m.rb > 1.25), 'Glasbruket är varmt (rött över blått) ' + JSON.stringify(real.filter(m => m.biome === 'glassworks').map(m => m.rb)));
// riktiga våningar från bangeneratorn (medelljus, ingen urtvättning)
const res2 = [];
for (const [biome, seed, d] of [['ruins', 811, 4], ['glassworks', 833, 4]]) {
  await ev(([biome, seed, d]) => { const g = __game; Object.assign(g.settings, { rendering: 'webgl', bloom: true, glLight: 'on' }); const L = Gen.floor(seed, d, { biome }); g.run().depth = d; g.startLevel(L); g.P.hp = 1e6; g.P.iframe = 1e6; for (const e of g.ents()) { e.alert = false; e.sleep = true; } }, [biome, seed, d]);
  await gwait(2.5);
  const m = await ev(() => { const g = __game, s = g.settings, lum = B => { let t = 0; for (const v of B) t += v; return t / B.length; }; if (!g.gl || !g.gl.snap) return { cpu: true };
    s.glLight = 'off'; s.bloom = false; const A = g.gl.snap(80, 50); s.glLight = 'on'; s.bloom = true; const C = g.gl.snap(80, 50); if (!A || !C) return { cpu: true }; const a = lum(A), c = lum(C); return { biome: g.lvl().biome, aa: +a.toFixed(1), lb: +c.toFixed(1), k: +(c / Math.max(1, a)).toFixed(3) }; });
  res2.push(m); await shot(`${biome}_${seed}`);
}
console.log('VÅNINGAR', JSON.stringify(res2));
ok(res2.filter(m => !m.cpu).every(m => m.k <= 1.12 && m.lb > 10), 'riktiga våningar: läsbara och inte urtvättade ' + JSON.stringify(res2));
// fienderna i bild och förstapersonsvapnen
await ev(() => { const g = __game; Object.assign(g.settings, { rendering: 'cpu' }); });
const scene = types => ev(types => { const g = __game; const W = 24, H = 12, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[6][2] = 'P'; grid[1][22] = 'x'; types.forEach((t, i) => { grid[3 + (i % 2) * 5][6 + i * 2] = t; }); g.playCustom({ grid, biome: 'dungeon' }); g.P.hp = 1e6; g.P.iframe = 1e6; g.P.a = 0; }, types);
for (const [name, types] of [['fiender_ruiner', ['ʨ', 'ʩ', 'ʪ', 'ʫ']], ['fiender_glas', ['ʮ', 'ʯ', 'ʰ', 'ʱ']]]) {
  await scene(types); await gwait(1.2);
  await ev(() => { for (const e of __game.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0 }; } __game.P.a = 0; }); await gwait(0.3); await shot(name);
}
for (const id of ['sling', 'glassgun']) {
  await ev(id => { const g = __game, P = g.P, i = g.WEAPONS.findIndex(w => w.id === id); P.has[i] = true; P.mags[i] = 1; P.ammo.slingstones = 10; P.ammo.glass = 10; g.switchWeapon(i); }, id); await gwait(0.6);
  await shot('vapen_' + id);
  await ev(() => { const g = __game; g.WS.cd = 0; g.WS.state = 'idle'; g.fire(); }); await wait(120); await shot('vapen_' + id + '_skott');
}
ok(cerr.length === 0, 'inga fel i konsolen ' + cerr.slice(0, 3).join(' / '));
await done();
