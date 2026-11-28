// Renderar Effekseer-effekter bildruta för bildruta i headless Chromium (EffekseerForWebGL, wasm).
// Kör: node tools/effekseer/render.mjs [namn ...]   (läser effects.json, skriver out/raw/<namn>/000.png …)
// Miljö: EFK_CACHE = katalogen som fetch.sh fyllde (standard tools/effekseer/cache), EFK_OUT = utkatalog (standard tools/effekseer/out).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE = process.env.EFK_CACHE || path.join(HERE, 'cache');
const OUT = process.env.EFK_OUT || path.join(HERE, 'out');
const conf = JSON.parse(fs.readFileSync(path.join(HERE, 'effects.json'), 'utf8'));
const only = process.argv.slice(2);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = null;
  if (u === '/' || u === '/render.html') f = path.join(HERE, 'render.html');
  else if (u.startsWith('/rt/')) f = path.join(CACHE, 'rt', u.slice(4));
  else if (u.startsWith('/fx/')) f = path.join(CACHE, 'fx', u.slice(4));
  if (!f || !path.resolve(f).startsWith(path.resolve(f.startsWith(HERE) ? HERE : CACHE)) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await chromium.launch();
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(`http://127.0.0.1:${port}/render.html`);
await page.evaluate(() => window.efkReady);
const info = await page.evaluate(() => { const g = document.getElementById('c').getContext('webgl'); const d = g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); });
console.log('WebGL:', info);
for (const e of conf.effects) {
  if (only.length && !only.includes(e.name)) continue;
  const t0 = Date.now();
  const frames = await page.evaluate(o => window.renderEffect(o), { layers: (e.layers || [{ src: e.src, scale: e.scale }]).map(l => ({ ...l, src: '/fx/' + l.src })), size: e.size, cam: e.cam, target: e.target, fov: e.fov, frames: e.frames, step: e.step, seed: e.seed ?? 7, warm: e.warm });
  const dir = path.join(OUT, 'raw', e.name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  frames.forEach((d, i) => fs.writeFileSync(path.join(dir, String(i).padStart(3, '0') + '.png'), Buffer.from(d.split(',')[1], 'base64')));
  console.log(`${e.name}: ${frames.length} bildrutor (${Date.now() - t0} ms)`);
}
if (errs.length) console.log('Sidfel:', errs.slice(0, 5));
await browser.close(); server.close();
