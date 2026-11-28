// (hjälpskript för VÄRLD, inte i testlistan) Strid i riktiga rundor med VÄRLD GRAFIKKORT: spelaren skjuter mot närmaste fiende och byter
// våning var 20:e sekund; varannan sekund jämförs samma bildruta CPU-världen ↔ grafikkortets (1×, CPU:ns provpunkter i 320×200).
// Hittar läsningar av px som lagret (alfa 0) inte klarar (blandning, additivt, sot, glas). node t181b_strid.mjs [sekunder]. Port 9881.
import { setup } from './head.mjs';
const SEC = +(process.argv[2] || 60);
const { pg, ev, wait, ok, done, errs } = await setup(9881, 'out/t181b');
await pg.goto(`http://localhost:9881/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => { const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: false, rendering: 'webgl', bloom: true, glLight: 'on', glWater: 'on', glAir: 'on', glWorld: 'gpu', glRes: 2, blood: 2 }); localStorage.removeItem('krypta.run'); g.begin('new');
  window.__fl = 0; setInterval(() => { const P = g.P; if (g.state() !== 'play') return; P.hp = Math.max(P.hp, 500); let best = null, bd = 1e9; for (const e of g.ents()) { if (e.dead || e.dormant) continue; const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < bd && g.hasLOS(P.x, P.y, e.x, e.y)) { bd = d; best = e; } }
    if (best) { P.a = Math.atan2(best.y - P.y, best.x - P.x); if (g.canvasDown) g.canvasDown(); } }, 100); });
await wait(1500); await pg.keyboard.press('Escape'); await wait(500);
const res = []; const t0 = Date.now();
while (Date.now() - t0 < SEC * 1000) { await wait(2000);
  const r = await ev(() => { const g = __game, s = g.settings; if (g.state() !== 'play') return null; s.glRes = 1; s.glWorld = 'cpu'; g.v28.render(); const A = g.gl.post(); s.glWorld = 'gpu'; g.v28.render(); const B = g.gl.post(), on = g.w29.n().frameOn; s.glRes = 2;
    let eq = 0, big = 0; for (let i = 0; i < A.length; i += 4) { const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2])); if (d <= 2) eq++; if (d > 40) big++; }
    const fl = ++window.__fl; if (fl % 6 === 0) { g.run().depth++; g.loadFloor(g.run().depth); } else { const al = g.ents().filter(e => !e.dead && !e.dormant), e = al[fl % Math.max(1, al.length)]; // nästa fiende: spelaren 2 rutor framför den
      if (e) for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, x = e.x + Math.cos(a) * 2, y = e.y + Math.sin(a) * 2; if (!g.solid(x, y) && g.hasLOS(x, y, e.x, e.y)) { g.P.x = x; g.P.y = y; g.P.a = a + Math.PI; e.alert = true; break; } } }
    return { on, eq: +(eq / (A.length / 4)).toFixed(4), big, parts: g.particles().length, biome: g.lvl().biome, depth: g.run().depth }; });
  if (r) res.push(r); }

console.log(JSON.stringify(res));
const worst = res.reduce((a, r) => !a || r.eq < a.eq ? r : a, null);
ok(res.length > 5 && res.every(r => r.on && r.eq > 0.97), 'strid: grafikkortets värld = CPU-världen i CPU:ns provpunkter (sämsta ' + JSON.stringify(worst) + ', ' + res.length + ' prov)');
ok(errs.length === 0, 'inga fel ' + errs.join(' / '));
await done();
