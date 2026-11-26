// t153: version 28 (REND) – cellgallren `Ɉ` på riktiga fängelsevåningar (Gen.floor, tre frön): skärmbilder mot cellfronterna och
// mätning av renderingen (4× strypning, median) i samma vy. Kör med GAME_JS=<gamla js/game.js> för före-värdet. Port 9853.
import { setup } from './head.mjs';
const PORT = 9853;
const { pg, ev, wait, ok, shot, done } = await setup(PORT, 'out/t153');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const NEW = await ev(() => !!__game.v28);
const tag = NEW ? 'ny' : 'fore';
await ev(() => { const g = __game; g.profile.tutDone = true; const grid = []; for (let y = 0; y < 5; y++) { const r = []; for (let x = 0; x < 5; x++) r.push(x === 0 || y === 0 || x === 4 || y === 4 ? '1' : '.'); grid.push(r); } grid[2][2] = 'P'; grid[1][1] = 'x'; g.playCustom({ grid, biome: 'dungeon' }); });
await wait(1500);
const cdp = await pg.context().newCDPSession(pg);
const R = {};
for (const seed of [777, 1234, 4242]) {
  const v = await ev(seed => { const g = __game, L = Gen.floor(seed, 3, { biome: 'prison' }); if (L.biome !== 'prison') return null; g.run().depth = 3; g.startLevel(L);
    Object.assign(g.settings, { autoLowFx: false, lowfx: false });
    const map = L.map, H = map.length, W = map[0].length, cand = [];
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (map[y][x] === 'Ɉ') for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { // ståplats 3 rutor framför gallret
      let okc = true; for (let k = 1; k <= 3; k++) { const c = (map[y + dy * k] || '')[x + dx * k]; if (c !== '.') { okc = false; break; } }
      if (okc) cand.push([x + dx * 3 + 0.5, y + dy * 3 + 0.5, Math.atan2(-dy, -dx)]); }
    const n = map.reduce((s, r) => s + [...r].filter(c => c === 'Ɉ').length, 0);
    if (!cand.length) return { n, cand: 0 };
    const [px, py, a] = cand[(cand.length / 2) | 0]; window.__pin = [px, py, a]; clearInterval(window.__hold);
    window.__hold = setInterval(() => { const P = __game.P; P.hp = 1e6; P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = window.__pin[2]; P.vx = P.vy = 0; }, 30);
    for (const e of g.ents()) { e.d = { ...e.d, dmg: 0, speed: 0 }; e.alert = false; }
    return { n, cand: cand.length }; }, seed);
  if (!v || !v.cand) { console.log('HOPPAR ÖVER frö', seed, JSON.stringify(v)); continue; }
  await wait(2500); await shot(`fangelse_${seed}_${tag}`);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await ev(() => __game.pause());
  const ts = [], off = []; for (let i = 0; i < 5; i++) { ts.push(await ev(() => { const g = __game; if (g.v28) g.v28.V28.glass = true; g.particles().length = 0; return g.v27b.bench(30).med; }));
    if (NEW) off.push(await ev(() => { const g = __game; g.v28.V28.glass = false; g.particles().length = 0; const r = g.v27b.bench(30).med; g.v28.V28.glass = true; return r; })); }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await ev(() => __game.resume());
  ts.sort((a, b) => a - b); R[seed] = { galler: v.n, ms: +ts[2].toFixed(2) };
  if (NEW) { off.sort((a, b) => a - b); R[seed].glassAv = +off[2].toFixed(2); }
  if (NEW) R[seed].stat = await ev(() => { const n = __game.v28.n(); return { cols: n.cols, exits: n.exits, capped: n.capped }; });
}
console.log('BENCH', tag, JSON.stringify(R));
ok(Object.keys(R).length >= 1, 'minst en fängelsevåning med cellgaller mättes');
await ev(() => { clearInterval(window.__hold); });
await done();
