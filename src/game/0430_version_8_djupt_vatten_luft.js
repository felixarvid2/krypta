// ---------- Version 8: djupt vatten, luft och tidvatten ----------
const tideHigh = () => !!(lvl && lvl.tide && ((levelTime % lvl.tide.period) / lvl.tide.period) > 0.62);
const deepAt = (x, y) => { const c = map[y | 0] && map[y | 0][x | 0]; return c === 'Đ' || (c === 'Ĕ' && tideHigh()); };
let tideWas = false;
function updateWater(dt) {
  const deep = deepAt(P.x, P.y) && P.jz < 0.05, airMax = 12 + mod('airMax');
  if (deep && !P.swim) { play('dive', 0.6); splash(P.x, P.y); firstHint('swim', 'DJUPT VATTEN: DU KAN INTE HOPPA OCH LUFTEN TAR SLUT. LETA EFTER BUBBLOR.'); } if (!deep && P.swim) play('surface', 0.5);
  P.swim = deep;
  if (P.swim) {
    P.air = Math.max(0, (P.air ?? airMax) - dt);
    if (map[P.y | 0][P.x | 0] === 'Ĝ' || props.some(o => o.ch === 'Ĝ' && Math.hypot(o.x - P.x, o.y - P.y) < 1.3)) { if (P.air < airMax - 0.5) play('gasp_air', 0.5); P.air = airMax; }
    if ((P.strokeT || 0) < tmr && Math.hypot(P.vx || 0, P.vy || 0) > 0.5) { P.strokeT = tmr + 0.7; play('swim_stroke', 0.35, rnd(0.9, 1.1)); }
    if (P.air <= 0) { P.drownAcc = (P.drownAcc || 0) + dt; if (P.drownAcc > 1) { P.drownAcc = 0; run.cause = 'DRUNKNADE'; hurtPlayer(6); play('drown', 0.6); if ((P.drownMsgT || 0) < tmr) { P.drownMsgT = tmr + 5; say('DU HAR INGEN LUFT – UPP UR VATTNET!', 2); } } }
    if (!settings.lowfx && Math.random() < dt * 3) particles.push({ x: P.x + rnd(-0.3, 0.3), y: P.y + rnd(-0.3, 0.3), z: 0.05, vx: 0, vy: 0, vz: 0.5, life: 0.6, maxLife: 0.6, img: fx.parts.bubble ? fx.parts.bubble[0] : fx.hit[1], size: 0.04, tint: [200, 230, 255] });
  } else P.air = Math.min(airMax, (P.air ?? airMax) + dt * 4);
  P.camSink = Math.max(P.camSink || 0, P.swim ? 0.16 : 0);
  if (lvl.tide) { const hi = tideHigh(); if (hi !== tideWas) { tideWas = hi; if (hi) firstHint('tide', 'TIDVATTNET GÖR GRUNT VATTEN DJUPT EN STUND.'); play(hi ? 'tide_rise' : 'surface', 0.6); if (hi) say('TIDVATTNET STIGER', 1.5); for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (map[y][x] === 'Ĕ') cellFloor[y * mw + x] = hi ? animTex.deep ?? cellFloor[y * mw + x] : animTex.shallow ?? cellFloor[y * mw + x]; } }
}
function splash(x, y) { if (settings.lowfx) return; for (let i = 0; i < 8; i++) { const a = rnd(0, TAU); particles.push({ x, y, z: 0.05, vx: Math.cos(a) * rnd(0.5, 1.5), vy: Math.sin(a) * rnd(0.5, 1.5), vz: rnd(1, 2), life: 0.5, maxLife: 0.5, img: fx.parts.drop ? fx.parts.drop[0] : fx.hit[1], size: 0.04, grav: true, tint: [170, 210, 255] }); } }
function drawAirHud(g) {
  if (!P.swim && (P.air ?? 99) >= 12 + mod('airMax') - 0.05) return;
  const airMax = 12 + mod('airMax'), k = clamp((P.air ?? airMax) / airMax, 0, 1), x = W / 2 - 25, y = HORIZON + 30;
  const im = hudImg.icon_air; if (im) g.drawImage(im, x - 10, y - 3, 8, 8);
  for (let i = 0; i < 10; i++) { g.fillStyle = i / 10 < k ? (k < 0.3 && tmr % 0.4 < 0.2 ? '#ff7050' : '#a0d8ff') : '#0006'; g.beginPath(); g.arc(x + i * 5 + 2, y + 1, 2, 0, TAU); g.fill(); }
  if (P.swim) { g.fillStyle = 'rgba(30,80,140,0.22)'; g.fillRect(0, 0, W, VH); } // under ytan
}
// ---------- Version 8: kristallgolem, skärvirrbloss, sjöman, ål, siren, krabba, skuggjägare och häxa ----------
const AI_V8 = {
  golem(e, dt, dist, los) { // slår sönder marken runt sig
    e.slamT = (e.slamT ?? rnd(3, 5)) - dt;
    if (e.slamAt > 0) { e.slamAt -= dt; e.state = 'attack';
      if (e.slamAt <= 0) { play('crystal_shatter', 0.8, 0.8, { x: e.x, y: e.y }); P.shake = Math.max(P.shake, 1.4 * clamp(1 - dist / 8, 0, 1));
        for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; particles.push({ x: e.x, y: e.y, z: 0.05, vx: Math.cos(a) * 3.5, vy: Math.sin(a) * 3.5, vz: 0.6, life: 0.5, maxLife: 0.5, img: fx.parts.shard ? fx.parts.shard[i % fx.parts.shard.length] : fx.hit[1], size: 0.06, add: true, tint: [180, 150, 255] }); }
        if (dist < 3 && P.jz < 0.12) { run.cause = e.d.name; hurtPlayer(e.d.dmg * 0.8, e.x, e.y, 'melee'); P.slowT = Math.max(P.slowT, 1); } }
      return true; }
    if (e.slamT <= 0 && dist < 3 && los && e.state !== 'pain' && !e.stun) { e.slamT = rnd(4.5, 6.5); e.slamAt = 0.7; e.t = 0; e.didHit = true; bossWarnE(e, 'GOLEMEN HÖJER NÄVARNA – HOPPA!'); return true; }
    if (e.state === 'move' && Math.random() < dt * 0.8) play('golem_step', 0.25, rnd(0.8, 1), { x: e.x, y: e.y });
    return false;
  },
  shardwisp(e, dt, dist, los) { // skjuter kristallskärvor i en solfjäder och hoppar undan
    e.cd = 99; e.shootT = (e.shootT ?? rnd(1, 2.5)) - dt;
    if (e.flash > 0.08 && (e.blinkCd || 0) < tmr) { e.blinkCd = tmr + 2.5; for (let k = 0; k < 8; k++) { const a = rnd(0, TAU), r = rnd(1.5, 3), x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r; if (freeSpot(x, y, 0.3) && hasLOS(e.x, e.y, x, y)) { spawnPuff(e.x, e.y, 4); e.x = x; e.y = y; play('crystal_chime', 0.5, 1.4, { x, y }); break; } } }
    if (e.shootT <= 0 && los && dist < 10 && e.state !== 'pain') { e.shootT = rnd(2, 3); e.state = 'attack'; e.t = 0; e.didHit = true; const a = Math.atan2(P.y - e.y, P.x - e.x);
      for (let i = -1; i <= 1; i++) shootFireball(e, a + i * 0.16, 7, e.d.dmg, false, 'shard'); play('shardwisp', 0.6, rnd(0.9, 1.2), { x: e.x, y: e.y }); return true; }
    return false;
  },
  sailor(e, dt, dist, los) { // båtshaken drar dig närmare
    e.hookT = (e.hookT ?? rnd(2, 4)) - dt;
    if (e.hookT <= 0 && los && dist > 2 && dist < 7) { e.hookT = rnd(5, 7); e.state = 'attack'; e.t = 0; e.didHit = true; const a = Math.atan2(P.y - e.y, P.x - e.x);
      projectiles.push({ x: e.x + Math.cos(a) * 0.4, y: e.y + Math.sin(a) * 0.4, z: 0.45, vx: Math.cos(a) * 8, vy: Math.sin(a) * 8, dmg: 4, src: e, kind: 'bandage', hook: true, life: 1.4 }); play('sailor', 0.6, 1, { x: e.x, y: e.y }); return true; }
    return false;
  },
  eel(e, dt, dist) { // simmar i djupt vatten och hugger när du kommer nära
    e.cd = 99;
    if (e.emerge > 0) { e.emerge -= dt; e.hidden = false; e.state = e.biteAt > 0 || e.t < 0.5 && e.state === 'attack' ? 'attack' : 'idle';
      if (!e.bit && e.emerge < 1.2 && dist < 1.9) { e.bit = true; e.biteAt = 0.3; e.state = 'attack'; e.t = 0; }
      if (e.biteAt > 0) { e.biteAt -= dt; if (e.biteAt <= 0 && dist < 2 && P.jz < 0.3) { run.cause = e.d.name; hurtPlayer(e.d.dmg, e.x, e.y, 'melee'); play('eel', 0.6, 1.2, { x: e.x, y: e.y }); } }
      if (e.emerge <= 0) { e.hidden = true; e.state = 'idle'; splash(e.x, e.y); play('dive', 0.3, 1.3, { x: e.x, y: e.y }); e.subT = rnd(1.2, 2.5); }
      return true; }
    e.hidden = true; e.state = 'idle';
    if (dist < 14) { const a = Math.atan2(P.y - e.y, P.x - e.x), sp = e.d.speed * dt * (e.slow > 0 ? 0.5 : 1), nx = e.x + Math.cos(a) * sp, ny = e.y + Math.sin(a) * sp;
      if (deepAt(nx, ny)) { e.x = nx; e.y = ny; } else if (deepAt(nx, e.y)) e.x = nx; else if (deepAt(e.x, ny)) e.y = ny; }
    if (!settings.lowfx && Math.random() < dt * 2) particles.push({ x: e.x + rnd(-0.2, 0.2), y: e.y + rnd(-0.2, 0.2), z: 0.02, vx: 0, vy: 0, vz: 0.3, life: 0.5, maxLife: 0.5, img: fx.parts.bubble ? fx.parts.bubble[0] : fx.hit[1], size: 0.04, tint: [200, 230, 255] });
    e.subT = (e.subT ?? 1) - dt;
    if (e.subT <= 0 && dist < 2.6) { e.emerge = 1.6; e.bit = false; e.hidden = false; e.state = 'idle'; e.t = 0; splash(e.x, e.y); play('eel', 0.7, 1, { x: e.x, y: e.y }); }
    return true;
  },
  siren(e, dt, dist, los) { // sången drar dig mot henne – skjut henne för att bryta den
    e.cd = 99; e.songT = (e.songT ?? rnd(2, 4)) - dt;
    if (e.singing > 0) { e.singing -= dt; e.state = 'attack'; if (e.t > 0.6) e.t = 0.25;
      if (los && dist < 11 && dist > 1.4) { P.pullFrom = { x: e.x, y: e.y }; P.pullT = Math.max(P.pullT || 0, 0.15); P.slowT = Math.max(P.slowT, 0.15); }
      if (!settings.lowfx && Math.random() < dt * 5) particles.push({ x: e.x + rnd(-0.3, 0.3), y: e.y + rnd(-0.3, 0.3), z: 0.8, vx: (P.x - e.x) * 0.25, vy: (P.y - e.y) * 0.25, vz: 0.2, life: 1.2, maxLife: 1.2, img: fx.parts.note ? fx.parts.note[(Math.random() * 2) | 0] : fx.hit[1], size: 0.06, tint: [160, 230, 255] });
      if (e.flash > 0.06 || !los) { e.singing = 0; e.songT = rnd(3, 4); spawnText(e.x, e.y, 'SÅNGEN BRÖTS', '#a0e0ff'); }
      return true; }
    if (e.songT <= 0 && los && dist < 9 && dist > 2) { firstHint('siren', 'SIRENENS SÅNG DRAR DIG – EN TRÄFF BRYTER DEN.'); e.songT = rnd(6, 8); e.singing = 2.6; e.t = 0; play('siren_song', 0.8, 1, { x: e.x, y: e.y }); if ((P.sirenMsgT || 0) < tmr) { P.sirenMsgT = tmr + 10; say('SIRENEN SJUNGER – SKJUT HENNE!', 1.5); } return true; }
    return false;
  },
  crab(e, dt, dist, los) { // springer i sidled och skyddar sig med skalet
    if (e.state === 'move' && los && dist < 6 && dist > 1.2) { e.side = e.side || (Math.random() < 0.5 ? 1 : -1); if (Math.random() < dt * 0.5) e.side = -e.side;
      const a = Math.atan2(P.y - e.y, P.x - e.x) + e.side * Math.PI / 2, sp = e.d.speed * dt * 0.8, ox = e.x, oy = e.y; tryMove(e, Math.cos(a) * sp, Math.sin(a) * sp, 0.25); if (Math.hypot(e.x - ox, e.y - oy) < sp * 0.3) e.side = -e.side; }
    if (Math.random() < dt * 0.4) play('crab', 0.25, rnd(0.9, 1.2), { x: e.x, y: e.y });
    return false;
  },
  stalker(e, dt, dist) { // osynlig utom i ljus, i lampans sken eller på nära håll
    let rel = Math.atan2(e.y - P.y, e.x - P.x) - P.a; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    const lit = lightAt(e.x, e.y) > 0.65 || (P.lamp && Math.abs(rel) < 0.4 && dist < 9) || dist < 1.8 || e.state === 'attack' || e.state === 'pain';
    const want = lit ? 0 : 0.94; e.ghost = (e.ghost ?? want) + clamp(want - (e.ghost ?? want), -dt * 4, dt * 1.4);
    if (Math.random() < dt * 0.15) play('stalker', 0.3, rnd(0.9, 1.1), { x: e.x, y: e.y });
    return false;
  },
  witch(e, dt, dist, los) { // förhäxar och teleporterar sig när hon skadas
    e.cd = 99; e.hexT = (e.hexT ?? rnd(1.5, 3)) - dt;
    if (e.flash > 0.08 && (e.tpCd || 0) < tmr) { e.tpCd = tmr + 3.5; for (let k = 0; k < 10; k++) { const a = rnd(0, TAU), r = rnd(3, 6), x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r; if (freeSpot(x, y, 0.3) && hasLOS(e.x, e.y, x, y)) { spawnPuff(e.x, e.y, 8); e.x = x; e.y = y; spawnPuff(x, y, 8); play('witch_teleport', 0.7, 1, { x, y }); break; } } }
    if (e.hexT <= 0 && los && dist < 10 && e.state !== 'pain') { e.hexT = rnd(3, 4.5); e.state = 'attack'; e.t = 0; e.didHit = true; const a = Math.atan2(P.y - e.y, P.x - e.x);
      shootFireball(e, a, 6.5, e.d.dmg, false, 'hex'); play('witch', 0.7, rnd(0.95, 1.1), { x: e.x, y: e.y }); return true; }
    return false;
  },
};
function bossWarnE(e, text) { if ((P.golemMsgT || 0) < tmr) { P.golemMsgT = tmr + 8; say(text, 1.2); } }
function witchHex() { // häxans förbannelser
  const k = Math.max(0.2, 1 - mod('witchResist')), r = Math.random();
  if (r < 0.34) { P.slowT = Math.max(P.slowT, 2.5 * k); say('FÖRHÄXAD: DU ÄR LÅNGSAM', 1.5); }
  else if (r < 0.67) { P.reverseT = Math.max(P.reverseT || 0, 1.8 * k); say('FÖRHÄXAD: ALLT ÄR BAKVÄNT', 1.5); }
  else { darkT = Math.max(darkT, 3 * k); say('FÖRHÄXAD: MÖRKRET FALLER', 1.5); }
  play('witch_hex', 0.8);
}
function crabShell(e, dmg, opt) { // krabbans skal tar emot det mesta framifrån
  if (e.d.ai !== 'crab' || opt.boom || opt.melee || e.state === 'attack' || behind(e)) return dmg;
  if (Math.random() < 0.4) { sparks(e.x, e.y, 0.4, 2); play('crab_clack', 0.4, rnd(1, 1.3), { x: e.x, y: e.y }); }
  return dmg * 0.4;
}

// ---------- Version 8: Kristalldrottningen och Leviatan ----------
Object.assign(BOSS_AI, {
  crystalqueen(b, dt, dist, ang, ph) { // skärvsalvor och strålar som studsar mot väggarna
    const fast = ph === 3 ? 1.3 : 1;
    if (b.state === 'volley') { if (b.t < 0.05 || (ph >= 2 && Math.abs(b.t - 0.5) < dt)) { const n = 5 + ph * 2; for (let i = 0; i < n; i++) shootFireball(b, ang + (i - (n - 1) / 2) * 0.13, 8, b.d.dmg * 0.45, false, 'shard'); play('queen_shatter', 0.7, rnd(0.9, 1.1)); }
      if (b.t > 1) { b.state = 'idle'; b.t = 0; b.cd = rnd(1, 1.6) / fast; } return; }
    if (b.state === 'beam') { if (b.t > 0.6 && !b.didHit) { b.didHit = true; play('queen_beam', 0.8); for (let i = 0; i < (ph === 3 ? 3 : ph === 2 ? 2 : 1); i++) prismBeam(b.x, b.y, ang + (i - (ph - 1) / 2) * 0.35, b.d.dmg * 0.6, 2, 0, new Set(), 22, true); }
      if (b.t > 1.1) { b.state = 'idle'; b.t = 0; b.cd = rnd(1.2, 1.8) / fast; } return; }
    b.cd -= dt;
    if (b.cd <= 0 && hasLOS(b.x, b.y, P.x, P.y)) { b.t = 0; b.didHit = false; if (Math.random() < 0.5) { b.state = 'beam'; bossWarn(b, b.d.name + ' SAMLAR LJUSET – AKTA STRÅLEN!'); } else b.state = 'volley'; return; }
    if (dist > 5) bossMove(b, ang, b.d.speed * fast * dt * (b.slow > 0 ? 0.5 : 1)); else if (dist < 3) bossMove(b, ang + Math.PI, b.d.speed * dt * 0.7);
  },
  leviathan(b, dt, dist, ang, ph) { // dyker i bassängen och dyker upp på ett nytt ställe
    const fast = ph === 3 ? 1.3 : 1;
    if (b.state === 'submerge') { b.hidden = true; if (b.t > 1.6) { const spots = []; for (let y = 1; y < mh - 1; y++) for (let x = 1; x < mw - 1; x++) if (map[y][x] === 'Đ' && Math.hypot(x + 0.5 - P.x, y + 0.5 - P.y) > 3.5) spots.push([x + 0.5, y + 0.5]);
        const s = spots.length ? spots[(Math.random() * spots.length) | 0] : [b.x, b.y]; b.x = s[0]; b.y = s[1]; b.hidden = false; b.state = 'emerge'; b.t = 0; splash(b.x, b.y); splash(b.x + 0.5, b.y); play('leviathan_roar', 0.9, rnd(0.9, 1.05)); P.shake = Math.max(P.shake, 1.2); } return; }
    if (b.state === 'emerge') { if (b.t > 0.8) { b.state = 'idle'; b.t = 0; b.cd = 0.5; } return; }
    if (b.state === 'spit') { if (b.t > 0.4 && !b.didHit) { b.didHit = true; for (let i = -ph; i <= ph; i++) shootFireball(b, ang + i * 0.18, 7.5, b.d.dmg * 0.45, true, 'blue'); play('leviathan_wave', 0.6, 1.3); }
      if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = rnd(1, 1.5) / fast; } return; }
    if (b.state === 'wave') { if (b.t < 0.05) { waves.push({ x: b.x, y: b.y, r: 0.5, sp: 3.4, dmg: b.d.dmg * 0.6, hit: false }); play('leviathan_wave', 0.9); bossWarn(b, 'EN VÅG – HOPPA!'); }
      if (b.t > 1) { b.state = 'idle'; b.t = 0; b.cd = 1; } return; }
    b.cd -= dt; b.subT = (b.subT ?? rnd(7, 10)) - dt;
    if (b.subT <= 0) { b.subT = rnd(7, 10) / fast; b.state = 'submerge'; b.t = 0; play('leviathan_submerge', 0.8); splash(b.x, b.y); return; }
    if (b.cd <= 0 && hasLOS(b.x, b.y, P.x, P.y)) { b.t = 0; b.didHit = false; b.state = Math.random() < 0.35 ? 'wave' : 'spit'; return; }
  },
});
Object.assign(BOSS_SPECIAL, {
  crystalqueen(b, dt, dist, ang, ph) {
    if (b.spK) { // spegelskölden: skott studsar tillbaka
      if (b.t < 0.05) { b.reflectT = tmr + 2.6 + ph * 0.4; bossWarn(b, 'SPEGELSKÖLDEN – SLUTA SKJUTA!'); play('crystal_chime', 1, 0.7); }
      if (b.t > 0.8) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return;
    }
    if (b.t < 0.05) { say('SKÄRVORNA VAKNAR', 1.5); play('queen_roar', 0.9); for (let i = 0; i < 1 + ph; i++) { const s = freeSpotFar(3, 6); if (s) { const e = makeEnemy(ENEMY_DEFS['Í'] ? 'Í' : 'Ü', s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 6); } }
      if (ph === 3) for (let i = 0; i < 16; i++) shootFireball(b, i / 16 * TAU, 5.5, b.d.dmg * 0.35, false, 'shard'); }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
  leviathan(b, dt, dist, ang, ph) {
    if (b.spK && ph >= 2) { // tidvågen: flera vågor i rad
      if (b.t < 0.05) { bossWarn(b, 'DJUPET RESER SIG – HOPPA ÖVER VÅGORNA!'); for (let i = 0; i < ph; i++) setTimeout(() => { if (!b.dead) waves.push({ x: b.x, y: b.y, r: 0.5, sp: 3.6, dmg: b.d.dmg * 0.6, hit: false }); }, i * 800); play('tide_rise', 1); }
      if (b.t > 1.4) { b.state = 'idle'; b.t = 0; b.cd = 1; } return;
    }
    if (b.t < 0.05) { say('ÅLARNA SVÄRMAR I BASSÄNGEN', 1.5); play('leviathan_roar', 0.8, 1.2); let n = 0; for (let y = 1; y < mh - 1 && n < 1 + ph; y++) for (let x = 1; x < mw - 1 && n < 1 + ph; x++) if (map[y][x] === 'Đ' && Math.random() < 0.06) { const e = makeEnemy(ENEMY_DEFS['Ó'] ? 'Ó' : 'X', x + 0.5, y + 0.5); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; n++; } }
    if (b.t > 0.8) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
});
TAUNTS.crystalqueen = ['DITT LJUS ÄR MITT', 'SE DIG I SPEGELN', 'SPLITTRAS!'];
TAUNTS.leviathan = ['DJUPET KALLAR', 'ANDAS IN – EN SISTA GÅNG', 'HAVET GLÖMMER ALDRIG'];
function queenReflect(b, dmg, opt = {}) { if (b.id === 'crystalqueen' && (b.reflectT || 0) > tmr) { const r = opt.noProc ? 0 : dmg * 0.35; if (r > 0.3) { hurtPlayer(r, b.x, b.y, 'proj'); if ((b.refMsgT || 0) < tmr) { b.refMsgT = tmr + 1.5; spawnText(b.x, b.y, 'SPEGLAS', '#c0e0ff'); play('crystal_hit', 0.6, 1.4); } } return dmg * 0.15; } return dmg; }

// ---------- Version 8: kristaller, vrak, kartografen, talangaltaret och kunskapsböcker ----------
let spikeCells = new Set();
function setupV8(lrng) { // efter att våningen byggts
  { const si = WEAPONS.findIndex(w => w.spear); if (si >= 0 && P.has[si]) P.mags[si] = 1; } // ett kastat spjut följer med till nästa våning
  { const bi = boomIdx(); if (bi >= 0 && P.has[bi]) P.mags[bi] = 1; WS.boomOut = 0; try { WS.boomSnd && WS.boomSnd.s.stop(); } catch (e) { /* stoppad */ } WS.boomSnd = null; } // en bumerang i luften kommer inte med till nästa våning
  spikeCells = new Set(props.filter(o => o.ch === 'Ē').map(o => o.cy * mw + o.cx)); tideWas = false; ropeTo = null; ropeT = 0; P.grapple = null; P.swim = false; P.air = 12 + mod('airMax');
  for (const e of ents) if (e.d.ai === 'eel') { totalEnemies--; e.hidden = true; if (map[e.y | 0] && map[e.y | 0][e.x | 0] === '.') map[e.y | 0][e.x | 0] = 'Đ'; } // ålar räknas inte för portalen; deras ruta är vatten
  if (lvl.biome === 'crystal') lvl.ambient = Math.max(lvl.ambient || 0, 0.2); // kristallerna glimmar även i mörkret
  if (lvl.biome === 'crystal') for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (map[y][x] === 'Ć' && (x * 7 + y * 13) % 9 === 0 && torches.length < 120) { // kristallådrorna lyser
    const ox = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([a, c]) => map[y + c] && map[y + c][x + a] && !solid(x + a + 0.5, y + c + 0.5)); if (ox) torches.push({ x: x + 0.5 + ox[0] * 0.6, y: y + 0.5 + ox[1] * 0.6, ph: (x + y) % 10, cells: [], hidden: true, str: 0.4, r: 3.5, col: (x + y) % 2 ? [170, 130, 255] : [120, 200, 255] }); }
  prepareTorchLight();
}
function updateCrystal(dt) {
  if (spikeCells.has((P.y | 0) * mw + (P.x | 0)) && P.jz < 0.05 && (P.spikeT || 0) < tmr && mod('hazardImmune') <= 0) { P.spikeT = tmr + 0.8; run.cause = 'KRISTALLSPIKAR'; hurtPlayer(7 * trapMul()); play('spikes_crystal', 0.7); P.slowT = Math.max(P.slowT, 0.4); }
}
function refractShot(pr) { // vanliga skott delas också av brytande kristaller
  if ((pr.refT || 0) > tmr) return; pr.refT = tmr + 0.1; const wp = WEAPONS[P.weapon], dmg = wp.dmg * (1 + mod('dmg')) * 0.6;
  refractFx(pr.x, pr.y); play('prism_bounce', 0.5, 1.1, { x: pr.x, y: pr.y });
  let ex = pr.x, ey = pr.y; for (let k = 0; k < 40 && map[ey | 0] && map[ey | 0][ex | 0] === 'Ė'; k++) { ex += Math.cos(P.a) * 0.06; ey += Math.sin(P.a) * 0.06; } // bortre sidan
  if (!solid(ex, ey)) for (const off of [-0.5, 0, 0.5]) prismBeam(ex, ey, P.a + off, dmg, 1, 1, new Set(), 14);
}
Object.assign(USES, {
  wreck(pr) { // vrakkistan: skatt, eller en mimic
    pr.used = true; pr.img = pr.frames[1] || pr.img; play('wreck_open', 0.8); stat('wrecks');
    if (Math.random() < 0.18) { const e = makeEnemy(ENEMY_DEFS.Q ? 'Q' : 'S', pr.x, pr.y); e.alert = true; ents.push(e); totalEnemies++; props.splice(props.indexOf(pr), 1); map[pr.cy][pr.cx] = '.'; say('VRAKKISTAN BITS!', 1.5); return; }
    const g = Math.round((20 + run.depth * 6) * (1 + mod('goldFind'))); run.gold += g; run.goldEarned = (run.goldEarned || 0) + g; spawnText(pr.x, pr.y, `+${g}`, '#ffd24a'); play('coin', 0.7);
    if (Math.random() < 0.45) dropItem(Math.random() < 0.5 ? 'potion' : 'cardpick', pr.x, pr.y); else dropItem('tome', pr.x, pr.y);
    say(`VRAKKISTAN: ${g} GULD`, 1.5);
  },
  talent(pr) { pr.used = true; pr.img = pr.frames[1] || pr.img; run.talentQ = (run.talentQ || 0) + 1; play('talent_altar', 0.8); say('TALANGALTARET GLÖDER', 1.5); stat('talentAltars'); talentPick(); },
  cartographer(pr) { // kartografen säljer kartor och hemligheter
    openUI(() => CardUI.choice({ title: 'KARTOGRAFEN', subtitle: `"JAG HAR RITAT VARJE GÅNG." · ${run.gold} GULD`, cancel: 3,
      options: [{ label: 'KARTA (35 GULD)', text: 'HELA VÅNINGEN PÅ KARTAN' }, { label: 'HEMLIGHETER (60 GULD)', text: 'VISAR HEMLIGA VÄGGAR OCH SKATTER' }, { label: 'BERÄTTA', text: 'OM DJUPET' }, { label: 'GÅ', text: '' }] }, i => {
      closeUI();
      if (i === 0) { if (run.gold < 35) { say('FÖR LITE GULD', 1.2); return; } run.gold -= 35; run.goldSpent = (run.goldSpent || 0) + 35; seen.fill(1); run.mapRevealed = true; if (!showMap) showMap = 1; play('map_unroll', 0.8); say('KARTOGRAFEN RITAR VÅNINGEN', 2); }
      else if (i === 1) { if (run.gold < 60) { say('FÖR LITE GULD', 1.2); return; } run.gold -= 60; run.goldSpent = (run.goldSpent || 0) + 60; seen.fill(1); run.mapRevealed = true; run.secretsShown = true; if (!showMap) showMap = 1; play('secret', 0.7); say('HEMLIGHETERNA ÄR MARKERADE', 2); }
      else if (i === 2) say(['UNDER STADEN FINNS EN GROTTA AV KRISTALL. DRÖMMAR FASTNAR I DEN.', 'STADEN SJÖNK PÅ EN NATT. DE SOM BODDE HÄR SJUNGER FORTFARANDE.', 'AVGRUNDEN HAR INGEN BOTTEN. JAG HAR LETAT.'][(Math.random() * 3) | 0], 4);
    }));
  },
});
function abyssLevel(depth) { // Avgrunden: oändlig nedstigning
  const n = depth, r = RNG(RNG.hash(run.seed + ':avgrund:' + n)), bossFloor = n % 6 === 0;
  let L;
  if (bossFloor) { const id = r.pick(bossPool()); L = Gen.boss(RNG.hash(run.seed + ':avgrundboss:' + n), { arena: BOSSES[id].arena, boss: id }); L.bossId = id; }
  else L = Gen.floor(RNG.hash(run.seed + ':avgrund:' + n), Math.min(5, 1 + Math.floor(n / 2)), { shop: n % 5 === 2, weapon: n % 3 === 1 ? r.pick(Object.keys(WEAPON_CHAR)).toString() : null, biome: (b => n % 6 === 1 && BIOME_LATE.includes(b) ? BIOME_IDS.filter(x => !BIOME_LATE.includes(x))[BIOME_IDS.indexOf(b) % (BIOME_IDS.length - BIOME_LATE.length)] : b)(r.pick(BIOME_IDS)), guardian: n % 4 === 3 ? r.pick(bossPool()) : undefined });
  return L;
}
function abyssScale() { // fienderna blir starkare för varje våning
  const n = run.depth, k = 1 + 0.1 * (n - 1), kd = 1 + 0.05 * (n - 1);
  for (const e of ents) { e.hp = e.maxHp = e.maxHp * (e.boss ? 1 + 0.07 * (n - 1) : k); e.d = { ...e.d, dmg: e.d.dmg * kd }; }
  if (n > 1 && n % 5 === 0) say(`AVGRUND ${n}: FIENDERNA BLIR STARKARE`, 2.5);
  profile.abyssBest = Math.max(profile.abyssBest || 0, n); play('abyss_descend', 0.7);
}
function beginAbyss(daily) {
  document.getElementById('title').hidden = true; canvas.focus(); ensureAudio(); practice = null;
  newRun(daily ? RNG.hash('krypta-avgrund-' + new Date().toISOString().slice(0, 10)) : RNG.randomSeed(), false); run.abyss = true; run.abyssDaily = !!daily; run.cmode = ''; P.hp = maxHp();
  loadFloor(1); say('AVGRUNDEN – HUR DJUPT KOMMER DU?', 3); lockPointer();
  openUI(() => draftUI(drawCards(3 + meta('choice')), { title: 'AVGRUNDEN', subtitle: 'VÄLJ ETT STARTKORT', skipLabel: 'INGET KORT' }, card => { gainCard(card); closeUI(); }));
}
function abyssNext() { // efter en bossvåning i Avgrunden
  P.hp = Math.min(maxHp(), P.hp + maxHp() * 0.4);
  openUI(() => draftUI(drawCards(3, { luck: 1 }), { title: `AVGRUND ${run.depth} KLARAD`, subtitle: 'VÄLJ ETT KORT OCH FORTSÄTT NEDÅT', skipLabel: 'INGET KORT' }, card => { if (card) gainCard(card); closeUI(); loadFloor(run.depth + 1); lockPointer(); }));
}
// ---------- Version 8: Lägret – ett nav att gå runt i mellan rundorna ----------
const HUB_MODES = [['finale', 'KRÖNIKANS SLUT'], ['campaign', 'KAMPANJEN'], ['new', 'NY RUNDA'], ['daily', 'DAGENS RUNDA'], ['abyss', 'AVGRUNDEN'], ['abyssdaily', 'DAGENS AVGRUND'], ['maze', 'LABYRINTEN'], ['hunt', 'BOSSJAKTEN'], ['continue', 'FORTSÄTT RUNDAN']];
let hubWatch = 0;
function hubLevel() {
  const Wd = 27, Hd = 19, m = [];
  for (let y = 0; y < Hd; y++) { const r = []; for (let x = 0; x < Wd; x++) r.push(x === 0 || y === 0 || x === Wd - 1 || y === Hd - 1 ? '1' : '.'); m.push(r); }
  for (let x = 1; x < Wd - 1; x++) m[1][x] = x % 4 === 1 ? '5' : '1'; // vägg med fanor bakom portalerna
  for (const [x, y] of [[7, 7], [19, 7], [7, 12], [19, 12]]) m[y][x] = '4'; // pelare
  for (const [x, y] of [[2, 3], [24, 3], [2, 16], [24, 16], [10, 15], [16, 15]]) m[y][x] = 'c'; // ljus
  m[10][3] = 'Ĥ'; m[10][8] = 'Ħ'; m[10][13] = 'Ĭ'; m[10][18] = 'Ĩ'; m[10][23] = 'Ī'; m[13][4] = 'Ů'; // figurerna
  for (const [x, y] of [[21, 14], [23, 15], [22, 16]]) m[y][x] = '.'; // skjutbanan
  const won = BOSS_IDS.filter(id => (profile.bossWins || {})[id]); won.forEach((id, i) => { const x = 3 + i * 3; if (x < Wd - 2) m[Hd - 2][x] = 'u'; }); // en staty per besegrad boss
  m[15][13] = 'P';
  return { map: m.map(r => r.join('')), name: 'LÄGRET', biome: 'dungeon', floor: 'floor_stone_pattern', ceil: 'floor_wood_planks', fog: [26, 18, 12], ambient: 0.9, rooms: [], hub: true };
}
function beginHub() {
  document.getElementById('title').hidden = true; canvas.focus(); ensureAudio();
  practice = { hub: true }; newRun(RNG.randomSeed(), false); run.hub = true; run.cmode = ''; practice = null; P.hp = maxHp();
  startLevel(hubLevel()); levelBanner = 2.5; run.depth = 0;
  const modes = HUB_MODES.filter(([id]) => (id !== 'continue' || store.get(runKey(), null)) && (id !== 'finale' || pagesFound().length >= CHRONICLE.length || profile.finaleOpen));
  modes.forEach(([id], i) => { const x = 13.5 + (i - (modes.length - 1) / 2) * 3.6; spawnPortal(x, 3.2, 'mode'); const p = portals[portals.length - 1]; p.mode = id; p.armed = true; });
  for (const [x, y] of [[21.5, 14.5], [23.5, 15.5], [22.5, 16.5]]) { const e = makeEnemy('S', x, y); e.dummy = true; e.hx = x; e.hy = y; e.hp = e.maxHp = 1e9; e.d = { ...e.d, name: 'PROVDOCKA', speed: 0 }; ents.push(e); } // skjutbanan
  dpsLog = []; for (let i = 1; i < WEAPONS.length; i++) if (P.has[i] || (profile.wkills || {})[WEAPONS[i].id]) { P.has[i] = true; P.mags[i] = effMag(i); } for (const k in AMMO) if (k !== 'none' && k !== 'mana') P.ammo[k] = AMMO[k].max; // prova vapnen du har använt
  msgs.length = 0; say('LÄGRET – GÅ IN I EN PORTAL FÖR ATT BÖRJA. SKJUTBANAN FINNS TILL HÖGER.', 3); lockPointer();
  clearInterval(hubWatch); hubWatch = setInterval(() => { if (!run || !run.hub) { clearInterval(hubWatch); return; } if (state === 'ui' && !CardUI.isOpen()) { closeUI('play'); document.getElementById('title').hidden = true; } }, 200);
}
function hubEnter(mode) { // portalerna i lägret
  if (mode === 'campaign') { openUI(() => showCampaign()); return; } // kapitelvalet öppnas i lägret
  clearInterval(hubWatch); run.hub = false;
  const go = () => { if (mode === 'finale') beginFinale(); else if (mode === 'abyssdaily') beginAbyss(true); else if (mode === 'abyss') beginAbyss(); else if (mode === 'maze') beginMaze(); else if (mode === 'hunt') beginBossHunt(); else begin(mode); };
  if (mode !== 'continue' && store.get(runKey(), null)) { openUI(() => CardUI.choice({ title: 'NY RUNDA?', subtitle: 'DU HAR EN PÅGÅENDE RUNDA. EN NY RUNDA SKRIVER ÖVER DEN.', cancel: 1, options: [{ label: 'STARTA NY', text: 'DEN GAMLA FÖRSVINNER' }, { label: 'AVBRYT', text: '' }] }, i => { closeUI(); if (i === 0) go(); else { run.hub = true; beginHub(); } })); return; }
  go();
}
Object.assign(USES, {
  hubAltar() { ensureAudio(); openUI(() => openAltar()); },
  hubArchive() { openUI(() => CardUI.choice({ title: 'ARKIVARIEN', subtitle: '"ALLT SOM HAR HÄNT HÄR NERE STÅR I MINA BÖCKER."', cancel: 5, options: [{ label: 'KORTARKIVET', text: '' }, { label: 'BESTIARIET', text: '' }, { label: 'PRESTATIONER', text: '' }, { label: 'STATISTIK', text: '' }, { label: 'TITLAR', text: '' }, { label: 'GÅ', text: '' }] }, i => {
    if (i === 0) showCodex(); else if (i === 1) showBestiary(); else if (i === 2) showAchievements(); else if (i === 3) showStats(); else if (i === 4) showTitles(); })); },
  hubUnlocks() { ensureAudio(); openUI(() => openUnlocks()); },
  hubTrainer() { openUI(() => openPractice()); },
  hubWeapons() { openUI(() => showWeaponMaster()); },
  hubChronicle() { openUI(() => showChronicle()); },
});
const START_WEAPON_KILLS = 100;
function showWeaponMaster() { // vapenmästaren: dödanden per vapen och val av startvapen
  const wk = profile.wkills || {}, cur = settings.startWeapon || '';
  CardUI.list('VAPENMÄSTAREN', `VAPEN DU DÖDAT ${START_WEAPON_KILLS} FIENDER MED KAN BLI DITT STARTVAPEN`, [
    { label: (cur ? '' : '★ ') + 'INGET STARTVAPEN', text: 'KLASSENS VAPEN', color: cur ? '' : '#ffd24a', onClick: () => { settings.startWeapon = ''; saveSettings(); CardUI.close(); showWeaponMaster(); } },
    ...WEAPONS.filter(w => w.id !== 'pistol').map(w => { const n = wk[w.id] || 0, open = n >= START_WEAPON_KILLS;
      return { label: (cur === w.id ? '★ ' : '') + w.name, text: `${n} DÖDADE` + (open ? (cur === w.id ? ' · VALT' : ' · VÄLJ SOM STARTVAPEN') : ` · ${START_WEAPON_KILLS - n} KVAR`), dim: !open, color: cur === w.id ? '#ffd24a' : '',
        onClick: open ? () => { settings.startWeapon = w.id; saveSettings(); CardUI.close(); play('weapon', 0.7); showWeaponMaster(); } : undefined }; })], () => refreshTitle());
}
function giveStartWeapon() { // valt startvapen från vapenmästaren
  const id = settings.startWeapon; if (!id || cmode('pistol') || run.practice || ((profile.wkills || {})[id] || 0) < START_WEAPON_KILLS) return;
  const i = weaponIndex(id); if (i < 0) return; P.has[i] = true; P.mags[i] = effMag(i); const w = WEAPONS[i]; if (AMMO[w.ammo] && w.ammo !== 'none') P.ammo[w.ammo] = Math.min(AMMO[w.ammo].max, (P.ammo[w.ammo] || 0) + Math.round(AMMO[w.ammo].max * 0.3));
}
// ---------- Version 9: krönikans slut – den hemliga slutbossen ----------
Object.assign(BOSS_AI, {
  monk(b, dt, dist, ang, ph) { // den förste munken bär de andra bossarnas krafter: faraonen, kristalldrottningen och stormfågeln
    if (b.monkPh !== ph) { b.monkPh = ph; b.state = 'idle'; b.t = 0; b.cd = 1.2; }
    (ph === 1 ? BOSS_AI.pharaoh : ph === 2 ? BOSS_AI.crystalqueen : BOSS_AI.thunderbird)(b, dt, dist, ang, ph);
  },
});
Object.assign(BOSS_SPECIAL, { monk(b, dt, dist, ang, ph) { (ph === 1 ? BOSS_SPECIAL.pharaoh : ph === 2 ? BOSS_SPECIAL.crystalqueen : BOSS_SPECIAL.clockmaker)(b, dt, dist, ang, ph); } });
TAUNTS.monk = ['VI GRÄVDE FÖR DJUPT', 'JAG BAD OM EVIGHETEN', 'KRÖNIKAN SLUTAR MED MIG'];
function beginFinale() {
  document.getElementById('title').hidden = true; canvas.focus(); ensureAudio(); practice = null;
  newRun(RNG.randomSeed(), false); run.finale = true; run.cmode = ''; P.hp = maxHp();
  for (let i = 1; i < WEAPONS.length; i++) { P.has[i] = true; P.mags[i] = effMag(i); } for (const k in AMMO) if (k !== 'none' && k !== 'mana') P.ammo[k] = Math.round(AMMO[k].max * 0.6); P.grenades = 4;
  const L = Gen.boss(RNG.hash(run.seed + ':munken'), { arena: 'hall', boss: 'monk' }); L.bossId = 'monk'; L.name = 'KRÖNIKANS SLUT'; run.depth = FLOORS + 1; startLevel(L); lockPointer();
  say('DEN SISTA SIDAN. DEN FÖRSTA MUNKEN VÄNTAR.', 4);
}
function finaleWon() { profile.finaleWon = (profile.finaleWon || 0) + 1; profile.souls += 150; saveProfile(); say('KRÖNIKAN ÄR SLUT. +150 SJÄLAR', 4); setTimeout(() => endRun(true), 1500); }
let dpsLog = [];
function drawDpsHud(g) { // skjutbanans mätare
  if (!run || !run.hub || !dpsLog.length) return; dpsLog = dpsLog.filter(x => tmr - x.t < 5); if (!dpsLog.length) return;
  const sum = dpsLog.reduce((a, x) => a + x.d, 0), span = Math.max(1, Math.min(5, tmr - dpsLog[0].t)), t = `SKADA PER SEKUND: ${Math.round(sum / span)} · ${WEAPONS[P.weapon].name}`;
  txt(t, (W - textW(t)) / 2, HL ? HL.row2 : 30, '#ffd24a', 1, true);
}
function hubHint(p, d) { if (d < 2.5 && p.kind === 'mode') { const m = HUB_MODES.find(x => x[0] === p.mode); hint = 'PORTAL → ' + (m ? m[1] : p.mode); return true; } return false; }
