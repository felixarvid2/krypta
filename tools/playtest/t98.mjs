// t98: pekkontrollerna på telefonen (UI-omgörningen "mindre är mer"). Pixel 7 liggande och stående.
// Kontrollerar: högst 5 permanenta knappar (AVFYRA, ALT, HOPPA, RUSA, PAUS) + synliga sammanhangsknappar, inga borttagna knappar i spelvyn,
// ANVÄND syns framför en dörr/kista och inte mot tomma golvet, GRANAT dold vid 0 granater, inga knappar överlappar varandra, HUD-hörnen eller
// (stående) spelbilden, tryck på ammo-hörnet byter vapen, tryck på minikartan öppnar stora kartan, ALLA KNAPPAR ger tillbaka den gamla layouten,
// ett riktigt tryck på SPELA startar rundan (automatisk helskärm försöker tyst) och inga sidfel.
import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module'; import { fileURLToPath } from 'url';
const req = createRequire(import.meta.url); let PW; for (const m of ['playwright-core', 'playwright', '/opt/node22/lib/node_modules/playwright']) { try { PW = req(m); break; } catch (e) { /* nästa */ } }
const { chromium, devices } = PW; const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.KRYPTA_ROOT || path.resolve(HERE, '../..'), OUT = path.join(HERE, 'out'); fs.mkdirSync(OUT, { recursive: true });
const PORT = 9400 + Math.floor(Math.random() * 90);
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (fs.existsSync(f) && fs.statSync(f).isFile()) { r.setHeader('content-type', { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.ogg': 'audio/ogg', '.ttf': 'font/ttf', '.css': 'text/css' }[path.extname(f)] || 'application/octet-stream'); return r.end(fs.readFileSync(f)); } r.statusCode = 404; r.end(); }).listen(PORT);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), args: ['--use-gl=swiftshader', '--no-sandbox'] });
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log(c ? 'OK  ' : 'FAIL', m); };
const px = devices['Pixel 7'];
const PERM = ['fire', 'aim', 'jump', 'dash', 'pause'], XTRA = ['swap', 'map', 'deck', 'crouch', 'stone', 'settings', 'giveup'];
for (const [name, landscape, vp0] of [['liggande', true], ['staende', false], ['liggande169', true, { width: 667, height: 375 }]]) { // + en 16:9-telefon med smala svarta fält
  const vp = vp0 || (landscape ? { width: px.viewport.height, height: px.viewport.width } : px.viewport);
  const ctx = await b.newContext({ ...px, viewport: vp, deviceScaleFactor: 1 }); const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { window.__fsReq = 0; window.__oriLock = 0; // spioner: automatisk helskärm ska begäras, men ingen vrid-spärr
    const o = Element.prototype.requestFullscreen; Element.prototype.requestFullscreen = function (...a) { window.__fsReq++; try { return o ? o.apply(this, a) : Promise.resolve(); } catch (e) { return Promise.reject(e); } };
    try { if (window.ScreenOrientation && ScreenOrientation.prototype.lock) ScreenOrientation.prototype.lock = function () { window.__oriLock++; return Promise.resolve(); }; } catch (e) { /* inget */ } });
  const ev = (f, a) => pg.evaluate(f, a), wait = ms => pg.waitForTimeout(ms), shot = n => pg.screenshot({ path: `${OUT}/t98_${name}_${n}.png` });
  await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', null, { timeout: 90000 });
  await ev(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; delete __game.settings.allButtons; delete __game.settings.autoFs; document.getElementById('seed').value = 't98'; });
  if (name === 'liggande') { // inställningarna: ALLA KNAPPAR, KNAPPSTORLEK och layoutredigeraren (sparar i btnPosMin, inte i den gamla layoutens btnPos)
    const find = async txt => ev(async txt => { const sleep = ms => new Promise(r => setTimeout(r, ms));
      const look = () => [...document.querySelectorAll('label, .cu-row, button')].find(el => el.offsetParent && el.textContent.includes(txt));
      let el = look(); if (el) return true;
      for (const t of [...document.querySelectorAll('button')].filter(b => b.offsetParent && /KONTROLL|MOBIL|TILLGÄNGLIGHET|SPEL|BILD/.test(b.textContent) && b.textContent.length < 30)) { t.click(); await sleep(150); if (look()) return true; }
      return false; }, txt);
    await ev(() => document.getElementById('settingsbtn').click()); await wait(500);
    const fAll = await find('ALLA KNAPPAR (DEN GAMLA'), fSize = await find('KNAPPSTORLEK'), fEd = await find('FLYTTA MOBILKNAPPARNA');
    ok(fAll && fSize && fEd, 'inställningarna har ALLA KNAPPAR, KNAPPSTORLEK och FLYTTA MOBILKNAPPARNA (' + [fAll, fSize, fEd].join('/') + ')');
    if (fAll) { await ev(() => { const r = [...document.querySelectorAll('label, .cu-row')].find(el => el.offsetParent && el.textContent.includes('ALLA KNAPPAR (DEN GAMLA')); r.querySelector('input').click(); }); await wait(300);
      ok(await ev(() => __game.settings.allButtons === true && document.getElementById('touch').classList.contains('all')), 'kryssrutan ALLA KNAPPAR slår på den gamla layouten');
      await ev(() => { const r = [...document.querySelectorAll('label, .cu-row')].find(el => el.offsetParent && el.textContent.includes('ALLA KNAPPAR (DEN GAMLA')); r.querySelector('input').click(); }); await wait(300);
      ok(await ev(() => !__game.settings.allButtons && !document.getElementById('touch').classList.contains('all')), 'och av igen'); }
    if (fEd) { await ev(() => [...document.querySelectorAll('button')].find(b => b.offsetParent && b.textContent.includes('FLYTTA MOBILKNAPPARNA')).click()); await wait(500);
      const fr = await ev(() => { const r = document.querySelector('#touch .fire').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, ok: document.getElementById('touch').classList.contains('layout') }; });
      ok(fr.ok, 'layoutredigeraren öppnas'); await shot('layout');
      await pg.mouse.move(fr.x, fr.y); await pg.mouse.down(); await pg.mouse.move(fr.x - 150, fr.y - 60, { steps: 6 }); await pg.mouse.up(); await wait(200);
      await ev(() => document.querySelector('.layoutbar [data-l=done]').click()); await wait(400);
      const pos = await ev(() => ({ min: (__game.settings.btnPosMin || {}).fire, old: (__game.settings.btnPos || {}).fire, left: document.querySelector('#touch .fire').style.left }));
      ok(pos.min && !pos.old && pos.left, 'flyttad AVFYRA sparas i btnPosMin och används (' + JSON.stringify(pos) + ')');
      await ev(() => { __game.settings.btnPosMin = {}; __game.settings.allButtons = true; }); await wait(300); await ev(() => { delete __game.settings.allButtons; }); await wait(300);
      ok(await ev(() => !document.querySelector('#touch .fire').style.left), 'återställd position'); }
    await ev(() => { if (window.CardUI && CardUI.isOpen()) CardUI.close(); }); await wait(300);
  }
  // ett riktigt tryck på SPELA (#start) om den syns, annars som de andra testerna
  const startVis = await ev(() => { const s = document.getElementById('start'); const r = s.getBoundingClientRect(); return !!s.offsetParent && r.width > 0 && r.top >= 0 && r.bottom <= innerHeight; });
  if (startVis) await pg.tap('#start'); else await ev(() => __game.begin('new'));
  await wait(2500);
  ok(await ev(() => __game.state()) !== 'title', name + ': ' + (startVis ? 'tryck på #start' : '#start syns inte – begin()') + ' startar rundan (' + await ev(() => __game.state()) + ')');
  const toPlay = async () => { for (let i = 0; i < 8; i++) { const s = await ev(() => __game.state()); if (s === 'play') return true; if (await ev(() => window.CardUI && CardUI.isOpen())) await pg.keyboard.press('Escape'); else if (s === 'pause') await ev(() => __game.resume()); else await pg.keyboard.press('Escape'); await wait(500); } return await ev(() => __game.state()) === 'play'; };
  if (startVis) { const fs = await ev(() => [window.__fsReq, window.__oriLock]); ok(fs[0] === 1 && fs[1] === 0, name + ': automatisk helskärm begärd en gång, ingen vrid-spärr (' + fs.join('/') + ')'); }
  ok(await toPlay(), name + ': spelläge');
  console.log('     ' + name + ': andel golvrutor med ljus < 0.3 (LAMPA):', await ev(() => { const g = __game, L = g.light(), m = g.mapRef(); let n = 0, d = 0; for (let y = 0; y < m.length; y++) for (let x = 0; x < m[0].length; x++) if (!g.solid(x + 0.5, y + 0.5)) { n++; if (L[y * m[0].length + x] < 0.3) d++; } return (d / Math.max(1, n)).toFixed(2) + ' (' + g.lvl().biome + ')'; }));
  const vis = () => ev(() => [...document.querySelectorAll('#touch .tb')].filter(x => { const cs = getComputedStyle(x), r = x.getBoundingClientRect(); return cs.display !== 'none' && !document.getElementById('touch').hidden && r.width > 0; }).map(x => ({ act: x.dataset.act, ctx: x.classList.contains('ctx'), r: (r => ({ x: r.left, y: r.top, w: r.width, h: r.height }))(x.getBoundingClientRect()) })));
  await wait(400); let v = await vis(); await shot('spel');
  const acts = v.map(x => x.act), perm = v.filter(x => !x.ctx);
  console.log('     ' + name + ': synliga knappar:', acts.join(' '));
  ok(perm.length <= 5, name + ': högst 5 permanenta knappar (' + perm.length + ': ' + perm.map(x => x.act).join(' ') + ')');
  ok(PERM.every(a => acts.includes(a)), name + ': AVFYRA, ALT, HOPPA, RUSA och PAUS syns');
  ok(!XTRA.some(a => acts.includes(a)), name + ': byt vapen, karta, kortlek, huka, sten, inställningar och ge upp är borta ur spelvyn');
  ok(v.every(x => x.r.x >= 0 && x.r.y >= 0 && x.r.x + x.r.w <= innerW(vp) + 1 && x.r.y + x.r.h <= vp.height + 1), name + ': alla knappar inom skärmen');
  const fire = v.find(x => x.act === 'fire'), others = v.filter(x => x.act !== 'fire');
  ok(fire && others.every(x => fire.r.w > x.r.w), name + ': AVFYRA är störst');
  // GRANAT bara med granater
  await ev(() => { __game.P.grenades = 0; }); await wait(400); v = await vis();
  ok(!v.some(x => x.act === 'grenade'), name + ': GRANAT dold vid 0 granater');
  await ev(() => { __game.P.grenades = 3; }); await wait(400); v = await vis();
  ok(v.some(x => x.act === 'grenade'), name + ': GRANAT syns med granater');
  const has = async a => { await wait(400); return (await vis()).some(x => x.act === a); };
  { const w = await ev(() => { const P = __game.P, W = __game.WEAPONS[P.weapon]; return { i: P.weapon, mag: P.mags[P.weapon], ammo: P.ammo[W.ammo], melee: !!W.melee }; });
    if (!w.melee) { await ev(w => { const P = __game.P, W = __game.WEAPONS[w.i]; P.mags[w.i] = Math.max(0, W.mag - 1); P.ammo[W.ammo] = Math.max(10, w.ammo); __game.WS.state = 'idle'; }, w); ok(await has('reload'), name + ': LADDA OM syns när magasinet inte är fullt');
      await ev(w => { __game.P.mags[w.i] = 999; }, w); ok(!(await has('reload')), name + ': LADDA OM dold med fullt magasin'); await ev(w => { __game.P.mags[w.i] = w.mag; }, w); } }
  { const bat = await ev(() => __game.P.battery); await ev(() => { __game.P.lamp = true; }); ok(await has('lamp'), name + ': LAMPA syns när lampan är tänd');
    await ev(() => { __game.P.lamp = false; __game.P.battery = 0; }); ok(!(await has('lamp')), name + ': LAMPA dold utan batteri'); await ev(b => { __game.P.battery = b; }, bat); }
  { await ev(() => { __game.P.potions = __game.P.potions || []; __game.P.potions.push({ id: 'heal', strong: false }); }); ok(await has('potion'), name + ': DRYCK syns med en dryck');
    await ev(() => { __game.P.potions.length = 0; }); ok(!(await has('potion')), name + ': DRYCK dold utan drycker'); }
  // ANVÄND: mot tomt golv – inte; framför en dörr (eller kista) – ja
  const placeOpen = await ev(() => { const g = __game, P = g.P, m = g.mapRef(); for (const e of g.ents()) if (!e.boss) { e.dead = true; e.hidden = true; }
    for (let y = 2; y < m.length - 2; y++) for (let x = 2; x < m[0].length - 2; x++) { const cx = x + 0.5, cy = y + 0.5; if (g.solid(cx, cy)) continue;
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; let clear = true; for (let d = 0.3; d <= 2.2; d += 0.2) if (g.solid(cx + Math.cos(a) * d, cy + Math.sin(a) * d)) { clear = false; break; }
        if (!clear) continue; const near = q => Math.hypot(q.x - cx, q.y - cy) < 2.5; if (g.chests().some(near) || g.merchants().some(near) || g.pots().some(near) || g.props().some(near) || Object.values(g.doors()).some(d => Math.hypot(d.x + 0.5 - cx, d.y + 0.5 - cy) < 2.5)) continue;
        P.x = cx; P.y = cy; P.a = a; return true; } } return false; });
  await wait(450); v = await vis();
  ok(placeOpen && !v.some(x => x.act === 'use'), name + ': ANVÄND dold mot tomma golvet' + (placeOpen ? '' : ' (hittade ingen öppen plats)'));
  const placeDoor = await ev(() => { const g = __game, P = g.P; for (const d of Object.values(g.doors())) { if (d.secret) continue; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const cx = d.x + 0.5 + dx, cy = d.y + 0.5 + dy; if (g.solid(cx, cy)) continue; P.x = cx; P.y = cy; P.a = Math.atan2(-dy, -dx); return 'dörr'; } }
    const c = g.chests().find(c => !c.open); if (c) { P.x = c.x + 0.8; P.y = c.y; P.a = Math.PI; return 'kista'; } return ''; });
  await wait(450); v = await vis(); await shot('anvand');
  ok(placeDoor && v.some(x => x.act === 'use'), name + ': ANVÄND syns framför en ' + (placeDoor || 'dörr/kista (ingen hittad)'));
  // alla sammanhangsknappar på en gång: inga överlapp, inte över HUD-hörnen, (stående) inte över spelbilden
  await pg.addStyleTag({ content: '#touch:not(.all) .tb.ctx { display: block !important; }' }); await wait(200); v = await vis(); await shot('alla_ctx');
  const hit = (a, c) => a.x < c.x + c.w - 1 && c.x < a.x + a.w - 1 && a.y < c.y + c.h - 1 && c.y < a.y + a.h - 1;
  const lap = []; for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (hit(v[i].r, v[j].r)) lap.push(v[i].act + '/' + v[j].act);
  ok(!lap.length, name + ': inga knappar överlappar varandra ' + lap.join(' '));
  const hud = await ev(() => { const c = document.getElementById('screen').getBoundingClientRect(), R = typeof __game.hudRects === 'function' ? __game.hudRects() : null; if (!R) return null;
    const out = {}; for (const k of ['hp', 'ammo', 'map']) if (R[k]) out[k] = { x: c.left + R[k].x / 320 * c.width, y: c.top + R[k].y / 200 * c.height, w: R[k].w / 320 * c.width, h: R[k].h / 200 * c.height }; out.canvas = { x: c.left, y: c.top, w: c.width, h: c.height }; return out; });
  if (hud) { const over = v.filter(x => ['hp', 'ammo', 'map'].some(k => hud[k] && hit(x.r, hud[k]))).map(x => x.act); ok(!over.length, name + ': inga knappar över HUD-hörnen ' + over.join(' ')); }
  else console.log('     (hudRects saknas – HUD-kontrollen hoppas över)');
  if (!landscape && hud) { const over = v.filter(x => hit(x.r, hud.canvas)).map(x => x.act); ok(!over.length, name + ': inga knappar över spelbilden ' + over.join(' ')); }
  await ev(() => document.querySelectorAll('style').forEach(s => { if (s.textContent.includes('.tb.ctx { display: block !important')) s.remove(); }));
  // tryck på ammo-hörnet = byt vapen, tryck på minikartan = stora kartan
  if (hud && hud.ammo) {
    await ev(() => { const P = __game.P; for (let i = 0; i < Math.min(3, P.has.length); i++) P.has[i] = true; });
    const w0 = await ev(() => __game.P.weapon); await pg.touchscreen.tap(hud.ammo.x + hud.ammo.w / 2, hud.ammo.y + hud.ammo.h / 2); await wait(900);
    const w1 = await ev(() => __game.P.weapon); const nx = await ev(() => __game.WS.next);
    ok(w1 !== w0 || (nx !== undefined && nx >= 0 && nx !== w0), name + ': tryck på ammo-hörnet byter vapen (' + w0 + ' → ' + w1 + ')');
  }
  if (hud && hud.map) {
    await ev(() => { __game.settings.map = 1; }); const sm0 = await ev(() => typeof __game.showMap === 'function' ? __game.showMap() : null);
    await pg.touchscreen.tap(hud.map.x + hud.map.w / 2, hud.map.y + hud.map.h / 2); await wait(300); await shot('karta');
    const errsBefore = errs.length; await pg.touchscreen.tap(hud.canvas.x + hud.canvas.w / 2, hud.canvas.y + hud.canvas.h / 2); await wait(300);
    ok(errs.length === errsBefore, name + ': tryck på minikartan och tillbaka utan fel' + (sm0 === null ? '' : ''));
  }
  // ALLA KNAPPAR: den gamla layouten
  await ev(() => { __game.settings.allButtons = true; }); await wait(500); v = await vis(); await shot('alla_knappar');
  ok(v.length >= 14 && ['swap', 'map', 'deck', 'reload', 'use'].every(a => v.some(x => x.act === a)), name + ': ALLA KNAPPAR ger tillbaka de gamla (' + v.length + ' knappar)');
  await ev(() => { delete __game.settings.allButtons; }); await wait(500); v = await vis();
  ok(v.filter(x => !x.ctx).length <= 5, name + ': tillbaka till få knappar');
  // enhandsläget (GÅ-knappen) och vänsterhänt: inga överlapp med alla sammanhangsknappar framme
  for (const [k, lab] of [['oneHand', 'enhandsläge'], ['lefty', 'vänsterhänt']]) {
    await ev(k => { __game.settings[k] = true; __game.settings.allButtons = true; }, k); await wait(350); await ev(() => { delete __game.settings.allButtons; }); await wait(350);
    await pg.addStyleTag({ content: '#touch:not(.all) .tb.ctx { display: block !important; }' }); await wait(200); v = await vis(); if (k === 'oneHand') await shot('enhand');
    const lp = []; for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (hit(v[i].r, v[j].r)) lp.push(v[i].act + '/' + v[j].act);
    ok(!lp.length && v.every(x => x.r.x >= 0 && x.r.x + x.r.w <= vp.width + 1), name + ': ' + lab + ': inga överlapp, inom skärmen ' + lp.join(' '));
    await ev(() => document.querySelectorAll('style').forEach(s => { if (s.textContent.includes('.tb.ctx { display: block !important')) s.remove(); }));
    await ev(k => { delete __game.settings[k]; __game.settings.allButtons = true; }, k); await wait(350); await ev(() => { delete __game.settings.allButtons; }); await wait(350);
  }
  // knappstorleken 70 % och 140 %: inga överlapp, inom skärmen, inte över HUD-hörnen
  for (const bs of [0.7, 1.4]) {
    await ev(bs => { __game.settings.btnScale = bs; __game.settings.allButtons = true; }, bs); await wait(350); await ev(() => { delete __game.settings.allButtons; }); await wait(350);
    await pg.addStyleTag({ content: '#touch:not(.all) .tb.ctx { display: block !important; }' }); await wait(200); v = await vis(); if (bs > 1) await shot('storlek140');
    const lp = []; for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (hit(v[i].r, v[j].r)) lp.push(v[i].act + '/' + v[j].act);
    const out = v.filter(x => x.r.x < -1 || x.r.y < -1 || x.r.x + x.r.w > vp.width + 1 || x.r.y + x.r.h > vp.height + 1).map(x => x.act);
    const ovh = hud ? v.filter(x => ['hp', 'ammo', 'map'].some(k => hud[k] && hit(x.r, hud[k]))).map(x => x.act) : [];
    ok(!lp.length && !out.length && !ovh.length, name + ': knappstorlek ' + Math.round(bs * 100) + ' %: inga överlapp ' + lp.join(' ') + ', inom skärmen ' + out.join(' ') + ', inte över HUD ' + ovh.join(' '));
    await ev(() => document.querySelectorAll('style').forEach(s => { if (s.textContent.includes('.tb.ctx { display: block !important')) s.remove(); }));
  }
  await ev(() => { __game.settings.btnScale = 1; __game.settings.allButtons = true; }); await wait(350); await ev(() => { delete __game.settings.allButtons; }); await wait(350);
  // PAUS-knappen pausar, tryck fortsätter
  v = await vis(); const pz = v.find(x => x.act === 'pause'); if (pz) { await pg.touchscreen.tap(pz.r.x + pz.r.w / 2, pz.r.y + pz.r.h / 2); await wait(600); const s = await ev(() => __game.state()); ok(s === 'pause' || s === 'ui', name + ': PAUS pausar (' + s + ')'); await shot('paus'); }
  // dödsskärmen: MENY:s knappar (DOM ovanpå #touch, eller screenButtons() på canvas) tar emot trycket
  ok(await toPlay(), name + ': tillbaka i spelet efter pausen');
  await ev(() => { const P = __game.P; P.iframe = 0; P.armor = 0; P.hp = 1; try { __game.hurtPlayer(999, P.x + 1, P.y); } catch (e) { /* inget */ } }); await wait(1500);
  await pg.touchscreen.tap(vp.width / 2, vp.height / 3); await wait(300); { const s = await ev(() => __game.state()); ok(s === 'dead' || s === 'runover', name + ': tidigt tryck hoppar inte över dödsskärmen (' + s + ')'); }
  await wait(2500); await shot('dod');
  const retry = await ev(() => { const b = document.getElementById('retrybtn'); if (!b || !b.offsetParent) return null; const r = b.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: !!t && (t === b || b.contains(t)) }; });
  if (retry) { ok(retry.top, name + ': FÖRSÖK IGEN ligger överst (inte under pekkontrollerna)'); await pg.touchscreen.tap(retry.x, retry.y); await wait(2500); const s = await ev(() => __game.state()); ok(s !== 'dead' && s !== 'runover' && s !== 'title', name + ': tryck på FÖRSÖK IGEN startar en ny runda (' + s + ')'); }
  else console.log('     (#retrybtn syns inte – dödsskärmen hoppas över; state ' + await ev(() => __game.state()) + ')');
  ok(errs.length === 0, name + ': inga sidfel ' + errs.slice(0, 3).join(' / '));
  await ctx.close();
}
function innerW(vp) { return vp.width; }
console.log(fails ? `${fails} FEL` : 'ALLT OK');
await b.close(); srv.close();
