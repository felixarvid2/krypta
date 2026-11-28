// t103: VAPEN – förstapersonsvapnens animationer (Grafik: vapenanimationer).
// Omladdning per vapentyp (vridning + sänkning), perfekt omladdning (snärt), byte (lutning), landningsfjäder, hylsor och mynningsrök i skärmen,
// hagelpumpen och dubbelbössans brytning kastar röda hylsor, varm pipa efter långa skurar, svepspår för yxan, lowfx stänger av partiklarna,
// taket på antal partiklar håller, och kostnaden per bildruta (drawWeapon med/utan effekter) mäts. Inga sidfel eller fel i bildrutorna.
import { setup } from './head.mjs';
const PORT = 9733;
const { pg, ev, wait, ok, start, done } = await setup(PORT, 'out/t103');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) cerr.push(m.text().slice(0, 140)); });
await start('&seed=t103');
await ev(() => { __game.settings.autoLowFx = false; }); // flera tester körs samtidigt: låt inte låg FPS slå på lowfx mitt i
await ev(() => { for (const e of __game.ents()) e.dead = true; const P = __game.P; P.iframe = 9999; P.hp = 999; for (const id of ['pistol', 'shotgun', 'rifle', 'nailgun', 'axe', 'dbshotgun']) P.has[__game.WEAPONS.findIndex(w => w.id === id)] = true; Object.assign(P.ammo, { p9: 200, shells: 50, r556: 150, nails: 300 }); });
await wait(300);
ok(await ev(() => __game.state()) === 'play', 'spelet är igång');
ok(await ev(() => !!(__game.wfx && __game.wfx.state && __game.wfx.bench)), 'kroken __game.wfx finns');
const S = () => ev(() => __game.wfx.state());
const setW = async id => { await ev(id => { const P = __game.P, WS = __game.WS, i = __game.WEAPONS.findIndex(w => w.id === id); P.weapon = i; P.mags[i] = __game.WEAPONS[i].mag; WS.state = 'idle'; WS.t = 0; WS.shot = 99; WS.cd = 0; }, id); await wait(200); };
// pistolen: hylsa och rök i skärmen
await setW('pistol'); let s0 = await S();
await ev(() => __game.fire()); await wait(80); let s1 = await S();
ok(s1.n.shells > s0.n.shells && s1.shells > 0, `pistolen kastar en hylsa i skärmen (${s1.shells})`);
ok(s1.n.smoke > s0.n.smoke && s1.smoke > 0, `mynningsrök i skärmen (${s1.smoke})`);
await wait(1500); s1 = await S();
ok(s1.shells === 0 && s1.smoke === 0, `hylsor och rök försvinner (${s1.shells}/${s1.smoke})`);
// geväret: omladdning sänker och vrider vapnet, ryck när det är klart
await setW('rifle'); await ev(() => { __game.P.mags[__game.P.weapon] = 3; }); s0 = await S();
await ev(() => __game.startReload()); let maxRot = 0, maxDy = 0;
for (let i = 0; i < 10; i++) { await wait(80); const p = await ev(() => __game.wfx.pose()); maxRot = Math.max(maxRot, Math.abs(p.rot)); maxDy = Math.max(maxDy, p.dy); }
ok(maxRot > 0.15 && maxDy > 20, `omladdningen vrider (${maxRot.toFixed(2)} rad) och sänker (${maxDy.toFixed(0)} px) geväret`);
await ev(() => new Promise(r => { const t = setInterval(() => { if (__game.WS.state === 'idle') { clearInterval(t); r(); } }, 30); setTimeout(r, 3000); })); await wait(100);
s1 = await S(); ok(s1.n.reloads > s0.n.reloads, 'omladdningen avslutas med ett ryck (räknas)');
// perfekt omladdning: snärt (och guldglimt om blixtar är tillåtna)
await ev(() => { __game.P.mags[__game.P.weapon] = 3; __game.WS.state = 'idle'; }); s0 = await S();
await ev(() => { __game.startReload(); const wp = __game.WEAPONS[__game.P.weapon]; __game.WS.t = wp.reload * 0.37; }); // mitt i det ljusa fältet (reloadMul kan vara 1)
await pg.keyboard.press('KeyR'); await wait(60); s1 = await S();
ok(s1.n.perfect > s0.n.perfect && s1.flick > 0, `perfekt omladdning ger en snärt (${s1.n.perfect - s0.n.perfect}, flick ${s1.flick.toFixed(2)})`);
// byte: det nya vapnet kommer upp lutat
await setW('rifle'); await ev(() => __game.switchWeapon(__game.WEAPONS.findIndex(w => w.id === 'pistol'))); let swRot = 0;
for (let i = 0; i < 8; i++) { await wait(30); swRot = Math.max(swRot, Math.abs(await ev(() => __game.wfx.pose().rot))); }
ok(swRot > 0.08, `vapenbytet lutar vapnet (${swRot.toFixed(2)})`);
await wait(300);
// landning: fjädrande dipp
s0 = await S(); await ev(() => { const P = __game.P; P.jz = 0.5; P.jv = -4; }); let maxLy = 0;
for (let i = 0; i < 12; i++) { await wait(25); maxLy = Math.max(maxLy, (await S()).ly); }
s1 = await S(); ok(s1.n.lands > s0.n.lands && maxLy > 2, `landningen ger en dipp (${maxLy.toFixed(1)} px)`);
// snabbt byte efter ett pistolskott: hagelgeväret pumpar inte och kastar ingen hylsa utan att ha skjutit
await setW('pistol'); await ev(() => __game.fire()); await wait(30); s0 = await S(); await ev(() => { const P = __game.P, WS = __game.WS, i = __game.WEAPONS.findIndex(w => w.id === 'shotgun'); P.weapon = i; WS.state = 'idle'; }); await wait(700); s1 = await S();
ok(s1.n.shells === s0.n.shells, `inget spökpump efter byte (${s1.n.shells - s0.n.shells} hylsor)`);
// hagelgeväret: röd hylsa när pumpen går (efter ~0.42 s)
await setW('shotgun'); s0 = await S(); await ev(() => __game.fire()); await wait(150); s1 = await S();
ok(s1.n.shells === s0.n.shells, 'hagelhylsan kommer inte direkt vid skottet');
await wait(500); s1 = await S(); ok(s1.n.shells > s0.n.shells, 'hagelhylsan kastas ut när pumpen går');
// dubbelbössan: två hylsor när pipan bryts
await setW('dbshotgun'); await ev(() => { __game.P.mags[__game.P.weapon] = 0; }); s0 = await S(); await ev(() => __game.startReload()); await wait(900); s1 = await S();
ok(s1.n.shells - s0.n.shells >= 2, `dubbelbössans brytning kastar två hylsor (${s1.n.shells - s0.n.shells})`);
await wait(900);
// spikgeväret: varm pipa efter en lång skur
await setW('nailgun'); await ev(() => __game.setMouse(true)); await wait(2400); const hot = (await S()).heat; await ev(() => __game.setMouse(false));
ok(hot > 0.4, `pipan blir varm efter en lång skur (${hot.toFixed(2)})`);
await wait(2500); ok((await S()).heat < hot, 'och svalnar igen');
// yxan: svepspår
await setW('axe'); s0 = await S(); await ev(() => __game.fire()); let tr = 0; for (let i = 0; i < 10; i++) { await wait(30); tr = Math.max(tr, (await S()).trail); }
s1 = await S(); ok(s1.n.trail - s0.n.trail >= 3 && tr >= 2, `yxan drar ett svepspår (${s1.n.trail - s0.n.trail} punkter)`);
await wait(500);
// taket håller
const caps = await ev(() => { __game.wfx.fill(); __game.wfx.fill(); return { s: __game.wfx.state(), c: __game.wfx.caps() }; });
ok(caps.s.shells <= caps.c.shells && caps.s.smoke <= caps.c.smoke, `taket på hylsor/rök håller (${caps.s.shells}/${caps.c.shells}, ${caps.s.smoke}/${caps.c.smoke})`);
// kostnad per bildruta: drawWeapon med fyllda effekter mot avstängda
await setW('nailgun'); await ev(() => __game.setMouse(true)); await wait(300); await ev(() => __game.setMouse(false));
const bench = await ev(() => { const g = __game.wfx; g.setOff(true); g.bench(60); const a = g.bench(300); g.setOff(false); g.fill(); g.bench(60); const b = g.bench(300); return { off: a, on: b }; });
console.log(`     drawWeapon (snitt av 300): utan effekterna ${bench.off.mean.toFixed(3)} ms, med fyllda effekter ${bench.on.mean.toFixed(3)} ms (p90 ${bench.on.p90.toFixed(2)})`);
ok(bench.on.mean < 1.5, 'vapenanimationerna kostar lite per bildruta');
await wait(1600);
// lowfx: inga hylsor, rök, spår eller glöd – rörelserna finns kvar
await ev(() => { __game.settings.lowfx = true; }); await setW('pistol'); s0 = await S();
await ev(() => __game.fire()); await wait(100); s1 = await S();
ok(s1.shells === 0 && s1.smoke === 0 && s1.n.shells === s0.n.shells, 'lowfx: inga hylsor eller rök i skärmen');
await setW('axe'); s0 = await S(); await ev(() => __game.fire()); await wait(250); s1 = await S();
ok(s1.n.trail === s0.n.trail, 'lowfx: inget svepspår');
await setW('rifle'); await ev(() => { __game.P.mags[__game.P.weapon] = 3; __game.startReload(); }); await wait(400);
ok(Math.abs(await ev(() => __game.wfx.pose().rot)) > 0.1, 'lowfx: omladdningsrörelsen finns kvar');
await ev(() => { __game.settings.lowfx = false; });
await ev(() => new Promise(r => { const t = setInterval(() => { if (__game.WS.state === 'idle') { clearInterval(t); r(); } }, 30); setTimeout(r, 3000); }));
// tillgänglighet: reduceMotion dämpar vridningen, noFlash tar bort guldglimten
const relRot = async () => { await setW('rifle'); await ev(() => { __game.P.mags[__game.P.weapon] = 3; __game.startReload(); __game.WS.t = __game.WEAPONS[__game.P.weapon].reload * 0.2; }); await wait(120); const r = Math.abs(await ev(() => __game.wfx.pose().rot)); await ev(() => new Promise(r => { const t = setInterval(() => { if (__game.WS.state === 'idle') { clearInterval(t); r(); } }, 30); setTimeout(r, 3000); })); return r; };
const rNorm = await relRot(); await ev(() => { __game.settings.reduceMotion = true; }); const rCalm = await relRot(); await ev(() => { __game.settings.reduceMotion = false; });
ok(rCalm < rNorm * 0.6, `reduceMotion dämpar vridningen (${rNorm.toFixed(2)} → ${rCalm.toFixed(2)})`);
await ev(() => { __game.settings.noFlash = true; __game.P.mags[__game.P.weapon] = 3; __game.startReload(); __game.WS.t = __game.WEAPONS[__game.P.weapon].reload * 0.37; });
await pg.keyboard.press('KeyR'); await wait(40); const nf = await S(); await ev(() => { __game.settings.noFlash = false; });
ok(nf.flick > 0 && nf.glint === 0, `noFlash: snärten finns men ingen guldglimt (glimt ${nf.glint})`);
// omgång 3: viloliv – magiska vapen glöder med svävande korn, motorvapen vibrerar, legendariska glimtar; av med lowfx och reduceMotion
const I = () => ev(() => __game.wfx.idle());
await ev(() => new Promise(r => { const t = setInterval(() => { if (__game.WS.state === 'idle') { clearInterval(t); r(); } }, 30); setTimeout(r, 3000); }));
const idleW = async id => { await ev(id => { const P = __game.P, WS = __game.WS, i = __game.WEAPONS.findIndex(w => w.id === id); P.has[i] = true; P.weapon = i; WS.state = 'idle'; WS.shot = 99; }, id); await wait(1500); };
await idleW('staff'); let iv = await I(); ok(iv.on && iv.motes > 0, `staven glöder i vila med svävande korn (${iv.motes})`);
await ev(() => { __game.settings.lowfx = true; }); await wait(200); iv = await I(); ok(iv.motes === 0 && !iv.on, 'lowfx: inget viloliv'); await ev(() => { __game.settings.lowfx = false; });
await ev(() => { __game.settings.reduceMotion = true; }); await wait(200); iv = await I(); ok(iv.motes === 0 && !iv.on, 'reduceMotion: inget viloliv'); await ev(() => { __game.settings.reduceMotion = false; });
await idleW('sawlauncher'); const vib = []; for (let i = 0; i < 6; i++) { await wait(37); vib.push(await ev(() => __game.wfx.pose().dx)); }
ok(Math.max(...vib) - Math.min(...vib) > 0.3, `sågbladskastaren vibrerar i vila (dx ${Math.min(...vib).toFixed(2)}…${Math.max(...vib).toFixed(2)})`);
const legOk = await ev(() => { const L = __game.LEGENDS; const id = Object.keys(L).find(k => __game.WEAPONS.some(w => w.id === L[k].base)); if (!id) return false; __game.giveLegend(id, 'TEST'); const P = __game.P, i = __game.WEAPONS.findIndex(w => w.id === L[id].base); P.weapon = i; __game.WS.state = 'idle'; __game.WS.shot = 99; return true; });
if (legOk) { const g0 = (await I()).glints; await wait(4200); ok((await I()).glints > g0, 'legendariska vapen glimtar i guld då och då'); }
ok(await ev(() => __game.state()) === 'play', 'spelet är fortfarande igång');
ok(cerr.length === 0, 'inga fel i bildrutorna ' + cerr.slice(0, 3).join(' | '));
await done();
