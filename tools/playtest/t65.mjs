import { setup } from './head.mjs';
const { pg, shot, ev, wait, ok, start, done } = await setup(8891, 'out/t65');
await start('&seed=7&biome=clock');
ok(await ev(() => __game.lvl().biome) === 'clock', 'klocktornet: ' + await ev(() => __game.lvl().name));
ok(await ev(() => __game.sawsRef().length) > 0, 'sågklingor: ' + await ev(() => __game.sawsRef().length) + ', tidsbubblor: ' + await ev(() => __game.bubbles().length));
await wait(800); await shot('clock');
// gå in i en sågklinga
const hp0 = await ev(() => __game.P.hp); await ev(() => { const s = __game.sawsRef()[0]; __game.P.x = s.x; __game.P.y = s.y; }); await wait(400);
ok(await ev(() => __game.P.hp) < hp0, 'sågklingan skadar');
// molnborgen
await pg.goto('http://localhost:8891/index.html?nolock=1&seed=12&biome=sky'); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 60000 });
await ev(() => { __game.profile.tutDone = true; __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(800);
ok(await ev(() => __game.lvl().biome) === 'sky', 'molnborgen: ' + await ev(() => __game.lvl().name) + ', vind: ' + await ev(() => (__game.lvl().winds || []).length));
await shot('sky');
const v = await ev(() => { const m = __game.mapRef(), P = __game.P; for (let r = 1; r < 6; r++) for (let a = 0; a < 6.28; a += 0.3) { const x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r; if (__game.voidAt(x, y)) return [x, y]; } return null; });
if (v) { const hp1 = await ev(() => __game.P.hp), p0 = await ev(() => [__game.P.x, __game.P.y]); await ev(v => { __game.P.x = v[0]; __game.P.y = v[1]; }, v); await wait(1600);
  ok(await ev(() => __game.P.hp) < hp1 && !(await ev(() => __game.voidAt(__game.P.x, __game.P.y))), 'fall i tomrummet: tillbaka på fast mark med skada'); await shot('fell'); }
// vindbössan knuffar en fiende ut i tomrummet
await done();
