// t139c: version 27 (BLOOD), omgång 3. Lik som går att skjuta och sparka sönder: riktiga pistolskott (fire) och sparken (V) spränger
// ett kultistlik i bitar med blod och en fläck; kristallgolemens lik ger skruvar men inget blod; BLOD AV ger damm. Lik som spelet
// behöver går inte sönder: det som en ghoul äter, uppväckta, bossar, lik i luften. Taket: högst 40 hela lik; de äldsta långt borta
// försvinner, men inte de nära spelaren eller nära en ghoul. Sårade fiender under 40 % droppar blod och lämnar spår (inte friska,
// inte med lowfx); under 20 % haltar köttfiender (fart × 0,8, tillbaka när de läker). En smäll som dödar köttfiender lämnar en
// stjärnformad fläck (MYCKET 8 strålar × 2, NORMAL högst 6), inte om den bara dödar metall eller inget. Kostnad: v27Tick med 40
// sårade fiender och 40 lik. Delar port 9839 med t139 och t139b (körs inte samtidigt). Inga sidfel. Väntetider i speltid.
import { setup } from './head.mjs';
const PORT = 9839;
const { pg, ev, wait, ok, shot, done } = await setup(PORT, 'out/t139c');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const sceneFn = o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = !!o.lowfx; g.settings.blood = o.blood ?? 2; g.gfxE.set(true); g.v27b.set(true);
  const W = o.W || 20, H = o.H || 11, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[o.p[1]][o.p[0]] = 'P'; grid[1][1] = 'x'; for (const [t, x, y] of o.en) grid[y][x] = t;
  g.playCustom({ grid, biome: 'dungeon' });
  const E = g.ents(), spec = E.filter(e => !e.boss).map(e => [e.type, e.x, e.y]); E.length = 0; for (const [t, x, y] of spec) g.spawnEnemy(t, x, y);
  for (const e of E) { e.d = { ...e.d, dmg: 0, speed: o.move ? e.d.speed : 0 }; e.alert = true; }
  g.P.hp = 1e6; clearInterval(window.__hold); window.__pin = [g.P.x, g.P.y]; window.__pinA = 0; g.P.a = 0; g.P.pitch = 0; g.P.look = 0;
  window.__hold = setInterval(() => { __game.P.hp = 1e6; if (window.__pin) { __game.P.x = window.__pin[0]; __game.P.y = window.__pin[1]; __game.P.a = window.__pinA; } }, 30); };
const scene = o => pg.evaluate(sceneFn, o);
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);
const killAll = () => ev(() => { const g = __game; for (const e of g.ents()) if (!e.dead) g.hurtEnemy(e, e.hp + 0.5, e.x, e.y); });
const pistol = () => ev(() => new Promise(res => { const g = __game, i = g.WEAPONS.findIndex(w => w.id === 'pistol'); g.P.has[i] = true; g.P.weapon = i; g.P.mags[i] = 9; g.WS.state = 'idle'; g.WS.cd = 0; g.WS.shot = 99; g.fire(); setTimeout(res, 150); }));
const st = () => ev(() => { const g = __game, E = g.ents(); return { n: { ...g.v27b.n }, corpses: E.filter(e => e.dead && !e.gibbed).length, gibbed: E.filter(e => e.gibbed).map(e => e.type), decals: g.v27b.decalArr().length }; });

// 1) pistolskott i ett kultistlik (fire): bitar, blod och en fläck
await scene({ p: [5, 5], en: [['Ä', 9, 5]] }); await gwait(0.4); await killAll(); await gwait(0.6);
let s0 = await st();
for (let i = 0; i < 6 && !(await ev(() => __game.ents()[0].gibbed)); i++) { await pistol(); await gwait(0.25); }
let s1 = await st();
ok(s1.gibbed.includes('Ä') && s1.n.corpseGibs === s0.n.corpseGibs + 1 && s1.n.corpseHits > s0.n.corpseHits && s1.decals > s0.decals, 'riktiga pistolskott spränger kultistliket: bitar, blod och fläckar ' + JSON.stringify({ hits: s1.n.corpseHits - s0.n.corpseHits, gibs: s1.n.corpseGibs - s0.n.corpseGibs, decals: [s0.decals, s1.decals] }));
await gwait(0.1); await shot('lik_skjutet');
// 2) sparken (V): liket framför dig går sönder direkt; golemens lik ger skruvar men inget blod
await scene({ p: [5, 5], en: [['Ä', 6, 5]] }); await gwait(0.4); await killAll(); await gwait(0.6);
s0 = await st(); await pg.keyboard.press('KeyV'); await gwait(0.3); s1 = await st();
ok(s1.gibbed.includes('Ä') && s1.n.corpseGibs === s0.n.corpseGibs + 1, 'sparken spränger liket framför dig ' + JSON.stringify(s1.gibbed));
await scene({ p: [5, 5], en: [['Ë', 6, 5]] }); await gwait(0.4); await ev(() => { const g = __game, e = g.ents()[0]; g.hurtEnemy(e, 999, e.x, e.y, { boom: true }); }); await gwait(0.6);
s0 = await st(); const v0 = await ev(() => __game.v27b.decals()); await pg.keyboard.press('KeyV'); await gwait(0.3); s1 = await st();
ok(s1.gibbed.includes('Ë') && await ev(() => __game.v27b.decals()) === v0, 'kristallgolemens lik: går sönder men lämnar inget blod ' + JSON.stringify(s1.gibbed));
// 3) BLOD AV: liket blir damm och sten
await scene({ p: [5, 5], en: [['Ä', 6, 5]], blood: 0 }); await gwait(0.4); await killAll(); await gwait(0.6);
s0 = await st(); await pg.keyboard.press('KeyV'); await gwait(0.3); s1 = await st();
ok(s1.gibbed.includes('Ä') && s1.n.offGibs > s0.n.offGibs && s1.decals === s0.decals, 'BLOD AV: liket blir damm och stenflisor, inga fläckar ' + JSON.stringify({ off: s1.n.offGibs - s0.n.offGibs, decals: [s0.decals, s1.decals] }));
// 4) skyddade lik: ghoulens måltid, uppväckta, lik i luften och bossar går inte sönder
await scene({ p: [5, 5], en: [['Ä', 6, 4], ['Ä', 6, 5], ['Ä', 6, 6], ['Å', 12, 5]] }); await gwait(0.4);
await ev(() => { const g = __game, E = g.ents(); for (const e of E.slice(0, 3)) g.hurtEnemy(e, e.hp + 0.5, e.x, e.y); });
await gwait(0.6);
const prot = await ev(() => { const g = __game, [a, b, c, gh] = g.ents(); gh.meal = a; b.raised = true; c.airZ = 0.5;
  const r = [a, b, c].map(e => g.v27b.corpseOk(e)); for (const e of [a, b, c]) g.v27b.corpseHit(e, 99);
  const boss = { dead: true, boss: true, type: 'B', d: { size: 2 }, x: 7, y: 5, gDeadT: -9 }; return { ok: r, gibbed: [a, b, c].map(e => !!e.gibbed), boss: g.v27b.corpseOk(boss) }; });
ok(prot.ok.every(v => !v) && prot.gibbed.every(v => !v) && !prot.boss, 'ghoulens måltid, uppväckta, lik i luften och bossar går inte sönder ' + JSON.stringify(prot));
await ev(() => { const g = __game, [a, b, c, gh] = g.ents(); gh.meal = null; b.raised = false; c.airZ = 0; });
// 5) taket: 50 lik långt bort → högst 40 hela; de nära spelaren och nära en ghoul ligger kvar
await scene({ W: 40, H: 22, p: [3, 3], en: [['Å', 34, 18]] }); await gwait(0.4);
const cap0 = await ev(() => { const g = __game; let k = 0; for (let i = 0; i < 50; i++) { const x = 12 + (i % 10) * 2 + 0.5, y = 5 + Math.floor(i / 10) * 3 + 0.5; const e = g.spawnEnemy('Ä', x, y); e.d = { ...e.d, speed: 0, dmg: 0 }; e.alert = true; g.hurtEnemy(e, e.hp + 0.5, e.x, e.y); }
  for (let i = 0; i < 3; i++) { const e = g.spawnEnemy('Ä', 4.5 + i, 4.5); e.d = { ...e.d, speed: 0, dmg: 0 }; e.alert = true; g.hurtEnemy(e, e.hp + 0.5, e.x, e.y); e.v27near = true; }
  for (let i = 0; i < 3; i++) { const e = g.spawnEnemy('Ä', 33.5 + i * 0.5, 17.5); e.d = { ...e.d, speed: 0, dmg: 0 }; e.alert = true; g.hurtEnemy(e, e.hp + 0.5, e.x, e.y); e.v27ghoul = true; }
  const gh = g.ents().find(e => e.type === 'Å'); gh.d = { ...gh.d, speed: 0 }; return g.ents().filter(e => e.dead && !e.gibbed).length; });
await gwait(2.5);
const cap1 = await ev(() => { const E = __game.ents(), whole = E.filter(e => e.dead && !e.gibbed); return { whole: whole.length, near: E.filter(e => e.v27near && !e.gibbed).length, ghoul: E.filter(e => e.v27ghoul && !e.gibbed).length, gone: __game.v27b.n.corpseGone, cap: __game.v27b.corpseCap() }; });
ok(cap0 === 56 && cap1.whole <= 40 && cap1.near === 3 && cap1.ghoul === 3, 'taket: högst 40 hela lik; de nära spelaren och nära ghoulen ligger kvar ' + JSON.stringify({ cap0, cap1 }));
// 6) sårade: under 40 % droppar och spår, friska inte, lowfx inte; under 20 % haltar och läker tillbaka
await scene({ p: [3, 5], en: [['Ä', 14, 3], ['Ä', 14, 7]], move: true }); await gwait(0.3);
const w0 = await ev(() => { const g = __game, [a, b] = g.ents(); a.hp = a.maxHp * 0.35; b.hp = b.maxHp; a.alert = b.alert = true; return { ...g.v27b.n }; });
await gwait(1.5);
const w1 = await ev(() => ({ ...__game.v27b.n }));
ok(w1.drips - w0.drips >= 3 && w1.trail - w0.trail >= 1, 'sårad under 40 %: droppar blod och lämnar spår ' + JSON.stringify({ drips: w1.drips - w0.drips, trail: w1.trail - w0.trail }));
const fresh = await ev(() => { const g = __game, b = g.ents()[1]; return { d: b.v27dT === undefined }; });
ok(fresh.d, 'en frisk fiende droppar inte');
await ev(() => { __game.settings.lowfx = true; }); const l0 = await ev(() => __game.v27b.n.drips); await gwait(1); const l1 = await ev(() => __game.v27b.n.drips); await ev(() => { __game.settings.lowfx = false; });
ok(l1 === l0, 'lowfx: inga droppar ' + (l1 - l0));
const lp = await ev(() => { const g = __game, a = g.ents()[0]; window.__sp = a.d.speed; a.hp = a.maxHp * 0.15; return a.d.speed; });
await gwait(0.3);
const lp2 = await ev(() => { const a = __game.ents()[0]; return { sp: a.d.speed, limp: !!a.v27limp }; });
await ev(() => { const a = __game.ents()[0]; a.hp = a.maxHp * 0.6; }); await gwait(0.3);
const lp3 = await ev(() => { const a = __game.ents()[0]; return { sp: a.d.speed, limp: !!a.v27limp, orig: window.__sp }; });
ok(lp2.limp && Math.abs(lp2.sp - lp * 0.8) < 1e-9 && !lp3.limp && Math.abs(lp3.sp - lp3.orig) < 1e-9, 'under 20 % haltar köttfienden (fart × 0,8), tillbaka när den läker ' + JSON.stringify({ lp, lp2, lp3 }));
await ev(() => { window.__pin = [12.5, 5.5]; window.__pinA = Math.PI / 2; }); await gwait(0.2); await shot('saarad');
// 7) stjärnfläcken efter en smäll som dödar köttfiender
const boom = async (en, o = {}) => { await scene({ p: [3, 5], en, ...o }); await gwait(0.4);
  const r0 = await ev(() => ({ ...__game.v27b.n })); await ev(() => __game.explode(10.5, 5.5, 50, 2.2, false, true)); await gwait(0.3);
  const r1 = await ev(() => ({ ...__game.v27b.n })); return { stars: r1.stars - r0.stars, splats: r1.starSplats - r0.starSplats }; };
const b1 = await boom([['Ä', 10, 4], ['Ä', 11, 6], ['Ä', 9, 5]]);
ok(b1.stars === 1 && b1.splats >= 12, 'en smäll som dödar kultister: en stjärnformad blodfläck ' + JSON.stringify(b1));
await ev(() => { window.__pin = [6.5, 5.5]; window.__pinA = 0; }); await gwait(0.6); await shot('stjarna');
const b2 = await boom([['Ë', 10, 5]]), b3 = await boom([]);
ok(b2.stars === 0 && b3.stars === 0, 'bara metall eller ingen död: ingen stjärna ' + JSON.stringify({ b2, b3 }));
const b4 = await boom([['Ä', 10, 4], ['Ä', 11, 6]], { blood: 1 }), b5 = await boom([['Ä', 10, 4]], { lowfx: true }), b6 = await boom([['Ä', 10, 4]], { blood: 0 });
ok(b4.stars === 1 && b4.splats <= 6 && b5.stars === 0 && b6.stars === 0, 'NORMAL: högst 6 stänk; lowfx och BLOD AV: ingen stjärna ' + JSON.stringify({ b4, b5, b6 }));
// 9) spöken och eld (FX ritar virvlar och lågor): bansheen och eldelementalen blöder inte – inga blodpartiklar, inga pölar, inget kött;
// kultisten bredvid blöder som förut
await scene({ p: [5, 5], en: [['Ý', 8, 3], ['Æ', 8, 5], ['Ä', 8, 7]] }); await gwait(0.4);
const gh = await ev(() => { const g = __game, F = g.v27b.fx(), blood = new Set(F.blood), pool = new Set(F.parts.blood_pool), gib = F.parts.gib, out = {};
  for (const e of g.ents()) { const P0 = g.particles().length, D0 = g.v27b.decalArr().length; g.hurtEnemy(e, 0.5, e.x, e.y); g.hurtEnemy(e, e.hp + 999, e.x, e.y);
    const nw = g.particles().slice(P0), nd = g.v27b.decalArr().slice(D0); out[e.type] = { dead: !!e.dead, red: nw.filter(p => blood.has(p.img)).length, gib: nw.filter(p => gib && p.frames === gib).length, pools: nd.filter(d => pool.has(d.img) || d.v27).length }; }
  return { out, noBleed: g.v27b.n.noBleed }; });
await gwait(0.8);
const gh2 = await ev(() => { const F = __game.v27b.fx(), pool = new Set(F.parts.blood_pool); return __game.v27b.decalArr().filter(d => pool.has(d.img) && Math.abs(d.y - 3.5) < 0.6).length + __game.v27b.decalArr().filter(d => pool.has(d.img) && Math.abs(d.y - 5.5) < 0.6).length; });
ok(['Ý', 'Æ'].every(t => gh.out[t].dead && gh.out[t].red === 0 && gh.out[t].gib === 0 && gh.out[t].pools === 0) && gh2 === 0 && gh.noBleed >= 4, 'bansheen och eldelementalen: inget rött blod, inget kött, inga pölar ' + JSON.stringify({ gh, gh2 }));
ok(gh.out['Ä'].red > 0 && gh.out['Ä'].gib > 0, 'kultisten bredvid blöder och sprängs som förut ' + JSON.stringify(gh.out['Ä']));
// 8) kostnad: v27Tick med 40 sårade fiender och 40 lik (4× strypning)
await scene({ W: 30, H: 20, p: [3, 3], en: [] }); await gwait(0.3);
const cdp = await pg.context().newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const tb = await ev(() => { const g = __game; const empty = g.v27b.tickBench(300); for (let i = 0; i < 80; i++) { const e = g.spawnEnemy('Ä', 4.5 + (i % 10), 4.5 + Math.floor(i / 10)); e.d = { ...e.d, speed: 0, dmg: 0 }; if (i < 40) e.hp = e.maxHp * 0.3; else g.hurtEnemy(e, e.hp + 0.5, e.x, e.y); }
  g.v27b.st.woundT = 0; const t0 = performance.now(); for (let i = 0; i < 300; i++) { g.v27b.st.woundT = 0; g.v27b.st.capT = 0; g.v27b.tickBench(1); } return { empty: +empty.toFixed(4), full: +((performance.now() - t0) / 300).toFixed(4) }; });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
console.log('TICK', JSON.stringify(tb));
ok(tb.full < 0.3, `v27Tick med 40 sårade och 40 lik, sår- och liktaket varje anrop (4× strypning): ${tb.full} ms (tom bana ${tb.empty} ms)`);
await ev(() => clearInterval(window.__hold));
await done();
