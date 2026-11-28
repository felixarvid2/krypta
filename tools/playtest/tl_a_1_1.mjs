// arenavågor skapas bara på rutor som nås från spelaren: ingen fiende i en avskuren ficka inom arenarektangeln
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/tl_a_1_1');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => {
  const g = __game; g.profile.tutDone = true; const W = 32, H = 24, grid = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  for (let x = 9; x <= 20; x++) { grid[5][x] = '1'; grid[15][x] = '1'; } for (let y = 5; y <= 15; y++) { grid[y][9] = '1'; grid[y][20] = '1'; }
  grid[10][9] = '.'; // dörröppningen
  for (let y = 6; y <= 14; y++) grid[y][14] = '1'; // fickan x=15..19 skärs av från arenans inre x=10..13
  grid[10][20] = '.'; // fickan når utsidan, men den öppningen är ingen arenadörr
  grid[20][3] = 'P'; grid[2][28] = 'x';
  g.playCustom({ grid, biome: 'dungeon' });
});
await wait(1500);
await ev(() => { __game.arenasRef().push({ x0: 10, y0: 6, x1: 19, y1: 14, doors: [{ x: 9, y: 10 }], waves: 3, state: 'idle', wave: 0, alive: [], t: 0 }); const P = __game.P; P.x = 11.5; P.y = 7.5; });

const poll = async (f, arg, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(f, arg)) return true; await wait(100); } return !!(await ev(f, arg)); };
const waveUp = n => { const g = __game, a = g.arenaCurRef(); return !!a && a.wave === n && g.ents().some(e => e.arena && !e.dead); };
for (let w = 1; w <= 3; w++) {
  const up = await poll(waveUp, w, 8000);
  ok(up, `våg ${w} startar ` + await ev(() => { const a = __game.arenaCurRef(); return a ? 'våg=' + a.wave : 'ingen arena'; }));
  // fienderna står still och gör ingen skada (det är placeringen som testas)
  await ev(() => { for (const e of __game.ents()) if (e.arena && !e.dead) e.d = { ...e.d, speed: 0, dmg: 0 }; });
  await wait(300);
  const info = await ev(() => __game.ents().filter(e => e.arena && !e.dead).map(e => [+e.x.toFixed(2), +e.y.toFixed(2)]));
  ok(info.length >= 3, `våg ${w}: minst 3 levande arenafiender (${info.length})`);
  ok(info.length > 0 && info.every(([x]) => x < 14), `våg ${w}: ingen arenafiende i fickan (x<14) ` + JSON.stringify(info));
  await ev(() => __game.killAllCheat());
  if (!await poll(() => !__game.ents().some(e => e.arena && !e.dead), null, 1500)) await ev(() => __game.killAllCheat());
}
const cleared = await poll(() => __game.arenaCurRef() === null && __game.arenasRef()[0] && __game.arenasRef()[0].state === 'done', null, 6000);
ok(cleared, 'arenan är rensad efter tre vågor ' + await ev(() => { const a = __game.arenasRef()[0]; return a ? a.state + ' våg=' + a.wave : 'saknas'; }));
await done();
