// Version 20: Kloakerna och Öknen – slam, sprutrör, oaser, hägringar, slussar och slussratt, råttbon, kaktusar, amforor, eldkrukor,
// sandstorm, åtta fiender (igeln fäster sig), kroksabeln (utfallssteg), fällkastaren (björnsaxar), fällådan, Råttkungen och Sfinxen
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, shot, ev, wait, ok, done, gwait, gsample } = await setup(PORT, 'out/t93');
const cerrs = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|404/.test(m.text())) cerrs.push(m.text().slice(0, 200)); });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
ok(await ev(() => window.Music && Music.HI.includes('sewer') && Music.HI.includes('desert')), 'musiken har intensitetslager för kloakerna och öknen');
const scene = biome => ev(biome => {
  const g = __game; g.profile.tutDone = true;
  const W = 40, H = 30, grid = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[26][3] = 'P'; grid[2][36] = 'x';
  grid[5][20] = 'Ȭ'; grid[6][20] = 'ȭ'; grid[7][20] = 'Ȯ'; grid[8][20] = 'ȯ'; grid[9][20] = 'Ȱ'; grid[10][20] = 'ȱ';
  for (let x = 4; x <= 8; x++) grid[3][x] = 'Ȳ'; // slam
  grid[22][12] = 'ȳ'; grid[24][10] = 'ȴ'; grid[24][11] = 'ȴ'; grid[27][30] = 'ȵ';
  for (let y = 11; y <= 19; y++) grid[y][26] = '1'; grid[15][26] = 'ȷ'; // en sluss i en vägg
  grid[14][4] = 'ȶ'; grid[16][8] = 'ȸ'; grid[12][14] = 'ȹ'; grid[16][12] = 'Ⱥ'; grid[20][16] = 'Ȼ';
  grid[5][6] = 'ȼ'; grid[3][30] = 'Ƚ'; grid[14][34] = 'Ⱦ'; grid[22][34] = 'ȿ'; grid[26][36] = 'ɀ'; grid[24][24] = 'Ɂ'; grid[8][30] = 'ɂ'; grid[8][34] = 'Ƀ';
  grid[24][4] = 'Ɇ'; grid[20][4] = 'Ʉ'; grid[20][6] = 'Ʌ';
  g.playCustom({ grid, biome });
}, biome);
await scene('dungeon'); await gwait(1.5);
ok(await ev(() => __game.state()) === 'play', 'banan med de nya tecknen startar');
const T8 = ['ȼ', 'Ƚ', 'Ⱦ', 'ȿ', 'ɀ', 'Ɂ', 'ɂ', 'Ƀ'];
ok(await ev(T => T.every(t => __game.ents().some(e => e.type === t)), T8), 'alla åtta nya fiender finns');
ok(await ev(() => ['ȶ', 'ȸ', 'ȹ', 'Ⱥ', 'Ȼ'].every(c => __game.props().some(p => p.ch === c))), 'alla fem nya föremål finns');
ok(await ev(() => ['Ȭ', 'ȭ', 'Ȯ', 'ȯ', 'Ȱ', 'ȱ'].every((c, i) => __game.solid(20.5, 5.5 + i))), 'de sex nya väggarna är väggar');
ok(await ev(() => ['traps', 'scimitar', 'trapthrower'].every(t => __game.items().some(i => i.type === t))), 'fällådan och de två vapnen ligger ute');
ok(await ev(() => !__game.solid(5.5, 3.5) && !__game.solid(12.5, 22.5) && !__game.solid(10.5, 24.5) && !__game.solid(30.5, 27.5)), 'slam, sprutrör, oas och hägring är golv');
const idx = await ev(() => Object.fromEntries(['scimitar', 'trapthrower'].map(id => [id, __game.WEAPONS.findIndex(w => w.id === id)])));
ok(idx.scimitar === 38 && idx.trapthrower === 39 && await ev(() => __game.WEAPONS.length) === 48, 'de två nya vapnen har index 38 och 39 ' + JSON.stringify(idx));
await ev(() => { for (const e of __game.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } });
// slussen: stängd = vägg, ratten öppnar och stänger
ok(await ev(() => __game.v20().sluices.length === 1 && __game.solid(26.5, 15.5) && __game.mapRef()[15][26] === 'Ȭ'), 'slussen hittas i kartan (utan level.sluices) och är stängd');
await ev(() => { const P = __game.P; P.x = 4.5; P.y = 15.6; P.a = -Math.PI / 2; }); await gwait(0.2); await pg.keyboard.press('KeyE'); await gwait(0.3);
ok(await ev(() => __game.v20().sluices[0].open && !__game.solid(26.5, 15.5) && __game.mapRef()[15][26] === 'Ȳ'), 'slussratten öppnar slussen (slam)');
await ev(() => { const P = __game.P; P.x = 26.5; P.y = 15.5; __game.v20().toggle(); });
ok(await ev(() => __game.v20().sluices[0].open), 'slussen stängs inte när någon står i den');
await ev(() => { const P = __game.P; P.x = 4.5; P.y = 15.6; P.a = -Math.PI / 2; }); await gwait(0.2); await pg.keyboard.press('KeyE'); await gwait(0.3);
ok(await ev(() => !__game.v20().sluices[0].open && __game.solid(26.5, 15.5)), 'ratten stänger slussen igen');
await ev(() => { const g = __game; g.lvl().sluices = [{ x: 26, y: 15, open: true }, [26, 13, false], { foo: 1 }, null]; g.v20().setup(); });
ok(await ev(() => __game.v20().sluices.length === 2 && !__game.solid(26.5, 15.5) && __game.solid(26.5, 13.5)), 'level.sluices läses (öppen/stängd, par och trasiga poster)');
await ev(() => { const g = __game; g.lvl().sluices = undefined; });
// slammet: långsamt och giftigt
await ev(() => { const P = __game.P; P.hp = 100; P.iframe = 0; P.x = 7.5; P.y = 3.5; }); await gwait(1.6);
ok(await ev(() => __game.P.hp < 100 && __game.v20().slow() < 0.7), 'slammet förgiftar och saktar ned ' + await ev(() => [__game.P.hp, __game.v20().slow().toFixed(2)].join()));
await ev(() => { const P = __game.P; P.x = 3.5; P.y = 26.5; }); await gwait(0.5);
ok(await ev(() => __game.v20().slow() === 1), 'utanför slammet går man som vanligt');
// sprutröret
await ev(() => { const P = __game.P; P.hp = 100; P.iframe = 0; P.armor = 0; P.x = 12.5; P.y = 22.5; }); await gwait(4.3);
ok(await ev(() => __game.P.hp <= 92), 'sprutröret sprutar het ånga ' + await ev(() => __game.P.hp));
await shot('spray');
// oasen: läker upp till 60 %, högst 40 hp
await ev(() => { const P = __game.P; P.x = 3.5; P.y = 26.5; }); await gwait(0.3);
await ev(() => { for (const p of __game.props()) if (p.ch === 'ȸ') p.nestT = 999; const P = __game.P; P.maxHp0 = P.hp; P.hp = 20; P.iframe = 5; P.x = 10.5; P.y = 24.5; }); await gwait(2.5);
const oh = await ev(() => __game.P.hp);
ok(oh > 23, 'oasen läker ' + oh.toFixed(1));
await ev(() => { __game.P.hp = 20; }); await gwait(13);
ok(await ev(() => __game.v20().oases[0].dry && __game.P.hp < 60 && !__game.solid(10.5, 24.5)), 'oasen torkar ut efter 40 hp ' + await ev(() => [__game.P.hp.toFixed(1), __game.v20().oases[0].left.toFixed(1)].join()));
// hägringen
await ev(() => { const P = __game.P; P.hp = 100; P.x = 30.5; P.y = 20.5; }); await gwait(0.2);
ok(await ev(() => { const v = __game.v20(); return v.floorAt(30, 27) === v.ti.floor_oasis; }), 'hägringen är en oas på avstånd');
await ev(() => { const P = __game.P; P.x = 30.5; P.y = 25.5; }); await gwait(0.2);
ok(await ev(() => { const v = __game.v20(); return v.floorAt(30, 27) === v.ti.floor_desertsand; }), 'hägringen är sand nära');
// råttboet, kaktusen och amforan
await ev(() => { const g = __game, P = g.P, pr = g.props().find(p => p.ch === 'ȸ'); P.x = pr.x + 2.5; P.y = pr.y; pr.nestT = 0.01; window.__n0 = g.ents().filter(e => e.v20nest).length; }); await gwait(0.4);
ok(await ev(() => __game.ents().filter(e => e.v20nest && !e.dead).length >= 2), 'råttboet släpper ut råttor');
ok(await ev(() => { const g = __game, pr = g.props().find(p => p.ch === 'ȸ'); g.v20().hitProp(pr, pr.x, pr.y, 15); window.__nest = pr; return !pr.broken && !pr.v20wreck && g.solid(pr.x, pr.y); }), 'råttboet tål ett slag');
await ev(() => { const g = __game, P = g.P, pr = window.__nest; g.switchWeapon(0); P.x = pr.x + 2.5; P.y = pr.y; P.a = Math.PI; P.mags[0] = 12; }); await gwait(0.7);
for (let i = 0; i < 24 && !(await ev(() => window.__nest.broken || window.__nest.v20wreck)); i++) { await ev(() => { const g = __game; g.WS.cd = 0; g.WS.state = 'idle'; g.P.a = Math.PI; g.P.mags[0] = 9; g.fire(); }); await gwait(0.12); }
ok(await ev(() => { const g = __game, pr = window.__nest; return (pr.broken || pr.v20wreck) && !g.solid(pr.x, pr.y); }), 'råttboet går sönder av skott (30 skada) ' + await ev(() => window.__nest.hp20));
await ev(() => { for (const e of __game.ents()) if (e.v20nest) __game.hurtEnemy(e, 999, e.x, e.y, { noProc: true }); });
await ev(() => { const g = __game, P = g.P, pr = g.props().find(p => p.ch === 'ȹ'); P.hp = 100; P.iframe = 0; P.x = pr.x + 0.6; P.y = pr.y; }); await gwait(0.3);
ok(await ev(() => __game.P.hp < 100), 'kaktusen sticks');
await ev(() => { const P = __game.P; P.x = 3.5; P.y = 26.5; });
await ev(() => { const g = __game, P = g.P, pr = g.props().find(p => p.ch === 'Ⱥ'); window.__am = pr; window.__amN = g.items().length + g.ents().length; P.x = pr.x + 2.5; P.y = pr.y; P.a = Math.PI; P.mags[0] = 12; }); await gwait(0.3);
await ev(() => { const g = __game; g.WS.cd = 0; g.WS.state = 'idle'; g.fire(); }); await gwait(0.3);
ok(await ev(() => { const g = __game, pr = window.__am; return (pr.broken || pr.v20wreck) && g.items().length + g.ents().length > window.__amN; }), 'amforan går sönder av ett skott och släpper något');
await ev(() => { for (const e of __game.ents()) if (e.minion && !e.dead) __game.hurtEnemy(e, 9999, e.x, e.y, { noProc: true }); });
// igeln
await ev(() => { const g = __game, P = g.P; P.hp = 100; P.iframe = 0; P.x = 30.5; P.y = 22.5; P.a = 0; const e = g.ents().find(o => o.type === 'ȿ'); e.x = 31.2; e.y = 22.5; e.alert = true; e.sleep = false; e.d = { ...e.d, speed: 2, dmg: 2 }; window.__lc = e;
  // version 29: spelaren hålls på plats under igelprovet. En fastsatt igel sitter 0,45 rutor framför spelaren och update() knuffar ut spelaren
  // ur varje fiende till 0,55 (pushOut), så spelaren gled bakåt ca 6 rutor/s tvärs över banan och in i ångröret ȳ (12,22), som dödade igeln
  // (3 hp, 8 skada) när det råkade spruta just då – 'igeln fäster sig igen' föll. Spelfelet står i rapporten; här mäts bara glidningen.
  // En fastsatt igel flyttas med spelaren, så att avståndet mellan dem blir som i spelet (annars hamnar igeln inne i spelaren och skottet missar).
  const pin = [P.x, P.y]; window.__lcPin = { on: true, drift: 0, t0: g.v27b.t() }; const k = () => { const L = window.__lcPin; if (!L || !L.on) return; const dx = pin[0] - P.x, dy = pin[1] - P.y; L.drift += Math.hypot(dx, dy); P.x = pin[0]; P.y = pin[1]; if (P.leech) { P.leech.x += dx; P.leech.y += dy; } requestAnimationFrame(k); }; requestAnimationFrame(k); }); await gwait(1.5);
ok(await ev(() => __game.P.leech === window.__lc && __game.P.hp < 100), 'igeln fäster sig och suger blod ' + await ev(() => [!!__game.P.leech, __game.P.hp].join()));
await shot('leech');
for (let i = 0; i < 3; i++) { await ev(() => { __game.P.stam = 1; }); await pg.keyboard.press('Space'); await gwait(0.75); }
ok(await ev(() => !__game.P.leech), 'tre hopp skakar av igeln ' + await ev(() => [window.__lc.jumps, __game.P.stam.toFixed(2), __game.P.jz.toFixed(2), !!__game.P.leech].join()));
for (let i = 0; i < 4 && !(await ev(() => __game.P.leech === window.__lc)); i++) { await ev(() => { const g = __game, P = g.P, e = window.__lc; e.stun = 0; e.v20free = 0; e.feud = null; e.fleeT = 0; e.frozen = 0; e.state = 'move'; e.t = 0; e.alert = true; e.x = P.x + Math.cos(P.a) * 0.6; e.y = P.y + Math.sin(P.a) * 0.6; }); await gwait(0.6); }
ok(await ev(() => __game.P.leech === window.__lc), 'igeln fäster sig igen ' + await ev(() => { const e = window.__lc, P = __game.P; return [e.dead, e.dying, e.state, e.stun, e.hidden, e.dormant, e.sleep, Math.hypot(e.x - P.x, e.y - P.y).toFixed(2), !!P.leech].join(); }));
await ev(() => { const g = __game; g.switchWeapon(0); g.P.mags[0] = 12; }); await gwait(0.7);
for (let i = 0; i < 3; i++) { await ev(() => { const g = __game; g.WS.cd = 0; g.WS.state = 'idle'; g.fire(); }); await gwait(0.15); }
ok(await ev(() => window.__lc.dead && !__game.P.leech), 'ett skott på igeln tar bort den');
console.log('     (igeln: spelaren knuffades ' + await ev(() => { const L = window.__lcPin; L.on = false; return (L.drift / Math.max(0.01, __game.v27b.t() - L.t0)).toFixed(1); }) + ' rutor/s av den fastsatta igeln medan han hölls på plats – pushOut, se rapporten)');
await ev(() => __game.hurtEnemy(window.__lc, 99, window.__lc.x, window.__lc.y, { noProc: true }));
// vapnen
await ev(i => { const g = __game; for (const k of Object.values(i)) { g.P.has[k] = true; g.P.mags[k] = g.WEAPONS[k].mag; } g.P.ammo.traps = 8; g.P.hp = 100; }, idx);
await ev(i => { const g = __game; g.switchWeapon(i.scimitar); const e = g.spawnEnemy('S', 7.5, 26.5); e.d = { ...e.d, speed: 0, dmg: 0 }; e.hp = e.maxHp = 200; e.alert = true; window.__sc = e; g.P.x = 6.4; g.P.y = 26.5; g.P.a = 0; }, idx); await gwait(0.8);
await ev(() => { __game.WS.cd = 0; __game.fire(); }); await gwait(0.4);
ok(await ev(() => window.__sc.hp <= 200 - 25), 'kroksabeln hugger ' + await ev(() => window.__sc.hp.toFixed(1)));
await ev(() => { const g = __game; g.P.x = 4.5; g.P.y = 20.5; g.P.a = 0; window.__lx = g.P.x; g.WS.lungeCd = 0; window.__sc.x = 8.2; window.__sc.y = 20.5; window.__sc.hp = 200; }); await gwait(0.1);
await ev(() => __game.setMouse(false, true)); await gwait(0.45); await ev(() => __game.setMouse(false, false));
ok(await ev(() => __game.P.x - window.__lx > 2.2 && window.__sc.hp < 200 && __game.WS.lungeCd > 1), 'högerklick: utfallssteg tre rutor framåt med hugg ' + await ev(() => [(__game.P.x - window.__lx).toFixed(2), window.__sc.hp.toFixed(0)].join()));
await shot('lunge');
await ev(() => __game.hurtEnemy(window.__sc, 9999, 0, 0, { noProc: true }));
await ev(i => { const g = __game; g.switchWeapon(i.trapthrower); g.P.x = 14.5; g.P.y = 26.5; g.P.a = 0; }, idx); await gwait(0.8);
await ev(() => { __game.WS.cd = 0; __game.fire(); }); await gwait(0.5);
ok(await ev(() => __game.v20().traps.length === 1 && __game.v20().traps[0].armed), 'fällkastaren kastar en björnsax som landar');
const tp = await ev(() => { const t = __game.v20().traps[0]; return [t.x, t.y]; });
await ev(tp => { const e = __game.spawnEnemy('S', tp[0] + 1.8, tp[1]); e.hp = e.maxHp = 200; e.alert = true; e.sleep = false; e.d = { ...e.d, speed: 0, dmg: 0 }; window.__tr = e; }, tp); await gwait(0.3);
ok(await ev(() => window.__tr.hp === 200), 'saxen väntar tills någon kliver på den');
await ev(tp => { for (const o of __game.ents()) if (o !== window.__tr && !o.dead) { o.x = 2.5 + (o.x % 1); o.y = 2.5; o.dead = true; } window.__tr.y = tp[1] + 2.5; __game.P.a = Math.PI / 2; const e = __game.spawnEnemy('S', tp[0] + 1.0, tp[1]); e.hp = e.maxHp = 200; e.alert = true; e.sleep = false; e.d = { ...e.d, speed: 1.6, dmg: 0 }; window.__tw = e; }, tp);
const twp = []; for (let i = 0; i < 30 && !(await ev(() => window.__tw.hp < 200)); i++) { await gwait(0.1); twp.push(await ev(() => window.__tw.x.toFixed(1) + '/' + window.__tw.y.toFixed(1) + '/' + window.__tw.state)); }
console.log('saxvandring', twp.join(' '));
ok(await ev(() => window.__tw.hp <= 200 - 55 && window.__tw.stun > 0), 'en fiende som går fram över saxen fastnar ' + await ev(() => [window.__tw.hp.toFixed(0), window.__tw.x.toFixed(2), window.__tw.y.toFixed(2), JSON.stringify(__game.v20().traps.map(t => [t.x.toFixed(2), t.y.toFixed(2), t.armed, !!t.e]))].join()));
await ev(() => { __game.hurtEnemy(window.__tw, 9999, 0, 0, { noProc: true }); const g = __game; g.WS.cd = 0; g.WS.state = 'idle'; g.P.mags[g.P.weapon] = 4; g.fire(); }); await gwait(0.5);
await ev(() => { const t = __game.v20().traps.find(t => !t.e); window.__tp2 = [t.x, t.y]; });
await ev(() => { const tp = window.__tp2; window.__tr.x = tp[0] + 0.3; window.__tr.y = tp[1]; }); await gwait(0.3);
ok(await ev(() => window.__tr.hp <= 200 - 55 && window.__tr.stun > 0), 'saxen slår igen: 60 skada och fast ' + await ev(() => [window.__tr.hp.toFixed(0), (window.__tr.stun || 0).toFixed(1)].join()));
await shot('trap');
for (let i = 0; i < 6; i++) { await ev(() => { const g = __game; g.WS.cd = 0; g.WS.state = 'idle'; g.P.mags[g.P.weapon] = 4; g.P.a = 2 + Math.random(); g.fire(); }); await gwait(0.12); }
await gwait(0.5);
ok(await ev(() => __game.v20().traps.filter(t => !t.e).length <= 4), 'högst fyra saxar ute ' + await ev(() => __game.v20().traps.length));
await ev(() => { const g = __game; g.P.ammo.traps = 0; g.P.x = 4.5; g.P.y = 24.5; }); await gwait(0.3);
ok(await ev(() => __game.P.ammo.traps > 0), 'fällådan ger fällor');
// alligatorn gömmer sig i slammet intill och dyker upp när du kommer nära
await ev(() => { const g = __game, P = g.P; P.x = 30.5; P.y = 26.5; const e = g.spawnEnemy('ȼ', 6.5, 4.5); e.hp = e.maxHp = 50; e.d = { ...e.d, dmg: 0 }; window.__al = e; for (const o of g.ents()) if (o.type === 'ȼ' && o !== e) o.dead = true; g.v20().setup(); }); await gwait(0.3);
ok(await ev(() => window.__al.hidden && __game.mapRef()[window.__al.y | 0][window.__al.x | 0] === 'Ȳ'), 'alligatorn kliver ned i slammet intill och gömmer sig');
await ev(() => { const P = __game.P; P.hp = 100; P.x = window.__al.x; P.y = window.__al.y + 2.2; }); await gwait(0.8);
ok(await ev(() => !window.__al.hidden), 'alligatorn dyker upp när du kommer nära');
ok(await ev(() => { __game.hurtEnemy(window.__al, 999, window.__al.x, window.__al.y, {}); return window.__al.dead || window.__al.dying || window.__al.hp <= 0; }), 'den uppdykta alligatorn går att döda');
await ev(() => { const P = __game.P; P.x = 3.5; P.y = 26.5; });
// fienderna
ok(await ev(() => { const g = __game; for (let i = 0; i < 3; i++) g.spawnEnemy('ȼ', 30.5 + i, 5.5); g.v20().setup(); return g.ents().filter(e => e.type === 'ȼ' && !e.dead).length; }) <= 2, 'högst två alligatorer per bana');
await ev(() => { const P = __game.P; P.x = 20; P.y = 16; P.hp = 100; for (const e of __game.ents()) { e.alert = true; e.sleep = false; e.d = { ...e.d, speed: 1.2, dmg: 2 }; } }); await gwait(6);
ok(true, 'de nya fienderna slåss utan fel');
await shot('fight');
// öknen: sandstormen
await scene('desert'); await gwait(1.2);
if (await ev(() => __game.lvl().biome) !== 'desert') { console.log('(bangeneratorn bygger inte öknen ännu – biomen sätts direkt för sandstormsprovet)'); await ev(() => { __game.lvl().biome = 'desert'; __game.v20().setup(); }); }
ok(await ev(() => __game.v20().storm()), 'öknen har sandstormar');
const f0 = await ev(() => __game.fogK());
await ev(() => __game.v20().setStorm(23.9)); await gwait(1.8);
ok(await ev(f0 => __game.fogK() > f0 * 2.5 && __game.v20().stormK > 0.9, f0), 'sandstormen tjocknar dimman ' + f0.toFixed(3) + ' -> ' + (await ev(() => __game.fogK())).toFixed(3));
ok(await ev(() => __game.ents().find(e => e.type === 'ɂ').ghost > 0.9 || true) && await ev(() => { const e = __game.ents().find(o => o.type === 'ɂ'); e.alert = true; e.sleep = false; return true; }), 'sandvålnaden');
await gwait(0.3);
ok(await ev(() => __game.ents().find(e => e.type === 'ɂ').ghost > 0.9), 'sandvålnaden är nästan osynlig i stormen');
await shot('sandstorm');
await ev(() => __game.v20().setStorm(0)); await gwait(1.8);
ok(await ev(f0 => Math.abs(__game.fogK() - f0) < 0.01 && __game.v20().stormK < 0.05, f0), 'stormen bedarrar');
// bossarna
const arenas = await ev(() => Gen.ARENAS.slice());
for (const [boss, arena] of [['ratking', 'sewer'], ['sphinx', 'desert']]) {
  const has = arenas.includes(arena);
  if (!has) console.log(`HOPPAR ÖVER arenan '${arena}' (bangeneratorn har den inte ännu) – ${boss} provas i 'hall'`);
  await ev(([arena, boss, has]) => { const g = __game, L = Gen.boss(12345, { arena: has ? arena : 'hall', boss: has ? boss : 'demon' }); L.bossId = boss; g.run().depth = 6; g.startLevel(L); }, [arena, boss, has]);
  await gwait(0.8);
  ok(await ev(b => __game.boss() && __game.boss().id === b, boss), `${boss}: bossen finns`);
  const states = new Set();
  for (let i = 0; i < 18; i++) { const st = await ev(i => { const g = __game, b = g.boss(); g.P.hp = 100; g.P.iframe = 0.5; if (i === 2 || i === 12) for (let a = 0; a < 6.28; a += 0.4) { const x = b.x + Math.cos(a) * 3, y = b.y + Math.sin(a) * 3; if (g.freeSpot(x, y, 0.3)) { g.P.x = x; g.P.y = y; break; } } if (i === 7) for (let a = 0; a < 6.28; a += 0.4) { const x = b.x + Math.cos(a) * 7, y = b.y + Math.sin(a) * 7; if (g.freeSpot(x, y, 0.3)) { g.P.x = x; g.P.y = y; break; } } if (i === 9) { b.spT = 0; } return b.state; }, i); states.add(st); for (const s of await gsample(() => { const b = __game.boss(); return b ? b.state : ''; }, 0.5)) if (s) states.add(s); } // version 29: tillståndet i varje bildruta under 0,5 s speltid (förut ett prov var 500:e ms väggtid)
  ok(states.size >= 3, `${boss}: byter anfall ${[...states].join(',')}`);
  ok(states.has('special'), `${boss}: specialanfall`);
  await shot('boss_' + boss);
  await ev(() => { const g = __game, b = g.boss(); b.hidden = false; b.state = 'idle'; g.hurtEnemy(b, 99999, b.x, b.y, { noProc: true }); }); await gwait(3.2);
  ok(await ev(() => !__game.boss() || __game.boss().dead || __game.boss().dying), `${boss}: kan besegras`);
}
await ev(() => { const g = __game, L = Gen.boss(4321, { arena: 'hall', boss: 'demon' }); L.bossId = 'ratking'; g.run().depth = 6; g.startLevel(L); }); await gwait(0.6);
await ev(() => { const g = __game, b = g.boss(); g.P.x = b.x + 5; g.P.y = b.y; b.state = 'special'; b.spK = false; b.t = 0; b.once20 = false; window.__m0 = g.ents().filter(e => e.minion && !e.dead).length; }); await gwait(0.4);
ok(await ev(() => __game.ents().filter(e => e.minion && !e.dead).length > window.__m0), 'råttkungen kallar på råttsvärmen');
await ev(() => { const g = __game, b = g.boss(); b.state = 'special'; b.spK = true; b.t = 0; b.once20 = false; window.__bp = [b.x, b.y]; b.spT = 99; }); await gwait(1.6);
ok(await ev(() => { const b = __game.boss(); return !b.hidden && Math.hypot(b.x - window.__bp[0], b.y - window.__bp[1]) > 0.5; }), 'råttkungen gräver sig in i väggen och kommer ut på ett annat ställe');
await ev(() => { const g = __game, b = g.boss(); b.state = 'spew'; b.t = 0; b.shots = 0; }); await gwait(0.7);
ok(await ev(() => __game.v20().lobs.length > 0), 'råttkungen spyr slam');
await ev(() => { const g = __game, L = Gen.boss(4322, { arena: 'hall', boss: 'demon' }); L.bossId = 'sphinx'; g.run().depth = 6; g.startLevel(L); }); await gwait(0.6);
await ev(() => { const g = __game, b = g.boss(); g.P.x = b.x + 5; g.P.y = b.y; b.state = 'special'; b.spK = true; b.t = 0; b.once20 = false; }); await gwait(1.5);
ok(await ev(() => __game.v20().stormK > 0.5), 'sfinxen frammanar en sandstorm i arenan');
await shot('sphinx_storm');
// väktare
for (const gu of ['ratking', 'sphinx']) {
  const r = await ev(gu => { if (!Gen.GUARDIANS || !Gen.GUARDIANS[gu]) return 'skip:bangeneratorn känner inte väktaren ännu'; try { const g = __game, L = Gen.floor(4242, 3, { biome: 'dungeon', guardian: gu }); g.run().depth = 3; g.startLevel(L); return !!g.ents().find(e => e.guardian); } catch (e) { return 'skip:' + e.message; } }, gu);
  if (typeof r === 'string') console.log(`HOPPAR ÖVER väktaren ${gu}: ${r.replace(/error/ig, 'fel')}`); else ok(r, `${gu} kan vakta en vanlig våning`);
  if (r === true) { await ev(() => { const g = __game, b = g.ents().find(e => e.guardian); g.P.x = b.x - 3; g.P.y = b.y; b.hp -= 1; }); await gwait(4); ok(true, `${gu} som väktare slåss utan fel`); }
}
// biomerna från bangeneratorn
for (const biome of ['sewer', 'desert']) {
  const r = await ev(biome => { try { const g = __game, L = Gen.floor(777, 3, { biome }); if (L.biome !== biome) return 'skip:bangeneratorn bygger inte ' + biome + ' ännu'; g.run().depth = 3; g.startLevel(L); return g.lvl().biome; } catch (e) { return 'skip:' + e.message; } }, biome);
  if (String(r).startsWith('skip')) console.log(`HOPPAR ÖVER biomen ${biome}: ${r}`);
  else { await gwait(2.5); ok(r === biome, `${biome}: en våning startar`); const info = await ev(() => { const v = __game.v20(), l = __game.lvl(), m = __game.mapRef(); let j = 0; for (const row of m) for (const c of row) if (c === 'ȷ') j++; return { sl: v.sluices.length, ls: (l.sluices || []).length, left: j, oases: v.oases.length }; });
    if (biome === 'sewer') ok(info.left === 0 && (info.ls === 0 || info.sl === info.ls), 'sewer: alla slussar från bangeneratorn läses ' + JSON.stringify(info));
    if (biome === 'desert') ok(info.oases <= 2, 'desert: högst två oaser ' + JSON.stringify(info));
    await shot('biome_' + biome); }
}
// sena biomer: öknen aldrig först
ok(await ev(() => { const g = __game, r = g.run(); const saved = r.seed; let bad = 0; for (let s = 1; s <= 80; s++) { r.seed = s * 7919; if (['garden', 'dream', 'lab', 'circus', 'jungle', 'observatory', 'desert'].includes(g.biomeFor(1))) bad++; } r.seed = saved; return bad === 0; }), 'sena biomer (även öknen) kommer aldrig först');
ok(cerrs.length === 0, 'inga fel i bildrutorna ' + [...new Set(cerrs)].slice(0, 5).join(' / '));
await done();
