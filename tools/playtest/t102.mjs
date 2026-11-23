// Språket: engelska som standard, svenska som val i inställningarna; inga svenska texter kvar på de vanliga skärmarna.
import { chromium, CHROMIUM } from './head.mjs'; import http from 'http'; import fs from 'fs'; import path from 'path'; import { spawnSync } from 'child_process'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = process.env.KRYPTA_ROOT || path.resolve(HERE, '../..'), PORT = 9602;
const ok = (c, m) => console.log(c ? 'OK  ' : 'FAIL', m);
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (fs.existsSync(f) && fs.statSync(f).isFile()) { r.setHeader('content-type', { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.css': 'text/css', '.ttf': 'font/ttf' }[path.extname(f)] || 'application/octet-stream'); return r.end(fs.readFileSync(f)); } r.statusCode = 404; r.end(); }).listen(PORT);
const b = await chromium.launch({ executablePath: CHROMIUM, args: ['--use-gl=swiftshader', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
const ev = (f, a) => pg.evaluate(f, a), wait = ms => pg.waitForTimeout(ms), ready = () => pg.waitForFunction('!document.getElementById("start").disabled', null, { timeout: 90000 });
// utan nolock och utan sparade inställningar: engelska
await pg.goto(`http://localhost:${PORT}/index.html`); await ready(); await wait(400);
ok(await ev(() => I18N.lang()) === 'en', 'standardspråket är engelska');
ok(await ev(() => document.getElementById('start').textContent.trim()) === 'PLAY', 'startknappen heter PLAY (' + await ev(() => document.getElementById('start').textContent.trim()) + ')');
ok(await ev(() => /KRYPTA/.test(document.body.innerText)), 'namnet KRYPTA är kvar');
ok(await ev(() => !/[ÅÄÖåäö]/.test(document.getElementById('title').innerText)), 'startskärmen har inga å/ä/ö');
ok(await ev(() => I18N.t('NY FIENDE: HELVETESHUND')) === 'NEW ENEMY: HELLHOUND', 'sammansatt text översätts (' + await ev(() => I18N.t('NY FIENDE: HELVETESHUND')) + ')');
ok(await ev(() => /FLOOR/.test(I18N.t('VÅNING 3'))), 'mallsträng med tal översätts (' + await ev(() => I18N.t('VÅNING 3')) + ')');
// byt till svenska i inställningarna
await ev(() => document.getElementById('settingsbtn').click()); await wait(500);
const sel = await ev(() => { const s = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === 'sv')); if (!s) return false; s.value = 'sv'; s.dispatchEvent(new Event('change')); return true; });
ok(sel, 'inställningarna har ett språkval med SVENSKA');
await wait(1500); await ready(); await wait(400);
ok(await ev(() => I18N.lang()) === 'sv', 'efter bytet är språket svenska');
ok(await ev(() => document.getElementById('start').textContent.trim()) === 'SPELA', 'startknappen heter SPELA');
// tillbaka till engelska
await ev(() => document.getElementById('settingsbtn').click()); await wait(500);
await ev(() => { const s = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === 'sv')); s.value = 'en'; s.dispatchEvent(new Event('change')); }); await wait(1500); await ready(); await wait(300);
ok(await ev(() => I18N.lang()) === 'en', 'och tillbaka till engelska');
ok(errs.length === 0, 'inga sidfel ' + errs.join(' | '));
await b.close(); srv.close();
// genomgång av skärmarna: högst 5 texter kvar på svenska
const r = spawnSync('node', [path.join(ROOT, 'tools/i18n/coverage.mjs')], { env: { ...process.env, KRYPTA_ROOT: ROOT }, encoding: 'utf8', timeout: 300000 });
const m = (r.stdout || '').match(/saknas (\d+) · DOM-rader med åäö (\d+)/);
ok(m && +m[1] <= 5 && +m[2] === 0, 'genomgången av skärmarna: ' + (r.stdout || r.stderr || '').trim().split('\n').pop());
ok(!/SIDFEL/.test(r.stdout || ''), 'genomgången utan sidfel');
