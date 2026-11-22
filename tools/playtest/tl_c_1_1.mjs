// Stjärnlansen darrar inte vid laddning (bara stridshammaren gör det): __game.weaponFrame() ger {idx, dx, dy}
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { ev, wait, ok, start, done } = await setup(PORT, 'out/tl_c_1_1');
await start('&god=1');

const pre = await ev(() => {
  const g = __game; for (const e of g.ents()) e.dead = true;
  g.settings.reduceMotion = false;
  if (g.state() === 'pause' && g.resume) g.resume();
  return { hook: typeof g.weaponFrame };
});
{ const t0 = Date.now(); while (Date.now() - t0 < 8000 && await ev(() => __game.state()) !== 'play') await wait(100); }
pre.state = await ev(() => __game.state());
ok(pre.hook === 'function', `kroken __game.weaponFrame finns (${pre.hook})`);
ok(pre.state === 'play', `spelet är igång (${pre.state})`);
if (pre.hook !== 'function') { await done(); process.exit(0); }

// byt till vapnet, vänta ut utdragningen, håll avtryckaren och läs bildrutan 40 gånger med 50 ms mellanrum
async function charge(id, ammo) {
  const i = await ev(([id, ammo]) => {
    const g = __game, P = g.P, i = g.WEAPONS.findIndex(w => w.id === id); if (i < 0) return -1;
    for (const e of g.ents()) e.dead = true;
    P.has[i] = true; P.mags[i] = 1; if (ammo) P.ammo[ammo] = 10; g.switchWeapon(i); return i;
  }, [id, ammo]);
  if (i < 0) return { i };
  await wait(1000);
  const m0 = await ev(i => { const g = __game; g.settings.reduceMotion = false; for (const e of g.ents()) e.dead = true; return g.P.mags[i]; }, i);
  const cur = await ev(() => __game.P.weapon);
  await ev(() => __game.setMouse(true, false));
  const dxs = [], all = []; let last = null, maxL = 0;
  // minst 40 avläsningar; om spelklockan släpar fortsätter vi tills full laddning nåtts plus 10 avläsningar (högst 120)
  let full = -1;
  for (let n = 0; n < 120 && (n < 40 || full < 0 || n < full + 10); n++) {
    const r = await ev(() => { const g = __game, f = g.weaponFrame(); return { idx: f.idx, dx: f.dx, dy: f.dy, h: g.WS.hcharge || 0, l: g.WS.lcharge || 0 }; });
    if (r.h >= 0.7) dxs.push(r.dx);
    all.push(r); last = r; maxL = Math.max(maxL, r.l);
    if (full < 0 && (id === 'starlance' ? r.l >= 1.19 : r.h >= 1)) full = n;
    await wait(50);
  }
  return { i, m0, cur, dxs, last, maxL, all };
}
const spread = a => a.length ? Math.max(...a) - Math.min(...a) : NaN;

// Fall A: stjärnlansen
{
  const r = await charge('starlance', 'stars');
  ok(r.i >= 0, `stjärnlansen finns (index ${r.i})`);
  if (r.i >= 0) {
    ok(r.cur === r.i, `stjärnlansen är vald (${r.cur})`);
    ok(r.dxs.length >= 8, `lansen laddas över 0,7 under minst 8 avläsningar (${r.dxs.length})`);
    ok(r.maxL >= 1.19, `lansen når full laddning, lcharge 1,2 (${r.maxL.toFixed(3)})`);
    const s = spread(r.dxs);
    ok(r.dxs.length > 0 && s < 0.05, `stjärnlansen darrar inte vid laddning >= 0,7: dx varierar ${s.toFixed(3)} (< 0,05) [${r.dxs.map(v => v.toFixed(2)).join(' ')}]`);
    const chg = await ev(() => window.WEAPON_FRAMES.starlance.states.charge);
    ok(r.last && r.last.idx === chg[chg.length - 1], `sista laddrutan visas vid full laddning (idx ${r.last && r.last.idx}, väntat ${chg[chg.length - 1]})`);
    await ev(() => __game.setMouse(false));
    let mags = null; { const t0 = Date.now(); do { await wait(50); mags = await ev(i => __game.P.mags[i], r.i); } while (Date.now() - t0 < 300 && mags !== r.m0 - 1); }
    ok(mags === r.m0 - 1, `släppet skjuter lansen: magasin ${r.m0} -> ${mags}`);
  }
}

await wait(500);

// Fall B: motprov, stridshammaren darrar fortfarande
{
  const r = await charge('hammer', null);
  ok(r.i >= 0, `stridshammaren finns (index ${r.i})`);
  if (r.i >= 0) {
    ok(r.cur === r.i, `stridshammaren är vald (${r.cur})`);
    ok(r.dxs.length >= 8, `hammaren laddas över 0,7 under minst 8 avläsningar (${r.dxs.length})`);
    const s = spread(r.dxs);
    ok(r.dxs.length > 0 && s > 0.5, `stridshammaren darrar kvar vid laddning >= 0,7: dx varierar ${s.toFixed(3)} (> 0,5)`);
    await ev(() => __game.setMouse(false));
    await wait(300);
  }
}

await done();
