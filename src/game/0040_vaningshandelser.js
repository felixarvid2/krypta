// ---------- Våningshändelser ----------
const EVENTS = {
  bloodmoon: { name: 'BLODMÅNE', text: 'STARKARE FIENDER, DUBBELT GULD', outdoor: true },
  mist: { name: 'DIMNATT', text: 'TÄT DIMMA, MEN FLER SKATTER' },
  quake: { name: 'JORDBÄVNING', text: 'STENAR FALLER FRÅN TAKET' },
  dark: { name: 'MÖRK VÅNING', text: 'BARA FACKLORNA LYSER' },
  goldrain: { name: 'GULDREGN', text: 'MER GULD, SNABBARE FIENDER' },
  wisdom: { name: 'VISDOMENS NATT', text: '+50 % ERFARENHET' },
  resonance: { name: 'RESONANS', text: 'KRISTALLERNA SJUNGER – SKOTTEN DELAS FLER GÅNGER', biome: 'crystal' },
  stormtide: { name: 'STORMFLOD', text: 'TIDVATTNET KOMMER DUBBELT SÅ OFTA', biome: 'sunken' },
};
function pickFloorEvent(rng) {
  floorEvent = ''; floorQuest = null;
  if (boss || !run || run.depth < 2 || rng.next() > 0.28) return;
  const ids = Object.keys(EVENTS).filter(k => (!EVENTS[k].outdoor || lvl.sky) && (!EVENTS[k].biome || EVENTS[k].biome === lvl.biome));
  floorEvent = ids[(rng.next() * ids.length) | 0];
  if (floorEvent === 'dark') for (let i = 0; i < 2; i++) { const s = randomFreeCell(rng); if (s) items.push({ type: 'battery', x: s[0], y: s[1], taken: false }); } // mörka våningar: lampolja
  if (floorEvent === 'bloodmoon') for (const e of ents) if (!e.boss) { e.hp = e.maxHp = e.maxHp * 1.3; e.d = { ...e.d, dmg: e.d.dmg * 1.25 }; }
  if (floorEvent === 'goldrain') for (const e of ents) if (!e.boss) e.d = { ...e.d, speed: e.d.speed * 1.15 };
  if (floorEvent === 'mist') { for (let i = 0; i < 4; i++) { const s = randomFreeCell(rng); if (s) items.push({ type: 'goldpile', x: s[0], y: s[1], taken: false }); } const s = randomFreeCell(rng); if (s) chests.push({ x: s[0], y: s[1], open: false, t: 0 }); }
  if (floorEvent === 'stormtide' && lvl.tide) lvl.tide = { ...lvl.tide, period: lvl.tide.period / 2 };
  logEvent(EVENTS[floorEvent].name); stat('events');
}
function randomFreeCell(rng) { for (let i = 0; i < 60; i++) { const x = (rng.next() * mw) | 0, y = (rng.next() * mh) | 0; if (map[y][x] === '.' && Math.hypot(x + 0.5 - P.x, y + 0.5 - P.y) > 6) return [x + 0.5, y + 0.5]; } return null; }
let floorQuest = null, quakeT = 8;
function setupQuests(rng) { // jakt, tidsutmaning, mimicjakt, spöket och ditt förra lik
  const elites = ents.filter(e => e.elite && !e.boss);
  if (elites.length && rng.next() < 0.3) { const e = elites[(rng.next() * elites.length) | 0]; e.bounty = true; floorQuest = { kind: 'bounty', text: 'JAKT: DÖDA DEN MÄRKTA ELITEN' }; }
  else if (!boss && rng.next() < 0.2) { const lim = 90 + mw * mh / 12; floorQuest = { kind: 'time', limit: Math.round(lim), text: `TIDSUTMANING: PORTALEN INOM ${fmtTime(lim)}` }; }
  else if (ents.some(e => e.type === 'Q')) floorQuest = { kind: 'mimic', text: 'EN MIMIC GÖMMER SIG PÅ VÅNINGEN' };
  if (floorQuest) say(floorQuest.text, 4);
  // spöket som söker sina ben
  const bones = props.filter(p => p.ch === 'j');
  if (!boss && bones.length >= 2 && rng.next() < 0.18 && bossFx.ghost) {
    const spot = randomFreeCell(rng);
    if (spot) { const b = bones[(rng.next() * bones.length) | 0]; b.questBones = true; ghosts.push({ x: spot[0], y: spot[1], talked: false, done: false, bones: b }); }
  }
  // där du dog senast (samma frö och våning)
  const ld = profile.lastDeath;
  if (ld && ld.seed === run.seed && ld.depth === run.depth && !boss) { echoes.push({ x: ld.x, y: ld.y, cause: ld.cause }); for (let i = 0; i < 4; i++) items.push({ type: 'gold', x: ld.x + rnd(-0.3, 0.3), y: ld.y + rnd(-0.3, 0.3), taken: false, drop: true }); }
}
let ghosts = [], echoes = [];
function logEvent(t) { if (!run) return; run.log = run.log || []; run.log.push(`V${run.depth}: ${t}`); if (run.log.length > 12) run.log.shift(); }
function updateWorldEvents(dt) {
  if (floorEvent === 'quake') { quakeT -= dt; if (quakeT <= 0) { quakeT = rnd(7, 12); P.shake = Math.max(P.shake, 1.8); play('bigboom', 0.6, 0.5); say('MARKEN SKAKAR', 1.2); for (let i = 0; i < 4; i++) { const a = rnd(0, TAU), r = rnd(0.5, 4); fallHazard(P.x + Math.cos(a) * r, P.y + Math.sin(a) * r, 'rockfall', 9, 1.2 + i * 0.15); } } }
  for (const g of ghosts) { // spöket ber om sina ben
    const d = Math.hypot(g.x - P.x, g.y - P.y);
    if (!g.talked && d < 2) { g.talked = true; play('moan', 0.6, 1.3); say('SPÖKET: "HITTA MINA BEN ... JAG BELÖNAR DIG"', 4); logEvent('SPÖKET BAD OM SINA BEN'); }
    if (g.talked && !g.done && g.bones && Math.hypot(g.bones.x - P.x, g.bones.y - P.y) < 1.1) {
      g.done = true; stat('ghosts'); play('secret', 0.8, 1.3); say('BENEN ÄR FUNNA – SPÖKET FÅR RO', 3); spawnPuff(g.x, g.y, 10); logEvent('SPÖKET FICK RO');
      setTimeout(() => openUI(() => draftUI(drawCards(3, { luck: 1 }), { title: 'SPÖKETS TACK', subtitle: 'VÄLJ ETT KORT', skipLabel: 'TA INGET' }, c => { if (c) gainCard(c); closeUI(); })), 600);
    }
    if (g.talked && !g.done && g.bones && Math.random() < dt * 4) particles.push({ x: g.bones.x + rnd(-0.2, 0.2), y: g.bones.y + rnd(-0.2, 0.2), z: 0.1, vx: 0, vy: 0, vz: 0.5, life: 0.8, maxLife: 0.8, img: fx.hit[1], size: 0.05, add: true, tint: [150, 210, 255], drift: true });
  }
  ghosts = ghosts.filter(g => !g.done);
  for (const e of echoes) if (!e.told && Math.hypot(e.x - P.x, e.y - P.y) < 1.5) { e.told = true; say(`HÄR DOG DU SENAST${e.cause ? ' (' + e.cause + ')' : ''}`, 3); play('moan', 0.4, 0.8); }
  if (lvl.sky && !settings.lowfx) { starT -= dt; if (starT <= 0) { starT = rnd(12, 30); star = { a: P.a + rnd(-0.6, 0.6), y: rnd(8, 30), t: 0 }; } if (star) { star.t += dt; if (star.t > 0.9) star = null; } } // stjärnfall
}
let starT = 15, star = null;
function addCobwebs(rng) { // spindelväv uppe i mörka hörn inomhus
  if (lvl.sky && lvl.biome !== 'courtyard') return;
  let n = 0;
  for (let y = 1; y < mh - 1 && n < 40; y++) for (let x = 1; x < mw - 1 && n < 40; x++) {
    if (isWallChar(map[y][x]) || rng.next() > 0.25) continue;
    for (const [dx, dy, side] of [[1, 0, 0], [-1, 0, 0], [0, 1, 1], [0, -1, 1]]) {
      if (!isWallChar(map[y + dy][x + dx])) continue;
      const corner = side === 0 ? (isWallChar(map[y - 1][x + dx]) || isWallChar(map[y + 1][x + dx])) && (isWallChar(map[y - 1][x]) || isWallChar(map[y + 1][x])) : (isWallChar(map[y + dy][x - 1]) || isWallChar(map[y + dy][x + 1])) && (isWallChar(map[y][x - 1]) || isWallChar(map[y][x + 1]));
      if (!corner) continue;
      const hit = { mx: x + dx, my: y + dy, side, cell: map[y + dy][x + dx], wx: rng.next() < 0.5 ? 0.06 : 0.94 };
      wallMark(hit, dx, dy, 0.9, 'web'); n++; break;
    }
  }
}
function lockChests(rng) { // låsta kistor (en per nyckel) och förbannade kistor
  let keysOnLevel = items.filter(i => i.type === 'key').length;
  for (const c of chests) {
    if (keysOnLevel > 0 && rng.next() < 0.5) { c.locked = true; keysOnLevel--; continue; }
    if (rng.next() < 0.18) c.rare = true; else if (rng.next() < 0.08) c.cursed = true;
  }
}
function setupEnemyRoles(rng) { // sovande, patrullerande, champions och veteraner
  const sr = lvl.rooms ? lvl.rooms.find(r => r.type === 'start') : null;
  for (const e of ents) {
    if (e.boss || e.dormant || e.minion) continue;
    if (sr && e.x >= sr.x && e.y >= sr.y && e.x < sr.x + sr.w && e.y < sr.y + sr.h) continue;
    const r = rng.next();
    if (r < 0.2 && !e.elite) e.sleep = true;
    else if (r < 0.45) { const a = rng.next() * TAU; let best = null; for (let k = 4; k >= 1.5; k -= 0.5) { const x2 = e.x + Math.cos(a) * k, y2 = e.y + Math.sin(a) * k; if (!solid(x2, y2) && hasLOS(e.x, e.y, x2, y2)) { best = [x2, y2]; break; } } if (best) e.patrol = { x1: e.x, y1: e.y, x2: best[0], y2: best[1], leg: true, wait: rng.next() * 2 }; }
    if (!e.elite && rng.next() < 0.025 + run.depth * 0.004) makeChampion(e);
    if (cycleOf(run.depth) > 0 && !e.elite && !e.champion) { e.veteran = true; e.hp = e.maxHp = e.maxHp * 1.25; }
  }
}
function startAngle(x, y) { // titta mot den längsta öppna riktningen
  let best = 0, bd = -1;
  for (const [a, dx, dy] of [[0, 1, 0], [Math.PI / 2, 0, 1], [Math.PI, -1, 0], [-Math.PI / 2, 0, -1]]) {
    let d = 0; while (d < 30 && !isWallChar(cellAt(x + dx * (d + 1), y + dy * (d + 1)))) d++;
    if (d > bd) { bd = d; best = a; }
  }
  return best;
}

const depthHp = () => (1 + 0.2 * Math.max(0, run.depth - 1)) * (asc() >= 1 ? 1.1 : 1);
const depthMul = () => 1 + 0.25 * Math.max(0, cycleOf(run.depth) - 2); // oändligt läge: poängmultiplikator efter varv 3
const asc = () => (run && run.asc) || 0; // uppstigning 1–5 på MARDRÖM
function makeEnemy(type, x, y) {
  const d = ENEMY_DEFS[type], hp = d.hp * diff().hp * depthHp();
  const r = Math.random();
  return { type, d, x, y, hp, maxHp: hp, cowardly: r < 0.35, dodgy: 'IVR'.includes(type) && r > 0.4, flank: [-1, 0, 1][(Math.random() * 3) | 0], state: 'idle', t: Math.random() * 3, cd: 1, alert: false, flip: Math.random() < 0.5, dead: false, flash: 0, growlT: 2 + Math.random() * 4, didHit: false, burn: 0, slow: 0, burnAcc: 0 };
}
function makeChampion(e) { // sällsynt gyllene fiende
  e.champion = true; e.hp = e.maxHp = e.maxHp * 3; e.d = { ...e.d, size: e.d.size * 1.15, dmg: e.d.dmg * 1.3, score: e.d.score * 4 }; return e;
}
function makeElite(rng, x, y) {
  const type = rng.pick(run.depth >= 3 ? ['S', 'K', 'V', 'L', 'I', 'W', 'R'] : run.depth >= 2 ? ['S', 'K', 'V', 'L', 'I'] : ['S', 'K', 'L']);
  const e = makeEnemy(type, x, y), m = rng.pick(ELITE_MODS);
  e.elite = m; e.hp = e.maxHp = e.maxHp * (m.id === 'tough' ? 4 : 2.4);
  if (m.id === 'shielded') e.eshield = e.eshieldMax = e.maxHp * 0.6; // skölden tar skadan först
  if (m.id === 'evasive') e.dodgy = true;
  if (m.id === 'giant') { e.hp = e.maxHp = e.maxHp * 2; e.d = { ...e.d, size: e.d.size * 1.4, speed: e.d.speed * 0.75, dmg: e.d.dmg * 1.4 }; }
  // djupare varv: eliter kan få en andra egenskap
  if (cycleOf(run.depth) > 0 && rng.chance(0.5)) { const m2 = rng.pick(ELITE_MODS.filter(x => x !== m && x.id !== 'tough')); e.elite2 = m2; e.elite = { ...m, name: m.name + ' & ' + m2.name }; if (m2.id === 'shielded') e.eshield = e.eshieldMax = e.maxHp * 0.6; }
  e.d = Object.assign({}, e.d, { size: e.d.size * 1.3, speed: e.d.speed * (m.id === 'fast' ? 1.7 : 1), dmg: e.d.dmg * (m.id === 'brute' ? 1.8 : 1.2) * (asc() >= 4 ? 1.2 : 1), cd: e.d.cd * (m.id === 'fast' ? 0.7 : 1) });
  return e;
}
const GUARD_DMG = 0.7; // väktarens skadefaktor mot bossen (närstrid via d.dmg, fasta skott via bossShotDmg)
function makeGuardian(x, y) { // väktaren: en mindre version av en boss, vaktar sitt rum på vanliga våningar
  const id = lvl.guardian; if (!BOSSES[id]) return null;
  const def = BOSSES[id], hp = def.hp * 0.32 * diff().hp * depthHp() * (1 + 0.4 * cycleOf(run.depth));
  const d = { ...def, name: 'VÄKTAREN ' + def.name, size: def.size * 0.72, dmg: def.dmg * GUARD_DMG, range: def.range * 0.8, melee: true, score: 1500, growl: 'bossroar', cd: 2,
    phaseMsg: def.phaseMsg.map(m => m.replace(def.name, 'VÄKTAREN')) };
  return { type: 'B', boss: true, guardian: true, id, d, x, y, hp, maxHp: hp, state: 'idle', t: 0, cd: 2.5, alert: false, asleep: true, flip: false, dead: false, flash: 0, growlT: 6, phase: 1, summonT: 14, burn: 0, slow: 0, burnAcc: 0, dying: 0 };
}
let guardianE = null; // väktaren man slåss mot just nu
function wakeGuardian(g) {
  g.asleep = false; guardianE = g; setMusic(true); bossBanner = 2.5; levelBanner = 0; slowmo = 0.6; play('stinger', 0.7); play('bossroar', 0.8, 1.1, { x: g.x, y: g.y });
  // stäng och försegla dörrarna till väktarens rum
  const room = (lvl.rooms || []).find(r => r.type === 'guardian' && g.x >= r.x && g.y >= r.y && g.x < r.x + r.w && g.y < r.y + r.h);
  for (const d of Object.values(doors)) {
    if (d.secret) continue;
    const near = room ? d.x >= room.x - 1 && d.y >= room.y - 1 && d.x <= room.x + room.w && d.y <= room.y + room.h : Math.hypot(d.x + 0.5 - g.x, d.y + 0.5 - g.y) < 8;
    if (!near) continue;
    d.glock = true; if (!occupied(d)) d.target = 0;
  }
  if (Object.values(doors).some(d => d.glock)) { say('DÖRRARNA SLÅS IGEN!', 2); play('gate', 0.8, 0.8); }
}
function finishGuardian(g) {
  kills++; run.kills++; run.guardians = (run.guardians || 0) + 1; profile.guardians = (profile.guardians || 0) + 1; saveProfile(); checkAch();
  guardianE = null; setMusic(false); play('bigboom', 0.8, 0.9); P.shake = 2;
  say(g.d.name + ' ÄR BESEGRAD!', 3);
  for (let i = 0; i < 8; i++) dropItem('gold', g.x + rnd(-0.8, 0.8), g.y + rnd(-0.8, 0.8));
  items.push({ type: 'cardpick', x: g.x, y: g.y, taken: false, drop: true, luck: cycleOf(run.depth) > 0 ? 3 : 0.9, title: cycleOf(run.depth) > 0 ? 'VÄKTARENS RELIK' : 'VÄKTARENS SKATT' });
  for (const d of Object.values(doors)) if (d.glock) { d.glock = false; d.target = 1; }
  if (!portals.length) spawnPortal(g.x, g.y, 'floor');
}
function makeBoss(x, y) {
  const id = lvl.bossId || 'demon', def = BOSSES[id];
  const hp = def.hp * diff().hp * (1 + 0.6 * cycleOf(run.depth)) * (asc() >= 5 ? 1.25 : 1);
  return { type: 'B', boss: true, id, d: { ...def, melee: true, score: 5000, growl: 'bossroar', cd: 2 }, x, y, hp, maxHp: hp, state: 'idle', t: 0, cd: 2.5, alert: true, flip: false, dead: false, flash: 0, growlT: 6, phase: 1, summonT: 10, burn: 0, slow: 0, burnAcc: 0, dying: 0 };
}

// ---------- Kollision / kartfrågor ----------
function cellAt(x, y) { if (x < 0 || y < 0 || x >= mw || y >= mh) return '1'; return map[y | 0][x | 0]; }
const IWC = Object.create(null); // isWallChar per tecken (strålkastningen frågar för varje steg)
function isWallChar(c) { const r = IWC[c]; return r !== undefined ? r : (IWC[c] = isWallChar0(c)); }
function isWallChar0(c) { return c === 'ɼ' || c === 'ɽ' || c === 'ɾ' || c === 'ʈ' || c === 'ʉ' || c === 'ʊ' || c === 'ɠ' || c === 'ɡ' || c === 'ɢ' || c === 'ɭ' || c === 'ɮ' || c === 'ɯ' || c === 'ɇ' || c === 'Ɉ' || c === 'ɉ' || c === 'Ɋ' || c === 'ɋ' || c === 'Ɍ' || c === 'Ȭ' || c === 'ȭ' || c === 'Ȯ' || c === 'ȯ' || c === 'Ȱ' || c === 'ȱ' || c === 'Ȑ' || c === 'ȑ' || c === 'Ȓ' || c === 'ȓ' || c === 'Ȕ' || c === 'ȕ' || c === 'Ǯ' || c === 'ǯ' || c === 'ǰ' || c === 'ǿ' || c === 'Ȁ' || c === 'ȁ' || c === 'ǒ' || c === 'Ǔ' || c === 'ǔ' || c === 'Ǡ' || c === 'ǡ' || c === 'Ǣ' || c === 'Ɵ' || c === 'Ơ' || c === 'ơ' || c === 'Ƣ' || c === 'ƣ' || c === 'Ƥ' || c === 'Ɗ' || c === 'Ƌ' || c === 'ƌ' || c === 'Ɠ' || c === 'Ɣ' || c === 'ƕ' || c === 'ũ' || c === 'Ū' || c === 'ū' || c === 'ŵ' || c === 'Ŷ' || c === 'ŷ' || c === 'ŝ' || c === 'Ş' || c === 'ş' || c === 'Š' || c === 'š' || c === 'Ţ' || c === 'Ĺ' || c === 'ĺ' || c === 'Ļ' || c === 'ļ' || c === 'Ľ' || c === 'ľ' || c === 'Ą' || c === 'Ć' || c === 'Ĉ' || c === 'Ċ' || c === 'Č' || c === 'Ď' || (c >= '0' && c <= '9') || c === '#' || c === '%' || c === '~' || c === '&' || c === '=' || c === '{' || c === 'Ø' || c === '¦' || c === 'Ò' || c === '¤' || c === 'È' || c === 'Ì' || c === 'Ù'; } // Ø frusen mur, ¦ frostbossens vägg // 0 träsk, { sprucken vägg // 6 skog, 7 kyrkogårdsmur, 8 grotta, 9 husvägg, #%~&= bossväggar
const isPropChar = c => c === 't' || c === 'n' || !!(PROP_DEFS[c] && PROP_DEFS[c].block); // träd, gravstenar och möbler: blockerar men är sprites
const isDoorChar = c => c === 'D' || c === 'G' || c === '*' || c === '|' || c === ']'; // | galler som öppnas med spak, ] låst dörr
function doorAt(x, y) { return doors[(x | 0) + ',' + (y | 0)]; }
function solid(x, y) {
  const c = cellAt(x, y);
  if (isWallChar(c) || c === 'f' || c === 'M' || c === '·' || isPropChar(c)) return true;
  if (isDoorChar(c)) return doorAt(x, y).open < 0.85;
  return false;
}
function tryMove(o, dx, dy, r) {
  const nx = o.x + dx, ny = o.y + dy;
  if (dx && !solid(nx + Math.sign(dx) * r, o.y) && !solid(nx + Math.sign(dx) * r, o.y + r * 0.9) && !solid(nx + Math.sign(dx) * r, o.y - r * 0.9)) o.x = nx;
  if (dy && !solid(o.x, ny + Math.sign(dy) * r) && !solid(o.x + r * 0.9, ny + Math.sign(dy) * r) && !solid(o.x - r * 0.9, ny + Math.sign(dy) * r)) o.y = ny;
}
function pushOut(o, cx, cy, minD) { // skjut ut ur en cirkel (krukor, fiender, kistor)
  const dx = o.x - cx, dy = o.y - cy, d = Math.hypot(dx, dy);
  if (d < minD && d > 1e-4) tryMove(o, dx / d * (minD - d), dy / d * (minD - d), 0.24);
}
// Raycast i rutnätet. Returnerar { dist, side, cell, wx, lx, ly (rutan framför väggen) }
function cast(ox, oy, dx, dy, maxD = 48, mark) {
  let mx = ox | 0, my = oy | 0;
  const ddx = Math.abs(1 / (dx || 1e-9)), ddy = Math.abs(1 / (dy || 1e-9));
  let sx, sy, sdx, sdy;
  if (dx < 0) { sx = -1; sdx = (ox - mx) * ddx; } else { sx = 1; sdx = (mx + 1 - ox) * ddx; }
  if (dy < 0) { sy = -1; sdy = (oy - my) * ddy; } else { sy = 1; sdy = (my + 1 - oy) * ddy; }
  let side = 0, dist = 0;
  for (let i = 0; i < 120; i++) {
    const lx = mx, ly = my;
    if (mark) seen[my * mw + mx] = 1;
    if (sdx < sdy) { dist = sdx; sdx += ddx; mx += sx; side = 0; } else { dist = sdy; sdy += ddy; my += sy; side = 1; }
    if (dist > maxD) return { dist: maxD, side, cell: '1', wx: 0, lx, ly };
    if (mx < 0 || my < 0 || mx >= mw || my >= mh) return { dist, side, cell: '1', wx: 0, lx, ly };
    const c = map[my][mx];
    if (isWallChar(c)) { if (mark) seen[my * mw + mx] = 1; return { dist, side, cell: c, wx: wallX(ox, oy, dx, dy, dist, side), mx, my, lx, ly }; }
    if (isDoorChar(c)) {
      const d = doors[mx + ',' + my];
      if (mark) seen[my * mw + mx] = 1;
      if (d.open >= 0.999) continue;
      const wx = wallX(ox, oy, dx, dy, dist, side);
      if (wx < d.open) continue; // dörren har glidit undan här
      return { dist, side, cell: c, wx: wx - d.open, mx, my, lx, ly, door: d };
    }
  }
  return { dist: maxD, side, cell: '1', wx: 0, lx: mx, ly: my };
}
const wallMat = c => c === 'G' || c === '|' || c === ']' || c === '~' ? 'metal' : c === 'D' || c === '9' || c === '&' || c === '6' ? 'wood' : 'stone'; // träffljud per material
function wallX(ox, oy, dx, dy, dist, side) { const w = side === 0 ? oy + dist * dy : ox + dist * dx; return w - Math.floor(w); }
function hasLOS(ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy);
  if (d < 0.01) return true;
  const r = cast(ax, ay, dx / d, dy / d, d + 1);
  return r.dist >= d - 0.05;
}

// ---------- Ljus: grundljus + flimrande eldfat + mynningsblixtar ----------
function prepareTorchLight() {
  for (const t of torches) {
    for (let y = Math.max(0, (t.y | 0) - 7); y < Math.min(mh, (t.y | 0) + 8); y++) for (let x = Math.max(0, (t.x | 0) - 7); x < Math.min(mw, (t.x | 0) + 8); x++) {
      const d = Math.hypot(x + 0.5 - t.x, y + 0.5 - t.y);
      const r = t.r || 7;
      if (d > r || isWallChar(map[y][x])) continue;
      if (!hasLOS(t.x, t.y, x + 0.5, y + 0.5)) continue;
      t.cells.push([y * mw + x, Math.pow(1 - d / r, 1.5) * (t.str || 1.3)]);
    }
  }
}
let lcol = null; // färgat ljus: förskjutning per ruta (r, g, b) som läggs på gråskaleljuset
const MUZZLE_COL = { flamer: [255, 130, 40], flaregun: [255, 80, 60], crossbow: [200, 255, 200], launcher: [255, 190, 90], sniper: [255, 245, 220], axe: [220, 220, 255] };
function torchCol(t) { return t.prop ? PROP_GLOW[t.prop.ch] || [255, 170, 80] : t.hidden ? [255, 100, 30] : [255, 160, 70]; }
function addCol(i, w, c, k = 1) { const a = (c[0] + c[1] + c[2]) / 3, f = w * k * 1.5 / 255, j = i * 3; lcol[j] += (c[0] - a) * f; lcol[j + 1] += (c[1] - a) * f; lcol[j + 2] += (c[2] - a) * f; }
function updateLight() {
  if (lcol) { if (settings.colorLight === false || settings.lowfx) lcol = null; else lcol.fill(0); }
  else if (settings.colorLight !== false && !settings.lowfx && light) lcol = new Float32Array(mw * mh * 3);
  const darkK = darkT > 0 ? Math.max(0.15, 1 - Math.min(1, darkT) * 0.85) : 1;
  light.fill(lvl.ambient * (dmod('dark') ? 0.6 : 1) * darkK * (boss && boss.phase === 3 && !boss.dead ? 0.75 + 0.25 * Math.sin(tmr * 3) : 1) * (floorEvent === 'dark' ? 0.3 : 1) * (cmode('dark') ? 0.12 : 1));
  for (const t of cmode('dark') ? [] : torches) {
    const wind = lvl.sky ? 1.8 : 1; // facklorna fladdrar i vinden utomhus
    const fl = 0.85 + 0.1 * wind * Math.sin(tmr * 9 + t.ph) + 0.06 * wind * Math.sin(tmr * 23 + t.ph * 3) + gfxWFlick(t);
    const k = t.prop && t.prop.used ? 0.15 : 1; // använd brunn och släckt altare lyser knappt
    const rd = gfxWRad(t), iv = rd ? 1 / (t.str || 1.3) : 0; // VÄRLD: radien andas – de yttre rutorna lyser mer eller mindre
    for (const [i, w] of t.cells) light[i] += w * (fl + rd * (1 - w * iv)) * k * darkK;
    if (lcol) { const c = t.col || (t.col = torchCol(t)), ck = t.prop || t.hidden ? 0.8 : 0.35; for (const [i, w] of t.cells) addCol(i, w * (fl + rd * (1 - w * iv)) * k * darkK, c, ck); }
  }
  const flashLight = (lx, ly, strength, r, col) => {
    for (let y = Math.max(0, (ly | 0) - r); y < Math.min(mh, (ly | 0) + r + 1); y++) for (let x = Math.max(0, (lx | 0) - r); x < Math.min(mw, (lx | 0) + r + 1); x++) {
      const d = Math.hypot(x + 0.5 - lx, y + 0.5 - ly); if (d < r) { light[y * mw + x] += strength * (1 - d / r); if (col && lcol) addCol(y * mw + x, strength * (1 - d / r), col); }
    }
  };
  flashLight(P.x, P.y, 0.22 + mod('light') * 0.25, 3 + Math.round(mod('light') + mod('lightRadius'))); // eget sken
  if (pet && pet.id === 'lantern') flashLight(pet.x, pet.y, (pet.rest > 0 ? 0.2 : 0.55) * Math.min(2, petPow()) * (0.92 + 0.08 * Math.sin(tmr * 7)), 4 + (petLv() >> 1), [255, 210, 120]); // lyktan
  if (P.flash > 0) flashLight(P.x, P.y, P.flash * 9, 4, MUZZLE_COL[WEAPONS[P.weapon].id] || [255, 200, 120]); // mynningsflamman i vapnets färg
  for (const pr of projectiles) flashLight(pr.x, pr.y, 0.5, 3, pr.friendly && pr.kind !== 'flare' ? null : PROJ_TINT[pr.kind] || [255, 130, 50]);
  for (const f of flashes) flashLight(f.x, f.y, f.t * 5, f.r | 0, f.col || [255, 150, 60]);
  wpLights(flashLight); // Grafik: explosionsljus som falnar
  for (const c of chests) if (!c.open) flashLight(c.x, c.y, 0.18, 2);
  if (lvl.exit) flashLight(lvl.exit.x + 0.5, lvl.exit.y + 0.5, 0.35 + 0.1 * Math.sin(tmr * 3), 3); // utgången lyser
  for (const e of ents) if (e.burn > 0 && !e.dead && !e.dormant) flashLight(e.x, e.y, 0.3, 2, [255, 140, 50]); // brinnande fiender lyser
  flameLight(flashLight); // version 25.1: eldkastarens stråle, brinnande mark och brinnande fiender lyser upp omgivningen
  lampLight(flashLight); gfxWLight(flashLight); v21Light(flashLight); v22Light(flashLight); v23Light(flashLight); // ficklampan; blixten lyser upp marken (VÄRLD)
  v30Light(flashLight); // version 30 (SPEL): ugnsmunnar, smält glas och smältugnar
  if (lvl.beams) for (const b of lvl.beams) flashLight(b.x + 0.5, b.y + 0.5, 0.5, 3, [255, 230, 170]); // ljusstrålar
  for (const p of portals) flashLight(p.x, p.y, 0.7, 4, p.kind === 'gold' ? [255, 220, 90] : (p.biome && portals.length > 1 && BIOME_TINT[p.biome]) || [190, 130, 255]);
  for (let i = 0; i < light.length; i++) { const l = light[i]; if (l > 1.3) light[i] = Math.min(1.8, 1.3 + (l - 1.3) * 0.25); } // mjukt tak: många ljuskällor på samma ställe bränner inte ut bilden
}
const lightAt = (x, y) => (x < 0 || y < 0 || x >= mw || y >= mh) ? lvl.ambient : light[(y | 0) * mw + (x | 0)];

// ---------- Biomernas särdrag: färgton, dimma, ljudmattor och väder ----------
// grade = färgton (r, g, b) över hela bilden, fogK = hur tät dimman är, amb = ljudslingor [namn, volym, fart]
const BIOME_FX = {
  dungeon: { grade: [1.06, 0.96, 0.84], fogK: 0.085, amb: [['drone', 0.3, 1], ['amb_creepy', 0.12, 1]], weather: 'dust' },
  caves: { grade: [0.84, 0.98, 1.12], fogK: 0.11, amb: [['drone', 0.25, 0.8], ['amb_drip', 0.35, 1]], weather: 'drips' },
  graveyard: { grade: [0.8, 0.9, 1.16], fogK: 0.07, amb: [['amb_wind', 0.32, 0.9]], weather: 'groundfog' },
  forest: { grade: [0.86, 1.08, 0.84], fogK: 0.09, amb: [['amb_wind', 0.18, 1.1], ['amb_frogs', 0.22, 1]], weather: 'leaves' },
  courtyard: { grade: [1.0, 0.95, 1.02], fogK: 0.075, amb: [['amb_rain', 0.32, 1], ['drone', 0.12, 1.2]], weather: 'rain' },
  clock: { grade: [1.12, 1.0, 0.82], fogK: 0.085, amb: [['gear_tick', 0.3, 1], ['drone', 0.18, 1.2]], weather: 'dust' },
  ship: { grade: [0.84, 0.92, 1.0], fogK: 0.075, amb: [['ship_hum', 0.3, 1], ['ship_creak', 0.5, 1], ['amb_wind', 0.12, 0.9]], weather: 'groundfog' },
  lab: { grade: [0.86, 0.95, 0.84], fogK: 0.09, amb: [['lab_hum', 0.3, 1], ['lab_bubble', 0.45, 1]], weather: 'bubbles' },
  sewer: { grade: [0.86, 0.96, 0.82], fogK: 0.1, amb: [['sewer_hum', 0.3, 1], ['amb_drip', 0.22, 0.9]], weather: 'drips' },
  desert: { grade: [0.96, 0.92, 0.84], fogK: 0.06, amb: [['desert_hum', 0.3, 1], ['amb_wind', 0.14, 1.1]], weather: 'dust' },
  prison: { grade: [1.04, 1.04, 1.08], fogK: 0.085, amb: [['prison_hum', 0.3, 1], ['amb_drip', 0.18, 0.85]], weather: 'drips' },
  bathhouse: { grade: [1.02, 1.0, 0.96], fogK: 0.085, amb: [['bathhouse_hum', 0.3, 1], ['amb_drip', 0.2, 1.05]], weather: 'drips' },
  purgatory: { grade: [1.14, 0.84, 0.74], fogK: 0.065, amb: [['purgatory_hum', 0.34, 1], ['amb_wind', 0.12, 0.8]], weather: 'ash' },
  abattoir: { grade: [1.06, 0.95, 0.93], fogK: 0.08, amb: [['abattoir_hum', 0.32, 1], ['amb_drip', 0.16, 0.9]], weather: 'drips' },
  battlefield: { grade: [0.97, 0.96, 0.97], fogK: 0.06, amb: [['battlefield_hum', 0.34, 1], ['amb_wind', 0.14, 0.85]], weather: 'ash' },
  harbor: { grade: [0.9, 0.98, 1.04], fogK: 0.07, amb: [['harbor_hum', 0.32, 1], ['amb_wind', 0.12, 0.9]], weather: 'groundfog' },
  mine: { grade: [0.98, 0.9, 0.8], fogK: 0.11, amb: [['mine_hum', 0.3, 1], ['amb_drip', 0.15, 0.8]], weather: 'dust' },
  observatory: { grade: [0.82, 0.84, 1.02], fogK: 0.085, amb: [['observatory_hum', 0.3, 1], ['drone', 0.1, 1.3]], weather: 'sparkle' },
  circus: { grade: [0.88, 0.86, 0.86], fogK: 0.09, amb: [['circus_hum', 0.32, 1], ['drone', 0.1, 0.8]], weather: 'dust' },
  jungle: { grade: [0.84, 0.96, 0.8], fogK: 0.1, amb: [['jungle_hum', 0.32, 1], ['amb_frogs', 0.15, 1.15], ['amb_wind', 0.1, 1]], weather: 'leaves' },
  garden: { grade: [0.96, 1.05, 0.92], fogK: 0.07, amb: [['garden_hum', 0.3, 1], ['amb_wind', 0.15, 1.1]], weather: 'leaves' },
  dream: { grade: [0.92, 0.82, 1.02], fogK: 0.12, amb: [['dream_hum', 0.35, 1], ['drone', 0.12, 0.7]], weather: 'sparkle' },
  cathedral: { grade: [1.1, 0.94, 0.96], fogK: 0.09, amb: [['cathedral_hum', 0.3, 1], ['drone', 0.12, 0.8]], weather: 'dust' },
  hive: { grade: [0.8, 0.7, 0.55], fogK: 0.12, amb: [['hive_hum', 0.35, 1], ['amb_drip', 0.12, 0.9]], weather: 'spores' },
  library: { grade: [1.08, 1.0, 0.92], fogK: 0.095, amb: [['library_hum', 0.3, 1], ['drone', 0.1, 1.3]], weather: 'dust' },
  foundry: { grade: [1.14, 0.98, 0.86], fogK: 0.08, amb: [['foundry_hum', 0.35, 1], ['gear_tick', 0.12, 0.8]], weather: 'ash' },
  fungus: { grade: [0.95, 1.08, 1.02], fogK: 0.1, amb: [['shroom_hum', 0.3, 1], ['amb_drip', 0.18, 1.1]], weather: 'spores' },
  mirror: { grade: [1.04, 1.02, 1.1], fogK: 0.06, amb: [['mirror_hum', 0.3, 1], ['drone', 0.1, 1.4]], weather: 'sparkle' },
  sky: { grade: [1.0, 1.04, 1.12], fogK: 0.045, amb: [['wind_loop', 0.35, 1], ['amb_wind', 0.15, 1.2]], weather: 'clouds' },
  crystal: { grade: [0.95, 0.92, 1.18], fogK: 0.1, amb: [['drone', 0.22, 1.3], ['amb_drip', 0.2, 1.3]], weather: 'sparkle' },
  sunken: { grade: [0.82, 1.0, 1.12], fogK: 0.11, amb: [['water_deep', 0.25, 1], ['amb_drip', 0.3, 0.8]], weather: 'bubbles' },
  tomb: { grade: [1.14, 1.02, 0.8], fogK: 0.075, amb: [['sandstorm', 0.22, 1], ['amb_wind', 0.15, 0.8]], weather: 'sandstorm' },
  volcano: { grade: [1.16, 0.9, 0.78], fogK: 0.08, amb: [['volcano_rumble', 0.3, 1], ['lava_bubble', 0.22, 1]], weather: 'ash' },
  frost: { grade: [0.9, 0.98, 1.14], fogK: 0.09, amb: [['wind_cold', 0.3, 1], ['amb_wind', 0.15, 0.7]], weather: 'snow' },
  swamp: { grade: [0.9, 1.04, 0.86], fogK: 0.12, amb: [['amb_frogs', 0.3, 0.85], ['amb_drip', 0.18, 0.7], ['amb_wind', 0.12, 0.8]], weather: 'swamp' },
};
const BIOME_TINT = { prison: [170, 180, 200], harbor: [150, 200, 210], bathhouse: [200, 230, 240], purgatory: [255, 90, 50], abattoir: [230, 130, 120], battlefield: [190, 180, 160], sewer: [150, 190, 110], desert: [240, 200, 130], mine: [230, 180, 120], observatory: [170, 160, 255], circus: [255, 150, 140], jungle: [150, 230, 120], ship: [150, 200, 225], lab: [160, 255, 150], garden: [200, 240, 170], dream: [210, 160, 255], cathedral: [255, 170, 170], hive: [255, 215, 120], library: [255, 215, 160], foundry: [255, 170, 110], fungus: [170, 255, 190], mirror: [220, 230, 255], clock: [255, 210, 120], sky: [200, 225, 255], crystal: [190, 160, 255], sunken: [130, 210, 230], tomb: [255, 220, 130], volcano: [255, 120, 60], dungeon: [255, 200, 140], caves: [140, 200, 255], graveyard: [180, 180, 255], forest: [140, 255, 140], courtyard: [255, 255, 200], swamp: [160, 255, 120], frost: [190, 240, 255] };
const BIOME_NAME = { dungeon: 'KRYPTAN', caves: 'GROTTORNA', graveyard: 'KYRKOGÅRDEN', forest: 'SKOGEN', courtyard: 'BORGGÅRDEN', swamp: 'TRÄSKET', frost: 'FROSTFÄSTET', volcano: 'VULKANEN', tomb: 'GRAVKAMMAREN', crystal: 'KRISTALLGROTTORNA', sunken: 'DEN SJUNKNA STADEN', clock: 'KLOCKTORNET', sky: 'MOLNBORGEN', fungus: 'SVAMPRIKET', mirror: 'SPEGELPALATSET', library: 'BIBLIOTEKET', foundry: 'GJUTERIET', cathedral: 'BLODKATEDRALEN', hive: 'BIKUPAN', garden: 'TRÄDGÅRDEN', dream: 'DRÖMRIKET', ship: 'SPÖKSKEPPET', lab: 'LABORATORIET', circus: 'CIRKUSEN', jungle: 'DJUNGELTEMPLET', mine: 'GRUVAN', observatory: 'OBSERVATORIET', sewer: 'KLOAKERNA', desert: 'ÖKNEN', prison: 'JÄRNFÄNGELSET', harbor: 'FISKELÄGET', bathhouse: 'BADHUSET', purgatory: 'SKÄRSELDEN', abattoir: 'SLAKTERIET', battlefield: 'DET EVIGA SLAGFÄLTET' };
const biomeFx = () => BIOME_FX[lvl && lvl.biome] || BIOME_FX.dungeon;
const gradeLUT = [new Uint8ClampedArray(256), new Uint8ClampedArray(256), new Uint8ClampedArray(256)];
function buildGrade() { // färgtonen som uppslagstabeller; ljusstyrkan (gamma) från inställningarna ingår
  const g = biomeFx().grade, gam = 1 / clamp(settings.gamma || 1, 0.6, 1.8);
  for (let c = 0; c < 3; c++) for (let i = 0; i < 256; i++) gradeLUT[c][i] = 255 * Math.pow(i / 255, gam) * g[c];
}
function applyGrade() {
  const [lr, lg, lb] = gradeLUT, px = spx; // alltid skärmens bildpunkter (efter upp/ned-projektionen)
  for (let i = 0; i < px.length; i++) { const c = px[i]; px[i] = 0xff000000 | (lb[(c >> 16) & 255] << 16) | (lg[(c >> 8) & 255] << 8) | lr[c & 255]; }
  if (settings.cb && CB[settings.cb]) daltonize(CB[settings.cb]);
}
// färgblindlägen: simulera färgseendet och flytta skillnaden till färger som syns (daltonisering)
const CB = { protan: [0.152, 1.053, -0.205, 0.115, 0.786, 0.099, -0.004, -0.048, 1.052], deutan: [0.367, 0.861, -0.228, 0.280, 0.673, 0.047, -0.012, 0.043, 0.969], tritan: [1.256, -0.077, -0.179, -0.078, 0.931, 0.148, 0.005, 0.691, 0.304] };
function daltonize(m) {
  const px = spx; for (let i = 0; i < px.length; i++) {
    const c = px[i], r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
    const er = r - (m[0] * r + m[1] * g + m[2] * b), eg = g - (m[3] * r + m[4] * g + m[5] * b), eb = b - (m[6] * r + m[7] * g + m[8] * b);
    const g2 = clamp(g + 0.7 * er + eg, 0, 255), b2 = clamp(b + 0.7 * er + eb, 0, 255);
    px[i] = 0xff000000 | ((b2 | 0) << 16) | ((g2 | 0) << 8) | r;
  }
}
let wakeLock = null, lowFpsT = 0;
function updateWakeLock() { // skärmen släcks inte under spel på mobilen
  const want = state === 'play' && isTouch() && settings.wakeLock !== false;
  if (want && !wakeLock && navigator.wakeLock) { wakeLock = 'pending'; navigator.wakeLock.request('screen').then(l => { wakeLock = l; l.addEventListener('release', () => { wakeLock = null; }); }).catch(() => { wakeLock = null; }); }
  if (!want && wakeLock && wakeLock !== 'pending') { wakeLock.release().catch(() => {}); wakeLock = null; }
}
