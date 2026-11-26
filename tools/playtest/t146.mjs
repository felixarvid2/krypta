// t146: version 27, render-kostnaden med scener och rumsmallar. En fängelsehåla (djup 3) med flest utstämplade rutor (hyllgångar, pelarsal,
// rumsmallar) laddas med och utan version 27 (opts.v27off: samma bana utan scenerna), spelaren står på samma ruta och tittar in i scenens rum,
// fienderna tas bort, och render-kostnaden mäts med __game.wproj.bench (4× CPU-strypning), sju omgångar växelvis. Ökningen ska vara liten
// (median högst +15 %). Inga sidfel. Skärmbilder: scen och utan scen (LVL27_OUT eller tools/playtest/out/t146).
import { setup } from './head.mjs';
const PORT = 9846, OUT = process.env.LVL27_OUT || 'out/t146';
const { pg, ev, wait, ok, start, done } = await setup(PORT, OUT);
await start();
// banan med flest rutor som version 27 ändrade
const pick = await ev(() => { let best = null; for (let i = 0; i < 200; i++) { const s = 't146-' + i, o = { biome: 'dungeon', v27: { plan: null, scenes: ['stacks', 'pillarhall', 'prefab:colonnade', 'prefab:statuehall', 'prefab:feast'] } };
  const L = Gen.floor(s, 3, o), B = Gen.floor(s, 3, { biome: 'dungeon', v27off: true }); let n = 0; for (let y = 0; y < L.map.length; y++) for (let x = 0; x < L.map[0].length; x++) if (L.map[y][x] !== B.map[y][x]) n++;
  if (L.scenes27.length && (!best || n > best.n)) best = { s, n, sc: L.scenes27 }; } return best; });
ok(!!pick && pick.n >= 8, 'en bana med scener: ' + JSON.stringify(pick && { s: pick.s, n: pick.n, sc: pick.sc.map(x => x.kind) }));
const sc = pick.sc.slice().sort((a, b) => b.w * b.h - a.w * a.h)[0];
const load = off => ev(([s, off, sc]) => { const g = __game; g.settings.autoLowFx = false; g.settings.lowfx = false; g.startLevel(Gen.floor(s, 3, off ? { biome: 'dungeon', v27off: true } : { biome: 'dungeon', v27: { plan: null, scenes: ['stacks', 'pillarhall', 'prefab:colonnade', 'prefab:statuehall', 'prefab:feast'] } }));
  g.resume && g.resume(); for (const e of g.ents()) { e.dead = true; e.hidden = true; e.hp = 0; }
  const L = g.lvl(), m = g.mapRef(), cx = sc.x + sc.w / 2, cy = sc.y + sc.h / 2; let best = null, bd = -1;
  for (let y = sc.y - 2; y < sc.y + sc.h + 2; y++) for (let x = sc.x - 2; x < sc.x + sc.w + 2; x++) if (y > 0 && x > 0 && y < m.length - 1 && x < m[0].length - 1 && L.roomMask[y][x] !== '-' && L.roomMask[y].charCodeAt(x) - 48 === sc.room && Gen.floor(s, 3, { biome: 'dungeon', v27off: true }).map[y][x] === '.' && L.map[y][x] === '.') { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d > bd) { bd = d; best = [x, y]; } }
  const P = g.P; P.x = best[0] + 0.5; P.y = best[1] + 0.5; P.a = Math.atan2(cy - P.y, cx - P.x); P.hp = 99999; return best; }, [pick.s, off, sc]);
const p1 = await load(false); await wait(500); await pg.screenshot({ path: `${OUT}/t146_scen.png` });
const p0 = await load(true); await wait(500); await pg.screenshot({ path: `${OUT}/t146_utan.png` });
ok(p1 && p0 && p1[0] === p0[0] && p1[1] === p0[1], 'spelaren står på samma ruta med och utan scenerna ' + JSON.stringify([p1, p0]));
const cdp = await pg.context().newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const bs = { on: [], off: [] };
for (let i = 0; i < 7; i++) for (const off of [true, false]) {
  await load(off); await wait(300);
  bs[off ? 'off' : 'on'].push(await ev(() => { const g = __game; g.pause(); const b = g.wproj.bench(45); g.resume(); return b; }));
}
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
const med = a => a.map(r => r.med).sort((x, y) => x - y)[a.length >> 1];
const on = med(bs.on.slice(1)), off = med(bs.off.slice(1));
console.log('     render (4× strypning, median ms per bildruta): utan scener ' + off.toFixed(2) + ', med scener ' + on.toFixed(2) + ' (' + (100 * (on / off - 1)).toFixed(1) + ' %)');
ok(on <= off * 1.15 + 0.3, 'render-kostnaden med scenerna ökar lite: ' + off.toFixed(2) + ' -> ' + on.toFixed(2) + ' ms');
await done();
