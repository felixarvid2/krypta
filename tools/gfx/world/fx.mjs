// VÄRLD: bildserier av händelserna – sot efter en explosion, kistan som slår upp, dörrdamm och åskan i regnet. node tools/gfx/world/fx.mjs [utmapp]
import { setup } from '../../playtest/head.mjs';
const OUT = process.argv[2] || 'tools/gfx/world/out', PORT = 9717;
const { pg, ev, wait, done } = await setup(PORT, OUT);
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => { localStorage.removeItem('krypta.run'); __game.settings.autoLowFx = false; __game.settings.lowfx = false; __game.profile.tutDone = true; __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(600);
const shot = n => pg.locator('canvas').first().screenshot({ path: `${OUT}/${n}.png` });
const dlg = async () => { for (let i = 0; i < 6 && await ev(() => CardUI.isOpen()); i++) { await pg.keyboard.press(i % 2 ? 'Digit1' : 'Escape'); await wait(450); } };
const lvl = biome => ev(biome => { const g = __game; g.run().depth = 3; g.startLevel(Gen.floor(7919 * 5 + 3, 3, { biome })); g.ents().length = 0; g.P.hp = 99999; }, biome);
// sot: stå två rutor från en vägg och spräng mellan
await lvl('dungeon'); await wait(600); await dlg();
const w = await ev(() => { const g = __game, m = g.mapRef(); for (let y = 2; y < m.length - 2; y++) for (let x = 2; x < m[0].length - 4; x++) if (m[y][x] === '.' && m[y][x + 1] === '.' && m[y][x + 2] === '.' && m[y][x + 3] === '.' && /[0-9#]/.test(m[y][x + 4])) { g.P.x = x + 0.5; g.P.y = y + 0.5; g.P.a = 0; g.P.pitch = 0; return [x, y]; } return null; });
await wait(400); await shot('sot_fore');
if (w) { await ev(([x, y]) => { const g = __game; g.explode(x + 3.2, y + 0.5, 0, 1.6, false, false); }, w); await wait(1800); await shot('sot_efter'); }
// kistan
await lvl('dungeon'); await wait(600); await dlg();
const c = await ev(() => { const g = __game, c = g.chests().find(c => !c.open); if (!c) return false; c.locked = false; c.cursed = false; const m = g.mapRef(); for (const [dx, dy] of [[1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6]]) { const cx = (c.x + dx) | 0, cy = (c.y + dy) | 0; if (m[cy] && m[cy][cx] === '.') { g.P.x = c.x + dx; g.P.y = c.y + dy; g.P.a = Math.atan2(-dy, -dx); g.P.pitch = 0; return true; } } return false; });
if (c) { await wait(400); await shot('kista_0'); await ev(() => { const g = __game; g.openChest(g.chests().find(c => !c.open)); }); await dlg(); for (let n = 1; n <= 4; n++) { await shot('kista_' + n); await wait(90); } }
// åskan i borggården
await lvl('courtyard'); await wait(600); await dlg(); await ev(() => { const g = __game, m = g.mapRef(); let best = null, bn = -1; for (let y = 3; y < m.length - 3; y++) for (let x = 3; x < m[0].length - 3; x++) { if (m[y][x] !== '.' || !g.gfxW.sky(x, y)) continue; let n = 0; for (let k = 1; k < 5; k++) if (g.gfxW.sky(x + k, y)) n++; if (n > bn) { bn = n; best = [x, y]; } } if (best) { g.P.x = best[0] + 0.5; g.P.y = best[1] + 0.5; g.P.a = 0; } g.P.pitch = -25; }); await wait(300); await shot('aska_fore'); await ev(() => { const t = setInterval(() => __game.gfxW.bolt(), 16); setTimeout(() => clearInterval(t), 1500); }); await wait(200); await shot('aska_efter'); console.log('blixt', await ev(() => __game.gfxW.lightning()));
await done();
