// ---------- Version 15: Kardinalen och Bidrottningen ----------
Object.assign(BOSS_AI, {
  cardinal(b, dt, dist, ang, ph) { // heligt ljus slår ned, eldringar från rökelsekaret och blodets kraft
    const fast = ph === 3 ? 1.3 : 1;
    if (b.state === 'light') { if (b.t < 0.05) { bossWarn(b, 'HIMLEN DÖMER DIG!'); play('cardinal_chant', 0.9); for (let i = 0; i < 3 + ph * 2; i++) setTimeout(() => { if (!b.dead && state === 'play') lightningAt(P.x + rnd(-2.2, 2.2), P.y + rnd(-2.2, 2.2), 0.9, b.d.dmg * 0.7); }, i * 260); }
      if (b.t > 1.5) { b.state = 'idle'; b.t = 0; b.cd = rnd(1.1, 1.6) / fast; } return; }
    if (b.state === 'ring') { if (!b.didHit && b.t > 0.5) { b.didHit = true; play('censer_swing', 1, 0.7); waves.push({ x: b.x, y: b.y, r: 0.5, sp: 5.5 + ph, dmg: b.d.dmg * 0.55, hit: false }); if (ph >= 2) setTimeout(() => { if (!b.dead && state === 'play') waves.push({ x: b.x, y: b.y, r: 0.5, sp: 5.5 + ph, dmg: b.d.dmg * 0.55, hit: false }); }, 500); }
      if (b.t > 1.1) { b.state = 'idle'; b.t = 0; b.cd = 1; } return; }
    b.cd -= dt;
    if (b.cd <= 0) { b.t = 0; b.didHit = false; b.state = dist < 4.5 ? 'ring' : hasLOS(b.x, b.y, P.x, P.y) ? (Math.random() < 0.5 ? 'light' : 'ring') : 'idle'; if (b.state === 'idle') b.cd = 0.5; return; }
    if (dist > 5) bossMove(b, ang, b.d.speed * fast * dt); else if (dist < 3) bossMove(b, ang + Math.PI, b.d.speed * dt * 0.7);
  },
  queenbee(b, dt, dist, ang, ph) { // svärmar, honung och en rusning med gadden
    const fast = ph === 3 ? 1.3 : 1;
    if (b.state === 'dash') { const sp = 9 * fast * dt, moved = bossMove(b, b.dA, sp); if (!b.didHit && dist < 2) { b.didHit = true; run.cause = b.d.name; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); P.poisonT = Math.max(P.poisonT || 0, 4); }
      if (b.t > 0.9 || moved < sp * 0.3) { b.state = 'idle'; b.t = 0; b.cd = rnd(1, 1.5) / fast; } return; }
    if (b.state === 'honey') { if (b.t < 0.05) { bossWarn(b, 'HONUNGEN RINNER!'); play('honey_splash', 0.9); for (let i = 0; i < 5 + ph * 2; i++) { const a = rnd(0, TAU), r = rnd(0.5, 3.5); const x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r; if (!solid(x, y)) { honeyPuddles.push({ x, y, t: 8 }); if (fx.parts.honey && !settings.lowfx) for (let j = 0; j < 3; j++) particles.push({ x, y, z: 0.6, vx: rnd(-0.5, 0.5), vy: rnd(-0.5, 0.5), vz: rnd(0.5, 1), life: 0.7, maxLife: 0.7, img: fx.parts.honey[j % 2], size: 0.07 }); } } }
      if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return; }
    b.cd -= dt;
    if (b.cd <= 0 && hasLOS(b.x, b.y, P.x, P.y)) { b.t = 0; b.didHit = false; if (Math.random() < 0.45) { b.state = 'dash'; b.dA = ang; play('queenbee_buzz', 0.9); bossWarn(b, 'BIDROTTNINGEN RUSAR!'); } else b.state = 'honey'; return; }
    if (dist > 5) bossMove(b, ang, b.d.speed * fast * dt); else bossMove(b, ang + Math.PI / 2, b.d.speed * dt * 0.9);
  },
});
Object.assign(BOSS_SPECIAL, {
  cardinal(b, dt, dist, ang, ph) {
    if (b.spK) { // blodmässan: två ringar av eld
      if (b.t < 0.05 || (ph >= 2 && Math.abs(b.t - 0.5) < dt)) { if (b.t < 0.05) bossWarn(b, 'BLODMÄSSAN BÖRJAR!'); play('cardinal_chant', 1, 0.8); const n = 12 + ph * 2, off = b.t < 0.05 ? 0 : Math.PI / n; for (let i = 0; i < n; i++) shootFireball(b, i / n * TAU + off, 4.2, b.d.dmg * 0.35, false); }
      if (b.t > 1.1) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return;
    }
    if (b.t < 0.05) { say('KÖREN SJUNGER', 1.5); play('cardinal_laugh', 0.9); for (let i = 0; i < 2 + ph; i++) { const s = freeSpotFar(3, 6); if (s) { const e = makeEnemy(ENEMY_DEFS['Ƒ'] ? (i % 2 ? 'ƒ' : 'Ƒ') : 'S', s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 6); } } }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
  queenbee(b, dt, dist, ang, ph) {
    if (b.spK) { // larverna: bidrottningen lägger ägg som kläcks
      if (b.t < 0.05) { bossWarn(b, 'BIDROTTNINGEN LÄGGER ÄGG!'); play('larva_hatch', 1, 0.8); for (let i = 0; i < 1 + ph; i++) { const s = freeSpotFar(2.5, 5); if (s) { const e = makeEnemy(ENEMY_DEFS['ƚ'] ? 'ƚ' : 'L', s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 6); } } }
      if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return;
    }
    if (b.t < 0.05) { say('SVÄRMEN KOMMER', 1.5); play('queenbee_buzz', 1, 1.2); for (let i = 0; i < 3 + ph * 2; i++) { const s = freeSpotFar(2.5, 6); if (s) { const e = makeEnemy(ENEMY_DEFS['Ƙ'] ? 'Ƙ' : 'V', s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; } } }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
});
TAUNTS.cardinal = ['KNÄFALL', 'DIN SJÄL ÄR MIN TIONDE', 'BÖN HJÄLPER INTE HÄR'];
TAUNTS.queenbee = ['SVÄRMEN ÄR JAG', 'DU KLIBBAR FAST', 'MINA BARN ÄR HUNGRIGA'];
function drawV15World(list) { for (const h of honeyPuddles) if (Math.hypot(h.x - P.x, h.y - P.y) < 16) list.push({ x: h.x, y: h.y, k: 'v15', o: h }); }
function drawV15Sprite(s) { const o = s.o, f = fx.props.inkblot; drawSprite(f ? f[1 % f.length] : fx.hit[1], o.x, o.y, 0.9, -0.42, false, null, 0, 0.3, false, [240, 170, 40], Math.max(0.2, 1 - o.t / 8)); return true; }
Object.assign(PROJ_UPD_V8, { pbee: updatePbee, acid: updateAcid });
Object.assign(PROJ_DRAW_V8, {
  pbee: o => drawSprite(enemyFrames['Ƙ'] && enemyFrames['Ƙ'].move ? enemyFrames['Ƙ'].move[Math.floor(tmr * 14) % enemyFrames['Ƙ'].move.length] : fx.hit[1], o.x, o.y, o.queen ? 0.34 : 0.2, o.z - 0.1, o.vx < 0, null, 0, 0.6),
  acid: o => drawSprite(fx.fireball[Math.floor(tmr * 12) % fx.fireball.length], o.x, o.y, 0.18, o.z - 0.09, false, 1, 0, 0, true, [140, 255, 90]),
});
// ---------- Version 16: trädgårdssaxen och drömstaven ----------
function shearSnip(wp) { // saxen: två (tre) snabba klipp framåt
  if (WS.cd > 0 || WS.state !== 'idle' || P.shearOut) return;
  WS.shot = 0; WS.cd = effDelay(wp) * (up('sh_fast') ? 0.7 : 1); WS.kick = 0.2; lvlStat.shots++; noise(2);
  const n = up('sh_triple') ? 3 : 2;
  for (let i = 0; i < n; i++) setTimeout(() => { if (state !== 'play') return; play('shears_snip', 0.7, rnd(0.95, 1.15)); let hits = 0;
    for (const e of ents) { if (e.dead || e.dying || e.hidden || e.dormant) continue; const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
      if (d > 1.7 + e.d.size * 0.3 + mod('whipReach') * 0.5 || Math.abs(off) > 0.6) continue;
      const k = hurtEnemy(e, wp.dmg * meleeMul() * (1 + mod('shearDmg')), e.x, e.y, { melee: true }); hits++; hitKill = hitKill || k; if (!e.dead && up('sh_bleed')) e.bleed = Math.max(e.bleed || 0, 4); }
    if (hits) { hitMark = 0.08; lvlStat.hits++; play('shears_hit', 0.6, rnd(0.9, 1.1)); } }, i * 120);
}
function shearThrow(wp) { // högerklick: saxen kastas och kommer tillbaka
  if (P.shearOut || (P.shearCd || 0) > tmr) return; P.shearOut = true; P.shearCd = tmr + 0.4; WS.shearT = 0.4; play('shears_throw', 0.8);
  projectiles.push({ x: P.x + Math.cos(P.a) * 0.4, y: P.y + Math.sin(P.a) * 0.4, z: 0.5, vx: Math.cos(P.a) * 12, vy: Math.sin(P.a) * 12, dmg: wp.dmg * meleeMul() * (up('sh_throw') ? 2.2 : 1.4) * (1 + mod('shearDmg')), friendly: true, kind: 'pshears', life: 3, out: 0.45, hit: new Set() });
}
function updatePshears(p, dt) {
  p.out -= dt; if (p.out <= 0 || solid(p.x, p.y)) { if (!p.back) { p.back = true; p.hit = new Set(); } }
  if (p.back) { const dx = P.x - p.x, dy = P.y - p.y, d = Math.hypot(dx, dy) || 1; p.vx = dx / d * 13; p.vy = dy / d * 13; if (d < 0.6 || p.life <= 0) { p.dead = true; P.shearOut = false; play('shears_catch', 0.6); return; } }
  for (const e of ents) { if (e.dead || e.dying || e.hidden || p.hit.has(e) || Math.hypot(e.x - p.x, e.y - p.y) > 0.4 * e.d.size * (e.boss ? 1.8 : 1)) continue; p.hit.add(e); const k = hurtEnemy(e, p.dmg, p.x, p.y, {}); hitMark = 0.1; hitKill = hitKill || k; play('shears_hit', 0.5, 1.2, { x: p.x, y: p.y }); if (!e.dead && up('sh_bleed')) e.bleed = Math.max(e.bleed || 0, 4); }
}
function dreamFire(wp, base) { // drömstaven: en långsam stjärna som saktar ned allt och exploderar i sömn
  const sp = up('ds_fast') ? 6 : 4.2;
  projectiles.push({ x: P.x + Math.cos(P.a) * 0.5, y: P.y + Math.sin(P.a) * 0.5, z: 0.5, vx: Math.cos(P.a) * sp, vy: Math.sin(P.a) * sp, dmg: base * (1 + mod('dreamDmg')), friendly: true, kind: 'dstar', life: 2.2 });
  noise(2);
}
function updateDstar(p, dt) {
  const R = up('ds_slow') ? 1.8 : 1.2;
  for (const e of ents) if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < R) e.slow = Math.max(e.slow || 0, 0.4);
  if (!settings.lowfx && Math.random() < dt * 25) particles.push({ x: p.x, y: p.y, z: p.z, vx: rnd(-0.4, 0.4), vy: rnd(-0.4, 0.4), vz: rnd(-0.2, 0.2), life: 0.5, maxLife: 0.5, img: fx.hit[1], size: 0.04, add: true, tint: [200, 170, 255] });
  const hit = ents.find(e => !e.dead && !e.dying && !e.hidden && !e.dormant && Math.hypot(e.x - p.x, e.y - p.y) < 0.4 * e.d.size * (e.boss ? 1.8 : 1));
  if (hit || solid(p.x, p.y) || p.life <= 0) { p.dead = true; dreamBurst(solid(p.x, p.y) ? p.x - p.vx * dt * 2 : p.x, solid(p.x, p.y) ? p.y - p.vy * dt * 2 : p.y, p.dmg, !p.small); }
}
function dreamBurst(x, y, dmg, big) {
  play('dream_burst', 0.8, big ? 1 : 1.3, { x, y }); flashes.push({ x, y, t: 0.2, r: 4, col: [200, 160, 255] });
  for (const e of ents) { if (e.dead || e.dying) continue; const d = Math.hypot(e.x - x, e.y - y); if (d > 2.2) continue; const k = hurtEnemy(e, dmg * (1 - d / 3), e.x, e.y, { boom: true }); hitKill = hitKill || k; if (!e.dead && !e.boss) { e.stun = Math.max(e.stun || 0, up('ds_sleep') ? 4 : 2.5); spawnText(e.x, e.y, 'Zzz', '#d0b0ff'); } }
  for (let i = 0; i < 14; i++) { const a = rnd(0, TAU), s = rnd(0.5, 2.5); particles.push({ x, y, z: rnd(0.2, 0.8), vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rnd(0, 0.6), life: 0.8, maxLife: 0.8, img: fx.hit[1], size: 0.06, add: true, tint: [210, 180, 255] }); }
  if (big && up('ds_split')) for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + rnd(-0.3, 0.3); projectiles.push({ x, y, z: 0.5, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4, dmg: dmg * 0.4, friendly: true, kind: 'dstar', life: 0.8, small: true }); }
}
function weaponV16Tick(wp, dt) {
  if (wp.shears && aimDown && !WS.shAim) { WS.shAim = true; shearThrow(wp); }
  if (!aimDown) WS.shAim = false;
  if (wp.shears || wp.dreamstaff) WS.aim = 0;
}

// ---------- Version 16: taggrankor, sömnens dimma, glidande väggar, fontäner och falska dörrar ----------
let shifts = [];
function setupV16() {
  shifts = []; P.mistT = 0; P.shearOut = false;
  if (lvl.shifts && lvl.shifts.length) for (const s of lvl.shifts) shifts.push({ x: s.x, y: s.y, ph: s.ph || 0, up: true });
  else for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (map[y][x] === 'ƣ') shifts.push({ x, y, ph: ((x * 7 + y * 3) % 40) / 10, up: true });
}
function updateV16(dt) {
  // glidande väggar: uppe 2 s, nere 2 s
  for (const s of shifts) {
    const want = ((levelTime + s.ph) % 4) < 2 * Math.max(0.4, 1 - mod('shiftSense')); // kortet shiftSense: väggarna står uppe kortare
    if (want === s.up) continue;
    if (want && (Math.hypot(P.x - s.x - 0.5, P.y - s.y - 0.5) < 0.9 || ents.some(e => !e.dead && Math.hypot(e.x - s.x - 0.5, e.y - s.y - 0.5) < 0.8) || items.some(it => !it.taken && (it.x | 0) === s.x && (it.y | 0) === s.y))) continue; // stänger inte på någon
    s.up = want; map[s.y][s.x] = want ? 'ƣ' : '.'; flowCell = -1;
    if (Math.hypot(P.x - s.x, P.y - s.y) < 10) play('wall_shift', 0.4, rnd(0.9, 1.1), { x: s.x + 0.5, y: s.y + 0.5 });
  }
  const c = cellUnder();
  // taggrankor river och saktar ned
  P.thornAcc = (P.thornAcc || 0) + dt;
  if (c === 'ƥ' && P.jz < 0.15) { P.thornSlow = 0.3; if (P.thornAcc > 0.5) { P.thornAcc = 0; const k = Math.max(0, 1 - mod('thornResist')); if (k > 0) { run.cause = 'TAGGRANKORNA'; hurtPlayer(3 * k * trapMul()); firstHint('thorns', 'TAGGRANKORNA RIVER – HOPPA ÖVER ELLER BRÄNN BORT DEM.'); } } }
  P.thornSlow = Math.max(0, (P.thornSlow || 0) - dt);
  // eld bränner bort taggrankor (eldkastaren, brinnande mark och explosioner i närheten)
  if (WEAPONS[P.weapon].flame && WS.shot < 0.1) for (let r = 1; r <= 4; r++) burnThorns(P.x + Math.cos(P.a) * r, P.y + Math.sin(P.a) * r);
  for (const f of groundFires) burnThorns(f.x, f.y);
  // sömnens dimma
  if (c === 'Ʀ' && P.jz < 0.2) { if (!(P.mistT > 0.3)) { play('mist_whisper', 0.5); firstHint('mist', 'SÖMNENS DIMMA: FIENDERNA FÖRSVINNER PÅ AVSTÅND OCH DU BLIR DÅSIG.'); } P.mistT = Math.max(P.mistT || 0, 1.5 * Math.max(0.2, 1 - mod('sleepResist'))); }
  P.mistT = Math.max(0, (P.mistT || 0) - dt);
  if (P.mistT > 0) { const vis = 4 * (1 + mod('mistSight')); for (const e of ents) if (!e.dead && !e.boss) { const d = Math.hypot(e.x - P.x, e.y - P.y); if (d > vis) e.ghost = Math.max(e.ghost || 0, 0.92); else if (e.d.ai !== 'snowwraith' && e.d.ai !== 'stalker') e.ghost = Math.min(e.ghost || 0, 0.2); } }
}
function burnThorns(x, y) { v19Ignite(x, y); v21BurnNet(x, y); v22Ignite(x, y); const cx = x | 0, cy = y | 0; if (map[cy] && map[cy][cx] === 'ȃ') { map[cy][cx] = '.'; if (cellFloor) cellFloor[cy * mw + cx] = lvl.floorMask ? (+lvl.floorMask[cy][cx] || 0) : 0; spawnPuff(cx + 0.5, cy + 0.5, 4); if ((P.burnSndT || 0) < tmr) { P.burnSndT = tmr + 0.3; play('thorn_burn', 0.5, 1, { x: cx + 0.5, y: cy + 0.5 }); } flowCell = -1; return; } // lianerna brinner som taggrankorna
  if (map[cy] && map[cy][cx] === 'ƥ') { map[cy][cx] = '.'; if (cellFloor) cellFloor[cy * mw + cx] = lvl.floorMask ? (+lvl.floorMask[cy][cx] || 0) : 0; spawnPuff(cx + 0.5, cy + 0.5, 4); if (fx.parts.petal && !settings.lowfx) for (let i = 0; i < 4; i++) particles.push({ x: cx + 0.5 + rnd(-0.3, 0.3), y: cy + 0.5 + rnd(-0.3, 0.3), z: 0.2, vx: rnd(-0.4, 0.4), vy: rnd(-0.4, 0.4), vz: rnd(0.4, 0.9), life: 1, maxLife: 1, img: fx.parts.petal[i % 2], size: 0.08 }); if ((P.burnSndT || 0) < tmr) { P.burnSndT = tmr + 0.3; play('thorn_burn', 0.5, 1, { x: cx + 0.5, y: cy + 0.5 }); } stat('thornsBurnt'); } }
const v16Slow = () => (P.thornSlow > 0 ? 0.7 : 1) * (P.mistT > 0 ? 0.85 : 1);
function drawV16Hud(g) { if (P.mistT > 0) { const k = Math.min(1, P.mistT / 1), gr = g.createRadialGradient(W / 2, HORIZON, VH * 0.25, W / 2, HORIZON, W * 0.6); gr.addColorStop(0, 'rgba(120,80,170,0)'); gr.addColorStop(1, `rgba(120,80,170,${0.55 * k})`); g.fillStyle = gr; g.fillRect(0, 0, W, VH); if (hudImg.icon_mist) g.drawImage(hudImg.icon_mist, 50, VH - 22, 8, 8); } if (P.thornSlow > 0 && hudImg.icon_thorns) g.drawImage(hudImg.icon_thorns, 62, VH - 22, 8, 8); }
Object.assign(USES, {
  fountain(pr) { pr.used = true; pr.img = pr.frames[1] || pr.img; const h = heal(40 + mod('fountainHeal')); play('fountain_drink', 0.8); say(`FONTÄNEN LÄKER DIG (+${Math.round(h)})`, 2); stat('fountains'); },
  falsedoor(pr) { pr.used = true; pr.img = pr.frames[1] || pr.img; play('falsedoor_open', 0.9); say('DÖRREN VAR INGEN DÖRR', 1.5); P.shake = Math.max(P.shake, 0.8);
    const t = ENEMY_DEFS['Ʈ'] ? 'Ʈ' : 'V', a = Math.atan2(P.y - pr.y, P.x - pr.x), x = pr.x + Math.cos(a) * 0.9, y = pr.y + Math.sin(a) * 0.9, e = makeEnemy(t, freeSpot(x, y, 0.3) ? x : P.x + Math.cos(P.a + Math.PI) * 1.5, freeSpot(x, y, 0.3) ? y : P.y + Math.sin(P.a + Math.PI) * 1.5); e.alert = true; ents.push(e); totalEnemies++; spawnPuff(e.x, e.y, 8); },
});

// ---------- Version 16: trädgårdens och drömmens invånare ----------
const inView = e => { let off = Math.atan2(e.y - P.y, e.x - P.x) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off)); return Math.abs(off) < Math.atan(plane) * 1.05 && hasLOS(P.x, P.y, e.x, e.y); };
const AI_V16 = {
  weepingangel(e, dt, dist) { // rör sig bara när du inte tittar
    if (inView(e)) { e.seenT = tmr + 0.3 + mod('angelSight'); }
    if ((e.seenT || 0) > tmr) { e.state = 'idle'; e.t = 0; e.cd = Math.max(e.cd, 0.4); if ((e.angelMsg || 0) < tmr && dist < 8) { e.angelMsg = tmr + 20; firstHint('angel', 'STENÄNGLARNA RÖR SIG BARA NÄR DU INTE TITTAR PÅ DEM.'); } return true; }
    if ((e.scrapeT || 0) < tmr && dist < 10) { e.scrapeT = tmr + rnd(0.8, 1.4); play('angel_scrape', 0.5, rnd(0.9, 1.1), { x: e.x, y: e.y }); }
    return false;
  },
  thornvine(e, dt) { e.mvx = 0; e.mvy = 0; return false; }, // rotad: rör sig inte, når långt
  gardener(e, dt) { return false; },
  dreameater(e, dt, dist, los) { // äter ljus: släcker lampan och tömmer batteriet
    if (dist < 5 && los) { if (P.lamp) { P.lamp = false; say('NÅGOT ÅT UPP LJUSET', 1.2); play('dreameater', 0.7, 1, { x: e.x, y: e.y }); } if (P.battery !== undefined) P.battery = Math.max(0, P.battery - dt * 8); }
    return false;
  },
  doppelganger(e, dt, dist, los) { // härmar dig: rör sig spegelvänt och skjuter när du skjuter
    const shots = lvlStat.shots || 0;
    if (e.lastShots === undefined) e.lastShots = shots;
    if (shots > e.lastShots && los && (e.mimicT || 0) < tmr && e.state !== 'pain') { e.mimicT = tmr + 0.45; e.state = 'attack'; e.t = 0; e.didHit = true; shootFireball(e, Math.atan2(P.y - e.y, P.x - e.x) + rnd(-0.06, 0.06), 8, e.d.dmg, false); play('doppel_fire', 0.6, 1, { x: e.x, y: e.y }); }
    e.lastShots = shots; e.cd = 99;
    if (los && dist < 9 && e.state !== 'attack') { tryMove(e, -P.vx * dt * 0.8, -P.vy * dt * 0.8, 0.28); }
    return false;
  },
  sleepwalker(e) { if (!e.alert) { e.alert = true; e.sleep = false; } return false; }, // går inte att smyga förbi
};
function v16Kill(e) {
  if (e.d.ai === 'sleepwalker') { play('sleep_puff', 0.8, 1, { x: e.x, y: e.y }); for (let i = 0; i < 12; i++) { const a = rnd(0, TAU), s = rnd(0.5, 2); particles.push({ x: e.x, y: e.y, z: 0.5, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rnd(0, 0.5), life: 1, maxLife: 1, img: fx.hit[1], size: 0.08, add: true, tint: [200, 180, 255] }); }
    if (Math.hypot(P.x - e.x, P.y - e.y) < 2.2) { const k = Math.max(0.2, 1 - mod('sleepResist')); P.slowT = Math.max(P.slowT, 2.5 * k); P.confT = Math.max(P.confT || 0, 1.2 * k); say('SÖMNPULVER', 1); } }
}
// ---------- Version 16: Trädgårdsmästaren och Jon Blund ----------
Object.assign(BOSS_AI, {
  gardener(b, dt, dist, ang, ph) { // saxhugg, frön och taggrankor
    const fast = ph === 3 ? 1.3 : 1;
    if (b.state === 'lunge') { const sp = 8 * fast * dt, moved = bossMove(b, b.lA, sp); if (!b.didHit && dist < 2.2) { b.didHit = true; run.cause = b.d.name; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); play('shears_hit', 1, 0.7); }
      if (b.t > 0.8 || moved < sp * 0.3) { b.state = 'idle'; b.t = 0; b.cd = rnd(1, 1.4) / fast; } return; }
    if (b.state === 'seeds') { if (b.t < 0.05 || (ph >= 2 && Math.abs(b.t - 0.45) < dt)) { const n = 5 + ph * 2; for (let i = 0; i < n; i++) shootFireball(b, ang + (i - (n - 1) / 2) * 0.17, 6, b.d.dmg * 0.4, false); play('gardener_seeds', 0.8); }
      if (b.t > 1) { b.state = 'idle'; b.t = 0; b.cd = 1; } return; }
    b.cd -= dt;
    if (b.cd <= 0 && hasLOS(b.x, b.y, P.x, P.y)) { b.t = 0; b.didHit = false; if (dist < 6 && Math.random() < 0.55) { b.state = 'lunge'; b.lA = ang; bossWarn(b, 'TRÄDGÅRDSMÄSTAREN KLIPPER!'); play('gardener_laugh', 0.7); } else b.state = 'seeds'; return; }
    if (dist > 4) bossMove(b, ang, b.d.speed * fast * dt);
  },
  sandman(b, dt, dist, ang, ph) { // sömnsand, språng mellan drömmarna och mörker
    const fast = ph === 3 ? 1.3 : 1;
    if (b.state === 'sand') { if (b.t < 0.05 || Math.abs(b.t - 0.4) < dt || (ph >= 2 && Math.abs(b.t - 0.8) < dt)) { for (const s of [-0.3, 0, 0.3]) shootFireball(b, ang + s, 3.6, b.d.dmg * 0.35, false, 'orb'); play('sandman_sand', 0.8); if (fx.parts.dreamsand && !settings.lowfx) for (let i = 0; i < 10; i++) { const q = ang + rnd(-0.5, 0.5); particles.push({ x: b.x + Math.cos(q), y: b.y + Math.sin(q), z: rnd(0.8, 1.6), vx: Math.cos(q) * rnd(1.5, 3), vy: Math.sin(q) * rnd(1.5, 3), vz: rnd(-0.3, 0.3), life: 0.9, maxLife: 0.9, img: fx.parts.dreamsand[i % 2], size: 0.06 }); } }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = rnd(1, 1.5) / fast; } return; }
    if (b.state === 'blink') { if (b.t < 0.05) { const s = freeSpotFar(3, 7); if (s) { spawnPuff(b.x, b.y, 8); b.x = s[0]; b.y = s[1]; spawnPuff(b.x, b.y, 8); play('sandman_laugh', 0.7); } }
      if (b.t > 0.5) { b.state = 'idle'; b.t = 0; b.cd = 0.6; } return; }
    b.cd -= dt;
    if (b.cd <= 0) { b.t = 0; b.didHit = false; b.state = hasLOS(b.x, b.y, P.x, P.y) && Math.random() < 0.65 ? 'sand' : 'blink'; return; }
    if (dist > 6) bossMove(b, ang, b.d.speed * fast * dt); else bossMove(b, ang + Math.PI / 2, b.d.speed * dt * 0.8);
  },
});
Object.assign(BOSS_SPECIAL, {
  gardener(b, dt, dist, ang, ph) {
    if (b.spK) { if (b.t < 0.05) { bossWarn(b, 'RANKORNA VÄXER!'); play('gardener_laugh', 1, 0.8); for (let i = 0; i < 2 + ph; i++) { const s = freeSpotFar(2.5, 5); if (s) { const e = makeEnemy(ENEMY_DEFS['Ƭ'] ? 'Ƭ' : 'S', s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 6); } } }
      if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return; }
    if (b.t < 0.05) { say('STATYERNA VAKNAR', 1.5); for (let i = 0; i < 1 + ph; i++) { const s = freeSpotFar(4, 7); if (s) { const e = makeEnemy(ENEMY_DEFS['ƫ'] ? 'ƫ' : 'S', s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 6); } } }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
  sandman(b, dt, dist, ang, ph) {
    if (b.spK) { if (b.t < 0.05) { bossWarn(b, 'JON BLUND SLÄCKER LJUSET!'); play('sandman_laugh', 1, 0.7); darkT = Math.max(darkT, 4 + ph); P.lamp = false; }
      if (b.t > 1) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return; }
    if (b.t < 0.05) { say('DINA SPEGELBILDER VAKNAR', 1.5); for (let i = 0; i < 1 + ph; i++) { const s = freeSpotFar(3, 6); if (s) { const e = makeEnemy(ENEMY_DEFS['Ư'] ? 'Ư' : 'S', s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 6); } } }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
});
TAUNTS.gardener = ['DU ÄR OGRÄS', 'ALLT SKA BESKÄRAS', 'GÖDSEL'];
TAUNTS.sandman = ['SOV NU', 'DU VAKNAR ALDRIG', 'ÄR DU SÄKER PÅ ATT DU ÄR VAKEN?'];
Object.assign(PROJ_UPD_V8, { pshears: updatePshears, dstar: updateDstar });
Object.assign(PROJ_DRAW_V8, {
  pshears: o => drawSprite(spr.pick_shears || fx.hit[1], o.x, o.y, 0.16, o.z - 0.08, Math.floor(tmr * 16) % 2 === 0, null, 0, 0.6),
  dstar: o => drawSprite(fx.fireball[Math.floor(tmr * 12) % fx.fireball.length], o.x, o.y, o.small ? 0.18 : 0.3, o.z - 0.15, false, 1.2, 0, 0, true, [200, 170, 255]),
});
// ---------- Version 17: kedjekulekanonen och syrasprutan ----------
function chainFire(wp, base) { // kedjekulan: snurrar rakt fram och går igenom flera fiender
  const a = P.a, sp = 11;
  projectiles.push({ x: P.x + Math.cos(a) * 0.5, y: P.y + Math.sin(a) * 0.5, z: 0.45, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: base * (1 + mod('chainDmg')), friendly: true, kind: 'pchain', life: 2.6, left: up('cc_pierce') ? 7 : 4, hit: new Set(), spin: 0 });
  P.shake = Math.max(P.shake, 0.9); noise(8 * (1 - mod('noiseReduce')));
}
function updatePchain(p, dt) {
  p.spin += dt * 22;
  const R = up('cc_spin') ? 0.8 : 0.5;
  for (const e of ents) {
    if (e.dead || e.dying || e.hidden || e.dormant || p.hit.has(e) || Math.hypot(e.x - p.x, e.y - p.y) > R * e.d.size * (e.boss ? 1.8 : 1) + 0.1) continue;
    p.hit.add(e); const k = hurtEnemy(e, p.dmg, p.x, p.y, {}); hitMark = 0.12; hitKill = hitKill || k; lvlStat.hits++;
    play('chain_hit', 0.7, rnd(0.9, 1.1), { x: p.x, y: p.y }); sparks(p.x, p.y, 0.45, 3);
    if (!e.dead && !e.boss) { for (let i = 0; i < 3; i++) tryMove(e, p.vx / 11 * 0.12, p.vy / 11 * 0.12, 0.28); if (up('cc_spin')) e.stun = Math.max(e.stun || 0, 0.5); }
    if (up('cc_fire') && !e.dead) e.burn = Math.max(e.burn, 3);
    if (--p.left <= 0) { p.dead = true; return; }
  }
  if (solid(p.x, p.y) || p.life <= 0) {
    p.dead = true; const x = p.x - p.vx * dt, y = p.y - p.vy * dt; play('chain_hit', 0.5, 0.7, { x, y }); sparks(x, y, 0.45, 6);
    for (const pr of props) if (pr.def && !pr.broken && (pr.def.boom || pr.def.crate) && Math.hypot(pr.x - p.x, pr.y - p.y) < 1) hitProp(pr, p.x, p.y);
  }
}
let acidSnd = null;
function acidSpray(wp, base) { // syrasprutan: en kort grön stråle som fräter
  WS.shot = 0; WS.cd = effDelay(wp);
  if (!acidSnd && actx) acidSnd = play('acid_spray', 0.3, 1, { loop: true });
  const range = up('as_fast') ? 5.2 : 3.8, wide = up('as_spread') ? 0.5 : 0.26, dmg = base * (1 + mod('acidDmg'));
  for (let i = 0; i < (settings.lowfx ? 1 : 2); i++) { const a = P.a + rnd(-wide, wide) * 0.5, sp = rnd(5, 7); particles.push({ x: P.x + Math.cos(a) * 0.5, y: P.y + Math.sin(a) * 0.5, z: P.camZ - 0.18, vx: Math.cos(a) * sp + P.vx, vy: Math.sin(a) * sp + P.vy, vz: rnd(0, 0.6), life: range / 6.5, maxLife: range / 6.5, img: fx.parts.acid ? fx.parts.acid[i % 2] : fx.parts.drop ? fx.parts.drop[0] : fx.hit[1], size: rnd(0.07, 0.12), add: true, tint: fx.parts.acid ? null : [120, 255, 80], grav: true }); }
  const wd = cast(P.x, P.y, Math.cos(P.a), Math.sin(P.a)).dist; let hit = false;
  for (const e of ents) {
    if (e.dead || e.dormant || e.hidden) continue;
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
    if (d > Math.min(range, wd + 0.3) || Math.abs(off) > wide + 0.3 / Math.max(1, d)) continue;
    hurtEnemy(e, dmg, e.x, e.y, { noProc: true, quiet: true, acid: true }); hit = true;
    if (!e.dead) { e.poison = Math.max(e.poison || 0, 2.5); e.corrodeT = tmr + (up('as_corrode') ? 5 : 3); }
  }
  if (hit && (WS.acidHitT || 0) < tmr) { WS.acidHitT = tmr + 0.35; play('acid_hit', 0.4, rnd(0.9, 1.1)); hitMark = 0.06; }
  const ex = P.x + Math.cos(P.a) * Math.min(range, wd - 0.2), ey = P.y + Math.sin(P.a) * Math.min(range, wd - 0.2);
  if (up('as_fumes') && Math.random() < 0.1 && !solid(ex, ey)) acidPuddle(ex, ey, 4, true);
  burnWebs(ex, ey, 0.8);
}
function weaponV17Tick(wp, dt, trig) {
  if (acidSnd && (!trig || !wp.acid || P.mags[P.weapon] <= 0 || state !== 'play')) { try { acidSnd.s.stop(); } catch (e) { /* stoppad */ } acidSnd = null; }
  if (wp.acid) WS.aim = 0;
}
Object.assign(PROJ_UPD_V8, { pchain: updatePchain, cball: updateCball });
Object.assign(PROJ_DRAW_V8, {
  pchain: o => { if (fx.parts.chainball) { drawSprite(fx.parts.chainball[Math.floor(o.spin) % 2], o.x, o.y, 0.22, o.z - 0.11, Math.floor(o.spin / 2) % 2 === 0, null, 0, 0.6); return; } const v = Math.hypot(o.vx, o.vy) || 1, px = -o.vy / v, py = o.vx / v, s = Math.cos(o.spin) * 0.2, im = fx.parts.rock ? fx.parts.rock[0] : fx.shards[7];
    drawSprite(im, o.x + px * s, o.y + py * s, 0.15, o.z - 0.07, false, null, 0, 0.6, false, [120, 120, 135]); drawSprite(im, o.x - px * s, o.y - py * s, 0.15, o.z - 0.07, true, null, 0, 0.6, false, [120, 120, 135]);
    if (fx.parts.chain) drawSprite(fx.parts.chain[0], o.x, o.y, 0.05, o.z - 0.02, false, null, 0, 0.6); },
  cball: o => drawSprite(fx.parts.rock ? fx.parts.rock[0] : fx.shards[7], o.x, o.y, 0.26, o.z - 0.13, false, null, 0, 0.6, false, [90, 90, 100]),
});

// ---------- Version 17: skeppet och laboratoriet – ruttna plankor, vågor, syra, transmutation, teslaspolar, kanoner och alembiker ----------
let lobs = [], v17clouds = [], v17puddles = [], v17tiles = [], v17wave = { t: 0, a: 0, n: 0 }, v17acc = 0;
const LOB_TINT = { poison: [120, 255, 90], frost: [170, 220, 255], fire: [255, 140, 50], cball: [255, 90, 50] };
function setupV17() {
  lobs = []; v17clouds = []; v17puddles = []; v17tiles = []; v17acc = 0;
  P.plankT = 0; P.acidAcc = 0; P.acidT = 0; P.tarT = 0; P.v17safe = { x: P.x, y: P.y };
  let n = 0; for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (map[y][x] === 'Ǐ') n++;
  v17wave = { t: 0, a: typeof lvl.waveDir === 'number' ? lvl.waveDir : ((lvl.seed || mw * 7 + mh) % 2 ? 0 : Math.PI / 2), n };
  for (const pr of props) { if (pr.ch === 'Ǟ') pr.zapT = rnd(0.8, 2.5); if (pr.ch === 'ǟ') pr.brews = 0; }
  // tak: högst tre tentakler och två kimärer per bana
  const rm = new Set(); for (const [t, max] of [['Ǚ', 3], ['Ǩ', 2]]) for (const e of ents.filter(o => o.type === t && !o.minion).slice(max)) rm.add(e);
  if (rm.size) { ents = ents.filter(e => !rm.has(e)); totalEnemies -= rm.size; }
}
function updateV17(dt) {
  const c = cellUnder(), ground = P.jz < 0.05;
  v17acc += dt; const tick = v17acc >= 0.5; if (tick) v17acc = 0;
  // ruttna plankor brakar igenom
  if (c !== 'Ǎ' && ground && !solid(P.x, P.y)) { P.v17safe.x = P.x; P.v17safe.y = P.y; }
  if (c === 'Ǎ' && ground) { if (P.plankT === 0) play('plank_break', 0.45, 1.6); P.plankT += dt; if (P.plankT >= 0.6) breakPlank(P.x | 0, P.y | 0); } else P.plankT = 0;
  for (const e of ents) {
    if (e.dead || e.boss || e.d.float || e.hidden || e.dormant || e.d.ai === 'fly') continue;
    if (cellAt(e.x, e.y) !== 'Ǎ') { e.plankT = 0; continue; }
    e.plankT = (e.plankT || 0) + dt; if (e.d.size >= 1.25 || e.plankT >= 0.6) breakPlank(e.x | 0, e.y | 0);
  }
  // sköljt däck: var sjätte sekund kommer en våg
  if (v17wave.n) { v17wave.t += dt; if (v17wave.t >= 6) { v17wave.t = 0; waveWash(); v17wave.a += Math.PI; } }
  // syra: först rustningen, sedan du
  P.acidAcc = Math.min(0.5, (P.acidAcc || 0) + dt);
  const pud = puddleAt(P.x, P.y, false), onAcid = ground && (c === 'Ǜ' || pud);
  if (onAcid && P.acidAcc >= 0.5) { P.acidAcc = 0; const k = Math.max(0, 1 - mod('acidResist'));
    if (k > 0) { if (P.armor > 0) P.armor = Math.max(0, P.armor - 2 * k); run.cause = c === 'Ǜ' ? 'SYRAKARET' : 'SLEMMET'; hurtPlayer((c === 'Ǜ' ? 4 : 2) * k * trapMul()); P.acidT = 0.6; play('acid_hiss', 0.3, rnd(0.9, 1.1)); firstHint('acid', 'SYRAN FRÄTER – FÖRST RUSTNINGEN, SEDAN DIG.'); } }
  P.acidT = Math.max(0, (P.acidT || 0) - dt);
  P.tarT = pud && ground ? 0.2 : Math.max(0, (P.tarT || 0) - dt);
  for (const h of v17puddles) h.t -= dt; v17puddles = v17puddles.filter(h => h.t > 0);
  if (tick) for (const e of ents) { if (e.dead || e.hidden || e.dormant || e.d.float || e.d.ai === 'ooze' || e.boss) continue; const ce = cellAt(e.x, e.y);
    if (ce === 'Ǜ' || puddleAt(e.x, e.y, true)) { hurtEnemy(e, 2 * (1 + mod('acidDmg')), e.x, e.y, { noProc: true, quiet: true, acid: true }); if (!e.dead) e.corrodeT = Math.max(e.corrodeT || 0, tmr + 1); } }
  // transmutationscirkeln: drycker åt dig, guld av fienderna
  if (c === 'ǜ' && ground && (P.transT || 0) < tmr) { P.transT = tmr + 20 * Math.max(0.4, 1 - mod('transmuteLuck') * 0.5); const id = ['heal', 'rage', 'ghost', 'speed'][(Math.random() * 4) | 0]; potionFx(id); play('transmute', 0.8); say('CIRKELN FÖRVANDLAR DIG: ' + POTIONS[id].name, 2); P.potFlash = { tint: POTIONS[id].tint, t: 0.7 }; firstHint('transmute', 'TRANSMUTATIONSCIRKELN GER DIG EN DRYCK – OCH GÖR FIENDER TILL GULD.'); stat('transmutes'); }
  for (const e of ents) {
    if (e.dead || e.boss || e.hidden || e.dormant) continue;
    if ((e.goldT || 0) > tmr) { e.stun = Math.max(e.stun || 0, 0.1); e.mvx = e.mvy = 0; if (!settings.lowfx && Math.random() < dt * 6) particles.push({ x: e.x + rnd(-0.3, 0.3), y: e.y + rnd(-0.3, 0.3), z: rnd(0.2, 0.9), vx: 0, vy: 0, vz: 0.3, life: 0.6, maxLife: 0.6, img: fx.hit[1], size: 0.04, add: true, tint: [255, 220, 90], fade: true }); continue; }
    if (cellAt(e.x, e.y) === 'ǜ' && (e.goldCd || 0) < tmr && !e.d.float) { e.goldT = tmr + 3 * (1 + mod('transmuteLuck')); e.goldCd = tmr + 10; e.state = 'pain'; e.t = 0; spawnText(e.x, e.y, 'GULD!', '#ffd24a'); play('transmute', 0.6, 1.2, { x: e.x, y: e.y }); }
  }
  // teslaspolarna slår mot det närmaste levande
  for (const pr of props) if (pr.ch === 'Ǟ' && !pr.broken) { pr.zapT = (pr.zapT ?? 1) - dt; if (pr.zapT <= 0) { pr.zapT = 2.5; teslaZap(pr); } }
  // flaskornas moln
  for (const cl of v17clouds) {
    cl.t -= dt; cl.acc += dt;
    efx2Ground(cl, cl.kind); // version 25.1: flaskornas eld- och giftmoln (Effekseer)
    if (Math.hypot(P.x - cl.x, P.y - cl.y) < cl.r) P.cloudFx = { kind: cl.kind, t: 0.3 }; // inne i molnet: färgad kant i stället för jättelika partiklar
    if (!settings.lowfx && Math.random() < dt * 14) { const a = rnd(0, TAU), r = rnd(0, cl.r), qx = cl.x + Math.cos(a) * r, qy = cl.y + Math.sin(a) * r; if (Math.hypot(qx - P.x, qy - P.y) > 1) particles.push({ x: qx, y: qy, z: rnd(0.05, 0.6), vx: rnd(-0.2, 0.2), vy: rnd(-0.2, 0.2), vz: 0.15, life: 1, maxLife: 1, frames: fx.parts.smoke || fx.hit, img: (fx.parts.smoke || fx.hit)[0], size: 0.2, add: true, tint: LOB_TINT[cl.kind], drift: true, fade: true }); }
    if (cl.acc < 0.5) continue; cl.acc = 0;
    if (Math.hypot(P.x - cl.x, P.y - cl.y) < cl.r && mod('hazardImmune') <= 0) {
      if (cl.kind === 'poison') { P.poisonT = Math.max(P.poisonT || 0, 2.5); run.cause = 'GIFTMOLNET'; }
      else if (cl.kind === 'frost') P.slowT = Math.max(P.slowT, 1.2 * Math.max(0.2, 1 - mod('coldResist')));
      else { run.cause = 'ELDEN'; hurtPlayer(3 * trapMul()); }
    }
    for (const e of ents) { if (e.dead || e.boss || e.hidden || e.dormant || Math.hypot(e.x - cl.x, e.y - cl.y) > cl.r) continue;
      if (cl.kind === 'poison') e.poison = Math.max(e.poison || 0, 4); else if (cl.kind === 'frost') e.slow = Math.max(e.slow || 0, 1.5); else e.burn = Math.max(e.burn || 0, 3); }
  }
  v17clouds = v17clouds.filter(cl => cl.t > 0);
  // alkemistens förvandlade golv går tillbaka
  for (const t of v17tiles) {
    t.t -= dt;
    if (t.warn > 0) { t.warn -= dt; if (!settings.lowfx && Math.random() < dt * 10) particles.push({ x: t.x + rnd(0.1, 0.9), y: t.y + rnd(0.1, 0.9), z: 0.02, vx: 0, vy: 0, vz: 0.5, life: 0.4, maxLife: 0.4, img: fx.hit[1], size: 0.05, add: true, tint: [140, 255, 90] });
      if (t.warn <= 0 && map[t.y][t.x] === t.orig) { map[t.y][t.x] = 'Ǜ'; if (animTex.acid !== undefined) cellFloor[t.y * mw + t.x] = animTex.acid; } }
    if (t.t <= 0 && map[t.y][t.x] === 'Ǜ') { map[t.y][t.x] = t.orig; cellFloor[t.y * mw + t.x] = t.floor; }
  }
  v17tiles = v17tiles.filter(t => t.t > 0);
  // slemmet bromsar skotten som passerar
  for (const p of projectiles) if (p.friendly && !p.oozed && ents.some(e => !e.dead && e.d.ai === 'ooze' && Math.hypot(e.x - p.x, e.y - p.y) < 0.9)) { p.oozed = true; p.vx *= 0.55; p.vy *= 0.55; }
  updateLobs(dt);
}
function breakPlank(x, y) {
  if (map[y][x] !== 'Ǎ') return;
  map[y][x] = '·'; flowCell = -1; if (animTex.pit !== undefined) cellFloor[y * mw + x] = animTex.pit;
  play('plank_break', 1, rnd(0.9, 1.1), { x: x + 0.5, y: y + 0.5 }); stat('planks');
  for (let i = 0; i < 8; i++) { const a = rnd(0, TAU), sp = rnd(0.5, 1.8); particles.push({ x: x + 0.5, y: y + 0.5, z: 0.05, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(0.8, 2), life: rnd(0.8, 1.3), img: fx.crateBits ? fx.crateBits[i % 4] : fx.shards[i % 6], size: 0.12, grav: true, bounce: true }); }
  if ((P.x | 0) === x && (P.y | 0) === y) {
    run.cause = 'RUTTNA PLANKOR'; hurtPlayer(10 * trapMul()); say('PLANKORNA BRAKADE IGENOM!', 1.5); P.shake = Math.max(P.shake, 1.2);
    P.x = P.v17safe.x; P.y = P.v17safe.y; P.vx = P.vy = 0; P.plankT = 0;
    if (solid(P.x, P.y)) { const s = randomFreeCell(RNG(Date.now())); if (s) [P.x, P.y] = s; }
    firstHint('plank', 'RUTTNA PLANKOR BRAKAR IGENOM OM DU STÅR KVAR PÅ DEM.');
  }
  for (const e of ents) if (!e.dead && !e.boss && !e.d.float && (e.x | 0) === x && (e.y | 0) === y) { // fienden faller igenom: skada och upp på en ruta bredvid
    hurtEnemy(e, Math.max(10, e.maxHp * 0.35), e.x, e.y, { noProc: true, fall: true }); if (e.dead) continue;
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].map(([a, b]) => [x + a + 0.5, y + b + 0.5]).find(([cx, cy]) => !solid(cx, cy) && cellAt(cx, cy) !== 'Ǎ'); if (nb) { e.x = nb[0]; e.y = nb[1]; } else { const s = randomFreeCell(RNG(Date.now())); if (s) { e.x = s[0]; e.y = s[1]; } } e.plankT = 0; e.state = 'pain'; e.t = 0; }
}
function waveWash() { // vågen knuffar allt som står på det sköljda däcket
  const a = v17wave.a, cx = Math.cos(a), cy = Math.sin(a), k = Math.max(0, 1 - mod('deckGrip'));
  let near = false;
  for (let y = Math.max(0, (P.y | 0) - 8); y < Math.min(mh, (P.y | 0) + 9); y++) for (let x = Math.max(0, (P.x | 0) - 8); x < Math.min(mw, (P.x | 0) + 9); x++) if (map[y][x] === 'Ǐ') { near = true; if (!settings.lowfx && Math.random() < 0.5) for (let i = 0; i < 3; i++) particles.push({ x: x + rnd(0, 1), y: y + rnd(0, 1), z: 0.05, vx: cx * rnd(1, 2.5), vy: cy * rnd(1, 2.5), vz: rnd(0.8, 1.6), life: 0.7, maxLife: 0.7, img: fx.parts.drop ? fx.parts.drop[0] : fx.hit[1], size: 0.07, grav: true, tint: [190, 230, 255] }); }
  if (near) play('wave_wash', 0.8, rnd(0.9, 1.05));
  if (cellUnder() === 'Ǐ' && P.jz < 0.3 && k > 0) { P.vx += cx * 5 * k; P.vy += cy * 5 * k; for (let i = 0; i < 4; i++) tryMove(P, cx * 0.12 * k, cy * 0.12 * k, 0.24); P.waveFx = 0.5; say('EN VÅG SKÖLJER ÖVER DÄCKET', 1); firstHint('wave', 'DET SKÖLJDA DÄCKET ÄR HALT, OCH VÅGORNA KNUFFAR ALLT SOM STÅR PÅ DET.'); }
  for (const e of ents) if (!e.dead && !e.boss && !e.d.float && !e.hidden && cellAt(e.x, e.y) === 'Ǐ') for (let i = 0; i < 8; i++) tryMove(e, cx * 0.13, cy * 0.13, 0.28);
  for (const it of items) if (!it.taken && cellAt(it.x, it.y) === 'Ǐ' && !solid(it.x + cx * 0.9, it.y + cy * 0.9)) { it.x += cx * 0.9; it.y += cy * 0.9; }
}
function potionFx(id) { // en dryckeseffekt utan flaska (transmutationscirkeln)
  if (id === 'heal') { const n = Math.round(heal(50 * (1 + mod('healMul')))); spawnText(P.x + Math.cos(P.a), P.y + Math.sin(P.a), `+${n} HP`, '#ff7060'); }
  else if (id === 'rage') P.rageT = 8;
  else if (id === 'ghost') { P.ghostT = 6; for (const e of ents) if (!e.dead && !e.boss && e.alert && !e.guardian) { e.alert = false; e.lostT = 0; e.searchT = 2; e.state = 'idle'; } }
  else if (id === 'speed') P.speedT = 8;
}
function teslaZap(pr) {
  let best = null, bd = 4;
  const dp = Math.hypot(P.x - pr.x, P.y - pr.y); if (dp < bd && hasLOS(pr.x, pr.y, P.x, P.y)) { best = P; bd = dp; }
  for (const e of ents) { if (e.dead || e.hidden || e.dormant || e.dying) continue; const d = Math.hypot(e.x - pr.x, e.y - pr.y); if (d < bd && hasLOS(pr.x, pr.y, e.x, e.y)) { best = e; bd = d; } }
  if (!best) return;
  zap(pr.x, pr.y, best.x, best.y, [170, 210, 255]); zap(pr.x, pr.y, best.x, best.y, [230, 240, 255]); pr.flashT = tmr + 0.12; pr.zapUntil = tmr + 0.3;
  flashes.push({ x: pr.x, y: pr.y, t: 0.15, r: 3, col: [170, 210, 255] }); play('tesla_zap', 1, rnd(0.9, 1.1), { x: pr.x, y: pr.y });
  if (best === P) { const k = Math.max(0, 1 - mod('teslaResist')); if (k > 0) { run.cause = 'TESLASPOLEN'; hurtPlayer(8 * k * trapMul(), pr.x, pr.y, 'proj'); } firstHint('tesla', 'TESLASPOLEN SLÅR BLIXTAR MOT DET NÄRMASTE – LOCKA DIT FIENDERNA.'); }
  else hurtEnemy(best, 8, best.x, best.y, { noProc: true });
}
function acidPuddle(x, y, t, friendly) { v17puddles.push({ x, y, t, friendly: !!friendly, t0: t }); if (v17puddles.length > 40) v17puddles.shift(); }
function puddleAt(x, y, friendly) { for (const h of v17puddles) if (h.friendly === friendly && Math.abs(h.x - x) < 0.5 && Math.abs(h.y - y) < 0.5) return true; return false; }
function v17Cloud(x, y, kind, r) { // en flaska går sönder: gift, frost eller eld
  kind = kind || ['poison', 'frost', 'fire'][(Math.random() * 3) | 0];
  v17clouds.push({ x, y, kind, r: r || 2.5, t: 4, acc: 0.4 }); play('flask_break', 0.7, rnd(0.9, 1.1), { x, y });
  if (kind === 'fire') for (let i = 0; i < 4; i++) { const a = rnd(0, TAU), d = rnd(0, (r || 2.5) * 0.6); if (!solid(x + Math.cos(a) * d, y + Math.sin(a) * d)) groundFires.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, t: 3, acc: 0 }); }
  if (kind === 'frost') frostBurst(x, y);
  for (let i = 0; i < 10; i++) { const a = rnd(0, TAU), s = rnd(0.5, 2); particles.push({ x, y, z: 0.3, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rnd(0.5, 1.5), life: 0.7, maxLife: 0.7, img: fx.parts.glassshard ? fx.parts.glassshard[i % 2] : fx.hit[1], size: 0.05, grav: true, tint: fx.parts.glassshard ? null : LOB_TINT[kind] }); }
  return kind;
}
// lobbade skott: kanonkulor och flaskor i en båge, med en ring där de landar
function lobShot(src, tx, ty, o) {
  for (let i = 0; i < 6 && solid(tx, ty); i++) { tx += (src.x - tx) * 0.2; ty += (src.y - ty) * 0.2; }
  [tx, ty] = lobClip(src.x, src.y, tx, ty); // version 25.1: landar före första väggen på linjen
  lobs.push({ x0: src.x, y0: src.y, tx, ty, t: 0, T: o.T || 1.2, dmg: o.dmg, r: o.r || 1.2, kind: o.kind || 'cball', fx: o.fx, name: src.d ? src.d.name : '' });
  lobs[lobs.length - 1].src = src; // version 26B: kastaren, för granatreturen
}
function updateLobs(dt) {
  for (const l of lobs) { l.t += dt; if (l.t >= l.T) { l.done = true; lobLand(l); } }
  lobs = lobs.filter(l => !l.done);
}
function lobLand(l) {
  if (l.ret && v26bLobLand(l)) return; // version 26B: lobben som sparkats tillbaka
  const d = Math.hypot(P.x - l.tx, P.y - l.ty);
  if (l.kind === 'cball') {
    play('cannonball_land', 0.8, rnd(0.9, 1.1), { x: l.tx, y: l.ty }); explodeFx(l.tx, l.ty, 0.2); flashes.push({ x: l.tx, y: l.ty, t: 0.2, r: 3 });
    if (fx.parts.scorch) decals.push({ x: l.tx, y: l.ty, img: fx.parts.scorch[0], size: 0.08 });
    if (d < 12) P.shake = Math.max(P.shake, 1.4 * (1 - d / 12));
    if (d < l.r && P.jz < 0.4 && boomSees(l.tx, l.ty, P.x, P.y)) { run.cause = l.name || 'KANONKULAN'; hurtPlayer(l.dmg, l.tx, l.ty, 'proj'); }
    for (const pr of props) if (pr.def && !pr.broken && (pr.def.boom || pr.def.crate) && Math.hypot(pr.x - l.tx, pr.y - l.ty) < l.r) hitProp(pr, l.tx, l.ty);
  } else {
    const k = v17Cloud(l.tx, l.ty, l.fx, l.r * 1.2);
    if (d < l.r * 0.7 && P.jz < 0.4 && boomSees(l.tx, l.ty, P.x, P.y)) { run.cause = l.name || 'FLASKAN'; hurtPlayer(l.dmg, l.tx, l.ty, 'proj'); if (k === 'poison') P.poisonT = Math.max(P.poisonT || 0, 3); }
  }
}

