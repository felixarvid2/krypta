// VÄRLD omgång 2: en fälla slår om (spikar upp med överslag och gnistor). node tools/gfx/world/trap.mjs [utmapp]
import { setup } from '../../playtest/head.mjs';
const OUT = process.argv[2] || 'tools/gfx/world/out', PORT = 9720;
const { pg, ev, wait, done } = await setup(PORT, OUT);
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => { localStorage.removeItem('krypta.run'); __game.settings.autoLowFx = false; __game.settings.lowfx = false; __game.profile.tutDone = true; __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(600);
const shot = n => pg.locator('canvas').first().screenshot({ path: `${OUT}/${n}.png` });
const r = await ev(() => { const g = __game; for (let s = 1; s < 80; s++) { const L = Gen.floor(s * 7919 + 2, 2, { biome: 'dungeon' }); g.run().depth = 2; g.startLevel(L); g.ents().length = 0; g.P.hp = 99999;
  const pr = g.props().find(o => o.ch === 'z'); if (!pr) continue; const m = g.mapRef(); for (const [dx, dy] of [[1.8, 0], [-1.8, 0], [0, 1.8], [0, -1.8]]) { const cx = (pr.x + dx) | 0, cy = (pr.y + dy) | 0; if (m[cy] && m[cy][cx] === '.') { g.P.x = pr.x + dx; g.P.y = pr.y + dy; g.P.a = Math.atan2(-dy, -dx); g.P.pitch = 20; window.__pr = pr; return s; } } } return null; });
console.log('fälla', r);
await wait(700); for (let i = 0; i < 6 && await ev(() => CardUI.isOpen()); i++) { await pg.keyboard.press(i % 2 ? 'Digit1' : 'Escape'); await wait(450); }
await ev(() => { window.__pr.up = false; }); await wait(300); await shot('falla_0');
await ev(() => { window.__pr.up = true; window.__pr.upT = 99; }); for (let n = 1; n <= 3; n++) { await wait(60); await shot('falla_' + n); }
await done();
