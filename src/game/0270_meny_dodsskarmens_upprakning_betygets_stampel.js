// ---------- MENY: dödsskärmens uppräkning, betygets stämpel och toningen mellan våningar ----------
const MF = { lv: null, n: 0, stamps: 0 };
function menyCount(o) { // VÅNING, FIENDER och TID räknas upp efter att DU DOG slagit in
  if (!o.cnt) return; const k = settings.reduceMotion ? 1 : clamp(((performance.now() - o.t0) / 1000 - 0.5) / 0.7, 0, 1), e = 1 - (1 - k) * (1 - k) * (1 - k);
  const v = [String(Math.round(o.cnt[0] * e)), String(Math.round(o.cnt[1] * e)), fmtTime(o.cnt[2] * e)], s = v.join('|'); if (s === o.cs) return; o.cs = s;
  ['ro-depth', 'ro-kills', 'ro-time'].forEach((id, i) => { const el = document.getElementById(id); if (el) { el.textContent = v[i]; if (k >= 1) el.classList.add('tick'); else el.classList.remove('tick'); } });
}
function menyStamp(g) { // rutan skakar och en liten skur gnistor i betygets färg flyger ut
  MF.stamps++; if (settings.reduceMotion) return;
  const body = g.closest('.fe-body'); if (body && (settings.shake ?? 1) > 0) { body.classList.remove('stamp'); void body.offsetWidth; body.classList.add('stamp'); }
  if (settings.lowfx) return; const box = g.parentElement; if (!box) return;
  box.querySelectorAll('.fe-spark').forEach(s => s.remove());
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + Math.random() * 0.4, d = 50 + Math.random() * 50, s = document.createElement('i'); s.className = 'fe-spark';
    s.style.cssText = `--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d * 0.8)}px;--c:${i % 3 ? (g.style.color || '#ffd24a') : '#fff4c0'}`; box.appendChild(s); }
  setTimeout(() => box.querySelectorAll('.fe-spark').forEach(s => s.remove()), 1100);
}
function menyWatch() { // en ny våning (eller runda) har startat: kort toning från svart
  const rm = !!settings.reduceMotion; if (rm !== MF.rm) { MF.rm = rm; document.body.classList.toggle('meny-rm', rm); }
  const nf = !!settings.noFlash; if (nf !== MF.nf) { MF.nf = nf; document.body.classList.toggle('meny-nf', nf); } // inga blixtar i DOM-skärmarna heller // spelets "minskad rörelse" stänger av CSS-animationerna (cards.css, index.html)
  if (state !== MF.st) { MF.prev = MF.st; MF.st = state; MF.stT = performance.now(); if (state === 'stats' && MF.prev === 'play') { MF.exitT = MF.stT; const fe = document.getElementById('floorend'); if (fe) { fe.classList.add('exitflash'); setTimeout(() => fe.classList.remove('exitflash'), 600); } } } // blixten bara när man just gått ut (inte när detaljerna stängs) // tillståndsbyten: utgångens virvel, pausens toning
  if (state === 'dead' || state === 'runover' || state === 'stats') tlPregenSoon(); // startskärmens nästa bana medan skärmen står still
  if (!map || !lvl || lvl === MF.lv) return; MF.lv = lvl;
  if (settings.reduceMotion) return; const el = document.getElementById('menyfade'); if (!el) return;
  el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); MF.n++;
}
// ---------- MENY: skärmen och spelarens kropp – skadebågar, låg hälsa, upplockning, rusning, gift/eld/vatten, döden, utgången, pausen ----------
// Billigt: kanttoningarna är förritade dukar per färg (en drawImage), fartlinjerna högst 14 streck. lowfx stänger av vågorna, fartlinjerna och glöden.
const BF = { last: 0, edges: new Map(), dashK: 0, n: 0, swim: 0, dead: 0, exit: 0 };
function heartBeat() { const ph = (tmr * 1.1) % 1; return Math.exp(-ph * 16) + 0.65 * (ph > 0.22 ? Math.exp(-(ph - 0.22) * 16) : 0); } // dunk-dunk
function edgeImg(col) { let c = BF.edges.get(col); if (!c) { c = document.createElement('canvas'); c.width = W; c.height = VH; const x = c.getContext('2d'), gr = x.createRadialGradient(W / 2, HORIZON, VH * 0.3, W / 2, HORIZON, W * 0.6); gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(1, `rgba(${col},1)`); x.fillStyle = gr; x.fillRect(0, 0, W, VH); BF.edges.set(col, c); } return c; }
function edgeFx(g, col, a) { if (!(a > 0.005)) return; g.globalAlpha = Math.min(1, a); g.drawImage(edgeImg(col), 0, 0); g.globalAlpha = 1; BF.n++; }
function drawBodyFx(g) {
  const now = performance.now(), dt = Math.min(0.05, (now - BF.last) / 1000 || 0); BF.last = now;
  const fx = !settings.lowfx, rm = !!settings.reduceMotion, nf = !!settings.noFlash;
  if (state === 'play') {
    for (const h of hurtDir) { // skadan: en röd båge runt siktet åt det håll den kom ifrån, med en spets utåt
      const a = h.ang - P.a - Math.PI / 2, r = 50 + (1 - h.t) * 8, c = `rgba(${h.col || '220,0,0'},${(0.9 * h.t).toFixed(3)})`;
      g.strokeStyle = c; g.lineWidth = 3; g.beginPath(); g.arc(W / 2, HORIZON, r, a - 0.34, a + 0.34); g.stroke(); g.lineWidth = 1;
      g.fillStyle = c; g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * (r + 8), HORIZON + Math.sin(a) * (r + 8)); g.lineTo(W / 2 + Math.cos(a - 0.09) * (r + 1), HORIZON + Math.sin(a - 0.09) * (r + 1)); g.lineTo(W / 2 + Math.cos(a + 0.09) * (r + 1), HORIZON + Math.sin(a + 0.09) * (r + 1)); g.fill();
    }
    if (HJ.edge && HJ.edge.t > 0) { HJ.edge.t -= dt; edgeFx(g, HJ.edge.col, (nf ? 0.22 : 0.5) * HJ.edge.t / 0.5); } // upplockning: grön hälsa, blått skydd, gul ammo
    if (P.poisonT > 0) edgeFx(g, '60,210,50', 0.1 + (rm ? 0 : 0.08 * (1 + Math.sin(tmr * 4)))); // giftet pulserar
    if (P.burnFx > 0) { P.burnFx = Math.max(0, P.burnFx - dt); edgeFx(g, '255,110,20', P.burnFx * (nf ? 0.5 : 0.7 + 0.3 * Math.random())); // elden fladdrar och glöd stiger
      if (fx) { g.fillStyle = '#ffb040'; for (let i = 0; i < 10; i++) g.fillRect((Math.random() * W) | 0, (VH - Math.random() * 40 * P.burnFx * 2) | 0, 1, 2); } }
    BF.swim = P.swim ? Math.min(1, BF.swim + dt * 2) : Math.max(0, BF.swim - dt * 2);
    l29SwimPre(); // version 29 (LJUS): vågorna görs i grafikkortet, remsorna hoppas över
    if (BF.swim > 0) { if (fx && !rm) { const t0 = performance.now(); if (!BF.wcv) { BF.wcv = document.createElement('canvas'); BF.wcv.width = W; BF.wcv.height = VH; BF.wg = BF.wcv.getContext('2d'); } // en kopia av bilden, sedan remsor ur kopian (ingen självkopiering per remsa)
    l29SwimPost(); // version 29 (LJUS)
      BF.wg.drawImage(canvas, 0, 0, W, VH, 0, 0, W, VH); for (let y = 0; y < VH; y += 8) { const o = Math.round(Math.sin(tmr * 2.6 + y * 0.06) * 1.6 * BF.swim); if (o) g.drawImage(BF.wcv, 0, y, W, 8, o, y, W, 8); } const ms = performance.now() - t0; BF.waveMs = BF.waveMs ? BF.waveMs * 0.9 + ms * 0.1 : ms; } edgeFx(g, '10,40,90', 0.45 * BF.swim); } // under ytan: vågor och mörkblå kant
    const want = P.dashT > 0 || (WS.dashT || 0) > 0.15 ? 1 : 0; BF.dashK +=(want - BF.dashK) * Math.min(1, dt * (want > BF.dashK ? 18 : 6));
    if (BF.dashK > 0.04 && !rm) { // rusning (bara den och sablens utfall, inte vanlig löpning): fartlinjer i kanterna och en kort mörk kant
      if (fx) { g.strokeStyle = `rgba(255,240,220,${(0.45 * BF.dashK).toFixed(3)})`; g.beginPath(); for (let i = 0; i < 14; i++) { const a = Math.random() * TAU, r0 = 0.7 + Math.random() * 0.25, cx = Math.cos(a), cy = Math.sin(a); g.moveTo(W / 2 + cx * 160 * r0, HORIZON + cy * 110 * r0); g.lineTo(W / 2 + cx * 220, HORIZON + cy * 150); } g.stroke(); }
      edgeFx(g, '0,0,0', 0.4 * BF.dashK);
    }
  }
  if (state === 'dead') { // döden: färgen rinner ur bilden, kanten blir mörkröd och sluter sig medan kameran faller
    const k = clamp(P.deadT / 1.2, 0, 1); BF.dead = k;
    l29DeadPre(g); // version 29 (LJUS): med WebGL gråas bilden i shadern (saturation över en genomskinlig duk blir en grå hinna)
    g.globalCompositeOperation = 'saturation'; g.fillStyle = `rgba(128,128,128,${(0.85 * k).toFixed(3)})`; g.fillRect(0, 0, W, VH); g.globalCompositeOperation = 'source-over';
    l29DeadPost(g); // version 29 (LJUS)
    edgeFx(g, '70,0,0', 0.25 + 0.4 * k); edgeFx(g, '0,0,0', 0.5 * k * k); // svärtan kommer sent, så att fallet syns
  }
}
function drawExitFx(g) { // utgången: vit blixt och en virvel som vidgas när våningen är klar
  const t = (performance.now() - (MF.exitT || -1e9)) / 1000; if (t < 0 || t > 0.7) return; BF.exit++;
  if (!settings.noFlash && t < 0.35) { g.fillStyle = `rgba(255,250,235,${(0.85 * (1 - t / 0.35)).toFixed(3)})`; g.fillRect(0, 0, W, VH); }
  if (settings.reduceMotion) return; const k = 1 - t / 0.7;
  g.lineWidth = 3; for (let i = 0; i < 4; i++) { const r = 14 + t * 260 + i * 10, a0 = t * 9 + i * TAU / 4; g.strokeStyle = `rgba(${i % 2 ? '200,170,255' : '255,240,200'},${(0.8 * k).toFixed(3)})`; g.beginPath(); g.arc(W / 2, HORIZON, r, a0, a0 + 1.6); g.stroke(); } g.lineWidth = 1;
}
const MENY_API = { // window.__game.meny: tillstånd för testerna (t106)
  title: () => ({ on: titleLiveOn() && !!TL.lv, off: TL.off, why: TL.why, genMs: TL.genMs || 0, x: TL.x, y: TL.y, a: TL.a, biome: TL.biome || '', frames: TL.frames, cost: TL.cost, fade: TL.fade }),
  titleReset: () => { TL.off = false; TL.why = ''; TL.cost = 0; TL.frames = 0; },
  body: () => ({ n: BF.n, dashK: BF.dashK, swim: BF.swim, waveMs: BF.waveMs || 0, dead: BF.dead, exit: BF.exit, edge: HJ.edge ? HJ.edge.t : 0, beat: heartBeat(), pre: !!TL.pre, preMs: TL.preMs || 0 }),
  ends: () => ({ fades: MF.n, stamps: MF.stamps, sparks: document.querySelectorAll('#floorend .fe-spark').length }),
  hud: () => ({ pops: HJ.pops.map(p => p.kind + p.v), n: HJ.n, hit: HJ.hit, big: HJ.big, rel: HJ.rel, heal: HJ.heal, hpCol: HJ.hpCol, magCol: HJ.magCol }),
};
function photoFilter(g) {
  if (l29Photo()) return; // version 29 (LJUS): med WebGL görs filtret i shadern
  const f = PHOTO_FILTERS[(settings.photoFilter || 0) % PHOTO_FILTERS.length]; if (!f) return;
  g.save();
  if (f === 'svartvit') { g.globalCompositeOperation = 'saturation'; g.fillStyle = '#808080'; g.fillRect(0, 0, W, VH); }
  if (f === 'sepia') { g.globalCompositeOperation = 'saturation'; g.fillStyle = '#808080'; g.fillRect(0, 0, W, VH); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#e0b880'; g.fillRect(0, 0, W, VH); }
  if (f === 'nattseende') { g.globalCompositeOperation = 'saturation'; g.fillStyle = '#808080'; g.fillRect(0, 0, W, VH); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#60ff70'; g.fillRect(0, 0, W, VH); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(20,80,20,0.4)'; g.fillRect(0, 0, W, VH); }
  g.restore();
  const t = 'FILTER: ' + f.toUpperCase() + ' (1–4 BYTER)'; txt(t, 4, 4, '#e8d9b0', 1, true, 0.7);
}
// ---------- Version 6: känsla ----------
let feelAcc = 0;
function feelTick(dt) {
  feelAcc += dt; if (feelAcc < 0.1) return; feelAcc = 0;
  for (const e of ents) { // stora fiender och bossar skakar marken
    if (e.dead || e.dormant || !(e.boss || e.d.size >= 1.25) || !(e.mvx || e.mvy)) continue;
    const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < (e.boss ? 9 : 4.5)) { e.stepAcc = (e.stepAcc || 0) + 1; if (e.stepAcc % (e.boss ? 6 : 5) === 0) P.shake = Math.max(P.shake, (e.boss ? 0.7 : 0.3) * (1 - d / (e.boss ? 9 : 4.5))); }
  }
  for (const e of ents) if (!e.dead && e.alert && !e.dormant && !e.boss && Math.random() < 0.05) { const d = Math.hypot(e.x - P.x, e.y - P.y); if (d > 4 && d < 10 && !hasLOS(P.x, P.y, e.x, e.y)) { play('steps', 0.12, rnd(0.8, 1.1), { x: e.x, y: e.y }); break; } } // fotsteg du inte ser
  if (cellUnder() === '"' && Math.hypot(P.vx, P.vy) > 0.5 && !settings.lowfx) for (let i = 0; i < 2; i++) particles.push({ x: P.x + rnd(-0.3, 0.3), y: P.y + rnd(-0.3, 0.3), z: rnd(0.2, 0.6), vx: rnd(-0.5, 0.5), vy: rnd(-0.5, 0.5), vz: 0.3, life: 0.6, maxLife: 0.6, img: fx.hit[1], size: 0.05, tint: [220, 220, 220], drift: true }); // nätet fladdrar
  if (P.hp < maxHp() * 0.15 && P.hp > 0 && (P.hbT || 0) < tmr) { P.hbT = tmr + 1.4; play('heartbeat_fast', 0.18); }
}
// ---------- Version 7: kastknivar, stridshammare och musköt ----------
const MASTERY = [0, 5, 15, 35, 70]; // dödanden per vapenvana-nivå
const masteryLv = id => { const xp = (run && run.wxp && run.wxp[id]) || 0; let l = 0; for (let i = 0; i < MASTERY.length; i++) if (xp >= MASTERY[i]) l = i; return l; };
const masteryMul = () => 1 + masteryLv(WEAPONS[P.weapon].id) * 0.04;
function masteryKill() { // vapenvana: vapnet du dödar med blir bättre
  if (!run) return; const id = WEAPONS[P.weapon].id, lv = masteryLv(id);
  run.wxp = run.wxp || {}; run.wxp[id] = (run.wxp[id] || 0) + 1 + mod('masteryXp');
  if (masteryLv(id) > lv) { say(`VAPENVANA: ${WEAPONS[P.weapon].name} NIVÅ ${masteryLv(id)} (+${masteryLv(id) * 4} % SKADA)`, 2.5); play('mastery_up', 0.7); stat('masteryUps'); }
}
const unaware = e => !e.alert || e.sleep || !!e.stunned; // ovetande fiender
function knifeThrow(wp, base) {
  if (P.mags[P.weapon] <= 0) { if (P.ammo.knives > 0) startReload(); else if (!fireHeld) { say('INGA KNIVAR', 1); play('click', 0.5, 0.8); } return; }
  const n = up('kn_fan') ? 3 : 1;
  for (let i = 0; i < n; i++) { const a = P.a + (n > 1 ? (i - 1) * 0.09 : 0) + rnd(-1, 1) * wp.spread;
    projectiles.push({ x: P.x + Math.cos(a) * 0.35, y: P.y + Math.sin(a) * 0.35, z: 0.5, vx: Math.cos(a) * 17, vy: Math.sin(a) * 17, dmg: base, src: P, friendly: true, kind: 'knife', life: 1.6, bounces: 1, hitSet: new Set() }); }
  noise(2 * (1 - mod('noiseReduce'))); // magasinet, ljudet och väntetiden sköts redan av fire()
}
function updateKnife(p, dt) {
  for (const e of ents) {
    if (e.dead || e.dying || e.hidden || p.hitSet.has(e) || Math.hypot(e.x - p.x, e.y - p.y) > 0.3 * e.d.size * (e.boss ? 1.8 : 1)) continue;
    p.hitSet.add(e); const back = unaware(e) || behind(e), crit = (up('kn_crit') && back) || Math.random() < mod('critChance');
    const k = hurtEnemy(e, p.dmg * (crit ? 2 + mod('critDmg') : 1), p.x, p.y, { crit }); hitMark = 0.12; hitKill = hitKill || k; lvlStat.hits++; run.hits = (run.hits || 0) + 1;
    play('knife_hit', 0.5, rnd(0.9, 1.1), { x: p.x, y: p.y }); runeProc(e, p.dmg);
    if (up('kn_poison')) e.poison = Math.max(e.poison || 0, 4);
    if (k) dropItem('knifepick', e.x, e.y); else e.knivesIn = (e.knivesIn || 0) + 1; // kniven sitter kvar i fienden
    p.dead = true; return;
  }
  if (solid(p.x, p.y) || p.life <= 0) {
    const ox = p.x - p.vx * dt, oy = p.y - p.vy * dt;
    if (p.life > 0 && p.bounces > 0) { if (solid(p.x, oy)) p.vx = -p.vx * 0.6; if (solid(ox, p.y)) p.vy = -p.vy * 0.6; p.x = ox; p.y = oy; p.bounces--; play('knife_wall', 0.4, rnd(1, 1.3), { x: p.x, y: p.y }); sparks(p.x, p.y, 0.5, 2); return; }
    p.dead = true;
    if (up('kn_return')) { P.ammo.knives = Math.min(AMMO.knives.max, P.ammo.knives + 1); return; }
    if (!solid(ox, oy)) items.push({ type: 'knifepick', x: ox, y: oy, taken: false, drop: true });
  }
}
const behind = e => { if (!(e.mvx || e.mvy)) return !e.alert; let rel = Math.atan2(P.y - e.y, P.x - e.x) - Math.atan2(e.mvy, e.mvx); rel = Math.atan2(Math.sin(rel), Math.cos(rel)); return Math.abs(rel) > 2.2; }; // du står bakom fienden
function hammerSwing(wp, k) { // stridshammaren: svep, eller ett laddat slag som skakar marken
  const charged = k >= 0.7, slam = charged, r = slam ? (up('hm_quake') ? 3.6 : 2.6) : 1.9;
  WS.shot = 0; WS.cd = effDelay(wp) * (charged ? 1.3 : 1); WS.kick = 0.35; lvlStat.shots++;
  play(slam ? 'hammer_slam' : 'hammer_swing', 0.9, rnd(0.9, 1.05)); noise(slam ? 12 : 5);
  let hits = 0;
  for (const e of ents) {
    if (e.dead || e.dying || e.hidden) continue;
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
    if (d > r + e.d.size * 0.3 || (!slam && Math.abs(off) > 0.9)) continue;
    if (e.dormant) { e.hp -= 0.01; continue; }
    if (e.eshield > 0) { e.eshield = 0; spawnText(e.x, e.y, 'SKÖLDEN KROSSAD', '#a0c0ff'); }
    let dmg = wp.dmg * meleeMul() * masteryMul() * (slam ? 1.8 * (1 - d / (r + 1) * 0.4) : 1);
    if (!e.boss && !e.elite && unaware(e) && !slam) { dmg = e.hp + 1; play('sneak_kill', 0.7); stat('sneakKills'); spawnText(e.x, e.y, 'SMYGDÖDAD', '#c0c0c0'); }
    if (up('hm_shatter') && !e.boss && (e.frozen > 0 || e.d.stone)) dmg = e.hp + 1;
    const kk = hurtEnemy(e, dmg, e.x, e.y, { melee: true, boom: true }); hits++;
    if (!kk && !e.boss) { e.stun = Math.max(e.stun || 0, (slam ? 1.2 : 0.5) * (up('hm_stun') ? 2 : 1)); for (let i = 0; i < (slam ? 6 : 4); i++) tryMove(e, dx / (d || 1) * 0.13, dy / (d || 1) * 0.13, 0.28); }
  }
  if (slam) { P.shake = Math.max(P.shake, 2); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; particles.push({ x: P.x + Math.cos(P.a) * 0.8, y: P.y + Math.sin(P.a) * 0.8, z: 0.05, vx: Math.cos(a) * r * 1.6, vy: Math.sin(a) * r * 1.6, vz: 0.4, life: 0.5, maxLife: 0.5, img: fx.parts.dust ? fx.parts.dust[0] : fx.hit[1], size: 0.12, fade: true, tint: [170, 140, 110] }); } }
  for (const pt of pots) if (!pt.broken && Math.hypot(pt.x - P.x, pt.y - P.y) < r) breakPot(pt);
  breakProps(P.x + Math.cos(P.a), P.y + Math.sin(P.a), slam ? 1.6 : 0.9);
  r30Melee(P.x + Math.cos(P.a), P.y + Math.sin(P.a), slam ? 1.6 : 0.9, false); // version 30 (RAS): stridshammaren är en tung träff
  if (hits) { play('hammer_hit', 0.9, rnd(0.85, 1)); hitStop = Math.max(hitStop, slam ? 0.12 : 0.07); P.shake = Math.max(P.shake, slam ? 2 : 1); hitMark = 0.15; lvlStat.hits++; }
}
function musketSmoke() { // krutrök som ligger kvar och skymmer sikten
  const x = P.x + Math.cos(P.a) * 0.9, y = P.y + Math.sin(P.a) * 0.9;
  smokes.push({ x: x + Math.cos(P.a) * 1.2, y: y + Math.sin(P.a) * 1.2, t: 4 });
  for (let i = 0; i < 10; i++) particles.push({ x: x + rnd(-0.2, 0.2) + Math.cos(P.a) * i * 0.15, y: y + rnd(-0.2, 0.2) + Math.sin(P.a) * i * 0.15, z: rnd(0.35, 0.6), vx: Math.cos(P.a) * rnd(0.3, 1), vy: Math.sin(P.a) * rnd(0.3, 1), vz: rnd(0, 0.15), life: rnd(2.5, 4), maxLife: 4, frames: fx.parts.smoke2 || fx.parts.smoke || fx.hit, img: (fx.parts.smoke2 || fx.parts.smoke || fx.hit)[0], size: rnd(0.25, 0.45), drift: true, fade: true, tint: [200, 200, 200] });
  P.shake = Math.max(P.shake, 1.6);
}
let smokes = [];
function updateSmokes(dt) {
  for (const s of smokes) { s.t -= dt; if (up('mk_smoke')) for (const e of ents) if (!e.dead && !e.boss && Math.hypot(e.x - s.x, e.y - s.y) < 1.6) { e.confT = 1; if (Math.random() < dt) spawnText(e.x, e.y, '?', '#c0c0c0'); } }
  smokes = smokes.filter(s => s.t > 0);
}
const inSmoke = (ax, ay, bx, by) => smokes.some(s => { const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, t = clamp(((s.x - ax) * dx + (s.y - ay) * dy) / (L * L), 0, 1); return Math.hypot(ax + dx * t - s.x, ay + dy * t - s.y) < 1.2 * Math.min(1, s.t / 2); });
function bayonet(wp) { // mk_bayonet: högerklick är en bajonettstöt
  if ((WS.bayT || 0) > tmr) return; WS.bayT = tmr + 0.6; WS.kick = 0.25; play('hammer_swing', 0.6, 1.4);
  for (const e of ents) { if (e.dead || e.hidden) continue; const d = Math.hypot(e.x - P.x, e.y - P.y); let off = Math.atan2(e.y - P.y, e.x - P.x) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off)); if (d < 1.7 && Math.abs(off) < 0.5) { hurtEnemy(e, 10 * meleeMul(), e.x, e.y, { melee: true }); hitMark = 0.1; play('knife_hit', 0.7, 0.8); break; } }
}
function weaponV7Tick(wp, dt, trig) { // laddning och alternativa skott för de nya vapnen; true = hanterat
  if (wp.hammer) {
    if (trig && WS.state === 'idle' && WS.cd <= 0) { WS.hcharge = Math.min(1, (WS.hcharge || 0) + dt / 1.0); if (WS.hcharge > 0.5 && !WS.hSnd) { WS.hSnd = true; play('hammer_charge', 0.5); } }
    else if (!trig && WS.hcharge > 0) { const k = WS.hcharge; WS.hcharge = 0; WS.hSnd = false; if (canFire()) hammerSwing(wp, k); }
    if (aimDown && !WS.aimHeld && up('hm_throw') && !WS.thrown && WS.state === 'idle') { WS.thrown = true; play('hammer_swing', 0.8, 0.8); projectiles.push({ x: P.x, y: P.y, z: 0.5, vx: Math.cos(P.a) * 9, vy: Math.sin(P.a) * 9, kind: 'axe', hammer: true, friendly: true, life: 1.5, dmg: 16 * meleeMul(), hits: new Set(), back: false }); }
    WS.aimHeld = aimDown; fireHeld = trig; return true;
  }
  if (wp.musket && up('mk_bayonet') && aimDown && !WS.aimHeld) { WS.aimHeld = true; bayonet(wp); return false; }
  return false;
}
function drawHammerCharge(g) {
  if (!WEAPONS[P.weapon].hammer || !(WS.hcharge > 0)) return;
  const w = 40, x = (W - w) / 2, y = HORIZON + 22; g.fillStyle = '#000a'; g.fillRect(x - 1, y - 1, w + 2, 4); g.fillStyle = WS.hcharge >= 0.7 ? '#ffd24a' : '#c9a87a'; g.fillRect(x, y, w * WS.hcharge, 2);
  if (WS.hcharge >= 0.7 && tmr % 0.4 < 0.2) { g.strokeStyle = '#ffd24a'; g.strokeRect(x - 2.5, y - 2.5, w + 5, 7); } // jordskalv redo: stapeln blinkar med en ram i stället för text
}
// ---------- Version 7: mumie, skarabéer, schakalkrigare, ficktjuv och dubbelgångare ----------
const AI_V7 = {
  mummy(e, dt, dist, los) { // bandaget drar dig närmare
    e.bandT = (e.bandT ?? rnd(2, 4)) - dt;
    if (e.bandT <= 0 && los && dist > 2 && dist < 8) { e.bandT = rnd(5, 7); e.state = 'attack'; e.t = 0; e.didHit = true; const a = Math.atan2(P.y - e.y, P.x - e.x);
      projectiles.push({ x: e.x + Math.cos(a) * 0.4, y: e.y + Math.sin(a) * 0.4, z: 0.45, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, dmg: 3, src: e, kind: 'bandage', life: 1.6 }); play('bandage', 0.6, 1, { x: e.x, y: e.y }); return true; }
    return false;
  },
  scarab(e, dt, dist, los) { // sicksack i svärm
    if (e.state === 'move' && los) { const a = Math.atan2(P.y - e.y, P.x - e.x) + Math.PI / 2, w = Math.sin(e.t * 9 + e.x * 7) * dt * 2.4; tryMove(e, Math.cos(a) * w, Math.sin(a) * w, 0.15); }
    if (Math.random() < dt * 0.3) play('scarab', 0.2, rnd(0.9, 1.3), { x: e.x, y: e.y });
    return false;
  },
  jackal(e, dt, dist, los) { // parerar framifrån när du siktar på den
    if (e.parryT > tmr) { e.state = 'pain'; e.t = 0.1; return true; }
    if (los && dist < 7 && aimedAt(e) && (e.parryCd || 0) < tmr && Math.random() < dt * 2.5) { e.parryT = tmr + 0.9; e.parryCd = tmr + rnd(3, 5); spawnText(e.x, e.y, 'PARERAR', '#ffd24a'); return true; }
    return false;
  },
  thief(e, dt, dist, los) { // stjäl guld och flyr
    if (!e.stolen) {
      const g = items.find(it => !it.taken && (it.type === 'gold' || it.type === 'goldpile') && Math.hypot(it.x - e.x, it.y - e.y) < 0.6); if (g) { g.taken = true; e.stolen = (e.stolen || 0) + 5; }
      if (dist < 0.9 && run.gold > 0) { const n = Math.min(run.gold, 20 + run.depth * 5); run.gold -= n; e.stolen = (e.stolen || 0) + n; play('steal', 0.9); say(`FICKTJUVEN STAL ${n} GULD!`, 2.5); e.fleeT = 99; e.alert = true; spawnText(e.x, e.y, `-${n}G`, '#ffd24a'); }
    }
    if (e.stolen) { e.ghost = dist > 5 ? 0.6 : 0.2; if (Math.random() < dt * 0.5) play('thief', 0.3, 1, { x: e.x, y: e.y }); }
    return false;
  },
  doppel(e, dt, dist, los) { // kopierar vapnet du håller
    const wp = WEAPONS[P.weapon];
    if (e.copy !== wp.id) { e.copy = wp.id; if (dist < 12 && los) { spawnText(e.x, e.y, 'KOPIERAR ' + wp.short, '#c080ff'); play('doppel', 0.5, 1, { x: e.x, y: e.y }); } }
    e.fireT = (e.fireT ?? 1.5) - dt;
    if (e.fireT <= 0 && los && dist < 11 && !wp.melee) { e.fireT = clamp(wp.delay * 3, 0.5, 2.5); e.state = 'attack'; e.t = 0; e.didHit = true;
      const n = Math.min(5, Math.max(1, Math.round(wp.pellets / 2))), a0 = Math.atan2(P.y - e.y, P.x - e.x), dmg = clamp(wp.dmg * 1.2, 4, 12) / Math.sqrt(n);
      for (let i = 0; i < n; i++) shootFireball(e, a0 + (n > 1 ? (i - (n - 1) / 2) * 0.08 : 0) + rnd(-0.03, 0.03), 8, dmg, false, 'orb2');
      play(wp.sound[0] || 'shot', 0.4, (wp.sound[1] || 1) * 0.8, { x: e.x, y: e.y }); return true; }
    if (wp.melee && los && dist > 1 && dist < 6) { const a = Math.atan2(P.y - e.y, P.x - e.x); tryMove(e, Math.cos(a) * dt * e.d.speed * 1.4, Math.sin(a) * dt * e.d.speed * 1.4, 0.28); }
    return false;
  },
};
function bandageHit() { P.pullT = 0.7; P.slowT = Math.max(P.slowT, 1.2); say('BANDAGET DRAR DIG!', 1); }
// ---------- Version 7: gravkammaren – kvicksand, stenblock, sarkofager och ljusstrålar ----------
let boulders = [];
function updateTomb(dt) {
  const c = cellUnder();
  if (c === '¯' && P.jz < 0.05 && mod('hazardImmune') <= 0) { // kvicksand
    P.sink = Math.min(1, (P.sink || 0) + dt * 0.35); P.slowT = Math.max(P.slowT, 0.2);
    if (!settings.lowfx && Math.random() < dt * 10) particles.push({ x: P.x + rnd(-0.3, 0.3), y: P.y + rnd(-0.3, 0.3), z: 0.02, vx: 0, vy: 0, vz: 0.3, life: 0.4, maxLife: 0.4, img: fx.parts.sand ? fx.parts.sand[0] : fx.hit[1], size: 0.04, tint: [200, 170, 110] });
    if ((P.sinkSndT || 0) < tmr) { P.sinkSndT = tmr + 1.2; play('quicksand', 0.5); }
    if (P.sink >= 1) { P.sinkAcc = (P.sinkAcc || 0) + dt; if (P.sinkAcc > 1) { P.sinkAcc = 0; run.cause = 'KVICKSAND'; hurtPlayer(5 * trapMul()); if ((P.sinkMsgT || 0) < tmr) { P.sinkMsgT = tmr + 6; say('DU SJUNKER – HOPPA!', 2); } } }
  } else P.sink = Math.max(0, (P.sink || 0) - dt * (P.jz > 0.05 ? 3 : 1.2));
  P.camSink = (P.sink || 0) * 0.18; // kameran sjunker
  if (lvl.boulders) for (const b of lvl.boulders) if (!b.done && (P.x | 0) === b.tx && (P.y | 0) === b.ty) { // stenblocket släpps
    b.done = true; const dx = Math.sign(b.tx - b.sx), dy = Math.sign(b.ty - b.sy);
    boulders.push({ x: b.sx + 0.5, y: b.sy + 0.5, vx: dx * 5.2, vy: dy * 5.2, t: 0, snd: play('boulder_roll', 0.8, 1, { loop: true }) }); say('ETT STENBLOCK RULLAR – SPRING!', 2); P.shake = Math.max(P.shake, 1.2); play('detect', 0.6, 0.8);
  }
  for (const b of boulders) {
    b.t += dt; const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt; P.shake = Math.max(P.shake, 0.6 * clamp(1 - Math.hypot(P.x - b.x, P.y - b.y) / 10, 0, 1));
    if (solid(nx, ny) || b.t > 12) { b.dead = true; try { b.snd && b.snd.s.stop(); } catch (e) { /* stoppad */ } play('boulder_crash', 0.9, 1, { x: b.x, y: b.y }); P.shake = Math.max(P.shake, 1.5); spawnPuff(b.x, b.y, 10); continue; }
    b.x = nx; b.y = ny;
    if (Math.hypot(P.x - b.x, P.y - b.y) < 0.75 && (b.hitT || 0) < tmr) { b.hitT = tmr + 1; run.cause = 'STENBLOCKET'; hurtPlayer(30 * trapMul(), b.x, b.y); for (let i = 0; i < 6; i++) tryMove(P, b.vx * 0.04, b.vy * 0.04, 0.24); }
    for (const e of ents) if (!e.dead && !e.boss && Math.hypot(e.x - b.x, e.y - b.y) < 0.75) hurtEnemy(e, 60, e.x, e.y, { noProc: true, boom: true });
  }
  boulders = boulders.filter(b => !b.dead);
  if (lvl.biome === 'tomb' && !boss && cellSky && cellSky[(P.y | 0) * mw + (P.x | 0)]) P.heat = clamp((P.heat || 0) + dt * 0.25 * Math.max(0.1, 1 - mod('heatResist')), 0, 10); // solen bränner
}
function openSarcophagus(pr) {
  pr.used = true; play('sarcophagus_open', 0.9); P.shake = Math.max(P.shake, 0.4); stat('sarcophagi');
  const r = Math.random();
  if (r < 0.35) { const x = pr.x + Math.cos(P.a + Math.PI) * 0.8, y = pr.y + Math.sin(P.a + Math.PI) * 0.8; const e = makeEnemy(ENEMY_DEFS['Ã'] ? 'Ã' : 'S', solid(x, y) ? pr.x + 1 : x, solid(x, y) ? pr.y : y); e.alert = true; ents.push(e); totalEnemies++; spawnPuff(e.x, e.y, 8); say('MUMIEN VAKNAR!', 2); play('mummy', 0.9); }
  else if (r < 0.85) { const n = 3 + Math.round(4 * (1 + mod('goldFind'))); for (let i = 0; i < n; i++) dropItem('gold', pr.x, pr.y); if (Math.random() < 0.3) dropItem(Math.random() < 0.5 ? 'potion' : 'rune', pr.x, pr.y); say('SARKOFAGEN GÖMDE SKATTER', 1.5); }
  else { items.push({ type: 'cardpick', x: pr.x - Math.cos(P.a) * 0.3, y: pr.y - Math.sin(P.a) * 0.3, taken: false, drop: true, luck: 0.8, title: 'FARAONENS GÅVA' }); say('NÅGOT GLIMMAR I SARKOFAGEN', 1.5); }
}
function beamDust(dt) { if (!lvl.beams || settings.lowfx) return; for (const b of lvl.beams) if (Math.random() < dt * 3 && Math.abs(b.x - P.x) < 10 && Math.abs(b.y - P.y) < 10) particles.push({ x: b.x + rnd(0.2, 0.8), y: b.y + rnd(0.2, 0.8), z: rnd(0.1, 0.9), vx: rnd(-0.05, 0.05), vy: rnd(-0.05, 0.05), vz: -0.05, life: 3, maxLife: 3, img: fx.parts.dust_mote ? fx.parts.dust_mote[0] : fx.hit[1], size: 0.015, add: true, tint: [255, 230, 170], fade: true, drift: true }); }
// ---------- Version 7: Krönikan – 40 sidor om Kryptans historia (och en hemlig slutsida) ----------
const CHRONICLE = [
  { t: 'BORGEN OVANFÖR', b: 'DET VAR EN GÅNG EN BORG PÅ ETT BERG. UNDER DEN GRÄVDE MUNKARNA EN KRYPTA FÖR SINA DÖDA. DE GRÄVDE FÖR DJUPT.' },
  { t: 'DEN FÖRSTA SPRICKAN', b: 'I DEN SJÄTTE KAMMAREN BRAST BERGET. UR SPRICKAN STEG EN VÄRME SOM INTE KOM FRÅN NÅGON ELD. MUNKARNA KALLADE DET EN NÅD.' },
  { t: 'MUNKARNAS BÖN', b: 'VI BAD OM ATT FÅ LEVA FÖR EVIGT. NÅGOT DÄR NERE HÖRDE OSS. VI SKULLE HA BETT OM NÅGOT ANNAT.' },
  { t: 'DE DÖDA VAKNAR', b: 'FÖRST VAKNADE BENEN I KRYPTAN. SEDAN VALVEN. SEDAN DE SOM HADE GÅTT NER FÖR ATT SE VAD SOM HÄNDE.' },
  { t: 'DÖDGRÄVAREN', b: 'EN AV OSS VÄGRADE ATT DÖ OCH VÄGRADE ATT LEVA. HAN SÄLJER NU VAD DE DÖDA LÄMNAT EFTER SIG. HAN TAR BARA GULD.' },
  { t: 'KORTEN', b: 'MUNKARNA SKREV SINA BÖNER PÅ KORT AV BEN. VARJE KORT BÄR LITE AV DEN KRAFT SOM BODDE I DEN SOM SKREV DET.' },
  { t: 'SJÄLARNA', b: 'VARJE GÅNG EN VANDRARE FALLER STIGER HANS SJÄL UPP TILL ALTARET. DÄR VÄNTAR DEN PÅ NÄSTA SOM VÅGAR GÅ NER.' },
  { t: 'PORTALERNA', b: 'KRYPTAN FLYTTAR SIG. VÅNINGARNA ÄR ALDRIG DESAMMA. BARA PORTALERNA, SKURNA I LJUS, MINNS VÄGEN NEDÅT.' },
  { t: 'BENDEMONEN I', b: 'DEN FÖRSTA SOM SVARADE PÅ BÖNERNA VAR EN DEMON AV BEN. DEN BYGGDE SIG EN KROPP AV MUNKARNAS SKELETT.' },
  { t: 'BENDEMONEN II', b: 'DEMONEN HATAR ELD MINDRE ÄN DEN HATAR TYSTNAD. DEN VRÅLAR FÖR ATT SLIPPA HÖRA SIG SJÄLV.' },
  { t: 'BENDEMONEN III', b: 'NÄR DEMONEN FALLER BLIR BENEN STILLA EN STUND. SEN BÖRJAR DE LETA EFTER EN NY HERRE.' },
  { t: 'HELVETESBESTEN I', b: 'GLÖDEN UNDER BERGET FICK EN KROPP. BESTEN ANDAS ELD OCH SOVER I LAVA SOM ANDRA SOVER I SÄNGAR.' },
  { t: 'HELVETESBESTEN II', b: 'DE SÄGER ATT BESTEN EN GÅNG VAR MUNKARNAS VAKTHUND. DEN ÄR FORTFARANDE TROGEN. BARA INTE MOT OSS.' },
  { t: 'MARDRÖMMEN I', b: 'DEN SVARTA RYTTAREN RIDER GENOM DRÖMMAR. DEN SOM SOVER I KRYPTAN VAKNAR ALDRIG RIKTIGT.' },
  { t: 'MARDRÖMMEN II', b: 'MARDRÖMMEN KAN INTE STOPPAS, BARA UNDVIKAS. HOPPA NÄR DEN RIDER. LÅT DEN TRÄFFA VÄGGEN.' },
  { t: 'OGERN I', b: 'I SKOGEN OVANFÖR KRYPTAN BODDE EN OGER SOM ÅT RESANDE. NÄR SKOGEN SJÖNK NED I JORDEN FÖLJDE HAN MED.' },
  { t: 'OGERN II', b: 'OGERN KASTAR STOCKAR OCH STENAR. HAN ÄR INTE ELAK, BARA HUNGRIG. DET ÄR VÄRRE.' },
  { t: 'ISDRAKEN I', b: 'LÅNGT NERE FINNS ETT FÄSTE AV IS DÄR TIDEN HAR FRUSIT. DÄR SOVER EN DRAKE SOM MINNS VINTERN FÖRE BERGET.' },
  { t: 'ISDRAKEN II', b: 'DRAKENS ANDE FRYSER LUFTEN SÅ ATT DEN BLIR SPRÖD. HÅLL DIG NÄRA ELDEN. RÖR DIG, ANNARS STELNAR DU.' },
  { t: 'VÅLNADEN I', b: 'HON VAR NUNNA I KLOSTRET. HON VÄNTAR FORTFARANDE PÅ ATT NÅGON SKA TÄNDA LJUSEN I KAPELLET.' },
  { t: 'VÅLNADEN II', b: 'VÅLNADEN FÖRSVINNER OCH DYKER UPP BAKOM DIG. SKRIKET ÄR INTE ILSKA. DET ÄR SORG.' },
  { t: 'ELDKUNGEN I', b: 'I VULKANEN UNDER ALLT HAR ELDEN EN KUNG. HAN SMIDDE DEN FÖRSTA YXAN OCH DEN SISTA KRONAN.' },
  { t: 'ELDKUNGEN II', b: 'ELDKUNGEN KAN INTE DÖ, BARA SLOCKNA. VARJE GÅNG HAN TÄNDS IGEN ÄR HAN LITE ARGARE.' },
  { t: 'FARAONEN I', b: 'LÄNGST NER LIGGER EN GRAV ÄLDRE ÄN BORGEN. EN KUNG FRÅN ETT LAND AV SAND BEGROVS HÄR MED ALLT HAN ÄGDE.' },
  { t: 'FARAONEN II', b: 'FARAONENS JUVEL I PANNAN SER ALLT. SKJUT DEN, SÅ ÄR HAN BLIND EN STUND.' },
  { t: 'FARAONEN III', b: 'DET VAR FARAONENS GULD SOM LOCKADE MUNKARNA NEDÅT. DE HADE FEL. DET VAR FARAONEN SOM LOCKADE GULDET.' },
  { t: 'ALKEMISTEN', b: 'ALKEMISTEN KOM NER FÖR ATT HITTA LIVETS ELIXIR. HAN HITTADE DET. HAN VILL BARA INTE DRICKA DET SJÄLV.' },
  { t: 'PRÄSTEN', b: 'DEN SISTE PRÄSTEN STANNADE NÄR DE ANDRA FLYDDE. HAN LYFTER FÖRBANNELSER MOT GULD FÖR ATT KÖPA NYA LJUS.' },
  { t: 'FÅNGARNA', b: 'BURARNA BYGGDES FÖR DE DÖDA. NU SITTER LEVANDE I DEM. INGEN VET VEM SOM LÅSTE IN DEM.' },
  { t: 'RUNORNA', b: 'RUNORNA RISTADES AV EN SMED SOM KUNDE TALA MED METALL. HAN LÄRDE VAPNEN ATT MINNAS ELD, IS OCH BLOD.' },
  { t: 'LÄGERELDEN', b: 'NÅGON TÄNDER LÄGERELDARNA. VI HAR ALDRIG SETT VEM. ELDEN ÄR ALLTID VARM NÄR VI KOMMER.' },
  { t: 'VANDRAREN', b: 'EN VANDRARE MED LYKTA GÅR GENOM VÅNINGARNA. HAN FRÅGAR OM VÄGEN TILL BORGEN. VI VET INTE HUR LÄNGE HAN HAR FRÅGAT.' },
  { t: 'SPELAREN', b: 'SPELAREN SATSAR ALLTID. HAN HAR VUNNIT TUSEN GÅNGER OCH FÖRLORAT EN. DEN GÅNGEN FÖRLORADE HAN SITT ANSIKTE.' },
  { t: 'BANKIREN', b: 'BANKIREN LOVAR ATT GULDET ÄR TRYGGT HOS HONOM, ÄVEN OM DU DÖR. HAN HAR ALDRIG SAGT ATT HAN SJÄLV LEVER.' },
  { t: 'SKUGGORNA', b: 'I MÖRKRET SER DE DÖDA SÄMRE ÄN DU TROR. DUCKA, SLÄCK LJUSEN OCH LÅT DEM GÅ FÖRBI.' },
  { t: 'LAMPAN', b: 'LJUSET RÄDDAR DIG OCH FÖRRÅDER DIG. DEN SOM BÄR EN LAMPA SER LÅNGT OCH SYNS ÄNNU LÄNGRE.' },
  { t: 'DUBBELGÅNGAREN', b: 'KRYPTAN LÄR SIG AV DIG. NÅGONSTANS DÄR NERE GÅR EN SKUGGA SOM BÄR DITT VAPEN OCH DINA STEG.' },
  { t: 'LABYRINTEN', b: 'MUNKARNA BYGGDE EN LABYRINT FÖR ATT STÄNGA IN DET DE HADE VÄCKT. LABYRINTEN HÅLLER. FÖR NU.' },
  { t: 'DEN SISTE MUNKEN', b: 'JAG SKRIVER DETTA I DEN SISTA KAMMAREN. OM DU LÄSER DET HAR DU KOMMIT LÄNGRE ÄN NÅGON AV OSS.' },
  { t: 'VÄGEN TILLBAKA', b: 'DET FINNS EN VÄG UPP UR KRYPTAN. DEN BÖRJAR DÄR DU SLUTADE SÖKA. LETA LÄNGRE.' },
  // version 8: kristallgrottorna, den sjunkna staden och avgrunden
  { t: 'GROTTAN AV GLAS', b: 'UNDER KRYPTAN VÄXTE KRISTALLER SOM FÅNGADE LJUS. MUNKARNA BAR NER SINA LJUS FÖR ATT SE DEM GLIMMA. LJUSEN KOM ALDRIG UPP IGEN.' },
  { t: 'DROTTNINGENS SPEGEL', b: 'EN NOVIS SÅG SIG SJÄLV I KRISTALLEN OCH BLEV KVAR DÄR. HON VÄXTE MED GROTTAN. NU ÄR HON GROTTAN.' },
  { t: 'TUSEN ANSIKTEN', b: 'KRISTALLDROTTNINGEN BÄR VARJE ANSIKTE SOM NÅGONSIN SPEGLATS I HENNE. SKJUT INTE NÄR HON GLÄNSER – DU TRÄFFAR DIG SJÄLV.' },
  { t: 'STADEN SOM SJÖNK', b: 'BORTOM GROTTAN LÅG EN STAD SOM HANDLADE MED MUNKARNA. EN NATT STEG VATTNET. KLOCKORNA RINGER FORTFARANDE UNDER YTAN.' },
  { t: 'SIRENERNAS SÅNG', b: 'DE SOM DRUNKNADE LÄRDE SIG SJUNGA. DE SJUNGER FÖR DIG OCKSÅ. HÅLL FÖR ÖRONEN OCH SIKTA.' },
  { t: 'DET SOM SOVER I DJUPET', b: 'LEVIATAN VAR STADENS VÄKTARE. NÄR VATTNET KOM SVALDE DEN STADEN FÖR ATT SKYDDA DEN. DEN HAR INTE SLÄPPT TAGET SEDAN DESS.' },
  { t: 'ANDAS', b: 'LEVIATAN DYKER OCH VÄNTAR. DEN KAN VÄNTA LÄNGRE ÄN DU KAN HÅLLA ANDAN. LETA EFTER BUBBLORNA.' },
  { t: 'AVGRUNDEN', b: 'UNDER ALLT FINNS ETT HÅL UTAN BOTTEN. KARTOGRAFEN HAR RITAT HUNDRA VÅNINGAR AV DET OCH HAR ÄNNU INTE NÅTT FRAM.' },
  // version 9: klocktornet och molnborgen
  { t: 'URMAKARENS VERKSTAD', b: 'MUNKARNA BAD URMAKAREN BYGGA EN KLOCKA SOM KUNDE MÄTA EVIGHETEN. HAN BYGGDE TORNET OCH STÄNGDE IN SIG I DET.' },
  { t: 'TIDENS SKULD', b: 'VARJE SEKUND URMAKAREN VRIDER TILLBAKA MÅSTE BETALAS. HAN HAR LÅNAT I TUSEN ÅR. NÅGON MÅSTE BETALA.' },
  { t: 'ÖVER MOLNEN', b: 'HÖGST UPP I KLOCKTORNET FINNS EN DÖRR SOM ÖPPNAR SIG MOT HIMLEN. BORGEN DÄRUTE SVÄVAR, FÖR STORMEN BÄR DEN.' },
  { t: 'STORMFÅGELNS ÄGG', b: 'STORMFÅGELN VAKTAR ETT ÄGG AV ÅSKA. NÄR DET KLÄCKS SKA HIMLEN SPRICKA. HÅLL DIG BORTA FRÅN BLIXTSTÄNGERNA NÄR DET MULLRAR.' },
];
const CHRONICLE_END = { t: 'SLUTET OCH BÖRJAN', b: 'NÄR ALLA SIDOR ÄR FUNNA ÄR KRÖNIKAN HEL IGEN. MUNKARNAS BÖN KAN TAS TILLBAKA. KRYPTAN SOVER – TILLS NÅGON GRÄVER FÖR DJUPT IGEN.' };
const BOSS_PAGES = { demon: [8, 9, 10], beast: [11, 12], nightmare: [13, 14], ogre: [15, 16], frost: [17, 18], ghost: [19, 20], flame: [21, 22], pharaoh: [23, 24, 25], crystalqueen: [41, 42], leviathan: [45, 46], clockmaker: [48, 49], thunderbird: [50, 51] };
const pagesFound = () => profile.pages || [];
function findPage(prefer) { // ger en sida som inte hittats än, helst en som hör till våningens boss
  const have = new Set(pagesFound()); let pool = (prefer || []).filter(i => !have.has(i));
  if (!pool.length) pool = CHRONICLE.map((_, i) => i).filter(i => !have.has(i));
  if (!pool.length) { if (!profile.pageEnd) { profile.pageEnd = true; saveProfile(); showPage(CHRONICLE_END, true); stat('chronicleDone'); checkAch(); } else { run.gold += 25; say('EN TOM SIDA – 25 GULD I STÄLLET', 1.5); } return; }
  const i = pool[(Math.random() * pool.length) | 0];
  profile.pages = pagesFound().concat(i); const s = 3 + Math.round(mod('pageSouls')); profile.souls += s; saveProfile(); stat('pagesFound');
  play('page_found', 0.8); showPage(CHRONICLE[i], false, s); checkAch();
}
function showPage(pg, end, souls) {
  say(`KRÖNIKAN ${pagesFound().length}/${CHRONICLE.length}: ${pg.t}${souls ? ` (+${souls} SJÄLAR)` : ''}`, 3);
  speak(pg.t + '. ' + pg.b);
  openUI(() => CardUI.list(end ? 'KRÖNIKANS SLUT' : 'KRÖNIKAN', pg.t, [{ label: pg.b, text: end ? 'DU HAR HITTAT ALLA SIDOR.' : `SIDA ${pagesFound().length} AV ${CHRONICLE.length}` }], () => closeUI()));
}
function showChronicle(onClose) { // krönikan som meny
  const have = new Set(pagesFound());
  const rows = CHRONICLE.map((p, i) => have.has(i) ? { label: `${i + 1}. ${p.t}`, text: p.b } : { label: `${i + 1}. ???`, text: 'SAKNAS – LETA EFTER KRÖNIKESIDOR (þ) PÅ VÅNINGARNA', dim: true });
  if (profile.pageEnd) rows.push({ label: CHRONICLE_END.t, text: CHRONICLE_END.b, color: '#ffd24a' });
  CardUI.list('KRÖNIKAN', `${have.size} AV ${CHRONICLE.length} SIDOR`, rows, () => { if (state === 'title') refreshTitle(); else if (onClose) onClose(); });
}
const NARRATOR = { abattoir: 'SLAKTERIET. HÄR HÄNGER ALLT PÅ KROKAR – SNART ÄVEN DU.', battlefield: 'DET EVIGA SLAGFÄLTET. KRIGET TOG SLUT FÖR LÄNGE SEDAN. INGEN SA DET TILL DE DÖDA.', bathhouse: 'BADHUSET. VATTNET ÄR VARMT – ALLDELES FÖR VARMT.', purgatory: 'SKÄRSELDEN. HÄR BRINNER DE SOM INTE FICK KOMMA IN.', prison: 'JÄRNFÄNGELSET. HÄR SITTER INGEN AV SITT STRAFF.', harbor: 'FISKELÄGET. DIMMAN TAR DEN SOM GÅR FÖR NÄRA VATTNET.',sewer: 'KLOAKERNA. ALLT SOM SPOLAS NED HAMNAR HÄR – ÄVEN DU.', desert: 'ÖKNEN. SANDEN MINNS ALLA SOM GÅTT VILSE.', mine: 'GRUVAN. NÅGON GRÄVDE FÖR DJUPT.', observatory: 'OBSERVATORIET. STJÄRNORNA TITTAR TILLBAKA.', circus: 'CIRKUSEN. FÖRESTÄLLNINGEN SLUTADE ALDRIG – PUBLIKEN GICK BARA HEM.', jungle: 'DJUNGELTEMPLET. RÖR INTE GULDET.', ship: 'SPÖKSKEPPET. HAVET GER INTE TILLBAKA SINA DÖDA.', lab: 'LABORATORIET. HÄR BLANDAS LIV OCH DÖD I GLAS.', dungeon: 'KRYPTAN. HÄR BÖRJADE ALLT.', caves: 'GROTTORNA. BERGET ANDAS HÄR NERE.', graveyard: 'KYRKOGÅRDEN. DE DÖDA VILAR INTE LÄNGRE.', forest: 'SKOGEN SOM SJÖNK.', courtyard: 'BORGGÅRDEN. REGNET HAR ALDRIG SLUTAT.', swamp: 'TRÄSKET. VARJE STEG ÄR ETT VAD.', frost: 'FROSTFÄSTET. TIDEN HAR FRUSIT.', volcano: 'VULKANEN. ELDKUNGENS RIKE.', tomb: 'GRAVKAMMAREN. FARAONENS GULD VÄNTAR.', crystal: 'KRISTALLGROTTORNA. LJUSET BRYTS I TUSEN DELAR.', sunken: 'DEN SJUNKNA STADEN. HÅLL ANDAN.', clock: 'KLOCKTORNET. TIDEN ÄR EN MASKIN HÄR.', sky: 'MOLNBORGEN. TITTA INTE NED.', fungus: 'SVAMPRIKET. ANDAS INTE FÖR DJUPT.', mirror: 'SPEGELPALATSET. LITA INTE PÅ DET DU SER.', library: 'DET FÖRBJUDNA BIBLIOTEKET. TYST, DE LÄSER.', foundry: 'GJUTERIET. ALLT HÄR BLIR TILL METALL.', cathedral: 'BLODKATEDRALEN. HÄR BER INGEN LÄNGRE.', hive: 'BIKUPAN. LYSSNA PÅ SURRET.', garden: 'DEN DÖDA TRÄDGÅRDEN. BLINKA INTE.', dream: 'DRÖMRIKET. INGET HÄR ÄR VAD DET SER UT ATT VARA.' };
function narrate() { // berättaren vid nya biomer första gången
  if (!lvl || !lvl.biome || !NARRATOR[lvl.biome]) return; profile.narrated = profile.narrated || [];
  if (profile.narrated.includes(lvl.biome)) return; profile.narrated.push(lvl.biome); saveProfile();
  if (run) run.narr = NARRATOR[lvl.biome]; // berättarraden visas inte i bilden längre (pausen kan visa run.narr); talsyntesen läser den
  setTimeout(() => { if (state === 'play') speak(NARRATOR[lvl.biome]); }, 3200);
}
function speak(t) { // talsyntes (inställning)
  if (!settings.tts || !window.speechSynthesis) return;
  try { const u = new SpeechSynthesisUtterance(String(window.I18N ? I18N.t(t) : t).toLowerCase()); u.lang = window.I18N && I18N.lang() === 'en' ? 'en-US' : 'sv-SE'; u.rate = 1.05; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { /* ingen talsyntes */ }
}
