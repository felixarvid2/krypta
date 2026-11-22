import { setup } from './head.mjs';
const { pg, shot, ev, wait, ok, start, done } = await setup(8896, 'out/t69');
await start('&seed=69&biome=dungeon&god=1');
await ev(() => { __game.giveLegend('dragonshotgun', 'TEST'); const g = __game, P = g.P; g.switchWeapon(g.WEAPONS.findIndex(w => w.id === 'shotgun')); P.ammo.shells = 40; for (const e of g.ents()) e.dead = true; const e = g.spawnEnemy('S', P.x + Math.cos(P.a) * 2.5, P.y + Math.sin(P.a) * 2.5); e.hp = e.maxHp = 400; e.d = { ...e.d, speed: 0 }; window.__t = e; });
await wait(900); await pg.mouse.move(480, 300); await pg.mouse.down(); await wait(100); await pg.mouse.up(); await wait(400); await shot('legend');
ok(await ev(() => window.__t.burn > 0 && window.__t.hp < 400), 'Drakbössan sätter fyr (' + Math.round(await ev(() => window.__t.hp)) + ')');
// nya fiender
await ev(() => { const g = __game, P = g.P; for (const e of g.ents()) e.dead = true; ['Ō', 'ō', 'Ŏ', 'ŏ', 'Ő', 'ő'].forEach((k, i) => { const a = P.a + (i - 2.5) * 0.3, e = g.spawnEnemy(k, P.x + Math.cos(a) * 4, P.y + Math.sin(a) * 4); e.alert = true; }); });
await wait(6000); await shot('enemies'); ok(await ev(() => __game.state()) === 'play', 'nya fiender kör');
// följeslagare
for (const id of ['firefly', 'minigolem', 'owl']) { await ev(id => { __game.run().pet = id; }, id); await wait(1500); }
ok(await ev(() => __game.pet() && __game.pet().id) === 'owl', 'följeslagarna byts utan fel');
await done();
