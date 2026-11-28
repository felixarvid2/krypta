// t168: version 29 (FÖNSTER) – mätning av renderingen (render(), median av 7 varv, 30 bildrutor per varv efter en uppvärmning; fallen turas om, 4× CPU-strypning) med många fönster:
// en sal utan fönster, tre rader fönster ǂ, tre rader glas ǁ och tre rader krossat glas ǀ (rakt fram, hela bredden), också med lowfx.
// Kör med GAME_JS=<js/game.js före version 29> för före-värdet (då hoppas glasraderna över: tecknen finns inte där). Port 9868.
// Skriver out/t168/res_<ny|fore>.json.
import { setup } from './head.mjs';
import fs from 'fs';
const PORT = 9868;
const { pg, ev, wait, ok, shot, done } = await setup(PORT, 'out/t168');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) cerr.push(m.text().slice(0, 160)); }); // (spelets slinga fångar fel: de syns bara i konsolen)
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const NEW = await ev(() => !!(window.__game && __game.v28 && typeof __game.v28.far === 'function'));
const tag = NEW ? 'ny' : 'fore';
const sceneFn = o => { const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: !!o.lowfx, blood: 2, noFlash: false, reduceMotion: false });
  const W = 26, H = 15, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  if (o.win) for (const wx of [9, 13, 17]) for (let y = 1; y < H - 1; y++) grid[y][wx] = (y % 4 === 0) ? '1' : o.win; // tre rader fönster med pelare emellan
  grid[7][4] = 'P'; grid[1][1] = 'x'; grid[7][21] = 'Ä'; grid[4][15] = 'Ä';
  g.playCustom({ grid, biome: 'dungeon' });
  for (const e of g.ents()) { e.d = { ...e.d, speed: 0, dmg: 0 }; e.alert = false; }
  g.P.hp = 1e6; clearInterval(window.__hold); window.__pin = [4.5, 7.5]; g.lvl().ambient = 1.1;
  window.__hold = setInterval(() => { const P = __game.P; P.hp = 1e6; if (window.__pin) { P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = 0.05; P.vx = P.vy = 0; P.look = 0; P.pitch = 0; } }, 30); };
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 90000) return !cond; await wait(80); } };
const cdp = await pg.context().newCDPSession(pg);
const INPLACE = NEW && process.env.T168_INPLACE === '1'; // (på plats: mindre brus, men bara den nya filen)
const R = {}, cases = [['inga', '.'], ['fonster', 'ǂ'], ['glas', 'ǁ'], ['krossat', 'ǀ']].filter(([, c]) => NEW || c === '.' || c === 'ǂ');
await ev(sceneFn, { win: 'ǂ' }); await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await until(null, 0.5);
// samma bana hela tiden: tecknen i de tre raderna byts på plats (render läser kartan), fallen turas om i 7 varv (median per fall)
const setCh = c => ev(c => { const g = __game, map = g.f29.map();
  for (let y = 1; y < 14; y++) for (const x of [9, 13, 17]) if (y % 4) map[y][x] = c; g.v28.T.cellTex.clear(); g.v28.T.o2 = c === 'ǀ' ? 1 : 0; g.v28.scan(); return map[5][9]; }, c);
// (gamla filen har ingen __game.f29: där laddas banan om för varje fall)
for (const lowfx of [false, true]) {
  const T = {}; for (const [n] of cases) T[n] = [];
  for (let round = 0; round < 7; round++) for (const [name, ch] of cases) {
    if (INPLACE) await setCh(ch); else { await ev(sceneFn, { win: ch === '.' ? null : ch, lowfx }); await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await until(null, 0.3); }
    await ev(l => { __game.settings.lowfx = l; __game.settings.autoLowFx = false; }, lowfx);
    if (round === 0 && !lowfx) await shot(`${name}_${tag}`);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await ev(() => __game.pause());
    await ev(() => { const g = __game; g.particles().length = 0; return g.v27b.bench(10).med; }); // uppvärmning
    T[name].push(await ev(() => { const g = __game; g.particles().length = 0; return g.v27b.bench(30).med; }));
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await ev(() => __game.resume());
  }
  for (const [n] of cases) { const a = T[n].sort((x, y) => x - y); R[n + (lowfx ? '_lowfx' : '')] = +a[3].toFixed(2); R[n + (lowfx ? '_lowfx' : '') + '_spann'] = [+a[1].toFixed(1), +a[5].toFixed(1)]; }
}
console.log('BENCH', tag, JSON.stringify(R));
fs.writeFileSync(`out/t168/res_${tag}.json`, JSON.stringify(R));
ok(Object.keys(R).length >= 4, 'mätt ' + Object.keys(R).length + ' fall');
await ev(() => { clearInterval(window.__hold); });
ok(cerr.length === 0, 'inga fel i konsolen ' + [...new Set(cerr)].slice(0, 3).join(' / '));
await done();
