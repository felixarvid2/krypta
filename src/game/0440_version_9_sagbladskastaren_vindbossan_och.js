// ---------- Version 9: sågbladskastaren, vindbössan och spjutet ----------
function sawFire(wp, base) {
  const n = up('sw_multi') ? 3 : 1;
  for (let i = 0; i < n; i++) { const a = P.a + (n > 1 ? (i - 1) * 0.14 : 0) + rnd(-1, 1) * wp.spread * (1 - WS.aim);
    projectiles.push({ x: P.x + Math.cos(a) * 0.4, y: P.y + Math.sin(a) * 0.4, z: 0.42, vx: Math.cos(a) * 14, vy: Math.sin(a) * 14, dmg: base, friendly: true, kind: 'saw', life: 3.2, bounces: up('sw_bounce') ? 6 : 3, hitT: new Map(), back: false, refund: i === 0 }); }
  noise(5 * (1 - mod('noiseReduce')));
}
function updateSaw(p, dt) {
  if (p.back) { const d = Math.hypot(P.x - p.x, P.y - p.y) || 1; p.vx += ((P.x - p.x) / d * 15 - p.vx) * Math.min(1, dt * 6); p.vy += ((P.y - p.y) / d * 15 - p.vy) * Math.min(1, dt * 6); if (d < 0.7) { p.dead = true; if (p.refund) { P.ammo.gears = Math.min(AMMO.gears.max, (P.ammo.gears || 0) + 1); play('gear_pickup', 0.4, 1.3); } return; } }
  if (solid(p.x, p.y)) {
    const ox = p.x - p.vx * dt, oy = p.y - p.vy * dt;
    if (p.bounces > 0 && !p.back) { p.bounces--; if (solid(p.x, oy)) p.vx = -p.vx; if (solid(ox, p.y)) p.vy = -p.vy; p.x = ox; p.y = oy; play('saw_bounce', 0.4, rnd(0.9, 1.2), { x: p.x, y: p.y }); sparks(p.x, p.y, 0.4, 3); return; }
    if (up('sw_return') && !p.back) { p.back = true; p.x = ox; p.y = oy; p.life = 3; return; }
    p.dead = true; sparks(ox, oy, 0.4, 4); return;
  }
  if (p.life <= 0) { if (up('sw_return') && !p.back) { p.back = true; p.life = 3; } else p.dead = true; return; }
  for (const e of ents) { // klingorna går igenom fiender
    if (e.dead || e.dying || e.hidden || e.dormant || Math.hypot(e.x - p.x, e.y - p.y) > 0.34 * e.d.size * (e.boss ? 1.8 : 1) || (p.hitT.get(e) || 0) > tmr) continue;
    p.hitT.set(e, tmr + 0.4); const k = hurtEnemy(e, p.dmg, p.x, p.y, {}); hitMark = 0.1; hitKill = hitKill || k; lvlStat.hits++; run.hits = (run.hits || 0) + 1;
    play('saw_hit', 0.5, rnd(0.9, 1.1), { x: p.x, y: p.y }); runeProc(e, p.dmg); if (up('sw_bleed')) e.poison = Math.max(e.poison || 0, 4);
  }
}
function windBlast(wp) { // vindbössan: en kon av luft som knuffar fiender och vänder skott
  if (WS.cd > 0 || WS.state !== 'idle') return;
  const cone = up('wg_wide') ? 0.85 : 0.55, range = 7.5;
  WS.shot = 0; WS.cd = effDelay(wp); WS.kick = 0.3; P.shake = Math.max(P.shake, 0.8); lvlStat.shots++; play('wind_fire', 0.9, rnd(0.95, 1.05)); noise(6);
  let hits = 0;
  for (const e of ents) {
    if (e.dead || e.dying || e.hidden || e.dormant) continue;
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
    if (d > range || Math.abs(off) > cone || !hasLOS(P.x, P.y, e.x, e.y)) continue;
    hits++; hurtEnemy(e, wp.dmg * (1 + mod('dmg')) * masteryMul(), e.x, e.y, { noProc: true });
    if (up('wg_cold')) freeze(e, 1.5);
    if (!e.boss && !e.dead) { const f = (1 - d / range * 0.5) * 11 / Math.max(0.6, e.d.size); e.knock = { vx: dx / (d || 1) * f, vy: dy / (d || 1) * f, t: 0.4 }; e.stun = Math.max(e.stun || 0, 0.4); }
  }
  for (const p of projectiles) if (!p.friendly && !p.dead) { const dx = p.x - P.x, dy = p.y - P.y, d = Math.hypot(dx, dy); let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
    if (d < range && Math.abs(off) < cone) { const sp = Math.hypot(p.vx, p.vy) * 1.2; p.vx = Math.cos(P.a) * sp; p.vy = Math.sin(P.a) * sp; p.friendly = true; p.dmg = (p.dmg || 5) * 1.5; p.src = P; } } // skotten blåses tillbaka
  if (up('wg_cyclone')) { const x = P.x + Math.cos(P.a) * 4, y = P.y + Math.sin(P.a) * 4; if (!solid(x, y)) cyclones.push({ x, y, t: 2.5 }); }
  for (let i = 0; i < 16; i++) { const a = P.a + rnd(-cone, cone), sp = rnd(6, 11); particles.push({ x: P.x + Math.cos(a) * 0.5, y: P.y + Math.sin(a) * 0.5, z: rnd(0.3, 0.7), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0, life: 0.45, maxLife: 0.45, img: fx.parts.wind ? fx.parts.wind[i % fx.parts.wind.length] : fx.hit[1], size: 0.08, add: true, tint: [220, 240, 255] }); }
  if (hits) { hitMark = 0.1; play('wind_push', 0.6); }
}
let cyclones = [];
function knockTick(dt) { // knuffade fiender flyger tills de slår i en vägg eller faller i tomrummet
  for (const e of ents) {
    if (!e.knock || e.dead) continue; const k = e.knock; k.t -= dt;
    const ox = e.x, oy = e.y; tryMove(e, k.vx * dt, k.vy * dt, 0.28); k.vx *= 0.92; k.vy *= 0.92;
    if (voidAt(e.x, e.y) && !e.boss && !e.d.float) { e.knock = null; spawnText(e.x, e.y, 'FÖLL!', '#c0e0ff'); play('void_fall', 0.5, 1.3, { x: e.x, y: e.y }); hurtEnemy(e, e.hp + 999, e.x, e.y, { noProc: true }); stat('voidKills'); continue; }
    if (Math.hypot(e.x - ox, e.y - oy) < Math.hypot(k.vx, k.vy) * dt * 0.3 && Math.hypot(k.vx, k.vy) > 3) { e.knock = null; const dmg = 9 * (1 + mod('pushDmg')) * (up('wg_slam') ? 2 : 1); hurtEnemy(e, dmg, e.x, e.y, { boom: true }); spawnPuff(e.x, e.y, 5); play('bigboom', 0.35, 1.4, { x: e.x, y: e.y }); continue; } // in i väggen
    if (k.t <= 0) e.knock = null;
  }
  for (const c of cyclones) { c.t -= dt; for (const e of ents) if (!e.dead && !e.boss && Math.hypot(e.x - c.x, e.y - c.y) < 3.5) { const d = Math.hypot(c.x - e.x, c.y - e.y) || 1; tryMove(e, (c.x - e.x) / d * dt * 3, (c.y - e.y) / d * dt * 3, 0.28); }
    if (!settings.lowfx && Math.random() < dt * 20) { const a = rnd(0, TAU), r = rnd(0.2, 1.5); particles.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, z: rnd(0, 1), vx: -Math.sin(a) * 3, vy: Math.cos(a) * 3, vz: 0.3, life: 0.3, maxLife: 0.3, img: fx.parts.wind ? fx.parts.wind[0] : fx.hit[1], size: 0.06, add: true, tint: [220, 240, 255] }); } }
  cyclones = cyclones.filter(c => c.t > 0);
}
const spearIdx = () => WEAPONS.findIndex(w => w.spear);
function spearThrust(wp) {
  if (WS.cd > 0 || WS.state !== 'idle') return;
  const si = spearIdx(); if (P.mags[si] <= 0) { if ((P.spearMsgT || 0) < tmr) { P.spearMsgT = tmr + 2; say(up('sp_recall') ? 'SPJUTET LIGGER KVAR – HÖGERKLICK KALLAR TILLBAKA DET' : 'SPJUTET LIGGER PÅ MARKEN – PLOCKA UPP DET', 1.5); } return; }
  WS.shot = 0; WS.cd = effDelay(wp); WS.kick = 0.25; lvlStat.shots++; play('spear_thrust', 0.7, rnd(0.95, 1.05)); noise(3);
  if (up('sp_lunge')) { P.vx = Math.cos(P.a) * 7; P.vy = Math.sin(P.a) * 7; P.dashT = 0.12; }
  let hits = 0;
  for (const e of ents) { if (e.dead || e.dying || e.hidden || e.dormant) continue; const d = Math.hypot(e.x - P.x, e.y - P.y); let off = Math.atan2(e.y - P.y, e.x - P.x) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
    if (d < 2.4 + e.d.size * 0.25 && Math.abs(off) < 0.32) { const back = unaware(e) || behind(e), k = hurtEnemy(e, wp.dmg * meleeMul() * (back ? 1.5 : 1), e.x, e.y, { melee: true }); hits++; hitKill = hitKill || k; } }
  if (hits) { play('spear_hit', 0.8, rnd(0.9, 1.05)); hitMark = 0.12; hitStop = Math.max(hitStop, 0.05); lvlStat.hits++; }
}
function spearThrow(wp) {
  const si = spearIdx(); if (P.mags[si] <= 0) { if (up('sp_recall')) { const sp = items.find(it => it.type === 'spearpick' && !it.taken); if (sp) { sp.taken = true; projectiles.push({ x: sp.x, y: sp.y, z: 0.5, vx: 0, vy: 0, dmg: wp.dmg * meleeMul(), friendly: true, kind: 'spear', life: 3, recall: true, hitSet: new Set() }); play('spear_throw', 0.6, 1.3); } } return; }
  P.mags[si] = 0; WS.shot = 0; WS.spearT = 0.35; play('spear_throw', 0.8); noise(2);
  projectiles.push({ x: P.x + Math.cos(P.a) * 0.4, y: P.y + Math.sin(P.a) * 0.4, z: 0.5, vx: Math.cos(P.a) * 20, vy: Math.sin(P.a) * 20, dmg: wp.dmg * meleeMul() * 1.6, friendly: true, kind: 'spear', life: 1.4, hitSet: new Set() });
}
function updateSpear(p, dt) {
  if (p.recall) { const d = Math.hypot(P.x - p.x, P.y - p.y) || 1; p.vx = (P.x - p.x) / d * 20; p.vy = (P.y - p.y) / d * 20; if (d < 0.7) { p.dead = true; spearBack(); return; } }
  for (const e of ents) {
    if (e.dead || e.dying || e.hidden || p.hitSet.has(e) || Math.hypot(e.x - p.x, e.y - p.y) > 0.34 * e.d.size * (e.boss ? 1.8 : 1)) continue;
    p.hitSet.add(e); const k = hurtEnemy(e, p.dmg, p.x, p.y, {}); hitMark = 0.14; hitKill = hitKill || k; play('spear_hit', 0.7, 1, { x: p.x, y: p.y });
    if (!up('sp_pierce') && !p.recall) { spearLand(p, e.x, e.y); return; }
  }
  if (!p.recall && (solid(p.x, p.y) || p.life <= 0)) spearLand(p, p.x - p.vx * dt, p.y - p.vy * dt);
}
function spearLand(p, x, y) {
  p.dead = true; if (solid(x, y)) { x = P.x; y = P.y; }
  items.push({ type: 'spearpick', x, y, taken: false, drop: true }); play('knife_wall', 0.5, 0.8, { x, y });
  if (up('sp_storm')) lightningAt(x, y, 0.35, 16 * meleeMul(), true);
}
function spearBack() { const si = spearIdx(); if (si >= 0) P.mags[si] = 1; play('spear_pickup', 0.6); }
function weaponV9Tick(wp, dt) { // spjutets kast på högerklick
  if (wp.spear && aimDown && !WS.spAim) { WS.spAim = true; spearThrow(wp); }
  if (!aimDown) WS.spAim = false;
  if (wp.spear) WS.aim = 0; // spjutet siktar inte
  WS.spearT = Math.max(0, (WS.spearT || 0) - dt); WS.shearT = Math.max(0, (WS.shearT || 0) - dt);
}

// ---------- Version 9: tidsbubblor, tomrum, vind, sågspår och åska ----------
let timeBubbles = [], strikes = [], saws = [];
const voidAt = (x, y) => { const c = map[y | 0] && map[y | 0][x | 0]; return c === 'Ń'; };
const inBubble = (x, y) => timeBubbles.some(b => Math.hypot(b.x - x, b.y - y) < b.r);
function setupV9() {
  timeBubbles = []; strikes = []; cyclones = []; saws = []; roots = []; P.rootT = 0; P.lastSafe = { x: P.x, y: P.y }; P.fallT = 0;
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (map[y][x] === 'ŀ') { timeBubbles.push({ x: x + 0.5, y: y + 0.5, r: 2.2, t: Infinity, fixed: true }); map[y][x] = '.'; }
  for (const s of lvl.saws || []) saws.push({ x0: s.x0 + 0.5, y0: s.y0 + 0.5, x1: s.x1 + 0.5, y1: s.y1 + 0.5, k: Math.random(), dir: 1, x: s.x0 + 0.5, y: s.y0 + 0.5, snd: 0 });
  if (!lvl.saws) for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (map[y][x] === 'Ŀ' && !(map[y][x - 1] === 'Ŀ') && !(map[y - 1] && map[y - 1][x] === 'Ŀ')) { // spåret utan level.saws: följ tecknen
    let x1 = x, y1 = y; if (map[y][x + 1] === 'Ŀ') while (map[y][x1 + 1] === 'Ŀ') x1++; else while (map[y1 + 1] && map[y1 + 1][x] === 'Ŀ') y1++;
    if (x1 !== x || y1 !== y) saws.push({ x0: x + 0.5, y0: y + 0.5, x1: x1 + 0.5, y1: y1 + 0.5, k: Math.random(), dir: 1, x: x + 0.5, y: y + 0.5 }); }
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (map[y][x] === 'Ŀ') map[y][x] = '.';
}
function updateV9(dt) {
  // tidsbubblor
  for (const b of timeBubbles) b.t -= dt; timeBubbles = timeBubbles.filter(b => b.t > 0);
  P.timeSlow = inBubble(P.x, P.y) ? 0.5 + 0.5 * clamp(mod('timeResist'), 0, 1) : 1;
  if (P.timeSlow < 1 && (P.tbMsgT || 0) < tmr) { P.tbMsgT = tmr + 6; firstHint('time', 'TIDSBUBBLOR SAKTAR IN ALLT – ÄVEN DIG.'); }
  for (const e of ents) if (!e.dead && inBubble(e.x, e.y)) e.slow = Math.max(e.slow || 0, 0.15);
  // tomrummet
  if (voidAt(P.x, P.y) && P.jz < 0.05 && !P.fallT && mod('hazardImmune') <= 0) { P.fallT = 0.8; play('void_fall', 0.8); firstHint('void', 'TOMRUMMET: FALLER DU HAMNAR DU PÅ SENASTE SÄKRA PLATS – MED SKADA.'); }
  if (P.fallT > 0) { P.fallT -= dt; P.camSink = Math.max(P.camSink || 0, (0.8 - P.fallT) * 0.6); if (P.fallT <= 0) { P.fallT = 0; P.x = P.lastSafe.x; P.y = P.lastSafe.y; P.vx = P.vy = 0; run.cause = 'FÖLL I AVGRUNDEN'; hurtPlayer(15 * Math.max(0, 1 - mod('fallSafe'))); play('void_return', 0.7); P.iframe = Math.max(P.iframe, 0.6); spawnPuff(P.x, P.y, 6); } }
  else if (!voidAt(P.x, P.y) && P.jz < 0.05 && !deepAt(P.x, P.y)) { const c = cellUnder(); if (c !== '_' && c !== 'ń') { P.lastSafe.x = P.x; P.lastSafe.y = P.y; } }
  // vind
  const gust = lvl.winds && lvl.winds.length ? (levelTime % 7) < 1.2 : false;
  if (lvl.winds) for (const w of lvl.winds) if ((P.x | 0) === w.x && (P.y | 0) === w.y) { const k = (gust ? 4.5 : 1.8) * Math.max(0, 1 - mod('windResist')); tryMove(P, w.dx * k * dt, w.dy * k * dt, 0.24); if (!settings.lowfx && Math.random() < dt * 12) particles.push({ x: P.x + rnd(-1, 1), y: P.y + rnd(-1, 1), z: rnd(0.2, 0.9), vx: w.dx * 5, vy: w.dy * 5, vz: 0, life: 0.35, maxLife: 0.35, img: fx.parts.wind ? fx.parts.wind[0] : fx.hit[1], size: 0.07, add: true, tint: [230, 240, 255] }); }
  if (gust && !P.gustSnd && lvl.winds && lvl.winds.length) { P.gustSnd = true; play('wind_gust', 0.5); } else if (!gust) P.gustSnd = false;
  // sågklingorna
  for (const s of saws) { if ((s.stopT || 0) > tmr) continue; const L = Math.hypot(s.x1 - s.x0, s.y1 - s.y0) || 1; s.k += s.dir * dt * 2.6 / L * (inBubble(s.x, s.y) ? 0.3 : 1); if (s.k > 1 || s.k < 0) { s.dir = -s.dir; s.k = clamp(s.k, 0, 1); }
    s.x = s.x0 + (s.x1 - s.x0) * s.k; s.y = s.y0 + (s.y1 - s.y0) * s.k;
    if (Math.hypot(P.x - s.x, P.y - s.y) < 0.55 && P.jz < 0.25 && (P.sawT || 0) < tmr) { P.sawT = tmr + 0.6; run.cause = 'SÅGKLINGAN'; hurtPlayer(12 * trapMul(), s.x, s.y); play('saw_hit', 0.8); }
    for (const e of ents) if (!e.dead && !e.boss && !e.d.float && Math.hypot(e.x - s.x, e.y - s.y) < 0.5 && (e.sawT || 0) < tmr) { e.sawT = tmr + 0.6; hurtEnemy(e, 14, e.x, e.y, { noProc: true }); } }
  const ns = saws.reduce((m, s) => Math.min(m, Math.hypot(P.x - s.x, P.y - s.y)), 99);
  if (ns < 6 && (P.sawSndT || 0) < tmr) { P.sawSndT = tmr + 1.9; play('saw_track', 0.4 * (1 - ns / 6)); }
  // åskan
  for (const s of strikes) { s.t -= dt;
    if (s.t > 0) { if (!settings.lowfx && Math.random() < dt * 25) particles.push({ x: s.x + rnd(-0.5, 0.5), y: s.y + rnd(-0.5, 0.5), z: 0.02, vx: 0, vy: 0, vz: 0.6, life: 0.25, maxLife: 0.25, img: fx.hit[1], size: 0.06, add: true, tint: [200, 220, 255] }); continue; }
    s.done = true; flashes.push({ x: s.x, y: s.y, t: 0.15, r: 6, col: [200, 220, 255] }); play('thunder_strike', 0.9, rnd(0.9, 1.1), { x: s.x, y: s.y }); P.shake = Math.max(P.shake, 1.2 * clamp(1 - Math.hypot(P.x - s.x, P.y - s.y) / 10, 0, 1));
    efx2Strike(s); // version 25.1: åsknedslaget (Effekseer)
    for (let i = 0; i < 10; i++) particles.push({ x: s.x, y: s.y, z: i * 0.15, vx: rnd(-0.3, 0.3), vy: rnd(-0.3, 0.3), vz: 0, life: 0.2, maxLife: 0.2, img: (fx.parts.lightning2 || fx.parts.lightning || fx.hit)[i % (fx.parts.lightning2 || fx.parts.lightning || fx.hit).length], size: 0.12, add: true, tint: [220, 230, 255] });
    if (s.friendly) { for (const e of ents) if (!e.dead && Math.hypot(e.x - s.x, e.y - s.y) < 1.6) hurtEnemy(e, s.dmg, e.x, e.y, { boom: true }); }
    else if (Math.hypot(P.x - s.x, P.y - s.y) < 1.1) { run.cause = 'BLIXTEN'; hurtPlayer(s.dmg * Math.max(0, 1 - mod('lightningResist')), s.x, s.y, 'proj'); } }
  strikes = strikes.filter(s => !s.done);
  knockTick(dt);
}
function lightningAt(x, y, warn, dmg, friendly) { // åskan slår ned efter en varning; blixtstänger drar till sig den
  if (!friendly) { const rod = props.find(o => o.ch === 'ņ' && Math.hypot(o.x - x, o.y - y) < 3); if (rod) { x = rod.x; y = rod.y; } }
  strikes.push({ x, y, t: warn, dmg, friendly }); if (!friendly) play('thunder_warn', 0.5, 1, { x, y });
}
function drawV9World(list) { // klingor och bubblor i världen
  for (const s of saws) list.push({ x: s.x, y: s.y, k: 'sw', o: s });
  for (const b of timeBubbles) if (Math.hypot(b.x - P.x, b.y - P.y) < 16) list.push({ x: b.x, y: b.y, k: 'tb', o: b });
  for (const s of strikes) list.push({ x: s.x, y: s.y, k: 'st', o: s });
}
function drawV9Sprite(s) {
  const o = s.o;
  if (s.k === 'sw') { const f = fx.props.sawblade; drawSprite(f ? f[Math.floor(tmr * 16) % f.length] : fx.hit[1], o.x, o.y, 0.42, 0, false, null, 0, 0.6); return true; }
  if (s.k === 'tb') { const f = fx.props.timebubble; drawSprite(f ? f[Math.floor(tmr * 3) % f.length] : fx.hit[1], o.x, o.y, o.r * 1.1, -0.2, false, 1.1, 0, 0, true, [190, 170, 255]); return true; }
  if (s.k === 'st') { drawSprite(fx.hit[1], o.x, o.y, 0.5 + Math.sin(tmr * 30) * 0.1, 0, false, 1.5, 0, 0, true, [200, 220, 255]); return true; }
  return false;
}
function drawTimeHud(g) { if ((P.timeSlow || 1) < 1) { g.fillStyle = 'rgba(150,120,255,0.13)'; g.fillRect(0, 0, W, VH); const im = hudImg.icon_time; if (im) g.drawImage(im, 4, VH - 22, 8, 8); } if (P.fallT > 0) { g.fillStyle = `rgba(0,0,0,${(0.8 - P.fallT) * 1.1})`; g.fillRect(0, 0, W, VH); } }
// ---------- Version 9: urverkssoldat, kuggspindel, tidsväktare, harpya, stormkallare och molnjätte ----------
const AI_V9 = {
  clocksoldier(e, dt) { // lindas upp igen efter den första döden
    if (e.rewindT > 0) { e.rewindT -= dt; e.state = 'pain'; e.t = 0.1; if (!settings.lowfx && Math.random() < dt * 10) particles.push({ x: e.x + rnd(-0.3, 0.3), y: e.y + rnd(-0.3, 0.3), z: rnd(0.2, 0.8), vx: 0, vy: 0, vz: 0.5, life: 0.4, maxLife: 0.4, img: fx.parts.gear ? fx.parts.gear[0] : fx.hit[1], size: 0.05, tint: [230, 190, 90] });
      if (e.rewindT <= 0) { e.hp = e.maxHp * 0.6; spawnText(e.x, e.y, 'UPPLINDAD!', '#e0c070'); play('clock_rewind', 0.6, 1.2, { x: e.x, y: e.y }); } return true; }
    return false;
  },
  gearspider(e, dt, dist, los) { return AI_V7.scarab(e, dt, dist, los); },
  timekeeper(e, dt, dist, los) { // lägger tidsbubblor där du står
    e.bubT = (e.bubT ?? rnd(2, 4)) - dt;
    if (e.bubT <= 0 && los && dist < 10 && e.state !== 'pain') { e.bubT = rnd(6, 8); e.state = 'attack'; e.t = 0; e.didHit = true; timeBubbles.push({ x: P.x, y: P.y, r: 2.4, t: 5 }); play('time_bubble', 0.8, 1, { x: P.x, y: P.y }); return true; }
    return false;
  },
  harpy(e, dt, dist, los) { // dyker ned mot dig och flyger upp igen
    if (e.dive) { e.dive.t -= dt; e.state = 'attack'; const sp = 7.5 * dt * (e.slow > 0 ? 0.5 : 1); tryMove(e, Math.cos(e.dive.a) * sp, Math.sin(e.dive.a) * sp, 0.25);
      if (!e.dive.hit && Math.hypot(P.x - e.x, P.y - e.y) < 0.8) { e.dive.hit = true; run.cause = e.d.name; hurtPlayer(e.d.dmg, e.x, e.y, 'melee'); }
      if (e.dive.t <= 0) { e.dive = null; e.fleeT = 0.8; e.cd = 1; } return true; }
    e.diveT = (e.diveT ?? rnd(1.5, 3)) - dt;
    if (e.diveT <= 0 && los && dist < 7 && dist > 2) { e.diveT = rnd(3, 4.5); e.dive = { a: Math.atan2(P.y - e.y, P.x - e.x), t: Math.min(0.9, dist / 7.5 + 0.2), hit: false }; play('harpy_dive', 0.7, 1, { x: e.x, y: e.y }); return true; }
    return false;
  },
  stormcaller(e, dt, dist, los) { // kallar ned blixtar där du står
    e.cd = 99; e.boltT = (e.boltT ?? rnd(2, 3.5)) - dt;
    if (e.boltT <= 0 && los && dist < 12 && e.state !== 'pain') { e.boltT = rnd(4, 5.5); e.state = 'attack'; e.t = 0; e.didHit = true; lightningAt(P.x + (P.vx || 0) * 0.3, P.y + (P.vy || 0) * 0.3, 1.0, e.d.dmg * 1.6); play('stormcaller', 0.6, 1, { x: e.x, y: e.y }); firstHint('lightning', 'GLÖDANDE MARK: BLIXTEN SLÅR NED – FLYTTA DIG. BLIXTSTÄNGER DRAR TILL SIG DEN.'); return true; }
    return false;
  },
  cloudgiant(e, dt, dist, los) { // blåser bort dig
    e.blowT = (e.blowT ?? rnd(3, 5)) - dt;
    if (e.blowing > 0) { e.blowing -= dt; e.state = 'attack'; if (los && dist < 9) { const k = 4.2 * Math.max(0, 1 - mod('windResist')) * dt; tryMove(P, (P.x - e.x) / dist * k, (P.y - e.y) / dist * k, 0.24); }
      if (!settings.lowfx && Math.random() < dt * 20) { const a = Math.atan2(P.y - e.y, P.x - e.x) + rnd(-0.3, 0.3); particles.push({ x: e.x + Math.cos(a), y: e.y + Math.sin(a), z: rnd(0.4, 1.2), vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, vz: 0, life: 0.5, maxLife: 0.5, img: fx.parts.wind ? fx.parts.wind[0] : fx.hit[1], size: 0.09, add: true, tint: [230, 240, 255] }); }
      return true; }
    if (e.blowT <= 0 && los && dist < 8 && dist > 2) { e.blowT = rnd(5, 7); e.blowing = 1.6; e.t = 0; play('giant_blow', 0.9, 1, { x: e.x, y: e.y }); return true; }
    return false;
  },
};
function eliteV9Tick(e, dt) { // elitegenskaper från version 9
  if (!e.elite || e.dead || !e.alert) return;
  const dist = Math.hypot(P.x - e.x, P.y - e.y);
  if (hasMod(e, 'tempo')) { if (!e.tb) { e.tb = { x: e.x, y: e.y, r: 2, t: Infinity }; timeBubbles.push(e.tb); } e.tb.x = e.x; e.tb.y = e.y; e.slow = 0; } // bubblan följer med men saktar inte in den själv
  if (hasMod(e, 'storm')) { e.stT = (e.stT ?? rnd(3, 5)) - dt; if (e.stT <= 0 && dist < 12 && hasLOS(e.x, e.y, P.x, P.y)) { e.stT = rnd(5, 7); lightningAt(P.x, P.y, 1.1, 8 + run.depth * 2); } }
  if (hasMod(e, 'gusty')) { e.guT = (e.guT ?? rnd(3, 5)) - dt; if (e.guT <= 0 && dist < 7) { e.guT = rnd(5, 7); e.gusting = 1; play('wind_gust', 0.5, 1.2, { x: e.x, y: e.y }); }
    if (e.gusting > 0) { e.gusting -= dt; const k = 3.5 * Math.max(0, 1 - mod('windResist')) * dt; if (dist > 0.3) tryMove(P, (P.x - e.x) / dist * k, (P.y - e.y) / dist * k, 0.24); } }
}
function clockRewind(e) { // urverkssoldaten: den första döden räknas inte
  if (e.d.ai !== 'clocksoldier' || e.rewound || e.boss) return false;
  e.rewound = true; e.hp = 1; e.rewindT = 2.2; e.burn = 0; e.poison = 0; spawnText(e.x, e.y, 'LINDAS UPP…', '#e0c070'); play('clock_rewind', 0.7, 0.8, { x: e.x, y: e.y }); firstHint('rewind', 'URVERKSSOLDATEN LINDAS UPP IGEN – SLÅ TILL MEDAN DEN LIGGER.');
  return true;
}
// ---------- Version 9: Urmakaren och Stormfågeln ----------
Object.assign(BOSS_AI, {
  clockmaker(b, dt, dist, ang, ph) { // sågklingor, tidsbubblor och en hand som vrider tillbaka tiden
    const fast = ph === 3 ? 1.3 : 1;
    b.hist = b.hist || []; b.histT = (b.histT || 0) - dt; if (b.histT <= 0) { b.histT = 0.5; b.hist.push(b.hp); if (b.hist.length > 12) b.hist.shift(); }
    if (b.state === 'gears') { if (b.t < 0.05 || (ph >= 2 && Math.abs(b.t - 0.45) < dt)) { const n = 3 + ph; for (let i = 0; i < n; i++) { const a = ang + (i - (n - 1) / 2) * 0.22; projectiles.push({ x: b.x + Math.cos(a) * 1.2, y: b.y + Math.sin(a) * 1.2, z: 0.45, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, dmg: b.d.dmg * 0.5, src: b, kind: 'esaw', life: 4, bounces: 2 }); } play('clockmaker_gears', 0.7); }
      if (b.t > 1) { b.state = 'idle'; b.t = 0; b.cd = rnd(1.1, 1.6) / fast; } return; }
    if (b.state === 'bubble') { if (b.t < 0.05) { for (let i = 0; i < ph; i++) timeBubbles.push({ x: P.x + rnd(-1.5, 1.5), y: P.y + rnd(-1.5, 1.5), r: 2.4, t: 5 }); play('time_bubble', 0.9); bossWarn(b, 'URMAKAREN STANNAR TIDEN!'); }
      if (b.t > 0.8) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return; }
    b.cd -= dt;
    if (b.cd <= 0 && hasLOS(b.x, b.y, P.x, P.y)) { b.t = 0; b.didHit = false; b.state = Math.random() < 0.3 ? 'bubble' : 'gears'; return; }
    if (dist > 5) bossMove(b, ang, b.d.speed * fast * dt * (b.slow > 0 ? 0.5 : 1)); else if (dist < 3) bossMove(b, ang + Math.PI, b.d.speed * dt * 0.6);
  },
  thunderbird(b, dt, dist, ang, ph) { // dyker, kallar på åskan och blåser
    const fast = ph === 3 ? 1.35 : 1;
    if (b.state === 'dive') { const sp = 9 * fast * dt; bossMove(b, b.diveA, sp); if (!b.didHit && dist < 1.8) { b.didHit = true; run.cause = b.d.name; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); P.shake = Math.max(P.shake, 2); } if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = rnd(1, 1.5) / fast; } return; }
    if (b.state === 'storm') { if (b.t < 0.05) { play('thunderbird_storm', 0.9); bossWarn(b, 'STORMEN BRYTER LÖS!'); for (let i = 0; i < 3 + ph * 2; i++) setTimeout(() => { if (!b.dead && state === 'play') lightningAt(P.x + rnd(-2.5, 2.5), P.y + rnd(-2.5, 2.5), 0.9, b.d.dmg * 0.7); }, i * 280); }
      if (b.t > 1.4) { b.state = 'idle'; b.t = 0; b.cd = 1; } return; }
    b.cd -= dt;
    if (b.cd <= 0 && hasLOS(b.x, b.y, P.x, P.y)) { b.t = 0; b.didHit = false; if (Math.random() < 0.45) { b.state = 'dive'; b.diveA = ang; play('thunderbird_dive', 0.9); bossWarn(b, 'STORMFÅGELN DYKER!'); } else b.state = 'storm'; return; }
    if (dist > 6) bossMove(b, ang, b.d.speed * fast * dt); else bossMove(b, ang + Math.PI / 2, b.d.speed * dt * 0.8); // cirklar runt dig
  },
});
Object.assign(BOSS_SPECIAL, {
  clockmaker(b, dt, dist, ang, ph) {
    if (b.spK && b.hist && b.hist.length > 6 && b.hist[0] > b.hp + b.maxHp * 0.05 && (b.rewinds || 0) < ph) { // vrider tillbaka tiden: får tillbaka hälsan från för fem sekunder sedan
      if (b.t < 0.05) { b.rewinds = (b.rewinds || 0) + 1; const to = Math.min(b.maxHp, b.hist[0]); spawnText(b.x, b.y, `+${Math.round(to - b.hp)}`, '#e0c070'); b.hp = to; b.hist = []; play('clockmaker_rewind', 1); bossWarn(b, 'URMAKAREN VRIDER TILLBAKA TIDEN!'); flashes.push({ x: b.x, y: b.y, t: 0.3, r: 6, col: [230, 200, 120] }); }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return;
    }
    if (b.t < 0.05) { say('URVERKET SÄTTS I GÅNG', 1.5); play('clockmaker_laugh', 0.9); for (let i = 0; i < 1 + ph; i++) { const s = freeSpotFar(3, 6); if (s) { const e = makeEnemy(ENEMY_DEFS['ĳ'] ? (i % 2 ? 'Ĵ' : 'ĳ') : 'S', s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 6); } } }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
  thunderbird(b, dt, dist, ang, ph) {
    if (b.spK) { // stormvinden knuffar dig mot kanterna
      if (b.t < 0.05) { bossWarn(b, 'STORMVINDEN!'); play('wind_gust', 1); }
      const k = 3.4 * Math.max(0, 1 - mod('windResist')) * dt; if (dist > 0.5) tryMove(P, (P.x - b.x) / dist * k, (P.y - b.y) / dist * k, 0.24);
      if (b.t > 1.8) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return;
    }
    if (b.t < 0.05) { say('HARPYORNA SVARAR PÅ ROPET', 1.5); play('thunderbird_cry', 0.9); for (let i = 0; i < 1 + ph; i++) { const s = freeSpotFar(3, 6); if (s) { const e = makeEnemy(ENEMY_DEFS['Ķ'] ? 'Ķ' : 'V', s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 6); } } }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
});
TAUNTS.clockmaker = ['DIN TID ÄR UTE', 'TICK, TACK', 'JAG HAR ALL TID I VÄRLDEN'];
TAUNTS.thunderbird = ['FALL!', 'STORMEN ÄR MIN', 'UPP HIT KOMMER INGEN'];
function updateEsaw(p, dt) { // urmakarens klingor studsar mot väggarna
  if (solid(p.x, p.y)) { const ox = p.x - p.vx * dt, oy = p.y - p.vy * dt; if (p.bounces > 0) { p.bounces--; if (solid(p.x, oy)) p.vx = -p.vx; if (solid(ox, p.y)) p.vy = -p.vy; p.x = ox; p.y = oy; play('saw_bounce', 0.3, 1.1, { x: p.x, y: p.y }); return; } p.dead = true; return; }
  if (p.life <= 0) { p.dead = true; return; }
  if (p.friendly) { for (const e of ents) if (!e.dead && !e.hidden && Math.hypot(e.x - p.x, e.y - p.y) < 0.35 * e.d.size * (e.boss ? 1.8 : 1)) { hurtEnemy(e, p.dmg, p.x, p.y, {}); p.dead = true; play('saw_hit', 0.6); return; } return; } // tillbakablåsta klingor
  if (Math.hypot(P.x - p.x, P.y - p.y) < 0.4 && !(P.jz > 0.22)) { p.dead = true; run.cause = 'SÅGKLINGAN'; hurtPlayer(p.dmg, p.x, p.y, 'proj'); }
}
Object.assign(USES, {
  chimes(pr) { pr.used = true; pr.img = pr.frames[1] || pr.img; play('chimes', 0.9); say('KLOCKSPELET STANNAR URVERKEN', 2); for (const s of saws) s.stopT = tmr + 6; for (const e of ents) if (!e.dead && ['clocksoldier', 'gearspider', 'timekeeper'].includes(e.d.ai)) { e.stun = 4; spawnText(e.x, e.y, 'STANNAR', '#e0c070'); } },
  cloudchest(pr) { pr.used = true; pr.img = pr.frames[1] || pr.img; play('cloudchest_open', 0.8); stat('cloudChests');
    const g = Math.round((25 + run.depth * 7) * (1 + mod('goldFind') + (lvl.biome === 'sky' ? mod('skyGold') : 0))); run.gold += g; run.goldEarned = (run.goldEarned || 0) + g; spawnText(pr.x, pr.y, `+${g}`, '#ffd24a'); play('coin', 0.7);
    dropItem(Math.random() < 0.4 ? 'cardpick' : Math.random() < 0.5 ? 'feather' : 'potion', pr.x, pr.y); say(`MOLNKISTAN: ${g} GULD`, 1.5); },
});
Object.assign(PROJ_UPD_V8, { saw: updateSaw, spear: updateSpear, esaw: updateEsaw });
Object.assign(PROJ_DRAW_V8, {
  saw: o => { const f = fx.props.sawblade; drawSprite(f ? f[Math.floor(tmr * 18) % f.length] : fx.hit[1], o.x, o.y, 0.16, o.z - 0.06, false, null, 0, 0.6); },
  esaw: o => { const f = fx.props.sawblade; drawSprite(f ? f[Math.floor(tmr * 18) % f.length] : fx.hit[1], o.x, o.y, 0.22, o.z - 0.08, false, null, 0, 0.6, false, [255, 200, 150]); },
  spear: o => drawSprite(spr.pick_spear || spr.pick_harpoon || fx.hit[1], o.x, o.y, 0.08, o.z - 0.03, Math.cos(Math.atan2(o.vy, o.vx) - view.a) < 0, null, 0, 0.6),
});
// ---------- Version 9: Kampanjen – sex kapitel i fast ordning ----------
const CAMPAIGN = [
  { name: 'KAPITEL 1: KRYPTAN', biomes: ['dungeon', 'caves'], boss: 'demon', text: 'MUNKARNA GRÄVDE FÖR DJUPT. DU KLIVER NER I DERAS GÅNGAR FÖR ATT TA REDA PÅ VARFÖR.' },
  { name: 'KAPITEL 2: DE DÖDAS MARKER', biomes: ['graveyard', 'forest'], boss: 'ghost', text: 'UNDER BORGEN LIGGER EN KYRKOGÅRD SOM INTE VILL SOVA. VÅLNADEN VAKTAR VÄGEN VIDARE.' },
  { name: 'KAPITEL 3: IS OCH ELD', biomes: ['frost', 'volcano'], boss: 'flame', text: 'BERGET ANDAS KYLA OCH ELD. ELDKUNGEN HÅLLER DÖRREN MOT DJUPET STÄNGD.' },
  { name: 'KAPITEL 4: SANDEN', biomes: ['tomb', 'swamp'], boss: 'pharaoh', text: 'FARAONENS GRAV ÄR ÄLDRE ÄN KRYPTAN. HAN VAR DEN FÖRSTA SOM HÖRDE BÖNEN.' },
  { name: 'KAPITEL 5: DJUPET', biomes: ['crystal', 'sunken'], boss: 'leviathan', text: 'UNDER KRISTALLERNA LIGGER EN SJUNKEN STAD. NÅGOT STORT RÖR SIG I VATTNET.' },
  { name: 'KAPITEL 6: HIMLEN', biomes: ['clock', 'sky'], boss: 'thunderbird', text: 'KLOCKTORNET LEDER UPP TILL MOLNEN. DÄR UPPE VÄNTAR STORMEN – OCH SLUTET.' },
];
const campDone = () => (profile.campaign || 0); // antal klarade kapitel
function showCampaign() {
  CardUI.list('KAMPANJEN', `${campDone()} AV ${CAMPAIGN.length} KAPITEL KLARADE · VARJE KAPITEL: TVÅ VÅNINGAR OCH EN BOSS`, CAMPAIGN.map((c, i) => {
    const open = i <= campDone(), done = i < campDone();
    return { label: (done ? '★ ' : open ? '▶ ' : '☆ ') + c.name, text: open ? c.text + ` (${c.biomes.map(b => BIOME_NAME[b]).join(' → ')} → ${BOSSES[c.boss] ? BOSSES[c.boss].name : ''})` : 'LÅST – KLARA FÖRRA KAPITLET', dim: !open, color: done ? '#ffd24a' : '',
      onClick: open ? () => { CardUI.close(); beginCampaign(i); } : undefined };
  }), () => refreshTitle());
}
function beginCampaign(ch) {
  document.getElementById('title').hidden = true; canvas.focus(); ensureAudio(); practice = null; clearInterval(hubWatch);
  newRun(RNG.randomSeed(), false); run.campaign = { ch }; run.cmode = ''; P.hp = maxHp();
  const give = Math.min(WEAPONS.length - 1, 2 + ch * 3); for (let i = 1; i <= give; i++) { P.has[i] = true; P.mags[i] = effMag(i); } // senare kapitel börjar med fler vapen
  for (const k in AMMO) if (k !== 'none' && k !== 'mana') P.ammo[k] = Math.round(AMMO[k].max * (0.2 + ch * 0.06));
  run.gold += ch * 60; run.lvl = 1 + ch * 2; run.talentQ = ch * 2; // och med talanger att välja
  loadFloor(1); lockPointer(); if (window.Music) Music.sting('chapter');
  const go = () => { closeUI(); openUI(() => draftUI(drawCards(3 + meta('choice')), { title: CAMPAIGN[ch].name, subtitle: 'VÄLJ ETT STARTKORT', skipLabel: 'INGET KORT' }, card => { gainCard(card); closeUI(); })); };
  openUI(() => CardUI.list(CAMPAIGN[ch].name, '', [{ label: CAMPAIGN[ch].text, text: 'TRYCK FÖR ATT BÖRJA', onClick: () => { CardUI.close(); go(); } }], go)); // raden (som texten säger) eller STÄNG går vidare till kortvalet
}
function campaignLevel(depth) {
  const c = CAMPAIGN[run.campaign.ch];
  if (depth > c.biomes.length) { const L = Gen.boss(RNG.hash(run.seed + ':kampanj:boss'), { arena: BOSSES[c.boss].arena, boss: c.boss }); L.bossId = c.boss; return L; }
  return Gen.floor(RNG.hash(run.seed + ':kampanj:' + depth), Math.min(5, 1 + run.campaign.ch + depth - 1), { shop: depth === 2, biome: c.biomes[depth - 1], weapon: null });
}
function campaignWon() { // kapitlet klart
  const ch = run.campaign.ch; profile.campaign = Math.max(campDone(), ch + 1); profile.souls += 40 + ch * 15; saveProfile(); play('win', 0.8);
  if (profile.campaign >= CAMPAIGN.length) { profile.finaleOpen = true; saveProfile(); }
  say(ch + 1 >= CAMPAIGN.length ? 'KAMPANJEN ÄR KLAR – KRÖNIKANS SLUT ÄR ÖPPET I LÄGRET!' : `${CAMPAIGN[ch].name} KLART! +${40 + ch * 15} SJÄLAR – NÄSTA KAPITEL ÄR ÖPPET`, 4);
  setTimeout(() => endRun(true), 1800);
}
