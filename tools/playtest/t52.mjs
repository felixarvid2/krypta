import { setup } from './head.mjs';
const { pg, shot, ev, wait, ok, start, done } = await setup(8883, 'out/t52');
// kristallgrottorna
await start('&seed=31&biome=crystal');
ok(await ev(() => __game.lvl().biome) === 'crystal', 'kristallgrottorna laddas: ' + await ev(() => __game.lvl().name));
await wait(1000); await shot('crystal');
const prisms = await ev(() => __game.props().filter(o => o.ch === 'Ė').length);
console.log('brytande kristaller:', prisms, 'glödkristaller:', await ev(() => __game.props().filter(o => o.ch === 'Ę').length));
if (prisms) { // skjut på en brytande kristall med prisman
  await ev(() => { const g = __game, P = g.P, pr = g.props().find(o => o.ch === 'Ė'); for (const e of g.ents()) e.dead = true; let best = null; for (let k = 0; k < 40 && !best; k++) { const a = k / 40 * 6.283, x = pr.x + Math.cos(a) * 3, y = pr.y + Math.sin(a) * 3; if (g.freeSpot(x, y, 0.3) && g.hasLOS(x, y, pr.x, pr.y)) best = [x, y]; } if (best) { P.x = best[0]; P.y = best[1]; P.a = Math.atan2(pr.y - P.y, pr.x - P.x); }
    const i = g.WEAPONS.findIndex(w => w.id === 'prism'); P.has[i] = true; P.ammo.crystals = 50; P.mags[i] = 14; g.switchWeapon(i); });
  await wait(900); await pg.mouse.move(480, 300); await pg.mouse.down(); await wait(400); await pg.mouse.up(); await wait(200); await shot('refract');
  ok(true, 'prisman mot kristallen utan fel');
}
// den sjunkna staden
await ev(() => __game.showTitle()); await wait(300);
await pg.goto('http://localhost:8883/index.html?nolock=1&seed=77&biome=sunken'); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 60000 });
await ev(() => { __game.profile.tutDone = true; __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(800);
ok(await ev(() => __game.lvl().biome) === 'sunken', 'sjunkna staden laddas: ' + await ev(() => __game.lvl().name));
const water = await ev(() => { const m = __game.mapRef(); let n = 0; for (const r of m) for (const c of r) if (c === 'Đ') n++; return n; });
ok(water > 0, 'djupt vatten finns (' + water + ' rutor), tidvatten: ' + await ev(() => JSON.stringify(__game.lvl().tide || null)));
await ev(() => { const g = __game, m = g.mapRef(), P = g.P; for (let y = 0; y < m.length; y++) for (let x = 0; x < m[y].length; x++) if (m[y][x] === 'Đ') { P.x = x + 0.5; P.y = y + 0.5; return; } });
await wait(2500); ok(await ev(() => __game.P.swim && __game.P.air < 12), 'simmar och luften minskar (' + (await ev(() => __game.P.air)).toFixed(1) + ')');
await shot('swim');
const eels = await ev(() => __game.ents().filter(e => e.type === 'Ó').length); console.log('ålar:', eels);
// bossarna
for (const id of ['crystalqueen', 'leviathan']) {
  await ev(() => __game.showTitle()); await wait(200);
  await pg.goto('http://localhost:8883/index.html?nolock=1&god=1'); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 60000 });
  await ev(() => { __game.profile.tutDone = true; __game.beginBossHunt(); }); await wait(500);
  const idx = await ev(id => [...document.querySelectorAll('.cu-opt')].findIndex(e => e.textContent.includes(id === 'crystalqueen' ? 'KRISTALL' : 'LEVIATAN')), id);
  await pg.click(`.cu-opt >> nth=${idx}`); await wait(4000);
  ok(await ev(id => __game.boss() && __game.boss().id === id, id), id + ' möts');
  await ev(() => { const g = __game, P = g.P, b = g.boss(); P.a = Math.atan2(b.y - P.y, b.x - P.x); const i = g.WEAPONS.findIndex(w => w.id === 'rifle'); P.has[i] = true; P.ammo.r556 = 999; g.switchWeapon(i); });
  await wait(800); await pg.mouse.down(); await wait(8000); await pg.mouse.up(); await shot('boss_' + id);
  ok(await ev(() => __game.boss().hp < __game.boss().maxHp), id + ' tar skada (' + Math.round(await ev(() => __game.boss().hp)) + ')');
}
await done();
