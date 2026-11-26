// t139: version 27 (BLOOD) – före/efter-bilder. Samma scen (fem fiender av olika material vid en vägg, två träffar och ett dödande
// var, den sista med överdöd) med BLOOD av (v27b.set(false): som version 26) och på (MYCKET), samt BLOD AV. Bilderna sparas i
// out/t139 (fore_*, efter_*, av_*). Kontroll: med BLOOD på finns stänk på väggen och fler golvfläckar än förut; BLOD AV har inga.
import { setup } from './head.mjs';
const PORT = 9839;
const { pg, ev, wait, ok, shot, done } = await setup(PORT, 'out/t139');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const gt = () => ev(() => __game.v27b.t());
const gwait = async sec => { const t0 = await gt(), w0 = Date.now(); while ((await gt()) - t0 < sec && Date.now() - w0 < 60000) await wait(60); }; // speltid
const run = async (mode) => {
  await ev(mode => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = false; g.settings.blood = mode === 'av' ? 0 : 2; g.gfxE.set(true); g.v27b.set(mode !== 'fore');
    const W = 14, H = 9, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
    grid[4][8] = 'P'; grid[1][1] = 'x'; g.playCustom({ grid, biome: 'dungeon' }); g.ents().length = 0; clearInterval(window.__hold);
    for (const [t, y] of [['Ä', 2.5], ['U', 3.5], ['W', 4.5], ['Å', 5.5], ['L', 6.5]]) { const e = g.spawnEnemy(t, 12.5, y); e.d = { ...e.d, dmg: 0, speed: 0 }; e.alert = true; }
    g.P.hp = 1e6; g.P.a = 0; g.P.pitch = 0; window.__hold = setInterval(() => { __game.P.hp = 1e6; __game.P.x = 8.5; __game.P.y = 4.5; __game.P.a = 0; }, 30); }, mode);
  await gwait(0.8);
  await ev(() => { const g = __game; for (const e of g.ents()) for (let i = 0; i < 2; i++) { e.v27jT = -9; g.hurtEnemy(e, 0.4, e.x, e.y); } });
  await gwait(0.25); await ev(() => { const g = __game, E = g.ents(); E.forEach((e, i) => g.hurtEnemy(e, e.hp + (i === 2 ? 999 : 0.5), e.x, e.y)); });
  await gwait(0.2); await shot(mode + '_1'); await gwait(1.5); await shot(mode + '_2');
  return ev(() => { const g = __game, D = g.v27b.decalArr(); let marks = 0; for (const a of g.v27b.wallMarks().values()) marks += a.filter(m => m.kind === 'blood' || m.v27).length; return { marks, decals: D.length }; });
};
const fore = await run('fore'), efter = await run('efter'), av = await run('av');
console.log('BILDER', JSON.stringify({ fore, efter, av }));
ok(efter.marks >= 3 && efter.decals > fore.decals, 'BLOOD på: stänk på väggen och fler golvfläckar än förut ' + JSON.stringify({ fore, efter }));
ok(av.marks === 0, 'BLOD AV: inga stänk ' + JSON.stringify(av));
await ev(() => { clearInterval(window.__hold); __game.settings.blood = 2; });
await done();
