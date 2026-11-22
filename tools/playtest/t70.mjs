import { setup } from './head.mjs';
const { pg, shot, ev, wait, ok, start, done } = await setup(8897, 'out/t70');
for (const [b, ch] of [['dungeon', 'Ō'], ['caves', 'ō'], ['graveyard', 'Ŏ'], ['forest', 'ŏ'], ['courtyard', 'Ő'], ['swamp', 'ő']]) {
  let found = 0;
  for (const seed of [1, 2, 3, 4, 5, 6]) { const n = await pg.evaluate(([b, ch, seed]) => { const L = Gen.floor(seed * 977, 3, { biome: b }); return L.map.join('').split(ch).length - 1; }, [b, ch, seed]).catch(() => -1); if (n > 0) found++; if (n < 0) { await pg.goto('http://localhost:8897/index.html?nolock=1'); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 60000 }); } }
  ok(found > 0, `${b}: ${ch} finns på ${found} av 6 banor`);
}
await start('&seed=11&biome=graveyard&floor=3'); await wait(4000); await shot('gy');
ok(await ev(() => __game.state()) !== undefined, 'kyrkogården med likgrävare spelas');
await done();
