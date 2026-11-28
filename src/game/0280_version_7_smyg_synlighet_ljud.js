// ---------- Version 7: smyg – synlighet, ljud, upptäckt, stenar och larmklockor ----------
let noiseLvl = 0;
function visibility() { // hur synlig du är: ljuset där du står, lampan, duckning
  if (P.vanishT > 0) return 0.05;
  if (P.lamp) return 1;
  let v = clamp(lightAt(P.x, P.y) * 1.1, 0.12, 1);
  if (P.crouch > 0.5) v *= 0.55;
  if (P.ghostT > 0) v *= 0.2;
  if ((lvl.biome === 'forest' || lvl.biome === 'swamp') && cellSky && cellSky[(P.y | 0) * mw + (P.x | 0)]) v *= 0.75; // snår och högt gräs skymmer dig utomhus
  return v;
}
function detectTick(e, dt, dist, los) { // fiender upptäcker dig gradvis; true = fienden har just upptäckt dig
  if (e.alert || e.dormant) return false;
  const sight = (e.sleep ? 2.2 : 10) * (P.crouch > 0.5 ? 0.75 : 1);
  if (los && dist < sight && !inSmoke(e.x, e.y, P.x, P.y)) {
    if (dist < 1.6) e.detect = 1;
    const rate = (0.6 + (sight - dist) / sight * 2.2) * visibility() * Math.max(0.2, 1 - mod('detectSlow')) * (e.sleep ? 0.3 : 1);
    e.detect = Math.min(1, (e.detect || 0) + dt * rate);
    if (e.detect > 0.35 && !e.susp) { e.susp = true; play('suspicious', 0.35, rnd(0.9, 1.1), { x: e.x, y: e.y }); e.inv = { x: P.x, y: P.y }; }
  } else e.detect = Math.max(0, (e.detect || 0) - dt * 0.25);
  if (e.detect >= 1) { e.detect = 0; e.susp = false; if (e.sleep) e.sleep = false; play('detect', 0.4, rnd(0.95, 1.1), { x: e.x, y: e.y }); spawnText(e.x, e.y, '!', '#ff5030'); e.spotT = 0.8; e.flash = Math.max(e.flash || 0, 0.25); alertEnemy(e, true); return true; }
  return false;
}
function investigate(e, dt) { // gå mot ljudet du hörde
  if (e.alert || !e.inv) return false;
  const d = Math.hypot(e.inv.x - e.x, e.inv.y - e.y);
  if (d < 0.8 || (e.invT = (e.invT || 0) + dt) > 8) { e.inv = null; e.invT = 0; e.searchT = 2; return false; }
  e.state = 'move'; const ox = e.x, oy = e.y; tryMove(e, (e.inv.x - e.x) / d * dt * e.d.speed * 0.7, (e.inv.y - e.y) / d * dt * e.d.speed * 0.7, 0.28); e.mvx = e.x - ox; e.mvy = e.y - oy; e.t += dt;
  if (Math.random() < dt * 0.6) spawnText(e.x, e.y, '?', '#e8d9b0');
  return true;
}
function hearNoise(x, y, r) { // ljud på en plats: fiender som inte är larmade går dit och tittar
  noiseLvl = Math.max(noiseLvl, Math.min(1, r / 12));
  for (const e of ents) if (!e.dead && !e.alert && !e.dormant && Math.hypot(e.x - x, e.y - y) < r) { if (e.sleep && r < 6) continue; e.sleep = false; e.inv = { x, y }; e.invT = 0; if (!e.susp) { e.susp = true; play('suspicious', 0.3, 1, { x: e.x, y: e.y }); } }
}
function throwStone() { // G: kasta en sten som lockar fiender
  if (state !== 'play') return;
  if ((P.stones || 0) <= 0) { say('INGA STENAR', 1); return; }
  P.stones--; play('stone_throw', 0.5);
  projectiles.push({ x: P.x + Math.cos(P.a) * 0.4, y: P.y + Math.sin(P.a) * 0.4, z: 0.6, vx: Math.cos(P.a) * 9, vy: Math.sin(P.a) * 9, vz: 1.2, kind: 'stone', friendly: true, life: 1.4, dmg: 0, src: P });
}
function updateStone(p, dt) {
  p.vz -= dt * 4; p.z = Math.max(0.05, p.z + p.vz * dt);
  if (solid(p.x, p.y) || p.life <= 0 || p.z <= 0.05) { p.dead = true; const x = p.x - p.vx * dt, y = p.y - p.vy * dt; play('stone_land', 0.6, 1, { x, y }); hearNoise(x, y, 7); spawnPuff(x, y, 2); }
}
function bellTick(e, dt) { // larmade fiender springer till larmklockan
  if (!e.alert || e.boss || e.minion || !props.length) return false;
  if (e.toBell === undefined) { const b = props.find(p => p.def && p.def.bell && !p.rung && !p.silenced && Math.hypot(p.x - e.x, p.y - e.y) < 11); e.toBell = b || null; if (b) spawnText(e.x, e.y, 'LARMET!', '#ff9050'); }
  const b = e.toBell; if (!b || b.rung || b.silenced) return false;
  const d = Math.hypot(b.x - e.x, b.y - e.y);
  if (d < 1.4) { b.rung = true; play('alarm_bell', 0.9, 1, { x: b.x, y: b.y }); say('LARMKLOCKAN RINGER – HELA VÅNINGEN VAKNAR!', 2.5); P.shake = Math.max(P.shake, 0.4); for (const o of ents) if (!o.dead && !o.dormant) { o.sleep = false; alertEnemy(o, false); } stat('bellsRung'); return false; }
  const ox = e.x, oy = e.y; tryMove(e, (b.x - e.x) / d * dt * e.d.speed * 1.2, (b.y - e.y) / d * dt * e.d.speed * 1.2, 0.28); e.mvx = e.x - ox; e.mvy = e.y - oy; e.state = 'move'; e.t += dt;
  return true;
}
function cursedTreasure(it) { // gravkammarens guld kan vara förbannat: mumierna i närheten vaknar
  let n = 0; for (const e of ents) if (!e.dead && e.type === 'Ã' && Math.hypot(e.x - it.x, e.y - it.y) < 10) { e.sleep = false; e.dormant = false; alertEnemy(e, true); n++; }
  if (!n) { const s = freeSpotFar(3, 7); if (s) { const e = makeEnemy('Ã', s[0], s[1]); e.alert = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 8); n = 1; } }
  if (n) { say('FÖRBANNAD SKATT – MUMIERNA VAKNAR!', 2.5); play('mummy', 0.8, 0.9, { x: it.x, y: it.y }); P.shake = Math.max(P.shake, 0.6); }
}
function stealthKill(e) { // dödad utan att upptäcka dig
  run.stealthKills = (run.stealthKills || 0) + 1; run.floorStealth = (run.floorStealth || 0) + 1; stat('stealthKills');
  const g = 5 + run.depth; run.gold += g; spawnText(e.x, e.y, `+${g} SMYG`, '#a0a0ff');
}
function drawStealthHud(g) { // ljud- och ljusmätare
  if (settings.stealthHud === false || !ents.some(e => !e.dead && !e.alert && !e.dormant)) return;
  const x = HL ? HL.st.x : W - 46, y = HL ? HL.st.y : VH - 12, v = visibility(); // nära ammo-hörnet
  noiseLvl = Math.max(0, noiseLvl - 1 / 60 * 0.6);
  if (HL && !(P.crouch > 0.5 || noiseLvl > 0.15)) return; // bara när man smyger eller just har låtit
  for (const [k, val, col, icon] of [[0, v, '#e8d9b0', 'icon_eye'], [1, noiseLvl, '#c9a87a', 'icon_ear']]) {
    const yy = y - k * 6; const im = hudImg[icon];
    if (im) g.drawImage(im, x - 9, yy - 2, 6, 6); else { g.fillStyle = col; g.fillRect(x - 8, yy, 4, 2); }
    g.fillStyle = '#000a'; g.fillRect(x, yy, 30, 3); g.fillStyle = val > 0.7 ? '#ff7050' : val > 0.35 ? '#ffd24a' : '#80c080'; g.fillRect(x, yy, 30 * clamp(val, 0, 1), 3);
  }
}
// ---------- Version 7: ficklampan ----------
function toggleLamp() {
  if (state !== 'play') return;
  if (!P.lamp && (P.battery || 0) <= 0) { say('BATTERIET ÄR SLUT', 1.2); play('lamp_flicker', 0.5); return; }
  P.lamp = !P.lamp; play(P.lamp ? 'lamp_on' : 'lamp_off', 0.6); stat('lampToggles');
}
function updateLamp(dt) {
  if (!P.lamp) return;
  P.battery = Math.max(0, (P.battery || 0) - dt * 1.1 * Math.max(0.2, 1 - mod('lampBattery')));
  if (P.battery <= 0) { P.lamp = false; say('LAMPAN SLOCKNADE', 1.5); play('lamp_off', 0.6); return; }
  if (P.battery < 15 && Math.random() < dt * 2) { P.lampFlick = 0.12; play('lamp_flicker', 0.25); }
  if (P.lampFlick > 0) P.lampFlick -= dt;
  for (const e of ents) { // ljuskänsliga fiender flyr ljuset
    if (e.dead || e.boss || !(e.type === 'Ý' || e.type === 'V' || e.type === 'R')) continue;
    const d = Math.hypot(e.x - P.x, e.y - P.y); if (d > 7) continue; let off = Math.atan2(e.y - P.y, e.x - P.x) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
    if (Math.abs(off) < 0.4 && hasLOS(P.x, P.y, e.x, e.y) && !(e.fleeT > 0)) { e.fleeT = 1.2; spawnText(e.x, e.y, 'LJUSET!', '#fff0a0'); }
  }
}
function lampLight(flashLight) { // ljuskäglan i ljuskartan
  if (!P.lamp || P.lampFlick > 0) return;
  const R = 7 + Math.round(mod('lampRadius')), k = P.battery < 15 ? 0.6 : 1;
  for (let d = 1; d <= R; d += 1) for (const s of [-0.28, 0, 0.28]) { const a = P.a + s, x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d; if (solid(x, y)) break; const i = (y | 0) * mw + (x | 0); light[i] += 0.55 * k * (1 - d / (R + 2)); if (lcol) addCol(i, 0.4 * k * (1 - d / (R + 2)), [255, 240, 200]); }
}
function drawLampHud(g) {
  if (P.battery === undefined) return;
  if (HL && !(P.lamp || P.battery < 15)) return; // bara när lampan är tänd eller batteriet nästan slut
  const x = 4, y = HL ? HL.lampY : VH - 4 - (P.potions && P.potions.length ? 16 : 0) - 4; // batteriet nere till vänster
  g.fillStyle = '#000a'; g.fillRect(x, y, 22, 4); g.fillStyle = P.battery < 15 ? (tmr % 0.5 < 0.25 ? '#ff5040' : '#802010') : P.lamp ? '#fff0a0' : '#8a7a50'; g.fillRect(x + 1, y + 1, 20 * P.battery / 100, 2);
  if (!isTouch() && (P.lamp || P.battery < 100)) txt(keyName((settings.binds || {}).KeyL || 'KeyL'), x + 25, y - 2, '#8a7a60', 1, true, 0.6);
}
// ---------- Version 7: spelaren, bankiren och vandraren ----------
function openGambler(pr) {
  const luck = mod('gambleLuck'), win = p => Math.random() < clamp(p + luck * 0.5, 0.05, 0.9);
  play('gamble_dice', 0.6);
  openUI(() => CardUI.choice({ title: 'SPELAREN', subtitle: `"SATSA, VANDRARE." · ${run.gold} GULD`, cancel: 3,
    options: [{ label: 'TÄRNINGAR (20 GULD)', text: 'HÖGRE SUMMA VINNER DUBBELT' }, { label: 'HÖGRE ELLER LÄGRE (15 GULD)', text: 'GISSA RÄTT TRE GÅNGER: 80 GULD' }, { label: 'LYCKOHJULET (40 GULD)', text: 'GULD, KORT, RUNA, DRYCK – ELLER EN FÖRBANNELSE' }, { label: 'GÅ DÄRIFRÅN', text: '' }] }, i => {
    closeUI(); if (i === 3) return;
    const cost = [20, 15, 40][i]; if (run.gold < cost) { say('FÖR LITE GULD', 1.2); return; }
    run.gold -= cost; stat('gambles'); run.goldSpent = (run.goldSpent || 0) + cost;
    if (i === 0) { play('gamble_dice', 0.8); const me = rnd(2, 12) | 0, him = rnd(2, 12) | 0; let w = me > him || (me === him && win(0.5));
      if (w && Math.random() < 0.15) { if (luck > 0.1 || mod('luck') > 0.1) { say('DU SÅG HONOM FUSKA – PENGARNA TILLBAKA', 2.5); run.gold += cost; return; } w = false; } // spelaren fuskar ibland
      setTimeout(() => { if (w) { run.gold += cost * 2; play('gamble_win', 0.8); say(`DU: ${me} · HAN: ${him} – DU VANN ${cost * 2} GULD`, 2.5); stat('gambleWins'); } else { play('gamble_lose', 0.7); say(`DU: ${me} · HAN: ${Math.max(him, me + 1)} – SPELAREN FLINAR`, 2.5); } }, 600); }
    if (i === 1) { let n = 0; while (n < 3 && win(0.55)) n++; setTimeout(() => { if (n >= 3) { run.gold += 80; play('gamble_win', 0.8); say('TRE RÄTT! +80 GULD', 2.5); stat('gambleWins'); } else { play('gamble_lose', 0.7); say(`FEL PÅ GISSNING ${n + 1}`, 2); } }, 500); }
    if (i === 2) { play('wheel_spin', 0.8); setTimeout(() => { const r = Math.random() - luck * 0.2;
      if (r < 0.15) { const cs = Cards.ALL.filter(c => c.curse && !run.owned.includes(c.id)); const c = cs[(Math.random() * cs.length) | 0]; if (c) { gainCard(c); CardUI.toast(c, 'HJULET FÖRBANNAR DIG'); } play('gamble_lose', 0.7); }
      else if (r < 0.4) { play('gamble_lose', 0.6); say('HJULET STANNAR PÅ INGENTING', 2); }
      else if (r < 0.65) { run.gold += 100; play('gamble_win', 0.8); say('HJULET: 100 GULD!', 2.5); stat('gambleWins'); }
      else if (r < 0.8) { givePotion(randomPotion(), true); say('HJULET: EN STARK DRYCK', 2); }
      else if (r < 0.92) giveRune(RUNE_IDS[(Math.random() * RUNE_IDS.length) | 0], 'HJULET GER');
      else { items.push({ type: 'cardpick', x: P.x + Math.cos(P.a), y: P.y + Math.sin(P.a), taken: false, drop: true, luck: 1.2, title: 'LYCKOHJULET' }); say('HJULET: ETT KORTVAL', 2); } }, 1500); }
  }));
}
function openBanker(pr) {
  const g = run.gold, rate = Math.round(5 * (1 + mod('bankInterest')));
  play('wanderer', 0.4, 1.3);
  openUI(() => CardUI.choice({ title: 'BANKIREN', subtitle: `I BANKEN: ${run.bank || 0} GULD · ${rate} % RÄNTA/VÅNING`, cancel: 3,
    options: [{ label: `SÄTT IN HÄLFTEN (${Math.floor(g / 2)})`, text: 'TRYGGT ÄVEN OM DU DÖR · VID RUNDANS SLUT: 10 GULD = 1 SJÄL' }, { label: `SÄTT IN ALLT (${g})`, text: 'TRYGGT ÄVEN OM DU DÖR · VID RUNDANS SLUT: 10 GULD = 1 SJÄL' }, { label: 'TA UT ALLT', text: run.bank ? `${run.bank} GULD (BANKIREN TAR 10 %)` : 'BANKEN ÄR TOM' }, { label: 'GÅ DÄRIFRÅN', text: '' }] }, i => {
    closeUI(); if (i === 3) return;
    if (i === 2) { if (!run.bank) return; const out = Math.floor(run.bank * 0.9); run.gold += out; run.bank = 0; play('coin', 0.8); say(`DU TOG UT ${out} GULD`, 2); return; }
    const n = i === 0 ? Math.floor(g / 2) : g; if (n <= 0) return;
    run.gold -= n; run.bank = (run.bank || 0) + n; play('bank_deposit', 0.8); say(`${n} GULD I BANKEN (TOTALT ${run.bank})`, 2.5); stat('bankDeposits');
  }));
}
const WANDER_STEPS = [
  { text: 'DÖDA EN ELIT', check: () => (run.wanderElite || 0) > 0, reward: () => { run.gold += 60; return '60 GULD'; } },
  { text: 'HITTA EN HEMLIGHET', check: () => (run.wanderSecret || 0) > 0, reward: () => { giveRune(RUNE_IDS[(Math.random() * RUNE_IDS.length) | 0], 'VANDRAREN GER'); return 'EN RUNA'; } },
  { text: 'BESEGRA EN VÄKTARE', check: () => (run.wanderGuard || 0) > 0, reward: () => { items.push({ type: 'cardpick', x: P.x + Math.cos(P.a), y: P.y + Math.sin(P.a), taken: false, drop: true, luck: 2, legend: true, title: 'VANDRARENS GÅVA' }); return 'ETT LEGENDARISKT KORTVAL'; } },
];
function openWanderer(pr) {
  play('wanderer', 0.7);
  const w = (run.wander = run.wander || { step: 0, active: false });
  if (w.step >= WANDER_STEPS.length) { say('VANDRAREN: "TACK, VÄN. VI SES VID BORGEN."', 3); return; }
  const st = WANDER_STEPS[w.step];
  if (w.active && st.check()) { const r = st.reward(); w.step++; w.active = false; play('quest_done', 0.8); say(`VANDRAREN: "BRA GJORT!" – ${r}`, 3); stat('wanderSteps'); checkAch(); return; }
  if (w.active) { say(`VANDRAREN: "${st.text} – SEN HITTAR JAG DIG IGEN."`, 3); return; }
  openUI(() => CardUI.choice({ title: 'VANDRAREN', subtitle: `"HJÄLP MIG TILL BORGEN." · STEG ${w.step + 1}/3`, cancel: 1,
    options: [{ label: 'JAG HJÄLPER DIG', text: `${st.text} – PRATA MED VANDRAREN IGEN NÄR DU MÖTER HONOM` }, { label: 'INTE NU', text: '' }] }, i => {
    closeUI(); if (i !== 0) return; w.active = true; run.wanderElite = 0; run.wanderSecret = 0; run.wanderGuard = 0; play('quest_new', 0.7); say('UPPDRAG: ' + st.text, 2.5);
  }));
}
function npcMood() { // NPC:er reagerar på din hälsa och dina kort
  if (P.hp < maxHp() * 0.3) return 'DU SER INTE BRA UT, VÄN';
  if (run.owned.filter(id => { const c = Cards.byId(id); return c && c.curse; }).length >= 2) return 'JAG KÄNNER FÖRBANNELSER PÅ DIG';
  if (run.gold > 300) return 'DIN PUNG KLIRRAR GOTT';
  return null;
}
// ---------- Version 7: köpmannen – pruta, stjäla, rea och sälja ----------
function haggle(m) {
  if (m.haggled) return { msg: 'KÖPMANNEN HAR REDAN BESTÄMT SIG' };
  m.haggled = true; play('haggle', 0.7); stat('haggles');
  if (Math.random() < 0.5 + mod('luck') * 0.5) { for (const s of m.stock) if (s.price) s.price = Math.round(s.price * 0.85); return { msg: 'KÖPMANNEN SUCKAR: 15 % RABATT' }; }
  for (const s of m.stock) if (s.price) s.price = Math.round(s.price * 1.1); return { msg: 'KÖPMANNEN BLEV SUR: 10 % DYRARE' };
}
function stealFrom(m) {
  const pool = m.stock.filter(s => s.kind === 'card' || s.kind === 'potion' || s.kind === 'rune' || s.kind === 'health');
  const it = pool[(Math.random() * pool.length) | 0]; if (!it) return;
  if (it.kind === 'card') gainCard(it.card); else if (it.kind === 'potion') givePotion(it.pot || 'heal', false, true); else if (it.kind === 'rune') giveRune(RUNE_IDS[(Math.random() * RUNE_IDS.length) | 0], 'DU STAL'); else heal(40);
  play('steal', 0.9); say('DU STAL – KÖPMANNEN DRAR SIN LIE!', 2.5); stat('steals');
  const i = merchants.indexOf(m); if (i >= 0) merchants.splice(i, 1); map[m.y | 0][m.x | 0] = '.'; flowCell = -1;
  const e = makeElite(RNG(Date.now()), m.x, m.y); e.alert = true; e.hp = e.maxHp = e.maxHp * 1.5; e.d = { ...e.d, name: 'DEN ARGA KÖPMANNEN' }; ents.push(e); totalEnemies++;
}
function sellCards(onDone) {
  const own = [...new Set(run.owned)].map(id => Cards.byId(id)).filter(c => c && !c.pact && !c.wup && !c.curse);
  const price = c => Cards.sellPrice ? Cards.sellPrice(c, run.depth) : Math.round(Cards.price(c, run.depth, 0) * 0.4);
  if (!own.length) { say('DU HAR INGA KORT ATT SÄLJA', 1.5); onDone(); return; }
  openUI(() => CardUI.list('SÄLJ ETT KORT', 'KÖPMANNEN BETALAR UNGEFÄR 40 % AV PRISET', own.map(c => ({ label: c.name, text: `${price(c)} GULD · ${c.text || ''}`, onClick: () => { CardUI.close(); run.owned.splice(run.owned.indexOf(c.id), 1); recomputeMods(); const g = price(c); run.gold += g; play('coin', 0.8); say(`SÅLDE ${c.name} FÖR ${g} GULD`, 2); stat('cardsSold'); closeUI(); onDone(); } })), () => { closeUI(); onDone(); }));
}
// ---------- Version 7: labyrintläget ----------
function beginMaze() {
  if (!Gen.maze) { document.getElementById('status').textContent = 'LABYRINTEN ÄR INTE KLAR ÄN'; if (state !== 'title') showTitle(); return; }
  document.getElementById('title').hidden = true; canvas.focus(); ensureAudio(); practice = null;
  newRun(RNG.randomSeed(), false); run.maze = { limit: 300 }; run.cmode = ''; P.hp = maxHp();
  const biome = RNG(run.seed).pick(BIOME_IDS), L = Gen.maze(RNG.hash(run.seed + ':labyrint'), { biome });
  L.name = L.name || 'LABYRINTEN'; L.maze = true; run.depth = 2; startLevel(L);
  say('HITTA UTGÅNGEN INNAN TIDEN TAR SLUT', 3); lockPointer();
}
function updateMaze(dt) {
  if (!run.maze || state !== 'play') return;
  const left = run.maze.limit - levelTime;
  if (left < 30 && Math.floor(left) !== Math.floor(left + dt)) play('labyrinth_tick', 0.5, left < 10 ? 1.3 : 1);
  if (left <= 0) { const lu = run.livesUsed; run.cause = 'TIDEN TOG SLUT'; P.hp = 0; hurtPlayer(9999); if (state === 'play' && run.livesUsed > lu) run.maze.limit = levelTime + 30; } // återupplivningen ger ny tid
}
function drawMazeTimer(g) { // labyrintens nedräkning
  if (!run.maze) return; const left = Math.max(0, run.maze.limit - levelTime), t = 'TID ' + fmtTime(Math.ceil(left));
  txt(t, (W - textW(t)) / 2, 4, left < 30 ? (tmr % 0.5 < 0.25 ? '#ff5040' : '#ffd24a') : '#e8d9b0', 1, true);
}
function mazeDone() { // utgången nådd i labyrinten
  const t = Math.round(levelTime); profile.mazeBest = Math.min(profile.mazeBest || 1e9, t); stat('mazesWon');
  say(`UTE UR LABYRINTEN PÅ ${fmtTime(t)}`, 3); endRun(true);
}
// ---------- Version 7: bossjakten – alla bossar i valfri ordning ----------
function bossHuntPick() {
  const left = run.hunt.left;
  if (!left.length) { const t = Math.round(run.time); profile.huntBest = Math.min(profile.huntBest || 1e9, t); stat('huntsWon'); endRun(true); return; }
  P.hp = maxHp(); P.grenades = Math.min(GREN_MAX(), P.grenades + 2);
  openUI(() => CardUI.choice({ title: 'BOSSJAKTEN', subtitle: `${bossPool().length - left.length} AV ${bossPool().length} BESEGRADE · ${fmtTime(run.time)}`,
    options: left.map(id => ({ label: BOSSES[id].name, text: BOSSES[id].title || '' })) }, i => {
    closeUI(); const id = left.splice(i, 1)[0]; run.hunt.cur = id;
    const L = Gen.boss(RNG.hash(run.seed + ':jakt:' + id), { arena: BOSSES[id].arena, boss: id }); L.bossId = id; run.depth = FLOORS + 1; startLevel(L); lockPointer();
  }));
}
function beginBossHunt() {
  document.getElementById('title').hidden = true; canvas.focus(); ensureAudio(); practice = null;
  newRun(RNG.randomSeed(), false); run.cmode = ''; P.hp = maxHp(); run.bossrush = true; run.hunt = { left: bossPool() };
  for (let i = 1; i <= 4; i++) { P.has[i] = true; P.mags[i] = WEAPONS[i].mag; } P.ammo = Object.assign(NOAMMO(), { p9: 120, r556: 90, shells: 30, bolts: 20, flares: 10 });
  state = 'play'; bossHuntPick();
}
// ---------- Version 7: tre sparplatser ----------
const runKey = () => 'run' + (settings.slot ? '.' + settings.slot : '');
// ---------- Version 7: titlar ----------
const TITLES = [
  ['', 'INGEN TITEL', () => true], ['vandrare', 'VANDRAREN', p => p.runs >= 1], ['djupdykare', 'DJUPDYKAREN', p => p.bestDepth >= 6], ['segrare', 'SEGRAREN', p => p.wins >= 1],
  ['skugga', 'SKUGGAN', p => (p.stealthKills || 0) >= 25], ['kronikor', 'KRÖNIKÖREN', p => (p.pages || []).length >= 20], ['bossjagare', 'BOSSJÄGAREN', p => Object.keys(p.bossWins || {}).length >= 4],
  ['spelare', 'SPELAREN', p => (p.gambleWins || 0) >= 10], ['rik', 'GULDKUNGEN', p => (p.bankDeposits || 0) >= 5], ['ododlig', 'DEN ODÖDLIGE', p => (p.survivalBest || 0) >= 25], ['faraon', 'FARAONENS ARVTAGARE', p => !!(p.bossWins || {}).pharaoh], ['munk', 'DEN SISTE MUNKEN', p => (p.finaleWon || 0) >= 1],
];
const titleOpen = id => { const t = TITLES.find(x => x[0] === id); try { return !!t && t[2](profile); } catch (e) { return false; } };
// ---------- Version 7: kombinerade utmaningslägen ----------
const cmodeNames = s => (s || '').split('+').filter(x => CMODES[x]).map(x => CMODES[x].name).join(' + ');
// ---------- Version 7: visuella ljudsignaler och uppläsning ----------
const CUE_SOUNDS = new Set(['growl', 'roar', 'hiss', 'steps', 'detect', 'suspicious', 'door', 'gate', 'alarm_bell', 'spider', 'hound', 'icewolf', 'banshee', 'mummy', 'scarab', 'jackal', 'thief', 'lavaworm', 'worm_emerge', 'bossroar', 'fuse', 'grenade_beep']);
let cues = [];
function soundCue(name, x, y) {
  if (!settings.soundCues || state !== 'play' || !CUE_SOUNDS.has(name)) return;
  const d = Math.hypot(x - P.x, y - P.y); if (d > 14) return;
  let a = Math.atan2(y - P.y, x - P.x) - P.a; a = Math.atan2(Math.sin(a), Math.cos(a));
  if (Math.abs(a) < 0.5 && hasLOS(P.x, P.y, x, y)) return; // syns redan
  cues.push({ a, t: 1.2, near: d < 5 }); if (cues.length > 8) cues.shift();
}
function drawCues(g) {
  for (const c of cues) { c.t -= 1 / 60; const r = 30, x = W / 2 + Math.sin(c.a) * r, y = HORIZON - Math.cos(c.a) * r * 0.8, al = Math.min(1, c.t * 2);
    g.fillStyle = c.near ? `rgba(255,120,80,${al})` : `rgba(255,230,160,${al * 0.8})`; g.beginPath(); g.arc(x, y, c.near ? 3 : 2, 0, TAU); g.fill(); }
  cues = cues.filter(c => c.t > 0);
}
// ---------- Version 7: smygmusik ----------
let sneakT = 0, sneakMusic = false;
function sneakMusicTick(dt) {
  if (!window.Music || settings.music === false || boss) return;
  const quiet = P.crouch > 0.5 && !ents.some(e => e.alert && !e.dead && !e.dormant && Math.hypot(e.x - P.x, e.y - P.y) < 14);
  sneakT = quiet ? sneakT + dt : 0;
  if (!sneakMusic && sneakT > 3) { sneakMusic = true; Music.play('stealth'); }
  else if (sneakMusic && !quiet) { sneakMusic = false; playMusic(); }
}
// ---------- Version 7: pausmenyn (mobil och knappen ENTER) ----------
const pauseLine = () => [lvl && BIOME_NAME[lvl.biome] || '', 'VÅNING ' + run.depth, run.gold + ' GULD'].filter(Boolean).join(' · '); // pausens enda rad: biom · våning · guld
function menuList() { const n = document.querySelector('#cardui .cu-choice'); if (n) { n.classList.add('menulist'); n.querySelectorAll('.cu-ol').forEach(o => { o.textContent = o.textContent.replace(/^\[\d+\]\s*/, ''); }); } } // genrens lodräta lista i stället för kort med text
function pauseMenu() { // pausmenyn: en rad om rundan och en kort lodrät lista
  openUI(() => { CardUI.choice({ title: 'PAUS', subtitle: pauseLine(), cancel: 0, options: ['FORTSÄTT', 'INSTÄLLNINGAR', 'KARTA', 'KORTLEKEN', 'MER', 'GE UPP'].map(label => ({ label, text: '' })) }, i => {
    closeUI('pause');
    if (i === 0) resume();
    else if (i === 1) openSettingsUI();
    else if (i === 2) { pauseMap = !pauseMap; }
    else if (i === 3) showDeck();
    else if (i === 4) pauseMore();
    else if (i === 5) abandonRun();
  }); menuList(); });
}
function pauseMore() { // MER: krönikan, talangerna, rundans detaljer och helskärm
  const back = () => { closeUI('pause'); pauseMenu(); };
  openUI(() => { CardUI.choice({ title: 'MER', subtitle: pauseLine(), cancel: 4, options: [`KRÖNIKAN ${pagesFound().length}/${CHRONICLE.length}`, `TALANGER · NIVÅ ${run.lvl || 1}`, 'RUNDAN', 'HELSKÄRM', 'TILLBAKA'].map(label => ({ label, text: '' })) }, i => {
    closeUI('pause');
    if (i === 0) openUI(() => showChronicle(back));
    else if (i === 1) openUI(() => showTalents(back));
    else if (i === 2) openUI(() => showRunInfo(back));
    else if (i === 3) { toggleFullscreen(); pauseMenu(); }
    else pauseMenu();
  }); menuList(); });
}
function showRunInfo(onClose) { // det som förr stod i pausen: klass, svårighet, frö, bonusar, uppdrag och logg
  const rows = [['VÅNING', `${run.depth} · ${BIOME_NAME[lvl.biome] || ''}`], ['KLASS', run.cls && CLASSES[run.cls] ? CLASSES[run.cls].name + (run.asc ? ` · UPPST. ${run.asc}` : '') : '–'], ['SVÅRIGHET', DIFF[settings.diff].name], ['KORT', String(run.owned.length)], ['GULD', String(run.gold)], ['FRÖ', seedText(run.seed)], ['SJÄLAR', `${profile.souls} · REKORD VÅNING ${profile.bestDepth}`]];
  CardUI.list('RUNDAN', '', rows.map(([k, v]) => ({ label: k, text: v })).concat(bonusLines().concat(pauseExtras().filter(l => !/^KLASS:|^SJÄLAR /.test(l))).map(l => ({ label: l, text: '', color: /^FEL/.test(l) ? '#ff7060' : '' }))), onClose);
}
// ---------- Version 7: övning mot en fiende ----------
function beginEnemyPractice(type) {
  practice = { enemy: type }; document.getElementById('title').hidden = true; canvas.focus(); ensureAudio();
  newRun(RNG.randomSeed(), false); run.practice = { enemy: type, god: true };
  const L = Gen.floor(RNG.hash(run.seed + ':övning'), 1, { biome: 'dungeon' }); L.name = 'ÖVNING: ' + ENEMY_DEFS[type].name;
  run.depth = 2; startLevel(L); ents.length = 0; totalEnemies = 0; kills = 0; run.practiceT = 1;
  for (let i = 1; i < WEAPONS.length; i++) { P.has[i] = true; P.mags[i] = effMag(i); } for (const k in AMMO) P.ammo[k] = AMMO[k].max;
  say('ÖVNING: ' + ENEMY_DEFS[type].name + ' – OÄNDLIG AMMO OCH HÄLSA', 3); lockPointer();
}
function anyFreeCell(minD) { // en slumpad fri ruta en bit från spelaren
  for (let i = 0; i < 300; i++) { const x = (Math.random() * mw | 0) + 0.5, y = (Math.random() * mh | 0) + 0.5; if (Math.hypot(x - P.x, y - P.y) >= minD && freeSpot(x, y, 0.9)) return [x, y]; }
  return null;
}
function practiceTick(dt) {
  if (!run.practice || !run.practice.enemy) return;
  if (run.practice.god) { P.hp = Math.max(P.hp, maxHp() * 0.5); for (let i = 0; i < WEAPONS.length; i++) if (P.has[i]) P.ammo[WEAPONS[i].ammo] = AMMO[WEAPONS[i].ammo].max; } // oändlig ammo och hälsa
  if (!ents.some(e => !e.dead)) { run.practiceT -= dt; if (run.practiceT <= 0) { run.practiceT = 2; for (let i = 0; i < 3; i++) { const s = freeSpotFar(4, 9) || freeSpotFar(1.8, 4) || anyFreeCell(3); if (s) { const e = makeEnemy(run.practice.enemy, s[0], s[1]); e.alert = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 6); } } } }
}
