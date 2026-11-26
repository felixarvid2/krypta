// Version 27: FX – mynningsflammor per vapentyp, nedslag efter material, rikare explosioner, miljöeffekter och bossens fasbyte/död.
// Allt genom spelets riktiga vägar (fire, wpImpact, explode, updateWeather, bossens faser), lowfx stänger av allt nytt, noFlash dämpar,
// taken håller (högst 10 effektsprites, partikellistan 260), render-kostnaden mäts med 4× CPU-strypning med och utan, inga sidfel.
// All väntan räknas i speltid (__game.roles.t()). FX27_SHOTS=<katalog> sparar före/efter-bilder och mynningsflammorna för montaget.
import fs from 'fs';
import { setup } from './head.mjs';
const PORT = 9840;
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t140');
const cerrs = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|404/.test(m.text())) cerrs.push(m.text().slice(0, 200)); });
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(60); } };
const gwait = sec => until(null, sec);
const SHOTS = process.env.FX27_SHOTS;
const boot = async () => { await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 }); };
const room = (biome = 'dungeon', extra = {}) => ev(([biome, extra]) => {
  const g = __game; g.profile.tutDone = true; const W = 30, H = 20, grid = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[10][8] = 'P'; grid[2][27] = 'x';
  for (const [k, cs] of Object.entries(extra)) for (const [x, y] of cs) grid[y][x] = k;
  g.playCustom({ grid, biome });
}, [biome, extra]);
const place = (x = 8.5, y = 10.5, a = 0) => ev(([x, y, a]) => { const g = __game, P = g.P; P.x = x; P.y = y; P.a = a; P.vx = P.vy = 0; P.hp = 999; P.iframe = 99; g.settings.lowfx = false; g.settings.autoLowFx = false; g.settings.noFlash = false; g.settings.reduceMotion = false; }, [x, y, a]);
const clear = () => ev(() => { const g = __game; g.particles().length = 0; for (const e of g.ents()) if (!e.dead && !e.boss) { e.hp = 0; e.dead = true; } });
const st = () => ev(() => __game.fx27.state());
const ready = async (biome, extra) => { await room(biome, extra); await until(() => __game.state() === 'play' && !!__game.fx27, 5); await place(); await until(() => __game.banner() <= 0, 4); await place(); await gwait(0.2); };
await boot();
ok(await ev(() => __game.efx.state().loaded.boom), 'spelet laddar');
await ready();
let s = await st();
ok(!!s && s.loaded.ring && s.loaded.burst && s.on, 'version 27 är på och de två nya Effekseer-stripparna laddas ' + JSON.stringify(s && s.loaded));

// 1) mynningsflammor: varje vapen med en typ skjuter genom spelets fire() och ritar sin flamma i stället för den gamla
const types = await ev(() => __game.fx27.types());
const fireWith = id => ev(id => { const g = __game, P = g.P, WS = g.WS, i = g.WEAPONS.findIndex(w => w.id === id); if (i < 0) return false; const wp = g.WEAPONS[i];
  P.has[i] = true; P.weapon = i; P.mags[i] = wp.mag; if (wp.ammo && P.ammo) P.ammo[wp.ammo] = 99; WS.state = 'idle'; WS.t = 0; WS.cd = 0; WS.shot = 99; g.fire(); return true; }, id);
const muzRes = {}, missing = [];
for (const [id, t] of Object.entries(types)) {
  await clear(); const n0 = (await st()).n.muzzle[t];
  await fireWith(id); await gwait(0.12);
  const d = (await st()).n.muzzle[t] - n0; muzRes[id] = d; if (d < 1) missing.push(id);
}
await clear();
const byType = {}; for (const [id, t] of Object.entries(types)) byType[t] = (byType[t] || 0) + (muzRes[id] > 0 ? 1 : 0);
ok(['shot', 'rifle', 'smg', 'magic', 'heavy'].every(t => byType[t] > 0), 'mynningsflammor för hagel, gevär, kpist, magi och tunga vapen ' + JSON.stringify(byType));
ok(missing.length <= 3, 'nästan alla vapen med en typ ritar sin flamma (egna vägar utan flamma: ' + (missing.join(', ') || 'inga') + ')');
const keys = (await st()).muzKeys;
ok(keys.length >= 5 && keys.some(k => k.startsWith('magic')), 'flammorna ritas i kod vid första användningen, magin i vapnets färg ' + keys.length);
ok(await ev(() => { const a = __game.fx27.muzzle('shotgun'), b = __game.fx27.muzzle('shotgun'); return a.length === 3 && a.every((u, i) => u === b[i]) && a[0] !== a[1]; }), 'tre olika bildrutor per typ, samma varje gång (fast slump)');

// 1b) kpisten med avtryckaren nedtryckt: en ny flamma (bildruta och vridning) för varje skott, fast skotten kommer tätare än ritningarna glesnar
await clear(); await ev(() => { const g = __game, P = g.P, WS = g.WS, i = g.WEAPONS.findIndex(w => w.id === 'smg'); P.has[i] = true; P.weapon = i; P.mags[i] = 32; P.ammo.p9 = 99; WS.state = 'idle'; WS.cd = 0; });
await gwait(0.3); const m0 = (await st()).n.muzzle.smg;
const shots0 = await ev(() => __game.P.mags[__game.P.weapon]);
await pg.mouse.move(480, 300); await pg.mouse.down(); await gwait(0.8); await pg.mouse.up(); await gwait(0.1);
const fired = shots0 - await ev(() => __game.P.mags[__game.P.weapon]), mz = (await st()).n.muzzle.smg - m0;
ok(fired >= 5 && mz >= fired - 2, `kpisten nedtryckt: en ny flamma per skott (${mz} flammor, ${fired} skott)`);
await ev(() => { __game.P.mags[__game.P.weapon] = 32; });

// 2) nedslag efter material, högst 3 förstärkta per bildruta
const imp = async mat => { await clear(); const n0 = (await st()).n; await ev(m => __game.wproj.impact(m), mat); return { n0, n1: (await st()).n }; };
await place(8.5, 10.5, Math.PI); // vänd mot väggen x = 1 (sju rutor bort)
for (const m of ['metal', 'wood', 'stone']) { const r = await imp(m); ok(r.n1.impact[m] === r.n0.impact[m] + 1, `nedslag i ${m} förstärks`); }
await clear(); await gwait(0.05); let n0 = (await st()).n;
await ev(() => { for (let i = 0; i < 10; i++) __game.wproj.impact('metal'); });
s = await st(); ok(s.n.impact.metal - n0.impact.metal === 3 && s.n.skip - n0.skip >= 7, 'högst 3 förstärkta nedslag per bildruta (hagel, spikgeväret) ' + (s.n.impact.metal - n0.impact.metal));
await gwait(0.25);
ok(await ev(() => __game.particles().some(p => p.add && p.tint && p.tint[0] > 150 && p.tint[2] < 120 && p.grav)), 'metallgnistorna svalnar mot rött medan de studsar');
if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); }

// 3) explosion: chockvåg på marken som växer, dammvåg, skräp som ryker, glöd som falnar, kvardröjande rök
await place(); await clear(); n0 = (await st()).n;
await ev(() => __game.fx27.boom(12.5, 10.5, 2)); await gwait(0.05);
s = await st(); const ring0 = await ev(() => { const p = __game.particles().find(q => q.efx === 'ring'); return p ? p.size : -1; });
ok(s.n.boom === n0.boom + 1 && s.n.ring === n0.ring + 1 && ring0 > 0, 'explosionen får en chockvåg på marken (Effekseer-ringen) ' + ring0);
ok(s.n.debris - n0.debris >= 4 && s.n.embers - n0.embers >= 6 && s.trail >= 1, 'skräp som studsar och ryker, glöd som kastas ut ' + JSON.stringify({ d: s.n.debris - n0.debris, e: s.n.embers - n0.embers, trail: s.trail }));
await gwait(0.3);
const ring1 = await ev(() => { const p = __game.particles().find(q => q.efx === 'ring'); return p ? p.size : -1; });
ok(ring1 > ring0 * 2, `chockvågen växer (${ring0.toFixed(2)} -> ${ring1.toFixed(2)})`);
await gwait(0.5); s = await st();
ok(s.n.smoke - n0.smoke >= 2, 'röken kommer efter smällen och dröjer kvar ' + (s.n.smoke - n0.smoke));
await gwait(1.6);
const cool = await ev(() => __game.particles().filter(p => p.c27 === 'ember' && p.z <= 0.001 && p.life > 0 && p.maxLife > 2.5).map(p => p.tint));
ok(cool.length >= 2 && cool.filter(t => t[1] < 150).length >= cool.length * 0.7 && cool.every(t => t[1] < 230), 'glöden ligger kvar på golvet och har falnat mot rött ' + JSON.stringify(cool.slice(0, 2).map(t => t.map(Math.round))));
ok(await ev(() => __game.particles().some(p => !p.add && p.size >= 0.45 && p.life > 1.5)), 'röken finns kvar efter två sekunder');
await shot('boom');

// 4) vatten och lava: explosion och lågt nedslag
await ready('dungeon', { '-': [[12, 10], [13, 10], [12, 11], [13, 11]], '_': [[12, 14], [13, 14]] });
n0 = (await st()).n;
await ev(() => { __game.fx27.boom(12.5, 10.5, 2); __game.fx27.impact(13.5, 11.5, 0.2, '#', 1, 0); }); await gwait(0.06);
s = await st(); ok(s.n.splash - n0.splash >= 2, 'explosion och lågt skott i vatten stänker ' + (s.n.splash - n0.splash));
await gwait(0.15); await ev(() => __game.fx27.boom(12.5, 14.5, 1.5)); await gwait(0.06); s = await st();
ok(s.n.sizzle > n0.sizzle, 'explosion i lava sprutar lavastänk och ånga');
await clear(); await gwait(0.2); n0 = (await st()).n;
await ev(() => { const e = __game.spawnEnemy('S', 12.5, 11.5); e.hp = e.maxHp = 9999; e.mvx = 0.03; e.mvy = 0; __game.particles().length = 0; __game.fx27.env(0.3); });
s = await st(); ok(s.n.wade === n0.wade + 1, 'en fiende som vadar i vattnet stänker');
await shot('water');

// 5) miljö: snö under fötterna, fräsande lava, sågklingor, brinnande mark, kistor och magiska föremål
await ready('frost'); n0 = (await st()).n;
await pg.keyboard.down('w'); await gwait(1.5); await pg.keyboard.up('w'); await gwait(0.1);
s = await st(); const walked = await ev(() => __game.P.x - 8.5);
ok(s.n.snow - n0.snow >= 2 && walked > 2, `fotsteg i snö (spelaren går med W): snön yrer (${s.n.snow - n0.snow} steg på ${walked.toFixed(1)} rutor)`);
await ready('dungeon', { '_': [[8, 10]], C: [[11, 12]] });
n0 = (await st()).n;
await ev(() => { __game.fx27.step(2); });
s = await st(); ok(s.n.lava > n0.lava && s.n.sizzle > n0.sizzle, 'steg på lava fräser');
await ev(() => { const g = __game; g.sawsRef().push({ x0: 11.5, y0: 8.5, x1: 15.5, y1: 8.5, k: 0, dir: 1, x: 12.5, y: 8.5 }); g.dropItem('rune', 10.5, 11.5); g.efx2.flask(12.5, 13.5, 'fire'); });
await gwait(1.5); s = await st();
ok(s.n.saw > n0.saw && s.n.fire > n0.fire && s.n.glint > n0.glint, 'gnistor från sågklingan, glöd från brinnande mark och glimmer från kistan och runan ' + JSON.stringify({ saw: s.n.saw - n0.saw, fire: s.n.fire - n0.fire, glint: s.n.glint - n0.glint }));
await shot('env');
await ev(() => { __game.sawsRef().length = 0; });

// 6) boss: fasbyte (Effekseer-smällen, glöd, skärmens chockvåg) och döden (smällar, ljuspelare, guldgnistor, blixt)
await ready('dungeon', { B: [[14, 10]] });
const hasBoss = await ev(() => { const b = __game.boss(); if (!b) return false; b.alert = true; b.asleep = false; b.stun = 99; b.cd = 99; return true; });
ok(hasBoss, 'en boss finns i salen');
n0 = (await st()).n;
await ev(() => { const b = __game.boss(); b.hp = b.maxHp * 0.6; }); await until(() => __game.fx27.state().n.phase > 0, 1.5);
s = await st();
ok(s.n.phase === n0.phase + 1 && s.n.hud > n0.hud && await ev(() => __game.efx.state().n.burst > 0), 'fasbytet ger Effekseer-smällen och chockvågen på skärmen ' + JSON.stringify({ phase: s.n.phase - n0.phase, hud: s.hud }));
ok(await ev(() => __game.particles().some(p => p.efx === 'burst')), 'smällen syns som effektsprite vid bossen');
await gwait(0.15); await shot('phase');
await gwait(1.0); n0 = (await st()).n;
await ev(() => { const b = __game.boss(); b.stun = 0; __game.hurtEnemy(b, 1e6, b.x, b.y, { noProc: true }); });
await until(() => __game.fx27.state().n.final > 0, 5);
s = await st();
ok(s.n.death === n0.death + 1 && s.n.deathBooms - n0.deathBooms >= 2 && s.n.final === n0.final + 1, 'bossens död: smällar under dödsanimationen och en slutsmäll ' + JSON.stringify({ death: s.n.death - n0.death, booms: s.n.deathBooms - n0.deathBooms, final: s.n.final - n0.final }));
ok(await ev(() => __game.particles().some(p => p.efx === 'tele' && p.size > 2)), 'ljuspelaren (själen) stiger där bossen dog');
await shot('final');
await gwait(2);

// 7) noFlash: skärmeffekterna dämpas, effektsprites tonas
await ready(); await ev(() => { __game.settings.noFlash = true; const P = __game.P; __game.fx27.final({ x: P.x + 4, y: P.y, d: { size: 1 } }); });
ok(await ev(() => { const p = __game.particles().find(q => q.efx === 'burst'); return !!p && p.fade === true && Math.max(...p.tint) <= 160; }), 'noFlash: bossens smäll tonas och dämpas');
await ev(() => { __game.settings.noFlash = false; });

// 8) lowfx: inget nytt alls
await ready(); await gwait(0.3); await clear(); s = await st();
await ev(() => { const g = __game, P = g.P; g.settings.lowfx = true; g.fx27.boom(12.5, 10.5, 2); g.wproj.impact('metal'); g.fx27.step(2); g.fx27.env(0.5); g.fx27.phase({ x: P.x + 4, y: P.y, d: { size: 1 } }); });
const before = s.n; s = await st();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
ok(same(before.muzzle, s.n.muzzle) && same(before.impact, s.n.impact) && ['boom', 'ring', 'debris', 'embers', 'snow', 'saw', 'glint'].every(k => before[k] === s.n[k]), 'lowfx: inga nya explosionsdelar, nedslag eller miljöeffekter ' + JSON.stringify(Object.keys(s.n).filter(k => typeof s.n[k] === 'number' && s.n[k] !== before[k])));
await ev(() => { __game.settings.lowfx = false; });

// 9) taken: tjugo explosioner samtidigt
await place(); await clear();
await ev(() => { for (let i = 0; i < 20; i++) __game.fx27.boom(10 + (i % 5) * 2.5, 6 + (i / 5 | 0) * 2.5, 2); });
await gwait(0.1);
const caps = await ev(() => ({ efx: __game.particles().filter(p => p.efx).length, parts: __game.particles().length }));
ok(caps.efx <= 10 && caps.parts <= 260, 'tjugo explosioner: högst 10 effektsprites och högst 260 partiklar ' + JSON.stringify(caps));
await gwait(1);
// 9b) kedjor: det nya tränger inte undan kärnan i smällen (VAPENs ring och skräp, version 25:s eldklot) – sex smällar i följd, av och på
const chain = off => ev(off => { const g = __game; g.fx27.setOff(off); g.particles().length = 0; const w0 = g.wproj.state().n, b0 = g.efx.state().n.boom;
  for (let i = 0; i < 6; i++) g.fx27.boom(11 + (i % 3) * 2.2, 8.5 + (i / 3 | 0) * 3, 2);
  const w1 = g.wproj.state().n; g.fx27.setOff(false); return { core: (w1.ring - w0.ring) + (w1.debris - w0.debris), boom: g.efx.state().n.boom - b0, parts: g.particles().length }; }, off);
const cOff = await chain(true); await gwait(1.5); const cOn = await chain(false); await gwait(0.1); cOn.later = await ev(() => __game.particles().length); await gwait(1.5);
ok(cOn.core >= cOff.core && cOn.boom >= cOff.boom, 'sex smällar i följd: lika mycket kärna med version 27 som utan ' + JSON.stringify({ off: cOff, on: cOn }));
// 9c) nära kameran: ingen dammring, ingen dammvåg genom kameran och inga stora effektsprites som fyller bilden
await clear(); await gwait(1.2); await clear(); n0 = (await st()).n;
await ev(() => { const g = __game, P = g.P; g.fx27.boom(P.x + 1.2, P.y, 2); g.fx27.final({ x: P.x + 1.6, y: P.y, d: { size: 1 } }); g.fx27.phase({ x: P.x - 1.3, y: P.y + 0.2, d: { size: 1.2 } }); });
await gwait(0.4); s = await st();
const near = await ev(() => { const P = __game.P; return { big: __game.particles().filter(p => ['ring', 'burst', 'tele'].includes(p.efx) && Math.hypot(p.x - P.x, p.y - P.y) < p.size * 1.4).length,
  dust: __game.particles().filter(p => !p.add && !p.efx && p.size >= 0.15 && Math.hypot(p.x - P.x, p.y - P.y) < 0.5).length }; });
await gwait(0.6); const s9 = await st();
ok(s.n.ring === n0.ring && s9.n.smoke === n0.smoke && near.big === 0 && near.dust === 0, 'nära kameran: ingen ring, ingen kvardröjande rök, ingen dammvåg i kameran och inga stora effektsprites ' + JSON.stringify({ ...near, ring: s.n.ring - n0.ring, smoke: s9.n.smoke - n0.smoke }));
await gwait(1);

// 10) render-kostnad med 4× CPU-strypning: tre explosioner, nedslag och en boss som byter fas, med och utan version 27
const cdp = await pg.context().newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await place(8.5, 10.5, 0);
const bs = { on: [], off: [] };
for (let i = 0; i < 9; i++) for (const off of [true, false]) {
  await ev(off => { const g = __game; g.resume(); g.fx27.setOff(off); g.particles().length = 0;
    g.fx27.boom(12.5, 10.5, 2); g.fx27.boom(14, 8.5, 1.5); g.fx27.boom(13, 12.5, 2.5); g.fx27.phase({ x: 15.5, y: 10.5, d: { size: 1.2 } }); }, off);
  await gwait(0.25);
  await ev(() => { const P = __game.P; P.a = Math.PI; for (let k = 0; k < 3; k++) __game.wproj.impact(['metal', 'stone', 'wood'][k]); P.a = 0; });
  await gwait(0.35);
  const r = await ev(() => { const g = __game; g.pause(); const live = g.particles().length, tick = g.fx27.tickMs(60), b = g.wproj.bench(45); g.resume(); return { ...b, live, tick }; });
  bs[off ? 'off' : 'on'].push(r);
}
await ev(() => { __game.fx27.setOff(false); }); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
const med = (a, k = 'med') => a.map(r => r[k]).sort((x, y) => x - y)[a.length >> 1];
const on = med(bs.on.slice(1)), offm = med(bs.off.slice(1));
console.log('BENCH', JSON.stringify({ medOn: +on.toFixed(2), medOff: +offm.toFixed(2), p90On: +med(bs.on.slice(1), 'p90').toFixed(2), p90Off: +med(bs.off.slice(1), 'p90').toFixed(2), partsOn: med(bs.on.slice(1), 'live'), partsOff: med(bs.off.slice(1), 'live'), tickOn: +med(bs.on.slice(1), 'tick').toFixed(3), muz: muzRes }));
ok(med(bs.on.slice(1), 'tick') < 0.5, `update-kostnaden för version 27 (fx27Tick, 4× strypning): ${med(bs.on.slice(1), 'tick').toFixed(3)} ms per bildruta`);
ok(on < Math.max(offm * 1.3, offm + 2.0), `render-kostnad med tre explosioner och nedslag (4× strypning): ${on.toFixed(2)} ms med, ${offm.toFixed(2)} ms utan`);

// 11) valfritt: före/efter-bilder för montaget (samma scen, version 27 av/på) och mynningsflammorna som PNG
if (SHOTS) {
  const urls = await ev(() => { const o = {}; for (const id of ['shotgun', 'rifle', 'smg', 'staff', 'launcher']) o[id] = __game.fx27.muzzle(id); return o; });
  for (const [id, a] of Object.entries(urls)) a.forEach((u, i) => fs.writeFileSync(`${SHOTS}/muz_${id}_${i}.png`, Buffer.from(u.split(',')[1], 'base64')));
  const scenes = { muzzle: 0.05, impact: 0.06, boom: 0.2, smoke: 2.2, phase: 0.25, final: 0.3, env: 0.8 };
  for (const [k, tt] of Object.entries(scenes)) for (const off of [true, false]) {
    await ready('dungeon', k === 'phase' || k === 'final' ? { B: [[13, 10]] } : k === 'env' ? { C: [[11, 11]] } : {}); if (k === 'impact') await place(2.6, 10.5, Math.PI);
    await ev(([k, off]) => { const g = __game, P = g.P; g.fx27.setOff(off); g.fx27.fixed(true); g.particles().length = 0;
      if (k === 'boom' || k === 'smoke') g.fx27.boom(12, 10.5, 2);
      if (k === 'final') { const b = g.boss(); b.stun = 99; g.hurtEnemy(b, 1e6, b.x, b.y, { noProc: true }); }
      if (k === 'env') { g.sawsRef().push({ x0: 11.5, y0: 9.5, x1: 15.5, y1: 9.5, k: 0, dir: 1, x: 12, y: 9.5 }); g.dropItem('rune', 10.8, 10.2); }
      if (k === 'impact') { for (let i = 0; i < 3; i++) g.fx27.impact(1.06, 10.5 + (i - 1) * 0.35, 0.45, ['G', '#', 'D'][i], -1, 0); }
      if (k === 'muzzle') { const i = g.WEAPONS.findIndex(w => w.id === 'shotgun'); P.has[i] = true; P.weapon = i; g.WS.state = 'idle'; window.__hold = true; const loop = () => { if (!window.__hold) return; g.WS.shot = 0.01; requestAnimationFrame(loop); }; loop(); }
      if (k === 'phase') { const b = g.boss(); b.stun = 99; b.hp = b.maxHp * 0.6; }
    }, [k, off]);
    if (k === 'final') await until(() => { const b = __game.boss(); return !b || b.dead; }, 5);
    await gwait(tt);
    await (await pg.$('#screen')).screenshot({ path: `${SHOTS}/${k}_${off ? 'fore' : 'efter'}.png` });
    await ev(() => { window.__hold = false; __game.fx27.setOff(false); __game.fx27.fixed(false); __game.sawsRef().length = 0; });
  }
}
ok(cerrs.length === 0, 'inga konsolfel ' + cerrs.join(' / '));
await done();
