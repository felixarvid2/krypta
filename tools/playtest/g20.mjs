// GEN v20: kloakerna, öknen och deras arenor i spelet – laddas utan fel
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/g20');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => { __game.profile.tutDone = true; __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(500);
ok(await ev(() => Gen.ARENAS.slice(-2).join() === 'sewer,desert'), 'Gen.ARENAS slutar med sewer, desert');
for (const [biome, d, gu, w] of [['sewer', 3, 'ratking', 'scimitar'], ['sewer', 4, 'demon', 'trapthrower'], ['desert', 3, 'sphinx', 'trapthrower'], ['desert', 5, 'ghost', null], ['dungeon', 3, 'ratking', null], ['forest', 4, 'sphinx', null]]) {
  const r = await ev(([biome, d, gu, w]) => {
    const L = Gen.floor('g20-' + biome, d, { biome, guardian: gu || undefined, weapon: w });
    const errs = Gen.validate(L);
    const g = __game; g.run().depth = d; g.startLevel(L);
    const m = g.mapRef(), left = new Set(); for (const row of m) for (const c of row) left.add(c);
    const api = g.v20 ? g.v20() : null;
    return { errs: errs.length, types: [...new Set(g.ents().map(e => e.type))].join(''), pr: [...new Set(g.props().map(p => p.ch).filter(Boolean))].join(''), items: [...new Set(g.items().map(i => i.type))].join(','),
      sl: L.sluices.length, gsl: api && api.sluices ? api.sluices.length : -1, oases: api && api.oases ? api.oases.length : -1, left: [...left].filter(c => c.charCodeAt(0) >= 0x22c && c.charCodeAt(0) <= 0x246).join('') };
  }, [biome, d, gu, w]);
  ok(r.errs === 0 && (r.sl === 0 || r.gsl === r.sl), `${biome} d${d}: validate ${r.errs}, fiender ${r.types} rekvisita ${r.pr} föremål ${r.items} slussar ${r.sl} (spelet ${r.gsl}) oaser ${r.oases} tecken kvar ${r.left}`);
  await wait(2000); await shot(biome + d);
}
for (const [arena, boss] of [['sewer', 'ratking'], ['desert', 'sphinx'], ['sewer', undefined], ['desert', undefined]]) {
  await ev(([arena, boss]) => { const L = Gen.boss('g20b', { arena, boss }); if (boss) L.bossId = boss; __game.run().depth = 6; __game.startLevel(L); }, [arena, boss]);
  await wait(2000); await shot('boss_' + arena + (boss || ''));
  ok(true, `arena ${arena} ${boss || ''} laddad`);
}
await done();
