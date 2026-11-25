// t114: fienderoller version 25 (R25) ovanpå AI24. Kontroller: SKÖLDVAKTEN ställer sig mellan spelaren och skytten (på linjen,
// 0,5–1,7 rutor framför skytten), skölden tar spelarens skott och truppens skott går igenom vakten; vakten bryter formationen när
// skytten dör. BEFÄLHAVAREN väljs (en per trupp), fanan ritas, truppen inom 6 rutor får +15 % fart och 15 % kortare nedkylning och
// flyr inte; när den dör tvekar truppen, bonusen försvinner och den svagaste flyr. GRANATKASTAREN kastar mot den senast kända
// platsen (inte där spelaren faktiskt står) när spelaren gömt sig i ~3 s, ringen blinkar och granaten piper 1–1,5 s innan den smäller,
// och nedkylningen per trupp håller (ingen ny granat på 9 s). smartAI av återställer allt. Mätning: fiendeloopen med 36 alerterade
// fiender och 4× CPU-strypning – version 24 (före) och version 25 med rollerna av och på, i två sidor som mäts växelvis (median).
// Engelska texter. Inga sidfel.
// Stabilitet: fienderna skapas om utan slump (inga champions, eliter, ledare, sovande eller patruller från banans frö), effekterna
// är nedskruvade (lowfx) och alla väntetider räknas i speltid (__game.roles.t()), inte väggtid – dt kapas vid låg bildfrekvens och
// träffstopp, så under belastning går speltiden långsammare än klockan.
import { setup } from './head.mjs';
import path from 'path'; import fs from 'fs'; import { execSync } from 'child_process'; import { fileURLToPath } from 'url';
const PORT = 9814;
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/t114');
const load = async (q = '') => { await pg.goto(`http://localhost:${PORT}/index.html?nolock=1${q}`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 }); };
await load();
ok(await ev(() => !!__game.roles && __game.roles.on() === false && __game.settings.smartAI === true), '__game.roles finns och smartAI är på som standard');

// scen som i t112: rutnät med väggram, fiender utan skada, spelaren tål allt och står där testet säger
const sceneFn = o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = true;
  const W = o.W, H = o.H, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  for (const [x, y] of o.walls || []) grid[y][x] = '1';
  grid[o.p[1]][o.p[0]] = 'P'; grid[1][W - 2] = 'x';
  for (const [t, x, y] of o.en) grid[y][x] = t;
  g.playCustom({ grid, biome: 'dungeon' });
  const E = g.ents(), spec = E.filter(e => !e.boss).map(e => [e.type, e.x, e.y]); E.length = 0; // utan banans slump: inga champions, eliter, ledare, sovande eller patruller
  for (const [t, x, y] of spec) g.spawnEnemy(t, x, y);
  for (const e of E) { e.d = { ...e.d, dmg: 0 }; if (o.still && o.still.includes(e.type)) e.d = { ...e.d, speed: 0 }; e.base = { speed: e.d.speed, cd: e.d.cd }; if (o.alert !== false) { e.alert = true; e.lostT = 0; e.lx = g.P.x; e.ly = g.P.y; } }
  g.P.hp = 1e6; clearInterval(window.__hold); const px = g.P.x, py = g.P.y; window.__pin = o.pin !== false ? [px, py] : null;
  window.__hold = setInterval(() => { __game.P.hp = 1e6; if (window.__pin) { __game.P.x = window.__pin[0]; __game.P.y = window.__pin[1]; } }, 30);
};
const scene = o => pg.evaluate(sceneFn, o);
// väntan i speltid: tills villkoret (en funktion i sidan) är sant eller speltiden gått sec sekunder; väggtiden är bara ett yttre tak
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);
// i sidan: kör f efter sec sekunder speltid (för mätningar som måste tas direkt, inom samma bildruta-fönster)
const inGame = `window.__after = (sec, f) => new Promise(res => { const t0 = __game.roles.t(); const k = () => (__game.roles.t() - t0 >= sec ? res(f()) : requestAnimationFrame(k)); requestAnimationFrame(k); });`;
await ev(inGame);

// 1) SKÖLDVAKTEN: sköldbäraren går fram och ställer sig på linjen mellan skytten och spelaren
await scene({ W: 30, H: 20, p: [5, 10], en: [['K', 12, 10], ['@', 15, 5], ['S', 20, 15]], still: ['K'] });
let gd = null; const tg0 = await gt();
for (;;) { await wait(100); gd = await ev(() => { const g = __game, sh = g.ents().find(e => e.type === 'K'), q = g.ents().find(e => e.type === '@'), r = g.roles.of(q);
  const vx = g.P.x - sh.x, vy = g.P.y - sh.y, L = Math.hypot(vx, vy), along = ((q.x - sh.x) * vx + (q.y - sh.y) * vy) / L, off = Math.abs((q.x - sh.x) * vy - (q.y - sh.y) * vx) / L;
  let rel = Math.atan2(g.P.y - q.y, g.P.x - q.x) - (q.face ?? 99); rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  return { ward: r.ward === sh, along: +along.toFixed(2), off: +off.toFixed(2), face: +Math.abs(rel).toFixed(2), q: [+q.x.toFixed(2), +q.y.toFixed(2)], sh: [+sh.x.toFixed(2), +sh.y.toFixed(2)] }; });
  if ((gd.ward && gd.along > 0.5 && gd.along < 1.7 && gd.off < 0.35 && gd.face < 0.5) || (await gt()) - tg0 > 14) break; }
ok(gd.ward && gd.along > 0.5 && gd.along < 1.7 && gd.off < 0.35, `sköldvakten står mellan spelaren och skytten: ${gd.along} rutor framför skytten, ${gd.off} från linjen ${JSON.stringify(gd)}`);
ok(gd.face < 0.5, `skölden är vänd mot spelaren (vinkel ${gd.face} rad)`);
await pg.locator('#screen').screenshot({ path: 'out/t114/skoldvakt.png' });
// spelarens skott tar i skölden, inte i skytten; skyttens egna skott går igenom vakten (ingen inbördes strid)
const blk = await ev(() => new Promise(res => { const g = __game, sh = g.ents().find(e => e.type === 'K'), q = g.ents().find(e => e.type === '@'), hp0 = sh.hp, qh0 = q.hp;
  g.P.a = Math.atan2(sh.y - g.P.y, sh.x - g.P.x); g.P.pitch = 0; g.fire(); setTimeout(() => res({ shooter: hp0 - sh.hp, guard: qh0 - q.hp }), 300); }));
ok(blk.shooter === 0, 'skölden tar spelarens skott mot skytten ' + JSON.stringify(blk));
await until(() => __game.roles.st().guardPass > 0, 10);
const pass = await ev(() => { const q = __game.ents().find(e => e.type === '@'); return { pass: __game.roles.st().guardPass, feud: !!q.feud, hp: q.hp, max: q.maxHp }; });
ok(pass.pass >= 1 && !pass.feud && pass.hp >= pass.max - 1e-6, 'skyttens skott går igenom den egna sköldvakten (ingen bråk-reaktion) ' + JSON.stringify(pass));
// spelaren går fram till vakten: den bryter formationen; spelaren drar sig långt tillbaka: vakten ställer sig på linjen igen
const near = await ev(() => { const g = __game, q = g.ents().find(e => e.type === '@'); window.__pin = [q.x - 2, q.y]; return [q.x - 2, q.y]; });
await until(() => __game.roles.st().guardBreak > 0, 3);
const br1 = await ev(() => ({ br: __game.roles.st().guardBreak, ward: !!__game.roles.of(__game.ents().find(e => e.type === '@')).ward }));
await ev(() => { window.__pin = [2.5, 10.5]; }); // långt bort: vakten hinner inte ikapp under de två sekunderna och går tillbaka till skytten
let back = null; const tb0 = await gt(); for (;;) { await wait(100); back = await ev(() => { const g = __game, sh = g.ents().find(e => e.type === 'K'), q = g.ents().find(e => e.type === '@');
  const vx = g.P.x - sh.x, vy = g.P.y - sh.y, L = Math.hypot(vx, vy), along = ((q.x - sh.x) * vx + (q.y - sh.y) * vy) / L, off = Math.abs((q.x - sh.x) * vy - (q.y - sh.y) * vx) / L; return { along: +along.toFixed(2), off: +off.toFixed(2) }; });
  if ((back.along > 0.5 && back.along < 1.7 && back.off < 0.35) || (await gt()) - tb0 > 14) break; }
ok(br1.br >= 1 && br1.ward && back.along > 0.5 && back.along < 1.7 && back.off < 0.35, `spelaren nära: vakten bryter formationen (${br1.br} gånger) och ställer sig på linjen igen när han backar ${JSON.stringify(back)}`);
// skytten dör: vakten bryter formationen och går mot spelaren
const brk0 = await ev(() => { const g = __game, sh = g.ents().find(e => e.type === 'K'), q = g.ents().find(e => e.type === '@'); const d0 = Math.hypot(q.x - g.P.x, q.y - g.P.y); g.hurtEnemy(sh, 1e4, sh.x, sh.y, { noProc: true }); return { d0, dead: sh.dead }; });
await gwait(2.5);
const brk = await ev(() => { const g = __game, q = g.ents().find(e => e.type === '@'); return { ward: !!g.roles.of(q).ward, d: Math.hypot(q.x - g.P.x, q.y - g.P.y), br: g.roles.st().guardBreak, barks: g.roles.st().barks.map(b => b.text), dbg: { st: q.state, t: q.t, cd: q.cd, hes: q.r25hesT, stun: q.stun, flee: q.fleeT, feud: !!q.feud, dead: q.dead, p: [g.P.x, g.P.y], q: [q.x, q.y], tok: q.a24tokT, now: g.roles.t(), cool: q.a24coolT, frozen: q.frozen, alert: q.alert, n: g.ents().map(e => e.type + (e.dead ? 'x' : '')) } }; });
ok(brk0.dead && !brk.ward && brk.d < brk0.d0 - 1 && brk.br >= 1, `skytten dog: vakten bryter formationen och anfaller (avstånd ${brk0.d0.toFixed(1)} → ${brk.d.toFixed(1)}) ${brk.d < brk0.d0 - 1 ? '' : JSON.stringify(brk.dbg)}`);
ok(brk.barks.some(t => t === 'SKÖLDAR UPP!' || t === 'BAKOM MIG!'), 'barken SKÖLDAR UPP! eller BAKOM MIG! ' + JSON.stringify(brk.barks));

// 2) BEFÄLHAVAREN: orkkrigaren (talande, mest hp) blir befälhavare; fanan syns; bonusen gäller truppen inom 6 rutor
await scene({ W: 32, H: 22, p: [5, 11], en: [['W', 18, 11], ['S', 16, 9], ['S', 16, 13], ['K', 19, 9], ['ĳ', 19, 13]], still: ['W', 'S', 'K', 'ĳ'] });
await until(() => __game.roles.cmds().length && __game.roles.buffed().length >= 4, 8); await gwait(0.3);
const cm = await ev(() => { const g = __game, c = g.roles.cmds()[0]; if (!c) return null;
  const mem = g.ents().filter(e => !e.dead && e !== c).map(e => ({ t: e.type, mor: g.roles.of(e).mor,  cd: +(e.d.cd / e.base.cd).toFixed(3), dc: +Math.hypot(e.x - c.x, e.y - c.y).toFixed(1) }));
  return { type: c.type, elite: !!(c.elite || c.champion), elites: g.ents().filter(e => e.elite || e.champion).map(e => e.type), n: g.roles.cmds().length, mem, drawn: g.roles.st().drawn, barks: g.roles.st().barks.map(b => b.text) }; });
ok(cm && cm.n === 1 && cm.type === 'W', 'en befälhavare per trupp: den talande med mest hp (orkkrigaren) ' + JSON.stringify(cm && { type: cm.type, elite: cm.elite, elites: cm.elites, n: cm.n }));
ok(cm && cm.mem.every(m => m.mor && Math.abs(m.cd - 0.85) < 0.002), 'truppen inom 6 rutor har högre moral: nedkylningen ×0,85 ' + JSON.stringify(cm && cm.mem));
await pg.locator('#screen').screenshot({ path: 'out/t114/befalhavare.png' });
ok(cm && cm.drawn > 0, `fanan över befälhavaren ritas (${cm && cm.drawn} gånger)`);
ok(cm && cm.barks.includes('FRAMÅT!'), 'barken FRAMÅT! ' + JSON.stringify(cm && cm.barks));
// flyr inte under befäl
const nf = await ev(() => { const g = __game, e = g.ents().find(o => o.type === 'S' && !o.dead); e.fleeT = 2; return __after(0.1, () => ({ fleeT: e.fleeT, mor: g.roles.of(e).mor })); });
ok(nf.mor && !(nf.fleeT > 0), 'under befäl flyr truppen inte ' + JSON.stringify(nf));
// fart +15 %: samma trupp, nu får alla gå – fienden går 15 % fortare med befälhavaren än utan
const speedRun = async cmdOn => { await ev(c => { __game.roles.flags.cmd = c; }, cmdOn);
  await scene({ W: 30, H: 14, p: [2, 7], en: [['W', 17, 7], ['S', 18, 5], ['S', 18, 9], ['K', 19, 7]], still: ['K'] });
  if (cmdOn) await until(() => __game.ents().filter(e => e.type === 'S').every(e => __game.roles.of(e).mor), 6); else await gwait(1);
  await gwait(0.3);
  return ev(() => new Promise(res => { const g = __game, es = g.ents().filter(e => e.type === 'S'); let dist = 0, time = 0, fr = 0, mor = 0, last = g.roles.t(); const t0 = last; // speltid per bildruta
    const f = () => { const now = g.roles.t(), dt = now - last; last = now; for (const e of es) if (e.state === 'move' && !e.dead && dt > 0) { dist += Math.hypot(e.mvx || 0, e.mvy || 0); time += dt; fr++; if (g.roles.of(e).mor) mor++; }
      if (now - t0 < 1.5) requestAnimationFrame(f); else res({ v: dist / Math.max(1e-6, time), fr, mor }); }; requestAnimationFrame(f); })); };
const vOn = await speedRun(true), vOff = await speedRun(false); await ev(() => { __game.roles.flags.cmd = true; });
const ratio = vOn.v / vOff.v;
ok(vOn.mor > vOn.fr * 0.9 && vOff.mor === 0 && ratio > 1.08 && ratio < 1.22, `farten med befälhavaren: ${vOn.v.toFixed(2)} rutor/s mot ${vOff.v.toFixed(2)} utan (×${ratio.toFixed(2)}; bildrutor med moral ${vOn.mor}/${vOn.fr})`);
// befälhavaren dör: tvekan, bonusen försvinner, den svagaste flyr, barken
await scene({ W: 32, H: 22, p: [5, 11], en: [['W', 18, 11], ['S', 16, 9], ['S', 16, 13], ['K', 19, 9], ['ĳ', 19, 13]], still: ['K'] });
await until(() => __game.roles.buffed().length >= 3, 8);
const die = await ev(() => new Promise(res => { const g = __game, c = g.roles.cmds()[0], weak = g.ents().find(e => e.type === 'S');
  weak.hp = weak.maxHp * 0.3; const before = g.ents().filter(e => !e.dead && e !== c).map(e => ({ t: e.type, mor: g.roles.of(e).mor }));
  g.hurtEnemy(c, 1e4, c.x, c.y, { noProc: true });
  const after = g.ents().filter(e => !e.dead && e !== weak).map(e => ({ t: e.type, hes: g.roles.of(e).hes, mor: g.roles.of(e).mor, sp: e.base.speed ? +(e.d.speed / e.base.speed).toFixed(4) : 1, cd: +(e.d.cd / e.base.cd).toFixed(4), x: e.x, y: e.y }));
  const flee = weak.fleeT; __after(0.6, () => res({ dead: c.dead, before, after, flee, moved: g.ents().filter(e => !e.dead && e !== weak && e.type !== 'K').map((e) => { const a = after.find(o => o.t === e.type && Math.abs(o.x - e.x) + Math.abs(o.y - e.y) < 5); return a ? +Math.hypot(e.x - a.x, e.y - a.y).toFixed(3) : -1; }),
    st: g.roles.st(), barks: g.roles.st().barks.map(b => b.text) })); }));
ok(die.dead && die.before.every(m => m.mor) && die.after.every(m => m.hes && !m.mor && Math.abs(m.sp - 1) < 1e-3 && Math.abs(m.cd - 1) < 1e-3), 'befälhavaren dör: bonusen försvinner direkt (fart och nedkylning tillbaka) och truppen tvekar ' + JSON.stringify(die.after.map(({ t, hes, mor, sp, cd }) => ({ t, hes, mor, sp, cd }))));
ok(die.moved.every(d => d >= 0 && d < 0.05), 'tvekan: truppen står still en stund ' + JSON.stringify(die.moved));
ok(die.flee > 0 && die.st.fled === 1, `den svagaste flyr (fleeT ${die.flee})`);
ok(die.barks.includes('BEFÄLET ÄR DÖTT!'), 'barken BEFÄLET ÄR DÖTT! ' + JSON.stringify(die.barks));
const d1 = await ev(() => ({ cmds: __game.roles.cmds().length, buffed: __game.roles.buffed().length, flee: Math.max(0, ...__game.ents().filter(e => !e.dead).map(e => e.fleeT || 0)) }));
ok(d1.cmds === 0 && d1.buffed === 0 && d1.flee > 0, 'moralen stannar nere: ingen ny befälhavare, ingen bonus, och den svagaste flyr fortfarande ' + JSON.stringify(d1));
await gwait(1.0);
ok(await ev(() => __game.ents().filter(e => !e.dead).every(e => !__game.roles.of(e).hes)), 'tvekan är över efter högst 1,5 s');
ok(await ev(() => __game.roles.cmds().length === 0 && __game.roles.buffed().length === 0), 'ingen efterträdare de första sekunderna efter att befälet dött');
// version 6:s ledare blir befälhavare (även ett skelett, som annars inte kan föra befäl), får fanan, och när den dör flyr de andra (leaderDied)
await scene({ W: 32, H: 22, p: [5, 11], en: [['W', 18, 11], ['S', 16, 9], ['S', 16, 13], ['K', 19, 9], ['ĳ', 19, 13]], still: ['W', 'S', 'K', 'ĳ'] });
await ev(() => { const s = __game.ents().find(e => e.type === 'S'); s.leader = true; s.hp = s.maxHp = s.maxHp * 1.5; });
await until(() => __game.roles.cmds().length && __game.roles.st().drawn > 0, 8);
const ld = await ev(() => ({ type: __game.roles.cmds()[0] && __game.roles.cmds()[0].type, leader: !!(__game.roles.cmds()[0] && __game.roles.cmds()[0].leader), drawn: __game.roles.st().drawn }));
const ldd = await ev(() => new Promise(res => { const g = __game, c = g.roles.cmds()[0]; g.hurtEnemy(c, 1e4, c.x, c.y, { noProc: true }); __after(1.0, () => res({ fleeing: g.ents().filter(e => !e.dead && e.fleeT > 0).length, alive: g.ents().filter(e => !e.dead).length, cmds: g.roles.cmds().length, buffed: g.roles.buffed().length })); }));
ok(ld.type === 'S' && ld.leader && ld.drawn > 0, 'version 6:s ledare blir befälhavare och får fanan ' + JSON.stringify(ld));
ok(ldd.fleeing >= ldd.alive - 1 && ldd.cmds === 0 && ldd.buffed === 0, 'ledaren dör: de andra flyr (fleeT hålls kvar) och ingen ny befälhavare ' + JSON.stringify(ldd));

// 3) GRANATKASTAREN: spelaren gömmer sig bakom en vägg; granaten går mot den senast kända platsen, ringen blinkar, den piper och smäller
const wall = []; for (let y = 6; y <= 14; y++) wall.push([11, y]);
await scene({ W: 30, H: 21, p: [8, 10], walls: wall, en: [['ĳ', 16, 8], ['Ä', 17, 12], ['ĳ', 17, 10]], still: ['ĳ', 'Ä'] });
await gwait(0.5);
// den senast kända platsen (8.5, 11.8) är inte där spelaren står (8.5, 9.5), men nära nog för att han ska vara "känd"
await ev(() => { window.__pin = [8.5, 9.5]; for (const e of __game.ents()) { e.lx = 8.5; e.ly = 11.8; e.lostT = 1; } window.__keep = setInterval(() => { for (const e of __game.ents()) { if (!e.dead && e.lostT > 2) e.lostT = 1.2; } }, 500); });
const t0 = await gt();
await until(() => __game.roles.st().nades > 0, 15);
const th = await ev(t0 => ({ st: __game.roles.st(), after: __game.roles.t() - t0, live: __game.roles.live(), see: __game.ents().filter(e => !e.dead && e.lostT < 0.8).length }), t0);
const L0 = th.st.log[0];
ok(th.st.nades === 1 && L0 && L0.hid >= 2 && th.after >= 2 && th.see === 0, `granaten kastas när spelaren gömt sig i ~3 s, eller redan efter ~2,5 s när han står still och flera saknar skottlinje (efter ${th.after.toFixed(1)} s speltid, gömd ${L0 && L0.hid} s, ${th.see} ser honom)`);
ok(L0 && Math.hypot(L0.to[0] - 8.5, L0.to[1] - 11.8) < 0.6 && Math.hypot(L0.to[0] - L0.p[0], L0.to[1] - L0.p[1]) > 1.6, 'den landar vid den senast kända platsen, inte där spelaren står ' + JSON.stringify(L0));
// förvarningen: ring och granat ritas, piper 1–1,5 s på marken innan den smäller
let ringSeen = 0, landed = null; const tr0 = await gt(); for (;;) { if ((await ev(() => __game.roles.st().booms)) || (await gt()) - tr0 > 6) break; await wait(60); const s = await ev(() => ({ r: __game.roles.st().ringDrawn || 0, l: __game.roles.live()[0] })); ringSeen = s.r; if (s.l && s.l.ph && !landed) landed = s.l; }
await pg.locator('#screen').screenshot({ path: 'out/t114/granat.png' });
const bm = await ev(() => __game.roles.st());
const B0 = bm.boomLog && bm.boomLog[0];
ok(ringSeen > 10 && landed && B0 && B0.fuse >= 0.95 && B0.fuse <= 1.55, `förvarning: blinkande ring (${ringSeen} bildrutor), granaten låg ${B0 && B0.fuse} s på marken och piper innan den smäller; flygtid ${L0 && L0.T} s`);
ok(bm.booms === 1 && B0 && Math.hypot(B0.at[0] - 8.5, B0.at[1] - 11.8) < 0.6, 'smällen kommer vid den senast kända platsen ' + JSON.stringify(B0));
ok(bm.barks.some(b => b.text === 'GRANAT!' || b.text === 'UT MED DIG!'), 'barken GRANAT! eller UT MED DIG! ' + JSON.stringify(bm.barks.map(b => b.text)));
const ai = await ev(() => __game.ai.st());
ok(ai.press >= 1 && ai.flush >= 1, `granaten räknas som AI24:s press (delad nedkylning med eldkrukan): press ${ai.press}, flush ${ai.flush}`);
// nedkylningen: spelaren fortsätter att gömma sig, men truppen kastar ingen ny granat på minst 9 s
const tA = L0 ? L0.t : 0; await until(() => __game.roles.st().nades >= 2, 17);
const cd = await ev(() => ({ log: __game.roles.st().log, flush: __game.ai.st().flush, press: __game.ai.st().press }));
const gap = cd.log.length > 1 ? cd.log[1].t - tA : 99;
ok(gap >= 9 && cd.log.length <= 2, `nedkylning per trupp: nästa granat först efter ${gap === 99 ? '>17' : gap.toFixed(1)} s (eldkrukor emellan: ${cd.flush - cd.log.length})`);
await ev(() => clearInterval(window.__keep));
// spelaren som syns får ingen granat
await scene({ W: 30, H: 21, p: [8, 10], en: [['ĳ', 16, 8], ['Ä', 17, 12], ['ĳ', 17, 10]], still: ['ĳ', 'Ä'] });
await gwait(6);
ok(await ev(() => __game.roles.st().nades === 0), 'en spelare som syns får ingen granat');

// 4) smartAI av: allt återställs (fart, nedkylning, flaggor, granater) och lagret är av
await scene({ W: 32, H: 22, p: [5, 11], en: [['W', 18, 11], ['S', 16, 9], ['S', 16, 13], ['K', 19, 9], ['@', 17, 7]], still: ['W', 'S', 'K'] });
const w0off = Date.now(), uo = await until(() => __game.roles.buffed().length >= 2, 8), woff = (Date.now() - w0off) / 1000;
const offR = await ev(() => new Promise(res => { const g = __game, b0 = g.roles.buffed().length, dbg = { cmds: g.roles.cmds().length, sq: g.ai.squads(), f: { on: g.roles.flags.on, act: g.roles.flags.active, cmd: g.roles.flags.cmd }, n: g.ents().length, al: g.ents().filter(e => e.alert).length, state: g.state(), t: g.roles.t(), aierr: g.ai.err(), smart: g.settings.smartAI, P: [g.P.x, g.P.y], pos: g.ents().map(e => [e.type, +e.x.toFixed(1), +e.y.toFixed(1), e.dead]), paused: typeof g.paused === 'function' ? g.paused() : null }; g.settings.smartAI = false; __after(0.1, () => { const es = g.ents().filter(e => !e.dead);
  res({ b0, dbg, on: g.roles.on(), cmd: es.some(e => e.r25cmd || e.r25mor || e.r25g), sp: es.every(e => Math.abs(e.d.speed - (e.base.speed ? e.base.speed : 0)) < 1e-9 || e.base.speed === 0), cd: es.every(e => Math.abs(e.d.cd / e.base.cd - 1) < 1e-9), live: g.roles.live().length }); g.settings.smartAI = true; }); }));
ok(offR.b0 >= 2 && !offR.on && !offR.cmd && offR.cd && offR.live === 0, 'smartAI av: rollerna, moralen och granaterna är borta, nedkylningen som förut ' + JSON.stringify({ ...offR, uo, woff }));

// 5) prestanda: 36 alerterade fiender med alla roller, 4× CPU-strypning. Före = version 24 (git show 9f93c98) i en egen sida, efter =
// version 25 i den här sidan; varianterna mäts växelvis i samma omgång (v24, v25 med rollerna, v25 utan rollerna) och jämförs med median.
const ring = (n, r0, r1, cx, cy, types) => { const out = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, r = r0 + (i % 3) * (r1 - r0) / 2; out.push([types[i % types.length], Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r)]); } return out; };
const pillars = []; for (let y = 3; y < 28; y += 4) for (let x = 9; x < 40; x += 3) pillars.push([x, y]);
const big = { W: 44, H: 30, p: [22, 15], walls: pillars, en: ring(36, 4, 11, 22, 15, ['S', 'K', '@', 'Ä', 'W', 'ĳ', 'K', 'S', 'Ő']) };
const ROOT = process.env.KRYPTA_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), BASE = path.resolve('out/t114/game_v24.js');
try { fs.writeFileSync(BASE, execSync(`git -C "${ROOT}" show 9f93c98:js/game.js`, { maxBuffer: 64 << 20 })); } catch (e) { console.log('     (version 24 saknas i git – ingen före-mätning)'); }
const prep = async page => { await page.evaluate(sceneFn, big); await page.waitForTimeout(1500); await page.evaluate(() => __game.pause()); };
let p24 = null;
let ctx24 = null; if (fs.existsSync(BASE)) { ctx24 = await pg.context().browser().newContext({ viewport: { width: 960, height: 600 } }); p24 = await ctx24.newPage(); p24.on('pageerror', e => console.log('     (v24-sidan: ' + e.message + ')')); process.env.GAME_JS = BASE; await p24.goto(`http://localhost:${PORT}/index.html?nolock=1`); await p24.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 }); delete process.env.GAME_JS;
  await prep(p24); }
await prep(pg);
const cdps = [await pg.context().newCDPSession(pg)]; if (p24) cdps.push(await ctx24.newCDPSession(p24));
for (const c of cdps) await c.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const B = 300, R = { v24: [], on: [], r0: [] };
const b25 = (page, roles) => page.evaluate(([B, roles]) => { const f = __game.roles.flags; if (!roles) { f.on = false; __game.roles.off(); } const ms = __game.ai.bench(B, true); if (!roles) { f.on = true; f.active = true; } return ms; }, [B, roles]);
for (let i = 0; i < 10; i++) { // första omgången värmer upp
  if (p24) { const v = await p24.evaluate(B => __game.ai.bench(B, true), B); if (i) R.v24.push(v); }
  const on = await b25(pg, true), r0 = await b25(pg, false); if (i) { R.on.push(on); R.r0.push(r0); } }
for (const c of cdps) await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
if (p24) await ctx24.close(); await ev(() => __game.resume());
const med = a => a.length ? a.slice().sort((x, y) => x - y)[a.length >> 1] : NaN, M = { v24: med(R.v24), on: med(R.on), r0: med(R.r0) };
// kvoter per omgång (samma omgång = samma belastning på maskinen), sedan median: tål att andra processer stör enstaka omgångar
const kOn = med(R.on.map((v, i) => v / R.r0[i])), k24 = p24 ? med(R.on.map((v, i) => v / R.v24[i])) : NaN;
console.log('     mätning (ms per bildruta för fiendeloopen, 4× strypning, median av 9 växelvisa körningar):', JSON.stringify(M), JSON.stringify(R, (k, v) => typeof v === 'number' ? +v.toFixed(3) : v));
ok(kOn < 1.35, `rollerna kostar lite: ${M.on.toFixed(3)} ms med rollerna, ${M.r0.toFixed(3)} ms utan (median; kvot per omgång ×${kOn.toFixed(2)})`);
if (p24) console.log(`     före/efter (bara rapport – två sidor i olika processer brusar för mycket för en skarp gräns): version 24 ${M.v24.toFixed(3)} ms, version 25 ${M.on.toFixed(3)} ms (median, växelvis; kvot per omgång ×${k24.toFixed(2)})`);
const bad = await ev(() => ({ err: __game.roles.err(), aiErr: __game.ai.err(), fail: __game.ents().filter(e => e.renderFail > 0).length }));
ok(!bad.err && !bad.aiErr && bad.fail === 0, 'inga fel i R25 eller AI24 och ingen fiende har kastat fel ' + JSON.stringify(bad));
await ev(() => clearInterval(window.__hold));

// 6) engelska
const texts = ['FRAMÅT!', 'HÅLL LINJEN!', 'BEFÄLET ÄR DÖTT!', 'SKÖLDAR UPP!', 'BAKOM MIG!', 'GRANAT!', 'GRANATEN', 'BEFÄLHAVAREN MED FANAN GER TRUPPEN MOD – DÖDA DEN FÖRST.', 'EN GRANAT PIPER DÄR RINGEN BLINKAR – SPRING UT UR DEN.'];
await load('&lang=en');
const en = await ev(b => b.map(s => [s, I18N.t(s)]), texts);
ok(en.every(([s, t]) => t && t !== s), 'texterna finns på engelska ' + JSON.stringify(en.map(p => p[1])));
await done();
