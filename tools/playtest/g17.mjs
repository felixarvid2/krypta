// GEN v17: skeppet, laboratoriet, deras arenor och gläntor som arenor i spelet – laddas utan fel
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/g17');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => { __game.profile.tutDone = true; __game.begin('new'); }); await wait(1500);
ok(await ev(() => ['ship', 'lab'].every(a => Gen.ARENAS.includes(a))), 'Gen.ARENAS har ship och lab');
for (const [biome, d, gu, w] of [['ship', 3, 'captain', 'chaincannon'], ['ship', 5, 'demon', null], ['lab', 3, 'alchemist', 'acidsprayer'], ['lab', 5, 'ghost', null], ['caves', 3, null, null], ['forest', 4, null, null]]) {
  const r = await ev(([biome, d, gu, w]) => {
    let L = null;
    for (let s = 1; s < 60; s++) { L = Gen.floor('g17-' + biome + s, d, { biome, guardian: gu || undefined, weapon: w }); if (biome === 'ship' || biome === 'lab' || L.arenas.length) break; }
    const g = __game; g.run().depth = d; g.startLevel(L);
    const m = g.mapRef(), left = new Set(); for (const row of m) for (const c of row) left.add(c);
    return { types: [...new Set(g.ents().map(e => e.type))].join(''), pr: [...new Set(g.props().map(p => p.ch).filter(Boolean))].join(''), items: [...new Set(g.items().map(i => i.type))].join(','), arenas: L.arenas.length, left: [...left].filter(c => c.charCodeAt(0) >= 0x1cd && c.charCodeAt(0) <= 0x1ed).join('') };
  }, [biome, d, gu, w]);
  ok(true, `${biome} d${d}: fiender ${r.types} rekvisita ${r.pr} föremål ${r.items} arenor ${r.arenas} tecken kvar på kartan ${r.left}`);
  await wait(2500); await shot(biome + d);
}
for (const [arena, boss] of [['ship', 'captain'], ['lab', 'alchemist'], ['ship', undefined], ['lab', undefined]]) {
  await ev(([arena, boss]) => { const L = Gen.boss('g17b', { arena, boss }); if (boss) L.bossId = boss; __game.run().depth = 6; __game.startLevel(L); }, [arena, boss]);
  await wait(2500); await shot('boss_' + arena + (boss || ''));
  ok(true, `arena ${arena} ${boss || ''} laddad`);
}
await done();
