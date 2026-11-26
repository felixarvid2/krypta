// ---------- Version 21: Järnfängelset och Fiskeläget – larmplattor, fisknät, hängande burar, fisktunnor, galgen, fyren och dimman ----------
let v21plates = [], v21nets = {}, v21gates = [], v21gateT = 0, v21tent = [], v21flood = 0, v21clock = 0, v21fogBase = null, v21fogK = 0, v21fogOn = false, v21horn = false, v21lh = null, v21beamA = 0, v21spinSnd = null, v21beamSeen = false;
function v21FloorBack(x, y) { if (cellFloor) cellFloor[y * mw + x] = lvl.floorMask ? (+lvl.floorMask[y][x] || 0) : 0; }
function v21StopSpin() { if (v21spinSnd) { try { v21spinSnd.s.stop(); } catch (e) { /* stoppad */ } v21spinSnd = null; } WS.flSpin = false; }
function setupV21() {
  v21StopSpin(); v21OpenGates(true);
  v21plates = []; v21nets = {}; v21gates = []; v21gateT = 0; v21tent = []; v21flood = 0; v21clock = 0; v21fogBase = null; v21fogK = 0; v21fogOn = false; v21horn = false; v21lh = null; v21beamA = 0; v21beamSeen = false;
  P.v21burn = 0; P.v21burnAcc = 0; P.v21pull = null; P.v21netT = 0; P.v21cell = -1; P.v21snag = false;
  if (!spr.fish) spr.fish = spr.meat || spr.health;
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const c = map[y][x];
    if (c === 'ɍ') { if (v21plates.length < 3) v21plates.push({ x, y, used: false }); else { map[y][x] = '.'; v21FloorBack(x, y); } } // högst tre larmplattor per bana
    else if (c === 'Ɏ') v21nets[y * mw + x] = { x, y, cd: 0 };
  }
  // tak: högst två tortyrmästare och tre fiskmän
  const rm = new Set(); for (const e of ents.filter(o => o.type === 'ɗ' && !o.minion).slice(2)) rm.add(e); for (const e of ents.filter(o => o.type === 'ɚ' && !o.minion).slice(3)) rm.add(e);
  if (rm.size) { ents = ents.filter(e => !rm.has(e)); totalEnemies -= rm.size; }
  for (const e of ents) if (e.d.ai === 'fishman') { // gömmer sig i djupvattnet intill
    { const cx = e.x | 0, cy = e.y | 0, i = cy * mw + cx, fl = (lvl.floors || [lvl.floor])[cellFloor ? cellFloor[i] : 0] || ''; // bangeneratorn lägger djupt vatten under fiskmannen
      if (map[cy] && map[cy][cx] === '.' && /deepwater/.test(fl)) { map[cy][cx] = 'Đ'; if (cellFloor && animTex.deep !== undefined) cellFloor[i] = animTex.deep; } }
    if (cellAt(e.x, e.y) !== 'Đ') for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) if (cellAt(e.x + a, e.y + b) === 'Đ') { e.x = (e.x | 0) + a + 0.5; e.y = (e.y | 0) + b + 0.5; break; }
    if (cellAt(e.x, e.y) === 'Đ') { e.hidden = true; e.v21sub = true; } }
  for (const pr of props) { if (pr.ch === 'ɏ') { pr.z = 0.85; pr.hp21 = 25; } if (pr.ch === 'ɒ' && !v21lh) v21lh = { x: pr.x, y: pr.y }; }
  if (lvl && lvl.biome === 'harbor' && !lvl.hub) {
    if (lvl.lighthouse && isFinite(lvl.lighthouse.x)) v21lh = { x: +lvl.lighthouse.x + 0.5, y: +lvl.lighthouse.y + 0.5 };
    if (!v21lh) v21lh = { x: mw / 2, y: mh / 2 };
    const f = lvl.fog || [0, 0, 0]; if (f[0] + f[1] + f[2] < 70) lvl.fog = [26, 32, 37]; // dimman är grå, inte svart
  } else if (!(lvl && lvl.biome === 'harbor')) v21lh = null;
  if (lvl && lvl.biome === 'prison' && !lvl.hub && typeof lvl.ambient === 'number' && lvl.ambient < 0.2) lvl.ambient = 0.2; // fängelset får inte bli kolsvart
}
function v21OpenGates(quiet) {
  if (!v21gates.length) return; for (const g of v21gates) { if (map[g.y] && map[g.y][g.x] === 'Ɉ') map[g.y][g.x] = g.c; }
  v21gates = []; v21gateT = 0; flowCell = -1; if (!quiet) { play('gate_slam', 0.8, 1.2); say('GALLREN LYFTS', 1); }
}
function v21Lockdown(b) { // galler fälls ned mitt emellan bödeln och spelaren och delar arenan i 8 s
  v21OpenGates(true); const vert = Math.abs(P.x - b.x) >= Math.abs(P.y - b.y), mx = ((P.x + b.x) / 2) | 0, my = ((P.y + b.y) / 2) | 0;
  const busy = (x, y) => Math.hypot(P.x - x - 0.5, P.y - y - 0.5) < 0.9 || ents.some(e => !e.dead && Math.hypot(e.x - x - 0.5, e.y - y - 0.5) < 0.6 + (e.boss ? 1 : 0)) || props.some(p => !p.broken && p.cx === x && p.cy === y);
  for (const s of [1, -1]) for (let i = s > 0 ? 0 : 1; i < 40; i++) { const x = vert ? mx : mx + i * s, y = vert ? my + i * s : my; if (!map[y] || x < 0 || x >= mw || solid(x + 0.5, y + 0.5)) break; if (busy(x, y)) continue; v21gates.push({ x, y, c: map[y][x] }); map[y][x] = 'Ɉ'; }
  if (v21gates.length) { v21gateT = 8; flowCell = -1; play('gate_slam', 1, 0.9); }
}
function v21Alarm(pl) {
  pl.used = true;
  if (Math.random() < mod('alarmQuiet')) { say('PLATTAN KLICKAR – MEN KLOCKAN ÄR TYST', 1.5); play('click', 0.6, 0.6); return; }
  play('prison_alarm_bell', 1.2, 1); say('LARMET GÅR!', 1.5); stat('alarms'); firstHint('alarmplate', 'LARMPLATTORNA LYSER RÖTT – HOPPA ÖVER DEM.');
  for (const e of ents) if (!e.dead && !e.boss && Math.hypot(e.x - pl.x - 0.5, e.y - pl.y - 0.5) < 14) { e.alert = true; e.sleep = false; }
  let best = null, bd = 30; for (const k in doors) { const [dx, dy] = k.split(',').map(Number), d = Math.hypot(dx - pl.x, dy - pl.y); if (d < bd && d > 2) { bd = d; best = [dx, dy]; } }
  for (let i = 0; i < 2; i++) { let s = null;
    if (best) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const x = best[0] + a + 0.5 + i * 0.2, y = best[1] + b + 0.5; if (freeSpot(x, y, 0.25) && !isDoorChar(cellAt(x, y))) { s = [x, y]; break; } }
    if (!s) s = freeSpotFar(4, 9); if (!s) continue;
    const e = makeEnemy('ɕ', s[0], s[1]); e.alert = true; e.minion = true; e.v21alarm = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 4); }
}
function v21BurnNet(x, y) { const cx = x | 0, cy = y | 0; for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + a, ny = cy + b, n = v21nets[ny * mw + nx]; if (!n || !map[ny] || map[ny][nx] !== 'Ɏ') continue; map[ny][nx] = '.'; v21FloorBack(nx, ny); delete v21nets[ny * mw + nx]; spawnPuff(nx + 0.5, ny + 0.5, 4); } }
const v21Slow = () => (P.v21netT > 0 ? 1 - 0.5 * clamp(1 - mod('netResist'), 0, 1) : 1) * (WS.flSpin ? (up('fl_heavy') ? 0.75 : 0.65) : 1) * (v21flood > 0 && P.jz < 0.15 ? 0.6 : 1);
const v21Breakable = pr => (pr.ch === 'ɏ' || pr.ch === 'ɓ') && !pr.v21wreck && !pr.v21fall;
function v21HitProp(pr, hx, hy, dmg) {
  if (pr.ch === 'ɏ') { if (pr.broken || pr.v21wreck || pr.v21fall) return true; pr.hp21 = (pr.hp21 ?? 25) - (dmg || 10); sparks(pr.x, pr.y, 0.9, 2); play('ricochet', 0.3, rnd(0.8, 1), { x: pr.x, y: pr.y });
    if (pr.hp21 <= 0) { pr.v21fall = { t: 0 }; play('chain_swing', 0.6, 1.4, { x: pr.x, y: pr.y }); }
    return false; }
  if (pr.ch === 'ɓ') { if (pr.broken || pr.v21wreck) return true; map[pr.cy][pr.cx] = '.'; flowCell = -1; if (pr.frames && pr.frames[1]) { pr.v21wreck = true; pr.img = pr.frames[1]; pr.def = { ...pr.def, block: false }; } else pr.broken = true;
    play('barrel_fish', 1.2, rnd(0.9, 1.1), { x: pr.x, y: pr.y }); spawnPuff(pr.x, pr.y, 5); stat('fishBarrels');
    dropItem(Math.random() < 0.5 ? 'fish' : (P.has[weaponIndex('blunderbuss')] && Math.random() < 0.6 ? 'scrap' : 'ammo'), pr.x, pr.y); return false; }
  return undefined;
}
function v21CageLand(pr) {
  pr.v21fall = null; pr.v21wreck = true; pr.z = 0; if (pr.frames && pr.frames[1]) pr.img = pr.frames[1];
  play('cage_fall', 1.2, 1, { x: pr.x, y: pr.y }); spawnPuff(pr.x, pr.y, 8); stat('cages');
  if (Math.hypot(P.x - pr.x, P.y - pr.y) < 0.8) { run.cause = 'BUREN'; hurtPlayer(10, pr.x, pr.y, 'melee'); }
  if (Math.random() < 0.25) { const e = makeEnemy('ɖ', pr.x, pr.y); e.alert = true; e.minion = true; e.hp = e.maxHp = Math.max(4, e.maxHp * 0.6); ents.push(e); totalEnemies++; say('EN FÅNGE KRAVLAR UR BUREN!', 1.2); }
  else dropItem(['health', 'ammo', 'goldpile', 'armor', 'scrap'][(Math.random() * 5) | 0], pr.x, pr.y);
}
function v21Harbor() { return lvl && lvl.biome === 'harbor' && !lvl.hub; }
function updateV21(dt) {
  v21clock += dt; const ground = P.jz < 0.15, cx = P.x | 0, cy = P.y | 0, ci = cy * mw + cx;
  // glödande järn: du brinner en stund
  if (P.v21burn > 0) { P.v21burn -= dt; P.v21burnAcc = (P.v21burnAcc || 0) + dt; P.burnFx = Math.max(P.burnFx || 0, 0.35); if (P.v21burnAcc >= 0.5) { P.v21burnAcc = 0; run.cause = 'GLÖDANDE JÄRN'; hurtPlayer(1.5, P.x, P.y, 'gas'); } }
  // larmplattorna
  if (ground) for (const pl of v21plates) if (!pl.used && pl.x === cx && pl.y === cy) v21Alarm(pl);
  // fisknäten: långsamt, och den som går in i ett fastnar en stund (en gång per nät och 4 s)
  const net = v21nets[ci];
  if (net && ground && map[cy][cx] === 'Ɏ') { P.v21netT = 0.2; if (P.v21cell !== ci && net.cd <= v21clock) { net.cd = v21clock + 4; const t = 0.6 * clamp(1 - mod('netResist'), 0, 1); if (t > 0.05) { P.rootT = Math.max(P.rootT || 0, t); P.v21snag = true; play('net_snag', 0.9, rnd(0.9, 1.1)); firstHint('net', 'FISKNÄTEN SNÄRJER – ELD BRÄNNER BORT DEM.'); } } }
  else P.v21netT = Math.max(0, P.v21netT - dt);
  if (!(P.rootT > 0)) P.v21snag = false;
  P.v21cell = ci;
  for (const e of ents) if (!e.dead && !e.boss && !e.d.float && e.d.ai !== 'fishman' && map[e.y | 0] && map[e.y | 0][e.x | 0] === 'Ɏ') e.slow = Math.max(e.slow || 0, 0.25);
  // hängande burar som faller, galgen som gungar
  for (const pr of props) { if (pr.v21fall) { pr.v21fall.t += dt; pr.z = Math.max(0, 0.85 - 4 * pr.v21fall.t * pr.v21fall.t); if (pr.z <= 0) v21CageLand(pr); }
    else if (pr.ch === 'ɑ' && !settings.reduceMotion) pr.off = Math.sin(tmr * 1.3 + pr.ph) * 0.035; }
  // bödelns galler
  if (v21gateT > 0) { v21gateT -= dt; if (v21gateT <= 0) v21OpenGates(); }
  // tidvattnet och tentaklerna
  if (v21flood > 0) { v21flood -= dt; if (P.jz < 0.15) firstHint('flood', 'VATTNET STIGER – HOPPA FÖR ATT RÖRA DIG FRITT.'); if (!settings.lowfx && Math.random() < dt * 10) { const a = rnd(0, TAU), r = rnd(0.5, 4); if (!solid(P.x + Math.cos(a) * r, P.y + Math.sin(a) * r)) particles.push({ x: P.x + Math.cos(a) * r, y: P.y + Math.sin(a) * r, z: 0.02, vx: 0, vy: 0, vz: 0.3, life: 0.6, maxLife: 0.6, img: fx.hit[1], size: 0.08, add: true, fade: true, tint: [120, 180, 230] }); } }
  for (const t of v21tent) { t.t += dt;
    if (t.t < t.warn) { if (!settings.lowfx && Math.random() < dt * 14) particles.push({ x: t.x + rnd(-0.4, 0.4), y: t.y + rnd(-0.4, 0.4), z: 0.02, vx: 0, vy: 0, vz: rnd(0.4, 0.9), life: 0.5, maxLife: 0.5, img: fx.hit[1], size: 0.06, add: true, fade: true, tint: [140, 200, 255] }); continue; }
    if (!t.hit) { t.hit = true; play('tide_tentacle', 0.8, rnd(0.9, 1.1), { x: t.x, y: t.y }); splash(t.x, t.y); if (Math.hypot(P.x - t.x, P.y - t.y) < 0.95 && P.jz < 0.5) { run.cause = t.cause; hurtPlayer(t.dmg, t.x, t.y, 'melee'); } }
    if (t.t > t.warn + 0.9) t.done = true; }
  v21tent = v21tent.filter(t => !t.done);
  // fiskeläget: dimman rullar in och ut, fyrens ljuskägla sveper
  if (v21Harbor()) {
    v21beamA += dt * 0.45;
    if (v20stormK < 0.01) { if (v21fogBase === null || !v21fogOn) v21fogBase = fogK; v21fogOn = true; v21fogK = 0.5 - 0.5 * Math.cos(v21clock * TAU / 36); fogK = v21fogBase * (1 + 1.3 * v21fogK * clamp(1 - mod('fogSight'), 0.2, 1));
      if (v21fogK > 0.92 && !v21horn) { v21horn = true; play('foghorn', 0.55, 1); firstHint('fog', 'DIMMAN RULLAR IN – FYRENS LJUS VISAR VÄGEN.'); } if (v21fogK < 0.5) v21horn = false; }
    if (v21lh && !v21beamSeen) { const d = Math.hypot(P.x - v21lh.x, P.y - v21lh.y); let off = Math.atan2(P.y - v21lh.y, P.x - v21lh.x) - v21beamA; off = Math.atan2(Math.sin(off), Math.cos(off)); if (d < 18 && Math.abs(off) < 0.12) { v21beamSeen = true; firstHint('lighthouse', 'FYRENS LJUSKÄGLA SVEPER ÖVER FISKELÄGET.'); } }
  } else if (v21fogOn) { v21fogOn = false; if (v21fogBase !== null) fogK = v21fogBase; }
  // bödelns kedjekrok drar dig mot honom
  if (P.v21pull) { const l = P.v21pull, d = Math.hypot(l.b.x - P.x, l.b.y - P.y); l.t -= dt; if (l.t <= 0 || d < 2.4 || l.b.dead || l.b.dying) P.v21pull = null; else tryMove(P, (l.b.x - P.x) / d * dt * 8, (l.b.y - P.y) / d * dt * 8, 0.24); }
  // morgonstjärnans snurrljud tystnar när du byter vapen
  if (v21spinSnd && !(WEAPONS[P.weapon].flail && WS.flSpin)) v21StopSpin();
}
function v21Light(fl) {
  for (const pl of v21plates) if (!pl.used) fl(pl.x + 0.5, pl.y + 0.5, 0.22 + (settings.noFlash ? 0 : 0.06 * Math.sin(tmr * 3)), 1, [255, 50, 40]); // larmplattorna lyser svagt rött
  if (v21lh && v21Harbor()) { const ca = Math.cos(v21beamA), sa = Math.sin(v21beamA), st = settings.lowfx ? 3 : 1.5;
    for (let d = 1.5; d < 20; d += st) { const x = v21lh.x + ca * d, y = v21lh.y + sa * d; if (x < 0 || y < 0 || x >= mw || y >= mh) break; fl(x, y, 0.6 * (1 - d / 24), 2, [255, 238, 190]); } }
}
function flailHit(wp, base, reach, arc, spin) {
  let hit = false; const r = reach + (up('fl_reach') ? 0.5 : 0);
  for (const e of ents) { if (e.dead || e.dying || e.hidden || e.dormant) continue; const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
    if (d > r + e.d.size * 0.3 || (!spin && Math.abs(off) > arc && d > 0.6)) continue;
    const crit = Math.random() < mod('critChance'); const dmg = base * meleeMul() * (1 + mod('flailDmg')) * (up('fl_heavy') && !spin ? 1.3 : 1) * (crit ? 2 + mod('critDmg') : 1);
    const k = hurtEnemy(e, dmg, e.x, e.y, { melee: true, crit }); hitKill = hitKill || k; hit = true; if (crit) hitCrit = true;
    if (!k && up('fl_stun') && !e.boss) e.stun = Math.max(e.stun || 0, spin ? 0.3 : 0.7); }
  for (const pt of pots) if (!pt.broken && Math.hypot(pt.x - P.x, pt.y - P.y) < r) breakPot(pt);
  if (!spin) breakProps(P.x + Math.cos(P.a), P.y + Math.sin(P.a), 0.8);
  for (const pr of props) if (!pr.broken && (v21Breakable(pr) || v20Breakable(pr)) && Math.hypot(pr.x - P.x - (spin ? 0 : Math.cos(P.a) * 0.9), pr.y - P.y - (spin ? 0 : Math.sin(P.a) * 0.9)) < (spin ? r : 0.9)) { if (v21Breakable(pr)) v21HitProp(pr, pr.x, pr.y, base); else v20HitProp(pr, pr.x, pr.y, base); }
  if (hit) { play('flail_hit', spin ? 0.6 : 1, rnd(0.9, 1.1)); if (!spin) hitStop = Math.max(hitStop, 0.05); hitMark = 0.12; lvlStat.hits++; }
  return hit;
}
function flailSwing(wp) { // morgonstjärnan: ett tungt slag framåt
  if (WS.cd > 0 || WS.state !== 'idle' || WS.flSpin) return;
  WS.shot = 0; WS.cd = effDelay(wp); WS.kick = 0.5; lvlStat.shots++; noise(1.5);
  play('flail_swing', 0.6, rnd(0.9, 1.05));
  setTimeout(() => { if (state !== 'play' || !WEAPONS[P.weapon].flail) return; flailHit(wp, wp.dmg, 1.8, 0.8, false); }, 180);
}
function weaponV21Tick(wp, dt, trig) {
  // morgonstjärnan: håll inne högerklick så snurrar kedjan över huvudet
  const spin = !!wp.flail && aimDown && state === 'play' && WS.state === 'idle';
  if (spin) { if (!WS.flSpin) { WS.flSpin = true; WS.flT = 0.1; stat('flailSpins'); firstHint('flailspin', 'MORGONSTJÄRNAN SNURRAR – ALLT RUNT DIG TRÄFFAS.'); }
    if (!v21spinSnd) v21spinSnd = play('flail_spin', 0.45, 1, { loop: true });
    WS.flT -= dt; if (WS.flT <= 0) { WS.flT = 0.25 * (up('fl_spin') ? 0.7 : 1); flailHit(wp, 18, 1.5, 0, true); } }
  else if (WS.flSpin) v21StopSpin();
  // trombonen: högerklick avfyrar båda laddningarna på en gång
  if (wp.blunderbuss && aimDown && !WS.bbAim && state === 'play' && WS.state === 'idle' && WS.cd <= 0 && P.mags[P.weapon] >= 2) {
    const m0 = P.mags[P.weapon]; WS.bbDbl = true; fire(); WS.bbDbl = false;
    if (P.mags[P.weapon] <= m0 - 2) { play('blunder_double', 1, 1); WS.cd = Math.max(WS.cd, effDelay(wp) * (up('bb_fast') ? 1.2 : 1.8)); stat('doubleShots'); P.shake = Math.max(P.shake, 1.2); if (P.mags[P.weapon] <= 0 && P.ammo.scrap > 0) setTimeout(() => { if (state === 'play' && WEAPONS[P.weapon].blunderbuss) startReload(); }, 350); } }
  if (wp.blunderbuss && up('bb_fast') && WS.state === 'reload') WS.t += dt * 0.4;
  WS.bbAim = aimDown;
}
function v21Dmg(e, dmg, opt) {
  if (e.d.ai === 'shorecrab' && !opt.boom && !opt.fall && !opt.infight && e.faceA !== undefined) { let off = Math.atan2(P.y - e.y, P.x - e.x) - e.faceA; off = Math.atan2(Math.sin(off), Math.cos(off));
    if (Math.abs(off) < 0.9) { dmg *= Math.min(1, 0.25 + mod('crabCrack')); if ((e.shMsg || 0) < tmr) { e.shMsg = tmr + 0.8; spawnText(e.x, e.y, 'PANSAR', '#e0a080'); sparks(e.x, e.y, 0.5, 2); play('shorecrab_clack', 0.9, rnd(0.9, 1.2), { x: e.x, y: e.y }); } } }
  const wp = WEAPONS[P.weapon];
  if (wp && wp.blunderbuss && !opt.melee && !opt.boom && !opt.fall && !opt.infight && !opt.noProc) { dmg *= 1 + mod('blunderDmg');
    const d = Math.hypot(e.x - P.x, e.y - P.y);
    if (!e.boss && d < 6) { const a = Math.atan2(e.y - P.y, e.x - P.x), k = (up('bb_knock') ? 1.6 : 1) * 0.8 * (1 - d / 7) / (e.elite ? 2 : 1), kn = e.knock || { t: 0.3, vx: 0, vy: 0 }; kn.t = 0.3; kn.vx += Math.cos(a) * k; kn.vy += Math.sin(a) * k; e.knock = kn; }
    if (up('bb_fire')) e.burn = Math.max(e.burn || 0, 2); }
  return dmg;
}
function v21Kill(e) {
  if (e.boss) { v21OpenGates(); v21tent = []; v21flood = 0; }
}
function v21Map(s, ox, oy, inside) { // larmplattor och nät på kartan
  for (const pl of v21plates) if (!pl.used && inside(pl.x, pl.y) && seen[pl.y * mw + pl.x]) { ctx.fillStyle = '#d03030'; ctx.fillRect(ox + pl.x * s, oy + pl.y * s, s, s); }
  for (const g of v21gates) if (inside(g.x, g.y)) { ctx.fillStyle = '#9098a8'; ctx.fillRect(ox + g.x * s, oy + g.y * s, s, s); }
}
function drawV21Hud(g) {
  if (state !== 'play' && v21spinSnd) v21StopSpin(); // pausen tystar snurret
  if (P.v21snag && P.rootT > 0) { const t = 'FAST I NÄTET!'; txt(t, Math.round((W - textW(t)) / 2), VH - 50, '#c0d0e0', 1, true, 0.8); }
  if (v21flood > 0) { g.fillStyle = `rgba(40,90,140,${0.12 + (settings.noFlash ? 0 : 0.03 * Math.sin(tmr * 2))})`; g.fillRect(0, 0, W, VH); }
  if (WS.flSpin && WEAPONS[P.weapon].flail) { const w = 30, x = (W - w) / 2, y = HORIZON + 22, k = 1 - clamp(WS.flT / 0.25, 0, 1); g.fillStyle = '#000a'; g.fillRect(x - 1, y - 1, w + 2, 4); g.fillStyle = '#c0c8d0'; g.fillRect(x, y, w * k, 2); }
}
function drawV21World(list) {
  for (const t of v21tent) list.push({ x: t.x, y: t.y, k: 'v21', t: 'tent', o: t });
  if (v21lh && v21Harbor() && !settings.lowfx) { const ca = Math.cos(v21beamA), sa = Math.sin(v21beamA); for (let d = 2; d < 18; d += 2.5) list.push({ x: v21lh.x + ca * d, y: v21lh.y + sa * d, k: 'v21', t: 'beam', d }); }
}
function drawV21Sprite(s) {
  const o = s.o;
  if (s.t === 'tent') { if (o.t < o.warn) { const n = 8; for (let i = 0; i < n; i++) { const a = i / n * TAU + tmr * 2; drawSprite(fx.hit[1], o.x + Math.cos(a) * 0.7, o.y + Math.sin(a) * 0.7, 0.07, 0.01, false, 1.4, 0, 0, true, [120, 190, 255]); } return true; }
    const f = enemyFrames['Ǚ'] && enemyFrames['Ǚ'].attack, k = clamp((o.t - o.warn) / 0.9, 0, 0.999), rise = Math.min(1, (o.t - o.warn) * 5) * (1 - Math.max(0, k - 0.7) / 0.3);
    if (f && f.length) drawSprite(f[Math.floor(k * f.length)], s.x, s.y, 1.1 * rise + 0.05, 0, false, null, 0, 0.5); else drawSprite(fx.fireball[4], s.x, s.y, 0.6 * rise + 0.05, 0.2, false, 1.2, 0, 0, true, [60, 140, 120]); return true; }
  if (s.t === 'beam') { drawSprite(fx.fireball[4], s.x, s.y, 0.9, 1.3 - s.d * 0.04, false, 0.45 * (1 - s.d / 20), 0, 0, true, [255, 240, 200]); return true; }
  return false;
}
function v21IronProj(p, dt) { // glödande järn: sätter dig i brand
  if (infightHit(p)) return;
  if (Math.hypot(p.x - P.x, p.y - P.y) < 0.38) { p.dead = true; run.cause = p.cause || run.cause; hurtPlayer(p.dmg, p.src.x, p.src.y, 'proj'); const t = 2.2 * clamp(1 - mod('burnResist'), 0, 1); if (t > 0.05) { P.v21burn = Math.max(P.v21burn || 0, t); firstHint('hotiron', 'GLÖDANDE JÄRN SÄTTER DIG I BRAND EN STUND.'); } play('hot_iron', 0.8, 1.2); return; }
  if (solid(p.x, p.y) || p.life <= 0) { p.dead = true; sparks(p.x, p.y, 0.4, 4); }
}
Object.assign(PROJ_UPD_V8, { ehotiron: v21IronProj });
Object.assign(PROJ_DRAW_V8, { ehotiron: o => drawSprite(fx.fireball[Math.floor(tmr * 16) % 8], o.x, o.y, 0.28, o.z - 0.12, false, 2.2, 0, 0, true, [255, 120, 40]),
  echop: o => drawSprite(fx.hit[1], o.x, o.y, 0.35, 0.02, Math.floor(tmr * 12) % 2 === 0, 1.6, 0, 0, true, [200, 180, 150]) });

// ---------- Version 21: fängelsets och fiskelägets invånare ----------
const AI_V21 = {
  turnkey(e, dt, dist, los) { // blåser i visselpipan när den ser dig – larmar alla inom 10 rutor (en gång)
    if (!e.whistled && e.alert && los && dist < 12 && (e.stun || 0) <= 0) { e.whistled = true; play('jailer_whistle', 0.9, 1, { x: e.x, y: e.y }); spawnText(e.x, e.y, 'PRRRT!', '#ffe080'); firstHint('whistle', 'NYCKELKNEKTEN VISSLAR PÅ HJÄLP – DÖDA DEN FÖRST.');
      for (const o of ents) if (o !== e && !o.dead && !o.boss && Math.hypot(o.x - e.x, o.y - e.y) < 10) { o.alert = true; o.sleep = false; } }
    return false;
  },
  convict(e) { if (e.state === 'attack' && !e.v21sw) { e.v21sw = true; play('chain_swing', 0.8, rnd(0.9, 1.1), { x: e.x, y: e.y }); } if (e.state !== 'attack') e.v21sw = false; return false; },
  torturer(e, dt, dist, los) { // kastar glödande järn
    e.throwT = (e.throwT ?? rnd(1.2, 2.5)) - dt;
    if (e.throwT <= 0 && los && dist > 1.5 && dist < 9 && e.state !== 'pain') { e.throwT = rnd(2.6, 3.6); e.state = 'attack'; e.t = 0; e.didHit = true; const a = Math.atan2(P.y + P.vy * 0.3 - e.y, P.x + P.vx * 0.3 - e.x); v18Shoot(e, a, 6.5, e.d.dmg, 'ehotiron', { life: 2.5 }); play('hot_iron', 0.7, 1, { x: e.x, y: e.y }); return true; }
    return false;
  },
  watchdog(e) { if (e.state === 'attack' && !e.v21b) { e.v21b = true; play('watchdog_bite', 0.7, rnd(0.9, 1.15), { x: e.x, y: e.y }); } if (e.state !== 'attack') e.v21b = false; return false; },
  drownedfisher(e, dt) { if (!settings.lowfx && Math.random() < dt * 3) particles.push({ x: e.x + rnd(-0.2, 0.2), y: e.y + rnd(-0.2, 0.2), z: 0.6, vx: 0, vy: 0, vz: -0.5, life: 0.6, maxLife: 0.6, img: fx.hit[1], size: 0.04, grav: true, tint: [120, 170, 210] }); return false; },
  fishman(e, dt, dist, los) { // gömd i djupvattnet – hoppar i en båge mot dig
    if (e.v21leap) { const l = e.v21leap; l.t += dt; const k = Math.min(1, l.t / l.T); e.x = l.x0 + (l.x1 - l.x0) * k; e.y = l.y0 + (l.y1 - l.y0) * k; e.state = 'attack';
      if (k >= 1) { e.v21leap = null; e.state = 'move'; e.t = 0; splash(e.x, e.y); if (Math.hypot(P.x - e.x, P.y - e.y) < 1.2 && P.jz < 0.5) { run.cause = e.d.name; hurtPlayer(e.d.dmg, e.x, e.y, 'melee'); } } return true; }
    if (e.hidden) { e.state = 'idle'; if (dist < 5.5 && hasLOS(e.x, e.y, P.x, P.y)) { e.hidden = false; e.alert = true; e.v21sub = false;
        const a = Math.atan2(P.y - e.y, P.x - e.x), L = Math.max(0.5, dist - 0.9); let tx = e.x + Math.cos(a) * L, ty = e.y + Math.sin(a) * L; if (solid(tx, ty)) { tx = P.x; ty = P.y; }
        e.v21leap = { t: 0, T: 0.6, x0: e.x, y0: e.y, x1: tx, y1: ty }; play('fishman_leap', 0.9, 1, { x: e.x, y: e.y }); splash(e.x, e.y); firstHint('fishman', 'FISKMÄNNEN HOPPAR UPP UR DJUPVATTNET.'); }
      return true; }
    return false;
  },
  shorecrab(e, dt, dist) { // vänder pansaret mot dig och går i sidled
    const want = Math.atan2(P.y - e.y, P.x - e.x); let d = want - (e.faceA ?? want); d = Math.atan2(Math.sin(d), Math.cos(d)); e.faceA = (e.faceA ?? want) + clamp(d, -2.0 * dt, 2.0 * dt);
    if (e.alert && dist > 1.4 && dist < 8 && e.state !== 'attack' && e.state !== 'pain' && !(e.stun > 0)) { e.sideT = (e.sideT ?? 1.5) - dt; if (e.sideT <= 0) { e.sideT = rnd(1.2, 2); e.side = -(e.side || 1); }
      const s = e.side || 1, sp = e.d.speed * dt; tryMove(e, (Math.cos(want + s * Math.PI / 2) * 0.85 + Math.cos(want) * 0.45) * sp, (Math.sin(want + s * Math.PI / 2) * 0.85 + Math.sin(want) * 0.45) * sp, 0.3); e.state = 'move'; return true; }
    return false;
  },
  gulls(e) { if (!e.v21g) { e.v21g = true; const k = clamp(1 - mod('gullResist'), 0, 1); e.d = { ...e.d, dmg: e.d.dmg * k }; } return false; },
};

// ---------- Version 21: Bödeln och Tidvattenprästen ----------
Object.assign(BOSS_AI, {
  executioner(b, dt, dist, ang, ph) { // yxhugg med en våg längs golvet, kedjekrok
    const fast = ph === 3 ? 1.25 : 1;
    if (b.state === 'idle') b.once21 = false;
    if (b.state === 'chop') { if (!b.didHit && b.t > 0.6) { b.didHit = true; play('executioner_chop', 1, 1); P.shake = Math.max(P.shake, 1.2); if (dist < (b.d.range || 2.4) + 1.2 && P.jz < 0.4) { run.cause = b.d.name; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); } v18Shoot(b, ang, 7, b.d.dmg * 0.6, 'echop', { z: 0.12, life: 2.2 }); if (ph >= 2) { v18Shoot(b, ang + 0.35, 7, b.d.dmg * 0.5, 'echop', { z: 0.12, life: 2.2 }); v18Shoot(b, ang - 0.35, 7, b.d.dmg * 0.5, 'echop', { z: 0.12, life: 2.2 }); } }
      if (b.t > 1.1) { b.state = 'idle'; b.t = 0; b.cd = rnd(0.9, 1.3) / fast; } return; }
    if (b.state === 'hook') { if (!b.didHit && b.t > 0.5) { b.didHit = true; play('chain_hook', 1, 1); if (dist < 11 && hasLOS(b.x, b.y, P.x, P.y)) { P.v21pull = { t: 0.7, b }; P.slowT = Math.max(P.slowT || 0, 0.9); run.cause = b.d.name; hurtPlayer(b.d.dmg * 0.3, b.x, b.y, 'proj'); say('KEDJEKROKEN DRAR DIG!', 1); } }
      if (b.t > 1.0) { b.state = 'idle'; b.t = 0; b.cd = 0.5 / fast; } return; }
    b.cd -= dt;
    if (b.cd <= 0) { b.t = 0; b.didHit = false; const los = hasLOS(b.x, b.y, P.x, P.y);
      if (los && dist < 4) { b.state = 'chop'; bossWarn(b, 'BÖDELN HÖJER YXAN!'); }
      else if (los) { b.state = dist > 5 && Math.random() < 0.6 ? 'hook' : 'chop'; if (b.state === 'hook') bossWarn(b, 'BÖDELN SVINGAR KEDJEKROKEN!'); else bossWarn(b, 'HOPPA ÖVER HUGGVÅGEN!'); } else b.cd = 0.4;
      return; }
    if (dist > 3) bossMove(b, ang, b.d.speed * fast * dt); else bossMove(b, ang + Math.PI / 2, b.d.speed * dt * 0.5);
  },
  tidepriest(b, dt, dist, ang, ph) { // snäckstaven, tentakler och vågen
    const fast = ph === 3 ? 1.25 : 1;
    if (b.state === 'idle') b.once21 = false;
    if (b.state === 'staff') { if (!b.didHit && b.t > 0.5) { b.didHit = true; play('wave_crash', 0.4, 1.4); if (dist < (b.d.range || 2.2) + 1 && P.jz < 0.4) { run.cause = b.d.name; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); } }
      if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = rnd(0.8, 1.2) / fast; } return; }
    if (b.state === 'tentacles') { if (!b.once21 && b.t > 0.2) { b.once21 = true; play('tidepriest_chant', 0.8, 1); for (let i = 0; i < 2 + ph; i++) { const a = rnd(0, TAU), r = i ? rnd(1, 2.8) : 0, x = P.x + P.vx * 0.5 * !i + Math.cos(a) * r, y = P.y + P.vy * 0.5 * !i + Math.sin(a) * r; const free = !solid(x, y); if (free || !i) v21tent.push({ x: free ? x : P.x, y: free ? y : P.y, t: -i * 0.15, warn: 0.7, dmg: b.d.dmg * 0.7, cause: b.d.name }); } }
      if (b.t > 1.1) { b.state = 'idle'; b.t = 0; b.cd = 0.8 / fast; } return; }
    if (b.state === 'wave') { if (!b.didHit && b.t > 0.6) { b.didHit = true; play('wave_crash', 1, 1); if (dist < 8 && hasLOS(b.x, b.y, P.x, P.y)) { const a = Math.atan2(P.y - b.y, P.x - b.x); P.pullFrom = { x: P.x + Math.cos(a) * 30, y: P.y + Math.sin(a) * 30 }; P.pullT = 0.6; run.cause = b.d.name; hurtPlayer(b.d.dmg * 0.4, b.x, b.y, 'proj'); say('VÅGEN KNUFFAR DIG!', 1); } if (!settings.lowfx) for (let i = 0; i < 14; i++) { const a = ang + rnd(-0.6, 0.6), sp = rnd(3, 6); particles.push({ x: b.x, y: b.y, z: 0.2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(0.5, 1.5), life: 0.8, maxLife: 0.8, img: fx.hit[1], size: 0.12, add: true, fade: true, grav: true, tint: [130, 190, 240] }); } }
      if (b.t > 1.1) { b.state = 'idle'; b.t = 0; b.cd = 0.9 / fast; } return; }
    b.cd -= dt;
    if (b.cd <= 0) { b.t = 0; b.didHit = false; b.once21 = false; const los = hasLOS(b.x, b.y, P.x, P.y);
      if (los && dist < 3.5) { b.state = 'staff'; bossWarn(b, 'TIDVATTENPRÄSTEN SLÅR MED STAVEN!'); }
      else if (los) { b.state = Math.random() < 0.55 ? 'tentacles' : 'wave'; bossWarn(b, b.state === 'wave' ? 'EN VÅG KOMMER!' : 'DET BUBBLAR UNDER DIG!'); } else b.cd = 0.4;
      return; }
    if (dist > 4) bossMove(b, ang, b.d.speed * fast * dt); else bossMove(b, ang + Math.PI / 2, b.d.speed * dt * 0.6);
  },
});
Object.assign(BOSS_SPECIAL, {
  executioner(b, dt, dist, ang, ph) {
    if (b.spK) { if (!b.once21) { b.once21 = true; v21Lockdown(b); bossWarn(b, 'INLÅSNING – GALLREN FALLER!'); play('executioner_roar', 0.9); }
      if (b.t > 1.0) { b.state = 'idle'; b.t = 0; b.cd = 0.7; } return; }
    if (!b.once21) { b.once21 = true; say('BÖDELN KALLAR PÅ FÅNGVAKTERNA', 1.5); play('executioner_roar', 0.8, 1.1); for (let i = 0; i < 1 + ph; i++) { const s = freeSpotFar(3, 6); if (!s) continue; const e = makeEnemy('ɕ', s[0], s[1]); e.alert = true; e.minion = true; e.whistled = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 8); } }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
  tidepriest(b, dt, dist, ang, ph) {
    if (b.spK) { if (!b.once21) { b.once21 = true; v21flood = 6; bossWarn(b, 'TIDVATTENPRÄSTEN HÖJER HAVET!'); play('wave_crash', 0.9, 0.8); play('tidepriest_roar', 0.7); }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return; }
    if (!b.once21) { b.once21 = true; say('TIDVATTENPRÄSTEN KALLAR PÅ DJUPETS BARN', 1.5); play('tidepriest_chant', 0.8, 0.9); for (let i = 0; i < 1 + ph; i++) { const s = freeSpotFar(3, 6); if (!s) continue; const e = makeEnemy('ɚ', s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; splash(s[0], s[1]); } }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
});
TAUNTS.executioner = ['DOMEN ÄR REDAN FALLEN', 'HUVUDET PÅ BLOCKET', 'INGEN NÅD I DESSA MURAR'];
TAUNTS.tidepriest = ['HAVET GER – OCH HAVET TAR', 'DJUPET KALLAR PÅ DIG', 'TIDVATTNET VÄNDER ALLTID'];
const v21api = () => ({ plates: v21plates, nets: v21nets, gates: v21gates, tent: v21tent, flood: () => v21flood, fogK: () => v21fogK, fogBase: () => v21fogBase, beam: () => ({ a: v21beamA, lh: v21lh }), setup: setupV21, slow: v21Slow, hitProp: v21HitProp, burnNet: v21BurnNet, lockdown: v21Lockdown, openGates: v21OpenGates,
  setClock: c => { v21clock = c; }, burn: () => P.v21burn || 0, spin: () => !!WS.flSpin, light: (x, y) => lightAt(x, y) });

// ---------- Version 22: Badhuset och Skärselden – heta bassänger, ånggaller, kallbad, eldfloder, runcirklar, treudden och svavelmortern ----------
let v22vents = [], v22pools = [], v22poolGrid = null, v22runes = [], v22dir = new Map(), v22streamCells = [], v22lobs = [], v22shots = [], v22spear = null, v22spores = [], v22pillars = [], v22temp = [], v22clock = 0, v22steamK = 0, v22steamForce = 0, v22fogBase = null, v22fogOn = false, v22ti = {};
const V22_IMP = 'ɵ', V22_SOUL = 'ɶ';
function v22Back(x, y) { if (cellFloor) cellFloor[y * mw + x] = lvl.floorMask ? (+lvl.floorMask[y][x] || 0) : 0; }
function setupV22() {
  v22vents = []; v22pools = []; v22runes = []; v22dir = new Map(); v22streamCells = []; v22lobs = []; v22shots = []; v22spear = null; v22spores = []; v22pillars = []; v22temp = []; v22clock = 0; v22steamK = 0; v22steamForce = 0; v22fogBase = null; v22fogOn = false;
  P.v22hotT = 0; P.v22hotAcc = 0; P.v22fireAcc = 0; P.v22coldAcc = 0; WS.trAim = false; WS.bsAim = false;
  v22ti = {}; for (const n of ['floor_hotpool', 'floor_firestream']) { v22ti[n] = floorTexs.length; floorTexs.push(tex[n] || tex.floor_stone); }
  if (lvl && Array.isArray(lvl.streams)) for (const s of lvl.streams) if (s && isFinite(s.x) && isFinite(s.y)) v22dir.set((s.y | 0) * mw + (s.x | 0), [+s.dx || 0, +s.dy || 0]);
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const c = map[y][x];
    if (c === 'ɤ') v22vents.push({ x, y, ph: ((x * 7 + y * 13) % 12) / 2, on: false });
    else if (c === 'ɱ') { if (v22runes.length < 3) v22runes.push({ x, y, used: false, glow: 0, sum: 0 }); else { map[y][x] = '.'; v22Back(x, y); } } // högst tre runcirklar per bana
    else if (c === 'ɰ') { const i = y * mw + x; v22streamCells.push([x, y]); if (!v22dir.has(i)) { const h = (map[y][x - 1] === 'ɰ') || (map[y][x + 1] === 'ɰ'); v22dir.set(i, h ? [1, 0] : [0, 1]); } }
  }
  // kallbaden: sammanhängande rutor delar på 30 hp
  const og = new Int16Array(mw * mh).fill(-1);
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (map[y][x] === 'ɥ' && og[y * mw + x] < 0) {
    const id = v22pools.length, cells = [], st = [[x, y]]; og[y * mw + x] = id;
    while (st.length) { const [cx, cy] = st.pop(); cells.push([cx, cy]); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + a, ny = cy + b; if (map[ny] && map[ny][nx] === 'ɥ' && og[ny * mw + nx] < 0) { og[ny * mw + nx] = id; st.push([nx, ny]); } } }
    v22pools.push({ cells, left: 30 * (1 + mod('coldPoolHeal')), dry: false });
  }
  v22poolGrid = og;
  // tak: högst fyra plågade själar och två köttbjässar
  const rm = new Set(); for (const e of ents.filter(o => o.type === V22_SOUL && !o.minion).slice(4)) rm.add(e); for (const e of ents.filter(o => o.type === 'ɷ' && !o.minion).slice(2)) rm.add(e);
  if (rm.size) { ents = ents.filter(e => !rm.has(e)); totalEnemies -= rm.size; }
}
function v22Temp(x, y, ch, t, floorName, dir) { // tillfälliga rutor: skållhett vatten och sprickor med eld
  if (!map[y] || map[y][x] !== '.' || v22temp.some(o => o.x === x && o.y === y)) return false;
  const i = y * mw + x; v22temp.push({ x, y, t, f: cellFloor ? cellFloor[i] : 0, ch }); map[y][x] = ch; if (cellFloor && v22ti[floorName] !== undefined) cellFloor[i] = v22ti[floorName]; if (dir) v22dir.set(i, dir); flowCell = -1; return true;
}
function v22ClearTemp() { for (const o of v22temp) if (map[o.y] && map[o.y][o.x] === o.ch) { map[o.y][o.x] = '.'; if (cellFloor) cellFloor[o.y * mw + o.x] = o.f; } v22temp = []; flowCell = -1; }
function v22Ignite(x, y) { for (const s of v22spores) if (Math.hypot(s.x - x, s.y - y) < 1.2) s.t = Math.min(s.t, 0.2); } // elden bränner bort sporerna
const v22Slow = () => (P.v22hotT > 0 ? 0.75 + 0.25 * clamp(mod('scaldResist'), 0, 1) : 1);
function v22HitProp(pr) { if (pr.ch === 'ɲ') { if ((pr.moanT || 0) < tmr) { pr.moanT = tmr + 1.5; play('chained_soul', 0.6, rnd(0.9, 1.1), { x: pr.x, y: pr.y }); } return undefined; } return undefined; }
function v22BrimDmg() { const w = WEAPONS[weaponIndex('brimstone')]; return (w ? w.dmg : 60) * (1 + mod('dmg')) * (1 + mod('brimstoneDmg')) * (1 + 0.12 * wlvl('brimstone')) * (up('bs_big') ? 1.15 : 1); }
function v22Boom(x, y, dmg) { // svavelklotet exploderar och lämnar eld
  for (let i = 0; i < 6 && solid(x, y); i++) { x -= Math.sign(x - P.x) * 0.2; y -= Math.sign(y - P.y) * 0.2; }
  const r = up('bs_big') ? 2.8 : 2; explode(x, y, dmg, r, false); play('brimstone_boom', 1, rnd(0.9, 1.05), { x, y }); stat('brimBooms');
  const t = up('bs_burn') ? 6 : 3; groundFires.push({ x, y, t, acc: 0 }); for (const [a, b] of [[0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7]]) if (!solid(x + a, y + b)) groundFires.push({ x: x + a, y: y + b, t, acc: 0 });
  if (Math.hypot(P.x - x, P.y - y) < 1.2) { run.cause = 'SVAVLET'; hurtPlayer(dmg * 0.15, x, y, 'proj'); }
}
function v22Lob(src, tx, ty, o) { for (let i = 0; i < 6 && solid(tx, ty); i++) { tx += (src.x - tx) * 0.2; ty += (src.y - ty) * 0.2; } [tx, ty] = lobClip(src.x, src.y, tx, ty); const L = Math.hypot(tx - src.x, ty - src.y); v22lobs.push(Object.assign({ x0: src.x, y0: src.y, tx, ty, t: 0, T: 0.35 + L * 0.07 }, o)); }
function updateV22(dt) {
  v22clock += dt; const ground = P.jz < 0.15, c = cellUnder(), cx = P.x | 0, cy = P.y | 0, ci = cy * mw + cx;
  // heta bassänger: långsammare och skållande
  if (c === 'ɣ' && ground) { P.v22hotT = 0.2; P.v22hotAcc += dt; if (P.v22hotAcc >= 0.5) { P.v22hotAcc = 0; run.cause = 'DET SKÅLLHETA VATTNET'; hurtPlayer(1.5 * trapMul() * clamp(1 - mod('scaldResist'), 0, 1), P.x, P.y, 'gas'); if (Math.random() < 0.4) play('hot_pool', 0.5, rnd(0.9, 1.1)); firstHint('hotpool', 'DE HETA BASSÄNGERNA SKÅLLAR – GÅ RUNT ELLER HOPPA ÖVER.'); } }
  else { P.v22hotT = Math.max(0, P.v22hotT - dt); P.v22hotAcc = 0.25; }
  // kallbad: släcker elden och läker upp till halva hälsan, högst 30 hp per bad
  if (c === 'ɥ' && ground && v22poolGrid) { if (P.v21burn > 0 || P.burnFx > 0) { P.v21burn = 0; P.burnFx = 0; play('cold_pool', 0.6, 1.2); } const o = v22pools[v22poolGrid[ci]];
    if (o && !o.dry && P.hp < maxHp() * 0.5) { const h = Math.min(o.left, 2 * (1 + mod('coldPoolHeal')) * dt, maxHp() * 0.5 - P.hp); P.hp += h; o.left -= h; P.v22coldAcc += h; if (P.v22coldAcc > 3) { P.v22coldAcc = 0; play('cold_pool', 0.3, rnd(0.95, 1.1)); spawnText(P.x, P.y, '+3', '#a0e0ff'); } firstHint('coldpool', 'KALLBADET LÄKER OCH SLÄCKER ELD – MEN BARA EN GÅNG.');
      if (o.left <= 0.01) { o.dry = true; for (const [x, y] of o.cells) { map[y][x] = '.'; v22Back(x, y); } say('KALLBADET ÄR TOMT', 1.5); stat('coldPools'); } } }
  // ånggallren: var sjätte sekund väller ånga upp i två sekunder – dimman tjocknar inom tre rutor
  let want = v22steamForce > 0 ? 1 : 0; v22steamForce = Math.max(0, v22steamForce - dt);
  for (const v of v22vents) { const on = (v22clock + v.ph) % 6 < 2, d = Math.hypot(v.x + 0.5 - P.x, v.y + 0.5 - P.y);
    if (on && !v.on && d < 10) play('steam_vent', 0.5 * (1 - d / 12), rnd(0.9, 1.1), { x: v.x + 0.5, y: v.y + 0.5 }); v.on = on;
    if (on && d < 3) { want = 1; firstHint('steamvent', 'ÅNGAN SKYMMER SIKTEN – ÅNGVÅLNADERNA SYNS I DEN.'); }
    if (on && !settings.lowfx && d < 14 && Math.random() < dt * 10) particles.push({ x: v.x + rnd(0.2, 0.8), y: v.y + rnd(0.2, 0.8), z: 0.05, vx: rnd(-0.2, 0.2), vy: rnd(-0.2, 0.2), vz: rnd(0.8, 1.6), life: 1.2, maxLife: 1.2, img: (fx.parts.steam3 || fx.parts.steam) ? (fx.parts.steam3 || fx.parts.steam)[0] : fx.hit[1], size: 0.16, fade: true, tint: (fx.parts.steam3 || fx.parts.steam) ? null : [230, 230, 230] }); }
  v22steamK += clamp(want - v22steamK, -dt * 1.2, dt * 2.5);
  if (v22steamK > 0.001) { if (!v22fogOn) { v22fogBase = fogK; v22fogOn = true; } fogK = v22fogBase * (1 + 3.5 * v22steamK * clamp(1 - mod('steamSight'), 0.2, 1)); }
  else if (v22fogOn) { v22fogOn = false; fogK = v22fogBase; }
  // eldfloderna: bränner och drar dig med strömmen
  if (c === 'ɰ' && P.jz < 0.3) { const dir = v22dir.get(ci) || [0, 1], k = clamp(1 - mod('streamResist'), 0, 1); P.v22fireAcc += dt; P.burnFx = Math.max(P.burnFx || 0, 0.4);
    if (P.v22fireAcc >= 0.5) { P.v22fireAcc = 0; run.cause = 'ELDFLODEN'; hurtPlayer(3 * trapMul() * k, P.x, P.y, 'gas'); firstHint('firestream', 'ELDFLODEN BRÄNNER OCH DRAR DIG MED STRÖMMEN – HOPPA ÖVER DEN.'); }
    tryMove(P, dir[0] * 1.2 * (0.5 + 0.5 * k) * dt, dir[1] * 1.2 * (0.5 + 0.5 * k) * dt, 0.24); }
  else P.v22fireAcc = 0.25;
  for (const e of ents) { if (e.dead || e.boss || e.d.float) continue; const ec = map[e.y | 0] && map[e.y | 0][e.x | 0];
    if (ec === 'ɣ' || ec === 'ɰ') { e.slow = Math.max(e.slow || 0, 0.25); e.v22acc = (e.v22acc || 0) + dt; if (e.v22acc >= 1) { e.v22acc = 0; hurtEnemy(e, ec === 'ɰ' ? 6 : 3, e.x, e.y, { noProc: true, quiet: true }); } if (ec === 'ɰ') { const dir = v22dir.get((e.y | 0) * mw + (e.x | 0)) || [0, 1]; tryMove(e, dir[0] * 1.2 * dt, dir[1] * 1.2 * dt, 0.3); } } }
  // runcirklarna: lyser upp och kallar fram två eldimpar
  for (const r of v22runes) { r.glow = Math.max(0, r.glow - dt);
    if (!r.used && ground && r.x === cx && r.y === cy) { r.used = true; r.glow = 0.8; play('rune_circle', 1, 1, { x: r.x + 0.5, y: r.y + 0.5 }); stat('runeCircles'); if (Math.random() >= mod('runeQuiet')) { r.sum = 0.8; say('RUNCIRKELN VAKNAR!', 1.2); } else say('RUNCIRKELN FLIMRAR – MEN INGET KOMMER', 1.5); firstHint('runecircle', 'RUNCIRKLARNA KALLAR FRAM DEMONER – GÅ RUNT DEM.'); }
    if (r.sum > 0) { r.sum -= dt; if (r.sum <= 0) for (let i = 0; i < 2; i++) { const a = i * Math.PI + rnd(-0.5, 0.5); let x = r.x + 0.5 + Math.cos(a) * 1.1, y = r.y + 0.5 + Math.sin(a) * 1.1; if (!freeSpot(x, y, 0.25)) { x = r.x + 0.5; y = r.y + 0.5; } const e = makeEnemy(V22_IMP, x, y); e.alert = true; e.minion = true; e.v22rune = true; ents.push(e); totalEnemies++; spawnPuff(x, y, 6); } } }
  // tillfälliga rutor
  for (const o of v22temp) { o.t -= dt; if (o.t <= 0 && map[o.y] && map[o.y][o.x] === o.ch) { map[o.y][o.x] = '.'; if (cellFloor) cellFloor[o.y * mw + o.x] = o.f; flowCell = -1; } }
  v22temp = v22temp.filter(o => o.t > 0);
  // sporerna från mögelkryparna
  for (const s of v22spores) { s.t -= dt; if (!settings.lowfx && Math.random() < dt * 8) particles.push({ x: s.x + rnd(-0.7, 0.7), y: s.y + rnd(-0.7, 0.7), z: rnd(0.1, 0.6), vx: 0, vy: 0, vz: 0.1, life: 0.9, maxLife: 0.9, img: fx.parts.spore ? fx.parts.spore[0] : fx.hit[1], size: 0.07, fade: true, tint: [150, 190, 90] });
    if (Math.hypot(P.x - s.x, P.y - s.y) < 1.2 && P.jz < 0.6) P.poisonT = Math.max(P.poisonT || 0, 1.5 * clamp(1 - mod('sporeResist'), 0, 1)); }
  v22spores = v22spores.filter(s => s.t > 0);
  // svavelklot och skållhett vatten i båge
  for (const l of v22lobs) { l.t += dt; if (l.t < l.T) continue; l.done = true;
    if (l.friendly) v22Boom(l.tx, l.ty, l.dmg);
    else { play('scald_splash', 1, rnd(0.9, 1.1), { x: l.tx, y: l.ty }); splash(l.tx, l.ty); if (Math.hypot(P.x - l.tx, P.y - l.ty) < 1.2 && P.jz < 0.4) { run.cause = l.cause; hurtPlayer(l.dmg, l.tx, l.ty, 'proj'); }
      for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = (l.tx | 0) + a, y = (l.ty | 0) + b; if (!(x === cx && y === cy)) v22Temp(x, y, 'ɣ', 4, 'floor_hotpool'); } } }
  v22lobs = v22lobs.filter(l => !l.done);
  // högerklicksskotten: rakt fram, exploderar vid träff
  for (const s of v22shots) { s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    const hit = ents.find(e => !e.dead && !e.dying && !e.hidden && !e.dormant && Math.hypot(e.x - s.x, e.y - s.y) < 0.35 + e.d.size * 0.25 * (e.boss ? 1.8 : 1));
    if (hit || solid(s.x, s.y) || s.life <= 0) { s.done = true; v22Boom(s.x - s.vx * dt * (hit ? 0 : 1), s.y - s.vy * dt * (hit ? 0 : 1), s.dmg); } }
  v22shots = v22shots.filter(s => !s.done);
  // den kastade treudden: ut och tillbaka
  if (v22spear) { const s = v22spear; s.t += dt;
    if (!s.back) { const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt; if (solid(nx, ny) || s.t >= s.out) { s.back = true; if (solid(nx, ny)) play('ricochet', 0.4, 0.8, { x: s.x, y: s.y }); } else { s.x = nx; s.y = ny; } }
    else { const d = Math.hypot(P.x - s.x, P.y - s.y), sp = 13 * dt; if (d < 0.6 || s.t > 3) { v22spear = null; play('trident_return', 0.9, 1); } else { s.x += (P.x - s.x) / d * Math.min(sp, d); s.y += (P.y - s.y) / d * Math.min(sp, d); } }
    if (v22spear) for (const e of ents) { if (e.dead || e.dying || e.hidden || e.dormant || s.hit.has(e) || Math.hypot(e.x - s.x, e.y - s.y) > 0.45 + e.d.size * 0.25 * (e.boss ? 1.8 : 1)) continue; s.hit.add(e);
      const dmg = 90 * (1 + mod('dmg')) * (1 + mod('tridentDmg')) * (1 + 0.12 * wlvl('trident')); const k = hurtEnemy(e, dmg, e.x, e.y, {}); hitKill = hitKill || k; hitMark = 0.12; play('trident_stab', 0.7, 1.2, { x: e.x, y: e.y }); if (k) stat('tridentThrowKills'); } }
  // eldfurstens eldpelare följer dig
  for (const p of v22pillars) { p.t -= dt; const d = Math.hypot(P.x - p.x, P.y - p.y); if (d > 0.1) { const a = Math.atan2(P.y - p.y, P.x - p.x); tryMove(p, Math.cos(a) * 2.2 * dt, Math.sin(a) * 2.2 * dt, 0.2); }
    p.acc = (p.acc || 0) + dt; if (p.acc >= 0.5 && d < 0.85 && P.jz < 0.7) { p.acc = 0; run.cause = p.cause; hurtPlayer(p.dmg, p.x, p.y, 'gas'); P.burnFx = Math.max(P.burnFx || 0, 0.5); }
    if (!settings.lowfx && Math.random() < dt * 18) particles.push({ x: p.x + rnd(-0.2, 0.2), y: p.y + rnd(-0.2, 0.2), z: rnd(0, 0.3), vx: 0, vy: 0, vz: rnd(1, 2), life: 0.6, maxLife: 0.6, frames: fx.fire, img: fx.fire[0], size: 0.3, add: true, drift: true }); }
  v22pillars = v22pillars.filter(p => p.t > 0);
  // askvandrarna reser sig ur askan efter tre sekunder
  for (const e of ents) if (e.v22ash && !e.dead && !e.dying) { e.v22ash.t -= dt; e.ghost = 0.55;
    if (e.v22ash.t <= 0) { e.v22ash = null; e.ghost = 0; e.hp = e.maxHp * 0.6; e.stun = 0; play('ash_reform', 0.9, 1, { x: e.x, y: e.y }); spawnPuff(e.x, e.y, 8); spawnText(e.x, e.y, 'RESER SIG', '#c0b0a0'); } }
  // kedjade själar gungar och jämrar
  for (const pr of props) if (pr.ch === 'ɲ') { if (!settings.reduceMotion) pr.off = Math.sin(tmr * 1.1 + pr.ph) * 0.04; if (Math.hypot(pr.x - P.x, pr.y - P.y) < 5 && Math.random() < dt * 0.08) play('chained_soul', 0.35, rnd(0.85, 1.1), { x: pr.x, y: pr.y }); }
  // skärselden: askregn
  if (lvl && lvl.biome === 'purgatory' && !settings.lowfx && Math.random() < dt * 12) { const a = rnd(0, TAU), r = rnd(0.5, 6), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r; if (!solid(x, y) && (!cellSky || cellSky[(y | 0) * mw + (x | 0)])) particles.push({ x, y, z: rnd(1, 1.6), vx: rnd(-0.2, 0.2), vy: rnd(-0.2, 0.2), vz: -0.35, life: 3, maxLife: 3, img: (fx.parts.ash2 || fx.parts.ash) ? (fx.parts.ash2 || fx.parts.ash)[0] : fx.hit[1], size: 0.03, fade: true, tint: (fx.parts.ash2 || fx.parts.ash) ? null : [120, 110, 105] }); }
}
function v22Light(fl) {
  for (const r of v22runes) if (!r.used || r.glow > 0) fl(r.x + 0.5, r.y + 0.5, r.glow > 0 ? 1.2 * r.glow + 0.3 : 0.18, r.glow > 0 ? 3 : 1, [200, 60, 255]);
  const n = settings.lowfx ? 24 : 70; for (let i = 0; i < v22streamCells.length && i < n * 2; i += 2) { const [x, y] = v22streamCells[i]; fl(x + 0.5, y + 0.5, 0.4, 2, [255, 110, 40]); } // eldfloderna glöder (var annan ruta, med tak)
  for (const l of v22lobs) if (l.friendly) { const k = l.t / l.T; fl(l.x0 + (l.tx - l.x0) * k, l.y0 + (l.ty - l.y0) * k, 0.5, 2, [255, 200, 80]); }
  for (const p of v22pillars) fl(p.x, p.y, 0.9, 3, [255, 120, 40]);
}
function tridentStab(wp) { // treudden: en lång stöt som går igenom två fiender
  if (WS.cd > 0 || WS.state !== 'idle') return;
  if (v22spear) { bash(); return; } // treudden är kastad: knytnäven
  WS.shot = 0; WS.cd = effDelay(wp) * (up('tr_fast') ? 0.7 : 1); WS.kick = 0.6; lvlStat.shots++; noise(1.5);
  play('trident_stab', 0.7, rnd(0.92, 1.08));
  setTimeout(() => { if (state !== 'play' || !WEAPONS[P.weapon].trident || v22spear) return; tridentHit(wp); }, 110);
}
function tridentHit(wp) {
  const reach = 2.2 + (up('tr_reach') ? 0.8 : 0), dx = Math.cos(P.a), dy = Math.sin(P.a), list = [];
  for (const e of ents) { if (e.dead || e.dying || e.hidden || e.dormant) continue; const rx = e.x - P.x, ry = e.y - P.y, along = rx * dx + ry * dy, perp = Math.abs(rx * dy - ry * dx), sz = e.d.size * (e.boss ? 1.8 : 1);
    if (along > -0.2 && along < reach + sz * 0.3 && perp < 0.4 + sz * 0.25) list.push([along, e]); }
  list.sort((a, b) => a[0] - b[0]); let hit = false;
  for (const [, e] of list.slice(0, up('tr_pierce') ? 3 : 2)) { const crit = Math.random() < mod('critChance'), dmg = wp.dmg * meleeMul() * (1 + mod('tridentDmg')) * (crit ? 2 + mod('critDmg') : 1); const k = hurtEnemy(e, dmg, e.x, e.y, { melee: true, crit }); hitKill = hitKill || k; hit = true; if (crit) hitCrit = true; }
  breakProps(P.x + dx * 1.2, P.y + dy * 1.2, 0.7);
  if (hit) { hitStop = Math.max(hitStop, 0.04); hitMark = 0.12; lvlStat.hits++; }
  return hit;
}
function tridentThrow(wp) {
  const sp = 13; v22spear = { x: P.x + Math.cos(P.a) * 0.4, y: P.y + Math.sin(P.a) * 0.4, vx: Math.cos(P.a) * sp, vy: Math.sin(P.a) * sp, t: 0, out: up('tr_return') ? 0.4 : 0.6, back: false, hit: new Set() };
  WS.cd = 0.3; play('trident_throw', 0.9, 1); stat('tridentThrows'); firstHint('tridentthrow', 'TREUDDEN KOMMER TILLBAKA – UNDER TIDEN SLÅSS DU MED NÄVARNA.');
}
function brimstoneLob(wp) { // svavelmortern: ett brinnande klot i båge
  if (WS.cd > 0 || WS.state !== 'idle') return;
  if (P.mags[P.weapon] <= 0) { if (P.ammo.brimstone > 0) startReload(); else play('click', 0.5, 0.8); return; }
  WS.shot = 0; WS.cd = effDelay(wp) * (up('bs_fast') ? 0.65 : 1); WS.kick = 0.8; lvlStat.shots++; run.shots = (run.shots || 0) + 1; P.flash = settings.noFlash ? 0 : 0.05;
  if (Math.random() >= mod('ammoSave')) P.mags[P.weapon]--;
  play('brimstone_fire', 0.9, rnd(0.95, 1.05)); noise(3);
  const dmg = v22BrimDmg(), n = up('bs_triple') ? 3 : 1;
  let aim = 9; for (const e of ents) { if (e.dead || e.dying || e.hidden || e.dormant) continue; const rx = e.x - P.x, ry = e.y - P.y, al = rx * Math.cos(P.a) + ry * Math.sin(P.a); if (al > 1.2 && al < aim && Math.abs(rx * Math.sin(P.a) - ry * Math.cos(P.a)) < 0.9) aim = al; } // klotet landar vid fienden i siktet
  for (let i = 0; i < n; i++) { const a = P.a + (n > 1 ? (i - 1) * 0.22 : 0), L = Math.max(1.2, Math.min(aim, cast(P.x, P.y, Math.cos(a), Math.sin(a), 10).dist - 0.4)); v22Lob(P, P.x + Math.cos(a) * L, P.y + Math.sin(a) * L, { friendly: true, dmg: dmg * (n > 1 ? 0.7 : 1) }); }
  if (P.mags[P.weapon] <= 0 && P.ammo.brimstone > 0) setTimeout(() => { if (state === 'play' && WEAPONS[P.weapon].brimstone) startReload(); }, 400);
}
function brimstoneShot(wp) { // högerklick: kort skott rakt fram
  if (P.mags[P.weapon] <= 0) { if (P.ammo.brimstone > 0) startReload(); return; }
  WS.shot = 0; WS.cd = effDelay(wp) * (up('bs_fast') ? 0.65 : 1); WS.kick = 1; lvlStat.shots++; if (Math.random() >= mod('ammoSave')) P.mags[P.weapon]--;
  play('brimstone_fire', 1, 1.25); noise(3);
  v22shots.push({ x: P.x + Math.cos(P.a) * 0.4, y: P.y + Math.sin(P.a) * 0.4, vx: Math.cos(P.a) * 14, vy: Math.sin(P.a) * 14, life: 0.9, dmg: v22BrimDmg() });
}
function weaponV22Tick(wp, dt, trig) {
  if (wp.trident && aimDown && !WS.trAim && !v22spear && state === 'play' && WS.state === 'idle') tridentThrow(wp);
  WS.trAim = aimDown;
  if (wp.brimstone && aimDown && !WS.bsAim && state === 'play' && WS.state === 'idle' && WS.cd <= 0) brimstoneShot(wp);
  WS.bsAim = aimDown;
}
function v22Dmg(e, dmg, opt) {
  if (e.d.ai === 'gladiator' && !opt.boom && !opt.fall && !opt.infight && e.faceA !== undefined && !(e.stun > 0)) { let off = Math.atan2(P.y - e.y, P.x - e.x) - e.faceA; off = Math.atan2(Math.sin(off), Math.cos(off));
    if (Math.abs(off) < 0.9) { dmg *= Math.min(1, 0.25 + mod('shieldBreak')); if ((e.shMsg || 0) < tmr) { e.shMsg = tmr + 0.8; spawnText(e.x, e.y, 'SKÖLD', '#d0c0a0'); sparks(e.x, e.y, 0.5, 2); play('gladiator_block', 0.8, rnd(0.9, 1.1), { x: e.x, y: e.y }); } } }
  if (e.d.ai === 'ashwalker' && !e.v22reformed && !opt.boom && !(e.burn > 0) && dmg >= e.hp) { // går sönder i aska – och reser sig igen en gång
    e.v22reformed = true; e.v22ash = { t: 3 }; e.stun = Math.max(e.stun || 0, 3); e.hp = 1; spawnPuff(e.x, e.y, 10); play('ash_reform', 0.6, 0.8, { x: e.x, y: e.y }); firstHint('ashwalker', 'ASKVANDRAREN RESER SIG IGEN – SPRÄNG ELLER BRÄNN DEN.'); return 0; }
  return dmg;
}
function v22LostsoulBoom(e) {
  if (e.v22boom) return; e.v22boom = true; play('lostsoul_boom', 1, rnd(0.9, 1.1), { x: e.x, y: e.y }); explodeFx(e.x, e.y, 0.5); if (!settings.noFlash) flashes.push({ x: e.x, y: e.y, t: 0.25, r: 3, col: [255, 120, 40] });
  if (Math.hypot(P.x - e.x, P.y - e.y) < 1.6) { run.cause = e.d.name; hurtPlayer(e.d.dmg, e.x, e.y, 'proj'); P.burnFx = Math.max(P.burnFx || 0, 0.6); }
  hurtEnemy(e, 9999, e.x, e.y, { noProc: true, quiet: true });
}
function v22Kill(e) {
  if (e.boss) { v22ClearTemp(); v22pillars = []; v22steamForce = 0; }
  if (e.d.ai === 'moldcrawler') { v22spores.push({ x: e.x, y: e.y, t: 5 }); play('mold_spore_burst', 0.9, rnd(0.9, 1.1), { x: e.x, y: e.y }); firstHint('moldspores', 'MÖGELKRYPARNA LÄMNAR GIFTIGA SPORER NÄR DE DÖR.'); }
  if (e.d.ai === 'lostsoul' && !e.v22boom) { e.v22boom = true; play('lostsoul_boom', 0.7, 1.2, { x: e.x, y: e.y }); }
}
function v22Map(s, ox, oy, inside) { for (const r of v22runes) if (!r.used && inside(r.x, r.y) && seen[r.y * mw + r.x]) { ctx.fillStyle = '#a040ff'; ctx.fillRect(ox + r.x * s, oy + r.y * s, s, s); } }
function drawV22Hud(g) {
  if (P.v22hotT > 0) { g.fillStyle = `rgba(255,120,60,${0.08 + (settings.noFlash ? 0 : 0.03 * Math.sin(tmr * 4))})`; g.fillRect(0, 0, W, VH); }
  if (v22steamK > 0.01) { g.fillStyle = `rgba(225,230,235,${0.28 * v22steamK})`; g.fillRect(0, 0, W, VH); }
  if (v22spear && WEAPONS[P.weapon].trident) { const t = 'TREUDDEN ÄR KASTAD'; txt(t, Math.round((W - textW(t)) / 2), HORIZON + 26, '#a0d0ff', 1, true, 0.7); }
}
function drawV22World(list) {
  for (const l of v22lobs) { const k = l.t / l.T; list.push({ x: l.x0 + (l.tx - l.x0) * k, y: l.y0 + (l.ty - l.y0) * k, k: 'v22', t: 'lob', o: l, z: 0.45 + 2.0 * 4 * k * (1 - k) }); if (!l.friendly) list.push({ x: l.tx, y: l.ty, k: 'v22', t: 'ring', o: l }); }
  for (const s of v22shots) list.push({ x: s.x, y: s.y, k: 'v22', t: 'shot', o: s });
  if (v22spear) list.push({ x: v22spear.x, y: v22spear.y, k: 'v22', t: 'spear', o: v22spear });
  for (const p of v22pillars) list.push({ x: p.x, y: p.y, k: 'v22', t: 'pillar', o: p });
}
function drawV22Sprite(s) {
  const o = s.o, brim = fx.parts.brimstone;
  if (s.t === 'lob') { if (o.friendly) drawSprite(brim ? brim[Math.floor(tmr * 10) % brim.length] : fx.fireball[Math.floor(tmr * 16) % 8], s.x, s.y, brim ? 0.22 : 0.3, s.z - 0.1, false, 2, 0, 0.5, true, brim ? null : [255, 210, 80]); else drawSprite(fx.hit[1], s.x, s.y, 0.25, s.z - 0.1, false, 1.6, 0, 0.5, true, [170, 220, 255]); return true; }
  if (s.t === 'ring') { const k = o.t / o.T, n = 10; for (let i = 0; i < n; i++) { const a = i / n * TAU + tmr; drawSprite(fx.hit[1], o.tx + Math.cos(a) * 0.9, o.ty + Math.sin(a) * 0.9, 0.07, 0.01, false, 1.4, 0, 0, true, k > 0.7 ? [255, 160, 120] : [150, 200, 255]); } return true; }
  if (s.t === 'shot') { drawSprite(brim ? brim[0] : fx.fireball[4], s.x, s.y, 0.2, 0.45, false, 2, 0, 0.5, true, brim ? null : [255, 200, 80]); return true; }
  if (s.t === 'spear') { drawSprite(spr.pick_trident || fx.hit[0], s.x, s.y, 0.45, 0.45, Math.floor(tmr * 14) % 2 === 0, null, 0, 0.6); return true; }
  if (s.t === 'pillar') { drawSprite(fx.fireball[Math.floor(tmr * 16) % 8], s.x, s.y, 1.1, 0, false, 2.2, 0, 0, true, [255, 120, 40]); return true; }
  return false;
}
function v22ImpProj(p, dt) { // eldimpens eldklot: bränner en kort stund
  if (infightHit(p)) return;
  if (Math.hypot(p.x - P.x, p.y - P.y) < 0.38) { p.dead = true; run.cause = p.cause || run.cause; hurtPlayer(p.dmg, p.src.x, p.src.y, 'proj'); const t = 1.2 * clamp(1 - mod('burnResist'), 0, 1); if (t > 0.05) P.v21burn = Math.max(P.v21burn || 0, t); return; }
  if (solid(p.x, p.y) || p.life <= 0) { p.dead = true; sparks(p.x, p.y, 0.4, 3); }
}
Object.assign(PROJ_UPD_V8, { eimpball: v22ImpProj });
Object.assign(PROJ_DRAW_V8, { eimpball: o => drawSprite(fx.fireball[Math.floor(tmr * 16) % 8], o.x, o.y, 0.3, o.z - 0.12, false, 2.2, 0, 0, true, [255, 140, 40]) });

