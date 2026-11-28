// MENY omgång 2: skärmen och spelarens kropp – bilder av skadebågen, låg hälsa, upplockning, rusning, gift, eld, vatten, döden, utgången och pausen.
// node ../gfx/meny/shots2.mjs <utkatalog> [port]   (cwd: tools/playtest)
import { setup } from '../../playtest/head.mjs';
const OUT = process.argv[2] || 'out/meny2', PORT = +(process.argv[3] || 9627);
const { pg, errs, ev, wait, done } = await setup(PORT, OUT);
const shot = n => pg.screenshot({ path: `${OUT}/${n}.png` });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; document.getElementById('seed').value = 'meny2'; __game.begin('new'); }); await wait(900);
await pg.keyboard.press('Escape'); await wait(600); await ev(() => { if (window.CardUI && CardUI.isOpen()) CardUI.close(); __game.resume && __game.resume(); });
await pg.waitForFunction('__game.banner ? __game.banner() <= 0 : true', { timeout: 15000 }).catch(() => {}); await wait(300);
const P = f => ev(f);
await P(() => { const P = __game.P; P.iframe = 0; __game.hurtPlayer(8, P.x + Math.cos(P.a + 1.6) * 2, P.y + Math.sin(P.a + 1.6) * 2, 'melee'); }); await wait(80); await shot('a_skada_sida');
await P(() => { const P = __game.P; P.iframe = 0; P.hp = 18; }); await wait(400); await shot('b_lag_halsa');
await P(() => { const P = __game.P; P.hp = 60; }); await wait(300);
await P(() => { __game.P.hp += 25; }); await wait(60); await shot('c_upplock_halsa');
await wait(500); await P(() => { __game.P.armor += 25; }); await wait(60); await shot('c_upplock_skydd');
await wait(500); await P(() => { const P = __game.P; P.dashT = 0.17; P.vx = Math.cos(P.a) * 11; P.vy = Math.sin(P.a) * 11; }); await wait(50); await shot('d_rusning');
await wait(400); await P(() => { __game.P.poisonT = 3; }); await wait(200); await shot('e_gift');
await P(() => { __game.P.poisonT = 0; __game.P.burnFx = 0.6; }); await wait(60); await shot('f_eld');
await wait(500); await P(() => { __game.P.swim = true; }); await wait(700); await shot('g_vatten'); await P(() => { __game.P.swim = false; }); await wait(600);
await P(() => __game.pause()); await wait(60); await shot('h_paus_tidig'); await wait(400); await shot('h_paus'); await P(() => __game.resume()); await wait(300);
await P(() => __game.floorDone()); await wait(60); await shot('i_utgang_0'); await wait(150); await shot('i_utgang_1'); await wait(250); await shot('i_utgang_2');
await P(() => { __game.showTitle(); localStorage.removeItem('krypta.run'); __game.begin('new'); }); await wait(900); await pg.keyboard.press('Escape'); await wait(500);
await P(() => { if (window.CardUI && CardUI.isOpen()) CardUI.close(); __game.resume && __game.resume(); }); await wait(300);
await P(() => { const P = __game.P; P.iframe = 0; P.armor = 0; P.hp = 1; __game.hurtPlayer(500, P.x + 1, P.y); });
for (let i = 0; i < 4; i++) { await wait(300); await shot('j_doden_' + i); }
console.log('fel:', errs.join(' / ') || 'inga', JSON.stringify(await ev(() => __game.meny.body())));
await done();
