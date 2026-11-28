// ---------- Version 27: FX del 3 – tydliga statuseffekter, rök ur pipan och biomernas framträdanden ----------
// Bygger på FIENDER (version 23: stjärnor vid bedövning, glimt och isflisor vid frost, bubblor vid gift, lågor vid brand) och
// V26B (vacklande fiender blinkar och ryker blått) utan att dubblera: två fåglar som flaxar runt huvudet på en bedövad fiende,
// isande ånga som sjunker från en frusen, gröna droppar och små bubblor som spricker på en förgiftad, större lågor på brinnande
// fiender längre bort än FIENDERs 10 rutor (så att de syns på avstånd), fartlinjer kring en fiende som jongleras i luften och en
// pulserande ring på golvet med en markör över huvudet på den som vacklar ("avrätta mig"). Pipan ryker en stund efter ett tungt skott
// och efter en lång salva (VAPENs rökslingor i skärmen fortsätter när den varma pipan svalnar). Fiender som dyker upp mitt i striden
// (arenavågor, larm, bakhåll: gfxE:s gBorn) får biomens eget framträdande ovanpå det mörka hålet: eld ur golvet, is, slem, sand och rök,
// kristallglitter, löv eller vattenstänk. Allt läses av från fx27Tick; samma tak (120) och lowfx som resten av version 27.
Object.assign(FX27.f, { status: true, barrel: true, spawn: true });
Object.assign(FX27.n, { status: { stun: 0, frost: 0, poison: 0, burn: 0, air: 0, stagger: 0 }, barrel: 0, spawn: { fire: 0, ice: 0, slime: 0, sand: 0, crystal: 0, leaf: 0, water: 0 } });
Object.assign(FX27, { ov: [], ovLvl: null, bw: -1, bws: 99, barT: -9, barD: 1, heatPrev: 0 });
const FX27_SPAWN = { volcano: 'fire', purgatory: 'fire', foundry: 'fire', frost: 'ice', sewer: 'slime', swamp: 'slime', lab: 'slime', fungus: 'slime', hive: 'slime',
  tomb: 'sand', desert: 'sand', mine: 'sand', battlefield: 'sand', graveyard: 'sand', crystal: 'crystal', mirror: 'crystal', observatory: 'crystal', dream: 'crystal',
  forest: 'leaf', garden: 'leaf', jungle: 'leaf', harbor: 'water', sunken: 'water', ship: 'water', bathhouse: 'water' };
function fx27Spawn(e) { // biomens framträdande (FIENDERs mörka hål och damm finns kvar under)
  const k = lvl && FX27_SPAWN[lvl.biome]; if (!k) return; const dx = e.x - P.x, dy = e.y - P.y; if (dx * dx + dy * dy > 256) return;
  FX27.n.spawn[k]++; const x = e.x, y = e.y, sz = e.d.size * (e.formK || 1), I = fx27Imgs(), P2 = fx.parts, sm = P2.smoke || fx.hit;
  const ring = (n, sp, img, tint, add, extra) => { for (let i = 0; i < n; i++) { const a = i / n * TAU + rnd(-0.2, 0.2); fx27P(Object.assign({ x: x + Math.cos(a) * 0.2, y: y + Math.sin(a) * 0.2, z: 0.03, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0.1, life: rnd(0.5, 0.8), img, size: 0.05, add, fade: add, tint }, extra)); } };
  if (k === 'fire') { const fl = P2.flame || fx.fire; for (let i = 0; i < 5; i++) fx27P({ x: x + rnd(-0.25, 0.25) * sz, y: y + rnd(-0.25, 0.25) * sz, z: 0, vx: 0, vy: 0, vz: rnd(0.9, 1.6), life: rnd(0.4, 0.6), frames: fl, img: fl[0], size: rnd(0.25, 0.4) * sz, add: true, drift: true }); // eld ur golvet
    for (let i = 0; i < 6; i++) fx27Cool(fx27P({ x, y, z: 0.05, vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(1.5, 3), life: rnd(0.6, 1), img: (P2.ember || fx.hit)[0], size: 0.035, add: true, grav: true, tint: [255, 230, 150] }), 'ember'); }
  else if (k === 'ice') { const sh = P2.glassshard || P2.ice; for (let i = 0; i < 7; i++) { const a = rnd(0, TAU); fx27P({ x, y, z: 0.05, vx: Math.cos(a) * rnd(0.5, 1.5), vy: Math.sin(a) * rnd(0.5, 1.5), vz: rnd(1.8, 3), life: rnd(0.7, 1.1), frames: sh || null, img: sh ? sh[i % sh.length] : I.dot, flap: !!sh, size: rnd(0.05, 0.08), grav: true, bounce: true, tint: [205, 235, 255] }); } // isflisor
    ring(8, 0.8, sm[0], [215, 235, 250], false, { frames: sm, size: 0.14, drift: true }); } // kall dimma längs golvet
  else if (k === 'slime') { const c = lvl.biome === 'hive' ? [255, 200, 70] : lvl.biome === 'lab' ? [150, 255, 120] : lvl.biome === 'fungus' ? [170, 255, 190] : [130, 190, 80], dr = (P2.drop || fx.hit)[0];
    for (let i = 0; i < 10; i++) fx27P({ x: x + rnd(-0.15, 0.15), y: y + rnd(-0.15, 0.15), z: 0.03, vx: rnd(-0.8, 0.8), vy: rnd(-0.8, 0.8), vz: rnd(1.4, 2.6), life: rnd(0.5, 0.8), img: dr, size: rnd(0.05, 0.07), grav: true, tint: c }); // slem som sprutar upp
    ring(8, 0.9, fx.hit[1], c, true); }
  else if (k === 'sand') { const c = /tomb|desert/.test(lvl.biome) ? [205, 180, 125] : lvl.biome === 'graveyard' ? [120, 118, 130] : [150, 135, 115];
    for (let i = 0; i < 4; i++) fx27P({ x: x + rnd(-0.2, 0.2), y: y + rnd(-0.2, 0.2), z: rnd(0, 0.3), vx: rnd(-0.15, 0.15), vy: rnd(-0.15, 0.15), vz: rnd(0.4, 0.8), life: rnd(1, 1.4), frames: sm, img: sm[0], size: rnd(0.25, 0.35) * sz, drift: true, tint: c }); // rökpelare
    const sd = P2.sand || P2.dust || fx.hit; for (let i = 0; i < 6; i++) fx27P({ x, y, z: rnd(0.2, 0.7) * sz, vx: rnd(-0.6, 0.6), vy: rnd(-0.6, 0.6), vz: rnd(0, 0.8), life: rnd(0.6, 0.9), img: sd[0], size: 0.03, grav: true, tint: c }); } // sand som rinner av
  else if (k === 'crystal') { const c = BIOME_TINT[lvl.biome] || [200, 170, 255]; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; fx27P({ x: x + Math.cos(a) * 0.35 * sz, y: y + Math.sin(a) * 0.35 * sz, z: rnd(0, 0.8) * sz, vx: -Math.cos(a) * 0.6, vy: -Math.sin(a) * 0.6, vz: rnd(-0.1, 0.3), life: rnd(0.5, 0.8), img: I.star, size: rnd(0.05, 0.09), add: true, fade: true, drift: true, tint: c }); } } // glitter som dras ihop
  else if (k === 'leaf') { const lf = P2.leaf || P2.petal || fx.hit; for (let i = 0; i < 8; i++) fx27P({ x: x + rnd(-0.2, 0.2), y: y + rnd(-0.2, 0.2), z: rnd(0, 0.4), vx: rnd(-0.9, 0.9), vy: rnd(-0.9, 0.9), vz: rnd(0.8, 1.6), life: rnd(1, 1.5), frames: lf, img: lf[0], sway: rnd(0, 6), size: 0.06, drift: true, tint: lvl.biome === 'garden' ? [255, 190, 210] : null }); } // löv som virvlar
  else { const c = GFXW_BUB.water, dr = (P2.drop || fx.hit)[0]; for (let i = 0; i < 9; i++) fx27P({ x, y, z: 0.03, vx: rnd(-0.6, 0.6), vy: rnd(-0.6, 0.6), vz: rnd(1.8, 2.8), life: rnd(0.5, 0.8), img: dr, size: 0.035, grav: true, tint: c }); ring(8, 1, fx.hit[1], c, true); } // vattenstänk
}
function fx27Ov(e, kind) { // följande partiklar (fåglar, ring, markör) som uppdateras varje bildruta medan statusen varar
  if (e.fx27O && e.fx27O.kind === kind) return e.fx27O; if (FX27.ov.length >= 6 && !e.fx27O) return null;
  fx27OvEnd(e); const o = { kind, ps: [] }; e.fx27O = o; FX27.ov.push(e); return o;
}
function fx27OvEnd(e) { const o = e.fx27O; if (!o) return; for (const p of o.ps) p.life = 0; e.fx27O = null; const i = FX27.ov.indexOf(e); if (i >= 0) FX27.ov.splice(i, 1); }
function fx27Status(dt) { // statuseffekterna, bara nära (fåglar och ring inom 12 rutor, lågor på avstånd upp till 22)
  const I = fx27Imgs(), P2 = fx.parts, nf = !!settings.noFlash; let n = 0;
  for (const e of ents) {
    if (e.dead || e.dying || e.hidden || e.dormant || (e.ghost || 0) > 0.5) { if (e.fx27O) fx27OvEnd(e); continue; }
    const dx = e.x - P.x, dy = e.y - P.y, d2 = dx * dx + dy * dy; if (d2 > 484) { if (e.fx27O) fx27OvEnd(e); continue; }
    const sz = e.d.size * (e.formK || 1) * (e.boss ? 0.8 : 1), z0 = ((e.d.ai === 'fly' || e.d.float) && !e.anchored && !e.boss ? 0.3 : 0) + (e.airZ > 0 ? e.airZ : 0), at = r => Math.random() < dt * r;
    const stag = !e.boss && (e.staggerT || 0) > tmr, stun = !stag && e.stun > 0.15 && e.alert && !(e.frozen > 0) && !e.boss;
    if (d2 < 144 && (stag || stun)) { const o = fx27Ov(e, stag ? 'stag' : 'stun'); if (o) {
      if (stun) { FX27.n.status.stun += o.ps.length ? 0 : 1; const f = P2.bat || P2.feather || null; // två fåglar som flaxar runt huvudet (FIENDERs tre stjärnor snurrar åt andra hållet)
        if (!o.ps.length) for (let i = 0; i < 2; i++) { const p = fx27P({ x: e.x, y: e.y, z: z0 + sz, vx: 0, vy: 0, vz: 0, life: 1, frames: f || [I.star], img: (f || [I.star])[0], flap: !!f, size: 0.1, add: !f, tint: [255, 225, 90] }, 'hard'); if (p) o.ps.push(p); }
        o.ps.forEach((p, i) => { const a = -tmr * 4.2 + i * Math.PI, r = 0.26 * sz; p.x = e.x + Math.cos(a) * r; p.y = e.y + Math.sin(a) * r; p.z = z0 + sz * 1.02 + Math.sin(a * 2 + 1) * 0.04; p.life = p.maxLife = 1; }); }
      else { if (!o.ps.length) { FX27.n.status.stagger++; const rf = fx.efx && fx.efx.ring; // ring på golvet och en markör över huvudet: "avrätta mig"
          const r = fx27P({ x: e.x, y: e.y, z: 0, vx: 0, vy: 0, vz: 0, life: 1, frames: rf ? [rf[2]] : null, img: rf ? rf[2] : I.dot, size: 0.2, add: true, tint: [120, 220, 255] }, 'hard'), m = fx27P({ x: e.x, y: e.y, z: 0, vx: 0, vy: 0, vz: 0, life: 1, img: I.star, size: 0.14, add: true, tint: [190, 240, 255] }, 'hard');
          if (r) o.ps.push(r); if (m) o.ps.push(m); }
        const pu = 0.5 + 0.5 * Math.sin(tmr * 9), k = nf ? 0.55 : 1;
        o.ps.forEach((p, i) => { p.x = e.x; p.y = e.y; p.life = p.maxLife = 1; if (i === 0) { p.size = (0.16 + 0.05 * pu) * Math.max(0.8, sz); p.z = -p.size / 2 + 0.03; p.tint = [120 * k, (190 + 50 * pu) * k, 255 * k]; } else { p.size = 0.11 + 0.05 * pu; p.z = z0 + sz * 1.08 + 0.04 * pu; p.tint = [(170 + 60 * pu) * k, 240 * k, 255 * k]; } }); } }
    } else if (e.fx27O) fx27OvEnd(e);
    if (n > 8 || particles.length >= FX27_SOFT) continue;
    const R = () => rnd(-0.18, 0.18) * sz, H = () => z0 + rnd(0.15, 0.85) * sz;
    if (e.frozen > 0 && d2 < 144 && at(5)) { n++; FX27.n.status.frost++; const sm = P2.smoke || fx.hit; fx27P({ x: e.x + R(), y: e.y + R(), z: H(), vx: rnd(-0.1, 0.1), vy: rnd(-0.1, 0.1), vz: -rnd(0.1, 0.2), life: rnd(0.9, 1.3), frames: sm, img: sm[0], size: 0.12 * sz, add: true, fade: true, drift: true, tint: [120, 160, 200] }); // isande ånga som sjunker
      if (at(2)) fx27P({ x: e.x + R(), y: e.y + R(), z: H(), vx: 0, vy: 0, vz: 0, life: 0.3, img: I.star, size: 0.06, add: true, fade: true, tint: [220, 245, 255] }); } // rimfrost som glimtar
    if (e.poison > 0 && d2 < 144 && at(3)) { n++; FX27.n.status.poison++; fx27P({ x: e.x + R(), y: e.y + R(), z: H(), vx: 0, vy: 0, vz: 0, life: rnd(0.6, 0.9), img: (P2.drop || fx.hit)[0], size: 0.035, grav: true, tint: [120, 230, 80] }); // gröna droppar
      if (at(1.5)) fx27P({ x: e.x + R(), y: e.y + R(), z: z0 + sz * rnd(0.8, 1.05), vx: 0, vy: 0, vz: 0.2, life: 0.18, img: I.star, size: 0.05, add: true, fade: true, tint: [160, 255, 110] }); } // en bubbla spricker
    if (e.burn > 0 && d2 >= 100 && at(6)) { n++; FX27.n.status.burn++; const fl = P2.flame || fx.fire; fx27P({ x: e.x + R(), y: e.y + R(), z: H() - 0.1, vx: 0, vy: 0, vz: rnd(0.5, 0.9), life: 0.4, frames: fl, img: fl[0], size: 0.32 * sz, add: true, drift: true }); } // större lågor på avstånd
    if (e.airZ > 0 && d2 < 144 && at(22)) { n++; FX27.n.status.air++; const up = (e.airVz || 0) >= 0, ra = (P2.rain || P2.drop || fx.hit)[0]; // fartlinjer: under när den stiger, över när den faller
      fx27P({ x: e.x + rnd(-0.28, 0.28) * sz, y: e.y + rnd(-0.28, 0.28) * sz, z: up ? z0 + rnd(-0.25, 0.1) : z0 + sz * rnd(0.9, 1.2), vx: 0, vy: 0, vz: 0, life: 0.13, img: ra, size: 0.16, add: true, fade: true, tint: [235, 240, 255] }); }
  }
}
function fx27Barrel(dt) { // pipan ryker en stund efter ett tungt skott och efter en lång salva (VAPENs rökslingor i skärmen)
  const wp = WEAPONS[P.weapon]; if (!wp) return;
  if (FX27.bw !== P.weapon) { FX27.bw = P.weapon; FX27.barT = -9; FX27.bws = 99; FX27.heatPrev = 0; }
  const smoky = !WA_SMOKELESS[wp.id] && !wp.melee && wp.flash > 0.25;
  if (WS.shot < FX27.bws - 1e-6 && WS.shot < 0.05 && smoky && (wp.flash >= 1.1 || wp.kick >= 1.8)) { FX27.barD = 1 + Math.min(1.5, wp.flash * 0.8); FX27.barT = tmr + FX27.barD; } // ett tungt skott
  FX27.bws = WS.shot;
  if (smoky && FX27.heatPrev >= 0.45 && WA.heat < 0.45) { FX27.barD = 1.5; FX27.barT = tmr + 1.5; } // salvan är slut: den varma pipan fortsätter ryka när den svalnar
  FX27.heatPrev = WA.heat;
  const left = FX27.barT - tmr; if (left <= 0 || !waFx() || WA.mx === undefined || WS.state === 'draw' || WS.state === 'holster') return;
  if (Math.random() < dt * 9 * Math.min(1, left / FX27.barD + 0.2)) { waPuff(WA.mx + rnd(-1, 1), WA.my - 1, 0.6); FX27.n.barrel++; }
}
function fx27Tick3(dt) { // från fx27Tick
  if (FX27.ovLvl !== lvl || !fx27On('status')) { for (const e of FX27.ov.slice()) fx27OvEnd(e); FX27.ovLvl = lvl; }
  if (fx27On('spawn')) for (const e of ents) if (e.gBorn > 0 && !e.fx27B && tmr - e.gBorn < 0.2) { e.fx27B = 1; fx27Spawn(e); }
  if (fx27On('status') && dt > 0) fx27Status(dt);
  if (fx27On('barrel') && dt > 0) fx27Barrel(dt);
}
Object.assign(fx27Api, { spawnFx: e => fx27Spawn(e), styles: () => ({ ...FX27_SPAWN }), barrel: () => ({ t: FX27.barT - tmr, n: FX27.n.barrel, heat: WA.heat }), ov: () => FX27.ov.length });

// ---------- HUD ----------
function drawWorldOverlay() { // skadesiffror, livmätare för eliter
  ctx.textBaseline = 'top';
  for (const e of ents) {
    if (e.dead || e.boss || e.hidden || (e.ghost || 0) > 0.5) continue;
    const p = project(e.x, e.y, e.d.size * 1.2 + 0.08); if (!p) continue;
    const y = Math.round(p.sy) - 4;
    if (!e.alert && e.detect > 0.05) { const w = 8, x0 = Math.round(p.sx - w / 2), y1 = y - 9; ctx.fillStyle = '#000a'; ctx.fillRect(x0 - 1, y1 - 1, w + 2, 5); ctx.fillStyle = e.detect > 0.66 ? '#ff6040' : e.detect > 0.33 ? '#ffd24a' : '#e8e8e8'; ctx.fillRect(x0, y1, Math.round(w * e.detect), 3); ctx.fillStyle = '#fff'; ctx.fillRect(x0 + 3, y1 + 1, 2, 1); if (e.detect > 0.33) txt(e.detect > 0.66 ? '!!' : '?', x0 + w + 2, y1 - 3, e.detect > 0.66 ? '#ff6040' : '#ffd24a', 1, true, 0.85); } // upptäcktsmätaren (ögat), med form för färgblinda
    if (e.spotT > 0) txt('!', Math.round(p.sx - 3), y - 12 - Math.round(Math.sin(e.spotT * 9) * 2), '#ff5030', 1, true, Math.min(1, e.spotT * 3)); // har sett dig
    if (settings.enemyBars === false || (!e.elite && (e.hp >= e.maxHp || p.scale < 14))) continue; // vanliga fiender visar mätaren när de skadats
    const w = Math.round(clamp(p.scale * (e.elite ? 0.6 : 0.35), e.elite ? 12 : 8, e.elite ? 40 : 20)), x = Math.round(p.sx - w / 2);
    ctx.fillStyle = '#000a'; ctx.fillRect(x - 1, y - 1, w + 2, 4);
    ctx.fillStyle = e.frozen > 0 ? '#80c8ff' : e.poison > 0 ? '#70d050' : e.burn > 0 ? '#ff9030' : e.elite ? '#c03020' : '#a04030'; ctx.fillRect(x, y, Math.max(0, w * e.hp / e.maxHp), 2);
    let sx = x + w + 2; for (const [on, col] of [[e.burn > 0, '#ff9030'], [e.poison > 0, '#70d050'], [e.frozen > 0 || e.slow > 0, '#80c8ff'], [e.bleed > 0, '#d02030'], [e.stun > 0, '#ffe070']]) if (on) { ctx.fillStyle = col; ctx.fillRect(sx, y - 1, 2, 3); sx += 3; } // statusprickar
    if (e.eshield > 0) { ctx.fillStyle = '#6fb0ff'; ctx.fillRect(x, y + 2, Math.max(0, w * e.eshield / e.eshieldMax), 1); }
    if (e.elite && p.scale > 40) txt(e.elite.name, Math.round(p.sx - textW(e.elite.name) / 2), y - 10, '#ffd24a');
  }
  for (const n of numbers) {
    if (settings.dmgNumbers === false && !n.color) continue;
    const p = project(n.x, n.y, n.z); if (!p) continue;
    const s = String(n.v);
    const big = n.crit && n.v >= 40;
    if (n.color) { const w = textW(s); txt(s, Math.round(p.sx - w / 2), Math.round(p.sy), n.color, 1, true, clamp(n.t * 2, 0, 1)); continue; } // stora kritiska träffar syns tydligt
    ctx.font = (big ? 16 : 8) + 'px "PressStart2P"'; const w = ctx.measureText(plain(s)).width;
    txt(s, Math.round(p.sx - w / 2), Math.round(p.sy) - (big ? 6 : 0), n.crit ? '#ffd24a' : '#f0e0c0', big ? 2 : 1, true, clamp(n.t * 2, 0, 1));
  }
}
function enemyUnderCrosshair() {
  for (const e of ents) {
    if (e.dead || e.hidden) continue;
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); if (d > 18) continue;
    let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
    if (Math.abs(off) < Math.max(0.02, 0.3 * e.d.size * (e.boss ? 1.8 : 1) / d) && hasLOS(P.x, P.y, e.x, e.y)) return true;
  }
  return false;
}
// ---------- HUD i hörnen (som genrens moderna förebilder): ikoner och siffror, ingen statuslist ----------
let HL = null, hudGoldV = null, hudGoldRun = null, goldPop = null, fxIcons = []; const fxMax = {};
const hudTxtCol = () => ({ blue: '#b0ccff', green: '#b0e8b0', gold: '#ffd890' })[settings.hudTheme] || '#e8d9b0'; // HUD-temat färgar siffrorna
function mapTop() { return isTouch() ? 3 + (settings.bigHud ? 30 : 22) + 3 : 4; } // minikartan: under ammo-hörnet på pekskärm
let hudIX = 0, hudIXT = -9;
function hudInset() { // stående telefon: bilden är bredare än skärmen och kanterna beskärs (index.html), så HUD:en flyttas in lika mycket
  if (Math.abs(tmr - hudIXT) > 0.5) { hudIXT = tmr; try { const r = canvas.getBoundingClientRect(); hudIX = r.width > innerWidth + 2 ? Math.ceil((r.width - innerWidth) / 2 / r.width * W) : 0; } catch (e) { hudIX = 0; } }
  return hudIX;
}
function hudLay() { // hörnens rutor i spelkoordinater (320×200); pekskärm: överst så att nedre delen är fri för tummarna
  const t = isTouch(), big = !!settings.bigHud, w = big ? 112 : 80, h = big ? 30 : 22, y = t ? 3 : H - 2 - h, ss = big ? 2 : 1;
  const ms = settings.mapScale || 3, size = (2 * Math.round(24 / ms) + 1) * ms, ix = hudInset();
  const L = { t, big, ix, hp: { x: 4 + ix, y, w, h }, ammo: { x: W - 4 - w - ix, y, w, h }, map: { x: W - 4 - size - ix, y: mapTop(), w: size, h: size } };
  const potOn = !!(P.potions && P.potions.length) || !!settings.potHud, lampOn = P.battery !== undefined && (P.lamp || P.battery < 15);
  let c; // vänster stapel: drycker, lampa, effekter (uppåt från hälsan på dator, nedåt på pekskärm)
  if (t) { c = y + h + 3; L.potY = c; if (potOn) c += 14; L.lampY = c; if (lampOn) c += 7; L.fxY = c; }
  else { c = y - 2; if (potOn) c -= 13; L.potY = c; if (lampOn) c -= 7; L.lampY = c + 1; L.fxY = c - 12; }
  if (t) { L.exY = y + 2; L.exR = L.ammo.x - 4; L.noteR = L.ammo.x - 4; L.noteY = y + 13; L.ab = { x: L.map.x - 22, y: L.map.y + 2 }; L.st = { x: L.map.x - 34, y: L.map.y + 34 }; }
  else { L.exY = y - 9 * ss - 1; L.exR = W - 5; L.ab = { x: W - 22, y: L.exY - 21 }; L.st = { x: W - 64, y: L.ab.y + 14 }; L.noteR = W - 5; L.noteY = L.ab.y - 11; }
  L.msgY = t ? y + h + 3 : 5; L.row2 = L.msgY + 11; L.msgW = t ? 23 - Math.ceil(ix / 4) : 25; L.styleY = L.map.y + L.map.h + 42; // överst i mitten: meddelanderaden och en andra rad (nivå, våg, arena, rampljus …)
  return L;
}
function hudIcon(g, kind, x, y, col, s = 1) { // små pixelikoner: kors, sköld, granat, nyckel, stjärna, omladdning
  const R = (a, b, w, h) => g.fillRect(x + a * s, y + b * s, w * s, h * s);
  if (kind === 'cross') { g.fillStyle = '#000'; R(3, 0, 5, 11); R(0, 3, 11, 5); g.fillStyle = col; R(4, 1, 3, 9); R(1, 4, 9, 3); }
  else if (kind === 'shield') { g.fillStyle = '#000'; R(0, 0, 9, 7); R(1, 7, 7, 2); R(3, 9, 3, 1); g.fillStyle = col; R(1, 1, 7, 6); R(2, 7, 5, 1); R(3, 8, 3, 1); g.fillStyle = '#ffffff60'; R(2, 2, 2, 3); }
  else if (kind === 'gren') { g.fillStyle = '#000'; R(0, 2, 7, 6); g.fillStyle = col; R(1, 3, 5, 4); R(2, 2, 3, 1); R(2, 7, 3, 1); g.fillStyle = '#c9a87a'; R(3, 0, 1, 2); R(4, 0, 2, 1); }
  else if (kind === 'key') { g.fillStyle = col; R(0, 0, 3, 3); R(3, 1, 3, 1); R(4, 2, 1, 2); R(5, 2, 1, 1); g.fillStyle = '#000'; R(1, 1, 1, 1); }
  else if (kind === 'star') { g.fillStyle = col; R(2, 0, 1, 1); R(1, 1, 3, 1); R(0, 2, 5, 1); R(1, 3, 3, 1); R(1, 4, 1, 1); R(3, 4, 1, 1); }
  else if (kind === 'reload') { g.strokeStyle = col; g.lineWidth = 2 * s; g.beginPath(); g.arc(x + 6 * s, y + 6 * s, 4.5 * s, 0.3, TAU - 0.9); g.stroke(); g.lineWidth = 1; g.fillStyle = col; R(8, 0, 4, 1); R(10, 1, 2, 3); }
}
function drawHpCorner(g, L) { // hälsa: kors + stor siffra + tunn stapel; skyddet som sköld + siffra bara när det finns
  const r = L.hp, i = L.big ? 2 : 1, ns = L.big ? 3 : 2, low = P.hp <= maxHp() * 0.3, over = P.hp > maxHp() + 0.5, blink = tmr % 0.6 < 0.3;
  const hpS = String(Math.max(0, Math.ceil(P.hp))), nx = r.x + 4 + 11 * i, barY = r.y + r.h - 3, barW = r.x + r.w - nx - 2;
  hudIcon(g, 'cross', r.x + 1, r.y + Math.round((r.h - 3 - 11 * i) / 2), over ? '#60e0a0' : low ? (blink ? '#ff4d3d' : '#801810') : '#d83a2a', i);
  txt(hpS, nx + HJ.hpDx, r.y + 1 + HJ.hpDy, HJ.hpCol || (over ? '#a0ffd0' : !low ? hudTxtCol() : (blink ? '#ff4d3d' : '#a02a20')), ns); // MENY: studsar/skakar och blinkar (hudJuice)
  hpShown = hpShown > P.hp ? Math.max(P.hp, hpShown - maxHp() * 0.4 / 60) : P.hp; // fördröjd stapel
  g.fillStyle = '#000a'; g.fillRect(nx - 1, barY - 1, barW + 2, 4); g.fillStyle = '#2a1410'; g.fillRect(nx, barY, barW, 2);
  g.fillStyle = '#f0e0c0'; g.fillRect(nx, barY, Math.round(barW * clamp(hpShown / maxHp(), 0, 1)), 2); g.fillStyle = '#c03828'; g.fillRect(nx, barY, Math.round(barW * clamp(P.hp / maxHp(), 0, 1)), 2);
  if (mod('shield') > 0) { g.fillStyle = '#20344a'; g.fillRect(nx, barY + 2, barW, 1); g.fillStyle = '#7fc0ff'; g.fillRect(nx, barY + 2, Math.round(barW * clamp(P.shield / mod('shield'), 0, 1)), 1); } // skölden (kort) som tunn blå stapel
  if (P.armor > 0) { const ax = nx + textW(hpS) * ns + 4, aS = String(Math.ceil(P.armor)); hudIcon(g, 'shield', ax, r.y + 3 * i, '#5f88d0', i); txt(aS, ax + 10 * i + 1, r.y + 4 * i, '#9fc4ff', i); }
  if (run.cls && CLASSES[run.cls]) { g.fillStyle = CLASSES[run.cls].color; g.globalAlpha = 0.6; g.fillRect(r.x - 2, r.y + 2, 1, r.h - 4); g.globalAlpha = 1; } // klassens färg
}
function drawAmmoCorner(g, L) { // magasinet stort + "/reserv" litet; granater, nycklar, vapennivå och runor som små ikoner
  const r = L.ammo, wp = WEAPONS[P.weapon], ns = L.big ? 3 : 2, ss = L.big ? 2 : 1, xr = r.x + r.w - 1;
  const mag = wp.melee ? '–' : wp.staff ? String(Math.floor(P.mags[P.weapon])) : String(P.mags[P.weapon]), res = wp.melee || wp.staff || wp.ammo === 'none' ? '' : '/' + P.ammo[wp.ammo];
  const low = !wp.melee && +mag <= Math.ceil(effMag(P.weapon) * 0.25), rw = res ? textW(res) * ss : 0;
  txt(mag, Math.round(xr - rw - textW(mag) * ns - 1), r.y + 1 + HJ.magDy, mag === '0' ? (tmr % 0.5 < 0.25 ? '#ff4d3d' : '#7a2a20') : HJ.magCol || (low ? '#ffb040' : hudTxtCol()), ns); // MENY: pulserar vid omladdning, studsar när den är klar
  if (res) txt(res, Math.round(xr - rw), r.y + 1 + 8 * (ns - ss), P.ammo[wp.ammo] === 0 ? (tmr % 0.6 < 0.3 ? '#ff4d3d' : '#7a2a20') : '#a08a68', ss);
  if (!wp.melee) { const bw = r.w - 18, bx = xr - bw, by = r.y + r.h - 3, k = clamp(P.mags[P.weapon] / Math.max(1, effMag(P.weapon)), 0, 1); g.fillStyle = '#000a'; g.fillRect(bx - 1, by - 1, bw + 2, 4); g.fillStyle = '#2a2018'; g.fillRect(bx, by, bw, 2); g.fillStyle = low ? '#ffb040' : '#c9a87a'; g.fillRect(xr - Math.round(bw * k), by, Math.round(bw * k), 2); }
  const it = [], y = L.exY;
  if (run.pact) it.push([textW('EDEN'), x => txt('EDEN', x, y, '#ff7050')]);
  for (const rn of curRunes()) it.push([8, x => { const im = hudImg['rune_' + rn]; if (im) g.drawImage(im, x, y, 7, 7); else { g.fillStyle = RUNES[rn].col; g.fillRect(x + 1, y + 1, 5, 5); } }]);
  for (let k = wlvl(wp.id); k > 0; k--) it.push([6, x => hudIcon(g, 'star', x, y + 1, '#ffd24a')]);
  for (let k = Math.min(P.keys || 0, 5); k > 0; k--) it.push([7, x => hudIcon(g, 'key', x, y + 1, '#ffd24a')]);
  if (P.grenades > 0) { const s = String(P.grenades); it.push([9 + textW(s), x => { hudIcon(g, 'gren', x, y - 1, '#7a9a50'); txt(s, x + 9, y, '#c8e8a0'); }]); }
  if (v26aCoinOn(wp)) it.push(v26aHudItem(g, y)); // version 26A: mynten (fyllda = redo, ringar = laddas)
  let x = L.exR - it.reduce((a, [w]) => a + w + 3, -3); for (const [w, f] of it) { f(Math.round(x)); x += w + 3; }
  if (hudGoldRun !== run) { hudGoldRun = run; hudGoldV = run.gold; } // guldet syns bara när det ändras: "+15" som stiger och bleknar
  else if (run.gold !== hudGoldV) { const d = run.gold - hudGoldV; hudGoldV = run.gold; if (d > 0) goldPop = { v: (goldPop && goldPop.t > 0.3 ? goldPop.v : 0) + d, t: 1.8 }; }
  if (goldPop && goldPop.t > 0) { goldPop.t -= 1 / 60; const s = `+${goldPop.v}`; txt(s, Math.round(L.noteR - textW(s)), Math.round(L.noteY - (L.t ? 0 : (1.8 - goldPop.t) * 5)), '#ffd24a', 1, true, Math.min(1, goldPop.t * 1.5)); }
}
const FX_BITS = { // effektradens egna små symboler (i stället för bokstavsförkortningar) när det inte finns någon ikonbild
  fart: ['#..#...', '.#..#..', '..#..#.', '...#..#', '..#..#.', '.#..#..', '#..#...'], // »
  snigel: ['....###.', '...#...#', '#..#.#.#', '.#.#..##', '.##.###.', '########'], // långsam
  sikte: ['..###..', '.#.#.#.', '#..#..#', '####.##', '#..#..#', '.#.#.#.', '..###..'], // teleskopet
  skold: ['.#####.', '#######', '#######', '#######', '.#####.', '..###..', '...#...'], // osårbar
  tid: ['#######', '.#...#.', '..#.#..', '...#...', '..###..', '.#####.', '#######'], // tidsstopp
  gift: ['...#...', '..###..', '.#####.', '.#####.', '#######', '#######', '.#####.'],
};
function fxSym(g, k, x, y, col) { const b = FX_BITS[k], w = b[0].length, x0 = x + ((17 - w) >> 1), y0 = y + ((8 - b.length) >> 1); for (const [c, d] of [['#000', 1], [col, 0]]) { g.fillStyle = c; b.forEach((r, j) => { for (let i = 0; i < w; i++) if (r[i] === '#') g.fillRect(x0 + i + d, y0 + j + d, 1, 1); }); } }
const tintCache = new Map();
function tintImg(im, col) { // vit ikon i effektens färg (en kopia per ikon och färg)
  const k = im.src + col; let c = tintCache.get(k);
  if (!c) { c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const t = c.getContext('2d'); t.drawImage(im, 0, 0); t.globalCompositeOperation = 'source-in'; t.fillStyle = col; t.fillRect(0, 0, c.width, c.height); tintCache.set(k, c); }
  return c;
}
function drawFxRow(g, L) { // aktiva effekter: små färgade ikoner med nedräkningsstapel vid hälsan, högst fyra
  const ch = [], add = (k, t, col, ic) => { if (!(t > 0)) { fxMax[k] = 0; return; } fxMax[k] = Math.max(fxMax[k] || 0, t); ch.push({ t, m: fxMax[k], col, ic }); };
  add('haste', P.haste, '#9fe060', hudImg.icon_wind ? '~icon_wind' : 'fart'); add('rage', P.rageT, POTIONS.rage.color, 'potion_rage'); add('ghost', P.ghostT, POTIONS.ghost.color, 'potion_ghost'); add('speed', P.speedT, POTIONS.speed.color, 'potion_speed');
  add('slow', P.slowT, '#80b0ff', 'snigel'); add('scope', P.scopeT, '#c0b0ff', 'sikte'); if (!hudImg.icon_poison2) add('poison', P.poisonT, '#9fe060', 'gift'); // ~ = vit ikon som färgas
  if (up('bullettime') && WS.aim > 0.8) ch.push({ col: '#80b0ff', ic: hudImg.icon_time ? 'icon_time' : 'tid' });
  if (P.iframe > 0) ch.push({ col: '#ffe9a8', ic: 'skold' });
  for (const im of fxIcons) ch.push({ img: im });
  ch.slice(0, 4).forEach((c, i) => {
    const x = L.hp.x + i * 19, y = L.fxY, tint = c.ic && c.ic[0] === '~', im0 = c.img || hudImg[tint ? c.ic.slice(1) : c.ic], im = im0 && tint ? tintImg(im0, c.col) : im0;
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x, y - 1, 17, 11);
    if (im) { if (im.height > im.width) g.drawImage(im, x + 5, y - 1, 6, 9); else g.drawImage(im, x + 4, y, 8, 8); } else if (FX_BITS[c.ic]) fxSym(g, c.ic, x, y, c.col);
    if (c.m) { g.fillStyle = '#000a'; g.fillRect(x, y + 9, 17, 1); g.fillStyle = c.col; g.fillRect(x, y + 9, Math.round(17 * c.t / c.m), 1); }
  });
}
