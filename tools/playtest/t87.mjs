// arenaskyddet: en lång strid där fienderna tar skada släpper inte; en gömd våg utan framsteg släpper
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/t87');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => {
  const g = __game; g.profile.tutDone = true; const W = 32, H = 24, grid = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  for (let x = 9; x <= 20; x++) { grid[5][x] = '1'; grid[15][x] = '1'; } for (let y = 5; y <= 15; y++) { grid[y][9] = '1'; grid[y][20] = '1'; }
  grid[10][9] = 'D'; grid[20][3] = 'P'; grid[2][28] = 'x'; grid[20][24] = 'S'; grid[20][26] = 'K';
  g.playCustom({ grid, biome: 'dungeon' });
});
await wait(1500);
await ev(() => { __game.arenasRef().push({ x0: 10, y0: 6, x1: 19, y1: 14, doors: [{ x: 9, y: 10 }], waves: 2, state: 'idle', wave: 0, alive: [], t: 0 }); const P = __game.P; P.x = 11.5; P.y = 7.5; });
await wait(2500);
ok(await ev(() => __game.arenaCurRef() && __game.arenaCurRef().wave === 1), 'våg 1');
await ev(() => { for (const e of __game.ents()) if (e.arena) { e.hp = e.maxHp = 1e6; e.d = { ...e.d, speed: 0, dmg: 0 }; } });
// 60 s strid med lite skada var 5:e sekund (påskyndat: dt-loopen går i realtid, så vi kör 60 s)
for (let i = 0; i < 12; i++) { await ev(() => { for (const e of __game.ents()) if (e.arena && !e.dead) e.hp -= 10; }); await wait(5000); }
ok(await ev(() => __game.arenaCurRef() && __game.arenaCurRef().alive.length > 0 && __game.arenaCurRef().wave === 1), 'en lång strid med framsteg släpper inte');
await ev(() => { for (const e of __game.ents()) if (e.arena && !e.dead) { e.hidden = true; e.d = { ...e.d, ai: 'eel' }; } });
await wait(29000);
ok(await ev(() => __game.arenaCurRef() === null || __game.arenaCurRef().wave === 2 || __game.arenaCurRef().alive.every(e => !e.hidden)), 'en gömd våg utan framsteg släpper efter 25 s');
await done();
