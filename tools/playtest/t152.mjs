// t152: version 28 (REND) – mätning av renderingen med 4× CPU-strypning (median av växelvisa omgångar, ms per render()).
// Samma rum (30×20, sex fiender i bild) i fyra varianter: utan något nytt, med 48 takfläckar i bild, med fönster i bild och med en
// vanlig vägg i stället för fönstren. I den nya byggnaden jämförs också V28 av (glass och ceil) mot på i samma rum.
// Kör med GAME_JS=<gamla js/game.js> för före-värdet (då finns inte __game.v28; bara rummet och väggen mäts). Port 9852.
import { setup } from './head.mjs';
const PORT = 9852;
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/t152');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const NEW = await ev(() => !!__game.v28);
const sceneFn = o => { const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: false, blood: 2 });
  const W = 30, H = 20, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  if (o.win) { for (let y = 1; y < H - 1; y++) grid[y][16] = '1'; for (let y = 6; y <= 13; y++) if (y !== 9) grid[y][16] = o.win; grid[9][16] = '.'; }
  grid[10][4] = 'P'; grid[1][1] = 'x'; for (const [x, y] of [[10, 7], [10, 12], [13, 9], [20, 8], [22, 11], [25, 10]]) grid[y][x] = 'Ä';
  g.playCustom({ grid, biome: 'dungeon' });
  for (const e of g.ents()) { e.d = { ...e.d, speed: 0, dmg: 0 }; e.alert = false; }
  g.P.hp = 1e6; clearInterval(window.__hold); window.__hold = setInterval(() => { const P = __game.P; P.hp = 1e6; P.x = 4.5; P.y = 10.5; P.a = 0; P.vx = P.vy = 0; }, 30); };
const ready = async o => { await pg.evaluate(sceneFn, o); await wait(2500); await ev(() => { const g = __game; g.P.x = 4.5; g.P.y = 10.5; g.P.a = 0; g.particles().length = 0; }); };
const bench = () => ev(() => { const g = __game; g.particles().length = 0; return g.v27b.bench(30).med; });
const med = a => a.slice().sort((x, y) => x - y)[(a.length - 1) >> 1];
const cdp = await pg.context().newCDPSession(pg);
const R = {};
const measure = async (name, prep, alt) => { // alt: [namnA, fnA, namnB, fnB] växelvis i samma rum
  await prep(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await ev(() => __game.pause());
  const A = [], B = [];
  for (let i = 0; i < 7; i++) { if (alt) await ev(alt[1]); A.push(await bench()); if (alt) { await ev(alt[3]); B.push(await bench()); } }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await ev(() => __game.resume());
  if (alt) { R[alt[0]] = +med(A).toFixed(2); R[alt[2]] = +med(B).toFixed(2); } else R[name] = +med(A).toFixed(2);
};
await measure('rum', () => ready({}), NEW ? ['rum_v28_på', () => { const V = __game.v28.V28; V.glass = V.ceil = true; }, 'rum_v28_av', () => { const V = __game.v28.V28; V.glass = V.ceil = false; }] : null);
await measure('vägg', () => ready({ win: '1' }));
if (NEW) {
  await ev(() => { const V = __game.v28.V28; V.glass = V.ceil = true; });
  await measure('fläckar', async () => { await ready({}); await ev(() => { const g = __game; g.v28.clear(); for (let i = 0; i < 48; i++) g.v28.stain(6.5 + (i % 12), 7.5 + ((i / 12) | 0) * 1.5, null, i % 3); }); },
    ['fläckar_48', () => { const C = __game.v28.C; if (window.__m) C.m = window.__m; }, 'fläckar_0', () => { const C = __game.v28.C; window.__m = window.__m || C.m; C.m = null; }]);
  await ev(() => { window.__m = null; });
  await measure('fläckar8', async () => { await ready({}); await ev(() => { const g = __game; g.v28.clear(); for (let i = 0; i < 8; i++) g.v28.stain(7.5 + (i % 4) * 2, 8.5 + ((i / 4) | 0) * 3, null, i % 3); }); },
    ['fläckar_8', () => { const C = __game.v28.C; if (window.__m) C.m = window.__m; }, 'fläckar_8_0', () => { const C = __game.v28.C; window.__m = window.__m || C.m; C.m = null; }]);
  await ev(() => { window.__m = null; });
  await measure('fönster', () => ready({ win: 'ǂ' }), ['fönster_ǂ', () => { __game.v28.V28.glass = true; }, 'fönster_av', () => { __game.v28.V28.glass = false; }]);
  await ev(() => { __game.v28.V28.glass = true; });
  await measure('galler', () => ready({ win: 'Ɉ' }));
  const st = await ev(() => __game.v28.n()); R.stat = { cols: st.cols, drawn: st.drawn };
}
console.log('BENCH', NEW ? 'ny' : 'före', JSON.stringify(R));
ok(true, 'mätningen gick igenom');
await done();
