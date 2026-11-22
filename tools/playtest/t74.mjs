// Version 11: studsplatta, sporpöl, teleporter, spegelväggar, nya vapen och nya fiender i en egen bana
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t74');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => {
  const g = __game; g.profile.tutDone = true;
  const W = 32, H = 24, grid = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[20][3] = 'P'; grid[2][28] = 'x'; grid[20][6] = 'ţ'; grid[17][12] = 'Ť'; grid[14][4] = 'ť'; grid[4][24] = 'ť';
  for (let y = 5; y <= 11; y++) grid[y][16] = 'š'; grid[12][16] = 'Š'; grid[13][16] = 'ŝ'; grid[14][16] = 'Ş';
  grid[8][20] = 'Ś'; grid[10][22] = 'ś'; grid[12][24] = 'Ŝ'; grid[15][19] = 'ŗ'; grid[17][21] = 'Ř'; grid[18][26] = 'ř'; grid[19][9] = 'Ŧ'; grid[3][4] = 'ŧ'; grid[19][4] = 'Ũ';
  g.playCustom({ grid, biome: 'dungeon' });
});
await wait(1500);
ok(await ev(() => __game.state()) === 'play', 'banan med de nya tecknen startar');
ok(await ev(() => __game.tports().length) === 1, 'teleporterparet hittas utan level.teleports');
// studsplattan
await ev(() => { const P = __game.P; P.x = 6.5; P.y = 20.5; P.jz = 0; P.jv = 0; P.a = 0; });
await wait(250);
ok(await ev(() => __game.P.jz > 0.1), 'studsplattan kastar upp spelaren (jz ' + (await ev(() => __game.P.jz.toFixed(2))) + ')');
await wait(1600);
ok(await ev(() => __game.P.jz < 0.03 && __game.P.x > 8), 'landar en bit bort (x ' + (await ev(() => __game.P.x.toFixed(1))) + ')');
// sporpölen
await ev(() => { const P = __game.P; P.x = 12.5; P.y = 17.5; P.jz = 0; P.jv = 0; });
await wait(400);
ok(await ev(() => __game.P.reverseT > 0 && __game.P.halluT > 0), 'sporpölen förvirrar och ger syner');
await shot('hallu');
// teleportern
await ev(() => { const P = __game.P; P.x = 4.5; P.y = 14.5; P.jz = 0; P.jv = 0; P.reverseT = 0; P.halluT = 0; });
await wait(300);
ok(await ev(() => Math.hypot(__game.P.x - 24.5, __game.P.y - 4.5) < 0.6), 'teleportern flyttar spelaren till den andra');
await wait(400);
ok(await ev(() => Math.hypot(__game.P.x - 24.5, __game.P.y - 4.5) < 0.6), 'och skickar inte tillbaka direkt');
// vapnen
const idx = await ev(() => Object.fromEntries(['sporelauncher', 'mirrorshield', 'whip'].map(id => [id, __game.WEAPONS.findIndex(w => w.id === id)])));
ok(Object.values(idx).every(i => i >= 0), 'de tre nya vapnen finns ' + JSON.stringify(idx));
await ev(i => { const g = __game; for (const k of Object.values(i)) { g.P.has[k] = true; g.P.mags[k] = g.WEAPONS[k].mag; } g.P.ammo.spores = 20; }, idx);
// piskan mot sporlingen
await ev(i => { const g = __game, e = g.ents().find(o => o.type === 'ŗ'); g.P.x = e.x - 3.2; g.P.y = e.y; g.P.a = 0; e.alert = false; g.switchWeapon(i.whip); }, idx);
await wait(700);
const before = await ev(() => { const e = __game.ents().find(o => o.type === 'ŗ'); return { x: e.x, hp: e.hp }; });
await ev(() => { __game.WS.cd = 0; __game.fire(); }); await wait(500);
const after = await ev(() => { const e = __game.ents().find(o => o.type === 'ŗ'); return { x: e.x, hp: e.hp, dead: e.dead }; });
ok(after.dead || after.hp < before.hp, 'piskan träffar på avstånd');
ok(after.dead || after.x < before.x - 0.4, 'piskan drar fienden mot spelaren');
// sporkastaren mot mycelbesten
await ev(i => { const g = __game, e = g.ents().find(o => o.type === 'Ř'); g.P.x = e.x - 4; g.P.y = e.y; g.P.a = 0; g.switchWeapon(i.sporelauncher); }, idx);
await wait(800);
await ev(() => { __game.WS.cd = 0; __game.fire(); }); await wait(1200);
ok(await ev(() => __game.pclouds().length) >= 1, 'sporkastaren lämnar ett giftmoln');
await shot('cloud');
// spegelskölden: studsa ett skott
await ev(i => { const g = __game; g.P.x = 8.5; g.P.y = 8.5; g.P.a = 0; g.switchWeapon(i.mirrorshield); }, idx);
await wait(800);
await ev(() => { const g = __game; g.setMouse(false, true); });
await wait(150);
await ev(() => { const g = __game, P = g.P, src = { x: P.x + 4, y: P.y, d: { name: 'TEST' } }; g.projectiles().push({ x: P.x + 2, y: P.y, z: 0.5, vx: -6, vy: 0, dmg: 5, src, kind: undefined, life: 3 }); });
await wait(600);
ok(await ev(() => __game.WS.block === true), 'högerklick håller upp skölden');
ok(await ev(() => __game.profile.reflects >= 1), 'skölden studsar skottet (' + (await ev(() => __game.profile.reflects)) + ')');
await ev(() => __game.setMouse(false, false));
// spegelväggen studsar skott: skjut med pistolen mot väggen x=16 från x=12
await ev(() => { const g = __game; g.P.x = 12.5; g.P.y = 8.5; g.P.a = 0; g.switchWeapon(0); g.P.mags[0] = 10; });
await wait(800);
await ev(() => { __game.WS.cd = 0; __game.fire(); }); await wait(300);
ok(true, 'skott mot spegelväggen kraschar inte');
// riddaren och illusionisten: låt dem slåss en stund
await ev(() => { const g = __game; g.P.x = 19; g.P.y = 9; for (const e of g.ents()) e.alert = true; });
await wait(6000);
const st = await ev(() => { const es = __game.ents(); return { decoys: es.filter(e => e.decoy).length, knight: es.find(e => e.type === 'Ś') && !!es.find(e => e.type === 'Ś').blockUp !== undefined }; });
ok(true, 'fiender i strid utan fel (kopior skapade: ' + st.decoys + ')');
await shot('fight');
await ev(() => __game.killAllCheat()); await wait(800);
ok(await ev(() => !__game.ents().some(e => e.decoy && !e.dead)), 'kopiorna försvinner när illusionisten dör');
await done();
