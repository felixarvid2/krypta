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
  const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = (process.env.STABLE_GEN && p === '/js/gen.js') ? path.join(HERE, 'gen_stable.js') : (process.env.GAME_JS && p === '/js/game.js') ? process.env.GAME_JS : path.join(root, p); if (fs.existsSync(f) && fs.statSync(f).isFile()) { const e = path.extname(f); res.setHeader('content-type', { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.ogg': 'audio/ogg', '.ttf': 'font/ttf', '.css': 'text/css' }[e] || 'application/octet-stream'); return res.end(fs.readFileSync(f)); } res.statusCode = 404; res.end(); }).listen(port);
  const b = await chromium.launch({ executablePath: CHROMIUM, args: ['--use-gl=swiftshader', '--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: 960, height: 600 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGEERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  fs.mkdirSync(out, { recursive: true });
  const shot = n => pg.screenshot({ path: `${out}/${n}.png` }), ev = (f, a) => pg.evaluate(f, a), wait = ms => pg.waitForTimeout(ms), ok = (c, m) => console.log(c ? 'OK  ' : 'FAIL', m);
  const start = async (q = '') => { await pg.goto(`http://localhost:${port}/index.html?nolock=1${q}`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 60000 }); await ev(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(800); };
  const done = async () => { ok(errs.length === 0, 'inga fel ' + errs.join(' / ')); await b.close(); srv.close(); };
  return { pg, errs, shot, ev, wait, ok, start, done };
}
