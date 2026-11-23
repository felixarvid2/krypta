// tl_i_1_1: ödlekrigarens hugg sänks från 10 till 8.
// I djungeln (?biome=jungle) mäts första hugget från en nyskapad ÖDLEKRIGARE ('Ȉ') och från ett SKELETT ('S')
// med samma uppställning: alla andra fiender döda, fienden ca 0,9 rutor framför spelaren på en fri plats,
// P.hp = 100 och ingen rustning, sköld, osårbarhet eller gift. Huggets storlek läses ur run().dmgBy[namn],
// inte ur HP-skillnaden. Kvoten hL/hS ska ligga kring 8/9 ≈ 0,89 (före ändringen 10/9 ≈ 1,11), oberoende av
// djupets skalning och svårighetsgraden. Mätningen görs tre gånger och utfallet krävs i alla.
// Fienderna dödas med e.dead = true (inga belöningar); öppnas ändå ett fönster stängs det och hugget mäts om.
// Krokar: begin, state, resume, lvl, P, ents, freeSpot, voidAt, deepAt, spawnEnemy, run, profile.
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/tl_i_1_1');

await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&biome=jungle`);
await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => { try { localStorage.removeItem('krypta.run'); } catch (e) { /* ingen lagring */ } __game.profile.tutDone = true; __game.begin('new'); });

// vänta (med tidsgräns) tills spelet är igång i djungeln
let ready = false;
for (let t = 0; t < 30000 && !ready; t += 250) {
  await wait(250);
  const st = await ev(() => __game.state());
  if (st === 'pause') await ev(() => { if (__game.resume) __game.resume(); });
  else if (st !== 'play' && t >= 3000 && t % 2000 === 0) await pg.keyboard.press('Escape'); // stäng ett ev. inledningsfönster
  ready = await ev(() => __game.state() === 'play' && !!__game.lvl() && __game.lvl().biome === 'jungle');
}
ok(ready, 'spelet startar i djungeln (state play, biome jungle)');
if (!ready) { await done(); process.exit(0); }
await wait(800);

// döda alla andra fiender och hitta en fri plats ca 0,9 rutor från spelaren; vänd spelaren mot den
const spot = await ev(() => {
  const g = __game, P = g.P;
  for (const e of g.ents()) e.dead = true;
  const good = (x, y) => g.freeSpot(x, y, 0.3) && !g.voidAt(x, y) && !g.deepAt(x, y);
  for (const r of [0.9, 0.85, 0.8]) for (let k = 0; k < 24; k++) {
    const a = P.a + k * Math.PI * 2 / 24, x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
    // mittpunkten mellan spelaren och platsen ska också vara fri, så att fienden når fram direkt
    if (good(x, y) && good((x + P.x) / 2, (y + P.y) / 2)) { P.a = Math.atan2(y - P.y, x - P.x); return { x, y, r }; }
  }
  return null;
});
ok(!!spot, 'en fri plats nära spelaren hittades' + (spot ? ` (${spot.r} rutor)` : ''));
if (!spot) { await done(); process.exit(0); }

// ett mätt hugg: ökningen i dmgBy[namn] från en nyskapad fiende av sorten type
async function firstHit(type, name) {
  const r = await ev(async ([type, name, spot]) => {
    const g = __game, P = g.P;
    for (const o of g.ents()) if (!o.dead) o.dead = true;
    P.a = Math.atan2(spot.y - P.y, spot.x - P.x);
    P.hp = 100; P.armor = 0; P.shield = 0; P.iframe = 0; P.poisonT = 0;
    const a0 = ((g.run().dmgBy || {})[name]) || 0;
    const e = g.spawnEnemy(type, spot.x, spot.y); e.alert = true; e.sleep = false;
    const t0 = performance.now();
    let a1 = a0;
    await new Promise(res => {
      const step = () => {
        a1 = ((g.run().dmgBy || {})[name]) || 0;
        if (g.state() === 'pause' && g.resume) g.resume();
        if (a1 > a0 || performance.now() - t0 > 7000 || (g.state() !== 'play' && g.state() !== 'pause')) return res();
        // inga andra fiender får finnas nära (de skulle kunna få huggets skada tillskriven sig, eller tvärtom)
        for (const o of g.ents()) if (o !== e && !o.dead && Math.hypot(o.x - P.x, o.y - P.y) < 6) o.dead = true;
        if (P.hp < 60) P.hp = 100; P.poisonT = 0;
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    const ms = Math.round(performance.now() - t0);
    // döda utan dödshantering, så att inga belöningar (t.ex. runfynd med eget fönster) ges mellan mätningarna
    e.dead = true;
    return { h: a1 - a0, ms, depth: g.run().depth, st: g.state() };
  }, [type, name, spot]);
  return r;
}
// stäng ett ev. öppet fönster (state 'ui') så att spelet är i läge play igen
async function backToPlay() {
  for (let k = 0; k < 20; k++) {
    const st = await ev(() => __game.state());
    if (st === 'play') return true;
    if (st === 'pause') await ev(() => { if (__game.resume) __game.resume(); });
    else await pg.keyboard.press('Escape');
    await wait(250);
  }
  return (await ev(() => __game.state())) === 'play';
}
// ett hugg som avbröts av ett fönster (inte av fienden) mäts om när fönstret är stängt
async function measure(type, name) {
  let r;
  for (let k = 0; k < 3; k++) {
    await backToPlay();
    r = await firstHit(type, name);
    if (r.h > 0 || r.st === 'play') break;
  }
  return r;
}

const ratios = [], hLs = [], hSs = [];
let allOk = true, lizHurts = true, lizLess = true, inRange = true;
for (let i = 0; i < 3; i++) {
  let L, S;
  try { L = await measure('Ȉ', 'ÖDLEKRIGARE'); await wait(400); S = await measure('S', 'SKELETT'); await wait(400); }
  catch (x) { ok(false, `mätning ${i + 1}: sidan svarade inte`); allOk = false; break; }
  const q = S.h > 0 ? L.h / S.h : NaN;
  if (!(L.h > 0)) console.log(`mätning ${i + 1}: ödlekrigaren högg inte inom tidsgränsen (läge ${L.st})`);
  if (!(S.h > 0)) console.log(`mätning ${i + 1}: skelettet högg inte inom tidsgränsen (läge ${S.st})`);
  hLs.push(L.h); hSs.push(S.h);
  console.log(`mätning ${i + 1}: djup ${L.depth}, ödlekrigare ${L.h.toFixed(2)} (${L.ms} ms), skelett ${S.h.toFixed(2)} (${S.ms} ms), kvot ${isFinite(q) ? q.toFixed(3) : '–'}, ödlekrigare/djupskalning ${(L.h / (1 + 0.1 * (L.depth - 1))).toFixed(2)}`);
  if (!(L.h > 0)) lizHurts = false;
  if (!(S.h > 0) || !(L.h < S.h)) lizLess = false;
  if (!(q >= 0.85 && q <= 0.93)) inRange = false;
  ratios.push(isFinite(q) ? q.toFixed(3) : 'saknas');
}
ok(allOk && ratios.length === 3 && lizHurts, `ödlekrigaren skadar fortfarande i alla mätningar`);
ok(allOk && ratios.length === 3 && lizLess, `ödlekrigarens hugg är mindre än skelettets i alla mätningar`);
ok(allOk && ratios.length === 3 && inRange, `kvoten ödlekrigare/skelett ligger på 0,85–0,93 (8/9) i alla mätningar: ${ratios.join(', ')}`);
// samma hugg ska ge samma skada varje gång; avviker ett värde har annan skada (fälla, projektil) räknats in
const same = a => a.length === 3 && a.every(v => v > 0 && Math.abs(v - a[0]) <= 0.01 * a[0]);
ok(same(hLs) && same(hSs), `mätningarna stämmer med varandra (ödlekrigare ${hLs.map(v => v.toFixed(2)).join('/')}, skelett ${hSs.map(v => v.toFixed(2)).join('/')})`);
await done();
