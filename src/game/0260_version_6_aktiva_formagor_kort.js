// ---------- Version 6: aktiva förmågor (kort med active, tangent T) ----------
const ABILITIES = {
  blink: { name: 'BLINKEN', col: '#a0e0ff' }, slowmo: { name: 'TIDSBUBBLAN', col: '#a0a0ff' }, bubble: { name: 'SKÖLDBUBBLAN', col: '#80c0ff' },
  summon: { name: 'VÅLNADSKALLET', col: '#a0ffc0' }, quake: { name: 'JORDSKALVET', col: '#d0a060' },
};
let abCd = 0, slowBubble = 0;
const activeCard = () => window.Cards && Cards.activeOf && run ? Cards.activeOf(run.owned) : null;
function useAbility() {
  if (state !== 'play') return;
  const c = activeCard();
  if (!c) { if ((P.abMsgT || 0) < tmr) { P.abMsgT = tmr + 2; say('DU HAR INGEN FÖRMÅGA – SÖK ETT KORT MED "AKTIV"', 1.5); } return; }
  if (abCd > 0) { play('click', 0.4, 0.7); return; }
  abCd = (c.cd || 15) * Math.max(0.1, 1 - mod('activeCd'));
  const id = c.active; play('ab_' + id, 0.8); stat('abilities');
  if (id === 'blink') { const d = Math.min(5, cast(P.x, P.y, Math.cos(P.a), Math.sin(P.a)).dist - 0.5); spawnPuff(P.x, P.y, 6); let k = d; while (k > 0 && !freeSpot(P.x + Math.cos(P.a) * k, P.y + Math.sin(P.a) * k, 0.25)) k -= 0.25; if (k > 0) { P.x += Math.cos(P.a) * k; P.y += Math.sin(P.a) * k; } P.iframe = Math.max(P.iframe, 0.3); spawnPuff(P.x, P.y, 6); P.flash = 0.1; }
  else if (id === 'slowmo') { slowBubble = 5; say('TIDEN SAKTAR NED', 1.2); }
  else if (id === 'bubble') { P.bubbleT = 4; say('SKÖLDBUBBLAN', 1); }
  else if (id === 'summon') { for (let i = 0; i < 2; i++) { const a = P.a + (i ? 1.2 : -1.2), x = P.x + Math.cos(a), y = P.y + Math.sin(a); spawnAlly(enemyFrames['Ý'] && enemyFrames['Ý'] !== enemyFrames.S ? 'Ý' : 'S', solid(x, y) ? P.x : x, solid(x, y) ? P.y : y, 20, { tint: [150, 220, 255], dmg: 6 + run.depth }); } say('VÅLNADERNA SVARAR', 1.5); }
  else if (id === 'quake') { P.shake = 2.5; for (const e of ents) { if (e.dead || e.dormant) continue; const d = Math.hypot(e.x - P.x, e.y - P.y); if (d > 5) continue; hurtEnemy(e, 6 * (1 + mod('dmg')), e.x, e.y, { noProc: true }); if (!e.boss) { e.stun = Math.max(e.stun || 0, 2); for (let i = 0; i < 4; i++) tryMove(e, (e.x - P.x) / (d || 1) * 0.15, (e.y - P.y) / (d || 1) * 0.15, 0.28); } } for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; particles.push({ x: P.x, y: P.y, z: 0.05, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, vz: 0.5, life: 0.5, maxLife: 0.5, img: fx.parts.dust ? fx.parts.dust[0] : fx.hit[1], size: 0.12, fade: true, tint: [170, 140, 100] }); } }
}
function updateAbility(dt) {
  const c = activeCard();
  if (c && !profile.abilityTip) { profile.abilityTip = 1; saveProfile(); say(`FÖRMÅGA: ${c.name} – TRYCK ${isTouch() ? 'PÅ STJÄRNKNAPPEN' : 'T'}`, 4); play('tutorial', 0.6); }
  if (abCd > 0) { abCd -= dt; if (abCd <= 0 && c) { abCd = 0; play('ability_ready', 0.5); } }
  if (slowBubble > 0) slowBubble -= dt;
  if (P.bubbleT > 0) { P.bubbleT -= dt; for (const p of projectiles) if (!p.friendly && !p.dead && Math.hypot(p.x - P.x, p.y - P.y) < 1.4) { p.dead = true; sparks(p.x, p.y, 0.5, 3); play('shield_block', 0.4, 1.3); } }
  const b = abBtn(); if (b) b.classList.toggle('empty', !c || abCd > 0);
}
let abBtnEl = null; const abBtn = () => abBtnEl || (abBtnEl = document.querySelector('#touch .abb'));
function abilityKill() { if (abCd > 0) abCd = Math.max(0, abCd - (P.combo >= 3 ? 1 : 0.4)); } // dödanden laddar förmågan
function drawAbilityHud(g) {
  const c = activeCard(); if (!c) return;
  const x = HL ? HL.ab.x : W - 22, y = HL ? HL.ab.y : VH - 22, im = hudImg['ab_' + c.active], col = (ABILITIES[c.active] || {}).col || '#e8d9b0';
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(x - 2, y - 2, 20, 20);
  if (im) g.drawImage(im, x, y, 16, 16); else { g.fillStyle = col; g.fillRect(x + 4, y + 4, 8, 8); }
  if (abCd > 0) { const k = abCd / ((c.cd || 15) * Math.max(0.1, 1 - mod('activeCd'))); g.fillStyle = 'rgba(0,0,0,0.65)'; g.fillRect(x, y, 16, Math.round(16 * k)); txt(String(Math.ceil(abCd)), x + 8 - textW(String(Math.ceil(abCd))) / 2, y + 4, '#ffffff', 1, true, 0.9); }
  else if (tmr % 1 < 0.5) { g.strokeStyle = col; g.strokeRect(x - 1.5, y - 1.5, 19, 19); }
  if (!isTouch()) txt(keyName((settings.binds || {}).KeyT || 'KeyT'), x - 10, y + 5, '#c9a87a', 1, true, 0.7);
  if (slowBubble > 0) { g.fillStyle = 'rgba(120,120,255,0.1)'; g.fillRect(0, 0, W, VH); }
  if (P.bubbleT > 0) { g.strokeStyle = `rgba(130,190,255,${0.3 + 0.2 * Math.sin(tmr * 8)})`; g.lineWidth = 2; g.beginPath(); g.arc(W / 2, HORIZON, 70, 0, TAU); g.stroke(); g.lineWidth = 1; }
}
function drawRuneHud(g) { // runorna på vapnet syns i listen
  return; // runorna ritas nu som små ikoner i ammo-hörnet (drawAmmoCorner)
  const rs = curRunes(); let x = HUD_CELLS[4] - 10; // eslint-disable-line no-unreachable
  for (const r of rs) { const im = hudImg['rune_' + r]; if (im) g.drawImage(im, x, VH + 2, 7, 7); else { g.fillStyle = RUNES[r].col; g.fillRect(x + 1, VH + 3, 5, 5); } x -= 8; }
}
// ---------- Version 6: överlevnadsläget ----------
function beginSurvival() {
  document.getElementById('title').hidden = true; canvas.focus(); ensureAudio(); practice = null;
  newRun(RNG.randomSeed(), false); run.survival = { wave: 0, t: 3, alive: [] }; run.cmode = '';
  for (const id of ['shotgun', 'rifle']) { const i = weaponIndex(id); P.has[i] = true; P.mags[i] = effMag(i); }
  P.ammo = Object.assign(NOAMMO(), { p9: 120, r556: 120, shells: 30 });
  const L = Gen.boss(RNG.hash(run.seed + ':arena'), { arena: RNG(run.seed).pick(Gen.ARENAS || ['hall']) });
  L.map = L.map.map(r => r.replace(/[BxG]/g, m => m === 'G' ? '1' : '.')); L.name = 'ÖVERLEVNAD'; L.survival = true;
  run.depth = 1; startLevel(L); levelBanner = 3; say('ÖVERLEV SÅ MÅNGA VÅGOR DU KAN', 3); play('survival_wave', 0.8);
  lockPointer();
}
function updateSurvival(dt) {
  const sv = run.survival; if (!sv) return;
  sv.alive = sv.alive.filter(e => !e.dead);
  if (sv.alive.length) return;
  if (sv.t === 3 && sv.wave > 0 && !sv.rewarded) { sv.rewarded = true; dropItem(Math.random() < 0.5 ? 'health' : 'ammo', P.x + Math.cos(P.a), P.y + Math.sin(P.a)); if (sv.wave % 5 === 0) items.push({ type: 'cardpick', x: P.x + Math.cos(P.a) * 1.2, y: P.y + Math.sin(P.a) * 1.2, taken: false, drop: true, luck: 0.6 + sv.wave * 0.05, title: `VÅG ${sv.wave} KLARAD` }); say(`VÅG ${sv.wave} KLARAD`, 2); }
  sv.t -= dt; if (sv.t > 0) return;
  sv.wave++; sv.t = 3; sv.rewarded = false; run.depth = 1 + Math.floor(sv.wave / 3); play('survival_wave', 0.8); P.shake = 0.6;
  const pool = sv.wave < 3 ? ['S', 'K', 'L', 'I'] : sv.wave < 6 ? ['S', 'K', 'V', 'I', 'L', 'W', 'R', 'U', 'Å'] : ['V', 'W', 'R', 'N', 'O', 'Y', '!', '@', 'Ä', 'É', 'Æ', 'Ð', 'Ñ'];
  const n = Math.min(18, 3 + Math.round(sv.wave * 1.5));
  for (let i = 0; i < n; i++) { const s = freeSpotFar(5, 12) || freeSpotFar(3, 8); if (!s) continue; const t = pool[(Math.random() * pool.length) | 0]; const e = (sv.wave % 3 === 0 && i === 0) ? makeElite(RNG(Date.now() + i), s[0], s[1]) : makeEnemy(t, s[0], s[1]); e.alert = true; e.minion = true; ents.push(e); totalEnemies++; sv.alive.push(e); spawnPuff(s[0], s[1], 5); }
  say(`VÅG ${sv.wave}`, 2);
}
// ---------- Version 6: spöket – din bästa tid på samma våning ----------
let ghostRec = [], ghostPlay = null, ghostAcc = 0;
const ghostKey = () => run ? seedText(run.seed) + ':' + run.depth : '';
function ghostStart() { ghostRec = []; ghostAcc = 0; ghostPlay = settings.ghost !== false && run && !run.survival && !lvl.secret && !run.practice ? ((profile.ghosts || {})[ghostKey()] || null) : null; if (ghostPlay) say('SPÖKET: DIN BÄSTA TID ' + fmtTime(ghostPlay.t), 2.5); }
function ghostTick(dt) { ghostAcc += dt; if (ghostAcc >= 0.25 && ghostRec.length < 1600) { ghostAcc = 0; ghostRec.push([(P.x * 10) | 0, (P.y * 10) | 0]); } }
function ghostSave() {
  if (!run || run.survival || lvl.secret || run.practice) return;
  profile.ghosts = profile.ghosts || {}; const k = ghostKey(), old = profile.ghosts[k];
  if (!old || levelTime < old.t) { delete profile.ghosts[k]; profile.ghosts[k] = { t: Math.round(levelTime), p: ghostRec }; const keys = Object.keys(profile.ghosts); while (keys.length > 12) delete profile.ghosts[keys.shift()]; if (old) { say('NYTT REKORD PÅ VÅNINGEN – SPÖKET SLAGET!', 2.5); stat('ghostBeaten'); } }
}
function ghostPos() { if (!ghostPlay) return null; const f = levelTime / 0.25, i = Math.floor(f), a = ghostPlay.p[i], b = ghostPlay.p[i + 1]; if (!a) return null; if (!b) return { x: a[0] / 10, y: a[1] / 10 }; const k = f - i; return { x: (a[0] + (b[0] - a[0]) * k) / 10, y: (a[1] + (b[1] - a[1]) * k) / 10 }; }
// ---------- Version 6: introduktion för nya spelare ----------
const TUT = [
  { text: () => isTouch() ? 'VÄNSTER TUMME: GÅ' : 'GÅ MED W A S D', done: () => Math.hypot(P.x - TUT.x0, P.y - TUT.y0) > 2 },
  { text: () => isTouch() ? 'AVFYRA-KNAPPEN: SKJUT' : 'VÄNSTERKLICK: SKJUT', done: () => (run.shots || 0) > 0 }, // korta rader (≤ 24 tecken)
  { text: () => isTouch() ? 'HOPPKNAPPEN: HOPPA' : 'HOPPA MED SPACE', done: () => P.jz > 0.1 },
  { text: () => isTouch() ? 'HANDEN: ÖPPNA OCH ANVÄND' : 'E: ÖPPNA OCH ANVÄND', done: () => TUT.used },
  { text: () => 'DÖDA ALLA FÖR PORTALEN', done: () => portals.length > 0 || kills >= 3 },
  { text: () => 'LYCKA TILL!', done: () => TUT.t > 4 },
];
function tutTick(dt) {
  if (!run || profile.tutDone || run.practice || run.survival || state !== 'play') return;
  if (TUT.step === undefined) { TUT.step = 0; TUT.x0 = P.x; TUT.y0 = P.y; TUT.t = 0; }
  TUT.t += dt; const s = TUT[TUT.step];
  if (s && s.done()) { TUT.step++; TUT.t = 0; play('tutorial', 0.6); if (TUT.step >= TUT.length) { profile.tutDone = true; saveProfile(); } }
}
function drawTutorial(g) {
  if (run && state === 'play' && isTouch() && profile.tutDone && !profile.tipAmmo && levelBanner <= 0 && !subs.length && P.has.filter(Boolean).length >= 2) { // pekskärm, en gång per profil: vapenbyte = tryck på ammo-hörnet
    const k = drawTutorial.ammoT = (drawTutorial.ammoT || 0) + 1 / 60, t = 'TRYCK PÅ AMMO FÖR ATT BYTA VAPEN';
    txt(t, Math.round((W - textW(t)) / 2), VH - 50, '#ffe9a8', 1, true, clamp(Math.min(k * 3, (6 - k) * 2), 0, 1));
    if (HL && tmr % 0.8 < 0.5) { g.strokeStyle = '#ffd24a'; g.strokeRect(HL.ammo.x - 1.5, HL.ammo.y - 1.5, HL.ammo.w + 3, HL.ammo.h + 3); } // ammo-hörnet blinkar
    if (k < 0.02) drawTutorial.w0 = P.weapon; if (k > 6 || P.weapon !== drawTutorial.w0) { profile.tipAmmo = true; saveProfile(); } // klart efter 6 s eller när man har bytt vapen
    return;
  }
  if (!run || profile.tutDone || TUT.step === undefined || state !== 'play' || levelBanner > 0) return;
  if (subs.length) return; // en rad i taget nere i mitten
  const s = TUT[TUT.step]; if (!s) return; const t = s.text(), w = textW(t); // en kort, liten rad nere i mitten
  txt(t, Math.round((W - w) / 2), VH - 50, '#ffe9a8', 1, true, 0.6 + 0.4 * Math.abs(Math.sin(tmr * 3)));
  g.fillStyle = '#ffd24a80'; for (let i = 0; i < TUT.length; i++) g.fillRect(Math.round(W / 2 - TUT.length * 3 + i * 6), VH - 40 + 1, i <= TUT.step ? 4 : 2, 1); // stegen som små streck
}
// ---------- Version 6: dagliga uppdrag (tre om dagen, själar som belöning) ----------
const DQ = [
  { id: 'kills', text: n => `DÖDA ${n} FIENDER`, n: 60, c: p => Object.values(p.bestiary || {}).reduce((a, b) => a + b, 0) },
  { id: 'potions', text: n => `DRICK ${n} DRYCKER`, n: 3, c: p => p.potions_n || 0 },
  { id: 'secrets', text: n => `HITTA ${n} HEMLIGHETER`, n: 2, c: p => p.secrets || 0 },
  { id: 'headshots', text: n => `GÖR ${n} HUVUDTRÄFFAR`, n: 15, c: p => p.headshots || 0 },
  { id: 'quests', text: n => `KLARA ${n} SIDOUPPDRAG`, n: 2, c: p => p.quests || 0 },
  { id: 'floors', text: n => `KLARA ${n} VÅNINGAR`, n: 4, c: p => p.floors || 0 },
  { id: 'runes', text: n => `FÄST ${n} RUNOR`, n: 1, c: p => p.runesSocketed || 0 },
  { id: 'abilities', text: n => `ANVÄND EN FÖRMÅGA ${n} GÅNGER`, n: 3, c: p => p.abilities || 0 },
  { id: 'stealth', text: n => `DÖDA ${n} FIENDER OSEDD`, n: 5, c: p => p.stealthKills || 0 },
  { id: 'pages', text: n => `HITTA ${n} KRÖNIKESIDA`, n: 1, c: p => p.pagesFound || 0 },
  { id: 'sarco', text: n => `ÖPPNA ${n} SARKOFAGER`, n: 2, c: p => p.sarcophagi || 0 },
  { id: 'gamble', text: n => `SPELA ${n} GÅNGER HOS SPELAREN`, n: 2, c: p => p.gambles || 0 },
  { id: 'levels', text: n => `GÅ UPP ${n} NIVÅER`, n: 4, c: p => p.levelUps || 0 },
  { id: 'tomes', text: n => `LÄS ${n} KUNSKAPSBÖCKER`, n: 2, c: p => p.tomes || 0 },
  { id: 'mastery', text: n => `HÖJ VAPENVANAN ${n} GÅNGER`, n: 3, c: p => p.masteryUps || 0 },
];
function dailyQuests() {
  const day = today();
  if (!profile.dq || profile.dq.day !== day) { const r = RNG(RNG.hash('dq' + day)), pick = r.shuffle(DQ.slice()).slice(0, 3); profile.dq = { day, list: pick.map(q => ({ id: q.id, n: q.n, base: q.c(profile), done: false })) }; saveProfile(); }
  return profile.dq.list;
}
function dqCheck() {
  if (!profile.dq) return;
  for (const q of profile.dq.list) { if (q.done) continue; const d = DQ.find(x => x.id === q.id); if (d && d.c(profile) - q.base >= q.n) { q.done = true; profile.souls += 10; saveProfile(); if (state !== 'title') { say('DAGENS UPPDRAG KLART: ' + d.text(q.n) + ' (+10 SJÄLAR)', 3); play('quest_done', 0.7); } } }
}
const dqText = () => dailyQuests().map(q => { const d = DQ.find(x => x.id === q.id); return (q.done ? '✓ ' : '') + d.text(q.n) + (q.done ? '' : ` (${Math.min(q.n, d.c(profile) - q.base)}/${q.n})`); }).join(' · ');
// ---------- Version 6: statistikmenyn ----------
function showStats() {
  const p = profile, fmtT = t => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`, rows = [];
  rows.push({ label: 'DAGENS UPPDRAG', head: true, color: '#9fd0ff' }, ...dailyQuests().map(q => { const d = DQ.find(x => x.id === q.id); return { label: d.text(q.n), text: q.done ? 'KLART (+10 SJÄLAR)' : `${Math.min(q.n, d.c(p) - q.base)} AV ${q.n}`, color: q.done ? '#9fe0a0' : '#e8d9b0' }; }));
  rows.push({ label: 'ÖVERLEVNAD', head: true, color: '#ffd24a' }, { label: 'BÄSTA VÅG', text: String(p.survivalBest || 0) }, ...(p.survivalTop || []).slice(0, 5).map((s, i) => ({ label: `${i + 1}. VÅG ${s.wave}`, text: s.d })));
  rows.push({ label: 'BOSSAR', head: true, color: '#ffd24a' }, ...BOSS_IDS.map(id => ({ label: BOSSES[id].name, text: `BESEGRAD ${(p.bossWins || {})[id] || 0} GÅNGER · BÄSTA TID ${(p.bossTimes || {})[id] ? fmtT(p.bossTimes[id]) : '–'}` })));
  if (p.rushBest) rows.push({ label: 'BOSSRUSH', text: 'BÄSTA TID ' + fmtT(p.rushBest) });
  rows.push({ label: 'REKORD PER LÄGE', head: true, color: '#ffd24a' }, { label: 'LABYRINTEN', text: p.mazeBest ? 'BÄSTA TID ' + fmtT(p.mazeBest) + ` · ${p.mazesWon || 0} GÅNGER UTE` : '–' }, { label: 'AVGRUNDEN', text: p.abyssBest ? `DJUPAST ${p.abyssBest} · ${p.abyssRuns || 0} RUNDOR` : '–' }, ...(p.abyssDailyTop || []).slice(0, 5).map((x, i) => ({ label: `DAGENS AVGRUND ${i + 1}.`, text: `${x.d} · DJUP ${x.depth} · NIVÅ ${x.lvl}` })), { label: 'HÖGSTA NIVÅ', text: String(p.bestLevel || 1) }, { label: 'BOSSJAKTEN', text: p.huntBest ? 'BÄSTA TID ' + fmtT(p.huntBest) : '–' },
    ...Object.entries(p.cmodeBest || {}).map(([k, v]) => ({ label: cmodeNames(k) || k, text: `VÅNING ${v}${(p.cmodeWins || {})[k] ? ' · VUNNEN' : ''}` })));
  rows.push({ label: 'SMYG, LAMPA OCH EKONOMI', head: true, color: '#a0a0ff' }, { label: 'OSEDDA DÖDANDEN', text: `${p.stealthKills || 0} (BÄSTA RUNDA ${p.bestStealth || 0})` }, { label: 'LAMPAN TÄND', text: `${p.lampToggles || 0} GÅNGER` },
    { label: 'HOS SPELAREN', text: `${p.gambles || 0} SPEL · ${p.gambleWins || 0} VINSTER` }, { label: 'BANKEN', text: `${p.bankDeposits || 0} INSÄTTNINGAR` }, { label: 'KRÖNIKAN', text: `${pagesFound().length} AV ${CHRONICLE.length} SIDOR` },
    { label: 'KÖPMANNEN', text: `${p.haggles || 0} PRUTNINGAR · ${p.steals || 0} STÖLDER · ${p.cardsSold || 0} SÅLDA KORT` }, { label: 'SARKOFAGER', text: String(p.sarcophagi || 0) });
  rows.push({ label: 'BIOMER', head: true, color: '#ffd24a' }, ...BIOME_IDS.map(b => { const wk = Object.entries((p.wkillsBiome || {})[b] || {}).sort((x, y) => y[1] - x[1])[0]; return { label: BIOME_NAME[b], text: `${(p.biomeFloors || {})[b] || 0} VÅNINGAR${wk ? ' · FAVORITVAPEN ' + ((WEAPONS[weaponIndex(wk[0])] || {}).name || wk[0]) : ''}` }; }));
  rows.push({ label: 'VANLIGASTE DÖDSORSAKER', head: true, color: '#ff7060' }, ...Object.entries(p.deathsBy || {}).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => ({ label: k, text: `${v} GÅNG${v > 1 ? 'ER' : ''}` })));
  rows.push({ label: 'TOTALT', head: true, color: '#ffd24a' }, { label: 'TOTAL SKADA', text: String(p.totalDmg || 0) }, { label: 'HUVUDTRÄFFAR', text: String(p.headshots || 0) }, { label: 'RUNOR FÄSTA', text: String(p.runesSocketed || 0) }, { label: 'SIDOUPPDRAG', text: String(p.quests || 0) }, { label: 'HEMLIGA VÅNINGAR', text: String(p.secretFloors || 0) }, { label: 'MÅLTIDER', text: String(p.meals || 0) });
  CardUI.list('STATISTIK', 'DITT KRYPTA I SIFFROR', rows, () => refreshTitle());
}
// ---------- Version 6: svagheter i bestiariet ----------
const WEAK = { 'ɩ': 'HÅLL AVSTÅND', 'ɪ': 'SKJUT DEN I ÅNGAN', 'ɫ': 'ANFALL FRÅN SIDAN', 'ɬ': 'DÖDA DEN PÅ AVSTÅND', 'ɵ': 'RÖR DIG HELA TIDEN', 'ɶ': 'SKJUT DEN I LUFTEN', 'ɷ': 'HOPPA ÖVER CHOCKVÅGEN', 'ɸ': 'SPRÄNG ELLER BRÄNN DEN', 'ʄ': 'GÅ NÄRA', 'ʅ': 'KLIV ÅT SIDAN', 'ʆ': 'HAGEL', 'ʇ': 'SIKTA LÅGT', 'ʐ': 'BRYT FORMATIONEN', 'ʑ': 'SPRING I SIDLED', 'ʒ': 'KLIV UR VÄGEN', 'ʓ': 'SKJUT NÄR DE DYKER', 'ɕ': 'DÖDA DEN INNAN DEN VISSLAR', 'ɖ': 'HÅLL AVSTÅND', 'ɗ': 'GÅ NÄRA', 'ɘ': 'HAGEL', 'ə': 'GÅ NÄRA', 'ɚ': 'HÅLL DIG FRÅN KANTEN', 'ɛ': 'ANFALL FRÅN SIDAN', 'ɜ': 'HAGEL','ȼ': 'HÅLL DIG BORTA FRÅN SLAMMET', 'Ƚ': 'SPRING UR RINGEN', 'Ⱦ': 'DÖDA DEN SNABBT', 'ȿ': 'SKJUT DEN ELLER HOPPA', 'ɀ': 'HÅLL AVSTÅND', 'Ɂ': 'HAGEL ELLER NÄRSTRID', 'ɂ': 'VÄNTA UT STORMEN', 'Ƀ': 'HÅLL HÄLSAN UPPE', 'ȡ': 'SPRING UR RINGEN', 'Ȣ': 'HÅLL DEN BORTA FRÅN ELDEN', 'ȣ': 'SE EFTER JORDEN', 'Ȥ': 'SKJUT PÅ AVSTÅND', 'ȥ': 'GÅ NÄRA', 'Ȧ': 'RÖR DIG HELA TIDEN', 'ȧ': 'SIDSTEG NÄR DEN DYKER', 'Ȩ': 'GÅ UR STRÅLEN', 'Ƿ': 'SKJUT BALLONGERNA', 'Ǹ': 'SE UPP FÖR STUDSARNA', 'ǹ': 'SKJUT BENEN PÅ NÄRA HÅLL', 'Ǻ': 'GÅ IN MELLAN KNIVARNA', 'ǻ': 'SIDSTEG NÄR DET TAR SATS', 'Ǽ': 'SKJUT DEN MEDAN DEN LIGGER', 'Ȉ': 'ANFALL FRÅN SIDAN', 'ȉ': 'LYSSNA EFTER PILEN', 'Ȋ': 'DÖDA DEN FÖR AMMON', 'ȋ': 'RYGGEN MOT VÄGGEN', 'Ȍ': 'HAGEL OCH ELD', 'ȍ': 'GÅ UR STRÅLEN', 'Ǖ': 'VÄNTA UT DIMMAN', 'ǖ': 'SPRING UR RINGEN', 'Ǘ': 'HÅLL AVSTÅND', 'ǘ': 'DÖDA DEN FÖR GULDET', 'Ǚ': 'SPRING UR RINGEN', 'ǚ': 'HAGEL OCH ELD', 'ǣ': 'SKJUT BÅDA HALVORNA', 'Ǥ': 'ELD', 'ǥ': 'SPRING UR RINGEN', 'Ǧ': 'ELD OCH SPRÄNGMEDEL', 'ǧ': 'SKJUT PÅ AVSTÅND', 'Ǩ': 'LÄR DIG RYTMEN', 'ƫ': 'HÅLL ÖGONEN PÅ DEN', 'Ƭ': 'ELD', 'ƭ': 'HÅLL AVSTÅND', 'Ʈ': 'DÖDA DEN SNABBT', 'Ư': 'SIKTA NOGA', 'ư': 'HÅLL AVSTÅND NÄR DEN DÖR', 'Ƒ': 'DÖDA HONOM FÖRST', 'ƒ': 'DÖDA DEN SNABBT', 'Ɯ': 'SKJUT DEN FÖRST', 'Ƙ': 'HAGEL OCH ELD', 'ƙ': 'SIDSTEG NÄR DEN TAR SATS', 'ƚ': 'HÅLL DIG I RÖRELSE', 'Ƅ': 'LYSSNA EFTER DEN', 'ƅ': 'SKJUT NÄR DEN ÄR UPPE', 'Ɔ': 'DÖDA PRÄSTEN FÖRST', 'Ƈ': 'HOPPA ÖVER NÄTET', 'ƈ': 'HÅLL DIG FRÅN DJUPET', 'Ɖ': 'VÄNTA TILLS DEN FÄSTER SIG', 'Ų': 'SPRÄNGMEDEL', 'ų': 'HÅLL AVSTÅND', 'Ŵ': 'DÖDA DEN FÖRST', 'Ž': 'KYLA OCH VATTEN', 'ž': 'SKJUT PÅ AVSTÅND', 'ſ': 'SKJUT PÅ AVSTÅND', 'ŗ': 'SKJUT PÅ AVSTÅND', 'Ř': 'LOCKA UT DEN UR SPORERNA', 'ř': 'DÖDA DEN FÖRST', 'Ś': 'ANFALL BAKIFRÅN', 'ś': 'HITTA DEN ÄKTA', 'Ŝ': 'HÅLL AVSTÅND', 'Ō': 'HÅLL DIG BAKOM HÖRN', 'ō': 'HOPPA NÄR DEN KOMMER UPP', 'Ŏ': 'DÖDA HONOM FÖRST', 'ŏ': 'RÖR DIG HELA TIDEN', 'Ő': 'GÅ NÄRA', 'ő': 'HOPPA NÄR DEN LANDAR', 'ĳ': 'SLÅ IGEN MEDAN DEN LINDAS UPP', 'Ĵ': 'SÅGBLAD OCH SPRÄNGMEDEL', 'ĵ': 'RÖR DIG UR BUBBLORNA', 'Ķ': 'SIDSTEG NÄR DEN DYKER', 'ķ': 'FLYTTA DIG FRÅN GLÖDEN', 'ĸ': 'VINDBÖSSAN – KNUFFA DEN I TOMRUMMET', 'Ë': 'HAMMARE OCH SPRÄNGMEDEL', 'Í': 'SNABBA VAPEN – DEN HOPPAR', 'Ï': 'HÅLL AVSTÅND FRÅN HAKEN', 'Ó': 'GÅ UR VATTNET', 'Ú': 'EN TRÄFF BRYTER SÅNGEN', 'Û': 'BAKIFRÅN ELLER SPRÄNGMEDEL', 'Ā': 'LAMPAN AVSLÖJAR DEN', 'Ă': 'SKJUT INNAN HON TELEPORTERAR', S: 'HAGEL KROSSAR BEN', K: 'HÅLL AVSTÅND OCH SIDLEDES', V: 'BACKA OCH SKJUT', I: 'SPIKAR OCH HAGEL', L: 'ELD', N: 'DÖDA FÖRST', O: 'DÖDA FÖRST', R: 'LYKTAN AVSLÖJAR DEN', W: 'LÅT DEN KROCKA', U: 'ELD BRÄNNER NÄTEN', X: 'HAGEL', Y: 'TRÄFFA I SPRÅNGET', '!': 'SKJUT PÅ AVSTÅND', '@': 'ANFALL BAKIFRÅN', '^': 'ELD', '+': 'EXPLOSIONER', Q: 'SKJUT KISTOR SOM RÖR SIG',
  'Å': 'BRÄNN LIKEN', 'Ä': 'DÖDA FÖRST', 'Ö': 'EXPLOSIONER OCH YXA', 'É': 'SAMLA DEM I EN DÖRR', 'Ü': 'HÅLL AVSTÅND', 'Ñ': 'DÖDA FÖRST – HAN VÄCKER DE DÖDA', 'Æ': 'IS OCH BLIXT', 'Þ': 'FLYTTA DIG NÄR MARKEN GLÖDER', 'Ð': 'ANFALL BAKIFRÅN', 'Ý': 'BÅGE PÅ AVSTÅND' };
// ---------- Version 6: fotoläget har filter ----------
const PHOTO_FILTERS = ['', 'svartvit', 'sepia', 'nattseende'];
const titleFx = [];
function drawTitleBg(dt) { // glöd som stiger och dimma som rör sig bakom startskärmen
  if (window.__game && !window.__game.meny) window.__game.meny = MENY_API; // MENY:s krokar (t106)
  const live = titleLive(dt); document.getElementById('title').classList.toggle('livebg', live); // MENY: kameraflykt genom en riktig bana
  if (!live || TL.fade < 1) { if (live) { ctx.save(); ctx.globalAlpha = 1 - TL.fade; } ctx.fillStyle = '#0b0806'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 3; i++) { const x = (Math.sin(tmr * 0.05 + i * 2.1) * 0.5 + 0.5) * W, gr = ctx.createRadialGradient(x, H * 0.7, 4, x, H * 0.7, 120); gr.addColorStop(0, i === 1 ? 'rgba(120,40,20,0.35)' : 'rgba(60,30,20,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); }
    if (live) ctx.restore(); }
  tmr += dt; if (titleFx.length < 60 && Math.random() < dt * 30) titleFx.push({ x: Math.random() * W, y: H + 2, v: 8 + Math.random() * 20, s: Math.random() * 6, a: 0.4 + Math.random() * 0.6 });
  for (const p of titleFx) { p.y -= p.v * dt; p.x += Math.sin(tmr * 1.3 + p.s) * dt * 6; ctx.fillStyle = `rgba(255,${140 + (p.s * 15 | 0)},60,${(p.a * Math.min(1, p.y / H * 2)).toFixed(2)})`; ctx.fillRect(p.x | 0, p.y | 0, 1, 1); }
  for (let i = titleFx.length - 1; i >= 0; i--) if (titleFx[i].y < -2) titleFx.splice(i, 1);
}
// ---------- MENY: levande startskärm – en långsam kameraflykt genom en genererad bana bakom menyn ----------
// Helt fristående: egen karta, egen strålgång i halv upplösning (160×100) och egen buffert; rör aldrig map/lvl/P. Av med lowfx/reduceMotion
// eller om den egna ritningen blir för dyr (TL.off). Spelets läge förblir 'title'.
const TL = { lv: null, grid: null, w: 0, h: 0, wt: null, fi: null, fl: null, ct: null, lit: null, cv: null, g: null, img: null, buf: null, path: null, s: 0, x: 0, y: 0, a: 0, t: 0, fade: 0, cost: 0, off: false, why: '', genAt: -1e9, wait: 0, frames: 0, fr: 0, fg: 0, fb: 0, vig: null };
const TL_W = 160, TL_H = 100, TL_BIOMES = ['dungeon', 'caves', 'tomb', 'cathedral', 'library', 'foundry', 'crystal', 'sunken', 'volcano', 'frost', 'mine', 'sewer'];
const tlRM = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) { return null; } })();
function titleLiveOn() { return !TL.off && !settings.lowfx && !settings.reduceMotion && !(tlRM && tlRM.matches) && settings.titleLive !== false && !!window.Gen && !!tex.floor_stone && !!tex.wall_stone; }
function titleLiveGen() { // en riktig bana (som spelet genererar dem), dörrar blir golv; ljuset från facklor och eldfat räknas fram en gång
  TL.genAt = performance.now();
  let L = TL.pre, biome = TL.preBiome; TL.pre = null; // förgenererad bakom laddningsskärmen eller dödsskärmen (inget ryck på startskärmen)
  if (!L) { const seed = (Math.random() * 1e9) >>> 0; biome = TL_BIOMES[seed % TL_BIOMES.length]; try { L = Gen.floor(seed, 1 + seed % 3, { biome }); } catch (e) { L = null; } }
  if (!L || !L.map || !L.map.length) { TL.off = true; TL.why = 'gen'; return; }
  const h = L.map.length, w = L.map[0].length, n = w * h, grid = new Uint8Array(n), wt = new Array(n), fi = new Uint8Array(n), lit = new Float32Array(n).fill(Math.max(0.32, L.ambient || 0));
  const fl = (L.floors || [L.floor]).map(t => tex[t] || tex.floor_stone), lights = []; let sx = -1, sy = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = L.map[y][x], i = y * w + x;
    if (isWallChar(c) || c === '*') { grid[i] = 1; wt[i] = tex[wallTexFor[c === '*' ? L.secretWall : c] || wallTexFor[1]] || tex.wall_stone; continue; }
    if (L.floorMask) fi[i] = Math.min(fl.length - 1, +L.floorMask[y][x] || 0);
    if (c === 'P') { sx = x; sy = y; }
    if (c === 'f' || c === '_' && (x + y) % 3 === 0) lights.push([x, y, 0.75, 4]); else if (PROP_DEFS[c] && PROP_DEFS[c].light) lights.push([x, y, PROP_DEFS[c].light, PROP_DEFS[c].lightR || 4]);
  }
  TL.lc = []; TL.amb = lit[0]; // ljuskällorna sparas med sina rutor och vikter: lågorna fladdrar varje bildruta utan att räkna om avstånden
  for (const [lx, ly, s, r] of lights.slice(0, 80)) { const cs = [], ws = []; for (let y = Math.max(0, ly - r); y <= Math.min(h - 1, ly + r); y++) for (let x = Math.max(0, lx - r); x <= Math.min(w - 1, lx + r); x++) { const d = Math.hypot(x - lx, y - ly); if (d < r) { cs.push(y * w + x); ws.push(s * (1 - d / r) * (1 - d / r)); } } TL.lc.push({ c: Int32Array.from(cs), w: Float32Array.from(ws) }); }
  if (sx < 0) { for (let i = 0; i < n; i++) if (!grid[i]) { sx = i % w; sy = (i / w) | 0; break; } }
  if (sx < 0) { TL.off = true; TL.why = 'tom'; return; }
  Object.assign(TL, { lv: L, biome, grid, w, h, wt, fi, fl, lit, ct: tex[L.ceil] || tex.floor_stone, path: [[sx + 0.5, sy + 0.5]], s: 0, fade: 0, wait: 0 });
  [TL.fr, TL.fg, TL.fb] = (L.fog || [10, 8, 6]).map(v => Math.min(60, v));
  tlExtend(); const p = tlAt(0.4), q = tlAt(1.8); TL.x = p[0]; TL.y = p[1]; TL.a = Math.atan2(q[1] - p[1], q[0] - p[0]);
}
function tlPregen(again) { // bara Gen.floor (det dyra): körs medan laddningsskärmen visas och på dödsskärmen/nivåslutet, aldrig på startskärmen
  TL.preQ = false; if (TL.pre || TL.off || settings.lowfx || !window.Gen) return;
  const t0 = performance.now(), seed = (Math.random() * 1e9) >>> 0, biome = TL_BIOMES[seed % TL_BIOMES.length];
  try { TL.pre = Gen.floor(seed, 1 + seed % 3, { biome }); TL.preBiome = biome; TL.preMs = performance.now() - t0; if (again) TL.newOnTitle = true; } catch (e) { TL.pre = null; }
}
setTimeout(() => tlPregen(false), 30); // när skriptet har laddats: medan bilderna och ljuden laddas
function tlPregenSoon() { if (!TL.pre && !TL.preQ && TL.lv && !TL.off) { TL.preQ = true; setTimeout(() => { if (state === 'dead' || state === 'runover' || state === 'stats') tlPregen(true); else TL.preQ = false; }, 3000); } } // efter uppräkningen, och bara om skärmen fortfarande står still // anropas från menyWatch på dödsskärmen och nivåslutet
function tlExtend() { // nästa sträcka: bredden först från vägens slut till en avlägsen ruta, läggs till efter den gamla (inga hopp)
  const { grid, w, h, path } = TL, e = path[path.length - 1], s0 = (e[1] | 0) * w + (e[0] | 0), prev = new Int32Array(w * h).fill(-1), dist = new Int16Array(w * h).fill(-1), q = [s0];
  dist[s0] = 0; let far = [];
  for (let qi = 0; qi < q.length; qi++) { const c = q[qi], cx = c % w, cy = (c / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= w || y >= h) continue; const j = y * w + x; if (grid[j] || dist[j] >= 0) continue; dist[j] = dist[c] + 1; prev[j] = c; q.push(j); } }
  const md = dist[q[q.length - 1]]; for (const c of q) if (dist[c] >= Math.max(3, md * 0.55)) far.push(c);
  if (!far.length) far = q.slice(1); if (!far.length) { TL.off = true; TL.why = 'instängd'; return; }
  let c = far[(Math.random() * far.length) | 0]; const seg = [];
  while (c !== s0 && c >= 0) { seg.push([c % w + 0.5, ((c / w) | 0) + 0.5]); c = prev[c]; }
  for (let i = seg.length - 1; i >= 0; i--) path.push(seg[i]);
}
function tlAt(s) { const p = TL.path, n = p.length - 1; s = clamp(s, 0, n); const i = Math.min(n - 1, s | 0), f = s - i, a = p[i], b = p[Math.min(n, i + 1)]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; }
function titleLive(dt) { // ritar kameraflykten på canvasen; false = den gamla glöden används
  if (!titleLiveOn()) return false;
  if (!TL.lv) { TL.wait += dt; if (TL.wait < (TL.pre ? 0 : 0.8)) return false; titleLiveGen(); TL.genMs = performance.now() - TL.genAt; TL.t = 0; if (!TL.lv || TL.off) return false; } // genereras först när startskärmen visats en stund
  else if (TL.newOnTitle && TL.pre) { TL.newOnTitle = false; titleLiveGen(); TL.t = 0; if (TL.off) return false; } // en ny bana (och biom) varje gång man kommer tillbaka – förgenererad på dödsskärmen/nivåslutet
  const t0 = performance.now();
  try {
    TL.t += dt; TL.frames++; TL.fade = Math.min(1, TL.fade + dt * 0.7);
    TL.s += dt * 0.85; if (TL.s > TL.path.length - 6) tlExtend(); if (TL.s > 40) { TL.path.splice(0, 30); TL.s -= 30; }
    const p0 = tlAt(TL.s - 0.45), p1 = tlAt(TL.s + 0.45), q = tlAt(TL.s + 2.2); TL.x = (p0[0] + p1[0]) / 2; TL.y = (p0[1] + p1[1]) / 2; // rundade hörn, alltid inne i gången
    let da = Math.atan2(q[1] - TL.y, q[0] - TL.x) - TL.a; da = Math.atan2(Math.sin(da), Math.cos(da)); TL.a += da * Math.min(1, dt * 1.4);
    { const lit = TL.lit; lit.fill(TL.amb); TL.lc.forEach((o, i) => { const f = 0.8 + 0.2 * Math.sin(TL.t * 8.3 + i * 1.7) * Math.sin(TL.t * 5.1 + i * 2.3); for (let j = 0; j < o.c.length; j++) lit[o.c[j]] += o.w[j] * f; }); } // facklorna fladdrar
    tlRender(TL.a + Math.sin(TL.t * 0.37) * 0.07, 0.5 + Math.sin(TL.t * 3.4) * 0.01);
  } catch (e) { TL.off = true; TL.why = 'fel'; console.error(e); return false; }
  const ms = performance.now() - t0; TL.cost = TL.cost ? TL.cost * 0.95 + ms * 0.05 : ms;
  if (TL.frames > 90 && TL.cost > 7) { TL.off = true; TL.why = 'långsam'; } // för dyr på den här enheten: den gamla glöden
  return true;
}
function tlRender(a, camZ) {
  if (!TL.cv) { TL.cv = document.createElement('canvas'); TL.cv.width = TL_W; TL.cv.height = TL_H; TL.g = TL.cv.getContext('2d'); TL.img = TL.g.createImageData(TL_W, TL_H); TL.buf = new Uint32Array(TL.img.data.buffer);
    const v = document.createElement('canvas'); v.width = W; v.height = H; const g = v.getContext('2d'), gr = g.createRadialGradient(W / 2, H * 0.48, H * 0.18, W / 2, H * 0.5, W * 0.62); gr.addColorStop(0, 'rgba(8,5,4,0)'); gr.addColorStop(0.6, 'rgba(8,5,4,0.35)'); gr.addColorStop(1, 'rgba(6,3,2,0.94)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); TL.vig = v; }
  const { grid, w, h, wt, fi, fl, lit, ct, buf } = TL, fr = TL.fr, fg = TL.fg, fb = TL.fb, ps = PSC * TL_H / VH, hor = TL_H >> 1, cx = TL.x, cy = TL.y, FOGD = 11;
  const dirX = Math.cos(a), dirY = Math.sin(a), plX = -dirY * BASE_PLANE, plY = dirX * BASE_PLANE;
  const shade = (c, L, d) => { const k = Math.min(1, d / FOGD), m = L * (1 - k); return 0xff000000 | (Math.min(255, ((c >>> 16) & 255) * m + fb * k) << 16) | (Math.min(255, ((c >>> 8) & 255) * m + fg * k) << 8) | Math.min(255, (c & 255) * m + fr * k); };
  const lamp = d => 0.8 * Math.max(0, 1 - d / 7); // en lykta följer kameran
  for (let y = 0; y < TL_H; y++) { // golv och tak
    if (y === hor) { buf.fill(0xff000000 | (fb << 16) | (fg << 8) | fr, y * TL_W, y * TL_W + TL_W); continue; }
    const fl0 = y > hor, rd = fl0 ? ps * camZ / (y - hor) : ps * (1 - camZ) / (hor - y), dim = fl0 ? 1 : 0.6, lp = lamp(rd);
    let fx2 = cx + (dirX - plX) * rd, fy2 = cy + (dirY - plY) * rd; const stx = 2 * plX * rd / TL_W, sty = 2 * plY * rd / TL_W;
    for (let x = 0; x < TL_W; x++) { const mx = Math.floor(fx2), my = Math.floor(fy2), inside = mx >= 0 && my >= 0 && mx < w && my < h, ci = my * w + mx, t = fl0 ? (inside ? fl[fi[ci]] : fl[0]) : ct;
      buf[y * TL_W + x] = shade(t.data[(((fy2 - my) * t.h) | 0) * t.w + (((fx2 - mx) * t.w) | 0)], ((inside ? lit[ci] : 0.2) + lp) * dim, rd); fx2 += stx; fy2 += sty; }
  }
  for (let x = 0; x < TL_W; x++) { // väggar (DDA)
    const cam = 2 * x / TL_W - 1, rdx = dirX + plX * cam, rdy = dirY + plY * cam, ddx = Math.abs(1 / (rdx || 1e-9)), ddy = Math.abs(1 / (rdy || 1e-9));
    let mx = cx | 0, my = cy | 0, side = 0, d = 0, lx = mx, ly = my; const sx = rdx < 0 ? -1 : 1, sy = rdy < 0 ? -1 : 1; let sdx = (rdx < 0 ? cx - mx : mx + 1 - cx) * ddx, sdy = (rdy < 0 ? cy - my : my + 1 - cy) * ddy, hit = -1;
    for (let i = 0; i < 64; i++) { lx = mx; ly = my; if (sdx < sdy) { d = sdx; sdx += ddx; mx += sx; side = 0; } else { d = sdy; sdy += ddy; my += sy; side = 1; } if (d > FOGD + 2 || mx < 0 || my < 0 || mx >= w || my >= h) break; if (grid[my * w + mx]) { hit = my * w + mx; break; } }
    if (hit < 0) continue;
    const t = wt[hit], pd = Math.max(0.05, d), lh = ps / pd, top = hor - lh * (1 - camZ); let wx = side === 0 ? cy + d * rdy : cx + d * rdx; wx -= Math.floor(wx);
    let u = (wx * t.w) | 0; if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) u = t.w - 1 - u;
    const L = (lit[ly * w + lx] + lamp(pd)) * (side ? 0.78 : 1), y0 = Math.max(0, Math.ceil(top)), y1 = Math.min(TL_H - 1, Math.floor(top + lh - 0.001)), st = t.h / lh; let v = (y0 - top) * st;
    for (let y = y0; y <= y1; y++) { buf[y * TL_W + x] = shade(t.data[Math.min(t.h - 1, v | 0) * t.w + u], L, pd); v += st; }
  }
  if (l29Title()) return; // version 29 (LJUS): med WebGL ritar grafikkortet kameraflykten (bloom), vinjetten som förut
  TL.g.putImageData(TL.img, 0, 0); ctx.drawImage(TL.cv, 0, 0, W, VH); ctx.drawImage(TL.vig, 0, 0);
}
// ---------- MENY: HUD-juice – hälsan studsar/skakar/blinkar, ammon pulserar vid omladdning, "+N" för hälsa/skydd/ammo, hörnen skakar vid tung träff ----------
// Ändringar upptäcks genom att jämföra med förra bildrutan (ingen krok i hurtPlayer eller upplockningen). Skakningen är bara en ritförskjutning: hudRects() ändras inte.
const HJ = { lv: null, hp: 0, ar: 0, res: 0, mag: 0, wp: -1, last: 0, hit: 0, big: 0, heal: 0, rel: 0, kick: 0, pops: [], sx: 0, sy: 0, hpDx: 0, hpDy: 0, hpCol: null, magDy: 0, magCol: null, n: 0 };
function hjPop(kind, v, col) { // samma sorts "+N" inom en kort stund slås ihop
  if (kind !== 'hp' || v >= 5) HJ.edge = { col: kind === 'hp' ? '80,230,110' : kind === 'ar' ? '110,160,255' : '255,200,80', t: 0.5 }; // upplockningen tonar kanten (drawBodyFx)
  const o =HJ.pops.find(p => p.kind === kind && p.t > 0.75); if (o) { o.v += v; o.t = Math.max(o.t, 1); return; }
  if (HJ.pops.length >= 6) HJ.pops.shift(); HJ.pops.push({ kind, v, col, t: 1.1 }); HJ.n++;
}
function hudJuice() {
  const now = performance.now(), dt = Math.min(0.05, (now - HJ.last) / 1000 || 0); HJ.last = now; HJ.dt = dt;
  const wp = WEAPONS[P.weapon], res = wp.ammo && P.ammo && P.ammo[wp.ammo] !== undefined ? P.ammo[wp.ammo] : 0, mag = Math.floor(P.mags[P.weapon] || 0);
  if (HJ.lv !== lvl) { HJ.lv = lvl; HJ.hp = P.hp; HJ.ar = P.armor; HJ.pops.length = 0; HJ.hit = HJ.big = HJ.heal = HJ.rel = 0; HJ.wp = -1; } // ny våning/runda: inga "+N" för påfyllningen
  if (HJ.wp !== P.weapon) { HJ.wp = P.weapon; HJ.res = res; HJ.mag = mag; }
  if (P.hp < HJ.hp - 0.05) { const d = HJ.hp - P.hp; if (d >= 1) { HJ.hit = 0.5; if (d >= maxHp() * 0.18) HJ.big = 0.4; } HJ.hp = P.hp; } // långsam dränering (överhälsan) blinkar inte
  else if (P.hp >= HJ.hp + 3 || (P.hp > HJ.hp && P.hp >= maxHp())) { const d = Math.round(P.hp - HJ.hp); if (d > 0) { HJ.heal = 0.4; hjPop('hp', d, '#7fe08a'); } HJ.hp = P.hp; }
  if (P.armor >= HJ.ar + 1) { hjPop('ar', Math.round(P.armor - HJ.ar), '#8fb8ff'); HJ.ar = P.armor; } else if (P.armor < HJ.ar) HJ.ar = P.armor;
  if (mag > HJ.mag && res < HJ.res) HJ.rel = 0.35; // omladdningen är klar: siffran studsar
  else if (res > HJ.res) hjPop('am', res - HJ.res, '#ffc860');
  if (mag < HJ.mag) HJ.kick = 0.08;
  HJ.res = res; HJ.mag = mag;
  HJ.hit = Math.max(0, HJ.hit - dt); HJ.big = Math.max(0, HJ.big - dt); HJ.heal = Math.max(0, HJ.heal - dt); HJ.rel = Math.max(0, HJ.rel - dt); HJ.kick = Math.max(0, HJ.kick - dt);
  const sk = settings.reduceMotion ? 0 : clamp(settings.shake ?? 1, 0, 2), jig = () => Math.round((Math.random() - 0.5) * 2);
  HJ.sx = HJ.big > 0 && sk ? Math.round((Math.random() - 0.5) * HJ.big * 9 * sk) : 0; HJ.sy = HJ.big > 0 && sk ? Math.round((Math.random() - 0.5) * HJ.big * 6 * sk) : 0;
  HJ.hpDx = HJ.hit > 0.2 && sk ? jig() : 0;
  HJ.hpDy = HJ.hit > 0.2 && sk ? jig() : HJ.heal > 0 && !settings.reduceMotion ? -Math.round(Math.sin((1 - HJ.heal / 0.4) * Math.PI) * 3) : 0;
  HJ.hpCol = HJ.hit > 0 ? (!settings.noFlash && HJ.hit > 0.38 ? '#ffffff' : HJ.hit > 0.1 || tmr % 0.12 < 0.06 ? '#ff4d3d' : null) : HJ.heal > 0.2 ? '#a0ffb0' : null;
  const reloading = WS.state === 'reload';
  HJ.magDy = HJ.rel > 0 && !settings.reduceMotion ? -Math.round(Math.sin((1 - HJ.rel / 0.35) * Math.PI) * 3) : HJ.kick > 0 ? 1 : 0;
  HJ.magCol = reloading ? (Math.sin(now / 90) > 0 ? '#ffe9a8' : '#7a6a50') : HJ.rel > 0.2 ? '#ffffff' : null;
}
function hudPops(g, L) { // "+N" stiger och bleknar vid hörnet (uppåt på dator, nedåt på pekskärm där hörnen ligger överst)
  const now = HJ.last; let ih = 0, ia = 0;
  for (let i = HJ.pops.length - 1; i >= 0; i--) { const p = HJ.pops[i]; p.t -= HJ.dt || 1 / 60; if (p.t <= 0) { HJ.pops.splice(i, 1); continue; } }
  for (const p of HJ.pops) {
    const s = '+' + p.v, k = 1 - p.t / 1.1, r = p.kind === 'am' ? L.ammo : L.hp, slot = p.kind === 'am' ? ia++ : ih++, rise = Math.round(k * 10) + slot * 9;
    const x = p.kind === 'am' ? r.x + 2 : r.x + 12 + (p.kind === 'ar' ? 26 : 0), y = L.t ? r.y + r.h + 4 + rise : r.y - 10 - rise;
    txt(s, Math.round(x), Math.round(y), p.col, 1, true, Math.min(1, p.t * 2.2));
  }
  return now;
}
