// VÄRLD: bildrutetid (updateWeather + updateParticles + updateLight + render) med och utan världsanimationerna, samma sidladdning.
// Tar också före/efter-bilder (gfxW.off = true / false) i samma läge. Kör: node tools/gfx/world/bench.mjs [utmapp]
import { setup } from '../../playtest/head.mjs';
const OUT = process.argv[2] || 'tools/gfx/world/out', PORT = 9715;
const { pg, ev, wait, ok, done } = await setup(PORT, OUT);
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => { localStorage.removeItem('krypta.run'); __game.settings.autoLowFx = false; __game.settings.lowfx = false; __game.profile.tutDone = true; __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(600);
const LIQ = '_-ĐǛȲŹĔƖŬŤȂȴ';
const BIOMES = (process.env.BIOMES || 'dungeon,volcano,sunken,swamp,courtyard,cathedral,frost,desert').split(',');
const rows = [];
for (const biome of BIOMES) {
  const info = await ev(([biome, LIQ]) => { const g = __game; let L = null, pos = null;
    for (let s = 1; s < 30 && !pos; s++) { L = Gen.floor(s * 7919 + 3, 3, { biome }); const m = L.map; // en ruta bredvid vätska, vänd mot den
      for (let y = 2; y < m.length - 2 && !pos; y++) for (let x = 2; x < m[0].length - 2 && !pos; x++) if (LIQ.includes(m[y][x])) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [3, 0], [0, 3]]) { const c = m[y + dy] && m[y + dy][x + dx]; if (c === '.') { pos = { x: x + dx + 0.5, y: y + dy + 0.5, a: Math.atan2(-dy, -dx), liq: m[y][x], seed: s }; break; } } }
    if (!pos) L = Gen.floor(7919 + 3, 3, { biome });
    g.run().depth = 3; g.startLevel(L); g.ents().length = 0;
    try { if (CardUI.isOpen()) CardUI.close(); } catch (e) { }
    if (pos) { g.P.x = pos.x; g.P.y = pos.y; g.P.a = pos.a; } g.P.hp = 99999; return { pos, biome: g.lvl().biome };
  }, [biome, LIQ]);
  await wait(900);
  const freeze = async off => { await ev(off => { const g = __game; g.gfxW.set({ off }); }, off); await wait(700); await pg.locator('canvas').first().screenshot({ path: `${OUT}/${biome}_${off ? 'fore' : 'efter'}.png` }); };
  await ev(() => __game.resume && __game.resume()); await wait(100);
  const r = await ev(() => { const g = __game, res = { on: [], off: [] }; g.gfxW.bench(60); for (let i = 0; i < 12; i++) for (const off of i % 2 ? [true, false] : [false, true]) { g.gfxW.set({ off }); g.gfxW.bench(8); res[off ? 'off' : 'on'].push(g.gfxW.bench(60).mean); } g.gfxW.set({ off: false }); const med = a => a.sort((x, y) => x - y)[a.length >> 1]; return { off: Math.min(...res.off), on: Math.min(...res.on), offMed: med(res.off), onMed: med(res.on), warp: g.gfxW.warpMs(300), used: g.gfxW.used() }; });
  rows.push({ biome, liq: info.pos && info.pos.liq, 'av min': r.off.toFixed(2), 'på min': r.on.toFixed(2), 'diff min': ((r.on / r.off - 1) * 100).toFixed(1) + '%', 'av med': r.offMed.toFixed(2), 'på med': r.onMed.toFixed(2), 'vätskor ms/uppd': r.warp.toFixed(3), 'per ruta (15/60)': (r.warp / 4).toFixed(3), used: r.used.join('+') });
  if (!process.env.NOSHOT) { await ev(() => { try { if (CardUI.isOpen()) CardUI.close(); } catch (e) { } }); await freeze(true); await freeze(false); }
}
console.table(rows);
await done();
