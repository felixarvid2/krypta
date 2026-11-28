import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module'; import { fileURLToPath } from 'url';
const req = createRequire(import.meta.url); let PW; for (const m of ['playwright-core', 'playwright', '/opt/node22/lib/node_modules/playwright']) { try { PW = req(m); break; } catch (e) { /* nästa */ } }
const { chromium } = PW; export { chromium };
export const CHROMIUM = process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const HERE = path.dirname(fileURLToPath(import.meta.url));
export async function setup(port, out) {
  const root = process.env.KRYPTA_ROOT || path.resolve(HERE, '../..');
  { const dir = path.join(root, 'src/game'), out = path.join(root, 'js/game.js'); // version 27: js/game.js byggs av src/game/ (tools/build-game.mjs)
    if (fs.existsSync(dir)) { const want = fs.readdirSync(dir).filter(f => /^\d{4}_.+\.js$/.test(f)).sort().map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('');
      if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== want) { fs.writeFileSync(out, want); console.log('(js/game.js byggdes om av src/game/)'); } } }
  const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = (process.env.STABLE_GEN && p === '/js/gen.js') ? path.join(HERE, 'gen_stable.js') : (process.env.GAME_JS && p === '/js/game.js') ? process.env.GAME_JS : path.join(root, p); if (fs.existsSync(f) && fs.statSync(f).isFile()) { const e = path.extname(f); res.setHeader('content-type', { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.ogg': 'audio/ogg', '.ttf': 'font/ttf', '.css': 'text/css' }[e] || 'application/octet-stream'); return res.end(fs.readFileSync(f)); } res.statusCode = 404; res.end(); });
  await listenWait(srv, port); // version 29: upptagen port (ett annat test eller en annan agent på samma port) – vänta tills den blir ledig i stället för att krascha
  const b = await chromium.launch({ executablePath: CHROMIUM, args: ['--use-gl=swiftshader', '--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: 960, height: 600 } });
  pg.setDefaultNavigationTimeout(120000); // version 29: index.html med 3 MB skript laddas långsamt när fyra Chromium delar processorn (t42: goto 30 s)
  if (+process.env.PW_THROTTLE > 1) { const cdp = await pg.context().newCDPSession(pg); pg.on('load', () => cdp.send('Emulation.setCPUThrottlingRate', { rate: +process.env.PW_THROTTLE }).catch(() => {})); } // version 29: konstgjord last efter laddningen (av som standard)
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  fs.mkdirSync(out, { recursive: true });
  const shot = n => pg.screenshot({ path: `${out}/${n}.png` }), ev = (f, a) => pg.evaluate(f, a), wait = ms => pg.waitForTimeout(ms), ok = (c, m) => console.log(c ? 'OK  ' : 'FAIL', m);
  const start = async (q = '') => { await pg.goto(`http://localhost:${port}/index.html?nolock=1${q}`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 60000 }); await ev(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(800); };
  const done = async () => { ok(errs.length === 0, 'inga fel ' + errs.join(' / ')); await b.close(); srv.close(); };
  const { gt, until, gwait, gsample } = gameClock(ev, wait);
  return { pg, errs, shot, ev, wait, ok, start, done, gt, until, gwait, gsample };
}
async function listenWait(srv, port, maxMs = 120000) {
  const w0 = Date.now();
  for (;;) {
    const err = await new Promise(res => { const onErr = e => { srv.off('listening', onOk); res(e); }, onOk = () => { srv.off('error', onErr); res(null); }; srv.once('error', onErr); srv.once('listening', onOk); srv.listen(port); });
    if (!err) return;
    if (err.code !== 'EADDRINUSE' || Date.now() - w0 > maxMs) throw err;
    if (Date.now() - w0 < 600) console.log('(porten ' + port + ' är upptagen – väntar)');
    await new Promise(r => setTimeout(r, 500));
  }
}
// Version 29: väntan i speltid. Spelets klocka (tmr, __game.v27b.t()) går bara när spelet uppdateras och dt kapas till 0,05 s per bildruta,
// så på en belastad maskin går speltiden långsammare än väggtiden. wait(ms) ger då för lite speltid; gwait/until räknar speltid.
// until(cond, sek, arg): sant så fort cond (körs i sidan) är sant, falskt när sek sekunder speltid gått utan att cond blev sant.
// Utan cond: väntar sek sekunder speltid. I 'pause'/'ui' (klockan står) och före spelet räknas väggtid i stället. Spärr: maxWall ms väggtid.
// gsample(f, sek, arg): kör f(arg) i sidan i varje bildruta under sek sekunder speltid och samlar svaren (övergående tillstånd missas inte).
export function gameClock(ev, wait) {
  const now = () => ev(() => { const g = window.__game; if (!g || !g.v27b) return { t: -1, st: 'none' }; return { t: g.v27b.t(), st: g.state() }; });
  const gt = async () => (await now()).t;
  // Väntan och villkor körs i sidan, en gång per bildruta (requestAnimationFrame, efter spelets egen uppdatering i samma bildruta), så att
  // väntan inte skjuter över med flera bildrutor som när den provade via evaluate var 40:e ms.
  const until = (cond, sec, arg, maxWall = Math.max(60000, sec * 40000)) => ev(([src, sec, arg, maxWall]) => new Promise(res => {
    const fn = src ? (0, eval)('(' + src + ')') : null, w0 = performance.now(); let gone = 0, lt = null, lw = w0;
    const k = () => {
      if (fn) { let v = false; try { v = fn(arg); } catch (e) { v = false; } if (v) return res(true); }
      const g = window.__game, w = performance.now(), t = g && g.v27b ? g.v27b.t() : null, st = g && g.state ? g.state() : 'none';
      if (t !== null && lt !== null && t > lt) gone += t - lt; // speltid
      else if (t === null || st === 'pause' || st === 'ui') gone += (w - lw) / 1000; // klockan står: väggtid
      lt = t; lw = w;
      if (gone >= sec || w - w0 > maxWall) return res(!fn);
      requestAnimationFrame(k);
    };
    setTimeout(() => res(!fn), maxWall + 1000); // om bildrutorna står helt still
    k();
  }), [cond ? cond.toString() : null, sec, arg, maxWall]);
  const gwait = sec => until(null, sec);
  const gsample = (f, sec, arg) => ev(([src, sec, arg]) => new Promise(res => { const fn = (0, eval)('(' + src + ')'), g = window.__game, out = [], t0 = g.v27b.t(), w0 = performance.now();
    const k = () => { try { out.push(fn(arg)); } catch (e) { out.push('ERR ' + e.message); } if (g.v27b.t() - t0 >= sec || performance.now() - w0 > Math.max(60000, sec * 40000)) res(out); else requestAnimationFrame(k); }; k(); }), [f.toString(), sec, arg]);
  return { gt, until, gwait, gsample };
}
