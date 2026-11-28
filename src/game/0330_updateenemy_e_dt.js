function updateEnemy(e, dt) {
  e.t += dt; e.flash = Math.max(0, e.flash - dt); e.spotT = Math.max(0, (e.spotT || 0) - dt);
  if (e.airZ > 0 && e.dead) v26bFall(e, dt); // version 26B: ett lik som dog i luften faller ned
  if (e.dead) return;
  if (e.dummy) { e.state = e.flash > 0 ? 'pain' : 'idle'; e.alert = false; e.burn = 0; e.poison = 0; e.knock = null; e.x = e.hx; e.y = e.hy; return; } // skjutbanans provdocka
  if (e.dormant) { e.state = 'idle'; if (e.hp < e.maxHp || Math.hypot(P.x - e.x, P.y - e.y) < (e.type === 'Ö' ? 3 : 1.15)) wakeMimic(e); return; } // mimicen väntar som en kista, gargoylen som en staty
  if (e.airZ > 0) { statusTick(e, dt); if (e.dead || v26bAirTick(e, dt)) return; } // version 26B: i luften – ingen AI, inga anfall, ingen rörelse
  if (e.frozen > 0) { statusTick(e, dt); e.state = 'pain'; e.t = 0; return; }
  statusTick(e, dt); if (e.dead) return;
  eliteTick(e, dt); enemyFeel(e, dt); enemyFeelV6(e, dt);
  const dx = P.x - e.x, dy = P.y - e.y, dist = Math.hypot(dx, dy);
  const los = dist < 14 && !(P.ghostT > 0 && dist > 1.3 && !e.boss) && hasLOS(e.x, e.y, P.x, P.y); // osynlighetsdrycken
  const sight = e.sleep ? 2.2 : (dmod('dark') ? 6 : 10) * (P.crouch > 0.5 ? 0.7 : 1);
  if (!e.alert) detectTick(e, dt, dist, los && dist < sight * 1.4); // upptäckten fylls gradvis
  if (!e.alert) { if (investigate(e, dt)) return; idleBehaviour(e, dt, dist); return; }
  if (bellTick(e, dt)) return; // springer till larmklockan
  // tappar sikten: letar där spelaren senast syntes, ger upp efter en stund
  if (los) { e.lostT = 0; e.lx = P.x; e.ly = P.y; } else e.lostT = (e.lostT || 0) + dt;
  if (e.lostT > 7 && dist > 9 && !e.minion && !e.elite) { e.alert = false; e.lostT = 0; e.searchT = 1.5; e.state = 'idle'; return; }
  if (e.r25mor && e.fleeT > 0 && e.fleeT < 5) e.fleeT = 0; // version 25: under befäl flyr ingen (ficktjuven med guldet, 99 s, får fly)
  if (e.fleeT > 0) { e.fleeT -= dt; const sp = e.d.speed * diff().speed * dt * 1.3, a = Math.atan2(e.y - P.y, e.x - P.x) + Math.sin(e.t * 3) * 0.4; const ox = e.x, oy = e.y; tryMove(e, Math.cos(a) * sp, Math.sin(a) * sp, 0.28); e.mvx = e.x - ox; e.mvy = e.y - oy; e.state = 'move'; return; }
  if (!e.fledOnce && !e.elite && !e.minion && e.hp < e.maxHp * 0.25 && e.d.melee && e.cowardly) { e.fledOnce = true; e.fleeT = 2.5; spawnText(e.x, e.y, 'FLYR', '#c9a87a'); } // vissa flyr när de är svårt skadade
  if (e.dodgy && los && (e.dodgeT || 0) < tmr && dist > 2.5 && aimedAt(e)) { e.dodgeT = tmr + rnd(1.8, 3); const side = Math.random() < 0.5 ? 1 : -1, a = Math.atan2(dy, dx) + side * Math.PI / 2; for (let i = 0; i < 6; i++) tryMove(e, Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0.28); } // viker undan när du siktar
  e.growlT -= dt; if (e.growlT <= 0) { e.growlT = rnd(4, 9); play(e.d.growl, e.d.ai === 'stealth' ? 0.15 : e.d.growlVol || 0.45, rnd(0.9, 1.2), { x: e.x, y: e.y }); }
  if (e.frozen > 0) { e.state = 'pain'; e.t = 0; return; } // frusen
  if (e.stun > 0 && e.d.ai !== 'charge') { e.stun -= dt; e.state = 'pain'; e.t = Math.min(e.t, 0.25); return; } // bländad
  if (e.feud && feudTick(e, dt)) return; // ger igen mot en annan fiende
  if (e.d.ai && ENEMY_AI[e.d.ai](e, dt, dist, los)) return;
  if (settings.smartAI !== false && ai24Tick(e, dt, dist, los)) return; // version 24: attackpoletter, skydd, trupproller (AI24)
  if (e.state === 'pain') { if (e.t > 5 / 14) { e.state = 'move'; e.t = 0; } return; }
  e.cd -= dt;
  if (e.state === 'attack') {
    const dur = enemyFrames[e.type].attack.length / e.d.atkFps;
    v26bAtk(e, dur); // version 26B: parerbara slag – när slaget träffar (blinken och sparkens fönster)
    if (!e.didHit && e.t > dur * e.d.hitAt) { e.didHit = true; enemyStrike(e, dist); }
    if (e.t > dur) { e.state = 'move'; e.t = 0; e.cd = e.d.cd * rnd(0.8, 1.2); }
    return;
  }
  if (los && dist < e.d.range && e.cd <= 0) { e.state = 'attack'; e.t = 0; e.didHit = false; return; }
  e.state = 'move'; e.mvx = 0; e.mvy = 0;
  const want = (e.d.kite && los && dist < e.d.kite * (e.hp < e.maxHp * 0.3 ? 2 : 1)) || (e.burn > 0 && e.panic) || (!(los && !e.d.melee && dist < e.d.range * 0.6) && dist > 0.75);
  if (!want) return;
  const sp = e.d.speed * diff().speed * dt * (e.slow > 0 ? 0.5 : 1) * (e.haste > 0 ? 1.45 : 1) * (dmod('swift') ? 1.25 : 1) * (cellAt(e.x, e.y) === ':' && e.d.ai !== 'fly' && e.type !== 'É' ? rnd(0.6, 1.6) : 1) * (cellAt(e.x, e.y) === '-' && e.d.ai !== 'fly' ? 0.65 : 1) * (cellAt(e.x, e.y) === '"' && e.type !== 'U' ? 0.5 : 1);
  let tx = P.x, ty = P.y;
  // grannrutan med lägst värde i avståndsfältet (behövs även med sikt, som reserv när väggen är i vägen)
  const cx = e.x | 0, cy = e.y | 0; let best = flow[cy * mw + cx], bx = -1, by = -1;
  for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = cx + ddx, ny = cy + ddy; if (nx < 0 || ny < 0 || nx >= mw || ny >= mh) continue;
    const v = flow[ny * mw + nx]; if (v >= 0 && (best < 0 || v < best)) { best = v; bx = nx; by = ny; }
  }
  if (!los || dist > 6) { // följ avståndsfältet runt hörn
    if (bx >= 0) {
      tx = bx + 0.5; ty = by + 0.5;
      const d = doors[bx + ',' + by]; // fiender öppnar dörrar
      if (d && !d.gate && !d.secret && !d.arena && d.target === 0 && !d.oneway) { d.target = 1; play('door', 0.5, 1, { x: bx + 0.5, y: by + 0.5 }); }
    }
  }
  let ang = Math.atan2(ty - e.y, tx - e.x);
  const fleeing = e.d.kite && e.hp < e.maxHp * 0.3; // skadade magiker och shamaner flyr
  const panicked = e.burn > 0 && !e.elite && e.d.melee && e.panic, backing = e.d.kite && los && dist < e.d.kite * (fleeing ? 2 : 1);
  if (panicked) ang = e.panic; // brinnande fiender springer i panik
  else if (backing) ang += Math.PI; // magiker och shamaner håller avstånd
  else if (e.d.ai === 'blink' && los) ang += Math.sin(e.t * 5 + e.x * 3) * 0.7; // smådjävulen sicksackar
  else if (los && e.d.melee && dist > 1.8 && dist < 7) ang += (e.flank || 0) * clamp((dist - 1.8) / 4, 0, 1) * 0.6; // grupper sprider sig och kommer från sidorna
  const ox = e.x, oy = e.y;
  tryMove(e, Math.cos(ang) * sp, Math.sin(ang) * sp, 0.28);
  if (Math.hypot(e.x - ox, e.y - oy) < sp * 0.3) { // blockerad: följ avståndsfältet först, vrid åt båda hållen bara som sista utväg
    if (bx >= 0 && !panicked && !backing) { const fa = Math.atan2(by + 0.5 - e.y, bx + 0.5 - e.x); tryMove(e, Math.cos(fa) * sp, Math.sin(fa) * sp, 0.28); }
    if (Math.hypot(e.x - ox, e.y - oy) < sp * 0.3) tryMove(e, Math.cos(ang + 1.2) * sp, Math.sin(ang + 1.2) * sp, 0.28);
    if (Math.hypot(e.x - ox, e.y - oy) < sp * 0.3) tryMove(e, Math.cos(ang - 1.2) * sp, Math.sin(ang - 1.2) * sp, 0.28);
  }
  for (const o of ents) if (o !== e && !o.dead) pushOut(e, o.x, o.y, o.boss ? 1.2 : 0.55);
  e.mvx = e.x - ox; e.mvy = e.y - oy;
}
function enemyStrike(e, dist) {
  if ((e.v26pT || 0) > tmr) return; // version 26B: slaget parerades
  let dmg = e.d.dmg * (1 + 0.1 * (run.depth - 1));
  if (e.d.melee) {
    if (dist < e.d.range + 0.35) {
      if (e.d.ai === 'stealth') { // rygghugg om spelaren tittar bort
        let off = Math.abs(Math.atan2(e.y - P.y, e.x - P.x) - P.a) % TAU; if (off > Math.PI) off = TAU - off;
        if (off > 1.75) { dmg *= 1.7; say('RYGGHUGG!', 1); }
      }
      hurtPlayer(dmg, e.x, e.y, 'melee'); play(e.type === 'É' ? 'wolf_bite' : 'splat', 0.5, 0.7);
      if (e.d.frostBite) P.slowT = Math.max(P.slowT, 1.5 * Math.max(0.2, 1 - mod('coldResist')));
      if (hasMod(e, 'mirror')) { /* speglande eliter skadar dig när du träffar dem, se hurtEnemy */ }
      if (mod('thorns') > 0) hurtEnemy(e, mod('thorns'), e.x, e.y, { noProc: true });
      if (e.elite && e.elite.id === 'vamp') e.hp = Math.min(e.maxHp, e.hp + dmg);
      if (hasMod(e, 'venom')) { P.poisonT = 4; say('DU ÄR FÖRGIFTAD', 1); }
    } else play('whoosh', 0.4, 1.2, { x: e.x, y: e.y });
  } else { // eldklot som går att undvika
    const kind0 = e.d.proj, sp0 = kind0 === 'orb' ? 3.4 : kind0 === 'bolt' ? 6.5 : 5.2, lead = clamp(dist / sp0, 0.1, 1) * (e.elite ? 0.9 : 0.6), tx = P.x + P.vx * lead, ty = P.y + P.vy * lead, a = Math.atan2(ty - e.y, tx - e.x) + rnd(-0.05, 0.05);
    const kind = e.d.proj, speed = kind === 'orb' ? 3.4 : kind === 'bolt' ? 6.5 : 5.2;
    shootFireball(e, a, speed, dmg, false, kind);
    if (e.elite) { shootFireball(e, a - 0.18, speed, dmg, false, kind); shootFireball(e, a + 0.18, speed, dmg, false, kind); }
    play('whoosh', 0.6, 0.8, { x: e.x, y: e.y });
  }
}
