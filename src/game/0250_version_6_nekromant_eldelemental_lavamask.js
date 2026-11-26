// ---------- Version 6: nekromant, eldelemental, lavamask, dödsriddare och banshee ----------
const AI_V6 = {
  necro(e, dt, dist, los) { // väcker döda fiender i närheten och håller avstånd
    e.raiseT = (e.raiseT ?? rnd(2, 4)) - dt;
    if (e.raiseT <= 0) {
      const corpses = ents.filter(o => o.dead && !o.gibbed && !o.boss && !o.raised && o.type !== 'Ñ' && enemyFrames[o.type] && Math.hypot(o.x - e.x, o.y - e.y) < 7).slice(0, 2);
      if (corpses.length) { e.raiseT = rnd(6, 8); e.state = 'attack'; e.t = 0; e.didHit = true; play('necro_raise', 0.8, 1, { x: e.x, y: e.y }); say('NEKROMANTEN VÄCKER DE DÖDA!', 1.5);
        for (const c of corpses) { const o = makeEnemy(c.type, c.x, c.y); o.hp = o.maxHp = o.maxHp * 0.5; o.alert = true; o.minion = true; o.raised = true; o.d = { ...o.d, score: 0 }; c.gibbed = true; ents.push(o); totalEnemies++; zap(e.x, e.y, c.x, c.y, [120, 255, 140]); spawnPuff(c.x, c.y, 6); }
        return true; }
      e.raiseT = 1.5;
    }
    return false;
  },
  elemental(e, dt) { // tänder marken där den går
    e.fireT = (e.fireT ?? 1) - dt;
    if (e.fireT <= 0 && (e.mvx || e.mvy) && !e.small) { e.fireT = rnd(1.2, 2); if (!solid(e.x, e.y)) groundFires.push({ x: e.x, y: e.y, t: 3, acc: 0 }); burnWebs(e.x, e.y, 1); }
    return false;
  },
  worm(e, dt, dist) { // gräver sig fram under jorden och dyker upp under dig
    e.wst = e.wst || 'under'; e.wt = (e.wt || 0) + dt;
    if (e.wst === 'under') {
      e.hidden = true; e.state = 'idle';
      const a = Math.atan2(P.y - e.y, P.x - e.x), sp = e.d.speed * dt * 1.1; const ox = e.x, oy = e.y; tryMove(e, Math.cos(a) * sp, Math.sin(a) * sp, 0.25); e.mvx = e.x - ox; e.mvy = e.y - oy;
      if (!settings.lowfx && Math.random() < dt * 8) particles.push({ x: e.x + rnd(-0.2, 0.2), y: e.y + rnd(-0.2, 0.2), z: 0.02, vx: rnd(-0.5, 0.5), vy: rnd(-0.5, 0.5), vz: 0.8, life: 0.5, maxLife: 0.5, img: fx.parts.rock ? fx.parts.rock[0] : fx.hit[1], size: 0.05, grav: true, tint: [120, 90, 70] }); // jorden rör sig
      if ((dist < 1.2 && e.wt > 1.5) || e.wt > 7) { e.wst = 'warn'; e.wt = 0; e.tx = P.x; e.ty = P.y; play('lavaworm', 0.7, 1, { x: e.x, y: e.y }); }
      return true;
    }
    if (e.wst === 'warn') { // sprickor och glöd: flytta dig!
      e.hidden = true; if (Math.random() < dt * 25) particles.push({ x: e.tx + rnd(-0.5, 0.5), y: e.ty + rnd(-0.5, 0.5), z: 0.02, vx: 0, vy: 0, vz: 1.2, life: 0.4, maxLife: 0.4, img: fx.parts.ember ? fx.parts.ember[0] : fx.hit[1], size: 0.06, add: true, tint: [255, 120, 40] });
      if (e.wt > 0.9) { e.wst = 'up'; e.wt = 0; e.x = e.tx; e.y = e.ty; e.hidden = false; e.state = 'attack'; e.t = 0; e.didHit = true; play('worm_emerge', 0.9, 1, { x: e.x, y: e.y }); P.shake = Math.max(P.shake, 0.8);
        if (Math.hypot(P.x - e.x, P.y - e.y) < 1.1) hurtPlayer(e.d.dmg * 1.4, e.x, e.y, 'melee');
        for (let i = 0; i < 8; i++) { const a = rnd(0, TAU); particles.push({ x: e.x, y: e.y, z: 0.1, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, vz: rnd(1, 3), life: 0.8, img: fx.parts.lavadrop ? fx.parts.lavadrop[0] : fx.fireball[0], size: 0.08, add: true, grav: true }); } }
      return true;
    }
    if (e.wst === 'up') { // ovanför marken: sårbar, spottar lava
      if (e.wt > 0.8 && !e.spat && dist < 8) { e.spat = true; const a = Math.atan2(P.y - e.y, P.x - e.x); shootFireball(e, a, 6, 7, false); }
      if (e.wt > 2.6) { e.wst = 'under'; e.wt = 0; e.spat = false; spawnPuff(e.x, e.y, 5); play('lavaworm', 0.5, 0.8, { x: e.x, y: e.y }); }
      return false;
    }
    return false;
  },
  knight(e, dt, dist, los) { // dödsriddaren: svärdsvåg på håll och sköldstöt
    e.waveT = (e.waveT ?? rnd(3, 5)) - dt;
    if (e.waveT <= 0 && los && dist > 2.5 && dist < 10) { e.waveT = rnd(4.5, 6); e.state = 'attack'; e.t = 0; e.didHit = true; const a = Math.atan2(P.y - e.y, P.x - e.x);
      projectiles.push({ x: e.x + Math.cos(a) * 0.5, y: e.y + Math.sin(a) * 0.5, z: 0.4, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, dmg: e.d.dmg * 0.8, src: e, kind: 'wave', big: true, life: 2.5 }); play('knight_wave', 0.7, 1, { x: e.x, y: e.y }); return true; }
    if (los && dist > 2.6 && dist < 6 && (e.bashT || 0) < tmr) { e.bashT = tmr + rnd(5, 7); e.charge = 0.45; e.chargeA = Math.atan2(P.y - e.y, P.x - e.x); play('deathknight', 0.6, 1, { x: e.x, y: e.y }); }
    if (e.charge > 0) { e.charge -= dt; tryMove(e, Math.cos(e.chargeA) * dt * 8, Math.sin(e.chargeA) * dt * 8, 0.3); if (dist < 1) { e.charge = 0; hurtPlayer(e.d.dmg * 0.7, e.x, e.y, 'melee'); for (let i = 0; i < 4; i++) tryMove(P, Math.cos(e.chargeA) * 0.15, Math.sin(e.chargeA) * 0.15, 0.24); P.shake = Math.max(P.shake, 1.2); } return true; }
    e.face = Math.atan2(P.y - e.y, P.x - e.x);
    return false;
  },
  banshee(e, dt, dist, los) { // syns bara som en skugga på håll; skriket saktar ned och förvirrar
    e.ghost = dist > 6 ? 0.7 : dist > 3.5 ? 0.35 : 0;
    e.screamT = (e.screamT ?? rnd(3, 5)) - dt;
    if (e.screamT <= 0 && los && dist < 7) { e.screamT = rnd(6, 8); e.state = 'attack'; e.t = 0; e.didHit = true; play('banshee_scream', 0.9, 1, { x: e.x, y: e.y });
      P.slowT = Math.max(P.slowT, 2); P.confT = 1.6; P.shake = Math.max(P.shake, 0.9); say('BANSHEEN SKRIKER – DU TAPPAR FOTFÄSTET', 1.5); hurtPlayer(3, e.x, e.y, 'proj'); return true; }
    if (e.state === 'move') { const a = Math.atan2(P.y - e.y, P.x - e.x) + Math.PI / 2, w = Math.sin(e.t * 2 + e.x) * dt * 1.2; tryMove(e, Math.cos(a) * w, Math.sin(a) * w, 0.2); }
    return false;
  },
};
function elementalSplit(e) { // eldelementalen delar sig i små flammor
  if (e.small) return;
  play('elemental_split', 0.7, 1, { x: e.x, y: e.y });
  for (let i = 0; i < 3; i++) { const a = i / 3 * TAU, x = e.x + Math.cos(a) * 0.6, y = e.y + Math.sin(a) * 0.6; if (solid(x, y)) continue;
    const o = makeEnemy('Æ', x, y); o.small = true; o.hp = o.maxHp = 1.5; o.d = { ...o.d, size: o.d.size * 0.5, dmg: o.d.dmg * 0.4, speed: o.d.speed * 1.4, score: 20 }; o.alert = true; o.minion = true; ents.push(o); totalEnemies++; }
}
// ---------- Version 6: vulkanen – hetta, askregn, utbrott ----------
function updateHeat(dt) {
  if (!lvl || lvl.biome !== 'volcano') { P.heat = 0; return; }
  let near = 0; const cx = P.x | 0, cy = P.y | 0;
  for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) if (map[y] && map[y][x] === '_') near++;
  const wet = cellUnder() === '-' || (P.coolT || 0) > 0;
  if (wet) P.heat = Math.max(0, (P.heat || 0) - dt * 4);
  else P.heat = clamp((P.heat || 0) + dt * (near * 0.12 - 0.35) * Math.max(0.1, 1 - mod('heatResist')), 0, 10);
  if (P.coolT > 0) P.coolT -= dt;
  if (P.heat > 6) { P.heatAcc = (P.heatAcc || 0) + dt; if (P.heatAcc > 1.5) { P.heatAcc = 0; if (P.hp > 5) { P.hp -= 2; P.hurt = 0.1; } if ((P.heatMsgT || 0) < tmr) { P.heatMsgT = tmr + 8; say('HETTAN BRÄNNER – SÖK SVALKA I VATTEN', 2.5); } } }
  eruptT -= dt;
  if (eruptT <= 0 && !boss) { eruptT = rnd(14, 24); say('VULKANEN MULLRAR – LAVABOMBER!', 1.8); play('eruption', 0.8); P.shake = Math.max(P.shake, 1.2); for (let i = 0; i < 4; i++) { const a = rnd(0, TAU), r = rnd(1, 5); const x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r; if (!solid(x, y)) fallHazard(x, y, 'meteor', 10, 1.2 + i * 0.3); } }
}
let eruptT = 18;
function drawHeatFx(g) { // värmedis och hetta i bilden
  if (!lvl || lvl.biome !== 'volcano' || settings.lowfx) return;
  if (P.heat > 1) { g.fillStyle = `rgba(255,90,20,${Math.min(0.22, P.heat * 0.025)})`; g.fillRect(0, 0, W, VH); }
  if (P.heat > 0.5 || (tmr * 7 | 0) % 2 === 0) { // värmedisen: förskjut några rader i underkanten av bilden
    const im = g.getImageData(0, HORIZON, W, VH - HORIZON), d = new Uint32Array(im.data.buffer), row = new Uint32Array(W);
    for (let y = 0; y < VH - HORIZON; y += 1) { const s = Math.round(Math.sin(tmr * 6 + y * 0.35) * (0.6 + Math.min(1.4, P.heat * 0.2)) * (y / (VH - HORIZON))); if (!s) continue; row.set(d.subarray(y * W, y * W + W)); for (let x = 0; x < W; x++) d[y * W + x] = row[clamp(x + s, 0, W - 1)]; }
    g.putImageData(im, 0, HORIZON);
  }
}
// ---------- Version 6: fällor – eldjet, pendel, tryckplatta, sköra plattor och nya fat ----------
const V6_TRAPS = new Set(['fire', 'pendulum', 'plate']);
let crumbles = {}; // sköra plattor: index -> { t } (t < 0 = orörd)
function trapV6(pr, dt) {
  const d = pr.def, inCell = (x, y, r = 0.48) => Math.abs(x - pr.x) < r && Math.abs(y - pr.y) < r;
  if (d.trap === 'fire') { // eldjeten sprutar i takt
    const cyc = (tmr + pr.ph * 0.7) % 3.4, was = pr.up; pr.up = cyc > 2.2;
    if (!pr.up && cyc > 1.8 && Math.random() < dt * 10) particles.push({ x: pr.x + rnd(-0.1, 0.1), y: pr.y + rnd(-0.1, 0.1), z: 0.05, vx: 0, vy: 0, vz: 0.6, life: 0.3, maxLife: 0.3, img: fx.parts.ember ? fx.parts.ember[0] : fx.hit[1], size: 0.04, add: true, tint: [255, 140, 50] }); // varning
    if (pr.up) {
      if (!was && Math.hypot(pr.x - P.x, pr.y - P.y) < 9) play('firejet', 0.55, rnd(0.95, 1.05), { x: pr.x, y: pr.y });
      if (!settings.lowfx && Math.random() < dt * 30) particles.push({ x: pr.x + rnd(-0.12, 0.12), y: pr.y + rnd(-0.12, 0.12), z: 0.05, vx: 0, vy: 0, vz: rnd(1.5, 2.6), life: 0.4, maxLife: 0.4, frames: fx.fire, img: fx.fire[0], size: 0.35, add: true });
      flashes.push({ x: pr.x, y: pr.y, t: 0.05, r: 3, col: [255, 120, 40] });
      if (inCell(P.x, P.y) && (pr.hitT || 0) < tmr) { pr.hitT = tmr + 0.6; run.cause = 'ELDJET'; hurtPlayer(9 * trapMul() * Math.max(0.2, 1 - mod('heatResist')), pr.x, pr.y); }
      for (const e of ents) if (!e.dead && !e.boss && !e.d.fireproof && inCell(e.x, e.y)) e.burn = Math.max(e.burn || 0, 2);
      burnWebs(pr.x, pr.y, 0.6);
    }
    return;
  }
  if (d.trap === 'pendulum') { // pendelbladet svänger längs korridoren
    if (pr.axis === undefined) pr.axis = solid(pr.x + 1, pr.y) && solid(pr.x - 1, pr.y) ? 1 : 0; // väggar öst/väst: korridoren går nord–syd
    const s = Math.sin(tmr * 2.2 + pr.ph); pr.off = s * 0.55;
    const bx = pr.x + (pr.axis ? 0 : pr.off), by = pr.y + (pr.axis ? pr.off : 0);
    if (Math.abs(s) < 0.25 && !pr.swT) { pr.swT = 1; if (Math.hypot(pr.x - P.x, pr.y - P.y) < 7) play('pendulum', 0.5, rnd(0.9, 1.1), { x: pr.x, y: pr.y }); } else if (Math.abs(s) > 0.6) pr.swT = 0;
    if (Math.hypot(P.x - bx, P.y - by) < 0.42 && (pr.hitT || 0) < tmr && !(P.crouch > 0.5 && P.slide > 0)) { pr.hitT = tmr + 0.8; run.cause = 'PENDELBLAD'; hurtPlayer(14 * trapMul(), bx, by, 'melee'); spawnBlood(P.x, P.y); }
    for (const e of ents) if (!e.dead && !e.boss && Math.hypot(e.x - bx, e.y - by) < 0.42 && (e.spikeT || 0) < tmr) { e.spikeT = tmr + 0.8; hurtEnemy(e, 10, e.x, e.y, { noProc: true }); }
    return;
  }
  if (d.trap === 'plate') { // tryckplattan öppnar en hemlighet i närheten
    const on = inCell(P.x, P.y, 0.45) && P.jz < 0.1; pr.up = !on && !pr.used;
    if (on && !pr.used) {
      pr.used = true; play('plate_click', 0.8); P.shake = Math.max(P.shake, 0.3);
      let best = null, bd = 14;
      for (const k in doors) { const dd = doors[k]; if (dd.secret && !dd.target) { const dist = Math.hypot(dd.x + 0.5 - pr.x, dd.y + 0.5 - pr.y); if (dist < bd) { bd = dist; best = dd; } } }
      if (best) { best.target = 1; secrets++; score += 250; profile.secrets = (profile.secrets || 0) + 1; play('secret', 0.8); say('TRYCKPLATTAN ÖPPNADE EN HEMLIG DÖRR!', 3); return; }
      for (let y = Math.max(0, pr.cy - 8); y < Math.min(mh, pr.cy + 9); y++) for (let x = Math.max(0, pr.cx - 8); x < Math.min(mw, pr.cx + 9); x++) if (map[y][x] === '{') { blowWall(x, y); return; }
      say('PLATTAN KLICKAR... INGET HÄNDER', 1.5);
    }
  }
}
function updateCrumbles(dt) { // sköra plattor rasar strax efter att någon gått på dem
  const k = (P.y | 0) * mw + (P.x | 0);
  if (crumbles[k] && crumbles[k].t < 0 && P.jz < 0.1) { crumbles[k].t = 0; play('crumble', 0.6, 1.2); }
  if (!crumbles[k] || crumbles[k].t < 0) { P.safeX = P.x; P.safeY = P.y; }
  for (const key in crumbles) {
    const c = crumbles[key]; if (c.t < 0 || c.done) continue;
    c.t += dt; const x = key % mw, y = (key / mw) | 0;
    if (Math.random() < dt * 12) particles.push({ x: x + rnd(0.1, 0.9), y: y + rnd(0.1, 0.9), z: 0.02, vx: 0, vy: 0, vz: 0.4, life: 0.4, maxLife: 0.4, img: fx.parts.dust ? fx.parts.dust[0] : fx.hit[1], size: 0.06, tint: [150, 130, 110] });
    if (c.t > 0.75) {
      c.done = true; map[y][x] = '·'; flowCell = -1; if (animTex.pit !== undefined) cellFloor[+key] = animTex.pit; play('crumble', 0.8, 0.8, { x: x + 0.5, y: y + 0.5 });
      for (let i = 0; i < 6; i++) particles.push({ x: x + 0.5, y: y + 0.5, z: 0.05, vx: rnd(-0.6, 0.6), vy: rnd(-0.6, 0.6), vz: rnd(0.5, 1.5), life: 0.8, img: fx.parts.rock ? fx.parts.rock[0] : fx.shards[7], size: 0.08, grav: true });
      if ((P.x | 0) === x && (P.y | 0) === y) { run.cause = 'RASET'; hurtPlayer(15 * trapMul()); say('GOLVET RASADE!', 1.5); P.x = P.safeX ?? P.x; P.y = P.safeY ?? P.y; if ((P.x | 0) === x && (P.y | 0) === y) { const s = randomFreeCell(RNG(Date.now())); if (s) [P.x, P.y] = s; } }
      for (const e of ents) if (!e.dead && !e.boss && (e.x | 0) === x && (e.y | 0) === y) { hurtEnemy(e, 999, e.x, e.y, { noProc: true }); }
    }
  }
}
function barrelBurst(f) { // gift- och isfat
  if (f.kind === 'flask') { v17Cloud(f.x, f.y, null, 2.5); return; } // flaskhyllan: ett färgat moln
  if (f.kind === 'poison') { play('barrel_poison', 0.8, 1, { x: f.x, y: f.y }); sporeCloud(f.x, f.y); for (const e of ents) if (!e.dead && Math.hypot(e.x - f.x, e.y - f.y) < 2.6) e.poison = Math.max(e.poison || 0, 6); if (Math.hypot(P.x - f.x, P.y - f.y) < 2.2) P.poisonT = Math.max(P.poisonT || 0, 4); }
  if (f.kind === 'frost') { play('barrel_frost', 0.8, 1, { x: f.x, y: f.y }); frostBurst(f.x, f.y); for (const e of ents) if (!e.dead && Math.hypot(e.x - f.x, e.y - f.y) < 2.6) freeze(e, 3); if (Math.hypot(P.x - f.x, P.y - f.y) < 2) P.slowT = Math.max(P.slowT, 2); }
}
// ---------- Version 6: smartare fiender ----------
function enemyFeelV6(e, dt) {
  if (e.boss || e.dormant) return;
  for (const p of projectiles) if (p.kind === 'pgren' && Math.hypot(p.x - e.x, p.y - e.y) < 2.4 && !e.stun) { const d = Math.hypot(e.x - p.x, e.y - p.y) || 1; tryMove(e, (e.x - p.x) / d * dt * 3, (e.y - p.y) / d * dt * 3, 0.28); if (!e.dodgeMsg) { e.dodgeMsg = 1; spawnText(e.x, e.y, '!', '#ffb040'); } } // undviker granater
  if (e.hp < e.maxHp * 0.4 && e.type !== 'O' && !e.elite) { const sh = ents.find(o => o.type === 'O' && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 9); if (sh && Math.hypot(sh.x - e.x, sh.y - e.y) > 1.5) { const d = Math.hypot(sh.x - e.x, sh.y - e.y); tryMove(e, (sh.x - e.x) / d * dt * e.d.speed, (sh.y - e.y) / d * dt * e.d.speed, 0.28); } } // till shamanen för helning
  if (hasMod(e, 'burning') && Math.hypot(P.x - e.x, P.y - e.y) < 1.7 && (e.auraT || 0) < tmr) { e.auraT = tmr + 1; hurtPlayer(3, e.x, e.y, 'proj'); }
  if (hasMod(e, 'burning') && !settings.lowfx && Math.random() < dt * 10) particles.push({ x: e.x + rnd(-0.4, 0.4), y: e.y + rnd(-0.4, 0.4), z: rnd(0, 0.5), vx: 0, vy: 0, vz: 0.8, life: 0.4, maxLife: 0.4, frames: fx.fire, img: fx.fire[0], size: 0.2, add: true });
  if (hasMod(e, 'magnet') && e.alert && Math.hypot(P.x - e.x, P.y - e.y) < 6 && Math.hypot(P.x - e.x, P.y - e.y) > 1.2) { const d = Math.hypot(P.x - e.x, P.y - e.y); tryMove(P, (e.x - P.x) / d * dt * 1.2, (e.y - P.y) / d * dt * 1.2, 0.24); }
}
function leaderDied(e) { // gruppens ledare dör: de andra sprider sig och flyr en stund
  for (const o of ents) if (!o.dead && !o.boss && o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 7) { o.fleeT = 2.2; spawnText(o.x, o.y, '?', '#e8d9b0'); }
  say('LEDAREN FÖLL – DE ANDRA TVEKAR', 1.5);
}
function setupV6Roles(rng) { // ledare och fiender som bär föremål
  if (!lvl.rooms || boss) return;
  const byRoom = {};
  for (const e of ents) { if (e.boss || e.dormant || e.minion || e.elite) continue; const r = roomAt(e.x, e.y); if (!r) continue; (byRoom[lvl.rooms.indexOf(r)] = byRoom[lvl.rooms.indexOf(r)] || []).push(e); }
  for (const k in byRoom) { const g = byRoom[k]; if (g.length >= 3 && rng.next() < 0.5) { const l = g.sort((a, b) => b.maxHp - a.maxHp)[0]; l.leader = true; l.hp = l.maxHp = l.maxHp * 1.5; l.d = { ...l.d, size: l.d.size * 1.1 }; } }
  for (const e of ents) if (!e.boss && !e.dormant && rng.next() < 0.08) e.carry = rng.pick(['key', 'potion', 'goldpile', 'grenade']);
}
// ---------- Version 6: runor som fästs i vapnen ----------
const RUNES = {
  fire: { name: 'ELDRUNAN', text: 'SKOTTEN TÄNDER ELD', col: '#ff8030', tint: [255, 128, 48] },
  ice: { name: 'ISRUNAN', text: 'SKOTTEN SAKTAR NED OCH FRYSER IBLAND', col: '#80d0ff', tint: [128, 208, 255] },
  poison: { name: 'GIFTRUNAN', text: 'SKOTTEN FÖRGIFTAR', col: '#70e050', tint: [112, 224, 80] },
  storm: { name: 'STORMRUNAN', text: 'SKOTTEN SLÅR IBLAND NED BLIXT I EN ANNAN FIENDE', col: '#a0b8ff', tint: [160, 184, 255] },
  blood: { name: 'BLODRUNAN', text: 'SKOTTEN GER DIG LIV TILLBAKA', col: '#e03040', tint: [224, 48, 64] },
  echo: { name: 'EKORUNAN', text: 'VAR FEMTE TRÄFF UPPREPAS', col: '#e8d9b0', tint: [232, 217, 176] },
};
const RUNE_IDS = Object.keys(RUNES);
const runeSlots = () => 1 + meta('runeslot') + Math.round(mod('runeSlots'));
const runesOf = id => (run && run.wrunes && run.wrunes[id]) || [];
const curRunes = () => run ? runesOf(WEAPONS[P.weapon].id) : [];
function giveRune(id, why) {
  run.runeBag = run.runeBag || []; run.runeBag.push(id); play('rune_proc', 0.7); stat('runesFound');
  say(`${why || 'DU HITTADE'} ${RUNES[id].name}: ${RUNES[id].text}`, 3);
  const wp = WEAPONS[P.weapon];
  if (!wp.melee || true) setTimeout(() => { if (state !== 'play') return; openUI(() => CardUI.choice({ title: RUNES[id].name, subtitle: RUNES[id].text, cancel: 1,
    options: [{ label: 'FÄST I ' + wp.name, text: runesOf(wp.id).length >= runeSlots() ? 'ERSÄTTER ' + RUNES[runesOf(wp.id)[0]].name : `${runesOf(wp.id).length + 1} AV ${runeSlots()} RUNPLATSER` }, { label: 'SPARA', text: 'FÄST DEN VID EN SMEDJA SENARE' }] },
    i => { closeUI(); if (i === 0) socketRune(id, wp.id); })); }, 400);
}
function socketRune(id, wid) {
  const bag = run.runeBag || [], i = bag.indexOf(id); if (i < 0) return; bag.splice(i, 1);
  run.wrunes = run.wrunes || {}; const list = (run.wrunes[wid] = run.wrunes[wid] || []);
  if (list.length >= runeSlots()) { const old = list.shift(); say(RUNES[old].name + ' SPRACK', 1.5); }
  list.push(id); play('rune_socket', 0.9); stat('runesSocketed'); logEvent('RUNA: ' + RUNES[id].name);
  say(`${RUNES[id].name} SITTER I ${WEAPONS[weaponIndex(wid)].name}`, 2.5);
  for (let k = 0; k < 10; k++) particles.push({ x: P.x + Math.cos(P.a) * 0.6, y: P.y + Math.sin(P.a) * 0.6, z: 0.4, vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(0.5, 1.5), life: 0.6, maxLife: 0.6, img: fx.hit[1], size: 0.05, add: true, tint: RUNES[id].tint, fade: true });
}
function runeProc(e, dmg) { // runornas effekter på spelarens träffar
  const rs = curRunes(); if (!rs.length || e.dead && !e.dying) return;
  const pw = 1 + mod('runePower');
  for (const r of rs) {
    if (r === 'fire' && Math.random() < 0.35 * pw && !e.d.fireproof) { e.burn = Math.max(e.burn || 0, 3); e.burnAcc = e.burnAcc || 0; }
    if (r === 'ice') { e.slow = Math.max(e.slow || 0, 1.5 * pw); if (Math.random() < 0.12 * pw) freeze(e, 1.5); }
    if (r === 'poison' && Math.random() < 0.4 * pw) e.poison = Math.max(e.poison || 0, 4);
    if (r === 'storm' && Math.random() < 0.12 * pw) { const o = nearestFoes(e, 5, 1)[0]; if (o) { zap(e.x, e.y, o.x, o.y, [160, 190, 255]); hurtEnemy(o, dmg * 0.8, o.x, o.y, { noProc: true }); play('shock', 0.4, 1.3, { x: o.x, y: o.y }); flashes.push({ x: o.x, y: o.y, t: 0.1, r: 3, col: [140, 170, 255] }); } }
    if (r === 'blood') heal(dmg * 0.06 * pw, true);
    if (r === 'echo') { WS.echoN = (WS.echoN || 0) + 1; if (WS.echoN % 5 === 0 && !e.dead) { setTimeout(() => { if (!e.dead && map) { hurtEnemy(e, dmg, e.x, e.y, { noProc: true }); spawnText(e.x, e.y, 'EKO', '#e8d9b0'); } }, 150); } }
  }
  if (!settings.lowfx && Math.random() < 0.3) { const t = RUNES[rs[0]].tint; particles.push({ x: e.x, y: e.y, z: 0.5, vx: rnd(-0.6, 0.6), vy: rnd(-0.6, 0.6), vz: 0.8, life: 0.4, maxLife: 0.4, img: fx.hit[1], size: 0.05, add: true, tint: t, fade: true }); }
}
function openRuneSocket() { // smedjan: fäst en sparad runa i vapnet du håller
  const bag = run.runeBag || [], wp = WEAPONS[P.weapon];
  if (!bag.length) { say('DU HAR INGA RUNOR', 1.5); return; }
  openUI(() => CardUI.list('FÄST EN RUNA', `${wp.name}: ${runesOf(wp.id).map(r => RUNES[r].name).join(', ') || 'INGA RUNOR'} (${runeSlots()} PLATS${runeSlots() > 1 ? 'ER' : ''})`,
    bag.map(id => ({ label: RUNES[id].name, text: RUNES[id].text, color: RUNES[id].col, img: hudImg['rune_' + id] ? hudImg['rune_' + id].src : undefined, onClick: () => { CardUI.close(); socketRune(id, wp.id); closeUI(); } })), () => closeUI()));
}
// ---------- Version 6: lägerelden ----------
function floorHint(from) { // fångens tips om våningen
  const dir = (x, y) => { const a = Math.atan2(y - from.y, x - from.x), k = Math.round(((a + TAU) % TAU) / (TAU / 8)) % 8; return ['ÖSTER', 'SYDOST', 'SÖDER', 'SYDVÄST', 'VÄSTER', 'NORDVÄST', 'NORR', 'NORDOST'][k]; };
  const st = props.find(p => p.ch === '÷' && !p.used); if (st) return 'EN HEMLIG TRAPPA FINNS NÅGONSTANS I ' + dir(st.x, st.y);
  for (const k in doors) { const d = doors[k]; if (d.secret && !d.target) return 'JAG HÖRDE ETT EKO BAKOM EN VÄGG I ' + dir(d.x, d.y); }
  const v = lvl.rooms && lvl.rooms.find(r => r.type === 'vault' || r.type === 'treasure'); if (v) return 'SKATTEN LIGGER I ' + dir(v.x + v.w / 2, v.y + v.h / 2);
  const el = ents.find(e => e.elite && !e.dead); if (el) return 'EN STARK FIENDE VAKTAR I ' + dir(el.x, el.y);
  return 'INGENTING ÄR SOM DET SER UT HÄR NERE';
}
function openCampfire(pr) {
  if (pr.used) { say('ELDEN HAR BRUNNIT NED', 1.5); return; }
  const wp = WEAPONS[P.weapon], lv = wlvl(wp.id), healN = Math.round(maxHp() * 0.4 * (1 + mod('campfireHeal'))), meat = run.meat || 0;
  const canRefine = window.Cards && Cards.refine && run.owned.some(id => Cards.refine(id));
  play('campfire', 0.6); play('rest', 0.5);
  openUI(() => CardUI.choice({ title: 'LÄGERELDEN', subtitle: 'TID FÖR EN SAK', cancel: 4,
    options: [
      { label: `VILA (+${healN} HP)`, text: P.hp >= maxHp() ? 'DU ÄR REDAN UTVILAD' : 'LÄK DINA SÅR' },
      { label: 'SMIDA', text: lv >= 3 ? `${wp.name} ÄR FULLT SMIDD` : `${wp.name} NIVÅ ${lv} → ${lv + 1} (+12 % SKADA)` },
      { label: 'FÖRÄDLA ETT KORT', text: canRefine ? 'ETT KORT BLIR STARKARE (+)' : 'INGA KORT KAN FÖRÄDLAS' },
      { label: meat ? `LAGA MAT (${meat} KÖTT)` : 'LAGA MAT', text: meat ? '+40 HP, +5 MAX HP OCH +10 % SKADA PÅ VÅNINGEN' : 'DU HAR INGET KÖTT' },
      { label: 'GÅ VIDARE', text: '' },
    ] }, i => {
    if (i === 0 && P.hp < maxHp()) { pr.used = true; heal(healN); play('rest', 0.8); say('DU VILAR VID ELDEN', 2); }
    else if (i === 1 && lv < 3) { pr.used = true; run.wlvl = run.wlvl || {}; run.wlvl[wp.id] = lv + 1; play('anvil', 0.8); say(`${wp.name} NIVÅ ${lv + 1}`, 2); }
    else if (i === 2 && canRefine) { pr.used = true; closeUI(); setTimeout(() => openUI(() => CardUI.refine(run.owned.filter(id => Cards.refine(id)), id => { const f = Cards.refine(id); if (f) { run.owned.splice(run.owned.indexOf(id), 1, f); run.cardAt = run.cardAt || {}; run.cardAt[f] = run.cardAt[id]; recomputeMods(); play('fuse_cards', 0.8); say((Cards.byId(f) || {}).name + ' – FÖRÄDLAT', 2.5); stat('refined'); } closeUI(); }, () => closeUI())), 50); return; }
    else if (i === 3 && meat) { pr.used = true; run.meat--; const k = 1 + mod('mealPower'); heal(40 * k); run.mealHp = (run.mealHp || 0) + 5; run.mealFloor = run.depth; P.mealDmg = 0.1 * k; play('eat', 0.8); say('EN STARK MÅLTID: +5 MAX HP, MER SKADA PÅ VÅNINGEN', 2.5); stat('meals'); }
    else if (i < 4) { say('DET GÅR INTE NU', 1.2); play('click', 0.5, 0.7); }
    closeUI(); checkAch();
  }));
}
// ---------- Version 6: anslagstavlan och sidouppdrag ----------
let quests = null;
function makeQuests(rng) {
  const own = WEAPONS.map((w, i) => i).filter(i => P.has[i] && !WEAPONS[i].melee), wi = own.length ? own[(rng.next() * own.length) | 0] : 0, n = 4 + Math.min(4, run.depth);
  const pool = [
    { kind: 'wkills', weapon: WEAPONS[wi].id, n, have: 0, text: `DÖDA ${n} FIENDER MED ${WEAPONS[wi].name}` },
    totalSecrets ? { kind: 'secret', text: 'HITTA EN HEMLIGHET PÅ VÅNINGEN', start: secrets } : null,
    { kind: 'nopotion', text: 'KLARA VÅNINGEN UTAN DRYCKER', start: (run.potionsDrunk || 0) },
    ents.some(e => e.elite && !e.dead) ? { kind: 'elite', text: 'DÖDA EN ELIT INOM 90 SEKUNDER', limit: 90 } : null,
    { kind: 'combo', n: 5 + run.depth, text: `NÅ KOMBO x${5 + run.depth}` },
    { kind: 'nohurt', text: 'TA INGEN SKADA PÅ 60 SEKUNDER', limit: 60 },
  ].filter(Boolean);
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice((rng.next() * pool.length) | 0, 1)[0]);
  for (const q of out) q.reward = rng.pick(['gold', 'gold', 'card', 'rune']);
  return out;
}
function openQuestBoard(pr) {
  if (!quests) { quests = makeQuests(RNG(RNG.hash(run.seed + ':uppdrag:' + run.depth))); for (const q of quests) { q.t0 = levelTime; q.hurt0 = lvlStat.taken; } play('quest_new', 0.8); }
  const rw = { gold: `${Math.round(50 * (1 + mod('questGold')))} GULD`, card: 'ETT KORTVAL', rune: 'EN RUNA' };
  openUI(() => CardUI.list('ANSLAGSTAVLAN', 'TRE UPPDRAG FÖR VÅNINGEN – DE RÄKNAS FRÅN NU', quests.map(q => ({ label: q.text, text: (q.done ? 'KLART! ' : q.failed ? 'MISSLYCKAT · ' : 'BELÖNING: ') + rw[q.reward], color: q.done ? '#9fe0a0' : q.failed ? '#a05040' : '#e8d9b0' })), () => closeUI()));
}
function questTick() {
  if (!quests || state !== 'play') return;
  for (const q of quests) {
    if (q.done || q.failed) continue;
    let ok = false;
    if (q.kind === 'wkills') ok = q.have >= q.n;
    else if (q.kind === 'secret') ok = secrets > q.start;
    else if (q.kind === 'elite') { if (levelTime - q.t0 > q.limit) q.failed = true; else ok = !!q.eliteKilled; }
    else if (q.kind === 'combo') ok = P.combo >= q.n;
    else if (q.kind === 'nohurt') { if (lvlStat.taken > q.hurt0) { q.hurt0 = lvlStat.taken; q.t0 = levelTime; } ok = levelTime - q.t0 >= q.limit; }
    else if (q.kind === 'nopotion') { if ((run.potionsDrunk || 0) > q.start) q.failed = true; }
    if (q.failed) { say('UPPDRAGET MISSLYCKADES: ' + q.text, 2); play('click', 0.6, 0.5); }
    if (ok) questDone(q);
  }
}
function questDone(q) {
  q.done = true; stat('quests'); play('quest_done', 0.8); say('UPPDRAG KLART: ' + q.text, 3);
  if (q.reward === 'gold') { const g = Math.round(50 * (1 + mod('questGold'))); run.gold += g; spawnText(P.x + Math.cos(P.a), P.y + Math.sin(P.a), `+${g} GULD`, '#ffd24a'); }
  else if (q.reward === 'card') items.push({ type: 'cardpick', x: P.x + Math.cos(P.a) * 0.8, y: P.y + Math.sin(P.a) * 0.8, taken: false, drop: true, luck: 0.7, title: 'UPPDRAGETS BELÖNING' });
  else giveRune(RUNE_IDS[(Math.random() * RUNE_IDS.length) | 0], 'BELÖNING:');
  checkAch();
}
function questFloorEnd() { // vid våningens slut: uppdraget utan drycker klaras
  if (!quests) return;
  for (const q of quests) if (q.kind === 'nopotion' && !q.done && !q.failed) questDone(q);
}
// ---------- Version 6: hemliga trappor ----------
function enterSecretStairs(pr) {
  if (!Gen.secret) { say('TRAPPAN ÄR RASAD', 1.5); return; }
  openUI(() => CardUI.choice({ title: 'DEN HEMLIGA TRAPPAN', subtitle: 'SKATTER I MÖRKRET', cancel: 1,
    options: [{ label: 'GÅ NED', text: 'TILL DEN HEMLIGA VÅNINGEN – UTAN VÅNINGSBONUS' }, { label: 'INTE NU', text: '' }] }, i => {
    closeUI(); if (i !== 0) return;
    pr.used = true; play('secret_stairs', 0.9); stat('secretFloors'); logEvent('HEMLIG VÅNING');
    const L = Gen.secret(RNG.hash(run.seed + ':hemlig:' + run.depth), { biome: lvl.biome });
    L.secret = true; L.name = L.name || 'DEN GLÖMDA SKATTKAMMAREN'; L.ambient = Math.max(L.ambient || 0.2, 0.32);
    run.inSecret = true; startLevel(L); say('DU HAR HITTAT EN HEMLIG VÅNING!', 3);
  }));
}
