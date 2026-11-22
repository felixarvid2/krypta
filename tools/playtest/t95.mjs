// igeln: fäster sig, skakas av med tre hopp, fäster sig igen av sig själv
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/t95');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => { const g = __game; g.profile.tutDone = true; const W = 20, H = 12, grid = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[6][4] = 'P'; grid[2][18] = 'x'; grid[6][7] = 'ȿ'; g.playCustom({ grid, biome: 'dungeon' }); });
await wait(1500);
await ev(() => { const g = __game, P = g.P; P.hp = 100; P.a = 0; const e = g.ents().find(o => o.type === 'ȿ'); e.alert = true; e.sleep = false; window.__lc = e; });
let t = 0; while (t < 6000 && !(await ev(() => __game.P.leech === window.__lc))) { await wait(250); t += 250; }
ok(await ev(() => __game.P.leech === window.__lc), 'igeln fäster sig (' + t + ' ms)');
for (let i = 0; i < 3; i++) { await ev(() => { __game.P.stam = 1; }); await pg.keyboard.press('Space'); await wait(750); }
ok(await ev(() => !__game.P.leech), 'tre hopp skakar av den');
t = 0; while (t < 8000 && !(await ev(() => __game.P.leech === window.__lc))) { await wait(250); t += 250; }
ok(await ev(() => __game.P.leech === window.__lc), 'den fäster sig igen av sig själv (' + t + ' ms) ' + await ev(() => { const e = window.__lc, P = __game.P; return [e.dead, e.state, (e.stun || 0).toFixed(2), e.attached, Math.hypot(e.x - P.x, e.y - P.y).toFixed(2), e.feud ? 'F' : ''].join(); }));
await done();
