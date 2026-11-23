// t107: VAPEN omgång 2 – projektiler, nedslag och explosioner (Grafik: projektiler och explosioner).
// Explosionen går i flera steg (blixt, eldklot, rökmoln) med chockvågsring, skräp och ett ljus som falnar; projektilerna lämnar spår
// (fiendeskott i sin färg, bloss som flimrar); nedslag efter väggmaterial; taket på partiklar håller; lowfx stänger av partiklarna men
// låter ljuset vara kvar; bildrutorna flyter med flera explosioner; inga sidfel eller fel i bildrutorna.
import { setup } from './head.mjs';
const PORT = 9734;
const { pg, ev, wait, ok, start, done } = await setup(PORT, 'out/t107');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) cerr.push(m.text().slice(0, 140)); });
await start('&seed=t107');
await ev(() => { __game.settings.autoLowFx = false; for (const e of __game.ents()) e.dead = true; const P = __game.P; P.iframe = 9999; P.hp = 999; });
// vänd mot den längsta fria riktningen
const D = await ev(() => { const P = __game.P; let best = 0, ba = P.a; for (let a = 0; a < 6.28; a += 0.2) { let d = 0; while (d < 12 && !__game.solid(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d)) d += 0.2; if (d > best) { best = d; ba = a; } } P.a = ba; return Math.min(4, best - 0.6); });
await wait(300);
ok(await ev(() => !!(__game.wproj && __game.wproj.state)), 'kroken __game.wproj finns');
const S = () => ev(() => __game.wproj.state());
const boom = (r = 2) => ev(([D, r]) => { const P = __game.P; __game.explode(P.x + Math.cos(P.a) * D, P.y + Math.sin(P.a) * D, 0, r); }, [D, r]);
// explosionen i flera steg
let s0 = await S(); await boom(); let s1 = await S();
ok(s1.n.booms === s0.n.booms + 1 && s1.lights > s0.lights, `explosionen tänder ett ljus (${s1.lights})`);
ok(s1.n.ring > s0.n.ring && s1.n.debris > s0.n.debris, `chockvågsring (${s1.n.ring - s0.n.ring}) och skräp (${s1.n.debris - s0.n.debris})`);
ok(s1.sched >= 2, `eldklot och rökmoln väntar på sin tur (${s1.sched} steg)`);
await wait(600); s1 = await S();
ok(s1.n.stages - s0.n.stages >= 3 && s1.sched === 0, `alla steg har körts (${s1.n.stages - s0.n.stages})`);
ok(s1.n.smoke > s0.n.smoke, `rökmolnet stiger (${s1.n.smoke - s0.n.smoke} moln)`);
await wait(1300); s1 = await S(); ok(s1.lights === 0, 'ljuset har falnat');
// fiendeskott: ljussvans i sin färg
s0 = await S();
await ev(D => { const P = __game.P, c = Math.cos(P.a), sn = Math.sin(P.a); let o = 1.2; while (o > 0.2 && __game.solid(P.x + c * D + sn * o, P.y + sn * D - c * o)) o -= 0.2; __game.projectiles().push({ x: P.x + c * D + sn * o, y: P.y + sn * D - c * o, z: 0.5, vx: -sn * 2, vy: c * 2, kind: 'orb2', dmg: 0, src: { x: P.x, y: P.y }, life: 0.8 }); }, D);
await wait(500); s1 = await S(); ok(s1.n.trail - s0.n.trail >= 5, `fiendeskottet drar en ljussvans (${s1.n.trail - s0.n.trail})`);
await wait(800); s1 = await S(); ok(s1.n.die > s0.n.die, 'fiendeskottet slocknar med gnistor');
// blosset flimrar
const give = id => ev(id => { const P = __game.P, WS = __game.WS, i = __game.WEAPONS.findIndex(w => w.id === id); P.has[i] = true; P.weapon = i; P.mags[i] = __game.WEAPONS[i].mag; Object.assign(P.ammo, { flares: 20, p9: 100, lgren: 20 }); WS.state = 'idle'; WS.shot = 99; WS.cd = 0; }, id);
await give('flaregun'); await wait(300); s0 = await S(); await ev(() => __game.fire()); await wait(150); s1 = await S();
ok(s1.n.trail > s0.n.trail, `blosset lämnar ett flimrande spår (${s1.n.trail - s0.n.trail})`);
await wait(2500);
// nedslag efter material
s0 = await S(); await ev(() => { for (const m of ['metal', 'wood', 'stone']) __game.wproj.impact(m); }); s1 = await S();
const biome = await ev(() => __game.lvl().biome), tot = k => Object.values(k.n.impacts).reduce((a, b) => a + b, 0);
ok(s1.n.impacts.metal > s0.n.impacts.metal && s1.n.impacts.wood > s0.n.impacts.wood && tot(s1) - tot(s0) === 3, `nedslag i metall och trä ger var sin effekt; vanlig vägg i ${biome} räknas som ${Object.keys(s1.n.impacts).filter(k => s1.n.impacts[k] - s0.n.impacts[k] > (k === 'metal' || k === 'wood' ? 1 : 0)).join(',') || 'sten'}`);
await give('pistol'); await ev(() => { const P = __game.P; let best = 99, ba = P.a; for (let a = 0; a < 6.28; a += 0.1) { let d = 0; while (d < 12 && !__game.solid(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d)) d += 0.1; if (d > 1.2 && d < best) { best = d; ba = a; } } P.a = ba; }); await wait(300);
s0 = await S(); await ev(() => __game.fire()); await wait(50); s1 = await S();
const imp = k => Object.values(k.n.impacts).reduce((a, b) => a + b, 0);
ok(imp(s1) > imp(s0), 'ett pistolskott mot väggen ger ett nedslag');
await ev(() => { const P = __game.P, i = __game.WEAPONS.findIndex(w => w.id === 'nailgun'); P.has[i] = true; P.weapon = i; P.mags[i] = 50; P.ammo.nails = 200; __game.WS.state = 'idle'; __game.WS.cd = 0; }); await wait(250);
s0 = await S(); await ev(() => __game.setMouse(true)); await wait(700); await ev(() => __game.setMouse(false)); await wait(200); s1 = await S();
ok(imp(s1) > imp(s0), `spikar som slår i väggen ger nedslag (${imp(s1) - imp(s0)})`);
// taket: sex explosioner på en gång
await ev(D => { const P = __game.P; for (let i = 0; i < 6; i++) __game.explode(P.x + Math.cos(P.a) * D * 0.8 + (i % 3) * 0.2, P.y + Math.sin(P.a) * D * 0.8, 0, 2.2, false, i === 0); }, D);
let maxParts = 0; for (let i = 0; i < 8; i++) { await wait(60); maxParts = Math.max(maxParts, (await S()).parts); }
ok(maxParts <= 260, `taket på partiklar håller (${maxParts} ≤ 260)`);
// bildrutorna flyter med explosioner (rAF-intervall, grovt)
const fr = await ev(D => new Promise(res => { const P = __game.P; const ts = []; let last = performance.now(), n = 0; const f = t => { ts.push(t - last); last = t; if (++n % 20 === 1) __game.explode(P.x + Math.cos(P.a) * D, P.y + Math.sin(P.a) * D, 0, 2); if (ts.length < 120) requestAnimationFrame(f); else { ts.sort((a, b) => a - b); res({ med: ts[60], p90: ts[108] }); } }; requestAnimationFrame(f); }), D);
console.log(`     bildruta med en explosion var 20:e ruta: median ${fr.med.toFixed(1)} ms, p90 ${fr.p90.toFixed(1)} ms`);
ok(fr.med < 40, 'bildrutorna flyter med explosioner');
await wait(3500);
// noFlash: metallnedslag tänder inget blixtljus
await ev(() => { __game.settings.noFlash = true; }); s0 = await S(); await ev(() => __game.wproj.impact('metal')); s1 = await S(); await ev(() => { __game.settings.noFlash = false; });
ok(s1.n.impacts.metal > s0.n.impacts.metal && s1.lights === s0.lights, `noFlash: nedslaget syns men tänder inget blixtljus (${s0.lights} → ${s1.lights})`);
// kedjeexplosioner staplar inte ljus
s0 = await S(); await ev(D => { const P = __game.P; for (let i = 0; i < 4; i++) __game.explode(P.x + Math.cos(P.a) * D + i * 0.1, P.y + Math.sin(P.a) * D, 0, 2); }, D); s1 = await S();
ok(s1.lights - s0.lights <= 1, `fyra explosioner på samma ställe ger ett ljus (${s1.lights - s0.lights})`);
await wait(2500);
// kostnad i en strid: 20 fiendeskott på väg mot spelaren, mätt direkt (projektiler + partiklar + ljus + bild)
const shots = () => ev(D => { const P = __game.P, c = Math.cos(P.a), sn = Math.sin(P.a); for (let i = 0; i < 20; i++) { const d = 1.5 + (i % 10) * D / 10, o = (i < 10 ? 0.3 : -0.3); if (__game.solid(P.x + c * d + sn * o, P.y + sn * d - c * o)) continue; __game.projectiles().push({ x: P.x + c * d + sn * o, y: P.y + sn * d - c * o, z: 0.5, vx: -c * 0.3, vy: -sn * 0.3, kind: ['orb2', 'bolt', 'ice', 'blue'][i % 4], dmg: 0, src: { x: P.x, y: P.y }, life: 3 }); } }, D);
await shots(); await wait(400); const bOn = await ev(() => __game.wproj.bench(120));
await wait(3000); await ev(() => { __game.wproj.setOff(true); }); await shots(); await wait(400); const bOff = await ev(() => __game.wproj.bench(120)); await ev(() => { __game.wproj.setOff(false); });
console.log(`     20 fiendeskott: med effekter median ${bOn.med.toFixed(2)} ms (p90 ${bOn.p90.toFixed(2)}, ${bOn.parts} partiklar), utan blocket ${bOff.med.toFixed(2)} ms (p90 ${bOff.p90.toFixed(2)}, ${bOff.parts} partiklar)`);
ok(bOn.parts <= 260 && bOn.med < bOff.med * 1.35 + 0.5, 'spåren kostar lite i en strid');
await wait(3000);
// lowfx: inga partiklar från explosionen eller spåren, men ljuset finns kvar
await ev(() => { __game.settings.lowfx = true; }); s0 = await S(); await boom(); s1 = await S();
ok(s1.n.ring === s0.n.ring && s1.n.debris === s0.n.debris && s1.lights > 0, 'lowfx: ingen ring eller skräp, men ljuset finns kvar');
await wait(600); s1 = await S(); ok(s1.n.smoke === s0.n.smoke, 'lowfx: inget rökmoln');
s0 = await S(); await ev(D => { const P = __game.P; __game.projectiles().push({ x: P.x + Math.cos(P.a) * D, y: P.y + Math.sin(P.a) * D, z: 0.5, vx: 0, vy: 0, kind: 'orb2', dmg: 0, src: { x: P.x, y: P.y }, life: 0.4 }); }, D); await wait(300); s1 = await S();
ok(s1.n.trail === s0.n.trail, 'lowfx: inga spår');
await ev(() => { __game.settings.lowfx = false; });
ok(await ev(() => __game.state()) === 'play', 'spelet är fortfarande igång');
ok(cerr.length === 0, 'inga fel i bildrutorna ' + cerr.slice(0, 3).join(' | '));
await done();
