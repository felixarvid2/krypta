// ---------- Faror på marken: eldpelare (varning, sedan eld) och blå eld efter Mardrömmen ----------
let hazards = [];
function addHazard(x, y, kind, o) { if (!solid(x, y)) hazards.push({ x, y, kind, t: 0, warn: o.warn, life: o.life, r: o.r, dmg: o.dmg, hitT: 0 }); }
function updateHazards(dt) {
  for (const h of hazards) {
    h.t += dt; h.hitT -= dt;
    if (h.t < h.warn && (h.kind === 'meteor' || h.kind === 'rockfall')) continue; // fallande: skuggan varnar
    if (h.t < h.warn) { if (Math.random() < dt * 14) particles.push({ x: h.x + rnd(-h.r, h.r) * 0.7, y: h.y + rnd(-h.r, h.r) * 0.7, z: 0.02, vx: 0, vy: 0, vz: 0.4, life: 0.25, maxLife: 0.25, frames: fx.hit, img: fx.hit[0], size: 0.2, add: true, tint: [255, 80, 40] }); continue; }
    if ((h.kind === 'meteor' || h.kind === 'rockfall') && !h.landed) { h.landed = true; play(h.kind === 'meteor' ? 'fireburst' : 'bigboom', 0.6, h.kind === 'meteor' ? 0.7 : 1.2, { x: h.x, y: h.y }); P.shake = Math.max(P.shake, 0.6);
      for (let i = 0; i < 4; i++) particles.push({ x: h.x, y: h.y, z: 0.1, vx: rnd(-1.5, 1.5), vy: rnd(-1.5, 1.5), vz: rnd(1, 2), life: 0.6, img: h.kind === 'meteor' ? fx.fireball[2] : (fx.parts.rock ? fx.parts.rock[0] : fx.shards[7]), size: 0.12, grav: true, add: h.kind === 'meteor' }); }
    if (h.kind === 'sandpit' && Math.hypot(P.x - h.x, P.y - h.y) < h.r) P.slowT = Math.max(P.slowT, 0.3);
    if (h.hitT <= 0 && Math.hypot(P.x - h.x, P.y - h.y) < h.r) { h.hitT = 0.5; hurtPlayer(h.dmg, h.x, h.y, 'proj'); }
  }
  hazards = hazards.filter(h => h.t < h.warn + h.life);
}
function summonMinions(b) {
  play('bossroar', 0.8, 1.3); say('SKELETTEN RESER SIG', 1.5);
  for (let i = 0; i < 2; i++) {
    const a = rnd(0, TAU), x = b.x + Math.cos(a) * 2.5, y = b.y + Math.sin(a) * 2.5;
    if (solid(x, y)) continue;
    const e = makeEnemy(Math.random() < 0.5 ? 'S' : 'K', x, y); e.alert = true; e.minion = true; ents.push(e); totalEnemies++;
    for (let j = 0; j < 4; j++) particles.push({ x, y, z: 0.2, vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(1, 2), life: 0.5, maxLife: 0.5, frames: fx.fireball, img: fx.fireball[0], size: 0.3, add: true });
  }
}
function explodeFx(x, y, z) {
  play('fireburst', 0.5, rnd(0.6, 0.9), { x, y });
  particles.push({ x, y, z, vx: rnd(-0.5, 0.5), vy: rnd(-0.5, 0.5), vz: 0, life: 0.45, maxLife: 0.45, frames: fx.fireball, img: fx.fireball[0], size: rnd(0.5, 0.9), add: true });
  wpPuffFx(x, y, z); // Grafik: liten rökpuff och ljus som falnar
}
function bossDefeated(b) { // dödsanimation först
  b.dead = false; b.dying = 0.01; b.state = 'idle'; play('bossroar', 1, 0.6);
  kills--; run.kills--; // räknas när animationen är klar
  for (const e of ents) if (e.minion && !e.dead) { e.hp = 0; killEnemy(e); }
}
function missionCheck() { if (run.mission && missionProgress() >= run.mission.n) { run.gold += 100; profile.souls += 15; say('VARVETS UPPDRAG KLARAT: +100 GULD, +15 SJÄLAR', 4); logEvent('UPPDRAG KLARAT'); } run.mission = null; }
function finishBoss(b) {
  missionCheck();
  kills++; run.kills++; run.bossKilled = true; run.bosses = (run.bosses || 0) + 1; setMusic(false);
  profile.bossWins = profile.bossWins || {}; profile.bossWins[b.id] = (profile.bossWins[b.id] || 0) + 1; saveProfile(); checkAch(); play('bigboom', 1, 0.7); P.shake = 3;
  say(b.d.name + ' ÄR BESEGRAD!', 4); say('GRINDEN ÖPPNAS', 4);
  const ft = b.fightT || 0; profile.bossTimes = profile.bossTimes || {}; const rec = profile.bossTimes[b.id];
  if (!rec || ft < rec) { profile.bossTimes[b.id] = Math.round(ft); saveProfile(); say(`TID ${fmtTime(ft)} – NYTT REKORD!`, 4); } else say(`TID ${fmtTime(ft)} (REKORD ${fmtTime(rec)})`, 4);
  for (let i = 0; i < 12; i++) dropItem('gold', b.x + rnd(-1, 1), b.y + rnd(-1, 1));
  items.push({ type: 'cardpick', x: b.x, y: b.y, taken: false, drop: true, luck: 1.2, title: 'BOSSENS SKATT', legend: true });
  items.push({ type: 'page', x: b.x + 0.8, y: b.y, taken: false, drop: true }); // bossens krönikesida // bättre kortval
  for (const k in doors) if (doors[k].gate) { doors[k].target = 1; play('gate', 0.8, 1, { x: doors[k].x + 0.5, y: doors[k].y + 0.5 }); }
  spawnPortal(b.x, b.y, 'boss');
}
function spawnPortal(x, y, kind) {
  // närmaste fria plats (inte i en vägg)
  let px = x, py = y;
  if (!freeSpot(px, py, 0.35)) {
    let best = null;
    for (let r = 0.5; r < 4 && !best; r += 0.5) for (let a = 0; a < TAU; a += TAU / 12) { const tx = x + Math.cos(a) * r, ty = y + Math.sin(a) * r; if (freeSpot(tx, ty, 0.35)) { best = [tx, ty]; break; } }
    if (best) [px, py] = best; else [px, py] = [P.x, P.y];
  }
  portals.push({ x: px, y: py, kind, t: 0, armed: Math.hypot(P.x - px, P.y - py) > 1 });
  if (kind === 'floor') routePortals(portals[portals.length - 1]);
  if (kind === 'floor' && !lvl.goldRoom && run && Math.random() < 0.06) { const a = rnd(0, TAU); const gx = px + Math.cos(a) * 1.8, gy = py + Math.sin(a) * 1.8; if (freeSpot(gx, gy, 0.35)) { portals.push({ x: gx, y: gy, kind: 'gold', t: 0, armed: true }); say('EN GYLLENE PORTAL!', 3); } } // sällsynt guldkammare
  spawnPuff(px, py, 10); play('secret', 0.8, 0.7); play('gate', 0.5, 1.4, { x: px, y: py });
  say(kind === 'boss' ? 'PORTALEN: DJUPARE ELLER HEM?' : 'PORTALEN TILL NÄSTA VÅNING ÄR ÖPPEN', 4);
}
function updatePortals(dt) {
  for (const p of portals) {
    p.t += dt;
    if (!settings.lowfx && Math.random() < dt * 14) { const a = rnd(0, TAU), r = rnd(1.2, 1.8); particles.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, z: rnd(0.1, 1), vx: -Math.cos(a) * r * 1.6, vy: -Math.sin(a) * r * 1.6, vz: 0, life: 0.6, maxLife: 0.6, img: fx.hit[1], size: 0.05, add: true, tint: p.kind === 'gold' ? [255, 220, 90] : [190, 130, 255], fade: true }); } // drar in ljus
    const d = Math.hypot(P.x - p.x, P.y - p.y);
    if (d > 1.1) p.armed = true; // man måste gå ur och in igen för att använda den på nytt
    if (p.armed && d < 0.55 && p.t > 0.6) { p.armed = false; enterPortal(p); return; }
    if (hubHint(p, d)) continue;
    if (d < 2.5 && p.kind === 'floor' && !run.bossrush) { const b = p.biome || biomeFor(run.depth + 1); hint = `PORTAL → ${isBossDepth(run.depth + 1) ? 'BOSSEN' : (BIOME_NAME[b] || 'NÄSTA VÅNING') + (p.biome ? ' · ' + riskText(b) : '')}`; } // vart portalen leder
    if (Math.random() < dt * 6) particles.push({ x: p.x + rnd(-0.3, 0.3), y: p.y + rnd(-0.3, 0.3), z: rnd(0.1, 1), vx: 0, vy: 0, vz: rnd(0.3, 0.8), life: 0.6, maxLife: 0.6, frames: fx.hit, img: fx.hit[0], size: 0.15, add: true, tint: [200, 150, 255] });
  }
  if (portals.length && state === 'play') { const p = portals[0], d = Math.hypot(P.x - p.x, P.y - p.y); if (d < 2.5 && !hint) hint = p.kind === 'boss' ? 'GÅ IN I PORTALEN FÖR ATT VÄLJA' : 'GÅ IN I PORTALEN: NÄSTA VÅNING'; }
}
function enterPortal(p) {
  play('whoosh', 0.8, 0.5);
  EFX2.pend = lvl; // version 25.1: portalen syns som skärmeffekt när nästa bana börjar
  if (p.kind === 'mode') { hubEnter(p.mode); return; }
  let got = 0; // guld i närheten följer med genom portalen
  for (const it of items) if (!it.taken && (it.type === 'gold' || it.type === 'goldpile') && Math.hypot(it.x - P.x, it.y - P.y) < 8) { const g0 = run.gold; pickUp(it); it.taken = true; got += run.gold - g0; }
  if (got) say(`+${got} GULD FÖLJDE MED`, 2);
  if (p.kind === 'gold') { enterGoldRoom(); return; }
  if (p.kind === 'floor' && p.biome) { run.biomeChoice = Object.assign({}, run.biomeChoice, { [run.depth + 1]: p.biome }); run.route = Object.assign({}, run.route, { [run.depth + 1]: BIOME_RISK[p.biome] || 1 }); play('route_choice', 0.7); logEvent('VÄG: ' + BIOME_NAME[p.biome]); }
  if (p.kind === 'floor') { if (floorQuest && floorQuest.kind === 'time' && levelTime <= floorQuest.limit) { run.gold += 50; say('TIDSUTMANINGEN KLARAD: +50 GULD', 3); } floorDone(); return; }
  if (run.finale) { finaleWon(); return; }
  if (run.campaign) { campaignWon(); return; }
  if (run.abyss) { abyssNext(); return; }
  if (run.hunt) { bossHuntPick(); return; }
  if (run.bossrush) { bossRushNext(); return; }
  const next = run.depth + 1;
  openUI(() => CardUI.choice({
    title: (boss ? boss.d.name : 'BOSSEN') + ' ÄR BESEGRAD', subtitle: `VARV ${cycleOf(run.depth) + 1} KLARAT. VART VILL DU GÅ?`, cancel: 2,
    options: [
      { label: 'GÅ DJUPARE', text: `VARV ${cycleOf(next) + 1}: FEM NYA VÅNINGAR OCH EN NY, STARKARE BOSS. FIENDERNA BLIR TUFFARE, MEN SJÄLARNA FLER.` },
      { label: 'AVSLUTA RUNDAN', text: 'GÅ HEM SOM SEGRARE OCH TA MED SJÄLARNA.' },
      { label: 'STANNA KVAR', text: 'PLOCKA UPP GULDET FÖRST. PORTALEN FINNS KVAR.' },
    ],
  }, i => {
    closeUI();
    if (i === 0) goDeeper();
    else if (i === 1) endRun(true);
  }));
}
const MISSIONS = [{ id: 'champions', text: 'DÖDA 2 CHAMPIONS', n: 2, k: 'champions' }, { id: 'freed', text: 'BEFRIA 2 FÅNGAR', n: 2, k: 'freed' }, { id: 'challenges', text: 'KLARA 1 UTMANING', n: 1, k: 'challenges' },
  { id: 'bounty', text: 'DÖDA 2 MÄRKTA ELITER', n: 2, k: 'bounties' }, { id: 'secrets', text: 'HITTA 3 HEMLIGHETER', n: 3, k: 'secrets' }];
function missionProgress() { return run.mission ? (profile[run.mission.k] || 0) - run.mission.start : 0; }
function newMission() { const m = MISSIONS[(Math.random() * MISSIONS.length) | 0]; run.mission = { ...m, start: profile[m.k] || 0 }; }
function bossRushNext() { // bossrush: nästa boss direkt, med ett kort och full hälsa emellan
  const n = (run.rushN || 0) + 1; run.rushN = n;
  if (n >= bossPool().length) { endRun(true); return; }
  P.hp = maxHp(); P.grenades = Math.min(GREN_MAX(), P.grenades + 2);
  openUI(() => draftUI(drawCards(3, { luck: 1 }), { title: `BOSSRUSH ${n} AV ${bossPool().length}`, subtitle: 'VÄLJ ETT KORT INFÖR NÄSTA BOSS', skipLabel: 'INGET KORT' }, card => { if (card) gainCard(card); loadFloor((n + 1) * (FLOORS + 1)); lockPointer(); }));
}
function enterGoldRoom() { // hemlig nivå: guldkammaren
  logEvent('GULDKAMMAREN'); stat('goldRooms'); play('secret', 1, 0.8);
  const m = ['111111111111', '1$.$.$..$.$1', '1.C......C.1', '1$..$..$..$1', '1....P.....1', '1$..$..$..$1', '1.....$....1', '1$.$....$.$1', '111111111111'];
  const prevName = lvl.name, prevBiome = lvl.biome;
  startLevel({ map: m, name: 'GULDKAMMAREN', biome: prevBiome, floor: 'floor_tiles_blue', ceil: 'floor_stone_pattern', fog: [40, 30, 10], ambient: 0.75, rooms: [], goldRoom: true });
  spawnPortal(6.5, 6.5, 'floor'); say('GULDKAMMAREN – TA ALLT DU KAN', 4); levelBanner = 0; lvl.name = prevName;
}
function goDeeper() {
  run.loop = (run.loop || 0) + 1; run.gold += 50; newMission();
  P.hp = maxHp(); play('bossroar', 0.7, 0.6);
  openUI(() => draftUI(drawCards(3, { luck: 0.3 }), { title: `VARV ${cycleOf(run.depth + 1) + 1}`, subtitle: 'DU STIGER NED DJUPARE. VÄLJ ETT KORT.', skipLabel: 'HOPPA ÖVER (+25 GULD)' }, card => {
    if (card) gainCard(card); else run.gold += 25;
    loadFloor(run.depth + 1); lockPointer();
  }));
}

// ---------- Våningsslut, rundslut och själar ----------
let stats = null;
function floorDone() {
  if (run.custom) { customDone(); return; }
  if (run.maze) { mazeDone(); return; }
  if (boss) { endRun(true); return; }
  const bonus = Math.round(300 + (kills === totalEnemies ? 200 : 0) + secrets * 100 + Math.max(0, 180 - levelTime) * 2);
  score += bonus;
  const extra = []; // guldbonusar: snabb, orörd, alla hemligheter
  if (levelTime < 120) { run.gold += 20; extra.push('SNABB: +20 GULD'); }
  if (lvlStat.taken < 1) { run.gold += 40; extra.push('ORÖRD: +40 GULD'); run.untouched = (run.untouched || 0) + 1; }
  if (totalSecrets && secrets >= totalSecrets) { run.gold += 30; extra.push('ALLA HEMLIGHETER: +30 GULD'); }
  if (totalEnemies && kills >= totalEnemies) { run.gold += 25; extra.push('ALLA FIENDER: +25 GULD'); }
  if (chests.length && chests.every(c => c.open)) { run.gold += 20; extra.push('ALLA KISTOR: +20 GULD'); }
  if (!lvlStat.healed) { run.gold += 15; extra.push('INGEN HÄLSA: +15 GULD'); }
  if (mod('interest') > 0) { const g = Math.min(30, Math.round(run.gold * mod('interest'))); if (g) { run.gold += g; extra.push(`RÄNTA: +${g} GULD`); } }
  if (floorEvent) extra.push('HÄNDELSE: ' + EVENTS[floorEvent].name);
  if (run.floorCurse) { run.gold += 60; extra.push('FÖRBANNELSEN BRUTEN: +60 GULD'); run.floorCurse = false; }
  let open = 0, saw = 0; for (let i = 0; i < mw * mh; i++) { const c = map[(i / mw) | 0][i % mw]; if (!isWallChar(c)) { open++; if (seen[i]) saw++; } }
  if (!run.practice) { profile.floorRec = Object.assign({}, profile.floorRec); if (!profile.floorRec[run.depth] || levelTime < profile.floorRec[run.depth]) profile.floorRec[run.depth] = Math.round(levelTime); }
  const grade = floorGrade(extra);
  stats = { grade: grade.g, name: lvl.name, kills, totalEnemies, secrets, totalSecrets, items: itemsTaken, totalItems, time: levelTime, rec: (profile.floorRec || {})[run.depth], stealth: run.floorStealth || 0, bonus,
    extra, acc: lvlStat.shots ? Math.round(100 * lvlStat.hits / lvlStat.shots) : 0, taken: Math.round(lvlStat.taken), explored: Math.round(100 * saw / Math.max(1, open)), tip: TIPS[(Math.random() * TIPS.length) | 0] };
  run.graph = run.graph || []; run.graph.push({ hp: P.hp / maxHp(), gold: run.gold, dmg: Math.round((run.dmgDealt || 0) * 10) });
  ghostSave(); stat('floors');
  if (lvl.biome === 'swamp') stat('swampFloors');
  questFloorEnd();
  if (run.bank) { const add = Math.round(run.bank * 0.05 * (1 + mod('bankInterest'))); run.bank += add; extra.push(`RÄNTA I BANKEN: +${add}`); }
  if (run.floorStealth) { extra.push(`SMYG: ${run.floorStealth} DÖDADE OUPPTÄCKT`); run.floorStealth = 0; }
  run.bestFloorKills = Math.max(run.bestFloorKills || 0, kills); if (run.route && run.route[run.depth] === 3) stat('hardRoutes'); vib('level');
  if (lvl.biome) { profile.biomeFloors = profile.biomeFloors || {}; profile.biomeFloors[lvl.biome] = (profile.biomeFloors[lvl.biome] || 0) + 1; }
  state = 'stats'; msgs.length = 0; play('win', 0.7); if (levelTime < 60) run.fast = true; checkAch();
  mouseDown = false; aimDown = false;
  if (document.pointerLockElement) document.exitPointerLock();
}
function nextFloor() { // efter statistiken: välj ett kort, sedan nästa våning
  if (state !== 'stats') return;
  stats = null;
  const depth = run.depth + 1;
  run.floorCurse = false;
  if (!isBossDepth(depth) && depth > 2 && Math.random() < 0.3 && !run.practice) { // ibland: förbanna nästa våning för en belöning
    openUI(() => CardUI.choice({ title: 'EN RÖST I MÖRKRET', subtitle: 'FÖRBANNA NÄSTA VÅNING?', cancel: 1,
      options: [{ label: 'TA FÖRBANNELSEN', text: 'FIENDERNA: +30 % SKADA OCH MER HÄLSA · +60 GULD NÄR DU KLARAR DEN' }, { label: 'NEJ TACK', text: '' }] }, i => { run.floorCurse = i === 0; setTimeout(() => floorDraft(depth), 50); }));
    return;
  }
  floorDraft(depth);
}
function floorDraft(depth) {
  openUI(() => draftUI(drawCards(3), { title: `VÅNING ${run.depth} KLARAD`, subtitle: isBossDepth(depth) ? 'VÄLJ ETT KORT INFÖR BOSSEN' : 'VÄLJ ETT KORT', skipLabel: 'HOPPA ÖVER (+25 GULD)' }, card => {
    if (card) gainCard(card); else run.gold += 25;
    loadFloor(depth); lockPointer();
  }));
}
function endRun(win) {
  const r = run;
  if (r.practice) { r.souls = 0; r.win = win; saveProfile(); if (win) { state = 'runover'; P.deadT = 0; play('win', 1); if (document.pointerLockElement) document.exitPointerLock(); } return; } // övning: inget sparas
  if (win && r.bossrush && !r.hunt) stat('rushWins');
  if (win && r.diff === 3) profile.ascMax = Math.max(profile.ascMax || 0, (r.asc || 0) + 1);
  if (win) profile.fastestWin = Math.min(profile.fastestWin || 1e9, Math.round(r.time));
  if (!win && r.cause) { profile.deathsBy = profile.deathsBy || {}; profile.deathsBy[r.cause] = (profile.deathsBy[r.cause] || 0) + 1; }
  const souls = Math.round((r.kills * 0.6 + (r.depth - 1) * 6 + (win ? 60 : 0) + (r.bossKilled ? 20 : 0) + (r.guardians || 0) * 5 + (r.bosses || 0) * 15) * diff().souls * (r.cmode || '').split('+').reduce((a, k) => a * (CMODE_SOULS[k] || 1), 1) * (r.abyss ? 1 + mod('abyssSouls') : 1));
  if (r.survival) { const wv = r.survival.wave; profile.survivalBest = Math.max(profile.survivalBest || 0, wv); profile.survivalTop = (profile.survivalTop || []).concat({ wave: wv, d: new Date().toISOString().slice(0, 10) }).sort((a, b) => b.wave - a.wave).slice(0, 10); r.cause = r.cause || 'ÖVERLEVNAD'; }
  profile.bestLevel = Math.max(profile.bestLevel || 0, r.lvl || 1);
  if (r.abyss) { profile.abyssBest = Math.max(profile.abyssBest || 0, r.depth); stat('abyssRuns'); }
  if (r.abyssDaily) { const d = new Date().toISOString().slice(0, 10); profile.abyssDailyTop = (profile.abyssDailyTop || []).concat({ d, depth: r.depth, lvl: r.lvl || 1 }).sort((a, b) => b.depth - a.depth).slice(0, 10); profile.abyssToday = { d, depth: Math.max(r.depth, profile.abyssToday && profile.abyssToday.d === d ? profile.abyssToday.depth : 0) }; }
  if (r.stealthKills) profile.bestStealth = Math.max(profile.bestStealth || 0, r.stealthKills);
  if (win && r.bossrush && !r.hunt) profile.rushBest = Math.min(profile.rushBest || 1e9, Math.round(r.time));
  if (r.cmode) for (const k of new Set([r.cmode, ...r.cmode.split('+')])) { profile.cmodeBest = Object.assign({}, profile.cmodeBest, { [k]: Math.max((profile.cmodeBest || {})[k] || 0, r.depth) }); if (win) profile.cmodeWins = Object.assign({}, profile.cmodeWins, { [k]: 1 }); }
  recordCheck(r);
  if (r.bank) { const bs = Math.floor(r.bank / 10); profile.souls += bs; r.souls = (r.souls || 0) + bs; } // banken blir själar
  profile.kills = (profile.kills || 0) + r.kills; profile.time = (profile.time || 0) + r.time;
  profile.wkills = profile.wkills || {}; for (const [k, v] of Object.entries(r.wkills || {})) profile.wkills[k] = (profile.wkills[k] || 0) + v;
  if (win && r.diff === 3) profile.nightmareWin = true;
  if (win && r.diff === 4) profile.storyWin = true;
  profile.masteryMax = Math.max(profile.masteryMax || 0, ...WEAPONS.map(w => masteryLv(w.id) + 1));
  r.souls = souls; r.win = win;
  if (win) score += 5000 + r.gold * 5;
  profile.souls += souls; if (win) profile.wins++;
  profile.bestDepth = Math.max(profile.bestDepth, r.depth);
  profile.bestScore = Math.max(profile.bestScore, score);
  profile.history.unshift({ seed: seedText(r.seed), depth: r.depth, win, score, kills: r.kills, cards: r.owned.length, time: Math.round(r.time), souls, daily: r.daily, d: Date.now(),
    biome: lvl && lvl.biome, cause: r.cause || '', diff: r.diff, cls: r.cls, cmode: (r.abyss ? 'AVGRUND' : '') || r.cmode || '', lvl: r.lvl || 1, biomes: [...new Set(r.biomes || [])].slice(0, 9), stealth: r.stealthKills || 0 });
  if (r.daily) { profile.dailyTop = (profile.dailyTop || []).concat({ d: new Date().toISOString().slice(0, 10), score, depth: r.depth }).sort((a, b) => b.score - a.score).slice(0, 10); }
  checkAch();
  profile.history.length = Math.min(profile.history.length, 20);
  saveProfile(); if (!r.survival && !r.maze && !r.hunt) store.del(runKey());
  if (window.Music) Music.sting(win ? 'win' : 'death');
  if (win) { state = 'runover'; P.deadT = 0; play('win', 1); if (document.pointerLockElement) document.exitPointerLock(); }
}
const TIPS = ['L TÄNDER FICKLAMPAN – MEN FIENDERNA SER LJUSET', 'G KASTAR EN STEN SOM LOCKAR BORT VAKTERNA', 'DUCKA I MÖRKRET FÖR ATT SMYGA', 'SLÅ BAKIFRÅN PÅ EN OVETANDE FIENDE', 'HOPPA FÖR ATT TA DIG UR KVICKSANDEN', 'SKJUT JUVELEN I FARAONENS PANNA', 'SCHAKALEN PARERAR FRAMIFRÅN – GÅ RUNT', 'DÖDA FICKTJUVEN SÅ FÅR DU TILLBAKA GULDET', 'BANKIREN GER RÄNTA PÅ VARJE VÅNING', 'KRÖNIKESIDOR GER SJÄLAR FÖRSTA GÅNGEN', 'ENTER I PAUSEN ÖPPNAR MENYN',
  'SPARKA MED V (ELLER HANDEN) NÄR DU STÅR NÄRA', 'TRYCK R IGEN I DET GRÖNA FÄLTET', 'KRUTFAT SMÄLLER – LOCKA DIT FIENDERNA', 'SKJUT NED SÖKANDE KLOT', 'Q BYTER TILL FÖRRA VAPNET',
  'M VÄXLAR MELLAN LITEN OCH STOR KARTA', 'SHAMANEN HELAR – DÖDA DEN FÖRST', 'LÅT ORKKRIGAREN KROCKA I VÄGGEN', 'BLODSLEMMET DELAR SIG', 'GRAVRÖVAREN SYNS BARA NÄRA', 'EN VAPENPAKT GER UNIKA UPPGRADERINGAR',
  'PORTALEN SUGER MED SIG GULDET', 'KLARA VÅNINGEN UTAN SKADA FÖR BONUS', 'BRUNNAR HELAR EN GÅNG', 'ALTARET GER GULD MEN ETT FÖRBANNAT KORT', 'LÅDOR OCH KRUKOR GÖMMER SAKER', 'SJÄLAALTARET GER BESTÅENDE UPPGRADERINGAR',
  'VÄKTAREN VAKTAR VÅNINGENS PORTAL', 'MIMICS SER UT SOM KISTOR', 'ELITER KAN TAPPA ETT KORT', 'SKÖLDADE ELITER MÅSTE FÖRST FÖRLORA SKÖLDEN',
  'SPACE HOPPAR – HOPPA ÖVER LAVA OCH STOCKAR', 'CTRL DUCKAR: SPRING + CTRL = GLID', 'Z ELLER DUBBELTRYCK RUSAR', 'F KASTAR GRANAT – HÅLL FÖR LÄNGRE KAST', 'SKJUT SPRUCKNA VÄGGAR MED GRANATER',
  'SOVANDE FIENDER VAKNAR AV SPRING', 'BAKHÅLL GER 50 % MER SKADA', 'SMEDJAN GÖR VAPNET STARKARE', 'SPAKEN ÖPPNAR GALLRET', 'NYCKLAR ÖPPNAR LÅSTA DÖRRAR OCH KISTOR', 'LAVAVÅGEN – HOPPA ÖVER DEN'];
const fmtTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// ---------- Huvudloop ----------
let last = 0;
let loopErrors = 0, lastError = '';
let lastDrawT = 0;
function loop(t) { // ett fel i en bildruta får aldrig stoppa spelet: nästa bildruta beställs först
  requestAnimationFrame(loop);
  if (settings.fps30 && t - lastDrawT < 30) return; lastDrawT = t; // sparläge: 30 bilder i sekunden
  try { frameStep(t); } catch (err) {
    loopErrors++; console.error(err); lastError = String(err && err.message || err).toUpperCase().slice(0, 60);
    if (loopErrors <= 3) { try { say('FEL: ' + String(err && err.message || err).toUpperCase().slice(0, 48), 4); } catch (e) { /* inget att visa på */ } }
    if (loopErrors <= 5) reportError(err);
  }
}
function reportError(err) { // sparas så att felet kan hittas efteråt
  try { const list = store.get('errors', []); list.unshift({ t: Date.now(), msg: String(err && err.message || err), stack: String(err && err.stack || '').split('\n').slice(0, 4).join(' | '), depth: run && run.depth, biome: lvl && lvl.biome });
    store.set('errors', list.slice(0, 10)); } catch (e) { /* lagring saknas */ }
}
function spriteError(err, s) { if (s && s.o) s.o.renderFail = (s.o.renderFail || 0) + 1; if (loopErrors < 5) { loopErrors++; lastError = String(err && err.message || err).toUpperCase().slice(0, 60); reportError(err); console.error(err); } }
function frameStep(t) {
  const realDt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
  pbTick(realDt); // version 27: partikelbudgeten (AUTO)
  lowFpsGuard(realDt); if (Math.floor(t / 1000) !== Math.floor((t - realDt * 1000) / 1000)) updateWakeLock();
  syncEndScreens(); // dödsskärmen och nivåslutet (DOM)
  if (state !== 'play') pollGamepad(realDt);
  let dt = realDt; if (hitStop > 0) { hitStop -= realDt; dt = realDt * 0.06; } // träffstopp: tiden står nästan still ett ögonblick
  if (state === 'play' && run && up('bullettime') && WS.aim > 0.8) dt *= 0.5; // tidsstoppet
  if (slowmo > 0) { slowmo -= realDt; dt *= 0.35; } // bossens entré
  if (wheel && wheel.open && state === 'play') dt *= 0.3; // vapenhjulet saktar ned tiden
  dt *= settings.gameSpeed || 1; // hjälpläget: långsammare spel
  if (state === 'title') drawTitleBg(realDt); // rörlig bakgrund bakom startskärmen
  if (map && state !== 'title') {
    if (state !== 'pause' && state !== 'ui' && !(photo && state === 'play')) update(dt);
    updateLight(); render();
    if (photo && state === 'play') photoFilter(ctx);
    if (photo && state === 'play') { const t = 'FOTOLÄGE – K FÖR ATT FORTSÄTTA'; if (tmr % 2 < 1.2) txt(t, (W - textW(t)) / 2, VH - 12, '#e8d9b0'); }
    else { drawWeapon(); drawHUD(); }
    if (deathMap && ((state === 'dead' && P.deadT > 1.2) || state === 'runover')) { ctx.fillStyle = '#0b0806f2'; ctx.fillRect(0, 0, W, VH); drawMap(false); const t = 'HÄR SLUTADE RUNDAN – M STÄNGER KARTAN'; txt(t, (W - textW(t)) / 2, VH - 10, '#ffe9a8'); }
    else if (state === 'dead' && P.deadT > 1.2) drawRunOver(false);
    else if (state === 'runover') drawRunOver(true);
    if (state === 'pause' && pauseMap) drawMap(false);
    else if (state === 'pause') drawPause();
    if (state === 'stats') drawStats();
  }
}
function drawPause() { // pausen: PAUS och en enda rad (biom · våning · guld); allt annat finns i pausmenyn (Enter) under MER → RUNDAN
  const pk = settings.reduceMotion || MF.st !== 'pause' ? 1 : clamp((performance.now() - MF.stT) / 280, 0, 1); // MENY: bilden suddas och mörknar mjukt
  if (!settings.lowfx && 'filter' in ctx) { ctx.filter = `blur(${(1.4 * pk).toFixed(2)}px)`; ctx.drawImage(canvas, 0, 0); ctx.filter = 'none'; }
  ctx.fillStyle = `rgba(8,6,10,${(0.8 * pk).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
  ctx.font = '16px "PressStart2P"'; ctx.textBaseline = 'top'; const w = ctx.measureText('PAUS').width; txt('PAUS', (W - w) / 2, 70, '#ffe9a8', 2);
  const ln = pauseLine(); txt(ln, (W - textW(ln)) / 2, 100, '#c9a87a');
  const go = isTouch() ? 'TRYCK FÖR ATT FORTSÄTTA' : 'KLICKA FÖR ATT FORTSÄTTA · ENTER MENY'; txt(go, (W - textW(go)) / 2, 122, '#8a7558', 1, true, 0.6 + 0.4 * Math.abs(Math.sin(tmr * 2)));
}
function pauseExtras() { // uppstigning, klass, uppdrag och händelselogg
  const out = [];
  if (run.cls && CLASSES[run.cls]) out.push('KLASS: ' + CLASSES[run.cls].name + (run.asc ? `  · UPPSTIGNING ${run.asc}` : '') + (run.cmode ? '  · ' + cmodeNames(run.cmode) : ''));
  out.push(`SJÄLAR ${profile.souls} · DJUP ${run.depth} (REKORD ${profile.bestDepth})` + (run.pet ? ` · ${PETS[run.pet].name} NIVÅ ${petLv()}` : ''));
  if (run.mission) out.push('VARVETS UPPDRAG: ' + run.mission.text + ` (${Math.min(missionProgress(), run.mission.n)}/${run.mission.n})`);
  if (run.log && run.log.length) out.push('SENAST: ' + run.log.slice(-3).join(' · '));
  if (quests) out.push('UPPDRAG: ' + quests.map(q => (q.done ? '✓ ' : q.failed ? '✗ ' : '') + q.text).join(' · '));
  { const rs = curRunes(), c = activeCard(); if (rs.length || c) out.push((rs.length ? 'RUNOR: ' + rs.map(r => RUNES[r].name).join(', ') : '') + (c ? '  FÖRMÅGA: ' + c.name : '')); }
  if (lastError) out.push('FEL I SPELET: ' + lastError);
  return out;
}
function bonusLines() { // de viktigaste bonusarna från korten, sammanfattade
  const f = (k, label, pct = true) => M[k] ? `${label} ${M[k] > 0 ? '+' : ''}${pct ? Math.round(M[k] * 100) + '%' : Math.round(M[k] * 10) / 10}` : null;
  const parts = [f('dmg', 'SKADA'), f('fireRate', 'ELD'), f('critChance', 'KRIT'), f('maxHp', 'HP', false), f('moveSpeed', 'FART'), f('lifesteal', 'LIVSSTÖLD')].filter(Boolean);
  const out = [];
  if (parts.length) { out.push(parts.slice(0, 3).join('  ')); if (parts.length > 3) out.push(parts.slice(3).join('  ')); }
  if (run.pact) out.push(`EDEN: ${Cards.WEAPON_NAME[run.pact]}  (${[...UP].length} UPPGR.)`);
  return out;
}
function overlay(t1, lines, col) {
  ctx.fillStyle = col + 'b0'; ctx.fillRect(0, 0, W, VH);
  ctx.font = '16px "PressStart2P"'; ctx.textBaseline = 'top';
  const w = ctx.measureText(plain(t1)).width; txt(t1, (W - w) / 2, 22, '#fff', 2);
  lines.forEach((s, i) => { txt(s, (W - textW(s)) / 2, 54 + i * 13, i ? '#e0c890' : '#ffe9a8'); });
}
