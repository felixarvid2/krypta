import { createRequire } from 'module'; import { fileURLToPath } from 'url';
const __req = createRequire(import.meta.url); let __PW; for (const m of ['playwright-core', 'playwright', '/opt/node22/lib/node_modules/playwright']) { try { __PW = __req(m); break; } catch (e) { /* nästa */ } }
const { chromium, devices } = __PW; import http from 'http'; import fs from 'fs'; import path from 'path';
const SP = path.dirname(fileURLToPath(import.meta.url)) + '/', pub = new Set(); const ROOT = process.env.KRYPTA_ROOT || path.resolve(SP, '../..');
const miss = []; for (const x of JSON.parse(fs.readFileSync(SP + 'out/manifest.json', 'utf8')).remove || []) pub.delete(x);
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]).slice(1) || 'index.html';
  if (p === 'index.html') { r.setHeader('content-type', 'text/html'); return r.end(fs.readFileSync(SP + 'out/index.html')); }
  if (/^(pack\d+\.json|p-[a-z0-9]+-\d+\.(json|bin))$/.test(p) && fs.existsSync(SP + 'out/' + p)) { r.setHeader('content-type', p.endsWith('.bin') ? 'application/octet-stream' : 'application/json'); return r.end(fs.readFileSync(SP + 'out/' + p)); }
  if (pub.has(p) && fs.existsSync('' + ROOT + '/' + p)) { r.setHeader('content-type', { '.png': 'image/png', '.ogg': 'audio/ogg', '.css': 'text/css', '.txt': 'text/plain' }[path.extname(p)] || ''); return r.end(fs.readFileSync('' + ROOT + '/' + p)); }
  miss.push(p); r.statusCode = 404; r.end(); }).listen(8870);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), args: ['--use-gl=swiftshader', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const pg = await b.newPage({ viewport: { width: 960, height: 600 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
const ok = (c, m) => console.log(c ? 'OK  ' : 'FAIL', m), ev = f => pg.evaluate(f), wait = ms => pg.waitForTimeout(ms);
await pg.goto('http://localhost:8870/index.html?nolock=1&biome=tomb&seed=5'); await pg.waitForFunction('!document.getElementById("start").disabled', null, { timeout: 90000 });
await pg.screenshot({ path: SP + 'shots/art_title.png' });
const loadErr = await ev(() => { const t = document.body.innerText; const m = t.match(/FEL:[^\n]*/); return m ? m[0] : ''; });
await ev(() => { __game.profile.tutDone = true; __game.begin('new'); }); await wait(2500);
await pg.screenshot({ path: SP + 'shots/art_draft.png' });
await pg.keyboard.press('Escape'); await wait(500);
await ev(() => { const g = __game, P = g.P; for (const e of g.ents()) e.dead = true; ['Ã', 'Õ', 'Ê', 'Î', 'Ô'].forEach((k, i) => { const a = P.a + (i - 2) * 0.22; const e = g.spawnEnemy(k, P.x + Math.cos(a) * 3.2, P.y + Math.sin(a) * 3.2); e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0 }; }); });
await wait(800); await pg.screenshot({ path: SP + 'shots/art_game.png' });
ok(await ev(() => document.title.length > 0), 'sidan laddar');
ok(!loadErr, 'inget laddfel på startskärmen ' + loadErr);
ok(await ev(() => __game.state() === 'play' || __game.state() === 'ui'), 'spelet startar (' + await ev(() => __game.state()) + ')');
console.log('saknade filer:', [...new Set(miss)].join(' ') || 'inga');
ok(errs.length === 0, 'inga fel ' + errs.join(' / '));
await b.close(); srv.close();
