// ---------- Version 30 (SPEL): Ruinstaden och Glasbruket – gemensamt, Ruinstaden och Borgmästaren ----------
// Kartecken från bangeneratorn (js/gen.js, GEN v30): väggar ʗ ʘ ʙ (Ruinstaden) och ʚ ʛ ʜ (Glasbruket); faror ʝ rasande tak, ʞ grus,
// ʟ smält glas, ʠ glasskärvor, ʡ ugnsmun; rekvisita ʢ–ʧ (PROP_DEFS i 0020); fiender ʨ–ʱ (ENEMY_DEFS i 0020); vapen ʲ ʳ och ammo ʴ ʵ (0030).
// Allt nytt händer bara när banan har tecknen (gamla banor och frön är orörda: inga nya slumpdrag, inga nya golvtexturer).
// Gemensamt här: laddning (v30Load), tabeller, setupV30, updateV30, ljus, karta, HUD, världssprites och fallande bråte.
// Ruinstaden: rasande tak, grus, damm, plundraren, stengolemen, takskytten, dammvirveln och Borgmästaren. Glasbruket: 0606. Vapnen: 0607.
const V30 = { on: true, roofWarn: 0.8, roofDmg: 25, roofNear: 12, rubbleSlow: 0.75, maxGolems: 2, maxCrawlers: 3, maxDevils: 4, fogDust: 0.35, log: [] };
const V30_C = { roof: 'ʝ', rubble: 'ʞ', molten: 'ʟ', shards: 'ʠ', vent: 'ʡ', column: 'ʢ', beam: 'ʣ', statue: 'ʤ', furnace: 'ʥ', rack: 'ʦ', bench: 'ʧ',
  looter: 'ʨ', golem: 'ʩ', roofer: 'ʪ', devil: 'ʫ', blower: 'ʮ', ggolem: 'ʯ', crawler: 'ʰ', spirit: 'ʱ', sling: 'ʲ', glassgun: 'ʳ', stones: 'ʴ', glass: 'ʵ' };
const V30_HAZ = { 'ʝ': 'floor_cracked30', 'ʞ': 'floor_rubble', 'ʟ': 'floor_moltenglass', 'ʠ': 'floor_shards', 'ʡ': 'floor_furnacevent' };
const V30_ALL = new Set([...'ʗʘʙʚʛʜʝʞʟʠʡʢʣʤʥʦʧʨʩʪʫʮʯʰʱʲʳʴʵ']);
Object.assign(wallTexFor, { 'ʗ': 'wall_ruinbrick', 'ʘ': 'wall_ruinplaster', 'ʙ': 'wall_boss_mayor', 'ʚ': 'wall_kilnbrick', 'ʛ': 'wall_glassshelf', 'ʜ': 'wall_boss_glassmaster' });
for (const c of 'ʗʘʙʚʛʜ') IWC[c] = true;
for (const c of 'ʝʞʟʠʡ') IWC[c] = false;
// biomernas särdrag (färgton, dimma, ljud, väder), namn, risk, berättarrad, svagheter och bossarnas glåpord
Object.assign(BIOME_FX, {
  ruins: { grade: [1.03, 0.99, 0.9], fogK: 0.07, amb: [['ruins_hum', 0.34, 1], ['amb_wind', 0.16, 0.85]], weather: 'dust' },
  glassworks: { grade: [1.08, 0.97, 0.9], fogK: 0.075, amb: [['glassworks_hum', 0.34, 1]], weather: 'ash' },
});
Object.assign(BIOME_TINT, { ruins: [205, 185, 145], glassworks: [255, 160, 90] });
Object.assign(BIOME_NAME, { ruins: 'RUINSTADEN', glassworks: 'GLASBRUKET' });
Object.assign(BIOME_RISK, { ruins: 2, glassworks: 3 });
Object.assign(NARRATOR, { ruins: 'RUINSTADEN. TAKEN HÅLLER INTE LÄNGRE – OCH DAMMET MINNS ALLA SOM BODDE HÄR.', glassworks: 'GLASBRUKET. UGNARNA HAR INTE SLOCKNAT PÅ HUNDRA ÅR. NÅGON MATAR DEM FORTFARANDE.' });
Object.assign(WEAK, { 'ʨ': 'SKJUT INNAN DEN FLYR', 'ʩ': 'GÅ NÄRA', 'ʪ': 'TA SKYDD OCH VÄNTA', 'ʫ': 'SKJUT DEN', 'ʮ': 'KLIV UNDAN BUBBLAN', 'ʯ': 'SPRÄNG ELLER SLÅ', 'ʰ': 'SKJUT DEN TIDIGT', 'ʱ': 'SKJUT DEN I LUFTEN' });
Object.assign(V26B_BOSS, { mayor: { staff: [0.6, 1.05] }, glassmaster: { sweep: [0.55, 1] } }); // version 26B: parerbara slag
Object.assign(SUBS, { roof_collapse: 'RAS', wall_crumble: 'MUR SOM RASAR', pillar_fall: 'PELARE SOM FALLER', furnace_blast: 'HETTA', glass_crack: 'GLAS SOM SPRICKER', glassrack_break: 'GLAS SOM KROSSAS', rock_throw: 'STENBLOCK', rooftop_bolt: 'ARMBORST', looter_knife: 'KASTKNIV', glass_dome: 'GLASKUPA', mayor_roar: 'BORGMÄSTARENS VRÅL', glassmaster_roar: 'GLASMÄSTARENS VRÅL', kilnspirit_boom: 'EXPLOSION', dustdevil: 'VIRVELVIND' }); // undertexter
TAUNTS.mayor = ['STADEN ÄR MIN', 'TAKET FALLER ÖVER DIG', 'INGEN BETALAR SKATT HÄR LÄNGRE'];
TAUNTS.glassmaster = ['DU ÄR BARA GLAS', 'IN I UGNEN', 'JAG BLÅSER EN KUPA ÅT DIG'];
function v30Early(order, cyc) { // första varvet: Ruinstaden aldrig före plats 3 och Glasbruket aldrig före plats 4 (kontraktets djup [3, 6] och [4, 7])
  if (cyc > 0) return order;
  for (const [b, min] of [['ruins', 2], ['glassworks', 3]]) { const i = order.indexOf(b); if (i < 0 || i >= min) continue;
    let j = min; while (j < order.length && (order[j] === 'ruins' || order[j] === 'glassworks')) j++; if (j < order.length) [order[i], order[j]] = [order[j], order[i]]; }
  return order;
}

// ---- laddning (från loadAll, krokrad i 0020) ----
async function v30Load() {
  const opt = async (n, dir = 'wall/') => { try { return pixels(await load(A + dir + n + '.png')); } catch (e) { return null; } };
  for (const n of ['wall_ruinbrick', 'wall_ruinplaster', 'wall_kilnbrick', 'wall_glassshelf', 'floor_ruincobble', 'floor_ruinplaza', 'floor_glassworks', 'floor_slag', ...Object.values(V30_HAZ)]) tex[n] = tex[n] || await opt(n);
  tex.wall_ruinbrick = tex.wall_ruinbrick || tex.wall_brick_stone_center; tex.wall_ruinplaster = tex.wall_ruinplaster || tex.wall_house || tex.wall_stone;
  tex.wall_kilnbrick = tex.wall_kilnbrick || tex.wall_brick_small_stone || tex.wall_stone; tex.wall_glassshelf = tex.wall_glassshelf || tex.wall_bookshelf || tex.wall_kilnbrick;
  tex.floor_ruincobble = tex.floor_ruincobble || tex.floor_stone_pattern || tex.floor_stone; tex.floor_ruinplaza = tex.floor_ruinplaza || tex.floor_stone; tex.floor_glassworks = tex.floor_glassworks || tex.floor_stone; tex.floor_slag = tex.floor_slag || tex.floor_basalt || tex.floor_stone;
  tex.floor_cracked30 = tex.floor_cracked30 || tex.floor_crack || tex.floor_stone; tex.floor_rubble = tex.floor_rubble || tex.floor_gravel || tex.floor_stone; tex.floor_moltenglass = tex.floor_moltenglass || tex.floor_molten || tex.floor_lava;
  tex.floor_shards = tex.floor_shards || tex.floor_crystal || tex.floor_stone; tex.floor_furnacevent = tex.floor_furnacevent || tex.floor_vent || tex.floor_stone;
  for (const [n, k] of [['ruindust', 3], ['kilnember', 2], ['rubble30', 3], ['moltenglass', 2]]) { try { fx.parts[n] = strip(await load(`${A}gfx/part_${n}.png`), k); } catch (e) { /* valfri */ } }
  try { fx.props.glassrack_broken = strip(await load(`${A}gfx/prop_glassrack_broken.png`), 1); } catch (e) { /* valfri: hyllan står kvar */ }
  for (const [k, f] of [['slingstones', 'item_slingstones'], ['glass', 'item_glass']]) { try { spr[k] = pixels(await load(`${A}gfx/${f}.png`)); } catch (e) { spr[k] = spr.ammo; } }
  for (const k of ['icon_heat', 'icon_shards']) { try { const im = await load(`${A}gfx/${k}.png`); spr[k] = pixels(im); hudImg[k] = im; } catch (e) { /* valfri */ } }
  if (!spr.sky_ruins) spr.sky_ruins = v30Sky();
}
function v30Sky() { // Ruinstadens gråockra himmel (512×96, 360° vågrätt), samma färger som murkrönet i wall_ruinbrick, med dammslöjor
  const w = 512, h = 96, d = new Uint32Array(w * h), top = [118, 110, 92], mid = [146, 136, 112], low = [174, 164, 136];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y / (h - 1), a = k < 0.6 ? top : mid, b = k < 0.6 ? mid : low, t = k < 0.6 ? k / 0.6 : (k - 0.6) / 0.4;
    const veil = 0.5 + 0.5 * Math.sin(x / w * TAU * 3 + Math.sin(x / w * TAU * 7) * 0.8 + y * 0.09), dith = ((x * 7 + y * 13) & 3) * 1.2;
    const c = i => clamp(Math.round(a[i] + (b[i] - a[i]) * t + (veil - 0.5) * 9 * (1 - Math.abs(k - 0.55)) + dith), 0, 255);
    d[y * w + x] = 0xff000000 | (c(2) << 16) | (c(1) << 8) | c(0);
  }
  return { w, h, data: d };
}

// ---- banans tillstånd ----
let V30L = { live: false, ti: {}, roofs: new Map(), vents: [], furnaces: [], temp: [], falls: [], stones: [], orbs: [], domes: [], waves: [], hint: {}, dustK: 0, fog0: undefined, ventFast: 0, acc: {}, sndT: 0 };
const v30api = () => ({ V30, V30L: () => V30L, C: V30_C, setup: setupV30, slow: v30Slow, temp: v30Temp, fall: v30Fall, crackRoof: v30RoofTrigger, rack: v30BreakRack, lum: (x, y) => lightAt(x, y), early: v30Early });
function v30FloorIdx(n) { if (V30L.ti[n] === undefined) { V30L.ti[n] = floorTexs.length; floorTexs.push(tex[n] || tex.floor_stone); } return V30L.ti[n]; }
function setupV30() {
  V30L = { live: false, ti: {}, roofs: new Map(), vents: [], furnaces: [], temp: [], falls: [], stones: [], orbs: [], domes: [], waves: [], hint: {}, dustK: 0, fog0: undefined, ventFast: 0, acc: {}, sndT: 0, rackHp: new Map() };
  P.v30heat = 0; P.v30shard = 0; P.v30molten = 0; P.v30dome = null; WS.v30rc = false; WS.v30ch = 0;
  if (window.__game && !window.__game.v30) window.__game.v30 = v30api;
  if (!map || !lvl) return;
  const mine = lvl.biome === 'ruins' || lvl.biome === 'glassworks';
  let any = mine;
  if (!any) for (let y = 0; y < mh && !any; y++) for (let x = 0; x < mw; x++) if (V30_ALL.has(map[y][x])) { any = true; break; }
  for (const pr of props) if (V30_ALL.has(pr.ch)) any = true;
  for (const e of ents) if (V30_ALL.has(e.type)) any = true;
  if (['mayor', 'glassmaster'].includes(lvl.guardian) || ['mayor', 'glassmaster'].includes(lvl.bossId)) any = true; // väktare och bossar i andra biomer: deras ras, kupor och vågor
  if (!any) return; // en gammal bana: ingenting nytt (inga golvtexturer, inga slumpdrag)
  V30L.live = true;
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const c = map[y][x], i = y * mw + x;
    if (V30_HAZ[c] && cellFloor) cellFloor[i] = v30FloorIdx(V30_HAZ[c]);
    if (c === 'ʝ') V30L.roofs.set(i, { x, y, t: -1 });
    else if (c === 'ʡ') V30L.vents.push({ x, y, ph: ((x * 37 + y * 101) % 50) / 10, state: 0, acc: 0, sndT: 0 });
  }
  for (const pr of props) if (pr.ch === 'ʥ') V30L.furnaces.push(pr);
  // tak: högst två stengolemer, tre slaggkrypare och fyra dammvirvlar per bana
  for (const [t, max] of [['ʩ', V30.maxGolems], ['ʰ', V30.maxCrawlers], ['ʫ', V30.maxDevils]]) {
    const rm = new Set(ents.filter(o => o.type === t && !o.minion).slice(max)); if (rm.size) { ents = ents.filter(e => !rm.has(e)); totalEnemies -= rm.size; } }
  if (lvl.biome === 'glassworks') v30GlassWindows();
  for (const e of ents) v30Blood(e);
}
function v30Blood(e) { // BLOOD (0580): dammvirveln dammar, slaggkryparen och den spöklika borgmästaren blöder inte
  if (typeof V27_COL !== 'object') return;
  if (e.d && e.d.ai === 'dustdevil') e.v27c = V27_COL.dust; else if (e.d && e.d.ai === 'slagcrawler') e.v27c = null; else if (e.boss && e.id === 'mayor') e.v27c = null;
}
function v30Temp(x, y, ch, t) { // tillfälligt smält glas eller skärvor på en fri golvruta (glasblåsaren, slaggkryparen, glasmästaren)
  if (!map[y] || map[y][x] !== '.' || (x === (P.x | 0) && y === (P.y | 0) && ch === 'ʟ')) return false;
  if (V30L.temp.length > 90) return false;
  const i = y * mw + x; V30L.temp.push({ x, y, t, ch, f: cellFloor ? cellFloor[i] : 0 }); map[y][x] = ch;
  if (cellFloor) cellFloor[i] = v30FloorIdx(V30_HAZ[ch]); return true;
}
function v30TempTick(dt) {
  if (!V30L.temp.length) return;
  for (const o of V30L.temp) { o.t -= dt; if (o.t <= 0 && map[o.y] && map[o.y][o.x] === o.ch) { map[o.y][o.x] = '.'; if (cellFloor) cellFloor[o.y * mw + o.x] = o.f; } }
  V30L.temp = V30L.temp.filter(o => o.t > 0);
}
function v30ClearTemp() { for (const o of V30L.temp) if (map[o.y] && map[o.y][o.x] === o.ch) { map[o.y][o.x] = '.'; if (cellFloor) cellFloor[o.y * mw + o.x] = o.f; } V30L.temp = []; }
function v30Rubble(x, y) { // en golvruta blir grus (rasat tak, borgmästarens ras i kanterna); gångbar, bara på fritt golv
  if (!map[y] || (map[y][x] !== '.' && map[y][x] !== 'ʝ')) return false;
  map[y][x] = 'ʞ'; if (cellFloor) cellFloor[y * mw + x] = v30FloorIdx('floor_rubble'); return true;
}
const v30Slow = () => { if (!V30L.live || P.jz > 0.15 || mod('hazardImmune') > 0) return 1; const c = cellUnder(); return c === 'ʞ' ? V30.rubbleSlow + (1 - V30.rubbleSlow) * clamp(mod('rubbleWalk'), 0, 1) : 1; };
function v30Hint(id, text) { firstHint('v30' + id, text); }

// ---- fallande bråte: rasande tak, borgmästarens tak och kanter (skugga först, sedan ras) ----
function v30Fall(x, y, o = {}) {
  if (solid(x, y)) return null;
  const f = { x, y, t: 0, T: o.T || 1, dmg: o.dmg || 20, r: o.r || 0.9, cause: o.cause || 'RASET', boss: !!o.boss, rub: !!o.rub, big: !!o.big };
  V30L.falls.push(f); return f;
}
function v30FallLand(f) {
  const d = Math.hypot(P.x - f.x, P.y - f.y);
  play('roof_collapse', f.big ? 1 : 0.75, rnd(0.9, 1.1), { x: f.x, y: f.y }); v30Dust(f.x, f.y, f.big ? 12 : 7); v30Rocks(f.x, f.y, f.big ? 8 : 4);
  if (d < 9) P.shake = Math.max(P.shake, (f.big ? 1.2 : 0.8) * (1 - d / 9));
  if (d < f.r && P.jz < 0.6) { run.cause = f.cause; hurtPlayer(f.dmg * (f.boss ? 1 : trapMul()) * clamp(1 - 0.5 * mod('collapseSense'), 0.3, 1), f.x, f.y, 'proj'); }
  for (const e of ents) if (!e.dead && !e.dying && !e.boss && !e.hidden && !e.dormant && Math.hypot(e.x - f.x, e.y - f.y) < f.r) hurtEnemy(e, f.dmg, f.x, f.y, { boom: true, noProc: true });
  if (f.rub) v30Rubble(f.x | 0, f.y | 0);
}
function v30Dust(x, y, n) { const img = fx.parts.ruindust || fx.parts.smoke; if (!img) return; const m = settings.lowfx ? Math.ceil(n / 3) : n;
  for (let i = 0; i < m; i++) { const a = rnd(0, TAU), s = rnd(0.2, 0.9); if (!wpPart({ x: x + rnd(-0.4, 0.4), y: y + rnd(-0.4, 0.4), z: rnd(0.05, 0.7), vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rnd(0.05, 0.3), life: rnd(1, 2), frames: img, img: img[0], size: rnd(0.1, 0.2), tint: fx.parts.ruindust ? null : [200, 185, 150], fade: true })) break; } }
function v30Rocks(x, y, n) { const img = fx.parts.rubble30 || fx.parts.rock; if (!img) return; const m = settings.lowfx ? Math.ceil(n / 2) : n;
  for (let i = 0; i < m; i++) { const a = rnd(0, TAU), s = rnd(0.5, 2); if (!wpPart({ x, y, z: rnd(0.4, 1.0), vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rnd(0.5, 1.6), life: rnd(0.8, 1.3), img: img[i % img.length], size: rnd(0.04, 0.07), grav: true })) break; } }

// ---- Ruinstaden: rasande tak (ʝ), grus (ʞ) och damm ----
function v30RoofTrigger(x, y) { const g = V30L.roofs.get(y * mw + x); if (!g || g.t >= 0) return false; g.t = 0; g.T = V30.roofWarn * (1 + clamp(mod('collapseSense'), 0, 2));
  play('crumble', 0.55, rnd(1.1, 1.3), { x: x + 0.5, y: y + 0.5 }); v30Hint('roof', 'TAKET KNASTRAR – KLIV UNDAN INNAN DET RASAR!'); return true; }
function v30RoofTick(dt) {
  if (!V30L.roofs.size) return;
  const pc = (P.y | 0) * mw + (P.x | 0);
  if (P.jz < 0.3 && V30L.roofs.has(pc)) v30RoofTrigger(P.x | 0, P.y | 0);
  for (const e of ents) { if (e.dead || e.dying || e.boss || e.d.float || e.hidden || e.dormant || !e.alert) continue; const i = (e.y | 0) * mw + (e.x | 0); if (V30L.roofs.has(i)) v30RoofTrigger(e.x | 0, e.y | 0); } // (bara larmade fiender: taken ska finnas kvar när spelaren kommer)
  for (const [i, g] of V30L.roofs) {
    if (g.t < 0) continue; g.t += dt; const cx = g.x + 0.5, cy = g.y + 0.5;
    if (!settings.lowfx && Math.random() < dt * 14) wpPart({ x: cx + rnd(-0.45, 0.45), y: cy + rnd(-0.45, 0.45), z: 0.95, vx: 0, vy: 0, vz: -rnd(0.2, 0.6), life: 0.9, img: (fx.parts.ruindust || fx.hit)[0], size: 0.05, tint: fx.parts.ruindust ? null : [210, 195, 160], grav: true });
    if (g.t < g.T) continue;
    V30L.roofs.delete(i); map[g.y][g.x] = '.';
    v30Rubble(g.x, g.y); play('roof_collapse', 1, rnd(0.9, 1.1), { x: cx, y: cy }); v30Dust(cx, cy, 14); v30Rocks(cx, cy, 9);
    flashes.push({ x: cx, y: cy, t: 0.12, r: 2, col: [255, 220, 170] });
    const dp = Math.hypot(P.x - cx, P.y - cy); if (dp < 8) P.shake = Math.max(P.shake, 1.1 * (1 - dp / 8));
    const k = clamp(1 - 0.5 * mod('collapseSense'), 0.3, 1);
    const near = (ox, oy) => Math.max(Math.abs((ox | 0) - g.x), Math.abs((oy | 0) - g.y));
    if (P.jz < 0.6) { const n = near(P.x, P.y); if (n <= 1) { run.cause = 'TAKET SOM RASADE'; hurtPlayer((n === 0 ? V30.roofDmg : V30.roofNear) * trapMul() * k, cx, cy, 'proj'); } }
    for (const e of ents) if (!e.dead && !e.dying && !e.hidden && !e.dormant && !e.d.float) { const n = near(e.x, e.y); if (n <= 1) hurtEnemy(e, (n === 0 ? V30.roofDmg : V30.roofNear) * (e.boss ? 0.4 : 1), cx, cy, { boom: true, noProc: true }); }
    stat('roofs30'); V30.log.push('tak@' + g.x + ',' + g.y);
  }
}
function v30RuinsTick(dt) {
  // grus: fiender saktas (inte flygande)
  for (const e of ents) { if (e.dead || e.dying || e.boss || e.d.float) { e.v30px = undefined; continue; } const c = map[e.y | 0] && map[e.y | 0][e.x | 0];
    if (c === 'ʞ' && e.v30px !== undefined && !e.knock) { const nx = e.x - (e.x - e.v30px) * (1 - V30.rubbleSlow), ny = e.y - (e.y - e.v30py) * (1 - V30.rubbleSlow); if (Math.hypot(e.x - e.v30px, e.y - e.v30py) < 0.5 && !solid(nx, ny)) { e.x = nx; e.y = ny; } }
    e.v30px = e.x; e.v30py = e.y; }
  if (cellUnder() === 'ʞ' && P.jz < 0.15 && Math.hypot(P.vx, P.vy) > 1) v30Hint('rubble', 'GRUSET SAKTAR DIG – OCH FIENDERNA SOM GÅR PÅ DET.');
  // dammet: virvlar runt dig under bar himmel; dammvirvlarna gör det tjockare
  let devil = 0; for (const e of ents) if (e.d.ai === 'dustdevil' && !e.dead && !e.dying) { const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < 6) devil = Math.max(devil, 1 - d / 6); }
  V30L.dustK += ((lvl.biome === 'ruins' ? 0.1 : 0) + devil * 0.9 - V30L.dustK) * Math.min(1, dt * 1.5);
  if (lvl.biome === 'ruins' && !settings.lowfx && Math.random() < dt * 6) { const a = rnd(0, TAU), r = rnd(1, 6), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
    if (!solid(x, y) && (!cellSky || cellSky[(y | 0) * mw + (x | 0)])) { const img = fx.parts.ruindust || fx.parts.smoke || fx.hit; wpPart({ x, y, z: rnd(0.2, 1.1), vx: Math.cos(a + 1.6) * 0.6, vy: Math.sin(a + 1.6) * 0.6, vz: rnd(-0.05, 0.1), life: 2.6, frames: img, img: img[0], size: rnd(0.12, 0.22), fade: true, tint: fx.parts.ruindust ? null : [200, 185, 150] }); } }
}
function v30FogTick() { // dammet tjocknar dimman (dammsynen tunnar ut den); bara i Ruinstaden eller nära en dammvirvel
  if (V30L.fog0 === undefined) V30L.fog0 = fogK;
  if (lvl.biome !== 'ruins' && V30L.dustK < 0.01) { if (V30L.fogSet) { fogK = V30L.fog0; V30L.fogSet = false; } return; }
  fogK = V30L.fog0 * (1 + V30.fogDust * V30L.dustK * 3 * clamp(1 - mod('dustSight'), 0, 1)); V30L.fogSet = true;
}

// ---- Ruinstadens fiender ----
const AI_V30R = {
  looter(e, dt, dist, los) {
    // kastar knivar på avstånd och flyr en gång när hälsan är låg
    if (!e.v30fled && e.hp < e.maxHp * 0.35 && !e.minion) { e.v30fled = true; e.fleeT = 3; spawnText(e.x, e.y, 'FLYR', '#c9a87a'); play('looter', 0.7, 1.2, { x: e.x, y: e.y }); return true; }
    e.knifeT = (e.knifeT ?? rnd(1, 2.5)) - dt;
    if (e.knifeT <= 0 && los && e.alert && dist > 2.4 && dist < 9 && e.state !== 'pain') { e.knifeT = rnd(2.2, 3.4); e.state = 'attack'; e.t = 0; e.didHit = true;
      const a = Math.atan2(P.y + P.vy * 0.25 - e.y, P.x + P.vx * 0.25 - e.x); v18Shoot(e, a, 8, e.d.dmg * 0.8, 'v30knife', { life: 1.6, t0: tmr, arcT: dist / 8, arcH: 0.15 });
      play('looter_knife', 0.8, rnd(0.95, 1.08), { x: e.x, y: e.y }); v30Hint('looter', 'PLUNDRAREN KASTAR KNIVAR OCH FLYR NÄR DEN ÄR SKADAD.'); return true; }
    return false;
  },
  rubblegolem(e, dt, dist, los) {
    // kastar stenblock i båge; blocket kan rasa spruckna väggar (RAS: r30Crack)
    e.rockT = (e.rockT ?? rnd(2, 3.5)) - dt;
    if (e.state === 'attack' && e.v30throw) { if (e.t > 0.55 && !e.v30thrown) { e.v30thrown = true; const tx = P.x + P.vx * 0.5, ty = P.y + P.vy * 0.5, d = Math.hypot(tx - e.x, ty - e.y), a = Math.atan2(ty - e.y, tx - e.x);
        v18Shoot(e, a, 6, e.d.dmg * 0.9, 'v30rock', { life: d / 6 + 0.3, t0: tmr, arcT: d / 6, arcH: 1.1, tx, ty, r: 0.5 }); play('rock_throw', 0.9, rnd(0.9, 1.05), { x: e.x, y: e.y }); }
      if (e.t > 1.0) { e.state = 'move'; e.t = 0; e.v30throw = false; } return true; }
    if (e.rockT <= 0 && los && e.alert && dist > 3 && dist < 11 && e.state !== 'pain') { e.rockT = rnd(3.5, 5); e.state = 'attack'; e.t = 0; e.didHit = true; e.v30throw = true; e.v30thrown = false;
      v30Hint('golem', 'STENGOLEMEN KASTAR BLOCK I BÅGE – GÅ NÄRA ELLER HÅLL DIG I RÖRELSE.'); return true; }
    return false;
  },
  rooftopper(e, dt, dist, los) {
    // armborst på avstånd; byter plats efter några skott (gärna intill en mur)
    if (e.v30go) { const g = e.v30go; g.t -= dt; const a = Math.atan2(g.y - e.y, g.x - e.x), sp = e.d.speed * 1.6 * dt, ox = e.x, oy = e.y; tryMove(e, Math.cos(a) * sp, Math.sin(a) * sp, 0.3); e.state = 'move';
      if (g.t <= 0 || Math.hypot(g.x - e.x, g.y - e.y) < 0.4 || Math.hypot(e.x - ox, e.y - oy) < sp * 0.2) e.v30go = null; return true; }
    e.boltT = (e.boltT ?? rnd(1.2, 2.5)) - dt;
    if (e.boltT <= 0 && los && e.alert && dist > 2 && dist < 13 && e.state !== 'pain') { e.boltT = rnd(2, 2.8); e.state = 'attack'; e.t = 0; e.didHit = true;
      const a = Math.atan2(P.y - e.y, P.x - e.x); v18Shoot(e, a, 11, e.d.dmg, 'v30bolt', { life: 1.6 }); play('rooftop_bolt', 0.85, rnd(0.95, 1.05), { x: e.x, y: e.y });
      e.v30shots = (e.v30shots || 0) + 1;
      if (e.v30shots >= 3) { e.v30shots = 0; let best = null;
        for (let k = 0; k < 14; k++) { const aa = rnd(0, TAU), r = rnd(3, 6), x = e.x + Math.cos(aa) * r, y = e.y + Math.sin(aa) * r; if (!freeSpot(x, y, 0.3)) continue;
          const wall = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isWallChar(cellAt(x + dx, y + dy))), score = (wall ? 2 : 0) + (hasLOS(x, y, P.x, P.y) ? 1 : 0) + Math.min(1, Math.hypot(x - P.x, y - P.y) / 8);
          if (!best || score > best.s) best = { x, y, s: score }; }
        if (best) e.v30go = { x: best.x, y: best.y, t: 2.5 }; }
      v30Hint('roofer', 'TAKSKYTTEN BYTER PLATS EFTER NÅGRA SKOTT – VÄNTA BAKOM SKYDD.'); return true; }
    return false;
  },
  dustdevil(e, dt, dist, los) {
    // drar spelaren lite mot sig (dammet tjocknar runt den, v30RuinsTick)
    if (e.alert && dist < 4 && dist > 0.6 && los && P.jz < 0.5) { const k = (1 - dist / 4) * 0.9 * dt * clamp(1 - mod('hazardImmune'), 0, 1), a = Math.atan2(e.y - P.y, e.x - P.x); tryMove(P, Math.cos(a) * k, Math.sin(a) * k, 0.24);
      if ((e.v30snd || 0) < tmr) { e.v30snd = tmr + 2.2; play('dustdevil', 0.5, rnd(0.9, 1.1), { x: e.x, y: e.y }); } v30Hint('devil', 'DAMMVIRVELN DRAR DIG TILL SIG – OCH DAMMET SKYMMER SIKTEN.'); }
    return false;
  },
};
Object.assign(ENEMY_AI, { looter: (...a) => AI_V30R.looter(...a), rubblegolem: (...a) => AI_V30R.rubblegolem(...a), rooftopper: (...a) => AI_V30R.rooftopper(...a), dustdevil: (...a) => AI_V30R.dustdevil(...a) });
function v30RockProj(p, dt) { // stengolemens block och borgmästarens husrester: i båge, smäller där de landar
  const k = clamp((tmr - (p.t0 || tmr)) / (p.arcT || 1), 0, 1); p.z = 0.45 + Math.sin(k * Math.PI) * (p.arcH || 0.8);
  const wall = solid(p.x, p.y);
  if (k >= 1 || wall || p.life <= 0) { p.dead = true; const x = wall ? p.x - p.vx * 0.03 : p.x, y = wall ? p.y - p.vy * 0.03 : p.y;
    play('wall_crumble', 0.45, rnd(1.2, 1.4), { x, y }); v30Dust(x, y, 5); v30Rocks(x, y, 5);
    if (wall && typeof r30Crack === 'function') try { r30Crack(p.x, p.y, 20); } catch (e) { /* RAS saknas */ }
    const d = Math.hypot(P.x - x, P.y - y); if (d < (p.r || 0.6) + 0.3 && P.jz < 0.6) { run.cause = p.cause || run.cause; hurtPlayer(p.dmg, p.src.x, p.src.y, 'proj'); }
    if (d < 6) P.shake = Math.max(P.shake, 0.4 * (1 - d / 6)); return; }
  if (infightHit(p)) return;
}
Object.assign(PROJ_UPD_V8, { v30knife: v23ArcProj, v30bolt: v23ArcProj, v30rock: v30RockProj });
Object.assign(PROJ_DRAW_V8, {
  v30knife: o => drawSprite(fx.parts.knife ? fx.parts.knife[Math.floor(tmr * 14) % fx.parts.knife.length] : fx.hit[0], o.x, o.y, 0.2, o.z - 0.1, Math.floor(tmr * 10) % 2 === 0, null, 0, 0.3, false, fx.parts.knife ? null : [200, 200, 210]),
  v30bolt: o => drawSprite(fx.parts.arrow ? fx.parts.arrow[0] : fx.hit[1], o.x, o.y, 0.16, (o.z || 0.5) - 0.08, false, 1.2, 0, 0.5, false, fx.parts.arrow ? null : [200, 180, 140]),
  v30rock: o => drawSprite((fx.parts.rubble30 || fx.parts.rock || fx.hit)[0], o.x, o.y, o.big ? 0.42 : 0.3, o.z - 0.12, false, null, 0, 0.3, false, (fx.parts.rubble30 || fx.parts.rock) ? null : [140, 120, 100]),
});

// ---- Borgmästaren (arena 'ruins'): river tak över dig, kallar på plundrare, kastar husrester; fas 2: arenan rasar i kanterna ----
function v30Looters(n) { for (let i = 0; i < n; i++) { if (ents.filter(e => e.minion && !e.dead && e.d.ai === 'looter').length >= 5) break; const s = freeSpotFar(3, 7); if (!s) continue;
  const e = makeEnemy(V30_C.looter, s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 8); } }
function v30EdgeCollapse(b, n) { // rutor intill väggar nära bossen rasar (skugga först); blir gångbart grus
  const cand = []; const cx = b.x | 0, cy = b.y | 0;
  for (let y = Math.max(1, cy - 12); y < Math.min(mh - 1, cy + 13); y++) for (let x = Math.max(1, cx - 12); x < Math.min(mw - 1, cx + 13); x++) {
    if (map[y][x] !== '.') continue; if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isWallChar(map[y + dy][x + dx]))) continue;
    if (Math.hypot(x + 0.5 - P.x, y + 0.5 - P.y) < 1.2) continue; cand.push([x, y]); }
  for (let i = 0; i < n && cand.length; i++) { const [x, y] = cand.splice((Math.random() * cand.length) | 0, 1)[0]; v30Fall(x + 0.5, y + 0.5, { T: 1.1 + i * 0.08, dmg: b.d.dmg * 0.7, r: 0.9, cause: b.d.name, boss: true, rub: true }); }
}
function v30RoofOver(b, n) { // borgmästaren river ned taket över spelaren: skuggor, sedan ras
  for (let i = 0; i < n; i++) for (let k = 0; k < 8; k++) { const a = rnd(0, TAU), r = i ? rnd(0.8, 3) / (1 + k * 0.3) : 0; if (v30Fall(P.x + Math.cos(a) * r, P.y + Math.sin(a) * r, { T: 1.0 + i * 0.12, dmg: b.d.dmg * 0.85, r: 1.0, cause: b.d.name, boss: true, big: i === 0 })) break; } // (en ny plats om den första hamnar i en vägg)
  play('roof_collapse', 0.5, 1.4); }
Object.assign(BOSS_AI, {
  mayor(b, dt, dist, ang, ph) {
    const fast = ph === 3 ? 1.25 : 1;
    if (b.state === 'idle') b.once30 = false;
    if (ph >= 2 && !b.guardian) { b.v30edge = (b.v30edge ?? 4) - dt; if (b.v30edge <= 0) { b.v30edge = ph === 3 ? 5 : 7; v30EdgeCollapse(b, ph === 3 ? 6 : 4); if (!b.v30edgeMsg) { b.v30edgeMsg = true; say('RÅDHUSET RASAR I KANTERNA!', 1.5); } } }
    if (b.state === 'staff') { if (!b.didHit && b.t > 0.6) { b.didHit = true; P.shake = Math.max(P.shake, 1); play('roof_collapse', 0.4, 1.5, { x: b.x, y: b.y }); if (dist < (b.d.range || 2.4) + 1.1 && P.jz < 0.4) { run.cause = b.d.name; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); } }
      if (b.t > 1.05) { b.state = 'idle'; b.t = 0; b.cd = rnd(0.8, 1.2) / fast; } return; }
    if (b.state === 'roof') { if (!b.once30 && b.t > 0.45) { b.once30 = true; play('mayor_roar', 0.7, 1.1); v30RoofOver(b, ph >= 2 ? 5 : 3); }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = 0.7 / fast; } return; }
    if (b.state === 'debris') { if (!b.once30 && b.t > 0.5) { b.once30 = true; play('rock_throw', 1, 0.8);
        for (let i = 0; i < (ph >= 2 ? 3 : 2); i++) { const tx = P.x + rnd(-1.5, 1.5), ty = P.y + rnd(-1.5, 1.5), d = Math.hypot(tx - b.x, ty - b.y), a = Math.atan2(ty - b.y, tx - b.x);
          v18Shoot(b, a, 6.5, b.d.dmg * 0.7, 'v30rock', { life: d / 6.5 + 0.3, t0: tmr, arcT: d / 6.5, arcH: 1.4, r: 0.8, big: true, cause: b.d.name }); } }
      if (b.t > 1.1) { b.state = 'idle'; b.t = 0; b.cd = 0.8 / fast; } return; }
    b.cd -= dt;
    if (b.cd <= 0) { b.t = 0; b.didHit = false; b.once30 = false; const los = hasLOS(b.x, b.y, P.x, P.y);
      if (los && dist < 4) { b.state = 'staff'; bossWarn(b, 'BORGMÄSTAREN HÖJER ÄMBETSSTAVEN!'); }
      else if (los) { b.state = Math.random() < 0.55 ? 'roof' : 'debris'; bossWarn(b, b.state === 'roof' ? 'BORGMÄSTAREN RIVER NED TAKET – SE SKUGGORNA!' : 'BORGMÄSTAREN KASTAR HUSRESTER!'); } else b.cd = 0.4;
      return; }
    if (dist > 3.5) bossMove(b, ang, b.d.speed * fast * dt); else bossMove(b, ang + Math.PI / 2, b.d.speed * dt * 0.5);
  },
});
Object.assign(BOSS_SPECIAL, {
  mayor(b, dt, dist, ang, ph) {
    if (b.spK) {
      if (!b.once30) { b.once30 = true; bossWarn(b, 'STADEN STÖRTAR SAMMAN!'); play('mayor_roar', 1, 0.9); v30RoofOver(b, 3 + ph); if (!b.guardian) v30EdgeCollapse(b, 2 + ph * 2); }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return; }
    if (!b.once30) { b.once30 = true; say('BORGMÄSTAREN KALLAR PÅ PLUNDRARNA', 1.5); play('mayor_roar', 0.9, 1.1); v30Looters(1 + ph); }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
});

// ---- uppdatering, ljus, karta, HUD och världssprites (gemensamt för båda biomerna) ----
function updateV30(dt) {
  v30WeaponTick(dt); // slungans stenar och glasbössans kulor (alla banor)
  if (!V30L.live || !lvl) return;
  v30TempTick(dt);
  for (const f of V30L.falls) { f.t += dt; if (f.t >= f.T) { f.done = true; v30FallLand(f); } }
  if (V30L.falls.length) V30L.falls = V30L.falls.filter(f => !f.done);
  v30RoofTick(dt); v30RuinsTick(dt); v30FogTick();
  v30GlassTick(dt);
}
function v30Light(fl) {
  if (!V30L.live) return;
  for (const v of V30L.vents) { if (v.state === 1) fl(v.x + 0.5, v.y + 0.5, 0.3 + 0.4 * v.k, 2, [255, 140, 50]); else if (v.state === 2) fl(v.x + 0.5, v.y + 0.5, 1.1, 3.5, [255, 150, 60]); }
  for (const o of V30L.temp) if (o.ch === 'ʟ') fl(o.x + 0.5, o.y + 0.5, 0.45, 2, [255, 130, 40]);
  for (const f of V30L.falls) fl(f.x, f.y, 0.1 + 0.3 * f.t / f.T, 1.5, [255, 200, 140]);
  for (const e of ents) if (e.d.ai === 'glassgolem' && !e.dead) fl(e.x, e.y, 0.35, 2, [150, 200, 255]); // glasgolemen syns i mörka rum (kall toning)
  else if (e.d.ai === 'slagcrawler' && !e.dead) fl(e.x, e.y, 0.3, 1.5, [255, 130, 40]);
  else if (e.d.ai === 'kilnspirit' && !e.dead && !e.v30hide) fl(e.x, e.y, 0.5, 2, [255, 150, 60]);
}
function v30Map(s, ox, oy, inside) {
  if (!V30L.live) return;
  for (const v of V30L.vents) if (inside(v.x, v.y) && seen[v.y * mw + v.x]) { ctx.fillStyle = v.state === 2 ? '#ffb040' : '#a05020'; ctx.fillRect(ox + v.x * s, oy + v.y * s, s, s); }
  for (const [, g] of V30L.roofs) if (inside(g.x, g.y) && seen[g.y * mw + g.x]) { ctx.fillStyle = g.t >= 0 ? '#ffd080' : '#8a7458'; ctx.fillRect(ox + g.x * s, oy + g.y * s, s, s); }
}
function drawV30Hud(g) {
  if (WS.v30ch > 0 && WEAPONS[P.weapon].sling) { const w = 40, x = Math.round((W - w) / 2), y = HORIZON + 18; g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x - 1, y - 1, w + 2, 4); g.fillStyle = WS.v30ch >= 1 ? '#ffe070' : '#c0a070'; g.fillRect(x, y, Math.round(w * Math.min(1, WS.v30ch)), 2); }
  if (!V30L.live) return;
  if (P.v30heat > 0) { g.fillStyle = `rgba(255,110,30,${0.1 + (settings.noFlash ? 0 : 0.06 * Math.sin(tmr * 10))})`; g.fillRect(0, 0, W, VH); if (hudImg.icon_heat && !fxIcons.includes(hudImg.icon_heat)) fxIcons.push(hudImg.icon_heat); }
  if (P.v30shard > 0 && hudImg.icon_shards && !fxIcons.includes(hudImg.icon_shards)) fxIcons.push(hudImg.icon_shards);
  if (V30L.dustK > 0.3) { g.fillStyle = `rgba(190,170,130,${Math.min(0.22, (V30L.dustK - 0.3) * 0.3 * clamp(1 - mod('dustSight'), 0, 1))})`; g.fillRect(0, 0, W, VH); }
  if (P.v30dome) { const t = 'GLASKUPAN – SKJUT SÖNDER DEN'; txt(t, Math.round((W - textW(t)) / 2), HORIZON + 26, '#a0e0ff', 1, true, 0.8); }
}
function drawV30World(list) {
  for (const s of V30L.stones) list.push({ x: s.x, y: s.y, k: 'v30', t: 'stone', o: s });
  for (const o of V30L.orbs) list.push({ x: o.x, y: o.y, k: 'v30', t: 'orb', o });
  if (!V30L.live) return;
  for (const f of V30L.falls) { list.push({ x: f.x, y: f.y, k: 'v30', t: 'shadow', o: f }); list.push({ x: f.x, y: f.y, k: 'v30', t: 'debris', o: f }); }
  for (const d of V30L.domes) list.push({ x: d.x, y: d.y, k: 'v30', t: 'dome', o: d });
  for (const v of V30L.vents) if (v.state) list.push({ x: v.x + 0.5, y: v.y + 0.5, k: 'v30', t: 'vent', o: v });
}
function drawV30Sprite(s) {
  const o = s.o;
  if (s.t === 'shadow') { const k = o.t / o.T, n = 8; for (let i = 0; i < n; i++) { const a = i / n * TAU + tmr * 0.6; drawSprite(fx.hit[1], o.x + Math.cos(a) * o.r * 0.9, o.y + Math.sin(a) * o.r * 0.9, 0.05, 0.01, false, 1.3, 0, 0, true, k > 0.6 ? [255, 170, 90] : [230, 210, 160]); }
    drawSprite(fx.hit[1], o.x, o.y, 0.22 + 0.45 * k, 0.005, false, 0.2, 0, 0, false, [10, 8, 6]); return true; }
  if (s.t === 'debris') { const k = o.t / o.T; drawSprite((fx.parts.rubble30 || fx.parts.rock || fx.hit)[0], o.x, o.y, o.big ? 0.45 : 0.32, 0.2 + 3.4 * (1 - k), false, null, 0, 0.3, false, (fx.parts.rubble30 || fx.parts.rock) ? null : [140, 120, 100]); return true; }
  if (s.t === 'stone') { drawSprite((fx.parts.rubble30 || fx.parts.rock || fx.hit)[0], s.x, s.y, o.heavy ? 0.14 : 0.1, 0.45, false, null, 0, 0.3, false, (fx.parts.rubble30 || fx.parts.rock) ? null : [150, 140, 120]); return true; }
  if (s.t === 'orb') { drawSprite((fx.parts.glassshard || fx.hit)[0], s.x, s.y, 0.2, 0.45, false, 1, 0, 0.6, true, [170, 230, 255]); return true; }
  if (s.t === 'dome') { const n = 10, k = o.t / o.T; for (let i = 0; i < n; i++) { const a = i / n * TAU; drawSprite((fx.parts.glassshard || fx.hit)[i % 2], o.x + Math.cos(a) * 0.75, o.y + Math.sin(a) * 0.75, 0.32, 0.1 + 0.25 * (i % 3), false, 0.5 + 0.3 * k, 0, 0.4, true, [150, 220, 255]); } return true; }
  if (s.t === 'vent') { const img = fx.parts.kilnember || fx.parts.ember || fx.hit; if (o.state === 1) drawSprite(img[Math.floor(tmr * 10) % img.length], s.x, s.y, 0.2 + 0.3 * o.k, 0.05, false, 0.8, 0, 0.5, true, [255, 150, 60]);
    else { for (let i = 0; i < 3; i++) drawSprite((fx.parts.fire || fx.fire || img)[Math.floor(tmr * 14 + i * 3) % (fx.parts.fire || fx.fire || img).length], s.x + Math.sin(i * 2.1 + tmr * 3) * 0.2, s.y + Math.cos(i * 1.7 + tmr * 3) * 0.2, 0.7 + 0.2 * i, 0.05 + 0.3 * i, false, 0.9, 0, 0.5, true, [255, 170, 80]); } return true; }
  return false;
}
