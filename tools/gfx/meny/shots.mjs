// MENY: före/efter-bilder av startskärmen, HUD-hörnen vid skada, dödsskärmen och nivåslutet (serier för animationerna).
// node ../gfx/meny/shots.mjs <utkatalog> [port]   (cwd: tools/playtest)
import { setup } from '../../playtest/head.mjs';
const OUT = process.argv[2] || 'out/meny', PORT = +(process.argv[3] || 9617);
const { pg, errs, ev, wait, done } = await setup(PORT, OUT);
const shot = n => pg.screenshot({ path: `${OUT}/${n}.png` });
const play = async () => { await ev(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; __game.begin('new'); }); await wait(900); await pg.keyboard.press('Escape'); await wait(600); await ev(() => { if (window.CardUI && CardUI.isOpen()) CardUI.close(); __game.resume && __game.resume(); }); await wait(300); };
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 60000 });
await ev(() => { __game.profile.tutDone = true; __game.refreshTitle(); });
for (let i = 0; i < 4; i++) { await wait(i ? 700 : 1200); await shot('title_' + i); }
await play();
await ev(() => { __game.P.iframe = 0; __game.hurtPlayer(25, __game.P.x + 1, __game.P.y); }); for (let i = 0; i < 4; i++) { await wait(60); await shot('hurt_' + i); }
await ev(() => { const P = __game.P; P.iframe = 0; P.armor = 0; P.hp = 1; __game.hurtPlayer(500, P.x + 1, P.y); });
for (let i = 0; i < 7; i++) { await wait(i ? 140 : 1250); await shot('dead_' + i); }
await ev(() => __game.showTitle()); await wait(300);
await play();
await ev(() => __game.floorDone()); for (let i = 0; i < 8; i++) { await wait(200); await shot('floorend_' + i); }
console.log('fel:', errs.join(' / ') || 'inga');
await done();
