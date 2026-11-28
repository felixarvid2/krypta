// ---------- Version 6: flytta mobilknapparna ----------
let layoutOn = false;
function layoutEdit(onDone) {
  const ui = document.getElementById('touch'); if (!ui) { onDone(); return; }
  layoutOn = true; ui.hidden = false; ui.classList.add('layout', 'playing');
  const bar = document.createElement('div'); bar.className = 'layoutbar';
  bar.innerHTML = '<span>DRA KNAPPARNA DIT DU VILL HA DEM</span><button type="button" data-l="reset">ÅTERSTÄLL</button><button type="button" data-l="done">KLAR</button>';
  document.body.appendChild(bar);
  let drag = null;
  const down = e => { if (!layoutOn) return; const b = e.target.closest('.tb'); e.stopImmediatePropagation(); e.preventDefault(); if (!b) return; const r = b.getBoundingClientRect(); drag = { b, dx: e.clientX - r.left, dy: e.clientY - r.top }; b.setPointerCapture && b.setPointerCapture(e.pointerId); };
  const move = e => { if (!layoutOn || !drag) return; e.stopImmediatePropagation(); e.preventDefault(); const st = drag.b.style; st.left = (e.clientX - drag.dx) + 'px'; st.top = (e.clientY - drag.dy) + 'px'; st.right = 'auto'; st.bottom = 'auto'; };
  const up = e => { if (!layoutOn || !drag) return; e.stopImmediatePropagation(); const r = drag.b.getBoundingClientRect(); settings[touchPosKey()] = Object.assign({}, settings[touchPosKey()], { [drag.b.dataset.act]: { x: +(r.left / innerWidth * 100).toFixed(2), y: +(r.top / innerHeight * 100).toFixed(2) } }); saveSettings(); drag = null; };
  ui.addEventListener('pointerdown', down, true); ui.addEventListener('pointermove', move, true); ui.addEventListener('pointerup', up, true);
  bar.onclick = e => { const k = e.target.dataset.l; if (k === 'reset') { settings[touchPosKey()] = {}; saveSettings(); ui.querySelectorAll('.tb').forEach(b => { b.style.left = b.style.top = b.style.right = b.style.bottom = ''; }); }
    if (k === 'done') { layoutOn = false; ui.classList.remove('layout'); bar.remove(); ui.removeEventListener('pointerdown', down, true); ui.removeEventListener('pointermove', move, true); ui.removeEventListener('pointerup', up, true); applyTouchLayout(); onDone(); } };
}
// ---------- Version 6: byt knappar på handkontrollen ----------
const GP_ACTS = [['jump', 'HOPPA', 0], ['crouch', 'DUCKA', 1], ['use', 'ANVÄND', 2], ['swap', 'BYT VAPEN', 3], ['dash', 'RUSA', 4], ['grenade', 'GRANAT', 5], ['reload', 'LADDA OM', 12], ['potion', 'DRYCK', 13], ['ability', 'FÖRMÅGA', 11], ['lamp', 'LAMPA', 14], ['stone', 'KASTA STEN', 15]];
const gpb = act => { const m = settings.padMap || {}; return m[act] ?? GP_ACTS.find(a => a[0] === act)[2]; };
function openPadMap(onClose) {
  CardUI.panel('HANDKONTROLLEN', 'KLICKA PÅ EN HANDLING OCH TRYCK SEDAN PÅ EN KNAPP PÅ HANDKONTROLLEN.', c => {
    for (const [act, name] of GP_ACTS) {
      const r = CardUI.el('label', 'cu-row'); r.appendChild(CardUI.el('span', '', name));
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cu-btn'; b.textContent = gpb(act) < 0 ? 'INGEN KNAPP' : 'KNAPP ' + gpb(act);
      b.onclick = ev => { ev.stopPropagation(); b.textContent = 'TRYCK EN KNAPP…'; const t0 = performance.now();
        const poll = setInterval(() => { let g = null; try { g = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(p => p && p.connected); } catch (e) { g = null; }
          const i = g ? g.buttons.findIndex(x => x.pressed) : -1;
          if (i >= 0 || performance.now() - t0 > 6000) { clearInterval(poll); if (i >= 0) { settings.padMap = Object.assign({}, settings.padMap, { [act]: i }); saveSettings(); } b.textContent = gpb(act) < 0 ? 'INGEN KNAPP' : 'KNAPP ' + gpb(act); } }, 50); };
      r.appendChild(b); c.appendChild(r);
    }
    const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'cu-btn'; reset.textContent = 'ÅTERSTÄLL'; reset.onclick = ev => { ev.stopPropagation(); settings.padMap = {}; saveSettings(); CardUI.close(); openPadMap(onClose); }; c.appendChild(reset);
  }, onClose);
}
function applyTouchLayout() { const ui = document.getElementById('touch'); if (!ui) return;
  ui.classList.toggle('all', !!settings.allButtons); for (const b of ui.querySelectorAll('.tb')) { const pos = (settings[touchPosKey()] || {})[b.dataset.act]; if (pos) { b.style.left = pos.x + '%'; b.style.top = pos.y + '%'; b.style.right = 'auto'; b.style.bottom = 'auto'; } else b.style.left = b.style.top = b.style.right = b.style.bottom = ''; } ui.classList.toggle('lefty', !!settings.lefty); ui.classList.toggle('onehand', !!settings.oneHand); if (!settings.oneHand) autoWalk = false; ui.style.setProperty('--bs', settings.btnScale || 1); document.documentElement.style.setProperty('--bs', settings.btnScale || 1); /* stående: bildens höjd beror på knappstorleken (index.html) */ applyDisplay(); }
function pause() { if (state === 'play') { state = 'pause'; mouseDown = false; aimDown = false; for (const k in keys) keys[k] = false; if (actx) actx.suspend(); } }
function resume() { if (state === 'pause') { state = 'play'; pauseMap = false; if (actx) actx.resume(); lockPointer(); } }
let pauseMap = false;
let deathMap = false;
function shareSeed() { // dela fröet som en länk
  const url = location.origin + location.pathname + '?fro=' + seedText(run.seed);
  try { navigator.clipboard.writeText(url); say('LÄNKEN ÄR KOPIERAD', 1.5); } catch (er) { say(url, 4); }
}
function replaySeed() { if (!run) return; const sd = seedText(run.seed); showTitle(); document.getElementById('seed').value = sd; begin('new'); }
function leaveRunScreen() { if ((state === 'dead' && P.deadT > 1.2) || (state === 'runover' && P.deadT > 1)) showTitle(); }
function showDeck() { const back = state; openUI(() => CardUI.deck(run.owned, () => { closeUI(back === 'pause' ? 'pause' : 'play'); if (back === 'pause') pauseMenu(); }, { stats: cardStats(), onFuse: fuseCard, mods: Object.assign({}, M) })); }
// ---------- Tangentbyte: spelaren kan byta tangent för varje handling ----------
const ACTIONS = [['KeyW', 'FRAMÅT'], ['KeyS', 'BAKÅT'], ['KeyA', 'VÄNSTER'], ['KeyD', 'HÖGER'], ['KeyE', 'ANVÄND'], ['Space', 'HOPPA'], ['ControlLeft', 'DUCKA'], ['ShiftLeft', 'SPRING'], ['KeyZ', 'RUSA'],
  ['KeyF', 'GRANAT'], ['KeyR', 'LADDA OM'], ['KeyV', 'SPARKA'], ['KeyQ', 'FÖRRA VAPNET'], ['KeyM', 'KARTA'], ['KeyC', 'KORTEN'], ['KeyX', 'INSPEKTERA'], ['KeyB', 'MARKÖR'], ['KeyK', 'FOTOLÄGE'], ['KeyH', 'DRICK'], ['KeyJ', 'BYT DRYCK'], ['KeyT', 'FÖRMÅGA'], ['KeyL', 'LAMPA'], ['KeyG', 'KASTA STEN']];
function keyMap(code) { // användarens tangent -> standardtangenten för handlingen
  const b = settings.binds || {};
  for (const [def] of ACTIONS) if (b[def] === code) return def;
  if (b[code] && b[code] !== code) return 'Unbound'; // standardtangenten är flyttad till en annan tangent
  return code;
}
const keyEv = e0 => ({ code: keyMap(e0.code), repeat: e0.repeat, preventDefault: () => e0.preventDefault() });
const keyName = c => c.replace(/^Key/, '').replace(/^Digit/, '').replace('ControlLeft', 'CTRL').replace('ShiftLeft', 'SHIFT').replace('Space', 'SPACE').toUpperCase();
function openKeybinds(onClose) {
  CardUI.panel('TANGENTER', 'KLICKA PÅ EN HANDLING OCH TRYCK PÅ EN NY TANGENT. ESC AVBRYTER.', c => {
    for (const [def, name] of ACTIONS) {
      const r = CardUI.el('label', 'cu-row'); r.appendChild(CardUI.el('span', '', name));
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cu-btn'; b.textContent = keyName((settings.binds || {})[def] || def);
      b.onclick = ev => { ev.stopPropagation(); b.textContent = 'TRYCK EN TANGENT…';
        const cap = k => { k.preventDefault(); k.stopPropagation(); removeEventListener('keydown', cap, true); if (k.code !== 'Escape') { settings.binds = Object.assign({}, settings.binds, { [def]: k.code }); saveSettings(); } b.textContent = keyName((settings.binds || {})[def] || def); };
        addEventListener('keydown', cap, true); };
      r.appendChild(b); c.appendChild(r);
    }
    const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'cu-btn'; reset.textContent = 'ÅTERSTÄLL TANGENTERNA';
    reset.onclick = ev => { ev.stopPropagation(); settings.binds = {}; saveSettings(); CardUI.close(); openKeybinds(onClose); }; c.appendChild(reset);
  }, onClose);
}
addEventListener('keydown', e0 => {
  const e = keyEv(e0);
  if (state === 'title' || (window.CardUI && CardUI.isOpen())) return;
  if (state === 'ui') return;
  if (e.code === 'Escape' || e.code === 'KeyP') { if (state === 'play') pause(); else if (state === 'pause' && e.code === 'KeyP') resume(); else if (state === 'pause') { pauseMap = false; pauseMenu(); } /* Escape i pausen (eller på pauskartan): pausmenyn */ else if ((state === 'dead' || state === 'runover') && e.code === 'Escape') leaveRunScreen(); return; }
  if (state === 'pause' && e.code === 'KeyI') { openSettingsUI(); return; }
  if (state === 'pause' && (e.code === 'Enter' || e.code === 'NumpadEnter')) { pauseMenu(); return; }
  if (state === 'stats' && e.code === 'KeyD' && settings.diff < 3 && run.diff !== 4) { settings.diff = (settings.diff + 1) % 3; run.diff = settings.diff; saveSettings(); say('SVÅRIGHET: ' + DIFF[settings.diff].name, 1.5); return; } // byt svårighet mellan våningarna
  if (state === 'pause' && e.code === 'KeyG') { abandonRun(); return; }
  if (state === 'pause' && e.code === 'KeyL') { openUI(() => showChronicle(() => closeUI('pause'))); return; }
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
  if (e.code === 'BracketLeft' || e.code === 'BracketRight') { settings.sens = clamp(settings.sens + (e.code === 'BracketLeft' ? -0.1 : 0.1), 0.2, 3); saveSettings(); say(`MUSKÄNSLIGHET ${settings.sens.toFixed(1)}`, 1.2); }
  if (e.code === 'Minus' || e.code === 'Equal') { settings.vol = clamp(settings.vol + (e.code === 'Minus' ? -0.1 : 0.1), 0, 1); saveSettings(); applyVolume(); say(`VOLYM ${Math.round(settings.vol * 100)}%`, 1.2); }
  if (e.code === 'Comma' || e.code === 'Period') { settings.fov = clamp(settings.fov + (e.code === 'Comma' ? -4 : 4), 60, 100); saveSettings(); say(`SYNFÄLT ${settings.fov}°`, 1.2); }
  if (e.code === 'KeyN') { settings.muted = !settings.muted; saveSettings(); applyVolume(); say(settings.muted ? 'LJUD AV' : 'LJUD PÅ', 1); }
  if (e.code === 'KeyO') toggleFullscreen();
  if (e.code === 'F9' || e.code === 'PrintScreen') { e.preventDefault(); screenshot(); }
  if (e.code === 'KeyC' && (state === 'play' || state === 'pause')) { showDeck(); return; }
  if (state === 'play') {
    if (e.code === 'KeyE') useKey();
    if (e.code === 'Space' && !e.repeat) jump();
    if (e.code === 'KeyZ' && !e.repeat) dash(0, 0);
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code) && !e.repeat) dirTap(e.code);
    if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat && settings.toggleRun) runToggled = !runToggled;
    if (e.code === 'KeyF' && !e.repeat) grenadeStart();
    if (e.code === 'KeyX' && !e.repeat) inspect();
    if (e.code === 'KeyK' && !e.repeat) { photo = !photo; say(photo ? '' : '', 0); }
    if (e.code === 'KeyB' && !e.repeat) { mapMark = mapMark && Math.hypot(mapMark.x - P.x, mapMark.y - P.y) < 1 ? null : { x: P.x, y: P.y }; play('click', 0.5, 1.4); say(mapMark ? 'MARKÖR SATT PÅ KARTAN' : 'MARKÖREN BORTTAGEN', 1.2); }
    if (e.code === 'KeyR') reloadKey();
    if (e.code === 'KeyV') kick();
    if (e.code === 'KeyH' && !e.repeat) drinkPotion();
    if (e.code === 'KeyT' && !e.repeat) useAbility();
    if (e.code === 'KeyY' && !e.repeat) v26cTaunt(); // version 26C: hån
    if (e.code === 'KeyL' && !e.repeat) toggleLamp();
    if (e.code === 'KeyG' && !e.repeat) throwStone();
    if (e.code === 'KeyJ' && !e.repeat) swapPotion();
    if (e.code === 'KeyM' || e.code === 'Tab') { showMap = (showMap + 1) % 3; settings.map = showMap; saveSettings(); }
    const n = e.code.startsWith('Digit') ? (e.code === 'Digit0' ? 9 : +e.code.slice(5) - 1) : e.code === 'Backquote' || e.code === 'IntlBackslash' ? 10 : -1;
    if (photo && n >= 0 && n < 4) { settings.photoFilter = n; saveSettings(); return; } // fotolägets filter
    if (n >= 0 && n < WEAPONS.length) switchWeapon(n);
    if (e.code === 'KeyQ' && !e.repeat && !wheelStart()) { if (P.has[P.lastWeapon] && P.lastWeapon !== P.weapon) switchWeapon(P.lastWeapon); else cycleWeapon(1); }
  } else if ((state === 'dead' || state === 'runover') && e.code === 'KeyR') { replaySeed(); }
  else if ((state === 'dead' || state === 'runover') && (e.code === 'Enter' || e.code === 'NumpadEnter') && P.deadT > 0.8) { if (document.activeElement && document.activeElement.id === 'romenubtn') leaveRunScreen(); else retryRun(); } // snabbstart: FÖRSÖK IGEN (eller MENY om den är markerad)
  else if ((state === 'dead' || state === 'runover') && (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'ArrowUp' || e.code === 'ArrowDown')) { const bs = [...document.querySelectorAll('#runover .es-btns button')], i = bs.indexOf(document.activeElement); if (bs.length) try { bs[(i + 1) % bs.length].focus(); } catch (er) { /* ingen fokus */ } }
  else if ((state === 'dead' || state === 'runover') && (e.code === 'Escape' || e.code === 'Backspace')) { leaveRunScreen(); }
  else if ((state === 'dead' || state === 'runover') && e.code === 'KeyS') { screenshot(); say('BILDEN ÄR SPARAD', 1.5); }
  else if ((state === 'dead' || state === 'runover') && e.code === 'KeyM') { deathMap = !deathMap; }
  else if ((state === 'dead' || state === 'runover') && e.code === 'KeyL') { shareSeed(); }
  else if ((state === 'dead' || state === 'runover') && e.code === 'KeyC') { try { navigator.clipboard.writeText(seedText(run.seed)); say('FRÖET ÄR KOPIERAT', 1.5); } catch (er) { /* inget urklipp */ } }
  else if (state === 'pause' && e.code === 'KeyM') { pauseMap = !pauseMap; }
  else if (e.code === 'Enter' || e.code === 'Space') {
    if (state === 'stats') nextFloor(); else leaveRunScreen();
  }
});
addEventListener('keyup', e0 => { const e = keyEv(e0); keys[e.code] = false; if (e.code === 'KeyF') grenadeThrow(); if (e.code === 'KeyQ') wheelRelease(); });
// vapenhjulet: håll Q (eller håll byt-knappen på mobilen) och peka med musen/tummen
let wheel = null;
function wheelStart() { if (state !== 'play' || run.pact) return false; wheel = { t0: performance.now(), open: false, vx: 0, vy: 0 }; return true; }
function wheelOwned() { return WEAPONS.map((w, i) => i).filter(i => P.has[i]); }
function wheelPick() { const own = wheelOwned(); if (!wheel || Math.hypot(wheel.vx, wheel.vy) < 14 || !own.length) return -1; const a = (Math.atan2(wheel.vy, wheel.vx) + Math.PI / 2 + TAU * 2) % TAU; return own[Math.floor(a / TAU * own.length + 0.5) % own.length]; }
function wheelRelease(quick) {
  if (!wheel) return; const w = wheel; wheel = null;
  if (w.open) { const i = (w.vx || w.vy) ? wheelPick_(w) : -1; if (i >= 0 && i !== P.weapon) switchWeapon(i); return; }
  if (quick) quick(); else if (P.has[P.lastWeapon] && P.lastWeapon !== P.weapon) switchWeapon(P.lastWeapon); else cycleWeapon(1); // kort tryck: förra vapnet
}
function wheelPick_(w) { const keep = wheel; wheel = w; const i = wheelPick(); wheel = keep; return i; }
function drawWheel(g) {
  const own = wheelOwned(), cx = W / 2, cy = HORIZON, r = 46, sel = wheelPick();
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.arc(cx, cy, r + 14, 0, TAU); g.fill();
  own.forEach((i, k) => { const a = k / own.length * TAU - Math.PI / 2, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, wp = WEAPONS[i];
    const col = i === sel ? '#ffd24a' : i === P.weapon ? '#e8d9b0' : '#a08860'; txt(wp.short, x - textW(wp.short) / 2, y - 4, col, 1, true, 1);
    if (!wp.melee) { const t = String(P.mags[i] + P.ammo[wp.ammo]); txt(t, x - textW(t) / 2, y + 5, '#8a7a60', 1, true, 0.8); } });
  g.strokeStyle = '#ffd24a'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + clamp(wheel.vx, -40, 40), cy + clamp(wheel.vy, -40, 40)); g.stroke();
  const t = 'VAPENHJULET'; txt(t, cx - textW(t) / 2, cy - r - 12, '#c9a87a', 1, true, 0.9);
}
function cycleWeapon(d) { const N = WEAPONS.length; for (let i = 1; i <= N; i++) { const n = ((WS.next >= 0 && WS.state === 'holster' ? WS.next : P.weapon) + d * i + N * 2) % N; if (P.has[n]) { switchWeapon(n); break; } } }
canvas.addEventListener('mousedown', e => {
  if (state === 'dead' || state === 'runover') return leaveRunScreen();
  if (state === 'stats') return nextFloor();
  if (state === 'pause') return resume();
  if (state !== 'play') return;
  if (document.pointerLockElement !== canvas) lockPointer();
  if (e.button === 2) aimDown = settings.toggleAim ? !aimDown : true; else mouseDown = true;
});
addEventListener('mouseup', e => { if (e.button === 2) { if (!settings.toggleAim) aimDown = false; } else mouseDown = false; });
addEventListener('mousemove', e => {
  if (wheel && wheel.open && state === 'play') { wheel.vx = clamp(wheel.vx + e.movementX, -60, 60); wheel.vy = clamp(wheel.vy + e.movementY, -60, 60); return; } // vapenhjulet tar musen
  if (document.pointerLockElement === canvas && state === 'play') {
    const s = 0.0026 * settings.sens * (1 - WS.aim * 0.35);
    P.a += e.movementX * s;
    if (settings.mouseLook !== false) lookBy(e.movementY * s); // titta upp/ned med samma känslighet som i sidled
    WS.swayX = clamp(WS.swayX + e.movementX * 0.05, -10, 10); WS.swayY = clamp(WS.swayY + e.movementY * 0.03, -6, 6);
  }
});
document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement !== canvas && state === 'play' && !params.has('nolock')) pause(); });
addEventListener('blur', () => pause());
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
canvas.addEventListener('wheel', e => { e.preventDefault(); if (state === 'play') cycleWeapon(Math.sign(e.deltaY)); }, { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ---------- Helskärm ----------
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;
const fsSupported = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
function toggleFullscreen() {
  const el = document.documentElement;
  try {
    if (fsElement()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req || !fsSupported()) { say('HELSKÄRM GÅR INTE HÄR – ÖPPNA SIDAN I WEBBLÄSAREN', 3); return; }
    const r = req.call(el, { navigationUI: 'hide' });
    const lock = () => { try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => {}); } catch (e) { /* valfritt */ } };
    if (r && r.then) r.then(lock).catch(() => say('HELSKÄRM NEKADES', 2)); else lock();
  } catch (e) { say('HELSKÄRM GÅR INTE HÄR', 2); }
}
const syncFsIcons = () => { const big = !fsElement(); document.querySelectorAll('.fsicon').forEach(i => { i.src = A + 'touch/icon_size_' + (big ? 'larger' : 'smaller') + '.png'; }); };
document.addEventListener('fullscreenchange', syncFsIcons); document.addEventListener('webkitfullscreenchange', syncFsIcons);

// ---------- Mobilstyrning (Kenney Mobile Controls, CC0) ----------
// Vänster halva: flytande joystick (gå/springa). Höger halva: dra för att vrida. Knappar: skjut (dra också för att sikta), sikta, ladda om, använd, byt vapen, karta, kort, paus.
const touch = { active: false, mx: 0, my: 0, mag: 0, look: 0, lookY: 0, tap: 0 };
const TAP_MOVE = 12, TAP_TIME = 250; // px, ms: kort tryck i vridzonen = ett skott, dra = vrid
// stående: bilden ligger överst och hela bilden är vridzon, joysticken bor under den
const lookFloor = () => innerHeight > innerWidth ? canvas.getBoundingClientRect().bottom : 0;
const isTouch = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
// ---------- UI-omgörningen: få knappar på telefonen (som moderna mobila FPS) ----------
// Permanent: AVFYRA, ALT (sikta = vapnets alt-attack), HOPPA, RUSA, PAUS. Sammanhangsknappar (.ctx) syns bara när de går att använda.
// Vapenbyte: tryck på ammo-hörnet (håll = vapenhjulet). Minikartan: tryck = stora kartan. Inställningen ALLA KNAPPAR ger den gamla layouten.
const touchMin = () => !settings.allButtons;
const touchPosKey = () => settings.allButtons ? 'btnPos' : 'btnPosMin'; // layoutredigeraren sparar varje layout för sig
const TOUCH_NO_RELOAD = ['boomerang', 'windgun', 'spear', 'mirrorshield', 'whip', 'censer', 'shears'];
function touchCanUse() { // samma saker som useKey() når – och sparken, som handen gör när inget annat finns
  if (!P || !lvl || !map) return false;
  for (const pr of props) if (pr.def && pr.def.use && !(pr.used && pr.def.use !== 'anvil') && Math.hypot(pr.x - P.x, pr.y - P.y) < 1.3) return true;
  for (const e of ents) if (e.dormant && Math.hypot(e.x - P.x, e.y - P.y) < 1.4) return true;
  for (const c of chests) if (!c.open && Math.hypot(c.x - P.x, c.y - P.y) < 1.2) return true;
  for (const m of merchants) if (Math.hypot(m.x - P.x, m.y - P.y) < 1.6 && shadowVisible(m)) return true;
  const ca = Math.cos(P.a), sa = Math.sin(P.a);
  for (const dist of [0.6, 1.0, 1.4]) { const nx = P.x + ca * dist, ny = P.y + sa * dist; if (doorAt(nx, ny) && isDoorChar(cellAt(nx, ny))) return true; }
  for (const e of ents) { if (e.dead || e.dying || e.hidden || e.dormant || !e.d) continue; const d = Math.hypot(e.x - P.x, e.y - P.y); if (d > 1.5 + e.d.size * 0.3) continue;
    let off = Math.atan2(e.y - P.y, e.x - P.x) - P.a; off = Math.atan2(Math.sin(off), Math.cos(off)); if (Math.abs(off) < 0.7) return true; } // sparka/avrätta fienden framför
  if (typeof v26bWantsUse === 'function' && v26bWantsUse()) return true; // version 26B: flygspark och granatretur
  for (const pt of pots) if (!pt.broken && Math.hypot(pt.x - P.x, pt.y - P.y) < 1.4) return true;
  const fx0 = P.x + ca * 0.9, fy0 = P.y + sa * 0.9;
  for (const pr of props) if (pr.def && !pr.broken && (pr.def.boom || pr.ch === 'u') && Math.hypot(pr.x - fx0, pr.y - fy0) < 0.8) return true;
  if (v26cTouchUse()) return true; // version 26C: krok för 26A om den behöver ANVÄND (v26aTouchUse)
  return solid(fx0, fy0); // en vägg tätt framför: hemliga dörrar hittas med handen
}
function touchCanReload() { const wp = WEAPONS[P.weapon]; if (!wp || wp.melee || TOUCH_NO_RELOAD.some(k => wp[k])) return false; if (WS.state === 'reload') return true; return P.mags[P.weapon] < effMag(P.weapon) && P.ammo[wp.ammo] > 0; }
const touchDarkLvl = { t: 0 };
const touchDark = () => { // mörk våning, eller riktigt mörkt där man står (sedan syns LAMPA i 6 s, så att den inte blinkar i varje skugga)
  if (floorEvent === 'dark' || cmode('dark') || dmod('dark')) return true;
  if (lvl && lvl.ambient <= 0.2) return true; // mörka biomer (grottorna, biblioteket, kristallgrottorna …)
  const now = performance.now(); if (levelTime > 0.5 && lightAt(P.x, P.y) < 0.2) touchDarkLvl.t = now + 6000;
  return now < touchDarkLvl.t;
};
const TOUCH_CTX = { use: touchCanUse, reload: touchCanReload, grenade: () => P.grenades > 0 || WS.throwT >= 0, potion: () => !!(P.potions && P.potions.length),
  ability: () => !!activeCard() && abCd <= 0, lamp: () => !!P.lamp || ((P.battery || 0) > 0 && touchDark()) };
function touchCtxTick(ui) { // visa/dölj sammanhangsknapparna
  for (const b of ui.querySelectorAll('.tb.ctx')) { let on = false; try { on = state === 'play' && !!TOUCH_CTX[b.dataset.act](); } catch (e) { on = false; } b.classList.toggle('show', on || b.classList.contains('on')); }
}
function touchHudRects() { // HUD-agentens rutor (spelkoordinater); reserv enligt kontraktet om de inte finns
  let R = null; try { R = window.__game && typeof window.__game.hudRects === 'function' ? window.__game.hudRects() : null; } catch (e) { R = null; }
  const s = settings.mapScale || 3, ms = (2 * Math.round(24 / s) + 1) * s + 4;
  return Object.assign({ hp: { x: 4, y: 3, w: 80, h: 22 }, ammo: { x: 236, y: 3, w: 80, h: 22 }, map: { x: W - 6 - ms, y: 28, w: ms + 4, h: ms } }, R || {});
}
function touchHudHit(cx, cy) { // vilket HUD-hörn fingret landade på
  const r = canvas.getBoundingClientRect(); if (!r.width) return '';
  const gx = (cx - r.left) / r.width * W, gy = (cy - r.top) / r.height * H, R = touchHudRects();
  const inR = q => q && gx >= q.x - 4 && gx <= q.x + q.w + 4 && gy >= q.y - 4 && gy <= q.y + q.h + 4;
  if (inR(R.ammo)) return 'swap';
  if (showMap === 1 && inR(R.map)) return 'map';
  return '';
}
function touchHudTap(e, ptrs) { // tryck på ammo = byt vapen (håll = vapenhjulet), tryck på minikartan = stora kartan
  if (showMap === 2 && touchMin() && (settings.lefty ? e.clientX < innerWidth * 0.55 : e.clientX > innerWidth * 0.45)) { const r = canvas.getBoundingClientRect(); if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) { showMap = 1; ptrs.set(e.pointerId, { kind: 'hud' }); return true; } }
  const h = touchHudHit(e.clientX, e.clientY); if (!h) return false;
  if (h === 'swap') { ptrs.set(e.pointerId, { kind: 'hud', swap: true, sx: e.clientX, sy: e.clientY }); wheelStart(); }
  else { showMap = 2; ptrs.set(e.pointerId, { kind: 'hud' }); play('click', 0.3, 1.5); }
  return true;
}
function touchScreenBtn(e) { // knappar som MENY ritar på canvas (dödsskärmen, våningsstatistiken): window.__game.screenButtons()
  let L = null; try { L = window.__game && typeof window.__game.screenButtons === 'function' ? window.__game.screenButtons() : null; } catch (er) { L = null; }
  if (!L || !L.length) return false;
  const r = canvas.getBoundingClientRect();
  for (const s of L) { let q; if (s.el) { const b = s.el.getBoundingClientRect(); q = [b.left, b.top, b.width, b.height]; } else q = [r.left + s.x / W * r.width, r.top + s.y / H * r.height, s.w / W * r.width, s.h / H * r.height];
    if (q[2] > 0 && e.clientX >= q[0] && e.clientX <= q[0] + q[2] && e.clientY >= q[1] && e.clientY <= q[1] + q[3]) { try { s.act(); } catch (er) { console.error(er); } return true; } }
  return false;
}
function autoFullscreen() { // tyst: ingen text om det nekas, ingen vrid-spärr (stående läge är tillåtet)
  try { if (fsElement() || !fsSupported()) return; const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen; if (!req) return;
    const r = req.call(el, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); } catch (e) { /* inte här */ }
}
let fsWantT = 0; // senaste trycket på en knapp på startskärmen (användargesten gäller några sekunder)
document.addEventListener('click', e => { if (state === 'title' && isTouch() && settings.autoFs !== false && e.target && e.target.closest && e.target.closest('button')) fsWantT = performance.now(); }, true);
function setupTouch() {
  const ui = document.getElementById('touch');
  const T = A + 'touch/';
  const btn = (act, icon, cls) => `<button class="tb ${cls}" data-act="${act}" aria-label="${act}"><img src="${T}btn.png" alt=""><img class="ic${act === 'fullscreen' ? ' fsicon' : ''}" src="${T}icon_${icon}.png" alt=""></button>`;
  ui.innerHTML = `<div class="joy" hidden><img class="pad" src="${T}pad.png" alt=""><img class="nub" src="${T}nub.png" alt=""></div><div class="rothint"><img src="${T}icon_size_larger.png" alt=""></div>
    ${btn('fire', 'crosshair', 'fire')}${btn('aim', 'target', 'aim')}${btn('reload', 'arrow_rotate', 'reload ctx')}${btn('use', 'hand', 'use ctx')}${btn('swap', 'arrow_curved', 'swap xtra')}
    ${btn('map', 'map', 'map small xtra')}${btn('deck', 'star', 'deck small xtra')}${btn('pause', 'pause', 'pausebtn small')}${btn('fullscreen', 'size_larger', 'fsbtn small')}${btn('settings', 'gear', 'gearbtn small xtra')}${btn('giveup', 'exit', 'giveupbtn small xtra')}${btn('jump', 'jump', 'jumpb')}${btn('crouch', 'crouch', 'crouchb xtra')}${btn('dash', 'dash', 'dashb')}${btn('grenade', 'grenade', 'grenb ctx')}${btn('potion', 'potion', 'potb ctx')}${btn('walk', 'arrow_curved', 'walkb')}${btn('ability', 'star', 'abb ctx')}${btn('lamp', 'lamp', 'lampb ctx')}${btn('stone', 'stone', 'stoneb xtra')}`;
  applyTouchLayout();
  const joy = ui.querySelector('.joy'), nub = ui.querySelector('.nub');
  const ptrs = new Map(); // pointerId -> { kind, x, y, ox, oy }
  const R = () => Math.min(innerWidth, innerHeight) * 0.13; // joystickens radie
  ui.addEventListener('pointerdown', e => {
    const fsb = e.target.closest('.fsbtn');
    if (fsb) { ui.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { kind: 'btn', btn: fsb, fs: true }); fsb.classList.add('on'); e.preventDefault(); return; }
    if (state === 'pause' && e.target.closest('.gearbtn')) { openSettingsUI(); e.preventDefault(); return; }
    if (state === 'pause' && e.target.closest('.giveupbtn')) { abandonRun(); e.preventDefault(); return; }
    if (state !== 'play') { // tryck för att fortsätta, gå vidare osv.
      if (touchScreenBtn(e)) { e.preventDefault(); return; } // MENY:s knappar på canvas (FÖRSÖK IGEN, MENY, VIDARE)
      if ((state === 'stats' || state === 'dead' || state === 'runover') && !endDetails && !deathMap && document.getElementById(state === 'stats' ? 'floorend' : 'runover')) { e.preventDefault(); return; } // MENY:s DOM-skärmar tar själva emot trycken – hoppa inte över dem
      if (state === 'pause') resume(); else if (state === 'stats') nextFloor(); else leaveRunScreen();
      e.preventDefault(); return;
    }
    touch.active = true; ensureAudio();
    const b = e.target.closest('.tb');
    ui.setPointerCapture(e.pointerId);
    if (b) {
      const act = b.dataset.act; b.classList.add('on');
      if (act === 'fire') { mouseDown = true; ptrs.set(e.pointerId, { kind: 'look', x: e.clientX, y: e.clientY, btn: b, fire: true }); }
      else {
        ptrs.set(e.pointerId, { kind: 'btn', btn: b });
        if (act === 'aim') aimDown = !aimDown;
        if (act === 'reload') reloadKey();
        if (act === 'use') useKey();
        if (act === 'swap') { const p0 = ptrs.get(e.pointerId); p0.sx = e.clientX; p0.sy = e.clientY; p0.swap = true; wheelStart(); } // svep: byt, håll: vapenhjulet
        if (act === 'map') { const p0 = ptrs.get(e.pointerId); p0.mapHold = setTimeout(() => { p0.mapHeld = showMap; showMap = 2; }, 450); showMap = (showMap + 1) % 3; settings.map = showMap; saveSettings(); } // håll för hela kartan
        if (act === 'walk') { autoWalk = !autoWalk; b.classList.toggle('lit', autoWalk); say(autoWalk ? 'GÅR FRAMÅT – STYR MED TUMMEN' : 'STANNAR', 1); }
        if (act === 'deck') showDeck();
        if (act === 'pause') { pause(); if (state === 'pause') pauseMenu(); }
        if (act === 'jump') jump();
        if (act === 'crouch') touch.crouch = true;
        if (act === 'dash') dash(0, 0);
        if (act === 'taunt') v26cTaunt(); // version 26C: hån (ALLA KNAPPAR)
        if (act === 'grenade') grenadeStart();
        if (act === 'potion') drinkPotion();
        if (act === 'ability') useAbility();
        if (act === 'lamp') toggleLamp();
        if (act === 'stone') throwStone();
      }
    } else if (touchHudTap(e, ptrs)) { // HUD-hörnen: ammo = byt vapen, minikartan = stora kartan
    } else if ((settings.lefty ? e.clientX > innerWidth * 0.55 : e.clientX < innerWidth * 0.45) && e.clientY > lookFloor()) { // joysticken: flytande där tummen landar, eller fast
      const fixed = settings.fixedJoy, fx0 = settings.lefty ? innerWidth * 0.85 : innerWidth * 0.15, fy0 = innerHeight * 0.72;
      const ox = fixed ? fx0 : e.clientX, oy = fixed ? fy0 : e.clientY;
      ptrs.set(e.pointerId, { kind: 'joy', ox, oy });
      joy.hidden = false; joy.style.left = (settings.lefty ? innerWidth - ox : ox) + 'px'; joy.style.top = oy + 'px'; nub.style.transform = 'translate(-50%,-50%)'; // spegelvänd layout för vänsterhänta
    } else { // vridzon: tryck för att skjuta, dra för att vrida
      ptrs.set(e.pointerId, { kind: 'look', x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t0: performance.now(), tap: true });
    }
    e.preventDefault();
  });
  ui.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    if (p.kind === 'joy') {
      let dx = e.clientX - p.ox, dy = e.clientY - p.oy; const d = Math.hypot(dx, dy), r = R();
      if (d > r) { dx *= r / d; dy *= r / d; }
      touch.mx = dx / r; touch.my = dy / r; touch.mag = Math.min(1, d / r);
      nub.style.transform = `translate(calc(-50% + ${settings.lefty ? -dx : dx}px), calc(-50% + ${dy}px))`;
    } else if (p.swap) {
      const dx = e.clientX - p.sx, dy = e.clientY - p.sy;
      if (wheel && wheel.open) { wheel.vx = clamp(dx, -60, 60); wheel.vy = clamp(dy, -60, 60); }
      else if (Math.abs(dx) > 34 && !p.swiped) { p.swiped = true; wheel = null; cycleWeapon(dx > 0 ? 1 : -1); play('click', 0.4, 1.5); } // dra-gest
    } else if (p.kind === 'look') {
      touch.look += (e.clientX - p.x) * 320 / innerWidth; touch.lookY += (e.clientY - p.y) * 200 / innerHeight;
      p.x = e.clientX; p.y = e.clientY;
      if (p.tap && Math.hypot(p.x - p.sx, p.y - p.sy) > TAP_MOVE) p.tap = false;
    }
    e.preventDefault();
  });
  const end = e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    ptrs.delete(e.pointerId);
    if (p.kind === 'joy') { touch.mx = touch.my = touch.mag = 0; joy.hidden = true; }
    if (p.swap && !p.swiped) wheelRelease(() => cycleWeapon(1)); // byt-knappen eller ammo-hörnet
    if (p.btn) { p.btn.classList.remove('on'); if (p.btn.dataset.act === 'crouch') touch.crouch = false; if (p.btn.dataset.act === 'grenade') grenadeThrow();
      if (p.mapHold) { clearTimeout(p.mapHold); if (p.mapHeld !== undefined) { showMap = p.mapHeld; settings.map = showMap; saveSettings(); } } }
    if (p.fire) mouseDown = false;
    if (p.tap && e.type === 'pointerup' && performance.now() - p.t0 < TAP_TIME && state === 'play') { // snabbt tryck = skott, dubbeltryck = hopp (inställning)
      if (settings.tapJump && performance.now() - (touch.lastTap || 0) < 320) { jump(); touch.lastTap = 0; } else { touch.tap = 0.12; touch.lastTap = performance.now(); } }
    if (p.fs && e.type === 'pointerup') toggleFullscreen(); // helskärm måste begäras när fingret släpps (användargest)
  };
  ui.addEventListener('pointerup', end); ui.addEventListener('pointercancel', end);
  ui.addEventListener('contextmenu', e => e.preventDefault());
  ui.addEventListener('touchstart', e => e.preventDefault(), { passive: false }); // inga efterföljande musklick som stänger kortleken direkt
  // visa kontrollerna bara när det behövs
  setInterval(() => {
    const show = layoutOn || (isTouch() && map && state !== 'title' && state !== 'ui');
    ui.hidden = !show;
    ui.classList.toggle('playing', state === 'play');
    ui.querySelector('[data-act=aim]').classList.toggle('lit', aimDown);
    ui.classList.toggle('paused', state === 'pause');
    if (ui.classList.contains('all') !== !!settings.allButtons) applyTouchLayout(); // ALLA KNAPPAR ändrad (inställningar, importerad profil)
    if (show && !layoutOn) touchCtxTick(ui);
    if (state === 'play' && touchMin() && !touch.rotShown && innerHeight > innerWidth * 1.1) { touch.rotShown = performance.now(); ui.querySelector('.rothint').classList.add('on'); } // stående: en diskret "vrid för helskärm" en gång
    if (touch.rotShown && performance.now() - touch.rotShown > 4000) ui.querySelector('.rothint').classList.remove('on');
    if (fsWantT && state !== 'title') { if (performance.now() - fsWantT < 4500) autoFullscreen(); fsWantT = 0; } // automatisk helskärm när rundan börjar
    else if (fsWantT && performance.now() - fsWantT > 4500) fsWantT = 0;
  }, 150);
}

