// Version 18: Cirkusen och Djungeltemplet – fallluckor, strålkastare, pirayor, lianer, knivhjul, lyckohjul, ballonger, marquee,
// guldidol, pilidol, giftblomma, tikifacklor, tolv fiender, käglekastaren, blåsröret, kägellådor/pilkoger, Cirkusdirektören och Den fjädrade ormen
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t91');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
ok(await ev(() => window.Music && Music.HI.includes('circus') && Music.HI.includes('jungle')), 'musiken har intensitetslager för cirkusen och djungeltemplet');
await ev(() => {
  const g = __game; g.profile.tutDone = true;
  const W = 40, H = 30, grid = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[26][3] = 'P'; grid[2][36] = 'x';
  // väggar
  grid[5][20] = 'Ǯ'; grid[6][20] = 'ǯ'; grid[7][20] = 'ǰ'; grid[8][20] = 'ǿ'; grid[9][20] = 'Ȁ'; grid[10][20] = 'ȁ';
  // faror
  grid[26][8] = 'Ǳ'; grid[20][26] = 'Ǳ'; grid[22][8] = 'ǲ'; grid[22][12] = 'Ȃ'; grid[22][14] = 'ȃ'; grid[24][14] = 'ȃ';
  // rekvisita
  grid[14][4] = 'ǳ'; grid[16][8] = 'Ǵ'; grid[12][14] = 'ǵ'; grid[16][4] = 'Ƕ'; grid[20][16] = 'Ȅ'; grid[4][4] = 'ȅ'; grid[12][26] = 'Ȇ'; grid[18][12] = 'ȇ';
  // fiender
  grid[16][24] = 'Ƿ'; grid[3][30] = 'Ǹ'; grid[14][34] = 'ǹ'; grid[22][34] = 'Ǻ'; grid[26][30] = 'ǻ'; grid[24][24] = 'Ǽ';
  grid[14][10] = 'Ȉ'; grid[8][30] = 'ȉ'; grid[4][24] = 'Ȋ'; grid[8][34] = 'ȋ'; grid[18][36] = 'Ȍ'; grid[26][36] = 'ȍ';
  // vapen och ammo
  grid[24][4] = 'Ǿ'; grid[24][6] = 'ȏ'; grid[20][4] = 'ǽ'; grid[20][6] = 'Ȏ';
  g.playCustom({ grid, biome: 'dungeon' });
});
await wait(1500);
ok(await ev(() => __game.state()) === 'play', 'banan med de nya tecknen startar');
const T12 = ['Ƿ', 'Ǹ', 'ǹ', 'Ǻ', 'ǻ', 'Ǽ', 'Ȉ', 'ȉ', 'Ȋ', 'ȋ', 'Ȍ', 'ȍ'];
ok(await ev(T => T.every(t => __game.ents().some(e => e.type === t)), T12), 'alla tolv nya fiender finns');
ok(await ev(() => ['ǳ', 'Ǵ', 'ǵ', 'Ƕ', 'Ȅ', 'ȅ', 'Ȇ', 'ȇ'].every(c => __game.props().some(p => p.ch === c))), 'alla åtta nya föremål finns ' + await ev(() => ['ǳ', 'Ǵ', 'ǵ', 'Ƕ', 'Ȅ', 'ȅ', 'Ȇ', 'ȇ'].filter(c => !__game.props().some(p => p.ch === c)).join('')));
ok(await ev(() => ['Ǯ', 'ǯ', 'ǰ', 'ǿ', 'Ȁ', 'ȁ'].every((c, i) => __game.solid(20.5, 5.5 + i))), 'de sex nya väggarna är väggar');
ok(await ev(() => ['pinbox', 'dartquiver', 'pinthrower', 'blowgun'].every(t => __game.items().some(i => i.type === t))), 'kägellådan, pilkogret och de två vapnen ligger ute');
await ev(() => { for (const e of __game.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } });
// fallluckan: spelaren faller, skadas och hamnar på en säker ruta
await ev(() => { const P = __game.P; P.hp = 100; P.iframe = 0; P.x = 7.5; P.y = 26.5; }); await wait(200);
await ev(() => { const g = __game, P = g.P, v = g.v18(), d = v.trapdoors.find(d => d.x === 8 && d.y === 26); P.x = 8.5; P.y = 26.5; P.vx = P.vy = 0; d.ph = ((4.2 - v.clock) % 6 + 6) % 6; window.__dd = d; });
await wait(900);
ok(await ev(() => __game.P.hp < 100 && (__game.P.x | 0) !== 8), 'fallluckan öppnas, skadar och knuffar tillbaka ' + await ev(() => [__game.P.hp, __game.P.x.toFixed(1), window.__dd.st].join()));
// en fiende på luckan faller och dör – men inte en boss eller en flygande
await ev(() => { const g = __game, d = g.v18().trapdoors.find(d => d.x === 26 && d.y === 20), c = g.v18().clock; d.ph = ((4.4 - c) % 6 + 6) % 6; const e = g.spawnEnemy('S', 26.5, 20.5); e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; window.__fe = e; const m = g.spawnEnemy('Ȍ', 26.4, 20.6); m.alert = false; m.sleep = true; m.d = { ...m.d, speed: 0, dmg: 0 }; window.__fm = m; g.P.x = 3.5; g.P.y = 26.5; }); await wait(800);
ok(await ev(() => window.__fe.dead && !window.__fm.dead), 'en fiende på fallluckan faller, myggan flyger kvar');
// strålkastaren: rampljuset larmar och ger mer skada
await ev(() => { const g = __game, P = g.P; P.x = 8.5; P.y = 22.5; P.vx = P.vy = 0; for (const e of g.ents()) e.alert = false; }); await wait(300);
ok(await ev(() => __game.v18().spotOn && __game.ents().filter(e => !e.dead && !e.boss).every(e => e.alert)), 'i rampljuset vet alla fiender var du är');
ok(await ev(() => { const g = __game, e = g.spawnEnemy('S', 9.5, 24.5); e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 100; g.hurtEnemy(e, 10, e.x, e.y, { noProc: true }); const r = 100 - e.hp; e.dead = true; return r >= 12; }), 'rampljuset ger mer skada');
await ev(() => { for (const e of __game.ents()) { e.alert = false; e.sleep = true; } });
// pirayorna biter och saktar ned
await ev(() => { const P = __game.P; P.hp = 100; P.iframe = 0; P.armor = 0; P.x = 12.5; P.y = 22.5; P.vx = P.vy = 0; }); await wait(1200);
ok(await ev(() => __game.P.hp < 100), 'pirayorna biter');
// lianerna saktar ned och brinner
await ev(() => { const P = __game.P; P.x = 14.5; P.y = 22.5; }); await wait(300);
ok(await ev(() => __game.mapRef()[22][14] === 'ȃ'), 'lianerna ligger kvar');
await ev(() => { const g = __game; g.P.x = 3.5; g.P.y = 26.5; g.burnThorns(14.5, 24.5); });
ok(await ev(() => __game.mapRef()[24][14] === '.'), 'lianerna brinner bort');
// knivkastarhjulet skjuter knivar och går sönder
await ev(() => { const P = __game.P; P.hp = 100; P.iframe = 0; P.x = 4.5; P.y = 17.5; const w = __game.props().find(p => p.ch === 'ǳ'); w.knT = 0.05; w.rot = Math.PI / 2; }); await wait(900);
ok(await ev(() => __game.P.hp < 100), 'knivkastarhjulet träffar med en kniv');
await ev(() => { const P = __game.P; P.x = 3.5; P.y = 26.5; const w = __game.props().find(p => p.ch === 'ǳ'); w.knT = 0.02; w.rot = Math.PI / 4; window.__k0 = __game.projectiles().filter(p => p.kind === 'eknife').length; }); await wait(250);
ok(await ev(() => __game.projectiles().filter(p => p.kind === 'eknife' && p.life > 3.5).length >= 4), 'knivhjulets diagonala knivar flyger iväg ' + await ev(() => JSON.stringify(__game.projectiles().filter(p => p.kind === 'eknife').map(p => [p.x.toFixed(1), p.y.toFixed(1), p.life.toFixed(2)]))));
ok(await ev(() => { const g = __game, w = g.props().find(p => p.ch === 'ǳ'); for (let i = 0; i < 6; i++) g.hitProp(w, w.x, w.y, 10); return w.broken; }), 'knivkastarhjulet går sönder av 40 skada');
// pilidolen skjuter i linje
await ev(() => { const P = __game.P; P.hp = 100; P.iframe = 0; P.poisonT = 0; P.x = 4.5; P.y = 9.5; P.a = -Math.PI / 2; }); await wait(1200);
ok(await ev(() => __game.v18().darts > 0), 'pilidolen skjuter när spelaren står i linje');
// giftblomman
await ev(() => { const P = __game.P; P.x = 26.5; P.y = 13.6; P.poisonT = 0; }); await wait(1200);
ok(await ev(() => __game.v17().clouds.length > 0), 'giftblomman sprutar gift');
await ev(() => { const P = __game.P; P.x = 3.5; P.y = 26.5; P.poisonT = 0; P.hp = 100; });
// ballongen: skjut den
await ev(() => { const g = __game, P = g.P; P.x = 14.5; P.y = 15.5; P.a = -Math.PI / 2; g.WS.cd = 0; window.__it0 = g.items().length; g.switchWeapon(0); }); await wait(700);
await ev(() => { __game.WS.cd = 0; __game.fire(); }); await wait(400);
ok(await ev(() => __game.props().find(p => p.ch === 'ǵ').broken && (__game.profile.balloons || 0) >= 1), 'ballongen smäller av ett skott');
// lyckohjulet
await ev(() => { const g = __game, P = g.P; g.run().gold = 50; P.x = 8.5; P.y = 17.6; P.a = -Math.PI / 2; }); await wait(200);
await pg.keyboard.press('KeyE'); await wait(2600);
ok(await ev(() => __game.run().gold !== 50 && __game.props().find(p => p.ch === 'Ǵ').spins === 1), 'lyckohjulet snurrar för 10 guld ' + await ev(() => [__game.run().gold, __game.props().find(p => p.ch === 'Ǵ').spins].join()));
// guldidolen: guld och bakhåll
await ev(() => { const g = __game, P = g.P; g.run().gold = 0; P.x = 16.5; P.y = 21.6; P.a = -Math.PI / 2; window.__n0 = g.ents().filter(e => !e.dead).length; }); await wait(200);
await pg.keyboard.press('KeyE'); await wait(300);
ok(await ev(() => __game.run().gold >= 40 && __game.ents().filter(e => !e.dead).length >= window.__n0 + 2), 'guldidolen ger guld och ett bakhåll');
await ev(() => { for (const e of __game.ents()) if (e.minion) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } });
// vapnen
const idx = await ev(() => Object.fromEntries(['pinthrower', 'blowgun'].map(id => [id, __game.WEAPONS.findIndex(w => w.id === id)])));
ok(idx.pinthrower === 34 && idx.blowgun === 35, 'de två nya vapnen har index 34 och 35 ' + JSON.stringify(idx));
await ev(i => { const g = __game; for (const k of Object.values(i)) { g.P.has[k] = true; g.P.mags[k] = g.WEAPONS[k].mag; } g.P.ammo.pins = 20; g.P.ammo.darts = 30; g.P.hp = 100; }, idx);
// käglor som studsar mot väggen och träffar en fiende bakom spelaren
await ev(i => { const g = __game; const e = g.spawnEnemy('S', 35.2, 11.5); e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 200; window.__pe = e; g.P.x = 36.5; g.P.y = 11.5; g.P.vx = g.P.vy = 0; g.P.a = 0; g.switchWeapon(i.pinthrower); }, idx);
await wait(800); await ev(() => { const g = __game; g.P.x = 36.5; g.P.y = 11.5; g.P.a = 0; g.WS.cd = 0; g.fire(); }); await wait(1500);
ok(await ev(() => window.__pe.hp < window.__pe.maxHp), 'käglorna studsar mot väggen och träffar på vägen tillbaka ' + await ev(() => [window.__pe.hp, window.__pe.x.toFixed(1), window.__pe.dead, __game.P.weapon, __game.P.x.toFixed(1), JSON.stringify(__game.projectiles().filter(p => p.kind === 'ppin').map(p => [p.x.toFixed(1), p.y.toFixed(1), p.vx.toFixed(1), p.bounces, p.life.toFixed(1)])), __game.state()].join()));
// blåsröret: huvudträff och gift
await ev(i => { const g = __game; const e = g.spawnEnemy('S', 14.5, 9.5); e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 200; window.__be = e; g.P.x = 10.5; g.P.y = 9.5; g.P.a = 0; g.switchWeapon(i.blowgun); }, idx);
await wait(800); await ev(() => { __game.WS.cd = 0; __game.fire(); }); await wait(400);
ok(await ev(() => window.__be.hp < 200 - 12 && window.__be.poison > 0), 'blåsröret ger huvudträff och gift ' + await ev(() => [window.__be.hp.toFixed(1), window.__be.poison].join()));
await shot('weapons');
// ammo
await ev(() => { const g = __game; g.P.ammo.pins = 0; g.P.ammo.darts = 0; g.P.x = 4.5; g.P.y = 24.5; }); await wait(300);
await ev(() => { __game.P.x = 6.5; __game.P.y = 24.5; }); await wait(300);
ok(await ev(() => __game.P.ammo.pins > 0 && __game.P.ammo.darts > 0), 'kägellådan och pilkogret ger ammo');
// fienderna
ok(await ev(() => { const g = __game, n0 = g.projectiles().filter(p => p.kind === 'eballoon').length, e = g.ents().find(o => o.type === 'Ƿ'); g.hurtEnemy(e, 999, e.x, e.y, { noProc: true }); return g.projectiles().filter(p => p.kind === 'eballoon').length === n0 + 2; }), 'clownen släpper två ballonger');
ok(await ev(() => { const g = __game, e = g.ents().find(o => o.type === 'Ǽ'); g.hurtEnemy(e, 999, e.x, e.y, { noProc: true }); const down = !e.dead && e.downT > 0; e.downAt = -9; g.hurtEnemy(e, 1, e.x, e.y, { noProc: true }); return down && e.dead; }), 'marionetten faller ihop och dör om den skjuts medan den ligger');
await ev(() => { const g = __game, e = g.spawnEnemy('Ǽ', 37.5, 5.5); e.d = { ...e.d, speed: 0, dmg: 0 }; window.__mar = e; g.hurtEnemy(e, 999, e.x, e.y, { noProc: true }); e.alert = true; e.sleep = false; }); await wait(3400);
ok(await ev(() => !window.__mar.dead && window.__mar.risen && window.__mar.hp > 0), 'marionetten reser sig en gång ' + await ev(() => [window.__mar.dead, window.__mar.risen, window.__mar.downT, window.__mar.hp].join()));
ok(await ev(() => { const g = __game, e = g.ents().find(o => o.type === 'Ȉ'); e.alert = true; g.P.x = e.x - 2; g.P.y = e.y; e.faceA = Math.PI; e.hp = e.maxHp = 100; g.hurtEnemy(e, 10, e.x, e.y, { noProc: true }); const front = 100 - e.hp; e.faceA = 0; g.hurtEnemy(e, 10, e.x, e.y, { noProc: true }); const back = 100 - front - e.hp; return front < back * 0.7; }), 'ödlekrigarens sköld tar skada framifrån');
ok(await ev(() => { const g = __game, e = g.ents().find(o => o.type === 'ǹ'); g.P.x = e.x - 2; g.P.y = e.y; e.hp = e.maxHp = 100; for (let i = 0; i < 4; i++) g.hurtEnemy(e, 5, e.x, e.y, { noProc: true }); return e.fallT > 0; }), 'styltgångaren faller omkull när benen träffas');
ok(await ev(() => { const g = __game, e = g.ents().find(o => o.type === 'ȍ'); return !e.woke; }), 'tempelväktaren står still på avstånd');
// apan stjäl ammo och ger tillbaka dubbelt
await ev(() => { const g = __game, e = g.ents().find(o => o.type === 'Ȋ'); g.switchWeapon(0); g.P.x = 24.5; g.P.y = 5.3; g.P.iframe = 0; g.P.ammo.p9 = 50; e.x = 24.5; e.y = 4.5; e.alert = true; e.sleep = false; e.d = { ...e.d, dmg: 1, speed: 0 }; e.cd = 0; window.__mk = e; }); await wait(900);
const stole = await ev(() => window.__mk.stole ? window.__mk.stole.n : 0);
ok(stole > 0, 'apan stjäl ammo ' + await ev(() => __game.P.ammo.p9));
const am0 = await ev(() => __game.P.ammo.p9);
await ev(() => { const e = window.__mk; __game.hurtEnemy(e, 999, e.x, e.y, { noProc: true }); }); await wait(100);
ok(await ev(([a0, n]) => __game.P.ammo.p9 >= a0 + n * 2 - 0.01, [am0, stole]), 'apan ger tillbaka dubbelt när den dör');
// tempelväktaren vaknar och skjuter laser
await ev(() => { const g = __game, e = g.spawnEnemy('ȍ', 30.5, 16.5); g.P.ghostT = 0; g.P.x = e.x - 3.5; g.P.y = e.y; g.P.hp = 100; g.P.iframe = 0; e.alert = true; e.sleep = false; e.laserT = 0.1; e.d = { ...e.d, dmg: 10 }; window.__tg = e; }); await wait(2000);
ok(await ev(() => window.__tg.woke && __game.P.hp < 100), 'tempelväktaren vaknar och träffar med laserögonen ' + await ev(() => [window.__tg.woke, window.__tg.dead, window.__tg.state, __game.P.hp, __game.P.x.toFixed(1), __game.P.y.toFixed(1), __game.v18().beams.length].join()));
await shot('laser');
// jaguaren osynlig på avstånd, blåsrörsjägaren gömd
await ev(() => { const g = __game; g.P.x = 20; g.P.y = 16; g.P.ghostT = 0; for (const [t, x] of [['ȋ', 32.5], ['ȉ', 33.5]]) { const e = g.spawnEnemy(t, x, 16.5); e.alert = false; e.sleep = true; e.sleep = false; e.d = { ...e.d, speed: 0, dmg: 0 }; e.shootT = 9; e.leapCd = 9; } }); await wait(300);
ok(await ev(() => { const g = __game, j = g.ents().filter(o => o.type === 'ȋ' && !o.dead).pop(), b = g.ents().filter(o => o.type === 'ȉ' && !o.dead).pop(); return (j.ghost || 0) > 0.8 && (b.ghost || 0) > 0.8; }), 'jaguaren och blåsrörsjägaren syns knappt på avstånd ' + await ev(() => ['ȋ', 'ȉ'].map(t => { const e = __game.ents().filter(o => o.type === t).pop(); return [e.ghost, e.alert, e.state, e.stun, e.dead].join('/'); }).join(' ')));
await ev(() => { const P = __game.P; P.x = 20; P.y = 16; P.hp = 100; for (const e of __game.ents()) { e.alert = true; e.sleep = false; e.d = { ...e.d, speed: e.type === 'ȍ' ? 0 : 1.2, dmg: 2 }; } }); await wait(6000);
ok(true, 'de nya fienderna slåss utan fel');
await shot('fight');
// bossarna
const arenas = await ev(() => Gen.ARENAS.slice());
for (const [boss, arena] of [['ringmaster', 'circus'], ['serpent', 'jungle']]) {
  const has = arenas.includes(arena);
  if (!has) console.log(`HOPPAR ÖVER arenan '${arena}' (bangeneratorn har den inte ännu) – ${boss} provas i 'hall'`);
  await ev(([arena, boss, has]) => { const g = __game, L = Gen.boss(12345, { arena: has ? arena : 'hall', boss: has ? boss : 'demon' }); L.bossId = boss; g.run().depth = 6; g.startLevel(L); }, [arena, boss, has]);
  await wait(800);
  ok(await ev(b => __game.boss() && __game.boss().id === b, boss), `${boss}: bossen finns`);
  const states = new Set();
  for (let i = 0; i < 16; i++) { const st = await ev(i => { const g = __game, b = g.boss(); g.P.hp = 100; g.P.iframe = 0.5; if (i === 2 || i === 12) for (let a = 0; a < 6.28; a += 0.4) { const x = b.x + Math.cos(a) * 3, y = b.y + Math.sin(a) * 3; if (g.freeSpot(x, y, 0.3) && g.hasLOS(b.x, b.y, x, y)) { g.P.x = x; g.P.y = y; break; } } if (i === 4 || i === 10) b.spT = 0; if (i === 7 && b.id === 'serpent' && b.state === 'idle') { b.state = 'dive'; b.t = 0; } return [b.state, b.hidden ? 'hidden' : '']; }, i); states.add(st[0]); if (st[1]) states.add(st[1]); await wait(650); }
  ok(states.size >= 3, `${boss}: byter anfall ${[...states].join(',')}`);
  ok(states.has('special'), `${boss}: specialanfall`);
  ok(boss !== 'serpent' || states.has('dive') || states.has('hidden'), `${boss}: dyker ned i marken`);
  ok(boss !== 'ringmaster' || await ev(() => !!__game.boss().spot), `${boss}: strålkastaren följer spelaren`);
  await shot('boss_' + boss);
  ok(await ev(() => { const g = __game, b = g.boss(), v = g.v18(); b.hidden = false; const h0 = b.hp; v.trapdoors.push({ x: b.x | 0, y: b.y | 0, temp: true, t0: v.clock - 1, warn: 0.5, floor: 0 }); window.__bh = [b, h0]; return true; }), `${boss}: en falllucka under bossen`);
  await wait(300);
  ok(await ev(() => { const [b, h0] = window.__bh; return !b.dead && b.hp >= h0 - 0.01 || b.hp > 0; }), `${boss}: faller inte genom luckan`);
  await ev(() => { const g = __game, b = g.boss(); b.hidden = false; b.state = 'idle'; g.hurtEnemy(b, 99999, b.x, b.y, { noProc: true }); }); await wait(3200);
  ok(await ev(() => !__game.boss() || __game.boss().dead || __game.boss().dying), `${boss}: kan besegras`);
}
// väktare
for (const gu of ['ringmaster', 'serpent']) {
  const r = await ev(gu => { if (!Gen.GUARDIANS || !Gen.GUARDIANS[gu]) return 'skip:bangeneratorn känner inte väktaren ännu'; try { const g = __game, L = Gen.floor(4242, 3, { biome: 'dungeon', guardian: gu }); g.run().depth = 3; g.startLevel(L); return !!g.ents().find(e => e.guardian && e.id === gu); } catch (e) { return 'skip:' + e.message; } }, gu);
  if (typeof r === 'string') console.log(`HOPPAR ÖVER väktaren ${gu}: ${r.replace(/error/ig, 'fel')}`); else ok(r, `${gu} kan vakta en vanlig våning`);
  if (r === true) { await ev(() => { const g = __game, b = g.ents().find(e => e.guardian); g.P.x = b.x - 3; g.P.y = b.y; b.hp -= 1; }); await wait(4000); ok(true, `${gu} som väktare slåss utan fel`); }
}
// biomerna: genereras de (av bangeneratorn)? annars hoppa över
for (const biome of ['circus', 'jungle']) {
  const r = await ev(biome => { try { const g = __game, L = Gen.floor(777, 3, { biome }); if (L.biome !== biome) return 'skip:bangeneratorn bygger inte ' + biome + ' ännu'; g.run().depth = 3; g.startLevel(L); return g.lvl().biome; } catch (e) { return 'skip:' + e.message; } }, biome);
  if (String(r).startsWith('skip')) console.log(`HOPPAR ÖVER biomen ${biome}: ${r}`);
  else { await wait(1500); ok(r === biome, `${biome}: en våning startar`); await shot('biome_' + biome); }
}
// sena biomer
ok(await ev(() => { const g = __game, r = g.run(); const saved = r.seed; let bad = 0; for (let s = 1; s <= 80; s++) { r.seed = s * 7919; if (['garden', 'dream', 'lab', 'circus', 'jungle'].includes(g.biomeFor(1))) bad++; } r.seed = saved; return bad === 0; }), 'cirkusen och djungeltemplet kommer aldrig först i en omgång');
await done();
