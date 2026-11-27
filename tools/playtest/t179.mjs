// t179: version 29 (LJUS) – vattenmasken och speglingen, värmedaller och dimma (LUFT), mynningsglöden, döden och startskärmen i
// grafikkortet, och att lowfx stänger av allt nytt. Vattenmasken: R = 255 exakt på vattenrutorna. VATTEN PÅ: golvet med vatten speglar
// väggen (bilden ändras där, inte på torrt golv). LUFT PÅ: lavan dallrar (samma bildruta, LUFT av/på skiljer sig), kyrkogården får
// drivande dimma. Skott: mynningsglöden läggs på i shadern. Döden: ingen grå hinna på 2D-duken, bilden gråas i shadern. Startskärmen:
// kameraflykten ritas av grafikkortet (med WEBGL). lowfx: inget av det nya körs, WebGL ritar ändå. Väntan i speltid. Port 9879.
import { setup } from './head.mjs';
const PORT = 9879;
const { pg, ev, wait, ok, shot, done, errs } = await setup(PORT, 'out/t179');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) cerr.push(m.text().slice(0, 160)); });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
// 0) startskärmen med WEBGL: kameraflykten genom grafikkortet
await ev(() => { Object.assign(__game.settings, { rendering: 'webgl', reduceMotion: false, lowfx: false, titleLive: true }); }); await wait(2500);
await ev(() => __game.meny && __game.meny.titleReset()); await wait(1000); // en belastad maskin stänger annars av kameraflykten (långsam, efter 90 bildrutor)
const ti = await ev(() => ({ why: __game.meny ? __game.meny.title().why : '?', st: __game.state(), title: __game.l29.n().title || 0, shown: __game.gl.n().shown, disp: document.getElementById('glscreen') && document.getElementById('glscreen').style.display }));
ok(ti.st === 'title' && ti.title > 5 && ti.shown && ti.disp === '', 'startskärmen: kameraflykten ritas av grafikkortet ' + JSON.stringify(ti));
await shot('start_webgl');
const sceneFn = o => { const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: false, noFlash: false, reduceMotion: false, rendering: 'webgl', bloom: true, glLight: 'on', glWater: 'on', glAir: 'on' });
  const W = 20, H = 13, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  if (o.water) for (let y = 4; y <= 8; y++) for (let x = 6; x <= 10; x++) grid[y][x] = '-'; // grunt vatten framför spelaren
  if (o.lava) for (let y = 5; y <= 7; y++) for (let x = 6; x <= 9; x++) grid[y][x] = '_';
  if (o.pillars) for (let k = 0; k < 6; k++) { grid[2 + k][9 + (k % 2) * 2] = '2'; grid[1][7 + k * 2] = '2'; } // pelare mot himlen
  for (let y = 3; y <= 9; y++) grid[y][13] = '2'; grid[6][4] = 'P'; if (o.water) { grid[4][12] = 'f'; grid[8][12] = 'f'; } // facklor vid bakväggen (något ljust att spegla)
  g.playCustom({ grid, biome: o.biome || 'dungeon' }); g.P.hp = 1e6; window.__pin = [4.5, 6.5];
  clearInterval(window.__hold); window.__hold = setInterval(() => { const P = __game.P; P.hp = Math.max(P.hp, 1e5); if (window.__pin) { P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = window.__pinA || 0; P.vx = P.vy = 0; } }, 30); };
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 90000) return !cond; await wait(80); } };
const ready = async o => { await ev(sceneFn, o); await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await until(() => __game.gl.n().used, 2); };
// samma bildruta med en inställning av och på: medelavvikelse i bildens övre och nedre halva (80×50)
const pair = (key, rows) => ev(([key, rows]) => { const g = __game; window.__pin = null; g.settings[key] = 'off'; const A = g.gl.snap(80, 50); g.settings[key] = 'on'; const B = g.gl.snap(80, 50); window.__pin = [4.5, 6.5];
  const half = (y0, y1) => { let s = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < 80; x++) for (let k = 0; k < 3; k++) { s += Math.abs(A[(y * 80 + x) * 3 + k] - B[(y * 80 + x) * 3 + k]); n++; } return +(s / n).toFixed(2); };
  return { upp: half(0, 25), ned: half(rows || 27, 50) }; }, [key, rows]);
// upp/ned-blicken: samma bildruta med en inställning av och på (två bildrutor uppvärmning var: hela bufferten bestäms av förra bildrutan)
const pairLook = (key, look) => ev(([key, look]) => { const g = __game, P = g.P; window.__pin = null; P.look = look; g.settings[key] = 'on'; g.v28.render(); g.v28.render(); const B = g.gl.snap(80, 50), full = g.l29.n().lkFull || 0, lk = g.gl.n().lkGpu;
  g.settings[key] = 'off'; g.v28.render(); g.v28.render(); const A = g.gl.snap(80, 50); g.settings[key] = 'on'; P.look = 0; window.__pin = [4.5, 6.5];
  let s = 0; for (let i = 0; i < A.length; i++) s += Math.abs(A[i] - B[i]); return { diff: +(s / A.length).toFixed(2), full, lk }; }, [key, look]);
// 1) vattenmasken och speglingen
await ready({ water: true, biome: 'bathhouse' });
const mk = await ev(() => { const g = __game, m = g.l29.mask(), map = g.map ? g.map() : null; if (!m) return null; let ok = 0, bad = 0, n = 0;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const w = x >= 6 && x <= 10 && y >= 4 && y <= 8, r = m.d[(y * m.w + x) * 4]; if (w) n++; if ((r === 255) === w) ok++; else bad++; } return { ok, bad, n, wat: g.l29.n().wat, fx: g.l29.n().fx }; });
ok(mk && mk.bad === 0 && mk.wat === 25 && mk.n === 25, 'vattenmasken: R = 255 exakt på de 25 vattenrutorna ' + JSON.stringify(mk));
const rf = await pair('glWater', 27);
ok(rf.ned > 1.5 && rf.upp < 0.3, 'VATTEN PÅ: vattengolvet speglar väggen (nedre halvan ändras, inte den övre) ' + JSON.stringify(rf));
await pg.keyboard.press('KeyK'); await wait(300); await ev(() => { __game.settings.glWater = 'off'; }); await wait(250); await shot('vatten_av'); // fotoläget: samma bildruta
await ev(() => { __game.settings.glWater = 'on'; }); await wait(250); await shot('vatten_pa'); await pg.keyboard.press('KeyK'); await wait(200);
const rfl = { minus: await pairLook('glWater', -0.3), plus: await pairLook('glWater', 0.3) };
ok(rfl.minus.diff > 0.5 && rfl.plus.diff > 0.5 && rfl.plus.full > 0 && rfl.plus.lk > 0, 'upp/ned-blicken: speglingen finns kvar (hela bufferten ritas) ' + JSON.stringify(rfl));
await ev(() => { window.__pin = null; __game.P.look = 0.3; }); await pg.keyboard.press('KeyK'); await wait(300); await shot('vatten_blick'); await pg.keyboard.press('KeyK'); await ev(() => { __game.P.look = 0; window.__pin = [4.5, 6.5]; });
const dry = await ev(() => { window.__pin = null; const g = __game, P = g.P; P.a = Math.PI; const A = g.gl.snap(80, 50); g.settings.glWater = 'off'; const B = g.gl.snap(80, 50); g.settings.glWater = 'on'; P.a = 0; window.__pin = [4.5, 6.5]; let s = 0; for (let i = 0; i < A.length; i++) s += Math.abs(A[i] - B[i]); return +(s / A.length).toFixed(3); });
ok(dry < 0.05, 'torrt golv (bort från vattnet) speglar inte ' + dry);
// 2) värmedaller över lava (LUFT)
await ready({ lava: true, biome: 'volcano' });
const hz = await pair('glAir', 27); const hn = await ev(() => __game.l29.n());
ok(hn.hot === 12 && (hn.haze || 0) > 0 && hz.ned > 0.4, 'LUFT PÅ: lavan dallrar (samma bildruta, av mot på) ' + JSON.stringify({ hz, hot: hn.hot, haze: hn.haze }));
const hzl = await pairLook('glAir', 0.3);
ok(hzl.diff > 0.2 && hzl.full > 0, 'upp/ned-blicken: lavan dallrar (hela bufferten ritas) ' + JSON.stringify(hzl));
await pg.keyboard.press('KeyK'); await wait(300); await ev(() => { __game.settings.glAir = 'off'; }); await wait(250); await shot('lava_luft_av');
await ev(() => { __game.settings.glAir = 'on'; }); await wait(250); await shot('lava_luft_pa'); await pg.keyboard.press('KeyK'); await wait(200);
// 3) drivande dimma på kyrkogården
await ready({ biome: 'graveyard' });
const fg = await pair('glAir', 25); const fn = await ev(() => __game.l29.n());
ok((fn.fog || 0) > 0 && fg.ned + fg.upp > 0.6, 'LUFT PÅ: kyrkogården får drivande dimma ' + JSON.stringify({ fg, fog: fn.fog }));
await pg.keyboard.press('KeyK'); await wait(300); await ev(() => { __game.settings.glAir = 'off'; }); await wait(250); await shot('dimma_av');
await ev(() => { __game.settings.glAir = 'on'; }); await wait(250); await shot('dimma_pa'); await pg.keyboard.press('KeyK'); await wait(200);
// 3b) ljusstrålar utomhus: mot månen (MOON_A) mellan pelare; LUFT av/på i samma bildruta
await ready({ biome: 'courtyard', pillars: true });
const ry = await ev(() => { const g = __game; g.gl.GLR.flags.rays = true; /* utkastet (av som standard) */ window.__pin = [4.5, 6.5]; g.P.a = 0.9; const k = g.settings; window.__pin = null; g.P.a = 0.9; k.glAir = 'off'; const A = g.gl.snap(80, 50); k.glAir = 'on'; const B = g.gl.snap(80, 50);
  let up = 0, s = 0; for (let j = 0; j < A.length; j += 3) { const d = (B[j] + B[j + 1] + B[j + 2] - A[j] - A[j + 1] - A[j + 2]) / 3; s += d; if (d > 4) up++; } window.__pin = [4.5, 6.5]; const rays = g.l29.n().rays || 0; return { up, mean: +(s / 4000).toFixed(2), rays }; });
ok(ry.rays > 0 && ry.up > 20 && ry.mean < 12, 'LJUSSTRÅLAR (utkast, flags.rays): utomhus ljusnar väggarna under himlakanten mot månen, lagom ' + JSON.stringify({ up: ry.up, mean: ry.mean, rays: ry.rays }));
await ev(() => { window.__pinA = 0.9; __game.settings.glAir = 'off'; }); await until(null, 0.2); await shot('stralar_av');
await ev(() => { __game.settings.glAir = 'on'; }); await until(null, 0.2); await shot('stralar_pa'); await ev(() => { window.__pinA = 0; __game.gl.GLR.flags.rays = false; });
// 4) skott: mynningsglöden i shadern och ljuset kring mynningen
await ready({});
const m0 = await ev(() => __game.l29.n().mz || 0); await ev(() => __game.setMouse(true, false)); await until(null, 0.5); await ev(() => __game.setMouse(false, false));
const m1 = await ev(() => __game.l29.n().mz || 0);
ok(m1 > m0, 'skott: mynningsglöden läggs på i shadern ' + JSON.stringify({ m0, m1 }));
// 5) lowfx stänger av allt nytt (ljus, vatten, luft, vågor); WebGL ritar ändå
await ready({ water: true });
const lf = await ev(() => { const g = __game; g.settings.lowfx = true; const s0 = g.l29.n(); g.v28.render(); g.v28.render(); const s1 = g.l29.n(); const r = { pass: s1.passes - s0.passes, lightOn: s1.lightOn, reflOn: s1.reflOn, airOn: s1.airOn, swimOn: s1.swimOn, used: g.gl.n().used, fx: s1.fx }; g.settings.lowfx = false; g.v28.render(); r.efter = g.l29.n().passes - s1.passes; return r; });
ok(lf.pass === 0 && !lf.lightOn && !lf.reflOn && !lf.airOn && lf.used && lf.efter === 1, 'lowfx: inget nytt pass (ljus, vatten, luft), WebGL ritar ändå ' + JSON.stringify(lf));
// 6) döden: ingen grå hinna på 2D-duken, bilden gråas i shadern
await ev(() => { window.__pin = null; clearInterval(window.__hold); const P = __game.P; P.iframe = 0; __game.hurtPlayer(1e7); }); await until(() => __game.state() === 'dead', 3); await until(null, 0.8);
const dd = await ev(() => { const g = __game, d = document.getElementById('screen').getContext('2d').getImageData(150, 104, 1, 1).data, B = g.gl.snap(80, 50); let sp = 0; for (let j = 0; j < B.length; j += 3) sp += Math.max(B[j], B[j + 1], B[j + 2]) - Math.min(B[j], B[j + 1], B[j + 2]);
  return { st: g.state(), used: g.gl.n().used, a: d[3], g: [d[0], d[1], d[2]], mattnad: +(sp / 4000).toFixed(2), deadT: +g.P.deadT.toFixed(2) }; });
ok(dd.st === 'dead' && dd.used && dd.a < 12, 'döden: ingen grå hinna på 2D-duken (bara den mörka kanten) ' + JSON.stringify(dd));
await shot('doden');
ok(cerr.length === 0 && errs.length === 0, 'inga fel i bildrutorna ' + JSON.stringify(cerr.slice(0, 4)));
await done();
