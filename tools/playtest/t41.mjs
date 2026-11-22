import { setup } from './head.mjs';
const { pg, shot, ev, wait, ok, start, done } = await setup(8861, 'out/t41');
await start('&seed=1111');
ok(await ev(() => __game.state()) === 'play', 'spelar');
// krönikan
const p0 = await ev(() => (__game.profile.pages || []).length);
await ev(() => __game.findPage()); await wait(400);
ok(await ev(() => (__game.profile.pages || []).length) === p0 + 1, 'en krönikesida hittad'); await shot('page');
await pg.keyboard.press('Escape'); await wait(300);
// smyg: ovetande fiende upptäcker gradvis
await ev(() => { const g = __game; for (const e of g.ents()) e.dead = true; const P = g.P; const D = 5, m = g.mapRef(); search: for (let y = 1; y < m.length - 1; y++) for (let x = 1; x < m[0].length - 1; x++) { const px = x + 0.5, py = y + 0.5; if (!g.freeSpot(px, py, 0.3)) continue; for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283, ex = px + Math.cos(a) * D, ey = py + Math.sin(a) * D; if (g.hasLOS(px, py, ex, ey) && g.freeSpot(ex, ey, 0.35)) { P.x = px; P.y = py; P.a = a; break search; } } } const e = g.spawnEnemy('S', P.x + Math.cos(P.a) * D, P.y + Math.sin(P.a) * D); e.alert = false; e.sleep = false; e.d = { ...e.d, speed: 0 }; window.__e = e; });
await wait(250);
const d1 = await ev(() => window.__e.detect || 0);
ok(await ev(() => !window.__e.alert), 'fienden är inte larmad direkt (upptäckt ' + d1.toFixed(2) + ')');
await wait(3000); ok(await ev(() => window.__e.alert), 'fienden upptäcker dig efter en stund');
await shot('detect');
// lampa
await ev(() => { __game.toggleLamp(); }); await wait(300);
ok(await ev(() => __game.P.lamp === true && __game.visibility() === 1), 'lampan tänds och gör dig synlig');
await shot('lamp');
await ev(() => __game.toggleLamp());
// sten
await ev(() => __game.throwStone()); await wait(1200);
ok(await ev(() => __game.P.stones === 2), 'sten kastad');
// spelaren och bankiren
await ev(() => { __game.run().gold = 500; __game.openBanker({}); }); await wait(400); await shot('banker');
await pg.click('.cu-opt >> nth=0').catch(() => {}); await wait(400);
ok(await ev(() => __game.run().bank === 250), 'banken tar emot guld (' + await ev(() => __game.run().bank) + ')');
await ev(() => __game.openGambler({})); await wait(400); await shot('gambler');
await pg.click('.cu-opt >> nth=0').catch(() => {}); await wait(1200);
ok(await ev(() => __game.run().gold !== 250), 'tärningsspelet påverkar guldet');
await ev(() => __game.openWanderer({})); await wait(400); await pg.click('.cu-opt >> nth=0').catch(() => {}); await wait(300);
ok(await ev(() => __game.run().wander && __game.run().wander.active), 'vandrarens uppdrag tas');
// butik
await ev(() => { __game.openShop({ stock: null, x: 0, y: 0 }); }); await wait(400);
const names = await ev(() => [...document.querySelectorAll('.cu-iname')].map(e => e.textContent)); console.log(names.join('|'));
ok(names.includes('PRUTA') && names.includes('STJÄL') && names.includes('SÄLJ ETT KORT'), 'butiken kan pruta, stjäla och köpa kort'); await shot('shop');
await pg.keyboard.press('Escape'); await wait(300);
await done();
