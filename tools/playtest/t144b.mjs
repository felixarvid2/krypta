// Version 27: samlad prestandakoll för BLOOD och FX. Värsta fallet: en arenavåg med 18 köttfiender (kultister, kedjefångar, grismän),
// kpist och hagel växelvis, tre explosioner, lik som skjuts sönder, väggstänk, statuseffekter (brand, gift, frost, bedövning) och en
// boss som byter fas två gånger. Hela bildrutor mäts (rAF-intervall, alltså update + render + HUD) med 4× och 6× CPU-strypning i tre
// lägen: allt på, version 27 av (BLOOD v27b.set(false) + FX27.off) och lowfx. Sedan det automatiska lågeffektläget: slår det till när
// bildtiden är för hög, och stänger det då av det nya från både BLOOD och FX? Speltid styr scenen; mätningen är väggtid per bildruta.
import { setup } from './head.mjs';
const PORT = 9844;
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/t144b');
const cerrs = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|404/.test(m.text())) cerrs.push(m.text().slice(0, 200)); });
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 180000) return !cond; await wait(60); } };
const gwait = sec => until(null, sec);
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const cdp = await pg.context().newCDPSession(pg);
const throttle = r => cdp.send('Emulation.setCPUThrottlingRate', { rate: r });
const REPS = +(process.env.REPS || 2), SEC = +(process.env.SEC || 3);
const ready = async () => {
  await throttle(1);
  await ev(() => { const g = __game; g.profile.tutDone = true; const grid = []; for (let y = 0; y < 20; y++) { const r = []; for (let x = 0; x < 30; x++) r.push(x === 0 || y === 0 || x === 29 || y === 19 ? '1' : '.'); grid.push(r); } grid[10][6] = 'P'; grid[10][24] = 'B'; grid[2][27] = 'x'; g.playCustom({ grid, biome: 'dungeon' }); });
  await until(() => __game.state() === 'play' && !!__game.fx27 && !!__game.v27b, 5); await until(() => __game.banner() <= 0, 4);
  await ev(() => { const g = __game, P = g.P; P.x = 6.5; P.y = 10.5; P.a = 0; P.hp = 9999; P.iframe = 999; g.settings.autoLowFx = false; g.settings.noFlash = false; const b = g.boss(); if (b) { b.stun = 9999; b.cd = 99; } }); await gwait(1.7); // färska fiender: arenavågens framträdande
};
const mode = m => ev(m => { const g = __game; g.settings.lowfx = m === 'low'; g.v27b.set(m !== 'off' && m !== 'bloodoff'); g.fx27.setOff(m === 'off' || m === 'fxoff'); }, m); // fxoff/bloodoff: bara den ena delen av (vem kostar vad)
const MODES = (process.env.MODES || 'on,off,low').split(',');
// scenen: drivs från en egen rAF-slinga i sidan (samma bildrutor som spelet), styrd av speltid; mäter intervallen mellan bildrutorna
const scene = (sec, auto) => ev(async ([sec, auto]) => {
  window.__tg = null; const g = __game, P = g.P, WS = g.WS, t0 = g.roles.t(), W = id => g.WEAPONS.findIndex(w => w.id === id), smg = W('smg'), sg = W('shotgun');
  for (const i of [smg, sg]) { P.has[i] = true; }
  const T = ['Ä', 'ɖ', 'ʅ'], foes = [];
  for (let i = 0; i < 18; i++) { const x = i % 6 === 5 ? 28.3 : 13 + (i % 6) * 2.6, y = 5.5 + ((i / 6) | 0) * 4 + (i % 2) * 0.6, e = g.spawnEnemy(T[i % 3], Math.min(27.6, x), y); e.alert = true; e.hp = e.maxHp = 5; e.cd = 2 + Math.random() * 2;
    if (i % 6 === 0) e.burn = 9; if (i % 6 === 1) e.poison = 9; if (i % 6 === 2) e.frozen = 2; if (i % 6 === 3) e.stun = 3; foes.push(e); }
  if (g.v27b.level() > 0) for (let i = 0; i < 40; i++) { const a = -0.7 + i / 39 * 1.4, dx = Math.cos(a), dy = Math.sin(a), h = g.v27b.cast(P.x, P.y, dx, dy, 30); if (h) g.v27b.wall(h, dx, dy, 0.3 + (i % 5) * 0.12, g.v27b.COL.flesh, 0.1, 1); } // väggstänk i synfältet (scenens träffar når sällan väggen)
  const booms = [0.5, 1.3, 2.1], bossAt = [[1.0, 0.6], [2.5, 0.3]], ts = [], parts = [], efx = [], work = []; let last = 0, lowAt = -1;
  if (!window.__raf0) { window.__raf0 = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = cb => window.__raf0(t => { if (cb.__mine) return cb(t); const a = performance.now(); cb(t); if (window.__work) window.__work.push(performance.now() - a); }); } // spelets eget arbete per bildruta (update + render + HUD)
  window.__work = work; const w0 = g.wproj.state().n, e0 = g.efx.state().n.boom, h0 = g.gfxE ? { ...g.gfxE } : {};
  return await new Promise(res => {
    const step = now => {
      const t = g.roles.t() - t0;
      if (t <= 0.4) work.length = 0;
      if (last && t > 0.4) { ts.push(now - last); parts.push(g.particles().length); efx.push(g.particles().filter(p => p.efx).length); }
      last = now;
      if (auto && g.settings.lowfx && lowAt < 0) lowAt = t;
      if (!window.__tg || window.__tg.dead || t - (window.__tgT || -9) > 0.35) { const al = foes.filter(e => !e.dead); window.__tg = al[(Math.random() * al.length) | 0] || foes[(Math.random() * foes.length) | 0]; window.__tgT = t; } // sikta på en levande fiende (eller ett lik, som skjuts sönder)
      if (window.__tg) P.a = Math.atan2(window.__tg.y - P.y, window.__tg.x - P.x); P.iframe = 999; P.hp = 9999;
      const w = t % 1.2 < 0.8 ? smg : sg; if (P.weapon !== w) { P.weapon = w; WS.state = 'idle'; WS.cd = 0; } P.mags[w] = 30; WS.state = 'idle'; if (WS.cd <= 0) g.fire();
      while (booms.length && t >= booms[0]) { booms.shift(); const alive = foes.filter(e => !e.dead), e = alive[(Math.random() * alive.length) | 0] || foes[0]; g.explode(e.x, e.y, 40, 2.5, false, false); }
      while (bossAt.length && t >= bossAt[0][0]) { const b = g.boss(); if (b && !b.dead) b.hp = b.maxHp * bossAt[0][1]; bossAt.shift(); }
      if (auto && t > 2.5 && foes.filter(e => !e.dead).length < 8) for (let i = 0; i < 6; i++) { const e = g.spawnEnemy(T[i % 3], 14 + i * 2, 6 + (i % 3) * 4); e.alert = true; e.hp = e.maxHp = 5; foes.push(e); } // automatiskt läge: nya vågor hela tiden
      if (t < sec && g.state() === 'play') requestAnimationFrame(step);
      else { window.__work = null; ts.sort((a, b) => a - b); work.sort((a, b) => a - b); const pm = parts.slice().sort((a, b) => a - b);
        const w1 = g.wproj.state().n; res({ core: ((w1.ring - w0.ring) + (w1.debris - w0.debris)) / Math.max(1, w1.booms - w0.booms), efxBoom: g.efx.state().n.boom - e0, n: ts.length, med: ts[ts.length >> 1], p90: ts[(ts.length * 0.9) | 0], max: ts[ts.length - 1], wmed: work[work.length >> 1], wp90: work[(work.length * 0.9) | 0], wmax: work[work.length - 1], partsMed: pm[pm.length >> 1], partsMax: pm[pm.length - 1], full: parts.filter(p => p >= 255).length / Math.max(1, parts.length), efxMax: Math.max(0, ...efx), lowAt, walls: g.v27b.marks().length, wn: g.v27b.n.walls, wmiss: g.v27b.n.wallMiss, hits: g.v27b.n.hits, decals: g.v27b.decals(), kills: foes.filter(e => e.dead).length }); }
    };
    step.__mine = true; requestAnimationFrame(step);
  });
}, [sec, auto]);
const res = {};
for (const rate of [4, 6]) for (let rep = 0; rep < REPS; rep++) for (const m of MODES) {
  await ready(); await mode(m); await throttle(rate);
  const r = await scene(SEC, false); await throttle(1);
  (res[`${rate}x_${m}`] = res[`${rate}x_${m}`] || []).push(r);
  await ev(() => { __game.settings.lowfx = false; __game.v27b.set(true); __game.fx27.setOff(false); });
}
const md = (a, k) => a.map(r => r[k]).sort((x, y) => x - y)[(a.length - 1) >> 1];
const sum = {}; for (const [k, a] of Object.entries(res)) sum[k] = { core: +md(a, 'core').toFixed(1), efxBoom: md(a, 'efxBoom'), wmed: +md(a, 'wmed').toFixed(1), wp90: +md(a, 'wp90').toFixed(1), wmax: +md(a, 'wmax').toFixed(1), med: +md(a, 'med').toFixed(1), p90: +md(a, 'p90').toFixed(1), max: +md(a, 'max').toFixed(1), partsMed: md(a, 'partsMed'), partsMax: md(a, 'partsMax'), full: +md(a, 'full').toFixed(2), efxMax: md(a, 'efxMax'), frames: md(a, 'n'), kills: md(a, 'kills'), walls: md(a, 'walls'), wn: md(a, 'wn'), wmiss: md(a, 'wmiss'), hits: md(a, 'hits'), decals: md(a, 'decals') };
console.log('PERF', JSON.stringify(sum));
for (const rate of [4, 6]) { const on = sum[`${rate}x_on`], off = sum[`${rate}x_off`], low = sum[`${rate}x_low`];
  ok(on.frames > 10 && off.frames > 10, `${rate}× strypning: spelets arbete per bildruta median ${on.wmed} / ${off.wmed} / ${low.wmed} ms och p90 ${on.wp90} / ${off.wp90} / ${low.wp90} ms (på / av / lowfx; bildintervall p90 ${on.p90} / ${off.p90} / ${low.p90}), partiklar ${on.partsMed} / ${off.partsMed} / ${low.partsMed} (max ${on.partsMax})`);
  ok(on.wp90 < Math.max(off.wp90 * 1.35, off.wp90 + 6), `${rate}×: p90 med version 27 inte mycket sämre än utan (${on.wp90} mot ${off.wp90} ms arbete per bildruta)`);
  ok(on.core >= off.core * 0.9 && on.efxBoom >= off.efxBoom && on.partsMax <= 230, `${rate}×: smällarnas kärna får plats med version 27 (${on.core} mot ${off.core} delar per smäll, Effekseer-smällar ${on.efxBoom} mot ${off.efxBoom}, högst ${on.partsMax} partiklar)`);
  ok(low.partsMed <= on.partsMed && low.walls <= 16, `${rate}×: lowfx ger färre partiklar (${low.partsMed} mot ${on.partsMed}) och högst 16 väggstänk (${low.walls})`); }
// (samlad budget, fx27Room: listan hålls under 200 och en smäll rensar till 150 – utan den fick smällarna i en full strid bara 13 av 21 delar och 1 av 3 Effekseer-smällar)
// det automatiska lågeffektläget (slår till när bildrutan tar mer än 1/28 s en längre stund): 12× strypning, allt på, autoLowFx på – slår det till, och stänger det av det nya från BLOOD och FX?
await ready(); await mode('on'); await ev(() => { __game.settings.autoLowFx = true; });
await throttle(12);
const a = await scene(14, true); await throttle(1);
const after = await ev(() => ({ low: __game.settings.lowfx, fx: __game.fx27.state().on, ov: __game.fx27.ov(), n27: JSON.stringify(__game.fx27.state().n), jets: __game.v27b.n.jets, fount: __game.v27b.n.fount, steps: __game.v27b.n.steps, screen: __game.v27b.n.screen }));
console.log('AUTO', JSON.stringify({ lowAt: a.lowAt, med: a.med, p90: a.p90, frames: a.n, parts: a.partsMed, ...after, n27: undefined }));
ok(a.lowAt > 0 && after.low === true, `automatiskt lågeffektläge slår till efter ${a.lowAt.toFixed ? a.lowAt.toFixed(1) : a.lowAt} s speltid (bildruta median ${a.med && a.med.toFixed(1)} ms med 12×)`);
// efter omslaget: samma scen en stund till; inga nya strålar/fontäner (BLOOD) och inga nya version 27 FX-delar
const b0 = await ev(() => ({ n: JSON.stringify(__game.fx27.state().n), jets: __game.v27b.n.jets, fount: __game.v27b.n.fount, scr: __game.v27b.n.screen }));
await throttle(12); const a2 = await scene(3, false); await throttle(1);
const b1 = await ev(() => ({ n: JSON.stringify(__game.fx27.state().n), jets: __game.v27b.n.jets, fount: __game.v27b.n.fount, scr: __game.v27b.n.screen, on: __game.fx27.state().on }));
ok(b1.n === b0.n && b1.on === false, 'efter omslaget: inga nya FX-effekter från version 27');
ok(b1.jets === b0.jets && b1.fount === b0.fount && b1.scr === b0.scr, 'efter omslaget: inga nya blodstrålar, fontäner eller skärmstänk från BLOOD ' + JSON.stringify({ jets: b1.jets - b0.jets, fount: b1.fount - b0.fount, scr: b1.scr - b0.scr }));
console.log('AFTER', JSON.stringify({ med: a2.med, p90: a2.p90, parts: a2.partsMed }));
await ev(() => { __game.settings.lowfx = false; __game.settings.autoLowFx = true; });
ok(cerrs.length === 0, 'inga konsolfel ' + cerrs.join(' / '));
await done();
