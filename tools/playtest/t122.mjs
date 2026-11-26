// t122: version 26A – MARKSLAG (reserv 8). Kontroller: hopp + ducka (Ctrl) i luften slår ned mot golvet: spelaren landar snabbare än
// ett vanligt fall; stötvågen (radie 2,2) skadar och bedövar alla tre skeletten runt spelaren, ger '+MARKSLAG' och kostar uthållighet;
// hopp inom 0,15 s efter landningen blir ett studshopp (1,45× hopp), ett senare hopp är ett vanligt hopp; utan uthållighet blir det
// inget markslag; med __game.v26a.set('slam', false) är ducka i luften som förut (ingen skada, vanligt fall). Inga sidfel.
// Väntetider i speltid (__game.roles.t()).
import { setup } from './head.mjs';
const PORT = 9822;
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/t122');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) cerr.push(m.text().slice(0, 160)); });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
ok(await ev(() => !!__game.v26a && __game.v26a.state().slam === true), 'markslaget är på som standard');

const sceneFn = o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = true;
  const W = 14, H = 13, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[6][6] = 'P'; grid[1][W - 2] = 'x'; for (const [x, y] of [[8, 6], [6, 8], [5, 5]]) grid[y][x] = 'S';
  g.playCustom({ grid, biome: 'dungeon' });
  const E = g.ents(), spec = E.filter(e => !e.boss).map(e => [e.type, e.x, e.y]); E.length = 0;
  for (const [t, x, y] of spec) g.spawnEnemy(t, x, y);
  for (const e of E) { e.d = { ...e.d, dmg: 0, speed: 0 }; e.base = { speed: 0, cd: e.d.cd }; e.hp = e.maxHp = 500; }
  g.P.hp = 1e6; g.P.stam = o.stam ?? 1; clearInterval(window.__hold); window.__pin = [g.P.x, g.P.y];
  window.__hold = setInterval(() => { __game.P.hp = 1e6; if (window.__pin) { __game.P.x = window.__pin[0]; __game.P.y = window.__pin[1]; } }, 30);
  g.v26a.reset(); g.v26a.set('slam', o.slam !== false); g.keys.ControlLeft = false;
};
const scene = o => pg.evaluate(sceneFn, o);
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(60); } };
const gwait = sec => until(null, sec);
// i sidan: hoppa (som jump()), tryck Ctrl när spelaren är 0,3 upp på väg uppåt (crouch: true), vänta på landningen; jumpAfter: tryck
// mellanslag så många sekunder speltid efter landningen
const run = o => ev(o => new Promise(res => { const g = __game, P = g.P; P.jz = 0.001; P.jv = 3.4; let pressed = false, t0 = 0, tJ = g.roles.t(), land = null, maxZ = 0; const stam0 = P.stam;
  const k = () => { const t = g.roles.t(); maxZ = Math.max(maxZ, P.jz);
    if (!pressed && P.jz > 0.3 && P.jv > 0) { pressed = true; t0 = t; if (o.crouch) g.keys.ControlLeft = true; }
    if (pressed && !land && P.jz <= 0) { g.keys.ControlLeft = false; land = { t: +(t - t0).toFixed(3), total: +(t - tJ).toFixed(3), stun: g.ents().map(e => +(e.stun || 0).toFixed(2)), hp: g.ents().map(e => +e.hp.toFixed(1)), stam: +(stam0 - P.stam).toFixed(2), slam: g.v26a.st().slamLands, tL: t };
      if (o.jumpAfter === undefined) return res(land); }
    if (land && o.jumpAfter !== undefined && t - land.tL >= o.jumpAfter) { dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' })); dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ' }));
      const jv = P.jv; return res({ ...land, jv: +jv.toFixed(2), bounces: g.v26a.st().bounces }); }
    if (t - tJ > 3) return res({ timeout: true, land }); requestAnimationFrame(k); };
  requestAnimationFrame(k); }), o);

// 0) referens: vanligt hopp utan ducka – tiden från 0,3 upp till landning
await scene({}); await gwait(0.5);
const ref = await run({ crouch: false });
ok(ref && !ref.timeout && ref.hp.every(h => h === 500), `vanligt hopp: ${ref.t} s från 0,3 upp till golvet, ingen skada ${JSON.stringify(ref)}`);

// 1) markslag: snabbare ned, tre skelett skadas och bedövas
await scene({}); await gwait(0.5);
const s1 = await run({ crouch: true });
const st1 = await ev(() => ({ ...__game.v26a.st(), log: undefined }));
ok(s1 && !s1.timeout && s1.t < ref.t * 0.6, `markslaget landar på ${s1.t} s mot ${ref.t} s för ett vanligt fall`);
ok(s1.hp.every(h => h < 500) && s1.stun.every(s => s > 0.5) && st1.slamHits === 3, `stötvågen skadar (${s1.hp}) och bedövar (${s1.stun}) alla tre skeletten ${JSON.stringify(st1)}`);
ok(s1.stam >= 0.2, `markslaget kostar uthållighet (${s1.stam})`);
ok(await ev(() => __game.styleRef().feed.some(f => f.t === '+MARKSLAG')), 'stilmätaren visar +MARKSLAG');

// 2) studshopp: hopp direkt efter landningen ger 1,45× hopp
await scene({}); await gwait(0.5);
const s2 = await run({ crouch: true, jumpAfter: 0.02 });
ok(s2 && s2.bounces === 1 && Math.abs(s2.jv - 3.4 * 1.45) < 0.15, `studshopp direkt efter markslaget: jv ${s2.jv} ${JSON.stringify(s2)}`);
await gwait(1.2);

// 3) ett hopp 0,4 s efter landningen är ett vanligt hopp
await scene({}); await gwait(0.5);
const s3 = await run({ crouch: true, jumpAfter: 0.4 });
ok(s3 && s3.bounces === 0 && Math.abs(s3.jv - 3.4) < 0.15, `senare hopp är vanligt: jv ${s3.jv}, studshopp ${s3.bounces}`);
await gwait(1.2);

// 4) utan uthållighet: inget markslag
await scene({ stam: 0.15 }); await gwait(0.1); await ev(() => { __game.P.stam = 0.15; });
const s4 = await run({ crouch: true });
ok(s4 && s4.slam === 0 && s4.hp.every(h => h === 500), `utan uthållighet blir det inget markslag ${JSON.stringify(s4)}`);

// 5) av: ducka i luften gör inget, fallet är vanligt
await scene({ slam: false }); await gwait(0.5);
const s5 = await run({ crouch: true });
ok(s5 && s5.slam === 0 && s5.hp.every(h => h === 500) && s5.t > ref.t * 0.85, `av: vanligt fall (${s5.t} s) och ingen skada ${JSON.stringify(s5)}`);
await ev(() => __game.v26a.set('slam', true));

// 6) med effekterna på (inte lowfx): fartlinjer och dammring – inga fel
await scene({}); await ev(() => { __game.settings.lowfx = false; }); await gwait(0.5);
const s6 = await run({ crouch: true }); await gwait(0.3);
ok(s6 && s6.slam === 1 && cerr.length === 0, `utan lowfx: markslaget utan fel (konsolfel ${JSON.stringify(cerr)})`);
await pg.screenshot({ path: 'out/t122/markslag_fx.png' });

await done();
