// t180: version 29 (VÄRLD) – paritet per biom. För varje biom i bangeneratorn (Gen.floor med { biome }): en riktig våning, spelaren på en
// öppen plats (utomhus under himlen) med lång utsikt, pausad (inget rör sig). Samma bildruta med RENDERING WEBGL ritas med VÄRLD CPU och
// med VÄRLD GRAFIKKORT (UPPLÖSNING 1×, 2× och 3×); scenens bild före bloom (F.post, alla delpunkter) nedskalad till 160×100 jämförs.
// Krav: medelavvikelsen per kanal och andelen bildpunkter som skiljer mycket (> 24 i någon kanal) är små. 1× jämförs också i 320×200
// (exakt samma rutnät som CPU:n): nästan alla bildpunkter lika. Upp/ned-blicken mäts i några biomer. Skriver out/t180/res.json och
// skärmbilder (CPU och GRAFIKKORT 2×) per biom. T180_BIOMES=a,b begränsar. Väntan i speltid. Port 9880.
import { setup } from './head.mjs';
import fs from 'fs';
const PORT = 9880, PFX = process.env.T180_VW ? 's' + process.env.T180_VW + '_' : '';
const { pg, ev, wait, ok, shot, done, errs } = await setup(PORT, 'out/t180');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon|404/.test(m.text())) cerr.push(m.text().slice(0, 160)); });
if (process.env.T180_VW) { const [w, h] = process.env.T180_VW.split('x').map(Number); await pg.setViewportSize({ width: w, height: h }); } // T180_VW=1280x800: scenens skala S = 4
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 90000) return !cond; await wait(80); } };
await ev(() => { localStorage.removeItem('krypta.run'); const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: false, noFlash: true, reduceMotion: true, rendering: 'webgl', bloom: false, glLight: 'off', glWater: 'off', glAir: 'off', glWorld: 'cpu', glRes: 1, mouseLook: true }); g.begin('new'); });
await wait(1500); await pg.keyboard.press('Escape'); await wait(500);
const ALL = await ev(() => __game.gfxW.biomes());
const only = (process.env.T180_BIOMES || '').split(',').filter(Boolean), BIOMES = only.length ? only : ALL;
const visit = (biome, seed) => ev(([biome, seed]) => { const g = __game, d = biome === 'purgatory' || biome === 'battlefield' ? 5 : 3, L = Gen.floor(seed, d, { biome }); g.run().depth = d; g.startLevel(L); return g.lvl().biome; }, [biome, seed]);
const place = () => ev(() => { // öppen ruta med längst utsikt (utomhus: under himlen), blicken längs den längsta strålen
  const g = __game, L = g.lvl(), M = L.map, sky = L.sky; for (const e of g.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } g.P.hp = 1e6;
  const ray = (x, y, a) => { for (let d = 0.3; d < 14; d += 0.2) if (g.solid(x + Math.cos(a) * d, y + Math.sin(a) * d)) return d; return 14; };
  let bs = -1, pos = null, ang = 0; for (let y = 1; y < M.length - 1; y++) for (let x = 1; x < M[0].length - 1; x++) { if (g.solid(x + 0.5, y + 0.5) || /[ŃĐ]/.test(M[y][x])) continue; if (sky && sky[y][x] !== '1' && L.sky.some(r => r.includes('1'))) continue;
    let r = 0, ba = 0, bd = 0; for (let k = 0; k < 8; k++) { const d = ray(x + 0.5, y + 0.5, k * Math.PI / 4); r += d; if (d > bd) { bd = d; ba = k * Math.PI / 4; } } if (r > bs) { bs = r; pos = [x + 0.5, y + 0.5]; ang = ba + 0.2; } }
  if (pos) { g.P.x = pos[0]; g.P.y = pos[1]; } g.P.a = ang; g.P.look = 0; g.P.pitch = 0; g.P.roll = 0; return { pos, ang: +ang.toFixed(2), outdoor: !!L.sky }; });
const cmp = o => ev(o => { const g = __game, s = g.settings, P = g.P; P.look = o.look || 0; P.roll = 0; g.particles().length = 0;
  s.glWorld = 'cpu'; g.v28.render(); g.v28.render(); const A = g.w29.grab(), A3 = g.gl.post(), cpuUsed = g.gl.n().used;
  const out = { cpuUsed, res: {} };
  for (const r of o.res) { s.glWorld = 'gpu'; s.glRes = r; g.v28.render(); g.v28.render(); const n = g.w29.n(), B = g.w29.grab(); let sum = 0, big = 0, mx = 0;
    for (let j = 0; j < A.length; j += 3) { let d = 0; for (let k = 0; k < 3; k++) { const e = Math.abs(A[j + k] - B[j + k]); sum += e; d = Math.max(d, e); } if (d > 24) big++; mx = Math.max(mx, d); }
    const bl = X => { const Y = new Float32Array(X.length); for (let y = 0; y < 100; y++) for (let x = 0; x < 160; x++) for (let k = 0; k < 3; k++) { let s2 = 0, c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy < 0 || yy > 99 || xx < 0 || xx > 159) continue; s2 += X[(yy * 160 + xx) * 3 + k]; c++; } Y[(y * 160 + x) * 3 + k] = s2 / c; } return Y; };
    const Ab = bl(A), Bb = bl(B); let sb = 0, bb = 0; for (let j = 0; j < Ab.length; j += 3) { let d = 0; for (let k = 0; k < 3; k++) { const e = Math.abs(Ab[j + k] - Bb[j + k]); sb += e; d = Math.max(d, e); } if (d > 16) bb++; }
    const q = { R: n.R, S: n.S, on: n.frameOn, used: g.gl.n().used, mean: +(sum / A.length).toFixed(2), big: +(big / (A.length / 3)).toFixed(4), max: +mx.toFixed(0), meanLp: +(sb / Ab.length).toFixed(2), bigLp: +(bb / (Ab.length / 3)).toFixed(4) };
    { const B3 = g.gl.post(); let eq = 0, s3 = 0; for (let i = 0; i < A3.length; i += 4) { let d = 0; for (let k = 0; k < 3; k++) { const e = Math.abs(A3[i + k] - B3[i + k]); d = Math.max(d, e); s3 += e; } if (d <= 2) eq++; } q.eq320 = +(eq / (A3.length / 4)).toFixed(4); q.mean320 = +(s3 / (A3.length * 0.75)).toFixed(2); }
    out.res[r] = q; }
  s.glWorld = 'cpu'; s.glRes = 1; P.look = 0; return out; }, o);
const res = {}; let i = 0;
for (const b of BIOMES) {
  const lb = await visit(b, 4100 + (i++) * 17); if (lb !== b) { console.log('SKIP ', b, 'bangeneratorn gav', lb); continue; }
  await until(() => __game.banner() <= 0, 4); await until(null, 0.3);
  const pl = await place(); await ev(() => { const s = __game.settings; s.glWorld = 'gpu'; s.glRes = 2; }); await until(null, 1.5); // grafikkortets värld i 1,5 s spel först (atlasen fylls; vågor och fanan skrivs om)
  await ev(() => __game.pause());
  const RES = process.env.T180_VW ? [1, 2, 3, 'auto'] : [1, 2, 3], r = await cmp({ res: RES }); r.place = pl; r.floors = await ev(() => __game.w29.n().floors);
  if (['dungeon', 'forest', 'desert', 'prison'].includes(b)) { r.upp = (await cmp({ res: [2], look: 0.35 })).res[2]; r.ned = (await cmp({ res: [2], look: -0.4 })).res[2]; }
  res[b] = r; console.log(b, JSON.stringify(r));
  for (const [k, w, r] of [['cpu', 'cpu', 1], ['gpu1', 'gpu', 1], ['gpu2', 'gpu', 2], ['gpu3', 'gpu', 3], ['gpuauto', 'gpu', 'auto']]) { if (k === 'gpuauto' && !PFX) continue; if (k === 'gpu1' && !process.env.T180_ALL) continue;
    const u = await ev(([w, r]) => { const s = __game.settings; s.glWorld = w; s.glRes = r; __game.v28.render(); __game.v28.render(); return __game.w29.png(); }, [w, r]);
    fs.writeFileSync(`out/t180/${PFX}${b}_${k}.png`, Buffer.from(u.split(',')[1], 'base64')); }
  await ev(() => { __game.settings.glWorld = 'cpu'; __game.resume(); });
}
fs.writeFileSync('out/t180/' + PFX + 'res.json', JSON.stringify(res, null, 1));
const bad = [], lim = { mean: 2.5, big: 0.03 };
// 1×: samma rutnät som CPU:n, jämförs direkt i 160×100. 2× och 3× samplar texturerna tätare (skarpare golv långt bort, annan vikning i
// högkontrastmönster som lavagolv): jämförs i 160×100 efter en 3×3-medelvärdesfiltrering (lågpass) av båda bilderna.
// 3× i högkontrastgolv (kryptans lava, klocktornet, gjuteriet): CPU-bilden viker (aliasing) där grafikkortet ritar texlarna skarpt, så
// gränsen är vidare (medel ≤ 3, stora ≤ 5 %); biomerna som går över 2× gräns listas.
const limLp = { mean: 2.5, big: 0.02 }, lim3 = { mean: 3, big: 0.05 }, over = [];
for (const [b, r] of Object.entries(res)) for (const [k, q] of Object.entries({ ...r.res, ...(r.upp ? { upp: r.upp, ned: r.ned } : {}) })) {
  const L = k === '3' || k === 'auto' ? lim3 : limLp, fail = !q.on || !q.used || (k === '1' ? q.mean > lim.mean || q.big > lim.big : q.meanLp > L.mean || q.bigLp > L.big); if (fail) bad.push(b + ':' + k + ' ' + JSON.stringify(q));
  if (k === '3' && (q.meanLp > limLp.mean || q.bigLp > limLp.big)) over.push(b + ' ' + q.meanLp + '/' + q.bigLp); }
ok(Object.keys(res).length >= Math.min(BIOMES.length, 30) && bad.length === 0, `paritet CPU ↔ GRAFIKKORT i ${Object.keys(res).length} biomer (160×100; 1×: medel ≤ ${lim.mean}, stora ≤ ${lim.big * 100} %; 2× lågpass: medel ≤ ${limLp.mean}, stora ≤ ${limLp.big * 100} %; 3× lågpass: ≤ ${lim3.mean} / ${lim3.big * 100} %) ` + (bad.length ? 'SKILJER: ' + bad.join(' | ') : '') + (over.length ? ' (3× över 2×-gränsen, vikning i CPU-bilden: ' + over.join(', ') + ')' : ''));
// rutnätspunkterna: i varje R×-block är det övre vänstra provet exakt CPU:ns provpunkt (heltalen); gl.post() läser just det provet
const r1 = []; for (const [b, r] of Object.entries(res)) for (const [k, q] of Object.entries(r.res)) if (!(q.eq320 >= 0.97)) r1.push(b + ':' + k + ' ' + q.eq320);
ok(r1.length === 0, '1×, 2× och 3×: i CPU:ns provpunkter (320×200) minst 97 % av bildpunkterna lika ' + r1.join(', '));
ok(cerr.length === 0 && errs.length === 0, 'inga fel ' + JSON.stringify(cerr.slice(0, 4)));
await done();
