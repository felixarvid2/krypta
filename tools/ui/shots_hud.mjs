// HUD-skärmdumpar: normal, strid, effekter, boss, låg hälsa och stor HUD. node tools/ui/shots_hud.mjs [etikett]
// Utdata: tools/ui/out/<etikett>/<enhet>_<läge>.png (DEVS=dator,liggande,staende)
import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module'; import { fileURLToPath } from 'url';
const req = createRequire(import.meta.url); let PW; for (const m of ['playwright-core', 'playwright', '/opt/node22/lib/node_modules/playwright']) { try { PW = req(m); break; } catch (e) { /* nästa */ } }
const { chromium, devices } = PW; const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.KRYPTA_ROOT || path.resolve(HERE, '../..'), TAG = process.argv[2] || 'hud', OUT = path.join(HERE, 'out', TAG); fs.mkdirSync(OUT, { recursive: true });
const PORT = 9400 + Math.floor(Math.random() * 90);
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (fs.existsSync(f) && fs.statSync(f).isFile()) { r.setHeader('content-type', { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.ogg': 'audio/ogg', '.ttf': 'font/ttf', '.css': 'text/css' }[path.extname(f)] || 'application/octet-stream'); return r.end(fs.readFileSync(f)); } r.statusCode = 404; r.end(); }).listen(PORT);
const b = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined, args: ['--use-gl=swiftshader', '--no-sandbox'] });
const px = devices['Pixel 7'];
const DEVS = (process.env.DEVS || 'dator,liggande').split(',');
const CFG = { dator: { viewport: { width: 1280, height: 720 } }, liggande: { ...px, viewport: { width: px.viewport.height, height: px.viewport.width } }, staende: { ...px } };
const errs = [];
for (const d of DEVS) {
  const ctx = await b.newContext({ ...CFG[d], deviceScaleFactor: 1 }); const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(d + ': ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  const ev = (f, a) => pg.evaluate(f, a), wait = ms => pg.waitForTimeout(ms), shot = n => pg.screenshot({ path: `${OUT}/${d}_${n}.png` });
  await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', null, { timeout: 90000 });
  await wait(400);
  const steps = [
    ['1_banner', async () => { await ev(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; document.getElementById('seed').value = 'ui1'; __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(600); }],
    ['2_spel', async () => { await wait(3500); }],
    ['3_strid', async () => { await ev(() => { const P = __game.P; P.hp = 37; P.armor = 25; const e = __game.spawnEnemy('Y', P.x + Math.cos(P.a) * 3, P.y + Math.sin(P.a) * 3); __game.alertEnemy(e); __game.run().gold += 15; }); await wait(700); }],
    ['4_effekter', async () => { await ev(() => { const P = __game.P; P.hp = 20; P.rageT = 12; P.haste = 6; P.slowT = 3; P.grenades = 3; P.keys = 2; P.potions = [{ id: 'heal' }, { id: 'rage' }]; P.battery = 10; P.lamp = true; }); await wait(800); }],
    ['5_boss', async () => { await ev(() => { const P = __game.P; P.hp = 80; P.rageT = 0; P.haste = 0; P.slowT = 0; __game.loadFloor(6); }); await wait(1800); await ev(() => { __game.P.hp = 80; }); await wait(3800); }],
    ['6_storhud', async () => { await ev(() => { __game.settings.bigHud = true; __game.P.grenades = 2; }); await wait(600); }],
    ['7_spel_igen', async () => { await ev(() => { __game.settings.bigHud = false; }); await wait(300); }],
    ['8_allt', async () => { await ev(() => { const g = __game, P = g.P; g.profile.tutDone = false; g.settings.autoReload = false; P.hp = 300; P.mags[P.weapon] = 0; P.ammo[g.WEAPONS[P.weapon].ammo] = 20; P.halluT = 6; P.honeyT = 6; P.lowGT = 6; P.scopeT = 6; P.rageT = 8; P.haste = 8; const st = g.styleRef(); st.v = 6; st.feed = st.feed || []; g.run().xp = (g.run().xp || 0) + 5; g.settings.hudTheme = 'gold'; g.say('ETT MEDDELANDE TILL'); }); await wait(900); }],
    ['9_narstrid', async () => { await ev(() => { const g = __game, P = g.P; g.settings.hudTheme = ''; const i = g.WEAPONS.findIndex(w => w.melee); if (i >= 0) { P.has[i] = true; g.switchWeapon(i); } }); await wait(900); }],
    ['10_dodat', async () => { await ev(() => { const g = __game, P = g.P; g.profile.tutDone = true; g.settings.autoReload = true; P.hp = 300; for (let i = 0; i < 3; i++) g.spawnEnemy('Y', P.x + Math.cos(P.a + i * 0.3) * 3, P.y + Math.sin(P.a + i * 0.3) * 3); }); await wait(200); await ev(() => __game.killAllCheat()); await wait(700); }],
  ];
  for (const [n, f] of steps) { try { await f(); await shot(n); } catch (e) { errs.push(d + ' ' + n + ': ' + e.message.split('\n')[0]); } }
  const r = await ev(() => __game.hudRects && __game.hudRects()); console.log(d, 'hudRects', JSON.stringify(r));
  await ctx.close();
}
console.log(errs.length ? 'FEL:\n' + errs.join('\n') : 'inga fel'); console.log('bilder i', OUT);
await b.close(); srv.close();
