// ---------- Version 29 (SPEL): balkongskyttarna stannar, sparken är närstrid, fler regler på utmaningsvåningen, blodaltaret och blodfursten ----------
// Anropas från 0475 (som SPEL äger): s29Reset() i början av v28gStart, s29Tether() när scenerna lästs, s29Start() sist i v28gStart, s29Tick(dt) från
// updateV28 (varje bildruta, före fiendernas uppdatering), s29Melee() och s29Bonus() från inlindningarna där. Övrigt lindas in här (kick, bash,
// dashHits, switchWeapon, updateEnemy, hurtEnemy, hurtPlayer, drawHudExtras, drawV24World, v26aTargets, v26aShot, explode), så att andras delar
// bara får krokrader (showRunOver och showStats).
//  BALKONG OCH TORN: skyttarna som version 28 flyttar upp på balkongen (och in i vakttornet) får e.s29home = scenens ruta. De får röra sig på rutans
//    gångbara rutor (avsatsen och ingången) men aldrig ut i salen: efter updateEnemy (och i s29Tick, för knuffar utanför updateEnemy) flyttas de
//    tillbaka till sin senaste giltiga plats.
//  NÄRSTRID: sparken, kolvslaget, rusningens skada, flygsparken (som slutar i en spark) och parerade skott räknas som närstrid under BARA NÄRSTRID
//    (S29.mctx > 0 medan kick/bash/dashHits körs; explosioner räknas aldrig). Granatreturen räknas som sprängning.
//  REGLER (utöver version 28:s fyra; samma namn, text och belöning): ETT VAPEN, GLASKANON, MOT KLOCKAN och HUNGER. Portalen väljer en ny regel med
//    eget slumpflöde (frö + ':utmaning29:' + djup, hälften av gångerna), så version 28:s val är detsamma när den inte ersätts.
//  BLODVÅNINGEN: blodaltaret (en blodpakt per våning: 25 % av hälsan mot +10 % skada resten av rundan; syns i dödsskärmen och statistiken) och
//    varannan blodvåning (eller djup 8+) BLODFURSTEN, en förstärkt elit som läker av blodpölar på golvet. Pölarna skjuts (eller sprängs, sparkas) sönder.
// Av: ?v29off=1 eller __game.s29.set('on' | 'tether' | 'rules' | 'altar' | 'boss', false).
const S29_RULES = {
  onegun: { name: 'ETT VAPEN', text: 'BARA VAPNET DU BÄR NU – BYTE ÄR SPÄRRAT', bonus: 25 },
  glass: { name: 'GLASKANON', text: 'DU OCH FIENDERNA GÖR DUBBEL SKADA', bonus: 30 },
  clock: { name: 'MOT KLOCKAN', text: 'KLARA VÅNINGEN INNAN TIDEN TAR SLUT – VARJE DÖDAD FIENDE GER MER TID', bonus: 0 },
  hunger: { name: 'HUNGER', text: 'HÄLSAN SJUNKER SAKTA – VARJE DÖDAD FIENDE GER TILLBAKA', bonus: 25 },
};
const S29_RULE_IDS = Object.keys(S29_RULES);
Object.assign(V28_RULES, S29_RULES); // (namn och text för v28Challenge, portalens text och loggen; V28_RULE_IDS och version 28:s slumpval är oförändrade)
const S29_CLOCK = { base: 45, perFoe: 2.5, perKill: 4, min: 75, max: 240 };
const S29_POOL = { max: 4, every: 4.5, everyLow: 3.2, heal: 0.012, r: 0.45 };
const S29_ALTAR = 'ʬ';
const S29 = { on: !params.get('v29off'), tether: true, rules: true, altar: true, boss: true, lvl: null, act: false, mctx: 0, rule: null, gun: -1, gunMsg: 0, clock: null,
  kLast: 0, hungerT: 0, tethered: [], pools: [], poolT: 0, bossE: null, altarPr: null, streamT: 0, rng: null,
  st: { clamps: 0, blocked: 0, waves: 0, poolsMade: 0, poolsShot: 0, healed: 0, pacts: 0, meleeHits: 0 } };
const s29Run = () => (run ? (run.s29 = run.s29 || { bloodSeen: {}, pacts: 0, bosses: 0 }) : null);
const s29Melee = () => S29.mctx > 0;
const s29Here = () => S29.lvl === lvl && state === 'play';
function s29Reset() {
  S29.lvl = lvl; S29.act = false; S29.rule = null; S29.gun = -1; S29.clock = null; S29.tethered = []; S29.pools = []; S29.poolT = 0; S29.bossE = null; S29.altarPr = null; S29.mctx = 0;
  S29.kLast = 0; S29.hungerT = 0;
  if (window.__game && !window.__game.s29) window.__game.s29 = s29Api();
}
// balkongens och tornets skyttar: rutan de får röra sig i
function s29Tether() {
  if (!S29.on || !S29.tether || !lvl || !Array.isArray(lvl.scenes28)) return;
  for (const s of lvl.scenes28) {
    if (!s || (s.kind !== 'balcony' && s.kind !== 'tower') || !Number.isInteger(s.x)) continue;
    const box = { x: s.x, y: s.y, w: s.w, h: s.h, kind: s.kind };
    for (const e of ents) if (!e.dead && !e.boss && !e.s29home && s29InBox(box, e.x, e.y)) { e.s29home = box; e.s29last = [e.x, e.y]; S29.tethered.push(e); }
  }
  if (S29.tethered.length) S29.act = true;
}
const s29InBox = (b, x, y) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
function s29Clamp(e) {
  const b = e.s29home; if (!b || e.dead) return;
  if (s29InBox(b, e.x, e.y) && !solid(e.x, e.y)) { const l = e.s29last; if (l) { l[0] = e.x; l[1] = e.y; } else e.s29last = [e.x, e.y]; return; }
  const l = e.s29last; if (!l) return;
  e.x = l[0]; e.y = l[1]; e.mvx = e.mvy = 0; if (e.knock) e.knock = null; S29.st.clamps++;
}
function s29Start() {
  if (!S29.on || !run || !lvl || run.custom || lvl.arena || lvl.hub || boss) return;
  s29Tether(); // (igen: blodvåningens extra fiender kan ha hamnat på balkongen)
  const r = v28.chal;
  if (r && S29_RULES[r] && v28.lvl === lvl) s29RuleStart(r);
  if (v28.blood && v28.lvl === lvl) s29BloodStart();
}
function s29RuleStart(r) {
  S29.rule = r; S29.act = true; S29.kLast = kills;
  if (r === 'onegun') S29.gun = P.weapon;
  if (r === 'clock') { const C = S29_CLOCK, base = clamp(C.base + C.perFoe * totalEnemies, C.min, C.max) / Math.max(0.7, diff().speed); S29.clock = { base: Math.round(base), k0: kills, t0: levelTime, over: false, warn: 0 }; }
  if (r === 'hunger') S29.hungerT = 0;
}
function s29PortalRule(rule, next) { // från v28Portal: hälften av utmaningsportalerna får en av de nya reglerna (eget slumpflöde: version 28:s val rörs inte)
  if (!S29.on || !S29.rules || !run) return rule;
  const r = RNG(RNG.hash(run.seed + ':utmaning29:' + next));
  if (r.next() >= 0.5) return rule;
  const ids = S29_RULE_IDS.filter(id => id !== 'onegun' || (!run.pact && P.has.filter(Boolean).length >= 2)); // (ETT VAPEN: inte med vapenpakten eller med bara ett vapen)
  return r.pick(ids);
}
// tid kvar på MOT KLOCKAN (speltid: levelTime, och dödade fiender sedan våningen började); inget extra att spara
const s29ClockLeft = () => { const c = S29.clock; return c ? c.base + S29_CLOCK.perKill * Math.max(0, kills - c.k0) - (levelTime - c.t0) : 0; };
function s29Bonus(rule, depth) { // extra guld utöver version 28:s belöning (60 + 20 × djup)
  const R = S29_RULES[rule]; if (!R || !S29.on) return 0;
  if (rule === 'clock') { const d = depth || (run ? run.depth : 1); return depth || !S29.clock || !S29.clock.over ? 40 + 15 * d : 0; }
  return R.bonus;
}
function s29Tick(dt) {
  if (!S29.act || !s29Here()) return;
  for (const e of S29.tethered) s29Clamp(e);
  const r = S29.rule;
  if (r) {
    const dk = kills - S29.kLast; S29.kLast = kills;
    if (r === 'onegun' && S29.gun >= 0) { if (!P.has[S29.gun]) S29.gun = -1; else if (P.weapon !== S29.gun || (WS.state === 'holster' && WS.next !== S29.gun)) { P.weapon = S29.gun; WS.next = -1; WS.state = 'draw'; WS.t = 0; S29.st.blocked++; } }
    if (r === 'hunger') { S29.hungerT += dt; if (S29.hungerT >= 1.5) { S29.hungerT = 0; if (P.hp > maxHp() * 0.25 + 1) P.hp -= 1; } if (dk > 0) heal(6 * dk, true); }
    if (r === 'clock' && S29.clock && !S29.clock.over && !v28.done) {
      const left = s29ClockLeft();
      if (left <= 10 && left > 0 && Math.ceil(left) !== S29.clock.warn) { S29.clock.warn = Math.ceil(left); if (settings.soundCues !== false) play('click', 0.35, 1.6); }
      if (left <= 0) s29Overtime();
    }
  }
  if (S29.bossE || S29.pools.length) s29BossTick(dt);
}
// MOT KLOCKAN: tiden är ute – en straffvåg (inte straffskada: den kan inte döda dig från full hälsa, du kan välja att slåss eller springa mot utgången,
// och vågen syns och hörs). Den extra belöningen är förlorad, den vanliga ges fortfarande när våningen klaras.
function s29Overtime() {
  const c = S29.clock; c.over = true; S29.st.waves++;
  const rng = RNG(RNG.hash(run.seed + ':klocka29:' + run.depth)), types = [...new Set(ents.filter(e => !e.dead && !e.boss && !e.guardian && !e.minion && ENEMY_DEFS[e.type]).map(e => e.type))];
  if (!types.length) types.push('S', 'K');
  const n = 3 + Math.floor(run.depth / 2);
  updateFlow();
  for (let k = 0, tries = 0; k < n && tries < 240; tries++) {
    const a = rng.next() * TAU, rr = 5 + rng.next() * 6, x = P.x + Math.cos(a) * rr, y = P.y + Math.sin(a) * rr;
    if (x < 1 || y < 1 || x >= mw - 1 || y >= mh - 1 || !freeSpot(x, y, 0.35) || map[y | 0][x | 0] !== '.' || voidAt(x, y) || deepAt(x, y) || s29InArena(x, y) || !(flow[(y | 0) * mw + (x | 0)] >= 3)) continue; // (fiendernas avståndsfält från spelaren: nåbar, aldrig i ett stängt valv)
    const o = makeEnemy(types[(rng.next() * types.length) | 0], x, y); o.alert = true; o.s29wave = true; ents.push(o); totalEnemies++; k++; spawnPuff(x, y, 6);
  }
  say('TIDEN ÄR UTE – EN STRAFFVÅG!', 3); logEvent('MOT KLOCKAN: STRAFFVÅG'); play('stinger', 0.7); if (window.Music) Music.sting('challenge');
}
function s29HudText() { // regeln (och klockan) som en rad under meddelandena; tom sträng om ingen regel gäller
  if (!S29.on || !v28.chal || v28.lvl !== lvl || !V28_RULES[v28.chal]) return '';
  const R = V28_RULES[v28.chal];
  if (v28.chal === 'clock' && S29.clock) return v28.done ? 'MOT KLOCKAN · KLARAD' : S29.clock.over ? 'MOT KLOCKAN · ÖVERTID' : 'MOT KLOCKAN · ' + fmtTime(Math.max(0, Math.ceil(s29ClockLeft())));
  if (v28.chal === 'onegun' && S29.gun >= 0) return 'ETT VAPEN · ' + (WEAPONS[S29.gun].short || WEAPONS[S29.gun].name);
  return 'UTMANING · ' + R.name;
}
function s29Hud(g) {
  if (!s29Here() || showMap === 2) return;
  const s = s29HudText(); let y = challenge ? HL.row2 + 10 : HL.row2;
  if (s) {
    const low = v28.chal === 'clock' && S29.clock && !S29.clock.over && s29ClockLeft() <= 10, t = low && settings.cb ? '! ' + s : s; // (färgblind: ett utropstecken, inte bara rött)
    const a = low && !settings.noFlash && !settings.reduceMotion ? 0.65 + 0.35 * Math.abs(Math.sin(tmr * 6)) : 0.9; // (INGA BLIXTAR och MINSKA RÖRELSE: ingen puls)
    txt(t, (W - textW(t)) / 2, y, low ? '#ff6040' : S29.clock && S29.clock.over ? '#ff9050' : '#e8c070', 1, true, a); y += 10;
  }
  const b = S29.bossE; if (b && !b.dead && b.alert && Math.hypot(b.x - P.x, b.y - P.y) < 16) { const t = `BLODFURSTEN ${Math.max(1, Math.round(100 * b.hp / b.maxHp))}% · PÖLAR ${S29.pools.length}`; txt(t, (W - textW(t)) / 2, y, '#ff5a50', 1, true, 0.9); }
}
// ---------- blodvåningen: blodaltaret och blodfursten ----------
const s29BloodOn = () => v27B() > 0; // BLOD AV: altaret och pölarna finns kvar (de är spelmekanik) men utan blod – mörk sörja och damm
function s29BloodStart() {
  const R = s29Run(); if (!R) return;
  R.bloodSeen = R.bloodSeen || {}; R.bloodSeen[run.depth] = 1; // (per djup: att ladda om samma våning räknas inte två gånger)
  const n = Object.keys(R.bloodSeen).length;
  S29.rng = RNG(RNG.hash(run.seed + ':blod29:' + run.depth));
  if (S29.altar) s29PlaceAltar();
  if (S29.boss && (n % 2 === 0 || run.depth >= 8 || params.get('s29boss'))) s29SpawnBoss();
}
const s29Open8 = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const c = map[y + dy] && map[y + dy][x + dx]; if (c !== '.' && !(dx === 0 && dy === 0)) return false; } return map[y][x] === '.'; };
const s29InArena = (x, y) => (lvl.arenas || []).some(a => x >= a.x0 - 1 && x <= a.x1 + 2 && y >= a.y0 - 1 && y <= a.y1 + 2);
function s29OpenRoom(x, y) { // reservplatsen (utan gen.js-fält): ett rum, men inte vaktarens sal, en arena, ett valv, ett hemligt rum eller startrummet
  if (s29InArena(x, y) || !lvl.roomMask || !lvl.rooms) return !s29InArena(x, y);
  const k = lvl.roomMask[y] ? lvl.roomMask[y].charCodeAt(x) - 48 : -1, r = lvl.rooms[k];
  return !!r && !['guardian', 'vault', 'lockedvault', 'levervault', 'secret', 'start'].includes(r.type);
}
function s29GuardRoom(x, y) { const gi = (lvl.rooms || []).findIndex(r => r.type === 'guardian'); return gi >= 0 && lvl.roomMask && lvl.roomMask[y] && lvl.roomMask[y].charCodeAt(x) - 48 === gi; }
function s29PlaceAltar() {
  let at = null; const a = lvl.altar29;
  if (a && Number.isInteger(a.x) && map[a.y] && s29Open8(a.x, a.y)) at = [a.x, a.y]; // (gen.js valde en ruta med fritt runt om: altaret stänger aldrig en gång)
  for (let i = 0; i < 800 && !at; i++) { const x = 1 + ((S29.rng.next() * (mw - 2)) | 0), y = 1 + ((S29.rng.next() * (mh - 2)) | 0); if (s29Open8(x, y) && !s29GuardRoom(x, y) && s29OpenRoom(x, y) && Math.hypot(x + 0.5 - P.x, y + 0.5 - P.y) > 6) at = [x, y]; }
  if (!at) return;
  if (!PROP_DEFS[S29_ALTAR]) { PROP_DEFS[S29_ALTAR] = { img: 'altar', n: 2, size: 0.72, block: true, light: 0.6, lightR: 3.5, use: 's29altar' }; PROP_GLOW[S29_ALTAR] = [255, 40, 40]; }
  const o = addPropAt(S29_ALTAR, at[0], at[1]); if (!o) return;
  S29.altarPr = o; logEvent('BLODALTARET');
}
const s29PactMul = () => { const R = run && run.s29; return R && R.pacts ? 1 + 0.1 * Math.min(R.pacts, 6) : 1; };
function s29AltarUse(pr, i) { // i = 0: offra (25 % av max hälsa, aldrig under 1) och få en blodpakt; annars gå därifrån
  if (!pr || pr.used || i !== 0) return false;
  const R = s29Run(), cost = Math.round(maxHp() * 0.25);
  pr.used = true; P.hp = Math.max(1, P.hp - cost); R.pacts = (R.pacts || 0) + 1; S29.st.pacts++; stat('s29pacts');
  P.hurt = Math.max(P.hurt || 0, settings.noFlash ? 0.2 : 0.5); play('gore', 0.7, 0.7, { x: pr.x, y: pr.y }); play('secret', 0.6, 0.6);
  if (s29BloodOn() && !settings.lowfx) for (let k = 0; k < 6; k++) spawnBlood(pr.x + rnd(-0.3, 0.3), pr.y + rnd(-0.3, 0.3)); else spawnPuff(pr.x, pr.y, 6);
  say(`BLODPAKT: +${Math.round((s29PactMul() - 1) * 100)} % SKADA RESTEN AV RUNDAN`, 3); logEvent('BLODPAKT ' + R.pacts);
  return true;
}
USES.s29altar = pr => {
  const n = (run && run.s29 && run.s29.pacts) || 0;
  openUI(() => CardUI.choice({ title: 'BLODALTARET', subtitle: n ? `${n} ${n > 1 ? 'BLODPAKTER' : 'BLODPAKT'} HITTILLS` : 'BLOD FÖR STYRKA', cancel: 1,
    options: [{ label: 'OFFRA', text: `−${Math.round(maxHp() * 0.25)} HÄLSA, +10 % SKADA RESTEN AV RUNDAN` }, { label: 'GÅ DÄRIFRÅN', text: '' }] }, i => { s29AltarUse(pr, i); closeUI(); }));
};
function s29SpawnBoss() {
  let at = null; const b = lvl.boss29;
  if (b && Number.isInteger(b.x) && map[b.y] && map[b.y][b.x] === '.' && freeSpot(b.x + 0.5, b.y + 0.5, 0.45)) at = [b.x + 0.5, b.y + 0.5];
  for (let i = 0; i < 300 && !at; i++) { const x = 1 + ((S29.rng.next() * (mw - 2)) | 0), y = 1 + ((S29.rng.next() * (mh - 2)) | 0); if (map[y][x] === '.' && freeSpot(x + 0.5, y + 0.5, 0.45) && !s29GuardRoom(x, y) && s29OpenRoom(x, y) && Math.hypot(x + 0.5 - P.x, y + 0.5 - P.y) > 10) at = [x + 0.5, y + 0.5]; }
  if (!at) return;
  const type = S29.rng.pick(['K', 'V', 'W', 'R', 'S'].filter(t => ENEMY_DEFS[t])), e = makeEnemy(type, at[0], at[1]);
  e.hp = e.maxHp = e.maxHp * (7 + 0.6 * run.depth);
  e.d = { ...e.d, name: 'BLODFURSTEN', size: e.d.size * 1.55, dmg: e.d.dmg * 1.35, speed: e.d.speed * 0.95, score: e.d.score * 10 };
  e.elite = { id: 'blood29', name: 'BLODFURSTEN', tint: [255, 40, 40] }; e.s29boss = true; e.cowardly = false;
  ents.push(e); totalEnemies++; S29.bossE = e; S29.act = true; S29.poolT = 2;
  logEvent('BLODFURSTEN'); say('NÅGOT VÄLDIGT LUKTAR BLOD PÅ DEN HÄR VÅNINGEN', 3);
}
function s29BossTick(dt) {
  const b = S29.bossE;
  if (b && b.dead) { s29BossDown(b); return; }
  if (b && b.alert) {
    if ((S29.poolT -= dt) <= 0 && S29.pools.length < S29_POOL.max) { S29.poolT = b.hp < b.maxHp * 0.5 ? S29_POOL.everyLow : S29_POOL.every; s29Pool(b); }
    if (S29.pools.length && b.hp < b.maxHp) { const h = Math.min(b.maxHp - b.hp, b.maxHp * S29_POOL.heal * S29.pools.length * dt); b.hp += h; S29.st.healed += h; }
    if ((S29.streamT -= dt) <= 0) { S29.streamT = settings.lowfx ? 0.6 : 0.25; const c = s29BloodOn() ? [255, 40, 30] : [150, 120, 200];
      for (const p of S29.pools) { const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy) || 1; particles.push({ x: p.x, y: p.y, z: 0.08, vx: dx / d * Math.min(4, d * 2), vy: dy / d * Math.min(4, d * 2), vz: 0.5, life: Math.min(0.5, d / 4), maxLife: 0.5, img: fx.hit[1], size: 0.07, add: true, tint: c }); } }
  }
  for (const p of S29.pools) { // vänliga projektiler (armborst, pilar, knivar ...) slår också sönder pölar
    for (const q of projectiles) if (q.friendly && !q.dead && Math.hypot(q.x - p.x, q.y - p.y) < S29_POOL.r) { p.hp = 0; q.dead = true; break; }
  }
  if (S29.pools.some(p => p.hp <= 0)) S29.pools = S29.pools.filter(p => p.hp > 0 || (s29PoolPop(p), false));
}
function s29Pool(b) {
  const rng = S29.rng || RNG(1);
  for (let k = 0; k < 20; k++) {
    const a = rng.next() * TAU, r = 1.5 + rng.next() * 2.2, x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r;
    if (x < 1 || y < 1 || x >= mw - 1 || y >= mh - 1 || solid(x, y) || map[y | 0][x | 0] !== '.' || S29.pools.some(p => Math.hypot(p.x - x, p.y - y) < 1)) continue;
    const f = fx.parts.blood_pool, img = f ? f[k % f.length] : fx.hit[1];
    S29.pools.push({ x, y, hp: 1, img, size: 0.18, z: 0, s29pool: true, t: tmr }); S29.st.poolsMade++;
    if (s29BloodOn() && !settings.lowfx) for (let i = 0; i < 3; i++) spawnBlood(x, y); else spawnPuff(x, y, 3);
    play('splat', 0.5, 0.7, { x, y }); return true;
  }
  return false;
}
function s29PoolPop(p) { p.hp = 0; S29.st.poolsShot++; play('splash', 0.5, 1.2, { x: p.x, y: p.y }); if (s29BloodOn() && !settings.lowfx) { for (let i = 0; i < 2; i++) spawnBlood(p.x, p.y); } else spawnPuff(p.x, p.y, 3); spawnText(p.x, p.y, 'PÖLEN TORKAR', '#ffb0a0'); }
function s29BossDown(b) {
  S29.bossE = null; for (const p of S29.pools) s29PoolPop(p); S29.pools = [];
  const R = s29Run(); R.bosses = (R.bosses || 0) + 1; stat('s29bloodBoss');
  chests.push({ x: b.x, y: b.y, open: false, t: 0 }); for (let i = 0; i < 8; i++) dropItem('gold', b.x + rnd(-0.4, 0.4), b.y + rnd(-0.4, 0.4));
  if (s29BloodOn() && !settings.lowfx) for (let i = 0, tries = 0; i < 10 && tries < 30; tries++) { const a = tries / 30 * TAU, dx = Math.cos(a), dy = Math.sin(a), hit = cast(b.x, b.y, dx, dy, 3.5); if (hit.dist < 3.5 && !hit.door && hit.cell && hit.cell !== 'ǂ' && v27Wall(hit, dx, dy, 0.3 + Math.random() * 0.4, V27_COL.flesh, 0.12 + Math.random() * 0.12, 0.8)) i++; }
  say('BLODFURSTEN ÄR FÄLLD – EN KISTA OCH GULD', 3); logEvent('BLODFURSTEN FÄLLD'); play('stinger', 0.6, 1.2);
}
function s29World(list) { if (S29.pools.length && S29.lvl === lvl) for (const p of S29.pools) list.push({ x: p.x, y: p.y, k: 's29', o: Object.assign(p, { tint: s29BloodOn() ? null : [120, 100, 170] }) }); }
// dödsskärmen och statistiken
function s29RunOver(r) {
  const R = r && r.s29; if (!R || !(R.pacts || R.bosses)) return;
  const cause = document.getElementById('ro-cause'); if (!cause) return;
  const bits = []; if (R.pacts) bits.push(`${R.pacts} ${R.pacts > 1 ? 'BLODPAKTER' : 'BLODPAKT'} (+${Math.round(10 * Math.min(R.pacts, 6))} % SKADA)`); if (R.bosses) bits.push(`${R.bosses} ${R.bosses > 1 ? 'BLODFURSTAR FÄLLDA' : 'BLODFURSTE FÄLLD'}`);
  if (cause.textContent) cause.append(' · '); cause.append(bits.join(' · ')); cause.hidden = false;
}
function s29StatRows(p) { return [{ label: 'BLODVÅNINGEN', head: true, color: '#ff6050' }, { label: 'BLODPAKTER', text: String(p.s29pacts || 0) }, { label: 'BLODFURSTAR FÄLLDA', text: String(p.s29bloodBoss || 0) }]; }
function s29Api() {
  return { S: S29, rules: S29_RULE_IDS.slice(), set: (k, v) => { S29[k] = v; },
    state: () => ({ on: S29.on, rule: S29.rule, chal: v28.chal, gun: S29.gun, weapon: P.weapon, clockLeft: S29.clock ? s29ClockLeft() : null, clockOver: S29.clock ? S29.clock.over : null, clockBase: S29.clock ? S29.clock.base : null,
      hud: s29HudText(), pools: S29.pools.length, boss: S29.bossE ? { hp: S29.bossE.hp, maxHp: S29.bossE.maxHp, x: S29.bossE.x, y: S29.bossE.y, type: S29.bossE.type } : null,
      altar: S29.altarPr ? { x: S29.altarPr.cx, y: S29.altarPr.cy, used: !!S29.altarPr.used } : null, run: run && run.s29 ? JSON.parse(JSON.stringify(run.s29)) : null, tethered: S29.tethered.length, st: { ...S29.st } }),
    altarUse: i => s29AltarUse(S29.altarPr, i), bonus: (r, d) => s29Bonus(r, d), clockLeft: () => s29ClockLeft(), pool: () => S29.bossE ? s29Pool(S29.bossE) : false, pools: () => S29.pools, boss: () => S29.bossE,
    kick: () => kick(), bash: () => bash(), runOver: () => { const el = document.getElementById('ro-cause'); return el ? el.textContent : ''; }, statRows: () => s29StatRows(profile) };
}
{ // inlindningar (krokar utan att ändra andras delar)
  const S29w = { kick, bash, dashHits, switchWeapon, updateEnemy, hurtEnemy, hurtPlayer, drawHudExtras, drawV24World, v26aTargets, v26aShot, explode };
  const inMelee = fn => function (...a) { S29.mctx++; try { return fn.apply(this, a); } finally { S29.mctx--; } };
  kick = function () { // sparken: närstrid, och den sparkar sönder blodpölar framför dig
    if (S29.pools.length && state === 'play' && !(P.kickT > 0)) for (const p of S29.pools) { const dx = p.x - P.x, dy = p.y - P.y, d = Math.hypot(dx, dy); let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off)); if (d < 1.6 && Math.abs(off) < 0.8) p.hp = 0; }
    S29.mctx++; try { return S29w.kick(); } finally { S29.mctx--; }
  };
  bash = inMelee(S29w.bash); dashHits = inMelee(S29w.dashHits);
  switchWeapon = function (n) {
    if (S29.rule === 'onegun' && S29.gun >= 0 && P.has[S29.gun] && n !== S29.gun && s29Here()) { if (S29.gunMsg < tmr) { S29.gunMsg = tmr + 1.5; say('ETT VAPEN: BYTE ÄR SPÄRRAT', 1.2); play('click', 0.4, 0.7); } S29.st.blocked++; return; }
    return S29w.switchWeapon(n);
  };
  updateEnemy = function (e, dt) { S29w.updateEnemy(e, dt); if (e.s29home) s29Clamp(e); };
  hurtEnemy = function (e, dmg, hx, hy, opt) {
    if (S29.on && run && S29.lvl === lvl) { if (S29.rule === 'glass') dmg *= 2; if (run.s29 && run.s29.pacts) dmg *= s29PactMul(); if (S29.mctx > 0 && v28.chal === 'melee') S29.st.meleeHits++; }
    return S29w.hurtEnemy(e, dmg, hx, hy, opt);
  };
  hurtPlayer = function (d, fx0, fy0, kind) { if (S29.rule === 'glass' && S29.lvl === lvl) d *= 2; return S29w.hurtPlayer(d, fx0, fy0, kind); };
  drawHudExtras = function (g) { S29w.drawHudExtras(g); if (S29.act || v28.chal) s29Hud(g); };
  drawV24World = function (list) { S29w.drawV24World(list); s29World(list); };
  v26aTargets = function (hits, dx, dy, wallDist) { // blodpölarna blir träffmål längs strålen (k 'c': fire() skickar dem till v26aShot)
    S29w.v26aTargets(hits, dx, dy, wallDist);
    for (const p of S29.pools) { if (p.hp <= 0) continue; const rx = p.x - P.x, ry = p.y - P.y, along = rx * dx + ry * dy; if (along > 0.1 && along < wallDist && Math.abs(rx * dy - ry * dx) < 0.3) hits.push({ o: p, d: along, k: 'c' }); }
  };
  v26aShot = function (h, base, wp) { if (h.o && h.o.s29pool) { if (h.o.hp > 0) { h.o.hp = 0; hitMark = 0.1; } return 0; } return S29w.v26aShot(h, base, wp); };
  explode = function (x, y, dmg, r, ...rest) { const out = S29w.explode(x, y, dmg, r, ...rest); for (const p of S29.pools) if (Math.hypot(p.x - x, p.y - y) < (r || 1.5) + 0.3) p.hp = 0; return out; };
}
