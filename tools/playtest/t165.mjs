// t165: version 29 (FÖNSTER) – lösa trådar från version 28 (galler `Ɉ` och fönster `ǂ`).
// 1. Livmätaren: en skadad kultist bakom ett fönster/galler har en synlig livmätare (och project() ger en punkt), men inte bakom en
//    vanlig vägg (kontroll) – och bakom en öppning har den det (kontroll).
// 2. Sedda rutor: rutor man bara har sett genom ett fönster räknas inte som sedda (automap, utforskningsprocent), men syns svagt på
//    kartan (__game.v28.far, om den finns). Kontroll: genom en öppning räknas de.
// 3. Fängelsets gallerpelare (2×2 `Ɉ`, bland annat i bödelns arena) ser inte ut som burar: en kultist bakom en pelare syns inte, och
//    arenans pelare ser ut som utan genomsiktliga galler (V28.glass av). Ett galler i en enkel rad (cellfront, bödelns spärr) är
//    fortfarande genomsiktligt. Väntan i speltid. Port 9865.
import { setup } from './head.mjs';
const PORT = 9865;
const { pg, ev, wait, ok, shot, done } = await setup(PORT, 'out/t165');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) cerr.push(m.text().slice(0, 160)); }); // (spelets slinga fångar fel: de syns bara i konsolen)
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const sceneFn = o => { const g = __game; g.profile.tutDone = true; Object.assign(g.settings, { autoLowFx: false, lowfx: !!o.lowfx, blood: 2, noFlash: false, reduceMotion: false, enemyBars: true, dmgNumbers: true });
  const W = 24, H = 13, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 || x === 12 ? '1' : '.'); grid.push(r); }
  for (let y = 5; y <= 7; y++) grid[y][12] = o.win;
  if (o.block) { for (let y = 1; y < H - 1; y++) grid[y][12] = '.'; for (const [x, y] of [[12, 5], [13, 5], [12, 6], [13, 6], [12, 7], [13, 7]]) grid[y][x] = o.block; } // en pelare (2 rutor tjock)
  grid[1][1] = 'x';
  for (const [t, x, y] of o.en || []) grid[y][x] = t;
  g.playCustom({ grid, biome: o.biome || 'dungeon' });
  for (const e of g.ents()) { e.d = { ...e.d, speed: 0, dmg: 0 }; e.alert = false; if (o.hurt) e.hp = e.maxHp * 0.5; e.pin165 = [e.x, e.y]; }
  g.P.hp = 1e6; g.P.iframe = 0; clearInterval(window.__hold); window.__pin = [8.5, 6.5]; g.P.a = 0; g.lvl().ambient = 1.1; g.P.pitch = 0; g.P.look = 0;
  window.__hold = setInterval(() => { const P = __game.P; P.hp = 1e6; if (window.__pin) { P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = window.__pin[2] || 0; P.vx = P.vy = 0; } for (const e of __game.ents()) { e.alert = false; e.detect = 0; if (e.pin165) { e.x = e.pin165[0]; e.y = e.pin165[1]; } } }, 30); }; // (fienden står kvar: en skadad fiende kan annars backa undan)
const scene = o => pg.evaluate(sceneFn, o);
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);
const ready = async o => { await scene(o); await until(() => __game.state() === 'play', 5); await until(() => __game.banner() <= 0, 4); await gwait(0.4); };
const diff = () => ev(() => { const g = __game, c = document.getElementById('screen'), cx = c.getContext('2d'), E = g.ents(), keep = E.slice();
  const grab = () => { g.v28.render(); return cx.getImageData(0, 0, c.width, c.height).data.slice(); };
  const A = grab(); E.length = 0; const B = grab(); E.push(...keep);
  let n = 0; for (let i = 0; i < A.length; i += 4) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 24) n++; return n; });
const res = {};
// ---- 1. livmätaren ----
const bar = async win => { await ready({ win, en: [['Ä', 15, 6]], hurt: true }); await gwait(0.3);
  return ev(() => { const g = __game, e = g.ents().find(x => x.type === 'Ä'), c = document.getElementById('screen'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 160) <= 2 && Math.abs(d[i + 1] - 64) <= 2 && Math.abs(d[i + 2] - 48) <= 2) n++; // livmätarens färg (#a04030)
    g.v28.render(); const p = g.look.project(e.x, e.y, e.d.size * 1.2 + 0.08); return { px: n, proj: !!p, hp: +(e.hp / e.maxHp).toFixed(2), sc: p ? +p.scale.toFixed(1) : 0, x: +e.x.toFixed(1) }; }); };
for (const win of ['ǂ', 'Ɉ', '1', '.']) { res['bar' + win] = await bar(win); await shot('livmatare_' + ({ 'ǂ': 'fonster', 'Ɉ': 'galler', '1': 'vagg', '.': 'oppning' })[win]); }
ok(res['bar.'].px >= 6 && res['bar.'].proj, 'kontroll: livmätaren syns genom en öppning ' + JSON.stringify(res['bar.']));
ok(res.bar1.px === 0 && !res.bar1.proj, 'livmätaren syns inte genom en vanlig vägg ' + JSON.stringify(res.bar1));
ok(res['barǂ'].px >= 6 && res['barǂ'].proj, 'livmätaren syns genom ett fönster ǂ ' + JSON.stringify(res['barǂ']));
ok(res['barɈ'].px >= 6 && res['barɈ'].proj, 'livmätaren syns genom ett galler Ɉ ' + JSON.stringify(res['barɈ']));
// ---- 2. sedda rutor ----
const seenBehind = async win => { await ready({ win }); return ev(() => { const g = __game, s = g.v28.seen(); s.fill(0); if (g.v28.far) g.v28.far().fill(0); g.v28.render();
  let n = 0, f = 0, front = 0; const F = g.v28.far ? g.v28.far() : null; for (let y = 1; y < 12; y++) for (let x = 13; x < 23; x++) { if (s[y * 24 + x]) n++; if (F && F[y * 24 + x]) f++; } for (let x = 2; x < 12; x++) if (s[6 * 24 + x]) front++;
  return { behind: n, far: f, front, hasFar: !!F }; }); };
res.seenWin = await seenBehind('ǂ'); res.seenGap = await seenBehind('.'); res.seenBars = await seenBehind('Ɉ');
ok(res.seenGap.behind > 10, 'kontroll: rutor bakom en öppning räknas som sedda ' + JSON.stringify(res.seenGap));
ok(res.seenWin.behind === 0 && res.seenWin.front >= 3, 'rutor man bara sett genom ett fönster räknas inte som sedda ' + JSON.stringify(res.seenWin));
ok(res.seenBars.behind === 0, 'rutor man bara sett genom ett galler räknas inte som sedda ' + JSON.stringify(res.seenBars));
ok(res.seenWin.hasFar && res.seenWin.far > 10, 'rutorna bakom fönstret finns som "skymtade" (svagt på kartan) ' + JSON.stringify(res.seenWin));
// kartan (skärmbild): de skymtade rutorna svagt
{ await ready({ win: 'ǂ' }); await ev(() => { __game.v28.render(); }); await pg.keyboard.press('Tab'); await gwait(0.3); await shot('karta_skymtat'); await pg.keyboard.press('Tab'); await shot('karta_skymtat2'); await pg.keyboard.press('Tab'); }
// ---- 3. gallerpelare ----
for (const block of ['Ɉ', 'ǂ']) { await ready({ win: '1', block, en: [['Ä', 17, 6]] }); res['block' + block] = await diff(); await shot('pelare_' + (block === 'Ɉ' ? 'galler' : 'fonster')); }
await ready({ win: 'Ɉ', en: [['Ä', 17, 6]] }); res.line = await diff();
ok(res['blockɈ'] === 0, 'en kultist bakom en gallerpelare (2 rutor tjock) syns inte: pelaren är ogenomskinlig ' + res['blockɈ']);
ok(res.line > 12, 'ett galler i en enkel rad är fortfarande genomsiktligt ' + res.line);
await ready({ win: 'Ɉ', lowfx: true, en: [['Ä', 17, 6]] }); res.lineLow = await diff(); await ready({ win: '1', block: 'Ɉ', lowfx: true, en: [['Ä', 17, 6]] }); res.blockLow = await diff();
ok(res.lineLow > 12 && res.blockLow === 0, 'lowfx: samma sak ' + JSON.stringify({ line: res.lineLow, block: res.blockLow }));
// bödelns arena (Gen.boss, två frön): pelarvyn ser likadan ut som utan genomsiktliga galler, och bödelns spärr (en rad galler) syns igenom
const arena = [];
for (const seed of [12345, 777]) {
  await ev(seed => { const g = __game, L = Gen.boss(seed, { arena: 'prison', boss: 'executioner' }); L.bossId = 'executioner'; g.run().depth = 6; g.startLevel(L); }, seed);
  await until(() => __game.state() === 'play', 5); await gwait(3.2);
  const r = await ev(() => { const g = __game, b = g.boss(); b.x = 12.5; b.y = 2.5; b.hidden = true; b.d = { ...b.d, speed: 0 }; g.pause(); const m = g.lvl().map, cells = [];
    for (let y = 1; y < m.length - 2; y++) for (let x = 1; x < m[0].length - 2; x++) if (m[y][x] === 'Ɉ' && m[y][x + 1] === 'Ɉ' && m[y + 1][x] === 'Ɉ' && m[y + 1][x + 1] === 'Ɉ') cells.push([x, y]);
    const c = document.getElementById('screen'), cx = c.getContext('2d'), out = [];
    const hash = () => { g.v28.render(); const d = cx.getImageData(0, 0, c.width, c.height).data; let h = 2166136261; for (let i = 0; i < d.length; i++) h = Math.imul(h ^ d[i], 16777619); return h >>> 0; };
    for (const [x, y] of cells.slice(0, 4)) { // från en ruta 3 steg till höger om pelaren, mot pelaren
      const px = x + 4.5, py = y + 1; if (g.v28.solid(px, py)) continue; g.P.x = px; g.P.y = py; g.P.a = Math.PI; g.P.look = 0; g.P.pitch = 0; g.particles().length = 0;
      const V = g.v28.V28; V.glass = true; const a = hash(); V.glass = false; const bb = hash(); V.glass = true; out.push(a === bb); }
    g.resume(); return { pillars: cells.length, same: out }; });
  arena.push(r); await shot('arena_' + seed);
}
ok(arena.every(r => r.pillars > 0 && r.same.length > 0 && r.same.every(Boolean)), 'bödelns arena: pelarna ritas som förut (inga burar) ' + JSON.stringify(arena));
await ev(() => { window.__pin = null; clearInterval(window.__hold); });
ok(cerr.length === 0, 'inga fel i konsolen ' + [...new Set(cerr)].slice(0, 3).join(' / '));
await done();
