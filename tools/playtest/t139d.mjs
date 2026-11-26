// t139d: version 27 (BLOOD), omgång 4. Blod på den sårade fiendens bild: ingen vid full hälsa, nivå 1/2/3 vid 70/50/30 % och allt fler
// blodpixlar, samma alfa som originalet (konturen följer); liket behåller sin nivå; inget på kristallgolemen (metall), bansheen (spöke)
// och skelettet (ben); inget med lowfx eller BLOD AV; NORMAL högst nivå 2. På skärmen: samma bildruta med och utan blod skiljer i rött;
// träffblinket (gfxE) blir fortfarande vitt. Cachen har ett tak (300 bilder) och en träff i cachen är billig. Köttbitar vid överdöd intill
// en vägg fastnar på väggen och glider ned (räknas i väggtaket). Mätning med åtta svårt sårade fiender i bild (4× strypning).
// Delar port 9839 med t139/t139b/t139c (körs inte samtidigt). Inga sidfel. Väntetider i speltid.
import { setup } from './head.mjs';
const PORT = 9839;
const { pg, ev, wait, ok, shot, done } = await setup(PORT, 'out/t139d');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const sceneFn = o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = false; g.settings.blood = 2; g.gfxE.set(true); g.v27b.set(true);
  const W = o.W || 18, H = o.H || 9, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[o.p[1]][o.p[0]] = 'P'; grid[1][1] = 'x'; for (const [t, x, y] of o.en) grid[y][x] = t;
  g.playCustom({ grid, biome: 'dungeon' });
  const E = g.ents(), spec = E.filter(e => !e.boss).map(e => [e.type, e.x, e.y]); E.length = 0; for (const [t, x, y] of spec) g.spawnEnemy(t, x, y);
  for (const e of E) { e.d = { ...e.d, dmg: 0, speed: 0 }; e.alert = true; e.state = 'idle'; }
  g.P.hp = 1e6; clearInterval(window.__hold); window.__pin = [g.P.x, g.P.y]; g.P.a = 0; g.P.pitch = 0; g.P.look = 0;
  window.__hold = setInterval(() => { __game.P.hp = 1e6; if (window.__pin) { __game.P.x = window.__pin[0]; __game.P.y = window.__pin[1]; __game.P.a = 0; } }, 30); };
const scene = o => pg.evaluate(sceneFn, o);
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);
const lvAt = (type, k, set = {}) => ev(([type, k, set]) => { const g = __game, e = g.ents().find(x => x.type === type); Object.assign(g.settings, set); e.hp = e.maxHp * k;
  const r = g.v27b.sprFor(e); g.settings.lowfx = false; g.settings.blood = 2; if (!r) return null; let n = 0, alpha = true; for (let i = 0; i < r.src.data.length; i++) { if (r.img.data[i] !== r.src.data[i]) n++; if ((r.img.data[i] >>> 24) !== (r.src.data[i] >>> 24)) alpha = false; } return { lv: r.lv, n, alpha }; }, [type, k, set]);

// 1) nivåerna på kultisten
await scene({ p: [5, 4], en: [['Ä', 8, 4], ['Ë', 8, 2], ['Ý', 8, 6], ['S', 9, 4]] }); await gwait(0.4);
const l0 = await lvAt('Ä', 1), l1 = await lvAt('Ä', 0.65), l2 = await lvAt('Ä', 0.45), l3 = await lvAt('Ä', 0.25);
ok(l0 === null && l1 && l2 && l3 && l1.lv === 1 && l2.lv === 2 && l3.lv === 3 && l1.n > 0 && l2.n > l1.n && l3.n > l2.n && l1.alpha && l3.alpha, 'kultisten: inget blod vid full hälsa, sedan allt mer (nivå 1/2/3), samma alfa ' + JSON.stringify({ l0, l1, l2, l3 }));
const oth = { metall: await lvAt('Ë', 0.2), spöke: await lvAt('Ý', 0.2), ben: await lvAt('S', 0.2) };
ok(!oth.metall && !oth.spöke && !oth.ben, 'inget blod på kristallgolemen, bansheen eller skelettet ' + JSON.stringify(oth));
const set = { lowfx: await lvAt('Ä', 0.2, { lowfx: true }), av: await lvAt('Ä', 0.2, { blood: 0 }), normal: await lvAt('Ä', 0.2, { blood: 1 }) };
ok(!set.lowfx && !set.av && set.normal && set.normal.lv === 2, 'lowfx och BLOD AV: inget; NORMAL: högst nivå 2 ' + JSON.stringify(set));
// 2) på skärmen: samma bildruta med 100 % och 25 % hälsa; och träffblinket är fortfarande vitt
const px = await ev(() => { const g = __game, e = g.ents().find(x => x.type === 'Ä'), c = document.getElementById('screen'), cx = c.getContext('2d');
  const grab = () => { g.v27b.render(); return cx.getImageData(0, 0, c.width, c.height).data.slice(); };
  e.hp = e.maxHp; const A = grab(); e.hp = e.maxHp * 0.25; const B = grab(); e.flash = 0.5; const F = grab(); e.flash = 0;
  let n = 0, r = 0, gg = 0, b = 0, white = 0; for (let i = 0; i < B.length; i += 4) { const d = Math.abs(B[i] - A[i]) + Math.abs(B[i + 1] - A[i + 1]) + Math.abs(B[i + 2] - A[i + 2]); if (d > 18) { n++; r += B[i]; gg += B[i + 1]; b += B[i + 2]; if (F[i] > 200 && F[i + 1] > 200 && F[i + 2] > 200) white++; } }
  return { n, r: Math.round(r / (n || 1)), g: Math.round(gg / (n || 1)), b: Math.round(b / (n || 1)), white }; });
ok(px.n > 15 && px.r > px.g * 1.6 && px.r > px.b * 1.6, 'på skärmen: den sårade kultisten har röda fläckar ' + JSON.stringify(px));
ok(px.white >= px.n * 0.9, 'träffblinket (gfxE) blir fortfarande vitt över fläckarna ' + JSON.stringify(px));
await ev(() => { window.__pin = [7.2, 4.5]; }); await gwait(0.2); await shot('saarad_kultist');
// 3) liket behåller nivån; cachen: tak och billig träff
const corpse = await ev(() => { const g = __game, e = g.ents().find(x => x.type === 'Ä'); e.hp = e.maxHp * 0.25; g.v27b.sprFor(e); g.hurtEnemy(e, e.hp + 0.2, e.x, e.y); const r = g.v27b.sprFor(e); return { dead: !!e.dead, lv: r && r.lv }; });
ok(corpse.dead && corpse.lv === 3, 'liket behåller sina fläckar ' + JSON.stringify(corpse));
const cache = await ev(() => { const g = __game, e = g.ents().find(x => x.type === 'Ä'); const hit = g.v27b.sprBench(e, 5000), cap = g.v27b.sprCap(400); return { hit: +hit.toFixed(5), cap, made: g.v27b.n.sprMade, clear: g.v27b.n.sprClear }; });
ok(cache.cap <= 300 && cache.clear >= 1 && cache.hit < 0.01, 'cachen: högst 300 bilder; en träff i cachen kostar ' + JSON.stringify(cache));
// 4) köttbitar som fastnar på väggen vid överdöd och glider ned
await scene({ p: [13, 4], en: [['Ä', 16, 4]] }); await gwait(0.4);
const wg = await ev(() => { const g = __game, e = g.ents()[0], n0 = g.v27b.n.wallGibs; g.hurtEnemy(e, e.hp + 999, e.x, e.y); return { over: !!e.overkill, gibs: g.v27b.n.wallGibs - n0, marks: g.v27b.gibMarks(), walls: g.v27b.walls(), cap: g.v27b.cap() }; });
ok(wg.over && wg.gibs >= 1 && wg.marks.length >= 1 && wg.walls <= wg.cap, 'överdöd intill väggen: köttbitar fastnar på väggen (inom väggtaket) ' + JSON.stringify(wg));
await gwait(0.3); await shot('vaggbit_1');
await gwait(2.5);
const wg2 = await ev(() => __game.v27b.gibMarks());
ok(wg2.length >= 1 && wg2.every((m, i) => m.z < m.z0 - 0.08), 'bitarna glider ned längs väggen ' + JSON.stringify(wg2));
await shot('vaggbit_2');
// 5) mätning: åtta svårt sårade kultister i bild mot samma utan blod (4× strypning, växelvis, median)
await scene({ W: 20, H: 11, p: [3, 5], en: [6, 7, 8, 9].flatMap(x => [['Ä', x, 4], ['Ä', x, 6]]) }); await gwait(0.4);
const cdp = await pg.context().newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await ev(() => __game.pause());
const B = { on: [], off: [] };
for (let i = 0; i < 6; i++) for (const k of [1, 0.2]) B[k === 1 ? 'off' : 'on'].push(await ev(k => { const g = __game; for (const e of g.ents()) e.hp = e.maxHp * k; g.particles().length = 0; return g.gfxW.bench(40).med; }, k));
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await ev(() => __game.resume());
const med = a => a.slice(1).sort((x, y) => x - y)[(a.length - 1) >> 1];
console.log('BENCH', JSON.stringify({ wounded: med(B.on), healthy: med(B.off) }));
ok(med(B.on) < med(B.off) * 1.15 + 0.5, `åtta svårt sårade kultister i bild (4× strypning): ${med(B.on)} ms med blod, ${med(B.off)} ms friska`);
await ev(() => clearInterval(window.__hold));
await done();
