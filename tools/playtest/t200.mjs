// t200: version 30 (ALTARE) – förbundets altare: var det står. Samma frö ger samma ruta (två laddningar av samma våning, och en ny sida), banan
// är i övrigt exakt densamma med altaret av (kartan utom altarets ruta, fienderna, föremålen och kistorna), altaret står på ungefär var tredje vanlig
// våning (djup 2–40), med fritt runt om (alla åtta grannar är golv), nåbart från spelaren utan nyckel och en bit bort. Aldrig på bossvåningar, blodvåningar, i en
// egen bana, i Avgrunden eller i labyrinten – inte ens med ?a30altar=1 (ett altare på varje tillåten våning). Inga sidfel. Port 9900.
import { setup } from './head.mjs';
const PORT = +(process.env.T200_PORT || 9900);
const { pg, ev, wait, ok, done, until } = await setup(PORT, 'out/t200');
pg.setDefaultTimeout(120000);
const load = async (q = '') => { await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&seed=t200${q}`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 120000 }); await ev(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; __game.begin('new'); }); await wait(600); await ev(() => { if (window.CardUI && CardUI.isOpen()) { const el = document.querySelector('.cu-card:not(.owned), .cu-opt, .cu-btn'); if (el) el.click(); } }); await until(() => __game.state() === 'play', 5); };
const snap = d => ev(d => { const g = __game; g.loadFloor(d); const s = g.a30.state(), m = g.mapRef ? g.mapRef() : null;
  const map = (m || []).map(r => r.join('')), al = s.altar;
  return { altar: al, normal: s.normal, map, ents: g.ents().map(e => e.type + '@' + e.x.toFixed(2) + ',' + e.y.toFixed(2)).join('|'), items: g.items().map(i => i.type + '@' + i.x.toFixed(2) + ',' + i.y.toFixed(2)).join('|'), chests: g.chests().map(c => c.x + ',' + c.y + (c.rare ? 'r' : '') + (c.locked ? 'l' : '')).join('|'), biome: g.lvl().biome, boss: !!g.boss(), P: [g.P.x, g.P.y] }; }, d);
await load();
// 1. samma frö: samma ruta två gånger på samma sida, och utan altaret är banan densamma
const rows = [];
let hits = 0, normals = 0, same = true, diffOff = 0, open8 = true, near = true, reach = true;
for (let d = 2; d <= 40; d++) {
  const a = await snap(d), b = await snap(d);
  if (a.boss) continue;
  normals++;
  if (JSON.stringify(a.altar) !== JSON.stringify(b.altar)) same = false;
  if (!a.altar) continue;
  hits++;
  const { x, y } = a.altar;
  const chk = await ev(([x, y]) => { const g = __game, m = g.mapRef(); let open = true; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) { if (m[y + dy][x + dx] !== '.') open = false; }
    const mh = m.length, mw = m[0].length, seen = new Uint8Array(mw * mh), q = [(g.P.y | 0) * mw + (g.P.x | 0)], doors = g.doors(); seen[q[0]] = 1; let r = false; // spelarens väg: väggar och rekvisita stoppar, dörrar (utom låsta) går att öppna
    for (let h = 0; h < q.length && !r; h++) { const c = q[h], cx = c % mw, cy = (c / mw) | 0; if (Math.abs(cx - x) <= 1 && Math.abs(cy - y) <= 1 && !(cx === x && cy === y)) r = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy, n = ny * mw + nx; if (nx < 0 || ny < 0 || nx >= mw || ny >= mh || seen[n]) continue; const dd = doors[nx + ',' + ny]; if (dd ? dd.locked : g.solid(nx + 0.5, ny + 0.5)) continue; seen[n] = 1; q.push(n); } }
    return { open, reach: r, ch: m[y][x], dist: Math.hypot(x + 0.5 - g.P.x, y + 0.5 - g.P.y) }; }, [x, y]);
  if (!chk.open) open8 = false; if (!chk.reach) reach = false; if (chk.dist < 5.5) near = false;
  if (rows.length < 4) { // altaret av: samma bana i övrigt
    await ev(() => __game.a30.set('on', false)); const c = await snap(d); await ev(() => __game.a30.set('on', true));
    let dm = 0; for (let yy = 0; yy < a.map.length; yy++) for (let xx = 0; xx < a.map[yy].length; xx++) if (a.map[yy][xx] !== c.map[yy][xx]) { dm++; if (!(xx === x && yy === y && a.map[yy][xx] === '˂' && c.map[yy][xx] === '.')) diffOff++; }
    if (dm !== 1 || a.ents !== c.ents || a.items !== c.items || a.chests !== c.chests || c.altar) diffOff++;
    rows.push({ d, x, y, ch: chk.ch, dist: +chk.dist.toFixed(1), dm });
  }
}
console.log('altare', hits, 'av', normals, 'vanliga våningar', JSON.stringify(rows));
ok(same, 'samma frö och djup: samma altarruta två gånger');
ok(hits >= normals * 0.18 && hits <= normals * 0.52, `ungefär var tredje vanlig våning (${hits} av ${normals})`);
ok(diffOff === 0 && rows.length > 0, 'med altaret av är banan i övrigt exakt densamma (kartan utom altarets ruta, fiender, föremål, kistor)');
ok(open8, 'alla åtta grannar till altaret är golv (stänger aldrig en gång)');
ok(reach, 'altaret nås från spelaren utan nyckel (väggar och rekvisita stoppar, olåsta dörrar öppnas)');
ok(near, 'altaret står en bit från spelarens start');
const first = await ev(() => { __game.loadFloor(4); return JSON.stringify(__game.a30.state().altar); });
// 2. ny sida, samma frö: samma rutor
await load();
const again = await ev(() => { __game.loadFloor(4); return JSON.stringify(__game.a30.state().altar); });
ok(first === again, 'samma frö på en ny sida: samma altare på djup 4 ' + again);
// 3. aldrig på bossvåningar, blodvåningar, egna banor, Avgrunden och labyrinten – även med ?a30altar=1
await load('&a30altar=1');
const forced = await ev(() => { const g = __game, out = {};
  g.loadFloor(2); out.normal2 = !!g.a30.state().altar;
  g.loadFloor(6); out.boss6 = !!g.a30.state().altar || g.props().some(p => p.ch === g.a30.CH);
  g.v28g.force(3, { blood: true }); g.loadFloor(3); out.blood3 = !!g.a30.state().altar; out.bloodOn = g.v28g.state().blood;
  const grid = []; for (let y = 0; y < 15; y++) { const r = []; for (let x = 0; x < 22; x++) r.push(x === 0 || y === 0 || x === 21 || y === 14 ? '1' : '.'); grid.push(r); } grid[7][3] = 'P';
  g.playCustom({ grid, biome: 'dungeon' }); out.custom = !!g.a30.state().altar;
  return out; });
await wait(500);
const abyss = await ev(() => { const g = __game; g.beginAbyss(); if (window.CardUI && CardUI.isOpen()) CardUI.close(); g.loadFloor(2); const a = !!g.a30.state().altar; g.loadFloor(3); return a || !!g.a30.state().altar; });
await wait(300);
const maze = await ev(() => { const g = __game; g.beginMaze(); return !!g.a30.state().altar; });
console.log(JSON.stringify({ forced, abyss, maze }));
ok(forced.normal2, '?a30altar=1: altaret står på en vanlig våning');
ok(!forced.boss6, 'aldrig på bossvåningen');
ok(forced.bloodOn && !forced.blood3, 'aldrig på blodvåningen');
ok(!forced.custom, 'aldrig i en egen bana');
ok(!abyss && !maze, 'aldrig i Avgrunden eller labyrinten');
// 4. ?a30off=1: inget altare och inga förbund
await load('&a30off=1&a30altar=1');
const off = await ev(() => { const g = __game; g.loadFloor(2); return { a: g.a30.state().altar, on: g.a30.state().on }; });
ok(!off.a && !off.on, '?a30off=1: inget altare');
await done();
