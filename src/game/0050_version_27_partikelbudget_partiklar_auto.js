// ---------- Version 27: partikelbudget (PARTIKLAR: AUTO / LÅG / NORMAL / HÖG) ----------
// Alla partikeltak (VAPEN 150/215, miljön 180–220, FIENDER 235, FX27 120/150/200, taket 260) multipliceras med PB.k.
// LÅG 0,6 · NORMAL 1 (taken före version 27.1) · HÖG 2 · AUTO 1–2: höjs långsamt när bildtiden har god marginal och sänks snabbt
// när den närmar sig gränsen för det automatiska lågeffektläget; AUTO går aldrig under 1, så en telefon får samma tak som förut.
// Under automatiserade tester (navigator.webdriver) är AUTO = NORMAL, så att testernas tak inte beror på datorns fart (PB.test slår på det).
// När listan är full tas dekor (rök, damm, glöd: drift/fade utan additiv blandning) bort först, sedan de äldsta.
// Täthet: över NORMAL får varje ny partikel ibland en tvilling (lite förskjuten, egen fart och livslängd), så att blod, skräp, gnistor,
// rök och glöd blir fler per händelse: ×1,3 vid faktor 2, ×1,9 vid 4 och ×2 vid MAX. Partiklar som något annat håller reda på
// (Effekseer-sprites, huvuden, fåglar och ringar som följer en fiende – allt med objekt i sig utöver bild, bildrutor och färg) dubbleras inte.
// HÖG = ×4 (1 040 partiklar), MAX = ×8 (2 080), AUTO klättrar till ×4 på datorer med marginal (bedömning för en laptop med RTX 5060).
const PB = { k: 1, max: 8, autoMax: 4, dense: 0, base: { wb: 150, wh: 215, soft: 120, frame: 200, boom: 150 }, ema: 1 / 60, upT: 0, trims: 0, decor: 0, test: false };
function pcap(n) { return (n * PB.k) | 0; }
function pbApply(k) { PB.k = Math.max(0.6, Math.min(PB.max, k)); WP_BUDGET = pcap(PB.base.wb); WP_HARD = pcap(PB.base.wh); FX27_SOFT = pcap(PB.base.soft); FX27_ROOM.frame = pcap(PB.base.frame); FX27_ROOM.boom = pcap(PB.base.boom); }
function pbTick(realDt) {
  const m = settings.particles || 'auto';
  if (m !== 'auto' || (navigator.webdriver && !PB.test)) { const k = typeof m === 'number' ? m : m === 'low' ? 0.6 : m === 'high' ? 4 : m === 'max' ? 8 : 1; if (k !== PB.k) pbApply(k); return; } // ett tal: fast faktor (mätningar)
  if (state !== 'play' || !(realDt > 0) || realDt > 0.25) return;
  PB.ema += (realDt - PB.ema) * 0.05;
  if (PB.ema > 1 / 34) { PB.upT = 0; if (PB.k > 1) pbApply(Math.max(1, PB.k - realDt * 0.6)); } // nära gränsen (1/28 s): ned snabbt
  else if (PB.ema < 1 / 50) { PB.upT += realDt; if (PB.upT > 2 && PB.k < PB.autoMax) pbApply(Math.min(PB.autoMax, PB.k + realDt * 0.2)); } // god marginal: upp långsamt (till ×4)
  else PB.upT = 0;
}
function pbDen() { return PB.k <= 1 ? 1 : Math.min(2, 1 + (PB.k - 1) * 0.29); }
const PB_OBJ_OK = { img: 1, frames: 1, tint: 1 };
function pbDense() { // nya partiklar (utan _pb) får en tvilling med sannolikheten täthet − 1
  const den = pbDen(), n = particles.length;
  for (let i = 0; i < n; i++) { const p = particles[i]; if (p._pb) continue; p._pb = 1;
    if (den <= 1 || settings.lowfx || p.efx || Math.random() >= den - 1) continue;
    let ok = true; for (const k in p) { const v = p[k]; if (v && typeof v === 'object' && !PB_OBJ_OK[k]) { ok = false; break; } } if (!ok) continue;
    const q = Object.assign({}, p), j = 0.06 + (p.size || 0.05);
    q.x += (Math.random() - 0.5) * j; q.y += (Math.random() - 0.5) * j; q.vx = (p.vx || 0) * (0.75 + Math.random() * 0.5) + (Math.random() - 0.5) * 0.3; q.vy = (p.vy || 0) * (0.75 + Math.random() * 0.5) + (Math.random() - 0.5) * 0.3;
    if (p.vz !== undefined) q.vz = p.vz * (0.8 + Math.random() * 0.4); if (p.life) q.life = p.life * (0.65 + Math.random() * 0.35); if (p.size) q.size = p.size * (0.75 + Math.random() * 0.35);
    particles.push(q); PB.dense++; }
}
function pbTrim(n) { // på plats (ingen ny lista): dekor först, sedan de äldsta
  let over = particles.length - n; if (over <= 0) return; PB.trims += over;
  let w = 0; for (let i = 0; i < particles.length; i++) { const p = particles[i]; if (over > 0 && (p.drift || p.fade) && !p.add) { over--; PB.decor++; continue; } particles[w++] = p; }
  particles.length = w; if (particles.length > n) particles.splice(0, particles.length - n);
}
const pbApi = { st: () => ({ k: PB.k, den: pbDen(), dense: PB.dense, ema: PB.ema, trims: PB.trims, decor: PB.decor, caps: { wb: WP_BUDGET, wh: WP_HARD, soft: FX27_SOFT, frame: FX27_ROOM.frame, boom: FX27_ROOM.boom, hard: pcap(260) } }), apply: pbApply, tick: pbTick, trim: pbTrim, set: o => Object.assign(PB, o), list: () => particles, upd: dt => updateParticles(dt) };
function lowFpsGuard(realDt) { // låg bildfrekvens en längre stund: minska effekterna automatiskt
  if (settings.autoLowFx === false || settings.lowfx || state !== 'play') { lowFpsT = 0; return; }
  lowFpsT = realDt > 1 / 28 ? lowFpsT + realDt : Math.max(0, lowFpsT - realDt * 2);
  if (lowFpsT > 6) { settings.lowfx = true; saveSettings(); lowFpsT = 0; say('LÅG FPS: MINSKADE EFFEKTER ÄR PÅ', 3); }
}
function applyDisplay() { // skärpa och textstorlek
  canvas.style.imageRendering = settings.smooth ? 'auto' : 'pixelated';
  document.documentElement.style.setProperty('--ui-zoom', settings.uiScale || 1);
  document.documentElement.style.setProperty('--bo', settings.btnOpacity ?? 0.6);
}
let fpsN = 0, fpsT = 0, fpsShow = 0, heartT = 0, ambLoops = [], lightning = 0, lightningT = 10, musicSnd = null, crackleT = 2;
function stopAmbient() { for (const a of ambLoops) try { a.s.stop(); } catch (e) { /* redan stoppad */ } ambLoops = []; ambient = null; }
function startAmbient() {
  stopAmbient();
  ambLoops = biomeFx().amb.map(([n, v, r]) => play(n, v, r, { loop: true, amb: true })).filter(Boolean);
  if (window.Music) { Music.reverb(boss ? 'boss' : { dungeon: 'crypt', caves: 'cave', courtyard: 'crypt', lab: 'crypt', circus: 'crypt', mine: 'cave', observatory: 'crypt', sewer: 'cave', prison: 'crypt', bathhouse: 'cave', abattoir: 'crypt' }[lvl.biome] || 'outdoor'); playMusic(); }
  ambient = ambLoops[0] || null;
}
function setMusic(on) { // bossmusik under bosstrider, annars biomens musik
  musicSnd = on;
  if (window.Music && Music.sfxIn) { playMusic(); return; }
  if (on && !musicLoop) musicLoop = play('music_boss', 0.45, 1, { loop: true });
  if (!on && musicLoop) { try { musicLoop.s.stop(); } catch (e) { /* redan stoppad */ } musicLoop = null; }
}
let musicLoop = null;
function playMusic() { if (!window.Music) return; if (settings.music === false) { Music.stop(1); return; } const b = boss || guardianE; Music.play(state === 'title' || !lvl ? 'title' : lvl.hub ? 'hub' : lvl.secret && !musicSnd ? 'secret' : musicSnd ? (b && b.id === 'frost' ? 'boss2' : b && b.id === 'flame' ? 'boss3' : b && b.id === 'pharaoh' ? 'boss4' : b && b.id === 'crystalqueen' ? 'boss5' : b && b.id === 'leviathan' ? 'boss6' : b && b.id === 'monk' ? 'boss8' : b && b.id === 'clockmaker' ? 'boss7' : b && b.id === 'thunderbird' ? 'boss8' : b && b.id === 'mycelmother' ? 'boss9' : b && b.id === 'mirrorking' ? 'boss10' : b && b.id === 'librarian' ? 'boss11' : b && b.id === 'colossus' ? 'boss12' : b && b.id === 'cardinal' ? 'boss13' : b && b.id === 'queenbee' ? 'boss14' : b && b.id === 'gardener' ? 'boss15' : b && b.id === 'sandman' ? 'boss16' : b && b.id === 'captain' ? 'boss17' : b && b.id === 'alchemist' ? 'boss18' : b && b.id === 'ringmaster' ? 'boss19' : b && b.id === 'serpent' ? 'boss20' : b && b.id === 'foreman' ? 'boss21' : b && b.id === 'starseer' ? 'boss22' : b && b.id === 'ratking' ? 'boss23' : b && b.id === 'sphinx' ? 'boss24' : b && b.id === 'executioner' ? 'boss25' : b && b.id === 'tidepriest' ? 'boss26' : b && b.id === 'bathmaster' ? 'boss27' : b && b.id === 'pyrelord' ? 'boss28' : b && b.id === 'butcher' ? 'boss29' : b && b.id === 'warlord' ? 'boss30' : 'boss') : lvl.biome || 'dungeon'); }
function applyMixer() { if (window.Music) Music.setVolumes({ music: settings.music === false ? 0 : settings.musicVol ?? 0.6, sfx: settings.sfxVol ?? 1, amb: settings.ambVol ?? 0.8 }); }
let intensity = 0;
function updateAudioMood(dt) { // musiken intensivare i strid, dov ljudbild vid låg hälsa
  v26cStyle(); // version 26C: stilrangen styr musiken (räknas även utan ljud)
  if (!window.Music || !Music.sfxIn) return;
  const fighting = ents.filter(e => e.alert && !e.dead && !e.dormant && Math.hypot(e.x - P.x, e.y - P.y) < 12).length;
  const want = boss && !boss.dead ? 0.4 + boss.phase * 0.2 : clamp(fighting / 5 + (ents.some(e => e.elite && e.alert && !e.dead && Math.hypot(e.x - P.x, e.y - P.y) < 12) ? 0.4 : 0), 0, 1); // eliter ger stridsmusik
  intensity += (v26cWant(want) - intensity) * Math.min(1, dt * 0.8); Music.setIntensity(intensity);
  if (settings.focusMode) { const amb = (settings.ambVol ?? 0.8) * (1 - Math.min(0.8, intensity * 0.9)); if (Math.abs(amb - (P.ambSet ?? -1)) > 0.03) { P.ambSet = amb; Music.setVolumes({ music: settings.music === false ? 0 : settings.musicVol ?? 0.6, sfx: settings.sfxVol ?? 1, amb }); } } // fokusläge
  const low = (P.hp < maxHp() * 0.25 && settings.lowHpGray !== false) || (map && cellUnder() === '-' && P.crouch > 0.5); if (low !== P.muffled) { P.muffled = low; Music.muffle(low); } // dämpat under vattnet
  if (P.boom > 0.2 && !P.duckT) { P.duckT = 0.5; Music.duck(0.6, 0.6); } if (P.duckT) P.duckT = Math.max(0, P.duckT - dt);
}
// väder och svävande partiklar runt spelaren
function updateWeather(dt) {
  gfxWUpdate(dt); // VÄRLD: vätskor, luft, dörrdamm (egen dt, före lowfx-gallringen)
  fx27Tick(dt); // version 27: glöd som falnar, chockvågor, miljö och bossar
  if (settings.lowfx && Math.random() < 0.6) dt *= 0; // minskade effekter: färre partiklar
  const w = biomeFx().weather, near = (r = 6) => { const a = rnd(0, TAU), d = rnd(0.5, r); return [P.x + Math.cos(a) * d, P.y + Math.sin(a) * d]; };
  const ok = (x, y) => x > 0 && y > 0 && x < mw && y < mh && !solid(x, y);
  const pp = n => fx.parts[n] || fx.hit;
  const add = (o, n) => { o.frames = pp(n); o.img = o.frames[0]; o.maxLife = o.life; o.drift = true; particles.push(o); };
  if (w === 'leaves' && Math.random() < dt * 5) { const [x, y] = near(); if (ok(x, y)) add({ x, y, z: 1.1, vx: rnd(-0.4, 0.4), vy: rnd(-0.4, 0.4), vz: -0.35, life: 3, size: 0.09, sway: rnd(0, 6) }, 'leaf'); }
  if (w === 'leaves' && Math.random() < dt * 3) { const [x, y] = near(); if (ok(x, y)) add({ x, y, z: rnd(0.2, 0.8), vx: rnd(-0.2, 0.2), vy: rnd(-0.2, 0.2), vz: rnd(-0.1, 0.1), life: 3, size: 0.06, add: true, sway: rnd(0, 6), fade: true }, 'firefly'); }
  if (w === 'groundfog' && Math.random() < dt * 4) { const [x, y] = near(8); if (ok(x, y)) add({ x, y, z: 0, vx: rnd(-0.25, 0.25), vy: rnd(-0.25, 0.25), vz: 0, life: 5, size: rnd(0.25, 0.4), add: true, fade: true }, 'fog'); }
  if (w === 'groundfog' && Math.random() < dt * 0.4) { const [x, y] = near(9); if (ok(x, y)) add({ x, y, z: rnd(0.3, 0.7), vx: rnd(-0.5, 0.5), vy: rnd(-0.5, 0.5), vz: rnd(-0.05, 0.05), life: 4, size: 0.22, add: true, fade: true, sway: rnd(0, 6) }, 'wisp'); }
  if (w === 'sparkle' && Math.random() < dt * 9) { const [x, y] = near(6); if (ok(x, y)) add({ x, y, z: rnd(0.2, 1), vx: rnd(-0.1, 0.1), vy: rnd(-0.1, 0.1), vz: rnd(-0.05, 0.08), life: rnd(1, 2), size: 0.035, add: true, fade: true, tint: Math.random() < 0.5 ? [190, 150, 255] : [140, 220, 255] }, 'dust_mote'); } // kristallglitter
  if (w === 'bubbles' && Math.random() < dt * 4) { const [x, y] = near(6); if (ok(x, y)) add({ x, y, z: 0.02, vx: rnd(-0.05, 0.05), vy: rnd(-0.05, 0.05), vz: rnd(0.25, 0.45), life: 2.4, size: 0.04, fade: true, tint: [190, 230, 255] }, 'bubble'); } // bubblor i den sjunkna staden
  if (w === 'spores' && Math.random() < dt * 8) { const [x, y] = near(6); if (ok(x, y)) add({ x, y, z: rnd(0.1, 0.9), vx: rnd(-0.1, 0.1), vy: rnd(-0.1, 0.1), vz: rnd(0.02, 0.1), life: rnd(1.5, 3), size: 0.04, add: true, fade: true, tint: Math.random() < 0.5 ? [170, 255, 140] : [210, 150, 255] }, 'spore'); } // sporer svävar i luften
  if (w === 'clouds' && Math.random() < dt * 3) { const [x, y] = near(8); if (x > 0 && y > 0 && x < mw && y < mh) add({ x, y, z: rnd(-0.3, 0.05), vx: rnd(0.2, 0.5), vy: rnd(-0.1, 0.1), vz: 0, life: 4, size: rnd(0.25, 0.45), fade: true, tint: [235, 240, 255] }, 'cloud'); } // molnen driver under öarna
  if ((w === 'drips' || w === 'bubbles') && Math.random() < dt * 5) { const [x, y] = near(5); if (ok(x, y)) add({ x, y, z: 0.98, vx: 0, vy: 0, vz: -3, life: 0.32, size: 0.06, add: true }, 'drop'); }
  if (w === 'drips' && Math.random() < dt * 0.15) { const [x, y] = near(6); if (ok(x, y)) { const a = rnd(0, TAU); add({ x, y, z: rnd(0.6, 0.9), vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, vz: 0, life: 2.2, size: 0.14, flap: true }, 'bat'); } }
  if (w === 'rain') for (let i = 0; i < 3; i++) if (Math.random() < dt * 30) { const [x, y] = near(6); if (ok(x, y) && cellSky[(y | 0) * mw + (x | 0)]) add({ x, y, z: 1.2, vx: 0.4, vy: 0.2, vz: -9, life: 0.13, size: 0.16, add: true }, 'rain'); }
  if (w === 'sandstorm') { for (let i = 0; i < 2; i++) if (Math.random() < dt * 18) { const [x, y] = near(6); if (ok(x, y) && cellSky[(y | 0) * mw + (x | 0)]) add({ x, y, z: rnd(0.1, 1), vx: 2.2 + rnd(0, 1), vy: rnd(-0.4, 0.4), vz: rnd(-0.1, 0.1), life: 1.2, size: 0.03, tint: [220, 190, 130] }, 'sand'); } } // sandstorm
  if (w === 'ash') { if (Math.random() < dt * 16) { const [x, y] = near(6); if (ok(x, y)) add({ x, y, z: 1.1, vx: rnd(-0.2, 0.2) + 0.15, vy: rnd(-0.2, 0.2), vz: -0.45, life: 2.4, size: 0.04, sway: rnd(0, 6) }, fx.parts.ashfall ? 'ashfall' : 'ash'); } // askregn
    if (Math.random() < dt * 4) { const [x, y] = near(5); if (ok(x, y)) add({ x, y, z: 0.05, vx: rnd(-0.2, 0.2), vy: rnd(-0.2, 0.2), vz: rnd(0.4, 0.9), life: 1.4, size: 0.035, add: true, fade: true }, 'ember'); } }
  if (w === 'snow') for (let i = 0; i < 2; i++) if (Math.random() < dt * 22) { const [x, y] = near(6); if (ok(x, y) && cellSky[(y | 0) * mw + (x | 0)]) add({ x, y, z: 1.1, vx: rnd(-0.3, 0.3) + 0.3, vy: rnd(-0.3, 0.3), vz: -0.8, life: 1.4, size: 0.035, sway: rnd(0, 6) }, 'snow'); } // snöfall
  if (w === 'snow' && Math.random() < dt * 0.7 && !settings.lowfx) { const a = P.a; add({ x: P.x + Math.cos(a) * 0.65, y: P.y + Math.sin(a) * 0.65, z: P.camZ - 0.1, vx: Math.cos(a) * 0.3 + P.vx * 0.8, vy: Math.sin(a) * 0.3 + P.vy * 0.8, vz: 0.05, life: 0.9, size: 0.06, add: true, fade: true }, 'breath'); } // andedräkt
  if (w === 'swamp' && Math.random() < dt * 4) { const [x, y] = near(8); if (ok(x, y)) add({ x, y, z: 0, vx: rnd(-0.2, 0.2), vy: rnd(-0.2, 0.2), vz: 0, life: 5, size: rnd(0.3, 0.45), add: true, fade: true, tint: [120, 170, 110] }, 'fog'); } // träsket: dimma, eldflugor och bubblor
  if (w === 'swamp' && Math.random() < dt * 4) { const [x, y] = near(); if (ok(x, y)) add({ x, y, z: rnd(0.2, 0.8), vx: rnd(-0.2, 0.2), vy: rnd(-0.2, 0.2), vz: rnd(-0.1, 0.1), life: 3, size: 0.06, add: true, sway: rnd(0, 6), fade: true }, 'firefly'); }
  if (w === 'swamp' && Math.random() < dt * 2) { const [x, y] = near(4); if (ok(x, y) && cellAt(x, y) === '-') add({ x, y, z: 0, vx: 0, vy: 0, vz: 0.3, life: 0.6, size: 0.04, add: true, fade: true, tint: [160, 220, 160] }, 'drop'); }
  if (w === 'dust' && Math.random() < dt * 3) { const [x, y] = near(4); if (ok(x, y)) add({ x, y, z: rnd(0.2, 0.9), vx: rnd(-0.08, 0.08), vy: rnd(-0.08, 0.08), vz: rnd(-0.03, 0.03), life: 4, size: 0.025, add: true, fade: true }, 'dust'); }
  // glittrande guldhögar, utgångens sken, drag från lönnväggar och sprakande eldfat
  if (!settings.lowfx) {
    for (const it of items) if (!it.taken && it.type === 'goldpile' && Math.random() < dt * 1.5 && Math.hypot(it.x - P.x, it.y - P.y) < 10)
      particles.push({ x: it.x + rnd(-0.15, 0.15), y: it.y + rnd(-0.15, 0.15), z: rnd(0.05, 0.25), vx: 0, vy: 0, vz: 0.2, life: 0.4, maxLife: 0.4, frames: fx.hit, img: fx.hit[0], size: 0.07, add: true, tint: [255, 220, 90], drift: true });
    if (lvl.exit && Math.random() < dt * 6 && Math.hypot(lvl.exit.x + 0.5 - P.x, lvl.exit.y + 0.5 - P.y) < 14)
      particles.push({ x: lvl.exit.x + rnd(0.2, 0.8), y: lvl.exit.y + rnd(0.2, 0.8), z: 0.02, vx: 0, vy: 0, vz: rnd(0.4, 0.9), life: 1.1, maxLife: 1.1, frames: fx.hit, img: fx.hit[0], size: 0.08, add: true, tint: [120, 255, 140], drift: true });
    for (const k in doors) { const d = doors[k]; if (!d.secret || d.target) continue;
      if (Math.abs(d.x + 0.5 - P.x) + Math.abs(d.y + 0.5 - P.y) < 3.5 && Math.random() < dt * 3) particles.push({ x: d.x + 0.5 + rnd(-0.6, 0.6), y: d.y + 0.5 + rnd(-0.6, 0.6), z: rnd(0.1, 0.9), vx: rnd(-0.3, 0.3), vy: rnd(-0.3, 0.3), vz: 0.05, life: 1, maxLife: 1, frames: fx.hit, img: fx.hit[0], size: 0.04, add: true, tint: [180, 180, 160], drift: true, fade: true }); }
  }
  crackleT -= dt; if (crackleT <= 0) { crackleT = rnd(1.5, 3); let best = null, bd = 3.5; for (const t of torches) { if (t.hidden) continue; const d = Math.hypot(t.x - P.x, t.y - P.y); if (d < bd) { bd = d; best = t; } } if (best) play('fireburst', 0.07, rnd(1.4, 1.8), { x: best.x, y: best.y }); }
  // blixtar över kyrkogården
  lightning = Math.max(0, lightning - dt * 3);
  if (w === 'groundfog' || ((w === 'rain' || w === 'clouds') && gfxWOn())) { lightningT -= dt; if (lightningT <= 0) { /* VÄRLD: åska även i regnet */ lightningT = rnd(9, 22); lightning = 1; setTimeout(() => play('bigboom', 0.35, 0.35), rnd(300, 900)); if (Math.random() < 0.5) setTimeout(() => play('bell', 0.3, 0.8), 1600); } }
}

// ---------- Rendering ----------
let fogR = 0, fogG = 0, fogB = 0, fogK = 0.085;
let sfD = -1, sfK = -1, sfF = 1; // shadeFog: senaste avstånd och dimtäthet → dimfaktorn (golvrader och väggkolumner har samma avstånd i hela raden)
function shadeFog(c, L, dist, ci = -1) {
  if (dist !== sfD || fogK !== sfK) { sfD = dist; sfK = fogK; sfF = Math.exp(-dist * fogK); }
  const ff = sfF;
  const k = L * ff;
  let kr = k, kg = k, kb = k;
  if (ci >= 0 && lcol) { const j = ci * 3; kr += lcol[j] * ff; kg += lcol[j + 1] * ff; kb += lcol[j + 2] * ff; if (kr < 0) kr = 0; if (kg < 0) kg = 0; if (kb < 0) kb = 0; } // färgat ljus
  let r = (c & 255) * kr + fogR * (1 - ff), g = ((c >> 8) & 255) * kg + fogG * (1 - ff), b = ((c >> 16) & 255) * kb + fogB * (1 - ff);
  r = r > 255 ? 255 : r; g = g > 255 ? 255 : g; b = b > 255 ? 255 : b;
  return 0xff000000 | (b << 16) | (g << 8) | r;
}
const wallTexFor = { 1: 'wall_brick_stone_center', 2: 'wall_brick_small_stone', 3: 'wall_rock', 4: 'wall_stone', 5: 'wall_brick_stone_center_banner',
  6: 'wall_forest', 7: 'wall_cemetery', 8: 'wall_cave', 9: 'wall_house',
  0: 'wall_swamp', '{': 'wall_cracked', 'Ø': 'wall_frost', '¦': 'wall_boss_frost', 'Ò': 'wall_obsidian', '¤': 'wall_boss_volcano', 'È': 'wall_sandstone', 'Ì': 'wall_hieroglyph', 'Ù': 'wall_boss_pharaoh', 'ǒ': 'wall_hull', 'Ǔ': 'wall_rigging', 'ǔ': 'wall_boss_captain', 'Ǡ': 'wall_labtile', 'ǡ': 'wall_jars', 'Ǣ': 'wall_boss_alchemist', 'Ǯ': 'wall_tent', 'ǯ': 'wall_cage', 'Ȑ': 'wall_timber', 'ȑ': 'wall_orevein', 'Ȓ': 'wall_boss_foreman', 'ȓ': 'wall_brass2', 'Ȕ': 'wall_starchart', 'ȕ': 'wall_boss_starseer', 'Ȭ': 'wall_sewerbrick', 'ȭ': 'wall_pipes', 'Ȯ': 'wall_boss_ratking', 'ȯ': 'wall_dune', 'Ȱ': 'wall_mesa', 'ȱ': 'wall_boss_sphinx', 'ɇ': 'wall_prisonstone', 'Ɉ': 'wall_cellbars', 'ɉ': 'wall_boss_executioner', 'Ɋ': 'wall_shack', 'ɋ': 'wall_quay', 'Ɍ': 'wall_boss_tidepriest', 'ɠ': 'wall_bathmosaic', 'ɡ': 'wall_bathcolumn', 'ɢ': 'wall_boss_bathmaster', 'ɭ': 'wall_flesh', 'ɮ': 'wall_bone', 'ɯ': 'wall_boss_pyrelord', 'ɼ': 'wall_abattoirtile', 'ɽ': 'wall_coldroom', 'ɾ': 'wall_boss_butcher', 'ʈ': 'wall_palisade', 'ʉ': 'wall_earthwork', 'ʊ': 'wall_boss_warlord', 'ǰ': 'wall_boss_ringmaster', 'ǿ': 'wall_junglestone', 'Ȁ': 'wall_jungle', 'ȁ': 'wall_boss_serpent', 'Ɵ': 'wall_hedge', 'Ơ': 'wall_gardenwall', 'ơ': 'wall_boss_gardener', 'Ƣ': 'wall_dream', 'ƣ': 'wall_dreamshift', 'Ƥ': 'wall_boss_sandman', 'Ɗ': 'wall_cathedral', 'Ƌ': 'wall_stainedglass', 'ƌ': 'wall_boss_cardinal', 'Ɠ': 'wall_wax', 'Ɣ': 'wall_honeycomb', 'ƕ': 'wall_boss_queenbee', 'ũ': 'wall_bookshelf', 'Ū': 'wall_libpanel', 'ū': 'wall_boss_librarian', 'ŵ': 'wall_ironplate', 'Ŷ': 'wall_furnace', 'ŷ': 'wall_boss_colossus', 'ŝ': 'wall_mycel', 'Ş': 'wall_mushroomcap', 'ş': 'wall_boss_mycelmother', 'Š': 'wall_marble', 'š': 'wall_mirror', 'Ţ': 'wall_boss_mirrorking', 'Ĺ': 'wall_brass', 'ĺ': 'wall_gear', 'Ļ': 'wall_boss_clockmaker', 'ļ': 'wall_cloudstone', 'Ľ': 'wall_stormwall', 'ľ': 'wall_boss_thunderbird', 'Ą': 'wall_crystal', 'Ć': 'wall_crystal_vein', 'Ĉ': 'wall_boss_crystalqueen', 'Ċ': 'wall_ruin_sunken', 'Č': 'wall_coral', 'Ď': 'wall_boss_leviathan', '#': 'wall_boss_demon', '%': 'wall_boss_beast', '~': 'wall_boss_nightmare', '&': 'wall_boss_ogre', '=': 'wall_boss_ghost' }; // väktar- och bossrum
// golvtextur per ruta (floorMask) och öppen himmel (sky) räknas fram när våningen startar
let cellFloor = null, cellSky = null, floorTexs = [], props = [], hazGrid = null, animTex = {};
const colAng = new Float32Array(LK_W);
let plane = BASE_PLANE, view = { dirX: 1, dirY: 0, plX: 0, plY: BASE_PLANE, hor: HORIZON, camZ: 0.5, a: 0, pk: 1 };
// ---------- Titta upp/ned: buffert, radtabeller och projektion till skärmen ----------
// En kamera som lutas kring sin mittpunkt ger en homografi av bildplanet. Vid lutning kring x-axeln är djupet z detsamma längs en skärmrad,
// så varje skärmrad v läser en enda rad i den vågräta bufferten (rowY), utdragen 1/z i sidled. Bara de rader och kolumner som läses ritas (need, xa, xb).
const LK = { on: false, th: 0, TW: SW, TH: SVH, hor: SHOR, c: 1, s: 0, need: new Uint8Array(LK_H), xa: new Int16Array(LK_H), xb: new Int16Array(LK_H), rowY: new Int16Array(SVH), rowZ: new Float64Array(SVH), rowU: new Float64Array(SVH), sU: new Float64Array(LK_H), sZ: new Float64Array(LK_H), clamps: 0 }; // sZ > 0: raden läses glest (var sZ:e punkt från sU) – golvet ritar bara de punkterna
const lookActive = () => settings.mouseLook !== false && Math.abs(P.look || 0) > 1e-4;
function lookBy(d) { // mus, högerspak och lodrätt drag: d > 0 = nedåt (som movementY); INVERTERA UPP/NED vänder
  P.look = clamp((P.look || 0) - d * (settings.invertY ? -1 : 1), -LK_MAX, LK_MAX);
}
function lkBegin() { // väljer bufferten för den här bildrutan; false = vanlig rendering direkt på skärmen (som förut)
  LK.on = false;
  if (!lookActive()) return false;
  const th = clamp(P.look + Math.atan(P.pitch / PSC), -LK_TOT, LK_TOT), d = lkDims(th), c = Math.cos(th), s = Math.sin(th), need = LK.need, half = d.TW / 2;
  LK.th = th; LK.c = c; LK.s = s; LK.TW = d.TW; LK.TH = d.TH; LK.hor = d.hor;
  need.fill(0, 0, d.TH);
  for (let v = 0; v < SVH; v++) {
    const yn = (v - SHOR) / PSC, iz = 1 / (yn * s + c), ty0 = Math.round(d.hor + PSC * (yn * c - s) * iz), ty = clamp(ty0, 0, d.TH - 1), hw = SW / 2 * iz;
    if (ty !== ty0) LK.clamps++;
    const a = Math.max(0, Math.floor(half - hw) - 1), b = Math.min(d.TW - 1, Math.ceil(half + hw) + 1);
    const u0 = half + 0.5 - hw;
    LK.rowY[v] = ty; LK.rowZ[v] = iz; LK.rowU[v] = u0;
    if (need[ty]) { LK.xa[ty] = Math.min(LK.xa[ty], a); LK.xb[ty] = Math.max(LK.xb[ty], b); LK.sZ[ty] = 0; } else { need[ty] = 1; LK.xa[ty] = a; LK.xb[ty] = b; LK.sZ[ty] = iz > 1 ? iz : 0; LK.sU[ty] = u0; }
  }
  LK.on = true; W = d.TW; VH = d.TH; HORIZON = d.hor; px = tpx;
  return true;
}
function lkEnd() { W = SW; VH = SVH; HORIZON = SHOR; px = spx; } // tillbaka till skärmens mått före allt som ritas i skärmkoordinater
function lkProject() { // tpx → spx (närmaste granne)
  const TW = LK.TW;
  for (let v = 0; v < SVH; v++) {
    const row = LK.rowY[v] * TW, iz = LK.rowZ[v], o = v * SW;
    let u = LK.rowU[v];
    for (let x = 0; x < SW; x++) { spx[o + x] = tpx[row + (u | 0)]; u += iz; }
  }
}
function lkToScreen(u, v) { // buffertpunkt → skärmpunkt (för skadesiffror och livmätare); k = skalan i punkten
  const X = (u - LK.TW / 2), Y = (v - LK.hor) / PSC, z = LK.c - Y * LK.s;
  if (z <= 0.05) return null;
  return { x: SW / 2 + X / z, y: SHOR + PSC * (Y * LK.c + LK.s) / z, k: 1 / z };
}
