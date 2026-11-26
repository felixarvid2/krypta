function explode(x, y, dmg, r, hurtsPlayer, big) {
  const pd = Math.hypot(P.x - x, P.y - y);
  const v26bj = v26aBlastJump(x, y, pd); // version 26A: spränghopp på egen smäll
  if (pd < r + 1.2 && pd > 0.05) { const k = (1 - pd / (r + 1.2)) * (big ? 0.9 : 0.4); for (let i = 0; i < 5; i++) tryMove(P, (P.x - x) / pd * k / 5, (P.y - y) / pd * k / 5, 0.24); if (big) P.jv = Math.max(P.jv, 1.2 * (1 - pd / (r + 1.2))); } // tryckvågen knuffar dig
  if (fx.parts.scorch && !solid(x, y)) { decals.push({ x, y, img: fx.parts.scorch[0], size: 0.05 + r * 0.03 }); if (decals.length > 70) decals.shift(); } // sotfläck
  gfxWScorch(x, y, r); // VÄRLD: brännmärken på väggarna
  for (const e of ents) if (!e.dead && !e.boss && !e.dormant) { const d = Math.hypot(e.x - x, e.y - y); if (d < r + 0.8 && d > 0.05) for (let i = 0; i < 4; i++) tryMove(e, (e.x - x) / d * 0.1 * (1 + mod('knockback')), (e.y - y) / d * 0.1 * (1 + mod('knockback')), 0.28); }
  for (const e of ents) if (e.dead && !e.gibbed && !e.boss && Math.hypot(e.x - x, e.y - y) < r * 0.8) gib(e); // liken sprängs i bitar
  burnWebs(x, y, r);
  v27Boom(x, y, r); // version 27 (BLOOD): dödar smällen köttfiender blir det en stjärnformad blodfläck runt den
  if (pet && Math.hypot(pet.x - x, pet.y - y) < r + 0.5 && hurtsPlayer) hurtPet(10);
  for (const e of ents) if (!e.dead && e.sleep && Math.hypot(e.x - x, e.y - y) < 8) { e.sleep = false; alertEnemy(e, false); } // explosioner väcker sovande
  play('fireburst', 0.6, rnd(0.8, 1), { x, y });
  flashes.push({ x, y, t: 0.3, r: Math.min(6, 2 + r * 1.5) });
  fx27Room(FX27_ROOM.boom); // version 27 (samlad budget): plats för smällens kärna i en full partikellista
  wpBoom(x, y, r, big); // Grafik: eldklot som växer, rökmoln, chockvågsring, skräp och ljus som falnar
  efxBoom(x, y, r, big); // version 25: Effekseer-explosionen
  fx27Boom(x, y, r, big); // version 27: chockvåg på marken, skräp som ryker, glöd som falnar och kvardröjande rök
  if (!settings.lowfx) for (let i = 0; i < 5; i++) particles.push({ x: x + rnd(-r, r) * 0.5, y: y + rnd(-r, r) * 0.5, z: 0.02, vx: 0, vy: 0, vz: 0, life: rnd(1.5, 3), maxLife: 3, img: fx.parts.ember ? fx.parts.ember[0] : fx.hit[1], size: 0.04, add: true, tint: [255, 130, 40], fade: true }); // glödande rester
  const dp = Math.hypot(P.x - x, P.y - y); if (dp < 4.5) P.boom = Math.max(P.boom, 0.35 * (1 - dp / 4.5));
  if (dp < 12) P.shake = Math.max(P.shake, (big ? 2.4 : 1.2 + r * 0.2) * (1 - dp / 12)); // skakar efter avstånd
  for (let i = 0; i < 5; i++) particles.push({ x: x + rnd(-0.3, 0.3), y: y + rnd(-0.3, 0.3), z: rnd(0.2, 0.6), vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(0, 1), life: 0.4, maxLife: 0.4, frames: fx.fireball, img: fx.fireball[0], size: 0.45, add: true });
  for (const e of ents) if (!e.dead && Math.hypot(e.x - x, e.y - y) < r && boomSees(x, y, e.x, e.y)) hurtEnemy(e, dmg, e.x, e.y, { noProc: true, boom: true }); // version 25.1: inte genom väggar
  if (typeof v26bBlast === 'function') v26bBlast(x, y, r); // version 26B (krokrad, B): jonglering – fiender nära smällen kastas upp
  for (const pt of pots) if (!pt.broken && Math.hypot(pt.x - x, pt.y - y) < r) breakPot(pt);
  for (const pr of props) if (pr.def && !pr.broken && (pr.def.boom || pr.def.crate) && Math.hypot(pr.x - x, pr.y - y) < r + 0.4) hitProp(pr, x, y); // kedjereaktioner
  for (let cy = Math.max(0, (y - r - 1) | 0); cy <= Math.min(mh - 1, (y + r + 1) | 0); cy++) for (let cx = Math.max(0, (x - r - 1) | 0); cx <= Math.min(mw - 1, (x + r + 1) | 0); cx++)
    if (map[cy][cx] === '{' && Math.hypot(cx + 0.5 - x, cy + 0.5 - y) < r + 0.9) blowWall(cx, cy); // spruckna väggar rasar
  if (v26bj) dmg *= 0.5; // version 26A: spränghoppet halverar egenskadan
  if (hurtsPlayer && Math.hypot(P.x - x, P.y - y) < r && boomSees(x, y, P.x, P.y)) hurtPlayer(dmg, x, y, 'proj');
  P.flash = Math.max(P.flash, 0.05);
}
function dropItem(type, x, y) { const a = rnd(0, TAU), it = { type, x, y, taken: false, drop: true, hop: 0.5, hvx: Math.cos(a) * rnd(0.6, 1.4), hvy: Math.sin(a) * rnd(0.6, 1.4) }; if (type === 'potion') it.pot = randomPotion(); if (type === 'rune') it.rune = RUNE_IDS[(Math.random() * RUNE_IDS.length) | 0]; items.push(it); return it; } // studsar ut
// ---------- Föremål: krutfat, lådor, brunnar, altare och spikfällor ----------
function blowWall(cx, cy) {
  map[cy][cx] = '.'; flowCell = -1; secrets++; score += 250; profile.secrets = (profile.secrets || 0) + 1; stat('walls');
  play('bigboom', 0.7, 0.7, { x: cx + 0.5, y: cy + 0.5 }); play('secret', 0.8); say('VÄGGEN RASADE – ETT HEMLIGT RUM!', 3);
  for (let i = 0; i < 10; i++) { const a = rnd(0, TAU); particles.push({ x: cx + 0.5, y: cy + 0.5, z: rnd(0.2, 0.8), vx: Math.cos(a) * rnd(0.5, 2), vy: Math.sin(a) * rnd(0.5, 2), vz: rnd(0.5, 2), life: 1.2, img: fx.shards[(i % 6) + 6], size: 0.12, grav: true, bounce: true }); }
  spawnPuff(cx + 0.5, cy + 0.5, 8);
}
function hitProp(pr, hx, hy, dmg) { // sant om kulan kan fortsätta
  if (pr.ch === 'Ė') { refractShot(pr); return false; }
  { const r = v18HitProp(pr, hx, hy, dmg); if (r !== undefined) return r; } // ballonger och knivkastarhjul
  { const r = v19HitProp(pr, hx, hy, dmg); if (r !== undefined) return r; } // dynamitlådor
  { const r = v20HitProp(pr, hx, hy, dmg); if (r !== undefined) return r; } // råttbon och amforor
  { const r = v21HitProp(pr, hx, hy, dmg); if (r !== undefined) return r; } // hängande burar och fisktunnor
  { const r = v22HitProp(pr, hx, hy, dmg); if (r !== undefined) return r; } // kedjade själar
  { const r = v23HitProp(pr, hx, hy, dmg); if (r !== undefined) return r; }
  const d = pr.def;
  if (d.bell && !pr.silenced) { pr.silenced = true; play('parry', 0.6, 0.7, { x: pr.x, y: pr.y }); spawnText(pr.x, pr.y, 'TYSTAD', '#c0c0c0'); return false; } // skjut klockan så kan den inte ringa
  if (d.boom) { // krutfatet smäller efter ett ögonblick, kan sätta igång andra fat
    pr.broken = true; map[pr.cy][pr.cx] = '.'; flowCell = -1;
    fuses.push({ e: { dead: true }, x: pr.x, y: pr.y, t: 0.18, dmg: 30 * (1 + mod('dmg') * 0.5), r: 2.4, hurt: true, kind: typeof d.boom === 'string' ? d.boom : undefined });
    play('fireburst', 0.5, 1.4, { x: pr.x, y: pr.y }); return true;
  }
  if (d.crate) { breakCrate(pr); return true; }
  if (pr.ch === 'c') { pr.broken = true; const t = torches.find(t => t.prop === pr); if (t) t.cells = []; play('pot', 0.5, 1.6, { x: pr.x, y: pr.y }); sparks(pr.x, pr.y, 0.5, 5); return true; } // ljuset släcks
  pr.flashT = tmr + 0.06; spawnSpark(hx, hy); play('ricochet', 0.25, rnd(1.2, 1.6), { x: hx, y: hy }); return false;
}
function spawnSpark(x, y) { particles.push({ x, y, z: 0.5, vx: 0, vy: 0, vz: 0, life: 0.15, maxLife: 0.15, frames: fx.hit, img: fx.hit[0], size: 0.25, add: true }); }
function breakCrate(pr) {
  pr.broken = true; map[pr.cy][pr.cx] = '.'; flowCell = -1; score += 15;
  play('pot', 0.8, 0.6, { x: pr.x, y: pr.y }); play('kick', 0.5, 0.8, { x: pr.x, y: pr.y });
  for (let i = 0; i < 8; i++) {
    const a = rnd(0, TAU), sp = rnd(0.6, 2);
    particles.push({ x: pr.x, y: pr.y, z: 0.25, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(1, 2.5), life: rnd(0.9, 1.5), img: fx.crateBits ? fx.crateBits[i % 4] : fx.shards[i % 6], size: 0.16, grav: true, bounce: true });
  }
  const r = Math.random();
  if (r < 0.35) dropItem(Math.random() < 0.5 ? 'ammo' : 'health', pr.x, pr.y);
  else if (r < 0.7) for (let i = 0; i < 3; i++) dropItem('gold', pr.x, pr.y);
  else if (r < 0.78) dropItem('shard', pr.x, pr.y);
}
function breakProps(x, y, r, kicking) { // sparken: lådor går sönder, krutfat smäller
  let hit = false;
  for (const pr of props) if (pr.def && !pr.broken && (pr.def.crate || (pr.def.boom && !kicking)) && Math.hypot(pr.x - x, pr.y - y) < r + 0.3) { hitProp(pr, x, y); hit = true; }
  return hit;
}
function useProp() { // brunnen helar en gång, altaret ger ett förbannat kort och guld
  for (const pr of props) {
    if (!pr.def || !pr.def.use || (pr.used && pr.def.use !== 'anvil') || Math.hypot(pr.x - P.x, pr.y - P.y) > 1.3) continue;
    if (USES[pr.def.use]) { USES[pr.def.use](pr); return true; }
    if (pr.def.use === 'well') {
      if (P.hp >= maxHp()) { say('DU ÄR REDAN FRISK – SPARA BRUNNEN', 1.5); return true; }
      if (pr.poisoned) { pr.used = true; heal(10); P.poisonT = 7; play('splash', 0.8); play('gas', 0.5, 1.3); say('VATTNET VAR FÖRGIFTAT!', 2); stat('poisonWells'); return true; }
      pr.used = true; heal(40 * (1 + mod('healMul'))); play('splash', 0.8); play('health', 0.6, 0.8); say('DU DRICKER UR BRUNNEN', 2);
      for (let i = 0; i < 10; i++) particles.push({ x: pr.x, y: pr.y, z: 0.4, vx: rnd(-0.6, 0.6), vy: rnd(-0.6, 0.6), vz: rnd(1, 2), life: 0.8, maxLife: 0.8, frames: fx.hit, img: fx.hit[0], size: 0.15, add: true, tint: [255, 80, 90] });
      return true;
    }
    if (pr.def.use === 'altar') {
      const curses = Cards.ALL.filter(c => c.curse && !run.owned.includes(c.id));
      openUI(() => CardUI.choice({ title: 'DET FÖRBANNADE ALTARET', subtitle: 'BLOD FÖR GULD', cancel: 1,
        options: [{ label: 'OFFRA', text: '+60 GULD, +1 FÖRBANNELSE' }, { label: 'GÅ DÄRIFRÅN', text: '' }] }, i => {
        if (i === 0) {
          pr.used = true; run.gold += 60; play('bigboom', 0.4, 1.6); play('coin', 0.8, 0.8); P.flash = 0.2;
          const c = curses.length ? curses[(Math.random() * curses.length) | 0] : null;
          if (c) { gainCard(c); setTimeout(() => CardUI.toast(c, 'FÖRBANNELSE'), 100); } else say('ALTARET HAR INGET KVAR ATT GE', 2);
        }
        closeUI();
      }));
      return true;
    }
  }
  return false;
}
const USE_NAME = { well: 'DRICK UR BRUNNEN', altar: 'OFFRA VID ALTARET', anvil: 'SMEDJAN', fortune: 'SPÅALTARET', prisoner: 'BEFRIA FÅNGEN', challenge: 'BLÅS I HORNET', bowl: 'OFFERSKÅLEN', lever: 'DRA I SPAKEN', shelf: 'LETA I BOKHYLLAN', alchemist: 'TALA MED ALKEMISTEN', priest: 'TALA MED PRÄSTEN', petcage: 'ÖPPNA DJURBUREN', camp: 'SLÅ LÄGER VID ELDEN', sarco: 'ÖPPNA SARKOFAGEN', gamble: 'SPELA MED SPELAREN', bank: 'TALA MED BANKIREN', wander: 'TALA MED VANDRAREN', quests: 'LÄS ANSLAGSTAVLAN', stairs: 'GÅ NED FÖR TRAPPAN' };
const wlvl = id => (run && run.wlvl && run.wlvl[id]) || 0;
const USES = {
  shelf(pr) { // bokhyllor kan gömma något
    pr.used = true; play('card', 0.5, 0.7);
    const r = Math.random();
    if (r < 0.12) { const c = drawCards(1, { luck: 0.5 })[0]; if (c) { gainCard(c); setTimeout(() => CardUI.toast(c, 'GÖMT I EN BOK'), 50); } }
    else if (r < 0.25) { run.gold += 15; say('EN PUNG I BOKHYLLAN: +15 GULD', 2); play('coin', 0.7); }
    else if (r < 0.3) { dropItem('scroll', P.x + Math.cos(P.a) * 0.5, P.y + Math.sin(P.a) * 0.5); say('EN GAMMAL KARTA FALLER UT', 2); }
    else if (r < 0.38 + mod('potionChance') * 0.3) { dropItem('potion', P.x + Math.cos(P.a) * 0.5, P.y + Math.sin(P.a) * 0.5); say('EN FLASKA BAKOM BÖCKERNA', 2); }
    else say('BARA DAMMIGA BÖCKER', 1.2);
  },
  anvil(pr) { // smedjan: +12 % skada per nivå på vapnet du håller
    const wp = WEAPONS[P.weapon], lv = wlvl(wp.id), price = [60, 110, 170][lv];
    const bag = (run.runeBag || []).length;
    if (lv >= 3 && !bag) { say(wp.name + ' ÄR REDAN FULLT SMIDD', 2); return; }
    openUI(() => CardUI.choice({ title: 'SMEDJAN', subtitle: `${wp.name} · NIVÅ ${lv}/3 · ${run.gold} GULD`, cancel: 2,
      options: [{ label: lv >= 3 ? 'FULLT SMIDD' : `SMID (${price} GULD)`, text: lv >= 3 ? '' : run.gold >= price ? '+12 % SKADA FÖR ALLTID' : 'FÖR LITE GULD' }, { label: `FÄST EN RUNA (${bag})`, text: bag ? 'RUNAN SÄTTS I VAPNET DU HÅLLER' : 'DU HAR INGA RUNOR' }, { label: 'GÅ DÄRIFRÅN', text: '' }] }, i => {
      if (i === 1) { closeUI(); if (bag) setTimeout(openRuneSocket, 50); return; }
      if (lv >= 3) { closeUI(); return; }
      if (i === 0 && run.gold >= price) { run.gold -= price; run.wlvl = run.wlvl || {}; run.wlvl[wp.id] = lv + 1; play('anvil', 0.9); P.shake = 0.5; say(`${wp.name} NIVÅ ${lv + 1}`, 2); sparks(pr.x, pr.y, 0.4, 8); }
      else if (i === 0) { say('FÖR LITE GULD', 1.5); play('click', 0.5, 0.6); }
      closeUI();
    }));
  },
  fortune(pr) { // spåaltaret: en slumpad välsignelse, ibland en förbannelse
    pr.used = true; stat('fortunes'); play('fortune', 0.8); P.flash = 0.15;
    if (!run.bossrush) { const bd = (cycleOf(run.depth) + 1) * (FLOORS + 1), b = BOSSES[bossFor(bd)]; if (b) setTimeout(() => say(`SPÅDOMEN: ${b.name} VÄNTAR I DJUPET${b.title ? ' – ' + b.title : ''}`, 4), 2600); } // spådom om nästa boss
    const r = Math.random();
    if (r < 0.55) { const c = drawCards(1, { luck: 1 })[0]; if (c) { gainCard(c); setTimeout(() => CardUI.toast(c, 'SPÅDOMEN'), 100); } say('SPÅKVINNAN SER LYCKA', 2.5); }
    else if (r < 0.8) { run.gold += 80; say('SPÅKVINNAN SER GULD: +80', 2.5); play('coin', 0.8, 0.8); }
    else if (r < 0.9) { P.grenades = Math.min(GREN_MAX(), P.grenades + 3); heal(40); say('SPÅKVINNAN SER STRID: +3 GRANATER, +40 HP', 2.5); }
    else { const cs = Cards.ALL.filter(c => c.curse && !run.owned.includes(c.id)); const c = cs[(Math.random() * cs.length) | 0]; if (c) { gainCard(c); setTimeout(() => CardUI.toast(c, 'OLYCKSBÅDAN'), 100); } run.gold += 120; say('SPÅKVINNAN SER OLYCKA – OCH 120 GULD', 3); }
  },
  prisoner(pr) { // fången: befria för guld och granater, eller ta med fången som allierad på våningen
    const g = 30 + run.depth * 6;
    openUI(() => CardUI.choice({ title: 'FÅNGEN', subtitle: '"SLÄPP UT MIG!"', cancel: 3,
      options: [{ label: 'TA BELÖNINGEN', text: `+${g} GULD OCH 2 GRANATER` }, { label: 'FÖLJ MED MIG', text: 'FÅNGEN SLÅSS FÖR DIG RESTEN AV VÅNINGEN' }, { label: 'GE DRICKS (10 GULD)', text: 'FÅNGEN BERÄTTAR NÅGOT OM VÅNINGEN' }, { label: 'INTE NU', text: '' }] }, i => {
      closeUI(); if (i === 2) { if (run.gold >= 10) { run.gold -= 10; play('coin', 0.6); setTimeout(() => say('FÅNGEN VISKAR: ' + floorHint(pr), 4), 300); } else say('FÖR LITE GULD', 1.2); return; }
      if (i === 3 || pr.used) return;
      pr.used = true; play('prisoner', 0.8); play('gate', 0.6, 1.3, { x: pr.x, y: pr.y }); spawnPuff(pr.x, pr.y, 6); stat('freed'); run.freed = (run.freed || 0) + 1;
      if (i === 1) { const a = spawnAlly('R', pr.x + Math.cos(P.a + Math.PI), pr.y + Math.sin(P.a + Math.PI), 9999, { tint: [255, 225, 180], dmg: 6 + run.depth, name: 'FÅNGEN' }); if (a && solid(a.x, a.y)) { a.x = P.x; a.y = P.y; } say('FÅNGEN FÖLJER DIG: "FÖR FRIHETEN!"', 3); }
      else { run.gold += g; P.grenades = Math.min(GREN_MAX(), P.grenades + 2); say(`FÅNGEN ÄR FRI! +${g} GULD OCH 2 GRANATER`, 3); }
      if (Math.random() < 0.4) dropItem('key', pr.x, pr.y);
      setTimeout(() => say('FÅNGEN VISKAR: ' + floorHint(pr), 4), 2500);
    }));
  },
  challenge(pr) { // utmaningsaltaret: överlev vågor
    if (challenge) return;
    openUI(() => CardUI.choice({ title: 'UTMANINGEN', subtitle: 'ÖVERLEV VÅGORNA · DÖRRARNA STÄNGS', cancel: 3,
      options: [{ label: 'LÄTT: 2 VÅGOR', text: 'GULD OCH ETT KORTVAL' }, { label: 'NORMAL: 3 VÅGOR', text: 'EN KISTA, GULD OCH ETT KORTVAL' }, { label: 'SVÅR: 5 VÅGOR', text: 'EN GLITTRANDE KISTA, MYCKET GULD, ETT BÄTTRE KORTVAL OCH EN DRYCK' }, { label: 'INTE NU', text: '' }] },
      i => { closeUI(); if (i < 3) startChallenge(pr, [2, 3, 5][i]); }));
  },
  bowl(pr) { // offerskålen: betala hälsa för ett kort
    if (P.hp <= 25) { say('DU HAR FÖR LITE BLOD ATT OFFRA', 2); return; }
    const petGift = !run.pet && P.hp > 35;
    openUI(() => CardUI.choice({ title: 'OFFERSKÅLEN', subtitle: 'SKÅLEN TÖRSTAR EFTER BLOD', cancel: petGift ? 2 : 1,
      options: [{ label: 'OFFRA 20 HP', text: 'VÄLJ 1 AV 3 KORT' }, ...(petGift ? [{ label: 'OFFRA 30 HP', text: 'EN FÖLJESLAGARE FÖR RESTEN AV RUNDAN' }] : []), { label: 'GÅ DÄRIFRÅN', text: '' }] }, i => {
      if (petGift && i === 1) { closeUI(); pr.used = true; P.hp -= 30; P.hurt = 0.5; play('splat', 0.8, 0.7); givePet(PET_IDS[(Math.random() * PET_IDS.length) | 0], 'SKÅLEN GAV DIG'); return; }
      if (i !== 0) { closeUI(); return; }
      pr.used = true; P.hp -= 20; P.hurt = 0.5; play('splat', 0.8, 0.7); play('fortune', 0.5, 0.7);
      setTimeout(() => draftUI(drawCards(3, { luck: 0.8 }), { title: 'OFFERSKÅLEN', subtitle: 'VÄLJ ETT KORT', skipLabel: 'TA INGET' }, c => { if (c) gainCard(c); closeUI(); }), 50);
    }));
  },
  alchemist(pr) { openAlchemist(pr); },
  priest(pr) { openPriest(pr); },
  petcage(pr) { openPetCage(pr); },
  camp(pr) { openCampfire(pr); },
  sarco(pr) { openSarcophagus(pr); },
  gamble(pr) { openGambler(pr); },
  bank(pr) { openBanker(pr); },
  wander(pr) { openWanderer(pr); },
  quests(pr) { openQuestBoard(pr); },
  stairs(pr) { enterSecretStairs(pr); },
  lever(pr) { // spaken öppnar alla järngaller
    if (pr.used) return; pr.used = true; stat('levers'); play('lever', 0.9); P.shake = 0.3;
    let n = 0; for (const d of Object.values(doors)) if (d.lever) { d.lever = false; d.target = 1; n++; setTimeout(() => play('gate', 0.7, 0.9, { x: d.x + 0.5, y: d.y + 0.5 }), 300); }
    say(n ? 'NÅGONSTANS ÖPPNAS ETT GALLER' : 'SPAKEN GNISSLAR', 2.5);
  },
};
// ---------- Följeslagare: korpen, lyktan och vargvalpen ----------
const PETS = {
  raven: { name: 'KORPEN', text: 'HÄMTAR GULD OCH FÖREMÅL ÅT DIG', color: '#9a9ac8', snd: 'raven' },
  lantern: { name: 'LYKTAN', text: 'LYSER UPP MÖRKRET OCH VISAR FÄLLOR', color: '#ffd070', snd: 'lantern' },
  pup: { name: 'VARGVALPEN', text: 'BITER FIENDER SOM KOMMER NÄRA', color: '#c0d0e0', snd: 'pup_bark' },
  firefly: { name: 'ELDFLUGAN', text: 'LYSER UPP MÖRKRET OCH BLÄNDAR FIENDER', color: '#fff090', snd: 'pet_firefly' },
  minigolem: { name: 'STENGOLEMEN', text: 'DRAR TILL SIG FIENDERNAS UPPMÄRKSAMHET', color: '#b0b0a0', snd: 'pet_golem' },
  owl: { name: 'UGGLAN', text: 'AVSLÖJAR OSYNLIGA FIENDER OCH FÄLLER FJÄDRAR', color: '#c8a878', snd: 'pet_owl' },
};
const PET_IDS = Object.keys(PETS);
const petOpen = id => PET_IDS.indexOf(id) < meta('pet') || (profile.pets || []).includes(id);
let pet = null, allies = [];
const petLv = () => run && run.pet ? Math.min(5, 1 + Math.floor((run.petXp || 0) / 12)) : 0;
const petPow = () => (1 + (petLv() - 1) * 0.2) * (1 + mod('petPower'));
function givePet(id, why) {
  if (!run || !PETS[id]) return;
  run.pet = id; run.petXp = run.petXp || 0; spawnPet(); play(PETS[id].snd, 0.8);
  say(`${why || 'EN NY FÖLJESLAGARE'}: ${PETS[id].name} – ${PETS[id].text}`, 3.5); logEvent('FÖLJESLAGARE: ' + PETS[id].name); stat('petsGot');
  if (pet) spawnPuff(pet.x, pet.y, 6);
}
function spawnPet() {
  pet = run && run.pet ? { id: run.pet, x: P.x - Math.cos(P.a) * 0.7, y: P.y - Math.sin(P.a) * 0.7, z: 0, t: 0, st: 'follow', cd: 1, rest: 0, tired: 0, target: null, mvx: 0, mvy: 0 } : null;
  if (pet && solid(pet.x, pet.y)) { pet.x = P.x; pet.y = P.y; }
}
function petXp(n) {
  if (!run || !run.pet) return; const lv = petLv(); run.petXp = (run.petXp || 0) + n;
  if (petLv() > lv) { say(`${PETS[run.pet].name} NÅDDE NIVÅ ${petLv()}`, 2); play(PETS[run.pet].snd, 0.7, 1.2); if (pet) spawnPuff(pet.x, pet.y, 5); }
}
function hurtPet(n) { // följeslagaren kan inte dö, men skadas den för mycket måste den vila
  if (!pet || pet.rest > 0) return; pet.tired += n;
  if (pet.tired >= 20) { pet.rest = 6; pet.tired = 0; pet.target = null; say(`${PETS[pet.id].name} ÄR SKADAD OCH VILAR EN STUND`, 1.8); play(PETS[pet.id].snd, 0.5, 0.7, { x: pet.x, y: pet.y }); }
}
function petMove(p, tx, ty, sp, dt, fly) {
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy); if (d < 0.05) { p.mvx = p.mvy = 0; return d; }
  const st = Math.min(d, sp * dt), ox = p.x, oy = p.y;
  if (fly) { p.x += dx / d * st; p.y += dy / d * st; } else tryMove(p, dx / d * st, dy / d * st, 0.18);
  p.mvx = p.x - ox; p.mvy = p.y - oy; return d;
}
const RAVEN_TAKES = it => it.type === 'gold' || it.type === 'goldpile' || it.type === 'shard' || it.type === 'key' || it.type === 'scroll'
  || (it.type === 'potion' && (P.potions || []).length < potSlots()) || (it.type === 'grenade' && P.grenades < GREN_MAX()) || (it.type === 'health' && P.hp < maxHp() * 0.8);
function updatePet(dt) {
  if (!run || !run.pet || boss && boss.dead === false && run.bossrush) { if (!run || !run.pet) pet = null; }
  if (!run || !run.pet) return;
  if (!pet || pet.id !== run.pet) spawnPet();
  const p = pet, lv = petLv(), fly = p.id !== 'pup' && p.id !== 'minigolem'; p.t += dt; p.cd -= dt;
  p.z = fly ? 0.42 + Math.sin(p.t * 3) * 0.06 : 0;
  const side = P.a + 2.3, hx = P.x + Math.cos(side) * 0.9, hy = P.y + Math.sin(side) * 0.9; // snett bakom dig
  if (Math.hypot(p.x - P.x, p.y - P.y) > 11 || (!fly && solid(p.x, p.y))) { p.x = solid(hx, hy) ? P.x : hx; p.y = solid(hx, hy) ? P.y : hy; spawnPuff(p.x, p.y, 3); }
  if (p.rest > 0) { // vilar: sitter still och sover
    p.rest -= dt; p.st = 'rest'; p.mvx = p.mvy = 0;
    if (Math.random() < dt * 1.2) particles.push({ x: p.x, y: p.y, z: 0.4, vx: 0, vy: 0, vz: 0.3, life: 1, maxLife: 1, img: fx.parts.zzz ? fx.parts.zzz[0] : fx.hit[1], size: 0.08, drift: true });
    if (p.rest <= 0) p.st = 'follow'; return;
  }
  p.tired = Math.max(0, p.tired - dt * 0.6);
  if (p.id === 'raven') { // korpen hämtar det som ligger nära
    if (p.target && (p.target.taken || !RAVEN_TAKES(p.target))) p.target = null;
    if (!p.target && p.cd <= 0) {
      let best = null, bd = 6 + lv;
      for (const it of items) if (!it.taken && !(it.hop > 0) && RAVEN_TAKES(it)) { const d = Math.hypot(it.x - P.x, it.y - P.y); if (d < bd && d > 0.8 && seen[(it.y | 0) * mw + (it.x | 0)]) { bd = d; best = it; } }
      p.target = best; p.cd = 0.4;
      if (best && Math.random() < 0.3) play('raven', 0.4, rnd(0.9, 1.2), { x: p.x, y: p.y });
    }
    if (p.target) {
      p.st = 'move';
      if (petMove(p, p.target.x, p.target.y, (4 + lv * 0.6) * (1 + mod('petPower') * 0.5), dt, true) < 0.3) {
        const it = p.target; p.target = null; p.cd = Math.max(0.3, 1.3 - lv * 0.18);
        if (!it.taken && pickUp(it)) { it.taken = true; score += 25; if (!it.drop) itemsTaken++; petXp(0.4); spawnPuff(it.x, it.y, 2); }
      }
      return;
    }
  }
  if (p.id === 'pup') { // valpen anfaller fiender som är nära dig
    if (p.target && (p.target.dead || p.target.dormant || Math.hypot(p.target.x - P.x, p.target.y - P.y) > 8 + lv)) p.target = null;
    if (!p.target && p.cd <= 0) {
      let best = null, bd = 5 + lv;
      for (const e of ents) if (!e.dead && !e.dormant && !e.hidden && e.alert && !(e.ghost > 0.5)) { const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < bd && hasLOS(p.x, p.y, e.x, e.y)) { bd = d; best = e; } }
      p.target = best; if (best) { play('pup_bark', 0.5, rnd(0.95, 1.15), { x: p.x, y: p.y }); p.cd = 0.3; }
    }
    if (p.target) {
      const e = p.target; p.st = p.st === 'attack' && p.t < 0.35 ? 'attack' : 'move';
      const d = petMove(p, e.x, e.y, 4.4 + lv * 0.3, dt, false);
      if (d < 0.75 + e.d.size * 0.3 && p.cd <= 0) {
        p.st = 'attack'; p.t = 0; p.cd = Math.max(0.55, 1.2 - lv * 0.1);
        const k = hurtEnemy(e, 4 * petPow(), e.x, e.y, { noProc: true }); e.slow = Math.max(e.slow || 0, 0.6);
        play('pup_bite', 0.6, rnd(0.9, 1.1), { x: e.x, y: e.y }); spawnBlood(e.x, e.y);
        if (k) { petXp(2); p.target = null; } else hurtPet(e.elite || e.boss ? 3 : 1.5);
      }
      return;
    }
  }
  if (p.id === 'lantern') { // lyktan visar fällor och smygande fiender nära dig
    if (p.cd <= 0) {
      p.cd = 0.5;
      for (const pr of props) if (pr.def && (pr.def.trap || pr.ch === 'z') && !pr.broken && Math.hypot(pr.x - p.x, pr.y - p.y) < 4 + lv) { pr.lit = tmr + 1; particles.push({ x: pr.x, y: pr.y, z: 0.2, vx: 0, vy: 0, vz: 0.4, life: 0.6, maxLife: 0.6, img: fx.hit[1], size: 0.06, add: true, tint: [255, 140, 60], fade: true }); }
      for (const e of ents) if (!e.dead && hasMod(e, 'stalker') && Math.hypot(e.x - p.x, e.y - p.y) < 4 + lv) e.revealT = Math.max(e.revealT || 0, 1);
    }
  }
  petV10(p, dt, lv);
  p.st = Math.hypot(p.x - hx, p.y - hy) > 0.4 ? 'move' : 'idle';
  petMove(p, hx, hy, Math.max(2.5, Math.hypot(P.vx, P.vy) * 1.15), dt, fly);
}
function petFrames(id) {
  const f = fx.pets && fx.pets[id];
  if (f) return f;
  if (id === 'raven') return { idle: fx.parts.bat || fx.hit, tint: [70, 70, 90] };
  if (id === 'lantern') return { idle: fx.parts.wisp || fx.fireball, tint: [255, 210, 120], add: true };
  if (id === 'firefly') return { idle: fx.parts.firefly || fx.parts.wisp || fx.fireball, tint: [255, 240, 140], add: true };
  if (id === 'owl') return { idle: fx.parts.bat || fx.hit, tint: [170, 130, 90] };
  if (id === 'minigolem' && enemyFrames['Ë']) return { idle: enemyFrames['Ë'].idle, move: enemyFrames['Ë'].move, attack: enemyFrames['Ë'].attack, tint: [170, 170, 160] };
  return enemyFrames['É'] ? { idle: enemyFrames['É'].idle, move: enemyFrames['É'].move, attack: enemyFrames['É'].attack, tint: [200, 190, 170] } : { idle: fx.hit };
}
function drawPet(o, plX, plY) {
  const f = petFrames(o.id), set = (o.st === 'attack' && f.attack) || ((o.st === 'move') && f.move) || f.idle;
  const n = o.st === 'attack' ? Math.min(set.length - 1, Math.floor(o.t * 10)) : Math.floor(tmr * (o.st === 'move' ? 10 : 6) + o.x) % set.length;
  const flip = (o.mvx || o.mvy) ? o.mvx * plX + o.mvy * plY < 0 : false;
  const size = fx.pets && fx.pets[o.id] ? { pup: 0.48, minigolem: 0.55, firefly: 0.45 }[o.id] || 0.5 : o.id === 'pup' ? 0.48 : o.id === 'minigolem' ? 0.5 : o.id === 'firefly' ? 0.24 : 0.3; // nya 32 px-bilder är större
  drawSprite(set[n], o.x, o.y, size, o.z, flip, o.id === 'lantern' ? 2 : null, 0, 0.55, !!f.add, o.rest > 0 ? [150, 150, 170] : f.tint || null);
}
// allierade: befriade fångar, nekromantikerns uppväckta döda
function spawnAlly(type, x, y, life, opt = {}) {
  const d = ENEMY_DEFS[type]; if (!d || !enemyFrames[type]) return null;
  const a = { type, d, x, y, t: 0, state: 'move', life, cd: 0.6, dmg: opt.dmg || Math.max(3, d.dmg * 0.6), tint: opt.tint || [120, 255, 140], ally: true, mvx: 0, mvy: 0, name: opt.name || d.name };
  allies.push(a); spawnPuff(x, y, 6); stat('allies'); return a;
}
function updateAllies(dt) {
  for (const a of allies) {
    a.t += dt; a.life -= dt; a.cd -= dt;
    if (a.life <= 0) { a.gone = true; spawnPuff(a.x, a.y, 5); continue; }
    if (a.state === 'attack') { if (a.t > 0.55) { a.state = 'move'; a.t = 0; } continue; }
    let foe = null, fd = 9;
    for (const e of ents) if (!e.dead && !e.dormant && !e.hidden) { const d = Math.hypot(e.x - a.x, e.y - a.y); if (d < fd && hasLOS(a.x, a.y, e.x, e.y)) { fd = d; foe = e; } }
    const ox = a.x, oy = a.y, sp = a.d.speed * dt * 1.1;
    if (foe) {
      if (fd < 0.85 + foe.d.size * 0.3) { if (a.cd <= 0) { a.state = 'attack'; a.t = 0; a.cd = 1.1; hurtEnemy(foe, a.dmg * (1 + mod('petPower') * 0.5), foe.x, foe.y, { noProc: true }); play('splat', 0.3, 1.1, { x: foe.x, y: foe.y }); } }
      else tryMove(a, (foe.x - a.x) / fd * sp, (foe.y - a.y) / fd * sp, 0.25);
    } else { const d = Math.hypot(P.x - a.x, P.y - a.y); if (d > 1.8) tryMove(a, (P.x - a.x) / d * sp, (P.y - a.y) / d * sp, 0.25); if (d > 14) { a.x = P.x - Math.cos(P.a); a.y = P.y - Math.sin(P.a); } }
    a.mvx = a.x - ox; a.mvy = a.y - oy; if (!a.mvx && !a.mvy && a.state === 'move') a.state = 'idle';
    else if (a.state === 'idle' && (a.mvx || a.mvy)) a.state = 'move';
  }
  allies = allies.filter(a => !a.gone);
}

