// Gemensam prestandakontroll (FIENDER, omgång 4): mellantelefon – liggande telefonvy, SwiftShader, CPU strypt RATE× (standard 5).
// Tät strid i några biomer med alla nya effekter: explosioner, gibs, statuseffekter, spawn ur golvet, eld, skott.
// Mäter tid per bildruta (rAF-anropet: update + render) p50/p95 med effekter på och med lowfx, kontrollerar autoLowFx och tar en CPU-profil.
// node tools/gfx/fiender/perfmid.mjs [etikett]   → tools/gfx/fiender/out/perf/<etikett>.json
import { chromium, CHROMIUM } from '../../playtest/head.mjs'; import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..'), PORT = 9749, RATE = +(process.env.RATE || 5), TAG = process.argv[2] || 'nu';
const OUT = path.join(HERE, 'out', 'perf'); fs.mkdirSync(OUT, { recursive: true });
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (fs.existsSync(f) && fs.statSync(f).isFile()) { r.setHeader('content-type', { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.css': 'text/css', '.ttf': 'font/ttf', '.ogg': 'audio/ogg', '.json': 'application/json' }[path.extname(f)] || 'application/octet-stream'); return r.end(fs.readFileSync(f)); } r.statusCode = 404; r.end(); }).listen(PORT);
const b = await chromium.launch({ executablePath: CHROMIUM, args: ['--use-gl=swiftshader', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.__ft = []; window.requestAnimationFrame = cb => raf(t => { const a = performance.now(); cb(t); if (window.__ftOn) window.__ft.push(performance.now() - a); }); });
const ev = (f, a) => pg.evaluate(f, a), wait = ms => pg.waitForTimeout(ms);
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&seed=perfmid`); await pg.waitForFunction('!document.getElementById("start").disabled', null, { timeout: 90000 });
await ev(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(800);
const cdp = await ctx.newCDPSession(pg);
const stage = depth => ev(depth => { const g = __game; if (depth > 1) g.loadFloor(depth); }, depth);
const fight = () => ev(() => { const g = __game, P = g.P; g.run().practice = {}; P.iframe = 99999; P.hp = 999; g.settings.autoLowFx = false;
  const L = g.lvl(); const r = (L.rooms || []).slice().sort((a, b) => b.w * b.h - a.w * a.h)[0]; if (r) { const horiz = r.w >= r.h; P.x = horiz ? r.x + 1.2 : r.x + r.w / 2; P.y = horiz ? r.y + r.h / 2 : r.y + 1.2; P.a = horiz ? 0 : Math.PI / 2; }
  for (const e of g.ents()) if (!e.boss) { e.dead = true; e.gibbed = true; } g.particles().length = 0;
  const types = 'WSLXÄ+'; let k = 0;
  window.__spawnI = setInterval(() => { const live = g.ents().filter(e => !e.dead).length; if (live < 14) { const d = 2.5 + (k % 4) * 0.9, s = ((k % 5) - 2) * 0.8, t = types[k++ % types.length]; const e = g.spawnEnemy(t, P.x + Math.cos(P.a) * d - Math.sin(P.a) * s, P.y + Math.sin(P.a) * d + Math.cos(P.a) * s); e.alert = true; e.sleep = false; if (k % 3 === 0) e.burn = 6; else if (k % 3 === 1) e.poison = 6; else e.frozen = 2; } }, 120);
  window.__hitI = setInterval(() => { for (const e of g.ents()) if (!e.dead && Math.random() < 0.15) g.hurtEnemy(e, Math.random() < 0.3 ? e.maxHp * 3 : 0.4, e.x, e.y); }, 200);
  window.__boomI = setInterval(() => { const a = P.a + (Math.random() - 0.5), d = 3 + Math.random() * 2; g.explode(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d, 4, 1.6, false, Math.random() < 0.3); }, 900);
  window.__fireI = setInterval(() => { try { P.hurt = 0.3; g.fire && g.fire(); } catch (e) { } }, 300); });
const stop = () => ev(() => { clearInterval(window.__spawnI); clearInterval(window.__hitI); clearInterval(window.__boomI); clearInterval(window.__fireI); });
const measure = async (ms) => { await ev(() => { window.__ft = []; window.__ftOn = true; }); await wait(ms); return ev(() => { window.__ftOn = false; const a = window.__ft.slice().sort((p, q) => p - q), q = f => a[Math.min(a.length - 1, Math.floor(a.length * f))]; return { n: a.length, p50: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), mean: +(a.reduce((s, v) => s + v, 0) / a.length).toFixed(1), parts: __game.particles().length }; }); };
const res = { rate: RATE, biomes: [] };
await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
for (const depth of [1, 4, 8]) {
  await stage(depth); await wait(2500); const biome = await ev(() => __game.lvl().biome || 'krypta');
  const row = { depth, biome };
  for (const mode of ['fx', 'lowfx']) { await ev(lo => { __game.settings.lowfx = lo; }, mode === 'lowfx'); await fight(); await wait(1500); row[mode] = await measure(5000); await stop(); }
  res.biomes.push(row); console.log(JSON.stringify(row));
}
// CPU-profil (effekter på), samlad egen tid per funktion
await ev(() => { __game.settings.lowfx = false; }); await fight(); await wait(1000);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start'); await wait(5000); const { profile } = await cdp.send('Profiler.stop'); await stop();
const self = new Map(), dt = profile.timeDeltas, byId = new Map(profile.nodes.map(n => [n.id, n])); const cnt = new Map(); profile.samples.forEach((id, i) => cnt.set(id, (cnt.get(id) || 0) + (dt[i] || 0)));
for (const [id, t] of cnt) { const n = byId.get(id), k = `${n.callFrame.functionName || '(anon)'}:${n.callFrame.lineNumber + 1}`; self.set(k, (self.get(k) || 0) + t); }
const tot = [...self.values()].reduce((s, v) => s + v, 0); res.profile = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, v]) => `${k} ${(v / tot * 100).toFixed(1)}%`);
console.log(res.profile.join('\n'));
// autoLowFx: med strypning och tät strid ska lågeffektläget slå till av sig självt
await ev(() => { __game.settings.lowfx = false; }); await fight(); await ev(() => { __game.settings.autoLowFx = true; }); const t0 = Date.now();
let auto = false; for (let i = 0; i < 40 && !auto; i++) { await wait(500); auto = await ev(() => !!__game.settings.lowfx); } res.autoLowFx = { on: auto, s: (Date.now() - t0) / 1000 }; await stop();
console.log('autoLowFx', JSON.stringify(res.autoLowFx), 'fel', errs.length);
res.errors = errs.slice(0, 5); fs.writeFileSync(path.join(OUT, TAG + '.json'), JSON.stringify(res, null, 1));
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await b.close(); srv.close();
