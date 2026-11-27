// t203: version 30 (ALTARE) – ÄNDLÖST. Knappen ÄNDLÖST i LÄGEN öppnar ett val (BÖRJA, TOPPLISTAN, TILLBAKA); BÖRJA startar läget med ett startkort.
// Biomerna: de första vanliga våningarna går igenom alla biomer i BIOME_IDS en gång (påsen), var femte våning är en bossvåning. Kurvan: fiendernas
// hälsa ×H(n) och skada ×D(n) mot våning 1, extra fiender min(10, ⌊(n − 1)/3⌋). Bossen fälls (speltid): portalen, och på var tionde våning
// förbundets altare bredvid den; portalen ger ett kort och nästa våning. En vanlig våning klaras: fartbonusen räknas. Sparningen: sidan laddas om och
// rundan fortsätter som ÄNDLÖST på samma våning och biom. FÖRSÖK IGEN efter döden börjar en ny ÄNDLÖST. Vanliga altare står aldrig i ÄNDLÖST.
// Inga sidfel. Port 9903.
import { setup } from './head.mjs';
const PORT = +(process.env.T203_PORT || 9903);
const { pg, ev, wait, ok, done, until, gwait } = await setup(PORT, 'out/t203');
pg.setDefaultTimeout(120000);
const clearUI = async () => { for (let i = 0; i < 30; i++) { const open = await ev(() => { if (!(window.CardUI && CardUI.isOpen())) return false; const el = document.querySelector('.cu-talent, .cu-tcard, .cu-card:not(.owned), .cu-btn'); if (el) el.click(); return true; }); if (!open) return; await wait(150); } };
const page = async (q = '') => { await pg.goto(`http://localhost:${PORT}/index.html?nolock=1${q}`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 120000 }); };
await page('&a30altar=1');
await ev(() => { localStorage.removeItem('krypta.run'); localStorage.removeItem('krypta.a30top'); __game.profile.tutDone = true; document.getElementById('seed').value = 't203'; });
// 1. knappen
const menu = await ev(() => { document.getElementById('endlessbtn').click(); return [...document.querySelectorAll('#cardui .cu-opt .cu-ol')].map(e => e.textContent); });
ok(menu.length === 3 && /BÖRJA/.test(menu[0]) && /TOPPLISTAN/.test(menu[1]), 'ÄNDLÖST i LÄGEN: ' + menu.join(' / '));
await ev(() => document.querySelectorAll('#cardui .cu-opt')[0].click()); await wait(800);
const st0 = await ev(() => ({ a30e: __game.run().a30e, depth: __game.run().depth, ui: window.CardUI && CardUI.isOpen(), title: document.getElementById('title').hidden, seed: __game.run().seed }));
ok(st0.a30e && st0.depth === 1 && st0.ui && st0.title, 'BÖRJA: ÄNDLÖST på våning 1 med ett startkort');
await clearUI(); await until(() => __game.state() === 'play', 5);
const seedOK = await ev(() => __game.run().seed === (parseInt('t203', 36) >>> 0));
ok(seedOK, 'fröet i LÄGEN gäller också ÄNDLÖST');
// 2. biomer och bossvåningar
const plan = await ev(() => { const g = __game, E = g.a30.e(), out = []; for (let n = 1; n <= 44; n++) { const L = E.level(n); out.push(L.bossId ? 'B:' + L.bossId : L.biome); } return out; });
const normal = plan.filter(p => !p.startsWith('B:'));
const bossAt = plan.map((p, i) => p.startsWith('B:') ? i + 1 : 0).filter(Boolean);
const firstBag = normal.slice(0, 35);
console.log(JSON.stringify({ bossAt, firstBag: firstBag.join(','), n: normal.length }));
ok(bossAt.join() === '5,10,15,20,25,30,35,40', 'var femte våning är en bossvåning: ' + bossAt.join(','));
ok(new Set(firstBag).size === firstBag.length && firstBag.length >= 30, `de första ${firstBag.length} vanliga våningarna: alla biomer, ingen två gånger`);
// 3. kurvan
const curve = await ev(() => { const g = __game, E = g.a30.e(), out = {};
  for (const n of [1, 5, 10, 20, 30]) { g.loadFloor(n === 5 ? 4 : n); g.run().depth = n; const e = g.spawnEnemy('K', g.P.x + 3, g.P.y); out[n] = { hp: e.maxHp, dmg: e.d.dmg, H: E.hp(n), D: E.dmg(n) }; e.dead = true; }
  return out; });
let curveOK = true; const c1 = curve[1];
for (const n of [5, 10, 20, 30]) { const c = curve[n]; if (Math.abs(c.hp / c1.hp - c.H) > 1e-6 || Math.abs(c.dmg / c1.dmg - c.D) > 1e-6) curveOK = false; }
console.log(JSON.stringify(curve));
ok(curveOK, `fiendernas hälsa och skada följer kurvan: ×${curve[10].H.toFixed(2)} och ×${curve[10].D.toFixed(2)} på våning 10, ×${curve[30].H.toFixed(2)} och ×${curve[30].D.toFixed(2)} på våning 30`);
const extras = await ev(() => { const g = __game, E = g.a30.e(), out = {}; for (const n of [2, 11, 31]) { g.loadFloor(n); out[n] = { got: g.ents().filter(e => e.a30eX).length, want: E.extra(n) }; } return out; });
ok(extras[2].got === 0 && extras[11].got === extras[11].want && extras[31].got >= extras[31].want - 1 && extras[31].want === 10, 'extra fiender: ' + JSON.stringify(extras));
// 4. vanliga altare står aldrig i ÄNDLÖST (?a30altar=1)
const noAltar = await ev(() => { const g = __game; let n = 0; for (const d of [2, 3, 4, 6, 7]) { g.loadFloor(d); if (g.a30.state().altar) n++; } return n; });
ok(noAltar === 0, 'inga vanliga altare i ÄNDLÖST');
// 5. bossvåning 10: bossen fälls, portalen och altaret bredvid
await ev(() => { const g = __game; g.loadFloor(10); g.P.hp = 1e5; clearInterval(window.__hold); window.__hold = setInterval(() => { const P = __game.P; P.hp = Math.max(P.hp, 1e4); P.iframe = 1; }, 50); });
await until(() => __game.state() === 'play', 5); await gwait(1);
await ev(() => __game.killAllCheat());
const fell = await until(() => __game.portals().some(p => p.kind === 'boss'), 30);
const b10 = await ev(() => { const g = __game, p = g.portals().find(q => q.kind === 'boss'), a = g.a30.state().altar; return { p: p && [p.x, p.y], a, d: a && p ? Math.hypot(a.x + 0.5 - p.x, a.y + 0.5 - p.y) : -1 }; });
ok(fell && b10.a && b10.d < 6.5 && b10.a.depth === 10, `våning 10: bossen fälld, förbundets altare ${b10.d.toFixed(1)} rutor från portalen`);
const offers = await ev(() => { const g = __game, a = g.a30.state().altar; g.P.x = a.x + 0.5; g.P.y = a.y + 1.6; g.useProp(); return [...document.querySelectorAll('#cardui .cu-opt .cu-ol')].map(e => e.textContent).length; });
await ev(() => document.querySelectorAll('#cardui .cu-opt')[0].click()); await wait(300);
const pacts = await ev(() => __game.a30.state().pacts.length);
ok(offers === 4 && pacts === 1, 'altaret i bossarenan: tre förbund, ett tas');
// portalen: ett kort och nästa våning
const tb0 = await ev(() => __game.run().a30e.tb);
await ev(() => { const g = __game, p = g.portals().find(q => q.kind === 'boss'); g.enterPortal(p); });
await wait(400); await clearUI(); await until(() => __game.state() === 'play' && __game.run().depth === 11, 10);
const after = await ev(() => ({ depth: __game.run().depth, E: __game.run().a30e, boss: !!__game.boss() }));
ok(after.depth === 11 && after.E.bosses === 1 && !after.boss, 'bossportalen: ett kort och våning 11');
// 6. en vanlig våning klaras: fartbonusen
await ev(() => { const g = __game; g.floorDone(); });
const fd = await ev(() => ({ st: __game.state(), E: __game.run().a30e }));
ok(fd.st === 'stats' && fd.E.tb > tb0 && fd.E.floors === 2, `våningen klar: fartbonus ${tb0} → ${fd.E.tb}`);
await ev(() => __game.nextFloor()); await wait(300); await clearUI(); await until(() => __game.state() === 'play' && __game.run().depth === 12, 10);
const d12 = await ev(() => ({ depth: __game.run().depth, biome: __game.lvl().biome, n: __game.ents().length }));
ok(d12.depth === 12, 'nästa våning: 12 (' + d12.biome + ')');
// 7. sparningen: ladda om och fortsätt
await ev(() => clearInterval(window.__hold));
await page();
const cont0 = await ev(() => { const s = JSON.parse(localStorage.getItem('krypta.run') || 'null'); return s && s.run ? { a30e: s.run.a30e, depth: s.run.depth } : null; });
await ev(() => __game.begin('continue')); await wait(800); await clearUI();
const cont = await ev(() => ({ depth: __game.run().depth, a30e: __game.run().a30e, biome: __game.lvl().biome, pacts: __game.a30.state().pacts.length }));
ok(cont0 && cont0.a30e && cont.depth === 12 && cont.a30e && cont.biome === d12.biome && cont.pacts === 1, `FORTSÄTT: ÄNDLÖST våning ${cont.depth} (${cont.biome}), förbundet kvar`);
// 8. döden och FÖRSÖK IGEN
await ev(() => { const g = __game; g.P.iframe = 0; g.P.armor = 0; g.P.shield = 0; g.P.hp = 1; g.hurtPlayer(9999); });
await until(() => !document.getElementById('runover').hidden, 8); await wait(1500);
const ro = await ev(() => document.getElementById('a30ro') ? document.getElementById('a30ro').textContent : '');
ok(/POÄNG/.test(ro), 'dödsskärmen: ' + ro.slice(0, 80));
await ev(() => document.getElementById('retrybtn').click()); await wait(800);
const retry = await ev(() => ({ a30e: __game.run().a30e, depth: __game.run().depth, tb: __game.run().a30e && __game.run().a30e.tb }));
await clearUI();
ok(retry.a30e && retry.depth === 1 && retry.tb === 0, 'FÖRSÖK IGEN: en ny ÄNDLÖST från våning 1');
await done();
