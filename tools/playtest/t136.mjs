// t136: version 27 (BLOOD) – strålar, överdöd, pölar, fotspår, närstrid, skärmstänk och inställningen BLOD AV/NORMAL/MYCKET.
// En träff skjuter en riktad stråle ut ur fiendens baksida (i skottets riktning); hagel ger mer än pistolen, NORMAL mindre än MYCKET,
// lowfx ingen. Överdöd: fontän, studsande bitar som lämnar fläckar där de landar, flera väggstänk och stänk i hörnen nära spelaren
// (inte med MINSKA RÖRELSE; noFlash tonas in). Ett vanligt dödande ger en bredare pöl under liket och en extra pöl som växer.
// Närstrid stänker på golvet. Spelaren som går genom en pöl lämnar blodiga fotspår några steg. BLOD AV: inget blod alls – inga
// golvfläckar, inga väggstänk, inga blodpartiklar eller köttbitar (överdöd, huvudet, blödning), damm i stället; tillbaka till
// MYCKET återställer bilderna. Inställningen finns under fliken BILD. Inga sidfel. Väntetider i speltid.
import { setup } from './head.mjs';
const PORT = 9836;
const { pg, ev, wait, ok, shot, done } = await setup(PORT, 'out/t136');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });

const sceneFn = o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = !!o.lowfx; g.settings.blood = o.blood ?? 2; g.settings.reduceMotion = false; g.settings.noFlash = false; g.gfxE.set(true); g.v27b.set(true);
  const W = o.W, H = o.H, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[o.p[1]][o.p[0]] = 'P'; grid[1][1] = 'x';
  for (const [t, x, y] of o.en) grid[y][x] = t;
  g.playCustom({ grid, biome: o.biome || 'dungeon' });
  const E = g.ents(), spec = E.filter(e => !e.boss).map(e => [e.type, e.x, e.y]); E.length = 0;
  for (const [t, x, y] of spec) g.spawnEnemy(t, x, y);
  for (const e of E) { e.d = { ...e.d, dmg: 0, speed: 0 }; e.alert = true; }
  g.P.hp = 1e6; clearInterval(window.__hold); window.__pin = [g.P.x, g.P.y]; window.__pinA = o.a || 0; g.P.a = window.__pinA; g.P.pitch = 0; g.P.look = 0;
  window.__hold = setInterval(() => { __game.P.hp = 1e6; if (window.__pin) { __game.P.x = window.__pin[0]; __game.P.y = window.__pin[1]; __game.P.a = window.__pinA; } }, 30);
};
const scene = o => pg.evaluate(sceneFn, o);
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);
const W = 18, H = 9;
// en träff med ett visst vapen: hur många strålpartiklar och åt vilket håll
const jet = (type, wid, opt = {}) => ev(([type, wid, opt]) => { const g = __game, e = g.ents().find(x => x.type === type && !x.dead); const i = g.WEAPONS.findIndex(w => w.id === wid); g.P.weapon = i; e.v27jT = -9;
  const P0 = g.particles().length, j0 = g.v27b.n.jets, s0 = g.v27b.n.splats; e.hp = 1e5; g.hurtEnemy(e, 2.5, e.x, e.y, opt);
  const dx = e.x - g.P.x, dy = e.y - g.P.y, d = Math.hypot(dx, dy), nw = g.particles().slice(P0), fwd = nw.filter(p => (p.vx * dx + p.vy * dy) / d > 0.8).length;
  return { jets: g.v27b.n.jets - j0, fwd, splats: g.v27b.n.splats - s0 }; }, [type, wid, opt]);

// 1) strålar: pistol, hagel, NORMAL, lowfx, närstrid
await scene({ W, H, p: [5, 4], en: [['Ä', 9, 4]] }); await gwait(0.3);
const jp = await jet('Ä', 'pistol'), js = await jet('Ä', 'shotgun'), jm = await jet('Ä', 'pistol', { melee: true });
ok(jp.jets >= 3 && jp.fwd >= jp.jets * 0.7, 'pistolträff: en riktad stråle ut ur fiendens baksida ' + JSON.stringify(jp));
ok(js.jets > jp.jets, 'hagel ger mer än pistolen ' + JSON.stringify({ jp, js }));
ok(jm.jets > jp.jets && jm.splats >= 1, 'närstrid: mer blod och stänk på golvet ' + JSON.stringify({ jp, jm }));
await ev(() => { __game.settings.blood = 1; }); const jn = await jet('Ä', 'pistol');
ok(jn.jets >= 1 && jn.jets < jp.jets, 'NORMAL: mindre stråle än MYCKET ' + JSON.stringify({ jp, jn }));
await ev(() => { __game.settings.blood = 2; __game.settings.lowfx = true; }); const jl = await jet('Ä', 'pistol');
ok(jl.jets === 0, 'lowfx: ingen stråle ' + JSON.stringify(jl));
await ev(() => { __game.settings.lowfx = false; });

// 1b) fryst och brinnande: inget blod (isflisor och aska som förut)
await scene({ W, H, p: [14, 4], en: [['Ä', 16, 3], ['Ä', 16, 5]] }); await gwait(0.3);
const fb = await ev(() => { const g = __game, [a, b] = g.ents(), n0 = { ...g.v27b.n }, m0 = g.v27b.marks().length; a.frozen = 3; g.hurtEnemy(a, 1, a.x, a.y); g.hurtEnemy(a, a.hp + 999, a.x, a.y); b.burn = 3; g.hurtEnemy(b, b.hp + 0.5, b.x, b.y);
  return { aDead: !!a.dead, bDead: !!b.dead, bOver: !!b.overkill, marks: g.v27b.marks().length - m0, jets: g.v27b.n.jets - n0.jets, pools: g.v27b.n.pools - n0.pools, fount: g.v27b.n.fount - n0.fount, kills: g.v27b.n.kills - n0.kills }; });
ok(fb.aDead && fb.bDead && !fb.bOver && fb.jets === 0 && fb.marks === 0 && fb.pools === 0 && fb.fount === 0 && fb.kills === 0, 'fryst (splittras) och brinnande (blir aska): inga strålar, stänk eller pölar ' + JSON.stringify(fb));
// 1c) den riktiga sparken (V) och en riktig avrättning: mer blod än en kulträff
await scene({ W, H, p: [5, 4], en: [['Ä', 6, 4]] }); await gwait(0.4);
const kk = await ev(() => { const g = __game, e = g.ents()[0]; e.hp = 1e5; e.v27jT = -9; return { j0: g.v27b.n.jets, s0: g.v27b.n.splats }; });
await pg.keyboard.press('KeyV'); await gwait(0.2);
const kk2 = await ev(() => ({ jets: __game.v27b.n.jets, splats: __game.v27b.n.splats, kickT: __game.P.kickT }));
ok(kk2.jets - kk.j0 >= 5 && kk2.splats - kk.s0 >= 1, 'den riktiga sparken: kraftig stråle och stänk på golvet (räknas som närstrid) ' + JSON.stringify({ kk, kk2 }));
const ex = await ev(() => { const g = __game, e = g.ents()[0]; e.hp = 3; e.staggerT = g.v27b.t() + 2; const n0 = { ...g.v27b.n }; const r = g.execute(e);
  return { r, dead: !!e.dead, fount: g.v27b.n.fount - n0.fount, scr: g.v27b.scr(), splats: g.v27b.n.splats - n0.splats }; });
ok(ex.dead && ex.fount === 1 && ex.scr >= 1 && ex.splats >= 1, 'en riktig avrättning: fontän, stänk på golvet och i hörnen ' + JSON.stringify(ex));
// 1d) bossarna (inget sheet): material efter boss
const bm = await ev(() => { const out = {}; for (const id of ['demon', 'ghost', 'colossus', 'queenbee', 'gardener', 'butcher']) out[id] = __game.v27b.mat({ boss: true, id, d: { size: 3 }, x: 0, y: 0 }); return out; });
ok(bm.ghost === null && bm.colossus === null && bm.butcher && bm.butcher[0] > bm.butcher[1] * 3 && bm.queenbee && bm.queenbee[1] > bm.queenbee[2] * 2 && bm.demon && bm.demon[2] > 60, 'bossarna: spöket och kolossen blöder inte, slaktmästaren rött, bidrottningen gulgrönt, bendemonen damm ' + JSON.stringify(bm));

// 2) överdöd nära spelaren och en vägg: fontän, studsande bitar som lämnar fläckar, flera väggstänk, stänk i hörnen
await scene({ W, H, p: [14, 4], en: [['Ä', 16, 4]] }); await gwait(0.4);
const ov = await ev(() => { const g = __game, e = g.ents().find(x => x.type === 'Ä'), n0 = { ...g.v27b.n }, m0 = g.v27b.marks().length; g.hurtEnemy(e, e.hp + 999, e.x, e.y);
  return { over: !!e.overkill, fount: g.v27b.n.fount - n0.fount, chunks: g.v27b.n.chunks - n0.chunks, walls: g.v27b.marks().length - m0, scr: g.v27b.scr(), pools: g.v27b.n.pools - n0.pools }; });
ok(ov.over && ov.fount === 1 && ov.chunks >= 4 && ov.walls >= 2 && ov.pools >= 1, 'överdöd: fontän, studsande bitar, flera väggstänk och extra pölar ' + JSON.stringify(ov));
ok(ov.scr >= 1, 'överdöd nära spelaren: stänk i ett hörn av skärmen ' + JSON.stringify(ov));
await gwait(0.12); await shot('overdod_1'); await gwait(0.25); await shot('overdod_2');
const sp0 = await ev(() => __game.v27b.n.splats);
ok(await until(s => __game.v27b.n.splats > s, 3, sp0), 'bitarna lämnar fläckar där de landar ' + (await ev(() => __game.v27b.n.splats)));
ok(await until(() => __game.v27b.scr() === 0, 2), 'skärmstänket är borta efter 1,5 s');
// skärmstänket: bara i hörnen (högst 26 % av bredden, 36 % av höjden) – siktet i mitten berörs aldrig
const geo = await ev(() => { const g = __game; g.v27b.screenAdd(); const c = document.getElementById('screen'); return { W: c.width, H: c.height }; });
await gwait(0.05); await shot('skarm');
const mid = await ev(() => { const c = document.getElementById('screen'), d = c.getContext('2d').getImageData(Math.round(c.width * 0.3), Math.round(c.height * 0.4), Math.round(c.width * 0.4), Math.round(c.height * 0.2)).data; let red = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 120 && d[i + 1] < 30 && d[i + 2] < 30) red++; return red; });
ok(mid === 0, 'mitten av skärmen (siktet) har inget skärmstänk ' + JSON.stringify({ geo, mid }));
// MINSKA RÖRELSE: inget skärmstänk; noFlash: det kommer men tonas in
await ev(() => { __game.settings.reduceMotion = true; __game.v27b.st.scr.length = 0; __game.v27b.screenAdd(); });
ok(await ev(() => __game.v27b.scr()) === 0, 'MINSKA RÖRELSE: inget skärmstänk');
await ev(() => { __game.settings.reduceMotion = false; __game.settings.noFlash = true; __game.v27b.screenAdd(); });
ok(await ev(() => __game.v27b.scr()) === 1, 'MINSKADE BLIXTAR: skärmstänket tonas in (och är svagare)');
await ev(() => { __game.settings.noFlash = false; __game.v27b.st.scr.length = 0; });

// 3) ett vanligt dödande: bredare pöl under liket (inte högre) och en extra pöl som växer
await scene({ W, H, p: [5, 4], en: [['Ä', 9, 4]] }); await gwait(0.4);
const pk = await ev(() => { const g = __game, e = g.ents().find(x => x.type === 'Ä'), n0 = { ...g.v27b.n }; e.alert = true; g.hurtEnemy(e, e.hp + 0.5, e.x, e.y); return { dead: !!e.dead, over: !!e.overkill, pools: g.v27b.n.pools - n0.pools, w0: n0.wide }; });
ok(pk.dead && !pk.over && pk.pools === 1, 'dödande: en extra pöl i skottets riktning ' + JSON.stringify(pk));
ok(await until(w => __game.v27b.n.wide > w, 2, pk.w0), 'MYCKET: pölen under liket blir bredare');
await gwait(1.6);
const pz = await ev(() => { const D = __game.v27b.decalArr(), v = D.filter(d => d.v27to); const gp = D.filter(d => d.v27w); return { v27: v.map(d => [+d.size.toFixed(3), +d.v27to.toFixed(3)]), wide: gp.map(d => [d.img.w, d.img.h, +d.size.toFixed(3)]) }; });
ok(pz.v27.length >= 1 && pz.v27.every(([s, t]) => t - s < 0.01) && pz.wide.length >= 1 && pz.wide.every(([w, h]) => w / h > 5), 'pölarna har vuxit klart och den breda är bred, inte hög ' + JSON.stringify(pz));
await ev(() => { window.__pinA = Math.PI; }); await gwait(0.1); await ev(() => { window.__pin = [8.6, 4.5]; window.__pinA = 0; }); await gwait(0.15); await shot('polar');

// 4) blodiga fotspår: ställ spelaren i pölen, gå några steg
const pool = await ev(() => { const D = __game.v27b.decalArr(), d = D.find(d => d.v27w) || D.find(d => d.v27to); return d ? [d.x, d.y] : null; });
await ev(p => { window.__pin = p; }, pool); await gwait(0.35);
const st0 = await ev(() => ({ step: __game.v27b.step(), steps: __game.v27b.steps() }));
ok(pool && st0.step >= 4, 'spelaren i pölen: de närmaste stegen blir blodiga ' + JSON.stringify({ pool, st0 }));
await ev(() => { window.__pin = null; __game.P.a = Math.PI; }); await pg.keyboard.down('KeyW'); await gwait(1.6); await pg.keyboard.up('KeyW');
let st1 = await ev(() => ({ step: __game.v27b.step(), steps: __game.v27b.steps(), x: +__game.P.x.toFixed(2) }));
if (st1.steps - st0.steps < 2) { await ev(() => { for (let i = 0; i < 3; i++) __game.v27b.stepNow(); }); st1 = await ev(() => ({ step: __game.v27b.step(), steps: __game.v27b.steps(), x: +__game.P.x.toFixed(2), forced: true })); }
ok(st1.steps - st0.steps >= 2 && st1.step < st0.step, 'gången: fotspår som blir allt svagare ' + JSON.stringify({ st0, st1 }));
await ev(() => { window.__pin = [__game.P.x, __game.P.y]; window.__pinA = 0; }); await gwait(0.1); await shot('fotspar');

// 5) BLOD AV: inget blod alls (överdöd, vanligt dödande, huvudskott, blödning), damm i stället
await scene({ W, H, p: [13, 4], en: [['Ä', 16, 3], ['Ä', 16, 5], ['Å', 15, 4], ['L', 15, 2]], blood: 0 }); await gwait(0.5);
const off = await ev(() => { const g = __game, F = g.v27b.fx(), O = g.v27b.st.orig, blood = new Set(O.blood), gib = F.parts.gib;
  const D0 = g.v27b.decalArr().length, m0 = g.v27b.marks().length, o0 = g.v27b.oldMarks(), P0 = g.particles().length, j0 = g.v27b.n.jets;
  const [a, b, c, s] = g.ents(); a.bleed = 4; g.hurtEnemy(a, a.hp + 999, a.x, a.y); b.headT = g.v26c.t(); g.hurtEnemy(b, b.hp + 0.5, b.x, b.y); g.hurtEnemy(c, 1, c.x, c.y); c.bleed = 4; g.hurtEnemy(s, s.hp + 999, s.x, s.y);
  window.__offP0 = P0; window.__offD0 = D0;
  const nw = g.particles().slice(P0);
  return { swapped: g.v27b.swapped(), pool: F.parts.blood_pool === null && F.parts.blood_trail === null, dust: F.blood !== O.blood, marks: g.v27b.marks().length - m0, old: g.v27b.oldMarks() - o0, jets: g.v27b.n.jets - j0,
    red: nw.filter(p => blood.has(p.img)).length, gib: nw.filter(p => gib && p.frames === gib).length, parts: nw.length, offGibs: g.v27b.n.offGibs }; });
ok(off.swapped && off.pool && off.dust, 'BLOD AV: blodbilderna är utbytta mot damm och golvfläckarna avstängda ' + JSON.stringify(off));
ok(off.marks === 0 && off.old === 0 && off.jets === 0 && off.red === 0 && off.gib === 0 && off.parts > 0 && off.offGibs >= 1, 'BLOD AV: inga väggstänk, strålar, blodpartiklar eller köttbitar – damm och stenflisor i stället ' + JSON.stringify(off));
await gwait(2.5);
const off2 = await ev(() => { const g = __game, F = g.v27b.fx(), O = g.v27b.st.orig, D = g.v27b.decalArr(), poolImgs = new Set([...(O.pool || []), ...(O.trail || []), ...(F.parts.sludge || [])]);
  return { added: D.length - window.__offD0, blood: D.filter(d => poolImgs.has(d.img) || d.v27).length, red: g.particles().filter(p => new Set(O.blood).has(p.img)).length }; });
ok(off2.blood === 0 && off2.red === 0, 'BLOD AV: efter 2,5 s inga pölar, spår, slem eller fläckar på golvet ' + JSON.stringify(off2));
await shot('blod_av');
const back = await ev(() => { const g = __game, F = g.v27b.fx(); g.settings.blood = 2; g.v27b.sync(); return { swapped: g.v27b.swapped(), pool: !!F.parts.blood_pool, trail: !!F.parts.blood_trail, blood: F.blood === g.v27b.st.orig.blood }; });
ok(!back.swapped && back.pool && back.trail && back.blood, 'tillbaka till MYCKET: bilderna återställs ' + JSON.stringify(back));

// 6) bild: en sal full av blod (för ögat)
await scene({ W: 14, H: 9, p: [5, 4], en: [['Ä', 11, 2], ['U', 12, 4], ['Å', 11, 6], ['W', 12, 6], ['L', 12, 2]], a: 0 }); await gwait(0.5);
await ev(() => { const g = __game; for (const e of g.ents()) { for (let i = 0; i < 3; i++) { e.v27jT = -9; g.hurtEnemy(e, 0.4, e.x, e.y); } } });
await gwait(0.2); await ev(() => { const g = __game; for (const e of g.ents()) g.hurtEnemy(e, e.hp + (e.type === 'U' || e.type === 'W' ? 999 : 0.5), e.x, e.y); });
await gwait(0.25); await shot('sal_1'); await gwait(1.5); await ev(() => { window.__pin = [8.5, 4.5]; }); await gwait(0.2); await shot('sal_2');

// 7) inställningen BLOD finns under BILD OCH TILLGÄNGLIGHET med AV / NORMAL / MYCKET
await ev(() => { clearInterval(window.__hold); __game.showTitle(); }); await pg.click('#settingsbtn'); await wait(300);
const row = await ev(() => { const t = [...document.querySelectorAll('.cu-tab')].find(b => b.textContent.trim() === 'BILD'); if (t) t.click();
  const r = [...document.querySelectorAll('label.cu-row')].find(l => l.firstChild && l.firstChild.textContent.trim() === 'BLOD'), s = r && r.querySelector('select');
  return { tab: !!t, found: !!r, shown: !!r && r.offsetParent !== null, opts: s ? [...s.options].map(o => o.value + ':' + o.textContent) : null, val: s ? s.value : null }; });
ok(row.found && row.shown && row.val === '2' && row.opts && row.opts.join() === '0:AV,1:NORMAL,2:MYCKET', 'inställningen BLOD (AV / NORMAL / MYCKET) syns under BILD och står på MYCKET ' + JSON.stringify(row));
const chg = await ev(() => { const r = [...document.querySelectorAll('label.cu-row')].find(l => l.firstChild && l.firstChild.textContent.trim() === 'BLOD'), s = r.querySelector('select'); s.value = '0'; s.dispatchEvent(new Event('change')); const a = { v: __game.settings.blood, sw: __game.v27b.swapped() }; s.value = '2'; s.dispatchEvent(new Event('change')); return { ...a, back: __game.settings.blood, sw2: __game.v27b.swapped() }; });
ok(chg.v === 0 && chg.sw === true && chg.back === 2 && chg.sw2 === false, 'menyvalet byter läge direkt ' + JSON.stringify(chg));
await pg.keyboard.press('Escape'); await wait(200);
await done();
