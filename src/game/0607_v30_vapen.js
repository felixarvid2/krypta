// ---------- Version 30 (SPEL): slungan och glasbössan, stenpåsen och glasbiten ----------
// SLUNGAN (ʲ, ammo STENAR ʴ): tyst; stenen studsar en gång i väggar, dubbel skada mot huvudet; högerklick laddar ett tungt kast i 1 s
// (2,6× skada, knuffar, är en tung träff mot spruckna väggar: RAS r30Crack). Pakter: sg_bounce, sg_heavy, sg_quiet, sg_fast.
// GLASBÖSSAN (ʳ, ammo GLAS ʵ): en kon av åtta glasskärvor (hagelvägen i fire(); blödning i v30Dmg); högerklick: en glaskula som spricker
// efter fyra rutor i en ring av skärvor. Pakter: gg_spread, gg_bleed, gg_burst, gg_fast.
// Skadan som i kontraktet (samma familj som morgonstjärnan 35, treudden 40, kroken 45, bombarden 80): stenen 35, tungt kast 90, skärvan 9.
const V30W = { slingDmg: 35, heavyK: 90 / 35, chargeT: 1.0, stoneSpeed: 16, orbCells: 4, orbDmg: 30, orbR: 1.8 };
function v30Pickup(it) {
  if (it.type === 'slingstones') { const n = 6; if ((P.ammo.slingstones || 0) >= AMMO.slingstones.max) return false; P.ammo.slingstones = Math.min(AMMO.slingstones.max, (P.ammo.slingstones || 0) + n); say(`+${n} STENAR`, 1.2); play('pickup', 0.7, 0.8); return true; }
  if (it.type === 'glass') { const n = 4; if ((P.ammo.glass || 0) >= AMMO.glass.max) return false; P.ammo.glass = Math.min(AMMO.glass.max, (P.ammo.glass || 0) + n); say(`+${n} GLAS`, 1.2); play('glass_crack', 0.4, 1.5); return true; }
  return undefined;
}
const v30SlingMul = () => (1 + mod('dmg') + mod('slingDmg')) * masteryMul() * (1 + 0.12 * wlvl('sling')) * (P.rageT > 0 ? 1.5 : 1) * (P.hp < maxHp() * 0.35 ? 1 + mod('lowHpDmg') : 1);
function v30SlingRefill() { if (P.mags[P.weapon] <= 0 && (P.ammo.slingstones || 0) > 0) { P.ammo.slingstones--; P.mags[P.weapon] = 1; } }
function v30Throw(wp, heavy) { // en sten ur slungan (heavy = det tunga kastet)
  v30SlingRefill();
  if (P.mags[P.weapon] <= 0) { play('click', 0.5, 0.9); WS.cd = 0.3; if (!WEAPONS.some((w, i) => P.has[i] && i !== P.weapon && (P.mags[i] > 0 || P.ammo[w.ammo] > 0))) return true; say('SLUT PÅ STENAR', 1.2); autoSwitch(); return true; }
  if (Math.random() >= mod('ammoSave')) P.mags[P.weapon]--;
  v30SlingRefill();
  WS.shot = 0; WS.cd = effDelay(wp) * (up('sg_fast') ? 0.65 : 1) * (heavy ? 1.3 : 1); WS.kick = heavy ? 1.2 : 0.6; lvlStat.shots++; run.shots = (run.shots || 0) + 1;
  play('sling_fire', heavy ? 1 : 0.8, rnd(0.95, 1.05) * (heavy ? 0.85 : 1));
  if (!up('sg_quiet')) noise(heavy ? 1.5 : 0.8);
  const a = P.a, sp = V30W.stoneSpeed * (heavy ? 1.15 : 1);
  V30L.stones.push({ x: P.x + Math.cos(a) * 0.35, y: P.y + Math.sin(a) * 0.35, x0: P.x, y0: P.y, dx: Math.cos(a), dy: Math.sin(a), sp, life: 1.4, heavy: !!heavy,
    dmg: V30W.slingDmg * v30SlingMul() * (heavy ? V30W.heavyK * (up('sg_heavy') ? 1.3 : 1) : 1), bounces: up('sg_bounce') ? 3 : 1, hit: new Set(), sneak: up('sg_quiet') });
  stat('slingThrows');
  return true;
}
function v30Fire(wp) { // från fire(): slungan kastar själv; glasbössan skjuter som ett hagelgevär (false = fortsätt i fire())
  if (wp.sling) { if (WS.cd > 0 || WS.state !== 'idle' || WS.v30ch > 0) return true; v30Throw(wp, false); return true; }
  return false;
}
function v30Orb(wp) { // glasbössans högerklick: en glaskula (två glas) som spricker efter fyra rutor
  if (P.mags[P.weapon] < 2) { if ((P.ammo.glass || 0) > 0) startReload(); else play('click', 0.5, 0.8); return; }
  P.mags[P.weapon] -= 2; WS.shot = 0; WS.cd = effDelay(wp) * 1.4 * (up('gg_fast') ? 0.7 : 1); WS.kick = 1.4; lvlStat.shots++; noise(3);
  play('glassgun_fire', 0.8, 0.8); V30L.orbs.push({ x: P.x + Math.cos(P.a) * 0.4, y: P.y + Math.sin(P.a) * 0.4, dx: Math.cos(P.a), dy: Math.sin(P.a), d: 0, max: V30W.orbCells });
}
function v30Burst(x, y) { // glaskulan spricker: en ring av skärvor
  const r = V30W.orbR * (up('gg_burst') ? 1.4 : 1), dmg = V30W.orbDmg * (1 + mod('dmg') + mod('glassgunDmg')) * (1 + 0.12 * wlvl('glassgun')) * (up('gg_burst') ? 1.5 : 1);
  play('glassgun_burst', 1, rnd(0.95, 1.05), { x, y }); if (typeof f29Shards === 'function') f29Shards(x, y, settings.lowfx ? 8 : 20, true);
  if (fx.parts.glassshard && !settings.lowfx) for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; wpPart({ x, y, z: 0.45, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4, vz: rnd(-0.2, 0.4), life: 0.35, img: fx.parts.glassshard[i % 2], size: 0.05 }); }
  for (const e of ents) if (!e.dead && !e.dying && !e.hidden && !e.dormant && Math.hypot(e.x - x, e.y - y) < r + e.d.size * 0.2 && hasLOS(x, y, e.x, e.y)) { const k = hurtEnemy(e, dmg, x, y, {}); hitKill = hitKill || k; hitMark = 0.12; if (!k && !e.d.stone) e.bleed = Math.max(e.bleed || 0, up('gg_bleed') ? 5 : 3); }
  for (const pr of props) if (pr.ch === 'ʦ' && !pr.v30broken && Math.hypot(pr.x - x, pr.y - y) < r) v30BreakRack(pr);
  if (typeof f29Boom === 'function') try { f29Boom(x, y, Math.min(1.2, r)); } catch (e) { /* glaset */ }
}
function v30WallHit(x, y, dmg, heavy) { // stenen eller kulan i en vägg: glas (FÖNSTER 0086), spruckna väggar (RAS 0087), glashyllor
  const cx = x | 0, cy = y | 0, ci = cy * mw + cx;
  if (typeof F29L === 'object' && F29L.cells && F29L.cells.has(ci) && typeof f29Hit === 'function') try { f29Hit(ci, dmg, heavy ? 'boom' : 'proj', x, y); } catch (e) { /* glaset */ }
  if (heavy && typeof r30Crack === 'function') try { r30Crack(x, y, dmg); } catch (e) { /* RAS */ }
  if (map[cy] && map[cy][cx] === 'ʦ') { const pr = props.find(o => o.cx === cx && o.cy === cy); if (pr) v30HitProp(pr, x, y, dmg); }
}
function weaponV30Tick(wp, dt, trig) {
  if (wp.glassgun) { wp.pellets = up('gg_spread') ? 12 : 8; wp.spread = up('gg_spread') ? 0.12 : 0.085; wp.delay = up('gg_fast') ? 0.42 : 0.6; wp.reload = up('gg_fast') ? 0.75 : 1.0; } // pakterna
  // slungan: högerklick laddar upp i 1 s och kastar tungt när man släpper (en kort tryckning kastar vanligt)
  if (wp.sling && state === 'play' && WS.state === 'idle') {
    if (aimDown && WS.cd <= 0) { if (!WS.v30ch) play('sling_charge', 0.7, 1); WS.v30ch = Math.min(1.2, (WS.v30ch || 0) + dt / (V30W.chargeT * (up('sg_heavy') ? 0.6 : 1))); WS.hcharge = Math.min(1, WS.v30ch) * 0.999 + 0.001; }
    else if (!aimDown && WS.v30ch > 0) { const k = WS.v30ch; WS.v30ch = 0; WS.hcharge = 0; if (canFire()) v30Throw(wp, k >= 1); }
  } else if (WS.v30ch > 0 && !wp.sling) { WS.v30ch = 0; WS.hcharge = 0; }
  // glasbössan: högerklick skjuter glaskulan
  if (wp.glassgun && aimDown && !WS.v30rc && state === 'play' && WS.state === 'idle' && WS.cd <= 0) v30Orb(wp);
  WS.v30rc = aimDown;
}
function v30WeaponTick(dt) {
  // slungans stenar: en studs i väggar (tre med pakten), träffar fiender, dubbelt mot huvudet
  for (const s of V30L.stones) {
    s.life -= dt; const steps = 3, st = s.sp * dt / steps;
    for (let k = 0; k < steps && !s.done; k++) {
      const nx = s.x + s.dx * st, ny = s.y + s.dy * st;
      if (solid(nx, ny)) { v30WallHit(nx, ny, s.dmg, s.heavy);
        if (s.bounces > 0) { s.bounces--; const sx = solid(nx, s.y), sy = solid(s.x, ny); if (sx) s.dx = -s.dx; if (sy) s.dy = -s.dy; if (!sx && !sy) { s.dx = -s.dx; s.dy = -s.dy; } s.dmg *= 0.8; s.x0 = s.x; s.y0 = s.y; s.hit.clear(); play('ricochet', 0.4, 1.3, { x: s.x, y: s.y }); sparks(s.x, s.y, 0.45, 2); }
        else { s.done = true; sparks(s.x, s.y, 0.45, 2); }
        continue; }
      s.x = nx; s.y = ny;
      for (const e of ents) { if (e.dead || e.dying || e.hidden || e.dormant || s.hit.has(e)) continue; const rr = 0.25 + e.d.size * 0.25 * (e.boss ? 1.8 : 1); if (Math.hypot(e.x - s.x, e.y - s.y) > rr) continue;
        s.hit.add(e); const perp = Math.abs((e.x - s.x0) * s.dy - (e.y - s.y0) * s.dx); let dmg = s.dmg;
        const hs = headshotCheck(e, perp, { pellets: 1 }); if (hs > 1) { dmg *= hs + 0.5; hitCrit = true; }
        if (s.sneak && !e.alert && !e.boss) dmg *= 1.5;
        const crit = Math.random() < mod('critChance'); if (crit) { dmg *= 2 + mod('critDmg'); hitCrit = true; }
        const k = hurtEnemy(e, dmg, s.x, s.y, { crit }); hitKill = hitKill || k; hitMark = 0.12; lvlStat.hits++;
        if (s.heavy && !k && !e.boss) { for (let i = 0; i < 4; i++) tryMove(e, s.dx * 0.12, s.dy * 0.12, 0.3); e.stun = Math.max(e.stun || 0, 0.4); }
        if (k) stat('slingKills');
        s.done = true; break; }
    }
    if (s.life <= 0) s.done = true;
  }
  if (V30L.stones.length) V30L.stones = V30L.stones.filter(s => !s.done);
  // glasbössans kula: spricker efter fyra rutor, i en vägg eller vid en fiende
  for (const o of V30L.orbs) { const st = 12 * dt, nx = o.x + o.dx * st, ny = o.y + o.dy * st; o.d += st;
    const hitE = ents.some(e => !e.dead && !e.dying && !e.hidden && !e.dormant && Math.hypot(e.x - nx, e.y - ny) < 0.3 + e.d.size * 0.25 * (e.boss ? 1.8 : 1));
    if (solid(nx, ny)) { v30WallHit(nx, ny, 6, false); o.done = true; v30Burst(o.x, o.y); continue; }
    o.x = nx; o.y = ny; if (hitE || o.d >= o.max) { o.done = true; v30Burst(o.x, o.y); } }
  if (V30L.orbs.length) V30L.orbs = V30L.orbs.filter(o => !o.done);
}
