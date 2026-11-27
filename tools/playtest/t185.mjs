// t185: version 30 (RAS) – en sprucken vägg i en egen bana. En mellanvägg (x = 12) med en lång omväg upptill; rutan (12, 6) görs
// sprucken (__game.r30.mark). Sprucken: en vägg för kulor, siktlinje, kollision och vägsökning, med egen textur (sprickor ovanpå
// väggens). Pistolskott biter inte. Tre sparkar (tunga träffar) river den: rutan blir grus ʶ (inte vägg, gångbar, fri siktlinje,
// fiendernas avståndsfält tar genvägen, golvet byter textur). En smäll river den direkt och skadar en fiende som står bakom.
// r30Crack (för slungan och stengolemen) räknas som en tung träff. Stridshammaren och hackan river också. lowfx och WebGL: inga fel.
// R30.on = false: smällar och sparkar gör ingenting. Väntan i speltid. Port 9885.
import { setup } from './head.mjs';
const PORT = 9885;
const { pg, ev, wait, ok, shot, done, until, gwait } = await setup(PORT, 'out/t185');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) cerr.push(m.text().slice(0, 160)); });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const sceneFn = o => { const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: !!o.lowfx, noFlash: false, reduceMotion: false, rendering: o.mode || 'auto' });
  const W = 24, H = 13, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 || x === 12 ? (o.wall || '1') : '.'); grid.push(r); }
  grid[1][12] = '.'; grid[11][1] = 'x';
  for (const [t, x, y] of o.en || []) grid[y][x] = t;
  g.playCustom({ grid, biome: o.biome || 'dungeon' });
  for (const e of g.ents()) { e.d = { ...e.d, speed: 0, dmg: 0 }; e.alert = false; }
  g.P.hp = 1e6; g.P.iframe = 0; clearInterval(window.__hold); window.__pin = [o.px || 8.5, 6.5]; g.P.a = 0; g.lvl().ambient = 1.1; g.P.pitch = 0; g.P.look = 0;
  window.__hold = setInterval(() => { const P = __game.P; P.hp = 1e6; if (window.__pin) { P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = 0; P.vx = P.vy = 0; } }, 30); };
const ready = async o => { await ev(sceneFn, o); await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await gwait(0.3);
  return ev(o => o.nomark ? true : __game.r30.mark(12, 6), o); };
const state = () => ev(() => { const g = __game, r = g.r30, m = r.map(), c = r.cells().find(c => c.x === 12 && c.y === 6), e = g.ents().find(x => x.type === 'Ä'); g.f29.updateFlow(); const fl = g.f29.flow();
  const ft = r.floorTex(12, 6), wt = r.texOf(m[6][12]);
  return { cell: c || null, ch: m[6][12], wall: g.v28.isWall(m[6][12]), solid: g.v28.solid(12.5, 6.5), walk: g.v28.walk(12, 6), los: g.v28.los(8.5, 6.5, 15.5, 6.5), flowE: fl[6 * 24 + 15], hp: e ? e.hp : -1,
    ftR30: !!(ft && ft.r30), wtR30: !!(wt && wt.r30), fallen: r.L().fallen }; });
const pistol = n => ev(async n => { const g = __game, P = g.P, WS = g.WS, i = g.WEAPONS.findIndex(w => w.id === 'pistol'); P.has[i] = true; P.weapon = i; if (P.ammo) for (const k in P.ammo) P.ammo[k] = 99;
  for (let k = 0; k < n; k++) { P.mags[i] = 9; WS.state = 'idle'; WS.t = 0; WS.cd = 0; WS.shot = 99; P.a = 0; g.fire(); await new Promise(r => setTimeout(r, 120)); } }, n);
const R = {};
// ---- sprucken vägg ----
R.mark = await ready({ en: [['Ä', 14, 6]] });
ok(R.mark === true, 'r30.mark gör väggen sprucken ' + R.mark);
R.s0 = await state(); await shot('sprucken');
ok(R.s0.cell && !R.s0.cell.done && R.s0.cell.hp === 3 && R.s0.ch !== '1' && R.s0.wtR30, 'en sprucken vägg (eget tecken, textur med sprickor) ' + JSON.stringify({ ch: R.s0.ch, cell: R.s0.cell, tex: R.s0.wtR30 }));
ok(R.s0.wall && R.s0.solid && !R.s0.walk && !R.s0.los, 'den spruckna väggen är en vägg: isWallChar, solid, inte gångbar, blockerar siktlinjen ' + JSON.stringify({ wall: R.s0.wall, solid: R.s0.solid, walk: R.s0.walk, los: R.s0.los }));
ok(R.s0.flowE >= 15, 'fiendernas avståndsfält går runt (omvägen) ' + R.s0.flowE);
R.tex = await ev(() => { const g = __game, m = g.r30.map(), a = g.r30.texOf(m[6][12]), b = g.r30.texOf('1'); let d = 0; for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) d++; return { d, n: a.data.length, w: a.w, h: a.h, bw: b.w }; });
ok(R.tex.d > R.tex.n * 0.04 && R.tex.d < R.tex.n * 0.6 && R.tex.w === R.tex.bw, 'sprickorna ligger ovanpå väggens textur ' + JSON.stringify(R.tex));
await pistol(4); await gwait(0.3); R.s1 = await state();
ok(R.s1.cell.hp === 3 && !R.s1.cell.done && R.s1.wall, 'pistolskott biter inte på den spruckna väggen ' + JSON.stringify(R.s1.cell));
// ---- tre sparkar ----
await ev(() => { window.__pin = [11.55, 6.5]; }); await gwait(0.3);
const kick = async () => { await pg.keyboard.press('v'); await gwait(0.75); return ev(() => __game.r30.cells().find(c => c.x === 12 && c.y === 6)); };
R.k1 = await kick(); R.k2 = await kick(); await shot('sparkad'); R.k3 = await kick();
ok(R.k1.hp === 2 && R.k2.hp === 1 && R.k3.done, 'tre sparkar river väggen ' + JSON.stringify([R.k1, R.k2, R.k3].map(c => c.hp + (c.done ? 'R' : ''))));
R.s2 = await state(); await shot('raserad');
ok(R.s2.ch === 'ʶ' && !R.s2.wall && !R.s2.solid && R.s2.walk && R.s2.los, 'den rasade rutan är gångbart grus ʶ med fri siktlinje ' + JSON.stringify({ ch: R.s2.ch, wall: R.s2.wall, solid: R.s2.solid, walk: R.s2.walk, los: R.s2.los }));
ok(R.s2.flowE > 0 && R.s2.flowE <= R.s0.flowE - 8, 'fiendernas vägsökning tar genvägen ' + JSON.stringify({ före: R.s0.flowE, efter: R.s2.flowE }));
ok(R.s2.ftR30, 'golvet i rutan är grus (egen golvtextur) ' + R.s2.ftR30);
// ---- en smäll river direkt och skadar fienden bakom ----
await ready({ en: [['Ä', 13, 6]] });
const hp0 = await ev(() => { const e = __game.ents().find(x => x.type === 'Ä'); e.hp = e.maxHp = 500; return e.hp; });
const zc = () => ev(() => { __game.v28.render(); const z = __game.v28.zbuf(); let n = 0; for (let j = 0; j < z.length; j++) if (z[j] > 0) n = j; return z[n >> 1]; }); // (mittkolumnen av de ritade)
R.z0 = await zc();
await ev(() => __game.explode(11.2, 6.5, 30, 1.6, false)); await gwait(0.5);
R.z1 = await zc();
R.s3 = await state(); await shot('small');
ok(R.s3.cell.done && R.s3.ch === 'ʶ', 'en smäll river den spruckna väggen direkt ' + JSON.stringify(R.s3.cell));
ok(hp0 - R.s3.hp >= 40 && hp0 - R.s3.hp <= 50, 'fienden bakom väggen tar bara rasets skada (45), inte smällens (30): väggen skyddar mot just den smällen ' + JSON.stringify({ före: hp0, efter: R.s3.hp }));
ok(R.z0 < 4 && R.z1 > 9, 'zbuf: mittkolumnens djup går genom den rasade rutan ' + JSON.stringify({ före: R.z0, efter: R.z1 }));
// ---- tunga skott och projektiler ----
await ready({});
R.sn = await ev(async () => { const g = __game, P = g.P, WS = g.WS, i = g.WEAPONS.findIndex(w => w.id === 'sniper'); if (i < 0) return 'saknas'; P.has[i] = true; P.weapon = i; if (P.ammo) for (const k in P.ammo) P.ammo[k] = 99; P.mags[i] = 5;
  WS.state = 'idle'; WS.t = 0; WS.cd = 0; WS.shot = 99; P.a = 0; g.fire(); await new Promise(r => setTimeout(r, 200)); return g.r30.cells()[0].hp; });
ok(R.sn === 2, 'ett skott med prickskyttegeväret är en tung träff ' + R.sn);
R.pj = await ev(async () => { const g = __game; g.projectiles().push({ x: 10.5, y: 6.5, z: 0.5, vx: 9, vy: 0, dmg: 3, src: g.P, friendly: true, kind: 'stone', life: 2, r30: true }); g.projectiles().push({ x: 10.5, y: 6.4, z: 0.5, vx: 9, vy: 0, dmg: 3, src: g.P, friendly: true, kind: 'stone', life: 2 });
  await new Promise(r => setTimeout(r, 900)); return g.r30.cells()[0].hp; });
ok(R.pj === 1, 'en kastad sten med p.r30 (som slungans tunga sten) är en tung träff, en utan inte ' + R.pj);
// ---- r30Crack (slungan, stengolemen): tre tunga träffar; 'boom' direkt ----
await ready({});
R.cr = await ev(() => { const r = __game.r30, a = [r.crack(12.5, 6.5, 30), r.crack(12, 6, 30)], h = r.cells()[0].hp; a.push(r.crack(12.9, 6.1, 30)); return { a, h, done: r.cells()[0].done, miss: r.crack(5, 5, 30) }; });
ok(R.cr.a.every(Boolean) && R.cr.h === 1 && R.cr.done && R.cr.miss === false, 'r30Crack: tre tunga träffar river väggen, en vanlig ruta påverkas inte ' + JSON.stringify(R.cr));
await ready({}); R.crB = await ev(() => { const r = __game.r30; r.crack(12.5, 6.5, 0, 'boom'); return r.cells()[0].done; });
ok(R.crB, "r30Crack med 'boom' river direkt " + R.crB);
// ---- stridshammaren och hackan ----
const melee = (id, charge) => ev(async ([id, charge]) => { const g = __game, P = g.P, WS = g.WS, i = g.WEAPONS.findIndex(w => w.id === id); if (i < 0) return 'saknas';
  P.has[i] = true; P.weapon = i; for (let k = 0; k < 3; k++) { WS.state = 'idle'; WS.cd = 0; WS.t = 0; WS.shot = 99; if (charge) WS.hcharge = 0.9; else g.fire(); await new Promise(r => setTimeout(r, 450)); }
  return g.r30.cells()[0]; }, [id, charge]);
await ready({ px: 11.45 }); R.ham = await melee('hammer', true);
await ready({ px: 11.45 }); R.pick = await melee('pickaxe');
ok(R.ham && (R.ham.done || R.ham.hp < 3), 'stridshammaren biter på den spruckna väggen ' + JSON.stringify(R.ham));
ok(R.pick && (R.pick.done || R.pick.hp < 3), 'hackan biter på den spruckna väggen ' + JSON.stringify(R.pick));
// ---- R30.on = false ----
await ready({ px: 11.55 }); await ev(() => { __game.r30.R30.on = false; __game.explode(11.2, 6.5, 0, 1.6, false); }); await pg.keyboard.press('v'); await gwait(0.6);
R.off = await state(); await ev(() => { __game.r30.R30.on = true; });
ok(R.off.wall && !R.off.cell.done && R.off.cell.hp === 3, 'R30.on = false: smällar och sparkar gör ingenting ' + JSON.stringify(R.off.cell));
// ---- vanliga väggar (inga spruckna): oförändrade av smällar ----
await ready({ nomark: true }); await ev(() => __game.explode(11.2, 6.5, 0, 1.6, false)); await gwait(0.3);
R.plain = await ev(() => ({ ch: __game.r30.map()[6][12], n: __game.r30.cells().length }));
ok(R.plain.ch === '1' && R.plain.n === 0, 'en vanlig vägg står kvar ' + JSON.stringify(R.plain));
// ---- andra biomer: en sprucken vägg i biomens vägg ----
R.bio = [];
for (const [b, w] of [['cathedral', null], ['tomb', 'È'], ['graveyard', '7'], ['frost', 'Ø']]) { await ready({ biome: b, wall: w || '1' }); const r = await ev(() => { const g = __game, m = g.r30.map(), c = g.r30.cells()[0]; return { ch: m[6][12], base: c ? c.base : null, tex: !!(g.r30.texOf(m[6][12]) || {}).r30 }; }); R.bio.push([b, r]); }
ok(R.bio.every(([, r]) => r.tex && r.base), 'spruckna väggar i olika biomers väggar ' + JSON.stringify(R.bio));
await ready({ biome: 'ship', wall: 'ǒ', nomark: true }); R.hull = await ev(() => __game.r30.mark(12, 6));
ok(R.hull === false, 'skrovets plankor (trä) spricker inte som sten: ingen sprucken vägg ' + R.hull);
// ---- lowfx och WebGL / VÄRLD: GRAFIKKORT ----
await ready({ lowfx: true }); await ev(() => __game.explode(11.2, 6.5, 0, 1.6, false)); await gwait(0.4); await shot('lowfx');
R.low = await state(); ok(R.low.cell.done, 'lowfx: raset fungerar ' + JSON.stringify(R.low.cell));
await ready({ mode: 'webgl' }); await ev(() => { __game.settings.glWorld = 'gpu'; }); await gwait(0.6); await shot('webgl_sprucken');
R.g0 = await ev(() => __game.w29 && __game.w29.W29.frameOn ? __game.w29.grab(80, 50) : null);
await ev(() => __game.explode(11.2, 6.5, 0, 1.6, false)); await gwait(1.2); await shot('webgl_raserad');
R.g1 = await ev(() => __game.w29 && __game.w29.W29.frameOn ? __game.w29.grab(80, 50) : null);
if (R.g0 && R.g1) { let d = 0; for (let i = 0; i < R.g0.length; i++) d += Math.abs(R.g0[i] - R.g1[i]); ok(d / R.g0.length > 1, 'VÄRLD: GRAFIKKORT: bilden ändras när väggen rasar (medelskillnad ' + (d / R.g0.length).toFixed(1) + ')'); }
else console.log('SKIP  grafikkortets bild (VÄRLD: GRAFIKKORT ritade inte här)');
R.gl = await ev(() => { const g = __game; return { w29: g.w29 ? g.w29.n() : null, cell: g.r30.cells()[0] }; });
ok(R.gl.cell.done, 'WebGL: raset fungerar ' + JSON.stringify({ frames: R.gl.w29 && R.gl.w29.frames, failed: R.gl.w29 && R.gl.w29.failed, err: R.gl.w29 && R.gl.w29.err }));
if (R.gl.w29 && R.gl.w29.frames > 0) ok(!R.gl.w29.failed, 'VÄRLD: GRAFIKKORT ritar utan fel med spruckna och rasade väggar ' + JSON.stringify(R.gl.w29));
await ev(() => { __game.settings.glWorld = 'cpu'; window.__pin = null; clearInterval(window.__hold); });
ok(cerr.length === 0, 'inga fel i konsolen ' + [...new Set(cerr)].slice(0, 3).join(' / '));
await done();
