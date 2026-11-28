// t129: version 26B, parering mot bossar och väktare. Kontroller: Bödelns yxhugg (chop) utan spark skadar spelaren (kontroll); med en
// spark i fönstret blir det PARERAT – ingen skada, bossen bedövas kort (cirka 0,6 s), vacklar inte och kan inte avrättas, +PARERING och
// gult fönster (räknare, ritning); inom nedkylningen (4 s) är nästa hugg blått och går inte att parera; Ogerns markslag (smash) är blått
// och går aldrig att parera; ett specialanfall är blått de första 0,8 s; en väktare (guardian) följer samma regel; parering av (flaggan
// boss) ger ingen markering. Bossens fas och b.t påverkas inte. Inga sidfel. Alla väntetider räknas i speltid (__game.roles.t()).
import { setup } from './head.mjs';
const PORT = 9829;
const { pg, ev, wait, ok, done, shot, start } = await setup(PORT, 'out/t129');
await start(); // en runda behövs för bossbanan (run().depth)
await ev(() => { __game.profile.tutDone = true; __game.settings.autoLowFx = false; });
ok(await ev(() => !!__game.v26b && __game.v26b.flags.boss === true && !!__game.v26b.bossTable().executioner), '__game.v26b finns och bosspareringen är på');

const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);
const startBoss = async (id) => {
  await ev(id => { const g = __game, a0 = ({ executioner: 'prison', ogre: 'forest' })[id], ar = Gen.ARENAS.includes(a0) ? a0 : 'hall';
    const L = Gen.boss(4242, { arena: ar, boss: id }); L.bossId = id; g.run().depth = 6; g.startLevel(L); }, id);
  await until(() => !!__game.boss(), 5); await gwait(0.3);
  // spelaren 2,5 rutor framför bossen och vänd mot den, i stället hålls fast; bossen står still i 'idle' med lång nedkylning
  await ev(() => { const g = __game, b = g.boss(); b.d = { ...b.d, speed: 0 }; b.cd = 99; b.spT = 99; b.sinkT = 99; b.vanishT = 99; b.summonT = 99;
    const a = 0; let px = b.x - 2.5, py = b.y; for (let i = 0; i < 40 && !g.freeSpot(px, py, 0.3); i++) { const t = i * 0.157; px = b.x - Math.cos(t) * 2.5; py = b.y - Math.sin(t) * 2.5; }
    window.__pin = [px, py]; clearInterval(window.__hold); window.__hpHold = true;
    window.__hold = setInterval(() => { const g = __game, b = g.boss(); if (window.__hpHold !== false) g.P.hp = 1e6; g.P.x = window.__pin[0]; g.P.y = window.__pin[1]; if (b) g.P.a = Math.atan2(b.y - g.P.y, b.x - g.P.x); g.P.jz = 0; }, 30); });
  await gwait(0.3);
};
const hp100 = () => ev(() => { const g = __game; window.__hpHold = false; g.P.hp = 100; g.P.armor = 0; g.P.iframe = 0; g.P.shield = 0; });
// tvinga fram ett anfall och sparka i sidan (rAF) när fönstret har färgen w (0 = sparka inte)
const strike = (state, kickOn) => ev(([state, kickOn]) => new Promise(res => { const g = __game, b = g.boss(), t0 = g.v26b.t(); b.state = state; b.t = 0; b.didHit = false; b.cd = 99; b.stun = 0;
  let seen = 0, k = null; const ph0 = b.phase;
  const f = () => { const w = g.v26b.win(b); seen |= w === 1 ? 1 : w === 2 ? 2 : 0;
    if (kickOn && !k && w === kickOn) { g.P.kickT = 0; const p0 = g.v26b.bst().parries; g.v26b.kick(); k = { w, parried: g.v26b.bst().parries - p0, stun: +(b.stun || 0).toFixed(2), exec: g.canExec(b), didHit: b.didHit }; }
    if (b.state !== state || g.v26b.t() - t0 > 3) { b.cd = 99; return res({ seen, k, after: b.state, phase: b.phase === ph0, stunLeft: +(b.stun || 0).toFixed(2), staggerT: b.staggerT || 0 }); }
    requestAnimationFrame(f); }; requestAnimationFrame(f); }), [state, kickOn]);

// 1) Bödeln: kontroll utan spark – yxhugget skadar
await startBoss('executioner');
ok(await ev(() => __game.boss().id === 'executioner'), 'Bödeln finns');
await hp100();
const c1 = await strike('chop', 0); await gwait(0.2);
const c1hp = await ev(() => __game.P.hp);
ok(c1.seen & 1 && c1hp < 100, 'kontroll: yxhugget visar gult fönster och skadar utan spark ' + JSON.stringify({ c1, c1hp }));

// 2) spark i det gula fönstret: PARERAT, ingen skada, kort bedövning, ingen vacklan/avrättning
await ev(() => { window.__hpHold = true; }); await gwait(0.5); await hp100();
const d0 = await ev(() => __game.v26b.st().drawn);
const p2 = await strike('chop', 1); await gwait(0.2);
const r2 = await ev(() => ({ hp: __game.P.hp, feed: __game.styleRef().feed.map(f => f.t), drawn: __game.v26b.st().drawn }));
ok(p2.k && p2.k.parried === 1 && r2.hp >= 100, 'spark i fönstret parerar bossens hugg – ingen skada ' + JSON.stringify({ p2, r2 }));
ok(p2.k && p2.k.stun >= 0.55 && p2.k.stun <= 0.65 && !p2.k.exec && !p2.staggerT, 'bossen bedövas cirka 0,6 s men vacklar inte och kan inte avrättas ' + JSON.stringify(p2));
ok(r2.feed.includes('+PARERING') && p2.phase && p2.after !== 'chop', '+PARERING, fasen orörd och anfallet tar slut som vanligt ' + JSON.stringify({ feed: r2.feed, after: p2.after }));
ok(r2.drawn > d0, 'markeringen ritas över bossen ' + JSON.stringify({ d0, d1: r2.drawn }));

// 3) inom nedkylningen: nästa hugg är blått och går inte att parera
await ev(() => { window.__hpHold = true; }); await gwait(0.3); await hp100();
const p3 = await strike('chop', 2); await gwait(0.2);
const r3 = await ev(() => __game.P.hp);
ok(p3.k && p3.k.w === 2 && p3.k.parried === 0 && r3 < 100, 'inom 4 s är nästa hugg blått: ingen parering, slaget träffar ' + JSON.stringify({ p3, r3 }));
// efter nedkylningen går det igen
await ev(() => { window.__hpHold = true; }); await gwait(4.2); await hp100();
const p3b = await strike('chop', 1);
ok(p3b.k && p3b.k.parried === 1, 'efter nedkylningen går det att parera igen ' + JSON.stringify(p3b));

// 4) specialanfall: blått de första 0,8 s
const sp = await ev(() => new Promise(res => { const g = __game, b = g.boss(); b.state = 'special'; b.t = 0; b.didHit = false; b.spK = 1; const t0 = g.v26b.t(); let w0 = null;
  const f = () => { if (w0 === null && g.v26b.t() - t0 > 0.05) w0 = g.v26b.win(b); if (g.v26b.t() - t0 > 0.3) return res({ w0, state: b.state }); requestAnimationFrame(f); }; requestAnimationFrame(f); }));
ok(sp.w0 === 2, 'specialanfallet är blått i början ' + JSON.stringify(sp));
await gwait(1.5); await ev(() => { const b = __game.boss(); b.state = 'idle'; b.t = 0; b.cd = 99; b.spT = 99; });

// 5) väktare (guardian) med samma id: samma regel
await ev(() => { window.__hpHold = true; const b = __game.boss(); b.guardian = true; }); await gwait(4.2); await hp100();
const p5 = await strike('chop', 1); await gwait(0.2);
ok(p5.k && p5.k.parried === 1 && !p5.k.exec && (await ev(() => __game.P.hp)) >= 100, 'en väktare pareras som bossen (kort bedövning, ingen avrättning) ' + JSON.stringify(p5));

// 6) flaggan av: ingen markering och ingen parering
await ev(() => { window.__hpHold = true; __game.v26b.set('boss', false); }); await gwait(4.2);
const p6 = await strike('chop', 0);
ok(!(p6.seen & 3), 'med bosspareringen av visas ingen markering ' + JSON.stringify(p6));
await ev(() => __game.v26b.set('boss', true));

// 7) Ogern: markslaget är blått och går aldrig att parera
await startBoss('ogre'); await hp100();
const p7 = await strike('smash', 2); await gwait(0.2);
const r7 = await ev(() => __game.P.hp);
ok(p7.k && p7.k.w === 2 && p7.k.parried === 0 && !(p7.seen & 1) && r7 < 100, 'Ogerns markslag är blått: ingen parering, slaget träffar ' + JSON.stringify({ p7, r7 }));
await shot('ogre');
const err = await ev(() => __game.v26b.state().err);
ok(!err, 'inga fel i V26B ' + (err || ''));
await ev(() => clearInterval(window.__hold));
await done();
