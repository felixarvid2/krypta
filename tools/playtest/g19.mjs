// GEN v19: gruvan, observatoriet och deras arenor i spelet – laddas utan fel
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/g19');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => { __game.profile.tutDone = true; __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(500);
ok(await ev(() => ['mine', 'observatory'].every(a => Gen.ARENAS.includes(a))), 'Gen.ARENAS har mine och observatory');
for (const [biome, d, gu, w] of [['mine', 3, 'foreman', 'pickaxe'], ['mine', 4, 'demon', null], ['observatory', 3, 'starseer', 'starlance'], ['observatory', 5, 'ghost', null], ['dungeon', 3, 'foreman', null], ['forest', 4, 'starseer', null]]) {
  const r = await ev(([biome, d, gu, w]) => {
    let L = null;
    for (let s = 1; s < 60; s++) { L = Gen.floor('g19-' + biome + s, d, { biome, guardian: gu || undefined, weapon: w }); break; }
    const g = __game; g.run().depth = d; g.startLevel(L);
    const m = g.mapRef(), left = new Set(); for (const row of m) for (const c of row) left.add(c);
    return { types: [...new Set(g.ents().map(e => e.type))].join(''), pr: [...new Set(g.props().map(p => p.ch).filter(Boolean))].join(''), items: [...new Set(g.items().map(i => i.type))].join(','), arenas: L.arenas.length, carts: L.carts.length, ports: L.starports.length, left: [...left].filter(c => c.charCodeAt(0) >= 0x210 && c.charCodeAt(0) <= 0x22b).join('') };
  }, [biome, d, gu, w]);
  ok(true, `${biome} d${d}: fiender ${r.types} rekvisita ${r.pr} föremål ${r.items} arenor ${r.arenas} vagnar ${r.carts} portpar ${r.ports} tecken kvar på kartan ${r.left}`);
  await wait(2500); await shot(biome + d);
}
for (const [arena, boss] of [['mine', 'foreman'], ['observatory', 'starseer'], ['mine', undefined], ['observatory', undefined]]) {
  await ev(([arena, boss]) => { const L = Gen.boss('g19b', { arena, boss }); if (boss) L.bossId = boss; __game.run().depth = 6; __game.startLevel(L); }, [arena, boss]);
  await wait(2500); await shot('boss_' + arena + (boss || ''));
  ok(true, `arena ${arena} ${boss || ''} laddad`);
}
await done();
