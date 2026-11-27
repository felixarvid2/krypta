// ---------- Version 29 (FÖNSTER): glas som går sönder, rostiga galler som kan sprängas och lösa trådar från version 28 ----------
// LÖSA TRÅDAR: (1) livmätare och skadesiffror bakom galler och fönster: project() (drawWorldOverlay) jämför med bakväggens djup
// (V28T.zb, satt av v28Fin) i stället för gallrets, så en fiende som syns genom gallret har sin mätare; bakom en vanlig vägg som förut.
// (2) rutor som bara syns genom ett galler eller fönster markeras i V28T.far (v28Cast), inte i seen: de räknas inte som utforskade
// (automap, utforskningsprocent, föremål på kartan) men ritas svagt på kartan (f29MapFar, före drawMapCells rutor).
// (3) fängelsets gallerpelare (2×2 Ɉ, bödelns arena och cellraderna) ritas ogenomskinliga (V28T.opq i v28Scan).

// ---- (1) livmätare bakom galler: project() med bakväggens djup ----
{ const project0 = project; project = function (wx, wy, z) {
  if (!V28T.any) return project0(wx, wy, z); // inga galler i bild: som förut
  const { dirX, dirY, plX, plY } = view, rx = wx - P.x, ry = wy - P.y, inv = 1 / (plX * dirY - dirX * plY), tx = inv * (dirY * rx - dirX * ry), ty = inv * (-plY * rx + plX * ry);
  if (ty < 0.2) return null;
  const cols = LK.on ? LK.TW : W, c = Math.round((cols / 2) * (1 + tx / ty));
  if (c < 0 || c >= cols || !(V28T.zb[c] > zbuf[c])) return project0(wx, wy, z);
  const z0 = zbuf[c]; zbuf[c] = V28T.zb[c]; try { return project0(wx, wy, z); } finally { zbuf[c] = z0; }
}; }

// ---- (2) skymtade rutor: svagt på kartan ----
function f29MapFar(s, ox, oy, x0, y0, x1, y1) { // från drawMapCells (före rutorna): rutor man bara sett genom galler och fönster
  const fa = V28T.far; if (!fa || fa.length !== mw * mh) return;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = y * mw + x; if (!fa[i] || seen[i]) continue;
    ctx.fillStyle = isWallChar(map[y][x]) ? '#3e3a33' : '#1a1714'; ctx.fillRect(ox + x * s, oy + y * s, s, s); }
}

// ---- GLAS OCH ROSTIGA GALLER ----
// Fyra nya kartecken (bara i spelets karta, aldrig i gen.js): ǁ GLAS (en vägg för allt utom bilden: stoppar kulor, siktlinje och
// vägsökning; ritas som blyinfattat glas med biomens ram, lätt färgton och reflex), ǀ KROSSAT GLAS (en öppen ram: ingen vägg, man går,
// skjuter och ser igenom), ǃ ROSTIGT GALLER (som fönstret ǂ men rostigt och märkt med krita) och ʭ UPPBÖJT GALLER (öppet som ǀ).
// Glaset går sönder av skott (tre pistolskott), direkt av en smäll, en spark eller ett närstridsslag; det rostiga gallret av en smäll
// eller tre sparkar/slag. Det öppnade fönstret är gångbart: det placeras bara där båda sidorna redan hänger ihop utan låsta dörrar,
// galler med spak, hemliga väggar, väktarrum och arenor (f29Labels), så det blir en genväg men aldrig går förbi ett lås.
// Placering när banan startar (f29Start, från v28Start): fönster mot ett rum längre fram (level.windows28) blir glas, vakttornets fönster
// blir glas eller får ett rostigt galler på en sida, balkongens bortre ände får ett rostigt galler. Eget slumpflöde RNG(seed:glas29:djup);
// bara våningar som spelet laddar med loadFloor (F29.live); egna banor, övning, hubben, bossar, hemliga rum och labyrinter får inget, och
// inte heller en bana som startas direkt med startLevel (testerna för version 28) utan F29.force / ?f29=glass|rust. F29.on = false: inga nya tecken.
const F29 = { on: true, glass: true, rust: true, force: null, live: false, pWin: 0.6, pTowerGlass: 0.35, pTowerRust: 0.45, pBalc: 0.6, hpGlass: 6, hpRust: 3 };
const F29_GLASS = 'ǁ', F29_OPEN = 'ǀ', F29_RUST = 'ǃ', F29_BENT = 'ʭ';
const F29_CH = { [F29_GLASS]: 'glass', [F29_OPEN]: 'open', [F29_RUST]: 'rust', [F29_BENT]: 'bent' };
const F29_MAPCOL = { [F29_GLASS]: '#c8f4ff', [F29_RUST]: '#d07838' };
let F29L = { cells: new Map(), n: 0, broken: 0, bent: 0, placed: { glass: 0, rust: 0 }, hintT: 0, log: [] }; // banans glas och rostiga galler (ci → { x, y, kind, hp })
const F29T = new Map(); // texturer per ramens bild: { glass, crack, open, rust, bent }
IWC[F29_GLASS] = true; IWC[F29_RUST] = true; // väggar (kollision, kulor, siktlinje, vägsökning)
IWC[F29_OPEN] = false; IWC[F29_BENT] = false;
V28TR[F29_GLASS] = 1; V28TR[F29_RUST] = 1; V28TR[F29_OPEN] = 2; V28TR[F29_BENT] = 2; // 1: genomsiktlig vägg, 2: öppen ram (inte vägg)
wallTexFor[F29_GLASS] = 'wall_f29glass'; wallTexFor[F29_RUST] = 'wall_f29rust'; wallTexFor[F29_OPEN] = 'wall_v28win'; wallTexFor[F29_BENT] = 'wall_v28win'; // ogenomskinliga reserver (lagertaket, V28.glass av)

// ---- texturer ----
function f29Tex(base, kind) { // ram av väggens textur; inuti glas (blyspröjsar i rutmönster, halvgenomskinliga rutor, reflex), sprickor, skärvor eller rostiga stänger
  const w = base.w, h = base.h, d = base.data, out = new Uint32Array(w * h), solidT = new Uint32Array(w * h), grate = kind === 'rust' || kind === 'bent';
  const top = Math.round(h * (grate ? 0.2 : 0.12)), bot = Math.round(h * (grate ? 0.76 : 0.9)), l = Math.round(w * (grate ? 0.14 : 0.12)), r = w - l, bw = Math.max(2, Math.round(w / 22));
  const hsh = n => ((Math.imul(n | 0, 2654435761) >>> 8) & 255) / 255, A = (a, r0, g0, b0) => ((a << 24) | (Math.min(255, b0 | 0) << 16) | (Math.min(255, g0 | 0) << 8) | Math.min(255, r0 | 0)) >>> 0;
  const bars = [], nb = 3; for (let i = 0; i < nb; i++) bars.push(Math.round(l + (r - l) * (i + 1) / (nb + 1) - bw / 2));
  const my = Math.round((top + bot) / 2 - bw / 2), cx = 0.62, cy = 0.38, rays = [0.3, 1.4, 2.3, 3.4, 4.6, 5.5];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, frame = y < top || y >= bot || x < l || x >= r;
    if (frame) { let p = d[i] | 0xff000000; if (y === top - 1 || y === bot || x === l - 1 || x === r) p = 0xff000000 | ((p >> 1) & 0x7f7f7f);
      if (kind === 'rust' && y < top - 1 && y > top * 0.3 && Math.abs((x - w / 2) - (y - top * 0.65) * 1.4) < 1.2 + 0 || kind === 'rust' && y < top - 1 && y > top * 0.3 && Math.abs((x - w / 2) + (y - top * 0.65) * 1.4) < 1.2) p = 0xffd8e4e8; // kritkryss på överstycket: märkt
      out[i] = solidT[i] = p >>> 0; continue; }
    const u = (x - l + 0.5) / (r - l), v = (y - top + 0.5) / (bot - top);
    if (grate) { // stänger och en tvärslå, rostiga; uppböjt: mittstången borta, de andra böjda åt sidorna, tvärslån av på mitten
      let bar = -1; for (let k = 0; k < nb; k++) { let b = bars[k]; if (kind === 'bent') { if (k === 1) continue; b += Math.round((k === 0 ? -1 : 1) * Math.sin(Math.min(1, Math.max(0, v)) * Math.PI) * (r - l) * 0.18); } if (x >= b && x < b + bw) bar = x - b; }
      let rail = y >= my && y < my + bw; if (kind === 'bent' && rail && Math.abs(u - 0.5) < 0.22) rail = false;
      if (kind === 'bent' && rail) rail = y + Math.round(Math.abs(u - 0.5) < 0.3 ? (0.3 - Math.abs(u - 0.5)) * 10 : 0) >= my; // ändarna böjda
      if (bar >= 0 || rail) { const k = bar >= 0 ? bar / Math.max(1, bw - 1) : (y - my) / Math.max(1, bw - 1), hi = 1 - Math.abs(k - 0.35) * 1.4, g = 34 + 40 * Math.max(0, hi), rr = hsh(x * 7 + y * 13);
        out[i] = solidT[i] = rr < 0.55 ? A(255, g * 1.55, g * 0.8, g * 0.45) : rr < 0.7 ? A(255, g * 1.9, g * 1.0, g * 0.5) : A(255, g * 1.1, g * 0.95, g * 0.85); continue; } // rost
      solidT[i] = A(255, 16, 14, 13); continue;
    }
    if (kind === 'open') { // krossat: vassa skärvor kvar längs ramen, resten öppet
      const e = Math.min(u, 1 - u, v * 1.3, (1 - v) * 1.3), jag = 0.05 + 0.13 * hsh(((u < 0.5 ? 1 : 2) * 977 + Math.floor((u < 0.15 || u > 0.85 ? v : u) * 9)) | 0) * (1 - Math.abs(((u < 0.15 || u > 0.85 ? v : u) * 9) % 1 - 0.5) * 1.6);
      if (e < jag) { out[i] = e < 0.025 ? A(255, 44, 44, 48) : A(70, 190, 215, 200); solidT[i] = A(255, 60, 70, 66); continue; }
      solidT[i] = A(255, 16, 14, 13); continue;
    }
    const s1 = (u * 3 + v * 4) % 1, s2 = (u * 3 - v * 4 + 8) % 1, lw = 0.07; // blyspröjsar i rutmönster
    if (s1 < lw || s1 > 1 - lw || s2 < lw || s2 > 1 - lw) { out[i] = solidT[i] = A(255, 46, 46, 50); continue; }
    if (kind === 'crack') { const dx = u - cx, dy = (v - cy) * 1.2, dd = Math.hypot(dx, dy), an = Math.atan2(dy, dx); let hit = dd < 0.03;
      for (const ra of rays) { let da = Math.abs(an - ra); if (da > Math.PI) da = TAU - da; if (dd * da < 0.006 + 0.003 * hsh(x * 3 + y) && dd < 0.5) hit = true; }
      if (hit) { out[i] = A(210, 236, 240, 244); solidT[i] = A(255, 200, 210, 215); continue; } }
    const cell = Math.floor(u * 3 + v * 4) * 7 + Math.floor(u * 3 - v * 4 + 8), tint = hsh(cell * 31 + 5), refl = (u + v * 0.55) % 1;
    const rr = 150 + 60 * tint, gg = 190 + 40 * (1 - tint), bb = 165 + 40 * hsh(cell * 17); // lätt grönaktig ton som skiftar mellan rutorna
    if ((refl > 0.18 && refl < 0.25) || (refl > 0.29 && refl < 0.31)) { out[i] = A(100, 245, 248, 255); solidT[i] = A(255, 150, 160, 160); continue; } // reflex
    out[i] = A(40, rr, gg, bb); solidT[i] = A(255, rr * 0.35, gg * 0.38, bb * 0.36);
  }
  const t = v28Op({ w, h, data: out }); t.solid = { w, h, data: solidT }; t.glass = !grate; return t;
}
function f29Set(base) { let s = F29T.get(base); if (!s) { s = {}; F29T.set(base, s); } return s; }
function f29Base(mx, my) { // ramens bild: grannväggens textur (som fönstret ǂ), annars banans vanligaste vägg
  for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = (map[my + ay] || [])[mx + ax]; if (q && isWallChar(q) && !V28TR[q] && wallTexFor[q] && tex[wallTexFor[q]]) return tex[wallTexFor[q]]; }
  return tex[wallTexFor[V28T.wallCh]] || tex[wallTexFor[1]] || tex.wall_stone;
}
function f29Ovl(kind, mx, my) { // från v28Ovl: texturen för rutan (glaset med sprickor när det har träffats)
  const g = F29L.cells.get(my * mw + mx), k = kind === 'glass' && g && g.hp < F29.hpGlass ? 'crack' : kind, base = g && g.base ? g.base : f29Base(mx, my), s = f29Set(base);
  if (g && !g.base) g.base = base;
  return s[k] || (s[k] = f29Tex(base, k));
}

// ---- banans start: placering och rutornas tillstånd ----
function f29Labels() { // sammanhängande golvytor utan låsta dörrar, spakgaller, hemliga väggar, gropar, väktarrum, utmaningsrum och arenor (−1 = spärrad)
  const N = mw * mh, lab = new Int32Array(N).fill(-1), blk = new Uint8Array(N), rm = lvl.roomMask, rooms = lvl.rooms || [];
  const guard = new Set(rooms.map((r, i) => r && r.type === 'guardian' ? i : -1).filter(i => i >= 0));
  if (rm) for (const pr of props) if (pr.def && pr.def.use === 'challenge' && rm[pr.cy]) { const k = rm[pr.cy].charCodeAt(pr.cx) - 48; if (k >= 0) guard.add(k); } // utmaningsaltarets rum stängs under vågorna (0290)
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const c = map[y][x], d = isDoorChar(c) ? doors[x + ',' + y] : null;
    let b = isWallChar(c) || c === '·' || (d && (c !== 'D' || d.glock || d.oneway || d.arena || d.locked || d.secret));
    if (!b && guard.size && rm && rm[y] && guard.has(rm[y].charCodeAt(x) - 48)) b = true;
    if (!b && (lvl.arenas || []).some(a => x >= a.x0 - 1 && x <= a.x1 + 1 && y >= a.y0 - 1 && y <= a.y1 + 1)) b = true;
    blk[y * mw + x] = b ? 1 : 0;
  }
  let id = 0; const q = new Int32Array(N);
  for (let s = 0; s < N; s++) { if (blk[s] || lab[s] >= 0) continue; let h = 0, t = 0; q[t++] = s; lab[s] = id;
    while (h < t) { const c = q[h++], x = c % mw, y = (c / mw) | 0;
      for (const n of [x > 0 ? c - 1 : -1, x < mw - 1 ? c + 1 : -1, y > 0 ? c - mw : -1, y < mh - 1 ? c + mw : -1]) if (n >= 0 && !blk[n] && lab[n] < 0) { lab[n] = id; q[t++] = n; } }
    id++; }
  return lab;
}
function f29Sides(x, y) { // de två rutorna på var sin sida om fönstret (vänster/höger eller upp/ned) där man kan stå, eller null
  const open = (a, b) => a >= 0 && b >= 0 && a < mw && b < mh && !isDoorChar(map[b][a]) && !solid(a + 0.5, b + 0.5); // (inte vägg, bord, eldfat eller dörr)
  if (open(x - 1, y) && open(x + 1, y)) return [[x - 1, y], [x + 1, y]];
  if (open(x, y - 1) && open(x, y + 1)) return [[x, y - 1], [x, y + 1]];
  return null;
}
function f29Add(x, y, kind) { const ci = y * mw + x; F29L.cells.set(ci, { x, y, kind, hp: kind === 'glass' ? F29.hpGlass : F29.hpRust, base: null }); }
function f29Place() { // fönster ǂ → glas ǁ eller rostigt galler ǃ (eget slumpflöde; bara där båda sidorna redan hänger ihop)
  const rng = RNG(RNG.hash(run.seed + ':glas29:' + run.depth)), force = F29.force || params.get('f29');
  let lab = null; const ok = (x, y) => { if (!map[y] || map[y][x] !== 'ǂ') return false; const s = f29Sides(x, y); if (!s) return false; lab = lab || f29Labels(); const a = lab[s[0][1] * mw + s[0][0]], b = lab[s[1][1] * mw + s[1][0]]; return a >= 0 && a === b; };
  const set = (x, y, kind) => { if (kind === 'glass' ? !F29.glass : !F29.rust) return false; if (!ok(x, y)) return false; map[y][x] = kind === 'glass' ? F29_GLASS : F29_RUST; F29L.placed[kind]++; return true; };
  for (const w of Array.isArray(lvl.windows28) ? lvl.windows28 : []) { // fönster mot ett rum längre fram: glas
    const roll = rng.next(); if (!w || !Array.isArray(w.cells) || !(force === 'glass' || (force !== 'rust' && roll < F29.pWin))) continue;
    for (const c of w.cells) if (c) set(c.x, c.y, 'glass');
  }
  for (const s of Array.isArray(lvl.scenes28) ? lvl.scenes28 : []) {
    if (!s || (s.kind !== 'tower' && s.kind !== 'balcony') || !(s.w > 0)) continue;
    const cells = []; for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) if (map[y] && map[y][x] === 'ǂ') cells.push([x, y]);
    const roll = rng.next(), pick = rng.next(); if (!cells.length) continue;
    if (s.kind === 'tower') { // vakttornet: glas runt om, eller ett rostigt galler mitt på en sida
      if (force === 'glass' || (!force && roll < F29.pTowerGlass)) { for (const [x, y] of cells) set(x, y, 'glass'); continue; }
      if (force === 'rust' || (!force && roll < F29.pTowerGlass + F29.pTowerRust)) { const c = cells[Math.floor(pick * cells.length)]; set(c[0], c[1], 'rust'); }
      continue;
    }
    if (force === 'rust' || (!force && roll < F29.pBalc)) { // balkongen: ett rostigt galler i den bortre änden (ingången är i den andra)
      const vert = cells.every(c => c[0] === cells[0][0]), key = c => vert ? c[1] : c[0]; cells.sort((a, b) => key(a) - key(b));
      const ends = [cells[0], cells[cells.length - 1]], beyond = (c, d) => vert ? (map[c[1] + d] || [])[c[0]] : map[c[1]][c[0] + d];
      const entry = [beyond(ends[0], -1) === '.', beyond(ends[1], 1) === '.'], farEnd = entry[0] && !entry[1] ? 1 : entry[1] && !entry[0] ? 0 : pick < 0.5 ? 0 : 1;
      const order = farEnd ? cells.slice().reverse() : cells; // från den bortre änden inåt, högst halva balkongen (framför gallret måste man kunna stå)
      for (let k = 0; k < Math.ceil(order.length / 2); k++) if (set(order[k][0], order[k][1], 'rust')) break;
    }
  }
}
function f29Start() { // från v28Start (före v28Scan): placering, tillstånd och reservtexturer
  F29L = { cells: new Map(), n: 0, broken: 0, bent: 0, placed: { glass: 0, rust: 0 }, hintT: 0, log: [] }; V28T.o2 = 0;
  if (!map) return;
  const want = F29.live || !!F29.force || !!params.get('f29'); // bara våningar från loadFloor (spelets egna), eller tvingat (tester): Gen.floor + startLevel direkt får inget
  if (want && F29.on && run && lvl && !run.custom && !run.practice && !run.practiceT && !lvl.hub && !lvl.arena && !boss && !lvl.secret && !lvl.maze) try { f29Place(); } catch (e) { F29L.log.push('placering: ' + e.message); }
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { const c = map[y][x]; // alla tecken (också egna banor och testerna)
    if (c === F29_GLASS) f29Add(x, y, 'glass'); else if (c === F29_RUST) f29Add(x, y, 'rust'); else if (c === F29_OPEN || c === F29_BENT) V28T.o2++; }
  F29L.n = F29L.cells.size;
  const b = tex[wallTexFor[V28T.wallCh]] || tex[wallTexFor[1]] || tex.wall_stone, s = f29Set(b);
  tex.wall_f29glass = (s.glass || (s.glass = f29Tex(b, 'glass'))).solid; tex.wall_f29rust = (s.rust || (s.rust = f29Tex(b, 'rust'))).solid;
  WP_TEXMAT[F29_GLASS] = 'glass'; WP_TEXMAT[F29_RUST] = 'metal';
  if (window.__game && !window.__game.f29) window.__game.f29 = f29Api();
}

// ---- träffar och sönderslaget glas ----
function f29Hit(ci, dmg, how, hx, hy) { // how: 'shot' | 'proj' | 'boom' | 'kick' | 'melee'; sant om rutan påverkades
  const g = F29L.cells.get(ci); if (!g || g.open) return false;
  const cx = g.x + 0.5, cy = g.y + 0.5, x = hx === undefined ? cx : hx, y = hy === undefined ? cy : hy;
  if (g.kind === 'glass') {
    if (how === 'boom' || how === 'kick' || how === 'melee') g.hp = 0; else g.hp -= Math.max(0.5, dmg || 1);
    if (g.hp <= 0) { f29Open(g, how); return true; }
    play('ice_crack', 0.55, rnd(1.3, 1.6), { x, y }); f29Shards(x, y, 3, false); return true; // spricker (texturen byts i f29Ovl)
  }
  if (how === 'boom') g.hp = 0; else if (how === 'kick' || how === 'melee') g.hp -= 1; else { firstHint('rust29', 'ROSTIGA GALLER MED KRITKRYSS: SPARKA TRE GÅNGER ELLER SPRÄNG UPP DEM.'); return false; } // kulor biter inte
  if (g.hp <= 0) { f29Open(g, how); return true; }
  play('gate', 0.6, rnd(1.2, 1.4), { x: cx, y: cy }); play('kick', 0.6, 0.7); sparks(cx, cy, 0.5, 4); spawnText(cx, cy, g.hp === 1 ? 'GALLRET GER EFTER' : 'GALLRET BÖJS', '#d08040'); return true;
}
function f29Open(g, how) { // glaset krossas / gallret böjs upp: rutan blir en öppen ram, och allt som minns kartan får veta det
  const ci = g.y * mw + g.x, cx = g.x + 0.5, cy = g.y + 0.5; g.open = true; g.how = how;
  map[g.y][g.x] = g.kind === 'glass' ? F29_OPEN : F29_BENT; V28T.o2++;
  flowCell = -1; // fiendernas avståndsfält (0300) räknas om
  for (let f = 0; f < 4; f++) wallMarks.delete(ci * 4 + f); // kulhål och blod på rutan
  v28Scan(); // genomsiktliga rutor, pelarna och kartan
  if (typeof ai24Covers === 'function' && AI24.cov) try { ai24Covers(); } catch (e) { /* skyddspunkterna räknas om nästa bana */ }
  f29Relight(g.x, g.y);
  if (g.kind === 'glass') {
    F29L.broken++; play('glass_break', 0.9, rnd(0.9, 1.1), { x: cx, y: cy }); f29Shards(cx, cy, settings.lowfx ? 6 : 14, true);
    if (fx.parts.glassshard) { const sd = f29Sides(g.x, g.y) || [[g.x, g.y]]; for (let i = 0; i < 7; i++) { const s = sd[i % sd.length], k = i < 2 ? 0 : 1; // glasskärvor på golvet, i rutan och på båda sidor
      decals.push({ x: (k ? s[0] + 0.5 : cx) + rnd(-0.35, 0.35), y: (k ? s[1] + 0.5 : cy) + rnd(-0.35, 0.35), img: fx.parts.glassshard[i % fx.parts.glassshard.length], size: rnd(0.035, 0.06), flip: Math.random() < 0.5 }); }
      while (decals.length > 70) decals.shift(); }
    stat('glass29');
  } else { F29L.bent++; play('gate_slam', 0.9, 0.8, { x: cx, y: cy }); sparks(cx, cy, 0.5, 8); spawnPuff(cx, cy, 5); say('GALLRET BÖJS UPP', 2); stat('grates29'); }
  P.shake = Math.max(P.shake, Math.hypot(P.x - cx, P.y - cy) < 4 ? 0.5 : 0.2);
  F29L.log.push(g.kind + ':' + how + '@' + g.x + ',' + g.y);
}
function f29Shards(x, y, n, all) { // glasskärvor som flyger (partikelbudgeten gäller; lowfx färre)
  const sh = fx.parts.glassshard || fx.parts.shard; if (!sh) return; const tint = BIOME_TINT[lvl.biome] || [200, 225, 215];
  for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(0.6, all ? 2.6 : 1.4);
    if (!wpPart({ x: x + rnd(-0.3, 0.3) * (all ? 1 : 0.3), y: y + rnd(-0.3, 0.3) * (all ? 1 : 0.3), z: rnd(0.2, 0.85), vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rnd(0.3, 2), life: rnd(0.6, 1.2), img: sh[i % sh.length], size: rnd(0.025, 0.05), grav: true, bounce: true, tint }, all)) break; }
}
function f29Relight(x, y) { // facklorna nära rutan lyser nu igenom den (prepareTorchLight bara för dem)
  for (const t of torches) { const r = t.r || 7; if (Math.hypot(t.x - x - 0.5, t.y - y - 0.5) > r + 1) continue; t.cells = [];
    for (let yy = Math.max(0, (t.y | 0) - 7); yy < Math.min(mh, (t.y | 0) + 8); yy++) for (let xx = Math.max(0, (t.x | 0) - 7); xx < Math.min(mw, (t.x | 0) + 8); xx++) {
      const d = Math.hypot(xx + 0.5 - t.x, yy + 0.5 - t.y); if (d > r || isWallChar(map[yy][xx]) || !hasLOS(t.x, t.y, xx + 0.5, yy + 0.5)) continue;
      t.cells.push([yy * mw + xx, Math.pow(1 - d / r, 1.5) * (t.str || 1.3)]); } }
}
// krokar: kulor (fire), smällar (explode), sparkar och närstrid (breakProps), projektiler (inlindning)
function f29Shot(wall, hx, hy, dmg) { // från fire(): kulan slog i väggen wall
  if (!F29L.n || wall.mx === undefined) return; f29Hit(wall.my * mw + wall.mx, dmg, 'shot', hx, hy);
}
function f29Boom(x, y, r) { // från explode: glas inom räckhåll krossas, rostiga galler böjs upp
  if (!F29L.n) return;
  for (const [ci, g] of F29L.cells) if (!g.open && Math.hypot(g.x + 0.5 - x, g.y + 0.5 - y) < r + 0.9) f29Hit(ci, 99, 'boom');
}
function f29Melee(x, y, r, kicking) { // från breakProps (sparken, yxan och de andra närstridsvapnen): rutan framför spelaren
  if (!F29L.n) return false; let hit = false;
  for (const [ci, g] of F29L.cells) { if (g.open) continue; const dx = Math.max(g.x - x, 0, x - g.x - 1), dy = Math.max(g.y - y, 0, y - g.y - 1);
    if (Math.hypot(dx, dy) < Math.min(0.45, r * 0.6) && f29Hit(ci, 0, kicking ? 'kick' : 'melee', x, y)) hit = true; }
  return hit;
}
{ const updateProjectiles0 = updateProjectiles; updateProjectiles = function (dt) { // projektiler som dör i en glasruta skadar glaset
  if (!F29L.n || !projectiles.length) return updateProjectiles0(dt);
  const pre = projectiles.filter(p => !p.dead); updateProjectiles0(dt);
  for (const p of pre) { if (!p.dead || p.kind === 'pgren' || p.kind === 'barrel') continue; // (granater och fat smäller: explode)
    for (const k of [0, 1]) { const x = p.x + (k ? p.vx * dt : 0), y = p.y + (k ? p.vy * dt : 0), ci = (y | 0) * mw + (x | 0); if (x < 0 || y < 0 || x >= mw || y >= mh) break;
      const g = F29L.cells.get(ci); if (g && !g.open) { f29Hit(ci, p.dmg || 2, 'proj', p.x, p.y); break; } } }
}; }
function f29Tick(dt) { // från v28Tick: tips när spelaren står vid glas eller ett rostigt galler för första gången
  if (!F29L.n || (F29L.hintT -= dt) > 0 || state !== 'play') return; F29L.hintT = 0.5;
  for (const g of F29L.cells.values()) { if (g.open || Math.hypot(g.x + 0.5 - P.x, g.y + 0.5 - P.y) > 2.6) continue;
    if (g.kind === 'rust') firstHint('rust29', 'ROSTIGA GALLER MED KRITKRYSS: SPARKA TRE GÅNGER ELLER SPRÄNG UPP DEM.'); else firstHint('glass29', 'GLASET GÅR SÖNDER AV SKOTT, SPARKAR OCH SMÄLLAR.'); }
}
function f29Api() { // window.__game.f29: tillstånd och krokar för t166–t169
  return { F29, L: () => F29L, cells: () => [...F29L.cells.values()].map(g => ({ x: g.x, y: g.y, kind: g.kind, hp: g.hp, open: !!g.open, ch: map[g.y][g.x] })), hit: (x, y, dmg, how) => f29Hit(y * mw + x, dmg, how || 'shot'),
    labels: () => f29Labels(), flow: () => flow, flowCell: () => flowCell, updateFlow: () => updateFlow(), map: () => map, sd: () => GLR.sd, GLR: () => GLR, CH: { glass: F29_GLASS, open: F29_OPEN, rust: F29_RUST, bent: F29_BENT },
    tex: (x, y) => { const t = v28Ovl(map[y][x], x, y); return t ? { w: t.w, h: t.h, glass: !!t.glass, sum: t.data.reduce((a, c) => (a + (c >>> 24)) | 0, 0), opaque: t.data.reduce((a, c) => a + (c >>> 24 >= 128 ? 1 : 0), 0) } : null; }, covers: () => AI24.cov ? AI24.cov.length : 0 };
}
{ const loadFloor0 = loadFloor; loadFloor = function (depth) { F29.live = true; try { return loadFloor0(depth); } finally { F29.live = false; } }; } // spelets våningar (loadFloor) får glas och rostiga galler
