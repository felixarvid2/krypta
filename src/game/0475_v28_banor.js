// ---------- Version 28 (GEN): översvämmad sal, vakttorn, balkonger bakom galler, fönster mot rum man når senare, blodvåning och utmaningsvåning ----------
// Läser level.scenes28 (floodhall, tower, balcony), level.windows28 (fönster ǂ mot ett rum längre fram), level.deep28 (djupa bassänger: - blir Đ när
// banan startar) och level.blood28 (blodvåningen) från gen.js, och run.v28 = { blood: { djup: true }, chal: { djup: regel } } (valt i portalen).
// Krokar: v28PreMap() direkt efter att kartan kopierats i startLevel, v28gStart() efter v27Start(), updateV28(dt) efter updateV27(dt). Övrigt lindas
// in här (routePortals, enterPortal, updatePortals, floorDone, heal, overheal, hurtEnemy, buildGrade, playMusic), så att andras delar inte behöver ändras.

// ǂ (FÖNSTER) i GEN:s arbetskopia: en vägg för kollision, kulor, siktlinje och fiendernas vägsökning; ritas som ett galler (dörrgallrets bild) tills
// REND:s genomsiktliga rendering slås ihop. TA BORT båda raderna vid sammanslagningen om REND:s isWallChar0/wallTexFor redan har ǂ.

const V28_SCENE_TXT = { floodhall: 'DEN ÖVERSVÄMMADE SALEN – AKTA DJUPET', tower: 'VAKTTORNET – SKYTTEN SITTER BAKOM GALLRET', balcony: 'BALKONGEN – SKYTTARNA NÅS FRÅN SIDAN' };
const V28_WIN_TXT = { exit: 'GENOM GALLRET SKYMTAR DU UTGÅNGEN', treasure: 'GENOM GALLRET GLIMMAR SKATTKAMMAREN', vault: 'GENOM GALLRET SKYMTAR ETT VALV', elite: 'GENOM GALLRET RÖR SIG NÅGOT STORT', key: 'GENOM GALLRET LIGGER NYCKELN' };
const V28_RULES = {
  melee: { name: 'BARA NÄRSTRID', text: 'SKOTT OCH SPRÄNGNINGAR GÖR BARA EN FJÄRDEDEL AV SKADAN' },
  noheal: { name: 'INGEN LÄKNING', text: 'INGET LÄKER DIG PÅ HELA VÅNINGEN' },
  fast: { name: 'SNABBA FIENDER', text: 'FIENDERNA RÖR SIG DUBBELT SÅ FORT' },
  dark: { name: 'MÖRKER', text: 'BARA FICKLAMPAN OCH FACKLORNA LYSER' },
};
const V28_RULE_IDS = Object.keys(V28_RULES);
const V28_BLOOD = { name: 'BLODVÅNINGEN', text: 'FLER FIENDER, FLER KISTOR – OCH BLOD PÅ VÄGGARNA', mul: 1.6 };
let v28 = { lvl: null, scenes: [], seen: {}, wins: [], t: 0, shown: [], blood: false, chal: null, extra: 0, chests: 0, walls: 0, done: false };
const v28Run = () => (run ? (run.v28 = run.v28 || { blood: {}, chal: {} }) : null);
function v28gApi() {
  return { state: () => ({ plan: v28.lvl && v28.lvl.scenes28 ? v28.lvl.scenes28.map(s => s.kind) : null, shown: v28.shown.slice(), blood: v28.blood, chal: v28.chal, extra: v28.extra, chests: v28.chests, walls: v28.walls, done: v28.done }),
    rules: V28_RULE_IDS.slice(), force: (depth, o) => { const R = v28Run(); if (!R) return; if (o.blood) R.blood[depth] = true; if (o.chal) R.chal[depth] = o.chal; },
    portal: (x, y) => spawnPortal(x, y, 'floor'), heal: n => heal(n), overheal: n => overheal(n), floorEvent: () => floorEvent, total: () => totalEnemies, hint: () => hint, grade: () => [gradeLUT[0][200], gradeLUT[1][200], gradeLUT[2][200]] };
}
// djupa bassänger: före startLevels genomgång av rutorna (golvbilder och farokarta byggs där)
function v28PreMap() {
  if (!lvl || !Array.isArray(lvl.deep28) || !lvl.deep28.length) return;
  for (const c of lvl.deep28) if (c && map[c.y] && map[c.y][c.x] === '-') map[c.y][c.x] = 'Đ';
}
function v28gStart() {
  v28 = { lvl, scenes: [], seen: {}, wins: [], t: 0, shown: [], blood: false, chal: null, extra: 0, chests: 0, walls: 0, done: false };
  if (window.__game && !window.__game.v28g) window.__game.v28g = v28gApi();
  if (!lvl || !run || run.custom || run.practiceT || lvl.arena || lvl.hub || boss) return;
  const rm = lvl.roomMask;
  if (Array.isArray(lvl.scenes28) && Array.isArray(rm)) for (const s of lvl.scenes28) if (s && V28_SCENE_TXT[s.kind] && Number.isInteger(s.room)) v28.scenes.push({ kind: s.kind, room: s.room });
  if (Array.isArray(lvl.windows28)) for (const w of lvl.windows28) if (w && w.from && lvl.rooms && lvl.rooms[w.room]) {
    const r = lvl.rooms[w.room], hasKey = w.cells && (() => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (lvl.map[y] && lvl.map[y][x] === '}') return true; return false; })();
    v28.wins.push({ x: w.from.x + 0.5, y: w.from.y + 0.5, c: w.cells[0], kind: hasKey ? 'key' : r.type, seen: false });
  }
  if (lvl.secret || lvl.maze || run.practice) return;
  const R = v28Run(), d = run.depth;
  if (lvl.blood28 || (R.blood && R.blood[d])) v28BloodFloor();
  const rule = R.chal && R.chal[d];
  if (rule && V28_RULES[rule]) v28Challenge(rule);
}
// blodvåningen: fler fiender (×1,6), två extra kistor och guldhögar, blod på väggarna från start, röd färgton och dov musik
function v28BloodFloor() {
  v28.blood = true;
  const rng = RNG(RNG.hash(run.seed + ':blod28:' + run.depth)), gi = (lvl.rooms || []).findIndex(r => r.type === 'guardian');
  const inGuard = (x, y) => gi >= 0 && lvl.roomMask && lvl.roomMask[y | 0] && lvl.roomMask[y | 0].charCodeAt(x | 0) - 48 === gi;
  const inArena = (x, y) => (lvl.arenas || []).some(a => x >= a.x0 - 1 && x <= a.x1 + 2 && y >= a.y0 - 1 && y <= a.y1 + 2);
  const base = ents.filter(e => !e.dead && !e.boss && !e.guardian && !e.dormant && !e.hidden && !e.minion && !e.decoy && ENEMY_DEFS[e.type] && !inGuard(e.x, e.y) && !inArena(e.x, e.y));
  const want = Math.round(base.length * (V28_BLOOD.mul - 1));
  for (let k = 0, tries = 0; k < want && tries < want * 6 && base.length; tries++) {
    const e = base[(rng.next() * base.length) | 0], a = rng.next() * TAU, r = 0.8 + rng.next() * 0.9, x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r;
    if (!freeSpot(x, y, 0.3) || !hasLOS(e.x, e.y, x, y) || inGuard(x, y) || inArena(x, y) || Math.hypot(x - P.x, y - P.y) < 6 || map[y | 0][x | 0] !== '.') continue;
    const o = makeEnemy(e.type, x, y); o.blood28 = true; ents.push(o); totalEnemies++; k++; v28.extra++;
  }
  for (let i = 0; i < 2; i++) { const s = randomFreeCell(rng); if (s) { chests.push({ x: s[0], y: s[1], open: false, t: 0 }); v28.chests++; } }
  for (let i = 0; i < 4; i++) { const s = randomFreeCell(rng); if (s) items.push({ type: 'goldpile', x: s[0], y: s[1], taken: false }); }
  if (v27B() > 0 && !settings.lowfx) { // blod på väggarna (BLOOD:s väggstänk; BLOD AV och lågeffektläget ger inget)
    const n = v27B() >= 2 ? 36 : 22;
    for (let i = 0, tries = 0; i < n && tries < n * 4; tries++) {
      const s = randomFreeCell(rng); if (!s) continue;
      const a = rng.next() * TAU, dx = Math.cos(a), dy = Math.sin(a), hit = cast(s[0], s[1], dx, dy, 4);
      if (hit.dist >= 4 || hit.door || !hit.cell || hit.cell === 'ǂ') continue;
      if (v27Wall(hit, dx, dy, 0.25 + rng.next() * 0.55, rng.next() < 0.7 ? V27_COL.flesh : V27_COL.dark, 0.08 + rng.next() * 0.16, 0.6 + rng.next())) { i++; v28.walls++; }
    }
  }
  if (!String(lvl.name || '').startsWith(V28_BLOOD.name)) lvl.name = V28_BLOOD.name + ' · ' + (lvl.name || '');
  if (floorQuest && floorQuest.kind === 'time') { floorQuest.limit = Math.round(floorQuest.limit * V28_BLOOD.mul); floorQuest.text = `TIDSUTMANING: PORTALEN INOM ${fmtTime(floorQuest.limit)}`; } // (tidsutmaningen räknar med de extra fienderna)
  say(V28_BLOOD.name + ': ' + V28_BLOOD.text, 4); logEvent(V28_BLOOD.name); v28.shown.push('blood');
  if (window.Music) Music.sting('boss');
}
// utmaningsvåningen (vald i portalen): en regel och en större belöning när våningen är klar
function v28Challenge(rule) {
  v28.chal = rule; const R = V28_RULES[rule];
  if (rule === 'fast') for (const e of ents) if (!e.boss && e.d) e.d = { ...e.d, speed: e.d.speed * 2 };
  if (rule === 'dark') { floorEvent = 'dark'; const rng = RNG(RNG.hash(run.seed + ':mörker28:' + run.depth)); for (let i = 0; i < 2; i++) { const s = randomFreeCell(rng); if (s) items.push({ type: 'battery', x: s[0], y: s[1], taken: false }); } }
  say('UTMANING: ' + R.name + ' – ' + R.text, 4.5); logEvent('UTMANING: ' + R.name); v28.shown.push('chal:' + rule);
  if (window.Music) Music.sting('challenge');
}
const v28Reward = () => 60 + 20 * (run ? run.depth : 1);
function updateV28(dt) {
  if (v28.lvl !== lvl || state !== 'play') return;
  if ((v28.t -= dt) > 0) return;
  v28.t = 0.25;
  const x = Math.floor(P.x), y = Math.floor(P.y), rm = lvl.roomMask;
  for (const w of v28.wins) if (!w.seen && Math.hypot(P.x - w.x, P.y - w.y) < 1.6) { // fönstret: en glimt av målet
    const a = Math.atan2(w.c.y + 0.5 - P.y, w.c.x + 0.5 - P.x), off = Math.abs(Math.atan2(Math.sin(a - P.a), Math.cos(a - P.a)));
    if (off < 1.1) { w.seen = true; v28.shown.push('win:' + w.kind); say(V28_WIN_TXT[w.kind] || V28_WIN_TXT.exit, 2.5); }
  }
  if (!v28.scenes.length || !rm || y < 0 || y >= rm.length || x < 0 || x >= rm[y].length || rm[y][x] === '-') return;
  const k = rm[y].charCodeAt(x) - 48, s = v28.scenes.find(o => o.room === k);
  if (!s || v28.seen[k]) return;
  v28.seen[k] = 1; v28.shown.push(s.kind); say(V28_SCENE_TXT[s.kind], 2.5);
}
// en tredje portal mot en utmaningsvåning (ibland en blodvåning) bredvid portalerna till nästa våning
function v28Portal(p) {
  if (!run || !p || run.abyss || run.bossrush || run.practice || run.campaign || run.custom || run.hunt || run.maze || lvl.secret) return;
  const next = run.depth + 1; if (isBossDepth(next) || next < 3) return;
  const r = RNG(RNG.hash(run.seed + ':utmaning28:' + next)), roll = r.next(), force = params.get('v28portal');
  if (!force && roll > 0.4) return;
  const blood = force ? force === 'blood' : r.next() < 0.25;
  const meleeOK = WEAPONS.some((w, i) => w.melee && P.has[i]); // (BARA NÄRSTRID erbjuds bara den som har ett närstridsvapen)
  const o = blood ? { blood: true } : { chal: V28_RULE_IDS.includes(force) ? force : r.pick(V28_RULE_IDS.filter(id => id !== 'melee' || meleeOK)) };
  for (let k = 0; k < 36; k++) { // (tolv riktningar på tre avstånd; den första fria platsen med fri sikt från portalen)
    const ang = P.a + Math.PI * 0.75 + (k % 12) * TAU / 12, rr = [2.2, 1.7, 3.0][(k / 12) | 0], x = p.x + Math.cos(ang) * rr, y = p.y + Math.sin(ang) * rr;
    if (freeSpot(x, y, 0.35) && hasLOS(p.x, p.y, x, y) && portals.every(q => Math.hypot(q.x - x, q.y - y) > 1.6)) {
      portals.push({ x, y, kind: 'floor', v28: o, t: 0, armed: Math.hypot(P.x - x, P.y - y) > 1 }); spawnPuff(x, y, 8);
      say(blood ? 'EN BLODRÖD PORTAL ÖPPNAS' : 'EN UTMANINGSPORTAL ÖPPNAS: ' + V28_RULES[o.chal].name, 3); return;
    }
  }
}
const v28PortalHint = p => p.v28.blood ? `PORTAL → ${V28_BLOOD.name} · FLER FIENDER, MER BELÖNING` : `PORTAL → UTMANING: ${V28_RULES[p.v28.chal].name} · +${v28Reward() + 20} GULD`;
{ // inlindningar (krokar utan att ändra andras delar)
  const routePortals0 = routePortals; routePortals = function (p) { routePortals0(p); try { v28Portal(p); } catch (e) { /* ingen portal */ } };
  const enterPortal0 = enterPortal; enterPortal = function (p) {
    if (p && p.v28 && run) { const R = v28Run(), next = run.depth + 1; if (p.v28.blood) R.blood[next] = true; if (p.v28.chal) R.chal[next] = p.v28.chal; play('route_choice', 0.7); logEvent(p.v28.blood ? 'VÄG: ' + V28_BLOOD.name : 'VÄG: UTMANING ' + V28_RULES[p.v28.chal].name); }
    return enterPortal0(p);
  };
  const updatePortals0 = updatePortals; updatePortals = function (dt) { updatePortals0(dt); for (const p of portals) if (p.v28 && Math.hypot(P.x - p.x, P.y - p.y) < 1.8) hint = v28PortalHint(p); };
  const floorDone0 = floorDone; floorDone = function () {
    if (v28.chal && v28.lvl === lvl && !v28.done && run && !boss) { v28.done = true; const g = v28Reward(); run.gold += g; run.challenges = (run.challenges || 0) + 1; stat('challenges'); say(`UTMANINGEN KLARAD: +${g} GULD`, 3); play('coin', 0.8, 0.8); }
    return floorDone0();
  };
  const heal0 = heal; heal = function (n, silent) { if (v28.chal === 'noheal' && v28.lvl === lvl && state === 'play') return 0; return heal0(n, silent); };
  const overheal0 = overheal; overheal = function (n) { if (v28.chal === 'noheal' && v28.lvl === lvl && state === 'play') return 0; return overheal0(n); }; // (avrättningarnas läkning över max)
  const hurtEnemy0 = hurtEnemy; hurtEnemy = function (e, dmg, hx, hy, opt) { if (v28.chal === 'melee' && v28.lvl === lvl && !(opt && (opt.melee || opt.dot || opt.exec || opt.land))) dmg *= 0.25; return hurtEnemy0(e, dmg, hx, hy, opt); };
  const buildGrade0 = buildGrade; buildGrade = function () { buildGrade0(); if (v28.blood && v28.lvl === lvl) for (let i = 0; i < 256; i++) { gradeLUT[0][i] = Math.min(255, gradeLUT[0][i] * 1.06); gradeLUT[1][i] *= 0.74; gradeLUT[2][i] *= 0.7; } }; // röd färgton
  const playMusic0 = playMusic; playMusic = function () { playMusic0(); if (window.Music && settings.music !== false && v28.blood && v28.lvl === lvl && state === 'play' && !musicSnd && !lvl.hub) Music.play('abattoir'); }; // dov musik: slakteriets
}
