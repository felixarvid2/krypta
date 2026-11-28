import { setup } from './head.mjs';
const { pg, shot, ev, wait, ok, start, done } = await setup(8899, 'out/t71');
await start('&seed=71&biome=dungeon&god=1');
await ev(() => { const g = __game, P = g.P; for (const e of g.ents()) e.dead = true; ['Ō', 'Ŏ', 'ŏ', 'Ő', 'ő'].forEach((k, i) => { const a = P.a + (i - 2) * 0.22, e = g.spawnEnemy(k, P.x + Math.cos(a) * 3.4, P.y + Math.sin(a) * 3.4); e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0 }; }); g.run().pet = 'owl'; g.giveLegend('frostrifle', 'TEST'); g.switchWeapon(g.WEAPONS.findIndex(w => w.id === 'rifle')); });
await wait(1500); await shot('v10');
await done();
