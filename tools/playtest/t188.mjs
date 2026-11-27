// t188: version 30 (RAS) – en riktig våning (loadFloor) med spruckna väggar: spelaren ställs framför en sprucken vägg (bild med CPU
// och med VÄRLD: GRAFIKKORT), kartan visar sprickan, en smäll river väggen, spelaren går igenom genvägen (tryMove), fienderna går som
// vanligt i 6 s speltid (inga fel), och kartan, siktlinjen och avståndsfältet följer med. Port 9888.
import { setup } from './head.mjs';
const PORT = 9888;
const { pg, ev, ok, shot, done, start, until, gwait } = await setup(PORT, 'out/t188');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) cerr.push(m.text().slice(0, 160)); });
await start();
// en våning med en sprucken vägg
const pick = await ev(() => { const g = __game, R = g.run(); for (let s = 1; s < 80; s++) { R.seed = 9100 + s; R.custom = false; R.practice = false; R.campaign = false; R.abyss = false; g.loadFloor(1 + (s % 7)); if (!g.boss() && g.r30.cells().length) return { seed: 9100 + s, depth: 1 + (s % 7), biome: g.lvl().biome, cells: g.r30.cells() }; } return null; });
ok(!!pick, 'en våning med spruckna väggar ' + JSON.stringify(pick && { seed: pick.seed, depth: pick.depth, biome: pick.biome, n: pick.cells.length }));
if (pick) {
  const c = pick.cells[0];
  const pose = await ev(c => { const g = __game, m = g.r30.map(), P = g.P; for (const e of g.ents()) { e.d = { ...e.d, dmg: 0 }; } P.hp = 1e6;
    const vert = !g.v28.isWall(m[c.y - 1][c.x]); const [sx, sy, a] = vert ? [c.x + 0.5, c.y - 1 + 0.5, Math.PI / 2] : [c.x - 1 + 0.5, c.y + 0.5, 0];
    P.x = sx - Math.cos(a) * 0.6; P.y = sy - Math.sin(a) * 0.6; P.a = a; P.pitch = 0; P.look = 0; P.vx = P.vy = 0; g.settings.autoLowFx = false; return { vert, a, P: [P.x, P.y] }; }, c);
  await ev(() => { window.__hold = setInterval(() => { __game.P.hp = 1e6; }, 30); });
  await gwait(0.4); await shot('framfor_cpu');
  await ev(() => { __game.settings.rendering = 'webgl'; __game.settings.glWorld = 'gpu'; }); await gwait(0.8); await shot('framfor_gpu');
  const gl = await ev(() => __game.w29 ? __game.w29.n() : null);
  if (gl && gl.frames > 0) ok(!gl.failed, 'VÄRLD: GRAFIKKORT ritar den spruckna väggen utan fel ' + JSON.stringify({ frames: gl.frames, failed: gl.failed, err: gl.err }));
  await ev(() => { __game.settings.glWorld = 'cpu'; __game.settings.rendering = 'auto'; });
  // kartan
  await pg.keyboard.press('Tab'); await gwait(0.3); await shot('karta'); await pg.keyboard.press('Tab'); await gwait(0.2);
  const s0 = await ev(c => { const g = __game; g.f29.updateFlow(); return { flow: g.f29.flow()[c.y * g.r30.map()[0].length + c.x], wall: g.v28.isWall(g.r30.map()[c.y][c.x]) }; }, c);
  await ev(c => { const g = __game; g.explode(g.P.x + Math.cos(g.P.a) * 0.4, g.P.y + Math.sin(g.P.a) * 0.4, 0, 1.4, false); }, c); await gwait(1.2); await shot('raserad');
  const s1 = await ev(c => { const g = __game, m = g.r30.map(), P = g.P; const vert = !g.v28.isWall(m[c.y - 1][c.x]);
    const ox = P.x, oy = P.y; for (let i = 0; i < 30; i++) { const dx = Math.cos(P.a) * 0.08, dy = Math.sin(P.a) * 0.08; if (!g.v28.solid(P.x + dx * 4, P.y + dy * 4)) { P.x += dx; P.y += dy; } } // (gå rakt fram så länge det är fritt)
    return { ch: m[c.y][c.x], wall: g.v28.isWall(m[c.y][c.x]), walk: g.v28.walk(c.x, c.y), crossed: Math.hypot(P.x - ox, P.y - oy), through: vert ? P.y > c.y + 1 : P.x > c.x + 1, done: g.r30.cells()[0].done }; }, c);
  ok(s0.wall && s1.done && s1.ch === 'ʶ' && !s1.wall && s1.walk, 'en smäll river den spruckna väggen på våningen ' + JSON.stringify({ s0, s1 }));
  ok(s1.through, 'spelaren kommer igenom genvägen ' + JSON.stringify(s1));
  // fienderna i 6 s
  await ev(() => { for (const e of __game.ents()) { e.alert = true; } }); await gwait(6);
  const st = await ev(() => ({ state: __game.state(), ents: __game.ents().filter(e => !e.dead).length }));
  ok(st.state === 'play', 'spelet fortsätter (fiender aktiva) ' + JSON.stringify(st));
  await ev(() => clearInterval(window.__hold));
}
ok(cerr.length === 0, 'inga fel i konsolen ' + [...new Set(cerr)].slice(0, 3).join(' / '));
await done();
