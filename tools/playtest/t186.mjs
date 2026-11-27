// t186: version 30 (RAS) – placeringen på spelets våningar (loadFloor). 120 körningsfrön på djup 1–7: hur många spruckna väggar
// per biom, att varje sprucken vägg är en genväg mellan två rutor i samma yta (f29Labels) med en omväg på minst R30.minDetour steg,
// och den viktigaste kontrollen: river man ALLA spruckna väggar på våningen slås inga ytor ihop (låsta dörrar, spakgaller, hemliga
// väggar, väktarrum, utmaningsrum och arenor håller fortfarande isär det de höll isär), alltså aldrig en väg förbi ett lås.
// Samma frö ger samma placering, R30.on = false ger inga, en bana som startas direkt (startLevel) får inga, gen.js utdata (lvl.map)
// innehåller inga nya tecken, GEN:s förslag (level.ras30) prövas med samma kontroll. ?r30=0 stänger av. Port 9886.
import { setup } from './head.mjs';
const PORT = 9886;
const { pg, ev, ok, shot, done, start } = await setup(PORT, 'out/t186');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) cerr.push(m.text().slice(0, 160)); });
await start(); // (window.__game.r30 finns efter första våningen)
const live = (seed, depth, on = true, sugg = null) => ev(([seed, depth, on, sugg]) => { const g = __game, R = g.run(), r = g.r30; r.R30.on = on; R.seed = seed; R.custom = false; R.practice = false; R.campaign = false; R.abyss = false;
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
const st = { floors: 0, withCrack: 0, cracks: 0, bad: 0, merged: 0, newOpen: 0, genNew: 0, minDetour: 999, errs: [], pillars: 0, pMerged: 0, pNew: 0 }, perB = {}; let ex = null;
for (let s = 1; s <= 120; s++) { const depth = 1 + (s % 7), r = await live(9100 + s, depth); if (r.boss) continue; st.floors++; const b = perB[r.biome] || (perB[r.biome] = { floors: 0, cracks: 0, cand: 0 }); b.floors++; b.cracks += r.n; b.cand += r.cand;
  if (r.n) st.withCrack++; st.cracks += r.n; st.pillars += r.pillars; st.pMerged += r.pMerged; st.pNew += r.pNew; st.bad += r.bad.length; st.merged += r.merged; st.newOpen += r.newOpen; if (r.genNew) st.genNew++; for (const d of r.detours) st.minDetour = Math.min(st.minDetour, d); if (r.log.length) st.errs.push(...r.log);
  if (r.merged || r.bad.length) console.log('FEL ' + JSON.stringify({ seed: 9100 + s, depth, r }));
  if (!ex && r.n >= 2) ex = [9100 + s, depth]; }
console.log('STAT ' + JSON.stringify(st)); console.log('BIOM ' + JSON.stringify(perB));
ok(st.cracks > 0 && st.withCrack >= st.floors * 0.2, 'spelets våningar får spruckna väggar ' + JSON.stringify({ våningar: st.floors, med: st.withCrack, väggar: st.cracks }));
ok(st.bad === 0, 'varje sprucken vägg har sina två sidor i samma yta utan lås ' + st.bad);
ok(st.merged === 0 && st.newOpen === 0, 'river man alla spruckna väggar slås inga ytor ihop: aldrig en väg förbi ett lås ' + JSON.stringify({ ihopslagna: st.merged, nyaÖppna: st.newOpen }));
ok(st.minDetour >= 10 || st.cracks === 0, 'varje sprucken vägg är en genväg (omvägen minst 10 steg) ' + st.minDetour);
ok(st.genNew === 0, 'gen.js utdata (lvl.map) har inga nya tecken');
ok(st.pMerged === 0 && st.pNew === 0, 'fristående väggpelare: river man alla slås inga ytor ihop ' + JSON.stringify({ pelarrutor: st.pillars, ihopslagna: st.pMerged, nyaÖppna: st.pNew }));
ok(st.errs.length === 0, 'inga fel i placeringen ' + JSON.stringify(st.errs.slice(0, 3)));
if (ex) { const a1 = await live(ex[0], ex[1]), a2 = await live(ex[0], ex[1]), off = await live(ex[0], ex[1], false);
  ok(a1.n > 0 && JSON.stringify(a1.cells) === JSON.stringify(a2.cells), 'samma frö ger samma spruckna väggar ' + JSON.stringify(a1.cells));
  ok(off.n === 0, 'R30.on = false: inga spruckna väggar ' + off.n);
  ok(a1.fp === off.fp && a1.fp === a2.fp && a1.fp.length > 10, 'samma frö ger samma bana: fiender och föremål är desamma med och utan RAS'); await shot('vaning'); }
// GEN:s förslag: en kandidat från en våning provas som förslag (och ett förslag som inte är en genväg avvisas)
const direct = await ev(() => { const g = __game, L = Gen.floor(133, 3, {}), R = g.run(); R.depth = 3; R.seed = 133; g.startLevel(L); return g.r30.cells().length; });
ok(direct === 0, 'en bana som startas direkt med startLevel får inga spruckna väggar ' + direct);
const forced = await ev(() => { const g = __game, L = Gen.floor(133, 3, {}), R = g.run(), C = g.r30.R30.chance, c0 = C[L.biome]; R.depth = 3; R.seed = 133; g.r30.R30.force = true; C[L.biome] = 1; g.startLevel(L); g.r30.R30.force = null; C[L.biome] = c0; return { n: g.r30.cells().length, b: L.biome }; });
ok(forced.n > 0, 'R30.force med sannolikhet 1: spruckna väggar även i en direkt startad bana ' + JSON.stringify(forced));
// förslag från GEN: level.ras30
const sg = await ev(() => { const g = __game, r = g.r30, R = g.run(); R.depth = 3; R.seed = 133; const L = Gen.floor(133, 3, {}); g.startLevel(L); const c = r.cand().filter(q => q.d >= 4); if (!c.length) return { skip: true };
  const L2 = Gen.floor(133, 3, {}); L2.ras30 = [{ x: c[0].x, y: c[0].y }, { x: 0, y: 0 }, { x: 'a' }]; r.R30.force = true; const ch0 = r.R30.chance[L2.biome]; r.R30.chance[L2.biome] = 0; g.startLevel(L2); r.R30.force = null; r.R30.chance[L2.biome] = ch0;
  return { want: c[0], got: r.cells().map(q => [q.x, q.y]), sugg: r.L().sugg }; });
if (!sg.skip) ok(sg.sugg === 1 && sg.got.length === 1 && sg.got[0][0] === sg.want.x && sg.got[0][1] === sg.want.y, 'GEN:s förslag (level.ras30) blir spruckna väggar efter samma kontroll, ogiltiga avvisas ' + JSON.stringify(sg));
// ?r30=0
await start('&r30=0');
if (ex) { const z = await live(ex[0], ex[1]); ok(z.n === 0, '?r30=0: inga spruckna väggar ' + z.n); }
ok(cerr.length === 0, 'inga fel i konsolen ' + [...new Set(cerr)].slice(0, 3).join(' / '));
await done();
