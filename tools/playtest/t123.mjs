// t123: version 26A – VÄGGSTUDS och SPRÄNGHOPP (reserv 11). Kontroller: hopp i luften intill en vägg studsar ut från väggen (fart bort
// från väggen, nytt hopp uppåt), högst 3 gånger per lufttur och räknas om vid landning; långt från väggar händer inget; av med
// __game.v26a.set('move', false). Spränghopp: din egen granat som smäller under dig i luften kastar dig uppåt och bort och du tar halva
// skadan mot samma smäll på marken; en smäll som inte är din (explode direkt, som fiendernas) ger inget spränghopp. Inga sidfel.
// Väntetider i speltid (__game.roles.t()).
import { setup } from './head.mjs';
const PORT = 9823;
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/t123');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) cerr.push(m.text().slice(0, 160)); });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
ok(await ev(() => !!__game.v26a && __game.v26a.state().move === true), 'väggstuds och spränghopp är på som standard');

const sceneFn = o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = o.lowfx !== false; g.settings.diff = 1;
  const W = 16, H = 13, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[o.p[1]][o.p[0]] = 'P'; grid[1][W - 2] = 'x'; grid[H - 2][W - 2] = 'S';
  g.playCustom({ grid, biome: 'dungeon' });
  for (const e of g.ents()) { e.d = { ...e.d, dmg: 0, speed: 0 }; e.base = { speed: 0, cd: e.d.cd }; e.alert = false; }
  clearInterval(window.__hold); window.__pin = null; g.P.hp = 500; g.P.stam = 1; g.P.iframe = 0; g.P.vx = g.P.vy = 0; g.P.a = 0;
  if (o.x !== undefined) g.P.x = o.x; g.v26a.reset(); g.v26a.set('move', o.move !== false); g.projectiles().length = 0;
};
const scene = o => pg.evaluate(sceneFn, o);
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(60); } };
const gwait = sec => until(null, sec);
const space = `(() => { dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' })); dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ' })); })()`;
// i sidan: hoppa, och när spelaren är 0,25 upp tryck mellanslag n gånger (en per bildruta); returnerar farten efter varje tryck
const wallRun = n => ev(([n, space]) => new Promise(res => { const g = __game, P = g.P; P.jz = 0.001; P.jv = 3.4; const out = []; let left = n, t0 = g.roles.t();
  const k = () => { if (left > 0 && P.jz > 0.25) { left--; eval(space); out.push({ vx: +P.vx.toFixed(2), jv: +P.jv.toFixed(2), wj: P.wj || 0, x: +P.x.toFixed(2) }); }
    if ((left === 0 && P.jz <= 0) || g.roles.t() - t0 > 4) return res({ out, landedWj: P.wj || 0, st: { ...g.v26a.st(), log: undefined } }); requestAnimationFrame(k); };
  requestAnimationFrame(k); }), [n, space]);

// 1) väggstuds: spelaren står 0,3 från västra väggen och hoppar; ett hopp i luften studsar österut
await scene({ p: [1, 6], x: 1.3 }); await gwait(0.4); await ev(() => { __game.P.x = 1.3; __game.P.vx = __game.P.vy = 0; });
const w1 = await wallRun(1);
ok(w1.out.length === 1 && w1.out[0].wj === 1 && w1.out[0].vx >= 4 && Math.abs(w1.out[0].jv - 3.2) < 0.2 && w1.st.wallJumps === 1, `väggstuds: fart ${w1.out[0] && w1.out[0].vx} bort från väggen, hopp ${w1.out[0] && w1.out[0].jv} ${JSON.stringify(w1)}`);
ok(w1.landedWj === 0, 'väggstudsarna räknas om när spelaren landar');

// 2) högst 3 per lufttur: fem tryck intill väggen ger tre studsar
await scene({ p: [1, 6], x: 1.3 }); await gwait(0.4); await ev(() => { __game.P.x = 1.3; __game.P.vx = __game.P.vy = 0; });
const w2 = await ev(([space]) => new Promise(res => { const g = __game, P = g.P; P.jz = 0.001; P.jv = 3.4; let n = 0; const t0 = g.roles.t();
  const k = () => { if (P.jz > 0.2 && n < 5) { P.x = 1.3; eval(space); n++; } if ((n >= 5 && P.jz <= 0) || g.roles.t() - t0 > 6) return res({ wj: g.v26a.st().wallJumps }); requestAnimationFrame(k); };
  requestAnimationFrame(k); }), [space]);
ok(w2.wj === 3, `fem tryck intill väggen ger ${w2.wj} väggstudsar (högst 3)`);

// 3) mitt i rummet: inget händer (utan dubbelhopp)
await scene({ p: [7, 6] }); await gwait(0.4);
const w3 = await wallRun(1);
ok(w3.st.wallJumps === 0 && Math.abs(w3.out[0].vx) < 0.5, `mitt i rummet: ingen väggstuds ${JSON.stringify(w3)}`);

// 4) av: ingen väggstuds intill väggen
await scene({ p: [1, 6], x: 1.3, move: false }); await gwait(0.4); await ev(() => { __game.P.x = 1.3; __game.P.vx = __game.P.vy = 0; });
const w4 = await wallRun(1);
ok(w4.st.wallJumps === 0 && w4.out[0].vx < 0.5, `av: ingen väggstuds ${JSON.stringify(w4)}`);
await ev(() => __game.v26a.set('move', true));

// 5) spränghopp: egen granat smäller 0,4 rutor från spelaren i luften; jämför med samma smäll på marken
const blast = air => ev(air => new Promise(res => { const g = __game, P = g.P; P.hp = 500; P.iframe = 0; P.vx = P.vy = 0; P.a = 0;
  if (air) { P.jz = 0.3; P.jv = 0.5; }
  const p = { x: P.x - 0.4, y: P.y, z: 0.05, vz: 0, vx: 0, vy: 0, kind: 'pgren', friendly: true, life: 0.0001, dmg: 30, beepT: 9 }; g.projectiles().push(p);
  const hp0 = P.hp; let fr = 0, best = null;
  const k = () => { fr++; if (p.dead && !best) best = { loss: +(hp0 - P.hp).toFixed(1), jv: +P.jv.toFixed(2), vx: +P.vx.toFixed(2), bj: g.v26a.st().blastJumps };
    if (best && fr > 3) return res(best); if (fr > 120) return res({ timeout: true }); requestAnimationFrame(k); };
  requestAnimationFrame(k); }), air);
await scene({ p: [7, 6] }); await gwait(0.5);
const g5 = await blast(false);
await scene({ p: [7, 6] }); await gwait(0.5);
const a5 = await blast(true);
ok(g5.bj === 0 && g5.loss > 0, `på marken: vanlig smäll, ${g5.loss} skada ${JSON.stringify(g5)}`);
ok(a5.bj === 1 && a5.jv >= 3.5 && a5.vx > 4, `i luften: spränghopp uppåt (jv ${a5.jv}) och bort från smällen (vx ${a5.vx}) ${JSON.stringify(a5)}`);
ok(a5.loss > 0 && Math.abs(a5.loss - g5.loss * 0.5) <= Math.max(1.01, g5.loss * 0.15), `spränghoppet halverar egenskadan: ${a5.loss} mot ${g5.loss}`);
await gwait(1);

// 6) en smäll som inte är din (explode direkt, som fiendernas) ger inget spränghopp
await scene({ p: [7, 6] }); await gwait(0.5);
const e6 = await ev(() => { const g = __game, P = g.P; P.jz = 0.3; P.jv = 0.5; g.explode(P.x - 0.4, P.y, 10, 2, true, false); return { bj: g.v26a.st().blastJumps, jv: +P.jv.toFixed(2) }; });
ok(e6.bj === 0 && e6.jv < 3, `en främmande smäll ger inget spränghopp ${JSON.stringify(e6)}`);
await gwait(1);

// 7) med effekterna på: väggstuds och spränghopp utan fel
await scene({ p: [1, 6], x: 1.3, lowfx: false }); await gwait(0.4); await ev(() => { __game.P.x = 1.3; });
await wallRun(1); await gwait(0.3);
await scene({ p: [7, 6], lowfx: false }); await gwait(0.4);
await blast(true); await gwait(0.6);
ok(cerr.length === 0, `utan lowfx: inga konsolfel ${JSON.stringify(cerr)}`);
await pg.screenshot({ path: 'out/t123/sprang.png' });

await done();
