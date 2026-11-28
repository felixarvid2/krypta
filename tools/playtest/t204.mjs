// t204: version 30 (ALTARE) – ÄNDLÖST:s poäng och topplista. Poängen är 1000 per klarad våning + 25 per dödad fiende + fartbonusen. En topplista
// med tio rundor finns redan (krypta.a30top): en sämre runda hamnar på sin plats (9) utan NYTT REKORD, en bättre ger NYTT REKORD på dödsskärmen; listan
// hålls till tio med datum, djup, poäng, biom och frö. Rekordet syns under knappen ÄNDLÖST och i TOPPLISTAN (menyn), i statistiken och på
// dödsskärmen. GE UPP räknas också. Med en localStorage som kastar fel (läsning och skrivning) går allt utan sidfel och dödsskärmen visar ändå
// poängen. Port 9904.
import { setup } from './head.mjs';
const PORT = +(process.env.T204_PORT || 9904);
const { pg, ev, wait, ok, done, until, shot } = await setup(PORT, 'out/t204');
pg.setDefaultTimeout(120000);
const clearUI = async () => { for (let i = 0; i < 30; i++) { const open = await ev(() => { if (!(window.CardUI && CardUI.isOpen())) return false; const el = document.querySelector('.cu-talent, .cu-tcard, .cu-card:not(.owned), .cu-btn'); if (el) el.click(); return true; }); if (!open) return; await wait(150); } };
const page = async (q = '') => { await pg.goto(`http://localhost:${PORT}/index.html?nolock=1${q}`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 120000 }); };
const die = async () => { await ev(() => { const g = __game; g.P.iframe = 0; g.P.armor = 0; g.P.shield = 0; g.P.hp = 1; g.hurtPlayer(9999); }); await until(() => !document.getElementById('runover').hidden, 8); await wait(1500); };
const play = async (seed, depth, kills, tb) => { await ev(([s]) => { __game.a30.e().begin(s); }, [seed]); await wait(500); await clearUI(); await until(() => __game.state() === 'play', 5);
  await ev(([d, k, tb]) => { const g = __game; g.loadFloor(d); g.run().kills = k; g.run().a30e.tb = tb; }, [depth, kills, tb]); await until(() => __game.state() === 'play', 5); };
await page();
// tio rundor finns redan
const seeded = await ev(() => { const top = []; for (let i = 0; i < 10; i++) top.push({ d: '2026-11-0' + (i % 9 + 1), depth: 20 - i, score: 20000 - i * 1000, biome: 'dungeon', seed: 'S' + i, kills: 100, time: 600, t: i }); localStorage.setItem('krypta.a30top', JSON.stringify(top)); localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; __game.refreshTitle(); return __game.a30.e().menuLabel(); });
ok(/REKORD 20 000 · DJUP 20/.test(seeded), 'rekordet under knappen: ' + seeded);
// en sämre runda: plats 9 (ingen NYTT REKORD), listan hålls till tio
await play(111, 12, 40, 500);
const sc1 = await ev(() => __game.a30.e().score());
ok(sc1.total === 11000 + 1000 + 500 && sc1.depth === 11000 && sc1.kills === 1000 && sc1.time === 500, 'poängen: 11 000 för djupet, 1 000 för 40 fiender och 500 i fart = ' + sc1.total);
await die();
const r1 = await ev(() => ({ ro: document.getElementById('a30ro').textContent, top: __game.a30.e().top(), res: __game.run().a30e.res, hist: __game.profile.history[0].cmode }));
await shot("plats9");
ok(r1.res.rank === 9 && !r1.res.record && /PLATS 9 PÅ TOPPLISTAN/.test(r1.ro) && !/NYTT REKORD/.test(r1.ro) && /9\. 12 500/.test(r1.ro) && !/4\. /.test(r1.ro), `en sämre runda: plats ${r1.res.rank} utan NYTT REKORD`);
ok(r1.top.length === 10 && r1.top[8].score === 12500 && r1.top[8].depth === 12 && /^\d{4}-\d\d-\d\d$/.test(r1.top[8].d) && r1.top[8].seed === (111).toString(36).toUpperCase() && r1.top[8].biome, 'listan hålls till tio, med datum, djup, poäng, biom och frö: ' + JSON.stringify(r1.top[8]));
ok(r1.hist === 'ÄNDLÖST', 'historiken: rundan står som ÄNDLÖST');
// en bättre runda: NYTT REKORD
await ev(() => document.getElementById('retrybtn').click()); await wait(600); await clearUI();
await play(222, 25, 120, 3000);
await die();
const r2 = await ev(() => ({ ro: document.getElementById('a30ro').textContent, top: __game.a30.e().top(), res: __game.run().a30e.res }));
await shot('rekord');
ok(r2.res.record && r2.res.rank === 1 && /NYTT REKORD/.test(r2.ro) && r2.top[0].score === 24000 + 3000 + 3000, 'en bättre runda: NYTT REKORD och plats 1 (' + r2.top[0].score + ')');
ok(/1\. 30 000 · DJUP 25/.test(r2.ro) && /3\. 19 000/.test(r2.ro) && !/4\. /.test(r2.ro), 'dödsskärmen visar topplistans tre bästa');
// menyn: TOPPLISTAN och statistiken
await ev(() => { document.getElementById('romenubtn').click(); }); await wait(600);
const lbl = await ev(() => __game.a30.e().menuLabel());
ok(/REKORD 30 000 · DJUP 25/.test(lbl), 'knappen visar det nya rekordet: ' + lbl);
await ev(() => { document.getElementById('endlessbtn').click(); }); await wait(300);
await ev(() => document.querySelectorAll('#cardui .cu-opt')[1].click()); await wait(400);
const list = await ev(() => document.getElementById('cardui').textContent);
await shot('topplistan');
ok(/TOPPLISTAN/.test(list) && /30 000 POÄNG/.test(list) && /FRÖ 66/.test(list), 'TOPPLISTAN i menyn');
await ev(() => { if (window.CardUI && CardUI.isOpen()) CardUI.close(); });
const stats = await ev(() => __game.a30.statRows().map(r => r.label + ' ' + (r.text || '')).join(' | '));
ok(/ÄNDLÖST/.test(stats) && /30 000 POÄNG/.test(stats) && /DJUPAST VÅNING 25/.test(stats), 'statistiken: ÄNDLÖST med topplistan');
// GE UPP räknas också
await play(333, 3, 0, 0);
await ev(() => { __game.run().cause = 'GAV UPP'; __game.endRun(false); __game.showTitle(); }); await wait(300);
const gu = await ev(() => __game.a30.e().top().some(x => x.seed === (333).toString(36).toUpperCase()));
ok(!gu, 'GE UPP på våning 3 (2 000 poäng) kommer inte in på en full lista med bättre rundor');
// localStorage som kastar fel
await page();
await ev(() => { const S = Storage.prototype; S.getItem = () => { throw new Error('låst'); }; S.setItem = () => { throw new Error('låst'); }; S.removeItem = () => { throw new Error('låst'); }; __game.profile.tutDone = true; });
await play(444, 4, 5, 100);
await die();
const r3 = await ev(() => ({ ro: document.getElementById('a30ro').textContent, top: __game.a30.e().top(), lbl: __game.a30.e().menuLabel() }));
ok(/POÄNG 3 225/.test(r3.ro) && !/NYTT REKORD/.test(r3.ro) && r3.top.length === 0, 'localStorage kastar fel: dödsskärmen visar poängen (' + r3.ro.slice(0, 40) + '), topplistan är tom, inga sidfel');
await done();
