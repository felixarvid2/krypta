// Version 27 FX del 2: laddade vapen och allt på en gång. Stjärnlansen laddas med musknappen nedtryckt och skjuter när den släpps
// (lanceFire) – mynningsflamman ska synas då också. Sedan en blandad strid med 4× CPU-strypning: kpisten skjuter, två explosioner,
// fiender av olika material dör, fiendeskott flyger och en boss byter fas – med och utan version 27. Inga sidfel. Speltid.
import { setup } from './head.mjs';
const PORT = 9843;
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t143');
const cerrs = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|404/.test(m.text())) cerrs.push(m.text().slice(0, 200)); });
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(60); } };
const gwait = sec => until(null, sec);
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const ready = async (extra = {}) => {
  await ev(extra => { const g = __game; g.profile.tutDone = true; const grid = []; for (let y = 0; y < 20; y++) { const r = []; for (let x = 0; x < 30; x++) r.push(x === 0 || y === 0 || x === 29 || y === 19 ? '1' : '.'); grid.push(r); } grid[10][8] = 'P'; grid[2][27] = 'x'; for (const [k, cs] of Object.entries(extra)) for (const [x, y] of cs) grid[y][x] = k; g.playCustom({ grid, biome: 'dungeon' }); }, extra);
  await until(() => __game.state() === 'play' && !!__game.fx27, 5); await until(() => __game.banner() <= 0, 4);
  await ev(() => { const g = __game, P = g.P; P.x = 8.5; P.y = 10.5; P.a = 0; P.hp = 999; P.iframe = 99; g.settings.lowfx = false; g.settings.autoLowFx = false; g.settings.noFlash = false; const far = g.spawnEnemy('S', 27.5, 18.5); far.hp = far.maxHp = 9999; far.stun = 9999; far.sleep = true; }); await gwait(0.2);
};
const st = () => ev(() => __game.fx27.state());
const arm = id => ev(id => { const g = __game, P = g.P, WS = g.WS, i = g.WEAPONS.findIndex(w => w.id === id), wp = g.WEAPONS[i]; P.has[i] = true; g.switchWeapon ? g.switchWeapon(i) : (P.weapon = i); P.weapon = i; P.mags[i] = wp.mag; if (wp.ammo && P.ammo) P.ammo[wp.ammo] = 99; WS.state = 'idle'; WS.cd = 0; WS.shot = 99; }, id);
await ready();
// 1) stjärnlansen: ladda (nedtryckt) och släpp – en flamma i lansens färg när den skjuter
await arm('starlance'); await gwait(0.4); await arm('starlance');
let n0 = (await st()).n.muzzle.magic, m0 = await ev(() => __game.P.mags[__game.P.weapon]);
await pg.mouse.move(480, 300); await pg.mouse.down(); await gwait(0.7); await pg.mouse.up(); await gwait(0.15);
let s = await st(); const fired = m0 - await ev(() => __game.P.mags[__game.P.weapon]);
ok(fired === 1 && s.n.muzzle.magic === n0 + 1, `stjärnlansen: laddad och släppt ger en flamma (${s.n.muzzle.magic - n0}, skott ${fired})`);
ok(s.muzKeys.some(k => k.startsWith('magic255,235,150')), 'flamman har lansens färg');
// 2) sådant som skjuter genom fire() direkt (stavar, kastare) räknas också, och vapen utan flamma (yxan) ritar ingen
await arm('staff'); await gwait(0.3); await arm('staff'); n0 = (await st()).n.muzzle.magic;
await pg.mouse.down(); await gwait(0.4); await pg.mouse.up(); await gwait(0.1);
ok((await st()).n.muzzle.magic > n0, 'blixtstaven nedtryckt ritar sina flammor');
await arm('axe'); await gwait(0.3); await arm('axe'); const all0 = JSON.stringify((await st()).n.muzzle);
await pg.mouse.down(); await gwait(0.3); await pg.mouse.up(); await gwait(0.2);
ok(JSON.stringify((await st()).n.muzzle) === all0, 'yxan (ingen mynning) ritar ingen flamma');
// 3) allt på en gång med 4× CPU-strypning, med och utan version 27
await ready({ B: [[16, 10]] });
await ev(() => { const b = __game.boss(); if (b) { b.stun = 9999; b.asleep = false; b.cd = 99; } });
const cdp = await pg.context().newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const bs = { on: [], off: [] };
for (let i = 0; i < 9; i++) for (const off of [true, false]) {
  await ev(off => { const g = __game, P = g.P, WS = g.WS; g.resume(); g.fx27.setOff(off); g.particles().length = 0; g.projectiles().length = 0; P.x = 8.5; P.y = 10.5; P.a = 0;
    const t = ['+', 'Ý', 'Ǥ', 'Ë', 'Æ', 'S']; for (let i = 0; i < 6; i++) { const e = g.spawnEnemy(t[i], 11 + i * 0.9, 8 + (i % 2) * 4); e.stun = 99; window['__k' + i] = e; }
    for (let i = 0; i < 8; i++) g.projectiles().push({ x: 15, y: 7 + i * 0.8, z: 0.5, vx: -1.5, vy: 0, dmg: 0, src: { x: 20, y: 10 }, kind: ['orb', 'acid', 'arrow', undefined][i % 4], life: 3 });
    g.fx27.boom(13, 6.5, 2); g.fx27.boom(13, 14.5, 1.5);
    const b = g.boss(); if (b && !b.dead) { b.hp = b.maxHp; b.phase = 1; b.fx27Ph = 1; } }, off);
  await gwait(0.05);
  await ev(() => { const g = __game; for (let i = 0; i < 6; i++) { const e = window['__k' + i]; if (e && !e.dead) { e.hp = 1; g.hurtEnemy(e, 6, e.x, e.y, { noProc: true }); } } const b = g.boss(); if (b && !b.dead) b.hp = b.maxHp * 0.6;
    const P = g.P, WS = g.WS, k = g.WEAPONS.findIndex(w => w.id === 'smg'); P.has[k] = true; P.weapon = k; P.mags[k] = 32; WS.state = 'idle'; WS.cd = 0; g.fire(); });
  await gwait(0.3);
  const r = await ev(() => { const g = __game; g.WS.shot = 0.01; g.pause(); const n = g.particles().length, efx = g.particles().filter(p => p.efx).length, tick = g.fx27.tickMs(60), b = g.wproj.bench(45); g.resume(); return { ...b, n, tick, efx }; });
  bs[off ? 'off' : 'on'].push(r);
}
await ev(() => { __game.fx27.setOff(false); }); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
const med = (a, k = 'med') => a.map(r => r[k]).sort((x, y) => x - y)[a.length >> 1];
const on = med(bs.on.slice(1)), offm = med(bs.off.slice(1));
console.log('BENCH', JSON.stringify({ medOn: +on.toFixed(2), medOff: +offm.toFixed(2), p90On: +med(bs.on.slice(1), 'p90').toFixed(2), p90Off: +med(bs.off.slice(1), 'p90').toFixed(2), partsOn: med(bs.on.slice(1), 'n'), partsOff: med(bs.off.slice(1), 'n'), efxOn: med(bs.on.slice(1), 'efx'), tickOn: +med(bs.on.slice(1), 'tick').toFixed(3) }));
ok(on < Math.max(offm * 1.3, offm + 2.0), `allt på en gång (4× strypning): ${on.toFixed(2)} ms med, ${offm.toFixed(2)} ms utan`);
ok(bs.on.every(r => r.n <= 260 && r.efx <= 10), 'taken håller i den blandade striden');
await shot('mixed');
ok(cerrs.length === 0, 'inga konsolfel ' + cerrs.join(' / '));
await done();
