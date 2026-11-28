// t183: version 29 (VÄRLD) – paritet med det som ligger ovanpå eller i världen: kulhål, blod på väggen (v27-stänk), sot, spindelväv,
// takblod (v28), blodpölar och fotspår (dekaler), MÖRKER, ficklampan, galler, fönster och glas, en öppen och en stängd dörr, vatten
// (vågorna skrivs om på plats), upp/ned-blicken och himlen (måne, moln, blixt, blodmåne och stjärnfall i skogen). Per fall: effekten (CPU med mot CPU utan) är stor där den syns, och skillnaden
// GRAFIKKORT mot CPU (med effekten) är en liten del av den, i 1× (320×200) och 2× (160×100). Väntan i speltid. Port 9883.
import { setup } from './head.mjs';
import fs from 'fs';
const PORT = 9883;
const { pg, ev, wait, ok, shot, done, errs } = await setup(PORT, 'out/t183');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon|404/.test(m.text())) cerr.push(m.text().slice(0, 160)); });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 90000) return !cond; await wait(80); } };
const sceneFn = () => { const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: false, noFlash: true, reduceMotion: true, rendering: 'webgl', bloom: false, glLight: 'off', glWater: 'off', glAir: 'off', glWorld: 'cpu', glRes: 1, blood: 2, mouseLook: true });
  const W = 20, H = 13, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  for (let y = 1; y < H - 1; y++) grid[y][10] = '1'; grid[3][10] = 'ǂ'; grid[4][10] = 'ǁ'; grid[9][10] = 'D'; grid[10][10] = 'Ɉ'; for (const [x, y] of [[7, 8], [8, 8], [7, 9], [8, 9]]) grid[y][x] = '-';
  grid[6][3] = 'P'; g.playCustom({ grid, biome: 'dungeon' }); g.P.hp = 1e6; window.__pin = [6.5, 6.5, 0];
  clearInterval(window.__hold); window.__hold = setInterval(() => { const P = __game.P; P.hp = 1e6; if (window.__pin) { P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = window.__pin[2]; P.vx = P.vy = 0; } }, 30); };
await ev(sceneFn); await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await until(() => __game.gl.n().used, 3); await until(null, 0.5);
// bilderna i samma bildruta: CPU-världen (320×200 och 160×100) och grafikkortets (1× och 2×)
const snap = look => ev(look => { const g = __game, s = g.settings; g.P.look = look || 0; g.particles().length = 0; s.glWorld = 'cpu'; g.v28.render(); const A = g.gl.post(), A2 = g.w29.grab();
  s.glWorld = 'gpu'; s.glRes = 1; g.v28.render(); const B = g.gl.post(), on1 = g.w29.n().frameOn; s.glRes = 2; g.v28.render(); const B2 = g.w29.grab(), on2 = g.w29.n().frameOn && g.w29.n().R === 2; s.glWorld = 'cpu';
  const q = X => Array.from({ length: X.length / 4 }, (_, i) => [X[i * 4], X[i * 4 + 1], X[i * 4 + 2]]).flat(); return { A: q(A), B: q(B), A2, B2, on: on1 && on2 }; }, look);
const cmp = (X0, X1, Y1) => { let n = 0, e = 0, r = 0; for (let j = 0; j < X0.length; j += 3) { let d = 0, dr = 0; for (let k = 0; k < 3; k++) { d += Math.abs(X1[j + k] - X0[j + k]); dr += Math.abs(Y1[j + k] - X1[j + k]); } if (d / 3 > 12) { n++; e += d / 3; r += dr / 3; } }
  return { n, eff: n ? +(e / n).toFixed(1) : 0, res: n ? +(r / n).toFixed(1) : 0 }; };
const FALL = [
  ['kulhål', () => __game.w29.mark('hole', 10)], ['blod (v27)', () => __game.w29.mark('v27', 6)], ['sot', () => __game.w29.mark('scorch', 4)], ['spindelväv', () => __game.w29.mark('web', 3)],
  ['takblod', () => { const g = __game; let k = 0; for (const [x, y] of [[7, 6], [8, 5], [8, 7], [9, 6]]) if (g.v28.stain(x + 0.5, y + 0.5) >= 0) k++; return k; }],
  ['blodpölar', () => { const g = __game; let k = 0; for (const [x, y] of [[8.2, 6.4], [8.8, 5.7], [9.3, 6.9]]) if (g.w29.decal('blood_pool', x, y)) k++; return k; }],
  ['fotspår', () => { const g = __game; let k = 0; for (let i = 0; i < 6; i++) if (g.w29.decal('footprint', 7.4 + i * 0.3, 6.2 + (i % 2) * 0.25)) k++; return k; }],
  ['dörr öppen', () => { const d = __game.doors()['10,9']; if (!d) return 0; d.open = 1; return 1; }, { a: 0.55 }],
  ['MÖRKER', () => { __game.run().cmode = 'dark'; return 1; }],
  ['ficklampan i mörkret', () => { const g = __game, P = g.P; g.run().cmode = 'dark'; P.lamp = true; P.battery = 100; P.lampFlick = 0; return 1; }, { pre: () => { __game.run().cmode = 'dark'; } }],
  ['galler, fönster och glas', null, { a: -0.45 }], ['lowfx (galler, glas, takblod)', null, { a: -0.45, pre: () => { const g = __game; g.settings.lowfx = true; for (const [x, y] of [[7, 5], [8, 4], [6, 4]]) g.v28.stain(x + 0.5, y + 0.5); } }], ['vatten', null, { a: 0.6, wait: 1.2 }], ['upp', null, { look: 0.4 }], ['ned', null, { look: -0.45 }],
];
const res = {}, bad = [];
for (const [name, fn, o = {}] of FALL) {
  await ev(sceneFn); await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await until(() => __game.gl.n().used, 3);
  await ev(a => { window.__pin[2] = a; __game.decals && 0; }, o.a || 0); if (o.pre) await ev(o.pre); await until(null, 0.4);
  if (!fn) { await until(null, o.wait || 0.1); const s = await snap(o.look); const c1 = cmp(s.B.map(() => 0), s.A, s.B), c2 = cmp(s.B2.map(() => 0), s.A2, s.B2); // hela bilden: grafikkortet mot CPU:n
    let d1 = 0, d2 = 0; for (let j = 0; j < s.A.length; j++) d1 += Math.abs(s.A[j] - s.B[j]); for (let j = 0; j < s.A2.length; j++) d2 += Math.abs(s.A2[j] - s.B2[j]);
    const r = res[name] = { on: s.on, mean1: +(d1 / s.A.length).toFixed(2), mean2: +(d2 / s.A2.length).toFixed(2) }; console.log(name, JSON.stringify(r));
    if (!r.on || r.mean1 > 1 || r.mean2 > 3) bad.push(name + ' ' + JSON.stringify(r)); await shot(name.replace(/[^a-zåäö]/gi, '_')); continue; }
  const s0 = await snap(o.look); const k = await ev(fn); await until(null, 0.4); const s1 = await snap(o.look);
  const c1 = cmp(s0.A, s1.A, s1.B), c2 = cmp(s0.A2, s1.A2, s1.B2), r = res[name] = { k, on: s1.on, '1×': c1, '2×': c2 }; console.log(name, JSON.stringify(r));
  if (!k || !s1.on || c1.n < 20 || c1.res > c1.eff * 0.1 || c2.res > c2.eff * 0.35) bad.push(name + ' ' + JSON.stringify(r));
  await ev(() => { __game.settings.glWorld = 'gpu'; __game.settings.glRes = 2; }); await until(null, 0.2); await shot(name.replace(/[^a-zåäö]/gi, '_')); await ev(() => { __game.settings.glWorld = 'cpu'; __game.run().cmode = ''; __game.P.lamp = false; });
}
// himlen: skogen (natthimmel med måne, moln och stjärnfall) under öppen himmel, mot månen (P.a = 0.9), rakt fram och uppåt; blixt och blodmåne
const sk0 = await ev(() => { const g = __game; g.settings.noFlash = false; const L = Gen.floor(5101, 3, { biome: 'forest' }); g.run().depth = 3; g.startLevel(L); const M = L.map, S = L.sky; let pos = null, bs = -1;
  for (let y = 2; y < M.length - 2; y++) for (let x = 2; x < M[0].length - 2; x++) { if (!S || S[y][x] !== '1' || g.solid(x + 0.5, y + 0.5)) continue; let n = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (S[y + dy] && S[y + dy][x + dx] === '1') n++; if (n > bs) { bs = n; pos = [x + 0.5, y + 0.5]; } }
  for (const e of g.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } window.__pin = [pos[0], pos[1], 0.9]; return { pos, biome: g.lvl().biome, sky: !!L.sky }; });
await until(() => __game.banner() <= 0, 4); await until(null, 1.5);
const skyCmp = st => ev(st => { const g = __game, s = g.settings, P = g.P; g.particles().length = 0; P.look = st.look || 0; const sv = g.w29.sky(st.sky || {});
  s.glWorld = 'cpu'; g.v28.render(); const A = g.gl.post(); s.glWorld = 'gpu'; s.glRes = 1; g.v28.render(); const B = g.gl.post(), on = g.w29.n().frameOn; s.glWorld = 'cpu';
  g.w29.sky({ blood: false, star: null, lightning: 0 }); P.look = 0; let eq = 0, sum = 0, lum = 0; for (let i = 0; i < A.length; i += 4) { let d = 0; for (let k = 0; k < 3; k++) { const e = Math.abs(A[i + k] - B[i + k]); d = Math.max(d, e); sum += e; } if (d <= 2) eq++; lum += A[i] + A[i + 1] + A[i + 2]; }
  return { on, sv, eq: +(eq / (A.length / 4)).toFixed(4), mean: +(sum / (A.length * 0.75)).toFixed(2), lum: +(lum / (A.length * 0.75)).toFixed(1), A: Array.from(A) }; }, st);
const SKY = { natt: {}, natt_upp: { look: 0.35 }, blixt: { look: 0.35, sky: { lightning: 1 } }, blodmane: { look: 0.35, sky: { blood: true } }, stjarnfall: { look: 0.35, sky: { star: { a: 0.75, y: 20, t: 0.4 } } } };
const sr = {}; for (const [k, st] of Object.entries(SKY)) sr[k] = await skyCmp(st);
const dif = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 30) n++; return n; };
const eff = { blixt: +(sr.blixt.lum - sr.natt_upp.lum).toFixed(1), blodmane: dif(sr.blodmane.A, sr.natt_upp.A), stjarnfall: dif(sr.stjarnfall.A, sr.natt_upp.A) };
for (const k in sr) delete sr[k].A; res.himlen = { ...sk0, sr, eff }; console.log('himlen', JSON.stringify(res.himlen));
ok(sk0.sky && Object.values(sr).every(r => r.on && r.eq >= 0.97 && r.mean < 1) && eff.blixt > 5 && eff.blodmane > 20 && eff.stjarnfall > 2, 'himlen i grafikkortet (1×): natthimmel, måne, moln, blixt, blodmåne och stjärnfall som CPU:n ' + JSON.stringify(res.himlen));
await ev(() => __game.settings.glWorld = 'gpu'); await ev(() => { __game.P.look = 0.35; }); await until(null, 0.3); await shot('himlen_grafikkort'); await ev(() => { __game.P.look = 0; __game.settings.glWorld = 'cpu'; });
fs.writeFileSync('out/t183/res.json', JSON.stringify(res, null, 1));
ok(bad.length === 0, 'paritet med märken, takblod, dekaler, MÖRKER, ficklampa, galler/fönster/glas, dörrar, vatten och upp/ned-blicken ' + (bad.length ? 'SKILJER: ' + bad.join(' | ') : JSON.stringify(Object.keys(res))));
ok(cerr.length === 0 && errs.length === 0, 'inga fel ' + JSON.stringify(cerr.slice(0, 4)));
await done();
