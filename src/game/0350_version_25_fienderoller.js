// ---------- Version 25: fienderoller ----------
// Tre roller ovanpå AI24:s truppkoordinator (samma trupper två gånger/s, samma undantag: bossar, väktare, minions, arenafiender och
// fiender som bråkar får inga roller, och i KLOCKAN finns inga roller alls). Vakthunden i ai24Tick körs före rollerna.
// SKÖLDVAKT: en sköldbärare ('@', dödsriddaren 'Ð', levande rustningen '+') ställer sig 0,8–1,3 rutor framför närmaste skytt på
// linjen mot spelaren med skölden mot honom; truppens egna skott går igenom vakten (infightHit). Vakten bryter formationen och
// anfaller (med polett) när spelaren kommer nära eller när skytten dör.
// BEFÄLHAVARE: en per trupp (helst version 6:s ledare, en elit eller champion, annars den talande humanoid som har mest hp) bär en
// fana. Truppen inom 6 rutor får +15 % fart, 15 % kortare nedkylning, backar mindre och flyr inte. När den dör tvekar truppen
// 0,8–1,5 s och den svagaste kan fly (för version 6:s ledare sköter leaderDied flykten).
// GRANATKASTARE: spelaren som gömmer sig för truppen men är känd (den senast kända platsen stämmer) i mer än ~3 s, eller när flera
// saknar skottlinje medan han står still, får en granat i båge mot den senast kända platsen. Den ligger och piper 1–1,5 s med en
// blinkande ring innan den smäller. Delar nedkylningen med AI24:s eldkruka (AI24.pressT, st.press/st.flush) och har en egen per trupp.
// Av: settings.smartAI = false återställer allt (fart, flaggor, granater); R25.on/guard/cmd/nade stänger av en roll (__game.roles).
const R25_DEF = { // guard: sköldvakt · cmd: kan bli befälhavare (talande humanoider) · nade: granatkastare
  '@': { guard: 1, cmd: 1 }, 'Ð': { guard: 1, cmd: 1 }, // version 25.1: den levande rustningen '+' är ingen sköldvakt (ingen sköld framifrån, sover tills man kommer nära)
  'Ä': { cmd: 1, nade: 1 }, 'Ő': { cmd: 1, nade: 1 }, 'ĳ': { cmd: 1, nade: 1 }, 'ʐ': { cmd: 1, nade: 1 }, 'Ǖ': { cmd: 1, nade: 1 }, 'ȡ': { cmd: 1, nade: 1 },
  'ʑ': { cmd: 1 }, 'ɫ': { cmd: 1 }, 'Ō': { cmd: 1 }, 'ɕ': { cmd: 1 }, 'Ɂ': { cmd: 1 }, 'Ȉ': { cmd: 1 }, 'ɖ': { cmd: 1 }, 'W': { cmd: 1 }, 'O': { cmd: 1 }, 'N': { cmd: 1 }, 'Ê': { cmd: 1 },
};
const r25Stats = () => ({ cmds: 0, cmdDead: 0, hes: 0, fled: 0, buffMax: 0, guards: 0, guardBreak: 0, guardPass: 0, nades: 0, booms: 0, nadeHits: 0, drawn: 0, barks: [], log: [] });
const R25 = { on: true, guard: true, cmd: true, nade: true, active: false, map: null, err: null, cmds: [], buffed: [], live: [], nadeT: 0, barkT: 0, st: r25Stats() };
function r25Ok(e) { return !e.dead && !e.dying && !ai24Exempt(e) && !AI24.clock; } // får vara sköldvakt eller granatkastare
function r25CanCmd(e) { return !e.dead && !e.dying && !e.boss && !e.guardian && !e.minion && !e.arena && !e.dummy && !e.dormant && !e.feud && (e.leader || e.elite || e.champion || !!(R25_DEF[e.type] && R25_DEF[e.type].cmd)); }
function r25Bark(e, text, prio) { // egna repliker (sköldbärare saknar AI24:s talk) med egen spärr, så att AI24:s barks inte svälts ut
  if (!e || e.dead || (R25.barkT > tmr && !prio)) return false;
  R25.barkT = tmr + rnd(2.5, 3.5); numbers.push({ x: e.x, y: e.y, z: 1.05, v: text, color: '#ffe3a0', crit: false, t: 1.8 }); if (!v251Voice(e, text)) play(e.d.growl, 0.5, rnd(1.05, 1.25), { x: e.x, y: e.y }); // version 25.1: rösten
  const b = R25.st.barks; b.push({ t: +tmr.toFixed(2), text, type: e.type }); if (b.length > 12) b.shift();
  return true;
}
function r25Mor(e, on) { // truppens moral: fart och nedkylning som faktorer på en egen kopia av e.d (går alltid att räkna tillbaka)
  if (!!e.r25mor === on) return; e.r25mor = on; const k = on ? 1 : -1;
  e.d = { ...e.d, speed: e.d.speed * 1.15 ** k, cd: e.d.cd * 0.85 ** k, kite: e.d.kite ? e.d.kite * 0.5 ** k : e.d.kite };
}
function r25Off() { // smartAI av, KLOCKAN eller en roll avstängd: allt tillbaka som i version 24
  for (const e of R25.buffed) r25Mor(e, false); R25.buffed.length = 0; R25.cmds.length = 0; R25.live.length = 0; R25.active = false;
  for (const e of ents) { e.r25cmd = false; e.r25g = null; e.r25hesT = 0; }
}
function r25Sync() { // ny bana: nollställ (anropas både före och efter truppkoordinatorn – ai24Frame kan köra en trupptick på den nya banan före r25Frame)
  if (R25.map !== map) { R25.map = map; R25.buffed.length = 0; R25.cmds.length = 0; R25.live.length = 0; R25.nadeT = 0; R25.st = r25Stats(); }
}
function r25Frame(dt) { // varje bildruta (även med smartAI av, så att allt städas): granaterna
  v26bFrame(dt); // version 26B: flygsparken och granater som sparkats tillbaka
  r25Sync();
  if (settings.smartAI === false || !R25.on || R25.err || AI24.err || AI24.clock) { if (R25.active) r25Off(); return; }
  R25.active = true;
  if (!R25.live.length) return;
  try { r25NadeTick(dt); } catch (err) { R25.err = String((err && err.stack) || err).slice(0, 500); r25Off(); }
}
function r25Squads(sq) { // från ai24Squads (två gånger/s): befälhavare, sköldvakter och granater per trupp
  r25Sync(); if (!R25.active || R25.err) return;
  try {
    const want = new Set(); R25.cmds.length = 0;
    if (!R25.cmd || !R25.guard) for (const e of ents) { if (!R25.cmd) e.r25cmd = false; if (!R25.guard) e.r25g = null; }
    for (const g of sq) { if (R25.cmd) r25Command(g, want); if (R25.guard) r25Guards(g); }
    R25.buffed = R25.buffed.filter(e => { if (want.has(e) && !e.dead && e.r25mor) return true; r25Mor(e, false); return false; });
    for (const e of want) if (!e.r25mor) { r25Mor(e, true); R25.buffed.push(e); }
    for (const e of R25.buffed) if (e.fleeT > 0 && e.fleeT < 5) e.fleeT = 0; // HÅLL LINJEN: flyr inte (ficktjuven med guldet, 99 s, får fly)
    if (R25.buffed.length > R25.st.buffMax) R25.st.buffMax = R25.buffed.length;
    if (R25.nade) for (const g of sq) r25Nade(g);
  } catch (err) { R25.err = String((err && err.stack) || err).slice(0, 500); r25Off(); }
}
// --- befälhavaren ---
function r25Command(g, want) {
  let c = null;
  for (const e of g) if (e.r25cmd) { if (!r25CanCmd(e)) e.r25cmd = false; else if (!c || e.maxHp > c.maxHp) c = e; }
  for (const e of g) if (e.r25cmd && e !== c) e.r25cmd = false; // två trupper gick ihop: den starkaste behåller befälet
  if (!c) {
    if (g.length < 3 || g.some(e => (e.r25lostT || 0) > tmr)) return; // befälet nyss dött: ingen efterträdare på en stund
    let best = -1; for (const e of g) { if (!r25CanCmd(e)) continue; const s = (e.leader ? 4000 : 0) + (e.champion ? 3000 : 0) + (e.elite ? 2000 : 0) + e.maxHp; if (s > best) { best = s; c = e; } }
    if (!c) return;
    c.r25cmd = true; c.r25barkT = tmr + rnd(6, 9); R25.st.cmds++; r25Bark(c, 'FRAMÅT!', true);
    firstHint('cmd25', 'BEFÄLHAVAREN MED FANAN GER TRUPPEN MOD – DÖDA DEN FÖRST.');
  }
  R25.cmds.push(c);
  for (const e of g) if (e !== c && !e.dead && !e.boss && !e.guardian && !e.dormant && Math.hypot(e.x - c.x, e.y - c.y) < (e.r25mor ? 7 : 6)) want.add(e);
  if ((c.r25barkT || 0) < tmr && r25Bark(c, c.hp < c.maxHp * 0.6 || g.some(e => (e.lostT || 0) > 1.5) ? 'HÅLL LINJEN!' : 'FRAMÅT!')) c.r25barkT = tmr + rnd(7, 11);
}
function r25CmdDied(e) { // från killEnemy: moralen faller – en kort tvekan, och den svagaste kan fly
  e.r25cmd = false; if (!R25.active || R25.err) return;
  try {
    let weak = null, talker = null, n = 0;
    for (const o of ents) {
      if (o.dead || o.dying || o === e || o.boss || o.guardian || o.dormant || o.dummy || !o.alert || Math.hypot(o.x - e.x, o.y - e.y) > 7) continue;
      r25Mor(o, false); o.r25lostT = tmr + rnd(8, 12); n++;
      if (!e.leader) { o.r25hesT = tmr + rnd(0.8, 1.5); if (n <= 3) spawnText(o.x, o.y, '?', '#e8d9b0'); } // version 6:s ledare: leaderDied låter dem fly i stället
      if (!o.elite && !o.champion && !o.minion && o.hp < o.maxHp * 0.6 && (!weak || o.hp / o.maxHp < weak.hp / weak.maxHp)) weak = o;
      if (!talker && R25_DEF[o.type] && R25_DEF[o.type].cmd) talker = o;
    }
    R25.st.cmdDead++; R25.st.hes += e.leader ? 0 : n; R25.st.cmdDeadT = +tmr.toFixed(2);
    if (weak && !e.leader) { weak.fleeT = 2.5; weak.r25hesT = 0; spawnText(weak.x, weak.y, 'FLYR', '#c9a87a'); R25.st.fled++; }
    if (!(talker && r25Bark(talker, 'BEFÄLET ÄR DÖTT!', true)) && !e.leader) spawnText(e.x, e.y, 'BEFÄLET ÄR DÖTT!', '#ffe3a0');
  } catch (err) { R25.err = String((err && err.stack) || err).slice(0, 500); r25Off(); }
}
// --- sköldvakten ---
function r25Guards(g) {
  let sh = null, gs = null;
  for (const e of g) { if (e.dead) continue; if (!e.d.melee) (sh = sh || []).push(e); else if (R25_DEF[e.type] && R25_DEF[e.type].guard && r25Ok(e)) (gs = gs || []).push(e); }
  if (!gs) return;
  const taken = new Set(); for (const e of gs) if (e.r25g && !e.r25g.dead && sh && sh.includes(e.r25g)) taken.add(e.r25g); else if (e.r25g && !e.r25g.dead) e.r25g = null; // en död skytt: r25GuardTick låter vakten anfalla
  for (const e of gs) if (e.r25g && e.d.ai === 'knight') e.bashT = Math.max(e.bashT || 0, tmr + 0.8); // version 25.1: dödsriddaren håller linjen i stället för att rusa iväg med sköldstöten (två gånger/s)
  if (!sh) return;
  for (const e of gs) {
    if (e.r25g || (e.r25badT || 0) > tmr) continue;
    let w = null, bd = 8; for (const s of sh) { if (taken.has(s)) continue; const d = Math.hypot(s.x - e.x, s.y - e.y); if (d < bd) { bd = d; w = s; } }
    if (!w) continue;
    taken.add(w); e.r25g = w; e.r25goT = 0; e.r25best = null; e.r25said = false; R25.st.guards++;
  }
}
function r25GuardTick(e, dt, dist) { // ställ dig mellan spelaren och skytten; false = den gamla koden (med poletter) sköter bildrutan
  const w = e.r25g;
  if (!w || w.dead || w.dying || !r25Ok(e)) { e.r25g = null; if (w && (w.dead || w.dying)) { e.a24prio = tmr + 2; R25.st.guardBreak++; } return false; } // skytten dog: anfall
  const dpw = Math.hypot(P.x - w.x, P.y - w.y);
  if (dist < e.d.range + 1.6 || dpw < 2.6) { if ((e.r25brkT || 0) <= tmr) R25.st.guardBreak++; e.r25brkT = tmr + 2; return false; } // spelaren är nära: bryt formationen
  if ((e.r25brkT || 0) > tmr) return false; // två sekunder till efter att spelaren gått undan, sedan tillbaka i formation
  const ux = (P.x - w.x) / dpw, uy = (P.y - w.y) / dpw;
  let gx = 0, gy = 0, ok = false;
  for (const k of [Math.min(1.3, dpw * 0.4), 0.8]) { gx = w.x + ux * k; gy = w.y + uy * k; if (!solid(gx, gy) && walkableForEnemy(gx | 0, gy | 0)) { ok = true; break; } }
  if (!ok) return false;
  const d = Math.hypot(gx - e.x, gy - e.y);
  if (d <= 0.6) { e.r25goT = 0; e.r25best = null; if (!e.r25said) e.r25said = r25Bark(e, Math.random() < 0.5 ? 'SKÖLDAR UPP!' : 'BAKOM MIG!'); } // framme: skölden upp
  else if (e.r25best == null || d < e.r25best - 0.25) { e.r25goT = 0; e.r25best = d; } // kommer närmare
  else if ((e.r25goT = (e.r25goT || 0) + dt) > 2.5) { e.r25g = null; e.r25best = null; e.r25badT = tmr + 5; return false; } // kommer inte närmare: ge upp en stund
  if (d > 0.15) ai24Walk(e, gx, gy, dt, d > 1.5 ? 1.1 : 0.8); else ai24Hold(e);
  e.cd -= dt; return true;
}
function r25Pass(v) { return !!(v.r25g && R25.active) && ++R25.st.guardPass > 0; } // infightHit: truppens skott går igenom vakten, även när den bryter formationen (annars vänder den sig mot sin egen skytt)
// --- per fiende (från ai24Tick efter vakthunden) ---
function r25Tick(e, dt, dist) {
  if (!R25.active || R25.err) return false;
  try {
    if (e.r25hesT) { if (e.r25hesT > tmr) { ai24Hold(e); e.cd -= dt; return true; } e.r25hesT = 0; } // befälet är dött: en kort tvekan
    if (e.r25g) return r25GuardTick(e, dt, dist);
    return false;
  } catch (err) { R25.err = String((err && err.stack) || err).slice(0, 500); r25Off(); return false; }
}
// --- granatkastaren ---
function r25Nade(g) {
  let near = 0, see = 0, lk = null, cd = 0;
  for (const e of g) { const lt = e.lostT || 0; if ((e.r25nadeT || 0) > cd) cd = e.r25nadeT; if (Math.hypot(e.x - P.x, e.y - P.y) > 12) continue; near++; if (lt < 0.8) see++; if (e.lx !== undefined && (!lk || lt < lk.lt)) lk = { x: e.lx, y: e.ly, lt }; }
  const known = !!lk && lk.lt < 7 && Math.hypot(lk.x - P.x, lk.y - P.y) < 2.5, hidden = near > 0 && !see && known;
  let hid = 0; for (const e of g) { e.r25hid = hidden ? (e.r25hid || 0) + 0.5 : 0; if (e.r25hid > hid) hid = e.r25hid; }
  const blind = near - see, trig = hid >= 3 || (known && blind >= 3 && see * 2 < near && AI24.still.t >= 2);
  if (!trig || cd > tmr || R25.nadeT > tmr || AI24.pressT > tmr || R25.live.length >= 2) return;
  const tx0 = lk.x + rnd(-0.35, 0.35), ty0 = lk.y + rnd(-0.35, 0.35), r = 1.6;
  if (g.some(o => !o.dead && Math.hypot(o.x - tx0, o.y - ty0) < r + 0.6)) return; // kastar inte på de egna
  let t = null, bs = 1e9;
  for (const e of g) { if (!R25_DEF[e.type] || !R25_DEF[e.type].nade || !r25Ok(e) || e.state === 'pain' || e.state === 'attack' || e.fleeT > 0 || e.r25g) continue;
    const d = Math.hypot(e.x - tx0, e.y - ty0); if (d < 2.5 || d > 10) continue; const s = Math.abs(d - 6) + lobMiss(e, tx0, ty0) * 4; if (s < bs) { bs = s; t = e; } } // version 25.1: helst en kastare med fri bana
  if (!t) return;
  let tx = tx0, ty = ty0; for (let i = 0; i < 6 && solid(tx, ty); i++) { tx += (t.x - tx) * 0.2; ty += (t.y - ty) * 0.2; }
  [tx, ty] = lobClip(t.x, t.y, tx, ty); // version 25.1: granaten landar före första väggen på linjen (där ringen ritas och smällen kommer)
  if (Math.hypot(tx - t.x, ty - t.y) < 2.5 || g.some(o => !o.dead && Math.hypot(o.x - tx, o.y - ty) < r + 0.6)) return; // för nära kastaren eller de egna
  const d = Math.hypot(tx - t.x, ty - t.y), fuse = [1.5, 1.25, 1.1, 1.0, 1.5][settings.diff] || 1.25;
  R25.live.push({ x0: t.x, y0: t.y, tx, ty, t: 0, T: clamp(0.55 + d * 0.07, 0.7, 1.3), fuse, ph: 0, bT: 0, r, dmg: 14 * (1 + 0.1 * (((run && run.depth) || 1) - 1)), name: t.d.name });
  R25.live[R25.live.length - 1].src = t; // version 26B: kastaren, för granatreturen
  t.state = 'attack'; t.t = 0; t.didHit = true; play('grenade_throw', 0.7, 0.9, { x: t.x, y: t.y });
  const until = tmr + rnd(9, 12); for (const e of g) e.r25nadeT = until; R25.nadeT = tmr + 3; AI24.pressT = Math.max(AI24.pressT, tmr + rnd(6, 8)); AI24.st.press++; AI24.st.flush++; R25.st.nades++;
  const L = R25.st.log; L.push({ t: +tmr.toFixed(2), type: t.type, to: [+tx.toFixed(2), +ty.toFixed(2)], lk: [+lk.x.toFixed(2), +lk.y.toFixed(2)], p: [+P.x.toFixed(2), +P.y.toFixed(2)], hid: hid, fuse, T: +R25.live[R25.live.length - 1].T.toFixed(2) }); if (L.length > 12) L.shift();
  if (!r25Bark(t, Math.random() < 0.6 ? 'GRANAT!' : 'UT MED DIG!', true)) spawnText(t.x, t.y, 'GRANAT!', '#ff9050');
  firstHint('nade25', 'EN GRANAT PIPER DÄR RINGEN BLINKAR – SPRING UT UR DEN.');
}
function r25NadeTick(dt) {
  for (const n of R25.live) {
    n.t += dt;
    if (n.ph === 0) { if (n.t >= n.T) { n.ph = 1; n.t = 0; n.bT = 0; n.landT = tmr; play('grenade_bounce', 0.6, 0.9, { x: n.tx, y: n.ty }); } continue; }
    if ((n.bT -= dt) <= 0) { n.bT = clamp((n.fuse - n.t) * 0.3, 0.09, 0.3); play('grenade_beep', 0.55, 1.1, { x: n.tx, y: n.ty }); } // piper allt tätare
    if (n.t >= n.fuse) { n.done = true; r25Boom(n); }
  }
  R25.live = R25.live.filter(n => !n.done);
}
function r25Boom(n) {
  if (n.ret) return v26bRetBoom(n); // version 26B: granaten som sparkats tillbaka
  const d = Math.hypot(P.x - n.tx, P.y - n.ty);
  explode(n.tx, n.ty, n.dmg * 0.5, n.r, false); play('bigboom', 0.6, 1.2, { x: n.tx, y: n.ty }); R25.st.booms++;
  const L = R25.st.boomLog || (R25.st.boomLog = []); L.push({ t: +tmr.toFixed(2), fuse: +(tmr - (n.landT ?? tmr)).toFixed(2), dP: +d.toFixed(2), at: [+n.tx.toFixed(2), +n.ty.toFixed(2)] }); if (L.length > 12) L.shift();
  if (d < n.r && P.jz < 0.4 && boomSees(n.tx, n.ty, P.x, P.y)) { run.cause = 'GRANATEN'; hurtPlayer(n.dmg, n.tx, n.ty, 'proj'); R25.st.nadeHits++; }
}
