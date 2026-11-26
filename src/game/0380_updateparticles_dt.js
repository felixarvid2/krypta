function updateParticles(dt) {
  pbDense(); // version 27: HÖG och MAX gör effekterna tätare (fler partiklar per händelse)
  for (const p of particles) {
    p.life -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.drift) { p.z += p.vz * dt; if (p.sway !== undefined) { p.sway += dt * 3; p.x += Math.cos(p.sway) * dt * 0.3; p.y += Math.sin(p.sway * 1.3) * dt * 0.3; } }
    if (solid(p.x, p.y)) { p.x -= p.vx * dt; p.y -= p.vy * dt; p.vx *= -0.3; p.vy *= -0.3; }
    if (p.grav) { p.vz -= 6 * dt; p.z += p.vz * dt; if (p.z < 0) { p.z = 0; if (p.bounce && p.vz < -1) { p.vz *= -0.35; } else { p.vz = 0; p.vx *= 0.8; p.vy *= 0.8; } } }
    if (p.flap || p.sway !== undefined) p.img = p.frames[Math.floor(tmr * (p.flap ? 14 : 6) + (p.sway || 0)) % p.frames.length];
    else if (p.frames) p.img = p.frames[clamp(Math.floor((1 - p.life / p.maxLife) * p.frames.length), 0, p.frames.length - 1)];
  }
  particles = particles.filter(p => p.life > 0 && (p.z > -0.05 || !p.drift));
  if (particles.length > pcap(260)) pbTrim(pcap(260)); // version 27: taket skalas med partikelbudgeten, och dekor (rök, damm) får ge plats först
}

// ---------- Bossarna ----------
// Gemensamt: dödsanimation, status, faser (2 under 2/3 HP, 3 under 1/3) och läten. Resten styrs av BOSS_AI[id].
function updateBoss(b, dt) {
  b.t += dt; b.flash = Math.max(0, b.flash - dt);
  if (b.dying) {
    b.dying += dt; P.shake = Math.max(P.shake, 1.5);
    if (Math.random() < dt * 12) explodeFx(b.x + rnd(-1, 1), b.y + rnd(-1, 1), rnd(0.3, 1.6));
    if (b.dying > (b.guardian ? 1.6 : 2.6)) { b.dying = 0; b.dead = true; if (b.guardian) finishGuardian(b); else finishBoss(b); }
    return;
  }
  if (b.dead) return;
  if (b.asleep) { // väktaren vaknar när man kommer in i rummet eller skjuter på den
    if (b.hp < b.maxHp || (Math.hypot(P.x - b.x, P.y - b.y) < 6.5 && hasLOS(b.x, b.y, P.x, P.y))) wakeGuardian(b); else return;
  }
  statusTick(b, dt); if (b.dead || b.dying) return;
  const dx = P.x - b.x, dy = P.y - b.y, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  const ph = b.hp < b.maxHp / 3 ? 3 : b.hp < b.maxHp * 2 / 3 ? 2 : 1;
  if (ph !== b.phase) { b.phase = ph; hitStop = 0.18; play('bossroar', 1, ph === 3 ? 1.1 : 0.9); say(b.d.phaseMsg[ph - 2], 2.5); P.shake = 2; }
  b.growlT -= dt; if (b.growlT <= 0) { b.growlT = rnd(6, 10); play('bossroar', 0.6, rnd(0.8, 1)); }
  b.mvx = b.mvy = 0;
  b.fightT = (b.fightT || 0) + dt;
  if (!b.enraged && b.fightT > (b.guardian ? 60 : 90)) { b.enraged = true; b.d = { ...b.d, speed: b.d.speed * 1.3, dmg: b.d.dmg * 1.2 }; say(b.d.name + ' BLIR RASANDE!', 2.5); play('bossroar', 1, 0.7); } // ilskemätaren
  if (b.stun > 0) { b.stun -= dt; return; }
  if (b.state === 'special') { BOSS_SPECIAL[b.id](b, dt, dist, ang, ph); return; }
  b.spT = (b.spT ?? rnd(6, 9)) - dt;
  if (b.spT <= 0 && b.state !== 'hidden' && b.state !== 'charge' && b.state !== 'sink' && !b.hidden && hasLOS(b.x, b.y, P.x, P.y)) { b.spT = rnd(9, 13) / (ph === 3 ? 1.4 : 1); b.state = 'special'; b.t = 0; b.didHit = false; b.spK = b.spK ? 0 : 1; return; }
  const ox = b.x, oy = b.y;
  BOSS_AI[b.id](b, dt, dist, ang, ph);
  // utom synhåll i ett lugnt tillstånd: gå runt hindret via bossfältet i stället för att trycka mot väggen (inte efter språng/teleport)
  if (!b.dead && !b.dying && !b.hidden && BOSS_NEUTRAL.has(b.state) && !NO_CHASE.has(b.id) && Math.hypot(b.x - ox, b.y - oy) < 1 && !hasLOS(b.x, b.y, P.x, P.y)) {
    b.x = ox; b.y = oy; bossChase(b, b.d.speed * dt * (b.slow > 0 ? 0.5 : 1));
  }
}
const BOSS_NEUTRAL = new Set(['idle', 'walk', 'chase', 'circle']);
const NO_CHASE = new Set(['leviathan', 'mycelmother']); // bassängbossen går aldrig; mycelmodern sköter bossChase själv
function bossStagger(b, dmg) { // många träffar i följd: bossen blir yr
  b.stagAcc = (b.stagAcc || 0) * Math.exp(-(tmr - (b.stagT || tmr)) / 2) + dmg; b.stagT = tmr;
  if (b.stagAcc > b.maxHp * 0.12 && (b.stagCd || 0) < tmr && !b.hidden) { b.stagAcc = 0; b.stagCd = tmr + 9; b.stun = 1.2; b.state = b.id === 'ogre' ? 'walk' : 'idle'; say(b.d.name + ' VACKLAR!', 1.5); play('bigboom', 0.5, 0.8, { x: b.x, y: b.y }); }
}
// ---------- Bossarnas specialanfall (två per boss, växlar) ----------
const TAUNTS = { frost: ['FRYS!', 'DITT BLOD STELNAR', 'VINTERN TAR ALLA'], demon: ['DINA BEN BLIR MINA', 'BRINN!', 'KNÄFALL!'], beast: ['GLÖDEN VÄNTAR DIG', 'SMÄLT!', 'GRRRAAH!'], nightmare: ['DU KAN INTE VAKNA', 'MÖRKRET ÄR MITT', 'SPRING, LILLA RÅTTA'],
  ogre: ['OGERN KROSSA!', 'LITEN MAT!', 'HAHA! PLATT!'], ghost: ['STANNA HOS MIG...', 'KALLT, VISST?', 'DU HÖR TILL OSS NU'] };
function taunt(b) { if (!b || (b.tauntT || 0) > tmr || Math.random() > 0.35) return; b.tauntT = tmr + 8; const t = TAUNTS[b.id]; if (t) say(`${b.d.name}: "${t[(Math.random() * t.length) | 0]}"`, 2.2); }
function fallHazard(x, y, kind, dmg, warn) { addHazard(x, y, kind, { warn, life: 0.25, r: 0.85, dmg }); if (fx.parts.shadow) decals.push({ x, y, img: fx.parts.shadow[0], size: 0.06, life: warn + 0.3, shadow: true }); }
const BOSS_SPECIAL = {
  frost(b, dt, dist, ang, ph) {
    if (b.spK) { // frostnova: hoppa för att undvika
      if (b.t < 0.05) { bossWarn(b, 'FROSTNOVA – HOPPA!'); play('frost_boss_roar', 0.9, 0.9); }
      if (!settings.lowfx && b.t < 1) for (let i = 0; i < 3; i++) { const a = rnd(0, TAU), r = (1 - b.t) * 6; particles.push({ x: b.x + Math.cos(a) * r, y: b.y + Math.sin(a) * r, z: 0.05, vx: 0, vy: 0, vz: 0, life: 0.2, maxLife: 0.2, img: fx.hit[1], size: 0.08, add: true, tint: [150, 210, 255] }); }
      if (b.t > 1 && !b.didHit) { b.didHit = true; frostBurst(b.x, b.y); if (dist < 7 && P.jz < 0.2) { hurtPlayer(bossShotDmg(b, 10), b.x, b.y, 'proj'); P.slowT = Math.max(P.slowT, 2.5); say('DU ÄR NEDKYLD', 1.2); } }
      if (b.t > 1.4) { b.state = 'idle'; b.t = 0; b.cd = 0.8; }
      return;
    }
    if (b.t < 0.05) { say('ISDRAKEN KALLAR PÅ IRRBLOSS', 1.5); play('wisp', 0.8, 0.7); for (let i = 0; i < 1 + ph; i++) { const spot = freeSpotFar(3, 6); if (spot) { const e = makeEnemy('Ü', spot[0], spot[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(spot[0], spot[1], 6); } } }
    if (b.t > 0.8) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
  demon(b, dt, dist, ang, ph) {
    if (b.spK) { // meteorregn
      if (b.t < 0.05) { bossWarn(b, 'ELD FALLER FRÅN OVAN!'); play('bossroar', 0.8, 1.1); for (let i = 0; i < 4 + ph * 2; i++) { const a = rnd(0, TAU), r = i ? rnd(0.8, 4) : 0; fallHazard(P.x + Math.cos(a) * r, P.y + Math.sin(a) * r, 'meteor', 14, 1 + i * 0.12); } }
      if (b.t > 1.8) { b.state = 'idle'; b.t = 0; b.cd = 1; }
      return;
    }
    // dykanfall: lyfter och dyker rakt genom spelarens plats
    if (b.t < 0.05) { b.diveA = ang; b.diveHit = false; bossWarn(b, 'BENDEMONEN DYKER!'); play('whoosh', 0.9, 0.6); }
    if (b.t > 0.7 && b.t < 1.6) { bossMove(b, b.diveA, 9 * dt); if (!b.diveHit && Math.hypot(P.x - b.x, P.y - b.y) < 1.3 && P.crouch < 0.5) { b.diveHit = true; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); P.shake = 2; taunt(b); } }
    if (b.t > 1.9) { b.state = 'idle'; b.t = 0; b.cd = 0.8; }
  },
  beast(b, dt, dist, ang, ph) {
    if (b.spK) { // lavavåg: en ring som växer – hoppa över den
      if (b.t < 0.05) { bossWarn(b, 'LAVAVÅGEN – HOPPA!'); play('fireburst', 0.9, 0.5); waves.push({ x: b.x, y: b.y, r: 0.5, sp: 3.6, dmg: 14, hit: false }); if (ph === 3) setTimeout(() => waves.push({ x: b.x, y: b.y, r: 0.5, sp: 3.6, dmg: 14, hit: false }), 900); }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = 1.2; }
      return;
    }
    // studsande magmabollar
    if (b.t < 0.05) { play('fireburst', 0.8, 0.7); for (let i = 0; i < 2 + ph; i++) projectiles.push({ x: b.x, y: b.y, z: 0.5, vx: Math.cos(ang + rnd(-0.8, 0.8)) * 5, vy: Math.sin(ang + rnd(-0.8, 0.8)) * 5, dmg: 10, src: b, big: true, kind: 'magma', life: 6, bounces: 4 }); }
    if (b.t > 0.8) { b.state = 'idle'; b.t = 0; b.cd = 1; }
  },
  nightmare(b, dt, dist, ang, ph) {
    if (b.spK) { // skuggkloner stormar in från sidorna
      if (b.t < 0.05) { bossWarn(b, 'SKUGGORNA RIDER!'); play('bossroar', 0.8, 1.5);
        for (let i = 0; i < 1 + ph; i++) { const a = rnd(0, TAU), x = P.x + Math.cos(a) * 7, y = P.y + Math.sin(a) * 7; if (!solid(x, y)) clones.push({ x, y, a: Math.atan2(P.y - y, P.x - x), t: -0.6 - i * 0.4, hit: false }); } }
      if (b.t > 1.5) { b.state = 'idle'; b.t = 0; b.cd = 1; }
      return;
    }
    if (b.t < 0.05) { darkT = 5; say('MARDRÖMMEN SLÄCKER LJUSET', 2); play('moan', 0.8, 0.6); }
    if (b.t > 0.6) { b.state = 'idle'; b.t = 0; b.cd = 0.5; }
  },
  ogre(b, dt, dist, ang, ph) {
    if (b.spK) { // taket rasar: stenar med skuggor som varning
      if (b.t < 0.05) { P.shake = 2.5; play('bigboom', 0.9, 0.5); bossWarn(b, 'TAKET RASAR!'); for (let i = 0; i < 5 + ph * 2; i++) { const a = rnd(0, TAU), r = i ? rnd(0.6, 4.5) : 0.2; fallHazard(P.x + Math.cos(a) * r, P.y + Math.sin(a) * r, 'rockfall', 12, 1.1 + i * 0.1); } }
      if (b.t > 2) { b.state = 'walk'; b.t = 0; b.cd = 0.8; }
      return;
    }
    // rullande stockar längs marken – hoppa över
    if (b.t < 0.05) { bossWarn(b, 'STOCKAR – HOPPA!'); play('whoosh', 0.8, 0.4); for (let i = -1; i <= 1; i += ph === 1 ? 2 : 1) projectiles.push({ x: b.x, y: b.y, z: 0.15, vx: Math.cos(ang + i * 0.3) * 4.5, vy: Math.sin(ang + i * 0.3) * 4.5, dmg: 12, src: b, big: true, kind: 'log', life: 5 }); }
    if (b.t > 0.9) { b.state = 'walk'; b.t = 0; b.cd = 1; }
  },
  ghost(b, dt, dist, ang, ph) {
    if (b.spK) { // spegelbilder som skjuter
      if (b.t < 0.05) { play('moan', 0.8, 1.2); say('VÅLNADEN DELAR SIG', 1.5); for (let i = 0; i < 2; i++) { const spot = freeSpotFar(3, 6); if (spot) mirrors.push({ x: spot[0], y: spot[1], t: 0, life: 7, shotT: rnd(1, 2) }); } }
      if (b.t > 0.8) { b.state = 'chase'; b.t = 0; b.cd = 1; }
      return;
    }
    if (b.t < 0.05) { play('hiss', 0.8, 0.5); for (let i = 0; i < 2 + ph; i++) projectiles.push({ x: b.x, y: b.y, z: 0.6, vx: Math.cos(ang + (i - 1) * 0.5) * 3, vy: Math.sin(ang + (i - 1) * 0.5) * 3, dmg: 8, src: b, kind: 'skull', life: 4.5 }); }
    if (b.t > 0.7) { b.state = 'chase'; b.t = 0; b.cd = 1; }
  },
};
let waves = [], clones = [], mirrors = [], darkT = 0, floorEvent = '', fogMul = 1;
function updateBossFx(dt) { // vågor, kloner och spegelbilder
  darkT = Math.max(0, darkT - dt);
  efx2Waves(); // version 25.1: bossarnas chockvågor (Effekseer)
  for (const w of waves) {
    w.r += w.sp * dt;
    if (!settings.lowfx) for (let i = 0; i < 4; i++) { const a = rnd(0, TAU); particles.push({ x: w.x + Math.cos(a) * w.r, y: w.y + Math.sin(a) * w.r, z: 0, vx: 0, vy: 0, vz: 0.6, life: 0.3, maxLife: 0.3, frames: fx.fire, img: fx.fire[0], size: 0.3, add: true, drift: true }); }
    const d = Math.hypot(P.x - w.x, P.y - w.y);
    if (!w.hit && Math.abs(d - w.r) < 0.35 && P.jz < 0.22) { w.hit = true; hurtPlayer(w.dmg, w.x, w.y, 'proj'); }
  }
  waves = waves.filter(w => w.r < 14);
  for (const c of clones) {
    c.t += dt; if (c.t < 0) continue;
    const ox = c.x, oy = c.y; c.x += Math.cos(c.a) * 7 * dt; c.y += Math.sin(c.a) * 7 * dt;
    if (solid(c.x, c.y)) { c.t = 99; spawnPuff(ox, oy, 6); }
    if (!c.hit && Math.hypot(P.x - c.x, P.y - c.y) < 0.9) { c.hit = true; hurtPlayer(12, c.x, c.y, 'melee'); }
  }
  clones = clones.filter(c => c.t < 2.5);
  for (const m of mirrors) {
    m.t += dt; m.shotT -= dt;
    if (m.shotT <= 0 && boss && !boss.dead) { m.shotT = rnd(1.6, 2.4); shootFireball({ x: m.x, y: m.y, boss: false }, Math.atan2(P.y - m.y, P.x - m.x), 3.2, 6, false, 'orb'); }
  }
  mirrors = mirrors.filter(m => m.t < m.life && !(boss && boss.dead));
}
function bossWarn(b, text) { if ((b.warnT || 0) < tmr) { b.warnT = tmr + 3; say(text, 1.2); play('stinger', 0.25, 1.6); } }
function bossMove(b, a, sp) { const ox = b.x, oy = b.y; tryMove(b, Math.cos(a) * sp, Math.sin(a) * sp, 0.9); b.mvx = b.x - ox; b.mvy = b.y - oy; return Math.hypot(b.mvx, b.mvy); }
let bossFlow = null, bossFlowKey = '', bossFlowRef = null;
function updateBossFlow() { // avståndsfält för stora bossar: bara rutor där hela kroppen (3×3 rutor) får plats, utom närmast spelaren
  const pc = (P.y | 0) * mw + (P.x | 0), key = pc + ':' + Math.floor(tmr * 2);
  if (bossFlowRef === flow && key === bossFlowKey) return; bossFlowRef = flow; bossFlowKey = key;
  if (!bossFlow || bossFlow.length !== mw * mh) bossFlow = new Int16Array(mw * mh);
  bossFlow.fill(-1); bossFlow[pc] = 0; const q = [pc];
  const fits = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (solid(x + dx + 0.5, y + dy + 0.5)) return false; return true; };
  for (let h = 0; h < q.length; h++) {
    const c = q[h], x = c % mw, y = (c / mw) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 1 || ny < 1 || nx >= mw - 1 || ny >= mh - 1) continue;
      const n = ny * mw + nx; if (bossFlow[n] >= 0 || !walkableForEnemy(nx, ny) || (bossFlow[c] >= 2 && !fits(nx, ny))) continue;
      bossFlow[n] = bossFlow[c] + 1; q.push(n);
    }
  }
}
function bossChase(b, sp) { // utom synhåll: följ bossfältet runt hinder i stället för att stå still
  updateBossFlow();
  const cx = b.x | 0, cy = b.y | 0, own = bossFlow[cy * mw + cx]; let best = own, tx = -1, ty = -1;
  const nb = own < 0 ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dx, dy] of nb) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= mw || ny >= mh) continue; const v = bossFlow[ny * mw + nx]; if (v >= 0 && (best < 0 || v < best)) { best = v; tx = nx + 0.5; ty = ny + 0.5; } }
  if (tx < 0) { // inget bossfält här: vanliga avståndsfältet, annars rakt mot spelaren
    best = flow[cy * mw + cx];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= mw || ny >= mh) continue; const v = flow[ny * mw + nx]; if (v >= 0 && (best < 0 || v < best)) { best = v; tx = nx + 0.5; ty = ny + 0.5; } }
  }
  return bossMove(b, tx < 0 ? Math.atan2(P.y - b.y, P.x - b.x) : Math.atan2(ty - b.y, tx - b.x), sp);
}
function freeSpotFar(minD, maxD) { // fri plats på lagom avstånd från spelaren (teleport, framträdanden)
  for (let i = 0; i < 40; i++) {
    const a = rnd(0, TAU), r = rnd(minD, maxD), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
    if (freeSpot(x, y, 0.9) && hasLOS(P.x, P.y, x, y)) return [x, y];
  }
  return null;
}
const bossShotDmg = (b, n) => n * (b.guardian ? GUARD_DMG : 1); // väktaren: fasta skottskador skalas som närstriden i makeGuardian
const BOSS_AI = {
  // Bendemonen: eldfläktar och vingslag, kallar på skelett från fas 2, snabbare i fas 3
  demon(b, dt, dist, ang, ph) {
    const fast = ph === 3 ? 1.5 : 1;
    if (ph >= 2) { b.summonT -= dt; if (b.summonT <= 0) { b.summonT = ph === 3 ? 9 : 13; summonMinions(b); } }
    if (b.state === 'breath') { // eldfläkt
      const k = Math.floor(b.t * 12);
      if (k >= 6 && k <= 14 && k !== b.lastShot && k % 2 === 0) {
        b.lastShot = k; const n = ph === 3 ? 7 : 5;
        for (let i = 0; i < n; i++) shootFireball(b, ang + (i - (n - 1) / 2) * 0.16 + rnd(-0.03, 0.03), 5.5 + ph * 0.5, bossShotDmg(b, 9), true);
        play('whoosh', 0.7, 0.6, { x: b.x, y: b.y });
      }
      if (b.t > 1.5) { b.state = 'idle'; b.t = 0; b.cd = rnd(1.4, 2.2) / fast; }
      return;
    }
    if (b.state === 'slam') { // vingslag + stöt
      if (!b.didHit && b.t > 0.85) {
        b.didHit = true; P.shake = Math.max(P.shake, 2.5); play('bigboom', 0.7, 0.8);
        if (dist < b.d.range) hurtPlayer(b.d.dmg, b.x, b.y, 'melee');
        const n = ph === 3 ? 14 : 10;
        if (ph >= 2) for (let i = 0; i < n; i++) shootFireball(b, i / n * TAU + b.t, 4.2, bossShotDmg(b, 8), true);
      }
      if (b.t > 1.3) { b.state = 'idle'; b.t = 0; b.cd = rnd(1.2, 2) / fast; }
      return;
    }
    b.cd -= dt;
    if (b.cd <= 0 && hasLOS(b.x, b.y, P.x, P.y)) {
      b.t = 0; b.didHit = false; b.lastShot = -1;
      b.state = dist < b.d.range + 0.6 || (ph >= 2 && Math.random() < 0.35) ? 'slam' : 'breath';
      if (b.state === 'slam') { play('bossroar', 0.7, 1.2); bossWarn(b, 'BENDEMONEN LYFTER VINGARNA!'); }
      return;
    }
    if (dist > 3) bossMove(b, ang, b.d.speed * fast * dt * (b.slow > 0 ? 0.5 : 1));
  },
  // Helvetesbesten: eldklot och eldpelare under spelaren; från fas 2 sjunker den ned och dyker upp någon annanstans
  beast(b, dt, dist, ang, ph) {
    if (b.state === 'breath') {
      const k = Math.floor(b.t / 0.22);
      if (k >= 1 && k <= 3 + (ph === 3 ? 2 : 0) && k !== b.lastShot) { b.lastShot = k; shootFireball(b, ang + rnd(-0.05, 0.05), 6.5, bossShotDmg(b, 10), true); play('whoosh', 0.6, 0.7, { x: b.x, y: b.y }); }
      if (b.t > 1.3) { b.state = 'idle'; b.t = 0; b.cd = rnd(1.3, 2) / (ph === 3 ? 1.4 : 1); }
      return;
    }
    if (b.state === 'burn') {
      if (!b.didHit && b.t > 0.35) {
        b.didHit = true; play('fireburst', 0.8, 0.6);
        const n = 1 + ph * 2;
        for (let i = 0; i < n; i++) { const a = rnd(0, TAU), r = i ? rnd(0.8, 2.6) : 0; addHazard(P.x + Math.cos(a) * r + P.vx * 0.3, P.y + Math.sin(a) * r + P.vy * 0.3, 'pillar', { warn: 0.9, life: 0.9, r: 0.75, dmg: 16 }); }
      }
      if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = rnd(1.2, 1.8); }
      return;
    }
    if (b.state === 'sink') { // försvinner ned i marken och dyker upp igen
      if (b.t > 0.6 && !b.hidden) { b.hidden = true; play('fireburst', 0.7, 0.5, { x: b.x, y: b.y }); }
      if (b.t > 1.4) {
        const spot = freeSpotFar(5, 9); if (spot) [b.x, b.y] = spot;
        b.hidden = false; b.state = 'idle'; b.t = 0; b.cd = 0.4; spawnPuff(b.x, b.y, 12); play('bossroar', 0.8, 0.8);
        if (ph === 3) for (let i = 0; i < 10; i++) shootFireball(b, i / 10 * TAU, 4.5, bossShotDmg(b, 8), true);
      }
      return;
    }
    b.cd -= dt; b.sinkT = (b.sinkT ?? 8) - dt;
    if (ph >= 2 && b.sinkT <= 0) { b.sinkT = ph === 3 ? 7 : 10; b.state = 'sink'; b.t = 0; return; }
    if (b.cd <= 0 && hasLOS(b.x, b.y, P.x, P.y)) { b.t = 0; b.didHit = false; b.lastShot = -1; b.state = Math.random() < (ph === 1 ? 0.45 : 0.6) ? 'burn' : 'breath'; play('bossroar', 0.6, 1.3); if (b.state === 'burn') bossWarn(b, 'MARKEN GLÖDER – FLYTTA DIG!'); return; }
    if (dist > 6) bossMove(b, ang, b.d.speed * dt * (b.slow > 0 ? 0.5 : 1));
  },
  // Mardrömmen: cirklar och skjuter blå eld, stampar och stormar fram med ett spår av blå eld; yr om den krockar
  nightmare(b, dt, dist, ang, ph) {
    const sp = (ph === 3 ? 1.3 : 1) * (b.slow > 0 ? 0.5 : 1);
    if (b.state === 'windup') { if (b.t > (ph === 3 ? 0.5 : 0.8)) { b.state = 'charge'; b.t = 0; b.chargeA = Math.atan2(P.y - b.y, P.x - b.x); b.trail = 0; } return; }
    if (b.state === 'charge') {
      const moved = bossMove(b, b.chargeA, 8 * sp * dt);
      b.trail += moved; if (b.trail > 0.45) { b.trail = 0; addHazard(b.x, b.y, 'bluefire', { warn: 0, life: 3, r: 0.6, dmg: 7 }); }
      if (dist < 1.3 && !b.didHit) { b.didHit = true; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); tryMove(P, Math.cos(b.chargeA) * 0.9, Math.sin(b.chargeA) * 0.9, 0.25); P.shake = 2.5; play('bigboom', 0.6, 1.2); }
      if (moved < 8 * sp * dt * 0.3 || b.t > 2) { // vägg: yr och sårbar en stund
        if (b.t <= 2) { b.stun = 1.4; P.shake = Math.max(P.shake, 1.5); play('bigboom', 0.7, 0.7, { x: b.x, y: b.y }); say('MARDRÖMMEN ÄR YR!', 1); }
        b.charges = (b.charges || 1) - 1;
        b.state = b.charges > 0 ? 'windup' : 'circle'; b.t = 0; b.cd = rnd(2, 3);
      }
      return;
    }
    // cirkla runt spelaren på avstånd och skjut blå eld
    b.cd -= dt; b.shotT = (b.shotT ?? 1.2) - dt; b.state = 'circle';
    const want = 6, side = ang + Math.PI / 2 * (b.dir || 1) + (dist > want ? -0.6 : 0.6) * (b.dir || 1);
    if (bossMove(b, side, b.d.speed * sp * dt) < b.d.speed * sp * dt * 0.3) b.dir = -(b.dir || 1);
    if (b.shotT <= 0 && hasLOS(b.x, b.y, P.x, P.y)) { b.shotT = ph === 3 ? 0.8 : 1.2; shootFireball(b, ang + rnd(-0.04, 0.04), 6, bossShotDmg(b, 9), false, 'blue'); play('whoosh', 0.5, 1.1, { x: b.x, y: b.y }); }
    if (b.cd <= 0 && hasLOS(b.x, b.y, P.x, P.y)) { b.state = 'windup'; b.t = 0; b.didHit = false; b.charges = ph >= 2 ? 2 : 1; play('bossroar', 0.9, 1.4); bossWarn(b, 'MARDRÖMMEN STAMPAR – GÅ ÅT SIDAN!'); }
  },
  // Ogern: kliver fram och krossar marken (stötvåg av stenar), kastar block på håll, kallar på orkkrigare i fas 2
  ogre(b, dt, dist, ang, ph) {
    const fast = (ph === 3 ? 1.45 : 1) * (b.slow > 0 ? 0.5 : 1);
    if (b.state === 'smash' || b.state === 'throw') {
      if (!b.didHit && b.t > 0.6) {
        b.didHit = true;
        if (b.state === 'smash') {
          P.shake = Math.max(P.shake, 3); play('bigboom', 0.9, 0.6);
          if (dist < b.d.range + 0.3) hurtPlayer(b.d.dmg, b.x, b.y, 'melee');
          const n = ph === 3 ? 18 : 12;
          for (let i = 0; i < n; i++) shootFireball(b, i / n * TAU + rnd(-0.1, 0.1), 4.5, bossShotDmg(b, 10), false, 'rock');
        } else { shootFireball(b, ang, 7.5, bossShotDmg(b, 18), true, 'rock'); play('whoosh', 0.8, 0.5, { x: b.x, y: b.y }); }
      }
      if (b.t > 1.1) { b.state = 'walk'; b.t = 0; b.cd = rnd(1, 1.8) / fast; }
      return;
    }
    if (ph >= 2) { b.summonT -= dt; if (b.summonT <= 0) { b.summonT = 14; const spot = freeSpotFar(3, 6); if (spot) { const e = makeEnemy('W', spot[0], spot[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(spot[0], spot[1], 8); say('OGERNS SÖNER KOMMER', 1.5); } } }
    b.cd -= dt; b.state = 'walk';
    if (b.cd <= 0 && dist < b.d.range + 0.5) { b.state = 'smash'; b.t = 0; b.didHit = false; play('bossroar', 0.8, 0.7); bossWarn(b, 'OGERN HÖJER KLUBBAN!'); return; }
    if (b.cd <= 0 && dist > 5 && hasLOS(b.x, b.y, P.x, P.y) && Math.random() < dt * 1.5) { b.state = 'throw'; b.t = 0; b.didHit = false; return; }
    if (dist > 2) bossMove(b, ang, b.d.speed * fast * dt);
  },
  // Isdraken: isskärvor i solfjäder, istaggar runt sig, snöstorm i fas 2
  frost(b, dt, dist, ang, ph) {
    const fast = ph === 3 ? 1.35 : 1;
    if (ph >= 2) { P.slowT = Math.max(P.slowT, 0.15); if (!settings.lowfx && Math.random() < dt * 25) particles.push({ x: P.x + rnd(-3, 3), y: P.y + rnd(-3, 3), z: 1, vx: 2, vy: rnd(-0.5, 0.5), vz: -1, life: 1, maxLife: 1, frames: fx.parts.snow || fx.hit, img: (fx.parts.snow || fx.hit)[0], size: 0.04, drift: true }); } // snöstorm
    if (b.state === 'shards') {
      const k = Math.floor(b.t / 0.18);
      if (k >= 1 && k <= 3 + ph && k !== b.lastShot) { b.lastShot = k; const n = 3 + ph; for (let i = 0; i < n; i++) shootFireball(b, ang + (i - (n - 1) / 2) * 0.14, 6, bossShotDmg(b, 8), false, 'ice'); play('wisp', 0.6, 0.8, { x: b.x, y: b.y }); }
      if (b.t > 1.4) { b.state = 'idle'; b.t = 0; b.cd = rnd(1.2, 2) / fast; }
      return;
    }
    if (b.state === 'slam') {
      if (!b.didHit && b.t > 0.7) { b.didHit = true; P.shake = Math.max(P.shake, 2); play('ice_crack', 1, 0.6); if (dist < b.d.range) hurtPlayer(b.d.dmg, b.x, b.y, 'melee');
        const n = 8 + ph * 2; for (let i = 0; i < n; i++) { const a = i / n * TAU, r = 2.2 + (i % 2) * 1.2; addHazard(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, 'icespike', { warn: 0.5, life: 0.8, r: 0.6, dmg: 12 }); } }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = rnd(1, 1.6) / fast; }
      return;
    }
    b.cd -= dt;
    if (b.cd <= 0 && hasLOS(b.x, b.y, P.x, P.y)) { b.t = 0; b.didHit = false; b.lastShot = -1; b.state = dist < b.d.range + 1 ? 'slam' : 'shards'; if (b.state === 'slam') { play('frost_boss_roar', 0.8, 1.1); bossWarn(b, 'ISDRAKEN HÖJER SPIRAN!'); } return; }
    if (dist > 3) bossMove(b, ang, b.d.speed * fast * dt * (b.slow > 0 ? 0.5 : 1));
  },
  // Vålnaden: svävar, skjuter sökande klot, försvinner och dyker upp nära spelaren med ett skrik som saktar ned
  ghost(b, dt, dist, ang, ph) {
    if (b.state === 'vanish') { if (b.t > 0.7) { b.state = 'hidden'; b.t = 0; b.hidden = true; } return; }
    if (b.state === 'hidden') {
      if (b.t > 1.2) { const spot = freeSpotFar(2.2, 3.5); if (spot) [b.x, b.y] = spot; b.hidden = false; b.state = 'appear'; b.t = 0; spawnPuff(b.x, b.y, 10); }
      return;
    }
    if (b.state === 'appear') { if (b.t > 0.6) { b.state = 'shriek'; b.t = 0; b.didHit = false; play('bossroar', 1, 1.7); } return; }
    if (b.state === 'shriek') {
      if (!b.didHit && b.t > 0.3) {
        b.didHit = true; P.shake = Math.max(P.shake, 1.5);
        if (dist < 5) { P.slowT = 2.2; hurtPlayer(b.d.dmg * 0.6, b.x, b.y); say('SKRIKET FÖRLAMAR DIG', 1); }
        if (ph >= 2) for (let i = 0; i < 2; i++) { const spot = freeSpotFar(3, 6); if (spot) { const e = makeEnemy('S', spot[0], spot[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(spot[0], spot[1], 6); } }
      }
      if (b.t > 0.9) { b.state = 'chase'; b.t = 0; b.cd = rnd(1, 1.6); }
      return;
    }
    if (b.state === 'orbs') {
      const k = Math.floor(b.t / 0.3);
      if (k >= 1 && k <= (ph === 3 ? 5 : 3) && k !== b.lastShot) { b.lastShot = k; shootFireball(b, ang + rnd(-0.4, 0.4), 3.4, bossShotDmg(b, 9), false, 'orb'); play('hiss', 0.5, 0.7, { x: b.x, y: b.y }); }
      if (b.t > 1.8) { b.state = 'chase'; b.t = 0; b.cd = rnd(1.4, 2.2); }
      return;
    }
    b.cd -= dt; b.vanishT = (b.vanishT ?? 6) - dt; b.state = 'chase';
    if (b.vanishT <= 0) { b.vanishT = ph === 3 ? 4.5 : 7; b.state = 'vanish'; b.t = 0; play('whoosh', 0.7, 0.5, { x: b.x, y: b.y }); play('moan', 0.6, 0.9); bossWarn(b, 'VÅLNADEN FÖRSVANN...'); return; }
    if (b.cd <= 0 && hasLOS(b.x, b.y, P.x, P.y)) { b.state = 'orbs'; b.t = 0; b.lastShot = -1; return; }
    if (dist < b.d.range + 0.3 && (b.hitT = (b.hitT || 0) - dt) <= 0) { b.hitT = 1; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); }
    if (dist > 1.6) bossMove(b, ang + Math.sin(b.t * 2) * 0.5, b.d.speed * (ph === 3 ? 1.3 : 1) * dt * (b.slow > 0 ? 0.5 : 1));
  },
};
