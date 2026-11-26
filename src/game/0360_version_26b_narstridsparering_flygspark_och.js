// ---------- Version 26B: närstridsparering, flygspark och granatretur (V26B) ----------
// PARERING (ULTRAKILL, Cultic, Worch): närstridsfiendens slag syns komma. De sista V26B.win sekunderna före träffen blinkar fienden gult
// och en gul romb visas ovanför den (går att parera), eller blått med ett blått kryss (går inte: explosiva eliter, orkkrigarens stormning
// och det tända bombskelettet; bossar och väktare går genom updateBoss och får ingen markering). Med FÄRGBLIND eller INGA BLIXTAR blinkar inget:
// ljuset lyser fast och formen blir större. En spark inom 1,6 rutor framför dig i fönstret parerar: slaget uteblir, vanliga fiender
// vacklar (nästa spark avrättar), eliter och champions bedövas bara 1,2 s. +10 överhälsa, träffstopp och +PARERING. Ett kort "ting"
// hörs när ett parerbart slag laddas (hjälper den som inte ser färgen eller fienden).
// FLYGSPARK (Boltgun): sparkar du mot en vacklande fiende under hårkorset på 1,6–4,5 rutor kastar du dig fram (högst 0,35 s, osårbar,
// stannar vid väggar och stängda dörrar) och sparken vid ankomsten avrättar. 1,2 s nedkylning och 0,3 uthållighet; annars vanlig spark.
// GRANATRETUR (HROT, Cultic): en landad R25-granat inom 1,5 rutor framför dig, eller en lobb (kanonkula, eldkruka) som håller på att landa,
// sparkas tillbaka mot kastaren (mot hårkorset om kastaren är död) och smäller med full skada mot fiender.
// Av: __game.v26b.set('on' | 'parry' | 'lunge' | 'ret', false). Markeringen: settings.parryTell = false (C lägger den i inställningarna).
const V26B = { on: true, parry: true, lunge: true, ret: true, win: 0.25, L: null, lcd: 0, img: null,
  st: { tells: 0, blue: 0, parries: 0, stuns: 0, drawn: 0, lunges: 0, lungeExec: 0, lungeBlocked: 0, rets: 0, lobRets: 0, retBooms: 0, err: null } };
function v26bCanParry(e) { return !!e.d.melee && !e.boss && !e.guardian && e.d.ai !== 'charge' && e.d.ai !== 'bomb' && !hasMod(e, 'explosive'); }
function v26bAtk(e, dur) { // från updateEnemy (det vanliga anfallet, varje bildruta): när slaget träffar, och "ting" när ett parerbart slag laddas
  if (!V26B.on || !e.d.melee || e.didHit) return;
  e.v26w = tmr; e.v26h = tmr + dur * e.d.hitAt - e.t;
  if (e.v26h - tmr > V26B.win || Math.abs((e.v26tg ?? -9) - e.v26h) < 0.1) return;
  e.v26tg = e.v26h; const d = Math.hypot(e.x - P.x, e.y - P.y);
  if (!V26B.parry) return;
  if (v26bCanParry(e)) { V26B.st.tells++; if (d < 8) play('parry', 0.25, 2, { x: e.x, y: e.y }); if (d < 3) firstHint('parry26', 'GUL BLINK OCH ROMB: SPARKA PRECIS FÖRE SLAGET SÅ PARERAR DU. BLÅTT KRYSS GÅR INTE ATT PARERA.'); }
  else V26B.st.blue++;
}
function v26bWin(e) { // 0 = inget, 1 = parerbart slag på väg, 2 = slag som inte går att parera
  if (!V26B.on || !V26B.parry || !e || e.dead || e.dying || e.hidden || !e.d) return 0;
  if (e.boss) return v26bBossWin(e); // bossar och väktare (updateBoss): egen tabell
  if (e.d.ai === 'bomb' && e.lit !== undefined) return 2;
  if (e.d.ai === 'charge' && e.charge > 0) return 2;
  if (e.state !== 'attack' || e.didHit || !(tmr - (e.v26w ?? -9) < 0.12)) return 0;
  const left = e.v26h - tmr; if (left > V26B.win || left < -0.06) return 0;
  return v26bCanParry(e) ? 1 : 2;
}
function v26bKick() { // från kick(): parera närstridsslag och sparka tillbaka granater; en Set med de parerade (null = inget hände)
  if (!V26B.on) return null;
  let out = null;
  try {
    if (V26B.parry) for (const e of ents) {
      const w = v26bWin(e); if (!w) continue;
      const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
      if (e.boss ? d > 2 + e.d.size * 0.3 || Math.abs(off) > Math.max(0.8, Math.atan2(e.d.size * 0.25, d)) : d > 1.6 + e.d.size * 0.3 || Math.abs(off) > 0.8) continue; // bossen är bred
      if (w === 1 && e.boss) { (out || (out = new Set())).add(e); v26bBossParry(e); }
      else if (w === 1) { (out || (out = new Set())).add(e); v26bParry(e); }
      else if (e.state === 'attack' && !e.didHit && e.d.melee) { e.didHit = true; V26B.st.trades = (V26B.st.trades || 0) + 1; enemyStrike(e, d); } // blått: sparken avbryter inte slaget – det träffar ändå
    }
    if (V26B.ret && v26bReturn()) out = out || new Set();
  } catch (err) { V26B.st.err = String((err && err.stack) || err).slice(0, 400); }
  return out;
}
function v26bParry(e) { // slaget uteblir; vanliga fiender vacklar, eliter och champions bedövas bara
  e.didHit = true; e.v26pT = tmr + 0.5; e.state = 'pain'; e.t = 0; e.cd = Math.max(e.cd || 0, 0.8);
  if (e.elite || e.champion) { e.stun = Math.max(e.stun || 0, 1.2); V26B.st.stuns++; spawnText(e.x, e.y, 'BEDÖVAD', '#ffe9a8'); }
  else { e.staggerT = Math.max(e.staggerT || 0, tmr + 2.4); e.stun = Math.max(e.stun || 0, 1.3); spawnText(e.x, e.y, 'VACKLAR', '#80e0ff'); }
  V26B.st.parries++; overheal(10); hitStop = Math.max(hitStop, 0.1); P.shake = Math.max(P.shake, 0.8); play('parry', 0.9, 1.0);
  if (!settings.noFlash) flashes.push({ x: P.x, y: P.y, t: 0.12, r: 3, col: [255, 240, 200] });
  spawnText(P.x + Math.cos(P.a), P.y + Math.sin(P.a), 'PARERAT! +10', '#ffe9a8'); styleAdd(12, '+PARERING'); stat('parries');
}
function v26bLunge() { // från kick(): true = flygsparken tog över (eller pågår redan)
  if (!V26B.on || !V26B.lunge) return false;
  if (V26B.L) return true;
  if (V26B.lcd > tmr || P.stam < 0.3 || P.rootT > 0) return false;
  let best = null, bd = 9;
  for (const e of ents) {
    if (!canExec(e) || e.hidden || e.dormant || !e.d) continue;
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy);
    if (d <= 1.5 + e.d.size * 0.3 || d > 4.5 || d >= bd) continue;
    let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
    if (Math.abs(off) > Math.max(0.12, 0.4 * e.d.size / d) || !hasLOS(P.x, P.y, e.x, e.y)) continue;
    let safe = true; for (let s = 0.5; s < d - 0.4 && safe; s += 0.25) safe = walkableForEnemy((P.x + dx / d * s) | 0, (P.y + dy / d * s) | 0); // inte över tomrum, djupt vatten, lava eller rekvisita
    if (!safe) continue;
    best = e; bd = d;
  }
  if (!best) return false;
  V26B.L = { e: best, t: 0 }; V26B.lcd = tmr + 1.2; P.stam -= 0.3; P.stamT = 0.9; P.kickT = 0.6; P.iframe = Math.max(P.iframe, 0.4); P.dashHit = new Set(); // dashHits() körs medan P.dashT > 0
  best.staggerT = Math.max(best.staggerT, tmr + 0.6); V26B.st.lunges++; play('dash', 0.6, 1.25); play('whoosh', 0.5, 0.8); WS.punch = Math.max(WS.punch || 0, 0.05);
  return true;
}
function v26bLungeTick(dt) { // flygsparken: i små steg mot målet; vid ankomst (eller vägg, eller 0,35 s) körs sparken
  const L = V26B.L; if (!L) return;
  if (state !== 'play' || !P) { V26B.L = null; return; }
  const e = L.e, reach = 0.8 + e.d.size * 0.3; L.t += dt; P.vx = P.vy = 0; P.dashT = Math.max(P.dashT, 0.05);
  let end = e.dead || e.dying || L.t > 0.35, blocked = false;
  if (!end) {
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy) || 1; let go = Math.min(Math.max(0, d - reach), 22 * dt);
    while (go > 1e-4) { const s = Math.min(0.2, go), ox = P.x, oy = P.y; tryMove(P, dx / d * s, dy / d * s, 0.24); go -= s; if (Math.hypot(P.x - ox, P.y - oy) < s * 0.3) { blocked = true; break; } }
    if (blocked || Math.hypot(e.x - P.x, e.y - P.y) <= reach + 0.02) end = true;
  }
  if (!end) return;
  V26B.L = null; P.dashT = 0; P.kickT = 0; if (blocked) V26B.st.lungeBlocked++;
  const was = !e.dead; kick(); if (was && e.dead) V26B.st.lungeExec++;
}
function v26bAlive(s) { return !!s && !s.dead && !s.dying && s.x !== undefined; }
function v26bAim(x0, y0) { return lobClip(x0, y0, P.x + Math.cos(P.a) * 7, P.y + Math.sin(P.a) * 7); } // kastaren är död: mot hårkorset
function v26bReturn() { // R25-granater som landat och lobbar som håller på att landa sparkas tillbaka mot kastaren
  let n = 0;
  const front = (x, y, r) => { const dx = x - P.x, dy = y - P.y, d = Math.hypot(dx, dy); if (d > r) return false; if (d < 0.35) return true; let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off)); return Math.abs(off) < 1.0; };
  if (R25.active) for (const g of R25.live) {
    if (g.ph !== 1 || g.ret || g.done || !front(g.tx, g.ty, 1.5)) continue;
    const s = v26bAlive(g.src) ? g.src : null, [tx, ty] = s ? lobClip(g.tx, g.ty, s.x, s.y) : v26bAim(g.tx, g.ty);
    g.x0 = g.tx; g.y0 = g.ty; g.tx = tx; g.ty = ty; g.ph = 0; g.t = 0; g.T = clamp(0.35 + Math.hypot(tx - g.x0, ty - g.y0) * 0.05, 0.4, 0.8); g.fuse = 0.35; g.ret = true; g.src = s; n++; V26B.st.rets++;
  }
  for (const l of lobs) {
    if (l.ret || l.done || l.T - l.t > 0.4 || l.t < l.T * 0.5) continue;
    const k = l.t / l.T, x = l.x0 + (l.tx - l.x0) * k, y = l.y0 + (l.ty - l.y0) * k; if (Math.hypot(l.tx - P.x, l.ty - P.y) > 2 || !front(x, y, 2.8)) continue; // på väg ned mot dig
    const s = v26bAlive(l.src) ? l.src : null, [tx, ty] = s ? lobClip(x, y, s.x, s.y) : v26bAim(x, y);
    l.x0 = x; l.y0 = y; l.tx = tx; l.ty = ty; l.t = 0; l.T = clamp(0.4 + Math.hypot(tx - x, ty - y) * 0.06, 0.5, 1.0); l.ret = true; l.src = s; l.dmg = Math.max(8, l.dmg || 0) * 1.5; n++; V26B.st.lobRets++;
  }
  if (n) { say('TILLBAKA TILL AVSÄNDAREN!', 1.2); styleAdd(10 * n, '+RETUR'); play('kick', 0.9, 0.8); hitStop = Math.max(hitStop, 0.06); }
  return n;
}
function v26bFrame(dt) { // från r25Frame (varje bildruta, före dess tidiga returer): flygsparken och returer som söker kastaren
  if (!V26B.on) { V26B.L = null; return; }
  try {
    v26bLungeTick(dt);
    for (const g of R25.live) if (g.ret && g.ph === 0 && v26bAlive(g.src)) [g.tx, g.ty] = lobClip(g.x0, g.y0, g.src.x, g.src.y);
    for (const l of lobs) if (l.ret && v26bAlive(l.src)) [l.tx, l.ty] = lobClip(l.x0, l.y0, l.src.x, l.src.y);
    if (boss) v26bBossTing(boss); if (guardianE && guardianE !== boss) v26bBossTing(guardianE);
  } catch (err) { V26B.st.err = String((err && err.stack) || err).slice(0, 400); V26B.L = null; }
}
function v26bRetBoom(n) { // från r25Boom: den återsparkade granaten skadar fiender fullt; spelaren bara om han står mitt i
  const d = Math.hypot(P.x - n.tx, P.y - n.ty);
  explode(n.tx, n.ty, n.dmg * 2, n.r, false); play('bigboom', 0.6, 1.2, { x: n.tx, y: n.ty }); R25.st.booms++; V26B.st.retBooms++;
  if (d < n.r * 0.6 && P.jz < 0.4 && boomSees(n.tx, n.ty, P.x, P.y)) { run.cause = 'GRANATEN'; hurtPlayer(n.dmg * 0.5, n.tx, n.ty, 'proj'); }
}
function v26bLobLand(l) { // från lobLand: den återsparkade lobben skadar fiender (kanonkulan sprängs, krukan sprids som vanligt)
  V26B.st.retBooms++;
  if (l.kind === 'cball') { play('cannonball_land', 0.8, 1, { x: l.tx, y: l.ty }); explode(l.tx, l.ty, l.dmg, l.r, false); }
  else { v17Cloud(l.tx, l.ty, l.fx, l.r * 1.2); for (const e of ents) if (!e.dead && !e.dying && Math.hypot(e.x - l.tx, e.y - l.ty) < l.r && boomSees(l.tx, l.ty, e.x, e.y)) hurtEnemy(e, l.dmg, e.x, e.y, { noProc: true, boom: true }); }
  const d = Math.hypot(P.x - l.tx, P.y - l.ty); if (d < l.r * 0.6 && P.jz < 0.4 && boomSees(l.tx, l.ty, P.x, P.y)) { run.cause = l.name || 'KANONKULAN'; hurtPlayer(l.dmg * 0.5, l.tx, l.ty, 'proj'); }
  return true;
}
function v26bImg() { // romb (går att parera) och kryss (går inte), 11×11 med mörk kant: formen bär betydelsen även utan färg
  if (V26B.img) return V26B.img;
  const mk = (inside, edge, col) => { const w = 11, data = new Uint32Array(w * w); for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) data[y * w + x] = inside(x - 5, y - 5) ? col : edge(x - 5, y - 5) ? 0xff101010 : 0; return { w, h: w, data }; };
  const rIn = (x, y) => Math.abs(x) + Math.abs(y) <= 3, rEd = (x, y) => Math.abs(x) + Math.abs(y) <= 5;
  const xIn = (x, y) => (Math.abs(x - y) <= 1 || Math.abs(x + y) <= 1) && Math.abs(x) <= 4 && Math.abs(y) <= 4, xEd = (x, y) => Math.abs(x - y) <= 2 || Math.abs(x + y) <= 2;
  return (V26B.img = { yes: mk(rIn, rEd, 0xff30d8ff), no: mk(xIn, xEd, 0xffff8a40) });
}
function v26bTell(o, d2) { // från renderSprites: blinken och formen (romb/kryss) över fienden medan slaget laddas
  if (!V26B.on || settings.parryTell === false || d2 > 220) return;
  const w = v26bWin(o); if (!w) return;
  const calm = !!(settings.noFlash || settings.cb), on = calm || Math.floor(tmr * 14) % 2 === 0, col = w === 1 ? [255, 215, 50] : [70, 140, 255], sz = o.d.size * (o.formK || 1), bk = o.boss ? 1.8 : 1;
  const z0 = gfxEOff.z + (!o.boss && (o.d.ai === 'fly' || o.d.ai === 'wisp' || o.d.float) && !o.anchored ? 0.3 : 0);
  if (on && !settings.lowfx) drawSprite(fx.hit[1], o.x - view.dirX * 0.12, o.y - view.dirY * 0.12, (calm ? 0.26 : 0.34) * bk, z0 + sz * (o.boss ? 0.3 : 0.5), false, calm ? 1.2 : 2, 0, 0, true, col);
  const top = view.camZ + view.hor * Math.sqrt(d2) / PSC * (o.boss ? 0.6 : 0.85) - 0.16 * bk; // nära: annars ovanför bildkanten (bossen: under namnlisten)
  const head = o.boss ? sz * 0.5 : gfxEHead(enemyFrame(o)) * sz * 1.15; // bossen: på bröstet, framför kroppen
  drawSprite(v26bImg()[w === 1 ? 'yes' : 'no'], o.x, o.y, (calm ? 0.15 : 0.11) * bk, Math.min(z0 + head + 0.06, top), false, 1.4, 0, 0);
  V26B.st.drawn++;
}
function v26bWantsUse() { // för touchCanUse (C): ANVÄND/handen ska synas för flygsparken och för en granat eller lobb som går att sparka tillbaka
  if (!V26B.on || !P || !map) return false;
  if (V26B.lunge) for (const e of ents) { if (!canExec(e) || e.hidden || !e.d) continue; const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); if (d > 4.5) continue;
    let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off)); if (Math.abs(off) < Math.max(0.12, 0.4 * e.d.size / d)) return true; }
  if (V26B.ret) { if (R25.active) for (const g of R25.live) if (g.ph === 1 && !g.ret && Math.hypot(g.tx - P.x, g.ty - P.y) < 1.5) return true;
    for (const l of lobs) if (!l.ret && l.T - l.t < 0.4 && Math.hypot(l.tx - P.x, l.ty - P.y) < 2) return true; }
  return false;
}
function v26bApi() { // window.__game.v26b: tillstånd, räknare och av/på för t125–t127
  return { st: () => V26B.st, flags: V26B, state: () => ({ on: V26B.on, parry: V26B.parry, lunge: V26B.lunge, ret: V26B.ret, lunging: !!V26B.L, lcd: V26B.lcd, err: V26B.st.err }),
    set: (k, v) => { if (k in V26B && typeof V26B[k] === 'boolean') V26B[k] = !!v; if (!V26B.on) V26B.L = null; return V26B[k]; },
    win: e => v26bWin(e), kick: () => kick(), wantsUse: () => v26bWantsUse(), lobs: () => lobs, lobShot, t: () => tmr,
    launch: (e, vz) => launchEnemy(e, vz), air: e => ({ z: e.airZ || 0, vz: e.airVz || 0, t: e.airT || 0 }), jst: () => V26B.jst,
    bst: () => V26B.bst, bossTable: () => V26B_BOSS, boss: () => boss, guardian: () => guardianE };
}
// --- Version 26B: jonglering (ULTRAKILL) ---
// launchEnemy(e, vz): fiender som inte är tunga (storlek < 1,3, inte boss, väktare, flygare eller grävare) kastas upp. Det sker av
// explosioner inom 0,6 × radien (krokrad i explode), hagelgeväret och dubbelbössan på under 1,2 rutor (krokrad i hurtEnemy) och agent A:s
// markslag om det finns (typeof launchEnemy === 'function'). I luften är fienden bedövad (updateEnemy hoppar över all AI: AI24, R25,
// egna ENEMY_AI, anfall och rörelse), tar +25 % skada och varje träff lyfter den lite (jonglering, högst 3 s i luften). Ett dödande i
// luften ger +JONGLERING. Landningen ger 3 skada och en dammpuff (i tomrummet: FÖLL!). Spriten stiger (gfxEOff.z, högst cirka 0,85) och
// skuggan krymper. Liket efter ett dödande i luften faller ned. Av: v26b.set('jug', false).
V26B.jug = true; V26B.jst = { launches: 0, bumps: 0, lands: 0, airKills: 0, airDrawn: 0, maxZ: 0 };
const V26B_NOAIR = new Set(['fly', 'wisp', 'burrower', 'lavaworm', 'eel', 'worm', 'tentacle', 'alligator', 'anglerfish']);
function launchEnemy(e, vz, dx, dy) { // true = fienden lyfte; (dx, dy) = knuff i sidled (rutor/s)
  if (!V26B.on || !V26B.jug || !e || !e.d || e.dead || e.dying || e.boss || e.guardian || e.dormant || e.dummy || e.hidden || e.under || e.frozen > 0) return false;
  if (e.d.size * (e.formK || 1) >= 1.3 || e.d.float || V26B_NOAIR.has(e.d.ai)) return false;
  if (e.v26lT === tmr || (e.v26noL || 0) > tmr) return false; // en gång per bildruta (hagelns alla kulor); kort spärr efter landningen
  if (e.airZ > 0 && (e.airZ >= 0.6 || e.airT >= 3)) return false; // redan högt eller länge i luften: inget nytt lyft (aldrig genom taket)
  e.v26lT = tmr; vz = clamp(vz || 3.5, 1, 4); // högst cirka 0,85 rutor upp (taket ligger på 1)
  if (!(e.airZ > 0)) { e.airZ = 0.02; e.airT = 0; e.airVz = vz; } else e.airVz = Math.max(e.airVz, Math.min(vz, 2.5));
  e.avx = dx || 0; e.avy = dy || 0; e.state = 'pain'; e.t = 0; e.didHit = true; e.charge = 0; e.leapT = 0; V26B.jst.launches++;
  return true;
}
function v26bAirTick(e, dt) { // från updateEnemy: fienden i luften gör ingenting själv – den stiger, faller och landar
  e.airT = (e.airT || 0) + dt; e.airVz -= 9.5 * dt; e.airZ += e.airVz * dt; if (e.airZ > V26B.jst.maxZ) V26B.jst.maxZ = e.airZ;
  if (e.avx || e.avy) { tryMove(e, e.avx * dt, e.avy * dt, 0.28); e.avx *= 0.96; e.avy *= 0.96; }
  e.state = 'pain'; e.t = 0; e.didHit = true; e.cd = Math.max(e.cd || 0, 0.5); e.mvx = e.mvy = 0;
  if (e.airZ > 0) return true;
  e.airZ = 0; e.airVz = 0; e.avx = e.avy = 0; e.v26land = tmr; V26B.jst.lands++; e.stun = Math.max(e.stun || 0, 0.35);
  e.v26noL = tmr + (e.elite || e.champion ? 1.5 : 0.6); // ingen evig bedövning (hagel var 0,95 s, explosiva kulor)
  if (voidAt(e.x, e.y)) { spawnText(e.x, e.y, 'FÖLL!', '#c0e0ff'); play('void_fall', 0.5, 1.3, { x: e.x, y: e.y }); hurtEnemy(e, e.hp + 999, e.x, e.y, { noProc: true, land: true }); stat('voidKills'); return true; } // som knockTick
  if (!settings.lowfx) spawnPuff(e.x, e.y, 4); play('land', 0.45, 0.8, { x: e.x, y: e.y });
  hurtEnemy(e, 3, e.x, e.y, { noProc: true, land: true });
  return true;
}
function v26bFall(e, dt) { // från updateEnemy: ett lik som dog i luften faller ned
  e.airVz = (e.airVz || 0) - 9.5 * dt; e.airZ = Math.max(0, e.airZ + e.airVz * dt);
}
function v26bAirHit(e, dmg, opt) { // från hurtEnemy: +25 % i luften, och träffen håller den uppe (högst 3 s)
  if (opt.land || e.dead || !(e.airT > 0)) return dmg; // inte samma salva/smäll som kastade upp den
  if ((e.airT || 0) < 3 && e.airZ < 0.6 && e.airVz < 1.4 && !opt.infight) { e.airVz = 1.4; V26B.jst.bumps++; } // svävar, stiger inte mot taket
  return dmg * 1.25;
}
function v26bShotLaunch(e, opt) { // från hurtEnemy: hagelgeväret och dubbelbössan på nära håll (skottet från fire() har bara { crit })
  if (!V26B.on || !V26B.jug || !('crit' in opt) || opt.boom || opt.melee || opt.noProc) return;
  const w = WEAPONS[P.weapon]; if (!w || (w.id !== 'shotgun' && w.id !== 'dbshotgun')) return;
  const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); if (d >= 1.2 + e.d.size * 0.15 || d < 0.01) return;
  launchEnemy(e, w.id === 'dbshotgun' ? 3.5 : 3.0,dx / d * 1.6, dy / d * 1.6);
}
function v26bBlast(x, y, r) { // från explode: fiender inom 0,6 × radien kastas upp, hårdare ju närmare
  if (!V26B.on || !V26B.jug) return;
  for (const e of ents) { if (e.dead || e.dying) continue; const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy); if (d > r * 0.6 || !boomSees(x, y, e.x, e.y)) continue;
    const k = 1 - d / (r * 0.6 + 0.01), s = d > 0.05 ? 1.5 / d : 0; launchEnemy(e, 2.6 + 1.4 * k,dx * s, dy * s); }
}
function v26bShadowK(o) { return clamp(1 - o.airZ * 0.7, 0.3, 1); } // från gfxEShadowK: skuggan krymper med höjden
// --- Version 26B: parering mot bossar och väktare ---
// Bossar och väktare går genom updateBoss och BOSS_AI[id]. Tabellen säger när varje tidsstyrt slag träffar (tillstånd → [b.t då slaget
// kommer, 1 = parerbart, 2 = inte]), avläst ur BOSS_AI: "if (!b.didHit && b.t > T)". Rena närstridsslag (hugg, klo, bett, piska, svans,
// stav, slägga, skopa) är gula; markslag med chockvåg, ringar av skott eller istaggar är blå. Rusningar, dyk och utfall (ingen fast tid)
// och de första 0,8 s av ett specialanfall är blå. Väktare har samma id och samma BOSS_AI, så de följer samma tabell.
// En parering mot en boss ger aldrig vacklan eller avrättning: slaget uteblir (b.didHit), bossen bedövas 0,6 s, och sedan går den inte att
// parera på 4 s (markeringen är blå så länge). +PARERING, +8 överhälsa och träffstopp. Faser, ilska och arenans tider påverkas inte (b.t
// räknas som vanligt; tillståndet avslutas på sin vanliga tid). Av: v26b.set('boss', false).
V26B.boss = true; V26B.bst = { tells: 0, blue: 0, parries: 0 };
const V26B_BOSS = {
  ringmaster: { whip: [0.4, 1] }, serpent: { tail: [0.45, 1] }, ratking: { bite: [0.45, 1] }, sphinx: { paw: [0.55, 1] },
  executioner: { chop: [0.6, 1] }, tidepriest: { staff: [0.5, 1] }, bathmaster: { ladle: [0.55, 1] }, pyrelord: { claw: [0.55, 1] },
  butcher: { cleave: [0.55, 1] }, warlord: { sword: [0.55, 1] }, foreman: { sledge: [0.5, 1] },
  demon: { slam: [0.85, 2] }, ogre: { smash: [0.6, 2] }, frost: { slam: [0.7, 2] }, flame: { slam: [0.75, 2] }, mycelmother: { slam: [0.45, 2] },
  colossus: { slam: [0.6, 2] }, alchemist: { smash: [0.6, 2] },
};
const V26B_RUSH = new Set(['windup', 'charge', 'dash', 'lunge', 'dive', 'slash']);
function v26bBossWin(b) { // 0, 1 (gult) eller 2 (blått) för en boss eller väktare
  if (!V26B.boss || b.dead || b.dying || b.hidden || b.asleep) return 0;
  if (b.state === 'special') return b.t < 0.8 ? 2 : 0;
  const T = V26B_BOSS[b.id] && V26B_BOSS[b.id][b.state];
  if (T) { if (b.didHit || b.t < T[0] - V26B.win || b.t > T[0]) return 0; return T[1] === 1 && (b.v26pCd || 0) <= tmr && !(b.stun > 0) ? 1 : 2; }
  return V26B_RUSH.has(b.state) && Math.hypot(b.x - P.x, b.y - P.y) < 7 ? 2 : 0;
}
function v26bBossTing(b) { // från v26bFrame: "ting" en gång per parerbart slag, och räknare
  if (!V26B.on || !V26B.parry || b.dead) return;
  const w = v26bBossWin(b); if (!w) return;
  const key = b.state + ':' + Math.round((tmr - b.t) * 10); if (b.v26tk === key) return; b.v26tk = key;
  if (w === 1) { V26B.bst.tells++; if (Math.hypot(b.x - P.x, b.y - P.y) < 10) play('parry', 0.3, 1.8, { x: b.x, y: b.y }); } else V26B.bst.blue++;
}
function v26bBossParry(b) { // slaget uteblir, kort bedövning med nedkylning – ingen vacklan eller avrättning
  b.didHit = true; b.stun = Math.max(b.stun || 0, 0.6); b.v26pCd = tmr + 4; V26B.bst.parries++; V26B.st.parries++;
  overheal(8); hitStop = Math.max(hitStop, 0.12); P.shake = Math.max(P.shake, 1); play('parry', 1, 0.85);
  if (!settings.noFlash) flashes.push({ x: P.x, y: P.y, t: 0.12, r: 3, col: [255, 240, 200] });
  spawnText(P.x + Math.cos(P.a), P.y + Math.sin(P.a), 'PARERAT!', '#ffe9a8'); spawnText(b.x, b.y, 'BEDÖVAD', '#ffe9a8'); styleAdd(12, '+PARERING'); stat('parries');
}
function v26bAirZ(o) { V26B.jst.airDrawn++; return o.airZ; } // från renderSprites: höjden läggs på gfxEOff.z (stjärnor, ögon och markeringen följer med)
// --- ritning: befälhavarens fana, granaten och den blinkande ringen ---
function drawR25World(list) {
  if (!R25.active) return;
  for (const c of R25.cmds) if (!c.dead && !(c.ghost > 0.5)) list.push({ x: c.x, y: c.y, k: 'r25', t: 'cmd', o: c }); // fanan även på version 6:s ledare (stjärnan är liten)
  for (const n of R25.live) { const k = n.ph ? 1 : n.t / n.T; list.push({ x: n.x0 + (n.tx - n.x0) * k, y: n.y0 + (n.ty - n.y0) * k, k: 'r25', t: 'nade', o: n, z: n.ph ? 0.03 : 0.45 + 2.0 * 4 * k * (1 - k) }); list.push({ x: n.tx, y: n.ty, k: 'r25', t: 'ring', o: n }); }
}
function r25On(o) { return settings.noFlash || Math.floor(o.t * (4 + 8 * o.t / o.fuse)) % 2 === 0; } // blinkar allt tätare, högst ~6 gånger/s
function drawR25Sprite(s) {
  const o = s.o;
  if (s.t === 'cmd') { const f = fx.props.warbanner, z = o.d.size * 1.15 * gfxEHead(enemyFrame(o)) + 0.04 + (o.d.float ? 0.3 : 0); // strax ovanför huvudet
    if (!settings.lowfx) drawSprite(fx.hit[1], o.x, o.y, 0.3, z + 0.08, false, 2, 0, 0, true, [255, 200, 70]); // guldsken bakom fanan
    drawSprite(f ? f[Math.floor(tmr * 3) % f.length] : fx.parts.star ? fx.parts.star[0] : fx.hit[1], o.x, o.y, f ? 0.42 : 0.1, z, false, 1.5, 0, 0, !f, f ? null : [255, 215, 90]); R25.st.drawn++; return true; }
  if (s.t === 'nade') { drawSprite(spr.grenade || fx.coin[0], s.x, s.y, 0.13, s.z, false, null, 0, 0.6);
    if (o.ph && r25On(o)) drawSprite(fx.hit[1], s.x, s.y, 0.16, 0.08, false, 2, 0, 0, true, [255, 60, 40]); return true; } // röd lampa som blinkar allt tätare
  if (s.t === 'ring') { const n = 20, on = !o.ph || r25On(o), tint = on ? [255, 70, 40] : [150, 45, 30], sz = o.ph ? (settings.noFlash ? 0.12 + 0.12 * o.t / o.fuse : on ? 0.24 : 0.12) : 0.12; // ringen blinkar i takt med pipet (noFlash: växer i stället)
    for (let i = 0; i < n; i++) { const a = i / n * TAU + tmr * 0.6; drawSprite(fx.hit[1], o.tx + Math.cos(a) * o.r, o.ty + Math.sin(a) * o.r, sz, 0.01, false, 2, 0, 0, true, tint); }
    R25.st.ringDrawn = (R25.st.ringDrawn || 0) + 1; return true; }
  return false;
}
function r25Api() { // window.__game.roles: tillstånd och statistik för t114
  return { on: () => R25.active && !R25.err, err: () => R25.err, st: () => (r25Sync(), R25.st), def: R25_DEF, flags: R25, live: () => (r25Sync(), R25.live).map(n => ({ ph: n.ph, t: n.t, T: n.T, fuse: n.fuse, tx: n.tx, ty: n.ty, r: n.r })),
    cmds: () => (r25Sync(), R25.cmds).filter(c => !c.dead), buffed: () => (r25Sync(), R25.buffed).filter(e => !e.dead), of: e => ({ cmd: !!e.r25cmd, mor: !!e.r25mor, ward: e.r25g || null, hes: (e.r25hesT || 0) > tmr, hid: e.r25hid || 0 }), // r25Sync: direkt efter en ny bana visas inte förra banans tillstånd
    off: () => r25Off(),
    t: () => tmr }; // speltiden: testerna väntar i speltid, inte väggtid (dt kapas vid låg bildfrekvens)
}
