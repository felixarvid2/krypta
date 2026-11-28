// t172: version 29 (SPEL), utmaningsportalen i en riktig runda, för varje regel (version 28:s fyra och version 29:s fyra). En ny runda med
// ?v28portal=<regel>: våning 2 rensas (sista fienden dör), portalen till nästa våning öppnas av spelet självt och utmaningsportalen står bredvid.
// Spelaren går in i den (ingen enterPortal), statistiken och kortvalet klickas igenom till våning 3. Där ska regeln gälla och synas i HUD (raden
// under meddelandena, s29HudText, som drawHudExtras ritar), och ha sin verkan. Sidan laddas om och rundan fortsätter ur sparningen (krypta.run,
// begin('continue')): regeln gäller fortfarande. Våningen klaras vid utgången: belöningen (exakt belopp i meddelandet) ges. Nästa våning: regeln är
// borta. MOT KLOCKAN: tiden räknas i speltid, varje dödad fiende ger mer tid, och när tiden tar slut kommer en straffvåg och den extra belöningen
// försvinner. Alla väntetider i speltid. Inga sidfel. T172_RULES=fast,glass ... kör bara några regler.
import { setup } from './head.mjs';
const PORT = +(process.env.T172_PORT || 9872), OUT = process.env.S29_OUT || 'out/t172';
const { pg, ev, wait, ok, start, done } = await setup(PORT, OUT);
pg.setDefaultNavigationTimeout(120000); pg.setDefaultTimeout(120000); // (sidan kan vara långsam när flera prov körs samtidigt)
const gt = () => ev(() => { if (window.__autoUI && window.CardUI && CardUI.isOpen() && __game.state() === 'ui') { const el = document.querySelector('.cu-talent, .cu-tcard'); if (el) el.click(); } return __game.roles.t(); }); // (nivå upp: talangvalet pausar spelet och väljs direkt)
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(60); } };
const gwait = sec => until(null, sec);
const hold = () => ev(() => { clearInterval(window.__hold); window.__hold = setInterval(() => { const g = window.__game; if (g && g.P) { g.P.hp = Math.max(g.P.hp, 60); g.P.iframe = 1; } }, 100); });
const unhold = () => ev(() => clearInterval(window.__hold));
const RULES = (process.env.T172_RULES || 'fast,noheal,melee,dark,onegun,glass,clock,hunger').split(',');
const NAME = { fast: 'SNABBA FIENDER', noheal: 'INGEN LÄKNING', melee: 'BARA NÄRSTRID', dark: 'MÖRKER', onegun: 'ETT VAPEN', glass: 'GLASKANON', clock: 'MOT KLOCKAN', hunger: 'HUNGER' };
// klicka igenom kortval och frågor tills våningen spelas
const toPlay = async depth => { for (let i = 0; i < 80; i++) { const s = await ev(d => { const g = __game; if (window.CardUI && CardUI.isOpen()) { const el = document.querySelector('.cu-card:not(.owned), .cu-opt, .cu-btn, .cu-li[role=button]'); if (el) el.click(); return 'ui'; } if (g.state() === 'stats') { g.nextFloor(); return 'stats'; } return g.state() === 'play' && g.run().depth === d ? 'play' : g.state(); }, depth); if (s === 'play') return true; await wait(150); } return false; };
const clearUI = async () => { for (let i = 0; i < 20; i++) { const open = await ev(() => { if (!(window.CardUI && CardUI.isOpen())) return false; const el = document.querySelector('.cu-talent, .cu-tcard, .cu-card:not(.owned), .cu-opt, .cu-btn, .cu-li[role=button]'); if (el) el.click(); return true; }); if (!open) return true; await wait(200); } return false; }; // (nivå upp efter dödandet: talangvalet pausar spelet)
const ruleNow = () => ev(() => { const g = __game, v = g.v28g.state(), s = g.s29 ? g.s29.state() : {}; return { chal: v.chal, hud: s.hud || '', depth: g.run().depth, saved: (g.run().v28 || {}).chal }; });
async function effect(rule) { // regelns verkan på våningen
  if (rule === 'fast') { const r = await ev(() => { const g = __game, e = g.ents().find(o => !o.dead && !o.boss && !o.guardian && o.d && o.d.speed > 0); if (!e) return null; const n = g.spawnEnemy(e.type, g.P.x + 3, g.P.y), s = n.d.speed; n.dead = true; return { floor: e.d.speed, fresh: s }; }); return [r && r.floor > r.fresh * 1.9, r]; }
  if (rule === 'noheal') { const h = await ev(() => { const g = __game; g.P.hp = 40; return { got: g.v28g.heal(25), hp: g.P.hp }; }); return [h.got === 0 && h.hp === 40, h]; }
  if (rule === 'melee') { const m = await ev(() => { const g = __game, e = g.spawnEnemy('S', g.P.x + 2, g.P.y); e.hp = e.maxHp = 1000; e.alert = true; g.hurtEnemy(e, 40, e.x, e.y, { noProc: true }); const a = 1000 - e.hp; e.dead = true; return { shot: a }; }); return [m.shot > 0 && m.shot <= 10.5, m]; }
  if (rule === 'dark') { const f = await ev(() => __game.v28g.floorEvent()); return [f === 'dark', f]; }
  if (rule === 'onegun') { const o = await ev(() => { const g = __game, P = g.P, gun = P.weapon, other = gun === 1 ? 2 : 1; P.has[other] = true; P.mags[other] = 5; g.switchWeapon(other); return { gun, other }; }); await gwait(0.8); const w = await ev(() => __game.P.weapon); return [w === o.gun, { ...o, after: w }]; }
  if (rule === 'glass') { const r = await ev(() => { const g = __game, P = g.P, e = g.spawnEnemy('S', P.x + 2, P.y); e.hp = e.maxHp = 1000; e.alert = true; g.hurtEnemy(e, 4, e.x, e.y, { noProc: true }); const out = 1000 - e.hp; e.dead = true;
    const S = g.s29.S; P.iframe = 0; P.shield = 0; P.armor = 0; P.hp = 500; g.hurtPlayer(10); const a = 500 - P.hp; const keep = S.rule; S.rule = null; P.iframe = 0; P.hp = 500; g.hurtPlayer(10); const b = 500 - P.hp; S.rule = keep; P.hp = 100; return { out, taken: a, normal: b }; });
    return [Math.abs(r.out - 8) < 0.01 && r.normal > 0 && Math.abs(r.taken - 2 * r.normal) < 0.01, r]; }
  if (rule === 'clock') { const [a, k0] = await ev(() => [__game.s29.clockLeft(), __game.kills()]); await gwait(2); const [b0, k1] = await ev(() => [__game.s29.clockLeft(), __game.kills()]); const b = b0 - 4 * (k1 - k0); // en fiende som dör av något annat under väntan ger 4 s extra
    const c = await ev(() => { const g = __game, e = g.ents().find(o => !o.dead && !o.boss && !o.guardian && !o.hidden); if (!e) return null; const t0 = g.s29.clockLeft(); g.hurtEnemy(e, 99999, e.x, e.y, { noProc: true }); return { before: t0, after: g.s29.clockLeft() }; });
    await clearUI();
    return [a > 30 && a - b > 1.6 && a - b < 2.6 && c && c.after - c.before > 3.5, { a, b, kill: c }]; }
  if (rule === 'hunger') { await ev(() => { __game.P.hp = 80; }); await gwait(3.2); const h = await ev(() => __game.P.hp);
    const k = await ev(() => { const g = __game, e = g.ents().find(o => !o.dead && !o.boss && !o.guardian && !o.hidden); if (!e) return null; const h0 = g.P.hp; g.hurtEnemy(e, 99999, e.x, e.y, { noProc: true }); return { h0 }; }); await clearUI(); await gwait(0.1); const h2 = await ev(() => __game.P.hp);
    return [h <= 78.01 && h >= 76.9 && k && h2 - k.h0 >= 4.9, { after3s: h, kill: k, h2 }]; }
  return [false, 'okänd regel'];
}
for (const rule of RULES) {
  await start('&v28portal=' + rule); await ev(() => { window.__autoUI = true; });
  await ev(() => { const g = __game; g.loadFloor(2); g.resume && g.resume(); }); await gwait(0.4);
  await hold();
  await ev(() => __game.killAllCheat()); await wait(300); await clearUI(); await gwait(0.6); await clearUI(); // sista fienden dör: spelet öppnar portalen själv
  if (!(await ev(() => __game.portals().length))) { await ev(() => { const g = __game; for (const e of g.ents()) if (!e.dead) { e.hidden = false; e.dormant = false; e.asleep = false; g.hurtEnemy(e, 1e7, e.x, e.y, { noProc: true }); } }); await gwait(0.8); } // (gömda, sovande fiender och väktaren: annars öppnas ingen portal)
  const ps = await ev(() => __game.portals().map(p => ({ kind: p.kind, v28: p.v28 || null, x: p.x, y: p.y })));
  const mine = ps.find(p => p.v28);
  ok(!!mine && mine.v28.chal === rule, `${rule}: utmaningsportalen öppnas bredvid portalen till nästa våning ${JSON.stringify(ps.map(p => p.v28 ? p.v28 : p.kind))}`);
  if (!mine) { await unhold(); continue; }
  await ev(m => { const g = __game, P = g.P; for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2, Math.PI / 4, -Math.PI / 4]) { const x = m.x + Math.cos(a) * 1.4, y = m.y + Math.sin(a) * 1.4; if (g.freeSpot(x, y, 0.3) && g.portals().every(q => q === g.portals().find(z => z.v28) || Math.hypot(q.x - x, q.y - y) > 1.3)) { P.x = x; P.y = y; P.a = Math.atan2(m.y - y, m.x - x); return; } } P.x = m.x + 1.4; P.y = m.y; }, mine);
  await clearUI(); await gwait(1.0);
  const hint = await ev(() => __game.v28g.hint());
  ok(hint.includes(NAME[rule]) && /GULD/.test(hint), `${rule}: portalen visar regeln och belöningen: ${hint}`);
  if (rule === 'dark' || rule === 'fast') await pg.screenshot({ path: `${OUT}/${rule}_portal.png` });
  // gå in: steg för steg mot portalens mitt
  for (let i = 0; i < 12; i++) { const st = await ev(m => { const g = __game, P = g.P; if (g.state() !== 'play') return g.state(); P.x += (m.x - P.x) * 0.35; P.y += (m.y - P.y) * 0.35; return 'play'; }, mine); if (st !== 'play') break; await gwait(0.12); }
  await until(() => __game.state() === 'stats', 3);
  if (await ev(() => __game.state() === 'play')) { // (ett talangval kan ha avbrutit gången: ställ spelaren i portalens mitt och vänta igen)
    await ev(m => { const g = __game, p = g.portals().find(q => q.v28), P = g.P; if (p) { P.x = p.x; P.y = p.y; } }, mine); await until(() => __game.state() === 'stats', 3); }
  const sv = await ev(() => ({ st: __game.state(), chal: (__game.run().v28 || {}).chal }));
  ok(sv.st === 'stats' && sv.chal && sv.chal[3] === rule, `${rule}: spelaren gick in i portalen, våning 2 klar och regeln vald för djup 3 ${JSON.stringify(sv)}`);
  ok(await toPlay(3), `${rule}: statistik och kortval till våning 3`);
  await gwait(0.4);
  const r3 = await ruleNow();
  const hudOk = rule === 'clock' ? /^MOT KLOCKAN · \d+:\d\d$/.test(r3.hud) : rule === 'onegun' ? /^ETT VAPEN · /.test(r3.hud) : r3.hud === 'UTMANING · ' + NAME[rule];
  ok(r3.chal === rule && hudOk, `${rule}: regeln gäller på våning 3 och syns i HUD: "${r3.hud}"`);
  await pg.screenshot({ path: `${OUT}/${rule}_hud.png` });
  // spara och ladda: sidan laddas om och rundan fortsätter ur sparningen
  const gun0 = await ev(() => __game.P.weapon);
  await unhold();
  await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 60000 });
  const hasSave = await ev(() => !!localStorage.getItem(Object.keys(localStorage).find(k => /run/.test(k)) || 'x'));
  await ev(() => { window.__autoUI = true; __game.profile.tutDone = true; __game.begin('continue'); }); await wait(1500); await ev(() => { const g = __game; if (g.state() !== 'play' && g.resume) g.resume(); }); await wait(300); // (ingen Escape: den pausar spelet)
  await hold(); await gwait(0.4);
  const r3b = await ruleNow(), gun1 = await ev(() => __game.P.weapon);
  ok(hasSave && r3b.depth === 3 && r3b.chal === rule && r3b.hud === r3.hud.replace(/\d+:\d\d$/, m => r3b.hud.slice(-m.length)) && (rule !== 'onegun' || gun1 === gun0), `${rule}: efter omladdning (krypta.run) gäller regeln fortfarande: ${JSON.stringify({ depth: r3b.depth, chal: r3b.chal, hud: r3b.hud })}`);
  const [eok, info] = await effect(rule);
  ok(eok, `${rule}: regelns verkan ${JSON.stringify(info)}`);
  // klar vid utgången: belöningen
  const exp = await ev(rule => __game.v28g.state() && (60 + 20 * __game.run().depth) + __game.s29.bonus(rule), rule);
  const g0 = await ev(() => __game.run().gold);
  await ev(() => { const g = __game, L = g.lvl(); g.P.x = L.exit.x + 0.5; g.P.y = L.exit.y + 0.5; }); await until(() => __game.state() === 'stats', 2);
  const res = await ev(() => ({ gold: __game.run().gold, st: __game.state(), done: __game.v28g.state().done, reward: __game.v28g.state().reward }));
  const got = res.reward;
  ok(res.st === 'stats' && res.done && got === exp && res.gold - g0 >= exp, `${rule}: belöningen när våningen klaras: +${got} (väntat +${exp}, guld +${res.gold - g0})`);
  ok(await toPlay(4), `${rule}: vidare till våning 4`);
  await gwait(0.3);
  const r4 = await ruleNow();
  ok(!r4.chal && r4.hud === '', `${rule}: regeln släpps på nästa våning ${JSON.stringify(r4)}`);
  await unhold();
}
// MOT KLOCKAN: tiden tar slut – straffvåg, och bara den vanliga belöningen
if (RULES.includes('clock')) {
  await start(); await ev(() => { window.__autoUI = true; });
  await hold();
  const a = await ev(() => { const g = __game; g.v28g.force(4, { chal: 'clock' }); g.loadFloor(4); g.resume && g.resume(); return { n: g.ents().filter(e => !e.dead).length, total: g.v28g.total() }; });
  await gwait(0.3);
  await ev(() => { const S = __game.s29.S; S.clock.base -= __game.s29.clockLeft() - 1.5; }); // (1,5 s kvar)
  await gwait(2.2);
  const b = await ev(() => { const g = __game, s = g.s29.state(); return { over: s.clockOver, hud: s.hud, total: g.v28g.total(), wave: g.ents().filter(e => e.s29wave && !e.dead).length, msgs: g.msgs().map(m => m.text).join(' | ') }; });
  ok(b.over && b.wave >= 3 && b.total === a.total + b.wave && /STRAFFVÅG/.test(b.msgs) && b.hud === 'MOT KLOCKAN · ÖVERTID', `MOT KLOCKAN: tiden ute – straffvåg med ${b.wave} fiender, HUD "${b.hud}"`);
  await pg.screenshot({ path: `${OUT}/klocka_overtid.png` });
  const exp = await ev(() => 60 + 20 * __game.run().depth);
  await ev(() => { const g = __game, L = g.lvl(); g.P.x = L.exit.x + 0.5; g.P.y = L.exit.y + 0.5; }); await until(() => __game.state() === 'stats', 2);
  const got = await ev(() => __game.v28g.state().reward);
  ok(got === exp, `MOT KLOCKAN efter övertid: bara den vanliga belöningen (+${got}, väntat +${exp})`);
  await unhold();
}
await done();
