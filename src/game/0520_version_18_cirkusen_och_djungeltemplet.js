// ---------- Version 18: cirkusen och djungeltemplet – fallluckor, strålkastare, pirayor, lianer och rekvisitan ----------
let v18doors = [], v18clock = 0, v18acc = 0, v18darts = 0, v18beams = [];
function setupV18() {
  v18doors = []; v18clock = 0; v18acc = 0; v18darts = 0; v18beams = [];
  P.v18safe = { x: P.x, y: P.y }; P.spotT = 0; P.pirT = 0; P.vineT = 0;
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (map[y][x] === 'Ǳ') v18doors.push({ x, y, ph: ((x * 7 + y * 13) % 12) / 2, open: false, floor: cellFloor[y * mw + x] });
  let lit = 0;
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (map[y][x] === 'ǲ' && (x + y) % 3 === 0 && lit++ < 12) { const t = { x: x + 0.5, y: y + 0.5, ph: 0, cells: [], hidden: true, str: 0.32, r: 2.2 }; torchCells(t); torches.push(t); } // strålkastarens ljuskägla
  for (const pr of props) { if (pr.ch === 'ǳ') { pr.knT = rnd(0.5, 2); pr.rot = 0; pr.whp = 40; } if (pr.ch === 'ȅ') pr.dartT = 0; if (pr.ch === 'Ȇ') pr.gasT = 0; if (pr.ch === 'Ǵ') pr.spins = 0; }
  // tak: högst två lejon, två jaguarer och två tempelväktare per bana
  const rm = new Set(); for (const [t, max] of [['ǻ', 2], ['ȋ', 2], ['ȍ', 2]]) for (const e of ents.filter(o => o.type === t && !o.minion).slice(max)) rm.add(e);
  if (rm.size) { ents = ents.filter(e => !rm.has(e)); totalEnemies -= rm.size; }
}
function torchCells(t) { // samma ljus som prepareTorchLight, för en ny ljuskälla
  for (let y = Math.max(0, (t.y | 0) - 4); y < Math.min(mh, (t.y | 0) + 5); y++) for (let x = Math.max(0, (t.x | 0) - 4); x < Math.min(mw, (t.x | 0) + 5); x++) {
    const d = Math.hypot(x + 0.5 - t.x, y + 0.5 - t.y); if (d > t.r || isWallChar(map[y][x]) || !hasLOS(t.x, t.y, x + 0.5, y + 0.5)) continue;
    t.cells.push([y * mw + x, Math.pow(1 - d / t.r, 1.5) * t.str]);
  }
}
const canFall = e => !e.dead && !e.boss && !e.d.float && e.d.ai !== 'fly' && e.d.ai !== 'wisp' && !e.hidden && !e.dormant && !e.dummy;
function doorState(d) { // fallluckan: 'shut', 'warn' eller 'open'
  const warn = Math.max(0.2, 0.5 * (1 + mod('trapdoorSense')));
  if (d.temp) { const t = v18clock - d.t0; return t < d.warn ? 'warn' : t < d.warn + 1.5 ? 'open' : 'done'; }
  const t = (v18clock + d.ph) % 6; return t >= 4.5 ? 'open' : t >= 4.5 - warn ? 'warn' : 'shut';
}
function updateV18(dt) {
  const c = cellUnder(), ground = P.jz < 0.15;
  v18clock += dt; v18acc += dt; const tick = v18acc >= 0.5; if (tick) v18acc = 0;
  // fallluckorna
  const onDoor = v18doors.find(d => (P.x | 0) === d.x && (P.y | 0) === d.y);
  if (!onDoor && ground && !solid(P.x, P.y) && c !== '·') { P.v18safe.x = P.x; P.v18safe.y = P.y; }
  for (const d of v18doors) {
    const st = doorState(d), was = d.st; d.st = st;
    if (st === 'done') { d.dead = true; cellFloor[d.y * mw + d.x] = d.floor; continue; }
    if (st === 'warn' && !settings.lowfx && Math.random() < dt * 8 && Math.hypot(d.x - P.x, d.y - P.y) < 12) particles.push({ x: d.x + rnd(0.1, 0.9), y: d.y + rnd(0.1, 0.9), z: 0.02, vx: 0, vy: 0, vz: 0.6, life: 0.4, maxLife: 0.4, img: fx.parts.dust ? fx.parts.dust[0] : fx.hit[1], size: 0.05, grav: true, tint: [200, 170, 120] });
    if (st === 'open' && was !== 'open') { if (animTex.pit !== undefined) cellFloor[d.y * mw + d.x] = animTex.pit; if (Math.hypot(d.x - P.x, d.y - P.y) < 9) play('trapdoor', 0.9, rnd(0.9, 1.1), { x: d.x + 0.5, y: d.y + 0.5 }); }
    if (st !== 'open' && was === 'open') cellFloor[d.y * mw + d.x] = d.floor;
    if (st !== 'open') continue;
    if (d === onDoor && ground) trapdoorFall();
    for (const e of ents) if (canFall(e) && (e.x | 0) === d.x && (e.y | 0) === d.y) { e.fellT = tmr; hurtEnemy(e, 99999, e.x, e.y, { noProc: true, fall: true }); if (e.dead) { spawnText(e.x, e.y, 'NED I LUCKAN!', '#ffd24a'); e.gibbed = true; } }
  }
  if (v18doors.some(d => d.dead)) v18doors = v18doors.filter(d => !d.dead);
  // strålkastaren: i rampljuset
  if (c === 'ǲ' && ground) {
    if (!(P.spotT > 0)) { play('spotlight_on', 0.6); firstHint('spotlight', 'I RAMPLJUSET GÖR DU MER SKADA – MEN ALLA PÅ VÅNINGEN VET VAR DU ÄR.'); }
    P.spotT = 0.3;
    for (const e of ents) if (!e.dead && !e.boss && !e.dormant && !e.dummy && !e.ally) { e.alert = true; e.sleep = false; e.lx = P.x; e.ly = P.y; e.lostT = 0; }
  } else P.spotT = Math.max(0, (P.spotT || 0) - dt);
  // pirayavatten
  if (c === 'Ȃ' && ground && !P.swim) { P.pirT = 0.3; P.pirAcc = (P.pirAcc || 0) + dt; if (P.pirAcc >= 0.5) { P.pirAcc = 0; run.cause = 'PIRAYORNA'; hurtPlayer(3 * trapMul()); play('piranha', 0.5, rnd(0.9, 1.15)); splash(P.x + Math.cos(P.a) * 0.4, P.y + Math.sin(P.a) * 0.4); firstHint('piranha', 'PIRAYORNA BITER – GÅ UR VATTNET ELLER HOPPA ÖVER.'); } }
  else { P.pirT = Math.max(0, (P.pirT || 0) - dt); P.pirAcc = 0.4; }
  if (tick) for (const e of ents) if (canFall(e) && e.d.ai !== 'eel' && cellAt(e.x, e.y) === 'Ȃ') { hurtEnemy(e, 3, e.x, e.y, { noProc: true, quiet: true }); if (Math.random() < 0.3) splash(e.x, e.y); }
  // lianer
  if (c === 'ȃ' && ground) { if (!(P.vineT > 0) || (P.vineSndT || 0) < tmr) { P.vineSndT = tmr + 0.8; if (Math.hypot(P.vx, P.vy) > 0.5) play('vine_rustle', 0.35, rnd(0.9, 1.1)); } P.vineT = 0.25; firstHint('vines', 'LIANERNA SAKTAR NED – BRÄNN BORT DEM MED ELD.'); } else P.vineT = Math.max(0, (P.vineT || 0) - dt);
  // rekvisitan
  for (const pr of props) {
    if (pr.broken || !pr.def) continue;
    if (pr.ch === 'ǳ') { pr.knT -= dt; if (pr.knT <= 0 && Math.hypot(pr.x - P.x, pr.y - P.y) < 14) { pr.knT = 2; for (let k = 0; k < 4; k++) v18Shoot({ x: pr.x, y: pr.y, r: 0.8 }, pr.rot + k * Math.PI / 2, 7, 6, 'eknife', { cause: 'KNIVKASTARHJULET' }); pr.rot += Math.PI / 4; play('knifewheel', 0.6, rnd(0.95, 1.05), { x: pr.x, y: pr.y }); } }
    else if (pr.ch === 'ȅ') { pr.dartT -= dt; const dx = P.x - pr.x, dy = P.y - pr.y; if (pr.dartT <= 0 && (Math.abs(dx) < 0.45 || Math.abs(dy) < 0.45) && Math.hypot(dx, dy) < 8 && Math.hypot(dx, dy) > 0.6 && hasLOS(pr.x, pr.y, P.x, P.y)) { pr.dartT = 1.5; v18darts++; pr.fireUntil = tmr + 0.3; const a = Math.abs(dx) < 0.45 ? (dy > 0 ? Math.PI / 2 : -Math.PI / 2) : (dx > 0 ? 0 : Math.PI); v18Shoot({ x: pr.x, y: pr.y, r: 0.8 }, a, 11, 5, 'edart', { cause: 'PILIDOLEN', z: 0.55 }); play('dart_trap', 0.7, 1, { x: pr.x, y: pr.y }); firstHint('dartidol', 'PILIDOLEN SKJUTER NÄR DU STÅR I LINJE MED DEN – GÅ SNETT.'); } }
    else if (pr.ch === 'Ȇ') { pr.gasT -= dt; if (pr.gasT <= 0 && Math.hypot(pr.x - P.x, pr.y - P.y) < 1.5) { pr.gasT = 5; pr.fireUntil = tmr + 0.6; v17clouds.push({ x: pr.x, y: pr.y, kind: 'poison', r: 1.7, t: 3, acc: 0.4 }); play('gas', 0.6, 1.2, { x: pr.x, y: pr.y }); firstHint('poisonflower', 'GIFTBLOMMAN SPRUTAR GIFT NÄR DU KOMMER NÄRA.'); } }
    else if (pr.ch === 'Ǵ' && pr.spinRes && pr.spinRes < tmr) { pr.spinRes = 0; prizeResult(pr); }
    else if (pr.def.balloon) { for (const p of projectiles) if (p.friendly && !p.dead && Math.hypot(p.x - pr.x, p.y - pr.y) < 0.4) { popBalloons(pr); if (p.kind !== 'pchain') p.dead = true; break; } }
  }
  // marionetter som ligger hopfallna reser sig efter 3 s, även när de inte ser dig
  for (const e of ents) if (e.dead) continue; else if (e.d.ai === 'jaguar' && !e.alert) e.ghost = Math.hypot(e.x - P.x, e.y - P.y) > 5 ? 0.93 : 0; else if (e.d.ai === 'blowgunner' && !e.alert) e.ghost = 0.88; // gömda även innan de upptäckt dig
  for (const e of ents) if (e.downT > 0 && !e.dead) { e.downT -= dt; e.state = 'pain'; e.t = 0; e.poison = 0; e.burn = 0; e.bleed = 0; if (e.downT <= 0) { e.downT = 0; e.risen = true; e.hp = e.maxHp * 0.5; e.state = 'move'; e.alert = true; spawnText(e.x, e.y, 'RESER SIG!', '#e0c0ff'); play('marionette', 0.7, 0.8, { x: e.x, y: e.y }); spawnPuff(e.x, e.y, 6); } }
  // tempelväktarnas strålar
  for (const b of v18beams) b.t -= dt; v18beams = v18beams.filter(b => b.t > 0);
  if (P.poisonT > 0 && mod('poisonResist') > 0) P.poisonT = Math.max(0, P.poisonT - dt * mod('poisonResist')); // giftskyddet: giftet går ur fortare
}
function trapdoorFall() {
  const k = Math.max(0, 1 - mod('trapdoorSense'));
  run.cause = 'FALLUCKAN'; hurtPlayer(10 * k * trapMul()); say('DU FÖLL GENOM LUCKAN!', 1.5); P.shake = Math.max(P.shake, 1.2); play('trapdoor', 1.3, 0.8);
  P.x = P.v18safe.x; P.y = P.v18safe.y; P.vx = P.vy = 0;
  if (solid(P.x, P.y) || v18doors.some(d => (P.x | 0) === d.x && (P.y | 0) === d.y)) { const s = randomFreeCell(RNG(Date.now())); if (s) [P.x, P.y] = s; }
  firstHint('trapdoor', 'FALLUCKORNA SKAKAR INNAN DE ÖPPNAS – KLIV AV I TID.');
}
const v18Slow = () => (P.pirT > 0 ? 0.7 : 1) * (P.vineT > 0 ? clamp(0.6 + 0.4 * mod('vineWalk'), 0.6, 1) : 1);
function popBalloons(pr) { pr.broken = true; stat('balloons'); balloonPop(pr.x, pr.y, true); styleAdd(3, '+BALLONG'); }
function v18HitProp(pr, hx, hy, dmg) {
  if (pr.def.balloon) { popBalloons(pr); return true; }
  if (pr.ch === 'ǳ') { pr.flashT = tmr + 0.06; spawnSpark(hx, hy); play('ricochet', 0.3, rnd(1.2, 1.6), { x: hx, y: hy }); pr.whp = (pr.whp ?? 40) - (dmg || 6); if (pr.whp <= 0) { pr.broken = true; map[pr.cy][pr.cx] = '.'; flowCell = -1; play('pot', 0.8, 0.6, { x: pr.x, y: pr.y }); sparks(pr.x, pr.y, 0.6, 10); say('KNIVHJULET GÅR SÖNDER', 1.2); for (let i = 0; i < 6; i++) particles.push({ x: pr.x, y: pr.y, z: 0.5, vx: rnd(-1.5, 1.5), vy: rnd(-1.5, 1.5), vz: rnd(0.5, 2), life: 1, img: fx.crateBits ? fx.crateBits[i % 4] : fx.shards[i % 6], size: 0.12, grav: true, bounce: true }); } return false; }
  return undefined;
}
function prizeResult(pr) {
  const r = Math.random() * (1 + mod('idolLuck') * 0.5);
  if (r < 0.2) { const e = makeEnemy(ENEMY_DEFS['Ƿ'] ? 'Ƿ' : 'S', P.x + Math.cos(P.a + Math.PI) * 1.4, P.y + Math.sin(P.a + Math.PI) * 1.4); if (!freeSpot(e.x, e.y, 0.3)) { const s = freeSpotFar(2, 4); if (s) { e.x = s[0]; e.y = s[1]; } } e.alert = true; ents.push(e); totalEnemies++; spawnPuff(e.x, e.y, 8); play('honk', 0.45); say('SKÄMT! EN CLOWN HOPPAR FRAM', 2); return; }
  if (r < 0.45) { run.gold += 30; say('LYCKOHJULET: GULDET TREDUBBLAS! +30 GULD', 2); play('coin', 0.9, 1.1); for (let i = 0; i < 4; i++) dropItem('gold', pr.x, pr.y); return; }
  if (r < 0.65) { dropItem('potion', (pr.x + P.x) / 2, (pr.y + P.y) / 2); say('LYCKOHJULET: EN DRYCK', 2); return; }
  if (r < 0.85) { dropItem('ammo', (pr.x + P.x) / 2, (pr.y + P.y) / 2); dropItem('ammo', (pr.x + P.x) / 2, (pr.y + P.y) / 2); say('LYCKOHJULET: AMMO', 2); return; }
  items.push({ type: 'cardpick', x: (pr.x + P.x) / 2, y: (pr.y + P.y) / 2, taken: false, drop: true, luck: 0.6, title: 'LYCKOHJULETS KORT' }); say('LYCKOHJULET: ETT KORT!', 2); play('secret', 0.6, 1.3);
}
Object.assign(USES, {
  prizewheel(pr) { // 10 guld: en slumpad belöning eller ett skämt, högst tre snurr
    if (pr.spinRes) return;
    if ((pr.spins || 0) >= 3) { pr.used = true; say('LYCKOHJULET HAR SNURRAT FÄRDIGT', 1.2); return; }
    if (run.gold < 10) { say('LYCKOHJULET KOSTAR 10 GULD', 1.5); play('click', 0.5, 0.8); return; }
    run.gold -= 10; pr.spins = (pr.spins || 0) + 1; if (pr.spins >= 3) pr.used = true; pr.spinUntil = tmr + 2.1; pr.spinRes = tmr + 2.1; stat('prizeSpins');
    play('prizewheel', 0.8, 1, { x: pr.x, y: pr.y }); say('HJULET SNURRAR...', 1);
  },
  goldidol(pr) { // ta idolen: guld – och ett bakhåll
    pr.used = true; // sockeln står kvar utan idol (ruta 2)
    const g = Math.round(40 * (1 + mod('idolLuck'))); run.gold += g; spawnText(pr.x, pr.y, `+${g} G`, '#ffd24a'); play('idol_take', 0.9); play('coin', 0.8, 0.9); stat('idols');
    say('DU TOG GULDIDOLEN – ETT BAKHÅLL!', 2); P.shake = Math.max(P.shake, 1);
    let pool = [...new Set(ents.filter(e => !e.boss && !e.minion && !e.dormant && ENEMY_DEFS[e.type] && !['templeguardian', 'eel', 'worm', 'mimic', 'tentacle'].includes(e.d.ai)).map(e => e.type))];
    if (!pool.length) pool = ['Ȉ', 'Ȋ', 'ȉ'].filter(t => ENEMY_DEFS[t] && enemyFrames[t]); if (!pool.length) pool = ['S'];
    const n = Math.max(2, 3 + ((Math.random() * 3) | 0) - Math.round(mod('idolLuck') * 2));
    for (let i = 0; i < n; i++) { const a = rnd(0, TAU), r = rnd(2.2, 4); let x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r; if (!freeSpot(x, y, 0.3)) { const s = freeSpotFar(2, 5); if (!s) continue; [x, y] = s; } const e = makeEnemy(pool[i % pool.length], x, y); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(x, y, 6); }
    if (lvl.boulders) { const b = lvl.boulders.filter(b => !b.done).sort((u, v) => Math.hypot(u.tx - P.x, u.ty - P.y) - Math.hypot(v.tx - P.x, v.ty - P.y))[0]; if (b && Math.hypot(b.tx - P.x, b.ty - P.y) < 14) { b.done = true; const dx = Math.sign(b.tx - b.sx), dy = Math.sign(b.ty - b.sy); boulders.push({ x: b.sx + 0.5, y: b.sy + 0.5, vx: dx * 5.2, vy: dy * 5.2, t: 0, snd: play('boulder_roll', 0.8, 1, { loop: true }) }); say('ETT STENBLOCK RULLAR – SPRING!', 2); } }
    firstHint('goldidol', 'GULDIDOLEN UTLÖSER ETT BAKHÅLL – TA DEN NÄR DU ÄR REDO.');
  },
});
Object.assign(USE_NAME, { prizewheel: 'SNURRA LYCKOHJULET (10 GULD)', goldidol: 'TA GULDIDOLEN' });

// ---------- Version 18: cirkusens och djungelns invånare ----------
function v18Leap(e, dt, dist, los, o) { // lejonet och jaguaren: tar sats och flyger genom luften
  if (e.leap) { const L = e.leap; L.t += dt;
    if (L.t < L.wind) { e.state = 'idle'; e.mvx = e.mvy = 0; return true; }
    const sp = o.sp * dt, ox = e.x, oy = e.y; tryMove(e, Math.cos(L.a) * sp, Math.sin(L.a) * sp, 0.28); e.mvx = e.x - ox; e.mvy = e.y - oy; e.state = 'attack'; e.t = Math.min(e.t, 0.2);
    if (!L.hit && Math.hypot(P.x - e.x, P.y - e.y) < 0.95) { L.hit = true; run.cause = e.d.name; hurtPlayer(e.d.dmg * 1.2 * (1 + 0.1 * (run.depth - 1)), e.x, e.y, 'melee'); play(e.d.growl, (e.d.growlVol || 0.45) * 1.3, 1.1, { x: e.x, y: e.y }); }
    if (L.t > L.wind + L.dur || Math.hypot(e.mvx, e.mvy) < sp * 0.2) { e.leap = null; e.state = 'move'; e.t = 0; } return true; }
  e.leapCd = (e.leapCd ?? rnd(1, 2.5)) - dt;
  if (e.leapCd <= 0 && los && dist > 2.4 && dist < o.max && e.state !== 'pain') { e.leapCd = rnd(3, 4.5); e.leap = { a: Math.atan2(P.y - e.y, P.x - e.x), t: 0, wind: 0.35, dur: Math.min(o.dur, dist / o.sp + 0.15), hit: false }; play(e.d.growl, (e.d.growlVol || 0.45) * 1.1, 0.9, { x: e.x, y: e.y }); return true; }
  return false;
}
const AI_V18 = {
  clown(e) { if (e.state === 'attack' && !e.honked) { e.honked = true; play('honk', 0.28, rnd(0.9, 1.2), { x: e.x, y: e.y }); } if (e.state !== 'attack') e.honked = false; return false; },
  juggler(e, dt, dist, los) { // tre käglor i en båge som studsar en gång
    e.cd = 99; e.throwT = (e.throwT ?? rnd(1.2, 2.5)) - dt;
    if (e.state === 'attack') { if (e.t > 0.6) { e.state = 'move'; e.t = 0; } return true; }
    if (e.throwT <= 0 && los && dist < 10 && e.state !== 'pain') { e.throwT = rnd(2.4, 3.2); e.state = 'attack'; e.t = 0; e.didHit = true; const a = Math.atan2(P.y - e.y, P.x - e.x); for (let i = -1; i <= 1; i++) v18Shoot(e, a + i * 0.22, 6.5, e.d.dmg, 'epin', { bounces: 1, life: 4 }); play('pin_throw', 0.6, 1.1, { x: e.x, y: e.y }); firstHint('juggler', 'JONGLÖRENS KÄGLOR STUDSAR EN GÅNG MOT VÄGGEN – SE UPP FÖR RETURER.'); return true; }
    return false;
  },
  stiltwalker(e, dt, dist) { // faller omkull när benen träffas, sparkar hårt
    if (e.fallT > 0) { e.fallT -= dt; e.state = 'pain'; e.t = 0; e.mvx = e.mvy = 0; return true; }
    if (e.state === 'attack' && e.didHit && !e.kicked && dist < e.d.range + 0.4) { e.kicked = true; const a = Math.atan2(P.y - e.y, P.x - e.x); for (let i = 0; i < 6; i++) tryMove(P, Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0.24); P.shake = Math.max(P.shake, 1.2); }
    if (e.state !== 'attack') e.kicked = false;
    return false;
  },
  knifethrower(e, dt, dist, los) { // tre knivar i solfjäder
    e.cd = 99; e.throwT = (e.throwT ?? rnd(1.2, 2.5)) - dt;
    if (e.state === 'attack') { if (e.t > 0.5) { e.state = 'move'; e.t = 0; } return true; }
    if (e.throwT <= 0 && los && dist < 11 && e.state !== 'pain') { e.throwT = rnd(2.2, 3); e.state = 'attack'; e.t = 0; e.didHit = true; const a = Math.atan2(P.y - e.y, P.x - e.x); for (let i = -1; i <= 1; i++) v18Shoot(e, a + i * 0.16, 9, e.d.dmg, 'eknife', { life: 2.5 }); play('knifethrower', 0.5, 1.2, { x: e.x, y: e.y }); return true; }
    return false;
  },
  lion(e, dt, dist, los) { return v18Leap(e, dt, dist, los, { sp: 9, max: 7.5, dur: 0.75 }); },
  marionette(e, dt) { // ligger hopfallen och reser sig en gång
    if (e.downT > 0) { e.state = 'pain'; e.t = 0; e.mvx = e.mvy = 0; return true; } // ligger hopfallen (nedräkningen sker i updateV18)
    e.hopT = (e.hopT ?? rnd(0.5, 1)) - dt; if (e.hopT <= 0 && e.state === 'move') { e.hopT = rnd(0.7, 1.1); const a = Math.atan2(P.y - e.y, P.x - e.x); for (let i = 0; i < 4; i++) tryMove(e, Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.28); } // rycker fram i trådarna
    return false;
  },
  lizardman(e, dt) { const want = Math.atan2(P.y - e.y, P.x - e.x); let d = want - (e.faceA ?? want); d = Math.atan2(Math.sin(d), Math.cos(d)); e.faceA = (e.faceA ?? want) + clamp(d, -2.4 * dt, 2.4 * dt); return false; },
  blowgunner(e, dt, dist, los) { // gömmer sig tills den skjuter
    e.cd = 99; e.ghost = (e.seenT || 0) > tmr || e.state === 'pain' ? 0 : 0.88; e.shootT = (e.shootT ?? rnd(1.5, 3)) - dt;
    if (e.state === 'attack') { if (e.t > 0.5) { e.state = 'move'; e.t = 0; } return true; }
    if (e.shootT <= 0 && los && dist < 11 && e.state !== 'pain') { e.shootT = rnd(2.6, 3.6); e.state = 'attack'; e.t = 0; e.didHit = true; e.seenT = tmr + 1.3; v18Shoot(e, Math.atan2(P.y - e.y, P.x - e.x) + rnd(-0.03, 0.03), 12, e.d.dmg, 'edart', { life: 2 }); play('blowgun_fire', 0.7, 1, { x: e.x, y: e.y }); firstHint('blowgunner', 'BLÅSRÖRSJÄGAREN SYNS BARA NÄR DEN SKJUTER – GIFTPILARNA KOMMER UR BUSKARNA.'); return true; }
    return false;
  },
  monkey(e, dt, dist) { // stjäl ammo och flyr
    if (e.runT > 0) { e.runT -= dt; const sp = e.d.speed * 1.3 * dt, a = Math.atan2(e.y - P.y, e.x - P.x) + Math.sin(e.t * 4) * 0.5, ox = e.x, oy = e.y; tryMove(e, Math.cos(a) * sp, Math.sin(a) * sp, 0.24); e.mvx = e.x - ox; e.mvy = e.y - oy; e.state = 'move'; return true; }
    if (e.state === 'attack' && e.didHit && !e.stole && dist < e.d.range + 0.4) { const k = WEAPONS[P.weapon].ammo; if (k !== 'none' && k !== 'mana' && P.ammo[k] > 0) { const n = Math.min(5, P.ammo[k]); P.ammo[k] -= n; e.stole = { k, n }; spawnText(P.x + Math.cos(P.a) * 0.8, P.y + Math.sin(P.a) * 0.8, `-${n} ${AMMO[k].name}`, '#ffb060'); play('monkey', 0.35, 1.3, { x: e.x, y: e.y }); play('steal', 0.5); e.runT = 4; firstHint('monkey', 'APAN STJÄL AMMO – DÖDA DEN SÅ FÅR DU TILLBAKA DUBBELT.'); } }
    if (e.state === 'move' && Math.random() < dt * 0.8) { const a = rnd(0, TAU); for (let i = 0; i < 3; i++) tryMove(e, Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0.24); } // hoppar
    return false;
  },
  jaguar(e, dt, dist, los) { e.ghost = dist > 5 && !(e.leap && e.leap.t > e.leap.wind) ? 0.93 : Math.max(0, (e.ghost || 0) - dt * 3); return v18Leap(e, dt, dist, los, { sp: 10, max: 6.5, dur: 0.7 }); },
  mosquito(e, dt, dist) { // suger blod och läker sig
    if (e.state === 'attack' && e.didHit && !e.sucked) { e.sucked = true; if (dist < e.d.range + 0.4) { e.hp = Math.min(e.maxHp, e.hp + 2); spawnText(e.x, e.y, '+2', '#ff6060'); } }
    if (e.state !== 'attack') e.sucked = false;
    if (e.state === 'move') { const a = Math.atan2(P.y - e.y, P.x - e.x) + Math.PI / 2, w = Math.sin(e.t * 9 + e.x * 4) * dt * 2; tryMove(e, Math.cos(a) * w, Math.sin(a) * w, 0.18); }
    return false;
  },
  templeguardian(e, dt, dist, los) { // står still tills du är nära, sedan laserögon
    e.cd = 99; e.mvx = 0; e.mvy = 0;
    if (e.state === 'pain') { if (e.t > 0.35) { e.state = 'idle'; e.t = 0; } else return true; } // träffad: rycker till en stund
    if (!e.woke) { e.state = 'idle'; if (dist < 5 || e.hp < e.maxHp) { e.woke = true; play('templeguardian', 0.8, 0.9, { x: e.x, y: e.y }); spawnPuff(e.x, e.y, 6); } else return true; }
    if (e.beam) { const b = e.beam; b.t += dt; if (!b.snd && b.t >= b.warn - 0.4) { b.snd = true; play('laser_eye', 0.5, 1, { x: e.x, y: e.y }); } e.state = b.t < b.warn ? 'idle' : 'attack'; e.t = Math.min(e.t, 0.3);
      let d = Math.atan2(P.y - e.y, P.x - e.x) - b.a; d = Math.atan2(Math.sin(d), Math.cos(d)); if (b.t > b.warn) b.a += clamp(d, -0.5 * dt, 0.5 * dt);
      const L = cast(e.x, e.y, Math.cos(b.a), Math.sin(b.a), 12).dist; v18beams.push({ x: e.x, y: e.y, a: b.a, L, warn: b.t < b.warn, t: 0.02 });
      if (b.t > b.warn) { b.acc += dt; if (b.acc >= 0.2) { b.acc = 0; const rx = P.x - e.x, ry = P.y - e.y, along = rx * Math.cos(b.a) + ry * Math.sin(b.a), perp = Math.abs(rx * Math.sin(b.a) - ry * Math.cos(b.a)); if (along > 0 && along < L && perp < 0.45) { run.cause = e.d.name; hurtPlayer(e.d.dmg * 0.3 * (1 + 0.08 * (run.depth - 1)), e.x, e.y, 'proj'); } } }
      if (b.t > b.warn + 1) { e.beam = null; e.state = 'idle'; e.t = 0; } return true; }
    e.laserT = (e.laserT ?? rnd(0.8, 1.6)) - dt;
    if (e.laserT <= 0 && los && dist < 9 && e.state !== 'pain') { e.laserT = rnd(2.6, 3.4); e.beam = { t: 0, warn: 0.7, a: Math.atan2(P.y - e.y, P.x - e.x), acc: 0 }; firstHint('templeguardian', 'TEMPELVÄKTARENS ÖGON GLÖDER INNAN STRÅLEN KOMMER – GÅ ÅT SIDAN.'); return true; }
    e.state = 'idle'; return true;
  },
};
function marionetteFall(e, opt) { // marionetten faller ihop första gången
  if (e.d.ai !== 'marionette' || e.risen || e.downT > 0 || opt.fall || opt.boom) return false;
  e.downT = 3; e.downAt = tmr; e.hp = 1; e.state = 'pain'; e.t = 0; e.burn = 0; e.poison = 0; e.leap = null;
  spawnText(e.x, e.y, 'FALLER IHOP', '#d0b0ff'); play('marionette', 0.6, 1.2, { x: e.x, y: e.y }); firstHint('marionette', 'MARIONETTEN RESER SIG IGEN – SKJUT DEN MEDAN DEN LIGGER.');
  return true;
}
function v18Defend(e, dmg, opt) { // innan skadan
  if (e.downT > 0 && e.d.ai === 'marionette' && tmr - (e.downAt || 0) < 0.3) return null; // samma skott (hagel, gift, eld) räknas inte
  if (e.downT > 0 && e.d.ai === 'marionette') { e.risen = true; e.downT = 0; return Math.max(dmg, e.hp + 1); } // skjuten medan den ligger: den reser sig inte
  return dmg;
}
function v18Dmg(e, dmg, opt) {
  if (P.spotT > 0 && !opt.fall && !opt.infight) dmg *= 1.25 + mod('showtime');
  if (e.d.ai === 'lizardman' && !(e.stun > 0) && !opt.fall && !opt.boom && e.faceA !== undefined && !opt.infight) { let off = Math.atan2(P.y - e.y, P.x - e.x) - e.faceA; off = Math.atan2(Math.sin(off), Math.cos(off)); if (Math.abs(off) < 1.0) { dmg *= 0.5; if ((e.shMsg || 0) < tmr) { e.shMsg = tmr + 0.8; spawnText(e.x, e.y, 'SKÖLD', '#c0d0e0'); sparks(e.x, e.y, 0.5, 2); } } }
  if (e.d.ai === 'stiltwalker' && !opt.melee && !opt.fall && !opt.infight && Math.hypot(P.x - e.x, P.y - e.y) < 3 && !(e.fallT > 0)) { dmg *= 2; e.legDmg = (e.legDmg || 0) + dmg; if (e.legDmg > e.maxHp * 0.3) { e.legDmg = 0; e.fallT = 2; e.state = 'pain'; e.t = 0; spawnText(e.x, e.y, 'OMKULL!', '#ffd24a'); play('stiltwalker', 1.2, 0.8, { x: e.x, y: e.y }); P.shake = Math.max(P.shake, 0.8); firstHint('stiltwalker', 'SKJUT STYLTGÅNGARENS BEN PÅ NÄRA HÅLL SÅ FALLER DEN OMKULL.'); } }
  return dmg;
}
function v18Kill(e) {
  if (e.d.ai === 'clown' && !e.minionBalloon) { for (const s of [-1, 1]) v18Shoot(e, Math.atan2(P.y - e.y, P.x - e.x) + s * 0.9, 2.2, 3, 'eballoon', { life: 6, z: 0.7, cause: 'BALLONGEN' }); play('honk', 0.35, 0.8, { x: e.x, y: e.y }); firstHint('clown', 'CLOWNENS BALLONGER FLYGER MOT DIG – SKJUT DEM INNAN DE SMÄLLER.'); }
  if (e.d.ai === 'monkey' && e.stole) { const { k, n } = e.stole; P.ammo[k] = Math.min(AMMO[k].max, P.ammo[k] + n * 2); spawnText(e.x, e.y, `+${n * 2} ${AMMO[k].name}`, '#9fe060'); play('pickup', 0.6); }
  if (e.d.ai === 'mosquito' && !settings.lowfx) splash(e.x, e.y);
  if (e.d.ai === 'templeguardian') { e.beam = null; spawnPuff(e.x, e.y, 10); for (let i = 0; i < 6; i++) particles.push({ x: e.x, y: e.y, z: 0.6, vx: rnd(-1.5, 1.5), vy: rnd(-1.5, 1.5), vz: rnd(0.5, 2), life: 1, img: fx.parts.rock ? fx.parts.rock[0] : fx.shards[i % 6], size: 0.1, grav: true, bounce: true }); }
}
function drawV18Hud(g) {
  if (P.spotT > 0) { const gr = g.createRadialGradient(W / 2, HORIZON, VH * 0.35, W / 2, HORIZON, W * 0.65); gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(1, 'rgba(255,230,170,0.16)'); g.fillStyle = gr; g.fillRect(0, 0, W, VH); txt('I RAMPLJUSET', (W - textW('I RAMPLJUSET')) / 2, HL ? HL.row2 + 11 : 30, '#ffe6a0', 1, true, 0.7 + 0.3 * Math.sin(tmr * 6)); if (hudImg.icon_spotlight) g.drawImage(hudImg.icon_spotlight, 98, VH - 22, 8, 8); }
  if (P.pirT > 0) { g.fillStyle = `rgba(160,30,30,${0.1 + 0.05 * Math.sin(tmr * 12)})`; g.fillRect(0, VH * 0.75, W, VH * 0.25); }
  if (P.poisonT > 0 && hudImg.icon_poison2) g.drawImage(hudImg.icon_poison2, 110, VH - 22, 8, 8);
  if (hudImg.icon_steal && ents.some(e => !e.dead && e.stole && Math.hypot(e.x - P.x, e.y - P.y) < 12)) g.drawImage(hudImg.icon_steal, 122, VH - 22, 8, 8);
  const d = v18doors.find(d => (P.x | 0) === d.x && (P.y | 0) === d.y && d.st === 'warn'); if (d) { g.fillStyle = `rgba(255,200,80,${0.12 + 0.1 * Math.sin(tmr * 30)})`; g.fillRect(0, 0, W, VH); }
}
function drawV18World(list) {
  for (const b of v18beams) { const n = Math.min(30, Math.ceil(b.L / 0.35)); for (let i = 1; i < n; i++) { const k = i / n; list.push({ x: b.x + Math.cos(b.a) * b.L * k, y: b.y + Math.sin(b.a) * b.L * k, k: 'v18', t: 'beam', o: b }); } }
  for (const e of ents) if (e.beam && !e.dead && e.beam.t < e.beam.warn) list.push({ x: e.x, y: e.y, k: 'v18', t: 'eyes', o: e });
  for (const e of ents) if (e.leap && !e.dead && e.leap.t < e.leap.wind) list.push({ x: e.x, y: e.y, k: 'v18', t: 'wind', o: e });
  for (const d of v18doors) if (d.st === 'warn' && Math.hypot(d.x - P.x, d.y - P.y) < 14) list.push({ x: d.x + 0.5, y: d.y + 0.5, k: 'v18', t: 'door', o: d });
  for (const b of [boss, guardianE]) if (b && b.id === 'ringmaster' && !b.dead && !b.dying && b.spot) list.push({ x: b.spot.x, y: b.spot.y, k: 'v18', t: 'spot', o: b.spot });
  for (const b of [boss, guardianE]) if (b && b.id === 'serpent' && !b.dead && b.emerge) list.push({ x: b.emerge.x, y: b.emerge.y, k: 'v18', t: 'emerge', o: b.emerge });
}
function drawV18Sprite(s) {
  const o = s.o;
  if (s.t === 'beam') { drawSprite(fx.parts.laser ? fx.parts.laser[0] : fx.hit[1], s.x, s.y, o.warn ? 0.06 : 0.16, 0.95, false, o.warn ? 1.2 : 2.2, 0, 0, true, o.warn ? [255, 120, 60] : [255, 60, 40]); return true; }
  if (s.t === 'eyes') { const k = o.beam.t / o.beam.warn; drawSprite(fx.hit[1], o.x, o.y, 0.08 + 0.1 * k, o.d.size * 0.85, false, 2.4, 0, 0, true, [255, 80, 40]); return true; }
  if (s.t === 'wind') { drawSprite(fx.hit[1], o.x, o.y, 0.12, 0.05, false, 1.4, 0, 0, true, [255, 200, 90]); return true; }
  if (s.t === 'door') { for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + tmr * 2; drawSprite(fx.hit[1], o.x + 0.5 + Math.cos(a) * 0.35 - 0.5, o.y + 0.5 + Math.sin(a) * 0.35 - 0.5, 0.07, 0.01, false, 1.6, 0, 0, true, [255, 190, 80]); } return true; }
  if (s.t === 'spot') { const n = 10; for (let i = 0; i < n; i++) { const a = i / n * TAU + tmr; drawSprite(fx.hit[1], o.x + Math.cos(a) * 0.9, o.y + Math.sin(a) * 0.9, 0.1, 0.01, false, 1.8, 0, 0, true, o.hot > tmr ? [255, 120, 40] : [255, 240, 190]); } drawSprite(fx.hit[1], o.x, o.y, 0.3, 0.01, false, 1.5, 0, 0, true, o.hot > tmr ? [255, 120, 40] : [255, 240, 190]); return true; }
  if (s.t === 'emerge') { const n = 12; for (let i = 0; i < n; i++) { const a = i / n * TAU - tmr; drawSprite(fx.hit[1], o.x + Math.cos(a) * 1.6, o.y + Math.sin(a) * 1.6, 0.11, 0.01, false, 1.8, 0, 0, true, [140, 255, 120]); } return true; }
  return false;
}

// ---------- Version 18: Cirkusdirektören och Den fjädrade ormen ----------
const RM_ACTS = ['Ƿ', 'ǻ', 'Ǻ'];
Object.assign(BOSS_AI, {
  ringmaster(b, dt, dist, ang, ph) { // piska, hög hatt och en strålkastare som följer dig
    const fast = ph === 3 ? 1.3 : 1;
    if (!b.spot) b.spot = { x: P.x + 3, y: P.y, fireT: 3, hot: 0 };
    { const sp = (ph === 3 ? 3 : 2.2) * dt, a = Math.atan2(P.y - b.spot.y, P.x - b.spot.x), d = Math.hypot(P.x - b.spot.x, P.y - b.spot.y); if (d > 0.05) { b.spot.x += Math.cos(a) * Math.min(sp, d); b.spot.y += Math.sin(a) * Math.min(sp, d); }
      b.spot.fireT -= dt; if (b.spot.fireT < 0.6 && b.spot.fireT + dt >= 0.6) b.spot.hot = tmr + 0.6;
      if (b.spot.fireT <= 0) { b.spot.fireT = ph >= 2 ? 2.2 : 2.8; const { x, y } = b.spot; play('fireburst', 0.7, 1, { x, y }); flashes.push({ x, y, t: 0.2, r: 3, col: [255, 160, 60] }); for (let i = 0; i < 5; i++) { const a2 = rnd(0, TAU), r = rnd(0, 0.8); if (!solid(x + Math.cos(a2) * r, y + Math.sin(a2) * r)) groundFires.push({ x: x + Math.cos(a2) * r, y: y + Math.sin(a2) * r, t: 2.5, acc: 0 }); } if (Math.hypot(P.x - x, P.y - y) < 1.1 && P.jz < 0.4) { run.cause = 'STRÅLKASTAREN'; hurtPlayer(b.d.dmg * 0.6, x, y, 'proj'); } } }
    if (b.state === 'whip') { if (!b.didHit && b.t > 0.4) { b.didHit = true; play('ringmaster_whip', 1.4); if (dist < (b.d.range || 2.2) + 1.4 && hasLOS(b.x, b.y, P.x, P.y)) { run.cause = b.d.name; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); } if (fx.parts.whip) particles.push({ x: b.x + Math.cos(ang) * 1.5, y: b.y + Math.sin(ang) * 1.5, z: 0.8, vx: 0, vy: 0, vz: 0, life: 0.25, maxLife: 0.25, img: fx.parts.whip[0], size: 0.4 }); }
      if (b.t > 0.75) { b.state = 'idle'; b.t = 0; b.cd = rnd(0.9, 1.3) / fast; } return; }
    if (b.state === 'cane') { if (b.shots < 3 && b.t > 0.3 + b.shots * 0.25) { b.shots++; v18Shoot(b, ang + rnd(-0.15, 0.15), 8, b.d.dmg * 0.4, 'eknife', { life: 3 }); play('knifethrower', 0.6, 0.9); }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = 0.9 / fast; } return; }
    b.cd -= dt;
    if (b.cd <= 0) { b.t = 0; b.didHit = false; const los = hasLOS(b.x, b.y, P.x, P.y);
      if (los && dist < 4.2) { b.state = 'whip'; bossWarn(b, 'DIREKTÖREN SMÄLLER MED PISKAN!'); }
      else if (los) { b.state = 'cane'; b.shots = 0; } else b.cd = 0.4;
      return; }
    if (dist > 4) bossMove(b, ang, b.d.speed * fast * dt); else bossMove(b, ang + Math.PI / 2, b.d.speed * dt * 0.7);
  },
  serpent(b, dt, dist, ang, ph) { // dyker ned i marken och kommer upp under dig
    const fast = ph === 3 ? 1.25 : 1, reach = b.d.range / BOSSES.serpent.range; // väktaren (range * 0.8) sveper kortare
    if (b.state === 'dive') { b.hidden = true; const sp = 4.2 * fast * dt; bossMove(b, ang, Math.min(sp, Math.max(0, dist - 0.3)));
      if (!settings.lowfx && Math.random() < dt * 14) particles.push({ x: b.x + rnd(-0.5, 0.5), y: b.y + rnd(-0.5, 0.5), z: 0.02, vx: rnd(-0.4, 0.4), vy: rnd(-0.4, 0.4), vz: rnd(0.8, 1.6), life: 0.6, maxLife: 0.6, img: fx.parts.dirt ? fx.parts.dirt[0] : fx.hit[1], size: 0.08, grav: true, tint: fx.parts.dirt ? null : [120, 90, 60] });
      if (b.t > 1.3 && !b.emerge) { b.emerge = { x: P.x, y: P.y, t: tmr + 0.7 }; play('serpent_hiss', 0.5); bossWarn(b, 'MARKEN RÖR SIG UNDER DIG!'); }
      if (b.emerge && tmr >= b.emerge.t) { const e0 = b.emerge; b.emerge = null; let x = e0.x, y = e0.y; if (!freeSpot(x, y, 0.9)) { const s = freeSpotFar(1, 3); if (s) [x, y] = s; } if (freeSpot(x, y, 0.5)) { b.x = x; b.y = y; } b.hidden = false; b.state = 'emerge'; b.t = 0; spawnPuff(b.x, b.y, 14); P.shake = Math.max(P.shake, 2); play('serpent_roar', 1);
        if (Math.hypot(P.x - e0.x, P.y - e0.y) < 1.6 && P.jz < 0.5) { run.cause = b.d.name; hurtPlayer(b.d.dmg * 1.1, b.x, b.y, 'melee'); P.jz = Math.max(P.jz, 0.3); } }
      return; }
    if (b.state === 'emerge') { if (b.t > 0.8) { b.state = 'idle'; b.t = 0; b.cd = 0.7; } return; }
    if (b.state === 'spit') { if (!b.didHit && b.t > 0.35) { b.didHit = true; const n = ph >= 2 ? 3 : 2; for (let i = 0; i < n; i++) lobShot(b, P.x + P.vx * 0.5 + (i ? rnd(-2, 2) : 0), P.y + P.vy * 0.5 + (i ? rnd(-2, 2) : 0), { dmg: b.d.dmg * 0.45, r: 1.3, T: 0.9 + i * 0.15, kind: 'flask', fx: 'poison' }); play('serpent_hiss', 0.45, 1.2); }
      if (b.t > 0.8) { b.state = 'idle'; b.t = 0; b.cd = rnd(0.9, 1.3) / fast; } return; }
    if (b.state === 'tail') { if (!b.didHit && b.t > 0.45) { b.didHit = true; play('whoosh', 0.9, 0.6); P.shake = Math.max(P.shake, 1); if (dist < 3.8 * reach) { run.cause = b.d.name; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); for (let i = 0; i < 8; i++) tryMove(P, Math.cos(ang) * 0.13, Math.sin(ang) * 0.13, 0.24); } }
      if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.8 / fast; } return; }
    b.cd -= dt;
    if (b.cd <= 0) { b.t = 0; b.didHit = false; const los = hasLOS(b.x, b.y, P.x, P.y), r = Math.random();
      if (los && dist < 3.6 * reach && r < 0.6) { b.state = 'tail'; bossWarn(b, 'ORMEN SVEPER MED SVANSEN!'); }
      else if ((b.diveCd || 0) < tmr && r < 0.55) { b.state = 'dive'; b.diveCd = tmr + 6; play('serpent_hiss', 0.45, 0.8); spawnPuff(b.x, b.y, 10); }
      else if (los) b.state = 'spit'; else { b.state = 'dive'; b.diveCd = tmr + 6; }
      return; }
    if (dist > 4.5) bossMove(b, ang, b.d.speed * fast * dt); else bossMove(b, ang + Math.PI / 2, b.d.speed * dt * 0.8);
  },
});
Object.assign(BOSS_SPECIAL, {
  ringmaster(b, dt, dist, ang, ph) {
    if (b.spK) { // fallluckor i manegen runt dig
      if (b.t < 0.05) { bossWarn(b, 'LUCKORNA I MANEGEN ÖPPNAS!'); play('ringmaster_laugh', 0.9); let n = 0;
        for (let i = 0; i < 50 && n < 5 + ph * 2; i++) { const x = (P.x + rnd(-2.5, 2.5)) | 0, y = (P.y + rnd(-2.5, 2.5)) | 0; if (!map[y] || map[y][x] !== '.' || v18doors.some(d => d.x === x && d.y === y)) continue; v18doors.push({ x, y, temp: true, t0: v18clock, warn: 0.9, floor: cellFloor[y * mw + x] }); n++; } }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return;
    }
    if (b.t < 0.05) { say('OCH NU – NÄSTA NUMMER!', 1.5); play('ringmaster_laugh', 0.9); b.act = (b.act || 0) + 1;
      for (let i = 0; i < 1 + ph; i++) { const s = freeSpotFar(3, 6); if (!s) continue; const t0 = RM_ACTS[(b.act + i) % RM_ACTS.length], t = ENEMY_DEFS[t0] && enemyFrames[t0] ? t0 : 'S', e = makeEnemy(t, s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 8); } }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
  serpent(b, dt, dist, ang, ph) {
    if (b.spK) { // giftbågar
      if (b.t < 0.05) { bossWarn(b, 'ORMEN SPOTTAR GIFT – AKTA RINGARNA!'); play('serpent_roar', 0.9); for (let i = 0; i < 4 + ph * 2; i++) { const a = ang + (i - (2 + ph)) * 0.35, r = Math.min(dist, 6) * rnd(0.7, 1.2); lobShot(b, b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, { dmg: b.d.dmg * 0.5, r: 1.2, T: 1 + i * 0.12, kind: 'flask', fx: 'poison' }); } }
      if (b.t > 1.4) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return;
    }
    if (b.t < 0.05) { say('ORMEN KALLAR PÅ SVÄRMEN', 1.5); play('serpent_hiss', 0.55, 0.9); for (let i = 0; i < 3 + ph; i++) { const s = freeSpotFar(2, 5); if (!s) continue; const t = ENEMY_DEFS['Ȍ'] && enemyFrames['Ȍ'] ? 'Ȍ' : 'X', e = makeEnemy(t, s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; } }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
});
TAUNTS.ringmaster = ['MINE DAMER OCH HERRAR!', 'APPLÅDERA FÖR DIN UNDERGÅNG!', 'FÖRESTÄLLNINGEN MÅSTE GÅ VIDARE'];
TAUNTS.serpent = ['SSSSS...', 'TEMPLET ÄR MITT', 'DU ÄR EN OFFERGÅVA'];
// ---------- Version 19: hackan och stjärnlansen ----------
function pickSwing(wp) { // hackan: ett tungt slag framåt – fiender, ras, stenbumlingar och malmådror
  if (WS.cd > 0 || WS.state !== 'idle') return;
  WS.shot = 0; WS.cd = effDelay(wp) * (up('px_fast') ? 0.7 : 1); WS.kick = 0.3; lvlStat.shots++; noise(2);
  play('pickaxe_swing', 0.8, rnd(0.92, 1.05));
  setTimeout(() => { if (state !== 'play' || WEAPONS[P.weapon].id !== 'pickaxe') return; pickHit(wp); }, 230);
}
function pickHit(wp) {
  let best = null, bd = 9; const reach = 1.75;
  for (const e of ents) { if (e.dead || e.dying || e.hidden || e.dormant) continue; const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
    if (d > reach + e.d.size * 0.3 || Math.abs(off) > 0.65) continue; if (d < bd) { bd = d; best = e; } }
  let hit = false;
  if (best) { const crit = Math.random() < mod('critChance') + (up('px_crit') ? 0.25 : 0);
    let dmg = wp.dmg * meleeMul() * (1 + mod('pickDmg')) * (crit ? 2 + mod('critDmg') : 1);
    if (!best.boss && !best.elite && !best.alert) { dmg = Math.max(dmg, best.hp + 1); stat('sneakKills'); }
    const k = hurtEnemy(best, dmg, best.x, best.y, { melee: true, crit }); hitKill = hitKill || k; hit = true; if (crit) hitCrit = true;
    if (!k && !best.boss) for (let i = 0; i < 5; i++) tryMove(best, Math.cos(P.a) * 0.1, Math.sin(P.a) * 0.1, 0.28); }
  if (up('px_quake')) { for (const e of ents) if (!e.dead && !e.hidden && !e.dormant && e !== best && Math.hypot(e.x - P.x, e.y - P.y) < 2.2) { hurtEnemy(e, wp.dmg * 0.35 * meleeMul(), e.x, e.y, { melee: true }); if (!e.boss) e.stun = Math.max(e.stun || 0, 0.8); } P.shake = Math.max(P.shake, 1); spawnPuff(P.x + Math.cos(P.a) * 0.9, P.y + Math.sin(P.a) * 0.9, 6); }
  // väggen framför: malmådern
  const w = cast(P.x, P.y, Math.cos(P.a), Math.sin(P.a), 1.6);
  if (w.dist < 1.55 && w.mx !== undefined && w.cell === 'ȑ') { mineOre(w.mx, w.my); hit = true; }
  // stenbumlingar och knakande tak framför och under spelaren
  for (const pr of props) if (pr.ch === '¸' && !pr.broken && Math.hypot(pr.x - P.x - Math.cos(P.a) * 0.9, pr.y - P.y - Math.sin(P.a) * 0.9) < 0.8) { breakRubble(pr); hit = true; }
  for (const r of [0, 0.9, 1.5]) { const cx = (P.x + Math.cos(P.a) * r) | 0, cy = (P.y + Math.sin(P.a) * r) | 0; if (map[cy] && map[cy][cx] === 'Ș') { clearCavein(cx, cy); spawnText(cx + 0.5, cy + 0.5, 'TAKET RASAR UTAN FARA', '#c9a87a'); play('cavein', 0.5, 1.3, { x: cx + 0.5, y: cy + 0.5 }); hit = true; } }
  for (const pt of pots) if (!pt.broken && Math.hypot(pt.x - P.x, pt.y - P.y) < reach) breakPot(pt);
  breakProps(P.x + Math.cos(P.a) * 1, P.y + Math.sin(P.a) * 1, 0.8);
  r30Melee(P.x + Math.cos(P.a) * 1, P.y + Math.sin(P.a) * 1, 0.8, false); // version 30 (RAS): hackan är en tung träff
  if (hit) { play('pickaxe_hit', 1.4, rnd(0.9, 1.1)); hitStop = Math.max(hitStop, 0.07); P.shake = Math.max(P.shake, 0.9); hitMark = 0.15; lvlStat.hits++; sparks(P.x + Math.cos(P.a) * 1.1, P.y + Math.sin(P.a) * 1.1, 0.45, 4); }
}
function mineOre(cx, cy) { // malmådern ger guld och blir vanlig stollvägg
  map[cy][cx] = 'Ȑ'; const g = Math.round(3 * (up('px_ore') ? 2 : 1) * (Math.random() < mod('oreLuck') ? 2 : 1)); run.gold += g; stat('ores');
  spawnText(cx + 0.5, cy + 0.5, `+${g} G`, '#ffd24a'); play('ore_ping', 0.9, rnd(0.95, 1.1), { x: cx + 0.5, y: cy + 0.5 }); play('coin', 0.6, 1.1);
  for (let i = 0; i < 6; i++) particles.push({ x: cx + 0.5 - Math.cos(P.a) * 0.55, y: cy + 0.5 - Math.sin(P.a) * 0.55, z: 0.5, vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(0.5, 1.6), life: 0.9, img: fx.parts.rock ? fx.parts.rock[0] : fx.shards[i % 6], size: 0.06, grav: true, bounce: true, tint: i % 2 ? [255, 210, 90] : null });
  firstHint('ore', 'MALMÅDRORNA GER GULD – HACKAN BRYTER UT MEST.');
}
function v19WallHit(wall, hx, hy) { // ett skott i en malmåder: 1 guld första gången
  if (wall.cell !== 'ȑ' || wall.mx === undefined) return; const key = wall.mx + ',' + wall.my; if (v19ore.has(key)) return; v19ore.add(key);
  run.gold += 1; spawnText(hx, hy, '+1 G', '#ffd24a'); play('ore_ping', 0.6, rnd(1, 1.2), { x: hx, y: hy });
}
function breakRubble(pr) { pr.broken = true; map[pr.cy][pr.cx] = '.'; flowCell = -1; play('cavein', 0.45, 1.4, { x: pr.x, y: pr.y }); spawnPuff(pr.x, pr.y, 6);
  for (let i = 0; i < 6; i++) particles.push({ x: pr.x, y: pr.y, z: 0.4, vx: rnd(-1.4, 1.4), vy: rnd(-1.4, 1.4), vz: rnd(0.5, 2), life: 1, img: fx.parts.rock ? fx.parts.rock[0] : fx.shards[i % 6], size: 0.09, grav: true, bounce: true });
  if (up('px_ore') && Math.random() < 0.5) dropItem('gold', pr.x, pr.y); }
function lanceBase(wp) { return wp.dmg * (1 + mod('dmg')) * (1 + 0.12 * wlvl(wp.id)) * (P.rageT > 0 ? 1.5 : 1); }
function stopLanceSnd() { if (WS.lsnd) { try { WS.lsnd.s.stop(); } catch (e) { /* stoppad */ } const i = ambLoops.indexOf(WS.lsnd); if (i >= 0) ambLoops.splice(i, 1); WS.lsnd = null; } } // slingan ligger bland ambLoops: stopAmbient (död, våningsslut) stoppar den också
function weaponV19Tick(wp, dt, trig) {
  if (!wp.starlance) { if (WS.lcharge > 0) { WS.lcharge = 0; WS.hcharge = 0; } stopLanceSnd(); return; }
  if (WS.state !== 'idle') { if (WS.lcharge > 0) { WS.lcharge = 0; WS.hcharge = 0; } stopLanceSnd(); return; }
  if (trig && WS.cd <= 0 && P.mags[P.weapon] > 0 && state === 'play') {
    WS.lcharge = Math.min(1.2, (WS.lcharge || 0) + dt * (up('sl_quick') ? 1.6 : 1) * (1 + mod('lanceCharge')));
    const k = WS.lcharge / 1.2; WS.hcharge = k;
    if (WS.lsnd && !ambLoops.includes(WS.lsnd)) WS.lsnd = null;
    if (!WS.lsnd) { WS.lsnd = play('starlance_charge', 0.2, 0.8, { loop: true }); if (WS.lsnd) ambLoops.push(WS.lsnd); }
    if (WS.lsnd) { WS.lsnd.s.playbackRate.value = 0.8 + 0.7 * k; WS.lsnd.g.gain.value = 0.12 + 0.3 * k; }
  } else if (!trig && WS.lcharge > 0) { const t = WS.lcharge; WS.lcharge = 0; WS.hcharge = 0; stopLanceSnd(); if (t >= 0.2 && canFire()) lanceFire(wp, t); }
}
function lanceFire(wp, t) { // stjärnstrålen: genom alla fiender i en linje
  if (Math.random() >= mod('ammoSave')) P.mags[P.weapon]--;
  lvlStat.shots++; run.shots = (run.shots || 0) + 1; WS.shot = 0; WS.cd = effDelay(wp); P.flash = 0.08; P.shake = Math.max(P.shake, 0.8); WS.kick = 0.3; P.pitch += 3;
  const k = clamp((t - 0.2) / 1.0, 0, 1), dmg = lanceBase(wp) * (1 + 2.6 * k) * (up('sl_power') && k >= 0.99 ? 1.3 : 1);
  play('starlance_fire', 0.75, 1.15 - 0.3 * k); noise(4 * (1 - mod('noiseReduce')));
  const beams = [[P.a, 1]]; if (up('sl_split')) beams.push([P.a - 0.14, 0.45], [P.a + 0.14, 0.45]);
  const hitSet = new Set();
  for (const [a, m] of beams) {
    const dx = Math.cos(a), dy = Math.sin(a), L = up('sl_pierce') ? 22 : cast(P.x, P.y, dx, dy, 30).dist;
    v19rays.push({ x: P.x, y: P.y, a, L, t: 0.4, max: 0.4, w: 0.12 + 0.08 * k });
    for (const e of ents) { if (e.dead || e.dying || e.hidden || e.dormant || hitSet.has(e)) continue; const rx = e.x - P.x, ry = e.y - P.y, along = rx * dx + ry * dy; if (along < 0.1 || along > L) continue;
      if (Math.abs(rx * dy - ry * dx) > 0.38 * e.d.size * (e.boss ? 1.8 : 1) + 0.12 * k) continue; hitSet.add(e);
      const kk = hurtEnemy(e, dmg * m, e.x, e.y, {}); hitMark = 0.12; hitKill = hitKill || kk; lvlStat.hits++; sparks(e.x, e.y, 0.5, 3); }
    for (const pr of props) { if (!pr.def || pr.broken || !(pr.def.boom || pr.def.balloon || pr.ch === 'Ȝ')) continue; const rx = pr.x - P.x, ry = pr.y - P.y, along = rx * dx + ry * dy; if (along > 0.1 && along < L && Math.abs(rx * dy - ry * dx) < 0.35) hitProp(pr, pr.x, pr.y, dmg); }
  }
  if (P.mags[P.weapon] <= 0 && P.ammo.stars > 0) setTimeout(() => { if (state === 'play' && WEAPONS[P.weapon].starlance) startReload(); }, 300);
}

