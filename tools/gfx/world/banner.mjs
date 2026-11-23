// VÄRLD: fanan på vägg 5 vajar – 4 bilder före (gfxW.off) och efter. node tools/gfx/world/banner.mjs [utmapp]
import { setup } from '../../playtest/head.mjs';
const OUT = process.argv[2] || 'tools/gfx/world/out', PORT = 9718;
const { pg, ev, wait, done } = await setup(PORT, OUT);
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => { localStorage.removeItem('krypta.run'); __game.settings.autoLowFx = false; __game.settings.lowfx = false; __game.profile.tutDone = true; __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(600);
const r = await ev(() => { const g = __game;
  for (let s = 1; s < 200; s++) for (const d of [1, 2, 3, 4]) { const L = Gen.floor(s * 7919 + d, d, { biome: 'dungeon' }), m = L.map;
    for (let y = 2; y < m.length - 2; y++) for (let x = 2; x < m[0].length - 2; x++) if (m[y][x] === '5' && m[y][x + 1] === '.' && m[y][x + 2] === '.') { g.run().depth = d; g.startLevel(L); g.ents().length = 0; g.P.hp = 99999; g.P.x = x + 2.5; g.P.y = y + 0.5; g.P.a = Math.PI; g.P.pitch = 0; return [s, d, x, y]; } }
  return null; });
console.log('fana', r);
await wait(800);
for (let i = 0; i < 6 && await ev(() => CardUI.isOpen()); i++) { await pg.keyboard.press(i % 2 ? 'Digit1' : 'Escape'); await wait(450); }
for (const off of [true, false]) { await ev(off => __game.gfxW.set({ off }), off); await wait(500); for (let n = 0; n < 4; n++) { await pg.locator('canvas').first().screenshot({ path: `${OUT}/fana_${off ? 'fore' : 'efter'}_${n}.png` }); await wait(150); } }
console.log('banTicks', await ev(() => __game.gfxW.st.banTicks));
await done();
