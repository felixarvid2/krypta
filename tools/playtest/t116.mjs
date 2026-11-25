// t116: version 25.1 (FIX251). Kontroller: LOBBAR – R25-granaten mot en spelare bakom en vägg landar före väggen på kastarens sida
// (loggen, ringen och smällen på samma punkt), lobShot (kanonjärens kula/eldkrukan) tar stopp före väggen och spelarens egen granat
// studsar mot väggen i stället för att gå igenom. SMÄLLAR – explode skadar inte spelaren eller fiender bakom en vägg (men gör det
// utan vägg, och även när smällen sitter på själva väggytan), spruckna väggar '{' rasar och krutfat sätter igång kedjereaktioner
// som förut. SKÖLDVAKTER – dödsriddaren 'Ð' ställer sig mellan spelaren och skytten, håller linjen (ingen sköldstöt) och skölden tar
// spelarens skott; den levande rustningen '+' är ingen sköldvakt. RÖSTER – det valda språkets 42 röster laddas (svenska, och
// engelska med &lang=en), ett utrop spelar rösten (rätt röstläge efter fiendetyp) och RÖSTER av ger inga röster medan utropen
// fortsätter. Inga sidfel. Alla väntetider räknas i speltid (__game.roles.t()), inte väggtid.
import { setup } from './head.mjs';
const PORT = 9816;
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/t116');
const load = async (q = '') => { await pg.goto(`http://localhost:${PORT}/index.html?nolock=1${q}`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 }); };
await load();
ok(await ev(() => !!__game.fix251 && __game.settings.voices === true), '__game.fix251 finns och RÖSTER är på som standard');

// scen som i t114: rutnät med väggram, fiender utan skada och utan banans slump, spelaren tål allt och står där testet säger
const sceneFn = o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = true;
  const W = o.W, H = o.H, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  for (const [x, y, c] of o.walls || []) grid[y][x] = c || '1';
  grid[o.p[1]][o.p[0]] = 'P'; grid[1][W - 2] = 'x';
  for (const [t, x, y] of o.en) grid[y][x] = t;
  g.playCustom({ grid, biome: 'dungeon' });
  const E = g.ents(), spec = E.filter(e => !e.boss).map(e => [e.type, e.x, e.y]); E.length = 0;
  for (const [t, x, y] of spec) g.spawnEnemy(t, x, y);
  for (const e of E) { e.d = { ...e.d, dmg: 0 }; if (o.still && o.still.includes(e.type)) e.d = { ...e.d, speed: 0 }; if (o.alert !== false) { e.alert = true; e.lostT = 0; e.lx = g.P.x; e.ly = g.P.y; } }
  g.P.hp = 1e6; clearInterval(window.__hold); const px = g.P.x, py = g.P.y; window.__pin = o.pin !== false ? [px, py] : null;
  window.__hold = setInterval(() => { if (window.__hpHold !== false) __game.P.hp = 1e6; if (window.__pin) { __game.P.x = window.__pin[0]; __game.P.y = window.__pin[1]; } }, 30);
};
const scene = o => pg.evaluate(sceneFn, o);
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);
await ev(`window.__after = (sec, f) => new Promise(res => { const t0 = __game.roles.t(); const k = () => (__game.roles.t() - t0 >= sec ? res(f()) : requestAnimationFrame(k)); requestAnimationFrame(k); });`);

// 1) R25-granaten: spelaren gömmer sig bakom en hel vägg (x = 11); granaten landar före väggen på kastarnas sida
const wall = []; for (let y = 1; y <= 19; y++) wall.push([11, y]);
await scene({ W: 30, H: 21, p: [8, 10], walls: wall, en: [['ĳ', 16, 8], ['Ä', 17, 12], ['ĳ', 17, 10]], still: ['ĳ', 'Ä'] });
await gwait(0.5);
await ev(() => { window.__pin = [8.5, 10.5]; for (const e of __game.ents()) { e.lx = 8.5; e.ly = 10.8; e.lostT = 1; } window.__keep = setInterval(() => { for (const e of __game.ents()) { if (!e.dead && e.lostT > 2) e.lostT = 1.2; } }, 500); });
await until(() => __game.roles.st().nades > 0, 15);
const n1 = await ev(() => ({ st: __game.roles.st(), live: __game.roles.live(), clips: __game.fix251.st().clips }));
const L1 = n1.st.log[0], live1 = n1.live[0];
ok(n1.st.nades >= 1 && L1 && L1.to[0] >= 12.0 && L1.to[0] <= 12.35, `granaten mot spelaren bakom väggen landar före väggen på kastarens sida (x ${L1 && L1.to[0]}, väggen slutar vid x 12) ${JSON.stringify(L1)}`);
ok(live1 && L1 && Math.hypot(live1.tx - L1.to[0], live1.ty - L1.to[1]) < 0.02, 'varningsringen ritas där granaten landar ' + JSON.stringify(live1));
await ev(L => { window.__pin = [10.74, L.to[1]]; }, L1); // tätt bakom väggen: inom granatens radie (1,6) men utan fri sikt
await until(() => __game.roles.st().booms > 0, 5);
const b1 = await ev(() => __game.roles.st());
const B1 = b1.boomLog && b1.boomLog[0];
ok(B1 && L1 && Math.hypot(B1.at[0] - L1.to[0], B1.at[1] - L1.to[1]) < 0.02 && b1.nadeHits === 0 && B1.dP < 1.6, 'smällen kommer där ringen var och träffar inte spelaren tätt bakom väggen (inom radien) ' + JSON.stringify({ B1, hits: b1.nadeHits }));
ok(b1.barks.some(b => b.text === 'GRANAT!' || b.text === 'UT MED DIG!'), 'barken GRANAT! eller UT MED DIG! ' + JSON.stringify(b1.barks.map(b => b.text)));
await ev(() => clearInterval(window.__keep));

// 2) lobShot (kanonjärens kula och eldkrukan) och spelarens egen granat mot en vägg
await scene({ W: 30, H: 21, p: [5, 10], walls: wall, en: [['K', 16, 10]], still: ['K'], alert: false });
const lb = await ev(() => { const g = __game, k = g.ents().find(e => e.type === 'K'), f = g.fix251; const n0 = f.lobs().length;
  f.lobShot(k, 6.5, 10.5, { dmg: 0, r: 1.3, T: 1.3, kind: 'cball' }); f.lobShot(k, 6.5, 13.0, { dmg: 0, r: 1.3, T: 1.2, kind: 'flask', fx: 'fire' }); f.lobShot(k, 14.5, 12.5, { dmg: 0, r: 1.3, T: 1.0, kind: 'cball' });
  return f.lobs().slice(n0).map(l => [+l.tx.toFixed(2), +l.ty.toFixed(2)]); });
ok(lb.length === 3 && lb[0][0] >= 12.0 && lb[0][0] <= 12.35 && lb[1][0] >= 12.0 && lb[1][0] <= 12.35 && Math.abs(lb[2][0] - 14.5) < 0.01 && Math.abs(lb[2][1] - 12.5) < 0.01, 'kanonkulan och eldkrukan tar stopp före väggen; ett kast utan vägg emellan landar på målet ' + JSON.stringify(lb));
await gwait(1.5);
// spelarens granat: stående 1,5 rutor från väggen, full kraft rakt mot den
const pg1 = await ev(() => new Promise(res => { const g = __game; window.__pin = [9.5, 10.5]; g.P.x = 9.5; g.P.y = 10.5; g.P.a = 0; g.P.vx = g.P.vy = 0; g.P.pitch = 0;
  g.fix251.nade(1); const p = g.projectiles().find(q => q.kind === 'pgren'); if (!p) return res(null); let mx = 0, steps = 0;
  const k = () => { if (p.x > mx) mx = p.x; steps++; if (!p.dead && steps < 600) requestAnimationFrame(k); else res({ mx: +mx.toFixed(4), x: +p.x.toFixed(2), dead: !!p.dead }); }; requestAnimationFrame(k); }));
ok(pg1 && pg1.dead && pg1.mx <= 11 && pg1.x < 11, 'spelarens granat studsar mot väggen och smäller på hans sida ' + JSON.stringify(pg1));

// 3) smällen genom en vägg: spelaren och en fiende bakom väggen tar ingen skada, en fiende på samma sida gör det
const smash = async (o) => { await scene({ W: 30, H: 21, p: [8, 10], walls: o.walls, en: [['S', 9, 8], ['S', 12, 11]], still: ['S'], alert: false });
  return ev(o => { const g = __game; window.__hpHold = false; window.__pin = [9.6, 10.5]; g.P.x = 9.6; g.P.y = 10.5; g.P.hp = 100; g.P.armor = 0; g.P.iframe = 0; g.P.shield = 0;
    const es = g.ents(); const back = es.find(e => e.x < 10), front = es.find(e => e.x > 11); back.x = 9.5; back.y = 9.0; front.x = 12.5; front.y = 11.5; back.hp = back.maxHp = 500; front.hp = front.maxHp = 500;
    const hp0 = g.P.hp, b0 = back.hp, f0 = front.hp; g.explode(o.x, 10.5, 40, 3, true); const r = { player: +(hp0 - g.P.hp).toFixed(1), back: +(b0 - back.hp).toFixed(1), front: +(f0 - front.hp).toFixed(1) };
    window.__hpHold = true; g.P.hp = 1e6; return r; }, o); };
const wall2 = []; for (let y = 1; y <= 19; y++) wall2.push([10, y]);
const sW = await smash({ walls: wall2, x: 11.3 }), sF = await smash({ walls: wall2, x: 10.999 }), sI = await smash({ walls: wall2, x: 10.85 }), s0 = await smash({ walls: [], x: 11.3 });
ok(sW.player === 0 && sW.back === 0 && sW.front > 0, 'smällen bakom väggen: spelaren och fienden bakom väggen oskadda, fienden på samma sida skadad ' + JSON.stringify(sW));
ok(sF.player === 0 && sF.back === 0 && sF.front > 0, 'smällen på själva väggytan: samma sak ' + JSON.stringify(sF));
ok(sI.player === 0 && sI.back === 0 && sI.front > 0, 'smällen en bit in i väggen (en projektil som studsat tillbaka för kort): skadar bara på sin sida ' + JSON.stringify(sI));
ok(s0.player > 0 && s0.back > 0 && s0.front > 0, 'utan vägg skadar samma smäll alla tre (kontroll) ' + JSON.stringify(s0));

// 4) spruckna väggar '{' och krutfat fungerar som förut
const crack = await (async () => { await scene({ W: 30, H: 21, p: [5, 10], walls: [[15, 9, '{'], [15, 10, '1'], [15, 11, '1'], [12, 14, 'e']], en: [['S', 14, 16]], still: ['S'], alert: false });
  return ev(() => new Promise(res => { const g = __game, m = g.mapRef(), pr = g.props().find(p => p.ch === 'e'), s = g.ents().find(e => e.type === 'S'); s.hp = s.maxHp = 500; s.x = pr.x + 1.4; s.y = pr.y + 1.0;
    const c0 = m[9][15]; g.explode(13.9, 9.5, 5, 1.4, false); const c1 = m[9][15];
    const h0 = s.hp; g.explode(pr.x - 2.0, pr.y, 1, 2.2, false); const broke = !!pr.broken, h1 = s.hp;
    __after(0.6, () => res({ c0, c1, broke, firstHit: +(h0 - h1).toFixed(1), chain: +(h1 - s.hp).toFixed(1) })); })); })();
ok(crack.c0 === '{' && crack.c1 === '.', 'den spruckna väggen rasar av en smäll intill ' + JSON.stringify(crack));
ok(crack.broke && crack.firstHit === 0 && crack.chain > 0, 'krutfatet sprängs av smällen och skadar fienden intill (kedjereaktion) ' + JSON.stringify(crack));

// 5) sköldvakter: dödsriddaren 'Ð' – på linjen, håller den (ingen sköldstöt), skölden tar spelarens skott
await scene({ W: 30, H: 20, p: [5, 10], en: [['K', 12, 10], ['Ð', 15, 5], ['S', 20, 15]], still: ['K'] });
let gd = null; const tg0 = await gt();
for (;;) { await wait(100); gd = await ev(() => { const g = __game, sh = g.ents().find(e => e.type === 'K'), q = g.ents().find(e => e.type === 'Ð'), r = g.roles.of(q);
  const vx = g.P.x - sh.x, vy = g.P.y - sh.y, L = Math.hypot(vx, vy), along = ((q.x - sh.x) * vx + (q.y - sh.y) * vy) / L, off = Math.abs((q.x - sh.x) * vy - (q.y - sh.y) * vx) / L;
  let rel = Math.atan2(g.P.y - q.y, g.P.x - q.x) - (q.face ?? 99); rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  return { ward: r.ward === sh, along: +along.toFixed(2), off: +off.toFixed(2), face: +Math.abs(rel).toFixed(2), dP: +Math.hypot(q.x - g.P.x, q.y - g.P.y).toFixed(2) }; });
  if ((gd.ward && gd.along > 0.5 && gd.along < 1.7 && gd.off < 0.35 && gd.face < 0.5) || (await gt()) - tg0 > 14) break; }
ok(gd.ward && gd.along > 0.5 && gd.along < 1.7 && gd.off < 0.35 && gd.face < 0.5, 'dödsriddaren ställer sig mellan spelaren och skytten med skölden mot spelaren ' + JSON.stringify(gd));
// spelaren står inom sköldstötens räckvidd (2,6–6 rutor): riddaren håller linjen i 4 s i stället för att rusa
const hold = await ev(() => new Promise(res => { const g = __game, sh = g.ents().find(e => e.type === 'K'), q = g.ents().find(e => e.type === 'Ð'); let charge = 0, maxOff = 0, minD = 99, fr = 0;
  const t0 = g.roles.t(); const k = () => { fr++; if (q.charge > 0) charge++; const vx = g.P.x - sh.x, vy = g.P.y - sh.y, L = Math.hypot(vx, vy), off = Math.abs((q.x - sh.x) * vy - (q.y - sh.y) * vx) / L; if (off > maxOff) maxOff = off; const d = Math.hypot(q.x - g.P.x, q.y - g.P.y); if (d < minD) minD = d;
    if (g.roles.t() - t0 < 4) requestAnimationFrame(k); else res({ charge, maxOff: +maxOff.toFixed(2), minD: +minD.toFixed(2), fr, ward: g.roles.of(q).ward === sh }); }; requestAnimationFrame(k); }));
ok(hold.charge === 0 && hold.ward && hold.maxOff < 0.5 && hold.minD > 2.6, 'dödsriddaren håller linjen inom sköldstötens räckvidd (ingen rusning) ' + JSON.stringify(hold));
const blk = await ev(() => new Promise(res => { const g = __game, sh = g.ents().find(e => e.type === 'K'), q = g.ents().find(e => e.type === 'Ð'), hp0 = sh.hp, qh0 = q.hp;
  g.P.a = Math.atan2(sh.y - g.P.y, sh.x - g.P.x); g.P.pitch = 0; g.fire(); setTimeout(() => res({ shooter: hp0 - sh.hp, guard: qh0 - q.hp }), 300); }));
ok(blk.shooter === 0 && blk.guard === 0, 'dödsriddarens sköld tar spelarens skott mot skytten ' + JSON.stringify(blk));
// den levande rustningen '+' blir ingen sköldvakt
await scene({ W: 30, H: 20, p: [5, 10], en: [['K', 12, 10], ['+', 15, 5], ['S', 20, 15]], still: ['K'] });
await ev(() => { const q = __game.ents().find(e => e.type === '+'); q.dormant = false; q.alert = true; });
await gwait(3);
const pl = await ev(() => { const g = __game, q = g.ents().find(e => e.type === '+'); return { def: g.roles.def['+'] || null, ward: !!g.roles.of(q).ward, guards: g.roles.st().guards }; });
ok(!pl.def && !pl.ward && pl.guards === 0, 'den levande rustningen har ingen sköld framifrån och är ingen sköldvakt ' + JSON.stringify(pl));

// 6) röster: det svenska setet laddas; befälhavarens FRAMÅT! spelar den djupa rösten; kultisten väser; RÖSTER av: bara morrandet
await until(() => __game.fix251.st().vloaded >= 42, 20);
const vl = await ev(() => ({ n: __game.fix251.st().vloaded, lang: __game.fix251.lang(), names: __game.fix251.voiced() }));
ok(vl.n === 42 && vl.lang === 'sv' && vl.names.length === 42 && vl.names.every(n => n.endsWith('_sv')), `de 42 svenska rösterna laddas (bara det valda språket): ${vl.n} ${vl.lang}`);
const cmdScene = { W: 32, H: 22, p: [5, 11], en: [['W', 18, 11], ['S', 16, 9], ['S', 16, 13], ['K', 19, 9]], still: ['W', 'S', 'K'] }; // bara orkkrigaren talar
await ev(() => __game.fix251.resetV()); const vp0 = await ev(() => __game.fix251.st().vplays);
await scene(cmdScene);
await until(() => __game.roles.st().barks.some(b => b.text === 'FRAMÅT!'), 8); await gwait(0.2);
const v1 = await ev(() => ({ plays: __game.fix251.st().vplays, log: __game.fix251.st().vlog.slice(-4), barks: __game.roles.st().barks.map(b => b.text) }));
ok(v1.plays > vp0 && v1.log.some(l => l.n === 'vo_forward_deep_sv' && l.type === 'W'), 'befälhavarens FRAMÅT! spelar den djupa svenska rösten ' + JSON.stringify(v1));
const v2 = await ev(() => { const g = __game, c = g.spawnEnemy('Ä', 10.5, 11.5); c.d = { ...c.d, dmg: 0, speed: 0 }; g.fix251.resetV(); const r = g.fix251.voice(c, 'FLANKERA!'); const r2 = g.fix251.voice(c, 'MAN NERE!'); return { r, r2, last: g.fix251.st().vlog.slice(-1)[0], skip: g.fix251.st().vskip }; });
ok(v2.r && v2.last.n === 'vo_flank_hiss_sv' && !v2.r2 && v2.skip >= 1, 'kultisten väser; två röster i rad inom 0,8 s: den andra spelas inte (spärren) ' + JSON.stringify(v2));
await ev(() => { __game.settings.voices = false; __game.fix251.resetV(); });
const vp1 = await ev(() => __game.fix251.st().vplays);
await scene(cmdScene);
await until(() => __game.roles.st().barks.some(b => b.text === 'FRAMÅT!'), 8); await gwait(0.2);
const v3 = await ev(() => ({ plays: __game.fix251.st().vplays, barks: __game.roles.st().barks.map(b => b.text), direct: __game.fix251.voice(__game.ents().find(e => e.type === 'W'), 'FRAMÅT!') }));
ok(v3.plays === vp1 && v3.barks.includes('FRAMÅT!') && v3.direct === false, 'RÖSTER av: utropen fortsätter (texten), men ingen röst spelas ' + JSON.stringify(v3));
await ev(() => { __game.settings.voices = true; clearInterval(window.__hold); });
ok(await ev(() => !__game.roles.err() && !__game.ai.err()), 'inga fel i R25 eller AI24');

// inställningen RÖSTER finns under fliken LJUD och är ikryssad
await ev(() => __game.showTitle()); await pg.click('#settingsbtn'); await wait(300);
const row = await ev(() => { const t = [...document.querySelectorAll('.cu-tab')].find(b => b.textContent.trim() === 'LJUD'); if (t) t.click();
  const r = [...document.querySelectorAll('label.cu-row')].find(l => l.textContent.trim() === 'RÖSTER (FIENDERNAS UTROP)'), inp = r && r.querySelector('input[type=checkbox]');
  return { tab: !!t, found: !!r, shown: !!r && r.offsetParent !== null, checked: inp ? inp.checked : null }; });
ok(row.tab && row.found && row.shown && row.checked === true, 'inställningen RÖSTER (FIENDERNAS UTROP) syns under LJUD och är på ' + JSON.stringify(row));
await pg.keyboard.press('Escape'); await wait(200);

// 7) engelska: det engelska setet laddas och inställningen har en engelsk text
await load('&lang=en');
await ev(sceneFn, cmdScene);
await until(() => __game.fix251.st().vloaded >= 42, 20);
const ve = await ev(() => ({ n: __game.fix251.st().vloaded, lang: __game.fix251.lang(), names: __game.fix251.voiced(), t: I18N.t('RÖSTER (FIENDERNAS UTROP)') }));
ok(ve.n === 42 && ve.lang === 'en' && ve.names.every(n => n.endsWith('_en')), `med &lang=en laddas de 42 engelska rösterna: ${ve.n} ${ve.lang}`);
console.log('     inställningen på engelska (js/i18n_en.js byggs om av huvudagenten): ' + ve.t);
await ev(() => clearInterval(window.__hold));
await done();
