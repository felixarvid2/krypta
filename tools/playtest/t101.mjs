// t101 (QA efter UI-omgörningen): varje läge i LÄGEN startar rätt sak, FÖRSÖK IGEN börjar om i samma läge, och tillbaka-flödena
// (Escape/TILLBAKA i undermenyerna, SAMLINGAR:s dialoger, KAMPANJEN, banbyggaren, INSTÄLLNINGAR, pausmenyns val) hamnar rätt.
// Invarianter efter varje steg: inga sidfel, aldrig state 'ui' utan öppen dialog, startskärmen syns bara i state 'title'.
// Dialoger passeras med riktiga tangenter/klick (aldrig CardUI.close()). Handkontrollen simuleras med en falsk navigator.getGamepads.
// Telefon liggande (Pixel 7): lägen startar med tryck, väljarna (bossjakten, kampanjen, övningen) och TILLBAKA ligger inom skärmen.
import { setup, chromium, CHROMIUM } from './head.mjs';
import { createRequire } from 'module';
const req = createRequire(import.meta.url); let PW; for (const m of ['playwright-core', 'playwright', '/opt/node22/lib/node_modules/playwright']) { try { PW = req(m); break; } catch (e) { /* nästa */ } }
const { devices } = PW;
const PORT = 8971, OUT = 'out/t101';
const { pg, errs, shot, ev, wait, ok, done } = await setup(PORT, OUT);
await pg.setViewportSize({ width: 1280, height: 720 });
let fails = 0; const chk = (c, m) => { if (!c) fails++; ok(c, m); };
const snap = (p = pg) => p.evaluate(() => { const r = __game.run(), sub = ['mainmenu', 'moremodes', 'setup', 'collections'].find(id => !document.getElementById(id).hidden);
  return { st: __game.state(), title: !document.getElementById('title').hidden, sub, ui: CardUI.isOpen(), cu: CardUI.isOpen() ? ((document.querySelector('#cardui .cu-title, #cardui h2, #cardui .cu-head') || {}).textContent || '?').slice(0, 24) : '', ed: !!document.getElementById('editor'),
    act: document.activeElement ? document.activeElement.id || '' : '', r: r ? { daily: !!r.daily, weekly: !!r.weekly, monthly: !!r.monthly, bossrush: !!r.bossrush, hunt: !!r.hunt, survival: !!r.survival, maze: !!r.maze, abyss: !!r.abyss, abyssDaily: !!r.abyssDaily, campaign: !!r.campaign, hub: !!r.hub, custom: !!r.custom, pr: r.practice ? Object.keys(r.practice).join(',') : '', seed: r.seed, depth: r.depth } : null }; });
const inv = async (lbl, p = pg, er = errs) => { const s = await snap(p); const bad = [];
  if (s.st === 'ui' && !s.ui) bad.push("state 'ui' utan dialog"); if (s.title !== (s.st === 'title')) bad.push(`startskärmen ${s.title ? 'syns' : 'dold'} i state ${s.st}`); if (er.length) bad.push('sidfel: ' + er.splice(0).join(' | '));
  if (bad.length) chk(false, `${lbl}: ${bad.join('; ')}`); return s; };
const toTitle = async () => { await ev(() => { localStorage.removeItem('krypta.run'); __game.showTitle(); }); await wait(250); };
const isDraft = () => ev(() => !!document.querySelector('#cardui .cu-card, #cardui .cu-cards'));
// genom startdialogerna med riktiga tangenter: kortval hoppas över (Escape), väljare tar första valet (Enter), kapitelintrot stängs (Escape)
const advance = async (p = pg) => { for (let i = 0; i < 8; i++) { const s = await snap(p); if (!s.ui) break; const t = s.cu;
  await p.keyboard.press(/BOSSJAKTEN/.test(t) ? 'Enter' : 'Escape'); await p.waitForTimeout(450); if ((await snap(p)).cu === t && (await snap(p)).ui) { await p.keyboard.press('Enter'); await p.waitForTimeout(450); } }
  const s = await snap(p); if (s.st === 'pause') { await p.evaluate(() => __game.resume()); await p.waitForTimeout(150); } return snap(p); };
const die = async () => { await ev(() => { __game.run().cause = 'TEST'; __game.hurtPlayer(99999); }); await wait(2600); };

await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 60000 });
await ev(() => { __game.profile.tutDone = true; __game.profile.runs = Math.max(1, __game.profile.runs); localStorage.removeItem('krypta.run'); __game.refreshTitle(); }); await wait(200);
await inv('start');

// ---- 1. varje läge i LÄGEN, och FÖRSÖK IGEN i samma läge ----
const MODES = [
  ['daily', 'DAGENS RUNDA', r => r.daily && !r.weekly && !r.monthly],
  ['weekly', 'VECKANS UTMANING', r => r.weekly],
  ['monthly', 'MÅNADENS UTMANING', r => r.monthly],
  ['bossrush', 'BOSSRUSH', r => r.bossrush && !r.hunt && r.depth > 1],
  ['survival', 'ÖVERLEVNAD', r => r.survival],
  ['mazebtn', 'LABYRINTEN', r => r.maze],
  ['abyssbtn', 'AVGRUNDEN', r => r.abyss && !r.abyssDaily],
  ['abyssdaily', 'DAGENS AVGRUND', r => r.abyss && r.abyssDaily],
  ['huntbtn', 'BOSSJAKTEN', r => r.hunt],
  ['campaignbtn', 'KAMPANJEN', r => r.campaign]];
for (const [id, name, want] of MODES) {
  await toTitle(); await pg.click('#moremodesbtn'); await wait(150); await pg.click('#' + id); await wait(1800);
  if (id === 'campaignbtn') { chk(await ev(() => CardUI.isOpen() && document.querySelectorAll('#cardui .cu-li').length > 0), 'KAMPANJEN öppnar kapitellistan'); await pg.click('#cardui .cu-li >> nth=0'); await wait(1800); }
  let s = await inv(name + ' start'); if (id === 'huntbtn' || id === 'abyssbtn') await shot('start_' + id);
  s = await advance();
  chk(s.st === 'play' && s.r && want(s.r), `${name}: startar och går att spela (${s.st}, ${JSON.stringify(s.r && Object.keys(s.r).filter(k => s.r[k] === true))})`);
  await inv(name + ' i spelet');
  await die(); s = await inv(name + ' död');
  chk(s.st === 'dead' && await ev(() => !document.getElementById('runover').hidden), `${name}: dödsskärmen visas`);
  await pg.click('#retrybtn'); await wait(1800); s = await inv(name + ' försök igen');
  s = await advance();
  chk(s.st === 'play' && s.r && want(s.r), `${name}: FÖRSÖK IGEN börjar om i samma läge (${JSON.stringify(s.r && Object.keys(s.r).filter(k => s.r[k] === true))})`);
  await die(); await pg.click('#romenubtn'); await wait(400); s = await inv(name + ' meny');
  chk(s.st === 'title' && s.sub === 'mainmenu', `${name}: MENY går till startskärmen`);
}
// FÖRSÖK IGEN efter en vanlig runda: en vanlig runda
await toTitle(); await pg.click('#start'); await wait(1600); await advance(); await die(); await pg.keyboard.press('Enter'); await wait(1600);
{ const s = await advance(); chk(s.st === 'play' && !Object.entries(s.r).some(([k, v]) => v === true), 'vanlig runda: Enter på dödsskärmen = en ny vanlig runda'); }
// LÄGRET
await toTitle(); await pg.click('#moremodesbtn'); await pg.click('#hubbtn'); await wait(2500);
{ const s = await inv('lägret'); chk(s.st === 'play' && s.r.hub, 'LÄGRET öppnas'); }
// ÖVNING (en biom) och den egna banan: FÖRSÖK IGEN kör samma sak igen
await toTitle(); await pg.click('#collbtn'); await pg.click('#practicebtn'); await wait(400); await pg.click('#cardui .cu-li >> nth=1'); await wait(1800);
{ let s = await advance(); chk(s.st === 'play' && s.r.pr === 'biome', 'ÖVNING: en biom startar');
  await die(); await pg.click('#retrybtn'); await wait(1800); s = await advance(); chk(s.st === 'play' && s.r.pr === 'biome', `ÖVNING: FÖRSÖK IGEN övar igen (${s.r.pr})`); await inv('övning'); }
await toTitle(); await pg.click('#moremodesbtn'); await pg.click('#editorbtn'); await wait(400); await pg.click('#editor button:has-text("PROVSPELA")'); await wait(1500);
{ let s = await advance(); chk(s.st === 'play' && s.r.custom, 'BANBYGGAREN: PROVSPELA startar den egna banan');
  await die(); await pg.click('#retrybtn'); await wait(1800); s = await advance(); chk(s.st === 'play' && s.r.custom, 'BANBYGGAREN: FÖRSÖK IGEN spelar den egna banan igen'); await inv('egen bana'); }
// FRÖ: Enter i fröfältet startar med fröet
await toTitle(); await pg.click('#moremodesbtn'); await pg.click('#seed'); await pg.keyboard.type('abc'); await wait(100);
chk(await ev(() => document.activeElement.id) === 'seed', 'FRÖ: bokstäverna flyttar inte markeringen');
await pg.keyboard.press('Enter'); await wait(1600);
{ const s = await advance(); chk(s.st === 'play' && s.r.seed === parseInt('abc', 36), `FRÖ: Enter startar med fröet (${s.r && s.r.seed})`); }
// FORTSÄTT: rundan ovan sparas på våning 2, startskärmen visar FORTSÄTT
await ev(() => { __game.loadFloor(2); }); await wait(800); await ev(() => { if (CardUI.isOpen()) return; __game.showTitle(); }); await wait(300);
await ev(() => { if (CardUI.isOpen()) document.querySelector('#cardui .cu-btn.ghost, #cardui button')?.click(); }); await wait(200); await ev(() => __game.showTitle()); await wait(300);
await ev(() => document.getElementById('seed').value = '');
if (await ev(() => !document.getElementById('continue').hidden)) { await pg.click('#continue'); await wait(1600); const s = await advance(); chk(s.st === 'play' && s.r.seed === parseInt('abc', 36) && s.r.depth >= 2, `FORTSÄTT laddar den sparade rundan (våning ${s.r && s.r.depth})`); }
else chk(false, 'FORTSÄTT syns med en sparad runda');
// ANPASSA → START
await toTitle(); await pg.click('#setupbtn'); await wait(150); await pg.click('#setupstart'); await wait(1600);
{ const s = await advance(); chk(s.st === 'play', 'ANPASSA → START startar en runda'); }

// ---- 2. tillbaka-flödena på startskärmen ----
await toTitle();
for (const [btn, box] of [['#moremodesbtn', 'moremodes'], ['#setupbtn', 'setup'], ['#collbtn', 'collections']]) {
  await pg.click(btn); await wait(150); await pg.keyboard.press('Escape'); await wait(150);
  let s = await inv('esc ' + box); chk(s.sub === 'mainmenu' && s.act === btn.slice(1), `Escape i ${box} → huvudlistan med markeringen på ${btn}`);
  await pg.click(btn); await wait(150); await pg.click(`#${box} [data-back]`); await wait(150);
  s = await inv('tillbaka ' + box); chk(s.sub === 'mainmenu', `TILLBAKA i ${box} → huvudlistan`);
}
for (const id of ['unlocks', 'altar', 'profilebtn', 'bestiary', 'achbtn', 'codexbtn', 'practicebtn', 'statsbtn', 'chroniclebtn', 'titlesbtn', 'manualbtn', 'newsbtn']) {
  await ev(() => __game.showTitle()); await wait(100); await pg.click('#collbtn'); await wait(100); await pg.click('#' + id); await wait(350);
  const o = await inv(id + ' öppen'); await pg.keyboard.press('Escape'); await wait(300);
  const s = await inv(id + ' stängd');
  chk(o.ui && !s.ui && s.st === 'title' && s.sub === 'collections' && s.act === id, `SAMLINGAR → ${o.cu || id}: öppnas, Escape stänger och lämnar markeringen på knappen`);
}
await pg.keyboard.press('ArrowDown'); await wait(100); chk(await ev(() => document.activeElement.id) !== 'newsbtn', 'pilarna fungerar efter dialogerna');
await ev(() => __game.showTitle()); await pg.click('#moremodesbtn'); await pg.click('#campaignbtn'); await wait(300); await pg.keyboard.press('Escape'); await wait(300);
{ const s = await inv('kampanjen esc'); chk(!s.ui && s.sub === 'moremodes' && s.act === 'campaignbtn', 'KAMPANJEN: Escape → tillbaka i LÄGEN'); }
// banbyggaren: tangenterna läcker inte till startskärmen bakom, Escape = STÄNG
await pg.click('#editorbtn'); await wait(400); await shot('banbyggaren');
await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('Enter'); await pg.keyboard.press('Digit3'); await wait(600);
{ const s = await inv('banbyggaren tangenter'); chk(s.ed && s.st === 'title' && !s.ui, `banbyggaren: pilar/Enter/siffror startar inget bakom (${s.st}${s.ui ? ' ' + s.cu : ''})`); }
await pg.keyboard.press('Escape'); await wait(300);
{ const s = await inv('banbyggaren esc'); chk(!s.ed && s.st === 'title' && s.sub === 'moremodes', 'banbyggaren: Escape stänger och lämnar LÄGEN öppen'); }
await pg.click('#editorbtn'); await wait(300); await pg.click('#editor button:has-text("STÄNG")'); await wait(300);
{ const s = await inv('banbyggaren stäng'); chk(!s.ed && s.sub === 'moremodes', 'banbyggaren: STÄNG → LÄGEN'); }
// inställningarna: alla flikar, STÄNG
await ev(() => __game.showTitle()); await pg.click('#settingsbtn'); await wait(300);
{ const n = await ev(() => document.querySelectorAll('.cu-tab').length); for (let i = 0; i < n; i++) { await pg.click(`.cu-tab >> nth=${i}`); await wait(120); await inv('flik ' + i); }
  chk(n >= 4, `INSTÄLLNINGAR: ${n} flikar går att öppna`); }
await pg.click('#cardui .cu-foot button, #cardui button:has-text("STÄNG")'); await wait(300);
{ const s = await inv('inställningar stäng'); chk(!s.ui && s.st === 'title' && s.act === 'settingsbtn', 'INSTÄLLNINGAR: STÄNG → startskärmen'); }
// handkontrollen: styrkorset flyttar, A väljer, B backar (falsk getGamepads)
await ev(() => { const btn = () => ({ pressed: false, value: 0 }); window.__pad = { connected: true, id: 'test', index: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn) }; navigator.getGamepads = () => [window.__pad]; });
const pad = async (i, ms = 80) => { await ev(i => { window.__pad.buttons[i] = { pressed: true, value: 1 }; }, i); await wait(ms); await ev(i => { window.__pad.buttons[i] = { pressed: false, value: 0 }; }, i); await wait(120); };
await ev(() => { __game.showTitle(); document.getElementById('start').focus(); }); await wait(100);
await pad(13); { const a = await ev(() => document.activeElement.id); chk(a === 'moremodesbtn', 'handkontroll: styrkorset ned → LÄGEN (' + a + ')'); }
await pad(12); await pad(13); chk(await ev(() => document.activeElement.id) === 'moremodesbtn', 'handkontroll: upp och ned igen');
await pad(0); { const s = await inv('pad A'); chk(s.sub === 'moremodes', 'handkontroll: A öppnar LÄGEN'); }
await pad(1); { const s = await inv('pad B'); chk(s.sub === 'mainmenu', 'handkontroll: B går tillbaka'); }
await ev(() => { navigator.getGamepads = () => []; }); await wait(100);

// ---- 3. pausmenyn i ett specialläge: allt går tillbaka till pausmenyn ----
await toTitle(); await pg.click('#moremodesbtn'); await pg.click('#survival'); await wait(1800); await advance();
const pmenu = () => ev(() => CardUI.isOpen() && [...document.querySelectorAll('.cu-opt')].length === 6 && /PAUS/.test(document.getElementById('cardui').innerText));
await pg.keyboard.press('Escape'); await wait(200); chk((await inv('paus')).st === 'pause', 'Escape pausar');
await pg.keyboard.press('Escape'); await wait(300); chk(await pmenu(), 'Escape på pausskärmen öppnar pausmenyn');
for (const [n, lbl] of [[1, 'INSTÄLLNINGAR'], [2, 'KARTA'], [3, 'KORTLEKEN'], [4, 'MER']]) {
  await pg.click(`.cu-opt >> nth=${n}`); await wait(350); const o = await inv('paus ' + lbl); if (lbl === 'KORTLEKEN') await shot('paus_kortleken'); if (lbl === 'KARTA') { chk(o.st === 'pause' && await ev(() => __game.state() === 'pause'), 'KARTA visar kartan i pausen'); await shot('paus_karta'); }
  await pg.keyboard.press('Escape'); await wait(350); await inv('paus ' + lbl + ' esc');
  chk(await pmenu(), `pausen → ${lbl} → Escape: tillbaka i pausmenyn`);
}
await pg.click('.cu-opt >> nth=5'); await wait(300); await pg.keyboard.press('Escape'); await wait(300); await inv('ge upp avbryt');
chk(await pmenu(), 'GE UPP → avbryt: tillbaka i pausmenyn');
await pg.click('.cu-opt >> nth=0'); await wait(300);
{ const s = await inv('fortsätt'); chk(s.st === 'play', 'FORTSÄTT återupptar'); }
await pg.keyboard.press('Escape'); await wait(200); await shot('paus_efter_karta');
chk(await ev(() => __game.state() === 'pause') && !(await ev(() => CardUI.isOpen())), 'pausskärmen efter KARTA visar inte kartan kvar (pauseMap nollställd)');
await pg.keyboard.press('Enter'); await wait(300); await pg.click('.cu-opt >> nth=5'); await wait(300); await pg.click('.cu-opt >> nth=0'); await wait(500);
{ const s = await inv('ge upp'); chk(s.st === 'title' && s.sub === 'mainmenu', 'GE UPP → startskärmen'); }
chk(errs.length === 0, 'inga sidfel (dator) ' + errs.join(' / '));

// ---- 4. telefon liggande (Pixel 7) ----
const px = devices['Pixel 7'];
const b2 = await chromium.launch({ executablePath: CHROMIUM, args: ['--use-gl=swiftshader', '--no-sandbox'] });
const ctx = await b2.newContext({ ...px, viewport: { width: px.viewport.height, height: px.viewport.width }, deviceScaleFactor: 1 });
const p2 = await ctx.newPage(); const errs2 = []; p2.on('pageerror', e => errs2.push(e.message));
const e2 = (f, a) => p2.evaluate(f, a), w2 = ms => p2.waitForTimeout(ms);
await p2.goto(`http://localhost:${PORT}/index.html?nolock=1`); await p2.waitForFunction('!document.getElementById("start").disabled', { timeout: 60000 });
await e2(() => { __game.profile.tutDone = true; __game.profile.runs = Math.max(1, __game.profile.runs); localStorage.removeItem('krypta.run'); __game.refreshTitle(); }); await w2(200);
const outside = () => e2(() => [...document.querySelectorAll('#title button, #title input, #cardui button, #cardui .cu-opt, #cardui .cu-li, .endscr button')].filter(b => b.offsetParent !== null).filter(b => { const r = b.getBoundingClientRect(), sc = (() => { for (let n = b.parentElement; n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n).overflowY; if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight + 1) return n; } return null; })(); if (sc) { const s = sc.getBoundingClientRect(); if (r.bottom > s.bottom + 1 || r.top < s.top - 1) return false; } return r.left < -0.5 || r.top < -0.5 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5; }).map(b => (b.id || b.textContent.trim()).slice(0, 16)));
const t2 = async () => { await e2(() => { localStorage.removeItem('krypta.run'); __game.showTitle(); }); await w2(250); };
for (const [id, name, want] of [['daily', 'DAGENS RUNDA', r => r.daily], ['survival', 'ÖVERLEVNAD', r => r.survival], ['abyssbtn', 'AVGRUNDEN', r => r.abyss], ['huntbtn', 'BOSSJAKTEN', r => r.hunt], ['mazebtn', 'LABYRINTEN', r => r.maze], ['bossrush', 'BOSSRUSH', r => r.bossrush]]) {
  await t2(); await p2.tap('#moremodesbtn'); await w2(200); await p2.tap('#' + id); await w2(1800);
  await inv('telefon ' + name, p2, errs2);
  if (await e2(() => CardUI.isOpen())) { const bad = await outside(); chk(bad.length === 0, `telefon: ${name} – dialogens val inom skärmen ${bad.join(' ')}`); if (id === 'huntbtn') { await p2.screenshot({ path: OUT + '/telefon_bossjakten.png' }); chk(await e2(() => { const s = document.querySelector('#cardui .cu-screen'); return s.scrollHeight <= s.clientHeight + 1; }), 'telefon: bossjaktens väljare (alla bossar) utan rullning'); } }
  if (id === 'huntbtn') { await p2.tap('#cardui .cu-opt >> nth=0'); await w2(1500); }
  const s = await advance(p2); chk(s.st === 'play' && s.r && want(s.r), `telefon: ${name} startar (${s.st})`);
}
await t2(); await p2.tap('#moremodesbtn'); await w2(200); await p2.tap('#campaignbtn'); await w2(400);
{ const bad = await outside(); chk(bad.length === 0, 'telefon: kampanjlistan inom skärmen ' + bad.join(' ')); await p2.screenshot({ path: OUT + '/telefon_kampanjen.png' }); }
await p2.tap('#cardui .cu-li >> nth=0'); await w2(1500);
await p2.tap('#cardui .cu-li >> nth=0'); await w2(600); chk(await e2(() => !!document.querySelector('#cardui .cu-card')), 'telefon: kapitelintrot – tryck på raden ("TRYCK FÖR ATT BÖRJA") går till kortvalet');
{ const s = await advance(p2); chk(s.st === 'play' && s.r.campaign, 'telefon: kampanjens första kapitel startar'); }
{ // pausknappen → KORTLEKEN: STÄNG syns utan att rulla och går tillbaka till pausmenyn
  const pb = await e2(() => { const b = [...document.querySelectorAll('#touch .tb')].find(x => x.offsetParent !== null && x.dataset.act === 'pause'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  if (pb) { await p2.touchscreen.tap(pb.x, pb.y); await w2(500);
    chk(await e2(() => CardUI.isOpen() && document.querySelectorAll('.cu-opt').length === 6), 'telefon: pausknappen öppnar pausmenyn');
    await p2.tap('.cu-opt >> nth=3'); await w2(600); await p2.screenshot({ path: OUT + '/telefon_kortleken.png' });
    const c = await e2(() => { const b = [...document.querySelectorAll('#cardui button')].find(x => x.offsetParent && x.textContent === 'STÄNG'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, ok: r.top >= 0 && r.bottom <= innerHeight + 0.5 }; });
    chk(c && c.ok, 'telefon: kortlekens STÄNG inom skärmen ' + JSON.stringify(c));
    if (c) { await p2.touchscreen.tap(c.x, c.y); await w2(500); }
    chk(await e2(() => CardUI.isOpen() && document.querySelectorAll('.cu-opt').length === 6), 'telefon: STÄNG i kortleken → tillbaka i pausmenyn');
    await inv('telefon kortleken', p2, errs2); await p2.tap('.cu-opt >> nth=0'); await w2(300); chk((await snap(p2)).st === 'play', 'telefon: FORTSÄTT i pausmenyn');
  } else chk(false, 'telefon: pausknappen syns'); }
await t2(); await p2.tap('#collbtn'); await w2(200); await p2.tap('#practicebtn'); await w2(400);
{ const bad = await outside(); chk(bad.length === 0, 'telefon: övningslistan inom skärmen ' + bad.join(' ')); await p2.screenshot({ path: OUT + '/telefon_ovning.png' }); }
{ const foot = await e2(() => { const b = document.querySelector('#cardui .cu-foot button'); return b && b.offsetParent ? b.getBoundingClientRect().toJSON() : null; });
  if (foot) { await p2.tap('#cardui .cu-foot button'); await w2(300); } else { await p2.keyboard.press('Escape'); await w2(300); }
  const s = await inv('telefon övning stäng', p2, errs2); chk(!s.ui && s.sub === 'collections', 'telefon: övningen stängs och SAMLINGAR ligger kvar'); }
// varje samling på telefonen: stängknappen syns utan att rulla och ett tryck på den går tillbaka till SAMLINGAR
for (const id of ['unlocks', 'altar', 'profilebtn', 'bestiary', 'achbtn', 'codexbtn', 'practicebtn', 'statsbtn', 'chroniclebtn', 'titlesbtn', 'manualbtn', 'newsbtn']) {
  await e2(() => __game.showTitle()); await w2(100); await p2.tap('#collbtn'); await w2(150); await p2.tap('#' + id); await w2(450);
  const c = await e2(() => { const b = [...document.querySelectorAll('#cardui button')].filter(x => x.offsetParent !== null).find(x => /^(STÄNG|TILLBAKA|LÄMNA|KLAR)/.test(x.textContent.trim())); if (!b) return null; const r = b.getBoundingClientRect(); return { t: b.textContent.trim(), x: r.x + r.width / 2, y: r.y + r.height / 2, ok: r.top >= 0 && r.bottom <= innerHeight + 0.5 && r.left >= 0 && r.right <= innerWidth + 0.5 }; });
  if (id === 'unlocks' || id === 'codexbtn') await p2.screenshot({ path: `${OUT}/telefon_${id}.png` });
  if (c) await p2.touchscreen.tap(c.x, c.y); await w2(350);
  const s = await inv('telefon ' + id, p2, errs2);
  chk(c && c.ok && !s.ui && s.sub === 'collections', `telefon: ${id} – ${c ? c.t : 'ingen stängknapp'} inom skärmen och tillbaka i SAMLINGAR ${c ? Math.round(c.y) : ''}`);
}
await e2(() => __game.showTitle()); await w2(100); await p2.tap('#moremodesbtn'); await w2(150); await p2.tap('#editorbtn'); await w2(400);
{ const c = await e2(() => { const b = [...document.querySelectorAll('#editor button')].find(x => x.textContent === 'STÄNG'); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, ok: r.top >= 0 && r.bottom <= innerHeight + 0.5 }; });
  await p2.screenshot({ path: OUT + '/telefon_banbyggaren.png' });
  if (c.ok) await p2.touchscreen.tap(c.x, c.y); else await p2.tap('#editor button:has-text("STÄNG")'); await w2(300);
  const s = await inv('telefon banbyggaren', p2, errs2); chk(!s.ed && s.sub === 'moremodes', 'telefon: banbyggarens STÄNG → LÄGEN'); if (!c.ok) console.log('     (känt: banbyggarens knappar ligger under rutnätet i liggande telefon – rullning krävs; banbyggaren rörs inte i UI-omgörningen)'); }
for (const box of ['collections', 'moremodes', 'setup']) { const btn = { collections: '#collbtn', moremodes: '#moremodesbtn', setup: '#setupbtn' }[box];
  if (await e2(b => document.getElementById(b).hidden, box)) { await e2(() => __game.showTitle()); await w2(100); await p2.tap(btn); await w2(200); }
  await p2.tap(`#${box} [data-back]`); await w2(200); const s = await inv('telefon tillbaka ' + box, p2, errs2); chk(s.sub === 'mainmenu', `telefon: TILLBAKA i ${box}`); }
await p2.screenshot({ path: OUT + '/telefon_start.png' });
chk(errs2.length === 0, 'inga sidfel (telefon) ' + errs2.join(' / '));
await b2.close();
console.log(fails ? `${fails} FEL` : 'ALLT OK');
await done();
