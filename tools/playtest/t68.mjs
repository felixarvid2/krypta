import { setup } from './head.mjs';
const { pg, shot, ev, wait, ok, start, done } = await setup(8894, 'out/t68');
await start('&seed=7&biome=clock&god=1');
await ev(() => { const g = __game, P = g.P; for (const e of g.ents()) e.dead = true; ['ĳ', 'Ĵ', 'ĵ', 'Ķ', 'ķ', 'ĸ'].forEach((k, i) => { const a = P.a + (i - 2.5) * 0.2, e = g.spawnEnemy(k, P.x + Math.cos(a) * 3.6, P.y + Math.sin(a) * 3.6); e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0 }; }); });
await wait(700); await shot('enemies');
for (const id of ['clockmaker', 'thunderbird']) {
  await pg.goto('http://localhost:8894/index.html?nolock=1&god=1'); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 60000 });
  await ev(() => { __game.profile.tutDone = true; __game.beginBossHunt(); }); await wait(500);
  const idx = await ev(id => [...document.querySelectorAll('.cu-opt')].findIndex(e => e.textContent.includes(id === 'clockmaker' ? 'URMAKAREN' : 'STORMFÅGELN')), id);
  await pg.click(`.cu-opt >> nth=${idx}`); await wait(4500); await ev(() => { const g = __game, P = g.P, b = g.boss(); P.a = Math.atan2(b.y - P.y, b.x - P.x); });
  await wait(300); await shot('boss_' + id);
  ok(await ev(id => __game.boss() && __game.boss().id === id, id), id + ' möts');
  await ev(() => { const b = __game.boss(); b.hp = b.maxHp * 0.3; }); await wait(5000); ok(await ev(() => __game.state()) === 'play', id + ' fas 3 utan fel');
}
await done();
