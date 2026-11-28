function hurtEnemy(e, dmg, hx, hy, opt = {}) {
  if (e.dead || e.dying || e.hidden) return false;
  { const r = v11Defend(e, dmg, opt); if (r === null) return false; dmg = r; } // illusioner och speglar
  { const r = v17Defend(e, dmg, opt); if (r === null) return false; dmg = r; } // spöken som är immuna
  { const r = v18Defend(e, dmg, opt); if (r === null) return false; dmg = r; } // marionetten som ligger, ormen under jord
  { const r = v19Defend(e, dmg, opt); if (r === null) return false; dmg = r; } // urverksugglan reflekterar
  dmg = v14Defend(e, dmg, opt); dmg = v15Dmg(e, dmg, opt); dmg = v17Dmg(e, dmg, opt); dmg = v18Dmg(e, dmg, opt); dmg = v21Dmg(e, dmg, opt); dmg = v22Dmg(e, dmg, opt); dmg = v23Dmg(e, dmg, opt);
  dmg = v30Dmg(e, dmg, opt); // version 30 (SPEL): glasgolemen, blödning av glasbössan
  if (opt.melee && !opt.exec && canExec(e)) return execute(e); // närstrid mot en vacklande fiende: avrättning
  if (e.dummy) { dpsLog.push({ t: tmr, d: dmg }); e.flash = 0.1; spawnNumber ? spawnNumber(e.x, e.y, dmg, opt.crit) : 0; return false; } // provdockan tar ingen skada men räknar
  if (Math.random() < mod('clockSlow')) e.slow = Math.max(e.slow || 0, 2);
  const wasUnaware = !e.alert && !e.dormant && !opt.noProc;
  if (e.eshield > 0) { const a = Math.min(e.eshield, dmg); e.eshield -= a; dmg -= a; e.flash = 0.08; if (e.eshield <= 0) { play('ricochet', 0.7, 0.6, { x: e.x, y: e.y }); say('SKÖLDEN BRAST', 1); } if (dmg <= 0) { alertEnemy(e, true); spawnNumber(e.x, e.y, a, false); return false; } }
  e.lastHurt = tmr;
  dmg = legendHit(e, dmg, opt); if (e.moonT > tmr) dmg *= 1.4; // legendariska vapen och månmärket
  dmg = crabShell(e, dmg, opt); if (e.boss) dmg = queenReflect(e, dmg, opt); if (e.d.crystal) dmg *= 1 + mod('crystalDmg'); if (P.swim || cellUnder() === '-') dmg *= 1 + mod('waterDmg');
  if (opt.melee && !opt.cleave) cleaveHit(e, dmg);
  if (e.d.stone && !opt.boom && !opt.melee) { dmg *= 0.5; if (Math.random() < 0.3) sparks(e.x, e.y, 0.6, 2); } // sten: kulor biter dåligt
  if (hasMod(e, 'prismatic') && !opt.noProc && Math.random() < 0.2 && (e.prT || 0) < tmr) { e.prT = tmr + 0.8; prismBeam(e.x, e.y, Math.atan2(P.y - e.y, P.x - e.x) + rnd(-0.1, 0.1), 5 + run.depth, 1, 0, new Set(), 16, true); play('prism_bounce', 0.5, 0.9, { x: e.x, y: e.y }); } // prismatisk: skickar tillbaka en stråle
  if (hasMod(e, 'mirror') && !opt.noProc && !opt.boom) { const r = dmg * 0.15; if (r > 0.3) { hurtPlayer(r); if ((e.mirT || 0) < tmr) { e.mirT = tmr + 1; spawnText(e.x, e.y, 'SPEGLAR', '#c0e0ff'); } } }
  if (e.d.armor) { const before = dmg; dmg = Math.max(dmg * 0.25, dmg - e.d.armor); if (dmg < before * 0.6 && !opt.quiet) play('ricochet', 0.35, rnd(1.2, 1.5), { x: e.x, y: e.y }); }
  e.revealT = 2;
  if (!e.boss && !e.elite && mod('execute') > 0 && (e.hp - dmg) / e.maxHp < mod('execute')) dmg = e.hp;
  if (e.charge > 0 && e.d.ai === 'charge' && !e.boss) { e.charge = 0; e.stun = 0.6; spawnText(e.x, e.y, 'SNUBBLAR', '#e8d9b0'); } // träffad mitt i språnget
  if (e.leapT > 0 && !e.boss) { e.leapT = 0; e.stun = 0.5; }
  if (!opt.noProc && !e.boss && e.alert === false && !e.dormant) { dmg *= 1.5 + mod('stealthDmg'); if ((e.surpT || 0) < tmr) { e.surpT = tmr + 1; spawnText(e.x, e.y, 'ÖVERRASKAD', '#c0c0ff'); } } // ovetande fiender
  if (e.airZ > 0) dmg = v26bAirHit(e, dmg, opt); else v26bShotLaunch(e, opt); // version 26B: jonglering – +25 % i luften, hagel på nära håll lyfter
  if (run) run.dmgDealt = (run.dmgDealt || 0) + Math.max(0, Math.min(dmg, e.hp));
  e.hp -= dmg; e.flash = 0.12; alertEnemy(e, true); gfxEHit(e, dmg, opt);
  staggerCheck(e, opt); if (e.boss && cmode('clock')) clockAdd(0.25);
  if (e.boss && !e.dying) { bossStagger(e, dmg); if (e.id === 'ghost' && mirrors.length) { for (const m of mirrors) spawnPuff(m.x, m.y, 6); mirrors = []; } }
  if (e.hp <= 0 && -e.hp > e.maxHp * 0.6 && !e.boss) e.overkill = true; // överdöd: sprängs i bitar
  if (mod('lifesteal') > 0) heal(dmg * mod('lifesteal'), true);
  spawnNumber(e.x, e.y, dmg, opt.crit);
  if (!opt.quiet) { play('splat', 0.35, rnd(0.9, 1.2), { x: e.x, y: e.y }); gfxEBleed(e, 2, hx ?? e.x, hy ?? e.y); } // FIENDER: blod, benflisor, gnistor eller slem efter material
  v27Hit(e, dmg, hx, hy, opt); // version 27 (BLOOD): riktad blodstråle och stänk på väggen bakom, i materialets färg
  if (!opt.noProc) {
    if (Math.random() < mod('burnChance')) e.burn = 3;
    if (Math.random() < mod('slowChance')) e.slow = 2.5;
    if (Math.random() < mod('explodeChance')) explode(hx ?? e.x, hy ?? e.y, dmg * 0.6, 1.4);
    if (Math.random() < mod('freezeChance')) freeze(e, 2);
    if (Math.random() < mod('poisonChance')) e.poison = Math.max(e.poison || 0, 4);
    if (Math.random() < mod('bleedChance')) e.bleed = Math.max(e.bleed || 0, 4);
    if (Math.random() < mod('shockChance')) { const o = nearestFoes(e, 4, 1)[0]; if (o) { zap(e.x, e.y, o.x, o.y, [160, 210, 255]); play('shock', 0.4, rnd(0.9, 1.2), { x: o.x, y: o.y }); hurtEnemy(o, dmg * 0.5, o.x, o.y, { noProc: true }); } }
    if (opt.crit && mod('critHeal')) heal(mod('critHeal'), true);
  }
  if (opt.melee && hasMod(e, 'thorny') && (e.thornT || 0) < tmr) { e.thornT = tmr + 0.4; hurtPlayer(3, e.x, e.y, 'melee'); spawnText(e.x, e.y, 'TAGGAR', '#b0e080'); }
  if (e.hp <= 0 && clockRewind(e)) return false;
  if (e.hp <= 0 && mercuryReform(e, opt)) return false; // kvicksilvergolemen reser sig en gång
  if (e.hp <= 0 && marionetteFall(e, opt)) return false; // marionetten faller ihop och kan resa sig en gång
  if (e.hp <= 0 && hasMod(e, 'undying') && !e.revived) { e.revived = true; e.hp = e.maxHp * 0.5; e.burn = 0; e.poison = 0; spawnText(e.x, e.y, 'ÅTERUPPSTÅR!', '#c0ffc0'); spawnPuff(e.x, e.y, 8); play('necro_raise', 0.6, 1.2, { x: e.x, y: e.y }); return false; } // odödlig en gång
  if (e.hp <= 0) { if (wasUnaware && !e.boss) stealthKill(e); killCtx = Object.assign({ stealth: wasUnaware && !e.boss }, opt); killEnemy(e); killCtx = null; return true; }
  if (e.d.ai === 'blink' && (e.blinkCd || 0) <= 0 && Math.random() < 0.45) blink(e);
  if (!e.boss && !opt.quiet && Math.random() < 0.55 && e.state !== 'attack') { e.state = 'pain'; e.t = 0; }
  return false;
}
const killTimes = [];
function multiKill() { // flera dödade inom kort tid: meddelande och lite guld
  killTimes.push(tmr); while (killTimes.length && tmr - killTimes[0] > 1.3) killTimes.shift();
  const n = killTimes.length;
  if (n >= 2) { run.gold += 3; // stilmätaren visar FLERDÖD, så inget eget meddelande
    P.multi = Math.max(P.multi || 0, n); }
}
function gib(e) { // köttbitar och ben flyger
  e.gibbed = true; stat('gibs'); play('gib', 0.5, rnd(0.9, 1.1), { x: e.x, y: e.y });
  const f = fx.parts.gib;
  if (!gfxEGib(e)) for (let i = 0; i < 8; i++) { const a = rnd(0, TAU), sp = rnd(1, 3); particles.push({ x: e.x, y: e.y, z: 0.4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(1.5, 3.5), life: rnd(1.5, 2.5), img: f ? f[i % f.length] : fx.blood[i % 3], size: 0.1, grav: true, bounce: true }); } // FIENDER: bitarna efter material (kött, ben, slem, metall)
  if (gfxE.on && gfxEKind(e) !== 'flesh') return; // ben, slem och metall blöder inte
  if (v27NoBleed(e)) return; // version 27 (BLOOD): inte heller spöken och eld
  for (let i = 0; i < 6; i++) spawnBlood(e.x, e.y); addDecal(e.x, e.y); addDecal(e.x + rnd(-0.4, 0.4), e.y + rnd(-0.4, 0.4));
}
function shatter(e) { // frusna fiender splittras
  e.gibbed = true; play('ice_break', 0.7, rnd(0.9, 1.1), { x: e.x, y: e.y }); gfxEShatter(e);
  efx2Shatter(e); // version 25.1: isen splittras (Effekseer)
  const f = fx.parts.ice;
  for (let i = 0; i < 10; i++) { const a = rnd(0, TAU), sp = rnd(1, 3); particles.push({ x: e.x, y: e.y, z: 0.4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(1.5, 3), life: rnd(1, 1.6), img: f ? f[i % f.length] : fx.hit[0], size: 0.08, grav: true, bounce: true, tint: f ? null : [160, 210, 255] }); }
}
function comboKill(e) { // kombomätare: dödanden i följd inom 3 s
  P.combo = P.comboT > 0 ? P.combo + 1 : 1; P.comboT = 3;
  if (P.combo >= 3) { const g = 1 + Math.floor(P.combo / 3) + Math.round(mod('comboGold')); run.gold += g; if (P.combo % 3 === 0) { play('combo', 0.5, 1 + Math.min(1, P.combo / 15)); spawnText(e.x, e.y, `KOMBO x${P.combo}`, '#ffb040'); } }
  run.bestCombo = Math.max(run.bestCombo || 0, P.combo);
}
function killEnemy(e) {
  hitStop = Math.max(hitStop, e.boss ? 0.15 : e.elite ? 0.07 : 0.02);
  e.dead = true; e.t = 0; e.state = 'dead'; gfxEKill(e); gfxWDeathFx(e); if (e.d.ai !== 'eel') kills++; run.kills++; if (e.tb) { e.tb.t = 0; e.tb = null; } score += Math.round(e.d.score * (e.elite ? 3 : 1) * depthMul());
  multiKill(); addDecal(e.x, e.y); comboKill(e); vib(e.boss ? 'boss' : 'kill');
  v27NoPool(e); // version 27 (BLOOD): spöken och eld lämnar ingen blodpöl
  play('click', 0.3, 2.4); // tydligt dödsljud
  if (e.boss || e.guardian) for (let i = 0; i < 5; i++) if (fx.parts.scorch) decals.push({ x: e.x + rnd(-0.8, 0.8), y: e.y + rnd(-0.8, 0.8), img: fx.parts.scorch[0], size: rnd(0.14, 0.24) }); // bossen lämnar en krater
  if (e.d.ai === 'wisp' || e.type === 'Ü') dissolve(e);
  else if (e.frozen > 0) shatter(e); else if (e.overkill) gib(e);
  else if (e.burn > 0 && !e.boss) { e.gibbed = true; for (let i = 0; i < 6; i++) particles.push({ x: e.x + rnd(-0.2, 0.2), y: e.y + rnd(-0.2, 0.2), z: rnd(0.1, 0.7), vx: rnd(-0.3, 0.3), vy: rnd(-0.3, 0.3), vz: 0.4, life: 1.5, maxLife: 1.5, img: fx.parts.ash ? fx.parts.ash[i % 2] : fx.hit[0], size: 0.07, drift: true }); if (fx.parts.scorch) decals.push({ x: e.x, y: e.y, img: fx.parts.scorch[0], size: 0.08 }); } // brända blir aska
  if (e.leader) leaderDied(e);
  if (e.r25cmd) r25CmdDied(e); // version 25: befälhavaren dör – truppens moral faller
  if (lvl && lvl.biome) { const wb = (profile.wkillsBiome = profile.wkillsBiome || {}), bb = (wb[lvl.biome] = wb[lvl.biome] || {}), wid = WEAPONS[P.weapon].id; bb[wid] = (bb[wid] || 0) + 1; }
  abilityKill(); masteryKill(); v11Kill(e); v13Kill(e); v15Kill(e); v16Kill(e); v17Kill(e); v18Kill(e); v19Kill(e); v20Kill(e); v21Kill(e); v22Kill(e); v23Kill(e); loopKill(e); legendDropChance(e); if (legendCtx === 'bloodaxe') P.rageT = Math.max(P.rageT || 0, 2.5); if (e.d.ai === 'clocksoldier' && mod('rewindHeal')) heal(mod('rewindHeal'), true); gainXp(e.boss && !e.guardian ? 150 : e.guardian ? 70 : clamp((e.d.score || 100) / 12, 3, 40) * (e.elite ? 2.5 : 1) * (e.minion ? 0.3 : 1)); // erfarenhet: vanliga fiender efter svårighet, väktare och bossar fast
  v30Kill(e); // version 30 (SPEL): glasgolemen spricker, bossens faror städas bort
  if (e.elite) run.wanderElite = (run.wanderElite || 0) + 1; if (e.guardian) run.wanderGuard = (run.wanderGuard || 0) + 1;
  if (quests) for (const q of quests) { if (q.kind === 'wkills' && !q.done && WEAPONS[P.weapon].id === q.weapon) q.have++; if (q.kind === 'elite' && e.elite) q.eliteKilled = true; }
  if ('YÉÅ'.includes(e.type) && Math.random() < 0.15) dropItem('meat', e.x, e.y);
  if (e.carry) { dropItem(e.carry, e.x, e.y); e.carry = null; }
  if (e.bounty) { stat('bounties'); run.gold += 40; items.push({ type: 'cardpick', x: e.x, y: e.y, taken: false, drop: true, luck: 0.6, title: 'BYTET' }); say('JAKTEN ÄR ÖVER: +40 GULD', 3); floorQuest = null; }
  if (e.type === 'Q' && floorQuest && floorQuest.kind === 'mimic') { run.gold += 30; say('MIMICEN ÄR FUNNEN: +30 GULD', 2.5); floorQuest = null; }
  if (e.champion) { stat('champions'); play('champion', 0.8); for (let i = 0; i < 10; i++) dropItem('gold', e.x, e.y); dropItem('goldpile', e.x, e.y); say('CHAMPION BESEGRAD!', 2); run.champions = (run.champions || 0) + 1; }
  if (mod('shieldOnKill')) P.shield = Math.min(mod('shield') + 30, P.shield + mod('shieldOnKill'));
  if (Math.random() < mod('killExplode')) explode(e.x, e.y, 12 * (1 + mod('dmg')), 1.6);
  if (!e.boss && !boss && kills >= totalEnemies && totalEnemies > 2) { slowmo = Math.max(slowmo, 0.9); say('VÅNINGEN ÄR RENSAD', 2); } // sista fienden: slow motion
  profile.bestiary = profile.bestiary || {}; if (!e.boss) { profile.bestiary[e.type] = (profile.bestiary[e.type] || 0) + 1; if (lvl.biome) { const bb = profile.bestBiomes = profile.bestBiomes || {}; bb[e.type] = bb[e.type] || []; if (!bb[e.type].includes(lvl.biome)) bb[e.type].push(lvl.biome); } } run.wkills = run.wkills || {}; run.wkills[WEAPONS[P.weapon].id] = (run.wkills[WEAPONS[P.weapon].id] || 0) + 1;
  play('gore', 0.5, rnd(0.9, 1.2), { x: e.x, y: e.y });
  const dsnd = { S: ['bonesnap', 1], K: ['bonesnap', 0.8], N: ['bonesnap', 0.7], R: ['bonesnap', 1.2], V: ['pain', 1.2], I: ['hiss', 1.5], L: ['splat', 0.6], l: ['splat', 1.2], O: ['pain', 0.9], W: ['pain', 0.6] }[e.type] || ['pain', 0.8];
  play(dsnd[0], 0.5, dsnd[1] * rnd(0.92, 1.08), { x: e.x, y: e.y });
  gfxEBleed(e, 5, e.x, e.y);
  if (mod('killHeal')) heal(mod('killHeal'));
  petXp(1);
  if (!e.boss && !e.guardian && !e.minion && enemyFrames[e.type] && Math.random() < mod('allyChance')) { e.gibbed = true; const a = spawnAlly(e.type, e.x, e.y, 15, {}); if (a) { spawnText(e.x, e.y, 'RESER SIG', '#80ff90'); play('moan', 0.5, 1.3, { x: e.x, y: e.y }); } } // nekromanti
  if (mod('killArmor')) P.armor = Math.min(200, P.armor + mod('killArmor'));
  if (mod('speedOnKill')) P.haste = Math.max(P.haste, mod('speedOnKill'));
  if (e.boss) { bossDefeated(e); return; }
  if (e.d.ai === 'split') splitBlob(e);
  if (e.type === '!') { explode(e.x, e.y, 20, 2.0, true, true); play('bigboom', 0.8, 1.1, { x: e.x, y: e.y }); e.gibbed = true; }
  if (e.type === '^') sporeCloud(e.x, e.y);
  if (e.type === 'Ü') frostBurst(e.x, e.y);
  if (e.type === 'Æ') elementalSplit(e);
  if (e.stolen) { const n = Math.max(1, Math.round(e.stolen / 8)); for (let i = 0; i < n; i++) dropItem('goldpile', e.x, e.y); say('GULDET ÄR TILLBAKA', 1.5); }
  if (e.knivesIn) for (let i = 0; i < e.knivesIn; i++) dropItem('knifepick', e.x, e.y);
  if (e.poison > 0 && up('poison')) for (const o of nearestFoes(e, 3, 4)) o.poison = 4;
  if (e.burn > 0 && up('wildfire')) for (const o of nearestFoes(e, 3, 4)) { o.burn = Math.max(o.burn, 4); zap(e.x, e.y, o.x, o.y, [255, 140, 60]); }
  if (e.elite) {
    if (Math.random() < (dmod('elite') ? 1 : 0.15)) dropItem('cardpick', e.x, e.y); // ibland ett kortval
    for (let i = 0; i < 4; i++) dropItem('gold', e.x, e.y);
    dropItem(Math.random() < 0.5 ? 'health' : 'ammo', e.x, e.y);
    if (e.elite.id === 'explosive') explode(e.x, e.y, 18, 1.8, true);
    if (Math.random() < 0.06 + mod('weaponDrop')) { const miss = WEAPONS.map((w, i) => i).filter(i => !P.has[i]); if (miss.length && !run.pact && !cmode('pistol')) { dropItem(WEAPONS[miss[(Math.random() * miss.length) | 0]].id, e.x, e.y); say('ELITEN TAPPADE ETT VAPEN', 2); } }
    if (hasMod(e, 'splitter')) for (let i = 0; i < 2; i++) { const a = rnd(0, TAU), o = makeEnemy(e.type, e.x + Math.cos(a) * 0.5, e.y + Math.sin(a) * 0.5); o.hp = o.maxHp = o.maxHp * 0.45; o.d = { ...o.d, size: o.d.size * 0.75 }; o.alert = true; o.minion = true; ents.push(o); totalEnemies++; spawnPuff(o.x, o.y, 4); }
    if (e.eliteGoldDone !== true) { e.eliteGoldDone = true; const g = Math.round(8 * mod('eliteGold')); if (g > 0) run.gold += g; }
  } else {
    const r = Math.random();
    const lowHp = P.hp < maxHp() * 0.35; // låg hälsa: hälsa faller oftare
    if (r < 0.22) dropItem('ammo', e.x, e.y); else if (r < (lowHp ? 0.45 : 0.32) * (asc() >= 3 ? 0.55 : 1) + 0.22 * (asc() >= 3 ? 0.45 : 0)) dropItem('health', e.x, e.y);
    if (Math.random() < 0.5) dropItem('gold', e.x, e.y);
  }
  // portal: när våningens sista elit dör, eller när alla fiender är döda
  if (!boss && !run.survival && !(run.practice && run.practice.enemy) && !portals.length && ((e.elite && !ents.some(o => o.elite && !o.dead)) || kills >= Math.ceil(totalEnemies * (cmode('quick') ? 0.6 : 1)))) {
    if (e.elite) spawnPortal(e.x, e.y, 'floor'); else spawnPortal(P.x + Math.cos(P.a) * 1.8, P.y + Math.sin(P.a) * 1.8, 'floor');
  }
}
// Explosion: skadar fiender (och spelaren om hurtsPlayer) inom radien
const flashes = []; // tillfälligt ljus från explosioner
