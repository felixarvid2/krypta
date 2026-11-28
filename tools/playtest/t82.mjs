// v15 visuell kontroll: korgosse, kerub, larv, rökelsekar, bikupekastare och bossar i katedral/bikupa
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t82');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
for (const [biome, chars] of [['cathedral', ['Ƒ', 'ƒ', 'Ɯ']], ['hive', ['Ƙ', 'ƙ', 'ƚ']]]) {
  await ev(([biome, chars]) => {
    const g = __game; g.profile.tutDone = true;
    const W = 24, H = 16, grid = [];
    for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
    grid[8][3] = 'P'; grid[2][22] = 'x'; chars.forEach((c, i) => { grid[6 + i * 2][9 + i] = c; });
    grid[4][14] = biome === 'cathedral' ? 'Ə' : 'Ɨ'; grid[12][14] = biome === 'cathedral' ? 'Ɛ' : 'Ɩ'; grid[8][16] = biome === 'cathedral' ? 'ƍ' : 'Ɩ';
    g.playCustom({ grid, biome });
  }, [biome, chars]);
  await wait(1500);
  await ev(() => { for (const e of __game.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } const P = __game.P; P.x = 3.5; P.y = 8.5; P.a = 0; });
  await wait(500); await shot(biome + '_enemies');
}
const idx = await ev(() => Object.fromEntries(['censer', 'hivelauncher'].map(id => [id, __game.WEAPONS.findIndex(w => w.id === id)])));
await ev(i => { const g = __game; for (const k of Object.values(i)) { g.P.has[k] = true; g.P.mags[k] = g.WEAPONS[k].mag; } g.P.ammo.hives = 10; g.switchWeapon(i.censer); }, idx);
await wait(800); await shot('censer');
await ev(i => __game.switchWeapon(i.hivelauncher), idx); await wait(800); await shot('hivelauncher');
await ev(() => { __game.WS.cd = 0; __game.fire(); }); await wait(200); await shot('hivefire');
for (const id of ['cardinal', 'queenbee']) { await ev(id => __game.practiceBoss && __game.practiceBoss(id), id); await wait(2500); await shot('boss_' + id); }
ok(true, 'bilder tagna'); await done();
