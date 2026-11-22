// felinjektion för artefaktens laddare: ett paket som fallerar en gång (omförsöket ska rädda det) och ett som alltid fallerar
import { createRequire } from 'module'; import { fileURLToPath } from 'url';
const __req = createRequire(import.meta.url); let __PW; for (const m of ['playwright-core', 'playwright', '/opt/node22/lib/node_modules/playwright']) { try { __PW = __req(m); break; } catch (e) { /* nästa */ } }
const { chromium, devices } = __PW; import http from 'http'; import fs from 'fs'; import path from 'path';
const SP = path.dirname(fileURLToPath(import.meta.url)) + '/', ART = SP + 'out/';
const ROOT = process.env.KRYPTA_ROOT || path.resolve(SP, '../..');
const packs = JSON.parse(fs.readFileSync(ART + 'manifest.json', 'utf8')).packs, victim = packs[2];
let mode = 'once', hits = {};
const srv = http.createServer((q, r) => { const p = decodeURIComponent(q.url.split('?')[0]).slice(1) || 'index.html';
  if (p === 'index.html') { r.setHeader('content-type', 'text/html'); return r.end(fs.readFileSync(ART + 'index.html')); }
  if (packs.includes(p)) { hits[p] = (hits[p] || 0) + 1;
    if (p === victim && (mode === 'always' || (mode === 'once' && hits[p] === 1))) { r.statusCode = 503; return r.end('nej'); }
    if (p === victim && mode === 'trunc') { r.setHeader('content-type', 'application/octet-stream'); return r.end(fs.readFileSync(ART + p).subarray(0, 1000)); }
    r.setHeader('content-type', 'application/json'); return r.end(fs.readFileSync(ART + p)); }
  r.statusCode = 404; r.end(); }).listen(8872);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), args: ['--no-sandbox', '--use-gl=swiftshader'] });
const ok = (c, m) => console.log(c ? 'OK  ' : 'FAIL', m);
for (mode of ['once', 'always', 'trunc']) {
  hits = {}; const ctx = await b.newContext({ ...devices['Pixel 7'], deviceScaleFactor: 1 }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8872/index.html?nolock=1');
  if (mode === 'once') {
    await pg.waitForFunction('!document.getElementById("start").disabled', null, { timeout: 120000 });
    ok(hits[victim] === 2, `once: ${victim} hämtades ${hits[victim]} gånger (väntat 2)`);
    ok(await pg.evaluate(() => Object.keys(__INL).length) > 2700 && errs.length === 0, 'once: allt laddat utan sidfel');
  } else {
    await pg.waitForFunction('/FEL:/.test(document.getElementById("status").textContent)', null, { timeout: 120000 }); await pg.waitForTimeout(500);
    const t = await pg.evaluate(() => document.getElementById('status').textContent);
    await pg.screenshot({ path: SP + `pw/out/fail_${mode}.png` });
    ok(t.includes(victim) && /ladda om/i.test(t), `${mode}: meddelandet namnger paketet och säger ladda om: "${t}"`);
    ok(await pg.evaluate(() => document.getElementById('start').disabled && typeof window.__game === 'undefined'), `${mode}: start inaktiv, spelets skript har inte körts`);
    ok(hits[victim] === 2, `${mode}: ett omförsök (${hits[victim]} hämtningar)`);
  }
  await ctx.close();
}
await b.close(); srv.close();
