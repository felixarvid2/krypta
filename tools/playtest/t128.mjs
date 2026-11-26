// t128: version 26B, jonglering. Kontroller: en smäll nära ett skelett kastar upp det (höjden stiger och faller, spriten ritas högre),
// i luften anfaller det inte (spelaren tar ingen skada fast slaget gör skada på marken – kontroll) och landningen ger 3 skada; en smäll
// längre bort än 0,6 × radien, en tung fiende (golem, storlek 1,3) och av-flaggan ger inget uppkast; i luften tar fienden +25 % skada
// och träffar håller den uppe; tio smällar i rad lyfter den inte genom taket och den anfaller igen; ett riktigt skott träffar den i
// luften; landar den i tomrummet dör den; ett dödande i luften ger +JONGLERING; hagelgeväret på 1 ruta kastar upp, på 3 rutor inte; launchEnemy
// nås av markslaget (typeof launchEnemy i game.js). Inga sidfel. Alla väntetider räknas i speltid (__game.roles.t()), inte väggtid.
import { setup } from './head.mjs';
const PORT = 9828;
const { pg, ev, wait, ok, done, shot } = await setup(PORT, 'out/t128');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
ok(await ev(() => !!__game.v26b && __game.v26b.flags.jug === true && typeof __game.v26b.launch === 'function'), '__game.v26b finns och jongleringen är på (launchEnemy nås i game.js med typeof, i testet via v26b.launch)');

const sceneFn = o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = o.lowfx !== false;
  const W = 20, H = 11, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[5][5] = 'P'; grid[1][W - 2] = 'x'; if (o.void) grid[o.void[1]][o.void[0]] = 'Ń'; g.playCustom({ grid, biome: 'dungeon' });
  const E = g.ents(); E.length = 0; const e = g.spawnEnemy(o.type || 'S', 5.5 + (o.dist || 3), 5.5);
  e.d = { ...e.d, dmg: o.dmg || 0, speed: 0 }; e.hp = e.maxHp = o.hp || 200; e.alert = true; e.lostT = 0; e.lx = g.P.x; e.ly = g.P.y;
  g.P.hp = 1e6; g.P.a = 0; clearInterval(window.__hold); window.__hpHold = true;
  window.__hold = setInterval(() => { if (window.__hpHold !== false) __game.P.hp = 1e6; __game.P.x = 5.5; __game.P.y = 5.5; __game.P.a = 0; }, 30);
  return e.d.size;
};
const scene = o => pg.evaluate(sceneFn, o || {});
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);
// följ höjden i sidan (rAF) tills fienden landat: högsta höjd, landning, hp före/efter och om spelaren skadades
const track = () => ev(() => new Promise(res => { const g = __game, e = g.ents()[0], t0 = g.v26b.t(); let mx = 0, up = false, states = new Set();
  const k = () => { const a = g.v26b.air(e); if (a.z > 0) up = true; mx = Math.max(mx, a.z); states.add(e.state);
    if ((up && a.z <= 0) || e.dead || g.v26b.t() - t0 > 4) return res({ mx: +mx.toFixed(3), up, landed: up && a.z <= 0, states: [...states], hp: e.hp, dead: !!e.dead, T: +(g.v26b.t() - t0).toFixed(2) }); requestAnimationFrame(k); }; requestAnimationFrame(k); }));

// 1) smäll 0,5 rutor bort (radie 2): uppkast, ingen AI i luften, landning ger 3 skada
await scene({ dist: 0.8, dmg: 10 }); await gwait(0.3);
await ev(() => { window.__hpHold = false; __game.P.hp = 100; __game.P.armor = 0; __game.P.iframe = 0; });
const j0 = await ev(() => ({ ...__game.v26b.jst() }));
const hp0 = await ev(() => { const g = __game, e = g.ents()[0]; g.explode(e.x - 0.5, e.y, 0, 2, false); return e.hp; });
const t1 = await track();
const j1 = await ev(() => ({ ...__game.v26b.jst() }));
const php = await ev(() => __game.P.hp);
ok(t1.up && t1.landed && t1.mx > 0.3, 'smällen kastar upp skelettet, som stiger och landar ' + JSON.stringify(t1));
ok(t1.states.length === 1 && t1.states[0] === 'pain' && php === 100, 'i luften är det bedövat och anfaller inte (spelaren oskadd) ' + JSON.stringify({ states: t1.states, php }));
ok(Math.abs(hp0 - t1.hp - 3) < 0.01 && j1.lands === j0.lands + 1, 'landningen ger 3 skada ' + JSON.stringify({ hp0, hp: t1.hp, j0, j1 }));
ok(j1.airDrawn > j0.airDrawn, 'fienden i luften ritas högre (räknaren i renderSprites) ' + JSON.stringify(j1));
// kontroll: på marken gör samma skelett skada
await ev(() => { const e = __game.ents()[0]; e.x = 6.3; e.y = 5.5; }); // smällen och uppkastet knuffade den ur räckhåll
await until(() => __game.P.hp < 100, 6);
ok(await ev(() => __game.P.hp < 100), 'kontroll: efter landningen anfaller skelettet igen och gör skada');
await ev(() => { window.__hpHold = true; });

// 2) inget uppkast: utanför 0,6 × radien, tung fiende och av-flaggan
await scene({ dist: 3 }); await gwait(0.2);
const far = await ev(() => { const g = __game, e = g.ents()[0]; g.explode(e.x - 1.5, e.y, 0, 2, false); return g.v26b.air(e).z; });
await scene({ dist: 3, type: 'Ǧ' }); await gwait(0.2);
const heavy = await ev(() => { const g = __game, e = g.ents()[0]; g.explode(e.x - 0.3, e.y, 0, 2, false); return { z: g.v26b.air(e).z, size: e.d.size }; });
await scene({ dist: 3 }); await gwait(0.2); await ev(() => __game.v26b.set('jug', false));
const off = await ev(() => { const g = __game, e = g.ents()[0]; g.explode(e.x - 0.3, e.y, 0, 2, false); return g.v26b.air(e).z; });
await ev(() => __game.v26b.set('jug', true));
ok(far === 0 && heavy.z === 0 && off === 0, 'inget uppkast långt från smällen, för tung fiende eller med jongleringen av ' + JSON.stringify({ far, heavy, off }));

// 3) +25 % skada i luften och träffar håller den uppe
await scene({ dist: 3 }); await gwait(0.2);
const dm = await ev(() => new Promise(res => { const g = __game, e = g.ents()[0]; g.v26b.launch(e, 4);
  const k = () => { if (!(g.v26b.air(e).t > 0.1)) return requestAnimationFrame(k); const h0 = e.hp, b0 = g.v26b.jst().bumps; g.hurtEnemy(e, 10, e.x, e.y, {}); res({ d: +(h0 - e.hp).toFixed(2), bumps: g.v26b.jst().bumps - b0, vz: g.v26b.air(e).vz }); }; requestAnimationFrame(k); }));
ok(Math.abs(dm.d - 12.5) < 0.01, '10 skada i luften blir 12,5 ' + JSON.stringify(dm));
const hold = await ev(() => new Promise(res => { const g = __game, e = g.ents()[0], t0 = g.v26b.t(); let n = 0; // träff var 0,1 s i 1,5 s: fortfarande i luften
  const k = () => { const t = g.v26b.t() - t0; if (t > n * 0.1 && n < 15) { n++; g.hurtEnemy(e, 0.01, e.x, e.y, {}); } if (t >= 1.5) return res({ z: g.v26b.air(e).z, airT: g.v26b.air(e).t }); requestAnimationFrame(k); }; requestAnimationFrame(k); }));
ok(hold.z > 0 && hold.airT > 1.4, 'täta träffar håller fienden i luften (jonglering) ' + JSON.stringify(hold));
await until(() => __game.v26b.air(__game.ents()[0]).z <= 0, 4);

// 4) dödande i luften: +JONGLERING
await scene({ dist: 3, hp: 20 }); await gwait(0.2);
const kill = await ev(() => new Promise(res => { const g = __game, e = g.ents()[0], a0 = g.v26b.jst().airKills; g.v26b.launch(e, 4);
  const k = () => { if (!(g.v26b.air(e).t > 0.15)) return requestAnimationFrame(k); g.hurtEnemy(e, 999, e.x, e.y, {}); res({ dead: e.dead, airKills: g.v26b.jst().airKills - a0, feed: g.styleRef().feed.map(f => f.t) }); }; requestAnimationFrame(k); }));
ok(kill.dead && kill.airKills === 1 && kill.feed.includes('+JONGLERING'), 'ett dödande i luften ger +JONGLERING ' + JSON.stringify(kill));
await gwait(1.2);
const corpse = await ev(() => __game.v26b.air(__game.ents()[0]).z);
ok(corpse === 0, 'liket faller ned till golvet ' + corpse);

// 4b) landar den över tomrummet faller den ned och dör (som en knuff)
await scene({ dist: 3, void: [12, 5] }); await gwait(0.2);
const vd = await ev(() => new Promise(res => { const g = __game, e = g.ents()[0]; g.v26b.launch(e, 3.5); e.x = 12.5; e.y = 5.5; const t0 = g.v26b.t();
  const k = () => { if (e.dead || g.v26b.t() - t0 > 3) return res({ dead: !!e.dead, z: g.v26b.air(e).z }); requestAnimationFrame(k); }; requestAnimationFrame(k); }));
ok(vd.dead, 'en fiende som landar i tomrummet faller och dör ' + JSON.stringify(vd));

// 4c) tio smällar 0,1 s isär: fienden stiger aldrig genom taket, landar och anfaller igen
await scene({ dist: 0.8, dmg: 10 }); await gwait(0.2);
const many = await ev(() => new Promise(res => { const g = __game, e = g.ents()[0], t0 = g.v26b.t(); g.v26b.jst().maxZ = 0; let n = 0, landT = null;
  const k = () => { const t = g.v26b.t() - t0; if (n < 10 && t >= n * 0.1) { n++; g.explode(e.x - 0.3, e.y, 0, 2, false); } if (n >= 10 && landT === null && g.v26b.air(e).z <= 0) landT = t;
    if (t > 5) return res({ maxZ: +g.v26b.jst().maxZ.toFixed(3), landT, z: g.v26b.air(e).z }); requestAnimationFrame(k); }; requestAnimationFrame(k); }));
ok(many.maxZ < 0.9 && many.landT !== null && many.landT < 4.5 && many.z === 0, 'tio smällar i rad: under taket och landar ' + JSON.stringify(many));
await ev(() => { window.__hpHold = false; const g = __game, e = g.ents()[0]; g.P.hp = 100; g.P.armor = 0; g.P.iframe = 0; e.x = 6.3; e.y = 5.5; });
await until(() => __game.P.hp < 100, 6);
ok(await ev(() => __game.P.hp < 100), 'efter smällarna anfaller fienden igen (ingen evig bedövning)');
await ev(() => { window.__hpHold = true; });

// 4d) ett riktigt skott (fire) träffar fienden i luften: träffen räknas i planet (sikta på kolumnen), +25 %
await scene({ dist: 3 }); await gwait(0.2);
const shotAir = await ev(() => new Promise(res => { const g = __game, P = g.P, e = g.ents()[0], i = g.WEAPONS.findIndex(w => w.id === 'pistol'); P.has[i] = true; P.weapon = i; P.mags[i] = g.WEAPONS[i].mag; g.WS.state = 'idle'; g.WS.t = 0; g.WS.shot = 99; g.WS.cd = 0; g.v26b.launch(e, 3.5);
  const k = () => { if (!(g.v26b.air(e).t > 0.1)) return requestAnimationFrame(k); const h0 = e.hp, z = g.v26b.air(e).z; g.fire(); res({ hit: h0 - e.hp, z }); }; requestAnimationFrame(k); }));
ok(shotAir.hit > 0 && shotAir.z > 0, 'pistolskottet träffar fienden i luften ' + JSON.stringify(shotAir));

// 5) hagelgeväret: på 1 ruta uppkast, på 3 rutor inte
const fireAt = (dist) => ev(d => { const g = __game, P = g.P, i = g.WEAPONS.findIndex(w => w.id === 'shotgun'); P.has[i] = true; P.ammo.shells = 50; P.weapon = i; P.mags[i] = g.WEAPONS[i].mag; g.WS.state = 'idle'; g.WS.t = 0; g.WS.shot = 99; g.WS.cd = 0;
  const e = g.ents()[0]; e.x = P.x + d; e.y = P.y; const l0 = g.v26b.jst().launches; g.fire(); return { launched: g.v26b.jst().launches - l0, z: g.v26b.air(e).z, hp: e.hp }; }, dist);
await scene({ dist: 3 }); await gwait(0.3);
const sg3 = await fireAt(3.0);
await scene({ dist: 3 }); await gwait(0.3);
const sg1 = await fireAt(1.0);
ok(sg1.launched === 1 && sg1.z > 0 && sg1.hp < 200, 'hagelgeväret på 1 ruta kastar upp fienden ' + JSON.stringify(sg1));
ok(sg3.launched === 0 && sg3.hp < 200, 'hagelgeväret på 3 rutor träffar men kastar inte upp ' + JSON.stringify(sg3));

// 6) skärmbild i luften (utan lowfx)
await scene({ dist: 2.2, lowfx: false }); await gwait(0.3);
await ev(() => new Promise(res => { const g = __game, e = g.ents()[0]; g.v26b.launch(e, 4.5); const k = () => { const a = g.v26b.air(e); if (a.vz <= 0.3) return res(); requestAnimationFrame(k); }; requestAnimationFrame(k); }));
await shot('air');
const err = await ev(() => __game.v26b.state().err);
ok(!err, 'inga fel i V26B ' + (err || ''));
await ev(() => clearInterval(window.__hold));
await done();
