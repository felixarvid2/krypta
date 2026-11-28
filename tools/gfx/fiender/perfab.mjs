// A/B per effektblock under tät strid (mellantelefon, liggande, CPU strypt RATE×): alla på, sedan ett block i taget av, och lowfx.
// node tools/gfx/fiender/perfab.mjs [etikett] [djup]  → out/perf/ab_<etikett>.json
import { chromium, CHROMIUM } from '../../playtest/head.mjs'; import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..'), PORT = 9750, RATE = +(process.env.RATE || 5), TAG = process.argv[2] || 'nu', DEPTH = +(process.argv[3] || 1);
const OUT = path.join(HERE, 'out', 'perf'); fs.mkdirSync(OUT, { recursive: true });
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = process.env.GAME_JS && p === '/js/game.js' ? process.env.GAME_JS : path.join(ROOT, p); if (fs.existsSync(f) && fs.statSync(f).isFile()) { r.setHeader('content-type', { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.css': 'text/css', '.ttf': 'font/ttf', '.ogg': 'audio/ogg', '.json': 'application/json' }[path.extname(f)] || 'application/octet-stream'); return r.end(fs.readFileSync(f)); } r.statusCode = 404; r.end(); }).listen(PORT);
const b = await chromium.launch({ executablePath: CHROMIUM, args: ['--use-gl=swiftshader', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.__ft = []; window.requestAnimationFrame = cb => raf(t => { const a = performance.now(); cb(t); if (window.__ftOn) window.__ft.push(performance.now() - a); }); });
const ev = (f, a) => pg.evaluate(f, a), wait = ms => pg.waitForTimeout(ms);
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&seed=perfmid`); await pg.waitForFunction('!document.getElementById("start").disabled', null, { timeout: 90000 });
await ev(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(800);
if (DEPTH > 1) { await ev(d => __game.loadFloor(d), DEPTH); await wait(2500); }
const cdp = await ctx.newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
const fight = () => ev(() => { const g = __game, P = g.P; g.run().practice = {}; P.iframe = 99999; P.hp = 999; g.settings.autoLowFx = false;
  const L = g.lvl(); const r = (L.rooms || []).slice().sort((a, b) => b.w * b.h - a.w * a.h)[0]; if (r) { const horiz = r.w >= r.h; P.x = horiz ? r.x + 1.2 : r.x + r.w / 2; P.y = horiz ? r.y + r.h / 2 : r.y + 1.2; P.a = horiz ? 0 : Math.PI / 2; }
  for (const e of g.ents()) if (!e.boss) { e.dead = true; e.gibbed = true; } g.particles().length = 0; let k = 0;
  window.__spawnI = setInterval(() => { if (g.ents().filter(e => !e.dead).length < 14) { const d = 2.5 + (k % 4) * 0.9, s = ((k % 5) - 2) * 0.8, t = 'WSLXÄ+'[k++ % 6]; const e = g.spawnEnemy(t, P.x + Math.cos(P.a) * d - Math.sin(P.a) * s, P.y + Math.sin(P.a) * d + Math.cos(P.a) * s); e.alert = true; e.sleep = false; if (k % 3 === 0) e.burn = 6; else if (k % 3 === 1) e.poison = 6; else e.frozen = 2; } }, 120);
  window.__hitI = setInterval(() => { for (const e of g.ents()) if (!e.dead && Math.random() < 0.15) g.hurtEnemy(e, Math.random() < 0.3 ? e.maxHp * 3 : 0.4, e.x, e.y); }, 200);
  window.__boomI = setInterval(() => { const a = P.a + (Math.random() - 0.5), d = 3 + Math.random() * 2; g.explode(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d, 4, 1.6, false, Math.random() < 0.3); }, 900);
  window.__fireI = setInterval(() => { try { P.hurt = 0.3; g.fire && g.fire(); } catch (e) { } }, 300); });
const stop = () => ev(() => { clearInterval(window.__spawnI); clearInterval(window.__hitI); clearInterval(window.__boomI); clearInterval(window.__fireI); });
const set = m => ev(m => { const g = __game; g.settings.lowfx = m === 'lowfx'; g.gfxE.set(m !== 'utan FIENDER'); g.gfxW.set({ off: m === 'utan VÄRLD' }); g.wfx && g.wfx.setOff(m === 'utan VAPEN'); g.wproj && g.wproj.setOff(m === 'utan PROJEKTILER'); }, m);
const measure = async ms => { await ev(() => { window.__ft = []; window.__ftOn = true; }); await wait(ms); return ev(() => { window.__ftOn = false; const a = window.__ft.slice().sort((p, q) => p - q), q = f => a[Math.min(a.length - 1, Math.floor(a.length * f))]; return { n: a.length, p50: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), parts: __game.particles().length }; }); };
if (process.env.PAUTO) { // autoLowFx: tät strid med hård strypning – lågeffektläget ska slå till av sig självt
  await set('alla'); await fight(); await ev(() => { __game.settings.autoLowFx = true; __game.settings.lowfx = false; }); const t0 = Date.now(); let on = false;
  for (let i = 0; i < 60 && !on; i++) { await wait(500); on = await ev(() => !!__game.settings.lowfx); }
  const ft = await measure(1500); await stop(); console.log('autoLowFx', on ? 'slog till efter ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s' : 'slog INTE till', 'RATE', RATE, JSON.stringify(ft));
  await ev(() => { __game.settings.lowfx = false; }); await b.close(); srv.close(); process.exit(0);
}
if (process.env.PPROF) { // CPU-profil med radträffar: de hetaste raderna i js/game.js
  await set(process.env.PPROF === 'lowfx' ? 'lowfx' : 'alla'); await fight(); await wait(1500);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 100 }); await cdp.send('Profiler.start'); await wait(6000); const { profile } = await cdp.send('Profiler.stop'); await stop();
  const lines = new Map(); let tot = 0; for (const n of profile.nodes) { if (!/game\.js/.test(n.callFrame.url)) { continue; } for (const t of n.positionTicks || []) { const k = t.line; lines.set(k, (lines.get(k) || 0) + t.ticks); tot += t.ticks; } }
  const all = profile.samples.length; console.log('prover', all, 'i game.js', tot);
  const src = fs.readFileSync(path.join(ROOT, 'js/game.js'), 'utf8').split('\n');
  for (const [l, t] of [...lines.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16)) console.log(String(l).padStart(6), (t / all * 100).toFixed(1).padStart(5) + '%', src[l - 1].trim().slice(0, 110));
  await b.close(); srv.close(); process.exit(0);
}
if (process.env.PSNAP) { // vilka partiklar dominerar? grupper efter storlek/blandning/färg, med ungefärlig skärmyta (size/avstånd)²
  await set('alla'); await fight(); const agg = {};
  for (let i = 0; i < 8; i++) { await wait(500); const r = await ev(() => { const P = __game.P, o = {}; for (const p of __game.particles()) { const d = Math.max(0.5, Math.hypot(p.x - P.x, p.y - P.y)), k = `${(+p.size).toFixed(2)}|${p.add ? 'add' : 'norm'}|${p.frames ? p.frames.length : 0}|${p.tint ? p.tint.join(',') : '-'}|${p.grav ? 'g' : ''}${p.drift ? 'd' : ''}`; o[k] = o[k] || [0, 0]; o[k][0]++; o[k][1] += (p.size / d) ** 2 * 10000; } return o; });
    for (const [k, v] of Object.entries(r)) { agg[k] = agg[k] || [0, 0]; agg[k][0] += v[0]; agg[k][1] += v[1]; } }
  await stop(); const tot = Object.values(agg).reduce((s, v) => s + v[1], 0), cn = Object.values(agg).reduce((s, v) => s + v[0], 0);
  for (const [k, v] of Object.entries(agg).sort((a, b) => process.env.BYCOUNT ? b[1][0] - a[1][0] : b[1][1] - a[1][1]).slice(0, 14)) console.log(k.padEnd(40), 'antal', (v[0] / 8).toFixed(1), 'yta', (v[1] / tot * 100).toFixed(1) + '%');
  console.log('totalt per bild', (cn / 8).toFixed(0)); await b.close(); srv.close(); process.exit(0);
}
if (process.env.PBENCH2) { // enskilda block: VÄRLDs vätskor (warpMs), FIENDERs logik (bench)
  await set('alla'); await fight(); await wait(2500);
  const r = await ev(() => { const g = __game; return { warp: g.gfxW.warpMs(30), used: g.gfxW.used(), fiender: g.gfxE.bench(100), ents: g.ents().length, wp: g.wproj.state() }; });
  await stop(); console.log(JSON.stringify(r)); await b.close(); srv.close(); process.exit(0);
}
if (process.env.PBENCH) { // hur mycket kostar partiklarna i render? samma bild med och utan partikellistan
  await set('alla'); await fight(); await wait(2500); await stop();
  const r = await ev(() => { const g = __game, snap = g.particles().slice(), out = {}; const run = () => { const ts = []; for (let i = 0; i < 40; i++) { g.particles().length = 0; for (const p of snap) g.particles().push(Object.assign({}, p)); const t0 = performance.now(); g.gfxW.bench(1); ts.push(performance.now() - t0); } ts.sort((a, b) => a - b); return ts[20]; };
    out.n = snap.length; out.med = run(); snap.length = 0; out.tom = run(); return out; });
  console.log('render med', r.n, 'partiklar:', r.med.toFixed(1), 'ms · utan partiklar:', r.tom.toFixed(1), 'ms'); await b.close(); srv.close(); process.exit(0);
}
const modes = ['alla', 'utan FIENDER', 'utan VÄRLD', 'utan VAPEN', 'utan PROJEKTILER', 'lowfx'], res = { rate: RATE, depth: DEPTH, biome: await ev(() => __game.lvl().biome), rows: {} };
for (let rep = 0; rep < 2; rep++) for (const m of modes) { await set(m); await fight(); await wait(1200); const r = await measure(3500); await stop(); (res.rows[m] = res.rows[m] || []).push(r); }
for (const m of modes) { const a = res.rows[m]; console.log(m.padEnd(18), 'p50', a.map(r => r.p50).join('/'), 'p95', a.map(r => r.p95).join('/'), 'partiklar', a.map(r => r.parts).join('/')); }
res.errors = errs.slice(0, 5); fs.writeFileSync(path.join(OUT, 'ab_' + TAG + '.json'), JSON.stringify(res, null, 1));
await b.close(); srv.close();
