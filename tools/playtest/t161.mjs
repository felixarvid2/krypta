// t161: version 28 (WEBGL) – bloom och reserv. Med WebGL är dukens bild ungefär CPU-bilden (nedskalad till 80×50, bloom av), BLOOM
// lyser upp kring eld men inte mörka delar, noFlash dämpar och lowfx stänger av. Reserv: en förlorad kontext (WEBGL_lose_context) ger
// CPU-vägen utan sidfel och spelet fortsätter; när kontexten kommer tillbaka ritar WebGL igen. En webbläsare utan WebGL2 ger CPU-vägen
// direkt. Väntan i speltid. Port 9861.
import { setup } from './head.mjs';
const PORT = 9861;
const { pg, ev, wait, ok, shot, done, errs } = await setup(PORT, 'out/t161');
const load = async q => { await pg.goto(`http://localhost:${PORT}/index.html?nolock=1${q || ''}`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 }); };
const sceneFn = o => { const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: false, noFlash: false, reduceMotion: false, rendering: 'webgl', bloom: true });
  const W = 20, H = 13, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[6][4] = 'P'; grid[3][12] = '2'; grid[9][12] = '3';
  g.playCustom({ grid, biome: 'dungeon' }); g.P.hp = 1e6; window.__pin = [4.5, 6.5];
  clearInterval(window.__hold); window.__hold = setInterval(() => { const P = __game.P; P.hp = Math.max(P.hp, 1e5); if (window.__pin) { P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = 0; P.vx = P.vy = 0; } }, 30); };
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 90000) return !cond; await wait(80); } };
const ready = async () => { await ev(sceneFn); await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await until(() => __game.gl.n().used, 2); };
await load(); await ready();
// eld framför spelaren (additiva partiklar som står still)
const fire = () => ev(() => { const g = __game, fx = g.v27b.fx(), L = g.particles(); L.length = 0;
  for (let i = 0; i < 40; i++) L.push({ x: 8.5 + (i % 5) * 0.12, y: 6.3 + ((i / 5) | 0) * 0.06, z: 0.2 + (i % 3) * 0.1, vx: 0, vy: 0, vz: 0, life: 1e4, maxLife: 1e4, img: fx.fire[i % 16], size: 0.5, add: true, tint: [255, 160, 60] }); return L.length; });
// dukens bild (80×50) och CPU-bilden nedskalad lika, i samma bildruta
const grab = o => ev(o => { const g = __game, GL = g.gl; window.__pin = null; Object.assign(g.settings, o || {});
  g.settings.rendering = 'cpu'; g.v28.render(); const c = document.getElementById('screen'), d = c.getContext('2d').getImageData(0, 0, 320, 200).data, A = new Float32Array(80 * 50 * 3);
  for (let y = 0; y < 200; y++) for (let x = 0; x < 320; x++) { const i = (y * 320 + x) * 4, j = ((y >> 2) * 80 + (x >> 2)) * 3; A[j] += d[i] / 16; A[j + 1] += d[i + 1] / 16; A[j + 2] += d[i + 2] / 16; }
  g.settings.rendering = 'webgl'; const B = GL.snap(80, 50); window.__pin = [4.5, 6.5];
  let sum = 0, big = 0, hiA = 0, hiB = 0, darkD = 0, darkN = 0; for (let j = 0; j < 4000; j++) { let dd = 0; for (let k = 0; k < 3; k++) { dd += Math.abs(A[j * 3 + k] - B[j * 3 + k]); } sum += dd / 3; if (dd / 3 > 20) big++;
    const la = A[j * 3] + A[j * 3 + 1] + A[j * 3 + 2], lb = B[j * 3] + B[j * 3 + 1] + B[j * 3 + 2]; hiA += la; hiB += lb; if (la < 60) { darkD += Math.abs(lb - la) / 3; darkN++; } }
  return { mean: +(sum / 4000).toFixed(2), big, gain: +(hiB / Math.max(1, hiA)).toFixed(3), dark: +(darkD / Math.max(1, darkN)).toFixed(2), darkN, bloom: GL.n().bloom, used: GL.n().used }; }, o);
const plain = await grab({ bloom: false });
ok(plain.used && plain.mean < 6 && plain.big < 200, 'WebGL ≈ CPU (nedskalat 80×50, bloom av, utan partiklar) ' + JSON.stringify(plain));
await fire();
const vigOn = await grab({ bloom: true }); await ev(() => { __game.gl.GLR.flags.vig = false; }); // bloom mäts utan vinjetten
const off = await grab({ bloom: false }), on = await grab({ bloom: true });
ok(off.mean < 8, 'med eld och bloom av: WebGL ≈ CPU ' + JSON.stringify(off));
ok(on.bloom > 0.5 && on.gain > off.gain + 0.005 && on.big > 10 && on.mean > off.mean + 0.3, 'BLOOM på: bilden lyser upp kring elden (bara ljuset över tröskeln, så skenet är mindre än före rättningen) ' + JSON.stringify({ off, on }));
await ev(() => { __game.settings.bloom = true; }); await until(null, 0.3); await shot('bloom_pa');
await ev(() => { __game.settings.bloom = false; }); await until(null, 0.3); await shot('bloom_av');
const nf = await grab({ bloom: true, noFlash: true }), lf = await grab({ bloom: true, noFlash: false, lowfx: true });
ok(nf.bloom > 0 && nf.bloom < on.bloom && nf.gain < on.gain, 'noFlash dämpar bloom ' + JSON.stringify(nf));
ok(lf.bloom === 0 && Math.abs(lf.gain - off.gain) < 0.02, 'lowfx stänger av bloom ' + JSON.stringify(lf));
ok(vigOn.gain < on.gain, 'vinjetten gör kanterna mörkare ' + JSON.stringify({ vig: vigOn.gain, utan: on.gain }));
await ev(() => { Object.assign(__game.settings, { lowfx: false, noFlash: false, bloom: true }); __game.gl.GLR.flags.vig = true; });
// ett jämnt, varmt och ljust upplyst rum (som ett gästabud med ljusstakar) tvättas inte ut: bara ljuset över tröskeln glöder (rapport: allt blev gulvitt)
const pr = await ev(() => { const g = __game, GL = g.gl; GL.GLR.flags.vig = false; const run = b => { g.settings.bloom = b; return { wall: GL.probe([217, 178, 115]), spot: GL.probe([40, 30, 25], [255, 230, 160]) }; };
  const off = run(false), on = run(true); GL.GLR.flags.vig = true; g.settings.bloom = true; return { off, on }; });
const dW = pr.on.wall.mid.map((v, i) => v - pr.off.wall.mid[i]), dS = pr.on.spot.near.map((v, i) => v - pr.off.spot.near[i]);
ok(pr.off.wall.mid[0] > 150 && Math.max(...dW) <= 14, 'ljus varm vägg: bloom lägger till högst lite ' + JSON.stringify({ utan: pr.off.wall.mid, med: pr.on.wall.mid }));
ok(Math.max(...dS) >= 3, 'en liten ljus låga i mörker glöder fortfarande ' + JSON.stringify({ utan: pr.off.spot.near, med: pr.on.spot.near, mitt: pr.on.spot.mid }));
// lutning (sidosteg/döden) och skada (aberration) ger inga fel
await ev(() => { __game.P.roll = 0.2; __game.P.hurt = 0.5; }); await until(null, 0.2); await shot('lutning');
const rl = await ev(() => { const g = __game; window.__pin = null; const P = g.P; P.roll = 0.2; const A = g.gl.snap(80, 50); P.roll = 0; const B = g.gl.snap(80, 50); window.__pin = [4.5, 6.5];
  let d = 0; for (let i = 0; i < A.length; i++) d += Math.abs(A[i] - B[i]); return { used: g.gl.n().used, diff: +(d / A.length).toFixed(2) }; });
ok(rl.used && rl.diff > 2, 'lutningen görs i shadern (bilden vrids) ' + JSON.stringify(rl));
// lutningen mot CPU-vägens ctx.rotate/scale (nedskalat 80×50, bloom och vinjett av): samma riktning och skala
const rc = await ev(() => { const g = __game, GL = g.gl, P = g.P; window.__pin = null; g.particles().length = 0; g.settings.bloom = false; P.hurt = 0; const out = {};
  for (const r of [0.2, -0.12]) { P.roll = r; g.settings.rendering = 'cpu'; g.v28.render(); const d = document.getElementById('screen').getContext('2d').getImageData(0, 0, 320, 200).data, A = new Float32Array(12000);
    for (let y = 0; y < 200; y++) for (let x = 0; x < 320; x++) { const i = (y * 320 + x) * 4, j = ((y >> 2) * 80 + (x >> 2)) * 3; for (let k = 0; k < 3; k++) A[j + k] += d[i + k] / 16; }
    g.settings.rendering = 'webgl'; P.roll = r; const B = GL.snap(80, 50); let s = 0; for (let j = 0; j < A.length; j++) s += Math.abs(A[j] - B[j]); out[r] = +(s / A.length).toFixed(2); }
  P.roll = 0; g.settings.bloom = true; window.__pin = [4.5, 6.5]; return out; });
ok(Object.values(rc).every(v => v < 6), 'lutningen i shadern ≈ CPU-vägens vridning (medelavvikelse per färgkanal) ' + JSON.stringify(rc));
// reserv: förlorad kontext
const before = await ev(() => ({ n: __game.gl.n(), t: __game.v27b.t() }));
const lost = await ev(() => __game.gl.lose()); await until(null, 0.6);
const after = await ev(() => ({ n: __game.gl.n(), t: __game.v27b.t(), bg: document.getElementById('screen').style.background, disp: document.getElementById('glscreen').style.display, st: __game.state() }));
ok(lost && after.n.failed && !after.n.used && !after.n.shown && after.disp === 'none' && after.bg === '' && after.n.cpu > before.n.cpu && after.t > before.t + 0.4 && after.st === 'play', 'förlorad kontext: CPU-vägen, spelet fortsätter ' + JSON.stringify({ before: before.n.frames, after }));
await shot('reserv_cpu');
const hashCpu = await ev(() => { const c = document.getElementById('screen'), d = c.getContext('2d').getImageData(0, 0, 320, 200).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s; });
ok(hashCpu > 320 * 200 * 20, '2D-duken har bilden igen (inte genomskinlig) ' + hashCpu);
await ev(() => __game.gl.restore()); await until(() => __game.gl.n().used, 3);
const back = await ev(() => __game.gl.n());
ok(back.used && back.shown && !back.failed && back.lost >= 1, 'kontexten tillbaka: WebGL ritar igen ' + JSON.stringify(back));
// ingen WebGL2 alls (getContext ger null): CPU direkt, inga fel
await load(); await ev(() => { const gc = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, o) { return t === 'webgl2' ? null : gc.call(this, t, o); }; });
await ready().catch(() => {}); await until(null, 0.5);
const nog = await ev(() => ({ n: __game.gl.n(), st: __game.state(), t: __game.v27b.t() }));
ok(nog.n.failed && nog.n.reason === 'INGEN WEBGL2' && !nog.n.used && nog.st === 'play', 'utan WebGL2: CPU-vägen med en gång ' + JSON.stringify(nog));
ok(errs.length === 0, 'inga sidfel ' + errs.join(' / '));
await done();
