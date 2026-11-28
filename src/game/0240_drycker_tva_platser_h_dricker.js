// ---------- Drycker: två platser, H dricker, J byter ----------
const POTIONS = {
  heal: { name: 'LÄKEDRYCK', text: '+50 HÄLSA', color: '#e04848', tint: [255, 80, 80], snd: 'drink' },
  rage: { name: 'RASERIDRYCK', text: '+50 % SKADA I 8 S', color: '#ff9030', tint: [255, 140, 40], snd: 'potion_rage' },
  ghost: { name: 'OSYNLIGHETSDRYCK', text: 'FIENDERNA TAPPAR DIG I 6 S', color: '#b070ff', tint: [170, 110, 255], snd: 'potion_ghost' },
  speed: { name: 'SNABBHETSDRYCK', text: '+40 % FART I 8 S', color: '#60e060', tint: [100, 255, 120], snd: 'potion_speed' },
  ice: { name: 'ISDRYCK', text: 'FRYSER FIENDER RUNT DIG, +30 RUSTNING', color: '#70e0ff', tint: [120, 220, 255], snd: 'potion_ice' },
};
const POTION_IDS = Object.keys(POTIONS);
const potKnown = id => (profile.potions || []).includes(id);
const potSlots = () => 2 + meta('potslot');
const potName = p => potKnown(p.id) ? (p.strong ? 'STARK ' : '') + POTIONS[p.id].name : (p.strong ? 'STARK ' : '') + 'OKÄND DRYCK';
const randomPotion = (r = Math.random) => r() < 0.34 ? 'heal' : POTION_IDS[1 + ((r() * 4) | 0)];
const hudImg = {};
let potBtn = null;
function givePotion(id, strong, silent) {
  P.potions = P.potions || [];
  if (P.potions.length >= potSlots()) { if (!silent && (P.potMsgT || 0) < tmr) { P.potMsgT = tmr + 3; say('DRYCKESPLATSERNA ÄR FULLA – DRICK MED H', 1.5); } return false; }
  P.potions.push({ id, strong: !!strong });
  if (!silent) { say(`DU FICK: ${potName(P.potions[P.potions.length - 1])}`, 2); play('pickup', 0.6, 1.3); }
  return true;
}
function drinkPotion() {
  if (state !== 'play') return;
  if (!P.potions || !P.potions.length) { if ((P.potMsgT || 0) < tmr) { P.potMsgT = tmr + 1.5; say('DU HAR INGA DRYCKER', 1); play('click', 0.4, 0.8); } return; }
  if ((P.drinkCd || 0) > tmr) return; P.drinkCd = tmr + 0.6;
  const p = P.potions.shift(), d = POTIONS[p.id], k = (1 + mod('potionPower')) * (p.strong ? 1.6 : 1);
  const first = !potKnown(p.id); if (first) { profile.potions = (profile.potions || []).concat(p.id); saveProfile(); }
  play('drink', 0.8); if (d.snd !== 'drink') setTimeout(() => play(d.snd, 0.7), 280);
  stat('potions_n'); vib('potion'); run.potionsDrunk = (run.potionsDrunk || 0) + 1; P.potFlash = { tint: d.tint, t: 0.7 }; WS.kick = Math.max(WS.kick, 0.15);
  if (p.id === 'heal') { const n = Math.round(heal(50 * k * (1 + mod('healMul')))); spawnText(P.x + Math.cos(P.a), P.y + Math.sin(P.a), `+${n} HP`, '#ff7060'); }
  else if (p.id === 'rage') P.rageT = 8 * k;
  else if (p.id === 'ghost') { P.ghostT = 6 * k; for (const e of ents) if (!e.dead && !e.boss && e.alert && !e.guardian) { e.alert = false; e.lostT = 0; e.searchT = 2; e.state = 'idle'; } }
  else if (p.id === 'speed') P.speedT = 8 * k;
  else if (p.id === 'ice') { P.coolT = 12;
    const r = 4 * Math.sqrt(k); for (const e of ents) if (!e.dead && !e.dormant && Math.hypot(e.x - P.x, e.y - P.y) < r) freeze(e, 3 * k);
    P.armor = Math.min(200, P.armor + Math.round(30 * k)); play('freeze', 0.7, 0.8);
    for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; particles.push({ x: P.x, y: P.y, z: 0.3, vx: Math.cos(a) * r * 1.5, vy: Math.sin(a) * r * 1.5, vz: 0, life: 0.6, maxLife: 0.6, img: fx.parts.ice ? fx.parts.ice[i % 3] : fx.hit[1], size: 0.08, add: !fx.parts.ice, tint: [170, 230, 255], fade: true }); }
  }
  say((first ? 'NY DRYCK UPPTÄCKT: ' : '') + `${(p.strong ? 'STARK ' : '') + d.name} – ${d.text}`, 2.5);
  checkAch();
}
function swapPotion() {
  if (!P.potions || P.potions.length < 2) { say(P.potions && P.potions.length ? 'DU HAR BARA EN DRYCK' : 'DU HAR INGA DRYCKER', 1); return; }
  P.potions.push(P.potions.shift()); play('click', 0.5, 1.4); say('NÄSTA DRYCK: ' + potName(P.potions[0]), 1.2);
}
function updatePotions(dt) {
  if (!potBtn) potBtn = document.querySelector('#touch .potb'); if (potBtn) potBtn.classList.toggle('empty', !(P.potions && P.potions.length));
  if (P.potFlash) { P.potFlash.t -= dt; if (P.potFlash.t <= 0) P.potFlash = null; }
  for (const k of ['rageT', 'ghostT', 'speedT']) if (P[k] > 0) { P[k] -= dt; if (P[k] <= 0) { P[k] = 0; say({ rageT: 'RASERIET LÄGGER SIG', ghostT: 'DU SYNS IGEN', speedT: 'FARTEN AVTAR' }[k], 1.2); } }
  if (P.rageT > 0 && !settings.lowfx && Math.random() < dt * 8) particles.push({ x: P.x + Math.cos(P.a) * 0.6 + rnd(-0.3, 0.3), y: P.y + Math.sin(P.a) * 0.6 + rnd(-0.3, 0.3), z: rnd(0.1, 0.4), vx: 0, vy: 0, vz: 0.6, life: 0.4, maxLife: 0.4, img: fx.hit[1], size: 0.04, add: true, tint: [255, 90, 40], fade: true });
}
function drawPotionHud(g) { // dryckerna i listen och färgen i bilden
  const fxOn = [P.rageT > 0 && POTIONS.rage, P.ghostT > 0 && POTIONS.ghost, P.speedT > 0 && POTIONS.speed].filter(Boolean);
  for (const d of fxOn) { const [r, gg, b] = d.tint; g.fillStyle = `rgba(${r},${gg},${b},0.07)`; g.fillRect(0, 0, W, VH); g.strokeStyle = `rgba(${r},${gg},${b},0.35)`; g.lineWidth = 3; g.strokeRect(1.5, 1.5, W - 3, VH - 3); g.lineWidth = 1; }
  if (P.potFlash) { const [r, gg, b] = P.potFlash.tint; g.fillStyle = `rgba(${r},${gg},${b},${0.3 * P.potFlash.t})`; g.fillRect(0, 0, W, VH); }
  const n = potSlots(), x0 = 6, y = HL ? HL.potY : VH - 16; // vid hälsohörnet
  if (!(P.potions && P.potions.length) && !settings.potHud) return;
  for (let i = 0; i < n; i++) {
    const p = P.potions && P.potions[i], x = x0 + i * 11;
    g.fillStyle = i === 0 ? 'rgba(80,60,40,0.75)' : 'rgba(30,22,18,0.6)'; g.fillRect(x, y, 10, 12);
    if (!p) continue;
    const im = hudImg[potKnown(p.id) ? 'potion_' + p.id : 'potion_unknown'] || hudImg['potion_' + p.id];
    if (im) g.drawImage(im, x + 1, y, 8, 12);
    else { g.fillStyle = potKnown(p.id) ? POTIONS[p.id].color : '#909090'; g.fillRect(x + 3, y + 4, 4, 7); g.fillRect(x + 4, y + 1, 2, 3); }
    if (p.strong) { g.fillStyle = '#ffe070'; g.fillRect(x + 8, y, 2, 2); }
  }
  if (!isTouch()) txt(keyName((settings.binds || {}).KeyH || 'KeyH'), x0 + n * 11 + 2, y + 3, '#c9a87a', 1, true, 0.7);
}

// ---------- NPC:er: alkemisten och prästen ----------
const NPC_LINES = {
  merchant: ['KÖP NÅGOT, VANDRARE', 'MINA PRISER ÄR DE BÄSTA HÄR NERE', 'DU SER UT ATT BEHÖVA KRUT', 'GULD ÄR GULD, ÄVEN BLAND DE DÖDA'],
  alchemist: ['BUBBEL... BUBBEL...', 'VILL DU SMAKA? DET ÄR NÄSTAN SÄKERT', 'TVÅ DRYCKER BLIR EN STARKARE', 'JAG HAR NÅGOT FÖR VARJE KRÄMPA'],
  priest: ['LETA EFTER KRÖNIKANS SIDOR – DE BERÄTTAR SANNINGEN', 'MÅ LJUSET VAKA ÖVER DIG', 'JAG KAN LYFTA DIN FÖRBANNELSE – MOT EN GÅVA', 'KNÄFALL, OCH BLI VÄLSIGNAD', 'DE DÖDA VILAR INTE HÄR NERE'],
  gambler: ['SATSA, VÄN – TURVEN VÄNDER ALLTID', 'TÄRNINGARNA LJUGER ALDRIG. NÄSTAN ALDRIG.', 'ETT SPEL TILL?'],
  banker: ['HOS MIG ÄR GULDET TRYGGT', 'RÄNTA PÅ RÄNTA, VÄN', 'DÖDA KAN INTE TA DET JAG VAKTAR'],
  wanderer: ['HAR DU SETT VÄGEN TILL BORGEN?', 'JAG HAR GÅTT HÄR LÄNGE...', 'LYKTAN VISAR VÄGEN, MEN INTE UT'],
  prisoner: ['HJÄLP MIG, SNÄLLA!', 'NYCKELN... NÅGON TOG NYCKELN', 'SLÄPP UT MIG SÅ HJÄLPER JAG DIG'],
};
const NPC_OF = { '£': 'alchemist', '€': 'priest', '[': 'prisoner', 'ç': 'gambler', 'ÿ': 'banker', 'ý': 'wanderer' };
let npcTalkT = 0;
function updateNpcTalk(dt) {
  npcTalkT -= dt; if (npcTalkT > 0) return; npcTalkT = 0.5;
  const talk = (o, kind, x, y) => { if ((o.talkT || 0) > tmr || Math.hypot(x - P.x, y - P.y) > 3.2 || !hasLOS(P.x, P.y, x, y)) return false;
    o.talkT = tmr + 25; const mood = Math.random() < 0.4 ? npcMood() : null, ls = mood ? [mood] : NPC_LINES[kind]; say(`${{ merchant: 'KÖPMANNEN', alchemist: 'ALKEMISTEN', priest: 'PRÄSTEN', prisoner: 'FÅNGEN', gambler: 'SPELAREN', banker: 'BANKIREN', wanderer: 'VANDRAREN' }[kind]}: "${ls[(Math.random() * ls.length) | 0]}"`, 3);
    play(kind === 'alchemist' ? 'npc_alchemist' : kind === 'priest' ? 'npc_priest' : kind === 'prisoner' ? 'prisoner' : 'npc_alchemist', 0.5, kind === 'merchant' ? 0.8 : 1, { x, y }); return true; };
  for (const m of merchants) if (!m.shadow && talk(m, 'merchant', m.x, m.y)) return;
  for (const pr of props) if (pr.def && NPC_OF[pr.ch] && !pr.used && talk(pr, NPC_OF[pr.ch], pr.x, pr.y)) return;
}
const npcDisc = () => clamp(mod('npcDiscount'), 0, 0.6);
function openAlchemist(pr) {
  if (!pr.stock) { const r = RNG(RNG.hash(run.seed + ':alk:' + run.depth)); pr.stock = [randomPotion(() => r.next()), randomPotion(() => r.next()), randomPotion(() => r.next())]; if (!pr.stock.includes('heal')) pr.stock[0] = 'heal'; }
  const price = id => Math.round((id === 'heal' ? 30 : 42) * (1 - npcDisc()) * (1 + run.depth * 0.04));
  const items = () => [
    ...pr.stock.map((id, i) => ({ kind: 'potion', act: 'buy', idx: i, color: potKnown(id) ? POTIONS[id].color : '#a0a0a0', label: potKnown(id) ? POTIONS[id].name : 'OKÄND DRYCK', text: potKnown(id) ? POTIONS[id].text : 'DRICK DEN FÖR ATT LÄRA DIG VAD DEN GÖR', price: price(id) })),
    { kind: 'blend', act: 'blend', label: 'BLANDA DRYCKER', text: (P.potions || []).length >= 2 ? `${potName(P.potions[0])} + ${potName(P.potions[1])} BLIR EN STARK DRYCK (+60 %)` : 'BÄR TVÅ DRYCKER SÅ BLANDAR JAG DEM TILL EN STARKARE', price: Math.round(20 * (1 - npcDisc())) },
    { kind: 'potion', act: 'mystery', color: '#c080ff', label: 'ALKEMISTENS EXPERIMENT', text: 'EN STARK, OKÄND DRYCK', price: Math.round(55 * (1 - npcDisc())) },
  ];
  play('npc_alchemist', 0.6);
  openUI(() => CardUI.shop(items(), run.gold, item => {
    if (run.gold < item.price) return { ok: false, gold: run.gold };
    if (item.act === 'buy' || item.act === 'mystery') {
      const id = item.act === 'buy' ? pr.stock[item.idx] : randomPotion();
      if (!givePotion(id, item.act === 'mystery', true)) return { ok: false, gold: run.gold, msg: 'DRYCKESPLATSERNA ÄR FULLA' };
      run.gold -= item.price; play('buy', 0.8); play('pickup', 0.5, 1.3); if (item.act === 'buy') pr.stock.splice(item.idx, 1); stat('potionsBought');
      return { ok: true, gold: run.gold, items: items(), msg: 'DU FICK: ' + potName(P.potions[P.potions.length - 1]) };
    }
    if (item.act === 'blend') {
      if ((P.potions || []).length < 2) return { ok: false, gold: run.gold, msg: 'DU BEHÖVER TVÅ DRYCKER' };
      run.gold -= item.price; const a = P.potions.shift(), b = P.potions.shift(), id = a.id === b.id || Math.random() < 0.5 ? a.id : b.id;
      P.potions.unshift({ id, strong: true }); play('potion_ice', 0.6, 1.3); play('npc_alchemist', 0.5); stat('blends');
      return { ok: true, gold: run.gold, items: items(), msg: 'DU FICK: ' + potName(P.potions[0]) };
    }
    return { ok: false, gold: run.gold };
  }, () => closeUI(), { title: 'ALKEMISTEN', currency: 'GULD' }));
}
function openPriest(pr) {
  const curses = [...new Set(run.owned)].map(id => Cards.byId(id)).filter(c => c && c.curse);
  const cPrice = Math.round((50 + 12 * run.depth) * (1 - npcDisc())), bPrice = Math.round(40 * (1 - npcDisc()));
  play('npc_priest', 0.6);
  openUI(() => CardUI.choice({ title: 'PRÄSTEN', subtitle: `"MÅ LJUSET VAKA ÖVER DIG." · ${run.gold} GULD`, cancel: 2,
    options: [
      { label: `LYFT EN FÖRBANNELSE (${cPrice} GULD)`, text: curses.length ? `TA BORT ETT FÖRBANNAT KORT (${curses.length} I LEKEN)` : 'DU BÄR INGA FÖRBANNELSER' },
      { label: run.blessed ? 'REDAN VÄLSIGNAD' : `VÄLSIGNELSE (${bPrice} GULD)`, text: run.blessed ? 'EN VÄLSIGNELSE PER RUNDA' : '+20 MAX HP RESTEN AV RUNDAN, OCH FULL HÄLSA' },
      { label: 'GÅ DÄRIFRÅN', text: '' },
    ] }, i => {
    if (i === 0 && curses.length && run.gold >= cPrice) {
      setTimeout(() => CardUI.draft(curses, { title: 'LYFT EN FÖRBANNELSE', subtitle: 'VÄLJ KORTET SOM SKA BORT', skipLabel: 'ÅNGRA' }, c => {
        if (c) { run.gold -= cPrice; run.owned.splice(run.owned.indexOf(c.id), 1); recomputeMods(); play('bless', 0.8); P.flash = 0.2; say(c.name + ' ÄR LYFT', 2.5); stat('cursesLifted'); }
        closeUI(); }), 50);
      return;
    }
    if (i === 1 && !run.blessed && run.gold >= bPrice) { run.gold -= bPrice; run.blessed = 1; heal(maxHp()); play('bless', 0.9); P.flash = 0.3; say('DU ÄR VÄLSIGNAD: +20 MAX HP', 3); stat('blessings'); spawnPuff(P.x + Math.cos(P.a), P.y + Math.sin(P.a), 8); }
    else if (i < 2 && !(i === 0 && !curses.length) && !(i === 1 && run.blessed)) { say('FÖR LITE GULD', 1.5); play('click', 0.5, 0.6); }
    closeUI();
  }));
}
function openPetCage(pr) {
  const have = run.pet, pool = PET_IDS.filter(id => id !== have), id = pool[RNG(RNG.hash(run.seed + ':bur:' + run.depth)).int(0, pool.length - 1)];
  openUI(() => CardUI.choice({ title: 'DJURBUREN', subtitle: `${PETS[id].name} SITTER INSPÄRRAD`, cancel: 1,
    options: [{ label: 'BEFRIA ' + PETS[id].name, text: `${PETS[id].text} · RESTEN AV RUNDAN${have ? ` · DIN ${PETS[have].name} ÅKER HEM` : ''}` }, { label: 'LÅT DEN VARA', text: '' }] }, i => {
    closeUI(); if (i !== 0) return;
    pr.used = true; play('gate', 0.6, 1.4, { x: pr.x, y: pr.y }); run.petXp = Math.max(run.petXp || 0, 6);
    givePet(id, 'DU BEFRIADE'); if (pet) { pet.x = pr.x; pet.y = pr.y; if (solid(pet.x, pet.y)) { pet.x = P.x; pet.y = P.y; } }
    profile.pets = [...new Set([...(profile.pets || []), id])]; saveProfile();
  }));
}

// ---------- Vägval: två portaler mot olika biomer ----------
const BIOME_RISK = { prison: 2, harbor: 3, bathhouse: 2, purgatory: 3, abattoir: 2, battlefield: 3, sewer: 3, desert: 3, mine: 3, observatory: 2, circus: 2, jungle: 3, ship: 3, lab: 3, garden: 2, dream: 3, cathedral: 3, hive: 2, library: 2, foundry: 3, fungus: 2, mirror: 3, clock: 2, sky: 3, crystal: 2, sunken: 3, tomb: 2, volcano: 3, dungeon: 1, caves: 1, forest: 1, graveyard: 2, courtyard: 2, swamp: 3, frost: 3 };
const riskText = b => ['', 'LUGN VÄG', 'FARLIG VÄG: +15 % GULD', 'SVÅR VÄG: +30 % GULD OCH FLER ELITER'][BIOME_RISK[b] || 1];
function routePortals(p) { // en andra portal mot en annan biom
  if (run && run.abyss) return; // Avgrunden slumpar sina biomer
  if (!run || run.bossrush || run.practice || isBossDepth(run.depth + 1) || params.get('biome')) return;
  const next = run.depth + 1, def = biomeFor(next), r = RNG(RNG.hash(run.seed + ':väg:' + next));
  const alt = r.pick(BIOME_IDS.filter(b => b !== def));
  for (const ang of [P.a + Math.PI / 2, P.a - Math.PI / 2, P.a + Math.PI, P.a]) {
    const x = p.x + Math.cos(ang) * 2.2, y = p.y + Math.sin(ang) * 2.2;
    if (freeSpot(x, y, 0.35) && hasLOS(p.x, p.y, x, y)) { p.biome = def; portals.push({ x, y, kind: 'floor', biome: alt, t: 0, armed: Math.hypot(P.x - x, P.y - y) > 1 }); spawnPuff(x, y, 8); say('TVÅ PORTALER – VÄLJ VÄG', 3); return; }
  }
}
const goldRisk = () => run && lvl && !boss ? [0, 0, 0.15, 0.3][(run.route && run.route[run.depth]) || 0] || 0 : 0;

// ---------- Hemlig handlare (syns bara i mörker) och förgiftade brunnar ----------
function addPropAt(ch, x, y) { // ny rekvisita under spelets gång
  const d = PROP_DEFS[ch], frames = fx.props[d.img] || fx.props[d.fb]; if (!frames) return null;
  const o = { x: x + 0.5, y: y + 0.5, cx: x, cy: y, ch, def: d, frames, img: frames[0], size: d.size, flip: false, ph: Math.random() * 10 };
  props.push(o); if (d.block) map[y][x] = ch; flowCell = -1;
  if (d.light) { const t = { x: o.x, y: o.y, ph: o.ph, cells: [], hidden: true, str: d.light, r: d.lightR || 4, prop: o }; torches.push(t); const keep = torches.slice(); torches.length = 0; torches.push(t); prepareTorchLight(); torches.length = 0; torches.push(...keep); }
  return o;
}
function setupNpcFloor(lrng) {
  for (const pr of props) if (pr.ch === 'w' && run.depth >= 2 && lrng.chance(0.2)) pr.poisoned = true; // grönt vatten
  if (!boss && run.depth >= 2 && lrng.chance(0.12)) { // den hemliga handlaren står där det är mörkast
    let best = null, bd = 0;
    for (let i = 0; i < 40; i++) { const s = randomFreeCell(lrng); if (!s) continue; const d = Math.min(99, ...torches.filter(t => !t.hidden).map(t => Math.hypot(t.x - s[0], t.y - s[1]))); if (d > bd) { bd = d; best = s; } }
    if (best && bd > 4) { merchants.push({ x: best[0], y: best[1], stock: null, shadow: true }); map[best[1] | 0][best[0] | 0] = 'M'; logEvent('HEMLIG HANDLARE'); }
  }
  if (run.route && run.route[run.depth] === 3) for (const e of ents) if (!e.boss && !e.elite && !e.guardian && lrng.chance(0.08)) { e.hp = e.maxHp = e.maxHp * 1.6; e.veteran = true; } // svår väg: fler härdade fiender
  if (meta('camp') && !boss && !lvl.secret && !props.some(p => p.ch === '¶') && lrng.chance(0.35)) { const sr = lvl.rooms && lvl.rooms.find(r => r.type === 'start'); if (sr) for (let k = 0; k < 30; k++) { const x = sr.x + 1 + ((lrng.next() * (sr.w - 2)) | 0), y = sr.y + 1 + ((lrng.next() * (sr.h - 2)) | 0); if (map[y][x] === '.' && Math.hypot(x + 0.5 - P.x, y + 0.5 - P.y) > 1.5) { addPropAt('¶', x, y); break; } } } // vandrarens eld
  if (run.nextMap) { run.nextMap = false; seen.fill(1); say('KARTOGRAFENS KARTA VISAR VÅNINGEN', 3); }
  allies = allies.filter(a => a.life > 0 && a.keep); for (const a of allies) { a.x = P.x - Math.cos(P.a); a.y = P.y - Math.sin(P.a); }
  if (run.pet) spawnPet(); else pet = null;
  ghostStart(); narrate(); P.secLast = 0;
}
const shadowVisible = m => !m.shadow || lightAt(m.x, m.y) < 0.42;
// ---------- Version 5: kortstatistik, fusion, utmaningslägen, rekord och tillgänglighet ----------
function noteCardPick(card) { // statistik per kort: valt antal gånger (profilen), skada och dödade sedan kortet togs (rundan)
  if (!card || !run) return;
  run.cardAt = run.cardAt || {}; if (!run.cardAt[card.id]) run.cardAt[card.id] = { dmg: run.dmgDealt || 0, kills: run.kills };
  profile.cardPicks = profile.cardPicks || {}; profile.cardPicks[card.id] = (profile.cardPicks[card.id] || 0) + 1;
}
function cardStats() {
  const out = {}; if (!run) return out;
  for (const id of new Set(run.owned)) { const at = (run.cardAt || {})[id] || { dmg: 0, kills: 0 }; out[id] = { dmg: Math.round(((run.dmgDealt || 0) - at.dmg) * 10), kills: run.kills - at.kills, picks: (profile.cardPicks || {})[id] || 0 }; }
  return out;
}
function fuseCard(id) { // två likadana kort blir ett starkare
  const f = Cards.fuse && Cards.fuse(id);
  if (!f || run.owned.filter(x => x === id).length < 2) return false;
  for (let k = 0; k < 2; k++) run.owned.splice(run.owned.indexOf(id), 1);
  run.owned.push(f); run.cardAt = run.cardAt || {}; run.cardAt[f] = run.cardAt[id] || { dmg: run.dmgDealt || 0, kills: run.kills };
  recomputeMods(); play('fuse_cards', 0.8); stat('fusions'); vib('fuse'); logEvent('SMÄLTE: ' + (Cards.byId(f) || {}).name); checkAch();
  return run.owned.slice();
}
const ownedCount = () => { const o = {}; if (run) for (const id of run.owned) o[id] = (o[id] || 0) + 1; return o; };
// utmaningslägen: ett slag, bara pistol, inga kort
const CMODES = { '': { name: 'INGEN UTMANING', text: 'VANLIG RUNDA' }, onehit: { name: 'ETT SLAG', text: '1 HP – EN TRÄFF OCH DU ÄR DÖD. +50 % SJÄLAR' },
  quick: { name: 'SNABB RUNDA', text: 'PORTALEN ÖPPNAS NÄR 60 % AV FIENDERNA ÄR DÖDA. −30 % SJÄLAR' },
  pistol: { name: 'BARA PISTOL', text: 'ANDRA VAPEN BLIR AMMO OCH GULD. +30 % SJÄLAR' }, nocards: { name: 'INGA KORT', text: 'KORTVAL BLIR GULD. +40 % SJÄLAR' },
  dark: { name: 'MÖRKER', text: 'BARA FICKLAMPAN LYSER – FACKLORNA ÄR SLOCKNADE. +35 % SJÄLAR' },
  clock: { name: 'KLOCKAN', text: 'TIO SEKUNDER ATT LEVA – VARJE DÖD GER MER TID, EN AVRÄTTNING FYLLER PÅ ALLT. +60 % SJÄLAR' } };
const CMODE_SOULS = { clock: 1.6, onehit: 1.5, pistol: 1.3, nocards: 1.4, quick: 0.7, dark: 1.35 };
const cmode = id => !!(run && run.cmode && run.cmode.split('+').includes(id)); // lägen kan kombineras: 'onehit+dark'
// vibrationsmönster
const VIB = { pickup: [12], kill: [18, 30, 18], boss: [90, 40, 140], potion: [25, 25, 25], level: [40, 60, 40], fuse: [30, 20, 60], headshot: [10, 15, 30], hurt: null };
function vib(k) { if (settings.vibrate === false || !navigator.vibrate || !VIB[k] || !isTouch()) return; try { navigator.vibrate(VIB[k]); } catch (e) { /* ingen vibration */ } }
// dödsrapporten: vem skadade dig mest
function noteDamage(d, fx0, fy0, kind) {
  if (!run || !(d > 0)) return '';
  let who = kind === 'trap' ? 'FÄLLOR' : 'MILJÖN';
  if (fx0 !== undefined) { let best = null, bd = 3.5; for (const e of ents) { const dd = Math.hypot(e.x - fx0, e.y - fy0); if (!e.dead && dd < bd) { bd = dd; best = e; } } if (best) who = best.boss ? best.d.name : best.d.name; else if (kind === 'proj') who = 'PROJEKTILER'; }
  run.dmgBy = run.dmgBy || {}; run.dmgBy[who] = (run.dmgBy[who] || 0) + d;
  return who;
}
// rekord: jämför med profilen när rundan tar slut
function recordCheck(r) {
  const rec = [];
  const best = (k, v, label) => { if (v > (profile[k] || 0)) { if ((profile[k] || 0) > 0) rec.push(label); profile[k] = v; } };
  best('bestRunKills', r.kills, 'FLEST DÖDADE');
  best('bestCombo', r.bestCombo || 0, 'LÄNGSTA KOMBO');
  best('bestFloorKills', r.bestFloorKills || 0, 'FLEST PÅ EN VÅNING');
  if (r.depth > (profile.bestDepth || 0) && profile.bestDepth > 0) rec.push('DJUPASTE VÅNINGEN');
  if (score > (profile.bestScore || 0) && profile.bestScore > 0) rec.push('HÖGSTA POÄNG');
  profile.totalDmg = Math.round((profile.totalDmg || 0) + (r.dmgDealt || 0) * 10);
  r.records = rec; if (rec.length) setTimeout(() => play('daily_reward', 0.6, 1.2), 600);
}
// dagens belöning: första rundan varje dag ger extra själar
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
function dailyReward() {
  if (!run || run.practice || profile.lastDay === today()) return;
  profile.lastDay = today(); profile.days = [...new Set([...(profile.days || []), today()])].slice(-60); profile.souls += 15; saveProfile();
  setTimeout(() => { say('DAGENS BELÖNING: +15 SJÄLAR', 3); play('daily_reward', 0.8); }, 1800);
}
function dailyInfo() { // dagens frö och tid kvar
  const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1), left = Math.max(0, m - n), h = Math.floor(left / 36e5), mi = Math.floor(left / 6e4) % 60;
  return `DAGENS FRÖ ${seedText(dailySeed())} · NYTT OM ${h} H ${mi} MIN`;
}
// vapenfärger (låses upp med prestationer)
const SKINS = { '': { name: 'STANDARD' }, gold: { name: 'GULD', ach: 'win', col: 'rgba(255,200,60,0.35)' }, frost: { name: 'FROST', ach: 'frostboss', col: 'rgba(120,200,255,0.35)' },
  blood: { name: 'BLOD', ach: 'k1000', col: 'rgba(200,20,30,0.35)' }, void: { name: 'TOMRUM', ach: 'nightmare', col: 'rgba(140,60,220,0.38)' } };
const skinOpen = id => !id || (profile.ach || []).includes(SKINS[id].ach);
// HUD-teman: färgläggning av listen
const HUD_THEMES = { '': null, blue: 'rgba(60,110,200,0.55)', green: 'rgba(60,160,80,0.5)', gold: 'rgba(210,160,40,0.5)' };
// träffkänsla: blodspår, glödande ögon och facklornas rök
function enemyFeel(e, dt) {
  if (e.hp < e.maxHp * 0.5 && !e.d.stone && e.d.ai !== 'wisp' && (e.mvx || e.mvy) && fx.parts.blood_trail && !settings.lowfx) {
    e.trailT = (e.trailT || 0) - dt;
    if (e.trailT <= 0) { e.trailT = rnd(0.35, 0.7); if (!solid(e.x, e.y)) { decals.push({ x: e.x + rnd(-0.1, 0.1), y: e.y + rnd(-0.1, 0.1), img: fx.parts.blood_trail[(Math.random() * 2) | 0], size: 0.03, life: 12 }); if (decals.length > 90) decals.shift(); } }
  }
}
let smokeAcc = 0;
function updateTorchFx(dt) { // facklor ryker och gnistrar
  if (settings.lowfx) return;
  smokeAcc += dt; if (smokeAcc < 0.08) return; smokeAcc = 0;
  for (const t of torches) {
    if (t.hidden || Math.abs(t.x - P.x) > 10 || Math.abs(t.y - P.y) > 10) continue;
    if (lvl.biome === 'frost' && Math.random() < 0.5) { const a = rnd(0, TAU); particles.push({ x: t.x + Math.cos(a) * 3, y: t.y + Math.sin(a) * 3, z: 0.02, vx: 0, vy: 0, vz: 0.25, life: 0.9, maxLife: 0.9, img: fx.hit[1], size: 0.03, add: true, tint: [255, 140, 50], fade: true }); } // värmeauran: inom ringen fryser du inte
    if (Math.random() < 0.25 && fx.parts.smoke) particles.push({ x: t.x + rnd(-0.05, 0.05), y: t.y + rnd(-0.05, 0.05), z: 0.9, vx: rnd(-0.1, 0.1), vy: rnd(-0.1, 0.1), vz: 0.35, life: 1.6, maxLife: 1.6, frames: fx.parts.smoke, img: fx.parts.smoke[0], size: 0.18, drift: true, fade: true });
    if (Math.random() < 0.18) particles.push({ x: t.x, y: t.y, z: 0.75, vx: rnd(-0.5, 0.5), vy: rnd(-0.5, 0.5), vz: rnd(0.6, 1.4), life: 0.7, maxLife: 0.7, img: fx.parts.ember ? fx.parts.ember[0] : fx.hit[1], size: 0.03, add: true, tint: [255, 170, 60], grav: true, fade: true });
  }
}
function dissolve(e) { // spöken och irrbloss löses upp
  e.gibbed = true;
  for (let i = 0; i < 12; i++) particles.push({ x: e.x + rnd(-0.25, 0.25), y: e.y + rnd(-0.25, 0.25), z: rnd(0.1, 0.9), vx: rnd(-0.3, 0.3), vy: rnd(-0.3, 0.3), vz: rnd(0.3, 0.9), life: rnd(0.8, 1.4), maxLife: 1.4, img: fx.hit[1], size: rnd(0.04, 0.08), add: true, tint: e.type === 'Ü' ? [150, 220, 255] : [200, 255, 220], fade: true, drift: true });
}
function headshotCheck(e, perp, wp) { // träff mitt i fienden (huvudet) med ett enkelskottsvapen
  if (wp.pellets > 1 || wp.proj || e.d.stone || perp > 0.075 * e.d.size * (e.boss ? 1.8 : 1)) return 1;
  stat('headshots'); run.headshots = (run.headshots || 0) + 1; e.headT = tmr;
  if (e.id === 'pharaoh') { if ((P.jwT || 0) < tmr) { P.jwT = tmr + 0.5; spawnText(e.x, e.y, '★ JUVELEN!', '#60c0ff'); } return 2.2 + mod('headshot'); } // faraonens svaga punkt
  if ((P.hsT || 0) < tmr) { P.hsT = tmr + 0.4; spawnText(e.x, e.y, '★ HUVUDTRÄFF', '#ffe070'); play('headshot', 0.55, rnd(0.95, 1.1)); vib('headshot'); }
  return 1.5 + mod('headshot');
}
function wrapText(t, max) { t = window.I18N ? I18N.t(t) : t; const out = []; let line = ''; for (const w of t.split(' ')) { if ((line + ' ' + w).trim().length > max) { if (line) out.push(line); line = w; } else line = (line + ' ' + w).trim(); } if (line) out.push(line); return out; }
// ett mönster på enhanden: gå framåt automatiskt
let autoWalk = false;
// ---------- Version 6: spikgeväret, blixtstaven och långbågen ----------
const MANA_COST = { zap: 9, orb: 35 };
function nailShot(wp, base, spread) { // spikgeväret: snabba spikar som projektiler, värms upp under eldgivning
  WS.heatNg = Math.min(2.5, (WS.heatNg || 0) + 0.12);
  const n = spread ? 5 : 1;
  for (let i = 0; i < n; i++) {
    const a = P.a + (spread ? (i - 2) * 0.07 : rnd(-1, 1) * (wp.spread + WS.spread * 0.4) * (1 - WS.aim * 0.6));
    projectiles.push({ x: P.x + Math.cos(a) * 0.35, y: P.y + Math.sin(a) * 0.35, z: 0.47, vx: Math.cos(a) * 26, vy: Math.sin(a) * 26, dmg: base, src: P, friendly: true, kind: 'nail', life: 1.2, hot: up('ng_heat') && WS.heatNg > 1.5, bounces: up('ng_ricochet') ? 1 : 0 });
  }
  P.mags[P.weapon] -= n; lvlStat.shots += n; run.shots = (run.shots || 0) + n;
  WS.shot = 0; WS.cd = effDelay(wp) / (1 + Math.min(1, WS.heatNg / 2.5) * 0.6) * (spread ? 4 : 1); WS.spread = Math.min(0.06, WS.spread + 0.004);
  play(wp.sound[0], 0.45, rnd(0.95, 1.08) * (1 + WS.heatNg * 0.04)); P.flash = Math.max(P.flash, 0.03); P.pitch += 0.4; P.shake = Math.max(P.shake, 0.15);
  noise(9);
}
function updateNail(p, dt) { // spikens flykt: fastnålning mot vägg, studs och värme
  if (!settings.lowfx && Math.random() < 0.5) particles.push({ x: p.x - p.vx * 0.02, y: p.y - p.vy * 0.02, z: p.z - 0.02, vx: 0, vy: 0, vz: 0, life: 0.08, maxLife: 0.08, img: fx.hit[1], size: 0.02, add: true, tint: p.hot ? [255, 150, 60] : [200, 200, 220] }); // spårljus
  const hit = ents.find(e => !e.dead && !e.dying && !e.hidden && Math.hypot(e.x - p.x, e.y - p.y) < 0.32 * e.d.size * (e.boss ? 1.8 : 1));
  if (hit) {
    p.dead = true; const k = hurtEnemy(hit, p.dmg * (hit.shredT > tmr ? 1.25 : 1), p.x, p.y, { crit: Math.random() < mod('critChance') }); hitMark = 0.1; hitKill = k; lvlStat.hits++; run.hits = (run.hits || 0) + 1;
    play('nail_flesh', 0.35, rnd(0.9, 1.15), { x: p.x, y: p.y });
    if (p.hot) { hit.burn = Math.max(hit.burn || 0, 2); hit.burnAcc = hit.burnAcc || 0; }
    runeProc(hit, p.dmg);
    if (up('ng_shred')) hit.shredT = tmr + 3;
    const sp = Math.hypot(p.vx, p.vy), bx = hit.x + p.vx / sp * 0.6, by = hit.y + p.vy / sp * 0.6;
    if (!k && !hit.boss && solid(bx, by)) { hit.stun = Math.max(hit.stun || 0, up('ng_pin') ? 1.8 : 0.7); spawnText(hit.x, hit.y, 'FASTNÅLAD', '#c0c0d0'); }
    else if (!k && !hit.boss) tryMove(hit, p.vx / sp * 0.05, p.vy / sp * 0.05, 0.28);
    return;
  }
  if (solid(p.x, p.y) || p.life <= 0) {
    if (p.life > 0) wpProjWall(p); // Grafik: nedslag efter väggmaterial
    const ox = p.x - p.vx * dt, oy = p.y - p.vy * dt;
    if (p.life > 0 && (p.bounces > 0 || Math.random() < 0.18)) { // studsar mot sten
      if (solid(p.x, oy)) p.vx = -p.vx; if (solid(ox, p.y)) p.vy = -p.vy; p.x = ox; p.y = oy; p.bounces = Math.max(0, (p.bounces || 0) - 1); p.dmg *= 0.7;
      play('nail_hit', 0.3, rnd(1.1, 1.4), { x: p.x, y: p.y }); sparks(p.x, p.y, 0.47, 2); return;
    }
    p.dead = true; if (p.life > 0) { spawnImpact(ox, oy, 0.47); if (Math.random() < 0.4) play('nail_hit', 0.25, rnd(0.9, 1.3), { x: p.x, y: p.y }); }
  }
}
function staffZap(wp, base) { // blixtstaven: kedjeblixt till närmaste fiende i siktet
  if (P.mags[P.weapon] < MANA_COST.zap) { if (!fireHeld) { say('FÖR LITE MANA', 0.8); play('click', 0.5, 0.7); } WS.cd = 0.25; return; }
  let best = null, bd = 13;
  for (const e of ents) { if (e.dead || e.dormant || e.hidden) continue; const d = Math.hypot(e.x - P.x, e.y - P.y); if (d > bd) continue;
    let da = Math.atan2(e.y - P.y, e.x - P.x) - P.a; da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da))); if (da > Math.max(0.18, 0.5 / d)) continue;
    if (hasLOS(P.x, P.y, e.x, e.y)) { bd = d; best = e; } }
  P.mags[P.weapon] -= MANA_COST.zap; WS.shot = 0; WS.cd = effDelay(wp); lvlStat.shots++; run.shots = (run.shots || 0) + 1;
  play(wp.sound[0], 0.6, rnd(0.9, 1.1)); P.flash = Math.max(P.flash, 0.06); noise(10);
  const tx = best ? best.x : P.x + Math.cos(P.a) * Math.min(10, cast(P.x, P.y, Math.cos(P.a), Math.sin(P.a)).dist - 0.1), ty = best ? best.y : P.y + Math.sin(P.a) * Math.min(10, cast(P.x, P.y, Math.cos(P.a), Math.sin(P.a)).dist - 0.1);
  zap(P.x + Math.cos(P.a) * 0.4, P.y + Math.sin(P.a) * 0.4, tx, ty, [150, 200, 255]);
  flashes.push({ x: tx, y: ty, t: 0.12, r: 4, col: [130, 170, 255] }); // blixten lyser upp rummet
  if (!best) { if (cellAt(tx, ty) === '-') electrify(tx, ty, base); return; }
  lvlStat.hits++; run.hits = (run.hits || 0) + 1; hitMark = 0.12;
  const hitSet = new Set([best]); let cur = best, dmg = base;
  for (let j = 0; j < 3 + (up('st_chain') ? 2 : 0); j++) {
    if (j > 0) { const nx = ents.filter(o => !o.dead && !o.dormant && !o.hidden && !hitSet.has(o) && Math.hypot(o.x - cur.x, o.y - cur.y) < 4.5 && hasLOS(cur.x, cur.y, o.x, o.y)).sort((a, b) => Math.hypot(a.x - cur.x, a.y - cur.y) - Math.hypot(b.x - cur.x, b.y - cur.y))[0];
      if (!nx) break; zap(cur.x, cur.y, nx.x, nx.y, [150, 200, 255]); hitSet.add(nx); cur = nx; dmg *= 0.75; }
    const k = hurtEnemy(cur, dmg, cur.x, cur.y, { crit: Math.random() < mod('critChance') }); hitKill = hitKill || k;
    if (up('st_stun') && !cur.boss) cur.stun = Math.max(cur.stun || 0, 0.8);
    if (j === 0) runeProc(cur, dmg);
    if (!k && cellAt(cur.x, cur.y) === '-') electrify(cur.x, cur.y, dmg * 0.6);
    if (fx.parts.lightning && !settings.lowfx) particles.push({ x: cur.x, y: cur.y, z: 0.5, vx: 0, vy: 0, vz: 0, life: 0.25, maxLife: 0.25, frames: fx.parts.lightning, img: fx.parts.lightning[0], size: 0.3, add: true });
  }
  play('shock', 0.4, rnd(1, 1.2), { x: best.x, y: best.y });
}
function electrify(x, y, dmg) { // blixt i vatten: alla i samma vatten i närheten får en stöt
  for (const e of ents) if (!e.dead && !e.dormant && cellAt(e.x, e.y) === '-' && Math.hypot(e.x - x, e.y - y) < 4.5) { zap(x, y, e.x, e.y, [120, 190, 255]); hurtEnemy(e, dmg, e.x, e.y, { noProc: true }); if (!e.boss) e.stun = Math.max(e.stun || 0, 0.6); }
  if (cellAt(P.x, P.y) === '-' && Math.hypot(P.x - x, P.y - y) < 3) { hurtPlayer(4, x, y, 'proj'); say('VATTNET LEDER STRÖM!', 1.2); }
}
function staffOrb(wp, base, k) { // laddat blixtklot
  if (P.mags[P.weapon] < MANA_COST.orb) { say('FÖR LITE MANA FÖR KLOTET', 1); play('click', 0.5, 0.7); return; }
  P.mags[P.weapon] -= MANA_COST.orb; WS.shot = 0; WS.cd = 0.6;
  const a = P.a, big = up('st_orb');
  projectiles.push({ x: P.x + Math.cos(a) * 0.5, y: P.y + Math.sin(a) * 0.5, z: 0.5, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, dmg: base * (2 + k * 2), src: P, friendly: true, kind: 'sorb', life: 3, bounces: big ? 3 : 0, big, zapT: 0 });
  play('staff_orb', 0.7); P.flash = Math.max(P.flash, 0.1);
}
function updateSorb(p, dt) { // klotet zappar fiender i närheten medan det flyger
  p.zapT -= dt;
  if (p.zapT <= 0) { p.zapT = 0.25; for (const e of ents) if (!e.dead && !e.dormant && !e.hidden && Math.hypot(e.x - p.x, e.y - p.y) < (p.big ? 3.2 : 2.4) && hasLOS(p.x, p.y, e.x, e.y)) { zap(p.x, p.y, e.x, e.y, [150, 200, 255]); hurtEnemy(e, p.dmg * 0.18, e.x, e.y, { noProc: true }); } }
  const hit = ents.find(e => !e.dead && !e.dying && !e.hidden && Math.hypot(e.x - p.x, e.y - p.y) < 0.55);
  if (solid(p.x, p.y) && !hit && p.bounces > 0) { const ox = p.x - p.vx * dt, oy = p.y - p.vy * dt; if (solid(p.x, oy)) p.vx = -p.vx; if (solid(ox, p.y)) p.vy = -p.vy; p.x = ox; p.y = oy; p.bounces--; play('staff_zap', 0.4, 0.7, { x: p.x, y: p.y }); return; }
  if (hit || solid(p.x, p.y) || p.life <= 0) {
    p.dead = true; const x = p.x - p.vx * 0.03, y = p.y - p.vy * 0.03;
    for (const e of ents) if (!e.dead && Math.hypot(e.x - x, e.y - y) < 2.4) { hurtEnemy(e, p.dmg * (e === hit ? 1 : 0.6), e.x, e.y, {}); if (!e.boss) e.stun = Math.max(e.stun || 0, 0.8); zap(x, y, e.x, e.y, [170, 210, 255]); }
    flashes.push({ x, y, t: 0.3, r: 5, col: [130, 170, 255] }); play('staff_orb', 0.8, 0.8, { x, y }); P.shake = Math.max(P.shake, 0.8);
    if (cellAt(x, y) === '-') electrify(x, y, p.dmg * 0.5);
  }
}
function bowRelease(wp, base) { // långbågen: skadan växer med hur hårt den är spänd
  const k = clamp(WS.draw || 0, 0.15, 1), full = k >= 1; WS.draw = 0; WS.drawSnd = false;
  if (P.mags[P.weapon] <= 0) { if (P.ammo.arrows > 0) startReload(); else { say('INGA PILAR', 1); play('click', 0.5, 0.8); } return; }
  P.mags[P.weapon]--; lvlStat.shots++; run.shots = (run.shots || 0) + 1;
  const n = up('bw_triple') ? 3 : 1;
  for (let i = 0; i < n; i++) {
    const a = P.a + (n > 1 ? (i - 1) * 0.08 : 0) + rnd(-1, 1) * wp.spread * (1 - k);
    projectiles.push({ x: P.x + Math.cos(a) * 0.35, y: P.y + Math.sin(a) * 0.35, z: 0.5, vx: Math.cos(a) * (14 + k * 14), vy: Math.sin(a) * (14 + k * 14), dmg: base * (0.35 + 0.65 * k) * (full ? 2 : 1), src: P, friendly: true, kind: 'parrow', life: 2, pierce: full || up('bw_pierce') ? 9 : 0, hitSet: new Set(), full });
  }
  WS.shot = 0; WS.cd = effDelay(wp); play(wp.sound[0], 0.7, 0.9 + k * 0.2); noise(3);
  if (P.ammo.arrows > 0 && P.mags[P.weapon] <= 0) setTimeout(() => { if (WEAPONS[P.weapon].bow && WS.state === 'idle') startReload(); }, 250); // nästa pil läggs på
}
function updateArrow(p, dt) {
  if (!settings.lowfx && p.full && Math.random() < 0.6) particles.push({ x: p.x - p.vx * 0.02, y: p.y - p.vy * 0.02, z: p.z - 0.02, vx: 0, vy: 0, vz: 0, life: 0.12, maxLife: 0.12, img: fx.hit[1], size: 0.02, add: true, tint: [255, 230, 150] }); // spårljus
  for (const e of ents) {
    if (e.dead || e.dying || e.hidden || p.hitSet.has(e) || Math.hypot(e.x - p.x, e.y - p.y) > 0.3 * e.d.size * (e.boss ? 1.8 : 1)) continue;
    p.hitSet.add(e); const k = hurtEnemy(e, p.dmg, p.x, p.y, { crit: p.full || Math.random() < mod('critChance') }); hitMark = 0.14; hitKill = hitKill || k; lvlStat.hits++; run.hits = (run.hits || 0) + 1;
    play('arrow_hit', 0.5, rnd(0.9, 1.1), { x: p.x, y: p.y }); runeProc(e, p.dmg);
    if (up('bw_explosive')) explode(p.x, p.y, p.dmg * 0.5, 1.4);
    if (up('bw_retrieve') || Math.random() < mod('arrowRetrieve')) P.ammo.arrows = Math.min(AMMO.arrows.max, P.ammo.arrows + 1);
    if (p.pierce-- <= 0) { p.dead = true; return; }
  }
  if (solid(p.x, p.y) || p.life <= 0) { // pilen fastnar och kan plockas upp
    if (p.life > 0) wpProjWall(p); // Grafik: nedslag efter väggmaterial
    p.dead = true; const x = p.x - p.vx * dt * 1.2, y = p.y - p.vy * dt * 1.2;
    if (p.life > 0) { play('arrow_hit', 0.3, 1.3, { x, y }); if (!solid(x, y) && !up('bw_explosive')) items.push({ type: 'arrowpick', x, y, taken: false, drop: true, a: Math.atan2(p.vy, p.vx) }); }
    if (up('bw_explosive')) explode(x, y, p.dmg * 0.5, 1.4);
  }
}
function weaponV6Tick(wp, dt, trig) { // laddning och mana för de nya vapnen; true = hanterat
  const si = weaponIndex('staff');
  if (si >= 0 && P.has[si]) P.mags[si] = Math.min(effMag(si), P.mags[si] + dt * 7 * (1 + mod('manaRegen')) * (up('st_mana') ? 2 : 1)); // manan laddas alltid, även i fickan
  if (wp.nail) { if (!trig) WS.heatNg = Math.max(0, (WS.heatNg || 0) - dt * 1.5); if (aimDown && !WS.aimHeld && P.mags[P.weapon] >= 5 && canFire()) nailShot(wp, wp.dmg * (1 + mod('dmg')), true); WS.aimHeld = aimDown; return false; }
  if (wp.staff) {
    if (aimDown && WS.state === 'idle') { WS.orbCharge = Math.min(1, (WS.orbCharge || 0) + dt / 1.1); if (!WS.orbSnd) { WS.orbSnd = true; play('staff_charge', 0.5); } }
    else if (!aimDown && WS.orbCharge > 0) { const k = WS.orbCharge; WS.orbCharge = 0; WS.orbSnd = false; if (k > 0.3 && canFire()) staffOrb(wp, wp.dmg * (1 + mod('dmg')) * (1 + 0.12 * wlvl(wp.id)), k); }
    return false;
  }
  if (wp.bow) { // håll för att spänna, släpp för att skjuta
    if (trig && WS.state === 'idle' && WS.cd <= 0 && P.mags[P.weapon] > 0) { WS.draw = Math.min(1, (WS.draw || 0) + dt / 0.9 * (1 + mod('fireRate'))); if (!WS.drawSnd) { WS.drawSnd = true; play('bow_draw', 0.5); } }
    else if (!trig && WS.draw > 0) { if (WS.state === 'idle') bowRelease(wp, wp.dmg * (1 + mod('dmg')) * (1 + 0.12 * wlvl(wp.id)) * (P.rageT > 0 ? 1.5 : 1)); else WS.draw = 0; }
    else if (trig && !fireHeld && P.mags[P.weapon] <= 0 && WS.state === 'idle') { if (P.ammo.arrows > 0) startReload(); else { say('INGA PILAR', 1); play('click', 0.5, 0.8); } }
    fireHeld = trig; return true;
  }
  return false;
}
function drawBowAim(g) { // siktet drar ihop sig när bågen spänns
  if (!WEAPONS[P.weapon].bow || !(WS.draw > 0)) return;
  const r = Math.round(14 - WS.draw * 10), cx = W / 2, cy = HORIZON;
  g.strokeStyle = WS.draw >= 1 ? 'rgba(255,220,90,0.95)' : 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(cx + 0.5, cy + 0.5, r, 0, TAU); g.stroke();
  if (WS.draw >= 1 && tmr % 0.4 < 0.2) { g.beginPath(); g.arc(cx + 0.5, cy + 0.5, r + 3, 0, TAU); g.stroke(); } // fullt spänd: en extra blinkande ring i stället för text mitt i bilden
}
function drawStaffCharge(g) {
  if (!WEAPONS[P.weapon].staff) return;
  const m = P.mags[P.weapon] / effMag(P.weapon); g.fillStyle = '#0a1430'; g.fillRect(W / 2 - 20, HORIZON + 22, 40, 2); g.fillStyle = '#70a8ff'; g.fillRect(W / 2 - 20, HORIZON + 22, 40 * m, 2);
  if (WS.orbCharge > 0) { g.strokeStyle = `rgba(150,200,255,${0.4 + WS.orbCharge * 0.5})`; g.beginPath(); g.arc(W / 2 + 0.5, HORIZON + 0.5, 4 + WS.orbCharge * 8, 0, TAU); g.stroke(); }
}

