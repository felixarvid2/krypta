// Version 16: taggrankor, sömnens dimma, glidande väggar, fontän, falsk dörr, stenängel, saxen och drömstaven
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t80');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => {
  const g = __game; g.profile.tutDone = true;
  const W = 32, H = 24, grid = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[20][3] = 'P'; grid[2][28] = 'x';
  grid[18][8] = 'ƥ'; grid[18][9] = 'ƥ'; grid[14][14] = 'Ʀ'; grid[10][20] = 'ƣ'; grid[6][6] = 'Ƨ'; grid[6][12] = 'Ʃ'; grid[8][16] = 'ƪ'; grid[8][18] = 'ƨ';
  for (let y = 3; y <= 6; y++) grid[y][24] = 'Ɵ'; grid[7][24] = 'Ơ'; grid[8][24] = 'Ƣ';
  grid[20][26] = 'ƫ'; grid[16][22] = 'Ƭ'; grid[12][26] = 'ƭ'; grid[4][18] = 'Ʈ'; grid[18][14] = 'Ư'; grid[3][9] = 'ư'; grid[19][5] = 'Ƴ';
  g.playCustom({ grid, biome: 'dungeon' });
});
await wait(1500);
ok(await ev(() => __game.state()) === 'play', 'banan med de nya tecknen startar');
ok(await ev(() => ['ƫ', 'Ƭ', 'ƭ', 'Ʈ', 'Ư', 'ư'].every(t => __game.ents().some(e => e.type === t))), 'alla sex nya fiender finns');
await ev(() => { for (const e of __game.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } });
// taggrankor
await ev(() => { const P = __game.P; P.hp = 100; P.iframe = 0; P.x = 8.5; P.y = 18.5; }); await wait(1200);
ok(await ev(() => __game.P.hp) < 100, 'taggrankorna river');
// sömnens dimma
await ev(() => { const P = __game.P; P.hp = 100; P.x = 14.5; P.y = 14.5; }); await wait(300);
ok(await ev(() => __game.P.mistT) > 0, 'sömnens dimma gör spelaren dåsig');
await shot('mist');
// glidande vägg växlar
const w0 = await ev(() => __game.solid(20.5, 10.5)); let changed = false;
for (let i = 0; i < 6 && !changed; i++) { await wait(500); changed = (await ev(() => __game.solid(20.5, 10.5))) !== w0; }
ok(changed, 'den glidande väggen flyttar sig');
// fontänen
await ev(() => { const P = __game.P; P.hp = 40; P.mistT = 0; P.x = 6.5; P.y = 7.6; P.a = -Math.PI / 2; }); await wait(200);
await pg.keyboard.press('KeyE'); await wait(300);
ok(await ev(() => __game.P.hp) > 60, 'fontänen läker');
// falska dörren
const n0 = await ev(() => __game.ents().filter(e => !e.dead).length);
await ev(() => { const P = __game.P; P.x = 12.5; P.y = 7.6; P.a = -Math.PI / 2; }); await wait(200);
await pg.keyboard.press('KeyE'); await wait(400);
ok(await ev(() => __game.ents().filter(e => !e.dead).length) > n0, 'den falska dörren väcker en fiende');
// stenängeln står still när man tittar
await ev(() => { const g = __game, P = g.P, a = g.ents().find(e => e.type === 'ƫ'); a.d = { ...a.d, speed: 3 }; a.alert = true; a.sleep = false; P.x = a.x - 5; P.y = a.y; P.a = 0; window.__ang = a; window.__ax = a.x; }); await wait(1000);
ok(await ev(() => Math.abs(window.__ang.x - window.__ax) < 0.05), 'stenängeln rör sig inte när man tittar på den');
await ev(() => { __game.P.a = Math.PI; }); await wait(1000);
ok(await ev(() => Math.hypot(window.__ang.x - window.__ax, 0) > 0.3 || window.__ang.state === 'attack'), 'stenängeln rör sig när man tittar bort');
// vapnen
const idx = await ev(() => Object.fromEntries(['shears', 'dreamstaff'].map(id => [id, __game.WEAPONS.findIndex(w => w.id === id)])));
ok(idx.shears >= 0 && idx.dreamstaff >= 0, 'de två nya vapnen finns ' + JSON.stringify(idx));
await ev(i => { const g = __game; for (const k of Object.values(i)) { g.P.has[k] = true; g.P.mags[k] = g.WEAPONS[k].mag; } g.P.ammo.dreams = 10; g.P.hp = 100; }, idx);
await ev(i => { const g = __game, e = g.ents().find(o => o.type === 'ƭ' && !o.dead); g.P.x = e.x - 1.3; g.P.y = e.y; g.P.a = 0; g.switchWeapon(i.shears); window.__g = e; }, idx);
await wait(700); await ev(() => { __game.WS.cd = 0; __game.fire(); }); await wait(400);
ok(await ev(() => window.__g.hp < window.__g.maxHp || window.__g.dead), 'saxen klipper');
await ev(() => { __game.setMouse(false, true); }); await wait(150); await ev(() => __game.setMouse(false, false)); await wait(1500);
ok(await ev(() => !__game.P.shearOut), 'den kastade saxen kommer tillbaka');
await ev(i => { const g = __game, e = g.ents().find(o => o.type === 'Ư' && !o.dead); g.P.x = e.x - 4; g.P.y = e.y; g.P.a = 0; g.switchWeapon(i.dreamstaff); window.__d = e; }, idx);
await wait(700); await ev(() => { __game.WS.cd = 0; __game.fire(); }); await wait(1500);
ok(await ev(() => window.__d.dead || window.__d.stun > 0 || window.__d.hp < window.__d.maxHp), 'drömstjärnan söver fienden');
await shot('dream');
await ev(() => { const P = __game.P; P.x = 20; P.y = 14; for (const e of __game.ents()) { e.alert = true; e.sleep = false; e.d = { ...e.d, speed: 1.2, dmg: 5 }; } }); await wait(6000);
ok(true, 'de nya fienderna slåss utan fel');
await done();
