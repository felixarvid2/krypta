// väktarens eldklot skalas ned med samma faktor (0,7) som dess närstrid; bossens egna eldklot är oförändrade
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { ev, wait, ok, start, done } = await setup(PORT, 'out/tl_a_2_1');
await start('&god=1');

const found = await ev(() => {
  const g = __game, L = Gen.floor(4242, 3, { biome: 'dungeon', guardian: 'demon' }); g.run().depth = 3; g.startLevel(L);
  const b = g.ents().find(e => e.guardian && e.id === 'demon'); if (!b) return null;
  window.__gb = b;
  g.P.x = b.x - 3; g.P.y = b.y;
  for (const e of g.ents()) if (e !== b && !e.dead) e.d = { ...e.d, speed: 0, dmg: 0 }; // övriga fiender stör inte
  b.hp -= 0.01; // väck väktaren
  return { x: +b.x.toFixed(2), y: +b.y.toFixed(2), state: g.state() };
});
ok(!!found, 'väktaren Bendemonen finns på våningen ' + JSON.stringify(found));
if (!found) { await done(); process.exit(0); }

// vänta tills väktaren vaknat (med tidsgräns), sedan att slowmo och banderoll går över
{ const t0 = Date.now(); while (Date.now() - t0 < 5000 && await ev(() => window.__gb.asleep)) await wait(100); }
ok(await ev(() => !window.__gb.asleep), 'väktaren har vaknat');
await wait(1500);

const measure = () => new Promise(res => {
  const g = __game, b = window.__gb, seen = new Set(), dmgs = [];
  for (const p of g.projectiles()) seen.add(p); // gamla skott räknas inte
  b.spT = 99; b.stun = 0; b.cd = 99; b.lastShot = -1; b.t = 0; b.state = 'breath';
  const t0 = performance.now(); let bad = null;
  const tick = () => {
    if (g.state() !== 'play' && !bad) bad = g.state();
    for (const p of g.projectiles()) if (p.src === b && !seen.has(p)) { seen.add(p); dmgs.push(p.dmg); }
    if (performance.now() - t0 >= 3000) res({ dmgs, bad, guardian: b.guardian });
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

const A = await ev(measure);
await ev(() => { window.__gb.guardian = false; });
const B = await ev(measure);
await ev(() => { window.__gb.guardian = true; });
console.log('A (väktare):', JSON.stringify(A));
console.log('B (kontroll):', JSON.stringify(B));

if (A.bad || B.bad) {
  ok(false, `OGILTIGT TEST: spelet bytte tillstånd under mätningen (A: ${A.bad || 'play'}, B: ${B.bad || 'play'})`);
  await done(); process.exit(0);
}
ok(A.guardian === true && B.guardian === false, 'körning A mätte som väktare, körning B som boss');
ok(A.dmgs.length >= 5, `körning A fångar minst 5 eldklot (${A.dmgs.length})`);
ok(B.dmgs.length >= 5, `körning B fångar minst 5 eldklot (${B.dmgs.length})`);
const bv = B.dmgs[0];
ok(B.dmgs.length > 0 && B.dmgs.every(d => d === bv), `bossens eldklot har samma skada (${[...new Set(B.dmgs)].join(', ')})`);
ok(A.dmgs.length > 0 && A.dmgs.every(d => d > 0 && d < bv), `väktarens eldklot gör mindre skada än bossens men mer än 0 (A: ${[...new Set(A.dmgs)].join(', ')}, B: ${bv})`);
const mean = A.dmgs.length ? A.dmgs.reduce((s, d) => s + d, 0) / A.dmgs.length : 0, k = bv ? mean / bv : 0;
ok(k >= 0.6 && k <= 0.8, `väktarens eldklot skalas som närstriden: medel ${mean.toFixed(2)} / ${bv} = ${k.toFixed(3)} (väntat 0,6–0,8)`);
await done();
