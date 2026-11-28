// Version 27 FX del 2: dödseffekter efter material (metall, spöke, slem, kristall/is, eld) och spår efter fiendeskotten (eldklot,
// magi, pilar, syra). Fienderna dör genom spelets hurtEnemy och skotten flyger i spelets projektillista; kött och ben lämnas åt
// BLOOD/version 23, en fiende som sprängs i bitar (gib) får ingen dödseffekt till, lowfx stänger av, taken håller, render-kostnaden mäts
// med 4× CPU-strypning med och utan, inga sidfel. All väntan räknas i speltid (__game.roles.t()).
import { setup } from './head.mjs';
const PORT = 9842;
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t142');
const cerrs = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|404/.test(m.text())) cerrs.push(m.text().slice(0, 200)); });
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(60); } };
const gwait = sec => until(null, sec);
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const ready = async () => {
  await ev(() => { const g = __game; g.profile.tutDone = true; const grid = []; for (let y = 0; y < 20; y++) { const r = []; for (let x = 0; x < 30; x++) r.push(x === 0 || y === 0 || x === 29 || y === 19 ? '1' : '.'); grid.push(r); } grid[10][8] = 'P'; grid[2][27] = 'x'; g.playCustom({ grid, biome: 'dungeon' }); });
  await until(() => __game.state() === 'play' && !!__game.fx27, 5); await until(() => __game.banner() <= 0, 4);
  await ev(() => { const g = __game, P = g.P; P.x = 8.5; P.y = 10.5; P.a = 0; P.hp = 999; P.iframe = 99; g.settings.lowfx = false; g.settings.autoLowFx = false; g.settings.noFlash = false; const far = g.spawnEnemy('S', 27.5, 18.5); far.hp = far.maxHp = 9999; far.stun = 9999; far.sleep = true; }); await gwait(0.2); // en sovande fiende långt bort: salen töms aldrig (ingen portal framför kameran)
};
const st = () => ev(() => __game.fx27.state());
const clear = () => ev(() => { const g = __game; g.particles().length = 0; g.projectiles().length = 0; });
const killAt = (type, x, y, opt = {}) => ev(([type, x, y, opt]) => { const g = __game, e = g.spawnEnemy(type, x, y); e.stun = 99; e.sleep = true; Object.assign(e, opt); window.__e = e; return { mat: g.fx27.mat(e), sheet: e.d.sheet }; }, [type, x, y, opt]);
await ready();
// 1) en fiende per material dör genom hurtEnemy: rätt dödseffekt, en gång
const CASES = [['+', 'metal'], ['ž', 'metal'], ['Ü', 'ghost'], ['Ý', 'ghost'], ['ɪ', 'ghost'], ['Ǥ', 'slime'], ['Ë', 'crystal'], ['É', 'crystal'], ['Æ', 'fire'], ['ɵ', 'fire']];
for (const [ch, want] of CASES) {
  await clear(); const info = await killAt(ch, 12.5, 10.5); await gwait(0.1); const n0 = (await st()).n.kill;
  await ev(() => { const e = window.__e; e.hp = 1; __game.hurtEnemy(e, 6, e.x, e.y, { noProc: true }); }); await gwait(0.15);
  const n1 = (await st()).n.kill, got = Object.keys(n1).filter(k => n1[k] > n0[k]);
  ok(info.mat === want && got.length === 1 && got[0] === want && n1[want] === n0[want] + 1, `${info.sheet} (${want}) dör med sin effekt ` + JSON.stringify(got));
  if (ch === '+' || ch === 'Ü' || ch === 'Ǥ' || ch === 'Ë' || ch === 'Æ') { await gwait(0.15); await shot('kill_' + want); }
  await gwait(0.2); const n2 = (await st()).n.kill; ok(n2[want] === n1[want], `${info.sheet}: bara en gång`);
}
// 2) kött och ben: ingen dödseffekt härifrån (BLOOD och version 23)
for (const ch of ['S', 'Ä']) { await clear(); const info = await killAt(ch, 12.5, 10.5); await gwait(0.1); const n0 = JSON.stringify((await st()).n.kill);
  await ev(() => { const e = window.__e; e.hp = 1; __game.hurtEnemy(e, 6, e.x, e.y, { noProc: true }); }); await gwait(0.15);
  ok(info.mat === null && JSON.stringify((await st()).n.kill) === n0, `${info.sheet}: kött/ben lämnas åt BLOOD och version 23`); }
// 3) sprängd i bitar (gib): ingen dödseffekt till (version 23 sköter bitarna)
await clear(); await killAt('+', 12.5, 10.5); await gwait(0.1); let n0 = (await st()).n.kill;
await ev(() => { const e = window.__e; __game.hurtEnemy(e, e.hp * 20 + 500, e.x, e.y, { noProc: true }); e.gibbed = true; }); await gwait(0.15);
ok((await st()).n.kill.metal === n0.metal, 'en fiende som sprängs i bitar får ingen dödseffekt till');
// 4) spår efter fiendeskotten: eldklot, magi, pilar och syra i spelets projektillista
const shoot = kinds => ev(kinds => { const g = __game, pr = g.projectiles(); for (const [i, k] of kinds.entries()) pr.push({ x: 14 + i * 0.1, y: 8 + i * 1.3, z: 0.55, vx: -2.5, vy: 0, dmg: 0, src: { x: 20, y: 10 }, kind: k === 'fire' ? undefined : k, life: 2.5 }); }, kinds);
await clear(); n0 = (await st()).n.trails;
await shoot(['fire', 'orb', 'arrow', 'acid']); await gwait(0.6);
let s = await st();
ok(['fire', 'magic', 'arrow', 'acid'].every(k => s.n.trails[k] > n0[k]), 'eldklot, magiska kulor, pilar och syra får sina spår ' + JSON.stringify(Object.fromEntries(Object.keys(s.n.trails).map(k => [k, s.n.trails[k] - n0[k]]))));
await shot('trails');
await clear(); n0 = (await st()).n.trails;
await ev(() => __game.projectiles().push({ x: 14, y: 10.5, z: 0.5, vx: -2, vy: 0, dmg: 0, src: { x: 20, y: 10 }, kind: 'orb', life: 2, friendly: true })); await gwait(0.3);
ok(JSON.stringify((await st()).n.trails) === JSON.stringify(n0), 'spelarens egna skott får inga fiendespår');
// 5) tak: tjugo fiender dör samtidigt och trettio skott flyger
await clear(); await ev(() => { const g = __game; const t = ['+', 'Ü', 'Ǥ', 'Ë', 'Æ']; for (let i = 0; i < 20; i++) { const e = g.spawnEnemy(t[i % 5], 10 + (i % 5) * 1.5, 7 + (i / 5 | 0) * 1.6); e.stun = 99; } });
await gwait(0.1);
await ev(() => { const g = __game; for (const e of g.ents()) if (!e.dead) { e.hp = 1; g.hurtEnemy(e, 6, e.x, e.y, { noProc: true }); }; for (let i = 0; i < 30; i++) g.projectiles().push({ x: 18, y: 5 + i * 0.3, z: 0.5, vx: -1, vy: 0, dmg: 0, src: { x: 20, y: 10 }, kind: ['orb', 'acid', 'arrow', undefined][i % 4], life: 2 }); });
let maxP = 0; for (let i = 0; i < 8; i++) { await gwait(0.08); maxP = Math.max(maxP, await ev(() => __game.particles().length)); }
const mine = await ev(() => __game.particles().length);
ok(maxP <= 270 && mine <= 260, 'tjugo dödsfall och trettio skott: partikellistan inom taket 260 efter uppdateringen (högst ' + maxP + ' mellan två uppdateringar, där andra system lägger till)');
// 6) lowfx: inget nytt
await clear(); await gwait(1); s = await st();
await ev(() => { const g = __game; g.settings.lowfx = true; const e = g.spawnEnemy('+', 12.5, 10.5); e.stun = 99; window.__e = e; });
await gwait(0.1); await ev(() => { const e = window.__e; e.hp = 1; __game.hurtEnemy(e, 6, e.x, e.y, { noProc: true }); }); await shoot(['fire', 'orb']); await gwait(0.4);
const s2 = await st(); ok(JSON.stringify(s2.n.kill) === JSON.stringify(s.n.kill) && JSON.stringify(s2.n.trails) === JSON.stringify(s.n.trails), 'lowfx: inga dödseffekter och inga spår');
await ev(() => { __game.settings.lowfx = false; });
// 7) render-kostnad med 4× CPU-strypning: tio fiender av alla material dör och tolv fiendeskott flyger, med och utan version 27
await clear(); await gwait(1);
const cdp = await pg.context().newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const bs = { on: [], off: [] };
for (let i = 0; i < 9; i++) for (const off of [true, false]) {
  await ev(off => { const g = __game; g.resume(); g.fx27.setOff(off); g.particles().length = 0; g.projectiles().length = 0; const t = ['+', 'Ü', 'Ǥ', 'Ë', 'Æ'];
    for (let i = 0; i < 10; i++) { const e = g.spawnEnemy(t[i % 5], 11 + (i % 5) * 1.3, 8.5 + (i / 5 | 0) * 2.5); e.stun = 99; }
    for (let i = 0; i < 12; i++) g.projectiles().push({ x: 17, y: 7 + i * 0.6, z: 0.5, vx: -1.5, vy: 0, dmg: 0, src: { x: 20, y: 10 }, kind: ['orb', 'acid', 'arrow', undefined][i % 4], life: 3 }); }, off);
  await gwait(0.05);
  await ev(() => { const g = __game; for (const e of g.ents()) if (!e.dead) { e.hp = 1; g.hurtEnemy(e, 6, e.x, e.y, { noProc: true }); }; });
  await gwait(0.35);
  const r = await ev(() => { const g = __game; g.pause(); const n = g.particles().length, tick = g.fx27.tickMs(60), b = g.wproj.bench(45); g.resume(); return { ...b, n, tick }; });
  bs[off ? 'off' : 'on'].push(r);
}
await ev(() => { __game.fx27.setOff(false); }); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
const med = (a, k = 'med') => a.map(r => r[k]).sort((x, y) => x - y)[a.length >> 1];
const on = med(bs.on.slice(1)), offm = med(bs.off.slice(1));
console.log('BENCH', JSON.stringify({ medOn: on, medOff: offm, p90On: med(bs.on.slice(1), 'p90'), p90Off: med(bs.off.slice(1), 'p90'), partsOn: med(bs.on.slice(1), 'n'), partsOff: med(bs.off.slice(1), 'n'), tickOn: med(bs.on.slice(1), 'tick') }));
ok(on < Math.max(offm * 1.3, offm + 2.0), `render-kostnad med tio dödsfall och tolv skott (4× strypning): ${on.toFixed(2)} ms med, ${offm.toFixed(2)} ms utan`);
ok(med(bs.on.slice(1), 'tick') < 0.5, `update-kostnaden (fx27Tick med dödsfall och spår): ${med(bs.on.slice(1), 'tick').toFixed(3)} ms`);
ok(cerrs.length === 0, 'inga konsolfel ' + cerrs.join(' / '));
await done();
