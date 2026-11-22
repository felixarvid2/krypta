import { setup } from './head.mjs';
const { pg, shot, ev, wait, ok, done } = await setup(8893, 'out/t67');
await pg.goto('http://localhost:8893/index.html?nolock=1'); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 60000 });
await ev(() => { __game.profile.tutDone = true; __game.profile.wkills = { rifle: 10 }; __game.beginHub(); }); await wait(1500);
ok(await ev(() => __game.ents().filter(e => e.dummy).length) === 3, 'tre provdockor');
await ev(() => { const g = __game, P = g.P, d = g.ents().find(e => e.dummy); P.x = 18.5; P.y = 15.5; P.a = Math.atan2(d.y - P.y, d.x - P.x); g.switchWeapon(g.WEAPONS.findIndex(w => w.id === 'rifle')); }); await wait(900);
await pg.mouse.move(480, 300); await pg.mouse.down(); await wait(2000); await pg.mouse.up(); await wait(200); await shot('dps');
ok(await ev(() => __game.ents().filter(e => e.dummy && !e.dead).length) === 3, 'dockorna står kvar');
await done();
