// t135: version 27 (BLOOD) – blodstänk på väggar. En träff eller ett dödande nära en vägg lämnar ett stänk på väggytan bakom fienden
// (rätt ruta och rätt sida, i skottets riktning) i materialets färg: kultisten (kött) rött, spindeln (insekt) gulgrönt, skelettet
// (ben) damm, ghoulen (odöd) mörkt; kristallgolemen (metall) och bansheen (spöke) lämnar inget. Färgen kontrolleras både på märket och
// på de ritade pixlarna (samma bildruta ritad utan och med stänken). Ett riktigt pistolskott (fire) ger stänket, och mot golemen inget
// (det gamla röda stänket är borta). Taket håller (60 MYCKET, 30 NORMAL, 16 lowfx) och de äldsta återvinns. Standard är MYCKET på
// dator. Inga sidfel. Väntetider i speltid (__game.v27b.t()).
import { setup } from './head.mjs';
const PORT = 9835;
const { pg, ev, wait, ok, shot, done } = await setup(PORT, 'out/t135');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
ok(await ev(() => !!__game.v27b && __game.settings.blood === 2 && __game.v27b.level() === 2), '__game.v27b finns och BLOD är MYCKET som standard på dator');

const sceneFn = o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = !!o.lowfx; g.settings.blood = o.blood ?? 2; g.gfxE.set(true); g.v27b.set(true);
  const W = o.W, H = o.H, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[o.p[1]][o.p[0]] = 'P'; grid[1][1] = 'x';
  for (const [t, x, y] of o.en) grid[y][x] = t;
  g.playCustom({ grid, biome: 'dungeon' });
  const E = g.ents(), spec = E.filter(e => !e.boss).map(e => [e.type, e.x, e.y]); E.length = 0;
  for (const [t, x, y] of spec) g.spawnEnemy(t, x, y);
  for (const e of E) { e.d = { ...e.d, dmg: 0, speed: 0 }; e.alert = true; }
  g.P.hp = 1e6; clearInterval(window.__hold); window.__pin = [g.P.x, g.P.y]; g.P.a = 0; g.P.pitch = 0; g.P.look = 0;
  window.__hold = setInterval(() => { __game.P.hp = 1e6; if (window.__pin) { __game.P.x = window.__pin[0]; __game.P.y = window.__pin[1]; __game.P.a = window.__pinA ?? 0; } }, 30);
};
const scene = o => pg.evaluate(sceneFn, o);
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);
// samma bildruta (ingen speltid emellan) ritas två gånger: utan och med väggstänken; medelfärgen på de pixlar som skiljer.
// Allt annat (ljus, blixtar, lik, partiklar, andra effekter) är detsamma i båda bilderna, så bara stänket räknas.
const snapB = () => ev(() => { const g = __game, WM = g.v27b.wallMarks(), saved = [];
  for (const a of WM.values()) { saved.push([a, a.slice()]); for (let i = a.length - 1; i >= 0; i--) if (a[i].v27) a.splice(i, 1); }
  const c = document.getElementById('screen'), cx = c.getContext('2d'); g.v27b.render(); const A = cx.getImageData(0, 0, c.width, c.height).data.slice();
  for (const [a, s] of saved) { a.length = 0; a.push(...s); } g.v27b.render(); const B = cx.getImageData(0, 0, c.width, c.height).data;
  let n = 0, r = 0, gg = 0, b = 0; for (let i = 0; i < B.length; i += 4) { const d = Math.abs(B[i] - A[i]) + Math.abs(B[i + 1] - A[i + 1]) + Math.abs(B[i + 2] - A[i + 2]); if (d > 18) { n++; r += B[i]; gg += B[i + 1]; b += B[i + 2]; } }
  return n ? { n, r: Math.round(r / n), g: Math.round(gg / n), b: Math.round(b / n) } : { n: 0 }; });
const hitOne = (type, dmg) => ev(([type, dmg]) => { const g = __game, e = g.ents().find(x => x.type === type && !x.dead); if (!e) return null; const m0 = g.v27b.marks().length, o0 = g.v27b.oldMarks();
  g.hurtEnemy(e, dmg === 'kill' ? e.hp + 0.5 : dmg, e.x, e.y); const ms = g.v27b.marks(); return { dead: !!e.dead, add: ms.length - m0, old: g.v27b.oldMarks() - o0, last: ms[ms.length - 1], mat: g.v27b.mat(e), ex: Math.floor(e.x), ey: Math.floor(e.y) }; }, [type, dmg]);

// 1) en fiende i taget vid östra väggen (x = 17), spelaren tittar österut
const W = 18, H = 9;
const mats = [['Ä', 'kött', c => c.r > c.g * 1.8 && c.r > c.b * 1.8 && c.r > 25], ['U', 'insekt', c => c.g > c.b * 2 && c.r > c.b * 1.6 && c.g >= c.r * 0.75], ['S', 'ben (damm)', c => c.r >= c.g && c.g >= c.b * 0.95 && c.r < c.g * 1.8 && c.b > c.r * 0.45], ['Å', 'odöd (mörkt)', c => c.r >= c.g && c.r >= c.b && c.r + c.g + c.b < 180]];
for (const [t, name, test] of mats) {
  await scene({ W, H, p: [13, 4], en: [[t, 16, 4]] }); await gwait(0.4);
  const h = await hitOne(t, 'kill');
  ok(h && h.add >= 1 && h.old === 0 && h.last && h.last.mx === 17 && h.last.my === 4 && h.last.face === 0, `${name}: dödandet ger ett stänk på östra väggen (ruta 17,4, västra sidan) och inget gammalt rött märke ` + JSON.stringify(h));
  ok(h && h.mat && test({ r: h.mat[0], g: h.mat[1], b: h.mat[2] }), `${name}: märkets färg följer materialet ` + JSON.stringify(h && h.mat));
  await gwait(0.3);
  const px = await snapB();
  ok(px.n > 20 && test(px), `${name}: de ritade pixlarna på väggen har materialets färg ` + JSON.stringify(px));
  if (t === 'Ä') await shot('kott');
  if (t === 'U') await shot('insekt');
}
// 2) metall och spöke: inget stänk
for (const [t, name] of [['Ë', 'kristallgolemen (metall)'], ['Ý', 'bansheen (spöke)']]) {
  await scene({ W, H, p: [9, 4], en: [[t, 16, 4]] }); await gwait(0.4);
  const h = await hitOne(t, 'kill');
  ok(h && h.add === 0 && h.old === 0 && h.mat === null, `${name}: inget stänk, varken nytt eller gammalt ` + JSON.stringify(h));
}
// 3) en träff (inte dödande) på avstånd från väggen: inget stänk; nära väggen: stänk
await scene({ W, H, p: [4, 4], en: [['Ä', 8, 4]] }); await gwait(0.3);
let h = await hitOne('Ä', 0.5);
ok(h && !h.dead && h.add === 0, 'en träff långt från väggen ger inget väggstänk ' + JSON.stringify(h));
// 4) riktiga pistolskott (fire): kultisten nära väggen får ett stänk bakom sig; golemen inget (det gamla röda stänket är borta)
const fireAt = type => ev(type => new Promise(res => { const g = __game, e = g.ents().find(x => x.type === type && !x.dead); const m0 = g.v27b.marks().length, o0 = g.v27b.oldMarks();
  const i = g.WEAPONS.findIndex(w => w.id === 'pistol'); g.P.has[i] = true; g.P.weapon = i; g.P.mags[i] = 9; g.WS.state = 'idle'; g.WS.cd = 0; g.WS.shot = 99; window.__pinA = Math.atan2(e.y - g.P.y, e.x - g.P.x); g.P.a = window.__pinA; g.P.pitch = 0;
  g.fire(); setTimeout(() => res({ add: g.v27b.marks().length - m0, old: g.v27b.oldMarks() - o0, hp: +e.hp.toFixed(2), maxHp: e.maxHp, last: g.v27b.marks().pop() }), 200); }), type);
await scene({ W, H, p: [11, 4], en: [['Ä', 16, 4]] }); await gwait(0.4);
let f1 = null; for (let i = 0; i < 4 && !(f1 && f1.add); i++) { f1 = await fireAt('Ä'); await gwait(0.3); }
ok(f1 && f1.add >= 1 && f1.old === 0 && f1.last.mx === 17, 'ett riktigt pistolskott mot kultisten vid väggen ger ett rött stänk bakom den ' + JSON.stringify(f1));
await scene({ W, H, p: [11, 4], en: [['Ë', 16, 4]] }); await gwait(0.4);
let f2 = null; for (let i = 0; i < 3; i++) { f2 = await fireAt('Ë'); await gwait(0.3); }
ok(f2 && f2.add === 0 && f2.old === 0 && f2.hp < f2.maxHp, 'riktiga pistolskott mot kristallgolemen vid väggen: träffar men inget stänk ' + JSON.stringify(f2));
// 5) taket: 60 (MYCKET), 30 (NORMAL), 16 (lowfx); de äldsta återvinns
await scene({ W, H, p: [9, 4], en: [] }); await gwait(0.2);
const capT = (blood, lowfx) => ev(([blood, lowfx]) => { const g = __game; g.settings.blood = blood; g.settings.lowfx = lowfx; const r0 = g.v27b.n.recycled;
  for (let i = 0; i < 120; i++) { const y = 1.5 + (i % 7), h = g.v27b.cast(9.5, y, 1, 0, 30); g.v27b.wall(h, 1, 0, 0.3 + (i % 5) * 0.1, g.v27b.COL.flesh, 0.08, 1); }
  return { walls: g.v27b.walls(), marks: g.v27b.marks().length, recycled: g.v27b.n.recycled - r0, cap: g.v27b.cap() }; }, [blood, lowfx]);
let c1 = await capT(2, false);
ok(c1.walls === 60 && c1.marks <= 60 && c1.recycled >= 60 && c1.cap === 60, 'MYCKET: högst 60 väggstänk, de äldsta återvinns ' + JSON.stringify(c1));
await shot('tak60');
c1 = await capT(1, false);
ok(c1.walls === 30 && c1.marks <= 30, 'NORMAL: högst 30 väggstänk ' + JSON.stringify(c1));
c1 = await capT(2, true);
ok(c1.walls === 16 && c1.marks <= 16, 'lowfx: högst 16 väggstänk ' + JSON.stringify(c1));
await ev(() => { __game.settings.lowfx = false; __game.settings.blood = 2; });
// 6) nivåbyte tömmer listan
await scene({ W, H, p: [9, 4], en: [] }); await gwait(0.3);
ok(await ev(() => __game.v27b.walls() === 0 && __game.v27b.marks().length === 0), 'en ny bana börjar utan väggstänk');
// 7) modulen av: det gamla röda stänket kommer tillbaka (för jämförelser)
ok(await ev(() => { const g = __game; g.v27b.set(false); const r = g.v27b.level(); g.v27b.set(true); return r === -1; }), 'v27b.set(false) ger det gamla läget');
// 8) bild för ögat: fyra material längs östra väggen (kött, insekt, ben, odöd), fienderna borttagna
await scene({ W, H: 11, p: [12, 5], en: [['Ä', 16, 3], ['U', 16, 4], ['S', 16, 6], ['Å', 16, 7]] }); await gwait(0.4);
await ev(() => { const g = __game; for (const e of g.ents()) { for (let i = 0; i < 2; i++) { e.v27jT = -9; g.hurtEnemy(e, 0.3, e.x, e.y); } g.hurtEnemy(e, e.hp + 0.5, e.x, e.y); } });
await gwait(1.8); await ev(() => { __game.ents().length = 0; __game.particles().length = 0; __game.v27b.decalArr().length = 0; }); await gwait(0.1); await shot('vagg_material');
await done();
