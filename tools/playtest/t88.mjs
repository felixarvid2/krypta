// skärmbilder: de fyra nya bossarna i sina arenor
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t88');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => { __game.profile.tutDone = true; __game.begin('new'); }); await wait(1200);
await ev(() => { if (window.CardUI && CardUI.isOpen()) CardUI.close(); }); await wait(300);
for (const [arena, id] of [['cathedral', 'cardinal'], ['hive', 'queenbee'], ['garden', 'gardener'], ['dream', 'sandman']]) {
  await ev(([arena, boss]) => { const g = __game, L = Gen.boss(12345, { arena, boss }); L.bossId = boss; g.run().depth = 6; g.startLevel(L); }, [arena, id]);
  await wait(2500);
  ok(await ev(id => !!__game.boss() && __game.boss().id === id, id), id);
  await ev(() => { const g = __game, B = g.boss(), P = g.P; P.x = B.x - 5; P.y = B.y; if (!g.freeSpot(P.x, P.y, 0.3)) { P.x = B.x; P.y = B.y + 5; } P.a = Math.atan2(B.y - P.y, B.x - P.x); B.d = { ...B.d, speed: 0 }; });
  await wait(2500); await shot(id + '_a');
  await ev(() => { const g = __game, P = g.P; P.a += Math.PI * 0.75; }); await wait(400); await shot(id + '_room');
}
await done();
