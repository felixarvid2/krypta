// UI-skärmdumpar: dator, telefon liggande och stående. node tools/ui/shots.mjs [etikett]
// Utdata: tools/ui/out/<etikett>/<enhet>_<läge>.png
import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module'; import { fileURLToPath } from 'url';
const req = createRequire(import.meta.url); let PW; for (const m of ['playwright-core', 'playwright', '/opt/node22/lib/node_modules/playwright']) { try { PW = req(m); break; } catch (e) { /* nästa */ } }
const { chromium, devices } = PW; const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.KRYPTA_ROOT || path.resolve(HERE, '../..'), TAG = process.argv[2] || 'nu', OUT = path.join(HERE, 'out', TAG); fs.mkdirSync(OUT, { recursive: true });
const PORT = 9300 + Math.floor(Math.random() * 90);
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (fs.existsSync(f) && fs.statSync(f).isFile()) { r.setHeader('content-type', { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.ogg': 'audio/ogg', '.ttf': 'font/ttf', '.css': 'text/css' }[path.extname(f)] || 'application/octet-stream'); return r.end(fs.readFileSync(f)); } r.statusCode = 404; r.end(); }).listen(PORT);
const b = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined, args: ['--use-gl=swiftshader', '--no-sandbox'] });
const px = devices['Pixel 7'];
const DEVS = (process.env.DEVS || 'dator,liggande,staende').split(',');
const CFG = { dator: { viewport: { width: 1280, height: 720 } }, liggande: { ...px, viewport: { width: px.viewport.height, height: px.viewport.width } }, staende: { ...px } };
const errs = [];
for (const d of DEVS) {
  const ctx = await b.newContext({ ...CFG[d], deviceScaleFactor: 1 }); const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(d + ': ' + e.message));
  const ev = (f, a) => pg.evaluate(f, a), wait = ms => pg.waitForTimeout(ms), shot = n => pg.screenshot({ path: `${OUT}/${d}_${n}.png` });
  await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&lang=${process.env.LANG_UI || 'en'}`); await pg.waitForFunction('!document.getElementById("start").disabled', null, { timeout: 90000 });
  await wait(600); await shot('1_start');
  const steps = [
    ['2_spel', async () => { await ev(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; document.getElementById('seed').value = 'ui1'; __game.begin('new'); }); await wait(2200); await pg.keyboard.press('Escape'); await wait(4000); }],
    ['3_strid', async () => { await ev(() => { const P = __game.P; P.hp = 37; const e = __game.spawnEnemy('Y', P.x + Math.cos(P.a) * 3, P.y + Math.sin(P.a) * 3); __game.alertEnemy && __game.alertEnemy(e); }); await wait(700); }],
    ['4_paus', async () => { await ev(() => __game.pauseMenu()); await wait(700); }],
    ['5_kort', async () => { await pg.keyboard.press('Escape'); await wait(400); await ev(() => { if (__game.state() !== 'play') __game.pauseMenu && 0; }); await ev(() => __game.gainCard && __game.gainCard()); await wait(900); }],
    ['6_affar', async () => { await pg.keyboard.press('Escape'); await wait(400); await ev(() => { const m = __game.merchants()[0] || { stock: null }; try { __game.openShop(m); } catch (e) { } }); await wait(900); }],
    ['7_vaningsslut', async () => { await pg.keyboard.press('Escape'); await wait(400); await ev(() => { try { if (__game.state() !== 'play') __game.resume && __game.resume(); __game.floorDone ? __game.floorDone() : __game.showStats(); } catch (e) { } }); await wait(4000); }],
    ['8_dod', async () => { await ev(() => { try { const b = document.getElementById('nextbtn'); if (b && !document.getElementById('floorend').hidden) b.click(); } catch (e) { } }); await wait(2500); await ev(() => { try { if (__game.CardUI && CardUI.isOpen()) CardUI.close(); } catch (e) { } try { __game.run().cause = 'SKELETT'; __game.hurtPlayer(9999); } catch (e) { __game.endRun(false); } }); await wait(3000); }],
  ];
  for (const [n, f] of steps) { try { await f(); await shot(n); } catch (e) { errs.push(d + ' ' + n + ': ' + e.message.split('\n')[0]); } }
  await ctx.close();
}
console.log(errs.length ? 'FEL:\n' + errs.join('\n') : 'inga fel'); console.log('bilder i', OUT);
await b.close(); srv.close();
