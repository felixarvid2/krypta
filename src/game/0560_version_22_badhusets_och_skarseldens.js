// ---------- Version 22: badhusets och skärseldens invånare ----------
const AI_V22 = {
  attendant(e, dt, dist) { // blöt handduk: snärten saktar dig en sekund
    if (e.state === 'attack' && !e.v22sn && e.t > 0.3 && dist < (e.d.range || 1.3) + 0.4) { e.v22sn = true; play('towel_snap', 0.9, rnd(0.9, 1.1), { x: e.x, y: e.y }); P.slowT = Math.max(P.slowT || 0, 1); }
    if (e.state !== 'attack') e.v22sn = false; return false;
  },
  steamghost(e, dt, dist) { // syns bara i ångan och nära
    e.ghost = v22steamK > 0.3 || dist < 2.2 ? 0.3 : 0.93;
    if (dist < 1.6) { e.wear = (e.wear || 0) + dt; if (e.wear >= 0.5) { e.wear = 0; run.cause = e.d.name; hurtPlayer(e.d.dmg * 0.5, e.x, e.y, 'gas'); } }
    return false;
  },
  gladiator(e, dt, dist, los) { // skölden mot dig, nätet snärjer
    const want = Math.atan2(P.y - e.y, P.x - e.x); let d = want - (e.faceA ?? want); d = Math.atan2(Math.sin(d), Math.cos(d)); e.faceA = (e.faceA ?? want) + clamp(d, -2.2 * dt, 2.2 * dt);
    e.netT = (e.netT ?? rnd(3, 5)) - dt;
    if (e.netT <= 0 && los && dist > 1.5 && dist < 6 && e.alert && e.state !== 'pain') { e.netT = rnd(5, 7); e.state = 'attack'; e.t = 0; e.didHit = true; play('net_throw', 0.9, 1, { x: e.x, y: e.y }); P.rootT = Math.max(P.rootT || 0, 0.5); say('NÄTET SNÄRJER DIG!', 1); return true; }
    return false;
  },
  moldcrawler() { return false; },
  fireimp(e, dt, dist, los) { // snabba eldklot
    e.throwT = (e.throwT ?? rnd(0.8, 2)) - dt;
    if (e.throwT <= 0 && los && dist > 1.2 && dist < 9 && e.state !== 'pain') { e.throwT = rnd(1.8, 2.6); e.state = 'attack'; e.t = 0; e.didHit = true; const a = Math.atan2(P.y + P.vy * 0.25 - e.y, P.x + P.vx * 0.25 - e.x); v18Shoot(e, a, 7.5, e.d.dmg, 'eimpball', { life: 2.5 }); play('fireimp_ball', 0.8, rnd(0.95, 1.1), { x: e.x, y: e.y }); return true; }
    return false;
  },
  lostsoul(e, dt, dist, los) { // störtar mot dig och exploderar
    if (e.v22ch) { const c = e.v22ch, ox = e.x, oy = e.y; c.t -= dt; tryMove(e, Math.cos(c.a) * 6.5 * dt, Math.sin(c.a) * 6.5 * dt, 0.25); e.state = 'move';
      if (dist < 0.9) { v22LostsoulBoom(e); return true; }
      if (c.t <= 0 || Math.hypot(e.x - ox, e.y - oy) < 6.5 * dt * 0.3) { e.v22ch = null; if (c.t > 0) v22LostsoulBoom(e); } return true; }
    e.chT = (e.chT ?? rnd(1.2, 2.5)) - dt;
    if (e.chT <= 0 && e.alert && los && dist < 8) { e.chT = rnd(2.5, 3.5); e.v22ch = { t: 1.4, a: Math.atan2(P.y - e.y, P.x - e.x) }; play('lostsoul', 1, rnd(0.9, 1.1), { x: e.x, y: e.y }); firstHint('lostsoul', 'DE PLÅGADE SJÄLARNA STÖRTAR OCH EXPLODERAR – SKJUT DEM I LUFTEN.'); return true; }
    return false;
  },
  fleshbrute(e, dt, dist, los) { // rusar och slår i marken
    if (e.v22slam) { const s = e.v22slam; s.t += dt; e.state = 'attack';
      if (!s.hit && s.t > 0.6) { s.hit = true; play('ground_slam', 1.2, 0.9, { x: e.x, y: e.y }); P.shake = Math.max(P.shake, 1.4); spawnPuff(e.x, e.y, 10); if (dist < 3.5 && P.jz < 0.3) { run.cause = e.d.name; hurtPlayer(e.d.dmg * 0.8, e.x, e.y, 'melee'); } }
      if (s.t > 1.1) { e.v22slam = null; e.state = 'move'; e.t = 0; } return true; }
    if (e.v22rush) { e.v22rush.t -= dt; tryMove(e, Math.cos(e.v22rush.a) * e.d.speed * 3 * dt, Math.sin(e.v22rush.a) * e.d.speed * 3 * dt, 0.4); e.state = 'move'; if (e.v22rush.t <= 0 || dist < 1.4) e.v22rush = null; return true; }
    e.slamCd = (e.slamCd ?? 2) - dt; e.rushCd = (e.rushCd ?? 3) - dt;
    if (e.alert && dist < 3 && e.slamCd <= 0 && e.state !== 'pain') { e.slamCd = rnd(4, 6); e.v22slam = { t: 0 }; firstHint('fleshbrute', 'KÖTTBJÄSSEN SLÅR I MARKEN – HOPPA ÖVER CHOCKVÅGEN.'); return true; }
    if (e.alert && los && dist > 3.5 && dist < 8 && e.rushCd <= 0) { e.rushCd = rnd(5, 7); e.v22rush = { t: 1, a: Math.atan2(P.y - e.y, P.x - e.x) }; play('fleshbrute', 1, 0.9, { x: e.x, y: e.y }); return true; }
    return false;
  },
  ashwalker(e) { if (e.v22ash) { e.state = 'pain'; return true; } return false; }, // askhögen (tiden räknas i updateV22)
};

// ---------- Version 22: Badmästaren och Eldfursten ----------
Object.assign(BOSS_AI, {
  bathmaster(b, dt, dist, ang, ph) { // skopan, skållhett vatten och dyket
    const fast = ph === 3 ? 1.25 : 1;
    if (b.state === 'idle') { b.once22 = false; b.hidden = false; }
    if (b.state === 'ladle') { if (!b.didHit && b.t > 0.55) { b.didHit = true; play('scald_splash', 0.6, 1.3); if (dist < (b.d.range || 2.4) + 1.1 && P.jz < 0.4) { run.cause = b.d.name; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); } }
      if (b.t > 1.0) { b.state = 'idle'; b.t = 0; b.cd = rnd(0.8, 1.2) / fast; } return; }
    if (b.state === 'scald') { if (!b.once22 && b.t > 0.4) { b.once22 = true; play('bathmaster_roar', 0.5, 1.2); for (let i = 0; i < (ph >= 2 ? 2 : 1); i++) v22Lob(b, P.x + P.vx * 0.5 + (i ? rnd(-1.5, 1.5) : 0), P.y + P.vy * 0.5 + (i ? rnd(-1.5, 1.5) : 0), { friendly: false, dmg: b.d.dmg * 0.6, cause: b.d.name }); }
      if (b.t > 1.1) { b.state = 'idle'; b.t = 0; b.cd = 0.8 / fast; } return; }
    if (b.state === 'dive') { if (!b.once22) { b.once22 = true; b.hidden = true; splash(b.x, b.y); play('bath_dive', 1, 1); bossWarn(b, 'BADMÄSTAREN DYKER NER!'); }
      if (b.t > 1.2) { let to = null; for (let y = 0; y < mh && !to; y++) for (let x = 0; x < mw && !to; x++) if ((map[y][x] === 'ɣ' || map[y][x] === 'ɥ' || map[y][x] === 'Đ') && Math.hypot(x + 0.5 - b.x, y + 0.5 - b.y) > 4 && Math.hypot(x + 0.5 - P.x, y + 0.5 - P.y) > 3 && freeSpot(x + 0.5, y + 0.5, 0.9) && Math.random() < 0.15) to = [x + 0.5, y + 0.5];
        if (!to) { const s = freeSpotFar(3, 7); if (s) to = s; } for (let i = 0; i < 80 && !to; i++) { const a = rnd(0, TAU), r = rnd(2.5, 7), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r; if (freeSpot(x, y, 0.9) && Math.hypot(x - b.x, y - b.y) > 1.5) to = [x, y]; } if (to) { b.x = to[0]; b.y = to[1]; } b.hidden = false; splash(b.x, b.y); play('bath_dive', 1, 0.8); b.state = 'idle'; b.t = 0; b.cd = 0.5; } return; }
    b.cd -= dt;
    if (b.cd <= 0) { b.t = 0; b.didHit = false; b.once22 = false; const los = hasLOS(b.x, b.y, P.x, P.y);
      if (los && dist < 4) { b.state = 'ladle'; bossWarn(b, 'BADMÄSTAREN SVINGAR SKOPAN!'); }
      else if (los) { b.state = Math.random() < 0.7 ? 'scald' : 'dive'; if (b.state === 'scald') bossWarn(b, 'SKÅLLHETT VATTEN!'); } else { b.state = Math.random() < 0.3 ? 'dive' : 'idle'; b.cd = 0.4; }
      return; }
    if (dist > 3.5) bossMove(b, ang, b.d.speed * fast * dt); else bossMove(b, ang + Math.PI / 2, b.d.speed * dt * 0.5);
  },
  pyrelord(b, dt, dist, ang, ph) { // klon, eldregn och eldpelare
    const fast = ph === 3 ? 1.25 : 1;
    if (b.state === 'idle') b.once22 = false;
    if (b.state === 'claw') { if (!b.didHit && b.t > 0.55) { b.didHit = true; P.shake = Math.max(P.shake, 1.2); if (dist < (b.d.range || 2.4) + 1.2 && P.jz < 0.4) { run.cause = b.d.name; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); P.burnFx = Math.max(P.burnFx || 0, 0.6); } }
      if (b.t > 1.0) { b.state = 'idle'; b.t = 0; b.cd = rnd(0.8, 1.2) / fast; } return; }
    if (b.state === 'rain') { if (!b.once22 && b.t > 0.3) { b.once22 = true; play('fire_rain', 1, 1); for (let i = 0; i < 4 + ph * 2; i++) { const a = rnd(0, TAU), r = i ? rnd(0.8, 4.5) : 0; v19Meteor(P.x + Math.cos(a) * r, P.y + Math.sin(a) * r, { dmg: b.d.dmg * 0.7, r: 1.1, warn: 1 + i * 0.1, cause: b.d.name, small: i > 3 }); } }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = 0.8 / fast; } return; }
    if (b.state === 'pillar') { if (!b.once22 && b.t > 0.4) { b.once22 = true; play('flame_pillar', 1, 1); for (let i = 0; i < (ph >= 2 ? 2 : 1); i++) v22pillars.push({ x: b.x + Math.cos(ang + i * 0.6) * 1.5, y: b.y + Math.sin(ang + i * 0.6) * 1.5, t: 3.5, dmg: b.d.dmg * 0.4, cause: b.d.name }); }
      if (b.t > 1.0) { b.state = 'idle'; b.t = 0; b.cd = 0.9 / fast; } return; }
    b.cd -= dt;
    if (b.cd <= 0) { b.t = 0; b.didHit = false; b.once22 = false; const los = hasLOS(b.x, b.y, P.x, P.y);
      if (los && dist < 4) { b.state = 'claw'; bossWarn(b, 'ELDFURSTEN HÖJER KLON!'); }
      else if (los) { b.state = Math.random() < 0.55 ? 'rain' : 'pillar'; bossWarn(b, b.state === 'rain' ? 'ELD REGNAR FRÅN HIMLEN!' : 'EN ELDPELARE JAGAR DIG!'); } else b.cd = 0.4;
      return; }
    if (dist > 4) bossMove(b, ang, b.d.speed * fast * dt); else bossMove(b, ang + Math.PI / 2, b.d.speed * dt * 0.5);
  },
});
Object.assign(BOSS_SPECIAL, {
  bathmaster(b, dt, dist, ang, ph) {
    b.hidden = false;
    if (b.spK) { if (!b.once22) { b.once22 = true; v22steamForce = 6; bossWarn(b, 'BADMÄSTAREN FYLLER SALEN MED ÅNGA!'); play('steam_vent', 1, 0.8); play('bathmaster_roar', 0.8); }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return; }
    if (!b.once22) { b.once22 = true; say('BADMÄSTAREN KALLAR PÅ BADVAKTERNA', 1.5); play('bathmaster_roar', 0.8, 1.1); for (let i = 0; i < 1 + ph; i++) { const s = freeSpotFar(3, 6); if (!s) continue; const e = makeEnemy('ɩ', s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 8); } }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
  pyrelord(b, dt, dist, ang, ph) {
    if (b.spK) { // sprickor i marken: eldflodsrutor i fem sekunder
      if (!b.once22) { b.once22 = true; bossWarn(b, 'MARKEN SPRICKER!'); play('fissure', 1, 1); P.shake = Math.max(P.shake, 1.5); const a = Math.atan2(P.y - b.y, P.x - b.x), dx = Math.cos(a), dy = Math.sin(a), dir = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
        for (let k = 0; k < 3; k++) { const ox = -dy * (k - 1) * 2, oy = dx * (k - 1) * 2; for (let d = 2; d < 12; d += 0.7) { const x = (b.x + dx * d + ox) | 0, y = (b.y + dy * d + oy) | 0; if (x === (P.x | 0) && y === (P.y | 0)) continue; v22Temp(x, y, 'ɰ', 5, 'floor_firestream', dir); } } }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return; }
    if (!b.once22) { b.once22 = true; say('ELDFURSTEN KALLAR PÅ SKÄRSELDENS BARN', 1.5); play('pyrelord_roar', 0.9); for (let i = 0; i < 2 + ph; i++) { const s = freeSpotFar(3, 6); if (!s) continue; const t = i % 2 ? V22_SOUL : V22_IMP, e = makeEnemy(t, s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 8); } }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
});
TAUNTS.bathmaster = ['VATTNET ÄR LAGOM VARMT', 'ETT DOPP TILL', 'BADHUSET STÄNGER ALDRIG'];
TAUNTS.pyrelord = ['BRINN', 'HÄR RENAS ALLA I ELD', 'DIN SJÄL ÄR MIN'];
const v22api = () => ({ vents: v22vents, pools: v22pools, runes: v22runes, lobs: v22lobs, shots: v22shots, spear: () => v22spear, spores: v22spores, pillars: v22pillars, temp: v22temp, steamK: () => v22steamK, setup: setupV22, slow: v22Slow, dir: (x, y) => v22dir.get(y * mw + x) || null,
  setClock: c => { v22clock = c; }, steam: t => { v22steamForce = t; }, fogBase: () => v22fogBase, lum: (x, y) => lightAt(x, y) });

// ---------- Version 23: Slakteriet och Slagfältet ----------
// Blodhalt golv, köttkvarnar, djup lera, katapultmål, köttkrokar, spjutpålar, krigsfanor, slaktarkroken och bombarden
let v23targets = [], v23rocks = [], v23balls = [], v23lobs = [], v23grinders = [], v23temp = [], v23hook = null, v23clock = 0, v23ti = {};
const V23_FLY = 'ʆ', V23_PIG = 'ʅ', V23_SOLDIER = 'ʐ', V23_ARCHER = 'ʑ', V23_RIDER = 'ʒ';
function v23Back(x, y) { if (cellFloor) cellFloor[y * mw + x] = lvl.floorMask ? (+lvl.floorMask[y][x] || 0) : 0; }
function setupV23() {
  v23targets = []; v23rocks = []; v23balls = []; v23lobs = []; v23grinders = []; v23temp = []; v23hook = null; v23clock = 0;
  P.v23grindT = 0; P.v23grindAcc = 0.25; P.v23mud = false; P.v23stakeT = 0; P.v23slick = false; WS.hkAim = false; WS.bdAim = false;
  v23ti = {}; for (const n of ['floor_grinder']) { v23ti[n] = floorTexs.length; floorTexs.push(tex[n] || tex.floor_stone); }
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const c = map[y][x];
    if (c === 'ʌ') {
      // högst åtta katapultmål per bana, var och en med egen fas
      if (v23targets.length < 8) v23targets.push({ x, y, next: 3 + ((x * 7 + y * 13) % 14) / 2 });
      else { map[y][x] = '.'; v23Back(x, y); }
    } else if (c === 'ʀ') v23grinders.push([x, y]);
  }
  for (const pr of props) if (pr.ch === 'ʁ') pr.z = 0.8;
  // tak: högst två spökryttare
  const rm = new Set(); for (const e of ents.filter(o => o.type === V23_RIDER && !o.minion).slice(2)) rm.add(e);
  if (rm.size) { ents = ents.filter(e => !rm.has(e)); totalEnemies -= rm.size; }
  // spöksoldaterna marscherar i grupper om tre
  const sol = ents.filter(o => o.type === V23_SOLDIER); let gid = 0;
  for (const e of sol) if (e.v23grp === undefined) { e.v23grp = ++gid; let n = 1; for (const o of sol) if (o.v23grp === undefined && n < 3 && Math.hypot(o.x - e.x, o.y - e.y) < 4) { o.v23grp = gid; n++; } }
}
function v23Temp(x, y, t) {
  if (!map[y] || map[y][x] !== '.' || v23temp.some(o => o.x === x && o.y === y)) return false;
  const i = y * mw + x; v23temp.push({ x, y, t, f: cellFloor ? cellFloor[i] : 0 }); map[y][x] = 'ʀ';
  if (cellFloor && v23ti.floor_grinder !== undefined) cellFloor[i] = v23ti.floor_grinder;
  flowCell = -1; return true;
}
function v23ClearTemp() { for (const o of v23temp) if (map[o.y] && map[o.y][o.x] === 'ʀ') { map[o.y][o.x] = '.'; if (cellFloor) cellFloor[o.y * mw + o.x] = o.f; } v23temp = []; flowCell = -1; }
const v23Grip = () => 0.14 * clamp(1 + 3 * mod('slickGrip'), 0.3, 4);
const v23Slow = () => (P.v23mud ? 0.55 + 0.45 * clamp(mod('mudWalk'), 0, 1) : 1);
function v23NoJump() {
  if (cellUnder() !== 'ʋ' || !onGround() || mod('hazardImmune') > 0 || mod('mudWalk') >= 1) return false;
  if ((P.v23jumpMsg || 0) < tmr) { P.v23jumpMsg = tmr + 2; play('deep_mud', 0.6, 0.8); say('LERAN HÅLLER FAST DIG', 1); }
  return true;
}
function v23HitProp(pr) {
  if (pr.ch === 'ʁ') { pr.swing = Math.min(1.5, (pr.swing || 0) + 0.8); if ((pr.creakT || 0) < tmr) { pr.creakT = tmr + 0.8; play('meathook_creak', 0.6, rnd(0.9, 1.1), { x: pr.x, y: pr.y }); } return false; }
  return undefined;
}
function v23Rock(x, y, o = {}) {
  if (solid(x, y)) return;
  const T = (o.T || 1) * (o.fixed ? 1 : 1 + clamp(mod('catapultSense'), 0, 2));
  v23rocks.push({ x, y, t: 0, T, dmg: o.dmg || 30, r: o.r || 1.1, cause: o.cause || 'KATAPULTSTENEN', boss: !!o.boss });
  const d = Math.hypot(P.x - x, P.y - y); if (d < 16) play('catapult_whistle', 0.25 + 0.6 * (1 - d / 16), rnd(0.95, 1.05), { x, y });
}
function v23RockLand(r) {
  play('catapult_impact', 1, rnd(0.9, 1.1), { x: r.x, y: r.y }); explodeFx(r.x, r.y, 0.2); spawnPuff(r.x, r.y, 6);
  if (fx.parts.scorch) decals.push({ x: r.x, y: r.y, img: fx.parts.scorch[0], size: 0.12 });
  const d = Math.hypot(P.x - r.x, P.y - r.y); if (d < 10) P.shake = Math.max(P.shake, 1.2 * (1 - d / 10));
  if (d < r.r && P.jz < 0.5) { run.cause = r.cause; hurtPlayer(r.dmg * (r.boss ? 1 : trapMul()), r.x, r.y, 'proj'); }
  for (const e of ents) if (!e.dead && !e.dying && !e.boss && !e.hidden && Math.hypot(e.x - r.x, e.y - r.y) < r.r) hurtEnemy(e, r.dmg, r.x, r.y, { boom: true, noProc: true });
  for (const pr of props) if (pr.def && !pr.broken && (pr.def.boom || pr.def.crate) && Math.hypot(pr.x - r.x, pr.y - r.y) < r.r) hitProp(pr, r.x, r.y);
  stat('catapultRocks');
}
function v23Meat(src, tx, ty) {
  for (let i = 0; i < 6 && solid(tx, ty); i++) { tx += (src.x - tx) * 0.2; ty += (src.y - ty) * 0.2; }
  v23lobs.push({ x0: src.x, y0: src.y, tx, ty, t: 0, T: 0.7 + Math.hypot(tx - src.x, ty - src.y) * 0.05 });
}
function updateV23(dt) {
  v23clock += dt; const ground = P.jz < 0.15, c = cellUnder(), immune = mod('hazardImmune') > 0;
  // blodhalt golv: farten bromsas långsamt (själva glidningen sker i rörelsen)
  const slick = c === 'ɿ' && ground && !immune;
  if (slick && !P.v23slick && Math.hypot(P.vx, P.vy) > 2) { play('blood_slick', 0.5, rnd(0.9, 1.1)); firstHint('bloodslick', 'DET BLODHALA GOLVET – DU GLIDER OCH BROMSAR SENT.'); }
  P.v23slick = slick;
  // köttkvarnar: 12 skada per sekund
  if (c === 'ʀ' && ground && !immune) { P.v23grindT = 0.2; P.v23grindAcc += dt;
    if (P.v23grindAcc >= 0.5) { P.v23grindAcc = 0; run.cause = 'KÖTTKVARNEN'; hurtPlayer(6 * trapMul() * clamp(1 - mod('grinderResist'), 0, 2), P.x, P.y, 'gas'); play('grinder', 0.7, rnd(0.9, 1.1)); firstHint('grinder', 'KÖTTKVARNARNA MAL ALLT – KNUFFA IN FIENDERNA I STÄLLET.'); } }
  else { P.v23grindT = Math.max(0, P.v23grindT - dt); P.v23grindAcc = 0.25; }
  // djup lera: 45 % långsammare och går inte att hoppa från
  P.v23mud = c === 'ʋ' && ground && !immune;
  if (P.v23mud && Math.hypot(P.vx, P.vy) > 0.5 && Math.random() < dt * 1.5) { play('deep_mud', 0.35, rnd(0.85, 1.1)); firstHint('deepmud', 'DEN DJUPA LERAN SAKTAR DIG – OCH DU KAN INTE HOPPA UR DEN.'); }
  // fienderna: glider, mals och fastnar
  for (const e of ents) { if (e.dead || e.dying || e.boss || e.d.float) { e.v23px = undefined; continue; }
    const ec = map[e.y | 0] && map[e.y | 0][e.x | 0];
    if (ec === 'ɿ' && e.v23px !== undefined && !e.knock) { const vx = (e.x - e.v23px) / Math.max(dt, 0.001), vy = (e.y - e.v23py) / Math.max(dt, 0.001); if (Math.hypot(vx, vy) < 8) tryMove(e, vx * 0.55 * dt, vy * 0.55 * dt, 0.3); }
    if (ec === 'ʀ') { e.v23acc = (e.v23acc || 0) + dt; if (e.v23acc >= 0.5) { e.v23acc = 0; const k = hurtEnemy(e, e.knock ? 12 : 6, e.x, e.y, { noProc: true, quiet: true }); sparks(e.x, e.y, 0.3, 2); if (k) stat('grinderKills'); } }
    if (ec === 'ʋ') e.slow = Math.max(e.slow || 0, 0.25);
    e.v23px = e.x; e.v23py = e.y; }
  // köttkvarnarna låter och stänker
  for (const [x, y] of v23grinders) { const d = Math.hypot(x + 0.5 - P.x, y + 0.5 - P.y); if (d > 7) continue; if (Math.random() < dt * 0.3) play('grinder', 0.25 * (1 - d / 8), rnd(0.85, 1.1), { x: x + 0.5, y: y + 0.5 }); if (!settings.lowfx && Math.random() < dt * 2) sparks(x + 0.5, y + 0.5, 0.05, 1); }
  // katapultmålen: var sjunde sekund landar en sten (skugga och visslande först)
  const warn = 1 + clamp(mod('catapultSense'), 0, 2);
  for (const t of v23targets) if (v23clock >= t.next - warn) { v23Rock(t.x + 0.5, t.y + 0.5, { T: Math.max(0.05, t.next - v23clock), fixed: true }); t.next += 7; if (Math.hypot(t.x + 0.5 - P.x, t.y + 0.5 - P.y) < 9) firstHint('catapult', 'KATAPULTSTENARNA LANDAR PÅ DE MARKERADE RUTORNA – SE SKUGGAN.'); }
  for (const r of v23rocks) { r.t += dt; if (r.t >= r.T) { r.done = true; v23RockLand(r); } }
  v23rocks = v23rocks.filter(r => !r.done);
  // tillfälliga köttkvarnar (slaktmästaren)
  for (const o of v23temp) { o.t -= dt; if (o.t <= 0 && map[o.y] && map[o.y][o.x] === 'ʀ') { map[o.y][o.x] = '.'; if (cellFloor) cellFloor[o.y * mw + o.x] = o.f; flowCell = -1; } }
  v23temp = v23temp.filter(o => o.t > 0);
  // köttbitar i båge blir flugsvärmar där de landar
  for (const l of v23lobs) { l.t += dt; if (l.t < l.T) continue; l.done = true; splash(l.tx, l.ty); play('flies', 0.6, rnd(0.9, 1.1), { x: l.tx, y: l.ty });
    if (ents.filter(e => e.type === V23_FLY && e.minion && !e.dead).length < 8 && freeSpot(l.tx, l.ty, 0.2)) { const e = makeEnemy(V23_FLY, l.tx, l.ty); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; } }
  v23lobs = v23lobs.filter(l => !l.done);
  // spjutpålar: 4 skada vid kontakt; köttkrokar och fanor gungar
  P.v23stakeT = Math.max(0, P.v23stakeT - dt);
  for (const pr of props) {
    if (pr.ch === 'ʏ') { if (P.v23stakeT <= 0 && Math.abs(pr.x - P.x) < 0.78 && Math.abs(pr.y - P.y) < 0.78 && P.jz < 0.5) { P.v23stakeT = 0.8; run.cause = 'SPJUTPÅLARNA'; hurtPlayer(4 * trapMul(), pr.x, pr.y, 'melee'); play('stakes_hit', 0.8, rnd(0.9, 1.1), { x: pr.x, y: pr.y }); } }
    else if (pr.ch === 'ʁ') { pr.swing = Math.max(0, (pr.swing || 0) - dt * 0.4); if (!settings.reduceMotion) pr.off = Math.sin(tmr * 1.4 + (pr.ph || 0)) * (0.03 + 0.08 * pr.swing); if (Math.random() < dt * 0.05 && Math.hypot(pr.x - P.x, pr.y - P.y) < 6) play('meathook_creak', 0.3, rnd(0.85, 1.1), { x: pr.x, y: pr.y }); }
    else if (pr.ch === 'ʎ') { if (!settings.reduceMotion) pr.off = Math.sin(tmr * 2.1 + (pr.ph || 0)) * 0.025; if (Math.random() < dt * 0.06 && Math.hypot(pr.x - P.x, pr.y - P.y) < 6) play('banner_flap', 0.35, rnd(0.9, 1.1), { x: pr.x, y: pr.y }); }
    else if (pr.ch === 'ʃ') { if (Math.random() < dt * 0.15 && Math.hypot(pr.x - P.x, pr.y - P.y) < 6) play('bandsaw', 0.3, rnd(0.95, 1.05), { x: pr.x, y: pr.y }); } }
  // slaktarkroken: ut, fast, dra – och slå
  if (v23hook) v23HookTick(dt);
  // bombardens kulor: genom fiender och en studs i väggen
  for (const b of v23balls) { b.life -= dt; const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
    if (solid(nx, ny)) {
      if (b.bounces > 0) { b.bounces--; const sx = solid(nx, b.y), sy = solid(b.x, ny); if (sx) b.vx = -b.vx; if (sy) b.vy = -b.vy; if (!sx && !sy) { b.vx = -b.vx; b.vy = -b.vy; } b.vx *= 0.85; b.vy *= 0.85; play('cannonball_bounce', 0.8, rnd(0.9, 1.1), { x: b.x, y: b.y }); sparks(b.x, b.y, 0.4, 3); }
      else { b.done = true; if (!b.grape) { play('cannonball_bounce', 0.5, 0.8, { x: b.x, y: b.y }); spawnPuff(b.x, b.y, 4); } else sparks(b.x, b.y, 0.4, 1); continue; } }
    else { b.x = nx; b.y = ny; }
    for (const e of ents) { if (e.dead || e.dying || e.hidden || e.dormant || b.hit.has(e) || Math.hypot(e.x - b.x, e.y - b.y) > 0.3 + e.d.size * 0.25 * (e.boss ? 1.8 : 1)) continue;
      b.hit.add(e); const k = hurtEnemy(e, b.dmg, b.x, b.y, {}); hitKill = hitKill || k; hitMark = 0.12; lvlStat.hits++;
      if (b.grape) { b.done = true; break; }
      if (k) stat('bombardKills'); else if (!e.boss) tryMove(e, b.vx * 0.02, b.vy * 0.02, 0.3);
      b.dmg *= up('bd_pierce') ? 0.9 : 0.75; }
    if (!b.grape && !b.done) breakProps(b.x, b.y, 0.35);
    if (b.life <= 0) b.done = true; }
  v23balls = v23balls.filter(b => !b.done);
  // slagfältet: rök och glöd under den grå himlen
  if (lvl && lvl.biome === 'battlefield' && !settings.lowfx && Math.random() < dt * 8) { const a = rnd(0, TAU), r = rnd(1, 7), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
    if (!solid(x, y) && (!cellSky || cellSky[(y | 0) * mw + (x | 0)])) { const ember = Math.random() < 0.35; particles.push({ x, y, z: ember ? rnd(0.1, 0.5) : rnd(0.3, 1.2), vx: rnd(-0.3, 0.3), vy: rnd(-0.3, 0.3), vz: ember ? rnd(0.3, 0.7) : 0.12, life: ember ? 1.6 : 3, maxLife: ember ? 1.6 : 3, img: ember ? (fx.parts.ember ? fx.parts.ember[0] : fx.hit[1]) : (fx.parts.smoke ? fx.parts.smoke[0] : fx.hit[1]), size: ember ? 0.03 : 0.2, fade: true, add: ember, tint: ember ? [255, 150, 60] : [120, 115, 110] }); } }
}
function v23HookTick(dt) {
  const h = v23hook; h.t += dt;
  if (h.phase === 'out') {
    h.d += 20 * dt; const hx = P.x + h.dx * h.d, hy = P.y + h.dy * h.d; h.x = hx; h.y = hy;
    const e = ents.find(o => !o.dead && !o.dying && !o.hidden && !o.dormant && Math.hypot(o.x - hx, o.y - hy) < 0.35 + o.d.size * 0.25 * (o.boss ? 1.8 : 1));
    if (e) { h.e = e; h.pt = 0; h.phase = e.boss || e.guardian || e.d.size >= (up('hk_pull') ? 1.7 : 1.3) ? 'drag' : 'pull'; play('chain_pull', 0.9, 1, { x: e.x, y: e.y }); if (h.phase === 'pull') { stat('hookPulls'); firstHint('hookchain', 'KROKEN DRAR IN FIENDEN – STORA FIENDER DRAR IN DIG.'); } }
    else if (solid(hx, hy) || h.d >= h.reach) { h.phase = 'back'; if (solid(hx, hy)) play('ricochet', 0.4, 0.7, { x: hx, y: hy }); }
  } else if (h.phase === 'pull' || h.phase === 'drag') {
    const e = h.e;
    if (!e || e.dead || e.dying) h.phase = 'back';
    else {
      const d = Math.hypot(e.x - P.x, e.y - P.y), a = Math.atan2(e.y - P.y, e.x - P.x), sp = 14 * dt, reach = h.phase === 'pull' ? 1.15 : 1.5 + (e.boss ? e.d.size * 0.25 : 0);
      if (d > reach) { if (h.phase === 'pull') { tryMove(e, -Math.cos(a) * Math.min(sp, d - reach + 0.05), -Math.sin(a) * Math.min(sp, d - reach + 0.05), 0.3); e.state = 'pain'; e.t = 0; } else tryMove(P, Math.cos(a) * Math.min(sp, d - reach + 0.05), Math.sin(a) * Math.min(sp, d - reach + 0.05), 0.24); }
      h.x = e.x; h.y = e.y; h.d = Math.hypot(e.x - P.x, e.y - P.y); h.pt += dt;
      if (d <= reach + 0.1 || h.pt > 0.8) { v23HookStrike(e); v23hook = null; return; }
    }
  }
  if (h.phase === 'back') { h.d -= 26 * dt; h.x = P.x + h.dx * Math.max(0, h.d); h.y = P.y + h.dy * Math.max(0, h.d); if (h.d <= 0) v23hook = null; }
}
function v23HookDmg() { const w = WEAPONS[weaponIndex('hookchain')]; return (w ? w.dmg : 45) * meleeMul() * (1 + mod('hookDmg')) * (1 + 0.12 * wlvl('hookchain')); }
function v23HookStrike(e) {
  WS.shot = 0; WS.kick = 1.1;
  if (Math.hypot(e.x - P.x, e.y - P.y) > 2.6 + (e.boss ? e.d.size * 0.3 : 0)) return false;
  const crit = Math.random() < mod('critChance'), dmg = v23HookDmg() * (crit ? 2 + mod('critDmg') : 1);
  const k = hurtEnemy(e, dmg, e.x, e.y, { melee: true, crit }); hitKill = hitKill || k; hitMark = 0.12; lvlStat.hits++; hitStop = Math.max(hitStop, 0.05); if (crit) hitCrit = true;
  if (up('hk_bleed') && !k) e.bleed = Math.max(e.bleed || 0, 4);
  play('hookchain_hit', 1, rnd(0.9, 1.1), { x: e.x, y: e.y });
  return true;
}
function hookThrow(wp) {
  if (WS.cd > 0 || WS.state !== 'idle' || v23hook) return;
  WS.cd = effDelay(wp) * (up('hk_fast') ? 0.65 : 1); WS.shot = 9; WS.kick = 0.5; lvlStat.shots++; noise(1.5);
  v23hook = { x: P.x, y: P.y, dx: Math.cos(P.a), dy: Math.sin(P.a), d: 0.3, reach: 6 + (up('hk_reach') ? 2 : 0), t: 0, phase: 'out', e: null, pt: 0 };
  play('hookchain_throw', 0.9, rnd(0.95, 1.05)); stat('hookThrows');
}
function v23BallDmg() { const w = WEAPONS[weaponIndex('bombard')]; return (w ? w.dmg : 80) * (1 + mod('dmg')) * (1 + mod('bombardDmg')) * (1 + 0.12 * wlvl('bombard')); }
function bombardFire(wp) {
  if (WS.cd > 0 || WS.state !== 'idle') return;
  if (P.mags[P.weapon] <= 0) { if ((P.ammo.cannonballs || 0) > 0) startReload(); else play('click', 0.5, 0.8); return; }
  WS.shot = 0; WS.cd = effDelay(wp) * (up('bd_fast') ? 0.65 : 1); WS.kick = 1.6; lvlStat.shots++; run.shots = (run.shots || 0) + 1; P.flash = settings.noFlash ? 0 : 0.08;
  if (Math.random() >= mod('ammoSave')) P.mags[P.weapon]--;
  play('bombard_fire', 1.0, rnd(0.95, 1.05)); noise(4); P.shake = Math.max(P.shake, 0.8);
  v23balls.push({ x: P.x + Math.cos(P.a) * 0.4, y: P.y + Math.sin(P.a) * 0.4, vx: Math.cos(P.a) * 15, vy: Math.sin(P.a) * 15, life: 1.6, dmg: v23BallDmg(), bounces: up('bd_bounce') ? 3 : 1, hit: new Set(), grape: false });
  tryMove(P, -Math.cos(P.a) * 0.15, -Math.sin(P.a) * 0.15, 0.24);
  if (P.mags[P.weapon] <= 0 && (P.ammo.cannonballs || 0) > 0) setTimeout(() => { if (state === 'play' && WEAPONS[P.weapon].bombard) startReload(); }, 450);
}
function bombardGrape(wp) {
  if (P.mags[P.weapon] <= 0) { if ((P.ammo.cannonballs || 0) > 0) startReload(); return; }
  WS.shot = 0; WS.cd = effDelay(wp) * (up('bd_fast') ? 0.65 : 1); WS.kick = 1.8; lvlStat.shots++; P.flash = settings.noFlash ? 0 : 0.08;
  if (Math.random() >= mod('ammoSave')) P.mags[P.weapon]--;
  play('bombard_grape', 1.0, rnd(0.95, 1.05)); noise(4); P.shake = Math.max(P.shake, 0.8);
  const n = up('bd_grape') ? 12 : 8, dmg = v23BallDmg() * 0.2;
  for (let i = 0; i < n; i++) { const a = P.a + rnd(-0.22, 0.22), sp = rnd(12, 15); v23balls.push({ x: P.x + Math.cos(a) * 0.4, y: P.y + Math.sin(a) * 0.4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.32, dmg, bounces: 0, hit: new Set(), grape: true }); }
  if (P.mags[P.weapon] <= 0 && (P.ammo.cannonballs || 0) > 0) setTimeout(() => { if (state === 'play' && WEAPONS[P.weapon].bombard) startReload(); }, 450);
}
function weaponV23Tick(wp, dt, trig) {
  if (wp.bombard && aimDown && !WS.bdAim && state === 'play' && WS.state === 'idle' && WS.cd <= 0) bombardGrape(wp);
  WS.bdAim = aimDown;
}
function v23Light(fl) {
  for (const t of v23targets) { const k = clamp(1 - (t.next - v23clock) / 2.5, 0, 1); if (k > 0) fl(t.x + 0.5, t.y + 0.5, 0.15 + 0.6 * k, 2, [255, 150, 60]); }
  for (const r of v23rocks) fl(r.x, r.y, 0.2 + 0.5 * r.t / r.T, 2, [255, 140, 70]);
}
function v23Dmg(e, dmg, opt) {
  // spöksoldatens sköld tar det mesta framifrån – mindre när formationen är bruten
  if (e.d.ai === 'ghostsoldier' && !opt.boom && !opt.fall && !opt.infight && !(e.stun > 0)) {
    const want = Math.atan2(P.y - e.y, P.x - e.x); let off = want - (e.faceA ?? want); off = Math.atan2(Math.sin(off), Math.cos(off));
    if (Math.abs(off) < 0.9) {
      const mates = e.v23grp ? ents.filter(o => o !== e && !o.dead && !o.dying && o.v23grp === e.v23grp && Math.hypot(o.x - e.x, o.y - e.y) < 4).length : 0;
      dmg *= clamp((mates ? 0.35 : 0.65) + mod('formationBreak'), 0, 1);
      if ((e.shMsg || 0) < tmr) { e.shMsg = tmr + 0.8; spawnText(e.x, e.y, 'SKÖLD', '#c0d0e0'); sparks(e.x, e.y, 0.5, 2); play('ghost_shield_bash', 0.7, rnd(0.9, 1.1), { x: e.x, y: e.y }); }
    }
  }
  return dmg;
}
function v23Kill(e) {
  if (e.boss) { v23ClearTemp(); v23rocks = []; v23lobs = []; }
  if (e.v23grp && e.d.ai === 'ghostsoldier' && !ents.some(o => o !== e && !o.dead && !o.dying && o.v23grp === e.v23grp)) { stat('formations'); spawnText(e.x, e.y, 'FORMATIONEN BRUTEN', '#c0d0e0'); }
}
function v23Map(s, ox, oy, inside) { for (const t of v23targets) if (inside(t.x, t.y) && seen[t.y * mw + t.x]) { ctx.fillStyle = '#ff9030'; ctx.fillRect(ox + t.x * s, oy + t.y * s, s, s); } }
function drawV23Hud(g) {
  if (P.v23grindT > 0) { g.fillStyle = `rgba(200,20,20,${0.12 + (settings.noFlash ? 0 : 0.05 * Math.sin(tmr * 9))})`; g.fillRect(0, 0, W, VH); }
  if (P.v23mud) { g.fillStyle = 'rgba(80,55,30,0.16)'; g.fillRect(0, Math.round(VH * 0.72), W, VH - Math.round(VH * 0.72)); }
  if (v23hook && WEAPONS[P.weapon].hookchain && v23hook.phase === 'drag') { const t = 'KROKEN DRAR DIG'; txt(t, Math.round((W - textW(t)) / 2), HORIZON + 26, '#e0a0a0', 1, true, 0.7); }
}
function drawV23World(list) {
  for (const r of v23rocks) { list.push({ x: r.x, y: r.y, k: 'v23', t: 'shadow', o: r }); list.push({ x: r.x, y: r.y, k: 'v23', t: 'rock', o: r }); }
  for (const b of v23balls) list.push({ x: b.x, y: b.y, k: 'v23', t: 'ball', o: b });
  for (const l of v23lobs) { const k = l.t / l.T; list.push({ x: l.x0 + (l.tx - l.x0) * k, y: l.y0 + (l.ty - l.y0) * k, k: 'v23', t: 'meat', o: l, z: 0.45 + 1.6 * 4 * k * (1 - k) }); }
  if (v23hook) { const h = v23hook, n = Math.min(8, Math.max(2, Math.round(h.d * 1.5))); for (let i = 1; i < n; i++) { const k = i / n; list.push({ x: P.x + (h.x - P.x) * k, y: P.y + (h.y - P.y) * k, k: 'v23', t: 'link', o: h, z: 0.42 }); } list.push({ x: h.x, y: h.y, k: 'v23', t: 'hook', o: h }); }
}
function drawV23Sprite(s) {
  const o = s.o;
  if (s.t === 'shadow') { const k = o.t / o.T, n = 10; for (let i = 0; i < n; i++) { const a = i / n * TAU + tmr * 0.5; drawSprite(fx.hit[1], o.x + Math.cos(a) * 0.9, o.y + Math.sin(a) * 0.9, 0.06, 0.01, false, 1.4, 0, 0, true, k > 0.6 ? [255, 120, 60] : [255, 200, 120]); } drawSprite(fx.hit[1], o.x, o.y, 0.25 + 0.5 * k, 0.005, false, 0.2, 0, 0, false, [10, 8, 6]); return true; }
  if (s.t === 'rock') { const k = o.t / o.T; drawSprite(fx.parts.rock ? fx.parts.rock[0] : fx.hit[1], o.x, o.y, 0.35, 0.2 + 3.2 * (1 - k), false, null, 0, 0.3, false, fx.parts.rock ? null : [110, 100, 90]); return true; }
  if (s.t === 'ball') { drawSprite(fx.parts.chainball ? fx.parts.chainball[0] : fx.hit[1], s.x, s.y, o.grape ? 0.08 : 0.2, 0.45, false, null, 0, 0.3, false, fx.parts.chainball ? null : [60, 60, 60]); return true; }
  if (s.t === 'meat') { drawSprite(fx.parts.gib ? fx.parts.gib[Math.floor(tmr * 8) % fx.parts.gib.length] : fx.hit[1], s.x, s.y, 0.22, s.z - 0.1, false, null, 0, 0.3, false, fx.parts.gib ? null : [150, 40, 40]); return true; }
  if (s.t === 'link') { drawSprite(fx.parts.chain ? fx.parts.chain[0] : fx.hit[1], s.x, s.y, 0.07, s.z, false, null, 0, 0.4, false, fx.parts.chain ? null : [150, 150, 160]); return true; }
  if (s.t === 'hook') { drawSprite(spr.pick_hookchain || fx.hit[0], s.x, s.y, 0.3, 0.4, false, null, 0, 0.5); return true; }
  return false;
}
function v23ArcProj(p, dt) {
  // köttyxor och pilar i båge
  if (infightHit(p)) return;
  const k = clamp((tmr - (p.t0 || tmr)) / (p.arcT || 1.2), 0, 1); p.z = 0.45 + Math.sin(k * Math.PI) * (p.arcH || 0.35);
  if (Math.hypot(p.x - P.x, p.y - P.y) < 0.4 && P.jz < 0.6) { p.dead = true; run.cause = p.cause || run.cause; hurtPlayer(p.dmg, p.src.x, p.src.y, 'proj'); return; }
  if (solid(p.x, p.y) || p.life <= 0) { p.dead = true; sparks(p.x, p.y, 0.4, 3); }
}
Object.assign(PROJ_UPD_V8, { v23cleaver: v23ArcProj, v23arrow: v23ArcProj });
Object.assign(PROJ_DRAW_V8, {
  v23cleaver: o => drawSprite(fx.parts.knife ? fx.parts.knife[Math.floor(tmr * 14) % fx.parts.knife.length] : fx.hit[0], o.x, o.y, 0.22, o.z - 0.1, Math.floor(tmr * 10) % 2 === 0, null, 0, 0.3, false, fx.parts.knife ? null : [200, 200, 210]),
  v23arrow: o => drawSprite(fx.parts.dart ? fx.parts.dart[0] : fx.hit[1], o.x, o.y, 0.16, o.z - 0.08, false, 1.2, 0, 0.5, true, [170, 220, 255]),
});

