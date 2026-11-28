// ---------- Version 27: fler banor ----------
// Läser level.plan27 (planritningen: ring, cross, gauntlet, court) och level.scenes27 (scener och rumsmallar, gen.js). Allt på kartan är vanliga tecken;
// spelet visar bara planritningens namn när våningen börjar och scenens namn första gången man kliver in i rummet (en kontroll var fjärdedels sekund).
const V27_PLAN_TXT = { ring: 'RINGBORGEN: SALARNA LIGGER I EN RING RUNT VAKTARENS SAL', cross: 'KORSFÄSTNINGEN: FYRA FLYGLAR KRING EN MITTGÅRD',
  gauntlet: 'STORMLÖPET: EN LÅNG RAD AV SALAR FRAM TILL VAKTAREN', court: 'BORGGÅRDEN: EN STOR GÅRD MED BYGGNADER RUNT OM' };
const V27_SCENE_TXT = { pillarhall: 'PELARSALEN', cloister: 'KORSGÅNGEN – SE UPP I NISCHERNA', stacks: 'HYLLGÅNGARNA', throne: 'TRONSALEN', lavabridge: 'BRON ÖVER LAVAN' };
let v27 = { lvl: null, scenes: [], seen: {}, t: 0, shown: [] };
function v27Start() {
  v27 = { lvl, scenes: [], seen: {}, t: 0, shown: [] };
  if (window.__game && !window.__game.v27) window.__game.v27 = () => ({ plan: v27.lvl && v27.lvl.plan27 || null, scenes: v27.scenes.slice(), shown: v27.shown.slice() });
  if (!lvl || !run || run.custom || run.practiceT || lvl.arena || lvl.hub) return;
  if (lvl.plan27 && V27_PLAN_TXT[lvl.plan27]) { say(V27_PLAN_TXT[lvl.plan27], 3.5); v27.shown.push(lvl.plan27); }
  const rm = lvl.roomMask;
  if (Array.isArray(lvl.scenes27) && Array.isArray(rm)) for (const s of lvl.scenes27) if (s && V27_SCENE_TXT[s.kind] && Number.isInteger(s.room)) v27.scenes.push({ kind: s.kind, room: s.room });
}
function updateV27(dt) {
  if (v27.lvl !== lvl || !v27.scenes.length || state !== 'play') return;
  if ((v27.t -= dt) > 0) return;
  v27.t = 0.25;
  const x = Math.floor(P.x), y = Math.floor(P.y), rm = lvl.roomMask;
  if (!rm || y < 0 || y >= rm.length || x < 0 || x >= rm[y].length || rm[y][x] === '-') return;
  const k = rm[y].charCodeAt(x) - 48, s = v27.scenes.find(o => o.room === k);
  if (!s || v27.seen[k]) return;
  v27.seen[k] = 1; v27.shown.push(s.kind); say(V27_SCENE_TXT[s.kind], 2.5);
}

// ---------- Version 11: sporkastaren, spegelskölden och piskan ----------
let pclouds = []; // spelarens giftmoln
function sporeFire(wp, base) {
  const sp = 10, a = P.a + rnd(-1, 1) * wp.spread * (1 - WS.aim);
  projectiles.push({ x: P.x + Math.cos(a) * 0.45, y: P.y + Math.sin(a) * 0.45, z: 0.42, vz: 1.1 + P.pitch * -0.01, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: base, friendly: true, kind: 'pspore', life: 3 });
  noise(4 * (1 - mod('noiseReduce')));
}
function sporeBurst(x, y, dmg) {
  const big = up('sl_cloud');
  pclouds.push({ x, y, t: big ? 6 : 4, r: big ? 2.2 : 1.6, dps: 2 + dmg * 0.8, tick: 0 });
  play('spore_burst', 0.7, rnd(0.9, 1.1), { x, y });
  for (let i = 0; i < 12; i++) { const a = rnd(0, TAU), s = rnd(0.6, 2); particles.push({ x, y, z: rnd(0.1, 0.5), vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rnd(0, 0.6), life: 0.8, maxLife: 0.8, img: fx.parts.spore2 ? fx.parts.spore2[i % fx.parts.spore2.length] : fx.hit[1], size: 0.1, tint: [150, 230, 110] }); }
}
function updatePspore(p, dt) {
  p.vz = (p.vz || 0) - 3.2 * dt; p.z += p.vz * dt;
  const hit = ents.find(e => !e.dead && !e.dying && !e.hidden && !e.dormant && Math.hypot(e.x - p.x, e.y - p.y) < 0.4 * e.d.size * (e.boss ? 1.8 : 1));
  if (!hit && p.z > 0.04 && !solid(p.x, p.y) && p.life > 0) return;
  p.dead = true; let x = p.x, y = p.y; if (solid(x, y)) { x -= p.vx * dt * 1.5; y -= p.vy * dt * 1.5; }
  if (hit) { const k = hurtEnemy(hit, p.dmg, x, y, {}); hitMark = 0.12; hitKill = hitKill || k; lvlStat.hits++; }
  sporeBurst(x, y, p.dmg);
}
function cloudsTick(dt) {
  for (const c of pclouds) {
    c.t -= dt; c.tick -= dt;
    efx2Ground(c, 'poison'); // version 25.1: sporkastarens giftmoln (Effekseer)
    if (!settings.lowfx && Math.random() < dt * 8) { const a = rnd(0, TAU), r = rnd(0, c.r); particles.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, z: rnd(0.05, 0.7), vx: rnd(-0.2, 0.2), vy: rnd(-0.2, 0.2), vz: 0.12, life: 1, maxLife: 1, img: fx.parts.spore2 ? fx.parts.spore2[0] : fx.hit[1], size: 0.1, tint: [140, 220, 100] }); }
    if (c.tick > 0) continue; c.tick = 0.25;
    for (const e of ents) if (!e.dead && !e.dying && !e.hidden && !e.dormant && Math.hypot(e.x - c.x, e.y - c.y) < c.r + (e.boss ? 1 : 0)) {
      if (e.d.fungus || e.id === 'mycelmother') continue; // svampfolket tål sina egna sporer (och läker sig, se nedan)
      hurtEnemy(e, c.dps * 0.25, e.x, e.y, { noProc: true, dot: true }); e.poison = Math.max(e.poison || 0, 1); }
    if (up('sl_heal') && Math.hypot(P.x - c.x, P.y - c.y) < c.r) heal(0.7, true);
  }
  pclouds = pclouds.filter(c => c.t > 0);
}
const inSpores = (x, y, pad = 0) => pclouds.some(c => Math.hypot(c.x - x, c.y - y) < c.r + pad) || spores.some(c => Math.hypot(c.x - x, c.y - y) < 1.4 + pad) || (map[y | 0] && map[y | 0][x | 0] === 'Ť');

const NOREFL = new Set(['log', 'rock', 'barrel', 'magma', 'pgren', 'axe', 'stone']);
function shieldBlock(p) { // spegelskölden studsar skotten tillbaka
  if (!WS.block || p.friendly || !p.src || NOREFL.has(p.kind)) return false;
  if (Math.hypot(p.x - P.x, p.y - P.y) > 0.95) return false;
  let off = Math.atan2(p.y - P.y, p.x - P.x) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
  if (Math.abs(off) > (up('ms_aura') ? Math.PI : 1.05)) return false;
  const parry = (tmr - (WS.blockAt || 0)) < 0.3, src = p.src && p.src !== P && !p.src.dead && p.src.x !== undefined ? p.src : null;
  const a = parry && src ? Math.atan2(src.y - P.y, src.x - P.x) : P.a, sp = Math.max(9, Math.hypot(p.vx, p.vy) * 1.3);
  p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.x = P.x + Math.cos(a) * 0.6; p.y = P.y + Math.sin(a) * 0.6;
  p.friendly = true; p.reflK = p.kind; p.kind = 'refl'; p.life = 2; p.src = P;
  p.dmg = Math.max(4, p.dmg || 5) * 1.5 * (up('ms_reflect') ? 2 : 1) * (1 + mod('reflectDmg'));
  play('mirrorshield_block', 0.8, rnd(1.0, 1.15)); sparks(p.x, p.y, 0.5, 5); WS.kick = 0.15; stat('reflects');
  if (parry) { spawnText(P.x + Math.cos(P.a), P.y + Math.sin(P.a), 'PARERAT!', '#c0e8ff'); hitStop = Math.max(hitStop, 0.06); if (up('ms_parry')) WS.parryCharge = true; }
  firstHint('shieldblock', 'HÅLL HÖGER MUSKNAPP FÖR ATT HÅLLA UPP SKÖLDEN – SKOTTEN STUDSAR TILLBAKA.');
  return true;
}
function shieldDmg(d, sx, sy, kind) { // skölden tar emot slag framifrån
  if (!WS.block || sx === undefined || kind === 'dot') return d;
  let off = Math.atan2(sy - P.y, sx - P.x) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
  if (Math.abs(off) > (up('ms_aura') ? Math.PI : 1.05)) return d;
  play('mirrorshield_block', 0.6, rnd(0.8, 1)); P.shake = Math.max(P.shake, 0.4);
  if (kind === 'melee' && (tmr - (WS.blockAt || 0)) < 0.3) { const e = ents.find(o => !o.dead && !o.boss && Math.hypot(o.x - P.x, o.y - P.y) < 2.2); if (e) { e.stun = Math.max(e.stun || 0, 1.4); spawnText(e.x, e.y, 'PARERAT!', '#c0e8ff'); } if (up('ms_parry')) WS.parryCharge = true; return 0; }
  return d * 0.25;
}
function shieldBash(wp) {
  if (WS.cd > 0 || WS.state !== 'idle' || WS.block) return;
  WS.shot = 0; WS.cd = effDelay(wp); WS.kick = 0.3; lvlStat.shots++; play('shield_bash', 0.8, rnd(0.9, 1.1)); noise(3);
  const charged = !!WS.parryCharge; WS.parryCharge = false;
  const reach = 1.8 + mod('whipReach') * 0.5, arc = 0.8, strong = up('ms_bash');
  let hits = 0;
  for (const e of ents) {
    if (e.dead || e.dying || e.hidden || e.dormant) continue;
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
    if (d > reach + e.d.size * 0.3 || Math.abs(off) > arc) continue;
    const k = hurtEnemy(e, wp.dmg * meleeMul() * (charged ? 2.5 : 1) * (strong ? 1.3 : 1), e.x, e.y, { melee: true, bash: true }); hits++; hitKill = hitKill || k;
    if (e.blockUp) { e.blockUp = false; e.blockT = 1.6; spawnText(e.x, e.y, 'SKÖLDEN SLÅS UNDAN', '#c0e8ff'); }
    if (!k && !e.boss && !e.dead) { const f = (strong || charged ? 9 : 5) / Math.max(0.6, e.d.size); e.knock = { vx: dx / (d || 1) * f, vy: dy / (d || 1) * f, t: 0.3 }; e.stun = Math.max(e.stun || 0, strong ? 1.2 : 0.5); }
  }
  if (hits) { play('spear_hit', 0.6, 0.8); hitMark = 0.12; hitStop = Math.max(hitStop, charged ? 0.09 : 0.05); lvlStat.hits++; if (charged) { P.shake = Math.max(P.shake, 1); spawnText(P.x + Math.cos(P.a) * 1.2, P.y + Math.sin(P.a) * 1.2, 'MOTSLAG!', '#ffd24a'); } }
}
function whipCrack(wp) {
  if (WS.cd > 0 || WS.state !== 'idle') return;
  WS.shot = 0; WS.cd = effDelay(wp); WS.kick = 0.2; lvlStat.shots++; play('whip_crack', 0.8, rnd(0.95, 1.1)); noise(4);
  const reach = 3.4 + (up('wh_reach') ? 1.4 : 0) + mod('whipReach'), arc = 0.42, max = up('wh_multi') ? 3 : 2;
  const cand = [];
  for (const e of ents) {
    if (e.dead || e.dying || e.hidden || e.dormant) continue;
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
    if (d > reach + e.d.size * 0.3 || Math.abs(off) > Math.max(arc, 0.35 * e.d.size / Math.max(1, d)) || !hasLOS(P.x, P.y, e.x, e.y)) continue;
    cand.push({ e, d, dx, dy });
  }
  cand.sort((a, b) => a.d - b.d);
  let pulled = 0;
  for (const { e, d, dx, dy } of cand.slice(0, max)) {
    const tip = d > reach * 0.7; // piskans spets smäller hårdast
    const k = hurtEnemy(e, wp.dmg * meleeMul() * (tip ? 1.5 : 1), e.x, e.y, { melee: true, crit: tip }); hitKill = hitKill || k;
    if (tip) spawnText(e.x, e.y, 'SNÄRT!', '#ffd24a');
    if (up('wh_fire') && !e.dead) e.burn = Math.max(e.burn || 0, 3);
    if (!e.dead && !e.boss && (e.d.size <= 1.1 || up('wh_pull')) && d > 1.4) { const f = Math.min(11, (d - 1) * 4.5); e.knock = { vx: -dx / d * f, vy: -dy / d * f, t: 0.22, pull: true }; e.stun = Math.max(e.stun || 0, 0.6); pulled++; }
  }
  if (up('wh_pull')) for (const it of items) { if (it.taken) continue; const dx = it.x - P.x, dy = it.y - P.y, d = Math.hypot(dx, dy); let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off)); if (d < reach && d > 0.8 && Math.abs(off) < arc && hasLOS(P.x, P.y, it.x, it.y)) { it.x = P.x + dx / d * 0.6; it.y = P.y + dy / d * 0.6; } }
  if (cand.length) { hitMark = 0.12; hitStop = Math.max(hitStop, 0.04); lvlStat.hits++; }
  if (pulled) play('whip_pull', 0.7);
  const L = cand.length ? Math.min(reach, cand[0].d) : reach;
  for (let i = 1; i <= 10; i++) { const k = i / 10, w = Math.sin(k * Math.PI) * 0.25; particles.push({ x: P.x + Math.cos(P.a) * L * k - Math.sin(P.a) * w, y: P.y + Math.sin(P.a) * L * k + Math.cos(P.a) * w, z: 0.45 - k * 0.1, vx: 0, vy: 0, vz: 0, life: 0.14, maxLife: 0.14, img: fx.parts.whip ? fx.parts.whip[0] : fx.hit[1], size: 0.05, tint: up('wh_fire') ? [255, 160, 80] : [160, 110, 70] }); }
}
function weaponV11Tick(wp, dt) { // spegelsköldens block på högerklick
  const blk = !!(wp.mirrorshield && aimDown && WS.state === 'idle');
  if (blk && !WS.block) { WS.blockAt = tmr; play('mirrorshield_block', 0.25, 0.7); }
  WS.block = blk;
  if (wp.mirrorshield || wp.whip) WS.aim = 0; // skölden och piskan siktar inte
}

// ---------- Version 11: spegelväggar, studsplattor, sporpölar och teleporter ----------
const mirrorAt = (x, y) => { const c = map[y | 0] && map[y | 0][x | 0]; return c === 'š' || c === 'Ţ'; };
function mirrorBounce(p, px0, py0) { // skott studsar mot spegelväggar – även fiendernas
  if (!solid(p.x, p.y) || !mirrorAt(p.x, p.y) || (p.mb || 0) >= 5 || NOREFL.has(p.kind)) return false;
  p.mb = (p.mb || 0) + 1; const hx = solid(p.x, py0), hy = solid(px0, p.y);
  if (hx) p.vx = -p.vx; if (hy) p.vy = -p.vy; if (!hx && !hy) { p.vx = -p.vx; p.vy = -p.vy; }
  p.x = px0; p.y = py0; if (p.friendly && p.dmg) p.dmg *= 1 + mod('reflectDmg');
  play('mirror_deflect', 0.4, rnd(0.9, 1.2), { x: p.x, y: p.y }); sparks(p.x, p.y, p.z || 0.5, 3);
  return true;
}
function mirrorShot(hx, hy, dx, dy, side, dmg, n, vis) { // kulan studsar i speglarna
  if (side === 0) dx = -dx; else dy = -dy;
  const w2 = cast(hx, hy, dx, dy, 24);
  let best = null, bd = w2.dist;
  for (const e of ents) {
    if (e.dead || e.hidden) continue;
    const rx = e.x - hx, ry = e.y - hy, along = rx * dx + ry * dy;
    if (along > 0.05 && along < bd && Math.abs(rx * dy - ry * dx) < 0.3 * e.d.size * (e.boss ? 1.8 : 1)) { best = e; bd = along; }
  }
  if (vis) play('mirror_deflect', 0.25, rnd(1, 1.3), { x: hx, y: hy });
  if (best) { if (vis) zap(hx, hy, best.x, best.y, [200, 235, 255]); const k = hurtEnemy(best, dmg * (1 + mod('reflectDmg')), best.x, best.y, { noProc: true }); hitMark = 0.15; hitKill = hitKill || k; return; }
  const ex = hx + dx * (w2.dist - 0.04), ey = hy + dy * (w2.dist - 0.04);
  if (vis) zap(hx, hy, ex, ey, [200, 235, 255]);
  if (w2.dist < 24 && mirrorAt(ex + dx * 0.08, ey + dy * 0.08) && n > 0) mirrorShot(ex, ey, dx, dy, w2.side, dmg * 0.9, n - 1, vis);
  else if (vis && w2.dist < 24) spawnImpact(ex, ey, rnd(0.3, 0.6));
}
let pads = [], tports = [], phantoms = [];
function setupV11() {
  pclouds = []; phantoms = []; pads = []; tports = []; P.launch = null; P.halluT = 0; P.tpLock = ''; WS.block = false; WS.parryCharge = false;
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (map[y][x] === 'ţ') pads.push({ x: x + 0.5, y: y + 0.5, t: 9 });
  const tp = []; for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (map[y][x] === 'ť') tp.push({ x, y });
  if (lvl.teleports && lvl.teleports.length) for (const pr of lvl.teleports) tports.push({ a: { x: pr.a.x, y: pr.a.y }, b: { x: pr.b.x, y: pr.b.y } });
  else for (let i = 0; i + 1 < tp.length; i += 2) tports.push({ a: tp[i], b: tp[i + 1] }); // utan level.teleports: para ihop i ordning
}
function tportTo(cx, cy) { for (const t of tports) { if (t.a.x === cx && t.a.y === cy) return t.b; if (t.b.x === cx && t.b.y === cy) return t.a; } return null; }
function updateV11(dt) {
  cloudsTick(dt);
  const cx = P.x | 0, cy = P.y | 0, c = map[cy] && map[cy][cx];
  // studsplattan: kastar dig långt framåt med lång lufttid
  if (c === 'ţ' && P.jz <= 0.001 && P.jv <= 0.01 && !P.launch) {
    const sp = Math.hypot(P.vx, P.vy), a = sp > 0.6 ? Math.atan2(P.vy, P.vx) : P.a, far = 1 + mod('bounceHeight');
    P.jv = 2.6; P.jz = 0.001; P.launch = { vx: Math.cos(a) * 5.5 * far, vy: Math.sin(a) * 5.5 * far, t: 0 }; P.dj = false;
    const pad = pads.find(o => Math.hypot(o.x - P.x, o.y - P.y) < 0.8); if (pad) pad.t = 0;
    play('bounce', 0.8, rnd(0.95, 1.1)); spawnPuff(P.x, P.y, 5); stat('bounces'); firstHint('bounce', 'STUDSPLATTAN KASTAR DIG FRAMÅT I DEN RIKTNING DU GÅR.');
  }
  if (P.launch) { P.launch.t += dt; tryMove(P, P.launch.vx * dt, P.launch.vy * dt, 0.24); if ((P.jz <= 0.02 && P.launch.t > 0.12) || P.launch.t > 2.5) { P.launch = null; if (P.jv < 0) P.jv = 0; } }
  for (const o of pads) o.t += dt;
  // sporpölen: förvirrar och ger syner
  if (c === 'Ť' && P.jz < 0.05 && (P.poolCd || 0) < tmr) {
    P.poolCd = tmr + 0.5; const k = Math.max(0, 1 - mod('sporeResist'));
    if (k > 0) { if (!(P.halluT > 0.5)) play('spore_confuse', 0.6); P.reverseT = Math.max(P.reverseT || 0, 1.8 * k); P.halluT = Math.max(P.halluT || 0, 4 * k); P.confT = Math.max(P.confT || 0, 0.6 * k); firstHint('sporepool', 'SPORPÖLAR VÄNDER PÅ STYRNINGEN OCH GER SYNER – SE UPP VAR DU GÅR.'); }
  }
  if (P.halluT > 0) { P.halluT -= dt; P.phT = (P.phT || 0) - dt;
    if (P.phT <= 0) { P.phT = rnd(0.7, 1.4); const keys = Object.keys(ENEMY_DEFS).filter(k => enemyFrames[k] && !ENEMY_DEFS[k].boss); const s = freeSpotFar(2.5, 7);
      if (s && keys.length) phantoms.push({ x: s[0], y: s[1], type: keys[(Math.random() * keys.length) | 0], t: 0, life: rnd(1.4, 2.4), flip: Math.random() < 0.5 }); } }
  for (const ph of phantoms) ph.t += dt; phantoms = phantoms.filter(ph => ph.t < ph.life);
  // teleportern
  if (c === 'ť' && P.jz < 0.2) { const key = cx + ',' + cy, to = tportTo(cx, cy);
    if (to && P.tpLock !== key) { const a = P.a; P.x = to.x + 0.5; P.y = to.y + 0.5; P.vx = P.vy = 0; P.tpLock = to.x + ',' + to.y; P.launch = null;
      P.iframe = Math.max(P.iframe, 0.25 + mod('teleportShield')); play('teleport', 0.8); flashes.push({ x: P.x, y: P.y, t: 0.2, r: 4, col: [200, 160, 255] }); spawnPuff(P.x, P.y, 6);
      for (let i = 0; i < 14; i++) { const b = i / 14 * TAU; particles.push({ x: P.x + Math.cos(b) * 0.5, y: P.y + Math.sin(b) * 0.5, z: rnd(0, 0.9), vx: -Math.cos(b) * 0.8, vy: -Math.sin(b) * 0.8, vz: 0.4, life: 0.5, maxLife: 0.5, img: fx.parts.illusion ? fx.parts.illusion[i % fx.parts.illusion.length] : fx.hit[1], size: 0.07, add: true, tint: [210, 170, 255] }); }
      P.a = a; stat('teleports'); firstHint('teleport', 'TELEPORTRARNA GÅR I PAR – KLIV I DEN ENA, KOM UT UR DEN ANDRA.'); } }
  else if (c !== 'ť') P.tpLock = '';
  // mycelbestar och mycelmodern läker sig i sporerna
  for (const e of ents) if (!e.dead && !e.dying && (e.d.ai === 'mycelbrute' || e.id === 'mycelmother') && e.hp < e.maxHp && inSpores(e.x, e.y, e.boss ? 1 : 0)) {
    e.hp = Math.min(e.maxHp, e.hp + e.maxHp * (e.boss ? 0.006 : 0.06) * dt); e.healFx = (e.healFx || 0) - dt;
    if (e.healFx <= 0) { e.healFx = 0.6; spawnText(e.x, e.y, '+', '#80e060'); if (P.weapon >= 0 && WEAPONS[P.weapon].sporelauncher) firstHint('mycelheal', 'SVAMPFOLKET LÄKER SIG I SPORER – LOCKA UT DEM UR MOLNEN.'); } }
}
function drawV11World(list) {
  for (const c of pclouds) if (Math.hypot(c.x - P.x, c.y - P.y) < 18) list.push({ x: c.x, y: c.y, k: 'v11', t: 'cl', o: c });
  for (const o of pads) if (Math.hypot(o.x - P.x, o.y - P.y) < 18) list.push({ x: o.x, y: o.y, k: 'v11', t: 'pad', o });
  for (const t of tports) for (const e of [t.a, t.b]) if (Math.hypot(e.x + 0.5 - P.x, e.y + 0.5 - P.y) < 18) list.push({ x: e.x + 0.5, y: e.y + 0.5, k: 'v11', t: 'tp', o: e });
  for (const ph of phantoms) list.push({ x: ph.x, y: ph.y, k: 'v11', t: 'ph', o: ph });
}
function drawV11Sprite(s) {
  const o = s.o;
  if (s.t === 'cl') { const f = fx.props.sporecloud; drawSprite(f ? f[Math.floor(tmr * 4 + o.x) % f.length] : fx.hit[1], o.x, o.y, o.r * 1.15, -0.15, false, null, 0, 0.4, false, [170, 240, 130], 0.45); return true; }
  if (s.t === 'pad') { const f = fx.props.bouncecap; if (f) drawSprite(f[o.t < 0.25 ? Math.min(f.length - 1, 1 + Math.floor(o.t / 0.125)) : 0], o.x, o.y, 0.85, 0, false, null, 0, 0.35); return true; }
  if (s.t === 'tp') { const f = fx.props.teleportfx; drawSprite(f ? f[Math.floor(tmr * 10) % f.length] : fx.hit[1], o.x + 0.5, o.y + 0.5, 0.95, 0, false, 1.2, 0, 0, true, [200, 160, 255]); return true; }
  if (s.t === 'ph') { const set = enemyFrames[o.type], d = ENEMY_DEFS[o.type]; if (!set || !d) return true; const k = Math.sin(Math.min(1, o.t / o.life) * Math.PI);
    drawSprite(set.idle[Math.floor(tmr * 6 + o.x) % set.idle.length], o.x + Math.sin(tmr * 3 + o.y) * 0.1, o.y, d.size * 1.15, 0, o.flip, null, 0, 0.3, false, [210, 150, 255], 1 - k * 0.55); return true; }
  return false;
}
function drawV11Hud(g) {
  if (P.halluT > 0) { const k = Math.min(1, P.halluT / 2); g.fillStyle = `rgba(150,60,200,${(0.07 + 0.05 * Math.sin(tmr * 3)) * k})`; g.fillRect(0, 0, W, VH); g.fillStyle = `rgba(60,200,90,${(0.05 + 0.04 * Math.sin(tmr * 2.1 + 1)) * k})`; g.fillRect(0, 0, W, VH); const im = hudImg.icon_spore; if (im) g.drawImage(im, 14, VH - 22, 8, 8); }
  if (WS.block) { g.fillStyle = 'rgba(190,225,255,0.07)'; g.fillRect(0, 0, W, VH); }
}

// ---------- Version 11: svampfolket och spegelfolket ----------
const AI_V11 = {
  sporling(e, dt, dist, los) { return false; }, // spricker i sporer när den dör (se v11Kill)
  mycelbrute(e, dt, dist, los) { return false; }, // läker sig i sporer (se updateV11)
  myconid(e, dt, dist, los) { // kastar sporbollar och väcker sporlingar
    e.sumT = (e.sumT ?? rnd(4, 7)) - dt;
    if (e.sumT <= 0 && los && dist < 11 && e.state !== 'pain' && ENEMY_DEFS['ŗ']) { e.sumT = rnd(8, 11);
      const mine = ents.filter(o => !o.dead && o.owner === e).length;
      if (mine < 3) { e.state = 'attack'; e.t = 0; e.didHit = true; play('myconid', 0.7, 1, { x: e.x, y: e.y });
        for (let i = 0; i < 2 && mine + i < 3; i++) { const a = rnd(0, TAU), x = e.x + Math.cos(a) * 0.8, y = e.y + Math.sin(a) * 0.8; if (!freeSpot(x, y, 0.3)) continue; const o = makeEnemy('ŗ', x, y); o.alert = true; o.minion = true; o.owner = e; o.d = { ...o.d, score: 20 }; ents.push(o); totalEnemies++; spawnPuff(x, y, 5); }
        return true; } }
    return false;
  },
  mirrorknight(e, dt, dist, los) { // håller upp skölden en stund, sänker den för att slå
    e.blockT = (e.blockT ?? rnd(0.5, 2)) - dt;
    if (e.blockT <= 0) { e.blockUp = !e.blockUp; if (e.blockUp) e.blockAt = tmr; e.blockT = e.blockUp ? rnd(2.2, 3.2) : rnd(1.6, 2.2); }
    if (e.blockUp && dist < e.d.range + 0.3 && e.cd <= 0) { e.blockUp = false; e.blockT = 1.8; } // sänker skölden för att hugga
    if (e.blockUp) e.slow = Math.max(e.slow || 0, 0.05);
    return false;
  },
  illusionist(e, dt, dist, los) { // skapar falska kopior av sig själv och byter plats med dem
    if (e.decoy) { e.cd = 99; e.life = (e.life ?? 12) - dt; if (e.life <= 0 || (e.owner && e.owner.dead)) { decoyPop(e); return true; }
      e.fakeT = (e.fakeT ?? rnd(1.5, 3)) - dt; if (e.fakeT <= 0 && los && e.state !== 'pain') { e.fakeT = rnd(2, 3.2); e.state = 'attack'; e.t = 0; e.didHit = true; } return false; }
    e.illuT = (e.illuT ?? rnd(2.5, 4)) - dt;
    if (e.illuT <= 0 && los && dist < 12 && e.state !== 'pain') { e.illuT = rnd(8, 11); const n = e.elite ? 3 : 2, spots = [];
      for (let i = 0; i < n; i++) { const a = rnd(0, TAU), r = rnd(1.5, 3), x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r; if (freeSpot(x, y, 0.35) && hasLOS(e.x, e.y, x, y)) spots.push([x, y]); }
      if (!spots.length) return false;
      play('illusionist', 0.7, 1, { x: e.x, y: e.y }); const ox = e.x, oy = e.y;
      const sw = spots[(Math.random() * spots.length) | 0]; e.x = sw[0]; e.y = sw[1]; spots[spots.indexOf(sw)] = [ox, oy]; // den äkta byter plats med en kopia
      for (const [x, y] of spots) { const o = makeEnemy('ś', x, y); o.decoy = true; o.owner = e; o.hp = o.maxHp = 1; o.alert = true; o.life = 12; o.d = { ...o.d, score: 0 };
        if (Math.random() < mod('illusionSight')) { o.ghost = 0.55; spawnText(x, y, 'ILLUSION', '#d0b0ff'); } ents.push(o); }
      for (const [x, y] of [[ox, oy], ...spots]) for (let i = 0; i < 6; i++) particles.push({ x, y, z: rnd(0.1, 0.9), vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(0, 0.5), life: 0.5, maxLife: 0.5, img: fx.parts.illusion ? fx.parts.illusion[i % fx.parts.illusion.length] : fx.hit[1], size: 0.08, add: true, tint: [210, 170, 255] });
      firstHint('illusion', 'ILLUSIONISTEN GÖR FALSKA KOPIOR – DE FÖRSVINNER VID EN TRÄFF. HITTA DEN ÄKTA.');
      return false; }
    return false;
  },
  shardling(e, dt, dist, los) { return false; }, // splittras i skärvor när den dör (se v11Kill)
  kingimg(e, dt, dist, los) { // spegelkungens spegelbild: står still och skjuter glasskärvor
    e.state = 'idle'; e.life = (e.life ?? 8) - dt; if (e.life <= 0 || !ents.some(o => o.id === 'mirrorking' && !o.dead && !o.dying)) { decoyPop(e, true); return true; }
    e.shotT = (e.shotT ?? rnd(1, 2)) - dt;
    if (e.shotT <= 0 && los) { e.shotT = rnd(1.8, 2.6); const a = Math.atan2(P.y - e.y, P.x - e.x); projectiles.push({ x: e.x + Math.cos(a) * 0.9, y: e.y + Math.sin(a) * 0.9, z: 0.6, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, dmg: 5, src: e, kind: 'glass', life: 3 }); }
    return true;
  },
};
function decoyPop(e, glass) { // en falsk kopia försvinner
  if (e.dead) return; e.dead = true; e.gibbed = true; e.hp = 0; e.hidden = true;
  play(glass ? 'glass_break' : 'illusion_pop', 0.6, rnd(0.9, 1.2), { x: e.x, y: e.y });
  for (let i = 0; i < 10; i++) { const a = rnd(0, TAU), s = rnd(0.5, 2); particles.push({ x: e.x, y: e.y, z: rnd(0.1, 1), vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rnd(0, 1), life: 0.6, maxLife: 0.6, img: glass ? (fx.parts.glassshard ? fx.parts.glassshard[i % fx.parts.glassshard.length] : fx.hit[1]) : (fx.parts.illusion ? fx.parts.illusion[i % fx.parts.illusion.length] : fx.hit[1]), size: 0.08, add: !glass, tint: glass ? [210, 235, 255] : [210, 170, 255] }); }
}
function glassBurst(x, y, n, dmg, friendly, src) { // skärvor åt alla håll
  for (let i = 0; i < n; i++) { const a = i / n * TAU + rnd(-0.2, 0.2), s = rnd(6, 8); projectiles.push({ x: x + Math.cos(a) * 0.3, y: y + Math.sin(a) * 0.3, z: rnd(0.3, 0.6), vx: Math.cos(a) * s, vy: Math.sin(a) * s, dmg, src: src || { x, y }, friendly, kind: 'glass', life: 0.7, hitSet: new Set() }); }
  play('glass_break', 0.7, rnd(0.9, 1.2), { x, y });
}
function v11Defend(e, dmg, opt) { // illusioner, spegelriddarens sköld och spegelkungens spegling; null = ingen träff
  if (e.decoy) { decoyPop(e, e.kingImg); if (e.kingImg) spawnText(e.x, e.y, 'FEL SPEGEL', '#c0e0ff'); return null; }
  if (e.d.ai === 'mirrorknight' && e.blockUp && e.state !== 'attack' && !opt.dot && !opt.boom && !behind(e)) {
    if (opt.melee) { if (!opt.bash) { e.blockUp = false; e.blockT = 1.4; play('shield_block', 0.7, 0.8, { x: e.x, y: e.y }); spawnText(e.x, e.y, 'BLOCKERAT', '#c0e8ff'); return dmg * 0.3; } return dmg; }
    if (opt.noProc) return dmg * 0.2;
    if ((e.reflT || 0) < tmr) { e.reflT = tmr + 0.25; const a = Math.atan2(P.y - e.y, P.x - e.x) + rnd(-0.08, 0.08); projectiles.push({ x: e.x + Math.cos(a) * 0.6, y: e.y + Math.sin(a) * 0.6, z: 0.55, vx: Math.cos(a) * 9, vy: Math.sin(a) * 9, dmg: Math.min(12, Math.max(3, dmg * 0.5)), src: e, kind: 'glass', life: 2 }); play('mirror_deflect', 0.7, rnd(0.9, 1.1), { x: e.x, y: e.y }); sparks(e.x, e.y, 0.6, 4); }
    if ((e.refMsgT || 0) < tmr) { e.refMsgT = tmr + 2; spawnText(e.x, e.y, 'STUDSAR', '#c0e8ff'); firstHint('mirrorknight', 'SPEGELRIDDAREN STUDSAR SKOTT FRAMIFRÅN – ANFALL BAKIFRÅN, I NÄRSTRID ELLER NÄR SKÖLDEN ÄR NERE.'); }
    return null;
  }
  if (e.id === 'mirrorking') {
    for (const o of ents) if (o.kingImg && !o.dead) decoyPop(o, true); // den äkta kungen träffas: spegelbilderna krossas
    if ((e.mirrorT || 0) > tmr && !opt.melee) { const r = opt.noProc ? 0 : Math.min(14, dmg * 0.35); if (r > 0.3) hurtPlayer(r, e.x, e.y, 'proj'); if ((e.refMsgT || 0) < tmr) { e.refMsgT = tmr + 1.5; spawnText(e.x, e.y, 'SPEGLAS', '#c0e0ff'); play('mirror_deflect', 0.8); } return dmg * 0.1; }
  }
  return dmg;
}
function v11Kill(e) { // när en fiende dör
  if (e.d.ai === 'sporling') sporeCloud(e.x, e.y);
  if (e.d.ai === 'shardling') glassBurst(e.x, e.y, 6, 4, mod('mirrorShards') > 0 && Math.random() < mod('mirrorShards'), e);
  else if (mod('mirrorShards') > 0 && !e.boss && Math.random() < mod('mirrorShards') * 0.5) glassBurst(e.x, e.y, 5, 6, true);
  if (e.d.ai === 'illusionist' && !e.decoy) for (const o of ents) if (o.decoy && o.owner === e) decoyPop(o);
  if (e.d.fungus && mod('fungusHeal') > 0) heal(mod('fungusHeal'), true);
  if (up('sl_chain') && !e.boss && pclouds.some(c => Math.hypot(c.x - e.x, c.y - e.y) < c.r)) sporeBurst(e.x, e.y, 6 * (1 + mod('dmg')));
}
function updateSporeb(p, dt) { // svampfolkets sporbollar
  if (Math.hypot(p.x - P.x, p.y - P.y) < 0.4 && !(P.jz > 0.4)) { p.dead = true; run.cause = p.src && p.src.d ? p.src.d.name : 'SPORERNA'; hurtPlayer(p.dmg, p.src ? p.src.x : p.x, p.src ? p.src.y : p.y, 'proj'); sporeCloud(p.x, p.y); return; }
  if (solid(p.x, p.y) || p.life <= 0) { p.dead = true; if (Math.random() < 0.6) sporeCloud(p.x - p.vx * dt * 1.5, p.y - p.vy * dt * 1.5); }
}
function updateGlass(p, dt) { // glasskärvor
  if (p.life <= 0 || solid(p.x, p.y)) { p.dead = true; return; }
  if (p.friendly) { for (const e of ents) { if (e.dead || e.dying || e.hidden || (p.hitSet && p.hitSet.has(e)) || Math.hypot(e.x - p.x, e.y - p.y) > 0.35 * e.d.size * (e.boss ? 1.8 : 1)) continue; hurtEnemy(e, p.dmg, p.x, p.y, { noProc: true }); p.dead = true; return; } return; }
  if (Math.hypot(p.x - P.x, p.y - P.y) < 0.35 && !(P.jz > 0.3)) { p.dead = true; run.cause = 'GLASSKÄRVOR'; hurtPlayer(p.dmg, p.x - p.vx * 0.1, p.y - p.vy * 0.1, 'proj'); }
}
function updateRefl(p, dt) { // skott som skölden har studsat tillbaka
  if (p.life <= 0 || solid(p.x, p.y)) { p.dead = true; sparks(p.x - p.vx * dt, p.y - p.vy * dt, 0.5, 3); if (p.reflK === 'sporeb') sporeBurst(p.x - p.vx * dt * 1.5, p.y - p.vy * dt * 1.5, p.dmg); return; }
  const hit = ents.find(e => !e.dead && !e.dying && !e.hidden && !e.dormant && Math.hypot(e.x - p.x, e.y - p.y) < 0.4 * e.d.size * (e.boss ? 1.8 : 1));
  if (!hit) return;
  p.dead = true; const k = hurtEnemy(hit, p.dmg, p.x, p.y, { parry: !!p.parried }); hitMark = 0.14; hitKill = hitKill || k; lvlStat.hits++; if (k) stat('reflectKills');
  if (p.reflK === 'sporeb') sporeBurst(p.x, p.y, p.dmg);
}

