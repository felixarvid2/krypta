// t105 (VÄRLD, grafik och fler animationer): miljöns animationer körs och lowfx stänger av dem.
// Vätskor animeras i texturrymden (lava, vatten …), facklor ger gnistor, kistor slår upp med gnistor, dörrar dammar,
// explosioner lämnar sot på väggarna, åskan lyser i regnet, biomerna har egna luftpartiklar. Inga sidfel.
import { setup } from './head.mjs';
const PORT = 9705, OUT = 'out/t105';
const { pg, errs, ev, wait, ok, done, shot } = await setup(PORT, OUT);
let fails = 0; const chk = (c, m) => { if (!c) fails++; ok(c, m); };
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => { localStorage.removeItem('krypta.run'); const s = __game.settings; s.autoLowFx = false; s.lowfx = false; __game.profile.tutDone = true; __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(500);
chk(await ev(() => !!__game.gfxW && typeof __game.gfxW.bench === 'function'), 'kroken __game.gfxW finns');
const LIQ = '_-ĐǛȲŹĔƖŬŤȂȴ';
const go = (biome, wantLiq) => ev(([biome, LIQ, wantLiq]) => { const g = __game; let L = null, pos = null;
  for (let s = 1; s < 40 && !pos; s++) { L = Gen.floor(s * 7919 + 3, 3, { biome }); const m = L.map; if (!wantLiq) break;
    for (let y = 2; y < m.length - 2 && !pos; y++) for (let x = 2; x < m[0].length - 2 && !pos; x++) if (LIQ.includes(m[y][x])) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) { const c = m[y + dy] && m[y + dy][x + dx]; if (c === '.') { pos = { x: x + dx + 0.5, y: y + dy + 0.5, a: Math.atan2(-dy, -dx) }; break; } } }
  g.run().depth = 3; g.startLevel(L); g.ents().length = 0;
  if (pos) { g.P.x = pos.x; g.P.y = pos.y; g.P.a = pos.a; } g.P.hp = 99999; return !!pos; }, [biome, LIQ, wantLiq]);
const settle = async lbl => { await wait(250); for (let i = 0; i < 6 && await ev(() => CardUI.isOpen()); i++) { await pg.keyboard.press(i % 2 ? 'Digit1' : 'Escape'); await wait(450); }
  if (await ev(() => __game.state() === 'pause')) { await ev(() => __game.resume()); await wait(200); }
  const s = await ev(() => __game.state()); if (s !== 'play') chk(false, `${lbl}: state ${s}`); };
const goS = async (biome, wantLiq) => { const r = await go(biome, wantLiq); await settle(biome); return r; };
const st = () => ev(() => { const s = __game.gfxW.st; return { ticks: s.ticks, air: s.air, embers: s.embers, bubbles: s.bubbles, glints: s.glints, chests: s.chests, doors: s.doors, scorch: s.scorch, bolts: s.bolts, used: s.used.slice() }; });

// 1. lava i vulkanen: egen buffert som ändras över tid
chk(await goS('volcano', true), 'vulkanen: hittade en ruta bredvid lava');
await wait(1400); let a = await st(); const s1 = await ev(() => __game.gfxW.sum('lava')); await wait(500); let b = await st(); const s2 = await ev(() => __game.gfxW.sum('lava'));
chk(a.used.includes('lava'), 'lavan är med bland våningens vätskor (' + a.used.join('+') + ')');
chk(await ev(() => __game.gfxW.isBuf('lava')), 'lavans golvtextur är den animerade bufferten');
chk(b.ticks > a.ticks + 3, `vätskorna uppdateras (${a.ticks} → ${b.ticks})`);
chk(s1 !== s2 && s1 !== 0, 'lavans pixlar rör sig mellan två tidpunkter');
await shot('volcano');
// 2. vatten i den sjunkna staden + bubblor
chk(await goS('sunken', true), 'sjunkna staden: hittade vatten');
await wait(2500); a = await st();
chk(a.used.some(k => /water|deep|shallow/.test(k)), 'vattnet animeras (' + a.used.join('+') + ')');
chk(a.used.length > 0 && await ev(k => __game.gfxW.isBuf(k), a.used[0]), 'vattnets golvtextur är bufferten');
// 3. katedralen: aska i luften; kryptan: gnistor från facklor
await goS('cathedral', false); a = await st(); await wait(2500); b = await st();
chk(b.air > a.air, `katedralen: aska singlar ned (${a.air} → ${b.air})`);
await goS('dungeon', false);
const near = await ev(() => { const g = __game, t = g.gfxW.torches().find(t => !t.hidden && !t.prop); if (!t) return false; g.P.x = t.x + 1.2; g.P.y = t.y; g.P.a = Math.PI; return true; });
a = await st(); await wait(3000); b = await st();
chk(!near || b.embers > a.embers, `kryptan: gnistor stiger ur facklorna (${a.embers} → ${b.embers})`);
// 4. kista, dörr, sot, föremål
const ch = await ev(() => { const g = __game, c = g.chests().find(c => !c.open); if (!c) return null; c.locked = false; c.cursed = false; g.P.x = c.x + 1; g.P.y = c.y; const n = g.particles().length; g.openChest(c); return { n, m: g.particles().length }; });
a = await st(); await wait(300); for (let i = 0; i < 6 && await ev(() => CardUI.isOpen()); i++) { await pg.keyboard.press(i % 2 ? 'Digit1' : 'Escape'); await wait(450); } // kistan kan ge ett kortval – riktiga tangenter
if (await ev(() => __game.state() === 'pause')) { await ev(() => __game.resume()); await wait(200); }
chk(!ch || (a.chests >= 1 && ch.m > ch.n), 'kistan slår upp med gnistor ' + JSON.stringify(ch));
const dr = await ev(() => { const g = __game, m = g.mapRef(); for (const d of Object.values(g.doors())) { if (d.target !== 0 || d.secret) continue; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (m[d.y + dy] && m[d.y + dy][d.x + dx] === '.') { g.P.x = d.x + dx + 0.5; g.P.y = d.y + dy + 0.5; d.target = 1; return true; } } return null; });
await wait(300); b = await st();
chk(!dr || b.doors > a.doors, 'dörren dammar när den öppnas');
const sc = await ev(() => { const g = __game, m = g.mapRef(), m0 = g.gfxW.marks(); let p = null; for (let y = 2; y < m.length - 2 && !p; y++) for (let x = 2; x < m[0].length - 2 && !p; x++) if (m[y][x] === '.' && m[y][x + 1] !== '.' && /[0-9#]/.test(m[y][x + 1])) p = [x + 0.5, y + 0.5]; if (!p) return { m0, m1: -1 }; g.gfxW.scorch(p[0], p[1], 2); return { m0, m1: g.gfxW.marks(), p }; });
chk(sc.m1 > sc.m0, `explosionen lämnar sotmärken på väggarna (${sc.m0} → ${sc.m1})`);
await ev(() => { const g = __game; g.items().push({ x: g.P.x + Math.cos(g.P.a) * 1.5, y: g.P.y + Math.sin(g.P.a) * 1.5, type: 'health', taken: false }); });
a = await st(); await wait(3000); b = await st();
chk(b.glints > a.glints, `föremålen glimtar (${a.glints} → ${b.glints})`);
// 4b. fanan på vägg 5 vajar (texturen byts mot en animerad buffert) och lowfx återställer den
const fan = await ev(() => { const g = __game; for (let s = 1; s < 200; s++) for (const d of [1, 2, 3, 4]) { const L = Gen.floor(s * 7919 + d, d, { biome: 'dungeon' }); if (!L.map.some(r => r.indexOf('5') >= 0)) continue; g.run().depth = d; g.startLevel(L); g.ents().length = 0; g.P.hp = 99999; return true; } return false; });
if (fan) { await wait(300); a = { t: await ev(() => __game.gfxW.st.banTicks || 0) }; await wait(1000); b = { t: await ev(() => __game.gfxW.st.banTicks || 0) };
  chk(b.t > a.t + 5 && await ev(() => __game.gfxW.st.banOn), `fanan vajar (${a.t} → ${b.t})`);
  await ev(() => { __game.settings.lowfx = true; }); await wait(400); chk(!(await ev(() => __game.gfxW.st.banOn)), 'lowfx: fanan tillbaka på den vanliga texturen'); await ev(() => { __game.settings.lowfx = false; }); await wait(200);
} else console.log('     (ingen våning med fanor hittades)');
// 5. åska i regnet (borggården)
await goS('courtyard', false); a = await st(); await ev(() => __game.gfxW.bolt()); await wait(400); b = await st();
chk(b.bolts > a.bolts, 'åskan registreras i borggården');
try { await pg.waitForFunction(n => __game.gfxW.st.bolts > n, b.bolts, { timeout: 30000 }); } catch (e) { /* ingen blixt inom 30 s */ } const c = await st();
chk(c.bolts > b.bolts, `regnet ger egna blixtar (${b.bolts} → ${c.bolts})`);
// 6. lowfx stänger av det tunga och återställer texturerna
await goS('volcano', true); await wait(1500);
chk(await ev(() => __game.gfxW.isBuf('lava')), 'före lowfx: animerad lava');
await ev(() => { __game.settings.lowfx = true; }); await wait(600); a = await st(); await wait(1500); b = await st();
chk(!(await ev(() => __game.gfxW.isBuf('lava'))), 'lowfx: lavan tillbaka på den vanliga texturen');
chk(b.ticks === a.ticks && b.air === a.air && b.embers === a.embers && b.bubbles === a.bubbles, 'lowfx: inga vätskeuppdateringar eller miljöpartiklar');
const sc2 = await ev(() => { const g = __game, m = g.mapRef(), m0 = g.gfxW.marks(); let p = null; for (let y = 2; y < m.length - 2 && !p; y++) for (let x = 2; x < m[0].length - 2 && !p; x++) if (m[y][x] === '.' && m[y][x + 1] !== '.' && /[0-9#Ò]/.test(m[y][x + 1])) p = [x + 0.5, y + 0.5]; if (!p) return -1; g.gfxW.scorch(p[0], p[1], 2); return g.gfxW.marks() - m0; });
chk(sc2 === 0, 'lowfx: inga nya sotmärken (' + sc2 + ')');
await ev(() => { __game.settings.lowfx = false; }); await wait(800);
chk(await ev(() => __game.gfxW.isBuf('lava')), 'lowfx av igen: lavan animeras igen');
// 7. mätning: bildrutetid med och utan (samma sidladdning)
const bm = await ev(() => { const g = __game; const r = { on: [], off: [] }; for (const off of [true, false, true, false]) { g.gfxW.set({ off }); g.gfxW.bench(30); r[off ? 'off' : 'on'].push(g.gfxW.bench(150).mean); } g.gfxW.set({ off: false }); return { on: Math.min(...r.on), off: Math.min(...r.off) }; });
console.log(`     bildrutetid vulkanen: utan ${bm.off.toFixed(2)} ms, med ${bm.on.toFixed(2)} ms (${((bm.on / bm.off - 1) * 100).toFixed(1)} %)`);
const wm = await ev(() => __game.gfxW.warpMs(100)); console.log(`     lavans uppdatering: ${wm.toFixed(3)} ms (15 gånger/s)`);
chk(wm < 2, 'vätskeuppdateringen är billig (' + wm.toFixed(3) + ' ms)');
// 8. alla biomer: världsanimationerna körs utan fel (vätskor, luft, åska, fanor)
const sweep = await ev(() => { const g = __game, out = [], bad = []; g.settings.lowfx = false; g.gfxW.set({ off: false });
  for (const biome of g.gfxW.biomes()) { try { g.run().depth = 3; g.startLevel(Gen.floor(4242 + biome.length * 31, 3, { biome })); g.ents().length = 0; g.P.hp = 99999; g.gfxW.bench(60); if (g.gfxW.used().length) out.push(biome + ':' + g.gfxW.used().join('+')); } catch (e) { bad.push(biome + ': ' + e.message); } }
  return { out, bad }; });
console.log('     vätskor per biom: ' + sweep.out.join(' '));
chk(sweep.bad.length === 0, 'alla biomer körs med världsanimationerna ' + sweep.bad.join(' | '));
chk(errs.length === 0, 'inga sidfel ' + errs.join(' | '));
await done();
if (fails) process.exitCode = 1;
