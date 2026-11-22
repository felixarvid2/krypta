import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/p93');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => { __game.profile.tutDone = true; __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(800);
for (const [biome, s, d] of [['sewer', 3, 2], ['sewer', 8, 4], ['sewer', 5, 3], ['desert', 3, 2], ['desert', 8, 4], ['desert', 5, 3], ['tomb', 3, 2], ['jungle', 3, 2], ['dungeon', 3, 2]]) {
  const r = await ev(([biome, s, d]) => { const g = __game, L = Gen.floor(s * 7919 + d, d, { biome }); g.run().depth = d; g.startLevel(L); for (const e of g.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0 }; } return g.lvl().biome; }, [biome, s, d]); console.log('biom', r);
  await wait(800);
  const st = await ev(() => { const g = __game, l = g.light(), m = g.mapRef(), H = m.length, W = m[0].length; let mx = 0, at = null, n = 0, sum = 0, cnt = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (g.solid(x + 0.5, y + 0.5)) continue; const v = l[y * W + x]; sum += v; cnt++; if (v > 1.4) n++; if (v > mx) { mx = v; at = [x, y]; } } return { mx: +mx.toFixed(2), at, n, avg: +(sum / cnt).toFixed(2), amb: g.lvl().ambient }; });
  console.log(biome, d, JSON.stringify(st));
  if (biome === 'sewer' || biome === 'desert') { await ev(at => { const g = __game, P = g.P; P.x = at[0] + 0.5; P.y = at[1] + 0.5; for (let a = 0; a < 6.28; a += 0.3) { const x = P.x - Math.cos(a) * 2.5, y = P.y - Math.sin(a) * 2.5; if (g.freeSpot(x, y, 0.3)) { P.x = x; P.y = y; P.a = a; break; } } }, st.at); await wait(500); await shot(`hot_${biome}_${d}`); }
}
await done();
