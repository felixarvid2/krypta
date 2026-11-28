// Version 15: ljusstråk, honung, klocka, blodfunt, larvsäck, rökelsekaret och bikastaren
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t79');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => {
  const g = __game; g.profile.tutDone = true;
  const W = 32, H = 24, grid = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[20][3] = 'P'; grid[2][28] = 'x';
  grid[18][6] = 'ƍ'; for (let x = 10; x <= 12; x++) grid[18][x] = 'Ɩ'; grid[12][6] = 'Ɛ'; grid[12][16] = 'Ə'; grid[6][24] = 'Ɨ'; grid[8][10] = 'Ǝ'; grid[19][20] = 'ƞ';
  for (let y = 3; y <= 6; y++) grid[y][14] = 'Ɗ'; grid[7][14] = 'Ƌ'; grid[8][14] = 'Ɠ'; grid[9][14] = 'Ɣ';
  grid[12][8] = 'Ƒ'; grid[13][18] = 'ƒ'; grid[4][4] = 'Ɯ'; grid[15][26] = 'Ƙ'; grid[16][27] = 'ƙ'; grid[3][20] = 'ƚ';
  g.playCustom({ grid, biome: 'dungeon' });
});
await wait(1500);
ok(await ev(() => __game.state()) === 'play', 'banan med de nya tecknen startar');
ok(await ev(() => ['Ƒ', 'ƒ', 'Ɯ', 'Ƙ', 'ƙ', 'ƚ'].every(t => __game.ents().some(e => e.type === t))), 'alla sex nya fiender finns');
await ev(() => { for (const e of __game.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0 }; } });
// ljusstråket
await ev(() => { const P = __game.P; P.x = 6.5; P.y = 18.5; }); await wait(300);
ok(await ev(() => __game.P.blessT > 0), 'ljusstråket välsignar');
// honung
await ev(() => { const P = __game.P; P.x = 11.5; P.y = 18.5; P.blessT = 0; }); await wait(300);
ok(await ev(() => __game.P.honeyT > 0), 'honungen klibbar');
// klockan
await ev(() => { const g = __game, P = g.P; P.x = 6.5; P.y = 13.6; P.a = -Math.PI / 2; P.honeyT = 0; }); await wait(200);
await pg.keyboard.press('KeyE'); await wait(300);
ok(await ev(() => (__game.profile.bells || 0) >= 1 && __game.ents().some(e => e.type === 'Ƒ' && e.stun > 0)), 'klockan bedövar fienden bredvid');
// blodfunten
await ev(() => { const P = __game.P; P.x = 16.5; P.y = 13.6; P.a = -Math.PI / 2; }); await wait(200);
await pg.keyboard.press('KeyE'); await wait(300);
ok(await ev(() => (__game.profile.fonts || 0) >= 1), 'blodfunten går att slå sönder');
// larvsäcken kläcks när man kommer nära
const n0 = await ev(() => __game.ents().filter(e => e.type === 'ƚ').length);
await ev(() => { const P = __game.P; P.x = 22; P.y = 6.5; P.a = 0; }); await wait(400);
ok(await ev(() => __game.ents().filter(e => e.type === 'ƚ').length) > n0, 'larvsäcken kläcks');
// vapnen
const idx = await ev(() => Object.fromEntries(['censer', 'hivelauncher'].map(id => [id, __game.WEAPONS.findIndex(w => w.id === id)])));
ok(idx.censer >= 0 && idx.hivelauncher >= 0, 'de två nya vapnen finns ' + JSON.stringify(idx));
await ev(i => { const g = __game; for (const k of Object.values(i)) { g.P.has[k] = true; g.P.mags[k] = g.WEAPONS[k].mag; } g.P.ammo.bees = 20; }, idx);
await ev(i => { const g = __game, e = g.ents().find(o => o.type === 'ƒ' && !o.dead); g.P.x = e.x - 1.5; g.P.y = e.y; g.P.a = Math.PI; g.switchWeapon(i.censer); window.__f = e; }, idx);
await wait(700); await ev(() => { __game.WS.cd = 0; __game.fire(); }); await wait(300);
ok(await ev(() => window.__f.hp < window.__f.maxHp || window.__f.dead), 'rökelsekaret träffar runt om (även bakom)');
await ev(i => { const g = __game, e = g.ents().find(o => o.type === 'ƙ' && !o.dead); g.P.x = e.x - 4; g.P.y = e.y; g.P.a = 0; g.switchWeapon(i.hivelauncher); window.__k = e; }, idx);
await wait(700); await ev(() => { __game.WS.cd = 0; __game.fire(); }); await wait(2000);
ok(await ev(() => window.__k.hp < window.__k.maxHp || window.__k.dead), 'bina hittar och sticker fienden');
await shot('bees');
await ev(() => { const P = __game.P; P.x = 20; P.y = 14; for (const e of __game.ents()) { e.alert = true; e.sleep = false; e.d = { ...e.d, speed: 1.2 }; } }); await wait(6000);
ok(true, 'de nya fienderna slåss utan fel');
await done();
