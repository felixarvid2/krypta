// ---------- Version 11: Mycelmodern och Spegelkungen ----------
Object.assign(BOSS_AI, {
  mycelmother(b, dt, dist, ang, ph) { // sporbollar, mycel som växer upp under dig och ett tungt slag
    const fast = ph === 3 ? 1.3 : 1;
    if (b.state === 'spores') { if (b.t < 0.05 || (ph >= 2 && Math.abs(b.t - 0.5) < dt)) { const n = 3 + ph; for (let i = 0; i < n; i++) { const a = ang + (i - (n - 1) / 2) * 0.28; projectiles.push({ x: b.x + Math.cos(a) * 1.2, y: b.y + Math.sin(a) * 1.2, z: 0.7, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, dmg: b.d.dmg * 0.45, src: b, kind: 'sporeb', life: 4 }); } play('mycelmother_spores', 0.8); }
      if (b.t > 1.1) { b.state = 'idle'; b.t = 0; b.cd = rnd(1.1, 1.6) / fast; } return; }
    if (b.state === 'roots') { if (b.t < 0.05) { bossWarn(b, 'MYCELET VÄXER UNDER DIG!'); play('mycelmother_roar', 0.7); for (let i = 0; i < 2 + ph; i++) roots.push({ x: P.x + (i ? rnd(-2.2, 2.2) : 0), y: P.y + (i ? rnd(-2.2, 2.2) : 0), t: 0.9 + i * 0.12, dmg: b.d.dmg * 0.6 }); }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = 0.9; } return; }
    if (b.state === 'slam') { if (!b.didHit && b.t > 0.45) { b.didHit = true; P.shake = Math.max(P.shake, 1.4); spawnPuff(b.x, b.y, 12); play('toad_land', 0.9, 0.7); if (dist < b.d.range + 1 && P.jz < 0.15) { run.cause = b.d.name; hurtPlayer(b.d.dmg, b.x, b.y, 'melee'); } }
      if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return; }
    b.cd -= dt;
    if (b.cd <= 0 && dist < b.d.range + 0.8) { b.state = 'slam'; b.t = 0; b.didHit = false; return; }
    const los = hasLOS(b.x, b.y, P.x, P.y);
    if (b.cd <= 0 && los) { b.t = 0; b.didHit = false; b.state = Math.random() < 0.35 ? 'roots' : 'spores'; return; }
    const sp = b.d.speed * fast * dt * (b.slow > 0 ? 0.5 : 1);
    if (!los) bossChase(b, sp); // går runt pelare och väggar i stället för att frysa
    else if (dist > 4) bossMove(b, ang, sp);
  },
  mirrorking(b, dt, dist, ang, ph) { // glasskärvor, speglingen och språng mellan speglarna
    const fast = ph === 3 ? 1.3 : 1;
    if (b.state === 'shards') { if (b.t < 0.05 || (ph >= 2 && Math.abs(b.t - 0.45) < dt)) { const n = 5 + ph * 2; for (let i = 0; i < n; i++) { const a = ang + (i - (n - 1) / 2) * 0.15; projectiles.push({ x: b.x + Math.cos(a) * 1.2, y: b.y + Math.sin(a) * 1.2, z: 0.6, vx: Math.cos(a) * 8, vy: Math.sin(a) * 8, dmg: b.d.dmg * 0.4, src: b, kind: 'glass', life: 3 }); } play('mirrorking_shatter', 0.7); }
      if (b.t > 1) { b.state = 'idle'; b.t = 0; b.cd = rnd(1.2, 1.7) / fast; } return; }
    if (b.state === 'mirror') { if (b.t < 0.05) { b.mirrorT = tmr + 2.4; bossWarn(b, 'SPEGELKUNGEN BLIR EN SPEGEL – SKJUT INTE!'); play('mirrorking_laugh', 0.9); }
      if (b.t > 2.4) { b.state = 'idle'; b.t = 0; b.cd = 0.7; } return; }
    if (b.state === 'blink') { if (b.t < 0.05) { const s = freeSpotFar(3, 7); if (s) { spawnPuff(b.x, b.y, 8); b.x = s[0]; b.y = s[1]; spawnPuff(b.x, b.y, 8); play('teleport', 0.8); flashes.push({ x: b.x, y: b.y, t: 0.25, r: 5, col: [210, 230, 255] }); } }
      if (b.t > 0.5) { b.state = 'idle'; b.t = 0; b.cd = 0.5; } return; }
    b.cd -= dt;
    if (b.cd <= 0 && hasLOS(b.x, b.y, P.x, P.y)) { b.t = 0; b.didHit = false; const r = Math.random(); b.state = r < 0.25 && ph >= 2 ? 'mirror' : r < 0.45 ? 'blink' : 'shards'; return; }
    if (b.cd <= 0) { b.state = 'blink'; b.t = 0; return; } // utom synhåll: kliver fram ur en spegel
    if (dist > 6) bossMove(b, ang, b.d.speed * fast * dt); else bossMove(b, ang + Math.PI / 2, b.d.speed * dt * 0.7);
  },
});
Object.assign(BOSS_SPECIAL, {
  mycelmother(b, dt, dist, ang, ph) {
    if (b.spK) { // sporfältet: moln runt arenan som hon läker sig i
      if (b.t < 0.05) { bossWarn(b, 'MYCELMODERN SLÄPPER SINA SPORER!'); play('mycelmother_spores', 1); for (let i = 0; i < 3 + ph; i++) { const a = i / (3 + ph) * TAU + rnd(-0.3, 0.3), r = rnd(1.5, 4); const x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r; if (!solid(x, y)) sporeCloud(x, y); } sporeCloud(b.x, b.y); }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return;
    }
    if (b.t < 0.05) { say('SVAMPARNA VAKNAR', 1.5); play('mycelmother_roar', 0.9); for (let i = 0; i < 2 + ph; i++) { const s = freeSpotFar(3, 6); if (s) { const e = makeEnemy(ENEMY_DEFS['ŗ'] ? (ph === 3 && i === 0 && ENEMY_DEFS['ř'] ? 'ř' : 'ŗ') : '^', s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 6); } } }
    if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
  mirrorking(b, dt, dist, ang, ph) {
    if (b.spK) { // delar sig i spegelbilder och byter plats med en av dem
      if (b.t < 0.05) { bossWarn(b, 'SPEGELKUNGEN DELAR SIG!'); play('mirrorking_split', 1); const spots = []; for (let i = 0; i < 1 + ph; i++) { const s = freeSpotFar(3, 7); if (s) spots.push(s); }
        if (spots.length) { const k = (Math.random() * spots.length) | 0, ox = b.x, oy = b.y; b.x = spots[k][0]; b.y = spots[k][1]; spots[k] = [ox, oy];
          for (const [x, y] of spots) { const o = makeEnemy('ś', x, y); o.decoy = true; o.kingImg = true; o.hp = o.maxHp = 1; o.alert = true; o.life = 8; o.d = { ...o.d, name: 'SPEGELBILD', ai: 'kingimg', size: b.d.size / 1.15, score: 0, melee: false }; ents.push(o); spawnPuff(x, y, 8); }
          firstHint('kingimg', 'BARA DEN ÄKTA SPEGELKUNGEN TAR SKADA – TRÄFFAR DU HONOM KROSSAS SPEGELBILDERNA.'); } }
      if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = 0.8; } return;
    }
    if (b.t < 0.05) { bossWarn(b, 'GLASET SPRICKER!'); glassBurst(b.x, b.y, 12 + ph * 4, b.d.dmg * 0.35, false, b); play('mirrorking_shatter', 1); P.shake = Math.max(P.shake, 1); }
    if (b.t > 0.8) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
});
TAUNTS.mycelmother = ['ANDAS IN', 'ALLT VÄXER IHOP TILL SLUT', 'DU BLIR JORD ÅT MINA BARN'];
TAUNTS.mirrorking = ['VILKEN AV OSS ÄR JAG?', 'DU SKJUTER PÅ DIG SJÄLV', 'SE DIG I SPEGELN'];
Object.assign(PROJ_UPD_V8, { pspore: updatePspore, sporeb: updateSporeb, glass: updateGlass, refl: updateRefl });
Object.assign(PROJ_DRAW_V8, {
  pspore: o => drawSprite(fx.parts.spore2 ? fx.parts.spore2[Math.floor(tmr * 8) % fx.parts.spore2.length] : fx.hit[1], o.x, o.y, 0.16, o.z - 0.08, false, null, 0, 0.6, false, [150, 230, 110]),
  sporeb: o => drawSprite(fx.parts.spore2 ? fx.parts.spore2[Math.floor(tmr * 8) % fx.parts.spore2.length] : fx.hit[1], o.x, o.y, 0.2, o.z - 0.1, false, null, 0, 0.6, false, [200, 140, 230]),
  glass: o => drawSprite(fx.parts.glassshard ? fx.parts.glassshard[Math.floor(tmr * 12 + o.x * 3) % fx.parts.glassshard.length] : fx.hit[1], o.x, o.y, 0.1, o.z - 0.05, false, null, 0, 0.7, false, o.friendly ? [200, 255, 220] : [210, 235, 255]),
  refl: o => drawSprite(fx.fireball[Math.floor(tmr * 14) % fx.fireball.length], o.x, o.y, 0.26, o.z - 0.13, false, 1.2, 0, 0, true, [190, 230, 255]),
  illu: o => drawSprite(fx.parts.illusion ? fx.parts.illusion[Math.floor(tmr * 10) % fx.parts.illusion.length] : fx.fireball[0], o.x, o.y, 0.24, o.z - 0.12, false, 1.2, 0, 0, true, [220, 170, 255]),
});
// ---------- Version 12: Blodets rytm – stil, avrättningar, resurser, parering, överhälsa, inbördes strid, klockan och betyg ----------
// Förebilder: Ultrakill (stilmätare, blodläkning, parering), Doom Eternal (avrättningar och resursloopen), Doom (inbördes strid),
// Quake (överhälsa), Turbo Overkill och Dusk (glidspark och glidhopp), Mullet MadJack (klockan) och Ultrakill/Dusk (våningsbetyg).
const STYLE_RANKS = [['D', 'DÖDANDE', '#8a7558', 0], ['C', 'CHOCKERANDE', '#c9a87a', 20], ['B', 'BRUTALT', '#9fe060', 45], ['A', 'ANARKISTISKT', '#60c0ff', 75], ['S', 'SKONINGSLÖST', '#ffd24a', 110], ['SS', 'SADISTISKT', '#ff9040', 150], ['SSS', 'KRYPTISKT', '#ff4030', 200]];
let style = { v: 0, peak: 0, floorPeak: 0, feed: [], last: [] }, killCtx = null;
const styleRank = () => { let r = 0; for (let i = 0; i < STYLE_RANKS.length; i++) if (style.v >= STYLE_RANKS[i][3]) r = i; return r; };
function styleAdd(pts, label) {
  if (!run) return; const before = styleRank(); style.v = Math.min(240, style.v + pts);
  if (label) { style.feed.unshift({ t: label, k: 2.4 }); if (style.feed.length > 3) style.feed.length = 3; }
  const r = styleRank(); style.floorPeak = Math.max(style.floorPeak, r);
  if (r > before) { if (r >= 3) play('combo', 0.5, 1 + r * 0.08); if (r > (profile.styleMax || 0)) profile.styleMax = r; }
}
function streamTo(x, y, n, tint) { for (let i = 0; i < n; i++) { const dx = P.x - x, dy = P.y - y; particles.push({ x: x + rnd(-0.2, 0.2), y: y + rnd(-0.2, 0.2), z: rnd(0.2, 0.7), vx: dx * rnd(1.6, 2.4), vy: dy * rnd(1.6, 2.4), vz: 0.2, life: 0.45, maxLife: 0.45, img: fx.hit[1], size: 0.06, add: true, tint }); } }
function overheal(n) { // läkning som får gå över max (upp till 150 %) och sjunker sakta tillbaka
  const cap = maxHp() * 1.5; if (P.hp >= cap) return 0; const b = P.hp; P.hp = Math.min(cap, P.hp + n * (dmod('gold') ? 0.7 : 1)); return P.hp - b;
}
function loopKill(e) { // varje död: stilpoäng, blodläkning, resurser och klockan
  const ctx = killCtx || {}, wid = WEAPONS[P.weapon].id, d = Math.hypot(e.x - P.x, e.y - P.y), tags = [];
  let pts = e.boss ? 60 : e.guardian ? 40 : e.elite ? 20 : 8;
  if (ctx.exec) tags.push(['AVRÄTTNING', 10]); else if (ctx.parry) tags.push(['PARERAD', 10]); else if (ctx.infight) tags.push(['INBÖRDES', 12]); else if (ctx.melee || ctx.kick) tags.push(['NÄRSTRID', 6]);
  if (!ctx.infight && !ctx.quiet && !ctx.exec) { const n = style.last.filter(w => w === wid).length; if (style.last.length >= 3 && n === 0) tags.push(['NYTT VAPEN', 6]); else if (n >= 5) pts *= 0.5; style.last.unshift(wid); if (style.last.length > 6) style.last.length = 6; }
  if (P.jz > 0.25) tags.push(['I LUFTEN', 8]);
  if (P.slide > 0) tags.push(['GLIDNING', 6]);
  if ((e.airZ > 0 && e.airT > 0) || e.v26land === tmr) { tags.push(['JONGLERING', 10]); V26B.jst.airKills++; } // version 26B: dödad i luften
  if (e.headT && tmr - e.headT < 0.1) tags.push(['HUVUDTRÄFF', 5]);
  if (killTimes.length >= 2) tags.push([killTimes.length >= 4 ? 'MASSAKER' : 'FLERDÖD', 4 * killTimes.length]);
  if (ctx.stealth) tags.push(['SMYGDÖD', 8]);
  if (e.overkill) tags.push(['I BITAR', 4]); else if (ctx.boom) tags.push(['SPRÄNGD', 5]);
  for (const [, p] of tags) pts += p;
  for (const [t] of tags.slice(0, 2).reverse()) style.feed.unshift({ t: '+' + t, k: 2.4 }); if (style.feed.length > 3) style.feed.length = 3;
  styleAdd(pts, tags.length ? '' : '+DÖD');
  const r = styleRank(); if (r >= 2 && !e.boss) run.gold += r - 1; if (r >= 3) gainXp(r);
  if (d < 2.3 && !e.boss && !ctx.exec) { const h = heal(3 + mod('bloodHeal'), true); if (h > 0) streamTo(e.x, e.y, 4, [255, 60, 50]); } // blodet: dödanden nära läker
  if (e.burn > 0 && !e.boss) { const a = 6; P.armor = Math.min(200, P.armor + a); streamTo(e.x, e.y, 5, [120, 180, 255]); spawnText(e.x, e.y, `+${a} SKYDD`, '#9fc4ff'); } // brinnande fiender ger skydd
  if ((ctx.melee || ctx.kick || ctx.exec) && !e.boss) ammoBits(e); // närstridsdödanden ger ammo
  if (cmode('clock')) clockAdd(ctx.exec ? 99 : tags.length ? 4.5 : 3);
}
function ammoBits(e) {
  let any = false; for (let i = 0; i < WEAPONS.length; i++) { const w = WEAPONS[i], k = w.ammo; if (!P.has[i] || !AMMO[k] || k === 'none' || k === 'mana' || !AMMO[k].max) continue; const add = Math.max(1, Math.ceil(AMMO[k].max * 0.06)); if (P.ammo[k] < AMMO[k].max) { P.ammo[k] = Math.min(AMMO[k].max, P.ammo[k] + add); any = true; } }
  if (any) { streamTo(e.x, e.y, 5, [255, 220, 90]); spawnText(e.x, e.y, '+AMMO', '#ffd24a'); }
}
// ---- avrättningar: fiender på låg hälsa vacklar; en spark eller ett närstridsslag avrättar dem och ger hälsa ----
const canExec = e => e && !e.dead && !e.dying && !e.boss && (e.staggerT || 0) > tmr;
function staggerCheck(e, opt) {
  if (e.boss || e.hp <= 0 || e.staggered || opt.quiet || opt.exec || e.maxHp < 3 || e.decoy) return;
  if (e.hp <= e.maxHp * 0.25) { e.staggered = true; e.staggerT = tmr + 2.4; e.stun = Math.max(e.stun || 0, 1.3); spawnText(e.x, e.y, 'VACKLAR', '#80e0ff'); firstHint('stagger', 'VACKLANDE FIENDER LYSER – SPARKA (V) ELLER SLÅ DEM FÖR EN AVRÄTTNING SOM GER HÄLSA.'); }
}
function execute(e) {
  if (!canExec(e)) return false;
  e.staggerT = 0; const x = e.x, y = e.y;
  hurtEnemy(e, e.hp + 999, x, y, { noProc: true, exec: true });
  const h = overheal(15 + mod('killHeal')); P.iframe = Math.max(P.iframe, 0.5); hitStop = Math.max(hitStop, 0.12); P.shake = Math.max(P.shake, 1.1);
  play('kick', 1, 0.7); play('gore', 0.8, 0.9, { x, y }); streamTo(x, y, 10, [255, 70, 60]); spawnText(x, y, h > 0 ? `AVRÄTTAD +${Math.round(h)}` : 'AVRÄTTAD', '#ff6050');
  for (let i = 0; i < 6; i++) spawnBlood(x, y); stat('executions'); vib('kill');
  return true;
}
// ---- sparkparering: sparka ett skott i rätt ögonblick så flyger det tillbaka mot skytten ----
function kickParry() {
  let n = 0;
  for (const p of projectiles) {
    if (p.dead || p.friendly || !p.src || NOREFL.has(p.kind)) continue;
    const dx = p.x - P.x, dy = p.y - P.y, d = Math.hypot(dx, dy); if (d > 1.7) continue;
    let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off)); if (Math.abs(off) > 1.05) continue;
    const src = p.src !== P && !p.src.dead && p.src.x !== undefined ? p.src : null, a = src ? Math.atan2(src.y - P.y, src.x - P.x) : P.a, sp = Math.max(11, Math.hypot(p.vx, p.vy) * 1.6);
    p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.x = P.x + Math.cos(a) * 0.6; p.y = P.y + Math.sin(a) * 0.6;
    p.friendly = true; p.reflK = p.kind; p.kind = 'refl'; p.life = 2; p.src = P; p.parried = true; p.dmg = Math.max(6, p.dmg || 5) * 2.5 * (1 + mod('reflectDmg')); n++;
  }
  if (n) { overheal(10); hitStop = Math.max(hitStop, 0.1); play('parry', 0.9, 1.2); flashes.push({ x: P.x, y: P.y, t: 0.12, r: 3, col: [255, 240, 200] }); spawnText(P.x + Math.cos(P.a), P.y + Math.sin(P.a), 'PARERAT! +10', '#ffe9a8'); styleAdd(12 * n, '+PARERING'); stat('parries'); }
  return n;
}
// ---- inbördes strid: fiendernas skott skadar andra fiender, som då ger igen ----
function infightHit(p) {
  if (!p.src || p.src === P || !p.src.d || p.friendly) return false;
  const v = ents.find(o => o !== p.src && !o.dead && !o.dying && !o.hidden && !o.ally && !o.dormant && !o.dummy && Math.hypot(o.x - p.x, o.y - p.y) < 0.32 * o.d.size * (o.boss ? 1.8 : 1));
  if (!v || v.type === p.src.type) return false; // samma sort skadar inte varandra
  if (v.r25g && r25Pass(v)) return false; // version 25: truppens skott går igenom sköldvakten
  p.dead = true; hurtEnemy(v, p.dmg || 5, p.x, p.y, { noProc: true, infight: true });
  if (!v.dead && !v.boss && !p.src.boss && !p.src.dead) { v.feud = p.src; v.feudT = tmr + 6; if ((v.feudMsg || 0) < tmr) { v.feudMsg = tmr + 3; spawnText(v.x, v.y, 'BRÅK!', '#ff9050'); } firstHint('infight', 'FIENDERNAS SKOTT SKADAR ANDRA SORTERS FIENDER – LOCKA DEM ATT TRÄFFA VARANDRA.'); stat('infights'); }
  return true;
}
function feudTick(e, dt) { // en fiende som blivit träffad av en annan ger igen en stund
  const t = e.feud; if (!t || t.dead || t.dying || (e.feudT || 0) < tmr || e.boss) { e.feud = null; return false; }
  const d = Math.hypot(t.x - e.x, t.y - e.y), a = Math.atan2(t.y - e.y, t.x - e.x); e.cd -= dt;
  if (e.d.melee) {
    if (d > e.d.range + 0.4) { const sp = e.d.speed * diff().speed * dt * (e.slow > 0 ? 0.5 : 1), nx = e.x + Math.cos(a) * (sp + 0.3), ny = e.y + Math.sin(a) * (sp + 0.3);
      if ((voidAt(nx, ny) || deepAt(nx, ny)) && !e.d.float) { e.feud = null; return false; } // går inte ut i tomrummet eller djupt vatten för ett bråk
      const ox = e.x, oy = e.y; tryMove(e, Math.cos(a) * sp, Math.sin(a) * sp, 0.28); e.mvx = e.x - ox; e.mvy = e.y - oy; e.state = 'move'; }
    else if (e.cd <= 0) { e.cd = e.d.cd; e.state = 'attack'; e.t = 0; e.didHit = true; hurtEnemy(t, e.d.dmg * 0.8, t.x, t.y, { noProc: true, infight: true }); if (!t.dead && !t.boss) { t.feud = e; t.feudT = tmr + 6; } play('splat', 0.4, 0.8, { x: t.x, y: t.y }); }
  } else if (e.cd <= 0 && hasLOS(e.x, e.y, t.x, t.y)) { e.cd = e.d.cd * 1.2; e.state = 'attack'; e.t = 0; e.didHit = true; shootFireball(e, a, e.d.proj === 'orb' ? 3.4 : 5.2, e.d.dmg, false, e.d.proj); }
  if (e.state === 'attack' && e.t > 0.5) e.state = 'move';
  return true;
}
// ---- glidspark och glidhopp ----
function slideTick(dt) {
  if (P.slide > 0 && !P.wasSliding) { P.slideId = (P.slideId || 0) + 1; } P.wasSliding = P.slide > 0;
  if (!(P.slide > 0)) return;
  const sp = Math.hypot(P.vx, P.vy); if (sp < 2) return; const mx = P.vx / sp, my = P.vy / sp;
  for (const e of ents) {
    if (e.dead || e.dying || e.hidden || e.dormant || e.slideHit === P.slideId) continue;
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); if (d > 0.9 + e.d.size * 0.25 || (dx * mx + dy * my) < 0) continue;
    e.slideHit = P.slideId; const k = hurtEnemy(e, 5 * meleeMul(), e.x, e.y, { melee: true, slide: true });
    if (!k && !e.boss && !e.dead) { e.knock = { vx: mx * 7 / Math.max(0.6, e.d.size), vy: my * 7 / Math.max(0.6, e.d.size), t: 0.25 }; e.stun = Math.max(e.stun || 0, 0.6); }
    play('kick', 0.8, 0.9); hitStop = Math.max(hitStop, 0.04); P.shake = Math.max(P.shake, 0.5); styleAdd(3, '');
  }
}
function slideJump() { // hopp mitt i en glidning behåller farten
  if (!(P.slide > 0)) return; const sp = Math.hypot(P.vx, P.vy); if (sp < 2) return;
  P.launch = { vx: P.vx / sp * 3.4, vy: P.vy / sp * 3.4, t: 0, keepG: true }; P.slide = 0; P.jv = 3.7; play('whoosh', 0.5, 1.3); styleAdd(2, '');
}
// ---- klockan: ett utmaningsläge där varje död köper mer tid ----
const CLOCK_MAX = 12;
function clockAdd(s) { if (!run) return; run.clockT = Math.min(CLOCK_MAX, (run.clockT || 0) + s); run.clockFlash = 0.4; }
function clockTick(dt) {
  if (!cmode('clock') || !lvl || lvl.hub || state !== 'play') return;
  run.clockFlash = Math.max(0, (run.clockFlash || 0) - dt);
  if (levelBanner > 0.5 || bossBanner > 0.5 || portals.length || !ents.some(e => !e.dead && !e.dummy && !e.ally && !e.dormant)) return; // tiden står still när det inte finns något att döda
  run.clockT = (run.clockT ?? 10) - dt;
  if (run.clockT <= 3 && Math.floor(run.clockT * 2) !== Math.floor((run.clockT + dt) * 2)) play('click', 0.6, 1.6);
  if (run.clockT <= 0) { const lu = run.livesUsed; run.cause = 'KLOCKAN'; P.iframe = 0; hurtPlayer(1e6); if (state === 'play' && run.livesUsed > lu) run.clockT = 5; } // återupplivningen ger halva klockan
}
// ---- våningsbetyg ----
function floorGrade(extra) {
  const par = 25 + totalEnemies * 5, tk = levelTime <= par ? 1 : par / levelTime, kl = totalEnemies ? kills / totalEnemies : 1, sc = totalSecrets ? secrets / totalSecrets : 1, dm = 1 - Math.min(1, lvlStat.taken / (maxHp() * 1.5)), st = style.floorPeak / (STYLE_RANKS.length - 1);
  const v = tk * 0.22 + kl * 0.22 + sc * 0.14 + dm * 0.22 + st * 0.2, g = v >= 0.85 ? 'S' : v >= 0.7 ? 'A' : v >= 0.55 ? 'B' : v >= 0.4 ? 'C' : 'D', bonus = { S: 50, A: 30, B: 15, C: 5, D: 0 }[g];
  if (bonus) { run.gold += bonus; extra.push(`BETYG ${g}: +${bonus} GULD`); }
  if (g === 'S') stat('gradeS'); run.grades = (run.grades || '') + g;
  return { g, v };
}
const GRADE_COL = { S: '#ffd24a', A: '#9fe060', B: '#60c0ff', C: '#c9a87a', D: '#8a7558' };
// ---- per bildruta ----
function setupLoop() { style.v = Math.min(style.v, 30); style.floorPeak = 0; style.feed = []; if (run) run.clockT = cmode('clock') ? 10 : 0; P.launch = null; }
function loopTick(dt) {
  style.v = Math.max(0, style.v - dt * (1.5 + styleRank() * 1.4)); for (const f of style.feed) f.k -= dt; style.feed = style.feed.filter(f => f.k > 0);
  if (P.hp > maxHp()) P.hp = Math.max(maxHp(), P.hp - dt * 2); // överhälsan sjunker
  for (const e of ents) if (!e.dead && !e.dying && !e.boss && !e.knock && !e.d.float && e.d.ai !== 'fly' && e.d.ai !== 'wisp' && !e.hidden && voidAt(e.x, e.y)) { spawnText(e.x, e.y, 'FÖLL!', '#c0e0ff'); play('void_fall', 0.5, 1.3, { x: e.x, y: e.y }); hurtEnemy(e, e.hp + 999, e.x, e.y, { noProc: true }); } // den som står i tomrummet faller
  for (const e of ents) if (canExec(e)) { if (Math.floor(tmr * 8) % 2) e.flash = Math.max(e.flash, 0.05); if (!settings.lowfx && Math.random() < dt * 12) particles.push({ x: e.x + rnd(-0.2, 0.2), y: e.y + rnd(-0.2, 0.2), z: e.d.size * 0.9, vx: 0, vy: 0, vz: 0.5, life: 0.4, maxLife: 0.4, img: fx.hit[1], size: 0.05, add: true, tint: [140, 230, 255] }); }
  for (const it of items) { if (it.taken || !it.drop || !LOOP_MAGNET.has(it.type)) continue; const dx = P.x - it.x, dy = P.y - it.y, d = Math.hypot(dx, dy); if (d < 2.4 && d > 0.2) { it.x += dx / d * Math.min(d, 7 * dt); it.y += dy / d * Math.min(d, 7 * dt); } } // föremål dras till dig
  slideTick(dt); clockTick(dt);
}
const LOOP_MAGNET = new Set(['health', 'ammo', 'armor', 'gold', 'goldpile', 'gear', 'sporesack', 'meat', 'stones', 'battery']);
function drawLoopHud(g) {
  if (cmode('clock') && run && lvl && !lvl.hub) { const t = Math.max(0, run.clockT || 0), s = t.toFixed(1), w = textW(s) * 2; txt(s, Math.round((W - w) / 2), 4, t < 3 ? (tmr % 0.4 < 0.2 ? '#ff4030' : '#a02010') : run.clockFlash > 0 ? '#9fe060' : '#ffe9a8', 2); }
  if (settings.styleMeter === false || style.v < 0.5) return;
  const r = styleRank(), R = STYLE_RANKS[r], x0 = W - 76 - hudIX, y0 = HL ? HL.styleY : 72, nx = STYLE_RANKS[r + 1], k = nx ? (style.v - R[3]) / (nx[3] - R[3]) : 1, lines = style.feed.slice(0, HL && HL.t ? clamp(Math.floor((VH - 44 - y0 - 23) / 9), 0, 3) : 3); // MENY: pekskärm – listan slutar ovanför tipsraden längst ned // smal, i högerkanten (utanför bildens mitt)
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x0 - 3, y0 - 3, 75, 26 + lines.length * 9);
  txt(R[0], x0, y0, R[2], 2);
  v26cRankFx(g, x0, y0, r); // version 26C: ny rang – ram som växer ut
  g.fillStyle = '#2a2018'; g.fillRect(x0, y0 + 18, 72, 2); g.fillStyle = R[2]; g.fillRect(x0, y0 + 18, Math.round(72 * clamp(k, 0, 1)), 2);
  lines.forEach((f, i) => { const s = f.t.length > 9 ? f.t.slice(0, 9) : f.t; txt(s, x0, y0 + 23 + i * 9, '#e8d9b0', 1, true, Math.min(1, f.k * 2)); });
}
// ---------- Version 13: runboken och ångkanonen ----------
function runeFire(wp, base) {
  const a = P.a + rnd(-1, 1) * wp.spread * (1 - WS.aim);
  projectiles.push({ x: P.x + Math.cos(a) * 0.45, y: P.y + Math.sin(a) * 0.45, z: 0.5, vx: Math.cos(a) * 9, vy: Math.sin(a) * 9, dmg: base * (1 + mod('runeDmg')), friendly: true, kind: 'prune', life: 2.6 });
  noise(3 * (1 - mod('noiseReduce')));
}
function updatePrune(p, dt) { // runorna söker upp närmaste fiende framför sig
  const sp = Math.hypot(p.vx, p.vy), cur = Math.atan2(p.vy, p.vx), turn = (up('rb_seek') ? 6 : 3) * dt;
  let best = null, bd = 9;
  for (const e of ents) { if (e.dead || e.dying || e.hidden || e.dormant || (p.skip && p.skip === e)) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); let off = Math.atan2(e.y - p.y, e.x - p.x) - cur; off = Math.atan2(Math.sin(off), Math.cos(off)); if (d < bd && Math.abs(off) < 1.3) { best = e; bd = d; } }
  if (best) { let off = Math.atan2(best.y - p.y, best.x - p.x) - cur; off = Math.atan2(Math.sin(off), Math.cos(off)); const na = cur + clamp(off, -turn, turn); p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp; }
  if (!settings.lowfx && Math.random() < dt * 30) particles.push({ x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, vz: 0, life: 0.25, maxLife: 0.25, img: fx.hit[1], size: 0.04, add: true, tint: [190, 140, 255] });
  const hit = ents.find(e => !e.dead && !e.dying && !e.hidden && !e.dormant && e !== p.skip && Math.hypot(e.x - p.x, e.y - p.y) < 0.38 * e.d.size * (e.boss ? 1.8 : 1));
  if (hit) { p.dead = true; const k = hurtEnemy(hit, p.dmg, p.x, p.y, {}); hitMark = 0.12; hitKill = hitKill || k; lvlStat.hits++; play('rune_hit', 0.5, rnd(0.9, 1.2), { x: p.x, y: p.y });
    if (up('rb_ink') && !hit.dead) hit.slow = Math.max(hit.slow || 0, 2.5);
    if (up('rb_split') && !p.small) for (const s of [-0.8, 0.8]) { const a = Math.atan2(p.vy, p.vx) + Math.PI + s; projectiles.push({ x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * 8, vy: Math.sin(a) * 8, dmg: p.dmg * 0.5, friendly: true, kind: 'prune', life: 1.4, small: true, skip: hit }); }
    return; }
  if (solid(p.x, p.y) || p.life <= 0) { p.dead = true; sparks(p.x - p.vx * dt, p.y - p.vy * dt, p.z, 2); }
}
function runeWard(wp) { // högerklick: en virvel av sidor som fångar skott
  const i = WEAPONS.indexOf(wp); if ((P.wardCd || 0) > tmr || P.mags[i] < 2) return;
  P.mags[i] -= 2; P.wardT = tmr + (up('rb_ward') ? 4 : 2.5); P.wardCd = tmr + 6; play('page_ward', 0.8); firstHint('ward', 'HÖGERKLICK MED RUNBOKEN: EN VIRVEL AV SIDOR FÅNGAR SKOTTEN EN STUND.');
}
function wardBlock(p) {
  if (!((P.wardT || 0) > tmr) || p.friendly || !p.src || NOREFL.has(p.kind) || Math.hypot(p.x - P.x, p.y - P.y) > 1.3) return false;
  if (up('rb_ward')) { const a = Math.atan2(p.src.y - P.y, p.src.x - P.x), sp = Math.max(9, Math.hypot(p.vx, p.vy)); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.friendly = true; p.reflK = p.kind; p.kind = 'refl'; p.life = 2; p.src = P; p.dmg = Math.max(5, p.dmg || 5) * 1.5; }
  else p.dead = true;
  for (let i = 0; i < 5; i++) particles.push({ x: p.x, y: p.y, z: 0.5, vx: rnd(-1.5, 1.5), vy: rnd(-1.5, 1.5), vz: rnd(0, 1), life: 0.5, maxLife: 0.5, img: fx.parts.page ? fx.parts.page[i % fx.parts.page.length] : fx.hit[1], size: 0.06 });
  play('page_ward', 0.3, 1.4, { x: p.x, y: p.y }); return true;
}
function steamBlast(wp, base) { // ångkanonen: en kon av skållande ånga som knuffar
  if (up('sc_fast')) WS.cd *= 0.65;
  const range = up('sc_range') ? 6 : 4.5, cone = 0.5, dmg = base * (1 + mod('steamDmg'));
  P.shake = Math.max(P.shake, 0.6); noise(5);
  let hits = 0;
  for (const e of ents) {
    if (e.dead || e.dying || e.hidden || e.dormant) continue;
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy); let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off));
    if (d > range + e.d.size * 0.3 || Math.abs(off) > Math.max(cone, 0.4 * e.d.size / Math.max(1, d)) || !hasLOS(P.x, P.y, e.x, e.y)) continue;
    const k = hurtEnemy(e, dmg * (1 - d / range * 0.4), e.x, e.y, {}); hits++; hitKill = hitKill || k;
    if (!e.dead && up('sc_scald')) e.burn = Math.max(e.burn || 0, 3);
    if (!e.dead && !e.boss) { const f = (up('sc_push') ? 10 : 6) * (1 - d / range * 0.5) / Math.max(0.6, e.d.size); e.knock = { vx: dx / (d || 1) * f, vy: dy / (d || 1) * f, t: 0.3 }; e.stun = Math.max(e.stun || 0, 0.3); }
  }
  for (const p of projectiles) if (!p.friendly && !p.dead && !NOREFL.has(p.kind)) { const dx = p.x - P.x, dy = p.y - P.y, d = Math.hypot(dx, dy); let off = Math.atan2(dy, dx) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off)); if (d < range && Math.abs(off) < cone) { p.dead = true; spawnPuff(p.x, p.y, 2); } } // ångan blåser bort skotten
  for (let i = 0; i < 18; i++) { const a = P.a + rnd(-cone, cone), sp = rnd(4, 8) * range / 4.5; particles.push({ x: P.x + Math.cos(a) * 0.5, y: P.y + Math.sin(a) * 0.5, z: rnd(0.3, 0.7), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(0, 0.4), life: 0.55, maxLife: 0.55, img: fx.parts.steam ? fx.parts.steam[i % fx.parts.steam.length] : fx.hit[1], size: rnd(0.1, 0.18), tint: [235, 235, 240] }); }
  if (hits) { hitMark = 0.1; lvlStat.hits++; play('steam_hiss', 0.5, rnd(0.9, 1.1)); }
}
function weaponV13Tick(wp, dt) {
  if (wp.runebook && aimDown && !WS.rbAim) { WS.rbAim = true; runeWard(wp); }
  if (!aimDown) WS.rbAim = false;
  if (wp.runebook || wp.steamcannon) WS.aim = 0;
}

// ---------- Version 13: bläck, rullband, smält metall, ångventiler, stansar och pulpeter ----------
let belts = new Map(), vents = [], inkPuddles = [], beltTex = null, beltIdx = -1;
const inkAt = (x, y) => (map[y | 0] && map[y | 0][x | 0] === 'Ŭ') || inkPuddles.some(k => Math.hypot(k.x - x, k.y - y) < 0.7);
function rotTex(t, k) { // vrid en kvadratisk golvtextur k kvartsvarv
  if (!t || !k) return t; const w = t.w, h = t.h, out = new Uint32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let nx = x, ny = y; for (let i = 0; i < k; i++) { const tx = w - 1 - ny; ny = nx; nx = tx; } out[ny * w + nx] = t.data[y * w + x]; }
  return { w, h, data: out };
}
function setupV13() {
  belts = new Map(); vents = []; inkPuddles = []; P.inkT = 0; P.wardT = 0;
  if (lvl.belts && lvl.belts.length) for (const b of lvl.belts) belts.set(b.x + ',' + b.y, { dx: b.dx, dy: b.dy });
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { const c = map[y][x];
    if (c === 'Ÿ' && !belts.has(x + ',' + y)) belts.set(x + ',' + y, { dx: 1, dy: 0 });
    if (c === 'ź') vents.push({ x: x + 0.5, y: y + 0.5, ph: (x * 7 + y * 13) % 32 / 10, on: false }); }
  // rullbanden: fyra riktningar, två bildrutor, vridna ur samma textur
  if (belts.size && tex.floor_conveyor) {
    if (!beltTex) beltTex = [0, 1, 2, 3].map(k => [rotTex(tex.floor_conveyor, k), rotTex(tex.floor_conveyor2 || tex.floor_conveyor, k)]);
    beltIdx = floorTexs.length; for (let k = 0; k < 4; k++) floorTexs.push(beltTex[k][0]);
    for (const [key, b] of belts) { const [x, y] = key.split(',').map(Number), k = b.dx > 0 ? 0 : b.dy > 0 ? 1 : b.dx < 0 ? 2 : 3; cellFloor[y * mw + x] = beltIdx + k; }
  } else beltIdx = -1;
  for (const pr of props) if (pr.ch === 'Ż') pr.ph = (pr.x * 5 + pr.y * 3) % 30 / 10;
}
function updateV13(dt) {
  // rullband: för med sig spelaren, fienderna och föremålen
  if (belts.size) {
    if (beltIdx >= 0 && beltTex) { const f = Math.floor(tmr / 0.12) % 2; for (let k = 0; k < 4; k++) floorTexs[beltIdx + k] = beltTex[k][f]; }
    const b = belts.get((P.x | 0) + ',' + (P.y | 0));
    if (b && P.jz < 0.1) { const along = P.vx * b.dx + P.vy * b.dy > 0.5, k = 2.4 * (along ? 1 + mod('beltSpeed') : 1); tryMove(P, b.dx * k * dt, b.dy * k * dt, 0.24); if ((P.beltSndT || 0) < tmr) { P.beltSndT = tmr + 1.9; play('belt_loop', 0.25); } firstHint('belt', 'RULLBANDEN FÖR DIG MED SIG – OCH FIENDERNA. LOCKA DEM IN I METALLEN.'); }
    for (const e of ents) { if (e.dead || e.boss || e.d.float || e.d.ai === 'fly') continue; const eb = belts.get((e.x | 0) + ',' + (e.y | 0)); if (eb) tryMove(e, eb.dx * 2.4 * dt, eb.dy * 2.4 * dt, 0.28); }
    for (const it of items) { if (it.taken) continue; const ib = belts.get((it.x | 0) + ',' + (it.y | 0)); if (ib && !solid(it.x + ib.dx * 0.6, it.y + ib.dy * 0.6)) { it.x += ib.dx * 2.4 * dt; it.y += ib.dy * 2.4 * dt; } }
  }
  // smält metall: som lava
  P.moltenAcc = (P.moltenAcc || 0) + dt;
  if (P.moltenAcc > 0.5) { P.moltenAcc = 0; const immune = mod('hazardImmune') > 0;
    if (cellUnder() === 'Ź' && P.jz < 0.12 && !immune) { run.cause = 'SMÄLT METALL'; hurtPlayer(10 * trapMul()); play('lava', 0.5, 1.2); P.burnFx = 0.6; }
    for (const e of ents) if (!e.dead && !e.boss && !e.dormant && e.d.ai !== 'moltengolem' && !e.d.float && e.d.ai !== 'fly' && cellAt(e.x, e.y) === 'Ź') { hurtEnemy(e, 7, e.x, e.y, { noProc: true, quiet: true }); e.burn = Math.max(e.burn, 1.5); } }
  // ångventiler: varning, sedan en stråle som skadar och lyfter
  for (const v of vents) {
    const t = (levelTime + v.ph) % 3.2, warn = t > 2.0 && t < 2.6, on = t >= 2.6;
    if (warn && !settings.lowfx && Math.random() < dt * 14) particles.push({ x: v.x + rnd(-0.3, 0.3), y: v.y + rnd(-0.3, 0.3), z: 0.02, vx: 0, vy: 0, vz: 0.6, life: 0.4, maxLife: 0.4, img: fx.parts.steam ? fx.parts.steam[0] : fx.hit[1], size: 0.06, tint: [230, 230, 235] });
    if (on && !v.on && Math.hypot(P.x - v.x, P.y - v.y) < 9) play('vent_burst', 0.6, rnd(0.9, 1.1), { x: v.x, y: v.y });
    if (on && !v.on) { v.hit = new Set();
      if (Math.hypot(P.x - v.x, P.y - v.y) < 0.75 && P.jz < 0.4) { run.cause = 'ÅNGVENTILEN'; hurtPlayer(10 * Math.max(0, 1 - mod('ventResist')) * trapMul(), v.x, v.y); P.jv = Math.max(P.jv, 3.2); P.jz = Math.max(P.jz, 0.01); }
      for (const e of ents) if (!e.dead && !e.boss && Math.hypot(e.x - v.x, e.y - v.y) < 0.8) hurtEnemy(e, 9, e.x, e.y, { noProc: true }); }
    v.on = on;
  }
  // stansarna slår ned var tredje sekund
  for (const pr of props) { if (pr.ch !== 'Ż' || !pr.frames) continue; const t = (levelTime + (pr.ph || 0)) % 3, down = t > 2.7, mid = t > 2.4;
    pr.img = pr.frames[down ? Math.min(2, pr.frames.length - 1) : mid ? Math.min(1, pr.frames.length - 1) : 0];
    if (down && !pr.slam) { pr.slam = true; const d = Math.hypot(P.x - pr.x, P.y - pr.y); if (d < 12) play('press_slam', 0.8 * clamp(1 - d / 12, 0.1, 1), rnd(0.95, 1.05), { x: pr.x, y: pr.y });
      if (d < 1.25 && P.jz < 0.3) { run.cause = 'STANSEN'; hurtPlayer(18 * Math.max(0, 1 - mod('pressResist')) * trapMul(), pr.x, pr.y, 'melee'); P.shake = Math.max(P.shake, 1.4); for (let i = 0; i < 4; i++) tryMove(P, (P.x - pr.x) / (d || 1) * 0.15, (P.y - pr.y) / (d || 1) * 0.15, 0.24); }
      for (const e of ents) if (!e.dead && !e.boss && Math.hypot(e.x - pr.x, e.y - pr.y) < 1.25) { hurtEnemy(e, 25, e.x, e.y, { noProc: true, boom: true }); }
      if (d < 6) P.shake = Math.max(P.shake, 0.6 * (1 - d / 6)); spawnPuff(pr.x, pr.y, 6); }
    if (!down) pr.slam = false; }
  // bläck: pölar som gör dig halvblind och långsam
  for (const k of inkPuddles) k.t -= dt; inkPuddles = inkPuddles.filter(k => k.t > 0);
  if (inkAt(P.x, P.y) && P.jz < 0.1) { const k = Math.max(0, 1 - mod('inkResist')); if (k > 0) { if (!(P.inkT > 0.3)) { play('ink_splash', 0.5); firstHint('ink', 'BLÄCKET GÖR DIG HALVBLIND OCH LÅNGSAM EN STUND.'); } P.inkT = Math.max(P.inkT || 0, 2.2 * k); } }
  P.inkT = Math.max(0, (P.inkT || 0) - dt);
}
const v13Slow = () => (P.inkT > 0 ? 0.7 : 1);
function drawV13World(list) {
  for (const k of inkPuddles) if (Math.hypot(k.x - P.x, k.y - P.y) < 16) list.push({ x: k.x, y: k.y, k: 'v13', t: 'ink', o: k });
  for (const v of vents) if (Math.hypot(v.x - P.x, v.y - P.y) < 16 && v.on) list.push({ x: v.x, y: v.y, k: 'v13', t: 'vent', o: v });
  if ((P.wardT || 0) > tmr) list.push({ x: P.x + Math.cos(P.a) * 0.6, y: P.y + Math.sin(P.a) * 0.6, k: 'v13', t: 'ward', o: P });
}
function drawV13Sprite(s) {
  const o = s.o;
  if (s.t === 'ink') { const f = fx.props.inkblot; drawSprite(f ? f[0] : fx.hit[1], o.x, o.y, 0.8, -0.38, false, null, 0, 0.2, false, [40, 40, 70], Math.max(0.2, 1 - o.t / 6)); return true; }
  if (s.t === 'vent') { const f = fx.props.steamjet; drawSprite(f ? f[Math.floor(tmr * 12) % f.length] : fx.hit[1], o.x, o.y, 1.1, 0, false, 1.1, 0, 0, false, [235, 235, 240], 0.25); return true; }
  if (s.t === 'ward') { const f = fx.parts.page; for (let i = 0; i < 6; i++) { const a = tmr * 4 + i / 6 * TAU; drawSprite(f ? f[i % f.length] : fx.hit[1], P.x + Math.cos(a) * 0.9, P.y + Math.sin(a) * 0.9, 0.12, 0.3 + Math.sin(a * 2) * 0.1, false, 1.1, 0, 0.6); } return true; }
  return false;
}
function drawV13Hud(g) {
  if (P.inkT > 0) { const k = Math.min(1, P.inkT / 1.2), gr = g.createRadialGradient(W / 2, HORIZON, VH * 0.18, W / 2, HORIZON, W * 0.55); gr.addColorStop(0, 'rgba(5,5,15,0)'); gr.addColorStop(1, `rgba(5,5,15,${0.92 * k})`); g.fillStyle = gr; g.fillRect(0, 0, W, VH); const im = hudImg.icon_ink; if (im) g.drawImage(im, 24, VH - 22, 8, 8); }
  if ((P.wardT || 0) > tmr) { g.fillStyle = 'rgba(200,170,255,0.06)'; g.fillRect(0, 0, W, VH); }
}
Object.assign(USES, {
  lectern(pr) { // pulpeten: läs boken för en bonus på våningen
    pr.used = true; pr.img = pr.frames[1] || pr.img; play('lectern_read', 0.9); stat('lecterns');
    const lore = mod('bookLore'), r = Math.floor(Math.random() * 4);
    if (r === 0) { for (let i = 0; i < seen.length; i++) seen[i] = 1; say('BOKEN VISAR VÅNINGENS KARTA', 2.5); }
    else if (r === 1) { overheal(30 + lore * 10); say(`BOKEN LÄKER DIG (+${30 + lore * 10})`, 2.5); }
    else if (r === 2) { P.rageT = Math.max(P.rageT || 0, 15 + lore * 5); say('BOKEN GER DIG RASERI', 2.5); }
    else { gainXp(30 + run.depth * 6 + lore * 15); say('BOKEN GER DIG KUNSKAP', 2.5); }
    if (lore) { run.gold += 10 * lore; spawnText(pr.x, pr.y, `+${10 * lore} GULD`, '#ffd24a'); }
    for (let i = 0; i < 10; i++) particles.push({ x: pr.x, y: pr.y, z: 0.6, vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(0.5, 1.5), life: 1, maxLife: 1, img: fx.parts.page ? fx.parts.page[i % fx.parts.page.length] : fx.hit[1], size: 0.06 });
  },
});

