// MENY omgång 3: visuell genomgång på dator, telefon liggande och stående (engelska som standard, LANG_UI=sv för svenska).
// Tar bilder av alla nya effekter i flera biomer. node ../gfx/meny/genomgang.mjs <utkatalog> [enheter] [port]   (cwd: tools/playtest)
import { setup } from '../../playtest/head.mjs';
import { createRequire } from 'module';
const req = createRequire(import.meta.url); let PW; for (const m of ['playwright-core', 'playwright', '/opt/node22/lib/node_modules/playwright']) { try { PW = req(m); break; } catch (e) { /* nästa */ } }
const OUT = process.argv[2] || 'out/meny/genomgang', DEVS = (process.argv[3] || 'dator,liggande,staende').split(','), PORT = +(process.argv[4] || 9637), LANG = process.env.LANG_UI || 'en';
const { pg: pg0, done } = await setup(PORT, OUT);
const px = PW.devices['Pixel 7'];
const CFG = { dator: { viewport: { width: 1280, height: 720 } }, liggande: { ...px, viewport: { width: px.viewport.height, height: px.viewport.width } }, staende: { ...px } };
const errs = [];
for (const d of DEVS) {
  const ctx = await pg0.context().browser().newContext({ ...CFG[d], deviceScaleFactor: 1 }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errs.push(d + ': ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(d + ' console: ' + m.text().slice(0, 120)); });
  const ev = (f, a) => pg.evaluate(f, a), wait = ms => pg.waitForTimeout(ms), shot = n => pg.screenshot({ path: `${OUT}/${d}_${n}.png` });
  const resume = async () => { await ev(() => { if (window.CardUI && CardUI.isOpen()) CardUI.close(); if (__game.state() !== 'play') __game.resume && __game.resume(); }); await wait(200); };
  const play = async (depth, seed) => { await ev(([dp, s]) => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; __game.profile.tipAmmo = true; document.getElementById('seed').value = s; __game.showTitle(); __game.begin('new'); if (dp > 1) __game.loadFloor(dp); }, [depth, seed]); await wait(900); await pg.keyboard.press('Escape'); await wait(400); await resume(); };
  await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&lang=${LANG}`); await pg.waitForFunction('!document.getElementById("start").disabled', null, { timeout: 90000 });
  await wait(2500); await shot('01_titel');
  try {
    await play(1, 'gg1'); await wait(300); await shot('02_start_banner');
    await pg.waitForFunction('__game.banner() <= 0', null, { timeout: 15000 }).catch(() => {});
    await ev(() => { const P = __game.P; P.iframe = 0; __game.hurtPlayer(10, P.x + Math.cos(P.a - 1.4) * 2, P.y + Math.sin(P.a - 1.4) * 2, 'proj'); }); await wait(90); await shot('03_skadebage');
    await ev(() => { const P = __game.P; P.hp = 14; }); await wait(500); await shot('04_lag_halsa');
    await ev(() => { const P = __game.P; P.hp = 80; P.dashT = 0.17; P.vx = Math.cos(P.a) * 11; P.vy = Math.sin(P.a) * 11; }); await wait(60); await shot('05_rusning');
    await wait(400); await ev(() => { const P = __game.P; for (let i = 0; i < 3; i++) { const e = __game.spawnEnemy('Y', P.x + Math.cos(P.a + (i - 1) * 0.3) * 3.5, P.y + Math.sin(P.a + (i - 1) * 0.3) * 3.5); __game.alertEnemy && __game.alertEnemy(e); } }); await wait(300);
    await ev(() => { const P = __game.P; P.iframe = 9; __game.explode(P.x + Math.cos(P.a) * 3.5, P.y + Math.sin(P.a) * 3.5, 30, 2, false, true); }); await wait(120); await shot('06_explosion_a'); await wait(350); await shot('06_explosion_b');
    await ev(() => { const P = __game.P; P.weapon = 0; __game.setMouse(true); }); await wait(250); await ev(() => __game.setMouse(false)); await shot('07_strid_status');
    await ev(() => Object.defineProperty(__game.P, 'swim', { get: () => true, set: () => {}, configurable: true })); await wait(700); await shot('08_under_ytan'); await ev(() => { delete __game.P.swim; __game.P.swim = false; }); await wait(300);
    await ev(() => __game.pause()); await wait(450); await shot('09_paus'); await ev(() => __game.pauseMenu()); await wait(500); await shot('09_pausmeny'); await pg.keyboard.press('Escape'); await wait(300); await resume();
    await ev(() => __game.floorDone()); await wait(90); await shot('10_utgang'); await wait(1900); await shot('10_nivaslut');
    await play(3, 'gg3'); await pg.waitForFunction('__game.banner() <= 0', null, { timeout: 15000 }).catch(() => {}); await shot('11_biom3');
    await ev(() => { const P = __game.P; P.iframe = 9; __game.explode(P.x + Math.cos(P.a) * 3, P.y + Math.sin(P.a) * 3, 30, 2, false, true); }); await wait(200); await shot('11_biom3_explosion');
    await play(5, 'gg5'); await pg.waitForFunction('__game.banner() <= 0', null, { timeout: 15000 }).catch(() => {}); await shot('12_biom5');
    await play(6, 'gg6'); for (const t of [300, 900, 1700]) { await wait(t === 300 ? 300 : t - 300 - (t === 1700 ? 600 : 0)); await shot('13_bossintro_' + t); }
    await wait(2500); await resume(); await shot('13_boss_strid');
    await ev(() => { const P = __game.P; P.iframe = 0; P.armor = 0; P.hp = 1; __game.hurtPlayer(500, P.x + 1, P.y); }); await wait(700); await shot('14_dodskamera'); await wait(1800); await shot('14_dodsskarm');
  } catch (e) { errs.push(d + ': ' + e.message.split('\n')[0]); }
  await ctx.close();
}
console.log(errs.length ? 'FEL:\n' + errs.join('\n') : 'inga fel');
await done();
