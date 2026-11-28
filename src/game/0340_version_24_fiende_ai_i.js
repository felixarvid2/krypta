// ---------- Version 24: fiende-AI i F.E.A.R.-anda och DOOM:s attackpoletter (AI24) ----------
// En målväljare (utility), ingen GOAP-sökning: sensorerna (sikt, senast kända plats, hörd omladdning, spelaren står still) fyller
// ett litet arbetsminne per fiende; truppkoordinatorn (2 gånger/s) delar ut roller – UNDERTRYCK, FLANK, AVANCERA, SÖK – och varje
// roll är en kort kedja steg (gå till skydd → göm dig → kliv ut och skjut → tillbaka). Attackpoletter (DOOM): högst N närstridare
// och N skyttar anfaller samtidigt, de andra hotar (cirklar, går i sidled, tar skydd). Vakthunden: ingen fiende står inom räckhåll
// längre än 3–4,2 s utan att få anfalla (som väntande strax utanför räckhåll räknas tiden ×0,6, alltså högst ~7 s), sedan får den
// en polett ändå (arenavågor, KLOCKAN, partid och tester). Skydd och barks är opt-in per fiendetyp (AI24_DEF).
// Bossar/väktare påverkas inte; minions, arenafiender, eliter, champions och fiender med egen ENEMY_AI (utom de som valts in i
// AI24_DEF) får poletter men inga skydd-, sök- eller flankroller. Den egna ENEMY_AI körs alltid först. Av: settings.smartAI = false.
const AI24_DEF = { // cover: skydd och titta fram · talk: barks · nade: eldkruka mot den som campar · flank: får flankera
  K: { cover: 1, nade: 1 }, 'Ä': { cover: 1, talk: 1, nade: 1 }, 'Ő': { cover: 1, talk: 1, nade: 1 }, 'ʑ': { cover: 1, talk: 1 },
  'ĳ': { talk: 1, flank: 1 }, 'ʐ': { talk: 1 }, 'Ǖ': { talk: 1, flank: 1 }, 'ɫ': { talk: 1, flank: 1 }, 'Ō': { talk: 1, flank: 1 },
  'ɕ': { talk: 1, flank: 1 }, 'Ɂ': { talk: 1, flank: 1 }, 'Ȉ': { talk: 1, flank: 1 }, 'ȡ': { talk: 1, flank: 1 }, 'ɖ': { talk: 1, flank: 1 },
};
const AI24_D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const ai24Stats = () => ({ granted: 0, forced: 0, watchdog: 0, maxM: 0, maxR: 0, plans: 0, roles: {}, cover: 0, coverUse: 0, peeks: 0, flanks: 0, flankPath: [], searches: 0, press: 0, flush: 0, rush: 0, barks: [], losUsed: 0, losDeferred: 0, fields: 0 });
const AI24 = { map: null, cov: null, covB: null, bw: 1, bh: 1, taken: new Set(), tm: [], tr: [], wPrev: [0, 0], wCur: [0, 0], los: 0, picks: 0, fr: 0, clock: false, sqT: 0, barkT: 0,
  still: { x: 0, y: 0, t: 0 }, pressT: 0, flankT: 0, reload: false, squads: [], dead: 0, err: null, st: ai24Stats() };
function ai24Exempt(e) { return !!(e.boss || e.guardian || e.minion || e.arena || e.elite || e.champion || e.dummy || e.dormant || e.feud); }
function ai24Tac(e) { return !ai24Exempt(e) && (!e.d.ai || !!AI24_DEF[e.type]) && !AI24.clock; } // får skydd, sök och flank (inte i KLOCKAN: där ska fienderna gå att hinna döda)
function ai24CanFlank(e) { const o = AI24_DEF[e.type]; return ai24Tac(e) && !!e.d.melee && (!o || !!o.flank); }
function ai24Level() { // ny bana: nollställ minnet och förberäkna skyddspunkterna
  AI24.map = map; AI24.tm.length = 0; AI24.tr.length = 0; AI24.taken.clear(); AI24.still.t = 0; AI24.pressT = tmr + 3; AI24.flankT = 0; AI24.barkT = 0; AI24.squads = []; AI24.dead = 0; AI24.st = ai24Stats();
  ai24Covers();
}
function ai24Block(x, y) { const c = cellAt(x, y); return isWallChar(c) || isPropChar(c) || c === 'f' || c === 'M'; } // skyddar: väggar, pelare, blockerande rekvisita
function ai24Covers() { // en skyddspunkt: en ruta med skydd på ena sidan och en fri ruta bredvid att kliva ut i ("peek") där skyddet tar slut
  const L = [];
  for (let y = 1; y < mh - 1; y++) for (let x = 1; x < mw - 1; x++) {
    if (isDoorChar(map[y][x]) || ai24Block(x, y) || !walkableForEnemy(x, y)) continue;
    for (const [dx, dy] of AI24_D4) {
      if (!ai24Block(x + dx, y + dy)) continue;
      for (const s of [1, -1]) { const px = x + dy * s, py = y + dx * s;
        if (ai24Block(px, py) || isDoorChar(map[py][px]) || !walkableForEnemy(px, py) || ai24Block(px + dx, py + dy)) continue;
        L.push(x, y, dx, dy, px, py); } // båda sidorna: den som vetter mot spelaren väljs med siktkontrollen
    }
  }
  AI24.cov = Int16Array.from(L); AI24.st.cover = L.length / 6;
  const bw = AI24.bw = Math.ceil(mw / 8), bh = AI24.bh = Math.ceil(mh / 8), B = AI24.covB = Array.from({ length: bw * bh }, () => []);
  for (let i = 0; i < L.length; i += 6) B[(L[i + 1] >> 3) * bw + (L[i] >> 3)].push(i);
}
function ai24Frame(dt) { // en gång per bildruta före fiendeloopen: budget, poletter, sensorer om spelaren och truppkoordinatorn
  if (AI24.err) return;
  try {
    if (AI24.map !== map) ai24Level();
    AI24.wPrev[0] = AI24.wCur[0]; AI24.wPrev[1] = AI24.wCur[1]; AI24.wCur[0] = AI24.wCur[1] = 0;
    AI24.los = 8; AI24.picks = 2; AI24.fields = 2; AI24.clock = cmode('clock'); AI24.fr = (AI24.fr + 1) | 0; // siktkontroller och skyddsval per bildruta, delas av alla fiender
    ai24Prune(AI24.tm); ai24Prune(AI24.tr);
    const st = AI24.still; if (Math.hypot(P.x - st.x, P.y - st.y) > 1.2) { st.x = P.x; st.y = P.y; st.t = 0; } else st.t += dt;
    const rel = WS.state === 'reload'; if (rel && !AI24.reload) ai24Reload(); AI24.reload = rel;
    if ((AI24.sqT -= dt) <= 0) { AI24.sqT = 0.5; ai24Squads(); }
  } catch (err) { AI24.err = String((err && err.stack) || err).slice(0, 500); }
}
// --- attackpoletter ---
function ai24Pool(e) { return e.d.melee ? AI24.tm : AI24.tr; }
function ai24Limit(melee) { const k = [-1, 0, 1, 2, -1][settings.diff] || 0; return clamp(2 + Math.floor(((run && run.depth) || 1) / 2) + k, 1, 7); } // lätt och berättelse: färre samtidigt
function ai24Prune(pool) { for (let i = pool.length - 1; i >= 0; i--) { const o = pool[i]; if (o.dead || (o.a24tokT || 0) <= tmr) pool.splice(i, 1); } }
function ai24Wait(e, dt) { e.a24wait = (e.a24wait || 0) + dt; const k = e.d.melee ? 0 : 1, w = e.a24wait + ((e.a24prio || 0) > tmr ? 2 : 0); if (w > AI24.wCur[k]) AI24.wCur[k] = w; }
function ai24Room(e) { const k = e.d.melee ? 0 : 1, w = (e.a24wait || 0) + ((e.a24prio || 0) > tmr ? 2 : 0); return ai24Pool(e).length < ai24Limit(!!e.d.melee) && w >= AI24.wPrev[k] - 0.6; } // den som väntat längst går först
function ai24Gate(e, dt) { // true = fienden får anfalla nu
  if ((e.a24tokT || 0) > tmr) return true;
  ai24Wait(e, dt);
  const forced = !!e.a24force;
  if (!forced && !ai24Room(e)) return false;
  ai24Grant(e, 0, forced);
  return true;
}
function ai24Grant(e, extra, forced) { // polett: hålls under anfallet (plus extra tid att gå fram); väntetiden nollställs först när anfallet börjar
  const pool = ai24Pool(e), fr = enemyFrames[e.type], dur = fr && fr.attack ? fr.attack.length / (e.d.atkFps || 10) : 0.6;
  e.a24tokT = tmr + dur + (e.d.melee ? 0.3 : 0.45) + extra; e.a24forced = forced; if (!pool.includes(e)) pool.push(e); e.a24force = false;
  if (forced) AI24.st.forced++; else AI24.st.granted++;
  let n = 0; for (const o of pool) if (!o.a24forced) n++; const key = e.d.melee ? 'maxM' : 'maxR'; if (n > AI24.st[key]) AI24.st[key] = n;
  if (!e.d.melee && !extra && !settings.lowfx && fx.hit) particles.push({ x: e.x, y: e.y, z: e.d.size * 0.55, vx: 0, vy: 0, vz: 0, life: 0.3, maxLife: 0.3, frames: fx.hit, img: fx.hit[0], size: 0.3, add: true, tint: [255, 190, 110] }); // telegraf: glöd före skottet
  return true;
}
// --- rörelse ---
function ai24Step(e, a, s) {
  const nx = e.x + Math.cos(a) * (s + 0.3), ny = e.y + Math.sin(a) * (s + 0.3), ix = nx | 0, iy = ny | 0;
  if (ix < 0 || iy < 0 || ix >= mw || iy >= mh || !walkableForEnemy(ix, iy) || voidAt(nx, ny) || deepAt(nx, ny)) return; // inte ut i lava, fällor, tomrum eller djupvatten
  tryMove(e, Math.cos(a) * s, Math.sin(a) * s, 0.28);
}
function ai24Walk(e, tx, ty, dt, k) { // gå mot en punkt (som den gamla koden: vrid åt sidorna om det tar stopp); returnerar sträckan
  const ox = e.x, oy = e.y, d = Math.hypot(tx - e.x, ty - e.y), a = Math.atan2(ty - e.y, tx - e.x);
  const s = Math.min(d, e.d.speed * diff().speed * dt * k * (e.slow > 0 ? 0.5 : 1) * (e.haste > 0 ? 1.45 : 1));
  if (s > 1e-5) { ai24Step(e, a, s); if (Math.hypot(e.x - ox, e.y - oy) < s * 0.3) ai24Step(e, a + 1.2, s); if (Math.hypot(e.x - ox, e.y - oy) < s * 0.3) ai24Step(e, a - 1.2, s); }
  for (const o of ents) if (o !== e && !o.dead && Math.abs(o.x - e.x) < 1.25 && Math.abs(o.y - e.y) < 1.25) pushOut(e, o.x, o.y, o.boss ? 1.2 : 0.55); // snabb ruta först: knuffen når högst 1,2
  e.mvx = e.x - ox; e.mvy = e.y - oy; e.state = 'move';
  return Math.hypot(e.mvx, e.mvy);
}
function ai24Hold(e) { e.state = 'move'; e.mvx = 0; e.mvy = 0; } // står still (som den gamla koden: ingen knuff)
function ai24Field(sx, sy, maxN, block) { // avståndsfält (BFS) från en ruta, högst maxN rutor; block(x, y) spärrar extra rutor
  if (sx < 0 || sy < 0 || sx >= mw || sy >= mh || !walkableForEnemy(sx, sy) || AI24.fields <= 0) return null; // högst två fält per bildruta
  AI24.fields--; AI24.st.fields++;
  const F = new Int16Array(mw * mh).fill(-1), q = new Int32Array(maxN + 1); let h = 0, t = 0; F[sy * mw + sx] = 0; q[t++] = sy * mw + sx;
  while (h < t) {
    const c = q[h++], x = c % mw, y = (c / mw) | 0;
    for (const [dx, dy] of AI24_D4) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= mw || ny >= mh) continue;
      const n = ny * mw + nx; if (F[n] >= 0 || !walkableForEnemy(nx, ny) || (block && block(nx, ny))) continue;
      const dd = doors[nx + ',' + ny]; if (dd && (dd.oneway || dd.arena) && dd.open < 0.85) continue; // stängda enkelriktade dörrar och arenadörrar
      F[n] = F[c] + 1; if (t < maxN) q[t++] = n;
    }
  }
  return F;
}
function ai24Follow(e, F, dt, k) { // följ ett eget avståndsfält ned mot målet (e.a24tx/ty); false = ingen väg
  const cx = e.x | 0, cy = e.y | 0, v0 = F[cy * mw + cx];
  if (v0 === 0) { ai24Walk(e, e.a24tx, e.a24ty, dt, k); return true; }
  let best = v0, bx = -1, by = -1;
  for (const [dx, dy] of AI24_D4) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= mw || ny >= mh) continue; const v = F[ny * mw + nx]; if (v >= 0 && (best < 0 || v < best)) { best = v; bx = nx; by = ny; } }
  if (bx < 0) return false;
  const d = doors[bx + ',' + by]; if (d && !d.gate && !d.secret && !d.arena && d.target === 0 && !d.oneway) { d.target = 1; play('door', 0.5, 1, { x: bx + 0.5, y: by + 0.5 }); }
  ai24Walk(e, bx + 0.5, by + 0.5, dt, k); return true;
}
// --- roller ---
function ai24Role(e, role, ttl) { if (e.a24role !== role) { AI24.st.plans++; AI24.st.roles[role] = (AI24.st.roles[role] || 0) + 1; } e.a24role = role; e.a24roleT = tmr + ttl; }
function ai24Drop(e) { e.a24role = null; e.a24roleT = 0; e.a24f = null; e.a24arr = false; }
function ai24Release(e) { if (e.a24cov != null && AI24.cov) AI24.taken.delete(AI24.cov[e.a24cov + 1] * mw + AI24.cov[e.a24cov]); e.a24cov = null; e.a24cs = null; }
function ai24Bark(e, text, prio) { // korta repliker som förklarar vad fienden gör – sparsamt, högst en per 3–4 s (viktiga: en per 1,5 s)
  if (!e || e.dead || !AI24_DEF[e.type] || !AI24_DEF[e.type].talk || (AI24.barkT > tmr && !(prio && tmr - (AI24.lastBark || -9) > 1.5))) return false;
  AI24.barkT = tmr + rnd(3, 4); AI24.lastBark = tmr; numbers.push({ x: e.x, y: e.y, z: 1.05, v: text, color: '#ffe3a0', crit: false, t: 1.8 }); if (!v251Voice(e, text)) play(e.d.growl, 0.5, rnd(1.05, 1.25), { x: e.x, y: e.y }); // version 25.1: rösten
  const b = AI24.st.barks; b.push({ t: +tmr.toFixed(2), text, type: e.type }); if (b.length > 12) b.shift();
  return true;
}
function ai24Squads() { // truppkoordinatorn: alerterade fiender nära varandra bildar trupp och får roller
  for (const e of ents) { const tac = !e.dead && ai24Tac(e); // roller och skydd som inte längre gäller (död, inte larmad, blev minion/elit eller bråkar)
    if (e.a24role && (e.dead || !e.alert || e.a24roleT < tmr || (!tac && e.a24role !== 'suppress'))) ai24Drop(e); if (e.a24cov != null && (e.dead || !e.alert || !tac)) ai24Release(e); }
  const L = []; let dead = 0;
  for (const e of ents) { if (e.dead) { if (AI24_DEF[e.type] && !e.boss) dead++; continue; } if (e.alert && !e.boss && !e.dormant && Math.abs(e.x - P.x) < 18 && Math.abs(e.y - P.y) < 18) L.push(e); }
  if (dead > AI24.dead) { const w = L.find(o => AI24_DEF[o.type] && (o.lostT || 0) < 2); if (w) ai24Bark(w, 'MAN NERE!'); } AI24.dead = dead;
  const mark = new Set(), sq = [];
  for (const e of L) { if (mark.has(e)) continue; const g = [e]; mark.add(e);
    for (let h = 0; h < g.length; h++) for (const o of L) if (!mark.has(o) && Math.abs(o.x - g[h].x) < 8 && Math.abs(o.y - g[h].y) < 8 && Math.hypot(o.x - g[h].x, o.y - g[h].y) < 8) { mark.add(o); g.push(o); }
    sq.push(g); }
  AI24.squads = sq.map(g => g.length);
  for (const g of sq) ai24Orders(g);
  r25Squads(sq); // version 25: befälhavare, sköldvakter och granatkastare per trupp (granaten före eldkrukan: de delar nedkylning)
  ai24Press(L);
}
function ai24Orders(g) {
  let seen = 0, lk = null;
  for (const e of g) { const lt = e.lostT || 0; if (lt < 1.5) seen++; if (e.lx !== undefined && (!lk || lt < lk.lt)) lk = { x: e.lx, y: e.ly, lt }; }
  const tac = g.filter(ai24Tac);
  if (!seen) { // SÖK: ingen i truppen ser spelaren – sprid ut runt den senast kända platsen (de vet bara vad de sett)
    if (!lk || lk.lt < 2.5 || lk.lt > 9) return;
    const need = tac.filter(e => e.a24role !== 'search'); if (!need.length) return;
    const F = ai24Field(lk.x | 0, lk.y | 0, 1600, null); if (!F) return;
    let k = 0, talker = null;
    for (const e of need) { ai24Release(e); ai24Role(e, 'search', 8); e.a24f = F; e.a24lkx = lk.x; e.a24lky = lk.y; ai24SearchPoint(e, (k++ / need.length) * TAU); if (!talker && AI24_DEF[e.type]) talker = e; }
    AI24.st.searches++; if (talker) ai24Bark(talker, 'VAR ÄR HAN?', true);
    return;
  }
  for (const e of g) if (e.a24role === 'search') ai24Drop(e);
  let sup = 0; // UNDERTRYCK: en–två skyttar som ser spelaren går före i polettkön
  for (const e of g) if (!e.d.melee && (e.lostT || 0) < 1 && sup < 2 && e.a24role !== 'flank') { ai24Role(e, 'suppress', 1.2); e.a24prio = tmr + 1; sup++; }
  for (const e of tac) if (!e.a24role && AI24_DEF[e.type] && AI24_DEF[e.type].cover) ai24Role(e, 'advance', 1.2); // AVANCERA: övriga skyttar flyttar fram mellan skydd
  if (g.length >= 3 && AI24.flankT < tmr && !g.some(e => e.a24role === 'flank')) { // FLANK: en närstridare tar en annan väg
    const c = g.filter(e => ai24CanFlank(e) && Math.hypot(e.x - P.x, e.y - P.y) > 3.5 && Math.hypot(e.x - P.x, e.y - P.y) < 13);
    if (c.length) AI24.flankT = tmr + 3; // misslyckas det (ingen väg, t.ex. bakom en låst dörr) dröjer nästa försök
    for (const e of c) if (ai24StartFlank(e, g)) { AI24.flankT = tmr + rnd(7, 10); const w = g.find(o => o !== e && AI24_DEF[o.type] && AI24_DEF[o.type].talk); if (!ai24Bark(e, 'FLANKERA!') && w) ai24Bark(w, 'TÄCK MIG!'); break; }
  }
}
function ai24SearchPoint(e, a) { // en fri punkt nära den senast kända platsen
  for (let i = 0; i < 6; i++) { const r = rnd(1.2, 3.2), x = e.a24lkx + Math.cos(a) * r, y = e.a24lky + Math.sin(a) * r;
    if (!solid(x, y) && walkableForEnemy(x | 0, y | 0) && !voidAt(x, y) && !deepAt(x, y)) { e.a24tx = x; e.a24ty = y; return; } a += 1.1; }
  e.a24tx = e.a24lkx; e.a24ty = e.a24lky;
}
function ai24StartFlank(e, g) { // en punkt vid sidan av spelaren; avståndsfältet spärrar den direkta vägen så att flankeraren går runt
  let cx = 0, cy = 0; for (const o of g) { cx += o.x; cy += o.y; } cx /= g.length; cy /= g.length;
  const base = Math.atan2(cy - P.y, cx - P.x), sides = Math.random() < 0.5 ? [1, -1] : [-1, 1];
  const ex = e.x, ey = e.y, vx = P.x - ex, vy = P.y - ey, L2 = vx * vx + vy * vy || 1;
  const direct = (x, y) => { const px = x + 0.5, py = y + 0.5, t = clamp(((px - ex) * vx + (py - ey) * vy) / L2, 0, 1), qx = ex + vx * t - px, qy = ey + vy * t - py;
    return qx * qx + qy * qy < 1.6 * 1.6 && Math.hypot(px - ex, py - ey) > 1.6 && Math.hypot(px - P.x, py - P.y) > 1.8; };
  for (const pass of [0, 1]) for (const s of sides) for (const r of [3.2, 2.4, 4.2]) {
    const a = base + s * 1.75, fx0 = P.x + Math.cos(a) * r, fy0 = P.y + Math.sin(a) * r, ix = fx0 | 0, iy = fy0 | 0;
    if (ix < 1 || iy < 1 || ix >= mw - 1 || iy >= mh - 1 || solid(fx0, fy0) || !walkableForEnemy(ix, iy)) continue;
    const F = ai24Field(ix, iy, 2400, pass === 0 ? direct : null); if (!F || F[(ey | 0) * mw + (ex | 0)] < 0) continue;
    ai24Release(e); ai24Role(e, 'flank', 7); e.a24f = F; e.a24tx = fx0; e.a24ty = fy0; e.a24fp = 0;
    AI24.st.flanks++; AI24.st.flankPath = [[+ex.toFixed(2), +ey.toFixed(2)]]; AI24.st.flankInfo = { from: [+ex.toFixed(2), +ey.toFixed(2)], to: [+fx0.toFixed(2), +fy0.toFixed(2)], player: [+P.x.toFixed(2), +P.y.toFixed(2)], alt: pass === 0, type: e.type };
    return true;
  }
  return false;
}
function ai24Press(L) { // spelaren står still bakom skydd: kasta något som tvingar ut honom, eller skicka två flankerare
  if (AI24.still.t < 4 || AI24.pressT > tmr) return;
  let near = 0, see = 0; for (const e of L) { if (Math.hypot(e.x - P.x, e.y - P.y) > 12) continue; near++; if ((e.lostT || 0) < 0.8) see++; }
  if (!near || see * 2 > near) return; // de flesta ser spelaren: han står inte bakom skydd
  AI24.pressT = tmr + rnd(6, 8); AI24.st.press++;
  const t = L.find(e => AI24_DEF[e.type] && AI24_DEF[e.type].nade && !ai24Exempt(e) && e.state !== 'pain' && e.lx !== undefined && Math.hypot(e.x - P.x, e.y - P.y) < 11 && Math.hypot(e.lx - P.x, e.ly - P.y) < 3 && lobLen(e, e.lx, e.ly) >= 2.5); // version 25.1: krukan landar före väggen – inte vid kastarens fötter
  if (t) { lobShot(t, t.lx, t.ly, { dmg: t.d.dmg * 0.7 * (1 + 0.1 * (run.depth - 1)), r: 1.3, T: 1.2, kind: 'flask', fx: 'fire' }); t.state = 'attack'; t.t = 0; t.didHit = true; play('whoosh', 0.6, 0.7, { x: t.x, y: t.y });
    AI24.st.flush++; if (!ai24Bark(t, 'UT MED DIG!')) spawnText(t.x, t.y, '!', '#ff9050'); return; }
  let n = 0, w = null; for (const e of L) if (n < 2 && ai24CanFlank(e) && e.a24role !== 'flank' && Math.hypot(e.x - P.x, e.y - P.y) < 14 && ai24StartFlank(e, L)) { n++; if (!w && AI24_DEF[e.type]) w = e; }
  if (n) { AI24.flankT = tmr + 6; if (w) ai24Bark(w, 'FLANKERA!'); }
}
function ai24Reload() { // sensorn hör omladdningen: närstridare i närheten som ser spelaren rusar fram
  let n = 0, w = null;
  for (const e of ents) { if (e.dead || !e.alert || !e.d.melee || ai24Exempt(e) || (e.lostT || 0) > 1.5 || Math.hypot(e.x - P.x, e.y - P.y) > 9) continue;
    e.haste = Math.max(e.haste || 0, 1.6); e.a24prio = tmr + 1.6; e.a24hoverT = 0; n++; if (!w && AI24_DEF[e.type]) w = e; }
  if (n) { AI24.st.rush++; if (w) ai24Bark(w, 'HAN LADDAR OM!', true); }
}
// --- per fiende (anropas från updateEnemy efter den egna ENEMY_AI) ---
function ai24Tick(e, dt, dist, los) { // true = AI24 skötte bildrutan
  if (AI24.err || AI24.map !== map || e.boss) return false;
  try {
    if (e.state === 'attack') { e.a24idle = 0; e.a24hoverT = 0; if (e.a24cs === 'peek') e.a24cs = 'fire'; if (!e.a24atk) { e.a24shots = (e.a24shots || 0) + 1; e.a24wait = 0; } e.a24atk = true; e.a24atkT = tmr; return false; }
    e.a24atk = false;
    if (e.state === 'pain' || (e.a24coolT || 0) > tmr) return false;
    const inR = los && dist < e.d.range, hold = (e.a24tokT || 0) > tmr, hover = los && dist < 6 && !hold && ((e.a24hoverT || 0) > tmr || (e.a24wait || 0) > 0 // väntar på polett så länge den ser spelaren på nära håll
      || (dist < 2 && tmr - (e.a24atkT ?? -9) < 1.5 && AI24.wPrev[e.d.melee ? 0 : 1] > 0.5 && !(inR && e.cd - dt <= 0))); // har just anfallit och andra väntar: backa och ge plats
    if (inR || hover) e.a24idle = (e.a24idle || 0) + dt * (inR ? 1 : 0.6); else if (!e.a24role && !e.a24cs) e.a24idle = Math.max(0, (e.a24idle || 0) - dt);
    if (e.a24idle > (e.a24cap || (e.a24cap = rnd(3, 4.2)))) { // vakthunden: aldrig längre än så utan att få anfalla – tillbaka till den gamla koden med en polett
      ai24Drop(e); ai24Release(e); e.a24force = true; e.a24hoverT = 0; e.a24idle = 0; e.a24coolT = tmr + 2.5; AI24.st.watchdog++; return false;
    }
    const tac = ai24Tac(e), o = AI24_DEF[e.type];
    if ((e.r25g || e.r25hesT) && r25Tick(e, dt, dist)) return true; // version 25: sköldvakten och tvekan när befälet dör
    if (tac && e.a24role === 'search') return ai24SearchTick(e, dt, los);
    if (tac && e.a24role === 'flank' && ai24FlankTick(e, dt, dist, los)) return true;
    if (tac && o && o.cover && (e.a24shots || 0) > 0 && e.a24role !== 'flank' && ai24CoverTick(e, dt, dist, los)) { e.cd -= dt; return true; }
    const ready = inR && e.cd - dt <= 0;
    if (!ready && !hover) return false;
    if (ready && ai24Gate(e, dt)) { e.a24hoverT = 0; return false; } // polett: den gamla koden anfaller
    if (!ready && ai24Room(e)) { e.a24hoverT = 0; ai24Grant(e, 1.3, false); return false; } // en polett är ledig: ta den och gå fram igen
    e.a24hoverT = tmr + 0.6; // fortsätter hota (i stället för att gå fram) tills en polett blir ledig
    if (!ready) ai24Wait(e, dt);
    ai24Threaten(e, dt, dist); e.cd -= dt; return true;
  } catch (err) { AI24.err = String((err && err.stack) || err).slice(0, 500); return false; }
}
function ai24Threaten(e, dt, dist) { // utan polett: håll avståndet, gå i sidled, hota
  if (e.a24par === undefined) e.a24par = Math.random() < 0.5 ? 0 : 1;
  if ((AI24.fr & 1) !== e.a24par) return; // varannan bildruta (med dubbla steget): halva kostnaden för de många som väntar
  dt *= 2;
  if (!e.a24side || Math.random() < dt * 0.4) e.a24side = Math.random() < 0.5 ? 1 : -1;
  const a = Math.atan2(P.y - e.y, P.x - e.x), want = e.d.melee ? e.d.range + 0.9 : Math.min(dist, e.d.range * 0.8), rad = clamp((dist - want) * 1.2, -1, 1);
  if (e.a24ph === undefined) e.a24ph = rnd(0, TAU);
  if (Math.abs(rad) < 0.4 && Math.sin(tmr * 2.4 + e.a24ph) < -0.3) { ai24Hold(e); return; } // stannar till ibland och hotar (och sparar tid per bildruta)
  const mx = Math.cos(a) * rad - Math.sin(a) * e.a24side * 0.8, my = Math.sin(a) * rad + Math.cos(a) * e.a24side * 0.8;
  if (ai24Walk(e, e.x + mx, e.y + my, dt, e.d.melee ? 0.75 : 0.55) < 1e-4) e.a24side = -e.a24side;
}
function ai24FlankTick(e, dt, dist, los) {
  if (!e.a24f || Math.hypot(e.a24tx - e.x, e.a24ty - e.y) < 0.8 || (los && dist < 2.2)) { ai24Drop(e); e.a24prio = tmr + 2; return false; } // framme: anfall
  if (!ai24Follow(e, e.a24f, dt, 1.1)) { ai24Drop(e); return false; }
  if ((e.a24fp = (e.a24fp || 0) + dt) > 0.25) { e.a24fp = 0; const p = AI24.st.flankPath; if (p.length < 60) p.push([+e.x.toFixed(2), +e.y.toFixed(2)]); }
  e.cd -= dt; return true;
}
function ai24SearchTick(e, dt, los) {
  if (los) { ai24Drop(e); ai24Bark(e, 'DÄR ÄR HAN!'); return false; }
  e.cd -= dt;
  if (!e.a24arr) { const F = e.a24f, v = F ? F[(e.y | 0) * mw + (e.x | 0)] : -1; if (v >= 0 && v <= 2) e.a24arr = true; else if (!F || !ai24Follow(e, F, dt, 0.8)) e.a24arr = true; return true; }
  if ((e.a24wT || 0) === 0 && Math.hypot(e.a24tx - e.x, e.a24ty - e.y) > 0.4) { if (ai24Walk(e, e.a24tx, e.a24ty, dt, 0.7) < 1e-4) e.a24wT = tmr + 0.5; return true; }
  if (!e.a24wT) e.a24wT = tmr + rnd(0.8, 1.6);
  ai24Hold(e); if (Math.random() < dt * 1.2) spawnText(e.x, e.y, '?', '#e8d9b0');
  if (tmr > e.a24wT) { e.a24wT = 0; ai24SearchPoint(e, rnd(0, TAU)); }
  return true;
}
function ai24PickCover(e, adv) { // en skyddspunkt som skymmer från spelaren men har skottlinje efter ett sidosteg; -1 = ingen siktbudget kvar
  const C = AI24.cov; if (!C || !C.length || e.lx === undefined) return null;
  const tx = e.lx, ty = e.ly, R = 7, rng = Math.min(e.d.range || 8, 10), cur = Math.hypot(e.x - tx, e.y - ty), ex = e.x | 0, ey = e.y | 0, cand = [];
  for (let by = Math.max(0, (ey - R) >> 3); by <= Math.min(AI24.bh - 1, (ey + R) >> 3); by++) for (let bx = Math.max(0, (ex - R) >> 3); bx <= Math.min(AI24.bw - 1, (ex + R) >> 3); bx++)
    for (const i of AI24.covB[by * AI24.bw + bx]) {
      const cx = C[i] + 0.5, cy = C[i + 1] + 0.5, de = Math.hypot(cx - e.x, cy - e.y); if (de > R) continue;
      const vx = tx - cx, vy = ty - cy, dp = Math.hypot(vx, vy); if (dp < 2.5 || dp > rng) continue;
      if ((vx * C[i + 2] + vy * C[i + 3]) / dp < 0.75) continue; // skyddet ska ligga mellan punkten och spelaren
      if (Math.hypot(tx - C[i + 4] - 0.5, ty - C[i + 5] - 0.5) > dp + 0.05) continue; // sidosteget mot spelarens sida
      if (AI24.taken.has(C[i + 1] * mw + C[i]) || (e.a24bad === i && (e.a24badT || 0) > tmr)) continue;
      if (adv && dp > cur - 1.5) continue;
      const sc = -de * 0.6 - Math.abs(dp - Math.min(rng * 0.7, 7)) * 0.4 + (adv ? (cur - dp) * 0.8 : 0) + Math.random() * 0.3; // de tre bästa, utan sortering
      if (cand.length < 6) cand.push(sc, i); else { let w = 0; for (let k = 2; k < 6; k += 2) if (cand[k] < cand[w]) w = k; if (sc > cand[w]) { cand[w] = sc; cand[w + 1] = i; } }
    }
  for (let n = 0; n < cand.length / 2; n++) {
    let b = -1; for (let k = 0; k < cand.length; k += 2) if (cand[k] > -1e9 && (b < 0 || cand[k] > cand[b])) b = k; if (b < 0) break;
    if (AI24.los < 3) { AI24.st.losDeferred++; return -1; }
    const i = cand[b + 1]; cand[b] = -2e9; const cx = C[i] + 0.5, cy = C[i + 1] + 0.5, ox = (C[i + 4] - C[i]) * 0.2, oy = (C[i + 5] - C[i + 1]) * 0.2; AI24.los -= 3; AI24.st.losUsed += 3;
    if (!hasLOS(cx, cy, tx, ty) && !hasLOS(cx + ox, cy + oy, tx, ty) && hasLOS(C[i + 4] + 0.5, C[i + 5] + 0.5, tx, ty)) return i; // skymd även en bit ut mot kanten
  }
  return null;
}
function ai24CoverTick(e, dt, dist, los) { // gå till skydd → göm dig → kliv ut och skjut → tillbaka; false = gamla koden sköter bildrutan
  const C = AI24.cov;
  if (e.a24cov == null) {
    if ((e.a24coverT || 0) > tmr) return false;
    if (AI24.picks <= 0) { e.a24coverT = tmr + rnd(0.1, 0.25); return false; } // högst två skyddsval per bildruta
    AI24.picks--;
    const i = ai24PickCover(e, e.a24role === 'advance' && (e.a24cyc || 0) >= 2);
    if (i === -1) { e.a24coverT = tmr + rnd(0.1, 0.25); return false; } // ingen siktbudget kvar den här bildrutan
    if (i === null) { e.a24coverT = tmr + rnd(1.5, 2.5); return false; }
    e.a24cov = i; AI24.taken.add(C[i + 1] * mw + C[i]); e.a24cs = 'go'; e.a24csT = 0; e.a24cyc = 0; AI24.st.coverUse++;
    e.a24goT = Math.hypot(C[i] + 0.5 - e.x, C[i + 1] + 0.5 - e.y) / Math.max(0.3, e.d.speed * diff().speed) * 1.7 + 1.2; // tid att komma fram
    if (Math.random() < 0.4) ai24Bark(e, 'I SKYDD!');
  }
  const i = e.a24cov, cx = C[i] + 0.5, cy = C[i + 1] + 0.5, px = C[i + 4] + 0.5, py = C[i + 5] + 0.5;
  e.a24csT += dt;
  if (e.a24cs === 'go' || e.a24cs === 'fire' || e.a24cs === 'back') {
    if (e.a24cs === 'fire') { e.a24cs = 'back'; e.a24csT = 0; e.a24cyc = (e.a24cyc || 0) + 1; }
    if (Math.hypot(cx - e.x, cy - e.y) < 0.2) { e.a24cs = 'hide'; e.a24csT = 0; e.a24hideT = rnd(0.7, 1.5); ai24Hold(e); return true; }
    if (e.a24csT > (e.a24cs === 'go' ? e.a24goT || 3.5 : 3)) { e.a24bad = i; e.a24badT = tmr + 6; ai24Release(e); e.a24coverT = tmr + 1; return false; } // kommer inte fram
    ai24Walk(e, cx, cy, dt, 1); return true;
  }
  if (e.a24cs === 'hide') {
    if (los && e.a24csT > 0.4) { ai24Release(e); e.a24coverT = tmr + 1.2; return false; } // spelaren ser in bakom skyddet: välj ett nytt
    ai24Hold(e);
    if (e.a24csT > e.a24hideT) { if (e.a24role === 'advance' && e.a24cyc >= 2) { ai24Release(e); return false; } e.a24cs = 'peek'; e.a24csT = 0; e.a24pk = 0; }
    return true;
  }
  // peek: kliv ut, skjut när du har polett, kliv tillbaka
  if (!e.a24pk && Math.hypot(px - e.x, py - e.y) > 0.25) { if (e.a24csT > 3) { e.a24cs = 'back'; e.a24csT = 0; } else ai24Walk(e, px, py, dt, 1); return true; }
  if (!e.a24pk) e.a24pk = tmr; // ute: väntar på skottlinje, laddning och polett
  ai24Hold(e);
  if (los && dist < e.d.range && e.cd - dt <= 0 && ai24Gate(e, dt)) { AI24.st.peeks++; e.a24cs = 'peek'; return false; } // gamla koden skjuter; nästa bildruta är det 'attack'
  if (tmr - e.a24pk > 1.8) { e.a24cs = 'back'; e.a24csT = 0; e.a24cyc = (e.a24cyc || 0) + 1; }
  return true;
}
function ai24Api() { // window.__game.ai: tillstånd och statistik för t112
  return { on: () => settings.smartAI !== false && !AI24.err, err: () => AI24.err, st: () => AI24.st, def: AI24_DEF, limit: m => ai24Limit(!!m),
    tokens: () => ({ m: AI24.tm.length, r: AI24.tr.length, mFree: AI24.tm.filter(o => !o.a24forced).length, rFree: AI24.tr.filter(o => !o.a24forced).length, wait: AI24.wPrev.slice() }),
    roles: () => { const r = {}; for (const e of ents) if (!e.dead && e.a24role) r[e.a24role] = (r[e.a24role] || 0) + 1; return r; },
    cover: () => (AI24.cov ? AI24.cov.length / 6 : 0), covers: () => (AI24.cov ? Array.from(AI24.cov) : []), squads: () => AI24.squads.slice(), still: () => AI24.still.t,
    of: e => ({ role: e.a24role || null, cs: e.a24cs || null, cov: e.a24cov == null ? null : [AI24.cov[e.a24cov], AI24.cov[e.a24cov + 1], AI24.cov[e.a24cov + 4], AI24.cov[e.a24cov + 5]], idle: e.a24idle || 0, tok: (e.a24tokT || 0) > tmr, shots: e.a24shots || 0, tac: ai24Tac(e) }),
    level: () => ai24Level(), los: (ax, ay, bx, by) => hasLOS(ax, ay, bx, by),
    bench: (frames, smart) => { // fiendeloopen (som i update) med klockan framåt; ms per bildruta
      const was = settings.smartAI; settings.smartAI = smart !== false; const dt = 1 / 60, t0 = performance.now();
      for (let f = 0; f < frames; f++) { tmr += dt; if (settings.smartAI !== false) ai24Frame(dt); for (const e of ents) try { if (e.boss) updateBoss(e, dt); else updateEnemy(e, dt); } catch (err) { /* som i update */ } }
      const ms = (performance.now() - t0) / frames; settings.smartAI = was; return ms; } };
}
