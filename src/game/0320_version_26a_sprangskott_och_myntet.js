// ---------- Version 26A: sprängskott och myntet (agent A) ----------
// SPRÄNGSKOTT: ett träffskott (fire) som träffar din egen granat (granaten eller granatkastaren), ett sparkat krutfat eller fiendens
// granat (version 25) spränger den direkt med 1,5× radie (egna sprängämnen också 1,5× skada). Bara träffskott: vapen som skjuter
// projektiler (spik, kniv, bloss …) lämnar fire() före skottloopen. Sprängämnen närmare än V26A_ARM rutor smäller inte (inte i ansiktet).
// MYNTET: kortet SKARPSKYTTENS MYNT (mod coin). Pistolens högerklick (ALT på pekskärm, LT på handkontroll) kastar ett mynt i båge.
// Ett träffskott på myntet studsar vidare till nästa mål i fri sikt: andra mynt (kedja) → egna sprängämnen → fiendeskott och
// fiendens granat → närmaste fiendes huvud (huvudträff, minst 2× skada och +1× per mynt i kedjan). Inget mål: studsen går åt ett
// slumpat håll. Mynt på golvet är förbrukade. Högst 4 mynt, ett nytt var 4:e sekund.
const V26A = { blast: true, coin: true, slamOn: true, moveOn: true, own: -1, coins: 4, regen: 0, held: false, reg: false, slamHeld: false, slamLandT: -9, st: null };
const v26aStats = () => ({ blasts: 0, nade: 0, barrel: 0, enade: 0, armed: 0, throws: 0, coinHits: 0, chains: 0, maxChain: 0, coinDmg: 0, coinKills: 0, heads: 0, wild: 0, deflects: 0, held: 0, slams: 0, slamLands: 0, slamHits: 0, slamDmg: 0, bounces: 0, wallJumps: 0, blastJumps: 0, log: [] });
V26A.st = v26aStats();
const V26A_MAXC = 4, V26A_REGEN = 4, V26A_ARM = 1.6, V26A_MUL = 1.5;
function v26aNadePos(n) { if (n.ph) return { x: n.tx, y: n.ty }; const k = Math.min(1, n.t / n.T); return { x: n.x0 + (n.tx - n.x0) * k, y: n.y0 + (n.ty - n.y0) * k }; }
const v26aBomb = p => p.friendly && !p.dead && !p.v26hit && p.life > 0 && (p.kind === 'pgren' || p.kind === 'barrel');
function v26aTargets(hits, dx, dy, wallDist) { // krok i fire(): egna sprängämnen, mynt och fiendens granat blir träffmål längs strålen
  if (!V26A.blast && !V26A.coin) return;
  for (const p of projectiles) {
    const isC = p.kind === 'coin' && !p.dead && V26A.coin;
    if (!isC && !(V26A.blast && v26aBomb(p))) continue;
    const rx = p.x - P.x, ry = p.y - P.y, along = rx * dx + ry * dy;
    if (along <= 0.1 || along >= wallDist) continue;
    if (Math.abs(rx * dy - ry * dx) < (p.kind === 'barrel' ? 0.38 : 0.3)) hits.push({ o: p, d: along, k: isC ? 'c' : 'g' });
  }
  if (V26A.blast) for (const n of R25.live) {
    if (n.done || n.v26shot) continue;
    const q = v26aNadePos(n), rx = q.x - P.x, ry = q.y - P.y, along = rx * dx + ry * dy;
    if (along > 0.1 && along < wallDist && Math.abs(rx * dy - ry * dx) < 0.3) hits.push({ o: n, d: along, k: 'n' });
  }
}
function v26aShot(h, base, wp) { // krok i fire(): 0 = kulan förbrukad, 1 = kulan stannar (myntet styr om den), 2 = kulan går förbi
  if (h.k === 'c') { if (h.o.dead) return 2; v26aCoinHit(h.o, base, wp, 1); return 1; }
  if (h.k === 'g' && h.d < V26A_ARM) { V26A.st.armed++; return 2; } // för nära pipan
  if (h.k === 'g' && fireHeld) { V26A.st.held++; return 2; } // bara ett nytt tryck på avtryckaren: kpist eller autoeld som hålls in spränger inte granaten du nyss kastade
  return v26aBlast(h.o, h.k) ? 0 : 2;
}
function v26aBlast(o, k) { // spräng direkt; själva smällen sker i nästa bildruta i sprängämnets egen kod (granaten, krutfatet, R25)
  let x, y;
  if (k === 'n') { // fiendens granat: går ut direkt där den är (även i luften), 1,5× radie
    if (o.done || o.v26shot) return false;
    if (!o.ph) { const q = v26aNadePos(o); o.tx = q.x; o.ty = q.y; o.ph = 1; o.landT = tmr; }
    o.v26shot = true; o.t = o.fuse; o.bT = 9; o.r *= V26A_MUL; x = o.tx; y = o.ty; V26A.st.enade++;
  } else {
    if (!v26aBomb(o)) return false;
    o.v26hit = true; x = o.x; y = o.y;
    if (o.kind === 'pgren') { o.radius = (o.radius || 2.6) * V26A_MUL; o.dmg *= V26A_MUL; o.life = 0; o.beepT = 9; o.stuck = null; V26A.st.nade++; }
    else { // krutfatet: eget slag så att krutfatsgrenen i updateProjectiles (som inte tittar på dead) inte smäller en gång till
      v26aReg(); o.dead = true; o.kind = 'v26dead'; o.vx = o.vy = 0;
      fuses.push({ e: { dead: true }, x, y, t: 0.01, dmg: 30 * (1 + mod('dmg') * 0.5) * V26A_MUL, r: 2.4 * V26A_MUL, hurt: true }); V26A.st.barrel++; }
  }
  V26A.st.blasts++; const L = V26A.st.log; L.push({ t: +tmr.toFixed(2), k, at: [+x.toFixed(2), +y.toFixed(2)] }); if (L.length > 12) L.shift();
  spawnText(x, y, 'SPRÄNGSKOTT!', '#ffb040'); styleAdd(15, '+SPRÄNG'); hitStop = Math.max(hitStop, 0.05); // stilraden visar högst 9 tecken
  play('ricochet', 0.5, 0.7, { x, y });
  return true;
}
// --- myntet ---
function v26aCoinOn(wp) { return V26A.coin && wp.id === 'pistol' && mod('coin') > 0; }
function v26aReg() { if (V26A.reg) return; V26A.reg = true; PROJ_UPD_V8.coin = v26aCoinUpd; PROJ_DRAW_V8.coin = v26aCoinDraw; PROJ_UPD_V8.v26dead = () => {}; PROJ_DRAW_V8.v26dead = () => {}; } // registret finns först längre ned i filen
function v26aWeaponTick(wp, dt) { // krok i updateWeapon: mynten laddas och högerklick kastar
  if (mod('coin') <= 0) { V26A.held = aimDown; return; }
  v26aReg();
  if (V26A.coins < V26A_MAXC) { V26A.regen += dt; if (V26A.regen >= V26A_REGEN) { V26A.regen = 0; V26A.coins++; } } else V26A.regen = 0;
  const edge = aimDown && !V26A.held, toggle = !gp.active && (touch.active || settings.toggleAim); V26A.held = aimDown;
  if (!edge && toggle && aimDown && v26aCoinOn(wp)) { aimDown = false; V26A.held = false; } // siktet stod på från ett annat vapen: nästa tryck ska bli ett kast
  if (!edge || !v26aCoinOn(wp)) return;
  if (toggle) { aimDown = false; V26A.held = false; } // ALT och växla sikte slår av och på: varje tryck blir ett kast
  if (state !== 'play' || WS.state === 'holster' || WS.state === 'draw') return;
  if (V26A.coins <= 0) { play('click', 0.4, 1.6); return; }
  V26A.coins--; v26aThrow();
}
function v26aThrow() {
  const a = P.a, sp = 3.0; // flyter ungefär 1,3 s och når högst 0,9 (under taket)
  projectiles.push({ x: P.x + Math.cos(a) * 0.35, y: P.y + Math.sin(a) * 0.35, z: P.camZ - 0.08, vz: 1.8, vx: Math.cos(a) * sp + P.vx * 0.4, vy: Math.sin(a) * sp + P.vy * 0.4, kind: 'coin', friendly: true, life: 3 });
  V26A.st.throws++; play('coin', 0.7, 1.35); WS.kick = Math.max(WS.kick, 0.15);
}
function v26aCoinUpd(p, dt) { // båge med lätt tyngd; mot väggen faller det rakt ned; på golvet är det förbrukat
  p.vz -= 3.5 * dt; p.z += p.vz * dt;
  if (solid(p.x, p.y)) { p.x -= p.vx * dt; p.y -= p.vy * dt; p.vx = 0; p.vy = 0; }
  if (p.z <= 0.04 || p.life <= 0) { p.dead = true; if (p.z <= 0.04) play('coin', 0.25, 0.8, { x: p.x, y: p.y }); }
}
function v26aCoinDraw(o) { // myntet snurrar; ett litet guldsken gör det lättare att se mot mörka väggar (inte med lowfx)
  if (!settings.lowfx) drawSprite(fx.hit[1], o.x, o.y, 0.16, o.z + 0.02, false, 2, 0, 0, true, [255, 210, 90]);
  drawSprite(fx.coin[Math.floor(tmr * 14 + o.x * 3) % 4], o.x, o.y, 0.14, o.z, false, null, 0, 0.6);
}
function v26aTrail(x0, y0, z0, x1, y1, z1) { // spårljus från myntet till målet
  const n = Math.min(24, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (settings.lowfx ? 0.9 : 0.4)));
  for (let i = 1; i <= n; i++) { const k = i / n; particles.push({ x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, z: z0 + (z1 - z0) * k, vx: 0, vy: 0, vz: 0, life: 0.14, maxLife: 0.14, img: fx.hit[1], size: 0.06, add: true, tint: [255, 225, 120] }); }
}
function v26aCoinPick(c) { // prioritet: mynt → egna sprängämnen → fiendeskott och fiendens granat → närmaste fiende
  let best = null, bd = 1e9;
  const take = (o, x, y, R, k) => { const d = Math.hypot(x - c.x, y - c.y); if (d < R && d < bd && hasLOS(c.x, c.y, x, y)) { bd = d; best = { o, k, x, y }; } };
  for (const p of projectiles) if (p !== c && p.kind === 'coin' && !p.dead) take(p, p.x, p.y, 14, 'c');
  if (best) return best;
  if (V26A.blast) for (const p of projectiles) if (v26aBomb(p) && Math.hypot(p.x - P.x, p.y - P.y) >= V26A_ARM) take(p, p.x, p.y, 12, 'g');
  if (best) return best;
  for (const p of projectiles) if (!p.friendly && !p.dead && p.kind !== 'rock') take(p, p.x, p.y, 10, 'f');
  if (V26A.blast) for (const n of R25.live) if (!n.done && !n.v26shot) { const q = v26aNadePos(n); take(n, q.x, q.y, 10, 'n'); }
  if (best) return best;
  for (const e of ents) if (!e.dead && !e.dying && !e.hidden && !e.ally && !e.dormant && !(e.ghost > 0.5)) take(e, e.x, e.y, 16, 'e');
  return best;
}
function v26aCoinHit(c, base, wp, n) { // n = mynt i kedjan hittills (det här inräknat)
  c.dead = true; c.v26hit = true; const S = V26A.st; S.coinHits++; S.maxChain = Math.max(S.maxChain, n); if (n > 1) S.chains++;
  play('coin', 0.9, Math.min(2.2, 1.5 + 0.12 * n), { x: c.x, y: c.y }); hitStop = Math.max(hitStop, 0.03);
  styleAdd(n > 1 ? 8 : 10, n > 1 ? '+KEDJA ×' + n : '+MYNT'); // högst 9 tecken på stilraden
  const T = v26aCoinPick(c);
  if (!T) { const a = rnd(0, TAU), d = cast(c.x, c.y, Math.cos(a), Math.sin(a)).dist; v26aTrail(c.x, c.y, c.z, c.x + Math.cos(a) * Math.min(d, 8), c.y + Math.sin(a) * Math.min(d, 8), c.z); S.wild++; return; }
  const tz = T.k === 'e' ? Math.min(1, T.o.d.size * 0.75) : T.o.z ?? 0.3;
  v26aTrail(c.x, c.y, c.z, T.x, T.y, tz);
  if (T.k === 'c') { v26aCoinHit(T.o, base, wp, n + 1); return; }
  if (T.k === 'g' || T.k === 'n') { v26aBlast(T.o, T.k); return; }
  if (T.k === 'f') { T.o.dead = true; T.o.life = 0; play('ricochet', 0.5, 1.6, { x: T.x, y: T.y }); S.deflects++; return; }
  const e = T.o, hs = headshotCheck(e, 0, wp); e.headT = tmr; // räknas som huvudträff (stenfiender och hagel ger 1 här – golvet 2× gäller ändå)
  const dmg = base * Math.max(2, (1 + n) * Math.max(1, hs)) * (e.elite || e.boss ? 1 + mod('bossDmg') : 1);
  S.heads++; S.coinDmg += dmg; hitCrit = true; hitMark = 0.15;
  const k = hurtEnemy(e, dmg, e.x, e.y, { crit: true });
  hitKill = !!k; if (k) S.coinKills++;
  alertEnemy(e, true);
}
// --- MARKSLAG (reserv 8): ducka i luften slår ned mot golvet; landningen ger en stötvåg; hopp direkt efter ger ett studshopp ---
// Dator: Ctrl i luften. Handkontroll: duckknappen. Pekskärm: RUSA i luften med spaken bakåt eller släppt (framåt är vanlig rusning).
const V26A_SLAM = { r: 2.2, vz: -12, stam: 0.2, bounce: 0.15, minZ: 0.12 };
function v26aSlamStart() {
  if (!V26A.slamOn || P.slam || P.swim || state !== 'play' || P.jz <= V26A_SLAM.minZ || P.stam < V26A_SLAM.stam) return false;
  P.slam = true; P.slamZ = P.jz; P.jv = V26A_SLAM.vz; P.launch = null; P.stam = Math.max(0, P.stam - V26A_SLAM.stam); P.stamT = 0.9;
  play('whoosh', 0.55, 0.7); WS.punch = Math.max(WS.punch, 0.06); V26A.st.slams++;
  if (!settings.lowfx) for (let i = 0; i < 6; i++) particles.push({ x: P.x + rnd(-0.3, 0.3), y: P.y + rnd(-0.3, 0.3), z: P.jz * 0.55 + 0.6, vx: 0, vy: 0, vz: 3, life: 0.18, maxLife: 0.18, img: fx.hit[1], size: 0.04, add: true, tint: [230, 220, 200] }); // fartlinjer
  return true;
}
function v26aSlamTick(crouchKey) { // krok i updateMovement före fallet: ducka nedtryckt i luften (ny tryckning)
  const edge = crouchKey && !V26A.slamHeld; V26A.slamHeld = !!crouchKey;
  if (P.slam && (P.swim || state !== 'play')) P.slam = false;
  if (edge && !onGround()) v26aSlamStart();
}
function v26aSlamLand() { // krok i updateMovement efter fallet: stötvågen när markslaget når golvet (och väggstudsarna räknas om)
  if (P.jz <= 0) P.wj = 0;
  if (!P.slam || P.jz > 0) return;
  P.slam = false; V26A.slamLandT = tmr; const h = Math.max(0, P.slamZ || 0), S = V26A.st; S.slamLands++;
  const dmg = (4 + 0.5 * h * 10) * (1 + mod('dmg')) * (1 + mod('airDmg')); // fallhöjden räknas i tiondels rutor (hoppet når ~0,6)
  let n = 0;
  for (const e of ents) {
    if (e.dead || e.dormant || e.ally || e.dying || (e.ghost > 0.5)) continue;
    const d = Math.hypot(e.x - P.x, e.y - P.y); if (d > V26A_SLAM.r || !hasLOS(P.x, P.y, e.x, e.y)) continue;
    n++; hurtEnemy(e, dmg, e.x, e.y, { noProc: true });
    if (!e.boss && !e.guardian) { e.stun = Math.max(e.stun || 0, 0.8); if (d > 0.05) for (let i = 0; i < 4; i++) tryMove(e, (e.x - P.x) / d * 0.12, (e.y - P.y) / d * 0.12, 0.28); }
    if (typeof launchEnemy === 'function' && d < 1.2) launchEnemy(e, 3); // agent B:s jonglering, om den finns
  }
  for (const pt of pots) if (!pt.broken && Math.hypot(pt.x - P.x, pt.y - P.y) < V26A_SLAM.r) breakPot(pt);
  for (const pr of props) if (pr.def && !pr.broken && pr.def.crate && Math.hypot(pr.x - P.x, pr.y - P.y) < V26A_SLAM.r) hitProp(pr, P.x, P.y);
  S.slamHits += n; S.slamDmg = +dmg.toFixed(2);
  play('hammer_slam', 0.8, rnd(0.9, 1.05)); noise(10); P.shake = Math.max(P.shake, settings.reduceMotion ? 0.5 : 1.4); hitStop = Math.max(hitStop, n ? 0.06 : 0.02);
  if (!settings.lowfx) for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; particles.push({ x: P.x + Math.cos(a) * 0.3, y: P.y + Math.sin(a) * 0.3, z: 0.03, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4, vz: 0.3, life: 0.45, maxLife: 0.45, img: fx.parts.dust ? fx.parts.dust[0] : fx.hit[1], size: 0.12, fade: true, tint: [190, 170, 140] }); }
  if (n) styleAdd(10, '+MARKSLAG');
}
function v26aBounce() { // krok i jump(): hopp inom 0,15 s efter markslaget = studshopp (1,45× hopp)
  const since = tmr - V26A.slamLandT; // båda gränserna: tmr kan börja om (ny runda) medan slamLandT är kvar
  if (!V26A.slamOn || !onGround() || !(since >= 0 && since < V26A_SLAM.bounce) || P.stam < 0.1 || P.swim) return false;
  V26A.slamLandT = -9; P.jv = 3.4 * 1.45; P.jz = 0.001; P.stam = Math.max(0, P.stam - 0.12); P.stamT = 0.9; P.crouch = 0;
  play('jump', 0.5, 0.85); spawnPuff(P.x, P.y, 5); V26A.st.bounces++; return true;
}
// --- VÄGGSTUDS och SPRÄNGHOPP (reserv 11) ---
// Väggstuds: hopp i luften intill en vägg (inom 0,38) studsar ut från väggen, högst 3 gånger per lufttur (före dubbelhoppet).
// Spränghopp: en egen granat eller ett krutfat som smäller inom 1,2 rutor medan du är i luften eller hoppar kastar dig uppåt och bort
// från smällen; egenskadan halveras. Fiendernas smällar räknas inte (explode får veta att smällen är din via V26A.own).
const V26A_WJ = { reach: 0.38, out: 4.5, jv: 3.2, max: 3 }, V26A_BJ = { reach: 1.2, jv: 3.8, push: 8 };
function v26aWallJump() { // krok i jump()
  if (!V26A.moveOn || onGround() || P.swim || state !== 'play' || (P.wj || 0) >= V26A_WJ.max) return false;
  const R = V26A_WJ.reach, nx = (solid(P.x - R, P.y) ? 1 : 0) - (solid(P.x + R, P.y) ? 1 : 0), ny = (solid(P.x, P.y - R) ? 1 : 0) - (solid(P.x, P.y + R) ? 1 : 0);
  if (!nx && !ny) return false;
  if (nx) P.vx = nx * V26A_WJ.out; if (ny) P.vy = ny * V26A_WJ.out;
  P.jv = V26A_WJ.jv; P.wj = (P.wj || 0) + 1; P.slam = false; V26A.st.wallJumps++;
  play('jump', 0.45, 1.15 + 0.08 * P.wj); play('kick', 0.3, 1.4); spawnPuff(P.x - nx * 0.3, P.y - ny * 0.3, 3);
  return true;
}
function v26aBlastJump(x, y, pd) { // krok i explode(): true = spränghopp (halv egenskada)
  const own = V26A.own === tmr; V26A.own = -1;
  if (!own || !V26A.moveOn || pd > V26A_BJ.reach || (P.jz <= 0.001 && P.jv <= 0) || P.swim) return false;
  let dx = P.x - x, dy = P.y - y; const d = Math.hypot(dx, dy);
  if (d < 0.05) { dx = -Math.cos(P.a); dy = -Math.sin(P.a); } else { dx /= d; dy /= d; } // rakt under dig: bakåt
  P.jv = Math.max(P.jv, V26A_BJ.jv); P.jz = Math.max(P.jz, 0.002); P.vx += dx * V26A_BJ.push; P.vy += dy * V26A_BJ.push; P.slam = false; P.launch = null;
  V26A.st.blastJumps++; styleAdd(8, '+LUFTFÄRD'); say('SPRÄNGHOPP!', 0.8);
  return true;
}
function v26aSlamDash(dx, dy) { // krok i dash(): pekskärmens RUSA i luften med spaken bakåt eller släppt blir markslag
  return !dx && !dy && touch.active && !onGround() && touch.my > -0.3 && v26aSlamStart();
}
function v26aHudItem(g, y) { // ammohörnets ikonrad: fyra små mynt; redo = fyllt mynt, tomt = bara en ring (form, inte bara färg)
  return [4 * 6 - 2, x => { for (let i = 0; i < V26A_MAXC; i++) { const cx = x + i * 6, full = i < V26A.coins;
    g.fillStyle = '#000a'; g.fillRect(cx, y, 4, 6); g.fillRect(cx - 1, y + 1, 6, 4);
    g.fillStyle = full ? '#ffd24a' : '#8a7040'; g.fillRect(cx + 1, y, 2, 1); g.fillRect(cx + 1, y + 5, 2, 1); g.fillRect(cx, y + 1, 1, 4); g.fillRect(cx + 3, y + 1, 1, 4);
    if (full) { g.fillRect(cx + 1, y + 1, 2, 4); g.fillStyle = '#fff4c0'; g.fillRect(cx + 1, y + 1, 1, 1); } } }];
}
function v26aApi() { // window.__game.v26a: av/på och räknare (t120, t121)
  return { on: () => V26A.blast && V26A.coin && V26A.slamOn && V26A.moveOn, set: (k, v) => { if (k === 'blast' || k === 'coin') V26A[k] = !!v; if (k === 'slam') { V26A.slamOn = !!v; P.slam = false; } if (k === 'move') V26A.moveOn = !!v; }, st: () => V26A.st,
    slam: () => ({ on: V26A.slamOn, active: !!P.slam, jz: P.jz, jv: P.jv, landT: V26A.slamLandT, R: V26A_SLAM.r }),
    state: () => ({ blast: V26A.blast, coin: V26A.coin, slam: V26A.slamOn, move: V26A.moveOn, wj: P.wj || 0, coins: V26A.coins, regen: +V26A.regen.toFixed(2), card: mod('coin') > 0, live: (projectiles || []).filter(p => p.kind === 'coin' && !p.dead).length }),
    reset: () => { V26A.st = v26aStats(); V26A.coins = V26A_MAXC; V26A.regen = 0; }, throwCoin: () => { v26aReg(); v26aThrow(); },
    coins: () => (projectiles || []).filter(p => p.kind === 'coin' && !p.dead).map(p => ({ x: p.x, y: p.y, z: p.z })), MAX: V26A_MAXC, REGEN: V26A_REGEN, ARM: V26A_ARM };
}
const tapT = {}; // dubbeltryck på en riktning = rusning
function dirTap(code) {
  const now = performance.now();
  if (settings.doubleTapDash !== false && tapT[code] && now - tapT[code] < 260) {
    const f = code === 'KeyW' ? 1 : code === 'KeyS' ? -1 : 0, st = code === 'KeyD' ? 1 : code === 'KeyA' ? -1 : 0;
    dash(Math.cos(P.a) * f - Math.sin(P.a) * st, Math.sin(P.a) * f + Math.cos(P.a) * st); tapT[code] = 0; return;
  }
  tapT[code] = now;
}
function pickUp(it, bought) {
  let am = diff().ammo * (1 + mod('ammoMul')) * (dmod('scarce') ? 0.5 : 1);
  if (it.type === 'gold' || it.type === 'goldpile') {
    const n = Math.round((it.type === 'goldpile' ? rnd(8, 14) + run.depth * 3 : rnd(2, 5) + run.depth) * (1 + mod('goldMul')) * (floorEvent === 'bloodmoon' ? 2 : floorEvent === 'goldrain' ? 1.5 : 1) * (1 + goldRisk()) * (dmod('scarce') || dmod('giants') ? 1.5 : 1) * (it.type === 'goldpile' ? 1 + mod('goldFind') : 1));
    spawnText(it.x, it.y, `+${n}`, '#ffd24a'); // guld som plockas upp syns som siffror
    const n2 = dmod('gold') ? n : dmod('swift') ? Math.round(n * 0.5) : 0; run.gold += n2;
    run.gold += n; run.goldEarned = (run.goldEarned || 0) + n; play('coin', 0.5, rnd(0.95, 1.15)); if (it.type === 'goldpile') say(`+${n} GULD`, 1.2);
    if (it.type === 'goldpile' && lvl.biome === 'tomb' && !boss && Math.random() < 0.2) cursedTreasure(it); // förbannad skatt
    return true;
  }
  if (it.type === 'cardpick') { // kortval från elit, väktare och boss
    play('card', 0.8, 1.2);
    let cs = drawCards(3, { luck: it.luck || 0.3 });
    if (it.legend && !cs.some(c => c.rarity === 'legendarisk')) { const lg = drawCards(12, { luck: 3 }).find(c => c.rarity === 'legendarisk' && !cs.some(o => o.id === c.id)); if (lg) cs[cs.length - 1] = lg; } // efter bossar: alltid ett legendariskt
    openUI(() => draftUI(cs, { title: it.title || 'BYTE', subtitle: 'VÄLJ ETT KORT', skipLabel: 'TA INGET' }, card => { gainCard(card); closeUI(); }));
    return true;
  }
  if (it.type === 'grenade') { if (P.grenades >= GREN_MAX()) return false; const n = Math.min(GREN_MAX() - P.grenades, bought ? 1 : 2); P.grenades += n; say(`+${n} GRANAT${n > 1 ? 'ER' : ''}`, 1.5); play('pickup', 0.7, 0.8); spawnText(it.x, it.y, `+${n} GRANAT`, '#c0ff90'); return true; }
  if (it.type === 'page') { findPage(BOSS_PAGES[bossFor((cycleOf(run.depth) + 1) * (FLOORS + 1))]); return true; }
  if (it.type === 'spearpick') { spearBack(); return true; }
  if (it.type === 'legend') { giveLegend(it.legend, 'DU HITTADE'); return true; }
  if (it.type === 'dreamflask') { const n = 4; if (P.ammo.dreams >= AMMO.dreams.max) return false; P.ammo.dreams = Math.min(AMMO.dreams.max, (P.ammo.dreams || 0) + n); say(`+${n} DRÖMMAR`, 1.2); play('dream_pickup', 0.6); return true; }
  if (it.type === 'brimstone') { const n = 3; if (P.ammo.brimstone >= AMMO.brimstone.max) return false; P.ammo.brimstone = Math.min(AMMO.brimstone.max, (P.ammo.brimstone || 0) + n); say(`+${n} SVAVEL`, 1.2); play('brimstone_pickup', 0.8, 1); return true; }
  if (it.type === 'cannonballs') { const n = 3; if ((P.ammo.cannonballs || 0) >= AMMO.cannonballs.max) return false; P.ammo.cannonballs = Math.min(AMMO.cannonballs.max, (P.ammo.cannonballs || 0) + n); say(`+${n} KANONKULOR`, 1.2); play('cannonball_pickup', 0.8, 1); return true; }
  if (it.type === 'fish') { if (P.hp >= maxHp()) return false; heal(5); say('FISKRENS: +5 HÄLSA', 1.2); play('health', 0.5, 1.3); return true; }
  if (it.type === 'scrap') { const n = 6; if (P.ammo.scrap >= AMMO.scrap.max) return false; P.ammo.scrap = Math.min(AMMO.scrap.max, (P.ammo.scrap || 0) + n); say(`+${n} SKROT`, 1.2); play('scrap_pickup', 0.8, 1); return true; }
  if (it.type === 'traps') { const n = 3; if (P.ammo.traps >= AMMO.traps.max) return false; P.ammo.traps = Math.min(AMMO.traps.max, (P.ammo.traps || 0) + n); say(`+${n} FÄLLOR`, 1.2); play('pickup', 0.7, 1.2); return true; }
  if (it.type === 'stardust') { const n = 6; if (P.ammo.stars >= AMMO.stars.max) return false; P.ammo.stars = Math.min(AMMO.stars.max, (P.ammo.stars || 0) + n); say(`+${n} STJÄRNSTOFT`, 1.2); play('pickup', 0.7, 1.4); return true; }
  if (it.type === 'pinbox') { const n = 6; if (P.ammo.pins >= AMMO.pins.max) return false; P.ammo.pins = Math.min(AMMO.pins.max, (P.ammo.pins || 0) + n); say(`+${n} KÄGLOR`, 1.2); play('pin_bounce', 0.9, 1.1); return true; }
  if (it.type === 'dartquiver') { const n = 10; if (P.ammo.darts >= AMMO.darts.max) return false; P.ammo.darts = Math.min(AMMO.darts.max, (P.ammo.darts || 0) + n); say(`+${n} GIFTPILAR`, 1.2); play('pickup', 0.7, 1.2); return true; }
  if (it.type === 'chaincrate') { const n = 4; if (P.ammo.chainballs >= AMMO.chainballs.max) return false; P.ammo.chainballs = Math.min(AMMO.chainballs.max, (P.ammo.chainballs || 0) + n); say(`+${n} KEDJEKULOR`, 1.2); play('pickup', 0.7, 0.8); return true; }
  if (it.type === 'acidflask') { const n = 40; if (P.ammo.acid >= AMMO.acid.max) return false; P.ammo.acid = Math.min(AMMO.acid.max, (P.ammo.acid || 0) + n); say(`+${n} SYRA`, 1.2); play('acid_hiss', 0.25, 1.3); return true; }
  if (it.type === 'beehive') { const n = 6; if (P.ammo.bees >= AMMO.bees.max) return false; P.ammo.bees = Math.min(AMMO.bees.max, (P.ammo.bees || 0) + n); say(`+${n} BIN`, 1.2); play('bee_buzz', 0.5, 1.3); return true; }
  if (it.type === 'inkflask') { const n = 10; if (P.ammo.ink >= AMMO.ink.max) return false; P.ammo.ink = Math.min(AMMO.ink.max, (P.ammo.ink || 0) + n); say(`+${n} BLÄCK`, 1.2); play('ink_pickup', 0.6); return true; }
  if (it.type === 'sporesack') { const n = 4; if (P.ammo.spores >= AMMO.spores.max) return false; P.ammo.spores = Math.min(AMMO.spores.max, (P.ammo.spores || 0) + n); say(`+${n} SPORER`, 1.2); play('spore_burst', 0.4, 1.4); return true; }
  if (it.type === 'gear') { const n = Math.round(6 * (1 + mod('gearFind'))); if (P.ammo.gears >= AMMO.gears.max) return false; P.ammo.gears = Math.min(AMMO.gears.max, (P.ammo.gears || 0) + n); say(`+${n} KUGGHJUL`, 1.2); play('gear_pickup', 0.6); return true; }
  if (it.type === 'feather') { run.featherFloor = run.depth; say('FJÄDERN: DUBBELHOPP PÅ DEN HÄR VÅNINGEN', 2); play('feather', 0.7); firstHint('feather', 'HOPPA IGEN I LUFTEN FÖR ETT DUBBELHOPP.'); return true; }
  if (it.type === 'tome') { gainXp(xpNeed(run.lvl || 1) * 0.6); say('KUNSKAPSBOKEN: ERFARENHET', 1.5); play('tome_read', 0.7); stat('tomes'); return true; }
  if (it.type === 'battery') { if (P.battery >= 100) return false; P.battery = Math.min(100, (P.battery || 0) + 40); say('LAMPOLJA: +40 % BATTERI', 1.5); play('pickup', 0.6, 1.2); return true; }
  if (it.type === 'stones') { P.stones = Math.min(12, (P.stones || 0) + 3); say('+3 STENAR (G KASTAR)', 1.5); play('stone_land', 0.6); return true; }
  if (it.type === 'knifepick') { if (P.ammo.knives >= AMMO.knives.max) return false; P.ammo.knives++; play('knife_pickup', 0.5, rnd(0.95, 1.1)); return true; }
  if (it.type === 'rune') { giveRune(it.rune || RUNE_IDS[(Math.random() * RUNE_IDS.length) | 0]); return true; }
  if (it.type === 'meat') { run.meat = (run.meat || 0) + 1; say('KÖTT – LAGA MAT VID EN LÄGERELD', 1.5); play('pickup', 0.6, 0.7); return true; }
  if (it.type === 'arrowpick') { if (P.ammo.arrows >= AMMO.arrows.max) return false; P.ammo.arrows++; play('arrow_pickup', 0.5, rnd(0.95, 1.1)); return true; }
  if (it.type === 'potion') { const id = it.pot || randomPotion(); if (!givePotion(id, it.strong, true)) { givePotion(id, false); return false; } say(`DU FICK: ${potName(P.potions[P.potions.length - 1])}`, 2); play('pickup', 0.6, 1.3); spawnText(it.x, it.y, potKnown(id) ? POTIONS[id].name : 'DRYCK', potKnown(id) ? POTIONS[id].color : '#c0c0c0'); return true; }
  if (it.type === 'key') { P.keys++; say('DU HITTADE EN NYCKEL', 2); play('key', 0.8); return true; }
  if (it.type === 'scroll') { seen.fill(1); run.mapRevealed = true; say('SKATTKARTAN VISAR HELA VÅNINGEN', 3); play('map_unroll', 0.8); if (!showMap) showMap = 1; return true; }
  if (it.type === 'health') { if (P.hp >= maxHp()) return false; const n = Math.round(30 * (1 + mod('healMul'))); heal(n); say(`+${n} HÄLSA`, 1.5); play('health', 0.7); spawnText(it.x, it.y, `+${n} HP`, '#ff7060'); }
  else if (it.type === 'shard') { if (P.armor >= 200) return false; P.armor = Math.min(200, P.armor + 10); say('+10 RUSTNING', 1); play('armor', 0.5, 1.4); spawnText(it.x, it.y, '+10', '#9fc4ff'); }
  else if (it.type === 'armor') { if (P.armor >= 200) return false; P.armor = Math.min(200, P.armor + 50); say('+50 RUSTNING', 1.5); play('armor', 0.7); }
  else if (it.type === 'ammo' && run.pact) { // pakten: all ammo blir vapnets egen
    const k = pactAmmo(), n = Math.round(({ p9: 30, r556: 28, shells: 9, bolts: 8, flares: 5, fuel: 60, lgren: 4, none: 0, nails: 40, arrows: 6, mana: 0, knives: 6, balls: 5, harpoons: 3, crystals: 18, gears: 6, spores: 4, ink: 8, bees: 5, dreams: 3, chainballs: 3, acid: 40, pins: 4, darts: 8, stars: 3, traps: 2, scrap: 4, brimstone: 2, cannonballs: 2 }[k] || 0) * am);
    if (P.ammo[k] >= AMMO[k].max && !bought) return false;
    P.ammo[k] = Math.min(AMMO[k].max, P.ammo[k] + n); say(`AMMO +${n} ${AMMO[k].name}`, 2); play('pickup', 0.7);
  } else if (it.type === 'ammo') {
    const full = Object.keys(AMMO).every(k => P.ammo[k] >= AMMO[k].max);
    if (full && !bought) return false;
    const has = id => P.has[weaponIndex(id)];
    am *= it.mult || 1;
    const add = { p9: Math.round(18 * am), r556: Math.round((has('rifle') || has('sniper') ? 20 : 8) * am), shells: Math.round((has('shotgun') || has('dbshotgun') ? 6 : 3) * am),
      bolts: Math.round((has('crossbow') ? 5 : 0) * am), flares: Math.round((has('flaregun') ? 3 : 0) * am), fuel: Math.round((has('flamer') ? 40 : 0) * am), lgren: Math.round((has('launcher') ? 3 : 0) * am),
      nails: Math.round((has('nailgun') ? 30 : 0) * am), arrows: Math.round((has('bow') ? 4 : 0) * am), knives: Math.round((has('knives') ? 4 : 0) * am), balls: Math.round((has('musket') ? 3 : 0) * am), harpoons: Math.round((has('harpoon') ? 2 : 0) * am), crystals: Math.round((has('prism') ? 14 : 0) * am), gears: Math.round((has('sawlauncher') ? 4 : 0) * am), spores: Math.round((has('sporelauncher') ? 2 : 0) * am), ink: Math.round((has('runebook') ? 4 : 0) * am), bees: Math.round((has('hivelauncher') ? 3 : 0) * am), dreams: Math.round((has('dreamstaff') ? 2 : 0) * am), chainballs: Math.round((has('chaincannon') ? 2 : 0) * am), acid: Math.round((has('acidsprayer') ? 25 : 0) * am), pins: Math.round((has('pinthrower') ? 3 : 0) * am), darts: Math.round((has('blowgun') ? 6 : 0) * am), stars: Math.round((has('starlance') ? 3 : 0) * am), traps: Math.round((has('trapthrower') ? 2 : 0) * am), scrap: Math.round((has('blunderbuss') ? 4 : 0) * am), brimstone: Math.round((has('brimstone') ? 2 : 0) * am), cannonballs: Math.round((has('bombard') ? 2 : 0) * am) };
    add[WEAPONS[P.weapon].ammo] = Math.round(add[WEAPONS[P.weapon].ammo] * 1.5); // mer till vapnet du håller
    for (const k in add) P.ammo[k] = Math.min(AMMO[k].max, P.ammo[k] + add[k]);
    say('AMMO ' + Object.keys(add).filter(k => add[k] > 0).map(k => `+${add[k]} ${AMMO[k].name}`).join(' '), 2); play('pickup', 0.7);
    const wk = WEAPONS[P.weapon].ammo; if (add[wk]) spawnText(it.x, it.y, `+${add[wk]} ${AMMO[wk].name}`, '#ffd24a');
  } else {
    const i = weaponIndex(it.type), w = WEAPONS[i];
    if (cmode('pistol') && w.id !== 'pistol') { P.ammo.p9 = Math.min(AMMO.p9.max, P.ammo.p9 + 30); run.gold += 20; say(`BARA PISTOL: ${w.name} BLIR AMMO OCH 20 GULD`, 2.5); play('coin', 0.7); return true; }
    if (run.pact && w.id !== run.pact) { // pakten: andra vapen blir ammo och guld
      const k = pactAmmo(); P.ammo[k] = Math.min(AMMO[k].max, P.ammo[k] + ({ p9: 30, r556: 30, shells: 8, bolts: 8, flares: 5, fuel: 60, lgren: 4, none: 0, nails: 40, arrows: 6, mana: 0, knives: 6, balls: 5, harpoons: 3, crystals: 18, gears: 6, spores: 4, ink: 8, bees: 5, dreams: 3, chainballs: 3, acid: 40, pins: 4, darts: 8, stars: 3, traps: 2, scrap: 4, brimstone: 2, cannonballs: 2 }[k] || 0)); run.gold += 20;
      say(`EDEN: ${w.name} BLIR AMMO OCH 20 GULD`, 2.5); play('coin', 0.7); return true;
    }
    const first = !P.has[i];
    P.has[i] = true;
    if (first) P.mags[i] = effMag(i);
    P.ammo[w.ammo] = Math.min(AMMO[w.ammo].max, P.ammo[w.ammo] + ({ p9: 30, r556: 30, shells: 8, bolts: 10, flares: 6, fuel: 80, lgren: 8, none: 0, nails: 70, arrows: 12, mana: 0, knives: 10, balls: 8, harpoons: 5, crystals: 30, gears: 10, spores: 6, ink: 12, bees: 8, dreams: 5, chainballs: 3, acid: 50, pins: 6, darts: 12, stars: 6, traps: 3, scrap: 6, brimstone: 3, cannonballs: 3 }[w.ammo] || 0));
    say('DU HITTADE: ' + w.name, 2.5); play('weapon', 0.8);
    if (first && settings.autoSwitch !== false) switchWeapon(i);
  }
  return true;
}
function updateWeapon(dt) {
  legendCtx = legendOf(WEAPONS[P.weapon].id);
  const wp = WEAPONS[P.weapon];
  WS.t += dt; WS.shot += dt; WS.cd -= dt;
  WS.spread = Math.max(0, WS.spread - dt * 0.12);
  const moving = Math.hypot(P.vx, P.vy) / 3.1;
  WS.spread = Math.max(WS.spread, moving * 0.012 * (1 - WS.aim * 0.7));
  WS.swayX *= Math.pow(0.0001, dt); WS.swayY *= Math.pow(0.0001, dt);
  const wantAim = aimDown && (WS.state === 'idle') && !WEAPONS[P.weapon].melee && !WEAPONS[P.weapon].scimitar && !WEAPONS[P.weapon].flail && !WEAPONS[P.weapon].blunderbuss && !WEAPONS[P.weapon].trident && !WEAPONS[P.weapon].brimstone && !WEAPONS[P.weapon].hookchain && !WEAPONS[P.weapon].bombard ? 1 : 0;
  WS.aim += (wantAim - WS.aim) * Math.min(1, dt * 10);
  if (v26aCoinOn(wp)) WS.aim = 0; // version 26A: med myntkortet kastar pistolens högerklick mynt i stället för att sikta
  WS.punch = Math.max(0, WS.punch - dt * 0.35); WS.kick = Math.max(0, WS.kick - dt); WS.nameT = Math.max(0, WS.nameT - dt); P.kickT = Math.max(0, P.kickT - dt);
  plane = BASE_PLANE * (1 - WS.aim * (wp.zoom || 0.22)) * (1 + WS.punch) * (1 + P.runK * 0.07);
  if (WS.inspect > 0) WS.inspect = Math.max(0, WS.inspect - dt);
  if (WS.throwT >= 0) WS.throwT += dt;
  // ladda om automatiskt efter en stund utan skott (inställning)
  WS.idleT = WS.state === 'idle' && !mouseDown ? WS.idleT + dt : 0;
  if (settings.autoReload !== false && WS.idleT > 2.2 && P.mags[P.weapon] < effMag(P.weapon) * 0.5 && P.ammo[wp.ammo] > 0) { WS.idleT = 0; startReload(); }
  if (mod('ammoRegen') > 0) { P.ammoAcc = (P.ammoAcc || 0) + dt * mod('ammoRegen') * effMag(P.weapon); if (P.ammoAcc >= 1) { const n = Math.floor(P.ammoAcc); P.ammoAcc -= n; P.ammo[wp.ammo] = Math.min(AMMO[wp.ammo].max, P.ammo[wp.ammo] + n); } }
  if (WS.state === 'holster' && WS.t >= 0.14) { P.weapon = WS.next; WS.state = 'draw'; WS.t = 0; WS.nameT = 1.6; }
  else if (WS.state === 'draw' && WS.t >= drawTime()) { WS.state = 'idle'; WS.t = 0; }
  else if (WS.state === 'reload') {
    if (wp.shellReload) {
      if (WS.t >= shellSeg(WS.shellPhase)) {
        WS.t = 0;
        if (WS.shellPhase === 'start') WS.shellPhase = 'step';
        else if (WS.shellPhase === 'step') {
          P.mags[P.weapon]++; P.ammo.shells--; play('shell', 0.5, rnd(1.1, 1.3));
          if (P.mags[P.weapon] >= effMag(P.weapon) || P.ammo.shells <= 0) WS.shellPhase = 'end';
        } else { WS.state = 'idle'; play('reload', 0.45, 1.4); }
      }
    } else {
      const dur = wp.reload * reloadMul() * (wp.musket && up('mk_fast') ? 0.6 : 1);
      if (!WS.loaded && WS.t >= dur * 0.65) { WS.loaded = true; finishReload(); play('click', 0.5, 0.9); }
      if (WS.t >= dur) { WS.state = 'idle'; WS.loaded = false; }
    }
  }
  if (WS.state !== 'reload') WS.loaded = false;
  if (touch.tap > 0) touch.tap -= dt;
  if (P.iframe > 0) P.iframe -= dt;
  const trig = mouseDown || touch.tap > 0 || touch.autoFire;
  weaponV9Tick(wp, dt); weaponV11Tick(wp, dt); weaponV13Tick(wp, dt); weaponV15Tick(wp, dt); weaponV16Tick(wp, dt); weaponV17Tick(wp, dt, trig); weaponV18Tick(wp, dt, trig); weaponV19Tick(wp, dt, trig); weaponV20Tick(wp, dt, trig); weaponV21Tick(wp, dt, trig); weaponV22Tick(wp, dt, trig); weaponV23Tick(wp, dt, trig);
  v26aWeaponTick(wp, dt); // version 26A: myntet
  if (weaponV7Tick(wp, dt, trig)) return;
  if (wp.melee) { // yxan: håll för laddat slag, högerklick kastar
    if (trig && WS.state === 'idle' && WS.cd <= 0) { WS.charge = (WS.charge || 0) + dt; if (WS.charge > 0.5 && !WS.chargeSnd) { WS.chargeSnd = true; play('axe_charge', 0.4, 1.3); } }
    else if (!trig && WS.charge > 0) { const c = WS.charge >= 0.5; WS.charge = 0; WS.chargeSnd = false; if (canFire()) axeSwing(c); }
    if (aimDown && !WS.aimHeld) axeThrow(); WS.aimHeld = aimDown;
    fireHeld = trig; return;
  }
  if (weaponV6Tick(wp, dt, trig)) return;
  if (wp.flame && aimDown && up('fl_wall') && !WS.aimHeld) flameWall(); if (!wp.nail) WS.aimHeld = aimDown;
  if (flameSnd && (!trig || !wp.flame || P.mags[P.weapon] <= 0)) { try { flameSnd.s.stop(); } catch (e) { /* stoppad */ } flameSnd = null; if (wp.flame) play('flamer_end', 0.4); }
  WS.spin = trig && up('spin') ? Math.min(2, WS.spin + dt) : Math.max(0, WS.spin - dt * 3);
  WS.focus = up('focus') && WS.aim > 0.8 && WS.state === 'idle' ? Math.min(1, WS.focus + dt) : 0;
  if (trig && (wp.auto || up('fan') || !fireHeld)) fire();
  fireHeld = trig;
}
const hasMod = (e, id) => !!e.elite && (e.elite.id === id || (e.elite2 && e.elite2.id === id));
function eliteTick(e, dt) { // elitegenskaper som verkar över tid
  if (!e.elite) return;
  if (!settings.lowfx && Math.random() < dt * 5 && fx.parts.ember) particles.push({ x: e.x + rnd(-0.3, 0.3), y: e.y + rnd(-0.3, 0.3), z: rnd(0, 0.3), vx: 0, vy: 0, vz: 0.8, life: 0.7, maxLife: 0.7, frames: fx.parts.ember, img: fx.parts.ember[0], size: 0.06, add: true, tint: e.elite.tint, drift: true }); // glödande aura
  if (hasMod(e, 'frost') && Math.hypot(P.x - e.x, P.y - e.y) < 2.6) { P.slowT = Math.max(P.slowT, 0.3); if (Math.random() < dt * 3) particles.push({ x: P.x + rnd(-0.6, 0.6), y: P.y + rnd(-0.6, 0.6), z: rnd(0.2, 0.6), vx: 0, vy: 0, vz: -0.2, life: 0.6, maxLife: 0.6, img: fx.hit[1], size: 0.05, add: true, tint: [170, 230, 255], drift: true }); }
  eliteV9Tick(e, dt);
  if (hasMod(e, 'flicker')) e.ghost = 0.35 + 0.35 * Math.sin(tmr * 4 + e.x);
  if (hasMod(e, 'stalker')) e.ghost = Math.hypot(P.x - e.x, P.y - e.y) < 2.5 || e.state === 'attack' ? 0 : 0.9; // osynlig tills den anfaller
  if (hasMod(e, 'caller') && !e.called && e.hp < e.maxHp * 0.3) { e.called = true; say('ELITEN KALLAR PÅ HJÄLP!', 1.5); play('roar', 0.7, 0.8, { x: e.x, y: e.y }); for (let i = 0; i < 2; i++) { const a = rnd(0, TAU), x = e.x + Math.cos(a) * 1.5, y = e.y + Math.sin(a) * 1.5; if (!solid(x, y)) { const o = makeEnemy(e.type, x, y); o.alert = true; o.minion = true; ents.push(o); totalEnemies++; spawnPuff(x, y, 5); } } }
  if (hasMod(e, 'regen') && tmr - (e.lastHurt || 0) > 2 && e.hp < e.maxHp) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.04 * dt); if (Math.random() < dt * 4) spawnPuff(e.x, e.y, 1); }
  if (hasMod(e, 'teleport') && e.alert) {
    e.tpT = (e.tpT ?? 3) - dt;
    const d = Math.hypot(P.x - e.x, P.y - e.y);
    if (e.tpT <= 0 && d > 3) { e.tpT = rnd(3.5, 5); const a = Math.atan2(e.y - P.y, e.x - P.x) + rnd(-1, 1), r = rnd(1.6, 2.4), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
      if (freeSpot(x, y, 0.3) && hasLOS(P.x, P.y, x, y)) { spawnPuff(e.x, e.y, 6); e.x = x; e.y = y; spawnPuff(x, y, 6); play('whoosh', 0.6, 1.8, { x, y }); } }
  }
}
function statusFx(e, dt) { // syns på fienden: glöd när den brinner, bubblor av gift, frost när den är långsam
  if (settings.lowfx || !fx.parts.ember) return;
  const pick = e.burn > 0 ? [255, 140, 50] : e.poison > 0 ? [120, 255, 90] : e.slow > 0 ? [140, 200, 255] : null;
  if (pick && Math.random() < dt * 6) particles.push({ x: e.x + rnd(-0.2, 0.2), y: e.y + rnd(-0.2, 0.2), z: rnd(0.2, 0.8) * e.d.size, vx: 0, vy: 0, vz: 0.6, life: 0.6, maxLife: 0.6, frames: fx.parts.ember, img: fx.parts.ember[0], size: 0.05, add: true, tint: pick, drift: true });
}
function freeze(e, t) {
  if (e.boss) { e.slow = Math.max(e.slow, t); return; }
  if (!(e.frozen > 0)) play('freeze', 0.5, rnd(0.9, 1.1), { x: e.x, y: e.y });
  e.frozen = Math.max(e.frozen || 0, t); e.burn = 0;
}
function statusTick(e, dt) { // brand och långsamhet
  statusFx(e, dt);
  if (e.d.fireproof) e.burn = 0; // eldväsen brinner inte
  efx2Status(e); // version 25.1: lågor och giftvirvlar (Effekseer)
  if (e.frozen > 0) e.frozen -= dt;
  e.slow = Math.max(0, e.slow - dt); e.haste = Math.max(0, (e.haste || 0) - dt);
  if (e.burn > 0 && !e.panic && Math.random() < 0.5) e.panic = rnd(0, TAU); else if (e.burn <= 0) e.panic = 0;
  if (e.burn > 0 && e.panic && Math.random() < dt * 1.5) e.panic += rnd(-1.2, 1.2);
  if (e.bleed > 0) { // blödning: yxan och blodkort
    e.bleed -= dt; e.bleedAcc = (e.bleedAcc || 0) + dt;
    if (e.bleedAcc >= 0.4) { e.bleedAcc = 0; if (fx.parts.blood_trail) particles.push({ x: e.x + rnd(-0.1, 0.1), y: e.y + rnd(-0.1, 0.1), z: 0.4, vx: 0, vy: 0, vz: 0, life: 0.6, img: fx.parts.blood_trail[(Math.random() * 2) | 0], size: 0.05, grav: true }); hurtEnemy(e, 0.7 * (1 + mod('dmg')) * (1 + mod('meleeDmg') * 0.5), e.x, e.y, { noProc: true, quiet: true }); if (e.dead) return; }
  }
  if (e.poison > 0) { // giftspetsen
    e.poison -= dt; e.poisonAcc = (e.poisonAcc || 0) + dt;
    if (e.poisonAcc >= 0.5) { e.poisonAcc = 0; hurtEnemy(e, Math.min(e.maxHp * 0.05, 2.5) * (1 + mod('dmg')), e.x, e.y, { noProc: true, quiet: true }); if (e.dead) return; }
  }
  if (e.burn > 0) {
    e.burn -= dt; e.burnAcc += dt;
    if (e.burnAcc >= 0.5) { e.burnAcc = 0; hurtEnemy(e, 0.8 * (1 + mod('dmg')), e.x, e.y, { noProc: true, quiet: true }); }
  }
}
function wispBurst(e) { // frostexplosion: skadar, saktar ned och fryser marken
  if (e.burst) return; e.burst = true; e.hp = 0; e.gibbed = true; killEnemy(e);
}
function frostBurst(x, y) {
  play('wisp_burst', 0.8, 1, { x, y }); spawnPuff(x, y, 6);
  for (let i = 0; i < 10; i++) { const a = rnd(0, TAU), sp = rnd(1, 3), f = fx.parts.ice; particles.push({ x, y, z: 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(0.5, 2), life: 1, img: f ? f[i % f.length] : fx.hit[1], size: 0.07, grav: true, bounce: true }); }
  if (Math.hypot(P.x - x, P.y - y) < 1.8) { hurtPlayer(8 * Math.max(0.2, 1 - mod('coldResist')), x, y, 'proj'); P.slowT = Math.max(P.slowT, 2.5 * Math.max(0.2, 1 - mod('coldResist'))); }
  for (const o of ents) if (!o.dead && !o.boss && Math.hypot(o.x - x, o.y - y) < 1.8) freeze(o, 1.5);
  for (let cy = Math.max(1, (y - 1) | 0); cy <= Math.min(mh - 2, (y + 1) | 0); cy++) for (let cx = Math.max(1, (x - 1) | 0); cx <= Math.min(mw - 2, (x + 1) | 0); cx++) if (map[cy][cx] === '.') { map[cy][cx] = ':'; cellFloor[cy * mw + cx] = animTex.ice ?? cellFloor[cy * mw + cx]; } // frusen mark
}
function bomberBlow(e) { if (e.dead) return; e.lit = undefined; e.hp = 0; e.gibbed = true; killEnemy(e); }
const spores = [], icicles = [];
function updateIcicles(dt) {
  for (const ic of icicles) {
    if (ic.fall < 0) continue; ic.fall += dt;
    if (ic.fall > 0.45 && !ic.hit) { ic.hit = true; play('icicle_fall', 0.7, 1, { x: ic.x, y: ic.y }); P.shake = Math.max(P.shake, 0.3);
      for (const e of ents) if (!e.dead && !e.dormant && Math.hypot(e.x - ic.x, e.y - ic.y) < 0.9) hurtEnemy(e, 14, e.x, e.y, { noProc: true, boom: true });
      if (Math.hypot(P.x - ic.x, P.y - ic.y) < 0.8) hurtPlayer(10, ic.x, ic.y);
      for (let i = 0; i < 6; i++) { const f = fx.parts.ice; particles.push({ x: ic.x, y: ic.y, z: 0.1, vx: rnd(-1.5, 1.5), vy: rnd(-1.5, 1.5), vz: rnd(1, 2), life: 0.8, img: f ? f[i % f.length] : fx.hit[1], size: 0.06, grav: true, bounce: true }); } }
  }
  for (let i = icicles.length - 1; i >= 0; i--) if (icicles[i].hit && icicles[i].fall > 1) icicles.splice(i, 1);
}
function sporeCloud(x, y) {
  spores.push({ x, y, t: 4 }); play('spore', 0.6, rnd(0.9, 1.1), { x, y });
}
function updateSpores(dt) {
  for (const c of spores) {
    c.t -= dt;
    efx2Ground(c, 'poison'); // version 25.1: giftmoln (Effekseer)
    if (!settings.lowfx && Math.random() < dt * 10) { const f = fx.parts.spore || fx.hit; particles.push({ x: c.x + rnd(-0.8, 0.8), y: c.y + rnd(-0.8, 0.8), z: rnd(0.05, 0.6), vx: rnd(-0.2, 0.2), vy: rnd(-0.2, 0.2), vz: 0.15, life: 1, maxLife: 1, frames: f, img: f[0], size: 0.12, add: true, tint: [170, 255, 120], drift: true, fade: true }); }
    if (Math.hypot(P.x - c.x, P.y - c.y) < 1.3 && mod('hazardImmune') <= 0) { P.poisonT = Math.max(P.poisonT || 0, 2.5); run.cause = 'SVAMPMAN'; }
  }
  for (let i = spores.length - 1; i >= 0; i--) if (spores[i].t <= 0) spores.splice(i, 1);
}
function wakeMimic(e) {
  e.dormant = false; totalEnemies++; alertEnemy(e); e.state = 'attack'; e.t = 0; e.cd = 0.4; e.didHit = false; P.shake = Math.max(P.shake, 0.8);
  if (e.type === '+') { play('shield_block', 0.9, 0.7, { x: e.x, y: e.y }); say('RUSTNINGEN RÖR SIG!', 1.5); return; }
  if (e.type === 'Ö') { play('gargoyle_wake', 0.9, 1, { x: e.x, y: e.y }); say('STATYN VAKNAR!', 1.5); return; }
  play('chest', 0.9, 0.7, { x: e.x, y: e.y }); play('roar', 0.6, 1.5, { x: e.x, y: e.y }); say('KISTAN LEVER!', 1.5);
}
