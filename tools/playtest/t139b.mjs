// t139b: version 27 (BLOOD), omgång 2. BLOD AV: den huvudlösa kroppen (v26C) har ingen röd hals (damm i stället) och halsen puffar
// damm; slem stänker grått damm, inte färgat slem. MYCKET: kultistens hals är röd som förut. Närstridsvapnet i förstapersonsvyn blir
// blodigt efter ett närstridsdödande (yxan, ett riktigt hugg med fire()), i materialets färg (kött rött, insekt gulgrönt), syns på de
// ritade pixlarna (samma bildruta med och utan blod), tonas bort efter 4–9 s speltid; sparken gör inte vapnet blodigt; lowfx och
// BLOD AV tar bort det. Delar port 9839 med t139 (körs inte samtidigt). Inga sidfel. Väntetider i speltid.
import { setup } from './head.mjs';
const PORT = 9839;
const { pg, ev, wait, ok, shot, done } = await setup(PORT, 'out/t139b');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const sceneFn = o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = false; g.settings.blood = o.blood ?? 2; g.settings.heads = true; g.gfxE.set(true); g.v27b.set(true);
  const W = 16, H = 9, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[4][4] = 'P'; grid[1][1] = 'x'; for (const [t, x, y] of o.en) grid[y][x] = t;
  g.playCustom({ grid, biome: 'dungeon' });
  const E = g.ents(), spec = E.filter(e => !e.boss).map(e => [e.type, e.x, e.y]); E.length = 0; for (const [t, x, y] of spec) g.spawnEnemy(t, x, y);
  for (const e of E) { e.d = { ...e.d, dmg: 0, speed: 0 }; e.alert = true; }
  g.P.hp = 1e6; clearInterval(window.__hold); window.__pin = [g.P.x, g.P.y]; g.P.a = 0; g.P.pitch = 0; g.P.look = 0;
  window.__hold = setInterval(() => { __game.P.hp = 1e6; if (window.__pin) { __game.P.x = window.__pin[0]; __game.P.y = window.__pin[1]; __game.P.a = 0; } }, 30); };
const scene = o => pg.evaluate(sceneFn, o);
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);
const neck = () => ev(() => { const g = __game, e = g.ents().find(x => x.type === 'Ä' && !x.dead); e.headT = g.v26c.t(); g.hurtEnemy(e, e.hp + 0.5, e.x, e.y);
  const b = e.v26hd; let red = 0; if (b) for (const p of b.data) if (p === 0xff1e1ea0 || p === 0xff121266) red++; return { dead: !!e.dead, body: !!b, red, k: e.v26k }; });
// 1) halsen: MYCKET röd som förut, BLOD AV damm
await scene({ en: [['Ä', 7, 4]] }); await gwait(0.4);
const n1 = await neck();
ok(n1.dead && n1.body && n1.red > 0, 'MYCKET: kultistens hals är röd som förut ' + JSON.stringify(n1));
await scene({ en: [['Ä', 7, 4]], blood: 0 }); await gwait(0.4);
const n0 = await neck();
ok(n0.dead && n0.body && n0.red === 0 && n0.k === 'bone', 'BLOD AV: den huvudlösa kroppen har ingen röd hals och halsen puffar damm ' + JSON.stringify(n0));
// 2) slem med BLOD AV: grått damm, inte färgat slem
await scene({ en: [['Ǥ', 7, 4], ['L', 7, 6]], blood: 0 }); await gwait(0.4);
const sl = await ev(() => { const g = __game, P0 = g.particles().length, s0 = g.v27b.n.offSlime; for (const e of g.ents()) g.hurtEnemy(e, 0.5, e.x, e.y);
  const nw = g.particles().slice(P0), col = nw.filter(p => p.tint && ((p.tint[1] > 200 && p.tint[0] < 150) || (p.tint[0] > 200 && p.tint[1] < 60))).length; return { n: nw.length, col, off: g.v27b.n.offSlime - s0 }; });
ok(sl.n > 0 && sl.col === 0 && sl.off >= 2, 'BLOD AV: slemmet stänker grått damm, inte grönt eller rött slem ' + JSON.stringify(sl));
// 3) blod på yxan: ett riktigt hugg (fire) som dödar en kultist
await scene({ en: [['Ä', 5, 4]] }); await gwait(0.4);
await ev(() => { const g = __game, i = g.WEAPONS.findIndex(w => w.id === 'axe'); g.P.has[i] = true; g.P.weapon = i; g.WS.state = 'idle'; g.WS.cd = 0; g.WS.shot = 99; const e = g.ents()[0]; e.hp = 0.5; e.x = 5.3; e.y = 4.5; });
let ax = null; for (let i = 0; i < 4 && !(ax && ax.wb); i++) { await ev(() => { const g = __game; g.WS.state = 'idle'; g.WS.cd = 0; g.fire(); }); await gwait(0.5); ax = await ev(() => ({ dead: !!__game.ents()[0].dead, wb: __game.v27b.wpn() })); }
ok(ax.dead && ax.wb && ax.wb.id === 'axe' && ax.wb.a > 0.4 && ax.wb.c[0] > ax.wb.c[1] * 3, 'ett riktigt yxhugg som dödar: yxan blir blodig (rött) ' + JSON.stringify(ax));
await ev(() => { __game.WS.state = 'idle'; }); await gwait(0.6);
const px = await ev(() => { const g = __game, c = document.getElementById('screen'), cx = c.getContext('2d'), wb = g.v27b.st.wb;
  g.v27b.st.wb = null; g.v27b.render(); g.v27b.drawWeapon(); const A = cx.getImageData(0, 0, c.width, c.height).data.slice();
  g.v27b.st.wb = wb; g.v27b.render(); g.v27b.drawWeapon(); const B = cx.getImageData(0, 0, c.width, c.height).data;
  let n = 0, r = 0, gg = 0, b = 0; for (let i = 0; i < B.length; i += 4) { const d = Math.abs(B[i] - A[i]) + Math.abs(B[i + 1] - A[i + 1]) + Math.abs(B[i + 2] - A[i + 2]); if (d > 18) { n++; r += B[i]; gg += B[i + 1]; b += B[i + 2]; } }
  return n ? { n, r: Math.round(r / n), g: Math.round(gg / n), b: Math.round(b / n), draws: g.v27b.n.wpnDraw } : { n: 0 }; });
ok(px.n > 30 && px.r > px.g * 1.8 && px.r > px.b * 1.8, 'blodet syns på yxans pixlar (samma bildruta med och utan) ' + JSON.stringify(px));
await shot('yxa_blodig');
ok(await until(() => !__game.v27b.wpn(), 10), 'blodet på yxan tonas bort inom 9 s speltid');
// 4) insekt: gulgrönt; sparken gör inte vapnet blodigt; lowfx och BLOD AV tar bort det
await scene({ en: [['U', 5, 4], ['Ä', 5, 3]] }); await gwait(0.4);
const ins = await ev(() => { const g = __game, i = g.WEAPONS.findIndex(w => w.id === 'axe'); g.P.weapon = i; const e = g.ents().find(x => x.type === 'U'); g.hurtEnemy(e, e.hp + 0.5, e.x, e.y, { melee: true }); return g.v27b.wpn(); });
ok(ins && ins.c[1] > ins.c[2] * 2 && ins.c[1] >= ins.c[0] * 0.8, 'insekt: yxan blir gulgrön ' + JSON.stringify(ins));
await ev(() => { __game.v27b.st.wb = null; }); await gwait(0.7); await pg.keyboard.press('KeyV'); await gwait(0.3);
const kk = await ev(() => ({ wb: __game.v27b.wpn(), dead: __game.ents().filter(e => e.dead).length }));
ok(!kk.wb, 'sparken gör inte vapnet blodigt ' + JSON.stringify(kk));
await ev(() => { const g = __game, e = g.ents().find(x => !x.dead) || g.spawnEnemy('Ä', 5.5, 3.5); e.hp = 0.5; g.hurtEnemy(e, 1, e.x, e.y, { melee: true }); });
const lo = await ev(() => { const g = __game, had = !!g.v27b.wpn(); g.settings.lowfx = true; g.v27b.drawWeapon(); const r = { had, after: !!g.v27b.wpn() }; g.settings.lowfx = false; return r; });
ok(lo.had && !lo.after, 'lowfx tar bort blodet på vapnet ' + JSON.stringify(lo));
const av = await ev(() => { const g = __game; g.settings.blood = 0; const e = g.spawnEnemy('Ä', 5.5, 4.5); e.hp = 0.5; g.hurtEnemy(e, 1, e.x, e.y, { melee: true }); const r = !!g.v27b.wpn(); g.settings.blood = 2; return r; });
ok(!av, 'BLOD AV: vapnet blir inte blodigt');
await ev(() => clearInterval(window.__hold));
await done();
