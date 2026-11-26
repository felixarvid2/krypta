// t147: version 27, partikelbudgeten (inställningen PARTIKLAR: AUTO / LÅG / NORMAL / HÖG).
// Testet kontrollerar följande:
// - Taken skalas med PB.k: NORMAL ger dagens värden (150/215/120/200/150/260), LÅG ×0,6 och HÖG ×2.
// - AUTO är NORMAL under webdriver. Med PB.test höjs AUTO vid god marginal och sänks vid hög bildtid, men aldrig under 1.
// - När listan är full går dekor (drift/fade) först och additiva kärnor står kvar.
// - Med HÖG överlever 500 partiklar uppdateringen, medan NORMAL kapar till 260.
// - Ritningen mäts med 0, 260 och 520 synliga partiklar vid 4× CPU-strypning.
// - Inga sidfel uppstår.
import { setup } from './head.mjs';
const PORT = 9847;
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/t147');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`);
await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = false; g.begin('new'); });
await wait(1500); await pg.keyboard.press('Escape'); await wait(500);
await ev(() => { for (const e of __game.ents()) { e.d = { ...e.d, dmg: 0, speed: 0 }; e.alert = false; } __game.P.hp = 1e6; });

const caps = () => ev(() => __game.pb.st());
await ev(() => { __game.settings.particles = 'auto'; __game.pb.tick(1 / 60); });
let c = await caps();
ok(c.k === 1 && c.caps.wb === 150 && c.caps.wh === 215 && c.caps.soft === 120 && c.caps.frame === 200 && c.caps.boom === 150 && c.caps.hard === 260, `AUTO under webdriver = NORMAL, dagens tak ${JSON.stringify(c.caps)}`);
await ev(() => { __game.settings.particles = 'high'; __game.pb.tick(1 / 60); }); c = await caps();
ok(c.k === 2 && c.caps.wh === 430 && c.caps.hard === 520 && c.caps.soft === 240, `HÖG dubblar taken ${JSON.stringify(c.caps)}`);
await ev(() => { __game.settings.particles = 'low'; __game.pb.tick(1 / 60); }); c = await caps();
ok(Math.abs(c.k - 0.6) < 1e-9 && c.caps.hard === 156 && c.caps.wb === 90, `LÅG ×0,6 ${JSON.stringify(c.caps)}`);

const auto = await ev(() => { const g = __game; g.settings.particles = 'auto'; g.pb.set({ test: true, ema: 1 / 60, upT: 0 }); g.pb.apply(1);
  for (let i = 0; i < 60 * 14; i++) g.pb.tick(1 / 60); const up = g.pb.st().k;
  for (let i = 0; i < 30 * 8; i++) g.pb.tick(1 / 24); const down = g.pb.st().k;
  for (let i = 0; i < 30 * 8; i++) g.pb.tick(1 / 40); const mid = g.pb.st().k;
  g.pb.set({ test: false }); g.pb.tick(1 / 60); return { up, down, mid, after: g.pb.st().k }; });
ok(auto.up > 1.9 && auto.down === 1 && auto.mid === 1 && auto.after === 1, `AUTO: 60 fps höjer till ${auto.up.toFixed(2)}, 24 fps sänker till ${auto.down}, aldrig under 1`);

const prio = await ev(() => { const g = __game, P = g.P, L = g.pb.list(); L.length = 0;
  const mk = o => Object.assign({ x: P.x + 1, y: P.y, z: 0.5, vx: 0, vy: 0, vz: 0, life: 5, maxLife: 5, size: 0.05 }, o);
  for (let i = 0; i < 300; i++) L.push(mk({ fade: true, drift: true })); for (let i = 0; i < 100; i++) L.push(mk({ add: true, core: 1 }));
  g.pb.trim(260); const r = { n: L.length, cores: L.filter(p => p.core).length, decor: L.filter(p => p.fade).length }; L.length = 0; return r; });
ok(prio.n === 260 && prio.cores === 100 && prio.decor === 160, `full lista: dekor går först, alla kärnor kvar ${JSON.stringify(prio)}`);

const hold = await ev(() => { const g = __game, P = g.P; const run = mode => { g.settings.particles = mode; g.pb.tick(1 / 60); const L = g.pb.list(); L.length = 0;
  for (let i = 0; i < 500; i++) L.push({ x: P.x + 1.5, y: P.y + (i % 10) * 0.05, z: 0.5, vx: 0, vy: 0, vz: 0, life: 9, maxLife: 9, size: 0.04, add: true });
  g.pb.upd(1 / 60); const L2 = g.pb.list(); const n = L2.length; L2.length = 0; return n; };
  const r = { high: run('high'), normal: run('normal') }; g.settings.particles = 'auto'; g.pb.tick(1 / 60); return r; });
ok(hold.high === 500 && hold.normal === 260, `HÖG håller 500 partiklar, NORMAL kapar till 260 ${JSON.stringify(hold)}`);

const cdp = await pg.context().newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const bench = await ev(() => { const g = __game, P = g.P, L = g.pb.list(); g.settings.particles = 'high'; g.pb.tick(1 / 60);
  const FX = g.v27b.fx(), imgs = [FX.hit[0], FX.hit[1], (FX.parts.dust || FX.hit)[0], (FX.parts.smoke2 || FX.hit)[0]];
  const fill = n => { const L = g.pb.list(); L.length = 0; for (let i = 0; i < n; i++) { const a = (i / Math.max(1, n) - 0.5) * 0.9, d = 1.6 + (i % 13) * 0.5; // som i en strid: utspridda på 1,6–8 rutor, små och mellanstora (rök)
    L.push({ x: P.x + Math.cos(P.a + a) * d, y: P.y + Math.sin(P.a + a) * d, z: 0.2 + (i % 6) * 0.12, vx: 0, vy: 0, vz: 0, life: 99, maxLife: 99, size: 0.03 + (i % 5) * 0.025, img: imgs[i % 4], add: i % 3 === 0 }); } };
  const ms = n => { fill(n); const ts = []; for (let r = 0; r < 40; r++) { const t0 = performance.now(); g.v27b.render(); ts.push(performance.now() - t0); } ts.sort((a, b) => a - b); return ts[ts.length >> 1]; };
  const r = { n0: ms(0), n260: ms(260), n520: ms(520) }; g.pb.list().length = 0; g.settings.particles = 'auto'; g.pb.tick(1 / 60); return r; });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
console.log('MÄTNING (4×, median ms per rendering):', JSON.stringify(bench));
ok(bench.n520 - bench.n260 < (bench.n260 - bench.n0) * 1.6 + 2, `ritningen växer ungefär linjärt: 0 partiklar ${bench.n0.toFixed(2)} ms, 260 → ${bench.n260.toFixed(2)} ms, 520 → ${bench.n520.toFixed(2)} ms`);
await done();
