function update(dt) {
  tmr += dt;
  if (state === 'play' && levelBanner <= 0.5 && bossBanner <= 0.5 && msgs.length) msgs[0].t -= dt * (msgs.length > 1 ? 2 : 1); // bara det synliga meddelandet räknar ned – dubbelt så fort när fler väntar i kön
  while (msgs.length && msgs[0].t <= 0) msgs.shift();
  P.hurt = Math.max(0, P.hurt - dt); P.pick = Math.max(0, P.pick - dt * 2); P.flash = Math.max(0, P.flash - dt); P.shake = Math.max(0, P.shake - dt * 3);
  // rekyl återhämtar sig mot ursprungligt sikte
  if (state !== 'dead' || settings.reduceMotion) P.pitch -= P.pitch * Math.min(1, dt * 9); const ry = P.ryaw * Math.min(1, dt * 5); P.a -= ry; P.ryaw -= ry;
  P.burstT -= dt; if (P.burstT <= 0) P.burst = 0;
  hitMark = Math.max(0, hitMark - dt); bossBanner = Math.max(0, bossBanner - dt); levelBanner = Math.max(0, levelBanner - dt);
  for (const h of hurtDir) h.t -= dt * 1.2;
  hurtDir = hurtDir.filter(h => h.t > 0);
  for (const n of numbers) { n.t -= dt; n.z += dt * 0.6; }
  while (numbers.length && numbers[0].t <= 0) numbers.shift();
  for (const c of chests) if (c.open) c.t += dt;
  updateParticles(dt);
  for (const f of flashes) f.t -= dt; while (flashes.length && flashes[0].t <= 0) flashes.shift();
  P.boom = Math.max(0, P.boom - dt);
  if (map && state === 'play') updateWeather(dt);
  if (state === 'dead' || state === 'runover') { P.deadT += dt; P.camZ = Math.max(0.12, 0.5 - P.deadT * 0.8); if (state === 'dead' && !settings.reduceMotion) { P.roll += (0.55 - P.roll) * Math.min(1, dt * 1.6); P.pitch += (-24 - P.pitch) * Math.min(1, dt * 2.2); P.deathPitch = true; } return; } // MENY: kameran glider ned mot golvet och lägger sig på sidan
  if (state !== 'play') return;
  levelTime += dt; run.time += dt;
  if (mod('regen') > 0) heal(mod('regen') * dt, true);
  P.shieldT -= dt; if (P.shieldT <= 0 && P.shield < mod('shield')) P.shield = Math.min(mod('shield'), P.shield + dt * 10);
  P.haste = Math.max(0, P.haste - dt);
  const turn = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
  P.a += turn * 2.4 * dt * (1 - WS.aim * 0.4);
  // mjuk rörelse med acceleration och friktion
  let fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  let str = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  if (touch.active) { // mobil: analog joystick och dra-för-att-vrida
    fwd -= touch.my; str += touch.mx; if (autoWalk && settings.oneHand && !touch.mag) fwd += 1; // enhandsläget: gå framåt
    const overEnemy = ents.some(e => !e.dead && Math.abs(Math.atan2(Math.sin(Math.atan2(e.y - P.y, e.x - P.x) - P.a), Math.cos(Math.atan2(e.y - P.y, e.x - P.x) - P.a))) < Math.max(0.03, 0.3 / Math.hypot(e.x - P.x, e.y - P.y)));
    P.a += touch.look * 0.011 * settings.sens * (1 - WS.aim * 0.35) * (overEnemy ? 0.55 : 1);
    if (settings.mouseLook === true && touch.lookY) lookBy(touch.lookY * 0.011 * settings.sens * (1 - WS.aim * 0.35)); // lodrätt drag (pekskärm, om inställningen är på)
    WS.swayX = clamp(WS.swayX + touch.look * 0.25, -10, 10); WS.swayY = clamp(WS.swayY + touch.lookY * 0.15, -6, 6);
    touch.look = 0; touch.lookY = 0;
  }
  if (bossIntro > 0 && boss) { bossIntro -= dt; let da = Math.atan2(boss.y - P.y, boss.x - P.x) - P.a; da = Math.atan2(Math.sin(da), Math.cos(da)); P.a += da * Math.min(1, dt * 4); fwd = 0; str = 0; if (mouseDown || keys.Space) bossIntro = 0; } // bossintro: kameran vänder sig mot bossen
  if (P.reverseT > 0) { P.reverseT -= dt; fwd = -fwd; str = -str; } // faraonens förbannelse
  if (P.pullT > 0 && P.pullFrom) { P.pullT -= dt; const d = Math.hypot(P.pullFrom.x - P.x, P.pullFrom.y - P.y); if (d > 1.2) tryMove(P, (P.pullFrom.x - P.x) / d * dt * 3.2, (P.pullFrom.y - P.y) / d * dt * 3.2, 0.24); } // bandaget drar
  if (P.confT > 0) { P.confT -= dt; P.a += Math.sin(tmr * 3.1) * dt * 0.9; str += Math.sin(tmr * 2.3) * 0.35; } // bansheens skrik: du tappar fotfästet
  updateMovement(dt, fwd, str);
  if (Math.hypot(P.vx, P.vy) > 1) { // gå in i en stängd dörr så öppnas den
    const nx = P.x + P.vx / Math.hypot(P.vx, P.vy) * 0.45, ny = P.y + P.vy / Math.hypot(P.vx, P.vy) * 0.45, d = doorAt(nx, ny);
    if (d && d.oneway) v24Bump(d); else // version 24: enkelriktad genvägsdörr
    if (d && !d.secret && !d.gate && !d.arena && d.target === 0 && cellAt(nx, ny) === 'D') { d.target = 1; play('door', 0.6, 1, { x: d.x + 0.5, y: d.y + 0.5 }); }
  }
  updateV24(dt); // version 24: genvägar, bakhåll och ledtrådar
  updateV27(dt); // version 27: scenernas namn när man kliver in
  updateV28(dt); // version 28: scenernas namn och glimten genom fönstren
  for (const e of ents) if (!e.dead && !e.dying && !e.attached) pushOut(P, e.x, e.y, e.boss ? 1.1 : 0.55); // en fastsatt igel knuffar inte spelaren
  for (const pt of pots) if (!pt.broken) pushOut(P, pt.x, pt.y, 0.45);
  for (const c of chests) pushOut(P, c.x, c.y, 0.5);
  const speed = Math.hypot(P.vx, P.vy);
  P.bobAmp += (clamp(speed / 3.1 * (P.runK > 0.5 && !settings.reduceMotion ? 1.2 : 1), 0, 1.6) - P.bobAmp) * Math.min(1, dt * 8);
  P.bob += dt * (4 + speed * 2.2);
  if (speed > 0.8 && onGround()) { stepT -= dt * speed / 3.1; if (stepT <= 0) { const st = stepSound(); play(st[0], st[1] * (P.crouch > 0.5 ? 0.4 : 1), rnd(0.9, 1.1) * st[2]); stepT = 0.42; if (P.crouch < 0.5) noise(speed > 4 ? 5 : 1.8); } } // springande fotsteg hörs
  for (const key in doors) { const d = doors[key]; if (d.target === 0 && d.open > 0 && occupied(d)) { if (d.arena) arenaClearDoor(d); else d.target = 1; } d.open += Math.sign(d.target - d.open) * Math.min(Math.abs(d.target - d.open), dt * (d.secret ? 0.6 : 1.4)); }
  updateFlow();
  updateWeapon(dt);
  // föremål (guld dras till spelaren, magnetkort gäller allt)
  const reach = 0.55, mag = mod('magnet');
  for (const it of items) {
    if (it.taken) continue;
    if (!settings.lowfx && Math.random() < dt * 0.6 && Math.hypot(it.x - P.x, it.y - P.y) < 8) particles.push({ x: it.x + rnd(-0.1, 0.1), y: it.y + rnd(-0.1, 0.1), z: rnd(0.05, 0.3), vx: 0, vy: 0, vz: 0, life: 0.3, maxLife: 0.3, img: fx.hit[1], size: 0.04, add: true, tint: [255, 250, 200], fade: true }); // glänser
    if (it.hop > 0) { it.hop -= dt; const ox = it.x, oy = it.y; it.x += it.hvx * dt; it.y += it.hvy * dt; if (solid(it.x, it.y)) { it.x = ox; it.y = oy; } }
    const d = Math.hypot(it.x - P.x, it.y - P.y);
    const pull = (it.type === 'gold' || it.type === 'goldpile' ? 1.2 : 0) + mag;
    if (pull > 0 && d < pull + reach && d > 0.05) { it.x += (P.x - it.x) / d * dt * 4; it.y += (P.y - it.y) / d * dt * 4; }
    if (d > reach) continue;
    if (!pickUp(it)) continue;
    it.taken = true; P.pick = it.type.startsWith('gold') ? 0.3 : 1; score += 25; if (!it.drop) itemsTaken++;
  }
  hint = '';
  for (const pr of props) if (pr.def && pr.def.use && !(pr.used && pr.def.use !== 'anvil') && Math.hypot(pr.x - P.x, pr.y - P.y) < 1.3) hint = (isTouch() ? 'HANDEN: ' : 'E: ') + (pr.poisoned ? 'DRICK – VATTNET ÄR GRÖNT...' : USE_NAME[pr.def.use]);
  for (const c of chests) if (!c.open && Math.hypot(c.x - P.x, c.y - P.y) < 1.2) hint = isTouch() ? 'HANDEN: ÖPPNA KISTAN' : 'E: ÖPPNA KISTAN';
  for (const m of merchants) if (Math.hypot(m.x - P.x, m.y - P.y) < 1.6 && shadowVisible(m)) hint = isTouch() ? 'HANDEN: HANDLA' : 'E: HANDLA';
  if (lvl.exit && Math.floor(P.x) === lvl.exit.x && Math.floor(P.y) === lvl.exit.y) { floorDone(); return; }
  const edt = slowBubble > 0 ? dt * 0.35 : dt; // tidsbubblan
  if (settings.smartAI !== false) ai24Frame(edt); // version 24: sensorer, arbetsminne, truppkoordinator och poletter (AI24)
  r25Frame(edt); // version 25: fienderoller – granaterna, och städning när smartAI stängs av
  for (const e of ents) try { if (e.boss) updateBoss(e, edt); else updateEnemy(e, edt); } catch (err) { spriteError(err, { o: e }); if (e.renderFail > 30 && !e.boss) { e.dead = true; e.gibbed = true; } } // en trasig fiende får inte stoppa spelet
  try { gfxETick(dt); } catch (err) { spriteError(err, null); } // FIENDER: spawn, blodpölar, bossfaser och bossdöd (bara visning)
  updateProjectiles(edt); updateFuses(dt); updatePortals(dt); updateHazards(dt); updateProps(dt); updateGroundFires(dt); updateBossFx(dt); updateWorldEvents(dt); updateSpores(dt); updateIcicles(dt);
  updateV20(dt); updateV21(dt); updateV22(dt); updateV23(dt); updatePet(dt); updateAllies(dt); updatePotions(dt); updateNpcTalk(dt); updateTorchFx(dt); updateHeat(dt); updateAbility(dt); questTick(); updateSmokes(dt); updateTomb(dt); updateTornados(dt); beamDust(dt); updateLamp(dt); updateMaze(dt); practiceTick(dt); sneakMusicTick(dt); updateWater(dt); updateCrystal(dt); harpoonTick(dt); talentTick(); updateV9(dt); rootsTick(dt); updateV11(dt); updateV13(dt); updateV14(dt); updateV15(dt); updateV16(dt); updateV17(dt); updateV18(dt); updateV19(dt); loopTick(dt); P.vanishT = Math.max(0, (P.vanishT || 0) - dt);
  updateV30(dt); // version 30 (SPEL): faror, rekvisita, fiender och vapen i Ruinstaden och Glasbruket
  if (secrets > (P.secLast || 0)) { run.wanderSecret = (run.wanderSecret || 0) + 1; } P.secLast = secrets; updateSurvival(dt); ghostTick(dt); tutTick(dt); feelTick(dt);
  if (cmode('onehit')) P.armor = 0;
  for (let i = decals.length - 1; i >= 0; i--) if (decals[i].life !== undefined && (decals[i].life -= dt) <= 0) decals.splice(i, 1);
  if (P.comboT > 0) { P.comboT -= dt; if (P.comboT <= 0 && P.combo >= 3) say(`KOMBO x${P.combo}`, 1.5); }
  if (P.slowT > 0) P.slowT -= dt;
  updateAudioMood(dt);
  if (P.poisonT > 0) { P.poisonT -= dt; P.poisonAcc = (P.poisonAcc || 0) + dt; if (P.poisonAcc > 0.7) { P.poisonAcc = 0; if (P.hp > 5) { P.hp -= 2; P.hurt = 0.15; } } }
  if (P.hp < maxHp() * 0.3 && !breathSnd && actx) breathSnd = play('breath', 0.35, 1, { loop: true });
  if (P.hp < maxHp() * 0.3) { heartT -= dt; if (heartT <= 0) { heartT = 0.55 + P.hp / maxHp() * 1.5; play('heart', 0.55); } } // hjärtat bultar snabbare ju närmare döden
  if (P.hp >= maxHp() * 0.3 && breathSnd) { breathSnd.s.stop(); breathSnd = null; }
}
// ---------- Rörelse: spring, hopp, ducka, glid, rusning och uthållighet ----------
const STAM_MAX = () => 1 + mod('stamina') + meta('stamina') * 0.15;
const cellUnder = () => cellAt(P.x, P.y);
const onGround = () => P.jz <= 0.001;
function wantRun() { return (settings.toggleRun ? runToggled : (keys.ShiftLeft || keys.ShiftRight)) || touch.mag > 0.95 || gp.run || touch.run || (settings.autoRun && touch.active && touch.mag > 0.3); }
let runToggled = false;
// ---------- Handkontroll (Gamepad API) ----------
const gp = { prev: [], look: 0, active: false, crouch: false, run: false };
function pollGamepad(dt) {
  let pads = []; try { pads = navigator.getGamepads ? navigator.getGamepads() || [] : []; } catch (e) { pads = []; } // kan nekas i inbäddade sidor
  const g = [...pads].find(p => p && p.connected);
  if (!g) { if (gp.active && gp.fire) { mouseDown = false; gp.fire = false; } gp.active = false; return { f: 0, s: 0 }; }
  const dz = v => Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85, b = i => !!(g.buttons[i] && g.buttons[i].pressed), edge = i => b(i) && !gp.prev[i];
  const lx = dz(g.axes[0] || 0), ly = dz(g.axes[1] || 0), rx = dz(g.axes[2] || 0), ry = dz(g.axes[3] || 0);
  if (lx || ly || rx || b(7)) gp.active = true;
  if ((window.CardUI && CardUI.isOpen()) || (state === 'title' && !document.getElementById('title').hidden) || ((state === 'dead' || state === 'runover') && !document.getElementById('runover').hidden)) { // menyer (även startskärmen och dödsskärmen): styrkors/spak flyttar fokus, A väljer, B backar, X slår om, Y visar trädet
    const key = c => window.dispatchEvent(new KeyboardEvent('keydown', { code: c, key: c, bubbles: true, cancelable: true }));
    const dir = b(12) || ly < -0.6 ? 'ArrowUp' : b(13) || ly > 0.6 ? 'ArrowDown' : b(14) || lx < -0.6 ? 'ArrowLeft' : b(15) || lx > 0.6 ? 'ArrowRight' : '';
    gp.navT = (gp.navT || 0) - dt; if (!dir) gp.navT = 0; else if (gp.navT <= 0) { gp.navT = gp.navDir === dir ? 0.16 : 0.35; gp.navDir = dir; key(dir); }
    if (edge(0)) key('Enter'); if (edge(1)) key('Escape'); if (edge(2)) key('KeyR'); if (edge(3)) key('KeyT');
    gp.prev = g.buttons.map(x => x.pressed); gp.pad = g; return { f: 0, s: 0 };
  }
  if (state === 'play') {
    P.a += rx * Math.abs(rx) * 3.2 * dt * settings.sens * (1 - WS.aim * 0.45); P.pitch = clamp(P.pitch, -20, 20);
    if (settings.mouseLook !== false && ry) lookBy(ry * Math.abs(ry) * 3.2 * dt * settings.sens * (1 - WS.aim * 0.45)); // högerspaken upp/ned
    const fire = (g.buttons[7] && g.buttons[7].value > 0.4) || false; if (fire !== !!gp.fire) { mouseDown = fire; gp.fire = fire; }
    aimDown = (g.buttons[6] && g.buttons[6].value > 0.4) || (aimDown && !gp.active);
    if (edge(gpb('jump'))) jump(); if (edge(gpb('use'))) useKey(); if (edge(gpb('swap'))) cycleWeapon(1); if (edge(gpb('lamp'))) toggleLamp(); if (edge(gpb('stone'))) throwStone(); if (edge(gpb('dash'))) dash(0, 0); if (edge(gpb('reload'))) reloadKey(); if (edge(gpb('potion'))) { if (P.potions && P.potions.length) drinkPotion(); else inspect(); } if (edge(gpb('ability'))) useAbility();
    if (edge(gpb('grenade'))) grenadeStart(); if (!b(gpb('grenade')) && gp.prev[gpb('grenade')]) grenadeThrow();
    if (gpb('taunt') >= 0 && edge(gpb('taunt'))) v26cTaunt(); // version 26C: hån (valfri knapp)
    if (edge(8)) { showMap = (showMap + 1) % 3; settings.map = showMap; saveSettings(); }
    gp.crouch = b(gpb('crouch')); gp.run = b(10) || Math.hypot(lx, ly) > 0.95;
    if (edge(9)) pause();
  } else if (state === 'pause' && edge(9)) resume();
  else if (state === 'stats' && (edge(0) || edge(9))) nextFloor();
  else if ((state === 'dead' || state === 'runover') && edge(0)) retryRun();
  else if ((state === 'dead' || state === 'runover') && edge(9)) leaveRunScreen();
  gp.prev = g.buttons.map(x => x.pressed); gp.pad = g;
  return state === 'play' ? { f: -ly, s: lx } : { f: 0, s: 0 };
}
function rumble(strong, ms) { try { const g = gp.pad; if (settings.vibrate !== false && g && g.vibrationActuator) g.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: strong * 0.6 }); } catch (e) { /* ingen vibration */ } }
let gyroLast = null;
function onGyro(ev) { // gyro-sikte: vrid telefonen för att sikta
  if (!settings.gyro || state !== 'play' || ev.alpha == null) { gyroLast = null; return; }
  const land = Math.abs(window.orientation || (screen.orientation && screen.orientation.angle) || 0) === 90, v = land ? ev.beta : ev.gamma;
  if (gyroLast !== null) { let d = v - gyroLast; if (Math.abs(d) < 20) P.a += d * Math.PI / 180 * 1.2 * settings.sens * (land && (window.orientation === -90 || (screen.orientation && screen.orientation.angle === 270)) ? -1 : 1); }
  gyroLast = v;
}
addEventListener('deviceorientation', onGyro);
function enableGyro() { // iOS kräver att man ger tillåtelse vid en knapptryckning
  try { if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().then(r => { if (r !== 'granted') { settings.gyro = false; saveSettings(); } }).catch(() => {}); } catch (e) { /* stöds inte */ }
}
function aimAssist(dt) { // siktstöd för pekskärm och handkontroll: dras mjukt mot en fiende nära siktet
  if (settings.aimAssist === false || !(gp.active || touch.active)) return;
  let best = null, bo = 0.09;
  for (const e of ents) { if (e.dead || e.dormant || e.hidden) continue; const d = Math.hypot(e.x - P.x, e.y - P.y); if (d > 14) continue; let off = Math.atan2(e.y - P.y, e.x - P.x) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off)); if (Math.abs(off) < bo && hasLOS(P.x, P.y, e.x, e.y)) { bo = Math.abs(off); best = off; } }
  if (best !== null) P.a += best * Math.min(1, dt * 2.5) * (settings.aimAssistK ?? 1);
  touch.autoFire = !!(settings.autoFire && touch.active && best !== null && Math.abs(best) < 0.03);
}
function updateMovement(dt, fwd, str) {
  const pad = pollGamepad(dt); fwd += pad.f; str += pad.s; aimAssist(dt);
  const c = cellUnder(), ground = onGround(), immune = mod('hazardImmune') > 0;
  const crouchKey = keys.ControlLeft || keys.ControlRight || touch.crouch || gp.crouch;
  // uthållighet: spring och rusning tar, vila ger tillbaka
  let running = wantRun() && WS.aim < 0.5 && P.stam > 0.02 && !P.crouchLock && (Math.abs(fwd) + Math.abs(str) > 0.1);
  if (running) { P.stam = Math.max(0, P.stam - dt * 0.16); P.stamT = 0.9; if (P.stam <= 0.02) { play('stamina_out', 0.5); say('ANDFÅDD', 0.8); } }
  else { P.stamT -= dt; if (P.stamT <= 0) P.stam = Math.min(STAM_MAX(), P.stam + dt * 0.32); }
  // ducka och glid
  if (crouchKey && running && Math.hypot(P.vx, P.vy) > 3.6 && ground && P.slide <= 0 && !P.wasCrouch) { P.slide = 0.55; P.vx *= 1.25; P.vy *= 1.25; play('slide', 0.5, 1, {}); }
  P.wasCrouch = !!crouchKey;
  P.crouch += ((crouchKey || P.slide > 0 ? 1 : 0) - P.crouch) * Math.min(1, dt * 12);
  if (P.slide > 0) { P.slide -= dt; running = false; }
  // fart: vatten, lera, nät och is
  const fl = lvl.floors ? lvl.floors[cellFloor ? cellFloor[(P.y | 0) * mw + (P.x | 0)] : 0] || '' : '';
  let terrain = 1;
  if (!immune && ground) { if (c === '-') terrain = 0.62; else if (c === '"') terrain = 0.42; else if (/mud|swamp/.test(fl) && !/battlemud|deepmud/.test(fl)) terrain = 0.85; }
  if (c === '"' && !immune) { P.webT = (P.webT || 0) + dt; if (P.webT > 0.4) { P.webT = 0; play('web', 0.35, rnd(0.9, 1.1)); } }
  const maxSp = (running ? 4.7 : 3.1) * (1 - WS.aim * 0.4) * (1 + mod('moveSpeed') + (dmod('light') ? 0.25 : 0)) * (P.haste > 0 ? 1.35 : 1) * (P.speedT > 0 ? 1.4 : 1) * (P.slowT > 0 ? 0.55 : 1) * (P.crouch > 0.5 && P.slide <= 0 ? 0.55 : 1) * terrain * (P.swim ? 0.6 * (1 + mod('swimSpeed')) : 1) * (P.timeSlow || 1) * (P.rootT > 0 ? 0.08 : 1) * (WS.block ? 0.55 : 1) * v13Slow() * v15Slow() * v16Slow() * v17Slow() * v18Slow() * v19Slow() * v20Slow() * v21Slow() * v22Slow() * v23Slow() * v30Slow();
  let tx = 0, ty = 0;
  if (Math.abs(fwd) + Math.abs(str) > 0.05) { const l = Math.hypot(fwd, str), sp = Math.min(1, l) / l * maxSp; tx = (Math.cos(P.a) * fwd - Math.sin(P.a) * str) * sp; ty = (Math.sin(P.a) * fwd + Math.cos(P.a) * str) * sp; }
  let k = Math.min(1, dt * (tx || ty ? 10 : 12));
  if (c === ':' && ground && !immune) k *= 0.12; // is: halt
  else if (c === 'Ǐ' && ground && !immune) k *= v17Grip(); // sköljt däck: halt
  else if (c === 'ɿ' && ground && !immune) k *= v23Grip();
  if (P.slide > 0) k *= 0.08; // glidning: farten håller i sig
  if (!ground) k *= 0.35; // i luften styr man sämre
  if (P.dashT > 0) { P.dashT -= dt; k = 0; dashHits(); }
  P.vx += (tx - P.vx) * k; P.vy += (ty - P.vy) * k;
  tryMove(P, P.vx * dt, P.vy * dt, 0.24);
  P.dashCd = Math.max(0, P.dashCd - dt);
  // hopp och fall
  v26aSlamTick(crouchKey); // version 26A: markslag
  if (!ground || P.jv > 0) {
    P.jz += P.jv * dt; P.jv -= 9.5 * dt * (P.launch && !P.launch.keepG ? 0.45 : 1) * v19Grav(); // studsplattan ger lång lufttid
    if (P.jz <= 0) {
      P.jz = 0; P.dj = false;
      if (P.jv < -2.2) { play('land', 0.5, rnd(0.9, 1.1)); P.shake = Math.max(P.shake, 0.35); P.landT = 0.18; if (c === '-') play('splash', 0.5);
        if (!settings.lowfx) for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; particles.push({ x: P.x + Math.cos(a) * 0.2, y: P.y + Math.sin(a) * 0.2, z: 0.03, vx: Math.cos(a) * 1.2, vy: Math.sin(a) * 1.2, vz: 0.2, life: 0.5, maxLife: 0.5, img: fx.parts.dust ? fx.parts.dust[0] : fx.hit[1], size: 0.1, fade: true, tint: lvl.biome === 'frost' ? [240, 245, 255] : [170, 150, 120] }); } } // damm när du landar
      P.jv = 0;
    }
  }
  P.landT = Math.max(0, P.landT - dt);
  v26aSlamLand(); // version 26A: markslagets stötvåg
  // kamerahöjd, lutning och synfält
  P.camZ = 0.5 + P.jz * 0.55 - P.crouch * 0.17 - Math.sin(P.landT / 0.18 * Math.PI) * 0.04;
  const side = (-Math.sin(P.a) * P.vx + Math.cos(P.a) * P.vy) / 4.7;
  P.roll += ((settings.tilt === false ? 0 : side * 0.035) - P.roll) * Math.min(1, dt * 8);
  P.runK += ((running && Math.hypot(P.vx, P.vy) > 3.4 ? 1 : 0) - P.runK) * Math.min(1, dt * 6);
}
function jump() {
  if (state !== 'play' || P.swim) return;
  if (v23NoJump()) return;
  if (v26aBounce()) return; // version 26A: studshopp direkt efter markslaget
  if (v26aWallJump()) return; // version 26A: väggstuds i luften
  if (onGround()) { if (P.stam < 0.1) return; stat('jumps'); P.jv = 3.4; P.jz = 0.001; P.stam = Math.max(0, P.stam - 0.12); P.stamT = 0.9; play('jump', 0.4, rnd(0.95, 1.05)); P.crouch = 0; slideJump(); return; }
  if ((mod('doubleJump') > 0 || (run && run.featherFloor === run.depth) || (P.owlJumpT || 0) > tmr) && !P.dj) { P.dj = true; P.jv = 3.0; play('jump', 0.45, 1.25); spawnPuff(P.x, P.y, 4); }
}
function dash(dx, dy) { // rusning: snabbt utfall med kort osårbarhet
  if (v26aSlamDash(dx, dy)) return; // version 26A: pekskärmens markslag (RUSA i luften utan spaken framåt)
  if (state !== 'play' || P.dashCd > 0 || P.stam < 0.3) return;
  if (!dx && !dy) { dx = Math.cos(P.a); dy = Math.sin(P.a); }
  const l = Math.hypot(dx, dy); dx /= l; dy /= l;
  P.vx = dx * 11; P.vy = dy * 11; P.dashT = 0.17; P.iframe = Math.max(P.iframe, 0.22); P.stam -= 0.3; P.stamT = 0.9;
  P.dashCd = 0.9 * Math.max(0.3, 1 - mod('dashCd')); P.dashHit = new Set(); stat('dashes');
  play('dash', 0.6, rnd(0.95, 1.05)); WS.punch = Math.max(WS.punch, 0.05);
  if (talent('vanish')) { P.vanishT = 1.5; for (const e of ents) if (!e.dead && e.alert && Math.hypot(e.x - P.x, e.y - P.y) < 9) e.confT = 1.2; spawnPuff(P.x, P.y, 6); }
}
function dashHits() { // rusa igenom fiender: skada (kort), guld dras till dig
  for (const it of items) if (!it.taken && it.type.startsWith('gold') && Math.hypot(it.x - P.x, it.y - P.y) < 2.2) { it.x += (P.x - it.x) * 0.5; it.y += (P.y - it.y) * 0.5; }
  if (!mod('dashDmg')) return;
  for (const e of ents) if (!e.dead && !e.dormant && !P.dashHit.has(e) && Math.hypot(e.x - P.x, e.y - P.y) < 0.8) { P.dashHit.add(e); hurtEnemy(e, mod('dashDmg'), e.x, e.y, { noProc: true }); }
}
