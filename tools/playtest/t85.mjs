// v16 visuell kontroll: fiender, sax (kast), drömstav
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t85');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => {
  const g = __game; g.profile.tutDone = true;
  const W = 24, H = 16, grid = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[8][3] = 'P'; grid[2][22] = 'x'; ['ƫ', 'Ƭ', 'ƭ', 'Ʈ', 'Ư', 'ư'].forEach((c, i) => { grid[3 + i * 2][10 + (i % 2) * 2] = c; });
  grid[3][16] = 'Ƨ'; grid[6][17] = 'ƨ'; grid[9][17] = 'Ʃ'; grid[12][16] = 'ƪ'; grid[8][6] = 'ƥ'; grid[10][6] = 'Ʀ';
  g.playCustom({ grid, biome: 'dungeon' });
});
await wait(1500);
await ev(() => { for (const e of __game.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } const P = __game.P; P.x = 3.5; P.y = 8.5; P.a = 0; });
await wait(4000); await shot('enemies');
const idx = await ev(() => Object.fromEntries(['shears', 'dreamstaff'].map(id => [id, __game.WEAPONS.findIndex(w => w.id === id)])));
await ev(i => { const g = __game; for (const k of Object.values(i)) { g.P.has[k] = true; g.P.mags[k] = g.WEAPONS[k].mag; } g.P.ammo.dreams = 10; g.switchWeapon(i.shears); }, idx);
await wait(800); await shot('shears');
await ev(() => { __game.setMouse(false, true); }); await wait(120); await shot('shears_throw'); await ev(() => __game.setMouse(false, false)); await wait(300); await shot('shears_empty');
ok(await ev(() => __game.P.shearOut), 'saxen i luften');
await wait(1500); await ev(i => __game.switchWeapon(i.dreamstaff), idx); await wait(800); await shot('dreamstaff');
await ev(() => { __game.P.x = 6.5; __game.P.y = 8.5; }); await wait(600); await shot('thorns_hud');
ok(true, 'bilder'); await done();
