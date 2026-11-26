// t120: version 26A – SPRÄNGSKOTT. Ett träffskott på din egen granat, ett sparkat krutfat eller fiendens granat (version 25) spränger
// den direkt med 1,5× radie. Kontroller: granaten smäller före stubinen och skadar en fiende 3,1 rutor bort (utanför vanliga 2,6 men
// innanför 3,9); med __game.v26a av går kulan förbi, granaten smäller på stubinen och fienden klarar sig (som före version 26);
// hagelgeväret (9 hagel) ger exakt en smäll och 1,5× radie en gång (inte 1,5^n); en granat närmare än 1,6 rutor smäller inte
// (inte i ansiktet); krutfatet smäller med radie 3,6; fiendens granat smäller direkt med 1,5× radie och skadar fienden bredvid;
// stilpoäng '+SPRÄNG'. Inga sidfel. Alla väntetider räknas i speltid (__game.roles.t()), inte väggtid.
import { setup } from './head.mjs';
const PORT = 9820;
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/t120');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) cerr.push(m.text().slice(0, 160)); }); // spriteError skriver bara till konsolen
const load = async (q = '') => { await pg.goto(`http://localhost:${PORT}/index.html?nolock=1${q}`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 }); };
await load();
ok(await ev(() => !!__game.v26a && __game.v26a.on() === true && __game.v26a.state().blast === true), '__game.v26a finns och sprängskotten är på som standard');

// scen: öppet rum med väggram, fiender som står still utan skada och med mycket hälsa; spelaren står fast och tål allt
const sceneFn = o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = true; g.settings.diff = 1;
  const W = o.W, H = o.H, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[o.p[1]][o.p[0]] = 'P'; grid[1][W - 2] = 'x'; grid[H - 2][W - 2] = 'e'; // ett krutfat i hörnet (bilden till det sparkade fatet)
  for (const [t, x, y] of o.en) grid[y][x] = t;
  g.playCustom({ grid, biome: 'dungeon' });
  const E = g.ents(), spec = E.filter(e => !e.boss).map(e => [e.type, e.x, e.y]); E.length = 0;
  for (const [t, x, y] of spec) g.spawnEnemy(t, x, y);
  for (const e of E) { e.d = { ...e.d, dmg: 0, speed: 0 }; e.base = { speed: 0, cd: e.d.cd }; e.hp = e.maxHp = 500; }
  g.P.hp = 1e6; clearInterval(window.__hold); const px = g.P.x, py = g.P.y; window.__pin = [px, py];
  window.__hold = setInterval(() => { __game.P.hp = 1e6; if (window.__pin) { __game.P.x = window.__pin[0]; __game.P.y = window.__pin[1]; } }, 30);
  g.projectiles().length = 0; g.v26a.reset(); g.v26a.set('blast', true); if (o.fx) g.settings.lowfx = false;
};
const scene = o => pg.evaluate(sceneFn, o);
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(60); } };
const gwait = sec => until(null, sec);
// skjut med vapen nr w rakt österut (siktet mitt på), full mynning
const shoot = w => ev(w => { const g = __game; g.P.has[w] = true; g.P.weapon = w; g.WS.state = 'idle'; g.WS.cd = 0; g.WS.aim = 0; g.P.mags[w] = Math.max(2, g.P.mags[w]); g.P.burst = 0; g.P.a = 0; g.P.pitch = 0; g.fire(); }, w);
const nade = (x, y, life) => ev(([x, y, life]) => { const p = { x, y, z: 0.05, vz: 0, vx: 0, vy: 0, kind: 'pgren', friendly: true, life, dmg: 38, beepT: 0 }; __game.projectiles().push(p); window.__n = p; }, [x, y, life]);
const enemyHp = () => ev(() => __game.ents().filter(e => !e.dead).map(e => +e.hp.toFixed(2)));
const EN = { W: 22, H: 14, p: [3, 6], en: [['S', 8, 9]] }; // spelaren (3,5;6,5), fienden (8,5;9,5): 3,0 rutor från granaten vid (8,5;6,5)

// 1) granaten skjuts: smäller direkt, 1,5× radie (3,9) når fienden 3,0 rutor bort
await scene(EN); await gwait(0.4);
await nade(8.5, 6.5, 1.6);
const t1 = await gt(); await shoot(0);
const r1 = await ev(() => ({ r: window.__n.radius, life: window.__n.life, hit: !!window.__n.v26hit, st: { ...__game.v26a.st(), log: undefined } }));
await until(() => window.__n.dead, 1.0);
const dt1 = (await gt()) - t1;
const hp1 = await enemyHp();
ok(r1.hit && Math.abs(r1.r - 3.9) < 1e-6 && r1.st.nade === 1 && r1.st.blasts === 1, `skottet träffade granaten: radie ${r1.r} (2,6 × 1,5), räknare ${JSON.stringify(r1.st)}`);
ok(dt1 < 0.3, `granaten smällde ${dt1.toFixed(2)} s efter skottet, långt före stubinen (1,6 s)`);
ok(hp1[0] < 500, `fienden 3,0 rutor bort tog skada av den större smällen (hälsa ${hp1[0]})`);
ok(await ev(() => __game.styleRef().feed.some(f => f.t === '+SPRÄNG')), 'stilmätaren visar +SPRÄNG');
await pg.locator('#screen').screenshot({ path: 'out/t120/sprangskott.png' }).catch(() => {});

// 2) av: kulan går förbi, granaten smäller på stubinen med vanlig radie och fienden klarar sig (som före version 26)
await scene(EN); await gwait(0.4); await ev(() => __game.v26a.set('blast', false));
await nade(8.5, 6.5, 1.0);
const t2 = await gt(); await shoot(0);
const r2 = await ev(() => ({ r: window.__n.radius, hit: !!window.__n.v26hit, dead: !!window.__n.dead }));
await until(() => window.__n.dead, 3);
const dt2 = (await gt()) - t2, hp2 = await enemyHp();
ok(!r2.hit && r2.r === undefined && !r2.dead, `av: skottet rör inte granaten ${JSON.stringify(r2)}`);
ok(dt2 > 0.8, `av: granaten smällde på stubinen efter ${dt2.toFixed(2)} s`);
ok(hp2[0] === 500, `av: fienden 3,0 rutor bort klarar sig med vanlig radie (hälsa ${hp2[0]})`);
await ev(() => __game.v26a.set('blast', true));

// 3) hagelgeväret: nio hagel ger en smäll och radien multipliceras en gång
await scene(EN); await gwait(0.4);
await nade(7.5, 6.5, 1.8);
let r3 = null;
for (let i = 0; i < 4 && !(r3 && r3.hit); i++) { await shoot(1); r3 = await ev(() => ({ r: window.__n.radius, hit: !!window.__n.v26hit, st: { ...__game.v26a.st(), log: undefined } })); if (!r3.hit) await gwait(0.1); }
await until(() => window.__n.dead, 1.0); await gwait(0.2);
const r3b = await ev(() => ({ ...__game.v26a.st(), log: undefined }));
ok(r3.hit && Math.abs(r3.r - 3.9) < 1e-6 && r3b.blasts === 1 && r3b.nade === 1, `hagel: en smäll, radie ${r3 && r3.r} ${JSON.stringify(r3b)}`);

// 4) för nära pipan: en granat 1,0 ruta framför spelaren smäller inte av skottet
await scene(EN); await gwait(0.4);
await nade(4.5, 6.5, 1.5);
await shoot(0);
const r4 = await ev(() => ({ hit: !!window.__n.v26hit, life: +window.__n.life.toFixed(2), st: { ...__game.v26a.st(), log: undefined } }));
ok(!r4.hit && r4.st.armed >= 1 && r4.st.blasts === 0, `granaten 1,0 ruta bort smäller inte i ansiktet ${JSON.stringify(r4)}`);
await until(() => window.__n.dead, 3);

// 5) sparkat krutfat: smäller direkt med radie 3,6 (2,4 × 1,5)
await scene(EN); await gwait(0.4);
await ev(() => { const g = __game, pr = g.props().find(p => p.def && p.def.boom); const b = { x: 8.5, y: 6.5, z: 0.3, vx: 0.4, vy: 0, kind: 'barrel', friendly: true, life: 3, dmg: 30, img: pr.frames[0] }; g.projectiles().push(b); window.__b = b; });
const t5 = await gt(); await shoot(0);
const r5 = await ev(() => ({ dead: !!window.__b.dead, hit: !!window.__b.v26hit, st: { ...__game.v26a.st(), log: undefined } }));
await gwait(0.3);
const hp5 = await enemyHp();
ok(r5.hit && r5.dead && r5.st.barrel === 1, `krutfatet sprängdes av skottet ${JSON.stringify(r5)}`);
ok(hp5[0] < 500, `krutfatets smälla med radie 3,6 når fienden 3,0 rutor bort (hälsa ${hp5[0]})`);

// 6) fiendens granat (version 25) på marken: skottet får den att smälla direkt med 1,5× radie
await scene({ W: 22, H: 14, p: [3, 6], en: [['S', 10, 9]] }); await gwait(0.4);
await ev(() => { const e = __game.ents()[0]; e.x = 10.5; e.y = 8.4; }); // 1,9 rutor från granaten (knuffen tar den 0,4 längre bort före skadan)
const rOk = await ev(() => __game.roles.on());
await ev(() => { const L = __game.roles.flags.live; const n = { x0: 12.5, y0: 2.5, tx: 10.5, ty: 6.5, t: 0, T: 0.8, fuse: 1.5, ph: 1, bT: 0.3, r: 1.6, dmg: 14, name: 'TEST', landT: __game.roles.t() }; L.push(n); window.__en = n; });
const t6 = await gt(); await shoot(0);
const r6 = await ev(() => ({ shot: !!window.__en.v26shot, r: window.__en.r, st: { ...__game.v26a.st(), log: undefined } }));
await until(() => __game.roles.st().booms > 0, 1.0);
const dt6 = (await gt()) - t6, hp6 = await enemyHp();
ok(rOk && r6.shot && Math.abs(r6.r - 2.4) < 1e-6 && r6.st.enade === 1, `fiendens granat träffades: radie ${r6.r} (1,6 × 1,5) ${JSON.stringify(r6)}`);
ok(dt6 < 0.3, `fiendens granat smällde ${dt6.toFixed(2)} s efter skottet (stubinen var 1,5 s)`);
ok(hp6[0] < 500, `fienden 1,9 rutor från fiendens granat (utanför 1,6, innanför 2,4) tog skada (hälsa ${hp6[0]})`);

// 7) fiendens granat i luften: den smäller där den är
await scene({ W: 22, H: 14, p: [3, 6], en: [['S', 18, 11]] }); await gwait(0.4);
await ev(() => { const L = __game.roles.flags.live; const n = { x0: 15.5, y0: 6.5, tx: 5.5, ty: 6.5, t: 0.2, T: 1.0, fuse: 1.5, ph: 0, bT: 0, r: 1.6, dmg: 14, name: 'TEST' }; L.push(n); window.__en = n; });
await shoot(0);
const r7 = await ev(() => ({ shot: !!window.__en.v26shot, tx: +window.__en.tx.toFixed(2), ph: window.__en.ph }));
ok(r7.shot && r7.ph === 1 && r7.tx > 12, `fiendens granat i luften smäller där den var (x ${r7.tx}, inte vid målet 5,5)`);
await gwait(0.3);

// 8) kpisten hålls in medan du kastar en granat (F): skurens kulor korsar granaten men spränger den inte (bara ett nytt tryck gör det);
// granaten flyger bort och smäller på stubinen långt från spelaren
await scene({ W: 26, H: 14, p: [3, 6], en: [['S', 22, 11]] }); await gwait(0.4);
const r8 = await ev(() => new Promise(res => { const g = __game, P = g.P, w = g.WEAPONS.findIndex(w => w.id === 'smg'); P.has[w] = true; P.weapon = w; g.WS.state = 'idle'; g.WS.cd = 0; P.mags[w] = 32; P.ammo.p9 = 999;
  g.setMouse(true, false); const t0 = g.roles.t(); let nade = null, maxHeld = 0, dist = 0;
  const k = () => { P.a = 0; P.pitch = 0; P.mags[w] = 32; const t = g.roles.t();
    if (!nade && t - t0 > 0.3) { g.fix251.nade(0.3); nade = g.projectiles().find(p => p.kind === 'pgren'); }
    if (nade) { dist = Math.hypot(nade.x - P.x, nade.y - P.y); if (nade.dead || nade.life <= 0) { g.setMouse(false, false); return res({ hit: !!nade.v26hit, dist: +dist.toFixed(2), st: { ...g.v26a.st(), log: undefined } }); } }
    if (t - t0 > 4) { g.setMouse(false, false); return res({ timeout: true }); } requestAnimationFrame(k); };
  requestAnimationFrame(k); }));
ok(r8 && !r8.timeout && !r8.hit && r8.st.blasts === 0 && r8.st.held > 0 && r8.dist > 4, `kpisten som hålls in spränger inte granaten (${r8.st && r8.st.held} kulor gick förbi), den smällde ${r8.dist} rutor bort ${JSON.stringify(r8)}`);
await gwait(0.4);

// 9) en kastad granat i luften och ett nytt tryck med pistolen när granaten är 2,4 rutor bort: den smäller direkt
await scene({ W: 26, H: 14, p: [3, 6], en: [['S', 22, 11]] }); await gwait(0.4);
const r9 = await ev(() => new Promise(res => { const g = __game, P = g.P; g.setMouse(false, false); P.a = 0; P.pitch = 0; g.fix251.nade(0.3); const n = g.projectiles().find(p => p.kind === 'pgren'), t0 = g.roles.t();
  const k = () => { P.a = 0; P.pitch = 0; const d = Math.hypot(n.x - P.x, n.y - P.y);
    if (d >= 2.4) { P.weapon = 0; g.WS.state = 'idle'; g.WS.cd = 0; P.mags[0] = 9; P.burst = 0; g.fire(); return res({ hit: !!n.v26hit, d: +d.toFixed(2), z: +n.z.toFixed(2), life: +n.life.toFixed(2), r: n.radius }); }
    if (g.roles.t() - t0 > 2) return res({ timeout: true }); requestAnimationFrame(k); };
  requestAnimationFrame(k); }));
ok(r9 && r9.hit && Math.abs(r9.r - 3.9) < 1e-6, `den kastade granaten i luften sprängdes av pistolen ${JSON.stringify(r9)}`);
await gwait(0.4);

// 10) med effekterna på (inte lowfx): granat och krutfat skjuts, smällerna och det förbrukade krutfatet ritas utan fel
await scene({ ...EN, fx: true }); await gwait(0.4);
await nade(8.5, 6.5, 1.6); await shoot(0); await gwait(0.4);
await ev(() => { const g = __game, pr = g.props().find(p => p.def && p.def.boom); const b = { x: 8.5, y: 6.5, z: 0.3, vx: 0.4, vy: 0, kind: 'barrel', friendly: true, life: 3, dmg: 30, img: pr.frames[0] }; g.projectiles().push(b); window.__b = b; });
await shoot(0); await gwait(0.5);
const s10 = await ev(() => ({ ...__game.v26a.st(), log: undefined }));
ok(s10.nade === 1 && s10.barrel === 1 && cerr.length === 0, `utan lowfx: granat och krutfat sprängs utan fel (konsolfel ${JSON.stringify(cerr)})`);

await done();
