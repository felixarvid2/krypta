// t181: version 29 (VÄRLD) – inställningarna, reserven och strålkastningen. BILD: VÄRLD (CPU / GRAFIKKORT) och UPPLÖSNING (AUTO, 1×–3×)
// finns bara med WebGL, VÄRLD är CPU som standard (och då ritar CPU:n världen precis som förut). Mellankolumnernas strålkastning ger
// samma träff som v28Cast (galler, fönster, glas och dörrar) och sparar inget (lager, karta, räknare). Reserv: ett världsprogram som
// inte byggs ger CPU-världen (WebGL ritar vidare), ett fel i passet ger CPU-världen i samma bildruta, en förlorad kontext ger CPU-vägen
// och sedan grafikkortets värld igen. AUTO: dator 3× (högst scenens skala), telefon 2× bara när bildrutorna hinner. Port 9881.
import { setup } from './head.mjs';
const PORT = 9881;
const { pg, ev, wait, ok, shot, done, errs } = await setup(PORT, 'out/t181');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon|404/.test(m.text())) cerr.push(m.text().slice(0, 160)); });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 90000) return !cond; await wait(80); } };
const rows = () => ev(() => { const r = {}; for (const el of document.querySelectorAll('.cu-row')) { const lab = el.querySelector('span'), inp = el.querySelector('select,input'); if (lab && inp) r[lab.textContent.trim()] = inp.type === 'checkbox' ? inp.checked : inp.value; } return r; });
// 1) inställningarna: AUTO under webdriver = CPU-rendering, då finns inte VÄRLD; med WEBGL finns VÄRLD (CPU) och UPPLÖSNING (AUTO)
await ev(() => document.getElementById('settingsbtn').click()); await wait(600); const r0 = await rows(); await pg.keyboard.press('Escape'); await wait(300);
await ev(() => { __game.settings.rendering = 'webgl'; }); await ev(() => document.getElementById('settingsbtn').click()); await wait(600); const r1 = await rows();
const opt = await ev(() => { const o = {}; for (const el of document.querySelectorAll('.cu-row')) { const lab = el.querySelector('span'); if (lab && (lab.textContent.trim() === 'VÄRLD' || lab.textContent.trim() === 'UPPLÖSNING')) o[lab.textContent.trim()] = Array.from(el.querySelectorAll('option')).map(x => x.textContent); } return o; });
await shot('installningar'); await pg.keyboard.press('Escape'); await wait(300);
ok(!('VÄRLD' in r0) && r1.VÄRLD === 'cpu' && r1.UPPLÖSNING === 'auto' && JSON.stringify(opt.VÄRLD) === '["CPU","GRAFIKKORT"]' && opt.UPPLÖSNING.length === 4, 'VÄRLD och UPPLÖSNING bara med WebGL; standard CPU och AUTO ' + JSON.stringify({ r0: 'VÄRLD' in r0, VÄRLD: r1.VÄRLD, UPPLÖSNING: r1.UPPLÖSNING, opt }));
// en bana med galler, fönster, glas och dörrar
const sceneFn = () => { const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: false, noFlash: true, rendering: 'webgl', bloom: false, glLight: 'off', glWater: 'off', glAir: 'off', glWorld: 'cpu', glRes: 1 });
  const W = 22, H = 15, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  for (let y = 1; y < H - 1; y++) grid[y][10] = '1'; grid[4][10] = 'ǂ'; grid[5][10] = 'ǂ'; grid[7][10] = 'Ɉ'; grid[9][10] = 'D'; grid[11][10] = 'ǁ'; grid[12][10] = 'ǂ';
  for (let y = 1; y < H - 1; y++) grid[y][15] = y % 3 ? '.' : '2'; grid[6][4] = 'P';
  g.playCustom({ grid, biome: 'prison' }); g.P.hp = 1e6; window.__pin = [4.5, 7.5];
  clearInterval(window.__hold); window.__hold = setInterval(() => { const P = __game.P; P.hp = 1e6; if (window.__pin) { P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = 0; P.vx = P.vy = 0; } }, 30); };
await ev(sceneFn); await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await until(() => __game.gl.n().used, 3);
const cells = await ev(() => __game.v28.cells().length);
const d0 = await ev(() => { const g = __game; g.v28.render(); return g.w29.n(); });
ok(d0.ok && !d0.frameOn && d0.frames === 0, 'VÄRLD CPU: världsprogrammet är byggt, men CPU:n ritar världen ' + JSON.stringify(d0));
// 2) strålkastningen i mellankolumnerna = v28Cast; inget sparas
const cc = await ev(() => { const g = __game, out = []; for (const a of [0, -0.3, 0.3, 0.6]) { g.P.a = a; window.__pin = null; g.v28.render(); out.push(g.w29.castCheck()); } window.__pin = [4.5, 7.5]; return out; });
const ss = await ev(() => { const g = __game; g.v28.render(); return g.w29.subSide(); });
ok(cells >= 5 && cc.every(c => c.same === c.n && c.n > 50), 'mellankolumnens stråle ger samma träff som v28Cast (galler, fönster, glas, dörr) ' + JSON.stringify({ cells, cc: cc.map(c => [c.same, c.n, c.bad]) }));
ok(ss.seenChanged === 0 && ss.nSame, 'mellankolumnens stråle sparar inget: kartan och räknarna orörda ' + JSON.stringify(ss));
// 3) GRAFIKKORT: världen ritas av grafikkortet; i 1× samma bild som CPU:n (galler och fönster i lagret)
const cmp = () => ev(() => { const g = __game, s = g.settings; s.glWorld = 'cpu'; g.v28.render(); const A = g.gl.post(); s.glWorld = 'gpu'; s.glRes = 1; g.v28.render(); const B = g.gl.post(), n = g.w29.n();
  let eq = 0; for (let i = 0; i < A.length; i += 4) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) <= 6) eq++; return { eq: +(eq / (A.length / 4)).toFixed(4), on: n.frameOn, passes: n.passes, used: g.gl.n().used }; });
const c1 = await cmp();
ok(c1.on && c1.used && c1.passes > 0 && c1.eq > 0.97, 'GRAFIKKORT 1×: samma bild som CPU-världen med galler, fönster och glas ' + JSON.stringify(c1));
// 4) ett fel i passet: CPU-världen i samma bildruta (bilden som CPU-vägens), WebGL ritar vidare
const f1 = await ev(() => { const g = __game, s = g.settings, W = g.w29.W29; s.glWorld = 'cpu'; g.v28.render(); const A = g.gl.post(); s.glWorld = 'gpu'; W.brkRun = true; g.v28.render(); W.brkRun = false; const B = g.gl.post(), n = g.w29.n();
  let eq = 0; for (let i = 0; i < A.length; i += 4) if (A[i] === B[i] && A[i + 1] === B[i + 1] && A[i + 2] === B[i + 2]) eq++; g.v28.render(); const n2 = g.w29.n(); return { eq: +(eq / (A.length / 4)).toFixed(4), redo: n.redo, failed: n.failed, used: g.gl.n().used, efter: n2.frameOn }; });
ok(f1.redo >= 1 && f1.failed && f1.eq === 1 && f1.used && !f1.efter, 'fel i världspasset: CPU-världen i samma bildruta (exakt samma bild), WebGL ritar vidare ' + JSON.stringify(f1));
await ev(() => { const g = __game; g.w29.W29.failed = false; });
// 5) ett världsprogram som inte byggs: CPU-världen, WebGL ritar vidare; byggs igen
const b1 = await ev(() => { const g = __game, r = g.w29.breakShader(true); g.v28.render(); const n = g.w29.n(); return { r, frameOn: n.frameOn, used: g.gl.n().used, failed: g.gl.n().failed }; });
await until(null, 0.3);
ok(!b1.r.ok && b1.r.glOk && !b1.frameOn && b1.used && !b1.failed, 'trasigt världsprogram: CPU-världen, WebGL ritar vidare ' + JSON.stringify(b1));
const b2 = await ev(() => { const g = __game, r = g.w29.breakShader(false); g.v28.render(); return { r, on: g.w29.n().frameOn }; });
ok(b2.r.ok && b2.on, 'programmet byggs igen och grafikkortet ritar världen ' + JSON.stringify(b2));
// 6) förlorad kontext: CPU-vägen (ingen sidfel), sedan grafikkortets värld igen
const l0 = await ev(() => __game.gl.lose()); await until(null, 0.5);
const l1 = await ev(() => ({ failed: __game.gl.n().failed, used: __game.gl.n().used, on: __game.w29.n().frameOn }));
await ev(() => __game.gl.restore()); await until(() => __game.gl.n().used, 3); await until(null, 0.5);
const l2 = await ev(() => { const g = __game; g.v28.render(); return { used: g.gl.n().used, on: g.w29.n().frameOn, ok: g.w29.n().ok }; });
ok(l0 && l1.failed && !l1.used && !l1.on && l2.used && l2.on && l2.ok, 'förlorad kontext: CPU-vägen, sedan grafikkortets värld igen ' + JSON.stringify({ l1, l2 }));
// 6b) förlust mitt i bildrutan (efter CPU-delen, före glDraw): CPU-världen i samma bildruta
const l3 = await ev(() => { const g = __game, GL = g.gl.GLR, r0 = g.w29.n().redo, orig = GL.gl.isContextLost; GL.gl.isContextLost = () => true; let n;
  try { g.v28.render(); n = g.w29.n(); } finally { GL.gl.isContextLost = orig; } const holes = (() => { const c = document.getElementById('screen').getContext('2d').getImageData(0, 0, 320, 200).data; let h = 0; for (let i = 3; i < c.length; i += 4) if (c[i] < 255) h++; return h; })();
  return { redo: n.redo - r0, failed: g.gl.n().failed, holes }; });
ok(l3.redo === 1 && l3.failed && l3.holes === 0, 'förlust mitt i bildrutan: CPU-världen ritas i samma bildruta (inga hål) ' + JSON.stringify(l3));
await ev(() => { const g = __game; g.settings.rendering = 'webgl'; g.gl.GLR.failed = false; }); await until(() => __game.gl.n().used && __game.w29.n().frameOn, 3);
// 7) UPPLÖSNING och AUTO
const au = await ev(() => { const g = __game, s = g.settings, W = g.w29.W29, out = {}; for (const r of [1, 2, 3, 'auto']) { s.glRes = r; g.v28.render(); out[r] = { R: g.w29.n().R, cols: g.w29.n().cols }; }
  out.S = g.gl.n().S; out.auto = g.w29.auto(); s.lowfx = true; out.autoLow = g.w29.auto(); s.lowfx = false;
  W.t0 = 0; W.ft = 16; W.slow = false; W.drops = 0; let t = 1000; const run = (n, d) => { for (let i = 0; i < n; i++) { t += d; g.w29.tick(t); } return W.slow; };
  out.slowAfter = run(200, 40); out.fastAfter = run(400, 14); out.slow2 = run(200, 40); out.hold = run(400, 14); out.after60 = run(5000, 14); W.slow = false; W.drops = 0; W.t0 = 0; return out; });
ok(au[1].R === 1 && au[2].R === Math.min(2, au.S) && au[3].R === Math.min(3, au.S) && au.auto === 3 && au.autoLow === 1 && au[2].cols === au[1].cols * au[2].R, 'UPPLÖSNING 1×/2×/3× (högst scenens skala), AUTO på dator 3×, lowfx 1× ' + JSON.stringify(au));
ok(au.slowAfter === true && au.fastAfter === false && au.slow2 === true && au.hold === true && au.after60 === false, 'AUTO på telefon: långsamma bildrutor (> 24 ms i 2 s) ger 1×, snabba (< 18 ms i 4 s) 2× igen; efter andra nedgången 1× i en minut ' + JSON.stringify({ slow: au.slowAfter, fast: au.fastAfter, slow2: au.slow2, hold: au.hold, after60: au.after60 }));
await ev(() => { const s = __game.settings; s.glRes = 2; s.glWorld = 'gpu'; }); await until(null, 0.3); await shot('grafikkort_2x');
// 8) CPU igen: precis som förut (ingen grafikkortsvärld, inga lager)
const back = await ev(() => { const g = __game; g.settings.glWorld = 'cpu'; const f0 = g.w29.n().passes; g.v28.render(); g.v28.render(); return { passes: g.w29.n().passes - f0, on: g.w29.n().frameOn }; });
ok(back.passes === 0 && !back.on, 'VÄRLD CPU igen: inget världspass ' + JSON.stringify(back));
ok(cerr.length === 0 && errs.length === 0, 'inga fel ' + JSON.stringify(cerr.slice(0, 4)));
await done();
