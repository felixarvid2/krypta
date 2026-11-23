// t104: FIENDER – fiendernas och bossarnas animationer (grafik: träffreaktion, död/blodpöl, gibs efter material, spawn ur golvet,
// anfallstelegraf för skyttar, bossens fasbyte och dödsanimation i steg). Kontrollerar via window.__game.gfxE att effekterna körs,
// att tysta träffar (blödning/gift) inte ger knuffar, att minskade effekter (lowfx) stänger av partiklarna och att av/på-knappen fungerar.
import { setup } from './head.mjs';
const PORT = 9104;
const { pg, ev, wait, ok, start, done, shot } = await setup(PORT, 'out/t104');
await start('&seed=t104');
// ingen erfarenhet (annars kan ett nivåval öppnas och frysa spelet), inga gamla fiender
await ev(() => { __game.run().practice = {}; for (const e of __game.ents()) { e.dead = true; e.gibbed = true; } const P = __game.P; P.iframe = 99999; P.hp = 999; __game.settings.autoLowFx = false; __game.settings.lowfx = false; });
// spelet kan gå långsamt på en belastad dator (dt är högst 0,05 s per bildruta): vänta på villkor i speltid, inte fasta tider
const until = async (f, a, ms = 12000) => { try { await pg.waitForFunction(f, a, { timeout: ms }); return true; } catch (e) { return false; } };
await until(() => __game.levelTime() > 2.2);
const G = () => ev(() => Object.assign({}, __game.gfxE.st));
const put = (type, d = 2.4) => ev(([type, d]) => { const P = __game.P; const e = __game.spawnEnemy(type, P.x + Math.cos(P.a) * d, P.y + Math.sin(P.a) * d); e.alert = false; e.sleep = true; return __game.ents().indexOf(e); }, [type, d]);
const hit = (i, dmg, opt = {}) => ev(([i, dmg, opt]) => { const e = __game.ents()[i]; __game.hurtEnemy(e, dmg === 'kill' ? e.hp + 1.5 : dmg === 'gib' ? e.maxHp * 3 : dmg, e.x, e.y, opt); }, [i, dmg, opt]);
ok(await ev(() => __game.state()) === 'play', 'spelet startar (' + await ev(() => __game.state()) + ')');
ok(await ev(() => !!(__game.gfxE && __game.gfxE.st && __game.gfxE.st.on)), 'window.__game.gfxE finns och är på');
// spawn mitt i striden: stiger upp ur golvet med damm/portalgnistor
let g0 = await G(); let i = await put('W'); await until(s => __game.gfxE.st.spawns > s, g0.spawns);
let g1 = await G();
ok(g1.spawns === g0.spawns + 1 && g1.parts > g0.parts, `en ny fiende får en spawnanimation (spawns ${g0.spawns}→${g1.spawns}, partiklar +${g1.parts - g0.parts})`);
ok(await ev(i => __game.ents()[i].gBorn > 0, i), 'fienden har en födelsetid för uppstigningen');
await wait(500);
// träffreaktion
g0 = await G(); await hit(i, 0.5); g1 = await G();
ok(g1.hits === g0.hits + 1, 'en träff ger squash/knuff (hits +1)');
ok(await ev(i => { const e = __game.ents()[i]; return Number.isFinite(e.gHitX) && Number.isFinite(e.gHitY) && Math.abs(Math.hypot(e.gHitX, e.gHitY) - 1) < 0.01; }, i), 'träffriktningen är en enhetsvektor (ingen NaN)');
g0 = await G(); await hit(i, 0.2, { quiet: true, noProc: true }); g1 = await G();
ok(g1.hits === g0.hits, 'tysta träffar (blödning, gift) ger ingen knuff');
await wait(100); g0 = await G(); await wait(300); g1 = await G();
ok(g1.poses > g0.poses, `fienderna ritas genom gfxEPose (${g1.poses - g0.poses} på 0,3 s)`);
await shot('traff');
// död: blodpöl som växer under liket
g0 = await G(); await hit(i, 'kill'); await until(p => __game.gfxE.st.pools > p, g0.pools); g1 = await G();
ok(g1.deaths === g0.deaths + 1, 'dödsfallet registreras');
ok(g1.pools === g0.pools + 1, 'en blodpöl läggs under liket');
ok(await ev(i => !__game.ents()[i].gibbed, i), 'liket ligger kvar (kan fortfarande väckas/ätas)');
ok(await until(() => __game.gfxE.grow() === 0, null, 20000), 'pölen har vuxit klart');
await shot('dod');
// gibs efter material
for (const [t, kind] of [['W', 'kött'], ['S', 'ben'], ['L', 'slem'], ['+', 'metall']]) {
  i = await put(t); await wait(550); g0 = await G(); await hit(i, 'gib'); await wait(60); g1 = await G();
  ok(g1.gibs === g0.gibs + 1 && g1.parts - g0.parts >= 6, `${t} (${kind}) sprängs i bitar (${g1.parts - g0.parts} partiklar)`);
  ok(await ev(i => __game.ents()[i].gibbed === true, i), `${t}: gibbed sätts som förut`);
}
await shot('gibs');
ok(await until(() => __game.gfxE.st.splats >= 1), 'köttbitar sätter blodstänk där de slår ned (' + await ev(() => __game.gfxE.st.splats) + ')');
// skytt: glöd före skottet
i = await put('Ä', 3.2); await wait(550);
g0 = await G(); await ev(i => { const e = __game.ents()[i]; e.sleep = false; e.alert = true; e.state = 'attack'; e.t = 0; e.didHit = false; }, i); await until(t => __game.gfxE.st.tele > t, g0.tele); g1 = await G();
ok(g1.tele > g0.tele, `skytten glöder före skottet (${g1.tele - g0.tele} bildrutor)`);
await ev(i => { const e = __game.ents()[i]; e.dead = true; e.gibbed = true; }, i);
// minskade effekter: inga spawn-/dödspartiklar, ingen blodpöl, färre bitar
await ev(() => { __game.settings.lowfx = true; });
g0 = await G(); i = await put('W'); await until(s => __game.gfxE.st.spawns > s, g0.spawns); g1 = await G();
ok(g1.spawns === g0.spawns + 1 && g1.parts === g0.parts, 'lowfx: spawn utan partiklar');
await wait(500); g0 = await G(); await hit(i, 'kill'); await until(d => __game.gfxE.st.deaths > d, g0.deaths); await wait(1200); g1 = await G();
ok(g1.pools === g0.pools, 'lowfx: ingen växande blodpöl');
i = await put('S'); await wait(550); g0 = await G(); await hit(i, 'gib'); await wait(60); g1 = await G();
ok(g1.gibs === g0.gibs + 1 && g1.parts - g0.parts <= 8, `lowfx: färre bitar (${g1.parts - g0.parts})`);
await ev(() => { __game.settings.lowfx = false; });
// omgång 2: synliga statuseffekter, stjärnor vid bedövning, championens pulserande kontur
for (const st of ['burn', 'frozen', 'poison', 'bleed', 'fleeT', 'gShockT']) {
  i = await put('W', 2.2); await ev(([i, st]) => { const e = __game.ents()[i]; e.hp = e.maxHp = 999; e[st] = st === 'gShockT' ? 1e9 : 30; }, [i, st]);
  g0 = await G(); ok(await until(s => __game.gfxE.st.status > s + 1, g0.status, 8000), `statuseffekten ${st} syns (partiklar)`);
  await ev(i => { const e = __game.ents()[i]; e.dead = true; e.gibbed = true; }, i);
}
await ev(() => { __game.settings.lowfx = true; }); i = await put('W', 2.2); await ev(i => { const e = __game.ents()[i]; e.hp = e.maxHp = 999; e.burn = 30; }, i);
g0 = await G(); await wait(1200); g1 = await G(); ok(g1.status === g0.status, 'lowfx: inga statuspartiklar');
await ev(i => { const e = __game.ents()[i]; e.dead = true; e.gibbed = true; }, i); await ev(() => { __game.settings.lowfx = false; });
i = await put('W', 2.2); await ev(i => { const e = __game.ents()[i]; e.hp = e.maxHp = 999; e.stun = 30; e.champion = true; e.alert = true; e.sleep = false; e.d = { ...e.d, speed: 0 }; }, i);
g0 = await G(); ok(await until(([s, a]) => __game.gfxE.st.stars > s && __game.gfxE.st.aura > a, [g0.stars, g0.aura], 8000), 'bedövad: stjärnor runt huvudet; champion: pulserande kontur');
await shot('status');
await ev(i => { const e = __game.ents()[i]; e.dead = true; e.gibbed = true; }, i);
// inget får röja en vilande mimic/staty eller en osynlig elit
i = await put('W', 2.6); await ev(i => { const e = __game.ents()[i]; e.hp = e.maxHp = 999; e.dormant = true; e.alert = false; e.stun = 30; }, i);
g0 = await G(); await wait(900); g1 = await G(); ok(g1.stars === g0.stars, 'vilande fiende med stun: inga stjärnor');
await ev(i => { const e = __game.ents()[i]; e.dormant = false; e.stun = 0; e.champion = true; e.ghost = 0.8; }, i);
g0 = await G(); await wait(900); g1 = await G(); ok(g1.aura === g0.aura, 'osynlig champion: ingen kontur');
await ev(i => { const e = __game.ents()[i]; e.dead = true; e.gibbed = true; }, i);
// död med aktiv status: fryst splittras i isbitar, brinnande blir förkolnad och sjunker
i = await put('W', 2.4); await wait(550); g0 = await G();
await ev(i => { const e = __game.ents()[i]; e.frozen = 5; __game.hurtEnemy(e, e.hp + 1.5, e.x, e.y); }, i); g1 = await G();
ok(g1.shards === g0.shards + 1 && await ev(i => __game.ents()[i].gibbed === true, i), 'fryst fiende splittras i isbitar och glitter');
i = await put('W', 2.4); await wait(550); g0 = await G();
await ev(i => { const e = __game.ents()[i]; e.burn = 5; __game.hurtEnemy(e, e.hp + 1.5, e.x, e.y); }, i); g1 = await G();
ok(g1.chars === g0.chars + 1 && await ev(i => { const e = __game.ents()[i]; return e.gibbed === true && e.gBurnt === true; }, i), 'brinnande fiende blir förkolnad (gibbed som förut)');
g0 = await G(); await wait(400); g1 = await G(); ok(g1.poses > g0.poses, 'det förkolnade liket ritas medan det sjunker');
await shot('forkolnad');
// väktarens intro (samma väg som bossens): leta upp en våning med väktare och väck den
let gw = false;
for (let n = 1; n <= 8 && !gw; n++) { await ev(n => { __game.loadFloor(n); }, n); await until(() => __game.state() === 'play' && __game.levelTime() > 0.5, null, 15000);
  await ev(() => { __game.run().practice = {}; const P = __game.P; P.iframe = 99999; P.hp = 999; }); gw = await ev(() => { const g = __game.ents().find(e => e.guardian && e.asleep); if (g) __game.hurtEnemy(g, 0.5, g.x, g.y); return !!g; }); }
if (gw) { ok(await until(() => __game.gfxE.st.intros > 0 && __game.gfxE.st.bars > 0 && !!__game.guardian(), null, 10000), 'väktarens intro: band och vrål-pose'); await wait(3000); ok(await ev(() => __game.state()) === 'play', 'väktarens intro låser inte spelet'); }
else console.log('INFO ingen våning 1–8 hade en väktare – väktarens intro inte testat');
// av/på
await ev(() => __game.gfxE.set(false)); i = await put('W'); await wait(550); g0 = await G(); await hit(i, 0.5); await wait(200); g1 = await G();
ok(g1.hits === g0.hits && g1.poses === g0.poses && g1.spawns === g0.spawns, 'avstängt: inga träffreaktioner, poser eller spawnanimationer');
await ev(() => __game.gfxE.set(true));
ok(await ev(() => __game.state()) === 'play', 'fortfarande i spelet');
// bossen: fasbyte och dödsanimation i steg
await ev(() => { __game.showTitle(); __game.beginBossHunt(); }); await wait(600);
g0 = await G(); await pg.click('.cu-opt >> nth=0');
ok(await until(r => __game.gfxE.st.intros > 0 && __game.gfxE.st.bars > 0 && __game.gfxE.st.roars > 0, null, 15000), 'bossintro: svarta band, namnet slår in och bossen vrålar (' + JSON.stringify(await ev(() => { const g = __game.gfxE.st; return [g.intros, g.bars, g.roars]; })) + ')');
await shot('boss_intro'); await wait(2500);
ok(await ev(() => __game.state()) === 'play', 'bossintrot låser inte spelet');
ok(await ev(() => !!__game.boss()), 'en boss möts (' + await ev(() => __game.boss() && __game.boss().d.name) + ')');
await ev(() => { const P = __game.P; P.iframe = 99999; P.hp = 999; const b = __game.boss(); b.x = P.x + Math.cos(P.a) * 4.5; b.y = P.y + Math.sin(P.a) * 4.5; b.stun = 99; });
g0 = await G(); await ev(() => { const b = __game.boss(); __game.hurtEnemy(b, b.hp - b.maxHp * 0.6, b.x, b.y); }); await until(p => __game.gfxE.st.phase > p, g0.phase); g1 = await G();
ok(g1.phase === g0.phase + 1, 'bossens fasbyte får en chockvåg och blixt');
await shot('boss_fas');
g0 = await G(); await ev(() => { const b = __game.boss(); __game.hurtEnemy(b, b.hp + 1, b.x, b.y); }); await until(b => __game.gfxE.st.bossBooms >= b + 2, g0.bossBooms); await shot('boss_dor'); await until(b => __game.gfxE.st.bossBooms >= b + 4, g0.bossBooms, 20000); g1 = await G();
ok(g1.bossBooms - g0.bossBooms >= 4, `bossen dör i flera explosionssteg (${g1.bossBooms - g0.bossBooms})`);
await done();
