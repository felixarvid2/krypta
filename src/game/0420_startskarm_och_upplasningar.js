// ---------- Startskärm och upplåsningar ----------
function setupSliders() {
  const sens = document.getElementById('sens'), fov = document.getElementById('fov'); if (!sens || !fov) return; // reglagen finns i inställningarna
  const show = () => { document.getElementById('sensv').textContent = settings.sens.toFixed(1); document.getElementById('fovv').textContent = settings.fov + '°'; };
  sens.value = settings.sens; fov.value = settings.fov; show();
  sens.oninput = () => { settings.sens = +sens.value; saveSettings(); show(); };
  fov.oninput = () => { settings.fov = +fov.value; saveSettings(); show(); };
}
const ASC_TEXT = ['INGA EXTRA FÖRBANNELSER', '1: FIENDERNA HAR 10 % MER HP', '2: + BUTIKEN ÄR 20 % DYRARE', '3: + MINDRE HÄLSA FALLER', '4: + ELITERNA SLÅR 20 % HÅRDARE', '5: + BOSSARNA HAR 25 % MER HP'];
function refreshTitle() {
  const diffBox = document.getElementById('diff');
  if (!diffBox.children.length) [4, 0, 1, 2, 3].map(i => [DIFF[i], i]).forEach(([d, i]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.d = i; b.textContent = d.name; b.onclick = () => { settings.diff = i; saveSettings(); refreshTitle(); }; diffBox.appendChild(b); });
  diffBox.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.d === settings.diff)));
  const clsBox = document.getElementById('classes'); clsBox.textContent = '';
  for (const [id, c] of Object.entries(CLASSES)) { const b = document.createElement('button'); b.type = 'button'; const open = classOpen(id);
    b.textContent = open ? c.name : `${c.name} (${c.cost} SJÄLAR)`; b.title = c.text; b.setAttribute('aria-pressed', String((settings.cls || 'vandrare') === id)); if (!open) b.classList.add('locked');
    b.onclick = () => { if (!classOpen(id)) { if (profile.souls < c.cost) { document.getElementById('status').textContent = `${c.name} KOSTAR ${c.cost} SJÄLAR`; return; } profile.souls -= c.cost; profile.classes = (profile.classes || []).concat(id); saveProfile(); checkAch(); }
      settings.cls = id; saveSettings(); refreshTitle(); document.getElementById('status').textContent = c.text; };
    clsBox.appendChild(b); }
  const petBox = document.getElementById('pets'); if (petBox) { petBox.textContent = ''; petBox.hidden = !PET_IDS.some(petOpen);
    for (const id of ['', ...PET_IDS]) { if (id && !petOpen(id)) continue; const b = document.createElement('button'); b.type = 'button'; b.textContent = id ? PETS[id].name : 'INGEN FÖLJESLAGARE'; b.title = id ? PETS[id].text : '';
      b.setAttribute('aria-pressed', String((settings.pet || '') === id)); b.onclick = () => { settings.pet = id; saveSettings(); refreshTitle(); document.getElementById('status').textContent = id ? `${PETS[id].name}: ${PETS[id].text}` : 'DU GÅR ENSAM'; }; petBox.appendChild(b); } }
  const cmBox = document.getElementById('cmodes'); if (cmBox) { cmBox.textContent = ''; cmBox.hidden = (profile.runs || 0) < 1;
    for (const [id, c] of Object.entries(CMODES)) { const b = document.createElement('button'); b.type = 'button'; b.textContent = c.name; b.title = c.text; const on = (settings.cmode || '').split('+').filter(Boolean); b.setAttribute('aria-pressed', String(id ? on.includes(id) : !on.length));
      b.onclick = () => { const cur = (settings.cmode || '').split('+').filter(x => x && CMODES[x]); settings.cmode = !id ? '' : (cur.includes(id) ? cur.filter(x => x !== id) : cur.concat(id)).join('+'); saveSettings(); refreshTitle(); document.getElementById('status').textContent = settings.cmode ? cmodeNames(settings.cmode) + (settings.cmode.includes('+') ? ' – KOMBINERAT: SJÄLARNA MULTIPLICERAS' : ' – ' + c.text) : c.text; }; cmBox.appendChild(b); } }
  { const cb = document.getElementById('chroniclebtn'); if (cb) cb.textContent = `KRÖNIKAN ${pagesFound().length}/${CHRONICLE.length}`; }
  const di = document.getElementById('dailyinfo'); if (di) { di.textContent = dailyInfo(); di.appendChild(document.createElement('br')); di.appendChild(document.createTextNode('DAGENS UPPDRAG: ' + dqText())); }
  const ascBox = document.getElementById('asc'); ascBox.hidden = settings.diff !== 3; ascBox.textContent = '';
  if (settings.diff === 3) { const max = profile.ascMax || 0; for (let i = 0; i <= Math.min(5, max); i++) { const b = document.createElement('button'); b.type = 'button'; b.textContent = i ? `UPPSTIGNING ${i}` : 'GRUND'; b.title = ASC_TEXT[i]; b.setAttribute('aria-pressed', String((settings.asc || 0) === i)); b.onclick = () => { settings.asc = i; saveSettings(); refreshTitle(); document.getElementById('status').textContent = ASC_TEXT[i]; }; ascBox.appendChild(b); } if (!max) ascBox.appendChild(Object.assign(document.createElement('span'), { className: 'label', textContent: 'VINN PÅ MARDRÖM FÖR UPPSTIGNING 1' })); }
  const saved = store.get(runKey(), null), cont = document.getElementById('continue');
  cont.hidden = !saved; if (saved) { cont.textContent = 'FORTSÄTT'; cont.appendChild(Object.assign(document.createElement('span'), { className: 'label', textContent: 'VÅNING ' + saved.run.depth })); }
  const slotBox = document.getElementById('slots'); if (slotBox) { slotBox.textContent = ''; slotBox.hidden = (profile.runs || 0) < 1; // tre sparplatser
    for (let i = 0; i < 3; i++) { const sv = store.get('run' + (i ? '.' + i : ''), null), b = document.createElement('button'); b.type = 'button'; b.textContent = `PLATS ${i + 1}: ${sv ? 'VÅNING ' + sv.run.depth + (sv.run.cls && CLASSES[sv.run.cls] ? ' · ' + CLASSES[sv.run.cls].name : '') : 'TOM'}`;
      b.setAttribute('aria-pressed', String((settings.slot || 0) === i)); b.onclick = () => { settings.slot = i; saveSettings(); refreshTitle(); document.getElementById('status').textContent = `SPARPLATS ${i + 1} VALD`; }; slotBox.appendChild(b); } }
  { const lab = (id, box) => { const l = document.getElementById(id), b = document.getElementById(box); if (l && b) l.hidden = b.hidden; }; lab('petlabel', 'pets'); lab('cmlabel', 'cmodes'); lab('slotlabel', 'slots');
    const sum = document.getElementById('setupsum'), c = CLASSES[settings.cls || 'vandrare'] || CLASSES.vandrare; // sammanfattning av rundans val bredvid ANPASSA-knappen
    if (sum) sum.textContent = [DIFF[settings.diff].name + (settings.diff === 3 && settings.asc ? ' ' + settings.asc : ''), c.name, settings.pet && PETS[settings.pet] ? PETS[settings.pet].name : '', settings.cmode ? cmodeNames(settings.cmode) : ''].filter(Boolean).join(' · '); }
  const tl = document.getElementById('ptitle'); if (tl) { const t = TITLES.find(x => x[0] === profile.title && titleOpen(x[0])); tl.textContent = t && t[0] ? '« ' + t[1] + ' »' : ''; tl.hidden = !(t && t[0]); }
  const locked = window.Cards ? Cards.ALL.filter(c => c.unlock && !profile.unlocked.includes(c.id)).length : 0;
  { const so = document.getElementById('souls'); so.textContent = String(profile.souls); so.title = 'SJÄLAR'; } { const ub = document.getElementById('unlocks'); if (ub) ub.textContent = locked ? `LÅS UPP KORT (${locked})` : 'LÅS UPP KORT'; }
  const lr = (profile.history || [])[0];
  document.getElementById('best').textContent = profile.runs ? `RUNDOR ${profile.runs} · SEGRAR ${profile.wins} · BÄSTA VÅNING ${profile.bestDepth} · REKORD ${profile.bestScore}` + (lr ? ` · SENAST: VÅNING ${lr.depth}${lr.win ? ', SEGER' : lr.cause ? ', ' + lr.cause : ''}` : '') : '';
  setupRows();
}
// ANPASSA som genrens inställningsskärmar: en rad per inställning med ◀ VÄRDE ▶ och en rad beskrivning för det markerade.
// De gamla knapparna (#diff, #classes, #pets, #cmodes, #slots, #asc) byggs fortfarande av refreshTitle och ligger dolda i DOM (köp av klass går via dem).
const DIFF_TEXT = ['FIENDERNA SLÅR LÖSARE · MER AMMO · SJÄLAR ×0,7', 'SOM SPELET ÄR TÄNKT', 'HÅRDARE OCH SNABBARE FIENDER · MINDRE AMMO · SJÄLAR ×1,5', 'FÖR DE MODIGA – GER UPPSTIGNINGAR · SJÄLAR ×2,2', 'FÖR HISTORIEN – NÄSTAN INGEN FARA · SJÄLAR ×0,4'];
const setupUI = { k: 'cls', cls: '', combo: false, msg: '' };
function setupDefs() {
  const cls = settings.cls || 'vandrare'; if (!setupUI.cls || !CLASSES[setupUI.cls] || classOpen(setupUI.cls)) setupUI.cls = cls; // bläddrar man till en låst klass visas den, men vald klass ändras inte
  const cm = (settings.cmode || '').split('+').filter(x => x && CMODES[x]), runs = profile.runs || 0, amax = Math.min(5, profile.ascMax || 0);
  return [
    { k: 'diff', label: 'SVÅRIGHET', cur: settings.diff, opts: [4, 0, 1, 2, 3].map(i => ({ id: i, name: DIFF[i].name, text: DIFF_TEXT[i] })) },
    { k: 'asc', label: 'UPPSTIGNING', hide: settings.diff !== 3, cur: settings.asc || 0, opts: Array.from({ length: amax + 1 }, (_, i) => ({ id: i, name: i ? 'NIVÅ ' + i : 'GRUND', text: ASC_TEXT[i] + (amax ? '' : ' · VINN PÅ MARDRÖM FÖR NIVÅ 1') })) },
    { k: 'cls', label: 'KLASS', cur: setupUI.cls, opts: Object.entries(CLASSES).map(([id, c]) => { const open = classOpen(id); return { id, name: c.name, locked: !open, small: open ? '' : c.cost + ' SJÄLAR', text: open ? c.text : (profile.souls >= c.cost ? `LÅST · TRYCK FÖR ATT KÖPA (${c.cost} AV ${profile.souls} SJÄLAR)` : `LÅST · KOSTAR ${c.cost} SJÄLAR (DU HAR ${profile.souls})`) + ' – ' + c.text }; }) },
    { k: 'pet', label: 'FÖLJESLAGARE', hide: !PET_IDS.some(petOpen), cur: settings.pet || '', opts: ['', ...PET_IDS.filter(petOpen)].map(id => ({ id, name: id ? PETS[id].name : 'INGEN', text: id ? PETS[id].text : 'DU GÅR ENSAM' })) },
    { k: 'slot', label: 'SPARPLATS', hide: runs < 1, cur: settings.slot || 0, opts: [0, 1, 2].map(i => { const sv = store.get('run' + (i ? '.' + i : ''), null); return { id: i, name: 'PLATS ' + (i + 1), small: sv ? 'VÅNING ' + sv.run.depth : 'TOM', text: sv ? `SPARAD RUNDA: VÅNING ${sv.run.depth}` + (sv.run.cls && CLASSES[sv.run.cls] ? ' · ' + CLASSES[sv.run.cls].name : '') : 'TOM PLATS – NYA RUNDAN SPARAS HÄR' }; }) },
    { k: 'cmode', label: 'UTMANING', hide: runs < 1, cur: cm.length > 1 ? null : (cm[0] || ''), opts: Object.entries(CMODES).map(([id, c]) => ({ id, name: id ? c.name : 'INGEN', text: c.text })) }, // sist: kombinationspanelen (#cmodes) visas direkt under
  ];
}
function setupStep(k, d) { // ◀ ▶ (pilarna, styrkorset, tryck på pilarna)
  const r = setupDefs().find(x => x.k === k); if (!r || r.hide || !r.opts.length) return;
  const n = r.opts.length; let i = r.opts.findIndex(o => o.id === r.cur); i = i < 0 ? (d > 0 ? 0 : n - 1) : (i + d + n) % n; const o = r.opts[i];
  setupUI.k = k; setupUI.msg = '';
  if (k === 'diff') settings.diff = o.id; else if (k === 'asc') settings.asc = o.id; else if (k === 'pet') settings.pet = o.id; else if (k === 'cmode') settings.cmode = o.id; else if (k === 'slot') settings.slot = o.id;
  else if (k === 'cls') { setupUI.cls = o.id; if (!o.locked) settings.cls = o.id; }
  saveSettings(); play('ui_hover', 0.3); refreshTitle();
}
function setupAct(k) { // Enter / tryck mitt på raden
  setupUI.k = k; setupUI.msg = '';
  if (k === 'cmode') { setupUI.combo = !setupUI.combo; play('ui_hover', 0.3); setupRows(); return; } // visa/dölj kombinationerna (de gamla knapparna i #cmodes)
  if (k === 'cls') { const id = setupUI.cls, c = CLASSES[id];
    if (c && !classOpen(id)) { if (profile.souls < c.cost) { setupUI.msg = `${c.name} KOSTAR ${c.cost} SJÄLAR – DU HAR ${profile.souls}`; setupRows(); return; }
      const b = document.querySelectorAll('#classes button')[Object.keys(CLASSES).indexOf(id)]; if (b) b.click(); return; } // köp med den befintliga logiken
    const ids = Object.keys(CLASSES).filter(classOpen), j = ids.indexOf(settings.cls || 'vandrare'); settings.cls = setupUI.cls = ids[(j + 1) % ids.length] || 'vandrare'; saveSettings(); play('ui_hover', 0.3); refreshTitle(); return; } // mitten hoppar bara mellan öppna klasser – köper aldrig av misstag
  setupStep(k, 1);
}
function setupStart() { // START längst ned i ANPASSA
  if (CLASSES[setupUI.cls] && !classOpen(setupUI.cls)) { setupUI.msg = 'KLASSEN ÄR LÅST – KÖP DEN ELLER VÄLJ EN ANNAN'; setupUI.k = 'cls'; setupUI.cls = settings.cls || 'vandrare'; setupRows(); return; }
  const s = document.getElementById('start'); if (s && !s.disabled) s.click();
}
function setupRows() {
  const box = document.getElementById('srows'); if (!box) return;
  const defs = setupDefs();
  for (const r of defs) {
    let row = box.querySelector(`[data-k="${r.k}"]`);
    if (!row) { row = document.createElement('button'); row.type = 'button'; row.className = 'srow'; row.dataset.k = r.k; row.innerHTML = '<span class="sk"></span><span class="sa l"></span><span class="sv"></span><span class="sa r"></span>';
      row.addEventListener('click', e => { const a = e.target && e.target.closest ? e.target.closest('.sa') : null; if (a) setupStep(r.k, a.classList.contains('l') ? -1 : 1); else setupAct(r.k); });
      row.addEventListener('focus', () => { if (setupUI.k !== r.k) { setupUI.k = r.k; setupUI.msg = ''; setupDesc(); } });
      box.appendChild(row); }
    row.hidden = !!r.hide; const o = r.opts.find(x => x.id === r.cur);
    row.querySelector('.sk').textContent = r.label;
    const sv = row.querySelector('.sv'); sv.textContent = o ? o.name : r.k === 'cmode' ? cmodeNames(settings.cmode) : '';
    if (o && o.small) sv.appendChild(Object.assign(document.createElement('small'), { textContent: o.small }));
    row.classList.toggle('locked', !!(o && o.locked)); row.setAttribute('aria-label', r.label + ': ' + sv.textContent);
  }
  const setup = document.getElementById('setup'), cmr = defs.find(x => x.k === 'cmode'); if (setup) setup.classList.toggle('combo', setupUI.combo && !cmr.hide);
  setupDesc(defs);
}
function setupDesc(defs) {
  const d = document.getElementById('setupdesc'); if (!d) return; defs = defs || setupDefs();
  if (setupUI.msg) { d.textContent = setupUI.msg; return; }
  const r = defs.find(x => x.k === setupUI.k && !x.hide) || defs.find(x => x.k === 'cls'), o = r.opts.find(x => x.id === r.cur);
  d.textContent = o ? o.text : r.k === 'cmode' ? 'KOMBINERADE UTMANINGAR – SJÄLARNA MULTIPLICERAS' : '';
  if (r.k === 'cmode') d.textContent += ' · TRYCK FÖR ATT KOMBINERA';
}
function openUnlocks() {
  const items = Cards.ALL.filter(c => c.unlock).sort((a, b) => a.unlock - b.unlock).map(card => ({ kind: 'card', card, price: card.unlock, owned: profile.unlocked.includes(card.id) }));
  CardUI.shop(items, profile.souls, item => {
    if (item.owned || profile.souls < item.price) return { ok: false, gold: profile.souls };
    profile.souls -= item.price; profile.unlocked.push(item.card.id); item.owned = true; saveProfile(); play('buy', 0.8);
    return { ok: true, gold: profile.souls };
  }, () => refreshTitle(), { title: 'LÅS UPP KORT', currency: 'SJÄLAR', currencyColor: '#c0a0ff' });
}
// ---------- Version 6: eldbossen (sjunde bossen) ----------
Object.assign(BOSS_AI, {
  // Eldkungen: eldklot i salvor, ett slag som får lava att spruta upp i en ring, lavapölar i fas 2, raseri i fas 3
  flame(b, dt, dist, ang, ph) {
    const fast = ph === 3 ? 1.4 : 1;
    if (ph >= 2) { b.poolT = (b.poolT ?? 3) - dt; if (b.poolT <= 0) { b.poolT = rnd(3, 5) / fast; for (let i = 0; i < 2 + ph; i++) { const a = rnd(0, TAU), r = rnd(1.5, 4); const x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r; if (!solid(x, y)) groundFires.push({ x, y, t: 5, acc: 0 }); } } }
    if (b.state === 'volley') {
      const k = Math.floor(b.t / 0.22);
      if (k >= 1 && k <= 2 + ph && k !== b.lastShot) { b.lastShot = k; for (const s of [-0.18, 0, 0.18]) shootFireball(b, ang + s + rnd(-0.05, 0.05), 7, bossShotDmg(b, 9), k === 2 + ph); play('fireburst', 0.6, 0.8, { x: b.x, y: b.y }); }
      if (b.t > 1.5) { b.state = 'idle'; b.t = 0; b.cd = rnd(1.1, 1.8) / fast; }
      return;
    }
    if (b.state === 'slam') {
      if (!b.didHit && b.t > 0.75) { b.didHit = true; P.shake = Math.max(P.shake, 2.2); play('eruption', 1, 0.9); if (dist < b.d.range) hurtPlayer(b.d.dmg, b.x, b.y, 'melee');
        const n = 10 + ph * 2; for (let i = 0; i < n; i++) { const a = i / n * TAU, r = 2.4 + (i % 2) * 1.4; addHazard(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, 'lavaburst', { warn: 0.55, life: 0.9, r: 0.7, dmg: 12 }); } }
      if (b.t > 1.3) { b.state = 'idle'; b.t = 0; b.cd = rnd(1, 1.6) / fast; }
      return;
    }
    b.cd -= dt;
    if (b.cd <= 0 && hasLOS(b.x, b.y, P.x, P.y)) { b.t = 0; b.didHit = false; b.lastShot = -1; b.state = dist < b.d.range + 1.2 ? 'slam' : 'volley'; if (b.state === 'slam') { play('flame_boss_roar', 0.8, 1.1); bossWarn(b, b.d.name + ' HÖJER NÄVEN!'); } return; }
    if (dist > 3) bossMove(b, ang, b.d.speed * fast * dt * (b.slow > 0 ? 0.5 : 1));
  },
});
Object.assign(BOSS_SPECIAL, {
  flame(b, dt, dist, ang, ph) {
    if (b.spK) { // utbrott: lavabomber faller runt dig
      if (b.t < 0.05) { bossWarn(b, 'UTBROTT – SPRING!'); play('eruption', 1, 0.8); for (let i = 0; i < 5 + ph * 2; i++) { const a = rnd(0, TAU), r = i ? rnd(0.8, 4.5) : 0; fallHazard(P.x + Math.cos(a) * r, P.y + Math.sin(a) * r, 'meteor', 13, 1 + i * 0.1); } }
      if (b.t > 2) { b.state = 'idle'; b.t = 0; b.cd = 1; }
      return;
    }
    if (b.t < 0.05) { say(b.d.name + ' KALLAR PÅ ELDEN', 1.5); play('fire_elemental', 0.8, 0.8); for (let i = 0; i < 1 + ph; i++) { const spot = freeSpotFar(3, 6); if (spot) { const e = makeEnemy('Æ', spot[0], spot[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(spot[0], spot[1], 6); } } }
    if (b.t > 0.8) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
});
TAUNTS.flame = ['BRINN!', 'ASKA TILL ASKA', 'MIN ELD SLOCKNAR ALDRIG'];
// ---------- Version 7: Faraonen (åttonde bossen) ----------
let tornados = [];
Object.assign(BOSS_AI, {
  // Faraonen: en gyllene stråle som sveper, sandtornador och mumier ur golvet
  pharaoh(b, dt, dist, ang, ph) {
    const fast = ph === 3 ? 1.35 : 1;
    if (ph >= 2) { b.mumT = (b.mumT ?? 8) - dt; if (b.mumT <= 0) { b.mumT = rnd(9, 12) / fast; say('MUMIERNA RESER SIG UR SANDEN', 1.5); for (let i = 0; i < ph; i++) { const s = freeSpotFar(3, 7); if (s) { const e = makeEnemy(ENEMY_DEFS['Ã'] ? 'Ã' : 'S', s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; spawnPuff(s[0], s[1], 8); } } } }
    if (b.state === 'beam') { // strålen sveper över arenan
      const a = b.beamA0 + (b.t / 1.8) * b.beamDir * 1.8, dx = Math.cos(a), dy = Math.sin(a);
      for (let k = 1; k < 14; k++) if (!settings.lowfx && Math.random() < 0.5) { const x = b.x + dx * k * 0.9, y = b.y + dy * k * 0.9; if (solid(x, y)) break; particles.push({ x, y, z: 0.5, vx: 0, vy: 0, vz: 0, life: 0.08, maxLife: 0.08, img: fx.hit[1], size: 0.12, add: true, tint: [255, 220, 90] }); }
      flashes.push({ x: b.x + dx * 3, y: b.y + dy * 3, t: 0.05, r: 4, col: [255, 210, 90] });
      let rel = Math.atan2(P.y - b.y, P.x - b.x) - a; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      if (Math.abs(rel) < 0.08 && (b.beamHitT || 0) < tmr && hasLOS(b.x, b.y, P.x, P.y)) { b.beamHitT = tmr + 0.25; hurtPlayer(bossShotDmg(b, 7), b.x, b.y, 'proj'); }
      if (b.t > 1.8) { b.state = 'idle'; b.t = 0; b.cd = rnd(1.2, 1.8) / fast; }
      return;
    }
    if (b.state === 'storm') { if (b.t < 0.05) { tornados.push({ x: b.x + Math.cos(ang) * 1.5, y: b.y + Math.sin(ang) * 1.5, t: 6 + ph, hitT: 0 }); play('tornado', 0.8, 1, { x: b.x, y: b.y }); } if (b.t > 0.9) { b.state = 'idle'; b.t = 0; b.cd = rnd(1, 1.5) / fast; } return; }
    b.cd -= dt;
    if (b.cd <= 0 && hasLOS(b.x, b.y, P.x, P.y)) { b.t = 0; b.didHit = false;
      if (tornados.length < ph && Math.random() < 0.4) b.state = 'storm';
      else { b.state = 'beam'; b.beamDir = Math.random() < 0.5 ? 1 : -1; b.beamA0 = ang - b.beamDir * 0.9; play('golden_beam', 0.8); bossWarn(b, b.d.name + ' HÖJER SPIRAN – STRÅLEN SVEPER!'); }
      return; }
    if (dist > 4) bossMove(b, ang, b.d.speed * fast * dt * (b.slow > 0 ? 0.5 : 1));
  },
});
Object.assign(BOSS_SPECIAL, {
  pharaoh(b, dt, dist, ang, ph) {
    if (b.spK) { // förbannelsen: kontrollerna vänds en stund och sanden stiger
      if (b.t < 0.05) { bossWarn(b, 'FARAONENS FÖRBANNELSE!'); play('curse_reverse', 0.9); P.reverseT = 2.5 + ph * 0.5; for (let i = 0; i < 6 + ph * 2; i++) { const a = rnd(0, TAU), r = rnd(1, 4.5); addHazard(P.x + Math.cos(a) * r, P.y + Math.sin(a) * r, 'sandpit', { warn: 0.6, life: 4, r: 0.9, dmg: 2 }); } }
      if (b.t > 1.2) { b.state = 'idle'; b.t = 0; b.cd = 1; }
      return;
    }
    if (b.t < 0.05) { say('SKARABÉERNA SVÄRMAR!', 1.5); play('scarab_swarm', 0.8); for (let i = 0; i < 4 + ph * 2; i++) { const s = freeSpotFar(2.5, 6); if (s) { const e = makeEnemy(ENEMY_DEFS['Õ'] ? 'Õ' : 'X', s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; } } }
    if (b.t > 0.8) { b.state = 'idle'; b.t = 0; b.cd = 0.6; }
  },
});
TAUNTS.pharaoh = ['KNÄFALL FÖR FARAONEN', 'SANDEN BEGRAVER DIG', 'MIN GRAV ÄR DIN'];
function updateTornados(dt) {
  for (const t of tornados) {
    t.t -= dt; const d = Math.hypot(P.x - t.x, P.y - t.y) || 1; tryMove(t, (P.x - t.x) / d * dt * 2.3, (P.y - t.y) / d * dt * 2.3, 0.3);
    if (!settings.lowfx) for (let i = 0; i < 3; i++) { const a = rnd(0, TAU), r = rnd(0.1, 0.6), z = rnd(0, 1.2); particles.push({ x: t.x + Math.cos(a) * r * (0.5 + z), y: t.y + Math.sin(a) * r * (0.5 + z), z, vx: -Math.sin(a) * 2, vy: Math.cos(a) * 2, vz: 0.5, life: 0.3, maxLife: 0.3, img: fx.parts.sand ? fx.parts.sand[0] : fx.hit[1], size: 0.05, tint: [210, 180, 120], fade: true }); }
    if (d < 1 && (t.hitT || 0) < tmr) { t.hitT = tmr + 0.6; hurtPlayer(7, t.x, t.y, 'proj'); P.slowT = Math.max(P.slowT, 0.8); }
    if (d < 2.5) tryMove(P, (t.x - P.x) / d * dt * 1.2, (t.y - P.y) / d * dt * 1.2, 0.24); // tornadon suger
  }
  tornados = tornados.filter(t => t.t > 0);
}
// ---------- Version 8: erfarenhet, nivåer och talanger ----------
const TALENTS = {
  // KRIGAREN
  brawler: { name: 'SLAGSKÄMPEN', branch: 'krigare', max: 3, text: r => `+${15 * r} % NÄRSTRIDSSKADA`, mods: r => ({ meleeDmg: 0.15 * r }) },
  ironskin: { name: 'JÄRNHUD', branch: 'krigare', max: 3, text: r => `+${15 * r} MAX HP`, mods: r => ({ maxHp: 15 * r }) },
  berserk: { name: 'BÄRSÄRKEN', branch: 'krigare', max: 2, req: 'brawler', text: r => `+${25 * r} % SKADA UNDER 35 % HÄLSA`, mods: r => ({ lowHpDmg: 0.25 * r }) },
  cleave: { name: 'KLYVAREN', branch: 'krigare', max: 1, req: 'brawler', text: () => 'NÄRSTRID TRÄFFAR ÄVEN FIENDER RUNT OMKRING (50 %)' },
  secondwind: { name: 'ANDRA ANDNINGEN', branch: 'krigare', max: 1, req: 'ironskin', text: () => 'UNDER 25 % HÄLSA: LÄK 35 HP, EN GÅNG PER VÅNING' },
  juggernaut: { name: 'KOLOSSEN', branch: 'krigare', max: 2, req: 'ironskin', text: r => `−${10 * r} % SKADA TAGEN`, mods: r => ({ damageTaken: -0.1 * r }) },
  warcry: { name: 'STRIDSROPET', branch: 'krigare', max: 2, text: r => `+${2 * r} RUSTNING PER DÖDANDE`, mods: r => ({ killArmor: 2 * r }) },
  executioner: { name: 'BÖDELN', branch: 'krigare', max: 1, req: 'berserk', text: () => 'AVRÄTTAR VANLIGA FIENDER UNDER 15 % HÄLSA', mods: () => ({ execute: 0.15 }) },
  bulwark: { name: 'BRÖSTVÄRNET', branch: 'krigare', max: 2, text: r => `+${20 * r} RUSTNING VARJE VÅNING`, mods: r => ({ armorPerFloor: 20 * r }) },
  titan: { name: 'TITANEN', branch: 'krigare', max: 1, req: 'juggernaut', text: () => '+10 % SKADA OCH +25 MAX HP', mods: () => ({ dmg: 0.1, maxHp: 25 }) },
  // SKUGGAN
  quickstep: { name: 'LÄTTFOTAD', branch: 'skugga', max: 3, text: r => `+${6 * r} % FART`, mods: r => ({ moveSpeed: 0.06 * r }) },
  doubletap: { name: 'DUBBELTRYCKET', branch: 'skugga', max: 3, text: r => `+${8 * r} % ELDHASTIGHET`, mods: r => ({ fireRate: 0.08 * r }) },
  backstab: { name: 'RYGGHUGGET', branch: 'skugga', max: 2, text: r => `+${30 * r} % SKADA MOT OVETANDE`, mods: r => ({ stealthDmg: 0.3 * r }) },
  vanish: { name: 'FÖRSVINNANDET', branch: 'skugga', max: 1, req: 'quickstep', text: () => 'RUSNING GÖR DIG OSYNLIG I 1,5 SEKUNDER' },
  evasion: { name: 'UNDANMANÖVERN', branch: 'skugga', max: 3, text: r => `${4 * r} % CHANS ATT UNDVIKA`, mods: r => ({ dodge: 0.04 * r }) },
  poisonedge: { name: 'GIFTEGGEN', branch: 'skugga', max: 2, text: r => `${8 * r} % CHANS ATT FÖRGIFTA`, mods: r => ({ poisonChance: 0.08 * r }) },
  shadowstep: { name: 'SKUGGSTEGET', branch: 'skugga', max: 1, req: 'vanish', text: () => '−30 % VÄNTETID PÅ RUSNING', mods: () => ({ dashCd: 0.3 }) },
  assassin: { name: 'LÖNNMÖRDAREN', branch: 'skugga', max: 1, req: 'backstab', text: () => '+100 % SKADA MOT OVETANDE, SNABBARE SMYGDÖD', mods: () => ({ stealthDmg: 1 }) },
  nimble: { name: 'SNABBA FINGRAR', branch: 'skugga', max: 3, text: r => `+${12 * r} % SNABBARE OMLADDNING`, mods: r => ({ reloadSpeed: 0.12 * r }) },
  phantom: { name: 'FANTOMEN', branch: 'skugga', max: 1, req: 'assassin', text: () => 'FIENDER UPPTÄCKER DIG 30 % LÅNGSAMMARE OCH HÖR DIG SÄMRE', mods: () => ({ detectSlow: 0.3, noiseReduce: 0.3 }) },
  // MYSTIKERN
  arcana: { name: 'ARKANA', branch: 'mystiker', max: 3, text: r => `−${12 * r} % VÄNTETID PÅ FÖRMÅGOR`, mods: r => ({ activeCd: 0.12 * r }) },
  manaflow: { name: 'MANAFLÖDET', branch: 'mystiker', max: 2, text: r => `+${30 * r} % MANA OCH +${10 * r} % ERFARENHET`, mods: r => ({ manaRegen: 0.3 * r, xpMul: 0.1 * r }) },
  leech: { name: 'BLODIGELN', branch: 'mystiker', max: 3, text: r => `${2 * r} % LIVSSTÖLD`, mods: r => ({ lifesteal: 0.02 * r }) },
  hex: { name: 'HÄXERIET', branch: 'mystiker', max: 2, text: r => `${10 * r} % CHANS ATT SAKTA NED FIENDER`, mods: r => ({ slowChance: 0.1 * r }) },
  frostnova: { name: 'FROSTNOVAN', branch: 'mystiker', max: 1, req: 'hex', text: () => 'NÄR DU SKADAS FRYSER FIENDER RUNT DIG (VAR 10:E SEKUND)' },
  chainmind: { name: 'KEDJESINNET', branch: 'mystiker', max: 1, req: 'manaflow', text: () => '12 % CHANS ATT BLIXTEN HOPPAR TILL NÄSTA FIENDE', mods: () => ({ shockChance: 0.12 }) },
  soulfire: { name: 'SJÄLAELDEN', branch: 'mystiker', max: 1, text: () => '12 % CHANS ATT DÖDA FIENDER EXPLODERAR', mods: () => ({ killExplode: 0.12 }) },
  prophet: { name: 'PROFETEN', branch: 'mystiker', max: 1, req: 'arcana', text: () => '+1 VAL VID KORTDRAGNING', mods: () => ({ cardChoices: 1 }) },
  timewarp: { name: 'TIDSVRIDAREN', branch: 'mystiker', max: 1, req: 'prophet', text: () => 'UNDER 30 % HÄLSA SAKTAR TIDEN IN, EN GÅNG PER VÅNING' },
  ascendant: { name: 'DEN UPPSTIGNE', branch: 'mystiker', max: 1, req: 'soulfire', text: () => '+15 % SKADA OCH +1 TALANGVAL', mods: () => ({ dmg: 0.15, talentChoice: 1 }) },
};
const TALENT_IDS = Object.keys(TALENTS);
const talent = id => (run && run.talents && run.talents[id]) || 0;
const xpNeed = l => 45 + l * 35;
function talentMods(M) { if (!run || !run.talents) return; for (const [id, r] of Object.entries(run.talents)) { const t = TALENTS[id]; if (t && t.mods && r) for (const [k, v] of Object.entries(t.mods(r))) M[k] = (M[k] || 0) + v; } }
function gainXp(n, x, y) {
  if (!run || run.practice) return;
  run.xp = (run.xp || 0) + n * (1 + mod('xpMul')) * (floorEvent === 'wisdom' ? 1.5 : floorEvent === 'resonance' ? 1.25 : 1); run.lvl = run.lvl || 1; xpFlash = 0.4;
  while (run.xp >= xpNeed(run.lvl)) { run.xp -= xpNeed(run.lvl); run.lvl++; run.talentQ = (run.talentQ || 0) + 1; levelUpFx(); }
}
let xpFlash = 0, lvlBanner = 0;
function levelUpFx() {
  play('levelup', 0.8); if (window.Music) Music.sting('levelup'); lvlBanner = 2.2; stat('levelUps'); firstHint('level', isTouch() ? 'VARJE NIVÅ GER EN TALANG – TRYCK PÅ DEN DU VILL HA.' : 'VARJE NIVÅ GER EN TALANG. 1–3 VÄLJER, T VISAR TRÄDET.');
  if (mod('levelHeal')) heal(mod('levelHeal'), true);
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; particles.push({ x: P.x + Math.cos(a) * 0.5, y: P.y + Math.sin(a) * 0.5, z: 0.1, vx: Math.cos(a) * 0.6, vy: Math.sin(a) * 0.6, vz: 1.3, life: 0.9, maxLife: 0.9, img: fx.hit[1], size: 0.08, add: true, tint: [190, 140, 255] }); }
  logEvent('NIVÅ ' + run.lvl);
}
function talentOptions(n) { // tre talanger, helst ur olika grenar
  const ok = TALENT_IDS.filter(id => talent(id) < TALENTS[id].max && (!TALENTS[id].req || talent(TALENTS[id].req) > 0));
  const pick = [], pool = ok.slice();
  while (pick.length < n && pool.length) {
    const branches = new Set(pick.map(id => TALENTS[id].branch)), fresh = pool.filter(id => !branches.has(TALENTS[id].branch));
    const from = fresh.length ? fresh : pool, id = from[(Math.random() * from.length) | 0];
    pick.push(id); pool.splice(pool.indexOf(id), 1);
  }
  return pick;
}
function firstHint(id, text) { // tips första gången något nytt händer
  profile.hints = profile.hints || []; if (profile.hints.includes(id) || (run && run.practice)) return; profile.hints.push(id); saveProfile(); setTimeout(() => say('TIPS: ' + text, 4.5), 400);
}
function talentPick(onDone) { // nivå upp: välj en talang
  const n = 3 + Math.round(mod('talentChoice'));
  let ids = talentOptions(n); if (!ids.length) { run.talentQ = 0; onDone && onDone(); return; }
  const opt = id => { const t = TALENTS[id], r = talent(id); return { id, name: t.name, text: t.text(r + 1), branch: t.branch, icon: A + 'gfx/talents/' + id + '.png', rank: r + 1, maxRank: t.max, req: t.req || null }; };
  const done = id => { run.talents = Object.assign({}, run.talents, { [id]: talent(id) + 1 }); run.talentQ = Math.max(0, (run.talentQ || 1) - 1); const hp0 = maxHp(); recomputeMods(); if (maxHp() > hp0) P.hp += maxHp() - hp0;
    play('talent_pick', 0.8); say(`TALANG: ${TALENTS[id].name}${talent(id) > 1 ? ' ' + talent(id) : ''}`, 2.5); logEvent('TALANG: ' + TALENTS[id].name); stat('talents'); closeUI(); onDone && onDone(); };
  const tree = TALENT_IDS.map(id => ({ id, name: TALENTS[id].name, branch: TALENTS[id].branch, req: TALENTS[id].req || null, maxRank: TALENTS[id].max, text: TALENTS[id].text(1), icon: A + 'gfx/talents/' + id + '.png' }));
  const owned = Object.entries(run.talents || {}).map(([id, rank]) => ({ id, rank }));
  let rerolls = run.talentRerolls ?? 1;
  openUI(() => {
    if (CardUI.talents) CardUI.talents({ title: `NIVÅ ${run.lvl}`, subtitle: 'VÄLJ EN TALANG', level: run.lvl, options: ids.map(opt), owned, tree, rerolls, onReroll: () => { if (rerolls <= 0) return null; rerolls--; run.talentRerolls = rerolls; ids = talentOptions(n); return ids.map(opt); } }, t => done(typeof t === 'string' ? t : t.id));
    else CardUI.choice({ title: `NIVÅ ${run.lvl}`, subtitle: 'VÄLJ EN TALANG', options: ids.map(id => ({ label: TALENTS[id].name + ` (${talent(id)}/${TALENTS[id].max})`, text: TALENTS[id].branch.toUpperCase() + ': ' + TALENTS[id].text(talent(id) + 1) })) }, i => done(ids[i]));
  });
}
function talentTick() { if (run && run.talentQ > 0 && state === 'play' && !(boss && !boss.dead) && !CardUI.isOpen() && (run.talentWait = (run.talentWait || 0) + 1) > 30) { run.talentWait = 0; talentPick(); } }
function drawXpHud(g) { // erfarenhetsstapeln längst ned i bilden
  if (!run || run.practice) return; xpFlash = Math.max(0, xpFlash - 1 / 60); lvlBanner = Math.max(0, lvlBanner - 1 / 60);
  const k = clamp((run.xp || 0) / xpNeed(run.lvl || 1), 0, 1), xv = (run.lvl || 1) * 1e6 + (run.xp || 0);
  if (xv !== drawXpHud.v) { if (drawXpHud.v !== undefined) drawXpHud.t = tmr; drawXpHud.v = xv; } // stapeln syns bara en stund när erfarenheten ändras
  const show = clamp(2.5 - (tmr - (drawXpHud.t ?? -9)), 0, 1) || (lvlBanner > 0 ? 1 : 0), bw = 120, bx = (W - bw) / 2;
  if (show > 0) { g.globalAlpha = show; g.fillStyle = '#0008'; g.fillRect(bx, VH - 2, bw, 2); g.fillStyle = xpFlash > 0 ? '#e0c0ff' : '#9a60e0'; g.fillRect(bx, VH - 2, Math.round(bw * k), 2); g.globalAlpha = 1; }
  if (lvlBanner > 0) { const t = `NIVÅ ${run.lvl}!` + (run.talentQ ? ' – VÄLJ TALANG' : ''); txt(t, (W - textW(t)) / 2, HL ? HL.row2 : 16, lvlBanner % 0.4 < 0.2 ? '#e0c0ff' : '#b080ff', 1, true); }
}
function talentHooksHurt() { // talanger som reagerar när du tar skada
  if (!run) return;
  if (talent('secondwind') && P.hp > 0 && P.hp < maxHp() * 0.25 && run.swFloor !== run.depth) { run.swFloor = run.depth; heal(35, true); say('ANDRA ANDNINGEN!', 1.5); play('health', 0.7, 0.8); }
  if (talent('timewarp') && P.hp > 0 && P.hp < maxHp() * 0.3 && run.twFloor !== run.depth) { run.twFloor = run.depth; slowmo = Math.max(slowmo, 2.5); say('TIDEN SAKTAR IN', 1.5); play('freeze', 0.6, 0.6); }
  if (talent('frostnova') && (P.novaT || 0) < tmr) { P.novaT = tmr + 10; let n = 0; for (const e of ents) if (!e.dead && !e.dormant && Math.hypot(e.x - P.x, e.y - P.y) < 3.5) { freeze(e, 2.5); n++; }
    if (n) { play('freeze', 0.8, 0.8); for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; particles.push({ x: P.x, y: P.y, z: 0.3, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, vz: 0, life: 0.5, maxLife: 0.5, img: fx.parts.ice ? fx.parts.ice[0] : fx.hit[1], size: 0.08, add: true, tint: [160, 220, 255] }); } } }
}
function cleaveHit(e0, dmg) { // klyvaren: närstrid träffar fiender runt omkring
  if (!talent('cleave')) return;
  for (const o of ents) if (o !== e0 && !o.dead && !o.dying && !o.hidden && !o.dormant && Math.hypot(o.x - P.x, o.y - P.y) < 2) hurtEnemy(o, dmg * 0.5, o.x, o.y, { melee: true, cleave: true, noProc: true });
}

// ---------- Version 8: harpunen, bumerangen och prisman ----------
function harpoonFire(wp, base) {
  const a = P.a + rnd(-1, 1) * wp.spread * (1 - WS.aim);
  projectiles.push({ x: P.x + Math.cos(a) * 0.35, y: P.y + Math.sin(a) * 0.35, z: 0.48, vx: Math.cos(a) * 24, vy: Math.sin(a) * 24, dmg: base, friendly: true, kind: 'harpoon', life: 0.75, hitSet: new Set(), chain: up('hp_chain') ? 1 : 0 });
  noise(4 * (1 - mod('noiseReduce')));
}
function updateHarpoon(p, dt) {
  ropeTo = { x: p.x, y: p.y };
  for (const e of ents) {
    if (e.dead || e.dying || e.hidden || p.hitSet.has(e) || Math.hypot(e.x - p.x, e.y - p.y) > 0.32 * e.d.size * (e.boss ? 1.8 : 1)) continue;
    p.hitSet.add(e); const k = hurtEnemy(e, p.dmg, p.x, p.y, {}); hitMark = 0.14; hitKill = hitKill || k; lvlStat.hits++; run.hits = (run.hits || 0) + 1;
    play('harpoon_hit', 0.7, rnd(0.9, 1.05), { x: p.x, y: p.y }); runeProc(e, p.dmg);
    if (up('hp_barb')) e.poison = Math.max(e.poison || 0, 5);
    if (!k && !e.boss && e.d.size < 1.6) { e.pulled = up('hp_pull') ? 1.2 : 0.45; e.stun = Math.max(e.stun || 0, 0.5); play('harpoon_reel', 0.6, 1, { x: e.x, y: e.y }); }
    if (p.chain > 0) { p.chain--; const o = ents.filter(q => !q.dead && !q.hidden && !p.hitSet.has(q) && Math.hypot(q.x - p.x, q.y - p.y) < 6).sort((u, v) => Math.hypot(u.x - p.x, u.y - p.y) - Math.hypot(v.x - p.x, v.y - p.y))[0];
      if (o) { const a = Math.atan2(o.y - p.y, o.x - p.x); p.vx = Math.cos(a) * 24; p.vy = Math.sin(a) * 24; p.life = 0.5; return; } }
    p.dead = true; ropeT = 0.35; ropeTo = { x: e.x, y: e.y, e }; return;
  }
  if (solid(p.x, p.y) || p.life <= 0) {
    p.dead = true; const ox = p.x - p.vx * dt, oy = p.y - p.vy * dt, d = Math.hypot(ox - P.x, oy - P.y);
    if (p.life > 0 && d > 2) { P.grapple = { x: ox - Math.cos(Math.atan2(p.vy, p.vx)) * 0.5, y: oy - Math.sin(Math.atan2(p.vy, p.vx)) * 0.5, t: 0.9 }; play('harpoon_reel', 0.7); ropeT = 0.9; ropeTo = { x: ox, y: oy }; } // fäster i väggen: du dras dit
    else { play('knife_wall', 0.5, 0.7, { x: ox, y: oy }); sparks(ox, oy, 0.5, 3); }
  }
}
let ropeT = 0, ropeTo = null;
function harpoonTick(dt) { // indragning av fiender och spelaren
  ropeT = Math.max(0, ropeT - dt); if (ropeT <= 0 && !projectiles.some(p => p.kind === 'harpoon')) ropeTo = null;
  if (ropeTo && ropeTo.e && !ropeTo.e.dead) { ropeTo.x = ropeTo.e.x; ropeTo.y = ropeTo.e.y; }
  for (const e of ents) if (e.pulled > 0 && !e.dead) { e.pulled -= dt; const d = Math.hypot(P.x - e.x, P.y - e.y); if (d > 1.2) tryMove(e, (P.x - e.x) / d * dt * 9, (P.y - e.y) / d * dt * 9, 0.28); else e.pulled = 0; }
  if (P.grapple) { const g = P.grapple, d = Math.hypot(g.x - P.x, g.y - P.y); g.t -= dt;
    if (d < 0.4 || g.t <= 0) P.grapple = null; else { const ox = P.x, oy = P.y; tryMove(P, (g.x - P.x) / d * dt * 13, (g.y - P.y) / d * dt * 13, 0.24); if (Math.hypot(P.x - ox, P.y - oy) < dt * 2) P.grapple = null; } }
}
function ropePoints(list) { // repet ritas som en rad små punkter
  if (!ropeTo || settings.lowfx) return; const x0 = P.x + Math.cos(P.a + 0.3) * 0.3, y0 = P.y + Math.sin(P.a + 0.3) * 0.3, d = Math.hypot(ropeTo.x - x0, ropeTo.y - y0), n = Math.min(40, Math.floor(d / 0.3));
  for (let i = 1; i < n; i++) list.push({ x: x0 + (ropeTo.x - x0) * i / n, y: y0 + (ropeTo.y - y0) * i / n, k: 'rp', o: { z: 0.42 + (i / n) * 0.06 } });
}
const boomIdx = () => WEAPONS.findIndex(w => w.boomerang);
function boomerangThrow(wp) {
  const bi = boomIdx(); if (P.mags[bi] <= 0 || WS.cd > 0 || WS.state !== 'idle') return;
  const base = wp.dmg * masteryMul() * (1 + mod('dmg')) * (1 + 0.12 * wlvl(wp.id)) * (1 + 0.25 * (WS.boomCharge || 0)); WS.boomCharge = 0;
  const n = up('bm_twin') ? 2 : 1;
  for (let i = 0; i < n; i++) { const a = P.a + (n > 1 ? (i - 0.5) * 0.3 : 0); projectiles.push({ x: P.x + Math.cos(a) * 0.4, y: P.y + Math.sin(a) * 0.4, z: 0.5, vx: Math.cos(a) * 13, vy: Math.sin(a) * 13, dmg: base, friendly: true, kind: 'boom', life: 6, t: 0, back: false, hitSet: new Set(), spin: i ? -1 : 1 }); }
  P.mags[bi] = 0; WS.boomOut = n; WS.shot = 0; WS.cd = effDelay(wp); lvlStat.shots++; run.shots = (run.shots || 0) + 1;
  play('boomerang_throw', 0.7, rnd(0.95, 1.05)); noise(2);
  WS.boomSnd = play('boomerang_whirr', 0.35, 1, { loop: true });
}
function updateBoomerang(p, dt) {
  p.t += dt;
  if (!p.back && p.t > 0.55) { p.back = true; p.hitSet.clear(); }
  if (!p.back && up('bm_curve')) { const o = ents.filter(q => !q.dead && !q.hidden && !q.dormant && !p.hitSet.has(q) && Math.hypot(q.x - p.x, q.y - p.y) < 4)[0];
    if (o) { const sp = Math.hypot(p.vx, p.vy), cur = Math.atan2(p.vy, p.vx); let d = Math.atan2(o.y - p.y, o.x - p.x) - cur; d = Math.atan2(Math.sin(d), Math.cos(d)); const na = cur + clamp(d, -4 * dt, 4 * dt); p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp; } }
  if (p.back) { const d = Math.hypot(P.x - p.x, P.y - p.y) || 1, sp = 15; p.vx += ((P.x - p.x) / d * sp - p.vx) * Math.min(1, dt * 6); p.vy += ((P.y - p.y) / d * sp - p.vy) * Math.min(1, dt * 6);
    if (d < 0.7 || p.t > 5) { p.dead = true; boomCaught(); return; } }
  if (!p.back && solid(p.x, p.y)) { p.x -= p.vx * dt; p.y -= p.vy * dt; p.back = true; p.hitSet.clear(); play('knife_wall', 0.4, 1.3, { x: p.x, y: p.y }); sparks(p.x, p.y, 0.5, 2); }
  if (p.back && solid(p.x, p.y)) { p.x -= p.vx * dt * 0.5; p.y -= p.vy * dt * 0.5; if (p.t > 2) { p.x = P.x; p.y = P.y; } } // fastnar inte bakom hörn
  for (const e of ents) {
    if (e.dead || e.dying || e.hidden || e.dormant || p.hitSet.has(e) || Math.hypot(e.x - p.x, e.y - p.y) > 0.36 * e.d.size * (e.boss ? 1.8 : 1)) continue;
    p.hitSet.add(e); const k = hurtEnemy(e, p.dmg * (up('bm_blade') ? 1.3 : 1), p.x, p.y, {}); hitMark = 0.12; hitKill = hitKill || k; lvlStat.hits++; run.hits = (run.hits || 0) + 1;
    play('knife_hit', 0.5, rnd(0.8, 0.95), { x: p.x, y: p.y }); runeProc(e, p.dmg);
    if (!up('bm_blade') && !p.back) { p.back = true; p.hitSet.clear(); p.hitSet.add(e); }
  }
}
function boomCaught() {
  WS.boomOut = Math.max(0, (WS.boomOut || 1) - 1);
  if (!WS.boomOut) { const bi = boomIdx(); if (bi >= 0) P.mags[bi] = 1; try { WS.boomSnd && WS.boomSnd.s.stop(); } catch (e) { /* stoppad */ } WS.boomSnd = null; }
  play('boomerang_catch', 0.6, rnd(0.95, 1.05)); if (up('bm_return')) { WS.boomCharge = Math.min(3, (WS.boomCharge || 0) + 1); if (WS.boomCharge === 3) spawnText(P.x + Math.cos(P.a), P.y + Math.sin(P.a), 'LADDAD', '#ffd24a'); }
}
function prismFire(wp, base) {
  if (fireHeld && up('pr_focus')) WS.prFocus = Math.min(1, (WS.prFocus || 0) + 0.12); else WS.prFocus = 0;
  const dmg = base * (1 + (WS.prFocus || 0)), n = up('pr_split') ? 3 : 1, bounces = (up('pr_bounce') ? 4 : 2) + Math.round(mod('refract'));
  for (let i = 0; i < n; i++) prismBeam(P.x, P.y, P.a + (n > 1 ? (i - 1) * 0.1 : 0) + rnd(-1, 1) * wp.spread * (1 - WS.aim), dmg * (n > 1 ? 0.6 : 1), bounces, 0, new Set(), 22);
  noise(3 * (1 - mod('noiseReduce')));
}
const PRISM_COLS = [[255, 120, 200], [140, 220, 255], [200, 160, 255], [255, 230, 140]];
function prismBeam(x, y, a, dmg, bounces, depth, hitSet, range, enemy) { // stråle som studsar mot väggar och delas av brytande kristaller
  let dx = Math.cos(a), dy = Math.sin(a), left = range, lastSpark = 0, cx = x + dx * (depth ? 0.02 : 0.3), cy = y + dy * (depth ? 0.02 : 0.3);
  const col = PRISM_COLS[depth % PRISM_COLS.length], step = 0.08;
  while (left > 0) {
    const nx = cx + dx * step, ny = cy + dy * step; left -= step;
    const ch = map[ny | 0] && map[ny | 0][nx | 0];
    if (ch === 'Ė' && depth < 2 + Math.round(mod('refract')) + (floorEvent === 'resonance' ? 1 : 0)) { // brytande kristall: tre nya strålar
      if (!enemy) firstHint('prism', 'BRYTANDE KRISTALLER DELAR SKOTT I TRE STRÅLAR.');
      play('prism_bounce', 0.5, 1.2, { x: nx, y: ny }); refractFx(nx, ny);
      let ex = nx, ey = ny; for (let k = 0; k < 40 && map[ey | 0] && map[ey | 0][ex | 0] === 'Ė'; k++) { ex += dx * 0.06; ey += dy * 0.06; } // ut på andra sidan kristallen
      if (!solid(ex, ey)) { const a0 = Math.atan2(dy, dx); for (const off of [-0.5, 0, 0.5]) prismBeam(ex, ey, a0 + off + rnd(-0.05, 0.05), dmg * 0.75, bounces, depth + 1, hitSet, left, enemy); }
      return;
    }
    if (solid(nx, ny)) {
      if (bounces <= 0) { sparks(cx, cy, 0.5, 2); break; }
      bounces--; if (solid(nx, cy)) dx = -dx; if (solid(cx, ny)) dy = -dy; if (!solid(nx, cy) && !solid(cx, ny)) { dx = -dx; dy = -dy; }
      if (!enemy) play('prism_bounce', 0.3, rnd(1, 1.3), { x: cx, y: cy }); continue;
    }
    cx = nx; cy = ny;
    if (enemy) { if (Math.hypot(P.x - cx, P.y - cy) < 0.3 && !hitSet.has(P)) { hitSet.add(P); hurtPlayer(dmg, x, y, 'proj'); } }
    else for (const e of ents) {
      if (e.dead || e.dying || e.hidden || e.dormant || hitSet.has(e) || Math.hypot(e.x - cx, e.y - cy) > 0.3 * e.d.size * (e.boss ? 1.8 : 1)) continue;
      hitSet.add(e); const k = hurtEnemy(e, dmg * (e.d.crystal ? 0.6 : 1), cx, cy, {}); hitMark = 0.1; hitKill = hitKill || k; lvlStat.hits++; run.hits = (run.hits || 0) + 1;
      if (up('pr_burn')) { e.burn = Math.max(e.burn || 0, 2.5); e.burnAcc = Math.max(e.burnAcc || 0, 0.3); }
    }
    if (!settings.lowfx && range - left - lastSpark > 0.32) { lastSpark = range - left; particles.push({ x: cx, y: cy, z: 0.5, vx: 0, vy: 0, vz: 0, life: 0.09, maxLife: 0.09, img: fx.parts.prismbeam ? fx.parts.prismbeam[0] : fx.hit[1], size: 0.07, add: true, tint: col }); }
  }
  flashes.push({ x: cx, y: cy, t: 0.06, r: 2.5, col });
}
function refractFx(x, y) { for (let i = 0; i < 6; i++) particles.push({ x: x + 0.5 - (x % 1), y: y + 0.5 - (y % 1), z: rnd(0.3, 0.8), vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(0, 1), life: 0.4, maxLife: 0.4, img: fx.parts.shard ? fx.parts.shard[i % fx.parts.shard.length] : fx.hit[1], size: 0.05, add: true, tint: PRISM_COLS[i % 4] }); flashes.push({ x, y, t: 0.12, r: 3, col: [200, 180, 255] }); }
const PROJ_UPD_V8 = { harpoon: updateHarpoon, boom: updateBoomerang };
const PROJ_DRAW_V8 = {
  harpoon: o => drawSprite(spr.pick_harpoon || fx.parts.knife && fx.parts.knife[0] || fx.hit[1], o.x, o.y, 0.06, o.z - 0.03, Math.cos(Math.atan2(o.vy, o.vx) - view.a) < 0, null, 0, 0.6),
  boom: o => drawSprite(spr.pick_boomerang || spr.pick_axe || fx.hit[0], o.x, o.y, 0.22, o.z - 0.08, Math.floor(tmr * 14) % 2 === 0, null, 0, 0.6),
  shard: o => drawSprite(fx.parts.shard ? fx.parts.shard[Math.floor(tmr * 10) % fx.parts.shard.length] : fx.hit[1], o.x, o.y, 0.1, o.z - 0.05, false, 1.5, 0, 0, true, [190, 170, 255]),
  hex: o => drawSprite(fx.parts.ink ? fx.parts.ink[Math.floor(tmr * 8) % fx.parts.ink.length] : fx.fireball[0], o.x, o.y, 0.18, o.z - 0.06, false, 1.4, 0, 0, true, [170, 70, 230]),
  wave: o => drawSprite(fx.parts.splash_big ? fx.parts.splash_big[Math.floor(tmr * 8) % fx.parts.splash_big.length] : fx.hit[1], o.x, o.y, 0.45, 0, false, null, 0, 0.5, false, [140, 200, 255]),
};

