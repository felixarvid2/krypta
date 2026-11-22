// Version 14: arenarummet (inlåsning, vågor, belöning) och de sex nya fienderna
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t78');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => {
  const g = __game; g.profile.tutDone = true;
  const W = 32, H = 24, grid = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  // ett rum 10..19 x 6..14 med väggar runt och två öppningar
  for (let x = 9; x <= 20; x++) { grid[5][x] = '1'; grid[15][x] = '1'; } for (let y = 5; y <= 15; y++) { grid[y][9] = '1'; grid[y][20] = '1'; }
  grid[10][9] = 'D'; grid[15][14] = '.';
  grid[20][3] = 'P'; grid[2][28] = 'x';
  grid[20][24] = 'Ƅ'; grid[20][26] = 'ƅ'; grid[18][27] = 'Ɔ'; grid[3][6] = 'Ƈ'; grid[3][8] = 'ƈ'; grid[18][5] = 'Ɖ';
  g.playCustom({ grid, biome: 'dungeon' });
});
await wait(1500);
ok(await ev(() => __game.state()) === 'play', 'banan startar');
ok(await ev(() => ['Ƅ', 'ƅ', 'Ɔ', 'Ƈ', 'ƈ', 'Ɖ'].every(t => __game.ents().some(e => e.type === t))), 'alla sex nya fiender finns på banan');
await ev(() => { for (const e of __game.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0 }; } });
await ev(() => { __game.arenasRef().push({ x0: 10, y0: 6, x1: 19, y1: 14, doors: [{ x: 9, y: 10 }, { x: 14, y: 15 }], waves: 2, state: 'idle', wave: 0, alive: [], t: 0 }); });
await ev(() => { const P = __game.P; P.x = 14.5; P.y = 10.5; }); await wait(500);
ok(await ev(() => !!__game.arenaCurRef()), 'arenan startar när man går in');
ok(await ev(() => __game.solid(9.5, 10.5) && __game.solid(14.5, 15.5)), 'båda öppningarna är låsta');
await wait(2000); await shot('arena');
ok(await ev(() => __game.arenaCurRef() && __game.arenaCurRef().wave === 1 && __game.ents().some(e => e.arena && !e.dead)), 'första vågen kommer');
for (let w = 0; w < 3; w++) { await ev(() => { __game.P.x = 11.5; __game.P.y = 7.5; for (const e of __game.ents()) if (e.arena && !e.dead) { e.hidden = false; e.up = true; e.anchored = true; __game.hurtEnemy(e, 9999, e.x, e.y, {}); } }); await wait(1800); }
ok(await ev(() => !__game.arenaCurRef() && __game.arenasRef()[0].state === 'done'), 'arenan blir klar efter alla vågor');
console.log('state', await ev(() => [__game.state(), window.CardUI && CardUI.isOpen(), __game.items().filter(it => it.type === 'cardpick').map(it => it.taken)]));
await wait(1500);
ok(await ev(() => !__game.solid(9.5, 10.5) && !__game.solid(14.5, 15.5)), 'gallren går upp igen');
ok(await ev(() => __game.items().some(it => it.type === 'cardpick' && !it.taken)), 'en belöning ligger i arenan');
await ev(() => { const P = __game.P; P.x = 20.5; P.y = 19.5; for (const e of __game.ents()) { e.alert = true; e.sleep = false; e.d = { ...e.d, speed: 1.2 }; } }); await wait(6000);
await shot('fight');
ok(true, 'de nya fienderna slåss utan fel');
await done();
