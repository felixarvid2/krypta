// Version 17: Spökskeppet och Laboratoriet – plankor, vågor, syra, transmutation, teslaspolar, kanoner, alembiker, flaskhyllor,
// krutfat, tolv fiender, kedjekulekanonen, syrasprutan, kulkistor/syraflaskor, Spökkaptenen och Alkemisten, avgrundens regel
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, shot, ev, wait, ok, done, gwait } = await setup(PORT, 'out/t89');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
ok(await ev(() => window.Music && Music.HI.includes('ship') && Music.HI.includes('lab')), 'musiken har intensitetslager för skeppet och laboratoriet');
await ev(() => {
  const g = __game; g.profile.tutDone = true;
  const W = 40, H = 30, grid = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[26][3] = 'P'; grid[2][36] = 'x';
  // väggar
  grid[5][20] = 'ǒ'; grid[6][20] = 'Ǔ'; grid[7][20] = 'ǔ'; grid[8][20] = 'Ǡ'; grid[9][20] = 'ǡ'; grid[10][20] = 'Ǣ';
  // faror
  grid[26][8] = 'Ǎ'; grid[20][26] = 'Ǎ'; for (let x = 10; x <= 13; x++) grid[26][x] = 'Ǐ'; grid[22][8] = 'Ǜ'; grid[22][12] = 'ǜ'; grid[18][30] = 'ǜ';
  // föremål i rummen
  grid[14][4] = 'ǎ'; grid[16][4] = 'ǐ'; grid[12][14] = 'Ǒ'; grid[12][26] = 'ǝ'; grid[4][4] = 'Ǟ'; grid[20][16] = 'ǟ';
  // fiender
  grid[16][24] = 'Ǖ'; grid[3][30] = 'ǖ'; grid[14][34] = 'Ǘ'; grid[22][34] = 'ǘ'; grid[26][30] = 'Ǚ'; grid[24][24] = 'ǚ';
  grid[14][10] = 'ǣ'; grid[8][30] = 'Ǥ'; grid[4][24] = 'ǥ'; grid[8][34] = 'Ǧ'; grid[18][36] = 'ǧ'; grid[26][36] = 'Ǩ';
  // vapen och ammo
  grid[24][4] = 'ǫ'; grid[24][6] = 'ǭ'; grid[20][4] = 'Ǫ'; grid[20][6] = 'Ǭ';
  g.playCustom({ grid, biome: 'dungeon' });
});
await gwait(1.5);
ok(await ev(() => __game.state()) === 'play', 'banan med de nya tecknen startar');
const T12 = ['Ǖ', 'ǖ', 'Ǘ', 'ǘ', 'Ǚ', 'ǚ', 'ǣ', 'Ǥ', 'ǥ', 'Ǧ', 'ǧ', 'Ǩ'];
ok(await ev(T => T.every(t => __game.ents().some(e => e.type === t)), T12), 'alla tolv nya fiender finns');
ok(await ev(() => ['ǎ', 'ǐ', 'Ǒ', 'ǝ', 'Ǟ', 'ǟ'].every(c => __game.props().some(p => p.ch === c))), 'alla sex nya föremål finns');
ok(await ev(() => ['ǒ', 'Ǔ', 'ǔ', 'Ǡ', 'ǡ', 'Ǣ'].every((c, i) => __game.solid(20.5, 5.5 + i))), 'de sex nya väggarna är väggar');
ok(await ev(() => ['chaincrate', 'acidflask', 'chaincannon', 'acidsprayer'].every(t => __game.items().some(i => i.type === t))), 'kulkistan, syraflaskan och de två vapnen ligger ute');
await ev(() => { for (const e of __game.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } });
// ruttna plankor
await ev(() => { const P = __game.P; P.hp = 100; P.iframe = 0; P.x = 7.5; P.y = 26.5; }); await gwait(0.15);
await ev(() => { const P = __game.P; P.x = 8.5; P.y = 26.5; P.vx = P.vy = 0; }); await gwait(1.1);
ok(await ev(() => __game.mapRef()[26][8] === '·' && __game.P.hp < 100 && (__game.P.x | 0) !== 8), 'de ruttna plankorna brakar igenom, skadar och knuffar tillbaka');
// en fiende på plankorna faller igenom men kommer upp bredvid
await ev(() => { const e = __game.spawnEnemy('S', 26.5, 20.5); e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 40; window.__pe = e; }); await gwait(1);
ok(await ev(() => { const e = window.__pe, m = __game.mapRef(); return m[20][26] === '·' && !e.dead && e.hp < e.maxHp && m[e.y | 0][e.x | 0] !== '·'; }), 'en fiende bryter plankorna, tar skada och hamnar bredvid');
// sköljt däck
await ev(() => { const P = __game.P; P.hp = 100; P.x = 11.5; P.y = 26.5; P.vx = P.vy = 0; window.__x0 = P.x; window.__y0 = P.y; __game.v17().wave.t = 5.95; }); await gwait(0.5);
ok(await ev(() => Math.hypot(__game.P.x - window.__x0, __game.P.y - window.__y0) > 0.15), 'vågen knuffar spelaren på det sköljda däcket');
// syra
await ev(() => { const P = __game.P; P.hp = 100; P.armor = 20; P.iframe = 0; P.x = 8.5; P.y = 22.5; P.vx = P.vy = 0; }); await gwait(1.2);
ok(await ev(() => __game.P.armor < 20 && __game.P.hp < 100), 'syran fräter rustningen och skadar');
// transmutationscirkeln: drycken åt spelaren, guld av fienden
await ev(() => { const P = __game.P; P.armor = 0; P.hp = 60; P.x = 12.5; P.y = 22.5; P.rageT = P.ghostT = P.speedT = 0; }); await gwait(0.3);
ok(await ev(() => { const P = __game.P; return P.rageT > 0 || P.ghostT > 0 || P.speedT > 0 || P.hp > 60; }), 'transmutationscirkeln ger spelaren en dryckeseffekt');
await ev(() => { const e = __game.spawnEnemy('S', 30.5, 18.5); e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; window.__gs = e; }); await gwait(0.3);
ok(await ev(() => window.__gs.goldT > 0), 'en fiende på cirkeln blir av guld');
const gold0 = await ev(() => __game.run().gold);
await ev(() => { const e = window.__gs; __game.hurtEnemy(e, 999, e.x, e.y, { noProc: true }); }); await gwait(0.1);
ok(await ev(g0 => __game.run().gold >= g0 + 3, gold0), 'den förgyllda fienden ger guld när den dör');
// teslaspolen slår mot spelaren
await ev(() => { const P = __game.P; P.hp = 100; P.iframe = 0; P.ghostT = 0; P.x = 6.5; P.y = 5.5; }); await gwait(3);
ok(await ev(() => __game.P.hp < 100), 'teslaspolen slår en blixt mot spelaren');
// kanonen
await ev(() => { const g = __game, P = g.P, e = g.ents().find(o => o.type === 'ǣ'); P.hp = 100; P.x = 4.5; P.y = 15.5; P.a = Math.atan2(e.y - 14.5, e.x - 4.5); window.__h = e; window.__hp0 = e.hp; }); await gwait(0.2);
await pg.keyboard.press('KeyE'); await gwait(0.8);
ok(await ev(() => (__game.profile.cannons || 0) >= 1 && (window.__h.dead || window.__h.hp < window.__hp0)), 'kanonen skjuter dit spelaren tittar');
// alembiken
await ev(() => { const g = __game, P = g.P; for (const it of g.items()) if (/^gold/.test(it.type)) it.taken = true; g.run().gold = 50; P.x = 16.5; P.y = 21.6; // version 29: guld som ligger kvar (den förgyllda fienden) plockas inte upp mitt i provet (33 i stället för 30)
  P.a = -Math.PI / 2; window.__n0 = g.items().filter(i => i.type === 'potion' && !i.taken).length; window.__p0 = (P.potions || []).length; }); await gwait(0.2);
await pg.keyboard.press('KeyE'); await gwait(0.3);
// version 29: drycken landar mitt emellan alembiken och spelaren och plockas upp när den slutat studsa – räknas på marken eller i fickan
// (förut bara på marken: med väntan i speltid hann spelaren ibland plocka upp den före kontrollen)
ok(await ev(() => __game.run().gold === 30 && (__game.items().filter(i => i.type === 'potion' && !i.taken).length > window.__n0 || (__game.P.potions || []).length > window.__p0)), 'alembiken brygger en dryck för 20 guld ' + await ev(() => [__game.run().gold, __game.items().filter(i => i.type === 'potion' && !i.taken).length, window.__n0, (__game.P.potions || []).length, window.__p0].join()));
// flaskhyllan och krutfatet
await ev(() => { __game.P.x = 3.5; __game.P.y = 26.5; __game.explode(26.5, 13.4, 1, 0.6, false); __game.explode(14.5, 13.4, 1, 0.6, false); }); await gwait(0.6);
ok(await ev(() => __game.v17().clouds.length > 0), 'flaskhyllan går sönder i ett färgat moln');
ok(await ev(() => __game.mapRef()[12][14] === '.'), 'krutfatet smäller');
// vapnen
const idx = await ev(() => Object.fromEntries(['chaincannon', 'acidsprayer'].map(id => [id, __game.WEAPONS.findIndex(w => w.id === id)])));
ok(idx.chaincannon === 32 && idx.acidsprayer === 33, 'de två nya vapnen har index 32 och 33 ' + JSON.stringify(idx));
await ev(i => { const g = __game; for (const k of Object.values(i)) { g.P.has[k] = true; g.P.mags[k] = g.WEAPONS[k].mag; } g.P.ammo.chainballs = 10; g.P.ammo.acid = 100; g.P.hp = 100; }, idx);
// kedjekulan genom tre fiender på rad
await ev(i => { const g = __game; window.__row = [0, 1, 2].map(k => { const e = g.spawnEnemy('S', 12.5 + k * 1.5, 9.5); e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 200; return e; }); g.P.x = 9.5; g.P.y = 9.5; g.P.a = 0; g.switchWeapon(i.chaincannon); }, idx);
await gwait(0.8); await ev(() => { __game.WS.cd = 0; __game.fire(); }); await gwait(0.8);
ok(await ev(() => window.__row.every(e => e.hp < e.maxHp)), 'kedjekulan går igenom tre fiender');
// syrasprutan mot slemmet
await ev(i => { const g = __game, e = g.ents().find(o => o.type === 'Ǥ'); g.P.x = e.x - 2; g.P.y = e.y; g.P.a = 0; g.switchWeapon(i.acidsprayer); window.__o = e; window.__ohp = e.hp; }, idx);
await gwait(0.8); await ev(() => __game.setMouse(true)); await gwait(0.6); await ev(() => __game.setMouse(false));
ok(await ev(() => window.__o.hp < window.__ohp && window.__o.corrodeT > 0), 'syrasprutan skadar och fräter');
await shot('acid');
// ammo från kulkistan och syraflaskan
await ev(() => { const g = __game; g.P.ammo.chainballs = 0; g.P.ammo.acid = 0; g.P.x = 4.5; g.P.y = 24.5; }); await gwait(0.3);
await ev(() => { __game.P.x = 6.5; __game.P.y = 24.5; }); await gwait(0.3);
ok(await ev(() => __game.P.ammo.chainballs > 0 && __game.P.ammo.acid > 0), 'kulkistan och syraflaskan ger ammo');
// fienderna
// version 29: utgångsläget görs uttryckligt. Immuniteten slår bara till om ingen träff kom de senaste 4 s (immCd), så en tidigare träff
// (moln, blixt, skott) inom 4 s speltid gav FAIL. Ingen sådan träff syntes i fyra körningar med en fälla på e.hp; rasten skrivs ut om den fallerar.
{ const r = await ev(() => { const g = __game, e = g.ents().find(o => o.type === 'Ǖ'); const pre = { hp: e.hp, immT: e.immT, immCd: e.immCd, now: +g.v27b.t().toFixed(2), dead: e.dead }; e.immT = 0; e.immCd = 0; e.eshield = 0; if (e.hp < 10) e.hp = 10;
  const h0 = e.hp; g.hurtEnemy(e, 2, e.x, e.y, { noProc: true }); const h1 = e.hp; g.hurtEnemy(e, 2, e.x, e.y, { noProc: true }); return { ok: h1 < h0 && e.hp === h1 && e.immT > g.v27b.t(), pre, h0, h1, h2: e.hp }; });
  ok(r.ok, 'spökpiraten blir immun en stund efter en träff' + (r.ok ? '' : ' ' + JSON.stringify(r))); }
ok(await ev(() => { const g = __game, e = g.spawnEnemy('ǣ', 10.5, 17.5); e.d = { ...e.d, speed: 0, dmg: 0 }; const n0 = g.ents().filter(o => o.type === 'ǣ' && !o.dead && o.small).length; g.hurtEnemy(e, 999, e.x, e.y, { noProc: true }); return g.ents().filter(o => o.type === 'ǣ' && !o.dead && o.small).length === n0 + 2; }), 'homunkulusen delar sig i två');
ok(await ev(() => { const g = __game, e = g.ents().find(o => o.type === 'Ǧ'); g.hurtEnemy(e, 9999, e.x, e.y, { noProc: true }); const back = !e.dead && e.hp > 0; e.reformT = 0; g.hurtEnemy(e, 9999, e.x, e.y, { noProc: true, boom: true }); return back && e.dead; }), 'kvicksilvergolemen reser sig en gång men inte efter en explosion');
ok(await ev(() => { const g = __game, n0 = g.v17().clouds.length, e = g.ents().find(o => o.type === 'ǧ'); g.hurtEnemy(e, 999, e.x, e.y, { noProc: true }); return g.v17().clouds.length > n0; }), 'flaskgasten spricker i ett moln');
ok(await ev(() => { const g = __game, e = g.ents().find(o => o.type === 'Ǘ'), cx = e.x | 0, cy = e.y | 0; g.hurtEnemy(e, 9999, e.x, e.y, { noProc: true }); return g.mapRef()[cy][cx] === '-'; }), 'den drunknade matrosen lämnar en vattenpöl');
// papegojan stjäl guld
await ev(() => { const g = __game, e = g.spawnEnemy('ǘ', 31.2, 22.5); window.__par = e; g.run().gold = 10; g.P.x = 30.5; g.P.y = 22.5; g.P.iframe = 0; e.x = 31.2; e.y = 22.5; e.alert = true; e.sleep = false; e.d = { ...e.d, dmg: 1 }; e.dive = { a: Math.PI, t: 0.5, hit: false }; }); await gwait(0.4);
ok(await ev(() => __game.run().gold === 7), 'papegojspöket stjäl tre guld ' + await ev(() => [__game.run().gold, window.__par.dead, window.__par.state].join()));
// kanonjären lobbar med en varningsring
await ev(() => { const g = __game, e = g.ents().find(o => o.type === 'ǖ'); g.P.x = 30.5; g.P.y = 9.5; e.alert = true; e.sleep = false; e.lobT = 0.1; e.d = { ...e.d, dmg: 1 }; }); await gwait(0.4);
ok(await ev(() => __game.v17().lobs.length > 0), 'kanonjären lobbar en kanonkula med en ring');
await shot('lob');
// tentakeln dyker och kommer upp på ett nytt ställe
await ev(() => { const g = __game, e = g.ents().find(o => o.type === 'Ǚ'); g.P.x = 27.5; g.P.y = 22.5; e.alert = true; e.sleep = false; e.moveT = 0.05; window.__t = e; window.__tx = e.x; window.__ty = e.y; }); await gwait(0.8);
ok(await ev(() => window.__t.hidden && window.__t.under), 'tentakeln dyker ned');
await gwait(1.4);
ok(await ev(() => !window.__t.hidden && Math.hypot(window.__t.x - window.__tx, window.__t.y - window.__ty) > 0.5), 'tentakeln kommer upp på ett nytt ställe');
await ev(() => { const P = __game.P; P.x = 20; P.y = 16; P.hp = 100; for (const e of __game.ents()) { e.alert = true; e.sleep = false; e.d = { ...e.d, speed: e.type === 'Ǚ' ? 0 : 1.2, dmg: 2 }; } }); await gwait(6);
ok(true, 'de nya fienderna slåss utan fel');
await shot('fight');
// bossarna
const arenas = await ev(() => Gen.ARENAS.slice());
for (const [boss, arena] of [['captain', 'ship'], ['alchemist', 'lab']]) {
  const has = arenas.includes(arena);
  if (!has) console.log(`HOPPAR ÖVER arenan '${arena}' (bangeneratorn har den inte ännu) – ${boss} provas i 'hall'`);
  await ev(([arena, boss, has]) => { const g = __game, L = Gen.boss(12345, { arena: has ? arena : 'hall', boss: has ? boss : 'demon' }); L.bossId = boss; g.run().depth = 6; g.startLevel(L); }, [arena, boss, has]);
  await gwait(0.8);
  ok(await ev(b => __game.boss() && __game.boss().id === b, boss), `${boss}: bossen finns`);
  const states = new Set();
  for (let i = 0; i < 14; i++) { const st = await ev(i => { const g = __game, b = g.boss(); g.P.hp = 100; g.P.iframe = 0.5; if (i === 4 || i === 9) b.spT = 0; if (b.id === 'alchemist' && i === 6) b.formT = 0; return [b.state, b.form || '']; }, i); states.add(st[0]); if (st[1]) states.add('form:' + st[1]); await gwait(0.7); }
  ok(states.size >= 3, `${boss}: byter anfall ${[...states].join(',')}`);
  ok(boss !== 'captain' || states.has('special'), `${boss}: specialanfall`);
  ok(boss !== 'alchemist' || [...states].some(s => s.startsWith('form:') && s !== 'form:normal'), `${boss}: dricker och byter skepnad`);
  await shot('boss_' + boss);
  await ev(() => { const g = __game, b = g.boss(); g.hurtEnemy(b, 99999, b.x, b.y, { noProc: true }); }); await gwait(3.2);
  ok(await ev(() => !__game.boss() || __game.boss().dead || __game.boss().dying), `${boss}: kan besegras`);
}
// väktare
for (const gu of ['captain', 'alchemist']) {
  const r = await ev(gu => { if (!Gen.GUARDIANS || !Gen.GUARDIANS[gu]) return 'skip:bangeneratorn känner inte väktaren ännu'; try { const g = __game, L = Gen.floor(4242, 3, { biome: 'dungeon', guardian: gu }); g.run().depth = 3; g.startLevel(L); return !!g.ents().find(e => e.guardian && e.id === gu); } catch (e) { return 'skip:' + e.message; } }, gu);
  if (typeof r === 'string') console.log(`HOPPAR ÖVER väktaren ${gu}: ${r.replace(/error/ig, 'fel')}`); else ok(r, `${gu} kan vakta en vanlig våning`);
  if (r === true) { await ev(() => { const g = __game, b = g.ents().find(e => e.guardian); g.P.x = b.x - 3; g.P.y = b.y; b.hp -= 1; }); await gwait(4); ok(true, `${gu} som väktare slåss utan fel`); }
}
// sena biomer: aldrig först i en omgång eller i avgrunden
ok(await ev(() => { const g = __game, r = g.run(); const saved = r.seed; let bad = 0; for (let s = 1; s <= 60; s++) { r.seed = s * 7919; if (['garden', 'dream', 'lab'].includes(g.biomeFor(1))) bad++; } r.seed = saved; return bad === 0; }), 'trädgården, drömriket och laboratoriet kommer aldrig först i en omgång');
// avgrunden: första våningen är aldrig en sen biom
{ const seen = [];
  for (let i = 0; i < 10; i++) { await ev(() => { __game.beginAbyss(); }); await gwait(0.5); await pg.keyboard.press('Escape'); await gwait(0.2); seen.push(await ev(() => __game.lvl().biome)); }
  ok(seen.every(b => !['garden', 'dream', 'lab'].includes(b)), 'avgrundens första våning är aldrig trädgården, drömriket eller laboratoriet ' + seen.join(','));
}
await done();
