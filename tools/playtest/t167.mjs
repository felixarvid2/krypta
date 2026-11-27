// t167: version 29 (FÖNSTER) – rostiga galler ǃ och placeringen på riktiga våningar (Gen.floor).
// Rostigt galler: kulor biter inte (tre skott), två sparkar böjer men öppnar inte, den tredje böjer upp det (ʭ: gångbart, genväg i
// vägsökningen); en smäll böjer upp det direkt. Placering: på våningar med vakttorn, balkonger och fönster mot rum längre fram blir en
// del fönster glas eller rostiga galler – bara där båda sidorna redan hänger ihop utan lås (aldrig enda vägen, aldrig förbi ett lås),
// samma frö ger samma placering, lvl.map (gen.js utdata) ändras inte, F29.on = false ger inga nya tecken, och vanliga galler är kvar.
// Statistik över 40 frön (naturlig sannolikhet). Väntan i speltid. Port 9867.
import { setup } from './head.mjs';
const PORT = 9867;
const { pg, ev, wait, ok, shot, start, done } = await setup(PORT, 'out/t167');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) cerr.push(m.text().slice(0, 160)); }); // (spelets slinga fångar fel: de syns bara i konsolen)
await start();
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);
// ---- placering på riktiga våningar ----
const load = (seed, depth, force, on = true, runSeed) => ev(([seed, depth, force, on, runSeed]) => { const g = __game, f = g.f29; if (f) { f.F29.force = force; f.F29.on = on; }
  const L = Gen.floor(seed, depth, { v28: { scenes: ['tower', 'balcony'] } }), R = g.run(); R.depth = depth; R.seed = runSeed === undefined ? seed : runSeed; R.custom = false; R.practice = false; g.startLevel(L);
  const F = g.f29, m = F.map(), out = { name: L.name, win: (L.windows28 || []).length, scenes: (L.scenes28 || []).map(s => s.kind), nWin: 0, cells: F.cells(), diff: 0, other: 0, err: F.L().log.slice() };
  for (let y = 0; y < m.length; y++) for (let x = 0; x < m[0].length; x++) { const a = L.map[y][x], b = m[y][x]; if (a === 'ǂ') out.nWin++; if (a !== b) { if (a === 'ǂ' && (b === 'ǁ' || b === 'ǃ')) out.diff++; else if (a === 'ǂ' || b === 'ǁ' || b === 'ǃ') out.other++; } }
  const lab = F.labels(); out.conn = out.cells.every(c => { const s = [[c.x - 1, c.y, c.x + 1, c.y], [c.x, c.y - 1, c.x, c.y + 1]].find(([a, b, cc, d]) => lab[b * m[0].length + a] >= 0 && lab[b * m[0].length + a] === lab[d * m[0].length + cc]); return !!s; });
  out.genSame = JSON.stringify(L.map) === JSON.stringify(Gen.floor(seed, depth, { v28: { scenes: ['tower', 'balcony'] } }).map); f.F29.force = null; f.F29.on = true; return out; }, [seed, depth, force, on, runSeed]);
const cand = [];
for (let s = 100; s < 160 && cand.length < 6; s++) { const r = await load(s, 3, 'glass'); if (r.nWin) cand.push({ s, ...r }); }
ok(cand.length >= 3, 'hittade våningar med fönster ' + JSON.stringify(cand.map(c => [c.s, c.nWin, c.scenes.join('+'), c.win])));
const G = [], Rr = [];
for (const c of cand) { G.push(await load(c.s, 3, 'glass')); Rr.push(await load(c.s, 3, 'rust')); }
ok(G.some(r => r.cells.some(c => c.kind === 'glass')), 'tvingat glas: fönster blir glas ' + JSON.stringify(G.map(r => r.cells.length)));
ok(Rr.some(r => r.cells.some(c => c.kind === 'rust')), 'tvingat rost: vakttorn/balkong får rostiga galler ' + JSON.stringify(Rr.map(r => r.cells.length)));
ok([...G, ...Rr].every(r => r.conn), 'alla glas och rostiga galler sitter där båda sidorna redan hänger ihop (aldrig enda vägen, aldrig förbi ett lås)');
ok([...G, ...Rr].every(r => r.other === 0 && r.diff === r.cells.length), 'bara fönster ǂ ändras, inget annat i kartan ' + JSON.stringify([...G, ...Rr].map(r => [r.diff, r.other])));
ok([...G, ...Rr].every(r => r.genSame), 'gen.js utdata (lvl.map) är samma före och efter starten');
ok([...G, ...Rr].every(r => !r.err.length), 'inga fel i placeringen ' + JSON.stringify([...G, ...Rr].flatMap(r => r.err)));
await shot('vaning_glas');
// spelets våningar (loadFloor, naturlig sannolikhet): statistik över 40 körningsfrön på djup 2–4, samma frö ger samma placering,
// F29.on = false ger inga nya tecken, och en bana som startas direkt (startLevel, som testerna för version 28) får inget
const live = (seed, depth, on = true) => ev(([seed, depth, on]) => { const g = __game, R = g.run(); g.f29.F29.on = on; R.seed = seed; R.custom = false; R.practice = false; R.campaign = false; R.abyss = false;
  g.loadFloor(depth); g.f29.F29.on = true; const L = g.lvl(), n = L.map.reduce((a, r) => a + (r.match(/ǂ/g) || []).length, 0), c = g.f29.cells();
  return { n, cells: c.map(x => x.kind + x.x + ',' + x.y), glass: c.filter(x => x.kind === 'glass').length, rust: c.filter(x => x.kind === 'rust').length, boss: !!g.boss() }; }, [seed, depth, on]);
const st = { floors: 0, withWin: 0, glassFloors: 0, rustFloors: 0, glass: 0, rust: 0, wins: 0 }; let ex = null;
for (let s = 1; s <= 40; s++) { const r = await live(5000 + s, 2 + (s % 3)); if (r.boss) continue; st.floors++; if (r.n) st.withWin++; st.wins += r.n; st.glass += r.glass; st.rust += r.rust; if (r.glass) st.glassFloors++; if (r.rust) st.rustFloors++; if (!ex && r.cells.length) ex = [5000 + s, 2 + (s % 3)]; }
console.log('STAT ' + JSON.stringify(st));
ok(st.withWin === 0 || st.glass + st.rust > 0, 'spelets våningar: en del fönster blir glas eller rostiga galler ' + JSON.stringify(st));
if (ex) { const a1 = await live(ex[0], ex[1]), a2 = await live(ex[0], ex[1]), off = await live(ex[0], ex[1], false);
  ok(a1.cells.length > 0 && JSON.stringify(a1.cells) === JSON.stringify(a2.cells), 'samma frö ger samma glas och galler ' + JSON.stringify(a1.cells));
  ok(off.cells.length === 0, 'F29.on = false: inga nya tecken ' + JSON.stringify(off.cells)); }
const direct = await ev(() => { const g = __game, L = Gen.floor(133, 3, { v28: { scenes: ['tower', 'balcony'] } }), R = g.run(); R.depth = 3; R.seed = 133; g.startLevel(L); return g.f29.cells().length; });
ok(direct === 0, 'en bana som startas direkt med startLevel (testerna för version 28) får inget glas ' + direct);
// ---- rostigt galler i en egen bana ----
const sceneFn = o => { const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: false });
  const W = 24, H = 13, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 || x === 12 ? '1' : '.'); grid.push(r); }
  grid[1][12] = '.'; for (let y = 5; y <= 7; y++) grid[y][12] = o.win; grid[11][1] = 'x';
  g.playCustom({ grid, biome: o.biome || 'dungeon' }); g.P.hp = 1e6; clearInterval(window.__hold); window.__pin = [o.px || 8.5, 6.5]; g.P.a = 0; g.lvl().ambient = 1.1;
  window.__hold = setInterval(() => { const P = __game.P; P.hp = 1e6; if (window.__pin) { P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = 0; P.vx = P.vy = 0; } }, 30); };
const ready = async o => { await ev(sceneFn, o); await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await gwait(0.3); };
const cell = () => ev(() => { const g = __game; g.f29.updateFlow(); const c = g.f29.cells().find(c => c.x === 12 && c.y === 6), m = g.f29.map(); return { ...c, ch: m[6][12], walk: g.v28.walk(12, 6), los: g.v28.los(8.5, 6.5, 15.5, 6.5), flow: g.f29.flow()[6 * 24 + 15] }; });
await ready({ win: 'ǃ', px: 11.5 }); await shot('rost_helt');
const r0 = await cell();
await ev(async () => { const g = __game, P = g.P, WS = g.WS, i = g.WEAPONS.findIndex(w => w.id === 'pistol'); P.has[i] = true; P.weapon = i; for (let k = 0; k < 3; k++) { P.mags[i] = 9; WS.state = 'idle'; WS.cd = 0; WS.t = 0; WS.shot = 99; g.fire(); await new Promise(r => setTimeout(r, 120)); } });
await gwait(0.3); const r1 = await cell();
ok(r0.kind === 'rust' && !r1.open && r1.hp === r0.hp && !r0.walk && !r0.los, 'rostigt galler: en vägg, kulor biter inte ' + JSON.stringify({ r0, r1 }));
for (let k = 0; k < 2; k++) { await pg.keyboard.press('v'); await gwait(0.7); }
const r2 = await cell(); await shot('rost_bojt');
await pg.keyboard.press('v'); await gwait(0.7); const r3 = await cell(); await shot('rost_oppet');
ok(!r2.open && r2.hp === 1, 'två sparkar böjer men öppnar inte ' + JSON.stringify(r2));
ok(r3.open && r3.ch === 'ʭ' && r3.walk && r3.los && r3.flow < r0.flow - 6, 'den tredje sparken böjer upp gallret: gångbart, fri sikt, kortare väg för fienderna ' + JSON.stringify({ r0: r0.flow, r3 }));
await ready({ win: 'ǃ' }); await ev(() => __game.explode(11.2, 6.5, 10, 1.6, false)); await gwait(0.3);
const rb = await ev(() => __game.f29.cells().map(c => c.open));
ok(rb.every(Boolean), 'en smäll böjer upp rostiga galler direkt ' + JSON.stringify(rb));
// spelaren går genom det uppböjda gallret
await ev(() => { window.__pin = null; const P = __game.P; P.x = 10.5; P.y = 6.5; P.a = 0; });
await pg.keyboard.down('w'); await gwait(1.2); await pg.keyboard.up('w');
const px = await ev(() => __game.P.x);
ok(px > 12.6, 'spelaren går genom det uppböjda gallret ' + px.toFixed(2)); await shot('rost_genom');
await ev(() => { window.__pin = null; clearInterval(window.__hold); });
ok(cerr.length === 0, 'inga fel i konsolen ' + [...new Set(cerr)].slice(0, 3).join(' / '));
await done();
