// t125: version 26B, närstridsparering. Kontroller: ett skelett som anfaller blinkar (räknaren och ritningen, även med lowfx) och
// skadar spelaren utan spark (kontroll); en spark i fönstret parerar – ingen skada, fienden vacklar (canExec) och nästa spark avrättar;
// en spark utanför fönstret är en vanlig spark (ingen vacklan); en parerad elit bedövas men vacklar inte; en explosiv elit ger blått
// fönster och går inte att parera; parering av ger vanlig spark. Med INGA BLIXTAR och FÄRGBLIND ritas markeringen ändå (form).
// Inga sidfel. Alla väntetider räknas i speltid (__game.roles.t()), inte väggtid.
import { setup } from './head.mjs';
const PORT = 9825;
const { pg, ev, wait, ok, done, shot } = await setup(PORT, 'out/t125');
const load = async (q = '') => { await pg.goto(`http://localhost:${PORT}/index.html?nolock=1${q}`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 }); };
await load();
ok(await ev(() => !!__game.v26b && __game.v26b.state().on && __game.v26b.state().parry), '__game.v26b finns och pareringen är på');

// scen som i t116: rutnät med väggram; skelettet står still precis framför spelaren (inom räckhåll 0,95) och gör skada
const sceneFn = o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = o.lowfx !== false; g.settings.noFlash = !!o.noFlash; g.settings.cb = o.cb || 0;
  const W = 20, H = 11, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[5][5] = 'P'; grid[1][W - 2] = 'x'; grid[5][8] = 'S';
  g.playCustom({ grid, biome: 'dungeon' });
  const E = g.ents(); E.length = 0; const e = g.spawnEnemy('S', 6.3, 5.5);
  e.d = { ...e.d, dmg: 10, speed: 0 }; e.hp = e.maxHp = 60; e.alert = true; e.lostT = 0; e.lx = g.P.x; e.ly = g.P.y;
  if (o.elite) e.elite = { id: o.elite, name: 'ELIT', tint: [255, 120, 120] };
  g.P.hp = 1e6; g.P.a = 0; clearInterval(window.__hold); window.__pin = [g.P.x, g.P.y]; window.__hpHold = true;
  window.__hold = setInterval(() => { if (window.__hpHold !== false) __game.P.hp = 1e6; if (window.__pin) { __game.P.x = window.__pin[0]; __game.P.y = window.__pin[1]; __game.P.a = 0; } }, 30);
  return { px: g.P.x, py: g.P.y, ex: e.x, ey: e.y };
};
const scene = o => pg.evaluate(sceneFn, o || {});
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);
const hp100 = () => ev(() => { const g = __game; window.__hpHold = false; g.P.hp = 100; g.P.armor = 0; g.P.iframe = 0; g.P.shield = 0; });
// sparken avfyras i sidan (rAF), inte från node: fönstret är bara 0,25 s speltid
const armKick = (mode) => ev(m => { window.__k = null; const g = __game, e = g.ents()[0];
  const k = () => { if (window.__k) return; const w = g.v26b.win(e);
    if ((m === 'in' && w === 1) || (m === 'blue' && w === 2) || (m === 'out' && e.state !== 'attack' && g.P.kickT <= 0 && e.t > 0.1)) { const hp0 = g.P.hp; g.P.kickT = 0; g.v26b.kick(); window.__k = { w, hp0, t: g.v26b.t(), stagger: g.canExec(e), stun: e.stun || 0 }; return; }
    requestAnimationFrame(k); }; requestAnimationFrame(k); }, mode);

// 1) kontroll: utan spark tar spelaren skada av slaget, och fönstret räknas och ritas (lowfx)
const p0 = await scene();
ok(Math.hypot(p0.ex - p0.px, p0.ey - p0.py) < 0.95, 'skelettet står inom räckhåll ' + JSON.stringify(p0));
await gwait(0.3); await hp100();
await until(() => __game.P.hp < 100, 6);
const c1 = await ev(() => ({ hp: __game.P.hp, st: { ...__game.v26b.st() } }));
ok(c1.hp < 100, 'utan spark skadar slaget spelaren (kontroll) ' + c1.hp);
ok(c1.st.tells >= 1 && c1.st.drawn >= 1, 'det parerbara slaget räknas och markeringen ritas även med lowfx ' + JSON.stringify(c1.st));

// 2) spark i fönstret: PARERAT, ingen skada, fienden vacklar; nästa spark avrättar
await ev(() => { window.__hpHold = true; __game.P.hp = 1e6; }); await gwait(0.6);
await hp100(); await armKick('in');
await until(() => !!window.__k, 6);
const k2 = await ev(() => window.__k);
await gwait(0.6);
const r2 = await ev(() => { const g = __game, e = g.ents()[0]; return { hp: g.P.hp, par: g.v26b.st().parries, stagger: g.canExec(e), dead: e.dead, state: e.state, feed: g.styleRef().feed.map(f => f.t) }; });
ok(k2 && k2.w === 1 && r2.par >= 1 && r2.hp >= 100, 'spark i fönstret parerar och spelaren tar ingen skada ' + JSON.stringify({ k2, r2 }));
ok(r2.stagger && !r2.dead, 'den parerade vanliga fienden vacklar (kan avrättas) men lever ' + JSON.stringify(r2));
ok(r2.feed.includes('+PARERING'), '+PARERING i stilflödet ' + JSON.stringify(r2.feed));
const r2b = await ev(() => { const g = __game, e = g.ents()[0]; g.P.kickT = 0; g.v26b.kick(); return { dead: e.dead }; });
ok(r2b.dead, 'nästa spark avrättar den vacklande fienden ' + JSON.stringify(r2b));

// 3) spark utanför fönstret: vanlig spark, ingen vacklan
await scene(); await gwait(0.3); await armKick('out');
await until(() => !!window.__k, 6);
const k3 = await ev(() => { const g = __game, e = g.ents()[0]; return { k: window.__k, stagger: g.canExec(e), par: g.v26b.st().parries, hp: e.hp }; });
ok(k3.k && k3.k.w === 0 && !k3.stagger && k3.hp < 60, 'spark utanför fönstret: vanlig spark (skada, ingen vacklan) ' + JSON.stringify(k3));

// 4) en elit som pareras bedövas men vacklar inte
await scene({ elite: 'tough' }); await gwait(0.3); const pe0 = await ev(() => __game.v26b.st().parries); await armKick('in');
await until(() => !!window.__k, 6);
const k4 = await ev(p => { const g = __game, e = g.ents()[0]; return { k: window.__k, par: g.v26b.st().parries - p, stuns: g.v26b.st().stuns, stagger: g.canExec(e), stun: e.stun }; }, pe0);
ok(k4.par === 1 && !k4.stagger && k4.stun > 0.9, 'en parerad elit bedövas (cirka 1,2 s) men vacklar inte ' + JSON.stringify(k4));

// 5) explosiv elit: blått fönster, sparken parerar inte och slaget träffar
await scene({ elite: 'explosive' }); await gwait(0.3); await hp100(); const pb0 = await ev(() => __game.v26b.st().parries); await armKick('blue');
await until(() => !!window.__k, 6); await gwait(0.5);
const k5 = await ev(p => { const g = __game; return { k: window.__k, par: g.v26b.st().parries - p, hp: g.P.hp, blue: g.v26b.st().blue }; }, pb0);
ok(k5.k && k5.k.w === 2 && k5.par === 0 && k5.hp < 100 && k5.blue >= 1, 'explosiv elit: blått fönster, ingen parering och slaget träffar ' + JSON.stringify(k5));

// 6) INGA BLIXTAR + FÄRGBLIND, utan lowfx: markeringen ritas (formen); skärmbild nära fienden
await scene({ noFlash: true, cb: 'deutan', lowfx: false }); await gwait(0.3);
const d0 = await ev(() => __game.v26b.st().drawn);
const shotOk = await ev(() => new Promise(res => { const g = __game, e = g.ents()[0], t0 = g.v26b.t(); const k = () => { if (g.v26b.win(e) === 1) return res(true); if (g.v26b.t() - t0 > 6) return res(false); requestAnimationFrame(k); }; requestAnimationFrame(k); }));
await shot('tell_calm');
const d1 = await ev(() => __game.v26b.st().drawn);
ok(shotOk && d1 > d0, 'med INGA BLIXTAR och FÄRGBLIND ritas markeringen ändå ' + JSON.stringify({ shotOk, d0, d1 }));

// 7) parering av: sparken i det gamla fönstret parerar inte
await scene(); await ev(() => __game.v26b.set('parry', false)); await gwait(0.3); await hp100();
const p7 = await ev(() => new Promise(res => { const g = __game, e = g.ents()[0], t0 = g.v26b.t(), p0 = g.v26b.st().parries;
  const k = () => { if (e.state === 'attack' && !e.didHit && e.t > 0.1) { g.P.kickT = 0; g.v26b.kick(); return res({ par: g.v26b.st().parries - p0, win: g.v26b.win(e), stagger: g.canExec(e) }); } if (g.v26b.t() - t0 > 6) return res(null); requestAnimationFrame(k); }; requestAnimationFrame(k); }));
ok(p7 && p7.par === 0 && p7.win === 0 && !p7.stagger, 'med parering av blir sparken vanlig ' + JSON.stringify(p7));
await ev(() => __game.v26b.set('parry', true));
const err = await ev(() => __game.v26b.state().err);
ok(!err, 'inga fel i V26B ' + (err || ''));
await ev(() => clearInterval(window.__hold));
await done();
