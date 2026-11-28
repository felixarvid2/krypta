// Version 30 (SPEL): RAS i Ruinstaden på spelets egna våningar (loadFloor, djup 3–5, biomen tvingad med run.biomeChoice): spruckna väggar finns,
// och samma kontroller som t186 (båda sidorna i samma yta, river man alla slås inga ytor ihop och inga spärrade rutor öppnas, fristående pelare likaså).
// Glasbruket provas också (ugnstegel ʚ kan spricka, glashyllpanelen ʛ aldrig). Port 9893.
import { setup } from './head.mjs';
const PORT = 9893;
const { pg, ev, ok, start, done, gwait } = await setup(PORT, 'out/t193');
await start(); await gwait(1);
const live = (seed, depth, on = true, sugg = null) => ev(([seed, depth, on, sugg]) => { const g = __game, R = g.run(), r = g.r30; r.R30.on = on; R.seed = seed; R.biomeChoice = Object.assign({}, R.biomeChoice, { [depth]: sugg || 'ruins' }); R.custom = false; R.practice = false; R.campaign = false; R.abyss = false;
  g.loadFloor(depth); r.R30.on = true;
  const L = g.lvl(), m = r.map(), mw = m[0].length, mh = m.length, cells = r.cells(), SL = new Set([...r.SLOTS, r.RUB]);
  const genNew = L.map.some(row => [...row].some(c => SL.has(c)));
  // genvägar: sidorna i samma yta
  const lab0 = r.labels(); let bad = [];
  for (const c of cells) { const v = m[c.y - 1][c.x] && !g.v28.isWall(m[c.y - 1][c.x]) && !g.v28.isWall(m[c.y + 1][c.x]); const a = v ? lab0[(c.y - 1) * mw + c.x] : lab0[c.y * mw + c.x - 1], b = v ? lab0[(c.y + 1) * mw + c.x] : lab0[c.y * mw + c.x + 1]; if (!(a >= 0 && a === b)) bad.push([c.x, c.y, a, b]); }
  // river alla: inga ytor slås ihop
  const saved = cells.map(c => m[c.y][c.x]); for (const c of cells) m[c.y][c.x] = '.';
  const lab1 = r.labels(); for (let i = 0; i < cells.length; i++) m[cells[i].y][cells[i].x] = saved[i];
  const merge = new Map(); let merged = 0, newOpen = 0; const isC = new Set(cells.map(c => c.y * mw + c.x));
  for (let i = 0; i < mw * mh; i++) { if (isC.has(i)) continue; if (lab1[i] < 0) continue; if (lab0[i] < 0) { if (!g.v28.isWall(m[(i / mw) | 0][i % mw])) newOpen++; continue; } const k = lab1[i], s = merge.get(k); if (s === undefined) merge.set(k, lab0[i]); else if (s !== lab0[i]) merged++; }
  const detours = cells.map(c => c.det);
  // fristående väggpelare: river man alla slås inga ytor ihop heller
  const pil = new Map(); for (let y = 1; y < mh - 1; y++) for (let x = 1; x < mw - 1; x++) if (g.v28.isWall(m[y][x])) { const w = r.wallPillar(x, y); if (w) for (const [a, b] of w.cells) pil.set(b * mw + a, [a, b]); }
  const pc = [...pil.values()], psv = pc.map(([a, b]) => m[b][a]); for (const [a, b] of pc) m[b][a] = '.'; const lab2 = r.labels(); pc.forEach(([a, b], i) => { m[b][a] = psv[i]; });
  const merge2 = new Map(); let pMerged = 0, pNew = 0; for (let i = 0; i < mw * mh; i++) { if (pil.has(i) || lab2[i] < 0) continue; if (lab0[i] < 0) { if (!g.v28.isWall(m[(i / mw) | 0][i % mw])) pNew++; continue; } const k = lab2[i], q = merge2.get(k); if (q === undefined) merge2.set(k, lab0[i]); else if (q !== lab0[i]) pMerged++; }
  const fp = g.ents().map(e => e.type + (e.x | 0) + ',' + (e.y | 0)).join(';') + '|' + g.items().map(it => it.type + (it.x | 0) + ',' + (it.y | 0)).join(';');
  return { fp, pillars: pc.length, pMerged, pNew, biome: L.biome, boss: !!g.boss(), n: cells.length, cells: cells.map(c => c.ch + c.x + ',' + c.y), bases: [...new Set(cells.map(c => c.base))], bad, merged, newOpen, genNew, detours, sugg: r.L().sugg, log: r.L().log, cand: r.cand().length };
}, [seed, depth, on, sugg]);
for (const biome of ['ruins', 'glassworks']) {
  const st = { floors: 0, withCrack: 0, cracks: 0, bad: 0, merged: 0, newOpen: 0, genNew: 0, pillars: 0, pMerged: 0, pNew: 0, bases: new Set(), biomes: new Set() };
  for (let s = 1; s <= 30; s++) { const depth = 3 + (s % 3), r = await live(7300 + s, depth, true, biome); if (r.boss) continue; st.floors++; st.biomes.add(r.biome); if (r.n) st.withCrack++; st.cracks += r.n; for (const b of r.bases) st.bases.add(b);
    st.bad += r.bad.length; st.merged += r.merged; st.newOpen += r.newOpen; if (r.genNew) st.genNew++; st.pillars += r.pillars; st.pMerged += r.pMerged; st.pNew += r.pNew; }
  const out = { ...st, bases: [...st.bases], biomes: [...st.biomes] };
  console.log(biome.toUpperCase() + ' ' + JSON.stringify(out));
  ok(out.biomes.length === 1 && out.biomes[0] === biome && st.floors >= 25, `${biome}: spelets våningar (loadFloor) ` + JSON.stringify(out.biomes) + ' ' + st.floors);
  if (biome === 'ruins') ok(st.withCrack >= st.floors * 0.5, 'Ruinstaden: minst hälften av våningarna har spruckna väggar ' + JSON.stringify({ våningar: st.floors, med: st.withCrack, väggar: st.cracks, bases: out.bases }));
  else ok(!out.bases.includes('ʛ'), 'Glasbruket: glashyllpanelen ʛ spricker aldrig ' + JSON.stringify(out.bases));
  ok(st.bad === 0 && st.merged === 0 && st.newOpen === 0, `${biome}: varje sprucken vägg är en genväg utan att gå förbi ett lås ` + JSON.stringify({ bad: st.bad, merged: st.merged, newOpen: st.newOpen }));
  ok(st.pMerged === 0 && st.pNew === 0 && st.genNew === 0, `${biome}: fristående pelare slår inte ihop ytor, gen.js har inga nya tecken ` + JSON.stringify({ pillars: st.pillars, pMerged: st.pMerged, pNew: st.pNew }));
}
await done();
