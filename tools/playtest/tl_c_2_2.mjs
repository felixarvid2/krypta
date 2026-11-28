// Ökenens kokpannor (Ȼ) slipper sandstensdämpningen: de lyser som eldfaten ('f') i samma ökenbana,
// medan vanliga ljus ('c') fortfarande dämpas i öknen
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/tl_c_2_2');

async function boot(q) {
  await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1${q}`);
  await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
  await ev(() => { __game.profile.tutDone = true; });
}

const avg = a => a.reduce((s, v) => s + v, 0) / a.length;

// bygg en egen bana 30x15 med givna ljuskällor, spelaren i (26,7), mät ljuset ovanför grundljuset i punkterna pts
async function measure(biome, srcs, pts) {
  await boot('');
  await ev(([biome, srcs]) => {
    const g = __game, W = 30, H = 15, grid = [];
    for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
    grid[7][26] = 'P'; grid[2][27] = 'x';
    for (const [x, y, ch] of srcs) grid[y][x] = ch;
    g.playCustom({ grid, biome });
  }, [biome, srcs]);
  await wait(1500);
  const calm = () => ev(() => { const g = __game; g.P.lamp = false; g.P.a = 0; for (const e of g.ents()) { e.dead = true; e.d = { ...e.d, dmg: 0, speed: 0 }; } });
  await calm();
  // vänta (med tidsgräns) på att spelet är igång
  let st = await ev(() => __game.state());
  { const t0 = Date.now(); while (Date.now() - t0 < 8000 && st !== 'play') { await wait(100); await calm(); st = await ev(() => __game.state()); } }
  const info = await ev(() => { const g = __game, m = g.mapRef(), l = g.lvl(); return { W: m[0].length, H: m.length, props: g.props().map(p => p.ch), biome: l && l.biome }; });
  const vals = pts.map(() => []);
  for (let n = 0; n < 30; n++) {
    await calm();
    const r = await ev(pts => { const g = __game, W2 = g.mapRef()[0].length, a = g.lvl().ambient, L = g.light(); return pts.map(([x, y]) => L[y * W2 + x] - a); }, pts);
    r.forEach((v, i) => vals[i].push(v));
    await wait(100);
  }
  return { st, info, m: vals.map(avg) };
}

// Fall A: eldfat och kokpanna i samma ökenbana, båda mätta 3 rutor bort (19 rutor mellan mätpunkterna)
const A = await measure('desert', [[5, 7, 'f'], [24, 7, 'Ȼ']], [[8, 7], [21, 7]]);
const [mf, mc] = A.m;
console.log('fall A', JSON.stringify({ st: A.st, W: A.info.W, H: A.info.H, biome: A.info.biome, props: A.info.props, f: mf.toFixed(3), c: mc.toFixed(3), kvot: (mc / mf).toFixed(3) }));
ok(A.st === 'play', `egen ökenbana med eldfat och kokpanna körs (${A.st})`);
ok(A.info.W === 30 && A.info.H === 15, `banan är 30x15 (${A.info.W}x${A.info.H})`);
ok(A.info.props.includes('Ȼ'), `kokpannan finns som rekvisita (${A.info.props.join(',')})`);
ok(mf > 0, `eldfatet lyser i öknen (${mf.toFixed(3)} > 0)`);
ok(mc >= 0.85 * mf, `kokpannan lyser som eldfatet i öknen: ${mc.toFixed(3)} >= 0,85 x ${mf.toFixed(3)} (kvot ${(mc / mf).toFixed(3)})`);
ok(mc > 0.3, `kokpannan lyser upp 3 rutor bort i öknen (${mc.toFixed(3)} > 0,3)`);

// Fall B: vanligt ljus 'c' dämpas fortfarande i öknen jämfört med kryptan
const Bd = await measure('desert', [[8, 7, 'c']], [[10, 7]]);
const Bk = await measure('dungeon', [[8, 7, 'c']], [[10, 7]]);
const q = Bd.m[0] / Bk.m[0];
console.log('fall B', JSON.stringify({ stD: Bd.st, stK: Bk.st, desert: Bd.m[0].toFixed(3), dungeon: Bk.m[0].toFixed(3), kvot: q.toFixed(3) }));
ok(Bd.st === 'play' && Bk.st === 'play', `banorna med ljus körs (${Bd.st}, ${Bk.st})`);
ok(Bk.m[0] > 0, `ljuset lyser i kryptan (${Bk.m[0].toFixed(3)} > 0)`);
ok(q >= 0.45 && q <= 0.65, `ljuset dämpas fortfarande i öknen: öken/krypta ${q.toFixed(3)} mellan 0,45 och 0,65`);

// Fall C: riktig ökenvåning startar
await boot('&biome=desert&floor=2');
await ev(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; __game.begin('new'); });
let bio = null;
{ const t0 = Date.now(); while (Date.now() - t0 < 10000) { await wait(200); bio = await ev(() => { const l = __game.lvl(); return l && l.biome; }); if (bio === 'desert') break; } }
await wait(1000);
ok(bio === 'desert', `riktig ökenvåning startar (biome ${bio})`);

await done();
