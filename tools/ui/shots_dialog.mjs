// Dialog-skärmdumpar (CardUI): kista, affär, lägret, präst, spelare, runa, talang, paus. node tools/ui/shots_dialog.mjs [etikett]
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
  await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', null, { timeout: 90000 });
  await wait(600); await shot('1_start');
  const P0 = () => ev(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; document.getElementById('seed').value = 'ui1'; __game.begin('new'); });
  const esc = async () => { await ev(() => { try { CardUI.close(); } catch (e) { } }); await ev(() => { try { __game.resume && __game.state() !== 'play' && __game.resume(); } catch (e) { } }); await wait(300); };
  const steps = [
    ['0_spel', async () => { await P0(); await wait(2200); await pg.keyboard.press('Escape'); await wait(3000); }],
    ['1_kista', async () => { await ev(() => { const P = __game.P; __game.openChest({ x: P.x, y: P.y }); }); await wait(2600); }],
    ['2_kista_vald', async () => { await pg.keyboard.press('ArrowRight'); await wait(400); }],
    ['3_affar', async () => { await esc(); await ev(() => { __game.run().gold = 140; const m = __game.merchants()[0] || { stock: null }; __game.openShop(m); }); await wait(900); }],
    ['4_affar_vald', async () => { await pg.keyboard.press('ArrowRight'); await pg.keyboard.press('ArrowRight'); await wait(400); }],
    ['5_lagret', async () => { await esc(); await ev(() => __game.openCampfire({})); await wait(900); }],
    ['6_prasten', async () => { await esc(); await ev(() => __game.openPriest({})); await wait(900); }],
    ['7_spelaren', async () => { await esc(); await ev(() => __game.openGambler({})); await wait(900); }],
    ['8_runa', async () => { await esc(); await ev(() => __game.giveRune('fire', 'DU HITTADE')); await wait(1200); }],
    ['9_talang', async () => { await esc(); await ev(() => __game.talentPick()); await wait(1200); }],
    ['10_paus', async () => { await esc(); await ev(() => __game.pauseMenu()); await wait(700); }],
  ];
  for (const [n, f] of steps) { try { await f(); await shot(n); } catch (e) { errs.push(d + ' ' + n + ': ' + e.message.split('\n')[0]); } }
  await ctx.close();
}
console.log(errs.length ? 'FEL:\n' + errs.join('\n') : 'inga fel'); console.log('bilder i', OUT);
await b.close(); srv.close();
