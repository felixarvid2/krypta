import { setup } from './head.mjs';
const { pg, shot, ev, wait, ok, start, done } = await setup(8880, 'out/t50');
await start('&seed=4242&biome=dungeon');
ok(await ev(() => __game.state()) === 'play', 'spelar');
// talanger
await ev(() => { __game.gainXp(500); }); await wait(1500); await shot('talent');
const nOpt = await ev(() => document.querySelectorAll('.cu-tcard').length);
ok(nOpt >= 3, 'talangval visas (' + nOpt + ')');
for (let i = 0; i < 12 && await ev(() => CardUI.isOpen() || (__game.run().talentQ || 0) > 0); i++) { await wait(450); await ev(() => { const c = document.querySelector('.cu-tcard'); if (c) c.click(); }); }
ok(await ev(() => Object.keys(__game.run().talents || {}).length >= 1), 'talang vald: ' + await ev(() => JSON.stringify(__game.run().talents)));

// vapen
const W = await ev(() => __game.WEAPONS.map(w => w.id));
for (const id of ['harpoon', 'boomerang', 'prism']) {
  await ev(id => { const g = __game, P = g.P, i = g.WEAPONS.findIndex(w => w.id === id); P.has[i] = true; P.ammo.harpoons = 10; P.ammo.crystals = 60; P.mags[i] = g.WEAPONS[i].mag; for (const e of g.ents()) e.dead = true; const e = g.spawnEnemy('S', P.x + Math.cos(P.a) * 3, P.y + Math.sin(P.a) * 3); e.hp = e.maxHp = 300; e.d = { ...e.d, speed: 0 }; window.__t = e; g.switchWeapon(i); }, id);
  await wait(900); await pg.mouse.move(480, 300); await pg.mouse.down(); await wait(120); await pg.mouse.up(); await wait(1600);
  const hp = await ev(() => window.__t.hp); ok(hp < 300, `${id} träffar (${Math.round(hp)})`); await shot('w_' + id);
}
ok(await ev(() => __game.P.mags[__game.WEAPONS.findIndex(w => w.id === 'boomerang')]) === 1, 'bumerangen kommer tillbaka');
// knivar drar en kniv per kast
await ev(() => { const g = __game, P = g.P, i = g.WEAPONS.findIndex(w => w.id === 'knives'); P.has[i] = true; P.mags[i] = 6; g.switchWeapon(i); }); await wait(900);
await pg.mouse.down(); await wait(80); await pg.mouse.up(); await wait(400);
ok(await ev(() => __game.P.mags[__game.WEAPONS.findIndex(w => w.id === 'knives')]) === 5, 'en kniv per kast (' + await ev(() => __game.P.mags[__game.WEAPONS.findIndex(w => w.id === 'knives')]) + ')');
// nya fiender kör sitt beteende
await ev(() => { const g = __game, P = g.P; for (const e of g.ents()) e.dead = true; ['Ë', 'Í', 'Ï', 'Ú', 'Û', 'Ā', 'Ă'].forEach((k, i) => { const a = P.a + (i - 3) * 0.2; const e = g.spawnEnemy(k, P.x + Math.cos(a) * 4, P.y + Math.sin(a) * 4); e.alert = true; }); });
await wait(4000); await shot('enemies');
ok(await ev(() => __game.state()) === 'play' || await ev(() => __game.state()) === 'dead', 'fiender kör utan fel');
// Avgrunden
await ev(() => { __game.showTitle(); }); await wait(300);
await ev(() => { __game.beginAbyss(); }); await wait(1500);
ok(await ev(() => __game.run().abyss && __game.run().depth === 1), 'Avgrunden startar');
await done();
