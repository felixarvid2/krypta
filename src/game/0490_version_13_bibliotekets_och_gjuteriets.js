// ---------- Version 13: bibliotekets och gjuteriets invånare ----------
const AI_V13 = {
  grimoire(e, dt, dist, los) { // flygande bok: fladdrar i sicksack och biter
    if (los && dist < 5 && e.state === 'move') { const a = Math.atan2(P.y - e.y, P.x - e.x) + Math.PI / 2, s = Math.sin(e.t * 7 + e.x * 3) * dt * 1.6; tryMove(e, Math.cos(a) * s, Math.sin(a) * s, 0.25); }
    return false;
  },
  inkslime(e, dt, dist, los) { // lämnar bläck efter sig
    e.inkT = (e.inkT ?? rnd(0.5, 1.5)) - dt;
    if (e.inkT <= 0 && e.alert) { e.inkT = rnd(1.3, 2); if (inkPuddles.length < 40) inkPuddles.push({ x: e.x, y: e.y, t: 6 }); }
    return false;
  },
  archivist(e, dt, dist, los) { // blinkar mellan hyllorna och väcker böcker
    e.blinkT = (e.blinkT ?? rnd(3, 5)) - dt; e.wakeT = (e.wakeT ?? rnd(5, 8)) - dt;
    if (e.blinkT <= 0 && e.state !== 'pain') { e.blinkT = rnd(5, 7); const s = freeSpotFar(3, 7); if (s) { spawnPuff(e.x, e.y, 6); e.x = s[0]; e.y = s[1]; spawnPuff(e.x, e.y, 6); play('archivist_blink', 0.6, 1, { x: e.x, y: e.y }); } return true; }
    if (e.wakeT <= 0 && los && ENEMY_DEFS['Ų']) { e.wakeT = rnd(9, 12); const mine = ents.filter(o => !o.dead && o.owner === e).length;
      if (mine < 3) { e.state = 'attack'; e.t = 0; e.didHit = true; play('archivist', 0.7, 1, { x: e.x, y: e.y }); for (let i = 0; i < 2 && mine + i < 3; i++) { const a = rnd(0, TAU), x = e.x + Math.cos(a) * 0.9, y = e.y + Math.sin(a) * 0.9; if (!freeSpot(x, y, 0.3)) continue; const o = makeEnemy('Ų', x, y); o.alert = true; o.minion = true; o.owner = e; o.d = { ...o.d, score: 20 }; ents.push(o); totalEnemies++; spawnPuff(x, y, 4); } return true; } }
    return false;
  },
  moltengolem(e, dt, dist, los) { // lämnar brinnande metall efter sig
    e.dripT = (e.dripT ?? rnd(1, 2)) - dt; e.burn = 0;
    if (e.dripT <= 0 && e.alert && e.state === 'move') { e.dripT = rnd(1.6, 2.4); if (groundFires.length < 30) groundFires.push({ x: e.x, y: e.y, t: 4, acc: 0 }); play('molten_drip', 0.4, 1, { x: e.x, y: e.y }); }
    return false;
  },
  steambot(e, dt, dist, los) { // sprutar ånga på nära håll
    e.cd = 99; e.steamT = (e.steamT ?? rnd(1, 2)) - dt;
    if (e.spray > 0) { e.spray -= dt; e.state = 'attack';
      if (!settings.lowfx && Math.random() < dt * 30) { const a = e.sprayA + rnd(-0.35, 0.35), sp = rnd(4, 6); particles.push({ x: e.x + Math.cos(a) * 0.4, y: e.y + Math.sin(a) * 0.4, z: 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0.2, life: 0.5, maxLife: 0.5, img: fx.parts.steam ? fx.parts.steam[0] : fx.hit[1], size: 0.12, tint: [235, 235, 240] }); }
      let off = Math.atan2(P.y - e.y, P.x - e.x) - e.sprayA; off = Math.atan2(Math.sin(off), Math.cos(off));
      if (dist < 3.4 && Math.abs(off) < 0.45 && (e.burnT || 0) < tmr) { e.burnT = tmr + 0.4; run.cause = e.d.name; hurtPlayer(e.d.dmg * 0.45 * Math.max(0, 1 - mod('ventResist')), e.x, e.y, 'proj'); }
      return true; }
    if (e.steamT <= 0 && los && dist < 3.2 && e.state !== 'pain') { e.steamT = rnd(2.2, 3); e.spray = 1.1; e.sprayA = Math.atan2(P.y - e.y, P.x - e.x); e.t = 0; play('steambot', 0.8, 1, { x: e.x, y: e.y }); return true; }
    return false;
  },
  sparkdrone(e, dt, dist, los) { return false; }, // skjuter gnistor, exploderar när den dör (se v13Kill)
};
function v13Kill(e) {
  if (e.d.ai === 'inkslime' && !e.small) for (let i = 0; i < 2; i++) { const a = rnd(0, TAU), o = makeEnemy('ų', e.x + Math.cos(a) * 0.4, e.y + Math.sin(a) * 0.4); o.small = true; o.hp = o.maxHp = o.maxHp * 0.35; o.d = { ...o.d, size: o.d.size * 0.6, dmg: o.d.dmg * 0.5, speed: o.d.speed * 1.3, score: 20 }; o.alert = true; o.minion = true; ents.push(o); totalEnemies++; }
  if (e.d.ai === 'inkslime') { inkPuddles.push({ x: e.x, y: e.y, t: 8 }); play('ink_splash', 0.6, 1, { x: e.x, y: e.y }); }
  if (e.d.ai === 'steambot') { play('steam_burst', 0.8, 1, { x: e.x, y: e.y }); for (let i = 0; i < 14; i++) { const a = rnd(0, TAU), sp = rnd(1, 3); particles.push({ x: e.x, y: e.y, z: 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(0, 0.8), life: 0.9, maxLife: 0.9, img: fx.parts.steam ? fx.parts.steam[i % fx.parts.steam.length] : fx.hit[1], size: 0.16, tint: [235, 235, 240] }); }
    if (Math.hypot(P.x - e.x, P.y - e.y) < 1.6) { run.cause = 'ÅNGA'; hurtPlayer(6 * Math.max(0, 1 - mod('ventResist')), e.x, e.y, 'proj'); } }
  if (e.d.ai === 'sparkdrone') { play('drone_pop', 0.8, 1, { x: e.x, y: e.y }); explodeFx(e.x, e.y, 0.6); for (const o of ents) if (!o.dead && o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 1.6) hurtEnemy(o, 8, o.x, o.y, { noProc: true, boom: true });
    if (Math.hypot(P.x - e.x, P.y - e.y) < 1.4) { run.cause = e.d.name; hurtPlayer(7, e.x, e.y, 'proj'); } }
  if ((e.d.ai === 'moltengolem' || e.d.ai === 'steambot' || e.d.ai === 'sparkdrone') && mod('forgeArmor') > 0) P.armor = Math.min(200, P.armor + mod('forgeArmor'));
}

// ---------- Version 13: Bibliotekarien och Smideskolossen ----------
Object.assign(BOSS_AI, {
  librarian(b, dt, dist, ang, ph) { // målsökande runor, bläck och flygande böcker
    const fast = ph === 3 ? 1.3 : 1;
    if (b.state === 'runes') { if (b.t < 0.05 || (ph >= 2 && Math.abs(b.t - 0.5) < dt)) { const n = 2 + ph; for (let i = 0; i < n; i++) shootFireball(b, ang + (i - (n - 1) / 2) * 0.35, 3.6, b.d.dmg * 0.45, false, 'orb'); play('librarian_cast', 0.8); }
      if (b.t > 1.1) { b.state = 'idle'; b.t = 0; b.cd = rnd(1.2, 1.7) / fast; } return; }
    if (b.state === 'ink') { if (b.t < 0.05) { bossWarn(b, 'BLÄCKET SKÖLJER ÖVER GOLVET!'); play('ink_splash', 1, 0.7); for (let i = 0; i < 4 + ph * 2; i++) { const a = rnd(0, TAU), r = rnd(0.5, 3.5); const x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r; if (!solid(x, y)) inkPuddles.push({ x, y, t: 7 }); } }
      if (b.t > 1) { b.state = 'idle'; b.t = 0; b.cd = 1; } return; }
    b.cd -= dt;
    if (b.cd <= 0 && hasLOS(b.x, b.y, P.x, P.y)) { b.t = 0; b.didHit = false; b.state = Math.random() < 0.3 ? 'ink' : 'runes'; return; }
    if (b.cd <= 0) { const s = freeSpotFar(4, 7); if (s) { spawnPuff(b.x, b.y, 8); b.x = s[0]; b.y = s[1]; spawnPuff(b.x, b.y, 8); play('archivist_blink', 0.8, 0.8); } b.cd = 0.8; return; }
    if (dist > 6) bossMove(b, ang, b.d.speed * fast * dt); else if (dist < 3.5) bossMove(b, ang + Math.PI, b.d.speed * dt * 0.8);
  },
  colossus(b, dt, dist, ang, ph) { // markslag med chockvågor, smält metall ur ugnen och en rusning
    const fast = ph === 3 ? 1.3 : 1;
    if (b.state === 'slam') { if (!b.didHit && b.t > 0.6) { b.didHit = true; play('colossus_slam', 1); P.shake = Math.max(P.shake, 2); waves.push({ x: b.x, y: b.y, r: 0.5, sp: 6 + ph, dmg: b.d.dmg * 0.6, hit: false }); if (ph >= 2) setTimeout(() => { if (!b.dead && state === 'play') waves.push({ x: b.x, y: b.y, r: 0.5, sp: 6 + ph, dmg: b.d.dmg * 0.6, hit: false }); }, 450); if (dist < b.d.range + 0.8 && P.jz < 0.15) { run.cause = b.d.name; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); } }
      if (b.t > 1.1) { b.state = 'idle'; b.t = 0; b.cd = rnd(1, 1.5) / fast; } return; }
    if (b.state === 'furnace') { if (b.t < 0.05 || Math.abs(b.t - 0.35) < dt || (ph >= 2 && Math.abs(b.t - 0.7) < dt)) { for (const s of [-0.25, 0, 0.25]) { const a = ang + s + rnd(-0.05, 0.05); projectiles.push({ x: b.x + Math.cos(a) * 1.3, y: b.y + Math.sin(a) * 1.3, z: 0.7, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, dmg: b.d.dmg * 0.4, src: b, kind: 'magma', life: 3, bounces: 1 }); } play('colossus_furnace', 0.8); }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = 0.9; } return; }
    if (b.state === 'charge') { const sp = 7 * fast * dt; const moved = bossMove(b, b.chA, sp); if (!b.didHit && dist < 1.9) { b.didHit = true; run.cause = b.d.name; hurtPlayer(b.d.dmg * 0.9, b.x, b.y, 'melee'); P.shake = Math.max(P.shake, 1.6); }
      if (b.t > 1.2 || moved < sp * 0.3) { if (moved < sp * 0.3) { play('colossus_slam', 0.7, 1.2); P.shake = Math.max(P.shake, 1.2); b.stun = 1.2; } b.state = 'idle'; b.t = 0; b.cd = 1.2; } return; }
    b.cd -= dt;
    if (b.cd <= 0) { b.t = 0; b.didHit = false; if (dist < b.d.range + 1.5) b.state = 'slam'; else if (hasLOS(b.x, b.y, P.x, P.y)) { if (Math.random() < 0.4) { b.state = 'charge'; b.chA = ang; bossWarn(b, 'SMIDESKOLOSSEN RUSAR!'); play('colossus_roar', 0.8); } else b.state = 'furnace'; } else b.cd = 0.5; return; }
    if (b.stun > 0) { b.stun -= dt; return; }
    if (dist > 2.5) bossMove(b, ang, b.d.speed * fast * dt * (b.slow > 0 ? 0.5 : 1));
  },
});
Object.assign(BOSS_SPECIAL, {
  librarian(b, dt, dist, ang, ph) {
    if (b.spK) { // en storm av sidor: en ring av runor som vidgar sig
      if (b.t < 0.05) { bossWarn(b, 'BIBLIOTEKARIEN SLÄPPER LÖS SIDORNA!'); play('librarian_pages', 1); const n = 10 + ph * 3; for (let i = 0; i < n; i++) shootFireball(b, i / n * TAU, 4, b.d.dmg * 0.35, false); }
      if (b.t > 1) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return;
    }
    if (b.t < 0.05) { say('BÖCKERNA VAKNAR', 1.5); play('librarian_laugh', 0.9); for (let i = 0; i < 2 + ph; i++) { const s = freeSpotFar(3, 6); if (s) { const e = makeEnemy(ENEMY_DEFS['Ų'] ? (ph === 3 && i === 0 && ENEMY_DEFS['Ŵ'] ? 'Ŵ' : 'Ų') : 'V', s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 6); } } }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
  colossus(b, dt, dist, ang, ph) {
    if (b.spK) { // ugnen flammar upp: brinnande metall runt honom
      if (b.t < 0.05) { bossWarn(b, 'UGNEN I BRÖSTET FLAMMAR UPP!'); play('colossus_furnace', 1, 0.8); for (let i = 0; i < 8 + ph * 2; i++) { const a = i / (8 + ph * 2) * TAU, r = rnd(1.8, 3.5); const x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r; if (!solid(x, y)) groundFires.push({ x, y, t: 5, acc: 0 }); } }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return;
    }
    if (b.t < 0.05) { say('MASKINERNA VAKNAR', 1.5); play('colossus_roar', 0.9); for (let i = 0; i < 2 + ph; i++) { const s = freeSpotFar(3, 6); if (s) { const e = makeEnemy(ENEMY_DEFS['ſ'] ? (i % 2 ? 'ž' : 'ſ') : 'K', s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 6); } } }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
});
TAUNTS.librarian = ['TYST I SALEN', 'DU ÄR BARA EN FOTNOT', 'DIN HISTORIA SLUTAR HÄR'];
TAUNTS.colossus = ['SMÄLT', 'JAG FORMAR DIG OM', 'HETTAN ÄR MIN'];
Object.assign(PROJ_UPD_V8, { prune: updatePrune });
Object.assign(PROJ_DRAW_V8, { prune: o => drawSprite(fx.fireball[Math.floor(tmr * 14) % fx.fireball.length], o.x, o.y, o.small ? 0.16 : 0.24, o.z - 0.12, false, 1.2, 0, 0, true, [190, 140, 255]) });
// ---------- Version 14: arenarummen – dörrarna låses, vågor kommer, belöning när det är över ----------
let arenas = [], arenaCur = null, arenaPool = [];
const inArena = (a, x, y, m = 0) => x >= a.x0 + m && x < a.x1 + 1 - m && y >= a.y0 + m && y < a.y1 + 1 - m;
function setupV14() {
  arenas = (lvl.arenas || []).filter(a => a && a.doors).map(a => ({ ...a, state: 'idle', wave: 0, waves: a.waves || 2, alive: [], t: 0 })); arenaCur = null;
  const types = new Set(); for (const e of ents) if (!e.dead && !e.boss && !e.minion && !e.elite && !e.dormant && ENEMY_DEFS[e.type] && !ENEMY_DEFS[e.type].boss && !['eel', 'worm', 'mimic', 'tentacle', 'templeguardian', 'blowgunner', 'moleman', 'alligator', 'leech', 'fishman'].includes(e.d.ai)) types.add(e.type); // inget som bara kan finnas i vatten eller under jord, står still eller gömmer sig
  arenaPool = [...types]; if (!arenaPool.length) arenaPool = ['S', 'K'];
}
function arenaClearDoor(d) { // ett arenagaller stängs inte på någon: den som står i öppningen knuffas ut (spelaren in i arenan, fiender ut)
  const a = arenaCur || arenas.find(o => o.doors.some(q => q.x === d.x && q.y === d.y)); if (!a) { d.target = 1; return; }
  const cx = (a.x0 + a.x1 + 1) / 2, cy = (a.y0 + a.y1 + 1) / 2, near = o => Math.abs(o.x - (d.x + 0.5)) < 0.8 && Math.abs(o.y - (d.y + 0.5)) < 0.8;
  const push = (o, inward) => { const ox = d.x + 0.5 - cx, oy = d.y + 0.5 - cy, l = Math.hypot(ox, oy) || 1, s = inward ? -1 : 1;
    for (const r of [1.1, 1.5, 2, 2.6]) for (const da of [0, 0.5, -0.5, 1, -1]) { const ang = Math.atan2(oy * s, ox * s) + da, x = d.x + 0.5 + Math.cos(ang) * r, y = d.y + 0.5 + Math.sin(ang) * r;
      if (freeSpot(x, y, 0.3) && inArena(a, x, y) === inward) { o.x = x; o.y = y; return true; } }
    return false; };
  let stuck = false;
  if (near(P)) stuck = !push(P, true) || stuck;
  for (const e of ents) if (!e.dead && near(e)) { if (e.arena) { if (!push(e, true)) stuck = true; } else if (!push(e, false) && !push(e, true)) stuck = true; }
  if (stuck) d.target = 1; // går inte att flytta – hellre öppet än fast
}
function arenaLock(a, lock) {
  for (const d0 of a.doors) { const key = d0.x + ',' + d0.y; let d = doors[key];
    if (lock) {
      if (!d) { if (isWallChar(map[d0.y][d0.x])) continue; map[d0.y][d0.x] = 'G'; d = doors[key] = { open: 1, target: 0, gate: true, x: d0.x, y: d0.y, temp: true }; }
      d.arena = true; d.target = 0;
    } else if (d) { d.arena = false; d.target = 1; }
  }
  flowCell = -1;
}
function arenaSpawnWave(a) {
  a.wave++; a.alive = []; const n = Math.round(3 + run.depth * 0.5 + a.wave);
  // egen BFS från spelarens ruta inom arenan: fiender ska inte hamna i slutna fickor spelaren inte når
  const reach = new Uint8Array(mw * mh), px = P.x | 0, py = P.y | 0, q = [];
  if (px >= 0 && py >= 0 && px < mw && py < mh) { reach[py * mw + px] = 1; q.push(px, py); }
  for (let h = 0; h < q.length; h += 2) { const cx = q[h], cy = q[h + 1];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy;
      if (nx < a.x0 || nx > a.x1 || ny < a.y0 || ny > a.y1 || reach[ny * mw + nx] || !walkableForEnemy(nx, ny)) continue; reach[ny * mw + nx] = 1; q.push(nx, ny); } }
  let placed = 0;
  for (let pass = 0; pass < 2 && !placed; pass++) for (let i = 0; i < n; i++) { let spot = null; // pass 1: reserv utan nåbarhetskrav om inget gick att placera
    for (let k = 0; k < 60 && !spot; k++) { const x = rnd(a.x0 + 0.5, a.x1 + 0.5), y = rnd(a.y0 + 0.5, a.y1 + 0.5); if (freeSpot(x, y, 0.35) && Math.hypot(x - P.x, y - P.y) > 2.5 && (pass || reach[(y | 0) * mw + (x | 0)])) spot = [x, y]; }
    if (!spot) continue; placed++; const t = arenaPool[(Math.random() * arenaPool.length) | 0], e = makeEnemy(t, spot[0], spot[1]); e.alert = true; e.minion = true; e.arena = true; ents.push(e); totalEnemies++; a.alive.push(e); spawnPuff(spot[0], spot[1], 8);
    for (let j = 0; j < 6; j++) particles.push({ x: spot[0], y: spot[1], z: j * 0.15, vx: 0, vy: 0, vz: 0.5, life: 0.5, maxLife: 0.5, img: fx.hit[1], size: 0.1, add: true, tint: [255, 120, 80] }); }
  play('arena_wave', 0.8); say(`VÅG ${a.wave} AV ${a.waves}`, 1.5); styleAdd(4, '');
}
function updateV14(dt) {
  if (!arenaCur) { for (const a of arenas) if (a.state === 'idle' && inArena(a, P.x, P.y, 1)) { // in i arenan: gallren fälls ned
      a.state = 'fight'; arenaCur = a; arenaLock(a, true); play('arena_lock', 1); P.shake = Math.max(P.shake, 1); say('ARENAN STÄNGS – ÖVERLEV', 2.5); setMusic(true); a.t = 1; firstHint('arena', 'ARENARUM: GALLREN ÖPPNAS NÄR ALLA VÅGOR ÄR DÖDA – DÅ VÄNTAR EN BELÖNING.'); break; }
    return; }
  const a = arenaCur; a.alive = a.alive.filter(e => !e.dead);
  for (const q of a.doors) { const d = doors[q.x + ',' + q.y]; if (d && d.arena && d.target === 1 && !occupied(d)) d.target = 0; } // ett galler som fick stå öppet stängs igen
  if (a.alive.length) { // skydd: en våg som inte går att döda (gömd, fast i en vägg) släpper – men bara om ingen tagit skada på länge
    const hp = a.alive.reduce((t, e) => t + e.hp, 0); if (a.hpSum === undefined || hp < a.hpSum - 0.01 || a.alive.length !== a.nAlive) { a.waveT = 0; a.hpSum = hp; a.nAlive = a.alive.length; } else a.waveT = (a.waveT || 0) + dt;
    if (a.waveT > (a.alive.every(e => e.hidden) ? 25 : 90)) { for (const e of a.alive) { e.hidden = false; e.arena = false; } a.alive = []; a.hpSum = undefined; }
    return; }
  a.waveT = 0; a.hpSum = undefined;
  a.t -= dt; if (a.t > 0) return;
  if (a.wave < a.waves) { arenaSpawnWave(a); a.t = 1.2; return; }
  // klart: gallren går upp och belöningen kommer
  a.state = 'done'; arenaCur = null; arenaLock(a, false); play('arena_clear', 1); say('ARENAN ÄR RENSAD', 2.5); stat('arenas'); styleAdd(20, '+ARENA');
  const cx = (a.x0 + a.x1 + 1) / 2, cy = (a.y0 + a.y1 + 1) / 2;
  items.push({ type: 'cardpick', x: cx, y: cy, taken: false, drop: true, luck: 0.5, title: 'ARENANS BELÖNING' });
  for (let i = 0; i < 4; i++) dropItem('gold', cx, cy); dropItem(Math.random() < 0.5 ? 'health' : 'ammo', cx, cy);
  run.gold += 15 + run.depth * 3;
}
function drawV14Hud(g) {
  if (!arenaCur) return; const a = arenaCur, n = a.alive.filter(e => !e.dead).length, t = `ARENA · VÅG ${a.wave}/${a.waves}` + (n ? ` · ${n} KVAR` : '');
  txt(t, (W - textW(t)) / 2, HL ? HL.row2 : 36, '#ff9060', 1, true, 0.9); // under meddelanderaden
}

// ---------- Version 14: nya invånare i de mellersta och sena biomerna ----------
const AI_V14 = {
  snowwraith(e, dt, dist) { // nästan osynlig tills den är nära eller träffas
    const target = dist < 3 || e.flash > 0 || e.state === 'attack' ? 0.1 : 0.72; e.ghost = (e.ghost ?? 0.7) + (target - (e.ghost ?? 0.7)) * Math.min(1, dt * 4);
    return false;
  },
  lavaworm(e, dt, dist, los) { // under marken, bryter upp och spottar lava, dyker igen
    e.cd = 99; e.phT = (e.phT ?? rnd(0.5, 2)) - dt;
    if (!e.up) { e.hidden = true; e.state = 'move';
      if (dist > 4.2 && dist < 16) { const a = Math.atan2(P.y - e.y, P.x - e.x), sp = 2.2 * dt; tryMove(e, Math.cos(a) * sp, Math.sin(a) * sp, 0.25); }
      if (!settings.lowfx && Math.random() < dt * 12) particles.push({ x: e.x + rnd(-0.3, 0.3), y: e.y + rnd(-0.3, 0.3), z: 0.02, vx: 0, vy: 0, vz: 0.5, life: 0.4, maxLife: 0.4, img: fx.hit[1], size: 0.05, add: true, tint: [255, 120, 40] });
      if (e.phT <= 0 && dist < 9 && e.alert) { e.up = true; e.hidden = false; e.phT = 2.8; e.spit = 0; e.state = 'attack'; e.t = 0; spawnPuff(e.x, e.y, 8); play('lavaworm_emerge', 0.8, 1, { x: e.x, y: e.y }); }
      return true; }
    e.hidden = false; const lt = 2.8 - e.phT;
    if ((lt > 0.6 && e.spit === 0) || (lt > 1.6 && e.spit === 1)) { e.spit++; e.state = 'attack'; e.t = 0; const a = Math.atan2(P.y - e.y, P.x - e.x); for (const s of [-0.15, 0, 0.15]) shootFireball(e, a + s, 6, e.d.dmg, false, 'magma'); play('lava_spit', 0.7, 1, { x: e.x, y: e.y }); }
    if (e.phT <= 0) { e.up = false; e.hidden = true; e.phT = rnd(2.5, 4); spawnPuff(e.x, e.y, 6); play('lavaworm_growl', 0.5, 1, { x: e.x, y: e.y }); }
    if (e.state === 'move') e.state = 'idle';
    return true;
  },
  scarabpriest(e, dt, dist, los) { // väcker skarabéer och förbannar dig med sand
    e.sumT = (e.sumT ?? rnd(3, 5)) - dt; e.curseT = (e.curseT ?? rnd(5, 8)) - dt;
    if (e.sumT <= 0 && los && dist < 11 && e.state !== 'pain' && ENEMY_DEFS['Õ']) { e.sumT = rnd(8, 11); const mine = ents.filter(o => !o.dead && o.owner === e).length;
      if (mine < 5) { e.state = 'attack'; e.t = 0; e.didHit = true; play('scarabpriest', 0.7, 1, { x: e.x, y: e.y }); for (let i = 0; i < 3 && mine + i < 5; i++) { const a = rnd(0, TAU), x = e.x + Math.cos(a) * 0.8, y = e.y + Math.sin(a) * 0.8; if (!freeSpot(x, y, 0.25)) continue; const o = makeEnemy('Õ', x, y); o.alert = true; o.minion = true; o.owner = e; o.d = { ...o.d, score: 10 }; ents.push(o); totalEnemies++; spawnPuff(x, y, 4); } return true; } }
    if (e.curseT <= 0 && los && dist < 10 && e.state !== 'pain') { e.curseT = rnd(9, 12); e.state = 'attack'; e.t = 0; e.didHit = true; P.slowT = Math.max(P.slowT, 2.5); P.sandT = tmr + 3; play('scarab_curse', 0.8); say('SANDEN BINDER DIG', 1.2); return true; }
    return false;
  },
  crystalspider(e, dt, dist, los) { // skjuter kristallnät som saktar ned
    e.cd = 99; e.webT = (e.webT ?? rnd(1.5, 2.5)) - dt;
    if (e.webT <= 0 && los && dist < 10 && e.state !== 'pain') { e.webT = rnd(2.4, 3.2); e.state = 'attack'; e.t = 0; e.didHit = true; const a = Math.atan2(P.y - e.y, P.x - e.x); projectiles.push({ x: e.x + Math.cos(a) * 0.5, y: e.y + Math.sin(a) * 0.5, z: 0.45, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, dmg: e.d.dmg, src: e, kind: 'web', life: 2.5 }); play('web_shot', 0.7, 1, { x: e.x, y: e.y }); return true; }
    return false;
  },
  anglerfish(e, dt, dist, los) { // simmar i djupt vatten, lockar med ljus, drar ned dig
    if (!settings.lowfx && (e.lureT || 0) < tmr) { e.lureT = tmr + 0.12; flashes.push({ x: e.x, y: e.y, t: 0.15, r: 2.8, col: [140, 230, 255] }); }
    const wet = deepAt(e.x, e.y) || cellAt(e.x, e.y) === '-' || cellAt(e.x, e.y) === 'Ĕ'; if (!wet) e.slow = Math.max(e.slow || 0, 0.1);
    if (e.state === 'attack' && e.didHit && dist < 2 && (e.pullCd || 0) < tmr && (P.swim || deepAt(P.x, P.y))) { e.pullCd = tmr + 3; P.pullFrom = { x: e.x, y: e.y }; P.pullT = Math.max(P.pullT || 0, 0.6); play('angler_bite', 0.8, 1, { x: e.x, y: e.y }); }
    if ((e.lureSnd || 0) < tmr && dist < 9) { e.lureSnd = tmr + rnd(5, 8); play('angler_lure', 0.4, 1, { x: e.x, y: e.y }); }
    return false;
  },
  windspirit(e, dt, dist, los) { // blåser dig mot kanten; går bara att skada ordentligt när den fäst sig
    e.anchT = (e.anchT ?? rnd(3, 5)) - dt;
    if (e.anchT <= 0) { e.anchored = !e.anchored; e.anchT = e.anchored ? 2.6 : rnd(4, 5.5); if (e.anchored) { play('windspirit', 0.6, 0.8, { x: e.x, y: e.y }); spawnText(e.x, e.y, 'FÄST!', '#e0f0ff'); } }
    if (e.anchored) { e.slow = Math.max(e.slow || 0, 0.1); e.cd = Math.max(e.cd, 0.5); return false; }
    if (los && dist < 7) { const k = 1.7 * Math.max(0, 1 - mod('windResist')) * dt * (1 - dist / 8); tryMove(P, (P.x - e.x) / (dist || 1) * k, (P.y - e.y) / (dist || 1) * k, 0.24);
      if ((e.howlT || 0) < tmr) { e.howlT = tmr + rnd(3, 5); play('wind_howl', 0.5, 1, { x: e.x, y: e.y }); }
      if (!settings.lowfx && Math.random() < dt * 14) particles.push({ x: e.x + rnd(-0.3, 0.3), y: e.y + rnd(-0.3, 0.3), z: rnd(0.3, 0.9), vx: (P.x - e.x) / (dist || 1) * 5, vy: (P.y - e.y) / (dist || 1) * 5, vz: 0, life: 0.4, maxLife: 0.4, img: fx.parts.wind ? fx.parts.wind[0] : fx.hit[1], size: 0.07, add: true, tint: [230, 240, 255] }); }
    return false;
  },
};
function v14Defend(e, dmg, opt) {
  if (e.d.ai === 'windspirit' && !e.anchored && !opt.exec) { if ((e.windMsg || 0) < tmr) { e.windMsg = tmr + 2; spawnText(e.x, e.y, 'VINDEN', '#e0f0ff'); firstHint('windspirit', 'VINDANDEN TAR NÄSTAN INGEN SKADA – VÄNTA TILLS DEN FÄSTER SIG.'); } return dmg * 0.2; }
  return dmg;
}
function updateWeb(p, dt) { // kristallnätet: saktar ned och spricker
  if (Math.hypot(p.x - P.x, p.y - P.y) < 0.42 && !(P.jz > 0.3)) { p.dead = true; run.cause = p.src && p.src.d ? p.src.d.name : 'NÄTET'; hurtPlayer(p.dmg, p.src ? p.src.x : p.x, p.src ? p.src.y : p.y, 'proj'); P.slowT = Math.max(P.slowT, 2.2 * Math.max(0.2, 1 - mod('webResist'))); play('web_break', 0.7); say('KRISTALLNÄTET SAKTAR DIG', 1); return; }
  if (solid(p.x, p.y) || p.life <= 0) { p.dead = true; play('web_break', 0.3, 1.2, { x: p.x, y: p.y }); }
}
function drawV14Hud2(g) { if ((P.sandT || 0) > tmr) { const k = Math.min(1, (P.sandT - tmr) / 1); g.fillStyle = `rgba(200,170,110,${0.22 * k})`; g.fillRect(0, 0, W, VH); } }
function drawV14World(list) { for (const e of ents) if (e.hidden && !e.dead && e.d.ai === 'lavaworm' && Math.hypot(e.x - P.x, e.y - P.y) < 16) list.push({ x: e.x, y: e.y, k: 'v14', o: e }); }
function drawV14Sprite(s) { const e = s.o, set = enemyFrames[e.type]; if (set && set.burrow) drawSprite(set.burrow[Math.floor(tmr * 6) % set.burrow.length], e.x, e.y, e.d.size * 1.15, 0, false, 1, 0, 0.5); return true; }
Object.assign(PROJ_UPD_V8, { web: updateWeb });
Object.assign(PROJ_DRAW_V8, { web: o => drawSprite(fx.parts.web ? fx.parts.web[0] : fx.hit[1], o.x, o.y, 0.22, o.z - 0.11, false, 1, 0, 0.5, false, [230, 190, 255]) });
// ---------- Version 15: rökelsekaret och bikastaren ----------
function censerSwing(wp) { // rökelsekaret: ett varv runt dig som träffar allt, röken läker
  if (WS.cd > 0 || WS.state !== 'idle') return;
  WS.shot = 0; WS.cd = effDelay(wp) * (up('cs_fast') ? 0.7 : 1); WS.kick = 0.3; lvlStat.shots++; play('censer_swing', 0.8, rnd(0.9, 1.1)); noise(3);
  const reach = (up('cs_reach') ? 3 : 2.2) + mod('whipReach') * 0.5; let hits = 0;
  for (const e of ents) {
    if (e.dead || e.dying || e.hidden || e.dormant) continue;
    const d = Math.hypot(e.x - P.x, e.y - P.y); if (d > reach + e.d.size * 0.3) continue;
    const k = hurtEnemy(e, wp.dmg * meleeMul() * (1 + mod('holyDmg') * (P.blessT > tmr ? 1 : 0)), e.x, e.y, { melee: true }); hits++; hitKill = hitKill || k;
    if (!e.dead && up('cs_fire')) e.burn = Math.max(e.burn || 0, 3);
    if (!e.dead && !e.boss) { const dx = e.x - P.x, dy = e.y - P.y; for (let i = 0; i < 4; i++) tryMove(e, dx / (d || 1) * 0.12, dy / (d || 1) * 0.12, 0.28); }
  }
  if (hits) { heal(Math.min(6, hits) * ((up('cs_heal') ? 2 : 1) + mod('censerHeal')), true); hitMark = 0.1; hitStop = Math.max(hitStop, 0.04); lvlStat.hits++; play('censer_hit', 0.6, rnd(0.9, 1.1)); }
  for (let i = 0; i < 20; i++) { const a = P.a + i / 20 * TAU, r = reach * rnd(0.5, 1); particles.push({ x: P.x + Math.cos(a) * r, y: P.y + Math.sin(a) * r, z: rnd(0.3, 0.6), vx: -Math.sin(a) * 2, vy: Math.cos(a) * 2, vz: 0.2, life: 0.6, maxLife: 0.6, img: (fx.parts.smoke3 || fx.parts.smoke) ? (fx.parts.smoke3 || fx.parts.smoke)[i % (fx.parts.smoke3 || fx.parts.smoke).length] : fx.hit[1], size: 0.12, tint: fx.parts.smoke3 ? null : [220, 210, 190] }); }
}
function beeFire(wp, base) { // bikastaren: bin som söker upp fiender och sticker flera gånger
  const n = up('hl_swarm') ? 5 : 3;
  for (let i = 0; i < n; i++) { const a = P.a + (i - (n - 1) / 2) * 0.18 + rnd(-0.05, 0.05), queen = up('hl_queen') && i === 0 && Math.random() < 0.3;
    projectiles.push({ x: P.x + Math.cos(a) * 0.4, y: P.y + Math.sin(a) * 0.4, z: 0.5, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, dmg: base * (1 + mod('beeDmg')) / 2 * (queen ? 3 : 1), friendly: true, kind: 'pbee', life: 4, stings: 3, cd: 0, queen }); }
  play('bee_buzz', 0.6, rnd(0.95, 1.1)); noise(3);
  if (up('hl_fast')) WS.cd *= 0.7;
}
function updatePbee(p, dt) {
  p.cd -= dt;
  let best = null, bd = 10; for (const e of ents) { if (e.dead || e.dying || e.hidden || e.dormant) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { best = e; bd = d; } }
  const sp = 7, wob = Math.sin(tmr * 20 + p.x * 3) * 0.6;
  if (best) { const a = Math.atan2(best.y - p.y, best.x - p.x) + wob; p.vx += (Math.cos(a) * sp - p.vx) * Math.min(1, dt * 5); p.vy += (Math.sin(a) * sp - p.vy) * Math.min(1, dt * 5); }
  if (solid(p.x, p.y)) { p.x -= p.vx * dt; p.y -= p.vy * dt; p.vx = -p.vx * 0.5; p.vy = -p.vy * 0.5; }
  if (best && bd < 0.4 * best.d.size * (best.boss ? 1.8 : 1) && p.cd <= 0) { p.cd = 0.4; p.stings--; const k = hurtEnemy(best, p.dmg, p.x, p.y, { noProc: p.stings < 2 }); hitMark = 0.08; hitKill = hitKill || k; play('bee_sting', 0.4, rnd(1, 1.3), { x: p.x, y: p.y }); if (up('hl_poison') && !best.dead) best.poison = Math.max(best.poison || 0, 3); if (p.stings <= 0) p.dead = true; }
  if (p.life <= 0) p.dead = true;
}
function weaponV15Tick(wp, dt) { if (wp.censer || wp.hivelauncher) WS.aim = 0; }

// ---------- Version 15: ljusstråk, honung, blodfuntar, klockor och larvsäckar ----------
let honeyPuddles = [];
const honeyAt = (x, y) => (map[y | 0] && map[y | 0][x | 0] === 'Ɩ') || honeyPuddles.some(h => Math.hypot(h.x - x, h.y - y) < 0.8);
function setupV15() { honeyPuddles = []; P.blessT = 0; P.honeyT = 0; for (const pr of props) { if (pr.ch === 'Ə') pr.hp = 30; if (pr.ch === 'Ɨ') pr.hatched = false; } }
function updateV15(dt) {
  const c = cellUnder();
  // ljusstråket välsignar
  if (c === 'ƍ' && P.jz < 0.3) { if (!(P.blessT > tmr)) { play('bless_beam', 0.6); spawnText(P.x + Math.cos(P.a), P.y + Math.sin(P.a), 'VÄLSIGNAD', '#ffe9a8'); firstHint('bless', 'LJUSSTRÅKEN VÄLSIGNAR DIG: MER SKADA EN STUND.'); } P.blessT = tmr + 6 * (1 + mod('blessDur')); }
  // honung klibbar
  for (const h of honeyPuddles) h.t -= dt; honeyPuddles = honeyPuddles.filter(h => h.t > 0);
  if (honeyAt(P.x, P.y) && P.jz < 0.1) { if (!(P.honeyT > 0.2)) firstHint('honey', 'HONUNGEN KLIBBAR – HOPPA ÖVER DEN.'); P.honeyT = 0.35; } P.honeyT = Math.max(0, (P.honeyT || 0) - dt);
  for (const e of ents) if (!e.dead && !e.d.float && e.d.ai !== 'workerbee' && e.d.ai !== 'larva' && honeyAt(e.x, e.y)) e.slow = Math.max(e.slow || 0, 0.2);
  // blodfuntarna läker fiender omkring sig
  for (const pr of props) {
    if (pr.ch === 'Ə' && !pr.used) { pr.fT = (pr.fT || 0) - dt; if (pr.fT <= 0) { pr.fT = 0.5; for (const e of ents) if (!e.dead && !e.boss && e.hp < e.maxHp && Math.hypot(e.x - pr.x, e.y - pr.y) < 4) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.05); if (!settings.lowfx) for (let i = 0; i < 3; i++) particles.push({ x: pr.x, y: pr.y, z: 0.6, vx: (e.x - pr.x) * 2, vy: (e.y - pr.y) * 2, vz: 0.3, life: 0.5, maxLife: 0.5, img: fx.hit[1], size: 0.05, add: true, tint: [255, 40, 40] }); firstHint('font', 'BLODFUNTEN LÄKER FIENDERNA – SLÅ SÖNDER DEN MED E.'); } } }
    if (pr.ch === 'Ɨ' && !pr.hatched && !pr.used && Math.hypot(P.x - pr.x, P.y - pr.y) < 3 && hasLOS(P.x, P.y, pr.x, pr.y)) larvaHatch(pr);
  }
}
function larvaHatch(pr) { // larvsäcken kläcks
  pr.hatched = true; pr.used = true; pr.img = pr.frames[1] || pr.img; play('larva_hatch', 0.8, 1, { x: pr.x, y: pr.y }); spawnPuff(pr.x, pr.y, 8);
  const n = 2 + (Math.random() < 0.4 ? 1 : 0); for (let i = 0; i < n; i++) { const a = rnd(0, TAU), x = pr.x + Math.cos(a) * 0.9, y = pr.y + Math.sin(a) * 0.9; if (!freeSpot(x, y, 0.25)) continue; const e = makeEnemy(ENEMY_DEFS['ƚ'] ? 'ƚ' : 'L', x, y); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; }
}
function drawV15Hud(g) {
  if (P.blessT > tmr) { const k = Math.min(1, (P.blessT - tmr) / 1.5); g.fillStyle = `rgba(255,230,160,${0.07 * k})`; g.fillRect(0, 0, W, VH); if (hudImg.icon_bless) g.drawImage(hudImg.icon_bless, 26, VH - 22, 8, 8); }
  if (P.honeyT > 0) { g.fillStyle = 'rgba(230,170,40,0.12)'; g.fillRect(0, VH - 30, W, 30); if (hudImg.icon_honey) g.drawImage(hudImg.icon_honey, 38, VH - 22, 8, 8); }
}
const v15Slow = () => (P.honeyT > 0 ? Math.max(0.35, 0.45 + mod('honeyResist') * 0.5) : 1);
function v15Dmg(e, dmg, opt) { if (P.blessT > tmr && !opt.infight) dmg *= 1.3 + mod('holyDmg'); if (e.d.ai === 'larva' && mod('larvaDmg')) dmg *= 1 + mod('larvaDmg'); return dmg; }
Object.assign(USES, {
  bell(pr) { // klockan: bedövar fiender omkring dig, men väcker hela våningen
    pr.used = true; pr.img = pr.frames[1] || pr.img; play('bell_ring', 1); P.shake = Math.max(P.shake, 0.6); stat('bells');
    for (const e of ents) { if (e.dead || e.boss) continue; const d = Math.hypot(e.x - pr.x, e.y - pr.y); if (d < 6) { e.stun = Math.max(e.stun || 0, 2.5 + mod('bellStun')); spawnText(e.x, e.y, 'BEDÖVAD', '#ffe9a8'); } else { e.alert = true; e.sleep = false; } }
    say('KLOCKAN RINGER – HELA VÅNINGEN HÖR DEN', 2);
  },
  bloodfont(pr) { // slå sönder blodfunten
    pr.used = true; pr.img = pr.frames[1] || pr.img; play('font_break', 0.9); spawnPuff(pr.x, pr.y, 10); for (let i = 0; i < 8; i++) spawnBlood(pr.x, pr.y); stat('fonts');
    if (mod('fontBreak') > 0) overheal(mod('fontBreak')); say('BLODFUNTEN ÄR SÖNDER', 1.5); styleAdd(6, '+HELGERÅN');
  },
  larvasac(pr) { pr.used = true; pr.hatched = true; pr.img = pr.frames[1] || pr.img; play('larva_squish', 0.8); spawnPuff(pr.x, pr.y, 6); say('LARVSÄCKEN ÄR KROSSAD', 1.2); styleAdd(3, ''); },
});

// ---------- Version 15: katedralens och bikupans invånare ----------
const AI_V15 = {
  choirboy(e, dt, dist, los) { // sjunger: läker och skyddar fienderna omkring sig
    e.singT = (e.singT ?? rnd(2, 4)) - dt;
    if (e.singT <= 0 && e.state !== 'pain') { e.singT = rnd(4.5, 6); let n = 0; for (const o of ents) if (!o.dead && o !== e && !o.boss && Math.hypot(o.x - e.x, o.y - e.y) < 5) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.2); o.eshieldMax = Math.max(o.eshieldMax || 0, 4); o.eshield = Math.max(o.eshield || 0, 4); n++; }
      if (n) { e.state = 'attack'; e.t = 0; e.didHit = true; play('choirboy', 0.7, 1, { x: e.x, y: e.y }); spawnText(e.x, e.y, '♪', '#ffe9a8'); if (fx.parts.note2 && !settings.lowfx) for (let i = 0; i < 6; i++) particles.push({ x: e.x + rnd(-0.3, 0.3), y: e.y + rnd(-0.3, 0.3), z: 0.7, vx: rnd(-0.4, 0.4), vy: rnd(-0.4, 0.4), vz: rnd(0.3, 0.7), life: 1.2, maxLife: 1.2, img: fx.parts.note2[i % 2], size: 0.1 }); firstHint('choir', 'KORGOSSEN LÄKER OCH SKYDDAR DE ANDRA – DÖDA HONOM FÖRST.'); return true; } }
    return false;
  },
  flagellant(e, dt) { // blir snabbare och farligare ju mer skadad den är
    const k = 1 - e.hp / e.maxHp; if (k > 0.35) e.haste = Math.max(e.haste || 0, 0.2);
    e.whipT = (e.whipT ?? rnd(3, 5)) - dt; if (e.whipT <= 0) { e.whipT = rnd(4, 6); if (e.hp > 2) { e.hp -= 1; e.haste = Math.max(e.haste || 0, 2); spawnText(e.x, e.y, 'BOT', '#ff6050'); play('flagellant', 0.6, 1, { x: e.x, y: e.y }); } }
    return false;
  },
  cherub(e, dt, dist, los) { // skriker så att siktet hoppar
    e.cd = 99; e.shriekT = (e.shriekT ?? rnd(2, 4)) - dt;
    if (e.shriekT <= 0 && los && dist < 8 && e.state !== 'pain') { e.shriekT = rnd(5, 7); e.state = 'attack'; e.t = 0; e.didHit = true; P.confT = Math.max(P.confT || 0, 1.4); hurtPlayer(e.d.dmg * 0.5, e.x, e.y, 'proj'); play('cherub_shriek', 0.8, 1, { x: e.x, y: e.y }); P.shake = Math.max(P.shake, 0.8); return true; }
    return false;
  },
  workerbee(e, dt, dist, los) { if (e.state === 'move' && los && dist < 6) { const a = Math.atan2(P.y - e.y, P.x - e.x) + Math.PI / 2, s = Math.sin(e.t * 9 + e.x * 5) * dt * 2; tryMove(e, Math.cos(a) * s, Math.sin(a) * s, 0.2); } return false; },
  stingerknight(e, dt, dist, los) { // rusar med gadden
    e.dashT = (e.dashT ?? rnd(2, 3)) - dt;
    if (e.dash) { e.dash.t -= dt; const sp = 8 * dt; tryMove(e, Math.cos(e.dash.a) * sp, Math.sin(e.dash.a) * sp, 0.3); e.state = 'attack';
      if (!e.dash.hit && dist < 1.2) { e.dash.hit = true; run.cause = e.d.name; hurtPlayer(e.d.dmg, e.x, e.y, 'melee'); P.poisonT = Math.max(P.poisonT || 0, 3); play('bee_sting', 0.8, 0.7); }
      if (e.dash.t <= 0) e.dash = null; return true; }
    if (e.dashT <= 0 && los && dist > 2.2 && dist < 6.5 && e.state !== 'pain') { e.dashT = rnd(3.5, 5); e.dash = { a: Math.atan2(P.y - e.y, P.x - e.x), t: Math.min(0.75, dist / 8 + 0.1), hit: false }; play('stingerknight', 0.8, 1, { x: e.x, y: e.y }); return true; }
    return false;
  },
  larva(e, dt, dist, los) { // spottar syra
    e.cd = 99; e.spitT = (e.spitT ?? rnd(2, 3.5)) - dt;
    if (e.spitT <= 0 && los && dist < 8 && e.state !== 'pain') { e.spitT = rnd(3, 4); e.state = 'attack'; e.t = 0; e.didHit = true; const a = Math.atan2(P.y - e.y, P.x - e.x); projectiles.push({ x: e.x + Math.cos(a) * 0.4, y: e.y + Math.sin(a) * 0.4, z: 0.3, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, dmg: e.d.dmg, src: e, kind: 'acid', life: 2.4 }); play('larva_spit', 0.6, 1, { x: e.x, y: e.y }); return true; }
    return false;
  },
};
function updateAcid(p, dt) {
  if (Math.hypot(p.x - P.x, p.y - P.y) < 0.4 && !(P.jz > 0.25)) { p.dead = true; run.cause = p.src && p.src.d ? p.src.d.name : 'SYRA'; hurtPlayer(p.dmg, p.src ? p.src.x : p.x, p.src ? p.src.y : p.y, 'proj'); P.poisonT = Math.max(P.poisonT || 0, 2.5); return; }
  if (solid(p.x, p.y) || p.life <= 0) { p.dead = true; if (Math.random() < 0.5) sporeCloud(p.x - p.vx * dt * 1.5, p.y - p.vy * dt * 1.5); }
}
function v15Kill(e) {
  if (e.d.ai === 'flagellant' || e.d.ai === 'choirboy' || e.d.ai === 'cherub') { /* katedralens folk */ }
  if (e.d.ai === 'larva' && Math.random() < 0.4) sporeCloud(e.x, e.y);
}

