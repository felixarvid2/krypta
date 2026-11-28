// ---------- Version 30 (ALTARE): förbundets altare – en förbannelse och en välsignelse som gäller resten av rundan ----------
// Altaret (˂, U+02C2, bilden prop_talentaltar med violett glöd) står på ungefär var tredje vanlig våning (eget slumpflöde: frö + ':altare30:' + djup),
// aldrig på bossvåningar, blodvåningar, i lägret, i övningen, i speciallägena eller i en egen bana. I ÄNDLÖST (0478) står det i bossarenan på var
// tionde våning. E öppnar ett val med tre förbund (erbjudandena är bestämda av frö och djup, så en omladdning slumpar inte om dem) eller GÅ DÄRIFRÅN.
// Högst tre förbund per runda; med tre kan altaret i stället bryta ett. Förbunden sparas i run.a30 (krypta.run) och syns i pausen (bilden, menyn och
// RUNDAN), i statistiken och på dödsskärmen. Kontrastläget (HÖG KONTRAST PÅ FIENDER): MÖRKARE VÅNINGAR erbjuds inte, och ett redan taget mörker blir
// FIENDERNA HAR 15 % MER HÄLSA.
// Krokar i andras delar (en rad var): a30RunOver(r) i showRunOver (0400), a30StatRows(p) i showStats (0260), a30Api() i 0610. Övrigt lindas in här:
// startLevel, recomputeMods, makeEnemy, makeBoss, makeGuardian, killEnemy, hurtEnemy, explode, heal, drinkPotion, openChest, floorDone, updateV28,
// drawPause, pauseMenu och pauseExtras. Av: ?a30off=1 eller __game.a30.set('on', false). ?a30altar=1 ställer ett altare på varje tillåten våning.
const A30_ALTAR = '˂';
const A30_MAX = 3;
const A30_CFG = { chance: 0.34, minDepth: 2, boomT: 0.5, boomR: 1.5, boomDmg: 7, boomPer: 0.5, boomMax: 14, eliteK: 0.2, hordeK: 0.3, swiftK: 1.25, tyrantK: 1.4, darkK: 0.6, hcHpK: 1.15 };
// förbannelse – välsignelse; mods läggs på korten i recomputeMods (samma nycklar som js/cards.js), resten sköts av inlindningarna nedan
const A30_PAIRS = [
  { id: 'boom', curse: 'FIENDERNA EXPLODERAR NÄR DE DÖR', bless: '+30 % SKADA', text: 'LIKEN SMÄLLER EN HALV SEKUND EFTER DÖDEN – HÅLL AVSTÅND', mods: { dmg: 0.3 } },
  { id: 'nopot', curse: 'INGEN LÄKNING AV DRYCKER', bless: '+50 % GULD', text: 'HÄLSODRYCKERNA LÄKER INGENTING, ANDRA DRYCKER VERKAR SOM VANLIGT', mods: { goldMul: 0.5 } },
  { id: 'dark', curse: 'MÖRKARE VÅNINGAR', bless: '+1 KORT VID VARJE VÅNINGSSLUT', text: 'VÅNINGARNA ÄR 40 % MÖRKARE – ETT SLUMPAT KORT NÄR VÅNINGEN ÄR KLAR', hc: 'FIENDERNA HAR 15 % MER HÄLSA', mods: {} },
  { id: 'swift', curse: 'SNABBARE FIENDER', bless: 'DUBBEL SPRÄNGSKADA', text: 'FIENDERNA RÖR SIG 25 % FORTARE – DINA SMÄLLAR GÖR DUBBEL SKADA PÅ FIENDERNA', mods: {} },
  { id: 'scarce', curse: 'HALV AMMO I LÅDOR', bless: 'HUVUDSKOTT +100 %', text: 'AMMUNITIONEN DU PLOCKAR UPP HALVERAS – HUVUDSKOTTEN GÖR DUBBELT SÅ MYCKET EXTRA SKADA', mods: { ammoMul: -0.5, headshot: 1.5 } },
  { id: 'elite', curse: 'ELITER ÖVERALLT', bless: 'KISTOR BLIR GULDKISTOR', text: 'VAR FEMTE FIENDE ÄR EN ELIT – ALLA OLÅSTA KISTOR GLITTRAR OCH GER BÄTTRE KORT', mods: {} },
  { id: 'frail', curse: '−25 MAX HÄLSA', bless: '+15 % KRITCHANS', text: 'MINDRE HÄLSA – FLER KRITISKA TRÄFFAR', mods: { maxHp: -25, critChance: 0.15 } },
  { id: 'brutal', curse: 'FIENDERNA SLÅR 25 % HÅRDARE', bless: '4 % LIVSSTÖLD', text: 'DU TAR MER SKADA – EN DEL AV DIN SKADA LÄKER DIG', mods: { damageTaken: 0.25, lifesteal: 0.04 } },
  { id: 'poor', curse: 'HALVERAT GULD', bless: '+25 % ELDHASTIGHET', text: 'HÄLFTEN SÅ MYCKET GULD – ALLA VAPEN SKJUTER FORTARE', mods: { goldMul: -0.5, fireRate: 0.25 } },
  { id: 'horde', curse: '30 % FLER FIENDER', bless: '+3 HÄLSA PER DÖDAD FIENDE', text: 'VARJE VÅNING FÅR FLER FIENDER – VARJE DÖDAD FIENDE LÄKER DIG', mods: { killHeal: 3 } },
  { id: 'greed', curse: 'BUTIKEN ÄR 30 % DYRARE', bless: 'LÄKER 1 HÄLSA VARANNAN SEKUND', text: 'HÖGRE PRISER HOS KÖPMÄNNEN – SAKTA LÄKNING HELA TIDEN', mods: { shopDiscount: -0.3, regen: 0.5 } },
  { id: 'reload', curse: '30 % LÅNGSAMMARE OMLADDNING', bless: '50 % STÖRRE MAGASIN', text: 'OMLADDNINGEN TAR LÄNGRE TID – FLER SKOTT I VARJE MAGASIN', mods: { reloadSpeed: -0.3, magSize: 0.5 } },
  { id: 'tyrant', curse: 'BOSSAR OCH VÄKTARE HAR 40 % MER HÄLSA', bless: 'EN EXTRA ÅTERUPPLIVNING', text: 'DE STORA FIENDERNA TÅL MER – DU VAKNAR EN GÅNG TILL MED HALV HÄLSA', mods: { extraLife: 1 } },
  { id: 'heavy', curse: '−12 % RÖRELSEFART', bless: '+50 % NÄRSTRIDSSKADA', text: 'DU RÖR DIG LÅNGSAMMARE – SPARKAR, SLAG OCH NÄRSTRIDSVAPEN GÖR MER SKADA', mods: { moveSpeed: -0.12, meleeDmg: 0.5 } },
];
const A30_FLOOR = { maxHp: -85, goldMul: -0.9, ammoMul: -0.9, moveSpeed: -0.5, reloadSpeed: -0.6 }; // med förbund: aldrig under (förbannade kort kan också dra ned)
const A30_BY = Object.fromEntries(A30_PAIRS.map(p => [p.id, p]));
const A30 = { on: !params.get('a30off'), force: !!params.get('a30altar'), lvl: null, altarPr: null, blasts: [], boomCtx: 0, pot: 0, glowT: 0,
  st: { placed: 0, taken: 0, broken: 0, booms: 0, boomHits: 0, potBlocked: 0, elites: 0, horde: 0, cards: 0 } };
const a30Run = () => (run ? (run.a30 = run.a30 || { pacts: [], hist: [] }) : null);
const a30Pacts = () => (run && run.a30 && Array.isArray(run.a30.pacts) ? run.a30.pacts : []);
const a30Has = id => A30.on && a30Pacts().includes(id);
const a30Hc = () => !!settings.contrast; // kontrastläget: inget extra mörker
const a30Curse = p => (p.id === 'dark' && a30Hc() ? p.hc : p.curse);
const a30Label = p => `${a30Curse(p)} – ${p.bless}`;
// var får altaret stå i en vanlig runda?
function a30NormalFloor() {
  if (!A30.on || !run || !lvl || state === 'title') return false;
  if (run.custom || run.practice || run.practiceT || run.maze || run.survival || run.hunt || run.bossrush || run.campaign || run.abyss || run.finale || run.hub || run.a30e) return false;
  if (lvl.hub || lvl.secret || lvl.arena || lvl.goldRoom || lvl.maze || lvl.survival || boss || isBossDepth(run.depth) || run.depth < A30_CFG.minDepth) return false;
  if (v28.blood && v28.lvl === lvl) return false; // blodvåningen har blodaltaret
  return true;
}
function a30Start() { // efter startLevel: altaret och förbundens verkan på den nya våningen
  A30.lvl = lvl; A30.altarPr = null; A30.blasts.length = 0; A30.boomCtx = 0; A30.pot = 0;
  if (!A30.on || !run || !lvl || lvl.hub) return;
  if (a30Pacts().length) a30Apply(a30Pacts(), false);
  if (a30NormalFloor()) { const rng = RNG(RNG.hash(run.seed + ':altare30:' + run.depth)); if (A30.force || rng.next() < A30_CFG.chance) a30Place(rng, null); }
}
// en fri ruta med fritt runt om (alla åtta grannar är golv), i ett vanligt rum, en bit från spelaren och från föremål, kistor och rekvisita
function a30CellOK(x, y, near) {
  if (x < 1 || y < 1 || x >= mw - 1 || y >= mh - 1 || !s29Open8(x, y) || s29GuardRoom(x, y)) return false;
  if (!near && !s29OpenRoom(x, y)) return false;
  const cx = x + 0.5, cy = y + 0.5;
  if (Math.hypot(cx - P.x, cy - P.y) < (near ? 2.5 : 6)) return false;
  if (hazGrid && hazGrid[y * mw + x]) return false;
  if (lvl.exit && Math.abs(lvl.exit.x - x) + Math.abs(lvl.exit.y - y) < 3) return false;
  const busy = a => a.some(o => o && !o.taken && Math.hypot(o.x - cx, o.y - cy) < 1.1);
  if (busy(items) || busy(chests) || busy(merchants) || busy(props) || busy(portals)) return false;
  if (ents.some(e => !e.dead && Math.hypot(e.x - cx, e.y - cy) < 0.9)) return false;
  return true;
}
function a30Place(rng, near) { // near = [x, y]: nära en plats (bossarenan i ÄNDLÖST), annars var som helst på våningen
  let at = null;
  if (near) { for (let r = 2; r <= 5 && !at; r++) for (let k = 0; k < 16 && !at; k++) { const a = k / 16 * TAU + r, x = Math.floor(near[0] + Math.cos(a) * r), y = Math.floor(near[1] + Math.sin(a) * r); if (a30CellOK(x, y, true)) at = [x, y]; } }
  if (near && !at) for (let y = 1; y < mh - 1 && !at; y++) for (let x = 1; x < mw - 1 && !at; x++) if (a30CellOK(x, y, true)) at = [x, y]; // reserv: var som helst i arenan
  if (!near) for (let i = 0; i < 900 && !at; i++) { const x = 1 + ((rng.next() * (mw - 2)) | 0), y = 1 + ((rng.next() * (mh - 2)) | 0); if (a30CellOK(x, y, false)) at = [x, y]; }
  if (!at) return null;
  if (!PROP_DEFS[A30_ALTAR]) { PROP_DEFS[A30_ALTAR] = { img: 'talentaltar', fb: 'altar', n: 2, size: 0.78, block: true, light: 0.5, lightR: 3.5, use: 'a30altar' }; PROP_GLOW[A30_ALTAR] = [190, 110, 255]; }
  const o = addPropAt(A30_ALTAR, at[0], at[1]); if (!o) return null;
  o.a30 = { depth: run.depth }; A30.altarPr = o; A30.st.placed++; logEvent('FÖRBUNDETS ALTARE');
  return o;
}
USE_NAME.a30altar = 'FÖRBUNDETS ALTARE';
// erbjudandena: tre förbund som inte redan är tagna (frö + djup: samma vid en omladdning)
function a30Offers(depth) {
  const have = a30Pacts(), pool = A30_PAIRS.filter(p => !have.includes(p.id) && !(p.id === 'dark' && a30Hc()));
  return RNG(RNG.hash(run.seed + ':altare30val:' + depth)).shuffle(pool.slice()).slice(0, 3).map(p => p.id);
}
USES.a30altar = pr => a30AltarUI(pr, null);
function a30AltarUI(pr, after) { // after: körs när valet är stängt (annars fortsätter spelet)
  const close = () => { if (after) after(); else closeUI(); };
  if (!pr || pr.used || !run) { if (after) after(); return; }
  const have = a30Pacts(), d = pr.a30 ? pr.a30.depth : run.depth;
  if (have.length >= A30_MAX) { // tre förbund: altaret kan bryta ett (både förbannelsen och välsignelsen försvinner)
    openUI(() => CardUI.choice({ title: 'FÖRBUNDETS ALTARE', subtitle: 'DU BÄR REDAN TRE FÖRBUND – ALTARET KAN BRYTA ETT', cancel: have.length,
      options: have.map(id => ({ label: 'BRYT: ' + a30Label(A30_BY[id]), text: 'BÅDE FÖRBANNELSEN OCH VÄLSIGNELSEN FÖRSVINNER' })).concat({ label: 'GÅ DÄRIFRÅN', text: '' }) },
    i => { if (i < have.length) a30Break(pr, have[i]); close(); }));
    return;
  }
  const offers = a30Offers(d);
  openUI(() => CardUI.choice({ title: 'FÖRBUNDETS ALTARE', subtitle: `EN FÖRBANNELSE FÖR EN VÄLSIGNELSE – RESTEN AV RUNDAN (${have.length} AV ${A30_MAX})`, cancel: offers.length,
    options: offers.map(id => ({ label: a30Label(A30_BY[id]), text: A30_BY[id].id === 'dark' && a30Hc() ? 'FIENDERNA TÅL MER – ETT SLUMPAT KORT NÄR VÅNINGEN ÄR KLAR' : A30_BY[id].text })).concat({ label: 'GÅ DÄRIFRÅN', text: 'ALTARET STÅR KVAR' }) },
  i => { if (i < offers.length) a30Take(pr, offers[i]); close(); }));
}
function a30Take(pr, id) {
  const R = a30Run(), p = A30_BY[id]; if (!R || !p || R.pacts.includes(id) || R.pacts.length >= A30_MAX) return false;
  R.pacts.push(id); R.hist = (R.hist || []).concat({ id, d: run.depth }); if (pr) pr.used = true;
  A30.st.taken++; stat('a30pacts'); profile.a30pairs = Object.assign({}, profile.a30pairs, { [id]: ((profile.a30pairs || {})[id] || 0) + 1 });
  recomputeMods(); P.hp = Math.min(P.hp, maxHp());
  a30Apply([id], true); // gäller redan på den här våningen
  play('secret', 0.7, 0.55); play('stinger', 0.4, 1.3); if (pr) spawnPuff(pr.x, pr.y, 8);
  say('FÖRBUND: ' + a30Label(p), 4); logEvent('FÖRBUND: ' + a30Label(p));
  return true;
}
function a30Break(pr, id) {
  const R = a30Run(); if (!R || !R.pacts.includes(id)) return false;
  R.pacts = R.pacts.filter(x => x !== id); if (pr) pr.used = true; A30.st.broken++;
  recomputeMods(); P.hp = Math.min(P.hp, maxHp());
  play('glass_break', 0.6, 0.8); if (pr) spawnPuff(pr.x, pr.y, 8); say('FÖRBUNDET ÄR BRUTET: ' + a30Label(A30_BY[id]), 3); logEvent('FÖRBUND BRUTET');
  return true;
}
// förbundens verkan på våningen (vid start, och direkt när ett förbund tas: live)
function a30Apply(ids, live) {
  if (!lvl || lvl.hub) return;
  const rng = RNG(RNG.hash(run.seed + ':förbund30:' + run.depth + (live ? ':' + ids.join() : '')));
  const plain = e => !e.dead && !e.boss && !e.guardian && !e.elite && !e.minion && !e.dormant && !e.dummy && !e.s29home && !e.s29boss && ENEMY_DEFS[e.type];
  for (const id of ids) {
    if (id === 'dark' && !a30Hc() && !lvl.a30dark && typeof lvl.ambient === 'number') { lvl.a30dark = true; lvl.ambient *= A30_CFG.darkK; }
    if (id === 'dark' && a30Hc() && live) for (const e of ents) if (!e.dead && !e.a30hc && ENEMY_DEFS[e.type]) { e.a30hc = true; e.hp *= A30_CFG.hcHpK; e.maxHp *= A30_CFG.hcHpK; }
    if (id === 'swift' && live) for (const e of ents) if (!e.dead && !e.boss && !e.a30sw && e.d) { e.a30sw = true; e.d = { ...e.d, speed: e.d.speed * A30_CFG.swiftK }; }
    if (id === 'tyrant' && live) for (const e of ents) if (!e.dead && (e.boss || e.guardian) && !e.a30ty) { e.a30ty = true; e.hp *= A30_CFG.tyrantK; e.maxHp *= A30_CFG.tyrantK; }
    if (id === 'elite' && !boss) { // var femte vanliga fiende blir en elit (samma plats; sovande och patrullerande behåller det)
      for (const e of ents) { if (!plain(e) || e.a30el || e.champion || e.bounty || rng.next() >= A30_CFG.eliteK) continue; a30Elite(e, rng); A30.st.elites++; }
      for (const c of chests) if (!c.locked && !c.open) { c.rare = true; c.cursed = false; }
    }
    if (id === 'horde' && !boss) a30Horde(rng, plain);
  }
}
function a30Elite(e, rng) { // som makeElite, men på samma fiende (samma objekt och typ: trupper, roller och poletter behåller sina referenser)
  const m = rng.pick(ELITE_MODS), giant = m.id === 'giant'; e.a30el = true; e.elite = m;
  e.hp = e.maxHp = e.maxHp * (m.id === 'tough' ? 4 : 2.4) * (giant ? 2 : 1);
  if (m.id === 'shielded') e.eshield = e.eshieldMax = e.maxHp * 0.6;
  if (m.id === 'evasive') e.dodgy = true;
  e.d = { ...e.d, size: e.d.size * 1.3 * (giant ? 1.4 : 1), speed: e.d.speed * (m.id === 'fast' ? 1.7 : 1) * (giant ? 0.75 : 1), dmg: e.d.dmg * (m.id === 'brute' ? 1.8 : 1.2) * (giant ? 1.4 : 1) * (asc() >= 4 ? 1.2 : 1), cd: e.d.cd * (m.id === 'fast' ? 0.7 : 1) };
}
function a30Horde(rng, plain) { // 30 % fler fiender
  const n = a30Spawn(rng, plain, Math.round(ents.filter(e => plain(e) && !s29GuardRoom(e.x | 0, e.y | 0) && !s29InArena(e.x, e.y)).length * A30_CFG.hordeK), 'a30horde'); A30.st.horde += n;
}
function a30Spawn(rng, plain, want, tag) { // fler fiender bredvid de som redan finns (inte i väktarens sal, en arena eller nära spelaren); även ÄNDLÖST (0478)
  const base = ents.filter(e => plain(e) && !s29GuardRoom(e.x | 0, e.y | 0) && !s29InArena(e.x, e.y)); let k = 0;
  for (let tries = 0; k < want && tries < want * 8 && base.length; tries++) {
    const e = base[(rng.next() * base.length) | 0], a = rng.next() * TAU, r = 0.8 + rng.next() * 0.9, x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r;
    if (x < 1 || y < 1 || x >= mw - 1 || y >= mh - 1 || !freeSpot(x, y, 0.3) || !hasLOS(e.x, e.y, x, y) || s29GuardRoom(x | 0, y | 0) || s29InArena(x, y) || Math.hypot(x - P.x, y - P.y) < 6 || map[y | 0][x | 0] !== '.') continue;
    const o = makeEnemy(e.type, x, y); o[tag] = true; o.sleep = e.sleep; ents.push(o); totalEnemies++; k++;
  }
  return k;
}
// FIENDERNA EXPLODERAR NÄR DE DÖR: en glöd i en halv sekund, sedan en liten smäll som bara skadar spelaren
function a30Boom(e) {
  if (A30.blasts.length >= 16) return;
  A30.blasts.push({ x: e.x, y: e.y, t: A30_CFG.boomT, lvl });
}
function a30Tick(dt) {
  if (!A30.on || A30.lvl !== lvl || state !== 'play') return;
  if (!A30.blasts.length) return;
  A30.glowT -= dt; const glow = A30.glowT <= 0 && !settings.lowfx; if (glow) A30.glowT = 0.08;
  for (const b of A30.blasts) {
    b.t -= dt;
    if (b.t > 0) { if (glow) particles.push({ x: b.x + rnd(-0.15, 0.15), y: b.y + rnd(-0.15, 0.15), z: rnd(0.05, 0.3), vx: 0, vy: 0, vz: 0.4, life: 0.3, maxLife: 0.3, img: fx.hit[1], size: 0.06, add: true, tint: [255, 120, 40] }); continue; }
    A30.st.booms++; play('boom', 0.35, 1.5, { x: b.x, y: b.y }); spawnPuff(b.x, b.y, settings.lowfx ? 3 : 6);
    if (!settings.noFlash) flashes.push({ x: b.x, y: b.y, t: 0.15, r: 2 });
    const pd = Math.hypot(P.x - b.x, P.y - b.y);
    if (pd < A30_CFG.boomR) { A30.st.boomHits++; run.cause = 'ETT EXPLODERANDE LIK'; hurtPlayer(Math.min(A30_CFG.boomMax, A30_CFG.boomDmg + A30_CFG.boomPer * run.depth) * (1 - 0.4 * pd / A30_CFG.boomR), b.x, b.y); }
  }
  A30.blasts = A30.blasts.filter(b => b.t > 0);
}
// synligheten: pausen, rundans detaljer, statistiken och dödsskärmen
const a30Lines = () => a30Pacts().map(id => A30_BY[id] ? 'FÖRBUND: ' + a30Label(A30_BY[id]) : '').filter(Boolean);
function a30PauseDraw() { // pausbilden: FÖRBUND och ett förbund per rad (två rader om det inte får plats)
  const ids = a30Pacts().filter(id => A30_BY[id]); if (!ids.length) return;
  const pk = settings.reduceMotion || MF.st !== 'pause' ? 1 : clamp((performance.now() - MF.stT) / 280, 0, 1), ls = [];
  for (const id of ids) { const p = A30_BY[id], one = a30Label(p); if (textW(one) <= W - 12) ls.push(one); else ls.push(a30Curse(p) + ' –', p.bless); }
  const hd = 'FÖRBUND'; txt(hd, (W - textW(hd)) / 2, 140, '#a080e0', 1, true, pk);
  ls.forEach((l, i) => txt(l, (W - textW(l)) / 2, 151 + i * 10, '#c8a0ff', 1, true, pk));
}
function a30RunOver(r) { // dödsskärmen: förbunden (och ÄNDLÖST:s poäng och topplista, 0478)
  const ro = document.getElementById('runover'); if (!ro) return;
  let el = document.getElementById('a30ro');
  if (!el) { el = document.createElement('div'); el.id = 'a30ro'; el.className = 'es-tip'; el.style.cssText = 'line-height:1.8;color:#c8a0ff;max-width:min(94vw,760px)'; const s = document.getElementById('ro-souls'); if (s && s.parentNode === ro) s.after(el); else ro.appendChild(el); }
  el.textContent = ''; el.hidden = true;
  const R = r && r.a30, ids = R && Array.isArray(R.pacts) ? R.pacts.filter(id => A30_BY[id]) : [];
  if (ids.length) { el.appendChild(Object.assign(document.createElement('div'), { textContent: 'FÖRBUND: ' + ids.map(id => a30Label(A30_BY[id])).join(' · ') })); el.hidden = false; }
  if (r && r.a30e && typeof a30eRunOver === 'function') { a30eRunOver(r, el); el.hidden = false; }
}
function a30StatRows(p) {
  const rows = [{ label: 'FÖRBUNDEN', head: true, color: '#c8a0ff' }, { label: 'FÖRBUND TAGNA', text: String(p.a30pacts || 0) }];
  const top = Object.entries(p.a30pairs || {}).filter(([id]) => A30_BY[id]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  for (const [id, n] of top) rows.push({ label: a30Label(A30_BY[id]), text: `${n} GÅNG${n > 1 ? 'ER' : ''}` });
  const sv = store.get(runKey(), null), act = sv && sv.run && sv.run.a30 && Array.isArray(sv.run.a30.pacts) ? sv.run.a30.pacts.filter(id => A30_BY[id]) : [];
  if (act.length) rows.push({ label: 'DEN PÅGÅENDE RUNDANS FÖRBUND', text: '' }, ...act.map(id => ({ label: a30Label(A30_BY[id]), text: '', color: '#c8a0ff' })));
  if (typeof a30eStatRows === 'function') rows.push(...a30eStatRows(p));
  return rows;
}
function a30Api() {
  return { S: A30, pairs: A30_PAIRS.map(p => p.id), CH: A30_ALTAR, set: (k, v) => { A30[k] = v; }, by: id => A30_BY[id],
    state: () => ({ on: A30.on, pacts: a30Pacts().slice(), lines: a30Lines(), altar: A30.altarPr ? { x: A30.altarPr.cx, y: A30.altarPr.cy, used: !!A30.altarPr.used, depth: A30.altarPr.a30 && A30.altarPr.a30.depth } : null,
      blasts: A30.blasts.length, st: { ...A30.st }, normal: a30NormalFloor(), run: run && run.a30 ? JSON.parse(JSON.stringify(run.a30)) : null }),
    offers: d => a30Offers(d === undefined ? run.depth : d), take: id => a30Take(A30.altarPr, id), give: id => a30Take(null, id), brk: id => a30Break(null, id), use: () => USES.a30altar(A30.altarPr),
    place: () => a30Place(RNG(RNG.hash(run.seed + ':altare30:' + run.depth)), null), placeNear: (x, y) => a30Place(null, [x, y]), runOver: () => { const el = document.getElementById('a30ro'); return el && !el.hidden ? el.textContent : ''; },
    statRows: () => a30StatRows(profile), pauseLines: () => a30Lines(), extras: () => pauseExtras(), e: () => (typeof a30eApi === 'function' ? a30eApi() : null) };
}
{ // inlindningar (krokar utan att ändra andras delar)
  const A30w = { startLevel, recomputeMods, makeEnemy, makeBoss, makeGuardian, killEnemy, hurtEnemy, explode, heal, drinkPotion, openChest, floorDone, updateV28, drawPause, pauseMenu, pauseExtras };
  startLevel = function (level) { const out = A30w.startLevel(level); try { a30Start(); } catch (e) { console.error(e); } return out; };
  recomputeMods = function () { A30w.recomputeMods(); if (!A30.on || !run) return; for (const id of a30Pacts()) { const p = A30_BY[id]; if (p) for (const [k, v] of Object.entries(p.mods)) M[k] = (M[k] || 0) + v; }
    if (a30Pacts().length) for (const [k, lo] of Object.entries(A30_FLOOR)) if (M[k] < lo) M[k] = lo; };
  makeEnemy = function (type, x, y) {
    const e = A30w.makeEnemy(type, x, y);
    if (A30.on && run && e && e.d && a30Pacts().length) {
      if (a30Has('swift') && !e.a30sw) { e.a30sw = true; e.d = { ...e.d, speed: e.d.speed * A30_CFG.swiftK }; }
      if (a30Has('dark') && a30Hc() && !e.a30hc) { e.a30hc = true; e.hp *= A30_CFG.hcHpK; e.maxHp *= A30_CFG.hcHpK; }
    }
    return e;
  };
  makeBoss = function (x, y) { const b = A30w.makeBoss(x, y); if (b && a30Has('tyrant')) { b.a30ty = true; b.hp *= A30_CFG.tyrantK; b.maxHp *= A30_CFG.tyrantK; } return b; };
  makeGuardian = function (x, y) { const g = A30w.makeGuardian(x, y); if (g && a30Has('tyrant')) { g.a30ty = true; g.hp *= A30_CFG.tyrantK; g.maxHp *= A30_CFG.tyrantK; } return g; };
  killEnemy = function (e) { const out = A30w.killEnemy(e); if (e && a30Has('boom') && !e.boss && !e.dummy && !e.decoy && run && !run.practice && A30.lvl === lvl) a30Boom(e); return out; };
  hurtEnemy = function (e, dmg, hx, hy, opt) { if ((A30.boomCtx > 0 || (opt && opt.boom)) && a30Has('swift')) dmg *= 2; return A30w.hurtEnemy(e, dmg, hx, hy, opt); };
  explode = function (...a) { A30.boomCtx++; try { return A30w.explode(...a); } finally { A30.boomCtx--; } };
  heal = function (n, silent) { if (A30.pot > 0 && a30Has('nopot')) { A30.st.potBlocked++; return 0; } return A30w.heal(n, silent); };
  drinkPotion = function () { const b0 = A30.st.potBlocked; A30.pot++; try { return A30w.drinkPotion(); } finally { A30.pot--; if (A30.st.potBlocked > b0) say('FÖRBUNDET: DRYCKEN LÄKER INTE', 2); } };
  openChest = function (c) { if (c && !c.locked && !c.open && a30Has('elite')) { c.rare = true; c.cursed = false; } return A30w.openChest(c); };
  floorDone = function () { // +1 KORT VID VARJE VÅNINGSSLUT
    const out = A30w.floorDone();
    if (state === 'stats' && stats && a30Has('dark') && run && !run.practice) { const c = drawCards(1)[0]; if (c) { gainCard(c); A30.st.cards++; (stats.extra = stats.extra || []).unshift('FÖRBUNDET: +1 KORT – ' + c.name); } }
    return out;
  };
  updateV28 = function (dt) { A30w.updateV28(dt); a30Tick(dt); };
  drawPause = function () { A30w.drawPause(); a30PauseDraw(); };
  pauseMenu = function () { // pausmenyn: förbunden under raden om rundan
    A30w.pauseMenu();
    const ls = a30Lines(), box = document.querySelector('#cardui .cu-choice .cu-sub'); if (!ls.length || !box) return;
    const p = document.createElement('p'); p.className = 'cu-sub a30-sub'; p.style.color = '#c8a0ff'; p.textContent = ls.join(' · '); box.after(p);
  };
  pauseExtras = function () { const out = A30w.pauseExtras(); return a30Lines().concat(out); };
}
