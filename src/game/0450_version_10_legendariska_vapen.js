// ---------- Version 10: legendariska vapen ----------
const LEGENDS = {
  dragonshotgun: { base: 'shotgun', name: 'DRAKBÖSSAN', short: 'DRAKELD', text: 'SKOTTEN SÄTTER FYR PÅ FIENDERNA', snd: 'legend_fire_dragon', col: [255, 140, 60] },
  frostrifle: { base: 'rifle', name: 'FROSTGEVÄRET', short: 'ISGEVÄR', text: 'TRÄFFAR KAN FRYSA FIENDEN', snd: 'legend_fire_frost', col: [150, 220, 255] },
  soulpistol: { base: 'pistol', name: 'SJÄLAPISTOLEN', short: 'SJÄLEN', text: 'VARJE TRÄFF LÄKER DIG LITE', snd: 'legend_fire_soul', col: [150, 255, 180] },
  stormstaff: { base: 'staff', name: 'ÅSKSTAVEN', short: 'ÅSKSTAV', text: 'BLIXTAR SLÅR NED DÄR DU TRÄFFAR', snd: 'legend_fire_storm', col: [200, 220, 255] },
  bloodaxe: { base: 'axe', name: 'BLODYXAN', short: 'BLODYXA', text: 'LIVSSTÖLD, OCH RASERI NÄR DU DÖDAR', snd: 'legend_hit_blood', col: [220, 40, 50] },
  moonbow: { base: 'bow', name: 'MÅNBÅGEN', short: 'MÅNBÅGE', text: 'MÄRKTA FIENDER TAR 40 % MER SKADA', snd: 'legend_fire_moon', col: [190, 210, 255] },
};
const LEGEND_IDS = Object.keys(LEGENDS);
const legendOf = wid => run && run.legend && run.legend[wid] && LEGENDS[run.legend[wid]] ? run.legend[wid] : null;
let legendCtx = null; // vilken legend som gäller för spelarens träffar den här bildrutan
function legendHit(e, dmg, opt) { // effekter när ett legendariskt vapen träffar
  const id = legendCtx; if (!id || opt.noProc || e.dead) return dmg; dmg *= 1.2;
  if (id === 'dragonshotgun') { e.burn = Math.max(e.burn || 0, 3); e.burnAcc = Math.max(e.burnAcc || 0, 0.3); }
  else if (id === 'frostrifle') { if (Math.random() < 0.3) freeze(e, 1.4); }
  else if (id === 'soulpistol') { if (P.hp < maxHp()) heal(1.5, true); }
  else if (id === 'stormstaff') { if (Math.random() < 0.25) lightningAt(e.x, e.y, 0.15, 10 + run.depth * 2, true); }
  else if (id === 'bloodaxe') { heal(dmg * 0.12, true); }
  else if (id === 'moonbow') e.moonT = tmr + 6;
  return dmg;
}
function giveLegend(id, why) {
  const L = LEGENDS[id]; if (!L) return; const i = weaponIndex(L.base); if (i < 0) return;
  run.legend = Object.assign({}, run.legend, { [L.base]: id }); P.has[i] = true; P.mags[i] = effMag(i);
  play('legend_get', 0.9); say(`${why || 'LEGENDARISKT VAPEN'}: ${L.name} – ${L.text}`, 4); logEvent('LEGEND: ' + L.name); stat('legends');
  profile.legendsFound = Array.from(new Set((profile.legendsFound || []).concat(id))); saveProfile();
  for (let k = 0; k < 20; k++) { const a = k / 20 * TAU; particles.push({ x: P.x, y: P.y, z: 0.4, vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5, vz: 1, life: 0.9, maxLife: 0.9, img: fx.parts.legend ? fx.parts.legend[k % fx.parts.legend.length] : fx.hit[1], size: 0.07, add: true, tint: L.col }); }
}
Object.assign(USES, {
  legend(pr) { // legendaltaret: gör ett av dina vapen legendariskt
    const opts = LEGEND_IDS.filter(id => P.has[weaponIndex(LEGENDS[id].base)] && legendOf(LEGENDS[id].base) !== id);
    if (!opts.length) { say('ALTARET SVARAR INTE – DU BÄR INGET VAPEN DET KAN FÖRVANDLA', 2.5); return; }
    const gp = 120 + run.depth * 10;
    openUI(() => CardUI.choice({ title: 'LEGENDALTARET', subtitle: `${run.gold} GULD · ${profile.souls} SJÄLAR`, cancel: opts.length,
      options: opts.map(id => ({ label: `${LEGENDS[id].name} (${gp} GULD ELLER 50 SJÄLAR)`, text: LEGENDS[id].text })).concat({ label: 'GÅ', text: '' }) }, i => {
      closeUI(); if (i >= opts.length) return;
      if (run.gold >= gp) { run.gold -= gp; run.goldSpent = (run.goldSpent || 0) + gp; } else if (profile.souls >= 50) { profile.souls -= 50; saveProfile(); } else { say('DU HAR FÖR LITE GULD OCH SJÄLAR', 2); return; }
      pr.used = true; pr.img = pr.frames[1] || pr.img; play('legend_altar', 0.9); giveLegend(opts[i], 'ALTARET VÄCKER');
    }));
  },
});
function legendDropChance(e) { // eliter och väktare kan tappa ett legendariskt vapen
  if (!run || run.practice || !(e.elite || e.guardian)) return;
  if (Math.random() < (e.guardian ? 0.12 : 0.03) * (1 + mod('luck'))) { const id = LEGEND_IDS[(Math.random() * LEGEND_IDS.length) | 0]; const it = { type: 'legend', legend: id, x: e.x, y: e.y, taken: false, drop: true }; items.push(it); say('NÅGOT GLIMMAR I MÖRKRET…', 2); }
}

// ---------- Version 10: fångvaktare, grävare, likgrävare, rotvätte, armborstskytt och paddjätte ----------
let roots = [];
const AI_V10 = {
  jailer(e, dt, dist, los) { // kastar en kedja som binder dig
    e.chainT = (e.chainT ?? rnd(2, 4)) - dt;
    if (e.chainT <= 0 && los && dist > 2 && dist < 8 && e.state !== 'pain') { e.chainT = rnd(5, 7); e.state = 'attack'; e.t = 0; e.didHit = true; shootFireball(e, Math.atan2(P.y - e.y, P.x - e.x), 9, 4, false, 'chain'); play('chain_throw', 0.7, 1, { x: e.x, y: e.y }); return true; }
    return false;
  },
  burrower(e, dt, dist) { // gräver under marken och bryter upp under dig
    e.cd = 99;
    if (e.surfT > 0) { e.surfT -= dt; e.hidden = false; e.ghost = 0; if (e.biteAt > 0) { e.biteAt -= dt; if (e.biteAt <= 0 && dist < 1.6) { run.cause = e.d.name; hurtPlayer(e.d.dmg, e.x, e.y, 'melee'); P.jv = Math.max(P.jv || 0, 2); } }
      if (e.surfT <= 0) { e.hidden = true; play('burrow_dig', 0.4, 1, { x: e.x, y: e.y }); } return e.biteAt > 0; }
    e.hidden = true; e.state = 'move';
    if (dist < 16) { const a = Math.atan2(P.y - e.y, P.x - e.x), sp = 2.6 * dt; tryMove(e, Math.cos(a) * sp, Math.sin(a) * sp, 0.25); }
    if (!settings.lowfx && Math.random() < dt * 10) particles.push({ x: e.x + rnd(-0.3, 0.3), y: e.y + rnd(-0.3, 0.3), z: 0.02, vx: 0, vy: 0, vz: 0.4, life: 0.4, maxLife: 0.4, img: fx.parts.dirt ? fx.parts.dirt[0] : fx.parts.dust ? fx.parts.dust[0] : fx.hit[1], size: 0.05, tint: [120, 90, 60] });
    if (dist < 1.1) { e.surfT = 3; e.biteAt = 0.25; e.state = 'attack'; e.t = 0; e.hidden = false; spawnPuff(e.x, e.y, 8); play('burrow_emerge', 0.8, 1, { x: e.x, y: e.y }); P.shake = Math.max(P.shake, 0.8); }
    return true;
  },
  gravedigger(e, dt, dist, los) { // väcker döda kroppar
    e.raiseT = (e.raiseT ?? rnd(3, 5)) - dt;
    if (e.raiseT <= 0 && e.state !== 'pain') { const c = ents.find(o => o.dead && !o.gibbed && !o.boss && !o.raised && o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 6);
      if (c) { e.raiseT = rnd(7, 9); c.raised = true; c.gibbed = true; const s = makeEnemy('S', c.x, c.y); s.alert = true; s.minion = true; ents.push(s); totalEnemies++; spawnPuff(c.x, c.y, 6); play('raise_dead', 0.7, 1, { x: c.x, y: c.y }); e.state = 'attack'; e.t = 0; e.didHit = true; return true; }
      e.raiseT = 1.5; }
    return false;
  },
  rootling(e, dt, dist, los) { // rötter skjuter upp under dig
    e.cd = 99; e.rootT = (e.rootT ?? rnd(1.5, 3)) - dt;
    if (e.rootT <= 0 && los && dist < 9 && e.state !== 'pain') { e.rootT = rnd(4, 5.5); e.state = 'attack'; e.t = 0; e.didHit = true; roots.push({ x: P.x, y: P.y, t: 0.9, dmg: e.d.dmg }); play('rootling', 0.5, 1, { x: e.x, y: e.y }); return true; }
    return false;
  },
  crossbowman(e, dt, dist, los) { // skjuter bultar och söker skydd när han träffas
    e.cd = 99; e.boltT = (e.boltT ?? rnd(1.5, 2.5)) - dt;
    if (e.flash > 0.08 && (e.coverCd || 0) < tmr) { e.coverCd = tmr + 4; e.fleeT = 1.2; }
    if (e.boltT <= 0 && los && dist < 14 && e.state !== 'pain' && !(e.fleeT > 0)) { e.boltT = rnd(2.2, 3); e.state = 'attack'; e.t = 0; e.didHit = true; shootFireball(e, Math.atan2(P.y - e.y, P.x - e.x) + rnd(-0.04, 0.04), 13, e.d.dmg, false, 'arrow'); play('crossbow_enemy', 0.7, 1, { x: e.x, y: e.y }); return true; }
    return false;
  },
  toad(e, dt, dist, los) { // tungan drar dig, och hoppet slår i marken
    e.tongueT = (e.tongueT ?? rnd(2, 4)) - dt; e.leapT = (e.leapT ?? rnd(4, 6)) - dt;
    if (e.leap) { e.leap.t -= dt; const sp = 6 * dt; tryMove(e, Math.cos(e.leap.a) * sp, Math.sin(e.leap.a) * sp, 0.3); e.state = 'move';
      if (e.leap.t <= 0) { e.leap = null; play('toad_land', 0.8, 1, { x: e.x, y: e.y }); P.shake = Math.max(P.shake, 1 * clamp(1 - dist / 8, 0, 1)); spawnPuff(e.x, e.y, 10); if (dist < 2.2 && P.jz < 0.12) { run.cause = e.d.name; hurtPlayer(e.d.dmg * 0.8, e.x, e.y, 'melee'); } } return true; }
    if (e.leapT <= 0 && los && dist < 7 && dist > 2.5) { e.leapT = rnd(6, 8); e.leap = { a: Math.atan2(P.y - e.y, P.x - e.x), t: Math.min(0.8, dist / 6) }; play('toad', 0.7, 0.9, { x: e.x, y: e.y }); return true; }
    if (e.tongueT <= 0 && los && dist > 2 && dist < 6.5) { e.tongueT = rnd(5, 7); e.state = 'attack'; e.t = 0; e.didHit = true; const a = Math.atan2(P.y - e.y, P.x - e.x);
      projectiles.push({ x: e.x + Math.cos(a) * 0.5, y: e.y + Math.sin(a) * 0.5, z: 0.35, vx: Math.cos(a) * 10, vy: Math.sin(a) * 10, dmg: 4, src: e, kind: 'bandage', hook: true, tongue: true, life: 0.8 }); play('tongue_lash', 0.7, 1, { x: e.x, y: e.y }); return true; }
    return false;
  },
};
function rootsTick(dt) {
  for (const r of roots) { r.t -= dt;
    if (r.t > 0) { if (!settings.lowfx && Math.random() < dt * 20) particles.push({ x: r.x + rnd(-0.5, 0.5), y: r.y + rnd(-0.5, 0.5), z: 0.02, vx: 0, vy: 0, vz: 0.4, life: 0.3, maxLife: 0.3, img: fx.parts.root ? fx.parts.root[0] : fx.hit[1], size: 0.05, tint: [120, 160, 70] }); continue; }
    r.done = true; play('roots_burst', 0.7, 1, { x: r.x, y: r.y }); for (let i = 0; i < 8; i++) particles.push({ x: r.x + rnd(-0.4, 0.4), y: r.y + rnd(-0.4, 0.4), z: 0.05, vx: 0, vy: 0, vz: rnd(1, 2), life: 0.6, maxLife: 0.6, img: fx.parts.root ? fx.parts.root[i % fx.parts.root.length] : fx.hit[1], size: 0.08, tint: [110, 150, 70] });
    if (Math.hypot(P.x - r.x, P.y - r.y) < 1.1 && P.jz < 0.15) { run.cause = 'RÖTTERNA'; hurtPlayer(r.dmg, r.x, r.y, 'proj'); P.rootT = Math.max(P.rootT || 0, 1.4); say('RÖTTERNA HÅLLER DIG FAST', 1); } }
  roots = roots.filter(r => !r.done);
  P.rootT = Math.max(0, (P.rootT || 0) - dt);
}

// ---------- Version 10: eldflugan, stengolemen och ugglan ----------
function petV10(p, dt, lv) { // de nya följeslagarnas förmågor; true = hanterat
  if (p.id === 'firefly') { flashes.push({ x: p.x, y: p.y, t: 0.05, r: 3.5 + lv * 0.4, col: [255, 240, 150] }); // lyser upp mörkret
    if (p.cd <= 0) { p.cd = Math.max(3, 7 - lv * 0.6); const e = ents.find(o => !o.dead && !o.boss && o.alert && !o.hidden && Math.hypot(o.x - p.x, o.y - p.y) < 4 + lv); if (e) { e.stun = Math.max(e.stun || 0, 1.2); spawnText(e.x, e.y, 'BLÄNDAD', '#fff0a0'); play('pet_firefly', 0.5, 1.2, { x: p.x, y: p.y }); petXp(0.6); } } }
  if (p.id === 'minigolem' && p.cd <= 0) { p.cd = Math.max(4, 9 - lv * 0.7); let n = 0; for (const e of ents) if (!e.dead && !e.boss && e.alert && Math.hypot(e.x - p.x, e.y - p.y) < 4 + lv * 0.5) { e.confT = 1.8; n++; } // drar till sig fienderna
    if (n) { play('pet_golem', 0.6, 1, { x: p.x, y: p.y }); spawnPuff(p.x, p.y, 6); petXp(0.6); } }
  if (p.id === 'owl') { if (p.cd <= 0) { p.cd = 0.6; for (const e of ents) if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < 7 + lv) { e.revealT = Math.max(e.revealT || 0, 1); if (e.ghost > 0.3 && (e.d.ai === 'stalker' || e.d.ai === 'stealth' || hasMod(e, 'stalker'))) e.ghost = 0.3; } }
    p.featherT = (p.featherT ?? 20) - dt; if (p.featherT <= 0) { p.featherT = Math.max(12, 25 - lv * 2); P.owlJumpT = tmr + 10; play('pet_owl', 0.6); say('UGGLAN FÄLLER EN FJÄDER – DUBBELHOPP', 1.5); } }
  return false;
}
Object.assign(PROJ_DRAW_V8, { chain: o => drawSprite(fx.parts.chain ? fx.parts.chain[0] : fx.hit[1], o.x, o.y, 0.08, o.z - 0.04, Math.floor(tmr * 12) % 2 === 0, null, 0, 0.6, false, [170, 170, 180]) });
const wShort = wp => legendOf(wp.id) ? LEGENDS[legendOf(wp.id)].short : wp.short;
// ---------- Version 10: Banbyggaren – rita, provspela och dela egna banor ----------
const ED_W = 32, ED_H = 24;
const ED_PALETTE = [
  ['MARK', [['1', 'VÄGG', '#7a6a58'], ['.', 'GOLV', '#2a221a'], ['D', 'DÖRR', '#a07040'], ['P', 'START', '#40d060'], ['x', 'UTGÅNG', '#40a0ff']]],
  ['FIENDER', [['S', 'SKELETT', '#e0e0d0'], ['K', 'EXPLODERANDE', '#ff9040'], ['V', 'VAMPYR', '#d04060'], ['W', 'ORKKRIGARE', '#80a040'], ['Ã', 'MUMIE', '#e0d0a0'], ['Ë', 'GOLEM', '#a080ff'], ['Ō', 'FÅNGVAKTARE', '#c0a080'], ['ő', 'PADDJÄTTE', '#80c060'], ['E', 'ELIT', '#ffd24a']]],
  ['SAKER', [['h', 'HÄLSA', '#ff6060'], ['a', 'AMMO', '#d0c060'], ['A', 'RUSTNING', '#80a0ff'], ['$', 'GULD', '#ffd24a'], ['C', 'KISTA', '#c08040'], ['}', 'NYCKEL', '#ffe080'], ['c', 'LJUS', '#ffb040'], ['e', 'KRUTFAT', '#d04030']]],
  ['FAROR', [['_', 'LAVA', '#ff5020'], ['-', 'VATTEN', '#3060c0'], ['z', 'SPIKAR', '#a0a0a0'], ['Đ', 'DJUPT VATTEN', '#203080']]],
];
let ed = null; // { grid, sel, biome }
function edEmpty() { const g = []; for (let y = 0; y < ED_H; y++) { const r = []; for (let x = 0; x < ED_W; x++) r.push(x === 0 || y === 0 || x === ED_W - 1 || y === ED_H - 1 ? '1' : '.'); g.push(r); } g[ED_H - 3][3] = 'P'; g[2][ED_W - 4] = 'x'; return g; }
function edEncode(e) { // kompakt kod: biom + rader där upprepningar skrivs som \x01antal\x02tecken
  const rows = e.grid.map(r => r.join('').replace(/(.)\1{2,}/g, (m, c) => '\x01' + m.length + '\x02' + c));
  return btoa(unescape(encodeURIComponent(e.biome + '|' + rows.join('\n')))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function edDecode(code) {
  try { const s = decodeURIComponent(escape(atob(code.replace(/-/g, '+').replace(/_/g, '/')))), i = s.indexOf('|'), biome = s.slice(0, i);
    const grid = s.slice(i + 1).split('\n').map(row => row.replace(/\x01(\d+)\x02(.)/g, (m, n, c) => c.repeat(+n)).split(''));
    if (grid.length !== ED_H || grid.some(r => r.length !== ED_W)) return null; return { grid, biome: BIOME_IDS.includes(biome) ? biome : 'dungeon' };
  } catch (e) { return null; }
}
function edCheck(g) { // en spelbar bana: en start, en utgång, och utgången går att nå
  const find = ch => { const out = []; g.forEach((r, y) => r.forEach((c, x) => { if (c === ch) out.push([x, y]); })); return out; };
  const ps = find('P'), xs = find('x'); if (ps.length !== 1) return 'BANAN BEHÖVER EXAKT EN START'; if (xs.length !== 1) return 'BANAN BEHÖVER EXAKT EN UTGÅNG';
  const seen = new Set([ps[0].join()]), q = [ps[0]]; while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || !g[ny] || g[ny][nx] === undefined || g[ny][nx] === '1') continue; seen.add(k); q.push([nx, ny]); } }
  return seen.has(xs[0].join()) ? '' : 'UTGÅNGEN GÅR INTE ATT NÅ FRÅN STARTEN';
}
function openEditor(code) {
  const saved = code ? edDecode(code) : store.get('editor', null);
  ed = { grid: saved && saved.grid ? saved.grid : edEmpty(), biome: saved && saved.biome || 'dungeon', sel: '1' };
  let box = document.getElementById('editor'); if (box) box.remove();
  box = document.createElement('div'); box.id = 'editor'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Banbyggaren');
  box.style.cssText = 'position:fixed;inset:0;z-index:60;background:#0b0806f2;display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px;overflow:auto;font-family:"PressStart2P",monospace;color:#e8d9b0;font-size:10px';
  const title = document.createElement('div'); title.textContent = 'BANBYGGAREN – RITA MED MUSEN ELLER FINGRET'; title.style.cssText = 'color:#ffd24a;font-size:12px'; box.appendChild(title);
  const cv = document.createElement('canvas'); cv.width = ED_W * 16; cv.height = ED_H * 16; cv.style.cssText = 'width:min(96vw,768px,calc((100vh - 270px) * 1.333));flex:none;image-rendering:pixelated;border:2px solid #c9a87a;touch-action:none;cursor:crosshair'; box.appendChild(cv);
  const pal = document.createElement('div'); pal.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;justify-content:center;max-width:900px'; box.appendChild(pal);
  const colOf = {}; for (const [, items] of ED_PALETTE) for (const [ch, , col] of items) colOf[ch] = col;
  const btns = [];
  for (const [grp, items] of ED_PALETTE) { const l = document.createElement('span'); l.textContent = grp + ':'; l.style.cssText = 'align-self:center;color:#8a7550;margin-left:6px'; pal.appendChild(l);
    for (const [ch, name, col] of items) { const b = document.createElement('button'); b.type = 'button'; b.textContent = name; b.style.cssText = `font:inherit;font-size:9px;padding:6px 8px;background:#1a130d;color:${col};border:2px solid #4a3a28;cursor:pointer`; b.onclick = () => { ed.sel = ch; btns.forEach(x => x.style.borderColor = '#4a3a28'); b.style.borderColor = '#ffd24a'; }; if (ch === ed.sel) b.style.borderColor = '#ffd24a'; btns.push(b); pal.appendChild(b); } }
  const bar = document.createElement('div'); bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center'; box.appendChild(bar);
  const sel = document.createElement('select'); sel.setAttribute('aria-label', 'Biom'); sel.style.cssText = 'font:inherit;font-size:9px;padding:6px;background:#1a130d;color:#e8d9b0;border:2px solid #4a3a28';
  for (const b of BIOME_IDS) { const o = document.createElement('option'); o.value = b; o.textContent = BIOME_NAME[b] || b; if (b === ed.biome) o.selected = true; sel.appendChild(o); }
  sel.onchange = () => { ed.biome = sel.value; save(); }; bar.appendChild(sel);
  const msg = document.createElement('div'); msg.style.cssText = 'color:#ff9070;min-height:12px'; box.appendChild(msg);
  const save = () => { try { store.set('editor', { grid: ed.grid, biome: ed.biome }); } catch (e) { /* fullt */ } };
  const btn = (t, f, hi) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.style.cssText = `font:inherit;font-size:10px;padding:8px 12px;background:${hi ? '#6a2a18' : '#1a130d'};color:#ffe9a8;border:2px solid #c9a87a;cursor:pointer`; b.onclick = f; bar.appendChild(b); return b; };
  btn('PROVSPELA', () => { const err = edCheck(ed.grid); if (err) { msg.textContent = err; play('click', 0.6, 0.7); return; } save(); box.remove(); playCustom(ed); }, true);
  btn('DELA LÄNK', () => { const err = edCheck(ed.grid); if (err) { msg.textContent = err; return; } const url = location.origin + location.pathname + '?bana=' + edEncode(ed); try { navigator.clipboard.writeText(url); msg.style.color = '#9fe060'; msg.textContent = 'LÄNKEN ÄR KOPIERAD'; } catch (e) { msg.textContent = url; } });
  btn('RENSA', () => { ed.grid = edEmpty(); draw(); save(); });
  btn('STÄNG', () => { save(); box.remove(); ed = null; refreshTitle(); });
  const draw = () => { const g = cv.getContext('2d');
    for (let y = 0; y < ED_H; y++) for (let x = 0; x < ED_W; x++) { const c = ed.grid[y][x]; g.fillStyle = c === '.' ? '#2a221a' : colOf[c] || '#555'; g.fillRect(x * 16, y * 16, 16, 16); if (c !== '.' && c !== '1') { g.fillStyle = '#000a'; g.font = '10px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c, x * 16 + 8, y * 16 + 9); } g.strokeStyle = '#00000040'; g.strokeRect(x * 16 + 0.5, y * 16 + 0.5, 15, 15); } };
  let painting = false;
  const paint = ev => { const r = cv.getBoundingClientRect(), x = Math.floor((ev.clientX - r.left) / r.width * ED_W), y = Math.floor((ev.clientY - r.top) / r.height * ED_H);
    if (x <= 0 || y <= 0 || x >= ED_W - 1 || y >= ED_H - 1) return; // kanten är alltid vägg
    if (ed.sel === 'P' || ed.sel === 'x') ed.grid.forEach(row => row.forEach((c, i) => { if (c === ed.sel) row[i] = '.'; }));
    ed.grid[y][x] = ed.sel; draw(); msg.textContent = ''; };
  cv.addEventListener('pointerdown', ev => { painting = true; cv.setPointerCapture(ev.pointerId); paint(ev); });
  cv.addEventListener('pointermove', ev => { if (painting) paint(ev); });
  cv.addEventListener('pointerup', () => { painting = false; save(); });
  document.body.appendChild(box); draw();
}
function playCustom(e) { // provspela den egna banan med en riktig banas utseende för biomen
  document.getElementById('title').hidden = true; canvas.focus(); ensureAudio(); practice = { custom: true };
  newRun(RNG.randomSeed(), false); practice = null; run.custom = true; run.cmode = ''; P.hp = maxHp();
  for (let i = 1; i <= 4; i++) { P.has[i] = true; P.mags[i] = effMag(i); } P.ammo = Object.assign(NOAMMO(), { p9: 150, r556: 90, shells: 30, bolts: 20 });
  const L0 = Gen.floor(RNG.hash('bana:' + e.biome), 1, { biome: e.biome }), outdoor = L0.sky && L0.sky.some(r => r.includes('1'));
  const L = { ...L0, map: e.grid.map(r => r.join('')), name: 'EGEN BANA', floorMask: null, roomMask: null, rooms: [], sky: outdoor ? e.grid.map(r => r.map(() => '1').join('')) : null, boulders: [], beams: [], saws: [], winds: [], tide: null, arenas: [], belts: [], teleports: [], custom: true, ambient: Math.max(L0.ambient || 0, 0.55) }; // utan facklor behövs mer grundljus
  run.depth = 1; startLevel(L); lockPointer(); say('EGEN BANA – NÅ UTGÅNGEN', 3);
}
function customDone() { say('BANAN ÄR KLARAD!', 3); play('win', 0.8); stat('customWins'); setTimeout(() => { state = 'title'; showTitle(); openEditor(); }, 1500); }
