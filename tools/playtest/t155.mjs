// t155: version 28 (GEN), nya bantyper. Den översvämmade salen (med djupa bassänger), vakttornet och balkongen spelas var för sig från start till
// utgång: spelaren går den kortaste vägen (dörrar öppnas med E, fienderna står still och gör ingen skada) tills våningen är klar (state 'stats').
// Scenens namn visas när spelaren kliver in i rummet, de djupa bassängerna är djupt vatten Đ i spelet, och fönstret ǂ är en vägg: man kan inte gå
// igenom det och siktlinjen (fiendernas sensorer) är blockerad. En bana med fönster mot ett rum längre fram visar en glimt av målet när spelaren
// står vid fönstret. Väktarens sal låses när spelaren går igenom den: de dörrarna låses upp igen (väktaren står still). En bana med opts.v28off fungerar. Alla väntetider i speltid (__game.roles.t()). Inga sidfel.
// Skärmbilder: OUT (standard tools/playtest/out/t155, eller miljövariabeln LVL28_OUT): karta och förstapersonsvy per scen och fönster.
import { setup } from './head.mjs';
const PORT = 9855, OUT = process.env.LVL28_OUT || 'out/t155';
const { pg, ev, wait, ok, start, done } = await setup(PORT, OUT);
await start();
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(60); } };
const gwait = sec => until(null, sec);
const load = (seed, depth, opts) => ev(([s, d, o]) => { const g = __game, L = Gen.floor(s, d, o); g.startLevel(L); g.resume && g.resume(); return { scenes: L.scenes28, windows: L.windows28, deep: L.deep28, biome: L.biome, blood: L.blood28 }; }, [seed, depth, opts]);
const find = (kind, biomes, depth, extra = {}) => ev(([kind, biomes, depth, extra]) => { for (let i = 0; i < 200; i++) { const b = biomes[i % biomes.length], o = Object.assign({ biome: b, v28: { scenes: kind ? [kind] : [], blood: false } }, extra), L = Gen.floor('t155-' + (kind || 'win') + i, depth, o);
  if (kind ? L.scenes28.some(s => s.kind === kind) && (kind !== 'floodhall' || L.deep28.length) : L.windows28.length) return ['t155-' + (kind || 'win') + i, o]; } return null; }, [kind, biomes, depth, extra]);
const calm = () => ev(() => { const g = __game; for (const e of g.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } g.P.hp = 99999; window.__calm = setInterval(() => { const P = __game.P; P.hp = 99999; for (const e of __game.ents()) if (e.d && (e.d.speed || e.d.dmg)) e.d = { ...e.d, speed: 0, dmg: 0 }; }, 100); });
const uncalm = () => ev(() => clearInterval(window.__calm));
const drawMap = () => ev(() => { const L = __game.lvl(), m = __game.mapRef(), H = m.length, W = m[0].length, s = 13, c = document.createElement('canvas'); c.id = 'lvl28map'; c.width = W * s; c.height = H * s + 22;
  Object.assign(c.style, { position: 'fixed', left: '10px', top: '10px', zIndex: 99, background: '#000' }); const g = c.getContext('2d'); const sc = new Set();
  for (const o of L.scenes28 || []) for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) sc.add(y * W + x);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const ch = m[y][x]; let col = '#2a2420';
    if (sc.has(y * W + x)) col = '#4a4020';
    if (ch === 'ǂ') col = '#ff40ff'; else if (__game.solid(x + 0.5, y + 0.5) && !'D'.includes(ch)) col = '#8a7a66'; else if (ch === 'D') col = '#c08040'; else if (ch === '-') col = '#3060c0'; else if (ch === 'Đ') col = '#102080';
    if (L.exit && L.exit.x === x && L.exit.y === y) col = '#40c0ff';
    g.fillStyle = col; g.fillRect(x * s, y * s, s - 1, s - 1); }
  for (const e of __game.ents()) if (!e.dead) { g.fillStyle = '#ff3040'; g.fillRect(e.x * s - 4, e.y * s - 4, 8, 8); }
  const P = __game.P; g.fillStyle = '#40ff60'; g.fillRect(P.x * s - 5, P.y * s - 5, 10, 10);
  g.fillStyle = '#fff'; g.font = '14px monospace'; g.fillText(L.biome + ' · ' + (L.scenes28 || []).map(o => o.kind).join(', ') + ' · fönster ' + (L.windows28 || []).length, 4, H * s + 16);
  document.body.appendChild(c); });
const hideMap = () => ev(() => { const c = document.getElementById('lvl28map'); if (c) c.remove(); });
const pathToExit = (avoid = []) => ev(av => { const g = __game, L = g.lvl(), m = L.map, H = m.length, W = m[0].length, x0 = Math.floor(g.P.x), y0 = Math.floor(g.P.y), ex = L.exit;
  const v = g.v24(), pass = (x, y) => { const c = m[y][x]; if (av.includes(x + ',' + y)) return false; const gc = v.cell(x, y), soft = 'cjiFzűƪǐǵǶȆɏʁȝ<>:"-°¨_ŬŹźŸƖƥǍǏǛǱȂȃȖȗȘȚȲȳɍɎɣɰɱʀʋʌĐĒĔĜĿŀţŤť'; return c === 'D' || c === 'x' || c === 'P' || soft.includes(gc) || soft.includes(c) || (v.walk(x, y) && !'|]{*'.includes(c)); }; // (spelets egen gångbarhet för fiender, plus rekvisita som inte blockerar och fällor/farliga golv som spelaren kan gå över)
  const prev = new Int32Array(W * H).fill(-2), q = [y0 * W + x0]; prev[q[0]] = -1;
  for (let h = 0; h < q.length; h++) { const c = q[h], x = c % W, y = (c / W) | 0; if (x === ex.x && y === ex.y) break; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, n = ny * W + nx; if (nx < 0 || ny < 0 || nx >= W || ny >= H || prev[n] !== -2 || !pass(nx, ny)) continue; prev[n] = c; q.push(n); } }
  const out = []; for (let c = ex.y * W + ex.x; c >= 0 && prev[c] !== -2; c = prev[c]) out.push([c % W, (c / W) | 0]); return out.reverse(); }, avoid);
const walk = async path0 => { let path = path0; const avoid = []; for (let i = 1; i < path.length; i++) {
  const [x, y] = path[i], [px, py] = path[i - 1];
  const st = await ev(([x, y, px, py]) => { const g = __game, d = g.doors()[x + ',' + y]; if (d && d.open < 0.9) { d.glock = false; g.P.x = px + 0.5; g.P.y = py + 0.5; g.P.a = Math.atan2(y - py, x - px); g.useKey(); return 'door'; } g.P.x = x + 0.5; g.P.y = y + 0.5; g.P.a = Math.atan2(y - py, x - px); return g.state(); }, [x, y, px, py]);
  if (st === 'door') { const opened = await until(([x, y]) => { const d = __game.doors()[x + ',' + y]; return !d || d.open > 0.9; }, 3, [x, y]);
    if (!opened) { avoid.push(x + ',' + y); if (avoid.length > 6) return 'fast'; path = await pathToExit(avoid); i = 0; if (path.length < 2) return 'ingen väg (stängda dörrar ' + avoid.join(' ') + ', spelaren vid ' + px + ',' + py + ')'; continue; }
    i--; continue; }
  if (st !== 'play') return st;
  if (i % 2 === 0) await gwait(0.05);
} await gwait(0.3); return ev(() => __game.state()); };
// vy mot scenen från en fri ruta i rummet
const viewScene = async (s, name) => { const v = await ev(s => { const L = __game.lvl(), m = __game.mapRef(), cx = s.x + s.w / 2, cy = s.y + s.h / 2; let best = null, bd = 1e9;
  for (let y = 0; y < m.length; y++) for (let x = 0; x < m[0].length; x++) { if (L.roomMask[y][x] === '-' || L.roomMask[y].charCodeAt(x) - 48 !== s.room || __game.solid(x + 0.5, y + 0.5) || m[y][x] === 'Đ' || (L.exit && Math.abs(L.exit.x - x) + Math.abs(L.exit.y - y) <= 1)) continue; const d = Math.abs(Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - 3.2); if (d < bd) { bd = d; best = [x, y]; } }
  return best ? [best[0], best[1], cx, cy] : null; }, s);
  if (!v) return false; await ev(([x, y, cx, cy]) => { const P = __game.P; P.x = x + 0.5; P.y = y + 0.5; P.a = Math.atan2(cy - y - 0.5, cx - x - 0.5); }, v); await gwait(2.5); await pg.screenshot({ path: `${OUT}/${name}_vy.png` }); return true; };
const SCENES = [['floodhall', ['dungeon', 'sewer', 'harbor', 'caves', 'prison'], 3], ['tower', ['dungeon', 'frost', 'courtyard', 'prison', 'crystal', 'cathedral'], 3], ['balcony', ['frost', 'courtyard', 'dungeon', 'lab', 'library', 'prison'], 3]];
for (const [kind, biomes, d] of SCENES) {
  const f = await find(kind, biomes, d); if (!f) { ok(false, kind + ': ingen bana hittades'); continue; }
  const info = await load(f[0], d, f[1]); await gwait(0.3); await calm();
  const home = await ev(() => [__game.P.x, __game.P.y, __game.P.a]);
  const s = info.scenes.find(o => o.kind === kind);
  ok(!!s, `${kind}: banan ${f[0]} i ${info.biome} har scenen ${JSON.stringify(s)}`);
  if (kind === 'floodhall') { const dd = await ev(D => D.filter(c => __game.mapRef()[c.y][c.x] === 'Đ').length, info.deep); ok(dd === info.deep.length && dd > 0, `floodhall: ${dd} av ${info.deep.length} djupa bassängrutor är djupt vatten Đ i spelet`); }
  if (kind !== 'floodhall') { // fönstret ǂ: vägg, ingen siktlinje igenom
    const w = await ev(s => { const m = __game.mapRef(); for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) if (m[y][x] === 'ǂ') { for (const [dx, dy] of [[1, 0], [0, 1]]) { const a = m[y - dy] && m[y - dy][x - dx], b = m[y + dy] && m[y + dy][x + dx]; if (a && b && !__game.solid(x - dx + 0.5, y - dy + 0.5) && !__game.solid(x + dx + 0.5, y + dy + 0.5)) return { x, y, solid: __game.solid(x + 0.5, y + 0.5), los: __game.hasLOS(x - dx + 0.5, y - dy + 0.5, x + dx + 0.5, y + dy + 0.5) }; } } return null; }, s);
    ok(w && w.solid && !w.los, `${kind}: fönstret ǂ är en vägg och blockerar siktlinjen ${JSON.stringify(w)}`);
  }
  await drawMap(); await pg.screenshot({ path: `${OUT}/${kind}_karta.png` }); await hideMap();
  await viewScene(s, kind);
  const shown = (await ev(() => __game.v28g.state().shown));
  ok(shown.includes(kind), `${kind}: scenens namn visas när spelaren kliver in (${JSON.stringify(shown)}, ${await ev(() => __game.msgs().map(m => m.text).join(' | '))})`);
  await ev(h => { const P = __game.P; P.x = h[0]; P.y = h[1]; P.a = h[2]; }, home); // (tillbaka till start)
  const path = await pathToExit();
  ok(path.length > 5, `${kind}: det finns en väg till utgången (${path.length} rutor)`);
  const st = await walk(path);
  ok(st === 'stats', `${kind}: våningen spelas till utgången (state ${st})`);
  await uncalm();
}
// fönster mot ett rum längre fram: glimten när spelaren står vid fönstret
{
  const f = await find(null, ['dungeon', 'frost', 'prison', 'library', 'cathedral', 'foundry', 'tomb'], 3, {});
  if (!f) ok(false, 'fönster: ingen bana hittades');
  else {
    f[1].v28.windows = 2;
    const info = await load(f[0], 3, f[1]); await gwait(0.3); await calm();
    const w = info.windows[0];
    ok(!!w, 'fönster: ' + JSON.stringify(info.windows));
    if (w) {
      const c = w.cells[0];
      const r = await ev(([w, c]) => { const g = __game, m = g.mapRef(); return { ch: m[c.y][c.x], solid: g.solid(c.x + 0.5, c.y + 0.5), los: g.hasLOS(w.from.x + 0.5, w.from.y + 0.5, 2 * c.x - w.from.x + 0.5, 2 * c.y - w.from.y + 0.5) }; }, [w, c]);
      ok(r.ch === 'ǂ' && r.solid && !r.los, 'fönster: ǂ är vägg, ingen siktlinje igenom ' + JSON.stringify(r));
      await ev(([w, c]) => { const P = __game.P; P.x = w.from.x + 0.5; P.y = w.from.y + 0.5; P.a = Math.atan2(c.y - w.from.y, c.x - w.from.x); }, [w, c]);
      await gwait(0.7); await pg.screenshot({ path: `${OUT}/fonster_vy.png` });
      // gå mot fönstret: spelaren kommer inte igenom
      for (let i = 0; i < 20; i++) await ev(([c]) => { const g = __game, P = g.P; const dx = c.x + 0.5 - P.x, dy = c.y + 0.5 - P.y, d = Math.hypot(dx, dy) || 1; const nx = P.x + dx / d * 0.08, ny = P.y + dy / d * 0.08; if (!g.solid(nx, ny)) { P.x = nx; P.y = ny; } }, [c]);
      const inside = await ev(c => Math.floor(__game.P.x) === c.x && Math.floor(__game.P.y) === c.y, c);
      ok(!inside, 'fönster: spelaren kommer inte in i rutan ǂ');
      const shown = await ev(() => __game.v28g.state().shown);
      ok(shown.some(k => k.startsWith('win:')), 'fönster: glimten av målet visas ' + JSON.stringify(shown) + ' ' + await ev(() => __game.msgs().map(m => m.text).join(' | ')));
      await drawMap(); await pg.screenshot({ path: `${OUT}/fonster_karta.png` }); await hideMap();
      const path = await pathToExit(); const st = await walk(path);
      ok(st === 'stats', `fönster: våningen spelas till utgången (state ${st}, ${path.length} rutor)`);
    }
    await uncalm();
  }
}
// opts.v28off: inga version 28-fält, banan startar
{
  await load('t155-av', 2, { biome: 'dungeon', v28off: true }); await gwait(0.3);
  const v = await ev(() => ({ st: __game.state(), has: 'scenes28' in __game.lvl(), v: __game.v28g.state() }));
  ok(!v.has && v.st === 'play' && !v.v.shown.length && !v.v.blood, 'opts.v28off: inga version 28-fält och banan startar ' + JSON.stringify(v));
}
await done();
