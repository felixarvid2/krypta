// VÄRLD: före/efter-serier (4 bilder, var 120:e ms) av vätskorna, facklorna och luften. Före = gfxW.off (de gamla animationerna), efter = på.
// Kör: node tools/gfx/world/strip.mjs [utmapp]  → <biom>_{fore,efter}_<n>.png + ark via tools/gfx/world/sheet.py
import { setup } from '../../playtest/head.mjs';
const OUT = process.argv[2] || 'tools/gfx/world/out', PORT = 9716;
const { pg, ev, wait, done } = await setup(PORT, OUT);
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => { localStorage.removeItem('krypta.run'); __game.settings.autoLowFx = false; __game.settings.lowfx = false; __game.profile.tutDone = true; __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(600);
const LIQ = '_-ĐǛȲŹĔƖŬŤȂȴ';
for (const biome of (process.env.BIOMES || 'volcano,sunken,dungeon,cathedral').split(',')) {
  await ev(([biome, LIQ]) => { const g = __game; let L = null, pos = null;
    for (let s = 1; s < 30 && !pos; s++) { L = Gen.floor(s * 7919 + 3, 3, { biome }); const m = L.map;
      for (let y = 2; y < m.length - 2 && !pos; y++) for (let x = 2; x < m[0].length - 2 && !pos; x++) if (LIQ.includes(m[y][x])) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) { const c = m[y + dy] && m[y + dy][x + dx]; if (c === '.') { pos = { x: x + dx + 0.5, y: y + dy + 0.5, a: Math.atan2(-dy, -dx) }; break; } } }
    g.run().depth = 3; g.startLevel(L); g.ents().length = 0;
    if (!pos) { const t = g.gfxW.torches().find(t => !t.hidden && !t.prop); if (t) pos = { x: t.x + 2.2, y: t.y, a: Math.PI }; }
    if (pos) { g.P.x = pos.x; g.P.y = pos.y; g.P.a = pos.a; } g.P.hp = 99999; g.P.pitch = 18; }, [biome, LIQ]);
  await wait(800);
  for (let i = 0; i < 6 && await ev(() => CardUI.isOpen()); i++) { await pg.keyboard.press(i % 2 ? 'Digit1' : 'Escape'); await wait(450); }
  for (const off of [true, false]) { await ev(off => __game.gfxW.set({ off }), off); await wait(600);
    for (let n = 0; n < 4; n++) { await pg.locator('canvas').first().screenshot({ path: `${OUT}/${biome}_${off ? 'fore' : 'efter'}_${n}.png` }); await wait(120); } }
}
await done();
