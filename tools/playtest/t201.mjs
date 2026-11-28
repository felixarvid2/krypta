// t201: version 30 (ALTARE) – förbunden och deras verkan. Valet vid altaret (E): tre erbjudanden (samma vid en ny laddning), GÅ DÄRIFRÅN lämnar
// altaret orört, ett val tar förbundet och altaret är förbrukat. Högst tre förbund; med tre kan altaret bryta ett. Varje förbund mäts: korten (mods),
// exploderande lik (glöd, sedan en smäll som bara skadar spelaren), drycker som inte läker, mörkare våning och ett kort vid våningsslutet, snabbare
// fiender och dubbel sprängskada, eliter och guldkistor, fler fiender, starkare bossar. Kontrastläget: MÖRKARE erbjuds inte och blir +15 % hälsa på
// fienderna. Väntan i speltid. Inga sidfel. Port 9901.
import { setup } from './head.mjs';
const PORT = +(process.env.T201_PORT || 9901);
const { pg, ev, wait, ok, done, until, gwait } = await setup(PORT, 'out/t201');
pg.setDefaultTimeout(120000);
const clearUI = async () => { for (let i = 0; i < 20; i++) { const open = await ev(() => { if (!(window.CardUI && CardUI.isOpen())) return false; const el = document.querySelector('.cu-talent, .cu-tcard, .cu-card:not(.owned), .cu-opt, .cu-btn'); if (el) el.click(); return true; }); if (!open) return; await wait(150); } };
const load = async (q = '') => { await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&seed=t201${q}`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 120000 }); await ev(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; __game.begin('new'); }); await wait(600); await clearUI(); await until(() => __game.state() === 'play', 5); };
const hold = () => ev(() => { clearInterval(window.__hold); window.__hold = setInterval(() => { const g = window.__game; if (g && g.P && g.state() === 'play') { for (const e of g.ents()) if (!e.dead && !e.boss) { e.alert = false; e.sleep = true; } } }, 100); });
await load('&a30altar=1');
await hold();
// 1. valet vid altaret: tre erbjudanden + GÅ DÄRIFRÅN; att gå därifrån lämnar altaret orört
const o1 = await ev(() => { const g = __game; g.loadFloor(2); const a = g.a30.state().altar; g.P.x = a.x + 0.5; g.P.y = a.y + 1.6; g.P.a = -Math.PI / 2; return { offers: g.a30.offers(), altar: a }; });
await gwait(0.3);
const ui1 = await ev(() => { __game.useProp(); return [...document.querySelectorAll('#cardui .cu-opt .cu-ol')].map(e => e.textContent); });
const offerLabels = o1.offers.map(id => '').length;
await ev(() => { const b = [...document.querySelectorAll('#cardui .cu-opt')]; b[b.length - 1].click(); });
await wait(300);
const after1 = await ev(() => ({ s: __game.a30.state(), st: __game.state() }));
console.log(JSON.stringify({ ui1, offers: o1.offers }));
ok(ui1.length === 4 && /GÅ DÄRIFRÅN/.test(ui1[3]) && ui1.slice(0, 3).every(t => / – /.test(t)), 'E vid altaret: tre förbund (FÖRBANNELSE – VÄLSIGNELSE) och GÅ DÄRIFRÅN');
ok(after1.s.pacts.length === 0 && after1.s.altar && !after1.s.altar.used, 'GÅ DÄRIFRÅN: inget förbund, altaret står kvar');
await ev(() => __game.useProp()); await wait(200);
await ev(() => document.querySelectorAll('#cardui .cu-opt')[0].click()); await wait(300);
const after2 = await ev(() => __game.a30.state());
ok(after2.pacts.length === 1 && after2.pacts[0] === o1.offers[0] && after2.altar.used, 'ett val: förbundet tas och altaret är förbrukat ' + after2.pacts[0]);
const again = await ev(() => { __game.useProp(); return window.CardUI && CardUI.isOpen(); });
ok(!again, 'ett förbrukat altare öppnar inget val');
// 2. högst tre förbund; med tre bryter altaret ett
const max = await ev(() => { const g = __game, ids = g.a30.pairs.filter(id => !g.a30.state().pacts.includes(id)); const r = [g.a30.give(ids[0]), g.a30.give(ids[1]), g.a30.give(ids[2])]; return { r, pacts: g.a30.state().pacts }; });
ok(max.r[0] && max.r[1] && !max.r[2] && max.pacts.length === 3, 'högst tre förbund per runda');
const brk = await ev(() => { const g = __game; g.loadFloor(3); const a = g.a30.state().altar; g.P.x = a.x + 0.5; g.P.y = a.y + 1.6; g.useProp(); const labels = [...document.querySelectorAll('#cardui .cu-opt .cu-ol')].map(e => e.textContent); document.querySelectorAll('#cardui .cu-opt')[0].click(); return { labels, pacts: g.a30.state().pacts }; });
ok(brk.labels.length === 4 && brk.labels.slice(0, 3).every(t => /^(\[\d\] )?BRYT/.test(t)) && brk.pacts.length === 2, 'med tre förbund kan altaret bryta ett');
await ev(() => { const g = __game; for (const id of g.a30.state().pacts) g.a30.brk(id); });
// 3. korten (mods) för förbunden med siffror
const MODS = { boom: { dmg: 0.3 }, nopot: { goldMul: 0.5 }, scarce: { ammoMul: -0.5, headshot: 1.5 }, frail: { maxHp: -25, critChance: 0.15 }, brutal: { damageTaken: 0.25, lifesteal: 0.04 }, poor: { goldMul: -0.5, fireRate: 0.25 },
  horde: { killHeal: 3 }, greed: { shopDiscount: -0.3, regen: 0.5 }, reload: { reloadSpeed: -0.3, magSize: 0.5 }, tyrant: { extraLife: 1 }, heavy: { moveSpeed: -0.12, meleeDmg: 0.5 } };
let modsOK = true; const bad = [];
for (const [id, want] of Object.entries(MODS)) {
  const r = await ev(([id, want]) => { const g = __game, m0 = { ...g.mods() }; g.a30.give(id); const m1 = { ...g.mods() }; const out = {}; for (const k in want) out[k] = +((m1[k] || 0) - (m0[k] || 0)).toFixed(3); g.a30.brk(id); return out; }, [id, want]);
  for (const k in want) if (Math.abs(r[k] - want[k]) > 1e-6) { modsOK = false; bad.push(id + '.' + k + '=' + r[k]); }
}
ok(modsOK, 'förbundens kort (mods) läggs på och tas bort ' + bad.join(' '));
const hp25 = await ev(() => { const g = __game; g.P.hp = 100; g.a30.give('frail'); const h = g.P.hp; g.a30.brk('frail'); return h; });
ok(hp25 <= 75, '−25 MAX HÄLSA: hälsan sänks direkt till det nya taket (' + hp25 + ')');
// 4. FIENDERNA EXPLODERAR NÄR DE DÖR: glöd, sedan en smäll som skadar spelaren (men inte fienderna)
await ev(() => { const g = __game; g.loadFloor(4); g.a30.give('boom'); });
const b0 = await ev(() => { const g = __game; g.P.hp = 100; g.P.iframe = 0; const e = g.spawnEnemy('S', g.P.x + 0.8, g.P.y), f = g.spawnEnemy('S', g.P.x + 1.2, g.P.y + 0.5); window.__f = f; f.hp = f.maxHp = 1e4; e.hp = 1; g.hurtEnemy(e, 50, e.x, e.y, {}); return { dead: e.dead, blasts: g.a30.state().blasts, hp: g.P.hp, fhp: f.hp }; });
await gwait(0.25);
const b1 = await ev(() => ({ blasts: __game.a30.state().blasts, hp: __game.P.hp }));
await gwait(0.5);
const b2 = await ev(() => ({ blasts: __game.a30.state().blasts, hp: __game.P.hp, st: __game.a30.state().st, fhp: window.__f.hp }));
console.log(JSON.stringify({ b0, b1, b2 }));
ok(b0.dead && b0.blasts === 1 && b1.hp === 100, 'liket glöder först (ingen skada direkt)');
ok(b2.blasts === 0 && b2.hp < 100 && b2.st.boomHits >= 1 && b2.fhp === b0.fhp, `efter en halv sekund smäller det: spelaren tar skada (${b2.hp}), fienden bredvid inte`);
await ev(() => __game.a30.brk('boom'));
// 5. INGEN LÄKNING AV DRYCKER (men brunnar och annat läker)
const pot = await ev(() => { const g = __game; g.a30.give('nopot'); g.P.hp = 40; g.P.potions = [{ id: 'heal', strong: false }]; g.P.drinkCd = 0; g.drinkPotion(); const a = g.P.hp; g.P.hp = 40; g.v28g.heal(20); const b = g.P.hp; g.a30.brk('nopot'); g.P.hp = 40; g.P.potions = [{ id: 'heal', strong: false }]; g.P.drinkCd = 0; g.drinkPotion(); return { a, b, c: g.P.hp }; });
ok(pot.a === 40 && pot.b > 40 && pot.c > 40, `ingen läkning av drycker (${pot.a}), annan läkning fungerar (${pot.b}), utan förbundet läker drycken (${pot.c})`);
// 6. MÖRKARE VÅNINGAR – +1 KORT VID VARJE VÅNINGSSLUT
const dark = await ev(() => { const g = __game; g.loadFloor(5); const amb0 = g.lvl().ambient; g.a30.give('dark'); const amb1 = g.lvl().ambient; g.loadFloor(5); const amb2 = g.lvl().ambient;
  const n0 = g.run().owned.length; g.floorDone(); return { amb0, amb1, amb2, n0, n1: g.run().owned.length, st: g.state() }; });
const extra = await ev(() => document.getElementById('fe-extra') ? document.getElementById('fe-extra').textContent : '');
ok(Math.abs(dark.amb1 - dark.amb0 * 0.6) < 1e-6 && Math.abs(dark.amb2 - dark.amb0 * 0.6) < 1e-6, `mörkare våningar: ljuset ×0,6 (${dark.amb0} → ${dark.amb2})`);
ok(dark.st === 'stats' && dark.n1 === dark.n0 + 1, `ett kort vid våningsslutet (${dark.n0} → ${dark.n1}) ` + extra);
await ev(() => { const g = __game; g.a30.brk('dark'); });
await clearUI();
// 7. SNABBARE FIENDER – DUBBEL SPRÄNGSKADA
const sw = await ev(() => { const g = __game; g.loadFloor(4); const e0 = g.spawnEnemy('K', g.P.x + 3, g.P.y), s0 = e0.d.speed; e0.dead = true;
  const t0 = g.spawnEnemy('S', g.P.x + 2, g.P.y + 0.3); t0.hp = t0.maxHp = 1e4; g.explode(t0.x, t0.y, 20, 1.2, false); const d0 = 1e4 - t0.hp; t0.dead = true;
  g.a30.give('swift'); const e1 = g.spawnEnemy('K', g.P.x + 3, g.P.y), s1 = e1.d.speed; e1.dead = true;
  const t1 = g.spawnEnemy('S', g.P.x + 2, g.P.y + 0.3); t1.hp = t1.maxHp = 1e4; g.explode(t1.x, t1.y, 20, 1.2, false); const d1 = 1e4 - t1.hp; t1.dead = true;
  const sh0 = 1e4; const t2 = g.spawnEnemy('S', g.P.x + 2, g.P.y + 0.3); t2.hp = t2.maxHp = 1e4; g.hurtEnemy(t2, 20, t2.x, t2.y, {}); const d2 = 1e4 - t2.hp; t2.dead = true;
  g.a30.brk('swift'); return { s0, s1, d0, d1, d2 }; });
ok(Math.abs(sw.s1 / sw.s0 - 1.25) < 1e-6, `snabbare fiender: ×1,25 (${sw.s0} → ${sw.s1})`);
ok(sw.d0 > 0 && Math.abs(sw.d1 / sw.d0 - 2) < 0.05 && sw.d2 < sw.d1, `dubbel sprängskada mot fienderna (${sw.d0.toFixed(1)} → ${sw.d1.toFixed(1)}), vanliga skott oförändrade (${sw.d2.toFixed(1)})`);
// 8. ELITER ÖVERALLT – GULDKISTOR; 9. 30 % FLER FIENDER; 10. BOSSAR OCH VÄKTARE +40 %
const el = await ev(() => { const g = __game, cnt = () => g.ents().filter(e => !e.dead && e.elite).length;
  g.loadFloor(7); const e0 = cnt(), n0 = g.ents().filter(e => !e.dead).length, ch0 = g.chests().filter(c => !c.locked && c.rare).length, chN = g.chests().filter(c => !c.locked).length;
  g.a30.give('elite'); g.loadFloor(7); const e1 = cnt(), n1 = g.ents().filter(e => !e.dead).length, ch1 = g.chests().filter(c => !c.locked && c.rare).length; g.a30.brk('elite');
  g.loadFloor(7); const t0 = g.ents().filter(e => !e.dead).length; g.a30.give('horde'); g.loadFloor(7); const t1 = g.ents().filter(e => !e.dead).length, h = g.ents().filter(e => e.a30horde).length; g.a30.brk('horde');
  g.loadFloor(6); const bh0 = g.boss() ? g.boss().maxHp : 0; g.a30.give('tyrant'); g.loadFloor(6); const bh1 = g.boss() ? g.boss().maxHp : 0; g.a30.brk('tyrant');
  return { e0, e1, n0, n1, ch0, ch1, chN, t0, t1, h, bh0, bh1 }; });
console.log(JSON.stringify(el));
ok(el.e1 >= el.e0 + 2 && el.n1 === el.n0, `eliter överallt: ${el.e0} → ${el.e1} eliter, lika många fiender (${el.n0})`);
ok(el.chN === 0 || el.ch1 === el.chN, `olåsta kistor blir guldkistor (${el.ch0} → ${el.ch1} av ${el.chN})`);
ok(el.h > 0 && el.t1 - el.t0 === el.h && el.h >= Math.round(el.t0 * 0.15), `30 % fler fiender: ${el.t0} → ${el.t1}`);
ok(el.bh0 > 0 && Math.abs(el.bh1 / el.bh0 - 1.4) < 1e-6, `bossen +40 % hälsa (${el.bh0} → ${el.bh1})`);
// 11. kontrastläget: MÖRKARE erbjuds aldrig och blir +15 % hälsa på fienderna
const hc = await ev(() => { const g = __game; g.settings.contrast = true; let darkOffered = 0; for (let d = 2; d < 60; d++) if (g.a30.offers(d).includes('dark')) darkOffered++;
  g.loadFloor(8); const amb0 = g.lvl().ambient, e0 = g.spawnEnemy('K', g.P.x + 3, g.P.y), h0 = e0.maxHp; e0.dead = true; g.a30.give('dark'); g.loadFloor(8); const amb1 = g.lvl().ambient, e1 = g.spawnEnemy('K', g.P.x + 3, g.P.y), h1 = e1.maxHp; e1.dead = true;
  const line = g.a30.state().lines[0]; g.a30.brk('dark'); g.settings.contrast = false; let darkN = 0; for (let d = 2; d < 60; d++) if (g.a30.offers(d).includes('dark')) darkN++; return { darkOffered, darkN, amb0, amb1, h0, h1, line }; });
ok(hc.darkOffered === 0 && hc.darkN > 0, `kontrastläget: MÖRKARE erbjuds aldrig (0 av 58 altare; utan kontrast ${hc.darkN})`);
ok(hc.amb1 === hc.amb0 && Math.abs(hc.h1 / hc.h0 - 1.15) < 1e-6 && /15 % MER HÄLSA/.test(hc.line), 'kontrastläget: ett taget mörker blir +15 % hälsa, inget extra mörker: ' + hc.line);
// 12. erbjudandena är bestämda av frö och djup
const offA = await ev(() => [2, 3, 9].map(d => __game.a30.offers(d).join()));
await load('&a30altar=1');
const offB = await ev(() => [2, 3, 9].map(d => __game.a30.offers(d).join()));
ok(JSON.stringify(offA) === JSON.stringify(offB), 'samma frö: samma erbjudanden efter en ny laddning ' + offA.join(' / '));
await done();
