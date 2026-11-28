// ---------- Version 30 (SPEL): Glasbruket och Glasmästaren ----------
// Smält glas ʟ (8 skada/s, fiender också), glasskärvor ʠ (3/s när man springer eller landar, fiender 2/s), ugnsmunnar ʡ (var 5:e s:
// glöd 0,6 s, sedan hetta 1,5 s, 10/s inom 1,5 rutor), smältugnar ʥ (lyser, glöd), glashyllor ʦ (skjuts sönder: skärvor), fönstren blir glas.
// Fiender: glasblåsaren, glasgolemen, slaggkryparen och ugnsanden. Boss: Glasmästaren (glaskupor, vågor av smält glas, glaskopior; fas 2: ugnarna oftare).
function v30GlassWindows() { // Glasbrukets fönster ǂ blir glas ǁ (FÖNSTER, 0086) – bara där båda sidorna redan hänger ihop utan lås (f29Labels/f29Sides)
  if (typeof F29 !== 'object' || !F29.on || !F29.glass || typeof f29Labels !== 'function') return;
  if (run && (run.custom || run.practice) && !params.get('v30win')) return;
  try { const lab = f29Labels(); let n = 0;
    for (let y = 1; y < mh - 1; y++) for (let x = 1; x < mw - 1; x++) { if (map[y][x] !== 'ǂ') continue; const sd = f29Sides(x, y); if (!sd) continue;
      const a = lab[sd[0][1] * mw + sd[0][0]], b = lab[sd[1][1] * mw + sd[1][0]]; if (a >= 0 && a === b) { map[y][x] = 'ǁ'; n++; } }
    V30.log.push('fönster→glas ' + n);
  } catch (e) { V30.log.push('fönster: ' + e.message); }
}
function v30Pain(kind, amt) { // spelarens skada av glasbrukets faror (motstånd från korten)
  const res = kind === 'molten' ? mod('moltenResist') : kind === 'shards' ? mod('shardStep') : mod('heatResist');
  return amt * trapMul() * clamp(1 - res, 0, 2);
}
function v30GlassTick(dt) {
  const ground = P.jz < 0.15, c = cellUnder(), immune = mod('hazardImmune') > 0, A = V30L.acc;
  // smält glas: 8 skada/s
  P.v30molten = Math.max(0, P.v30molten - dt);
  if (c === 'ʟ' && ground && !immune) { P.v30molten = 0.25; A.m = (A.m || 0) + dt;
    if (A.m >= 0.25) { A.m = 0; run.cause = 'SMÄLT GLAS'; hurtPlayer(v30Pain('molten', 2), P.x, P.y, 'fire'); v30Hint('molten', 'SMÄLT GLAS BRÄNNER – GÅ RUNT DET.'); } } else A.m = 0.2;
  // glasskärvor: 3 skada/s när man springer eller landar (inte när man går eller smyger)
  P.v30shard = Math.max(0, P.v30shard - dt);
  if (c === 'ʠ' && !immune) {
    const sp = Math.hypot(P.vx, P.vy), land = ground && (A.air || 0) > 0.25;
    if (land) { run.cause = 'GLASSKÄRVORNA'; hurtPlayer(v30Pain('shards', 3), P.x, P.y, 'melee'); play('shards_step', 0.8, rnd(0.9, 1.1)); P.v30shard = 0.6; }
    else if (ground && sp > 1.2 && wantRun() && P.stam > 0.02 && P.crouch < 0.5) { A.s = (A.s || 0) + dt; P.v30shard = 0.3; // springer (inte bara snabb: kort, potion och modifierare gör gången snabbare)
      if (A.s >= 0.33) { A.s = 0; run.cause = 'GLASSKÄRVORNA'; hurtPlayer(v30Pain('shards', 1), P.x, P.y, 'melee'); } v30Hint('shards', 'SKÄRVORNA SKÄR DEN SOM SPRINGER – GÅ ELLER SMYG ÖVER DEM.'); }
    if (ground && sp > 0.8 && (A.st || 0) < tmr) { const rn = wantRun() && P.crouch < 0.5; A.st = tmr + (rn ? 0.25 : 0.45); play('shards_step', rn ? 0.55 : 0.3, rnd(0.9, 1.15)); }
  }
  A.air = ground ? 0 : (A.air || 0) + dt;
  // ugnsmunnar: fas per ruta; glasmästarens fas 2 gör dem tätare
  const per = V30L.ventFast > 0 ? 3 : 5; V30L.ventFast = Math.max(0, V30L.ventFast - dt); P.v30heat = Math.max(0, P.v30heat - dt);
  for (const v of V30L.vents) {
    v.ph = (v.ph + dt) % per; const t = v.ph, warn = per - 2.1, cx = v.x + 0.5, cy = v.y + 0.5;
    v.state = t >= per - 1.5 ? 2 : t >= warn ? 1 : 0; v.k = v.state === 1 ? (t - warn) / 0.6 : 0;
    if (v.state === 1 && !settings.lowfx && Math.random() < dt * 10) wpPart({ x: cx + rnd(-0.3, 0.3), y: cy + rnd(-0.3, 0.3), z: 0.05, vx: rnd(-0.2, 0.2), vy: rnd(-0.2, 0.2), vz: rnd(0.4, 1), life: 0.8, img: (fx.parts.kilnember || fx.parts.ember || fx.hit)[0], size: 0.03, add: true, tint: [255, 160, 60], fade: true });
    if (v.state === 2) {
      if (!v.on) { v.on = true; const d = Math.hypot(P.x - cx, P.y - cy); if (d < 12 && V30L.sndT < tmr) { V30L.sndT = tmr + 0.4; play('furnace_blast', 0.75 * (1 - d / 13), rnd(0.92, 1.08), { x: cx, y: cy }); } }
      if (!settings.lowfx && Math.random() < dt * 16) wpPart({ x: cx + rnd(-0.4, 0.4), y: cy + rnd(-0.4, 0.4), z: 0.1, vx: rnd(-0.6, 0.6), vy: rnd(-0.6, 0.6), vz: rnd(1, 2), life: 0.6, img: (fx.parts.kilnember || fx.parts.ember || fx.hit)[0], size: 0.04, add: true, tint: [255, 170, 70], fade: true });
      v.acc += dt; const tick = v.acc >= 0.25; if (tick) v.acc = 0;
      if (tick) { if (Math.hypot(P.x - cx, P.y - cy) < 1.5 && P.jz < 0.8 && !immune) { run.cause = 'UGNSMUNNEN'; hurtPlayer(v30Pain('heat', 2.5), cx, cy, 'fire'); P.v30heat = 0.4; v30Hint('vent', 'UGNSMUNNEN GLÖDER INNAN DEN SPRUTAR – HÅLL AVSTÅND.'); }
        for (const e of ents) if (!e.dead && !e.dying && !e.boss && !e.hidden && e.d.ai !== 'kilnspirit' && e.d.ai !== 'slagcrawler' && Math.hypot(e.x - cx, e.y - cy) < 1.5) hurtEnemy(e, 2.5, cx, cy, { noProc: true, quiet: true }); }
    } else { v.on = false; v.acc = 0.2; }
  }
  // fienderna: smält glas och skärvor (inte flygande; slaggkryparen och ugnsanden tål hettan)
  for (const e of ents) { if (e.dead || e.dying || e.boss || e.d.float || e.hidden || e.dormant) continue; const ec = map[e.y | 0] && map[e.y | 0][e.x | 0];
    if (ec === 'ʟ' && e.d.ai !== 'slagcrawler') { e.v30acc = (e.v30acc || 0) + dt; if (e.v30acc >= 0.5) { e.v30acc = 0; hurtEnemy(e, 4, e.x, e.y, { noProc: true, quiet: true }); } }
    else if (ec === 'ʠ' && e.d.ai !== 'glassgolem') { e.v30acc = (e.v30acc || 0) + dt; if (e.v30acc >= 0.5) { e.v30acc = 0; hurtEnemy(e, 1, e.x, e.y, { noProc: true, quiet: true }); } } }
  // smältugnarna fladdrar och glöder
  if (!settings.lowfx) for (const pr of V30L.furnaces) { const d = Math.hypot(pr.x - P.x, pr.y - P.y); if (d > 9) continue;
    if (Math.random() < dt * 3) wpPart({ x: pr.x + rnd(-0.2, 0.2), y: pr.y + rnd(-0.2, 0.2), z: rnd(0.4, 0.8), vx: rnd(-0.2, 0.2), vy: rnd(-0.2, 0.2), vz: rnd(0.3, 0.8), life: 1.1, img: (fx.parts.kilnember || fx.parts.ember || fx.hit)[0], size: 0.03, add: true, tint: [255, 170, 70], fade: true }); }
  // ugnsandar som gömt sig i en ugn kommer ut ur en annan (oberoende av AI:n, som inte körs när anden inte är larmad)
  for (const e of ents) if (e.v30hide && !e.dead) { e.v30hide.t -= dt; if (e.v30hide.t <= 0) v30SpiritOut(e); }
  // glaskupor runt spelaren
  for (const d of V30L.domes) { d.t -= dt; const dd = Math.hypot(P.x - d.x, P.y - d.y);
    if (dd > 0.55 && dd < 1.4) { const a = Math.atan2(P.y - d.y, P.x - d.x), nx = d.x + Math.cos(a) * 0.55, ny = d.y + Math.sin(a) * 0.55; if (!solid(nx, ny)) { P.x = nx; P.y = ny; } else { P.x = d.x; P.y = d.y; } P.vx *= 0.3; P.vy *= 0.3; }
    if (lvlStat.shots - d.shots >= 3 || d.t <= 0 || P.dead) { d.done = true; play('glass_crack', 0.9, rnd(0.9, 1.1), { x: d.x, y: d.y }); if (typeof f29Shards === 'function') f29Shards(d.x, d.y, settings.lowfx ? 5 : 12, true); } }
  if (V30L.domes.length) { V30L.domes = V30L.domes.filter(d => !d.done); P.v30dome = V30L.domes[0] || null; }
  // vågor av smält glas längs golvet
  for (const w of V30L.waves) { w.t -= dt; if (w.t > 0) continue; w.t = 0.11; w.n++; const x = (w.x + w.dx * w.n) | 0, y = (w.y + w.dy * w.n) | 0;
    if (w.n > w.len || !map[y] || isWallChar(map[y][x])) { w.done = true; continue; } v30Temp(x, y, 'ʟ', 2.6);
    if ((x === (P.x | 0) && y === (P.y | 0)) && P.jz < 0.4) { run.cause = w.cause; hurtPlayer(w.dmg, x + 0.5, y + 0.5, 'fire'); }
    if (!settings.lowfx) for (let i = 0; i < 3; i++) wpPart({ x: x + 0.5 + rnd(-0.3, 0.3), y: y + 0.5 + rnd(-0.3, 0.3), z: 0.05, vx: 0, vy: 0, vz: rnd(0.6, 1.4), life: 0.6, img: (fx.parts.moltenglass || fx.parts.ember || fx.hit)[0], size: 0.05, grav: true, add: true }); }
  if (V30L.waves.length) V30L.waves = V30L.waves.filter(w => !w.done);
}

// ---- glashyllan ʦ: går att skjuta sönder (två skott, direkt av smäll eller närstrid) och lämnar skärvor ----
function v30BreakRack(pr) {
  if (pr.v30broken) return; pr.v30broken = true;
  const x = pr.cx, y = pr.cy; play('glassrack_break', 0.9, rnd(0.92, 1.08), { x: pr.x, y: pr.y });
  if (fx.props.glassrack_broken) { pr.frames = fx.props.glassrack_broken; pr.img = pr.frames[0]; }
  pr.def = { ...pr.def, block: false, anim: 0 }; // skotten går igenom den trasiga hyllan
  if (map[y] && map[y][x] === 'ʦ') { map[y][x] = 'ʠ'; if (cellFloor) cellFloor[y * mw + x] = v30FloorIdx('floor_shards'); flowCell = -1; if (typeof ai24Covers === 'function' && typeof AI24 === 'object' && AI24.cov) try { ai24Covers(); } catch (e) { /* nästa bana */ } }
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (Math.random() < 0.5) v30Temp(x + dx, y + dy, 'ʠ', 8);
  if (typeof f29Shards === 'function') f29Shards(pr.x, pr.y, settings.lowfx ? 6 : 14, true);
  stat('racks30'); v30Hint('rack', 'GLASHYLLORNA GÅR SÖNDER – SKÄRVORNA BLIR KVAR PÅ GOLVET.');
}
function v30HitProp(pr, hx, hy, dmg) {
  if (pr.ch !== 'ʦ' || pr.v30broken) return undefined;
  const hp = (V30L.rackHp.get(pr) ?? 2) - 1; V30L.rackHp.set(pr, hp);
  if (hp <= 0 || (dmg || 0) >= 20) { v30BreakRack(pr); return true; }
  play('glass_crack', 0.5, rnd(1.2, 1.4), { x: pr.x, y: pr.y }); if (typeof f29Shards === 'function') f29Shards(hx ?? pr.x, hy ?? pr.y, 3, false); return false;
}
function v30Melee(x, y, r) { let hit = false; for (const pr of props) if (pr.ch === 'ʦ' && !pr.v30broken && Math.hypot(pr.x - x, pr.y - y) < r + 0.3) { v30BreakRack(pr); hit = true; } return hit; } // sparken och närstriden (breakProps)
function v30BoomRacks(x, y, r) { for (const pr of props) if (pr.ch === 'ʦ' && !pr.v30broken && Math.hypot(pr.x - x, pr.y - y) < r + 0.4) v30BreakRack(pr); }

// ---- Glasbrukets fiender ----
const AI_V30G = {
  glassblower(e, dt, dist, los) {
    // blåser glasbubblor (långsamma) som spricker till skärvor där de landar
    e.bubT = (e.bubT ?? rnd(1.5, 3)) - dt;
    if (e.bubT <= 0 && los && e.alert && dist > 2.2 && dist < 9 && e.state !== 'pain') { e.bubT = rnd(3, 4.4); e.state = 'attack'; e.t = 0; e.didHit = true;
      const a = Math.atan2(P.y - e.y, P.x - e.x); v18Shoot(e, a, 3.4, e.d.dmg, 'v30bubble', { life: 3.5, z: 0.55 }); play('glass_bubble', 0.8, rnd(0.95, 1.1), { x: e.x, y: e.y });
      v30Hint('blower', 'GLASBLÅSARENS BUBBLOR SPRICKER TILL SKÄRVOR – KLIV UNDAN ELLER SKJUT DEM.'); return true; }
    return false;
  },
  glassgolem() { return false; }, // skotten studsar (v30Dmg); spricker i skärvor (v30Kill)
  slagcrawler(e) {
    // lämnar smält glas efter sig var tredje ruta
    const cx = e.x | 0, cy = e.y | 0, k = cy * mw + cx;
    if (e.v30cell !== k) { e.v30cell = k; e.v30n = (e.v30n || 0) + 1; if (e.v30n % 3 === 0) v30Temp(cx, cy, 'ʟ', 3); }
    if (e.alert && (e.v30snd || 0) < tmr) { e.v30snd = tmr + rnd(3, 5); v30Hint('crawler', 'SLAGGKRYPAREN LÄMNAR SMÄLT GLAS EFTER SIG.'); }
    return false;
  },
  kilnspirit(e, dt, dist, los) {
    // störtar mot spelaren och exploderar svagt; dyker in i en smältugn och kommer ut ur en annan
    if (e.v30hide) { e.state = 'idle'; return true; } // gömd i en ugn (v30SpiritTick släpper ut den)
    if (e.v30dive) { const v = e.v30dive; v.t -= dt; tryMove(e, Math.cos(v.a) * 5.5 * dt, Math.sin(v.a) * 5.5 * dt, 0.2); e.state = 'attack';
      if (dist < 0.8) { v30SpiritBoom(e); return true; }
      if (v.t <= 0) e.v30dive = null; return true; }
    e.diveT = (e.diveT ?? rnd(1.2, 2.5)) - dt;
    if (e.alert && los && dist < 6.5 && dist > 1.2 && e.diveT <= 0) { e.diveT = rnd(2.5, 3.5); e.v30dive = { t: 0.9, a: Math.atan2(P.y - e.y, P.x - e.x) }; play('kilnspirit', 0.8, rnd(1, 1.2), { x: e.x, y: e.y }); v30Hint('spirit', 'UGNSANDEN STÖRTAR MOT DIG OCH EXPLODERAR – SKJUT DEN I LUFTEN.'); return true; }
    e.tpT = (e.tpT ?? rnd(5, 9)) - dt;
    if (e.tpT <= 0 && V30L.furnaces.length >= 2) { e.tpT = rnd(8, 12); let near = null, nd = 2.2; for (const f of V30L.furnaces) { const d = Math.hypot(f.x - e.x, f.y - e.y); if (d < nd) { nd = d; near = f; } }
      if (near) { const others = V30L.furnaces.filter(f => f !== near); const to = others[(Math.random() * others.length) | 0]; e.v30hide = { t: 1.2, to, from: near, x0: e.x, y0: e.y }; e.hidden = true; e.x = near.x; e.y = near.y; spawnPuff(near.x, near.y, 5); play('furnace_blast', 0.35, 1.4, { x: near.x, y: near.y }); return true; } }
    return false;
  },
  v30clone(e, dt, dist) { // glasmästarens glaskopia: går mot dig och slår svagt; spricker av en träff
    e.state = dist < 1.6 ? 'attack' : 'move';
    if (dist < 1.6) { e.v30hitT = (e.v30hitT ?? 0.6) - dt; if (e.v30hitT <= 0) { e.v30hitT = 1.1; run.cause = 'GLASKOPIAN'; hurtPlayer(e.d.dmg, e.x, e.y, 'melee'); } return true; }
    return false;
  },
};
Object.assign(ENEMY_AI, { glassblower: (...a) => AI_V30G.glassblower(...a), glassgolem: (...a) => AI_V30G.glassgolem(...a), slagcrawler: (...a) => AI_V30G.slagcrawler(...a), kilnspirit: (...a) => AI_V30G.kilnspirit(...a), v30clone: (...a) => AI_V30G.v30clone(...a) });
function v30SpiritOut(e) { // ut ur målugnen på en fri ruta bredvid den (annars tillbaka där den gick in)
  const h = e.v30hide; e.v30hide = null; e.hidden = false; let s = null;
  for (const f of [h.to, h.from]) { if (!f || s) continue; for (let k = 0; k < 12 && !s; k++) { const a = k / 12 * TAU, x = f.x + Math.cos(a) * 0.9, y = f.y + Math.sin(a) * 0.9; if (freeSpot(x, y, 0.25)) s = [x, y]; } }
  if (s) { e.x = s[0]; e.y = s[1]; } else { e.x = h.x0; e.y = h.y0; }
  spawnPuff(e.x, e.y, 6); play('kilnspirit', 0.7, 1.2, { x: e.x, y: e.y });
}
function v30SpiritBoom(e) {
  if (e.dead) return; play('kilnspirit_boom', 0.9, rnd(0.95, 1.05), { x: e.x, y: e.y }); explodeFx(e.x, e.y, 0.4);
  if (Math.hypot(P.x - e.x, P.y - e.y) < 1.5 && P.jz < 0.8) { run.cause = e.d.name; hurtPlayer(e.d.dmg, e.x, e.y, 'fire'); }
  hurtEnemy(e, e.hp + 10, e.x, e.y, { noProc: true, quiet: true });
}
function v30BubbleProj(p) { // glasbubblan: långsam; spricker till skärvor (ʠ i 4 s) där den landar
  if (infightHit(p)) return;
  p.z = 0.55 + Math.sin(tmr * 5 + p.x) * 0.05;
  const hitP = Math.hypot(p.x - P.x, p.y - P.y) < 0.45 && P.jz < 0.7;
  if (hitP || solid(p.x, p.y) || p.life <= 0) { p.dead = true; const x = solid(p.x, p.y) ? p.x - p.vx * 0.08 : p.x, y = solid(p.x, p.y) ? p.y - p.vy * 0.08 : p.y;
    if (hitP) { run.cause = p.cause || 'GLASBUBBLAN'; hurtPlayer(p.dmg, p.src.x, p.src.y, 'proj'); }
    play('glass_crack', 0.7, rnd(1.0, 1.2), { x, y }); if (typeof f29Shards === 'function') f29Shards(x, y, settings.lowfx ? 3 : 7, false);
    v30Temp(x | 0, y | 0, 'ʠ', 4); }
}
Object.assign(PROJ_UPD_V8, { v30bubble: v30BubbleProj });
Object.assign(PROJ_DRAW_V8, { v30bubble: o => drawSprite((fx.parts.bubble2 || fx.parts.bubble || fx.hit)[0], o.x, o.y, 0.3, o.z - 0.15, false, 1, 0, 0.6, false, [170, 225, 255]) });
function v30Dmg(e, dmg, opt) {
  // glasgolemen: 30 % av skotten studsar av, smällar och närstrid gör dubbel skada
  if (V30L.live && e.d.ai === 'glassgolem') {
    if (opt.boom || opt.melee) return dmg * 2;
    if (!opt.noProc && !opt.fall && !opt.infight && Math.random() < 0.3) { if ((e.v30msg || 0) < tmr) { e.v30msg = tmr + 0.6; spawnText(e.x, e.y, 'STUDSAR', '#a0e0ff'); play('glass_crack', 0.35, 1.6, { x: e.x, y: e.y }); v30Hint('ggolem', 'SKOTTEN STUDSAR AV GLASGOLEMEN – SPRÄNG ELLER SLÅ DEN.'); } sparks(e.x, e.y, 0.5, 2); return 0; }
  }
  // glasbössans skärvor: blödning (2 skada/s i 3 s; längre och starkare med pakten)
  const wp = WEAPONS[P.weapon];
  if (wp && wp.glassgun && !opt.boom && !opt.melee && !opt.noProc && !opt.infight && !e.d.stone) e.bleed = Math.max(e.bleed || 0, up('gg_bleed') ? 5 : 3);
  return dmg;
}
function v30Kill(e) {
  if (!V30L.live) return;
  if (e.boss) { v30ClearTemp(); V30L.falls = []; V30L.domes = []; V30L.waves = []; P.v30dome = null; V30L.ventFast = 0; for (const o of ents) if (o.d.ai === 'v30clone' && !o.dead) hurtEnemy(o, 99, o.x, o.y, { noProc: true, quiet: true }); }
  if (e.d.ai === 'glassgolem' || e.d.ai === 'v30clone') { play('glass_crack', 0.9, rnd(0.85, 1), { x: e.x, y: e.y }); if (typeof f29Shards === 'function') f29Shards(e.x, e.y, settings.lowfx ? 6 : 16, true);
    if (e.d.ai === 'glassgolem') { for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) v30Temp((e.x | 0) + dx, (e.y | 0) + dy, 'ʠ', 6); stat('glassgolems30'); } }
  if (e.d.ai === 'kilnspirit' && !e.v30boomed) { e.v30boomed = true; }
}

// ---- Glasmästaren (arena 'glassworks') ----
function v30Dome(b) { if (V30L.domes.length) return; V30L.domes.push({ x: P.x, y: P.y, t: 2, T: 2, shots: lvlStat.shots }); P.v30dome = V30L.domes[0]; play('glass_dome', 1, 1, { x: P.x, y: P.y }); v30Hint('dome', 'GLASKUPAN HÅLLER DIG FAST – SKJUT TRE GÅNGER ELLER VÄNTA.'); }
function v30Wave(b, a, len) { V30L.waves.push({ x: b.x + 0.5 * Math.cos(a), y: b.y + 0.5 * Math.sin(a), dx: Math.cos(a), dy: Math.sin(a), n: 0, len, t: 0.05, dmg: b.d.dmg * 0.5, cause: b.d.name }); }
function v30Clones(b, n) { for (let i = 0; i < n; i++) { if (ents.filter(o => o.d.ai === 'v30clone' && !o.dead).length >= 4) break; const s = freeSpotFar(2.5, 6); if (!s) continue;
  const e = makeEnemy('ʯ', s[0], s[1]); e.d = { ...e.d, name: 'GLASKOPIA', ai: 'v30clone', size: e.d.size * 1.7, dmg: b.d.dmg * 0.4, score: 50 }; e.v30clone = true; e.alert = true; e.minion = true; e.hp = e.maxHp = 1; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 8); } }
Object.assign(BOSS_AI, {
  glassmaster(b, dt, dist, ang, ph) {
    const fast = ph === 3 ? 1.25 : 1;
    if (b.state === 'idle') b.once30 = false;
    if (ph >= 2 && !b.guardian) V30L.ventFast = 1; // fas 2: ugnsmunnarna i arenan sprutar oftare
    if (b.state === 'sweep') { if (!b.didHit && b.t > 0.55) { b.didHit = true; play('furnace_blast', 0.4, 1.3, { x: b.x, y: b.y }); if (dist < (b.d.range || 2.4) + 1.1 && P.jz < 0.4) { run.cause = b.d.name; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); } }
      if (b.t > 1.0) { b.state = 'idle'; b.t = 0; b.cd = rnd(0.8, 1.2) / fast; } return; }
    if (b.state === 'dome') { if (!b.once30 && b.t > 0.5) { b.once30 = true; v30Dome(b); }
      if (b.t > 1.1) { b.state = 'idle'; b.t = 0; b.cd = 0.6 / fast; } return; }
    if (b.state === 'wave') { if (!b.once30 && b.t > 0.45) { b.once30 = true; play('glassmaster_roar', 0.6, 1.2); const n = ph >= 2 ? 3 : 1; for (let i = 0; i < n; i++) v30Wave(b, ang + (i - (n - 1) / 2) * 0.35, 12); }
      if (b.t > 1.1) { b.state = 'idle'; b.t = 0; b.cd = 0.8 / fast; } return; }
    b.cd -= dt;
    if (b.cd <= 0) { b.t = 0; b.didHit = false; b.once30 = false; const los = hasLOS(b.x, b.y, P.x, P.y);
      if (los && dist < 3.8) { b.state = 'sweep'; bossWarn(b, 'GLASMÄSTAREN SVEPER MED PIPAN!'); }
      else if (los) { b.state = Math.random() < 0.45 && !V30L.domes.length ? 'dome' : 'wave'; bossWarn(b, b.state === 'dome' ? 'GLASMÄSTAREN BLÅSER EN GLASKUPA!' : 'EN VÅG AV SMÄLT GLAS!'); } else b.cd = 0.4;
      return; }
    if (dist > 4) bossMove(b, ang, b.d.speed * fast * dt); else bossMove(b, ang + Math.PI / 2, b.d.speed * dt * 0.5);
  },
});
Object.assign(BOSS_SPECIAL, {
  glassmaster(b, dt, dist, ang, ph) {
    if (b.spK) {
      if (!b.once30) { b.once30 = true; bossWarn(b, 'GLASMÄSTAREN GÖR GLASKOPIOR AV SIG SJÄLV!'); play('glassmaster_roar', 1, 1); play('glass_dome', 0.6, 0.8); v30Clones(b, ph === 3 ? 3 : 2); }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return; }
    if (!b.once30) { b.once30 = true; say('GLASMÄSTAREN TÄNDER UGNARNA', 1.5); play('glassmaster_roar', 0.9, 1.1); V30L.ventFast = Math.max(V30L.ventFast, 6); for (let i = 0; i < 4; i++) v30Wave(b, i * Math.PI / 2 + rnd(-0.2, 0.2), 9); }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
});
