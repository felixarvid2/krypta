// t177: version 29 (LJUS) – grafikkortet ritar även i pausen, fotoläget och simningen (bloom och vinjett försvinner inte där).
// Pausen: oskärpan görs i shadern (bilden blir mjukare), utan v29-lägena (flags.modes av) CPU-vägen som i v28. Fotoläget: filtren
// (svartvit, sepia, nattseende) görs i shadern och 2D-duken får ingen grå hinna. Simningen (VATTEN PÅ): vågor som rör sig, blågrön
// ton och kaustik; VATTEN AV ger CPU-vägens remsor som förut; lowfx tar bort vågorna. Väntan i speltid. Port 9877.
import { setup } from './head.mjs';
const PORT = 9877;
const { pg, ev, wait, ok, shot, done, errs } = await setup(PORT, 'out/t177');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) cerr.push(m.text().slice(0, 160)); });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const sceneFn = o => { const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: false, noFlash: false, reduceMotion: true, rendering: 'webgl', bloom: true, glLight: 'on', glWater: 'on', photoFilter: 0 });
  const W = 20, H = 13, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  for (let y = 4; y <= 8; y++) for (let x = 6; x <= 9; x++) grid[y][x] = 'Đ'; // djupt vatten
  grid[6][4] = 'P'; grid[3][12] = '2'; grid[9][12] = '3';
  g.playCustom({ grid, biome: o.biome || 'courtyard' }); g.P.hp = 1e6; window.__pin = [4.5, 6.5];
  clearInterval(window.__hold); window.__hold = setInterval(() => { const P = __game.P; P.hp = Math.max(P.hp, 1e5); P.air = 99; if (window.__pin) { P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = 0; P.vx = P.vy = 0; } }, 30); };
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 90000) return !cond; await wait(80); } };
await ev(sceneFn, {}); await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await until(() => __game.gl.n().used, 2);
const sharp = B => { let s = 0; for (let y = 0; y < 50; y++) for (let x = 1; x < 80; x++) for (let k = 0; k < 3; k++) s += Math.abs(B[(y * 80 + x) * 3 + k] - B[(y * 80 + x - 1) * 3 + k]); return s / (50 * 79 * 3); };
// 1) pausen
const pzA = await ev(() => __game.gl.snap(80, 50));
await ev(() => __game.pause()); await wait(400); // pausen: speltiden står still
const pz = await ev(() => { const g = __game, F = g.gl.GLR.flags; const B = g.gl.snap(80, 50), n = g.gl.n(), l = g.l29.n(); F.modes = false; g.v28.render(); const c = g.gl.n(); F.modes = true; g.v28.render();
  const st = g.state(); return { B, used: n.used, pause: l.pause, fin: l.finFrames, cpuUtan: !c.used, st }; });
ok(pz.st === 'pause' && pz.used && pz.pause > 0 && pz.cpuUtan, 'pausen ritas av grafikkortet (utan v29-lägena: CPU som i v28) ' + JSON.stringify({ used: pz.used, pause: pz.pause, cpuUtan: pz.cpuUtan }));
ok(pz.B && sharp(pz.B) < sharp(pzA) * 0.9, 'pausens oskärpa i shadern: bilden blir mjukare ' + JSON.stringify({ spel: +sharp(pzA).toFixed(2), paus: +sharp(pz.B).toFixed(2) }));
await shot('paus_webgl');
await ev(() => { __game.gl.GLR.flags.modes = false; }); await wait(300); await shot('paus_cpu'); await ev(() => { __game.gl.GLR.flags.modes = true; });
await ev(() => __game.resume()); await until(() => __game.state() === 'play', 2); await until(null, 0.3);
// 2) fotoläget: K, svartvit i shadern, ingen grå hinna på 2D-duken
await pg.keyboard.press('KeyK'); await wait(400); // fotoläget: speltiden står still
const ph = await ev(() => { const g = __game; g.settings.photoFilter = 1; const B = g.gl.snap(80, 50), n = g.gl.n(), l = g.l29.n(); let sp = 0; for (let j = 0; j < B.length; j += 3) sp += Math.max(B[j], B[j + 1], B[j + 2]) - Math.min(B[j], B[j + 1], B[j + 2]);
  g.settings.photoFilter = 2; const S = g.gl.snap(80, 50); let warm = 0, lu = 0; for (let j = 0; j < S.length; j += 3) { warm += S[j] - S[j + 2]; lu += S[j] + S[j + 1] + S[j + 2]; }
  g.settings.photoFilter = 0; const C = g.gl.snap(80, 50); let sp0 = 0; for (let j = 0; j < C.length; j += 3) sp0 += Math.max(C[j], C[j + 1], C[j + 2]) - Math.min(C[j], C[j + 1], C[j + 2]);
  g.settings.photoFilter = 1; g.v28.render(); const d = document.getElementById('screen').getContext('2d').getImageData(160, 100, 1, 1).data;
  return { used: n.used, photo: l.photo, sv: +(sp / 4000).toFixed(2), utan: +(sp0 / 4000).toFixed(2), sepiaVarm: +(warm / 4000).toFixed(1), lum: +(lu / 12000).toFixed(1), alfa: d[3] }; });
ok(ph.used && ph.photo > 0, 'fotoläget ritas av grafikkortet ' + JSON.stringify(ph));
ok(ph.sv < 1.5 && ph.utan > 4 && ph.sepiaVarm > 5 && ph.alfa === 0, 'fotofilter i shadern: svartvit utan färg, sepia varm, ingen grå hinna på 2D-duken ' + JSON.stringify(ph));
await shot('foto_svartvit'); await ev(() => { __game.settings.photoFilter = 3; }); await wait(300); await shot('foto_nattseende');
await ev(() => { __game.settings.photoFilter = 0; }); await pg.keyboard.press('KeyK'); await until(null, 0.3);
// 3) simningen: in i det djupa vattnet
await ev(() => { window.__pin = [7.5, 6.5]; }); await until(() => __game.P.swim, 3); await until(null, 1.2);
const sw = await ev(() => { const g = __game; g.settings.reduceMotion = false; const A = g.gl.snap(80, 50), n = g.gl.n(), l = g.l29.n(); return { A, used: n.used, swim: l.swim, P: g.P.swim }; });
await until(null, 0.5);
const sw2 = await ev(() => { const g = __game; const B = g.gl.snap(80, 50); g.settings.lowfx = true; const C = g.gl.snap(80, 50), lf = g.gl.n().used; g.settings.lowfx = false; return { B, C, lf }; });
let mv = 0, bA = 0, bC = 0; for (let j = 0; j < sw.A.length; j += 3) { mv += Math.abs(sw.A[j] - sw2.B[j]) + Math.abs(sw.A[j + 1] - sw2.B[j + 1]) + Math.abs(sw.A[j + 2] - sw2.B[j + 2]); bA += (sw2.B[j + 1] + sw2.B[j + 2]) / 2 - sw2.B[j]; bC += (sw2.C[j + 1] + sw2.C[j + 2]) / 2 - sw2.C[j]; }
ok(sw.P && sw.used && sw.swim > 0, 'simningen ritas av grafikkortet (VATTEN PÅ) ' + JSON.stringify({ P: sw.P, used: sw.used, swim: sw.swim }));
ok(mv / sw.A.length > 0.8 && bA / 4000 > bC / 4000 + 6 && sw2.lf, 'under ytan: vågor som rör sig och blågrön ton; lowfx tar bort dem ' + JSON.stringify({ rorelse: +(mv / sw.A.length).toFixed(2), blagron: +(bA / 4000).toFixed(1), lowfx: +(bC / 4000).toFixed(1) }));
await shot('simning_webgl');
const cpuSw = await ev(() => { const g = __game; g.settings.glWater = 'off'; g.v28.render(); const a = g.gl.n().used; return { used: a }; }); await until(null, 0.3); await shot('simning_cpu');
ok(!cpuSw.used, 'VATTEN AV: simningen går CPU-vägen som förut ' + JSON.stringify(cpuSw));
await ev(() => { __game.settings.glWater = 'on'; window.__pin = [4.5, 6.5]; }); await until(() => !__game.P.swim, 3);
ok(cerr.length === 0 && errs.length === 0, 'inga fel i bildrutorna ' + JSON.stringify(cerr.slice(0, 4)));
await done();
