// Ormväktarens svanssvep når kortare, som väktarens räckvidd i övrigt; med bossens räckvidd når samma svep längre
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { ev, wait, ok, start, done } = await setup(PORT, 'out/tl_b_1_2');
await start('&god=1'); // gudläge: run.cause och knuffen sätts ändå, eftersom svepet sätter run.cause före hurtPlayer

const NAME = 'VÄKTAREN DEN FJÄDRADE ORMEN';
const found = await ev(() => {
  const g = __game, L = Gen.floor(4242, 3, { biome: 'dungeon', guardian: 'serpent' }); g.run().depth = 3; g.startLevel(L);
  const b = g.ents().find(e => e.guardian && e.id === 'serpent'); if (!b) return null;
  window.__gb = b;
  window.__calm = () => { // övriga fiender (även nyframkallade) och flygande skott stör inte mätningen
    for (const e of g.ents()) if (e !== b && !e.dead) e.d = { ...e.d, speed: 0, dmg: 0 };
    for (const p of g.projectiles()) p.dead = true;
  };
  window.__calm();
  g.P.x = b.x - 3; g.P.y = b.y;
  b.hp -= 0.01; // väck väktaren
  return { x: +b.x.toFixed(2), y: +b.y.toFixed(2), name: b.d.name, range: b.d.range, state: g.state() };
});
ok(!!found, 'väktaren Den fjädrade ormen finns på våningen ' + JSON.stringify(found));
if (!found) { await done(); process.exit(0); }
ok(found.name === NAME, `väktaren heter ${NAME} (${found.name})`);

// vänta tills väktaren vaknat (med tidsgräns), sedan att slowmo och banderoll går över
{ const t0 = Date.now(); while (Date.now() - t0 < 5000 && await ev(() => window.__gb.asleep)) await wait(100); }
const awake = await ev(() => { const b = window.__gb; if (!b.asleep) { b.spT = 99; b.cd = 99; } return !b.asleep; });
ok(awake, 'väktaren har vaknat');
if (!awake) { await done(); process.exit(0); }
await wait(1500);
await ev(() => { const b = window.__gb; b.d = { ...b.d, speed: 0 }; b.spT = 99; b.cd = 99; });

// en körning: ställ spelaren r rutor från ormen med fri sikt, starta svanssvepet och vänta tills det är över (högst 3 s)
const sweep = rs => new Promise(res => {
  const r = rs[0], g = __game, b = window.__gb, P = g.P;
  window.__calm();
  let placed = null;
  const near = (x, y) => g.ents().some(e => e !== b && !e.dead && Math.hypot(e.x - x, e.y - y) < 2); // inga andra fiender intill spelaren
  for (const rr of rs) {
    for (let k = 0; k < 72 && !placed; k++) {
      const a = k / 72 * Math.PI * 2, x = b.x + Math.cos(a) * rr, y = b.y + Math.sin(a) * rr;
      if (g.freeSpot(x, y, 0.3) && g.hasLOS(x, y, b.x, b.y) && g.hasLOS(b.x, b.y, x, y) && !near(x, y)) placed = { x, y, rr };
    }
    if (placed) break;
  }
  if (!placed) return res({ placed: null, r });
  P.x = placed.x; P.y = placed.y; P.vx = P.vy = 0; P.jz = 0; g.run().cause = '';
  b.fightT = 0; // ingen ilska mitt i mätningen
  b.hidden = false; b.emerge = null; b.spT = 99; b.stun = 0; b.cd = 99; b.didHit = false; b.t = 0; b.state = 'tail';
  const x0 = P.x, y0 = P.y, bx = b.x, by = b.y, d0 = Math.hypot(P.x - b.x, P.y - b.y), t0 = performance.now();
  let bad = null, sawTail = false, hitFrame = false, causeAtHit = null;
  const tick = () => {
    window.__calm(); // även fiender som dyker upp under svepet
    if (g.state() !== 'play' && !bad) bad = g.state();
    if (b.state === 'tail') sawTail = true;
    if (!hitFrame && b.didHit) { hitFrame = true; causeAtHit = g.run().cause; } // svepets träffbildruta
    const over = b.state !== 'tail';
    if (over || bad || performance.now() - t0 >= 3000) {
      b.cd = 99; b.spT = 99;
      res({ placed: placed.rr, r, d0: +d0.toFixed(3), cause: g.run().cause, causeAtHit, hitFrame, ended: over, sawTail, bad, guardian: b.guardian, range: b.d.range,
        moved: +Math.hypot(P.x - x0, P.y - y0).toFixed(3), away: +(Math.hypot(P.x - bx, P.y - by) - d0).toFixed(3), bossMoved: +Math.hypot(b.x - bx, b.y - by).toFixed(3) });
    } else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

const valid = (R, label) => {
  console.log(label, JSON.stringify(R));
  if (R.placed === null) { ok(false, `OGILTIGT TEST (${label}): hittade ingen fri plats ${R.r} rutor från ormen med fri sikt`); return false; }
  if (R.bad) { ok(false, `OGILTIGT TEST (${label}): spelet lämnade 'play' (${R.bad})`); return false; }
  if (!R.ended) { ok(false, `OGILTIGT TEST (${label}): svanssvepet tog inte slut inom 3 s (state kvar i 'tail')`); return false; }
  if (!R.hitFrame) { ok(false, `OGILTIGT TEST (${label}): svanssvepet nådde aldrig sin träffbildruta (b.didHit blev aldrig sann)`); return false; }
  if (R.causeAtHit !== '' && R.causeAtHit !== NAME) { ok(false, `OGILTIGT TEST (${label}): något annat satte run.cause till '${R.causeAtHit}' under svepet`); return false; }
  if (R.cause !== R.causeAtHit) { ok(false, `OGILTIGT TEST (${label}): run.cause ändrades efter träffbildrutan ('${R.causeAtHit}' → '${R.cause}')`); return false; }
  return true;
};

// (1) väktaren, spelaren 3,4 rutor bort: svepet når inte fram
const A = await ev(sweep, [3.4, 3.45, 3.5, 3.55]); // bara utåt: närmare än 3,4 kan väktaren redan nå
if (valid(A, '(1) väktare 3,4')) {
  ok(A.guardian === true, '(1) mätte som väktare');
  ok(A.d0 >= 3.4 - 1e-6 && A.d0 < 3.6, `(1) spelaren står minst 3,4 rutor bort (${A.d0})`);
  ok(A.cause === '', `(1) väktarens svanssvep når inte 3,4 rutor (avstånd ${A.d0}, cause '${A.cause}')`);
  ok(A.moved < 0.05, `(1) spelaren knuffas inte när svepet missar (flyttad ${A.moved})`);
}

// (2) väktaren, spelaren 2,0 rutor bort: träff
const B = await ev(sweep, [2.0, 1.95, 2.05, 1.9, 2.1]);
if (valid(B, '(2) väktare 2,0')) {
  ok(B.cause === NAME, `(2) väktarens svanssvep träffar på 2,0 rutor (avstånd ${B.d0}, cause '${B.cause}')`);
  console.log(`(2) knuff bort från ormen: ${B.away} rutor (flyttad ${B.moved}; en vägg kan stoppa den)`);
}

// (3) kontroll: samma entitet med bossens räckvidd (range / 0,8), spelaren 3,4 rutor bort: träff
const r0 = await ev(() => { const b = window.__gb, r0 = b.d.range; b.d = { ...b.d, range: r0 / 0.8 }; return r0; });
const C = await ev(sweep, [A.placed ?? 3.4, 3.4, 3.45, 3.5, 3.55]); // samma avstånd som (1), bara räckvidden skiljer
await ev(r0 => { const b = window.__gb; b.d = { ...b.d, range: r0 }; }, r0);
if (valid(C, '(3) bossens räckvidd 3,4')) {
  ok(C.d0 >= 3.4 - 1e-6 && C.d0 < 3.6 && (A.placed === null || Math.abs(C.d0 - A.d0) < 0.02), `(3) samma avstånd som körning (1) (${C.d0} mot ${A.d0})`);
  ok(Math.abs(C.range - r0 / 0.8) < 1e-9, `(3) kontrollkörningen använde bossens räckvidd (${C.range})`);
  ok(C.cause === NAME, `(3) med bossens räckvidd träffar svanssvepet på 3,4 rutor (avstånd ${C.d0}, cause '${C.cause}')`);
  console.log(`(3) knuff bort från ormen: ${C.away} rutor (flyttad ${C.moved}; en vägg kan stoppa den)`);
}
ok(await ev(r0 => window.__gb.d.range === r0, r0), `väktarens räckvidd återställd (${r0})`);
ok(await ev(() => __game.state() === 'play'), 'spelet är kvar i play');
await done();
