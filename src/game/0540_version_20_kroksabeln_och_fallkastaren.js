// ---------- Version 20: kroksabeln och fällkastaren ----------
function scimSwing(wp) { // kroksabeln: ett snabbt svep framåt som träffar alla i bågen
  if (WS.cd > 0 || WS.state !== 'idle') return;
  WS.shot = 0; WS.cd = effDelay(wp) * (up('sc_swift') ? 0.7 : 1); WS.kick = 0.3; lvlStat.shots++; noise(1.5);
  play('scimitar_swing', 0.45, rnd(0.92, 1.08));
  setTimeout(() => { if (state !== 'play' || !WEAPONS[P.weapon].scimitar) return; scimHit(wp, 1, 1.7, up('sc_wide') ? 1.1 : 0.75); }, 120);
}
function scimHit(wp, mul, reach, arc) {
  let hit = false;
  for (const e of ents) { if (e.dead || e.dying || e.hidden || e.dormant) continue; const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
    if (d > reach + e.d.size * 0.3 || (Math.abs(off) > arc && d > 0.6)) continue;
    const crit = Math.random() < mod('critChance'); const dmg = wp.dmg * mul * meleeMul() * (1 + mod('scimitarDmg')) * (crit ? 2 + mod('critDmg') : 1);
    const k = hurtEnemy(e, dmg, e.x, e.y, { melee: true, crit }); hitKill = hitKill || k; hit = true; if (crit) hitCrit = true;
    if (!k && up('sc_bleed')) e.bleed = Math.max(e.bleed || 0, 3); }
  for (const pt of pots) if (!pt.broken && Math.hypot(pt.x - P.x, pt.y - P.y) < reach) breakPot(pt);
  breakProps(P.x + Math.cos(P.a) * 1, P.y + Math.sin(P.a) * 1, 0.8);
  for (const pr of props) if (!pr.broken && v20Breakable(pr) && Math.hypot(pr.x - P.x - Math.cos(P.a) * 0.9, pr.y - P.y - Math.sin(P.a) * 0.9) < 0.9) v20HitProp(pr, pr.x, pr.y, wp.dmg * mul);
  if (hit) { play('scimitar_hit', 0.9, rnd(0.9, 1.1)); hitStop = Math.max(hitStop, 0.04); hitMark = 0.12; lvlStat.hits++; }
  return hit;
}
function scimLunge(wp) { // högerklick: utfallssteg tre rutor framåt med ett hugg
  WS.dashT = (WF.scimitar && WF.scimitar.dur && WF.scimitar.dur.dash) || 0.36; WS.lungeCd = up('sc_dash') ? 1.2 : 2; P.v20lunge = { t: 0.2, dx: Math.cos(P.a), dy: Math.sin(P.a), wp }; P.iframe = Math.max(P.iframe || 0, 0.2);
  play('scimitar_swing', 0.55, 0.8); stat('lunges');
}
function trapThrow(wp) { // fällkastaren: kastar en björnsax som landar och väntar
  if (WS.cd > 0 || WS.state !== 'idle') return;
  if (P.mags[P.weapon] <= 0) { if (P.ammo.traps > 0) startReload(); else play('click', 0.5, 0.8); return; }
  WS.shot = 0; WS.cd = effDelay(wp) * (up('tt_fast') ? 0.6 : 1); WS.kick = 0.4; lvlStat.shots++; run.shots = (run.shots || 0) + 1;
  if (Math.random() >= mod('ammoSave')) P.mags[P.weapon]--;
  play('trap_throw', 0.8, rnd(0.95, 1.05));
  const n = up('tt_double') ? 2 : 1;
  for (let i = 0; i < n; i++) { const a = P.a + (n > 1 ? (i ? 0.18 : -0.18) : 0), L = Math.min(4, cast(P.x, P.y, Math.cos(a), Math.sin(a), 5).dist - 0.4); v20traps.push({ x0: P.x, y0: P.y, x: P.x + Math.cos(a) * Math.max(0.8, L), y: P.y + Math.sin(a) * Math.max(0.8, L), t: 0, T: 0.35, armed: false, e: null, hold: 0 }); }
  while (v20traps.filter(t => !t.e).length > 4) { const i = v20traps.findIndex(t => !t.e); v20traps.splice(i, 1); } // högst fyra ute samtidigt
  if (P.mags[P.weapon] <= 0 && P.ammo.traps > 0) setTimeout(() => { if (state === 'play' && WEAPONS[P.weapon].trapthrower) startReload(); }, 400);
}
function weaponV20Tick(wp, dt, trig) {
  WS.lungeCd = Math.max(0, (WS.lungeCd || 0) - dt); WS.dashT = Math.max(0, (WS.dashT || 0) - dt);
  if (wp.scimitar && aimDown && !WS.scAim && WS.lungeCd <= 0 && state === 'play' && WS.state === 'idle') scimLunge(wp);
  WS.scAim = aimDown;
}

// ---------- Version 20: kloakerna och öknen – slam, sprutrör, slussar, råttbon, oaser, hägringar, sandstorm och kaktusar ----------
let v20sl = [], v20sprays = [], v20oases = [], v20mir = [], v20traps = [], v20lobs = [], v20clock = 0, v20stormC = 0, v20stormK = 0, v20forceStorm = 0, v20baseFog = 0.085, v20snd = null, v20ti = {};
const V20_RAT = 'ǚ';
function setupV20() {
  if (v20snd) { try { v20snd.s.stop(); } catch (e) { /* stoppad */ } v20snd = null; }
  v20sl = []; v20sprays = []; v20oases = []; v20mir = []; v20traps = []; v20lobs = []; v20clock = 0; v20stormC = 0; v20stormK = 0; v20forceStorm = 0; v20fogOn = false; v20slN = 0;
  P.sludgeT = 0; P.sludgeAcc = 0; P.v20lunge = null; P.leech = null; P.cactusT = 0; P.sprayHit = '';
  v20ti = {}; for (const n of ['floor_sludge', 'floor_oasis', 'floor_desertsand', 'floor_mirage']) { v20ti[n] = floorTexs.length; floorTexs.push(tex[n] || tex.floor_stone); }
  // slussarna: level.sluices = [{x,y,open}] – saknas fältet letas 'ȷ' upp i kartan
  const ls = lvl && Array.isArray(lvl.sluices) ? lvl.sluices : null, seen = new Set();
  const add = (x, y, open) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= mw || y >= mh || seen.has(x + ',' + y)) return; seen.add(x + ',' + y); v20sl.push({ x, y, open: !!open }); };
  if (ls) for (const s of ls) { if (Array.isArray(s)) add(+s[0], +s[1], s[2]); else if (s && isFinite(s.x) && isFinite(s.y)) add(+s.x, +s.y, s.open); }
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const c = map[y][x];
    if (c === 'ȷ') add(x, y, false);
    else if (c === 'ȳ') v20sprays.push({ x, y, ph: ((x * 7 + y * 13) % 8) / 2, hiss: false, on: false });
    else if (c === 'ȵ') v20mir.push({ x, y });
  }
  for (const s of v20sl) v20SetSluice(s, s.open, true);
  // oaserna: sammanhängande rutor delar på 40 hp
  const og = new Int16Array(mw * mh).fill(-1);
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (map[y][x] === 'ȴ' && og[y * mw + x] < 0) {
    const id = v20oases.length, cells = [], st = [[x, y]]; og[y * mw + x] = id;
    while (st.length) { const [cx, cy] = st.pop(); cells.push([cx, cy]); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + a, ny = cy + b; if (map[ny] && map[ny][nx] === 'ȴ' && og[ny * mw + nx] < 0) { og[ny * mw + nx] = id; st.push([nx, ny]); } } }
    v20oases.push({ cells, left: 40 * (1 + mod('oasisHeal')), dry: false });
  }
  v20Oas = og;
  // tak: högst två alligatorer per bana
  const rm = new Set(); for (const e of ents.filter(o => o.type === 'ȼ' && !o.minion).slice(2)) rm.add(e);
  if (rm.size) { ents = ents.filter(e => !rm.has(e)); totalEnemies -= rm.size; }
  for (const e of ents) if (e.d.ai === 'alligator') { // står intill slammet vid start: kliver ned i det och gömmer sig
    if (cellAt(e.x, e.y) !== 'Ȳ') for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) if (cellAt(e.x + a, e.y + b) === 'Ȳ') { e.x = (e.x | 0) + a + 0.5; e.y = (e.y | 0) + b + 0.5; break; }
    if (cellAt(e.x, e.y) === 'Ȳ') e.hidden = true; }
  for (const pr of props) if (pr.ch === 'ȸ') pr.nestT = rnd(4, 12);
  if (lvl && lvl.biome === 'desert') for (const t of torches) if (t.prop && t.prop.ch !== 'Ȼ' && !t.v20dim) { t.v20dim = true; for (const c of t.cells) c[1] *= 0.55; } // kokpannorna lyser som eldfaten de ersätter; övrig rekvisita (ljusen m.fl.) dämpas mot sandstenen så att öknen inte bländar
}
let v20Oas = null, v20fogOn = false, v20slN = 0; // v20slN: nya slamrutor från klumpar (högst 30 per bana)
function v20SetSluice(s, open, quiet) {
  s.open = open; const i = s.y * mw + s.x;
  map[s.y][s.x] = open ? 'Ȳ' : 'Ȭ';
  if (cellFloor) cellFloor[i] = v20ti.floor_sludge ?? cellFloor[i];
  flowCell = -1; if (!quiet) spawnPuff(s.x + 0.5, s.y + 0.5, 4);
}
function v20ToggleSluices() {
  let n = 0;
  for (const s of v20sl) {
    if (s.open) { // stänger inte en sluss som någon står i
      const busy = ((P.x | 0) === s.x && (P.y | 0) === s.y) || ents.some(e => !e.dead && (e.x | 0) === s.x && (e.y | 0) === s.y);
      if (busy) continue; v20SetSluice(s, false); n++;
    } else { v20SetSluice(s, true); n++; }
  }
  return n;
}
const v20Slow = () => (P.sludgeT > 0 ? clamp(0.6 + 0.4 * mod('sludgeResist'), 0.6, 1) : 1) * (P.leech ? 0.85 : 1) * (P.v20lunge ? 1 : 1);
const v20Breakable = pr => (pr.ch === 'ȸ' || pr.ch === 'Ⱥ') && !pr.v20wreck;
function v20Wreck(pr) { map[pr.cy][pr.cx] = '.'; flowCell = -1; if (pr.frames && pr.frames[1]) { pr.v20wreck = true; pr.img = pr.frames[1]; pr.def = { ...pr.def, block: false }; } else pr.broken = true; } // trasigt bo och krossad amfora: ruta 1 ligger kvar
function v20HitProp(pr, hx, hy, dmg) {
  if (pr.ch === 'ȸ') { if (pr.broken || pr.v20wreck) return true; pr.hp20 = (pr.hp20 ?? 30) - (dmg || 10); spawnPuff(pr.x, pr.y, 2);
    if (pr.hp20 <= 0) { v20Wreck(pr); play('ratnest', 0.55, 0.8, { x: pr.x, y: pr.y }); spawnPuff(pr.x, pr.y, 10); stat('ratnests'); say('RÅTTBOET ÄR FÖRSTÖRT', 1.2); }
    else play('ratnest', 0.3, 1.3, { x: pr.x, y: pr.y });
    return false; }
  if (pr.ch === 'Ⱥ') { if (pr.broken || pr.v20wreck) return true; v20Wreck(pr); play('amphora_break', 1.5, rnd(0.9, 1.1), { x: pr.x, y: pr.y }); spawnPuff(pr.x, pr.y, 6);
    for (let i = 0; i < 6; i++) particles.push({ x: pr.x, y: pr.y, z: 0.4, vx: rnd(-1.4, 1.4), vy: rnd(-1.4, 1.4), vz: rnd(0.5, 2), life: 1, img: fx.shards[i % 6], size: 0.08, grav: true, bounce: true, tint: [200, 140, 90] });
    if (Math.random() < 0.25) { const t = enemyFrames['ɀ'] ? 'ɀ' : 'S', e = makeEnemy(t, pr.x, pr.y); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; say('EN SKORPION KRYPER UT!', 1.2); }
    else dropItem(['health', 'ammo', 'goldpile', 'traps'][(Math.random() * 4) | 0], pr.x, pr.y);
    return false; }
  return undefined;
}
function v20Lob(src, tx, ty, dmg) { for (let i = 0; i < 6 && solid(tx, ty); i++) { tx += (src.x - tx) * 0.2; ty += (src.y - ty) * 0.2; } [tx, ty] = lobClip(src.x, src.y, tx, ty); v20lobs.push({ x0: src.x, y0: src.y, tx, ty, t: 0, T: 1.0, dmg, name: src.d ? src.d.name : 'SLAMMET' }); }
function v20Storm() { return lvl && (lvl.biome === 'desert' || v20forceStorm > 0) && !lvl.hub; }
function updateV20(dt) {
  v20clock += dt; const c = cellUnder(), cx = P.x | 0, cy = P.y | 0, ground = P.jz < 0.15;
  // slammet: långsamt och giftigt
  if (c === 'Ȳ' && ground) { P.sludgeT = 0.25; P.sludgeAcc = (P.sludgeAcc || 0) + dt; if (P.sludgeAcc >= 0.5) { P.sludgeAcc = 0; run.cause = 'SLAMMET'; hurtPlayer(1 * trapMul(), P.x, P.y, 'gas'); if (Math.random() < 0.4) play('sludge_splash', 0.6, rnd(0.9, 1.1)); firstHint('sludge', 'SLAMMET SAKTAR NED OCH FÖRGIFTAR – GÅ RUNT ELLER HOPPA ÖVER.'); } }
  else { P.sludgeT = Math.max(0, P.sludgeT - dt); P.sludgeAcc = 0.25; }
  // sprutrören: var fjärde sekund het ånga i en sekund, väsande en halv sekund innan
  for (const s of v20sprays) {
    const k = (v20clock + s.ph) % 4, on = k >= 3, warn = k >= 2.5 && k < 3, d = Math.hypot(s.x + 0.5 - P.x, s.y + 0.5 - P.y);
    if (warn && !s.hiss) { s.hiss = true; if (d < 7) play('steam_spray', 0.12, 1.6, { x: s.x + 0.5, y: s.y + 0.5 }); }
    if (!warn) s.hiss = false;
    if (on && !s.on) { s.burst = (s.burst || 0) + 1; if (d < 9) play('steam_spray', 0.4, 1, { x: s.x + 0.5, y: s.y + 0.5 }); }
    s.on = on;
    if (on && !settings.lowfx && d < 14 && Math.random() < dt * 14) particles.push({ x: s.x + rnd(0.2, 0.8), y: s.y + rnd(0.2, 0.8), z: 0.05, vx: rnd(-0.2, 0.2), vy: rnd(-0.2, 0.2), vz: rnd(1.2, 2.2), life: 0.8, maxLife: 0.8, img: (fx.parts.steam2 || fx.parts.steam) ? (fx.parts.steam2 || fx.parts.steam)[0] : fx.hit[1], size: 0.12, tint: (fx.parts.steam2 || fx.parts.steam) ? null : [230, 230, 220] });
    if (on && cx === s.x && cy === s.y && P.jz < 0.6) { const key = s.x + ',' + s.y + ':' + s.burst; if (P.sprayHit !== key) { P.sprayHit = key; run.cause = 'ÅNGAN'; hurtPlayer(8 * trapMul() * Math.max(0, 1 - mod('sprayResist')), s.x + 0.5, s.y + 0.5, 'proj'); firstHint('spray', 'RÖREN SPRUTAR HET ÅNGA – LYSSNA EFTER VÄSANDET.'); } }
    if (on) for (const e of ents) if (!e.dead && !e.boss && !e.d.float && (e.x | 0) === s.x && (e.y | 0) === s.y && e.sprayK !== s.burst) { e.sprayK = s.burst; hurtEnemy(e, 8, e.x, e.y, { noProc: true, quiet: true }); }
  }
  // oaserna: läker upp till 60 % av max, högst 40 hp per oas
  if (c === 'ȴ' && ground && v20Oas) { const o = v20oases[v20Oas[cy * mw + cx]];
    if (o && !o.dry && P.hp < maxHp() * 0.6) { const h = Math.min(o.left, 3 * (1 + mod('oasisHeal')) * dt, maxHp() * 0.6 - P.hp); P.hp += h; o.left -= h; P.oasisAcc = (P.oasisAcc || 0) + h; if (P.oasisAcc > 4) { P.oasisAcc = 0; play('oasis', 0.25, rnd(0.95, 1.1)); spawnText(P.x, P.y, '+4', '#80e0ff'); } firstHint('oasis', 'OASEN LÄKER DIG – MEN BARA EN GÅNG.');
      if (o.left <= 0.01) { o.dry = true; for (const [x, y] of o.cells) { map[y][x] = '.'; if (cellFloor) cellFloor[y * mw + x] = v20ti.floor_desertsand; } say('OASEN HAR TORKAT UT', 1.5); stat('oases'); } } }
  // hägringarna: oas på avstånd, sand nära
  for (const m of v20mir) { const far = Math.hypot(m.x + 0.5 - P.x, m.y + 0.5 - P.y) > 4; if (cellFloor) cellFloor[m.y * mw + m.x] = far ? v20ti.floor_oasis : v20ti.floor_desertsand; if (!far && !m.seen) { m.seen = true; play('mirage', 0.25, 1); firstHint('mirage', 'EN HÄGRING – OASEN FINNS INTE.'); } }
  // sandstormen: dimman tjocknar i sex sekunder var trettionde sekund
  let want = 0;
  if (v20Storm()) { v20stormC += dt; const k = v20stormC % 30; want = v20forceStorm > 0 ? 1 : k >= 24 ? 1 : 0; if (k >= 23.5 && k - dt < 23.5 && !v20forceStorm) say('EN SANDSTORM KOMMER!', 1.5); }
  v20forceStorm = Math.max(0, v20forceStorm - dt);
  v20stormK += clamp(want - v20stormK, -dt, dt);
  if (v20stormK > 0.001) { v20fogOn = true; fogK = v20baseFog * (1 + 3.2 * v20stormK * clamp(1 - mod('stormSight'), 0.2, 1)); } // dimman räknas från banans egen grundnivå
  else { if (v20fogOn) { v20fogOn = false; fogK = v20baseFog; } v20baseFog = fogK; }
  if (v20stormK > 0.01) { if (!v20snd || !ambLoops.includes(v20snd)) { v20snd = play('desert_storm', 0.01, 1, { loop: true, amb: true }); if (v20snd) ambLoops.push(v20snd); } if (v20snd) v20snd.g.gain.value = 0.5 * v20stormK;
    if (!settings.lowfx) for (let i = 0; i < 3; i++) if (Math.random() < v20stormK) { const a = rnd(0, TAU), r = rnd(0.5, 5); particles.push({ x: P.x + Math.cos(a) * r, y: P.y + Math.sin(a) * r, z: rnd(0.1, 1.1), vx: 3.2, vy: rnd(-0.4, 0.4), vz: 0, life: 0.7, maxLife: 0.7, img: (fx.parts.sand2 || fx.parts.sand) ? (fx.parts.sand2 || fx.parts.sand)[i % (fx.parts.sand2 || fx.parts.sand).length] : fx.hit[1], size: 0.05, tint: (fx.parts.sand2 || fx.parts.sand) ? null : [220, 190, 130] }); }
    if (v20stormK >= 0.99) stat('stormSec', dt); }
  else if (v20snd) v20snd.g.gain.value = 0;
  // kaktusarna sticks
  P.cactusT = Math.max(0, (P.cactusT || 0) - dt);
  if (P.cactusT <= 0) for (const pr of props) if (pr.ch === 'ȹ' && !pr.broken && Math.hypot(pr.x - P.x, pr.y - P.y) < 0.78) { P.cactusT = 1; run.cause = 'KAKTUSEN'; hurtPlayer(4 * Math.max(0, 1 - mod('heatResist') * 0.5), pr.x, pr.y, 'melee'); play('cactus_hit', 0.7, rnd(0.9, 1.1)); firstHint('cactus', 'KAKTUSARNA STICKS – GÅ INTE IN I DEM.'); break; }
  // råttbona släpper råttor var tolfte sekund
  for (const pr of props) if (pr.ch === 'ȸ' && !pr.broken && !pr.v20wreck) { pr.nestT = (pr.nestT ?? 12) - dt; if (pr.nestT <= 0) { pr.nestT = 12; const near = Math.hypot(pr.x - P.x, pr.y - P.y) < 11, live = ents.filter(e => !e.dead && e.v20nest).length;
      if (near && live < 8 && enemyFrames[V20_RAT]) { const n = 2 + (Math.random() < 0.5 ? 1 : 0); for (let i = 0; i < n; i++) { const a = rnd(0, TAU), x = pr.x + Math.cos(a) * 0.8, y = pr.y + Math.sin(a) * 0.8; if (solid(x, y)) continue; const e = makeEnemy(V20_RAT, x, y); e.alert = true; e.minion = true; e.v20nest = true; ents.push(e); totalEnemies++; } play('ratnest', 0.45, 1, { x: pr.x, y: pr.y }); firstHint('ratnest', 'RÅTTBOET SLÄPPER UT RÅTTOR TILLS DU FÖRSTÖR DET.'); } } }
  // fiender saktas av slammet
  for (const e of ents) if (!e.dead && !e.boss && !e.d.float && e.d.ai !== 'alligator' && e.d.ai !== 'sludgeman' && e.d.ai !== 'leech' && cellAt(e.x, e.y) === 'Ȳ') e.slow = Math.max(e.slow || 0, 0.25);
  // slamklumpar
  for (const l of v20lobs) { l.t += dt; if (l.t < l.T) continue; l.done = true; play('sludge_splash', 1.1, rnd(0.9, 1.1), { x: l.tx, y: l.ty }); splash(l.tx, l.ty);
    if (Math.hypot(P.x - l.tx, P.y - l.ty) < 1.1 && P.jz < 0.4) { run.cause = l.name; hurtPlayer(l.dmg, l.tx, l.ty, 'proj'); }
    const lx = l.tx | 0, ly = l.ty | 0; if (map[ly] && map[ly][lx] === '.' && !(lx === cx && ly === cy) && !lvl.hub && v20slN < 30) { v20slN++; map[ly][lx] = 'Ȳ'; if (cellFloor) cellFloor[ly * mw + lx] = v20ti.floor_sludge; } }
  v20lobs = v20lobs.filter(l => !l.done);
  // björnsaxarna
  for (const t of v20traps) {
    if (!t.armed) { t.t += dt; if (t.t >= t.T) { t.armed = true; play('trap_throw', 0.4, 0.7, { x: t.x, y: t.y }); } continue; }
    if (t.e) { t.hold -= dt; if (!t.e.dead && t.e.d.ai !== 'boss') { t.e.x = t.x; t.e.y = t.y; } if (t.hold <= 0 || t.e.dead) t.done = true; continue; }
    for (const e of ents) { if (e.dead || e.dying || e.hidden || e.dormant || e.d.float || Math.hypot(e.x - t.x, e.y - t.y) > 0.85 + e.d.size * 0.35 + (e.boss ? 1 : 0)) continue; // en sax täcker ungefär en ruta – fienderna vinglar i sidled när de jagar
      const w = WEAPONS[weaponIndex('trapthrower')], dmg = (w ? w.dmg : 60) * (1 + mod('dmg') + mod('trapDmg')) * (1 + 0.12 * wlvl('trapthrower'));
      play('trap_snap', 1.5, rnd(0.95, 1.05), { x: t.x, y: t.y }); const k = hurtEnemy(e, dmg, e.x, e.y, {}); hitKill = hitKill || k; stat('trapSnaps');
      if (up('tt_poison')) e.poison = Math.max(e.poison || 0, 4);
      if (!k && !e.boss) { t.e = e; t.hold = up('tt_hold') ? 5 : 3; e.stun = Math.max(e.stun || 0, t.hold); } else t.done = true;
      break; }
  }
  v20traps = v20traps.filter(t => !t.done);
  // utfallssteget
  if (P.v20lunge) { const l = P.v20lunge, st = Math.min(dt, l.t), sp = 15; tryMove(P, l.dx * sp * st, l.dy * sp * st, 0.24); l.t -= dt;
    if (l.t <= 0) { P.v20lunge = null; scimHit(l.wp, 1.5, 1.9, 0.9); } }
  // igeln
  if (P.leech) { const e = P.leech; if (e.dead || e.dying) P.leech = null;
    else { if (P.jv >= 2.5 && (P.v20pjv || 0) < 2.5) { e.jumps = (e.jumps || 0) + 1; if (e.jumps >= 3) { P.leech = null; e.attached = false; e.stun = 1.2; e.v20free = tmr + 1.5; tryMove(e, -Math.cos(P.a) * 1.2, -Math.sin(P.a) * 1.2, 0.2); say('IGELN RAMLAR AV', 1); } } } }
  P.v20pjv = P.jv;
}
function drawV20Hud(g) {
  if (P.sludgeT > 0) { g.fillStyle = `rgba(90,110,40,${0.1 + 0.03 * Math.sin(tmr * 3)})`; g.fillRect(0, 0, W, VH); if (hudImg.icon_sludge) g.drawImage(hudImg.icon_sludge, 158, VH - 22, 8, 8); }
  if (v20stormK > 0.01) { g.fillStyle = `rgba(200,165,105,${0.22 * v20stormK})`; g.fillRect(0, 0, W, VH);
    g.fillStyle = `rgba(235,210,160,${0.35 * v20stormK})`; for (let i = 0; i < 26; i++) { const x = ((i * 53 + tmr * 260) % (W + 40)) - 20, y = (i * 37 + Math.sin(i + tmr) * 8) % VH; g.fillRect(x, y, 6 + (i % 3) * 3, 1); }
    if (hudImg.icon_storm) g.drawImage(hudImg.icon_storm, 170, VH - 22, 8, 8); }
  if (P.leech && hudImg.icon_leech) g.drawImage(hudImg.icon_leech, 182, VH - 22, 8, 8);
  if (P.leech) { g.fillStyle = `rgba(150,20,30,${0.15 + 0.05 * Math.sin(tmr * 8)})`; g.fillRect(0, 0, W, VH); const t = 'IGEL! HOPPA ' + Math.max(0, 3 - (P.leech.jumps || 0)) + ' GGR'; txt(t, Math.round((W - textW(t)) / 2), VH - 50, '#ff8080', 1, true, 0.8); } // kort rad nere i mitten
  if (WEAPONS[P.weapon].scimitar && WS.lungeCd > 0) { const w = 30, x = (W - w) / 2, y = HORIZON + 22, k = 1 - WS.lungeCd / (up('sc_dash') ? 1.2 : 2); g.fillStyle = '#000a'; g.fillRect(x - 1, y - 1, w + 2, 4); g.fillStyle = '#e0c080'; g.fillRect(x, y, w * k, 2); }
}
function drawV20World(list) {
  for (const t of v20traps) list.push({ x: t.armed ? t.x : t.x0 + (t.x - t.x0) * (t.t / t.T), y: t.armed ? t.y : t.y0 + (t.y - t.y0) * (t.t / t.T), k: 'v20', t: 'trap', o: t });
  for (const l of v20lobs) { const k = l.t / l.T; list.push({ x: l.x0 + (l.tx - l.x0) * k, y: l.y0 + (l.ty - l.y0) * k, k: 'v20', t: 'lob', o: l, z: 0.45 + 2.2 * 4 * k * (1 - k) }); list.push({ x: l.tx, y: l.ty, k: 'v20', t: 'ring', o: l }); }
}
function drawV20Sprite(s) {
  const o = s.o;
  if (s.t === 'trap') { const f = fx.props.beartrap; const z = o.armed ? 0 : 0.6 * 4 * (o.t / o.T) * (1 - o.t / o.T); if (f) drawSprite(f[o.e && f.length > 1 ? 1 : 0], s.x, s.y, 0.42, z, false, null, 0, 0.3); else drawSprite(fx.shards[7], s.x, s.y, 0.3, z, false, null, 0, 0.3, false, o.e ? [200, 60, 60] : [170, 170, 180]); return true; }
  if (s.t === 'lob') { drawSprite(fx.parts.sludge ? fx.parts.sludge[0] : fx.hit[1], s.x, s.y, 0.22, s.z - 0.1, false, null, 0, 0.5, false, fx.parts.sludge ? null : [110, 130, 50]); return true; }
  if (s.t === 'ring') { const k = o.t / o.T, n = 10; for (let i = 0; i < n; i++) { const a = i / n * TAU + tmr; drawSprite(fx.hit[1], o.tx + Math.cos(a) * 0.9, o.ty + Math.sin(a) * 0.9, 0.07, 0.01, false, 1.4, 0, 0, true, k > 0.7 ? [200, 220, 80] : [120, 150, 60]); } return true; }
  return false;
}
function v20Kill(e) {
  if (P.leech === e) P.leech = null;
  if (e.d.ai === 'sludgeman') { const cx = e.x | 0, cy = e.y | 0; if (map[cy] && map[cy][cx] === '.' && !((P.x | 0) === cx && (P.y | 0) === cy)) { map[cy][cx] = 'Ȳ'; if (cellFloor) cellFloor[cy * mw + cx] = v20ti.floor_sludge; } splash(e.x, e.y); }
}
function v20Map(s, ox, oy, inside) { // slussarna på kartan
  for (const sl of v20sl) if (inside(sl.x, sl.y) && seen[sl.y * mw + sl.x]) { ctx.fillStyle = sl.open ? '#6a8030' : '#a07050'; ctx.fillRect(ox + sl.x * s, oy + sl.y * s, s, s); }
}
Object.assign(USES, {
  sluicewheel(pr) { // vrid ratten: alla slussar på våningen öppnas eller stängs
    const n = v20ToggleSluices(); if (pr.frames && pr.frames[1]) pr.img = pr.frames[v20sl.some(s => s.open) ? 1 : 0]; play('sluice', 1.4, 1, { x: pr.x, y: pr.y }); P.shake = Math.max(P.shake, 0.6); stat('sluices');
    say(n ? (v20sl.some(s => s.open) ? 'SLUSSARNA ÖPPNAS' : 'SLUSSARNA STÄNGS') : 'RATTEN GÅR TRÖGT – INGA SLUSSAR HÄR', 1.6);
  },
});
Object.assign(USE_NAME, { sluicewheel: 'VRID SLUSSRATTEN' });

// ---------- Version 20: kloakernas och öknens invånare ----------
const AI_V20 = {
  alligator(e, dt, dist) { // ligger gömd i slammet, rusar och biter
    const inS = cellAt(e.x, e.y) === 'Ȳ', sub = inS && dist > 3.2 && e.state !== 'attack';
    if (sub !== !!e.hidden) { e.hidden = sub; if (!sub) { e.rushT = 1.2; play('alligator', 0.9, 1, { x: e.x, y: e.y }); splash(e.x, e.y); firstHint('alligator', 'ALLIGATORN LIGGER GÖMD I SLAMMET.'); } }
    if (e.hidden) { e.state = 'idle'; if (e.alert && dist < 10) { const a = Math.atan2(P.y - e.y, P.x - e.x), nx = e.x + Math.cos(a) * 0.4, ny = e.y + Math.sin(a) * 0.4; if (cellAt(nx, ny) === 'Ȳ') tryMove(e, Math.cos(a) * e.d.speed * 0.6 * dt, Math.sin(a) * e.d.speed * 0.6 * dt, 0.3); } return true; }
    if ((e.rushT || 0) > 0) { e.rushT -= dt; if (dist > 1.1 && e.state !== 'attack') { const a = Math.atan2(P.y - e.y, P.x - e.x); tryMove(e, Math.cos(a) * e.d.speed * 1.8 * dt, Math.sin(a) * e.d.speed * 1.8 * dt, 0.35); } }
    return false;
  },
  sludgeman(e, dt, dist, los) { // kastar slamklumpar som lämnar slam
    e.lobT = (e.lobT ?? rnd(1.5, 3)) - dt;
    if (e.lobT <= 0 && los && dist > 2 && dist < 9 && e.state !== 'pain') { e.lobT = rnd(3, 4.2); e.state = 'attack'; e.t = 0; e.didHit = true; v20Lob(e, P.x + P.vx * 0.6, P.y + P.vy * 0.6, e.d.dmg); play('sludgeman', 1.0, 1, { x: e.x, y: e.y }); return true; }
    return false;
  },
  plumber(e) { if (!e.v20rage && e.hp < e.maxHp * 0.5) { e.v20rage = true; e.d = { ...e.d, speed: e.d.speed * 1.35 }; play('plumber', 1.1, 0.8, { x: e.x, y: e.y }); } return false; },
  leech(e, dt, dist) { // fäster sig och suger blod (räckvidd 0,82: fiender stannar på 0,75 från spelaren, så en igel som skakats av når fram igen)
    if (e.attached) { if (P.leech !== e) { e.attached = false; e.stun = Math.max(e.stun || 0, 1); return false; }
      e.x = P.x + Math.cos(P.a) * 0.45; e.y = P.y + Math.sin(P.a) * 0.45; e.state = 'attack';
      e.suck = (e.suck || 0) + dt; if (e.suck >= 0.5) { e.suck = 0; run.cause = e.d.name; hurtPlayer(1, e.x, e.y, 'gas'); e.hp = Math.min(e.maxHp, e.hp + 0.3); }
      return true; }
    if (dist < 0.82 && !P.leech && (e.stun || 0) <= 0 && (e.v20free || 0) < tmr) { if (Math.random() < mod('leechResist')) { e.stun = 1; tryMove(e, -Math.cos(P.a), -Math.sin(P.a), 0.2); return false; }
      e.attached = true; e.jumps = 0; P.leech = e; play('leech', 0.8, 1); firstHint('leech', 'IGELN SUGER BLOD – SKJUT DEN ELLER HOPPA TRE GÅNGER.'); return true; }
    return false;
  },
  scorpion(e, dt, dist) { // svanshugget förgiftar
    if (e.state === 'attack' && e.t > 0.3 && !e.psn && dist < (e.d.range || 1) + 0.4) { e.psn = true; P.poisonT = Math.max(P.poisonT || 0, 2.5 * Math.max(0.2, 1 - mod('heatResist') * 0.5)); }
    if (e.state !== 'attack') e.psn = false;
    return false;
  },
  nomad(e, dt, dist, los) { // sidosteg när du siktar på honom
    if (e.dodge) { e.dodge.t -= dt; tryMove(e, e.dodge.vx * dt, e.dodge.vy * dt, 0.3); if (e.dodge.t <= 0) e.dodge = null; return true; }
    if (los && dist < 10 && dist > 1.4 && (e.dodgeCd || 0) < tmr && e.state !== 'attack') { let off = Math.atan2(e.y - P.y, e.x - P.x) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
      if (Math.abs(off) < 0.1) { e.dodgeCd = tmr + rnd(1.4, 2.2); const s = Math.random() < 0.5 ? 1 : -1, a = Math.atan2(P.y - e.y, P.x - e.x) + s * Math.PI / 2; e.dodge = { t: 0.3, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4 }; return true; } }
    return false;
  },
  sandwraith(e, dt, dist) { // nästan osynlig i sandstormen, sliter på dig i närheten
    e.ghost = v20stormK > 0.5 ? 0.94 : 0.45;
    if (dist < 1.8) { e.wear = (e.wear || 0) + dt; if (e.wear >= 0.5) { e.wear = 0; run.cause = e.d.name; hurtPlayer(e.d.dmg * 0.5, e.x, e.y, 'gas'); } }
    return false;
  },
  vulture(e, dt, dist) { // cirklar tills du är skadad, dyker sedan
    if (P.hp >= maxHp() * 0.5 && e.alert) { const a = Math.atan2(e.y - P.y, e.x - P.x) + 0.9 * dt, r = 4.2, tx = P.x + Math.cos(a) * r, ty = P.y + Math.sin(a) * r; tryMove(e, clamp(tx - e.x, -1, 1) * e.d.speed * dt, clamp(ty - e.y, -1, 1) * e.d.speed * dt, 0.3); e.state = 'move'; return true; }
    if (!e.v20dive && e.alert) { e.v20dive = true; play('vulture', 0.5, 1, { x: e.x, y: e.y }); firstHint('vulture', 'GAMARNA DYKER NÄR DU ÄR SKADAD.'); }
    return false;
  },
};
Object.assign(PROJ_UPD_V8, { esand: v18EProj });
Object.assign(PROJ_DRAW_V8, { esand: o => drawSprite(fx.hit[1], o.x, o.y, 0.1, o.z - 0.05, false, 2, 0, 0, true, [255, 200, 90]) });

// ---------- Version 20: Råttkungen och Sfinxen ----------
Object.assign(BOSS_AI, {
  ratking(b, dt, dist, ang, ph) { // bett och slamkaskader
    const fast = ph === 3 ? 1.25 : 1;
    if (b.state === 'idle') { b.once20 = false; b.hidden = false; }
    if (b.state === 'bite') { if (!b.didHit && b.t > 0.45) { b.didHit = true; play('ratking_squeal', 0.6, 0.9); if (dist < (b.d.range || 2.2) + 1 && P.jz < 0.4) { run.cause = b.d.name; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); } }
      if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = rnd(0.8, 1.2) / fast; } return; }
    if (b.state === 'spew') { if (b.shots < (ph >= 2 ? 4 : 3) && b.t > 0.3 + b.shots * 0.25) { b.shots++; v20Lob(b, P.x + P.vx * 0.5 + rnd(-1.5, 1.5) * (b.shots > 1), P.y + P.vy * 0.5 + rnd(-1.5, 1.5) * (b.shots > 1), b.d.dmg * 0.6); play('sludge_splash', 1.2, 0.8); }
      if (b.t > 1.4) { b.state = 'idle'; b.t = 0; b.cd = 0.9 / fast; } return; }
    b.cd -= dt;
    if (b.cd <= 0) { b.t = 0; b.didHit = false; const los = hasLOS(b.x, b.y, P.x, P.y);
      if (los && dist < 3.5) { b.state = 'bite'; bossWarn(b, 'RÅTTKUNGEN GAPAR!'); }
      else if (los) { b.state = 'spew'; b.shots = 0; play('ratking_roar', 0.7); } else b.cd = 0.4;
      return; }
    if (dist > 3) bossMove(b, ang, b.d.speed * fast * dt); else bossMove(b, ang + Math.PI / 2, b.d.speed * dt * 0.6);
  },
  sphinx(b, dt, dist, ang, ph) { // tassen och ögonstrålarna
    const fast = ph === 3 ? 1.25 : 1;
    if (b.state === 'idle') b.once20 = false;
    if (b.state === 'paw') { if (!b.didHit && b.t > 0.55) { b.didHit = true; P.shake = Math.max(P.shake, 1.5); spawnPuff(b.x + Math.cos(ang) * 1.6, b.y + Math.sin(ang) * 1.6, 10); if (dist < (b.d.range || 2.4) + 1.2 && P.jz < 0.4) { run.cause = b.d.name; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); } }
      if (b.t > 1.0) { b.state = 'idle'; b.t = 0; b.cd = rnd(0.9, 1.3) / fast; } return; }
    if (b.state === 'eyes') { if (b.shots < (ph >= 2 ? 6 : 4) && b.t > 0.35 + b.shots * 0.16) { b.shots++; v18Shoot(b, ang + rnd(-0.06, 0.06), 9, b.d.dmg * 0.45, 'esand', { life: 2.5 }); play('laser_eye', 0.4, 0.9); }
      if (b.t > 1.4) { b.state = 'idle'; b.t = 0; b.cd = 0.8 / fast; } return; }
    b.cd -= dt;
    if (b.cd <= 0) { b.t = 0; b.didHit = false; const los = hasLOS(b.x, b.y, P.x, P.y);
      if (los && dist < 4) { b.state = 'paw'; bossWarn(b, 'SFINXEN HÖJER TASSEN!'); }
      else if (los) { b.state = 'eyes'; b.shots = 0; bossWarn(b, 'SFINXENS ÖGON GLÖDER!'); } else b.cd = 0.4;
      return; }
    if (dist > 4) bossMove(b, ang, b.d.speed * fast * dt); else bossMove(b, ang + Math.PI / 2, b.d.speed * dt * 0.5);
  },
});
Object.assign(BOSS_SPECIAL, {
  ratking(b, dt, dist, ang, ph) {
    if (b.spK) { // gräver sig in i väggen och kommer ut någon annanstans
      if (!b.once20) { b.once20 = true; b.hidden = true; spawnPuff(b.x, b.y, 12); play('ratking_roar', 0.9, 0.8); bossWarn(b, 'RÅTTKUNGEN GRÄVER SIG IN I VÄGGEN!'); }
      if (b.t > 1.2) { let to = null; for (let i = 0; i < 60 && !to; i++) { const a = rnd(0, TAU), r = rnd(3, 7), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r; if (freeSpot(x, y, 1) && hasLOS(P.x, P.y, x, y)) to = [x, y]; }
        if (to) { b.x = to[0]; b.y = to[1]; } b.hidden = false; spawnPuff(b.x, b.y, 12); P.shake = Math.max(P.shake, 1); play('ratking_squeal', 0.65, 0.8); b.state = 'idle'; b.t = 0; b.cd = 0.5; } return; }
    b.hidden = false;
    if (!b.once20) { b.once20 = true; bossWarn(b, 'RÅTTKUNGEN KALLAR PÅ SVÄRMEN!'); play('ratking_squeal', 0.65); for (let i = 0; i < 2 + ph; i++) { const s = freeSpotFar(2, 5); if (!s) continue; const t = enemyFrames[V20_RAT] ? V20_RAT : 'X', e = makeEnemy(t, s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 5); } }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
  sphinx(b, dt, dist, ang, ph) {
    if (b.spK) { // sandstorm i arenan
      if (!b.once20) { b.once20 = true; v20forceStorm = 6; bossWarn(b, 'SFINXEN FRAMMANAR EN SANDSTORM!'); play('sphinx_roar', 0.9); }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return; }
    if (!b.once20) { b.once20 = true; say('SFINXEN KALLAR PÅ SINA VÄKTARE', 1.5); play('sphinx_chant', 0.8); for (let i = 0; i < 1 + ph; i++) { const s = freeSpotFar(3, 6); if (!s) continue; const t = i % 2 ? (enemyFrames['ɀ'] ? 'ɀ' : 'S') : (ENEMY_DEFS['Ã'] ? 'Ã' : 'S'), e = makeEnemy(t, s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 8); } }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
});
TAUNTS.ratking = ['KLOAKEN ÄR MITT RIKE', 'SVÄRMEN ÄTER ALLT', 'IIIIIK!'];
TAUNTS.sphinx = ['SVARA PÅ GÅTAN – ELLER DÖ', 'SANDEN BEGRAVER ALLA', 'TUSEN ÅR HAR JAG VÄNTAT'];
const v20api = () => ({ sluices: v20sl, sprays: v20sprays, oases: v20oases, mirages: v20mir, traps: v20traps, lobs: v20lobs, stormK: v20stormK, storm: () => v20Storm(), setup: setupV20, toggle: v20ToggleSluices, fog: () => fogK, baseFog: () => v20baseFog, ti: v20ti,
  setStorm: (c, f) => { v20stormC = c; if (f !== undefined) v20forceStorm = f; }, slow: v20Slow, hitProp: v20HitProp, floorAt: (x, y) => cellFloor[y * mw + x], ghost: e => e.ghost || 0 });

