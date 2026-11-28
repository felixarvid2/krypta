// t166: version 29 (FÖNSTER) – glasfönster ǁ som går sönder. En mellanvägg med tre glasrutor (och en lång omväg upptill) mellan
// spelaren och en kultist. Helt glas: en vägg för kulor, siktlinje, kollision och vägsökning, men man ser igenom (med färgton).
// Ett pistolskott spräcker glaset (rutan står kvar, kulan når inte fram), tre skott krossar det. Därefter: rutan är ǀ (öppen ram),
// kulan går igenom, siktlinjen är fri, fiendernas avståndsfält har en kortare väg, fienden skjuter genom öppningen, kartan och
// de sedda rutorna följer med, WebGL-djupet (glGrateDepth) har ändrats. En smäll, en spark och ett yxhugg krossar glaset direkt.
// Fönster utan glas (ǂ) beter sig som förut (kontroll: inga skott tar sönder dem). Väntan i speltid. Port 9866.
import { setup } from './head.mjs';
const PORT = 9866;
const { pg, ev, wait, ok, shot, done } = await setup(PORT, 'out/t166');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) cerr.push(m.text().slice(0, 160)); }); // (spelets slinga fångar fel: de syns bara i konsolen)
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const sceneFn = o => { const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: !!o.lowfx, blood: 2, noFlash: false, reduceMotion: false, rendering: o.mode || 'auto' });
  const W = 24, H = 13, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 || x === 12 ? '1' : '.'); grid.push(r); }
  grid[1][12] = '.'; // omvägen upptill
  for (let y = 5; y <= 7; y++) grid[y][12] = o.win;
  grid[11][1] = 'x';
  for (const [t, x, y] of o.en || []) grid[y][x] = t;
  g.playCustom({ grid, biome: o.biome || 'dungeon' });
  for (const e of g.ents()) { e.d = { ...e.d, speed: 0 }; if (o.calm) { e.d.dmg = 0; e.alert = false; } }
  g.P.hp = 1e6; g.P.iframe = 0; clearInterval(window.__hold); window.__pin = [o.px || 8.5, 6.5]; g.P.a = 0; g.lvl().ambient = 1.1; g.P.pitch = 0; g.P.look = 0;
  window.__hold = setInterval(() => { const P = __game.P; P.hp = 1e6; if (window.__pin) { P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = 0; P.vx = P.vy = 0; } }, 30); };
const scene = o => pg.evaluate(sceneFn, o);
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);
const ready = async o => { await scene(o); await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await gwait(0.3); };
const diff = () => ev(() => { const g = __game, c = document.getElementById('screen'), cx = c.getContext('2d'), E = g.ents(), keep = E.slice();
  const grab = () => { g.v28.render(); return cx.getImageData(0, 0, c.width, c.height).data.slice(); };
  const A = grab(); E.length = 0; const B = grab(); E.push(...keep);
  let n = 0; for (let i = 0; i < A.length; i += 4) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 24) n++; return n; });
const pistol = n => ev(async n => { const g = __game, P = g.P, WS = g.WS, i = g.WEAPONS.findIndex(w => w.id === 'pistol'); P.has[i] = true; P.weapon = i; if (P.ammo) for (const k in P.ammo) P.ammo[k] = 99;
  for (let k = 0; k < n; k++) { P.mags[i] = 9; WS.state = 'idle'; WS.t = 0; WS.cd = 0; WS.shot = 99; P.a = 0; g.fire(); await new Promise(r => setTimeout(r, 120)); } }, n);
const state = () => ev(() => { const g = __game, f = g.f29, c = f.cells(), e = g.ents().find(x => x.type === 'Ä'); g.f29.updateFlow(); const fl = g.f29.flow(), mw = g.f29.map()[0].length;
  return { cells: c, ch: g.f29.map()[6][12], wall: g.v28.isWall(g.f29.map()[6][12]), solid: g.v28.solid(12.5, 6.5), walk: g.v28.walk(12, 6), los: g.v28.los(8.5, 6.5, 15.5, 6.5), hp: e ? e.hp : -1, flowE: fl[6 * mw + 15], v28cells: g.v28.cells().length, tex: g.f29.tex(12, 6) }; });
const R = {};
// ---- glaset helt ----
await ready({ win: 'ǁ', en: [['Ä', 15, 6]], calm: true });
R.see = await diff(); await shot('glas_helt');
R.s0 = await state();
ok(R.s0.cells.length === 3 && R.s0.cells.every(c => c.kind === 'glass' && !c.open), 'tre glasrutor ' + JSON.stringify(R.s0.cells.map(c => c.ch + c.kind)));
ok(R.s0.wall && R.s0.solid && !R.s0.walk && !R.s0.los, 'helt glas är en vägg: isWallChar, solid, inte gångbart, blockerar siktlinjen ' + JSON.stringify({ wall: R.s0.wall, solid: R.s0.solid, walk: R.s0.walk, los: R.s0.los }));
ok(R.see > 25, 'man ser kultisten genom glaset ' + R.see);
ok(R.s0.flowE >= 15, 'fiendernas avståndsfält går runt (omvägen) ' + R.s0.flowE);
// ett skott: spricker, kulan når inte fram
await pistol(1); await gwait(0.3); R.s1 = await state(); await shot('glas_sprucket');
const c6 = s => s.cells.find(c => c.x === 12 && c.y === 6);
ok(c6(R.s1).hp < c6(R.s0).hp && !c6(R.s1).open && R.s1.hp === R.s0.hp && R.s1.tex.sum !== R.s0.tex.sum, 'ett skott spräcker glaset (ny textur), kulan går inte igenom ' + JSON.stringify({ hp: c6(R.s1).hp, e: R.s1.hp, tex: [R.s0.tex.sum, R.s1.tex.sum] }));
// en fiende skjuter inte genom helt glas
const enemyShots = async () => { await ev(() => { const g = __game; for (const e of g.ents()) { e.d = { ...e.d, dmg: 1 }; e.alert = true; g.alertEnemy(e, false); } });
  let n = 0; const t0 = await gt(); while ((await gt()) - t0 < 7) { n += await ev(() => __game.projectiles().filter(p => !p.friendly).length); await wait(120); }
  await ev(() => { for (const e of __game.ents()) { e.d = { ...e.d, dmg: 0 }; e.alert = false; } }); return n; };
R.fireGlass = await enemyShots();
// två skott till: krossat
await pistol(2); await gwait(0.4); R.s2 = await state(); await shot('glas_krossat');
ok(c6(R.s2).open && R.s2.ch === 'ǀ', 'tre pistolskott krossar glaset: rutan blir en öppen ram ǀ ' + JSON.stringify(c6(R.s2)));
ok(!R.s2.wall && !R.s2.solid && R.s2.walk && R.s2.los, 'den öppna ramen: ingen vägg, gångbar, fri siktlinje ' + JSON.stringify({ wall: R.s2.wall, solid: R.s2.solid, walk: R.s2.walk, los: R.s2.los }));
ok(R.s2.flowE > 0 && R.s2.flowE <= R.s0.flowE - 8, 'fiendernas vägsökning går genom öppningen ' + JSON.stringify({ före: R.s0.flowE, efter: R.s2.flowE }));
ok(R.s2.v28cells === R.s0.v28cells - 1, 'kartans genomsiktliga rutor följer med (en ruta färre) ' + JSON.stringify({ före: R.s0.v28cells, efter: R.s2.v28cells }));
const hpB = await ev(() => __game.ents().find(x => x.type === 'Ä').hp); await pistol(1); await gwait(0.3); const hpA = await ev(() => __game.ents().find(x => x.type === 'Ä').hp);
ok(hpA < hpB, 'kulan går genom den öppna ramen ' + JSON.stringify({ hpB, hpA }));
await ev(() => __game.explode(11.2, 6.5, 10, 1.6, false)); await gwait(0.5); // (alla tre rutorna öppna)
R.fireOpen = await enemyShots();
ok(R.fireGlass === 0 && R.fireOpen > 0, 'fienden skjuter inte genom helt glas men genom öppningen ' + JSON.stringify({ glas: R.fireGlass, öppning: R.fireOpen }));
// sedda rutor: genom öppningen räknas de (genom glaset bara skymtade)
const seenB = () => ev(() => { const g = __game, s = g.v28.seen(), F = g.v28.far(); s.fill(0); F.fill(0); g.v28.render(); let n = 0, f = 0; for (let y = 1; y < 12; y++) for (let x = 13; x < 23; x++) { if (s[y * 24 + x]) n++; if (F[y * 24 + x]) f++; } return { n, f }; });
R.seenOpen = await seenB();
await ready({ win: 'ǁ', en: [['Ä', 15, 6]], calm: true }); R.seenGlass = await seenB();
ok(R.seenGlass.n === 0 && R.seenGlass.f > 10 && R.seenOpen.n > 5, 'kartan: genom glaset skymtat, genom den krossade rutan sett ' + JSON.stringify({ glas: R.seenGlass, krossat: R.seenOpen }));
// smäll, spark, yxa
await ready({ win: 'ǁ', calm: true });
await ev(() => { const g = __game; g.explode(11.2, 6.5, 10, 1.6, false); }); await gwait(0.3);
R.boom = await ev(() => __game.f29.cells().map(c => c.open));
ok(R.boom.every(Boolean), 'en smäll krossar glaset direkt ' + JSON.stringify(R.boom)); await shot('glas_small');
await ready({ win: 'ǁ', calm: true, px: 11.5 }); await gwait(0.2);
await pg.keyboard.press('v'); await gwait(0.5);
R.kick = await ev(() => __game.f29.cells().find(c => c.x === 12 && c.y === 6).open);
ok(R.kick, 'en spark krossar glaset ' + R.kick); await shot('glas_spark');
await ready({ win: 'ǁ', calm: true, px: 11.4 });
R.axe = await ev(async () => { const g = __game, P = g.P, i = g.WEAPONS.findIndex(w => w.id === 'axe'); if (i < 0) return 'ingen yxa'; P.has[i] = true; P.weapon = i; g.WS.state = 'idle'; g.WS.cd = 0; g.WS.t = 0; g.fire(); await new Promise(r => setTimeout(r, 150)); return g.f29.cells().find(c => c.x === 12 && c.y === 6).open; });
ok(R.axe === true, 'ett yxhugg krossar glaset ' + R.axe);
// skärvor och fläck på golvet
const dec = await ev(() => __game.f29.L().broken);
ok(dec >= 1, 'glaset räknas som krossat ' + dec);
// fönster utan glas: tre skott, en smäll och en spark tar inte sönder ǂ
await ready({ win: 'ǂ', en: [['Ä', 15, 6]], calm: true, px: 11.5 }); await pistol(3); await ev(() => __game.explode(11.2, 6.5, 10, 1.6, false)); await pg.keyboard.press('v'); await gwait(0.4);
R.plain = await state();
ok(R.plain.ch === 'ǂ' && R.plain.wall && !R.plain.los && R.plain.cells.length === 0, 'ett fönster ǂ utan glas står kvar som förut ' + JSON.stringify({ ch: R.plain.ch, los: R.plain.los }));
// WebGL-djupet: gallrets/spröjsarnas bildpunkter i spritedjupet före och efter
const depth = async () => ev(() => { const g = __game; g.explode(20.5, 10.5, 0, 0.4, false); // (partiklar, så att spritedjupet skrivs)
  g.v28.render(); const sd = g.gl ? g.gl.sd() : null; if (!sd) return { sd: false, used: g.gl ? g.gl.n().ok : null };
  const at = []; for (let i = 0; i < sd.length; i++) if (Math.abs(sd[i] - 3.5) < 1e-3) at.push(i); return { sd: true, n: at.length, at }; }); // (gallrets djup: fönstret står 3,5 rutor rakt fram)
await ready({ win: 'ǁ', calm: true, mode: 'webgl' }); await gwait(0.5);
R.d0 = await depth(); await ev(() => __game.explode(11.2, 6.5, 10, 1.6, false)); await gwait(2.5); R.d1 = await depth();
if (R.d0.sd) { const after = new Set(R.d1.at), gone = R.d0.at.filter(i => !after.has(i)).length; // spröjsarnas bildpunkter som inte längre finns i djupet
  ok(R.d0.n > 50 && gone > 300, 'WebGL: glasets spröjsar finns i spritedjupet och försvinner när det krossas ' + JSON.stringify({ före: R.d0.n, efter: R.d1.n, borta: gone })); }
else console.log('SKIP  WebGL-djupet (inget spritedjup i den här miljön) ' + JSON.stringify(R.d0));
await shot('webgl_krossat');
// lowfx: glaset ritas (ett lager), inga fel
await ready({ win: 'ǁ', en: [['Ä', 15, 6]], calm: true, lowfx: true }); R.low = await diff(); await shot('glas_lowfx');
ok(R.low > 10, 'lowfx: kultisten syns genom glaset ' + R.low);
await ev(() => { __game.v28.V28.glass = false; }); R.off = await diff(); await ev(() => { __game.v28.V28.glass = true; });
ok(R.off === 0, 'V28.glass av: glaset ritas ogenomskinligt (reservtexturen) ' + R.off);
await ev(() => { window.__pin = null; clearInterval(window.__hold); });
ok(cerr.length === 0, 'inga fel i konsolen ' + [...new Set(cerr)].slice(0, 3).join(' / '));
await done();
