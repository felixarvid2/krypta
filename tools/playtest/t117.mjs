// Version 25.1: fler Effekseer-effekter (tools/effekseer, Effekseers CC0-exempel) – eld, is som splittras, gift, blixt, bossarnas
// chockvågor och två skärmeffekter (spelarens egen teleport/portalresa och helning). Varje effekt laddas och ritas vid rätt händelse
// genom spelets riktiga vägar, lowfx stänger av den (de gamla effekterna finns kvar), noFlash dämpar blixten, skärmeffekterna håller
// sig inom en liten ruta, taket på 10 effektsprites håller, render-kostnaden mäts med många effekter samtidigt, reserv utan stripparna
// och inga sidfel. All väntan räknas i speltid (__game.roles.t()). EFX_SHOTS=<katalog> sparar före/efter-bilder för montaget.
import fs from 'fs';
import { setup } from './head.mjs';
const PORT = 9817;
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t117');
const cerrs = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|404/.test(m.text())) cerrs.push(m.text().slice(0, 200)); });
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(60); } };
const gwait = sec => until(null, sec);
const NEW = ['fire', 'shatter', 'poison', 'bolt', 'slam'];
const boot = async () => { await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 }); };
const room = () => ev(() => {
  const g = __game; g.profile.tutDone = true; const W = 30, H = 20, grid = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[10][8] = 'P'; grid[2][27] = 'x'; g.playCustom({ grid, biome: 'dungeon' });
});
await boot();
const st = () => ev(() => ({ ...__game.efx.state(), ...__game.efx2.state(), n: __game.efx.state().n }));
let s = await st();
ok(NEW.every(k => s.loaded[k]) && s.hud.portal && s.hud.heal, 'de nya stripparna laddas ' + JSON.stringify({ loaded: s.loaded, hud: s.hud }));
await room(); await wait(1500);
ok(await ev(() => __game.state()) === 'play', 'banan startar');
const place = () => ev(() => { const g = __game, P = g.P; P.x = 8.5; P.y = 10.5; P.a = 0; P.vx = P.vy = 0; P.hp = 999; P.iframe = 99; g.settings.lowfx = false; g.settings.autoLowFx = false; g.settings.noFlash = false; g.efx2.setAmb(5); });
const clear = () => ev(() => { const g = __game; g.particles().length = 0; for (const e of g.ents()) if (!e.dead) { e.hp = 0; e.dead = true; } g.v17().clouds.length = 0; g.pclouds().length = 0; });
const live = k => ev(k => __game.particles().filter(p => p.efx === k).length, k);
const foe = (x, y, type = 'S') => ev(([x, y, type]) => { const e = __game.spawnEnemy(type, x, y); e.hp = e.maxHp = 9999; e.alert = false; e.sleep = true; e.stun = 99; window.__foe = e; return !!e; }, [x, y, type]);
await place(); await gwait(0.3);
const res = {};
// 1) brinnande fiende: en låga ungefär varje sekund (statusTick), inte varje bildruta
await clear(); let n0 = (await st()).n;
await foe(12, 10.5); await ev(() => { window.__foe.burn = 3; window.__foe.burnAcc = 0; });
await until(() => __game.efx.state().n.fire > 0 && __game.particles().some(p => p.efx === 'fire'), 1.5);
s = await st(); res.fire = s.n.fire - n0.fire;
ok(s.n.fire - n0.fire >= 1 && await live('fire') >= 1, 'en brinnande fiende får Effekseer-lågan ' + (s.n.fire - n0.fire));
await gwait(1.6); const f2 = (await st()).n.fire - n0.fire;
ok(f2 >= 2 && f2 <= 3, `lågan återkommer ungefär varje sekund, inte varje bildruta (${f2} på ~2 s)`);
await shot('fire');
// 2) förgiftad fiende
await clear(); n0 = (await st()).n;
await foe(12, 10.5); await ev(() => { window.__foe.poison = 4; });
await until(() => __game.particles().some(p => p.efx === 'poison' && p.tint), 1.5);
s = await st(); res.poison = s.n.poison - n0.poison;
ok(s.n.poison > n0.poison, 'en förgiftad fiende får giftvirveln i grönt ' + (s.n.poison - n0.poison));
// 3) eldmoln och giftmoln (flaskorna, sporerna): genast när molnet uppstår, sedan ungefär varje sekund
await clear(); n0 = (await st()).n;
await ev(() => __game.efx2.flask(12.5, 10.5, 'fire')); await gwait(0.25);
s = await st(); ok(s.n.fire > n0.fire, 'en eldflaska (eldmoln och brinnande mark) ritar lågor ' + (s.n.fire - n0.fire));
await shot('firecloud');
await clear(); n0 = (await st()).n;
await ev(() => { __game.efx2.flask(12.5, 10.5, 'poison'); __game.efx2.spores(12.5, 13); }); await gwait(0.25);
s = await st(); ok(s.n.poison - n0.poison >= 2, 'giftflaskan och sporerna ritar giftvirvlar ' + (s.n.poison - n0.poison));
await shot('poisoncloud');
// 4) is som splittras: en frusen fiende som dör (killEnemy -> shatter)
await clear(); n0 = (await st()).n;
await foe(12, 10.5); await ev(() => { const e = window.__foe; e.hp = e.maxHp = 5; e.frozen = 3; __game.hurtEnemy(e, 50, e.x, e.y, {}); });
await gwait(0.1); s = await st();
ok(s.n.shatter === n0.shatter + 1 && await live('shatter') === 1 && await ev(() => __game.particles().find(p => p.efx === 'shatter').tint[2] > 200), 'en frusen fiende som dör splittras med Effekseer-isen');
await shot('shatter');
// 5) blixt: blixtstavens stråle (zap) och ett åsknedslag (lightningAt -> strikes)
await clear(); n0 = (await st()).n;
await foe(12.5, 10.5);
await ev(() => { const g = __game, P = g.P, WS = g.WS, i = g.WEAPONS.findIndex(w => w.id === 'staff'); P.has[i] = true; P.weapon = i; P.mags[i] = 100; WS.state = 'idle'; WS.shot = 99; WS.cd = 0; });
await gwait(0.4); await ev(() => { const WS = __game.WS; WS.state = 'idle'; WS.cd = 0; WS.shot = 99; __game.fire(); }); await gwait(0.15);
s = await st(); res.zap = s.n.bolt - n0.bolt;
ok(s.n.bolt > n0.bolt, 'blixtstaven ritar urladdningen där strålen slutar ' + (s.n.bolt - n0.bolt));
const b1 = s.n.bolt; await ev(() => { __game.efx2.zap(12.5, 10.5, [255, 220, 150]); __game.efx2.zap(13.5, 9.5, [120, 255, 140]); }); await gwait(0.15);
ok((await st()).n.bolt === b1, 'gula studsar och gröna strålar ger ingen blixt');
await ev(() => { for (let i = 0; i < 6; i++) __game.efx2.zap(12 + i * 0.7, 9, [150, 200, 255]); });
ok((await st()).n.bolt - b1 <= 1, 'blixten spärras: högst en per 0,12 s');
await clear(); n0 = (await st()).n;
await ev(() => __game.lightningAt(12.5, 11, 0.2, 0, true)); await until(() => __game.efx.state().n.bolt > 0 && __game.particles().some(p => p.efx === 'bolt' && p.size > 1), 1);
ok((await st()).n.bolt > n0.bolt, 'åsknedslaget ritar en stor urladdning');
await shot('bolt');
// 6) bossens chockvåg (waves, som lavavågen, kolossen och rökelsekaret)
await clear(); n0 = (await st()).n;
await ev(() => __game.efx2.wave(13, 10.5)); await gwait(0.1);
s = await st(); ok(s.n.slam === n0.slam + 1 && await live('slam') === 1, 'bossens chockvåg ritar smällen där vågen börjar');
await gwait(0.3); ok((await st()).n.slam === n0.slam + 1, 'en smäll per våg');
await shot('slam');
// 7) skärmeffekt: spelarens egen teleport (spawnPuff vid spelaren, som teleportern, stjärnporten och blink)
await clear(); n0 = (await st()).n;
await ev(() => { const P = __game.P; __game.efx.puff(P.x, P.y, 6); }); await gwait(0.15);
s = await st(); const pr = s.rect.portal;
ok(s.n.portal === n0.portal + 1 && pr && pr.t > s.portalT, 'spelarens teleport ritar portalen som skärmeffekt ' + JSON.stringify(pr));
ok(pr && pr.h <= pr.VH * 0.34 && pr.w <= pr.W * 0.34 && pr.x > 0 && pr.x + pr.w < pr.W, 'portalen är en liten ruta mitt i bilden, inte hela skärmen');
ok(await ev(() => { const P = __game.P; return !__game.particles().some(p => p.efx && Math.hypot(p.x - P.x, p.y - P.y) < 1.5); }), 'skärmeffekten är ingen partikel i världen');
ok(await ev(() => { const P = __game.P; return !__game.particles().some(p => !p.efx && p.size >= 0.4 && Math.hypot(p.x - P.x, p.y - P.y) < 0.8); }), 'den gamla puffen i kameran (som fyllde skärmen) ersätts av portalen');
await shot('portal');
await ev(() => { const P = __game.P; __game.efx.puff(P.x, P.y, 6); __game.efx.puff(P.x, P.y, 4); });
ok((await st()).n.portal === n0.portal + 1, 'samma teleport (blink puffar två gånger) och små puffar ger bara en');
// 8) skärmeffekt: helning vid hälsan (hälsan stiger; inte när hälsan sätts om)
await gwait(1.3); n0 = (await st()).n;
await ev(() => { __game.P.hp = 40; }); await gwait(0.15); await ev(() => { __game.P.hp = 60; }); await gwait(0.15);
s = await st(); const hr = s.rect.heal;
ok(s.n.heal === n0.heal + 1 && hr && hr.t > s.healT, 'helningen ritas vid hälsan ' + JSON.stringify(hr));
ok(hr && hr.w <= 32 && hr.h <= 48, 'helningen är en liten ruta');
await shot('heal');
await gwait(1.3); n0 = (await st()).n;
await ev(() => { __game.P.hp = 999; }); await gwait(0.15); await ev(() => { __game.P.hp = 999.5; }); await gwait(0.15);
ok((await st()).n.heal === n0.heal, 'stora hopp (ny bana, testerna) och småsmulor räknas inte som helning');
// 9) portalresa: genom en portal till en ny bana
n0 = (await st()).n;
await ev(() => { __game.enterPortal({ kind: 'gold', x: 0, y: 0 }); }); await until(n => __game.efx.state().n.portal > n && __game.state() === 'play', 3, n0.portal);
s = await st(); ok(s.n.portal === n0.portal + 1, 'portalresan visar portalen på den nya banan ' + JSON.stringify({ n: s.n.portal - n0.portal, st: await ev(() => __game.state()) }));
await gwait(0.5); await room(); await gwait(1.2); await place(); await gwait(0.2);
ok(await ev(() => __game.mapRef().length === 20 && __game.state() === 'play'), 'tillbaka i provsalen');
// 10) taket: högst 10 levande effektsprites, och brand/gift tränger inte ut träffarna
await clear(); await ev(() => { for (let i = 0; i < 25; i++) __game.efx2.strike(10 + (i % 5) * 1.2, 7 + (i / 5 | 0) * 1.4); });
ok(await ev(() => __game.particles().filter(p => p.efx).length) === 10, 'högst 10 levande effektsprites');
await clear(); await ev(() => { for (let i = 0; i < 12; i++) { const e = __game.spawnEnemy('S', 11 + (i % 4), 8 + (i / 4 | 0) * 2); e.hp = e.maxHp = 9999; e.stun = 99; e.sleep = true; e.burn = 9; } }); await gwait(1.2);
const amb = await ev(() => __game.particles().filter(p => p.efx).length);
await ev(() => __game.efx.boom(13, 12, 2)); const bm = await live('boom');
ok(amb <= 6 && bm === 1, `tolv brinnande fiender: högst 6 lågor samtidigt (${amb}), explosionen får plats (${bm})`);
// 10b) nära kameran: stora effekter (nedslag 1,3 rutor bort, bossvåg 1,8, eldflaska 1,2) ritas inte (de skulle fylla bilden), de gamla finns kvar
await clear(); await gwait(0.8); await clear(); n0 = (await st()).n;
await ev(() => { const g = __game, P = g.P; g.efx2.strike(P.x + 1.3, P.y); g.efx2.wave(P.x + 1.8, P.y); g.efx2.flask(P.x + 1.2, P.y + 0.3, 'fire'); }); await gwait(0.15);
s = await st();
ok(s.n.bolt === n0.bolt && s.n.slam === n0.slam && await ev(() => { const P = __game.P; return !__game.particles().some(p => p.efx && Math.hypot(p.x - P.x, p.y - P.y) < p.size * 1.4); }) && await ev(() => __game.particles().some(p => !p.efx)), 'inga stora effektsprites tätt intill kameran ' + JSON.stringify({ bolt: s.n.bolt - n0.bolt, slam: s.n.slam - n0.slam, fire: s.n.fire - n0.fire }));
// 10c) lågan följer en brinnande fiende som springer
await clear(); await gwait(0.8); await clear();
await ev(() => { const e = __game.spawnEnemy('S', 12, 10.5); e.hp = e.maxHp = 9999; e.burn = 9; window.__run = e; });
await until(() => __game.particles().some(p => p.efx === 'fire'), 1.5);
await ev(() => { window.__run.x += 0.4; window.__run.y += 0.3; }); await gwait(0.1);
ok(await ev(() => { const e = window.__run, p = __game.particles().find(q => q.efx === 'fire'); return !!p && Math.hypot(p.x - e.x, p.y - e.y) < 0.2; }), 'lågan följer fienden när den rör sig');
// 11) noFlash: blixten tonas och dämpas
await clear(); await ev(() => { __game.settings.noFlash = true; __game.efx2.strike(12, 10.5); });
ok(await ev(() => { const p = __game.particles().find(q => q.efx === 'bolt'); return p && p.fade === true && Math.max(...p.tint) < 160; }), 'noFlash: blixten tonas in och dämpas');
await ev(() => { __game.settings.noFlash = false; });
// 12) lowfx: inga nya effekter, de gamla finns kvar
await clear(); await gwait(3.2); await clear(); s = await st(); // brinnande mark från 10b hinner slockna
const lowPuff = await ev(() => { const g = __game, P = g.P; g.settings.lowfx = true; g.efx2.flask(12.5, 10.5, 'fire'); g.efx2.spores(12.5, 12); g.efx2.wave(13, 9); g.lightningAt(12, 9, 0.05, 0, true); g.efx.puff(P.x, P.y, 6); P.hp = 100; return g.particles().filter(p => !p.efx && p.size >= 0.4 && Math.hypot(p.x - P.x, p.y - P.y) < 0.8).length; });
ok(lowPuff === 6, 'lowfx: den gamla puffen vid spelaren finns kvar (' + lowPuff + ')');
await foe(12, 11); await ev(() => { const e = window.__foe; e.hp = 5; e.frozen = 3; __game.hurtEnemy(e, 50, e.x, e.y, {}); __game.P.hp = 120; });
await gwait(0.4);
const low = await st(), oldFx = await ev(() => __game.particles().filter(p => !p.efx).length);
ok(['fire', 'poison', 'shatter', 'bolt', 'slam', 'portal', 'heal'].every(k => low.n[k] === s.n[k]) && low.live === 0 && oldFx > 0, 'lowfx stänger av alla nya effekter, de gamla finns kvar ' + JSON.stringify({ oldFx, live: low.live, d: ['fire', 'poison', 'shatter', 'bolt', 'slam', 'portal', 'heal'].filter(k => low.n[k] !== s.n[k]) }));
await ev(() => { __game.settings.lowfx = false; });
// 13) render-kostnad: tolv brinnande fiender, ett giftmoln och ett nedslag samtidigt, 4× CPU-strypning, med och utan
const cdp = await pg.context().newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await clear(); await place();
const bs = { on: [], off: [] };
for (let i = 0; i < 7; i++) for (const off of [true, false]) {
  await ev(off => { const g = __game; g.resume(); g.efx.setOff(off); g.particles().length = 0; for (const e of g.ents()) if (!e.dead) { e.hp = 0; e.dead = true; } g.v17().clouds.length = 0; g.pclouds().length = 0;
    for (let i = 0; i < 12; i++) { const e = g.spawnEnemy('S', 11 + (i % 4), 8 + (i / 4 | 0) * 2); e.hp = e.maxHp = 9999; e.stun = 99; e.sleep = true; e.burn = 9; }
    g.efx2.flask(14, 12, 'poison'); g.lightningAt(12, 11, 0.05, 0, true); }, off);
  await gwait(0.5);
  const r = await ev(() => { const g = __game; g.pause(); const live = g.particles().filter(p => p.efx).length, b = g.wproj.bench(45); g.resume(); return { ...b, live }; });
  bs[off ? 'off' : 'on'].push(r);
}
await ev(() => { __game.efx.setOff(false); }); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
const med = (a, k = 'med') => a.map(r => r[k]).sort((x, y) => x - y)[a.length >> 1];
const on = med(bs.on.slice(1)), offm = med(bs.off.slice(1)), liveOn = med(bs.on.slice(1), 'live');
console.log('BENCH', JSON.stringify({ medOn: +on.toFixed(2), medOff: +offm.toFixed(2), p90On: +med(bs.on.slice(1), 'p90').toFixed(2), p90Off: +med(bs.off.slice(1), 'p90').toFixed(2), liveOn, res }));
ok(liveOn >= 4, `mätningen har många effekter levande samtidigt (${liveOn})`);
ok(on < Math.max(offm * 1.3, offm + 2.0), `render-kostnad med många effekter (4× strypning): ${on.toFixed(2)} ms med, ${offm.toFixed(2)} ms utan`);
// 14) valfritt: före/efter-bilder (samma scen och händelse i en ny sal, effekterna av/på; skärmbild av spelets duk med HUD:en)
if (process.env.EFX_SHOTS) {
  fs.mkdirSync(process.env.EFX_SHOTS, { recursive: true });
  const fam = { fire: 0.45, poison: 0.45, shatter: 0.25, bolt: 0.12, slam: 0.2, portal: 0.2, heal: 0.5 };
  for (const [k, tt] of Object.entries(fam)) for (const off of [true, false]) {
    await room(); await place(); await until(() => __game.banner() <= 0, 4); await place(); await gwait(0.2);
    await ev(([k, off]) => {
      const g = __game, P = g.P; g.efx.setOff(off); g.particles().length = 0;
      const mk = (x, y) => { const e = g.spawnEnemy('S', x, y); e.hp = e.maxHp = 9999; e.stun = 99; e.sleep = true; return e; };
      mk(27.5, 18.5); // en sovande fiende långt bort: ingen portal när den första dör
      if (k === 'fire') { mk(11.2, 10.1).burn = 9; g.efx2.flask(12.6, 11.6, 'fire'); }
      if (k === 'poison') { mk(11.2, 10.1).poison = 9; g.efx2.flask(12.6, 11.6, 'poison'); }
      if (k === 'shatter') { const e = mk(11, 10.5); e.hp = 5; e.frozen = 3; g.hurtEnemy(e, 50, e.x, e.y, {}); }
      if (k === 'bolt') { g.lightningAt(11.5, 10.9, 0.02, 0, true); g.efx2.zap(10.6, 9.9, [150, 200, 255]); }
      if (k === 'slam') g.efx2.wave(12, 10.5);
      if (k === 'portal') g.efx.puff(P.x, P.y, 6);
      if (k === 'heal') P.hp = 50;
    }, [k, off]);
    if (k === 'heal') { await gwait(0.05); await ev(() => { __game.P.hp = 80; }); }
    await gwait(tt);
    await (await pg.$('#screen')).screenshot({ path: `${process.env.EFX_SHOTS}/${k}_${off ? 'fore' : 'efter'}.png` });
    await ev(() => { __game.efx.setOff(false); });
  }
  await room(); await gwait(1.0); await place();
}
// 15) reserv: utan de nya stripparna laddas spelet ändå och de gamla effekterna används
await pg.route(/gfx\/efx_(fire|shatter|poison|bolt|slam|portal|heal)\.png/, r => r.abort());
await boot(); s = await st();
ok(NEW.every(k => !s.loaded[k]) && !s.hud.portal && !s.hud.heal && s.loaded.boom, 'utan de nya stripparna: inga nya laddade, version 25 finns kvar');
await room(); await gwait(1.2); await place(); await gwait(0.2);
await ev(() => { const g = __game, P = g.P; g.efx2.flask(12.5, 10.5, 'fire'); g.efx2.wave(13, 9); g.lightningAt(12, 9, 0.05, 0, true); g.efx.puff(P.x, P.y, 6); P.hp = 100; });
await gwait(0.4); await ev(() => { __game.P.hp = 130; }); await gwait(0.2);
s = await st();
ok(await ev(() => __game.state()) === 'play' && ['fire', 'bolt', 'slam', 'portal', 'heal'].every(k => s.n[k] === 0) && await ev(() => __game.particles().length > 0), 'utan stripparna: de gamla effekterna, utan fel ' + JSON.stringify(s.n));
ok(cerrs.length === 0, 'inga konsolfel ' + cerrs.join(' / '));
await done();
