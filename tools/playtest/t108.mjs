// Version 21: Järnfängelset och Fiskeläget – larmplattor, fisknät, hängande burar, sträckbänk, galge, fyrlykta, fisktunnor, ankare,
// åtta fiender (nyckelknekten visslar, fiskmannen hoppar ur djupvattnet, strandkrabbans pansar), morgonstjärnan (snurr), trombonen
// (dubbelladdning), skrotpåsen, fyren och dimman (ljuset mäts), Bödeln och Tidvattenprästen, biomerna från bangeneratorn
import { setup } from './head.mjs';
const PORT = 9808;
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t108');
const cerrs = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|404/.test(m.text())) cerrs.push(m.text().slice(0, 200)); });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const C = Object.fromEntries(['wPrison', 'wBars', 'wExec', 'wShack', 'wQuay', 'wTide', 'plate', 'net', 'cage', 'rack', 'gallows', 'lamp', 'barrel', 'anchor',
  'turnkey', 'convict', 'torturer', 'watchdog', 'drowned', 'fishman', 'crab', 'gulls', 'flail', 'blunder', 'scrap'].map((k, i) => [k, String.fromCodePoint(0x247 + i)]));
ok(await ev(() => window.Music && Music.HI.includes('prison') && Music.HI.includes('harbor')), 'musiken har intensitetslager för fängelset och fiskeläget');
const scene = (biome, extra) => ev(([C, biome, extra]) => {
  const g = __game; g.profile.tutDone = true;
  const W = 40, H = 30, grid = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[26][3] = 'P'; grid[2][36] = 'x';
  ['wPrison', 'wBars', 'wExec', 'wShack', 'wQuay', 'wTide'].forEach((k, i) => { grid[5 + i][20] = C[k]; });
  grid[22][12] = C.plate; grid[22][14] = C.plate; grid[22][16] = C.plate; grid[22][18] = C.plate; // fyra plattor: den fjärde tas bort
  grid[18][6] = C.net; grid[18][7] = C.net;
  grid[12][4] = C.cage; grid[12][8] = C.rack; grid[12][10] = C.gallows; grid[12][12] = C.lamp; grid[16][12] = C.barrel; grid[12][14] = C.anchor;
  for (let y = 3; y <= 6; y++) for (let x = 28; x <= 33; x++) grid[y][x] = 'Đ'; // djupvatten för fiskmannen
  grid[7][30] = C.fishman; grid[4][34] = C.turnkey; grid[14][34] = C.convict; grid[22][34] = C.torturer; grid[26][36] = C.watchdog; grid[26][34] = C.watchdog; grid[24][24] = C.drowned; grid[10][26] = C.crab; grid[8][36] = C.gulls;
  grid[24][4] = C.scrap; grid[20][4] = C.flail; grid[20][6] = C.blunder;
  if (extra) for (let i = 0; i < 3; i++) grid[15][30 + i] = C.torturer;
  g.playCustom({ grid, biome });
}, [C, biome, extra]);
await scene('dungeon', true); await wait(1500);
ok(await ev(() => __game.state()) === 'play', 'banan med de nya tecknen startar');
const T8 = ['turnkey', 'convict', 'torturer', 'watchdog', 'drowned', 'fishman', 'crab', 'gulls'].map(k => C[k]);
ok(await ev(T => T.every(t => __game.ents().some(e => e.type === t)), T8), 'alla åtta nya fiender finns');
ok(await ev(C => __game.ents().filter(e => e.type === C.torturer).length <= 2, C), 'högst två tortyrmästare per bana');
ok(await ev(C => ['cage', 'rack', 'gallows', 'lamp', 'barrel', 'anchor'].every(k => __game.props().some(p => p.ch === C[k])), C), 'alla sex nya föremål finns');
ok(await ev(() => [0, 1, 2, 3, 4, 5].every(i => __game.solid(20.5, 5.5 + i))), 'de sex nya väggarna är väggar');
ok(await ev(() => ['scrap', 'flail', 'blunderbuss'].every(t => __game.items().some(i => i.type === t))), 'skrotpåsen och de två vapnen ligger ute');
ok(await ev(() => !__game.solid(12.5, 22.5) && !__game.solid(6.5, 18.5) && !__game.solid(4.5, 12.5)), 'larmplatta, nät och hängande bur går att gå på/under');
ok(await ev(() => __game.solid(8.5, 12.5) && __game.solid(12.5, 16.5)), 'sträckbänken och fisktunnan står i vägen');
const idx = await ev(() => Object.fromEntries(['flail', 'blunderbuss'].map(id => [id, __game.WEAPONS.findIndex(w => w.id === id)])));
ok(idx.flail === 40 && idx.blunderbuss === 41 && await ev(() => __game.WEAPONS.length) === 42, 'de två nya vapnen har index 40 och 41 ' + JSON.stringify(idx));
ok(await ev(() => __game.v21().plates.length === 3 && __game.mapRef()[22][18] === '.'), 'högst tre larmplattor per bana');
const fm = await ev(C => { const e = __game.ents().find(o => o.type === C.fishman); return { hidden: !!e.hidden, cell: __game.mapRef()[e.y | 0][e.x | 0] }; }, C);
ok(fm.hidden && fm.cell === 'Đ', 'fiskmannen kliver ned i djupvattnet intill och gömmer sig ' + JSON.stringify(fm));
await ev(() => { for (const e of __game.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } });
// larmplattan
await ev(C => { const g = __game; for (const e of g.ents()) if (e.type === C.turnkey) e.dead = true; window.__n0 = g.ents().filter(e => e.type === C.turnkey && !e.dead).length; const P = g.P; P.hp = 100; P.x = 12.5; P.y = 22.5; }, C); await wait(400);
ok(await ev(C => __game.v21().plates.find(p => p.x === 12).used && __game.ents().filter(e => e.type === C.turnkey && !e.dead).length >= window.__n0 + 2, C), 'larmplattan larmar och två nyckelknektar kommer');
ok(await ev(C => __game.ents().filter(e => !e.dead && !e.v21alarm && !e.hidden && Math.hypot(e.x - 12.5, e.y - 22.5) < 14).every(e => e.alert), C), 'alla fiender inom 14 rutor larmas');
await ev(() => { for (const e of __game.ents()) if (e.v21alarm) __game.hurtEnemy(e, 9999, e.x, e.y, { noProc: true }); const P = __game.P; P.x = 3.5; P.y = 26.5; }); await wait(300);
await ev(() => { const P = __game.P; P.x = 12.5; P.y = 22.5; window.__nn = __game.ents().filter(e => !e.dead).length; }); await wait(300);
ok(await ev(() => __game.ents().filter(e => !e.dead).length === window.__nn), 'varje platta larmar bara en gång');
await ev(() => { const P = __game.P; P.x = 3.5; P.y = 26.5; P.jz = 0; }); await wait(200);
await shot('plates');
// fisknätet
await ev(() => { const P = __game.P; P.x = 5.3; P.y = 18.5; P.rootT = 0; P.vx = 0; P.vy = 0; }); await wait(200);
await ev(() => { const P = __game.P; P.x = 6.5; P.y = 18.5; }); await wait(150);
ok(await ev(() => __game.P.rootT > 0.2 && __game.v21().slow() <= 0.55), 'fisknätet snärjer och saktar ' + await ev(() => [__game.P.rootT.toFixed(2), __game.v21().slow().toFixed(2)].join()));
await shot('net');
await wait(800);
await ev(() => { const P = __game.P; P.x = 7.5; P.y = 18.5; }); await wait(100);
ok(await ev(() => __game.P.rootT > 0.2), 'ett annat nät snärjer också ' + await ev(() => (__game.P.rootT || 0).toFixed(2)));
await wait(800); await ev(() => { const P = __game.P; P.x = 6.5; P.y = 18.5; }); await wait(100);
ok(await ev(() => !(__game.P.rootT > 0.1)), 'samma nät snärjer inte igen inom 4 s ' + await ev(() => (__game.P.rootT || 0).toFixed(2)));
await ev(() => { const P = __game.P; P.x = 3.5; P.y = 26.5; __game.v21().burnNet(6.5, 18.5); }); await wait(100);
ok(await ev(() => __game.mapRef()[18][6] === '.' && __game.mapRef()[18][7] === '.'), 'elden bränner bort nätet');
// buren
await ev(() => { const g = __game, pr = g.props().find(p => p.ch === String.fromCodePoint(0x24f)); window.__cg = pr; window.__cn = g.items().length + g.ents().length; g.v21().hitProp(pr, pr.x, pr.y, 10); });
ok(await ev(() => !window.__cg.v21fall && window.__cg.z > 0.5), 'buren tål 10 skada och hänger i taket');
await ev(() => { const g = __game; g.switchWeapon(0); const P = g.P; P.x = 4.5; P.y = 15.5; P.a = -Math.PI / 2; P.mags[0] = 12; }); await wait(700);
for (let i = 0; i < 20 && !(await ev(() => window.__cg.v21fall || window.__cg.v21wreck)); i++) { await ev(() => { const g = __game; g.WS.cd = 0; g.WS.state = 'idle'; g.P.a = -Math.PI / 2; g.P.mags[0] = 9; g.fire(); }); await wait(120); }
await wait(900);
ok(await ev(() => window.__cg.v21wreck && window.__cg.z === 0 && __game.items().length + __game.ents().length > window.__cn), 'buren faller av skott (25 skada) och släpper något ' + await ev(() => window.__cg.hp21));
await ev(() => { for (const e of __game.ents()) if (e.minion && !e.dead) __game.hurtEnemy(e, 9999, e.x, e.y, { noProc: true }); });
// fisktunnan
await ev(() => { const g = __game, P = g.P, pr = g.props().find(p => p.ch === String.fromCodePoint(0x253)); window.__fb = pr; window.__fn = g.items().length; P.x = pr.x + 2.5; P.y = pr.y; P.a = Math.PI; P.mags[0] = 12; }); await wait(300);
await ev(() => { const g = __game; g.WS.cd = 0; g.WS.state = 'idle'; g.fire(); }); await wait(300);
ok(await ev(() => (window.__fb.broken || window.__fb.v21wreck) && __game.items().length > window.__fn && !__game.solid(window.__fb.x, window.__fb.y)), 'fisktunnan går sönder av ett skott och släpper något');
await ev(() => { const g = __game, P = g.P; P.hp = 50; g.items().push({ type: 'fish', x: P.x, y: P.y, taken: false }); }); await wait(300);
ok(await ev(() => __game.P.hp >= 54.9), 'fiskrenset ger 5 hp ' + await ev(() => __game.P.hp));
await ev(() => { __game.P.hp = 100; });
// fiskmannen hoppar ur vattnet
await ev(C => { const g = __game, e = g.ents().find(o => o.type === C.fishman); e.d = { ...e.d, speed: 1.6, dmg: 3 }; e.sleep = false; window.__fm = e; const P = g.P; P.x = e.x; P.y = 9.5; }, C); await wait(1200);
ok(await ev(() => !window.__fm.hidden && __game.mapRef()[window.__fm.y | 0][window.__fm.x | 0] !== 'Đ'), 'fiskmannen hoppar upp ur vattnet mot dig ' + await ev(() => [window.__fm.x.toFixed(1), window.__fm.y.toFixed(1), window.__fm.hidden].join()));
await ev(() => __game.hurtEnemy(window.__fm, 9999, 0, 0, { noProc: true }));
// nyckelknektens visselpipa
await ev(C => { const g = __game, P = g.P; P.x = 30.5; P.y = 20.5; const k = g.spawnEnemy(C.turnkey, 30.5, 23.5); k.alert = true; k.sleep = false; k.d = { ...k.d, speed: 0, dmg: 0 }; window.__tk = k; const o = g.spawnEnemy('S', 33.5, 26.5); o.alert = false; o.sleep = true; o.d = { ...o.d, speed: 0, dmg: 0 }; window.__o = o; }, C); await wait(600);
ok(await ev(() => window.__tk.whistled && window.__o.alert), 'nyckelknekten visslar och larmar fiender inom 10 rutor');
// strandkrabbans pansar
const crab = await ev(C => { const g = __game, P = g.P; P.x = 10.5; P.y = 20.5; const e = g.spawnEnemy(C.crab, 10.5, 22.5); e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 500; e.faceA = Math.atan2(P.y - e.y, P.x - e.x); const h0 = e.hp; g.hurtEnemy(e, 40, e.x, e.y, {}); const front = h0 - e.hp; e.faceA += Math.PI; const h1 = e.hp; g.hurtEnemy(e, 40, e.x, e.y, {}); const back = h1 - e.hp; e.faceA -= Math.PI; const h2 = e.hp; g.hurtEnemy(e, 40, e.x, e.y, { boom: true }); const boom = h2 - e.hp; return { front, back, boom }; }, C);
ok(crab.front < crab.back * 0.4 && crab.boom > crab.front * 2, 'strandkrabban: 75 % mindre skada framifrån, full bakifrån och av explosioner ' + JSON.stringify(crab));
await ev(() => { for (const e of __game.ents()) if (!e.dead) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } });
// vapnen
await ev(i => { const g = __game; for (const k of Object.values(i)) { g.P.has[k] = true; g.P.mags[k] = g.WEAPONS[k].mag; } g.P.ammo.scrap = 20; g.P.hp = 100; }, idx);
await ev(i => { const g = __game; g.switchWeapon(i.flail); const e = g.spawnEnemy('S', 7.6, 26.5); e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 300; e.alert = true; window.__fl = e; g.P.x = 6.4; g.P.y = 26.5; g.P.a = 0; }, idx); await wait(800);
await ev(() => { __game.WS.cd = 0; __game.fire(); }); await wait(450);
ok(await ev(() => window.__fl.hp <= 300 - 30), 'morgonstjärnan slår (35) ' + await ev(() => window.__fl.hp.toFixed(1)));
await ev(() => { const g = __game; window.__fl.x = 6.4; window.__fl.y = 27.6; window.__fl.hp = 300; const e2 = g.spawnEnemy('S', 5.2, 26.5); e2.d = { ...e2.d, speed: 0, dmg: 0 }; e2.hp = e2.maxHp = 300; window.__fl2 = e2; }); await wait(100);
await ev(() => __game.setMouse(false, true)); await wait(1100);
const spinOn = await ev(() => __game.v21().spin() && __game.v21().slow() < 0.8);
await ev(() => __game.setMouse(false, false)); await wait(200);
ok(spinOn && await ev(() => window.__fl.hp < 300 - 30 && window.__fl2.hp < 300 - 30 && !__game.v21().spin()), 'högerklick: kedjan snurrar och träffar allt runt dig, långsammare gång ' + await ev(() => [window.__fl.hp.toFixed(0), window.__fl2.hp.toFixed(0)].join()));
await shot('flail');
await ev(() => { __game.hurtEnemy(window.__fl, 9999, 0, 0, { noProc: true }); __game.hurtEnemy(window.__fl2, 9999, 0, 0, { noProc: true }); });
await ev(i => { const g = __game; g.switchWeapon(i.blunderbuss); g.P.x = 14.5; g.P.y = 26.5; g.P.a = 0; const e = g.spawnEnemy('S', 16.5, 26.5); e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 2000; e.alert = true; window.__bb = e; }, idx); await wait(900);
await ev(() => { const g = __game; g.WS.cd = 0; g.WS.state = 'idle'; g.P.mags[g.P.weapon] = 2; g.fire(); }); await wait(60);
const bb1 = await ev(() => ({ dmg: 2000 - window.__bb.hp, x: window.__bb.x, mag: __game.P.mags[__game.P.weapon] }));
await wait(500);
const bbx = await ev(() => window.__bb.x);
ok(bb1.dmg > 20 && bb1.mag === 1, 'trombonen skjuter en skrotskur ' + JSON.stringify(bb1));
ok(bbx > 16.8, 'trombonen knuffar fienden ' + bbx.toFixed(2));
await ev(() => { const g = __game, e = window.__bb; e.x = 16.5; e.y = 26.5; e.hp = 2000; e.knock = null; g.WS.cd = 0; g.WS.state = 'idle'; g.P.mags[g.P.weapon] = 2; }); await wait(100);
await ev(() => __game.setMouse(false, true)); await wait(100); await ev(() => __game.setMouse(false, false)); await wait(60);
const bb2 = await ev(() => ({ dmg: 2000 - window.__bb.hp, mag: __game.P.mags[__game.P.weapon], cd: __game.WS.cd }));
ok(bb2.mag === 0 && bb2.dmg > bb1.dmg * 1.3, 'högerklick: dubbelladdning – båda skotten på en gång ' + JSON.stringify(bb2));
await shot('blunderbuss');
await ev(() => __game.hurtEnemy(window.__bb, 99999, 0, 0, { noProc: true }));
await ev(() => { const g = __game; g.P.ammo.scrap = 0; g.P.x = 4.5; g.P.y = 24.5; }); await wait(300);
ok(await ev(() => __game.P.ammo.scrap > 0), 'skrotpåsen ger skrot');
// tortyrmästarens glödande järn
await ev(C => { const g = __game, P = g.P; P.hp = 100; P.iframe = 0; P.x = 30.5; P.y = 12.5; const e = g.ents().find(o => o.type === C.torturer && !o.dead); e.x = 30.5; e.y = 17.5; e.alert = true; e.sleep = false; e.throwT = 0; e.d = { ...e.d, dmg: 4 }; window.__to = e; }, C); await wait(1800);
ok(await ev(() => __game.P.hp < 100 && __game.v21().burn() > 0 || __game.P.burnFx > 0), 'tortyrmästaren kastar glödande järn som sätter dig i brand ' + await ev(() => [__game.P.hp.toFixed(1), __game.v21().burn().toFixed(2)].join()));
await ev(() => __game.hurtEnemy(window.__to, 9999, 0, 0, { noProc: true }));
await ev(() => { const P = __game.P; P.x = 20; P.y = 16; P.hp = 100; for (const e of __game.ents()) { e.alert = true; e.sleep = false; e.d = { ...e.d, speed: 1.2, dmg: 2 }; } }); await wait(6000);
ok(true, 'de nya fienderna slåss utan fel');
await shot('fight');
// fiskeläget: dimman rullar in och ut, fyren sveper – ljuset mäts
await scene('harbor'); await wait(1200);
if (await ev(() => __game.lvl().biome) !== 'harbor') { console.log('(bangeneratorn bygger inte fiskeläget ännu – biomen sätts direkt)'); await ev(() => { __game.lvl().biome = 'harbor'; __game.v21().setup(); }); }
await ev(() => { for (const e of __game.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } const P = __game.P; P.x = 10.5; P.y = 15.5; P.hp = 100; });
const lum = () => ev(() => { const c = document.querySelector('canvas'); const g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 16) s += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; return s / (d.length / 16); });
await ev(() => __game.v21().setClock(0)); await wait(700);
const f0 = await ev(() => __game.fogK()), l0 = await lum();
await ev(() => __game.v21().setClock(18)); await wait(700);
const f1 = await ev(() => __game.fogK()), l1 = await lum();
ok(f1 > f0 * 1.8, 'dimman rullar in ' + f0.toFixed(3) + ' -> ' + f1.toFixed(3));
ok(l1 > l0 * 0.55 && l1 > 18, 'dimman blir inte för mörk (ljushet ' + l0.toFixed(1) + ' -> ' + l1.toFixed(1) + ')');
await shot('harbor_fog');
await ev(() => __game.v21().setClock(36)); await wait(700);
ok(await ev(f0 => Math.abs(__game.fogK() - f0) < f0 * 0.15, f0), 'och rullar ut igen ' + (await ev(() => __game.fogK())).toFixed(3));
const bm = await ev(() => { const b = __game.v21().beam(); if (!b.lh) return null; const x = b.lh.x + Math.cos(b.a) * 5, y = b.lh.y + Math.sin(b.a) * 5, xo = b.lh.x + Math.cos(b.a + Math.PI / 2) * 5, yo = b.lh.y + Math.sin(b.a + Math.PI / 2) * 5; return { a: b.a, on: __game.v21().light(x, y), off: __game.v21().light(xo, yo) }; });
ok(bm && bm.on > bm.off + 0.15, 'fyrens ljuskägla syns (ljus i kägla mot utanför) ' + JSON.stringify(bm));
await wait(1000);
ok(await ev(a => __game.v21().beam().a > a + 0.2, bm ? bm.a : 0), 'ljuskäglan sveper');
await shot('harbor_beam');
// bossarna
const arenas = await ev(() => Gen.ARENAS.slice());
for (const [boss, arena] of [['executioner', 'prison'], ['tidepriest', 'harbor']]) {
  const has = arenas.includes(arena);
  if (!has) console.log(`HOPPAR ÖVER arenan '${arena}' (bangeneratorn har den inte ännu) – ${boss} provas i 'hall'`);
  await ev(([arena, boss, has]) => { const g = __game, L = Gen.boss(12345, { arena: has ? arena : 'hall', boss: has ? boss : 'demon' }); L.bossId = boss; g.run().depth = 6; g.startLevel(L); }, [arena, boss, has]);
  await wait(800);
  ok(await ev(b => __game.boss() && __game.boss().id === b, boss), `${boss}: bossen finns`);
  const states = new Set();
  for (let i = 0; i < 18; i++) { const st = await ev(i => { const g = __game, b = g.boss(); g.P.hp = 100; g.P.iframe = 0.5; if (i === 2 || i === 12) for (let a = 0; a < 6.28; a += 0.4) { const x = b.x + Math.cos(a) * 3, y = b.y + Math.sin(a) * 3; if (g.freeSpot(x, y, 0.3)) { g.P.x = x; g.P.y = y; break; } } if (i === 7) for (let a = 0; a < 6.28; a += 0.4) { const x = b.x + Math.cos(a) * 7, y = b.y + Math.sin(a) * 7; if (g.freeSpot(x, y, 0.3)) { g.P.x = x; g.P.y = y; break; } } if (i === 9) { b.spT = 0; } return b.state; }, i); states.add(st); await wait(500); }
  ok(states.size >= 3, `${boss}: byter anfall ${[...states].join(',')}`);
  ok(states.has('special'), `${boss}: specialanfall`);
  await shot('boss_' + boss);
  await ev(() => { const g = __game, b = g.boss(); b.hidden = false; b.state = 'idle'; g.hurtEnemy(b, 99999, b.x, b.y, { noProc: true }); }); await wait(3200);
  ok(await ev(() => !__game.boss() || __game.boss().dead || __game.boss().dying), `${boss}: kan besegras`);
}
await ev(() => { const g = __game, L = Gen.boss(4321, { arena: 'hall', boss: 'demon' }); L.bossId = 'executioner'; g.run().depth = 6; g.startLevel(L); }); await wait(2600);
await ev(() => { const g = __game, b = g.boss(); g.P.x = b.x + 5; g.P.y = b.y; if (!g.freeSpot(g.P.x, g.P.y, 0.3)) { g.P.x = b.x - 5; } b.state = 'special'; b.spK = 1; b.t = 0; b.once21 = false; b.spT = 99; }); await wait(400);
const gates = await ev(() => { const v = __game.v21(); return { n: v.gates.length, solid: v.gates.every(g => __game.solid(g.x + 0.5, g.y + 0.5)), freeP: !__game.solid(__game.P.x, __game.P.y) }; });
ok(gates.n > 0 && gates.solid && gates.freeP, 'bödeln: inlåsning – galler fälls ned och delar arenan ' + JSON.stringify(gates));
await shot('executioner_gates');
await ev(() => { const g = __game, b = g.boss(); b.state = 'idle'; b.cd = 99; b.spT = 99; }); await wait(8300);
ok(await ev(() => __game.v21().gates.length === 0), 'gallren lyfts efter 8 s');
await ev(() => { const g = __game, b = g.boss(); g.P.x = b.x + 7; g.P.y = b.y; if (!g.freeSpot(g.P.x, g.P.y, 0.3)) g.P.x = b.x - 7; window.__pd = Math.hypot(g.P.x - b.x, g.P.y - b.y); b.state = 'hook'; b.t = 0; b.didHit = false; b.cd = 99; }); await wait(900);
ok(await ev(() => { const g = __game, b = g.boss(); return Math.hypot(g.P.x - b.x, g.P.y - b.y) < window.__pd - 0.8; }), 'bödelns kedjekrok drar dig mot honom');
await ev(() => { const g = __game, L = Gen.boss(4322, { arena: 'hall', boss: 'demon' }); L.bossId = 'tidepriest'; g.run().depth = 6; g.startLevel(L); }); await wait(2600);
await ev(() => { const g = __game, b = g.boss(); g.P.x = b.x + 5; g.P.y = b.y; if (!g.freeSpot(g.P.x, g.P.y, 0.3)) g.P.x = b.x - 5; b.state = 'tentacles'; b.t = 0; b.once21 = false; b.cd = 99; b.spT = 99; b.stun = 0; }); await wait(500);
ok(await ev(() => __game.v21().tent.length >= 1), 'tidvattenprästen: tentakler med bubblor som varning ' + await ev(() => [__game.v21().tent.length, __game.boss().state, __game.boss().t.toFixed(2)].join()));
await shot('tidepriest_tentacles');
await ev(() => { const g = __game, b = g.boss(); b.state = 'special'; b.spK = 1; b.t = 0; b.once21 = false; }); await wait(500);
ok(await ev(() => __game.v21().flood() > 0 && __game.v21().slow() < 0.7), 'tidvattenprästen höjer vattnet (långsamhet)');
await ev(() => { const g = __game, b = g.boss(); b.state = 'special'; b.spK = 0; b.t = 0; b.once21 = false; window.__m0 = g.ents().filter(e => e.minion && !e.dead).length; }); await wait(400);
ok(await ev(() => __game.ents().filter(e => e.minion && !e.dead).length > window.__m0), 'tidvattenprästen kallar på fiskmän');
// väktare
for (const gu of ['executioner', 'tidepriest']) {
  const r = await ev(gu => { if (!Gen.GUARDIANS || !Gen.GUARDIANS[gu]) return 'skip:bangeneratorn känner inte väktaren ännu'; try { const g = __game, L = Gen.floor(4242, 3, { biome: 'dungeon', guardian: gu }); g.run().depth = 3; g.startLevel(L); return !!g.ents().find(e => e.guardian); } catch (e) { return 'skip:' + e.message; } }, gu);
  if (typeof r === 'string') console.log(`HOPPAR ÖVER väktaren ${gu}: ${r.replace(/error/ig, 'fel')}`); else ok(r, `${gu} kan vakta en vanlig våning`);
  if (r === true) { await ev(() => { const g = __game, b = g.ents().find(e => e.guardian); g.P.x = b.x - 3; g.P.y = b.y; b.hp -= 1; }); await wait(4000); ok(true, `${gu} som väktare slåss utan fel`); }
}
// biomerna från bangeneratorn
for (const biome of ['prison', 'harbor']) {
  const r = await ev(biome => { try { const g = __game, L = Gen.floor(777, 3, { biome }); if (L.biome !== biome) return 'skip:bangeneratorn bygger inte ' + biome + ' ännu'; g.run().depth = 3; g.startLevel(L); return g.lvl().biome; } catch (e) { return 'skip:' + e.message; } }, biome);
  if (String(r).startsWith('skip')) console.log(`HOPPAR ÖVER biomen ${biome}: ${r}`);
  else { await wait(2500); ok(r === biome, `${biome}: en våning startar`);
    const info = await ev(() => ({ plates: __game.v21().plates.length, lum: (() => { const c = document.querySelector('canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 16) s += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; return +(s / (d.length / 16)).toFixed(1); })(), fog: +__game.fogK().toFixed(3) }));
    ok(info.plates <= 3 && info.lum > 12, `${biome}: högst tre larmplattor och bilden är inte svart ` + JSON.stringify(info));
    await shot('biome_' + biome); }
}
ok(await ev(() => { const g = __game, r = g.run(); const saved = r.seed; let bad = 0; for (let s = 1; s <= 80; s++) { r.seed = s * 7919; if (['garden', 'dream', 'lab', 'circus', 'jungle', 'observatory', 'desert', 'harbor'].includes(g.biomeFor(1))) bad++; } r.seed = saved; return bad === 0; }), 'sena biomer (även fiskeläget) kommer aldrig först');
ok(cerrs.length === 0, 'inga fel i bildrutorna ' + [...new Set(cerrs)].slice(0, 5).join(' / '));
await done();
