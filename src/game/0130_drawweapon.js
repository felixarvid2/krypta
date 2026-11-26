function drawWeapon() {
  const { f, idx, dx, dy } = weaponFrame(), wa = wfxPose(f); // wa: vapenanimationernas extra förskjutning (Grafik: vapenanimationer)
  const amp = P.bobAmp * (1 - WS.aim * 0.75);
  const breathe = settings.bob === false ? 0 : Math.sin(tmr * 1.7) * 1.3 * (1 - Math.min(1, amp)); // vapnet andas i vila
  const insp = WA.off && WS.inspect > 0 ? Math.sin(Math.min(1, (1.6 - WS.inspect) / 1.6) * Math.PI) : 0;
  const ox = Math.round(Math.sin(P.bob) * 4 * amp * (settings.bob === false ? 0.3 : 1) - WS.swayX + dx - insp * 34 + wa.dx), oy = Math.round(P.runK * 12 + insp * 10 + wa.dy + P.jv * -2 + Math.abs(Math.cos(P.bob)) * 3 * amp * (settings.bob === false ? 0.3 : 1) - WS.swayY + dy + breathe + shakeAmt() * 4 * Math.sin(tmr * 41) + P.pitch * 0.6 + Math.sin(Math.min(1, WS.kick / 0.3) * Math.PI) * 14);
  const wdrop = Math.max(0, 208 - (f.y + f.h + WOY)); // vapen vars blad slutar ovanför skärmens underkant (närstrids- och kastvapnen) sänks så att de inte svävar
  const oy2 = Math.max(oy + WOY + wdrop, 201 - (f.y + f.h)); // vapenbladen ritades för den gamla vyhöjden; underkanten lyfter aldrig från skärmkanten (gung, hopp, sikte)
  const img = WF[WEAPONS[P.weapon].id] ? (legendOf(WEAPONS[P.weapon].id) && wimg[WEAPONS[P.weapon].id + '_legend']) || wimg[WEAPONS[P.weapon].id] : wimg.pistol;
  const L = clamp(lightAt(P.x, P.y) * 1.05 + P.flash * 4, 0.28, 1.25);
  if (wcan.width !== f.w || wcan.height !== f.h) { wcan.width = f.w; wcan.height = f.h; }
  wctx.globalCompositeOperation = 'source-over'; wctx.clearRect(0, 0, f.w, f.h);
  wctx.drawImage(img, idx * f.w, 0, f.w, f.h, 0, 0, f.w, f.h);
  v27WeaponBlood(f); // version 27 (BLOOD): blod på närstridsvapnet efter närstridsdödanden (före ljuset, så att det skuggas som vapnet)
  if (L < 1) { wctx.globalCompositeOperation = 'source-atop'; wctx.fillStyle = `rgba(${lvl.fog.join(',')},${(1 - L).toFixed(3)})`; wctx.fillRect(0, 0, f.w, f.h); }
  else if (L > 1) { wctx.globalCompositeOperation = 'source-atop'; wctx.fillStyle = `rgba(255,190,120,${((L - 1) * 0.6).toFixed(3)})`; wctx.fillRect(0, 0, f.w, f.h); }
  { const rs = curRunes(); if (rs.length) { const t = RUNES[rs[(tmr | 0) % rs.length]].tint; wctx.globalCompositeOperation = 'source-atop'; wctx.fillStyle = `rgba(${t[0]},${t[1]},${t[2]},${(0.1 + 0.07 * Math.sin(tmr * 4)).toFixed(3)})`; wctx.fillRect(0, 0, f.w, f.h); } } // runans glöd
  if (settings.skin && SKINS[settings.skin] && skinOpen(settings.skin)) { wctx.globalCompositeOperation = 'source-atop'; wctx.fillStyle = SKINS[settings.skin].col; wctx.fillRect(0, 0, f.w, f.h); } // vapenfärg
  wfxBlit(f, idx, ox, oy2); // vapnet (ev. vridet), svepspår och varm pipa
  if (WS.shot < 0.06 && state === 'play') { // mynningsflamma vid mynningen i just den här bildrutan
    const wp = WEAPONS[P.weapon], m = f.muzzle[idx], s = 34 * wp.flash * (1 - WS.shot / 0.06 * 0.4), mq = wfxPt(m[0] + ox, m[1] + oy2);
    const fx27m = fx27Muzzle(wp, mq, s); // version 27: mynningsflamma per vapentyp (den gamla ritas då genomskinlig)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (fx27m) ctx.globalAlpha = 0; // version 27
    ctx.translate(mq[0], mq[1]); ctx.rotate(Math.random() * TAU);
    ctx.drawImage(wimg.flash, -s / 2, -s / 2, s, s);
    ctx.restore();
  }
  wfxAfter(); // mynningsrök och hylsor i skärmen
}

// ---------- Grafik: vapenanimationer (VAPEN) ----------
// Procedurella rörelser ovanpå vapenbladen: omladdning per vapentyp (sänks, vrids, magasin ut/in, ryck), byte med lutning och överslag,
// landningsfjäder, språngbärning, inspektion, hylsor och mynningsrök i skärmen, glödande pipa efter långa skurar, svepspår för närstrid.
// Billigt per bildruta: inga getImageData, fasta tak på partiklarna, allt partikelaktigt av med lowfx; bob/reduceMotion dämpar rörelserna.
const WA = { off: false, lt: 0, rot: 0, lean: 0, slideK: 0, px: 0, py: 0, ly: 0, lv: 0, rk: 0, rv: 0, flick: 0, glint: 0, prevState: 'idle', prevLand: 0, prevShot: 99, prevK: 0, heat: 0, heatW: -1, heatIdle: 0, lastA: 0, lvl: null, shells: [], smoke: [], trail: [], n: { shells: 0, smoke: 0, trail: 0, reloads: 0, perfect: 0, lands: 0 } };
const WA_CAP = { shells: 8, smoke: 14, trail: 10 };
const WA_SHELL = { pistol: 0, rifle: 0, smg: 0, sniper: 0, shotgun: 1, dbshotgun: 1 }; // 1 = röd hagelpatron
const WA_MAGDROP = { pistol: 4, rifle: 6, smg: 7, sniper: 4, nailgun: 5 }; // magasinet som faller ur (halva höjden i px)
const WA_HEAT = { rifle: 0.03, smg: 0.025, nailgun: 0.03, prism: 0.035 }; // kulsprutor och spikgeväret blir varma
const WA_SMOKELESS = { flamer: 1, staff: 1, acidsprayer: 1, dreamstaff: 1, runebook: 1, prism: 1, windgun: 1, hivelauncher: 1 };
// omladdning som nyckelrutor: [k, dx, dy, vridning] (k = andel av omladdningstiden; magasinet är i vid 0.65)
const WA_RL = {
  mag: [0, 0, 0, 0, 0.16, -10, 22, 0.36, 0.26, -12, 32, 0.42, 0.32, -12, 26, 0.4, 0.5, -11, 28, 0.4, 0.58, -10, 17, 0.34, 0.63, -10, 25, 0.37, 0.74, -6, 20, 0.22, 0.79, -13, 22, 0.17, 0.86, -4, 13, 0.1, 1, 0, 0, 0],
  brk: [0, 0, 0, 0, 0.14, -4, 30, -0.22, 0.22, -6, 48, -0.3, 0.3, -6, 40, -0.28, 0.48, -4, 46, -0.3, 0.56, -4, 38, -0.27, 0.64, -4, 48, -0.3, 0.7, -2, 26, -0.14, 0.86, 0, 6, -0.03, 1, 0, 0, 0],
  heavy: [0, 0, 0, 0, 0.2, -10, 40, -0.2, 0.44, -12, 52, -0.24, 0.5, -12, 42, -0.22, 0.62, -12, 50, -0.24, 0.7, -8, 34, -0.16, 1, 0, 0, 0],
  crank: [0, 0, 0, 0, 0.22, 6, 30, 0.18, 0.38, 6, 40, 0.24, 0.52, 6, 31, 0.2, 0.68, 6, 42, 0.24, 0.84, 4, 18, 0.1, 1, 0, 0, 0],
  ram: [0, 0, 0, 0, 0.18, -4, 46, -0.12, 0.32, -4, 56, -0.12, 0.38, -4, 47, -0.12, 0.48, -4, 57, -0.12, 0.54, -4, 47, -0.12, 0.74, -2, 38, -0.08, 1, 0, 0, 0],
  insp: [0, 0, 0, 0, 0.18, -28, 14, -0.4, 0.44, -32, 12, -0.36, 0.6, 10, 8, 0.28, 0.82, 14, 10, 0.24, 0.95, 0, -3, 0, 1, 0, 0, 0]
};
const WA_PROF = { dbshotgun: 'brk', flaregun: 'brk', musket: 'ram', crossbow: 'crank', bow: 'crank', knives: 'crank', pinthrower: 'crank', launcher: 'heavy', flamer: 'heavy', acidsprayer: 'heavy', steamcannon: 'heavy', chaincannon: 'heavy', sawlauncher: 'heavy', hivelauncher: 'heavy', sporelauncher: 'heavy', trapthrower: 'heavy', blunderbuss: 'brk', brimstone: 'heavy', bombard: 'heavy' };
const waOut = { dx: 0, dy: 0, rot: 0 };
function waTrack(tr, k, o) { // jämn interpolation mellan nyckelrutorna (smoothstep)
  let i = 0; while (i + 4 < tr.length - 4 && tr[i + 4] < k) i += 4;
  const k0 = tr[i], k1 = tr[i + 4], u = k1 > k0 ? clamp((k - k0) / (k1 - k0), 0, 1) : 1, s = u * u * (3 - 2 * u);
  o.dx += tr[i + 1] + (tr[i + 5] - tr[i + 1]) * s; o.dy += tr[i + 2] + (tr[i + 6] - tr[i + 2]) * s; o.rot += tr[i + 3] + (tr[i + 7] - tr[i + 3]) * s;
}
const waMotion = () => settings.reduceMotion ? 0.35 : settings.bob === false ? 0.5 : 1; // tillgänglighet: lugnare rörelser
const waFx = () => !WA.off && !settings.lowfx; // partiklar, glöd och spår
const waReloadDur = wp => wp.reload * reloadMul() * (wp.musket && up('mk_fast') ? 0.6 : 1);
function wfxPose(f) { // anropas en gång per bildruta från drawWeapon: tillstånd, fjädrar och vapnets extra förskjutning/vridning
  const o = waOut; o.dx = 0; o.dy = 0; o.rot = 0;
  if (window.__game && !window.__game.wfx) window.__game.wfx = wfxApi;
  const dt = clamp(tmr - WA.lt, 0, 0.05); WA.lt = tmr;
  if (WA.lvl !== lvl) { WA.lvl = lvl; WA.shells.length = 0; WA.smoke.length = 0; WA.trail.length = 0; WA.heat = 0; WA.ly = WA.lv = WA.rk = WA.rv = 0; }
  if (WA.off) { WA.rot = 0; WA.prevState = WS.state; return o; }
  const wp = WEAPONS[P.weapon], st = f.states, mo = waMotion();
  // tillståndsbyten: omladdningen klar (ryck), perfekt omladdning (snärt + glimt), vapnet uppe (fjädrar), landning (dipp)
  if (WS.boost && !WA.prevBoost) { WA.lv -= 150; WA.rv -= 6; WA.flick = 0.32; WA.glint = settings.noFlash ? 0 : 0.3; WA.n.perfect++; WA.n.reloads++; } // perfekt (boost sätts bara då)
  else if (WA.prevState === 'reload' && WS.state === 'idle' && WS.shot > 0.05) { WA.lv -= 90; WA.rv -= 3.5; WA.n.reloads++; }
  WA.prevBoost = WS.boost;
  if (WA.prevState === 'draw' && WS.state === 'idle') WA.lv -= 70;
  if (WA.prevState !== 'reload' && WS.state === 'reload') WA.prevK = 0;
  WA.prevState = WS.state;
  if (P.landT > WA.prevLand + 0.01) { WA.lv += 290 * clamp(0.6 + P.landT * 3, 0.6, 1.2); WA.rv += 1.2; WA.n.lands++; } // landning: vapnet dippar och fjädrar
  WA.prevLand = P.landT;
  // fjädrar (dämpade) för dipp/ryck och vridningsknyck
  WA.lv += (-WA.ly * 210 - WA.lv * 15) * dt; WA.ly += WA.lv * dt; WA.ly = clamp(WA.ly, -30, 40);
  WA.rv += (-WA.rk * 160 - WA.rv * 13) * dt; WA.rk += WA.rv * dt; WA.rk = clamp(WA.rk, -0.6, 0.6);
  o.dy += WA.ly * mo; o.rot += WA.rk * mo;
  if (WA.flick > 0) { WA.flick = Math.max(0, WA.flick - dt); o.rot -= Math.sin((1 - WA.flick / 0.32) * Math.PI) * 0.35 * mo; o.dx -= Math.sin((1 - WA.flick / 0.32) * Math.PI) * 8 * mo; } // aktiv omladdning: snärt
  WA.glint = Math.max(0, WA.glint - dt);
  // byte: det gamla vapnet lutas ner, det nya kommer upp lutat och rätar på sig (fjädern ger överslaget)
  if (WS.state === 'draw') o.rot += 0.32 * (1 - easeOut(WS.t / drawTime())) * mo;
  else if (WS.state === 'holster') o.rot += 0.32 * easeIn(WS.t / 0.14) * mo;
  // omladdning per typ (vapen med egna omladdningsrutor behåller dem)
  else if (WS.state === 'reload' && !(st.reload && !wp.shellReload)) {
    if (wp.shellReload) { // hagel: lutas mot dig, liten vridning för varje patron; pumpen sist
      const k = clamp(WS.t / shellSeg(WS.shellPhase), 0, 1);
      o.rot += (WS.shellPhase === 'start' ? easeOut(k) : WS.shellPhase === 'end' ? 1 - easeIn(k) : 1) * 0.24 + (WS.shellPhase === 'step' ? Math.sin(k * Math.PI) * 0.07 : 0);
      if (WS.shellPhase === 'end') { o.dy += Math.sin(clamp(k * 2, 0, 1) * Math.PI) * 9; o.dx -= Math.sin(clamp(k * 2, 0, 1) * Math.PI) * 3; }
    } else {
      const k = clamp(WS.t / waReloadDur(wp), 0, 1);
      waTrack(WA_RL[WA_PROF[wp.id] || 'mag'], k, o);
      if (wp.id === 'dbshotgun' && WA.prevK < 0.3 && k >= 0.3) { waShellScreen(1, -1); waShellScreen(1, -1); } // pipan bryts: två röda hylsor åker ut bakåt
      if (WA_MAGDROP[wp.id] && WA.prevK < 0.26 && k >= 0.26 && waFx()) { if (WA.shells.length >= WA_CAP.shells) WA.shells.shift(); WA.shells.push({ x: WA.px - f.w * 0.25, y: Math.min(VH - 14, WA.py - f.h * 0.45), vx: rnd(-25, 5), vy: rnd(10, 40), r: 0.3, vr: rnd(-2, 2), mag: WA_MAGDROP[wp.id] }); } // magasinet faller ur
      WA.prevK = Math.max(WA.prevK, k); // en kärvad aktiv omladdning spolar tillbaka WS.t: magasin/hylsor kommer bara en gång
    }
  }
  // efter skottet: pumpen på hagelgeväret och slutstycket på prickskyttegeväret (hylsan kommer ut då) – bara om just det här vapnet sköt
  if (WA.curW !== P.weapon) { WA.curW = P.weapon; WA.shotW = -1; }
  const t0 = WA.shotW !== P.weapon ? -1 : wp.id === 'shotgun' ? 0.42 / (1 + mod('fireRate')) : wp.id === 'sniper' ? 0.42 : -1;
  if (t0 > 0 && WS.shot < t0 + 0.3) {
    const u = clamp((WS.shot - t0 + 0.12) / 0.27, 0, 1), s = Math.sin(u * Math.PI);
    if (wp.id === 'shotgun') { o.dy += s * 9; o.rot -= s * 0.05; } else { o.rot += s * 0.14; o.dx += s * 6; o.dy += s * 4; }
    if (WA.prevShot < t0 && WS.shot >= t0) waShellScreen(WA_SHELL[wp.id] || 0, 1);
  }
  WA.prevShot = WS.shot;
  // spring: bärs lägre och lutat; inspektion: visas från sidan och vänds
  o.rot += P.runK * 0.1 * mo; o.dx += P.runK * 7 * mo;
  waIdlePose(o, wp, mo); // viloliv: motorvapen vibrerar, båge/armborst andas (omgång 3)
  // sidled: vapnet lutar lite åt rörelsen; glidning: vapnet läggs ned åt vänster; rusning: dras bakåt/ned
  const lat = -Math.sin(P.a) * P.vx + Math.cos(P.a) * P.vy; WA.lean += (clamp(lat / 3.1, -1.2, 1.2) * 0.07 - WA.lean) * Math.min(1, dt * 8);
  WA.slideK += ((P.slide > 0 ? 1 : 0) - WA.slideK) * Math.min(1, dt * 12);
  o.rot += (WA.lean - WA.slideK * 0.22) * mo * (1 - WS.aim * 0.7); o.dy += WA.slideK * 10 * mo; o.dx -= WA.slideK * 8 * mo;
  if (P.dashT > 0) { o.dy += 8 * mo; o.dx -= 4 * mo; }
  if (WS.inspect > 0) { waTrack(WA_RL.insp, clamp(1 - WS.inspect / 1.6, 0, 1), o); o.rot += Math.sin(tmr * 5) * 0.02 * mo; }
  // värme: stiger med skurar, svalnar när du slutar skjuta
  if (WA.heatW !== P.weapon || !WA_HEAT[wp.id]) { WA.heatW = P.weapon; WA.heat = 0; }
  if (!waFx() && (WA.shells.length || WA.smoke.length || WA.trail.length)) { WA.shells.length = 0; WA.smoke.length = 0; WA.trail.length = 0; } // lowfx slogs på mitt i
  WA.heatIdle += dt; if (WA.heatIdle > 0.3) WA.heat = Math.max(0, WA.heat - dt * 0.28);
  // skärmpartiklar: hylsor, rök, spår
  if (dt > 0) waStep(dt);
  WA.rot = o.rot * clamp(110 / Math.max(f.w, f.h), 0.35, 1) * (settings.reduceMotion ? 0.45 : 1); // stora vapen (yxa, sköld) vrids mindre; lugnare rörelser vrider mindre
  return o;
}
function waStep(dt) {
  let da = P.a - WA.lastA; WA.lastA = P.a; da = Math.atan2(Math.sin(da), Math.cos(da)); const sx = -da * 160 / plane; // rök och hylsor stannar i världen när du vänder dig
  for (let i = WA.shells.length - 1; i >= 0; i--) { const s = WA.shells[i]; s.vy += 620 * dt; s.x += s.vx * dt + sx; s.y += s.vy * dt; s.r += s.vr * dt; if (s.y > VH + 12 || s.x > W + 12 || s.x < -12) WA.shells.splice(i, 1); }
  for (let i = WA.smoke.length - 1; i >= 0; i--) { const s = WA.smoke[i]; s.t += dt; s.x += s.vx * dt + sx; s.y += s.vy * dt; s.vx *= 1 - dt * 1.5; s.s += s.g * dt; if (s.t >= s.life) WA.smoke.splice(i, 1); }
  for (let i = WA.trail.length - 1; i >= 0; i--) { const p = WA.trail[i]; p.a -= dt * 5; p.x += sx; p.ix += sx; if (p.a <= 0) WA.trail.splice(i, 1); }
  // varm pipa: tunna rökslingor
  if (WA.heat > 0.45 && waFx() && Math.random() < dt * 10 * WA.heat && WA.mx !== undefined) waPuff(WA.mx, WA.my, 0.6);
}
function waShellScreen(big, dir) { // hylsa ut åt höger (dir 1) eller bakåt mot dig (dir -1) i skärmen
  if (!waFx() || state !== 'play') return;
  if (WA.shells.length >= WA_CAP.shells) WA.shells.shift();
  const x = WA.ex !== undefined ? WA.ex : W / 2 + 14, y = WA.ey !== undefined ? WA.ey : VH * 0.7;
  WA.shells.push(dir > 0 ? { x, y, vx: rnd(70, 125), vy: rnd(-170, -110), r: rnd(0, TAU), vr: rnd(12, 22) * (Math.random() < 0.5 ? -1 : 1), big }
    : { x: x - 6 + rnd(-4, 4), y: y + 4, vx: rnd(-40, 40), vy: rnd(-200, -150), r: rnd(0, TAU), vr: rnd(8, 16), big });
  WA.n.shells++;
}
function waPuff(x, y, k) { // en rökpuff vid mynningen
  if (WA.smoke.length >= WA_CAP.smoke) WA.smoke.shift();
  WA.smoke.push({ x: x + rnd(-1.5, 1.5), y: y + rnd(-1, 1), vx: rnd(-6, 10), vy: -rnd(10, 22) * (k < 1 ? 1.6 : 1), s: (k < 1 ? 3 : 5) + rnd(0, 2), g: k < 1 ? 7 : 14 + 8 * k, t: 0, life: (k < 1 ? 0.6 : 0.8 + 0.3 * k), a: k < 1 ? 0.16 : Math.min(0.42, 0.18 + 0.12 * k), fi: (Math.random() * 3) | 0 });
  WA.n.smoke++;
}
function wfxShell(big) { // krok från ejectShell: hylsan i skärmen (hagel och prickskytte kastar ut den när pumpen/slutstycket går)
  const wp = WEAPONS[P.weapon]; if (!wp || !(wp.id in WA_SHELL) || !waFx()) return;
  if (wp.id === 'shotgun' || wp.id === 'sniper' || wp.id === 'dbshotgun') return; // pumpen/slutstycket/brytningen sköter det
  waShellScreen(big ? 1 : 0, 1);
}
function wfxSmoke() { // krok från muzzleSmoke: puffar i skärmen och värme i pipan
  const wp = WEAPONS[P.weapon]; if (!wp || WA.off) return;
  if (WA_HEAT[wp.id]) { WA.heat = Math.min(1, WA.heat + WA_HEAT[wp.id]); WA.heatIdle = 0; }
  WA.shotW = P.weapon;
  WA.rv -= Math.min(3.2, (wp.kick || 0) * 1.1) * (1 - WS.aim * 0.6) * (Math.random() < 0.5 ? 0.8 : 1.1) * Math.min(1, settings.shake ?? 1); // rekylen vrider vapnet en aning (fjädern drar tillbaka)
  if (!waFx() || WA_SMOKELESS[wp.id] || wp.melee || !(wp.flash > 0.25) || WA.mx === undefined) return;
  const n = wp.flash >= 1.4 ? 3 : wp.flash >= 0.9 ? 2 : 1;
  for (let i = 0; i < n; i++) waPuff(WA.mx, WA.my, wp.flash);
}
const WA_MELEE = { axe: 1, hammer: 1, pickaxe: 1, scimitar: 1, flail: 1, trident: 1, hookchain: 1, censer: 1, whip: 1, mirrorshield: 1, shears: 1 };
let waGlow = null;
function waGlowCan() { // liten förritad glöd (ingen gradient per bildruta)
  if (waGlow) return waGlow; waGlow = document.createElement('canvas'); waGlow.width = waGlow.height = 32; const g = waGlow.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,170,80,1)'); gr.addColorStop(0.45, 'rgba(255,70,20,0.55)'); gr.addColorStop(1, 'rgba(255,40,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return waGlow;
}
WA.tips = {};
function waTip(id, idx, f) { // närstridsrutans "arm": riktningen greppet → tyngdpunkten och räckvidden; räknas en gång per ruta (wcan har rutan just nu)
  const key = id + ':' + idx; if (WA.tips[key]) return WA.tips[key];
  const gx = f.w * 0.6, gy = f.h; let sx = 0, sy = 0, n = 0, r2 = 0;
  try { if (!WA.tcan) { WA.tcan = document.createElement('canvas'); WA.tctx = WA.tcan.getContext('2d', { willReadFrequently: true }); } // läses från en egen duk, inte från wcan
    WA.tcan.width = f.w; WA.tcan.height = f.h; WA.tctx.drawImage(wcan, 0, 0); const d = WA.tctx.getImageData(0, 0, f.w, f.h).data; for (let y = 0; y < f.h; y += 2) for (let x = 0; x < f.w; x += 2) if (d[(y * f.w + x) * 4 + 3] > 128) { sx += x; sy += y; n++; const q = (x - gx) * (x - gx) + (y - gy) * (y - gy); if (q > r2) r2 = q; } } catch (e) { /* t.ex. otillgänglig bild */ }
  if (!n) return (WA.tips[key] = [f.w * 0.3, f.h * 0.3, f.w * 0.45, f.h * 0.6]);
  const ux = sx / n - gx, uy = sy / n - gy, l = Math.hypot(ux, uy) || 1, r = Math.sqrt(r2) * 0.95;
  return (WA.tips[key] = [gx + ux / l * r, gy + uy / l * r, gx + ux / l * r * 0.5, gy + uy / l * r * 0.5]); // ytterkant och innerkant för svepet
}
let waPuffs = null;
function waPuffCan() { // tre förritade rökpuffar (klumpiga, mjuka kanter) i 16×16
  if (waPuffs) return waPuffs; waPuffs = [];
  for (let n = 0; n < 3; n++) { const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d');
    for (let i = 0; i < 4; i++) { const x = 5 + ((n * 7 + i * 5) % 7), y = 5 + ((n * 3 + i * 4) % 6), r = 4 + ((n + i) % 3), gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(225,220,210,0.9)'); gr.addColorStop(0.6, 'rgba(190,185,175,0.5)'); gr.addColorStop(1, 'rgba(160,155,150,0)'); g.fillStyle = gr; g.fillRect(0, 0, 16, 16); }
    waPuffs.push(c); }
  return waPuffs;
}
function wfxPt(x, y) { // punkt på vapnet → skärmen när vapnet är vridet
  if (!WA.rot) return [x, y]; const c = Math.cos(WA.rot), s = Math.sin(WA.rot), dx = x - WA.px, dy = y - WA.py; return [WA.px + dx * c - dy * s, WA.py + dx * s + dy * c];
}
function wfxBlit(f, idx, ox, oy2) { // ritar vapnet (ev. vridet) med spår före och värmeglöd på pipan
  const wp = WEAPONS[P.weapon], fx0 = f.x + ox, fy0 = f.y + oy2, on = waFx();
  WA.px = Math.round(fx0 + f.w * 0.6); WA.py = Math.round(fy0 + f.h); if (Math.abs(WA.rot) < 0.004) WA.rot = 0;
  const m = f.muzzle[idx] || f.muzzle[0], mp = wfxPt(m[0] + ox, m[1] + oy2); WA.mx = mp[0]; WA.my = mp[1];
  const ep = wfxPt(m[0] + ox + Math.min(16, f.w * 0.22), m[1] + oy2 + Math.min(26, f.h * 0.22)); WA.ex = ep[0]; WA.ey = ep[1];
  // svepspår: bladets spets följs genom svingen (interpolerat mellan rutorna)
  if (on && WA_MELEE[wp.id] && f.states.fire && WS.shot > (f.dur.fire || 0.5) * 0.1 && WS.shot < (f.dur.fire || 0.5) * 0.72) { // själva hugget (inte upptagningen och återgången)
    const fr = f.states.fire, u = clamp(WS.shot / (f.dur.fire || 0.5), 0, 0.999) * fr.length, i0 = Math.floor(u), a = waTip(wp.id, idx, f), b = WA.tips[wp.id + ':' + fr[Math.min(fr.length - 1, i0 + 1)]] || a, w = fr[i0] === idx ? u - i0 : 0;
    const tp = wfxPt(a[0] + (b[0] - a[0]) * w + f.x + ox, a[1] + (b[1] - a[1]) * w + f.y + oy2), ip = wfxPt(a[2] + (b[2] - a[2]) * w + f.x + ox, a[3] + (b[3] - a[3]) * w + f.y + oy2), last = WA.trail[WA.trail.length - 1];
    if (!last || Math.abs(last.x - tp[0]) + Math.abs(last.y - tp[1]) > 3) { if (WA.trail.length >= WA_CAP.trail) WA.trail.shift(); WA.trail.push({ x: tp[0], y: tp[1], ix: ip[0], iy: ip[1], a: 1 }); WA.n.trail++; }
  }
  const drawTrail = () => { // svepet (ritas över vapnet): en halvgenomskinlig skära mellan bladets bana och en inre bana mot handtaget, med ljus kant
    if (!on || WA.trail.length < 2) return;
    ctx.save(); ctx.lineCap = 'round';
    const tc = (legendOf(wp.id) && LEGENDS[legendOf(wp.id)] && LEGENDS[legendOf(wp.id)].tint) || [255, 240, 215];
    for (let i = 1; i < WA.trail.length; i++) {
      const p = WA.trail[i - 1], q = WA.trail[i], k = i / WA.trail.length, a = Math.min(p.a, q.a) * (0.35 + 0.65 * k);
      ctx.fillStyle = `rgba(${tc[0]},${tc[1]},${tc[2]},${(a * 0.42).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.lineTo(q.ix, q.iy); ctx.lineTo(p.ix, p.iy); ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i < WA.trail.length; i++) { const p = WA.trail[i - 1], q = WA.trail[i], k = i / WA.trail.length, a = Math.min(p.a, q.a) * k; ctx.strokeStyle = `rgba(255,255,255,${(a * 0.75).toFixed(3)})`; ctx.lineWidth = 1 + k * 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
    ctx.restore();
  };
  // varm pipa: vapenpixlarna nära mynningen blir röda/orange
  if (on && WA.heat > 0.3) { const k = (WA.heat - 0.3) / 0.7, s = Math.max(16, f.w * 0.5); wctx.globalCompositeOperation = 'source-atop'; wctx.globalAlpha = Math.min(0.8, k * 0.9); wctx.drawImage(waGlowCan(), m[0] - f.x - s / 2, m[1] - f.y - s * 0.35, s, s); wctx.globalAlpha = 1; wctx.globalCompositeOperation = 'source-over'; }
  if (on && WA.glint > 0) { wctx.globalCompositeOperation = 'source-atop'; wctx.fillStyle = `rgba(255,225,120,${(WA.glint / 0.3 * 0.45).toFixed(3)})`; wctx.fillRect(0, 0, f.w, f.h); wctx.globalCompositeOperation = 'source-over'; } // perfekt omladdning: guldglimt
  waLegendGlint(f, wp); // legendarisk guldglimt (omgång 3)
  if (wp.id in WA_MAGIC) { const t = waTop(wp.id, idx, f), q = wfxPt(t[0] + fx0, t[1] + fy0); WA.tx = q[0]; WA.ty = q[1]; } else WA.tx = WA.ty = undefined; // magiska vapen: glöden vid spetsen
  if (WA.rot) { ctx.save(); ctx.translate(WA.px, WA.py); ctx.rotate(WA.rot); ctx.drawImage(wcan, fx0 - WA.px, fy0 - WA.py); ctx.restore(); }
  else ctx.drawImage(wcan, fx0, fy0);
  drawTrail();
  if (on && WA.heat > 0.3 && !settings.noFlash) { const k = (WA.heat - 0.3) / 0.7, s = 10 + 8 * k; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k * (0.32 + 0.06 * Math.sin(tmr * 9)); ctx.drawImage(waGlowCan(), WA.mx - s / 2, WA.my - s / 2, s, s); ctx.restore(); }
}
// viloliv per vapentyp (omgång 3): magi glöder och svävande korn, motor/såg vibrerar, båge/armborst andas, eldvapen har en liten låga, legendariska glimtar
const WA_MAGIC = { staff: [150, 190, 255], prism: null, dreamstaff: [200, 160, 255], runebook: [255, 200, 120], starlance: [255, 240, 170] }; // null = regnbåge
const WA_MOTOR = { sawlauncher: 1, chaincannon: 1, steamcannon: 1 }, WA_BREATH = { bow: 1, crossbow: 1 }, WA_PILOT = { flamer: 1, flaregun: 1 };
WA.motes = []; WA.glowC = {}; WA.gl = 0;
const waIdleOn = () => !WA.off && !settings.lowfx && !settings.reduceMotion && state === 'play' && WS.state === 'idle' && WS.shot > 0.4;
function waGlowCol(c) { // förritad glöd i en färg (en gång per färg)
  const k = c.join(','); if (WA.glowC[k]) return WA.glowC[k]; const cv = document.createElement('canvas'); cv.width = cv.height = 16; const g = cv.getContext('2d'), gr = g.createRadialGradient(8, 8, 0, 8, 8, 8);
  gr.addColorStop(0, `rgba(${k},1)`); gr.addColorStop(0.5, `rgba(${k},0.45)`); gr.addColorStop(1, `rgba(${k},0)`); g.fillStyle = gr; g.fillRect(0, 0, 16, 16); return (WA.glowC[k] = cv);
}
const waRainbow = () => { const h = (tmr * 0.4) % 1, i = (h * 6) | 0, f = h * 6 - i, q = Math.round(255 * (1 - f)), t = Math.round(255 * f); return [[255, t, 90], [q, 255, 90], [90, 255, t], [90, q, 255], [t, 90, 255], [255, 90, q]][i]; };
function waIdlePose(o, wp, mo) { // vibration och andning (bara i vila)
  if (!waIdleOn()) return;
  if (WA_MOTOR[wp.id]) { o.dx += Math.sin(tmr * 63) * 0.7 * mo; o.dy += Math.sin(tmr * 51 + 1) * 0.6 * mo; }
  else if (WA_BREATH[wp.id]) { o.rot += Math.sin(tmr * 1.3) * 0.018 * mo; o.dy += Math.sin(tmr * 1.3 + 0.6) * 1.2 * mo; }
}
function waIdleDraw(f, wp) { // glöd, korn, låga och legendarisk glimt i skärmen
  const dt = clamp(tmr - (WA.idT || 0), 0, 0.05); WA.idT = tmr;
  for (let i = WA.motes.length - 1; i >= 0; i--) { const m = WA.motes[i]; m.t += dt; m.y += m.vy * dt; m.x += Math.sin(m.t * 4 + m.ph) * 6 * dt; if (m.t >= m.life) WA.motes.splice(i, 1); }
  if (!waIdleOn() || WA.mx === undefined) { if (!waIdleOn()) WA.motes.length = 0; return; }
  const magic = wp.id in WA_MAGIC, col = magic ? WA_MAGIC[wp.id] || waRainbow() : null;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (magic) { // pulserande glöd vid spetsen och svävande korn
    const tx = WA.tx ?? WA.mx, ty = WA.ty ?? WA.my, s = 20 + Math.sin(tmr * 3) * 4; ctx.globalAlpha = 0.42 + 0.16 * Math.sin(tmr * 2.3); ctx.drawImage(waGlowCol(col), tx - s / 2, ty - s / 2, s, s);
    if (WA.motes.length < 8 && Math.random() < dt * 5) WA.motes.push({ x: tx + rnd(-8, 8), y: ty + rnd(-2, 8), vy: -rnd(6, 14), t: 0, life: rnd(0.8, 1.4), ph: rnd(0, 6), col: col.slice() });
    for (const m of WA.motes) { const a = Math.sin(m.t / m.life * Math.PI); ctx.globalAlpha = a * 0.9; ctx.fillStyle = `rgb(${m.col[0]},${m.col[1]},${m.col[2]})`; ctx.fillRect(Math.round(m.x), Math.round(m.y), 1 + (m.t < 0.3 ? 1 : 0), 1); }
  } else if (WA_PILOT[wp.id]) { // liten låga/glöd vid mynningen
    const fl = 0.75 + 0.25 * Math.sin(tmr * 23) * Math.sin(tmr * 7.1), s = (wp.id === 'flamer' ? 9 : 6) * fl;
    ctx.globalAlpha = 0.55; ctx.drawImage(waGlowCol(wp.id === 'flamer' ? [90, 140, 255] : [255, 110, 60]), WA.mx - s / 2, WA.my - s / 2, s, s);
    ctx.globalAlpha = 0.5 * fl; ctx.drawImage(waGlowCol([255, 170, 70]), WA.mx - s * 0.35, WA.my - s * 1.1, s * 0.7, s * 0.9);
  }
  ctx.restore();
}
WA.tops = {};
function waTop(id, idx, f) { // vapenbildens översta ogenomskinliga pixel (spetsen), en gång per vapen och ruta; läses från en egen duk
  const key = id + ':' + idx; if (WA.tops[key]) return WA.tops[key];
  let r = [f.w * 0.5, 4];
  try { if (!WA.tcan) { WA.tcan = document.createElement('canvas'); WA.tctx = WA.tcan.getContext('2d', { willReadFrequently: true }); }
    WA.tcan.width = f.w; WA.tcan.height = f.h; WA.tctx.drawImage(wcan, 0, 0); const d = WA.tctx.getImageData(0, 0, f.w, f.h).data;
    find: for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (d[(y * f.w + x) * 4 + 3] > 128) { let x2 = x; while (x2 + 1 < f.w && d[(y * f.w + x2 + 1) * 4 + 3] > 128) x2++; r = [(x + x2) / 2, y + 3]; break find; } } catch (e) { /* t.ex. otillgänglig bild */ }
  return (WA.tops[key] = r);
}
function waLegendGlint(f, wp) { // legendariska vapen: en guldglimt sveper över vapnet då och då (på wcan, innan det ritas)
  if (!legendOf(wp.id) || !waIdleOn() || settings.noFlash) return;
  const u = (tmr % 3.6) / 0.45; if (u >= 1) return; WA.gl++;
  const x = -f.w * 0.3 + u * f.w * 1.6; wctx.save(); wctx.globalCompositeOperation = 'source-atop'; wctx.globalAlpha = 0.55 * Math.sin(u * Math.PI);
  wctx.fillStyle = '#fff0b0'; wctx.beginPath(); wctx.moveTo(x, 0); wctx.lineTo(x + 7, 0); wctx.lineTo(x + 7 - f.h * 0.5, f.h); wctx.lineTo(x - f.h * 0.5, f.h); wctx.closePath(); wctx.fill(); wctx.restore();
}
function wfxAfter() { // rök och hylsor ovanpå vapnet
  waIdleDraw(null, WEAPONS[P.weapon]); // viloliv (omgång 3)
  if (!WA.off && WS.state === 'reload' && WS.shellPhase === 'step' && WEAPONS[P.weapon].shellReload) { // hagelpatronen trycks upp i magasinet
    const k = clamp(WS.t / shellSeg('step'), 0, 1); if (k < 0.62) { const x = Math.round(WA.ex - 10 - k * 4), y = Math.round(VH + 6 - Math.sin(k / 0.62 * Math.PI * 0.5) * 30);
      ctx.fillStyle = '#9c1e18'; ctx.fillRect(x, y, 4, 9); ctx.fillStyle = '#e0503a'; ctx.fillRect(x, y, 1, 9); ctx.fillStyle = '#d8b050'; ctx.fillRect(x, y + 7, 4, 3); }
  }
  if (!waFx() || (!WA.smoke.length && !WA.shells.length)) return;
  const sm = waPuffCan(); ctx.save();
  for (const s of WA.smoke) { const k = s.t / s.life; ctx.globalAlpha = s.a * (1 - k) * Math.min(1, k * 8 + 0.3); const sz = Math.round(s.s); ctx.drawImage(sm[s.fi % 3], Math.round(s.x - sz / 2), Math.round(s.y - sz / 2), sz, sz); }
  ctx.globalAlpha = 1;
  for (const s of WA.shells) {
    ctx.save(); ctx.translate(Math.round(s.x), Math.round(s.y)); ctx.rotate(s.r);
    if (s.mag) { const h = s.mag; ctx.fillStyle = '#26221e'; ctx.fillRect(-3, -h, 6, h * 2); ctx.fillStyle = '#4a443c'; ctx.fillRect(-3, -h, 1, h * 2); ctx.fillStyle = '#c89a3a'; ctx.fillRect(-2, -h - 1, 3, 1); } // tomt magasin (mässing överst)
    else if (s.big) { ctx.fillStyle = '#b8241c'; ctx.fillRect(-3, -1, 5, 3); ctx.fillStyle = '#e85a3c'; ctx.fillRect(-3, -1, 5, 1); ctx.fillStyle = '#d8b050'; ctx.fillRect(2, -1, 2, 3); }
    else { ctx.fillStyle = '#b8862c'; ctx.fillRect(-2, -1, 4, 2); ctx.fillStyle = '#ffe08a'; ctx.fillRect(-2, -1, 4, 1); }
    ctx.restore();
  }
  ctx.restore();
}
const wfxApi = {
  state: () => ({ off: WA.off, rot: WA.rot, ly: WA.ly, heat: WA.heat, shells: WA.shells.length, smoke: WA.smoke.length, trail: WA.trail.length, n: Object.assign({}, WA.n), glint: WA.glint, flick: WA.flick }),
  pose: () => ({ dx: waOut.dx, dy: waOut.dy, rot: WA.rot }),
  setOff: v => { WA.off = !!v; },
  idle: () => ({ on: waIdleOn(), motes: WA.motes.length, glints: WA.gl }),
  caps: () => Object.assign({}, WA_CAP),
  fill: () => { for (let i = 0; i < WA_CAP.shells; i++) waShellScreen(i & 1, 1); for (let i = 0; i < WA_CAP.smoke; i++) waPuff(W / 2, VH * 0.6, 1); WA.heat = 1; }, // prov: fyll till taket
  bench: (n = 300) => { const ts = [], T0 = performance.now(); for (let i = 0; i < n; i++) { const t0 = performance.now(); drawWeapon(); ts.push(performance.now() - t0); } const mean = (performance.now() - T0) / n; ts.sort((a, b) => a - b); return { mean, med: ts[n >> 1], p90: ts[(n * 0.9) | 0] }; }
};

// ---------- Grafik: projektiler och explosioner (VAPEN, omgång 2) ----------
// Spår efter projektilerna (rök/glöd för granater, flimmer för bloss, ljussvans för magi och fiendeskott), nedslag efter väggmaterial
// (gnistor i metall, flisor i trä, damm och flis i sten, isskärvor i frostbiomen), explosioner i flera steg (blixt → eldklot som växer →
// rökmoln som stiger och dröjer kvar) med chockvågsring, skräp och ett ljus som falnar. Allt via den vanliga partikellistan med budget
// (inga nya spår när listan är nästan full), lowfx stänger av partiklarna; det billiga ljuset finns kvar.
const WP = { sched: [], lights: [], n: { trail: 0, booms: 0, stages: 0, smoke: 0, ring: 0, debris: 0, impacts: { metal: 0, wood: 0, stone: 0, ice: 0 }, die: 0 } };
let WP_BUDGET = 150, WP_HARD = 215; // spår slutar när listan har 150 partiklar; nedslag och explosioner fyller på till 215 (miljön stannar vid 180–200, FIENDER vid 235, taket i updateParticles är 260)
function wpLight(x, y, t, r, s, col, merge) { // ett ljus som falnar; kedjeexplosioner förnyar ett ljus i närheten i stället för att stapla nya
  if (merge) for (const l of WP.lights) if (Math.abs(l.x - x) + Math.abs(l.y - y) < 1.5 && l.life >= t * 0.5) { l.t = l.life = Math.max(l.life, t); l.s = Math.max(l.s, s); return; }
  if (WP.lights.length < 8) WP.lights.push({ x, y, t, life: t, r, s, col });
}
const WP_SMOKE = { gren: 1, pgren: 1, cball: 1, barrel: 1, pchain: 1 }, WP_FIRE = { flare: 1, spark: 1 }, WP_MAGIC = { sorb: [150, 200, 255], dstar: [255, 200, 255], pspore: [170, 255, 120], prune: [255, 120, 200] };
const WP_SKIP = { arrow: 1, stone: 1, web: 1, bandage: 1, log: 1, rock: 1, axe: 1, knife: 1, nail: 1, parrow: 1, harpoon: 1, saw: 1, pbee: 1, boom: 1, spear: 1, pshears: 1, ppin: 1 };
const wpOn = () => !settings.lowfx && !WP.off;
const WP_BIOME_MAT = { library: 'wood', ship: 'wood', forest: 'wood', garden: 'wood', jungle: 'wood', circus: 'wood', hive: 'wood', clock: 'metal', foundry: 'metal', lab: 'metal', observatory: 'metal', frost: 'ice', crystal: 'glass', mirror: 'glass', dream: 'glass' };
function wpPart(p, hard) { if (particles.length >= (hard ? WP_HARD : WP_BUDGET)) return false; if (p.maxLife === undefined) p.maxLife = p.life; particles.push(p); return true; }
const wpImg = (n, i = 0) => (fx.parts[n] && fx.parts[n][i % fx.parts[n].length]) || fx.hit[1];
function wpProjTick(dt) { // anropas först i updateProjectiles: spår och schemalagda explosionssteg
  if (window.__game && !window.__game.wproj) window.__game.wproj = wpApi;
  for (let i = WP.sched.length - 1; i >= 0; i--) { const s = WP.sched[i]; s.t -= dt; if (s.t <= 0) { WP.sched.splice(i, 1); if (wpOn()) { s.fn(); WP.n.stages++; } } }
  for (let i = WP.lights.length - 1; i >= 0; i--) if ((WP.lights[i].t -= dt) <= 0) WP.lights.splice(i, 1);
  if (!wpOn() || dt <= 0) return;
  for (const p of projectiles) {
    if (p.dead || WP_SKIP[p.kind]) continue;
    const dx = p.x - P.x, dy = p.y - P.y; if (dx * dx + dy * dy > 256) continue; // bara nära spelaren
    if (!p.friendly && PROJ_DRAW_V8[p.kind] && !PROJ_TINT[p.kind]) continue; // specialritade fiendeskott utan egen färg: inget spår
    const smoke = WP_SMOKE[p.kind], fire = WP_FIRE[p.kind], magic = p.friendly ? WP_MAGIC[p.kind] : p.kind === 'skull' ? [120, 190, 255] : PROJ_TINT[p.kind] || [255, 140, 60];
    if (!smoke && !fire && !magic) continue;
    p._wt = (p._wt || 0) + dt; const every = smoke ? 0.045 : fire ? 0.035 : 0.03; if (p._wt < every) continue; p._wt = 0;
    const z = (p.z ?? 0.5) - (p.kind === 'pgren' ? 0 : 0.12), bx = p.x - p.vx * 0.02, by = p.y - p.vy * 0.02;
    if (smoke) { // rökspår + glöd
      if (!wpPart({ x: bx, y: by, z, vx: rnd(-0.1, 0.1), vy: rnd(-0.1, 0.1), vz: 0.22, life: 0.75, frames: fx.parts.smoke || fx.hit, img: wpImg('smoke'), size: 0.1, drift: true, tint: [150, 145, 140] })) return;
      if (Math.random() < 0.5) wpPart({ x: bx, y: by, z, vx: 0, vy: 0, vz: 0, life: 0.16, img: fx.hit[1], size: 0.06, add: true, tint: [255, 170, 70], fade: true });
    } else if (fire) { // blosset flimrar och sprutar glöd
      if (!wpPart({ x: bx, y: by, z, vx: rnd(-0.3, 0.3), vy: rnd(-0.3, 0.3), vz: rnd(0.2, 0.6), life: 0.26, frames: fx.parts.flame || fx.fire, img: wpImg('flame'), size: 0.1 + Math.random() * 0.05, add: true, tint: PROJ_TINT[p.kind] || [255, 120, 60], drift: true })) return;
      if (Math.random() < 0.35) wpPart({ x: bx, y: by, z, vx: rnd(-0.8, 0.8), vy: rnd(-0.8, 0.8), vz: rnd(0.5, 1.5), life: 0.5, img: wpImg('ember'), size: 0.025, add: true, tint: [255, 190, 90], grav: true });
    } else if (!wpPart({ x: bx, y: by, z: z + 0.04, vx: 0, vy: 0, vz: 0, life: 0.24, img: fx.hit[1], size: p.big ? 0.24 : 0.19, add: true, tint: magic })) return; // ljussvans i skottets färg (ca 8 punkter per skott)
    WP.n.trail++;
  }
}
function wpLights(flashLight) { for (const l of WP.lights) flashLight(l.x, l.y, l.s * Math.pow(l.t / l.life, 1.6), l.r, l.col); } // ljus som falnar (anropas från updateLight)
function wpBoom(x, y, r, big) { // explosionens steg; den gamla blixten, eldkloten och sotet finns kvar
  WP.n.booms++;
  wpLight(x, y, 1.3, Math.min(7, 3 + r * 1.4) | 0, big ? 2.4 : 1.7, [255, 120, 40], true); // ljuset falnar (förnyas vid kedjeexplosioner)
  if (!wpOn() || solid(x, y)) return;
  const k = clamp(r / 2, 0.6, 1.8);
  if (!settings.noFlash) wpPart({ x, y, z: 0.4, vx: 0, vy: 0, vz: 0, life: 0.09, img: fx.fireball[0], size: 0.7 * k, add: true, tint: [255, 250, 225] }, true); // blixten
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + rnd(-0.1, 0.1), sp = (3 + r) * rnd(0.85, 1.1); // chockvågsring på golvet
    if (wpPart({ x: x + Math.cos(a) * 0.2, y: y + Math.sin(a) * 0.2, z: 0.03, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0, life: 0.34, frames: i & 1 ? fx.parts.smoke || null : null, img: i & 1 ? wpImg('smoke') : fx.hit[1], size: i & 1 ? 0.15 : 0.09, add: true, tint: i & 1 ? [170, 135, 95] : [255, 160, 70], fade: true }, true)) WP.n.ring++; } // glöd och dammrök i ringen
  for (let i = 0; i < 7; i++) { const a = rnd(0, TAU), sp = rnd(1.2, 3.2); // skräp som studsar
    if (wpPart({ x, y, z: 0.15, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(1.8, 3.6), life: rnd(0.9, 1.5), img: i < 4 ? wpImg('rock') : wpImg('ember', i), size: i < 4 ? rnd(0.022, 0.038) : 0.03, grav: true, bounce: true, add: i >= 4, tint: i < 4 ? [160, 140, 120] : [255, 150, 60] }, true)) WP.n.debris++; } // sten och glödande bitar
  sparks(x, y, 0.4, big ? 8 : 5);
  WP.sched.push({ t: 0.05, fn: () => { for (let i = 0; i < 4; i++) wpPart({ x: x + rnd(-0.35, 0.35) * k, y: y + rnd(-0.35, 0.35) * k, z: rnd(0.25, 0.6), vx: rnd(-0.4, 0.4), vy: rnd(-0.4, 0.4), vz: 0, life: 0.45, frames: fx.fireball, img: fx.fireball[0], size: 0.62 * k, add: true }, true); } }); // eldklotet växer
  WP.sched.push({ t: 0.14, fn: () => { for (let i = 0; i < 2; i++) wpPart({ x: x + rnd(-0.2, 0.2), y: y + rnd(-0.2, 0.2), z: 0.55, vx: 0, vy: 0, vz: 0.7, life: 0.55, frames: fx.fireball, img: fx.fireball[0], size: 0.95 * k, add: true, drift: true }, true); } });
  WP.sched.push({ t: 0.32, fn: () => { const f = fx.parts.smoke2 || fx.parts.smoke || fx.hit; for (let i = 0; i < (big ? 6 : 4); i++) if (wpPart({ x: x + rnd(-0.5, 0.5) * k, y: y + rnd(-0.5, 0.5) * k, z: rnd(0.35, 0.8), vx: rnd(-0.2, 0.2), vy: rnd(-0.2, 0.2), vz: rnd(0.22, 0.4), life: rnd(1.9, 2.8), frames: f, img: f[0], size: rnd(0.36, 0.55) * k, drift: true, tint: [135, 128, 120] }, true)) WP.n.smoke++; } }); // rökmolnet stiger, dröjer kvar och löses upp (rutorna följer livet)
}
const WP_TEXMAT = {}; // väggtecken → material efter texturens namn (räknas en gång per tecken)
function wpTexMat(cell) {
  const c = cell === '*' && lvl ? lvl.secretWall : cell; if (c in WP_TEXMAT) return WP_TEXMAT[c];
  const n = wallTexFor[c] || ''; let m = null;
  if (/frost|ice/.test(n)) m = 'ice';
  else if (/crystal|mirror|stainedglass|jars|dream/.test(n)) m = 'glass';
  else if (/iron|brass|gear|pipe|cage|furnace|plate/.test(n)) m = 'metal';
  else if (/forest|house|bookshelf|libpanel|timber|hull|rigging|tent|wood|hedge/.test(n)) m = 'wood';
  else if (n && !/boss/.test(n)) m = 'stone';
  return (WP_TEXMAT[c] = m);
}
function wpImpact(x, y, z, cell, dx, dy) { // kulnedslag efter väggens material
  if (!wpOn() || particles.length >= WP_HARD) return;
  let mat = wallMat(cell); if (mat === 'stone') mat = wpTexMat(cell) || (lvl && WP_BIOME_MAT[lvl.biome]) || 'stone'; // vanliga väggar: texturens namn, annars biomens material
  const glass = mat === 'glass'; if (glass) mat = 'ice'; // glas/kristall splittras som is, men glittrar i biomens färg
  WP.n.impacts[mat]++;
  fx27Impact(x, y, z, glass ? 'glass' : mat, dx, dy); // version 27: förstärkta nedslag efter material
  if (glass) for (let i = 0; i < 3; i++) wpPart({ x, y, z, vx: -dx * rnd(0.5, 1.5) + rnd(-0.8, 0.8), vy: -dy * rnd(0.5, 1.5) + rnd(-0.8, 0.8), vz: rnd(0.4, 1.6), life: 0.4, img: fx.hit[2], size: 0.025, add: true, grav: true, tint: BIOME_TINT[lvl.biome] || [220, 230, 255] }, true);
  const ox = -dx, oy = -dy, out = (s, j) => [ox * s + rnd(-j, j), oy * s + rnd(-j, j)];
  if (mat === 'metal') { for (let i = 0; i < 5; i++) { const [vx, vy] = out(rnd(1.2, 2.8), 1.2); wpPart({ x, y, z, vx, vy, vz: rnd(0.4, 2.4), life: 0.28, img: fx.hit[2], size: 0.03, add: true, tint: [255, 240, 190], grav: true }, true); } if (!settings.noFlash) wpLight(x, y, 0.07, 2, 1.2, [255, 225, 160]); }
  else if (mat === 'wood') { for (let i = 0; i < 4; i++) { const [vx, vy] = out(rnd(0.8, 2), 0.9); wpPart({ x, y, z, vx, vy, vz: rnd(0.6, 2), life: rnd(0.7, 1.1), img: wpImg('shard', i), size: 0.036, grav: true, bounce: true, tint: [205, 150, 90] }, true); } wpPart({ x: x - dx * 0.05, y: y - dy * 0.05, z, vx: -dx * 0.3, vy: -dy * 0.3, vz: 0.2, life: 0.45, frames: fx.parts.smoke || fx.hit, img: wpImg('smoke'), size: 0.08, drift: true, add: true, fade: true, tint: [120, 95, 60] }, true); } // flisor och lite sågdamm
  else if (mat === 'ice') { for (let i = 0; i < 4; i++) { const [vx, vy] = out(rnd(0.8, 2.2), 1); wpPart({ x, y, z, vx, vy, vz: rnd(0.6, 2.2), life: rnd(0.6, 1), img: wpImg('glassshard', i), size: 0.03, grav: true, bounce: true, tint: [205, 235, 255] }, true); } wpPart({ x: x + ox * 0.05, y: y + oy * 0.05, z, vx: ox * 0.2, vy: oy * 0.2, vz: 0.15, life: 0.5, frames: fx.parts.smoke || fx.hit, img: wpImg('smoke'), size: 0.09, drift: true, add: true, fade: true, tint: [170, 200, 230] }, true); }
  else { const [vx, vy] = out(0.35, 0.1); wpPart({ x: x + ox * 0.05, y: y + oy * 0.05, z, vx, vy, vz: 0.25, life: 0.55, frames: fx.parts.smoke || fx.hit, img: wpImg('smoke'), size: 0.1, drift: true, add: true, fade: true, tint: [120, 110, 95] }, true); // damm (svagt ljust, syns i mörker) och flis
    for (let i = 0; i < 3; i++) { const [vx2, vy2] = out(rnd(0.8, 1.8), 0.8); wpPart({ x, y, z, vx: vx2, vy: vy2, vz: rnd(0.5, 1.8), life: rnd(0.5, 0.8), img: wpImg('rock'), size: 0.022, grav: true, bounce: true, tint: [140, 130, 120] }, true); } }
}
function wpProjWall(p) { // spikar och pilar som slår i väggen: samma nedslag som kulorna (bara när det finns plats i listan)
  if (particles.length >= WP_BUDGET) return; const v = Math.hypot(p.vx, p.vy) || 1;
  wpImpact(p.x - p.vx / v * 0.06, p.y - p.vy / v * 0.06, p.z ?? 0.5, cellAt(p.x, p.y), p.vx / v, p.vy / v);
}
function wpPuffFx(x, y, z) { // små smällar (explodeFx): ljus som falnar och två rökpuffar
  wpLight(x, y, 0.6, 3, 1.1, [255, 130, 50], true);
  if (!wpOn()) return; const f = fx.parts.smoke2 || fx.parts.smoke || fx.hit;
  for (let i = 0; i < 2; i++) if (wpPart({ x: x + rnd(-0.2, 0.2), y: y + rnd(-0.2, 0.2), z: (z ?? 0.5) + 0.1, vx: rnd(-0.1, 0.1), vy: rnd(-0.1, 0.1), vz: 0.3, life: rnd(1.1, 1.6), frames: f, img: f[0], size: rnd(0.25, 0.35), drift: true, tint: [135, 128, 120] })) WP.n.smoke++;
}
function wpProjDie(p) { // fiendeskott som slocknar: gnistor i skottets färg
  WP.n.die++; if (!wpOn() || p.friendly || particles.length >= WP_BUDGET) return;
  const c = PROJ_TINT[p.kind] || [255, 140, 60];
  for (let i = 0; i < 4; i++) wpPart({ x: p.x - p.vx * 0.02, y: p.y - p.vy * 0.02, z: (p.z ?? 0.5) - 0.05, vx: rnd(-1.5, 1.5), vy: rnd(-1.5, 1.5), vz: rnd(0.3, 1.6), life: 0.3, img: fx.hit[2], size: 0.03, add: true, tint: c, grav: true });
  if (!settings.noFlash) wpLight(p.x, p.y, 0.18, 2, 1, c);
}
const wpApi = { state: () => ({ sched: WP.sched.length, lights: WP.lights.length, parts: particles.length, n: JSON.parse(JSON.stringify(WP.n)) }), impact: (mat) => { const c = { metal: 'G', wood: 'D', stone: '#' }[mat] || '#'; wpImpact(P.x + Math.cos(P.a), P.y + Math.sin(P.a), 0.5, c, Math.cos(P.a), Math.sin(P.a)); },
  setOff: v => { WP.off = !!v; }, // prov: stäng av bara det här blocket (A/B-mätning)
  texMat: c => wpTexMat(c),
  bench: (n = 120) => { const ts = []; for (let i = 0; i < n; i++) { const t0 = performance.now(); tmr += 1 / 60; updateProjectiles(1 / 60); updateParticles(1 / 60); updateLight(); render(); ts.push(performance.now() - t0); } ts.sort((a, b) => a - b); return { med: ts[n >> 1], p90: ts[(n * 0.9) | 0], parts: particles.length, proj: projectiles.length }; } }; // projektiler + partiklar + ljus + bild

