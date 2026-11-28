// ---------- Version 19: gruvan och observatoriet – gruvvagnar, gas, ras, låg tyngdkraft, meteorer och stjärnportar ----------
let v19carts = [], v19loose = [], v19ports = [], v19slits = [], v19mets = [], v19wells = [], v19rays = [], v19beams = [], v19pend = [], v19caves = {}, v19ore = new Set(), v19metT = 6, v19clock = 0, v19snd = null;
function v19Path(c) { // en vagnbana: punkter (rutor) med längder, sluten eller fram och tillbaka
  const raw = Array.isArray(c) ? c : c && (c.path || c.points); if (!Array.isArray(raw)) return null;
  const pts = raw.map(p => Array.isArray(p) ? { x: +p[0], y: +p[1] } : { x: +p.x, y: +p.y }).filter(p => isFinite(p.x) && isFinite(p.y)).map(p => ({ x: p.x + 0.5, y: p.y + 0.5 }));
  if (pts.length < 2) return null;
  const loop = !!(c && c.loop), segs = []; let tot = 0;
  const n = loop ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], l = Math.hypot(b.x - a.x, b.y - a.y); if (l < 1e-6) continue; segs.push({ a, b, l, s0: tot }); tot += l; }
  if (tot < 0.5) return null;
  const speed = clamp(+(c && c.speed) || 2.4, 0.5, 6), ph = +(c && c.ph) || 0;
  return { segs, tot, loop, speed, s: ((ph <= 1 ? ph * (loop ? tot : tot * 2) : ph) % (loop ? tot : tot * 2) + (loop ? tot : tot * 2)) % (loop ? tot : tot * 2), x: pts[0].x, y: pts[0].y, dx: 1, dy: 0, hitT: 0 };
}
function v19CartPos(c) {
  let s = c.s, dir = 1; if (!c.loop && s > c.tot) { s = 2 * c.tot - s; dir = -1; }
  let g = c.segs[c.segs.length - 1]; for (const sg of c.segs) if (s <= sg.s0 + sg.l) { g = sg; break; }
  const k = clamp((s - g.s0) / g.l, 0, 1); c.x = g.a.x + (g.b.x - g.a.x) * k; c.y = g.a.y + (g.b.y - g.a.y) * k; c.dx = (g.b.x - g.a.x) / g.l * dir; c.dy = (g.b.y - g.a.y) / g.l * dir;
}
function setupV19() {
  if (v19snd) { try { v19snd.s.stop(); } catch (e) { /* stoppad */ } v19snd = null; }
  stopLanceSnd(); WS.lcharge = 0;
  v19carts = []; v19loose = []; v19ports = []; v19slits = []; v19mets = []; v19wells = []; v19rays = []; v19beams = []; v19pend = []; v19caves = {}; v19ore = new Set(); v19metT = rnd(4, 7); v19clock = 0;
  P.gasT = 0; P.gasAcc = 0; P.lowGT = 0; P.scopeT = 0; P.v19slowT = 0; P.cartT = 0; P.spLock = ''; P.v19reveal = false;
  for (const c of (lvl && Array.isArray(lvl.carts) ? lvl.carts : [])) { const p = v19Path(c); if (p) { v19CartPos(p); v19carts.push(p); } }
  // rälsen: vågrät, lodrät eller korsning efter grannarna
  const ti = {}; for (const n of ['floor_rail_h', 'floor_rail_v']) if (tex[n]) { ti[n] = floorTexs.length; floorTexs.push(tex[n]); }
  const rail = (x, y) => map[y] && (map[y][x] === 'Ȗ');
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const c = map[y][x];
    if (c === 'Ȗ') { const h = rail(x - 1, y) || rail(x + 1, y), v = rail(x, y - 1) || rail(x, y + 1); if (h && !v && ti.floor_rail_h !== undefined) cellFloor[y * mw + x] = ti.floor_rail_h; else if (v && !h && ti.floor_rail_v !== undefined) cellFloor[y * mw + x] = ti.floor_rail_v; }
    else if (c === 'Ț') v19slits.push({ x, y });
  }
  // stjärnportarna: level.starports, annars i par i ordning
  const sp = lvl && (lvl.starports || lvl.starPorts);
  if (Array.isArray(sp) && sp.length) for (const pr of sp) { const a = Array.isArray(pr) ? pr[0] : pr && pr.a, b = Array.isArray(pr) ? pr[1] : pr && pr.b; if (a && b && isFinite(a.x) && isFinite(b.x)) v19ports.push({ a: { x: a.x | 0, y: a.y | 0 }, b: { x: b.x | 0, y: b.y | 0 } }); }
  else { const ps = props.filter(p => p.ch === 'Ƞ'); for (let i = 0; i + 1 < ps.length; i += 2) v19ports.push({ a: { x: ps[i].cx, y: ps[i].cy }, b: { x: ps[i + 1].cx, y: ps[i + 1].cy } }); }
  if (lvl && lvl.biome === 'observatory') for (const t of torches) if (t.prop && t.prop.ch === 'c' && !t.v19dim) { t.v19dim = true; for (const c of t.cells) c[1] *= 0.7; } // ljusen mot mässingen: dämpade så att kupolerna inte bränns ut
  // tak: högst två kolgolemer och två tomrumsväktare per bana
  const rm = new Set(); for (const [t, max] of [['Ȣ', 2], ['Ȩ', 2]]) for (const e of ents.filter(o => o.type === t && !o.minion).slice(max)) rm.add(e);
  if (rm.size) { ents = ents.filter(e => !rm.has(e)); totalEnemies -= rm.size; }
}
const v19PortTo = (cx, cy) => { for (const t of v19ports) { if (t.a.x === cx && t.a.y === cy) return t.b; if (t.b.x === cx && t.b.y === cy) return t.a; } return null; };
const v19Grav = () => (P.lowGT > 0 ? 0.5 / (1 + mod('lowGrav')) : 1);
const v19Slow = () => (P.v19slowT > 0 ? 0.55 : 1) * (P.gasT > 0 ? 0.92 : 1);
function v19Meteor(x, y, o = {}) { // en meteor faller: varningsring, sedan nedslag (spelaren och fiender)
  if (solid(x, y)) return; const warn = (o.warn || 1) * (1 + mod('meteorSense'));
  v19mets.push({ x, y, t: 0, warn, r: o.r || 1.2, dmg: o.dmg || 20, cause: o.cause || 'METEOREN', small: !!o.small });
  play('meteor_fall', o.small ? 0.25 : 0.4, 1 / warn, { x, y });
}
function v19Clear(cx, cy) { map[cy][cx] = '.'; if (cellFloor) cellFloor[cy * mw + cx] = lvl.floorMask ? Math.min(Math.max(0, floorTexs.length - 1), +lvl.floorMask[cy][cx] || 0) : 0; flowCell = -1; }
function clearCavein(cx, cy) { v19Clear(cx, cy); delete v19caves[cy * mw + cx]; spawnPuff(cx + 0.5, cy + 0.5, 6); }
function v19Ignite(x, y) { // eld på en ruta: gasfickor och dynamitlådor
  const cx = x | 0, cy = y | 0; if (map[cy] && map[cy][cx] === 'ȗ' && !v19pend.some(p => p.cx === cx && p.cy === cy)) v19pend.push({ kind: 'gas', cx, cy, t: 0.05 });
  for (const pr of props) if (pr.ch === 'Ȝ' && !pr.broken && Math.abs(pr.x - x) < 0.8 && Math.abs(pr.y - y) < 0.8) v19HitProp(pr, pr.x, pr.y, 10);
}
function v19Blast(x, y, r) { // en explosion tänder gasen i radien (fördröjt: ingen rekursion)
  for (let cy = Math.max(0, (y - r) | 0); cy <= Math.min(mh - 1, (y + r) | 0); cy++) for (let cx = Math.max(0, (x - r) | 0); cx <= Math.min(mw - 1, (x + r) | 0); cx++)
    if (map[cy][cx] === 'ȗ' && Math.hypot(cx + 0.5 - x, cy + 0.5 - y) < r + 0.5 && !v19pend.some(p => p.cx === cx && p.cy === cy)) v19pend.push({ kind: 'gas', cx, cy, t: 0.12 });
}
function v19Boom(x, y, dmg, r, cause, big) { // explosion där spelarens skada skalas med avstånd och sprängskydd
  explode(x, y, dmg, r, false, big); const d = Math.hypot(P.x - x, P.y - y);
  if (d < r && boomSees(x, y, P.x, P.y)) { run.cause = cause; hurtPlayer(dmg * (1 - 0.5 * d / r) * Math.max(0, 1 - mod('blastResist')), x, y, 'proj'); }
}
function v19HitProp(pr, hx, hy, dmg) {
  if (pr.ch === 'Ȝ') { if (!pr.broken) { pr.broken = true; map[pr.cy][pr.cx] = '.'; flowCell = -1; v19pend.push({ kind: 'dyn', x: pr.x, y: pr.y, t: 0.45 }); play('dynamite_fuse', 1.4, 1, { x: pr.x, y: pr.y }); firstHint('dynamite', 'DYNAMITLÅDORNA SMÄLLER AV SKOTT OCH ELD – HÅLL AVSTÅND.'); } return true; }
  return undefined;
}
function updateV19(dt) {
  v19clock += dt; const c = cellUnder(), cx = P.x | 0, cy = P.y | 0, ground = P.jz < 0.15;
  // gruvvagnarna längs rälsen
  let near = 99;
  for (const k of v19carts) {
    k.s += k.speed * dt; const per = k.loop ? k.tot : k.tot * 2; if (k.s >= per) k.s -= per; v19CartPos(k); k.hitT -= dt;
    const d = Math.hypot(P.x - k.x, P.y - k.y); near = Math.min(near, d);
    if (d < 0.62 && P.jz < 0.5 && k.hitT <= 0 && (P.cartT || 0) < tmr) { k.hitT = 0.8; P.cartT = tmr + 0.8; v19CartHit(k.dx, k.dy, 15, k.x, k.y); }
    for (const e of ents) if (!e.dead && !e.boss && !e.guardian && !e.hidden && !e.dormant && !e.d.float && (e.cartT || 0) < tmr && Math.hypot(e.x - k.x, e.y - k.y) < 0.6) { e.cartT = tmr + 1; hurtEnemy(e, 40, e.x, e.y, { noProc: true, cart: true }); for (let i = 0; i < 6; i++) tryMove(e, k.dx * 0.12, k.dy * 0.12, 0.28); play('cart_hit', 1.3, 1, { x: e.x, y: e.y }); if (e.dead) stat('cartKills'); }
  }
  // lösa vagnar (puffade av spelaren eller släppta av förmannen)
  for (const v of v19loose) { const st = v.sp * dt, nx = v.x + v.vx * st, ny = v.y + v.vy * st; v.dist += st;
    if (solid(nx, ny) || v.dist > v.max) { v.dead = true; play('cart_hit', 1.2, 0.8, { x: v.x, y: v.y }); spawnPuff(v.x, v.y, 6); sparks(v.x, v.y, 0.3, 5); continue; }
    v.x = nx; v.y = ny; near = Math.min(near, Math.hypot(P.x - v.x, P.y - v.y));
    for (const e of ents) if (!e.dead && !e.hidden && !e.dormant && !v.hit.has(e) && !(v.boss && e.boss) && Math.hypot(e.x - v.x, e.y - v.y) < 0.75 + (e.boss ? 0.8 : 0)) { v.hit.add(e); hurtEnemy(e, v.boss ? 25 : 60, e.x, e.y, { noProc: true, cart: true }); play('cart_hit', 1.3, 1.1, { x: e.x, y: e.y }); if (!e.boss) for (let i = 0; i < 6; i++) tryMove(e, v.vx * 0.12, v.vy * 0.12, 0.28); if (e.dead) stat('cartKills'); }
    if (v.boss && !v.hitP && Math.hypot(P.x - v.x, P.y - v.y) < 0.7 && P.jz < 0.5) { v.hitP = true; v19CartHit(v.vx, v.vy, 15, v.x, v.y); } }
  v19loose = v19loose.filter(v => !v.dead);
  if (near < 14) { if (!v19snd || !ambLoops.includes(v19snd)) { v19snd = play('cart_roll', 0.01, 1, { loop: true, amb: true }); if (v19snd) ambLoops.push(v19snd); } if (v19snd) v19snd.g.gain.value = 0.55 * (1 - near / 14) ** 1.5; }
  else if (v19snd) v19snd.g.gain.value = 0;
  // gasfickorna
  if (c === 'ȗ') { P.gasT = 0.3; P.gasAcc = (P.gasAcc || 0) + dt; if (P.gasAcc >= 1) { P.gasAcc = 0; run.cause = 'GRUVGASEN'; hurtPlayer(1, P.x, P.y, 'gas'); play('hurt', 0.25, 1.3); firstHint('gas', 'GRUVGASEN ÄR SVÅR ATT ANDAS – OCH DEN EXPLODERAR AV ELD.'); } }
  else { P.gasT = Math.max(0, P.gasT - dt); P.gasAcc = 0.5; }
  // fördröjda explosioner: gas och dynamit
  for (const p of v19pend) { p.t -= dt; if (p.t > 0) continue; p.done = true;
    if (p.kind === 'gas') { if (!map[p.cy] || map[p.cy][p.cx] !== 'ȗ') continue; v19Clear(p.cx, p.cy); play('gas_ignite', 1.4, rnd(0.9, 1.1), { x: p.cx + 0.5, y: p.cy + 0.5 }); v19Boom(p.cx + 0.5, p.cy + 0.5, 14, 2, 'GASEXPLOSIONEN', false); stat('gasBooms');
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (map[p.cy + b] && map[p.cy + b][p.cx + a] === 'ȗ' && !v19pend.some(q => !q.done && q.cx === p.cx + a && q.cy === p.cy + b)) v19pend.push({ kind: 'gas', cx: p.cx + a, cy: p.cy + b, t: 0.15 }); }
    else if (p.kind === 'dyn') { play('bigboom', 1, 0.9, { x: p.x, y: p.y }); v19Boom(p.x, p.y, 50, 3, 'DYNAMITEN', true); stat('dynamite'); } }
  v19pend = v19pend.filter(p => !p.done);
  // knakande tak
  const ck = cy * mw + cx;
  for (const k in v19caves) if (+k !== ck) delete v19caves[k];
  if (c === 'Ș') { const t = (v19caves[ck] = (v19caves[ck] || 0) + dt);
    if (!settings.lowfx && Math.random() < dt * 10) particles.push({ x: cx + rnd(0.1, 0.9), y: cy + rnd(0.1, 0.9), z: 1, vx: 0, vy: 0, vz: -0.5, life: 0.8, maxLife: 0.8, img: fx.parts.dust ? fx.parts.dust[0] : fx.hit[1], size: 0.05, grav: true, tint: [170, 140, 110] });
    if (t > 0.05 && t - dt <= 0.05) { play('cavein', 0.3, 1.6, { x: cx + 0.5, y: cy + 0.5 }); firstHint('cavein', 'DET KNAKAR I TAKET – STÅ INTE KVAR UNDER DET.'); }
    if (t >= 0.8) caveIn(cx, cy); }
  // låg tyngdkraft på stjärnkartegolvet
  if (c === 'ș') P.lowGT = 0.3; else P.lowGT = Math.max(0, P.lowGT - dt);
  if (P.lowGT > 0 && P.jv >= 2.9 && (P.v19pjv || 0) < 2.9) { play('lowgrav_jump', 0.6, rnd(0.95, 1.05)); firstHint('lowgrav', 'STJÄRNKARTEGOLVET HAR LÅG TYNGDKRAFT – HOPPEN BLIR LÅNGA OCH HÖGA.'); }
  P.v19pjv = P.jv;
  // meteorregn genom kupolspringorna
  if (v19slits.length && !boss) { v19metT -= dt; if (v19metT <= 0) { v19metT = rnd(5, 8); const cand = v19slits.filter(s => Math.hypot(s.x + 0.5 - P.x, s.y + 0.5 - P.y) < 14); if (cand.length) { const s = cand[(Math.random() * cand.length) | 0]; v19Meteor(s.x + 0.5, s.y + 0.5, { dmg: 20, r: 1.2, warn: 1 }); firstHint('meteor', 'METEORER FALLER GENOM KUPOLSPRINGORNA – GÅ UR RINGEN.'); } } }
  for (const m of v19mets) { m.t += dt; if (m.t < m.warn) continue; m.done = true;
    play('meteor_impact', m.small ? 0.8 : 1.35, rnd(0.9, 1.1), { x: m.x, y: m.y }); explodeFx(m.x, m.y, 0.1); flashes.push({ x: m.x, y: m.y, t: 0.2, r: 3, col: [200, 160, 255] }); spawnPuff(m.x, m.y, 6);
    const dp = Math.hypot(P.x - m.x, P.y - m.y); if (dp < 10) P.shake = Math.max(P.shake, (m.small ? 0.6 : 1.2) * (1 - dp / 10));
    if (dp < m.r && P.jz < 0.5) { run.cause = m.cause; hurtPlayer(m.dmg * Math.max(0, 1 - mod('meteorSense') * 0.5), m.x, m.y, 'proj'); }
    for (const e of ents) if (!e.dead && !e.boss && !e.hidden && !e.dormant && Math.hypot(e.x - m.x, e.y - m.y) < m.r) hurtEnemy(e, m.dmg, e.x, e.y, { noProc: true, boom: true });
    if (!settings.lowfx) for (let i = 0; i < 6; i++) { const a = rnd(0, TAU); particles.push({ x: m.x, y: m.y, z: 0.1, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6, vz: rnd(1, 2.2), life: 0.7, img: fx.parts.stardust ? fx.parts.stardust[i % fx.parts.stardust.length] : fx.hit[1], size: 0.06, add: true, grav: true, tint: fx.parts.stardust ? null : [210, 180, 255] }); }
    for (const pr of props) if (pr.ch === 'Ȝ' && !pr.broken && Math.hypot(pr.x - m.x, pr.y - m.y) < m.r) v19HitProp(pr, pr.x, pr.y, 20); }
  v19mets = v19mets.filter(m => !m.done);
  // stjärnportarna
  if (v19ports.length && P.jz < 0.3) { const key = cx + ',' + cy, to = v19PortTo(cx, cy);
    if (to && P.spLock !== key) { const a = P.a; P.x = to.x + 0.5; P.y = to.y + 0.5; P.vx = P.vy = 0; P.spLock = to.x + ',' + to.y; P.a = a; P.iframe = Math.max(P.iframe, 0.3); play('starport', 0.35); flashes.push({ x: P.x, y: P.y, t: 0.2, r: 4, col: [170, 150, 255] }); spawnPuff(P.x, P.y, 6); stat('starports');
      for (let i = 0; i < 12; i++) { const b = i / 12 * TAU; particles.push({ x: P.x + Math.cos(b) * 0.5, y: P.y + Math.sin(b) * 0.5, z: rnd(0, 0.9), vx: -Math.cos(b) * 0.8, vy: -Math.sin(b) * 0.8, vz: 0.4, life: 0.5, maxLife: 0.5, img: fx.parts.stardust ? fx.parts.stardust[i % fx.parts.stardust.length] : fx.hit[1], size: 0.06, add: true, tint: fx.parts.stardust ? null : [200, 180, 255] }); }
      firstHint('starport', 'STJÄRNPORTARNA GÅR I PAR – KLIV I DEN ENA, KOM UT UR DEN ANDRA.'); }
    else if (!to) P.spLock = ''; }
  // gravitationsbrunnar, strålar och tidsgränser
  for (const w of v19wells) { w.t += dt; const d = Math.hypot(w.x - P.x, w.y - P.y); if (d < w.r && d > 0.2) { const k = (1 - d / w.r) * 2.2 * dt; tryMove(P, (w.x - P.x) / d * k, (w.y - P.y) / d * k, 0.24); }
    w.acc = (w.acc || 0) + dt; if (d < 0.9 && w.acc > 0.5) { w.acc = 0; run.cause = 'GRAVITATIONSBRUNNEN'; hurtPlayer(w.dmg || 5, w.x, w.y, 'proj'); } }
  v19wells = v19wells.filter(w => w.t < w.life);
  for (const r of v19rays) r.t -= dt; v19rays = v19rays.filter(r => r.t > 0);
  for (const b of v19beams) b.t -= dt; v19beams = v19beams.filter(b => b.t > 0);
  P.scopeT = Math.max(0, (P.scopeT || 0) - dt); P.v19slowT = Math.max(0, (P.v19slowT || 0) - dt);
  // kolgolemen glöder i eld; gnistlyktan tänder gasen
  for (const e of ents) { if (e.dead) continue;
    if (e.d.ai === 'coalgolem') { const hot = e.burn > 0 || cellAt(e.x, e.y) === '_' || groundFires.some(f => Math.hypot(f.x - e.x, f.y - e.y) < 0.8); if (!e.ownD) { e.d = { ...e.d }; e.ownD = true; e.baseDmg = e.d.dmg; } e.d.dmg = e.baseDmg * (hot ? 1.25 : 1); e.hot = hot; }
    else if (e.d.ai === 'sparkwisp' && cellAt(e.x, e.y) === 'ȗ') v19Ignite(e.x, e.y); }
}
function v19CartHit(dx, dy, dmg, x, y) { // vagnen träffar spelaren: skada och knuff i färdriktningen
  run.cause = 'GRUVVAGNEN'; hurtPlayer(dmg * Math.max(0, 1 - mod('cartResist')), x, y, 'melee'); play('cart_hit', 1.4); P.shake = Math.max(P.shake, 1.4);
  for (let i = 0; i < 10; i++) tryMove(P, dx * 0.12, dy * 0.12, 0.24); P.jv = Math.max(P.jv || 0, 1.2);
  firstHint('cart', 'GRUVVAGNARNA RULLAR LÄNGS RÄLSEN – GÅ ÖVER MELLAN VAGNARNA.');
}
function caveIn(cx, cy) { // taket rasar: skada, och rutan blir en stenbumling
  delete v19caves[cy * mw + cx]; run.cause = 'RASET'; hurtPlayer(12 * trapMul(), cx + 0.5, cy + 0.5, 'proj'); play('cavein', 1); P.shake = Math.max(P.shake, 1.6); spawnPuff(cx + 0.5, cy + 0.5, 12);
  for (let i = 0; i < 8; i++) particles.push({ x: cx + 0.5 + rnd(-0.3, 0.3), y: cy + 0.5 + rnd(-0.3, 0.3), z: 1.1, vx: rnd(-0.6, 0.6), vy: rnd(-0.6, 0.6), vz: -1, life: 1.2, img: fx.parts.rock ? fx.parts.rock[0] : fx.shards[i % 6], size: 0.1, grav: true, bounce: true });
  let to = null; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const x = cx + a + 0.5, y = cy + b + 0.5; if (!solid(x, y) && map[cy + b][cx + a] !== 'Ș') { to = [x, y]; break; } }
  if (!to) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!solid(cx + a + 0.5, cy + b + 0.5)) { to = [cx + a + 0.5, cy + b + 0.5]; break; }
  if (!to) { const s = randomFreeCell(RNG(Date.now())); if (s) to = s; }
  if (to) { P.x = to[0]; P.y = to[1]; P.vx = P.vy = 0; }
  v19Clear(cx, cy); for (const e of ents) if (!e.dead && !e.boss && (e.x | 0) === cx && (e.y | 0) === cy) { const s = freeSpotFar(1, 3); if (s) { e.x = s[0]; e.y = s[1]; } }
  addPropAt('¸', cx, cy); stat('caveins');
}
Object.assign(USES, {
  minecart(pr) { // puffa vagnen: den rullar rakt fram och krossar fiender
    const ax = Math.abs(Math.cos(P.a)) > Math.abs(Math.sin(P.a)), vx = ax ? Math.sign(Math.cos(P.a)) : 0, vy = ax ? 0 : Math.sign(Math.sin(P.a));
    if (solid(pr.x + vx * 0.9, pr.y + vy * 0.9)) { say('VAGNEN KAN INTE RULLA DIT', 1.2); play('click', 0.5, 0.8); return; }
    pr.used = true; pr.broken = true; map[pr.cy][pr.cx] = '.'; flowCell = -1;
    v19loose.push({ x: pr.x, y: pr.y, vx, vy, sp: 7, dist: 0, max: 6, hit: new Set(), boss: false }); play('cart_hit', 0.8, 0.7, { x: pr.x, y: pr.y }); say('VAGNEN RULLAR!', 1);
  },
  orrery(pr) { // vrid planetariet: utgången och hemligheterna syns på kartan
    pr.used = true; P.v19reveal = true; play('orrery_turn', 0.4, 1, { x: pr.x, y: pr.y });
    if (lvl.exit) for (let y = lvl.exit.y - 2; y <= lvl.exit.y + 2; y++) for (let x = lvl.exit.x - 2; x <= lvl.exit.x + 2; x++) if (x >= 0 && y >= 0 && x < mw && y < mh) seen[y * mw + x] = 1;
    if (!showMap) showMap = 1; say('PLANETERNA VISAR UTGÅNGEN OCH HEMLIGHETERNA', 2.5); stat('orreries');
  },
  telescope(pr) { // titta i teleskopet: alla fiender syns på kartan en stund
    pr.used = true; P.scopeT = 20 * (1 + mod('starSight')); play('telescope', 0.35, 1, { x: pr.x, y: pr.y }); say('TELESKOPET VISAR ALLA FIENDER', 2); if (!showMap) showMap = 1;
  },
});
Object.assign(USE_NAME, { minecart: 'PUFFA VAGNEN', orrery: 'VRID PLANETARIET', telescope: 'TITTA I TELESKOPET' });
function v19Map(s, ox, oy, inside) { // planetariet och teleskopet på kartan
  if (P.v19reveal) { for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { const c = map[y][x]; if (!inside(x, y)) continue; if ((c === '*' && doors[x + ',' + y] && doors[x + ',' + y].open === 0) || c === '{') { ctx.fillStyle = tmr % 1 < 0.5 ? '#c060ff' : '#7030a0'; ctx.fillRect(ox + x * s, oy + y * s, s, s); } }
    if (lvl.exit && inside(lvl.exit.x, lvl.exit.y)) { ctx.fillStyle = tmr % 0.6 < 0.3 ? '#60ff60' : '#208020'; ctx.fillRect(ox + lvl.exit.x * s - 1, oy + lvl.exit.y * s - 1, s + 2, s + 2); } }
  if (P.scopeT > 0) for (const e of ents) if (!e.dead && !e.hidden && !e.dormant && inside(e.x | 0, e.y | 0)) { ctx.fillStyle = e.boss || e.guardian ? '#ff60ff' : '#ff4030'; ctx.fillRect(ox + e.x * s - 1, oy + e.y * s - 1, 2, 2); }
}

// ---------- Version 19: gruvans och observatoriets invånare ----------
const AI_V19 = {
  miner(e, dt, dist, los) { // närstrid med hackan, kastar ibland en dynamitstav
    e.dynT = (e.dynT ?? rnd(3, 6)) - dt;
    if (e.dynT <= 0 && los && dist > 3 && dist < 9 && e.state !== 'pain' && e.state !== 'attack') { e.dynT = rnd(6, 9); e.state = 'attack'; e.t = 0; e.didHit = true; lobShot(e, P.x + P.vx * 0.6, P.y + P.vy * 0.6, { dmg: e.d.dmg * 1.2, r: 1.5, T: 1.1, kind: 'cball' }); play('dynamite_fuse', 1, 1.1, { x: e.x, y: e.y }); firstHint('miner', 'GRUVARBETAREN KASTAR DYNAMIT – SPRING UR RINGEN.'); return true; }
    return false;
  },
  coalgolem(e) { if (e.hot && !settings.lowfx && Math.random() < 0.2) particles.push({ x: e.x + rnd(-0.3, 0.3), y: e.y + rnd(-0.3, 0.3), z: rnd(0.2, 1), vx: 0, vy: 0, vz: 0.6, life: 0.6, maxLife: 0.6, img: fx.parts.ember ? fx.parts.ember[0] : fx.hit[1], size: 0.05, add: true, tint: [255, 140, 50] }); return false; },
  moleman(e, dt, dist) { // gräver ned sig och kommer upp bredvid dig
    e.wst = e.wst || 'up'; e.wt = (e.wt || 0) + dt;
    if (e.wst === 'under') { e.hidden = true; e.state = 'idle';
      const a = Math.atan2(P.y - e.y, P.x - e.x), sp = e.d.speed * dt * 1.4, ox = e.x, oy = e.y; tryMove(e, Math.cos(a) * sp, Math.sin(a) * sp, 0.25); e.mvx = e.x - ox; e.mvy = e.y - oy;
      if (!settings.lowfx && Math.random() < dt * 10) particles.push({ x: e.x + rnd(-0.2, 0.2), y: e.y + rnd(-0.2, 0.2), z: 0.02, vx: rnd(-0.5, 0.5), vy: rnd(-0.5, 0.5), vz: 0.8, life: 0.5, maxLife: 0.5, img: fx.parts.dirt ? fx.parts.dirt[0] : fx.hit[1], size: 0.05, grav: true, tint: fx.parts.dirt ? null : [120, 90, 70] });
      if ((dist < 1.8 && e.wt > 1) || e.wt > 5) { e.wst = 'warn'; e.wt = 0; const a2 = P.a + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1); e.tx = P.x + Math.cos(a2) * 0.9; e.ty = P.y + Math.sin(a2) * 0.9; if (solid(e.tx, e.ty)) { e.tx = P.x; e.ty = P.y; } play('moleman', 0.5, 1.2, { x: e.x, y: e.y }); }
      return true; }
    if (e.wst === 'warn') { e.hidden = true; if (!settings.lowfx && Math.random() < dt * 25) particles.push({ x: e.tx + rnd(-0.4, 0.4), y: e.ty + rnd(-0.4, 0.4), z: 0.02, vx: 0, vy: 0, vz: 1, life: 0.4, maxLife: 0.4, img: fx.parts.dirt ? fx.parts.dirt[0] : fx.hit[1], size: 0.06, grav: true, tint: fx.parts.dirt ? null : [130, 100, 70] });
      if (e.wt > 0.5) { e.wst = 'up'; e.wt = 0; e.x = e.tx; e.y = e.ty; e.hidden = false; e.state = 'attack'; e.t = 0; e.didHit = true; play('moleman', 0.8, 1, { x: e.x, y: e.y }); spawnPuff(e.x, e.y, 6); P.shake = Math.max(P.shake, 0.6);
        if (Math.hypot(P.x - e.x, P.y - e.y) < 1.2) { run.cause = e.d.name; hurtPlayer(e.d.dmg * 1.2, e.x, e.y, 'melee'); } firstHint('moleman', 'MULLVADSMANNEN KOMMER UPP BREDVID DIG – SE EFTER JORDEN SOM RÖR SIG.'); }
      return true; }
    if (e.wt > 3.2 && e.state !== 'attack' && e.alert) { e.wst = 'under'; e.wt = 0; spawnPuff(e.x, e.y, 5); play('moleman', 0.4, 0.8, { x: e.x, y: e.y }); }
    return false;
  },
  sparkwisp(e, dt, dist) { // flyger mot dig och exploderar svagt
    if (dist < 0.75 && !e.popped) { e.popped = true; play('sparkwisp', 0.8, 1.3, { x: e.x, y: e.y }); explode(e.x, e.y, 6, 1.3, false, false); if (Math.hypot(P.x - e.x, P.y - e.y) < 1.3) { run.cause = e.d.name; hurtPlayer(e.d.dmg * Math.max(0, 1 - mod('blastResist')), e.x, e.y, 'proj'); } v19Ignite(e.x, e.y); hurtEnemy(e, 9999, e.x, e.y, { noProc: true, boom: true }); return true; }
    if (e.state === 'move') { const a = Math.atan2(P.y - e.y, P.x - e.x) + Math.PI / 2, w = Math.sin(e.t * 7 + e.x * 3) * dt * 1.6; tryMove(e, Math.cos(a) * w, Math.sin(a) * w, 0.15); }
    return false;
  },
  starspawn(e, dt, dist, los) { // stjärnskott som delar sig i tre
    e.cd = 99; e.shootT = (e.shootT ?? rnd(1.2, 2.4)) - dt;
    if (e.state === 'attack') { if (e.t > 0.5) { e.state = 'move'; e.t = 0; } return true; }
    if (e.shootT <= 0 && los && dist < 10 && e.state !== 'pain') { e.shootT = rnd(2.4, 3.2); e.state = 'attack'; e.t = 0; e.didHit = true; v18Shoot(e, Math.atan2(P.y - e.y, P.x - e.x), 5.5, e.d.dmg, 'estar', { split: 0.55, life: 4 }); play('starspawn', 0.28, rnd(0.95, 1.1), { x: e.x, y: e.y }); firstHint('starspawn', 'STJÄRNFÖDDENS SKOTT DELAR SIG I TRE – GÅ NÄRA ELLER TA SKYDD.'); return true; }
    return false;
  },
  astronomer(e, dt, dist, los) { // håller avstånd och kallar ned små meteorer
    e.cd = 99; e.callT = (e.callT ?? rnd(1.5, 3)) - dt;
    if (e.state === 'attack') { if (e.t > 0.7) { e.state = 'move'; e.t = 0; } return true; }
    if (e.callT <= 0 && los && dist < 11 && e.state !== 'pain') { e.callT = rnd(3.2, 4.4); e.state = 'attack'; e.t = 0; e.didHit = true; v19Meteor(P.x + P.vx * 0.4, P.y + P.vy * 0.4, { dmg: e.d.dmg, r: 1.0, warn: 1.1, cause: e.d.name, small: true }); play('astronomer', 0.5, 1, { x: e.x, y: e.y }); firstHint('astronomer', 'ASTRONOMEN KALLAR NED METEORER DÄR DU STÅR – RÖR DIG.'); return true; }
    return false;
  },
  clockowl(e, dt, dist, los) { return v18Leap(e, dt, dist, los, { sp: 9, max: 7, dur: 0.6 }); },
  voidwatcher(e, dt, dist, los) { // stråle av stjärnkyla som saktar ned
    e.cd = 99;
    if (e.beam) { const b = e.beam; b.t += dt; e.state = b.t < b.warn ? 'idle' : 'attack'; e.t = Math.min(e.t, 0.3);
      let d = Math.atan2(P.y - e.y, P.x - e.x) - b.a; d = Math.atan2(Math.sin(d), Math.cos(d)); if (b.t > b.warn) b.a += clamp(d, -0.4 * dt, 0.4 * dt);
      const L = cast(e.x, e.y, Math.cos(b.a), Math.sin(b.a), 11).dist; v19beams.push({ x: e.x, y: e.y, a: b.a, L, warn: b.t < b.warn, t: 0.02 });
      if (b.t > b.warn) { b.acc += dt; if (b.acc >= 0.25) { b.acc = 0; const rx = P.x - e.x, ry = P.y - e.y, along = rx * Math.cos(b.a) + ry * Math.sin(b.a), perp = Math.abs(rx * Math.sin(b.a) - ry * Math.cos(b.a)); if (along > 0 && along < L && perp < 0.45) { run.cause = e.d.name; hurtPlayer(e.d.dmg * 0.35, e.x, e.y, 'proj'); if (!(P.v19slowT > 0)) play('ice_crack', 0.4, 1.4); P.v19slowT = 2; } } }
      if (b.t > b.warn + 0.9) { e.beam = null; e.state = 'move'; e.t = 0; } return true; }
    e.rayT = (e.rayT ?? rnd(1.5, 2.5)) - dt;
    if (e.rayT <= 0 && los && dist < 9 && e.state !== 'pain') { e.rayT = rnd(3.4, 4.4); e.beam = { t: 0, warn: 0.6, a: Math.atan2(P.y - e.y, P.x - e.x), acc: 0 }; play('voidwatcher', 0.6, 1, { x: e.x, y: e.y }); firstHint('voidwatcher', 'TOMRUMSVÄKTARENS STRÅLE GÖR DIG LÅNGSAM – GÅ ÅT SIDAN.'); return true; }
    return false;
  },
};
function v19EProj(p, dt) { // stjärnskott: delar sig i tre efter en stund
  if (p.kind === 'estar' && p.split !== undefined && (p.split -= dt) <= 0) { p.dead = true; const a = Math.atan2(p.vy, p.vx), sp = Math.hypot(p.vx, p.vy) * 1.1; for (const o of [-0.35, 0, 0.35]) projectiles.push({ x: p.x, y: p.y, z: 0.5, vx: Math.cos(a + o) * sp, vy: Math.sin(a + o) * sp, dmg: p.dmg * 0.6, src: p.src, kind: 'estar', life: 2.5, cause: p.cause }); sparks(p.x, p.y, 0.5, 3); return; }
  v18EProj(p, dt);
}
Object.assign(PROJ_UPD_V8, { estar: v19EProj, eowl: v18EProj });
Object.assign(PROJ_DRAW_V8, {
  estar: o => drawSprite(fx.parts.stardust ? fx.parts.stardust[Math.floor(tmr * 12) % fx.parts.stardust.length] : fx.hit[1], o.x, o.y, o.split !== undefined ? 0.14 : 0.09, o.z - 0.05, false, 2, 0, 0, true, fx.parts.stardust ? null : [210, 160, 255]),
  eowl: o => drawSprite(fx.hit[1], o.x, o.y, 0.08, o.z - 0.04, false, 2, 0, 0, true, [255, 220, 140]),
});
function v19Defend(e, dmg, opt) { // urverksugglan reflekterar ibland ett skott
  if (e.d.ai === 'clockowl' && !opt.noProc && !opt.boom && !opt.fall && !opt.melee && !opt.infight && Math.random() < 0.2) { spawnText(e.x, e.y, 'REFLEKTERAR', '#ffe0a0'); play('parry', 0.5, 1.4, { x: e.x, y: e.y }); v18Shoot(e, Math.atan2(P.y - e.y, P.x - e.x), 9, 5, 'eowl', { life: 2 }); return null; }
  return dmg;
}
function v19Kill(e) {
  if (e.d.ai === 'coalgolem') { play('fireburst', 0.8, 0.8, { x: e.x, y: e.y }); explode(e.x, e.y, 6, 1.6, false, false); if (Math.hypot(P.x - e.x, P.y - e.y) < 1.6) { run.cause = e.d.name; hurtPlayer(8 * Math.max(0, 1 - mod('blastResist')), e.x, e.y, 'proj'); }
    for (let i = 0; i < 4; i++) { const a = rnd(0, TAU), r = rnd(0.2, 1); if (!solid(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r)) groundFires.push({ x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r, t: 2, acc: 0 }); }
    if (!settings.lowfx) for (let i = 0; i < 8; i++) particles.push({ x: e.x, y: e.y, z: 0.6, vx: rnd(-1.5, 1.5), vy: rnd(-1.5, 1.5), vz: rnd(0.5, 2), life: 1, img: fx.parts.coal ? fx.parts.coal[i % fx.parts.coal.length] : fx.shards[i % 6], size: 0.08, grav: true, bounce: true }); }
  if (e.d.ai === 'voidwatcher' || e.d.ai === 'starspawn') { e.beam = null; if (!settings.lowfx) for (let i = 0; i < 8; i++) { const a = rnd(0, TAU); particles.push({ x: e.x, y: e.y, z: 0.6, vx: Math.cos(a), vy: Math.sin(a), vz: rnd(0, 1), life: 0.8, maxLife: 0.8, img: fx.parts.stardust ? fx.parts.stardust[i % fx.parts.stardust.length] : fx.hit[1], size: 0.06, add: true }); } }
}
function drawV19Hud(g) {
  if (P.gasT > 0) { g.fillStyle = `rgba(120,170,60,${0.12 + 0.04 * Math.sin(tmr * 3)})`; g.fillRect(0, 0, W, VH); if (hudImg.icon_gas) g.drawImage(hudImg.icon_gas, 134, VH - 22, 8, 8); }
  if (P.lowGT > 0 && hudImg.icon_lowgrav) g.drawImage(hudImg.icon_lowgrav, 146, VH - 22, 8, 8);
  if (P.v19slowT > 0) { const gr = g.createRadialGradient(W / 2, HORIZON, VH * 0.25, W / 2, HORIZON, W * 0.6); gr.addColorStop(0, 'rgba(80,60,160,0)'); gr.addColorStop(1, `rgba(80,60,160,${0.4 * Math.min(1, P.v19slowT)})`); g.fillStyle = gr; g.fillRect(0, 0, W, VH); }
  // teleskopet visas som "TE" med nedräkningsstapel i effektraden (drawFxRow)
  if (WEAPONS[P.weapon].starlance && WS.lcharge > 0) { const k = WS.lcharge / 1.2, w = 40, x = (W - w) / 2, y = HORIZON + 22; g.fillStyle = '#000a'; g.fillRect(x - 1, y - 1, w + 2, 4); g.fillStyle = WS.lcharge < 0.2 ? '#806080' : k >= 1 ? '#ffffff' : '#c0a0ff'; g.fillRect(x, y, w * k, 2); }
  if (c19ing()) { g.fillStyle = `rgba(255,220,160,${0.08 + 0.08 * Math.sin(tmr * 20)})`; g.fillRect(0, 0, W, VH); }
}
const c19ing = () => { const k = (P.y | 0) * mw + (P.x | 0); return (v19caves[k] || 0) > 0.2; };
function drawV19World(list) {
  for (const k of v19carts) if (Math.hypot(k.x - P.x, k.y - P.y) < 24) list.push({ x: k.x, y: k.y, k: 'v19', t: 'cart', o: k });
  for (const v of v19loose) list.push({ x: v.x, y: v.y, k: 'v19', t: 'cart', o: v });
  for (const m of v19mets) { list.push({ x: m.x, y: m.y, k: 'v19', t: 'ring', o: m }); if (Math.hypot(m.x + (1 - m.t / m.warn) * 1.5 - P.x, m.y - P.y) > 1.2) list.push({ x: m.x + (1 - m.t / m.warn) * 1.5, y: m.y, k: 'v19', t: 'met', o: m }); }
  for (const w of v19wells) list.push({ x: w.x, y: w.y, k: 'v19', t: 'well', o: w });
  for (const r of v19rays) { const n = Math.min(40, Math.ceil(r.L / 0.3)); for (let i = 1; i < n; i++) { const k = i / n; if (r.L * k < 0.9) continue; list.push({ x: r.x + Math.cos(r.a) * r.L * k, y: r.y + Math.sin(r.a) * r.L * k, k: 'v19', t: 'ray', o: r }); } }
  for (const b of v19beams) { const n = Math.min(30, Math.ceil(b.L / 0.35)); for (let i = 1; i < n; i++) { const k = i / n; list.push({ x: b.x + Math.cos(b.a) * b.L * k, y: b.y + Math.sin(b.a) * b.L * k, k: 'v19', t: 'beam', o: b }); } }
  for (const e of ents) if (e.beam && !e.dead && e.d.ai === 'voidwatcher' && e.beam.t < e.beam.warn) list.push({ x: e.x, y: e.y, k: 'v19', t: 'eye', o: e });
}
function drawV19Sprite(s) {
  const o = s.o;
  if (s.t === 'cart') { const f = fx.props.minecart; drawSprite(f ? f[Math.min(f.length - 1, 1)] : fx.shards[7], o.x, o.y, 0.85, 0, Math.abs(o.dx ?? o.vx) < 0.5 ? false : (o.dx ?? o.vx) < 0, null, 0, 0.35, false, f ? null : [130, 100, 80]); return true; }
  if (s.t === 'ring') { const k = o.t / o.warn, n = 12; for (let i = 0; i < n; i++) { const a = i / n * TAU + tmr; drawSprite(fx.hit[1], o.x + Math.cos(a) * o.r * 0.85, o.y + Math.sin(a) * o.r * 0.85, 0.09, 0.01, false, 1.8, 0, 0, true, k > 0.7 ? [255, 120, 80] : [200, 170, 255]); } return true; }
  if (s.t === 'met') { const k = 1 - o.t / o.warn, f = fx.parts.meteor2 || fx.parts.meteor; drawSprite(f ? f[Math.floor(tmr * 10) % f.length] : fx.fireball[0], s.x, s.y, o.small ? 0.25 : 0.35, k * 3.5, false, 2.2, 0, 0.5, true); return true; }
  if (s.t === 'well') { const n = 14; for (let i = 0; i < n; i++) { const a = i / n * TAU - tmr * 2.5, r = o.r * (0.35 + 0.65 * ((i * 0.37 + tmr * 0.8) % 1)); drawSprite(fx.parts.stardust ? fx.parts.stardust[i % fx.parts.stardust.length] : fx.hit[1], o.x + Math.cos(a) * r, o.y + Math.sin(a) * r, 0.07, 0.05, false, 2, 0, 0, true, fx.parts.stardust ? null : [170, 120, 255]); } drawSprite(fx.hit[1], o.x, o.y, 0.25, 0.02, false, 2, 0, 0, true, [120, 80, 220]); return true; }
  if (s.t === 'ray') { const k = o.t / o.max; drawSprite(fx.parts.laser ? fx.parts.laser[0] : fx.hit[1], s.x, s.y, o.w * (0.5 + 0.5 * k), 0.47, false, 2.4, 0, 0, true, [200, 180, 255]); return true; }
  if (s.t === 'beam') { drawSprite(fx.parts.laser ? fx.parts.laser[0] : fx.hit[1], s.x, s.y, o.warn ? 0.06 : 0.15, 0.6, false, o.warn ? 1.2 : 2.2, 0, 0, true, o.warn ? [150, 140, 255] : [110, 90, 255]); return true; }
  if (s.t === 'eye') { const k = o.beam.t / o.beam.warn; drawSprite(fx.hit[1], o.x, o.y, 0.08 + 0.14 * k, o.d.size * 0.55, false, 2.4, 0, 0, true, [140, 120, 255]); return true; }
  return false;
}

// ---------- Version 19: Gruvförmannen och Stjärnskådaren ----------
Object.assign(BOSS_AI, {
  foreman(b, dt, dist, ang, ph) { // slägga, dynamit och gruvvagnar
    const fast = ph === 3 ? 1.25 : 1;
    if (b.state === 'idle') b.once19 = false;
    if (b.state === 'sledge') { if (!b.didHit && b.t > 0.5) { b.didHit = true; play('pickaxe_hit', 1.2, 0.6); P.shake = Math.max(P.shake, 1.6); spawnPuff(b.x + Math.cos(ang) * 1.5, b.y + Math.sin(ang) * 1.5, 10);
        if (dist < (b.d.range || 2.4) + 1.2 && hasLOS(b.x, b.y, P.x, P.y) && P.jz < 0.4) { run.cause = b.d.name; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); for (let i = 0; i < 6; i++) tryMove(P, Math.cos(ang) * 0.12, Math.sin(ang) * 0.12, 0.24); } }
      if (b.t > 0.95) { b.state = 'idle'; b.t = 0; b.cd = rnd(0.9, 1.3) / fast; } return; }
    if (b.state === 'throw') { if (b.shots < (ph >= 2 ? 3 : 2) && b.t > 0.3 + b.shots * 0.3) { b.shots++; lobShot(b, P.x + P.vx * 0.6 + rnd(-1.5, 1.5) * (b.shots > 1), P.y + P.vy * 0.6 + rnd(-1.5, 1.5) * (b.shots > 1), { dmg: b.d.dmg * 0.7, r: 1.6, T: 1.0, kind: 'cball' }); play('dynamite_fuse', 1.1, 1); }
      if (b.t > 1.3) { b.state = 'idle'; b.t = 0; b.cd = 0.9 / fast; } return; }
    b.cd -= dt;
    if (b.cd <= 0) { b.t = 0; b.didHit = false; const los = hasLOS(b.x, b.y, P.x, P.y);
      if (los && dist < 4) { b.state = 'sledge'; bossWarn(b, 'FÖRMANNEN HÖJER SLÄGGAN!'); play('foreman_shout', 0.8); }
      else if (los) { b.state = 'throw'; b.shots = 0; } else b.cd = 0.4;
      return; }
    if (dist > 3.5) bossMove(b, ang, b.d.speed * fast * dt); else bossMove(b, ang + Math.PI / 2, b.d.speed * dt * 0.6);
  },
  starseer(b, dt, dist, ang, ph) { // stjärnbilder, meteorer, gravitationsbrunnar och stjärnportar
    const fast = ph === 3 ? 1.25 : 1;
    if (b.state === 'idle') b.once19 = false;
    if (b.state !== 'blink') b.hidden = false;
    if (b.state === 'bolt') { if (b.shots < 3 && b.t > 0.3 + b.shots * 0.28) { b.shots++; const n = ph >= 2 ? 5 : 3; for (let i = 0; i < n; i++) v18Shoot(b, ang + (i - (n - 1) / 2) * 0.2, 6.5, b.d.dmg * 0.4, 'estar', { life: 3.5 }); play('starspawn', 0.4, 0.8); }
      if (b.t > 1.3) { b.state = 'idle'; b.t = 0; b.cd = rnd(0.8, 1.2) / fast; } return; }
    if (b.state === 'well') { if (!b.once19) { b.once19 = true; v19wells.push({ x: P.x, y: P.y, t: 0, life: 4, r: 3.6, dmg: b.d.dmg * 0.3 }); bossWarn(b, 'STJÄRNSKÅDAREN ÖPPNAR EN GRAVITATIONSBRUNN!'); play('starseer_chant', 0.7); }
      if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.8 / fast; } return; }
    if (b.state === 'blink') { if (!b.once19) { b.once19 = true; b.hidden = true; spawnPuff(b.x, b.y, 10); play('starport', 0.4, 0.8); }
      if (b.t > 0.6) { let to = null; const ends = v19ports.flatMap(t => [t.a, t.b]).filter(e => Math.hypot(e.x + 0.5 - P.x, e.y + 0.5 - P.y) > 4 && Math.hypot(e.x + 0.5 - b.x, e.y + 0.5 - b.y) < 10 && hasLOS(b.x, b.y, e.x + 0.5, e.y + 0.5) && freeSpot(e.x + 0.5, e.y + 0.5, 0.6)); // bara portar i samma rum if (ends.length) { const e = ends[(Math.random() * ends.length) | 0]; to = [e.x + 0.5, e.y + 0.5]; } else to = freeSpotFar(4, 7) || freeSpotFar(2.5, 9);
        for (let i = 0; i < 60 && !to; i++) { const a = rnd(0, TAU), r = rnd(3, 7), x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r; if (freeSpot(x, y, 0.6) && hasLOS(b.x, b.y, x, y) && Math.hypot(x - P.x, y - P.y) > 2.5) to = [x, y]; }
        if (to) { b.x = to[0]; b.y = to[1]; } b.hidden = false; spawnPuff(b.x, b.y, 10); flashes.push({ x: b.x, y: b.y, t: 0.2, r: 4, col: [170, 150, 255] }); b.state = 'idle'; b.t = 0; b.cd = 0.5; } return; }
    b.cd -= dt;
    if (b.cd <= 0) { b.t = 0; b.didHit = false; const los = hasLOS(b.x, b.y, P.x, P.y), r = Math.random();
      if (dist < 3 && (b.blinkCd || 0) < tmr) { b.state = 'blink'; b.blinkCd = tmr + 4; }
      else if (r < 0.3 && (b.wellCd || 0) < tmr) { b.state = 'well'; b.wellCd = tmr + 7; }
      else if (los) { b.state = 'bolt'; b.shots = 0; } else { b.state = 'blink'; b.blinkCd = tmr + 4; }
      return; }
    if (dist > 6) bossMove(b, ang, b.d.speed * fast * dt); else bossMove(b, ang + Math.PI / 2, b.d.speed * dt * 0.7);
  },
});
Object.assign(BOSS_SPECIAL, {
  foreman(b, dt, dist, ang, ph) {
    if (b.spK) { // ras i taket runt dig
      if (!b.once19) { b.once19 = true; bossWarn(b, 'TAKET RASAR!'); play('cavein', 1); play('foreman_shout', 0.7, 0.9); for (let i = 0; i < 4 + ph * 2; i++) { const a = rnd(0, TAU), r = i ? rnd(0.8, 3.5) : 0; fallHazard(P.x + Math.cos(a) * r, P.y + Math.sin(a) * r, 'rockfall', b.d.dmg * 0.6, 0.9 + i * 0.1); } }
      if (b.t > 1.3) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return;
    }
    if (!b.once19) { b.once19 = true; bossWarn(b, 'FÖRMANNEN SLÄPPER GRUVVAGNARNA!'); play('foreman_laugh', 0.9); // vagnar rakt mot dig
      for (let i = 0; i < 1 + ph; i++) { const a = ang + (i - ph / 2) * 0.35, x = b.x + Math.cos(a) * 1.6, y = b.y + Math.sin(a) * 1.6; if (solid(x, y)) continue; v19loose.push({ x, y, vx: Math.cos(a), vy: Math.sin(a), sp: 6.5, dist: 0, max: 16, hit: new Set(), boss: true }); } }
    if (b.t > 1) { b.state = 'idle'; b.t = 0; b.cd = 0.7; }
  },
  starseer(b, dt, dist, ang, ph) {
    b.hidden = false; // ett avbrutet språng mellan portarna lämnar henne aldrig osynlig
    if (b.spK) { // meteorregn
      if (!b.once19) { b.once19 = true; bossWarn(b, 'STJÄRNORNA FALLER!'); play('starseer_chant', 0.8); for (let i = 0; i < 4 + ph * 2; i++) { const a = rnd(0, TAU), r = i ? rnd(0.8, 4.5) : 0; v19Meteor(P.x + Math.cos(a) * r, P.y + Math.sin(a) * r, { dmg: b.d.dmg * 0.8, r: 1.2, warn: 1 + i * 0.12, cause: b.d.name }); } }
      if (b.t > 1.4) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return;
    }
    if (!b.once19) { b.once19 = true; say('STJÄRNBILDERNA VAKNAR', 1.5); play('starseer_laugh', 0.8); for (let i = 0; i < 1 + ph; i++) { const s = freeSpotFar(3, 6); if (!s) continue; const t = ENEMY_DEFS['ȥ'] && enemyFrames['ȥ'] ? 'ȥ' : 'X', e = makeEnemy(t, s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 8); } }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
});
TAUNTS.foreman = ['TILLBAKA TILL ARBETET!', 'GRUVAN TAR ALLA TILL SLUT', 'DU BLIR KVAR HÄR NERE'];
TAUNTS.starseer = ['STJÄRNORNA HAR FÖRUTSAGT DIN DÖD', 'TITTA UPP...', 'DU ÄR BARA STOFT'];

