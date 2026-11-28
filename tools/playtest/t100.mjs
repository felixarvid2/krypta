// t100: kompakta dialoger (CardUI). Affären, kortvalet (kistan med 6 kort) och lägerelden på dator 1280×720 och i liggande
// telefon (Pixel 7, 915×412): alla val syns utan rullning, beskrivningen visas bara för det markerade valet (ett fält, inte i rutorna),
// köp/val går att göra med klick/tryck (telefon: första trycket markerar, andra väljer) och med tangentbord, och inga sidfel.
import http from 'http'; import fs from 'fs'; import path from 'path';
import { createRequire } from 'module'; import { fileURLToPath } from 'url';
const req = createRequire(import.meta.url); let PW; for (const m of ['playwright-core', 'playwright', '/opt/node22/lib/node_modules/playwright']) { try { PW = req(m); break; } catch (e) { /* nästa */ } }
const { chromium, devices } = PW; const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.KRYPTA_ROOT || path.resolve(HERE, '../..'), OUT = path.join(HERE, 'out', 't100'); fs.mkdirSync(OUT, { recursive: true });
const PORT = 9500 + Math.floor(Math.random() * 90);
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (fs.existsSync(f) && fs.statSync(f).isFile()) { r.setHeader('content-type', { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.ogg': 'audio/ogg', '.ttf': 'font/ttf', '.css': 'text/css' }[path.extname(f)] || 'application/octet-stream'); return r.end(fs.readFileSync(f)); } r.statusCode = 404; r.end(); }).listen(PORT);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), args: ['--use-gl=swiftshader', '--no-sandbox'] });
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log(c ? 'OK  ' : 'FAIL', m); };
const px = devices['Pixel 7'];
const DEVS = [['dator', { viewport: { width: 1280, height: 720 } }], ['liggande', { ...px, viewport: { width: px.viewport.height, height: px.viewport.width } }]];
// alla element som matchar sel ligger inom fönstret, och dialogen rullar inte
const fits = sel => `(() => { const out = []; const els = [...document.querySelectorAll(${JSON.stringify(sel)})].filter(e => e.offsetParent !== null);
  for (const e of els) { const r = e.getBoundingClientRect(); if (r.left < -0.5 || r.top < -0.5 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5) out.push((e.textContent || e.className).trim().slice(0, 18) + '@' + Math.round(r.top) + '-' + Math.round(r.bottom)); }
  const s = document.querySelector('#cardui .cu-screen'); if (s && s.scrollHeight > s.clientHeight + 1) out.push('rullar ' + s.scrollHeight + '>' + s.clientHeight);
  return { n: els.length, out }; })()`;
// beskrivningsfältet rymmer innehållet (rullar inte, klipps inte)
const descFits = () => `(() => [...document.querySelectorAll('#cardui .cu-desc')].every(d => d.scrollHeight <= d.clientHeight + 1))()`;
for (const [name, cfg] of DEVS) {
  const touch = name !== 'dator';
  const ctx = await b.newContext({ ...cfg, deviceScaleFactor: 1 }); const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const ev = (f, a) => pg.evaluate(f, a), wait = ms => pg.waitForTimeout(ms), shot = n => pg.screenshot({ path: `${OUT}/${name}_${n}.png` });
  const center = async sel => { const r = await pg.locator(sel).first().boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
  const press = async sel => { const c = await center(sel); if (touch) await pg.touchscreen.tap(c.x, c.y); else await pg.mouse.click(c.x, c.y); };
  await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', null, { timeout: 90000 });
  await ev(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; document.getElementById('seed').value = 't100'; __game.begin('new'); });
  await wait(1500); await ev(() => { if (CardUI.isOpen()) CardUI.close(); if (__game.state() !== 'play') __game.resume && __game.resume(); }); await wait(400);

  // ---- kortvalet: kistan med 6 kort ----
  await ev(() => { __game.mods().chestChoice = 3; const P = __game.P; __game.openChest({ x: P.x, y: P.y }); });
  await pg.waitForFunction(() => document.querySelectorAll('.cu-card').length && !document.querySelector('.cu-card.down'), null, { timeout: 15000 }); await wait(400);
  const nCards = await ev(() => document.querySelectorAll('.cu-card').length);
  ok(nCards === 6, `${name}: kistan visar 6 kort (${nCards})`);
  let f = await ev(fits('.cu-card, .cu-draft .cu-btn, .cu-draft .cu-desc, .cu-draft .cu-title'));
  ok(f.out.length === 0, `${name}: kortvalet får plats utan rullning (${f.n} element) ${f.out.join(' ')}`);
  ok(await ev(() => [...document.querySelectorAll('.cu-card .cu-fx, .cu-slot > .cu-cmp, .cu-slot > .cu-extra')].every(e => e.offsetParent === null || getComputedStyle(e).display === 'none')), `${name}: korten visar ingen effekttext i rutan`);
  ok(await ev(() => document.querySelectorAll('.cu-draft .cu-desc').length === 1), `${name}: ett enda beskrivningsfält`);
  await shot('1_kista');
  const owned0 = await ev(() => __game.run().owned.length);
  const nm2 = await ev(() => document.querySelectorAll('.cu-card .cu-name')[1].textContent);
  if (touch) {
    await press('.cu-card >> nth=1'); await wait(300);
    const d = await ev(() => document.querySelector('.cu-draft .cu-desc').textContent);
    ok(d.includes(nm2) && /TRYCK IGEN/.test(d), `${name}: första trycket markerar kortet och visar beskrivningen (${d.slice(0, 50)})`);
    ok(await ev(() => document.querySelectorAll('.cu-card.sel').length === 1 && CardUI.isOpen()), `${name}: bara ett markerat kort, inget valt ännu`);
    ok(await ev(descFits()), `${name}: kortets beskrivning ryms i fältet`);
    await shot('2_kista_markerad');
    await press('.cu-card >> nth=1'); await wait(700);
  } else {
    await pg.mouse.move(5, 5); await pg.keyboard.press('ArrowRight'); await wait(150); await pg.keyboard.press('ArrowRight'); await wait(250);
    const d = await ev(() => document.querySelector('.cu-draft .cu-desc').textContent);
    const nmF = await ev(() => (document.activeElement.querySelector('.cu-name') || {}).textContent || '');
    ok(nmF && d.includes(nmF), `${name}: piltangenterna markerar och beskrivningen följer med (${nmF})`);
    await shot('2_kista_markerad');
    await pg.keyboard.press('Enter'); await wait(700);
  }
  ok(await ev(() => !CardUI.isOpen()), `${name}: kortet valdes och dialogen stängdes`);
  ok(await ev(() => __game.run().owned.length) === owned0 + 1, `${name}: kortet hamnade i leken`);
  await ev(() => { __game.mods().chestChoice = 0; }); await wait(300);
  // värsta fallet: kortet med flest effektrader, FÖRE → EFTER för alla dess tal och en synergi, markerat med tryck
  await ev(() => { const C = Cards, all = C.ALL.filter(c => c.mods && !c.pact);
    const big = all.slice().sort((a, b) => (String(b.text).split('\n').length * 10 + Object.keys(b.mods).length) - (String(a.text).split('\n').length * 10 + Object.keys(a.mods).length))[0];
    const mate = (big.syn || []).length ? C.ALL.find(o => o.id !== big.id && o.syn && o.syn.some(t => big.syn.includes(t))) : null;
    const mods = {}; for (const k of Object.keys(big.mods)) mods[k] = 0.15;
    window.__t100big = big.name;
    CardUI.draft([big, all[1], all[2], all[3], all[4], all[5]], { title: 'TEST', subtitle: 'VÄRSTA FALLET', owned: mate ? [mate.id] : [], mods, banish: () => null, reroll: { price: 15, gold: 99, onReroll: () => null } }, () => {}); });
  await pg.waitForFunction(() => document.querySelectorAll('.cu-card').length && !document.querySelector('.cu-card.down'), null, { timeout: 15000 }); await wait(300);
  if (touch) await press('.cu-card >> nth=0'); else { await pg.hover('.cu-card >> nth=0'); }
  await wait(250);
  ok(await ev(descFits()), `${name}: värsta kortet (${await ev(() => window.__t100big)}) ryms i beskrivningsfältet: ` + (await ev(() => document.querySelector('.cu-draft .cu-desc').textContent)).slice(0, 90));
  f = await ev(fits('.cu-card, .cu-draft .cu-btn, .cu-draft .cu-desc'));
  ok(f.out.length === 0, `${name}: värsta fallet får plats utan rullning ${f.out.join(' ')}`);
  await shot('2b_varsta_kortet');
  if (!touch) { // dator: ett musklick väljer direkt
    let got = null; await ev(() => { CardUI.close(); });
    await ev(() => { window.__t100pick = null; CardUI.draft(Cards.ALL.slice(10, 13), { title: 'KLICK' }, c => { window.__t100pick = c && c.id; }); });
    await pg.waitForFunction(() => !document.querySelector('.cu-card.down'), null, { timeout: 15000 }); await wait(300);
    await press('.cu-card >> nth=2'); await wait(600); got = await ev(() => window.__t100pick);
    ok(got === await ev(() => Cards.ALL[12].id), `${name}: ett musklick på ett kort väljer det (${got})`);
  }
  await ev(() => { if (CardUI.isOpen()) CardUI.close(); if (__game.state() !== 'play') __game.resume && __game.resume(); }); await wait(300);

  // ---- affären ----
  await ev(() => { __game.run().gold = 999; __game.P.hp = 50; const m = __game.merchants()[0] || { stock: null }; window.__t100m = m; __game.openShop(m); }); await wait(700);
  f = await ev(fits('.cu-item, .cu-shop .cu-btn, .cu-shop .cu-desc, .cu-shop .cu-title, .cu-shop .cu-gold'));
  ok(f.n >= 15 && f.out.length === 0, `${name}: affären – alla ${f.n} rutor syns utan rullning ${f.out.join(' ')}`);
  ok(await ev(() => [...document.querySelectorAll('.cu-item .cu-fx')].every(e => e.offsetParent === null)), `${name}: varornas beskrivning står inte i rutorna`);
  ok(await ev(() => { const it = document.querySelector('.cu-item'), bt = document.querySelector('#cardui .cu-btn'); return !!it && !!bt && !!(it.compareDocumentPosition(bt) & Node.DOCUMENT_POSITION_FOLLOWING); }), `${name}: varorna kommer före knapparna i DOM (bottarnas querySelector)`);
  await shot('3_affar');
  const ammoIx = await ev(() => [...document.querySelectorAll('.cu-item .cu-iname')].findIndex(e => e.textContent === 'AMMUNITION'));
  ok(ammoIx >= 0, `${name}: AMMUNITION finns i affären`);
  const g0 = await ev(() => __game.run().gold);
  if (touch) {
    await press(`.cu-item >> nth=${ammoIx}`); await wait(300);
    const d = await ev(() => document.querySelector('.cu-shop .cu-desc').textContent);
    ok(/AMMUNITION/.test(d) && /TRYCK IGEN/.test(d) && await ev(() => __game.run().gold) === g0, `${name}: första trycket visar beskrivningen och köper inget (${d.slice(0, 40)})`);
    ok(await ev(descFits()), `${name}: varans beskrivning ryms i fältet`);
    await shot('4_affar_markerad');
    await press(`.cu-item >> nth=${ammoIx}`); await wait(400);
    ok(await ev(() => __game.run().gold) < g0, `${name}: andra trycket köper (guld ${g0} → ${await ev(() => __game.run().gold)})`);
  } else {
    await pg.hover(`.cu-item >> nth=${ammoIx}`); await wait(200);
    ok(/AMMUNITION/.test(await ev(() => document.querySelector('.cu-shop .cu-desc').textContent)), `${name}: musen över en vara visar dess beskrivning`);
    await shot('4_affar_markerad');
    await press(`.cu-item >> nth=${ammoIx}`); await wait(400);
    ok(await ev(() => __game.run().gold) < g0, `${name}: ett klick köper (guld ${g0} → ${await ev(() => __game.run().gold)})`);
  }
  // tangentbord: pil till en vara och Enter köper (fungerar även på telefonen med tangentbord/handkontroll)
  const g1 = await ev(() => __game.run().gold);
  await pg.keyboard.press('ArrowLeft'); await wait(150); await pg.keyboard.press('ArrowDown'); await wait(150);
  const kName = await ev(() => (document.activeElement.querySelector('.cu-iname') || {}).textContent || '');
  ok(kName && (await ev(() => document.querySelector('.cu-shop .cu-desc').textContent)).includes(kName.replace(/^REA: /, '')), `${name}: piltangenterna flyttar markeringen (${kName})`);
  await ev(() => { const a = document.activeElement; const n = a && a.querySelector('.cu-iname'); if (n && /SÄLJ|STJÄL|NYA KORT|RENSA|RUNSTEN|PRUTA|TÄRNING/.test(n.textContent)) [...document.querySelectorAll('.cu-item')].find(x => /AMMUNITION/.test(x.textContent)).focus(); });
  await pg.keyboard.press('Enter'); await wait(400);
  ok(await ev(() => __game.run().gold) < g1, `${name}: Enter köper den markerade varan (guld ${g1} → ${await ev(() => __game.run().gold)})`);
  await pg.keyboard.press('Escape'); await wait(400);
  ok(await ev(() => !CardUI.isOpen() && __game.state() === 'play'), `${name}: Esc lämnar affären`);

  // ---- händelser med långa förklaringar: bankiren och spelaren ----
  for (const [hook, lab] of [['openBanker', 'bankiren'], ['openGambler', 'spelaren'], ['openWanderer', 'vandraren']]) {
    const opened = await ev(h => { try { __game[h]({ x: __game.P.x, y: __game.P.y }); return CardUI.isOpen(); } catch (e) { return 'fel: ' + e.message; } }, hook); await wait(400);
    if (opened !== true) { console.log('     ', lab, 'öppnades inte:', opened); await ev(() => { if (CardUI.isOpen()) CardUI.close(); }); continue; }
    const n = await ev(() => document.querySelectorAll('.cu-opt').length); let all = true;
    for (let i = 0; i < n; i++) { if (touch) await press(`.cu-opt >> nth=${i}`); else await pg.hover(`.cu-opt >> nth=${i}`); await wait(120); if (!await ev(descFits())) { all = false; console.log('     ', lab, i, await ev(() => [...document.querySelectorAll('#cardui .cu-desc')].map(d => d.scrollHeight + '/' + d.clientHeight + ' ' + d.textContent.slice(0, 60)).join(' | '))); } }
    ok(all && await ev(() => CardUI.isOpen()), `${name}: ${lab} – förklaringen ryms för alla ${n} val (och första trycket väljer inte)`);
    f = await ev(fits('.cu-opt, .cu-choice .cu-desc, .cu-choice .cu-title'));
    ok(f.out.length === 0, `${name}: ${lab} får plats ${f.out.join(' ')}`);
    await shot('6_' + lab);
    await pg.keyboard.press('Escape'); await wait(400);
    await ev(() => { if (CardUI.isOpen()) CardUI.close(); if (__game.state() !== 'play') __game.resume && __game.resume(); }); await wait(200);
  }

  // ---- många val (RENSA ETT KORT, själaaltaret): sidan får rulla, men beskrivningen syns alltid ----
  for (const kind of ['draft', 'shop']) {
    await ev(k => { const cs = Cards.ALL.slice(0, k === 'draft' ? 18 : 40);
      if (k === 'draft') CardUI.draft(cs, { title: 'RENSA ETT KORT' }, () => {}); else CardUI.shop(cs.map(c => ({ kind: 'card', card: c, price: 10 })), 999, () => ({ ok: false }), () => {}, { title: 'MÅNGA' }); }, kind);
    await pg.waitForFunction(() => !document.querySelector('.cu-card.down'), null, { timeout: 15000 }); await wait(300);
    const sel = kind === 'draft' ? '.cu-card' : '.cu-item';
    await press(`${sel} >> nth=1`); await wait(250);
    ok(await ev(() => { const d = document.querySelector('#cardui .cu-desc'), r = d.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 0.5 && /\S/.test(d.textContent) && !!document.querySelector('#cardui .sel'); }), `${name}: ${kind} med många val – beskrivningen syns i fönstret`);
    await shot('7_manga_' + kind);
    await ev(() => CardUI.close()); await wait(200);
  }
  await ev(() => { if (__game.state() !== 'play') __game.resume && __game.resume(); }); await wait(200);

  // ---- lägerelden (val med förklaringar) ----
  await ev(() => __game.openCampfire({})); await wait(500);
  f = await ev(fits('.cu-opt, .cu-choice .cu-desc, .cu-choice .cu-title'));
  ok(f.n >= 3 && f.out.length === 0, `${name}: lägerelden får plats (${f.n}) ${f.out.join(' ')}`);
  ok(await ev(() => !document.querySelector('.cu-opt .cu-ot') && document.querySelectorAll('.cu-choice .cu-desc').length === 1), `${name}: valen visar bara namnen, förklaringen i ett fält`);
  await shot('5_lagret');
  await pg.keyboard.press('Escape'); await wait(400);
  ok(await ev(() => !CardUI.isOpen()), `${name}: Esc stänger lägerelden`);
  ok(errs.length === 0, `${name}: inga sidfel ${errs.join(' / ')}`);
  await ctx.close();
}
await b.close(); srv.close();
console.log(fails ? `${fails} FEL` : 'ALLA OK'); process.exit(fails ? 1 : 0);
