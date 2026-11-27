// ---------- MENY: nivåslutet och dödsskärmen som DOM-skärmar (#floorend, #runover) ovanför pekknapparna ----------
// Canvasen tonas bara ned; siffrorna, betyget och knapparna ligger i DOM. D (eller tryck på siffrorna) visar de gamla detaljerna.
let endScr = { ro: null, fe: null }, endDetails = false;
function drawStats() { if (endDetails) return drawStatsDetails(); ctx.fillStyle = 'rgba(10,6,4,0.72)'; ctx.fillRect(0, 0, W, H); drawExitFx(ctx); }
function drawRunOver(win) { if (endDetails) return drawRunDetails(win); ctx.fillStyle = win ? 'rgba(4,16,6,0.55)' : 'rgba(40,4,2,0.5)'; ctx.fillRect(0, 0, W, H); }
function syncEndScreens() { // körs varje bildruta och från showTitle: visar/döljer skärmarna efter spelets läge
  menyWatch(); // MENY: toning när en ny våning/runda börjar
  const ro =document.getElementById('runover'), fe = document.getElementById('floorend'); if (!ro || !fe) return;
  const over = !!map && !!run && !deathMap && !endDetails && ((state === 'dead' && P.deadT > 1.2) || state === 'runover');
  if (over) { if (ro.hidden) showRunOver(state === 'runover'); else tickRunOver(); } else if (!ro.hidden) { ro.hidden = true; endScr.ro = null; }
  const st = !!map && state === 'stats' && !!stats && !endDetails;
  if (st) { if (fe.hidden) showFloorEnd(); else tickFloorEnd(); } else if (!fe.hidden) { fe.hidden = true; endScr.fe = null; }
  if (state !== 'stats' && state !== 'dead' && state !== 'runover') endDetails = false;
  document.body.classList.toggle('endscr-on', state === 'stats' || state === 'dead' || state === 'runover'); // döljer helskärmsknappen (#touch .fsbtn) på dödsskärmen och nivåslutet
}
function showRunOver(win) {
  const r = run, ro = document.getElementById('runover'), cause = document.getElementById('ro-cause');
  ro.classList.toggle('win', !!win); document.getElementById('ro-head').textContent = win ? 'SEGER' : 'DU DOG';
  cause.textContent = '';
  if (!win && r.cause) { cause.append('DÖDAD AV '); cause.appendChild(Object.assign(document.createElement('b'), { textContent: r.cause })); }
  else if (win) cause.textContent = r.practice ? 'ÖVNINGEN KLARAD' : r.loop ? `VARV ${r.loop + 1} KLARAT` : 'BOSSEN BESEGRAD';
  cause.hidden = !cause.textContent;
  document.getElementById('ro-depth').textContent = String(r.depth); document.getElementById('ro-kills').textContent = String(r.kills); document.getElementById('ro-time').textContent = fmtTime(r.time || 0);
  document.getElementById('ro-souls').textContent = '';
  const tip = r.records && r.records.length ? 'NYTT REKORD: ' + r.records[0] : !win ? 'TIPS: ' + (DEATH_TIPS[r.cause] || 'VARJE RUNDA LÄR DIG NÅGOT') : '';
  document.getElementById('ro-tip').textContent = tip.length > 60 ? tip.slice(0, 58) + '…' : tip;
  s29RunOver(r); // version 29 (SPEL): blodpakter och fällda blodfurstar
  a30RunOver(r); // version 30 (ALTARE): förbunden, och ÄNDLÖST:s poäng och topplista
  endScr.ro = { t0: performance.now(), souls: r.practice ? -1 : r.souls || 0, shown: -1, cnt: [r.depth | 0, r.kills | 0, r.time || 0], cs: '' }; menyCount(endScr.ro); // MENY: siffrorna räknas upp
  mouseDown = false; aimDown = false; if (document.pointerLockElement) document.exitPointerLock();
  ro.hidden = false;
  if (!isTouch()) setTimeout(() => { try { if (!ro.hidden) document.getElementById('retrybtn').focus({ preventScroll: true }); } catch (e) { /* ingen fokus */ } }, 0);
}
function tickRunOver() { // själarna räknas upp
  if (endScr.ro) menyCount(endScr.ro);
  const o = endScr.ro; if (!o || o.souls < 0) return; const n = Math.min(o.souls, Math.floor((performance.now() - o.t0) / 40));
  if (n !== o.shown) { o.shown = n; document.getElementById('ro-souls').textContent = `+${n} SJÄLAR`; if (n < o.souls && n % 3 === 0) play('coin', 0.15, 1.6); }
}
function retryRun() { // FÖRSÖK IGEN: en ny runda direkt med samma inställningar (samma som Enter)
  if (!((state === 'dead' && P.deadT > 0.8) || (state === 'runover' && P.deadT > 0.3))) return;
  const r = run || {}; showTitle(); document.getElementById('seed').value = '';
  const pr = r.practice, ed0 = r.custom ? store.get('editor', null) : null;
  if (ed0 && ed0.grid) playCustom({ biome: 'dungeon', ...ed0 }); else if (pr && (pr.biome || pr.boss)) { practice = { ...pr }; begin('practice'); } // egen bana och övning: samma igen
  else if (r.hunt) beginBossHunt(); else if (r.campaign) beginCampaign(r.campaign.ch | 0); else if (r.survival) beginSurvival(); else if (r.maze) beginMaze(); else if (r.abyss) beginAbyss(!!r.abyssDaily); // speciallägena börjar om i samma läge
  else if (r.a30e) a30eBegin(); // version 30 (ALTARE): ÄNDLÖST börjar om i samma läge
  else begin(r.weekly ? 'weekly' : r.monthly ? 'monthly' : r.daily ? 'daily' : r.bossrush ? 'bossrush' : 'new');
}
function showFloorEnd() {
  const s = stats, fe = document.getElementById('floorend');
  document.getElementById('fe-head').textContent = `${s.name} KLARAD`;
  const rows = [{ k: 'TID', v: s.time, f: v => fmtTime(v) + (s.rec && s.time < s.rec && v >= s.time ? ' REKORD!' : '') }, { k: 'DÖDADE', v: s.kills, f: v => `${Math.round(v)}/${s.totalEnemies}` }, { k: 'HEMLIGHETER', v: s.secrets, f: v => `${Math.round(v)}/${s.totalSecrets}` }, { k: 'GULD', v: run.gold, f: v => String(Math.round(v)), gold: true }];
  const box = document.getElementById('fe-rows'); box.textContent = '';
  for (const r of rows) { box.appendChild(Object.assign(document.createElement('span'), { className: 'k', textContent: r.k })); r.el = box.appendChild(Object.assign(document.createElement('span'), { className: 'v' + (r.gold ? ' gold' : ''), textContent: '' })); }
  const g = document.getElementById('fe-grade'); g.textContent = s.grade || '–'; g.style.color = GRADE_COL[s.grade] || '#e8d9b0'; g.classList.remove('on');
  document.getElementById('fe-extra').textContent = (s.extra || []).slice(0, 3).join(' · ');
  endScr.fe = { t0: performance.now(), rows, done: false };
  fe.hidden = false; tickFloorEnd();
  if (!isTouch()) setTimeout(() => { try { if (!fe.hidden) document.getElementById('nextbtn').focus({ preventScroll: true }); } catch (e) { /* ingen fokus */ } }, 0);
}
function tickFloorEnd(skip) { // sammanräkningen: en rad i taget räknas upp, sedan slår betyget ned
  const o = endScr.fe; if (!o || o.done) return; if (skip) o.t0 = -1e9;
  const t = (performance.now() - o.t0) / 1000, per = 0.35;
  o.rows.forEach((r, i) => { const k = clamp((t - i * per) / per, 0, 1), txt0 = t < i * per ? '' : r.f(r.v * k); if (r.el.textContent !== txt0) { r.el.textContent = txt0; if (k >= 1 && !r.tick) { r.tick = 1; play('ui_hover', 0.35, 0.8); } } });
  if (t >= o.rows.length * per + 0.15) { o.done = true; const g = document.getElementById('fe-grade'); g.classList.add('on'); play('coin', 0.5, 0.7); menyStamp(g); } // MENY: betyget stämplas
}
document.getElementById('retrybtn').addEventListener('click', e => { e.stopPropagation(); retryRun(); });
document.getElementById('romenubtn').addEventListener('click', e => { e.stopPropagation(); leaveRunScreen(); });
document.getElementById('nextbtn').addEventListener('click', e => { e.stopPropagation(); nextFloor(); });
document.getElementById('floorend').addEventListener('click', () => { const o = endScr.fe; if (o && !o.done) tickFloorEnd(true); else nextFloor(); }); // tryck var som helst: hoppa över uppräkningen, sedan vidare
document.querySelector('#runover .es-nums').addEventListener('click', () => { endDetails = true; });
document.querySelector('#floorend .fe-rows').addEventListener('click', e => { const o = endScr.fe; if (o && o.done) { e.stopPropagation(); endDetails = true; } });
addEventListener('keydown', e => { if (e.code === 'KeyD' && (state === 'dead' || state === 'runover') && P.deadT > 1.2) endDetails = !endDetails; else if (endDetails && (state === 'stats' || state === 'dead' || state === 'runover') && (e.code === 'Escape' || e.code === 'KeyD')) endDetails = false; });
canvas.addEventListener('mousedown', e => { if (endDetails && (state === 'stats' || state === 'dead' || state === 'runover')) { endDetails = false; e.stopImmediatePropagation(); } }, true);
function drawStatsDetails() {
  const s = stats;
  ctx.fillStyle = '#0c0806fa'; ctx.fillRect(0, 0, W, H);
  const head = `${s.name} KLARAD`; txt(head, (W - textW(head)) / 2, 8, '#ffd24a');
  // varvets väg: biomerna i ordning med den nuvarande markerad
  const c0 = cycleOf(run.depth) * (FLOORS + 1);
  for (let i = 1; i <= FLOORS + 1; i++) { const d = c0 + i, bx = W / 2 - 51 + (i - 1) * 17, cur = d === run.depth;
    ctx.fillStyle = d < run.depth ? '#6a5a40' : cur ? '#ffd24a' : '#3a2c1e'; ctx.fillRect(bx, 20, 14, 4);
    if (isBossDepth(d)) { ctx.fillStyle = '#c03020'; ctx.fillRect(bx + 5, 20, 4, 4); } }
  { const nd = run.depth + 1, t = 'NÄSTA: ' + (isBossDepth(nd) ? 'BOSSEN' : BIOME_NAME[biomeFor(nd)] || ''); txt(t, (W - textW(t)) / 2, 28, '#8a7558'); }
  const est = Math.round((run.kills * 0.6 + (run.depth - 1) * 6 + (run.guardians || 0) * 5 + (run.bosses || 0) * 15) * diff().souls);
  const rows = [['FIENDER', `${s.kills}/${s.totalEnemies}${s.stealth ? ` (${s.stealth} OSEDDA)` : ''}`], ['HEMLIGHETER', `${s.secrets}/${s.totalSecrets}`], ['UTFORSKAT', `${s.explored}%`], ['TRÄFFSÄKERHET', `${s.acc}%`], ['SKADA TAGEN', String(s.taken)], ['TID', fmtTime(s.time) + (s.rec ? (s.time < s.rec ? ' REKORD!' : ` (${fmtTime(s.rec)})`) : '')], ['BONUS', `+${s.bonus}`], ['GULD', String(run.gold)], ['SJÄLAR', `~${est}`]];
  rows.forEach(([k, v], i) => { const y = 42 + i * 10; txt(k, 40, y, '#8a7558'); txt(v, 236 - textW(v), y, k === 'SJÄLAR' ? '#c0a0ff' : '#e8d9b0'); });
  if (s.grade) { txt('BETYG', 252, 44, '#8a7558'); ctx.font = '32px "PressStart2P"'; const gw = ctx.measureText(s.grade).width; txt(s.grade, Math.round(272 - gw / 2), 58, GRADE_COL[s.grade] || '#e8d9b0', 4); }
  let y = 42 + rows.length * 10 + 4;
  if (s.extra && s.extra.length) { const out = []; for (const e of s.extra) { const c = out.length ? out[out.length - 1] + ' · ' + e : ''; if (out.length && c.length <= 38) out[out.length - 1] = c; else out.push(e); } // så många som får plats per rad
    for (const l of out.slice(0, 3)) { txt(l, (W - textW(l)) / 2, y, '#9fe060'); y += 10; } }
  const f = isTouch() ? 'TRYCK FÖR ATT VÄLJA KORT' : 'KLICKA FÖR ATT VÄLJA KORT'; txt(f, (W - textW(f)) / 2, H - 34, '#ffe9a8', 1, true, 0.55 + 0.45 * Math.abs(Math.sin(tmr * 2.5)));
  const tip = s.tip ? 'TIPS: ' + s.tip : !isTouch() ? `D = SVÅRIGHET: ${DIFF[settings.diff].name}` : '';
  if (tip) wrapText(tip, 38).slice(0, 2).forEach((ln, i) => txt(ln, (W - textW(ln)) / 2, H - 21 + i * 10, '#6a5a44'));
}
const DEATH_TIPS = { 'LAVA': 'HOPPA ÖVER LAVAN ELLER GÅ RUNT', 'SPIKFÄLLA': 'SPIKARNA KLICKAR INNAN DE SKJUTER UPP', 'GIFTGAS': 'GASEN PYSER MED JÄMNA MELLANRUM', 'GAV UPP': 'SJÄLAALTARET GÖR NÄSTA RUNDA LÄTTARE',
  'BOMBSKELETT': 'SKJUT BOMBSKELETTEN PÅ AVSTÅND', 'SPINDEL': 'BRÄNN NÄTEN MED BLOSS ELLER GRANATER', 'HELVETESHUND': 'HUNDARNA SNUBBLAR OM DU TRÄFFAR DEM I SPRÅNGET', 'VAMPYR': 'VAMPYREN ÄR SNABB – BACKA OCH SKJUT',
  'ORKKRIGARE': 'LÅT ORKKRIGAREN KROCKA I VÄGGEN', 'BENMAGIKER': 'DÖDA MAGIKERN INNAN DEN VÄCKER FLER' };
function drawRunDetails(win) { // de gamla detaljerna (graf, kort, tidslinje) – D eller tryck på siffrorna på dödsskärmen
  const r = run;
  ctx.fillStyle = win ? '#0a140afa' : '#160606fa'; ctx.fillRect(0, 0, W, H);
  ctx.font = '16px "PressStart2P"'; const t1 = win ? 'SEGER!' : 'RUNDAN ÄR SLUT'; const w = ctx.measureText(plain(t1)).width;
  txt(t1, (W - w) / 2, 10, win ? '#9fe0a0' : '#ff5040', 2);
  const rows = [['VÅNING', win ? (r.loop ? `VARV ${r.loop + 1} KLARAT` : 'BOSSEN BESEGRAD') : r.depth > FLOORS + 1 ? `${r.depth} (VARV ${cycleOf(r.depth) + 1})` : `${r.depth} AV ${FLOORS + 1}`], ['FIENDER', String(r.kills) + (r.stealthKills ? ` (${r.stealthKills} OSEDDA)` : '')], ['KORT', String(r.owned.length)], ['GULD', String(r.gold)], ['TID', fmtTime(r.time)], ['POÄNG', String(score)], ['SJÄLAR', `+${r.souls || 0}`], ['FRÖ', seedText(r.seed)]];
  const fav = Object.entries(r.wkills || {}).sort((a, b) => b[1] - a[1])[0];
  if (fav) rows.splice(2, 0, ['FAVORITVAPEN', `${WEAPONS[weaponIndex(fav[0])].short} (${fav[1]})`]);
  if (r.shots) rows.splice(3, 0, ['TRÄFFSÄKERHET', `${Math.round(100 * (r.hits || 0) / r.shots)}%`]);
  const soulsShown = Math.min(r.souls || 0, Math.floor(P.deadT * 25)); // själarna räknas upp
  if (soulsShown < (r.souls || 0) && Math.floor(P.deadT * 25) % 3 === 0) play('coin', 0.15, 1.6);
  for (const row of rows) if (row[0] === 'SJÄLAR') row[1] = `+${soulsShown}`;
  if (!win && r.cause) rows.unshift(['DÖDAD AV', r.cause]);
  const worst = Object.entries(r.dmgBy || {}).sort((a, b) => b[1] - a[1])[0]; if (worst && !(r.cause && worst[0] === r.cause)) rows.splice(r.cause && !win ? 1 : 0, 0, ['SKADAD AV', worst[0]]);
  if (r.records && r.records.length) rows.push(['NYTT REKORD', r.records[Math.floor(P.deadT / 2) % r.records.length]]);
  const keep = rows.filter(([k]) => !['KORT', 'POÄNG', 'FRÖ', 'FAVORITVAPEN'].includes(k)).slice(0, 10); // de viktigaste raderna, resten finns i statistiken
  keep.forEach(([k, v], i) => { const y = 32 + i * 10, room = 190 - 24 - textW(k) - 8; let vv = String(v); while (vv.length > 2 && textW(vv) > room) vv = vv.slice(0, -2) + '…'; txt(k, 24, y, '#8a7558'); txt(vv, 190 - textW(vv), y, k === 'SJÄLAR' ? '#c0a0ff' : k === 'DÖDAD AV' ? '#ff7060' : '#e8d9b0'); });
  if (r.graph && r.graph.length > 1) { // graf över hälsa och guld per våning
    const gx = 200, gy = 32, gw = 110, gh = 50, n = r.graph.length, mg = Math.max(1, ...r.graph.map(p => p.gold));
    ctx.fillStyle = '#0008'; ctx.fillRect(gx, gy, gw, gh); txt('HP', gx + 2, gy + 2, '#ff6050'); txt('GULD', gx + 26, gy + 2, '#ffd24a');
    const md = Math.max(1, ...r.graph.map(p => p.dmg || 0)); txt('SKADA', gx + 64, gy + 2, '#80c0ff');
    for (const [key, col, max] of [['hp', '#ff6050', 1], ['gold', '#ffd24a', mg], ...(r.graph.some(p => p.dmg) ? [['dmg', '#80c0ff', md]] : [])]) { ctx.strokeStyle = col; ctx.beginPath(); r.graph.forEach((p, i) => { const x = gx + 4 + i / (n - 1) * (gw - 8), y = gy + gh - 4 - p[key] / max * (gh - 16); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); }
  }
  const names = r.owned.slice(-6).map(id => (Cards.byId(id) || {}).name).filter(Boolean), log = (r.log || []).slice(-6);
  const tal = Object.entries(r.talents || {}).map(([id, k]) => (TALENTS[id] ? TALENTS[id].name : id) + (k > 1 ? ' ' + k : ''));
  if (tal.length && Math.floor(P.deadT / 4) % 3 === 2) { txt(`NIVÅ ${r.lvl || 1}:`, 200, 90, '#c9a87a'); tal.slice(-6).forEach((n, i) => txt(n.slice(0, 15), 200, 100 + i * 8, '#c0a0ff', 1, true, 0.9)); } // talangerna
  else if (log.length && Math.floor(P.deadT / 4) % 2 === 1) { txt('TIDSLINJE:', 200, 90, '#c9a87a'); log.forEach((n, i) => txt(n.slice(0, 15), 200, 100 + i * 8, '#a0d0e8', 1, true, 0.9)); } // rundans tidslinje
  else if (names.length) { txt('KORT:', 200, 90, '#c9a87a'); names.forEach((n, i) => txt(n.slice(0, 14), 200, 100 + i * 8, '#b9a0e8', 1, true, 0.9)); }
  if (!win && r.cause) wrapText('TIPS: ' + (DEATH_TIPS[r.cause] || 'VARJE RUNDA LÄR DIG NÅGOT'), 38).slice(0, 2).forEach((t, i) => txt(t, (W - textW(t)) / 2, 142 + i * 10, '#8a7558'));
  const f = isTouch() ? 'TRYCK FÖR ATT GÅ TILLBAKA' : 'KLICKA ELLER D FÖR ATT GÅ TILLBAKA'; txt(f, (W - textW(f)) / 2, H - 30, '#ffe9a8', 1, true, 0.55 + 0.45 * Math.abs(Math.sin(tmr * 2.5)));
  const keysTxt = isTouch() ? '' : 'ENTER NY · R SAMMA FRÖ · M KARTA'; if (keysTxt) txt(keysTxt, (W - textW(keysTxt)) / 2, H - 16, '#6a5a44');
}

// ---------- Indata ----------
function showTitle() {
  deathMap = false;
  state = 'title'; map = null; musicSnd = false; playMusic();
  stopAmbient(); setMusic(false);
  if (breathSnd) { breathSnd.s.stop(); breathSnd = null; }
  if (document.pointerLockElement) document.exitPointerLock();
  document.getElementById('title').hidden = false;
  syncEndScreens(); refreshTitle(); titleMenu('');
}
function ensureAudio() {
  if (!actx) loadSounds().then(() => { if (state === 'play' && !ambient) startAmbient(); else playMusic(); });
  else if (actx.state === 'suspended') actx.resume();
}
function startMode(mode) { // bekräfta innan en ny runda skriver över en pågående
  if (mode !== 'continue' && store.get(runKey(), null) && !CardUI.isOpen()) {
    CardUI.choice({ title: 'NY RUNDA?', subtitle: 'DU HAR EN PÅGÅENDE RUNDA. EN NY RUNDA SKRIVER ÖVER DEN.', cancel: 1, options: [{ label: 'STARTA NY', text: 'DEN GAMLA FÖRSVINNER' }, { label: 'AVBRYT', text: '' }] }, i => { if (i === 0) begin(mode); });
    return;
  }
  begin(mode);
}
function openPractice() {
  const biomes = BIOME_IDS.map(b => ({ label: BIOME_NAME[b] || b, text: 'ÖVA PÅ VÅNINGAR I DEN HÄR BIOMEN' })), bosses = bossPool().map(b => ({ label: BOSSES[b].name, text: 'MÖT BOSSEN DIREKT' }));
  CardUI.list('ÖVNING', 'INGA SJÄLAR ELLER PRESTATIONER. VÄLJ EN BIOM ELLER EN BOSS.', [{ label: 'BIOMER', head: true, color: '#ffd24a' }, ...biomes.map((r, i) => ({ ...r, onClick: () => { CardUI.close(); practice = { biome: BIOME_IDS[i] }; begin('practice'); } })),
    { label: 'BOSSAR', head: true, color: '#ffd24a' }, ...bosses.map((r, i) => ({ ...r, onClick: () => { CardUI.close(); practice = { boss: bossPool()[i] }; begin('practice'); } })),
    { label: 'FIENDER (OÄNDLIG AMMO OCH HÄLSA)', head: true, color: '#ffd24a' }, ...Object.keys(profile.bestiary || {}).filter(t => ENEMY_DEFS[t]).map(t => ({ img: enemyIcon(t), label: ENEMY_DEFS[t].name, text: 'ÖVA MOT TRE I TAGET', onClick: () => { CardUI.close(); beginEnemyPractice(t); } }))], () => refreshTitle());
}
function begin(mode) { // mode: 'new' | 'daily' | 'continue' | 'bossrush' | 'practice'
  if (mode !== 'practice') practice = null;
  document.getElementById('title').hidden = true;
  canvas.focus(); ensureAudio();
  if (mode === 'continue' && loadRunSave()) { loadFloor(run.depth); lockPointer(); return; }
  let seed = mode === 'daily' ? dailySeed() : mode === 'weekly' ? RNG.hash('krypta-vecka-' + weekNo()) : mode === 'monthly' ? RNG.hash('krypta-månad-' + new Date().toISOString().slice(0, 7)) : RNG.randomSeed();
  const typed = (document.getElementById('seed').value || '').trim();
  if (mode === 'new' && typed) seed = /^[0-9a-z]{1,7}$/i.test(typed) ? parseInt(typed, 36) >>> 0 : RNG.hash(typed);
  if (params.has('seed')) seed = RNG.hash(params.get('seed'));
  newRun(seed, mode === 'daily' || mode === 'weekly' || mode === 'monthly');
  if (mode === 'monthly') { run.monthly = true; run.cmode = 'dark'; P.battery += 120; run.modifier = RNG(seed).fork('månaden').pick(DAILY_MODS); }
  if (mode === 'weekly') { const r = RNG(seed).fork('veckan'), m = r.shuffle(DAILY_MODS.slice()); run.modifier = m[0]; run.modifier2 = m[1]; run.weekly = true; } // veckans utmaning: två förbannelser
  if (mode === 'bossrush') { run.bossrush = true; run.rushN = 0; for (let i = 1; i <= 4; i++) { P.has[i] = true; P.mags[i] = WEAPONS[i].mag; } P.ammo = Object.assign(NOAMMO(), { p9: 120, r556: 90, shells: 30, bolts: 10, flares: 6 }); P.grenades = 3; }
  if (mode === 'practice' && run.practice && run.practice.boss) { for (let i = 1; i <= 4; i++) { P.has[i] = true; P.mags[i] = WEAPONS[i].mag; } P.ammo = Object.assign(NOAMMO(), { p9: 120, r556: 90, shells: 30 }); }
  const startDepth = mode === 'practice' && run.practice && run.practice.boss ? FLOORS + 1 : mode === 'bossrush' ? FLOORS + 1 : params.get('floor') ? clamp(+params.get('floor'), 1, FLOORS + 1) : 1;
  if (startDepth > 1) { for (let i = 1; i <= Math.min(3, startDepth - 1); i++) { P.has[i] = true; P.mags[i] = WEAPONS[i].mag; } P.ammo = Object.assign(NOAMMO(), { p9: 90, r556: 60, shells: 20 }); }
  loadFloor(startDepth);
  if (params.has('nocards')) { lockPointer(); return; }
  // startkort: välj ett av tre innan första våningen
  if (run.modifier) say((run.weekly ? 'VECKANS UTMANING: ' + run.modifier.name + ' + ' + run.modifier2.name : run.monthly ? 'MÅNADENS UTMANING: MÖRKER + ' + run.modifier.name : 'DAGENS UTMANING: ' + run.modifier.name), 4);
  openUI(() => draftUI(drawCards(3 + meta('choice')), { title: 'RUNDAN BÖRJAR', subtitle: run.modifier ? 'DAGENS UTMANING: ' + run.modifier.name + ' – ' + run.modifier.text : 'VÄLJ ETT STARTKORT', skipLabel: 'INGET KORT' }, card => { gainCard(card); closeUI(); }));
}
function lockPointer() { if (!params.has('nolock') && !isTouch() && document.pointerLockElement !== canvas && canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* pekarlås valfritt */ } } }
addEventListener('blur', () => pause());
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
function applyReduceMotion() { // en knapp stänger av skak, gung, lutning och blixtar
  const on = !!settings.reduceMotion; Object.assign(settings, { shake: on ? 0 : 1, bob: !on, tilt: !on, noFlash: on }); saveSettings();
}
function applyHudPreset() { // minimal, standard eller full HUD
  const p = settings.hudPreset || '', full = p === 'full', min = p === 'min';
  Object.assign(settings, { objective: !min, timer: full, enemyBars: !min, dmgNumbers: !min, stealthHud: !min, fps: full, map: min ? 0 : 1 }); showMap = settings.map; saveSettings();
}
function showTalents(onClose) { // talangerna du har den här rundan
  const owned = Object.entries(run.talents || {});
  CardUI.list('TALANGER', `NIVÅ ${run.lvl || 1} · ${Math.round(run.xp || 0)} AV ${xpNeed(run.lvl || 1)} ERFARENHET`, ['krigare', 'skugga', 'mystiker'].map(br => [{ label: br === 'krigare' ? 'KRIGAREN' : br === 'skugga' ? 'SKUGGAN' : 'MYSTIKERN', head: true, color: br === 'krigare' ? '#ff7060' : br === 'skugga' ? '#c080ff' : '#70b0ff' },
    ...TALENT_IDS.filter(id => TALENTS[id].branch === br).map(id => { const r = talent(id), t = TALENTS[id]; return { label: `${r ? '★' : '☆'} ${t.name} ${r}/${t.max}`, text: (r ? t.text(r) : t.text(1)) + (t.req && !talent(t.req) ? ' · KRÄVER ' + TALENTS[t.req].name : ''), dim: !r, color: r ? '#e8d9b0' : '' }; })]).flat(), onClose);
}
function showTitles() { // titlar som låses upp och visas på startskärmen
  CardUI.list('TITLAR', 'VÄLJ EN TITEL SOM VISAS PÅ STARTSKÄRMEN', TITLES.map(([id, name]) => { const open = titleOpen(id);
    return { label: (profile.title || '') === id ? '★ ' + name : name, text: open ? (id ? 'UPPLÅST' : '') : 'LÅST', dim: !open, color: open && id ? '#ffd24a' : '', onClick: open ? () => { profile.title = id; saveProfile(); CardUI.close(); showTitles(); } : undefined }; }), () => refreshTitle());
}
function resetProfile(done) { // återställ profilen, med två bekräftelser
  CardUI.choice({ title: 'ÅTERSTÄLL PROFILEN?', subtitle: 'ALLA SJÄLAR, KORT, KLASSER, PRESTATIONER OCH KRÖNIKESIDOR FÖRSVINNER.', cancel: 1, options: [{ label: 'JA, ÅTERSTÄLL', text: '' }, { label: 'AVBRYT', text: '' }] }, i => {
    if (i !== 0) { done(); return; }
    CardUI.choice({ title: 'ÄR DU HELT SÄKER?', subtitle: 'DET GÅR INTE ATT ÅNGRA. EXPORTERA PROFILEN FÖRST OM DU VILL SPARA DEN.', cancel: 1, options: [{ label: 'RADERA ALLT', text: '' }, { label: 'AVBRYT', text: '' }] }, j => {
      if (j === 0) { for (const k of Object.keys(profile)) delete profile[k]; Object.assign(profile, { souls: 0, unlocked: [], runs: 0, wins: 0, bestDepth: 0, bestScore: 0, history: [] }); saveProfile(); for (let n = 0; n < 3; n++) store.del('run' + (n ? '.' + n : '')); document.getElementById('status').textContent = 'PROFILEN ÄR ÅTERSTÄLLD'; }
      done();
    });
  });
}
function openSettingsUI() { const back = state; openUI(() => openSettings(() => { closeUI(back === 'pause' ? 'pause' : 'play'); if (back === 'pause') pauseMenu(); })); } // från pausen: tillbaka till pausmenyn
function abandonRun() { // ge upp rundan från pausen
  openUI(() => CardUI.choice({ title: 'GE UPP RUNDAN?', subtitle: 'DU BEHÅLLER SJÄLARNA', cancel: 1,
    options: [{ label: 'GE UPP', text: 'TILLBAKA TILL STARTSKÄRMEN' }, { label: 'FORTSÄTT SPELA', text: '' }] }, i => {
    if (i === 0) { stopAmbient(); setMusic(false); run.cause = 'GAV UPP'; endRun(false); showTitle(); } else { closeUI('pause'); pauseMenu(); }
  }));
}
// ---------- Inställningar (startskärmen och pausen) ----------
function openSettings(onClose) {
  CardUI.panel('INSTÄLLNINGAR', '', c => {
    const row = (label, input) => { const r = CardUI.el('label', 'cu-row'); r.appendChild(CardUI.el('span', '', label)); r.appendChild(input); c.appendChild(r); return input; };
    const range = (label, key, min, max, step, fmt, after) => { const i = document.createElement('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = settings[key];
      const r = row(label + ' ' + fmt(settings[key]), i); i.oninput = () => { settings[key] = +i.value; r.previousSibling.textContent = label + ' ' + fmt(settings[key]); saveSettings(); if (after) after(); }; };
    const select = (label, key, opts, after) => { const sel = document.createElement('select'); for (const [v, t] of opts) { const o = document.createElement('option'); o.value = v; o.textContent = t; if (String(settings[key]) === String(v)) o.selected = true; sel.appendChild(o); }
      row(label, sel); sel.onchange = () => { const v = sel.value; settings[key] = isNaN(+v) || v === '' ? v : +v; saveSettings(); if (after) after(); }; };
    const check = (label, key, after) => { const i = document.createElement('input'); i.type = 'checkbox'; i.checked = !!settings[key]; row(label, i); i.onchange = () => { settings[key] = i.checked; saveSettings(); if (after) after(); }; };
    select('SPRÅK / LANGUAGE', 'lang', [['en', 'ENGLISH'], ['sv', 'SVENSKA']], () => { saveSettings(); setTimeout(() => location.reload(), 150); }); // språket byts genom att sidan laddas om
    range('KÄNSLIGHET', 'sens', 0.2, 3, 0.1, v => v.toFixed(1));
    check('TITTA UPP/NED MED MUSEN', 'mouseLook', () => { if (!settings.mouseLook) P.look = 0; });
    check('INVERTERA UPP/NED', 'invertY');
    range('SYNFÄLT', 'fov', 60, 100, 2, v => v + '°', applyFov);
    range('VOLYM', 'vol', 0, 1, 0.05, v => Math.round(v * 100) + '%', applyVolume);
    range('LJUSSTYRKA', 'gamma', 0.6, 1.6, 0.05, v => Math.round(v * 100) + '%', () => { if (lvl) buildGrade(); });
    select('SKÄRMSKAK', 'shake', [[0, 'AV'], [0.5, 'LÅG'], [1, 'FULL']]);
    select('SIKTE', 'xstyle', [['kors', 'KORS'], ['punkt', 'PUNKT'], ['cirkel', 'CIRKEL']]);
    select('SIKTESFÄRG', 'xcolor', [['', 'VIT'], ['rgba(120,255,120,0.9)', 'GRÖN'], ['rgba(255,220,80,0.9)', 'GUL'], ['rgba(110,230,255,0.9)', 'CYAN']]);
    select('KARTA', 'map', [[0, 'AV'], [1, 'LITEN I HÖRNET'], [2, 'STOR']], () => { showMap = settings.map; });
    check('VISA FPS', 'fps');
    check('STILMÄTARE', 'styleMeter');
    if (settings.blood === undefined) settings.blood = DEVICE === 'mobil' ? 1 : 2; select('BLOD', 'blood', [[0, 'AV'], [1, 'NORMAL'], [2, 'MYCKET']], v27Sync); // version 27 (BLOOD): AV ger damm i stället för blod
    select('PARTIKLAR', 'particles', [['auto', 'AUTO'], ['low', 'LÅG'], ['normal', 'NORMAL'], ['high', 'HÖG'], ['max', 'MAX']]); // version 27: partikelbudgeten
    glSettings(select, check); // version 28 (WEBGL): RENDERING och BLOOM
    check('MINSKADE EFFEKTER', 'lowfx');
    check('HUVUDEN LOSSNAR', 'heads'); // version 26C
    check('VAPNET GUNGAR', 'bob');
    check('VIBRATION (MOBIL)', 'vibrate');
    check('VÄNSTERHÄNT (MOBIL)', 'lefty', applyTouchLayout);
    range('KNAPPSTORLEK (MOBIL)', 'btnScale', 0.7, 1.4, 0.05, v => Math.round(v * 100) + '%', applyTouchLayout);
    const sec = t => c.appendChild(CardUI.el('div', 'cu-sec', t)), pct = v => Math.round(v * 100) + '%';
    const def = (k, v) => { if (settings[k] === undefined) settings[k] = v; };
    for (const [k, v] of Object.entries({ musicVol: 0.6, sfxVol: 1, ambVol: 0.8, music: true, subtitles: false, backCue: true, autoSwitch: true, autoReload: true, tilt: true, toggleRun: false, doubleTapDash: true, aimAssist: true, autoFire: false, gyro: false, fixedJoy: false, btnOpacity: 0.6, wakeLock: true, noFlash: false, uiScale: 1, smooth: false, autoLowFx: true, enemyBars: true, dmgNumbers: true, objective: true, timer: false, mapRotate: false, mapScale: 3, lowHpGray: true, cb: '', colorLight: true, xsize: 1, gameSpeed: 1, aimAssistK: 1, ghost: true })) def(k, v);
    sec('LJUD');
    check('MUSIK', 'music', () => { applyMixer(); playMusic(); });
    range('MUSIKVOLYM', 'musicVol', 0, 1, 0.05, pct, applyMixer);
    range('EFFEKTER', 'sfxVol', 0, 1, 0.05, pct, applyMixer);
    range('MILJÖLJUD', 'ambVol', 0, 1, 0.05, pct, applyMixer);
    check('UNDERTEXTER FÖR LJUD', 'subtitles');
    check('LJUDSIGNAL VID ANFALL BAKIFRÅN', 'backCue');
    check('RÖSTER (FIENDERNAS UTROP)', 'voices'); // version 25.1
    check('MUSIKEN FÖLJER STILEN', 'styleMusic'); // version 26C
    sec('SPEL');
    check('BYT TILL NYTT VAPEN', 'autoSwitch');
    check('LADDA OM AUTOMATISKT', 'autoReload');
    check('VÄXLA SPRING (I STÄLLET FÖR HÅLL)', 'toggleRun');
    check('DUBBELTRYCK FÖR RUSNING', 'doubleTapDash');
    check('KAMERAN LUTAR', 'tilt');
    check('MÅL-TEXT', 'objective');
    check('SMART FIENDE-AI (SKYDD, TRUPP, ATTACKTURER)', 'smartAI'); // version 24
    check('PARERINGSMARKERING', 'parryTell'); // version 26B (raden lagd av 26C)
    check('TIMER', 'timer');
    check('FIENDERNAS LIVMÄTARE', 'enemyBars');
    check('SKADESIFFROR', 'dmgNumbers');
    check('ROTERANDE MINIKARTA', 'mapRotate');
    range('KARTANS STORLEK', 'mapScale', 2, 4, 1, v => v + 'X');
    sec('SIKTE OCH MOBIL');
    check('SIKTSTÖD (MOBIL/HANDKONTROLL)', 'aimAssist');
    check('SKJUT AUTOMATISKT (MOBIL)', 'autoFire');
    check('GYRO-SIKTE (MOBIL)', 'gyro', () => { if (settings.gyro) enableGyro(); });
    check('FAST JOYSTICK (MOBIL)', 'fixedJoy');
    range('KNAPPARNAS SYNLIGHET', 'btnOpacity', 0.2, 1, 0.05, pct, applyDisplay);
    check('HÅLL SKÄRMEN TÄND', 'wakeLock');
    sec('BILD OCH TILLGÄNGLIGHET');
    select('FÄRGBLINDLÄGE', 'cb', [['', 'AV'], ['protan', 'PROTANOPI'], ['deutan', 'DEUTERANOPI'], ['tritan', 'TRITANOPI']]);
    check('MINSKADE BLIXTAR', 'noFlash');
    check('GRÅ BILD VID LÅG HÄLSA', 'lowHpGray');
    range('TEXTSTORLEK', 'uiScale', 0.8, 1.4, 0.05, pct, applyDisplay);
    check('MJUK UPPSKALNING', 'smooth', applyDisplay);
    check('AUTOMATISKT MINSKADE EFFEKTER VID LÅG FPS', 'autoLowFx');
    check('FÄRGAT LJUS', 'colorLight');
    check('STOR TEXT I HUD', 'bigHud');
    check('KONTURER RUNT FIENDER', 'outline');
    def('stealthHud', true);
    check('LÄS UPP MEDDELANDEN OCH KRÖNIKAN (TALSYNTES)', 'tts');
    check('VISUELLA LJUDSIGNALER (PRICKAR MOT LJUD DU INTE SER)', 'soundCues');
    check('MINSKA RÖRELSE (INGET SKAK, GUNG ELLER BLIXTAR)', 'reduceMotion', applyReduceMotion);
    select('HUD', 'hudPreset', [['', 'STANDARD'], ['min', 'MINIMAL'], ['full', 'FULL']], applyHudPreset);
    check('SMYGMÄTARE (ÖGA OCH ÖRA)', 'stealthHud');
    check('VÄXLA SIKTE MED HÖGERKLICK (I STÄLLET FÖR HÅLL)', 'toggleAim');
    range('SIKTETS STORLEK', 'xsize', 0.6, 2, 0.1, v => Math.round(v * 100) + '%');
    select('HUD-TEMA', 'hudTheme', [['', 'KLASSISK'], ['blue', 'BLÅ'], ['green', 'GRÖN'], ['gold', 'GULD']]);
    select('VAPENFÄRG', 'skin', Object.entries(SKINS).map(([k, v]) => [k, skinOpen(k) ? v.name : v.name + ' (LÅST: ' + (ACH.find(a => a[0] === v.ach) || [, '?'])[1] + ')']), () => { if (!skinOpen(settings.skin)) { settings.skin = ''; saveSettings(); } });
    check('FOKUSLÄGE: DÄMPA MILJÖLJUD I STRID', 'focusMode', applyMixer);
    sec('MOBIL: EN HAND');
    check('ENHANDSLÄGE (ALLA KNAPPAR TILL HÖGER, GÅ-KNAPP)', 'oneHand', applyTouchLayout);
    check('DUBBELTRYCK PÅ BILDEN = HOPPA', 'tapJump');
    check('PAUSA NÄR MOBILEN VRIDS TILL STÅENDE', 'rotatePause');
    check('SPRING AUTOMATISKT (MOBIL)', 'autoRun');
    check('ALLA KNAPPAR (DEN GAMLA PEKLAYOUTEN)', 'allButtons', applyTouchLayout);
    def('autoFs', true); check('HELSKÄRM AUTOMATISKT NÄR RUNDAN BÖRJAR (MOBIL)', 'autoFs');
    const ob =(t, f) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'cu-btn'; b.textContent = t; b.onclick = ev => { ev.stopPropagation(); f(); }; c.appendChild(b); };
    ob('FLYTTA MOBILKNAPPARNA', () => { CardUI.close(); layoutEdit(() => openSettings(onClose)); });
    ob('BYT KNAPPAR PÅ HANDKONTROLLEN', () => { CardUI.close(); openPadMap(() => openSettings(onClose)); });
    sec('HJÄLPLÄGE OCH TILLGÄNGLIGHET');
    select('SPELHASTIGHET', 'gameSpeed', [[1, '100 %'], [0.9, '90 %'], [0.8, '80 %'], [0.7, '70 %']]);
    check('EXTRA HÄLSA (+50)', 'assistHp');
    check('HÖG KONTRAST PÅ FIENDER', 'contrast');
    check('STORA UNDERTEXTER', 'bigSubs');
    range('SIKTSTÖDETS STYRKA', 'aimAssistK', 0, 1.5, 0.1, v => Math.round(v * 100) + '%');
    check('SPÖKET (DIN BÄSTA TID PÅ VÅNINGEN)', 'ghost');
    check('SPARLÄGE: 30 BILDER I SEKUNDEN', 'fps30');
    ob('VISA INTRODUKTIONEN IGEN', () => { profile.tutDone = false; delete TUT.step; saveProfile(); say('INTRODUKTIONEN VISAS I NÄSTA RUNDA', 2); });
    sec('ÖVRIGT');
    const btn = (t, f) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'cu-btn'; b.textContent = t; b.onclick = ev => { ev.stopPropagation(); f(); }; c.appendChild(b); };
    btn('BYT TANGENTER', () => { CardUI.close(); openKeybinds(() => openSettings(onClose)); });
    btn('EXPORTERA PROFIL', exportProfile);
    btn('IMPORTERA PROFIL', importProfile);
    if (state === 'title') btn('ÅTERSTÄLL PROFILEN', () => { CardUI.close(); resetProfile(() => openSettings(onClose)); });
    btn('ÅTERSTÄLL ALLA INSTÄLLNINGAR', () => { for (const k of Object.keys(settings)) delete settings[k]; Object.assign(settings, { sens: 1, vol: 0.8, muted: false, diff: 1, fov: 74, gamma: 1, shake: 1, xstyle: 'kors', xcolor: '', bob: true, vibrate: true, btnScale: 1, map: 1 }); saveSettings(); applyFov(); applyVolume(); applyMixer(); applyDisplay(); applyTouchLayout(); CardUI.close(); openSettings(onClose); });
    btn('HELSKÄRM', () => toggleFullscreen());
    settingsTabs(c);
  }, onClose);
}
let settingsTab = 'BILD';
function settingsTabs(c) { // MENY: inställningarna i flikar (BILD, LJUD, SPEL, KONTROLL, TILLGÄNGLIGHET, ÖVRIGT) i stället för en lång lista; raderna ligger kvar i DOM
  const TAB = { 'LJUD': 'LJUD', 'SPEL': 'SPEL', 'SIKTE OCH MOBIL': 'KONTROLL', 'MOBIL: EN HAND': 'KONTROLL', 'BILD OCH TILLGÄNGLIGHET': 'TILLGÄNGLIGHET', 'HJÄLPLÄGE OCH TILLGÄNGLIGHET': 'TILLGÄNGLIGHET', 'ÖVRIGT': 'ÖVRIGT' };
  const ORDER = ['BILD', 'LJUD', 'SPEL', 'KONTROLL', 'TILLGÄNGLIGHET', 'ÖVRIGT'], kids = [...c.children], groups = {}; let cur = 'BILD';
  for (const k of kids) {
    if (k.classList.contains('cu-sec')) { const n = k.textContent.trim(); cur = TAB[n] || (/MOBIL|KNAPP|KONTROLL|STYR/.test(n) ? 'KONTROLL' : /LJUD/.test(n) ? 'LJUD' : /TILLGÄNG|HJÄLP/.test(n) ? 'TILLGÄNGLIGHET' : 'ÖVRIGT'); }
    let t = cur; if (cur === 'BILD') { const l = k.textContent || ''; if (/^(KÄNSLIGHET|VIBRATION|VÄNSTERHÄNT|KNAPPSTORLEK|TITTA UPP|INVERTERA)/.test(l)) t = 'KONTROLL'; else if (/^VOLYM/.test(l)) t = 'LJUD'; }
    k.dataset.tab = t; (groups[t] = groups[t] || []).push(k);
  }
  const tabs = ORDER.filter(t => groups[t]).concat(Object.keys(groups).filter(t => !ORDER.includes(t)));
  const bar = CardUI.el('div', 'cu-tabs');
  const show = t => { settingsTab = t; for (const k of kids) k.hidden = k.dataset.tab !== t; for (const b of bar.children) b.setAttribute('aria-pressed', String(b.dataset.tab === t)); c.scrollTop = 0; };
  for (const t of tabs) { const b = document.createElement('button'); b.type = 'button'; b.className = 'cu-btn cu-tab'; b.dataset.tab = t; b.textContent = t; b.onclick = ev => { ev.stopPropagation(); show(t); }; bar.appendChild(b); }
  if (c.parentNode) c.parentNode.insertBefore(bar, c);
  show(tabs.includes(settingsTab) ? settingsTab : tabs[0]);
}
function listPager() { // MENY2: långa listor (handboken, nyheterna) ett avsnitt i taget med < RUBRIK > i stället för en textvägg; raderna ligger kvar i DOM
  const ul = document.querySelector('#cardui .cu-panel .cu-list'); if (!ul || ul.dataset.paged) return; ul.dataset.paged = '1';
  const groups = []; for (const li of [...ul.children]) { const h = li.classList.contains('head'); if (h || !groups.length) groups.push({ head: h ? li : null, items: [] }); if (!h) groups[groups.length - 1].items.push(li); }
  if (groups.length < 2 || !ul.parentNode || !ul.parentNode.parentNode) return;
  const bar = CardUI.el('div', 'cu-pager'), pv = CardUI.el('button', 'cu-btn cu-pv'), nm = CardUI.el('span', 'cu-pn'), nx = CardUI.el('button', 'cu-btn cu-nx'); pv.type = nx.type = 'button'; pv.textContent = '<'; nx.textContent = '>'; pv.setAttribute('aria-label', 'FÖRRA'); nx.setAttribute('aria-label', 'NÄSTA');
  let i = 0; const show = j => { i = (j + groups.length) % groups.length; groups.forEach((g, k) => { if (g.head) g.head.hidden = true; for (const li of g.items) li.hidden = k !== i; });
    const h = groups[i].head && groups[i].head.querySelector('.cu-ll'); nm.textContent = (h ? h.textContent : '') + ' · ' + (i + 1) + '/' + groups.length; nm.style.color = h ? h.style.color : ''; ul.parentNode.scrollTop = 0; };
  pv.onclick = e => { e.stopPropagation(); show(i - 1); }; nx.onclick = e => { e.stopPropagation(); show(i + 1); };
  bar.append(pv, nm, nx); ul.parentNode.parentNode.insertBefore(bar, ul.parentNode); show(0);
  if (!isTouch()) try { nx.focus({ preventScroll: true }); } catch (e) { /* ingen fokus */ } // tangentbord: Enter = nästa avsnitt, Tab växlar mellan < > och STÄNG (CardUI sväljer pilarna)
}
function exportProfile() { // profilen som en JSON-fil
  try { const b = new Blob([JSON.stringify({ profile, settings }, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'krypta-profil.json'; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { /* hämtning stöds inte */ }
}
function importProfile() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
  inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return; f.text().then(t => { try { const d = JSON.parse(t); if (!d.profile || typeof d.profile.souls !== 'number') throw new Error('fel'); Object.assign(profile, d.profile); saveProfile(); if (d.settings) { Object.assign(settings, d.settings); saveSettings(); } CardUI.close(); refreshTitle(); document.getElementById('status').textContent = 'PROFILEN ÄR IMPORTERAD'; } catch (e) { document.getElementById('status').textContent = 'FILEN GICK INTE ATT LÄSA'; } }); };
  inp.click();
}
