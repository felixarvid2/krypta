// Bossar och väktare går runt hinder när de inte ser spelaren (tidigare: 18 av 28 bossar trycker mot väggen och anfaller aldrig)
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/tl_d_1_1');
const NEUTRAL = ['idle', 'walk', 'chase', 'circle'];
const GROUP_A = ['crystalqueen', 'clockmaker', 'cardinal', 'demon', 'ogre', 'pharaoh', 'queenbee', 'ratking', 'monk'];
const GROUP_B = ['librarian', 'nightmare'];
const N = 100, STEP = 250;

async function arena(id) {
  await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1&boss=${id}`);
  await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
  await ev(() => { __game.profile.tutDone = true; __game.begin('new'); }); await wait(1200);
  await pg.keyboard.press('Escape'); await wait(400);
  await ev(() => __game.loadFloor(6)); await wait(2500);
  // vänta (högst 5 s) på att spelet är igång efter eventuell bossintro
  { const t0 = Date.now(); while (Date.now() - t0 < 5000 && await ev(() => __game.state()) !== 'play') await wait(100); }
  return await ev(() => { const b = __game.boss(); return b ? { id: b.id, x: b.x, y: b.y, state: __game.state() } : null; });
}

// allt i ett och samma evaluate: rensa, vägg, döda övriga, flytta spelaren sist
const prep = () => ev(() => {
  const g = __game, b = g.boss(), bx = b.x | 0, by = b.y | 0, m = g.mapRef(), H = m.length, W = m[0].length;
  for (let y = by - 4; y <= by + 4; y++) for (let x = bx - 8; x <= bx + 2; x++) if (x > 0 && x < W - 1 && y > 0 && y < H - 1) m[y][x] = '.';
  for (const y of [by - 1, by, by + 1]) m[y][bx - 2] = '1';
  for (const e of g.ents()) if (e !== b && !e.boss) e.dead = true;
  const P = g.P; P.x = bx - 4.5; P.y = b.y; P.a = 0;
  return { bx, by, x0: b.x, y0: b.y, px: P.x, py: P.y, los: g.hasLOS(b.x, b.y, P.x, P.y), st: b.state };
});

const sample = ([px, py]) => ev(([px, py]) => {
  const g = __game, P = g.P, b = g.boss(); P.x = px; P.y = py; P.hp = 100;
  if (!b) return { gone: true, game: g.state() };
  return { st: b.state, x: b.x, y: b.y, hidden: !!b.hidden, los: g.hasLOS(b.x, b.y, P.x, P.y), game: g.state() };
}, [px, py]);

async function measure(id) {
  const b = await arena(id);
  ok(b && b.id === id, `${id}: bossen startar (${JSON.stringify(b)})`);
  if (!b || b.id !== id) return null;
  const s = await prep();
  ok(s.los === false, `${id}: väggen skymmer sikten från start (hasLOS ${s.los}, boss ${s.x0.toFixed(2)},${s.y0.toFixed(2)}, spelare ${s.px.toFixed(2)},${s.py.toFixed(2)}, tillstånd ${s.st})`);
  const log = [];
  let next = Date.now();
  for (let i = 0; i < N; i++) {
    next += STEP; const d = next - Date.now(); if (d > 0) await wait(d);
    log.push(await sample([s.px, s.py]));
  }
  const path = log.filter((_, i) => i % 10 === 0).map(r => r.gone ? 'borta' : `${r.x.toFixed(1)},${r.y.toFixed(1)}:${r.st}${r.los ? '*' : ''}`).join(' | ');
  console.log(`${id} bana:`, path);
  return { s, log };
}

async function chaseCase(id, label) {
  const m = await measure(id);
  if (!m) return;
  const { log } = m;
  const nLos = log.filter(r => !r.gone && r.los === true).length;
  const first = log.findIndex(r => !r.gone && r.los === true);
  const after = first < 0 ? [] : log.slice(first).filter(r => !r.gone);
  const atk = after.find(r => !NEUTRAL.includes(r.st));
  const states = [...new Set(log.filter(r => !r.gone).map(r => r.st))];
  const games = [...new Set(log.map(r => r.game))];
  ok(nLos >= 1, `${label} ${id}: får syn på spelaren (hasLOS true i ${nLos} av ${N})`);
  ok(!!atk, `${label} ${id}: anfaller vid eller efter första sikten (första sikt prov ${first}, ${atk ? 'tillstånd ' + atk.st : 'inget anfall'}; tillstånd: ${states.join(', ')})`);
  ok(games.length === 1 && games[0] === 'play', `${label} ${id}: spelet är 'play' i alla prov (${games.join(', ')})`);
}

// Grupp A: frös på HEAD
for (const id of GROUP_A) await chaseCase(id, 'A');
// Grupp B: regression
for (const id of GROUP_B) await chaseCase(id, 'B');

// Grupp C (kontroll): bassängbossen leviathan ska stå still
{
  const id = 'leviathan';
  const m = await measure(id);
  if (m) {
    const { log } = m;
    let maxStep = 0, pairs = 0;
    const still = r => !r.gone && !r.hidden && r.st !== 'submerge' && r.st !== 'emerge';
    for (let i = 1; i < log.length; i++) {
      const a = log[i - 1], c = log[i];
      if (!still(a) || !still(c)) continue;
      pairs++;
      maxStep = Math.max(maxStep, Math.hypot(c.x - a.x, c.y - a.y));
    }
    ok(maxStep <= 0.05, `C ${id}: bassängbossen går inte (största förflyttning mellan prov ${maxStep.toFixed(3)} rutor över ${pairs} par, högst 0,05)`);
    const games = [...new Set(log.map(r => r.game))];
    ok(games.length === 1 && games[0] === 'play', `C ${id}: spelet är 'play' i alla prov (${games.join(', ')})`);
  }
}
await done();
