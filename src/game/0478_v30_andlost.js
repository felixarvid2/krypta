// ---------- Version 30 (ALTARE): ÄNDLÖST – våning efter våning utan slut, med poäng och en topplista ----------
// Biomerna slumpas ur BIOME_IDS i påsar (frö + ':ändlösbiom:' + påse): alla biomer en gång innan någon kommer igen, även ruinerna och glasbruket när
// SPEL har lagt till dem i BIOME_IDS. Var femte våning är en bossvåning (bossarna i en egen påse), och efter bossen på var tionde våning står
// förbundets altare (0477) bredvid portalen. Kurvan (n = våningen; spelets egen ökning per våning, depthHp och 1 + 0,6 × varv för bossar, räknas bort
// så att kurvan nedan är hela ökningen):
//   hälsa  H(n) = 1 + 0,15 (n − 1) + 0,004 (n − 1)²   (n = 1, 5, 10, 20, 30, 50: ×1, ×1,66, ×2,67, ×5,3, ×8,7, ×18)
//   skada  D(n) = min(2,5; 1 + 0,035 (n − 1))         (×1, ×1,14, ×1,32, ×1,67, ×2,0, taket från n = 44)
//   antal  +min(10, ⌊(n − 1) / 3⌋) fiender utöver banans egna (kloner av banans fiender, eget slumpflöde)
//   bossar B(n) = 1 + 0,1 (n − 5) i hälsa, skadan 1 + 0,02 (n − 5)
// Motivering: den linjära delen följer spelarens tillväxt (ett kort per våning, ungefär linjärt), skadan stiger långsammare än hälsan eftersom
// spelarens hälsa inte växer i samma takt, och den lilla kvadratiska delen gör att varje runda till slut tar slut (den blir hälften av den linjära
// delen först kring våning 20). Veteranerna (×1,25 från våning 7) finns kvar som i Avgrunden.
// POÄNG = 1000 per klarad våning (djup − 1) + 25 per dödad fiende + fartbonus (4 per sekund under 2:30 på varje klarad våning, 3:00 på bossvåningar).
// Topplistan: de tio bästa rundorna i localStorage (krypta.a30top, via store: try/catch) med datum, djup, poäng, biom där man dog och frö.
// Krokar i andras delar (en rad var): loadFloor (0030), enterPortal (0390), retryRun (0400), knappen #endlessbtn i index.html. Övrigt lindas in här:
// makeEnemy, makeBoss, makeGuardian, routePortals, spawnPortal, floorDone, endRun och refreshTitle.
const A30E = { hpLin: 0.15, hpQuad: 0.004, dmgLin: 0.035, dmgMax: 2.5, bossLin: 0.1, bossDmg: 0.02, extraEvery: 3, extraMax: 10, bossEvery: 5, altarEvery: 10,
  ptsDepth: 1000, ptsKill: 25, ptsSec: 4, parT: 150, parBossT: 180, topN: 10, key: 'a30top' };
const a30eHp = n => 1 + A30E.hpLin * (n - 1) + A30E.hpQuad * (n - 1) * (n - 1);
const a30eDmg = n => Math.min(A30E.dmgMax, 1 + A30E.dmgLin * (n - 1));
const a30eBossHp = n => 1 + A30E.bossLin * Math.max(0, n - A30E.bossEvery);
const a30eExtra = n => Math.min(A30E.extraMax, Math.floor((n - 1) / A30E.extraEvery));
const a30eIsBoss = n => n > 0 && n % A30E.bossEvery === 0;
const a30eOn = () => !!(run && run.a30e && !run.hub);
const a30eFmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
function a30eLevel(n) {
  const seed = run.seed, r = RNG(RNG.hash(seed + ':ändlös:' + n));
  if (a30eIsBoss(n)) {
    const pool = bossPool(), k = n / A30E.bossEvery - 1, id = RNG(RNG.hash(seed + ':ändlösboss:' + Math.floor(k / pool.length))).shuffle(pool.slice())[k % pool.length];
    const L = Gen.boss(RNG.hash(seed + ':ändlösboss:' + n), { arena: BOSSES[id].arena, boss: id }); L.bossId = id; return L;
  }
  const idx = n - 1 - Math.floor(n / A30E.bossEvery), len = BIOME_IDS.length, bag = Math.floor(idx / len);
  const order = lateLast(RNG(RNG.hash(seed + ':ändlösbiom:' + bag)).shuffle(BIOME_IDS.slice()));
  const biome = BIOME_IDS.includes(params.get('biome')) ? params.get('biome') : order[idx % len];
  return Gen.floor(RNG.hash(seed + ':ändlös:' + n), Math.min(5, 1 + Math.floor(n / 2)), { shop: n % A30E.bossEvery === 4, weapon: n % 3 === 1 ? r.pick(Object.keys(WEAPON_CHAR)).toString() : null, biome, guardian: n % A30E.bossEvery === 2 ? r.pick(bossPool()) : undefined });
}
function a30eLoad(depth) { // från loadFloor (krokraden): som Avgrunden – banan, fler fiender, rustning per våning och sparningen
  if (a30eIsBoss(depth)) run.floorCurse = false; // (EN RÖST I MÖRKRET förbannar aldrig en bossvåning eller våningen efter)
  startLevel(a30eLevel(depth));
  if (!boss) { const rng = RNG(RNG.hash(run.seed + ':ändlösfler:' + depth)), plain = e => !e.dead && !e.boss && !e.guardian && !e.elite && !e.minion && !e.dormant && !e.s29home && ENEMY_DEFS[e.type]; a30Spawn(rng, plain, a30eExtra(depth), 'a30eX'); }
  profile.a30eBest = Math.max(profile.a30eBest || 0, depth);
  P.armor = Math.min(200, P.armor + mod('armorPerFloor')); if (mod('floorHeal')) heal(mod('floorHeal'), true);
  saveRun();
}
function a30eBegin(seed0) {
  document.getElementById('title').hidden = true; canvas.focus(); ensureAudio(); practice = null;
  const typed = (document.getElementById('seed') ? document.getElementById('seed').value || '' : '').trim();
  const seed = seed0 !== undefined ? seed0 >>> 0 : typed ? (/^[0-9a-z]{1,7}$/i.test(typed) ? parseInt(typed, 36) >>> 0 : RNG.hash(typed)) : RNG.randomSeed();
  newRun(seed, false); run.a30e = { v: 1, tb: 0, floors: 0, bosses: 0 }; run.cmode = ''; P.hp = maxHp(); stat('a30eRuns');
  loadFloor(1); say('ÄNDLÖST – VÅNING EFTER VÅNING TILLS DU FALLER', 3); lockPointer();
  openUI(() => draftUI(drawCards(3 + meta('choice')), { title: 'ÄNDLÖST', subtitle: 'VÄLJ ETT STARTKORT', skipLabel: 'INGET KORT' }, card => { gainCard(card); closeUI(); }));
}
function a30eNext() { // från enterPortal (krokraden): bossen är fälld – hälsa, ett kort och nästa våning
  const E = run.a30e; E.tb = (E.tb || 0) + Math.round(Math.max(0, A30E.parBossT - levelTime) * A30E.ptsSec); E.bosses = (E.bosses || 0) + 1; E.floors = (E.floors || 0) + 1;
  P.hp = Math.min(maxHp(), P.hp + maxHp() * 0.4); run.floorCurse = false;
  const draft = () => openUI(() => draftUI(drawCards(3, { luck: 1 }), { title: `VÅNING ${run.depth} KLARAD`, subtitle: 'VÄLJ ETT KORT OCH FORTSÄTT NEDÅT', skipLabel: 'INGET KORT' }, card => { if (card) gainCard(card); closeUI(); loadFloor(run.depth + 1); lockPointer(); }));
  // var tionde våning: fick altaret ingen plats i arenan öppnas valet här, före kortet
  if (E.altarDue === run.depth && A30.on && !(A30.altarPr && A30.lvl === lvl)) { E.altarDue = 0; a30AltarUI({ used: false, a30: { depth: run.depth }, x: P.x, y: P.y }, () => { closeUI(); setTimeout(draft, 50); }); return; }
  draft();
}
// titelkortet i ÄNDLÖST (krokraden i drawHUD): samma kort som spelets, men "ÄNDLÖST · VÅNING n" i stället för varv och våning
function a30eBanner() {
  if (!(run && run.a30e && !lvl.hub && levelBanner > 0 && bossBanner <= 0 && state === 'play')) return false;
  const a = Math.min(1, levelBanner, (3 - levelBanner) * 3), n = run.depth, sub = `ÄNDLÖST · VÅNING ${n}`;
  ctx.font = '16px "PressStart2P"'; const w = ctx.measureText(plain(lvl.name)).width;
  const bo = settings.reduceMotion ? 0 : -Math.round(Math.max(0, 1 - (3 - levelBanner) * 2.5) ** 2 * 16);
  if (w < W - 124 - 2 * hudIX) txt(lvl.name, (W - w) / 2, 40 + bo, '#e8d9b0', 2, true, a); else txt(lvl.name, (W - textW(lvl.name)) / 2, 44 + bo, '#e8d9b0', 1, true, a);
  txt(sub, (W - textW(sub)) / 2, 60, '#c9a87a', 1, true, a * 0.9);
  const best = a30eTop()[0], ex = floorEvent ? [EVENTS[floorEvent].name, '#ff7060'] : run.floorCurse ? ['FÖRBANNAD VÅNING', '#c080ff'] : a30eIsBoss(n) ? ['BOSSVÅNING', '#ff7060']
    : n > 1 && n % A30E.bossEvery === 1 ? ['FIENDERNA BLIR STARKARE', '#ff9050'] : best && n > best.depth ? ['DJUPARE ÄN NÅGONSIN!', '#9fe0a0'] : null;
  if (ex) txt(ex[0], (W - textW(ex[0])) / 2, 72, ex[1], 1, true, a);
  return true;
}
// poängen och topplistan
function a30eScore(r) {
  const E = (r && r.a30e) || {}, depth = Math.max(0, ((r && r.depth) || 1) - 1) * A30E.ptsDepth, kills = ((r && r.kills) || 0) * A30E.ptsKill, time = Math.round(E.tb || 0);
  return { depth, kills, time, total: depth + kills + time };
}
function a30eStoreOK() { try { localStorage.getItem('krypta.' + A30E.key); return true; } catch (e) { return false; } }
function a30eTop() { let t = null; try { t = store.get(A30E.key, []); } catch (e) { t = []; } return Array.isArray(t) ? t.filter(x => x && typeof x.score === 'number').slice(0, A30E.topN) : []; }
function a30eSaveTop(list) { try { store.set(A30E.key, list.slice(0, A30E.topN)); } catch (e) { /* ingen lagring */ } }
function a30eRecord(r) {
  const s = a30eScore(r), top = a30eTop(), best = top.length ? top[0].score : 0;
  const ent = { d: new Date().toISOString().slice(0, 10), depth: r.depth, score: s.total, biome: (lvl && lvl.biome) || '', seed: seedText(r.seed), kills: r.kills || 0, time: Math.round(r.time || 0), t: Date.now() };
  const list = top.concat(ent).sort((a, b) => b.score - a.score || b.depth - a.depth || a.t - b.t).slice(0, A30E.topN), rank = list.indexOf(ent) + 1;
  a30eSaveTop(list);
  const okStore = a30eStoreOK(); r.a30e.res = { ...s, rank: okStore ? rank : 0, record: okStore && s.total > best && s.total > 0, best };
  profile.a30eBest = Math.max(profile.a30eBest || 0, r.depth); profile.a30eScore = Math.max(profile.a30eScore || 0, s.total);
  const h = profile.history && profile.history[0]; if (h && h.seed === seedText(r.seed)) h.cmode = 'ÄNDLÖST';
  saveProfile();
}
const a30eTopLine = (x, i) => `${i + 1}. ${a30eFmt(x.score)} · DJUP ${x.depth} · ${(BIOME_NAME[x.biome] || x.biome || '–')} · ${x.d} · FRÖ ${x.seed}`;
function a30eRunOver(r, el) { // dödsskärmen (från a30RunOver i 0477): poängen, NYTT REKORD och topplistan
  const res = r.a30e.res || { ...a30eScore(r), rank: 0, record: false };
  const big = Object.assign(document.createElement('div'), { className: 'a30-score', textContent: `POÄNG ${a30eFmt(res.total)}` + (res.record ? ' · NYTT REKORD!' : res.rank ? ` · PLATS ${res.rank} PÅ TOPPLISTAN` : '') });
  big.style.cssText = `font-size:clamp(10px,min(1.5vw,3vh),15px);color:${res.record ? '#ffd24a' : '#ffe9a8'}`;
  el.appendChild(big);
  el.appendChild(Object.assign(document.createElement('div'), { textContent: `VÅNINGAR ${a30eFmt(res.depth)} · FIENDER ${a30eFmt(res.kills)} · FART ${a30eFmt(res.time)}`, style: 'color:#c9a87a' }));
  const top = a30eTop(); // de tre bästa, och den här rundan om den kom längre ned
  top.forEach((x, i) => { if (i >= 3 && i + 1 !== res.rank) return; const d = Object.assign(document.createElement('div'), { textContent: `${i + 1}. ${a30eFmt(x.score)} · DJUP ${x.depth} · ${BIOME_NAME[x.biome] || x.biome || '–'}` }); d.style.color = i + 1 === res.rank ? '#ffd24a' : '#8a7558'; el.appendChild(d); });
}
function a30eStatRows(p) {
  const top = a30eTop();
  return [{ label: 'ÄNDLÖST', head: true, color: '#ffd24a' }, { label: 'RUNDOR', text: String(p.a30eRuns || 0) }, { label: 'DJUPAST', text: p.a30eBest ? 'VÅNING ' + p.a30eBest : '–' },
    ...top.slice(0, 5).map((x, i) => ({ label: `${i + 1}. ${a30eFmt(x.score)} POÄNG`, text: `DJUP ${x.depth} · ${BIOME_NAME[x.biome] || x.biome || '–'} · ${x.d}` }))];
}
function a30eShowTop(onClose) {
  const top = a30eTop();
  CardUI.list('ÄNDLÖST – TOPPLISTAN', 'DE TIO BÄSTA RUNDORNA PÅ DEN HÄR ENHETEN', top.length ? top.map((x, i) => ({ label: `${i + 1}. ${a30eFmt(x.score)} POÄNG`, text: `DJUP ${x.depth} · ${BIOME_NAME[x.biome] || x.biome || '–'} · ${x.d} · FRÖ ${x.seed}` })) : [{ label: 'INGA RUNDOR ÄN', text: '' }], onClose);
}
function a30eMenu() { // knappen ÄNDLÖST i LÄGEN
  const top = a30eTop(), saved = !!store.get(runKey(), null);
  CardUI.choice({ title: 'ÄNDLÖST', subtitle: 'VÅNING EFTER VÅNING TILLS DU FALLER. BOSS VAR FEMTE VÅNING, ETT ALTARE VAR TIONDE.' + (saved ? ' DIN PÅGÅENDE RUNDA SKRIVS ÖVER.' : ''), cancel: 2,
    options: [{ label: 'BÖRJA', text: 'FIENDERNA BLIR FLER OCH STARKARE. POÄNG FÖR DJUP, FIENDER OCH FART.' },
      { label: 'TOPPLISTAN', text: top.length ? `REKORD ${a30eFmt(top[0].score)} POÄNG · DJUP ${top[0].depth}` : 'INGA RUNDOR ÄN' }, { label: 'TILLBAKA', text: '' }] },
  i => { if (i === 0) a30eBegin(); else if (i === 1) a30eShowTop(() => refreshTitle()); else refreshTitle(); });
}
function a30eMenuLabel() { // rekordet under knappen
  const b = document.getElementById('endlessbtn'); if (!b) return;
  let sp = b.querySelector('.label'); const top = a30eTop();
  if (!top.length) { if (sp) sp.remove(); return; }
  if (!sp) { sp = document.createElement('span'); sp.className = 'label'; b.appendChild(sp); }
  sp.textContent = `REKORD ${a30eFmt(top[0].score)} · DJUP ${top[0].depth}`;
}
function a30eApi() {
  return { C: A30E, hp: a30eHp, dmg: a30eDmg, bossHp: a30eBossHp, extra: a30eExtra, isBoss: a30eIsBoss, level: n => a30eLevel(n), begin: s => a30eBegin(s), next: () => a30eNext(), score: () => a30eScore(run),
    top: () => a30eTop(), menu: () => a30eMenu(), showTop: () => a30eShowTop(() => refreshTitle()), menuLabel: () => { a30eMenuLabel(); const b = document.getElementById('endlessbtn'); return b ? b.textContent : null; }, statRows: () => a30eStatRows(profile) };
}
{ const b = document.getElementById('endlessbtn'); if (b) b.addEventListener('click', () => { if (!document.getElementById('start').disabled) a30eMenu(); }); }
{ // inlindningar
  const A30Ew = { makeEnemy, makeBoss, makeGuardian, routePortals, spawnPortal, floorDone, nextFloor, endRun, refreshTitle };
  const base = () => 1 + 0.2 * Math.max(0, run.depth - 1); // depthHp utan uppstigningen (den behålls)
  makeEnemy = function (type, x, y) { const e = A30Ew.makeEnemy(type, x, y); if (e && e.d && a30eOn()) { const n = run.depth; e.hp = e.maxHp = e.maxHp * a30eHp(n) / base(); e.d = { ...e.d, dmg: e.d.dmg * a30eDmg(n) }; e.a30e = true; } return e; };
  makeBoss = function (x, y) { const b = A30Ew.makeBoss(x, y); if (b && a30eOn()) { const n = run.depth, k = a30eBossHp(n) / (1 + 0.6 * cycleOf(n)); b.hp *= k; b.maxHp *= k; b.d = { ...b.d, dmg: b.d.dmg * (1 + A30E.bossDmg * Math.max(0, n - A30E.bossEvery)) }; } return b; };
  makeGuardian = function (x, y) { const g = A30Ew.makeGuardian(x, y); if (g && a30eOn()) { const n = run.depth, k = a30eHp(n) / (base() * (1 + 0.4 * cycleOf(n))); g.hp *= k; g.maxHp *= k; } return g; };
  routePortals = function (p) { if (run && run.a30e) return; return A30Ew.routePortals(p); }; // som Avgrunden: inga vägval och inga utmaningsportaler
  spawnPortal = function (x, y, kind) { // var tionde våning: förbundets altare bredvid bossens portal
    const out = A30Ew.spawnPortal(x, y, kind);
    if (kind === 'boss' && a30eOn() && run.depth % A30E.altarEvery === 0 && A30.on && !(A30.altarPr && A30.lvl === lvl)) { const o = a30Place(null, [x, y]); if (o) say('ETT ALTARE STIGER UR GOLVET', 3); else run.a30e.altarDue = run.depth; }
    return out;
  };
  floorDone = function () { const live = a30eOn() && !boss && state === 'play', t = levelTime, out = A30Ew.floorDone(); if (live && state === 'stats') { run.a30e.tb = (run.a30e.tb || 0) + Math.round(Math.max(0, A30E.parT - t) * A30E.ptsSec); run.a30e.floors = (run.a30e.floors || 0) + 1; } return out; };
  nextFloor = function () { // före ÄNDLÖST:s bossvåning: kortvalet direkt (spelets egen nextFloor räknar bossar var sjätte våning)
    if (state === 'stats' && a30eOn() && a30eIsBoss(run.depth + 1)) { stats = null; run.floorCurse = false; floorDraft(run.depth + 1); return; }
    return A30Ew.nextFloor();
  };
  endRun = function (win) { const r = run, out = A30Ew.endRun(win); try { if (r && r.a30e && !r.practice && !r.a30e.res) a30eRecord(r); } catch (e) { console.error(e); } return out; };
  refreshTitle = function (...a) { const out = A30Ew.refreshTitle(...a); try { a30eMenuLabel(); } catch (e) { /* ingen knapp */ } return out; };
}
