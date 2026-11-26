// ---------- Utmaningsrummet: tre vågor ----------
let challenge = null;
function startChallenge(pr, max = 3) {
  challenge = { pr, wave: 0, t: 1.5, alive: [], max }; pr.used = true; play('gong', 1); if (window.Music) Music.sting('challenge'); setMusic(true); P.shake = 0.8;
  const room = roomAt(pr.x, pr.y);
  for (const d of Object.values(doors)) if (!d.secret && room && d.x >= room.x - 1 && d.y >= room.y - 1 && d.x <= room.x + room.w && d.y <= room.y + room.h) { d.glock = true; if (!occupied(d)) d.target = 0; }
  say('UTMANINGEN BÖRJAR!', 2.5);
}
function roomAt(x, y) { const rm = lvl.roomMask; if (!rm || !lvl.rooms) return null; const ch = rm[y | 0] && rm[y | 0][x | 0]; if (!ch || ch === '-') return null; return lvl.rooms[ch.charCodeAt(0) - 48] || null; }
function updateChallenge(dt) {
  const c = challenge; if (!c) return;
  c.alive = c.alive.filter(e => !e.dead);
  if (c.alive.length) return;
  c.t -= dt; if (c.t > 0) return;
  if (c.wave >= c.max) { // klart: belöning
    challenge = null; setMusic(false); play('gong', 0.8, 1.3); play('win', 0.6);
    for (const d of Object.values(doors)) if (d.glock && !(guardianE && !guardianE.dead)) { d.glock = false; d.target = 1; }
    if (c.max >= 3) { chests.push({ x: c.pr.x + 1, y: c.pr.y, open: false, t: 0, rare: c.max >= 5 }); if (solid(c.pr.x + 1, c.pr.y)) chests[chests.length - 1].x = P.x + Math.cos(P.a); }
    items.push({ type: 'cardpick', x: c.pr.x, y: c.pr.y + 1, taken: false, drop: true, luck: c.max >= 5 ? 1.6 : 0.8, title: 'UTMANINGENS BELÖNING' });
    for (let i = 0; i < [0, 0, 5, 8, 0, 16][c.max]; i++) dropItem('gold', c.pr.x + rnd(-1, 1), c.pr.y + rnd(-1, 1));
    if (c.max >= 5) { dropItem('potion', c.pr.x, c.pr.y); stat('hardChallenges'); if (run.owned.some(id => { const cd = Cards.byId(id); return cd && cd.curse; })) { const cs = run.owned.filter(id => { const cd = Cards.byId(id); return cd && cd.curse; }); const id = cs[0]; run.owned.splice(run.owned.indexOf(id), 1); recomputeMods(); setTimeout(() => say(`UTMANINGEN BRÖT FÖRBANNELSEN: ${Cards.byId(id).name}`, 3), 1500); } } // svår utmaning bryter en förbannelse
    run.challenges = (run.challenges || 0) + 1; stat('challenges'); checkAch(); say('UTMANINGEN KLARAD!', 3); return;
  }
  c.wave++; c.t = 2.5;
  const pool = run.depth >= 3 ? ['S', 'K', 'V', 'I', 'L', 'W', 'R'] : ['S', 'K', 'L', 'I'], n = 2 + c.wave + Math.floor(run.depth / 2);
  for (let i = 0; i < n; i++) {
    const spot = freeSpotFar(2.5, 6) || [c.pr.x + rnd(-2, 2), c.pr.y + rnd(-2, 2)];
    if (solid(spot[0], spot[1])) continue;
    const e = makeEnemy(pool[(Math.random() * pool.length) | 0], spot[0], spot[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; c.alive.push(e); spawnPuff(spot[0], spot[1], 6);
  }
  if (c.wave === 3 || c.wave === 5) { const e = c.alive[0]; if (e) { const el = makeElite(RNG(Date.now()), e.x, e.y); el.alert = true; ents.push(el); totalEnemies++; c.alive.push(el); } }
  say(`VÅG ${c.wave} AV ${c.max}`, 2); play('gong', 0.6, 1 + c.wave * 0.1);
}
// ---------- Farlig mark: lava, vatten, is, nät, pilfällor och gas ----------
function burnWebs(x, y, r) { // eld och explosioner bränner upp nät, som sprider sig till nät intill
  v19Blast(x, y, r); // version 19: explosioner tänder gruvgasen
  for (let cy = Math.max(0, (y - r) | 0); cy <= Math.min(mh - 1, (y + r) | 0); cy++) for (let cx = Math.max(0, (x - r) | 0); cx <= Math.min(mw - 1, (x + r) | 0); cx++)
    if (map[cy][cx] === '"' && Math.hypot(cx + 0.5 - x, cy + 0.5 - y) <= r + 0.5) burnWeb(cx, cy);
}
function burnWeb(cx, cy) {
  if (map[cy][cx] !== '"') return;
  map[cy][cx] = '.'; const pr = props.find(o => o.cx === cx && o.cy === cy && o.def && o.def.web); if (pr) pr.broken = true;
  for (let i = 0; i < 3; i++) particles.push({ x: cx + 0.5 + rnd(-0.3, 0.3), y: cy + 0.5 + rnd(-0.3, 0.3), z: rnd(0.1, 0.6), vx: 0, vy: 0, vz: 0.5, life: 0.5, maxLife: 0.5, frames: fx.fire, img: fx.fire[0], size: 0.35, add: true, drift: true });
  play('fireburst', 0.25, 1.4, { x: cx + 0.5, y: cy + 0.5 });
  setTimeout(() => { if (map) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (cy + dy >= 0 && cy + dy < mh && cx + dx >= 0 && cx + dx < mw && map[cy + dy][cx + dx] === '"') burnWeb(cx + dx, cy + dy); }, 250);
}
const trapMul = () => Math.max(0.1, 1 - mod('trapResist'));
let hazAcc = 0, animAcc = 0;
function updateCold(dt) { // Frostfästet: stilla ute i kylan så fryser du, eld och rörelse värmer
  if (lvl.biome !== 'frost' || boss) { P.cold = 0; return; }
  const out = cellSky && cellSky[(P.y | 0) * mw + (P.x | 0)], warm = torches.some(t => (!t.hidden || (t.prop && t.prop.ch === '¶')) && Math.hypot(t.x - P.x, t.y - P.y) < 3) || P.flameT > 0;
  if (warm) { P.cold = Math.max(0, (P.cold || 0) - dt * 3); if (Math.random() < dt * 3) particles.push({ x: P.x + rnd(-0.6, 0.6), y: P.y + rnd(-0.6, 0.6), z: 0.2, vx: 0, vy: 0, vz: 0.5, life: 0.6, maxLife: 0.6, frames: fx.parts.ember || fx.hit, img: (fx.parts.ember || fx.hit)[0], size: 0.04, add: true, drift: true }); }
  else if (out && Math.hypot(P.vx, P.vy) < 0.5) P.cold = (P.cold || 0) + dt * Math.max(0.2, 1 - mod('coldResist'));
  else P.cold = Math.max(0, (P.cold || 0) - dt * 0.5);
  if (P.cold > 6) { P.coldAcc = (P.coldAcc || 0) + dt; if (P.coldAcc > 2) { P.coldAcc = 0; if (P.hp > maxHp() * 0.25) { P.hp -= 2; P.hurt = 0.1; } if (!P.coldMsgT || P.coldMsgT < tmr) { P.coldMsgT = tmr + 8; say('DU FRYSER – RÖR PÅ DIG ELLER HITTA EN ELD', 2.5); } } }
  if (cellUnder() === ':' && Math.hypot(P.vx, P.vy) > 4 && lvl.biome === 'frost') { const k = ((P.y | 0) * mw + (P.x | 0)); iceSteps[k] = (iceSteps[k] || 0) + dt; if (iceSteps[k] > 1.2) { iceSteps[k] = -99; map[P.y | 0][P.x | 0] = '-'; cellFloor[k] = animTex.water ?? cellFloor[k]; play('ice_crack', 0.8); say('ISEN BRAST!', 1); P.vx *= 0.3; P.vy *= 0.3; } } // isen spricker
}
let iceSteps = {};
function updateGround(dt) {
  updateCold(dt);
  if (!settings.lowfx && Math.random() < dt * 6) { const a = rnd(0, TAU), r = rnd(1, 5), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r; if (cellAt(x, y) === '-') particles.push({ x, y, z: 0.01, vx: 0, vy: 0, vz: 0, life: 0.4, maxLife: 0.4, img: fx.hit[1], size: 0.04, add: true, tint: [200, 230, 255], fade: true }); } // vattnet blänker
  animAcc += dt; if (animAcc > 0.45 && !gfxW.active) { animAcc = 0; const f = Math.floor(tmr / 0.45) % 2; // animerad lava och vatten
    if (animTex.lava !== undefined) floorTexs[animTex.lava] = f ? tex.floor_lava2 : tex.floor_lava;
    if (animTex.water !== undefined) floorTexs[animTex.water] = f ? tex.floor_water2 : tex.floor_water;
    if (animTex.deep !== undefined) floorTexs[animTex.deep] = f ? tex.floor_deepwater2 : tex.floor_deepwater; }
  hazAcc += dt; if (hazAcc < 0.5) return; hazAcc = 0;
  const c = cellUnder(), immune = mod('hazardImmune') > 0;
  if (c === '_' && P.jz < 0.12 && !immune) { run.cause = 'LAVA'; hurtPlayer(9 * trapMul()); play('lava', 0.5, rnd(0.9, 1.1)); P.burnFx = 0.6; }
  for (const e of ents) if (!e.dead && !e.boss && !e.dormant && cellAt(e.x, e.y) === '_' && e.d.ai !== 'fly') { hurtEnemy(e, 5, e.x, e.y, { noProc: true, quiet: true }); e.burn = Math.max(e.burn, 1.5); }
  // nära lava: fräsande ljud
  if (!P.lavaSndT || P.lavaSndT < tmr) { for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; if (cellAt(P.x + Math.cos(a) * 2, P.y + Math.sin(a) * 2) === '_') { play('lava', 0.2, rnd(0.8, 1)); P.lavaSndT = tmr + 3; break; } } }
}
function trapTick(pr, dt) {
  const d = pr.def;
  if (d.trap === 'arrow') { // tryckplattan skjuter pilar från närmaste vägg
    const on = Math.abs(P.x - pr.x) < 0.45 && Math.abs(P.y - pr.y) < 0.45 && P.jz < 0.1;
    pr.up = !on;
    if (on && (pr.cdT || 0) < tmr) {
      pr.cdT = tmr + 1.4; play('click', 0.6, 0.5, { x: pr.x, y: pr.y });
      let best = null;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let k = 1; while (k < 7 && !isWallChar(cellAt(pr.cx + dx * k, pr.cy + dy * k))) k++; if (k < 7 && (!best || k < best.k)) best = { dx, dy, k }; }
      if (best) { const sx = pr.x + best.dx * (best.k - 0.6), sy = pr.y + best.dy * (best.k - 0.6); setTimeout(() => { if (!map) return; play('arrow', 0.7, 1, { x: sx, y: sy });
        projectiles.push({ x: sx, y: sy, z: 0.5, vx: -best.dx * 9, vy: -best.dy * 9, dmg: 11 * trapMul(), src: { x: sx, y: sy }, kind: 'arrow', life: 1.2 }); }, 120); }
    }
    return;
  }
  if (d.trap === 'gas') { // gasventilen pyser med jämna mellanrum
    const cyc = (tmr + pr.ph) % 6; pr.up = cyc > 4;
    if (pr.up) {
      if (Math.random() < dt * 8) particles.push({ x: pr.x + rnd(-0.4, 0.4), y: pr.y + rnd(-0.4, 0.4), z: 0.1, vx: rnd(-0.3, 0.3), vy: rnd(-0.3, 0.3), vz: 0.3, life: 1.2, maxLife: 1.2, frames: fx.parts.gas || fx.hit, img: (fx.parts.gas || fx.hit)[0], size: 0.45, add: true, tint: [120, 255, 120], drift: true, fade: true });
      if (!pr.sndT || pr.sndT < tmr) { pr.sndT = tmr + 2.2; play('gas', 0.5, 1, { x: pr.x, y: pr.y }); }
      if (Math.hypot(P.x - pr.x, P.y - pr.y) < 1.3 && (pr.hitT || 0) < tmr && mod('hazardImmune') <= 0) { pr.hitT = tmr + 0.5; run.cause = 'GIFTGAS'; hurtPlayer(4 * trapMul()); P.poisonFx = 0.6; }
      for (const e of ents) if (!e.dead && !e.boss && Math.hypot(e.x - pr.x, e.y - pr.y) < 1.3) e.poison = Math.max(e.poison || 0, 1.5);
    }
  }
}
function updateProps(dt) {
  updateGround(dt); updateChallenge(dt);
  for (const pr of props) if (pr.def && (pr.def.trap === 'arrow' || pr.def.trap === 'gas')) trapTick(pr, dt); else if (pr.def && V6_TRAPS.has(pr.def.trap)) trapV6(pr, dt);
  updateCrumbles(dt);
  for (const pr of props) {
    if (!pr.def || !pr.def.trap || pr.def.trap === 'arrow' || pr.def.trap === 'gas' || V6_TRAPS.has(pr.def.trap)) continue;
    const cyc = (tmr + pr.ph) % 3.2, wasUp = pr.up;
    pr.up = cyc > 2.3; // uppe i knappt en sekund var tredje sekund
    if (pr.up && !wasUp && Math.hypot(pr.x - P.x, pr.y - P.y) < 8) play('click', 0.5, 0.6, { x: pr.x, y: pr.y });
    if (!pr.up) { if (cyc > 1.9 && cyc < 2.0 && Math.hypot(pr.x - P.x, pr.y - P.y) < 3 && (pr.warnT || 0) < tmr) { pr.warnT = tmr + 2; play('click', 0.25, 1.4, { x: pr.x, y: pr.y }); } continue; }
    if (Math.abs(P.x - pr.x) < 0.48 && Math.abs(P.y - pr.y) < 0.48 && (pr.hitT || 0) < tmr && P.jz < 0.15) { pr.hitT = tmr + 0.9; run.cause = 'SPIKFÄLLA'; hurtPlayer(10 * trapMul(), pr.x, pr.y); spawnBlood(P.x, P.y); }
    for (const e of ents) if (!e.dead && !e.boss && !e.dormant && Math.abs(e.x - pr.x) < 0.48 && Math.abs(e.y - pr.y) < 0.48 && (e.spikeT || 0) < tmr) { e.spikeT = tmr + 0.9; hurtEnemy(e, 6, e.x, e.y, { noProc: true }); }
  }
}
function breakPot(pt) {
  pt.broken = true; play('pot', 0.7, rnd(0.9, 1.15), { x: pt.x, y: pt.y }); score += 10;
  for (let i = 0; i < 7; i++) {
    const a = rnd(0, TAU), sp = rnd(0.6, 2);
    particles.push({ x: pt.x, y: pt.y, z: 0.2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(1, 2.5), life: rnd(0.8, 1.4), img: fx.shards[pt.color * 6 + (i % 6)], size: 0.14, grav: true, bounce: true });
  }
  if (pt.loot) dropItem(pt.loot, pt.x, pt.y);
  else if (Math.random() < 0.15) dropItem('shard', pt.x, pt.y); // rustningsskärva
  if (Math.random() < 0.05) { for (let i = 0; i < 6; i++) dropItem('gold', pt.x, pt.y); say('JACKPOTT!', 1); play('coin', 0.8, 0.8); } // ibland en guldskatt
}
function spawnBlood(x, y) {
  const a = rnd(0, TAU), sp = rnd(0.3, 1.2);
  particles.push({ x, y, z: rnd(0.35, 0.65), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(0, 1.5), life: rnd(0.35, 0.7), img: fx.blood[(Math.random() * 3) | 0], size: rnd(0.1, 0.18), grav: true });
}
// ---------- Effekter: kulhål, gnistor, spårljus, rök ----------
const wallMarks = new Map(); // kulhål och blod på väggar: nyckel = ruta och sida
const faceOf = (side, dx, dy) => side === 0 ? (dx > 0 ? 0 : 1) : (dy > 0 ? 2 : 3);
function wallMark(hit, dx, dy, z, kind) {
  if (kind === 'blood' && v27WallOld()) return; // version 27 (BLOOD): det röda stänket ersätts av stänk i materialets färg (v27Hit)
  if (!hit || hit.mx === undefined || !isWallChar(hit.cell)) return;
  const key = (hit.my * mw + hit.mx) * 4 + faceOf(hit.side, dx, dy);
  let arr = wallMarks.get(key); if (!arr) { arr = []; wallMarks.set(key, arr); }
  arr.push({ u: hit.wx, z: clamp(z, 0.05, 0.95), kind, r: kind === 'blood' ? rnd(0.04, 0.07) : kind === 'web' ? 0.08 : kind === 'scorch' ? rnd(0.13, 0.2) : 0.016, seed: Math.random() * 1000 });
  if (arr.length > 14) arr.shift();
  if (wallMarks.size > 500) wallMarks.delete(wallMarks.keys().next().value);
}
function sparks(x, y, z, n) {
  for (let i = 0; i < n; i++) particles.push({ x, y, z, vx: rnd(-1.5, 1.5), vy: rnd(-1.5, 1.5), vz: rnd(0.5, 2), life: 0.35, maxLife: 0.35, img: fx.hit[2], frames: null, size: 0.05, add: true, tint: [255, 220, 120], grav: true });
}
function tracer(dx, dy, d) {
  for (let t = 1.2; t < d; t += 0.9) particles.push({ x: P.x + dx * t, y: P.y + dy * t, z: P.camZ - 0.06, vx: 0, vy: 0, vz: 0, life: 0.06, maxLife: 0.06, img: fx.hit[1], size: 0.06, add: true, tint: [255, 240, 180] });
}
function muzzleSmoke() {
  wfxSmoke(); // puffar vid mynningen i skärmen och värme i pipan (Grafik: vapenanimationer)
  if (settings.lowfx || !fx.parts.smoke) return;
  const a = P.a, f = fx.parts.smoke;
  particles.push({ x: P.x + Math.cos(a) * 0.7, y: P.y + Math.sin(a) * 0.7, z: P.camZ - 0.12, vx: P.vx * 0.5 + rnd(-0.1, 0.1), vy: P.vy * 0.5 + rnd(-0.1, 0.1), vz: 0.4, life: 0.8, maxLife: 0.8, frames: f, img: f[0], size: 0.14, drift: true });
}
function spawnText(x, y, text, color) { numbers.push({ x: x + rnd(-0.1, 0.1), y: y + rnd(-0.1, 0.1), z: 0.95, v: text, color, crit: false, t: 1.1 }); }
function bash() { // kolvslag: när allt ammo är slut
  if (P.kickT > 0) return; P.kickT = 0.5; WS.kick = 0.3; play('whoosh', 0.5, 1.1);
  for (const e of ents) {
    if (e.dead || e.hidden || e.dormant) continue;
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
    if (d < 1.4 + e.d.size * 0.3 && Math.abs(off) < 0.6) { hurtEnemy(e, 4 * (1 + mod('dmg')), e.x, e.y); play('kick', 0.7); P.shake = Math.max(P.shake, 0.6); }
  }
}
function spawnImpact(x, y, z) {
  particles.push({ x, y, z: z - 0.08, vx: 0, vy: 0, vz: 0, life: 0.25, maxLife: 0.25, frames: fx.hit, img: fx.hit[0], size: 0.16, add: true });
}
const decals = []; // blodpölar på golvet
function addDecal(x, y) { const f = fx.parts.blood_pool; if (f && !solid(x, y)) { decals.push({ x: x + rnd(-0.15, 0.15), y: y + rnd(-0.15, 0.15), img: f[(Math.random() * f.length) | 0], size: rnd(0.07, 0.1) }); if (decals.length > 70) decals.shift(); } }
const numbers = []; // skadesiffror som flyger upp
function spawnNumber(x, y, dmg, crit) {
  for (let i = numbers.length - 1; i >= Math.max(0, numbers.length - 6); i--) { const n = numbers[i]; if (typeof n.v === 'number' && n.t > 0.6 && n.crit === crit && Math.hypot(n.x - x, n.y - y) < 0.45) { n.v += Math.max(1, Math.round(dmg * 10)); n.t = 0.8; n.z = Math.min(n.z, 0.95); n.big = true; return; } } // snabba träffar klumpas ihop
  numbers.push({ x: x + rnd(-0.15, 0.15), y: y + rnd(-0.15, 0.15), z: 0.9, v: Math.max(1, Math.round(dmg * 10)), crit, t: 0.8 }); if (numbers.length > 40) numbers.shift(); }
const maxHp = () => run && cmode('onehit') ? 1 : (dmod('light') ? 75 : 100) + mod('maxHp') + meta('hp') * 10 + (run && run.blessed ? 20 : 0) + (run && run.mealHp || 0) + (settings.assistHp ? 50 : 0);
// själaaltaret: bestående uppgraderingar som köps med själar på startskärmen
const META = [
  { id: 'hp', name: 'HÄRDAD', text: '+10 MAX HP PER NIVÅ', max: 3, cost: [30, 60, 100] },
  { id: 'gold', name: 'ARVET', text: '+25 STARTGULD PER NIVÅ', max: 3, cost: [20, 40, 70] },
  { id: 'ammo', name: 'KRUTVÄSKAN', text: '+50 % STARTAMMO PER NIVÅ', max: 2, cost: [25, 50] },
  { id: 'armor', name: 'BRYNJAN', text: '+25 STARTRUSTNING PER NIVÅ', max: 2, cost: [30, 60] },
  { id: 'choice', name: 'SIARENS ÖGA', text: '+1 VAL AV STARTKORT', max: 1, cost: [80] },
  { id: 'grenade', name: 'KRUTHORNET', text: '+1 STARTGRANAT PER NIVÅ', max: 2, cost: [20, 45] },
  { id: 'stamina', name: 'LÅNGA ANDAN', text: '+15 % UTHÅLLIGHET PER NIVÅ', max: 2, cost: [25, 50] },
  { id: 'luck', name: 'FYRKLÖVERN', text: 'BÄTTRE KORT PER NIVÅ', max: 3, cost: [35, 70, 120] },
  { id: 'reroll', name: 'TÄRNINGEN', text: 'ETT GRATIS "NYA KORT" PER RUNDA', max: 1, cost: [60] },
  { id: 'key', name: 'DYRKEN', text: 'BÖRJA MED EN NYCKEL', max: 1, cost: [45] },
  { id: 'pet', name: 'FLOCKEN', text: 'LÅS UPP EN FÖLJESLAGARE PER NIVÅ: KORPEN, LYKTAN, VARGVALPEN, ELDFLUGAN, STENGOLEMEN, UGGLAN', max: 6, cost: [40, 70, 110, 120, 150, 180] },
  { id: 'potslot', name: 'BANDOLJÄREN', text: 'EN TREDJE DRYCKESPLATS', max: 1, cost: [60] },
  { id: 'potstart', name: 'MORGONDOPPET', text: 'BÖRJA RUNDAN MED EN LÄKEDRYCK', max: 1, cost: [35] },
  { id: 'runeslot', name: 'RUNSMEDEN', text: 'EN ANDRA RUNPLATS I VARJE VAPEN', max: 1, cost: [90] },
  { id: 'camp', name: 'VANDRARENS ELD', text: 'LÄGERELDAR DYKER UPP OFTARE', max: 1, cost: [50] },
  { id: 'startrune', name: 'ARVSRUNAN', text: 'BÖRJA RUNDAN MED EN RUNA I PISTOLEN', max: 1, cost: [70] },
  { id: 'lamp', name: 'LYKTMAKAREN', text: '+40 SEKUNDERS BATTERI I FICKLAMPAN PER NIVÅ', max: 2, cost: [30, 60] },
  { id: 'stones', name: 'STENSAMLAREN', text: '+2 KASTSTENAR VID START PER NIVÅ', max: 2, cost: [20, 40] },
  { id: 'mastery', name: 'VAPENSKOLAN', text: 'ALLA VAPEN BÖRJAR PÅ VANA NIVÅ 2', max: 1, cost: [90] },
  { id: 'wisdom', name: 'VISDOMEN', text: '+10 % ERFARENHET PER NIVÅ', max: 2, cost: [30, 60] },
  { id: 'talentroll', name: 'ÖDETS TÄRNING', text: '+1 OMSLAG AV TALANGVAL PER RUNDA', max: 2, cost: [40, 80] },
  { id: 'startlvl', name: 'FÖRBEREDELSEN', text: 'BÖRJA RUNDAN PÅ NIVÅ 2 MED ETT TALANGVAL', max: 1, cost: [100] },
];
const meta = id => (profile.meta && profile.meta[id]) || 0;
function openAltar() {
  const items = () => META.map(m => ({ kind: 'meta', id: m.id, label: `${meta(m.id) >= m.max ? '✓ ' : meta(m.id) ? '◐ ' : ''}${m.name} ${meta(m.id)}/${m.max}`, text: meta(m.id) >= m.max ? 'KÖPT – ' + m.text : meta(m.id) ? `KÖPT ${meta(m.id)} AV ${m.max} – ` + m.text : m.text, price: meta(m.id) >= m.max ? 0 : m.cost[meta(m.id)], owned: meta(m.id) >= m.max }));
  CardUI.shop(items(), profile.souls, item => {
    const m = META.find(x => x.id === item.id);
    if (item.owned || profile.souls < item.price) return { ok: false, gold: profile.souls };
    profile.souls -= item.price; profile.meta = profile.meta || {}; profile.meta[m.id] = meta(m.id) + 1; saveProfile(); play('buy', 0.8); checkAch();
    return { ok: true, gold: profile.souls, items: items() };
  }, () => refreshTitle(), { title: 'SJÄLAALTARET', currency: 'SJÄLAR', currencyColor: '#c0a0ff' });
}
function heal(n, silent) { if (dmod('gold')) n *= 0.7; const before = P.hp; if (!silent) lvlStat.healed = (lvlStat.healed || 0) + 1; P.hp = Math.max(P.hp, Math.min(maxHp(), P.hp + n)); return P.hp - before; }
// kind: 'melee' | 'proj' | undefined
function hurtPlayer(d, fx0, fy0, kind) {
  if (params.has('god') || state !== 'play') return;
  // träffar som studsar av glömmer sin orsak, så en senare dödsstöt inte ärver den
  if (P.iframe > 0) { run.cause = ''; return; }
  if (Math.random() < mod('dodge')) { run.cause = ''; say('UNDVEK!', 0.8); play('whoosh', 0.4, 1.5); return; }
  d *= diff().dmg * Math.max(0.15, 1 + mod('damageTaken')) * (dmod('glass') ? 1.5 : 1);
  d = shieldDmg(d, fx0, fy0, kind); if (d <= 0) { if (state === 'play') run.cause = ''; return; }
  if (kind === 'proj') d *= Math.max(0, 1 - mod('projectileResist'));
  if (kind === 'melee') d *= Math.max(0, 1 - mod('meleeResist'));
  P.shieldT = 4;
  if (P.shield > 0) { const s = Math.min(P.shield, d); P.shield -= s; d -= s; }
  const hadArmor = P.armor > 0, absorbed = Math.min(P.armor, d * 0.5); P.armor -= absorbed; d -= absorbed;
  if (hadArmor && P.armor <= 0.5) { P.armor = 0; play('ice_break', 0.7, 0.8); say('RUSTNINGEN BRAST', 1.5); for (let i = 0; i < 8; i++) particles.push({ x: P.x + Math.cos(P.a) * 0.5, y: P.y + Math.sin(P.a) * 0.5, z: 0.4, vx: rnd(-1.5, 1.5), vy: rnd(-1.5, 1.5), vz: rnd(0.5, 2), life: 0.8, img: fx.hit[2], size: 0.06, add: true, tint: [140, 190, 255], grav: true }); }

  if (fx0 !== undefined && (boss || guardianE)) { const b = boss || guardianE; if (Math.hypot(b.x - fx0, b.y - fy0) < 3) taunt(b); }
  const who = noteDamage(d, fx0, fy0, kind);
  if (run && run.practice && run.practice.god) d = Math.min(d, Math.max(0, P.hp - 1)); // övning: du kan inte dö
  P.hp -= d; P.hurt = 0.35; P.shake = Math.max(P.shake, 1.2); lvlStat.taken += d; talentHooksHurt(); style.v = Math.max(0, style.v - 6 - d * 0.6); // skada sänker stilen
  { const c = run.cause || ''; P.hurtCol = /LAVA|ELD|BRAND|HETTA|SOL|BOMB|EXPLOS/.test(c) ? '230,110,20' : /GIFT|SLEM|SPINDEL|SKARAB/.test(c) ? '60,170,40' : /IS|FROST|KYL|SNÖ/.test(c) ? '60,140,230' : /BLIXT|STORM/.test(c) ? '170,120,255' : '190,0,0'; }
  if (settings.vibrate !== false && navigator.vibrate) try { navigator.vibrate(Math.min(120, 20 + d * 4)); } catch (e) { /* ingen vibration */ }
  play('hurt', 0.8, rnd(0.9, 1.1)); rumble(Math.min(1, 0.3 + d / 30), 160);
  if (fx0 !== undefined) hurtDir.push({ ang: Math.atan2(fy0 - P.y, fx0 - P.x), t: 1, col: kind === 'proj' ? '255,120,0' : kind === 'melee' ? '220,0,0' : '200,60,200' });
  if (P.hp <= 0) run.cause = (fx0 !== undefined && ents.find(e => !e.dead && Math.abs(e.x - fx0) < 0.01 && Math.abs(e.y - fy0) < 0.01) || {}).d?.name || run.cause || who || (kind === 'proj' ? 'PROJEKTILER' : kind === 'trap' ? 'FÄLLOR' : 'MILJÖN');
  if (P.hp <= 0) {
    if (run.livesUsed < mod('extraLife')) { // återupplivning från ett kort
      run.livesUsed++; P.hp = maxHp() * 0.5; P.hurt = 1; say('DU VÄGRAR DÖ!', 3); play('secret', 0.8, 1.4);
      for (const e of ents) if (!e.dead && Math.hypot(e.x - P.x, e.y - P.y) < 3) hurtEnemy(e, 8, e.x, e.y, { noProc: true });
      run.cause = ''; // överlevde: orsaken ska inte hänga kvar till nästa träff
      return;
    }
    state = 'dead'; P.hp = 0; P.deadT = 0; play('lose', 0.8);
    profile.lastDeath = { seed: run.seed, depth: run.depth, x: P.x, y: P.y, cause: run.cause || '' };
    stopAmbient(); setMusic(false);
    if (breathSnd) { breathSnd.s.stop(); breathSnd = null; }
    endRun(false);
  } else run.cause = ''; // överlevde träffen: töm orsaken så den inte tillskrivs en senare dödsstöt
}


// ---------- Interaktion: dörrar, kistor, köpman ----------
function useKey() {
  TUT.used = true;
  if (useProp()) return;
  for (const e of ents) if (e.dormant && Math.hypot(e.x - P.x, e.y - P.y) < 1.4) { wakeMimic(e); return; }
  for (const c of chests) if (!c.open && Math.hypot(c.x - P.x, c.y - P.y) < 1.2) { openChest(c); return; }
  for (const m of merchants) if (Math.hypot(m.x - P.x, m.y - P.y) < 1.6 && shadowVisible(m)) { openShop(m); return; }
  for (const dist of [0.6, 1.0, 1.4]) {
    const nx = P.x + Math.cos(P.a) * dist, ny = P.y + Math.sin(P.a) * dist;
    const d = doorAt(nx, ny);
    if (!d || !isDoorChar(cellAt(nx, ny))) continue;
    if (d.oneway && v24Use(d)) return; // version 24: enkelriktad genvägsdörr
    if (d.secret) {
      if (d.target) return;
      d.target = 1; secrets++; score += 250; profile.secrets = (profile.secrets || 0) + 1; play('secret', 0.8); say('DU HITTADE ETT HEMLIGT RUM!', 3); return;
    }
    if (d.arena) { say('ARENAN ÄR LÅST – DÖDA ALLA VÅGOR', 2); play('click', 0.6, 0.6); return; }
    if (d.glock) { say('DÖRREN ÄR FÖRSEGLAD – BESEGRA VÄKTAREN', 2); play('click', 0.6, 0.6); return; }
    if (d.lever && !d.target) { say('GALLRET RÖR SIG INTE – HITTA SPAKEN', 2); play('click', 0.6, 0.6); return; }
    if (d.locked) { if (P.keys > 0) { P.keys--; stat('unlocks'); d.locked = false; d.target = 1; play('unlock', 0.9); say('DU LÅSER UPP DÖRREN', 2); } else { say('LÅST – DU BEHÖVER EN NYCKEL', 2); play('click', 0.6, 0.6); } return; }
    if (d.gate && boss && !boss.dead) { say('GRINDEN ÄR LÅST – DÖDA ' + boss.d.name, 2.5); play('click', 0.6, 0.6); return; }
    if (d.target && occupied(d)) { say('NÅGOT STÅR I VÄGEN', 1.2); return; }
    d.target = d.target ? 0 : 1; play(d.gate ? 'gate' : 'door', 0.6, 1, { x: d.x + 0.5, y: d.y + 0.5 });
    for (const e of ents) if (!e.dead && !e.alert && !e.dormant && Math.hypot(e.x - d.x - 0.5, e.y - d.y - 0.5) < 5) { e.sleep = false; e.lookAt = { x: d.x + 0.5, y: d.y + 0.5 }; if (Math.random() < 0.5) alertEnemy(e, false); } // fienderna hör dörren
    return;
  }
  kick(); // inget att använda: sparka i stället
}
function kick() { // spark: knuffar fiender bakåt, bryter krukor och lådor
  if (P.kickT > 0 || state !== 'play') return;
  if (v26bLunge()) return; // version 26B: flygspark mot en vacklande fiende längre bort
  P.kickT = 0.55; WS.kick = 0.3; play('whoosh', 0.4, 1.4);
  let hit = kickParry() > 0;
  const v26p = v26bKick(); if (v26p) hit = true; // version 26B: närstridsparering och granatretur
  for (const e of ents) {
    if (e.dead || e.dying || e.hidden) continue;
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy);
    let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
    if (d > 1.5 + e.d.size * 0.3 || Math.abs(off) > 0.7) continue;
    if (v26p && v26p.has(e)) continue; // version 26B: den parerade fienden sparkas inte i samma spark (den vacklar och avrättas av nästa)
    if (canExec(e)) { execute(e); hit = true; continue; } // avrättning
    hit = true; hurtEnemy(e, 2 * (1 + mod('dmg')), e.x, e.y, { noProc: true });
    if (!e.boss && !e.dead) { for (let i = 0; i < 6; i++) tryMove(e, dx / d * 0.22, dy / d * 0.22, 0.28); e.state = 'pain'; e.t = 0; e.charge = 0; }
  }
  for (const pt of pots) if (!pt.broken && Math.hypot(pt.x - P.x, pt.y - P.y) < 1.4) { breakPot(pt); hit = true; }
  const fx0 = P.x + Math.cos(P.a) * 0.9, fy0 = P.y + Math.sin(P.a) * 0.9, dd = doorAt(fx0, fy0);
  if (dd && dd.oneway && dd.target === 0) { v24Bump(dd); hit = true; } else // version 24: den enkelriktade dörren går inte att sparka upp från fel sida
  if (dd && cellAt(fx0, fy0) === 'D' && dd.target === 0 && !dd.glock) { dd.target = 1; dd.open = Math.max(dd.open, 0.5); play('kick', 0.9, 0.7); play('door', 0.8, 1.4, { x: dd.x + 0.5, y: dd.y + 0.5 }); hit = true; } // sparka upp dörrar
  for (const pr of props) { // sparka krutfat iväg, statyer kan gömma guld
    if (!pr.def || pr.broken || Math.hypot(pr.x - fx0, pr.y - fy0) > 0.8) continue;
    if (pr.def.boom === 'flask') { hitProp(pr, pr.x, pr.y); hit = true; } // flaskhyllan rullar inte: den går sönder där den står
    else if (pr.def.boom) { pr.broken = true; map[pr.cy][pr.cx] = '.'; flowCell = -1; projectiles.push({ x: pr.x, y: pr.y, z: 0.3, vx: Math.cos(P.a) * 6, vy: Math.sin(P.a) * 6, kind: 'barrel', friendly: true, life: 2, dmg: 30, img: pr.frames[0] }); hit = true; say('KRUTFATET RULLAR!', 1); }
    else if (pr.ch === 'u' && !pr.kicked) { pr.kicked = true; hit = true; if (Math.random() < 0.3) { for (let i = 0; i < 6; i++) dropItem('gold', pr.x, pr.y); say('GULD I SOCKELN!', 1.5); play('coin', 0.8); } }
  }
  if (breakProps(P.x + Math.cos(P.a) * 0.9, P.y + Math.sin(P.a) * 0.9, 0.7, true)) hit = true;
  if (hit) { play('kick', 0.7, rnd(0.9, 1.1)); P.shake = Math.max(P.shake, 0.6); hitStop = Math.max(hitStop, 0.03); }
}
function occupied(d) { // dörren får inte stängas på någon
  const inCell = o => Math.abs(o.x - (d.x + 0.5)) < 0.8 && Math.abs(o.y - (d.y + 0.5)) < 0.8;
  return inCell(P) || ents.some(e => !e.dead && inCell(e));
}
function aimedAt(e) { const d = Math.hypot(e.x - P.x, e.y - P.y); let off = Math.atan2(e.y - P.y, e.x - P.x) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off)); return Math.abs(off) < Math.max(0.03, 0.4 * e.d.size / d); }
function idleBehaviour(e, dt, dist) { // patrullering, sömn och ljud från fiender som inte sett dig
  e.state = 'idle';
  if (e.sleep) { if (Math.random() < dt * 0.6 && dist < 12 && fx.parts.zzz) particles.push({ x: e.x, y: e.y, z: e.d.size * 0.7, vx: 0.1, vy: 0, vz: 0.35, life: 1.4, maxLife: 1.4, img: fx.parts.zzz[0], size: 0.08, drift: true }); return; }
  if (e.searchT > 0) { e.searchT -= dt; if (Math.random() < dt * 2) spawnText(e.x, e.y, '?', '#e8d9b0'); }
  if (e.patrol) {
    const [tx, ty] = e.patrol.leg ? [e.patrol.x2, e.patrol.y2] : [e.patrol.x1, e.patrol.y1];
    const d = Math.hypot(tx - e.x, ty - e.y);
    if (d < 0.3) { e.patrol.wait -= dt; if (e.patrol.wait <= 0) { e.patrol.leg = !e.patrol.leg; e.patrol.wait = rnd(1, 3); } }
    else { const a = Math.atan2(ty - e.y, tx - e.x), sp = e.d.speed * 0.45 * dt, ox = e.x, oy = e.y; tryMove(e, Math.cos(a) * sp, Math.sin(a) * sp, 0.28); e.mvx = e.x - ox; e.mvy = e.y - oy; e.state = 'move'; if (Math.hypot(e.mvx, e.mvy) < sp * 0.2) e.patrol.leg = !e.patrol.leg; }
  }
  if (dist < 3.5 && (e.breathT || 0) < tmr) { e.breathT = tmr + rnd(4, 8); play(e.d.growl, 0.15, rnd(0.7, 0.9), { x: e.x, y: e.y }); } // nära: man hör dem andas
}
function noise(r, cause) { // ljud som fiender kan höra (fotsteg, spring, explosioner); tysta ljud gör dem bara misstänksamma
  r *= Math.max(0.2, 1 - mod('noiseReduce')); noiseLvl = Math.max(noiseLvl, Math.min(1, r / 12));
  for (const e of ents) if (!e.dead && !e.alert && !e.dormant && pathDist(e) < (e.sleep ? r * 0.5 : r)) { if (e.sleep && cause !== 'boom') continue; e.sleep = false;
    if (r >= 9 || cause === 'boom') alertEnemy(e, false); else { e.inv = { x: P.x, y: P.y }; e.invT = 0; if (!e.susp) { e.susp = true; play('suspicious', 0.3, rnd(0.9, 1.1), { x: e.x, y: e.y }); } } }
}
function alertEnemy(e, spread) {
  if (e.dead) return;
  if (!e.alert && e.d.tip && run) { // första mötet med en ny sorts fiende i rundan
    run.seen = run.seen || [];
    if (!run.seen.includes(e.type)) { run.seen.push(e.type); say(`NY FIENDE: ${e.d.name}`, 2.4); speak(`${e.d.name}: ${e.d.tip}`); } // bara namnet i bilden – förklaringen finns i bestiariet (och läses upp med talsyntesen)
  }
  if (!e.alert && e.type === 'É' && !e.howled) { e.howled = true; play('icewolf', 0.8, rnd(0.9, 1.1), { x: e.x, y: e.y }); for (const o of ents) if (o.type === 'É' && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 15) { o.howled = true; if (!o.alert) { o.alert = true; o.spotT = 0.9; } } } // ylet kallar flocken
  if (!e.alert) { e.alert = true; e.spotT = 0.9; e.cd = Math.max(e.cd, rnd(0.35, 0.8)); if (Math.random() < 0.7) play(e.d.growl, 0.5, rnd(0.9, 1.1), { x: e.x, y: e.y }); }
  if (spread) for (const o of ents) if (o !== e && !o.dead && !o.alert && Math.hypot(o.x - e.x, o.y - e.y) < 6 && hasLOS(o.x, o.y, e.x, e.y)) alertEnemy(o, false);
}
// UI-lägen: släpp musen, pausa världen, återgå när UI stängs
function openUI(fn) {
  state = 'ui'; mouseDown = false; aimDown = false; for (const k in keys) keys[k] = false;
  if (document.pointerLockElement) document.exitPointerLock();
  fn();
}
function closeUI(next = 'play') { state = next; if (next === 'play') lockPointer(); }
function draftUI(cards, opts, cb) { // kortval med synergi, NY-märken, förvisning (en gång per våning) och nya kort för guld
  profile.cardsSeen = profile.cardsSeen || [];
  const seen = new Set(profile.cardsSeen), n = cards.length, luck = opts.luck;
  const mark = cs => { for (const c of cs) if (c && !profile.cardsSeen.includes(c.id)) profile.cardsSeen.push(c.id); saveProfile(); };
  mark(cards);
  if (cmode('nocards')) { const g = 25 + run.depth * 3; run.gold += g; say(`INGA KORT: +${g} GULD I STÄLLET`, 2); play('coin', 0.7); setTimeout(() => cb(null), 0); return; } // utmaningsläget
  const o = Object.assign({ owned: run.owned.slice(), seen, ownedCount: ownedCount(), mods: Object.assign({}, M) }, opts);
  if (run.banishFloor !== run.depth) o.banish = card => { run.banished = run.banished || []; run.banished.push(card.id); run.banishFloor = run.depth; const r = drawCards(1, { luck })[0] || null; if (r) mark([r]); return r; };
  const price = () => (run.freeRerolls || 0) > 0 ? 0 : 15 + 10 * (run.draftRerolls || 0);
  o.reroll = { price, gold: run.gold, onReroll: () => { const pr = price(); if (run.gold < pr) return null; if (pr === 0) run.freeRerolls--; else { run.gold -= pr; run.draftRerolls = (run.draftRerolls || 0) + 1; } const cs = drawCards(n - Math.round(mod('cardChoices')), { luck }); mark(cs); return { cards: cs, gold: run.gold }; } };
  return CardUI.draft(cards, o, cb);
}
function drawCards(n, opt = {}) { return Cards.draw(run.cardRng, n + Math.round(mod('cardChoices')), { owned: run.owned.concat(...(run.banished || []).map(id => Array(9).fill(id))), depth: run.depth, luck: mod('luck') + (opt.luck || 0), unlocked: new Set(profile.unlocked), pact: run.pact }); }
function gainCard(card) {
  cardGained(card);
  if (!card) return;
  noteCardPick(card);
  run.owned.push(card.id); recomputeMods(); play('card', 0.8);
  if (card.pact) swearPact(card.pact);
  if (P.hp > maxHp()) P.hp = maxHp();
  P.shield = Math.min(P.shield, mod('shield'));
}
const pactAmmo = () => WEAPONS.find(w => w.id === run.pact).ammo;
function swearPact(id) { // vapenpakt: bara ett vapen resten av rundan, men det kan få unika uppgraderingar
  run.pact = id;
  const i = WEAPONS.findIndex(w => w.id === id), wp = WEAPONS[i];
  if (!P.has[i]) { P.has[i] = true; P.mags[i] = effMag(i); }
  P.ammo[wp.ammo] = Math.min(AMMO[wp.ammo].max, P.ammo[wp.ammo] + ({ p9: 40, r556: 40, shells: 12, bolts: 14, flares: 8, fuel: 120, lgren: 10, nails: 100, arrows: 15, knives: 14, balls: 12, harpoons: 6, crystals: 40, gears: 12, spores: 8, ink: 16, bees: 10, dreams: 6, chainballs: 4, acid: 60, pins: 8, darts: 16, stars: 6, traps: 4, scrap: 8, brimstone: 4, cannonballs: 4 }[wp.ammo] || 0));
  for (let k = 0; k < WEAPONS.length; k++) if (k !== i) P.has[k] = false;
  if (P.weapon !== i) { P.weapon = i; WS.state = 'draw'; WS.t = 0; WS.next = -1; }
  say('DU HAR SVURIT DIG TILL ' + wp.name, 3); play('secret', 0.7, 0.7);
}
function openChest(c) {
  if (c.locked) { if (P.keys > 0) { P.keys--; stat('unlocks'); c.locked = false; play('unlock', 0.9); c.rare = true; } else { say('KISTAN ÄR LÅST – DU BEHÖVER EN NYCKEL', 2); play('click', 0.6, 0.6); return; } }
  c.open = true; c.t = 0; play('chest', 0.8); itemsTaken++; score += 100; gfxWChest(c);
  for (let i = 0; i < 3; i++) dropItem('gold', c.x, c.y);
  if (Math.random() < 0.2 + mod('potionChance')) dropItem('potion', c.x, c.y); // ibland en dryck
  if (c.cursed && Math.random() < 0.5) { // förbannad kista: en fälla
    say('KISTAN VAR FÖRBANNAD!', 2); play('bossroar', 0.6, 1.6);
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU, x = c.x + Math.cos(a) * 1.6, y = c.y + Math.sin(a) * 1.6; if (!solid(x, y)) { const e = makeEnemy(run.depth >= 3 ? 'V' : 'S', x, y); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(x, y, 6); } }
  }
  const n = 3 + Math.round(mod('chestChoice')) + (c.cursed ? 1 : 0);
  gfxWDefer(() => openUI(() => draftUI(drawCards(n, { luck: 0.5 + run.depth * 0.06 + (c.rare ? 0.8 : 0) + (c.cursed ? 0.6 : 0) }), { title: c.rare ? 'DEN GLITTRANDE KISTAN' : c.cursed ? 'DEN FÖRBANNADE KISTAN' : 'KISTAN', subtitle: 'VÄLJ ETT KORT', skipLabel: 'TA INGET' }, card => { gainCard(card); closeUI(); })));
}
function shopItems(m) {
  if (!m.stock) {
    const unhurt = lvlStat.taken === 0 && levelTime > 10; // oskadd: köpmannen ger rabatt
    const disc = clamp(mod('shopDiscount') - (asc() >= 2 ? 0.2 : 0) + (unhurt ? 0.15 : 0) + (m.shadow ? 0.25 : 0), -0.3, 0.8);
    if (unhurt) setTimeout(() => say('KÖPMANNEN: "OSKADD? IMPONERANDE. 15 % RABATT."', 3), 200);
    const cards = drawCards(3 + Math.floor(run.depth / 3)).map(card => ({ kind: 'card', card, price: Cards.price(card, run.depth, disc) }));
    m.stock = cards.concat([
      { kind: 'health', label: '+40 HÄLSA', price: Math.round(30 * (1 - disc)) },
      { kind: 'armor', label: '+50 RUSTNING', price: Math.round(40 * (1 - disc)) },
      { kind: 'ammo', label: 'AMMUNITION', price: Math.round(25 * (1 - disc)) },
      { kind: 'reroll', label: 'NYA KORT', price: (run.freeRerolls || 0) > 0 ? 0 : 15 + 10 * run.rerolls },
      { kind: 'purge', label: 'RENSA ETT KORT', text: 'TA BORT ETT KORT UR LEKEN', price: Math.round((50 + 15 * run.depth) * (1 - disc)) },
      { kind: 'rune', label: 'RUNSTEN', text: 'EN SLUMPAD RUNA ATT FÄSTA I ETT VAPEN', price: Math.round(70 * (1 - disc)) },
      { kind: 'potion', act: 'potion', pot: 'heal', color: '#e04848', label: 'LÄKEDRYCK', text: '+50 HÄLSA NÄR DU DRICKER DEN (H)', price: Math.round(35 * (1 - disc)) },
      ...(isBossDepth(run.depth + 1) ? [] : [{ kind: 'map', label: 'KARTOGRAFENS KARTA', text: 'HELA NÄSTA VÅNING SYNS PÅ KARTAN', price: Math.round(30 * (1 - disc)) }]),
      ...((run.depth >= 3 || m.shadow || (run.seed + run.depth) % 3 === 0) && !run.pact && !cmode('pistol') && WEAPONS.some((w, i) => !P.has[i]) ? [(() => { const miss = WEAPONS.map((w, i) => i).filter(i => !P.has[i]), i = miss[(run.depth * 7) % miss.length]; return { kind: 'weapon', label: WEAPONS[i].name, text: 'ETT NYTT VAPEN', price: Math.round(120 * (1 - disc)), wid: WEAPONS[i].id }; })()] : []),
      { kind: 'grenade', label: 'GRANAT', text: '+1 GRANAT', price: Math.round(25 * (1 - disc)) },
      { kind: 'gamble', label: 'TÄRNINGSSPEL', text: 'SATSA 30 GULD: HÄLFTEN AV GÅNGERNA FÅR DU 70', price: 30 },
      { kind: 'mystery', label: 'MYSTERIEKORT', text: 'ETT OKÄNT KORT, MINST SÄLLSYNT', price: Math.round(90 * (1 - disc)) },
    ]);
  }
  // efter en pakt: inga andra pakter och bara uppgraderingar för det egna vapnet
  m.stock = m.stock.filter(s => s.kind !== 'card' || (!(run.pact && s.card.pact) && (!s.card.weapon || s.card.weapon === run.pact)));
  if (cmode('nocards')) m.stock = m.stock.filter(s => s.kind !== 'card' && s.kind !== 'mystery' && s.kind !== 'purge');
  if (!m.saleDone) { m.saleDone = true; const c = m.stock.filter(s => s.kind === 'card' && s.price); const it = c[(Math.random() * c.length) | 0]; if (it) { it.price = Math.round(it.price * 0.6); it.label = 'REA: ' + it.card.name; } } // ett erbjudande per butik
  if (!m.stock.some(s => s.act === 'haggle')) m.stock.push({ kind: 'gamble', act: 'haggle', label: 'PRUTA', text: 'CHANS TILL 15 % RABATT – ELLER SURARE PRISER', price: 0 }, { kind: 'curse', act: 'steal', label: 'STJÄL', text: 'TA EN VARA GRATIS – KÖPMANNEN BLIR DIN FIENDE', price: 0 },
    { kind: 'gamble', act: 'sellcard', label: 'SÄLJ ETT KORT', text: 'FÅ GULD FÖR ETT KORT DU INTE VILL HA', price: 0 }, { kind: 'potion', act: 'sellpot', label: 'SÄLJ EN DRYCK', text: '+15 GULD', price: 0 }, { kind: 'rune', act: 'sellrune', label: 'SÄLJ EN RUNA', text: '+30 GULD', price: 0 });
  return m.stock;
}
function openShop(m) {
  openUI(() => CardUI.shop(shopItems(m), run.gold, item => {
    if (run.gold < item.price) return { ok: false, gold: run.gold };
    if (item.kind === 'health' && P.hp >= maxHp()) { say('DU ÄR REDAN FRISK', 1.2); return { ok: false, gold: run.gold }; }
    if (item.act === 'haggle') { const r = haggle(m); return { ok: true, gold: run.gold, items: shopItems(m), msg: r.msg }; }
    if (item.act === 'steal') { setTimeout(() => { closeUI(); stealFrom(m); }, 50); return { ok: true, gold: run.gold }; }
    if (item.act === 'sellcard') { setTimeout(() => { closeUI(); sellCards(() => {}); }, 50); return { ok: true, gold: run.gold }; }
    if (item.act === 'sellpot') { if (!(P.potions || []).length) return { ok: false, gold: run.gold, msg: 'DU HAR INGA DRYCKER' }; P.potions.pop(); run.gold += 15; play('coin', 0.7); return { ok: true, gold: run.gold, msg: 'SÅLDE EN DRYCK: +15 GULD' }; }
    if (item.act === 'sellrune') { if (!(run.runeBag || []).length) return { ok: false, gold: run.gold, msg: 'DU HAR INGA LÖSA RUNOR' }; run.runeBag.pop(); run.gold += 30; play('coin', 0.7); return { ok: true, gold: run.gold, msg: 'SÅLDE EN RUNA: +30 GULD' }; }
    run.gold -= item.price; play('buy', 0.8); run.goldSpent = (run.goldSpent || 0) + item.price; stat('itemsBought');
    if (item.kind === 'card' && item.card) { gainCard(item.card); m.stock = m.stock.filter(s => s !== item); if (item.card.pact) return { ok: true, gold: run.gold, items: shopItems(m) }; }
    else if (item.kind === 'health') heal(40 * (1 + mod('healMul')));
    else if (item.kind === 'armor') P.armor = Math.min(200, P.armor + 50);
    else if (item.kind === 'ammo') pickUp({ type: 'ammo' }, true);
    else if (item.kind === 'potion') { if (!givePotion(item.pot, false, true)) { run.gold += item.price; return { ok: false, gold: run.gold, msg: 'DRYCKESPLATSERNA ÄR FULLA' }; } }
    else if (item.kind === 'rune') { m.stock = m.stock.filter(s => s !== item); setTimeout(() => { closeUI(); giveRune(RUNE_IDS[(Math.random() * RUNE_IDS.length) | 0], 'DU KÖPTE'); }, 50); return { ok: true, gold: run.gold }; }
    else if (item.kind === 'map') { run.nextMap = true; play('map_unroll', 0.8); m.stock = m.stock.filter(s => s !== item); return { ok: true, gold: run.gold, items: shopItems(m), msg: 'KARTAN VISAR NÄSTA VÅNING' }; }
    else if (item.kind === 'weapon') { pickUp({ type: item.wid, x: P.x, y: P.y }, true); m.stock = m.stock.filter(s => s !== item); return { ok: true, gold: run.gold, items: shopItems(m) }; }
    else if (item.kind === 'grenade') { if (P.grenades >= GREN_MAX()) { run.gold += item.price; return { ok: false, gold: run.gold, msg: 'DU KAN INTE BÄRA FLER' }; } P.grenades++; play('pickup', 0.7, 0.8); }
    else if (item.kind === 'gamble') { // dödgrävaren spelar tärning
      play('click', 0.6, 0.8); setTimeout(() => play('click', 0.6, 1.1), 150);
      if (Math.random() < 0.5) { run.gold += 70; play('coin', 0.9, 0.8); return { ok: true, gold: run.gold, msg: 'TÄRNINGARNA VISAR SEXOR: +70 GULD' }; }
      return { ok: true, gold: run.gold, msg: 'ETTOR. DÖDGRÄVAREN FLINAR.' };
    }
    else if (item.kind === 'mystery') { // ett sällsynt eller legendariskt kort, okänt tills det köps
      const pool = drawCards(8, { luck: 2 }).filter(c => c.rarity === 'sallsynt' || c.rarity === 'legendarisk'); const c = pool[0] || drawCards(1, { luck: 2 })[0];
      if (c) { gainCard(c); CardUI.toast(c, 'MYSTERIEKORTET'); } m.stock = m.stock.filter(s => s !== item); return { ok: true, gold: run.gold, items: shopItems(m) };
    } else if (item.kind === 'purge') {
      m.stock = m.stock.filter(s => s !== item);
      setTimeout(() => { const own = [...new Set(run.owned)].map(id => Cards.byId(id)).filter(c => c && !c.pact);
        if (!own.length) { closeUI(); return; }
        CardUI.draft(own, { title: 'RENSA ETT KORT', subtitle: 'VALT KORT FÖRSVINNER UR LEKEN', skipLabel: 'ÅNGRA (PENGARNA TILLBAKA)' }, c => { if (c) { run.owned.splice(run.owned.indexOf(c.id), 1); recomputeMods(); say(c.name + ' ÄR BORTA', 2); } else run.gold += item.price; closeUI(); }); }, 50);
      return { ok: true, gold: run.gold };
    }
    else if (item.kind === 'reroll') { if (item.price === 0) run.freeRerolls--; else run.rerolls++; m.stock = null; return { ok: true, gold: run.gold, items: shopItems(m) }; }
    return { ok: true, gold: run.gold };
  }, () => closeUI(), { title: m.shadow ? 'SKUGGHANDLAREN' : 'DÖDGRÄVARENS BOD', currency: 'GULD' }));
}

