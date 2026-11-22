// Version 11: bossarna och utseendet i de nya biomerna
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t81');
for (const [id, biome] of [['librarian', 'library'], ['colossus', 'foundry']]) {
  await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1&boss=${id}`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
  await ev(() => { __game.profile.tutDone = true; __game.begin('new'); }); await wait(1200); await pg.keyboard.press('Escape'); await wait(400); await ev(() => __game.loadFloor(6)); await wait(2500);
  const b = await ev(() => { const b = __game.boss(); return b ? { id: b.id, biome: __game.lvl().biome, x: b.x, y: b.y } : null; });
  ok(b && b.id === id, `bossen ${id} startar (${JSON.stringify(b)})`);
  if (!b) continue;
  await ev(() => { const g = __game, b = g.boss(); g.P.x = b.x - 5; g.P.y = b.y; if (!g.freeSpot(g.P.x, g.P.y, 0.3)) { g.P.x = b.x; g.P.y = b.y + 5; } g.P.a = Math.atan2(b.y - g.P.y, b.x - g.P.x); for (let i = 0; i < g.WEAPONS.length; i++) g.P.has[i] = true; });
  await wait(1500); await shot(id + '_a');
  const seen = new Set();
  for (let t = 0; t < 40; t++) {
    const st = await ev(() => { const g = __game, b = g.boss(); if (!b || b.dead) return null; g.P.a = Math.atan2(b.y - g.P.y, b.x - g.P.x); g.WS.cd = 0; g.P.mags[g.P.weapon] = 10; g.fire(); return b.state; });
    if (st) seen.add(st); else break;
    if (t === 15) await shot(id + '_b');
    if (t === 10) await ev(() => { const b = __game.boss(); b.spT = 0; });
    await wait(500);
  }
  ok(seen.size >= 2, `${id} byter anfall: ${[...seen].join(', ')}`);
  await shot(id + '_c');
  await ev(() => __game.killAllCheat()); await wait(4000);
  ok(await ev(() => !__game.boss() || __game.boss().dead || __game.state() !== 'play'), `${id} kan besegras`);
}
// utseende: en vanlig våning i varje ny biom
for (const biome of ['library', 'foundry']) {
  await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1&biome=${biome}&floor=2`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
  await ev(() => { __game.profile.tutDone = true; __game.begin('new'); }); await wait(1200); await pg.keyboard.press('Escape'); await wait(1300);
  ok(await ev(() => __game.lvl().biome) === biome, biome + ' laddas');
  for (let i = 0; i < 3; i++) { await ev(i => { const g = __game, m = g.mapRef(); const want = i === 0 ? (g.lvl().biome === 'library' ? 'Ű' : 'Ÿ') : null; let best = null;
      for (let y = 1; y < m.length - 1 && !best; y++) for (let x = 1; x < m[0].length - 1; x++) if (want ? m[y][x] === want : (i === 1 ? m[y][x] === 'ũ' || m[y][x] === 'Ŷ' : false)) { best = [x, y]; break; }
      if (best) { for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [3, 0], [0, 3]]) if (g.freeSpot(best[0] + 0.5 + dx, best[1] + 0.5 + dy, 0.3)) { g.P.x = best[0] + 0.5 + dx; g.P.y = best[1] + 0.5 + dy; g.P.a = Math.atan2(-dy, -dx); break; } } else g.P.a += 2; }, i);
    await wait(900); await shot(`${biome}_${i}`); }
}
await done();
