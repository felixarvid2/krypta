import { setup } from './head.mjs';
const { pg, shot, ev, wait, ok, start, done } = await setup(8862, 'out/t42');
// kombinerade utmaningslägen: onehit + mörker
await pg.goto('http://localhost:8862/index.html?nolock=1'); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 60000 });
await ev(() => { const g = __game; g.profile.runs = Math.max(1, g.profile.runs); g.profile.tutDone = true; g.settings.cmode = ''; g.refreshTitle(); });
await pg.click('#setupbtn'); await wait(200); // utmaningarna ligger under ANPASSA RUNDAN
ok(await ev(() => /NORMAL|LÄTT|SVÅR|BERÄTTELSE|MARDRÖM/.test(document.getElementById('setupsum').textContent)), 'sammanfattningen visar svårigheten (' + await ev(() => document.getElementById('setupsum').textContent) + ')');
await pg.click('#cmodes button:has-text("ETT SLAG")'); await pg.click('#cmodes button:has-text("MÖRKER")'); await wait(200);
ok(await ev(() => __game.settings.cmode) === 'onehit+dark', 'två utmaningar kombineras (' + await ev(() => __game.settings.cmode) + ')');
ok(await ev(() => /ETT SLAG/.test(document.getElementById('setupsum').textContent)), 'sammanfattningen visar utmaningarna');
await shot('title');
await ev(() => { localStorage.removeItem('krypta.run'); __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(600);
ok(await ev(() => __game.cmode('onehit') && __game.cmode('dark') && __game.P.hp === 1 && __game.P.battery > 150), 'båda lägena gäller i rundan');
await shot('dark');
await ev(() => { __game.settings.cmode = ''; });
// sparplatser
await ev(() => { __game.settings.slot = 2; __game.showTitle(); __game.refreshTitle(); }); await wait(300);
ok(await ev(() => document.querySelectorAll('#slots button').length === 3 && document.querySelector('#slots button[aria-pressed=true]').textContent.startsWith('PLATS 3')), 'tre sparplatser, plats 3 vald');
await ev(() => { __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(300);
ok(await ev(() => !!localStorage.getItem('krypta.run.2')), 'rundan sparas på plats 3');
await ev(() => { __game.settings.slot = 0; });
// pausmenyn
await ev(() => { __game.pauseMenu(); }); await wait(300); await shot('pausemenu');
ok(await ev(() => document.querySelectorAll('.cu-opt').length === 7), 'pausmenyn har sju val');
await pg.click('.cu-opt >> nth=0'); await wait(300);
ok(await ev(() => __game.state()) === 'play', 'FORTSÄTT återupptar');
// död: kamera och dödskarta
await ev(() => { __game.run().cause = 'LAVA'; __game.hurtPlayer(9999); }); await wait(2500);
ok(await ev(() => __game.state()) === 'dead' && await ev(() => Math.abs(__game.P.roll) > 0.1), 'kameran faller vid döden');
await pg.keyboard.press('KeyM'); await wait(300); ok(await ev(() => __game.deathMap()), 'dödskartan visas'); await shot('deathmap');
await pg.keyboard.press('KeyM');
// klass med siffertangent
await ev(() => { __game.showTitle(); }); await wait(300); await pg.keyboard.press('Digit1'); await wait(100);
ok(await ev(() => __game.settings.cls) === 'vandrare', 'siffran 1 väljer vandraren');
// berättelseläget
ok(await ev(() => document.querySelector('#diff button').textContent) === 'BERÄTTELSE', 'berättelseläget visas först');
// övning mot fiende
await ev(() => { __game.profile.bestiary = Object.assign({ 'Ã': 1 }, __game.profile.bestiary); __game.beginEnemyPractice('Ã'); }); await wait(4000);
ok(await ev(() => __game.ents().filter(e => !e.dead && e.type === 'Ã').length >= 1), 'övningen skapar mumier (' + await ev(() => __game.ents().filter(e => !e.dead).map(e => e.type).join('')) + ')');
await ev(() => { __game.P.hp = 1; __game.hurtPlayer(5); }); await wait(100); await ev(() => __game.P.hp);
await wait(200); ok(await ev(() => __game.P.hp > 1 && __game.state() === 'play'), 'övningen har oändlig hälsa');
await shot('practice');
// bossjakten
await ev(() => { __game.showTitle(); __game.beginBossHunt(); }); await wait(600); await shot('hunt');
const opts = await ev(() => [...document.querySelectorAll('.cu-opt')].map(e => e.textContent.slice(0, 20)));
ok(opts.length >= 8, 'bossjakten låter dig välja bland ' + opts.length + ' bossar');
await pg.click('.cu-opt >> nth=7'); await wait(2500);
ok(await ev(n => !!__game.boss() && __game.run().hunt.left.length === n - 1, opts.length), 'vald boss möts (' + await ev(() => __game.boss() && __game.boss().d.name) + ')');
await shot('huntboss');
// labyrinten (om generatorn har den)
if (await ev(() => !!Gen.maze)) { await ev(() => { __game.showTitle(); __game.beginMaze(); }); await wait(1500); ok(await ev(() => !!__game.run().maze && __game.state() === 'play'), 'labyrinten startar'); await shot('maze'); }
else console.log('SKIP labyrinten: Gen.maze saknas i denna generator');
// titlar och prestationer
await ev(() => { __game.showTitle(); __game.profile.runs = Math.max(1, __game.profile.runs); __game.showTitles(); }); await wait(300);
ok(await ev(() => document.querySelectorAll('.cu-li').length >= 10), 'titelmenyn listar titlar'); await shot('titles');
await pg.keyboard.press('Escape'); await wait(200);
// inställningar: minska rörelse och hud
await ev(() => { const s = __game.settings; s.reduceMotion = true; }); await ev(() => { document.getElementById('settingsbtn').click(); }); await wait(300);
const labels = await ev(() => [...document.querySelectorAll('.cu-row span')].map(e => e.textContent));
ok(labels.some(l => l.startsWith('MINSKA RÖRELSE')) && labels.includes('HUD') && labels.some(l => l.startsWith('VISUELLA LJUDSIGNALER')), 'nya tillgänglighetsval finns');
await pg.keyboard.press('Escape'); await wait(200);
// statistik
await ev(() => __game.showStats()); await wait(300);
const st = await ev(() => document.body.innerText); ok(st.includes('REKORD PER LÄGE') && st.includes('OSEDDA DÖDANDEN'), 'statistiken visar lägen och smyg'); await shot('stats');
await pg.keyboard.press('Escape');
await done();
