// Kör spelet på engelska genom de vanligaste skärmarna och skriver ut texter som fortfarande är svenska.
// node tools/i18n/coverage.mjs → tools/i18n/missing.json
import http from 'http'; import fs from 'fs'; import path from 'path'; import { createRequire } from 'module'; import { fileURLToPath } from 'url';
const req = createRequire(import.meta.url); let PW; for (const m of ['playwright-core', 'playwright', '/opt/node22/lib/node_modules/playwright']) { try { PW = req(m); break; } catch (e) { } }
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = process.env.KRYPTA_ROOT || path.resolve(HERE, '../..'), PORT = 9520 + Math.floor(Math.random() * 40);
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (fs.existsSync(f) && fs.statSync(f).isFile()) { r.setHeader('content-type', { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.css': 'text/css', '.ttf': 'font/ttf' }[path.extname(f)] || 'application/octet-stream'); return r.end(fs.readFileSync(f)); } r.statusCode = 404; r.end(); }).listen(PORT);
const b = await PW.chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined, args: ['--use-gl=swiftshader', '--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
const ev = (f, a) => pg.evaluate(f, a), wait = ms => pg.waitForTimeout(ms), click = async s => { try { await ev(s => { const e = document.querySelector(s); if (e) e.click(); }, s); await wait(350); } catch (e) { } };
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&lang=en`); await pg.waitForFunction('!document.getElementById("start").disabled', null, { timeout: 90000 }); await wait(500);
const esc = async () => { await pg.keyboard.press('Escape'); await wait(300); };
for (const s of ['#moremodesbtn', null, '#setupbtn', null, '#collbtn', null]) { if (s) await click(s); else await esc(); }
for (const s of ['#settingsbtn']) { await click(s); for (let i = 0; i < 6; i++) { await ev(i => { const t = document.querySelectorAll('.cu-tab, [data-tab]')[i]; if (t) t.click(); }, i); await wait(200); } await esc(); }
for (const s of ['#manualbtn', '#newsbtn', '#bestiary', '#achbtn', '#codexbtn', '#profilebtn', '#statsbtn', '#chroniclebtn', '#titlesbtn', '#unlocks', '#altar']) { await click('#collbtn'); await click(s); await wait(400); await esc(); await esc(); }
await ev(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = false; document.getElementById('seed').value = 'cov1'; __game.begin('new'); }); await wait(2500); await esc();
for (let i = 0; i < 25; i++) { await ev(() => { const P = __game.P; P.hp = 999; }); await pg.keyboard.down('w'); await wait(400); await pg.keyboard.up('w'); await pg.mouse.move(640 + (i % 3 - 1) * 200, 360); }
await ev(() => { const P = __game.P; for (const t of ['Y', 'Q', 'Å']) { try { __game.spawnEnemy(t, P.x + Math.cos(P.a) * 3, P.y + Math.sin(P.a) * 3); } catch (e) { } } }); await wait(3000);
await ev(() => __game.pauseMenu()); await wait(500); await esc();
await ev(() => { try { __game.gainCard(); } catch (e) { } }); await wait(800); await esc();
await ev(() => { try { __game.openShop(__game.merchants()[0] || {}); } catch (e) { } }); await wait(800); await esc();
await ev(() => { try { __game.talentPick(() => { }); } catch (e) { } }); await wait(800); await esc();
await ev(() => { try { __game.floorDone(); } catch (e) { } }); await wait(4000); await click('#nextbtn'); await wait(3000); await esc();
await ev(() => { try { __game.run().cause = 'SKELETT'; __game.hurtPlayer(9999); } catch (e) { } }); await wait(3500);
const miss = await ev(() => [...I18N.missing]);
const dom = await ev(() => document.body.innerText.split('\n').filter(l => /[ÅÄÖåäö]/.test(l)));
fs.writeFileSync(path.join(HERE, 'missing.json'), JSON.stringify({ miss, dom }, null, 1));
console.log('saknas', miss.length, '· DOM-rader med åäö', dom.length, errs.length ? '· SIDFEL ' + errs.join(' | ') : '· inga sidfel');
await b.close(); srv.close();
