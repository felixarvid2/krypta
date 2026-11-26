// t124: version 26A – pekskärmen. Kontroller via pekknapparna (pointer-händelser på .tb-knapparna, som en telefon): ALT med
// myntkortet och pistolen kastar ett mynt per tryck (ALT slår annars av och på siktet, så två tryck = två mynt) och ALT-knappen
// lyser inte kvar; RUSA i luften med spaken släppt blir markslag (stötvåg på skelettet bredvid); RUSA på marken är vanlig rusning.
// Inga sidfel. Väntetider i speltid (__game.roles.t()).
import { setup } from './head.mjs';
const PORT = 9824;
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/t124');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });

const sceneFn = o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = true; g.settings.toggleAim = false;
  const W = 16, H = 13, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[6][6] = 'P'; grid[1][W - 2] = 'x'; grid[6][8] = 'S';
  g.playCustom({ grid, biome: 'dungeon' });
  for (const e of g.ents()) { e.d = { ...e.d, dmg: 0, speed: 0 }; e.base = { speed: 0, cd: e.d.cd }; e.hp = e.maxHp = 500; }
  g.P.hp = 1e6; g.P.stam = 1; clearInterval(window.__hold); window.__pin = [g.P.x, g.P.y];
  window.__hold = setInterval(() => { __game.P.hp = 1e6; if (window.__pin) { __game.P.x = window.__pin[0]; __game.P.y = window.__pin[1]; } }, 30);
  g.projectiles().length = 0; g.v26a.reset(); g.P.weapon = 0; g.WS.state = 'idle'; g.P.a = 0; g.setMouse(false, false);
  if (o.card) g.gainCard(Cards.byId('skarpskyttens_mynt'));
};
const scene = o => pg.evaluate(sceneFn, o);
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(50); } };
const gwait = sec => until(null, sec);
// ett tryck på en pekknapp: pointerdown och pointerup på knappen (som ett finger)
const tap = act => ev(act => { const b = document.querySelector(`.tb[data-act="${act}"]`); if (!b) return false; const o = { pointerId: 1, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true, clientX: 10, clientY: 10 };
  b.dispatchEvent(new PointerEvent('pointerdown', o)); b.dispatchEvent(new PointerEvent('pointerup', o)); return true; }, act);

// 1) ALT med myntkortet: två tryck = två mynt, siktet går inte in och ALT lyser inte kvar
await scene({ card: true }); await gwait(0.4);
const okTap = await tap('aim'); await gwait(0.12); await tap('aim'); await gwait(0.12);
const a1 = await ev(() => ({ throws: __game.v26a.st().throws, aim: +__game.WS.aim.toFixed(2), lit: document.querySelector('.tb[data-act="aim"]').classList.contains('lit') }));
ok(okTap && a1.throws === 2 && a1.aim === 0 && !a1.lit, `pekskärm: två tryck på ALT = två mynt ${JSON.stringify(a1)}`);

// 1b) ALT stod på medan ett annat vapen siktade; byt till pistolen: nästa tryck på ALT blir ett mynt (inget dött tryck)
await scene({ card: true }); await gwait(0.4);
await ev(() => { const g = __game, w = g.WEAPONS.findIndex(w => w.id === 'smg'); g.P.has[w] = true; g.P.weapon = w; g.WS.state = 'idle'; });
await tap('aim'); await gwait(0.3);
const b0 = await ev(() => +__game.WS.aim.toFixed(2));
await ev(() => { __game.P.weapon = 0; __game.WS.state = 'idle'; }); await gwait(0.15);
await tap('aim'); await gwait(0.12);
const b1 = await ev(() => ({ throws: __game.v26a.st().throws }));
ok(b0 > 0.8 && b1.throws === 1, `byte till pistolen med siktet på: första trycket på ALT kastar (sikte före bytet ${b0}) ${JSON.stringify(b1)}`);

// 2) utan kortet slår ALT på siktet som förut
await scene({ card: false }); await gwait(0.4);
await tap('aim'); await gwait(0.4);
const a2 = await ev(() => ({ throws: __game.v26a.st().throws, aim: +__game.WS.aim.toFixed(2) }));
await tap('aim'); await gwait(0.2);
ok(a2.throws === 0 && a2.aim > 0.8, `pekskärm utan kortet: ALT siktar ${JSON.stringify(a2)}`);

// 3) RUSA i luften med spaken släppt: markslag
await scene({ card: false }); await gwait(0.4);
const r3 = await ev(() => new Promise(res => { const g = __game, P = g.P; P.jz = 0.001; P.jv = 3.4; let done = false; const t0 = g.roles.t();
  const k = () => { if (!done && P.jz > 0.3) { done = true; const b = document.querySelector('.tb[data-act="dash"]'), o = { pointerId: 1, bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true, clientX: 10, clientY: 10 };
      b.dispatchEvent(new PointerEvent('pointerdown', o)); b.dispatchEvent(new PointerEvent('pointerup', o)); }
    if (done && P.jz <= 0) return res({ slams: g.v26a.st().slams, lands: g.v26a.st().slamLands, hits: g.v26a.st().slamHits, hp: g.ents().map(e => +e.hp.toFixed(1)) });
    if (g.roles.t() - t0 > 3) return res({ timeout: true }); requestAnimationFrame(k); };
  requestAnimationFrame(k); }));
ok(r3.slams === 1 && r3.lands === 1 && r3.hits === 1 && r3.hp[0] < 500, `pekskärm: RUSA i luften blir markslag ${JSON.stringify(r3)}`);

// 4) RUSA på marken: vanlig rusning (inget markslag)
await scene({ card: false }); await gwait(0.4); await ev(() => { window.__pin = null; });
await tap('dash');
const r4 = await ev(() => ({ slams: __game.v26a.st().slams, v: +Math.hypot(__game.P.vx, __game.P.vy).toFixed(1) }));
ok(r4.slams === 0 && r4.v > 6, `pekskärm: RUSA på marken är vanlig rusning ${JSON.stringify(r4)}`);

await done();
