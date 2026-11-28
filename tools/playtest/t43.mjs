import { setup } from './head.mjs';
const { pg, shot, ev, wait, ok, start, done } = await setup(8864, 'out/t43');
await start('&seed=77&biome=tomb');
ok(await ev(() => __game.lvl ? true : true), 'start');
await ev(() => { const g = __game, P = g.P; for (const e of g.ents()) e.dead = true; const t = ['Ã', 'Õ', 'Ê', 'Î', 'Ô']; t.forEach((k, i) => { const a = P.a + (i - 2) * 0.22; const e = g.spawnEnemy(k, P.x + Math.cos(a) * 3.2, P.y + Math.sin(a) * 3.2); e.alert = false; e.d = { ...e.d, speed: 0 }; e.sleep = true; }); });
await wait(600); await shot('enemies');
// hammare laddas
await ev(() => { const g = __game, i = g.WEAPONS ? g.WEAPONS.findIndex(w => w.id === 'hammer') : 15; g.P.has[i] = true; g.switchWeapon ? g.switchWeapon(i) : 0; }); await wait(900);
await pg.mouse.move(480, 300); await pg.mouse.down(); await wait(700); await shot('hammer_charge'); await pg.mouse.up(); await wait(300);
// faraonen
await ev(() => { __game.showTitle(); __game.profile.bestiary = {}; }); await wait(200);
await pg.goto('http://localhost:8864/index.html?nolock=1'); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 60000 });
await ev(() => { __game.profile.tutDone = true; __game.beginBossHunt(); }); await wait(500);
const idx = await ev(() => [...document.querySelectorAll('.cu-opt')].findIndex(e => e.textContent.includes('FARAONEN')));
await pg.click(`.cu-opt >> nth=${idx}`); await wait(3500); await shot('pharaoh');
ok(await ev(() => __game.boss() && __game.boss().d.name === 'FARAONEN'), 'faraonen möts');
await done();
