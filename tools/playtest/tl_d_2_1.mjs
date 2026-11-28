// närstridsfiender fastnar inte vid väggens hörn när sikten fladdrar (flank −1/0/1, fyra hörnlayouter)
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/tl_d_2_1');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1`);
await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => { __game.profile.tutDone = true; });

// vägg i kolumn wx, raderna y0..y1; spelare (px,py), fiende (fx,fy); 'P' och 'x' på [rad][kolumn]
const LAYOUTS = [
  { id: 'A', wx: 10, y0: 1, y1: 11, p: [7.5, 8.5], f: [13.5, 8.5], P: [8, 3], X: [14, 22] },
  { id: 'B', wx: 10, y0: 5, y1: 14, p: [7.5, 8.5], f: [13.5, 8.5], P: [8, 3], X: [14, 22] },
  { id: 'C', wx: 13, y0: 5, y1: 14, p: [16.5, 8.5], f: [10.5, 8.5], P: [8, 20], X: [14, 1] },
  { id: 'D', wx: 13, y0: 1, y1: 11, p: [16.5, 8.5], f: [10.5, 8.5], P: [8, 20], X: [14, 1] },
];
const TYPES = ['Y', 'Q', 'Å'], FLANKS = [-1, 0, 1], LIMIT = 15000, NEAR = 1.5;
const results = []; let stateOk = true;

for (const L of LAYOUTS) {
  await ev(L => { const g = __game; g.profile.tutDone = true; const W = 24, H = 16, grid = [];
    for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
    for (let y = L.y0; y <= L.y1; y++) grid[y][L.wx] = '1';
    grid[L.P[0]][L.P[1]] = 'P'; grid[L.X[0]][L.X[1]] = 'x';
    g.playCustom({ grid, biome: 'dungeon' }); }, L);
  await wait(1500);
  const st = await ev(() => __game.state());
  ok(st === 'play', `bana ${L.id}: spelet är i läget play efter playCustom (${st})`);
  if (st !== 'play') { stateOk = false; continue; }

  for (const type of TYPES) for (const flank of FLANKS) {
    const made = await ev(([L, type, flank]) => { const g = __game;
      for (const e of g.ents()) e.dead = true;
      g.P.x = L.p[0]; g.P.y = L.p[1]; g.P.hp = 100;
      const e = g.spawnEnemy(type, L.f[0], L.f[1]); if (!e) return false;
      e.alert = true; e.flank = flank; window.__tlD21 = e; return true; }, [L, type, flank]);
    if (!made) { results.push({ L: L.id, type, flank, t: null, min: Infinity, pos: '-', err: 'ingen fiende skapad' }); continue; }
    const t0 = Date.now(); let min = Infinity, reached = null, pos = '', st2 = 'play';
    while (Date.now() - t0 < LIMIT) {
      await wait(250);
      const r = await ev(p => { const g = __game, P = g.P, e = window.__tlD21;
        P.x = p[0]; P.y = p[1]; P.hp = 100;
        return { d: Math.hypot(e.x - P.x, e.y - P.y), x: e.x, y: e.y, dead: !!e.dead, s: e.state, st: g.state() }; }, L.p);
      st2 = r.st; pos = `(${r.x.toFixed(1)}, ${r.y.toFixed(1)}) ${r.s}`;
      if (r.d < min) min = r.d;
      if (r.d < NEAR) { reached = Date.now() - t0; break; }
      if (r.dead || r.st !== 'play') break;
    }
    if (st2 !== 'play') stateOk = false;
    const res = { L: L.id, type, flank, t: reached, min, pos };
    results.push(res);
    console.log(`bana ${L.id} sort ${type} flank ${flank >= 0 ? ' ' : ''}${flank}: ${reached != null ? 'framme efter ' + (reached / 1000).toFixed(2) + ' s' : 'NÅDDE INTE FRAM'} minsta avstånd ${min.toFixed(2)} slutläge ${pos}${st2 !== 'play' ? ' spelläge ' + st2 : ''}`);
  }
}

const fail = results.filter(r => r.t == null);
const desc = r => `${r.L}/${r.type}/${r.flank}`;
for (const id of ['A', 'C']) {
  const cs = results.filter(r => r.L === id && r.flank === 1);
  ok(cs.length === 3 && cs.every(r => r.t != null), `bana ${id} med flank 1 (hörnfällan på HEAD): alla tre sorterna når spelaren (${cs.map(r => r.type + ' ' + (r.t != null ? (r.t / 1000).toFixed(1) + ' s' : 'min ' + r.min.toFixed(1))).join(', ')})`);
}
const rest = results.filter(r => !((r.L === 'A' || r.L === 'C') && r.flank === 1));
ok(rest.length === 30 && rest.every(r => r.t != null), `regressionsskydd: övriga 30 fall når fram (${rest.filter(r => r.t != null).length} av ${rest.length})${rest.some(r => r.t == null) ? ' – fast: ' + rest.filter(r => r.t == null).map(desc).join(' ') : ''}`);
ok(results.length === 36 && fail.length === 0, `alla 36 fall kommer under ${NEAR} rutor inom ${LIMIT / 1000} s (${36 - fail.length} av 36)${fail.length ? ' – fast: ' + fail.map(r => desc(r) + ' ' + r.pos).join('; ') : ''}`);
ok(stateOk, 'spelet stannade i läget play genom alla fall');
await done();
