// t97: HUD:en i hörnen (UI-omgörningen "mindre är mer").
// Spelet startar, HUD:en ritas utan sidfel i flera lägen (normal, strid, låg hälsa, drycker/effekter, boss, stor HUD, pekskärm),
// hudRects() ger rutorna enligt kontraktet, och ingen text ritas i bildens mitt (80–240 × 50–150 i spelkoordinater)
// efter att en fiende presenterats och ett meddelande visats. Textkontrollen görs genom att fånga fillText på den
// 320 px breda spelduken (addInitScript) – inte genom att jämföra pixlar mot 3D-bilden.
import { setup, CHROMIUM, chromium } from './head.mjs';
const PORT = 8897;
const { pg, shot, ev, wait, ok, done, errs } = await setup(PORT, 'out/t97');
const HOOK = () => {
  window.__txt = []; const orig = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (s, x, y) {
    if (this.canvas && this.canvas.width === 320 && window.__txtOn) { const m = this.getTransform(), px = parseFloat(this.font) || 8, w = this.measureText(s).width;
      window.__txt.push({ s: String(s), x: m.a * x + m.e, y: m.d * y + m.f, w: w * m.a, h: px * m.d, a: this.globalAlpha }); }
    return orig.apply(this, arguments);
  };
};
await pg.addInitScript(HOOK);
const begin = async (page) => {
  await page.goto(`http://localhost:${PORT}/index.html?nolock=1`); await page.waitForFunction('!document.getElementById("start").disabled', null, { timeout: 60000 });
  await page.evaluate(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; const s = document.getElementById('seed'); if (s) s.value = 't97'; __game.begin('new'); });
  await page.waitForTimeout(1500); await page.keyboard.press('Escape'); await page.waitForTimeout(4200); // titelkortet är borta
};
const grab = async (ms, page = pg) => { await page.evaluate(() => { window.__txt = []; window.__txtOn = true; }); await page.waitForTimeout(ms); return page.evaluate(() => { window.__txtOn = false; return window.__txt.filter(t => t.a > 0.05 && t.s.trim()); }); };
const inCentre = t => t.x < 240 && t.x + t.w > 80 && t.y < 150 && t.y + t.h > 50;

await begin(pg);
ok(await ev(() => __game.state()) === 'play', 'spelet startar');
// rutorna på dator
const R = await ev(() => __game.hudRects());
ok(R && R.hp.x === 4 && R.hp.y === 176 && R.hp.w === 80 && R.hp.h === 22, 'hälsorutan nere till vänster ' + JSON.stringify(R && R.hp));
ok(R && R.ammo.x === 236 && R.ammo.y === 176 && R.ammo.w === 80 && R.ammo.h === 22, 'ammorutan nere till höger ' + JSON.stringify(R && R.ammo));
ok(R && R.map.y === 4 && R.map.x + R.map.w === 316, 'minikartan uppe till höger ' + JSON.stringify(R && R.map));
// normalt läge: hörnen ritas, inga gamla etiketter, ingen guld/våning permanent
let T = await grab(700);
const hpTxt = T.filter(t => t.x >= 4 && t.x < 84 && t.y >= 170);
ok(hpTxt.some(t => /^\d+$/.test(t.s)), 'hälsan ritas som siffra nere till vänster (' + [...new Set(hpTxt.map(t => t.s))].join(',') + ')');
ok(T.some(t => t.x >= 236 && t.y >= 170 && /^\d+$|^–$/.test(t.s)), 'magasinet ritas nere till höger');
ok(!T.some(t => /^(HALSA|HÄLSA|SKYDD|9MM|VAN \d+|VÅN \d+|\d+G)$/.test(t.s)), 'inga etiketter (HÄLSA/SKYDD/9MM/VÅN/guld) i spelvyn');
ok(T.every(t => t.y >= 0 && t.y + t.h <= 200 + 1), 'ingen text ritas utanför bilden (y > 200)');
await shot('normal');
// strid: fienden presenteras + ett meddelande; inget i mitten
await ev(() => { const P = __game.P; const e = __game.spawnEnemy('Y', P.x + Math.cos(P.a) * 3, P.y + Math.sin(P.a) * 3); __game.run().seen = []; __game.alertEnemy(e); e.dead = true; __game.say('ETT LITE LÄNGRE TESTMEDDELANDE SOM BLÄDDRAS RAD FÖR RAD', 3); });
await wait(100); const queued = await ev(() => __game.msgs().map(m => m.text));
ok(queued.some(s => /^NY FIENDE: /.test(s)) && !queued.some(s => /: .*–/.test(s) && /HOPPAR|TRÄFFA|SKJUT/.test(s)), 'fiendepresentationen är bara "NY FIENDE: NAMN" (' + queued.join(' | ') + ')');
T = await grab(1500);
const centre = T.filter(inCentre);
ok(centre.length === 0, 'ingen text i bildens mitt (80–240 × 50–150) ' + centre.map(t => `${t.s}@${Math.round(t.x)},${Math.round(t.y)}`).slice(0, 6).join(' '));
const top = [...new Set(T.filter(t => t.y < 50 && t.x < 240 && t.x + t.w > 80).map(t => t.s))];
ok(top.length >= 1 && top.every(s => s.length <= 40), 'meddelandet syns överst, kort (' + top.join(' | ') + ')');
await shot('strid');
// låg hälsa + drycker + effekter
await ev(() => { const P = __game.P; P.hp = 9; P.armor = 30; P.rageT = 10; P.haste = 6; P.slowT = 4; P.grenades = 3; P.keys = 2; P.potions = [{ id: 'heal' }, { id: 'rage' }]; });
T = await grab(800);
ok(T.some(t => t.s === '9' && t.x < 84 && t.y >= 170), 'låg hälsa ritas (9)');
ok(!T.some(t => /RASERI|SNABBHET|LÅNGSAM|LANGSAM|FART \d/.test(t.s)), 'effekterna är ikoner/förkortningar, inte ord');
ok(!T.some(inCentre), 'fortfarande inget i mitten med effekter');
await shot('effekter');
// allt på en gång: handledningen, tomt magasin, flera statusikoner, stilmätaren, XP, teleskopet, HUD-tema, närstridsvapen
await ev(() => { const g = __game, P = g.P; g.profile.tutDone = false; g.settings.autoReload = false; P.hp = 300; for (const e of g.ents()) if (!e.dead) e.dead = true; P.mags[P.weapon] = 0; P.ammo[g.WEAPONS[P.weapon].ammo] = 20; P.halluT = 6; P.honeyT = 6; P.lowGT = 6; P.scopeT = 6; P.ghostT = 5; P.speedT = 5; const st = g.styleRef(); st.v = 6; g.run().xp = (g.run().xp || 0) + 5; g.settings.hudTheme = 'gold'; });
await ev(() => { window.__chips = 0; const o = CanvasRenderingContext2D.prototype.fillRect; window.__fr = o; CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) { if (w === 17 && h === 11) window.__chips++; return o.apply(this, arguments); }; });
await wait(200); await ev(() => { window.__chips = 0; }); await wait(17 * 6);
const chips = await ev(() => { CanvasRenderingContext2D.prototype.fillRect = window.__fr; return window.__chips; });
T = await grab(800);
ok(chips > 0 && chips <= 4 * 8, 'effektraden visar högst fyra ikoner (' + chips + ' rutor på ~6 bilder)');
ok(!T.some(inCentre), 'inget i mitten med handledning/omladdning/teleskop ' + T.filter(inCentre).map(t => t.s).join(','));
ok(T.some(t => t.s === 'R = LADDA OM' && t.y > 150), 'tomt magasin: "R = LADDA OM" som en kort rad nere i mitten');
ok(T.some(t => /W A S D/.test(t.s) && t.y >= 150), 'handledningen som en kort rad nere i mitten');
await shot('allt');
await ev(() => { const g = __game, P = g.P; g.settings.hudTheme = ''; const i = g.WEAPONS.findIndex(w => w.melee); if (i >= 0) { P.has[i] = true; g.switchWeapon(i); } }); await wait(900);
ok(errs.length === 0, 'inga sidfel med allt på / närstrid ' + errs.join(' / '));
await ev(() => { __game.profile.tutDone = true; __game.P.halluT = 0; __game.P.honeyT = 0; __game.P.lowGT = 0; __game.settings.autoReload = true; });
// riktiga dödanden: stilmätaren, XP, guld och målet som gör framsteg
await ev(() => { const g = __game, P = g.P; P.hp = 300; for (let i = 0; i < 3; i++) g.spawnEnemy('Y', P.x + Math.cos(P.a + i * 0.3) * 3, P.y + Math.sin(P.a + i * 0.3) * 3); }); await wait(200);
await ev(() => __game.killAllCheat()); T = await grab(1500);
ok(errs.length === 0, 'inga sidfel när fiender dödas ' + errs.join(' / '));
await shot('dodat');
// stor HUD
await ev(() => { __game.settings.bigHud = true; }); await wait(300);
const RB = await ev(() => __game.hudRects()); T = await grab(500);
ok(RB.hp.w > 80 && RB.hp.y + RB.hp.h <= 200 && RB.ammo.x + RB.ammo.w <= 320, 'stor HUD ger större hörn ' + JSON.stringify(RB.hp));
ok(T.some(t => t.x < 84 && t.y >= 160 && t.h >= 24), 'stor HUD skalar upp siffrorna');
await shot('storhud'); await ev(() => { __game.settings.bigHud = false; });
// boss
await ev(() => { __game.P.hp = 100; __game.loadFloor(6); }); await wait(5500);
T = await grab(600);
ok(await ev(() => !!__game.boss()), 'bossvåningen laddas');
ok(T.some(t => t.y < 12 && t.x > 80 && t.x < 240), 'bossens namn litet överst');
await shot('boss');
ok(errs.length === 0, 'inga sidfel på dator ' + errs.join(' / '));
// pekskärm (liggande telefon): hörnen överst
const ctx2 = await pg.context().browser().newContext({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const p2 = await ctx2.newPage(); const errs2 = []; p2.on('pageerror', e => errs2.push(e.message)); await p2.addInitScript(HOOK);
await begin(p2);
const RT = await p2.evaluate(() => __game.hudRects());
ok(RT.hp.x === 4 && RT.hp.y === 3 && RT.hp.w === 80 && RT.hp.h === 22, 'pekskärm: hälsan uppe till vänster ' + JSON.stringify(RT.hp));
ok(RT.ammo.x === 236 && RT.ammo.y === 3, 'pekskärm: ammo uppe till höger ' + JSON.stringify(RT.ammo));
ok(RT.map.y >= 26 && RT.map.y <= 30 && RT.map.x + RT.map.w === 316, 'pekskärm: minikartan under ammo ' + JSON.stringify(RT.map));
await p2.evaluate(() => { const P = __game.P; const e = __game.spawnEnemy('Y', P.x + Math.cos(P.a) * 3, P.y + Math.sin(P.a) * 3); __game.run().seen = []; __game.alertEnemy(e); e.dead = true; });
T = await grab(1200, p2);
ok(!T.some(t => t.y > 150 && t.x < 90) && !T.some(t => t.y > 150 && t.x + t.w > 230), 'pekskärm: nedre hörnen fria för tummarna ' + T.filter(t => t.y > 150).map(t => t.s).join(','));
ok(!T.some(inCentre), 'pekskärm: inget i mitten ' + T.filter(inCentre).map(t => t.s).join(','));
const objT = [...new Set(T.filter(t => t.x >= 200 && t.y > RT.map.y + RT.map.h && t.y < 130).map(t => t.s))];
ok(objT.length <= 1 && objT.every(s => s.length <= 10), 'pekskärm: målet är EN kort rad under kartan (' + objT.join(' | ') + ')');
await p2.screenshot({ path: 'out/t97/touch.png' });
// en gång per profil: "TRYCK PÅ AMMO FÖR ATT BYTA VAPEN" när man har två vapen
await p2.evaluate(() => { const g = __game; g.profile.tipAmmo = false; g.P.has[1] = true; });
T = await grab(1500, p2);
ok(T.some(t => /TRYCK P. AMMO F.R ATT BYTA VAPEN/.test(t.s)), 'pekskärm: tipset om vapenbyte via ammo-hörnet visas');
await p2.waitForTimeout(5500);
ok(await p2.evaluate(() => __game.profile.tipAmmo === true), 'tipset visas bara en gång per profil');
ok(errs2.length === 0, 'inga sidfel på pekskärm ' + errs2.join(' / '));
await ctx2.close();
await done();
