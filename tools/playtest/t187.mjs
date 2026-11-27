// t187: version 30 (RAS) – pelare som faller och mätning med många ras. En staty (u) faller av en smäll bort från smällen: fienden i
// fallets väg tar stor skada, fienden bredvid ingen; rutan blir grus (gångbar), golvet längs fallet grus. En fristående väggpelare 2×2
// faller av en smäll (alla fyra rutorna grus). r30Crack tre gånger fäller en staty. En väggbit som inte är fristående står kvar.
// Mätning: en sal 48×40 med 60 spruckna väggar; render() före och efter, och tiden för ett ras av alla 60 på en gång (en smäll per
// vägg) samt bildrutornas tid medan dammet lägger sig (CPU-strypning 4× som t168 när PW_THROTTLE=4). Port 9887. Skriver out/t187/res.json.
import { setup } from './head.mjs';
import fs from 'fs';
const PORT = 9887;
const { pg, ev, ok, shot, done, until, gwait, gsample } = await setup(PORT, 'out/t187');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) cerr.push(m.text().slice(0, 160)); });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const sceneFn = o => { const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: !!o.lowfx, noFlash: false, reduceMotion: false });
  const W = o.W || 22, H = o.H || 13, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[H - 2][1] = 'x'; for (const [t, x, y] of o.put || []) grid[y][x] = t;
  g.r30 && (g.r30.R30.force = o.force === false ? null : true); g.playCustom({ grid, biome: o.biome || 'dungeon' }); if (g.r30) g.r30.R30.force = null; // (pelare faller på spelets våningar; i en egen bana bara tvingat)
  for (const e of g.ents()) { e.d = { ...e.d, speed: 0, dmg: 0 }; e.alert = false; e.hp = e.maxHp = 500; }
  g.P.hp = 1e6; clearInterval(window.__hold); window.__pin = o.pin || [3.5, 6.5]; g.P.a = 0; g.lvl().ambient = 1.1;
  window.__hold = setInterval(() => { const P = __game.P; P.hp = 1e6; if (window.__pin) { P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = 0; P.vx = P.vy = 0; } }, 30); };
const ready = async o => { await ev(sceneFn, o); await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await gwait(0.3); };
const R = {};
await ready({ force: false }); // (window.__game.r30 finns efter första banan)
// ---- statyn faller bort från smällen ----
await ready({ put: [['u', 10, 6], ['Ä', 12, 6], ['Ä', 10, 9], ['1', 15, 3], ['1', 16, 3], ['1', 15, 4], ['1', 16, 4]] });
R.p0 = await ev(() => { const g = __game; return { props: g.props().filter(p => p.ch === 'u' && !p.broken).length, hp: g.ents().map(e => [e.x | 0, e.y | 0, e.hp]) }; });
await shot('staty_fore');
await ev(() => __game.explode(8.9, 6.5, 0, 1.6, false)); R.mid = await ev(() => __game.r30.falls()); await gwait(0.25); await shot('staty_faller'); await gwait(0.9);
R.p1 = await ev(() => { const g = __game, m = g.r30.map(); return { props: g.props().filter(p => p.ch === 'u' && !p.broken).length, hp: g.ents().map(e => [e.x | 0, e.y | 0, e.hp]), ch: m[6][10], walk: g.v28.walk(10, 6), solid: g.v28.solid(10.5, 6.5),
  fl: [11, 12].map(x => !!(g.r30.floorTex(x, 6) || {}).r30), side: !!(g.r30.floorTex(10, 9) || {}).r30, falls: g.r30.falls(), n: g.r30.L().pillars }; });
await shot('staty_efter');
const hpAt = (s, x, y) => (s.hp.find(h => h[0] === x && h[1] === y) || [0, 0, -1])[2];
ok(R.mid === 1 && R.p1.props === 0 && R.p1.ch === 'ʶ' && R.p1.walk && !R.p1.solid, 'en smäll fäller statyn: rutan blir gångbart grus ' + JSON.stringify({ fall: R.mid, ...R.p1, hp: undefined }));
ok(hpAt(R.p1, 12, 6) <= hpAt(R.p0, 12, 6) - 100 && hpAt(R.p1, 10, 9) === hpAt(R.p0, 10, 9), 'fienden i fallets väg tar stor skada, fienden bredvid ingen ' + JSON.stringify({ före: R.p0.hp, efter: R.p1.hp }));
ok(R.p1.fl.some(Boolean) && !R.p1.side, 'grus på golvet längs fallet (inte vid sidan) ' + JSON.stringify(R.p1.fl));
// ---- fristående väggpelare 2×2 ----
await ev(() => __game.explode(14.2, 3.6, 0, 1.6, false)); await gwait(0.9);
R.wp = await ev(() => { const g = __game, m = g.r30.map(); return [[15, 3], [16, 3], [15, 4], [16, 4]].map(([x, y]) => m[y][x]); });
ok(R.wp.every(c => c === 'ʶ'), 'en fristående väggpelare 2×2 faller av en smäll ' + JSON.stringify(R.wp));
await shot('vaggpelare');
// ytterväggen (inte fristående) står kvar
R.outer = await ev(() => { __game.explode(1.6, 6.5, 0, 2.4, false); return __game.r30.map()[6][0]; });
ok(R.outer === '1', 'ytterväggen står kvar ' + R.outer);
// ---- spelaren bakom en väggpelare skyddas av den mot smällen som fäller den ----
await ready({ put: [['1', 15, 3], ['1', 16, 3], ['1', 15, 4], ['1', 16, 4]], pin: [17.6, 3.9] });
R.cover = await ev(() => { const g = __game, P = g.P; clearInterval(window.__hold); P.hp = 1000; P.iframe = 0; g.explode(14.0, 3.9, 30, 3.8, true); const hp = P.hp, m = g.r30.map(); P.hp = 1e6; return { hp, fell: m[3][15] === 'ʶ' }; });
await ev(() => { window.__hold = setInterval(() => { const P = __game.P; P.hp = 1e6; if (window.__pin) { P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = 0; P.vx = P.vy = 0; } }, 30); });
ok(R.cover.fell && R.cover.hp === 1000, 'väggpelaren faller men skyddar spelaren bakom den mot just den smällen ' + JSON.stringify(R.cover));
// en egen bana utan tvång: pelare faller inte (äldre tester och egna banor som förut)
await ready({ put: [['u', 10, 6]], force: false }); await ev(() => __game.explode(8.9, 6.5, 0, 1.6, false)); await gwait(0.3);
R.noforce = await ev(() => ({ u: __game.props().filter(p => p.ch === 'u' && !p.broken).length, falls: __game.r30.falls() }));
ok(R.noforce.u === 1 && R.noforce.falls === 0, 'egen bana (inte tvingat): statyn står kvar ' + JSON.stringify(R.noforce));
// WebGL: statyn faller med partiklarna i grafikkortet
await ready({ put: [['u', 10, 6], ['Ä', 12, 6]] }); await ev(() => { __game.settings.rendering = 'webgl'; }); await gwait(0.5);
await ev(() => __game.explode(9.5, 5.4, 0, 1.6, false)); await gwait(0.25); await shot('webgl_faller'); await gwait(0.8);
R.glf = await ev(() => ({ gl: __game.gl ? __game.gl.n() : null, falls: __game.r30.falls(), u: __game.props().filter(p => p.ch === 'u' && !p.broken).length }));
ok(R.glf.falls === 0 && R.glf.u === 0 && (!R.glf.gl || !R.glf.gl.failed), 'WebGL: statyn faller utan fel ' + JSON.stringify({ falls: R.glf.falls, used: R.glf.gl && R.glf.gl.used, failed: R.glf.gl && R.glf.gl.failed, noImg: R.glf.gl && R.glf.gl.noImg }));
await ev(() => { __game.settings.rendering = 'auto'; });
// ---- r30Crack tre gånger fäller en staty ----
await ready({ put: [['u', 10, 6]] });
R.cr = await ev(() => { const r = __game.r30, a = [r.crack(10.5, 6.5, 30), r.crack(10.5, 6.5, 30)], b = r.falls(); a.push(r.crack(10.5, 6.5, 30)); return { a, b, c: r.falls() }; });
ok(R.cr.a.every(Boolean) && R.cr.b === 0 && R.cr.c === 1, 'r30Crack: tre tunga träffar fäller statyn ' + JSON.stringify(R.cr));
await gwait(0.8);
// ---- mätning: 60 spruckna väggar ----
const big = { W: 48, H: 40, put: [], pin: [2.5, 20.5] }; for (let x = 6; x < 46; x += 4) for (let y = 1; y < 39; y++) big.put.push(['1', x, y]); // tio väggar tvärs över salen
for (let x = 6; x < 46; x += 4) big.put.push(['.', x, 2]); // en öppning upptill i varje vägg (omvägen)
await ready(big);
R.marked = await ev(() => { const g = __game; let n = 0; for (let x = 6; x < 46; x += 4) for (let y = 8; y < 38 && n < 60; y += 5) if (g.r30.mark(x, y)) n++; return n; });
const bench = () => ev(() => __game.v28.bench(40));
R.b0 = await bench();
R.boom = await ev(() => { const g = __game, t0 = performance.now(); for (const c of g.r30.cells()) g.r30.boom(c.x + 0.5, c.y + 0.5, 1.2); const t1 = performance.now(); return { ms: +(t1 - t0).toFixed(2), done: g.r30.cells().filter(c => c.done).length, parts: g.particles().length }; });
R.frames = await ev(() => new Promise(res => { const ts = []; let last = performance.now(); const k = () => { const t = performance.now(); ts.push(t - last); last = t; if (ts.length < 90) requestAnimationFrame(k); else { ts.sort((a, b) => a - b); res({ med: +ts[45].toFixed(1), p90: +ts[81].toFixed(1), max: +ts[89].toFixed(1) }); } }; requestAnimationFrame(k); }));
await gwait(2.5); R.b1 = await bench(); R.left = await ev(() => ({ decals: __game.r30.decals().length, parts: __game.particles().length }));
const ref = { ...big, put: big.put.slice() }; for (let x = 6; x < 46; x += 4) for (let y = 8; y < 38; y += 5) ref.put.push(['.', x, y]); // samma sal med öppningarna från början (inga ras)
await shot('manga_ras');
// jämförelse: växelvis samma sal med öppningarna från början och salen där 60 väggar rasat (bästa medianen av tre, mätningen brusar ±40 %)
const coll = async () => { await ready(big); await ev(() => { const g = __game; for (let x = 6; x < 46; x += 4) for (let y = 8; y < 38; y += 5) g.r30.mark(x, y); for (const c of g.r30.cells()) g.r30.boom(c.x + 0.5, c.y + 0.5, 1.2); }); await gwait(2.5); return (await bench()).med; };
R.ref = []; R.coll = []; for (let k = 0; k < 3; k++) { await ready(ref); R.ref.push((await bench()).med); R.coll.push(await coll()); }
R.b2 = Math.min(...R.ref); R.b1m = Math.min(...R.coll);
console.log('MÄT ' + JSON.stringify(R));
ok(R.marked === 60 && R.boom.done === 60, '60 spruckna väggar rasar ' + JSON.stringify({ märkta: R.marked, rasade: R.boom.done }));
ok(R.boom.ms < 400, 'ett ras av 60 väggar på en gång tar ' + R.boom.ms + ' ms (ljud, partiklar, golv och ljus)');
ok(R.b1m < R.b2 * 1.3 + 0.5, 'render() efter 60 ras är inte långsammare än samma sal med öppningarna från början ' + JSON.stringify({ sprucket: R.b0.med, rasat: R.coll, öppetFrånBörjan: R.ref, kvar: R.left }) + ' (grusbitarna på golvet är högst 70, som blodpölarna)');
fs.writeFileSync('out/t187/res.json', JSON.stringify(R, null, 1));
await ev(() => { window.__pin = null; clearInterval(window.__hold); });
ok(cerr.length === 0, 'inga fel i konsolen ' + [...new Set(cerr)].slice(0, 3).join(' / '));
await done();
