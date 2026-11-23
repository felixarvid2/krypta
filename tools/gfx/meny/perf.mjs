// MENY: mäter skriptets tid per bildruta (requestAnimationFrame-anropen) på startskärmen och i spelet,
// med 4× CPU-strypning (ungefär en mellantelefon). Jämför före/efter med GAME_JS=<gammal game.js>.
// node ../gfx/meny/perf.mjs [port]   (cwd: tools/playtest)
import { setup } from '../../playtest/head.mjs';
const PORT = +(process.argv[2] || 9618);
const { pg, ev, wait, done } = await setup(PORT, 'out/meny_perf');
await pg.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.__rafMs = []; window.requestAnimationFrame = cb => raf(t => { const t0 = performance.now(); try { cb(t); } finally { if (window.__rafOn) window.__rafMs.push(performance.now() - t0); } }); });
const measure = async ms => { await ev(() => { window.__rafMs = []; window.__rafOn = true; }); await wait(ms); return ev(() => { window.__rafOn = false; const a = window.__rafMs.slice().sort((x, y) => x - y), n = a.length, avg = a.reduce((s, v) => s + v, 0) / Math.max(1, n); return { n, avg: +avg.toFixed(2), p95: +(a[Math.floor(n * 0.95)] || 0).toFixed(2), max: +(a[n - 1] || 0).toFixed(1) }; }); };
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`, { timeout: 120000 }); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 120000 });
const cdp = await pg.context().newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); // strypningen efter laddningen
await ev(() => { __game.profile.tutDone = true; localStorage.removeItem('krypta.run'); }); await wait(2500);
const title = await measure(4000), meny = await ev(() => window.__game.meny ? __game.meny.title() : null);
await ev(() => { document.getElementById('seed').value = 'perf'; __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(1000);
await ev(() => { if (window.CardUI && CardUI.isOpen()) CardUI.close(); __game.resume && __game.resume(); }); await wait(4000);
const play = await measure(5000);
console.log(JSON.stringify({ title, play, titleLive: meny && { on: meny.on, cost: +meny.cost.toFixed(2), genMs: Math.round(meny.genMs), why: meny.why } }));
await done();
