// ---------- Version 25.1: fler Effekseer-effekter ----------
// Samma pipeline och samma regler som version 25 (tools/effekseer, Effekseers CC0-exempel): eld (brinnande fiender, brinnande mark
// och eldmoln), is som splittras, gift (förgiftade fiender och giftmoln), blixt (blå strålar och åsknedslag) och bossarnas chockvågor
// går genom efxOk (högst 10 effektsprites, avståndsgränser, lowfx). Brand och gift återkommer, så de ritas bara när högst EFX2.amb
// effektsprites lever och tränger inte ut träffarna. Två skärmeffekter ritas i HUD:en, inte som partiklar: portalen när spelaren själv
// teleporteras eller kommer genom en portal (en ruta på en tredjedel av bildhöjden mitt i bilden) och helningen vid hälsan.
// noFlash dämpar och tonar blixten, chockvågen och portalen. Saknas en stripp blir det som förut.
Object.assign(EFX_FRAMES, { fire: 10, shatter: 12, poison: 12, bolt: 10, slam: 12 }); // laddas av efxLoad som de andra
Object.assign(EFX_NEAR, { fire: 0.9, shatter: 1.0, poison: 1.0, bolt: 1.0, slam: 1.6 });
Object.assign(EFX.n, { fire: 0, shatter: 0, poison: 0, bolt: 0, slam: 0, portal: 0, heal: 0 });
const EFX2 = { hud: {}, rect: {}, last: [], portalT: -9, healT: -9, zapT: -9, hp: null, acc: 0, accT: -9, lvl: null, pend: null, amb: 5 };
const EFX2_HUD = { portal: [12, [200, 150, 255]], heal: [12, [130, 255, 140]] }; // skärmeffekterna: antal rutor och färg
async function efx2Load() { // skärmeffekterna ritas med drawImage: färgade dukar i stället för pixeldata (valfria)
  for (const k in EFX2_HUD) {
    try {
      const im = await load(`${A}gfx/efx_${k}.png`), [n, col] = EFX2_HUD[k], c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
      for (let i = 0; i < a.length; i += 4) { a[i] = a[i] * col[0] / 255; a[i + 1] = a[i + 1] * col[1] / 255; a[i + 2] = a[i + 2] * col[2] / 255; }
      g.putImageData(d, 0, 0); EFX2.hud[k] = { c, n, fw: Math.floor(im.width / n), h: im.height };
    } catch (e) { /* valfri */ }
  }
}
function efx2Live() { let n = 0; for (const p of particles || []) if (p.efx) n++; return n; }
function efx2At(k, x, y, size, z, o) { // en världseffekt: en partikel (frames + additiv) i den vanliga listan, som version 25
  if (Math.hypot(x - P.x, y - P.y) < size * 1.4 && fx.efx && fx.efx[k] && !EFX.off && !settings.lowfx) { EFX.n.skip++; return null; } // för nära för sin storlek: den skulle fylla bilden (de gamla effekterna finns kvar)
  if (!efxOk(k, x, y)) return null;
  const f = fx.efx[k], nf = !!settings.noFlash && !!o.flash; // noFlash: tonas in och ut och dämpas
  const p = { x, y, z, vx: 0, vy: 0, vz: 0, life: o.life, frames: f, img: f[0], size, add: true, fade: nf, tint: nf ? (o.tint || [255, 255, 255]).map(v => Math.round(v * 0.6)) : o.tint || null, efx: k };
  if (!wpPart(p, true)) return null;
  EFX.n[k]++; return p;
}
function efx2Status(e) { // brinnande och förgiftade fiender: en låga eller en giftvirvel ungefär varje sekund, inte varje bildruta
  const q = e.efx2P; if (q) { if (q.life > 0 && !e.dead) { const d = Math.hypot(e.x - P.x, e.y - P.y) || 1; q.x = e.x + (P.x - e.x) / d * 0.08; q.y = e.y + (P.y - e.y) / d * 0.08; } else e.efx2P = null; } // lågan följer fienden (lite framför den)
  if (!(e.burn > 0 || e.poison > 0) || (e.efx2T || 0) > tmr || EFX.off || settings.lowfx || !fx.efx) return;
  e.efx2T = tmr + rnd(1.0, 1.4); if (e.dead || e.hidden || e.dormant || (e.ghost || 0) > 0.5) return;
  if (efx2Live() > EFX2.amb) { EFX.n.skip++; return; }
  const k = e.burn > 0 ? 'fire' : 'poison', sz = e.d.size * (e.formK || 1) * (e.boss ? 0.8 : 1), z0 = (e.d.ai === 'fly' || e.d.float) && !e.anchored && !e.boss ? 0.3 : 0;
  e.efx2P = efx2At(k, e.x, e.y, clamp(sz * 0.75, 0.45, 1.3), z0, { life: 0.6, tint: k === 'poison' ? [120, 255, 90] : null });
}
function efx2Ground(c, k) { // brinnande mark, eldmoln och giftmoln: en effekt när molnet uppstår och sedan ungefär varje sekund
  if ((k !== 'fire' && k !== 'poison') || (c.efx2T || 0) > tmr || EFX.off || settings.lowfx || !fx.efx) return;
  c.efx2T = tmr + rnd(0.9, 1.3);
  if (c.efx2N && efx2Live() > EFX2.amb) { EFX.n.skip++; return; } // molnets första effekt får plats om taket tillåter
  c.efx2N = (c.efx2N || 0) + 1;
  const r = c.r || 0.8, a = rnd(0, TAU), d = c.efx2N > 1 ? rnd(0, r * 0.5) : 0, x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d;
  if (!solid(x, y)) efx2At(k, x, y, clamp(r * 0.7, 0.55, 1.6), 0, { life: 0.8, tint: k === 'poison' ? [120, 255, 90] : null });
}
function efx2Shatter(e) { efx2At('shatter', e.x, e.y, clamp(e.d.size * 0.9, 0.6, 1.4), 0, { life: 0.7, tint: [170, 225, 255] }); } // frusen fiende som dör
function efx2Zap(x, y, tint) { // blå blixtar (staven, kedjeblixten, stormrunan, chocken, klotet): en urladdning där strålen slutar, högst var 0,12 s
  if (!tint || !(tint[2] > 200 && tint[0] < 200) || tmr - EFX2.zapT < 0.12 || EFX.off || settings.lowfx) return; // samma test som gfxEZap: gula studsar och gröna eller orange strålar är inga blixtar
  for (const l of EFX2.last) if (tmr - l.t < 0.8 && Math.abs(l.x - x) + Math.abs(l.y - y) < 0.5) return; // samma mål: inte oftare än var 0,8 s (staven skjuter var 0,32 s och skulle dölja fienden)
  if (efx2At('bolt', x, y, 0.55, 0.22, { life: 0.3, flash: true, tint: [190, 215, 255] })) { EFX2.zapT = tmr; EFX2.last.push({ x, y, t: tmr }); if (EFX2.last.length > 6) EFX2.last.shift(); }
}
function efx2Strike(s) { efx2At('bolt', s.x, s.y, 1.5, -0.2, { life: 0.35, flash: true, tint: [200, 220, 255] }); } // åsknedslag (stormfågeln, kardinalen, stormkallaren, åskande eliter, stormstaven)
function efx2Waves() { for (const w of waves) if (!w.efx2) { w.efx2 = true; efx2At('slam', w.x, w.y, 1.8, -0.35, { life: 0.7, flash: true }); } } // bossarnas chockvågor: smällen där vågen börjar
function efx2Portal() { if (EFX.off || settings.lowfx || !EFX2.hud.portal || tmr - EFX2.portalT < 0.5) return false; EFX2.portalT = tmr; EFX.n.portal++; return true; }
function efx2Puff(x, y, n) { // spawnPuff vid spelaren (teleporter, stjärnport, blink, tillbaka ur avgrunden): portalen, och puffen i kameran tas bort medan portalen syns
  if (n < 6 || x !== P.x || y !== P.y) return -1; // bara puffar på spelarens exakta plats (spawnPuff(P.x, P.y, 6)), inte fiender eller föremål intill
  efx2Portal(); return !EFX.off && !settings.lowfx && EFX2.hud.portal && tmr - EFX2.portalT < 0.9 ? particles.length : -1;
}
function efx2Draw(g, k, t0, dur, x, y, w, h, al) {
  const s = EFX2.hud[k], t = (tmr - t0) / dur; if (!s || t < 0 || t >= 1) return;
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = al * Math.min(1, (1 - t) * 3); g.imageSmoothingEnabled = false;
  g.drawImage(s.c, Math.min(s.n - 1, (t * s.n) | 0) * s.fw, 0, s.fw, s.h, Math.round(x), Math.round(y), Math.round(w), Math.round(h)); g.restore();
  EFX2.rect[k] = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), W, VH, t: tmr };
}
function efx2Hud(g, L) { // efter HUD-rutorna: portalresan, helningen (hälsan räknas i speltid) och de två skärmeffekterna
  if (EFX2.pend && lvl !== EFX2.pend) { EFX2.pend = null; efx2Portal(); } // kom ut ur portalen på den nya banan
  const hp = P.hp; if (lvl !== EFX2.lvl) { EFX2.lvl = lvl; EFX2.hp = hp; } // ny bana: ingen helning
  const dh = hp - (EFX2.hp ?? hp); EFX2.hp = hp;
  if (dh > 0 && dh < 150) { if (tmr - EFX2.accT > 0.6) EFX2.acc = 0; EFX2.acc += dh; EFX2.accT = tmr; if (EFX2.acc >= 3 && tmr - EFX2.healT > 1.2 && !EFX.off && !settings.lowfx && EFX2.hud.heal) { EFX2.healT = tmr; EFX2.acc = 0; EFX.n.heal++; } }
  if (EFX.off || settings.lowfx) return;
  const nf = !!settings.noFlash, s = Math.round(VH * 0.32);
  efx2Draw(g, 'portal', EFX2.portalT, 0.9, W / 2 - s / 2, HORIZON - s * 0.6, s, s, nf ? 0.35 : 0.8);
  const hw = L.big ? 40 : 32, hh = hw * 1.5;
  efx2Draw(g, 'heal', EFX2.healT, 1.2, L.hp.x - 2, L.t ? L.hp.y : L.hp.y + L.hp.h - hh, hw, hh, 1);
}
const efx2Api = { state: () => ({ hud: Object.fromEntries(Object.keys(EFX2_HUD).map(k => [k, !!EFX2.hud[k]])), n: { ...EFX.n }, portalT: EFX2.portalT, healT: EFX2.healT, rect: JSON.parse(JSON.stringify(EFX2.rect)), now: tmr, live: efx2Live() }),
  setAmb: n => { EFX2.amb = n; }, portal: () => efx2Portal(), zap: (x, y, tint = [150, 200, 255]) => efx2Zap(x, y, tint), strike: (x, y) => efx2Strike({ x, y }),
  ground: (x, y, k, r = 1.6) => efx2Ground({ x, y, r }, k), shatter: e => efx2Shatter(e), status: e => efx2Status(e),
  wave: (x, y) => { waves.push({ x, y, r: 0.5, sp: 8, dmg: 0, hit: true }); }, flask: (x, y, kind) => v17Cloud(x, y, kind), spores: (x, y) => sporeCloud(x, y) }; // de riktiga listorna: vågen skadar inte

