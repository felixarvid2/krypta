// t174: version 29 (SPEL), mätning med 4× CPU-strypning: hela spelslingan per bildruta (tiden i requestAnimationFrame-anropen: update och render)
// på samma vanliga bana (fast frö, djup 3, fienderna rör sig) och på en blodvåning (djup 8: blodaltaret, blodfursten och dess pölar i version 29),
// med den gamla js/game.js (före version 29, GAME_JS = T174_OLD eller git show c4d6a0d:js/game.js) och den nya, omväxlande två gånger var.
// Kravet: den nya är inte märkbart långsammare på den vanliga banan (median högst +10 % + 0,3 ms). Skriver out/t174/res.json.
import { setup } from './head.mjs';
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const PORT = 9874, OUT = process.env.S29_OUT || 'out/t174', N = +(process.env.T174_N || 240);
const old = (() => { const p = process.env.T174_OLD || path.resolve(OUT, 'game_c4d6a0d.js'); if (fs.existsSync(p)) return p; try { const root = process.env.KRYPTA_ROOT || path.resolve('../..'); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, execFileSync('git', ['show', 'c4d6a0d:js/game.js'], { cwd: root, maxBuffer: 1 << 27 })); return p; } catch (e) { return null; } })();
const { pg, ev, wait, ok, done } = await setup(PORT, OUT);
pg.setDefaultNavigationTimeout(120000); pg.setDefaultTimeout(120000);
const cdp = await pg.context().newCDPSession(pg);
await pg.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.__rafT = []; window.requestAnimationFrame = cb => raf(t => { const t0 = performance.now(); try { cb(t); } finally { if (window.__rafOn) window.__rafT.push(performance.now() - t0); } }); });
const load = async () => { await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled'); await ev(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; Object.assign(__game.settings, { autoLowFx: false, lowfx: false, rendering: 'cpu' }); __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(600); };
const measure = async () => { await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await wait(500); await ev(() => { window.__rafT = []; window.__rafOn = true; });
  const w0 = Date.now(); while ((await ev(() => window.__rafT.length)) < N && Date.now() - w0 < 90000) await wait(250);
  const t = await ev(() => { window.__rafOn = false; return window.__rafT.slice(); }); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  t.sort((a, b) => a - b); return { n: t.length, med: +t[t.length >> 1].toFixed(2), p90: +t[Math.floor(t.length * 0.9)].toFixed(2) }; };
const scene = kind => ev(kind => { const g = __game; clearInterval(window.__hold); window.__hold = setInterval(() => { const P = __game.P; P.hp = 1e6; P.iframe = 1; }, 100);
  if (kind === 'vanlig') { g.run().depth = 3; g.startLevel(Gen.floor('t174-vanlig', 3, { biome: 'dungeon', v28: { blood: false } })); }
  else { if (g.v28g) g.v28g.force(8, { blood: true }); g.run().depth = 8; g.startLevel(Gen.floor('t174-blod', 5, { biome: 'abattoir', v28: { blood: true } })); }
  g.resume && g.resume(); for (const e of g.ents()) e.alert = true; // (alla larmade: fienderna och fursten rör sig)
  const s = g.s29 ? g.s29.state() : null; return { s29: !!s, boss: !!(s && s.boss), altar: !!(s && s.altar), ents: g.ents().length }; }, kind);
const res = {};
const one = async (tag, file) => { if (file) process.env.GAME_JS = file; else delete process.env.GAME_JS; await load();
  for (const kind of ['vanlig', 'blod']) { const info = await scene(kind); await wait(800); if (kind === 'blod' && info.boss) await ev(() => { const S = __game.s29; for (let i = 0; i < 4; i++) S.pool(); }); // (fyra pölar)
    const m = await measure(); (res[kind] = res[kind] || {})[tag] = (res[kind][tag] || []).concat([{ ...m, ...info }]); console.log('INFO', tag, kind, JSON.stringify({ ...m, ...info })); } };
for (let r = 0; r < 2; r++) { if (old) await one('före', old); await one('efter', null); }
delete process.env.GAME_JS;
fs.writeFileSync(path.join(OUT, 'res.json'), JSON.stringify(res, null, 1));
const med = a => a ? a.map(o => o.med).sort((x, y) => x - y)[0] : null; // (bästa av två: minst störd av andra prov)
const v = res.vanlig;
if (v['före']) ok(med(v['efter']) <= med(v['före']) * 1.1 + 0.3, `vanlig bana, 4× strypning: median per bildruta före ${med(v['före'])} ms, efter ${med(v['efter'])} ms`);
else ok(false, 'den gamla js/game.js saknas: ingen jämförelse');
const b = res.blod; console.log('INFO', `blodvåning (fursten och fyra pölar efter), median före ${med(b['före'])} ms, efter ${med(b['efter'])} ms`);
ok(b['efter'].every(o => o.boss && o.altar), 'blodvåningen i mätningen har blodfursten och altaret');
await done();
