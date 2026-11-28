// Version 30 (SPEL): Ruinstaden och Glasbruket från bangeneratorn, Borgmästaren och Glasmästaren (arenor, anfall, faser, väktare),
// ?biome=ruins|glassworks, djupregeln i första varvet och sena biomer
import { setup } from './head.mjs';
const PORT = 9891;
const { pg, shot, ev, ok, start, done, gwait, wait } = await setup(PORT, 'out/t191');
const miss404 = []; pg.on('response', r => { if (r.status() >= 400 && !/_(submerge|dive)\.png/.test(r.url()) && /\/assets\/.*(ruin|glass|kiln|mayor|sling|looter|rubble|rooftop|dust|slag|furnace|shard|molten|cracked30|icon_heat|icon_shards|boss3[12]|pakt_slunga|studssten|ullsnoret|kastremmen)/.test(r.url())) miss404.push(r.status() + ' ' + r.url().replace(/^.*\/assets\//, '')); });
const cerrs = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|404/.test(m.text())) cerrs.push(m.text().slice(0, 200)); });
await start(); await gwait(1);
await ev(() => { __game.profile.tutDone = true; });
const clearUi = async () => { for (let i = 0; i < 20; i++) { const open = await ev(() => { if (!(window.CardUI && CardUI.isOpen())) return false; const el = document.querySelector('.cu-talent, .cu-tcard, .cu-card:not(.owned), .cu-opt, .cu-btn, .cu-li[role=button]'); if (el) el.click(); return true; }); if (!open) break; await wait(250); } await gwait(0.3); }; // talangvalet efter en nivå (som t172)
const lum = () => ev(() => { const c = document.querySelector('canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0, r = 0, b = 0; for (let i = 0; i < d.length; i += 16) { s += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; r += d[i]; b += d[i + 2]; } const n = d.length / 16; return { lum: +(s / n).toFixed(1), r: +(r / n).toFixed(1), b: +(b / n).toFixed(1) }; });
const arenas = await ev(() => Gen.ARENAS.slice());
ok(arenas.includes('ruins') && arenas.includes('glassworks'), 'bangeneratorn har båda arenorna');
// biomerna från bangeneratorn: flera frön, fienderna slåss
for (const biome of ['ruins', 'glassworks']) {
  const tot = {};
  for (let s = 1; s <= 4; s++) {
    const r = await ev(([biome, s]) => { const g = __game, d = biome === 'ruins' ? 3 + (s % 3) : 4 + (s % 2), L = Gen.floor(700 + s * 37, d, { biome }); g.run().depth = d; g.startLevel(L); return g.lvl().biome; }, [biome, s]);
    await gwait(1.5);
    const f = await ev(() => { const g = __game, m = g.mapRef(), cnt = ch => m.reduce((a, row) => a + row.filter(c => c === ch).length, 0), V = g.v30().V30L();
      return { roof: cnt('ʝ'), rubble: cnt('ʞ'), molten: cnt('ʟ'), shards: cnt('ʠ'), vents: V.vents.length, furn: V.furnaces.length, glass: cnt('ǁ'), win: cnt('ǂ'), golems: g.ents().filter(e => e.type === 'ʩ').length, crawlers: g.ents().filter(e => e.type === 'ʰ').length, live: V.live, ents: g.ents().length }; });
    for (const k in f) tot[k] = (tot[k] || 0) + (+f[k] || 0);
    ok(r === biome && f.live && f.golems <= 2 && f.crawlers <= 3, `${biome} frö ${s}: ` + JSON.stringify(f));
    await ev(() => { const g = __game; g.P.hp = 999; g.P.iframe = 99; for (const e of g.ents()) { e.alert = true; e.sleep = false; } }); await gwait(3);
    if (s === 1) { await ev(() => { const g = __game; g.P.hp = 100; }); await gwait(0.3); const L = await lum(); ok(L.lum > 12, `${biome}: bilden är läsbar ` + JSON.stringify(L)); await shot('biome_' + biome); }
  }
  if (biome === 'ruins') ok(tot.roof + tot.rubble > 0, 'Ruinstaden har rasande tak och grus ' + JSON.stringify(tot));
  else ok(tot.molten + tot.shards > 0 && tot.furn > 0, 'Glasbruket har smält glas, skärvor och smältugnar ' + JSON.stringify(tot));
}
// bossarna i sina arenor
for (const [boss, arena] of [['mayor', 'ruins'], ['glassmaster', 'glassworks']]) {
  await ev(([arena, boss]) => { const g = __game, L = Gen.boss(12345, { arena, boss }); L.bossId = boss; g.run().depth = 6; g.startLevel(L); }, [arena, boss]);
  await gwait(2.6);
  ok(await ev(b => __game.boss() && __game.boss().id === b, boss), `${boss}: bossen finns`);
  const states = new Set();
  for (let i = 0; i < 20; i++) { const st = await ev(i => { const g = __game, b = g.boss(); g.P.hp = 100; g.P.iframe = 0.5; if (i === 2 || i === 12) for (let a = 0; a < 6.28; a += 0.4) { const x = b.x + Math.cos(a) * 3, y = b.y + Math.sin(a) * 3; if (g.freeSpot(x, y, 0.3)) { g.P.x = x; g.P.y = y; break; } } if (i === 7) b.spT = 0; if (i === 15) b.hp = b.maxHp * 0.4; return b.state; }, i); states.add(st); await gwait(0.55); }
  ok(states.size >= 3, `${boss}: byter anfall ${[...states].join(',')}`);
  ok(states.has('special'), `${boss}: specialanfall`);
  await ev(() => { const g = __game, b = g.boss(); for (let a = 0; a < 6.28; a += 0.3) { const x = b.x + Math.cos(a) * 5, y = b.y + Math.sin(a) * 5; if (g.freeSpot(x, y, 0.3) && g.hasLOS && g.hasLOS(x, y, b.x, b.y) !== false) { g.P.x = x; g.P.y = y; g.P.a = Math.atan2(b.y - y, b.x - x); break; } } b.state = 'idle'; b.cd = 3; b.spT = 9; }); await gwait(0.3);
  await clearUi(); await shot('boss_' + boss);
  await ev(() => { const g = __game, b = g.boss(); b.hidden = false; b.state = 'idle'; g.hurtEnemy(b, 99999, b.x, b.y, { noProc: true }); }); await gwait(3.2);
  ok(await ev(() => !__game.boss() || __game.boss().dead || __game.boss().dying), `${boss}: kan besegras`);
  ok(await ev(() => __game.v30().V30L().temp.length === 0 && __game.v30().V30L().falls.length === 0), `${boss}: farorna städas bort när bossen dör`);
}
// borgmästaren river taket över spelaren; glasmästaren blåser en kupa och skickar vågor av smält glas
await ev(() => { const g = __game, L = Gen.boss(4321, { arena: 'ruins', boss: 'mayor' }); L.bossId = 'mayor'; g.run().depth = 6; g.startLevel(L); }); await gwait(2.6);
await clearUi();
await ev(() => { const g = __game, b = g.boss(); g.P.x = b.x + 6; g.P.y = b.y; if (!g.freeSpot(g.P.x, g.P.y, 0.3)) g.P.x = b.x - 6; b.state = 'roof'; b.t = 0; b.once30 = false; b.cd = 99; b.spT = 99; g.P.iframe = 5; }); await gwait(0.6);
ok(await ev(() => __game.v30().V30L().falls.length >= 3), 'borgmästaren river ned taket (skuggor) ' + await ev(() => __game.state()));
await ev(() => { const g = __game, b = g.boss(); b.state = 'special'; b.spK = 0; b.t = 0; b.once30 = false; window.__m0 = g.ents().filter(e => e.minion && !e.dead).length; }); await gwait(0.5);
ok(await ev(() => __game.ents().filter(e => e.minion && !e.dead && e.d.ai === 'looter').length >= 2), 'borgmästaren kallar på plundrare');
await ev(() => { const g = __game, b = g.boss(); b.hp = b.maxHp * 0.4; b.phase = 2; b.v30edge = 0; b.state = 'idle'; b.cd = 0.5; }); await gwait(2.2);
ok(await ev(() => __game.mapRef().some(r => r.includes('ʞ'))), 'fas 2: arenan rasar i kanterna (grus)');
await shot('mayor_roof');
await ev(() => { const g = __game, L = Gen.boss(4322, { arena: 'glassworks', boss: 'glassmaster' }); L.bossId = 'glassmaster'; g.run().depth = 6; g.startLevel(L); }); await gwait(2.6);
await clearUi();
await ev(() => { const g = __game, b = g.boss(); g.P.x = b.x + 5; g.P.y = b.y; if (!g.freeSpot(g.P.x, g.P.y, 0.3)) g.P.x = b.x - 5; b.state = 'dome'; b.t = 0; b.once30 = false; b.cd = 99; b.spT = 99; g.P.iframe = 5; }); await gwait(0.7);
ok(await ev(() => __game.v30().V30L().domes.length === 1), 'glasmästaren blåser en glaskupa runt spelaren');
const dome = await ev(() => { const g = __game, P = g.P, d = g.v30().V30L().domes[0]; P.vx = 5; return [d.x, d.y]; }); await gwait(0.4);
ok(await ev(d => Math.hypot(__game.P.x - d[0], __game.P.y - d[1]) < 0.7, dome), 'kupan håller spelaren fast');
await gwait(2);
ok(await ev(() => __game.v30().V30L().domes.length === 0), 'kupan spricker efter 2 s');
await ev(() => { const g = __game, b = g.boss(); b.state = 'wave'; b.t = 0; b.once30 = false; }); await gwait(0.9);
ok(await ev(() => __game.v30().V30L().temp.some(o => o.ch === 'ʟ')), 'en våg av smält glas längs golvet');
await ev(() => { const g = __game, b = g.boss(); b.state = 'special'; b.spK = 1; b.t = 0; b.once30 = false; }); await gwait(0.4);
ok(await ev(() => __game.ents().filter(e => e.v30clone && !e.dead).length >= 2), 'glasmästaren gör glaskopior');
await ev(() => { const g = __game; for (const e of g.ents()) if (e.v30clone && !e.dead) g.hurtEnemy(e, 1, e.x, e.y, {}); }); await gwait(0.4);
ok(await ev(() => __game.ents().filter(e => e.v30clone && !e.dead && !e.dying).length === 0), 'glaskopiorna spricker av en träff');
await clearUi(); await shot('glassmaster');
// väktare i en annan biom
for (const gu of ['mayor', 'glassmaster']) {
  const r = await ev(gu => { try { const g = __game, L = Gen.floor(4242, 3, { biome: 'dungeon', guardian: gu }); g.run().depth = 3; g.startLevel(L); return !!g.ents().find(e => e.guardian); } catch (e) { return 'fel:' + e.message; } }, gu);
  ok(r === true, `${gu} kan vakta en vanlig våning ` + r);
  if (r === true) {
    await ev(() => { const g = __game, b = g.ents().find(e => e.guardian); for (let a = 0; a < 6.28; a += 0.3) { const x = b.x + Math.cos(a) * 3, y = b.y + Math.sin(a) * 3; if (g.freeSpot(x, y, 0.3)) { g.P.x = x; g.P.y = y; break; } } b.hp -= 1; g.P.hp = 999; g.P.iframe = 9; }); await gwait(2);
    await clearUi();
    const st = await ev(() => __game.state());
    await ev(gu => { const g = __game, b = g.ents().find(e => e.guardian); b.asleep = false; b.alert = true; b.state = gu === 'mayor' ? 'roof' : 'dome'; b.t = 0; b.once30 = false; b.cd = 99; b.spT = 99; b.stun = 0; }, gu); await gwait(0.8);
    const v = await ev(() => { const V = __game.v30().V30L(); return { live: V.live, falls: V.falls.length + (window.__f0 || 0), domes: V.domes.length }; });
    ok(st === 'play' && v.live && (gu === 'mayor' ? v.falls >= 3 : v.domes === 1), `${gu} som väktare: ${gu === 'mayor' ? 'river ned taket' : 'blåser en glaskupa'} i en annan biom ` + JSON.stringify({ st, ...v }));
    await clearUi(); await shot('guardian_' + gu);
  }
}
// första varvet: Ruinstaden aldrig före våning 3, Glasbruket aldrig före våning 4
ok(await ev(() => { const g = __game, r = g.run(); const saved = r.seed; let bad = 0, seen = 0; for (let s = 1; s <= 400; s++) { r.seed = s * 7919; for (let d = 1; d <= 5; d++) { const b = g.biomeFor(d); if (b === 'ruins' || b === 'glassworks') seen++; if ((b === 'ruins' && d < 3) || (b === 'glassworks' && d < 4)) bad++; } } r.seed = saved; window.__seen = seen; return bad === 0; }), 'djupregeln i första varvet håller (sett ' + await ev(() => window.__seen) + ' gånger)');
for (const biome of ['ruins', 'glassworks']) {
  await start('&biome=' + biome);
  ok(await ev(() => __game.state()) === 'play' && await ev(() => __game.lvl().biome) === biome, `?biome=${biome}: rundan startar i biomen`);
  await gwait(2);
}
ok(miss404.length === 0, 'inga saknade version 30-filer under assets/ ' + miss404.slice(0, 5).join(' / '));
ok(cerrs.length === 0, 'inga fel i konsolen ' + cerrs.slice(0, 3).join(' / '));
await done();
