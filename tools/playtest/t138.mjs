// t138: version 27 (BLOOD) – NORMAL, telefon och lowfx. På en telefon (pekskärm) är BLOD NORMAL som standard. NORMAL ligger mellan
// det gamla och MYCKET: väggstänk i materialets färg (tak 30), mindre stråle, ingen extra pöl, ingen bredare pöl, inget skärmstänk,
// färre blodiga steg (4). Slem stänker i sin egen färg (blodslemmet rött, slemmet grönt). Det automatiska lågeffektläget mitt i en
// strid: inga nya strålar, fontäner, fotspår eller skärmstänk (stänket som syns tas bort), väggtaket 16. ÅTERSTÄLL ALLA INSTÄLLNINGAR
// ger standarden (inte AV). Engelska: BLOD → BLOOD, MYCKET → LOTS i tools/i18n/en. Inga sidfel. Väntetider i speltid.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { setup, CHROMIUM } from './head.mjs';
const PORT = 9838;
const { pg, ev, wait, ok, shot, done, errs } = await setup(PORT, 'out/t138');
// 1) telefon: NORMAL som standard
{ const ctx2 = await pg.context().browser().newContext({ viewport: { width: 800, height: 400 }, hasTouch: true, isMobile: true }); const p2 = await ctx2.newPage(); const e2 = []; p2.on('pageerror', e => e2.push(e.message));
  await p2.goto(`http://localhost:${PORT}/index.html?nolock=1`); await p2.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
  const m = await p2.evaluate(() => ({ blood: __game.settings.blood, level: __game.v27b.level(), touch: 'ontouchstart' in window }));
  ok(m.touch && m.blood === 1 && m.level === 1 && e2.length === 0, 'telefon: BLOD är NORMAL som standard ' + JSON.stringify(m)); await ctx2.close(); }
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const sceneFn = o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = !!o.lowfx; g.settings.blood = o.blood ?? 2; g.settings.reduceMotion = false; g.settings.noFlash = false; g.gfxE.set(true); g.v27b.set(true);
  const W = o.W, H = o.H, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[o.p[1]][o.p[0]] = 'P'; grid[1][1] = 'x'; for (const [t, x, y] of o.en) grid[y][x] = t;
  g.playCustom({ grid, biome: 'dungeon' });
  const E = g.ents(), spec = E.filter(e => !e.boss).map(e => [e.type, e.x, e.y]); E.length = 0; for (const [t, x, y] of spec) g.spawnEnemy(t, x, y);
  for (const e of E) { e.d = { ...e.d, dmg: 0, speed: 0 }; e.alert = true; }
  g.P.hp = 1e6; clearInterval(window.__hold); window.__pin = [g.P.x, g.P.y]; g.P.a = 0; g.P.pitch = 0; g.P.look = 0;
  window.__hold = setInterval(() => { __game.P.hp = 1e6; if (window.__pin) { __game.P.x = window.__pin[0]; __game.P.y = window.__pin[1]; __game.P.a = 0; } }, 30); };
const scene = o => pg.evaluate(sceneFn, o);
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);
// 2) NORMAL: överdöd och vanligt dödande nära spelaren och väggen
await scene({ W: 18, H: 9, p: [14, 4], en: [['Ä', 16, 3], ['Ä', 16, 5]], blood: 1 }); await gwait(0.4);
const nr = await ev(() => { const g = __game, [a, b] = g.ents(), n0 = { ...g.v27b.n }, m0 = g.v27b.marks().length; g.hurtEnemy(a, a.hp + 999, a.x, a.y); g.hurtEnemy(b, b.hp + 0.5, b.x, b.y);
  return { cap: g.v27b.cap(), walls: g.v27b.marks().length - m0, fount: g.v27b.n.fount - n0.fount, chunks: g.v27b.n.chunks - n0.chunks, pools: g.v27b.n.pools - n0.pools, scr: g.v27b.scr(), w0: n0.wide }; });
ok(nr.cap === 30 && nr.walls >= 2 && nr.fount === 1 && nr.chunks === 2 && nr.pools === 0 && nr.scr === 0, 'NORMAL: väggstänk (tak 30), en mindre fontän, inga extra pölar, inget skärmstänk ' + JSON.stringify(nr));
await gwait(1);
ok(await ev(w => __game.v27b.n.wide === w, nr.w0), 'NORMAL: pölen under liket är som förut (inte bredare)');
const pool = await ev(() => { const D = __game.v27b.decalArr(), set = new Set(__game.v27b.fx().parts.blood_pool); const d = D.find(d => set.has(d.img) && d.size > 0.06); return d ? [d.x, d.y] : null; });
if (pool) { await ev(p => { window.__pin = p; }, pool); await gwait(0.3); }
ok(pool && await ev(() => __game.v27b.step()) === 4, 'NORMAL: fyra blodiga steg efter en pöl ' + JSON.stringify(pool));
// 3) slem i sin egen färg
await scene({ W: 18, H: 9, p: [13, 4], en: [['L', 16, 3], ['Ǥ', 16, 5]] }); await gwait(0.4);
const sl = await ev(() => { const g = __game, [a, b] = g.ents(); return { blob: g.v27b.mat(a), ooze: g.v27b.mat(b) }; });
ok(sl.blob && sl.blob[0] > sl.blob[1] * 2 && sl.ooze && sl.ooze[1] > sl.ooze[0] && sl.ooze[1] > sl.ooze[2], 'slem: blodslemmet stänker rött, slemmet grönt ' + JSON.stringify(sl));
// 4) automatiskt lågeffektläge mitt i striden
await scene({ W: 18, H: 9, p: [14, 4], en: [['Ä', 16, 3], ['Ä', 16, 5], ['Ä', 15, 4]] }); await gwait(0.4);
await ev(() => { const g = __game, a = g.ents()[0]; g.hurtEnemy(a, a.hp + 999, a.x, a.y); });
const lo = await ev(() => { const g = __game; g.settings.lowfx = true; const n0 = { ...g.v27b.n }, [, b, c] = g.ents(); g.hurtEnemy(b, 1, b.x, b.y); g.hurtEnemy(c, c.hp + 999, c.x, c.y); g.v27b.screenAdd();
  return { jets: g.v27b.n.jets - n0.jets, fount: g.v27b.n.fount - n0.fount, scrAdd: g.v27b.n.screen - n0.screen, cap: g.v27b.cap() }; });
await gwait(0.1);
const lo2 = await ev(() => ({ scr: __game.v27b.scr(), walls: __game.v27b.walls() }));
ok(lo.jets === 0 && lo.fount === 0 && lo.scrAdd === 0 && lo.cap === 16 && lo2.scr === 0 && lo2.walls <= 16, 'lowfx mitt i striden: inga strålar, fontäner eller skärmstänk; stänket som syntes tas bort; tak 16 ' + JSON.stringify({ lo, lo2 }));
await ev(() => { __game.settings.lowfx = false; });
// 5) ÅTERSTÄLL ALLA INSTÄLLNINGAR: värdet saknas → standarden (MYCKET på dator), inte AV
ok(await ev(() => { const s = __game.settings, v = s.blood; delete s.blood; const r = __game.v27b.level(); s.blood = v; return r === 2; }), 'utan sparat värde gäller standarden (MYCKET på dator), inte AV');
// 6) engelska: BLOD och MYCKET finns i ordlistan
const HERE = path.dirname(fileURLToPath(import.meta.url)), root = process.env.KRYPTA_ROOT || path.resolve(HERE, '../..');
const man = JSON.parse(fs.readFileSync(path.join(root, 'tools/i18n/en/manual.json'), 'utf8')), all = Object.assign({}, ...fs.readdirSync(path.join(root, 'tools/i18n/en')).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(root, 'tools/i18n/en', f), 'utf8'))));
ok(man.MYCKET === 'LOTS' && all.BLOD === 'BLOOD' && all.AV === 'OFF' && all.NORMAL === 'NORMAL', 'engelska: BLOOD: OFF / NORMAL / LOTS');
await ev(() => clearInterval(window.__hold));
await done();
