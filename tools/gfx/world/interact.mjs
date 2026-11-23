// VÄRLD omgång 2: föremål som snurrar, utgångens virvel och kistan innan kortvalet. node tools/gfx/world/interact.mjs [utmapp]
import { setup } from '../../playtest/head.mjs';
const OUT = process.argv[2] || 'tools/gfx/world/out', PORT = 9719;
const { pg, ev, wait, done } = await setup(PORT, OUT);
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => { localStorage.removeItem('krypta.run'); __game.settings.autoLowFx = false; __game.settings.lowfx = false; __game.profile.tutDone = true; __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(600);
const shot = n => pg.locator('canvas').first().screenshot({ path: `${OUT}/${n}.png` });
const dlg = async () => { for (let i = 0; i < 6 && await ev(() => CardUI.isOpen()); i++) { await pg.keyboard.press(i % 2 ? 'Digit1' : 'Escape'); await wait(450); } };
await ev(() => { const g = __game; g.run().depth = 3; g.startLevel(Gen.floor(7919 * 5 + 3, 3, { biome: 'dungeon' })); g.ents().length = 0; g.P.hp = 99999; }); await wait(600); await dlg();
// föremål: nyckel, runa och ett vapen framför spelaren i en korridor
await ev(() => { const g = __game, m = g.mapRef(); for (let y = 2; y < m.length - 2; y++) for (let x = 2; x < m[0].length - 4; x++) if ('....'.split('').every((c, i) => m[y][x + i] === '.')) { g.P.x = x + 0.5; g.P.y = y + 0.5; g.P.a = 0; g.P.pitch = 0;
  const w = g.WEAPONS.find(w => w.id && w.id !== 'pistol'); g.items().push({ x: x + 2.2, y: y + 0.25, type: 'key', taken: false }, { x: x + 2.2, y: y + 0.75, type: w ? w.id : 'scroll', taken: false }); return; } });
for (const off of [true, false]) { await ev(off => __game.gfxW.set({ off }), off); await wait(400); for (let n = 0; n < 4; n++) { await shot(`snurr_${off ? 'fore' : 'efter'}_${n}`); await wait(140); } }
// utgången
await ev(() => { const g = __game, e = g.lvl().exit; if (!e) return; const m = g.mapRef(); for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) if (m[e.y + dy] && m[e.y + dy][e.x + dx] === '.') { g.P.x = e.x + dx + 0.5; g.P.y = e.y + dy + 0.5; g.P.a = Math.atan2(-dy, -dx); return; } });
for (const off of [true, false]) { await ev(off => __game.gfxW.set({ off }), off); await wait(900); await shot(`utgang_${off ? 'fore' : 'efter'}`); }
// kistan: tre bilder innan kortvalet öppnas
const c = await ev(() => { const g = __game, c = g.chests().find(c => !c.open); if (!c) return false; c.locked = false; c.cursed = false; const m = g.mapRef(); for (const [dx, dy] of [[1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6]]) { const cx = (c.x + dx) | 0, cy = (c.y + dy) | 0; if (m[cy] && m[cy][cx] === '.') { g.P.x = c.x + dx; g.P.y = c.y + dy; g.P.a = Math.atan2(-dy, -dx); return true; } } return false; });
if (c) { await wait(400); await shot('kista2_0'); await ev(() => { const g = __game; g.openChest(g.chests().find(c => !c.open)); }); for (let n = 1; n <= 3; n++) { await shot('kista2_' + n); await wait(70); } await wait(400); await dlg(); }
await done();
