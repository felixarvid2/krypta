// v14: riktiga genererade arenor – lås, vågor, upplåsning, belöning, i flera biomer
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t83');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => { __game.profile.tutDone = true; __game.begin('new'); }); await wait(1500);
let tested = 0;
for (const biome of ['dungeon', 'volcano', 'frost', 'library', 'clock', 'tomb']) {
  const found = await ev(biome => { for (let s = 1; s < 80; s++) for (const d of [2, 3, 4, 5]) { const L = Gen.floor(s * 7919 + d, d, { biome }); if (L.arenas && L.arenas.length && !L.boss) return [s * 7919 + d, d]; } return null; }, biome);
  if (!found) { console.log('ingen arena i', biome); continue; }
  await ev(([seed, d, biome]) => { const g = __game, L = Gen.floor(seed, d, { biome }); g.run().depth = d; g.startLevel(L); }, [...found, biome]);
  await wait(1200);
  const info = await ev(() => { const a = __game.arenasRef()[0]; return a && { ...a, alive: undefined }; });
  if (!info) { ok(false, biome + ': arenan kom inte med till spelet'); continue; }
  // gå in genom en dörr
  await ev(() => { const g = __game, a = g.arenasRef()[0], P = g.P; for (const e of g.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } P.x = a.x0 + 1.5; P.y = a.y0 + 1.5; });
  await wait(800);
  ok(await ev(() => !!__game.arenaCurRef()), biome + ': arenan startar ' + JSON.stringify([info.x0, info.y0, info.x1, info.y1, info.doors.length, info.waves]));
  ok(await ev(() => __game.arenasRef()[0].doors.every(d => __game.solid(d.x + 0.5, d.y + 0.5))), biome + ': alla dörrar låsta');
  await shot(biome + '_lock');
  for (let w = 0; w < 5; w++) { await ev(() => { const g = __game, a = g.arenasRef()[0]; g.P.x = a.x0 + 1.5; g.P.y = a.y0 + 1.5; for (const e of g.ents()) if (e.arena && !e.dead) { e.hidden = false; e.up = true; e.anchored = true; g.hurtEnemy(e, 9999, e.x, e.y, {}); } }); await wait(1700); }
  ok(await ev(() => !__game.arenaCurRef() && __game.arenasRef()[0].state === 'done'), biome + ': klar efter ' + info.waves + ' vågor');
  await wait(1500);
  ok(await ev(() => __game.arenasRef()[0].doors.every(d => !__game.solid(d.x + 0.5, d.y + 0.5))), biome + ': dörrarna öppna igen');
  ok(await ev(() => __game.items().some(it => it.type === 'cardpick')), biome + ': belöning');
  tested++;
}
ok(tested >= 4, 'testade arenor: ' + tested);
await done();
