// ---------- Vapenuppgraderingar (kort med wup, kräver vapnets pakt) ----------
function nearestFoes(e, r, n) { // levande fiender nära e som e har fri sikt till, närmast först
  return ents.filter(o => o !== e && !o.dead && !o.dying && Math.hypot(o.x - e.x, o.y - e.y) < r && hasLOS(e.x, e.y, o.x, o.y))
    .sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y)).slice(0, n);
}
function zap(ax, ay, bx, by, tint) { // synlig stråle mellan två punkter (studs, blixt)
  gfxEZap(bx, by, tint); // FIENDER: den som träffas av en blå blixt sprakar en stund
  efx2Zap(bx, by, tint); // version 25.1: blixtens urladdning (Effekseer)
  for (let i = 1; i <= 5; i++) { const t = i / 6; particles.push({ x: ax + (bx - ax) * t + rnd(-0.08, 0.08), y: ay + (by - ay) * t + rnd(-0.08, 0.08), z: 0.5 + rnd(-0.1, 0.1), vx: 0, vy: 0, vz: 0, life: 0.18, maxLife: 0.18, frames: fx.hit, img: fx.hit[0], size: 0.18, add: true, tint }); }
}
function afterHit(e, dmg, hx, hy, pellet) {
  if (pellet === 0) runeProc(e, dmg);
  if (up('explosive')) explode(hx, hy, 5 * (1 + mod('dmg')), 1.5);
  if (up('ricochet') && pellet === 0) { // studskulan
    const o = nearestFoes(e, 6, 1)[0];
    if (o) { zap(e.x, e.y, o.x, o.y, [255, 230, 160]); play('ricochet', 0.45, rnd(1.2, 1.5), { x: o.x, y: o.y }); hurtEnemy(o, dmg * 0.8, o.x, o.y, { noProc: true }); }
  }
  if (up('chain') && ++P.chainN % 4 === 0) { // kedjeblixten
    let from = e;
    for (const o of nearestFoes(e, 4.5, 3)) { zap(from.x, from.y, o.x, o.y, [140, 190, 255]); hurtEnemy(o, dmg * 1.2, o.x, o.y, { noProc: true }); from = o; }
    play('whoosh', 0.5, 2, { x: e.x, y: e.y });
  }
  if (up('marks') && !e.dead) { // dödsmärket
    e.marks = (e.marks || 0) + 1;
    if (e.marks >= 8) { e.marks = 0; explode(e.x, e.y, 9 * (1 + mod('dmg')), 1.4); play('bigboom', 0.5, 1.4, { x: e.x, y: e.y }); say('DÖDSMÄRKET!', 0.8); }
  }
}
function ricochetWall(hx, hy, dx, dy, side, dmg) { // rikoschetten: kulan studsar en gång mot väggen
  if (side === 0) dx = -dx; else dy = -dy;
  const w2 = cast(hx, hy, dx, dy, 10);
  let best = null, bd = w2.dist;
  for (const e of ents) {
    if (e.dead) continue;
    const rx = e.x - hx, ry = e.y - hy, along = rx * dx + ry * dy;
    if (along > 0.05 && along < bd && Math.abs(rx * dy - ry * dx) < 0.3 * e.d.size) { best = e; bd = along; }
  }
  if (best) { zap(hx, hy, best.x, best.y, [255, 220, 150]); hurtEnemy(best, dmg, best.x, best.y, { noProc: true }); hitMark = 0.15; }
  else if (Math.random() < 0.3) spawnImpact(hx + dx * (w2.dist - 0.04), hy + dy * (w2.dist - 0.04), rnd(0.3, 0.6));
}
function knockBack(e) { // slagkraften: nära fiender slungas bakåt, krock i vägg skadar
  if (e.dead || e.boss) return;
  const d = Math.hypot(e.x - P.x, e.y - P.y); if (d > 3.5) return;
  const a = Math.atan2(e.y - P.y, e.x - P.x), dist = (1.6 - d * 0.3) * (e.elite ? 0.5 : 1);
  const ox = e.x, oy = e.y;
  for (let i = 0; i < 6; i++) tryMove(e, Math.cos(a) * dist / 6, Math.sin(a) * dist / 6, 0.28);
  e.charge = 0; e.state = 'pain'; e.t = 0;
  if (Math.hypot(e.x - ox, e.y - oy) < dist * 0.7) { hurtEnemy(e, 3 * (1 + mod('dmg')), e.x, e.y, { noProc: true }); play('bigboom', 0.35, 1.5, { x: e.x, y: e.y }); P.shake = Math.max(P.shake, 1.2); }
}
function shrapnel(e, dmg) { // splitterhaglet: döda fiender sprängs och skadar grannarna
  play('fireburst', 0.5, 1.3, { x: e.x, y: e.y });
  for (let i = 0; i < 8; i++) { const a = rnd(0, TAU), sp = rnd(1.5, 3); particles.push({ x: e.x, y: e.y, z: 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(0.5, 2), life: 0.5, img: fx.shards[(i * 5) % fx.shards.length], size: 0.12, grav: true }); }
  for (const o of nearestFoes(e, 2.6, 3)) hurtEnemy(o, dmg * 1.5, o.x, o.y, { noProc: true });
}
function throughWall(dx, dy, d) { // genomborraren: hitta väggens baksida (högst 2 rutor) och fortsätt därifrån
  for (let t = d + 0.05; t < d + 2.2; t += 0.05) {
    const x = P.x + dx * t, y = P.y + dy * t;
    if (!solid(x, y)) return t + cast(x, y, dx, dy).dist;
  }
  return d;
}
const groundFires = [];
function updateGroundFires(dt) {
  for (const f of groundFires) {
    f.t -= dt; f.acc += dt;
    efx2Ground(f, 'fire'); // version 25.1: brinnande mark (Effekseer)
    if (Math.random() < dt * 10) particles.push({ x: f.x + rnd(-0.5, 0.5), y: f.y + rnd(-0.5, 0.5), z: 0, vx: 0, vy: 0, vz: 0.4, life: 0.5, maxLife: 0.5, frames: fx.fire, img: fx.fire[0], size: 0.3, add: true, drift: true });
    if (f.acc >= 0.5) { f.acc = 0; for (const e of ents) if (!e.dead && !e.dormant && Math.hypot(e.x - f.x, e.y - f.y) < 0.9) { e.burn = Math.max(e.burn, 2); hurtEnemy(e, 1.2 * (1 + mod('dmg')), e.x, e.y, { noProc: true, quiet: true }); } burnWebs(f.x, f.y, 0.8); }
  }
  for (let i = groundFires.length - 1; i >= 0; i--) if (groundFires[i].t <= 0) groundFires.splice(i, 1);
}
const fuses = []; // sprängspetsen: pilar som smäller efter en stund
function updateFuses(dt) {
  for (const f of fuses) {
    f.t -= dt; if (!f.e.dead) { f.x = f.e.x; f.y = f.e.y; }
    if (f.t <= 0 && f.kind) { barrelBurst(f); explode(f.x, f.y, f.dmg * 0.35, 1.6, f.hurt); continue; } // gift- och isfat
    if (f.t <= 0 && f.hurt) V26A.own = tmr; // version 26A: krutfatets smäll räknas som din (spränghopp)
    if (f.t <= 0) { explode(f.x, f.y, f.dmg, f.r || 1.8, f.hurt); play('bigboom', f.hurt ? 0.8 : 0.5, f.hurt ? 1 : 1.3, { x: f.x, y: f.y }); if (f.hurt) P.shake = Math.max(P.shake, 1.2); }
  }
  for (let i = fuses.length - 1; i >= 0; i--) if (fuses[i].t <= 0) fuses.splice(i, 1);
}
function shootFlare(a, dmg) { // signalpistolens bloss: flyger, träffar, sprängs och tänder eld
  projectiles.push({ x: P.x + Math.cos(a) * 0.4, y: P.y + Math.sin(a) * 0.4, z: 0.48, vx: Math.cos(a) * 13, vy: Math.sin(a) * 13, dmg, src: P, friendly: true, kind: 'flare', life: 2.5 });
  play('whoosh', 0.6, 0.6);
}
function flareBurst(x, y, dmg, r = 1.7, spark = false) {
  explode(x, y, dmg * 1.2, r);
  if (!spark) groundFires.push({ x, y, t: 4, acc: 0 }); // blosset lämnar brinnande mark
  if (!spark && up('cluster')) for (let i = 0; i < 5; i++) { // fyrverkeriet
    const a = i / 5 * TAU + rnd(-0.3, 0.3);
    projectiles.push({ x, y, z: 0.45, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, dmg: dmg * 0.5, src: P, friendly: true, kind: 'spark', life: 0.35 });
  }
  if (!spark && up('blind')) { // solblosset
    for (const e of ents) if (!e.dead && !e.boss && Math.hypot(e.x - x, e.y - y) < 3.2) { e.stun = 2.2; e.charge = 0; }
    particles.push({ x, y, z: 0.5, vx: 0, vy: 0, vz: 0, life: 0.3, maxLife: 0.3, frames: fx.hit, img: fx.hit[0], size: 1.6, add: true, tint: [255, 255, 220] });
  }
  for (const e of ents) if (!e.dead && Math.hypot(e.x - x, e.y - y) < r + 0.3) { e.burn = Math.max(e.burn, 4); }
  for (let i = 0; i < 6; i++) particles.push({ x, y, z: 0.3, vx: rnd(-2, 2), vy: rnd(-2, 2), vz: rnd(1, 3), life: 0.8, maxLife: 0.8, frames: fx.fire, img: fx.fire[0], size: 0.35, grav: true, add: true });
  play('fireburst', 0.7, 0.8, { x, y });
}
function throwMag() { // kastmagasinet: det gamla magasinet flyger iväg som en granat
  const a = P.a;
  projectiles.push({ x: P.x + Math.cos(a) * 0.4, y: P.y + Math.sin(a) * 0.4, z: 0.5, vx: Math.cos(a) * 8, vy: Math.sin(a) * 8, dmg: 9 * (1 + mod('dmg')), src: P, friendly: true, kind: 'gren', life: 0.9 });
  play('whoosh', 0.5, 0.8);
}
// aktiv omladdning: tryck R igen när visaren är i det ljusa fältet så går det direkt och nästa magasin gör 15 % mer skada
const ACTIVE_WIN = [0.3, 0.45];
function reloadKey() {
  const wp = WEAPONS[P.weapon];
  if (WS.state !== 'reload' || wp.shellReload) { startReload(); return; }
  if (WS.tried || WS.loaded) return;
  WS.tried = true;
  const k = WS.t / (wp.reload * reloadMul());
  if (k >= ACTIVE_WIN[0] && k <= ACTIVE_WIN[1]) {
    finishReload(); WS.state = 'idle'; WS.loaded = false; WS.boost = true;
    play('click', 0.8, 1.7); play('reload', 0.4, 2); say('PERFEKT OMLADDNING!', 1); WS.swayY += 5;
  } else { WS.t -= wp.reload * reloadMul() * 0.3; play('click', 0.6, 0.5); say('KÄRVADE', 0.8); }
}
function ejectShell(big) { // hylsan flyger ut åt höger och studsar
  wfxShell(big); // och syns flyga ur vapnet i skärmen (Grafik: vapenanimationer)
  const img = fx.parts.shell ? fx.parts.shell[0] : null; if (!img || settings.lowfx) return;
  const r = P.a + Math.PI / 2, f = P.a;
  particles.push({ x: P.x + Math.cos(f) * 0.35 + Math.cos(r) * 0.12, y: P.y + Math.sin(f) * 0.35 + Math.sin(r) * 0.12, z: 0.42, vx: Math.cos(r) * rnd(1, 1.8) + P.vx * 0.5, vy: Math.sin(r) * rnd(1, 1.8) + P.vy * 0.5, vz: rnd(1.2, 2), life: rnd(1.2, 2), img, size: big ? 0.05 : 0.035, grav: true, bounce: true, tint: big ? [255, 80, 60] : null });
}
function lowAmmoCheck(wp) { // varning när reserven nästan är slut
  const left = P.ammo[wp.ammo] + P.mags[P.weapon];
  if (left > 0 && left <= Math.max(3, wp.mag) && !WS.lowWarned[wp.ammo]) { WS.lowWarned[wp.ammo] = true; say('LITE AMMUNITION: ' + AMMO[wp.ammo].name, 1.5); play('low_ammo', 0.7); }
  if (left > wp.mag * 2) WS.lowWarned[wp.ammo] = false;
}
function startReload() {
  if (WEAPONS[P.weapon].boomerang || WEAPONS[P.weapon].windgun || WEAPONS[P.weapon].spear || WEAPONS[P.weapon].mirrorshield || WEAPONS[P.weapon].whip || WEAPONS[P.weapon].censer || WEAPONS[P.weapon].shears) return; // laddas inte om
  const wp = WEAPONS[P.weapon];
  if (wp.melee) return;
  if (WS.state !== 'idle' || P.mags[P.weapon] >= effMag(P.weapon) || P.ammo[wp.ammo] <= 0) return;
  WS.boost = false; WS.tried = false;
  if (up('grenade')) throwMag();
  if (mod('reloadNova') > 0) { for (const e of ents) if (!e.dead && !e.dormant && Math.hypot(e.x - P.x, e.y - P.y) < 2.4) { hurtEnemy(e, mod('reloadNova'), e.x, e.y, { noProc: true }); for (let i = 0; i < 3; i++) tryMove(e, (e.x - P.x) * 0.1, (e.y - P.y) * 0.1, 0.28); } play('shock', 0.5, 0.8); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; particles.push({ x: P.x + Math.cos(a) * 0.8, y: P.y + Math.sin(a) * 0.8, z: 0.3, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, vz: 0, life: 0.3, maxLife: 0.3, img: fx.hit[1], size: 0.08, add: true, tint: [160, 210, 255] }); } }
  if (up('quickload') && P.mags[P.weapon] === 0) { finishReload(); play('reload', 0.6, 1.8); WS.cd = Math.max(WS.cd, 0.1); WS.swayY += 6; return; } // tomhylsan
  WS.state = 'reload'; WS.t = 0; WS.aim = 0;
  if (wp.shellReload) WS.shellPhase = 'start';
  else play('reload', 0.6, 1.0 / reloadMul());
}
function finishReload() {
  const wp = WEAPONS[P.weapon], need = effMag(P.weapon) - P.mags[P.weapon], take = Math.min(need, P.ammo[wp.ammo]);
  P.mags[P.weapon] += take; P.ammo[wp.ammo] -= take;
}
function switchWeapon(n) {
  if (!(n >= 0 && n < WEAPONS.length) || n === P.weapon || !P.has[n] || state !== 'play') return;
  P.lastWeapon = P.weapon;
  WS.next = n; WS.state = 'holster'; WS.t = 0; WS.aim = 0; play('weapon', 0.25, 1.6);
}
// ---------- Version 5: yxan, eldkastaren och granatkastaren ----------
const meleeMul = () => masteryMul() * (P.hp < maxHp() * 0.35 ? 1 + mod('lowHpDmg') : 1) * (1 + mod('dmg') + mod('meleeDmg')) * (1 + 0.12 * wlvl('axe')) * (P.rageT > 0 ? 1.5 : 1) * (P.curseT > 0 ? 0.75 : 1);
function axeSwing(charged) { // svep framåt; laddat slag slungar fiender
  const wp = WEAPONS[P.weapon];
  WS.shot = 0; WS.cd = effDelay(wp) * (charged ? 1.4 : 1); WS.charge = 0; WS.kick = 0.25;
  play(charged ? 'axe_charge' : 'axe_swing', 0.8, rnd(0.9, 1.1)); lvlStat.shots++;
  const whirl = charged && up('axe_whirl'), arc = whirl ? Math.PI : 0.85, reach = charged ? 2.1 : 1.7;
  let hits = 0;
  for (const e of ents) {
    if (e.dead || e.dying || e.hidden) continue;
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
    if (d > reach + e.d.size * 0.3 || Math.abs(off) > arc) continue;
    if (e.dormant) { e.hp -= 0.01; continue; }
    let dmg = wp.dmg * meleeMul() * (charged ? 2.2 : 1) * (Math.random() < mod('critChance') ? 2 + mod('critDmg') : 1);
    if (!e.boss && !e.elite && !e.alert && !e.dormant) { dmg = e.hp + 1; play('sneak_kill', 0.7); stat('sneakKills'); spawnText(e.x, e.y, 'SMYGDÖDAD', '#c0c0c0'); } // smygdödande bakifrån
    const k = hurtEnemy(e, dmg, e.x, e.y, { melee: true }); hits++;
    if (up('axe_bleed') && !k) e.bleed = 4;
    if (k && up('axe_butcher')) heal(5);
    if (!k && !e.boss) for (let i = 0; i < (charged ? 8 : 3); i++) tryMove(e, dx / d * 0.12, dy / d * 0.12, 0.28);
    if (charged && !e.boss) e.stun = Math.max(e.stun || 0, 0.8);
  }
  for (const pt of pots) if (!pt.broken && Math.hypot(pt.x - P.x, pt.y - P.y) < reach) breakPot(pt);
  breakProps(P.x + Math.cos(P.a) * 1, P.y + Math.sin(P.a) * 1, 0.8);
  if (hits) { play('axe_hit', 0.9, rnd(0.9, 1.1)); hitStop = Math.max(hitStop, charged ? 0.09 : 0.05); P.shake = Math.max(P.shake, charged ? 1.4 : 0.7); hitMark = 0.15; lvlStat.hits++; }
}
function axeThrow() { // högerklick med yxan: kastas och kommer tillbaka
  if (WS.thrown || WS.state !== 'idle' || state !== 'play') return;
  WS.thrown = true; play('axe_throw', 0.8);
  projectiles.push({ x: P.x, y: P.y, z: 0.5, vx: Math.cos(P.a) * 10, vy: Math.sin(P.a) * 10, kind: 'axe', friendly: true, life: 1.4, dmg: 12 * meleeMul(), hits: new Set(), back: false });
}
function updateThrownAxe(p, dt) {
  const tx = P.x - p.x, ty = P.y - p.y, d = Math.hypot(tx, ty);
  if (p.back || p.life < 0.8) { p.back = true; p.vx += (tx / d * 14 - p.vx) * Math.min(1, dt * 6); p.vy += (ty / d * 14 - p.vy) * Math.min(1, dt * 6); }
  p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
  if (solid(p.x, p.y) && !p.back) { p.back = true; play('axe_hit', 0.5, 1.3, { x: p.x, y: p.y }); }
  for (const e of ents) if (!e.dead && !e.dormant && !p.hits.has(e) && Math.hypot(e.x - p.x, e.y - p.y) < 0.6) { p.hits.add(e); hurtEnemy(e, p.dmg, e.x, e.y, { melee: true }); play('axe_hit', 0.6, 1.1, { x: e.x, y: e.y }); if (!up('axe_boomerang') || p.hits.size >= 2) p.back = true; }
  if ((p.back && d < 0.6) || p.life < -2) { p.dead = true; WS.thrown = false; play('click', 0.5, 0.8); }
}
let flameSnd = null;
function flameTick(wp, base) { // eldkastaren: en kägla av eld som tänder allt
  const frugal = up('fl_frugal'), blue = up('fl_blue');
  if (frugal && Math.random() < 0.5) P.mags[P.weapon]++; // bränslesnålen: hälften av dropparna är gratis
  WS.shot = 0; WS.cd = effDelay(wp);
  if (!flameSnd && actx) { play('flamer_start', 0.6); flameSnd = play('flamer_loop', 0.45, 1, { loop: true }); }
  P.flameT = 0.15; P.flash = Math.max(P.flash, 0.04);
  const range = blue ? 6 : 4.5, dmg = base * (blue ? 1.5 : 1) * (1 + mod('fireDmg'));
  const f = fx.parts.flame;
  for (let i = 0; i < (settings.lowfx ? 1 : 2); i++) { const a = P.a + rnd(-0.12, 0.12), sp = rnd(6, 8); particles.push({ x: P.x + Math.cos(a) * 0.5, y: P.y + Math.sin(a) * 0.5, z: P.camZ - 0.15, vx: Math.cos(a) * sp + P.vx, vy: Math.sin(a) * sp + P.vy, vz: rnd(-0.1, 0.3), life: range / 7, maxLife: range / 7, frames: f || fx.fire, img: (f || fx.fire)[0], size: 0.35, add: true, tint: blue ? [120, 170, 255] : null, flame: true }); }
  const wd = cast(P.x, P.y, Math.cos(P.a), Math.sin(P.a)).dist;
  for (const e of ents) {
    if (e.dead || e.dormant || e.hidden) continue;
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
    if (d > Math.min(range, wd + 0.3) || Math.abs(off) > 0.28 + 0.3 / Math.max(1, d)) continue;
    hurtEnemy(e, dmg, e.x, e.y, { noProc: true, quiet: true }); e.burn = Math.max(e.burn, 3); e.burnAcc = e.burnAcc || 0;
    if (!e.boss && !e.elite && Math.random() < 0.04) e.fleeT = 1.2; // eld skrämmer
  }
  const ex = P.x + Math.cos(P.a) * Math.min(range, wd), ey = P.y + Math.sin(P.a) * Math.min(range, wd);
  P.flameAt = tmr; P.flameEx = ex; P.flameEy = ey; // version 25.1: var strålen slutar (flameLight)
  burnWebs(ex, ey, 1); for (const pr of props) if (pr.def && pr.def.boom && !pr.broken && Math.hypot(pr.x - ex, pr.y - ey) < 1.2) hitProp(pr, ex, ey);
  if (up('fl_napalm') && Math.random() < 0.15) groundFires.push({ x: ex, y: ey, t: 3, acc: 0 });
  lvlStat.shots++;
}
function flameWall() { // eldväggen (uppgradering): högerklick
  const wp = WEAPONS[P.weapon]; if ((P.flameWallT || 0) > tmr || P.mags[P.weapon] < 10) return;
  P.flameWallT = tmr + 3; P.mags[P.weapon] -= 10; play('fireburst', 0.8, 0.8);
  for (let i = -2; i <= 2; i++) { const x = P.x + Math.cos(P.a) * 2.5 + Math.cos(P.a + Math.PI / 2) * i * 0.6, y = P.y + Math.sin(P.a) * 2.5 + Math.sin(P.a + Math.PI / 2) * i * 0.6; if (!solid(x, y)) groundFires.push({ x, y, t: 5, acc: 0 }); }
}
