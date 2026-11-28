// t150: version 28 (REND) – genomsiktliga fönster `ǂ` och cellgaller `Ɉ`.
// En mellanvägg med tre fönsterrutor mellan spelaren och en kultist. Man ser kultisten genom `ǂ` och `Ɉ` (bilden skiljer med och
// utan kultisten), men inte genom en vanlig vägg (kontroll: ingen skillnad). En sprite framför gallret ritas utan galler över sig
// (samma skillnad som framför en vanlig vägg). Fönstret är en vägg: isWallChar, solid, hasLOS, walkableForEnemy; man går inte
// igenom, skottet träffar inte, och kultisten skjuter inte genom fönstret (kontroll: genom en öppning gör den det). Kartan känner
// till rutorna. lowfx och V28.glass av ger inga sidfel. Väntan i speltid. Port 9850.
import { setup } from './head.mjs';
const PORT = 9850;
const { pg, ev, wait, ok, shot, done } = await setup(PORT, 'out/t150');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const sceneFn = o => { const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: !!o.lowfx, blood: 2, noFlash: false, reduceMotion: false });
  const W = 24, H = 13, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 || (o.walls || [12]).includes(x) ? '1' : '.'); grid.push(r); }
  for (const wx of o.walls || [12]) for (let y = 5; y <= 7; y++) grid[y][wx] = o.win;
  if (o.back) for (let y = 1; y < H - 1; y++) grid[y][13] = '1'; // vägg direkt bakom gallret grid[6][8] = 'P'; grid[1][1] = 'x';
  for (const [t, x, y] of o.en || []) grid[y][x] = t;
  g.playCustom({ grid, biome: o.biome || 'dungeon' });
  for (const e of g.ents()) { e.d = { ...e.d, speed: 0 }; if (o.calm) { e.d.dmg = 0; e.alert = false; } }
  g.P.hp = 1e6; g.P.iframe = 0; clearInterval(window.__hold); window.__pin = [8.5, 6.5]; g.P.a = 0; g.lvl().ambient = o.dark ? g.lvl().ambient : 1.1; g.P.pitch = 0; g.P.look = 0;
  window.__hold = setInterval(() => { const P = __game.P; P.hp = 1e6; if (window.__pin) { P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = 0; P.vx = P.vy = 0; } }, 30); };
const scene = o => pg.evaluate(sceneFn, o);
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);
const ready = async o => { await scene(o); await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await gwait(0.3); };
// bilden med och utan fienderna (samma bildruta: render() direkt, utan att spelet rör sig emellan)
const diff = () => ev(() => { const g = __game, c = document.getElementById('screen'), cx = c.getContext('2d'), E = g.ents(), keep = E.slice(), I = g.items(), keepI = I.slice();
  const grab = () => { g.v28.render(); return cx.getImageData(0, 0, c.width, c.height).data.slice(); };
  const A = grab(); E.length = 0; I.length = 0; const B = grab(); E.push(...keep); I.push(...keepI);
  let n = 0; for (let i = 0; i < A.length; i += 4) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 24) n++; return n; });
const res = {};
for (const win of ['ǂ', 'Ɉ', '1']) { await ready({ win, en: [['Ä', 15, 6]], calm: true }); res[win] = await diff(); await shot('genom_' + (win === 'ǂ' ? 'fonster' : win === 'Ɉ' ? 'galler' : 'vagg')); }
ok(res['ǂ'] > 25 && res['Ɉ'] > 25 && res['1'] === 0, 'kultisten syns genom fönstret och gallret men inte genom en vanlig vägg ' + JSON.stringify(res));
// galler med en vägg direkt bakom (som fängelsets målade cellfronter): ogenomskinligt som förut
await ready({ win: 'Ɉ', back: true, calm: true });
const bk = await ev(() => { const g = __game, n0 = g.v28.n(); g.v28.render(); const n1 = g.v28.n(); return { backed: n1.backed - n0.backed, cols: n1.cols - n0.cols }; });
ok(bk.backed > 0 && bk.cols === 0, 'galler med vägg direkt bakom ritas ogenomskinligt ' + JSON.stringify(bk));
await shot('galler_mot_vagg');
// framför gallret: en hälsoflaska strax framför fönstret ritas utan galler över sig (som framför en vägg)
// version 29: hälsoflaskan är animerad (gfxW: bredden gungar ±5 % och en glimt syns 8 % av tiden), så ett enda prov per scen gav 690–810
// bildpunkter i båda scenerna och två prov kunde skilja mer än 10 % (t.ex. {"1":701,"ǂ":776}). Animeringen stängs av under provet och
// medianen av fem prov (0,1 s speltid isär) jämförs; utan animering ligger båda scenerna på 709–737.
const med5 = async () => { await ev(() => { __game.gfxW.set({ off: true }); }); const v = []; for (let i = 0; i < 5; i++) { v.push(await diff()); await gwait(0.1); } await ev(() => { __game.gfxW.set({ off: false }); }); return v.sort((a, b) => a - b)[2]; };
const front = {}; for (const win of ['ǂ', '1']) { await ready({ win, en: [['h', 10, 6]], calm: true }); front[win] = await med5(); }
ok(front['1'] > 50 && Math.abs(front['ǂ'] - front['1']) <= front['1'] * 0.1, 'en sprite framför gallret täcks inte av gallret ' + JSON.stringify(front));
// bakom och framför samtidigt + statistik
await ready({ win: 'ǂ', en: [['Ä', 15, 6], ['h', 10, 5]], calm: true }); await gwait(0.2);
const st = await ev(() => { const g = __game; g.v28.render(); return { n: g.v28.n(), cells: g.v28.cells().length, isW: g.v28.isWall('ǂ'), solid: g.v28.solid(12.5, 6.5), walk: g.v28.walk(12, 6), los: g.v28.los(8.5, 6.5, 15.5, 6.5), any: g.v28.T.any }; });
ok(st.cells === 3 && st.isW && st.solid && !st.walk && !st.los, 'fönstret är en vägg: isWallChar, solid, inte gångbar för fiender, blockerar siktlinjen ' + JSON.stringify(st));
ok(st.n.cols > 0 && st.n.drawn > 0, 'kolumner med genomsiktliga lager ritas (lager, ritade, i förväg, efteråt) ' + JSON.stringify(st.n));
await shot('fram_och_bak');
// man går inte igenom
await ev(() => { window.__pin = null; const P = __game.P; P.x = 11.3; P.y = 6.5; P.a = 0; });
await pg.keyboard.down('w'); await gwait(1.2); await pg.keyboard.up('w');
const px = await ev(() => __game.P.x);
ok(px < 12 - 0.1, 'spelaren går inte igenom fönstret ' + px.toFixed(2));
await ev(() => { window.__pin = [8.5, 6.5]; });
// skottet går inte igenom (hitscan med pistolen och ett gevär)
await ready({ win: 'ǂ', en: [['Ä', 15, 6]], calm: true });
const shotRes = await ev(async () => { const g = __game, P = g.P, WS = g.WS, e = g.ents().find(x => x.type === 'Ä'), hp0 = e.hp, out = [];
  for (const id of ['pistol', 'rifle', 'shotgun', 'smg']) { const i = g.WEAPONS.findIndex(w => w.id === id); if (i < 0) continue; P.has[i] = true; P.weapon = i; P.mags[i] = g.WEAPONS[i].mag || 10; if (P.ammo) for (const k in P.ammo) P.ammo[k] = 99;
    WS.state = 'idle'; WS.t = 0; WS.cd = 0; WS.shot = 99; P.a = 0; g.fire(); out.push(id); await new Promise(r => setTimeout(r, 150)); }
  return { hp0, hp: e.hp, dead: e.dead, tried: out }; });
await gwait(0.6);
const hpAfter = await ev(() => { const e = __game.ents().find(x => x.type === 'Ä'); return e ? e.hp : -1; });
ok(shotRes.tried.length >= 2 && hpAfter === shotRes.hp0, 'skotten går inte genom fönstret ' + JSON.stringify({ ...shotRes, hpAfter }));
// fienden skjuter inte genom fönstret (kontroll: genom en öppning skjuter den)
const enemyFire = async o => { await ready(o); await ev(() => { const g = __game; g.P.hp = 1e6; window.__shots = 0; for (const e of g.ents()) { e.alert = true; g.alertEnemy(e, false); } });
  let shots = 0; const t0 = await gt(); while ((await gt()) - t0 < 6) { shots += await ev(() => __game.projectiles().filter(p => !p.friendly).length); await wait(120); } return shots; };
const fw = await enemyFire({ win: 'ǂ', en: [['Ä', 15, 6]] }), fo = await enemyFire({ win: '.', en: [['Ä', 15, 6]] });
ok(fw === 0 && fo > 0, 'kultisten skjuter inte genom fönstret (genom en öppning gör den det) ' + JSON.stringify({ fönster: fw, öppning: fo }));
// lowfx (ett lager), V28.glass av (ogenomskinligt) och ett annat biom: inga fel, galler syns
for (const o of [{ win: 'ǂ', lowfx: true }, { win: 'ǂ', biome: 'cave' }, { win: 'Ɉ', biome: 'prison' }]) { await ready({ ...o, en: [['Ä', 15, 6]], calm: true }); await shot('variant_' + (o.lowfx ? 'lowfx' : o.biome)); }
await ev(() => { __game.v28.V28.glass = false; }); const off = await diff(); await ev(() => { __game.v28.V28.glass = true; });
ok(off === 0, 'V28.glass av: fönstret ritas ogenomskinligt (ingen skillnad med och utan kultisten) ' + off);
// två fönster efter varandra och en tredje rad: lagertaket (2) håller och inga fel
await ready({ win: 'ǂ', walls: [10, 13, 16], en: [['Ä', 20, 6]], calm: true });
const capR = await ev(() => { const g = __game, n0 = g.v28.n().capped; g.v28.render(); return { capped: g.v28.n().capped - n0, cells: g.v28.cells().length }; });
ok(capR.cells === 9 && capR.capped > 0, 'tre fönster efter varandra: högst två genomsiktliga lager, det tredje ritas ogenomskinligt ' + JSON.stringify(capR));
await shot('tre_fonster');
// utan fönster är bilden och kartan exakt som förut: dörrar, en hemlig vägg och en låst dörr i bild, V28.glass av mot på
await ready({ win: 'D', en: [['*', 12, 3], [']', 12, 9], ['Ä', 18, 6]], calm: true });
const eq = await ev(() => { const g = __game, L = g.look, V = g.v28.V28; g.pause(); g.P.x = 8.5; g.P.y = 6.5; g.P.a = 0.1; g.P.look = 0; g.P.pitch = 0; g.particles().length = 0;
  const run = on => { V.glass = on; g.v28.seen().fill(0); const r = L.probe(); return { hash: r.hash, seen: Array.from(g.v28.seen()).join('') }; };
  const a = run(false), b = run(true); g.resume(); return { hash: a.hash === b.hash, seen: a.seen === b.seen, nSeen: (a.seen.match(/1/g) || []).length }; });
ok(eq.hash && eq.seen && eq.nSeen > 20, 'utan fönster: samma bild och samma sedda rutor (dörrar på kartan) med och utan V28.glass ' + JSON.stringify(eq));
// upp/ned-blicken med ett fönster i bild: inga hål
await ready({ win: 'ǂ', en: [['Ä', 15, 6]], calm: true });
const lk = await ev(() => { const g = __game, L = g.look, out = []; g.pause(); for (const v of [L.max, -L.max, 0.3]) { g.P.look = v; const r = L.probe(); out.push({ on: r.on, holes: r.holes }); } g.P.look = 0; g.resume(); return out; });
ok(lk.every(r => r.on && r.holes === 0), 'upp/ned-blicken med fönster i bild: inga hål ' + JSON.stringify(lk));
await ev(() => { window.__pin = null; clearInterval(window.__hold); });
await done();
