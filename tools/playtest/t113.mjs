// t113: version 24, bandesign. En frostbana (seed t113-99, djup 2) med en enkelriktad genväg, ett bakhåll vid nyckeln, ett landmärke och
// brödsmulor: den enkelriktade dörren går inte att öppna (E, gå in i den, sparka, en fiende) från den sida man når först, avståndsfältet går
// inte genom den medan den är stängd, och den öppnas från den bortre sidan (sedan går fältet igenom); bakhållets fiender finns inte från början
// och skapas när nyckeln tas (totalEnemies räknas upp, nischen blir golv, texten BAKHÅLL!); landmärket lyser; brödsmulorna ligger på kartan;
// ledtrådar vid en hemlig vägg (damm och ljus) på en annan bana; en bana med opts.v24off och en egen bana fungerar; inga sidfel.
import { setup } from './head.mjs';
const PORT = 9813;
const { pg, ev, wait, ok, start, done } = await setup(PORT, 'out/t113');
await start();
const load = (seed, depth, biome, extra) => ev(([s, d, b, x]) => { const g = __game; g.startLevel(Gen.floor(s, d, Object.assign({ biome: b }, x || {}))); g.resume && g.resume(); }, [seed, depth, biome, extra]);
const calm = () => ev(() => { const g = __game; for (const e of g.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } g.P.hp = 9999; });
await load('t113-99', 2, 'frost'); await wait(600); await calm();
ok(await ev(() => __game.state()) === 'play', 'banan startar');
const L = await ev(() => { const l = __game.lvl(); return { sc: l.shortcuts, amb: l.ambushes, lm: l.landmarks, bc: l.breadcrumbs }; });
const ow = L.sc.find(s => s.oneway);
ok(!!ow && L.amb.length === 1 && L.amb[0].trigger.kind === 'key' && L.lm.length === 1 && L.bc.length >= 1, 'banan har en enkelriktad genväg, ett bakhåll vid nyckeln, ett landmärke och brödsmulor ' + JSON.stringify({ ow, amb: L.amb.length, lm: L.lm.length, bc: L.bc.length }));
const st = await ev(() => { const v = __game.v24(); return { sc: v.state.shortcuts.length, ow: v.state.shortcuts.filter(s => s.oneway).length, amb: v.state.ambushes.length, flag: !!(__game.doors()[`${v.state.shortcuts.find(s => s.oneway).x},${v.state.shortcuts.find(s => s.oneway).y}`] || {}).oneway }; });
ok(st.ow === 1 && st.amb === 1 && st.flag, 'spelet läser genvägarna och bakhållet; dörren har d.oneway ' + JSON.stringify(st));
// avståndsfältet: spelaren på den närmare sidan, dörren stängd -> fältet går inte genom dörren
const at = (x, y, a) => ev(([x, y, a]) => { const P = __game.P; P.x = x + 0.5; P.y = y + 0.5; P.a = a; P.vx = 0; P.vy = 0; }, [x, y, a]);
const ang = (fx, fy, tx, ty) => Math.atan2(ty - fy, tx - fx);
await at(ow.nx, ow.ny, ang(ow.nx, ow.ny, ow.x, ow.y)); await wait(150);
const f1 = await ev(([d, s]) => { const v = __game.v24(); return { door: v.flowAt(d.x, d.y), walk: v.walk(d.x, d.y), far: v.flowAt(s.sx, s.sy), near: v.flowAt(s.nx, s.ny) }; }, [{ x: ow.x, y: ow.y }, ow]);
ok(f1.door < 0 && !f1.walk && f1.near >= 0 && f1.far > f1.near + 2, 'fienderna går inte genom den stängda enkelriktade dörren (avståndsfältet går runt) ' + JSON.stringify(f1));
// E från fel sida
const door = () => ev(s => { const d = __game.doors()[s.x + ',' + s.y]; return { target: d.target, open: +d.open.toFixed(2), oneway: !!d.oneway }; }, ow);
await ev(() => __game.useKey()); await wait(400);
const d1 = await door(), m1 = await ev(() => __game.msgs().map(m => m.text).join(' | '));
ok(d1.target === 0 && d1.open === 0 && d1.oneway, 'E från den närmare sidan: dörren förblir stängd ' + JSON.stringify(d1));
ok(/ÖPPNAS FRÅN ANDRA SIDAN|OPENS FROM THE OTHER SIDE/.test(m1), 'texten ÖPPNAS FRÅN ANDRA SIDAN visas: ' + m1);
// gå in i den från fel sida
await ev(s => { const P = __game.P, dx = s.x - s.nx, dy = s.y - s.ny; P.vx = dx * 3; P.vy = dy * 3; }, ow); await wait(60);
ok((await door()).target === 0, 'att gå in i den från fel sida öppnar den inte');
// sparka från fel sida
await at(ow.nx, ow.ny, ang(ow.nx, ow.ny, ow.x, ow.y)); await ev(() => { __game.P.kickT = 0; __game.v24().kick(); }); await wait(300);
ok((await door()).target === 0 && (await door()).open < 0.5, 'en spark från fel sida öppnar den inte ' + JSON.stringify(await door()));
// en fiende (eller annan kod) som sätter target = 1 medan dörren är enkelriktad: den förblir stängd
await ev(s => { __game.doors()[s.x + ',' + s.y].target = 1; }, ow); await wait(200);
ok((await door()).target === 0, 'om något annat försöker öppna den stängs den igen');
await pg.screenshot({ path: 'out/t113/enkelriktad_fel_sida.png' });
// från den bortre sidan: E öppnar
await at(ow.sx, ow.sy, ang(ow.sx, ow.sy, ow.x, ow.y)); await wait(150);
await ev(() => __game.useKey()); await wait(900);
const d2 = await door(), m2 = await ev(() => __game.msgs().map(m => m.text).join(' | '));
ok(d2.target === 1 && d2.open > 0.85 && !d2.oneway, 'E från den bortre sidan öppnar genvägen ' + JSON.stringify(d2));
ok(/GENVÄG ÖPPNAD|SHORTCUT OPENED/.test(m2), 'texten GENVÄG ÖPPNAD visas: ' + m2);
const f2 = await ev(d => __game.v24().flowAt(d.x, d.y), { x: ow.x, y: ow.y });
ok(f2 >= 0 && await ev(d => __game.v24().walk(d.x, d.y), { x: ow.x, y: ow.y }), 'när den är öppen går avståndsfältet genom dörren ' + f2);
// bakhållet vid nyckeln
const a = L.amb[0];
const b0 = await ev(a => { const v = __game.v24(); return { total: v.total(), ents: __game.ents().length, amb: __game.ents().filter(e => e.v24amb).length, cells: a.cells.map(c => v.cell(c.x, c.y)) }; }, a);
ok(b0.amb === 0 && b0.cells.every(c => c !== '.'), 'bakhållets fiender finns inte från början och nischen är vägg ' + JSON.stringify(b0));
await at(a.from.x, a.from.y, 0); await wait(200);
ok(await ev(() => __game.v24().state.fired) === 0, 'bakhållet utlöses inte innan nyckeln tas');
await at(a.trigger.x, a.trigger.y, 0); await wait(700);
const b1 = await ev(a => { const v = __game.v24(); return { total: v.total(), ents: __game.ents().length, amb: __game.ents().filter(e => e.v24amb && !e.dead).map(e => [e.type, e.alert, +e.x.toFixed(1), +e.y.toFixed(1)]), cells: a.cells.map(c => v.cell(c.x, c.y)), fired: v.state.fired, keys: __game.P.keys, msg: __game.msgs().map(m => m.text).join(' | ') + ' / ' + v.state.lastMsg }; }, a);
ok(b1.fired === 1 && b1.amb.length === a.enemies.length && b1.amb.every(e => e[1]), 'nyckeln tas: bakhållets fiender skapas, alerterade ' + JSON.stringify(b1.amb));
ok(b1.total === b0.total + a.enemies.length, 'totalEnemies räknas upp med bakhållets fiender ' + b0.total + ' -> ' + b1.total);
ok(b1.cells.every(c => c === '.'), 'nischen är öppen (golv) ' + JSON.stringify(b1.cells));
ok(/BAKHÅLL|AMBUSH/.test(b1.msg) && b1.keys >= 1, 'texten BAKHÅLL! visas och nyckeln är tagen: ' + b1.msg);
await at(a.from.x, a.from.y, ang(a.from.x, a.from.y, a.cells[1].x, a.cells[1].y)); await wait(300); await pg.screenshot({ path: 'out/t113/bakhall.png' });
await wait(1500);
ok(await ev(() => __game.v24().state.fired) === 1, 'bakhållet utlöses bara en gång');
// landmärket och brödsmulorna
const lm = L.lm[0];
const l1 = await ev(l => { const v = __game.v24(); return { torches: v.torches().length, light: v.light(l.x + 1, l.y), prop: __game.props().some(p => Math.abs(p.x - l.x - 0.5) < 0.1 && Math.abs(p.y - l.y - 0.5) < 0.1) }; }, lm);
ok(l1.torches >= 1 && l1.light > 0.3 && l1.prop, 'landmärket: statyn står där och lyser ' + JSON.stringify(l1));
await at(lm.x - 3, lm.y, 0); await wait(300); await pg.screenshot({ path: 'out/t113/landmarke.png' });
const bc = await ev(list => list.filter(b => __game.items().some(it => Math.abs(it.x - b.x - 0.5) < 0.05 && Math.abs(it.y - b.y - 0.5) < 0.05)).length, L.bc);
ok(bc === L.bc.length, 'brödsmulorna ligger som föremål ' + bc + '/' + L.bc.length);
// ledtrådar vid en hemlig vägg (annan bana)
await load('t113h-4', 2, 'dungeon'); await wait(500); await calm();
const h = await ev(() => __game.lvl().secretHints[0]);
await at(h.fx + (h.fx - h.x) * 2, h.fy + (h.fy - h.y) * 2, ang(h.fx, h.fy, h.x, h.y)); await wait(1600);
const h1 = await ev(h => { const v = __game.v24(); return { hints: v.state.hints.length, torches: v.torches().length, light: v.light(h.fx, h.fy) }; }, h);
ok(h1.hints >= 1 && h1.torches >= 1 && h1.light > 0, 'den hemliga väggen har en ledtråd (svagt ljus) ' + JSON.stringify(h1));
await pg.screenshot({ path: 'out/t113/ledtrad.png' });
// opts.v24off: inga version 24-saker, inga fel
await load('t113-99', 2, 'frost', { v24off: true }); await wait(500);
ok(await ev(() => { const v = __game.v24(); return v.state.shortcuts.length === 0 && v.state.ambushes.length === 0 && __game.lvl().shortcuts === undefined; }), 'med opts.v24off finns inga version 24-saker');
// en egen bana (playCustom ärver fälten från en riktig bana): posterna som inte stämmer med kartan hoppas över
await ev(() => { const g = __game, W = 20, H = 14, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); } grid[5][2] = 'P'; grid[5][17] = 'x'; g.playCustom({ grid, biome: 'frost' }); });
await wait(800);
ok(await ev(() => __game.state() === 'play' && __game.v24().state.shortcuts.length === 0 && __game.v24().state.ambushes.length === 0), 'en egen bana startar utan genvägar/bakhåll från den riktiga banan');
await done();
