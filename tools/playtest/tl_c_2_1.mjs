// Mycelmodern går runt ett hinder när hon inte ser spelaren (tidigare: står still i 'idle' för evigt)
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/tl_c_2_1');
const ATTACK = ['roots', 'spores', 'slam', 'special'];

async function arena() {
  await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1&boss=mycelmother`);
  await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
  await ev(() => { __game.profile.tutDone = true; __game.begin('new'); }); await wait(1200);
  await pg.keyboard.press('Escape'); await wait(400);
  await ev(() => __game.loadFloor(6)); await wait(2500);
  // vänta (högst 5 s) på att spelet är igång efter eventuell bossintro
  { const t0 = Date.now(); while (Date.now() - t0 < 5000 && await ev(() => __game.state()) !== 'play') await wait(100); }
  return await ev(() => { const b = __game.boss(); return b ? { id: b.id, x: b.x, y: b.y, state: __game.state() } : null; });
}

// allt i ett och samma evaluate: rensa, (vägg), döda övriga, flytta spelaren sist
const prep = withWall => ev(withWall => {
  const g = __game, b = g.boss(), bx = b.x | 0, by = b.y | 0, m = g.mapRef(), H = m.length, W = m[0].length;
  for (let y = by - 4; y <= by + 4; y++) for (let x = bx - 8; x <= bx + 2; x++) if (x > 0 && x < W - 1 && y > 0 && y < H - 1) m[y][x] = '.';
  if (withWall) for (const y of [by - 1, by, by + 1]) m[y][bx - 2] = '1';
  for (const e of g.ents()) if (e !== b && !e.boss) e.dead = true;
  const P = g.P; P.x = bx - 4.5; P.y = b.y; P.a = 0;
  return { bx, by, x0: b.x, y0: b.y, px: P.x, py: P.y, los: g.hasLOS(b.x, b.y, P.x, P.y), hp: b.hp, st: b.state };
}, withWall);

const sample = ([px, py]) => ev(([px, py]) => {
  const g = __game, P = g.P, b = g.boss(); P.x = px; P.y = py; P.hp = 100;
  if (!b) return { gone: true, game: g.state() };
  return { st: b.state, x: b.x, y: b.y, los: g.hasLOS(b.x, b.y, P.x, P.y), game: g.state(), dead: !!b.dead };
}, [px, py]);

// Fall A: vägg mellan spelaren och bossen
{
  const b = await arena();
  ok(b && b.id === 'mycelmother', `bossen mycelmother startar (${JSON.stringify(b)})`);
  if (b) {
    const s = await prep(true);
    ok(s.los === false, `väggen skymmer sikten från start (hasLOS ${s.los}, boss ${s.x0.toFixed(2)},${s.y0.toFixed(2)}, spelare ${s.px.toFixed(2)},${s.py.toFixed(2)}, bosstillstånd ${s.st})`);
    const log = []; let anyLos = false, anyAtk = false, maxDy = 0, allPlay = true, states = new Set();
    for (let i = 0; i < 80; i++) {
      await wait(250);
      const r = await sample([s.px, s.py]); log.push(r);
      if (r.game !== 'play') allPlay = false;
      if (r.gone) continue;
      states.add(r.st);
      if (r.los === true) anyLos = true;
      if (ATTACK.includes(r.st)) anyAtk = true;
      maxDy = Math.max(maxDy, Math.abs(r.y - s.y0));
    }
    const path = log.filter((_, i) => i % 8 === 0).map(r => r.gone ? 'borta' : `${r.x.toFixed(1)},${r.y.toFixed(1)}:${r.st}${r.los ? '*' : ''}`).join(' | ');
    console.log('bana:', path);
    ok(anyLos, `bossen får syn på spelaren någon gång (hasLOS true i ${log.filter(r => r.los === true).length} av 80)`);
    ok(anyAtk, `bossen anfaller någon gång (tillstånd: ${[...states].join(', ')})`);
    ok(maxDy > 1.0, `bossen går runt väggen: y avviker högst ${maxDy.toFixed(2)} från start (> 1,0)`);
    ok(allPlay, `spelet är 'play' hela tiden (${[...new Set(log.map(r => r.game))].join(', ')})`);
  }
}

// Fall B (kontroll): samma uppställning utan vägg – bossen ska anfalla inom 10 s
{
  const b = await arena();
  ok(b && b.id === 'mycelmother', `kontroll: bossen mycelmother startar (${JSON.stringify(b)})`);
  if (b) {
    const s = await prep(false);
    let atk = null, last = null, allPlay = true; const t0 = Date.now();
    while (Date.now() - t0 < 10000 && !atk) {
      await wait(250);
      const r = await sample([s.px, s.py]); last = r;
      if (r.game !== 'play') allPlay = false;
      if (!r.gone && ATTACK.includes(r.st)) atk = r.st;
    }
    ok(!!atk, `kontroll utan vägg: bossen anfaller inom 10 s (${atk || 'inget anfall, sist ' + JSON.stringify(last)}, sikt från start ${s.los})`);
    ok(allPlay, `kontroll: spelet är 'play' hela tiden`);
  }
}
await done();
