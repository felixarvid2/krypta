function drawSprite(img, wx, wy, size, z, flip, fixedLight, whiteFlash = 0, minLight = 0, additive = false, tint = null, ghost = 0) {
  if (V27B.cur) img = v27SprImg(img, V27B.cur); // version 27 (BLOOD): sårad fiende – samma bild med blodstänk (cachad per bild, färg och nivå)
  const { dirX, dirY, plX, plY, hor, camZ } = view;
  const rx = wx - P.x, ry = wy - P.y;
  const inv = 1 / (plX * dirY - dirX * plY);
  const tx = inv * (dirY * rx - dirX * ry), ty = inv * (-plY * rx + plX * ry);
  if (ty < 0.12) return;
  const scale = PSC / ty;
  const sh = scale * size * spriteSY, sw = scale * size * img.w / img.h * spriteSX, vsc = img.h / sh;
  const cx = (W / 2) * (1 + tx / ty);
  const bottom = hor + scale * (camZ - z);
  const topY = bottom - sh, left = cx - sw / 2;
  const L = fixedLight || Math.max(minLight, lightAt(wx, wy));
  const sci = !fixedLight && wx >= 0 && wy >= 0 && wx < mw && wy < mh ? (wy | 0) * mw + (wx | 0) : -1;
  const x0 = Math.max(0, Math.ceil(left)), x1 = Math.min(W - 1, Math.floor(left + sw));
  const y0 = Math.max(0, Math.ceil(topY)), y1 = Math.min(VH - 1, Math.floor(spriteClip ? Math.min(bottom, hor + scale * camZ) : bottom));
  const ff = Math.exp(-ty * fogK);
  const aMul = additive && fixedLight != null ? Math.min(1.2, fixedLight / 2) : 1; // additiva sprites: fixedLight styr styrkan (uttoning)
  const tr = tint ? tint[0] / 255 * 1.3 : 1, tg = tint ? tint[1] / 255 * 1.3 : 1, tb = tint ? tint[2] / 255 * 1.3 : 1;
  const nd = px === tpx ? LK.need : null, bp = px, bw = W; // upp/ned-blicken: bara raderna som skärmen läser
  const v28g = V28T.any ? V28T.gd : null; // version 28 (REND): kolumner med galler framför bakväggen
  for (let x = x0; x <= x1; x++) {
    if (ty >= zbuf[x]) continue;
    if (v28g !== null && ty < v28g[x]) v28Over(x, ty); // version 28 (REND): spriten är framför gallret – gallret ritas först
    let u = Math.floor((x - left) / sw * img.w); if (flip) u = img.w - 1 - u;
    if (u < 0 || u >= img.w) continue;
    for (let y = y0; y <= y1; y++) {
      if (nd !== null && !nd[y]) continue;
      const v = ((y - topY) * vsc) | 0;
      if (v < 0 || v >= img.h) continue;
      let c = img.data[v * img.w + u];
      const al = c >>> 24;
      if (al < 100) { if (spriteOutline && ty < zbuf[x] && ((u > 0 && img.data[v * img.w + u - 1] >>> 24 >= 100) || (u < img.w - 1 && img.data[v * img.w + u + 1] >>> 24 >= 100) || (v > 0 && img.data[(v - 1) * img.w + u] >>> 24 >= 100) || (v < img.h - 1 && img.data[(v + 1) * img.w + u] >>> 24 >= 100))) bp[y * bw + x] = spriteOutline; continue; } // kontur (inställning)
      if (ghost && ((x * 7 + y * 13) % 10) < ghost * 10) continue; // gravrövaren: bara några pixlar syns
      const i = y * bw + x;
      if (additive) { // eld lyser: additiv blandning
        const d = bp[i], k = ff * (al / 255) * aMul;
        if (d >>> 24 !== 255 && W29.cur) { bp[i] = w29AddPx(d, c, k * tr, k * tg, k * tb); continue; } // version 29 (VÄRLD): världen under ritas av grafikkortet
        const r = Math.min(255, (d & 255) + (c & 255) * k * tr), g = Math.min(255, ((d >> 8) & 255) + ((c >> 8) & 255) * k * tg), b = Math.min(255, ((d >> 16) & 255) + ((c >> 16) & 255) * k * tb);
        bp[i] = 0xff000000 | (b << 16) | (g << 8) | r;
      } else {
        if (tint) c = 0xff000000 | (Math.min(255, ((c >> 16) & 255) * tb) << 16) | (Math.min(255, ((c >> 8) & 255) * tg) << 8) | Math.min(255, (c & 255) * tr);
        let col = shadeFog(c, L, ty, sci);
        if (whiteFlash > 0) { const f = Math.min(1, whiteFlash * 6); col = 0xff000000 | ((((col >> 16) & 255) * (1 - f) + 255 * f) << 16) | ((((col >> 8) & 255) * (1 - f) + 255 * f) << 8) | (((col & 255) * (1 - f) + 255 * f) | 0); }
        bp[i] = col;
      }
    }
  }
  if (!additive && GLR.sd !== null) glSprDepth(img, x0, x1, y0, y1, left, sw, topY, vsc, flip, ty, ghost, nd); // version 28 (WEBGL): spritedjupet för partiklarna i grafikkortet
}
// projicera en världspunkt till skärmen (för skadesiffror och livmätare)
function project(wx, wy, z) {
  const { dirX, dirY, plX, plY, hor, camZ } = view;
  const rx = wx - P.x, ry = wy - P.y, inv = 1 / (plX * dirY - dirX * plY);
  const tx = inv * (dirY * rx - dirX * ry), ty = inv * (-plY * rx + plX * ry);
  if (ty < 0.2) return null;
  if (LK.on) { // bilden var vriden: räkna i bufferten och för över till skärmen
    const bx = Math.round((LK.TW / 2) * (1 + tx / ty));
    if (bx < 0 || bx >= LK.TW || zbuf[bx] < ty) return null;
    const q = lkToScreen(bx, hor + (PSC / ty) * (camZ - z));
    if (!q || q.x < 0 || q.x >= SW) return null;
    return { sx: Math.round(q.x), sy: q.y, scale: PSC / ty * q.k };
  }
  const sx = Math.round((W / 2) * (1 + tx / ty));
  if (sx < 0 || sx >= W || zbuf[sx] < ty) return null;
  return { sx, sy: hor + (PSC / ty) * (camZ - z), scale: PSC / ty };
}
function enemyFrame(e) {
  const set = enemyFrames[e.type];
  if (e.dead && e.v26hd && gfxE.on) return e.v26hd; // version 26C: kroppen utan huvud
  let key = 'move', n = 0;
  if (e.anchored && set.anchored && !e.dead && e.state !== 'pain') return set.anchored[Math.floor(tmr * 6 + e.x) % set.anchored.length]; // vindanden har fäst sig
  if (e.kingImg && bossFx.mirrorking) return bossFx.mirrorking.idle[Math.floor(tmr * 6 + e.x * 3) % bossFx.mirrorking.idle.length]; // spegelkungens spegelbild
  if (e.blockUp && set.block && !e.dead && e.state !== 'pain' && e.state !== 'attack') return set.block[Math.min(set.block.length - 1, Math.floor((tmr - (e.blockAt || 0)) * 14))]; // spegelriddaren med skölden uppe
  if (e.rewindT > 0 && set.rewind) return set.rewind[Math.min(set.rewind.length - 1, Math.floor((1 - e.rewindT / 2.2) * set.rewind.length))]; // urverkssoldaten lindas upp
  if (!e.dead && e.downT > 0 && set.death) { const n = set.death.length; return set.death[e.downT < 0.6 ? clamp(Math.floor(e.downT / 0.6 * n), 0, n - 1) : Math.min(n - 1, Math.floor((tmr - (e.downAt || 0)) * 12))]; } // marionetten faller ihop och reser sig (dödsrutorna baklänges)
  if (!e.dead && (e.sinkT > 0 || e.riseT > 0) && set.death) { const k = e.sinkT > 0 ? 1 - e.sinkT / 0.5 : e.riseT / 0.5; return set.death[clamp(Math.floor(k * set.death.length), 0, set.death.length - 1)]; } // tentakeln dyker och kommer upp
  if (e.dead) { key = 'death'; n = Math.min(set.death.length - 1, Math.floor(e.t * 12)); }
  else if (e.state === 'pain') { key = 'pain'; n = Math.min(set.pain.length - 1, Math.floor(e.t * 14)); }
  else if (e.state === 'attack') { key = 'attack'; n = Math.min(set.attack.length - 1, Math.floor(e.t * e.d.atkFps)); }
  else if (e.state === 'idle') { key = 'idle'; n = Math.floor(tmr * 6 + e.x * 3) % set.idle.length; }
  else { n = Math.floor(e.t * 9 * e.d.speed / 1.3) % set.move.length; }
  return set[key][n];
}
function propImg(o) {
  const f = o.frames, d = o.def;
  if ((o.ch === 'ȅ' || o.ch === 'Ȇ') && f.length > 1) return f[o.fireUntil > tmr ? 1 : 0]; // pilidolen skjuter, giftblomman sprutar
  if ((o.spinUntil > tmr || o.ch === 'ǳ') && f.length > 1) return f[Math.floor(tmr * (o.ch === 'ǳ' ? 6 : 14)) % f.length]; // lyckohjulet snurrar, knivhjulet roterar
  if (d.npc || (d.use && d.anim && !o.used)) return f[Math.floor(tmr * d.anim + o.ph) % f.length];
  if (d.use) return f[o.used && f.length > 1 ? 1 : 0];
  if (d.trap) return f[o.up && f.length > 1 ? 1 : 0];
  if (o.zapUntil > tmr && f.length > 2) return f[1 + (Math.floor(tmr * 20) % 2)]; // teslaspolen slår
  if (d.anim) return f[Math.floor(tmr * d.anim + o.ph) % f.length];
  return f[0];
}
function bossFrame(b) {
  const at = (arr, k) => arr[Math.min(arr.length - 1, Math.max(0, Math.floor(k)))], loop = (arr, fps) => arr[Math.floor(tmr * fps) % arr.length];
  if (b.id === 'demon' || !bossFx[b.id]) {
    const set = enemyFrames.B;
    if (b.state === 'breath') return set.breath[Math.min(17, Math.floor(b.t * 12))];
    if (b.state === 'slam') return set.attack[Math.min(17, Math.floor(b.t * 14))];
    return set.idle[Math.floor(tmr * 7) % 6];
  }
  const f = bossFx[b.id];
  switch (b.id) {
    case 'beast': return b.state === 'breath' ? loop(f.breath, 8) : b.state === 'burn' || b.state === 'sink' ? at(f.burn, b.t * 6) : loop(f.idle, 7);
    case 'nightmare': return b.state === 'charge' || b.state === 'circle' ? loop(f.run, 10) : loop(f.idle, b.state === 'windup' ? 14 : 6);
    case 'ogre': return b.state === 'smash' || b.state === 'throw' ? at(f.attack, b.t / 1.1 * 7) : Math.hypot(b.mvx || 0, b.mvy || 0) > 0.002 ? loop(f.walk, 8) : loop(f.idle, 5);
    case 'monk': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : ['beam', 'volley', 'dive', 'gears', 'spit'].includes(b.state) ? loop(f.attack, 9) : b.state === 'idle' ? loop(f.idle, 6) : loop(f.cast, 9);
    case 'gardener': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'lunge' ? loop(f.attack, 10) : b.state === 'seeds' || b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'sandman': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'sand' ? loop(f.attack, 9) : b.state === 'blink' || b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'captain': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'slash' || b.state === 'pistol' ? loop(f.attack, 10) : b.state === 'fade' || b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'ratking': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'bite' || b.state === 'spew' ? loop(f.attack, 10) : b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'bathmaster': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'ladle' || b.state === 'scald' ? loop(f.attack, 10) : b.state === 'dive' || b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'pyrelord': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'claw' || b.state === 'pillar' ? loop(f.attack, 10) : b.state === 'rain' || b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'butcher': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'cleave' ? loop(f.attack, 10) : b.state === 'hook' || b.state === 'meat' || b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'warlord': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'sword' || b.state === 'whirl' || b.state === 'ride' ? loop(f.attack, 10) : b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'executioner': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'chop' || b.state === 'hook' ? loop(f.attack, 10) : b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'tidepriest': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'staff' || b.state === 'wave' ? loop(f.attack, 10) : b.state === 'tentacles' || b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'sphinx': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'paw' || b.state === 'eyes' ? loop(f.attack, 10) : b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'foreman': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'sledge' || b.state === 'throw' ? loop(f.attack, 10) : b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'starseer': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'bolt' ? loop(f.attack, 10) : b.state === 'well' || b.state === 'blink' || b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'ringmaster': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'whip' || b.state === 'cane' ? loop(f.attack, 10) : b.state === 'act' || b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'serpent': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'spit' || b.state === 'tail' || b.state === 'emerge' ? loop(f.attack, 10) : b.state === 'dive' || b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'alchemist': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'smash' || b.state === 'lunge' || b.state === 'throw' ? loop(f.attack, 10) : b.state === 'drink' || b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'cardinal': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'ring' ? loop(f.attack, 9) : b.state === 'light' || b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'queenbee': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'dash' ? loop(f.attack, 10) : b.state === 'honey' || b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 8);
    case 'librarian': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'runes' ? loop(f.attack, 10) : b.state === 'ink' || b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'colossus': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'slam' || b.state === 'charge' ? loop(f.attack, 9) : b.state === 'furnace' || b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'mycelmother': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'spores' || b.state === 'slam' ? loop(f.attack, 9) : b.state === 'roots' || b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'mirrorking': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'shards' ? loop(f.attack, 10) : b.state === 'mirror' || b.state === 'blink' || b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 7);
    case 'clockmaker': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'gears' ? loop(f.attack, 9) : b.state === 'bubble' || b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'thunderbird': return b.dying && f.death ? at(f.death, b.dying * 6) : b.state === 'dive' ? loop(f.dive, 10) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'storm' || b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 8);
    case 'crystalqueen': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'volley' || b.state === 'beam' ? loop(f.attack, 9) : b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'leviathan': return b.dying && f.death ? at(f.death, b.dying * 6) : b.state === 'submerge' || b.state === 'emerge' ? at(f.submerge, b.state === 'emerge' ? (1 - b.t / 0.8) * f.submerge.length : b.t / 1.6 * f.submerge.length) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'spit' || b.state === 'wave' ? loop(f.attack, 9) : b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'pharaoh': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state === 'idle' ? loop(f.hurt, 12) : b.state === 'beam' ? loop(f.attack, 8) : b.state === 'storm' || b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'flame': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state !== 'slam' ? loop(f.hurt, 12) : b.state === 'slam' ? at(f.attack, b.t / 1.3 * f.attack.length) : b.state === 'volley' || b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 7);
    case 'frost': return b.dying && f.death ? at(f.death, b.dying * 6) : b.flash > 0.06 && f.hurt && b.state !== 'slam' ? loop(f.hurt, 12) : b.state === 'slam' ? at(f.attack, b.t / 1.1 * f.attack.length) : b.state === 'shards' || b.state === 'special' ? loop(f.cast, 9) : loop(f.idle, 6);
    case 'ghost': return b.state === 'vanish' ? at(f.vanish, b.t * 10) : b.state === 'appear' ? at(f.appear, b.t * 10) : b.state === 'shriek' ? loop(f.shriek, 10) : b.state === 'orbs' ? loop(f.idle, 10) : loop(f.chase, 8);
  }
  return loop(f.idle, 6);
}

// ---------- Förstapersonsvapen ----------
const wcan = document.createElement('canvas'), wctx = wcan.getContext('2d');
function weaponFrame() { // bildruta och förskjutning: vapnet sticker rakt fram (Doom/Quake), rörelser görs här
  const wp = WEAPONS[P.weapon], f = WF[wp.id] || WF.pistol, st = f.states;
  const pick = (arr, k) => arr[clamp(Math.floor(k * arr.length), 0, arr.length - 1)];
  let idx = st.idle[0], dx = 0, dy = 0;
  if (WS.shot < f.dur.fire) idx = pick(st.fire, WS.shot / f.dur.fire);
  else if (st.draw && WS.draw > 0) idx = pick(st.draw, WS.draw * 0.999); // bågen spänns
  else if (st.throw && wp.spear && (WS.spearT || 0) > 0) idx = pick(st.throw, clamp(1 - WS.spearT / 0.35, 0, 0.999)); // spjutet kastas
  else if (st.throw && wp.shears && (WS.shearT || 0) > 0) idx = pick(st.throw, clamp(1 - WS.shearT / 0.4, 0, 0.999)); // saxen kastas
  else if (st.empty && wp.shears && P.shearOut) idx = st.empty[0]; // saxen i luften
  else if (st.throw && wp.hookchain && v23hook) idx = v23hook.t < 0.25 ? pick(st.throw, v23hook.t / 0.25 * 0.999) : (st.empty || st.throw)[0];
  else if (st.dash && wp.scimitar && (WS.dashT || 0) > 0) idx = pick(st.dash, clamp(1 - WS.dashT / ((f.dur && f.dur.dash) || 0.36), 0, 0.999)); // kroksabelns utfallssteg
  else if (st.ward && wp.runebook && (P.wardT || 0) > tmr) idx = st.ward[Math.floor(tmr * 8) % st.ward.length]; // sidvirveln
  else if (st.block && wp.mirrorshield && WS.block) idx = pick(st.block, clamp((tmr - (WS.blockAt || 0)) / 0.25, 0, 0.999)); // skölden uppe
  else if (st.empty && (wp.boomerang || wp.spear) && P.mags[P.weapon] <= 0) idx = st.empty[0]; // bumerangen i luften, spjutet på marken
  else if (st.reload && WS.state === 'reload' && !wp.shellReload) idx = pick(st.reload, clamp(WS.t / (wp.reload * reloadMul()), 0, 0.999)); // egna omladdningsrutor
  else if (st.charge && WS.hcharge > 0) { idx = pick(st.charge, Math.min(1, WS.hcharge) * 0.999); if (WS.hcharge >= 0.7 && wp.hammer && !settings.reduceMotion) dx += Math.sin(tmr * 40) * 1.2; } // hammaren lyfts och darrar (stjärnlansen lyfts utan att darra)
  const kt = WS.shot / 0.16; // rekyl: knyck nedåt och tillbaka
  if (kt < 1) dy += Math.sin(Math.min(1, kt) * Math.PI) * wp.kick * 7 * (1 - WS.aim * 0.5);
  if (WS.state === 'draw') dy += (1 - easeOut(WS.t / drawTime())) * f.h;
  else if (WS.state === 'holster') dy += easeIn(WS.t / 0.14) * f.h;
  else if (WS.state === 'reload' && !(st.reload && !wp.shellReload)) {
    if (wp.shellReload) { // ner lite för varje patron
      const k = WS.t / shellSeg(WS.shellPhase);
      dy += WS.shellPhase === 'start' ? easeOut(k) * 34 : WS.shellPhase === 'end' ? (1 - easeIn(k)) * 34 : 34 + Math.sin(k * Math.PI) * 10;
      dx += WS.shellPhase === 'step' ? -Math.sin(k * Math.PI) * 4 : 0;
    } else if (WA.off) dy += Math.sin(clamp(WS.t / (wp.reload * reloadMul()), 0, 1) * Math.PI) * f.h * 0.75; // annars: wfxPose (omladdning per vapentyp)
  }
  dx += (160 - (f.x + f.w / 2)) * WS.aim * 0.6; dy -= WS.aim * 6; // sikta: in mot mitten och upp
  if (state === 'dead' || state === 'runover') dy += Math.min(f.h, P.deadT * 160);
  return { f, idx, dx, dy };
}
const easeOut = k => 1 - (1 - clamp(k, 0, 1)) ** 2, easeIn = k => clamp(k, 0, 1) ** 2;
const drawTime = () => 0.22; // snabba byten som i Doom och Dusk
const shellSeg = ph => (ph === 'start' ? 0.32 : ph === 'step' ? 0.5 : 0.42) * reloadMul();
