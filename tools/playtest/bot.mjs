// Spelrobot: spelar rundor automatiskt (gudläge) och samlar fel, fastlåsningar och bildfrekvens.
// node bot.mjs <minuter> [extra-query, t.ex. "&biome=crystal"] [läge: new|abyss|hunt]
import { setup } from './head.mjs';
const MIN = +(process.argv[2] || 3), Q = process.argv[3] || '', MODE = process.argv[4] || 'new';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, errs, ev, wait, shot, done } = await setup(PORT, 'out/bot');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1${Q}`);
await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(MODE => {
  const g = __game; g.profile.tutDone = true; g.profile.runs = Math.max(3, g.profile.runs);
  const B = window.__bot = { floors: 0, runs: 0, stuck: [], biomes: {}, bosses: {}, frames: 0, slow: 0, worst: 0, lastFloorT: performance.now(), floorKey: '', weaponsUsed: {}, talents: 0, cards: 0 };
  let last = performance.now();
  const raf = () => { const t = performance.now(), d = t - last; last = t; if (g.state() === 'play') { B.frames++; if (d > 50) B.slow++; B.worst = Math.max(B.worst, d); } requestAnimationFrame(raf); }; requestAnimationFrame(raf);
  const startRun = () => { B.runs++; if (MODE === 'abyss') g.beginAbyss(); else if (MODE === 'hunt') g.beginBossHunt(); else g.begin('new'); };
  startRun();
  let fireOn = false, wT = 0, tpT = 0;
  const down = () => { if (!fireOn) { fireOn = true; g.canvasDown ? g.canvasDown() : document.querySelector('canvas').dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true })); } };
  const up = () => { if (fireOn) { fireOn = false; window.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true })); } };
  setInterval(() => {
    try {
      const st = g.state();
      if (window.CardUI && CardUI.isOpen()) { up(); const el = document.querySelector('.cu-talent, .cu-tcard, .cu-card:not(.owned), .cu-opt, .cu-item:not(.sold), .cu-li[role=button], .cu-btn'); if (el) { if (el.closest('.cu-talents, [class*=talent]')) B.talents++; else B.cards++; el.click(); } else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })); return; }
      if (st === 'stats') { g.nextFloor(); return; }
      if (st === 'dead' || st === 'runover') { up(); g.showTitle(); setTimeout(startRun, 300); return; }
      if (st === 'pause') { g.resume && g.resume(); return; }
      if (st !== 'play') return;
      const P = g.P, run = g.run(), lvl = g.lvl(), key = run.depth + ':' + (lvl && lvl.name);
      if (key !== B.floorKey) { B.floorKey = key; B.floors++; B.lastFloorT = performance.now(); B.biomes[lvl.biome || '?'] = (B.biomes[lvl.biome || '?'] || 0) + 1; if (g.boss()) B.bosses[g.boss().id] = (B.bosses[g.boss().id] || 0) + 1;
        for (let i = 0; i < g.WEAPONS.length; i++) P.has[i] = true; for (const k in P.ammo) P.ammo[k] = 999; P.battery = 100; }
      for (const k of ['harpoons', 'crystals', 'knives', 'balls', 'p9', 'shells', 'r556', 'nails', 'arrows', 'bolts', 'flares', 'fuel', 'lgren', 'gears', 'spores']) if (P.ammo[k] !== undefined) P.ammo[k] = 999;
      if (performance.now() - B.lastFloorT > 150000) { B.stuck.push(key); B.stuckInfo = { kills: g.kills ? g.kills() : 0, portals: g.portals().length, boss: !!g.boss(), foes: g.ents().filter(e => !e.dead).map(e => [e.type, Math.round(e.hp), e.hidden ? 'H' : '', e.dormant ? 'D' : '', e.alert ? 'A' : '', e.guardian ? 'G' : '', e.asleep ? 'S' : '', g.voidAt(e.x, e.y) ? 'V' : '', g.solid(e.x, e.y) ? 'W' : '', e.decoy ? 'DEC' : '', e.feud ? 'F' : '', e.staggerT > 0 ? 'ST' : ''].join(' ')).slice(0, 12), lvl: g.lvl().name, P: { x: +P.x.toFixed(1), y: +P.y.toFixed(1), jz: +P.jz.toFixed(2), launch: !!P.launch, fallT: P.fallT, slide: P.slide, hp: P.hp, w: g.WEAPONS[P.weapon].id, ws: g.WS.state, cd: +g.WS.cd.toFixed(2), mag: P.mags[P.weapon], block: g.WS.block, reverse: P.reverseT, root: P.rootT }, near: g.ents().filter(e => !e.dead).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y)).slice(0, 3).map(e => [e.type, +Math.hypot(e.x - P.x, e.y - P.y).toFixed(1), g.hasLOS(P.x, P.y, e.x, e.y)]) }; g.killAllCheat(); B.lastFloorT = performance.now(); }
      if (g.arenasRef) { B.arS = B.arS || {}; B.arD = B.arD || {}; B.arN = B.arN || {}; g.arenasRef().forEach((A, i) => { const id = key + '#' + i; B.arN[id] = 1; if (A.state !== 'idle') B.arS[id] = 1; if (A.state === 'done') B.arD[id] = 1; }); }
      wT -= 0.1; if (wT <= 0) { wT = 6; const i = (Math.random() * g.WEAPONS.length) | 0; g.switchWeapon(i); B.weaponsUsed[g.WEAPONS[i].id] = 1; }
      if (Math.random() < 0.02) { g.toggleLamp(); } if (Math.random() < 0.01) g.throwStone(); if (Math.random() < 0.02) document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
      const foes = g.ents().filter(e => !e.dead && !e.dying && !e.hidden && !e.dormant && !e.ally);
      foes.sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y));
      const vis = foes.find(e => g.hasLOS(P.x, P.y, e.x, e.y));
      if (vis) { P.a = Math.atan2(vis.y - P.y, vis.x - P.x); down(); if (Math.random() < 0.3) up(); }
      else up();
      tpT -= 0.1;
      const portal = g.portals()[0];
      if (portal && (!vis || Math.random() < 0.05) && portal.t > 1) { up(); g.enterPortal(portal); return; }
      const dest = vis ? null : foes[0] || portal || null;
      if (dest && tpT <= 0) { tpT = 1.2; for (let k = 0; k < 30; k++) { const a = Math.random() * 6.283, r = 1.2 + Math.random() * 1.5, x = dest.x + Math.cos(a) * r, y = dest.y + Math.sin(a) * r; if (g.freeSpot(x, y, 0.3) && !(g.voidAt && g.voidAt(x, y)) && !(g.deepAt && g.deepAt(x, y))) { P.x = x; P.y = y; break; } } if (portal && dest === portal) { P.x = portal.x; P.y = portal.y; } }
      if (!foes.length && !portal && tpT <= 0) { tpT = 2; g.killAllCheat(); }
    } catch (e) { (window.__botErr = window.__botErr || []).push(String(e.stack || e).slice(0, 300)); }
  }, 100);
}, MODE);
const t0 = Date.now();
while (Date.now() - t0 < MIN * 60000) {
  await wait(15000);
  const s = await ev(() => { const B = window.__bot; return { floors: B.floors, runs: B.runs, biomes: B.biomes, bosses: B.bosses, stuck: B.stuck, arenas: [Object.keys(B.arN || {}).length, Object.keys(B.arS || {}).length, Object.keys(B.arD || {}).length], slowPct: B.frames ? +(100 * B.slow / B.frames).toFixed(1) : 0, worst: Math.round(B.worst), state: __game.state(), depth: __game.run() && __game.run().depth, lvl: __game.run() && __game.run().lvl, botErr: (window.__botErr || []).slice(-3), stuckInfo: B.stuckInfo }; });
  console.log(new Date().toISOString().slice(11, 19), JSON.stringify(s));
  if (errs.length) console.log('SIDFEL:', errs.slice(-5).join('\n'));
}
await shot('bot_end');
const W = await ev(() => Object.keys(window.__bot.weaponsUsed).length);
console.log('vapen provade:', W, 'talangval:', await ev(() => window.__bot.talents), 'kortval:', await ev(() => window.__bot.cards));
await done();
