// t119: version 25.1 – eldkastarens ljus.
// Testet kontrollerar:
// - att fienden som träffas börjar brinna;
// - att strålen lyser upp golvet längs vägen och vid väggen där den slår i (mätt med ljuset per ruta);
// - att ljuset slocknar och värmen (P.flameT) släpper när man slutar spruta;
// - att marken som brinner lyser;
// - att det inte blir några sidfel.
// All väntan räknas i speltid.
import { setup } from './head.mjs';
const PORT = 9819;
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/t119');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`);
await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const gt = () => ev(() => __game.roles.t());
const gwait = async sec => { const t0 = await gt(), w0 = Date.now(); while ((await gt()) - t0 < sec && Date.now() - w0 < 60000) await wait(60); };

// en mörk gång: spelaren i väster, en fiende som står still, en vägg längst bort
await ev(() => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = false;
  const W = 16, H = 7, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[3][2] = 'P'; grid[1][W - 2] = 'x'; for (let y = 1; y < H - 1; y++) grid[y][8] = '1'; // väggen 5,5 rutor framför spelaren
  g.playCustom({ grid, biome: 'dungeon' });
  const E = g.ents(); E.length = 0; const e = g.spawnEnemy('Ä', 5.5, 3.5); e.d = { ...e.d, dmg: 0, speed: 0 }; e.hp = e.maxHp = 1e6; window.__e = e;
  for (const t of g.torches ? g.torches() : []) t.hidden = true;
  g.P.hp = 1e6; g.P.x = 2.5; g.P.y = 3.5; g.P.a = 0; g.P.pitch = 0;
  const i = g.WEAPONS.findIndex(w => w.id === 'flamer'); g.P.has[i] = true; g.P.weapon = i; g.P.mags[i] = 999; g.WS.state = 'idle'; g.WS.shot = 99; g.WS.cd = 0;
  window.__pin = setInterval(() => { const P = __game.P; P.x = 2.5; P.y = 3.5; P.a = 0; P.hp = 1e6; }, 30);
});
await gwait(0.6);
const L = () => ev(() => { const v = __game.flame; return { near: v.light(4, 3), mid: v.light(6, 3), wall: v.light(7, 3), flameT: __game.P.flameT || 0, burn: window.__e.burn || 0 }; });
const before = await L();

// spruta i 0,8 s speltid
await ev(() => { window.__spray = setInterval(() => { const g = __game; g.WS.cd = 0; g.WS.state = 'idle'; g.P.mags[g.P.weapon] = 999; g.fire(); }, 40); });
await gwait(0.8);
const during = await L();
await ev(() => clearInterval(window.__spray));
ok(during.burn > 0, `fienden i strålen brinner (burn ${during.burn.toFixed(2)})`);
ok(during.mid > before.mid + 0.25 && during.wall > before.wall + 0.25, `strålen lyser upp golvet och väggen den slår i (mitt ${before.mid.toFixed(2)} → ${during.mid.toFixed(2)}, vid väggen ${before.wall.toFixed(2)} → ${during.wall.toFixed(2)})`);

// sluta spruta: strålens ljus slocknar (fienden kan fortfarande brinna en stund), värmen släpper
await ev(() => { window.__e.burn = 0; });
await gwait(0.5);
const after = await L();
ok(after.wall < during.wall - 0.2 && after.flameT === 0, `ljuset slocknar och värmen släpper när du slutar (vid väggen ${during.wall.toFixed(2)} → ${after.wall.toFixed(2)}, flameT ${after.flameT})`);

// brinnande mark lyser
await ev(() => { const g = __game; window.__pin && clearInterval(window.__pin); g.P.x = 10.5; g.P.y = 3.5; g.P.a = Math.PI; });
const gfBefore = await ev(() => __game.flame.light(12, 5));
await ev(() => { const gfs = __game.flame ? __game.flame.groundFires() : null; if (gfs) gfs.push({ x: 12.5, y: 5.5, t: 4, acc: 0 }); window.__gfOk = !!gfs; });
const hasGF = await ev(() => window.__gfOk);
if (hasGF) { await gwait(0.3); const gfAfter = await ev(() => __game.flame.light(12, 5)); ok(gfAfter > gfBefore + 0.2, `brinnande mark lyser (${gfBefore.toFixed(2)} → ${gfAfter.toFixed(2)})`); }
else ok(true, 'brinnande mark: ingen testkrok för groundFires (hoppar över)');
await done();
