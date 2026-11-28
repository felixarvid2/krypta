// Spelar kort i flera biomer på engelska och listar texter som fortfarande är svenska. node tools/i18n/coverage_play.mjs [biom,biom,…]
import http from 'http'; import fs from 'fs'; import path from 'path'; import { createRequire } from 'module'; import { fileURLToPath } from 'url';
const req = createRequire(import.meta.url); let PW; for (const m of ['playwright-core', 'playwright', '/opt/node22/lib/node_modules/playwright']) { try { PW = req(m); break; } catch (e) { } }
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = process.env.KRYPTA_ROOT || path.resolve(HERE, '../..'), PORT = 9560 + Math.floor(Math.random() * 30);
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (fs.existsSync(f) && fs.statSync(f).isFile()) { r.setHeader('content-type', { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.css': 'text/css', '.ttf': 'font/ttf' }[path.extname(f)] || 'application/octet-stream'); return r.end(fs.readFileSync(f)); } r.statusCode = 404; r.end(); }).listen(PORT);
const b = await PW.chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined, args: ['--use-gl=swiftshader', '--no-sandbox'] });
const BI = (process.argv[2] || 'dungeon,ship,lab,circus,jungle,mine,observatory,sewer,desert,library').split(',');
const all = new Set(); const errs = [];
for (const bi of BI) {
  const pg = await b.newPage({ viewport: { width: 960, height: 600 } }); pg.on('pageerror', e => errs.push(bi + ': ' + e.message));
  const ev = (f, a) => pg.evaluate(f, a), wait = ms => pg.waitForTimeout(ms);
  await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&lang=en&biome=${bi}&seed=c${bi}`); await pg.waitForFunction('!document.getElementById("start").disabled', null, { timeout: 90000 });
  await ev(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(500);
  for (let i = 0; i < 30; i++) { await ev(() => { const P = __game.P; P.hp = 999; if (__game.state() !== 'play') { try { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); } catch (e) { } } }); await pg.keyboard.down('w'); await pg.mouse.down(); await wait(300); await pg.mouse.up(); await pg.keyboard.up('w'); await pg.keyboard.press('e'); await pg.mouse.move(480 + (i % 5 - 2) * 150, 300); if (i === 15) await ev(() => __game.killAllCheat()); if (__game_state_ui(await ev(() => __game.state()))) await pg.keyboard.press('Escape'); }
  for (const s of await ev(() => [...I18N.missing])) all.add(s);
  await pg.close();
}
function __game_state_ui(s) { return s === 'ui'; }
fs.writeFileSync(path.join(HERE, 'missing_play.json'), JSON.stringify([...all], null, 1));
console.log('saknas', all.size, errs.length ? 'SIDFEL ' + errs.slice(0, 3).join(' | ') : 'inga sidfel');
await b.close(); srv.close();
