// Version 27: FX i riktigt spel – vapnen skjuter genom fire() mot väggar av olika material och mot en fiende, granatkastaren och ett
// krutfat smäller genom spelets egna vägar, och en vanlig våning spelas en stund med effekterna på. Kontrollerar att krokarna nås
// (mynningsflamma, nedslag, explosion), att taken håller under en lång skur, att version 27 av ger exakt de gamla effekterna och att
// det inte blir några sidfel. All väntan räknas i speltid (__game.roles.t()).
import { setup } from './head.mjs';
const PORT = 9841;
const { pg, ev, wait, ok, done, start } = await setup(PORT, 'out/t141');
const cerrs = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|404/.test(m.text())) cerrs.push(m.text().slice(0, 200)); });
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(60); } };
const gwait = sec => until(null, sec);
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const room = wall => ev(wall => {
  const g = __game; g.profile.tutDone = true; const W = 24, H = 16, grid = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  for (let y = 4; y < 12; y++) grid[y][14] = wall; grid[8][6] = 'P'; grid[2][21] = 'x'; g.playCustom({ grid, biome: 'dungeon' });
}, wall);
const place = () => ev(() => { const g = __game, P = g.P; P.x = 10.5; P.y = 8.5; P.a = 0; P.pitch = 0; P.vx = P.vy = 0; P.hp = 999; P.iframe = 99; g.settings.lowfx = false; g.settings.autoLowFx = false; g.settings.noFlash = false; });
const ready = async wall => { await room(wall); await until(() => __game.state() === 'play' && !!__game.fx27, 5); await place(); await until(() => __game.banner() <= 0, 4); await place(); await gwait(0.2); };
const fireN = (id, n) => ev(([id, n]) => { const g = __game, P = g.P, WS = g.WS, i = g.WEAPONS.findIndex(w => w.id === id), wp = g.WEAPONS[i];
  P.has[i] = true; P.weapon = i; P.mags[i] = wp.mag; if (wp.ammo && P.ammo) P.ammo[wp.ammo] = 99; WS.state = 'idle'; WS.cd = 0; WS.shot = 99; g.fire(); return n; }, [id, n]);
const st = () => ev(() => __game.fx27.state());
// 1) material efter väggens tecken: provar några vanliga väggtecken och ser vilket material nedslagen får
const mats = {};
for (const wall of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) {
  await ready(wall); const n0 = (await st()).n.impact;
  await fireN('pistol', 1); await gwait(0.15);
  const n1 = (await st()).n.impact; const m = Object.keys(n1).find(k => n1[k] > n0[k]); if (m) mats[m] = (mats[m] || []).concat(wall);
}
ok(Object.keys(mats).length >= 1, 'pistolen ger förstärkta nedslag i väggen (material per väggtecken) ' + JSON.stringify(mats));
// 2) hagel: nio kulor i samma bildruta, högst tre förstärkta
await ready('1'); let n0 = (await st()).n;
await fireN('shotgun', 1); await gwait(0.15); let s = await st();
const himp = Object.values(s.n.impact).reduce((a, b) => a + b, 0) - Object.values(n0.impact).reduce((a, b) => a + b, 0);
ok(s.n.muzzle.shot === n0.muzzle.shot + 1 && himp >= 1 && himp <= 3, `hagelgeväret: mynningsflamman och högst 3 förstärkta nedslag (${himp})`);
// 3) en lång skur med kpisten mot väggen: taken håller
await ready('1'); n0 = (await st()).n; let maxP = 0;
for (let i = 0; i < 20; i++) { await ev(() => { const g = __game, WS = g.WS, P = g.P, i = g.WEAPONS.findIndex(w => w.id === 'smg'); P.has[i] = true; P.weapon = i; P.mags[i] = 32; WS.state = 'idle'; WS.cd = 0; g.fire(); }); await gwait(0.09); maxP = Math.max(maxP, await ev(() => __game.particles().length)); }
s = await st();
ok(s.n.muzzle.smg - n0.muzzle.smg >= 10 && maxP <= 260, `kpisten: en flamma per skott (${s.n.muzzle.smg - n0.muzzle.smg}) och partikellistan inom taket (${maxP})`);
// 4) granatkastaren: granaten smäller mot väggen genom explode
await ready('1'); n0 = (await st()).n;
await fireN('launcher', 1); await until(n => __game.fx27.state().n.boom > n, 4, n0.boom); s = await st();
ok(s.n.muzzle.heavy === n0.muzzle.heavy + 1 && s.n.boom === n0.boom + 1 && s.n.ring >= n0.ring, 'granatkastaren: tung mynningsflamma och en rik explosion ' + JSON.stringify({ boom: s.n.boom - n0.boom, ring: s.n.ring - n0.ring }));
// 5) version 27 av: samma händelser ger inga nya räknare, de gamla effekterna och ljusfärgerna finns kvar
await ready('1'); await ev(() => __game.fx27.setOff(true)); n0 = (await st()).n;
await fireN('shotgun', 1); await gwait(0.1); await ev(() => __game.fx27.boom(13, 8.5, 2)); await gwait(0.2); s = await st();
ok(JSON.stringify(s.n) === JSON.stringify(n0) && await ev(() => __game.particles().length > 0), 'version 27 av: inga nya effekter, de gamla finns kvar');
await ev(() => __game.fx27.setOff(false));
// 6) en vanlig våning en stund (rundans start), skjut runt omkring
await start();
await ev(() => { const g = __game; g.settings.autoLowFx = false; g.P.hp = 999; g.P.iframe = 99; });
for (let i = 0; i < 25; i++) { await ev(() => { const g = __game, P = g.P, WS = g.WS; P.a += 0.5; P.mags[P.weapon] = 9; WS.state = 'idle'; WS.cd = 0; g.fire(); }); await gwait(0.15); }
s = await st();
ok(await ev(() => __game.state()) === 'play' && s.n.muzzle.rifle + s.n.muzzle.smg + s.n.muzzle.shot > 0, 'en vanlig våning: skott runt omkring med mynningsflammor ' + JSON.stringify(s.n.muzzle));
ok(cerrs.length === 0, 'inga konsolfel ' + cerrs.join(' / '));
await done();
