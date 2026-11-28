// t151: version 28 (REND) – blod i taket. Överdöd på en köttfiende inomhus lämnar fläckar i taket ovanför (syns på bilden: taket
// skiljer med och utan fläckarna) och droppar en stund; en vanlig död gör det inte; BLOD AV ger inga och tar bort de som finns;
// taket för antalet fläckar håller (48/24/12 med lowfx); en stor smäll inomhus sotar taket, utomhus händer inget; lowfx ger inga
// droppar. Inga sidfel. Väntan i speltid. Port 9851.
import { setup } from './head.mjs';
const PORT = 9851;
const { pg, ev, wait, ok, shot, done } = await setup(PORT, 'out/t151');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const sceneFn = o => { const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: !!o.lowfx, blood: o.blood ?? 2, noFlash: false, reduceMotion: false });
  const W = 20, H = 13, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[6][5] = 'P'; grid[1][1] = 'x'; for (const [t, x, y] of o.en || []) grid[y][x] = t;
  g.playCustom({ grid, biome: o.biome || 'dungeon' });
  for (const e of g.ents()) { e.d = { ...e.d, speed: 0, dmg: 0 }; e.alert = false; }
  g.P.hp = 1e6; clearInterval(window.__hold); window.__pin = [5.5, 6.5]; g.P.a = 0; g.P.pitch = 0; g.P.look = 0; g.lvl().ambient = 1.1;
  window.__hold = setInterval(() => { const P = __game.P; P.hp = 1e6; if (window.__pin) { P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = 0; P.vx = P.vy = 0; } }, 30); };
const scene = o => pg.evaluate(sceneFn, o);
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);
const ready = async o => { await scene(o); await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await gwait(0.3); };
const killAll = over => ev(over => { const g = __game; for (const e of g.ents()) if (!e.dead && e.x < 14) g.hurtEnemy(e, over ? e.hp + 999 : e.hp, e.x, e.y); return g.ents().filter(e => e.x < 14).map(e => !!e.overkill); }, over);
const N = () => ev(() => __game.v28.n());
// taket i bild med och utan fläckarna (samma bildruta)
const ceilDiff = () => ev(() => { const g = __game, c = document.getElementById('screen'), cx = c.getContext('2d'), C = g.v28.C, m = C.m;
  const grab = () => { g.v28.render(); return cx.getImageData(0, 0, c.width, c.height).data.slice(); };
  const A = grab(); C.m = null; const B = grab(); C.m = m;
  let n = 0, top = 0; for (let i = 0; i < A.length; i += 4) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 24) { n++; if (i / 4 / c.width < c.height / 2) top++; } return { n, top }; });

// 1) överdöd inomhus: fläckar i taket ovanför, och de syns
await ready({ en: [['Ä', 8, 6], ['Ä', 9, 5], ['Ä', 9, 7], ['Ä', 18, 11]] });
const n0 = await N(); const ov = await killAll(true); await gwait(0.4);
const n1 = await N(), stains = await ev(() => __game.v28.stains());
ok(ov.every(Boolean) && n1.blood - n0.blood >= 3 && stains.length >= 2 && stains.every(s => s.x >= 6 && s.x <= 11 && s.y >= 3 && s.y <= 9 && s.b > 0), 'överdöd: fläckar i taket ovanför fienderna ' + JSON.stringify({ blood: n1.blood - n0.blood, stains }));
const d1 = await ceilDiff();
ok(d1.top > 100 && d1.top >= d1.n * 0.9, 'fläckarna syns i taket (bara ovanför horisonten) ' + JSON.stringify(d1));
await shot('tak_rakt_fram');
await ev(() => { window.__pin = [7.5, 6.5]; __game.P.pitch = 110; }); await gwait(0.25); await ev(() => { __game.P.pitch = 110; }); await shot('tak_uppat'); await ev(() => { __game.P.pitch = 0; window.__pin = [5.5, 6.5]; });
await gwait(1.2); const n2 = await N();
ok(n2.drips > 0, 'det droppar från taket en stund ' + n2.drips);
// 2) en vanlig död: inget i taket
await ready({ en: [['Ä', 8, 6]] }); const a0 = await N(); await killAll(false); await gwait(0.4); const a1 = await N();
ok(a1.blood === a0.blood && a1.cnt === 0, 'en vanlig död stänker inte i taket ' + JSON.stringify({ blood: a1.blood - a0.blood, cnt: a1.cnt }));
// 3) BLOD AV: inga fläckar, och de som finns försvinner
await ready({ en: [['Ä', 8, 6], ['Ä', 9, 6]] }); await ev(() => { const g = __game, e = g.ents()[0]; g.hurtEnemy(e, e.hp + 999, e.x, e.y); }); await gwait(0.2);
const b0 = await N(); await ev(() => { __game.settings.blood = 0; }); await gwait(0.3); const b1 = await N();
await ev(() => { const g = __game, e = g.ents()[1]; g.hurtEnemy(e, e.hp + 999, e.x, e.y); }); await gwait(0.5); const b2 = await N();
ok(b0.cnt >= 1 && b1.cnt === 0 && b2.blood === b1.blood && b2.cnt === 0 && b2.drip === 0, 'BLOD AV: inga fläckar i taket och de som fanns tas bort ' + JSON.stringify({ före: b0.cnt, efter: b1.cnt, nya: b2.blood - b1.blood }));
const offD = await ceilDiff(); ok(offD.n === 0, 'BLOD AV: taket ser ut som förut ' + JSON.stringify(offD));
await ev(() => { __game.settings.blood = 2; });
// 4) taket för antalet fläckar: MYCKET 48, NORMAL 24, lowfx 12 (äldsta först, samma ruta räknas en gång)
const capT = await ev(() => { const g = __game, out = {}; for (const [k, set] of [['mycket', { blood: 2, lowfx: false }], ['normal', { blood: 1, lowfx: false }], ['lowfx', { blood: 2, lowfx: true }]]) {
  Object.assign(g.settings, set); g.v28.clear(); for (let i = 0; i < 200; i++) g.v28.stain(1.5 + (i % 18), 1.5 + ((i / 18) | 0) % 11); const a = g.v28.n().cnt; g.v28.stain(1.5, 1.5); g.v28.stain(1.5, 1.5); out[k] = { cnt: a, cap: g.v28.cap(), again: g.v28.n().cnt, mapN: g.v28.C.m.filter(Boolean).length }; }
  Object.assign(g.settings, { blood: 2, lowfx: false }); g.v28.clear(); return out; });
ok(Object.values(capT).every(c => c.cnt === c.cap && c.again === c.cap && c.mapN === c.cap) && capT.mycket.cap === 48 && capT.normal.cap === 24 && capT.lowfx.cap === 12, 'taket för antalet fläckar håller ' + JSON.stringify(capT));
// 5) lowfx: fläckar men inga droppar
await ready({ en: [['Ä', 8, 6]], lowfx: true }); const l0 = await N(); await killAll(true); await gwait(1); const l1 = await N();
ok(l1.blood > l0.blood && l1.drips === l0.drips && l1.drip === 0, 'lowfx: fläckar i taket men inga droppar ' + JSON.stringify({ blood: l1.blood - l0.blood, drips: l1.drips - l0.drips }));
// 6) smällar: inomhus sot i taket, utomhus inget
await ready({}); const s0 = await N(); await ev(() => __game.explode(9.5, 6.5, 0, 2.5, false, true)); await gwait(0.3); const s1 = await N();
ok(s1.soot === s0.soot + 1 && s1.cnt === 1, 'en stor smäll inomhus sotar taket ' + JSON.stringify({ soot: s1.soot - s0.soot }));
await shot('sot');
await ready({ biome: 'forest', en: [['Ä', 8, 6]] });
const sky = await ev(() => !!__game.lvl().sky);
const o0 = await N(); await killAll(true); await ev(() => __game.explode(9.5, 6.5, 0, 2.5, false, true)); await gwait(0.4); const o1 = await N();
ok(!sky || (o1.blood === o0.blood && o1.soot === o0.soot && o1.cnt === 0), 'utomhus under öppen himmel: inget i "taket" ' + JSON.stringify({ sky, blood: o1.blood - o0.blood, soot: o1.soot - o0.soot }));
// 7) V28.ceil av: inget
await ready({ en: [['Ä', 8, 6]] }); await ev(() => { __game.v28.V28.ceil = false; }); const f0 = await N(); await killAll(true); await gwait(0.3); const f1 = await N(); await ev(() => { __game.v28.V28.ceil = true; });
ok(f1.blood === f0.blood && f1.cnt === 0, 'V28.ceil av: inga fläckar ' + JSON.stringify({ blood: f1.blood - f0.blood }));
await ev(() => { window.__pin = null; clearInterval(window.__hold); });
await done();
