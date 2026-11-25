// Version 25: Effekseer-effekter förrenderade till spritestrippar (tools/effekseer) – explosioner, magiträffar och teleporter.
// Stripparna laddas, ritas när en explosion, en magiträff och en teleport sker, lowfx stänger av dem (de gamla effekterna finns kvar),
// noFlash hoppar över de ljusaste rutorna, inga sidfel, och render-kostnaden mäts med __game.wproj.bench (4× strypning) med och utan.
// EFX_SHOTS=<katalog> sparar också före/efter-bilder av varje effektfamilj (för jämförelsemontaget).
import fs from 'fs';
import { setup } from './head.mjs';
const PORT = 9815;
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t115');
const cerrs = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|404/.test(m.text())) cerrs.push(m.text().slice(0, 200)); });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const st = () => ev(() => __game.efx.state());
let s = await st();
ok(s.loaded.boom && s.loaded.magic && s.loaded.tele, 'de tre Effekseer-stripparna laddas ' + JSON.stringify(s.loaded));
ok(await ev(() => { const f = __game.efx; return !!f && typeof f.setOff === 'function'; }), '__game.efx finns');
// en öppen sal, spelaren i mitten och tittar österut
await ev(() => {
  const g = __game; g.profile.tutDone = true; const W = 30, H = 20, grid = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[10][8] = 'P'; grid[2][27] = 'x'; g.playCustom({ grid, biome: 'dungeon' });
});
await wait(1500);
ok(await ev(() => __game.state()) === 'play', 'banan startar');
const place = () => ev(() => { const P = __game.P; P.x = 8.5; P.y = 10.5; P.a = 0; P.vx = P.vy = 0; P.hp = 999; P.iframe = 99; __game.settings.lowfx = false; __game.settings.autoLowFx = false; });
await place(); await wait(300);
const clear = () => ev(() => { __game.particles().length = 0; });
// 1) explosion
await clear(); const n0 = (await st()).n;
await ev(() => __game.explode(11, 10.5, 0, 2.2, false, true)); await wait(120);
s = await st();
const liveBoom = await ev(() => __game.particles().filter(p => p.efx === 'boom').length);
ok(s.n.boom === n0.boom + 1 && liveBoom === 1, 'explosionen ritar Effekseer-explosionen ' + JSON.stringify({ n: s.n, liveBoom }));
await shot('boom');
// 2) magiträff: ett fiendeklot som slocknar (den riktiga vägen genom updateProjectiles)
await wait(900); await clear();
await ev(() => { __game.projectiles().push({ x: 11, y: 9.8, z: 0.5, vx: 0.1, vy: 0, kind: 'orb', life: 0.02, dmg: 0, src: { x: 20, y: 10 } }); }); await wait(150);
s = await st();
ok(s.n.magic === n0.magic + 1 && await ev(() => __game.particles().some(p => p.efx === 'magic' && p.tint)), 'ett magiskt skott som slocknar ritar magiträffen i skottets färg ' + JSON.stringify(s.n));
await ev(() => { __game.projectiles().push({ x: 11, y: 11, z: 0.5, vx: 0.1, vy: 0, kind: 'arrow', life: 0.02, dmg: 0, src: { x: 20, y: 10 } }); }); await wait(150);
ok((await st()).n.magic === s.n.magic, 'en pil som slocknar ger ingen magiträff');
await shot('magic');
// 3) teleport / framträdande (spawnPuff), med spärr mot samma ställe och små puffar
await wait(700); await clear();
await ev(() => __game.efx.puff(11, 10.5, 8)); await wait(100);
s = await st();
ok(s.n.tele === n0.tele + 1 && await ev(() => __game.particles().some(p => p.efx === 'tele')), 'teleporten ritar ljuspelaren ' + JSON.stringify(s.n));
await ev(() => { __game.efx.puff(11.1, 10.5, 8); __game.efx.puff(13, 9, 2); }); await wait(50);
ok((await st()).n.tele === s.n.tele, 'samma ställe direkt igen och små puffar ger ingen ny pelare');
await shot('tele');
// 4) taket: högst 10 levande effektsprites
await clear(); await ev(() => { for (let i = 0; i < 25; i++) __game.efx.boom(10 + (i % 5), 8 + (i / 5 | 0), 2); });
ok(await ev(() => __game.particles().filter(p => p.efx).length) === 10, 'högst 10 levande effektsprites');
// 5) noFlash: explosionen tonas in och ut och dämpas (ingen skarp blixt)
await clear(); await ev(() => { __game.settings.noFlash = true; __game.efx.boom(11, 10.5, 2); });
ok(await ev(() => { const p = __game.particles().find(q => q.efx === 'boom'); return p && p.fade === true && p.tint && Math.max(...p.tint) < 200; }), 'noFlash: explosionen tonas in och dämpas');
await clear(); await ev(() => { __game.settings.noFlash = false; __game.efx.boom(11, 10.5, 2); });
ok(await ev(() => { const p = __game.particles().find(q => q.efx === 'boom'); return p && !p.fade && !p.tint; }), 'utan noFlash: full styrka');
// 5b) inte vid kameran: ett klot som slocknar 0,3 rutor framför spelaren och en explosion 0,5 rutor bort ger ingen Effekseer-sprite
await clear(); s = await st();
await ev(() => { const P = __game.P; __game.projectiles().push({ x: P.x + 0.3, y: P.y, z: 0.5, vx: 0.1, vy: 0, kind: 'orb', life: 0.01, dmg: 0, src: { x: 20, y: 10 } }); __game.efx.boom(P.x + 0.5, P.y, 2); }); await wait(120);
ok((await st()).n.magic === s.n.magic && (await st()).n.boom === s.n.boom && await ev(() => !__game.particles().some(p => p.efx)), 'ingen Effekseer-sprite tätt intill kameran (fyller annars skärmen)');
// 5c) riktiga magiska vapen mot väggen: stavens laddade klot (samma objekt som staffOrb skapar), runboken och drömstaven
await clear(); await ev(() => { const P = __game.P; P.x = 25.5; P.y = 10.5; P.a = 0; }); await wait(100); s = await st();
await ev(() => { const P = __game.P; __game.projectiles().push({ x: P.x + 0.5, y: P.y, z: 0.5, vx: 7, vy: 0, dmg: 5, src: P, friendly: true, kind: 'sorb', life: 3, bounces: 0, big: false, zapT: 0 }); }); await wait(1000);
ok((await st()).n.magic - s.n.magic >= 1, 'stavens blixtklot ritar magiträffen när det slår i väggen');
for (const id of ['runebook', 'dreamstaff']) {
  await clear(); await ev(() => { const P = __game.P; P.x = 25.5; P.y = 10.5; P.a = 0; }); await wait(100); s = await st();
  await ev(id => { const P = __game.P, WS = __game.WS, i = __game.WEAPONS.findIndex(w => w.id === id); P.has[i] = true; P.weapon = i; P.mags[i] = __game.WEAPONS[i].mag || 30; for (const k in P.ammo) P.ammo[k] = 99; WS.state = 'idle'; WS.shot = 99; WS.cd = 0; }, id); await wait(350);
  await ev(() => { const WS = __game.WS; WS.state = 'idle'; WS.cd = 0; WS.shot = 99; __game.fire(); }); await wait(1300);
  const m = (await st()).n.magic - s.n.magic;
  ok(m >= 1, `${id}: skottet ritar magiträffen när det slocknar (${m})`);
}
await place(); await wait(200);
// 5d) laddning: en kultist (magiskt klot) laddar i handen före skottet
await clear(); s = await st();
await ev(() => { const e = __game.spawnEnemy('Ä', 11.7, 10.5); e.sleep = false; e.alert = true; e.state = 'attack'; e.t = 0; e.didHit = false; window.__cult = e; });
for (let i = 0; i < 30 && (await st()).n.charge <= s.n.charge; i++) await wait(50);
ok((await st()).n.charge > s.n.charge, 'kultisten laddar med Effekseer-laddningen före skottet ' + ((await st()).n.charge - s.n.charge));
await ev(() => { const e = window.__cult; e.hp = 0; e.dead = true; }); await wait(300);
// 6) lowfx: inga Effekseer-effekter, de gamla finns kvar
await clear(); s = await st();
await ev(() => { __game.settings.lowfx = true; __game.explode(11, 10.5, 0, 2.2, false, true); __game.efx.puff(12, 9.5, 8); __game.projectiles().push({ x: 11, y: 11, z: 0.5, vx: 0.1, vy: 0, kind: 'orb', life: 0.02, dmg: 0, src: { x: 20, y: 10 } }); });
await wait(150);
const low = await st(), oldFx = await ev(() => __game.particles().filter(p => !p.efx).length);
ok(low.n.boom === s.n.boom && low.n.magic === s.n.magic && low.n.tele === s.n.tele && !low.on && low.live === 0 && oldFx > 0, 'lowfx stänger av Effekseer-effekterna, de gamla finns kvar ' + JSON.stringify({ n: low.n, oldFx }));
await ev(() => { __game.settings.lowfx = false; });
// 7) render-kostnad: explosion 1,6 rutor framför kameran + magiträff + teleport, 4× CPU-strypning, med och utan
const cdp = await pg.context().newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await place(); await ev(() => __game.pause());
const bs = { on: [], off: [] };
for (let i = 0; i < 7; i++) for (const off of [true, false]) {
  const r = await ev(off => { const g = __game; g.efx.setOff(off); g.particles().length = 0; g.explode(10.1, 10.5, 0, 2.2, false, true); g.efx.puff(11.5, 9.6, 8); g.projectiles().push({ x: 11, y: 11.2, z: 0.5, vx: 0.1, vy: 0, kind: 'orb', life: 0.01, dmg: 0, src: { x: 20, y: 10 } }); return g.wproj.bench(45); }, off);
  bs[off ? 'off' : 'on'].push(r);
}
await ev(() => { __game.efx.setOff(false); __game.resume(); }); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
const med = a => a.map(r => r.med).sort((x, y) => x - y)[a.length >> 1], p90 = a => a.map(r => r.p90).sort((x, y) => x - y)[a.length >> 1];
const on = med(bs.on.slice(1)), offm = med(bs.off.slice(1));
console.log('BENCH', JSON.stringify({ medOn: +on.toFixed(2), medOff: +offm.toFixed(2), p90On: +p90(bs.on.slice(1)).toFixed(2), p90Off: +p90(bs.off.slice(1)).toFixed(2) }));
ok(on < Math.max(offm * 1.3, offm + 2.0), `render-kostnad med tre effekter nära kameran (4× strypning): ${on.toFixed(2)} ms med, ${offm.toFixed(2)} ms utan`);
// 8) valfritt: före/efter-bilder för montaget (samma scen, samma tidssteg, effekten av/på)
if (process.env.EFX_SHOTS) {
  fs.mkdirSync(process.env.EFX_SHOTS, { recursive: true });
  await place(); await wait(300); await ev(() => __game.pause());
  const fam = { boom: [0.22, 0.45], magic: [0.12, 0.24], tele: [0.25, 0.5] };
  for (const [k, ts] of Object.entries(fam)) for (const off of [true, false]) {
    await ev(() => { __game.hazards().length = 0; __game.particles().length = 0; __game.resume(); }); await place(); await wait(2200); await ev(() => __game.pause()); // ljus och eld från förra provet hinner slockna
    const urls = await ev(([k, ts, off]) => {
      const g = __game; g.efx.setOff(off); g.particles().length = 0; g.projectiles().length = 0; const out = []; let t = 0;
      if (k === 'boom') g.explode(11.2, 10.5, 0, 2.2, false, true);
      if (k === 'magic') { g.projectiles().push({ x: 10.2, y: 10.5, z: 0.5, vx: 0.1, vy: 0, kind: 'orb', life: 0.01, dmg: 0, src: { x: 20, y: 10 } }); g.projectiles().push({ x: 10.6, y: 9.9, z: 0.45, vx: 0.1, vy: 0, kind: 'sorb', friendly: true, life: 0.01, dmg: 0, zapT: 9, bounces: 0 }); }
      if (k === 'tele') g.efx.puff(10.6, 10.5, 8);
      for (const tt of ts) { const n = Math.round((tt - t) * 60); g.wproj.bench(Math.max(1, n)); t = tt; out.push(document.getElementById('screen').toDataURL('image/png')); }
      return out;
    }, [k, ts, off]);
    urls.forEach((u, i) => fs.writeFileSync(`${process.env.EFX_SHOTS}/${k}_${off ? 'fore' : 'efter'}_${i}.png`, Buffer.from(u.split(',')[1], 'base64')));
  }
  await ev(() => { __game.efx.setOff(false); __game.resume(); });
}
// 9) reserv: utan stripparna laddas spelet ändå och de gamla effekterna används
await pg.route('**/gfx/efx_*.png', r => r.abort());
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
s = await st();
ok(!s.loaded.boom && !s.loaded.magic && !s.loaded.tele, 'utan stripparna: inget laddat ' + JSON.stringify(s.loaded));
await ev(() => { const g = __game; g.profile.tutDone = true; const W = 20, H = 14, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); } grid[7][4] = 'P'; grid[2][17] = 'x'; g.playCustom({ grid, biome: 'dungeon' }); });
await wait(1200);
await ev(() => { const P = __game.P; P.hp = 999; P.iframe = 99; P.a = 0; __game.explode(P.x + 3, P.y, 0, 2.2, false, true); __game.efx.puff(P.x + 3, P.y + 1, 8); __game.projectiles().push({ x: P.x + 3, y: P.y - 1, z: 0.5, vx: 0.1, vy: 0, kind: 'orb', life: 0.01, dmg: 0, src: { x: 19, y: 7 } }); });
await wait(400);
s = await st();
ok(await ev(() => __game.state()) === 'play' && s.n.boom === 0 && s.n.magic === 0 && s.n.tele === 0 && await ev(() => __game.particles().length > 0), 'utan stripparna: explosion, magiträff och teleport med de gamla effekterna, utan fel');
ok(cerrs.length === 0, 'inga konsolfel ' + cerrs.join(' / '));
await done();
