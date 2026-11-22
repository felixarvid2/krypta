// artefakten på en emulerad telefon: allt ur paketen, inget från repot
// THROTTLE=1: mät laddningen med 4x CPU-strypning och 20 Mbit/s / 40 ms (bara porträtt), skärmbilder under laddningen
import { createRequire } from 'module'; import { fileURLToPath } from 'url';
const __req = createRequire(import.meta.url); let __PW; for (const m of ['playwright-core', 'playwright', '/opt/node22/lib/node_modules/playwright']) { try { __PW = __req(m); break; } catch (e) { /* nästa */ } }
const { chromium, devices } = __PW; import http from 'http'; import fs from 'fs'; import path from 'path';
const SP = path.dirname(fileURLToPath(import.meta.url)) + '/', miss = [], served = [];
const ROOT = process.env.KRYPTA_ROOT || path.resolve(SP, '../..');
const TH = !!process.env.THROTTLE, TAG = process.env.TAG || 'run', ART = SP + (process.env.ART || 'out') + '/', NOSHOT = !!process.env.NOSHOT;
const PACK = /^(pack\d+\.json|p-[a-z0-9-]+\.(json|bin))$/;
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]).slice(1) || 'index.html';
  if (p === 'index.html') { r.setHeader('content-type', 'text/html'); return r.end(fs.readFileSync(ART + 'index.html')); }
  if (PACK.test(p) && fs.existsSync(ART + p)) { served.push(p); r.setHeader('content-type', p.endsWith('.bin') ? 'application/octet-stream' : 'application/json'); return r.end(fs.readFileSync(ART + p)); }
  miss.push(p); r.statusCode = 404; r.end(); }).listen(8871);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), args: ['--use-gl=swiftshader', '--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info'] });
const ok = (c, m) => console.log(c ? 'OK  ' : 'FAIL', m);
const nFiles = JSON.parse(fs.readFileSync(ART + 'manifest.json', 'utf8')).nfiles || 2707;
for (const [name, landscape] of (TH ? [['portratt', false]] : [['portratt', false], ['liggande', true]])) {
  const dev = devices['Pixel 7']; const vp = landscape ? { width: dev.viewport.height, height: dev.viewport.width } : dev.viewport;
  const ctx = await b.newContext({ ...dev, viewport: vp, deviceScaleFactor: 1 }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const ev = f => pg.evaluate(f), wait = ms => pg.waitForTimeout(ms);
  let cdp, t0, samples = [], stop = false;
  if (TH) {
    cdp = await ctx.newCDPSession(pg); await cdp.send('Network.enable'); await cdp.send('Performance.enable');
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 20e6 / 8, uploadThroughput: 5e6 / 8 });
  }
  t0 = Date.now();
  if (TH) { // provtagning under laddningen: skärmbild + heap + statustext, utan att vänta på varandra
    (async () => { let i = 0; while (!stop) { const t = Date.now() - t0; const rec = { t };
      const shot = NOSHOT ? Promise.resolve() : pg.screenshot({ path: SP + `pw/out/load_${TAG}_${String(i).padStart(2, '0')}.png`, timeout: 4000 }).then(() => rec.shot = Date.now() - t0).catch(() => rec.shot = 'timeout');
      const st = pg.evaluate(() => ({ s: (document.getElementById('status') || {}).textContent || '', p: (document.getElementById('kpload') || {}).textContent || '', h: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : -1, kp: window.__kpTime })).then(x => Object.assign(rec, x)).catch(() => rec.s = '(svarar ej)');
      await Promise.race([Promise.all([shot, st]), new Promise(r => setTimeout(r, 4500))]); samples.push(rec); i++; await new Promise(r => setTimeout(r, 1500)); } })();
  }
  await pg.goto('http://localhost:8871/index.html?nolock=1', { waitUntil: 'commit', timeout: 300000 });
  await pg.waitForFunction('document.getElementById("start") && !document.getElementById("start").disabled', null, { timeout: 300000, polling: 200 });
  const tReady = Date.now() - t0; stop = true;
  if (TH) {
    const m = await cdp.send('Performance.getMetrics'); const g = k => Math.round((m.metrics.find(x => x.name === k) || {}).value / 1e6);
    const heap = await ev(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : -1);
    const nav = await ev(() => { const n = performance.getEntriesByType('navigation')[0]; return n ? { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) } : {}; });
    const res = { tag: TAG, tReadyMs: tReady, packsDoneMs: await ev(() => window.__kpTime), nav, heapUsedMB: heap, cdpJSHeapUsedMB: g('JSHeapUsedSize'), cdpJSHeapTotalMB: g('JSHeapTotalSize'), samples };
    console.log(JSON.stringify(res, null, 1)); fs.writeFileSync(SP + `pw/out/measure_${TAG}.json`, JSON.stringify(res, null, 1));
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  }
  await wait(800); await pg.screenshot({ path: SP + `pw/out/m_${name}_title.png` });
  const loadErr = await ev(() => { const m = document.body.innerText.match(/FEL:[^\n]*/); return m ? m[0] : ''; });
  ok(!loadErr, name + ': inget laddfel ' + loadErr);
  ok(await ev(() => Object.keys(window.__INL || {}).length) === nFiles, name + ': alla ' + nFiles + ' filer ur paketen (' + await ev(() => Object.keys(window.__INL || {}).length) + ')');
  ok(await ev(() => matchMedia('(pointer: coarse)').matches), name + ': pekskärm');
  await ev(() => { __game.profile.tutDone = true; __game.begin('new'); }); await wait(2500);
  await pg.keyboard.press('Escape'); await wait(1500);
  await pg.screenshot({ path: SP + `pw/out/m_${name}_game.png` });
  ok(await ev(() => __game.state()) === 'play', name + ': spelet startar (' + await ev(() => __game.state()) + ')');
  ok(errs.length === 0, name + ': inga sidfel ' + errs.slice(0, 3).join(' / '));
  await ctx.close();
}
const real = [...new Set(miss)].filter(p => fs.existsSync('' + ROOT + '/' + p));
ok(real.length === 0, 'inga filer som finns i repot saknas ' + real.join(' '));
console.log('paket hämtade:', served.length, [...new Set(served)].length, 'unika');
await b.close(); srv.close();
