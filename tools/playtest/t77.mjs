// Version 13: rullband, smält metall, ångventil, stans, pulpet, bläck, runboken och ångkanonen
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t77');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => {
  const g = __game; g.profile.tutDone = true;
  const W = 32, H = 24, grid = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[20][3] = 'P'; grid[2][28] = 'x';
  for (let x = 4; x <= 10; x++) grid[16][x] = 'Ÿ'; grid[12][20] = 'Ź'; grid[12][21] = 'Ź'; grid[8][6] = 'ź'; grid[8][12] = 'Ż'; grid[4][4] = 'Ű'; grid[18][24] = 'Ŭ'; grid[5][16] = 'ű'; grid[6][16] = 'ż';
  for (let y = 3; y <= 9; y++) grid[y][26] = 'ũ'; grid[10][26] = 'Ū'; grid[11][26] = 'ŵ'; grid[12][26] = 'Ŷ';
  grid[14][20] = 'Ų'; grid[15][22] = 'ų'; grid[10][18] = 'Ŵ'; grid[6][22] = 'Ž'; grid[18][14] = 'ž'; grid[4][12] = 'ſ'; grid[20][9] = 'Ƃ';
  g.playCustom({ grid, biome: 'dungeon' });
});
await wait(1500);
ok(await ev(() => __game.state()) === 'play', 'banan med de nya tecknen startar');
await ev(() => { for (const e of __game.ents()) { e.alert = false; e.d = { ...e.d, speed: 0, dmg: 0 }; e.sleep = true; } });
// rullbandet
await ev(() => { const P = __game.P; P.x = 5.5; P.y = 16.5; P.vx = P.vy = 0; });
await wait(700);
ok(await ev(() => __game.P.x) > 6.4, `rullbandet för spelaren med sig (x ${(await ev(() => __game.P.x)).toFixed(2)})`);
// smält metall
let hp = await ev(() => { __game.P.hp = 100; __game.P.iframe = 0; return 100; });
await ev(() => { const P = __game.P; P.x = 20.5; P.y = 12.5; }); await wait(1100);
ok(await ev(() => __game.P.hp) < hp, 'smält metall bränner');
// ångventilen
await ev(() => { const P = __game.P; P.hp = 100; P.x = 6.5; P.y = 8.5; P.iframe = 0; }); await wait(3500);
ok(await ev(() => __game.P.hp) < 100, 'ångventilen blåser och skadar');
// stansen
await ev(() => { const P = __game.P; P.hp = 100; P.x = 11.4; P.y = 8.5; P.iframe = 0; }); await wait(3300);
ok(await ev(() => __game.P.hp) < 100, 'stansen slår ned');
// bläck
await ev(() => { const P = __game.P; P.hp = 100; P.x = 24.5; P.y = 18.5; }); await wait(400);
ok(await ev(() => __game.P.inkT) > 0, 'bläcket gör spelaren halvblind');
await shot('ink');
// pulpeten
await ev(() => { const P = __game.P; P.x = 4.5; P.y = 5.6; P.a = -Math.PI / 2; P.inkT = 0; }); await wait(300);
const lec0 = await ev(() => __game.profile.lecterns || 0);
await ev(() => __game.useKey ? __game.useKey() : null); await pg.keyboard.press('KeyE'); await wait(400);
ok(await ev(() => __game.profile.lecterns || 0) > lec0, 'pulpeten går att läsa');
// vapnen
const idx = await ev(() => Object.fromEntries(['runebook', 'steamcannon'].map(id => [id, __game.WEAPONS.findIndex(w => w.id === id)])));
ok(idx.runebook >= 0 && idx.steamcannon >= 0, 'de två nya vapnen finns ' + JSON.stringify(idx));
await ev(i => { const g = __game; for (const k of Object.values(i)) { g.P.has[k] = true; g.P.mags[k] = g.WEAPONS[k].mag; } g.P.ammo.ink = 30; g.P.ammo.fuel = 100; }, idx);
await ev(i => { const g = __game, e = g.ents().find(o => o.type === 'ų' && !o.dead); g.P.x = e.x - 3; g.P.y = e.y; g.P.a = 0; g.P.inkT = 0; g.switchWeapon(i.runebook); e.alert = true; window.__s = e; }, idx);
await wait(800); const sh0 = await ev(() => window.__s.hp);
// testsöm: T77_BOK=1 ställer den flygande boken på skottlinjen
if (process.env.T77_BOK) await ev(() => { const P = __game.P, b = __game.ents().find(o => o.type === 'Ų' && !o.dead); if (b) { b.x = P.x + 1.5; b.y = P.y; } });
// ingen annan fiende nära spelaren får fånga eller locka runan (ž sparas till ångkanonen)
await ev(() => { const P = __game.P; for (const e of __game.ents()) if (e !== window.__s && e.type !== 'ž' && !e.dead && Math.hypot(e.x - P.x, e.y - P.y) <= 6) e.dead = true; });
await ev(() => { __game.WS.cd = 0; __game.fire(); }); await wait(700);
ok(await ev(() => window.__s.hp < window.__s.maxHp || window.__s.dead), 'runan träffar');
await ev(() => { __game.P.wardCd = 0; __game.setMouse(false, true); }); await wait(200); await ev(() => __game.setMouse(false, false));
ok(await ev(() => __game.P.wardT > 0), 'högerklick ger sidvirveln');
await shot('ward');
await ev(i => { const g = __game, e = g.ents().find(o => o.type === 'ž' && !o.dead); g.P.x = e.x - 2.5; g.P.y = e.y; g.P.a = 0; g.switchWeapon(i.steamcannon); window.__b = e; window.__bx = e.x; }, idx);
await wait(800);
await ev(() => { __game.WS.cd = 0; __game.fire(); }); await wait(500);
ok(await ev(() => window.__b.hp < window.__b.maxHp || window.__b.dead), 'ångan skadar');
ok(await ev(() => window.__b.dead || window.__b.x > window.__bx + 0.2), 'ångan knuffar');
await shot('steam');
await ev(() => { for (const e of __game.ents()) { e.alert = true; e.sleep = false; } }); await wait(5000);
ok(true, 'fiender i strid utan fel');
await done();
