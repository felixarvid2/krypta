// t106: MENY – rörelse i gränssnittet (grafik och fler animationer).
// Startskärmen: kameraflykt genom en genererad bana bakom menyn (state förblir 'title', kameran rör sig, lowfx/reduceMotion stänger av den).
// HUD-juice: hälsan blinkar vid skada, "+N" för hälsa/skydd/ammo, ammon pulserar vid omladdning, hörnens rutor (hudRects) står still vid tung träff.
// Övergångar: toning när våningen startar. Nivåslutet: betyget stämplas med gnistor. Dödsskärmen: DU DOG slår in och siffrorna räknas upp.
// Kortvalet: korten delas ut (cu-deal). Inga sidfel. Bilder i out/t106.
import { setup } from './head.mjs';
const PORT = 9766;
const { pg, errs, shot, ev, wait, ok, done } = await setup(PORT, 'out/t106');
let fails = 0; const chk = (c, m) => { if (!c) fails++; ok(c, m); };
const M = () => ev(() => window.__game && __game.meny ? { t: __game.meny.title(), h: __game.meny.hud(), e: __game.meny.ends() } : null);
const fps = ms => ev(ms => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else r(Math.round(n * 1000 / (performance.now() - t0))); }; requestAnimationFrame(f); }), ms);

await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 60000 });
await ev(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; __game.settings.lowfx = false; __game.settings.reduceMotion = false; __game.refreshTitle(); });
await pg.waitForFunction('window.__game && __game.meny && __game.meny.title().frames > 30', { timeout: 15000 }).catch(() => {});
// ---- startskärmen ----
let m = await M();
chk(!!m, '__game.meny finns');
chk(await ev(() => __game.state()) === 'title', 'state är title');
chk(m && m.t.on && !m.t.off, `kameraflykten är på (${m && m.t.biome}, ${m && m.t.why})`);
const p0 = m.t; await wait(1200); m = await M();
chk(Math.hypot(m.t.x - p0.x, m.t.y - p0.y) > 0.4 && m.t.frames > p0.frames, `kameran rör sig (${p0.x.toFixed(2)},${p0.y.toFixed(2)} → ${m.t.x.toFixed(2)},${m.t.y.toFixed(2)})`);
chk(await ev(() => document.getElementById('title').classList.contains('livebg')), '#title.livebg släpper igenom banan');
chk(await ev(() => __game.state()) === 'title', 'state är fortfarande title');
const fLive = await fps(1500), cost = m.t.cost;
chk(cost < 7, `ritningen kostar ${cost.toFixed(2)} ms per bildruta (< 7)`);
await shot('title');
// lowfx stänger av den
await ev(() => { __game.settings.lowfx = true; }); await wait(300); const fA = (await M()).t.frames; await wait(500); m = await M();
chk(!m.t.on && m.t.frames === fA, 'lowfx: kameraflykten står still och är av');
chk(await ev(() => !document.getElementById('title').classList.contains('livebg')), 'lowfx: den gamla bakgrunden');
const fLow = await fps(1500);
await shot('title_lowfx');
await ev(() => { __game.settings.lowfx = false; __game.settings.reduceMotion = true; }); await wait(300); m = await M();
chk(!m.t.on, 'minskad rörelse: kameraflykten är av');
chk(await ev(() => document.body.classList.contains('meny-rm')), 'minskad rörelse: body.meny-rm stänger av CSS-animationerna');
await ev(() => { __game.settings.reduceMotion = false; }); await wait(300);
chk((await M()).t.on, 'på igen utan lowfx/minskad rörelse');
// menyvalen glider in
await ev(() => __game.showTitle()); await wait(30);
chk(await ev(() => getComputedStyle(document.querySelector('#mainmenu > *')).animationName) === 'mi-in', 'menyvalen glider in (mi-in)');
console.log(`     bilder/s på startskärmen: levande ${fLive}, lowfx ${fLow}; ritning ${cost.toFixed(2)} ms/bildruta, banan genererad på ${Math.round(p0.genMs)} ms`);
// ---- en runda: toning och kortvalet ----
await ev(() => { localStorage.removeItem('krypta.run'); __game.begin('new'); }); await wait(250);
m = await M(); chk(m.e.fades >= 1, `toning när våningen startar (${m.e.fades})`);
chk(await ev(() => document.getElementById('menyfade').classList.contains('go')), '#menyfade tonar');
chk(await ev(() => { const s = document.querySelector('#cardui .cu-cards > .cu-slot'); return s ? getComputedStyle(s).animationName.includes('cu-deal') : 'inget kortval'; }) === true, 'korten delas ut (cu-deal)');
await wait(1300); await shot('cards');
// valt kort lyfter och blinkar
let picked = false; for (let i = 0; i < 4 && !picked; i++) { await pg.click('#cardui .cu-card', { timeout: 3000 }).catch(() => {}); picked = await pg.waitForFunction('!!document.querySelector("#cardui .cu-card.picked")', { timeout: 500 }).then(() => true).catch(() => false); }
chk(picked && await ev(() => { const c = document.querySelector('#cardui .cu-card.picked'); return !!c && getComputedStyle(c, '::after').animationName === 'cu-pick-flash'; }), 'valt kort lyfter och blinkar (cu-pick-flash)');
await wait(90); await shot('card_picked');
await wait(900); if (await ev(() => window.CardUI && CardUI.isOpen())) { await pg.keyboard.press('Escape'); await wait(500); } await ev(() => { if (window.CardUI && CardUI.isOpen()) CardUI.close(); __game.resume && __game.resume(); }); await wait(400);
chk(await ev(() => __game.state()) === 'play', 'spelar');
chk(await ev(() => !document.getElementById('title').classList.contains('livebg')) || await ev(() => document.getElementById('title').hidden), 'startskärmen dold under spelet');
// ---- HUD ----
const r0 = await ev(() => JSON.stringify(__game.hudRects()));
await ev(() => { const P = __game.P; P.iframe = 0; P.armor = 0; P.hp = 100; __game.hurtPlayer(40, P.x + 1, P.y); });
await pg.waitForFunction('__game.meny.hud().hit > 0', { timeout: 2000 }).catch(() => {}); m = await M(); chk(m.h.hit > 0 && !!m.h.hpCol, `hälsan blinkar vid skada (${m.h.hpCol})`);
chk(m.h.big > 0, 'tung träff: hörnen skakar');
chk(await ev(() => JSON.stringify(__game.hudRects())) === r0, 'hudRects står still när hörnen skakar');
await shot('hud_hit');
await wait(700);
await ev(() => { const P = __game.P; P.hp = Math.min(P.hp + 20, 100); P.armor += 25; const wp = __game.WEAPONS[P.weapon]; if (wp.ammo && P.ammo[wp.ammo] !== undefined) P.ammo[wp.ammo] += 12; });
await pg.waitForFunction('__game.meny.hud().pops.length >= 3', { timeout: 2000 }).catch(() => {}); m = await M(); chk(m.h.pops.some(p => /^hp\d+/.test(p)) && m.h.pops.includes('ar25'), `"+N" för hälsa och skydd (${m.h.pops.join(' ')})`);
chk(m.h.pops.includes('am12'), '"+N" för ammo');
await shot('hud_pops');
await ev(() => { const P = __game.P; P.mags[P.weapon] = 0; __game.startReload(); });
await pg.waitForFunction('__game.WS.state !== "reload" || !!__game.meny.hud().magCol', { timeout: 2000 }).catch(() => {}); m = await M(); const relOn = await ev(() => __game.WS.state === 'reload');
chk(!relOn || !!m.h.magCol, `ammon pulserar vid omladdning (${relOn ? m.h.magCol : 'ingen omladdning'})`);
let rel = false; for (let i = 0; i < 40 && !rel; i++) { await wait(60); rel = (await M()).h.rel > 0; }
chk(rel || !relOn, 'ammon studsar när omladdningen är klar');
// ---- nivåslutet ----
await ev(() => __game.floorDone()); let st = false, sp = 0;
for (let i = 0; i < 60 && !st; i++) { await wait(60); m = await M(); st = m.e.stamps > 0; }
await wait(320); sp = (await M()).e.sparks; await shot('floorend_stamp');
chk(st, 'betyget stämplas'); chk(sp > 0, `gnistor när betyget slår ned (${sp})`);
chk(await ev(() => getComputedStyle(document.getElementById('fe-grade')).animationName) === 'fe-stamp', 'betyget har stämpelanimationen');
await wait(800); chk((await M()).e.sparks === 0, 'gnistorna städas bort');
// ---- dödsskärmen ----
await ev(() => { __game.showTitle(); localStorage.removeItem('krypta.run'); __game.begin('new'); }); await wait(500); await pg.keyboard.press('Escape'); await wait(400); await ev(() => { if (window.CardUI && CardUI.isOpen()) CardUI.close(); __game.resume && __game.resume(); }); await wait(300);
await ev(() => { const P = __game.P; __game.run().kills = 40; P.iframe = 0; P.armor = 0; P.hp = 1; __game.hurtPlayer(500, P.x + 1, P.y); });
await pg.waitForFunction('!document.getElementById("runover").hidden', { timeout: 6000 }).catch(() => {});
chk(await ev(() => __game.state()) === 'dead' && await ev(() => !document.getElementById('runover').hidden), 'dödsskärmen visas');
chk(await ev(() => getComputedStyle(document.getElementById('ro-head')).animationName.includes('ro-slam')), 'DU DOG slår in (ro-slam)');
await wait(150); const early = await ev(() => document.getElementById('ro-kills').textContent);
await shot('dead_slam'); await wait(1400);
const fin = await ev(() => ({ d: document.getElementById('ro-depth').textContent, k: document.getElementById('ro-kills').textContent, run: __game.run().depth, kills: __game.run().kills }));
chk(+early < fin.kills, `FIENDER börjar lågt (${early} av ${fin.kills})`);
chk(fin.d === String(fin.run) && fin.k === String(fin.kills), `siffrorna räknas upp till rätt värden (${fin.d}/${fin.run}, ${fin.k}/${fin.kills}; tidigt ${early})`);
await shot('dead_done');
if (fails) console.log(`FAIL ${fails} kontroller misslyckades`);
await done();
