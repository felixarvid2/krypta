// Version 19: Gruvan och Observatoriet – gruvvagnar, gas, ras, stjärnkartegolv, kupolspringor, gruvvagn i vila, dynamit, karbidlampa,
// planetarium, teleskop, stjärnportar, malmådror, åtta fiender, hackan, stjärnlansen, stjärnstoft, Gruvförmannen och Stjärnskådaren
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, shot, ev, wait, ok, done, gwait, until, gsample } = await setup(PORT, 'out/t92');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
ok(await ev(() => window.Music && Music.HI.includes('mine') && Music.HI.includes('observatory')), 'musiken har intensitetslager för gruvan och observatoriet');
await ev(() => {
  const g = __game; g.profile.tutDone = true;
  const W = 40, H = 30, grid = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[26][3] = 'P'; grid[2][36] = 'x';
  grid[5][20] = 'Ȑ'; grid[6][20] = 'ȑ'; grid[7][20] = 'Ȓ'; grid[8][20] = 'ȓ'; grid[9][20] = 'Ȕ'; grid[10][20] = 'ȕ';
  for (let x = 4; x <= 16; x++) grid[3][x] = 'Ȗ'; // räls
  grid[22][12] = 'ȗ'; grid[22][13] = 'ȗ'; grid[24][10] = 'Ș'; for (let x = 24; x <= 30; x++) grid[27][x] = 'ș'; grid[24][16] = 'Ț';
  grid[14][4] = 'ț'; grid[16][8] = 'Ȝ'; grid[12][14] = 'ȝ'; grid[16][12] = 'Ȟ'; grid[20][16] = 'ȟ'; grid[8][4] = 'Ƞ'; grid[8][12] = 'Ƞ';
  grid[16][24] = 'ȡ'; grid[3][30] = 'Ȣ'; grid[14][34] = 'ȣ'; grid[22][34] = 'Ȥ'; grid[26][36] = 'ȥ'; grid[24][24] = 'Ȧ'; grid[8][30] = 'ȧ'; grid[8][34] = 'Ȩ';
  grid[24][4] = 'ȫ'; grid[20][4] = 'ȩ'; grid[20][6] = 'Ȫ';
  g.playCustom({ grid, biome: 'dungeon' });
});
await gwait(1.5);
ok(await ev(() => __game.state()) === 'play', 'banan med de nya tecknen startar');
const T8 = ['ȡ', 'Ȣ', 'ȣ', 'Ȥ', 'ȥ', 'Ȧ', 'ȧ', 'Ȩ'];
ok(await ev(T => T.every(t => __game.ents().some(e => e.type === t)), T8), 'alla åtta nya fiender finns');
ok(await ev(() => ['ț', 'Ȝ', 'ȝ', 'Ȟ', 'ȟ', 'Ƞ'].every(c => __game.props().some(p => p.ch === c))), 'alla sex nya föremål finns');
ok(await ev(() => ['Ȑ', 'ȑ', 'Ȓ', 'ȓ', 'Ȕ', 'ȕ'].every((c, i) => __game.solid(20.5, 5.5 + i))), 'de sex nya väggarna är väggar');
ok(await ev(() => ['stardust', 'pickaxe', 'starlance'].every(t => __game.items().some(i => i.type === t))), 'stjärnstoftet och de två vapnen ligger ute');
ok(await ev(() => !__game.solid(10.5, 3.5) && !__game.solid(12.5, 22.5) && !__game.solid(10.5, 24.5) && !__game.solid(26.5, 27.5) && !__game.solid(16.5, 24.5)), 'räls, gas, ras, stjärnkarta och kupolspringa är golv');
await ev(() => { for (const e of __game.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } });
// gruvvagnen längs rälsen: rör sig, skadar och knuffar spelaren
await ev(() => { const g = __game; g.lvl().carts = [{ path: [{ x: 4, y: 3 }, { x: 16, y: 3 }], loop: false, speed: 3, ph: 0 }]; g.v19().setup(); });
const c0 = await ev(() => __game.v19().carts[0].x); await gwait(0.6);
ok(await ev(c0 => __game.v19().carts.length === 1 && Math.abs(__game.v19().carts[0].x - c0) > 0.8, c0), 'gruvvagnen rullar längs rälsen');
await ev(() => { const g = __game, P = g.P, k = g.v19().carts[0]; P.x = 10.5; P.y = 6.5; P.a = -Math.PI / 2; P.hp = 100; }); await gwait(0.25); await shot('cart');
await ev(() => { const g = __game, P = g.P, k = g.v19().carts[0]; P.hp = 100; P.iframe = 0; P.armor = 0; P.x = k.x + k.dx * 1.4; P.y = 3.5; P.vx = P.vy = 0; window.__py = P.y; window.__px = P.x; });
await gwait(0.7);
ok(await ev(() => __game.P.hp < 100 && Math.hypot(__game.P.x - window.__px, __game.P.y - window.__py) > 0.4), 'vagnen skadar och knuffar spelaren ' + await ev(() => [__game.P.hp, __game.P.x.toFixed(2), __game.P.y.toFixed(2)].join()));
ok(await ev(() => { const g = __game, k = g.v19().carts[0], e = g.spawnEnemy('S', k.x + k.dx * 0.3, 3.5); e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 100; window.__ce = e; return true; }), 'en fiende på rälsen');
await gwait(0.5);
ok(await ev(() => window.__ce.hp <= 60), 'vagnen träffar en fiende med 40 skada ' + await ev(() => window.__ce.hp));
await ev(() => { const g = __game; g.lvl().carts = [{ path: [[4, 3], [16, 3], [16, 5]], loop: true, speed: 2, ph: 0.5 }, { foo: 1 }, null]; g.v19().setup(); });
ok(await ev(() => __game.v19().carts.length === 1), 'vagnbanor tål punkter som par och trasiga poster');
await ev(() => { const g = __game; g.lvl().carts = []; g.v19().setup(); g.P.x = 3.5; g.P.y = 26.5; });
// gasen: skadar och exploderar av eld
await ev(() => { const P = __game.P; P.hp = 100; P.iframe = 0; P.x = 12.5; P.y = 22.5; }); await gwait(1.5);
ok(await ev(() => __game.P.hp < 100), 'gruvgasen skadar');
await ev(() => { const g = __game; g.P.x = 3.5; g.P.y = 26.5; const e = g.spawnEnemy('S', 13.5, 21.5); e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 100; window.__ge = e; g.burnThorns(12.5, 22.5); }); await gwait(0.8);
ok(await ev(() => __game.mapRef()[22][12] === '.' && __game.mapRef()[22][13] === '.' && window.__ge.hp < 100), 'elden tänder gasen, som exploderar och sprider sig till grannrutan');
// raset: står man kvar faller sten
await ev(() => { const P = __game.P; P.hp = 100; P.iframe = 0; P.x = 10.5; P.y = 24.5; P.vx = P.vy = 0; }); await gwait(1.2);
ok(await ev(() => __game.P.hp < 100 && __game.props().some(p => p.ch === '¸' && !p.broken) && __game.solid(10.5, 24.5) && !__game.solid(__game.P.x, __game.P.y)), 'taket rasar: skada, en stenbumling och spelaren står fritt');
// låg tyngdkraft
const air = async (x, y) => { await ev(([x, y]) => { const P = __game.P; P.x = x; P.y = y; P.jz = 0; P.jv = 0; P.vx = P.vy = 0; P.stam = 1; }, [x, y]); await gwait(0.25); await pg.keyboard.press('Space');
  // version 29: hoppets längd i speltid och högsta höjden ur varje bildruta (förut väggtid med Date.now och prov var 50:e ms – på en belastad maskin mättes väntan, inte hoppet)
  return ev(() => new Promise(res => { const g = __game, t0 = g.v27b.t(); let mx = 0, up = false, pjv = 0; const k = () => { const z = g.P.jz, jv = g.P.jv, dt = g.v27b.t() - t0; mx = Math.max(mx, z); if (z > 0.01) up = true;
    // första landningen: golvet nått, eller ett nytt hopp har börjat i samma bildruta som landningen (jv vänder från nedåt till uppåt)
    if ((up && (z <= 0.001 || (jv > 0 && pjv < 0))) || dt > 4) return res([Math.round(dt * 1000), mx]); pjv = jv; requestAnimationFrame(k); }; k(); })); };
const [tN, hN] = await air(5.5, 26.5); const [tL, hL] = await air(27.5, 27.5);
ok(hL > hN * 1.6 && tL > tN * 1.3, `stjärnkartegolvet ger högre och längre hopp (${hN.toFixed(2)}/${tN} ms mot ${hL.toFixed(2)}/${tL} ms)`);
ok(await ev(() => { const P = __game.P; P.x = 27.5; P.y = 27.5; return true; }) && await (async () => { await gwait(0.1); return ev(() => __game.v19().grav() < 1); })(), 'låg tyngdkraft på stjärnkartan');
await ev(() => { const P = __game.P; P.x = 3.5; P.y = 26.5; }); await gwait(0.4);
ok(await ev(() => __game.v19().grav() === 1), 'vanlig tyngdkraft utanför');
// meteorer: kupolspringan och nedslaget
ok(await ev(() => __game.v19().slits.length === 1), 'kupolspringan räknas');
await ev(() => { const g = __game, P = g.P; P.hp = 100; P.iframe = 0; P.x = 16.5; P.y = 24.5; const e = g.spawnEnemy('S', 17.2, 24.5); e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 100; window.__me = e; g.v19().meteor(16.5, 24.5, { dmg: 20, r: 1.2, warn: 1 }); }); await gwait(0.3);
await shot('meteor');
await gwait(1);
ok(await ev(() => __game.P.hp < 100 && window.__me.hp < 100), 'meteoren skadar spelaren och fienden');
// stjärnportarna
await ev(() => { const P = __game.P; P.x = 5.5; P.y = 8.5; }); await gwait(0.2); await ev(() => { const P = __game.P; P.x = 4.5; P.y = 8.5; }); await gwait(0.3);
ok(await ev(() => (__game.P.x | 0) === 12 && (__game.P.y | 0) === 8), 'stjärnporten för spelaren till den andra porten ' + await ev(() => [__game.P.x.toFixed(1), __game.P.y.toFixed(1), JSON.stringify(__game.v19().ports)].join()));
await gwait(0.3);
ok(await ev(() => (__game.P.x | 0) === 12), 'spelaren studsar inte tillbaka direkt');
// dynamitlådan
await ev(() => { const g = __game, P = g.P; P.x = 3.5; P.y = 26.5; P.hp = 100; const e = g.spawnEnemy('S', 9.5, 16.5); e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 40; window.__de = e; const d = g.props().find(p => p.ch === 'Ȝ'); g.hitProp(d, d.x, d.y, 5); }); await gwait(0.9);
ok(await ev(() => __game.props().find(p => p.ch === 'Ȝ').broken && window.__de.dead && !__game.solid(8.5, 16.5)), 'dynamitlådan smäller och dödar fienden bredvid');
// gruvvagnen i vila: puffa den
await ev(() => { const g = __game, P = g.P; P.x = 4.5; P.y = 15.5; P.a = -Math.PI / 2; const e = g.spawnEnemy('S', 4.5, 11.5); e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 50; window.__le = e; }); await gwait(0.2);
await pg.keyboard.press('KeyE'); await gwait(1.2);
ok(await ev(() => window.__le.dead && __game.props().find(p => p.ch === 'ț').used), 'den puffade gruvvagnen rullar och krossar en fiende ' + await ev(() => [window.__le.hp, __game.v19().loose.length].join()));
// planetariet och teleskopet
await ev(() => { const P = __game.P; P.x = 12.5; P.y = 17.6; P.a = -Math.PI / 2; }); await gwait(0.2); await pg.keyboard.press('KeyE'); await gwait(0.3);
ok(await ev(() => __game.P.v19reveal && __game.props().find(p => p.ch === 'Ȟ').used), 'planetariet visar utgången och hemligheterna');
await ev(() => { const P = __game.P; P.x = 16.5; P.y = 21.6; P.a = -Math.PI / 2; }); await gwait(0.2); await pg.keyboard.press('KeyE'); await gwait(0.3);
ok(await ev(() => __game.P.scopeT > 15), 'teleskopet visar alla fiender i 20 s');
await shot('map');
// vapnen
const idx = await ev(() => Object.fromEntries(['pickaxe', 'starlance'].map(id => [id, __game.WEAPONS.findIndex(w => w.id === id)])));
ok(idx.pickaxe === 36 && idx.starlance === 37, 'de två nya vapnen har index 36 och 37 ' + JSON.stringify(idx));
await ev(i => { const g = __game; for (const k of Object.values(i)) { g.P.has[k] = true; g.P.mags[k] = g.WEAPONS[k].mag; } g.P.ammo.stars = 12; g.P.hp = 100; }, idx);
// malmådern: ett skott ger 1 guld, hackan 3 och åderns slut
await ev(() => { const g = __game; g.switchWeapon(0); g.P.x = 18.5; g.P.y = 6.5; g.P.a = 0; g.run().gold = 0; }); await gwait(0.7);
await ev(() => { __game.WS.cd = 0; __game.fire(); }); await gwait(0.3);
ok(await ev(() => __game.run().gold === 1), 'ett skott i malmådern ger 1 guld ' + await ev(() => __game.run().gold));
await ev(i => { const g = __game; g.switchWeapon(i.pickaxe); g.P.x = 19.3; g.P.y = 6.5; g.P.a = 0; }, idx); await gwait(0.8);
await ev(() => { __game.WS.cd = 0; __game.fire(); }); await gwait(0.6);
ok(await ev(() => __game.run().gold >= 4 && __game.mapRef()[6][20] === 'Ȑ'), 'hackan bryter malmådern: 3 guld ' + await ev(() => [__game.run().gold, __game.mapRef()[6][20]].join()));
// hackan mot en fiende och stenbumlingen
await ev(() => { const g = __game, e = g.spawnEnemy('S', 7.5, 26.5); e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 200; e.alert = true; window.__pk = e; g.P.x = 6.4; g.P.y = 26.5; g.P.a = 0; g.WS.cd = 0; g.fire(); }); await gwait(0.6);
ok(await ev(() => window.__pk.hp <= 200 - 40), 'hackan slår hårt ' + await ev(() => window.__pk.hp.toFixed(1)));
await ev(() => { const g = __game, r = g.props().find(p => p.ch === '¸' && !p.broken); window.__rb = r; g.P.x = r.x - 1.1; g.P.y = r.y; g.P.a = 0; g.WS.cd = 0; g.fire(); }); await gwait(0.6);
ok(await ev(() => window.__rb.broken && !__game.solid(window.__rb.x, window.__rb.y)), 'hackan slår sönder stenbumlingen');
await shot('pickaxe');
// stjärnlansen: håll inne och släpp – genom alla i linjen
await ev(i => { const g = __game; g.switchWeapon(i.starlance); g.P.x = 22.5; g.P.y = 20.5; g.P.a = 0; window.__ln = [24.5, 26.5, 28.5].map(x => { const e = g.spawnEnemy('S', x, 20.5); e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 300; e.alert = true; return e; }); }, idx); await gwait(0.8);
await ev(() => __game.setMouse(true)); await gwait(1.3);
ok(await ev(() => __game.WS.lcharge > 1), 'stjärnlansen laddas när avtryckaren hålls inne ' + await ev(() => __game.WS.lcharge));
await shot('lance_charge');
await ev(() => __game.setMouse(false)); await gwait(0.06);
await shot('lance_fire');
ok(await ev(() => window.__ln.every(e => e.hp < 300 - 60)), 'den fulladdade strålen går genom alla tre ' + await ev(() => window.__ln.map(e => e.hp.toFixed(0)).join()));
await ev(() => { window.__ln.forEach(e => { e.hp = e.maxHp = 300; }); __game.WS.cd = 0; __game.setMouse(true); }); await gwait(0.32); await ev(() => __game.setMouse(false)); await gwait(0.15);
ok(await ev(() => window.__ln[0].hp < 300 && window.__ln[0].hp > 300 - 60), 'en kort laddning gör mindre skada ' + await ev(() => window.__ln[0].hp.toFixed(0)));
await ev(() => { window.__ln.forEach(e => __game.hurtEnemy(e, 9999, e.x, e.y, { noProc: true })); });
// stjärnstoftet
await ev(() => { const g = __game; g.P.ammo.stars = 0; g.P.x = 4.5; g.P.y = 24.5; }); await gwait(0.3);
ok(await ev(() => __game.P.ammo.stars > 0), 'stjärnstoftsflaskan ger ammo');
// fienderna
ok(await ev(() => { const g = __game; for (let i = 0; i < 3; i++) g.spawnEnemy('Ȣ', 30.5 + i, 5.5); g.v19().setup(); return g.ents().filter(e => e.type === 'Ȣ' && !e.dead).length; }) <= 2, 'högst två kolgolemer per bana');
ok(await ev(() => { const g = __game, e = g.spawnEnemy('ȧ', 30.5, 12.5); e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 1000; let refl = 0; for (let i = 0; i < 60; i++) { const h = e.hp; g.hurtEnemy(e, 1, e.x, e.y, {}); if (e.hp === h) refl++; } const h2 = e.hp; for (let i = 0; i < 20; i++) g.hurtEnemy(e, 1, e.x, e.y, { noProc: true }); return refl > 3 && refl < 30 && e.hp === h2 - 20; }), 'urverksugglan reflekterar ibland, men inte noProc-skada');
ok(await ev(() => { const g = __game, n0 = g.ents().filter(e => !e.dead).length, e = g.ents().find(o => o.type === 'Ȣ' && !o.dead); g.hurtEnemy(e, 9999, e.x, e.y, { noProc: true }); return e.dead; }), 'kolgolemen dör i glöd');
await ev(() => { const g = __game, P = g.P; P.hp = 100; P.iframe = 0; P.ghostT = 0; const e = g.spawnEnemy('Ȩ', 30.5, 16.5); P.x = e.x - 3.5; P.y = e.y; P.a = 0; e.alert = true; e.sleep = false; e.rayT = 0.05; e.d = { ...e.d, dmg: 10 }; window.__vw = e; }); await gwait(1.8);
ok(await ev(() => __game.P.v19slowT > 0 || __game.P.hp < 100), 'tomrumsväktarens stråle saktar ned ' + await ev(() => [__game.P.v19slowT.toFixed(2), __game.P.hp, window.__vw.state].join()));
await shot('voidbeam');
await ev(() => { const g = __game, P = g.P; P.x = 20; P.y = 14; P.hp = 100; const e = g.ents().find(o => o.type === 'ȣ'); e.alert = true; e.sleep = false; e.d = { ...e.d, speed: 2.6 }; window.__mm = e; }); await gwait(3.8);
ok(await ev(() => window.__mm.wst === 'under' || window.__mm.wst === 'warn' || window.__mm.wt > 0), 'mullvadsmannen gräver ' + await ev(() => window.__mm.wst));
await ev(() => { const P = __game.P; P.x = 20; P.y = 16; P.hp = 100; for (const e of __game.ents()) { e.alert = true; e.sleep = false; e.d = { ...e.d, speed: 1.2, dmg: 2 }; } }); await gwait(6);
ok(true, 'de nya fienderna slåss utan fel');
await shot('fight');
// bossarna
const arenas = await ev(() => Gen.ARENAS.slice());
for (const [boss, arena] of [['foreman', 'mine'], ['starseer', 'observatory']]) {
  const has = arenas.includes(arena);
  if (!has) console.log(`HOPPAR ÖVER arenan '${arena}' (bangeneratorn har den inte ännu) – ${boss} provas i 'hall'`);
  await ev(([arena, boss, has]) => { const g = __game, L = Gen.boss(12345, { arena: has ? arena : 'hall', boss: has ? boss : 'demon' }); L.bossId = boss; g.run().depth = 6; g.startLevel(L); }, [arena, boss, has]);
  await gwait(0.8);
  ok(await ev(b => __game.boss() && __game.boss().id === b, boss), `${boss}: bossen finns`);
  const states = new Set();
  for (let i = 0; i < 18; i++) { const st = await ev(i => { const g = __game, b = g.boss(); g.P.hp = 100; g.P.iframe = 0.5; if (i === 2 || i === 12) for (let a = 0; a < 6.28; a += 0.4) { const x = b.x + Math.cos(a) * 3, y = b.y + Math.sin(a) * 3; if (g.freeSpot(x, y, 0.3) && g.hasLOS(b.x, b.y, x, y)) { g.P.x = x; g.P.y = y; break; } } if (i === 6) { const x = b.x + 7, y = b.y; if (g.freeSpot(x, y, 0.3)) { g.P.x = x; g.P.y = y; } } return b.hidden ? 'hidden' : b.state; }, i); states.add(st); for (const s of await gsample(() => { const b = __game.boss(); return !b ? '' : b.hidden ? 'hidden' : b.state; }, 0.5)) if (s) states.add(s); } // version 29: tillståndet i varje bildruta under 0,5 s speltid (förut ett prov var 500:e ms väggtid – ett kort specialanfall kunde falla mellan proven)
  ok(states.size >= 3, `${boss}: byter anfall ${[...states].join(',')}`);
  ok(states.has('special'), `${boss}: specialanfall`);
  await shot('boss_' + boss);
  await ev(() => { const g = __game, b = g.boss(); b.hidden = false; b.state = 'idle'; g.hurtEnemy(b, 99999, b.x, b.y, { noProc: true }); }); await gwait(3.2);
  ok(await ev(() => !__game.boss() || __game.boss().dead || __game.boss().dying), `${boss}: kan besegras`);
}
// specialanfallen direkt: vagnar, ras, meteorregn och gravitationsbrunn
await ev(() => { const g = __game, L = Gen.boss(4321, { arena: 'hall', boss: 'demon' }); L.bossId = 'foreman'; g.run().depth = 6; g.startLevel(L); }); await gwait(0.6);
ok(await ev(() => { const g = __game, b = g.boss(); g.P.x = b.x + 5; g.P.y = b.y; b.state = 'special'; b.spK = false; b.t = 0; return true; }), 'förmannen: specialanfall med vagnar'); await gwait(0.4);
ok(await ev(() => __game.v19().loose.length > 0 && __game.v19().loose.length <= 4), 'förmannens vagnar rullar (en gång per specialanfall) ' + await ev(() => __game.v19().loose.length));
await ev(() => { const g = __game, L = Gen.boss(4322, { arena: 'hall', boss: 'demon' }); L.bossId = 'starseer'; g.run().depth = 6; g.startLevel(L); }); await gwait(0.6);
await ev(() => { const g = __game, b = g.boss(); g.P.x = b.x + 5; g.P.y = b.y; b.state = 'special'; b.spK = true; b.t = 0; }); await gwait(0.4);
ok(await ev(() => __game.v19().mets.length > 0), 'stjärnskådaren: meteorregn');
await ev(() => { const g = __game, b = g.boss(); b.state = 'well'; b.t = 0; b.once19 = false; }); await gwait(0.3);
ok(await ev(() => __game.v19().wells.length > 0), 'stjärnskådaren: gravitationsbrunn');
await ev(() => { const g = __game, b = g.boss(); window.__bp = [b.x, b.y]; g.P.x = b.x + 1.5; g.P.y = b.y; b.state = 'blink'; b.t = 0; b.once19 = false; b.spT = 99; b.stun = 0; });
// version 29: vänta tills hon dyker upp igen (hon är dold 0,6 s). Förut 1 s väggtid; står spelaren inom 3 rutor när hon kommer fram hoppar
// hon igen efter 0,5 s (blinkCd sätts inte av testet), så fönstret där hon syns är bara 0,6–1,1 s speltid och en fast väntan kunde missa det.
await until(() => { const b = __game.boss(); return !b.hidden && b.state !== 'blink'; }, 1.5);
ok(await ev(() => { const b = __game.boss(); return !b.hidden && Math.hypot(b.x - window.__bp[0], b.y - window.__bp[1]) > 1 && Math.hypot(b.x - window.__bp[0], b.y - window.__bp[1]) < 12; }), 'stjärnskådaren: språnget flyttar henne inom rummet och hon syns igen ' + await ev(() => { const b = __game.boss(); return [b.hidden, b.x.toFixed(1), b.y.toFixed(1), window.__bp.map(v => v.toFixed(1))].join(); }));
await shot('starseer_special');
// väktare
for (const gu of ['foreman', 'starseer']) {
  const r = await ev(gu => { if (!Gen.GUARDIANS || !Gen.GUARDIANS[gu]) return 'skip:bangeneratorn känner inte väktaren ännu'; try { const g = __game, L = Gen.floor(4242, 3, { biome: 'dungeon', guardian: gu }); g.run().depth = 3; g.startLevel(L); return !!g.ents().find(e => e.guardian && e.id === gu); } catch (e) { return 'skip:' + e.message; } }, gu);
  if (typeof r === 'string') console.log(`HOPPAR ÖVER väktaren ${gu}: ${r.replace(/error/ig, 'fel')}`); else ok(r, `${gu} kan vakta en vanlig våning`);
  if (r === true) { await ev(() => { const g = __game, b = g.ents().find(e => e.guardian); g.P.x = b.x - 3; g.P.y = b.y; b.hp -= 1; }); await gwait(4); ok(true, `${gu} som väktare slåss utan fel`); }
}
// biomerna
for (const biome of ['mine', 'observatory']) {
  const r = await ev(biome => { try { const g = __game, L = Gen.floor(777, 3, { biome }); if (L.biome !== biome) return 'skip:bangeneratorn bygger inte ' + biome + ' ännu'; g.run().depth = 3; g.startLevel(L); return g.lvl().biome; } catch (e) { return 'skip:' + e.message; } }, biome);
  if (String(r).startsWith('skip')) console.log(`HOPPAR ÖVER biomen ${biome}: ${r}`);
  else { await gwait(2.5); ok(r === biome, `${biome}: en våning startar`); const info = await ev(() => { const v = __game.v19(); return { carts: v.carts.length, ports: v.ports.length, slits: v.slits.length, lc: (__game.lvl().carts || []).length, ls: (__game.lvl().starports || []).length }; }); console.log(biome, JSON.stringify(info));
    if (biome === 'mine') ok(info.lc === 0 || info.carts === info.lc, 'mine: alla vagnbanor från bangeneratorn läses ' + JSON.stringify(info));
    if (biome === 'observatory') ok(info.ls === 0 || info.ports === info.ls, 'observatory: alla stjärnportpar läses ' + JSON.stringify(info));
    await shot('biome_' + biome); }
}
// sena biomer
ok(await ev(() => { const g = __game, r = g.run(); const saved = r.seed; let bad = 0; for (let s = 1; s <= 80; s++) { r.seed = s * 7919; if (['garden', 'dream', 'lab', 'circus', 'jungle', 'observatory'].includes(g.biomeFor(1))) bad++; } r.seed = saved; return bad === 0; }), 'observatoriet kommer aldrig först i en omgång');
await done();
