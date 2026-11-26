// ---------- Version 27: FX – mynningsflammor, nedslag, explosioner, miljö och bossar ----------
// Bygger på version 25/25.1 och grafikblocken (VAPEN, FIENDER, VÄRLD) utan att ersätta dem:
// - mynningsflammor per vapentyp (hagel, gevär, kpist, magi, tunga vapen): pixelritade i kod vid första användningen (inga filer),
//   ritas i stället för den gamla MuzzleFlash.png i samma bildruta och på samma plats; världsljuset får vapnets färg
// - nedslag efter material: gnista och heta studsande gnistor i metall, dammoln i sten, snurrande flisor i trä, glitter i is/glas,
//   stänk eller fräsande lava när skottet träffar nära en vätska (högst 3 förstärkta nedslag per bildruta)
// - explosioner: chockvåg på marken (Effekseer-ringen efx_ring som växer), dammvåg, skräp som studsar och ryker, glöd som falnar
//   (gul → röd → mörk) och kvardröjande rök; i vatten en kaskad och i lava ett lavastänk
// - miljö: snö och damm under fötterna, fräsande lava, gnistor från sågklingor, glöd från brinnande mark, glimmer från kistor och magiska föremål
// - bossar: Effekseer-smällen efx_burst och en chockvåg på skärmen vid fasbyte, smällar under dödsanimationen, en ljuspelare,
//   guldgnistor och en vit blixt (inte med noFlash) när bossen dör
// Allt går genom den vanliga partikellistan (det nya bara till 120, bossarna till 215), effektsprites genom efxOk (högst 10, avståndsgränser).
// settings.lowfx (även den automatiska) stänger av allt nytt; noFlash dämpar mynningsflammorna och skärmeffekterna. FX27.off och
// FX27.f.<del> är spärrar för A/B-mätning. Bossar och steg läses av från fx27Tick (ingen krok i andras block).
const FX27 = { off: false, f: { muzzle: true, impact: true, boom: true, env: true, boss: true }, muz: {}, muzT: -9, muzF: 0, muzR: 0, fixed: false,
  impT: -1, impN: 0, boomT: -9, boomN: 0, cool: [], grow: [], trail: [], sched: [], hud: [], lvl: null, low: false, stepD: 0, sawT: 0, glT: 0, img: null,
  n: { muzzle: { shot: 0, rifle: 0, smg: 0, magic: 0, heavy: 0 }, impact: { metal: 0, stone: 0, wood: 0, ice: 0, glass: 0 }, splash: 0, sizzle: 0, boom: 0, ring: 0, debris: 0, embers: 0, smoke: 0,
    step: 0, snow: 0, lava: 0, wade: 0, saw: 0, fire: 0, glint: 0, phase: 0, death: 0, deathBooms: 0, final: 0, hud: 0, skip: 0 } };
Object.assign(EFX_FRAMES, { ring: 6, burst: 12 }); Object.assign(EFX_NEAR, { ring: 0.6, burst: 1.5 }); Object.assign(EFX.n, { ring: 0, burst: 0 }); // laddas av efxLoad
const FX27_MUZ = { pistol: 'rifle', rifle: 'rifle', sniper: 'rifle', smg: 'smg', nailgun: 'smg', sawlauncher: 'smg', shotgun: 'shot', dbshotgun: 'shot', blunderbuss: 'shot',
  staff: 'magic', runebook: 'magic', dreamstaff: 'magic', prism: 'magic', starlance: 'magic', sporelauncher: 'magic', hivelauncher: 'magic',
  launcher: 'heavy', bombard: 'heavy', chaincannon: 'heavy', brimstone: 'heavy', musket: 'heavy', flaregun: 'heavy' };
const FX27_MCOL = { staff: [140, 190, 255], runebook: [255, 120, 210], dreamstaff: [255, 190, 255], prism: [170, 255, 255], starlance: [255, 235, 150], sporelauncher: [170, 255, 110], hivelauncher: [255, 210, 90] };
const FX27_MSIZE = { shot: 1.2, rifle: 1.0, smg: 0.85, magic: 1.1, heavy: 1.3 };
const fx27On = k => !FX27.off && FX27.f[k] && !settings.lowfx;
for (const [id, col] of Object.entries({ shotgun: [255, 170, 70], dbshotgun: [255, 160, 60], blunderbuss: [255, 150, 60], musket: [255, 175, 90], bombard: [255, 140, 50], chaincannon: [255, 150, 60], brimstone: [255, 120, 40], ...FX27_MCOL }))
  if (!(id in MUZZLE_COL)) Object.defineProperty(MUZZLE_COL, id, { get: () => fx27On('muzzle') ? col : undefined, enumerable: true }); // världsljuset i vapnets färg (av: den gamla färgen)
function fx27Pix(n, fn) { // en liten bild i spelets pixelformat (som strip/pixels ger): fn(x, y) -> [r, g, b, a]
  const d = new Uint32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const c = fn(x - (n - 1) / 2, y - (n - 1) / 2); if (c && c[3] >= 100) d[y * n + x] = ((c[3] & 255) << 24 | (c[2] & 255) << 16 | (c[1] & 255) << 8 | (c[0] & 255)) >>> 0; }
  return { w: n, h: n, data: d };
}
function fx27Imgs() { // stjärnan (gnistor, glitter) och en mjuk prick
  if (FX27.img) return FX27.img;
  const star = fx27Pix(9, (x, y) => { const r = Math.hypot(x, y), v = Math.max(1.2 - r / 2, (Math.abs(y) < 0.6 || Math.abs(x) < 0.6) ? 1 - r / 4.6 : 0); return v > 0.75 ? [255, 255, 255, 255] : v > 0.4 ? [210, 210, 210, 255] : v > 0.15 ? [120, 120, 120, 255] : null; });
  const dot = fx27Pix(5, (x, y) => { const r = Math.hypot(x, y); return r < 1 ? [255, 255, 255, 255] : r < 2.2 ? [150, 150, 150, 255] : null; });
  return (FX27.img = { star, dot });
}
function fx27MuzImg(t, col) { // tre bildrutor 32×32 per typ, ritade i kod med fast slump (samma varje gång), färg mot en trappa i fyra steg
  const key = t + (col ? col.join(',') : ''); if (FX27.muz[key]) return FX27.muz[key];
  let seed = 7; for (const ch of key) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const R = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const pal = col ? [[255, 255, 255], col.map(v => Math.min(255, v * 0.8 + 70)), col, col.map(v => v * 0.5)] : t === 'heavy' ? [[255, 250, 220], [255, 200, 90], [240, 110, 30], [150, 50, 20]] : [[255, 255, 235], [255, 230, 130], [255, 160, 50], [190, 70, 20]];
  const N = 32, fr = [];
  for (let f = 0; f < 3; f++) {
    const sp = [], dots = [], a0 = R() * TAU; let core = 3.5, ring = 0, blob = 0, ph = [R() * TAU, R() * TAU, R() * TAU];
    if (t === 'rifle') { core = 3.6; for (let i = 0; i < 4; i++) sp.push([a0 + i * Math.PI / 2, i % 2 ? 8 + R() * 3 : 13 + R() * 2.5, 2.3]); for (let i = 0; i < 4; i++) sp.push([a0 + Math.PI / 4 + i * Math.PI / 2, 4 + R() * 2, 1.4]); }
    else if (t === 'smg') { core = 3; for (let i = 0; i < 3; i++) sp.push([a0 + i * TAU / 3 + (R() - 0.5) * 0.5, 8 + R() * 5, 2]); }
    else if (t === 'shot') { core = 5.5; blob = 6.5; for (let i = 0; i < 9; i++) sp.push([a0 + i * TAU / 9 + (R() - 0.5) * 0.4, 9 + R() * 6, 2.6]); for (let i = 0; i < 7; i++) { const a = R() * TAU, r = 9 + R() * 5.5; dots.push([Math.cos(a) * r, Math.sin(a) * r]); } }
    else if (t === 'heavy') { core = 5; blob = 10.5; for (let i = 0; i < 6; i++) sp.push([a0 + i * TAU / 6 + (R() - 0.5) * 0.5, 13 + R() * 2.5, 3]); }
    else { core = 3; ring = 9 + f; for (let i = 0; i < 4; i++) sp.push([a0 + i * Math.PI / 2, 14, 1.1]); for (let i = 0; i < 5; i++) { const a = R() * TAU, r = 5 + R() * 9; dots.push([Math.cos(a) * r, Math.sin(a) * r]); } }
    const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), im = g.createImageData(N, N), d = im.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const px = x - 15.5, py = y - 15.5, r = Math.hypot(px, py), an = Math.atan2(py, px);
      let v = core > 0 ? 1.25 * (1 - r / core) : 0;
      if (blob) { const br = blob * (0.78 + 0.13 * Math.sin(3 * an + ph[0]) + 0.08 * Math.sin(7 * an + ph[1]) + 0.05 * Math.sin(11 * an + ph[2])); v = Math.max(v, 0.85 * (1 - r / br) + 0.2 * (r < br ? 1 : 0)); }
      if (ring) v = Math.max(v, 0.8 - Math.abs(r - ring) * 0.5);
      for (const [a, L, w] of sp) { const al = px * Math.cos(a) + py * Math.sin(a), pe = Math.abs(-px * Math.sin(a) + py * Math.cos(a)); if (al <= 0 || al >= L) continue; const k = al / L, hw = w * (1 - k) + 0.45; if (pe < hw) v = Math.max(v, (1 - pe / hw) * (1.05 - k * 0.75)); }
      for (const [dx, dy] of dots) { const q = Math.hypot(px - dx, py - dy); if (q < 1.3) v = Math.max(v, 0.9 - q * 0.4); }
      const i = (y * N + x) * 4, lv = v > 0.82 ? 0 : v > 0.58 ? 1 : v > 0.34 ? 2 : v > 0.14 ? 3 : -1; if (lv < 0) continue;
      d[i] = pal[lv][0]; d[i + 1] = pal[lv][1]; d[i + 2] = pal[lv][2]; d[i + 3] = 255;
    }
    g.putImageData(im, 0, 0); fr.push(c);
  }
  return (FX27.muz[key] = fr);
}
function fx27Muzzle(wp, mq, s) { // från drawWeapon: ritar typens flamma (den gamla ritas då genomskinlig); falskt = som förut
  if (!fx27On('muzzle') || !(s > 0)) return false; const t = FX27_MUZ[wp.id]; if (!t) return false;
  const frs = fx27MuzImg(t, t === 'magic' ? FX27_MCOL[wp.id] || [190, 140, 255] : null), nf = !!settings.noFlash;
  if (WS.shot < FX27.wsShot - 1e-6 || tmr - FX27.muzT > 0.07) { FX27.muzF = (FX27.muzF + 1 + ((Math.random() * 2) | 0)) % 3; FX27.muzR = Math.random() * TAU; FX27.n.muzzle[t]++; } // ett nytt skott: ny bildruta och vridning
  FX27.muzT = tmr; FX27.wsShot = WS.shot; // ett nytt skott: WS.shot börjar om (kpisten skjuter tätare än 0,07 s mellan ritningarna)
  const k = s * FX27_MSIZE[t], fr = frs[FX27.fixed ? 0 : FX27.muzF];
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = false; ctx.globalAlpha = nf ? 0.45 : 1;
  ctx.translate(mq[0], mq[1]); if (!nf && !FX27.fixed) ctx.rotate(FX27.muzR);
  ctx.drawImage(fr, -k / 2, -k / 2, k, k);
  if (t === 'heavy' && !nf) { ctx.globalAlpha = 0.5; ctx.drawImage(frs[(FX27.muzF + 1) % 3], -k * 0.75, -k * 0.75, k * 1.5, k * 1.5); } // tunga vapen: en större, svagare låga bakom
  ctx.restore(); return true;
}
let FX27_SOFT = 120; // det nya fyller partikellistan bara till 120, så att kärnan i smällen (VAPEN, version 25), blodet och träffarna alltid får plats
const FX27_ROOM = { frame: 200, boom: 150 }; // samlad budget (prestandakollen): listan hålls under VAPENs hårda tak 215, och en smäll får plats för sin kärna
function fx27Room(n) { if (FX27.off || settings.lowfx || particles.length <= n) return; FX27.n.trim = (FX27.n.trim || 0) + particles.length - n; pbTrim(n); } // de äldsta (rök, glöd, droppar som snart är borta) får ge plats, som taket 260 redan gör
function fx27P(p, hard) { if (hard !== 'hard' && particles.length >= FX27_SOFT) return null; if (p.maxLife === undefined) p.maxLife = p.life; return wpPart(p, hard === 'hard') ? p : null; } // bossarna och effektsprites: VAPENs hårda tak 215
function fx27Cool(p, kind) { if (!p) return; p.c27 = kind; if (FX27.cool.length >= 48) FX27.cool.shift(); FX27.cool.push({ p, kind, end: tmr + p.life }); }
const FX27_COOL = { ember: [[255, 240, 160], [255, 160, 60], [210, 70, 25], [90, 28, 12]], spark: [[255, 250, 210], [255, 200, 110], [230, 110, 40], [120, 40, 15]] };
function fx27Splash(x, y, lq, hot, k) { // stänk i vätska eller fräsande lava
  const sm = fx.parts.steam || fx.parts.smoke || fx.hit, drop = (fx.parts.drop || fx.hit)[0];
  if (hot) { FX27.n.sizzle++;
    for (let i = 0; i < Math.round(3 + 3 * k); i++) fx27Cool(fx27P({ x, y, z: 0.04, vx: rnd(-1, 1) * k, vy: rnd(-1, 1) * k, vz: rnd(1, 2.4) * Math.sqrt(k), life: rnd(0.7, 1.1), img: (fx.parts.lavadrop || fx.fireball)[0], size: 0.04, add: true, grav: true, tint: [255, 170, 60] }), 'ember');
    for (let i = 0; i < Math.round(1 + k); i++) fx27P({ x: x + rnd(-0.2, 0.2), y: y + rnd(-0.2, 0.2), z: 0.05, vx: rnd(-0.15, 0.15), vy: rnd(-0.15, 0.15), vz: rnd(0.35, 0.6), life: rnd(0.8, 1.2), frames: sm, img: sm[0], size: 0.14 * Math.sqrt(k), fade: true, drift: true, tint: [225, 215, 205] });
    return; }
  FX27.n.splash++; const tint = GFXW_BUB[lq] || [200, 230, 255];
  for (let i = 0; i < Math.round(4 + 5 * k); i++) fx27P({ x: x + rnd(-0.08, 0.08) * k, y: y + rnd(-0.08, 0.08) * k, z: 0.03, vx: rnd(-0.7, 0.7) * k, vy: rnd(-0.7, 0.7) * k, vz: rnd(1.6, 2.8) * Math.sqrt(k), life: rnd(0.5, 0.9), img: drop, size: 0.035, grav: true, tint }); // kaskaden
  for (let i = 0; i < 6; i++) { const b = i / 6 * TAU; fx27P({ x: x + Math.cos(b) * 0.1, y: y + Math.sin(b) * 0.1, z: 0.01, vx: Math.cos(b) * 0.9 * k, vy: Math.sin(b) * 0.9 * k, vz: 0, life: 0.5, img: fx.hit[1], size: 0.03, add: true, fade: true, tint }); } // ringen på ytan
}
function fx27Impact(x, y, z, mat, dx, dy) { // från wpImpact (kulnedslag efter väggens material): förstärkningen ovanpå VAPENs nedslag
  if (!fx27On('impact') || !fx.hit) return;
  if (FX27.impT !== tmr) { FX27.impT = tmr; FX27.impN = 0; } if (++FX27.impN > 3) { FX27.n.skip++; return; } // hagel och spikgeväret: högst 3 per bildruta
  const ex = x - P.x, ey = y - P.y; if (ex * ex + ey * ey > 196) return;
  FX27.n.impact[mat]++; const I = fx27Imgs(), ox = -dx, oy = -dy, bx = x + ox * 0.03, by = y + oy * 0.03;
  if (mat === 'metal') {
    fx27P({ x: bx, y: by, z: z - 0.06, vx: 0, vy: 0, vz: 0, life: 0.09, img: I.star, size: 0.19, add: true, tint: [255, 245, 210] }); // gnistan
    for (let i = 0; i < 4; i++) fx27Cool(fx27P({ x: bx, y: by, z, vx: ox * rnd(2.2, 4) + rnd(-1.4, 1.4), vy: oy * rnd(2.2, 4) + rnd(-1.4, 1.4), vz: rnd(0.6, 2), life: rnd(0.45, 0.75), img: I.dot, size: 0.026, add: true, grav: true, bounce: true, tint: [255, 230, 150] }), 'spark'); // heta gnistor som studsar och svalnar
    fx27Cool(fx27P({ x: x - dx * 0.01, y: y - dy * 0.01, z, vx: 0, vy: 0, vz: 0, life: 0.6, img: I.dot, size: 0.05, add: true, tint: [255, 170, 70] }), 'ember'); // het fläck där kulan slog i
  } else if (mat === 'wood') {
    const sh = fx.parts.shard || fx.parts.rock; if (sh) for (let i = 0; i < 2; i++) fx27P({ x: bx, y: by, z, vx: ox * rnd(1, 2) + rnd(-0.9, 0.9), vy: oy * rnd(1, 2) + rnd(-0.9, 0.9), vz: rnd(1, 2.2), life: rnd(0.9, 1.3), frames: sh, img: sh[0], flap: true, size: 0.05, grav: true, bounce: true, tint: [200, 145, 85] }); // flisor som snurrar
    fx27P({ x: bx, y: by, z: z - 0.05, vx: ox * 0.25, vy: oy * 0.25, vz: -0.12, life: 1.1, img: (fx.parts.smoke || fx.hit)[0], size: 0.11, drift: true, tint: [150, 115, 70] }); // sågdamm som singlar ned
  } else if (mat === 'ice' || mat === 'glass') {
    const tint = mat === 'glass' ? BIOME_TINT[lvl.biome] || [220, 235, 255] : [200, 235, 255];
    for (let i = 0; i < 2; i++) fx27P({ x: bx + rnd(-0.08, 0.08), y: by + rnd(-0.08, 0.08), z: z + rnd(-0.1, 0.1), vx: ox * 0.3, vy: oy * 0.3, vz: rnd(-0.2, 0.2), life: rnd(0.25, 0.4), img: I.star, size: rnd(0.06, 0.09), add: true, fade: true, tint }); // glitter
  } else {
    const sm = fx.parts.smoke2 || fx.parts.smoke || fx.hit, tint = lvl && /desert|tomb/.test(lvl.biome) ? [190, 165, 120] : [135, 125, 110];
    for (let i = 0; i < 2; i++) fx27P({ x: bx + ox * 0.08, y: by + oy * 0.08, z: z - 0.05, vx: ox * rnd(0.3, 0.6) + rnd(-0.2, 0.2), vy: oy * rnd(0.3, 0.6) + rnd(-0.2, 0.2), vz: rnd(-0.05, 0.1), life: rnd(0.9, 1.3), frames: sm, img: sm[0], size: rnd(0.13, 0.2), drift: true, tint }); // dammoln
    fx27P({ x: bx, y: by, z, vx: ox * rnd(1, 1.8) + rnd(-0.6, 0.6), vy: oy * rnd(1, 1.8) + rnd(-0.6, 0.6), vz: rnd(0.8, 1.6), life: rnd(0.8, 1.1), img: wpImg('rock'), size: 0.035, grav: true, bounce: true, tint: [150, 140, 128] }); // ett större stenskott
  }
  if (z < 0.4 && map) { const c = map[y | 0] && map[y | 0][x | 0], lq = GFXW_STEPLIQ[c], hot = c === '_' || c === 'Ź'; if (lq || hot) fx27Splash(x, y, lq, hot, 0.6); } // lågt skott vid en vätska
}
function fx27Boom(x, y, r, big) { // från explode efter version 25: det som saknades i explosionen
  if (!fx27On('boom') || !fx.hit || solid(x, y)) return; const ex = x - P.x, ey = y - P.y; if (ex * ex + ey * ey > 484) return;
  if (tmr - FX27.boomT > 0.12) { FX27.boomT = tmr; FX27.boomN = 0; } if (++FX27.boomN > 2) { FX27.n.skip++; return; } // kedjor av krutfat: högst två rika smällar åt gången
  const d0 = Math.sqrt(ex * ex + ey * ey); FX27.n.boom++; FX27.sched.push({ t: tmr + 0.02, fn: () => fx27BoomFx(x, y, r, big, d0) }); // en bildruta senare: kärnan i alla smällar i samma bildruta (VAPEN, version 25) får sina platser först
}
function fx27BoomFx(x, y, r, big, d0) { // d0: avståndet när det smällde (tryckvågen kan ha knuffat spelaren bakåt sedan dess)
  if (solid(x, y) || !map) return; const ex = x - P.x, ey = y - P.y, k = clamp(r / 2, 0.6, 1.8) * (big ? 1.15 : 1), c = map[y | 0] && map[y | 0][x | 0], lq = GFXW_STEPLIQ[c], hot = c === '_' || c === 'Ź';
  if (lq || hot) fx27Splash(x, y, lq, hot, 1.5 * k); // vattenkaskad eller lavastänk
  const sm = fx.parts.smoke2 || fx.parts.smoke || fx.hit, dust = lq ? [190, 210, 230] : lvl && /desert|tomb/.test(lvl.biome) ? [200, 170, 120] : [150, 132, 110];
  const dc = Math.min(d0 ?? 99, Math.sqrt(ex * ex + ey * ey)), wr = Math.min(1.2 + r * 0.6, (dc - 0.7) / 1.2); // avståndet till kameran: ringen och dammvågen når aldrig fram till den
  if (dc > 1.6 && efx2Live() < 6 && efxOk('ring', x, y)) { const p = fx27P({ x, y, z: -0.05, vx: 0, vy: 0, vz: 0, life: 0.8, frames: fx.efx.ring, img: fx.efx.ring[0], size: 0.1, tint: dust.map(v => Math.min(255, v + 25)), efx: 'ring' }); // chockvågen på marken: en dammring (inte additiv, syns mot det upplysta golvet)
    if (p) { EFX.n.ring++; FX27.n.ring++; p.g27 = [0.1, Math.min((r + 1) * 0.42, dc * 0.4)]; p.end27 = tmr + 1; FX27.grow.push(p); } }
  if (wr > 0.3) for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + rnd(-0.15, 0.15), sp = wr * rnd(0.8, 1.1); fx27P({ x: x + Math.cos(a) * 0.3, y: y + Math.sin(a) * 0.3, z: 0.02, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0.05, life: rnd(0.9, 1.3), frames: sm, img: sm[0], size: rnd(0.16, 0.24) * k, drift: true, tint: dust }); } // dammvågen längs golvet
  const rock = fx.parts.rock || fx.parts.gib;
  for (let i = 0; i < 5; i++) { const a = rnd(0, TAU), sp = rnd(1.5, 3.4); const p = fx27P({ x, y, z: 0.2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(2.2, 3.8), life: rnd(1.6, 2.3), frames: rock || null, img: rock ? rock[i % rock.length] : fx.hit[1], flap: !!rock, size: rnd(0.05, 0.075), grav: true, bounce: true, tint: [120, 105, 95] }); // skräp som studsar
    if (p) { FX27.n.debris++; if (i < 3) { if (FX27.trail.length >= 9) FX27.trail.shift(); FX27.trail.push({ p, end: tmr + 0.9, acc: 0 }); } } } // tre av dem ryker
  const em = fx.parts.ember || [fx.hit[1]];
  for (let i = 0; i < 8; i++) { const a = rnd(0, TAU), sp = rnd(0.8, 2.6); const p = fx27P({ x, y, z: 0.3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(1, 2.6), life: rnd(2.6, 3.8), img: em[i % em.length], size: rnd(0.045, 0.06), add: true, grav: true, bounce: true, tint: [255, 240, 160] }); if (p) { FX27.n.embers++; fx27Cool(p, 'ember'); } } // glöd som falnar på golvet
  if (dc > 2) FX27.sched.push({ t: tmr + 0.5, fn: () => { for (let i = 0; i < (big ? 3 : 2); i++) if (fx27P({ x: x + rnd(-0.4, 0.4) * k, y: y + rnd(-0.4, 0.4) * k, z: rnd(0.2, 0.5), vx: rnd(-0.12, 0.12), vy: rnd(-0.12, 0.12), vz: rnd(0.08, 0.15), life: rnd(4.5, 6), frames: sm, img: sm[0], size: rnd(0.5, 0.7) * k, drift: true, tint: [110, 104, 98] })) FX27.n.smoke++; } }); // kvardröjande rök
}
function fx27Step(sp) { // ett steg (räknat på sträckan): snö och damm under fötterna, fräsande lava
  const ch = cellUnder(), hot = ch === '_' || ch === 'Ź' || ch === 'ɰ';
  const a = Math.atan2(P.vy, P.vx), bx = P.x - Math.cos(a) * 0.2, by = P.y - Math.sin(a) * 0.2;
  if (hot) { FX27.n.lava++; FX27.n.step++; fx27Splash(bx, by, null, true, 0.5); return; }
  if (GFXW_STEPLIQ[ch]) return; // vätskorna sköter VÄRLD
  const n = ((lvl.floors || [lvl.floor])[cellFloor ? cellFloor[(P.y | 0) * mw + (P.x | 0)] : 0] || '') + ' ' + (lvl.biome || '');
  const snow = /snow|frost/.test(n), dusty = /sand|desert|dirt|gravel|ash|cave|mine|dust|tomb|ruin|basalt|volcano|sawdust|straw|mud/.test(n);
  if (!snow && !(dusty && sp < 3.2)) return; // springande i damm: VÄRLD ritar redan puffarna
  FX27.n.step++; if (snow) FX27.n.snow++;
  const img = snow && fx.parts.snow ? fx.parts.snow : fx.parts.smoke || fx.hit, tint = snow ? [235, 242, 255] : /sand|desert|tomb/.test(n) ? [210, 180, 125] : [150, 132, 110];
  for (let i = 0; i < (snow ? 4 : 1); i++) fx27P({ x: bx + rnd(-0.08, 0.08), y: by + rnd(-0.08, 0.08), z: 0.03, vx: -Math.cos(a) * rnd(0.2, 0.6) + rnd(-0.3, 0.3), vy: -Math.sin(a) * rnd(0.2, 0.6) + rnd(-0.3, 0.3), vz: snow ? rnd(0.6, 1.2) : 0.08, life: snow ? 0.5 : 0.55, frames: snow ? null : img, img: img[i % img.length], size: snow ? 0.03 : rnd(0.07, 0.1), grav: snow, drift: !snow, fade: !snow, tint }, true);
}
const FX27_GLIM = { rune: [255, 140, 220], legend: [255, 215, 90], cardpick: [190, 160, 255], scroll: [255, 235, 180], shard: [160, 230, 255], page: [255, 230, 170], key: [255, 225, 120] };
function fx27Env(dt) { // steg, sågklingor, brinnande mark och glimmer (miljön ger vika först: inget när listan är full)
  const sp = Math.hypot(P.vx, P.vy);
  if (P.jz <= 0.05 && sp > 0.8) { FX27.stepD += sp * dt; if (FX27.stepD > 1.1) { FX27.stepD = 0; if (particles.length < pcap(190)) fx27Step(sp); } } else if (sp <= 0.8) FX27.stepD = 0.7;
  if (particles.length > pcap(180)) return;
  const I = fx27Imgs();
  if ((FX27.sawT -= dt) <= 0) { FX27.sawT = 0.09; let n = 0; // sågklingorna sprutar gnistor där de skär i spåret
    for (const s of saws) { if ((s.stopT || 0) > tmr || Math.abs(s.x - P.x) + Math.abs(s.y - P.y) > 10) continue; FX27.n.saw++;
      const L = Math.hypot(s.x1 - s.x0, s.y1 - s.y0) || 1, ux = (s.x1 - s.x0) / L * (s.dir || 1), uy = (s.y1 - s.y0) / L * (s.dir || 1);
      for (let i = 0; i < 3; i++) fx27Cool(fx27P({ x: s.x - ux * 0.2, y: s.y - uy * 0.2, z: 0.05, vx: -ux * rnd(1.5, 3) + rnd(-0.6, 0.6), vy: -uy * rnd(1.5, 3) + rnd(-0.6, 0.6), vz: rnd(0.8, 1.8), life: rnd(0.3, 0.5), img: I.dot, size: 0.026, add: true, grav: true, bounce: true, tint: [255, 225, 140] }, true), 'spark');
      if (++n >= 3) break; } }
  if ((FX27.glT -= dt) > 0) return; FX27.glT = 0.12; let g = 0;
  for (const e of ents) { if (e.dead || e.boss || !(e.mvx || e.mvy) || (e.fx27S || 0) > tmr || e.d.ai === 'fly' || e.d.float || Math.abs(e.x - P.x) + Math.abs(e.y - P.y) > 9) continue; // fiender som vadar stänker
    const lq = GFXW_STEPLIQ[map[e.y | 0] && map[e.y | 0][e.x | 0]]; if (!lq) continue; e.fx27S = tmr + rnd(0.35, 0.5); FX27.n.wade++; fx27Splash(e.x, e.y, lq, false, 0.35); if (++g >= 2) break; }
  g = 0;
  for (const f of groundFires) { if (Math.abs(f.x - P.x) + Math.abs(f.y - P.y) > 10 || Math.random() < 0.5) continue; FX27.n.fire++; // brinnande mark: glöd stiger
    fx27P({ x: f.x + rnd(-0.3, 0.3), y: f.y + rnd(-0.3, 0.3), z: 0.05, vx: rnd(-0.15, 0.15), vy: rnd(-0.15, 0.15), vz: rnd(0.5, 0.9), life: rnd(0.8, 1.2), img: (fx.parts.ember || fx.hit)[0], size: 0.03, add: true, fade: true, drift: true, tint: [255, 160, 60] }, true); if (++g >= 3) break; }
  for (const c of chests) { if (c.open || Math.abs(c.x - P.x) + Math.abs(c.y - P.y) > 8 || Math.random() < 0.55) continue; FX27.n.glint++; // kistor och magiska föremål glimmar
    fx27P({ x: c.x + rnd(-0.3, 0.3), y: c.y + rnd(-0.3, 0.3), z: rnd(0.05, 0.4), vx: 0, vy: 0, vz: rnd(0.15, 0.3), life: rnd(0.6, 0.9), img: I.star, size: rnd(0.06, 0.09), add: true, fade: true, drift: true, tint: c.rare ? [255, 200, 255] : [255, 225, 130] }, true); if (++g >= 5) return; }
  for (const it of items) { const col = !it.taken && (FX27_GLIM[it.type] || (it.type === 'potion' && [150, 255, 170])); if (!col || Math.abs(it.x - P.x) + Math.abs(it.y - P.y) > 8 || Math.random() < 0.6) continue; FX27.n.glint++;
    fx27P({ x: it.x + rnd(-0.2, 0.2), y: it.y + rnd(-0.2, 0.2), z: rnd(0.05, 0.35), vx: 0, vy: 0, vz: rnd(0.2, 0.35), life: rnd(0.5, 0.8), img: I.star, size: rnd(0.05, 0.08), add: true, fade: true, drift: true, tint: col }, true); if (++g >= 6) return; }
}
function fx27Efx(k, x, y, size, zc, life, tint) { // en effektsprite genom efxOk (högst 10, avståndsgränser); zc = mitthöjd, null = står på golvet
  const d = Math.hypot(x - P.x, y - P.y); if (d < size * 1.4) { size = d / 1.4; if (size < 0.9) { EFX.n.skip++; return null; } } // nära kameran: mindre (som version 25.1), annars ingen (den skulle fylla bilden)
  if (!efxOk(k, x, y)) return null; const z = zc === null ? 0 : Math.max(-0.4, zc - size / 2), p = fx27P({ x, y, z, vx: 0, vy: 0, vz: 0, life, frames: fx.efx[k], img: fx.efx[k][0], size, add: true, fade: !!settings.noFlash, tint: settings.noFlash ? (tint || [255, 255, 255]).map(v => Math.round(v * 0.6)) : tint || null, efx: k }, 'hard');
  if (p) EFX.n[k]++; return p;
}
function fx27Hud(x, y, kind, col) { if (FX27.hud.length >= 4) FX27.hud.shift(); FX27.hud.push({ x, y, kind, col, t0: tmr }); FX27.n.hud++; }
function fx27BossPhase(e) { // fasbyte: Effekseer-smällen, en fontän av glöd och en chockvåg på skärmen
  if (!fx27On('boss')) return;
  FX27.n.phase++; const sz = e.d.size * (e.formK || 1), s = clamp(sz * 1.7, 1.8, 3.2);
  fx27Efx('burst', e.x, e.y, s, sz * 0.45, 0.8, null);
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; fx27Cool(fx27P({ x: e.x + Math.cos(a) * 0.3, y: e.y + Math.sin(a) * 0.3, z: sz * 0.4, vx: Math.cos(a) * rnd(1.5, 3), vy: Math.sin(a) * rnd(1.5, 3), vz: rnd(2, 3.5), life: rnd(1.2, 1.8), img: (fx.parts.ember || fx.hit)[0], size: 0.05, add: true, grav: true, bounce: true, tint: [255, 230, 150] }, 'hard'), 'ember'); }
  fx27Hud(e.x, e.y, 'phase', [255, 140, 70]);
}
function fx27BossDying(e) { // smällar under dödsanimationen, på olika ställen kring bossen
  if (!fx27On('boss')) return;
  FX27.n.deathBooms++; const sz = e.d.size * (e.formK || 1), s = clamp(sz * 1.1, 1.3, 2.4);
  fx27Efx('burst', e.x + rnd(-0.6, 0.6) * sz, e.y + rnd(-0.6, 0.6) * sz, s, rnd(0.1, 0.6) * sz, 0.7, null);
}
function fx27BossFinal(e) { // bossen är död: stor smäll, ljuspelare (själen stiger), guldgnistor och en vit blixt på skärmen
  if (!fx27On('boss')) return;
  FX27.n.final++; const sz = e.d.size * (e.formK || 1);
  fx27Efx('burst', e.x, e.y, clamp(sz * 2.2, 2.2, 3.6), sz * 0.4, 0.9, null);
  fx27Efx('tele', e.x, e.y, clamp(sz * 2.4, 2.4, 3.4), null, 1.6, [255, 220, 120]);
  for (let i = 0; i < 24; i++) fx27P({ x: e.x + rnd(-0.5, 0.5), y: e.y + rnd(-0.5, 0.5), z: rnd(0, 0.6), vx: rnd(-0.3, 0.3), vy: rnd(-0.3, 0.3), vz: rnd(0.4, 1.1), life: rnd(1.6, 2.6), img: fx27Imgs().star, size: rnd(0.05, 0.08), add: true, fade: true, drift: true, tint: [255, 220, 120] }, 'hard');
  fx27Hud(e.x, e.y, 'final', [255, 225, 160]);
}
function fx27Boss() {
  for (const e of ents) { if (!e.boss) continue;
    if (e.fx27Ph === undefined) { e.fx27Ph = e.phase; e.fx27A = !e.dead; continue; }
    if (!e.dead && !(e.dying > 0) && e.phase > e.fx27Ph) fx27BossPhase(e);
    e.fx27Ph = e.phase;
    if (e.dying > 0) { if (!e.fx27D) { e.fx27D = 1; e.fx27T = tmr; FX27.n.death++; } else if (tmr - e.fx27T > 0.5) { e.fx27T = tmr; fx27BossDying(e); } }
    if (e.dead && e.fx27A && e.fx27D !== 2) { e.fx27D = 2; fx27BossFinal(e); }
    e.fx27A = e.fx27A || !e.dead;
  }
}
function fx27Tick(dt) { // från updateWeather: listor, scheman, miljö och bossar
  if (window.__game && !window.__game.fx27) window.__game.fx27 = fx27Api;
  if (FX27.lvl !== lvl || FX27.low !== !!settings.lowfx) { FX27.lvl = lvl; FX27.low = !!settings.lowfx; FX27.cool.length = FX27.grow.length = FX27.trail.length = FX27.sched.length = FX27.hud.length = 0; }
  if (!map || !lvl) return;
  for (let i = FX27.sched.length - 1; i >= 0; i--) if (tmr >= FX27.sched[i].t) { const s = FX27.sched.splice(i, 1)[0]; if (fx27On('boom')) s.fn(); }
  for (let i = FX27.cool.length - 1; i >= 0; i--) { const c = FX27.cool[i], p = c.p; if (p.life <= 0 || tmr > c.end) { FX27.cool.splice(i, 1); continue; } // glöden falnar: gul → orange → röd → mörk
    const pal = FX27_COOL[c.kind], u = clamp(1 - p.life / p.maxLife, 0, 0.999) * (pal.length - 1), j = u | 0, f = u - j, A = pal[j], B = pal[j + 1];
    p.tint = [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f]; }
  for (let i = FX27.grow.length - 1; i >= 0; i--) { const p = FX27.grow[i]; if (p.life <= 0 || tmr > p.end27) { FX27.grow.splice(i, 1); continue; } // chockvågen växer
    const u = 1 - p.life / p.maxLife, s = p.g27[0] + (p.g27[1] - p.g27[0]) * (1 - (1 - u) * (1 - u)); p.size = s; p.z = -s / 2 + 0.02; }
  for (let i = FX27.trail.length - 1; i >= 0; i--) { const t = FX27.trail[i], p = t.p; if (p.life <= 0 || tmr > t.end) { FX27.trail.splice(i, 1); continue; } // skräpet ryker i luften
    if (p.z > 0.05 && (t.acc += dt) > 0.08) { t.acc = 0; fx27P({ x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, vz: 0.15, life: 0.45, frames: fx.parts.smoke || null, img: (fx.parts.smoke || fx.hit)[0], size: 0.06, drift: true, tint: [90, 84, 78] }, true); } }
  if (fx27On('env')) fx27Env(dt);
  fx27Tick2(dt); // del 2: dödseffekter efter material och spår efter fiendeskotten
  fx27Tick3(dt); // del 3: tydliga statuseffekter, rök ur pipan och biomernas framträdanden
  fx27Room(FX27_ROOM.frame); // samlad budget: under VAPENs hårda tak, så att nedslag och smällar alltid får plats
  if (fx27On('boss')) fx27Boss(); else for (const e of ents) if (e.boss) { e.fx27Ph = e.phase; e.fx27A = e.fx27A || !e.dead; if (e.dead) e.fx27D = 2; }
}
function fx27DrawHud(g) { // skärmeffekterna efter HUD-rutorna: chockvåg som ring från bossen, en färgpuls i kanterna och den vita blixten
  if (FX27.off || settings.lowfx || !FX27.hud.length) return;
  const nf = !!settings.noFlash, rm = !!settings.reduceMotion;
  for (let i = FX27.hud.length - 1; i >= 0; i--) { const h = FX27.hud[i], dur = h.kind === 'final' ? 1.1 : 0.7, t = (tmr - h.t0) / dur; if (t < 0 || t >= 1) { FX27.hud.splice(i, 1); continue; }
    const [r, gg, b] = h.col, pr = project(h.x, h.y, 0.5), cx = pr ? clamp(pr.sx, 0, W) : W / 2, cy = pr ? clamp(pr.sy, 0, VH) : HORIZON;
    g.save();
    if (h.kind === 'final' && !nf && t < 0.3) { g.fillStyle = `rgba(255,245,225,${(0.55 * (1 - t / 0.3)).toFixed(3)})`; g.fillRect(0, 0, W, VH); } // den vita blixten (inte med noFlash)
    const al = (nf ? 0.3 : 0.75) * (1 - t), grd = g.createRadialGradient(W / 2, VH / 2, VH * 0.35, W / 2, VH / 2, W * 0.62); // färgpuls i kanterna, mitten (hårkorset) lämnas fri
    grd.addColorStop(0, `rgba(${r},${gg},${b},0)`); grd.addColorStop(1, `rgba(${r},${gg},${b},${(al * 0.55).toFixed(3)})`); g.fillStyle = grd; g.fillRect(0, 0, W, VH);
    if (!rm) { g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(${r},${gg},${b},${al.toFixed(3)})`; g.lineWidth = Math.max(1, 5 * (1 - t)); // chockvågen
      g.beginPath(); g.arc(cx, cy, 8 + t * W * (h.kind === 'final' ? 0.8 : 0.6), 0, TAU); g.stroke(); }
    g.restore(); }
}
const fx27Api = { state: () => ({ on: !FX27.off && !settings.lowfx, f: { ...FX27.f }, n: JSON.parse(JSON.stringify(FX27.n)), cool: FX27.cool.length, grow: FX27.grow.length, trail: FX27.trail.length, sched: FX27.sched.length, hud: FX27.hud.length,
    loaded: { ring: !!(fx.efx && fx.efx.ring), burst: !!(fx.efx && fx.efx.burst) }, muzKeys: Object.keys(FX27.muz) }),
  setOff: v => { FX27.off = !!v; }, set: o => Object.assign(FX27.f, o), fixed: v => { FX27.fixed = !!v; }, // prov: A/B-mätning, en del i taget, fast mynningsbild för skärmbilder
  muzzle: (id, col) => fx27MuzImg(FX27_MUZ[id] || id, col || (FX27_MUZ[id] === 'magic' ? FX27_MCOL[id] || [190, 140, 255] : null)).map(c => c.toDataURL()), types: () => ({ ...FX27_MUZ }),
  boom: (x, y, r = 2, big = false) => explode(x, y, 0, r, false, big), impact: (x, y, z, cell, dx, dy) => wpImpact(x, y, z, cell, dx, dy), step: sp => fx27Step(sp || 2),
  env: dt => fx27Env(dt || 0.2), phase: e => fx27BossPhase(e), final: e => fx27BossFinal(e),
  tickMs: (n = 300) => { const t0 = performance.now(); for (let i = 0; i < n; i++) fx27Tick(1 / 60); return (performance.now() - t0) / n; } }; // update-kostnaden per bildruta

