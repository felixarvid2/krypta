// ---------- Version 24: bandesign ----------
// Enkelriktade genvägsdörrar (d.oneway: öppnas bara från den bortre sidan; fienderna öppnar dem inte och avståndsfältet går inte igenom dem medan
// de är stängda: hazGrid = 2 på dörrens ruta), bakhåll (nischer i väggen som öppnas när man tar nyckeln/öppnar kistan; fienderna skapas först då),
// landmärkets ljus och ledtrådar vid hemliga väggar (damm som silar, ett svagt ljus). Läser level.shortcuts/ambushes/landmarks/secretHints (gen.js).
// Allt ställs in lat i updateV24 när banan byts; varje post kontrolleras mot kartan (egna banor ärver fälten från en riktig bana).
let v24 = { lvl: null, shortcuts: [], ambushes: [], hints: [], landmarks: [], msgT: 0, dustT: 0, opened: 0, fired: 0, blocked: 0 };
function v24Setup() {
  v24 = { lvl, doors, shortcuts: [], ambushes: [], hints: [], landmarks: [], msgT: 0, dustT: 0, opened: 0, fired: 0, blocked: 0 };
  if (window.__game && !window.__game.v24) window.__game.v24 = v24api;
  if (run && (run.custom || run.practiceT)) return; // (en egen bana ärver fälten från en riktig bana: de gäller inte; inte heller i övningen)
  const ok = o => o && Number.isInteger(o.x) && Number.isInteger(o.y) && o.x >= 0 && o.y >= 0 && o.x < mw && o.y < mh;
  for (const b of lvl.breadcrumbs || []) if (ok(b) && map[b.y][b.x] === '.' && (b.ch === 'a' || b.ch === 'h')) { items.push({ type: b.ch === 'h' ? 'health' : 'ammo', x: b.x + 0.5, y: b.y + 0.5, taken: false, mult: 1, v24: true }); totalItems++; } // brödsmulorna
  for (const s of lvl.shortcuts || []) {
    const d = ok(s) && map[s.y][s.x] === 'D' ? doors[s.x + ',' + s.y] : null; if (!d) continue;
    const e = { x: s.x, y: s.y, oneway: !!s.oneway, sx: s.sx, sy: s.sy, d };
    if (e.oneway && Math.abs(s.sx - s.x) + Math.abs(s.sy - s.y) === 1) { d.oneway = { sx: s.sx, sy: s.sy }; if (hazGrid && !hazGrid[s.y * mw + s.x]) hazGrid[s.y * mw + s.x] = 2; } else e.oneway = false;
    v24.shortcuts.push(e);
  }
  for (const a of lvl.ambushes || []) {
    if (!a || !ok(a.trigger) || !ok(a.from) || !Array.isArray(a.cells) || !a.cells.length || !a.cells.every(c => ok(c) && isWallChar(map[c.y][c.x]))) continue;
    const tx = a.trigger.x + 0.5, ty = a.trigger.y + 0.5;
    const e = { trigger: a.trigger, from: a.from, cells: a.cells, enemies: (a.enemies || []).filter(o => ok(o) && ENEMY_DEFS[o.ch]), done: false, item: null, chest: null };
    if (a.trigger.kind === 'key') e.item = items.find(it => it.type === 'key' && !it.drop && Math.abs(it.x - tx) < 0.05 && Math.abs(it.y - ty) < 0.05) || null;
    if (a.trigger.kind === 'chest') e.chest = chests.find(c => Math.abs(c.x - tx) < 0.05 && Math.abs(c.y - ty) < 0.05) || null;
    if ((a.trigger.kind === 'key' && !e.item) || (a.trigger.kind === 'chest' && !e.chest) || !e.enemies.length) continue;
    v24.ambushes.push(e);
  }
  for (const h of lvl.secretHints || []) { const d = ok(h) && map[h.y][h.x] === '*' ? doors[h.x + ',' + h.y] : null; if (d && d.secret && Number.isInteger(h.fx) && Number.isInteger(h.fy)) v24.hints.push({ x: h.x, y: h.y, fx: h.fx, fy: h.fy, d }); }
  const add = [];
  for (const l of lvl.landmarks || []) if (ok(l) && isPropChar(map[l.y][l.x])) { v24.landmarks.push({ x: l.x, y: l.y }); add.push({ x: l.x + 0.5, y: l.y + 0.5, ph: 0, cells: [], hidden: true, str: 0.5, r: 5, v24: true }); }
  for (const h of v24.hints) add.push({ x: h.fx + 0.5 + (h.x - h.fx) * 0.4, y: h.fy + 0.5 + (h.y - h.fy) * 0.4, ph: 0, cells: [], hidden: true, str: 0.22, r: 1.6, v24: true }); // ett svagt ljus sipprar ut
  if (add.length) { const keep = torches.slice(); torches.length = 0; torches.push(...add); prepareTorchLight(); torches.length = 0; torches.push(...keep, ...add); }
  flowCell = -1;
}
function v24Side(d) { // står spelaren på den sida som den enkelriktade dörren öppnas från?
  const o = d.oneway, dx = o.sx - d.x, dy = o.sy - d.y;
  return dx ? Math.sign(P.x - (d.x + 0.5)) === Math.sign(dx) : Math.sign(P.y - (d.y + 0.5)) === Math.sign(dy);
}
function v24OpenOneway(d) {
  d.oneway = null; d.target = 1; v24.opened++;
  if (hazGrid && hazGrid[d.y * mw + d.x] === 2) hazGrid[d.y * mw + d.x] = 0;
  flowCell = -1; play('unlock', 0.8, 1.1); play('door', 0.6, 1, { x: d.x + 0.5, y: d.y + 0.5 }); say('GENVÄG ÖPPNAD', 2);
}
function v24Use(d) { // E mot en enkelriktad dörr (sant: hanterat)
  if (!d.oneway) return false;
  if (d.target) return true;
  if (v24Side(d)) { v24OpenOneway(d); return true; }
  v24.blocked++; say('ÖPPNAS FRÅN ANDRA SIDAN', 2); play('click', 0.6, 0.6); return true;
}
function v24Bump(d) { // spelaren går in i (eller sparkar) en stängd enkelriktad dörr
  if (!d.oneway || d.target) return;
  if (v24Side(d)) { v24OpenOneway(d); return; }
  if (tmr > v24.msgT) { v24.msgT = tmr + 2.5; v24.blocked++; say('ÖPPNAS FRÅN ANDRA SIDAN', 2); play('click', 0.5, 0.6); }
}
function v24Ambush(a) { // nischen öppnas och fienderna kliver ut
  a.done = true; v24.fired++;
  const fi = a.from.y * mw + a.from.x;
  for (const c of a.cells) {
    const i = c.y * mw + c.x; map[c.y][c.x] = '.';
    if (cellFloor) cellFloor[i] = cellFloor[fi]; if (cellSky) cellSky[i] = cellSky[fi]; if (light) light[i] = light[fi];
    spawnPuff(c.x + 0.5, c.y + 0.5, 3);
  }
  flowCell = -1;
  for (const o of a.enemies) { const e = makeEnemy(o.ch, o.x + 0.5, o.y + 0.5); e.alert = true; e.sleep = false; e.v24amb = true; ents.push(e); totalEnemies++; }
  P.shake = Math.max(P.shake || 0, 0.8); play('gate_slam', 0.9, 0.8); play('stinger', 0.6, 1.2); say('BAKHÅLL!', 2.5); v24.lastMsg = 'BAKHÅLL!';
  { const i = msgs.findIndex(m => m.text === plain('BAKHÅLL!')); if (i > 0) msgs.unshift(msgs.splice(i, 1)[0]); } // (texten först i kön)
}
function updateV24(dt) {
  if (!lvl || !map) return;
  if (v24.lvl !== lvl || v24.doors !== doors) v24Setup(); // (startLevel gör alltid ett nytt doors-objekt)
  for (const s of v24.shortcuts) { const d = s.d; if (d.oneway && d.target === 1 && !occupied(d)) d.target = 0; } // något annat försökte öppna den: den förblir stängd
  for (const a of v24.ambushes) if (!a.done && ((a.item && a.item.taken) || (a.chest && a.chest.open) || Math.hypot(P.x - a.trigger.x - 0.5, P.y - a.trigger.y - 0.5) < 0.7)) v24Ambush(a);
  if (v24.hints.length && (v24.dustT -= dt) <= 0 && !settings.lowfx && particles.length < pcap(200)) { // damm silar ur springorna kring hemliga väggar
    v24.dustT = 0.35;
    const img = fx.parts && fx.parts.dust ? fx.parts.dust[0] : fx.hit[1];
    for (const h of v24.hints) {
      if (h.d.open > 0 || h.d.target || Math.abs(h.x + 0.5 - P.x) + Math.abs(h.y + 0.5 - P.y) > 10 || !seen[h.fy * mw + h.fx]) continue;
      const ax = h.fx - h.x, ay = h.fy - h.y, u = rnd(0.15, 0.85);
      particles.push({ x: h.x + 0.5 + ax * 0.52 + (ay ? u - 0.5 : 0), y: h.y + 0.5 + ay * 0.52 + (ax ? u - 0.5 : 0), z: rnd(0.55, 0.95), vx: ax * 0.05, vy: ay * 0.05, vz: -0.25, life: 1.4, maxLife: 1.4, img, size: rnd(0.03, 0.06), fade: true, tint: [190, 180, 150] });
    }
  }
}
function drawV24World(list) { // ett glödande märke på var sida om en stängd enkelriktad dörr (rött: låst härifrån, gult: öppnas härifrån) och
  // landmärkets ljuspelare (bara nära nog: sprites kostar)
  if (v24.lvl !== lvl) return;
  for (const s of v24.shortcuts) {
    const d = s.d; if (!d.oneway || d.open > 0.02 || Math.abs(d.x - P.x) + Math.abs(d.y - P.y) > 12) continue;
    const ax = d.oneway.sx - d.x, ay = d.oneway.sy - d.y;
    list.push({ x: d.x + 0.5 + ax * 0.56, y: d.y + 0.5 + ay * 0.56, k: 'v24', t: 'open' }, { x: d.x + 0.5 - ax * 0.56, y: d.y + 0.5 - ay * 0.56, k: 'v24', t: 'shut' });
  }
  if (!settings.lowfx) for (const l of v24.landmarks) if (Math.abs(l.x - P.x) + Math.abs(l.y - P.y) < 30) list.push({ x: l.x + 0.5, y: l.y + 0.5, k: 'v24', t: 'beam' });
}
function drawV24Sprite(s) {
  const p = 0.5 + 0.5 * Math.sin(tmr * 3);
  if (s.t === 'beam') { const beam = fx.parts.beam ? fx.parts.beam[0] : fx.hit[1], k = Math.min(1, Math.max(0, (Math.sqrt(s.d) - 4) / 6)); if (k <= 0) return true; // (syns på håll, tonar bort nära)
    spriteSX = 1.2; drawSprite(beam, s.x, s.y, 0.98, 0, false, (0.35 + 0.2 * p) * k, 0, 0, true, [255, 215, 150]); spriteSX = 1; return true; }
  drawSprite(fx.hit[1], s.x, s.y, 0.16 + 0.03 * p, 0.5, false, 2.2, 0, 0, true, s.t === 'shut' ? [255, 50, 40] : [255, 210, 80]);
  return true;
}
function v24Map(s, ox, oy, inside) { // stängda enkelriktade dörrar syns röda på kartan
  if (v24.lvl !== lvl) return;
  for (const sc of v24.shortcuts) if (sc.d.oneway && inside(sc.x, sc.y) && seen[sc.y * mw + sc.x]) { ctx.fillStyle = '#d04040'; ctx.fillRect(ox + sc.x * s, oy + sc.y * s, s, s); }
}
const v24api = () => ({ state: v24, setup: v24Setup, side: v24Side, use: v24Use, bump: v24Bump, ambush: v24Ambush, kick, total: () => totalEnemies, kills: () => kills,
  cell: (x, y) => map[y][x], walk: (x, y) => walkableForEnemy(x, y), flowAt: (x, y) => { updateFlow(); return flow[y * mw + x]; }, torches: () => torches.filter(t => t.v24), light: (x, y) => light[y * mw + x] });
