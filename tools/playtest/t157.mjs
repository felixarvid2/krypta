// t157: version 28 (GEN), utmaningsvåningen i portalen. När portalen till nästa våning öppnas (djup 3 och djupare, inte före en boss) står ibland en
// tredje portal bredvid: en utmaningsvåning med en regel och en större belöning (här tvingad med ?v28portal=fast). Portalen visar regeln och
// belöningen, och går man in i den gäller regeln på nästa våning. Varje regel prövas: SNABBA FIENDER (dubbel fart), INGEN LÄKNING (heal ger 0),
// BARA NÄRSTRID (skott gör en fjärdedel av skadan, närstrid full skada) och MÖRKER (våningshändelsen mörk). När våningen är klar ges belöningen.
// Våningen spelas från start till utgång. Alla väntetider i speltid. Inga sidfel. Skärmbilder i OUT (LVL28_OUT).
import { setup } from './head.mjs';
const PORT = 9857, OUT = process.env.LVL28_OUT || 'out/t157';
const { pg, ev, wait, ok, start, done } = await setup(PORT, OUT);
await start('&v28portal=fast');
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(60); } };
const gwait = sec => until(null, sec);
const calm = () => ev(() => { const g = __game; g.P.hp = 99999; window.__calm = setInterval(() => { __game.P.hp = 99999; }, 100); });
const uncalm = () => ev(() => clearInterval(window.__calm));
// djup 2 -> portalen till djup 3
await ev(() => { const g = __game; g.loadFloor(2); g.resume && g.resume(); });
await gwait(0.4);
const pr = await ev(() => { const g = __game, P = g.P; g.v28g.portal(P.x, P.y); const ps = g.portals(); return ps.map(p => ({ kind: p.kind, v28: p.v28 || null, biome: p.biome || null, x: p.x, y: p.y })); });
const mine = pr.find(p => p.v28);
ok(!!mine && mine.v28.chal === 'fast', 'utmaningsportalen står bredvid portalerna till nästa våning: ' + JSON.stringify(pr));
if (mine) {
  await ev(m => { const g = __game, P = g.P; for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { const x = m.x + Math.cos(a) * 1.5, y = m.y + Math.sin(a) * 1.5; if (g.freeSpot(x, y, 0.3)) { P.x = x; P.y = y; P.a = Math.atan2(m.y - y, m.x - x); return; } } P.x = m.x + 1.2; P.y = m.y; P.a = Math.PI; }, mine); await gwait(2.5);
  await pg.screenshot({ path: `${OUT}/portaler.png` });
  const hint = await ev(() => __game.v28g.hint());
  ok(/UTMANING: SNABBA FIENDER/.test(hint || ''), 'portalen visar regeln och belöningen: ' + hint);
  await ev(m => { const g = __game, p = g.portals().find(q => q.v28); g.enterPortal(p); }, mine); await gwait(0.5);
  const ch = await ev(() => { const r = __game.run(); return { chal: r.v28 && r.v28.chal, state: __game.state() }; });
  ok(ch.chal && ch.chal[3] === 'fast', 'portalen valde utmaningen för djup 3: ' + JSON.stringify(ch));
}
// varje regel på en våning
const RULES = ['fast', 'noheal', 'melee', 'dark'];
for (let k = 0; k < RULES.length; k++) {
  const rule = RULES[k], d = 3 + (k % 2);
  const info = await ev(([rule, d]) => { const g = __game; g.v28g.force(d, { chal: rule }); g.loadFloor(d); g.resume && g.resume(); const v = g.v28g.state(); return { chal: v.chal, msgs: g.msgs().map(m => m.text).join(' | ') }; }, [rule, d]);
  await gwait(0.3);
  ok(info.chal === rule && info.msgs.includes('UTMANING'), `${rule}: regeln gäller och visas (${info.msgs})`);
  if (rule === 'fast') { const r = await ev(() => { const g = __game, e = g.ents().find(o => !o.dead && !o.boss && !o.guardian && o.d && o.d.speed > 0); if (!e) return null; const n = g.spawnEnemy(e.type, g.P.x + 3, g.P.y), s = n.d.speed; n.dead = true; return { type: e.type, floor: e.d.speed, fresh: s }; });
    ok(r && r.floor > r.fresh * 1.9, 'fast: fienderna rör sig dubbelt så fort ' + JSON.stringify(r)); }
  if (rule === 'noheal') { const h = await ev(() => { const g = __game; g.P.hp = 40; const got = g.v28g.heal(25), over = g.v28g.overheal(25); return { got, over, hp: g.P.hp }; }); ok(h.got === 0 && h.over === 0 && h.hp === 40, 'noheal: ingen läkning, inte heller avrättningarnas läkning över max ' + JSON.stringify(h)); }
  if (rule === 'melee') { const m = await ev(() => { const g = __game, e = g.spawnEnemy('S', g.P.x + 2, g.P.y); e.hp = e.maxHp = 1000; g.hurtEnemy(e, 40, e.x, e.y, { noProc: true }); const a = 1000 - e.hp; const h0 = e.hp; g.hurtEnemy(e, 40, e.x, e.y, { melee: true, noProc: true }); const b = h0 - e.hp; e.dead = true; return { shot: a, melee: b }; });
    ok(m.shot > 0 && m.shot <= m.melee * 0.3, 'melee: skott gör en fjärdedel av närstridens skada ' + JSON.stringify(m)); }
  if (rule === 'dark') { const f = await ev(() => __game.v28g.floorEvent()); ok(f === 'dark', 'dark: våningen är mörk (' + f + ')'); await gwait(0.4); await pg.screenshot({ path: `${OUT}/morker.png` }); }
  // klar: belöningen
  await calm();
  const g0 = await ev(() => __game.run().gold);
  await ev(() => { const g = __game, L = g.lvl(); g.P.x = L.exit.x + 0.5; g.P.y = L.exit.y + 0.5; }); await gwait(0.5);
  const res = await ev(() => ({ gold: __game.run().gold, st: __game.state(), done: __game.v28g.state().done }));
  ok(res.st === 'stats' && res.done && res.gold - g0 >= 60, `${rule}: våningen klar vid utgången, belöning +${res.gold - g0} guld (state ${res.st})`);
  await uncalm();
  if (k === 0) await pg.screenshot({ path: `${OUT}/klar.png` });
}
await done();
