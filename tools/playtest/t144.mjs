// Version 27 FX del 3: tydliga statuseffekter (bedövad: fåglar, frusen: isande ånga, förgiftad: droppar och bubblor, brinnande på
// avstånd, jonglerad: fartlinjer, vacklande: ring och markör), rök ur pipan efter tunga skott och långa salvor, och biomernas
// framträdanden när fiender dyker upp mitt i striden. Spelets riktiga vägar (fire, launchEnemy, spawnEnemy + gfxE:s gBorn), lowfx stänger
// av, taken håller, render-kostnaden mäts med 4× CPU-strypning med och utan, inga sidfel. All väntan räknas i speltid.
import { setup } from './head.mjs';
const PORT = 9844;
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t144');
const cerrs = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|404/.test(m.text())) cerrs.push(m.text().slice(0, 200)); });
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(60); } };
const gwait = sec => until(null, sec);
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const ready = async (biome = 'dungeon') => {
  await ev(biome => { const g = __game; g.profile.tutDone = true; const grid = []; for (let y = 0; y < 20; y++) { const r = []; for (let x = 0; x < 30; x++) r.push(x === 0 || y === 0 || x === 29 || y === 19 ? '1' : '.'); grid.push(r); } grid[10][8] = 'P'; grid[2][27] = 'x'; g.playCustom({ grid, biome }); }, biome);
  await until(() => __game.state() === 'play' && !!__game.fx27, 5); await until(() => __game.banner() <= 0, 4);
  await ev(() => { const g = __game, P = g.P; P.x = 8.5; P.y = 10.5; P.a = 0; P.hp = 999; P.iframe = 99; g.settings.lowfx = false; g.settings.autoLowFx = false; g.settings.noFlash = false; const far = g.spawnEnemy('S', 27.5, 18.5); far.hp = far.maxHp = 9999; far.stun = 9999; far.sleep = true; }); await gwait(1.8); // färska fiender räknas som framträdanden först 1,5 s in på banan
};
const st = () => ev(() => __game.fx27.state());
const foe = (x, y, o = {}, ch = 'S') => ev(([x, y, o, ch]) => { const g = __game, e = g.spawnEnemy(ch, x, y); e.hp = e.maxHp = 9999; e.sleep = false; e.alert = true; e.cd = 99; Object.assign(e, o); window.__e = e; return true; }, [x, y, o, ch]);
const tnow = () => ev(() => __game.v26b.t());
await ready();
// 1) bedövad: två fåglar flaxar runt huvudet så länge bedövningen varar
let n0 = (await st()).n.status; await foe(11.5, 10.5); await gwait(0.1); await ev(() => { window.__e.stun = 2.5; window.__e.alert = true; }); await gwait(0.25);
let s = await st();
const birds = await ev(() => { const e = window.__e; return __game.particles().filter(p => p.flap && Math.hypot(p.x - e.x, p.y - e.y) < 0.4 && p.z > e.d.size * 0.8).length; });
ok(s.n.status.stun === n0.stun + 1 && birds === 2 && await ev(() => __game.fx27.ov()) === 1, `bedövad: två fåglar runt huvudet (${birds})`);
const pos0 = await ev(() => __game.particles().filter(p => p.flap).map(p => [p.x, p.y])); await gwait(0.15);
const pos1 = await ev(() => __game.particles().filter(p => p.flap).map(p => [p.x, p.y]));
ok(pos0.length === 2 && pos1.length === 2 && Math.hypot(pos0[0][0] - pos1[0][0], pos0[0][1] - pos1[0][1]) > 0.05, 'fåglarna snurrar');
await shot('stun');
await ev(() => { window.__e.stun = 0; }); await gwait(0.15);
ok(await ev(() => __game.fx27.ov()) === 0 && await ev(() => !__game.particles().some(p => p.flap && p.life > 0.5)), 'fåglarna försvinner när bedövningen släpper');
// 2) vacklande: ring på golvet och markör över huvudet ("avrätta mig")
n0 = (await st()).n.status; await ev(() => { const e = window.__e; e.staggerT = __game.v26b.t() + 2; e.stun = 1.3; }); await gwait(0.2);
s = await st(); const stag = await ev(() => { const e = window.__e; return __game.particles().filter(p => Math.hypot(p.x - e.x, p.y - e.y) < 0.05 && p.add && p.life >= 0.9).map(p => +p.z.toFixed(2)); });
ok(s.n.status.stagger === n0.stagger + 1 && stag.length === 2 && Math.min(...stag) < 0 && Math.max(...stag) > 0.8 && s.n.status.stun === n0.stun, 'vacklande: en ring på golvet och en markör över huvudet (inga fåglar) ' + JSON.stringify(stag));
await shot('stagger');
await ev(() => { window.__e.staggerT = 0; window.__e.stun = 0; }); await gwait(0.15); ok(await ev(() => __game.fx27.ov()) === 0, 'ringen försvinner när fienden slutar vackla');
// 3) frusen, förgiftad, brinnande på avstånd, jonglerad
await ev(() => { window.__e.hp = 0; window.__e.dead = true; __game.particles().length = 0; });
n0 = (await st()).n.status;
await foe(11.5, 9.5, { frozen: 5 }); await foe(11.5, 11.5, { poison: 5 }, 'S'); await foe(21.5, 10.5, { burn: 5 }); await gwait(1.2);
s = await st(); ok(s.n.status.frost > n0.frost && s.n.status.poison > n0.poison && s.n.status.burn > n0.burn, 'frusen: isande ånga, förgiftad: droppar och bubblor, brinnande 13 rutor bort: större lågor ' + JSON.stringify({ frost: s.n.status.frost - n0.frost, poison: s.n.status.poison - n0.poison, burn: s.n.status.burn - n0.burn }));
await shot('status');
for (const e of ['frozen', 'poison', 'burn']) await ev(() => { for (const e of __game.ents()) if (!e.dead && e.hp === 9999) { e.frozen = 0; e.poison = 0; e.burn = 0; } });
await foe(11, 10.5); n0 = (await st()).n.status;
const air = await ev(() => { const e = window.__e; e.stun = 0; __game.v26b.launch(e, 4); return e.airZ > 0 || e.airVz > 0; }); await gwait(0.4);
s = await st(); ok(air && s.n.status.air > n0.air, 'jonglerad i luften: fartlinjer ' + (s.n.status.air - n0.air));
await shot('air');
// 4) rök ur pipan: hagelgeväret (tungt skott) och en lång salva med geväret
await ev(() => { for (const e of __game.ents()) if (!e.dead && e.hp === 9999) { e.hp = 0; e.dead = true; } __game.P.a = Math.PI; });
const arm = id => ev(id => { const g = __game, P = g.P, WS = g.WS, i = g.WEAPONS.findIndex(w => w.id === id), wp = g.WEAPONS[i]; P.has[i] = true; P.weapon = i; P.mags[i] = wp.mag; if (wp.ammo && P.ammo) P.ammo[wp.ammo] = 99; WS.state = 'idle'; WS.cd = 0; WS.shot = 99; }, id);
await arm('shotgun'); await gwait(0.4); await arm('shotgun'); let b0 = await ev(() => __game.fx27.barrel());
await ev(() => __game.fire()); await gwait(0.1); let b1 = await ev(() => __game.fx27.barrel());
ok(b1.t > 0.8, 'hagelgeväret: pipan ryker en stund efter skottet ' + b1.t.toFixed(2));
await gwait(1.2); b1 = await ev(() => __game.fx27.barrel());
ok(b1.n - b0.n >= 4 && await ev(() => __game.wfx.state().smoke) > 0, `rökslingorna stiger ur pipan (${b1.n - b0.n} puffar)`);
await gwait(1.5);
await arm('rifle'); await gwait(0.4); await arm('rifle'); b0 = await ev(() => __game.fx27.barrel());
await pg.mouse.move(480, 300); await pg.mouse.down(); await gwait(2.2); await pg.mouse.up();
const heat = await ev(() => __game.wfx.state().heat); await until(() => __game.wfx.state().heat < 0.45, 3); await gwait(0.1);
b1 = await ev(() => __game.fx27.barrel());
ok(heat > 0.45 && b1.t > 0.8, `en lång salva med geväret: pipan fortsätter ryka när den svalnar (värme ${heat.toFixed(2)})`);
await gwait(1.0); ok((await ev(() => __game.fx27.barrel())).n > b1.n, 'och röken stiger efter salvan');
// 5) biomernas framträdanden: en fiende dyker upp mitt i striden
const styles = await ev(() => __game.fx27.styles());
const got = {};
for (const [biome, k] of [['volcano', 'fire'], ['frost', 'ice'], ['sewer', 'slime'], ['tomb', 'sand'], ['crystal', 'crystal'], ['forest', 'leaf'], ['harbor', 'water'], ['dungeon', null]]) {
  await ready(biome); const n1 = (await st()).n.spawn;
  await ev(() => { const e = __game.spawnEnemy('S', 11.5, 10.5); e.hp = e.maxHp = 9999; e.stun = 99; }); await gwait(0.25);
  const n2 = (await st()).n.spawn, d = Object.keys(n2).filter(x => n2[x] > n1[x]); got[biome] = d.join(',') || '-';
  if (k === 'fire' || k === 'ice' || k === 'slime') await shot('spawn_' + k);
}
ok(got.volcano === 'fire' && got.frost === 'ice' && got.sewer === 'slime' && got.tomb === 'sand' && got.crystal === 'crystal' && got.forest === 'leaf' && got.harbor === 'water' && got.dungeon === '-', 'framträdanden per biom ' + JSON.stringify(got));
ok(styles.purgatory === 'fire' && styles.swamp === 'slime', 'fler biomer har ett eget framträdande');
// 6) lowfx: inget nytt
await ready('volcano'); s = await st();
await ev(() => { const g = __game; g.settings.lowfx = true; const e = g.spawnEnemy('S', 11.5, 10.5); e.hp = e.maxHp = 9999; e.alert = true; e.stun = 2; e.frozen = 3; e.poison = 3; window.__e = e; }); await gwait(0.6);
const s2 = await st(); ok(JSON.stringify(s2.n.status) === JSON.stringify(s.n.status) && JSON.stringify(s2.n.spawn) === JSON.stringify(s.n.spawn) && await ev(() => __game.fx27.ov()) === 0, 'lowfx: inga statuseffekter och inga framträdanden från version 27');
await ev(() => { __game.settings.lowfx = false; window.__e.hp = 0; window.__e.dead = true; });
// 7) render-kostnad med 4× CPU-strypning: åtta fiender med olika status (två bedövade, två vacklande, frusen, förgiftad, brinnande, i luften)
await ready('volcano');
const cdp = await pg.context().newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const bs = { on: [], off: [] };
for (let i = 0; i < 9; i++) for (const off of [true, false]) {
  await ev(off => { const g = __game, t = g.v26b.t(); g.resume(); g.fx27.setOff(off); g.particles().length = 0; for (const e of g.ents()) if (!e.dead && e.hp !== 9999) { e.dead = true; }
    for (const e of g.ents()) if (!e.dead && e.hp === 9999 && e.x < 25) { e.hp = 0; e.dead = true; }
    const o = [{ stun: 3 }, { stun: 3 }, { staggerT: t + 3, stun: 1.3 }, { staggerT: t + 3, stun: 1.3 }, { frozen: 3 }, { poison: 3 }, { burn: 3 }, {}];
    o.forEach((x, i) => { const e = g.spawnEnemy('S', 11 + (i % 4) * 1.2, 8.5 + (i / 4 | 0) * 3); e.hp = e.maxHp = 9999; e.alert = true; e.cd = 99; Object.assign(e, x); if (i === 7) g.v26b.launch(e, 3); }); }, off);
  await gwait(0.4);
  const r = await ev(() => { const g = __game; g.pause(); const n = g.particles().length, tick = g.fx27.tickMs(60), b = g.wproj.bench(45); g.resume(); return { ...b, n, tick }; });
  bs[off ? 'off' : 'on'].push(r);
}
await ev(() => { __game.fx27.setOff(false); }); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
const med = (a, k = 'med') => a.map(r => r[k]).sort((x, y) => x - y)[a.length >> 1];
const on = med(bs.on.slice(1)), offm = med(bs.off.slice(1));
console.log('BENCH', JSON.stringify({ medOn: +on.toFixed(2), medOff: +offm.toFixed(2), p90On: +med(bs.on.slice(1), 'p90').toFixed(2), p90Off: +med(bs.off.slice(1), 'p90').toFixed(2), partsOn: med(bs.on.slice(1), 'n'), partsOff: med(bs.off.slice(1), 'n'), tickOn: +med(bs.on.slice(1), 'tick').toFixed(3) }));
ok(on < Math.max(offm * 1.3, offm + 2.0), `åtta fiender med status (4× strypning): ${on.toFixed(2)} ms med, ${offm.toFixed(2)} ms utan`);
ok(med(bs.on.slice(1), 'tick') < 0.5, `update-kostnaden: ${med(bs.on.slice(1), 'tick').toFixed(3)} ms`);
ok(cerrs.length === 0, 'inga konsolfel ' + cerrs.join(' / '));
await done();
