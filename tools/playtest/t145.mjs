// t145: version 27, fler banor. Var och en av de fyra planritningarna (ringborgen, korsfästningen, stormlöpet och borggården) i var sin biom spelas
// från start till utgång: spelaren går den kortaste vägen (dörrarna öppnas med E, fienderna står still och gör ingen skada) tills våningen är klar
// (state 'stats'). Planritningens namn visas när våningen börjar, och scenens namn visas när spelaren kliver in i ett rum med en scen. En bana med
// tvingade scener (tronsal, pelarsal, korsgång) och en med opts.v27off fungerar. Alla väntetider i speltid (__game.roles.t()). Inga sidfel.
// Skärmbilder: OUT (standard tools/playtest/out/t145, eller miljövariabeln LVL27_OUT): karta och förstapersonsvy per planritning.
import { setup } from './head.mjs';
const PORT = 9845, OUT = process.env.LVL27_OUT || 'out/t145';
const { pg, ev, wait, ok, start, done } = await setup(PORT, OUT);
await start();
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(60); } };
const gwait = sec => until(null, sec);
const load = (seed, depth, opts) => ev(([s, d, o]) => { const g = __game, L = Gen.floor(s, d, o); g.startLevel(L); g.resume && g.resume(); return { plan: L.plan27, name: L.planName27, scenes: L.scenes27, biome: L.biome }; }, [seed, depth, opts]);
const calm = () => ev(() => { const g = __game; for (const e of g.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } g.P.hp = 99999; window.__calm = setInterval(() => { const P = __game.P; P.hp = 99999; for (const e of __game.ents()) if (e.d && (e.d.speed || e.d.dmg)) e.d = { ...e.d, speed: 0, dmg: 0 }; }, 100); });
const uncalm = () => ev(() => clearInterval(window.__calm));
// kartan ritad ovanpå spelet (väggar, golv, dörrar, P, x, Z och scenernas rum markerade) för skärmbilden
const drawMap = () => ev(() => { const L = __game.lvl(), m = L.map, H = m.length, W = m[0].length, s = 13, c = document.createElement('canvas'); c.id = 'lvl27map'; c.width = W * s; c.height = H * s + 22;
  Object.assign(c.style, { position: 'fixed', left: '10px', top: '10px', zIndex: 99, background: '#000' }); const g = c.getContext('2d'); const sc = new Set();
  for (const o of L.scenes27 || []) for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) sc.add(y * W + x);
  const wall = ch => /[0-9#%~&=]/.test(ch) || ch.charCodeAt(0) > 127 && L.map.join('').split(ch).length > 60 && !'.'.includes(ch);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const ch = m[y][x]; let col = '#2a2420';
    if (L.sky && L.sky[y][x] === '1') col = '#3a4a5a';
    if (L.roomMask[y][x] !== '-' && L.rooms[L.roomMask[y].charCodeAt(x) - 48].type === 'guardian') col = '#4a1a2a';
    if (sc.has(y * W + x)) col = '#4a4020';
    if (wall(ch)) col = '#8a7a66'; else if (ch === 'D') col = '#c08040'; else if (ch === 'P') col = '#40ff60'; else if (ch === 'x') col = '#40c0ff'; else if (ch === 'Z') col = '#ff3060'; else if ('uTcjJHkq'.includes(ch)) col = '#d0c070'; else if (ch === '_') col = '#ff6020';
    g.fillStyle = col; g.fillRect(x * s, y * s, s - 1, s - 1); }
  g.fillStyle = '#fff'; g.font = '14px monospace'; g.fillText((L.planName27 || 'VANLIG VÅNING') + ' · ' + L.biome + ' · ' + (L.scenes27 || []).map(o => o.kind).join(', '), 4, H * s + 16);
  document.body.appendChild(c); });
const hideMap = () => ev(() => { const c = document.getElementById('lvl27map'); if (c) c.remove(); });
// kortaste vägen P -> x på spelets karta (dörrar räknas som gångbara, väggar och blockerande saker inte)
const pathToExit = (avoid = []) => ev(av => { const g = __game, L = g.lvl(), m = L.map, H = m.length, W = m[0].length, x0 = Math.floor(g.P.x), y0 = Math.floor(g.P.y), ex = L.exit;
  const v = g.v24(), pass = (x, y) => { const c = m[y][x]; if (av.includes(x + ',' + y)) return false; const gc = v.cell(x, y), soft = 'cjiFzűƪǐǵǶȆɏʁȝ<>:"-°¨_ŬŹźŸƖƥǍǏǛǱȂȃȖȗȘȚȲȳɍɎɣɰɱʀʋʌĐĒĔĜĿŀţŤť'; return c === 'D' || c === 'x' || c === 'P' || soft.includes(gc) || soft.includes(c) || (v.walk(x, y) && !'|]{*'.includes(c)); }; // (spelets egen gångbarhet för fiender, plus rekvisita som inte blockerar och fällor/farliga golv som spelaren kan gå över)
  const prev = new Int32Array(W * H).fill(-2), q = [y0 * W + x0]; prev[q[0]] = -1;
  for (let h = 0; h < q.length; h++) { const c = q[h], x = c % W, y = (c / W) | 0; if (x === ex.x && y === ex.y) break; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, n = ny * W + nx; if (nx < 0 || ny < 0 || nx >= W || ny >= H || prev[n] !== -2 || !pass(nx, ny)) continue; prev[n] = c; q.push(n); } }
  const out = []; for (let c = ex.y * W + ex.x; c >= 0 && prev[c] !== -2; c = prev[c]) out.push([c % W, (c / W) | 0]); return out.reverse(); }, avoid);
// gå vägen ruta för ruta (teleport i små steg i speltid; en stängd dörr framför öppnas med E)
const walk = async path0 => { let path = path0; const avoid = []; for (let i = 1; i < path.length; i++) {
  const [x, y] = path[i], [px, py] = path[i - 1];
  const st = await ev(([x, y, px, py]) => { const g = __game, d = g.doors()[x + ',' + y]; if (d && d.open < 0.9) { g.P.x = px + 0.5; g.P.y = py + 0.5; g.P.a = Math.atan2(y - py, x - px); g.useKey(); return 'door'; } g.P.x = x + 0.5; g.P.y = y + 0.5; g.P.a = Math.atan2(y - py, x - px); return g.state(); }, [x, y, px, py]);
  if (st === 'door') { // (en dörr som inte öppnas, t.ex. en enkelriktad genväg från fel sida: gå runt den)
    const opened = await until(([x, y]) => { const d = __game.doors()[x + ',' + y]; return !d || d.open > 0.9; }, 3, [x, y]);
    if (!opened) { avoid.push(x + ',' + y); if (avoid.length > 6) return 'fast'; path = await pathToExit(avoid); i = 0; if (path.length < 2) return 'ingen väg'; continue; }
    i--; continue; }
  if (st !== 'play') return st;
  if (i % 2 === 0) await gwait(0.05);
} await gwait(0.3); return ev(() => __game.state()); };
const PLANS = [['ring', 'dungeon', 't145-ring', 3], ['cross', 'frost', 't145-cross', 3], ['gauntlet', 'library', 't145-gaunt', 2], ['court', 'desert', 't145-court', 4]];
for (const [plan, biome, seed, d] of PLANS) {
  const info = await load(seed, d, { biome, v27: { plan } }); await gwait(0.3); await calm();
  ok(info.plan === plan && info.biome === biome, `${plan}: våningen i ${biome} har planritningen ${info.plan} (${info.name}), scener ${JSON.stringify((info.scenes || []).map(s => s.kind))}`);
  const msg = await ev(() => __game.msgs().map(m => m.text).join(' | '));
  ok(msg.includes(info.name || '???'), `${plan}: planritningens namn visas när våningen börjar: ${msg}`);
  await drawMap(); await pg.screenshot({ path: `${OUT}/${plan}_karta.png` }); await hideMap();
  await gwait(0.4); await pg.screenshot({ path: `${OUT}/${plan}_vy.png` });
  const path = await pathToExit();
  ok(path.length > 10, `${plan}: det finns en väg till utgången (${path.length} rutor)`);
  const st = await walk(path);
  const v = await ev(() => __game.v27());
  ok(st === 'stats', `${plan}: våningen spelas från start till utgång (state ${st}, scennamn som visades ${JSON.stringify(v.shown)})`);
  await uncalm();
}
// tvingade scener: spelaren kliver in i scenens rum och namnet visas
{
  const seed = await ev(() => { for (let i = 0; i < 60; i++) { const L = Gen.floor('t145-scen' + i, 3, { biome: 'dungeon', v27: { plan: null, scenes: ['throne', 'pillarhall', 'cloister', 'stacks'] } }); if (L.scenes27.length >= 2) return 't145-scen' + i; } return 't145-scen0'; });
  const info = await load(seed, 3, { biome: 'dungeon', v27: { plan: null, scenes: ['throne', 'pillarhall', 'cloister', 'stacks'] } }); await gwait(0.3); await calm();
  ok(info.scenes.length >= 2, 'tvingade scener: ' + JSON.stringify(info.scenes.map(s => s.kind + '@' + s.room)));
  for (const s of info.scenes) {
    const spot = await ev(s => { const L = __game.lvl(); for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) if (L.roomMask[y][x] !== '-' && L.roomMask[y].charCodeAt(x) - 48 === s.room && __game.mapRef()[y][x] === '.') return [x, y]; return null; }, s);
    if (!spot) { ok(false, 'ingen fri ruta i scenen ' + s.kind); continue; }
    await ev(([x, y, s]) => { const P = __game.P; P.x = x + 0.5; P.y = y + 0.5; P.a = Math.atan2(s.y + s.h / 2 - y, s.x + s.w / 2 - x); }, [spot[0], spot[1], s]);
    await gwait(0.5);
    const shown = (await ev(() => __game.v27())).shown, m = await ev(() => __game.msgs().map(m => m.text).join(' | '));
    ok(shown.includes(s.kind), `scenen ${s.kind}: namnet visas när spelaren kliver in (${m})`);
    // vy mot scenen: från rummets kant mot mitten
    const view = await ev(s => { const L = __game.lvl(), cx = s.x + s.w / 2, cy = s.y + s.h / 2; let best = null, bd = -1; for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) if (L.roomMask[y][x] !== '-' && L.roomMask[y].charCodeAt(x) - 48 === s.room && __game.mapRef()[y][x] === '.') { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d > bd) { bd = d; best = [x, y]; } } return best ? [best[0], best[1], cx, cy] : null; }, s);
    if (view) { await ev(([x, y, cx, cy]) => { const P = __game.P; P.x = x + 0.5; P.y = y + 0.5; P.a = Math.atan2(cy - y - 0.5, cx - x - 0.5); }, view); await gwait(0.4); await pg.screenshot({ path: `${OUT}/scen_${s.kind.replace(':', '_')}.png` }); }
  }
  await uncalm();
}
// en bana med opts.v27off: inga version 27-fält, spelet startar och inget visas
{
  const info = await load('t145-av', 2, { biome: 'dungeon', v27off: true }); await gwait(0.3);
  const v = await ev(() => ({ st: __game.state(), v: __game.v27(), has: 'scenes27' in __game.lvl() }));
  ok(info.plan === undefined && !v.has && v.st === 'play' && v.v.plan === null && !v.v.shown.length, 'opts.v27off: inga version 27-fält och banan startar ' + JSON.stringify(v));
}
await done();
