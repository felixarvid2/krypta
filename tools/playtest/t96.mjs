// björnsaxen på avstånd: en jagande fiende kliver i saxen
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/t96');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
let caught = 0;
for (const [type, dy] of [['S', 0], ['K', 0], ['Ɂ', 0], ['Ⱦ', 0.3], ['ɀ', -0.3]]) {
  await ev(([type]) => { const g = __game; g.profile.tutDone = true; const W = 24, H = 9, grid = [];
    for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
    grid[4][3] = 'P'; grid[1][22] = 'x'; grid[4][16] = type; g.playCustom({ grid, biome: 'dungeon' }); }, [type]);
  await wait(1200);
  await ev(() => { const g = __game, P = g.P, i = g.WEAPONS.findIndex(w => w.id === 'trapthrower'); P.has[i] = true; P.mags[i] = 4; P.ammo.traps = 8; g.switchWeapon(i); P.a = 0; for (const e of g.ents()) { e.alert = false; e.sleep = true; } });
  await wait(1200); await ev(() => { __game.WS.cd = 0; __game.fire(); }); await wait(1500);
  const tr = await ev(() => __game.v20().traps.map(t => [t.x.toFixed(1), t.y.toFixed(1), t.armed]));
  await ev(dy => { const g = __game; for (const e of g.ents()) { e.y += dy; e.alert = true; e.sleep = false; e.d = { ...e.d, dmg: 0 }; } }, dy);
  let got = false, path = []; for (let t = 0; t < 14000 && !got; t += 250) { await wait(250); got = await ev(() => __game.v20().traps.some(t => t.e) || __game.ents().every(e => e.dead)); if (t % 1000 === 0) path.push(await ev(() => __game.ents().filter(e => !e.dead).map(e => e.x.toFixed(1) + ',' + e.y.toFixed(1) + ':' + e.state).join(' '))); } console.log(path.join(' | '));
  console.log(type, 'sax', JSON.stringify(tr), 'fångad', got); if (got) caught++;
}
ok(caught >= 4, `fienderna kliver i saxen (${caught} av 5)`);
await done();
