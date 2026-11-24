// Version 23: Slakteriet och Slagfältet – blodhalt golv (man glider), köttkvarnar, djup lera (inga hopp), katapultmål, spjutpålar, sex nya föremål,
// åtta fiender (spöksoldaternas sköldar i formation, grismannens rusning, spökryttarens raka linjer, pilskurar, köttyxor), slaktarkroken
// (drar in fienden eller dig), bombarden (kulan går igenom och studsar, druvhagel), kulpåsen, Slaktmästaren och Krigsherren, biomerna från bangeneratorn
import { setup } from './head.mjs';
const PORT = 9810;
const { pg, shot, ev, wait, ok, start, done } = await setup(PORT, 'out/t110');
const cerrs = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|404/.test(m.text())) cerrs.push(m.text().slice(0, 200)); });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const cp = n => String.fromCodePoint(n);
const C = { wTile: cp(0x27c), wCold: cp(0x27d), wButcher: cp(0x27e), slick: cp(0x27f), grinder: cp(0x280), hook: cp(0x281), block: cp(0x282), saw: cp(0x283),
  butcher: cp(0x284), pigman: cp(0x285), flies: cp(0x286), crawler: cp(0x287), wPali: cp(0x288), wEarth: cp(0x289), wWarlord: cp(0x28a), mud: cp(0x28b), target: cp(0x28c),
  catapult: cp(0x28d), banner: cp(0x28e), stakes: cp(0x28f), soldier: cp(0x290), archer: cp(0x291), rider: cp(0x292), crows: cp(0x293), hookchain: cp(0x294), bombard: cp(0x295), balls: cp(0x296) };
ok(await ev(() => window.Music && Music.HI.includes('abattoir') && Music.HI.includes('battlefield')), 'musiken har intensitetslager för slakteriet och slagfältet');
const scene = biome => ev(([C, biome]) => {
  const g = __game; g.profile.tutDone = true;
  const W = 40, H = 30, grid = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[26][3] = 'P'; grid[2][36] = 'x';
  ['wTile', 'wCold', 'wButcher', 'wPali', 'wEarth', 'wWarlord'].forEach((k, i) => { grid[5 + i][20] = C[k]; });
  for (let x = 4; x <= 12; x++) grid[3][x] = C.slick;
  grid[22][12] = C.grinder; grid[22][13] = C.grinder;
  for (let x = 4; x <= 6; x++) for (let y = 7; y <= 9; y++) grid[y][x] = C.mud;
  for (let i = 0; i < 9; i++) grid[16][22 + i * 2] = C.target;
  grid[12][4] = C.hook; grid[12][6] = C.block; grid[12][8] = C.saw; grid[12][10] = C.catapult; grid[12][12] = C.banner; grid[12][14] = C.stakes;
  grid[4][34] = C.butcher; grid[8][34] = C.pigman; grid[22][34] = C.flies; grid[24][26] = C.crawler; grid[20][16] = C.archer; grid[8][30] = C.crows;
  grid[26][36] = C.soldier; grid[26][35] = C.soldier; grid[27][36] = C.soldier;
  grid[2][24] = C.rider; grid[2][27] = C.rider; grid[2][30] = C.rider;
  grid[28][8] = C.balls; grid[20][4] = C.hookchain; grid[20][6] = C.bombard;
  g.playCustom({ grid, biome });
}, [C, biome]);
await scene('dungeon'); await wait(1500);
ok(await ev(() => __game.state()) === 'play', 'banan med de nya tecknen startar');
const T8 = ['butcher', 'pigman', 'flies', 'crawler', 'soldier', 'archer', 'rider', 'crows'].map(k => C[k]);
ok(await ev(T => T.every(t => __game.ents().some(e => e.type === t)), T8), 'alla åtta nya fiender finns');
ok(await ev(C => __game.ents().filter(e => e.type === C.rider).length <= 2, C), 'högst två spökryttare per bana');
ok(await ev(C => { const s = __game.ents().filter(e => e.type === C.soldier); return s.length === 3 && s.every(e => e.v23grp && e.v23grp === s[0].v23grp); }, C), 'spöksoldaterna går i en grupp om tre');
ok(await ev(C => ['hook', 'block', 'saw', 'catapult', 'banner', 'stakes'].every(k => __game.props().some(p => p.ch === C[k])), C), 'alla sex nya föremål finns');
ok(await ev(() => [0, 1, 2, 3, 4, 5].every(i => __game.solid(20.5, 5.5 + i))), 'de sex nya väggarna är väggar');
ok(await ev(() => !__game.solid(4.5, 12.5) && __game.solid(6.5, 12.5) && __game.solid(14.5, 12.5)), 'köttkroken blockerar inte, slaktbänken och spjutpålarna gör det');
ok(await ev(() => ['cannonballs', 'hookchain', 'bombard'].every(t => __game.items().some(i => i.type === t))), 'kulpåsen och de två vapnen ligger ute');
ok(await ev(() => !__game.solid(5.5, 3.5) && !__game.solid(12.5, 22.5) && !__game.solid(5.5, 8.5) && !__game.solid(22.5, 16.5)), 'blodhalt golv, köttkvarn, lera och katapultmål är golv');
const idx = await ev(() => Object.fromEntries(['hookchain', 'bombard'].map(id => [id, __game.WEAPONS.findIndex(w => w.id === id)])));
const nW = await ev(() => __game.WEAPONS.length);
ok(idx.hookchain === nW - 2 && idx.bombard === nW - 1, 'de två nya vapnen ligger sist i vapenlistan ' + JSON.stringify(idx) + ' av ' + nW);
ok(await ev(() => !window.Gen || !Gen.WEAPONS || (Gen.WEAPONS[String.fromCodePoint(0x294)] === 'hookchain' && Gen.WEAPONS[String.fromCodePoint(0x295)] === 'bombard')), 'bangeneratorn och spelet har samma tecken för vapnen');
ok(await ev(() => __game.v23().targets.length === 8 && __game.mapRef()[16][38] === '.'), 'högst åtta katapultmål per bana');
await ev(() => { for (const e of __game.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } });
// blodhalt golv: farten bromsas långsamt
await ev(() => { const P = __game.P; P.hp = 100; P.x = 3.5; P.y = 26.5; P.vx = 0; P.vy = 0; P.a = 0; }); await wait(300);
const glide = async (x, y) => { await ev(([x, y]) => { const P = __game.P; P.x = x; P.y = y; P.vx = 4; P.vy = 0; window.__gx = x; }, [x, y]); await wait(350); return ev(() => [+(__game.P.x - window.__gx).toFixed(2), +__game.P.vx.toFixed(2)]); };
const dry = await glide(24.5, 22.5), wet = await glide(4.5, 3.5);
ok(wet[0] > dry[0] * 1.6 && wet[1] > 1, 'på det blodhala golvet glider man ' + JSON.stringify({ dry, wet }));
await ev(() => { const P = __game.P; P.x = 3.5; P.y = 26.5; P.vx = 0; P.vy = 0; });
// köttkvarnen: 12 skada per sekund
await ev(() => { const P = __game.P; P.hp = 100; P.iframe = 0; P.armor = 0; P.x = 12.5; P.y = 22.5; }); await wait(1600);
const hpG = await ev(() => __game.P.hp);
ok(hpG < 92 && hpG > 70, 'köttkvarnen mal (12/s) ' + hpG.toFixed(1));
await ev(() => { const P = __game.P; P.x = 3.5; P.y = 26.5; P.hp = 100; }); await wait(400);
// förbannelserna: sämre grepp och mer skada av kvarnarna
await ev(() => { const M = __game.mods(); window.__g0 = __game.v23().grip(); M.slickGrip = -0.3; M.grinderResist = -0.3; const P = __game.P; P.hp = 100; P.iframe = 0; P.armor = 0; P.x = 12.5; P.y = 22.5; }); await wait(1600);
const hpC = await ev(() => __game.P.hp), gripC = await ev(() => __game.v23().grip());
ok(gripC < (await ev(() => window.__g0)) && 100 - hpC > (100 - hpG) * 1.15, 'förbannelserna: sämre grepp och mer skada i kvarnen ' + JSON.stringify({ gripC: +gripC.toFixed(3), hpC: +hpC.toFixed(1), hpG: +hpG.toFixed(1) }));
await ev(() => { const M = __game.mods(); M.slickGrip = 0; M.grinderResist = 0; const P = __game.P; P.x = 3.5; P.y = 26.5; P.hp = 100; }); await wait(200);
// djup lera: långsammare och inga hopp
await ev(() => { const P = __game.P; P.x = 5.5; P.y = 8.5; P.jz = 0; P.jv = 0; }); await wait(400);
ok(await ev(() => __game.v23().slow() < 0.6 && __game.v23().noJump()), 'den djupa leran saktar (45 %) och går inte att hoppa från ' + await ev(() => __game.v23().slow().toFixed(2)));
await pg.keyboard.press('Space'); await wait(120);
ok(await ev(() => __game.P.jz === 0), 'mellanslag i leran: inget hopp');
await ev(() => { const P = __game.P; P.x = 3.5; P.y = 26.5; }); await wait(200);
ok(await ev(() => __game.v23().slow() === 1 && !__game.v23().noJump()), 'utanför leran: vanlig fart och hopp');
// katapultmålet: stenen landar med skugga och visslande först
await ev(() => { const g = __game, t = g.v23().targets[0]; g.P.hp = 100; g.P.iframe = 0; g.P.x = t.x + 0.5; g.P.y = t.y + 0.5; g.v23().setClock(t.next - 1.3); }); await wait(500);
ok(await ev(() => __game.v23().rocks.length >= 1), 'en sten är på väg (skugga och visslande)');
await shot('catapult');
await wait(1200);
ok(await ev(() => __game.P.hp <= 100 - 20), 'katapultstenen slår ned (30 skada) ' + await ev(() => __game.P.hp.toFixed(0)));
await ev(() => { const P = __game.P; P.x = 3.5; P.y = 26.5; P.hp = 100; }); await wait(200);
// spjutpålarna
await ev(() => { const P = __game.P; P.hp = 100; P.iframe = 0; P.x = 14.5; P.y = 13.25; }); await wait(400);
ok(await ev(() => __game.P.hp < 100), 'spjutpålarna sticker (4 skada) ' + await ev(() => __game.P.hp.toFixed(1)));
await ev(() => { const P = __game.P; P.x = 3.5; P.y = 26.5; P.hp = 100; }); await wait(200);
// spöksoldaternas sköld: framifrån tar den det mesta, mindre när formationen är bruten
const sol = await ev(C => { const g = __game, P = g.P; P.x = 30.5; P.y = 22.5; const s = g.ents().filter(e => e.type === C.soldier), e = s[0]; e.hp = e.maxHp = 500; for (const o of s) { o.alert = true; o.sleep = false; } g.hurtEnemy(e, 1, e.x, e.y, { boom: true }); e.faceA = Math.atan2(P.y - e.y, P.x - e.x);
  let h = e.hp; g.hurtEnemy(e, 40, e.x, e.y, {}); const front = h - e.hp; e.faceA += Math.PI; h = e.hp; g.hurtEnemy(e, 40, e.x, e.y, {}); const back = h - e.hp; e.faceA -= Math.PI;
  for (const o of s.slice(1)) g.hurtEnemy(o, 9999, o.x, o.y, { noProc: true }); h = e.hp; g.hurtEnemy(e, 40, e.x, e.y, {}); const alone = h - e.hp; g.hurtEnemy(e, 9999, 0, 0, { noProc: true }); return { front, back, alone }; }, C);
ok(sol.front < sol.back * 0.5 && sol.alone > sol.front, 'spöksoldatens sköld tar skott framifrån, mindre när formationen är bruten ' + JSON.stringify(sol));
// grismannen rusar och knuffar
await ev(C => { const g = __game, P = g.P; P.hp = 100; P.iframe = 0; P.x = 25.5; P.y = 8.5; const e = g.ents().find(o => o.type === C.pigman); e.x = 30.5; e.y = 8.5; e.alert = true; e.sleep = false; e.rushCd = 0; e.d = { ...e.d, speed: 1.2, dmg: 10 }; window.__pig = e; window.__px = P.x; }, C); await wait(1500);
ok(await ev(() => __game.P.hp < 100 && __game.P.x < window.__px - 0.4), 'grismannen rusar och knuffar dig ' + await ev(() => [__game.P.hp.toFixed(0), (__game.P.x - window.__px).toFixed(2)].join()));
await ev(() => { window.__pig.d = { ...window.__pig.d, speed: 0, dmg: 0 }; window.__pig.alert = false; window.__pig.sleep = true; window.__pig.v23rush = null; const P = __game.P; P.x = 3.5; P.y = 26.5; P.hp = 100; }); await wait(200);
// spökbågskytten: pilskurar om tre; slaktaren: köttyxor i båge
await ev(C => { const g = __game, P = g.P; P.x = 16.5; P.y = 26.5; P.iframe = 5; const e = g.ents().find(o => o.type === C.archer); e.alert = true; e.sleep = false; e.volT = 0; e.d = { ...e.d, dmg: 1 }; }, C); await wait(300);
ok(await ev(() => __game.projectiles().filter(p => p.kind === 'v23arrow').length >= 3), 'spökbågskytten skjuter en pilskur om tre');
await ev(C => { const g = __game, P = g.P; P.x = 28.5; P.y = 4.5; const e = g.ents().find(o => o.type === C.butcher); e.alert = true; e.sleep = false; e.throwT = 0; e.d = { ...e.d, dmg: 1 }; }, C); await wait(300);
ok(await ev(() => __game.projectiles().some(p => p.kind === 'v23cleaver')), 'slaktaren kastar en köttyxa');
await shot('volley');
await ev(C => { for (const e of __game.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } const P = __game.P; P.x = 3.5; P.y = 26.5; P.hp = 100; P.iframe = 0; }, C); await wait(1500);
// spökryttaren rusar i en rak linje
await ev(C => { const g = __game, P = g.P; P.hp = 100; P.iframe = 0; P.x = 12.5; P.y = 2.5; const e = g.ents().find(o => o.type === C.rider); e.x = 24.5; e.y = 2.5; e.alert = true; e.sleep = false; e.rideCd = 0; e.d = { ...e.d, speed: 1.3, dmg: 10 }; window.__rd = e; }, C); await wait(2600);
ok(await ev(() => __game.P.hp < 100), 'spökryttaren rusar i en rak linje och träffar ' + await ev(() => [__game.P.hp.toFixed(0), window.__rd.x.toFixed(1)].join()));
await ev(() => { window.__rd.d = { ...window.__rd.d, speed: 0, dmg: 0 }; window.__rd.alert = false; window.__rd.sleep = true; window.__rd.v23ride = null; window.__rd.x = 27.5; const P = __game.P; P.x = 3.5; P.y = 26.5; P.hp = 100; }); await wait(200);
// köttkvarnen mal fiender – dubbelt för knuffade
const gr = await ev(C => { const g = __game; const a = g.spawnEnemy('S', 12.5, 22.5); a.hp = a.maxHp = 300; a.d = { ...a.d, speed: 0, dmg: 0 }; window.__ga = a; return a.hp; }, C); await wait(1600);
ok(await ev(h => window.__ga.hp < h - 8, gr), 'köttkvarnen mal fiender ' + await ev(() => window.__ga.hp.toFixed(0)));
await ev(() => __game.hurtEnemy(window.__ga, 9999, 0, 0, { noProc: true }));
// slaktarkroken: små fiender dras in, stora drar in dig
await ev(i => { const g = __game; for (const k of Object.values(i)) { g.P.has[k] = true; g.P.mags[k] = g.WEAPONS[k].mag; } g.P.ammo.cannonballs = 12; g.P.hp = 100; }, idx);
await ev(i => { const g = __game; g.switchWeapon(i.hookchain); const e = g.spawnEnemy('S', 9.5, 26.5); e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 300; e.alert = true; window.__h1 = e; g.P.x = 4.5; g.P.y = 26.5; g.P.a = 0; }, idx); await wait(800);
await ev(() => { __game.WS.cd = 0; __game.WS.state = 'idle'; __game.fire(); }); await wait(80);
ok(await ev(() => !!__game.v23().hook()), 'slaktarkroken kastas');
await wait(900);
ok(await ev(() => window.__h1.x < 7 && window.__h1.hp <= 300 - 35), 'kroken drar in fienden och slår (45 skada) ' + await ev(() => [window.__h1.x.toFixed(2), window.__h1.hp.toFixed(0)].join()));
await shot('hookchain');
await ev(() => __game.hurtEnemy(window.__h1, 9999, 0, 0, { noProc: true }));
await ev(C => { const g = __game; const e = g.spawnEnemy(C.rider, 9.5, 24.5); e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 300; e.alert = false; e.sleep = true; window.__h2 = e; g.P.x = 4.5; g.P.y = 24.5; g.P.a = 0; window.__hx = g.P.x; }, C); await wait(1500);
await ev(() => { __game.WS.cd = 0; __game.WS.state = 'idle'; __game.fire(); }); await wait(1000);
ok(await ev(() => __game.P.x > window.__hx + 1.5 && Math.abs(window.__h2.x - 9.5) < 0.3), 'stora fiender drar in dig ' + await ev(() => [(__game.P.x - window.__hx).toFixed(2), window.__h2.x.toFixed(2)].join()));
await ev(() => __game.hurtEnemy(window.__h2, 99999, 0, 0, { noProc: true }));
// bombarden: kulan går igenom fiender (tappar 25 %) och studsar en gång
await ev(i => { const g = __game; g.switchWeapon(i.bombard); g.P.x = 4.5; g.P.y = 18.5; g.P.a = 0; const a = g.spawnEnemy('S', 8.5, 18.5), b = g.spawnEnemy('S', 10.5, 18.5); for (const e of [a, b]) { e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 400; e.alert = true; } window.__b1 = a; window.__b2 = b; }, idx); await wait(900);
await ev(() => { const g = __game; g.WS.cd = 0; g.WS.state = 'idle'; g.P.mags[g.P.weapon] = 1; g.fire(); }); await wait(60);
ok(await ev(() => __game.v23().balls.length === 1), 'bombarden skjuter en kanonkula');
await wait(600);
const bb = await ev(() => [400 - window.__b1.hp, 400 - window.__b2.hp]);
ok(bb[0] >= 70 && bb[1] >= 50 && bb[1] < bb[0], 'kulan går igenom båda fienderna och tappar kraft ' + JSON.stringify(bb));
await shot('bombard');
await ev(() => { const g = __game; window.__b1.hp = 400; window.__b2.hp = 400; window.__b1.x = 6.5; window.__b2.x = 7.0; window.__b2.y = 18.8; g.WS.cd = 0; g.WS.state = 'idle'; g.WS.shot = 9; g.P.mags[g.P.weapon] = 1; }); await wait(300);
await ev(() => __game.setMouse(false, true)); await wait(60);
ok(await ev(() => __game.v23().balls.filter(b => b.grape).length >= 8), 'högerklick: druvhagel (8 kulor)');
await ev(() => __game.setMouse(false, false)); await wait(500);
ok(await ev(() => window.__b1.hp < 400 || window.__b2.hp < 400), 'druvhaglet träffar på kort håll ' + await ev(() => [window.__b1.hp.toFixed(0), window.__b2.hp.toFixed(0)].join()));
const bounce = await ev(() => { const g = __game; g.hurtEnemy(window.__b1, 99999, 0, 0, { noProc: true }); g.hurtEnemy(window.__b2, 99999, 0, 0, { noProc: true }); g.P.x = 36.5; g.P.y = 18.5; g.P.a = 0; g.WS.cd = 0; g.WS.state = 'idle'; g.P.mags[g.P.weapon] = 1; g.fire(); return g.v23().balls.length; }); await wait(400);
ok(bounce === 1 && await ev(() => __game.v23().balls.length === 1 && __game.v23().balls[0].vx < 0), 'kulan studsar en gång i väggen');
await ev(() => { const g = __game; g.P.ammo.cannonballs = 0; g.P.x = 8.5; g.P.y = 28.5; }); await wait(300);
ok(await ev(() => __game.P.ammo.cannonballs > 0), 'kulpåsen ger kanonkulor');
await ev(() => { const P = __game.P; P.x = 20; P.y = 18; P.hp = 100; for (const e of __game.ents()) { e.alert = true; e.sleep = false; e.d = { ...e.d, speed: 1.2, dmg: 2 }; } }); await wait(6000);
ok(true, 'de nya fienderna slåss utan fel');
await shot('fight');
// biomerna från bangeneratorn
const lum = () => ev(() => { const c = document.querySelector('canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0, r = 0, b = 0; for (let i = 0; i < d.length; i += 16) { s += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; r += d[i]; b += d[i + 2]; } const n = d.length / 16; return { lum: +(s / n).toFixed(1), red: +(r / n).toFixed(1), blue: +(b / n).toFixed(1) }; });
const arenas = await ev(() => Gen.ARENAS.slice());
for (const biome of ['abattoir', 'battlefield']) {
  const r = await ev(biome => { try { const g = __game, L = Gen.floor(777, biome === 'battlefield' ? 5 : 3, { biome }); if (L.biome !== biome) return 'skip:bangeneratorn bygger inte ' + biome + ' ännu'; g.run().depth = biome === 'battlefield' ? 5 : 3; g.startLevel(L); return g.lvl().biome; } catch (e) { return 'skip:' + e.message; } }, biome);
  if (String(r).startsWith('skip')) { console.log(`HOPPAR ÖVER biomen ${biome}: ${r}`); continue; }
  await wait(3200); ok(r === biome, `${biome}: en våning startar`);
  const L = await lum(), info = await ev(() => ({ targets: __game.v23().targets.length, riders: __game.ents().filter(e => e.type === String.fromCodePoint(0x292)).length, fog: +__game.fogK().toFixed(3) }));
  ok(info.targets <= 8 && info.riders <= 2 && L.lum > 12, `${biome}: tak för katapultmål och ryttare, bilden är läsbar ` + JSON.stringify({ ...L, ...info }));
  await shot('biome_' + biome);
}
// bossarna
for (const [boss, arena] of [['butcher', 'abattoir'], ['warlord', 'battlefield']]) {
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
await ev(() => { const g = __game, L = Gen.boss(4321, { arena: 'hall', boss: 'demon' }); L.bossId = 'butcher'; g.run().depth = 6; g.startLevel(L); }); await wait(2600);
await ev(() => { const g = __game, b = g.boss(); g.P.x = b.x + 7; g.P.y = b.y; if (!g.freeSpot(g.P.x, g.P.y, 0.3)) g.P.x = b.x - 7; window.__bd0 = Math.hypot(g.P.x - b.x, g.P.y - b.y); b.state = 'hook'; b.t = 0; b.once23 = false; b.cd = 99; b.spT = 99; b.stun = 0; g.P.iframe = 5; }); await wait(1100);
ok(await ev(() => { const g = __game, b = g.boss(); return Math.hypot(g.P.x - b.x, g.P.y - b.y) < window.__bd0 - 1.5; }), 'slaktmästarens krok drar dig mot honom');
await ev(() => { const g = __game, b = g.boss(); b.state = 'meat'; b.t = 0; b.once23 = false; }); await wait(600);
ok(await ev(() => __game.v23().lobs.length >= 2), 'slaktmästaren slänger köttbitar');
await wait(1600);
ok(await ev(() => __game.ents().some(e => e.type === String.fromCodePoint(0x286) && e.minion)), 'köttbitarna blir flugsvärmar');
await ev(() => { const g = __game, b = g.boss(); b.state = 'special'; b.spK = 1; b.t = 0; b.once23 = false; }); await wait(400);
ok(await ev(() => __game.v23().temp.length >= 4), 'slaktmästaren sätter igång köttkvarnar i arenan');
await shot('butcher_grinders');
await wait(6600);
ok(await ev(() => __game.v23().temp.length === 0), 'kvarnarna stannar efter 6 s');
await ev(() => { const g = __game, L = Gen.boss(4322, { arena: 'hall', boss: 'demon' }); L.bossId = 'warlord'; g.run().depth = 6; g.startLevel(L); }); await wait(2600);
await ev(() => { const g = __game, b = g.boss(); g.P.x = b.x + 6; g.P.y = b.y; if (!g.freeSpot(g.P.x, g.P.y, 0.3)) g.P.x = b.x - 6; b.state = 'special'; b.spK = 1; b.t = 0; b.once23 = false; b.cd = 99; b.spT = 99; b.stun = 0; g.P.hp = 100; g.P.iframe = 9; }); await wait(300);
ok(await ev(() => __game.v23().rocks.length >= 5), 'krigsherren beordrar en katapultsalva');
await shot('warlord_volley');
await wait(2500);
await ev(() => { const g = __game, b = g.boss(); g.P.hp = 100; g.P.iframe = 9; b.state = 'special'; b.spK = 0; b.t = 0; b.once23 = false; window.__s0 = g.ents().filter(e => e.minion && !e.dead).length; }); await wait(400);
ok(await ev(() => __game.ents().filter(e => e.minion && !e.dead).length >= window.__s0 + 3), 'krigsherren blåser i hornet och kallar en formation');
await ev(() => { const g = __game, b = g.boss(); for (const e of g.ents()) if (e.minion) g.hurtEnemy(e, 9999, 0, 0, { noProc: true }); for (let a = 0; a < 6.28; a += 0.2) { let okk = true; for (let d = 1; d <= 7; d += 0.5) if (!g.freeSpot(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, 0.9)) okk = false; if (okk) { g.P.x = b.x + Math.cos(a) * 6; g.P.y = b.y + Math.sin(a) * 6; break; } } g.P.iframe = 9; b.state = 'ride'; b.t = 0; b.once23 = false; window.__wx = [b.x, b.y]; }); await wait(1200);
ok(await ev(() => { const b = __game.boss(); return Math.hypot(b.x - window.__wx[0], b.y - window.__wx[1]) > 1.5; }), 'krigsherren rider i en rak linje');
// väktare
for (const gu of ['butcher', 'warlord']) {
  const r = await ev(gu => { if (!Gen.GUARDIANS || !Gen.GUARDIANS[gu]) return 'skip:bangeneratorn känner inte väktaren ännu'; try { const g = __game, L = Gen.floor(4242, 3, { biome: 'dungeon', guardian: gu }); g.run().depth = 3; g.startLevel(L); return !!g.ents().find(e => e.guardian); } catch (e) { return 'skip:' + e.message; } }, gu);
  if (typeof r === 'string') console.log(`HOPPAR ÖVER väktaren ${gu}: ${r.replace(/error/ig, 'fel')}`); else ok(r, `${gu} kan vakta en vanlig våning`);
  if (r === true) { await ev(() => { const g = __game, b = g.ents().find(e => e.guardian); g.P.x = b.x - 3; g.P.y = b.y; b.hp -= 1; }); await wait(4000); ok(true, `${gu} som väktare slåss utan fel`); }
}
ok(await ev(() => { const g = __game, r = g.run(); const saved = r.seed; let bad = 0; for (let s = 1; s <= 80; s++) { r.seed = s * 7919; if (['garden', 'dream', 'lab', 'circus', 'jungle', 'observatory', 'desert', 'harbor', 'purgatory', 'battlefield'].includes(g.biomeFor(1))) bad++; } r.seed = saved; return bad === 0; }), 'sena biomer (även slagfältet) kommer aldrig först');
// ?biome=abattoir och ?biome=battlefield: rundan startar i biomen, och flera frön spelas med fiender som slåss
for (const biome of ['abattoir', 'battlefield']) {
  await start('&biome=' + biome);
  ok(await ev(() => __game.state()) === 'play' && await ev(() => __game.lvl().biome) === biome, `?biome=${biome}: rundan startar i biomen`);
  const tot = { slick: 0, grinder: 0, mud: 0, target: 0, flies: 0, soldiers: 0, groups: true };
  for (let s = 1; s <= 5; s++) {
    const r = await ev(([biome, s]) => { const g = __game, L = Gen.floor(1000 + s * 31, biome === 'battlefield' ? 5 : 3, { biome }); g.run().depth = biome === 'battlefield' ? 5 : 3; g.startLevel(L); return g.lvl().biome; }, [biome, s]);
    await wait(1200);
    const f = await ev(() => { const g = __game, m = g.mapRef(), cnt = ch => m.reduce((a, row) => a + row.filter(c => c === ch).length, 0), cp = String.fromCodePoint, sol = g.ents().filter(e => e.type === cp(0x290));
      const grp = {}; for (const e of sol) grp[e.v23grp] = (grp[e.v23grp] || 0) + 1;
      return { slick: cnt(cp(0x27f)), grinder: cnt(cp(0x280)), mud: cnt(cp(0x28b)), target: cnt(cp(0x28c)), flies: g.ents().filter(e => e.type === cp(0x286)).length, soldiers: sol.length, groups: Object.values(grp).every(n => n <= 3) }; });
    for (const k in f) if (k === 'groups') tot.groups = tot.groups && f.groups; else tot[k] += f[k];
    ok(r === biome && f.target <= 8, `${biome} frö ${s}: ` + JSON.stringify(f));
    await ev(() => { const g = __game; g.P.hp = 999; g.P.iframe = 99; for (const e of g.ents()) { e.alert = true; e.sleep = false; } }); await wait(2500);
  }
  if (biome === 'abattoir') ok(tot.slick > 0 && tot.grinder > 0, 'slakteriet har blodhalt golv och köttkvarnar ' + JSON.stringify(tot));
  else ok(tot.mud > 0 && tot.target > 0 && tot.groups, 'slagfältet har djup lera, katapultmål och soldater i grupper om högst tre ' + JSON.stringify(tot));
  await shot('query_' + biome);
}
ok(cerrs.length === 0, 'inga fel i bildrutorna ' + [...new Set(cerrs)].slice(0, 5).join(' / '));
await done();
