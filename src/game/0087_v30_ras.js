// ---------- Version 30 (RAS): spruckna väggar och pelare som rasar ----------
// SPRUCKNA VÄGGAR: en del väggrutor har synliga sprickor (biomens väggtextur med sprickor ovanpå) och rasar av en smäll eller tre
// tunga träffar (spark, stridshammare, hacka, slaga, tunga skott (base ≥ 12) som musköt och prickskyttegevär, tunga projektiler, och r30Crack från
// annan kod: slungans tunga kast och stengolemen, SPEL). Raset: damm, stenar, ljud (wall_crumble, annars ett befintligt), ljus och
// skakning; fiender intill rutan (på båda sidor) tar skada av raset. Rutan blir gångbart grus ʶ (eget tecken, egen golvtextur av
// grannrutans golv). Allt som läser kartan följer med av sig självt: kollision, kulor, siktlinje (hasLOS), fiendernas avståndsfält
// (flowCell = -1), kartan, zbuf, WebGL-djupet och VÄRLD: GRAFIKKORT (väggen är ett vanligt väggtecken tills den rasar).
// TECKEN: ʶ grus (inte vägg) och elva platser ʷ ʸ ʹ ʺ ʻ ʼ ʽ ʾ ʿ ˀ ˁ för spruckna väggar (vägg). En plats per väggtecken och våning:
// wallTexFor[plats] = '<väggens textur>_r30' och tex[...] = väggens textur med sprickor (cachas per textur, som FÖNSTER gör).
// PLACERING när banan startar (r30Start, från v28Start efter f29Start): eget slumpflöde RNG(seed:ras30:djup), R30.chance[biom] per
// kandidat, högst R30.max[biom] per våning. En kandidat är en vägg som är en ruta tjock (väggar på de två andra sidorna) med en ruta att
// stå på på var sin sida, båda i samma sammanhängande yta utan lås (f29Labels: låsta dörrar, spakgaller, hemliga väggar, gropar,
// väktarrum, utmaningsrum och arenor spärrar), och omvägen mellan sidorna är minst R30.minDetour steg: alltid en genväg, aldrig en
// väg förbi ett lås. Förslag från GEN (level.ras30 = [{x, y}]) provas först med samma kontroll. Bara spelets våningar (loadFloor,
// F29.live) eller tvingat (R30.force / ?r30=1); egna banor, övning, hubben, bossar, hemliga rum och labyrinter får inget.
// PELARE: rekvisita som är pelare och statyer (R30_PILLARS) och fristående väggpelare (högst 2×2 väggrutor med fri gång runt om) faller
// av en smäll (eller tre tunga träffar) bort från smällen, 2,6 rutor eller till närmaste vägg. En fiende i fallets väg tar stor skada
// (spelaren lite). Damm och grus blir kvar (gruset i pelarens rutor och grusgolv längs fallet).
// R30.on = false eller ?r30=0: inga nya spruckna väggar och inga pelare som faller (befintliga tecken beter sig som vanliga väggar).
const R30 = { on: true, force: null, pillars: true, wallPillars: true, hp: 3, minDetour: 10, gap: 2, wallDmg: 45, pillarDmg: 110, pillarPlayerDmg: 12, pillarLen: 2.6, fallT: 0.45,
  chance: { ruins: 0.6, dungeon: 0.2, caves: 0.2, graveyard: 0.25, forest: 0.12, courtyard: 0.25, swamp: 0.12, frost: 0.18, volcano: 0.2, tomb: 0.25, crystal: 0.15, sunken: 0.22,
    clock: 0.15, sky: 0.12, fungus: 0.15, mirror: 0.12, library: 0.15, foundry: 0.18, cathedral: 0.22, hive: 0.1, garden: 0.15, dream: 0.15, ship: 0.08, lab: 0.12, circus: 0.12,
    jungle: 0.2, mine: 0.25, observatory: 0.15, sewer: 0.22, desert: 0.22, prison: 0.18, harbor: 0.15, bathhouse: 0.18, purgatory: 0.18, abattoir: 0.15, battlefield: 0.3, glassworks: 0.15 },
  def: 0.15, max: { ruins: 12, battlefield: 6 }, defMax: 4, log: [] };
const R30_RUB = 'ʶ', R30_SLOTS = ['ʷ', 'ʸ', 'ʹ', 'ʺ', 'ʻ', 'ʼ', 'ʽ', 'ʾ', 'ʿ', 'ˀ', 'ˁ'];
const R30_PILLARS = { u: 'STATYN', 'ƨ': 'STATYN', 'ɳ': 'BENPELAREN', 'ɦ': 'STATYN', 'ŧ': 'SPEGELSTATYN', 'ʢ': 'PELAREN', 'ʤ': 'STATYN' }; // u staty, ƨ staty, ɳ benpelare, ɦ badhusets staty, ŧ spegelstaty, ʢ raserad pelare och ʤ huvudlös staty (SPEL)
const R30_NOTEX = /forest|hedge|tent|rigging|cage|jars|bookshelf|libpanel|glass|mirror|crystal|flesh|honeycomb|wax|mycel|mushroom|dream|pipes|gear|cellbars|palisade|wall_jungle$|shack|hull|banner|coral|swamp|starchart|ironplate|brass|furnace|coldroom|cloud|storm|_r30/; // väggar som inte spricker som sten (trä, tyg, växter, glas, metall, kött)
const R30_NOBASE = new Set(['{', '*', '9', 'Ɉ', 'ȑ', 'ƣ', 'š', 'Ţ', '#', '%', '~', '&', '=', 'ǂ', R30_RUB, ...R30_SLOTS]); // väggar med eget beteende (hemliga, husfönster, galler, malmåder, skiftande, speglar, bossväggar)
const R30T = new Map(), R30F = new Map(), R30MINE = new WeakSet(); // väggens textur → textur med sprickor; golvets textur → grusgolv
let R30L = { cells: new Map(), slotOf: {}, baseOf: {}, nSlot: 0, placed: 0, fallen: 0, pillars: 0, falls: [], rubIdx: new Map(), hintT: 0, dirty: false, sugg: 0, log: [], pOn: false, lab: null };
IWC[R30_RUB] = false;
R30_SLOTS.forEach((c, i) => { IWC[c] = true; wallTexFor[c] = 'wall_r30_' + i; }); // (texturen sätts per våning i r30Slot)

// ---- texturer ----
function r30H(n) { return ((Math.imul(n | 0, 2654435761) >>> 8) & 65535) / 65536; }
function r30Px(p, k) { const r = Math.min(255, (p & 255) * k) | 0, g = Math.min(255, ((p >> 8) & 255) * k) | 0, b = Math.min(255, ((p >> 16) & 255) * k) | 0; return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0; }
function r30CrackTex(base) { // väggens textur med sprickor: en stor sicksackspricka uppifrån och ned, grenar, losslagna stenar och damm vid foten
  let t = R30T.get(base); if (t) return t;
  const w = base.w, h = base.h, d = new Uint32Array(w * h), u = Math.max(1, w / 64), seed = (w * 31 + h * 17 + (base.data[(h >> 1) * w + (w >> 1)] & 0xffff)) | 0, dark = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = (base.data[i] | 0xff000000) >>> 0;
  const plot = (x, y, r) => { for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) { if (ox * ox + oy * oy > r * r + r) continue; const xx = Math.round(x + ox), yy = Math.round(y + oy); if (xx >= 0 && yy >= 0 && xx < w && yy < h) dark[yy * w + xx] = 1; } };
  const crack = (x, y, tx, ty, wid, k, depth) => { // sicksack mot (tx, ty), bredden avtar, grenar åt sidan
    const n = Math.max(4, Math.round(Math.hypot(tx - x, ty - y) / (3 * u))); let px = x, py = y;
    for (let i = 1; i <= n; i++) { const f = i / n, j = (r30H(seed + k * 131 + i * 17) - 0.5) * 7 * u * (1 - f * 0.5), nx = x + (tx - x) * f + j * 0.8, ny = y + (ty - y) * f + j * 0.3, steps = Math.ceil(Math.hypot(nx - px, ny - py));
      for (let q = 0; q <= steps; q++) plot(px + (nx - px) * q / steps, py + (ny - py) * q / steps, Math.max(0, Math.round(wid * (1 - f * 0.7) - 0.5)));
      if (depth < 2 && r30H(seed + k * 37 + i * 11) < 0.22) { const a = (r30H(seed + k + i * 3) < 0.5 ? -1 : 1) * (0.6 + 0.7 * r30H(seed + i * 7 + k)) + Math.atan2(ty - y, tx - x), L = (10 + 18 * r30H(seed + i * 5 + k * 3)) * u * (depth ? 0.6 : 1);
        crack(nx, ny, nx + Math.cos(a) * L, ny + Math.sin(a) * L, Math.max(0.5, wid * 0.55), k * 7 + i, depth + 1); }
      px = nx; py = ny; } };
  const x0 = w * (0.35 + 0.3 * r30H(seed + 1)), x1 = w * (0.3 + 0.4 * r30H(seed + 2)), xm = w * (0.25 + 0.5 * r30H(seed + 3));
  crack(x0, h * 0.02, xm, h * 0.5, 1.5 * u, 1, 0); crack(xm, h * 0.5, x1, h * 0.97, 1.3 * u, 2, 0); // den stora sprickan
  crack(xm, h * 0.5, xm + (r30H(seed + 4) < 0.5 ? -1 : 1) * w * 0.45, h * (0.55 + 0.2 * r30H(seed + 5)), 1 * u, 3, 1); // en gren åt sidan
  for (let k = 0; k < 3; k++) { const cx = (w * (0.15 + 0.7 * r30H(seed + k * 41)) - 0.5) | 0, cy = (h * (0.12 + 0.76 * r30H(seed + k * 43))) | 0, rx = Math.max(2, (w * (0.05 + 0.04 * r30H(seed + k * 47))) | 0), ry = Math.max(2, (rx * (0.6 + 0.5 * r30H(seed + k * 53))) | 0); // losslagna stenar: hål med skuggad kant
    for (let y = -ry - 1; y <= ry + 1; y++) for (let x = -rx - 1; x <= rx + 1; x++) { const xx = cx + x, yy = cy + y; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const q = Math.max(Math.abs(x) / rx, Math.abs(y) / ry), i = yy * w + xx;
      if (q < 0.8) d[i] = r30Px(d[i], 0.42 + 0.12 * (y / ry) + 0.08 * r30H(i)); else if (q < 1.1) d[i] = r30Px(d[i], y < 0 || x < 0 ? 0.55 : 1.25); } }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!dark[i]) continue; d[i] = r30Px(d[i], 0.12 + 0.1 * r30H(i));
    if (x + 1 < w && !dark[i + 1]) d[i + 1] = r30Px(base.data[i + 1] | 0xff000000, 1.4); // ljus kant
    if (x > 0 && !dark[i - 1]) d[i - 1] = r30Px(base.data[i - 1] | 0xff000000, 0.6); } // skuggsida
  for (let y = (h * 0.84) | 0; y < h; y++) { const k = (y - h * 0.84) / (h * 0.16); for (let x = 0; x < w; x++) { const i = y * w + x; if (r30H(i * 3 + seed) < 0.25 + 0.45 * k) d[i] = r30Px(d[i], 1.12 + 0.2 * k); } } // damm vid foten
  t = { w, h, data: d }; R30MINE.add(t); R30T.set(base, t); return t; // (samma form som de laddade texturerna { w, h, data }: golv- och väggslingan förblir snabba)
}
function r30RubTex(base) { // grusgolv: golvets textur mörkare, med stenar (ljus överkant, skugga nedtill) och mörka glipor
  let t = R30F.get(base); if (t) return t;
  const w = base.w, h = base.h, d = new Uint32Array(w * h), seed = (base.data[(h >> 2) * w + (w >> 2)] & 0xffff) | 0;
  for (let i = 0; i < w * h; i++) d[i] = r30Px(base.data[i] | 0xff000000, 0.62);
  const n = 22; for (let k = 0; k < n; k++) { const cx = w * r30H(seed + k * 17), cy = h * r30H(seed + k * 19), rx = w * (0.04 + 0.06 * r30H(seed + k * 23)), ry = rx * (0.55 + 0.4 * r30H(seed + k * 29)), tone = 0.8 + 0.5 * r30H(seed + k * 31);
    const g = (90 + 50 * r30H(seed + k * 37)) * tone, col = [g * 1.05, g, g * 0.88];
    for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++) for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) { const xx = ((x % w) + w) % w, yy = ((y % h) + h) % h, q = Math.hypot((x - cx) / rx, (y - cy) / ry), i = yy * w + xx;
      if (q < 1) { const sh = 1.15 - 0.55 * Math.max(0, (y - cy) / ry) + 0.25 * Math.max(0, (cy - y) / ry) * (x < cx ? 1 : 0.6); d[i] = (0xff000000 | (Math.min(255, col[2] * sh) << 16) | (Math.min(255, col[1] * sh) << 8) | Math.min(255, col[0] * sh)) >>> 0; }
      else if (q < 1.25 && y > cy) d[i] = r30Px(d[i], 0.55); } } // skugga under stenen
  t = { w, h, data: d }; R30MINE.add(t); R30F.set(base, t); return t;
}
function r30RubIdx(fi) { // golvindex för grus av golvet fi (en gång per golv och våning), eller fi när listan är full
  let j = R30L.rubIdx.get(fi); if (j !== undefined) return j; if (R30MINE.has(floorTexs[fi])) return fi; // (redan grus)
  const b = floorTexs[fi] || floorTexs[0]; if (!b || !b.data || floorTexs.length >= 250) return fi;
  j = floorTexs.length; floorTexs.push(r30RubTex(b)); R30L.rubIdx.set(fi, j); return j;
}

// ---- väggens tecken och plats ----
function r30BaseOk(c) { // ett vanligt väggtecken som kan få sprickor
  if (!c || R30_NOBASE.has(c) || !isWallChar(c) || V28TR[c] || F29_CH[c]) return false;
  const n = wallTexFor[c], t = n && tex[n]; return !!(t && t.data && t.w > 0) && !/_boss_|boss/.test(n) && !R30_NOTEX.test(n);
}
function r30Slot(c) { // platsen (tecknet) för spruckna väggar av väggtecknet c, eller null när platserna är slut
  let s = R30L.slotOf[c]; if (s) return s; if (R30L.nSlot >= R30_SLOTS.length) return null;
  s = R30_SLOTS[R30L.nSlot++]; R30L.slotOf[c] = s; R30L.baseOf[s] = c;
  const name = wallTexFor[c] + '_r30'; wallTexFor[s] = name; tex[name] = r30CrackTex(tex[wallTexFor[c]]);
  WP_TEXMAT[s] = wpTexMat(c); // nedslagen efter väggens material
  return s;
}
function r30Mark(x, y) { // gör väggen (x, y) sprucken (placeringen, GEN:s förslag, testerna); sant om det gick
  if (!map || x < 1 || y < 1 || x >= mw - 1 || y >= mh - 1) return false; const c = map[y][x]; if (!r30BaseOk(c)) return false;
  const s = r30Slot(c); if (!s) return false; map[y][x] = s; R30L.cells.set(y * mw + x, { x, y, base: c, hp: R30.hp, done: false }); return true;
}

// ---- placering när banan startar ----
function r30Want() { const p = params.get('r30'); if (p === '0' || !R30.on) return false; return !!(F29.live || R30.force || (p && p !== '0')); }
function r30Cand(x, y, lab, blocked) { // kandidat: en ruta tjock vägg mellan två rutor i samma yta utan lås; returnerar sidorna eller null
  if (x < 2 || y < 2 || x >= mw - 2 || y >= mh - 2 || blocked.has(y * mw + x) || !r30BaseOk(map[y][x])) return null;
  const s = f29Sides(x, y); if (!s) return null;
  const vert = s[0][0] === x, wall = (a, b) => isWallChar(map[b][a]); // (vert: sidorna ovanför och nedanför)
  if (vert ? !(wall(x - 1, y) && wall(x + 1, y)) : !(wall(x, y - 1) && wall(x, y + 1))) return null; // väggar på de två andra sidorna: inget läckage åt sidan
  const a = lab[s[0][1] * mw + s[0][0]], b = lab[s[1][1] * mw + s[1][0]]; if (a < 0 || a !== b) return null;
  for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) { const q = map[yy][xx]; if (isDoorChar(q) || V28TR[q] || F29_CH[q] || q === '{') return null; } // inte intill dörrar, galler, fönster och hemliga väggar
  return s;
}
function r30Detour(s, lab, cap) { // kortaste vägen mellan sidorna inom ytan (steg), eller cap om den är längre
  const id = lab[s[0][1] * mw + s[0][0]], goal = s[1][1] * mw + s[1][0], N = mw * mh, dist = r30Detour.d && r30Detour.d.length === N ? r30Detour.d : (r30Detour.d = new Int32Array(N));
  dist.fill(-1); const q = r30Detour.q && r30Detour.q.length === N ? r30Detour.q : (r30Detour.q = new Int32Array(N)); let h = 0, t = 0; const st = s[0][1] * mw + s[0][0]; q[t++] = st; dist[st] = 0;
  while (h < t) { const c = q[h++], dc = dist[c]; if (c === goal) return dc; if (dc >= cap) return cap; const x = c % mw;
    for (const n of [x > 0 ? c - 1 : -1, x < mw - 1 ? c + 1 : -1, c - mw, c + mw]) if (n >= 0 && n < N && dist[n] < 0 && lab[n] === id) { dist[n] = dc + 1; q[t++] = n; } }
  return cap;
}
function r30Place() {
  const rng = RNG(RNG.hash(run.seed + ':ras30:' + run.depth)), bio = lvl.biome, p = R30.chance[bio] !== undefined ? R30.chance[bio] : R30.def, max = R30.max[bio] !== undefined ? R30.max[bio] : R30.defMax;
  const lab = f29Labels(), blocked = new Set(), near = [];
  for (const a of Array.isArray(lvl.ambushes) ? lvl.ambushes : []) for (const c of (a && a.cells) || []) if (c) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) blocked.add((c.y + dy) * mw + c.x + dx); // bakhållens nischer (version 24)
  const farEnough = (x, y) => near.every(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - y)) > R30.gap);
  const put = (x, y, det) => { if (!r30Mark(x, y)) return false; R30L.cells.get(y * mw + x).det = det; near.push([x, y]); R30L.placed++; return true; };
  for (const o of Array.isArray(lvl.ras30) ? lvl.ras30 : []) { // GEN:s förslag: samma kontroll, ingen tärning, kortare omväg räcker
    if (R30L.placed >= max) break; if (!o || !Number.isInteger(o.x) || !Number.isInteger(o.y)) continue;
    const s = r30Cand(o.x, o.y, lab, blocked), det = s ? r30Detour(s, lab, 999) : 0; if (s && farEnough(o.x, o.y) && det >= 4 && put(o.x, o.y, det)) R30L.sugg++; }
  const pass = []; // en tärning per kandidat i radordning, sedan blandade med samma slumpflöde (inte alla i de översta raderna när taket nås): samma frö ger samma bana
  for (let y = 2; y < mh - 2; y++) for (let x = 2; x < mw - 2; x++) { if (!r30BaseOk(map[y][x])) continue; const s = r30Cand(x, y, lab, blocked); if (s && rng.next() < p) pass.push([x, y, s]); }
  for (let i = pass.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)), t = pass[i]; pass[i] = pass[j]; pass[j] = t; }
  for (const [x, y, s] of pass) { if (R30L.placed >= max) break; if (!farEnough(x, y)) continue; const det = r30Detour(s, lab, 999); if (det < R30.minDetour) continue; put(x, y, det); }
}
function r30Start() { // från v28Start (efter f29Start): texturerna nollställs per våning, placering, rutornas tillstånd
  R30L = { cells: new Map(), slotOf: {}, baseOf: {}, nSlot: 0, placed: 0, fallen: 0, pillars: 0, falls: [], rubIdx: new Map(), hintT: 0, dirty: false, sugg: 0, log: [], pOn: false, lab: null };
  const fb = tex[wallTexFor[1]] || tex.wall_stone; R30_SLOTS.forEach((c, i) => { wallTexFor[c] = 'wall_r30_' + i; if (!tex[wallTexFor[c]]) tex[wallTexFor[c]] = fb; }); // (ingen plats utan textur)
  if (!map) return;
  { const p = params.get('r30'), forced = !!R30.force || !!(p && p !== '0'); R30L.pOn = !!(R30.on && p !== '0' && lvl && !lvl.hub && (forced || (F29.live && run && !run.practice && !run.practiceT))); } // pelare faller bara på spelets våningar (och tvingat): egna banor, övningen och de äldre testerna som förut
  if (r30Want() && run && lvl && !run.custom && !run.practice && !run.practiceT && !lvl.hub && !lvl.arena && !boss && !lvl.secret && !lvl.maze) try { r30Place(); } catch (e) { R30L.log.push('placering: ' + e.message); }
  if (window.__game && !window.__game.r30) window.__game.r30 = r30Api();
}

// ---- träffar och ras ----
function r30Hit(g, how, sx, sy) { // how: 'boom' rasar direkt; 'heavy' en tung träff av R30.hp
  if (!g || g.done || !R30.on) return false;
  if (how === 'boom') g.hp = 0; else g.hp -= 1;
  const cx = g.x + 0.5, cy = g.y + 0.5;
  if (g.hp <= 0) { r30Collapse(g, how, sx, sy); return true; }
  play(snd.wall_crumble ? 'wall_crumble' : 'crumble', 0.45, rnd(1.2, 1.45), { x: cx, y: cy }); r30Dust(cx, cy, 0.6, settings.lowfx ? 2 : 5, false);
  spawnText(cx, cy, g.hp === 1 ? 'VÄGGEN GER EFTER' : 'VÄGGEN KNAKAR', '#c8b090'); P.shake = Math.max(P.shake, 0.25);
  return true;
}
function r30Collapse(g, how, sx, sy) { // väggen rasar: grus, damm, stenar, ljus och skakning; fiender intill tar skada
  if (g.done) return; g.done = true; g.how = how;
  const x = g.x, y = g.y, ci = y * mw + x, cx = x + 0.5, cy = y + 0.5;
  map[y][x] = R30_RUB; flowCell = -1; for (let f = 0; f < 4; f++) wallMarks.delete(ci * 4 + f);
  r30Ground(x, y, true); f29Relight(x, y); R30L.dirty = true; R30L.lab = null; R30L.fallen++;
  play(snd.wall_crumble ? 'wall_crumble' : 'bigboom', 0.9, snd.wall_crumble ? rnd(0.9, 1.1) : 0.6, { x: cx, y: cy }); if (!snd.wall_crumble) play('crumble', 0.8, 0.8, { x: cx, y: cy });
  r30Dust(cx, cy, 1, settings.lowfx ? 5 : 14, true); r30Rocks(cx, cy, settings.lowfx ? 4 : 10);
  flashes.push({ x: cx, y: cy, t: 0.18, r: 2.5, col: [255, 220, 170] });
  const dp = Math.hypot(P.x - cx, P.y - cy); if (dp < 9) P.shake = Math.max(P.shake, 0.9 * (1 - dp / 9));
  const hit = ents.filter(e => !e.dead && !e.dormant && Math.hypot(e.x - cx, e.y - cy) < 1.6); // (lista först: en fiende som dör kan smälla och rasa fler)
  for (const e of hit) if (!e.dead) hurtEnemy(e, R30.wallDmg * (e.boss ? 0.4 : 1), e.x, e.y, { noProc: true });
  stat('walls30'); R30L.log.push('vägg:' + how + '@' + x + ',' + y);
}
function r30Ground(x, y, wall) { // golvet i rutan blir grus (golvet från grannrutan), himmel och ljus från grannen
  const ci = y * mw + x; let fi = -1, sk = -1;
  for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + ax, yy = y + ay; if (xx < 0 || yy < 0 || xx >= mw || yy >= mh || isWallChar(map[yy][xx])) continue; const j = yy * mw + xx; if (fi < 0) { fi = cellFloor ? cellFloor[j] : 0; sk = cellSky ? cellSky[j] : 0; } }
  if (cellFloor) cellFloor[ci] = r30RubIdx(wall ? Math.max(0, fi) : cellFloor[ci]); // (pelaren: golvet under den)
  if (wall && cellSky && sk >= 0) cellSky[ci] = sk;
  if (typeof L29 === 'object' && L29) L29.maskOf = null; // ljusets karta (himmel per ruta) räknas om
}
function r30Dust(x, y, k, n, big) { // dammoln (rök i dammfärg) och dammkorn (partikelbudgeten gäller)
  const f = fx.parts.smoke || fx.hit, m = fx.parts.dust || f; if (!f) return;
  for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(0.2, big ? 1.2 : 0.5) * k, cloud = i % 3 !== 2;
    if (!wpPart(cloud ? { x: x + rnd(-0.4, 0.4), y: y + rnd(-0.4, 0.4), z: rnd(0.05, big ? 0.8 : 0.5), vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rnd(0.05, 0.35), life: rnd(1, big ? 2.2 : 1.3), frames: f, img: f[0], size: rnd(0.1, big ? 0.2 : 0.13), tint: [200, 185, 160], fade: true }
      : { x: x + rnd(-0.4, 0.4), y: y + rnd(-0.4, 0.4), z: rnd(0.2, 0.9), vx: Math.cos(a) * s * 0.5, vy: Math.sin(a) * s * 0.5, vz: rnd(-0.1, 0.2), life: rnd(1.2, 2), img: m[0], size: rnd(0.03, 0.05), tint: [210, 195, 170], fade: true }, big && i < 4)) break; }
}
function r30Rocks(x, y, n) { // stenar som faller och studsar, och grus på golvet
  const f = fx.parts.rock || (fx.shards ? fx.shards.slice(6, 12) : null); if (!f || !f.length) return;
  for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(0.4, 1.8);
    if (!wpPart({ x: x + rnd(-0.35, 0.35), y: y + rnd(-0.35, 0.35), z: rnd(0.3, 0.95), vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rnd(0, 1.2), life: rnd(0.8, 1.4), img: f[i % f.length], size: rnd(0.05, 0.11), grav: true, bounce: true }, i < 3)) break; }
  if (!settings.lowfx) { for (let i = 0; i < 4; i++) decals.push({ x: x + rnd(-0.45, 0.45), y: y + rnd(-0.45, 0.45), img: f[i % f.length], size: rnd(0.04, 0.07), flip: Math.random() < 0.5 }); while (decals.length > 70) decals.shift(); }
}

// ---- pelare ----
function r30Pillar(pr, sx, sy, how) { // en pelare träffas: smällen fäller den, tunga träffar efter R30.hp
  if (!pr || pr.broken || pr.r30fall || !R30.on || !R30.pillars || !R30L.pOn) return false;
  if (how !== 'boom') { pr.r30hp = (pr.r30hp === undefined ? R30.hp : pr.r30hp) - 1; if (pr.r30hp > 0) { play('crumble', 0.4, 1.4, { x: pr.x, y: pr.y }); r30Dust(pr.x, pr.y, 0.5, 3, false); return true; } }
  let dx = pr.x - sx, dy = pr.y - sy, d = Math.hypot(dx, dy); if (d < 0.05) { const a = r30H(pr.cx * 31 + pr.cy * 17) * TAU; dx = Math.cos(a); dy = Math.sin(a); d = 1; }
  pr.r30fall = true; pr.broken = true; map[pr.cy][pr.cx] = R30_RUB; flowCell = -1; r30Ground(pr.cx, pr.cy, false); R30L.dirty = true; R30L.lab = null;
  r30Fall(pr.x, pr.y, dx / d, dy / d, R30_PILLARS[pr.ch] || 'PELAREN', [[pr.cx, pr.cy]], pr.img, pr.size);
  return true;
}
function r30Fall(x, y, dx, dy, name, cells, img, size) { // fallet: framkanten går längs riktningen (r30Tick), skadar en gång per fiende; bilden tippar (r30FallImg)
  let len = R30.pillarLen; const h = cast(x, y, dx, dy, R30.pillarLen + 1); if (h && h.dist < len + 0.35) len = Math.max(0.6, h.dist - 0.35); // till väggen
  const o = { x, y, dx, dy, len, t: 0, hit: new Set(), pl: false, name, cells, f: 0, fr: img && img.data ? r30FallFrames(img) : null, p: null }; R30L.falls.push(o); R30L.pillars++;
  if (o.fr) { o.p = { x, y, z: 0, vx: 0, vy: 0, vz: 0, life: 9, maxLife: 9, img, size: size || 1 }; if (!wpPart(o.p, true)) o.p = null; } // (en partikel som byter bild medan den faller)
  play(snd.pillar_fall ? 'pillar_fall' : 'crumble', 0.9, snd.pillar_fall ? 1 : 0.6, { x, y }); r30Dust(x, y, 0.8, settings.lowfx ? 4 : 10, true);
  spawnText(x, y, name + ' FALLER', '#e0c090'); firstHint('pillar30', 'PELARE OCH STATYER FALLER AV SMÄLLAR – STÅ INTE I VÄGEN.');
}
function r30FallTick(o, dt) {
  o.t += dt; const k = Math.min(1, o.t / R30.fallT), fr = o.len * k * k; // accelererar
  for (const e of ents) { if (e.dead || e.dormant || o.hit.has(e)) continue; const px = e.x - o.x, py = e.y - o.y, along = px * o.dx + py * o.dy; if (along < 0.2 || along > fr + 0.3) continue;
    if (Math.abs(px * o.dy - py * o.dx) < 0.55 + (e.d && e.d.size ? Math.min(0.4, e.d.size * 0.15) : 0.1)) { o.hit.add(e); hurtEnemy(e, R30.pillarDmg * (e.boss ? 0.35 : 1), e.x, e.y, { noProc: true }); } }
  if (!o.pl && R30.pillarPlayerDmg > 0) { const px = P.x - o.x, py = P.y - o.y, along = px * o.dx + py * o.dy; if (along > 0.3 && along < fr + 0.2 && Math.abs(px * o.dy - py * o.dx) < 0.45) { o.pl = true; hurtPlayer(R30.pillarPlayerDmg, o.x, o.y, 'melee'); } }
  if ((o.f += dt) > 0.06) { o.f = 0; r30Dust(o.x + o.dx * fr, o.y + o.dy * fr, 0.5, settings.lowfx ? 1 : 3, false); }
  if (o.p) r30FallImg(o, k);
  if (k < 1) return false;
  if (o.p) { o.p.life = 0; o.p = null; }
  const ex = o.x + o.dx * o.len, ey = o.y + o.dy * o.len; // nedslaget: damm, stenar, grus längs fallet
  play(snd.pillar_fall ? 'pillar_fall' : 'bigboom', 0.8, snd.pillar_fall ? 0.85 : 0.5, { x: ex, y: ey }); r30Dust(ex, ey, 1, settings.lowfx ? 4 : 12, true); r30Rocks(ex, ey, settings.lowfx ? 3 : 8);
  const dp = Math.hypot(P.x - ex, P.y - ey); if (dp < 10) P.shake = Math.max(P.shake, 1.1 * (1 - dp / 10));
  for (let s = 0.5; s <= o.len + 0.01; s += 0.5) { const cx = (o.x + o.dx * s) | 0, cy = (o.y + o.dy * s) | 0; if (cx < 0 || cy < 0 || cx >= mw || cy >= mh) break; const c = map[cy][cx];
    if ((c === '.' || c === R30_RUB) && cellFloor && !(o.cells.some(q => q[0] === cx && q[1] === cy))) cellFloor[cy * mw + cx] = r30RubIdx(cellFloor[cy * mw + cx]); } // (grus ovanpå golvet; faror och vatten lämnas)
  stat('pillars30'); R30L.log.push('pelare@' + (o.x | 0) + ',' + (o.y | 0)); return true;
}
const R30FR = new Map(); // bild → bilder för fallet: L (tippar åt vänster), R (åt höger), D (bort från eller mot kameran: kortare)
function r30FallFrames(img) { // 8 vinklar 0–90° runt foten (mitten nedtill), speglade, och 6 hopsjunkna; cachas per bild
  let f = R30FR.get(img); if (f) return f;
  const w0 = img.w, h0 = img.h, Wc = Math.max(w0, 2 * h0), L = [], R = [], D = [];
  for (let k = 0; k < 8; k++) { const th = (k + 1) / 8 * Math.PI / 2, c = Math.cos(th), sn = Math.sin(th), a = new Uint32Array(Wc * h0), b = new Uint32Array(Wc * h0);
    for (let y = 0; y < h0; y++) for (let x = 0; x < Wc; x++) { const X = x + 0.5 - Wc / 2, Y = h0 - (y + 0.5), sx = X * c + Y * sn, sy = -X * sn + Y * c, u = Math.floor(sx + w0 / 2), v = Math.floor(h0 - sy);
      if (u < 0 || v < 0 || u >= w0 || v >= h0) continue; const p = img.data[v * w0 + u]; if (p >>> 24 < 100) continue; a[y * Wc + x] = p; b[y * Wc + (Wc - 1 - x)] = p; }
    L.push({ w: Wc, h: h0, data: a }); R.push({ w: Wc, h: h0, data: b }); }
  for (let k = 0; k < 6; k++) { const q = Math.cos((k + 1) / 7 * Math.PI / 2), a = new Uint32Array(w0 * h0); // höjden krymper mot foten
    for (let y = 0; y < h0; y++) { const v = Math.floor(h0 - (h0 - y - 0.5) / Math.max(0.08, q)); if (v < 0 || v >= h0) continue; for (let x = 0; x < w0; x++) a[y * w0 + x] = img.data[v * w0 + x]; }
    D.push({ w: w0, h: h0, data: a }); }
  f = { L, R, D }; R30FR.set(img, f); if (R30FR.size > 24) R30FR.delete(R30FR.keys().next().value); return f;
}
function r30FallImg(o, k) { // bilden för fallet just nu: vinkeln på skärmen efter riktningen mot kameran
  const th = k * k * Math.PI / 2, pl = Math.hypot(view.plX, view.plY) || 1, lat = (o.dx * view.plX + o.dy * view.plY) / pl, sn = Math.sin(th), c = Math.cos(th);
  if (Math.abs(lat) < 0.35) { const i = Math.min(5, Math.floor((1 - c) * 6)); o.p.img = th < 0.05 ? o.p.img : o.fr.D[i]; return; }
  const phi = Math.atan2(sn * Math.abs(lat), c), i = Math.max(0, Math.min(7, Math.round(phi / (Math.PI / 2) * 8) - 1)); if (phi < 0.1) return;
  o.p.img = (lat < 0 ? o.fr.L : o.fr.R)[i];
}
function r30WallPillar(x, y) { // fristående väggpelare (högst 2×2 rutor, fri gång runt om) som rutan (x, y) hör till, eller null
  if (!R30.wallPillars || !r30BaseOk(map[y][x]) && !R30L.baseOf[map[y][x]]) return null;
  const cells = [], seen = new Set([y * mw + x]), q = [[x, y]];
  while (q.length) { const [a, b] = q.pop(); cells.push([a, b]); if (cells.length > 4) return null;
    for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = a + ax, yy = b + ay; if (xx < 1 || yy < 1 || xx >= mw - 1 || yy >= mh - 1) return null; const k = yy * mw + xx; if (seen.has(k)) continue; if (isWallChar(map[yy][xx])) { seen.add(k); q.push([xx, yy]); } } }
  const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (x1 - x0 > 1 || y1 - y0 > 1 || cells.length !== (x1 - x0 + 1) * (y1 - y0 + 1)) return null;
  const lab = R30L.lab || (R30L.lab = f29Labels()); let id = -2; // fri ring runt om: inga väggar, dörrar, gropar eller annat som blockerar (solid), och hela ringen i samma yta utan lås
  for (let yy = y0 - 1; yy <= y1 + 1; yy++) for (let xx = x0 - 1; xx <= x1 + 1; xx++) { if (xx >= x0 && xx <= x1 && yy >= y0 && yy <= y1) continue; const c = map[yy][xx], l = lab[yy * mw + xx];
    if (isWallChar(c) || isDoorChar(c) || solid(xx + 0.5, yy + 0.5) || l < 0 || (id !== -2 && l !== id)) return null; id = l; }
  for (const [a, b] of cells) if (!r30BaseOk(map[b][a])) return null;
  return { cells, x: (x0 + x1 + 1) / 2, y: (y0 + y1 + 1) / 2 };
}
function r30TopWall(wp, sx, sy) { // väggpelaren faller: rutorna blir grus
  let dx = wp.x - sx, dy = wp.y - sy, d = Math.hypot(dx, dy); if (d < 0.05) { dx = 1; dy = 0; d = 1; }
  wp.ch0 = map[wp.cells[0][1]][wp.cells[0][0]];
  for (const [a, b] of wp.cells) { const ci = b * mw + a; map[b][a] = R30_RUB; for (let f = 0; f < 4; f++) wallMarks.delete(ci * 4 + f); r30Ground(a, b, true); f29Relight(a, b); }
  flowCell = -1; R30L.dirty = true; R30L.lab = null;
  const sx2 = wp.x + dx / d * (wp.cells.length > 1 ? 0.7 : 0.4), sy2 = wp.y + dy / d * (wp.cells.length > 1 ? 0.7 : 0.4);
  const wt = tex[wallTexFor[R30L.baseOf[wp.ch0] || wp.ch0] || ''] || null;
  r30Fall(sx2, sy2, dx / d, dy / d, 'PELAREN', wp.cells, wt, wp.cells.length > 1 ? 1.05 : 0.95);
}

// ---- krokar: smällar (explode), skott (fire), närstrid och sparkar, projektiler, och r30Crack för annan kod ----
function r30Boom(x, y, r) { // från explode: spruckna väggar inom räckhåll rasar, pelare faller bort från smällen
  if (!R30.on || !map) return;
  if (R30L.cells.size) { const list = []; for (const g of R30L.cells.values()) if (!g.done && Math.hypot(g.x + 0.5 - x, g.y + 0.5 - y) < r + 0.9) list.push(g); for (const g of list) r30Hit(g, 'boom', x, y); }
  if (!R30.pillars || !R30L.pOn || r < 0.9) return;
  const pl = props.filter(pr => R30_PILLARS[pr.ch] && !pr.broken && !pr.r30fall && Math.hypot(pr.x - x, pr.y - y) < r + 0.6 && boomSees(x, y, pr.x, pr.y));
  for (const pr of pl) r30Pillar(pr, x, y, 'boom');
  if (R30.wallPillars && r >= 1.2 && !boss) for (let cy = Math.max(1, (y - r - 1) | 0); cy <= Math.min(mh - 2, (y + r + 1) | 0); cy++) for (let cx = Math.max(1, (x - r - 1) | 0); cx <= Math.min(mw - 2, (x + r + 1) | 0); cx++) {
    if (!isWallChar(map[cy][cx]) || Math.hypot(cx + 0.5 - x, cy + 0.5 - y) > r + 0.6) continue; const wp = r30WallPillar(cx, cy); if (wp) r30TopWall(wp, x, y); }
}
function r30Shot(wall, base, p) { // från fire(): tunga skott (musköt, prickskyttegevär och liknande) räknas som en tung träff
  if (p !== 0 || !R30L.cells.size || wall.mx === undefined || !(base >= 12)) return; r30Hit(R30L.cells.get(wall.my * mw + wall.mx), 'heavy', P.x, P.y); // (prickskyttegevär 14, musköt 24 och liknande)
}
function r30Melee(x, y, r, kicking) { // från breakProps (sparken) och de tunga närstridsvapnen: rutan framför spelaren; sant om något träffades
  if (!R30.on || (!R30L.cells.size && !R30L.pOn)) return false; let hit = false; const reach = Math.min(0.45, r * 0.6);
  for (const g of [...R30L.cells.values()]) { if (g.done) continue; const dx = Math.max(g.x - x, 0, x - g.x - 1), dy = Math.max(g.y - y, 0, y - g.y - 1); if (Math.hypot(dx, dy) < reach && r30Hit(g, 'heavy', P.x, P.y)) hit = true; }
  if (R30.pillars && R30L.pOn) for (const pr of props) if (R30_PILLARS[pr.ch] && !pr.broken && !pr.r30fall && Math.hypot(pr.x - x, pr.y - y) < r + 0.3) { if (r30Pillar(pr, P.x, P.y, 'heavy')) hit = true; } // (statyn u: sparken ger guld som förut och räknas också som en av tre tunga träffar)
  return hit;
}
function r30Crack(x, y, dmg, how) { // för annan kod (slungans tunga kast, stengolemen): en tung träff på rutan (x, y) (världs- eller rutkoordinater); how 'boom' rasar direkt. Sant om en sprucken vägg eller pelare träffades
  if (!R30.on || !map) return false; const cx = Math.floor(x), cy = Math.floor(y); if (cx < 0 || cy < 0 || cx >= mw || cy >= mh) return false;
  const h = how === 'boom' || dmg >= 999 ? 'boom' : 'heavy', g = R30L.cells.get(cy * mw + cx);
  if (g && !g.done) return r30Hit(g, h, x + (P.x > x ? 0.5 : -0.5), y);
  const pr = props.find(o => o.cx === cx && o.cy === cy && R30_PILLARS[o.ch] && !o.broken); if (pr) return r30Pillar(pr, P.x, P.y, h);
  return false;
}
{ const updateProjectiles0 = updateProjectiles; updateProjectiles = function (dt) { // spelarens tunga projektiler (p.r30 eller dmg ≥ 20) som dör i en sprucken vägg
  if (!R30L.cells.size || !projectiles.length) return updateProjectiles0(dt);
  const pre = projectiles.filter(p => !p.dead && p.friendly && (p.r30 || p.dmg >= 20) && p.kind !== 'pgren' && p.kind !== 'barrel'); updateProjectiles0(dt);
  for (const p of pre) { if (!p.dead) continue;
    for (const k of [0, 1]) { const x = p.x + (k ? p.vx * dt : 0), y = p.y + (k ? p.vy * dt : 0); if (x < 0 || y < 0 || x >= mw || y >= mh) break; const g = R30L.cells.get((y | 0) * mw + (x | 0)); if (g && !g.done) { r30Hit(g, p.r30 === 'boom' ? 'boom' : 'heavy', p.x, p.y); break; } } }
}; }
function r30Tick(dt) { // från v28Tick: fallande pelare, skyddspunkterna räknas om efter ras, tips
  if (state !== 'play') return;
  if (R30L.falls.length) R30L.falls = R30L.falls.filter(o => !r30FallTick(o, dt));
  if (R30L.dirty) { R30L.dirty = false; if (typeof ai24Covers === 'function' && AI24.cov) try { ai24Covers(); } catch (e) { /* nästa bana */ } } // (en gång per bildruta, inte per ruta)
  if (!R30L.cells.size || (R30L.hintT -= dt) > 0) return; R30L.hintT = 0.5;
  for (const g of R30L.cells.values()) if (!g.done && Math.hypot(g.x + 0.5 - P.x, g.y + 0.5 - P.y) < 2.6) { firstHint('ras30', 'SPRUCKNA VÄGGAR RASAR AV SMÄLLAR ELLER TRE TUNGA SLAG.'); break; }
}
function r30Map(s, ox, oy, inside) { // från drawMapCells: spruckna väggar (en ljus spricka) och grus
  if (!R30L.cells.size && !R30L.fallen && !R30L.pillars) return;
  for (const g of R30L.cells.values()) { const ci = g.y * mw + g.x; if (!inside(g.x, g.y) || !seen[ci]) continue;
    if (g.done) { ctx.fillStyle = '#5a4e3e'; ctx.fillRect(ox + g.x * s + (s >> 2), oy + g.y * s + (s >> 2), Math.max(1, s >> 1), Math.max(1, s >> 1)); continue; }
    ctx.fillStyle = '#c8a878'; for (let k = 0; k < s; k++) ctx.fillRect(ox + g.x * s + k, oy + g.y * s + (k * 7 >> 3), 1, 1); }
}
function r30Api() { // window.__game.r30: tillstånd och krokar för t185–t189
  return { R30, L: () => R30L, RUB: R30_RUB, SLOTS: R30_SLOTS, PILLARS: R30_PILLARS,
    cells: () => [...R30L.cells.values()].map(g => ({ x: g.x, y: g.y, base: g.base, hp: g.hp, done: g.done, det: g.det, ch: map[g.y][g.x] })), mark: (x, y) => r30Mark(x, y), crack: (x, y, dmg, how) => r30Crack(x, y, dmg, how),
    hit: (x, y, how) => r30Hit(R30L.cells.get(y * mw + x), how || 'heavy', P.x, P.y), boom: (x, y, r) => r30Boom(x, y, r), falls: () => R30L.falls.length, wallPillar: (x, y) => r30WallPillar(x, y),
    cand: () => { const lab = f29Labels(), out = []; for (let y = 2; y < mh - 2; y++) for (let x = 2; x < mw - 2; x++) { const s = r30Cand(x, y, lab, new Set()); if (s) out.push({ x, y, d: r30Detour(s, lab, 999) }); } return out; },
    decals: () => decals, labels: () => f29Labels(), floorTex: (x, y) => { const t = floorTexs[cellFloor[y * mw + x]]; return t ? { w: t.w, h: t.h, r30: R30MINE.has(t) } : null; }, texOf: c => { const t = tex[wallTexFor[c]]; return t ? { w: t.w, h: t.h, data: t.data, r30: R30MINE.has(t) } : null; }, map: () => map, cellFloor: () => cellFloor, cellSky: () => cellSky };
}
