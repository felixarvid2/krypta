// t202: version 30 (ALTARE) – förbunden syns och sparas. Två förbund tas vid altaret; de syns i pausen (bilden: raderna under PAUS), i pausmenyn
// (raden under rubriken), under MER → RUNDAN och i statistiken (SAMLINGAR → STATISTIK). Rundan sparas vid nästa våning (krypta.run); sidan laddas
// om och rundan fortsätter: förbunden och deras kort (mods) finns kvar. Sedan dör spelaren: dödsskärmen visar förbunden, och statistiken räknar dem.
// En runda utan förbund visar ingenting (dödsskärmens rad är dold). Bilder i out/t202. Inga sidfel. Port 9902.
import { setup } from './head.mjs';
const PORT = +(process.env.T202_PORT || 9902);
const { pg, ev, wait, ok, done, until, gwait, shot } = await setup(PORT, 'out/t202');
pg.setDefaultTimeout(120000);
const clearUI = async () => { for (let i = 0; i < 20; i++) { const open = await ev(() => { if (!(window.CardUI && CardUI.isOpen())) return false; const el = document.querySelector('.cu-talent, .cu-tcard, .cu-card:not(.owned), .cu-opt, .cu-btn'); if (el) el.click(); return true; }); if (!open) return; await wait(150); } };
const page = async (q = '') => { await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&seed=t202${q}`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 120000 }); };
await page('&a30altar=1');
await ev(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; __game.begin('new'); }); await wait(600); await clearUI(); await until(() => __game.state() === 'play', 5);
// två förbund vid altaret på våning 2 (E och första valet, två gånger: våning 2 och 3)
const take = async d0 => { const d = await ev(d0 => { const g = __game; for (let d = d0; d < d0 + 6; d++) { g.loadFloor(d); const a = g.a30.state().altar; if (a) { g.P.x = a.x + 0.5; g.P.y = a.y + 1.6; g.useProp(); return d; } } return -1; }, d0); console.log('altare på våning', d); await wait(250); await ev(() => document.querySelectorAll('#cardui .cu-opt')[0].click()); await wait(250); };
await take(2); await take(4);
const st = await ev(() => __game.a30.state());
ok(st.pacts.length === 2, 'två förbund tagna: ' + st.pacts.join(', '));
const want = st.lines;
// pausen: bilden, menyn och RUNDAN
await ev(() => __game.pause()); await wait(500);
await shot('paus');
const pauseLines = await ev(() => __game.a30.pauseLines());
ok(JSON.stringify(pauseLines) === JSON.stringify(want) && want.length === 2, 'pausbilden: förbunden under PAUS');
await ev(() => __game.pauseMenu()); await wait(400);
const menu = await ev(() => { const p = document.querySelector('#cardui .a30-sub'); return p ? p.textContent : ''; });
await shot('pausmeny');
ok(want.every(l => menu.includes(l)), 'pausmenyn: förbunden under rubriken – ' + menu.slice(0, 90));
await ev(() => { const b = [...document.querySelectorAll('#cardui .cu-opt')].find(x => /MER/.test(x.textContent)); b.click(); }); await wait(300);
await ev(() => { const b = [...document.querySelectorAll('#cardui .cu-opt')].find(x => /RUNDAN/.test(x.textContent)); b.click(); }); await wait(400);
const info = await ev(() => document.getElementById('cardui').textContent);
await shot('rundan');
ok(want.every(l => info.includes(l)), 'MER → RUNDAN: förbunden står i listan');
await ev(() => { if (window.CardUI && CardUI.isOpen()) CardUI.close(); __game.resume(); }); await wait(300);
// sparningen: nästa våning sparar; ladda om och fortsätt
const m0 = await ev(() => { const g = __game; g.loadFloor(7); return { mods: { ...g.mods() }, depth: g.run().depth }; });
await page();
const saved = await ev(() => { const s = JSON.parse(localStorage.getItem('krypta.run') || 'null'); return s && s.run && s.run.a30 ? s.run.a30.pacts : null; });
ok(JSON.stringify(saved) === JSON.stringify(st.pacts), 'krypta.run har förbunden: ' + JSON.stringify(saved));
const stRows = await ev(() => __game.a30.statRows().map(r => r.label + ' ' + (r.text || '')).join(' | '));
ok(/DEN PÅGÅENDE RUNDANS FÖRBUND/.test(stRows) && want.every(l => stRows.includes(l.replace('FÖRBUND: ', ''))), 'statistiken (före FORTSÄTT): den pågående rundans förbund');
await ev(() => __game.begin('continue')); await wait(800); await clearUI();
const cont = await ev(() => ({ s: __game.a30.state(), mods: { ...__game.mods() }, depth: __game.run().depth }));
const modsSame = ['dmg', 'goldMul', 'ammoMul', 'headshot', 'maxHp', 'critChance', 'damageTaken', 'lifesteal', 'fireRate', 'killHeal', 'shopDiscount', 'regen', 'reloadSpeed', 'magSize', 'extraLife', 'moveSpeed', 'meleeDmg'].every(k => Math.abs((cont.mods[k] || 0) - (m0.mods[k] || 0)) < 1e-9);
ok(JSON.stringify(cont.s.pacts) === JSON.stringify(st.pacts) && cont.depth === m0.depth && modsSame, `FORTSÄTT: förbunden och deras kort finns kvar (våning ${cont.depth})`);
// statistiken (SAMLINGAR → STATISTIK) i spelets egen lista
await ev(() => { __game.pause(); __game.showStats(); }); await wait(400);
const stats = await ev(() => document.getElementById('cardui').textContent);
ok(/FÖRBUNDEN/.test(stats) && /FÖRBUND TAGNA/.test(stats), 'STATISTIK: avsnittet FÖRBUNDEN');
await ev(() => { if (window.CardUI && CardUI.isOpen()) CardUI.close(); __game.resume(); });
// dödsskärmen
await ev(() => { const g = __game; g.P.iframe = 0; g.P.armor = 0; g.P.shield = 0; g.P.hp = 1; g.hurtPlayer(500); });
await until(() => !document.getElementById('runover').hidden, 8);
await wait(1800);
const ro = await ev(() => { const el = document.getElementById('a30ro'); return el && !el.hidden ? el.textContent : ''; });
await shot('dodsskarm');
ok(st.pacts.length && want.every(l => ro.includes(l.replace('FÖRBUND: ', ''))), 'dödsskärmen: ' + ro.slice(0, 100));
const prof = await ev(() => ({ n: __game.profile.a30pacts, pairs: __game.profile.a30pairs }));
ok(prof.n >= 2, 'profilen räknar tagna förbund: ' + JSON.stringify(prof));
// en runda utan förbund: raden är dold
await ev(() => { document.getElementById('retrybtn').click(); }); await wait(800); await clearUI();
await ev(() => { const g = __game; g.P.iframe = 0; g.P.armor = 0; g.P.shield = 0; g.P.hp = 1; g.hurtPlayer(500); });
await until(() => !document.getElementById('runover').hidden, 8);
const ro2 = await ev(() => { const el = document.getElementById('a30ro'); return { hidden: !el || el.hidden, pacts: __game.a30.state().pacts.length }; });
ok(ro2.hidden && ro2.pacts === 0, 'en ny runda utan förbund: dödsskärmens rad är dold');
await done();
