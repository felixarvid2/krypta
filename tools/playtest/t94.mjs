// arenagaller: en fiende som står i öppningen knuffas ut och gallret stängs
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/t94');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => {
  const g = __game; g.profile.tutDone = true; const W = 32, H = 24, grid = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  for (let x = 9; x <= 20; x++) { grid[5][x] = '1'; grid[15][x] = '1'; } for (let y = 5; y <= 15; y++) { grid[y][9] = '1'; grid[y][20] = '1'; }
  grid[10][9] = '.'; grid[15][14] = '.'; grid[20][3] = 'P'; grid[2][28] = 'x'; grid[15][14] = 'S';
  g.playCustom({ grid, biome: 'dungeon' });
});
await wait(1500);
await ev(() => { for (const e of __game.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } __game.arenasRef().push({ x0: 10, y0: 6, x1: 19, y1: 14, doors: [{ x: 9, y: 10 }, { x: 14, y: 15 }], waves: 2, state: 'idle', wave: 0, alive: [], t: 0 }); const P = __game.P; P.x = 14.5; P.y = 10.5; });
await wait(2500);
ok(await ev(() => !!__game.arenaCurRef()), 'arenan startar');
ok(await ev(() => __game.solid(9.5, 10.5) && __game.solid(14.5, 15.5)), 'båda gallren stängs trots fienden i öppningen ' + await ev(() => [__game.solid(9.5, 10.5), __game.solid(14.5, 15.5)].join()));
ok(await ev(() => { const e = __game.ents().find(o => o.type === 'S'); return e && !(Math.abs(e.x - 14.5) < 0.8 && Math.abs(e.y - 15.5) < 0.8); }), 'fienden är knuffad ur öppningen');
// en arenafiende går in i öppningen under striden: gallret ska stängas igen
await ev(() => { const e = __game.ents().find(o => o.arena && !o.dead); if (e) { e.x = 9.5; e.y = 10.5; } }); await wait(1500);
ok(await ev(() => __game.solid(9.5, 10.5)), 'gallret är stängt igen efter att en fiende stått i det');
await done();
