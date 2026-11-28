// Ökenens kokpannor (Ȼ) lyser som eldfaten ('f') de ersätter: samma ljus 3 och 5 rutor bort
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/tl_c_1_2');

async function boot(q) {
  await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1${q}`);
  await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
  await ev(() => { __game.profile.tutDone = true; });
}

// bygg en egen bana med ljuskällan ch i (8,7), spelaren i (26,7), mät ljuset 3 och 5 rutor från källan
async function measure(ch) {
  await boot('');
  await ev(ch => {
    const g = __game, W = 30, H = 15, grid = [];
    for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
    grid[7][8] = ch; grid[7][26] = 'P'; grid[2][27] = 'x';
    g.playCustom({ grid, biome: 'dungeon' });
  }, ch);
  await wait(1500);
  const calm = () => ev(() => { const g = __game; g.P.lamp = false; g.P.a = 0; for (const e of g.ents()) { e.dead = true; e.d = { ...e.d, dmg: 0, speed: 0 }; } });
  await calm();
  // vänta (med tidsgräns) på att spelet är igång
  let st = await ev(() => __game.state());
  { const t0 = Date.now(); while (Date.now() - t0 < 8000 && st !== 'play') { await wait(100); await calm(); st = await ev(() => __game.state()); } }
  const info = await ev(() => { const g = __game, m = g.mapRef(); return { W: m[0].length, H: m.length, props: g.props().map(p => p.ch), lamp: g.P.lamp }; });
  const L3 = [], L5 = [];
  for (let n = 0; n < 30; n++) {
    await calm();
    const r = await ev(() => { const g = __game, W = g.mapRef()[0].length, a = g.lvl().ambient, L = g.light(); return { l3: L[7 * W + 11] - a, l5: L[7 * W + 13] - a, st: g.state() }; });
    L3.push(r.l3); L5.push(r.l5);
    await wait(100);
  }
  const avg = a => a.reduce((s, v) => s + v, 0) / a.length;
  return { st, info, l3: avg(L3), l5: avg(L5) };
}

const f = await measure('f');
console.log('eldfat', JSON.stringify({ st: f.st, W: f.info.W, H: f.info.H, l3: f.l3.toFixed(3), l5: f.l5.toFixed(3) }));
ok(f.st === 'play', `egen bana med eldfat körs (${f.st})`);
ok(f.info.W === 30 && f.info.H === 15, `banan är 30x15 (${f.info.W}x${f.info.H})`);
ok(f.l3 > 0.3, `eldfatet lyser upp 3 rutor bort (L3 ${f.l3.toFixed(3)} > 0,3)`);

const c = await measure('Ȼ');
console.log('kokpanna', JSON.stringify({ st: c.st, props: c.info.props, l3: c.l3.toFixed(3), l5: c.l5.toFixed(3) }));
ok(c.st === 'play', `egen bana med kokpanna körs (${c.st})`);
ok(c.info.props.includes('Ȼ'), `kokpannan finns som rekvisita (${c.info.props.join(',')})`);
ok(c.l3 >= 0.8 * f.l3, `kokpannan lyser lika starkt som eldfatet 3 rutor bort: ${c.l3.toFixed(3)} >= 0,8 x ${f.l3.toFixed(3)}`);
ok(c.l5 > 0.15, `kokpannan lyser 5 rutor bort: ${c.l5.toFixed(3)} > 0,15`);
ok(c.l5 >= 0.7 * f.l5, `kokpannan når lika långt som eldfatet 5 rutor bort: ${c.l5.toFixed(3)} >= 0,7 x ${f.l5.toFixed(3)}`);

// riktig ökenvåning startar
await boot('&biome=desert&floor=2');
await ev(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; __game.begin('new'); });
let bio = null;
{ const t0 = Date.now(); while (Date.now() - t0 < 10000) { await wait(200); bio = await ev(() => { const l = __game.lvl(); return l && l.biome; }); if (bio === 'desert') break; } }
await wait(1000);
ok(bio === 'desert', `riktig ökenvåning startar (biome ${bio})`);

await done();
