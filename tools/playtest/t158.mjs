// t158: version 28 (GEN), mätning. Ritningen (render) mäts vid 4× CPU-strypning på samma bana som vanlig våning och som blodvåning (fler fiender och
// väggstänk från start), och på en bana med fönster ǂ, en översvämmad sal och ett vakttorn. Spelaren står vid start och tittar åt fyra håll; median
// av 40 ritningar per håll. Blodvåningen får inte göra ritningen märkbart dyrare (brusigt mått: högst +3 ms i median). Inga sidfel.
import { setup } from './head.mjs';
const PORT = 9858;
const { pg, ev, wait, ok, start, done } = await setup(PORT, 'out/t158');
await start();
const cdp = await pg.context().newCDPSession(pg);
const bench = async (seed, d, opts) => {
  await ev(([s, d, o]) => { const g = __game; g.run().depth = d; g.startLevel(Gen.floor(s, d, o)); g.resume && g.resume(); for (const e of g.ents()) { e.sleep = true; e.alert = false; } }, [seed, d, opts]);
  await wait(500);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const r = await ev(() => { const g = __game, P = g.P, a0 = P.a, out = []; for (let k = 0; k < 4; k++) { P.a = a0 + k * Math.PI / 2; const ts = []; for (let i = 0; i < 40; i++) { const t0 = performance.now(); g.v27b.render(); ts.push(performance.now() - t0); } ts.sort((x, y) => x - y); out.push(ts[ts.length >> 1]); } P.a = a0;
    const v = g.v28g.state(); return { ms: out.reduce((x, y) => x + y, 0) / out.length, worst: Math.max(...out), ents: g.ents().length, walls: v.walls, extra: v.extra }; });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  return r;
};
await ev(() => { __game.settings.blood = 2; });
const a = await bench('t158-mät', 3, { biome: 'dungeon', v28: { blood: false } });
const b = await bench('t158-mät', 3, { biome: 'dungeon', v28: { blood: true } });
const c = await bench('t158-mät', 3, { biome: 'dungeon', v28off: true });
const f = await ev(() => { for (let i = 0; i < 200; i++) { const L = Gen.floor('t158-s' + i, 3, { biome: 'dungeon', v28: { scenes: ['floodhall', 'tower', 'balcony'], windows: 2, blood: false } }); if (L.scenes28.length >= 2 && L.windows28.length) return 't158-s' + i; } return 't158-s0'; });
const s = await bench(f, 3, { biome: 'dungeon', v28: { scenes: ['floodhall', 'tower', 'balcony'], windows: 2, blood: false } });
console.log('MÄTNING (4×, median ms per ritning, snitt av fyra håll):', JSON.stringify({ vanlig: a, blod: b, v28off: c, scener: s }));
ok(b.ms < a.ms + 3, `blodvåningen gör inte ritningen märkbart dyrare: ${a.ms.toFixed(2)} ms -> ${b.ms.toFixed(2)} ms (${b.walls} väggstänk, ${b.extra} extra fiender)`);
ok(Math.abs(a.ms - c.ms) < 3, `version 28 utan blod mot opts.v28off: ${c.ms.toFixed(2)} ms -> ${a.ms.toFixed(2)} ms`);
ok(s.ms > 0, `bana med scener och fönster: ${s.ms.toFixed(2)} ms (värsta håll ${s.worst.toFixed(2)} ms)`);
await done();
