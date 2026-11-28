// t156: version 28 (GEN), blodvåningen. Samma bana med och utan level.blood28: blodvåningen har cirka 1,6 gånger så många fiender (totalEnemies
// räknas upp, inga extra fiender i vaktarens sal), två extra kistor, blod på väggarna från start (BLOOD:s väggstänk), röd färgton (gradeLUT) och
// namnet visas när den börjar. Med BLOD AV blir det inget väggblod men fortfarande fler fiender. Blodvåningen kan också väljas i förväg (run.v28.blood,
// portalen). Våningen spelas från start till utgång. Alla väntetider i speltid. Inga sidfel. Skärmbilder i OUT (LVL28_OUT).
import { setup } from './head.mjs';
const PORT = 9856, OUT = process.env.LVL28_OUT || 'out/t156';
const { pg, ev, wait, ok, start, done } = await setup(PORT, OUT);
await start();
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(60); } };
const gwait = sec => until(null, sec);
const load = (seed, depth, opts) => ev(([s, d, o]) => { const g = __game; g.run().depth = d; const L = Gen.floor(s, d, o); g.startLevel(L); g.resume && g.resume(); return { blood: L.blood28, biome: L.biome }; }, [seed, depth, opts]);
const snap = () => ev(() => { const g = __game, v = g.v28g.state(); return { n: g.ents().filter(e => !e.dead && !e.boss && !e.guardian).length, total: g.v28g.total(), grade: g.v28g.grade(), chests: g.chests().length, extra: v.extra, walls: v.walls, blood: v.blood, name: g.lvl().name, g1: 0, msgs: g.msgs().map(m => m.text).join(' | ') }; });
const calm = () => ev(() => { const g = __game; for (const e of g.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } g.P.hp = 99999; window.__calm = setInterval(() => { const P = __game.P; P.hp = 99999; for (const e of __game.ents()) if (e.d && (e.d.speed || e.d.dmg)) e.d = { ...e.d, speed: 0, dmg: 0 }; }, 100); });
const uncalm = () => ev(() => clearInterval(window.__calm));
const SEED = 't156-blod', D = 3, OPT = { biome: 'dungeon' };
await ev(() => { __game.settings.blood = 2; });
await load(SEED, D, Object.assign({ v28: { blood: false } }, OPT)); await gwait(0.3); const a = await snap();
await pg.screenshot({ path: `${OUT}/vanlig.png` });
await load(SEED, D, Object.assign({ v28: { blood: true } }, OPT)); await gwait(0.5); const b = await snap();
ok(a.blood === false && b.blood === true, `blodvåningen startar (${b.name})`);
ok(b.msgs.includes('BLODVÅNINGEN') && b.name.startsWith('BLODVÅNINGEN'), 'namn och text visas: ' + b.msgs);
const ratio = b.total / Math.max(1, a.total);
ok(ratio >= 1.35 && ratio <= 1.75 && b.extra > 0 && b.total - a.total === b.extra, `fler fiender: ${a.total} -> ${b.total} (×${ratio.toFixed(2)}, ${b.extra} extra)`);
ok(b.chests >= a.chests + 2, `fler kistor: ${a.chests} -> ${b.chests}`);
ok(b.walls >= 10, `blod på väggarna från start: ${b.walls} stänk`);
ok(b.grade[1] < a.grade[1] * 0.85 && b.grade[2] < a.grade[2] * 0.85, `röd färgton: ${JSON.stringify(a.grade)} -> ${JSON.stringify(b.grade.map(v => Math.round(v)))}`);
await ev(() => { const P = __game.P; P.a += 0.4; }); await gwait(0.5); await pg.screenshot({ path: `${OUT}/blodvaning.png` });
const guard = await ev(() => { const g = __game, L = g.lvl(), gi = L.rooms.findIndex(r => r.type === 'guardian'); return g.ents().filter(e => e.blood28 && gi >= 0 && L.roomMask[e.y | 0].charCodeAt(e.x | 0) - 48 === gi).length; });
ok(guard === 0, 'inga extra fiender i vaktarens sal: ' + guard);
// spela till utgången
await calm();
const st = await ev(async () => { const g = __game, L = g.lvl(); g.P.x = L.exit.x + 0.5; g.P.y = L.exit.y + 0.5; return g.state(); }); await gwait(0.5);
ok((await ev(() => __game.state())) === 'stats', 'blodvåningen kan avslutas vid utgången (state ' + (await ev(() => __game.state())) + ')');
await uncalm();
// BLOD AV: inga väggstänk, men fortfarande fler fiender
await ev(() => { __game.settings.blood = 0; });
await load(SEED, D, Object.assign({ v28: { blood: true } }, OPT)); await gwait(0.3); const c = await snap();
ok(c.walls === 0 && c.extra > 0, `BLOD AV: inget väggblod (${c.walls}), fler fiender (${c.extra})`);
await ev(() => { __game.settings.blood = 2; });
// vald i förväg (portalen): run.v28.blood[djup]
await ev(() => { __game.v28g.force(4, { blood: true }); });
await load('t156-portal', 4, { biome: 'prison', v28: { blood: false } }); await gwait(0.3); const p = await snap();
ok(p.blood && p.extra > 0, `blodvåning vald i förväg (run.v28.blood): ${JSON.stringify({ blood: p.blood, extra: p.extra })}`);
// en vanlig våning med opts.v28off blir aldrig blodvåning
await load('t156-av', 3, { biome: 'dungeon', v28off: true }); await gwait(0.3); const o = await snap();
ok(!o.blood && o.extra === 0, 'opts.v28off: ingen blodvåning');
await done();
