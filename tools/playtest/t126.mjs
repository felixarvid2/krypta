// t126: version 26B, flygspark. Kontroller: en vacklande fiende på 3,5 rutor under hårkorset – sparken kastar spelaren fram, fienden
// avrättas och spelaren står inom 1,2 rutor från den; en fiende som inte vacklar på samma avstånd ger vanlig spark (ingen förflyttning);
// nedkylningen (1,2 s) och för lite uthållighet ger vanlig spark; en vägg emellan (ingen fri sikt) eller tomrum ger ingen flygspark; flygsparken
// fungerar i luften; ANVÄND-villkoret (v26b.wantsUse) är sant mot en vacklande fiende under hårkorset; av-flaggan stänger av den.
// Inga sidfel. Alla väntetider räknas i speltid (__game.roles.t()), inte väggtid.
import { setup } from './head.mjs';
const PORT = 9826;
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/t126');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
ok(await ev(() => !!__game.v26b && __game.v26b.state().lunge), '__game.v26b finns och flygsparken är på');

const sceneFn = o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = true;
  const W = 20, H = 11, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  for (const [x, y, c] of o.walls || []) grid[y][x] = c || '1';
  grid[5][3] = 'P'; grid[1][W - 2] = 'x'; grid[5][12] = 'S';
  g.playCustom({ grid, biome: 'dungeon' });
  const E = g.ents(); E.length = 0; const e = g.spawnEnemy('S', 3.5 + o.dist, 5.5);
  e.d = { ...e.d, dmg: 0, speed: 0 }; e.hp = e.maxHp = 60; e.alert = true; e.lostT = 0;
  g.P.hp = 1e6; g.P.a = 0; g.P.stam = 1; g.P.kickT = 0; g.P.vx = g.P.vy = 0; clearInterval(window.__hold);
  window.__hold = setInterval(() => { __game.P.hp = 1e6; }, 30);
  return { px: g.P.x, ex: e.x };
};
const scene = o => pg.evaluate(sceneFn, o);
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);
const stagger = () => ev(() => { const g = __game, e = g.ents()[0]; e.staggerT = g.v26b.t() + 2.4; e.stun = 1.3; return g.canExec(e); });
const kickNow = () => ev(() => { const g = __game; g.P.kickT = 0; g.P.a = Math.atan2(g.ents()[0].y - g.P.y, g.ents()[0].x - g.P.x); const st0 = { ...g.v26b.st() }; g.v26b.kick(); return { st0, lunging: g.v26b.state().lunging }; });
const after = () => ev(() => { const g = __game, e = g.ents()[0]; return { dead: !!e.dead, d: +Math.hypot(e.x - g.P.x, e.y - g.P.y).toFixed(2), px: +g.P.x.toFixed(2), st: { ...g.v26b.st() }, lunging: g.v26b.state().lunging, kills: g.kills() }; });

// 1) vacklande fiende på 3,5 rutor: flygspark och avrättning
await scene({ dist: 3.5 }); await gwait(0.3);
ok(await stagger(), 'fienden vacklar');
const want = await ev(() => __game.v26b.wantsUse());
ok(want, 'ANVÄND-villkoret (v26b.wantsUse) är sant mot den vacklande fienden under hårkorset');
const k1 = await kickNow();
await until(() => !__game.v26b.state().lunging, 2); await gwait(0.1);
const a1 = await after();
ok(k1.lunging && a1.dead && a1.st.lungeExec === k1.st0.lungeExec + 1, 'flygsparken avrättar den vacklande fienden ' + JSON.stringify({ k1, a1 }));
ok(a1.d <= 1.2, `spelaren står inom 1,2 rutor från fienden (${a1.d}) ` + JSON.stringify(a1));

// 2) samma avstånd utan vacklan: vanlig spark, ingen förflyttning
await scene({ dist: 3.5 }); await gwait(0.3);
const x0 = await ev(() => __game.P.x); const k2 = await kickNow(); await gwait(0.4); const a2 = await after();
ok(!k2.lunging && !a2.dead && Math.abs(a2.px - x0) < 0.3, 'fiende som inte vacklar: vanlig spark, ingen flygspark ' + JSON.stringify({ k2, a2, x0 }));

// 3) nedkylning och uthållighet
await scene({ dist: 3.5 }); await gwait(0.3); await stagger();
const k3 = await ev(() => { const g = __game; g.v26b.flags.lcd = g.v26b.t() + 1; g.P.kickT = 0; g.v26b.kick(); return g.v26b.state().lunging; });
await gwait(0.6);
const k3b = await ev(() => { const g = __game; g.v26b.flags.lcd = 0; g.P.stam = 0.1; g.P.kickT = 0; g.v26b.kick(); return g.v26b.state().lunging; });
const a3 = await after();
ok(!k3 && !k3b && !a3.dead, 'under nedkylning eller med för lite uthållighet blir det vanlig spark ' + JSON.stringify({ k3, k3b, a3 }));

// 4) vägg emellan: ingen fri sikt, ingen flygspark
await scene({ dist: 3.5, walls: [[5, 5]] }); await gwait(0.3); await stagger();
const k4 = await kickNow(); await gwait(0.4); const a4 = await after();
ok(!k4.lunging && !a4.dead && a4.px < 4.6, 'vägg emellan: ingen flygspark ' + JSON.stringify({ k4, a4 }));

// 4b) tomrum emellan: ingen flygspark ut över kanten
await scene({ dist: 3.5, walls: [[5, 5, 'Ń']] }); await gwait(0.3); await stagger();
const k4b = await kickNow(); await gwait(0.4); const a4b = await after();
ok(!k4b.lunging && !a4b.dead && a4b.px < 4.6, 'tomrum emellan: ingen flygspark ' + JSON.stringify({ k4b, a4b }));

// 5) i luften
await scene({ dist: 3.0 }); await gwait(0.3); await stagger();
const k5 = await ev(() => { const g = __game; g.P.jz = 0.3; g.P.jv = 2; g.P.kickT = 0; g.v26b.kick(); return g.v26b.state().lunging; });
await until(() => !__game.v26b.state().lunging, 2); await gwait(0.1);
const a5 = await after();
ok(k5 && a5.dead, 'flygsparken fungerar i luften ' + JSON.stringify({ k5, a5 }));

// 5b) med rusningsskada (kort, dashDmg) och utan någon rusning innan: flygsparken går ändå (P.dashHit sätts)
await scene({ dist: 3.5 }); await gwait(0.3); await stagger();
const k5b = await ev(() => { const g = __game; g.mods().dashDmg = 3; g.P.dashHit = undefined; g.v26b.flags.lcd = 0; g.P.kickT = 0; g.v26b.kick(); return g.v26b.state().lunging; });
await until(() => !__game.v26b.state().lunging, 2); await gwait(0.1);
const a5b = await after(); await ev(() => { __game.mods().dashDmg = 0; });
ok(k5b && a5b.dead && !a5b.st.err, 'flygsparken med rusningsskada (utan tidigare rusning) ' + JSON.stringify({ k5b, a5b }));

// 6) av-flaggan
await scene({ dist: 3.5 }); await gwait(0.3); await stagger(); await ev(() => __game.v26b.set('lunge', false));
const k6 = await kickNow(); await gwait(0.4); const a6 = await after();
ok(!k6.lunging && !a6.dead, 'med flygsparken av blir det vanlig spark ' + JSON.stringify({ k6, a6 }));
await ev(() => __game.v26b.set('lunge', true));
const err = await ev(() => __game.v26b.state().err);
ok(!err, 'inga fel i V26B ' + (err || ''));
await ev(() => clearInterval(window.__hold));
await done();
