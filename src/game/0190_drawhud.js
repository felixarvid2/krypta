function drawHUD() {
  const g = ctx, y0 = VH;
  if (state === 'play') drawHeatFx(g);
  drawWorldOverlay();
  for (const h of hurtDir) {
    const rel = h.ang - P.a, sx = W / 2 + Math.sin(rel) * W * 0.42, sy = HORIZON - Math.cos(rel) * VH * 0.4;
    const gr = g.createRadialGradient(sx, sy, 2, sx, sy, 46);
    gr.addColorStop(0, `rgba(${h.col || '220,0,0'},${0.55 * h.t})`); gr.addColorStop(1, `rgba(${h.col || '220,0,0'},0)`);
    g.fillStyle = gr; g.fillRect(sx - 46, sy - 46, 92, 92);
  }
  if (P.hurt > 0) { g.fillStyle = `rgba(${P.hurtCol || '190,0,0'},${Math.min(0.45, P.hurt * 0.6)})`; g.fillRect(0, 0, W, VH); }
  if (P.pick > 0 && !settings.noFlash) { g.fillStyle = `rgba(255,230,120,${P.pick * 0.22})`; g.fillRect(0, 0, W, VH); }
  if (P.boom > 0 && !settings.noFlash) { g.fillStyle = `rgba(255,240,210,${P.boom.toFixed(3)})`; g.fillRect(0, 0, W, VH); } // nära explosion
  v27Screen(g); // version 27 (BLOOD): stänk i hörnen när en fiende sprängs nära dig
  if (state === 'play' && up('bullettime') && WS.aim > 0.8) { g.fillStyle = 'rgba(90,140,255,0.13)'; g.fillRect(0, 0, W, VH); } // tidsstoppet
  if (P.hp < maxHp() * 0.3 && state === 'play') {
    const lowK = 1 - clamp(P.hp / (maxHp() * 0.3), 0, 1), p = 0.22 + 0.1 * lowK + (settings.noFlash ? 0.08 : 0.24) * heartBeat(); // MENY: långsam puls (dunk-dunk), starkare ju lägre hälsan är
    const gr = g.createRadialGradient(W / 2, HORIZON, VH * (0.38 - 0.12 * lowK), W / 2, HORIZON, W * 0.62);
    gr.addColorStop(0, 'rgba(90,0,0,0)'); gr.addColorStop(0.6, `rgba(110,0,0,${(p * 0.5).toFixed(3)})`); gr.addColorStop(1, `rgba(70,0,0,${Math.min(0.85, p * 1.5).toFixed(3)})`);
    g.fillStyle = gr; g.fillRect(0, 0, W, VH);
  }
  drawBodyFx(g); // MENY: skärmen och spelarens kropp (skadebågar, upplockning, rusning, gift/eld/vatten, döden)
  const xs = settings.xsize || 1; if (state === 'play' && xs !== 1) { g.save(); g.translate(W / 2, HORIZON); g.scale(xs, xs); g.translate(-W / 2, -HORIZON); }
  if (state === 'play') { // sikte
    const gap = Math.round(2 + WS.spread * 160), cx = W / 2, cy = HORIZON;
    g.fillStyle = enemyUnderCrosshair() ? 'rgba(255,80,60,0.95)' : (settings.xcolor || 'rgba(255,255,255,0.85)');
    if (settings.xstyle === 'punkt') g.fillRect(cx - 1, cy - 1, 2, 2);
    else if (settings.xstyle === 'cirkel') { g.fillRect(cx, cy, 1, 1); const r = gap + 3; for (let i = 0; i < 16; i++) g.fillRect(Math.round(cx + Math.cos(i / 16 * TAU) * r), Math.round(cy + Math.sin(i / 16 * TAU) * r), 1, 1); }
    else { g.fillRect(cx - gap - 3, cy, 3, 1); g.fillRect(cx + gap + 1, cy, 3, 1); g.fillRect(cx, cy - gap - 3, 1, 3); g.fillRect(cx, cy + gap + 1, 1, 3); }
    if (WS.focus > 0) { // kalla blodet laddas
      g.strokeStyle = WS.focus >= 1 ? (tmr % 0.3 < 0.15 ? '#ffd24a' : '#ff8030') : 'rgba(255,210,74,0.7)'; g.lineWidth = 1;
      g.beginPath(); g.arc(cx + 0.5, cy + 0.5, 9, -Math.PI / 2, -Math.PI / 2 + TAU * WS.focus); g.stroke();
    }
    if (hitMark > 0) {
      g.fillStyle = hitKill ? '#ff4030' : hitCrit ? '#ffd24a' : '#ffffff';
      for (let i = 2; i < 5; i++) { g.fillRect(cx - i, cy - i, 1, 1); g.fillRect(cx + i, cy - i, 1, 1); g.fillRect(cx - i, cy + i, 1, 1); g.fillRect(cx + i, cy + i, 1, 1); }
    }
  }
  if (state === 'play' && xs !== 1) g.restore();
  const hb = boss && !boss.dead ? boss : guardianE && !guardianE.dead && !guardianE.dying ? guardianE : null;
  HL = hudLay(); const L = HL, wp = WEAPONS[P.weapon]; g.textBaseline = 'top';
  if (hb && state === 'play') { // bossens (eller väktarens) livmätare: bred och tunn, namnet litet över
    const w = L.t ? 140 : hb.guardian ? 180 : showMap === 1 ? 196 : 240, x = Math.round((W - w) / 2), ny = L.t ? L.msgY : (cmode('clock') || run.maze) ? 24 : 4, y = ny + 9; L.bossMsgY = ny + 16; L.row2 = L.bossMsgY + 11; // under klockan/labyrintens tid om de visas
    txt(hb.d.name, Math.round((W - textW(hb.d.name)) / 2), ny, hb.enraged ? (tmr % 0.5 < 0.25 ? '#ff4030' : '#a02010') : '#ffd24a'); // rasande: namnet blinkar rött
    g.fillStyle = '#000b'; g.fillRect(x - 1, y - 1, w + 2, 5);
    g.fillStyle = hb.guardian ? '#3a1050' : '#5a1010'; g.fillRect(x, y, w, 3);
    hb.shownHp = hb.shownHp === undefined ? hb.hp : Math.max(hb.hp, hb.shownHp - hb.maxHp * 0.15 * (1 / 60)); // fördröjd stapel
    g.fillStyle = '#f0e0c0'; g.fillRect(x, y, w * Math.max(0, hb.shownHp) / hb.maxHp, 3);
    g.fillStyle = hb.guardian ? '#c050ff' : hb.phase === 3 ? '#ff5020' : '#d02818'; g.fillRect(x, y, w * Math.max(0, hb.hp) / hb.maxHp, 3);
    g.fillStyle = '#000'; g.fillRect(Math.round(x + w / 3), y - 1, 1, 5); g.fillRect(Math.round(x + w * 2 / 3), y - 1, 1, 5); // fasgränser
    g.fillStyle = '#0007'; for (let i = 1; i < 12; i++) if (i % 4) g.fillRect(Math.round(x + w * i / 12), y, 1, 3); // segment
    if (hb.enraged && tmr % 0.5 < 0.25) { g.strokeStyle = '#ff4030'; g.strokeRect(x - 1.5, y - 1.5, w + 3, 6); }
  }
  if (levelBanner > 0 && bossBanner <= 0 && state === 'play') { // titelkortet: namnet stort, våningen litet och högst en kort rad till
    const a = Math.min(1, levelBanner, (3 - levelBanner) * 3), sub = lvl.hub ? 'MELLAN RUNDORNA' : run.abyss ? `AVGRUND ${run.depth}` : (cycleOf(run.depth) ? `VARV ${cycleOf(run.depth) + 1} · ` : '') + `VÅNING ${run.depth}`;
    ctx.font = '16px "PressStart2P"'; const w = ctx.measureText(plain(lvl.name)).width;
    const bo = settings.reduceMotion ? 0 : -Math.round(Math.max(0, 1 - (3 - levelBanner) * 2.5) ** 2 * 16); // MENY: namnet faller in uppifrån
    if (w < W - 124 - 2 * hudIX) txt(lvl.name, (W - w) / 2, 40 + bo, '#e8d9b0', 2, true, a); else txt(lvl.name, (W - textW(lvl.name)) / 2, 44 + bo, '#e8d9b0', 1, true, a);
    txt(sub, (W - textW(sub)) / 2, 60, '#c9a87a', 1, true, a * 0.9);
    const ex = floorEvent ? [EVENTS[floorEvent].name, '#ff7060'] : run.floorCurse ? ['FÖRBANNAD VÅNING', '#c080ff'] : (!run.practice && run.depth > profile.bestDepth && profile.bestDepth > 1) ? ['DJUPARE ÄN NÅGONSIN!', '#9fe0a0'] : run.depth === 1 && run.modifier ? [run.modifier.name + (run.modifier2 ? ' · ' + run.modifier2.name : ''), '#ff9050'] : null;
    if (ex) txt(ex[0], (W - textW(ex[0])) / 2, 72, ex[1], 1, true, a);
  }
  if (bossBanner > 0) gfxEIntroBars(ctx); // FIENDER: svarta band under bossintrot
  if (bossBanner > 0 && !boss && guardianE && guardianE.d.title) { const s = guardianE.d.title; txt(s, (W - textW(s)) / 2, 60, '#d080ff', 1, true, Math.min(1, bossBanner)); }
  if (bossBanner > 0 && boss && boss.d.title) { const t = boss.d.title; txt(t, (W - textW(t)) / 2, 72, '#e8d9b0', 1, true, Math.min(1, bossBanner) * gfxESubA()); }
  if (bossBanner > 0 && boss) gfxEBossName(boss.d.name, Math.min(1, bossBanner)); // FIENDER: namnet slår in
  if (state === 'play') { hudJuice(); g.save(); g.translate(HJ.sx, HJ.sy); drawHpCorner(g, L); drawAmmoCorner(g, L); g.restore(); hudPops(g, L); } // hörnen ersätter den gamla statuslisten; MENY: skakar vid tung träff, "+N" stiger
  { const m = msgs[0], big = !!settings.bigHud; // meddelanden: högst en rad åt gången överst i mitten; långa bläddras rad för rad
    if (m && (state === 'play' || big) && (big || (levelBanner <= 0.5 && bossBanner <= 0.5))) {
      const k = big ? 2 : 1, my = hb && state === 'play' ? L.bossMsgY : L.msgY + (cmode('clock') || (run && run.maze) ? 20 : 0);
      const lines = wrapText(m.text, big ? (L.t ? 17 - Math.ceil(L.ix / 8) : 19) : L.msgW), n = lines.length, d = m.d || 2.5, ln = lines[Math.min(n - 1, Math.floor(clamp(1 - m.t / d, 0, 0.999) * n))] || '', w = textW(ln) * k, a = Math.min(1, m.t * 2);
      if (big) { g.fillStyle = `rgba(0,0,0,${0.55 * a})`; g.fillRect(Math.round((W - w) / 2) - 3, my - 2, w + 6, 19); }
      txt(ln, Math.round((W - w) / 2), my, '#ffe9a8', k, true, a);
    } }
  if (state === 'play' && WS.state === 'reload' && !WEAPONS[P.weapon].shellReload) { // omladdningsmätare med det aktiva fältet
    const k = clamp(WS.t / (WEAPONS[P.weapon].reload * reloadMul()), 0, 1), bw = 44, bx = (W - bw) / 2, by = HORIZON + 10;
    g.fillStyle = '#000a'; g.fillRect(bx - 1, by - 1, bw + 2, 5);
    if (!WS.tried) { g.fillStyle = '#5a7a3a'; g.fillRect(bx + bw * ACTIVE_WIN[0], by, bw * (ACTIVE_WIN[1] - ACTIVE_WIN[0]), 3); }
    g.fillStyle = '#e8d9b0'; g.fillRect(bx + bw * k - 1, by - 1, 2, 5);
  }
  if (portals.length && state === 'play') { // pil mot portalen
    const pt = portals[0], d = Math.hypot(pt.x - P.x, pt.y - P.y);
    if (d > 3) {
      let rel = Math.atan2(pt.y - P.y, pt.x - P.x) - P.a; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      const cx = W / 2 + clamp(rel, -1.4, 1.4) * 70, cy = L.t ? 46 : 30; // under meddelanderaderna
      g.save(); g.translate(cx, cy); g.rotate(rel); g.fillStyle = tmr % 0.8 < 0.4 ? '#c080ff' : '#9060e0';
      g.beginPath(); g.moveTo(7, 0); g.lineTo(-4, -4); g.lineTo(-2, 0); g.lineTo(-4, 4); g.closePath(); g.fill(); g.restore();
      const t = `${Math.round(d)}`; txt(t, Math.round(cx + 9), cy - 3, '#c9a0ff', 1, true, 0.8); // avståndet bredvid pilen
    }
  }
  if (WS.nameT > 0 && state === 'play') { const w = WEAPONS[P.weapon], nm = w.name; txt(nm, (W - textW(nm)) / 2, VH - 24, legendOf(w.id) ? '#ffd24a' : '#e8d9b0', 1, true, Math.min(1, WS.nameT * 2)); } // vapnets namn bara en kort stund vid vapenbyte
  if (WS.boost && state === 'play') txt('+15%', W / 2 + 12, HORIZON - 14, '#9fe060', 1, true, 0.8);
  if (state === 'play') { // effekternas 8×8-ikoner (som förr ritades i en rad längst ned) samlas i effektraden vid hälsan
    fxIcons = []; g.drawImage = function (im, x, y, w, h) { if (arguments.length === 5 && y === VH - 22 && w === 8 && h === 8) { if (im && !fxIcons.includes(im)) fxIcons.push(im); return; } return CanvasRenderingContext2D.prototype.drawImage.apply(this, arguments); };
    try { drawBowAim(g); drawStaffCharge(g); drawAbilityHud(g); drawTutorial(g); drawHammerCharge(g); drawStealthHud(g); drawLampHud(g); drawCues(g); drawMazeTimer(g); drawXpHud(g); drawAirHud(g); drawTimeHud(g); drawDpsHud(g); drawV11Hud(g); drawV13Hud(g); drawV14Hud(g); drawV14Hud2(g); drawV15Hud(g); drawV16Hud(g); drawV17Hud(g); drawV18Hud(g); drawV19Hud(g); drawV20Hud(g); drawV21Hud(g); drawV22Hud(g); drawV23Hud(g); drawLoopHud(g); }
    finally { delete g.drawImage; }
    drawFxRow(g, L);
    efx2Hud(g, L); // version 25.1: portalen och helningen som skärmeffekter
    fx27DrawHud(g); // version 27: bossens chockvåg och blixt på skärmen
  }
  if (state === 'play') drawHudExtras(g);
  if (wheel && !wheel.open && performance.now() - wheel.t0 > 260) wheel.open = true;
  if (wheel && wheel.open && state === 'play') drawWheel(g);
  // (aktiva effekter, våningshändelsen, skölden och rundans modifierare: se drawFxRow, titelkortet och hälsostapeln)
  const lowY = VH - 40; // en kort rad nere i mitten för hjälptext: användbart föremål eller omladdning
  if (hint && state === 'play') txt(hint, Math.round((W - textW(hint)) / 2), lowY, '#ffd24a', 1, true, 0.95);
  else if (WS.state === 'idle' && !wp.melee && P.mags[P.weapon] === 0 && P.ammo[wp.ammo] > 0 && state === 'play') { if (L.t) hudIcon(g, 'reload', W / 2 - 6, lowY - 2, tmr % 0.8 < 0.5 ? '#ffb040' : '#a06020'); else { const s = 'R = LADDA OM', w = textW(s); txt(s, Math.round((W - w) / 2), lowY, '#ffb040'); } }
  if (subs.length && state === 'play') { subs.forEach((s, i) => { s.t -= 1 / 60; const k = settings.bigSubs ? 2 : 1, w = textW(s.text) * k; if (settings.bigSubs) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect((W - w) / 2 - 3, VH - 60 - i * 18, w + 6, 18); } txt(s.text, (W - w) / 2, settings.bigSubs ? VH - 58 - i * 18 : VH - 50 - i * 10, '#e8e8e8', k, true, Math.min(1, s.t * 2)); }); subs = subs.filter(s => s.t > 0); }
  if (settings.fps) { fpsN++; if (tmr - fpsT >= 1 || tmr < fpsT) { fpsShow = fpsN; fpsN = 0; fpsT = tmr; } txt(fpsShow + ' FPS', L.t ? 92 : 4, 4, '#9fe060', 1, true, 0.8); }
  if (showMap === 2) drawMap(false); else if (showMap === 1 && state === 'play') drawMap(true);
}
let hpShown = 100, objLast = '', objT = 0, objDur = 4, objLvl = null;
function drawHudExtras(g) { // uthållighet, granater, nycklar, mål, pilar och mer
  const y0 = VH, wp = WEAPONS[P.weapon];
  // uthållighet (hälsostapeln och skölden ritas i hälsohörnet, drawHpCorner)
  if (P.stam < STAM_MAX() - 0.01) { const w = 40, x = (W - w) / 2, y = VH - 6; g.fillStyle = '#000a'; g.fillRect(x - 1, y - 1, w + 2, 4); g.fillStyle = P.stam < 0.3 ? '#c06020' : '#d8c060'; g.fillRect(x, y, w * P.stam / STAM_MAX(), 2); }
  // granater, nycklar, smideslevel
  drawPotionHud(g); drawRuneHud(g);
  if (WS.throwT >= 0) { const k = Math.min(1, WS.throwT); g.fillStyle = '#000a'; g.fillRect(W / 2 - 16, HORIZON + 18, 32, 3); g.fillStyle = '#c0ff90'; g.fillRect(W / 2 - 16, HORIZON + 18, 32 * k, 3); }
  // hagelspridningen i siktet
  if (wp.pellets > 1 && settings.xstyle !== 'punkt') { const r = Math.round((wp.spread + WS.spread * 0.5 + (wp.hip || 0) * (1 - WS.aim)) * (1 - WS.aim * 0.6) / (1 + mod('accuracy')) / Math.atan(plane) * W / 2); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.arc(W / 2 + 0.5, HORIZON + 0.5, Math.max(4, r), 0, TAU); g.stroke(); }
  // HUD-temat färgar nu hörnens siffror (hudTxtCol) i stället för en list
  // mål och timer
  let oy = showMap === 1 ? HL.map.y + HL.map.h + 5 : HL.t ? HL.map.y : 4; // under minikartan, till höger
  if (settings.objective !== false && showMap !== 2 && levelBanner <= 0 && bossBanner <= 0 && !(boss && !boss.dead) && !(guardianE && !guardianE.dead && !guardianE.dying)) { const obj = objective(); if (obj) { // målet: smal text under kartan, 4 s när våningen börjar och 2 s när det gör framsteg, sedan borta
    const key = /INOM|VÅG OM/.test(obj) ? obj.replace(/\d/g, '') : obj; // nedräkningar räknas inte som framsteg varje sekund
    if (key !== objLast || objLvl !== lvl) { objDur = objLast === '' || objLvl !== lvl ? 4 : 2; objLast = key; objT = tmr; objLvl = lvl; }
    const a = clamp((objDur - (tmr - objT)) * 2, 0, 0.95); if (a > 0) { const s = shortObjective(obj), x = W - 4 - hudIX - textW(s); txt(s, x, oy, '#e8d9b0', 1, true, a); g.globalAlpha = a; g.fillStyle = '#ffd24a'; g.fillRect(x - 6, oy + 2, 3, 3); g.fillRect(x - 5, oy + 1, 1, 5); g.fillRect(x - 7, oy + 3, 5, 1); g.globalAlpha = 1; } } } // EN kort rad med en liten målmarkör
  if (settings.timer) { const t = fmtTime(levelTime); txt(t, W - 4 - hudIX - textW(t), oy + 10, '#c9a87a', 1, true, 0.8); }
  if (challenge) { const t = challenge.wave ? `VÅG ${challenge.wave}/${challenge.max} · ${challenge.alive.filter(e => !e.dead).length} KVAR` : 'GÖR DIG REDO'; txt(t, (W - textW(t)) / 2, HL.row2, '#ff9050'); } // under meddelanderaden
  // pilar vid kanten mot väktare, eliter och bytet utanför bilden
  for (const e of ents) {
    if (e.dead || e.dormant || e.hidden || !(e.guardian || e.elite || e.bounty) || (e.guardian && e.asleep && !seen[(e.y | 0) * mw + (e.x | 0)])) continue;
    const d = Math.hypot(e.x - P.x, e.y - P.y); if (d > 18 || d < 2) continue;
    let rel = Math.atan2(e.y - P.y, e.x - P.x) - P.a; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    if (Math.abs(rel) < Math.atan(plane) * 0.95) continue;
    const x = rel > 0 ? W - 8 : 8, y = HORIZON + clamp(Math.abs(rel) - 1.6, -1, 1) * 30;
    g.fillStyle = e.guardian ? '#c050ff' : e.bounty ? '#ff9050' : quests && e.elite && quests.some(q => q.kind === 'elite' && !q.done && !q.failed) ? '#40e0ff' : '#ffb030'; // uppdragets mål i cyan g.beginPath(); if (rel > 0) { g.moveTo(x + 5, y); g.lineTo(x - 2, y - 5); g.lineTo(x - 2, y + 5); } else { g.moveTo(x - 5, y); g.lineTo(x + 2, y - 5); g.lineTo(x + 2, y + 5); } g.closePath(); g.fill();
  }
  // varning för anfall bakifrån
  for (const e of ents) {
    if (e.dead || !e.alert || e.dormant || e.boss || !e.d.melee) continue;
    const d = Math.hypot(e.x - P.x, e.y - P.y); if (d > 2.6) continue;
    let rel = Math.atan2(e.y - P.y, e.x - P.x) - P.a; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    if (Math.abs(rel) < 1.9) continue;
    g.fillStyle = tmr % 0.3 < 0.15 ? '#ff3020' : '#a01810'; const bx = W / 2 + Math.sin(rel) * 30, by = VH - 18;
    g.beginPath(); g.moveTo(bx, by + 6); g.lineTo(bx - 6, by); g.lineTo(bx + 6, by); g.closePath(); g.fill();
    if (settings.backCue !== false && (P.backT || 0) < tmr) { P.backT = tmr + 0.8; play('click', 0.35, 0.6, { x: e.x, y: e.y }); }
    break;
  }
  // frost och långsamhet i kanterna
  if (P.slowT > 0 && settings.noFlash !== true) { const gr = g.createRadialGradient(W / 2, HORIZON, VH * 0.4, W / 2, HORIZON, W * 0.6); gr.addColorStop(0, 'rgba(120,180,255,0)'); gr.addColorStop(1, 'rgba(120,180,255,0.28)'); g.fillStyle = gr; g.fillRect(0, 0, W, VH); }
  if (P.poisonT > 0) { const gr = g.createRadialGradient(W / 2, HORIZON, VH * 0.4, W / 2, HORIZON, W * 0.6); gr.addColorStop(0, 'rgba(90,255,90,0)'); gr.addColorStop(1, 'rgba(90,255,90,0.2)'); g.fillStyle = gr; g.fillRect(0, 0, W, VH); }
  if (cardBanner) { cardBanner.t -= 1 / 60; const a = Math.min(1, cardBanner.t * 2); const t = 'NYTT KORT: ' + cardBanner.name; g.globalAlpha = a; g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect((W - textW(t)) / 2 - 4, VH - 29, textW(t) + 8, 13); g.strokeStyle = cardBanner.color; g.strokeRect((W - textW(t)) / 2 - 3.5, VH - 28.5, textW(t) + 7, 12); g.globalAlpha = 1; txt(t, (W - textW(t)) / 2, VH - 26, cardBanner.color, 1, true, a); if (cardBanner.t <= 0) cardBanner = null; } // ram i kortets raritetsfärg
}
let cardBanner = null;
function shortObjective(o) { // målet som EN kort rad (≤ 10 tecken) under minikartan; hela texten finns i objective()
  let m;
  if ((m = o.match(/^DÖDA ELITERNA \((\d+) KVAR\)/))) return `ELIT ${m[1]}`;
  if ((m = o.match(/^DÖDA FIENDERNA \((\d+) KVAR\)/))) return `${m[1]} KVAR`;
  if ((m = o.match(/^VÅG (\d+) · (\d+) KVAR/))) return `VÅG ${m[1]}·${m[2]}`;
  if ((m = o.match(/^NÄSTA VÅG OM (\d+)/))) return `VÅG OM ${m[1]}`;
  if ((m = o.match(/INOM (\S+)$/))) return `TID ${m[1]}`;
  if (/^BESEGRA VÄKTAREN/.test(o)) return 'VÄKTAREN'; if (/^BESEGRA /.test(o)) return 'BOSSEN'; if (/^GÅ IN I PORTALEN/.test(o)) return 'PORTALEN'; if (/^ÖVERLEV/.test(o)) return 'ÖVERLEV';
  if ((m = o.match(/^([A-ZÅÄÖ]{2,10}): /))) return m[1]; // "JAKT: DÖDA DEN MÄRKTA ELITEN" → "JAKT"
  if (/MIMIC/.test(o)) return 'MIMIC';
  return o.length > 10 ? o.slice(0, 10) : o;
}
function objective() { // vad man ska göra just nu
  if (run && run.survival) { const n = run.survival.alive.filter(e => !e.dead).length; return n ? `VÅG ${run.survival.wave} · ${n} KVAR` : `NÄSTA VÅG OM ${Math.max(0, Math.ceil(run.survival.t))}`; }
  if (boss && !boss.dead) return 'BESEGRA ' + boss.d.name;
  if (challenge) return 'ÖVERLEV VÅGORNA';
  if (guardianE && !guardianE.dead) return 'BESEGRA VÄKTAREN';
  if (portals.length) return 'GÅ IN I PORTALEN';
  if (floorQuest) return floorQuest.kind === 'time' ? `PORTALEN INOM ${fmtTime(Math.max(0, floorQuest.limit - levelTime))}` : floorQuest.text;
  const el = ents.filter(e => e.elite && !e.dead).length;
  return el ? `DÖDA ELITERNA (${el} KVAR)` : `DÖDA FIENDERNA (${Math.max(0, totalEnemies - kills)} KVAR)`;
}
let photo = false, mapMark = null;
function screenshot() { // sparar bilden som PNG
  try { canvas.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `krypta-${Date.now()}.png`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }, 'image/png'); say('SKÄRMBILD SPARAD', 1.2); play('click', 0.5, 1.8); } catch (e) { say('SKÄRMBILD GICK INTE', 1.2); }
}
function textW(s) { ctx.font = '8px "PressStart2P"'; return ctx.measureText(plain(s)).width; }
function txt(s, x, y, col, scale = 1, shadow = true, alpha = 1) {
  const g = ctx; s = plain(s); g.font = `${8 * scale}px "PressStart2P"`; g.globalAlpha = alpha;
  const ring = /[Åå]/.test(s) ? ringFix(g, s, x, y, scale) : null; if (ring) s = s.replace(/Å/g, ' ').replace(/å/g, 'a');
  if (shadow) { g.fillStyle = '#000'; g.fillText(s, x + 1, y + 1); if (ring) ring(1); }
  g.fillStyle = col; g.fillText(s, x, y); if (ring) ring(0); g.globalAlpha = 1;
}
function ringFix(g, s, x, y, u) { // Å/å: fontens ring är en enda pixel som smälter ihop med A:t i 320×200; här ritas A:t från Ä (utan prickarna) och en egen ring ovanför med en rads mellanrum
  const al = g.textAlign, bl = g.textBaseline, w = g.measureText(s).width;
  const x0 = x - (al === 'center' ? w / 2 : al === 'right' || al === 'end' ? w : 0), y0 = y - (bl === 'middle' ? 4 * u : bl === 'top' || bl === 'hanging' ? 0 : 8 * u);
  const xs = []; for (let i = 0; i < s.length; i++) if (s[i] === 'Å' || s[i] === 'å') xs.push([x0 + g.measureText(s.slice(0, i)).width, s[i] === 'Å']); // monospace: 8·skala px per tecken
  return d => xs.forEach(([px, big]) => {
    if (big) { g.save(); g.beginPath(); g.rect(px - 1, y0 + u + d, 8 * u + 2, 8 * u); g.clip(); g.textAlign = 'left'; g.fillText('Ä', px + d, y + d); g.restore(); }
    g.fillRect(px + 2 * u + d, y0 - 2 * u + d, 3 * u, u); g.fillRect(px + 2 * u + d, y0 - u + d, u, u); g.fillRect(px + 4 * u + d, y0 - u + d, u, u); g.fillRect(px + 2 * u + d, y0 + d, 3 * u, u);
  });
}
function drawMap(mini) {
  if (mini && settings.mapRotate) { // minikartan roterar med spelaren
    const s = settings.mapScale || 3, r = Math.round(24 / s), size = (2 * r + 1) * s, mt = mapTop(), cx = W - 4 - size / 2 - hudIX, cy = mt + size / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(W - 4 - size - 2 - hudIX, mt - 2, size + 4, size + 4); ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(W - 4 - size - 2 - hudIX, mt - 2, size + 4, size + 4);
    ctx.translate(cx, cy); ctx.rotate(-P.a - Math.PI / 2); ctx.translate(-(P.x * s), -(P.y * s));
    drawMapCells(true, s, 0, 0, Math.max(0, (P.x | 0) - r - 4), Math.max(0, (P.y | 0) - r - 4), Math.min(mw, (P.x | 0) + r + 5), Math.min(mh, (P.y | 0) + r + 5));
    ctx.restore(); return;
  }
  drawMapBox(mini);
}
function drawMapBox(mini) { // automap: bara rutor man har sett. mini = liten karta i hörnet runt spelaren
  let s, ox, oy, x0 = 0, y0 = 0, x1 = mw, y1 = mh;
  if (mini) {
    s = settings.mapScale || 3; const r = Math.round(24 / s);
    x0 = clamp((P.x | 0) - r, 0, Math.max(0, mw - 2 * r - 1)); y0 = clamp((P.y | 0) - r, 0, Math.max(0, mh - 2 * r - 1));
    x1 = Math.min(mw, x0 + 2 * r + 1); y1 = Math.min(mh, y0 + 2 * r + 1);
    ox = W - 4 - hudIX - (x1 - x0) * s - x0 * s; oy = mapTop() - y0 * s;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(ox + x0 * s - 2, oy + y0 * s - 2, (x1 - x0) * s + 4, (y1 - y0) * s + 4);
  } else {
    s = clamp(Math.floor(Math.min((W - 10 - 2 * hudIX) / mw, (VH - 10) / mh)), 2, 5); ox = (W - mw * s) / 2 | 0; oy = (VH - mh * s) / 2 | 0;
    ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(ox - 3, oy - 3, mw * s + 6, mh * s + 6);
    const leg = [['#60d060', 'UTGÅNG'], ['#c080ff', 'PORTAL'], ['#ffe070', 'ANVÄNDBART'], ['#ff6030', 'KRUTFAT'], ['#ffd24a', 'GULD'], ['#ff4030', 'FIENDE'], ['#40ffff', 'MARKÖR (B)']];
    if (W - hudIX - (ox + mw * s) > 70) leg.forEach(([c, t], i) => { ctx.fillStyle = c; ctx.fillRect(ox + mw * s + 8, oy + 4 + i * 10, 4, 4); txt(t, ox + mw * s + 15, oy + 2 + i * 10, '#c9a87a', 1, true, 0.9); }); // teckenförklaring
  }
  if (mini) { ctx.save(); ctx.beginPath(); ctx.rect(ox + x0 * s - 2, oy + y0 * s - 2, (x1 - x0) * s + 4, (y1 - y0) * s + 4); ctx.clip(); } // rumsramar får inte rita utanför minikartan
  drawMapCells(mini, s, ox, oy, x0, y0, x1, y1);
  if (mini) ctx.restore();
}
function drawMapCells(mini, s, ox, oy, x0, y0, x1, y1) {
  const inside = (x, y) => x >= x0 && y >= y0 && x < x1 && y < y1;
  const sense = mod('secretSense') > 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const c = map[y][x];
    if (c === '*' && sense && doors[x + ',' + y].open === 0) { ctx.fillStyle = tmr % 1 < 0.5 ? '#c060ff' : '#7030a0'; ctx.fillRect(ox + x * s, oy + y * s, s, s); continue; }
    if (!seen[y * mw + x]) continue;
    ctx.fillStyle = isWallChar(c) ? '#7d7566' : c === 'D' ? '#c08040' : c === 'G' ? '#b04080' : c === '*' ? (doors[x + ',' + y].open > 0 ? '#2a2420' : '#7d7566') : c === 'f' ? '#ff9a30' : c === 'M' ? '#ff4040' : c === 't' ? '#3a5a2a' : c === 'n' ? '#8a8a96' : MAP_COL[c] || '#2a2420';
    ctx.fillRect(ox + x * s, oy + y * s, s, s);
    if (lvl.exit && lvl.exit.x === x && lvl.exit.y === y) { ctx.fillStyle = '#60d060'; ctx.fillRect(ox + x * s, oy + y * s, s, s); }
  }
  for (const pr of props) if (pr.def && !pr.broken && (pr.def.use || pr.def.boom || pr.def.trap) && inside(pr.cx, pr.cy) && seen[pr.cy * mw + pr.cx]) { // användbara föremål blinkar, fällor och krutfat syns
    ctx.fillStyle = pr.def.use && !pr.used ? (tmr % 0.8 < 0.4 ? '#ffe070' : '#a08030') : pr.def.boom ? '#ff6030' : pr.def.trap ? '#c05020' : '#555'; ctx.fillRect(ox + pr.cx * s, oy + pr.cy * s, s, s); }
  if (lvl.rooms) for (const r of lvl.rooms) { const col = { shop: '#ff4040', guardian: '#c050ff', shrine: '#ff5060', treasure: '#ffd24a', vault: '#ffd24a' }[r.type]; const cx = r.x + (r.w >> 1), cy = r.y + (r.h >> 1); if (col && inside(cx, cy) && seen[cy * mw + cx]) { ctx.strokeStyle = col; ctx.strokeRect(ox + r.x * s + 0.5, oy + r.y * s + 0.5, r.w * s - 1, r.h * s - 1); } }
  if (mapMark && inside(mapMark.x | 0, mapMark.y | 0)) { ctx.fillStyle = tmr % 0.6 < 0.3 ? '#40ffff' : '#20a0a0'; ctx.fillRect(ox + mapMark.x * s - 2, oy + mapMark.y * s - 2, 4, 4); }
  for (const it of items) if (!it.taken && inside(it.x | 0, it.y | 0) && seen[(it.y | 0) * mw + (it.x | 0)]) { ctx.fillStyle = it.type.startsWith('gold') ? '#ffd24a' : it.type === 'cardpick' ? '#c0a0ff' : it.type === 'potion' ? '#ff70c0' : '#e8d9b0'; ctx.fillRect(ox + it.x * s - 1, oy + it.y * s - 1, 2, 2); }
  for (const c of chests) if (inside(c.x | 0, c.y | 0) && seen[(c.y | 0) * mw + (c.x | 0)]) { ctx.fillStyle = c.open ? '#6a5030' : '#ffb030'; ctx.fillRect(ox + c.x * s - 1, oy + c.y * s - 1, 3, 3); }
  for (const pr of props) if (pr.def && (pr.def.trap || pr.def.boom) && !pr.broken && inside(pr.cx, pr.cy) && (mod('trapSense') > 0 || pr.lit > tmr - 30)) { ctx.fillStyle = tmr % 0.8 < 0.4 ? '#ff7030' : '#a03010'; ctx.fillRect(ox + pr.x * s - 1, oy + pr.y * s - 1, 2, 2); }
  for (const e of ents) { // fiender som syns just nu, väktare och boss alltid när rummet har setts
    if (e.dead || !inside(e.x | 0, e.y | 0) || e.hidden || e.dormant) continue;
    const big = e.boss || e.guardian;
    if (!(big && seen[(e.y | 0) * mw + (e.x | 0)]) && !(Math.hypot(e.x - P.x, e.y - P.y) < 12 && hasLOS(P.x, P.y, e.x, e.y)) && !(mod('enemySense') > 0 && Math.hypot(e.x - P.x, e.y - P.y) < 14)) continue;
    ctx.fillStyle = big ? (tmr % 0.5 < 0.25 ? '#ff60ff' : '#a030a0') : e.elite ? '#ffb030' : '#ff4030'; ctx.fillRect(ox + e.x * s - (big ? 2 : 1), oy + e.y * s - (big ? 2 : 1), big ? 4 : 2, big ? 4 : 2);
  }
  if (pet && inside(pet.x | 0, pet.y | 0)) { ctx.fillStyle = PETS[pet.id].color; ctx.fillRect(ox + pet.x * s - 1, oy + pet.y * s - 1, 2, 2); }
  for (const a of allies) if (inside(a.x | 0, a.y | 0)) { ctx.fillStyle = '#60ff80'; ctx.fillRect(ox + a.x * s - 1, oy + a.y * s - 1, 2, 2); }
  for (const p of portals) if (inside(p.x | 0, p.y | 0)) { ctx.fillStyle = tmr % 0.6 < 0.3 ? '#c080ff' : '#7040d0'; ctx.fillRect(ox + p.x * s - 2, oy + p.y * s - 2, 4, 4); }
  v19Map(s, ox, oy, inside); v20Map(s, ox, oy, inside); v21Map(s, ox, oy, inside); v22Map(s, ox, oy, inside); v23Map(s, ox, oy, inside);
  v24Map(s, ox, oy, inside); // version 24: stängda enkelriktade dörrar
  ctx.fillStyle = '#4dff7a'; ctx.fillRect(ox + P.x * s - 1, oy + P.y * s - 1, 3, 3);
  ctx.fillRect(ox + (P.x + Math.cos(P.a) * 1.4) * s, oy + (P.y + Math.sin(P.a) * 1.4) * s, 1, 1);
}
const MAP_COL = { '£': '#60e0a0', '€': '#fff0a0', '©': '#c0d0e0', w: '#ff5060', y: '#c040ff', e: '#ff6030', k: '#6a5040', q: '#6a5040', u: '#9090a0', v: '#707070', H: '#9090a0', J: '#6a5040', T: '#8a6a40' }; // brunn, altare, krutfat och möbler på kartan

// ---------- Strid (påverkas av korten via mod()) ----------
// skada faller av med avståndet (fullt nära, golv långt bort) så att pistolen inte prickskjuter över hela banan
function falloff(wp, d) { const [n, f, m] = wp.falloff; return d <= n ? 1 : d >= f ? m : 1 + (m - 1) * (d - n) / (f - n); }
// siktstöd på pekskärm: kulan dras lätt mot en synlig fiende nära hårkorset
function aimAssistShot(a) {
  let best = null, bd = 0.07;
  for (const e of ents) { if (e.dead) continue; const d = Math.hypot(e.x - P.x, e.y - P.y); if (d > 16) continue;
    let da = Math.atan2(e.y - P.y, e.x - P.x) - a; da = Math.atan2(Math.sin(da), Math.cos(da));
    const lim = Math.max(0.025, 0.35 / d); if (Math.abs(da) < Math.min(bd, lim) && hasLOS(P.x, P.y, e.x, e.y)) { bd = Math.abs(da); best = da; } }
  return best === null ? a : a + best * 0.7 * (settings.aimAssistK ?? 1);
}
const effMag = i => Math.max(1, Math.round(WEAPONS[i].mag * (1 + mod('magSize'))));
const effDelay = wp => wp.delay / (1 + mod('fireRate'));
const reloadMul = () => 1 / (1 + mod('reloadSpeed')) * (up('hp_reel') ? 0.5 : 1) * (up('sl_fast') ? 0.6 : 1) * (up('cc_fast') ? 0.6 : 1) * (up('pt_fast') ? 0.6 : 1) * (up('bg_fast') ? 0.6 : 1) * (up('sl_quick') ? 0.75 : 1) * (up('tt_fast') ? 0.6 : 1);
function canFire() { return state === 'play' && (WS.state === 'idle' || (WS.state === 'reload' && WEAPONS[P.weapon].shellReload && P.mags[P.weapon] > 0)) && WS.cd <= 0; }
function fire() {
  const wp = WEAPONS[P.weapon];
  if (!canFire()) return;
  if (wp.melee) { axeSwing(false); return; } // yxan: hanteras för sig
  if (wp.staff) { staffZap(wp, wp.dmg * (1 + mod('dmg')) * (1 + 0.12 * wlvl(wp.id)) * (P.rageT > 0 ? 1.5 : 1)); return; } // blixtstaven: mana i stället för magasin
  if (wp.bow) return; // bågen skjuter när den släpps
  if (wp.boomerang) { boomerangThrow(wp); return; } // bumerangen: ett kast i taget
  if (wp.windgun) { windBlast(wp); return; } // vindbössan laddas av sig själv
  if (wp.spear) { spearThrust(wp); return; } // spjutet: stöt (högerklick kastar)
  if (wp.mirrorshield) { shieldBash(wp); return; } // spegelskölden: slag (högerklick blockerar)
  if (wp.whip) { whipCrack(wp); return; } // piskan
  if (wp.censer) { censerSwing(wp); return; } // rökelsekaret
  if (wp.shears) { shearSnip(wp); return; } // trädgårdssaxen
  if (wp.pickaxe) { pickSwing(wp); return; } // hackan
  if (wp.scimitar) { scimSwing(wp); return; } // kroksabeln
  if (wp.trapthrower) { trapThrow(wp); return; } // fällkastaren
  if (wp.flail) { flailSwing(wp); return; } // morgonstjärnan
  if (wp.trident) { tridentStab(wp); return; } // treudden
  if (wp.brimstone) { brimstoneLob(wp); return; } // svavelmortern
  if (wp.hookchain) { hookThrow(wp); return; }
  if (wp.bombard) { bombardFire(wp); return; }
  if (wp.starlance && P.mags[P.weapon] > 0) return; // stjärnlansen skjuter när den släpps
  if (P.mags[P.weapon] <= 0) {
    if (!fireHeld) play('click', 0.6, 1.2);
    WS.cd = 0.3; // liten paus mellan klick
    if (P.ammo[wp.ammo] > 0) startReload();
    else if (!fireHeld) { if (!WEAPONS.some((w, i) => P.has[i] && (P.mags[i] > 0 || P.ammo[w.ammo] > 0))) { bash(); return; } say('SLUT PÅ AMMUNITION', 1.2); autoSwitch(); }
    return;
  }
  if (WS.state === 'reload') WS.state = 'idle'; // avbryt hagelomladdning
  const firstShot = P.mags[P.weapon] >= effMag(P.weapon);
  // vapenuppgraderingar som ändrar själva skottet
  const lastRound = up('lastround') && P.mags[P.weapon] === 1;
  const slug = up('slug') && WS.aim > 0.5;
  const dbl = (up('double') || (wp.blunderbuss && WS.bbDbl)) && !slug && P.mags[P.weapon] >= 2; WS.bbDbl = false;
  const focus = up('focus') && WS.focus >= 1;
  const chain = up('chainshot'), triple = up('triple'), hunt = WS.hunt && up('headhunter');
  const fan = up('fan') && fireHeld; // hanefläkten: skotten efter det första i svepet
  if (Math.random() >= mod('ammoSave')) P.mags[P.weapon]--;
  if (dbl) P.mags[P.weapon]--;
  if (up('belt')) { const t = Math.min(P.ammo[wp.ammo], effMag(P.weapon) - P.mags[P.weapon]); P.mags[P.weapon] += t; P.ammo[wp.ammo] -= t; } // blybältet matar ur reserven
  lvlStat.shots++; run.shots = (run.shots || 0) + 1;
  WS.shot = 0; WS.cd = effDelay(wp) * (fan ? 0.4 : 1) * (dbl ? 1.35 : 1) / (1 + WS.spin * 0.55);
  if (focus) WS.focus = 0;
  const kick = wp.kick * (dbl || slug ? 1.6 : 1);
  P.flash = 0.07; P.shake = Math.max(P.shake, kick * 0.5);
  // lärbart rekylmönster: samma sidoryck i samma ordning varje salva, plus en uppåtknyck som återhämtar sig
  const kickYaw = wp.recoil[P.burst % wp.recoil.length] * (1 - WS.aim * 0.5);
  P.a += kickYaw; P.ryaw += kickYaw * 0.6; P.pitch += kick * 4 * (1 - WS.aim * 0.5);
  P.burst++; P.burstT = effDelay(wp) + 0.25;
  WS.swayY -= kick * 2;
  play(wp.sound[0], wp.sound[2], wp.sound[1] * rnd(0.96, 1.04) * (1 + WS.spin * 0.08));
  if (legendCtx && LEGENDS[legendCtx]) play(LEGENDS[legendCtx].snd, 0.45, rnd(0.95, 1.05)); // det legendariska vapnet låter annorlunda
  if (wp.id === 'shotgun') { play('boom', 0.45, 0.55); setTimeout(() => play('reload', 0.45, 1.4), 420 / (1 + mod('fireRate'))); }
  if (dbl || slug || focus) play('boom', 0.6, slug ? 0.4 : 0.5);
  if (!wp.proj && !wp.flame && !wp.lob && !wp.noShell && wp.id !== 'crossbow') ejectShell(wp.id === 'shotgun' || wp.id === 'dbshotgun');
  muzzleSmoke();
  if (kick >= 2) WS.punch = Math.min(0.08, kick * 0.022); // synfältet slår till vid tunga skott
  if (P.mags[P.weapon] === 0) setTimeout(() => play('click', 0.35, 0.8), 140); // sista skottet
  lowAmmoCheck(wp);
  if (wp.id === 'dbshotgun') play('boom', 0.5, 0.45);
  if (wp.id === 'crossbow') play('click', 0.5, 0.7);
  // duellanten: vilka som inte hade märkt något när skottet gick
  const unaware = up('duel') ? new Set(ents.filter(e => !e.dead && !e.alert)) : null;
  const sneak = new Set(ents.filter(e => !e.dead && !e.alert && !e.boss && !e.dormant)); // bakhåll: fiender som inte sett dig
  // ljudet väcker fiender som kan nå dig inom ~15 rutor (armborsten är tyst)
  for (const e of ents) if (!e.dead && pathDist(e) < (wp.silent ? 2 : 15)) alertEnemy(e, false);
  let anyHit = false, killed = false, crit = false, boomAt = null;
  const hitSet = new Set(), killSet = new Set();
  const spread = slug ? 0 : (wp.spread + WS.spread * 0.5 + (wp.hip || 0) * (1 - WS.aim)) * (1 - WS.aim * 0.6) / (1 + mod('accuracy'))
    * (fan ? 3 : 1) * (up('belt') ? 1 + Math.min(P.burst, 30) / 20 : 1);
  let base = wp.dmg * masteryMul() * (1 + mod('dmg')) * (WS.boost ? 1.15 : 1) * (dmod('glass') ? 1.5 : 1) * (1 + 0.12 * wlvl(wp.id)) * (P.jz > 0.05 ? 1 + mod('airDmg') : 1) * (P.rageT > 0 ? 1.5 : 1) * (1 + (run.mealFloor === run.depth ? P.mealDmg || 0 : 0));
  WS.inspect = 0; WS.idleT = 0;
  if (P.hp < maxHp() * 0.35) base *= 1 + mod('lowHpDmg'); // låg hälsa: bärsärken och liknande gäller alla skott
  if (wp.flame) { flameTick(wp, base); return; } // eldkastaren
  if (wp.lob) { launcherShot(wp, base); return; } // granatkastaren
  if (wp.nail) { nailShot(wp, base, false); return; } // spikgeväret
  if (wp.knives) { knifeThrow(wp, base); return; } // kastknivarna
  if (wp.harpoon) { harpoonFire(wp, base); return; } // harpunen
  if (wp.prism) { prismFire(wp, base); return; } // prisman
  if (wp.sawlauncher) { sawFire(wp, base); return; } // sågbladskastaren
  if (wp.sporelauncher) { sporeFire(wp, base); return; } // sporkastaren
  if (wp.runebook) { runeFire(wp, base); return; } // runboken
  if (wp.steamcannon) { steamBlast(wp, base); return; } // ångkanonen
  if (wp.hivelauncher) { beeFire(wp, base); return; } // bikastaren
  if (wp.dreamstaff) { dreamFire(wp, base); return; } // drömstaven
  if (wp.chaincannon) { chainFire(wp, base); return; } // kedjekulekanonen
  if (wp.acid) { acidSpray(wp, base); return; } // syrasprutan
  if (wp.pinthrower) { pinFire(wp, base); return; } // käglekastaren
  if (wp.blowgun) { dartFire(wp, base); return; } // blåsröret
  if (firstShot) base *= 1 + mod('firstShot');
  if (lastRound) base *= 3;
  if (slug) base *= 7;
  if (focus) base *= 4;
  if (chain) base *= 3;
  if (hunt) { base *= 2; WS.hunt = false; }
  const pellets = slug ? 1 : chain || triple ? 3 : (wp.pellets + Math.round(mod('extraPellets')) + (up('mk_buck') ? 4 : 0) + (wp.blunderbuss && up('bb_wide') ? 5 : 0)) * (dbl ? 2 : 1);
  for (let p = 0; p < pellets; p++) {
    let a = triple ? P.a + (p - 1) * 0.09 : P.a + (P.burst > 1 || pellets > 1 || wp.hip ? rnd(-1, 1) * spread : 0); // första skottet går där siktet är
    if (p === 0 && touch.active) a = aimAssistShot(a);
    if (wp.proj) { shootFlare(a, base); continue; } // signalpistolen skjuter ett bloss, ingen stråle
    const dx = Math.cos(a), dy = Math.sin(a);
    const wall = cast(P.x, P.y, dx, dy);
    if ((wp.id === 'rifle' || wp.id === 'sniper' || (wp.id === 'smg' && Math.random() < 0.3)) && p === 0) tracer(dx, dy, Math.min(wall.dist, 30));
    const wallDist = up('wallpierce') ? throughWall(dx, dy, wall.dist) : wall.dist; // genomborraren
    // allt som kulan kan träffa längs strålen, närmast först
    const hits = [];
    for (const e of ents) {
      if (e.dead) continue;
      const rx = e.x - P.x, ry = e.y - P.y, along = rx * dx + ry * dy;
      if (along <= 0.1 || along >= wallDist) continue;
      const perp = Math.abs(rx * dy - ry * dx); if (perp < 0.3 * e.d.size * (e.boss ? 1.8 : 1)) hits.push({ o: e, d: along, k: 'e', perp });
    }
    for (const pr of projectiles) { // sökande klot och eldklot går att skjuta ned
      if (pr.friendly || pr.dead || pr.kind === 'rock') continue;
      const rx = pr.x - P.x, ry = pr.y - P.y, along = rx * dx + ry * dy;
      if (along > 0.1 && along < wallDist && Math.abs(rx * dy - ry * dx) < (pr.big ? 0.35 : 0.25)) hits.push({ o: pr, d: along, k: 'f' });
    }
    v26aTargets(hits, dx, dy, wallDist); // version 26A: egna sprängämnen, mynt och fiendens granat går att skjuta
    for (const pt of pots) {
      if (pt.broken) continue;
      const rx = pt.x - P.x, ry = pt.y - P.y, along = rx * dx + ry * dy;
      if (along <= 0.1 || along >= wall.dist) continue;
      if (Math.abs(rx * dy - ry * dx) < 0.22) hits.push({ o: pt, d: along, k: 'p' });
    }
    for (const ic of icicles) { if (ic.fall >= 0) continue; const rx = ic.x - P.x, ry = ic.y - P.y, along = rx * dx + ry * dy; if (along > 0.1 && along < wall.dist && Math.abs(rx * dy - ry * dx) < 0.25) { ic.fall = 0; play('ice_crack', 0.6, 1.3, { x: ic.x, y: ic.y }); } } // istappar faller
    for (const pr of props) { // krutfat smäller, lådor spricker, andra föremål stoppar kulan; ljus går sönder
      if (!pr.def || pr.broken || (!pr.def.block && pr.ch !== 'c' && !pr.def.balloon && !pr.def.v21hit)) continue;
      const rx = pr.x - P.x, ry = pr.y - P.y, along = rx * dx + ry * dy;
      if (along <= 0.1 || along >= wall.dist) continue;
      if (Math.abs(rx * dy - ry * dx) < 0.3) hits.push({ o: pr, d: along, k: 'o' });
    }
    hits.sort((u, v) => u.d - v.d);
    let left = slug || focus || chain || wp.pierceAll ? 99 : 1 + (wp.pierce || 0) + Math.round(mod('pierce')), stopped = false;
    for (const h of hits) {
      if (left <= 0) { stopped = true; break; }
      if (h.k === 'p') { breakPot(h.o); continue; } // krukor och lådor tar inte stopp på kulan
      if (h.k === 'o') { const pass = h.o.def.crate || h.o.ch === 'c' || h.o.def.balloon; if (!hitProp(h.o, P.x + dx * h.d, P.y + dy * h.d, base)) { stopped = true; break; } if (!pass) left--; continue; }
      if (h.k === 'f') { h.o.dead = true; h.o.life = 0; play('ricochet', 0.4, 1.6, { x: h.o.x, y: h.o.y }); hitMark = 0.12; left--; continue; }
      if (h.k === 'g' || h.k === 'n' || h.k === 'c') { const r = v26aShot(h, base, wp); if (r === 1) { stopped = true; break; } if (r === 0) left--; continue; } // version 26A
      const far = up('marksman') && h.d > 7; // skarpskytten: långa träffar är alltid kritiska utan avståndsförlust
      let dmg = base * (far || slug ? 1 : falloff(wp, h.d)) * (h.d < 2 && wp.id === 'shotgun' && !slug ? 1.3 : 1);
      const c = far || Math.random() < mod('critChance');
      if (c) { dmg *= 2 + mod('critDmg'); if (!crit) play('gem', 0.3, 2.2); crit = true; hitStop = Math.max(hitStop, 0.03); }
      if (h.o.elite || h.o.boss) dmg *= 1 + mod('bossDmg');
      const hs = headshotCheck(h.o, h.perp, wp); if (hs > 1) { dmg *= hs; hitCrit = true; }
      if (sneak.has(h.o) && !(unaware && unaware.has(h.o))) { dmg *= 1.5 + mod('backstab'); stat('sneaks'); if (!P.sneakMsgT || P.sneakMsgT < tmr) { P.sneakMsgT = tmr + 1; spawnText(h.o.x, h.o.y, 'BAKHÅLL', '#ff9050'); } h.o.backT = tmr + 0.25; }
      if (unaware && unaware.has(h.o)) { if (h.o.elite || h.o.boss) dmg *= 3; else dmg = Math.max(dmg, h.o.hp + 1); say('DUELLANTEN!', 0.8); }
      if (up('dragon')) { h.o.burn = Math.max(h.o.burn, 3); h.o.burnAcc = Math.max(h.o.burnAcc, 0.3); }
      if (h.o.type === 'Ê' && h.o.parryT > tmr) { sparks(P.x + dx * h.d, P.y + dy * h.d, 0.5, 5); play('parry', 0.7, rnd(0.9, 1.2), { x: h.o.x, y: h.o.y }); spawnText(h.o.x, h.o.y, 'PARERAD', '#ffd24a'); left = 0; stopped = true; break; } // schakalkrigaren parerar
      if ((h.o.type === '@' || h.o.type === 'Ð') && !h.o.dead && !(h.o.stun > 0) && h.o.face !== undefined) { // skölden stoppar skott framifrån
        let rel = Math.atan2(P.y - h.o.y, P.x - h.o.x) - h.o.face; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
        if (Math.abs(rel) < 1.1) { sparks(P.x + dx * h.d, P.y + dy * h.d, 0.5, 4); play('shield_block', 0.6, rnd(0.9, 1.2), { x: h.o.x, y: h.o.y }); spawnText(h.o.x, h.o.y, 'BLOCK', '#a0c0ff'); alertEnemy(h.o, true); left = 0; stopped = true; break; }
      }
      anyHit = true;
      const hx = P.x + dx * h.d, hy = P.y + dy * h.d;
      const k = hurtEnemy(h.o, dmg, hx, hy, { crit: c });
      if (!k && !h.o.boss && !h.o.d.armor) tryMove(h.o, dx * Math.min(0.16, dmg * 0.02 * (0.6 + wp.kick * 0.25)), dy * Math.min(0.16, dmg * 0.02 * (0.6 + wp.kick * 0.25)), 0.28); // träffen knuffar mer med tunga vapen // träffen knuffar
      if (k) { killed = true; killSet.add(h.o); } else hitSet.add(h.o);
      if (!boomAt) boomAt = { x: hx, y: hy };
      if (p < 2 && wall.dist - h.d < 1.4) wallMark(wall, dx, dy, rnd(0.25, 0.6), 'blood'); // blodstänk på väggen bakom
      afterHit(h.o, dmg, hx, hy, p);
      left--;
    }
    if (!stopped && left > 0) v27CorpseRay(dx, dy, wallDist, base); // version 27 (BLOOD): kulan går genom liken längs strålen och kan spränga dem
    if (!stopped && left > 0 && wallDist < 30) { // kulnedslag på väggen
      const hx = P.x + dx * (wallDist - 0.04), hy = P.y + dy * (wallDist - 0.04);
      if (p < 3) spawnImpact(hx, hy, rnd(0.25, 0.7));
      if (p < 4 && wallDist === wall.dist) wallMark(wall, dx, dy, P.camZ + rnd(-0.06, 0.06) + P.pitch * -0.004 + (lookActive() ? Math.tan(P.look) * wallDist : 0), 'hole'); // kulhålet hamnar där siktet pekar (upp/ned-blicken)
      if (p === 0) sparks(hx, hy, P.camZ, 3);
      if (p < 2) wpImpact(hx, hy, P.camZ, wall.cell, dx, dy); // Grafik: nedslag efter väggmaterial
      if (p === 0 && Math.random() < 0.5) play(wallMat(wall.cell) === 'metal' ? 'ricochet' : wallMat(wall.cell) === 'wood' ? 'kick' : Math.random() < 0.6 ? 'bullet_wall' : 'ricochet', 0.3, rnd(0.8, 1.3), { x: hx, y: hy });
      if (!boomAt) boomAt = { x: hx, y: hy };
      if (up('ricowall')) ricochetWall(hx, hy, dx, dy, wall.side, base * 0.8);
      if (wallDist === wall.dist && (wall.cell === 'š' || wall.cell === 'Ţ')) mirrorShot(hx, hy, dx, dy, wall.side, base, 3, p < 3); // spegelväggen studsar kulan
      if (wallDist === wall.dist && p === 0) v19WallHit(wall, hx, hy); // malmådern
    }
  }
  if (wp.musket) musketSmoke();
  if (lastRound && boomAt) { explode(boomAt.x, boomAt.y, 5 * (1 + mod('dmg')), 1.7); play('bigboom', 0.6, 1.2); P.shake = Math.max(P.shake, 1.5); }
  if (up('knock')) for (const e of hitSet) knockBack(e);
  if (up('shrapnel')) for (const e of killSet) shrapnel(e, base);
  // uppgraderingar för dubbelbössa, armborst och prickskyttegevär
  if (up('harvest') && killSet.size) { heal(3 * killSet.size); P.ammo.shells = Math.min(AMMO.shells.max, P.ammo.shells + killSet.size); }
  if (up('doublekill') && killSet.size >= 2) { finishReload(); say('DUBBELDÖD!', 1); play('reload', 0.6, 1.6); }
  if (up('stormstep')) { for (let i = 0; i < 6; i++) tryMove(P, -Math.cos(P.a) * 0.2, -Math.sin(P.a) * 0.2, 0.25); P.iframe = 0.4; }
  if (up('recover') && killSet.size) { P.ammo.bolts = Math.min(AMMO.bolts.max, P.ammo.bolts + killSet.size); finishReload(); }
  if (up('blastbolt')) for (const e of [...hitSet, ...killSet]) fuses.push({ e, x: e.x, y: e.y, t: 0.8, dmg: 8 * (1 + mod('dmg')) });
  if (up('poison')) for (const e of hitSet) e.poison = 4;
  if (up('headhunter') && killSet.size) { WS.cd = 0.08; WS.hunt = true; say('HUVUDJÄGAREN', 0.8); }
  if (anyHit) { lvlStat.hits++; run.hits = (run.hits || 0) + 1; }
  if (anyHit) { hitMark = 0.15; hitKill = killed; hitCrit = crit; play(killed ? 'gem' : 'click', killed ? 0.22 : 0.18, killed ? 1.6 : 2.4); }
  WS.spread = Math.min(0.06, WS.spread + wp.spread * 0.7 + (wp.id === 'shotgun' ? 0.02 : 0.004));
  if (P.mags[P.weapon] === 0 && P.ammo[wp.ammo] > 0) setTimeout(() => { if (WS.state === 'idle' && P.mags[P.weapon] === 0) startReload(); }, effDelay(wp) * 1000 + 120);
}
