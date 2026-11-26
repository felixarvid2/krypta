// ---------- Version 25.1: eldkastarens ljus ----------
function flameLight(fl) { // från updateLight: strålen lyser upp golv och väggar hela vägen fram, marken som brinner och brinnande fiender fladdrar
  const on = P.flameAt !== undefined && tmr - P.flameAt < 0.12 && tmr >= P.flameAt;
  if (!on && P.flameT > 0 && P.flameAt !== undefined) P.flameT = 0; // värmen (frosten) släpper när du slutar spruta
  const k = settings.lowfx ? 0.6 : 1;
  if (on) {
    const dx = P.flameEx - P.x, dy = P.flameEy - P.y, f = 0.85 + 0.15 * Math.sin(tmr * 31) * Math.sin(tmr * 13.7);
    for (const t of [0.35, 0.7, 1]) fl(P.x + dx * t, P.y + dy * t, (0.35 + 0.3 * t) * f * k, 3, [255, 140, 45]); // där strålen slår i glöder det mest
  }
  let n = 0;
  for (const g of groundFires) { if (++n > 12) break; fl(g.x, g.y, (0.35 + 0.1 * Math.sin(tmr * 17 + g.x * 3)) * Math.min(1, g.t) * k, 2, [255, 130, 40]); }
  n = 0;
  for (const e of ents) { if (!(e.burn > 0) || e.dead || e.dormant) continue; if (++n > 16) break; fl(e.x, e.y, (0.2 + 0.12 * Math.sin(tmr * 21 + e.x * 7)) * k, 3, [255, 120, 40]); }
}
function launcherShot(wp, base) { // granatkastaren: studsande granater, siktad = smäller vid första träff
  const n = up('gl_drum') ? Math.min(3, P.mags[P.weapon] + 1) : 1;
  for (let i = 0; i < n; i++) setTimeout(() => { if (state !== 'play' || !map) return; const mega = up('gl_mega'), sp = mega ? 7 : 10, a = P.a + rnd(-0.02, 0.02);
    projectiles.push({ x: P.x + Math.cos(a) * 0.5, y: P.y + Math.sin(a) * 0.5, z: P.camZ - 0.1, vz: 1.6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, kind: 'pgren', friendly: true, life: 2.2, dmg: base * (mega ? 1.2 : 1) * (1 + mod('grenadeDmg')),
      beepT: 0.2, impact: WS.aim > 0.5, sticky: up('gl_sticky'), cluster: up('gl_cluster'), radius: mega ? 4.4 : 2.4, launched: true });
    if (i) { P.mags[P.weapon] = Math.max(0, P.mags[P.weapon] - 1); play(wp.sound[0], wp.sound[2], wp.sound[1]); } }, i * 160);
  WS.shot = 0; WS.cd = effDelay(wp) * n; P.shake = Math.max(P.shake, 0.8); lvlStat.shots++;
}
function inspect() { if (WS.state === 'idle' && WS.inspect <= 0) { WS.inspect = 1.6; play('click', 0.3, 0.8); setTimeout(() => play('click', 0.3, 1.1), 700); } }
// ---------- Granater (F): håll för längre kast ----------
const GREN_MAX = () => 3 + Math.round(mod('grenades'));
function grenadeStart() { if (state !== 'play' || WS.throwT >= 0) return; if (P.grenades <= 0) { say('INGA GRANATER', 1); play('click', 0.4, 0.7); return; } WS.throwT = 0; }
function grenadeThrow() {
  if (WS.throwT < 0) return;
  const hold = Math.min(1, WS.throwT); WS.throwT = -1;
  if (state !== 'play' || P.grenades <= 0) return;
  P.grenades--; stat('grenadesThrown'); WS.kick = 0.3; play('grenade_throw', 0.6, 1, {}); play('whoosh', 0.4, 1.2);
  const sp = 5 + hold * 6, a = P.a;
  projectiles.push({ x: P.x + Math.cos(a) * 0.4, y: P.y + Math.sin(a) * 0.4, z: P.camZ - 0.05, vz: 2.2 + hold * 1.4, vx: Math.cos(a) * sp + P.vx * 0.5, vy: Math.sin(a) * sp + P.vy * 0.5,
    kind: 'pgren', friendly: true, life: 1.8, dmg: 38 * (1 + mod('grenadeDmg')) * (1 + mod('dmg') * 0.5), beepT: 0 });
  for (const e of ents) if (!e.dead && !e.boss && Math.hypot(e.x - P.x, e.y - P.y) < 9 && e.d.ai !== 'charge' && Math.random() < 0.5) e.fleeT = 1.2; // fiender som ser kastet springer undan
}
function updateGrenade(p, dt) { // studsar mot väggar och golv, piper och smäller
  if (p.stuck) { if (p.stuck.dead) p.stuck = null; else { p.x = p.stuck.x; p.y = p.stuck.y; p.z = 0.5; } }
  if (p.launched && !p.stuck && (p.impact || p.sticky)) { const e = ents.find(e => !e.dead && !e.dormant && Math.hypot(e.x - p.x, e.y - p.y) < 0.5); if (e) { if (p.sticky && !p.impact) { p.stuck = e; play('click', 0.5, 0.6, { x: p.x, y: p.y }); } else p.life = 0; } }
  if (p.launched && p.impact && solid(p.x + p.vx * dt, p.y + p.vy * dt)) p.life = 0;
  p.vz -= 9 * dt; p.z += p.vz * dt;
  if (p.z <= 0.05) { p.z = 0.05; if (p.vz < -1.2) { p.vz *= -0.42; p.vx *= 0.7; p.vy *= 0.7; play('grenade_bounce', 0.4, rnd(0.9, 1.2), { x: p.x, y: p.y }); } else { p.vz = 0; p.vx *= 0.9; p.vy *= 0.9; } }
  const ox = p.x - p.vx * dt, oy = p.y - p.vy * dt;
  if (solid(p.x, p.y)) { if (solid(p.x, oy)) p.vx = -p.vx * 0.5; if (solid(ox, p.y)) p.vy = -p.vy * 0.5; p.x = ox; p.y = oy; play('grenade_bounce', 0.4, 1.3, { x: p.x, y: p.y }); }
  else if (solid(p.x, oy) && solid(ox, p.y)) { p.vx = -p.vx * 0.5; p.vy = -p.vy * 0.5; p.x = ox; p.y = oy; } // version 25.1: inte snett mellan två väggar som möts i ett hörn
  p.beepT -= dt; if (p.beepT <= 0) { p.beepT = p.life < 0.6 ? 0.12 : 0.35; play('grenade_beep', 0.35, p.life < 0.6 ? 1.3 : 1, { x: p.x, y: p.y }); }
  if (p.life <= 0) V26A.own = tmr; // version 26A: smällen är din (spränghopp)
  if (p.life <= 0) {
    p.dead = true; explode(p.x, p.y, p.dmg, p.radius || 2.6, settings.diff > 0, true);
    if (p.cluster) for (let i = 0; i < 3; i++) { const a = rnd(0, TAU); projectiles.push({ x: p.x, y: p.y, z: 0.4, vz: 1.5, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, kind: 'pgren', friendly: true, life: 0.7, dmg: p.dmg * 0.4, beepT: 9, radius: 1.4 }); }
    play('bigboom', 0.85, 1, { x: p.x, y: p.y }); P.shake = Math.max(P.shake, 1.4);
  }
}
function autoSwitch() {
  for (const i of [...WEAPONS.keys()].slice(1).concat(0)) { const w = WEAPONS[i]; if (P.has[i] && i !== P.weapon && (P.mags[i] > 0 || P.ammo[w.ammo] > 0)) { switchWeapon(i); return; } }
}
// opt: { crit, noProc (ingen explosion/brand), source }
