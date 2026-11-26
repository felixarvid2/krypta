// ---------- Version 17: skeppets och laboratoriets invånare ----------
const AI_V17 = {
  ghostpirate(e, dt) { const imm = (e.immT || 0) > tmr; e.ghost = imm ? 0.72 : Math.max(0, (e.ghost || 0) - dt * 3); return false; },
  gunner(e, dt, dist, los) { // står mest still och lobbar kanonkulor
    e.cd = 99; e.lobT = (e.lobT ?? rnd(1.5, 3)) - dt;
    if (e.state === 'pain') return false;
    if (e.state === 'attack') { if (e.t > 0.7) { e.state = 'idle'; e.t = 0; } return true; }
    if (!los || dist > 11) return false;
    e.state = 'idle'; e.mvx = 0; e.mvy = 0;
    if (e.lobT <= 0) { e.lobT = rnd(2.8, 3.8); e.state = 'attack'; e.t = 0; e.didHit = true; lobShot(e, P.x + P.vx * 0.7, P.y + P.vy * 0.7, { dmg: e.d.dmg * (1 + 0.1 * (run.depth - 1)), r: 1.3, T: 1.3, kind: 'cball' }); play('cannon_fire', 0.9, 1.2, { x: e.x, y: e.y }); firstHint('gunner', 'KANONJÄREN: KANONKULAN LANDAR DÄR RINGEN LYSER – SPRING UR DEN.'); }
    return true;
  },
  drownedsailor(e, dt, dist) { // träffen saktar ned dig
    if (e.state === 'attack' && e.didHit && !e.slowDone && dist < e.d.range + 0.4) { e.slowDone = true; P.slowT = Math.max(P.slowT, 1); }
    if (e.state !== 'attack') e.slowDone = false;
    return false;
  },
  ghostparrot(e, dt, dist, los) { // dyker mot dig och stjäl guld
    e.cd = 99;
    if (e.dive) { e.dive.t -= dt; const sp = 7.5 * dt, ox = e.x, oy = e.y; tryMove(e, Math.cos(e.dive.a) * sp, Math.sin(e.dive.a) * sp, 0.2); e.mvx = e.x - ox; e.mvy = e.y - oy; e.state = 'attack'; e.t = Math.min(e.t, 0.2);
      if (!e.dive.hit && dist < 0.8) { e.dive.hit = true; run.cause = e.d.name; hurtPlayer(e.d.dmg, e.x, e.y, 'melee'); const n = Math.min(3, run.gold); if (n > 0) { run.gold -= n; e.stolen = (e.stolen || 0) + n; spawnText(P.x + Math.cos(P.a) * 0.8, P.y + Math.sin(P.a) * 0.8, `-${n} G`, '#ffd24a'); play('steal', 0.6); } play('ghostparrot', 0.4, 1.2, { x: e.x, y: e.y }); }
      if (e.dive.t <= 0) { e.dive = null; e.state = 'move'; e.t = 0; } return true; }
    e.diveT = (e.diveT ?? rnd(1.5, 3)) - dt;
    if (e.diveT <= 0 && los && dist < 6.5 && dist > 1 && e.state !== 'pain') { e.diveT = rnd(2.5, 3.5); e.dive = { a: Math.atan2(P.y - e.y, P.x - e.x), t: Math.min(0.85, dist / 7.5 + 0.2), hit: false }; play('ghostparrot', 0.4, 1, { x: e.x, y: e.y }); return true; }
    if (e.state === 'move' && los) { const a = Math.atan2(P.y - e.y, P.x - e.x) + Math.PI / 2, w = Math.sin(e.t * 6 + e.x * 5) * dt * 2.4; tryMove(e, Math.cos(a) * w, Math.sin(a) * w, 0.2); }
    return false;
  },
  tentacle(e, dt, dist) { // rotad: slår över ett område och dyker upp på ett nytt ställe var åttonde sekund
    e.cd = 99; e.mvx = 0; e.mvy = 0;
    if (e.sinkT > 0) { e.sinkT -= dt; e.state = 'idle'; if (e.sinkT <= 0) { e.under = true; e.underT = 0.8; e.hidden = true; } return true; }
    if (e.under) { e.hidden = true; e.underT -= dt; if (e.underT <= 0) { const s = tentacleSpot(e); if (s) { e.x = s[0]; e.y = s[1]; } e.under = false; e.hidden = false; e.riseT = 0.5; e.state = 'idle'; e.t = 0; spawnPuff(e.x, e.y, 6); splash(e.x, e.y); play('tentacle', 0.7, 1, { x: e.x, y: e.y }); } return true; }
    if (e.riseT > 0) { e.riseT -= dt; e.state = 'idle'; return true; }
    e.moveT = (e.moveT ?? rnd(5, 8)) - dt;
    if (e.slam) { e.slam.t += dt; e.state = 'attack'; e.t = Math.min(e.slam.t * 0.6, 0.9);
      if (!e.slam.hit && e.slam.t > 0.75) { e.slam.hit = true; play('tentacle', 0.8, 0.8, { x: e.x, y: e.y }); if (dist < 12) P.shake = Math.max(P.shake, 0.8 * (1 - dist / 12)); splash(e.x, e.y);
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; particles.push({ x: e.x + Math.cos(a) * 2.2, y: e.y + Math.sin(a) * 2.2, z: 0.05, vx: 0, vy: 0, vz: 1.2, life: 0.4, maxLife: 0.4, img: fx.parts.drop ? fx.parts.drop[0] : fx.hit[1], size: 0.08, grav: true, tint: [170, 210, 230] }); }
        if (dist < 2.2 && P.jz < 0.3) { run.cause = e.d.name; hurtPlayer(e.d.dmg * (1 + 0.1 * (run.depth - 1)), e.x, e.y, 'melee'); } }
      if (e.slam.t > 1.15) { e.slam = null; e.state = 'idle'; e.t = 0; } return true; }
    if (e.state === 'pain') return false;
    if (e.moveT <= 0) { e.moveT = 8; e.sinkT = 0.5; spawnPuff(e.x, e.y, 6); splash(e.x, e.y); play('tentacle', 0.5, 1.3, { x: e.x, y: e.y }); return true; }
    e.slamCd = (e.slamCd ?? rnd(0.6, 1.4)) - dt;
    if (e.slamCd <= 0 && dist < 2.7 && e.alert) { e.slamCd = rnd(2, 2.6); e.slam = { t: 0, hit: false }; e.t = 0; e.state = 'attack'; firstHint('tentacle', 'TENTAKELN SLÅR ÖVER HELA RINGEN – SPRING UR DEN ELLER HOPPA.'); return true; }
    e.state = 'idle'; return true;
  },
  rat(e, dt, dist, los) { if (e.state === 'move' && los && dist < 7) { const a = Math.atan2(P.y - e.y, P.x - e.x) + Math.PI / 2, w = Math.sin(e.t * 11 + e.x * 7) * dt * 2.4; tryMove(e, Math.cos(a) * w, Math.sin(a) * w, 0.18); } return false; },
  homunculus() { return false; },
  ooze(e, dt) { // lämnar syra efter sig
    e.trailT = (e.trailT ?? 1) - dt; if (e.trailT <= 0 && e.state === 'move' && !e.hidden) { e.trailT = 1.1; if (!puddleAt(e.x, e.y, false)) acidPuddle(e.x, e.y, 7, false); }
    return false;
  },
  apprentice(e, dt, dist, los) { // kastar flaskor med slumpad verkan
    e.cd = 99; e.throwT = (e.throwT ?? rnd(1.5, 3)) - dt;
    if (e.throwT <= 0 && los && dist < 10 && e.state !== 'pain' && e.state !== 'attack') { e.throwT = rnd(2.6, 3.6); e.state = 'attack'; e.t = 0; e.didHit = true; lobShot(e, P.x + P.vx * 0.5, P.y + P.vy * 0.5, { dmg: e.d.dmg, r: 1.2, T: 1, kind: 'flask' }); play('apprentice', 0.6, 1, { x: e.x, y: e.y }); firstHint('apprentice', 'LÄRLINGENS FLASKOR LANDAR DÄR RINGEN LYSER: GIFT, FROST ELLER ELD.'); return true; }
    return false;
  },
  mercurygolem(e, dt) { if (e.reformT > 0) { e.reformT -= dt; e.ghost = 0.5; e.state = 'pain'; e.t = 0; e.mvx = e.mvy = 0; if (e.reformT <= 0) { e.ghost = 0; e.state = 'move'; } return true; } return false; },
  vialwisp(e, dt, dist) { // rusar mot dig och smäller vid kontakt
    if (dist < 0.85 && !e.dead) { e.burst = true; hurtEnemy(e, 99999, e.x, e.y, { noProc: true, quiet: true, self: true }); return true; }
    if (e.state === 'move') { const a = Math.atan2(P.y - e.y, P.x - e.x) + Math.PI / 2, w = Math.sin(e.t * 5 + e.x * 3) * dt * 1.2; tryMove(e, Math.cos(a) * w, Math.sin(a) * w, 0.2); }
    return false;
  },
  chimera(e, dt, dist, los) { // bett, eldandedräkt och giftspott i tur och ordning
    if (e.breath) { const b = e.breath; b.t += dt; b.acc += dt; e.state = 'attack'; e.t = Math.min(e.t, 0.4);
      let d = Math.atan2(P.y - e.y, P.x - e.x) - b.a; d = Math.atan2(Math.sin(d), Math.cos(d)); b.a += clamp(d, -1.2 * dt, 1.2 * dt);
      if (!settings.lowfx) for (let i = 0; i < 2; i++) { const a = b.a + rnd(-0.25, 0.25), sp = rnd(4, 6); particles.push({ x: e.x + Math.cos(a) * 0.6, y: e.y + Math.sin(a) * 0.6, z: 0.6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(-0.1, 0.2), life: 0.6, maxLife: 0.6, frames: fx.parts.flame || fx.fire, img: (fx.parts.flame || fx.fire)[0], size: 0.35, add: true, flame: true }); }
      if (b.acc >= 0.2) { b.acc = 0; let off = Math.atan2(P.y - e.y, P.x - e.x) - b.a; off = Math.atan2(Math.sin(off), Math.cos(off)); if (dist < 4 && Math.abs(off) < 0.45 && hasLOS(e.x, e.y, P.x, P.y)) { run.cause = e.d.name; hurtPlayer(e.d.dmg * 0.22, e.x, e.y, 'proj'); } }
      if (b.t > 1.1) { e.breath = null; e.state = 'move'; e.t = 0; e.mode = 2; e.atkT = rnd(1.2, 2); } return true; }
    e.atkT = (e.atkT ?? rnd(1.5, 2.5)) - dt; const mode = e.mode || 0;
    if (mode === 0) { if (e.state === 'attack' && e.didHit && !e.biteDone) { e.biteDone = true; e.mode = 1; e.atkT = rnd(0.6, 1.2); } if (e.state !== 'attack') e.biteDone = false; if (e.atkT < -4 && dist > 3) { e.mode = 2; e.atkT = 0; } return false; }
    if (mode === 1) { if (e.atkT <= 0 && los && dist < 4 && e.state !== 'pain') { e.breath = { t: 0, a: Math.atan2(P.y - e.y, P.x - e.x), acc: 0 }; play('chimera', 0.8, 1.1, { x: e.x, y: e.y }); play('fireburst', 0.5, 0.7, { x: e.x, y: e.y }); firstHint('chimera', 'KIMÄREN VÄXLAR MELLAN BETT, ELD OCH GIFT – LÄR DIG RYTMEN.'); return true; } if (e.atkT < -3) { e.mode = 2; e.atkT = 0; } return false; }
    if (e.atkT <= 0 && los && dist < 10 && e.state !== 'pain') { e.state = 'attack'; e.t = 0; e.didHit = true; e.mode = 0; e.atkT = rnd(1.5, 2.5); lobShot(e, P.x + P.vx * 0.5, P.y + P.vy * 0.5, { dmg: e.d.dmg * 0.45, r: 1.3, T: 0.9, kind: 'flask', fx: 'poison' }); play('chimera', 0.7, 1.35, { x: e.x, y: e.y }); return true; }
    return false;
  },
};
function tentacleSpot(e) {
  for (let i = 0; i < 30; i++) { const a = i < 15 ? Math.atan2(P.y - e.y, P.x - e.x) + rnd(-1.2, 1.2) : rnd(0, TAU), r = rnd(1.8, 4), x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r;
    const c = cellAt(x, y); if (freeSpot(x, y, 0.4) && Math.hypot(x - P.x, y - P.y) > 1.6 && (c === '.' || c === 'Ǐ' || c === '-' || c === 'Ĕ') && !ents.some(o => o !== e && !o.dead && Math.hypot(o.x - x, o.y - y) < 0.8)) return [x, y]; }
  return null;
}
function v17Defend(e, dmg, opt) { // innan skadan: spöken som är immuna
  if (opt.fall) return dmg;
  if ((e.d.ai === 'ghostpirate' || e.id === 'captain') && (e.immT || 0) > tmr && !opt.exec) { if ((e.immMsg || 0) < tmr) { e.immMsg = tmr + 0.6; spawnText(e.x, e.y, 'IMMUN', '#c0e8ff'); firstHint('ghostpirate', 'SPÖKEN BLIR GENOMSKINLIGA OCH IMMUNA EN STUND NÄR DE TRÄFFAS – VÄNTA UT DIMMAN.'); } return null; }
  if (e.d.ai === 'ghostpirate' && (e.immCd || 0) < tmr && dmg < e.hp) { e.immT = tmr + 1; e.immCd = tmr + 4; play('ghostpirate', 0.5, 1.3, { x: e.x, y: e.y }); }
  return dmg;
}
function v17Dmg(e, dmg, opt) {
  if (e.d.ai === 'ooze') { if (e.burn > 0 || opt.fire) dmg *= 1.4; else if (!opt.melee && !opt.boom && !opt.acid) dmg *= 0.7; }
  if ((e.goldT || 0) > tmr) dmg *= 2;
  if ((e.corrodeT || 0) > tmr) dmg *= up('as_corrode') ? 1.35 : 1.2;
  return dmg;
}
function mercuryReform(e, opt) { // kvicksilvergolemen flyter ihop och reser sig en gång – om den inte dog av eld eller en explosion
  if (e.d.ai !== 'mercurygolem' || e.reformed || opt.boom || opt.fall || opt.fire || e.burn > 0) return false;
  e.reformed = true; e.hp = e.maxHp * 0.5; e.poison = 0; e.bleed = 0; e.reformT = 1.4; e.state = 'pain'; e.t = 0;
  spawnText(e.x, e.y, 'FLYTER IHOP', '#d0d8e0'); spawnPuff(e.x, e.y, 8); play('mercurygolem', 0.8, 0.7, { x: e.x, y: e.y });
  firstHint('mercury', 'KVICKSILVERGOLEMEN RESER SIG IGEN – OM DEN INTE DÖR AV ELD ELLER EN EXPLOSION.');
  return true;
}
function v17Kill(e) {
  if ((e.goldT || 0) > tmr) { const g = 3 + Math.round(3 * mod('transmuteLuck')); run.gold += g; spawnText(e.x, e.y, `+${g} G`, '#ffd24a'); play('coin', 0.7, 1.2); stat('goldKills'); }
  if (e.d.ai === 'homunculus' && !e.small && !e.boss) for (const s of [-1, 1]) {
    const a = Math.atan2(P.y - e.y, P.x - e.x) + s * 1.3, x = e.x + Math.cos(a) * 0.4, y = e.y + Math.sin(a) * 0.4, ok = freeSpot(x, y, 0.2);
    const c = makeEnemy(e.type, ok ? x : e.x, ok ? y : e.y); c.small = true; c.hp = c.maxHp = c.maxHp * 0.45; c.d = { ...c.d, size: c.d.size * 0.7, score: c.d.score * 0.3 }; c.alert = true; c.state = 'move'; c.cd = 0.6; ents.push(c); totalEnemies++;
  }
  if (e.d.ai === 'homunculus' && !e.small) { play('homunculus', 0.4, 1.3, { x: e.x, y: e.y }); spawnPuff(e.x, e.y, 6); }
  if (e.d.ai === 'drownedsailor') { const cx = e.x | 0, cy = e.y | 0; if (map[cy] && map[cy][cx] === '.') { map[cy][cx] = '-'; if (animTex.water !== undefined) cellFloor[cy * mw + cx] = animTex.water; } splash(e.x, e.y); }
  if (e.d.ai === 'vialwisp') { e.gibbed = true; const d = Math.hypot(P.x - e.x, P.y - e.y); if (d < 1.5 && e.burst) { run.cause = e.d.name; hurtPlayer(e.d.dmg, e.x, e.y, 'proj'); } v17Cloud(e.x, e.y, null, 1.8); flashes.push({ x: e.x, y: e.y, t: 0.15, r: 3, col: [150, 255, 120] }); }
  if (e.d.ai === 'ooze') acidPuddle(e.x, e.y, 6, false);
  if (e.d.ai === 'ghostparrot' && fx.parts.feather2 && !settings.lowfx) for (let i = 0; i < 6; i++) particles.push({ x: e.x, y: e.y, z: 0.6, vx: rnd(-0.8, 0.8), vy: rnd(-0.8, 0.8), vz: rnd(-0.1, 0.3), life: 1.6, maxLife: 1.6, frames: fx.parts.feather2, img: fx.parts.feather2[i % 2], size: 0.07, drift: true, sway: rnd(0, 6), fade: true });
}
const v17Slow = () => (P.tarT > 0 ? 0.75 : 1);
const v17Grip = () => clamp(0.12 + 0.88 * mod('deckGrip'), 0.04, 1);
function drawV17Hud(g) {
  if (P.acidT > 0) { const k = Math.min(1, P.acidT / 0.6), gr = g.createRadialGradient(W / 2, HORIZON, VH * 0.3, W / 2, HORIZON, W * 0.6); gr.addColorStop(0, 'rgba(90,200,60,0)'); gr.addColorStop(1, `rgba(90,200,60,${0.35 * k})`); g.fillStyle = gr; g.fillRect(0, 0, W, VH); }
  if (P.cloudFx && P.cloudFx.t > 0) { P.cloudFx.t -= 1 / 60; const [r, gg, b] = LOB_TINT[P.cloudFx.kind] || [150, 255, 120], gr = g.createRadialGradient(W / 2, HORIZON, VH * 0.2, W / 2, HORIZON, W * 0.6); gr.addColorStop(0, `rgba(${r},${gg},${b},0.05)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0.4)`); g.fillStyle = gr; g.fillRect(0, 0, W, VH); }
  if (P.waveFx > 0) { P.waveFx -= 1 / 60; g.fillStyle = `rgba(150,200,230,${0.18 * Math.max(0, P.waveFx) * 2})`; g.fillRect(0, 0, W, VH); }
  if (P.acidT > 0 && hudImg.icon_acid) g.drawImage(hudImg.icon_acid, 74, VH - 22, 8, 8);
  if (hudImg.icon_gold2 && ents.some(e => !e.dead && (e.goldT || 0) > tmr && Math.hypot(e.x - P.x, e.y - P.y) < 10)) g.drawImage(hudImg.icon_gold2, 86, VH - 22, 8, 8);
  if ((P.transT || 0) > tmr && cellUnder() === 'ǜ') { g.fillStyle = 'rgba(255,215,90,0.06)'; g.fillRect(0, 0, W, VH); }
}
function drawV17World(list) {
  for (const h of v17puddles) if (Math.hypot(h.x - P.x, h.y - P.y) < 16) list.push({ x: h.x, y: h.y, k: 'v17', o: h, t: 'pud' });
  for (const l of lobs) { const k = l.t / l.T, x = l.x0 + (l.tx - l.x0) * k, y = l.y0 + (l.ty - l.y0) * k; list.push({ x, y, k: 'v17', o: l, t: 'lob', z: 0.45 + 2.4 * 4 * k * (1 - k) }); list.push({ x: l.tx, y: l.ty, k: 'v17', o: l, t: 'ring' }); }
  for (const e of ents) if (e.slam && !e.dead && e.slam.t < 0.8) list.push({ x: e.x, y: e.y, k: 'v17', o: { tx: e.x, ty: e.y, r: 2.2, kind: 'slam', t: e.slam.t, T: 0.75 }, t: 'ring' });
}
function drawV17Sprite(s) {
  const o = s.o;
  if (s.t === 'pud') { const f = fx.props.inkblot; drawSprite(f ? f[1 % f.length] : fx.hit[1], o.x, o.y, 0.85, -0.41, false, null, 0, 0.35, false, o.friendly ? [150, 255, 90] : [110, 230, 70], Math.max(0.25, 1 - o.t / (o.t0 || 6))); return true; }
  if (s.t === 'lob') { if (o.kind === 'cball') drawSprite(fx.parts.rock ? fx.parts.rock[0] : fx.shards[7], s.x, s.y, 0.24, s.z, false, null, 0, 0.6, false, [80, 80, 90]);
    else drawSprite(spr.potion_unknown || spr.acidflask || fx.hit[1], s.x, s.y, 0.2, s.z, Math.floor(tmr * 10) % 2 === 0, null, 0, 0.6, false, LOB_TINT[o.fx] || null); return true; }
  if (s.t === 'ring') { const n = 14, k = clamp(o.t / o.T, 0, 1), tint = o.kind === 'slam' ? [120, 200, 255] : o.kind === 'cball' ? LOB_TINT.cball : LOB_TINT[o.fx] || [180, 255, 120], rr = o.r * (o.kind === 'slam' ? 1 : 1);
    for (let i = 0; i < n; i++) { const a = i / n * TAU + tmr * 0.8; drawSprite(fx.hit[1], o.tx + Math.cos(a) * rr, o.ty + Math.sin(a) * rr, 0.1 + 0.08 * k, 0.01, false, 1.6 + k, 0, 0, true, tint); }
    if (k > 0.6) drawSprite(fx.hit[1], o.tx, o.ty, 0.25 * k, 0.01, false, 2, 0, 0, true, tint); return true; }
  return false;
}
Object.assign(USES, {
  cannon(pr) { // kanonen: en kanonkula rakt fram dit du tittar
    pr.used = true; const a = P.a; play('cannon_fire', 1); P.shake = Math.max(P.shake, 1.6); flashes.push({ x: pr.x, y: pr.y, t: 0.25, r: 4 }); stat('cannons'); styleAdd(5, '+KANON');
    projectiles.push({ x: pr.x + Math.cos(a) * 0.7, y: pr.y + Math.sin(a) * 0.7, z: 0.4, vx: Math.cos(a) * 14, vy: Math.sin(a) * 14, dmg: 60 * (1 + mod('cannonDmg')), friendly: true, kind: 'cball', life: 2.2, hit: new Set() });
    for (let i = 0; i < 8; i++) particles.push({ x: pr.x + Math.cos(a) * 0.8, y: pr.y + Math.sin(a) * 0.8, z: 0.4, vx: Math.cos(a + rnd(-0.5, 0.5)) * rnd(0.5, 1.5), vy: Math.sin(a + rnd(-0.5, 0.5)) * rnd(0.5, 1.5), vz: rnd(0.1, 0.4), life: 1.2, maxLife: 1.2, frames: fx.parts.smoke || fx.hit, img: (fx.parts.smoke || fx.hit)[0], size: 0.35, drift: true, fade: true, tint: [200, 200, 200] });
    say('KANONEN AVFYRAS!', 1.2); firstHint('cannon', 'KANONEN SKJUTER DIT DU TITTAR – EN GÅNG.');
  },
  alembic(pr) { // alembiken: 20 guld för en slumpad dryck, högst två gånger
    if ((pr.brews || 0) >= 2) { pr.used = true; say('ALEMBIKEN ÄR TOM', 1.2); return; }
    if (run.gold < 20) { say('ALEMBIKEN KOSTAR 20 GULD', 1.5); play('click', 0.5, 0.8); return; }
    run.gold -= 20; pr.brews = (pr.brews || 0) + 1; if (pr.brews >= 2) pr.used = true;
    play('alembic_brew', 0.5, 1, { x: pr.x, y: pr.y }); stat('brews');
    const it = dropItem('potion', (pr.x + P.x) / 2, (pr.y + P.y) / 2); it.hvx *= 0.3; it.hvy *= 0.3; it.strong = Math.random() < mod('brewLuck');
    say(it.strong ? 'ALEMBIKEN BRYGGDE EN STARK DRYCK' : 'ALEMBIKEN BRYGGDE EN DRYCK', 1.8);
    for (let i = 0; i < 8; i++) particles.push({ x: pr.x + rnd(-0.2, 0.2), y: pr.y + rnd(-0.2, 0.2), z: 0.6, vx: rnd(-0.2, 0.2), vy: rnd(-0.2, 0.2), vz: rnd(0.4, 0.9), life: 0.9, maxLife: 0.9, img: (fx.parts.bubble2 || fx.parts.bubble) ? (fx.parts.bubble2 || fx.parts.bubble)[i % 2] : fx.hit[1], size: 0.05, add: !(fx.parts.bubble2 || fx.parts.bubble), tint: [150, 255, 150], fade: true });
  },
});
function updateCball(p, dt) { // kanonkulan: 60 skada i en linje och en smäll i slutet
  for (const e of ents) { if (e.dead || e.dying || e.hidden || e.dormant || p.hit.has(e) || Math.hypot(e.x - p.x, e.y - p.y) > 0.5 * e.d.size * (e.boss ? 1.8 : 1) + 0.15) continue; p.hit.add(e); const k = hurtEnemy(e, p.dmg, p.x, p.y, { boom: true }); hitMark = 0.12; hitKill = hitKill || k; }
  if (solid(p.x, p.y) || p.life <= 0) { p.dead = true; const x = p.x - p.vx * dt * 1.5, y = p.y - p.vy * dt * 1.5; explode(x, y, p.dmg * 0.5, 2.2, false); play('cannonball_land', 0.9, 1, { x, y }); }
}

// ---------- Version 17: Spökkaptenen och Alkemisten ----------
const ALCH_FORM = { normal: { sp: 1, dmg: 1, size: 1 }, giant: { sp: 0.6, dmg: 1.6, size: 1.4 }, fast: { sp: 1.9, dmg: 0.9, size: 0.9 }, invisible: { sp: 1.1, dmg: 1, size: 1 } };
const ALCH_MSG = { giant: 'ALKEMISTEN VÄXER TILL EN JÄTTE!', fast: 'ALKEMISTEN BLIR BLIXTSNABB!', invisible: 'ALKEMISTEN FÖRSVINNER!', normal: 'ALKEMISTEN BLIR SIG SJÄLV IGEN' };
Object.assign(BOSS_AI, {
  captain(b, dt, dist, ang, ph) { // sabel, flintlåspistol och dimma
    const fast = ph === 3 ? 1.3 : 1;
    b.ghostB = (b.immT || 0) > tmr ? 0.7 : 0;
    if (b.state === 'slash') { const sp = 7.5 * fast * dt, moved = bossMove(b, b.lA, sp); if (!b.didHit && dist < (b.d.range || 2.2)) { b.didHit = true; run.cause = b.d.name; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); play('captain_shout', 0.6); }
      if (b.t > 0.75 || moved < sp * 0.3) { b.state = 'idle'; b.t = 0; b.cd = rnd(0.9, 1.3) / fast; } return; }
    if (b.state === 'pistol') { const want = ph >= 2 ? 2 : 1; if (b.shots < want && b.t > 0.35 + b.shots * 0.4) { b.shots++; shootFireball(b, ang + rnd(-0.04, 0.04), 9, b.d.dmg * 0.6, false); play('musket_fire', 0.7, 1.15); flashes.push({ x: b.x, y: b.y, t: 0.1, r: 3 }); }
      if (b.t > 0.6 + want * 0.4) { b.state = 'idle'; b.t = 0; b.cd = 1 / fast; } return; }
    if (b.state === 'fade') { if (b.t < 0.05) { b.immT = tmr + 1.6; play('captain_laugh', 0.8); spawnPuff(b.x, b.y, 10); bossWarn(b, 'KAPTENEN BLIR TILL DIMMA!'); }
      bossMove(b, ang + Math.PI / 2 * (b.side || 1), b.d.speed * 1.6 * dt); if (b.t > 1.6) { b.state = 'idle'; b.t = 0; b.cd = 0.5; } return; }
    b.cd -= dt;
    if (b.cd <= 0) { b.t = 0; b.didHit = false; const r = Math.random(), los = hasLOS(b.x, b.y, P.x, P.y);
      if ((b.fadeCd || 0) < tmr && b.hp < b.maxHp * 0.9 && r < 0.25) { b.state = 'fade'; b.fadeCd = tmr + 8; b.side = Math.random() < 0.5 ? 1 : -1; }
      else if (los && dist < 5.5 && r < 0.65) { b.state = 'slash'; b.lA = ang; bossWarn(b, 'KAPTENEN DRAR SABELN!'); }
      else if (los) { b.state = 'pistol'; b.shots = 0; } else b.cd = 0.4;
      return; }
    if (dist > 4) bossMove(b, ang, b.d.speed * fast * dt); else bossMove(b, ang + Math.PI / 2, b.d.speed * dt * 0.7);
  },
  alchemist(b, dt, dist, ang, ph) { // drycker som byter skepnad: jätte, snabb och osynlig
    if (!b.form) { b.form = 'normal'; b.formT = 5; }
    const F = ALCH_FORM[b.form]; b.formK = F.size; b.formT -= dt;
    b.ghostB = b.form === 'invisible' && !((b.seenT || 0) > tmr) && b.state !== 'drink' ? 0.92 : 0;
    if (b.state === 'drink') { if (b.t < 0.05) { play('alchemist_drink', 0.9); bossWarn(b, 'ALKEMISTEN DRICKER!'); }
      if (b.t > 0.9) { const opts = ['giant', 'fast', 'invisible', 'normal'].filter(f => f !== b.form && (ph >= 2 || f !== 'invisible')); b.form = opts[(Math.random() * opts.length) | 0]; b.formT = rnd(8, 11); say(ALCH_MSG[b.form], 2); play('alchemist_laugh', 0.8); spawnPuff(b.x, b.y, 12); b.state = 'idle'; b.t = 0; b.cd = 0.6; }
      return; }
    if (b.state === 'smash') { if (!b.didHit && b.t > 0.6) { b.didHit = true; waves.push({ x: b.x, y: b.y, r: 0.5, sp: 5, dmg: b.d.dmg * 0.6, hit: false }); if (dist < 3.2) { run.cause = b.d.name; hurtPlayer(b.d.dmg * F.dmg, b.x, b.y, 'melee'); } P.shake = Math.max(P.shake, 2); play('bigboom', 0.6, 0.7, { x: b.x, y: b.y }); }
      if (b.t > 1.1) { b.state = 'idle'; b.t = 0; b.cd = 0.9; } return; }
    if (b.state === 'lunge') { const sp = 9 * dt, moved = bossMove(b, b.lA, sp); if (!b.didHit && dist < 2.2) { b.didHit = true; run.cause = b.d.name; hurtPlayer(b.d.dmg * F.dmg, b.x, b.y, 'melee'); }
      if (b.t > 0.7 || moved < sp * 0.3) { b.state = 'idle'; b.t = 0; b.cd = 0.7; } return; }
    if (b.state === 'throw') { if (!b.didHit && b.t > 0.3) { b.didHit = true; b.seenT = tmr + 1; const n = ph >= 2 ? 3 : 2; for (let i = 0; i < n; i++) lobShot(b, P.x + P.vx * 0.5 + (i ? rnd(-1.8, 1.8) : 0), P.y + P.vy * 0.5 + (i ? rnd(-1.8, 1.8) : 0), { dmg: b.d.dmg * 0.5, r: 1.4, T: 0.9 + i * 0.15, kind: 'flask' }); play('whoosh', 0.7, 0.8); }
      if (b.t > 0.8) { b.state = 'idle'; b.t = 0; b.cd = rnd(0.9, 1.3); } return; }
    b.cd -= dt;
    if (b.cd <= 0) { b.t = 0; b.didHit = false; const los = hasLOS(b.x, b.y, P.x, P.y);
      if (b.formT <= 0) b.state = 'drink';
      else if (b.form === 'giant' && dist < 3.2) b.state = 'smash';
      else if (b.form === 'fast' && los && dist < 6 && Math.random() < 0.6) { b.state = 'lunge'; b.lA = ang; }
      else if (los) b.state = 'throw'; else b.cd = 0.4;
      return; }
    const sp = b.d.speed * F.sp * (ph === 3 ? 1.2 : 1) * dt;
    if (b.form === 'giant' || dist > 5) bossMove(b, ang, sp); else bossMove(b, ang + Math.PI / 2, sp * 0.8);
  },
});
Object.assign(BOSS_SPECIAL, {
  captain(b, dt, dist, ang, ph) {
    if (b.spK) { // kanonsalvan: kulor med varningsringar
      if (b.t < 0.05) { bossWarn(b, 'KANONERNA LADDAS – AKTA RINGARNA!'); play('captain_shout', 1); for (let i = 0; i < 4 + ph * 2; i++) { const a = rnd(0, TAU), r = i ? rnd(0.8, 4) : 0; lobShot(b, P.x + Math.cos(a) * r, P.y + Math.sin(a) * r, { dmg: b.d.dmg * 0.8, r: 1.3, T: 1.1 + i * 0.18, kind: 'cball' }); } setTimeout(() => { if (state === 'play' && !b.dead) play('cannon_fire', 0.9, 0.9); }, 200); }
      if (b.t > 1.4) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return;
    }
    if (b.t < 0.05) { say('ALLA MAN PÅ DÄCK!', 1.5); play('captain_laugh', 0.9); for (let i = 0; i < 1 + ph; i++) { const s = freeSpotFar(3, 6); if (s) { const e = makeEnemy(ENEMY_DEFS['Ǖ'] ? 'Ǖ' : 'S', s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 6); } }
      if (ph >= 2) for (let i = 0; i < 3; i++) { const s = freeSpotFar(2, 5); if (s) { const e = makeEnemy(ENEMY_DEFS['ǚ'] ? 'ǚ' : 'X', s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; } } }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
  alchemist(b, dt, dist, ang, ph) {
    if (b.spK) { // golvet förvandlas till syra
      if (b.t < 0.05) { bossWarn(b, 'GOLVET FÖRVANDLAS!'); play('transmute', 1, 0.8); b.seenT = tmr + 1;
        let n = 0; for (let i = 0; i < 40 && n < 6 + ph * 2; i++) { const x = (P.x + rnd(-3, 3)) | 0, y = (P.y + rnd(-3, 3)) | 0; if (!map[y] || map[y][x] !== '.' || v17tiles.some(t => t.x === x && t.y === y)) continue; v17tiles.push({ x, y, orig: '.', floor: cellFloor[y * mw + x], warn: 1, t: 7 }); n++; } }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return;
    }
    if (b.t < 0.05) { say('ALKEMISTEN VÄCKER SINA SKAPELSER', 1.5); play('alchemist_laugh', 0.9); b.seenT = tmr + 1; for (let i = 0; i < 2 + ph; i++) { const s = freeSpotFar(2.5, 6); if (s) { const t = i % 2 && ENEMY_DEFS['ǧ'] ? 'ǧ' : ENEMY_DEFS['ǣ'] ? 'ǣ' : 'S', e = makeEnemy(t, s[0], s[1]); e.alert = true; e.minion = true; e.small = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 6); } } }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
});
TAUNTS.captain = ['HAVET VÄNTAR PÅ DIG', 'GÅ PÅ PLANKAN!', 'DU BLIR EN AV MIN BESÄTTNING'];
TAUNTS.alchemist = ['DU ÄR BARA EN INGREDIENS', 'BUBBEL, BUBBEL...', 'JAG SKA FÖRVANDLA DIG TILL BLY'];
Object.assign(USE_NAME, { cannon: 'AVFYRA KANONEN', alembic: 'BRYGG EN DRYCK (20 GULD)', bell: 'RING I KLOCKAN', bloodfont: 'SLÅ SÖNDER BLODFUNTEN', larvasac: 'KROSSA LARVSÄCKEN', fountain: 'DRICK UR FONTÄNEN', falsedoor: 'ÖPPNA DÖRREN' });
// ---------- Version 18: käglekastaren och blåsröret ----------
function pinFire(wp, base) { // tre jonglörkäglor som studsar mot väggarna
  const n = up('pt_split') ? 5 : 3, sp = 9.5;
  for (let i = 0; i < n; i++) { const a = P.a + (i - (n - 1) / 2) * 0.11;
    projectiles.push({ x: P.x + Math.cos(a) * 0.5, y: P.y + Math.sin(a) * 0.5, z: 0.45, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: base * (1 + mod('pinDmg')), friendly: true, kind: 'ppin', life: 3, bounces: up('pt_bounce') ? 4 : 2, hit: new Set(), spin: rnd(0, 6), fire: up('pt_fire') }); }
  noise(3 * (1 - mod('noiseReduce')));
}
function updatePpin(p, dt) {
  p.spin += dt * 18;
  for (const e of ents) {
    if (e.dead || e.dying || e.hidden || e.dormant || p.hit.has(e) || Math.hypot(e.x - p.x, e.y - p.y) > 0.42 * e.d.size * (e.boss ? 1.8 : 1) + 0.08) continue;
    p.hit.add(e); const k = hurtEnemy(e, p.dmg, p.x, p.y, {}); hitMark = 0.12; hitKill = hitKill || k; lvlStat.hits++;
    if (p.fire && !e.dead) e.burn = Math.max(e.burn, 3);
    play('pin_bounce', 0.9, rnd(1.1, 1.3), { x: p.x, y: p.y }); sparks(p.x, p.y, 0.45, 2);
    p.dead = true; return;
  }
  if (solid(p.x, p.y)) {
    const ox = p.x - p.vx * dt, oy = p.y - p.vy * dt;
    if (p.bounces > 0) { p.bounces--; if (solid(p.x, oy)) p.vx = -p.vx; if (solid(ox, p.y)) p.vy = -p.vy; p.x = ox; p.y = oy; p.hit.clear(); play('pin_bounce', 0.8, rnd(0.9, 1.1), { x: p.x, y: p.y }); }
    else { p.dead = true; sparks(ox, oy, 0.45, 3); }
  }
  if (p.life <= 0) p.dead = true;
}
function dartFire(wp, base) { // blåsröret: tyst och snabb giftpil
  const a = P.a, sp = 24;
  projectiles.push({ x: P.x + Math.cos(a) * 0.4, y: P.y + Math.sin(a) * 0.4, z: 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: base * (1 + mod('dartDmg')), friendly: true, kind: 'pdart', life: 1.4 });
  noise(up('bg_silent') ? 0 : 1);
}
function updatePdart(p, dt) {
  const ox = p.x - p.vx * dt, oy = p.y - p.vy * dt, sx = p.x - ox, sy = p.y - oy, L = Math.hypot(sx, sy) || 1, ux = sx / L, uy = sy / L;
  let best = null, bt = 9, bperp = 9;
  for (const e of ents) { // längs hela sträckan sedan förra rutan: pilen är snabb
    if (e.dead || e.dying || e.hidden || e.dormant) continue;
    const rx = e.x - ox, ry = e.y - oy, along = rx * ux + ry * uy; if (along < -0.2 || along > L + 0.2) continue;
    const perp = Math.abs(rx * uy - ry * ux), R = 0.36 * e.d.size * (e.boss ? 1.8 : 1);
    if (perp < R && along < bt) { best = e; bt = along; bperp = perp; }
  }
  if (best) {
    const e = best, head = bperp < 0.1 * e.d.size * (e.boss ? 1.8 : 1) && !e.d.stone;
    let dmg = p.dmg * (head ? (up('bg_crit') ? 3 : 2) : 1);
    if (up('bg_silent') && !e.alert) dmg *= 2;
    if (head) { stat('headshots'); if ((P.hsT || 0) < tmr) { P.hsT = tmr + 0.4; spawnText(e.x, e.y, '★ HUVUDTRÄFF', '#ffe070'); play('headshot', 0.5, 1.1); } hitCrit = true; }
    const k = hurtEnemy(e, dmg, e.x, e.y, { quiet: !!up('bg_silent') }); hitMark = 0.1; hitKill = hitKill || k; lvlStat.hits++;
    if (!e.dead) e.poison = Math.max(e.poison || 0, up('bg_poison') ? 6 : 3);
    play('blowgun_hit', 0.6, rnd(0.95, 1.1), { x: e.x, y: e.y }); p.dead = true; return;
  }
  if (solid(p.x, p.y) || p.life <= 0) { p.dead = true; sparks(ox, oy, 0.5, 2); }
}
function weaponV18Tick(wp) { if (wp.blowgun && up('bg_fast')) WS.aim = Math.min(WS.aim, 0.6); }
// fiendernas skott: knivar, käglor, giftpilar och ballonger
function v18EProj(p, dt) {
  const ox = p.x - p.vx * dt, oy = p.y - p.vy * dt;
  if (p.kind === 'eballoon') { const sp = Math.hypot(p.vx, p.vy), cur = Math.atan2(p.vy, p.vx); let d = Math.atan2(P.y - p.y, P.x - p.x) - cur; d = Math.atan2(Math.sin(d), Math.cos(d)); const na = cur + clamp(d, -2 * dt, 2 * dt); p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp; }
  if (p.kind === 'epin' && solid(p.x, p.y) && (p.bounces || 0) > 0) { p.bounces--; if (solid(p.x, oy)) p.vx = -p.vx; if (solid(ox, p.y)) p.vy = -p.vy; p.x = ox; p.y = oy; play('pin_bounce', 0.7, 1, { x: p.x, y: p.y }); return; }
  if (infightHit(p)) return;
  if (Math.hypot(p.x - P.x, p.y - P.y) < 0.36 && !(P.jz > 0.22 && (p.z || 0.5) < 0.32)) {
    p.dead = true; let d = p.dmg;
    if (p.kind === 'eknife') d *= Math.max(0, 1 - mod('knifeResist'));
    run.cause = p.cause || run.cause; hurtPlayer(d, p.src.x, p.src.y, 'proj');
    if (p.kind === 'edart') { const k = Math.max(0, 1 - mod('poisonResist')); if (k > 0) P.poisonT = Math.max(P.poisonT || 0, 3 * k); }
    if (p.kind === 'eballoon') balloonPop(p.x, p.y, false);
    return;
  }
  if (solid(p.x, p.y) || p.life <= 0) { p.dead = true; if (p.kind === 'eballoon') balloonPop(ox, oy, false); else sparks(ox, oy, 0.5, 2); }
}
function balloonPop(x, y, loot) { // konfetti och kanske ett föremål
  play('balloon_pop', 0.8, rnd(0.9, 1.15), { x, y }); play('confetti', 0.4, 1, { x, y });
  if (!settings.lowfx) for (let i = 0; i < 12; i++) { const a = rnd(0, TAU), s = rnd(0.5, 2); particles.push({ x, y, z: 0.7, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rnd(0.2, 1.2), life: 1.4, maxLife: 1.4, img: fx.parts.confetti ? fx.parts.confetti[i % fx.parts.confetti.length] : fx.hit[1], size: 0.04, grav: true, add: !fx.parts.confetti, tint: fx.parts.confetti ? null : [[255, 80, 80], [255, 220, 80], [90, 200, 255], [140, 255, 120]][i % 4] }); }
  if (loot) { const r = Math.random(); if (r < 0.35) for (let i = 0; i < 3; i++) dropItem('gold', x, y); else if (r < 0.6) dropItem('ammo', x, y); else if (r < 0.8) dropItem('health', x, y); else if (r < 0.9) dropItem('potion', x, y); else dropItem(WEAPONS[P.weapon].ammo === 'pins' ? 'pinbox' : 'gold', x, y); }
}
Object.assign(PROJ_UPD_V8, { ppin: updatePpin, pdart: updatePdart, eknife: v18EProj, epin: v18EProj, edart: v18EProj, eballoon: v18EProj });
const PIN_TINT = [255, 240, 220];
Object.assign(PROJ_DRAW_V8, {
  ppin: o => drawSprite(fx.parts.pin ? fx.parts.pin[Math.floor(o.spin) % fx.parts.pin.length] : fx.shards[7], o.x, o.y, 0.14, o.z - 0.07, Math.floor(o.spin / 2) % 2 === 0, null, 0, 0.6, false, fx.parts.pin ? null : PIN_TINT),
  epin: o => drawSprite(fx.parts.pin ? fx.parts.pin[Math.floor(tmr * 16) % fx.parts.pin.length] : fx.shards[7], o.x, o.y, 0.14, o.z - 0.07, Math.floor(tmr * 8) % 2 === 0, null, 0, 0.6, false, fx.parts.pin ? null : [255, 200, 200]),
  pdart: o => drawSprite(fx.parts.dart ? fx.parts.dart[0] : fx.parts.arrow ? fx.parts.arrow[0] : fx.hit[1], o.x, o.y, 0.05, o.z - 0.02, false, null, 0, 0.6, false, fx.parts.dart ? null : [150, 255, 120]),
  edart: o => drawSprite(fx.parts.dart ? fx.parts.dart[0] : fx.parts.arrow ? fx.parts.arrow[0] : fx.hit[1], o.x, o.y, 0.05, o.z - 0.02, false, null, 0, 0.6, false, fx.parts.dart ? [200, 255, 160] : [150, 255, 120]),
  eknife: o => drawSprite(fx.parts.knife ? fx.parts.knife[0] : fx.hit[1], o.x, o.y, 0.05, o.z - 0.03, Math.floor(tmr * 16) % 2 === 0, null, 0, 0.6),
  eballoon: o => drawSprite(fx.props.balloons ? fx.props.balloons[0] : fx.hit[1], o.x, o.y, 0.35, o.z - 0.1 + Math.sin(tmr * 4 + o.x) * 0.04, false, null, 0, 0.5, false, fx.props.balloons ? null : [255, 90, 90]),
});
function v18Shoot(src, a, sp, dmg, kind, extra) { const r = src.boss ? 1.1 : src.r ?? 0.4; if (solid(src.x + Math.cos(a) * r, src.y + Math.sin(a) * r)) return; projectiles.push(Object.assign({ x: src.x + Math.cos(a) * r, y: src.y + Math.sin(a) * r, z: 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg, src, kind, life: 4, cause: src.d ? src.d.name : '' }, extra || {})); }

