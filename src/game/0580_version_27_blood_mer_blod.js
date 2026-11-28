// ---------- Version 27: BLOOD – mer blod: stänk på väggar efter material, riktade strålar, överdöd, pölar, fotspår, närstrid och BLOD AV/NORMAL/MYCKET ----------
// settings.blood: 0 AV (damm och gnistor i stället för blod, inga fläckar), 1 NORMAL, 2 MYCKET (standard på dator; NORMAL på mobil).
// Väggstänk: egna märken i wallMarks (m.v27) som renderWalls ritar med v27WallPx: färg efter fiendens material (kött rött, insekter
// gulgrönt, slem i sin färg, odöda mörkt och skelett damm; metall, spöken, eld och urverk lämnar inget). Världsankrad form (kärna,
// svans i skottets riktning, droppar som rinner), så att den inte flimrar. Tak 60 (MYCKET), 30 (NORMAL), 16 (lowfx): äldsta återvinns.
// Partiklar går via gfxEPart (mjukt tak 235); golvfläckar via v27Decal (samma tak som decals, 70, äldsta först). lowfx: inga strålar,
// fontäner, fotspår eller skärmstänk (väggstänk med lägre tak). Skärmstänket (MYCKET) följer noFlash (tonas in, svagare) och
// MINSKA RÖRELSE (av), ligger bara i hörnen och når aldrig siktet. V27B.on = false ger exakt det gamla (för mätningar).
const V27B = { on: true, n: { hits: 0, jets: 0, walls: 0, wallMiss: 0, none: 0, off: 0, kills: 0, fount: 0, chunks: 0, splats: 0, pools: 0, wide: 0, steps: 0, screen: 0, recycled: 0, offGibs: 0, necks: 0, offSlime: 0, wpn: 0, wpnDraw: 0, sprMade: 0, sprDraw: 0, sprClear: 0, wallGibs: 0, noBleed: 0, noPool: 0, corpseHits: 0, corpseGibs: 0, corpseGone: 0, limps: 0, drips: 0, trail: 0, stars: 0, starSplats: 0 },
  walls: [], fly: [], grow: [], scr: [], step: 0, stepMax: 1, stepImg: null, stepSide: 1, chkT: 0, lvl: null, swapped: false, orig: null, img: new Map(), wideL: [], poolSet: null, poolSrc: null, neck: new Map(), wb: null, kickSeen: false, capT: 0, woundT: 0, boom: null, cur: null, sq: { c: null, lv: 0 }, spr: new Map() };
if (settings.blood === undefined) settings.blood = DEVICE === 'mobil' ? 1 : 2;
const v27B = () => V27B.on ? clamp(Math.round(+(settings.blood ?? (DEVICE === 'mobil' ? 1 : 2)) || 0), 0, 2) : -1; // -1: modulen av (som version 26); saknas värdet (ÅTERSTÄLL ALLA) gäller standarden
const V27_COL = { flesh: [172, 14, 12], dark: [64, 18, 14], dust: [132, 116, 92], insect: [172, 186, 40], plant: [84, 146, 38] };
const v27Abgr = c => (0xff000000 | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
const v27Hash = n => ((Math.imul(n | 0, 2654435761) >>> 12) & 1023) / 1024;
function v27Mat(e) { // blodets färg [r, g, b] efter fiendens material, eller null (metall, spöken, eld, urverk, kristall)
  if (e.v27c !== undefined) return e.v27c;
  const s = (e.d && e.d.sheet) || '', k = gfxEKind(e); let c;
  if (e.boss) c = /^(ghost|captain|colossus|mirrorking|clockmaker|crystalqueen|flame|pyrelord)$/.test(e.id) ? null : /^(demon|pharaoh|sandman)$/.test(e.id) ? V27_COL.dust // bossarna har inget sheet
    : e.id === 'queenbee' ? V27_COL.insect : /^(gardener|mycelmother)$/.test(e.id) ? V27_COL.plant : /^(nightmare|warlord)$/.test(e.id) ? V27_COL.dark : V27_COL.flesh;
  else if (k === 'metal' || (e.d && e.d.ai === 'wisp') || /ghost|wraith|banshee|wisp|lostsoul|spirit|elemental|fireimp|shadowtwin|doppel|illusion|grimoire|marionette|drone|clock|gear|timekeeper|voidwatcher|starspawn|cloudgiant|golem|steam|crystal|shard|mirror/.test(s)) c = null;
  else if (k === 'bone') c = V27_COL.dust;
  else if (/spider|scarab|mosquito|scorpion|flies|bee$|stinger|larva|moldcrawler|burrower/.test(s)) c = V27_COL.insect;
  else if (k === 'slime') c = gfxESlimeCol(e);
  else if (/shroom|spor|myco|mycel|root|thorn/.test(s)) c = V27_COL.plant;
  else if (/ghoul|zombie|sleepwalker|drowned|ashwalker|crawler|vampire|gravedigger|necromancer/.test(s)) c = V27_COL.dark;
  else c = V27_COL.flesh;
  return (e.v27c = c);
}
const v27Col = e => e.ghost > 0.5 || e.hidden || e.type === 'Ü' ? null : v27Mat(e);
const v27Z = e => clamp(((e.d.ai === 'fly' || e.d.float) && !e.anchored ? 0.3 : 0) + e.d.size * 0.5, 0.18, 0.85); // var på väggen (0–1) stänket hamnar
const v27WallCap = () => settings.lowfx ? 16 : v27B() === 2 ? 60 : 30;
// ---- bilder: färgade, glesade och breddade kopior av de befintliga rutorna (små, cachas, aldrig per bildruta) ----
function v27Copy(key, f, fn) { let r = V27B.img.get(key); if (r) return r; if (V27B.img.size > 160) { V27B.img.clear(); V27B.wideL.length = 0; V27B.poolSet = null; } r = fn(f); V27B.img.set(key, r); return r; }
function v27TintImg(im, c, drop = 0, seed = 0) { // intensitet från den starkaste kanalen, färgen c; drop: andel pixlar som tas bort (uttoning utan alfa)
  const d = new Uint32Array(im.data.length);
  for (let i = 0; i < d.length; i++) { const p = im.data[i], a = p >>> 24; if (a < 100 || (drop && v27Hash(i * 7 + seed) < drop)) continue; const I = Math.min(1.25, Math.max(p & 255, (p >> 8) & 255, (p >> 16) & 255) / 200);
    d[i] = ((a << 24) | (Math.min(255, c[2] * I) << 16) | (Math.min(255, c[1] * I) << 8) | Math.min(255, c[0] * I)) >>> 0; }
  return { w: im.w, h: im.h, data: d };
}
function v27WideImg(im, k) { const w = Math.max(1, Math.round(im.w * k)), d = new Uint32Array(w * im.h); for (let y = 0; y < im.h; y++) for (let x = 0; x < w; x++) d[y * w + x] = im.data[y * im.w + Math.min(im.w - 1, (x / k) | 0)]; return { w, h: im.h, data: d }; }
const v27Tint = (name, f, c, drop = 0) => !f ? null : v27Copy(name + c.join(',') + '|' + drop, f, f => f.map((im, i) => v27TintImg(im, c, drop, i * 131)));
const v27Drops = c => c === V27_COL.flesh ? (V27B.orig ? V27B.orig.blood : fx.blood) : v27Tint('drop', V27B.orig ? V27B.orig.blood : fx.blood, c);
const v27Wide = im => { let r = V27B.img.get(im); if (!r) { r = v27WideImg(im, 1.55); V27B.img.set(im, r); V27B.wideL.push(r); v27PoolSet().add(r); } return r; };
function v27PoolSet() { // vilka golvbilder som räknas som pölar (fotspåren)
  const src = (V27B.orig && V27B.orig.pool) || fx.parts.blood_pool;
  if (!V27B.poolSet || V27B.poolSrc !== src) { V27B.poolSrc = src; V27B.poolSet = new Set([...(src || []), ...(fx.parts.sludge || []), ...V27B.wideL]); }
  return V27B.poolSet;
}
function v27Decal(x, y, img, size, life, c) { // alla nya golvfläckar: samma tak som decals (70), äldsta först
  if (!img || solid(x, y)) return null; const d = { x, y, img, size, v27: 1 }; if (life) d.life = life; if (c) d.v27c = c;
  decals.push(d); if (decals.length > 70) decals.shift(); return d;
}
// ---- BLOD AV: blodbilderna byts mot damm och golvfläckarna stängs av (alla gamla vägar: gib, huvudet, blödning, spår, pölar) ----
function v27Sync() {
  const P2 = fx.parts; if (!fx.blood || !P2) return; const off = v27B() === 0;
  if (off && !V27B.swapped) { V27B.orig = { blood: fx.blood, pool: P2.blood_pool, trail: P2.blood_trail }; fx.blood = v27Tint('dust', fx.blood, [150, 138, 120]); P2.blood_pool = null; P2.blood_trail = null; V27B.swapped = true; }
  else if (!off && V27B.swapped) { const o = V27B.orig; fx.blood = o.blood; if (o.pool) P2.blood_pool = o.pool; if (o.trail) P2.blood_trail = o.trail; V27B.swapped = false; }
  else if (off && (P2.blood_pool || P2.blood_trail)) { if (P2.blood_pool) V27B.orig.pool = P2.blood_pool; if (P2.blood_trail) V27B.orig.trail = P2.blood_trail; P2.blood_pool = P2.blood_trail = null; } // laddades sent
}
function v27WallOld() { return V27B.on; } // från wallMark: det gamla röda stänket ersätts av v27Hit (färg efter material)
function v27GibOff(e) { // från gfxEGib: BLOD AV – kött, slem och insekter blir damm och stenflisor (ben och metall som förut)
  if (v27NoBleed(e, true)) { V27B.n.noBleed++; if (!settings.lowfx && fx.parts.smoke) for (let i = 0; i < 3; i++) gfxEPart({ x: e.x + rnd(-0.3, 0.3), y: e.y + rnd(-0.3, 0.3), z: rnd(0.2, 0.7), vx: rnd(-0.4, 0.4), vy: rnd(-0.4, 0.4), vz: 0.3, life: 0.9, frames: fx.parts.smoke, img: fx.parts.smoke[0], size: rnd(0.2, 0.3), drift: true, tint: [170, 165, 160] }); return true; } // spöken och eld: ingen kött, bara en dammpuff
  if (v27B() !== 0) return false; const k = gfxEKind(e); if (k === 'metal' || k === 'bone') return false;
  V27B.n.offGibs++; const f = fx.parts.rock || fx.hit, lo = settings.lowfx;
  for (let i = 0; i < (lo ? 3 : 7); i++) { const a = rnd(0, TAU), sp = rnd(0.8, 2.6); gfxEPart({ x: e.x, y: e.y, z: rnd(0.3, 0.7), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(1.4, 3), life: rnd(0.9, 1.6), img: f[i % f.length], size: rnd(0.04, 0.08), grav: true, bounce: true, tint: [150, 138, 120] }, true); }
  if (!lo && fx.parts.smoke) for (let i = 0; i < 3; i++) gfxEPart({ x: e.x + rnd(-0.3, 0.3), y: e.y + rnd(-0.3, 0.3), z: rnd(0.1, 0.6), vx: rnd(-0.4, 0.4), vy: rnd(-0.4, 0.4), vz: 0.3, life: 1, frames: fx.parts.smoke, img: fx.parts.smoke[0], size: rnd(0.22, 0.32), drift: true, tint: [190, 180, 165] });
  return true;
}
// ---- väggstänket ----
function v27Wall(hit, dx, dy, z, c, r, k) {
  if (!hit || hit.mx === undefined || !isWallChar(hit.cell)) { V27B.n.wallMiss++; return null; }
  const key = (hit.my * mw + hit.mx) * 4 + faceOf(hit.side, dx, dy); let arr = wallMarks.get(key); if (!arr) { arr = []; wallMarks.set(key, arr); }
  const tang = hit.side === 0 ? dy : dx; // längs väggen: åt vilket håll svansen flyger (wx växer med världens y resp. x)
  const m = { u: hit.wx, z: clamp(z, 0.08, 0.92), kind: 'v27', v27: 1, r: clamp(r, 0.035, 0.32), col: v27Abgr(c), col2: v27Abgr([c[0] * 0.62, c[1] * 0.62, c[2] * 0.62]), c, seed: (Math.random() * 1e6) | 0,
    sd: tang >= 0 ? 1 : -1, tl: clamp(Math.abs(tang) * 1.6 + 0.35, 0.35, 1), drip: clamp(k, 0.3, 1.6), t: tmr, key };
  arr.push(m); if (arr.length > 14) arr.shift(); if (wallMarks.size > 500) wallMarks.delete(wallMarks.keys().next().value);
  V27B.walls.push({ a: arr, m }); V27B.n.walls++;
  for (const cap = v27WallCap(); V27B.walls.length > cap;) { const o = V27B.walls.shift(), i = o.a.indexOf(o.m); if (i >= 0) o.a.splice(i, 1); V27B.n.recycled++; }
  return m;
}
function v27WallPx(px, W, VH, x, m, wx, top, lh, L, perp) { // från renderWalls: en kolumn av stänket (kärna, svans och rinnande droppar)
  if (m.gib) { v27WallGibPx(px, W, VH, x, m, wx, top, lh, L, perp); return; } // omgång 4: köttbit som glider ned
  const s = (wx - m.u) / m.r, t = s * m.sd, ci = ((s + 1) * 14) | 0, h1 = v27Hash(m.seed + ci), cy = top + (1 - m.z) * lh, R = m.r * lh;
  const ct = t + 0.28; // kärnans mitt ligger lite bakåt, svansen sträcker sig framåt
  if (ct > -0.62 && ct < 0.62) {
    const q = ct / 0.62, hh = Math.sqrt(1 - q * q) * 0.62 * R * (0.7 + 0.6 * h1) * 1.2, ya = Math.max(0, Math.ceil(cy - hh)), yb = Math.min(VH - 1, Math.floor(cy + hh));
    const col = shadeFog(m.col, L, perp), col2 = shadeFog(m.col2, L, perp), in2 = hh * 0.5, kv = 90 / lh;
    for (let y = ya; y <= yb; y++) { if (v27Hash(m.seed * 3 + ci * 131 + ((y - top) * kv | 0)) < 0.13) continue; px[y * W + x] = Math.abs(y - cy) < in2 ? col2 : col; }
    if (h1 < 0.4 && yb + 1 < VH) { const grow = Math.min(1, (tmr - m.t) / 1.6), dl = Math.round((0.05 + 0.3 * h1) * lh * m.drip * grow * (m.z > 0.3 ? 1 : 0.4)); // rinner nedåt
      for (let y = yb + 1, ye = Math.min(VH - 1, yb + dl); y <= ye; y++) px[y * W + x] = col2; }
    return;
  }
  if (t > 0.2 && t < 1 && t < 0.2 + m.tl && h1 < 0.5) { // svansen: glesa droppar som blir mindre längre ut
    const f = (t - 0.2) / m.tl, rr = Math.max(0.6, R * 0.13 * (1 - f) * (0.6 + h1)), cy2 = cy + (v27Hash(m.seed + ci * 7) - 0.45) * R * 0.5 * (1 + f);
    const ya = Math.max(0, Math.ceil(cy2 - rr)), yb = Math.min(VH - 1, Math.floor(cy2 + rr)), col = shadeFog(m.col, L, perp);
    for (let y = ya; y <= yb; y++) px[y * W + x] = col;
  }
}
// ---- träffar och dödanden ----
const v27Kick = d => P.kickT >= 0.45 && d < 2.4; // sparken och kolvslaget sätter P.kickT just före hurtEnemy (utan melee-flaggan)
function v27Dir(e) { const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d, d]; }
function v27Jet(e, x, y, dx, dy, n, c, k, up = 0) { // riktad stråle ur fiendens baksida, i skottets riktning
  const f = v27Drops(c); if (!f) return; const z0 = v27Z(e), a0 = Math.atan2(dy, dx);
  for (let i = 0; i < n; i++) { const a = a0 + rnd(-0.38, 0.38), sp = rnd(1.5, 3.3) * (0.8 + k * 0.3);
    if (!gfxEPart({ x: x + dx * 0.15, y: y + dy * 0.15, z: z0 + rnd(-0.1, 0.1), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(0.1, 1.3) + up, life: rnd(0.35, 0.65), img: f[(Math.random() * f.length) | 0], size: rnd(0.06, 0.12), grav: true })) break;
    V27B.n.jets++; }
}
function v27Hit(e, dmg, hx, hy, opt) { // från hurtEnemy (efter gfxEBleed): stråle och väggstänk bakom fienden
  const L = v27B(); if (L < 0 || opt.quiet || e.dummy || (e.boss && e.dying) || e.frozen > 0 || (e.hp <= 0 && e.burn > 0 && !e.overkill && !e.boss)) return; // fryst: isflisor (gfxEBleed); brinnande som dör: aska
  v27Sync(); const c = v27Col(e); if (!c) { V27B.n.none++; return; }
  if (L === 0) { V27B.n.off++; return; } // BLOD AV: gfxEBleed ritar redan damm (bilderna är utbytta)
  V27B.n.hits++; const [dx, dy, dist] = v27Dir(e), wp = WEAPONS[P.weapon] || {}, melee = !!(opt.melee || opt.exec) || v27Kick(dist), heavy = !!opt.boom || !!opt.bash || (wp.kick || 0) >= 1.8, lots = L === 2;
  const k = clamp(dmg / Math.max(1, e.maxHp || 1) * 3, 0.4, 1.4) * (heavy ? 1.45 : 1) * (melee ? 1.5 : 1);
  const again = tmr - (e.v27jT ?? -9) < 0.05; if (opt.melee && !opt.slide && !again) v27WeaponAdd(c, 0.15); e.v27jT = tmr; // hagel: en stråle och ett stänk per salva, sedan en droppe per kula
  if (!settings.lowfx) v27Jet(e, hx ?? e.x, hy ?? e.y, dx, dy, again ? 1 : Math.round((lots ? 5 : 2) * k), c, k);
  if (!again) { const reach = (lots ? 1.7 : 1.3) * (heavy || melee ? 1.3 : 1), h = cast(e.x, e.y, dx, dy, reach);
    if (h.mx !== undefined && h.dist < reach) v27Wall(h, dx, dy, v27Z(e) + rnd(-0.12, 0.08), c, (lots ? 0.11 : 0.075) * (0.7 + k * 0.45) * (1.25 - h.dist / reach * 0.5), k); else V27B.n.wallMiss++; }
  if (melee && lots && !settings.lowfx && !again) { const f = v27Tint('trail', (V27B.orig && V27B.orig.trail) || fx.parts.blood_trail, c); if (f) for (let i = 0; i < 2; i++) { v27Decal(e.x + dx * rnd(0.2, 0.6) + rnd(-0.15, 0.15), e.y + dy * rnd(0.2, 0.6) + rnd(-0.15, 0.15), f[i % f.length], rnd(0.03, 0.05), 25, c); V27B.n.splats++; } } // närstrid: stänk på golvet
}
function v27Kill(e) { // från gfxEKill: kraftigare stänk, överdödens fontän och bitar som studsar, fler pölar, stänk på skärmen nära dig
  const L = v27B(); v27Neck(e, L); if (L <= 0 || e.boss || e.frozen > 0 || (e.burn > 0 && !e.overkill)) return; // fryst: splittras; brinnande: blir aska
  v27Sync(); const c = v27Col(e); if (!c) return;
  if ((killCtx || {}).boom && V27B.boom && V27B.boom.t === tmr && c !== V27_COL.dust && Math.hypot(e.x - V27B.boom.x, e.y - V27B.boom.y) < V27B.boom.r + 1) V27B.boom.cols.push(c); // omgång 3: smällen dödade en köttfiende
  V27B.n.kills++; const kc = killCtx || {}, [dx, dy, dist] = v27Dir(e), melee = !!(kc.melee || kc.exec) || v27Kick(dist), over = !!e.overkill || !!kc.exec, lots = L === 2, lo = settings.lowfx;
  const a0 = Math.atan2(dy, dx), reach = lots ? 2.2 : 1.6; if (kc.melee && !kc.slide) v27WeaponAdd(c, 0.6); // vapnet blir blodigt
  for (let i = 0, n = over ? (lots ? 3 : 2) : 1; i < n; i++) { const a = a0 + (i ? (i % 2 ? 1 : -1) * rnd(0.3, 0.6) : rnd(-0.1, 0.1)), ux = Math.cos(a), uy = Math.sin(a), h = cast(e.x, e.y, ux, uy, reach);
    if (h.mx !== undefined && h.dist < reach) v27Wall(h, ux, uy, v27Z(e) + rnd(-0.1, 0.12), c, (lots ? 0.16 : 0.1) * (over ? 1.25 : 1) * (1.2 - h.dist / reach * 0.5), over ? 1.5 : 1.1); }
  if (lo) return;
  if (over) { // fontän och studsande bitar
    V27B.n.fount++; const f = v27Drops(c), z0 = v27Z(e);
    if (c !== V27_COL.dust) for (let i = 0, n = lots ? 3 : 1; i < n; i++) { const a = a0 + rnd(-0.6, 0.6), ux = Math.cos(a), uy = Math.sin(a), h = cast(e.x, e.y, ux, uy, 1.6); if (h.mx !== undefined && h.dist < 1.6) v27WallGib(h, ux, uy, z0 + rnd(0, 0.25), c); } // omgång 4: bitar fastnar på väggen
    if (f) for (let i = 0, n = lots ? 14 : 6; i < n; i++) { const a = rnd(0, TAU), sp = rnd(0.3, 1.3); if (!gfxEPart({ x: e.x + rnd(-0.08, 0.08), y: e.y + rnd(-0.08, 0.08), z: z0, vx: Math.cos(a) * sp + dx * 0.8, vy: Math.sin(a) * sp + dy * 0.8, vz: rnd(2.4, 4.2), life: rnd(0.7, 1.1), img: f[i % f.length], size: rnd(0.08, 0.14), grav: true })) break; }
    const fl = c === V27_COL.flesh || c === V27_COL.dark, g = fl ? fx.parts.gib : null, bits = g || v27Drops(c);
    if (bits) for (let i = 0, n = lots ? 5 : 2; i < n; i++) { const a = a0 + rnd(-0.9, 0.9), sp = rnd(1.6, 3.6);
      const p = { x: e.x, y: e.y, z: z0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(1.6, 3.2), life: rnd(1.6, 2.4), img: bits[i % bits.length], size: g ? rnd(0.08, 0.12) : rnd(0.1, 0.15), grav: true, bounce: true, tint: g && c === V27_COL.dark ? [120, 70, 60] : null };
      if (g) { p.frames = g; p.flap = true; } if (!gfxEPart(p, true)) break; V27B.n.chunks++; if (V27B.fly.length < 16) { p.v27t0 = tmr; p.v27c = c; p.v27n = 0; V27B.fly.push(p); } }
  }
  if (lots && !solid(e.x, e.y)) { // fler pölar: en eller två små vid sidan i skottets riktning som växer en stund
    const f = c === V27_COL.flesh ? (V27B.orig && V27B.orig.pool) || fx.parts.blood_pool : v27Tint('pool', (V27B.orig && V27B.orig.pool) || fx.parts.blood_pool, c);
    if (f) for (let i = 0, n = over || melee ? 2 : 1; i < n; i++) { let d = null; for (let j = 0; j < 3 && !d; j++) { const s = j === 2 ? -rnd(0.3, 0.6) : rnd(0.35, 0.8) / (j + 1); d = v27Decal(e.x + dx * s + rnd(-0.25, 0.25), e.y + dy * s + rnd(-0.25, 0.25), v27Wide(f[(Math.random() * f.length) | 0]), 0.02, 0, c); } // mot en vägg: närmare eller bakåt
      if (d) { d.v27to = rnd(0.06, 0.1) * Math.min(1.3, e.d.size); d.flip = Math.random() < 0.5; V27B.n.pools++; if (V27B.grow.length < 12) V27B.grow.push(d); } }
  }
  if ((over && dist < 2.6) || (melee && dist < 1.9)) v27ScreenAdd(c);
}
// ---- golvet: pölar som växer, bitar som landar, blodiga fotspår ----
function v27Tick(dt) { // från gfxETick (före pölarna)
  if (lvl !== V27B.lvl) { V27B.lvl = lvl; V27B.walls.length = V27B.fly.length = V27B.grow.length = V27B.scr.length = 0; V27B.step = 0; V27B.boom = null; }
  v27Sync(); const L = v27B();
  if (L === 0) gfxEDead.length = 0; // BLOD AV: inga pölar under liken (inte heller slem)
  if (L > 0) for (let i = gfxEDead.length - 1; i >= 0; i--) if (v27NoBleed(gfxEDead[i], true)) gfxEDead.splice(i, 1); // spöken och eld: ingen pöl under liket
  if (L >= 0) { v27CorpseTick(dt); if ((V27B.woundT -= dt) <= 0) { V27B.woundT = 0.1; v27WoundTick(0.1, L); } } // omgång 3: lik och sårade
  { const B = V27B.boom; if (B && B.t !== tmr) { if (B.cols.length && L > 0 && !settings.lowfx) v27Star(B); V27B.boom = null; } } // omgång 3: stjärnfläcken efter smällen
  if (L <= 0) { V27B.fly.length = V27B.grow.length = 0; V27B.step = 0; return; }
  if (L === 2) for (const d of gfxEGrow) if (!d.v27w) { d.v27w = 1; d.img = v27Wide(d.img); d.gTo *= 1.08; V27B.n.wide++; } // MYCKET: pölarna under liken blir bredare (inte högre: de är stående sprites)
  for (let i = V27B.grow.length - 1; i >= 0; i--) { const d = V27B.grow[i]; d.size += (d.v27to - d.size) * Math.min(1, dt * 1.8); if (d.v27to - d.size < 0.004) V27B.grow.splice(i, 1); }
  for (let i = V27B.fly.length - 1; i >= 0; i--) { const p = V27B.fly[i]; if (p.life <= 0 || tmr - p.v27t0 > 3) { V27B.fly.splice(i, 1); continue; } // bitarna lämnar små fläckar där de slår ned (högst två var)
    if (p.z <= 0.001 && p.vz <= 0.01 && !p.v27g) { p.v27g = 1; const f = v27Tint('trail', (V27B.orig && V27B.orig.trail) || fx.parts.blood_trail, p.v27c); if (f && v27Decal(p.x, p.y, f[(Math.random() * f.length) | 0], rnd(0.03, 0.05), 20, p.v27c)) V27B.n.splats++; if (++p.v27n >= 2) V27B.fly.splice(i, 1); }
    else if (p.z > 0.05) p.v27g = 0; }
  if ((V27B.chkT -= dt) <= 0) { V27B.chkT = 0.12; if (!settings.lowfx && onGround()) v27PoolCheck(L); }
}
function v27PoolCheck(L) { // står spelaren i en pöl? då blir de närmaste stegen blodiga
  const set = v27PoolSet();
  for (let i = decals.length - 1; i >= 0; i--) { const d = decals[i]; if (d.shadow || d.size < 0.045 || !set.has(d.img)) continue;
    const r = d.size * d.img.w / d.img.h * 0.42, dx = d.x - P.x, dy = d.y - P.y; if (dx * dx + dy * dy > r * r) continue;
    const c = d.v27c || ((fx.parts.sludge || []).includes(d.img) ? V27_COL.plant : V27_COL.flesh), n = L === 2 ? 8 : 4;
    const fp = fx.parts.footprint || (V27B.orig && V27B.orig.trail) || fx.parts.blood_trail; if (!fp) return;
    V27B.stepImg = [0, 0.35, 0.6].map(dr => v27Tint('foot' + dr, [fp[0]], c, dr)[0]); V27B.step = V27B.stepMax = n; return; }
}
function v27Step() { // från stepSound: ett blodigt fotspår (vänster/höger), allt svagare
  if (V27B.step <= 0 || !V27B.stepImg || v27B() <= 0 || settings.lowfx) return;
  V27B.step--; V27B.stepSide = -V27B.stepSide; const a = P.vx || P.vy ? Math.atan2(P.vy, P.vx) : P.a, o = 0.08 * V27B.stepSide, f = 1 - V27B.step / V27B.stepMax;
  if (v27Decal(P.x - Math.sin(a) * o, P.y + Math.cos(a) * o, V27B.stepImg[Math.min(2, (f * 3) | 0)], 0.035, 22)) V27B.n.steps++;
}
// ---- stänk på skärmen (MYCKET): en kort kant i hörnen när en fiende sprängs eller avrättas nära dig ----
function v27ScreenAdd(c) {
  if (v27B() !== 2 || settings.lowfx || settings.reduceMotion || state !== 'play') return;
  const used = V27B.scr.map(s => s.corner); let corner = (Math.random() * 4) | 0; for (let i = 0; i < 4 && used.includes(corner); i++) corner = (corner + 1) % 4;
  if (V27B.scr.length >= 3) V27B.scr.shift(); V27B.scr.push({ c, t: tmr, life: 1.5, corner, seed: (Math.random() * 1e6) | 0 }); V27B.n.screen++;
}
function v27ScreenCan(c, seed) { // förritad stänkkant (64×64, hörnet uppe till vänster); cachas per färg och form
  const key = 'scr' + c.join(',') + '|' + (seed & 3); let cv = V27B.img.get(key); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), h = i => v27Hash((seed & 3) * 977 + i);
  g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
  for (let i = 0; i < 26; i++) { const a = h(i) * Math.PI / 2, d = Math.pow(h(i + 50), 1.6) * 52, r = Math.max(1, (1 - d / 60) * 9 * (0.5 + h(i + 99))); g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, r, 0, TAU); g.fill(); }
  g.beginPath(); g.arc(0, 0, 18, 0, TAU); g.fill();
  for (let i = 0; i < 4; i++) { const x = 4 + h(i + 200) * 22; g.fillRect(x, 8, 2, 10 + h(i + 300) * 22); g.beginPath(); g.arc(x + 1, 18 + h(i + 300) * 22, 2, 0, TAU); g.fill(); } // droppar
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fill();
  V27B.img.set(key, cv); return cv;
}
function v27Screen(g) { // från drawHUD (efter blixtarna): ritas i hörnen, högst 26 % av bredden och 36 % av höjden – aldrig över siktet
  if (!V27B.scr.length) return;
  if (state !== 'play' || settings.reduceMotion || settings.lowfx || v27B() !== 2) { V27B.scr.length = 0; return; }
  const nf = !!settings.noFlash, S = Math.round(Math.min(W * 0.26, VH * 0.36));
  for (let i = V27B.scr.length - 1; i >= 0; i--) { const s = V27B.scr[i], k = (tmr - s.t) / s.life; if (k >= 1 || k < 0) { V27B.scr.splice(i, 1); continue; }
    let a = (1 - k * k) * 0.85; if (nf) a *= Math.min(1, (tmr - s.t) / 0.3) * 0.6; // noFlash: tonas in, svagare
    const cx0 = s.corner & 1, cy0 = s.corner >> 1, sl = Math.round(k * 4); // rinner sakta nedåt
    g.save(); g.globalAlpha = a; g.translate(cx0 ? W : 0, cy0 ? VH : sl); g.scale(cx0 ? -1 : 1, cy0 ? -1 : 1); g.drawImage(v27ScreenCan(s.c, s.seed), 0, 0, S, S); g.restore(); }
}
// ---- BLOD AV, det som blev kvar: halsen på den huvudlösa kroppen (v26C) och slemstänket ----
function v27Neck(e, L) { // från v27Kill: halsens röda pixlar (v26cCut) får materialets färg, eller damm med BLOD AV (då puffar halsen damm)
  const b = e.v26hd; if (!b || !b.data || L < 0) return; const mc = v27Mat(e), c = L === 0 || !mc ? V27_COL.dust : mc; if (c === V27_COL.flesh) return;
  if (L === 0 || !mc) e.v26k = 'bone'; // fontänen ur halsen blir ett dammoln (BLOD AV, spöken och eld)
  let per = V27B.neck.get(b); if (!per) { if (V27B.neck.size > 60) V27B.neck.clear(); per = new Map(); V27B.neck.set(b, per); }
  const key = c.join(','); let im = per.get(key);
  if (!im) { const d = new Uint32Array(b.data), c1 = v27Abgr(c), c2 = v27Abgr([c[0] * 0.62, c[1] * 0.62, c[2] * 0.62]); for (let i = 0; i < d.length; i++) { if (d[i] === 0xff1e1ea0) d[i] = c1; else if (d[i] === 0xff121266) d[i] = c2; } im = { w: b.w, h: b.h, data: d }; per.set(key, im); }
  e.v26hd = im; V27B.n.necks++;
}
function v27SlimeOff(x, y, n) { // från gfxEBleed: BLOD AV – slem stänker grått damm i stället för färgat slem
  if (v27B() !== 0) return false; V27B.n.offSlime++;
  for (let i = 0; i < (settings.lowfx ? 1 : n); i++) { const a = rnd(0, TAU), sp = rnd(0.3, 1); gfxEPart({ x, y, z: rnd(0.3, 0.6), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(0.2, 0.8), life: rnd(0.4, 0.7), img: fx.hit[1], size: 0.05, fade: true, drift: true, tint: [160, 150, 135] }, true); }
  return true;
}
// ---- blod på närstridsvapnet i förstapersonsvyn: fläckar på vapnets pixlar (source-atop) efter närstridsdödanden, tonas bort efter 4–9 s ----
function v27WeaponAdd(c, k) { // från v27Hit (närstridsträff, lite) och v27Kill (närstridsdödande, mer); inte sparken eller glidningen
  if (v27B() <= 0 || settings.lowfx || !c) return; const id = WEAPONS[P.weapon].id; let b = V27B.wb;
  if (!b || b.id !== id) b = V27B.wb = { id, c, a: 0, t: tmr }; b.c = c; b.a = Math.min(1, b.a * clamp(1 - (tmr - b.t - 4) / 5, 0, 1) + k); b.t = tmr; V27B.n.wpn++;
}
function v27WeaponBox(f, id) { // vapnets synliga del i rutan (en gång per vapen, läses från wcan direkt efter vapenbilden): [x0, y0, x1, y1]
  const key = 'wbb' + id; let bb = V27B.img.get(key); if (bb) return bb; bb = [0, 0, f.w, f.h];
  try { const d = wctx.getImageData(0, 0, f.w, f.h).data; let x0 = f.w, y0 = f.h, x1 = -1, y1 = -1; for (let y = 0; y < f.h; y += 2) for (let x = 0; x < f.w; x += 2) if (d[(y * f.w + x) * 4 + 3] > 100) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 > x0 && y1 > y0) bb = [x0, y0, x1, y1]; } catch (err) { /* hela rutan */ }
  V27B.img.set(key, bb); return bb;
}
function v27WeaponCan(f, c, id, bb) { // förritat mönster (vapenrutans storlek) över vapnets övre del (bladet), droppar nedåt; cachas per vapen och färg
  const key = 'wpn' + id + '|' + c.join(','); let cv = V27B.img.get(key); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = f.w; cv.height = f.h; const g = cv.getContext('2d'); let s = 0; for (const ch of id) s = (s * 31 + ch.charCodeAt(0)) | 0;
  const h = i => { let x = (s + Math.imul(i + 1, 0x9e3779b1)) | 0; x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296; }; // väl blandad
  const [x0, y0, x1, y1] = bb || [0, 0, f.w, f.h], bw = x1 - x0, bh = y1 - y0, R = Math.max(1.5, Math.min(bw, bh) * 0.05);
  const cl = [0, 1, 2, 3, 4, 5, 6, 7].map(k => [x0 + bw * ((k + h(k + 500)) / 8), y0 + bh * 0.7 * Math.pow(h(k + 520), 1.2)]); // åtta stänkcentra över bladet
  for (let i = 0; i < 130; i++) { const [cx, cy] = cl[i % 8], a = h(i) * TAU, d = R * 4 * Math.pow(h(i + 40), 1.6), x = cx + Math.cos(a) * d * 1.4, y = cy + Math.sin(a) * d * 0.8, r = R * (0.25 + 0.9 * h(i + 80)) * (1 - d / (R * 6));
    g.fillStyle = h(i + 300) < 0.35 ? `rgb(${c[0] * 0.6 | 0},${c[1] * 0.6 | 0},${c[2] * 0.6 | 0})` : `rgb(${c[0]},${c[1]},${c[2]})`; g.beginPath(); g.arc(x, y, Math.max(0.6, r), 0, TAU); g.fill();
    if (h(i + 120) < 0.12) g.fillRect(x - 0.5, y, Math.max(1, R * 0.25), R * (1 + 3 * h(i + 160))); } // droppar
  V27B.img.set(key, cv); return cv;
}
function v27WeaponBlood(f) { // från drawWeapon (efter vapenbilden, före ljuset)
  const b = V27B.wb; if (!b) return; const L = v27B();
  if (L <= 0 || settings.lowfx) { V27B.wb = null; return; } if (WEAPONS[P.weapon].id !== b.id) return; // ett annat vapen: blodet ligger kvar på det blodiga
  const age = tmr - b.t, a = b.a * (L === 2 ? 0.95 : 0.6) * clamp(1 - (age - 4) / 5, 0, 1); if (a <= 0.02) { V27B.wb = null; return; }
  wctx.save(); wctx.globalCompositeOperation = 'source-atop'; wctx.globalAlpha = a; wctx.drawImage(v27WeaponCan(f, b.c, b.id, v27WeaponBox(f, b.id)), 0, 0); wctx.restore(); V27B.n.wpnDraw++;
}
// ---- omgång 3: lik som går sönder (Doom/ULTRAKILL), sårade fiender som blöder och haltar, stjärnformad blodfläck efter en smäll ----
// Liken ligger kvar i ents (e.dead) tills banan byts. Ett lik får gå sönder om det inte behövs till något annat: inte bossar och väktare,
// inte uppätna eller uppväckta, inte ett lik som en ghoul äter just nu (o.meal), inte ett som faller (airZ) eller ligger under jord.
// Explosionerna sprängde redan liken (explode → gib); nu gör kulorna (v27CorpseRay från fire) och sparken/kolvslaget det också.
// Taket: högst 40 hela lik (NORMAL 30, lowfx 16); de äldsta långt borta (> 7 rutor, ingen ghoul eller nekromant i närheten) försvinner tyst.
const v27CorpseCap = () => settings.lowfx ? 16 : v27B() === 2 ? 40 : 30;
function v27CorpseOk(e) { return e.dead && !e.gibbed && !e.boss && !e.guardian && !e.eaten && !e.raised && !e.dummy && !e.under && e.type !== 'Ñ' && !(e.airZ > 0) && tmr - (e.gDeadT ?? -9) > 0.3 && !!enemyFrames[e.type] && !ents.some(o => o.meal === e); }
function v27CorpseHit(e, dmg, dx, dy) { // en kula eller en spark i ett lik: lite blod, och sönder när skadan räcker
  if (v27B() < 0 || !v27CorpseOk(e)) return false; const L = v27B(), c = v27Col(e); e.v27ch = (e.v27ch || 0) + dmg; V27B.n.corpseHits++;
  if (L > 0 && c && !settings.lowfx) { const f = v27Drops(c); if (f) for (let i = 0; i < (L === 2 ? 3 : 1); i++) { const a = Math.atan2(dy, dx) + rnd(-0.6, 0.6), sp = rnd(0.6, 1.6); gfxEPart({ x: e.x, y: e.y, z: 0.08, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(0.8, 1.8), life: rnd(0.4, 0.7), img: f[i % f.length], size: rnd(0.06, 0.1), grav: true }); } }
  if (e.v27ch >= clamp(e.maxHp * 0.5, 2.5, 12)) { v27CorpseGib(e, dx, dy); return true; }
  return false;
}
function v27CorpseGib(e, dx, dy) { // liket sprängs: bitar efter material (gfxEGib, BLOD AV: damm och sten), blod och en fläck
  e.gibbed = true; e.v27gib = true; e.gHitX = dx; e.gHitY = dy; V27B.n.corpseGibs++; play('gib', 0.45, rnd(0.9, 1.1), { x: e.x, y: e.y });
  gfxEGib(e); const L = v27B(), c = v27Col(e); if (L <= 0 || !c || c === V27_COL.dust) return;
  if (gfxEKind(e) === 'flesh') { for (let i = 0; i < (settings.lowfx ? 1 : 3); i++) spawnBlood(e.x, e.y); addDecal(e.x, e.y); }
  if (!settings.lowfx) { const f = v27Tint('trail', (V27B.orig && V27B.orig.trail) || fx.parts.blood_trail, c); if (f) for (let i = 0; i < (L === 2 ? 3 : 1); i++) if (v27Decal(e.x + dx * rnd(0.2, 0.7) + rnd(-0.25, 0.25), e.y + dy * rnd(0.2, 0.7) + rnd(-0.25, 0.25), f[i % f.length], rnd(0.03, 0.05), 0, c)) V27B.n.splats++; }
}
function v27CorpseRay(dx, dy, maxD, dmg) { // från fire (en kula som inte stoppats): liken längs strålen fram till väggen
  if (v27B() < 0) return; for (const e of ents) { if (!e.dead || e.gibbed) continue; const rx = e.x - P.x, ry = e.y - P.y, al = rx * dx + ry * dy;
    if (al > 0.3 && al < maxD && Math.abs(rx * dy - ry * dx) < 0.32 * e.d.size) v27CorpseHit(e, dmg, dx, dy); }
}
function v27CorpseTick(dt) { // från v27Tick: sparken/kolvslaget mot lik framför dig, och taket på hela lik
  if (P.kickT >= 0.45) { if (!V27B.kickSeen) { V27B.kickSeen = true; for (const e of ents) { if (!e.dead || e.gibbed) continue; const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
    if (d < 1.7 && Math.abs(off) < 0.7) v27CorpseHit(e, 99, dx / (d || 1), dy / (d || 1)); } } } else V27B.kickSeen = false;
  if ((V27B.capT -= dt) > 0) return; V27B.capT = 1;
  const all = ents.filter(e => e.dead && !e.gibbed && !e.boss); let over = all.length - v27CorpseCap(); if (over <= 0) return;
  const keep = ents.filter(o => !o.dead && (o.d.ai === 'ghoul' || o.d.ai === 'necro' || o.raiseT !== undefined));
  all.sort((a, b) => (a.gDeadT ?? -9) - (b.gDeadT ?? -9));
  for (const e of all) { if (over <= 0) break; if (!v27CorpseOk(e) || Math.hypot(e.x - P.x, e.y - P.y) < 7 || keep.some(o => Math.hypot(o.x - e.x, o.y - e.y) < 8)) continue; e.gibbed = true; e.v27gone = true; over--; V27B.n.corpseGone++; }
}
function v27WoundTick(dt, L) { // från v27Tick (var 0,1 s): under 40 % hp droppar blodet tätare och spåret blir tydligare; under 20 % haltar köttfiender
  for (const e of ents) {
    if (e.dead || e.boss || e.dummy || e.hidden || e.dormant || !(e.maxHp > 0)) continue; const k = e.hp / e.maxHp, c = v27Col(e);
    if (c !== V27_COL.flesh && L >= 0) e.trailT = 9; // det gamla röda spåret (enemyFeel) bara för kött; andra material får v27-spåret i sin färg (eller inget)
    const fl = c === V27_COL.flesh || c === V27_COL.dark; // haltar: fart × 0,8 som en egen faktor på e.d (som r25Mor; går att räkna tillbaka)
    if (fl && !e.v27limp && k < 0.2 && k > 0) { e.v27limp = true; e.d = { ...e.d, speed: e.d.speed * 0.8 }; V27B.n.limps++; }
    else if (e.v27limp && k >= 0.3) { e.v27limp = false; e.d = { ...e.d, speed: e.d.speed / 0.8 }; }
    if (L <= 0 || settings.lowfx || k >= 0.4 || !c || c === V27_COL.dust || Math.abs(e.x - P.x) > 14 || Math.abs(e.y - P.y) > 14) continue;
    const rate = (L === 2 ? 0.25 : 0.5) * (k < 0.2 ? 0.6 : 1);
    if ((e.v27dT = (e.v27dT ?? rnd(0, rate)) - 0.1) <= 0) { e.v27dT = rate * rnd(0.7, 1.3); const f = v27Drops(c); if (f) { gfxEPart({ x: e.x + rnd(-0.12, 0.12), y: e.y + rnd(-0.12, 0.12), z: v27Z(e) * rnd(0.6, 1), vx: rnd(-0.2, 0.2), vy: rnd(-0.2, 0.2), vz: 0, life: 0.6, img: f[(Math.random() * f.length) | 0], size: rnd(0.05, 0.08), grav: true }); V27B.n.drips++; } }
    if ((e.mvx || e.mvy) && (e.v27tT = (e.v27tT ?? 0) - 0.1) <= 0) { e.v27tT = L === 2 ? 0.4 : 0.7; const f = v27Tint('trail', (V27B.orig && V27B.orig.trail) || fx.parts.blood_trail, c); if (f && v27Decal(e.x + rnd(-0.1, 0.1), e.y + rnd(-0.1, 0.1), f[(Math.random() * f.length) | 0], k < 0.2 ? 0.05 : 0.04, 16, c)) V27B.n.trail++; }
  }
}
function v27Boom(x, y, r) { V27B.boom = v27B() > 0 ? { x, y, r, t: tmr, cols: [] } : null; } // från explode: smällen som kanske dödar köttfiender
function v27Star(B) { // stjärnformad blodfläck: strålar ut från smällens mitt och en ring av stänk (MYCKET 8 strålar × 2, NORMAL 6 × 1)
  const L = v27B(), c = B.cols[0], f = v27Tint('trail', (V27B.orig && V27B.orig.trail) || fx.parts.blood_trail, c), pf = c === V27_COL.flesh ? (V27B.orig && V27B.orig.pool) || fx.parts.blood_pool : v27Tint('pool', (V27B.orig && V27B.orig.pool) || fx.parts.blood_pool, c);
  if (!f) return; const n = L === 2 ? 8 : 6, R = clamp(B.r, 1, 2.2), a0 = rnd(0, TAU); V27B.n.stars++;
  if (pf) v27Decal(B.x, B.y, v27Wide(pf[0]), L === 2 ? 0.1 : 0.07, 0, c);
  for (let i = 0; i < n; i++) { const a = a0 + i / n * TAU + rnd(-0.15, 0.15); for (let j = 0; j < (L === 2 ? 2 : 1); j++) { const d = R * (j ? rnd(0.75, 0.95) : rnd(0.4, 0.6));
    if (v27Decal(B.x + Math.cos(a) * d, B.y + Math.sin(a) * d, v27Wide(f[(i + j) % f.length]), rnd(0.035, 0.05) * (j ? 0.8 : 1), 0, c)) V27B.n.starSplats++; } }
}
function v27NoBleed(e, quiet) { // spöken, eld, urverk och kristall (materialet null) blöder inte; metall har sina gnistor i gfxEBleed
  if (!V27B.on || !e || !e.d || gfxEKind(e) === 'metal' || v27Mat(e) !== null) return false; if (!quiet) V27B.n.noBleed++; return true;
}
function v27NoPool(e) { // från killEnemy (efter addDecal): pölen under ett spöke eller en eldvarelse tas bort direkt
  if (!v27NoBleed(e, true)) return; const src = (V27B.orig && V27B.orig.pool) || fx.parts.blood_pool || [];
  for (let i = decals.length - 1; i >= Math.max(0, decals.length - 3); i--) { const d = decals[i]; if (src.includes(d.img) && Math.abs(d.x - e.x) < 0.2 && Math.abs(d.y - e.y) < 0.2) { decals.splice(i, 1); V27B.n.noPool++; } }
}
// ---- omgång 4: blod på den sårade fiendens bild, köttbitar som fastnar på väggen och glider ned ----
// Bilden: renderSprites sätter V27B.cur (v27SprPre) precis före fiendens drawSprite; drawSprite byter då bilden mot en kopia med blodfläckar
// på fiendens egna pixlar (samma alfa, så kontur, träffblink, tint och spöktoning i gfxE fungerar som förut). Nivå 1–3 vid 70/50/30 % hp
// (NORMAL högst 2); liket behåller sin nivå. Samma brusfält för alla nivåer, så att fläckarna växer. Cachen: per bild (tak 300 bilder),
// färg och nivå; en kopia kostar en loop över bildens pixlar en gång. Inget med BLOD AV, lowfx, bossar, metall, spöken, eld och ben.
function v27SprPre(o) {
  if (o.boss) return null; const L = v27B(); if (L <= 0 || settings.lowfx) return null;
  if (!o.dead) { const k = o.hp / (o.maxHp || 1); o.v27lv = k <= 0.3 ? 3 : k <= 0.5 ? 2 : k <= 0.7 ? 1 : 0; }
  const lv = o.v27lv | 0; if (!lv) return null; const c = v27Col(o); if (!c || c === V27_COL.dust) return null;
  const q = V27B.sq; q.c = c; q.lv = L === 2 ? lv : Math.min(2, lv); return q;
}
function v27SprImg(img, q) { // från drawSprite (bara direkt efter v27SprPre; nollställs här så att inget annat byts)
  V27B.cur = null; if (!img || !img.data || !q.c) return img;
  let per = V27B.spr.get(img); if (!per) { if (V27B.spr.size >= 300) { V27B.spr.clear(); V27B.n.sprClear++; } per = new Map(); V27B.spr.set(img, per); }
  const key = q.c.join(',') + '|' + q.lv; let r = per.get(key); if (!r) { r = v27SprMake(img, q.c, q.lv); per.set(key, r); V27B.n.sprMade++; } V27B.n.sprDraw++; return r;
}
function v27SprMake(img, c, lv) { // fläckar: värdebrus i celler (bilinjärt) över tröskeln, skuggade med originalets ljushet; droppar rinner nedåt
  const w = img.w, h = img.h, src = img.data, d = new Uint32Array(src), th = [1, 0.74, 0.6, 0.47][lv], cs = Math.max(2, Math.round(w / 14)), seed = (w * 73856093) ^ (h * 19349663);
  const hv = (x, y) => v27Hash(seed + x * 374761 + y * 668265), N = (x, y) => { const fx0 = x / cs, fy0 = y / cs, ix = Math.floor(fx0), iy = Math.floor(fy0), u = fx0 - ix, v = fy0 - iy;
    return (hv(ix, iy) * (1 - u) + hv(ix + 1, iy) * u) * (1 - v) + (hv(ix, iy + 1) * (1 - u) + hv(ix + 1, iy + 1) * u) * v; };
  const paint = (i, k) => { const p = src[i], a = p >>> 24, f = (0.45 + 0.55 * Math.max(p & 255, (p >> 8) & 255, (p >> 16) & 255) / 255) * k; d[i] = ((a << 24) | (Math.min(255, c[2] * f) << 16) | (Math.min(255, c[1] * f) << 8) | Math.min(255, c[0] * f)) >>> 0; };
  const mark = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (src[i] >>> 24 < 100) continue; if (N(x, y) > th) { paint(i, 1.05); mark[i] = 1; } }
  for (let x = 0; x < w; x++) { if (hv(x, 999) > 0.12 * lv) continue; for (let y = h - 2; y >= 0; y--) if (mark[y * w + x]) { const n = 1 + Math.floor(hv(x, 777) * lv * 2.5); for (let k = 1; k <= n && y + k < h; k++) { const j = (y + k) * w + x; if (src[j] >>> 24 < 100) break; paint(j, 0.8); } break; } }
  return { w, h, data: d };
}
function v27WallGib(hit, dx, dy, z, c) { // en köttbit fastnar på väggen och glider ned (räknas i väggtaket)
  const m = v27Wall(hit, dx, dy, z, c, rnd(0.045, 0.065), 0.6); if (!m) return null;
  m.gib = 1; m.z0 = m.z; m.v = rnd(0.04, 0.1); m.gc = v27Abgr([Math.min(255, c[0] * 0.8 + 40), c[1] * 0.7 + 18, c[2] * 0.7 + 16]); m.gc2 = v27Abgr([c[0] * 0.45, c[1] * 0.45, c[2] * 0.45]); V27B.n.wallGibs++; return m;
}
function v27WallGibPx(px, W, VH, x, m, wx, top, lh, L, perp) { // från v27WallPx: biten (en liten klump) och blodspåret ovanför den
  const s = (wx - m.u) / m.r, zc = Math.max(0.04, m.z0 - m.v * Math.min(12, tmr - m.t)), cy = top + (1 - zc) * lh, R = m.r * lh;
  if (Math.abs(s) < 0.38) { const y0 = Math.max(0, Math.ceil(top + (1 - m.z0) * lh)), y1 = Math.min(VH - 1, Math.floor(cy)), col = shadeFog(m.col2 || m.col, L, perp); for (let y = y0; y <= y1; y++) px[y * W + x] = col; }
  const hh = Math.sqrt(Math.max(0, 1 - s * s)) * R * 0.85, ya = Math.max(0, Math.ceil(cy - hh)), yb = Math.min(VH - 1, Math.floor(cy + hh)); if (yb < ya) return;
  const c1 = shadeFog(m.gc, L, perp), c2 = shadeFog(m.gc2, L, perp); for (let y = ya; y <= yb; y++) px[y * W + x] = y - ya < (yb - ya) * 0.4 ? c1 : c2;
}
function v27bApi() { // window.__game.v27b: tillstånd, räknare och av/på för t135–t139
  const marks = () => { const out = []; for (const [key, a] of wallMarks) for (const m of a) if (m.v27) out.push({ key, mx: Math.floor(key / 4) % mw, my: Math.floor(Math.floor(key / 4) / mw), face: key % 4, u: m.u, z: m.z, r: m.r, c: m.c }); return out; };
  return { st: V27B, n: V27B.n, t: () => tmr, set: v => { V27B.on = !!v; v27Sync(); }, level: v27B, mat: e => v27Col(e), cap: v27WallCap, sync: v27Sync, marks, walls: () => V27B.walls.length,
    oldMarks: () => { let n = 0; for (const a of wallMarks.values()) for (const m of a) if (m.kind === 'blood') n++; return n; }, decals: () => decals.filter(d => d.v27).length, swapped: () => V27B.swapped,
    scr: () => V27B.scr.length, step: () => V27B.step, steps: () => V27B.n.steps, decalArr: () => decals, stepNow: () => stepSound(), wallMarks: () => wallMarks, fx: () => fx, render: () => render(), wpn: () => V27B.wb && { ...V27B.wb }, drawWeapon: () => drawWeapon(), corpseOk: e => v27CorpseOk(e), corpseCap: v27CorpseCap, corpseRay: (dx, dy, d, dmg) => v27CorpseRay(dx, dy, d, dmg), corpseHit: (e, dmg) => v27CorpseHit(e, dmg, 1, 0), spr: () => V27B.spr.size, sprFor: e => { const q = v27SprPre(e); return q ? { lv: q.lv, img: v27SprImg(enemyFrame(e), q), src: enemyFrame(e) } : null; }, sprCap: n => { for (let i = 0; i < n; i++) v27SprImg({ w: 4, h: 4, data: new Uint32Array(16).fill(0xff808080) }, { c: V27_COL.flesh, lv: 1 }); return V27B.spr.size; }, gibMarks: () => V27B.walls.filter(o => o.m.gib).map(o => ({ z0: o.m.z0, z: Math.max(0.04, o.m.z0 - o.m.v * Math.min(12, tmr - o.m.t)) })), sprBench: (e, n = 2000) => { const im = enemyFrame(e), t0 = performance.now(); for (let i = 0; i < n; i++) { const q = v27SprPre(e); if (q) v27SprImg(im, q); } return (performance.now() - t0) / n; },
    tickBench: (n = 500) => { const t0 = performance.now(); for (let i = 0; i < n; i++) { V27B.chkT = 0; v27Tick(1 / 60); } return (performance.now() - t0) / n; }, // tickBench: ms per anrop (med pölkollen varje gång)
    wall: (hit, dx, dy, z, c, r, k) => v27Wall(hit, dx, dy, z, c, r, k), cast, screenAdd: c => v27ScreenAdd(c || V27_COL.flesh), COL: V27_COL,
    bench: (n = 120) => { const ts = []; for (let i = 0; i < n; i++) { const t0 = performance.now(); tmr += 1 / 60; updateParticles(1 / 60); render(); ts.push(performance.now() - t0); } ts.sort((a, b) => a - b); return { med: ts[n >> 1], p90: ts[(n * 0.9) | 0], parts: particles.length, decals: decals.length }; } };
}

