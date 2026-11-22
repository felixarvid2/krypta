// skärmbilder från riktiga banor i de fyra nya biomerna
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t86');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => { __game.profile.tutDone = true; __game.begin('new'); }); await wait(1200);
await ev(() => { if (window.CardUI && CardUI.isOpen()) document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true })); }); await wait(500);
for (const biome of ['cathedral', 'hive', 'garden', 'dream']) {
  await ev(biome => { const g = __game, L = Gen.floor(12345, 3, { biome }); g.run().depth = 3; g.startLevel(L); }, biome);
  await wait(1500);
  await ev(() => { for (const e of __game.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } });
  ok(await ev(() => __game.state()) === 'play', biome + ' startar');
  for (let i = 0; i < 2; i++) { await ev(i => { const g = __game, L = g.lvl(), P = g.P; const rooms = L.rooms || []; const r = rooms[(i * 3 + 2) % Math.max(1, rooms.length)]; if (r) { for (let k = 0; k < 40; k++) { const x = r.x + 1 + Math.random() * (r.w - 2), y = r.y + 1 + Math.random() * (r.h - 2); if (g.freeSpot(x, y, 0.3)) { P.x = x; P.y = y; break; } } } P.a = Math.random() * 6.28; }, i); await wait(700); await shot(biome + '_' + i); }
}
await done();
