// t127: version 26B, granatretur. Kontroller: en landad R25-granat framför spelaren sparkas tillbaka – den flyger mot kastaren, smäller
// där och kastaren tar skada, spelaren tar ingen; ANVÄND-villkoret är sant när granaten ligger nära; utan levande kastare flyger den mot
// hårkorset; en kanonkula (lobShot) som håller på att landa sparkas tillbaka och skadar kastaren; en granat bakom spelaren går inte att
// sparka; av-flaggan stänger av returen; en riktigt kastad R25-granat (t116:s scen) bär sin kastare (src) och sparkas tillbaka till den. Inga sidfel. Alla väntetider räknas i speltid (__game.roles.t()), inte väggtid.
import { setup } from './head.mjs';
const PORT = 9827;
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/t127');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
ok(await ev(() => !!__game.v26b && __game.v26b.state().ret && __game.settings.smartAI !== false), '__game.v26b finns, returen och smartAI är på');

const sceneFn = o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = true;
  const W = 24, H = 11, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[5][4] = 'P'; grid[1][W - 2] = 'x'; grid[5][14] = o.type;
  g.playCustom({ grid, biome: 'dungeon' });
  const E = g.ents(); E.length = 0; const e = g.spawnEnemy(o.type, 11.5, 5.5);
  e.d = { ...e.d, dmg: 0, speed: 0 }; e.hp = e.maxHp = 500; e.alert = false;
  g.P.hp = 1e6; g.P.a = 0; g.P.kickT = 0; clearInterval(window.__hold); window.__hpHold = true; window.__pin = [g.P.x, g.P.y];
  window.__hold = setInterval(() => { if (window.__hpHold !== false) __game.P.hp = 1e6; __game.P.x = window.__pin[0]; __game.P.y = window.__pin[1]; }, 30);
  return { px: g.P.x, py: g.P.y };
};
const scene = o => pg.evaluate(sceneFn, o);
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);
const hp100 = () => ev(() => { const g = __game; window.__hpHold = false; g.P.hp = 100; g.P.armor = 0; g.P.iframe = 0; g.P.shield = 0; });
const nade = (o) => ev(o => { const g = __game, R = g.roles.flags, e = g.ents()[0]; // en landad granat (ph 1) 0,9 rutor framför (eller bakom) spelaren
  R.live.push({ x0: e.x, y0: e.y, tx: g.P.x + o.dx, ty: g.P.y, t: 0, T: 0.8, fuse: 1.6, ph: 1, bT: 0, r: 1.6, dmg: 14, name: e.d.name, src: e, landT: g.v26b.t() }); return R.live.length; }, o);

// 1) landad R25-granat framför spelaren: tillbaka till kastaren
await scene({ type: 'Ä' }); await gwait(0.4);
await nade({ dx: 0.9 }); await hp100();
const w1 = await ev(() => __game.v26b.wantsUse());
const k1 = await ev(() => { const g = __game, s0 = g.v26b.st().rets; g.P.kickT = 0; g.v26b.kick(); const n = g.roles.flags.live[0]; return { rets: g.v26b.st().rets - s0, ph: n && n.ph, ret: n && n.ret, to: n && [+n.tx.toFixed(2), +n.ty.toFixed(2)], feed: g.styleRef().feed.map(f => f.t) }; });
ok(w1, 'ANVÄND-villkoret (v26b.wantsUse) är sant när en landad granat ligger framför spelaren');
ok(k1.rets === 1 && k1.ph === 0 && k1.ret && k1.to[0] > 10, 'sparken skickar granaten mot kastaren ' + JSON.stringify(k1));
ok(k1.feed.includes('+RETUR'), '+RETUR i stilflödet ' + JSON.stringify(k1.feed));
await until(() => __game.v26b.st().retBooms >= 1, 4);
const a1 = await ev(() => { const g = __game, e = g.ents()[0]; return { booms: g.v26b.st().retBooms, hp: e.hp, dead: e.dead, php: g.P.hp, live: g.roles.flags.live.length }; });
ok(a1.booms === 1 && (a1.hp < 500 || a1.dead) && a1.php >= 100, 'granaten smäller hos kastaren: kastaren tar skada, spelaren ingen ' + JSON.stringify(a1));

// 2) granat bakom spelaren går inte att sparka; utan kastare flyger en sparkad granat mot hårkorset
await scene({ type: 'Ä' }); await gwait(0.3);
await nade({ dx: -1.0 });
const k2 = await ev(() => { const g = __game; g.P.kickT = 0; const s0 = g.v26b.st().rets; g.v26b.kick(); return g.v26b.st().rets - s0; });
ok(k2 === 0, 'en granat bakom spelaren går inte att sparka ' + k2);
await ev(() => { __game.roles.flags.live.length = 0; });
await nade({ dx: 0.8 });
const k2b = await ev(() => { const g = __game, e = g.ents()[0]; e.dead = true; g.P.a = Math.PI / 2; g.P.kickT = 0; const n = g.roles.flags.live[0]; n.tx = g.P.x; n.ty = g.P.y + 0.8; g.v26b.kick(); return { ret: !!n.ret, to: [+n.tx.toFixed(2), +n.ty.toFixed(2)], p: [g.P.x, g.P.y] }; });
ok(k2b.ret && k2b.to[1] > k2b.p[1] + 2 && Math.abs(k2b.to[0] - k2b.p[0]) < 0.6, 'utan levande kastare flyger granaten mot hårkorset ' + JSON.stringify(k2b));
await gwait(1.5); await ev(() => { __game.roles.flags.live.length = 0; });

// 3) kanonkulan (lobShot) sparkas tillbaka när den håller på att landa
await scene({ type: 'K' }); await gwait(0.3); await hp100();
await ev(() => { const g = __game, k = g.ents()[0]; g.v26b.lobShot(k, g.P.x + 0.6, g.P.y, { dmg: 10, r: 1.3, T: 1.2, kind: 'cball' }); window.__k = null;
  const w = () => { const l = g.v26b.lobs()[0]; if (!l) { window.__k = { gone: true }; return; } if (l.T - l.t < 0.3) { g.P.kickT = 0; g.v26b.kick(); window.__k = { ret: !!l.ret, to: [l.tx, l.ty] }; return; } requestAnimationFrame(w); }; requestAnimationFrame(w); });
await until(() => !!window.__k, 3);
const k3 = await ev(() => ({ k: window.__k, lobRets: __game.v26b.st().lobRets }));
await until(() => __game.v26b.lobs().length === 0, 3); await gwait(0.2);
const a3 = await ev(() => { const g = __game, e = g.ents()[0]; return { hp: e.hp, dead: e.dead, php: g.P.hp }; });
ok(k3.k && k3.k.ret && k3.lobRets >= 1, 'kanonkulan sparkas tillbaka mot kastaren ' + JSON.stringify(k3));
ok((a3.hp < 500 || a3.dead) && a3.php >= 100, 'kanonkulan skadar kastaren, inte spelaren ' + JSON.stringify(a3));

// 4) av-flaggan: granaten ligger kvar och smäller hos spelaren
await scene({ type: 'Ä' }); await gwait(0.3); await ev(() => __game.v26b.set('ret', false));
await nade({ dx: 0.9 }); await hp100();
const k4 = await ev(() => { const g = __game; g.P.kickT = 0; const s0 = g.v26b.st().rets; g.v26b.kick(); return g.v26b.st().rets - s0; });
await until(() => __game.roles.flags.live.length === 0, 3); await gwait(0.2);
const a4 = await ev(() => __game.P.hp);
ok(k4 === 0 && a4 < 100, 'med returen av ligger granaten kvar och skadar spelaren (kontroll) ' + JSON.stringify({ k4, a4 }));
await ev(() => __game.v26b.set('ret', true));

// 5) en riktig R25-granat (som t116 steg 1: spelaren bakom en vägg): kastaren sparas på granaten, och sparken skickar den dit
await ev(() => { const g = __game, W = 30, H = 21, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 || (x === 11) ? '1' : '.'); grid.push(r); }
  grid[10][8] = 'P'; grid[1][W - 2] = 'x'; g.playCustom({ grid, biome: 'dungeon' });
  const E = g.ents(); E.length = 0; for (const [t, x, y] of [['ĳ', 16.5, 8.5], ['Ä', 17.5, 12.5], ['ĳ', 17.5, 10.5]]) { const e = g.spawnEnemy(t, x, y); e.d = { ...e.d, dmg: 0, speed: 0 }; e.hp = e.maxHp = 500; e.alert = true; e.lostT = 0; e.lx = g.P.x; e.ly = g.P.y; }
  clearInterval(window.__hold); window.__hpHold = true; window.__pin = [8.5, 10.5];
  window.__hold = setInterval(() => { if (window.__hpHold !== false) __game.P.hp = 1e6; __game.P.x = window.__pin[0]; __game.P.y = window.__pin[1]; }, 30); });
await gwait(0.5);
await ev(() => { for (const e of __game.ents()) { e.lx = 8.5; e.ly = 10.8; e.lostT = 1; } window.__keep = setInterval(() => { for (const e of __game.ents()) { if (!e.dead && e.lostT > 2) e.lostT = 1.2; } }, 500); });
const thrown = await until(() => __game.roles.flags.live.length > 0, 15);
await until(() => { const n = __game.roles.flags.live[0]; return !n || n.ph === 1; }, 3);
const k5 = await ev(() => { const g = __game, n = g.roles.flags.live[0]; if (!n) return null; clearInterval(window.__keep);
  const src = n.src, info = { src: src ? src.type : null, srcAt: src ? [+src.x.toFixed(2), +src.y.toFixed(2)] : null, at: [+n.tx.toFixed(2), +n.ty.toFixed(2)] };
  window.__pin = [n.tx + 0.9, n.ty]; g.P.x = n.tx + 0.9; g.P.y = n.ty; g.P.a = Math.PI; g.P.kickT = 0; const r0 = g.v26b.st().rets; g.v26b.kick();
  return { ...info, rets: g.v26b.st().rets - r0, ret: !!n.ret, to: [+n.tx.toFixed(2), +n.ty.toFixed(2)] }; });
ok(thrown && k5 && k5.src && k5.rets === 1 && k5.ret && Math.hypot(k5.to[0] - k5.srcAt[0], k5.to[1] - k5.srcAt[1]) < 0.6, 'en riktig R25-granat bär sin kastare och sparkas tillbaka till den ' + JSON.stringify(k5));
await until(() => __game.roles.flags.live.length === 0, 3);
const err = await ev(() => __game.v26b.state().err);
ok(!err, 'inga fel i V26B ' + (err || ''));
await ev(() => clearInterval(window.__hold));
await done();
