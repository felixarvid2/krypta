import { setup } from './head.mjs';
const { pg, shot, ev, wait, ok, start, done, gwait, until } = await setup(8880, 'out/t50');
await start('&seed=4242&biome=dungeon');
ok(await ev(() => __game.state()) === 'play', 'spelar');
// talanger
// version 29: talangkorten öppnas av talentTick först efter 30 bildrutor i 'play' (räknat i bildrutor, inte tid), ett kort i taget.
// Med låg bildfrekvens tar det upp till 1,5 s speltid per kort, så en fast väntan och tolv varv à 0,45 s räckte inte alltid: ett kort
// var kvar (talentQ 1) och öppnades mitt i fiendeprovet nedan (state 'ui' – 'fiender kör utan fel' föll). Nu väntas det tills kortet syns.
await ev(() => { __game.gainXp(500); }); await until(() => document.querySelectorAll('.cu-tcard').length >= 3, 5); await shot('talent');
const nOpt = await ev(() => document.querySelectorAll('.cu-tcard').length);
ok(nOpt >= 3, 'talangval visas (' + nOpt + ')');
for (let i = 0; i < 12 && await ev(() => CardUI.isOpen() || (__game.run().talentQ || 0) > 0); i++) { await until(() => CardUI.isOpen() && !!document.querySelector('.cu-tcard'), 5); await gwait(0.2); await ev(() => { const c = document.querySelector('.cu-tcard'); if (c) c.click(); }); await gwait(0.1); }
ok(await ev(() => Object.keys(__game.run().talents || {}).length >= 1), 'talang vald: ' + await ev(() => JSON.stringify(__game.run().talents)));

// vapen
const W = await ev(() => __game.WEAPONS.map(w => w.id));
for (const id of ['harpoon', 'boomerang', 'prism']) {
  await ev(id => { const g = __game, P = g.P, i = g.WEAPONS.findIndex(w => w.id === id); P.has[i] = true; P.ammo.harpoons = 10; P.ammo.crystals = 60; P.mags[i] = g.WEAPONS[i].mag; for (const e of g.ents()) e.dead = true; const e = g.spawnEnemy('S', P.x + Math.cos(P.a) * 3, P.y + Math.sin(P.a) * 3); e.hp = e.maxHp = 300; e.d = { ...e.d, speed: 0 }; window.__t = e; g.switchWeapon(i); }, id);
  await gwait(0.9); await pg.mouse.move(480, 300);
  const pre = await ev(() => { const g = __game, P = g.P, e = window.__t, off = Math.atan2(Math.sin(Math.atan2(e.y - P.y, e.x - P.x) - P.a), Math.cos(Math.atan2(e.y - P.y, e.x - P.x) - P.a)); return [g.state(), g.WS.state, g.WEAPONS[P.weapon].id, P.mags[P.weapon], off.toFixed(2), Math.hypot(e.x - P.x, e.y - P.y).toFixed(2), g.hasLOS(P.x, P.y, e.x, e.y)].join(); });
  await pg.mouse.down(); await gwait(0.12); await pg.mouse.up(); await gwait(1.6);
  const hp = await ev(() => window.__t.hp); ok(hp < 300, `${id} träffar (${Math.round(hp)})` + (hp < 300 ? '' : ' före skottet: ' + pre + ' efter: ' + await ev(() => [__game.WS.state, __game.P.mags[__game.P.weapon]].join()))); await shot('w_' + id);
}
ok(await ev(() => __game.P.mags[__game.WEAPONS.findIndex(w => w.id === 'boomerang')]) === 1, 'bumerangen kommer tillbaka');
// knivar drar en kniv per kast
await ev(() => { const g = __game, P = g.P, i = g.WEAPONS.findIndex(w => w.id === 'knives'); P.has[i] = true; P.mags[i] = 6; g.switchWeapon(i); }); await gwait(0.9);
await pg.mouse.down(); await gwait(0.08); await pg.mouse.up(); await gwait(0.4);
ok(await ev(() => __game.P.mags[__game.WEAPONS.findIndex(w => w.id === 'knives')]) === 5, 'en kniv per kast (' + await ev(() => __game.P.mags[__game.WEAPONS.findIndex(w => w.id === 'knives')]) + ')');
// nya fiender kör sitt beteende
await ev(() => { const g = __game, P = g.P; for (const e of g.ents()) e.dead = true; ['Ë', 'Í', 'Ï', 'Ú', 'Û', 'Ā', 'Ă'].forEach((k, i) => { const a = P.a + (i - 3) * 0.2; const e = g.spawnEnemy(k, P.x + Math.cos(a) * 4, P.y + Math.sin(a) * 4); e.alert = true; }); });
await gwait(4); await shot('enemies');
{ const st = await ev(() => [__game.state(), (window.CardUI && CardUI.isOpen()) ? 'kort' : '', __game.run().talentQ || 0].join()); ok(st.startsWith('play,') || st.startsWith('dead,'), 'fiender kör utan fel (' + st + ')'); }
// Avgrunden
await ev(() => { __game.showTitle(); }); await gwait(0.3);
await ev(() => { __game.beginAbyss(); }); await gwait(1.5);
ok(await ev(() => __game.run().abyss && __game.run().depth === 1), 'Avgrunden startar');
await done();
