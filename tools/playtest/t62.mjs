import { setup } from './head.mjs';
const { pg, shot, ev, wait, ok, start, done } = await setup(8888, 'out/t62');
await start('&seed=31&biome=crystal');
// stråle genom brytande kristall träffar fiende bakom
const r = await ev(() => { const g = __game, P = g.P, pr = g.props().find(o => o.ch === 'Ė'); if (!pr) return 'ingen kristall';
  for (const e of g.ents()) e.dead = true;
  for (let k = 0; k < 72; k++) { const a = k / 72 * 6.283, x = pr.x + Math.cos(a) * 2.5, y = pr.y + Math.sin(a) * 2.5, bx = pr.x - Math.cos(a) * 2, by = pr.y - Math.sin(a) * 2;
    if (g.freeSpot(x, y, 0.3) && g.freeSpot(bx, by, 0.3) && g.hasLOS(x, y, pr.x, pr.y)) { P.x = x; P.y = y; P.a = Math.atan2(pr.y - y, pr.x - x); const e = g.spawnEnemy('S', bx, by); e.hp = e.maxHp = 300; e.d = { ...e.d, speed: 0 }; window.__t = e; return 'ok'; } }
  return 'ingen plats'; });
console.log('uppställning:', r);
if (r === 'ok') { await ev(() => { const g = __game, P = g.P, i = g.WEAPONS.findIndex(w => w.id === 'prism'); P.has[i] = true; P.ammo.crystals = 50; P.mags[i] = 14; g.switchWeapon(i); });
  await wait(900); await pg.mouse.move(480, 300); await pg.mouse.down(); await wait(700); await pg.mouse.up(); await wait(300);
  ok(await ev(() => window.__t.hp < 300), 'strålen går genom kristallen och träffar bakom (' + Math.round(await ev(() => window.__t.hp)) + ')'); await shot('refract'); }
// granaten laddas
await ev(() => { const g = __game; g.P.grenades = 3; }); await pg.keyboard.down('KeyF'); await wait(800);
const th = await ev(() => __game.WS.throwT); await pg.keyboard.up('KeyF'); ok(th > 0.3, 'granaten laddas (' + th.toFixed(2) + ')');
await done();
