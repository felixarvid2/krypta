import { setup } from './head.mjs';
const { pg, shot, ev, wait, ok, done } = await setup(8892, 'out/t66');
await pg.goto('http://localhost:8892/index.html?nolock=1&god=1'); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 60000 });
await ev(() => { __game.profile.tutDone = true; __game.profile.campaign = 4; }); await pg.click('#moremodesbtn'); await pg.click('#campaignbtn'); await wait(500); await shot('list');
ok(await ev(() => [...document.querySelectorAll('.cu-li')].filter(e => e.textContent.includes('LÅST')).length) === 1, 'kapitel 6 är låst, 1–5 öppna');
await ev(() => { const li = [...document.querySelectorAll('.cu-li')].find(e => e.textContent.includes('KAPITEL 5')); li.click(); }); await wait(1500);
for (let i = 0; i < 15 && await ev(() => CardUI.isOpen()); i++) { await ev(() => { const b = document.querySelector('.cu-tcard, .cu-card, .cu-li, .cu-opt'); if (b) b.click(); }); await wait(500); }
ok(await ev(() => __game.run().campaign && __game.lvl().biome) === 'crystal', 'kapitel 5 börjar i kristallgrottorna');
await ev(() => { __game.loadFloor(3); }); await wait(2500);
ok(await ev(() => __game.boss() && __game.boss().id) === 'leviathan', 'kapitlets boss är leviatan');
await ev(() => { const b = __game.boss(); __game.hurtEnemy(b, 99999, b.x, b.y, {}); }); await wait(6000);
await ev(() => { const p = __game.portals()[0]; if (p) __game.enterPortal(p); }); await wait(2500);
ok(await ev(() => __game.profile.campaign) === 5, 'kapitlet räknas som klart (' + await ev(() => __game.profile.campaign) + ')');
await done();
