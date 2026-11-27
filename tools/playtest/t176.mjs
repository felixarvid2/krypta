// t176: version 29 (LJUS) – ljuset tvättar inte ut ljusa biomer. Per biom (slakteri, katedral, skärseld, vulkan/lava, öken, borggård)
// i ett rum med eld och en smäll framför spelaren: medelljuset med LJUS + BLOOM mot båda av, och LJUS på mot av (bloom på), högst
// ~12 % över; samtidigt ljusnar bilden lokalt kring elden (ljuset gör något). Sedan två riktiga våningar (seed webgl28: slakteriet och
// katedralen) med smällar. Skärmbilder med ljuset av och på per biom, i samma bildruta (fotoläget fryser tiden). Väntan i speltid. Port 9876.
import { setup } from './head.mjs';
const PORT = 9876;
const { pg, ev, wait, ok, shot, done, errs } = await setup(PORT, 'out/t176');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) cerr.push(m.text().slice(0, 160)); });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&seed=webgl28`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const sceneFn = o => { const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: false, noFlash: false, reduceMotion: false, rendering: 'webgl', bloom: true, glLight: 'on', glWater: 'off', glAir: 'off', particles: 'max' });
  const W = 20, H = 13, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  for (let x = 8; x <= 10; x++) grid[2][x] = '2'; if (o.biome === 'bathhouse') for (let y = 4; y <= 8; y++) for (let x = 6; x <= 10; x++) if (grid[y][x] === '.') grid[y][x] = '-'; grid[6][4] = 'P'; grid[3][12] = '2'; grid[9][12] = '3'; grid[10][7] = '3'; grid[4][15] = 'f';
  g.playCustom({ grid, biome: o.biome }); g.P.hp = 1e6; window.__pin = [4.5, 6.5];
  clearInterval(window.__hold); window.__hold = setInterval(() => { const P = __game.P; P.hp = Math.max(P.hp, 1e5); if (window.__pin) { P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = 0.1; P.vx = P.vy = 0; } }, 30); };
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 90000) return !cond; await wait(80); } };
const fire = () => ev(() => { const g = __game, fx = g.v27b.fx(), L = g.particles(); L.length = 0;
  for (let i = 0; i < 30; i++) L.push({ x: 7.2 + (i % 5) * 0.12, y: 5.6 + ((i / 5) | 0) * 0.06, z: 0.15 + (i % 3) * 0.1, vx: 0, vy: 0, vz: 0, life: 1e4, maxLife: 1e4, img: fx.fire[i % 16], size: 0.45, add: true, tint: [255, 160, 60] });
  for (let i = 0; i < 12; i++) L.push({ x: 6.5 + (i % 4) * 0.1, y: 7.6 + ((i / 4) | 0) * 0.1, z: 0.4, vx: 0, vy: 0, vz: 0, life: 1e4, maxLife: 1e4, img: fx.fire[i % 16], size: 0.25, add: true, tint: [170, 120, 255] }); return L.length; });
// fyra lägen i samma bildruta: (ljus, bloom) = av/av, av/på, på/av, på/på; medelljus och andel bildpunkter som ljusnat
const meas = () => ev(() => { const g = __game, s = g.settings, lum = B => { let t = 0; for (const v of B) t += v; return t / B.length; }; window.__pin = null; const out = {}, im = {};
  for (const [k, l, b] of [['aa', 'off', false], ['ab', 'off', true], ['la', 'on', false], ['lb', 'on', true]]) { s.glLight = l; s.bloom = b; im[k] = g.gl.snap(80, 50); out[k] = +lum(im[k]).toFixed(1); }
  let up = 0; for (let j = 0; j < im.ab.length; j += 3) if ((im.lb[j] + im.lb[j + 1] + im.lb[j + 2] - im.ab[j] - im.ab[j + 1] - im.ab[j + 2]) / 3 > 6) up++;
  s.glLight = 'on'; s.bloom = true; window.__pin = [4.5, 6.5]; const n = g.l29.n();
  return { ...out, kAlla: +(out.lb / Math.max(1, out.aa)).toFixed(3), kLjus: +(out.lb / Math.max(1, out.ab)).toFixed(3), up, lights: n.lights, biome: g.lvl().biome }; });
const res = [];
for (const biome of ['abattoir', 'cathedral', 'purgatory', 'volcano', 'desert', 'courtyard']) {
  await ev(sceneFn, { biome }); await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await until(() => __game.gl.n().used, 2);
  await fire(); await ev(() => { const g = __game, P = g.P; g.explode(P.x + 3, P.y - 1.2, 0, 1.2, false, false); }); await until(null, 0.05);
  const m = await meas(); res.push(m);
  // skärmbilder i samma bildruta: fotoläget (K) fryser tiden och döljer HUD:en; ljuset av och på
  await pg.keyboard.press('KeyK'); await wait(300); await ev(() => { __game.settings.glLight = 'off'; }); await wait(250); await shot(biome + '_ljus_av');
  await ev(() => { __game.settings.glLight = 'on'; }); await wait(250); await shot(biome + '_ljus_pa'); await pg.keyboard.press('KeyK'); await wait(200);
}
console.log('BIOMER', JSON.stringify(res));
ok(res.every(m => m.kAlla <= 1.12 && m.kLjus <= 1.12), 'ljus + bloom tvättar inte ut någon biom: medelljuset högst +12 % (mot båda av och mot bara bloom) ' + JSON.stringify(res.map(m => [m.biome, m.aa, m.lb, m.kAlla, m.kLjus])));
ok(res.every(m => m.lights > 0 && m.up > 30), 'i varje biom ljusnar bilden lokalt kring elden ' + JSON.stringify(res.map(m => [m.biome, m.lights, m.up])));
// dimma och vatten (LUFT och VATTEN på, som spelaren får dem): alla tre på mot alla av, i biomer med markdimma och i ett badhus med vatten
const res2 = [];
for (const biome of ['graveyard', 'harbor', 'swamp', 'ship', 'bathhouse']) {
  await ev(sceneFn, { biome });
  await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await until(() => __game.gl.n().used, 2); await fire();
  const m = await ev(() => { const g = __game, s = g.settings, lum = B => { let t = 0; for (const v of B) t += v; return t / B.length; }; window.__pin = null;
    const set = v => { s.glLight = s.glWater = s.glAir = v; }; set('off'); s.bloom = false; const A = g.gl.snap(80, 50); s.bloom = true; const B = g.gl.snap(80, 50); set('on'); const C = g.gl.snap(80, 50); const n = g.l29.n(); window.__pin = [4.5, 6.5];
    const a = lum(A), b = lum(B), c = lum(C); return { biome: g.lvl().biome, aa: +a.toFixed(1), ab: +b.toFixed(1), alla: +c.toFixed(1), kAlla: +(c / Math.max(1, a)).toFixed(3), kNy: +(c / Math.max(1, b)).toFixed(3), fx: n.fx, wat: n.wat }; });
  res2.push(m); await shot(biome + '_allt_pa');
}
console.log('DIMMA/VATTEN', JSON.stringify(res2));
ok(res2.every(m => m.kAlla <= 1.12 && m.kNy <= 1.12) && res2.filter(m => m.fx && m.fx[2] > 0).length >= 3, 'LJUS + VATTEN + LUFT + BLOOM: medelljuset högst +12 % även med drivande dimma ' + JSON.stringify(res2.map(m => [m.biome, m.aa, m.alla, m.kAlla, m.kNy, m.fx])));
// riktiga våningar: slakteriet och katedralen (seed webgl28, som t164), smällar runt spelaren
const real = [];
await ev(() => { localStorage.removeItem('krypta.run'); clearInterval(window.__hold); window.__pin = null; const g = __game; Object.assign(g.settings, { rendering: 'webgl', glLight: 'on', bloom: true }); g.begin('new'); });
for (const d of [1, 5]) {
  await ev(d => { __game.loadFloor(d); }, d); await until(() => __game.state() === 'play' && __game.levelTime() > 0.5, 8);
  await ev(() => { try { if (window.CardUI && CardUI.isOpen()) CardUI.close(); } catch (e) { /* inget */ } if (__game.state() === 'ui' || __game.state() === 'pause') __game.resume && __game.resume(); });
  await until(() => __game.state() === 'play', 4);
  await ev(() => { const g = __game, P = g.P; P.hp = 1e6; P.iframe = 1e6; for (let k = 0; k < 3; k++) g.explode(P.x + Math.cos(P.a + k - 1) * 2.2, P.y + Math.sin(P.a + k - 1) * 2.2, 0, 1.2, false, k === 1); }); await until(null, 0.08);
  const m = await ev(() => { const g = __game, s = g.settings, lum = B => { let t = 0; for (const v of B) t += v; return t / B.length; }; const P = g.P, keep = [P.x, P.y, P.a];
    s.glLight = 'off'; s.bloom = false; const A = g.gl.snap(80, 50); s.bloom = true; const B = g.gl.snap(80, 50); s.glLight = 'on'; const C = g.gl.snap(80, 50); if (!A || !C) return { cpu: true };
    const a = lum(A), b = lum(B), c = lum(C); return { biome: g.lvl().biome, aa: +a.toFixed(1), ab: +b.toFixed(1), lb: +c.toFixed(1), kAlla: +(c / Math.max(1, a)).toFixed(3), kLjus: +(c / Math.max(1, b)).toFixed(3), lights: g.l29.n().lights }; });
  real.push(m); await shot('riktig_' + d + '_' + (m.biome || 'cpu'));
}
console.log('RIKTIGA', JSON.stringify(real));
ok(real.filter(m => !m.cpu).length === 2 && real.every(m => m.cpu || (m.kAlla <= 1.12 && m.kLjus <= 1.12)), 'riktiga våningar med smällar: medelljuset högst +12 % ' + JSON.stringify(real));
ok(cerr.length === 0 && errs.length === 0, 'inga fel i bildrutorna ' + JSON.stringify(cerr.slice(0, 4)));
await done();
