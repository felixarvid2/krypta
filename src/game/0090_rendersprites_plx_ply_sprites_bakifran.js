function renderSprites(plX, plY) { // sprites bakifrån och fram (egen funktion: renderWorld hålls liten nog för att shadeFog ska bäddas in i golv- och väggloopen)
  const list = [];
  for (const e of ents) list.push({ x: e.x, y: e.y, k: 'e', o: e });
  drawR25World(list); // version 25: befälhavarens fana, granaterna och deras ringar
  ropePoints(list); drawV9World(list); drawV11World(list); drawV13World(list); drawV14World(list); drawV15World(list); drawV17World(list); drawV18World(list); drawV19World(list); drawV20World(list); drawV21World(list); drawV22World(list); drawV23World(list);
  drawV24World(list); // version 24: märken vid de enkelriktade dörrarna, landmärkets ljuspelare
  for (const it of items) if (!it.taken) list.push({ x: it.x, y: it.y, k: 'i', o: it });
  for (const p of pots) if (!p.broken) list.push({ x: p.x, y: p.y, k: 'p', o: p });
  for (const t of torches) if (!t.hidden) list.push({ x: t.x, y: t.y, k: 't', o: t });
  for (const c of chests) list.push({ x: c.x, y: c.y, k: 'c', o: c });
  for (const m of merchants) if (shadowVisible(m)) list.push({ x: m.x, y: m.y, k: 'm', o: m });
  if (pet) list.push({ x: pet.x, y: pet.y, k: 'pet', o: pet });
  { const gp = ghostPos(); if (gp) list.push({ x: gp.x, y: gp.y, k: 'gh', o: gp }); }
  for (const b of boulders) list.push({ x: b.x, y: b.y, k: 'bo', o: b });
  if (lvl.exit && gfxWOn()) list.push({ x: lvl.exit.x + 0.5, y: lvl.exit.y + 0.5, k: 'gw', o: lvl.exit }); // VÄRLD: utgångens ljuspelare och ring
  if (lvl.beams && !settings.lowfx) for (const b of lvl.beams) list.push({ x: b.x + 0.5, y: b.y + 0.5, k: 'be', o: b });
  for (const a of allies) list.push({ x: a.x, y: a.y, k: 'al', o: a });
  const glPs = glPartsSwap(); // version 28 (WEBGL): partiklarna blir instanser i grafikkortet (listan nedan ser en tom lista)
  for (const p of particles) list.push({ x: p.x, y: p.y, k: 'x', o: p });
  glPartsBack(glPs); // version 28 (WEBGL)
  for (const p of projectiles) list.push({ x: p.x, y: p.y, k: 'f', o: p });
  for (const p of portals) list.push({ x: p.x, y: p.y, k: 'g', o: p });
  for (const d of decals) list.push({ x: d.x, y: d.y, k: 'q', o: d });
  for (const h of hazards) if (h.t >= h.warn || h.kind === 'meteor' || h.kind === 'rockfall') list.push({ x: h.x, y: h.y, k: 'z', o: h });
  for (const c of clones) if (c.t >= 0) list.push({ x: c.x, y: c.y, k: 'n', o: c });
  for (const g of ghosts) list.push({ x: g.x, y: g.y, k: 'h', o: g });
  for (const ic of icicles) list.push({ x: ic.x, y: ic.y, k: 'ic', o: ic });
  for (const e of echoes) list.push({ x: e.x, y: e.y, k: 'y', o: e });
  for (const m of mirrors) list.push({ x: m.x, y: m.y, k: 'w', o: m });
  for (const p of props) { if (p.broken) continue; const dx = p.x - P.x, dy = p.y - P.y; if (dx * dx + dy * dy < 900) list.push({ x: p.x, y: p.y, k: 'q', o: p }); }
  for (const s of list) s.d = (s.x - P.x) ** 2 + (s.y - P.y) ** 2;
  list.sort((p, q) => q.d - p.d);
  for (const s of list) try { // en trasig sprite får inte stoppa bilden
    const o = s.o; spriteSX = spriteSY = 1; spriteClip = 0; spriteOutline = 0;
    if (s.k === 'x' && s.d < 0.2 && o.size < 0.3) continue; // småpartiklar alldeles framför kameran blir jättestora
    if (s.k === 'e') {
      if (o.boss) {
        if (o.dead || o.hidden) continue;
        const moving = Math.hypot(o.mvx || 0, o.mvy || 0) > 0.002; // springer: titta åt rörelsen, annars mot spelaren
        const flip = moving ? (o.mvx * plX + o.mvy * plY) < 0 : (o.x - P.x) * plX + (o.y - P.y) * plY > 0;
        gfxEBoss(o); // FIENDER: skugga, skakning, fasbyte, dödsskakningar (sätter spriteSX/SY/Clip och gfxEOff)
        drawSprite(bossFrame(o), o.x + gfxEOff.x, o.y + gfxEOff.y, o.d.size * (o.formK || 1), o.dying ? -o.dying * 0.3 : 0, flip, null, Math.max(gfxEOff.f, o.flash > 0 ? o.flash : 0), 0.75, false,
          o.dying ? [255, 120, 60] : o.stun > 0 ? [160, 200, 255] : o.id === 'ghost' ? [190, 220, 255] : o.id === 'monk' ? [190, 140, 255] : null, o.id === 'ghost' ? 0.2 : o.ghostB || 0);
        if (!o.dying) v26bTell(o, s.d); // version 26B (krokrad, B): pareringsmarkeringen för bossar och väktare
        spriteSX = spriteSY = 1; spriteClip = 0; spriteOutline = 0; continue;
      }
      if (!o.dead && o.state === 'attack') o.flip = (o.x - P.x) * plX + (o.y - P.y) * plY > 0; // vänd mot mitten när den anfaller
      else if (!o.dead && (o.mvx || o.mvy)) o.flip = o.mvx * plX + o.mvy * plY < 0;
      if ((o.gibbed && !gfxEChar(o)) || (o.hidden && o.under)) continue; // tentakeln under ytan syns inte; FIENDER: en brinnande som dog syns förkolnad en stund
      const tint = o.dead ? null : o.goldT > tmr ? [255, 205, 60] : o.backT > tmr ? [255, 150, 40] : o.empowered ? [210, 120, 255] : o.bounty ? (tmr % 0.6 < 0.3 ? [255, 120, 60] : [255, 200, 90]) : o.champion ? [255, 215, 90] : o.frozen > 0 ? [150, 210, 255] : o.burn > 0 ? [255, 150, 70] : o.slow > 0 ? [120, 170, 255] : o.marks >= 4 ? [210, 110, 255] : o.poison > 0 ? [140, 255, 100] : o.haste > 0 ? [150, 255, 150] : o.elite ? o.elite.tint : o.veteran ? [255, 175, 165] : null;
      if (!o.dead && fx.parts.shadow && s.d < 200) drawSprite(fx.parts.shadow[0], o.x, o.y, 0.05 * o.d.size * gfxEShadowK(o), 0, false, null, 0, 0); // skugga på golvet (flygare: mindre ju högre)
      gfxEPose(o, enemyFrames[o.type]); // FIENDER: squash & stretch, knuff, andning, gångstuds, spawn och dödsfall
      if (o.airZ > 0) gfxEOff.z += v26bAirZ(o); // version 26B (krokrad, B): jonglering – fienden i luften ritas högre
      const tele = !o.dead && o.state === 'attack' && o.d.melee && enemyFrames[o.type] && o.t < enemyFrames[o.type].attack.length / o.d.atkFps * o.d.hitAt && o.t > enemyFrames[o.type].attack.length / o.d.atkFps * o.d.hitAt - 0.18 ? 0.45 : 0; // anfallet blinkar i förväg
      const tw = o.dead && o.t < 0.5 && !o.boss ? Math.sin(tmr * 70) * 0.025 * (0.5 - o.t) * 2 : 0; // sista ryckningen
      if (settings.outline && !o.dead && !o.dormant) spriteOutline = o.elite || o.boss ? 0xff30c0ff : 0xff3050ff;
      else if ((o.elite || o.champion || o.frozen > 0) && !o.dead && !o.dormant && !(o.ghost > 0.5) && s.d < 150) spriteOutline = gfxEAura(o); // FIENDER: elitens/championens kontur pulserar
      V27B.cur = v27SprPre(o); // version 27 (BLOOD): blod på den sårade fiendens bild (drawSprite byter bilden mot en cachad kopia)
      drawSprite(enemyFrame(o), o.x + tw * plX + gfxEOff.x, o.y + tw * plY + gfxEOff.y, o.d.size * 1.15, gfxEOff.z + ((o.d.ai === 'fly' || o.d.ai === 'wisp' || o.d.float) && !o.dead && !o.anchored ? 0.3 + Math.sin(tmr * 3 + o.x) * 0.06 : 0), o.flip, null, Math.max(tele, o.flash > 0 ? o.flash : 0), settings.contrast && !o.dead ? 0.65 : o.elite ? 0.3 : 0, false, gfxEOff.t || tint, o.dead ? 0 : o.ghost || 0);
      V27B.cur = null; // version 27 (BLOOD)
      spriteOutline = 0; spriteSX = spriteSY = 1; spriteClip = 0; gfxETele(o); gfxEOver(o, s.d); // FIENDER: glöd före skott, stjärnor vid bedövning
      if (o.carry && !o.dead && !(o.ghost > 0.5)) { const ci = o.carry === 'key' ? spr.key : o.carry === 'grenade' ? spr.grenade : o.carry === 'potion' ? spr.potion_unknown || spr.health : fx.coin[Math.floor(tmr * 8) % 4]; if (ci) drawSprite(ci, o.x, o.y, 0.12, o.d.size * 1.05 + 0.05 * Math.sin(tmr * 4), false, null, 0, 0.6); } // bär ett föremål
      if (o.leader && !o.dead && fx.parts.star) drawSprite(fx.parts.star[0], o.x, o.y, 0.08, o.d.size * 1.12, false, 1.6, 0, 0, true, [255, 220, 90]); // ledaren
      if (!o.dead) v26bTell(o, s.d); // version 26B: gul blink och romb = parerbart slag, blått kryss = inte parerbart
      if (!o.dead && o.alert && !o.dormant && !(o.ghost > 0.5) && s.d < 220 && lightAt(o.x, o.y) < 0.4 && o.d.ai !== 'wisp' && gfxEOff.z > -0.3 * o.d.size) drawSprite(fx.parts.eye ? fx.parts.eye[0] : fx.hit[1], o.x + gfxEOff.x, o.y + gfxEOff.y, fx.parts.eye ? 0.035 * o.d.size : 0.03, gfxEOff.z + (o.d.ai === 'fly' ? 0.3 : 0) + o.d.size * Math.min(0.82, gfxEHead(enemyFrame(o)) * 1.15 - 0.17), false, 2.2, 0, 0, true, [255, 50, 30]); // glödande ögon i mörkret
    } else if (s.k === 'i') {
      const hopZ = o.hop > 0 ? Math.sin(o.hop / 0.5 * Math.PI) * 0.25 : 0; gfxWItem(o, s.d, plX, plY); // VÄRLD: skugga och glimt
      if (o.type === 'gold' || o.type === 'goldpile') { drawSprite(fx.coin[Math.floor(tmr * 8 + o.x * 3) % 4], o.x, o.y + 0 * hopZ, o.type === 'goldpile' ? 0.24 : 0.16, 0.05 + 0.03 * Math.sin(tmr * 4 + o.y) + hopZ, false, null, 0, 0.6); continue; }
      if (o.type === 'page' || o.type === 'battery' || o.type === 'stones') { const im = spr[o.type === 'page' ? 'page' : o.type === 'battery' ? 'battery' : 'stone']; drawSprite(im || fx.hit[1], o.x, o.y, o.type === 'stones' ? 0.08 : 0.16, 0.05 + 0.04 * Math.sin(tmr * 3 + o.x), false, o.type === 'page' ? 1.6 : null, 0, 0.6, !im, im ? null : [255, 230, 160]); continue; }
      if (o.type === 'knifepick') { drawSprite(fx.parts.knife ? fx.parts.knife[0] : fx.hit[1], o.x, o.y, 0.04, 0.03, false, null, 0, 0.5); continue; }
      if (o.type === 'rune') { const im = spr['rune_' + o.rune] || spr.rune_item; drawSprite(im || fx.hit[1], o.x, o.y, 0.16, 0.12 + 0.05 * Math.sin(tmr * 3 + o.x), false, 1.8, 0, 0, !im, im ? null : [200, 160, 255]); continue; }
      if (o.type === 'meat') { drawSprite(spr.meat || fx.parts.gib && fx.parts.gib[0] || fx.hit[0], o.x, o.y, 0.14, 0.04, false, null, 0, 0.5); continue; }
      if (o.type === 'arrowpick') { drawSprite(fx.parts.arrow ? fx.parts.arrow[0] : fx.hit[1], o.x, o.y, 0.05, 0.25, false, null, 0, 0.5); continue; }
      if (o.type === 'potion') { const im = spr[potKnown(o.pot) ? 'potion_' + o.pot : 'potion_unknown'] || spr['potion_' + o.pot]; drawSprite(im || spr.health, o.x, o.y, im ? 0.22 : 0.3, 0.05 + 0.04 * Math.sin(tmr * 3 + o.x) + hopZ, false, null, 0, 0.6, false, im ? null : POTIONS[o.pot] ? POTIONS[o.pot].tint : null); continue; }
      if (o.type === 'cardpick') { drawSprite(spr.cardback, o.x, o.y, 0.34, 0.12 + 0.05 * Math.sin(tmr * 3 + o.x), false, 2, 0, 0.8); continue; }
      if (o.type === 'grenade' || o.type === 'key' || o.type === 'scroll') { drawSprite(spr[o.type] || fx.coin[0], o.x, o.y, o.type === 'key' ? 0.2 : 0.18, 0.05 + 0.04 * Math.sin(tmr * 3 + o.x), false, null, 0, 0.7); continue; }
      if (o.type === 'ammo' && o.mult && o.mult !== 1) { drawSprite((o.mult > 1 ? spr.ammo_big : spr.ammo_small) || spr.ammo, o.x, o.y, o.mult > 1 ? 0.42 : 0.24, 0.04 + 0.04 * Math.sin(tmr * 3 + o.x), false, null, 0, 0.5); continue; }
      if (o.type === 'legend') { const L = LEGENDS[o.legend] || LEGENDS.dragonshotgun; drawSprite(spr['pick_' + L.base + '_legend'] || spr['pick_' + L.base] || fx.coin[0], o.x, o.y, 0.3, 0.08 + 0.05 * Math.sin(tmr * 3 + o.x), false, 1.6, 0, 0.5, false, L.col); continue; }
      const img = spr[o.type] || spr['pick_' + o.type];
      if (o.type === 'shard') { drawSprite(spr.armor, o.x, o.y, 0.2, 0.04 + 0.04 * Math.sin(tmr * 4 + o.x), false, null, 0, 0.5, false, [150, 200, 255]); continue; }
      const big = o.type === 'health' || o.type === 'armor';
      drawSprite(img, o.x, o.y, big ? 0.42 : o.type === 'ammo' ? 0.32 : 0.3, 0.04 + 0.04 * Math.sin(tmr * 3 + o.x), false, null, 0, 0.5);
    } else if (s.k === 'p') drawSprite(fx.pots[o.color], o.x, o.y, 0.55, 0, false);
    else if (s.k === 't') drawSprite(fx.fire[Math.floor(tmr * 14 + o.ph * 5) % 16], o.x, o.y, 0.85 * gfxWFlame(o), 0, false, 2.2, 0, 0, true);
    else if (s.k === 'c') { drawSprite(o.open ? fx.chestOpen[Math.min(3, Math.floor(o.t * 10))] : fx.chest[Math.floor(tmr * 3) % 4], o.x, o.y, 0.5, gfxWChestZ(o), false, null, 0, 0.6, false, o.open ? null : o.locked ? [255, 220, 120] : o.cursed ? [200, 120, 255] : null);
      if (!o.open && o.rare && Math.random() < 0.15) particles.push({ x: o.x + rnd(-0.25, 0.25), y: o.y + rnd(-0.25, 0.25), z: rnd(0.1, 0.4), vx: 0, vy: 0, vz: 0.3, life: 0.5, maxLife: 0.5, img: fx.hit[1], size: 0.05, add: true, tint: [255, 230, 120], drift: true }); } // sällsynta kistor glittrar
    else if (s.k === 'm') drawSprite(fx.merchant[Math.floor(tmr * 5) % 6], o.x, o.y, 1.05, 0, (o.x - P.x) * plX + (o.y - P.y) * plY > 0, null, 0, o.shadow ? 0.25 : 0.55, false, o.shadow ? [150, 120, 255] : null, o.shadow ? 0.35 : 0);
    else if (s.k === 'pet') drawPet(o, plX, plY);
    else if (s.k === 'bo') drawSprite(fx.props.boulder ? fx.props.boulder[Math.floor(o.t * 8) % fx.props.boulder.length] : fx.shards[7], o.x, o.y, 0.9, 0, false, null, 0, 0.4);
    else if (s.k === 'gw') gfxWExit(o, s.d);
    else if (s.k === 'be') drawSprite(fx.parts.beam ? fx.parts.beam[0] : fx.hit[1], o.x, o.y, 1.15, 0, false, 0.9 + 0.1 * Math.sin(tmr + o.x), 0, 0, true, [255, 230, 170]); // ljusstråle
    else if (s.k === 'gh') drawSprite(bossFx.ghost ? bossFx.ghost.idle[Math.floor(tmr * 7) % bossFx.ghost.idle.length] : fx.hit[1], o.x, o.y, 0.55, 0.1, false, 1.2, 0, 0, false, [140, 255, 180], 0.6); // spöket
    else if (s.k === 'al') drawSprite(enemyFrame(o), o.x, o.y, o.d.size * 1.15, o.d.ai === 'fly' ? 0.3 : 0, (o.mvx || o.mvy) ? o.mvx * plX + o.mvy * plY < 0 : false, null, 0, 0.4, false, o.tint, 0.15);
    else if (s.k === 'q') { if (o.def && o.def.light && !o.used && !settings.lowfx && s.d < 150) drawSprite(fx.fireball[4], o.x, o.y, o.size * 0.9, o.size * 0.3, false, 0.35 + 0.05 * Math.sin(tmr * 7 + o.ph), 0, 0, true, o.poisoned ? [90, 255, 80] : PROP_GLOW[o.ch] || [255, 170, 80]); // glöd
      const sw = GFXW_SWAY[o.ch] ? gfxWSway(o) : 0; gfxWPropPose(o); // VÄRLD: hängande lyktor, ljuskronor, nät och klockor svänger
      if (o.def) drawSprite(propImg(o), o.x + (o.off && !o.axis ? o.off : 0) + plX * sw, o.y + (o.off && o.axis ? o.off : 0) + plY * sw, o.size, o.z || 0, o.flip, o.def.light && !o.used ? 1.6 : null, o.flashT > tmr ? 0.8 : 0, o.def.npc ? 0.45 : 0.3, false, o.poisoned ? [130, 255, 120] : null); else drawSprite(o.img, o.x, o.y, o.size, 0, o.flip); }
    else if (s.k === 'ic') drawSprite(fx.parts.icicle ? fx.parts.icicle[0] : fx.hit[1], o.x, o.y, 0.3, o.fall < 0 ? 0.68 : Math.max(0, 0.68 - o.fall * o.fall * 4), false, null, 0, 0.5, false, [200, 230, 255]);
    else if (s.k === 'h') drawSprite(bossFx.ghost.idle[Math.floor(tmr * 7) % bossFx.ghost.idle.length], o.x, o.y, 0.9, 0.15 + Math.sin(tmr * 2) * 0.05, (o.x - P.x) * plX + (o.y - P.y) * plY > 0, 1.2, 0, 0, false, [170, 230, 200], 0.45);
    else if (s.k === 'y') drawSprite(fx.graves[0], o.x, o.y, 0.5, 0, false, null, 0, 0.5, false, [200, 160, 255]);
    else if (s.k === 'n') drawSprite(bossFx.nightmare ? bossFx.nightmare.run[Math.floor(tmr * 10) % bossFx.nightmare.run.length] : fx.fireball[0], o.x, o.y, 1.6, 0, Math.cos(o.a) * plX + Math.sin(o.a) * plY < 0, 0.5, 0, 0, false, [60, 40, 90], 0.5);
    else if (s.k === 'w') drawSprite(bossFx.ghost ? bossFx.ghost.idle[Math.floor(tmr * 7) % bossFx.ghost.idle.length] : fx.fireball[0], o.x, o.y, 1.65, 0.1 + Math.sin(tmr * 2 + o.x) * 0.05, false, null, 0, 0.75, false, [190, 220, 255], 0.35);
    else if (s.k === 'z' && (o.kind === 'meteor' || o.kind === 'rockfall') && o.t < o.warn) { const k = 1 - o.t / o.warn; // faller ned
      drawSprite(o.kind === 'meteor' ? (fx.parts.meteor ? fx.parts.meteor[Math.floor(tmr * 10) % 2] : fx.fireball[0]) : (fx.parts.rock ? fx.parts.rock[0] : fx.shards[7]), o.x, o.y, o.kind === 'meteor' ? 0.5 : 0.35, k * 3, false, o.kind === 'meteor' ? 2.2 : null, 0, 0.5, o.kind === 'meteor'); }
    else if (s.k === 'z' && (o.kind === 'meteor' || o.kind === 'rockfall')) { /* nedslaget syns som partiklar */ }
    else if (s.k === 'z') { const k = Math.min(1, (o.t - o.warn) * 6, (o.warn + o.life - o.t) * 4); // faror växer upp och sjunker undan
      if (o.kind === 'sandpit') drawSprite(fx.parts.sand ? fx.parts.sand[Math.floor(tmr * 6) % fx.parts.sand.length] : fx.hit[1], o.x, o.y, 0.5 * k, 0, false, null, 0, 0.4, false, [210, 180, 120]);
      else if (o.kind === 'lavaburst') drawSprite(fx.fire[Math.floor(tmr * 14 + o.x * 5) % 16], o.x, o.y, 0.9 * k, 0, false, 2.4, 0, 0, true, [255, 120, 40]);
      else if (o.kind === 'icespike') drawSprite(fx.parts.icicle ? fx.parts.icicle[0] : fx.hit[1], o.x, o.y, 0.6 * k, 0, false, 1.4, 0, 0, false, [190, 230, 255]);
      else if (o.kind === 'pillar') drawSprite(bossFx.beast.pillar[Math.floor(tmr * 10) % 2], o.x, o.y, 2.2 * k, 0, false, 2.4, 0, 0, true);
      else drawSprite(fx.fire[Math.floor(tmr * 14 + o.x * 5) % 16], o.x, o.y, 0.7 * k, 0, false, 2.2, 0, 0, true, [25, 80, 255]); }
    else if (s.k === 'g') drawSprite(fx.portal[Math.floor(tmr * 10) % 8], o.x, o.y, Math.min(1.25, o.t * 3), 0.02, false, 2.4, 0, 0, true, o.kind === 'boss' ? [255, 170, 120] : o.biome && portals.length > 1 ? BIOME_TINT[o.biome] || null : null);
    else if (s.k === 'f' && o.kind === 'axe') drawSprite(spr.pick_axe || fx.hit[0], o.x, o.y, 0.3, o.z - 0.1, Math.floor(tmr * 12) % 2 === 0, null, 0, 0.6);
    else if (s.k === 'f' && o.kind === 'barrel') drawSprite(o.img, o.x, o.y, 0.5, 0, Math.floor(tmr * 8) % 2 === 0, null, 0, 0.5);
    else if (s.k === 'f' && o.kind === 'log') drawSprite(fx.parts.log ? fx.parts.log[Math.floor(tmr * 8) % fx.parts.log.length] : fx.hit[0], o.x, o.y, 0.3, 0, false, null, 0, 0.5);
    else if (s.k === 'f' && o.kind === 'skull') drawSprite(fx.parts.skull ? fx.parts.skull[Math.floor(tmr * 8) % 2] : fx.fireball[0], o.x, o.y, 0.24, o.z - 0.1, false, 2, 0, 0, true, [120, 190, 255]);
    else if (s.k === 'f' && o.kind === 'web') drawSprite(fx.parts.webshot ? fx.parts.webshot[0] : fx.hit[0], o.x, o.y, 0.15, o.z - 0.05, false, null, 0, 0.7);
    else if (s.k === 'f' && o.kind === 'arrow') drawSprite(fx.parts.rock ? fx.parts.rock[0] : fx.hit[0], o.x, o.y, 0.08, o.z - 0.05, false, null, 0, 0.6, false, PROJ_TINT_ARROW);
    else if (s.k === 'f' && o.kind === 'stone') drawSprite(spr.stone || fx.shards[7], o.x, o.y, 0.05, o.z - 0.03, false, null, 0, 0.5);
    else if (s.k === 'f' && PROJ_DRAW_V8[o.kind]) PROJ_DRAW_V8[o.kind](o);
    else if ((s.k === 'sw' || s.k === 'tb' || s.k === 'st') && drawV9Sprite(s)) { /* version 9 */ }
    else if (s.k === 'v11' && drawV11Sprite(s)) { /* version 11 */ }
    else if (s.k === 'v13' && drawV13Sprite(s)) { /* version 13 */ }
    else if (s.k === 'v14' && drawV14Sprite(s)) { /* version 14 */ }
    else if (s.k === 'v15' && drawV15Sprite(s)) { /* version 15 */ }
    else if (s.k === 'v17' && drawV17Sprite(s)) { /* version 17 */ }
    else if (s.k === 'r25' && drawR25Sprite(s)) { /* version 25: fienderoller */ }
    else if (s.k === 'v18' && drawV18Sprite(s)) { /* version 18 */ }
    else if (s.k === 'v19' && drawV19Sprite(s)) { /* version 19 */ }
    else if (s.k === 'v20' && drawV20Sprite(s)) { /* version 20 */ }
    else if (s.k === 'v21' && drawV21Sprite(s)) { /* version 21 */ }
    else if (s.k === 'v22' && drawV22Sprite(s)) { /* version 22 */ }
    else if (s.k === 'v23' && drawV23Sprite(s)) { /* version 23 */ }
    else if (s.k === 'v24' && drawV24Sprite(s)) { /* version 24 */ }
    else if (s.k === 'rp') drawSprite(fx.parts.harpoonrope ? fx.parts.harpoonrope[0] : fx.hit[1], o.x, o.y, 0.02, o.z, false, null, 0, 0.5, false, [150, 110, 70]);
    else if (s.k === 'f' && o.kind === 'knife') drawSprite(fx.parts.knife ? fx.parts.knife[0] : fx.hit[1], o.x, o.y, 0.04, o.z - 0.03, Math.floor(tmr * 16) % 2 === 0, null, 0, 0.6);
    else if (s.k === 'f' && o.kind === 'bandage') drawSprite(fx.parts.bandage ? fx.parts.bandage[Math.floor(tmr * 10) % fx.parts.bandage.length] : fx.hit[1], o.x, o.y, 0.06, o.z - 0.03, false, null, 0, 0.6, false, fx.parts.bandage ? null : [230, 220, 190]);
    else if (s.k === 'f' && o.kind === 'axe' && o.hammer) drawSprite(spr.pick_hammer || spr.pick_axe || fx.hit[0], o.x, o.y, 0.35, o.z - 0.1, Math.floor(tmr * 12) % 2 === 0, null, 0, 0.6);
    else if (s.k === 'f' && o.kind === 'nail') drawSprite(fx.parts.nail ? fx.parts.nail[0] : fx.hit[1], o.x, o.y, 0.03, o.z - 0.02, false, o.hot ? 2 : null, 0, 0.6, !!o.hot, o.hot ? [255, 150, 60] : [200, 200, 210]);
    else if (s.k === 'f' && o.kind === 'parrow') drawSprite(fx.parts.arrow ? fx.parts.arrow[0] : fx.hit[1], o.x, o.y, 0.05, o.z - 0.03, Math.cos(Math.atan2(o.vy, o.vx) - view.a) < 0, null, 0, 0.6, false, o.full ? [255, 230, 150] : null);
    else if (s.k === 'f' && o.kind === 'sorb') drawSprite(fx.parts.lightning ? fx.parts.lightning[Math.floor(tmr * 14) % fx.parts.lightning.length] : fx.fireball[Math.floor(tmr * 16) % 8], o.x, o.y, o.big ? 0.55 : 0.4, o.z - 0.2, false, 2.4, 0, 0, true, [150, 200, 255]);
    else if (s.k === 'f' && o.kind === 'pgren') drawSprite(spr.grenade || fx.coin[0], o.x, o.y, 0.13, o.z, false, null, 0, 0.6);
    else if (s.k === 'f') {
      if (!o.friendly && !settings.lowfx) drawSprite(fx.fireball[Math.floor(tmr * 16) % 8], o.x, o.y, o.big ? 0.9 : 0.55, o.z - 0.3, false, 1.0, 0, 0, true, PROJ_TINT[o.kind] || [255, 140, 60]); // fiendeskott glöder
      drawSprite(fx.fireball[Math.floor(tmr * 16) % 8], o.x, o.y, o.big ? 0.5 : o.kind === 'gren' || o.kind === 'spark' ? 0.18 : o.kind === 'flare' ? 0.26 : 0.3, o.z - 0.15, false, 2.4, 0, 0, true, PROJ_TINT[o.kind] || null); }
    else drawSprite(o.img, o.x, o.y, o.size, o.z, false, o.add ? (o.fade ? 2 * Math.min(1, o.life * 2, (o.maxLife - o.life) * 2) : 2) : null, 0, 0, o.add, o.tint || null);
  } catch (err) { spriteError(err, s); }
}
