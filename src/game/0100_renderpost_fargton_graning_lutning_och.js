function renderPost() { // färgton, gråning, lutning och utskrift – alltid i skärmens 320×200
  if (glPost()) return; // version 28 (WEBGL): grafikkortet ritar ut bilden
  applyGrade();
  if (P.hp < maxHp() * 0.3 && state === 'play' && settings.lowHpGray !== false) desaturate(0.55 * (1 - P.hp / (maxHp() * 0.3))); // låg HP: bilden gråas
  if (Math.abs(P.roll) > 0.002 && (state === 'play' || state === 'dead')) { // lutning vid sidosteg och fall vid döden
    rollCtx.putImageData(frame, 0, 0);
    if (Math.abs(P.roll) > 0.05) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, VH); } // stor lutning: hörnen som bilden inte täcker blir svarta (inte gamla bildrutor)
    ctx.save(); ctx.translate(W / 2, VH / 2); ctx.rotate(P.roll); { const ar = Math.abs(P.roll), rs = Math.max(1.05, Math.min(1.35, Math.cos(ar) + (W / VH) * Math.sin(ar))); ctx.scale(rs, rs); } ctx.drawImage(rollCan, -W / 2, -VH / 2); ctx.restore(); // större lutning (döden): förstora så att hörnen täcks
  } else ctx.putImageData(frame, 0, 0);
  if (photo) { ctx.fillStyle = '#000'; ctx.fillRect(0, VH, W, HUD_H); }
}
let skyFx = false, skyOwn = false, bossIntro = 0;
const MOON_A = 0.9;
const SKY_TOPR = 24, skyZen = [0, 0, 0]; let skyZenOf = null, skyClean = null; // ovanför panoramat: rader per himmelshöjd (130 px) och zenitfärgen (medel av de 14 översta raderna)
function skyPrep(sky) { // zenitfärgen och en kopia av panoramat utan den målade månen (raderna fylls i från sidorna)
  skyZenOf = sky; const s = [0, 0, 0], n = 14 * sky.w, d = sky.data, w = sky.w; for (let i = 0; i < n; i++) { const c = d[i]; s[0] += c & 255; s[1] += (c >> 8) & 255; s[2] += (c >> 16) & 255; } for (let k = 0; k < 3; k++) skyZen[k] = s[k] / n;
  skyClean = Uint32Array.from(d); let x0 = w, x1 = -1, y0 = sky.h, y1 = -1;
  for (let y = 0; y < sky.h >> 1; y++) for (let x = 0; x < w; x++) { const c = d[y * w + x]; if ((c & 255) + ((c >> 8) & 255) + ((c >> 16) & 255) > 330) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
  if (x1 < 0 || x1 - x0 > w / 8) return; x0 -= 3; x1 += 3; y0 = Math.max(0, y0 - 2); y1 += 2;
  for (let y = y0; y <= y1; y++) { const a = d[y * w + (x0 + w) % w], b = d[y * w + (x1 + w) % w]; for (let x = x0 + 1; x < x1; x++) { const k = (x - x0) / (x1 - x0), m = ch => Math.round(((a >> ch) & 255) * (1 - k) + ((b >> ch) & 255) * k);
    skyClean[y * w + (x + w) % w] = 0xff000000 | (m(16) << 16) | (m(8) << 8) | m(0); } }
}
const moonDa = new Float64Array(LK_W); // vinkeln från månen per kolumn (räknas en gång per bildruta i renderWorld)
function skyPixel(c, x, y, hor) { // månen, molnen och stjärnfall på natthimlen
  const a = colAng[x], top = hor - y;
  if (spr.moon && !skyOwn) { const da = moonDa[x]; const mx = (da / 0.16 + 0.5) * spr.moon.w, my = spr.moon.h - (top - 34) / 26 * spr.moon.h;
    if (mx >= 0 && mx < spr.moon.w && my >= 0 && my < spr.moon.h) { const m = spr.moon.data[(my | 0) * spr.moon.w + (mx | 0)]; if (m >>> 24) c = floorEvent === 'bloodmoon' ? (m & 0xff00ffff) | 0x60 << 8 : m; } }
  if (spr.clouds && !skyOwn && top > 6 && top < 30) { const cl = spr.clouds, u = ((((a / TAU) + 1) * cl.w * 2 + tmr * 3) | 0) % cl.w, v = ((top - 6) / 24 * cl.h) | 0; const m = cl.data[(cl.h - 1 - v) * cl.w + u]; if (m >>> 24) c = m; }
  if (lvl && lvl.biome === 'volcano' && !skyOwn) c = (c & 0xff000000) | (Math.min(255, ((c >> 16) & 255) * 0.5) << 16) | (Math.min(255, ((c >> 8) & 255) * 0.6 + 8) << 8) | Math.min(255, (c & 255) * 1.3 + 40 + (top > 20 ? 0 : (20 - top) * 2)); // röd himmel av glöd och rök
  if (lightning > 0.05 && !settings.noFlash) { const k = lightning * 120; c = 0xff000000 | (Math.min(255, ((c >> 16) & 255) + k * 1.15) << 16) | (Math.min(255, ((c >> 8) & 255) + k) << 8) | Math.min(255, (c & 255) + k * 0.95); } // VÄRLD: blixten lyser upp himlen
  if (star && !skyOwn) { let da = a - star.a; da = Math.atan2(Math.sin(da), Math.cos(da)); const sx = star.t * 0.5, sy = star.y + star.t * 14; if (Math.abs(da - sx) < 0.05 && Math.abs(top - (40 - sy) + da * 60) < 1.2 && da < sx) c = 0xffffffff; }
  return c;
}
