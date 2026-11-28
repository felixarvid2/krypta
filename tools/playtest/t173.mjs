// t173: version 29 (SPEL), blodvåningens egen belöning och egen boss. Blodaltaret står på varje blodvåning (gen.js level.altar29, annars en fri ruta
// med fritt runt om): E vid altaret öppnar valet, OFFRA kostar 25 % av hälsan och ger en blodpakt (+10 % skada resten av rundan, räknas i run.s29,
// statistiken och dödsskärmen). Varannan blodvåning (och djup 8+) väntar BLODFURSTEN, en förstärkt elit med blodtema: den läker av blodpölar på golvet,
// pölarna skjuts sönder med en riktig kula (fire()) och då slutar läkningen; fälld ger den en kista och guld. BLOD AV: altaret och pölarna finns kvar
// (mörk sörja, inget väggblod). En regel (GLASKANON) och blodvåningen på samma våning. ?v29off=1: inget altare och ingen blodfurste.
// Alla väntetider i speltid. Inga sidfel. Skärmbilder i OUT.
import { setup } from './head.mjs';
const PORT = 9873, OUT = process.env.S29_OUT || 'out/t173';
const { pg, ev, wait, ok, start, done } = await setup(PORT, OUT);
pg.setDefaultNavigationTimeout(120000); pg.setDefaultTimeout(120000); // (sidan kan vara långsam när flera prov körs samtidigt)
const gt = () => ev(() => { if (window.CardUI && CardUI.isOpen() && __game.state() === 'ui' && !window.__keepUI) { const el = document.querySelector('.cu-talent, .cu-tcard'); if (el) el.click(); } return __game.roles.t(); }); // (nivå upp: talangvalet väljs direkt)
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(60); } };
const gwait = sec => until(null, sec);
const hold = () => ev(() => { clearInterval(window.__hold); window.__hold = setInterval(() => { const g = window.__game; if (g && g.P && g.state() === 'play') { g.P.hp = Math.max(g.P.hp, 40); } }, 100); });
const unhold = () => ev(() => clearInterval(window.__hold));
const blood = (d, extra = {}) => ev(([d, extra]) => { const g = __game; g.v28g.force(d, Object.assign({ blood: true }, extra)); g.loadFloor(d); g.resume && g.resume(); const s = g.s29.state(); return { blood: g.v28g.state().blood, chal: g.v28g.state().chal, altar: s.altar, boss: s.boss, run: s.run, hud: s.hud, gen: g.lvl().altar29 || null }; }, [d, extra]);
const quiet = () => ev(() => { for (const e of __game.ents()) if (!e.s29boss && !e.boss) { e.dead = true; e.hidden = true; } });
await start();
await ev(() => { __game.settings.blood = 2; });
await hold();
// 1) första blodvåningen (djup 4): altaret, ingen blodfurste
const a = await blood(4); await gwait(0.3);
ok(a.blood && a.altar && !a.altar.used, `blodvåningen har ett blodaltare ${JSON.stringify(a.altar)} (gen.js: ${JSON.stringify(a.gen)})`);
ok(!a.boss, 'första blodvåningen: ingen blodfurste ' + JSON.stringify(a.run));
const solid = await ev(al => __game.solid(al.x + 0.5, al.y + 0.5), a.altar);
ok(solid, 'altaret är ett block på kartan');
await quiet();
await ev(al => { const g = __game, P = g.P; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = al.x + 0.5 + dx * 1.1, y = al.y + 0.5 + dy * 1.1; if (g.freeSpot(x, y, 0.25)) { P.x = x; P.y = y; P.a = Math.atan2(al.y + 0.5 - y, al.x + 0.5 - x); return; } } }, a.altar);
await gwait(1.5); await pg.screenshot({ path: `${OUT}/altaret.png` });
// E: valet öppnas; OFFRA
const before = await ev(() => { const g = __game, P = g.P; P.hp = 100; return { hp: P.hp, max: g.s29.S && 100 }; });
await unhold();
await ev(() => { window.__keepUI = true; __game.useKey(); }); await wait(400);
const open = await ev(() => !!(window.CardUI && CardUI.isOpen()) && [...document.querySelectorAll('.cu-opt')].map(e => e.textContent).join(' | '));
ok(open && /OFFRA/.test(open), 'E vid altaret öppnar valet: ' + open);
await ev(() => { const el = [...document.querySelectorAll('.cu-opt')].find(e => /OFFRA/.test(e.textContent)); if (el) el.click(); window.__keepUI = false; }); await wait(400);
const after = await ev(() => { const g = __game, s = g.s29.state(); return { hp: g.P.hp, pacts: s.run && s.run.pacts, used: s.altar && s.altar.used, msgs: g.msgs().map(m => m.text).join(' | ') }; });
ok(after.pacts === 1 && after.used && after.hp <= before.hp - 20 && after.hp >= 1, `OFFRA: en blodpakt, hälsan ${before.hp} → ${after.hp}, altaret förbrukat (${after.msgs})`);
await hold();
const dmg = await ev(() => { const g = __game, P = g.P, e = g.spawnEnemy('S', P.x + 2, P.y); e.hp = e.maxHp = 1000; e.alert = true; g.hurtEnemy(e, 4, e.x, e.y, { noProc: true }); const out = 1000 - e.hp; e.dead = true; return out; });
ok(Math.abs(dmg - 4.4) < 0.01, `blodpakten: +10 % skada (4 → ${dmg})`);
// 2) andra blodvåningen (djup 5): blodfursten
const b = await blood(5); await gwait(0.3);
ok(!!b.boss && b.boss.hp > 1000 * 0, `andra blodvåningen: BLODFURSTEN ${JSON.stringify(b.boss)}`);
const look = await ev(() => { const e = __game.s29.boss(); return e ? { name: e.d.name, tint: e.elite && e.elite.tint, elite: e.elite && e.elite.id, size: e.d.size } : null; });
ok(look && look.name === 'BLODFURSTEN' && look.elite === 'blood29' && look.tint[0] > 200 && look.tint[1] < 80, 'blodfursten har blodtema (röd färgton, större) ' + JSON.stringify(look));
await quiet();
// ställ spelaren 4 rutor från fursten, larma den, ingen skada på spelaren
await ev(() => { const g = __game, e = g.s29.boss(), P = g.P; e.alert = true; e.d = { ...e.d, dmg: 0 }; for (let k = 0; k < 16; k++) { const an = k / 16 * Math.PI * 2, x = e.x + Math.cos(an) * 4, y = e.y + Math.sin(an) * 4; if (g.freeSpot(x, y, 0.3) && g.hasLOS(x, y, e.x, e.y)) { P.x = x; P.y = y; P.a = Math.atan2(e.y - y, e.x - x); return; } } });
const pooled = await until(() => __game.s29.state().pools >= 1, 8);
ok(pooled, 'fursten spiller blodpölar på golvet: ' + (await ev(() => __game.s29.state().pools)));
await ev(() => { const g = __game, p = g.s29.pools()[0], P = g.P; if (p) P.a = Math.atan2(p.y - P.y, p.x - P.x); }); await gwait(0.6); await pg.screenshot({ path: `${OUT}/blodfursten.png` });
// läker av pölarna
const h = await ev(() => { const e = __game.s29.boss(); e.hp = e.maxHp * 0.5; e.d = { ...e.d, speed: 0 }; return { hp: e.hp, pools: __game.s29.state().pools }; });
await gwait(1.5);
const h2 = await ev(() => __game.s29.boss().hp);
ok(h2 > h.hp * 1.005, `fursten läker av ${h.pools} pöl(ar): ${Math.round(h.hp)} → ${Math.round(h2)}`);
// skjut sönder pölarna med en riktig kula
let shot = 0;
for (let i = 0; i < 8; i++) {
  const left = await ev(() => __game.s29.state().pools); if (!left) break;
  const r = await ev(() => { const g = __game, P = g.P, WS = g.WS, ps = g.s29.pools().filter(p => p.hp > 0); if (!ps.length) return null; const p = ps[0], e = g.s29.boss();
    for (let k = 0; k < 24; k++) { const an = k / 24 * Math.PI * 2, x = p.x + Math.cos(an) * 2.2, y = p.y + Math.sin(an) * 2.2; if (!g.freeSpot(x, y, 0.3) || !g.hasLOS(x, y, p.x, p.y)) continue;
      const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy), ex = e.x - x, ey = e.y - y, along = (ex * dx + ey * dy) / d; if (along > 0 && along < d + 0.3 && Math.abs(ex * dy - ey * dx) / d < 0.8) continue; // (fursten inte i vägen)
      P.x = x; P.y = y; P.a = Math.atan2(dy, dx); P.weapon = 0; P.mags[0] = 9; WS.state = 'idle'; WS.cd = 0; g.fire(); return { n0: ps.length }; } return { n0: ps.length, noSpot: true }; });
  await gwait(0.15);
  const n1 = await ev(() => __game.s29.state().pools);
  if (r && n1 < r.n0) shot++;
}
const st = await ev(() => __game.s29.state());
ok(shot >= 1 && st.pools === 0, `pölarna skjuts sönder med kulor (${shot} träffar, ${st.pools} kvar, ${st.st.poolsShot} borta)`);
const h3 = await ev(() => __game.s29.boss().hp); await gwait(0.8); const h4 = await ev(() => ({ hp: __game.s29.boss().hp, pools: __game.s29.state().pools }));
ok(h4.pools > 0 || Math.abs(h4.hp - h3) < 1e-6, `utan pölar läker fursten inte: ${Math.round(h3)} → ${Math.round(h4.hp)}`);
// fäll fursten
const ch0 = await ev(() => __game.chests().length);
await ev(() => { const e = __game.s29.boss(); __game.hurtEnemy(e, e.hp + 999999, e.x, e.y, { noProc: true }); }); await gwait(0.5);
const down = await ev(() => { const g = __game, s = g.s29.state(); return { boss: s.boss, pools: s.pools, run: s.run, chests: g.chests().length, msgs: g.msgs().map(m => m.text).join(' | '), log: JSON.stringify((g.run().log || g.run().events || [])).slice(-2000) }; });
ok(!down.boss && down.pools === 0 && down.run.bosses === 1 && down.chests > ch0 && /BLODFURSTEN (ÄR )?FÄLLD/.test(down.msgs + ' ' + down.log), 'blodfursten fälld: kista, guld och räknad ' + JSON.stringify({ run: down.run, chests: [ch0, down.chests], msg: /BLODFURSTEN ÄR FÄLLD/.test(down.msgs), log: /BLODFURSTEN FÄLLD/.test(down.log) }));
// 3) GLASKANON på en blodvåning
const c = await blood(7, { chal: 'glass' }); // (djup 6 är bossens våning) await gwait(0.3);
ok(c.blood && c.chal === 'glass' && c.hud === 'UTMANING · GLASKANON', `regel och blodvåning tillsammans: ${JSON.stringify({ blood: c.blood, chal: c.chal, hud: c.hud, altar: !!c.altar })}`);
const gd = await ev(() => { const g = __game, P = g.P, e = g.spawnEnemy('S', P.x + 2, P.y); e.hp = e.maxHp = 1000; e.alert = true; g.hurtEnemy(e, 4, e.x, e.y, { noProc: true }); const out = 1000 - e.hp; e.dead = true; return out; });
ok(Math.abs(gd - 8.8) < 0.01, `GLASKANON och blodpakten tillsammans: 4 → ${gd} (×2 × 1,1)`);
// 4) BLOD AV, djup 8 (blodfursten på djup 8+)
await ev(() => { __game.settings.blood = 0; });
const o = await blood(8); await gwait(0.3);
ok(o.altar && o.boss, `BLOD AV: altaret och blodfursten finns ${JSON.stringify({ altar: !!o.altar, boss: !!o.boss })}`);
await quiet();
await ev(() => { const g = __game, e = g.s29.boss(), P = g.P; e.alert = true; e.d = { ...e.d, dmg: 0, speed: 0 }; for (let k = 0; k < 16; k++) { const an = k / 16 * Math.PI * 2, x = e.x + Math.cos(an) * 4, y = e.y + Math.sin(an) * 4; if (g.freeSpot(x, y, 0.3) && g.hasLOS(x, y, e.x, e.y)) { P.x = x; P.y = y; P.a = Math.atan2(e.y - y, e.x - x); return; } } });
await until(() => __game.s29.state().pools >= 1, 8); await gwait(0.4); await ev(() => { const g = __game, p = g.s29.pools()[0], P = g.P; if (p) P.a = Math.atan2(p.y - P.y, p.x - P.x); }); await gwait(0.3); // (titta mot pölen)
const off = await ev(() => ({ pools: __game.s29.pools().map(p => p.tint), walls: __game.v28g.state().walls }));
ok(off.pools.length && off.pools.every(t => t && t[0] < 200) && off.walls === 0, 'BLOD AV: pölarna är mörk sörja, inget väggblod ' + JSON.stringify(off));
await pg.screenshot({ path: `${OUT}/blod_av.png` });
await ev(() => { __game.settings.blood = 2; });
// 5) statistiken och dödsskärmen
const rows = await ev(() => __game.s29.statRows().map(r => r.label + ' ' + (r.text || '')).join(' | '));
ok(/BLODPAKTER [1-9]/.test(rows) && /BLODFURSTAR FÄLLDA [1-9]/.test(rows), 'statistiken: ' + rows);
await unhold();
await ev(() => { const g = __game; g.P.iframe = 0; g.P.armor = 0; g.P.shield = 0; g.P.hp = 1; g.hurtPlayer(9999); });
await until(() => !document.getElementById('runover').hidden, 6);
const ro = await ev(() => document.getElementById('ro-cause').textContent);
ok(/1 BLODPAKT \(\+10 % SKADA\)/.test(ro) && /1 BLODFURSTE FÄLLD/.test(ro), 'dödsskärmen visar blodpakterna och blodfursten: ' + ro);
await pg.screenshot({ path: `${OUT}/dodsskarm.png` });
// 6) ?v29off=1: inget altare, ingen blodfurste
await start('&v29off=1');
const z = await blood(8); await gwait(0.3);
ok(z.blood && !z.altar && !z.boss, '?v29off=1: blodvåningen som i version 28 ' + JSON.stringify({ blood: z.blood, altar: z.altar, boss: z.boss }));
await done();
