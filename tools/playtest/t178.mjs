// t178: version 29 (LJUS) – F9-bilden och inställningarna. Inställningarna (BILD): raderna RENDERING, BLOOM, LJUS och VATTEN finns,
// LJUS och VATTEN är AV under webdriver (AUTO, som RENDERING) och ett nytt val sparas. F9 med WebGL: bilden är WebGL-duken och HUD:en
// ihop (dukens storlek, inte svart, HUD:en syns), både i spelet och i pausen (som nu ritas av grafikkortet); F9 laddar ned en PNG.
// Väntan i speltid. Port 9878.
import { setup } from './head.mjs';
const PORT = 9878;
const { pg, ev, wait, ok, shot, done, errs } = await setup(PORT, 'out/t178');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) cerr.push(m.text().slice(0, 160)); });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
// 1) inställningarna från startskärmen
await ev(() => document.getElementById('settingsbtn').click()); await wait(600);
const rows = await ev(() => { const r = {}; for (const el of document.querySelectorAll('.cu-row')) { const lab = el.querySelector('span'), inp = el.querySelector('select,input'); if (lab && inp) r[lab.textContent.trim()] = inp.type === 'checkbox' ? inp.checked : inp.value; } return r; });
ok(['RENDERING', 'BLOOM', 'LJUS', 'VATTEN', 'LUFT'].every(k => k in rows) && rows.LJUS === 'off' && rows.VATTEN === 'off' && rows.LUFT === 'off' && rows.RENDERING === 'auto', 'BILD: RENDERING, BLOOM, LJUS, VATTEN och LUFT finns; LJUS, VATTEN och LUFT AV under webdriver ' + JSON.stringify({ RENDERING: rows.RENDERING, BLOOM: rows.BLOOM, LJUS: rows.LJUS, VATTEN: rows.VATTEN, LUFT: rows.LUFT }));
const opts = await ev(() => { for (const el of document.querySelectorAll('.cu-row')) { const lab = el.querySelector('span'); if (lab && lab.textContent.trim() === 'LJUS') return Array.from(el.querySelectorAll('option')).map(o => o.textContent); } return null; });
ok(JSON.stringify(opts) === JSON.stringify(['PÅ', 'AV']), 'LJUS: PÅ / AV ' + JSON.stringify(opts));
const ch = await ev(() => { for (const el of document.querySelectorAll('.cu-row')) { const lab = el.querySelector('span'), s = el.querySelector('select'); if (lab && s && (lab.textContent.trim() === 'LJUS' || lab.textContent.trim() === 'VATTEN')) { s.value = 'on'; s.dispatchEvent(new Event('change')); } }
  const st = __game.settings; let saved = null; try { saved = JSON.parse(localStorage.getItem('krypta.settings') || 'null'); } catch (e) { /* inget */ } return { glLight: st.glLight, glWater: st.glWater, saved: saved && saved.glLight }; });
ok(ch.glLight === 'on' && ch.glWater === 'on', 'ett nytt val i LJUS och VATTEN gäller direkt ' + JSON.stringify(ch));
await shot('installningar');
await pg.keyboard.press('Escape'); await wait(400);
// 2) F9 i spelet
await ev(() => { localStorage.removeItem('krypta.run'); const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: false, rendering: 'webgl', bloom: true, glLight: 'on', reduceMotion: true });
  const W = 16, H = 11, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); } grid[5][3] = 'P'; grid[2][10] = '2';
  g.playCustom({ grid, biome: 'cathedral' }); g.P.hp = 1e6;
  window.__dl = []; HTMLAnchorElement.prototype.click = function () { window.__dl.push(this.download || ''); }; }); // nedladdningen fångas
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 90000) return !cond; await wait(80); } };
await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await until(() => __game.gl.n().used, 2);
const s1 = await ev(() => ({ s: __game.gl.shotStats(), n: __game.gl.n() }));
ok(s1.s && s1.s.w === s1.n.cw && s1.s.h === s1.n.ch && s1.s.lum > 8 && s1.s.hud > 0.002, 'F9 i spelet: WebGL-bilden och HUD:en ihop ' + JSON.stringify(s1.s));
const k0 = await ev(() => __game.gl.n().shots || 0); await pg.keyboard.press('F9'); for (let i = 0; i < 50 && !(await ev(() => window.__dl.length)); i++) await wait(100); // toBlob är asynkron
const k1 = await ev(() => ({ shots: __game.gl.n().shots || 0, dl: window.__dl.slice() }));
ok(k1.shots === k0 + 1 && k1.dl.length === 1 && /^krypta-\d+\.png$/.test(k1.dl[0]), 'F9-tangenten: en PNG laddas ned ' + JSON.stringify(k1));
// 3) F9 i pausen (grafikkortet ritar pausen; mörkningen och texten ligger på 2D-duken)
await ev(() => __game.pause()); await wait(500);
const s2 = await ev(() => ({ s: __game.gl.shotStats(), used: __game.gl.n().used, st: __game.state() }));
ok(s2.st === 'pause' && s2.used && s2.s && s2.s.lum > 1 && s2.s.lum < s1.s.lum && s2.s.hud > 0.3, 'F9 i pausen: bilden finns, mörkad av pausen ' + JSON.stringify(s2));
await shot('paus');
// 4) som spelaren får det: ingen webdriver och inga sparade inställningar (AUTO = WebGL, LJUS/VATTEN/LUFT på). Startskärmen, en riktig
// våning med blickar upp och ned och smällar, pausen och döden: allt i grafikkortet, utan fel.
await ev(() => __game.resume && __game.resume());
await pg.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }); try { if (!sessionStorage.getItem('t178rensad')) { localStorage.clear(); sessionStorage.setItem('t178rensad', '1'); } } catch (e) { /* inget */ } });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&seed=webgl28`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 }); await wait(3000);
const sp = await ev(() => { const g = __game, s = g.settings; return { wd: navigator.webdriver, mode: g.gl.mode(), glLight: s.glLight, glWater: s.glWater, glAir: s.glAir, n: g.l29.n(), title: g.l29.n().title || 0, st: g.state() }; });
ok(sp.wd === false && sp.mode === 'webgl' && sp.glLight === undefined && sp.n.lightOn && sp.n.swimOn && sp.n.reflOn && sp.n.airOn && sp.title > 0, 'som spelaren: AUTO = WebGL, LJUS, VATTEN och LUFT på utan sparade val, startskärmen i grafikkortet ' + JSON.stringify({ ...sp, n: undefined }));
await ev(() => { localStorage.removeItem('krypta.run'); const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.begin('new'); });
const gt2 = () => ev(() => __game.v27b.t());
const until2 = async (cond, sec) => { const t0 = await gt2(), w0 = Date.now(); for (;;) { if (cond && await ev(cond)) return true; if ((await gt2()) - t0 >= sec || Date.now() - w0 > 90000) return !cond; await wait(100); } };
for (const d of [1, 4]) {
  await ev(d => { __game.loadFloor(d); }, d); await until2(() => __game.state() === 'play' && __game.levelTime() > 0.5, 8);
  await ev(() => { try { if (window.CardUI && CardUI.isOpen()) CardUI.close(); } catch (e) { /* inget */ } if (__game.state() === 'ui' || __game.state() === 'pause') __game.resume && __game.resume(); });
  for (let k = 0; k < 5; k++) { await ev(k => { const g = __game, P = g.P; P.hp = 1e6; P.iframe = 1e6; P.look = [0.4, -0.3, 0, 0.2, 0][k]; P.a += 0.5; g.explode(P.x + Math.cos(P.a) * 2.4, P.y + Math.sin(P.a) * 2.4, 0, 1.3, false, k % 2 === 0); }, k); await until2(null, 0.3); }
  await ev(() => { __game.P.look = 0; }); await until2(null, 0.2); await shot('spelaren_v' + d);
}
const sp2 = await ev(() => ({ n: __game.l29.n(), g: __game.gl.n(), st: __game.state() }));
ok(sp2.g.used && !sp2.g.failed && sp2.n.frames > 20 && sp2.n.lights > 0, 'som spelaren: riktiga våningar med ljuset på, ingen reserv ' + JSON.stringify({ frames: sp2.n.frames, lights: sp2.n.lights, refl: sp2.n.refl || 0, haze: sp2.n.haze || 0, fog: sp2.n.fog || 0, fallbacks: sp2.g.fallbacks, st: sp2.st }));
await ev(() => __game.pause()); await wait(500); const sp3 = await ev(() => ({ used: __game.gl.n().used, pause: __game.l29.n().pause })); await ev(() => __game.resume()); await until2(null, 0.3);
await ev(() => { const P = __game.P; P.iframe = 0; __game.hurtPlayer(1e7); }); await until2(() => __game.state() === 'dead', 3); await until2(null, 0.6);
const sp4 = await ev(() => ({ used: __game.gl.n().used, st: __game.state() }));
ok(sp3.used && sp3.pause > 0 && sp4.used && sp4.st === 'dead', 'som spelaren: pausen och döden i grafikkortet ' + JSON.stringify({ sp3, sp4 }));
ok(cerr.length === 0 && errs.length === 0, 'inga fel i bildrutorna ' + JSON.stringify(cerr.slice(0, 4)));
await done();
