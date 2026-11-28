// Version 30 (SPEL): Ruinstaden och Glasbruket – nya tecken, faror (rasande tak, grus, smält glas, skärvor, ugnsmunnar), rekvisita
// (glashyllan går sönder, smältugnen lyser), de åtta fienderna, slungan och glasbössan, stenpåsen och glasbiten, musiken och ljuden
import { setup } from './head.mjs';
const PORT = 9890;
const { pg, shot, ev, ok, done, gwait } = await setup(PORT, 'out/t190');
const miss404 = []; pg.on('response', r => { if (r.status() >= 400 && !/_(submerge|dive)\.png/.test(r.url()) && /\/assets\/.*(ruin|glass|kiln|mayor|sling|looter|rubble|rooftop|dust|slag|furnace|shard|molten|cracked30|icon_heat|icon_shards|boss3[12]|pakt_slunga|studssten|ullsnoret|kastremmen)/.test(r.url())) miss404.push(r.status() + ' ' + r.url().replace(/^.*\/assets\//, '')); });
const cerrs = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|404/.test(m.text())) cerrs.push(m.text().slice(0, 200)); });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const C = { wBrick: 'ʗ', wPlaster: 'ʘ', wMayor: 'ʙ', wKiln: 'ʚ', wShelf: 'ʛ', wGlassm: 'ʜ', roof: 'ʝ', rubble: 'ʞ', molten: 'ʟ', shards: 'ʠ', vent: 'ʡ',
  column: 'ʢ', beam: 'ʣ', statue: 'ʤ', furnace: 'ʥ', rack: 'ʦ', bench: 'ʧ', looter: 'ʨ', golem: 'ʩ', roofer: 'ʪ', devil: 'ʫ', blower: 'ʮ', ggolem: 'ʯ', crawler: 'ʰ', spirit: 'ʱ', sling: 'ʲ', glassgun: 'ʳ', stones: 'ʴ', glass: 'ʵ' };
ok(await ev(() => window.Music && Music.HI.includes('ruins') && Music.HI.includes('glassworks')), 'musiken har intensitetslager för Ruinstaden och Glasbruket');
const files = await ev(async () => { const snd = ['looter', 'looter_knife', 'rubblegolem', 'rock_throw', 'rooftopper', 'rooftop_bolt', 'dustdevil', 'glassblower', 'glass_bubble', 'glassgolem', 'glass_crack', 'slagcrawler', 'kilnspirit', 'kilnspirit_boom',
  'mayor_roar', 'roof_collapse', 'glassmaster_roar', 'glass_dome', 'sling_fire', 'sling_charge', 'glassgun_fire', 'glassgun_burst', 'furnace_blast', 'shards_step', 'glassrack_break', 'wall_crumble', 'pillar_fall', 'ruins_hum', 'glassworks_hum'].map(n => 'assets/snd/' + n + '.ogg');
  const mus = ['ruins', 'ruins_hi', 'glassworks', 'glassworks_hi', 'boss31', 'boss32'].map(n => 'assets/music/' + n + '.ogg'), bad = [];
  for (const u of [...snd, ...mus]) { const r = await fetch(u); if (!r.ok) bad.push(u); } return { n: snd.length + mus.length, bad }; });
ok(files.bad.length === 0 && files.n === 35, 'alla 29 ljud och 6 musikspår finns ' + JSON.stringify(files));
const scene = biome => ev(([C, biome]) => {
  const g = __game; g.profile.tutDone = true;
  const W = 40, H = 30, grid = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[26][3] = 'P'; grid[2][36] = 'x';
  ['wBrick', 'wPlaster', 'wMayor', 'wKiln', 'wShelf', 'wGlassm'].forEach((k, i) => { grid[5 + i][20] = C[k]; });
  grid[3][5] = C.roof; grid[3][9] = C.roof; grid[7][5] = C.rubble; grid[7][6] = C.rubble; grid[7][7] = C.rubble;
  grid[22][12] = C.molten; grid[22][13] = C.molten; for (let x = 4; x <= 10; x++) grid[18][x] = C.shards; grid[14][30] = C.vent;
  grid[12][4] = C.column; grid[12][6] = C.beam; grid[12][8] = C.statue; grid[12][10] = C.furnace; grid[12][12] = C.rack; grid[12][14] = C.bench; grid[12][16] = C.furnace;
  grid[4][34] = C.looter; grid[8][34] = C.golem; grid[22][34] = C.roofer; grid[24][26] = C.devil; grid[20][16] = C.blower; grid[8][30] = C.ggolem; grid[26][36] = C.crawler; grid[2][24] = C.spirit;
  grid[28][8] = C.stones; grid[28][10] = C.glass; grid[20][4] = C.sling; grid[20][6] = C.glassgun;
  g.playCustom({ grid, biome });
}, [C, biome]);
await scene('glassworks'); await gwait(1.5);
ok(await ev(() => __game.state()) === 'play', 'banan med de nya tecknen startar');
const T8 = ['looter', 'golem', 'roofer', 'devil', 'blower', 'ggolem', 'crawler', 'spirit'].map(k => C[k]);
ok(await ev(T => T.every(t => __game.ents().some(e => e.type === t)), T8), 'alla åtta nya fiender finns');
ok(await ev(C => ['column', 'beam', 'statue', 'furnace', 'rack', 'bench'].every(k => __game.props().some(p => p.ch === C[k])), C), 'alla sex nya föremål finns');
ok(await ev(() => [0, 1, 2, 3, 4, 5].every(i => __game.solid(20.5, 5.5 + i))), 'de sex nya väggarna är väggar');
ok(await ev(() => [4, 6, 8, 10, 12, 14].every(x => __game.solid(x + 0.5, 12.5))), 'rekvisitan blockerar');
ok(await ev(() => ['slingstones', 'glass', 'sling', 'glassgun'].every(t => __game.items().some(i => i.type === t))), 'stenpåsen, glasbiten och de två vapnen ligger ute');
ok(await ev(() => !__game.solid(5.5, 3.5) && !__game.solid(6.5, 7.5) && !__game.solid(12.5, 22.5) && !__game.solid(6.5, 18.5) && !__game.solid(30.5, 14.5)), 'faror och grus är golv');
const idx = await ev(() => Object.fromEntries(['sling', 'glassgun'].map(id => [id, __game.WEAPONS.findIndex(w => w.id === id)])));
const nW = await ev(() => __game.WEAPONS.length);
ok(idx.sling === nW - 2 && idx.glassgun === nW - 1, 'de två nya vapnen ligger sist i vapenlistan ' + JSON.stringify(idx) + ' av ' + nW);
ok(await ev(() => !window.Gen || !Gen.WEAPONS || (Gen.WEAPONS['ʲ'] === 'sling' && Gen.WEAPONS['ʳ'] === 'glassgun')), 'bangeneratorn och spelet har samma tecken för vapnen');
ok(await ev(() => __game.v30 && __game.v30().V30L().live && __game.v30().V30L().vents.length === 1 && __game.v30().V30L().furnaces.length === 2), 'banans faror och smältugnar är registrerade');
await ev(() => { for (const e of __game.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } });
const put = (x, y) => ev(([x, y]) => { const P = __game.P; P.x = x; P.y = y; P.vx = 0; P.vy = 0; P.hp = 100; P.armor = 0; P.iframe = 0; P.jz = 0; }, [x, y]);
// rasande tak: knaster i 0,8 s, sedan ras (25 skada), rutan blir grus
await put(5.5, 3.5); await gwait(0.3);
ok(await ev(() => __game.mapRef()[3][5] === 'ʝ'), 'taket rasar inte direkt (förvarning)');
await gwait(1.0);
const hpR = await ev(() => __game.P.hp);
ok(await ev(() => __game.mapRef()[3][5] === 'ʞ') && hpR < 90 && hpR > 60, 'taket rasar efter förvarningen och rutan blir grus ' + hpR.toFixed(1));
// grus: 25 % långsammare
await put(3.5, 26.5); await gwait(0.2);
const slow = await ev(() => { const P = __game.P; P.x = 6.5; P.y = 7.5; return __game.v30().slow(); });
ok(Math.abs(slow - 0.75) < 0.01, 'gruset saktar 25 % ' + slow);
// smält glas: 8 skada/s
await put(12.5, 22.5); await gwait(1.5);
const hpM = await ev(() => __game.P.hp);
ok(hpM < 95 && hpM > 75, 'smält glas bränner (8/s) ' + hpM.toFixed(1));
// skärvor: ingen skada när man går
await put(4.5, 18.5); await ev(() => { __game.P.vx = 1.5; }); await gwait(0.8);
const hpW = await ev(() => __game.P.hp);
ok(hpW > 99, 'skärvorna skär inte den som går ' + hpW.toFixed(1));
// ugnsmunnen: sprutar inom 5 s och gör skada nära
await put(30.5, 15.4); await gwait(5.5);
const hpV = await ev(() => __game.P.hp);
ok(hpV < 100, 'ugnsmunnen sprutar hetta ' + hpV.toFixed(1));
await shot('scene_glassworks');
// glashyllan: två skott spräcker den, rutan blir skärvor och går att gå igenom
await put(3.5, 26.5);
await ev(() => { const g = __game, pr = g.props().find(p => p.ch === 'ʦ'); g.hitProp(pr, pr.x, pr.y, 5); g.hitProp(pr, pr.x, pr.y, 5); });
ok(await ev(() => __game.mapRef()[12][12] === 'ʠ' && !__game.solid(12.5, 12.5) && __game.props().find(p => p.ch === 'ʦ').v30broken), 'glashyllan går sönder till skärvor');
// fienderna: glasgolemen studsar skott ibland, dubbel skada av smällar
const gg = await ev(() => { const g = __game, e = g.ents().find(o => o.d.ai === 'glassgolem'); e.hp = 1000; let zero = 0; for (let i = 0; i < 60; i++) { const h0 = e.hp; g.hurtEnemy(e, 1, e.x, e.y, {}); if (e.hp === h0) zero++; } const h1 = e.hp; g.hurtEnemy(e, 10, e.x, e.y, { boom: true }); return { zero, boom: h1 - e.hp }; });
ok(gg.zero >= 6 && gg.zero <= 34 && gg.boom >= 15, 'glasgolemen: skott studsar ibland, smällen gör dubbel skada ' + JSON.stringify(gg));
// slungan och glasbössan
await put(3.5, 26.5);
await ev(() => { const g = __game, P = g.P, i = g.WEAPONS.findIndex(w => w.id === 'sling'); P.has[i] = true; P.mags[i] = 1; P.ammo.slingstones = 10; g.switchWeapon(i); P.a = 0; });
await gwait(0.6);
await ev(() => { const g = __game; g.WS.cd = 0; g.WS.state = 'idle'; g.fire(); });
ok(await ev(() => __game.v30().V30L().stones.length === 1), 'slungan kastar en sten');
await gwait(1.6);
ok(await ev(() => __game.v30().V30L().stones.length === 0 && __game.P.ammo.slingstones === 9), 'stenen försvinner och en sten är förbrukad');
await ev(() => { const g = __game, P = g.P, i = g.WEAPONS.findIndex(w => w.id === 'glassgun'); P.has[i] = true; P.mags[i] = 4; P.ammo.glass = 8; g.switchWeapon(i); });
await gwait(0.6);
await ev(() => { const g = __game; g.WS.cd = 0; g.WS.state = 'idle'; g.fire(); });
ok(await ev(() => { const g = __game, i = g.WEAPONS.findIndex(w => w.id === 'glassgun'); return g.P.mags[i] === 3; }), 'glasbössan skjuter (ett glas)');
// ammo i de andra biomerna: ammolådan ger stenar när man har slungan
ok(await ev(() => { const g = __game; const n0 = g.P.ammo.slingstones; g.items().push({ type: 'ammo', x: g.P.x, y: g.P.y, taken: false }); return n0; }) >= 0, 'ammolåda utlagd');
await gwait(0.5);
ok(await ev(() => __game.P.ammo.slingstones > 9), 'ammolådan ger stenar till slungan');
// ---- vapnens andra lägen, krokarna mot RAS och FÖNSTER, skärvorna när man springer och landar ----
const arena = () => ev(() => { const g = __game, W = 30, H = 11, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  for (let y = 1; y < H - 1; y++) grid[y][22] = '1'; grid[8][22] = 'ǁ'; grid[2][22] = 'ǁ'; for (let x = 4; x <= 9; x++) grid[9][x] = 'ʠ';
  grid[5][3] = 'P'; grid[1][28] = 'x'; grid[5][12] = 'S'; g.playCustom({ grid, biome: 'dungeon' }); const P = g.P; P.hp = 1e6; P.iframe = 1e6; P.a = 0; P.armor = 0; });
await arena(); await gwait(1.2);
const still = () => ev(() => { for (const e of __game.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 5000; } });
await still();
const give = id => ev(id => { const g = __game, P = g.P, i = g.WEAPONS.findIndex(w => w.id === id); P.has[i] = true; P.mags[i] = id === 'sling' ? 1 : 4; P.ammo.slingstones = 30; P.ammo.glass = 24; g.switchWeapon(i); return i; }, id);
const at = (x, y, a) => ev(([x, y, a]) => { const P = __game.P; P.x = x; P.y = y; P.a = a; P.vx = P.vy = 0; P.jz = 0; }, [x, y, a]);
const tgt = (x, y) => ev(([x, y]) => { const e = __game.ents().find(o => !o.dead); e.x = x; e.y = y; e.hp = 5000; e.bleed = 0; return e.hp; }, [x, y]);
const hp = () => ev(() => __game.ents().find(o => !o.dead).hp);
const ready = () => ev(() => { const g = __game; g.WS.cd = 0; g.WS.state = 'idle'; });
await give('sling'); await gwait(0.6);
// mitt i fienden (huvudet) mot vid sidan: ungefär dubbelt
await at(3.5, 5.5, 0); await tgt(10.5, 5.5); await ready(); await ev(() => __game.fire()); await gwait(0.8); const dC = 5000 - await hp();
await tgt(10.5, 5.75); await ready(); await ev(() => __game.fire()); await gwait(0.8); const dS = 5000 - await hp();
ok(dC > 50 && dS > 20 && dC > dS * 1.6, 'slungan: mitt i fienden gör ungefär dubbelt mot vid sidan ' + JSON.stringify({ dC: Math.round(dC), dS: Math.round(dS) }));
// tungt kast: håll högerklick i 1 s och släpp
await tgt(15.5, 2.5); await ready(); await ev(() => __game.setMouse(false, true)); await gwait(1.15); await ev(() => __game.setMouse(false, false)); await gwait(0.03);
const hv = await ev(() => { const s = __game.v30().V30L().stones[0]; return s ? { heavy: s.heavy, dmg: Math.round(s.dmg) } : null; });
ok(hv && hv.heavy && hv.dmg >= 85, 'slungan: högerklick i 1 s ger ett tungt kast (90) ' + JSON.stringify(hv));
await gwait(1.5);
// en studs i väggen
await at(19.5, 4.5, 0); await ready(); await ev(() => __game.fire()); await gwait(0.35);
const bo = await ev(() => { const s = __game.v30().V30L().stones[0]; return s ? { dx: +s.dx.toFixed(2), bounces: s.bounces } : null; });
ok(bo && bo.dx < 0 && bo.bounces === 0, 'slungan: stenen studsar en gång i väggen ' + JSON.stringify(bo));
await gwait(1.3);
// stenen krossar glas
await at(19.5, 8.5, 0); await ready(); await ev(() => __game.fire()); await gwait(0.5);
ok(await ev(() => __game.mapRef()[8][22] === 'ǀ'), 'slungans sten krossar glaset ǁ');
// RAS: tre tunga kast river en sprucken vägg; stengolemens block är en tung träff
const marked = await ev(() => { const r = __game.r30; return !!(r && r.mark(22, 5) && r.mark(22, 6)); });
if (marked) {
  for (let i = 0; i < 3; i++) { await at(19.5, 5.5, 0); await ready(); await ev(() => __game.setMouse(false, true)); await gwait(1.15); await ev(() => __game.setMouse(false, false)); await gwait(0.6); }
  ok(await ev(() => { const c = __game.r30.cells().find(g => g.x === 22 && g.y === 5); return !!(c && c.done); }), 'slungans tunga kast river en sprucken vägg (RAS r30Crack)');
  await ev(() => { const g = __game, e = g.ents().find(o => !o.dead); g.projectiles().push({ x: 21.2, y: 6.5, z: 0.6, vx: 6, vy: 0, dmg: 1, src: e, kind: 'v30rock', life: 2, t0: g.v27b.t(), arcT: 5, arcH: 0.5 }); });
  await gwait(0.5);
  ok(await ev(() => { const c = __game.r30.cells().find(g => g.x === 22 && g.y === 6); return !!(c && (c.hp < 3 || c.done)); }), 'stengolemens block är en tung träff mot en sprucken vägg');
} else ok(false, 'RAS: kunde inte märka en vägg (r30.mark)');
// glasbössan: blödning, och glaskulan kostar två glas och spricker
await give('glassgun'); await gwait(0.6);
await at(3.5, 5.5, 0); await tgt(7.5, 5.5); await ready(); await ev(() => __game.fire()); await gwait(0.15);
ok(await ev(() => __game.ents().find(o => !o.dead).bleed > 0), 'glasbössan får fienden att blöda');
await gwait(0.6); await ev(() => { const g = __game, i = g.WEAPONS.findIndex(w => w.id === 'glassgun'); g.P.mags[i] = 4; }); await tgt(6.5, 5.5); await ready();
await ev(() => __game.setMouse(false, true)); await gwait(0.1); await ev(() => __game.setMouse(false, false));
const orb = await ev(() => { const g = __game, i = g.WEAPONS.findIndex(w => w.id === 'glassgun'); return { mags: g.P.mags[i], orbs: g.v30().V30L().orbs.length }; });
await gwait(0.6);
const orbHit = 5000 - await hp();
ok(orb.mags === 2 && orbHit > 10 && await ev(() => __game.v30().V30L().orbs.length === 0), 'glaskulan kostar två glas och spricker vid fienden ' + JSON.stringify({ ...orb, orbHit: Math.round(orbHit) }));
// glasbössans skärvor krossar glas
await ev(() => { const g = __game, i = g.WEAPONS.findIndex(w => w.id === 'glassgun'); g.P.mags[i] = 4; for (const e of g.ents()) { e.x = 27.5; e.y = 9.5; } });
await at(19.5, 2.5, 0); for (let i = 0; i < 2; i++) { await ready(); await ev(() => __game.fire()); await gwait(0.7); }
ok(await ev(() => __game.mapRef()[2][22] === 'ǀ'), 'glasbössans skärvor krossar glaset ǁ');
// skärvor: springer man skär de (cirka 3/s), landar man skär de (3)
await ev(() => { const g = __game, P = g.P; P.x = 4.5; P.y = 9.5; P.hp = 100; P.iframe = 0; P.armor = 0; P.a = 0; P.stam = 1; g.keys.ShiftLeft = true; g.keys.KeyW = true; });
await gwait(1.0);
const hpRun = await ev(() => { const g = __game; g.keys.ShiftLeft = false; g.keys.KeyW = false; return g.P.hp; });
ok(hpRun < 99.5 && hpRun > 90, 'skärvorna skär den som springer ' + hpRun.toFixed(1));
await ev(() => { const P = __game.P; P.x = 6.5; P.y = 9.5; P.vx = P.vy = 0; P.hp = 100; P.iframe = 0; P.jz = 1.2; P.jv = 0; }); await gwait(1.0);
const hpLand = await ev(() => __game.P.hp);
ok(hpLand <= 98 && hpLand > 90, 'skärvorna skär den som landar på dem ' + hpLand.toFixed(1));
// vägsökningen: en fiende bakom en hel remsa av grus, smält glas och skärvor når spelaren
await ev(() => { const g = __game, W = 30, H = 9, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  for (let y = 1; y < H - 1; y++) { grid[y][12] = 'ʞ'; grid[y][13] = 'ʞ'; grid[y][16] = 'ʠ'; } grid[4][8] = 'P'; grid[1][28] = 'x'; grid[4][19] = 'ʨ'; g.playCustom({ grid, biome: 'ruins' }); g.P.hp = 1e6; g.P.iframe = 1e6; });
await gwait(1);
await ev(() => { const e = __game.ents().find(o => o.type === 'ʨ'); e.alert = true; e.sleep = false; e.d = { ...e.d, dmg: 0 }; e.knifeT = 999; window.__ex0 = e.x; });
await gwait(10);
ok(await ev(() => { const e = __game.ents().find(o => o.type === 'ʨ'); window.__ed = e ? +Math.hypot(e.x - __game.P.x, e.y - __game.P.y).toFixed(1) : -1; return e && window.__ed < 3; }), 'en fiende går över grus och skärvor fram till spelaren ' + await ev(() => window.__ed));
ok(miss404.length === 0, 'inga saknade version 30-filer under assets/ ' + miss404.slice(0, 5).join(' / '));
ok(cerrs.length === 0, 'inga fel i konsolen ' + cerrs.slice(0, 3).join(' / '));
await done();
