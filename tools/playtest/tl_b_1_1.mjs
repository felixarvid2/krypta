// väktarnas frostnova (Isdraken) och faraostråle (Faraonen) skalas med samma faktor (0,7) som övriga väktaranfall; som boss är de oförändrade
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { ev, wait, ok, start, done } = await setup(PORT, 'out/tl_b_1_1');
await start(); // UTAN &god=1: hurtPlayer gör ingenting i gudläge

// bygg våningen med väktaren, gör övriga fiender ofarliga, ställ spelaren 3,5 rutor bort med fri sikt och väck väktaren
async function arena(id) {
  const found = await ev(id => {
    const g = __game, L = Gen.floor(4242, 3, { biome: 'dungeon', guardian: id }); g.run().depth = 3; g.startLevel(L);
    const b = g.ents().find(e => e.guardian && e.id === id); if (!b) return null;
    window.__gb = b;
    window.__calm = () => { // övriga fiender (även nyframkallade) och flygande skott stör inte mätningen
      for (const e of g.ents()) if (e !== b && !e.dead) e.d = { ...e.d, speed: 0, dmg: 0 };
      for (const p of g.projectiles()) p.dead = true;
    };
    window.__place = () => { // fri ruta 3–6 rutor från väktaren med fri sikt, helst 3,5
      const P = g.P;
      for (const r of [3.5, 3.3, 3.8, 4.2, 4.6, 5, 5.5, 3.1]) for (let k = 0; k < 48; k++) {
        const a = k / 48 * Math.PI * 2, x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r;
        if (g.freeSpot(x, y, 0.3) && g.hasLOS(x, y, b.x, b.y) && g.hasLOS(b.x, b.y, x, y)) { P.x = x; P.y = y; return r; }
      }
      return null;
    };
    window.__calm();
    const r = window.__place();
    b.hp -= 0.01; // väck väktaren
    return { r, x: +b.x.toFixed(2), y: +b.y.toFixed(2), state: g.state() };
  }, id);
  ok(!!found && found.r !== null, `väktaren ${id} finns och spelaren står ${found && found.r} rutor bort med fri sikt ` + JSON.stringify(found));
  if (!found || found.r === null) return false;
  { const t0 = Date.now(); while (Date.now() - t0 < 5000 && await ev(() => window.__gb.asleep)) await wait(100); }
  const awake = await ev(() => { const b = window.__gb; if (!b.asleep) { b.spT = 99; b.cd = 99; } return !b.asleep; }); // inga egna anfall medan banderoll/slowmo går över
  ok(awake, `väktaren ${id} har vaknat`);
  if (!awake) return false;
  await wait(1500);
  return true;
}

const resetP = () => { const P = __game.P; P.hp = 100; P.armor = 0; P.shield = 0; P.iframe = 0; P.jz = 0; P.vx = P.vy = 0; };

// frostnova: hp-förlusten i bildrutan där b.didHit först blir sann
const measureFrost = () => new Promise(res => {
  const g = __game, b = window.__gb, P = g.P;
  window.__calm(); const r = window.__place();
  P.hp = 100; P.armor = 0; P.shield = 0; P.iframe = 0; P.jz = 0; P.vx = P.vy = 0;
  b.spT = 99; b.cd = 99; b.stun = 0; b.didHit = false; b.spK = 1; b.t = 0; b.state = 'special';
  const t0 = performance.now(); let prev = P.hp, loss = null, dist = null, bad = null;
  const tick = () => {
    if (g.state() !== 'play' && !bad) bad = g.state();
    const hp = P.hp;
    if (loss === null && b.didHit) { loss = prev - hp; dist = Math.hypot(P.x - b.x, P.y - b.y); }
    prev = hp;
    if ((loss !== null && b.state !== 'special') || bad || performance.now() - t0 >= 4000) { b.cd = 99; b.spT = 99; res({ loss, dist, r, bad, guardian: b.guardian, hp }); }
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

// faraostråle: hp före och efter, när b.state inte längre är 'beam'
const measureBeam = () => new Promise(res => {
  const g = __game, b = window.__gb, P = g.P;
  window.__calm(); const r = window.__place();
  P.hp = 100; P.armor = 0; P.shield = 0; P.iframe = 0; P.jz = 0; P.vx = P.vy = 0;
  b.spT = 99; b.cd = 99; b.stun = 0; b.beamHitT = 0; b.beamDir = 1; b.beamA0 = Math.atan2(P.y - b.y, P.x - b.x) - 0.9; b.t = 0; b.state = 'beam';
  const hp0 = P.hp, t0 = performance.now(); let prev = P.hp, drops = 0, bad = null, sawBeam = false;
  const tick = () => {
    if (g.state() !== 'play' && !bad) bad = g.state();
    const hp = P.hp; if (hp < prev - 1e-9) drops++; prev = hp;
    if (b.state === 'beam') sawBeam = true;
    if (b.state !== 'beam' || bad || performance.now() - t0 >= 3000) { const ended = b.state !== 'beam'; b.cd = 99; b.spT = 99; res({ loss: hp0 - hp, drops, ended, sawBeam, r, bad, guardian: b.guardian, dist: Math.hypot(P.x - b.x, P.y - b.y) }); }
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

async function pair(id, label, measure) {
  const A = await ev(measure);
  await ev(() => { window.__gb.guardian = false; });
  const B = await ev(measure);
  await ev(() => { window.__gb.guardian = true; });
  console.log(label, 'A (väktare):', JSON.stringify(A));
  console.log(label, 'B (kontroll):', JSON.stringify(B));
  if (A.bad || B.bad) { ok(false, `OGILTIGT TEST (${label}): spelet bytte tillstånd under mätningen (A: ${A.bad || 'play'}, B: ${B.bad || 'play'})`); return; }
  if (A.drops !== undefined && (A.drops !== 1 || B.drops !== 1)) { ok(false, `OGILTIGT TEST (${label}): väntade exakt en träff per körning (A ${A.drops}, B ${B.drops}) – annan skada blandades in eller strålen missade`); return; }
  if (A.ended !== undefined) ok(A.ended && B.ended && A.sawBeam && B.sawBeam, `${label}: strålen svepte färdigt i båda körningarna inom 3 s (A ${A.drops} träff, B ${B.drops} träff)`);
  ok(A.guardian === true && B.guardian === false, `${label}: körning A mätte som väktare, körning B som boss`);
  ok(A.loss !== null && A.loss > 0, `${label}: väktaren skadar spelaren (A förlorar ${A.loss})`);
  ok(B.loss !== null && B.loss > 0, `${label}: bossen skadar spelaren (B förlorar ${B.loss})`);
  ok(A.loss !== null && B.loss !== null && A.loss < B.loss, `${label}: väktaren gör mindre skada än bossen (A ${A.loss} < B ${B.loss})`);
  const k = A.loss > 0 && B.loss > 0 ? A.loss / B.loss : 0;
  ok(k >= 0.6 && k <= 0.8, `${label} skalas som övriga väktaranfall: ${(+A.loss).toFixed(2)} / ${(+B.loss).toFixed(2)} = ${k.toFixed(3)} (väntat 0,6–0,8)`);
}

// 1) Isdrakens frostnova
if (await arena('frost')) await pair('frost', 'frostnova', measureFrost);
// 2) Faraonens stråle
if (await arena('pharaoh')) {
  await pair('pharaoh', 'faraostråle', measureBeam);
}
await ev(resetP);
await done();
