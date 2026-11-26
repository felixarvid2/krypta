// t130: version 26C – huvudet lossnar. Ett dödande huvudskott (e.headT i samma skott) på en kultist (kött) och ett skelett (ben)
// skär ut toppen av fiendens stående ruta och skjuter iväg den som en snurrande bit (fyra vridna rutor); kroppen står huvudlös
// (enemyFrame ger den urskurna kroppen) med högst sex droppar blod (benet: damm, inga droppar). Huvud och droppar är borta inom
// 1,2 s speltid; ett huvud nära kameran tas bort. Eldskelettet (ben som inte går att skära) ger dödskallen i stället.
// En kristallgolem (metall) tappar inget huvud. Överdöd: huvudet flyger men ingen huvudlös kropp. MINSKADE EFFEKTER och
// HUVUDEN LOSSNAR av stänger av det. Ett riktigt pistolskott mitt i en kultist ger också ett huvud. Utskärningen cachas
// (högst 40 poster) och kostar lite. Inga sidfel. Väntetider i speltid (__game.v26c.t()).
import { setup } from './head.mjs';
const PORT = 9830;
const { pg, ev, wait, ok, shot, done } = await setup(PORT, 'out/t130');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
ok(await ev(() => !!__game.v26c && __game.settings.heads === true), '__game.v26c finns och HUVUDEN LOSSNAR är på som standard');

const sceneFn = o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = !!o.lowfx; g.gfxE.set(true);
  const W = o.W, H = o.H, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[o.p[1]][o.p[0]] = 'P'; grid[1][W - 2] = 'x';
  for (const [t, x, y] of o.en) grid[y][x] = t;
  g.playCustom({ grid, biome: 'dungeon' });
  const E = g.ents(), spec = E.filter(e => !e.boss).map(e => [e.type, e.x, e.y]); E.length = 0;
  for (const [t, x, y] of spec) g.spawnEnemy(t, x, y);
  for (const e of E) { e.d = { ...e.d, dmg: 0, speed: 0 }; e.alert = false; }
  g.P.hp = 1e6; clearInterval(window.__hold); window.__pin = [g.P.x, g.P.y]; g.P.a = 0; g.P.pitch = 0;
  window.__hold = setInterval(() => { __game.P.hp = 1e6; if (window.__pin) { __game.P.x = window.__pin[0]; __game.P.y = window.__pin[1]; } }, 30);
};
const scene = o => pg.evaluate(sceneFn, o);
const gt = () => ev(() => __game.v26c.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);
// dödar fienden med ett "huvudskott": headT sätts i samma ögonblick som skadan, precis som headshotCheck gör i fire()
const headKill = (type, extra = 1) => ev(([type, extra]) => { const g = __game, e = g.ents().find(x => x.type === type && !x.dead); if (!e) return null;
  e.alert = true; const h0 = g.v26c.st.heads; e.headT = g.v26c.t(); g.hurtEnemy(e, e.hp + extra, e.x, e.y); // vaken: ingen ×1,5 för ovetande (det blir överdöd)
  return { dead: !!e.dead, heads: g.v26c.st.heads - h0, body: !!e.v26hd, skip: g.v26c.st.skip, parts: g.v26c.headParts(), overkill: !!e.overkill }; }, [type, extra]);

// 1) kultisten (kött) och skelettet (ben) framför spelaren, golemen (metall) bredvid
await scene({ W: 24, H: 15, p: [4, 7], en: [['Ä', 8, 7], ['S', 8, 5], ['Ë', 8, 9]] });
await gwait(0.4);
const cu = await headKill('Ä');
ok(cu && cu.dead && cu.heads === 1 && cu.body && cu.parts.length === 1 && !cu.overkill, 'kultisten: ett huvudskott som dödar ger ett flygande huvud och en huvudlös kropp ' + JSON.stringify(cu));
const fr = await ev(() => { const g = __game, e = g.ents().find(x => x.type === 'Ä');
  const set = e && e.v26hd; const p = g.particles().find(q => q.v26head); return { body: !!set, frames: p && p.frames ? p.frames.length : 0, sq: p ? p.img.w === p.img.h : false, flap: !!(p && p.flap), cache: g.v26c.cache() }; });
ok(fr.body && fr.frames === 4 && fr.sq && fr.flap && fr.cache >= 1, 'huvudet snurrar (fyra kvadratiska vridna rutor) och utskärningen ligger i cachen ' + JSON.stringify(fr));
await gwait(0.12); await shot('huvud');
const bodyImg = await ev(() => { const g = __game, e = g.ents().find(x => x.type === 'Ä'); const top = im => { for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (im.data[y * im.w + x] >>> 24 >= 100) return y; return -1; };
  return { headless: top(e.v26hd), whole: -1 }; });
ok(bodyImg.headless > 0, 'den huvudlösa kroppen börjar längre ned i rutan ' + JSON.stringify(bodyImg));
const sk = await headKill('S');
ok(sk && sk.dead && sk.heads === 1 && sk.body, 'skelettet (ben): huvudet (skallen ur dess egen ruta) flyger ' + JSON.stringify(sk));
const gl = await headKill('Ë', 999); // stenen tar halv skada av kulor
ok(gl && gl.dead && gl.heads === 0 && gl.skip === 'metal', 'kristallgolemen (metall) tappar inget huvud ' + JSON.stringify(gl));
await gwait(0.7);
const mid = await ev(() => ({ drops: __game.v26c.st.drops, bodies: __game.v26c.st.bodies, fount: __game.v26c.fount() }));
ok(mid.drops >= 1 && mid.drops <= 6 && mid.fount === 0, 'blodfontänen: högst sex droppar för kultisten och inga för skelettet, och den är slut efter en halv sekund ' + JSON.stringify(mid));
await gwait(0.6);
const late = await ev(() => ({ heads: __game.v26c.headParts().length, parts: __game.particles().filter(p => p.v26head).length }));
ok(late.heads === 0, 'huvudena är borta inom 1,2 s speltid ' + JSON.stringify(late));
const mk = await ev(() => ({ marks: __game.v26c.state().marks }));
ok(mk.marks >= 1, 'kultistens huvud lämnar en liten fläck där det landar (torkar bort efter 8 s) ' + JSON.stringify(mk));
const sunk = await ev(() => { const g = __game, e = g.ents().find(x => x.type === 'Ä'); return { dead: !!e.dead, hd: !!e.v26hd }; });
ok(sunk.dead && sunk.hd, 'kroppen är kvar som död (inga nya flaggor som gibbed) ' + JSON.stringify(sunk));

// nära kameran: spelaren står där huvudet flyger – det tas bort i stället för att fylla skärmen
await scene({ W: 24, H: 15, p: [4, 7], en: [['Ä', 7, 7]] });
await gwait(0.3);
const nc = await ev(() => { const g = __game, e = g.ents().find(x => x.type === 'Ä'); e.alert = true; const n0 = g.v26c.state().nearCam; e.headT = g.v26c.t(); g.hurtEnemy(e, e.hp + 1, e.x, e.y);
  const p = g.particles().find(q => q.v26head); window.__pin = p ? [p.x, p.y] : window.__pin; g.P.x = window.__pin[0]; g.P.y = window.__pin[1]; return { n0, had: !!p }; });
await gwait(0.2);
const nc2 = await ev(() => ({ n: __game.v26c.state().nearCam, left: __game.v26c.headParts().length }));
ok(nc.had && nc2.n > nc.n0 && nc2.left === 0, 'ett huvud nära kameran tas bort ' + JSON.stringify({ nc, nc2 }));
// eldskelettet K (ben, figuren går inte att skära): dödskallen flyger
await scene({ W: 24, H: 15, p: [4, 7], en: [['K', 8, 7]] });
await gwait(0.3);
const ks = await ev(() => { const g = __game, e = g.ents().find(x => x.type === 'K'), s0 = g.v26c.state().skulls; e.alert = true; e.headT = g.v26c.t(); g.hurtEnemy(e, e.hp + 1, e.x, e.y); return { dead: !!e.dead, skulls: g.v26c.state().skulls - s0, body: !!e.v26hd }; });
ok(ks.dead && ks.skulls === 1 && !ks.body, 'eldskelettet: dödskallen flyger (ingen urskuren kropp) ' + JSON.stringify(ks));

// 2) överdöd: huvudet flyger men kroppen sprängs ändå i bitar (ingen huvudlös kropp)
await scene({ W: 24, H: 15, p: [4, 7], en: [['Ä', 8, 7]] });
await gwait(0.3);
const ov = await headKill('Ä', 999);
ok(ov && ov.dead && ov.overkill && ov.heads === 1 && !ov.body, 'överdöd: huvudet flyger, kroppen blir bitar ' + JSON.stringify(ov));

// 3) en kroppsträff (inget huvudskott) ger inget huvud
await scene({ W: 24, H: 15, p: [4, 7], en: [['Ä', 8, 7]] });
await gwait(0.3);
const nb = await ev(() => { const g = __game, e = g.ents().find(x => x.type === 'Ä'), h0 = g.v26c.st.heads; e.alert = true; e.headT = g.v26c.t() - 0.5; g.hurtEnemy(e, e.hp + 1, e.x, e.y); return { dead: !!e.dead, heads: g.v26c.st.heads - h0 }; });
ok(nb.dead && nb.heads === 0, 'ett gammalt huvudskott (0,5 s sedan) räknas inte ' + JSON.stringify(nb));

// 4) MINSKADE EFFEKTER och HUVUDEN LOSSNAR av
await scene({ W: 24, H: 15, p: [4, 7], en: [['Ä', 8, 7]], lowfx: true });
await gwait(0.3);
const lo = await headKill('Ä');
ok(lo && lo.dead && lo.heads === 0 && !lo.body && lo.skip === 'lowfx', 'MINSKADE EFFEKTER: inget huvud, ingen huvudlös kropp ' + JSON.stringify(lo));
await scene({ W: 24, H: 15, p: [4, 7], en: [['Ä', 8, 7]] });
await ev(() => { __game.settings.heads = false; });
await gwait(0.3);
const off = await headKill('Ä');
await ev(() => { __game.settings.heads = true; });
ok(off && off.dead && off.heads === 0 && off.skip === 'off', 'HUVUDEN LOSSNAR av: inget huvud ' + JSON.stringify(off));

// 5) ett riktigt pistolskott mitt i kultisten (headshotCheck): huvudet lossnar
await scene({ W: 24, H: 15, p: [4, 7], en: [['Ä', 9, 7]] });
await gwait(0.3);
let real = null;
for (let i = 0; i < 8 && !(real && real.heads); i++) {
  real = await ev(() => new Promise(res => { const g = __game, e = g.ents().find(x => x.type === 'Ä' && !x.dead) || g.spawnEnemy('Ä', 9.5, 7.5);
    e.d = { ...e.d, dmg: 0, speed: 0 }; e.x = 9.5; e.y = 7.5; e.hp = 1; e.alert = false; const h0 = g.v26c.st.heads;
    if (g.P.mags[g.P.weapon] < 1) g.P.mags[g.P.weapon] = 5; g.P.a = Math.atan2(e.y - g.P.y, e.x - g.P.x); g.P.pitch = 0;
    g.fire(); setTimeout(() => res({ dead: !!e.dead, heads: g.v26c.st.heads - h0, headT: !!e.headT, w: g.WEAPONS[g.P.weapon].id }), 250); }));
  await gwait(0.4);
}
ok(real && real.dead && real.heads === 1, 'ett riktigt pistolskott i huvudet dödar kultisten och huvudet flyger ' + JSON.stringify(real));

// bilder på nära håll (för ögat): huvudet i luften, den huvudlösa kroppen, kroppen som segnar
await scene({ W: 24, H: 15, p: [4, 7], en: [['Ä', 6, 7], ['ɖ', 6, 8]] });
await gwait(3.2);
await ev(() => { const g = __game; g.P.a = Math.atan2(7.95 - g.P.y, 6.5 - g.P.x); for (const e of g.ents()) { e.alert = true; e.headT = g.v26c.t(); g.hurtEnemy(e, e.hp + 1, e.x, e.y); } });
for (const [n, s] of [['nara_1', 0.08], ['nara_2', 0.25], ['nara_3', 0.35], ['nara_4', 0.4]]) { await gwait(s); await shot(n); }

// mätning: åtta kultister dödade med huvudskott mot åtta vanliga dödanden – bildrutans tid (render, partiklar) den första sekunden
const kill8 = async (head) => { await scene({ W: 24, H: 15, p: [3, 7], en: [6, 7, 8, 9].flatMap(x => [['Ä', x, 6], ['Ä', x, 8]]) }); await gwait(3.2);
  return ev(head => { const g = __game; g.P.a = 0; for (const e of g.ents()) { e.alert = true; if (head) e.headT = g.v26c.t(); g.hurtEnemy(e, e.hp + 1, e.x, e.y); } const b = g.gfxW.bench(60); return { mean: +b.mean.toFixed(2), p90: +b.p90.toFixed(2), parts: b.parts, heads: g.v26c.st.heads }; }, head); };
const nb8 = await kill8(false), hb8 = await kill8(true);
ok(hb8.mean < nb8.mean * 1.5 + 1, `mätning (swiftshader): bildrutan ${nb8.mean} ms med vanliga dödanden, ${hb8.mean} ms med åtta huvuden (p90 ${nb8.p90} / ${hb8.p90}, partiklar ${nb8.parts} / ${hb8.parts})`);

// 6) kostnad: en utskärning (ny post) tar under 0,5 ms; cachen har ett tak
const ms = await ev(() => __game.v26c.bench(300));
ok(ms < 0.5, `utskärningen kostar ${ms.toFixed(4)} ms (cachas per bild)`);
const cap = await ev(() => __game.v26c.fill());
ok(cap <= 40, 'cachen har högst 40 poster ' + cap);
await done();
