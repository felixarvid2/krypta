function renderWalls(W, VH, px, dirX, dirY, qX, qY, hor, camZ, nd) { // väggar (egen funktion: egen inbäddningsbudget, så att shadeFog bäddas in både här och i golvloopen)
  v28Begin(); // version 28 (REND): genomsiktliga lager per kolumn
  for (let x = 0; x < W; x++) {
    const camX = 2 * x / W - 1, rdx = dirX + qX * camX, rdy = dirY + qY * camX;
    const hit = V28.glass ? v28Cast(P.x, P.y, rdx, rdy, x) : cast(P.x, P.y, rdx, rdy, 48, true); // version 28 (REND): strålen går förbi galler och fönster
    const perp = Math.max(0.05, hit.dist);
    zbuf[x] = perp;
    l29Side(x, hit.side); // version 29 (LJUS): väggsidan för ljuset i grafikkortet
    const scale = PSC / perp;
    const top = hor - scale * (1 - camZ), lh = scale;
    const t = hit.cell === 'D' ? tex.door_wood : hit.cell === 'G' || hit.cell === '|' ? tex.door_metal_gate : hit.cell === ']' ? tex.door_locked : hit.cell === '*' ? tex[wallTexFor[lvl.secretWall] || wallTexFor[1]]
      : hit.cell === '9' && (hit.mx * 7 + hit.my * 3) % 3 === 0 ? tex.wall_house_window : tex[wallTexFor[hit.cell]]; // vart tredje hus har ett upplyst fönster
    let u = (hit.wx * t.w) | 0;
    if ((hit.side === 0 && rdx > 0) || (hit.side === 1 && rdy < 0)) u = t.w - 1 - u;
    let L = lightAt(hit.lx, hit.ly);
    if (hit.side === 1) L *= 0.8;
    if (t === tex.wall_house_window) L *= 0.85 + 0.15 * Math.sin(tmr * 9 + hit.mx * 3 + hit.my); // fönsterljuset flimrar
    const wci = hit.lx >= 0 && hit.ly >= 0 && hit.lx < mw && hit.ly < mh ? (hit.ly | 0) * mw + (hit.lx | 0) : -1;
    const y0 = Math.max(0, Math.ceil(top)), y1 = Math.min(VH - 1, Math.floor(top + lh - 0.001));
    const step = t.h / lh;
    let v = (y0 - top) * step;
    for (let y = y0; y <= y1; y++) { if (nd === null || nd[y]) px[y * W + x] = shadeFog(t.data[Math.min(t.h - 1, v | 0) * t.w + u], L, perp, wci); v += step; }
    if (hit.mx !== undefined && wallMarks.size) { // kulhål och blodstänk
      const marks = wallMarks.get((hit.my * mw + hit.mx) * 4 + faceOf(hit.side, rdx, rdy));
      if (marks) for (const m of marks) {
        const du = Math.abs(m.u - hit.wx); if (du > m.r) continue;
        if (m.v27) { v27WallPx(px, W, VH, x, m, hit.wx, top, lh, L, perp); continue; } // version 27 (BLOOD): blodstänk i materialets färg
        const hh = Math.sqrt(m.r * m.r - du * du) * (m.kind === 'blood' ? 1.6 : 1), cy = top + (1 - m.z) * lh;
        const ya = Math.max(0, Math.ceil(cy - hh * lh)), yb = Math.min(VH - 1, Math.floor(cy + hh * lh));
        const col = m.kind === 'blood' ? shadeFog(0xff10109a, L, perp) : m.kind === 'web' ? shadeFog(0xffc8c8c8, L, perp) : shadeFog(0xff101418, L * 0.8, perp);
        if (m.kind === 'scorch') { const ku = du / m.r, kl = 1 / (m.r * lh); for (let y = ya; y <= yb; y++) { const i = y * W + x, dv = (y - cy) * kl, rr = ku * ku + dv * dv, c = px[i]; // VÄRLD: sot mörkar väggen mot mitten, ojämn kant
          if (rr < 0.2) px[i] = 0xff000000 | (((c >> 2) & 0x3f3f3f) + ((c >> 3) & 0x1f1f1f)); else if (rr < 0.6) px[i] = 0xff000000 | ((c >> 1) & 0x7f7f7f); else if (((y * 5 + x * 3 + m.seed) % 3) > 1.4) px[i] = 0xff000000 | (((c >> 1) & 0x7f7f7f) + ((c >> 2) & 0x3f3f3f)); } continue; }
        for (let y = ya; y <= yb; y++) if ((m.kind !== 'blood' || ((y * 7 + x * 3 + m.seed) % 5) > 0.8) && (m.kind !== 'web' || ((y + x) % 3 === 0 || (y * 3 + x * 5) % 7 === 0))) px[y * W + x] = col;
        if (m.kind === 'blood' && yb + 1 < VH) for (let y = yb + 1; y < Math.min(VH, yb + 1 + Math.round(lh * 0.06 * ((m.seed + x) % 3) / 2)); y++) px[y * W + x] = col; // rinner nedåt
      }
    }
  }
}
