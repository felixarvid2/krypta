// t111: titta upp/ned med musen utan förvrängning. Världen ritas med vågrät kamera i en större buffert och vrids sedan till skärmen
// (homografi per rad). Kontroller: musen (pekarlås), högerspaken och INVERTERA ändrar P.look; pitch 0 ger exakt samma bild som med
// inställningen av; en liten vinkel ger nästan samma bild (geometrin stämmer); inga hål eller klämda rader vid ±största vinkeln, även
// med rekyl; skadesiffrornas projektion följer med; P.look nollställs vid ny våning; inställningarna finns i KONTROLL; inga sidfel.
import { setup } from './head.mjs';
const PORT = 9811;
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t111');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
ok(await ev(() => __game.settings.mouseLook === true && __game.settings.invertY === false), 'inställningarna finns: upp/ned med musen på (dator), inverterat av');
ok(await ev(() => !!__game.look && __game.look.max > 0.5 && __game.look.max < 0.7), 'största blicken upp/ned är cirka 35° ' + await ev(() => (__game.look.max * 180 / Math.PI).toFixed(1)));
// inställningsraderna i INSTÄLLNINGAR → KONTROLL
await pg.click('#settingsbtn'); await wait(300);
const rows = await ev(() => [...document.querySelectorAll('#cardui .cu-row')].filter(r => /TITTA UPP\/NED MED MUSEN|INVERTERA UPP\/NED|LOOK UP\/DOWN|INVERT UP\/DOWN/.test(r.textContent)).map(r => r.dataset.tab));
ok(rows.length === 2 && rows.every(t => t === 'KONTROLL'), 'TITTA UPP/NED MED MUSEN och INVERTERA UPP/NED ligger under KONTROLL ' + JSON.stringify(rows));
await pg.click('#cardui button:has-text("STÄNG")'); await wait(300);
// en enkel rum med väggar, pelare och några sovande fiender (som sprites)
const scene = biome => ev(b => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = false; g.settings.mouseLook = true; g.settings.invertY = false;
  const W = 32, H = 24, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 || (x % 7 === 5 && y % 5 === 2) ? '1' : '.'); grid.push(r); }
  grid[10][2] = 'P'; grid[2][29] = 'x'; grid[11][9] = 'S'; grid[14][12] = 'K';
  g.playCustom({ grid, biome: b }); }, biome);
await scene('dungeon'); await wait(1200);
await ev(() => { const g = __game; for (const e of g.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } g.P.hp = 999; g.P.x = 2.5; g.P.y = 10.5; g.P.a = 0.15; g.P.look = 0; g.P.pitch = 0; });
ok(await ev(() => __game.state()) === 'play', 'rummet startar');
// musen: pekarlåset simuleras (produktionskoden kräver det), movementY uppåt = titta upp
await ev(() => { const cv = document.getElementById('screen'); Object.defineProperty(document, 'pointerLockElement', { get: () => cv, configurable: true }); });
const move = (dx, dy) => ev(([dx, dy]) => { window.dispatchEvent(new MouseEvent('mousemove', { movementX: dx, movementY: dy })); }, [dx, dy]);
await move(0, -60); const up1 = await ev(() => __game.P.look);
ok(up1 > 0.1, 'musen uppåt höjer blicken (P.look) ' + up1.toFixed(3));
await move(0, 120); const dn1 = await ev(() => __game.P.look);
ok(dn1 < -0.1 && Math.abs(dn1 + up1) < 1e-6, 'musen nedåt sänker blicken lika mycket ' + dn1.toFixed(3));
await move(0, -5000); ok(Math.abs(await ev(() => __game.P.look) - await ev(() => __game.look.max)) < 1e-9, 'blicken stannar vid största vinkeln');
await ev(() => { __game.P.look = 0; __game.settings.invertY = true; }); await move(0, -60);
ok(await ev(() => __game.P.look) < -0.1, 'INVERTERA UPP/NED vänder musen');
await ev(() => { __game.P.look = 0; __game.settings.invertY = false; __game.settings.mouseLook = false; }); await move(0, -60);
ok(await ev(() => __game.P.look) === 0, 'med inställningen av påverkar musen inte blicken');
await ev(() => { __game.settings.mouseLook = true; });
// högerspaken (falsk handkontroll)
await ev(() => { const btn = () => ({ pressed: false, value: 0 }); window.__pad = { connected: true, id: 'test', index: 0, axes: [0, 0, 0, -1], buttons: Array.from({ length: 17 }, btn) }; navigator.getGamepads = () => [window.__pad]; __game.P.look = 0; });
await wait(400); const padUp = await ev(() => __game.P.look);
await ev(() => { window.__pad.axes[3] = 0; navigator.getGamepads = () => []; __game.P.look = 0; __game.P.pitch = 0; }); await wait(100);
ok(padUp > 0.1, 'högerspaken uppåt höjer blicken ' + padUp.toFixed(3));
// pitch 0: samma bild som med inställningen av (samma bildruta, två renderingar)
await ev(() => __game.pause()); await wait(100);
const same = await ev(() => { const g = __game, L = g.look; g.P.look = 0; g.P.pitch = 0; g.settings.mouseLook = false; const a = L.probe(); g.settings.mouseLook = true; const b = L.probe();
  let d = 0; for (let i = 0; i < a.px.length; i++) if (a.px[i] !== b.px[i]) d++; return { d, aOn: a.on, bOn: b.on, holes: a.holes + b.holes }; });
ok(same.d === 0 && !same.aOn && !same.bOn && same.holes === 0, 'pitch 0 ger pixelexakt samma bild som med upp/ned-blicken av ' + JSON.stringify(same));
// en mycket liten vinkel går genom projektionen men ska ge nästan samma bild (bredare buffert, samma strålar)
const tiny = await ev(() => { const g = __game, L = g.look; g.P.look = 0; const a = L.probe(); g.P.look = 0.0005; const b = L.probe(); g.P.look = 0;
  let d = 0; for (let i = 0; i < a.px.length; i++) if (a.px[i] !== b.px[i]) d++; return { d, on: b.on, TW: b.TW, TH: b.TH, holes: b.holes }; });
ok(tiny.on && tiny.holes === 0 && tiny.d < 64000 * 0.03, 'en liten vinkel ger nästan samma bild ' + JSON.stringify(tiny));
// ±största vinkeln (och med rekyl/dödskamera ovanpå): inga hål, inga klämda rader, hela skärmen fylld
const ext = await ev(() => { const g = __game, L = g.look, out = []; for (const [lk, pt] of [[L.max, 0], [-L.max, 0], [L.max, 20], [-L.max, -24], [0.3, 0], [-0.3, 0]]) { g.P.look = lk; g.P.pitch = pt; const r = L.probe();
  const c = [r.px[0], r.px[319], r.px[199 * 320], r.px[199 * 320 + 319]].every(v => v >>> 24 === 255); out.push({ lk: +lk.toFixed(2), pt, on: r.on, holes: r.holes, clamps: r.clamps, corners: c, TW: r.TW, TH: r.TH }); }
  g.P.look = 0; g.P.pitch = 0; return { out, bufW: L.bufW, bufH: L.bufH }; });
ok(ext.out.every(r => r.on && r.holes === 0 && r.clamps === 0 && r.corners && r.TW <= ext.bufW && r.TH <= ext.bufH), 'bilden är fylld i hörnen vid ±största vinkeln, även med rekyl ' + JSON.stringify(ext.out.map(r => [r.lk, r.pt, r.holes, r.clamps, r.TW, r.TH])));
// homografin: vågräta linjer på golvet förblir raka och lodräta kanter lutar (3-punktsperspektiv) – kontroll av projektionen av två väggpunkter
const geo = await ev(() => { const g = __game, L = g.look, X = g.P.x + 4, Y = g.P.y - 1.02; g.P.look = 0.3; L.probe(); const p1 = L.project(X, Y, 0), p2 = L.project(X, Y, 1); g.P.look = 0; L.probe(); const q1 = L.project(X, Y, 0), q2 = L.project(X, Y, 1); return { p1, p2, q1, q2 }; });
ok(geo.q1 && geo.q2 && Math.abs(geo.q1.sx - geo.q2.sx) <= 1, 'pitch 0: en lodrät kant är lodrät ' + JSON.stringify([geo.q1 && geo.q1.sx, geo.q2 && geo.q2.sx]));
ok(geo.p1 && geo.p2 && geo.q1 && geo.p2.sy < geo.p1.sy && geo.p2.sx - geo.p1.sx >= 2 && geo.p1.sy > geo.q1.sy + 20, 'uppåt: samma kant lutar mot mitten (3-punktsperspektiv) och skadesiffrornas projektion följer med ' + JSON.stringify([geo.p1 && [Math.round(geo.p1.sx), Math.round(geo.p1.sy)], geo.p2 && [Math.round(geo.p2.sx), Math.round(geo.p2.sy)]]));
// skärmbilder: 0, +25° och −25° (HUD:en och siktet ritas som vanligt ovanpå)
await ev(() => __game.resume()); await wait(150);
for (const d of [0, 25, -25]) { await ev(d => { __game.P.look = d * Math.PI / 180; __game.P.pitch = 0; }, d); await wait(250); await pg.locator('#screen').screenshot({ path: `out/t111/rum_${d}.png` }); }
ok(await ev(() => Math.abs(__game.P.look + 25 * Math.PI / 180) < 0.01), 'P.look dras inte mot 0 av sig själv');
// rekylen (P.pitch) fungerar som förut och dras mot 0
await ev(() => { __game.P.pitch = 10; }); await wait(500);
ok(Math.abs(await ev(() => __game.P.pitch)) < 1, 'rekylen återhämtar sig som förut');
// ny våning: blicken nollställs
await scene('desert'); await wait(1200);
ok(await ev(() => __game.P.look) === 0, 'P.look nollställs vid ny våning/bana');
// utomhus med himmel: hela skärmen fylld även när man tittar rakt upp mot himlen
const sky = await ev(() => { const g = __game, L = g.look; for (const e of g.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } g.P.hp = 999; const out = []; for (const lk of [L.max, -L.max]) { g.P.look = lk; const r = L.probe(); out.push([r.holes, r.clamps]); } g.P.look = 0; return { out, sky: !!g.lvl().sky }; });
ok(sky.out.every(([h, c]) => h === 0 && c === 0), 'öknen (himmel: ' + sky.sky + '): inga hål vid ±största vinkeln ' + JSON.stringify(sky.out));
await ev(() => { __game.P.look = 0.45; }); await wait(250); await pg.locator('#screen').screenshot({ path: 'out/t111/oken_upp.png' });
// mouseLook av nollställer inte bara musen: P.look används inte i bilden
await ev(() => { __game.settings.mouseLook = false; }); await wait(100);
ok(await ev(() => { const r = __game.look.probe(); return !r.on; }), 'med inställningen av ritas bilden som förut (ingen projektion)');
await ev(() => { __game.settings.mouseLook = true; __game.P.look = 0; });
await done();
