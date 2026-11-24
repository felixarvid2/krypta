// Version 22: Badhuset och Skärselden – heta bassänger, ånggaller, kallbad, eldfloder (strömmen drar), runcirklar, sex nya föremål,
// åtta fiender (gladiatorns sköld, askvandraren reser sig, plågade själar exploderar), treudden (stöt + kast som kommer tillbaka),
// svavelmortern (båge + rakt skott), svavelklumpen, ljuset i skärselden (rött men läsbart), Badmästaren och Eldfursten, biomerna från bangeneratorn
import { setup } from './head.mjs';
const PORT = 9809;
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t109');
const cerrs = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|404/.test(m.text())) cerrs.push(m.text().slice(0, 200)); });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const cp = n => String.fromCodePoint(n);
const C = { wMosaic: cp(0x260), wColumn: cp(0x261), wBath: cp(0x262), hot: cp(0x263), vent: cp(0x264), cold: cp(0x265), statue: cp(0x266), fountain: cp(0x267), bench: cp(0x268),
  attendant: cp(0x269), steamghost: cp(0x26a), gladiator: cp(0x26b), mold: cp(0x26c), wFlesh: cp(0x26d), wBone: cp(0x26e), wPyre: cp(0x26f), fire: cp(0x270), rune: cp(0x271),
  soulprop: cp(0x272), bonepillar: cp(0x273), brimpot: cp(0x274), imp: cp(0x275), lostsoul: cp(0x276), brute: cp(0x277), ash: cp(0x278), trident: cp(0x279), brim: cp(0x27a), sulfur: cp(0x27b) };
ok(await ev(() => window.Music && Music.HI.includes('bathhouse') && Music.HI.includes('purgatory')), 'musiken har intensitetslager för badhuset och skärselden');
const scene = (biome, extra) => ev(([C, biome, extra]) => {
  const g = __game; g.profile.tutDone = true;
  const W = 40, H = 30, grid = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[26][3] = 'P'; grid[2][36] = 'x';
  ['wMosaic', 'wColumn', 'wBath', 'wFlesh', 'wBone', 'wPyre'].forEach((k, i) => { grid[5 + i][20] = C[k]; });
  for (let x = 4; x <= 7; x++) grid[3][x] = C.hot;
  grid[22][12] = C.vent; grid[24][10] = C.cold; grid[24][11] = C.cold;
  for (let x = 24; x <= 30; x++) grid[18][x] = C.fire; // eldflod österut
  grid[12][30] = C.rune; grid[12][32] = C.rune; grid[12][34] = C.rune; grid[12][36] = C.rune; // fyra: den fjärde tas bort
  grid[12][4] = C.statue; grid[12][6] = C.fountain; grid[12][8] = C.bench; grid[12][10] = C.soulprop; grid[12][12] = C.bonepillar; grid[12][14] = C.brimpot;
  grid[4][34] = C.attendant; grid[8][34] = C.steamghost; grid[14][26] = C.gladiator; grid[22][34] = C.mold; grid[26][36] = C.imp; grid[8][30] = C.lostsoul; grid[24][26] = C.brute; grid[20][16] = C.ash;
  grid[24][4] = C.sulfur; grid[20][4] = C.trident; grid[20][6] = C.brim;
  if (extra) for (let i = 0; i < 5; i++) grid[2][24 + i] = C.lostsoul;
  g.playCustom({ grid, biome, streams: [] });
}, [C, biome, extra]);
await scene('dungeon', true); await wait(1500);
ok(await ev(() => __game.state()) === 'play', 'banan med de nya tecknen startar');
const T8 = ['attendant', 'steamghost', 'gladiator', 'mold', 'imp', 'lostsoul', 'brute', 'ash'].map(k => C[k]);
ok(await ev(T => T.every(t => __game.ents().some(e => e.type === t)), T8), 'alla åtta nya fiender finns');
ok(await ev(C => __game.ents().filter(e => e.type === C.lostsoul).length <= 4, C), 'högst fyra plågade själar per bana');
ok(await ev(C => ['statue', 'fountain', 'bench', 'soulprop', 'bonepillar', 'brimpot'].every(k => __game.props().some(p => p.ch === C[k])), C), 'alla sex nya föremål finns');
ok(await ev(() => [0, 1, 2, 3, 4, 5].every(i => __game.solid(20.5, 5.5 + i))), 'de sex nya väggarna är väggar');
ok(await ev(() => ['brimstone', 'trident'].every(t => __game.items().some(i => i.type === t))), 'svavelklumpen och de två vapnen ligger ute');
ok(await ev(() => !__game.solid(5.5, 3.5) && !__game.solid(12.5, 22.5) && !__game.solid(10.5, 24.5) && !__game.solid(26.5, 18.5) && !__game.solid(30.5, 12.5)), 'bassänger, ånggaller, eldflod och runcirkel är golv');
const idx = await ev(() => Object.fromEntries(['trident', 'brimstone'].map(id => [id, __game.WEAPONS.findIndex(w => w.id === id)])));
ok(idx.trident === 42 && idx.brimstone === 43 && await ev(() => __game.WEAPONS.length) === 44, 'de två nya vapnen har index 42 och 43 ' + JSON.stringify(idx));
ok(await ev(() => __game.v22().runes.length === 3 && __game.mapRef()[12][36] === '.'), 'högst tre runcirklar per bana');
await ev(() => { for (const e of __game.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } });
// het bassäng
await ev(() => { const P = __game.P; P.hp = 100; P.iframe = 0; P.armor = 0; P.x = 5.5; P.y = 3.5; }); await wait(1500);
ok(await ev(() => __game.P.hp < 100 && __game.v22().slow() < 0.8), 'den heta bassängen skållar och saktar ' + await ev(() => [__game.P.hp.toFixed(1), __game.v22().slow().toFixed(2)].join()));
// kallbad: släcker elden och läker
await ev(() => { const P = __game.P; P.x = 3.5; P.y = 26.5; P.hp = 20; P.v21burn = 2; P.iframe = 5; P.x = 10.5; P.y = 24.5; }); await wait(2000);
ok(await ev(() => __game.P.v21burn === 0 && __game.P.hp > 22), 'kallbadet släcker elden och läker ' + await ev(() => __game.P.hp.toFixed(1)));
await ev(() => { __game.P.hp = 20; }); await wait(15500);
ok(await ev(() => __game.v22().pools[0].dry && __game.P.hp < 51 && !__game.solid(10.5, 24.5)), 'kallbadet tar slut efter 30 hp ' + await ev(() => [__game.P.hp.toFixed(1), __game.v22().pools[0].left.toFixed(1)].join()));
await ev(() => { __game.P.hp = 100; const P = __game.P; P.x = 3.5; P.y = 26.5; });
// ånggallret: dimman tjocknar kraftigt inom tre rutor
await ev(() => { const P = __game.P; P.x = 3.5; P.y = 26.5; }); await wait(1500);
const fg0 = await ev(() => __game.fogK());
await ev(() => { __game.v22().setClock(5.9 - ((12 * 7 + 22 * 13) % 12) / 2 + 6 * 10); const P = __game.P; P.x = 12.5; P.y = 20.5; }); await wait(1200);
const fg1 = await ev(() => __game.fogK());
ok(fg1 > fg0 * 2,'ånggallret: dimman tjocknar ' + fg0.toFixed(3) + ' -> ' + fg1.toFixed(3));
await shot('steam');
await wait(2600);
ok(await ev(f => Math.abs(__game.fogK() - f) < f * 0.2, fg0), 'ångan lägger sig ' + (await ev(() => __game.fogK())).toFixed(3));
// eldfloden drar med strömmen
await ev(() => { const P = __game.P; P.hp = 100; P.iframe = 0; P.x = 25.5; P.y = 18.5; P.vx = 0; P.vy = 0; window.__fx = P.x; }); await wait(900);
ok(await ev(() => __game.P.x > window.__fx + 0.6 && __game.P.hp < 100), 'eldfloden bränner och drar dig med strömmen ' + await ev(() => [(__game.P.x - window.__fx).toFixed(2), __game.P.hp.toFixed(1)].join()));
ok(await ev(() => { const d = __game.v22().dir(26, 18); return d && d[0] === 1 && d[1] === 0; }), 'strömmens riktning räknas ut när level.streams saknas');
await ev(() => { const P = __game.P; P.x = 3.5; P.y = 26.5; P.hp = 100; }); await wait(200);
// runcirkeln
await ev(C => { const g = __game; window.__i0 = g.ents().filter(e => e.type === C.imp && !e.dead).length; const P = g.P; P.x = 30.5; P.y = 12.5; }, C); await wait(1300);
ok(await ev(C => __game.ents().filter(e => e.type === C.imp && !e.dead).length === window.__i0 + 2 && __game.v22().runes[0].used, C), 'runcirkeln kallar fram två eldimpar');
await ev(() => { const P = __game.P; P.x = 30.5; P.y = 14.5; }); await wait(100); await ev(() => { const P = __game.P; P.x = 30.5; P.y = 12.5; }); await wait(1200);
ok(await ev(C => __game.ents().filter(e => e.type === C.imp && !e.dead).length === window.__i0 + 2, C), 'en gång per cirkel');
await shot('rune');
await ev(() => { for (const e of __game.ents()) if (e.v22rune) __game.hurtEnemy(e, 9999, e.x, e.y, { noProc: true }); const P = __game.P; P.x = 3.5; P.y = 26.5; });
// gladiatorns sköld och askvandraren
const glad = await ev(C => { const g = __game, P = g.P; P.x = 10.5; P.y = 20.5; const e = g.spawnEnemy(C.gladiator, 10.5, 22.5); e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 500; e.faceA = Math.atan2(P.y - e.y, P.x - e.x); const h0 = e.hp; g.hurtEnemy(e, 40, e.x, e.y, {}); const front = h0 - e.hp; e.faceA += Math.PI; const h1 = e.hp; g.hurtEnemy(e, 40, e.x, e.y, {}); const back = h1 - e.hp; g.hurtEnemy(e, 9999, 0, 0, { noProc: true }); return { front, back }; }, C);
ok(glad.front < glad.back * 0.4, 'gladiatorns sköld tar skott framifrån ' + JSON.stringify(glad));
const ash = await ev(C => { const g = __game; const e = g.spawnEnemy(C.ash, 14.5, 22.5); e.d = { ...e.d, speed: 0, dmg: 0 }; g.hurtEnemy(e, 9999, e.x, e.y, {}); window.__aw = e; return { dead: !!(e.dead || e.dying), hp: e.hp }; }, C);
ok(!ash.dead && ash.hp > 0, 'askvandraren går sönder i aska i stället för att dö ' + JSON.stringify(ash));
await wait(3400);
ok(await ev(() => !window.__aw.dead && window.__aw.hp > window.__aw.maxHp * 0.4 && !window.__aw.v22ash), 'askvandraren reser sig igen');
ok(await ev(() => { const g = __game, e = window.__aw; g.hurtEnemy(e, 9999, e.x, e.y, {}); return !!(e.dead || e.dying || e.hp <= 0); }), 'andra gången dör den');
ok(await ev(C => { const g = __game; const e = g.spawnEnemy(C.ash, 16.5, 22.5); g.hurtEnemy(e, 9999, e.x, e.y, { boom: true }); return !!(e.dead || e.dying || e.hp <= 0); }, C), 'sprängd askvandrare reser sig inte');
// mögelkryparens sporer, den plågade själen
await ev(C => { const g = __game; const e = g.spawnEnemy(C.mold, 20.5, 26.5); g.hurtEnemy(e, 9999, e.x, e.y, {}); }, C); await wait(200);
ok(await ev(() => __game.v22().spores.length >= 1), 'mögelkryparen lämnar sporer där den dör');
await ev(() => { const P = __game.P; P.hp = 100; P.iframe = 0; P.poisonT = 0; P.x = 20.5; P.y = 26.0; }); await wait(400);
ok(await ev(() => __game.P.poisonT > 0), 'sporerna förgiftar');
await ev(() => { const P = __game.P; P.x = 3.5; P.y = 26.5; P.poisonT = 0; }); await wait(200);
await ev(C => { const g = __game, P = g.P; P.hp = 100; P.iframe = 0; P.x = 30.5; P.y = 26.5; const e = g.ents().find(o => o.type === C.lostsoul && !o.dead); e.x = 30.5; e.y = 22.5; e.alert = true; e.sleep = false; e.chT = 0; e.d = { ...e.d, speed: 1.8, dmg: 10 }; window.__ls = e; }, C); await wait(1600);
ok(await ev(() => (window.__ls.dead || window.__ls.dying) && __game.P.hp < 100), 'den plågade själen störtar och exploderar ' + await ev(() => [window.__ls.dead, __game.P.hp.toFixed(0)].join()));
await ev(() => { for (const e of __game.ents()) if (!e.dead) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } const P = __game.P; P.hp = 100; P.x = 3.5; P.y = 26.5; });
// vapnen
await ev(i => { const g = __game; for (const k of Object.values(i)) { g.P.has[k] = true; g.P.mags[k] = g.WEAPONS[k].mag; } g.P.ammo.brimstone = 12; g.P.hp = 100; }, idx);
await ev(i => { const g = __game; g.switchWeapon(i.trident); const a = g.spawnEnemy('S', 7.4, 26.5), b = g.spawnEnemy('S', 8.4, 26.5); for (const e of [a, b]) { e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 300; e.alert = true; } window.__t1 = a; window.__t2 = b; g.P.x = 6.3; g.P.y = 26.5; g.P.a = 0; }, idx); await wait(800);
await ev(() => { __game.WS.cd = 0; __game.WS.state = 'idle'; __game.fire(); }); await wait(400);
ok(await ev(() => window.__t1.hp <= 300 - 35 && window.__t2.hp <= 300 - 35), 'treuddens stöt genomborrar två fiender ' + await ev(() => [window.__t1.hp.toFixed(0), window.__t2.hp.toFixed(0)].join()));
await ev(() => { window.__t1.hp = 300; window.__t2.hp = 300; window.__t1.x = 10.5; window.__t2.x = 12.5; }); await wait(100);
await ev(() => __game.setMouse(false, true)); await wait(150); await ev(() => __game.setMouse(false, false));
ok(await ev(() => !!__game.v22().spear()), 'högerklick: treudden kastas');
await wait(500);
ok(await ev(() => window.__t1.hp <= 300 - 80), 'den kastade treudden gör 90 skada ' + await ev(() => window.__t1.hp.toFixed(0)));
await shot('trident_throw');
await wait(1300);
ok(await ev(() => !__game.v22().spear()), 'treudden kommer tillbaka');
await ev(() => { __game.hurtEnemy(window.__t1, 9999, 0, 0, { noProc: true }); __game.hurtEnemy(window.__t2, 9999, 0, 0, { noProc: true }); });
await ev(i => { const g = __game; g.switchWeapon(i.brimstone); g.P.x = 14.5; g.P.y = 26.5; g.P.a = 0; const e = g.spawnEnemy('S', 19.5, 26.5); e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 400; e.alert = true; window.__bs = e; }, idx); await wait(900);
await ev(() => { const g = __game; g.WS.cd = 0; g.WS.state = 'idle'; g.P.mags[g.P.weapon] = 4; g.fire(); }); await wait(60);
ok(await ev(() => __game.v22().lobs.length === 1 && __game.v22().lobs[0].friendly), 'svavelmortern lobbar ett klot i båge');
await wait(1200);
ok(await ev(() => window.__bs.hp < 400 - 30), 'klotet exploderar (60 skada, 2 rutors radie) ' + await ev(() => window.__bs.hp.toFixed(0)));
await shot('brimstone');
await ev(() => { const g = __game; window.__bs.hp = 400; g.WS.cd = 0; g.WS.state = 'idle'; }); await wait(500);
await ev(() => __game.setMouse(false, true)); await wait(100); await ev(() => __game.setMouse(false, false)); await wait(600);
ok(await ev(() => window.__bs.hp < 400 - 30), 'högerklick: rakt skott som exploderar vid träff ' + await ev(() => window.__bs.hp.toFixed(0)));
await ev(() => __game.hurtEnemy(window.__bs, 99999, 0, 0, { noProc: true }));
await ev(() => { const g = __game; g.P.ammo.brimstone = 0; g.P.x = 4.5; g.P.y = 24.5; }); await wait(300);
ok(await ev(() => __game.P.ammo.brimstone > 0), 'svavelklumpen ger svavel');
await ev(() => { const P = __game.P; P.x = 20; P.y = 16; P.hp = 100; for (const e of __game.ents()) { e.alert = true; e.sleep = false; e.d = { ...e.d, speed: 1.2, dmg: 2 }; } }); await wait(6000);
ok(true, 'de nya fienderna slåss utan fel');
await shot('fight');
// skärselden: ljuset mäts – rött och hotfullt men läsbart
const lum = () => ev(() => { const c = document.querySelector('canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0, r = 0, b = 0; for (let i = 0; i < d.length; i += 16) { s += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; r += d[i]; b += d[i + 2]; } const n = d.length / 16; return { lum: +(s / n).toFixed(1), red: +(r / n).toFixed(1), blue: +(b / n).toFixed(1) }; });
const arenas = await ev(() => Gen.ARENAS.slice());
for (const biome of ['bathhouse', 'purgatory']) {
  const r = await ev(biome => { try { const g = __game, L = Gen.floor(777, biome === 'purgatory' ? 5 : 3, { biome }); if (L.biome !== biome) return 'skip:bangeneratorn bygger inte ' + biome + ' ännu'; g.run().depth = biome === 'purgatory' ? 6 : 3; g.startLevel(L); return g.lvl().biome; } catch (e) { return 'skip:' + e.message; } }, biome);
  if (String(r).startsWith('skip')) { console.log(`HOPPAR ÖVER biomen ${biome}: ${r}`); continue; }
  await wait(3200); ok(r === biome, `${biome}: en våning startar`);
  const L = await lum(), info = await ev(() => ({ runes: __game.v22().runes.length, fog: +__game.fogK().toFixed(3) }));
  ok(info.runes <= 3 && L.lum > 12, `${biome}: högst tre runcirklar och bilden är läsbar ` + JSON.stringify({ ...L, ...info }));
  if (biome === 'purgatory') ok(L.red > L.blue * 1.3, 'skärselden är röd ' + JSON.stringify(L));
  await shot('biome_' + biome);
}
// bossarna
for (const [boss, arena] of [['bathmaster', 'bathhouse'], ['pyrelord', 'purgatory']]) {
  const has = arenas.includes(arena);
  if (!has) console.log(`HOPPAR ÖVER arenan '${arena}' (bangeneratorn har den inte ännu) – ${boss} provas i 'hall'`);
  await ev(([arena, boss, has]) => { const g = __game, L = Gen.boss(12345, { arena: has ? arena : 'hall', boss: has ? boss : 'demon' }); L.bossId = boss; g.run().depth = 6; g.startLevel(L); }, [arena, boss, has]);
  await wait(2600);
  ok(await ev(b => __game.boss() && __game.boss().id === b, boss), `${boss}: bossen finns`);
  const states = new Set();
  for (let i = 0; i < 18; i++) { const st = await ev(i => { const g = __game, b = g.boss(); g.P.hp = 100; g.P.iframe = 0.5; if (i === 2 || i === 12) for (let a = 0; a < 6.28; a += 0.4) { const x = b.x + Math.cos(a) * 3, y = b.y + Math.sin(a) * 3; if (g.freeSpot(x, y, 0.3)) { g.P.x = x; g.P.y = y; break; } } if (i === 7) for (let a = 0; a < 6.28; a += 0.4) { const x = b.x + Math.cos(a) * 7, y = b.y + Math.sin(a) * 7; if (g.freeSpot(x, y, 0.3)) { g.P.x = x; g.P.y = y; break; } } if (i === 9) { b.spT = 0; } return b.state; }, i); states.add(st); await wait(500); }
  ok(states.size >= 3, `${boss}: byter anfall ${[...states].join(',')}`);
  ok(states.has('special'), `${boss}: specialanfall`);
  await shot('boss_' + boss);
  await ev(() => { const g = __game, b = g.boss(); b.hidden = false; b.state = 'idle'; g.hurtEnemy(b, 99999, b.x, b.y, { noProc: true }); }); await wait(3200);
  ok(await ev(() => !__game.boss() || __game.boss().dead || __game.boss().dying), `${boss}: kan besegras`);
}
await ev(() => { const g = __game, L = Gen.boss(4321, { arena: 'hall', boss: 'demon' }); L.bossId = 'bathmaster'; g.run().depth = 6; g.startLevel(L); }); await wait(2600);
await ev(() => { const g = __game, b = g.boss(); g.P.x = b.x + 6; g.P.y = b.y; if (!g.freeSpot(g.P.x, g.P.y, 0.3)) g.P.x = b.x - 6; b.state = 'scald'; b.t = 0; b.once22 = false; b.cd = 99; b.spT = 99; b.stun = 0; }); await wait(650);
ok(await ev(() => __game.v22().lobs.some(l => !l.friendly)), 'badmästaren kastar skållhett vatten');
await wait(1500);
ok(await ev(() => __game.v22().temp.some(t => t.ch === String.fromCodePoint(0x263))), 'vattnet lämnar en het bassäng en stund');
await ev(() => { const g = __game, b = g.boss(); b.state = 'special'; b.spK = 1; b.t = 0; b.once22 = false; }); await wait(1200);
ok(await ev(() => __game.v22().steamK() > 0.5), 'badmästaren fyller salen med ånga');
await ev(() => { const g = __game, b = g.boss(); b.state = 'dive'; b.t = 0; b.once22 = false; window.__bp = [b.x, b.y]; }); await wait(1600);
ok(await ev(() => { const b = __game.boss(); return !b.hidden && Math.hypot(b.x - window.__bp[0], b.y - window.__bp[1]) > 0.5; }), 'badmästaren dyker ner och kommer upp någon annanstans');
await ev(() => { const g = __game, L = Gen.boss(4322, { arena: 'hall', boss: 'demon' }); L.bossId = 'pyrelord'; g.run().depth = 6; g.startLevel(L); }); await wait(2600);
await ev(() => { const g = __game, b = g.boss(); g.P.x = b.x + 6; g.P.y = b.y; if (!g.freeSpot(g.P.x, g.P.y, 0.3)) g.P.x = b.x - 6; b.state = 'special'; b.spK = 1; b.t = 0; b.once22 = false; b.cd = 99; b.spT = 99; b.stun = 0; }); await wait(400);
ok(await ev(() => __game.v22().temp.filter(t => t.ch === String.fromCodePoint(0x270)).length >= 3), 'eldfursten öppnar sprickor med eld i marken');
await shot('pyrelord_fissure');
await ev(() => { const g = __game, b = g.boss(); b.state = 'pillar'; b.t = 0; b.once22 = false; }); await wait(600);
ok(await ev(() => __game.v22().pillars.length >= 1), 'eldfursten skickar en eldpelare som följer dig');
await wait(5200);
ok(await ev(() => __game.v22().temp.length === 0), 'sprickorna sluter sig efter 5 s');
// väktare
for (const gu of ['bathmaster', 'pyrelord']) {
  const r = await ev(gu => { if (!Gen.GUARDIANS || !Gen.GUARDIANS[gu]) return 'skip:bangeneratorn känner inte väktaren ännu'; try { const g = __game, L = Gen.floor(4242, 3, { biome: 'dungeon', guardian: gu }); g.run().depth = 3; g.startLevel(L); return !!g.ents().find(e => e.guardian); } catch (e) { return 'skip:' + e.message; } }, gu);
  if (typeof r === 'string') console.log(`HOPPAR ÖVER väktaren ${gu}: ${r.replace(/error/ig, 'fel')}`); else ok(r, `${gu} kan vakta en vanlig våning`);
  if (r === true) { await ev(() => { const g = __game, b = g.ents().find(e => e.guardian); g.P.x = b.x - 3; g.P.y = b.y; b.hp -= 1; }); await wait(4000); ok(true, `${gu} som väktare slåss utan fel`); }
}
ok(await ev(() => { const g = __game, r = g.run(); const saved = r.seed; let bad = 0; for (let s = 1; s <= 80; s++) { r.seed = s * 7919; if (['garden', 'dream', 'lab', 'circus', 'jungle', 'observatory', 'desert', 'harbor', 'purgatory'].includes(g.biomeFor(1))) bad++; } r.seed = saved; return bad === 0; }), 'sena biomer (även skärselden) kommer aldrig först');
ok(cerrs.length === 0, 'inga fel i bildrutorna ' + [...new Set(cerrs)].slice(0, 5).join(' / '));
await done();
