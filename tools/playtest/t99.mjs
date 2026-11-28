// t99: menyerna och skärmarna (UI-omgörningen "mindre är mer").
// Startskärmen: högst 6 synliga val på toppnivå, ingen tagline, alla gamla id finns kvar; LÄGEN/ANPASSA/SAMLINGAR öppnar undermenyer
// där #daily, #hubbtn, #campaignbtn osv. går att klicka och startar rätt sak; pilar + Enter + Escape styr listan.
// Pausen: FORTSÄTT, INSTÄLLNINGAR, KARTA, KORTLEKEN, MER, GE UPP. Dödsskärmen: DU DOG, DÖDAD AV, FÖRSÖK IGEN och MENY; FÖRSÖK IGEN startar
// en ny runda. Nivåslutet: TID/DÖDADE/HEMLIGHETER/GULD, betyg och VIDARE. Telefon liggande (Pixel 7): inga knappar utanför skärmen, riktiga tryck.
import { setup, chromium, CHROMIUM } from './head.mjs';
import { createRequire } from 'module';
const req = createRequire(import.meta.url); let PW; for (const m of ['playwright-core', 'playwright', '/opt/node22/lib/node_modules/playwright']) { try { PW = req(m); break; } catch (e) { /* nästa */ } }
const { devices } = PW;
const PORT = 8993;
const { pg, errs, shot, ev, wait, ok, done } = await setup(PORT, 'out/t99');
let fails = 0; const chk = (c, m) => { if (!c) fails++; ok(c, m); };
const OLD_IDS = ['start', 'continue', 'daily', 'hubbtn', 'campaignbtn', 'moremodesbtn', 'moremodes', 'bossrush', 'weekly', 'survival', 'mazebtn', 'abyssbtn', 'abyssdaily', 'huntbtn', 'monthly', 'editorbtn', 'seed',
  'setupsum', 'setupbtn', 'setup', 'diff', 'asc', 'classes', 'petlabel', 'pets', 'cmlabel', 'cmodes', 'slotlabel', 'slots', 'souls', 'unlocks', 'altar', 'settingsbtn', 'manualbtn', 'newsbtn', 'collbtn', 'fullscreen',
  'collections', 'profilebtn', 'bestiary', 'achbtn', 'codexbtn', 'practicebtn', 'statsbtn', 'chroniclebtn', 'titlesbtn', 'ptitle', 'best', 'dailyinfo', 'version', 'status', 'loadwrap', 'loadbar', 'loadhelp', 'tagline'];
const visibleTop = () => ev(() => [...document.querySelectorAll('#title button')].filter(b => b.offsetParent !== null).map(b => b.id || b.textContent.trim()));
const title = async () => { await ev(() => { if (CardUI.isOpen()) CardUI.close(); __game.showTitle(); }); await wait(250); };

await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 60000 });
await ev(() => { __game.profile.tutDone = true; __game.profile.runs = Math.max(1, __game.profile.runs); localStorage.removeItem('krypta.run'); __game.refreshTitle(); }); await wait(200);
// ---- startskärmen ----
const top = await visibleTop();
chk(top.length <= 6, `högst 6 synliga knappar på toppnivå (${top.length}: ${top.join(', ')})`);
chk(await ev(() => { const t = document.getElementById('tagline'); return !t || t.offsetParent === null; }), 'ingen tagline syns');
const missing = await ev(ids => ids.filter(id => !document.getElementById(id)), OLD_IDS);
chk(missing.length === 0, 'alla gamla id finns kvar ' + missing.join(','));
chk(await ev(() => document.getElementById('start').textContent.trim()) === 'SPELA', 'SPELA i listan');
await shot('title');
// tangentbordet: pil ned till LÄGEN, Enter öppnar undermenyn, Escape tillbaka
await ev(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('ArrowDown'); await wait(100);
chk(await ev(() => document.activeElement.id) === 'moremodesbtn', 'pilarna flyttar markeringen (' + await ev(() => document.activeElement.id) + ')');
await pg.keyboard.press('Enter'); await wait(150);
chk(await ev(() => !document.getElementById('moremodes').hidden && document.getElementById('mainmenu').hidden), 'Enter öppnar LÄGEN');
chk(await ev(() => document.getElementById('daily').offsetParent !== null && document.getElementById('dailyinfo').textContent.length > 0), 'dagens runda och dagens info ligger i LÄGEN');
await shot('lagen');
await pg.keyboard.press('Escape'); await wait(150);
chk(await ev(() => document.getElementById('moremodes').hidden && !document.getElementById('mainmenu').hidden), 'Escape går tillbaka till huvudlistan');
// SAMLINGAR och ANPASSA
await pg.click('#collbtn'); await wait(150);
chk(await ev(() => ['unlocks', 'altar', 'profilebtn', 'bestiary', 'achbtn', 'codexbtn', 'practicebtn', 'statsbtn', 'chroniclebtn', 'titlesbtn', 'manualbtn', 'newsbtn'].every(id => document.getElementById(id).offsetParent !== null)), 'SAMLINGAR visar alla samlingar');
await shot('samlingar');
for (const b of ['#manualbtn', '#newsbtn']) { // handboken och nyheterna: ett avsnitt i taget, < > bläddrar
  await pg.click(b); await wait(250);
  const pn = () => ev(() => { const p = document.querySelector('#cardui .cu-pn'); return p ? p.textContent : ''; }), visN = () => ev(() => [...document.querySelectorAll('#cardui .cu-li')].filter(l => l.offsetParent !== null).length);
  const p0 = await pn(), n0 = await visN(), all = await ev(() => document.querySelectorAll('#cardui .cu-li').length);
  chk(/1\/\d+/.test(p0) && n0 > 0 && n0 < all, `${b}: ett avsnitt i taget (${p0}, ${n0} av ${all} rader)`);
  await pg.keyboard.press('Enter'); await wait(100); const p1 = await pn(); chk(p1 !== p0 && /2\/\d+/.test(p1), `${b}: Enter (fokus på >) bläddrar (${p1})`);
  await pg.click('#cardui .cu-pv'); await wait(100); chk(await pn() === p0, `${b}: < bläddrar tillbaka`);
  if (b === '#manualbtn') await shot('handbok');
  await pg.keyboard.press('Escape'); await wait(200); if (await ev(() => CardUI.isOpen())) await ev(() => CardUI.close());
  if (await ev(() => document.getElementById('collections').hidden)) { await pg.click('#collbtn'); await wait(150); }
}
await pg.click('#collections [data-back]'); await wait(150);
await pg.click('#setupbtn'); await wait(150);
// ANPASSA: rader med ◀ VÄRDE ▶ (de gamla knappraderna finns kvar dolda i DOM)
const rows = () => ev(() => [...document.querySelectorAll('#srows .srow')].filter(r => r.offsetParent !== null).map(r => r.dataset.k + '=' + r.querySelector('.sv').textContent));
const sum = () => ev(() => document.getElementById('setupsum').textContent);
{ const rs = await rows(); chk(['diff', 'cls', 'cmode', 'slot'].every(k => rs.some(r => r.startsWith(k + '='))) && await ev(() => document.querySelectorAll('#diff button').length >= 4 && document.querySelectorAll('#classes button').length >= 4), 'ANPASSA: en rad per inställning (' + rs.join(' | ') + ')'); }
chk(await ev(() => document.querySelectorAll('#setup button').length && [...document.querySelectorAll('#setup button')].filter(b => b.offsetParent !== null).length <= 9), 'ANPASSA: få synliga knappar (' + await ev(() => [...document.querySelectorAll('#setup button')].filter(b => b.offsetParent !== null).length) + ')');
chk(await ev(() => document.activeElement && document.activeElement.dataset.k === 'diff'), 'ANPASSA: första raden markerad');
await shot('anpassa');
{ const s0 = await sum(), d0 = await ev(() => __game.settings.diff); await pg.keyboard.press('ArrowRight'); await wait(100);
  chk(await ev(() => __game.settings.diff) !== d0 && await sum() !== s0 && await ev(() => document.activeElement.dataset.k === 'diff'), `ANPASSA: höger byter svårighet (${s0} → ${await sum()})`);
  await pg.keyboard.press('ArrowLeft'); await wait(100); chk(await ev(() => __game.settings.diff) === d0, 'ANPASSA: vänster byter tillbaka'); }
await pg.keyboard.press('ArrowDown'); await wait(100);
chk(await ev(() => document.activeElement.dataset.k) === 'cls', 'ANPASSA: ned flyttar till nästa rad (' + await ev(() => document.activeElement.dataset.k) + ')');
{ const s0 = await sum(); await pg.click('#srows [data-k=cmode] .sa.r'); await wait(100);
  chk(await ev(() => __game.settings.cmode) === 'onehit' && await sum() !== s0 && /ETT SLAG/.test(await sum()), 'ANPASSA: klick på ▶ byter utmaning och sammanfattningen ändras (' + await sum() + ')');
  chk((await ev(() => document.getElementById('setupdesc').textContent)).includes('1 HP'), 'ANPASSA: en rad beskrivning för det valda');
  await pg.click('#srows [data-k=cmode] .sa.l'); await wait(100); chk(await ev(() => __game.settings.cmode) === '', 'ANPASSA: klick på ◀ byter tillbaka'); }
{ // låst klass: visas med kostnad men väljs inte, START startar inte med fel klass
  const c0 = await ev(() => __game.settings.cls || 'vandrare'); await ev(() => { __game.profile.souls = 0; __game.refreshTitle(); });
  let locked = false; for (let i = 0; i < 20 && !locked; i++) { await pg.click('#srows [data-k=cls] .sa.r'); await wait(40); locked = await ev(() => document.querySelector('#srows [data-k=cls]').classList.contains('locked')); }
  chk(locked && /SJÄLAR/.test(await ev(() => document.querySelector('#srows [data-k=cls] .sv').textContent)) && await ev(() => __game.settings.cls || 'vandrare') === c0, 'ANPASSA: låst klass visar kostnad och ändrar inte vald klass');
  await pg.click('#srows [data-k=cls] .sv'); await wait(100); chk(await ev(() => __game.settings.cls || 'vandrare') === c0 && /KOSTAR/.test(await ev(() => document.getElementById('setupdesc').textContent)), 'ANPASSA: tryck på låst klass utan själar köper inte');
  await ev(() => localStorage.removeItem('krypta.run')); await pg.click('#setupstart'); await wait(300);
  chk(await ev(() => __game.state() === 'title' && /LÅST/.test(document.getElementById('setupdesc').textContent)), 'ANPASSA: START med låst klass visad startar inte');
  // köp: med gott om själar ändrar ◀ ▶ aldrig själarna; tryck mitt på en låst klass köper den
  const keepP = await ev(() => ({ souls: __game.profile.souls, classes: (__game.profile.classes || []).slice(), cls: __game.settings.cls }));
  await ev(() => { __game.profile.souls = 9999; __game.refreshTitle(); });
  for (let i = 0; i < 20; i++) { await pg.click('#srows [data-k=cls] .sa.r'); await wait(30); }
  chk(await ev(() => __game.profile.souls) === 9999, 'ANPASSA: bläddring genom alla klasser köper inget');
  let lk = await ev(() => document.querySelector('#srows [data-k=cls]').classList.contains('locked'));
  for (let i = 0; i < 20 && !lk; i++) { await pg.click('#srows [data-k=cls] .sa.r'); await wait(30); lk = await ev(() => document.querySelector('#srows [data-k=cls]').classList.contains('locked')); }
  if (lk) { const nm = await ev(() => document.querySelector('#srows [data-k=cls] .sv').firstChild.textContent);
    await pg.click('#srows [data-k=cls] .sv'); await wait(150);
    const r = await ev(nm => { const g = __game, id = Object.keys(g.CLASSES || {}).find(k => g.CLASSES[k].name === nm); return { souls: g.profile.souls, has: (g.profile.classes || []).length, cls: g.settings.cls, locked: document.querySelector('#srows [data-k=cls]').classList.contains('locked'), sv: document.querySelector('#srows [data-k=cls] .sv').textContent }; }, nm);
    chk(r.souls < 9999 && r.has > keepP.classes.length && !r.locked && r.sv === nm && r.cls !== keepP.cls, `ANPASSA: tryck mitt på låst ${nm} köper och väljer den (${9999 - r.souls} själar, vald ${r.cls})`);
  } else chk(false, 'ANPASSA: hittade ingen låst klass att köpa');
  await ev(k => { __game.profile.souls = k.souls; __game.profile.classes = k.classes; __game.settings.cls = k.cls; __game.saveProfile && __game.saveProfile(); __game.refreshTitle(); }, keepP);
}
await pg.click('#setup [data-back]'); await wait(150);
// lägena startar rätt sak
await pg.click('#moremodesbtn'); await pg.click('#daily'); await wait(1500);
chk(await ev(() => __game.run() && __game.run().daily && document.getElementById('title').hidden), 'DAGENS RUNDA startar dagens runda');
await title(); await ev(() => localStorage.removeItem('krypta.run'));
await pg.click('#moremodesbtn'); await pg.click('#campaignbtn'); await wait(500);
chk(await ev(() => CardUI.isOpen()), 'KAMPANJEN öppnar kampanjlistan'); await ev(() => CardUI.close()); await wait(100);
await title();
await pg.click('#moremodesbtn'); await pg.click('#hubbtn'); await wait(2500);
chk(await ev(() => __game.state() === 'play' && !!__game.run().hub), 'LÄGRET öppnas');
await title();
await pg.click('#collbtn'); await pg.click('#statsbtn'); await wait(300);
chk(await ev(() => CardUI.isOpen()), 'STATISTIK öppnas'); await pg.keyboard.press('Escape'); await wait(200);
await pg.click('#collections [data-back]'); await wait(100); await pg.click('#start'); await wait(1500);
chk(await ev(() => __game.state() !== 'title' && document.getElementById('title').hidden), 'SPELA startar en runda');
await pg.keyboard.press('Escape'); await wait(500);
// ---- pausen ----
await ev(() => __game.pauseMenu()); await wait(300);
const popts = await ev(() => [...document.querySelectorAll('.cu-opt')].map(o => o.textContent.replace(/^\[\d\]\s*/, '').trim()));
chk(JSON.stringify(popts) === JSON.stringify(['FORTSÄTT', 'INSTÄLLNINGAR', 'KARTA', 'KORTLEKEN', 'MER', 'GE UPP']), 'pausmenyn: ' + popts.join(', '));
chk(await ev(() => /VÅNING \d+ · \d+ GULD/.test(document.querySelector('.cu-sub').textContent)), 'en rad: biom · våning · guld (' + await ev(() => document.querySelector('.cu-sub').textContent) + ')');
await shot('paus');
await pg.click('.cu-opt >> nth=4'); await wait(300);
const mopts = await ev(() => [...document.querySelectorAll('.cu-opt')].map(o => o.textContent.replace(/^\[\d\]\s*/, '').trim()));
chk(mopts.some(o => o.startsWith('KRÖNIKAN')) && mopts.some(o => o.startsWith('TALANGER')) && mopts.includes('HELSKÄRM') && mopts.includes('TILLBAKA'), 'MER: ' + mopts.join(', '));
await pg.click('.cu-opt >> nth=2'); await wait(300);
chk(await ev(() => CardUI.isOpen() && document.body.innerText.includes('FRÖ')), 'MER → RUNDAN visar rundans detaljer');
await pg.keyboard.press('Escape'); await wait(300);
chk(await ev(() => CardUI.isOpen() && document.querySelectorAll('.cu-opt').length === 6), 'tillbaka i pausmenyn');
await pg.click('.cu-opt >> nth=0'); await wait(300);
chk(await ev(() => __game.state()) === 'play', 'FORTSÄTT återupptar');
// ---- nivåslutet ----
await ev(() => __game.floorDone()); await wait(2200);
chk(await ev(() => !document.getElementById('floorend').hidden), 'nivåslutet visas');
const fe = await ev(() => document.getElementById('floorend').innerText);
chk(['TID', 'DÖDADE', 'HEMLIGHETER', 'GULD', 'BETYG', 'VIDARE'].every(w => fe.includes(w)), 'nivåslutet: sammanräkning, betyg och VIDARE');
chk(await ev(() => /^[SABCD]$/.test(document.getElementById('fe-grade').textContent)), 'betyget visas (' + await ev(() => document.getElementById('fe-grade').textContent) + ')');
await shot('vaningsslut');
await pg.click('#nextbtn'); await wait(500);
chk(await ev(() => __game.state() !== 'stats' && document.getElementById('floorend').hidden), 'VIDARE går vidare (' + await ev(() => __game.state()) + ')');
if (await ev(() => CardUI.isOpen())) { await pg.keyboard.press('Escape'); await wait(300); if (await ev(() => CardUI.isOpen())) { await pg.click('.cu-opt >> nth=1').catch(() => {}); await wait(300); } if (await ev(() => CardUI.isOpen())) { await pg.keyboard.press('Escape'); await wait(1500); } }
// ---- dödsskärmen ----
await ev(() => { __game.run().cause = 'LAVA'; __game.hurtPlayer(9999); }); await wait(2300);
chk(await ev(() => !document.getElementById('runover').hidden), 'dödsskärmen visas');
const ro = await ev(() => document.getElementById('runover').innerText);
chk(/DU DOG/.test(ro) && /DÖDAD AV\s*LAVA/.test(ro) && /VÅNING/.test(ro) && /FIENDER/.test(ro) && /TID/.test(ro), 'DU DOG, DÖDAD AV LAVA och tre siffror');
chk(!/TRYCK FÖR MENYN|KLICKA FÖR MENYN/.test(ro), 'ingen "tryck för menyn"-text');
await wait(1500); await shot('dod');
chk(/\+\d+ SJÄLAR/.test(await ev(() => document.getElementById('ro-souls').textContent)), 'själarna räknas upp');
await pg.click('#retrybtn'); await wait(1500);
chk(await ev(() => __game.state() !== 'dead' && document.getElementById('runover').hidden && __game.run().depth === 1 && document.getElementById('title').hidden), 'FÖRSÖK IGEN startar en ny runda');
await pg.keyboard.press('Escape'); await wait(500);
await ev(() => { __game.hurtPlayer(9999); }); await wait(2300);
await pg.click('#romenubtn'); await wait(300);
chk(await ev(() => __game.state() === 'title' && !document.getElementById('title').hidden && document.getElementById('runover').hidden), 'MENY går till startskärmen');
// handkontrollens väg: Enter = FÖRSÖK IGEN
await ev(() => { localStorage.removeItem('krypta.run'); __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(500);
await ev(() => { __game.hurtPlayer(9999); }); await wait(2300); await pg.keyboard.press('Enter'); await wait(1200);
chk(await ev(() => __game.state() !== 'dead' && __game.state() !== 'title'), 'Enter på dödsskärmen = FÖRSÖK IGEN');
// inställningarna i flikar
await title(); await pg.click('#settingsbtn'); await wait(300);
const tabs = await ev(() => [...document.querySelectorAll('.cu-tab')].map(b => b.textContent));
chk(['BILD', 'LJUD', 'KONTROLL', 'TILLGÄNGLIGHET'].every(t => tabs.includes(t)), 'inställningarna har flikar: ' + tabs.join(', '));
const vis = () => ev(() => [...document.querySelectorAll('.cu-row span')].filter(s => s.offsetParent !== null).map(s => s.textContent));
chk((await vis()).length < 25 && !(await vis()).some(l => l.startsWith('MUSIKVOLYM')), 'bara en flik syns åt gången (' + (await vis()).length + ' rader)');
await pg.click('.cu-tab:has-text("LJUD")'); await wait(150);
chk((await vis()).some(l => l.startsWith('MUSIKVOLYM')), 'fliken LJUD visar ljudet');
await shot('installningar'); await pg.keyboard.press('Escape'); await wait(200);
// seger
await ev(() => { localStorage.removeItem('krypta.run'); __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(500);
await ev(() => __game.endRun(true)); await wait(1500);
chk(await ev(() => !document.getElementById('runover').hidden && /SEGER/.test(document.getElementById('runover').innerText)), 'segerskärmen visar SEGER');
await shot('seger'); await pg.click('#romenubtn'); await wait(300);
chk(await ev(() => __game.state()) === 'title', 'MENY från segerskärmen');
chk(errs.length === 0, 'inga sidfel (dator) ' + errs.join(' / '));

// ---- telefon liggande (Pixel 7) ----
const px = devices['Pixel 7'];
const b2 = await chromium.launch({ executablePath: CHROMIUM, args: ['--use-gl=swiftshader', '--no-sandbox'] });
const ctx = await b2.newContext({ ...px, viewport: { width: px.viewport.height, height: px.viewport.width }, deviceScaleFactor: 1 });
const p2 = await ctx.newPage(); const errs2 = []; p2.on('pageerror', e => errs2.push(e.message));
const e2 = (f, a) => p2.evaluate(f, a), w2 = ms => p2.waitForTimeout(ms);
await p2.goto(`http://localhost:${PORT}/index.html?nolock=1`); await p2.waitForFunction('!document.getElementById("start").disabled', { timeout: 60000 });
const inside = () => e2(() => { const out = []; for (const b of document.querySelectorAll('#title button, #title input, .cu-opt, .endscr button')) { if (b.offsetParent === null) continue; const r = b.getBoundingClientRect(); if (r.left < 0 || r.top < 0 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5) out.push((b.id || b.textContent.trim()).slice(0, 20) + '@' + Math.round(r.top) + '-' + Math.round(r.bottom)); } return out; });
// värsta fallet: en sparad runda (FORTSÄTT syns)
await e2(() => { __game.profile.tutDone = true; __game.profile.runs = Math.max(1, __game.profile.runs); __game.begin('new'); }); await w2(1500); await e2(() => { CardUI.close(); __game.showTitle(); }); await w2(300);
chk(await e2(() => !document.getElementById('continue').hidden), 'telefon: FORTSÄTT syns med sparad runda');
let bad = await inside(); chk(bad.length === 0, 'telefon: startskärmens knappar inom skärmen ' + bad.join(' '));
chk(await e2(() => { const t = document.getElementById('title'); return t.scrollHeight <= t.clientHeight + 1; }), 'telefon: startskärmen utan rullning');
chk((await e2(() => [...document.querySelectorAll('#title button')].filter(b => b.offsetParent !== null).length)) <= 6, 'telefon: högst 6 val på toppnivå');
await p2.screenshot({ path: 'out/t99/liggande_title.png' });
for (const [btn, box] of [['#moremodesbtn', 'moremodes'], ['#collbtn', 'collections']]) {
  await p2.tap(btn); await w2(200); bad = await inside(); chk(bad.length === 0 && await e2(() => { const t = document.getElementById('title'); return t.scrollHeight <= t.clientHeight + 1; }), `telefon: ${box} inom skärmen utan rullning ` + bad.join(' '));
  await p2.screenshot({ path: `out/t99/liggande_${box}.png` }); await p2.tap(`#${box} [data-back]`); await w2(200);
}
{ // ANPASSA i värsta fallet (MARDRÖM med uppstigning, följeslagare, utmaning med lång text, kombinationspanelen öppen): ingen rullning, allt inom skärmen
  const keep = await e2(() => { const g = __game, s = g.settings; const k = { diff: s.diff, cmode: s.cmode, pet: s.pet, asc: s.asc, pets: g.profile.pets, ascMax: g.profile.ascMax };
    g.profile.ascMax = 3; g.profile.pets = ['raven', 'lantern', 'pup']; s.diff = 3; s.cmode = 'clock'; s.pet = 'lantern'; g.refreshTitle(); return k; });
  await p2.tap('#setupbtn'); await w2(200); await p2.screenshot({ path: 'out/t99/liggande_setup.png' });
  const noScroll = () => e2(() => { const t = document.getElementById('title'); return t.scrollHeight <= t.clientHeight + 1; });
  chk(await e2(() => [...document.querySelectorAll('#srows .srow')].filter(r => r.offsetParent !== null).length) === 6, 'telefon: ANPASSA visar sex rader');
  bad = await inside(); chk(bad.length === 0 && await noScroll(), 'telefon: ANPASSA utan rullning, allt inom skärmen ' + bad.join(' '));
  await p2.tap('#srows [data-k=cmode] .sv'); await w2(200); await p2.screenshot({ path: 'out/t99/liggande_setup_kombinera.png' });
  bad = await inside(); chk(await e2(() => document.querySelector('#cmodes button').offsetParent !== null) && bad.length === 0 && await noScroll(), 'telefon: kombinationerna utan rullning ' + bad.join(' '));
  await p2.tap('#cmodes button:has-text("MÖRKER")'); await w2(150); chk(await e2(() => __game.settings.cmode) === 'clock+dark', 'telefon: tryck kombinerar två utmaningar (' + await e2(() => __game.settings.cmode) + ')');
  { const d0 = await e2(() => __game.settings.diff); await p2.tap('#srows [data-k=diff] .sa.l'); await w2(150); chk(await e2(() => __game.settings.diff) !== d0, 'telefon: tryck på ◀ byter svårighet'); }
  await e2(k => { const g = __game, s = g.settings; s.diff = k.diff; s.cmode = k.cmode; s.pet = k.pet; s.asc = k.asc; g.profile.pets = k.pets; g.profile.ascMax = k.ascMax; g.refreshTitle(); }, keep);
  await p2.tap('#setup [data-back]'); await w2(200);
  chk(await e2(() => !document.getElementById('mainmenu').hidden), 'telefon: TILLBAKA i ANPASSA');
  await e2(() => localStorage.removeItem('krypta.run')); await p2.tap('#setupbtn'); await w2(200); await p2.tap('#setupstart'); await w2(1500);
  chk(await e2(() => __game.state() !== 'title' && document.getElementById('title').hidden), 'telefon: START i ANPASSA startar en runda (' + await e2(() => __game.state()) + ')');
  await e2(() => { CardUI.close(); __game.showTitle(); }); await w2(300);
}
{ // handboken i liggande telefon: STÄNG och bläddringen syns
  await p2.tap('#collbtn'); await w2(200); await p2.tap('#manualbtn'); await w2(300); await p2.screenshot({ path: 'out/t99/liggande_handbok.png' });
  const o = await e2(() => [...document.querySelectorAll('#cardui .cu-pager button, #cardui .cu-foot button')].filter(b => { const r = b.getBoundingClientRect(); return b.offsetParent === null || r.top < 0 || r.bottom > innerHeight + .5; }).length);
  chk(o === 0 && await e2(() => document.querySelectorAll('#cardui .cu-pager button').length === 2), 'telefon: handbokens < > och STÄNG inom skärmen');
  await p2.tap('#cardui .cu-foot button'); await w2(200); await e2(() => { if (CardUI.isOpen()) CardUI.close(); __game.showTitle(); }); await w2(200);
}
{ // inställningarnas flikar i liggande telefon: inget utanför skärmen
  await p2.tap('#settingsbtn'); await w2(300);
  const tabsN = await e2(() => document.querySelectorAll('.cu-tab').length); let worst = [];
  for (let i = 0; i < tabsN; i++) { await p2.tap(`.cu-tab >> nth=${i}`); await w2(150);
    const o = await e2(() => [...document.querySelectorAll('#cardui button, #cardui input, #cardui select')].filter(b => b.offsetParent !== null).filter(b => { const r = b.getBoundingClientRect(), sc = b.closest('.cu-pbody'); if (sc) { const s = sc.getBoundingClientRect(); if (r.bottom > s.bottom + 1 || r.top < s.top - 1) return false; } return r.left < 0 || r.top < 0 || r.right > innerWidth + .5 || r.bottom > innerHeight + .5; }).map(b => (b.textContent || b.id).trim().slice(0, 16)));
    worst = worst.concat(o); if (i === 0) await p2.screenshot({ path: 'out/t99/liggande_installningar.png' }); }
  chk(worst.length === 0, `telefon: inställningarnas ${tabsN} flikar inom skärmen ` + worst.join(' '));
  await p2.keyboard.press('Escape'); await w2(200); await e2(() => { if (CardUI.isOpen()) CardUI.close(); __game.showTitle(); }); await w2(200);
}
await e2(() => { localStorage.removeItem('krypta.run'); __game.begin('new'); }); await w2(1500); await e2(() => CardUI.close()); await e2(() => { __game.resume && __game.resume(); }); await w2(300);
await e2(() => { if (__game.state() !== 'play') __game.resume(); __game.pauseMenu(); }); await w2(400);
bad = await inside(); chk(bad.length === 0, 'telefon: pausmenyn inom skärmen ' + bad.join(' ')); await p2.screenshot({ path: 'out/t99/liggande_paus.png' });
const fsVis = () => e2(() => { const b = document.querySelector('#touch .fsbtn'); return !!b && !document.getElementById('touch').hidden && getComputedStyle(b).display !== 'none'; });
const fsHidden = async where => { const r = await e2(() => { const b = document.querySelector('#touch .fsbtn'); return { touch: !document.getElementById('touch').hidden, cls: document.body.classList.contains('endscr-on'), disp: b ? getComputedStyle(b).display : 'saknas' }; });
  chk(r.cls && r.disp === 'none', `telefon: ingen helskärmsknapp på ${where} (#touch synlig: ${r.touch}, endscr-on: ${r.cls}, display: ${r.disp})`); };
chk(await e2(() => !document.body.classList.contains('endscr-on')), 'telefon: helskärmsknappen döljs inte i pausen (bara på slutskärmarna)');
await p2.tap('.cu-opt >> nth=0'); await w2(300);
await e2(() => __game.floorDone()); await w2(2200); await p2.screenshot({ path: 'out/t99/liggande_vaningsslut.png' });
bad = await inside(); chk(bad.length === 0, 'telefon: nivåslutet inom skärmen ' + bad.join(' '));
await fsHidden('nivåslutet');
await p2.tap('#nextbtn'); await w2(500); chk(await e2(() => __game.state() !== 'stats'), 'telefon: tryck på VIDARE går vidare');
await e2(() => { CardUI.close(); __game.loadFloor(2); }); await w2(800);
await e2(() => { __game.run().cause = 'SPINDEL'; __game.hurtPlayer(9999); }); await w2(3200); await p2.screenshot({ path: 'out/t99/liggande_dod.png' });
bad = await inside(); chk(bad.length === 0, 'telefon: dödsskärmen inom skärmen ' + bad.join(' '));
await fsHidden('dödsskärmen');
await p2.tap('#retrybtn'); await w2(1500);
chk(await e2(() => __game.state() !== 'dead' && document.getElementById('runover').hidden), 'telefon: tryck på FÖRSÖK IGEN startar en ny runda (' + await e2(() => __game.state()) + ')');
chk(errs2.length === 0, 'inga sidfel (telefon) ' + errs2.join(' / '));
await b2.close();
console.log(fails ? `${fails} FEL` : 'ALLT OK');
await done();
