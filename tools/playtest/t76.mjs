// Version 12: stil, avrättning, parering, överhälsa, inbördes strid, glidhopp, magnet, klockan och betyg
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t76');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const open = () => ev(() => { const g = __game, P = g.P, m = g.mapRef(); const ok = (x, y) => g.freeSpot(x, y, 0.35);
  for (let y = 2; y < m.length - 2; y++) for (let x = 2; x < m[0].length - 2; x++) { const px = x + 0.5, py = y + 0.5; if (!ok(px, py)) continue; if (ok(px + 3, py) && g.hasLOS(px, py, px + 3, py) && ok(px + 1.5, py)) { P.x = px; P.y = py; P.a = 0; return true; } } return false; });
await ev(() => { __game.profile.tutDone = true; __game.profile.runs = 3; __game.settings.cmode = ''; __game.begin('new'); }); await wait(1200); await pg.keyboard.press('Escape'); await wait(1200);
await ev(() => { for (const e of __game.ents()) e.dead = true; });
ok(await open(), 'en öppen plats hittades');
// avrättning: vacklande fiende + spark
await ev(() => { const g = __game, P = g.P; const e = g.spawnEnemy('W', P.x + 1.2, P.y); e.alert = true; e.d = { ...e.d, speed: 0, dmg: 0 }; window.__e = e; P.hp = g.P.hp; });
await ev(() => { const e = window.__e; __game.hurtEnemy(e, e.hp - e.maxHp * 0.15, e.x, e.y, {}); });
ok(await ev(() => __game.canExec(window.__e)), 'fienden vacklar på låg hälsa');
const hp0 = await ev(() => { __game.P.hp = 95; return __game.P.hp; });
await pg.keyboard.press('KeyV'); await wait(300);
ok(await ev(() => window.__e.dead), 'sparken avrättar den vacklande fienden');
const hp1 = await ev(() => __game.P.hp);
ok(hp1 > hp0 + 8, `avrättningen ger hälsa (${hp0} → ${Math.round(hp1)})`);
ok(await ev(() => __game.profile.executions) >= 1, 'avrättningen räknas');
// överhälsa: över max och sjunker sakta
await ev(() => { __game.P.hp = 100; for (let i = 0; i < 3; i++) { const e = __game.spawnEnemy('S', __game.P.x + 1.2, __game.P.y); e.alert = true; e.d = { ...e.d, speed: 0, dmg: 0 }; __game.hurtEnemy(e, e.hp - e.maxHp * 0.1, e.x, e.y, {}); __game.execute(e); } });
const oh = await ev(() => __game.P.hp); ok(oh > 100, `överhälsa över max (${Math.round(oh)})`);
await wait(1500); ok(await ev(() => __game.P.hp) < oh, 'överhälsan sjunker');
// stilmätaren
ok(await ev(() => __game.styleRef().v) > 20, `stilmätaren fylls (${Math.round(await ev(() => __game.styleRef().v))})`);
await shot('style');
const closeUI = async () => { for (let i = 0; i < 6; i++) { const o = await ev(() => !!(window.CardUI && CardUI.isOpen())); if (!o) break; await ev(() => { const el = document.querySelector('.cu-tcard, .cu-talent, .cu-card:not(.owned), .cu-btn'); if (el) el.click(); }); await wait(500); } };
await closeUI();
// sparkparering
await ev(() => { const g = __game, P = g.P; const src = g.spawnEnemy('ř', P.x + 3, P.y); src.alert = true; src.d = { ...src.d, speed: 0 }; window.__src = src; g.projectiles().push({ x: P.x + 0.9, y: P.y, z: 0.5, vx: -2, vy: 0, dmg: 6, src, life: 3 }); g.P.kickT = 0; });
const par0 = await ev(() => __game.profile.parries || 0);
await pg.keyboard.press('KeyV'); await wait(400);
ok(await ev(() => __game.profile.parries || 0) > par0, 'sparken parerar skottet');
ok(await ev(() => window.__src.hp < window.__src.maxHp || window.__src.dead), 'det parerade skottet träffar skytten');
await closeUI(); await wait(400); await closeUI();
// inbördes strid
await ev(() => { const g = __game, P = g.P; for (const e of g.ents()) e.dead = true; const a = g.spawnEnemy('ř', P.x + 3, P.y), b = g.spawnEnemy('W', P.x + 1.5, P.y); a.alert = b.alert = true; a.d = { ...a.d, speed: 0 }; b.d = { ...b.d, speed: 0, ai: undefined }; window.__a = a; window.__b = b;
  g.projectiles().push({ x: a.x - 0.6, y: a.y, z: 0.5, vx: -3, vy: 0, dmg: 4, src: a, life: 2 }); });
for (let i = 0; i < 8 && !(await ev(() => window.__b.hp < window.__b.maxHp)); i++) { await closeUI(); await wait(250); }
ok(await ev(() => window.__b.hp < window.__b.maxHp && window.__b.feud === window.__a), 'en fiendes skott skadar en annan sort, som ger igen');
await closeUI();
// glidhopp
await ev(() => { const g = __game, P = g.P; for (const e of g.ents()) e.dead = true; P.slide = 0.4; P.vx = 6; P.vy = 0; P.jz = 0; P.jv = 0; });
await pg.keyboard.press('Space'); await wait(50);
ok(await ev(() => !!(__game.P.launch && __game.P.launch.keepG)), 'glidhoppet behåller farten');
await wait(900);
await closeUI();
// magnet
await ev(() => { const g = __game, P = g.P; P.jz = 0; P.launch = null; const it = g.dropItem('gold', P.x + 1.8, P.y); it.hvx = 0; it.hvy = 0; window.__it = it; window.__d0 = Math.hypot(it.x - P.x, it.y - P.y); });
await wait(300);
ok(await ev(() => window.__it.taken || Math.hypot(window.__it.x - __game.P.x, window.__it.y - __game.P.y) < window.__d0 - 0.3), 'guldet dras till spelaren');
// betyg
await ev(() => __game.floorDone()); await wait(800);
ok(/[SABCD]/.test(await ev(() => __game.run().grades || '')), 'våningen får ett betyg (' + await ev(() => __game.run().grades) + ')');
await shot('grade');
// klockan
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => { __game.profile.tutDone = true; __game.settings.cmode = 'clock'; localStorage.removeItem('krypta.run'); __game.begin('new'); }); await wait(1200); await pg.keyboard.press('Escape'); await wait(3800);
const c0 = await ev(() => __game.run().clockT); await wait(1000); const c1 = await ev(() => __game.run().clockT);
ok(c1 < c0 && c0 <= 10, `klockan tickar (${c0.toFixed(1)} → ${c1.toFixed(1)})`);
await ev(() => { const g = __game, e = g.ents().find(o => !o.dead && !o.boss); g.hurtEnemy(e, 9999, e.x, e.y, {}); });
ok(await ev(() => __game.run().clockT) > c1 + 2, 'en död ger mer tid');
await shot('clock');
await ev(() => { __game.run().clockT = 0.05; }); await wait(600);
ok(await ev(() => __game.state()) === 'dead', 'när tiden tar slut dör man');
await ev(() => { __game.settings.cmode = ''; });
await done();
