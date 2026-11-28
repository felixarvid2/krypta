// ---------- Grafik: fiender och bossar (FIENDER) – träffreaktion, död, gibs, spawn, skuggor, anfallstelegraf, bossfaser ----------
// Allt här är bara visning: positioner/skalor räknas fram vid ritningen (gfxEOff) och skrivs aldrig tillbaka till e.x/e.y; inga nya hitStop/slowmo.
const gfxE = { on: true, hits: 0, deaths: 0, gibs: 0, spawns: 0, tele: 0, phase: 0, bossBooms: 0, pools: 0, splats: 0, parts: 0, poses: 0 };
const GFXE_CHAR = [40, 32, 28], gfxEChars = []; // förkolnade lik: färgton och de som ryker just nu
const gfxEChar = o => gfxE.on && !!o.gBurnt && tmr - (o.gDeadT || -9) < 1.7;
const gfxEOff = { x: 0, y: 0, z: 0, f: 0 }; // förskjutning och vit blixt för spriten som ritas just nu
const gfxEDead = [], gfxEGrow = [], gfxEFly = []; // väntande blodpölar, pölar som växer, köttbitar i luften (alla med tak)
let gfxELvl = null, gfxELvlT = 0;
const gfxELow = () => !gfxE.on || settings.lowfx;
// gfxEPart: force = kärnåterkopplingen (bitarna) trängs inte undan av det mjuka taket – taket 260 i updateParticles tar de äldsta
function gfxEPart(p, force) { if (!force && particles.length > pcap(235)) return false; if (p.maxLife === undefined) p.maxLife = p.life; particles.push(p); gfxE.parts++; return true; }
function gfxEKind(e) { // vad fienden är gjord av: kött, ben, slem eller metall/sten
  if (e.gKind) return e.gKind; const s = (e.d && e.d.sheet) || '';
  return (e.gKind = e.d && e.d.stone || /golem|livearmor|clock|gear|steambot|spark|marionette|mirrorknight|templeguardian|gargoyle|crystal|shard|weepingangel/.test(s) ? 'metal'
    : /skeleton|bomber|^mage$|deathknight|mummy|drownedsailor|ghostpirate/.test(s) ? 'bone' : /blob|ooze|slime|sludge|larva|leech|toad|homunculus/.test(s) ? 'slime' : 'flesh');
}
const gfxEImg = { bone: null, bolt: null, tried: false }; // tools/gfx/fiender/make.py
function gfxELoad() { if (gfxEImg.tried) return; gfxEImg.tried = true; for (const k of ['bone', 'bolt']) load(`${A}gfx/gfx_en_${k}.png`).then(i => { gfxEImg[k] = strip(i, 4); }).catch(() => { /* valfri */ });
  load(`${A}gfx/part_star.png`).then(i => { gfxEImg.star = strip(i, 4); }).catch(() => { /* valfri */ }); } // stjärnan är fyra rutor 4×4 (fx.parts.star läser den som en bred ruta)
function gfxEBleed(e, n, x, y) { // träff/död: blod för kött, benflisor och damm för odöda, gnistor för metall, färgat slem
  const k = gfxE.on ? gfxEKind(e) : 'flesh';
  if (gfxE.on && e.frozen > 0) { // fryst: isflisor och glitter i stället för blod
    for (let i = 0; i < (settings.lowfx ? 1 : n); i++) { const a = rnd(0, TAU), sp = rnd(0.4, 1.4); gfxEPart({ x, y, z: rnd(0.35, 0.7), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(0.3, 1.6), life: rnd(0.4, 0.8), img: fx.hit[1], size: 0.05, add: true, fade: true, grav: true, tint: [190, 235, 255] }, true); }
    return;
  }
  if (v27NoBleed(e)) return; // version 27 (BLOOD): spöken, eld och urverk blöder inte (FX ritar virvlar och lågor)
  if (k === 'flesh' || e.d.ai === 'wisp') { for (let i = 0; i < n; i++) spawnBlood(x, y); return; }
  if (k === 'metal') { sparks(x, y, rnd(0.4, 0.7), settings.lowfx ? 1 : n + 1); return; }
  if (k === 'slime' && v27SlimeOff(x, y, n)) return; // version 27 (BLOOD): BLOD AV – slemmet stänker damm, inte färgat slem
  const lo = settings.lowfx, c = k === 'slime' ? gfxESlimeCol(e) : null, bi = gfxEImg.bone;
  for (let i = 0; i < (lo ? 1 : n); i++) { const a = rnd(0, TAU), sp = rnd(0.4, 1.4); gfxEPart({ x, y, z: rnd(0.35, 0.7), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(0.3, 1.6), life: rnd(0.4, 0.8),
    img: k === 'bone' ? (bi ? bi[i % 4] : fx.hit[0]) : fx.blood[(Math.random() * 3) | 0], size: k === 'bone' ? 0.06 : rnd(0.1, 0.16), grav: true, tint: k === 'bone' ? (bi ? null : [230, 220, 200]) : c }, true); }
  if (k === 'bone' && !lo && fx.parts.smoke) gfxEPart({ x, y, z: 0.5, vx: 0, vy: 0, vz: 0.3, life: 0.6, frames: fx.parts.smoke, img: fx.parts.smoke[0], size: 0.18, drift: true, tint: [215, 205, 185] }); // bendamm
}
const gfxESlimeCol = e => e.d.sheet === 'blob' ? [210, 40, 50] : e.d.sheet === 'inkslime' ? [70, 50, 110] : [120, 230, 90];
function gfxEHit(e, dmg, opt) { // från hurtEnemy: riktning (från spelaren) och styrka för knuff och squash
  if (!gfxE.on || opt.quiet || e.dead) return;
  const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy) || 1;
  e.gHitT = tmr; e.gHitX = dx / d; e.gHitY = dy / d; e.gHitK = clamp(dmg / Math.max(1, e.maxHp) * 4, 0.4, 1); gfxE.hits++;
}
function gfxEKill(e) { // från killEnemy (direkt efter e.dead = true)
  gfxE.deaths++; e.gDeadT = tmr;
  if (e.gHitX === undefined || tmr - (e.gHitT || -9) > 0.6) { const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy) || 1; e.gHitX = dx / d; e.gHitY = dy / d; e.gHitK = 0.6; }
  if (!e.boss && !gfxELow() && gfxEDead.length < 16) gfxEDead.push(e);
  if (gfxE.on && e.burn > 0 && !e.boss && !(e.frozen > 0) && !e.overkill && e.d.ai !== 'wisp' && e.type !== 'Ü' && enemyFrames[e.type]) { e.gBurnt = true; gfxE.chars++; if (gfxEChars.length < 8) gfxEChars.push(e); }
  v26cKill(e); // version 26C: huvudet lossnar vid ett dödande huvudskott
  v27Kill(e); // version 27 (BLOOD): kraftigare väggstänk, överdödens fontän och studsande bitar, fler pölar, stänk på skärmen
  v28Kill(e); // version 28 (REND): överdöd och smällar stänker blod i taket
}
function gfxEGib(e) { // från gib(): bitarna beror på vad fienden är gjord av; returnerar true om partiklarna är klara
  if (v27GibOff(e)) return true; // version 27 (BLOOD): BLOD AV – damm och stenflisor i stället för köttbitar
  if (!gfxE.on) return false;
  gfxE.gibs++; const k = gfxEKind(e), lo = settings.lowfx, n = lo ? 4 : 9, P2 = fx.parts;
  const fly = (img, size, tint, sp0, sp1, extra) => { const a = rnd(0, TAU), sp = rnd(sp0, sp1); return gfxEPart(Object.assign({ x: e.x + rnd(-0.1, 0.1), y: e.y + rnd(-0.1, 0.1), z: rnd(0.3, 0.7), vx: Math.cos(a) * sp + (e.gHitX || 0) * 1.2, vy: Math.sin(a) * sp + (e.gHitY || 0) * 1.2, vz: rnd(1.8, 3.8), life: rnd(1.6, 2.6), img, size, grav: true, bounce: true, tint }, extra), true); };
  if (k === 'bone') {
    const bi = gfxEImg.bone; for (let i = 0; i < n; i++) fly(bi ? bi[i % 4] : P2.rock ? P2.rock[0] : fx.hit[0], bi ? rnd(0.12, 0.18) : rnd(0.05, 0.09), bi ? null : [235, 225, 200], 1, 3, bi ? { frames: bi, flap: true } : null);
    if (P2.skull) fly(P2.skull[0], 0.14, [230, 220, 200], 0.8, 1.6);
    if (!lo && P2.smoke) for (let i = 0; i < 2; i++) gfxEPart({ x: e.x + rnd(-0.3, 0.3), y: e.y + rnd(-0.3, 0.3), z: rnd(0.1, 0.6), vx: rnd(-0.4, 0.4), vy: rnd(-0.4, 0.4), vz: 0.3, life: 1.1, frames: P2.smoke, img: P2.smoke[0], size: rnd(0.25, 0.35), drift: true, tint: [215, 205, 185] }); // bendamm
  } else if (k === 'slime') {
    const c = gfxESlimeCol(e), f = P2.sludge || P2.acid || fx.blood;
    for (let i = 0; i < n + 2; i++) fly(f[i % f.length], rnd(0.08, 0.14), c, 1, 3.4);
    if (!lo && P2.sludge) for (let i = 0; i < 3; i++) { decals.push({ x: e.x + rnd(-0.5, 0.5), y: e.y + rnd(-0.5, 0.5), img: P2.sludge[i % P2.sludge.length], size: rnd(0.05, 0.09), life: 25 }); if (decals.length > 70) decals.shift(); }
  } else if (k === 'metal') {
    const bo = gfxEImg.bolt; for (let i = 0; i < n; i++) { const f = bo && i % 2 ? bo : P2.gear; fly(f ? f[i % f.length] : fx.shards[7], f === bo ? rnd(0.09, 0.13) : rnd(0.05, 0.1), null, 1, 3, f ? { frames: f, flap: true } : null); } // skruvar och kugghjul
    if (!lo) for (let i = 0; i < 8; i++) gfxEPart({ x: e.x, y: e.y, z: rnd(0.3, 0.8), vx: rnd(-2.5, 2.5), vy: rnd(-2.5, 2.5), vz: rnd(1, 3), life: 0.5, img: fx.hit[2], size: 0.05, add: true, tint: [255, 210, 120], grav: true });
  } else {
    const f = P2.gib;
    for (let i = 0; i < n; i++) { const ok = fly(f ? f[i % f.length] : fx.blood[i % 3], rnd(0.08, 0.13), null, 1, 3.2, f ? { frames: f, flap: true } : null); if (ok && !lo && gfxEFly.length < 12) { const p = particles[particles.length - 1]; p.gT0 = tmr; gfxEFly.push(p); } }
    if (!lo) for (let i = 0; i < 2; i++) spawnBlood(e.x, e.y);
  }
  return true;
}
function gfxESpawnFx(e) { // mörk portal/rökpuff och damm när en fiende dyker upp mitt i striden
  if (gfxELow()) return; const P2 = fx.parts, many = tmr - (gfxE.spT || -9) < 0.2; gfxE.spT = tmr; // många på en gång (delade slem, vågor): bara hålet och några gnistor
  if (P2.shadow) gfxEPart({ x: e.x, y: e.y, z: 0, vx: 0, vy: 0, vz: 0, life: 0.7, img: P2.shadow[0], size: 0.09 * e.d.size, tint: [60, 30, 90] }); // ett mörkt hål i golvet
  if (P2.smoke && !many) for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + rnd(-0.3, 0.3); gfxEPart({ x: e.x + Math.cos(a) * 0.2, y: e.y + Math.sin(a) * 0.2, z: 0.05, vx: Math.cos(a) * 0.9, vy: Math.sin(a) * 0.9, vz: 0.25, life: 0.7, frames: P2.smoke, img: P2.smoke[0], size: 0.16, drift: true, tint: [200, 185, 160] }); } // damm som pressas ut
  for (let i = 0; i < (many ? 2 : 5); i++) gfxEPart({ x: e.x + rnd(-0.25, 0.25), y: e.y + rnd(-0.25, 0.25), z: rnd(0, 0.3), vx: 0, vy: 0, vz: rnd(0.8, 1.6), life: 0.6, img: fx.hit[1], size: 0.04, add: true, fade: true, drift: true, tint: [170, 90, 255] }); // gnistor ur portalen
}
function gfxERing(x, y, n, sp, col, size = 0.08) { for (let i = 0; i < n; i++) { const a = i / n * TAU; gfxEPart({ x, y, z: 0.1, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0.1, life: 0.55, img: fx.hit[1], size, add: true, tint: col, fade: true, drift: true }); } }
function gfxETick(dt) { // från update(): spawn, väntande blodpölar, växande pölar, köttbitar som landar, bossfaser och bossdöd
  gfxELoad(); if (gfxE.on) gfxEIntroTick(dt); if (lvl !== gfxELvl) { gfxELvl = lvl; gfxELvlT = tmr; gfxEDead.length = gfxEGrow.length = gfxEFly.length = gfxEChars.length = 0; }
  gfxECharTick(dt);
  v26cTick(); // version 26C: blodfontänen ur halsen
  const fresh = tmr - gfxELvlT < 1.5;
  for (const e of ents) {
    if (e.gBorn === undefined) { e.gBorn = fresh || !gfxE.on || e.boss || e.dead || e.hidden || e.under || e.dormant || e.asleep || e.dummy || Math.hypot(e.x - P.x, e.y - P.y) > 16 ? -9 : tmr; if (e.gBorn === tmr) { gfxE.spawns++; gfxESpawnFx(e); } }
    if (!e.dead && gfxE.on && !e.dying) gfxEStatus(e, dt); // brinner, fryst, gift, blöder, långsam, rädd
    if (!e.boss) { if (e.dead || !gfxE.on) continue;
      if (e.gDorm && !e.dormant) { e.gHitT = tmr; e.gHitX = e.gHitY = 0; e.gHitK = 1; } e.gDorm = !!e.dormant; // mimicen/statyn vaknar: ett ryck
      if ((e.charge > 0 || e.leapT > 0) && !settings.lowfx && fx.parts.smoke && Math.random() < dt * 14 && Math.abs(e.x - P.x) < 12 && Math.abs(e.y - P.y) < 12) gfxEPart({ x: e.x + rnd(-0.15, 0.15), y: e.y + rnd(-0.15, 0.15), z: 0.03, vx: rnd(-0.3, 0.3), vy: rnd(-0.3, 0.3), vz: 0.3, life: 0.5, frames: fx.parts.smoke, img: fx.parts.smoke[0], size: 0.14, drift: true, tint: [190, 175, 150] }); // damm under språng och stormning
      continue; }
    if (e.gPh === undefined) e.gPh = e.phase;
    else if (e.phase > e.gPh) { e.gPh = e.phase; e.gPhT = tmr; gfxE.phase++; // fasbyte: chockvåg, ljus och blixt
      flashes.push({ x: e.x, y: e.y, t: 0.45, r: 7, col: [255, 120, 80] }); P.boom = Math.max(P.boom, 0.22);
      if (!gfxELow()) { gfxERing(e.x, e.y, 18, 5, [255, 140, 70], 0.1); gfxERing(e.x, e.y, 10, 2.5, [255, 230, 180], 0.07); } }
    if (e.dying > 0) { const st = Math.floor(e.dying / 0.6); if (st > (e.gDS || 0)) { e.gDS = st; e.gDST = tmr; gfxE.bossBooms++; // dödsanimationen i steg
      flashes.push({ x: e.x, y: e.y, t: 0.3, r: 6 + st, col: [255, 170, 90] }); P.boom = Math.max(P.boom, 0.12 + st * 0.05);
      for (let i = 0; i < (settings.lowfx ? 1 : 3); i++) explodeFx(e.x + rnd(-1.2, 1.2), e.y + rnd(-1.2, 1.2), rnd(0.4, 1.8));
      if (!gfxELow()) gfxERing(e.x, e.y, 10 + st * 2, 3 + st, [255, 160, 80]); } }
    if (e.dead && !e.gFinal && e.gDS) { e.gFinal = true; gfxE.bossBooms++; flashes.push({ x: e.x, y: e.y, t: 0.6, r: 10, col: [255, 220, 160] }); P.boom = Math.max(P.boom, 0.35); // sista smällen
      if (!gfxELow()) { gfxERing(e.x, e.y, 24, 6, [255, 200, 120], 0.12); const f = fx.parts.gib || fx.parts.rock; if (f) for (let i = 0; i < 10; i++) { const a = rnd(0, TAU), sp = rnd(2, 4.5); gfxEPart({ x: e.x, y: e.y, z: rnd(0.5, 1.5), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(2, 4), life: 2.2, img: f[i % f.length], frames: f, flap: true, size: rnd(0.12, 0.2), grav: true, bounce: true }); } } }
  }
  v27Tick(dt); // version 27 (BLOOD): pölar som växer, bitar som landar, blodiga fotspår (BLOD AV tömmer gfxEDead)
  v28Tick(dt); // version 28 (REND): droppar från taket, BLOD AV tar bort takblodet, genomsiktliga rutor
  for (let i = gfxEDead.length - 1; i >= 0; i--) { const e = gfxEDead[i]; if (tmr - e.gDeadT < 0.3) continue; gfxEDead.splice(i, 1); // liket har landat: en pöl som växer under det
    if (e.gibbed || gfxELow() || !ents.includes(e)) continue; const k = gfxEKind(e); if (k === 'metal' || k === 'bone' || e.d.ai === 'wisp') continue;
    const f = k === 'slime' ? fx.parts.sludge : fx.parts.blood_pool; if (!f || solid(e.x, e.y)) continue;
    const d = { x: e.x + (e.gHitX || 0) * 0.25, y: e.y + (e.gHitY || 0) * 0.25, img: f[(Math.random() * f.length) | 0], size: 0.02, gTo: rnd(0.13, 0.18) * Math.min(1.4, e.d.size), flip: Math.random() < 0.5 };
    decals.push(d); if (decals.length > 70) decals.shift(); gfxE.pools++; if (gfxEGrow.length < 12) gfxEGrow.push(d); }
  for (let i = gfxEGrow.length - 1; i >= 0; i--) { const d = gfxEGrow[i]; d.size += (d.gTo - d.size) * Math.min(1, dt * 1.5); if (d.gTo - d.size < 0.006) gfxEGrow.splice(i, 1); }
  for (let i = gfxEFly.length - 1; i >= 0; i--) { const p = gfxEFly[i]; if (p.life <= 0 || tmr - p.gT0 > 3) { gfxEFly.splice(i, 1); continue; } // (borttagen av partikeltaket: släpp efter 3 s) // köttbitar sätter blodstänk där de slår ned
    if (p.z <= 0.001 && p.vz <= 0 && !p.gS && fx.parts.blood_trail && !solid(p.x, p.y)) { p.gS = 1; gfxE.splats++; decals.push({ x: p.x, y: p.y, img: fx.parts.blood_trail[(Math.random() * 2) | 0], size: 0.04, life: 20 }); if (decals.length > 70) decals.shift(); gfxEFly.splice(i, 1); } }
}
function gfxEShadowK(o) { // flygare: skuggan krymper med höjden
  if (o.airZ > 0) return v26bShadowK(o); // version 26B (krokrad, B): jonglering – skuggan krymper med höjden
  if (!((o.d.ai === 'fly' || o.d.ai === 'wisp' || o.d.float) && !o.anchored)) return 1;
  return clamp(0.85 - (0.3 + Math.sin(tmr * 3 + o.x) * 0.06) * 1.1, 0.35, 1);
}
function gfxEPose(o, set) { // squash & stretch, knuff, andning, gångstuds, spawn och dödsfall för en vanlig fiende
  gfxEOff.x = gfxEOff.y = gfxEOff.z = gfxEOff.f = 0; gfxEOff.t = null; if (!gfxE.on) return; gfxE.poses++;
  const hk = tmr - (o.gHitT || -9), hx = o.gHitX || 0, hy = o.gHitY || 0, K = o.gHitK || 0.6;
  if (o.dead && o.gBurnt) { // förkolnad: svart, sjunker ned i golvet efter en halv sekund
    const k = tmr - (o.gDeadT || -9); gfxEOff.t = GFXE_CHAR; spriteClip = 1;
    if (k > 0.5) gfxEOff.z = -Math.min(1, (k - 0.5) / 1.1) * o.d.size * 1.2;
    return;
  }
  if (o.dead && o.v26hd && v26cPose(o, K, hx, hy)) return; // version 26C: huvudlös kropp
  if (o.dead) { // faller bakåt i skottriktningen, studsar lätt mot golvet och blir liggande
    const k = tmr - (o.gDeadT || -9); if (k > 2 || k < 0) { const s = 0.2 * K; gfxEOff.x = hx * s; gfxEOff.y = hy * s; return; }
    const p = Math.min(1, k / 0.35), s = (1 - (1 - p) * (1 - p)) * 0.2 * K; gfxEOff.x = hx * s; gfxEOff.y = hy * s;
    if ((o.d.ai === 'fly' || o.d.float) && !o.anchored && k < 0.4) { const q = k / 0.4; gfxEOff.z = 0.3 * (1 - q * q); return; } // flygare faller ned till golvet
    if (k < 0.3) gfxEOff.z = Math.sin(k / 0.3 * Math.PI) * 0.07 * K;
    else if (k < 0.5) { const q = Math.sin((k - 0.3) / 0.2 * Math.PI) * 0.14; spriteSY = 1 - q; spriteSX = 1 + q * 0.7; }
    return;
  }
  if (hk >= 0 && hk < 0.28) { // träff: tryck ihop, sträck ut, sätt dig – och en knuff bort från skottet
    const p = hk / 0.28, s = Math.sin(p * Math.PI * 2) * (1 - p) * 0.2 * K;
    spriteSY = 1 - s; spriteSX = 1 + s * 0.8; const push = Math.sin(Math.min(1, p * 1.6) * Math.PI) * 0.09 * K; gfxEOff.x = hx * push; gfxEOff.y = hy * push;
  }
  if (o.dormant || o.frozen > 0) return; // mimicen och statyn får inte röja sig
  if (o.state === 'attack' && set && set.attack && o.d.atkFps) { const hit = set.attack.length / o.d.atkFps * o.d.hitAt, a = hit - o.t; // anfall: sträck på dig före slaget, tryck ihop i slaget
    if (a > 0 && a < 0.22) { const k = 1 - a / 0.22; spriteSY *= 1 + 0.07 * k; spriteSX *= 1 - 0.035 * k; } else if (a <= 0 && a > -0.14) { const k = 1 + a / 0.14; spriteSY *= 1 - 0.08 * k; spriteSX *= 1 + 0.06 * k; } }
  if (o.gBorn > 0 && tmr >= o.gBorn && tmr - o.gBorn < 0.5) { const p = (tmr - o.gBorn) / 0.5; gfxEOff.z -= (1 - p) * (1 - p) * o.d.size * 1.1; spriteClip = 1; spriteSY *= 0.85 + 0.15 * p + Math.sin(p * Math.PI) * 0.12; } // stiger upp ur golvet
  if (o.state === 'idle' && set && set.idle && set.idle.length <= 4) { const b = Math.sin(tmr * 2.6 + o.x * 3); spriteSY *= 1 + 0.03 * b; spriteSX *= 1 - 0.015 * b; } // andas
  else if (o.state === 'move' && set && set.move && set.move.length <= 6 && (o.mvx || o.mvy) && !(o.d.ai === 'fly' || o.d.ai === 'wisp' || o.d.float)) { const b = Math.abs(Math.sin(tmr * 8 * o.d.speed / 1.3 + o.x)); gfxEOff.z += b * 0.035; spriteSY *= 0.97 + b * 0.05; } // gångstuds
}
function gfxETele(o) { // skyttar: glöd i handen strax före skottet
  if (!gfxE.on || o.dead || o.d.melee || o.state !== 'attack' || o.didHit || (o.ghost > 0.5)) return;
  const set = enemyFrames[o.type]; if (!set || !set.attack) return;
  const hit = set.attack.length / o.d.atkFps * o.d.hitAt, k = 1 - (hit - o.t) / 0.35; if (k <= 0 || k > 1) return;
  gfxE.tele++;
  const { dirX, dirY } = view, col = PROJ_TINT[o.d.proj] || [255, 140, 60];
  if (efxCharge(o, k, col)) return; // version 25: Effekseer-laddningen för magiska skott
  drawSprite(settings.lowfx ? fx.hit[1] : fx.fireball[Math.floor(tmr * 16) % 8], o.x - dirX * 0.08, o.y - dirY * 0.08, 0.12 + 0.14 * k, o.d.size * 0.55 - 0.06 * k, false, 0.9 + k * 0.9, 0, 0, true, col);
}
function gfxEBoss(o) { // bossar: skugga, tyngre träffreaktion (skakning), fasbytets puls och dödsanimationens skakningar
  gfxEOff.x = gfxEOff.y = gfxEOff.z = gfxEOff.f = 0; if (!gfxE.on) return; const sk = clamp(settings.shake ?? 1, 0, 1), nf = settings.noFlash ? 0 : 1, plX = view.plX / (view.pk || 1) * sk, plY = view.plY / (view.pk || 1) * sk, sz = o.d.size * (o.formK || 1);
  if (fx.parts.shadow && !o.hidden && !(o.dying > 0)) drawSprite(fx.parts.shadow[0], o.x, o.y, 0.05 * sz, 0, false, null, 0, 0);
  const hk = tmr - (o.gHitT || -9);
  if (hk >= 0 && hk < 0.2) { const j = Math.sin(tmr * 95) * 0.05 * (1 - hk / 0.2) * (o.gHitK || 0.5); gfxEOff.x = plX * j; gfxEOff.y = plY * j; const s = Math.sin(hk / 0.2 * Math.PI) * 0.05; spriteSY = 1 - s; spriteSX = 1 + s * 0.6; }
  gfxEIntroPose(o, plX, plY); // bossintrot: vrål-pose
  const pk = tmr - (o.gPhT || -9); if (pk >= 0 && pk < 0.7) { const s = Math.sin(pk / 0.7 * Math.PI); spriteSX *= 1 + 0.14 * s; spriteSY *= 1 + 0.1 * s; gfxEOff.f = (Math.floor(pk * 20) % 2 === 0 ? 0.09 : 0) * (1 - pk / 0.7) * nf; } // blinket stängs av med MINSKADE BLIXTAR
  if (o.dying > 0) { const a = 0.03 + o.dying * 0.035, j = Math.sin(tmr * 70) * a, j2 = Math.cos(tmr * 53) * a; gfxEOff.x = plX * j + view.dirX * j2 * 0.3 * sk; gfxEOff.y = plY * j + view.dirY * j2 * 0.3 * sk; spriteClip = 1;
    if (tmr - (o.gDST || -9) < 0.12) gfxEOff.f = 0.12 * nf; }
}
function gfxEApi() { return { st: gfxE, set: v => { gfxE.on = !!v; }, grow: () => gfxEGrow.length, fly: () => gfxEFly.length,
  few: () => { const r = { idle: [], move: [] }; for (const [t, s] of Object.entries(enemyFrames)) { if (s.idle && s.idle.length <= 4) r.idle.push(t); if (s.move && s.move.length <= 6) r.move.push(t); } return r; }, // vilka andas / gångstudsar
  bench: (n = 300) => { const t0 = performance.now(); for (let i = 0; i < n; i++) { gfxETick(0); for (const e of ents) if (!e.boss && enemyFrames[e.type]) gfxEPose(e, enemyFrames[e.type]); } spriteSX = spriteSY = 1; spriteClip = 0; return (performance.now() - t0) / n; } }; } // ms per bildruta för FIENDERs logik
// ---------- FIENDER omgång 2: synliga statuseffekter, elitaura och bossintro ----------
const gfxEIntro = { t: -1, b: null, roared: false, bbPrev: 0 }; // bossintrot: tid sedan bossens namn kom upp (speltid), vilken boss
Object.assign(gfxE, { status: 0, stars: 0, aura: 0, bars: 0, intros: 0, roars: 0, chars: 0, shards: 0 });
function gfxECharTick(dt) { // förkolnade lik ryker och glöder medan de sjunker
  for (let i = gfxEChars.length - 1; i >= 0; i--) { const e = gfxEChars[i], k = tmr - e.gDeadT; if (k > 1.7 || k < 0) { gfxEChars.splice(i, 1); continue; }
    if (settings.lowfx || Math.abs(e.x - P.x) > 12 || Math.abs(e.y - P.y) > 12) continue; const sz = e.d.size, top = Math.max(0.1, sz * (1 - Math.max(0, k - 0.5) / 1.1));
    if (fx.parts.smoke && Math.random() < dt * 5) gfxEPart({ x: e.x + rnd(-0.15, 0.15) * sz, y: e.y + rnd(-0.15, 0.15) * sz, z: rnd(0.1, 0.8) * top, vx: 0, vy: 0, vz: 0.55, life: 1, frames: fx.parts.smoke, img: fx.parts.smoke[0], size: 0.22 * sz, drift: true, tint: [70, 62, 58] });
    if (Math.random() < dt * 12) gfxEPart({ x: e.x + rnd(-0.2, 0.2) * sz, y: e.y + rnd(-0.2, 0.2) * sz, z: rnd(0.05, 0.9) * top, vx: rnd(-0.3, 0.3), vy: rnd(-0.3, 0.3), vz: rnd(0.4, 1.1), life: 0.6, img: fx.parts.ember ? fx.parts.ember[0] : fx.hit[1], size: 0.035, add: true, fade: true, drift: true, tint: [255, 130, 40] }); }
}
function gfxEShatter(e) { // från shatter(): ljusblå skärvor och glitter (de vanliga isbitarna flyger redan)
  if (!gfxE.on) return; gfxE.shards++; const n = settings.lowfx ? 0 : 10, f = fx.parts.ice;
  for (let i = 0; i < n; i++) { const a = rnd(0, TAU), sp = rnd(0.5, 2.2); gfxEPart({ x: e.x, y: e.y, z: rnd(0.2, 0.9) * e.d.size, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(0.5, 2), life: rnd(0.5, 0.9), img: fx.hit[1], size: 0.05, add: true, fade: true, grav: true, tint: [190, 235, 255] }); }
  if (f && !settings.lowfx) for (let i = 0; i < 4; i++) { const a = rnd(0, TAU), sp = rnd(1, 2.5); gfxEPart({ x: e.x, y: e.y, z: rnd(0.4, 1) * e.d.size, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(1.5, 3), life: rnd(1, 1.6), img: f[i % f.length], size: rnd(0.12, 0.18), grav: true, bounce: true, tint: [200, 235, 255] }, true); }
}
function gfxEAura(o) { // pulserande kontur i elitens/championens färg (pixelformat ABGR); 0 = ingen kontur
  if (!gfxE.on || settings.lowfx) return 0; gfxE.aura++;
  const c = o.frozen > 0 ? [190, 235, 255] : o.champion ? [255, 215, 90] : (o.elite && o.elite.tint) || [255, 80, 200], k = o.frozen > 0 ? 0.85 + 0.15 * Math.sin(tmr * 9) : 0.5 + 0.5 * Math.sin(tmr * 5 + o.x * 2); // fryst: isig kant
  return (0xff000000 | (((c[2] * k) | 0) << 16) | (((c[1] * k) | 0) << 8) | ((c[0] * k) | 0)) >>> 0;
}
function gfxEHead(img) { // hur högt upp i rutan figuren når (0–1), räknas en gång per bild och sparas på bilden
  if (!img || !img.data) return 0.9; if (img.gHead !== undefined) return img.gHead;
  let top = img.h; for (let y = 0; y < img.h && top === img.h; y++) for (let x = 0; x < img.w; x++) if (img.data[y * img.w + x] >>> 24 >= 100) { top = y; break; }
  return (img.gHead = top >= img.h ? 0.9 : 1 - top / img.h);
}
function gfxEOver(o, d2) { // ovanpå spriten: stjärnor som snurrar runt huvudet på en bedövad fiende
  if (!gfxE.on || o.dead || !(o.stun > 0.15) || !o.alert || o.dormant || o.frozen > 0 || d2 > 150 || (o.ghost > 0.5) || !enemyFrames[o.type]) return; // vilande/mimic: stun räknas inte ned – inga stjärnor som röjer dem
  const n = settings.lowfx ? 1 : 3, r = 0.16 * o.d.size, z = gfxEOff.z + ((o.d.ai === 'fly' || o.d.float) && !o.anchored ? 0.3 : 0) + gfxEHead(enemyFrame(o)) * o.d.size * 1.15 + 0.03; gfxE.stars++;
  for (let i = 0; i < n; i++) { const a = tmr * 6 + i * TAU / n; drawSprite(fx.hit[1], o.x + gfxEOff.x + Math.cos(a) * r, o.y + gfxEOff.y + Math.sin(a) * r, 0.08 + 0.02 * Math.sin(tmr * 20 + i * 2), z + Math.sin(a * 2) * 0.02, false, 2, 0, 0, true, [255, 190, 30]); }
}
function gfxEStatus(e, dt) { // partiklar för status: brinner, fryst, förgiftad, blöder, långsam, rädd (billigt: bara nära, aldrig med lowfx)
  if (settings.lowfx || !(e.burn > 0 || e.frozen > 0 || e.poison > 0 || e.bleed > 0 || e.fleeT > 0 || e.gShockT > tmr)) return; // inget aktivt: inga closures
  if (e.hidden || e.dormant || (e.ghost > 0.5) || Math.abs(e.x - P.x) > 10 || Math.abs(e.y - P.y) > 10) return;
  const sz = e.d.size * (e.formK || 1) * (e.boss ? 0.8 : 1), z0 = (e.d.ai === 'fly' || e.d.float) && !e.anchored && !e.boss ? 0.3 : 0, m = e.boss ? 2 : 1;
  const R = () => rnd(-0.17, 0.17) * sz, H = () => z0 + rnd(0.1, 0.85) * sz, P2 = fx.parts, at = (r) => Math.random() < dt * r * m;
  if (e.burn > 0) { // små lågor på kroppen och rök överst
    if (at(12)) { gfxE.status++; gfxEPart({ x: e.x + R(), y: e.y + R(), z: H(), vx: 0, vy: 0, vz: rnd(0.4, 0.9), life: 0.35, frames: fx.fire, img: fx.fire[0], size: 0.17 * sz, add: true, drift: true }); }
    if (P2.smoke && at(2)) gfxEPart({ x: e.x + R(), y: e.y + R(), z: z0 + sz * 0.9, vx: 0, vy: 0, vz: 0.5, life: 0.9, frames: P2.smoke, img: P2.smoke[0], size: 0.2 * sz, drift: true, tint: [80, 70, 65] }); }
  if (e.frozen > 0) { // iskristaller som glimtar, små isflisor som faller
    if (at(5)) { gfxE.status++; gfxEPart({ x: e.x + R(), y: e.y + R(), z: H(), vx: 0, vy: 0, vz: 0, life: 0.4, img: fx.hit[1], size: 0.045, add: true, fade: true, drift: true, tint: [200, 235, 255] }); }
    if (P2.ice && at(1.2)) gfxEPart({ x: e.x + R(), y: e.y + R(), z: H(), vx: 0, vy: 0, vz: 0, life: 0.8, img: P2.ice[(Math.random() * P2.ice.length) | 0], size: 0.05, grav: true }); }
  if (e.poison > 0 && at(2)) { gfxE.status++; const f = P2.bubble2 || P2.bubble; gfxEPart({ x: e.x + R(), y: e.y + R(), z: H(), vx: 0, vy: 0, vz: rnd(0.25, 0.45), life: 0.8, img: f ? f[0] : fx.hit[1], size: 0.06, drift: true, sway: rnd(0, 6), frames: f || fx.hit, tint: [130, 255, 90] }); } // gröna bubblor
  if (e.gShockT > tmr && at(16)) { gfxE.status++; const f = P2.lightning || P2.lightning2; gfxEPart({ x: e.x + R() * 0.6, y: e.y + R() * 0.6, z: H() - 0.1 * sz, vx: 0, vy: 0, vz: 0, life: 0.12, frames: f || fx.hit, img: (f || fx.hit)[0], size: 0.28 * sz, add: true, tint: [170, 215, 255] }); } // elektrisk: blixtbågar på kroppen
  // blöder: statusTick tappar redan en liten blodspårsdroppe var 0,4 s – här några större; gift: statusFx ger gröna glödkorn – här bubblor
  if (e.bleed > 0 && at(2)) { gfxE.status++; gfxEPart({ x: e.x + R(), y: e.y + R(), z: z0 + rnd(0.3, 0.7) * sz, vx: 0, vy: 0, vz: 0, life: 0.6, img: fx.blood[(Math.random() * 3) | 0], size: 0.08, grav: true }); } // droppar
  if (e.fleeT > 0 && at(2.5)) { gfxE.status++; gfxEPart({ x: e.x + R(), y: e.y + R(), z: z0 + sz * 0.95, vx: rnd(-0.6, 0.6), vy: rnd(-0.6, 0.6), vz: 0.9, life: 0.5, img: P2.drop ? P2.drop[0] : fx.hit[1], size: 0.05, grav: true, add: true, fade: true, tint: [150, 200, 255] }); } // svettdroppar av rädsla
}
function gfxEZap(x, y, tint) { // elektrisk: blå/vita strålar laddar fienden vid strålens slut
  if (!gfxE.on || !tint || !ents || !(tint[2] > 200 && tint[0] < 200)) return;
  let best = null, bd = 0.5; for (const e of ents) { if (e.dead) continue; const d = Math.abs(e.x - x) + Math.abs(e.y - y); if (d < bd) { bd = d; best = e; } }
  if (best) best.gShockT = tmr + 0.5;
}
function gfxEIntroTick(dt) { // bossintrot: när namnet kommer upp (bossBanner) – vrål-pose, chockvåg och band
  if (bossBanner > gfxEIntro.bbPrev + 0.3 && (boss || guardianE)) { gfxEIntro.t = 0; gfxEIntro.b = boss || guardianE; gfxEIntro.roared = false; gfxE.intros++; }
  gfxEIntro.bbPrev = bossBanner; if (gfxEIntro.t < 0) return;
  gfxEIntro.t += dt; const b = gfxEIntro.b; if (bossBanner <= 0 || !b || b.dead) { gfxEIntro.t = -1; return; }
  if (!gfxEIntro.roared && gfxEIntro.t > 0.5) { gfxEIntro.roared = true; gfxE.roars++; // vrålet: damm och en ring längs golvet, ljus
    flashes.push({ x: b.x, y: b.y, t: 0.5, r: 6, col: [255, 150, 90] });
    if (!gfxELow()) { gfxERing(b.x, b.y, 16, 4, [230, 190, 140], 0.09); if (fx.parts.smoke) for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; gfxEPart({ x: b.x + Math.cos(a) * 0.5, y: b.y + Math.sin(a) * 0.5, z: 0.05, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6, vz: 0.2, life: 0.9, frames: fx.parts.smoke, img: fx.parts.smoke[0], size: 0.3, drift: true, tint: [190, 170, 140] }); } } }
}
function gfxEIntroPose(o, plX, plY) { // bossen vrålar: sträcker på sig och darrar en stund efter att namnet kommit upp
  if (!gfxE.on || gfxEIntro.t < 0 || gfxEIntro.b !== o) return;
  if (!settings.lowfx && bossBanner > 0.15) { const k = 0.6 + 0.4 * Math.sin(tmr * 8), f = Math.min(1, bossBanner / 0.6); spriteOutline = (0xff000000 | (((40 * k * f) | 0) << 16) | (((90 * k * f) | 0) << 8) | ((255 * k * f) | 0)) >>> 0; } // fokus: glödande kant medan namnet visas
  if (settings.reduceMotion) return; const r = gfxEIntro.t - 0.45; if (r <= 0 || r >= 1.2) return;
  const s = Math.sin(r / 1.2 * Math.PI), j = Math.sin(tmr * 80) * 0.045 * s; spriteSY *= 1 + 0.12 * s; spriteSX *= 1 + 0.05 * s; gfxEOff.x += plX * j; gfxEOff.y += plY * j;
}
function gfxEIntroBars(g) { // svarta band upp och ned medan bossen presenteras (ritas före namnet; hörnen ritas ovanpå)
  if (!gfxE.on || gfxEIntro.t < 0 || state !== 'play') return; const k = clamp(Math.min(gfxEIntro.t / 0.35, bossBanner / 0.5), 0, 1); if (k <= 0) return;
  const h = Math.round(16 * k * (2 - k)); g.fillStyle = '#000'; g.fillRect(0, 0, W, h); g.fillRect(0, VH - h, W, h); gfxE.bars++;
}
function gfxESubA() { // undertiteln tonar in först när namnet har landat (efter 0,25 s)
  if (!gfxE.on || gfxEIntro.t < 0 || settings.reduceMotion) return 1;
  return clamp((gfxEIntro.t - 0.25) / 0.2, 0, 1);
}
function gfxEBossName(s, a) { // bossens namn slår in: stort → normalt, med en kort skakning (reduceMotion: som förut)
  const g = ctx; g.font = '16px "PressStart2P"'; const w = g.measureText(plain(s)).width, t = gfxE.on && gfxEIntro.t >= 0 ? gfxEIntro.t : 9, rm = !!settings.reduceMotion;
  const k = rm ? 1 : 1 + 1.6 * Math.max(0, 1 - t / 0.22) ** 2, sh = rm ? 0 : clamp(settings.shake ?? 1, 0, 1) * (t > 0.22 && t < 0.6 ? (0.6 - t) * 8 : 0);
  const mp = HL && showMap && HL.map.y < 66 ? HL.map.x - 4 - W / 2 : W / 2, fit = Math.min(1, (W - 2 * hudIX - 8) / w, 2 * Math.min(mp, W / 2 - hudIX - 4) / w); // MENY: krymps så att namnet varken klipps (stående) eller hamnar under minikartan // MENY: stående telefon – långa namn krymps så att de inte klipps vid kanterna
  if (k === 1 && !sh && fit === 1) { txt(s, (W - w) / 2, 50, '#ff5030', 2, true, a); return; }
  g.save(); g.translate(W / 2 + Math.sin(tmr * 90) * sh, 44 + Math.cos(tmr * 70) * sh * 0.6); g.scale(k * fit, k * fit); g.translate(-W / 2, -44); txt(s, (W - w) / 2, 50, '#ff5030', 2, true, a * Math.min(1, 0.3 + t * 4)); g.restore();
}
// ---------- Grafik: världen (VÄRLD) – rinnande vätskor, levande ljus, luftpartiklar, glimtande föremål, kistor, dörrdamm och sotmärken ----------
// Vätskorna animeras i texturrymden (egna buffertar, 15 gånger/s) så golvloopen i render() är orörd. settings.lowfx (och gfxW.off) stänger av allt.
const gfxW = { off: false, t: 0, acc: 0, ticks: 0, lvl: null, used: [], scanT: 0, buf: {}, active: false, lastL: 0, air: 0, embers: 0, bubbles: 0, glints: 0, chests: 0, doors: 0, scorch: 0, bolts: 0, spins: 0, steps: 0, mech: 0 };
const GFXW_LIQ = { // [textur, textur för ruta 2, { a: våghöjd i texlar, s: vågfart, sx/sy: flöde (texlar/s), glow: pulsens styrka, gs: pulsens fart, shine: blänk, hot: glödande }]
  lava: ['floor_lava', 'floor_lava2', { a: 1.6, s: 1.1, sx: 2.2, sy: 1.1, glow: 0.2, gs: 2.1, shine: 0.3, hot: 1 }],
  molten: ['floor_molten', '', { a: 1.4, s: 1.3, sx: 3, sy: 0, glow: 0.22, gs: 2.6, shine: 0.3, hot: 1 }],
  water: ['floor_water', 'floor_water2', { a: 1.2, s: 2, sx: 1.2, sy: 0.6, glow: 0, gs: 0, shine: 0.4 }],
  deep: ['floor_deepwater', 'floor_deepwater2', { a: 1.6, s: 1.4, sx: 0.6, sy: 1, glow: 0, gs: 0, shine: 0.28 }],
  shallow: ['floor_shallow', '', { a: 1, s: 2.4, sx: 0.5, sy: 0.3, glow: 0, gs: 0, shine: 0.45 }],
  acid: ['floor_acid', '', { a: 1.1, s: 2.2, sx: 0.8, sy: -0.6, glow: 0.14, gs: 3.1, shine: 0.3 }],
  sludge: ['floor_sludge', '', { a: 0.8, s: 0.8, sx: 0.5, sy: 0.3, glow: 0, gs: 0, shine: 0.12 }],
  honey: ['floor_honey', '', { a: 0.7, s: 0.6, sx: 0.25, sy: 0.4, glow: 0.06, gs: 1.2, shine: 0.3 }],
  ink: ['floor_ink', '', { a: 1, s: 1.3, sx: 0.6, sy: 0.6, glow: 0, gs: 0, shine: 0.2 }],
  sporepool: ['floor_sporepool', '', { a: 1, s: 1.2, sx: 0.4, sy: -0.4, glow: 0.18, gs: 1.7, shine: 0.2 }],
  piranha: ['floor_piranha', '', { a: 1.2, s: 2.2, sx: 0.8, sy: 0.8, glow: 0, gs: 0, shine: 0.35 }],
  oasis: ['floor_oasis', '', { a: 1, s: 1.8, sx: 0.4, sy: 0.4, glow: 0, gs: 0, shine: 0.4 }],
};
const GFXW_BUB = { water: [200, 230, 255], deep: [150, 200, 255], shallow: [210, 235, 255], acid: [150, 255, 90], sludge: [150, 170, 90], honey: [255, 210, 90], ink: [120, 110, 170], sporepool: [190, 255, 150], piranha: [200, 230, 255], oasis: [200, 240, 255] };
const gfxWOn = () => !gfxW.off && !settings.lowfx;
const gfxWPuff = () => (fx.parts.smoke || fx.parts.dust || fx.hit)[0]; // mjuk puff med genomskinlig kant (part_dust är en mörk 3×3-ruta)
function gfxWRestore() { // tillbaka till de orörda texturerna (lowfx slogs på mitt i våningen)
  for (const k in GFXW_LIQ) { const i = animTex[k], s = tex[GFXW_LIQ[k][0]]; if (i !== undefined && s) floorTexs[i] = s; }
  gfxW.active = false;
  if (gfxW.banSrc) tex.wall_brick_stone_center_banner = gfxW.banSrc; gfxW.banOn = false;
}
function gfxWBanner() { // fanan på väggen (vägg 5) vajar: tygpixlarna förskjuts radvis, mer längre ned, och veck skuggas
  const src = gfxW.banSrc || (gfxW.banSrc = tex.wall_brick_stone_center_banner); if (!src || !src.data) return false;
  const w = src.w, h = src.h, sd = src.data;
  if (!gfxW.banMask) { const m = new Uint8Array(w * h); let v0 = h, v1 = 0;
    for (let i = 0; i < w * h; i++) { const c = sd[i], r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255, s = Math.max(r, g, b) - Math.min(r, g, b); if (s > 18) { m[i] = 1; const v = (i / w) | 0; if (v < v0) v0 = v; if (v > v1) v1 = v; } }
    gfxW.banMask = m; gfxW.banV0 = v0; gfxW.banV1 = Math.max(v0 + 1, v1); gfxW.banBuf = { w, h, data: new Uint32Array(w * h) }; }
  const m = gfxW.banMask, out = gfxW.banBuf.data, t = gfxW.t, v0 = gfxW.banV0, span = gfxW.banV1 - v0;
  for (let i = 0; i < w * h; i++) out[i] = m[i] ? 0xff26242a : sd[i]; // bakom tyget: skugga
  for (let v = v0; v <= gfxW.banV1; v++) {
    const k = (v - v0) / span, sh = Math.round(k * 1.5 * Math.sin(t * 1.9 - v * 0.09)), row = v * w;
    for (let u = 0; u < w; u++) { if (!m[row + u]) continue; const uu = u + sh; if (uu < 0 || uu >= w) continue;
      const c = sd[row + u], f = 1 + 0.13 * Math.sin(u * 0.35 + t * 2.3 - v * 0.12) * (0.4 + k);
      out[row + uu] = 0xff000000 | (Math.min(255, ((c >> 16) & 255) * f) << 16) | (Math.min(255, ((c >> 8) & 255) * f) << 8) | Math.min(255, (c & 255) * f); }
  }
  tex.wall_brick_stone_center_banner = gfxW.banBuf; gfxW.banOn = true; gfxW.banTicks = (gfxW.banTicks || 0) + 1; return true;
}
function gfxWScan() { // vilka vätskor finns på våningen just nu (is kan bli vatten, syra kan rinna ut)
  const want = new Set(); for (const k in GFXW_LIQ) if (animTex[k] !== undefined) want.add(animTex[k]);
  const seen = new Set(); if (cellFloor) for (let i = 0; i < cellFloor.length; i++) if (want.has(cellFloor[i])) seen.add(cellFloor[i]);
  gfxW.used = Object.keys(GFXW_LIQ).filter(k => seen.has(animTex[k]) && tex[GFXW_LIQ[k][0]] && tex[GFXW_LIQ[k][0]].data);
}
function gfxWWarp(k) { // vågor, flöde, glödpuls och blänk – källan läses alltid från tex.* (aldrig från floorTexs)
  const [n1, n2, d] = GFXW_LIQ[k], A = tex[n1], B = n2 && tex[n2], t = gfxW.t;
  const src = B && B !== A && B.data && B.w === A.w && B.h === A.h && Math.floor(t / 0.45) % 2 ? B : A, w = src.w, h = src.h, sd = src.data;
  let b = gfxW.buf[k];
  if (!b || b.w !== w || b.h !== h) b = gfxW.buf[k] = { w, h, data: new Uint32Array(w * h), ox: new Int32Array(h), oy: new Int32Array(w), su: new Float32Array(w), sv: new Float32Array(h), lut: new Uint8ClampedArray(256) };
  const TW = TAU / w, TH = TAU / h, fx0 = t * d.sx, fy0 = t * d.sy;
  for (let v = 0; v < h; v++) { b.ox[v] = ((Math.round(d.a * Math.sin(v * TH * 2 + t * d.s) + fx0) % w) + w) % w; b.sv[v] = Math.sin(v * TH * 3 - t * 1.3); }
  for (let u = 0; u < w; u++) { b.oy[u] = ((Math.round(d.a * Math.sin(u * TW * 2 + t * d.s * 1.3 + 1) + fy0) % h) + h) % h; b.su[u] = Math.sin(u * TW * 2 + t * 1.7); }
  const out = b.data, lut = b.lut, gl = d.glow ? 1 + d.glow * (0.8 + 0.7 * Math.sin(t * d.gs)) : 1, sh = d.shine * 255 * 2.2, hot = !!d.hot;
  if (gl !== 1) for (let i = 0; i < 256; i++) lut[i] = i * gl;
  for (let v = 0; v < h; v++) {
    const ox = b.ox[v], sv = b.sv[v], row = v * w;
    for (let u = 0; u < w; u++) {
      let uu = u + ox; if (uu >= w) uu -= w; let vv = v + b.oy[u]; if (vv >= h) vv -= h;
      const c = sd[vv * w + uu]; let r = c & 255, g = (c >> 8) & 255, bl = (c >> 16) & 255;
      if (gl !== 1) { r = lut[r]; g = lut[g]; bl = lut[bl]; }
      const s = b.su[u] + sv;
      if (s > 1.55) { const a = (s - 1.55) * sh; r = Math.min(255, r + a); g = Math.min(255, g + (hot ? a * 0.75 : a)); bl = Math.min(255, bl + (hot ? a * 0.15 : a)); }
      out[row + u] = 0xff000000 | (bl << 16) | (g << 8) | r;
    }
  }
}
function gfxWFlick(t) { // facklor fladdrar mjukare och mer oregelbundet; lavans sken pulserar långsamt med texturen
  if (!gfxWOn()) return 0;
  if (t.hidden && !t.prop) return t.str === 0.45 && t.r === 3 ? 0.1 + 0.14 * Math.sin(gfxW.t * 2.1 + t.ph * 0.3) : 0; // lavan lyser lite mer och pulserar
  if (t.prop) return 0.5 * 0.06 * Math.sin(tmr * 3.1 + t.ph * 2.3) * Math.sin(tmr * 1.7 + t.ph); // ljus, eldfat, lyktor: svagare fladder
  return 0.06 * Math.sin(tmr * 3.1 + t.ph * 2.3) * Math.sin(tmr * 1.7 + t.ph) - (Math.sin(tmr * 0.9 + t.ph * 5) > 0.96 ? 0.12 : 0);
}
function gfxWRad(t) { // ljusradiens fladder (0 = av): facklor och eldfat mest, lavan långsamt, andra dolda ljus inte alls
  if (!gfxWOn()) return 0;
  if (t.hidden && !t.prop) return t.str === 0.45 && t.r === 3 ? 0.12 * Math.sin(gfxW.t * 1.3 + t.ph) : 0;
  return (t.prop ? 0.5 : 1) * (0.22 * Math.sin(tmr * 2.3 + t.ph * 1.9) + 0.1 * Math.sin(tmr * 5.7 + t.ph * 0.7));
}
const gfxWFlame = o => gfxWOn() ? 1 + 0.07 * Math.sin(tmr * 11 + o.ph * 3) + 0.05 * Math.sin(tmr * 4.3 + o.ph) : 1; // lågan andas
const GFXW_SWAY = { 'ǐ': 0.05, 'ű': 0.03, '"': 0.02, '³': 0.025 }; // hängande rekvisita: svängens storlek (världsenheter)
const gfxWSway = o => gfxWOn() ? GFXW_SWAY[o.ch] * (settings.reduceMotion ? 0.4 : 1) * (Math.sin(tmr * 1.6 + (o.ph || 0) * 3) + 0.3 * Math.sin(tmr * 3.7 + (o.ph || 0))) : 0;
const gfxWChestZ = o => o.open && o.t < 0.35 && !settings.lowfx ? Math.sin(o.t / 0.35 * Math.PI) * 0.07 : 0; // kistan hoppar när locket slår upp
function gfxWLight(fl) { // blixten lyser upp marken under öppen himmel; golvet runt utgången glöder grönt och pulserar
  if (lvl.exit && gfxWOn()) fl(lvl.exit.x + 0.5, lvl.exit.y + 0.5, 0.3 + 0.2 * Math.sin(tmr * 2.6), 4, [110, 255, 150]);
  if (lightning > 0.05 && lvl.sky && cellSky && !settings.noFlash && gfxWOn()) {
    const k = lightning * 0.8, x0 = Math.max(0, (P.x | 0) - 9), x1 = Math.min(mw - 1, (P.x | 0) + 9), y0 = Math.max(0, (P.y | 0) - 9), y1 = Math.min(mh - 1, (P.y | 0) + 9);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * mw + x; if (cellSky[i]) light[i] += k; }
  }
}
function gfxWItem(o, d2, plX, plY) { // plockbara föremål: skugga på golvet och en glimt (vid övre högra kanten) då och då
  if (!gfxWOn() || d2 > 100) return;
  if (fx.parts.shadow) drawSprite(fx.parts.shadow[0], o.x, o.y, 0.022, 0, false, null, 0, 0);
  const ph = (tmr * 0.45 + o.x * 0.37 + o.y * 0.61) % 1;
  if (ph < 0.08 && fx.parts.star) { const k = Math.sin(ph / 0.08 * Math.PI); drawSprite(fx.parts.star[0], o.x + plX * 0.12, o.y + plY * 0.12, 0.12 * k, 0.2 + 0.04 * Math.sin(tmr * 3 + o.x), false, 2.2, 0, 0, true, [255, 250, 220]); gfxW.glints++; }
  const sx = gfxWSpin(o); if (sx !== 1) { spriteSX = sx; gfxW.spins++; } // föremålet ritas efter detta med spriteSX (nollställs per sprite)
}
const GFXW_SPIN = { key: 1, rune: 1, legend: 1, cardpick: 1, scroll: 1, shard: 1, page: 1, battery: 1, goldpile: 0, gold: 0 }; // 1 = snurrar runt, annars gungar lätt
function gfxWSpin(o) { // nycklar, runor, vapen och kort snurrar (bredden följer |cos|), drycker och lådor gungar; reduceMotion lugnar
  const sl = settings.reduceMotion ? 0.4 : 1, a = tmr * 1.7 * sl + o.x * 1.3 + o.y * 0.7;
  if (o.type === 'gold' || o.type === 'goldpile') return 1; // mynten har egna snurrbilder
  if (GFXW_SPIN[o.type] || (gfxW.wset || (gfxW.wset = new Set(WEAPONS.map(w => w.id)))).has(o.type)) return Math.max(0.14, Math.abs(Math.cos(a)));
  return 1 + 0.05 * Math.sin(a * 1.6);
}
function gfxWChest(c) { // locket slår upp: gnistor, damm och ett kort sken
  if (!gfxWOn() || !fx.hit) return; gfxW.chests++;
  flashes.push({ x: c.x, y: c.y, t: 0.18, r: 3, col: c.rare ? [255, 220, 120] : [255, 190, 110] });
  for (let i = 0; i < (c.rare ? 16 : 10); i++) { const a = rnd(0, TAU), sp = rnd(0.6, 1.8); particles.push({ x: c.x, y: c.y, z: 0.3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(1.5, 3), life: rnd(0.5, 0.9), maxLife: 0.9, img: fx.hit[2] || fx.hit[1], size: 0.045, add: true, tint: [255, 215, 110], grav: true }); }
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; particles.push({ x: c.x + Math.cos(a) * 0.2, y: c.y + Math.sin(a) * 0.2, z: 0.05, vx: Math.cos(a) * 0.8, vy: Math.sin(a) * 0.8, vz: 0.15, life: 0.6, maxLife: 0.6, img: gfxWPuff(), size: 0.1, fade: true, drift: true, tint: [170, 150, 120] }); }
}
const GFXW_STEPLIQ = { 'Ĕ': 'shallow', 'Đ': 'deep', 'Ǜ': 'acid', 'Ȳ': 'sludge', 'Ɩ': 'honey', 'Ŭ': 'ink', 'Ȃ': 'piranha', 'ȴ': 'oasis', 'Ť': 'sporepool', '-': 'water' };
function gfxWStep() { // fotsteg: plask och ringar i vätskor, dammpuffar på torr mark när man springer
  if (!gfxWOn() || !map || particles.length > pcap(200) || P.jz > 0.05) return;
  const ch = cellUnder(), sp = Math.hypot(P.vx, P.vy), a = Math.atan2(P.vy, P.vx), bx = P.x - Math.cos(a) * 0.25, by = P.y - Math.sin(a) * 0.25, lq = GFXW_STEPLIQ[ch];
  if (lq) { gfxW.steps++; const tint = GFXW_BUB[lq] || [200, 230, 255];
    if (ch !== '-') for (let i = 0; i < 6; i++) { const b = i / 6 * TAU; particles.push({ x: bx + Math.cos(b) * 0.12, y: by + Math.sin(b) * 0.12, z: 0.01, vx: Math.cos(b) * 0.7, vy: Math.sin(b) * 0.7, vz: 0, life: 0.45, maxLife: 0.45, img: fx.hit[1], size: 0.03, add: true, tint, fade: true }); } // ringar på ytan
    for (let i = 0; i < 3; i++) particles.push({ x: bx, y: by, z: 0.03, vx: rnd(-0.6, 0.6) + P.vx * 0.1, vy: rnd(-0.6, 0.6) + P.vy * 0.1, vz: rnd(0.8, 1.5), life: 0.35, maxLife: 0.35, img: (fx.parts.drop || fx.hit)[0], size: 0.03, grav: true, tint }); // stänk
    return; }
  if (sp < 3.2) return;
  const n = ((lvl.floors || [lvl.floor])[cellFloor ? cellFloor[(P.y | 0) * mw + (P.x | 0)] : 0] || '') + ' ' + (lvl.biome || '');
  if (!/sand|desert|dirt|gravel|ash|cave|mine|dust|tomb|ruin|basalt|volcano|sawdust/.test(n)) return;
  gfxW.steps++; const tint = /sand|desert|tomb/.test(n) ? [215, 185, 130] : /ash|basalt|volcano/.test(n) ? [120, 110, 105] : [160, 140, 115];
  for (let i = 0; i < 2; i++) particles.push({ x: bx + rnd(-0.1, 0.1), y: by + rnd(-0.1, 0.1), z: 0.03, vx: -Math.cos(a) * rnd(0.2, 0.5) + rnd(-0.2, 0.2), vy: -Math.sin(a) * rnd(0.2, 0.5) + rnd(-0.2, 0.2), vz: rnd(0.05, 0.2), life: 0.6, maxLife: 0.6, img: gfxWPuff(), size: rnd(0.06, 0.1), fade: true, drift: true, tint });
}
function gfxWMech(dt) { // fällor, spakar, tryckplattor, hemliga väggar, portaler och utgången: reaktioner när något slår om
  const cap = particles.length < pcap(200), dust = gfxWPuff();
  for (const o of props) { if (!o.def || o.broken) continue; const dx = o.x - P.x, dy = o.y - P.y; if (dx * dx + dy * dy > 144) continue;
    const up = !!o.up, used = !!o.used;
    if (o.gUp === undefined) { o.gUp = up; o.gUsed = used; continue; }
    if (up !== o.gUp) { o.gUp = up; o.gPoseT = tmr; gfxW.mech++; // spikar skjuter upp / plattan trycks ned
      if (cap) for (let i = 0; i < (up ? 6 : 4); i++) { const a = rnd(0, TAU); particles.push({ x: o.x + Math.cos(a) * 0.15, y: o.y + Math.sin(a) * 0.15, z: 0.03, vx: Math.cos(a) * rnd(0.4, 1), vy: Math.sin(a) * rnd(0.4, 1), vz: up ? rnd(0.6, 1.4) : 0.1, life: 0.5, maxLife: 0.5, img: up ? fx.hit[2] || fx.hit[1] : dust, size: up ? 0.035 : 0.08, add: up, grav: up, fade: !up, drift: !up, tint: up ? [230, 220, 200] : [160, 145, 120] }); } }
    if (used && !o.gUsed) { o.gUsed = true; o.gPoseT = tmr; gfxW.mech++; // spaken slår om, altaret tänds, brunnen töms …
      if (cap) for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; particles.push({ x: o.x, y: o.y, z: (o.size || 0.5) * 0.6, vx: Math.cos(a) * rnd(0.6, 1.4), vy: Math.sin(a) * rnd(0.6, 1.4), vz: rnd(0.5, 1.5), life: 0.6, maxLife: 0.6, img: fx.hit[2] || fx.hit[1], size: 0.04, add: true, grav: true, tint: PROP_GLOW[o.ch] || [255, 220, 140] }); } }
    else if (!used && o.gUsed) o.gUsed = false;
    if (cap && !used && o.def.use && o.def.light && dx * dx + dy * dy < 64 && Math.random() < dt * 2.5) particles.push({ x: o.x + rnd(-0.2, 0.2), y: o.y + rnd(-0.2, 0.2), z: (o.size || 0.5) * 0.5, vx: 0, vy: 0, vz: rnd(0.25, 0.5), life: 1.4, maxLife: 1.4, img: fx.hit[1], size: 0.03, add: true, fade: true, drift: true, sway: rnd(0, 6), frames: fx.hit, tint: PROP_GLOW[o.ch] || [255, 220, 140] }); } // altare, brunnar och liknande: ljuspartiklar stiger
  if (!cap) return;
  for (const k in doors) { const d = doors[k]; if (!d.secret || d.open <= 0.02 || d.open >= 0.98 || d.target !== 1) continue; // hemliga väggen glider: damm och grus rinner
    if (Math.random() < dt * 14 && Math.abs(d.x + 0.5 - P.x) + Math.abs(d.y + 0.5 - P.y) < 12) particles.push({ x: d.x + rnd(0.1, 0.9), y: d.y + rnd(0.1, 0.9), z: rnd(0.4, 0.95), vx: rnd(-0.2, 0.2), vy: rnd(-0.2, 0.2), vz: -0.2, life: 0.8, maxLife: 0.8, img: dust, size: rnd(0.05, 0.1), grav: Math.random() < 0.5, fade: true, tint: [150, 140, 120] }); }
  const swirl = (x, y, r, col, rate) => { if (Math.random() > dt * rate) return; const a = rnd(0, TAU); particles.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, z: rnd(0.05, 0.9), vx: -Math.sin(a) * 1.4 - Math.cos(a) * 0.5, vy: Math.cos(a) * 1.4 - Math.sin(a) * 0.5, vz: 0.15, life: 0.7, maxLife: 0.7, img: fx.hit[1], size: 0.035, add: true, fade: true, drift: true, tint: col }); gfxW.mech++; };
  if (lvl.exit && Math.abs(lvl.exit.x + 0.5 - P.x) + Math.abs(lvl.exit.y + 0.5 - P.y) < 14) swirl(lvl.exit.x + 0.5, lvl.exit.y + 0.5, 0.5, [140, 255, 160], 10); // utgången virvlar
  for (const p of portals) if (Math.abs(p.x - P.x) + Math.abs(p.y - P.y) < 14) swirl(p.x, p.y, 0.55, p.kind === 'gold' ? [255, 220, 90] : p.kind === 'boss' ? [255, 170, 120] : [190, 140, 255], 12); // portalerna drar in ljus
}
function gfxWPropPose(o) { // rekvisitan reagerar: spikar sticker upp med överslag, plattan sjunker, spaken fjädrar
  if (!gfxWOn() || !o.def) return; const d = o.def;
  if (d.trap === 'plate' && !o.up) spriteSY = 0.6; // nedtryckt
  const k = tmr - (o.gPoseT || -9); if (k < 0 || k > 0.35) return; const s = Math.sin(k / 0.35 * Math.PI) * (1 - k / 0.35);
  if (d.trap && o.up) { spriteSY *= 1 + 0.35 * s; spriteSX *= 1 - 0.12 * s; } else { spriteSY *= 1 - 0.15 * s; spriteSX *= 1 + 0.1 * s; }
}
function gfxWExit(e, d2) { // utgången: pulserande ljuspelare + en ring av ljus som roterar runt den (syns på håll)
  const x = e.x + 0.5, y = e.y + 0.5, p = 0.5 + 0.5 * Math.sin(tmr * 2.6), beam = fx.parts.beam ? fx.parts.beam[0] : fx.hit[1];
  spriteSX = 3.2; drawSprite(beam, x, y, 0.98, 0, false, 0.7 + 0.35 * p, 0, 0, true, [90, 255, 140]); // bred mjuk glöd
  spriteSX = 1.3; drawSprite(beam, x, y, 0.98, 0, false, 1.2 + 0.5 * p, 0, 0, true, [150, 255, 180]); spriteSX = 1; gfxW.exitN = (gfxW.exitN || 0) + 1;
  if (d2 > 400) return; // ringen bara på närmare håll
  const n = 10, r = 0.42, rot = tmr * 1.6;
  for (let i = 0; i < n; i++) { const a = rot + i / n * TAU, z = 0.08 + 0.05 * Math.sin(tmr * 3 + i) + (i % 2) * 0.25 * (0.5 + 0.5 * Math.sin(tmr * 1.3 + i));
    drawSprite(fx.hit[1], x + Math.cos(a) * r, y + Math.sin(a) * r, 0.08 + 0.03 * p, z, false, 2.4, 0, 0, true, [150, 255, 170]); }
}
function gfxWDeathFx(e) { // fiender som dör i vatten plaskar, i lava fräser de (ånga och glöd)
  if (!gfxWOn() || !map || e.boss) return; const c = map[e.y | 0] && map[e.y | 0][e.x | 0], lq = GFXW_STEPLIQ[c], hot = c === '_' || c === 'Ź';
  if (!lq && !hot) return; gfxW.deathFx = (gfxW.deathFx || 0) + 1; const cap = particles.length < pcap(220);
  if (hot) { play('steam_hiss', 0.5, rnd(0.9, 1.1), { x: e.x, y: e.y });
    if (cap) for (let i = 0; i < 7; i++) { const sm = fx.parts.steam || fx.parts.smoke || fx.hit; particles.push({ x: e.x + rnd(-0.3, 0.3), y: e.y + rnd(-0.3, 0.3), z: rnd(0.05, 0.3), vx: rnd(-0.2, 0.2), vy: rnd(-0.2, 0.2), vz: rnd(0.4, 0.8), life: rnd(0.9, 1.5), maxLife: 1.5, frames: sm, img: sm[0], size: rnd(0.18, 0.3), fade: true, drift: true, tint: [225, 220, 215] }); }
    if (cap) for (let i = 0; i < 6; i++) particles.push({ x: e.x, y: e.y, z: 0.1, vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(1, 2.2), life: 0.6, maxLife: 0.6, img: (fx.parts.lavadrop || fx.fireball)[0], size: 0.04, add: true, grav: true, tint: [255, 150, 50] });
    flashes.push({ x: e.x, y: e.y, t: 0.15, r: 2, col: [255, 120, 40] }); return; }
  play('splash', 0.55, rnd(0.8, 1), { x: e.x, y: e.y }); const tint = GFXW_BUB[lq] || [200, 230, 255];
  if (cap) for (let i = 0; i < 8; i++) { const b = i / 8 * TAU; particles.push({ x: e.x + Math.cos(b) * 0.2, y: e.y + Math.sin(b) * 0.2, z: 0.01, vx: Math.cos(b) * 1.1, vy: Math.sin(b) * 1.1, vz: 0, life: 0.6, maxLife: 0.6, img: fx.hit[1], size: 0.04, add: true, tint, fade: true }); }
  if (cap) for (let i = 0; i < 8; i++) particles.push({ x: e.x, y: e.y, z: 0.05, vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(1.5, 3), life: 0.6, maxLife: 0.6, img: (fx.parts.drop || fx.hit)[0], size: 0.04, grav: true, tint });
}
function gfxWDefer(fn) { // kistans kortval väntar ~0,3 s så att locket och gnistorna hinner synas (direkt med lowfx)
  if (!gfxWOn() || state !== 'play') { fn(); return; }
  gfxW.deferN = (gfxW.deferN || 0) + 1; let n = 0;
  const go = () => { if (state === 'title' || state === 'dead' || state === 'runover') return; if (state === 'play' || ++n > 60) fn(); else setTimeout(go, 150); };
  setTimeout(go, 300);
}
function gfxWScorch(x, y, r) { // brännmärken på väggarna runt en explosion
  if (settings.lowfx || gfxW.off || !map || solid(x, y)) return;
  const R = Math.min(3.2, r + 0.7);
  if (!lvl.sky && particles.length < pcap(200)) for (let i = 0; i < 5; i++) { const a = rnd(0, TAU), d = rnd(0.3, R); const px2 = x + Math.cos(a) * d, py2 = y + Math.sin(a) * d; if (!solid(px2, py2)) particles.push({ x: px2, y: py2, z: 0.97, vx: 0, vy: 0, vz: rnd(-0.2, 0), life: rnd(0.8, 1.3), maxLife: 1.3, img: gfxWPuff(), size: rnd(0.04, 0.07), grav: true, tint: [150, 135, 115] }); } // damm och grus faller från taket
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + rnd(-0.2, 0.2), dx = Math.cos(a), dy = Math.sin(a), h = cast(x, y, dx, dy, R); if (h && h.mx !== undefined && h.dist < R) { wallMark(h, dx, dy, rnd(0.12, 0.4) + (1 - h.dist / R) * 0.15, 'scorch'); gfxW.scorch++; } }
}
function gfxWDoors() { // dörrar dammar när de börjar öppnas
  for (const k in doors) { const d = doors[k];
    if (d.target === 1 && !d.gfxDust) { d.gfxDust = true; const dx = d.x + 0.5 - P.x, dy = d.y + 0.5 - P.y;
      if (dx * dx + dy * dy < 144 && particles.length < pcap(200)) { gfxW.doors++; for (let i = 0; i < 7; i++) particles.push({ x: d.x + 0.5 + rnd(-0.45, 0.45), y: d.y + 0.5 + rnd(-0.45, 0.45), z: Math.random() < 0.5 ? 0.03 : rnd(0.7, 0.95), vx: rnd(-0.4, 0.4), vy: rnd(-0.4, 0.4), vz: rnd(-0.2, 0.2), life: rnd(0.7, 1.2), maxLife: 1.2, img: gfxWPuff(), size: rnd(0.07, 0.12), fade: true, drift: true, tint: [160, 145, 120] }); } }
    else if (d.target === 0 && d.open <= 0.01) d.gfxDust = false; }
}
function gfxWAir(dt) { // biomernas egna luftpartiklar (det som väder-tabellen saknar), i världen och få
  const b = lvl.biome, r = Math.random, near = R => { const a = r() * TAU, d = 0.5 + r() * R; return [P.x + Math.cos(a) * d, P.y + Math.sin(a) * d]; };
  const okc = (x, y) => x > 0 && y > 0 && x < mw && y < mh && !solid(x, y);
  const push = (o, n) => { const f = fx.parts[n] || fx.hit; o.frames = f; o.img = f[0]; o.maxLife = o.life; o.drift = true; particles.push(o); gfxW.air++; };
  if (b === 'cathedral' && r() < dt * 5) { const [x, y] = near(6); if (okc(x, y)) push({ x, y, z: 1.05, vx: rnd(-0.1, 0.1), vy: rnd(-0.1, 0.1), vz: -0.22, life: 4, size: 0.03, sway: rnd(0, 6), tint: [175, 165, 165] }, fx.parts.ashfall ? 'ashfall' : 'ash'); } // aska singlar ned
  else if (biomeFx().weather === 'rain' && r() < dt * 10) { const [x, y] = near(5); if (okc(x, y) && cellSky && cellSky[(y | 0) * mw + (x | 0)]) for (let i = 0; i < 2; i++) { const a = r() * TAU; push({ x, y, z: 0.02, vx: Math.cos(a) * 0.5, vy: Math.sin(a) * 0.5, vz: rnd(0.4, 0.8), life: 0.22, size: 0.025, grav: true, add: true, tint: [190, 210, 240] }, 'drop'); } } // regnet stänker på marken
  else if (b === 'desert' && r() < dt * 7) { const [x, y] = near(6); if (okc(x, y)) push({ x, y, z: rnd(0.03, 0.35), vx: 1.1 + rnd(0, 0.6), vy: rnd(-0.2, 0.2), vz: rnd(-0.05, 0.05), life: 1.6, size: 0.025, fade: true, tint: [225, 195, 135] }, 'sand'); } // sanddrev längs marken
  else if (b === 'tomb' && r() < dt * 2.5) { const [x, y] = near(5); if (okc(x, y) && !(cellSky && cellSky[(y | 0) * mw + (x | 0)])) push({ x, y, z: 0.97, vx: 0, vy: 0, vz: -1.3, life: 0.75, size: 0.022, tint: [215, 185, 125] }, 'sand'); } // sand rinner ur taket
  else if (b === 'frost' && r() < dt * 5) { const [x, y] = near(5); if (okc(x, y) && !(cellSky && cellSky[(y | 0) * mw + (x | 0)])) push({ x, y, z: rnd(0.2, 1), vx: rnd(-0.08, 0.08), vy: rnd(-0.08, 0.08), vz: -0.08, life: 2.4, size: 0.022, add: true, fade: true, tint: [210, 235, 255] }, 'dust_mote'); } // iskristaller glittrar inomhus
  else if ((b === 'dungeon' || b === 'library' || b === 'clock') && r() < dt * 3) { let best = null, bd = 36; for (const t of torches) { if (t.hidden) continue; const dx = t.x - P.x, dy = t.y - P.y, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = t; } } // damm som fångar facklornas sken
    if (best) { const x = best.x + rnd(-1.3, 1.3), y = best.y + rnd(-1.3, 1.3); if (okc(x, y)) push({ x, y, z: rnd(0.3, 0.95), vx: rnd(-0.06, 0.06), vy: rnd(-0.06, 0.06), vz: rnd(-0.03, 0.05), life: 3, size: 0.018, add: true, fade: true, tint: [255, 205, 140] }, 'dust_mote'); } }
}
function gfxWTorchFx(dt) { // gnistor stiger ur facklorna nära spelaren
  if (Math.random() > dt * 6) return; let n = 0;
  for (const t of torches) { if (t.hidden || t.prop) continue; const dx = t.x - P.x, dy = t.y - P.y; if (dx * dx + dy * dy > 49 || Math.random() > 0.35) continue;
    particles.push({ x: t.x + rnd(-0.06, 0.06), y: t.y + rnd(-0.06, 0.06), z: 0.62, vx: rnd(-0.15, 0.15), vy: rnd(-0.15, 0.15), vz: rnd(0.35, 0.7), life: rnd(0.6, 1.1), maxLife: 1.1, img: fx.parts.ember ? fx.parts.ember[0] : fx.hit[1], frames: fx.parts.ember || null, size: 0.03, add: true, tint: [255, 170, 70], fade: true, drift: true }); gfxW.embers++; if (++n >= 3) break; }
}
function gfxWLiquidFx(dt) { // lavan poppar, syra och vatten bubblar nära spelaren
  if (!gfxW.used.length || Math.random() > dt * 5) return;
  const a = Math.random() * TAU, dd = 1 + Math.random() * 5, x = P.x + Math.cos(a) * dd, y = P.y + Math.sin(a) * dd; if (x <= 0 || y <= 0 || x >= mw || y >= mh) return;
  const fi = cellFloor[(y | 0) * mw + (x | 0)]; let k = null; for (const q of gfxW.used) if (animTex[q] === fi) { k = q; break; } if (!k) return;
  gfxW.bubbles++;
  if (GFXW_LIQ[k][2].hot) { for (let i = 0; i < 3; i++) particles.push({ x, y, z: 0.02, vx: rnd(-0.6, 0.6), vy: rnd(-0.6, 0.6), vz: rnd(0.8, 1.6), life: 0.6, maxLife: 0.6, img: (fx.parts.lavadrop || fx.fireball)[0], size: 0.04, add: true, grav: true, tint: [255, 150, 50] }); return; }
  const f = fx.parts.bubble || fx.hit; particles.push({ x, y, z: 0.01, vx: 0, vy: 0, vz: 0.12, life: 0.5, maxLife: 0.5, frames: f, img: f[0], size: 0.035, fade: true, drift: true, tint: GFXW_BUB[k] || [200, 230, 255] });
}
function gfxWUpdate(dt) { // anropas från updateWeather varje bildruta
  if (!map || !lvl) return;
  if (gfxW.lvl !== lvl) { gfxW.lvl = lvl; gfxW.scanT = 0; gfxW.active = false; gfxW.used = []; for (const k in doors) doors[k].gfxDust = doors[k].target === 1; gfxW.hasBan = String(lvl.secretWall) === '5' || map.some(r => r.indexOf('5') >= 0); if (gfxW.banSrc && !gfxW.hasBan) { tex.wall_brick_stone_center_banner = gfxW.banSrc; gfxW.banOn = false; } }
  if (!gfxWOn()) { if (gfxW.active || gfxW.banOn) gfxWRestore(); return; }
  gfxW.t += dt; gfxW.scanT -= dt; if (gfxW.scanT <= 0) { gfxW.scanT = 1; gfxWScan(); }
  gfxW.acc += dt; if (gfxW.acc >= 1 / 15) { gfxW.acc = 0; for (const k of gfxW.used) { gfxWWarp(k); floorTexs[animTex[k]] = gfxW.buf[k]; } gfxW.active = gfxW.used.length > 0; gfxW.ticks++; if (gfxW.hasBan) gfxWBanner(); }
  if (lightning > gfxW.lastL + 0.5) gfxW.bolts++; gfxW.lastL = lightning;
  gfxWDoors(); gfxWMech(dt);
  if (particles.length > pcap(180)) return; // taket på partiklar delas med strider – miljön ger vika först
  gfxWAir(dt); gfxWTorchFx(dt); gfxWLiquidFx(dt);
}
function gfxWApi() { // window.__game.gfxW: tillstånd och mätning för t105
  return { st: gfxW, on: gfxWOn, set: o => Object.assign(gfxW, o), used: () => gfxW.used.slice(), isBuf: k => animTex[k] !== undefined && !!gfxW.buf[k] && floorTexs[animTex[k]] === gfxW.buf[k], scorch: gfxWScorch, torches: () => torches, bolt: () => { lightning = 1; }, sky: (x, y) => !!(cellSky && cellSky[(y | 0) * mw + (x | 0)]), biomes: () => Object.keys(BIOME_FX), rad: () => torches.filter(t => !t.hidden).slice(0, 4).map(gfxWRad), spin: o => gfxWSpin(o), step: gfxWStep,
    warpMs: (n = 200) => { if (!gfxW.used.length && !gfxW.hasBan) return 0; const t0 = performance.now(); for (let i = 0; i < n; i++) { for (const k of gfxW.used) gfxWWarp(k); if (gfxW.hasBan) gfxWBanner(); } return (performance.now() - t0) / n; }, lightning: () => lightning, // warpMs: en uppdatering av alla vätskor
    sum: k => { const b = gfxW.buf[k]; if (!b) return 0; let s = 0; for (let i = 0; i < b.data.length; i += 7) s = (s + b.data[i] * (i + 1)) % 1000000007; return s; },
    marks: () => { let n = 0; for (const a of wallMarks.values()) for (const m of a) if (m.kind === 'scorch') n++; return n; },
    bench: (n = 200) => { const ts = []; for (let i = 0; i < n; i++) { const t0 = performance.now(); tmr += 1 / 60; updateWeather(1 / 60); updateParticles(1 / 60); updateLight(); render(); ts.push(performance.now() - t0); } const mean = ts.reduce((a, b) => a + b, 0) / n; ts.sort((a, b) => a - b); return { mean, med: ts[n >> 1], p90: ts[(n * 0.9) | 0], parts: particles.length }; } };
}
