// t171: version 29 (SPEL), sparken under BARA NÄRSTRID. Sparken (och kolvslaget, och ett parerat skott som sparkas tillbaka) är närstrid och ska
// göra full skada på en våning med regeln BARA NÄRSTRID, inte en fjärdedel som skott. Skadan mäts genom den riktiga sparken (__game.v26b.kick(),
// som anropar spelets kick()) mot en larmad fiende med mycket hälsa precis framför spelaren, på en vanlig våning och på en BARA NÄRSTRID-våning.
// Skottet (hurtEnemy utan närstridsflagga) ska fortfarande bli en fjärdedel. Parering: ett fiendeskott på väg mot spelaren sparkas tillbaka och
// träffar skytten (opt.parry) – samma skada med och utan regeln. Flygsparken slutar i en spark (kick) och avrättar: kontrolleras att den fäller
// en vacklande fiende på BARA NÄRSTRID. Alla väntetider i speltid. Inga sidfel.
import { setup } from './head.mjs';
const PORT = 9871, OUT = process.env.S29_OUT || 'out/t171';
const { ev, wait, ok, start, done } = await setup(PORT, OUT);
await start();
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(60); } };
const gwait = sec => until(null, sec);
const floor = (d, rule) => ev(([d, rule]) => { const g = __game; if (rule) g.v28g.force(d, { chal: rule }); g.loadFloor(d); g.resume && g.resume(); for (const e of g.ents()) if (!e.boss) { e.dead = true; e.hidden = true; } const P = g.P; P.hp = 99999; return g.v28g.state().chal; }, [d, rule]);
// en fiende 1,1 rutor rakt framför spelaren (första fria riktningen); larmad, mycket hälsa, vacklar inte
const dummy = (dist = 1.1) => ev(dist => { const g = __game, P = g.P; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, x = P.x + Math.cos(a) * dist, y = P.y + Math.sin(a) * dist; if (!g.freeSpot(x, y, 0.3) || !g.hasLOS(P.x, P.y, x, y)) continue;
  P.a = a; const e = g.spawnEnemy('S', x, y); e.hp = e.maxHp = 100000; e.alert = true; e.d = { ...e.d, speed: 0, dmg: 0 }; e.staggered = true; window.__d = e; return true; } return false; }, dist);
const kickDmg = async () => { await ev(() => { __game.P.kickT = 0; }); const h0 = await ev(() => window.__d.hp); await ev(() => __game.v26b.kick()); await gwait(0.1); const h1 = await ev(() => window.__d.hp); return h0 - h1; };
const shotDmg = () => ev(() => { const g = __game, e = window.__d, h0 = e.hp; g.hurtEnemy(e, 4, e.x, e.y, { noProc: true }); return h0 - e.hp; });
const parryDmg = async () => { // ett fiendeskott från en skytt 4 rutor bort, mitt framför spelaren och på väg mot honom: sparken parerar och skottet går tillbaka
  const ok0 = await ev(() => { const g = __game, P = g.P, e = window.__d; const x = P.x + Math.cos(P.a) * 0.9, y = P.y + Math.sin(P.a) * 0.9; g.projectiles().push({ x, y, z: 0.5, vx: -Math.cos(P.a) * 2, vy: -Math.sin(P.a) * 2, kind: 'fireball', src: e, dmg: 5, life: 3 }); g.P.kickT = 0; return true; });
  const h0 = await ev(() => window.__d.hp); await ev(() => __game.v26b.kick()); await gwait(1.2); return ok0 ? h0 - await ev(() => window.__d.hp) : -1; };
const res = {};
for (const [tag, d, rule] of [['vanlig', 5, null], ['narstrid', 4, 'melee']]) {
  const chal = await floor(d, rule); await gwait(0.3);
  ok((chal || null) === rule, `${tag}: våningen har regeln ${chal}`);
  ok(await dummy(), `${tag}: en fiende framför spelaren`);
  const k = await kickDmg(), s = await shotDmg();
  let p = 0; for (let t = 0; t < 4 && p <= 0; t++) { await ev(() => { window.__d.dead = true; }); await dummy(2.5 + t * 0.5); p = await parryDmg(); } // (ibland hamnar skottet fel: nytt försök)
  res[tag] = { kick: +k.toFixed(3), shot: +s.toFixed(3), parry: +p.toFixed(3) };
  await ev(() => { window.__d.dead = true; });
}
console.log('INFO', JSON.stringify(res));
const a = res.vanlig, b = res.narstrid;
ok(a.kick > 0 && b.kick > 0 && Math.abs(b.kick - a.kick) <= a.kick * 0.05, `sparken gör full skada på BARA NÄRSTRID (${b.kick}) som på en vanlig våning (${a.kick}), inte en fjärdedel`);
ok(b.shot > 0 && Math.abs(b.shot - a.shot * 0.25) <= a.shot * 0.05, `skottet gör fortfarande en fjärdedel (${b.shot} mot ${a.shot})`);
ok(a.parry > 0 && Math.abs(b.parry - a.parry) <= a.parry * 0.05, `det parerade skottet gör full skada på BARA NÄRSTRID (${b.parry} mot ${a.parry})`);
// kolvslaget (bara med version 29:s API: spelet anropar bash() när allt ammo är slut)
if (await ev(() => !!(__game.s29 && __game.s29.bash))) {
  const out = {};
  for (const [tag, d, rule] of [['vanlig', 5, null], ['narstrid', 4, 'melee']]) { await floor(d, rule); await gwait(0.3); await dummy(); await ev(() => { __game.P.kickT = 0; }); const h0 = await ev(() => window.__d.hp); await ev(() => __game.s29.bash()); const h1 = await ev(() => window.__d.hp); out[tag] = h0 - h1; await ev(() => { window.__d.dead = true; }); }
  ok(out.vanlig > 0 && Math.abs(out.narstrid - out.vanlig) <= out.vanlig * 0.05, `kolvslaget gör full skada på BARA NÄRSTRID ${JSON.stringify(out)}`);
}
// flygsparken mot en vacklande fiende 3 rutor bort avrättar (slutar i kick())
await floor(4, 'melee'); await gwait(0.3);
const lunge = await ev(() => { const g = __game, P = g.P; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, x = P.x + Math.cos(a) * 3, y = P.y + Math.sin(a) * 3; if (!g.freeSpot(x, y, 0.4) || !g.hasLOS(P.x, P.y, x, y)) continue;
  P.a = a; P.stam = 1; P.kickT = 0; const e = g.spawnEnemy('S', x, y); e.hp = 3; e.maxHp = 100; e.alert = true; e.d = { ...e.d, speed: 0, dmg: 0 }; e.staggered = true; e.staggerT = g.v26b.t() + 3; e.stun = 3; window.__l = e; g.v26b.flags.lcd = 0; g.v26b.kick(); if (g.v26b.flags.L) return true; e.dead = true; e.hidden = true; } return false; }); // (bara en riktning där flygsparken faktiskt startar)
await gwait(1);
const lr = await ev(() => ({ dead: !!window.__l.dead, st: __game.v26b.state ? __game.v26b.state().st : null }));
ok(lunge && lr.dead, 'flygsparken fäller en vacklande fiende på BARA NÄRSTRID ' + JSON.stringify({ dead: lr.dead }));
await done();
