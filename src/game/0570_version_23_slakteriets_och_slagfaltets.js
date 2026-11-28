// ---------- Version 23: slakteriets och slagfältets invånare ----------
const AI_V23 = {
  butcher(e, dt, dist, los) {
    // kastar köttyxor i båge när du håller avstånd
    e.throwT = (e.throwT ?? rnd(1.5, 3)) - dt;
    if (e.throwT <= 0 && los && e.alert && dist > 2.2 && dist < 9 && e.state !== 'pain') { e.throwT = rnd(2.8, 4); e.state = 'attack'; e.t = 0; e.didHit = true; const a = Math.atan2(P.y + P.vy * 0.3 - e.y, P.x + P.vx * 0.3 - e.x); v18Shoot(e, a, 6.5, e.d.dmg * 0.8, 'v23cleaver', { life: 1.8, t0: tmr, arcT: dist / 6.5, arcH: 0.4 }); play('cleaver_throw', 0.9, rnd(0.9, 1.1), { x: e.x, y: e.y }); return true; }
    return false;
  },
  pigman(e, dt, dist, los) {
    // rusar med huvudet före och knuffar dig
    if (e.v23rush) { const r = e.v23rush, ox = e.x, oy = e.y, sp = e.d.speed * 3.5 * dt; r.t -= dt; tryMove(e, Math.cos(r.a) * sp, Math.sin(r.a) * sp, 0.35); e.state = 'move';
      if (!r.hit && dist < 1.1 && P.jz < 0.5) { r.hit = true; run.cause = e.d.name; hurtPlayer(e.d.dmg, e.x, e.y, 'melee'); for (let i = 0; i < 6; i++) tryMove(P, Math.cos(r.a) * 0.25, Math.sin(r.a) * 0.25, 0.24); P.shake = Math.max(P.shake, 1); }
      const wall = Math.hypot(e.x - ox, e.y - oy) < sp * 0.3;
      if (r.t <= 0 || r.hit || wall) { e.v23rush = null; if (wall) { e.stun = Math.max(e.stun || 0, 0.8); spawnPuff(e.x, e.y, 4); } }
      return true; }
    e.rushCd = (e.rushCd ?? rnd(1.5, 3)) - dt;
    if (e.alert && los && dist > 2.2 && dist < 7 && e.rushCd <= 0 && e.state !== 'pain') { e.rushCd = rnd(4, 6); e.v23rush = { t: 1.7, a: Math.atan2(P.y - e.y, P.x - e.x) }; play('pig_charge', 1, rnd(0.9, 1.1), { x: e.x, y: e.y }); firstHint('pigman', 'GRISMANNEN RUSAR OCH KNUFFAR – KLIV ÅT SIDAN.'); return true; }
    return false;
  },
  flies(e, dt) {
    // svaga och dras till liken
    if (!e.v23f) { e.v23f = true; e.d = { ...e.d, dmg: e.d.dmg * clamp(1 - mod('fliesResist'), 0, 1) }; }
    if (!e.alert) { let best = null, bd = 7; for (const o of ents) if (o.dead && o !== e) { const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < bd && d > 0.5) { bd = d; best = o; } }
      if (best) { const a = Math.atan2(best.y - e.y, best.x - e.x); tryMove(e, Math.cos(a) * 1.2 * dt, Math.sin(a) * 1.2 * dt, 0.2); e.state = 'move'; return true; } }
    return false;
  },
  crawler() { return false; },
  ghostsoldier(e, dt) {
    // skölden mot dig; hela gruppen vaknar samtidigt
    const want = Math.atan2(P.y - e.y, P.x - e.x); let d = want - (e.faceA ?? want); d = Math.atan2(Math.sin(d), Math.cos(d)); e.faceA = (e.faceA ?? want) + clamp(d, -2.5 * dt, 2.5 * dt);
    if (e.alert && e.v23grp && !e.v23told) { e.v23told = true; for (const o of ents) if (o.v23grp === e.v23grp && !o.dead && !o.alert) { o.alert = true; o.sleep = false; } firstHint('ghostsoldier', 'SPÖKSOLDATERNA SKYDDAR VARANDRA – BRYT FORMATIONEN.'); }
    return false;
  },
  ghostarcher(e, dt, dist, los) {
    // pilskurar om tre i båge
    e.volT = (e.volT ?? rnd(1.5, 3)) - dt;
    if (e.volT <= 0 && los && e.alert && dist > 2 && dist < 11 && e.state !== 'pain') { e.volT = rnd(3, 4.2); e.state = 'attack'; e.t = 0; e.didHit = true; const a = Math.atan2(P.y - e.y, P.x - e.x); for (let i = -1; i <= 1; i++) v18Shoot(e, a + i * 0.13, 7, e.d.dmg, 'v23arrow', { life: 2.2, t0: tmr, arcT: dist / 7, arcH: 0.5 }); play('arrow_volley', 0.9, rnd(0.95, 1.05), { x: e.x, y: e.y }); return true; }
    return false;
  },
  ghostrider(e, dt, dist, los) {
    // rusar i en lång rak linje, vänder och rusar igen
    if (e.v23ride) { const r = e.v23ride; e.state = 'move';
      if (r.wait > 0) { r.wait -= dt; if (r.wait <= 0) { r.a = Math.atan2(P.y - e.y, P.x - e.x); r.t = 0; r.hit = false; play('hoofbeats', 1, rnd(0.95, 1.05), { x: e.x, y: e.y }); } return true; }
      r.t += dt; const ox = e.x, oy = e.y, sp = 6 * clamp(e.d.speed / 1.3, 0, 1.5) * dt; tryMove(e, Math.cos(r.a) * sp, Math.sin(r.a) * sp, 0.35);
      if (!r.hit && dist < 1.0 && P.jz < 0.5) { r.hit = true; run.cause = e.d.name; hurtPlayer(e.d.dmg, e.x, e.y, 'melee'); for (let i = 0; i < 5; i++) tryMove(P, Math.cos(r.a) * 0.2, Math.sin(r.a) * 0.2, 0.24); }
      if (Math.hypot(e.x - ox, e.y - oy) < sp * 0.3 || r.t > 4) { r.n++; r.wait = 0.9; if (r.n >= 3) { e.v23ride = null; e.rideCd = rnd(3, 5); } }
      return true; }
    e.rideCd = (e.rideCd ?? rnd(1, 2.5)) - dt;
    if (e.alert && los && dist > 2.5 && dist < 14 && e.rideCd <= 0 && e.state !== 'pain') { e.v23ride = { t: 0, n: 0, wait: 0.01, a: 0, hit: false }; play('ghostrider', 0.9, 1, { x: e.x, y: e.y }); firstHint('ghostrider', 'SPÖKRYTTAREN RUSAR I RAKA LINJER – KLIV UR VÄGEN.'); return true; }
    return false;
  },
  crows(e, dt, dist, los) {
    // flocken dyker mot dig
    if (e.v23dive) { const v = e.v23dive; v.t -= dt; tryMove(e, Math.cos(v.a) * 5 * dt, Math.sin(v.a) * 5 * dt, 0.2); e.state = 'attack';
      if (!v.hit && dist < 0.8) { v.hit = true; run.cause = e.d.name; hurtPlayer(e.d.dmg, e.x, e.y, 'melee'); }
      if (v.t <= 0 || v.hit) e.v23dive = null; return true; }
    e.diveT = (e.diveT ?? rnd(1, 3)) - dt;
    if (e.alert && los && dist < 6 && dist > 1.5 && e.diveT <= 0) { e.diveT = rnd(2.5, 4); e.v23dive = { t: 0.7, a: Math.atan2(P.y - e.y, P.x - e.x) }; play('crows', 0.8, rnd(0.95, 1.15), { x: e.x, y: e.y }); return true; }
    return false;
  },
};

// ---------- Version 23: Slaktmästaren och Krigsherren ----------
function v23Formation(cx, cy, n, withArcher) {
  const gid = 1000 + Math.floor(Math.random() * 1e6);
  for (let i = 0; i < n; i++) { let s = null; for (let k = 0; k < 12 && !s; k++) { const a = rnd(0, TAU), r = rnd(2.5, 6), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; if (freeSpot(x, y, 0.3) && Math.hypot(x - P.x, y - P.y) > 2.5) s = [x, y]; } if (!s) s = freeSpotFar(3, 6); if (!s) continue;
    const e = makeEnemy(withArcher && i === n - 1 ? V23_ARCHER : V23_SOLDIER, s[0], s[1]); e.alert = true; e.minion = true; e.v23grp = gid; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 8); }
}
Object.assign(BOSS_AI, {
  butcher(b, dt, dist, ang, ph) {
    // köttyxan, kroken som drar dig och köttbitar som blir flugsvärmar
    const fast = ph === 3 ? 1.25 : 1;
    if (b.state === 'idle') b.once23 = false;
    if (b.state === 'cleave') { if (!b.didHit && b.t > 0.55) { b.didHit = true; play('hookchain_hit', 0.8, 0.7); if (dist < (b.d.range || 2.4) + 1.1 && P.jz < 0.4) { run.cause = b.d.name; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); } }
      if (b.t > 1.0) { b.state = 'idle'; b.t = 0; b.cd = rnd(0.8, 1.2) / fast; } return; }
    if (b.state === 'hook') { if (!b.once23 && b.t > 0.4) { b.once23 = true; play('hook_throw', 1, 1); if (hasLOS(b.x, b.y, P.x, P.y) && dist < 12) { b.v23pull = 0.6; play('chain_pull', 1, 0.9); say('KROKEN DRAR DIG!', 1); } }
      if (b.v23pull > 0) { b.v23pull -= dt; const d = Math.hypot(P.x - b.x, P.y - b.y); if (d > 2.6) tryMove(P, (b.x - P.x) / d * 9 * dt, (b.y - P.y) / d * 9 * dt, 0.24); }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = 0.5 / fast; b.v23pull = 0; } return; }
    if (b.state === 'meat') { if (!b.once23 && b.t > 0.4) { b.once23 = true; play('meatmaster_roar', 0.6, 1.2); for (let i = 0; i < (ph >= 2 ? 3 : 2); i++) v23Meat(b, P.x + rnd(-2, 2), P.y + rnd(-2, 2)); }
      if (b.t > 1.1) { b.state = 'idle'; b.t = 0; b.cd = 0.8 / fast; } return; }
    b.cd -= dt;
    if (b.cd <= 0) { b.t = 0; b.didHit = false; b.once23 = false; const los = hasLOS(b.x, b.y, P.x, P.y);
      if (los && dist < 4) { b.state = 'cleave'; bossWarn(b, 'SLAKTMÄSTAREN HÖJER KÖTTYXAN!'); }
      else if (los) { b.state = Math.random() < 0.55 ? 'hook' : 'meat'; bossWarn(b, b.state === 'hook' ? 'SLAKTMÄSTAREN KASTAR KROKEN!' : 'SLAKTMÄSTAREN SLÄNGER KÖTT!'); } else b.cd = 0.4;
      return; }
    if (dist > 3.5) bossMove(b, ang, b.d.speed * fast * dt); else bossMove(b, ang + Math.PI / 2, b.d.speed * dt * 0.5);
  },
  warlord(b, dt, dist, ang, ph) {
    // svärdet, svärdsvirveln och ritten i raka linjer
    const fast = ph === 3 ? 1.25 : 1;
    if (b.state === 'idle') b.once23 = false;
    if (b.state === 'sword') { if (!b.didHit && b.t > 0.55) { b.didHit = true; P.shake = Math.max(P.shake, 1); if (dist < (b.d.range || 2.4) + 1.1 && P.jz < 0.4) { run.cause = b.d.name; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); } }
      if (b.t > 1.0) { b.state = 'idle'; b.t = 0; b.cd = rnd(0.8, 1.2) / fast; } return; }
    if (b.state === 'whirl') { if (!b.once23 && b.t > 0.3) { b.once23 = true; play('sword_whirl', 1, 1); }
      if (b.t > 0.3 && b.t < 1.4) { b.wacc = (b.wacc || 0) + dt; if (b.wacc >= 0.35) { b.wacc = 0; if (dist < 3.4 && P.jz < 0.5) { run.cause = b.d.name; hurtPlayer(b.d.dmg * 0.45, b.x, b.y, 'melee'); } } bossMove(b, ang, b.d.speed * 0.7 * dt); }
      if (b.t > 1.6) { b.state = 'idle'; b.t = 0; b.cd = 0.8 / fast; } return; }
    if (b.state === 'ride') { if (!b.once23) { b.once23 = true; b.rideA = ang; play('hoofbeats', 1.1, 0.9); play('warlord_roar', 0.6, 1.1); }
      if (b.t > 0.35) { const sp = 7.5 * dt, m = bossMove(b, b.rideA, sp);
        if (!b.didHit && Math.hypot(P.x - b.x, P.y - b.y) < 1.9 && P.jz < 0.5) { b.didHit = true; run.cause = b.d.name; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); for (let i = 0; i < 6; i++) tryMove(P, Math.cos(b.rideA) * 0.25, Math.sin(b.rideA) * 0.25, 0.24); }
        if (m < sp * 0.3 || b.t > 2.4) { b.state = 'idle'; b.t = 0; b.cd = 0.7 / fast; P.shake = Math.max(P.shake, 0.6); } }
      return; }
    b.cd -= dt;
    if (b.cd <= 0) { b.t = 0; b.didHit = false; b.once23 = false; b.wacc = 0; const los = hasLOS(b.x, b.y, P.x, P.y);
      if (los && dist < 3.5) { b.state = Math.random() < 0.5 ? 'sword' : 'whirl'; bossWarn(b, b.state === 'sword' ? 'KRIGSHERREN HÖJER SVÄRDET!' : 'SVÄRDSVIRVELN!'); }
      else if (los) { b.state = 'ride'; bossWarn(b, 'KRIGSHERREN RIDER MOT DIG!'); } else b.cd = 0.4;
      return; }
    if (dist > 4) bossMove(b, ang, b.d.speed * fast * dt); else bossMove(b, ang + Math.PI / 2, b.d.speed * dt * 0.5);
  },
});
Object.assign(BOSS_SPECIAL, {
  butcher(b, dt, dist, ang, ph) {
    if (b.spK) {
      // köttkvarnarna i arenan sätts igång i faser
      if (!b.once23) { b.once23 = true; bossWarn(b, 'KÖTTKVARNARNA STARTAR!'); play('grinder_start', 1, 1); play('meatmaster_roar', 0.8);
        const px = P.x | 0, py = P.y | 0;
        for (let k = 0; k < 2 + ph; k++) { let cx = 0, cy = 0, okk = false; for (let i = 0; i < 20 && !okk; i++) { const a = rnd(0, TAU), r = rnd(2, 6); cx = (P.x + Math.cos(a) * r) | 0; cy = (P.y + Math.sin(a) * r) | 0; okk = map[cy] && map[cy][cx] === '.' && Math.hypot(cx - px, cy - py) >= 2; }
          if (okk) for (const [a2, b2] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const x = cx + a2, y = cy + b2; if (!(x === px && y === py)) v23Temp(x, y, 6); } } }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return; }
    if (!b.once23) { b.once23 = true; say('SLAKTMÄSTAREN KALLAR PÅ GRISMÄNNEN', 1.5); play('meatmaster_roar', 0.9, 1.1); for (let i = 0; i < 1 + ph; i++) { const s = freeSpotFar(3, 6); if (!s) continue; const e = makeEnemy(V23_PIG, s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 8); } }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
  warlord(b, dt, dist, ang, ph) {
    if (b.spK) {
      // katapultsalvor över arenan
      if (!b.once23) { b.once23 = true; bossWarn(b, 'KATAPULTERNA SKJUTER!'); play('war_horn', 1, 0.9);
        for (let i = 0; i < 5 + ph * 2; i++) { const a = rnd(0, TAU), r = i ? rnd(1, 5) : 0; v23Rock(P.x + Math.cos(a) * r, P.y + Math.sin(a) * r, { T: 1.1 + i * 0.12, dmg: b.d.dmg * 0.8, r: 1.2, cause: b.d.name, boss: true }); } }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return; }
    if (!b.once23) { b.once23 = true; say('KRIGSHERREN BLÅSER I HORNET', 1.5); play('war_horn', 1, 1); play('warlord_roar', 0.7); if (ents.filter(e => e.minion && !e.dead && e.d.ai === 'ghostsoldier').length < 6) v23Formation(b.x, b.y, 3, ph === 3); }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
});
TAUNTS.butcher = ['FÄRSKT KÖTT', 'IN I KVARNEN MED DIG', 'JAG HAR EN KROK MED DITT NAMN'];
TAUNTS.warlord = ['SLAGET ÄR INTE ÖVER', 'LED IN DEM I LERAN', 'INGEN LÄMNAR FÄLTET'];
const v23api = () => ({ targets: v23targets, rocks: v23rocks, balls: v23balls, lobs: v23lobs, temp: v23temp, grinders: v23grinders, hook: () => v23hook, setup: setupV23, slow: v23Slow, grip: v23Grip, noJump: v23NoJump,
  clock: () => v23clock, setClock: c => { v23clock = c; }, rock: v23Rock, lum: (x, y) => lightAt(x, y) });

