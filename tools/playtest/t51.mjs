import { setup } from './head.mjs';
const { pg, shot, ev, wait, ok, done } = await setup(8882, 'out/t51');
await pg.goto('http://localhost:8882/index.html?nolock=1'); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 60000 });
await ev(() => { __game.profile.tutDone = true; __game.profile.bossWins = { demon: 1, ogre: 2 }; }); await pg.click('#moremodesbtn'); await pg.click('#hubbtn'); await wait(2500);
ok(await ev(() => __game.state()) === 'play' && await ev(() => __game.run().hub), 'lägret öppnas');
ok(await ev(() => __game.portals().filter(p => p.kind === 'mode').length) >= 5, 'portaler till lägena: ' + await ev(() => __game.portals().map(p => p.mode).join(',')));
await shot('hub');
// gå till arkivarien och använd
await ev(() => { const P = __game.P; P.x = 8.5; P.y = 11.3; P.a = -Math.PI / 2; }); await wait(300); await pg.keyboard.press('KeyE'); await wait(500); await shot('archive');
ok(await ev(() => CardUI.isOpen()), 'arkivarien svarar');
await pg.click('.cu-opt >> nth=0'); await wait(500); await pg.keyboard.press('Escape'); await wait(700);
ok(await ev(() => __game.state()) === 'play', 'tillbaka i lägret efter menyn (' + await ev(() => __game.state()) + ')');
// gå in i avgrundsportalen
await ev(() => { const p = __game.portals().find(p => p.mode === 'abyss'); __game.enterPortal(p); }); await wait(1500);
ok(await ev(() => __game.run().abyss), 'portalen startar Avgrunden');
await done();
