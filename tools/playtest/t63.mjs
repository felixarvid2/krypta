import { setup } from './head.mjs';
const { pg, shot, ev, wait, ok, done } = await setup(8889, 'out/t63');
await pg.goto('http://localhost:8889/index.html?nolock=1&god=1'); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 60000 });
await ev(() => { __game.profile.tutDone = true; __game.beginHub(); }); await wait(1200);
ok(!(await ev(() => __game.portals().some(p => p.mode === 'finale'))), 'ingen slutportal utan alla sidor');
await ev(() => { __game.profile.finaleOpen = true; __game.showTitle(); __game.beginHub(); }); await wait(1200);
ok(await ev(() => __game.portals().some(p => p.mode === 'finale')), 'slutportalen öppnas');
await ev(() => { __game.enterPortal(__game.portals().find(p => p.mode === 'finale')); }); await wait(3500);
ok(await ev(() => __game.boss() && __game.boss().id === 'monk'), 'den förste munken möts');
await shot('monk');
for (const ph of [0.9, 0.5, 0.2]) { await ev(f => { const b = __game.boss(); b.hp = b.maxHp * f; }, ph); await wait(3500); await shot('monk_' + ph); }
ok(await ev(() => __game.state()) === 'play', 'alla tre faserna körs utan fel');
await ev(() => { const b = __game.boss(); __game.hurtEnemy(b, 99999, b.x, b.y, {}); }); await wait(6000);
console.log('efter:', await ev(() => JSON.stringify({ st: __game.state(), portals: __game.portals().map(p => p.kind) })));
await ev(() => { const p = __game.portals()[0]; if (p) __game.enterPortal(p); }); await wait(2500);
ok(await ev(() => __game.profile.finaleWon >= 1), 'segern registreras');
await done();
