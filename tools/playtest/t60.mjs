import { setup } from './head.mjs';
const { pg, shot, ev, wait, ok, start, done } = await setup(8886, 'out/t60');
await start('&seed=606&biome=dungeon');
for (const id of ['sawlauncher', 'windgun', 'spear']) {
  await ev(id => { const g = __game, P = g.P, i = g.WEAPONS.findIndex(w => w.id === id); P.has[i] = true; P.ammo.gears = 30; P.mags[i] = g.WEAPONS[i].mag; for (const e of g.ents()) e.dead = true; const e = g.spawnEnemy('S', P.x + Math.cos(P.a) * 1.8, P.y + Math.sin(P.a) * 1.8); e.hp = e.maxHp = 300; e.d = { ...e.d, speed: 0 }; window.__t = e; g.switchWeapon(i); }, id);
  await wait(900); await pg.mouse.move(480, 300); await pg.mouse.down(); await wait(100); await pg.mouse.up(); await wait(1200);
  ok(await ev(() => window.__t.hp < 300), `${id} träffar (${Math.round(await ev(() => window.__t.hp))})`); await shot('w_' + id);
}
// spjutet kastas och plockas upp
await ev(() => { const g = __game; for (const e of g.ents()) e.dead = true; }); await pg.mouse.down({ button: 'right' }); await wait(100); await pg.mouse.up({ button: 'right' }); await wait(1200);
ok(await ev(() => __game.P.mags[__game.WEAPONS.findIndex(w => w.id === 'spear')] === 0 && __game.items().some(i => i.type === 'spearpick' && !i.taken)), 'spjutet kastat och ligger på marken');
await ev(() => { const g = __game, sp = g.items().find(i => i.type === 'spearpick' && !i.taken); g.P.x = sp.x; g.P.y = sp.y; }); await wait(600);
ok(await ev(() => __game.P.mags[__game.WEAPONS.findIndex(w => w.id === 'spear')] === 1), 'spjutet plockat upp');
// fiender v9
await ev(() => { const g = __game, P = g.P; ['ĳ', 'Ĵ', 'ĵ', 'Ķ', 'ķ', 'ĸ'].forEach((k, i) => { const a = P.a + (i - 3) * 0.25; const e = g.spawnEnemy(k, P.x + Math.cos(a) * 4, P.y + Math.sin(a) * 4); e.alert = true; }); });
await wait(5000); await shot('enemies');
// urverkssoldaten lindas upp
await ev(() => { const g = __game, P = g.P; for (const e of g.ents()) e.dead = true; const e = g.spawnEnemy('ĳ', P.x + 2, P.y); window.__c = e; g.hurtEnemy ? g.hurtEnemy(e, 999, e.x, e.y, {}) : 0; });
console.log('urverk:', await ev(() => JSON.stringify({ dead: window.__c.dead, rewindT: window.__c.rewindT })));
// tidsbubbla och blixt
await ev(() => { const g = __game, P = g.P; g.bubbles().push({ x: P.x, y: P.y, r: 2.4, t: 3 }); g.lightningAt(P.x + 3, P.y, 0.5, 10); }); await wait(300);
ok(await ev(() => __game.P.timeSlow < 1), 'tidsbubblan saktar in dig'); await shot('bubble'); await wait(800);
await done();
