function renderWorld(W, VH, px) { // måtten och bufferten som parametrar (snabbare än de globala let-variablerna i de heta looparna)
  [fogR, fogG, fogB] = lvl.fog || [0, 0, 0];
  if (floorEvent === 'bloodmoon') { fogR = Math.min(255, fogR + 40); fogG = fogG * 0.6; fogB = fogB * 0.6; }
  if (lightning > 0 && !settings.noFlash) { const k = lightning * 120; fogR = Math.min(255, fogR + k); fogG = Math.min(255, fogG + k); fogB = Math.min(255, fogB + k * 1.2); } // blixten lyser upp dimman
  const sh = shakeAmt();
  const a = P.a + sh * 0.035 * Math.sin(tmr * 37);
  const dirX = Math.cos(a), dirY = Math.sin(a), plX = -dirY * plane, plY = dirX * plane;
  const pk = W / SW, qX = plX * pk, qY = plY * pk, nd = LK.on ? LK.need : null; // upp/ned-blicken: bredare buffert med samma skala (qX/qY), och bara raderna som skärmen läser (nd)
  const camZ = P.camZ + Math.sin(P.bob * 2) * 0.012 * P.bobAmp - (P.camSink || 0); P.camSink = Math.max(0, (P.camSink || 0) - 0.02); // kvicksand och simning sänker kameran
  const hor = HORIZON + Math.round(sh * 6 * Math.sin(tmr * 53 + 1) + (LK.on ? 0 : P.pitch)); // med upp/ned-blicken ingår rekylen i vinkeln
  view = { dirX, dirY, plX: qX, plY: qY, hor, camZ, a, pk };
  const ce = tex[lvl.ceil] || tex.floor_stone, sky = spr['sky_' + lvl.biome] || spr.sky, outdoor = !!lvl.sky;
  skyOwn = sky !== spr.sky; // egen biomhimmel: ingen måne, inga nattmoln och inga stjärnfall ovanpå
  if (skyZenOf !== sky) skyPrep(sky);
  skyFx = outdoor && !settings.lowfx;
  const sdat = nd !== null && skyFx && spr.moon && !skyOwn ? skyClean : sky.data; // upp/ned-blicken: panoramats målade måne syns annars som en andra måne bredvid spr.moon
  for (let x = 0; x < W; x++) { const camX = 2 * x / W - 1; colAng[x] = Math.atan2(dirY + qY * camX, dirX + qX * camX); }
  if (skyFx && spr.moon) for (let x = 0; x < W; x++) { const da = colAng[x] - MOON_A; moonDa[x] = Math.atan2(Math.sin(da), Math.cos(da)); }
  if (W29.cur) { w29World(W, VH, px, dirX, dirY, qX, qY, hor, camZ, nd, plX, plY, sky, sdat, outdoor, ce); return; } // version 29 (VÄRLD): grafikkortet ritar väggar, golv, tak och himmel
  // golv och tak (eller natthimmel där rutan är öppen)
  for (let y = 0; y < VH; y++) {
    if (nd !== null && !nd[y]) continue;
    const isFloor = y > hor;
    if (y === hor) { for (let x = 0; x < W; x++) px[y * W + x] = 0xff000000 | (fogB << 16) | (fogG << 8) | fogR; continue; }
    const rowDist = isFloor ? PSC * camZ / (y - hor) : PSC * (1 - camZ) / (hor - y);
    const dim = isFloor ? 1 : 0.62;
    const cs = isFloor ? null : V28C.m; // version 28 (REND): takfläckarna (null utan fläckar: ingen kostnad)
    const x0 = P.x + (dirX - qX) * rowDist, y0 = P.y + (dirY - qY) * rowDist;
    const stx = (2 * qX * rowDist) / W, sty = (2 * qY * rowDist) / W;
    const sk = (hor - y) / Math.max(40, hor - HORIZON + SHOR + 30), skm = ((sk - 1) * SKY_TOPR / 14) % 2; // sk > 1 bara när man tittar upp: ovanför panoramat
    const skb = sk > 1 ? Math.min(1, (sk - 1) * 0.7) : 0, skb1 = 1 - skb; // där speglas de översta molnraderna (ovanför den målade månen) och tonar mot zenitfärgen
    const sv = Math.min(sky.h - 1, Math.max(0, (sk > 1 ? (skm < 1 ? skm : 2 - skm) * 13 : sky.h * (1 - sk)) | 0)) * sky.w; // himlens rad
    const sz = nd !== null ? LK.sZ[y] : 0, xa = nd === null ? 0 : sz ? LK.sU[y] | 0 : LK.xa[y], xb = nd !== null ? LK.xb[y] : W - 1;
    let fx2 = x0 + stx * xa, fy2 = y0 + sty * xa, us = sz ? LK.sU[y] : 0;
    for (let x = xa; x <= xb;) {
      const cx = Math.floor(fx2), cy = Math.floor(fy2), inside = cx >= 0 && cy >= 0 && cx < mw && cy < mh, ci = cy * mw + cx;
      if (!isFloor && (inside ? cellSky[ci] : outdoor)) { // öppen himmel: panoramat följer blickriktningen
        let c = sdat[sv + ((((colAng[x] / TAU) + 1) * sky.w) | 0) % sky.w];
        if (skb > 0) c = 0xff000000 | (((((c >> 16) & 255) * skb1 + skyZen[2] * skb) | 0) << 16) | (((((c >> 8) & 255) * skb1 + skyZen[1] * skb) | 0) << 8) | (((c & 255) * skb1 + skyZen[0] * skb) | 0);
        if (skyFx) c = skyPixel(c, x, y, hor);
        px[y * W + x] = c;
      } else {
        const t = isFloor ? floorTexs[inside ? cellFloor[ci] : 0] : ce;
        const u = ((fx2 - cx) * t.w) | 0, v = ((fy2 - cy) * t.h) | 0;
        px[y * W + x] = shadeFog(cs === null || !inside || cs[ci] === 0 ? t.data[v * t.w + u] : v28CeilPx(t.data[v * t.w + u], cs[ci], fx2 - cx, fy2 - cy, ci), (inside ? light[ci] : lvl.ambient) * dim, rowDist, inside ? ci : -1); // version 28: takfläck
      }
      if (sz === 0) { x++; fx2 += stx; fy2 += sty; } else { us += sz; const nx = us | 0; fx2 += stx * (nx - x); fy2 += sty * (nx - x); x = nx; } // gles rad: hoppa till nästa punkt som läses
    }
  }
  renderWalls(W, VH, px, dirX, dirY, qX, qY, hor, camZ, nd);
  glPreSprites(); // version 28 (WEBGL): partiklar i grafikkortet i den här bildrutan?
  renderSprites(plX, plY);
  v28Flush(); // version 28 (REND): galler och fönster som ingen sprite har ritat än
}
