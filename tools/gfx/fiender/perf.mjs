// FIENDER: A/B-mätning i samma bygge – tid per bildruta (rAF-anropet: update + render) med FIENDERs effekter på och av,
// 4x strypt processor (≈ mellantelefon), 12 fiender i bild som träffas, dör och sprängs. node tools/gfx/fiender/perf.mjs
import { setup } from '../../playtest/head.mjs';
const { pg, ev, wait, start, done } = await setup(9745, new URL('out/perf', import.meta.url).pathname);
await pg.addInitScript(() => { try { localStorage.setItem('krypta.settings.dator', JSON.stringify({ autoLowFx: false })); } catch (e) {} const raf = window.requestAnimationFrame.bind(window); window.__ft = []; window.requestAnimationFrame = cb => raf(t => { const a = performance.now(); cb(t); if (window.__ftOn) window.__ft.push(performance.now() - a); }); });
await start('&seed=fiender');
await ev(() => { __game.run().practice = {}; __game.settings.autoLowFx = false; const P = __game.P; P.iframe = 99999; P.hp = 999; const L = __game.lvl(); const r = (L.rooms || []).slice().sort((a, b) => b.w * b.h - a.w * a.h)[0]; const horiz = r.w >= r.h;
  P.x = horiz ? r.x + 1.2 : r.x + r.w / 2; P.y = horiz ? r.y + r.h / 2 : r.y + 1.2; P.a = horiz ? 0 : Math.PI / 2; });
const cdp = await pg.context().newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +(process.env.RATE || 2) });
const res = { on: [], off: [] };
for (let rep = 0; rep < 4; rep++) for (const mode of ['on', 'off']) {
  await ev(on => { __game.gfxE.set(on); for (const e of __game.ents()) { e.dead = true; e.gibbed = true; } __game.particles().length = 0; const P = __game.P;
    for (let k = 0; k < 12; k++) { const d = 2.5 + (k % 4) * 0.8, s = (k % 3 - 1) * 1.2; const e = __game.spawnEnemy('WSLX'[k % 4], P.x + Math.cos(P.a) * d - Math.sin(P.a) * s, P.y + Math.sin(P.a) * d + Math.cos(P.a) * s); e.alert = false; e.sleep = true; if (k % 2) { e.hp = e.maxHp = 999; e.burn = 30; e.poison = 30; } } }, mode === 'on'); // hälften brinner och är förgiftade (omgång 2)
  await wait(600);
  await ev(() => { window.__ft = []; window.__ftOn = true; window.__hitI = setInterval(() => { for (const e of __game.ents()) if (!e.dead && Math.random() < 0.3) __game.hurtEnemy(e, 0.2, e.x, e.y); }, 250); });
  await wait(1500); await ev(() => { let n = 0; for (const e of __game.ents()) if (!e.dead && n++ < 6) __game.hurtEnemy(e, n % 2 ? e.maxHp * 3 : e.hp + 1.5, e.x, e.y); }); await wait(1500);
  const r = await ev(() => { clearInterval(window.__hitI); window.__ftOn = false; const a = window.__ft.slice().sort((p, q) => p - q); return { n: a.length, mean: a.reduce((s, v) => s + v, 0) / a.length, p95: a[Math.floor(a.length * 0.95)] }; });
  res[mode].push(r); console.log(rep, mode, JSON.stringify(r));
}
await ev(() => __game.gfxE.set(true)); const bench = await ev(() => __game.gfxE.bench(300)); console.log(`FIENDERs logik (tick + poser för ${await ev(() => __game.ents().length)} fiender): ${bench.toFixed(4)} ms per bildruta (strypt)`);
const avg = (k, f) => res[k].reduce((s, r) => s + r[f], 0) / res[k].length;
console.log(`MEDEL på: ${avg('on', 'mean').toFixed(2)} ms (p95 ${avg('on', 'p95').toFixed(1)}) · av: ${avg('off', 'mean').toFixed(2)} ms (p95 ${avg('off', 'p95').toFixed(1)})`);
await done();
