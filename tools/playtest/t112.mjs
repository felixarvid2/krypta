// t112: fiende-AI version 24 (F.E.A.R.-anda + DOOM:s attackpoletter). Kontroller: inställningen SMART FIENDE-AI finns (på som
// standard); polettgränsen håller i en stor grupp (räknat oberoende: fiender i 'attack' per bildruta) och ingen står längre än
// vakthunden tillåter; en ensam fiende anfaller lika snabbt som med AI:n av; skyttar (opt-in) går i skydd, gömmer sig bakom
// skyddet och kliver ut och skjuter; en flankerare tar en annan väg än den direkta; truppen söker vid den senast kända platsen
// (inte där spelaren faktiskt är); spelaren som campar bakom skydd får en eldkruka eller flankerare; omladdning får
// närstridare att rusa; barks syns (svenska och engelska); inbördes strid och egna ENEMY_AI fungerar; prestanda; inga sidfel.
import { setup } from './head.mjs';
const PORT = 9812;
const { pg, ev, wait, ok, done, gwait } = await setup(PORT, 'out/t112');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
ok(await ev(() => !!__game.ai && __game.settings.smartAI === true), 'settings.smartAI är på som standard och __game.ai finns');
// inställningsraden under SPEL
await pg.click('#settingsbtn'); await gwait(0.3);
const row = await ev(() => [...document.querySelectorAll('#cardui .cu-row')].filter(r => /SMART FIENDE-AI|SMART ENEMY AI/.test(r.textContent)).map(r => r.dataset.tab));
ok(row.length === 1 && row[0] === 'SPEL', 'raden SMART FIENDE-AI ligger under SPEL ' + JSON.stringify(row));
await pg.click('#cardui button:has-text("STÄNG")'); await gwait(0.3);

// scen: rutnät med väggram, pelare och fiender; spelaren tål allt (fiendernas skada 0) och står där testet säger
const scene = (o) => ev(o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false;
  const W = o.W, H = o.H, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  for (const [x, y] of o.walls || []) grid[y][x] = '1';
  grid[o.p[1]][o.p[0]] = 'P'; grid[1][W - 2] = 'x';
  for (const [t, x, y] of o.en) grid[y][x] = t;
  g.playCustom({ grid, biome: 'dungeon' });
  for (const e of g.ents()) { e.d = { ...e.d, dmg: 0 }; if (o.alert !== false) { e.alert = true; e.lostT = 0; e.lx = g.P.x; e.ly = g.P.y; } }
  g.P.hp = 1e6; clearInterval(window.__hold); const px = g.P.x, py = g.P.y; window.__pin = o.pin !== false ? [px, py] : null;
  window.__hold = setInterval(() => { __game.P.hp = 1e6; if (window.__pin) { __game.P.x = window.__pin[0]; __game.P.y = window.__pin[1]; } }, 30);
}, o);
// sampling i sidan varje bildruta
// version 29: väntetiden inom räckhåll räknas i speltid (__game.v27b.t()), inte med performance.now – på en belastad maskin kapas dt och
// fienderna hinner mindre per väggsekund, så väggtiden mätte maskinen och inte vakthunden
const sampleStart = () => ev(() => { window.__S = { f: 0, mAtk: [], att: new Map(), gap: new Map(), lastT: __game.v27b.t() }; const S = window.__S;
  const tick = () => { if (window.__S !== S) return; const now = __game.v27b.t(), dt = now - S.lastT; S.lastT = now; S.f++; let m = 0;
    for (const e of __game.ents()) { if (e.dead || e.boss) continue; const atk = e.state === 'attack'; if (atk && e.d.melee) m++;
      const prev = S.att.get(e) || { n: 0, was: false, since: 0, worst: 0 }; if (atk && !prev.was) prev.n++; prev.was = atk;
      const near = Math.hypot(e.x - __game.P.x, e.y - __game.P.y) < e.d.range + 0.2; if (atk || !near) prev.since = 0; else { prev.since += dt; prev.worst = Math.max(prev.worst, prev.since); } S.att.set(e, prev); }
    S.mAtk.push(m); requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
const sampleEnd = () => ev(() => { const S = window.__S; window.__S = null; const a = S.mAtk.slice().sort((x, y) => x - y); const q = p => a[Math.min(a.length - 1, Math.floor(a.length * p))];
  let worst = 0, never = 0, nearN = 0; const nv = []; for (const [e, v] of S.att) { worst = Math.max(worst, v.worst); if (!e.dead && Math.hypot(e.x - __game.P.x, e.y - __game.P.y) < 3) { nearN++; if (v.n === 0) { never++; nv.push([e.type, +Math.hypot(e.x - __game.P.x, e.y - __game.P.y).toFixed(2), e.state, (__game.ai.of(e) || {}).role || '', e.d.range]); } } }
  return { nv, frames: S.f, mean: a.reduce((s, v) => s + v, 0) / Math.max(1, a.length), p95: q(0.95), max: a[a.length - 1] || 0, worst, never, nearN }; });

// 1) stor grupp närstridare + skyttar: polettgränsen
const ring = (n, r0, r1, cx, cy, types) => { const out = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, r = r0 + (i % 3) * (r1 - r0) / 2; out.push([types[i % types.length], Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r)]); } return out; };
const big = { W: 36, H: 28, p: [18, 14], en: [...ring(18, 3, 6, 18, 14, ['S', 'V', 'S']), ...ring(6, 8, 9, 18, 14, ['K'])] };
const N = await ev(() => __game.ai.limit(true)), NR = await ev(() => __game.ai.limit(false));
await ev(() => { __game.settings.smartAI = false; }); await scene(big); await gwait(1.5); await sampleStart(); await gwait(7); const off = await sampleEnd();
await ev(() => { __game.settings.smartAI = true; }); await scene(big); await gwait(1.5); await sampleStart(); await gwait(9); const on = await sampleEnd();
const st1 = await ev(() => __game.ai.st());
ok(st1.maxM <= N && st1.maxR <= NR, `poletterna: högst ${N} närstridare och ${NR} skyttar anfaller samtidigt utan vakthunden (max ${st1.maxM}/${st1.maxR}; beviljade ${st1.granted}, tvingade ${st1.forced})`);
ok(on.mean < off.mean * 0.8 && on.p95 <= N + 3, `räknat oberoende: färre närstridare anfaller samtidigt (på ${on.mean.toFixed(2)} p95 ${on.p95} max ${on.max}, av ${off.mean.toFixed(2)} p95 ${off.p95} max ${off.max})`);
ok(on.worst < 4.7, `vakthunden: ingen står inom räckhåll längre än ~4,2 s utan att anfalla (värst ${on.worst.toFixed(2)} s; vakthund ${st1.watchdog} ggr)`);
console.log(`     (stor grupp: ${on.nearN - on.never}/${on.nearN} nära spelaren anföll på 9 s med AI24, ${off.nearN - off.never}/${off.nearN} utan – trängseln avgör)`);
ok(await ev(() => __game.ents().filter(e => !e.dead && e.alert && !e.d.melee).some(e => __game.ai.of(e).role === 'suppress')), 'truppkoordinatorn: skyttar som ser spelaren får rollen UNDERTRYCK');
await pg.locator('#screen').screenshot({ path: 'out/t112/stor_grupp.png' });

// turordning i en mindre grupp: alla får anfalla (den som väntat längst går först)
await scene({ W: 24, H: 20, p: [12, 10], en: ring(6, 2, 3, 12, 10, ['S', 'V']) }); await sampleStart(); await gwait(10); const fair = await sampleEnd();
ok(fair.never === 0 && fair.nearN >= 5, `turordning: alla ${fair.nearN} närstridare nära spelaren anföll inom 10 s (max samtidigt ${fair.max}, värst väntan inom räckhåll ${fair.worst.toFixed(2)} s)` + (fair.never ? ' aldrig: ' + JSON.stringify(fair.nv) : ''));
// 2) en ensam fiende anfaller lika snabbt som förut (tester och KLOCKAN väntar på anfall)
const first = async smart => { await ev(s => { __game.settings.smartAI = s; }, smart); await scene({ W: 16, H: 12, p: [4, 6], en: [['S', 7, 6]] });
  return ev(() => new Promise(res => { const g = __game, t0 = g.v27b.t(), e = g.ents().find(o => o.type === 'S'); const f = () => { if (e.state === 'attack') return res(g.v27b.t() - t0); if (g.v27b.t() - t0 > 8) return res(99); requestAnimationFrame(f); }; f(); })); }; // version 29: speltid
const tOff = await first(false), tOn = await first(true);
ok(tOn < 3 && Math.abs(tOn - tOff) < 0.5, `ensam fiende: första anfallet efter ${tOn.toFixed(2)} s med AI24, ${tOff.toFixed(2)} s utan`);
// minions (arenavågor) och eliter: får poletter, inga roller, och väntar aldrig längre än vakthunden
await scene({ W: 30, H: 24, p: [15, 12], en: ring(10, 2, 4, 15, 12, ['S', 'V']) });
await ev(() => { for (const e of __game.ents()) e.minion = true; }); await gwait(0.7); await sampleStart(); await gwait(7); const mi = await sampleEnd();
ok(mi.worst < 4.7 && await ev(() => __game.ents().every(e => !__game.ai.of(e).role && !__game.ai.of(e).tac)), `minions: inga roller, längsta väntan inom räckhåll ${mi.worst.toFixed(2)} s`);

// 3) skydd: skyttar (opt-in) går bakom pelare, gömmer sig och kliver ut och skjuter
const pillars = []; for (let y = 3; y < 21; y += 4) for (let x = 9; x < 30; x += 3) pillars.push([x, y]);
await ev(() => { __game.settings.smartAI = true; });
await scene({ W: 34, H: 24, p: [5, 12], walls: pillars, en: [['K', 14, 6], ['K', 14, 13], ['K', 14, 18], ['Ä', 16, 10]] });
let hidden = null; for (let i = 0; i < 24 && !hidden; i++) { await gwait(0.5); hidden = await ev(() => { const g = __game; for (const e of g.ents()) { const s = g.ai.of(e); if (!e.dead && s.cs === 'hide' && s.cov && Math.hypot(e.x - s.cov[0] - 0.5, e.y - s.cov[1] - 0.5) < 0.3) return { type: e.type, cov: s.cov, seen: g.ai.los(s.cov[0] + 0.5, s.cov[1] + 0.5, g.P.x, g.P.y), peek: g.ai.los(s.cov[2] + 0.5, s.cov[3] + 0.5, g.P.x, g.P.y) }; } return null; }); }
ok(hidden && !hidden.seen && hidden.peek, 'en skytt står i skydd: skymd från spelaren, men med skottlinje efter ett sidosteg ' + JSON.stringify(hidden));
await pg.locator('#screen').screenshot({ path: 'out/t112/skydd.png' });
for (let i = 0; i < 16 && (await ev(() => __game.ai.st().peeks)) < 1; i++) await gwait(0.5);
const st3 = await ev(() => __game.ai.st());
ok(st3.cover > 20 && st3.coverUse >= 1 && st3.peeks >= 1, `skyddspunkter ${st3.cover}, använda ${st3.coverUse}, kliv ut och skjut ${st3.peeks}; siktkontroller ${st3.losUsed} (uppskjutna ${st3.losDeferred})`);

// 4) flank: en närstridare tar en annan väg än den raka mot spelaren
await scene({ W: 34, H: 24, p: [6, 12], walls: [[14, 9], [14, 15], [20, 6], [20, 18]], en: [['S', 22, 11], ['S', 23, 13], ['S', 24, 12], ['V', 22, 13], ['K', 26, 12]] });
for (let i = 0; i < 20 && (await ev(() => __game.ai.st().flankPath.length)) < 12; i++) await gwait(0.4);
const fl = await ev(() => { const s = __game.ai.st(); return { n: s.flanks, info: s.flankInfo, path: s.flankPath }; });
const dev = (() => { if (!fl.info || fl.path.length < 2) return 0; const [ax, ay] = fl.info.from, [bx, by] = fl.info.player, vx = bx - ax, vy = by - ay, L = Math.hypot(vx, vy) || 1; return Math.max(...fl.path.map(([x, y]) => Math.abs((x - ax) * vy - (y - ay) * vx) / L)); })();
ok(fl.n >= 1 && fl.info && fl.info.alt && dev > 1.5, `flankeraren (${fl.info && fl.info.type}) går runt: största avvikelse från den raka vägen ${dev.toFixed(2)} rutor, ${fl.path.length} punkter`);

// 5) sök: spelaren försvinner – truppen letar där han senast syntes, inte där han är
const corr = []; for (let y = 1; y < 23; y++) { if (y < 9 || y > 13) corr.push([20, y]); } for (let x = 21; x < 33; x++) corr.push([x, 4]);
await scene({ W: 34, H: 24, p: [12, 11], walls: corr, en: [['S', 6, 4], ['Ä', 5, 18], ['ĳ', 4, 11], ['S', 3, 6]] });
await gwait(0.7);
const lk = await ev(() => { const g = __game; window.__pin = [27.5, 2.5]; g.P.x = 27.5; g.P.y = 2.5; return [12.5, 11.5]; }); // in i rummet bakom väggen, via gången i öster
const d0 = await ev(lk => { const es = __game.ents().filter(e => !e.dead); return es.reduce((s, e) => s + Math.hypot(e.x - lk[0], e.y - lk[1]), 0) / es.length; }, lk);
for (let i = 0; i < 14 && !(await ev(() => (__game.ai.roles().search || 0) > 0)); i++) await gwait(0.3);
await gwait(2.6);
const se = await ev(lk => { const g = __game, es = g.ents().filter(e => !e.dead); return { roles: g.ai.roles(), n: g.ai.st().searches, dLk: es.reduce((s, e) => s + Math.hypot(e.x - lk[0], e.y - lk[1]), 0) / es.length, dP: es.reduce((s, e) => s + Math.hypot(e.x - g.P.x, e.y - g.P.y), 0) / es.length, barks: g.ai.st().barks.map(b => b.text) }; }, lk);
ok(se.n >= 1 && (se.roles.search || 0) >= 2, 'truppen får rollen SÖK när ingen ser spelaren ' + JSON.stringify(se.roles));
ok(se.dLk < d0 - 2 && se.dLk < se.dP - 8, `de letar vid den senast kända platsen (avstånd dit ${d0.toFixed(1)} → ${se.dLk.toFixed(1)}; till den riktiga spelaren ${se.dP.toFixed(1)})`);
ok(se.barks.includes('VAR ÄR HAN?'), 'barken VAR ÄR HAN? ' + JSON.stringify(se.barks));
await pg.locator('#screen').screenshot({ path: 'out/t112/sok.png' });

// 6) campa bakom skydd: eldkruka (eller flankerare) efter ~4 s
await scene({ W: 30, H: 20, p: [8, 10], walls: [[10, 9], [10, 10], [10, 11]], en: [['K', 16, 8], ['K', 17, 12], ['Ä', 17, 10]] });
await ev(() => { for (const e of __game.ents()) e.d = { ...e.d, speed: 0 }; }); await gwait(0.6);
await ev(() => { window.__pin = [8.5, 10.5]; for (const e of __game.ents()) { e.lx = 8.5; e.ly = 10.5; } });
for (let i = 0; i < 20 && !(await ev(() => __game.ai.st().press)); i++) await gwait(0.4);
const pr = await ev(() => ({ press: __game.ai.st().press, flush: __game.ai.st().flush, flanks: __game.ai.st().flanks, still: __game.ai.still() }));
ok(pr.press >= 1 && (pr.flush >= 1 || pr.flanks >= 1), 'spelaren som campar bakom skydd får en eldkruka eller flankerare ' + JSON.stringify(pr));

// 7) omladdning: närstridare som ser spelaren rusar fram
await scene({ W: 24, H: 16, p: [5, 8], en: [['S', 10, 6], ['ĳ', 11, 9], ['V', 10, 11]] });
await gwait(2); await ev(() => { const g = __game; g.WS.state = 'reload'; g.WS.t = 0; }); await gwait(0.25);
const ru = await ev(() => ({ dbg: __game.ents().filter(e => !e.dead).map(e => [e.type, +(e.lostT || 0).toFixed(1), +Math.hypot(e.x - __game.P.x, e.y - __game.P.y).toFixed(1), e.alert]), ws: __game.WS.state, rush: __game.ai.st().rush, haste: __game.ents().filter(e => !e.dead && e.haste > 0).length, barks: __game.ai.st().barks.map(b => b.text) }));
ok(ru.rush >= 1 && ru.haste >= 2 && ru.barks.includes('HAN LADDAR OM!'), 'omladdningen: närstridarna rusar fram och ropar HAN LADDAR OM! ' + JSON.stringify(ru));

// 8) inbördes strid och egna ENEMY_AI fortsätter att fungera med AI24 på
await scene({ W: 24, H: 16, p: [3, 8], en: [['S', 12, 7], ['V', 13, 9], ['Ő', 18, 8]] });
await gwait(0.4);
const feud = await ev(() => { const g = __game, [a, b] = g.ents().filter(e => e.type === 'S' || e.type === 'V'); a.feud = b; a.feudT = 1e9; a.d = { ...a.d, dmg: 9 }; b.feud = null; b.d = { ...b.d, speed: 0 }; const hp0 = b.hp, t0 = g.v27b.t(); return new Promise(r => { const k = () => (g.v27b.t() - t0 >= 2.5 ? r({ hp0, hp: b.hp, dead: b.dead }) : requestAnimationFrame(k)); k(); }); }); // version 29: 2,5 s speltid
ok(feud.dead || feud.hp < feud.hp0, 'inbördes strid: fienden ger igen mot en annan fiende ' + JSON.stringify(feud));
await gwait(4);
const xb = await ev(() => { const e = __game.ents().find(o => o.type === 'Ő'); return { boltT: e.boltT, alive: !e.dead, shots: __game.ai.of(e).shots }; });
ok(xb.alive && xb.shots >= 1, 'armborstskytten (egen ENEMY_AI) skjuter fortfarande sina bultar ' + JSON.stringify(xb));

// trupp instängd bakom väggar (som bakom en låst dörr): inga upprepade avståndsfält varje halvsekund
const box = []; for (let x = 18; x <= 26; x++) { box.push([x, 4], [x, 12]); } for (let y = 5; y < 12; y++) { box.push([18, y], [26, y]); }
await scene({ W: 30, H: 20, p: [5, 10], walls: box, en: [['S', 20, 6], ['S', 22, 8], ['V', 24, 10], ['S', 21, 10], ['ĳ', 23, 6]] });
await gwait(5);
const boxed = await ev(() => ({ fields: __game.ai.st().fields, flanks: __game.ai.st().flanks, err: __game.ai.err() }));
ok(boxed.fields <= 12 && !boxed.err, 'instängd trupp: avståndsfälten är begränsade (högst två per bildruta, nytt försök efter 3 s) ' + JSON.stringify(boxed));
// 9) barks på engelska, AI24 av och prestanda
const barks = ['FLANKERA!', 'HAN LADDAR OM!', 'VAR ÄR HAN?', 'TÄCK MIG!', 'I SKYDD!', 'UT MED DIG!', 'MAN NERE!', 'DÄR ÄR HAN!', 'SMART FIENDE-AI (SKYDD, TRUPP, ATTACKTURER)'];
await scene({ W: 44, H: 30, p: [22, 15], walls: pillars, en: ring(36, 4, 11, 22, 15, ['S', 'V', 'K', 'S', 'K', 'Ä', 'Ő', 'ĳ']) });
await gwait(0.8);
// version 29: väggklockans mätning jämför det snabbaste av nio omväxlande körningar per läge (förut medianen av fyra). När andra processer
// delar processorn kan varje körning bara bli långsammare, aldrig snabbare: i en sond under last gav samma scen 0,19–2,8 ms med AI24 och
// 0,11–2,2 ms utan, så medianen av fyra föll slumpvis. Det snabbaste provet är kostnaden utan störningar; gränsen är densamma som förut.
await ev(() => __game.pause()); const bs = { on: [], off: [] }; for (let i = 0; i < 10; i++) for (const sm of [false, true]) bs[sm ? 'on' : 'off'].push(await ev(s => __game.ai.bench(120, s), sm)); await ev(() => __game.resume());
const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1], offMs = Math.min(...bs.off.slice(1)), onMs = Math.min(...bs.on.slice(1));
ok(onMs < Math.max(offMs * 1.6, offMs + 0.25), `prestanda (36 alerterade, utan strypning): fiendeloopen ${onMs.toFixed(3)} ms med AI24, ${offMs.toFixed(3)} ms utan (snabbaste av 9; median ${med(bs.on.slice(1)).toFixed(3)}/${med(bs.off.slice(1)).toFixed(3)})`);
const bad = await ev(() => ({ err: __game.ai.err(), fail: __game.ents().filter(e => e.renderFail > 0).length }));
ok(!bad.err && bad.fail === 0, 'inga fel i AI24 och ingen fiende har kastat fel (renderFail) ' + JSON.stringify(bad));
await ev(() => { __game.settings.smartAI = false; }); ok(await ev(() => __game.ai.on() === false), 'SMART FIENDE-AI av stänger av lagret'); await ev(() => { __game.settings.smartAI = true; clearInterval(window.__hold); });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&lang=en`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const en = await ev(b => b.map(s => [s, I18N.t(s)]), barks);
ok(en.every(([s, t]) => t && t !== s), 'barks och inställningen finns på engelska ' + JSON.stringify(en.map(p => p[1])));
await done();
