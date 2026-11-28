// ---------- Version 26C: huvudet lossnar och musiken följer stilen ----------
// HUVUDET (Selaco): ett dödande huvudskott (headshotCheck sätter e.headT) på en upprätt fiende av kött eller ben skär ut huvudet
// (den sammanhängande biten överst mitt på den stående rutan, en gång per bild, cachad) och skjuter iväg det som en snurrande bit.
// Kroppen står huvudlös ett ögonblick med en kort blodfontän (ben: damm) och segnar sedan ned i golvet (borta efter cirka 1,7 s).
// Lärdom från Prodeus: kortlivat och inget i skärmen – ett huvud och högst sex droppar per död; huvud och droppar lever högst 1,2 s,
// fläcken där huvudet landar 8 s, och ett huvud nära kameran tas bort. Ben som inte går att skära ger dödskallen (fx.parts.skull).
// Av med MINSKADE EFFEKTER (gfxELow) och inställningen HUVUDEN LOSSNAR.
// MUSIKEN (ULTRAKILL): stilrangen höjer musikens intensitet (A lite, S och uppåt nästan fullt) och en ny rang A–SSS ger en kort
// syntad stinger (Music.rankSting i music.js), högst en per 4 s. Av med STILMÄTARE av eller MUSIKEN FÖLJER STILEN av.
const v26c = { on: true, heads: 0, bodies: 0, drops: 0, cuts: 0, skip: '', music: true, bonus: 0, want: 0, rank: 0, rankUps: 0, stings: 0, stingT: -9, lastSting: -1, log: [] };
const V26C_CUT = new Map(); // stående bild -> { head: [fyra vridna rutor], body, hb, nz, hs } (tak 40 poster)
const v26cFount = [], v26cHeads = []; // huvudlösa kroppar som blöder just nu (tak 6), huvuden i luften (tak 4)
if (settings.heads === undefined) settings.heads = true; // HUVUDEN LOSSNAR
if (settings.styleMusic === undefined) settings.styleMusic = true; // MUSIKEN FÖLJER STILEN
function v26cCut(img) { // skär ut huvudet (den sammanhängande biten överst mitt på figuren, högst 28 % av höjden) och gör en huvudlös kropp
  if (!img || !img.data || !img.w) return null; const old = V26C_CUT.get(img); if (old !== undefined) return old;
  if (V26C_CUT.size >= 40) V26C_CUT.clear();
  const w = img.w, h = img.h, d = img.data, op = i => d[i] >>> 24 >= 100;
  let top = -1, bot = -1, f0 = w, f1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (op(y * w + x)) { if (top < 0) top = y; bot = y; if (x < f0) f0 = x; if (x > f1) f1 = x; }
  const fw = f1 - f0 + 1, fh = bot - top + 1; let c = null;
  if (top >= 0 && fh >= 8 && fh >= fw * 0.95) { // bara upprätta figurer (inte fåglar, hundar, krabbor …)
    const band = Math.max(3, Math.round(fh * 0.28)), cx = (f0 + f1) / 2;
    let sx = -1, sy = -1; // fröet: översta pixeln nära mitten – ett höjt vapen vid sidan blir inte huvudet
    for (let y = top; y < top + band && sx < 0; y++) { let best = 1e9; for (let x = 0; x < w; x++) { const dx = Math.abs(x - cx); if (dx <= fw * 0.3 && dx < best && op(y * w + x)) { best = dx; sx = x; } } if (sx >= 0) sy = y; }
    if (sx >= 0) {
      const y1 = Math.min(bot, sy + band - 1), m = new Uint8Array(w * h), st = [sy * w + sx]; m[st[0]] = 1; let n = 0, x0 = w, x1 = -1, yb = sy;
      while (st.length) { const i = st.pop(), x = i % w, y = (i - x) / w; n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y > yb) yb = y; // fyllning inom bandet
        for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > sy ? i - w : -1, y < y1 ? i + w : -1]) if (j >= 0 && !m[j] && op(j)) { m[j] = 1; st.push(j); } }
      const bw = x1 - x0 + 1, bh = yb - sy + 1;
      if (n >= 6 && bh >= 3 && bw <= fw * 0.92) { // ett huvud smalare än kroppen (kultistens huva är nästan lika bred)
        const s = Math.max(bw, bh), hd = new Uint32Array(s * s), ox = (s - bw) >> 1, oy = (s - bh) >> 1, body = new Uint32Array(d);
        for (let y = sy; y <= yb; y++) for (let x = x0; x <= x1; x++) { const i = y * w + x; if (m[i]) { hd[(y - sy + oy) * s + x - x0 + ox] = d[i]; body[i] = 0; } }
        for (let y = sy; y <= yb; y++) for (let x = x0; x <= x1; x++) if (m[y * w + x]) for (let k = 1; k <= 2 && y + k < h; k++) { const j = (y + k) * w + x; if (!m[j] && op(j)) body[j] = k === 1 ? 0xff1e1ea0 : 0xff121266; } // halsen: mörkröd stump
        const rot = a => { const o = new Uint32Array(s * s); for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) o[x * s + (s - 1 - y)] = a[y * s + x]; return o; }; // 90° medurs
        const r1 = rot(hd), r2 = rot(r1), r3 = rot(r2), mk = a => ({ w: s, h: s, data: a });
        c = { head: [mk(hd), mk(r1), mk(r2), mk(r3)], body: { w, h, data: body }, hb: Math.max(0, 1 - (sy - oy + s) / h), nz: 1 - (yb + 1) / h, hs: s / h, fw, fh, bw, n };
      }
    }
  }
  V26C_CUT.set(img, c); v26c.cuts++; return c;
}
function v26cKill(e) { // från gfxEKill: dödade ett huvudskott fienden? (e.headT sattes i samma skott)
  if (tmr < v26c.tauntUntil && !e.boss && run) { v26c.tauntKills++; styleAdd(e.elite ? 15 : 8, '+HÅNAD'); } // hånet: dödanden inom 4 s
  if (!e.headT || tmr - e.headT > 0.1 || e.boss || e.guardian) return;
  if (!v26c.on || settings.heads === false) { v26c.skip = 'off'; return; }
  if (gfxELow()) { v26c.skip = 'lowfx'; return; }
  if (e.frozen > 0 || e.burn > 0 || e.d.ai === 'wisp' || e.type === 'Ü' || e.ghost > 0.5 || e.kingImg || e.hidden || e.under || e.downT > 0 || e.sinkT > 0 || e.riseT > 0 || e.anchored) { v26c.skip = 'state'; return; } // inte liggande, nedgrävda eller fastsatta
  const k = gfxEKind(e); if (k !== 'flesh' && k !== 'bone') { v26c.skip = k; return; }
  const set = enemyFrames[e.type], c = v26cCut(set && ((set.idle && set.idle[0]) || (set.move && set.move[0])));
  if (!c && k === 'bone' && fx.parts.skull) { const a = rnd(0, TAU); gfxEPart({ x: e.x, y: e.y, z: e.d.size * 0.8, vx: (e.gHitX || 0) * 2 + Math.cos(a) * 0.4, vy: (e.gHitY || 0) * 2 + Math.sin(a) * 0.4, vz: rnd(2.2, 3), life: 1.2, img: fx.parts.skull[0], size: 0.14, grav: true, bounce: true, tint: [230, 220, 200], v26head: true }, true); // ben som inte går att skära: dödskallen
    v26c.heads++; v26c.skulls = (v26c.skulls || 0) + 1; v26c.skip = ''; play('bonesnap', 0.45, 1.25, { x: e.x, y: e.y }); return; }
  if (!c) { v26c.skip = 'img'; return; } // inte upprätt eller inget smalt huvud (fåglar, hundar, krabbor …): vanlig död
  const sz = e.d.size * 1.15, fz = (e.d.ai === 'fly' || e.d.float) && !e.anchored ? 0.3 : 0, hx = e.gHitX || 0, hy = e.gHitY || 0, sp = rnd(1.6, 2.4);
  gfxEPart({ x: e.x, y: e.y, z: fz + c.hb * sz, vx: hx * sp + rnd(-0.5, 0.5), vy: hy * sp + rnd(-0.5, 0.5), vz: rnd(2.2, 3), life: 1.2, img: c.head[0], frames: c.head, flap: true, size: c.hs * sz, grav: true, bounce: true, v26head: true }, true);
  { const p = particles[particles.length - 1]; if (p && p.v26head && v26cHeads.length < 6) { p.v26land = k !== 'flesh'; v26cHeads.push(p); } } // följs: fläcken där det landar, och det tas bort nära kameran
  v26c.heads++; gfxE.heads = (gfxE.heads || 0) + 1; v26c.skip = '';
  v26c.log.unshift({ type: e.type, kind: k, body: !e.overkill }); if (v26c.log.length > 6) v26c.log.length = 6;
  play(k === 'bone' ? 'bonesnap' : 'splat', 0.45, k === 'bone' ? 1.25 : 0.8, { x: e.x, y: e.y });
  if (e.overkill) return; // sprängs ändå i bitar: bara huvudet flyger
  e.v26hd = c.body; e.v26nz = fz + c.nz * sz; e.v26k = k; e.v26n = 0; v26c.bodies++;
  if (v26cFount.length < 6) v26cFount.push(e);
}
function v26cTick() { // från gfxETick: fontänen ur halsen, sex droppar under en halv sekund (ben: ett dammoln)
  for (let i = v26cHeads.length - 1; i >= 0; i--) { const p = v26cHeads[i]; // huvudet slår i golvet: en liten blodfläck som torkar bort efter 8 s
    if (p.life <= 0 || !particles.includes(p)) { v26cHeads.splice(i, 1); continue; }
    if ((p.x - P.x) ** 2 + (p.y - P.y) ** 2 < 0.25) { p.life = 0; p.size = 0; v26c.nearCam = (v26c.nearCam || 0) + 1; v26cHeads.splice(i, 1); continue; } // aldrig ett huvud som fyller skärmen
    if (p.z <= 0.001 && !p.v26land) { p.v26land = true; /* första studsen */ const f = fx.parts.blood_pool; if (f && !solid(p.x, p.y)) { decals.push({ x: p.x, y: p.y, img: f[(Math.random() * f.length) | 0], size: 0.05, life: 8 }); if (decals.length > 70) decals.shift(); v26c.marks = (v26c.marks || 0) + 1; } }
  }
  for (let i = v26cFount.length - 1; i >= 0; i--) {
    const e = v26cFount[i], k = tmr - (e.gDeadT || -9);
    if (k > 0.5 || k < 0 || e.gibbed || !ents.includes(e)) { v26cFount.splice(i, 1); continue; }
    if (e.v26k === 'bone') { if (!e.v26n && fx.parts.smoke) { e.v26n = 1; gfxEPart({ x: e.x, y: e.y, z: e.v26nz, vx: 0, vy: 0, vz: 0.4, life: 0.7, frames: fx.parts.smoke, img: fx.parts.smoke[0], size: 0.16, drift: true, tint: [215, 205, 185] }); } continue; }
    const want = Math.min(6, Math.floor(k / 0.5 * 6) + 1);
    while (e.v26n < want) { e.v26n++; v26c.drops++; gfxEPart({ x: e.x + rnd(-0.04, 0.04), y: e.y + rnd(-0.04, 0.04), z: e.v26nz, vx: rnd(-0.35, 0.35) + (e.gHitX || 0) * 0.3, vy: rnd(-0.35, 0.35) + (e.gHitY || 0) * 0.3, vz: rnd(1.5, 2.4), life: rnd(0.4, 0.62), img: fx.blood[e.v26n % 3], size: rnd(0.07, 0.1), grav: true }); }
  }
}
function v26cPose(o, K, hx, hy) { // från gfxEPose: den huvudlösa kroppen vacklar, segnar ned och sjunker i golvet (som de förkolnade)
  const k = tmr - (o.gDeadT || -9); if (k < 0) return false;
  const p = Math.min(1, k / 0.3), s = (1 - (1 - p) * (1 - p)) * 0.12 * K; gfxEOff.x = hx * s; gfxEOff.y = hy * s;
  if ((o.d.ai === 'fly' || o.d.float) && !o.anchored && k < 0.4) { const q = k / 0.4; gfxEOff.z = 0.3 * (1 - q * q); }
  if (k < 0.45) { spriteSX = 1 + Math.sin(k / 0.45 * Math.PI * 3) * 0.04 * (1 - k / 0.45); return true; }
  const q = Math.min(1, (k - 0.45) / 0.35); spriteSY = 1 - 0.55 * q * q; spriteSX = 1 + 0.25 * q; spriteClip = 1;
  if (k > 0.8) gfxEOff.z = -Math.min(1, (k - 0.8) / 0.9) * o.d.size * 1.2;
  return true;
}
function v26cStyle() { // från updateAudioMood (före ljudkollen): stilrangens tillskott och stingern vid ny rang
  const on = v26c.music && !!run && settings.styleMeter !== false && settings.styleMusic !== false, r = run ? styleRank() : 0;
  v26c.bonus = on ? 0.15 * Math.max(0, r - 2) : 0;
  if (r >= 4 && v26c.tauntOn && !isTouch() && !gp.active && r > v26c.rank) firstHint('taunt', 'Y HÅNAR: FIENDERNA NÄRA ANFALLER DIG, MEN DÖDANDEN DIREKT EFTERÅT GER MER STIL.'); // hånet syns en gång (rang S)
  if (r > v26c.rank) { v26c.rankUps++; v26c.rankUpT = tmr; if (on && r >= 3 && tmr - v26c.stingT >= 4) { v26c.stingT = tmr; v26c.stings++; v26c.lastSting = r; if (window.Music && Music.rankSting) Music.rankSting(r - 3); } }
  v26c.rank = r;
}
function v26cRankFx(g, x0, y0, r) { // från drawLoopHud: en ram som växer ut från rangbokstaven när rangen stiger (form, inte bara färg; ingen vit blixt)
  const k = (tmr - (v26c.rankUpT ?? -9)) / 0.6; if (k < 0 || k >= 1 || r < 1) return;
  const w = textW(STYLE_RANKS[r][0]) * 2 + 6, e = settings.reduceMotion ? 0 : Math.round(k * 8); // MINSKAD RÖRELSE: ramen står still och tonar bort g.globalAlpha = 1 - k; g.strokeStyle = STYLE_RANKS[r][2]; g.lineWidth = 1;
  g.strokeRect(x0 - 3.5 - e, y0 - 3.5 - e, w + 1 + e * 2, 18 + e * 2); g.globalAlpha = 1; v26c.rankFx = (v26c.rankFx || 0) + 1;
}
const v26cWant = want => (v26c.want = clamp(want + v26c.bonus, 0, 1)); // fiendernas värde plus stilens, 0–1
function v26cApi() { return { st: v26c, t: () => tmr, set: o => Object.assign(v26c, o), cut: v26cCut, cache: () => V26C_CUT.size, fount: () => v26cFount.length,
  fill: () => { for (const s of Object.values(enemyFrames)) if (s && s.idle) v26cCut(s.idle[0]); return V26C_CUT.size; }, // alla fiendetyper: cachens tak
  sheet: () => Object.entries(ENEMY_DEFS).filter(([t]) => enemyFrames[t] && enemyFrames[t].idle).map(([t, d]) => { const k = gfxEKind({ d }), im = enemyFrames[t].idle[0]; return [t, k, im, k === 'flesh' || k === 'bone' ? v26cCut(im) : null]; }).filter(r => r[1] === 'flesh' || r[1] === 'bone'), // kontaktark (null = inget huvud)
  taunt: () => v26cTaunt(), binds: () => ({ key: ACTIONS.some(a => a[0] === 'KeyY' && a[1] === 'HÅNA'), pad: gpb('taunt'), padAct: GP_ACTS.some(a => a[0] === 'taunt') }), // hånet (t132)
  state: () => ({ on: v26c.on, heads: v26c.heads, bodies: v26c.bodies, drops: v26c.drops, cuts: v26c.cuts, skip: v26c.skip, log: v26c.log.slice(), bonus: v26c.bonus, want: v26c.want, rank: v26c.rank, rankUps: v26c.rankUps, stings: v26c.stings, lastSting: v26c.lastSting, marks: v26c.marks || 0, rankFx: v26c.rankFx || 0, nearCam: v26c.nearCam || 0, skulls: v26c.skulls || 0, intensity, music: !!(window.Music && Music.sfxIn), musicI: window.Music ? Music.intensity : -1 }),
  headParts: () => particles.filter(p => p.v26head).map(p => ({ life: +p.life.toFixed(2), z: +p.z.toFixed(2), size: +p.size.toFixed(3) })),
  bench: (n = 400) => { const im = enemyFrames.S && enemyFrames.S.idle[0]; const t0 = performance.now(); for (let i = 0; i < n; i++) { V26C_CUT.delete(im); v26cCut(im); } return (performance.now() - t0) / n; } }; } // ms per utskärning
// HÅN (Boltgun, förslag 12): Y (valfri tangent), en valfri knapp på handkontrollen eller klockknappen i ALLA KNAPPAR väcker fienderna
// inom 10 rutor och ger de fyra närmaste en anfallspolett (SMART FIENDE-AI). Ett dödande inom 4 s ger +HÅNAD och extra stilpoäng.
// Nedkylning 8 s speltid. Bossar, väktare, slumrande mimicer och statyer berörs inte.
const V26C_TAUNTS = ['KOM HIT!', 'ÄR DET ALLT?', 'NÄSTA!', 'FRAM MED ER!'];
Object.assign(v26c, { tauntOn: true, taunts: 0, tauntT: -99, tauntUntil: -99, taunted: 0, tauntKills: 0, tauntDeny: 0, denyT: -9 });
ACTIONS.push(['KeyY', 'HÅNA']); // tangentbytet
GP_ACTS.push(['taunt', 'HÅNA', -1]); // handkontrollen: alla knappar är upptagna – ingen som standard, välj en under HANDKONTROLLEN
function v26cTaunt() {
  if (state !== 'play' || !run || !P || !map || !v26c.tauntOn) return false;
  if (tmr < v26c.tauntT + 8) { v26c.tauntDeny++; if (tmr - v26c.denyT > 1) { v26c.denyT = tmr; say(`HÅNET LADDAR: ${Math.ceil(v26c.tauntT + 8 - tmr)} S`, 0.8); } return false; }
  v26c.tauntT = tmr; v26c.tauntUntil = tmr + 4; v26c.taunts++;
  const near = [];
  for (const e of ents) { if (e.dead || e.dying || e.boss || e.guardian || e.dormant || e.hidden || e.asleep || e.dummy || !e.d) continue; const d = Math.hypot(e.x - P.x, e.y - P.y); if (d > 10) continue;
    alertEnemy(e, false); e.lx = P.x; e.ly = P.y; e.lostT = 0; near.push([d, e]); }
  near.sort((a, b) => a[0] - b[0]);
  if (settings.smartAI !== false) for (const [, e] of near.slice(0, 4)) try { ai24Grant(e, 0.6, true); } catch (er) { /* AI:n saknar fienden */ }
  v26c.taunted = near.length;
  say(V26C_TAUNTS[(v26c.taunts - 1) % V26C_TAUNTS.length], 1.2); play('bell', 0.45, 0.7); P.shake = Math.max(P.shake || 0, 0.25);
  return true;
}
function v26cTouchBtn() { // klockknappen i ALLA KNAPPAR (xtra: syns inte i den nya layouten); stilen läggs här så att index.html inte ändras
  const ui = document.getElementById('touch'); if (!ui || ui.querySelector('.tauntb')) return;
  ui.insertAdjacentHTML('beforeend', `<button class="tb tauntb xtra" data-act="taunt" aria-label="taunt"><img src="${A}touch/btn.png" alt=""><img class="ic" src="${A}touch/icon_bell.png" alt=""></button>`);
  const s = document.createElement('style');
  s.textContent = '#touch .tauntb { width: calc(var(--b) * .7); height: calc(var(--b) * .7); right: calc(var(--m) + 1vw + var(--b) * .95 + env(safe-area-inset-right, 0px)); bottom: calc(min(62.5vw, 100vh) * .2 + 1vh + var(--b) * 3.4 + var(--g) * 4); }'
    + ' @media (orientation: portrait) { #touch .tauntb { width: calc(var(--b) * .8); height: calc(var(--b) * .8); right: auto; left: var(--p); bottom: auto; top: calc(var(--cb) + 3vw + var(--b) * 3 + 9vw); } }';
  document.head.appendChild(s);
}
function v26cTouchUse() { // ANVÄND-knappen på pekskärmen: krok för version 26A (v26aTouchUse() ger true när ANVÄND ska synas) om den finns
  try { if (typeof v26aTouchUse === 'function' && v26aTouchUse()) return true; } catch (e) { /* valfritt – 26B har en egen rad (v26bWantsUse) */ }
  return false;
}

