// t114: fienderoller version 25 (R25) ovanpå AI24. Kontroller: SKÖLDVAKTEN ställer sig mellan spelaren och skytten (på linjen,
// 0,5–1,7 rutor framför skytten), skölden tar spelarens skott och truppens skott går igenom vakten; vakten bryter formationen när
// skytten dör. BEFÄLHAVAREN väljs (en per trupp), fanan ritas, truppen inom 6 rutor får +15 % fart och 15 % kortare nedkylning och
// flyr inte; när den dör tvekar truppen, bonusen försvinner och den svagaste flyr. GRANATKASTAREN kastar mot den senast kända
// platsen (inte där spelaren faktiskt står) när spelaren gömt sig i ~3 s, ringen blinkar och granaten piper 1–1,5 s innan den smäller,
// och nedkylningen per trupp håller (ingen ny granat på 9 s). smartAI av återställer allt. Mätning: fiendeloopen med 36 alerterade
// fiender och 4× CPU-strypning – version 24 (före), version 25 med rollerna av och på. Engelska texter. Inga sidfel.
import { setup } from './head.mjs';
import path from 'path'; import fs from 'fs'; import { execSync } from 'child_process'; import { fileURLToPath } from 'url';
const PORT = 9814;
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/t114');
const load = async (q = '') => { await pg.goto(`http://localhost:${PORT}/index.html?nolock=1${q}`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 }); };
await load();
ok(await ev(() => !!__game.roles && __game.roles.on() === false && __game.settings.smartAI === true), '__game.roles finns och smartAI är på som standard');

// scen som i t112: rutnät med väggram, fiender utan skada, spelaren tål allt och står där testet säger
const scene = (o) => ev(o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false;
  const W = o.W, H = o.H, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  for (const [x, y] of o.walls || []) grid[y][x] = '1';
  grid[o.p[1]][o.p[0]] = 'P'; grid[1][W - 2] = 'x';
  for (const [t, x, y] of o.en) grid[y][x] = t;
  g.playCustom({ grid, biome: 'dungeon' });
  for (const e of g.ents()) { e.leader = false; e.d = { ...e.d, dmg: 0 }; if (o.still && o.still.includes(e.type)) e.d = { ...e.d, speed: 0 }; e.base = { speed: e.d.speed, cd: e.d.cd }; if (o.alert !== false) { e.alert = true; e.lostT = 0; e.lx = g.P.x; e.ly = g.P.y; } }
  g.P.hp = 1e6; clearInterval(window.__hold); const px = g.P.x, py = g.P.y; window.__pin = o.pin !== false ? [px, py] : null;
  window.__hold = setInterval(() => { __game.P.hp = 1e6; if (window.__pin) { __game.P.x = window.__pin[0]; __game.P.y = window.__pin[1]; } }, 30);
}, o);

// 1) SKÖLDVAKTEN: sköldbäraren går fram och ställer sig på linjen mellan skytten och spelaren
await scene({ W: 30, H: 20, p: [5, 10], en: [['K', 12, 10], ['@', 15, 5], ['S', 20, 15]], still: ['K'] });
let gd = null;
for (let i = 0; i < 48; i++) { await wait(250); gd = await ev(() => { const g = __game, sh = g.ents().find(e => e.type === 'K'), q = g.ents().find(e => e.type === '@'), r = g.roles.of(q);
  const vx = g.P.x - sh.x, vy = g.P.y - sh.y, L = Math.hypot(vx, vy), along = ((q.x - sh.x) * vx + (q.y - sh.y) * vy) / L, off = Math.abs((q.x - sh.x) * vy - (q.y - sh.y) * vx) / L;
  let rel = Math.atan2(g.P.y - q.y, g.P.x - q.x) - (q.face ?? 99); rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  return { ward: r.ward === sh, along: +along.toFixed(2), off: +off.toFixed(2), face: +Math.abs(rel).toFixed(2), q: [+q.x.toFixed(2), +q.y.toFixed(2)], sh: [+sh.x.toFixed(2), +sh.y.toFixed(2)] }; });
  if (gd.ward && gd.along > 0.5 && gd.along < 1.7 && gd.off < 0.35 && gd.face < 0.5) break; }
ok(gd.ward && gd.along > 0.5 && gd.along < 1.7 && gd.off < 0.35, `sköldvakten står mellan spelaren och skytten: ${gd.along} rutor framför skytten, ${gd.off} från linjen ${JSON.stringify(gd)}`);
ok(gd.face < 0.5, `skölden är vänd mot spelaren (vinkel ${gd.face} rad)`);
await pg.locator('#screen').screenshot({ path: 'out/t114/skoldvakt.png' });
// spelarens skott tar i skölden, inte i skytten; skyttens egna skott går igenom vakten (ingen inbördes strid)
const blk = await ev(() => new Promise(res => { const g = __game, sh = g.ents().find(e => e.type === 'K'), q = g.ents().find(e => e.type === '@'), hp0 = sh.hp, qh0 = q.hp;
  g.P.a = Math.atan2(sh.y - g.P.y, sh.x - g.P.x); g.P.pitch = 0; g.fire(); setTimeout(() => res({ shooter: hp0 - sh.hp, guard: qh0 - q.hp }), 300); }));
ok(blk.shooter === 0, 'skölden tar spelarens skott mot skytten ' + JSON.stringify(blk));
for (let i = 0; i < 20 && !(await ev(() => __game.roles.st().guardPass > 0)); i++) await wait(400);
const pass = await ev(() => { const q = __game.ents().find(e => e.type === '@'); return { pass: __game.roles.st().guardPass, feud: !!q.feud, hp: q.hp, max: q.maxHp }; });
ok(pass.pass >= 1 && !pass.feud && pass.hp >= pass.max - 1e-6, 'skyttens skott går igenom den egna sköldvakten (ingen bråk-reaktion) ' + JSON.stringify(pass));
// spelaren går fram till vakten: den bryter formationen; spelaren backar: vakten ställer sig på linjen igen
const near = await ev(() => { const g = __game, q = g.ents().find(e => e.type === '@'); window.__pin = [q.x - 2, q.y]; return [q.x - 2, q.y]; });
await wait(1500);
const br1 = await ev(() => ({ br: __game.roles.st().guardBreak, ward: !!__game.roles.of(__game.ents().find(e => e.type === '@')).ward }));
await ev(() => { window.__pin = [5.5, 10.5]; });
let back = null; for (let i = 0; i < 40; i++) { await wait(250); back = await ev(() => { const g = __game, sh = g.ents().find(e => e.type === 'K'), q = g.ents().find(e => e.type === '@');
  const vx = g.P.x - sh.x, vy = g.P.y - sh.y, L = Math.hypot(vx, vy), along = ((q.x - sh.x) * vx + (q.y - sh.y) * vy) / L, off = Math.abs((q.x - sh.x) * vy - (q.y - sh.y) * vx) / L; return { along: +along.toFixed(2), off: +off.toFixed(2) }; });
  if (back.along > 0.5 && back.along < 1.7 && back.off < 0.35) break; }
ok(br1.br >= 1 && br1.ward && back.along > 0.5 && back.along < 1.7 && back.off < 0.35, `spelaren nära: vakten bryter formationen (${br1.br} gånger) och ställer sig på linjen igen när han backar ${JSON.stringify(back)}`);
// skytten dör: vakten bryter formationen och går mot spelaren
const brk0 = await ev(() => { const g = __game, sh = g.ents().find(e => e.type === 'K'), q = g.ents().find(e => e.type === '@'); const d0 = Math.hypot(q.x - g.P.x, q.y - g.P.y); g.hurtEnemy(sh, 1e4, sh.x, sh.y, { noProc: true }); return { d0, dead: sh.dead }; });
await wait(2500);
const brk = await ev(() => { const g = __game, q = g.ents().find(e => e.type === '@'); return { ward: !!g.roles.of(q).ward, d: Math.hypot(q.x - g.P.x, q.y - g.P.y), br: g.roles.st().guardBreak, barks: g.roles.st().barks.map(b => b.text) }; });
ok(brk0.dead && !brk.ward && brk.d < brk0.d0 - 1 && brk.br >= 1, `skytten dog: vakten bryter formationen och anfaller (avstånd ${brk0.d0.toFixed(1)} → ${brk.d.toFixed(1)})`);
ok(brk.barks.some(t => t === 'SKÖLDAR UPP!' || t === 'BAKOM MIG!'), 'barken SKÖLDAR UPP! eller BAKOM MIG! ' + JSON.stringify(brk.barks));

// 2) BEFÄLHAVAREN: orkkrigaren (talande, mest hp) blir befälhavare; fanan syns; bonusen gäller truppen inom 6 rutor
await scene({ W: 32, H: 22, p: [5, 11], en: [['W', 18, 11], ['S', 16, 9], ['S', 16, 13], ['K', 19, 9], ['ĳ', 19, 13]], still: ['W', 'S', 'K', 'ĳ'] });
for (let i = 0; i < 12 && !(await ev(() => __game.roles.cmds().length)); i++) await wait(250);
await wait(600);
const cm = await ev(() => { const g = __game, c = g.roles.cmds()[0]; if (!c) return null;
  const mem = g.ents().filter(e => !e.dead && e !== c).map(e => ({ t: e.type, mor: g.roles.of(e).mor,  cd: +(e.d.cd / e.base.cd).toFixed(3), dc: +Math.hypot(e.x - c.x, e.y - c.y).toFixed(1) }));
  return { type: c.type, elite: !!(c.elite || c.champion), elites: g.ents().filter(e => e.elite || e.champion).map(e => e.type), n: g.roles.cmds().length, mem, drawn: g.roles.st().drawn, barks: g.roles.st().barks.map(b => b.text) }; });
ok(cm && cm.n === 1 && (cm.elites.length ? cm.elite : cm.type === 'W'), 'en befälhavare per trupp: en elit om det finns, annars den talande med mest hp (orkkrigaren) ' + JSON.stringify(cm && { type: cm.type, elite: cm.elite, elites: cm.elites, n: cm.n }));
ok(cm && cm.mem.every(m => m.mor && Math.abs(m.cd - 0.85) < 0.002), 'truppen inom 6 rutor har högre moral: nedkylningen ×0,85 ' + JSON.stringify(cm && cm.mem));
await pg.locator('#screen').screenshot({ path: 'out/t114/befalhavare.png' });
ok(cm && cm.drawn > 0, `fanan över befälhavaren ritas (${cm && cm.drawn} gånger)`);
ok(cm && cm.barks.includes('FRAMÅT!'), 'barken FRAMÅT! ' + JSON.stringify(cm && cm.barks));
// flyr inte under befäl
const nf = await ev(() => new Promise(res => { const g = __game, e = g.ents().find(o => o.type === 'S' && !o.dead); e.fleeT = 2; setTimeout(() => res({ fleeT: e.fleeT, mor: g.roles.of(e).mor }), 700); }));
ok(nf.mor && !(nf.fleeT > 0), 'under befäl flyr truppen inte ' + JSON.stringify(nf));
// fart +15 %: samma trupp, nu får alla gå – fienden går 15 % fortare med befälhavaren än utan
const speedRun = async cmdOn => { await ev(c => { __game.roles.flags.cmd = c; }, cmdOn);
  await scene({ W: 30, H: 14, p: [2, 7], en: [['W', 17, 7], ['S', 18, 5], ['S', 18, 9], ['K', 19, 7]], still: ['K'] });
  await wait(1200); return ev(() => new Promise(res => { const g = __game, es = g.ents().filter(e => e.type === 'S'); let dist = 0, time = 0, fr = 0, mor = 0, last = performance.now(); const t0 = last;
    const f = () => { const now = performance.now(), dt = (now - last) / 1000; last = now; for (const e of es) if (e.state === 'move' && !e.dead) { dist += Math.hypot(e.mvx || 0, e.mvy || 0); time += dt; fr++; if (g.roles.of(e).mor) mor++; }
      if (now - t0 < 1500) requestAnimationFrame(f); else res({ v: dist / Math.max(1e-6, time), fr, mor }); }; requestAnimationFrame(f); })); };
const vOn = await speedRun(true), vOff = await speedRun(false); await ev(() => { __game.roles.flags.cmd = true; });
const ratio = vOn.v / vOff.v;
ok(vOn.mor > vOn.fr * 0.9 && vOff.mor === 0 && ratio > 1.08 && ratio < 1.22, `farten med befälhavaren: ${vOn.v.toFixed(2)} rutor/s mot ${vOff.v.toFixed(2)} utan (×${ratio.toFixed(2)}; bildrutor med moral ${vOn.mor}/${vOn.fr})`);
// befälhavaren dör: tvekan, bonusen försvinner, den svagaste flyr, barken
await scene({ W: 32, H: 22, p: [5, 11], en: [['W', 18, 11], ['S', 16, 9], ['S', 16, 13], ['K', 19, 9], ['ĳ', 19, 13]], still: ['K'] });
for (let i = 0; i < 12 && !(await ev(() => __game.roles.buffed().length >= 3)); i++) await wait(250);
const die = await ev(() => new Promise(res => { const g = __game, c = g.roles.cmds()[0], weak = g.ents().find(e => e.type === 'S');
  weak.hp = weak.maxHp * 0.3; const before = g.ents().filter(e => !e.dead && e !== c).map(e => ({ t: e.type, mor: g.roles.of(e).mor }));
  g.hurtEnemy(c, 1e4, c.x, c.y, { noProc: true });
  const after = g.ents().filter(e => !e.dead && e !== weak).map(e => ({ t: e.type, hes: g.roles.of(e).hes, mor: g.roles.of(e).mor, sp: e.base.speed ? +(e.d.speed / e.base.speed).toFixed(4) : 1, cd: +(e.d.cd / e.base.cd).toFixed(4), x: e.x, y: e.y }));
  const flee = weak.fleeT; setTimeout(() => res({ dead: c.dead, before, after, flee, moved: g.ents().filter(e => !e.dead && e !== weak && e.type !== 'K').map((e) => { const a = after.find(o => o.t === e.type && Math.abs(o.x - e.x) + Math.abs(o.y - e.y) < 5); return a ? +Math.hypot(e.x - a.x, e.y - a.y).toFixed(3) : -1; }),
    st: g.roles.st(), barks: g.roles.st().barks.map(b => b.text) }), 650); }));
ok(die.dead && die.before.every(m => m.mor) && die.after.every(m => m.hes && !m.mor && Math.abs(m.sp - 1) < 1e-3 && Math.abs(m.cd - 1) < 1e-3), 'befälhavaren dör: bonusen försvinner direkt (fart och nedkylning tillbaka) och truppen tvekar ' + JSON.stringify(die.after.map(({ t, hes, mor, sp, cd }) => ({ t, hes, mor, sp, cd }))));
ok(die.moved.every(d => d >= 0 && d < 0.05), 'tvekan: truppen står still en stund ' + JSON.stringify(die.moved));
ok(die.flee > 0 && die.st.fled === 1, `den svagaste flyr (fleeT ${die.flee})`);
ok(die.barks.includes('BEFÄLET ÄR DÖTT!'), 'barken BEFÄLET ÄR DÖTT! ' + JSON.stringify(die.barks));
const d1 = await ev(() => ({ cmds: __game.roles.cmds().length, buffed: __game.roles.buffed().length, flee: Math.max(0, ...__game.ents().filter(e => !e.dead).map(e => e.fleeT || 0)) }));
ok(d1.cmds === 0 && d1.buffed === 0 && d1.flee > 0, 'moralen stannar nere: ingen ny befälhavare, ingen bonus, och den svagaste flyr fortfarande ' + JSON.stringify(d1));
await wait(1200);
ok(await ev(() => __game.ents().filter(e => !e.dead).every(e => !__game.roles.of(e).hes)), 'tvekan är över efter högst 1,5 s');
ok(await ev(() => __game.roles.cmds().length === 0 && __game.roles.buffed().length === 0), 'ingen efterträdare de första sekunderna efter att befälet dött');
// version 6:s ledare blir befälhavare (även ett skelett, som annars inte kan föra befäl), får fanan, och när den dör flyr de andra (leaderDied)
await scene({ W: 32, H: 22, p: [5, 11], en: [['W', 18, 11], ['S', 16, 9], ['S', 16, 13], ['K', 19, 9], ['ĳ', 19, 13]], still: ['W', 'S', 'K', 'ĳ'] });
await ev(() => { const s = __game.ents().find(e => e.type === 'S'); s.leader = true; s.hp = s.maxHp = s.maxHp * 1.5; });
for (let i = 0; i < 12 && !(await ev(() => __game.roles.cmds().length)); i++) await wait(250);
await wait(600);
const ld = await ev(() => ({ type: __game.roles.cmds()[0] && __game.roles.cmds()[0].type, leader: !!(__game.roles.cmds()[0] && __game.roles.cmds()[0].leader), drawn: __game.roles.st().drawn }));
const ldd = await ev(() => new Promise(res => { const g = __game, c = g.roles.cmds()[0]; g.hurtEnemy(c, 1e4, c.x, c.y, { noProc: true }); setTimeout(() => res({ fleeing: g.ents().filter(e => !e.dead && e.fleeT > 0).length, alive: g.ents().filter(e => !e.dead).length, cmds: g.roles.cmds().length, buffed: g.roles.buffed().length }), 1000); }));
ok(ld.type === 'S' && ld.leader && ld.drawn > 0, 'version 6:s ledare blir befälhavare och får fanan ' + JSON.stringify(ld));
ok(ldd.fleeing >= ldd.alive - 1 && ldd.cmds === 0 && ldd.buffed === 0, 'ledaren dör: de andra flyr (fleeT hålls kvar) och ingen ny befälhavare ' + JSON.stringify(ldd));

// 3) GRANATKASTAREN: spelaren gömmer sig bakom en vägg; granaten går mot den senast kända platsen, ringen blinkar, den piper och smäller
const wall = []; for (let y = 6; y <= 14; y++) wall.push([11, y]);
await scene({ W: 30, H: 21, p: [8, 10], walls: wall, en: [['ĳ', 16, 8], ['Ä', 17, 12], ['ĳ', 17, 10]], still: ['ĳ', 'Ä'] });
await wait(500);
// den senast kända platsen (8.5, 11.8) är inte där spelaren står (8.5, 9.5), men nära nog för att han ska vara "känd"
await ev(() => { window.__pin = [8.5, 9.5]; for (const e of __game.ents()) { e.lx = 8.5; e.ly = 11.8; e.lostT = 1; } window.__keep = setInterval(() => { for (const e of __game.ents()) { if (!e.dead && e.lostT > 2) e.lostT = 1.2; } }, 500); });
const t0 = await ev(() => performance.now());
for (let i = 0; i < 30 && !(await ev(() => __game.roles.st().nades)); i++) await wait(250);
const th = await ev(t0 => ({ st: __game.roles.st(), after: (performance.now() - t0) / 1000, live: __game.roles.live(), see: __game.ents().filter(e => !e.dead && e.lostT < 0.8).length }), t0);
const L0 = th.st.log[0];
ok(th.st.nades === 1 && L0 && L0.hid >= 3 && th.after > 2.5, `granaten kastas när spelaren gömt sig i ~3 s (efter ${th.after.toFixed(1)} s, gömd ${L0 && L0.hid} s, ${th.see} ser honom)`);
ok(L0 && Math.hypot(L0.to[0] - 8.5, L0.to[1] - 11.8) < 0.6 && Math.hypot(L0.to[0] - L0.p[0], L0.to[1] - L0.p[1]) > 1.6, 'den landar vid den senast kända platsen, inte där spelaren står ' + JSON.stringify(L0));
// förvarningen: ring och granat ritas, piper 1–1,5 s på marken innan den smäller
let ringSeen = 0, landed = null; for (let i = 0; i < 40 && !(await ev(() => __game.roles.st().booms)); i++) { await wait(100); const s = await ev(() => ({ r: __game.roles.st().ringDrawn || 0, l: __game.roles.live()[0] })); ringSeen = s.r; if (s.l && s.l.ph && !landed) landed = s.l; }
await pg.locator('#screen').screenshot({ path: 'out/t114/granat.png' });
const bm = await ev(() => __game.roles.st());
const B0 = bm.boomLog && bm.boomLog[0];
ok(ringSeen > 10 && landed && B0 && B0.fuse >= 0.95 && B0.fuse <= 1.55, `förvarning: blinkande ring (${ringSeen} bildrutor), granaten låg ${B0 && B0.fuse} s på marken och piper innan den smäller; flygtid ${L0 && L0.T} s`);
ok(bm.booms === 1 && B0 && Math.hypot(B0.at[0] - 8.5, B0.at[1] - 11.8) < 0.6, 'smällen kommer vid den senast kända platsen ' + JSON.stringify(B0));
ok(bm.barks.some(b => b.text === 'GRANAT!' || b.text === 'UT MED DIG!'), 'barken GRANAT! eller UT MED DIG! ' + JSON.stringify(bm.barks.map(b => b.text)));
const ai = await ev(() => __game.ai.st());
ok(ai.press >= 1 && ai.flush >= 1, `granaten räknas som AI24:s press (delad nedkylning med eldkrukan): press ${ai.press}, flush ${ai.flush}`);
// nedkylningen: spelaren fortsätter att gömma sig, men truppen kastar ingen ny granat på minst 9 s
const tA = L0 ? L0.t : 0; for (let i = 0; i < 70 && (await ev(() => __game.roles.st().nades)) < 2; i++) await wait(250);
const cd = await ev(() => ({ log: __game.roles.st().log, flush: __game.ai.st().flush, press: __game.ai.st().press }));
const gap = cd.log.length > 1 ? cd.log[1].t - tA : 99;
ok(gap >= 9 && cd.log.length <= 2, `nedkylning per trupp: nästa granat först efter ${gap === 99 ? '>17' : gap.toFixed(1)} s (eldkrukor emellan: ${cd.flush - cd.log.length})`);
await ev(() => clearInterval(window.__keep));
// spelaren som syns får ingen granat
await scene({ W: 30, H: 21, p: [8, 10], en: [['ĳ', 16, 8], ['Ä', 17, 12], ['ĳ', 17, 10]], still: ['ĳ', 'Ä'] });
await wait(6000);
ok(await ev(() => __game.roles.st().nades === 0), 'en spelare som syns får ingen granat');

// 4) smartAI av: allt återställs (fart, nedkylning, flaggor, granater) och lagret är av
await scene({ W: 32, H: 22, p: [5, 11], en: [['W', 18, 11], ['S', 16, 9], ['S', 16, 13], ['K', 19, 9], ['@', 17, 7]], still: ['W', 'S', 'K'] });
for (let i = 0; i < 12 && !(await ev(() => __game.roles.buffed().length)); i++) await wait(250);
const offR = await ev(() => new Promise(res => { const g = __game, b0 = g.roles.buffed().length, dbg = { cmds: g.roles.cmds().length, sq: g.ai.squads(), f: { on: g.roles.flags.on, act: g.roles.flags.active, cmd: g.roles.flags.cmd }, n: g.ents().length, al: g.ents().filter(e => e.alert).length }; g.settings.smartAI = false; setTimeout(() => { const es = g.ents().filter(e => !e.dead);
  res({ b0, dbg, on: g.roles.on(), cmd: es.some(e => e.r25cmd || e.r25mor || e.r25g), sp: es.every(e => Math.abs(e.d.speed - (e.base.speed ? e.base.speed : 0)) < 1e-9 || e.base.speed === 0), cd: es.every(e => Math.abs(e.d.cd / e.base.cd - 1) < 1e-9), live: g.roles.live().length }); g.settings.smartAI = true; }, 300); }));
ok(offR.b0 >= 2 && !offR.on && !offR.cmd && offR.cd && offR.live === 0, 'smartAI av: rollerna, moralen och granaterna är borta, nedkylningen som förut ' + JSON.stringify(offR));

// 5) prestanda: 36 alerterade fiender med alla roller, 4× CPU-strypning. Före = version 24 (git show 9f93c98), efter = version 25.
const ring = (n, r0, r1, cx, cy, types) => { const out = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, r = r0 + (i % 3) * (r1 - r0) / 2; out.push([types[i % types.length], Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r)]); } return out; };
const pillars = []; for (let y = 3; y < 28; y += 4) for (let x = 9; x < 40; x += 3) pillars.push([x, y]);
const big = { W: 44, H: 30, p: [22, 15], walls: pillars, en: ring(36, 4, 11, 22, 15, ['S', 'K', '@', 'Ä', 'W', 'ĳ', 'K', 'S', 'Ő']) };
const cdp = await pg.context().newCDPSession(pg);
const B = 120, bench = async label => { await scene(big); await wait(1500); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await ev(() => __game.pause());
  const r = { on: [], off: [], r0: [] }; for (let i = 0; i < 7; i++) { r.off.push(await ev(B => __game.ai.bench(B, false), B)); r.on.push(await ev(B => __game.ai.bench(B, true), B));
    if (await ev(() => !!__game.roles)) { await ev(() => { __game.roles.flags.on = false; __game.roles.off(); }); r.r0.push(await ev(B => __game.ai.bench(B, true), B)); await ev(() => { __game.roles.flags.on = true; __game.roles.flags.active = true; }); } }
  await ev(() => __game.resume()); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const med = a => a.length ? Math.min(...a.slice(1)) : NaN; return { label, on: med(r.on), off: med(r.off), r0: med(r.r0), roles: await ev(() => __game.roles ? { cmds: __game.roles.cmds().length, buffed: __game.roles.buffed().length } : null) }; };
const ROOT = process.env.KRYPTA_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), BASE = path.resolve('out/t114/game_v24.js');
try { fs.writeFileSync(BASE, execSync(`git -C "${ROOT}" show 9f93c98:js/game.js`, { maxBuffer: 64 << 20 })); } catch (e) { console.log('     (version 24 saknas i git – ingen före-mätning)'); }
let pre = null;
if (fs.existsSync(BASE)) { process.env.GAME_JS = BASE; await load(); pre = await bench('v24'); delete process.env.GAME_JS; }
await load();
const post = await bench('v25');
console.log('     mätning (ms per bildruta för fiendeloopen, 4× strypning, minimum av 6):', JSON.stringify({ pre, post }));
ok(post.on < Math.max(post.r0 * 1.3, post.r0 + 0.25), `rollerna kostar lite: ${post.on.toFixed(3)} ms med rollerna, ${post.r0.toFixed(3)} ms utan (AI av ${post.off.toFixed(3)} ms)`);
if (pre) ok(post.on < Math.max(pre.on * 1.3, pre.on + 0.25), `före/efter: version 24 ${pre.on.toFixed(3)} ms, version 25 ${post.on.toFixed(3)} ms (AI av ${pre.off.toFixed(3)} → ${post.off.toFixed(3)} ms)`);
const bad = await ev(() => ({ err: __game.roles.err(), aiErr: __game.ai.err(), fail: __game.ents().filter(e => e.renderFail > 0).length }));
ok(!bad.err && !bad.aiErr && bad.fail === 0, 'inga fel i R25 eller AI24 och ingen fiende har kastat fel ' + JSON.stringify(bad));
await ev(() => clearInterval(window.__hold));

// 6) engelska
const texts = ['FRAMÅT!', 'HÅLL LINJEN!', 'BEFÄLET ÄR DÖTT!', 'SKÖLDAR UPP!', 'BAKOM MIG!', 'GRANAT!', 'GRANATEN', 'BEFÄLHAVAREN MED FANAN GER TRUPPEN MOD – DÖDA DEN FÖRST.', 'EN GRANAT PIPER DÄR RINGEN BLINKAR – SPRING UT UR DEN.'];
await load('&lang=en');
const en = await ev(b => b.map(s => [s, I18N.t(s)]), texts);
ok(en.every(([s, t]) => t && t !== s), 'texterna finns på engelska ' + JSON.stringify(en.map(p => p[1])));
await done();
