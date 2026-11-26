// ---------- Version 25.1: lobbar och smällar genom väggar, röster till utropen (FIX251) ----------
// LOBBAR: kanonjärens kula och eldkrukan (lobShot), slammet (v20Lob), v22:s klot och R25-granaten landar före första väggen eller
// stängda dörren på linjen (cast: bara väggar och dörrar, inte rekvisita, så att krutfat och lådor inte stoppar bågen). Lika inomhus
// och utomhus: aldrig genom en vägg. R25 väljer helst en kastare med fri bana; varningsringen ritas där granaten faktiskt landar.
// SMÄLLAR: explode, r25Boom, lobLand och v19Boom skadar spelaren och fiender bara med fri sikt från smällen (boomSees: en cast per
// figur inom radien). Krukor, krutfat (kedjereaktioner) och spruckna väggar '{' sköts som förut.
// RÖSTER: korta förvrängda röster (espeak-ng + ffmpeg, tools/sounds/make25_voice.sh) i tre röstlägen – djup (soldater, riddare,
// vakter), hes (spöken, fångar, gruvarbetare, nomader) och väsande (kultister, ödlor, schakaler) – på svenska och engelska. Bara det
// valda språkets 42 filer laddas (assets/snd/vo/, startas av loadSounds). Rösten ersätter morrandet i ai24Bark och r25Bark, spelas
// 3D-positionerad från fienden och har en egen spärr (0,8 s) ovanpå barkspärrarna. Av: settings.voices = false (RÖSTER under LJUD).
const FIX251 = { st: { clips: 0, blocked: 0, vplays: 0, vskip: 0, vloaded: 0, vlog: [] }, vlang: null, vT: -9, vload: null };
function lobClip(x0, y0, tx, ty) { // [x, y]: målet, eller 0,3 rutor före första väggen/dörren på linjen från kastaren
  const dx = tx - x0, dy = ty - y0, d = Math.hypot(dx, dy);
  if (d < 0.05 || !map) return [tx, ty];
  const r = cast(x0, y0, dx / d, dy / d, d + 0.5);
  if (r.dist >= d) return [tx, ty];
  const k = Math.max(0, r.dist - 0.3); FIX251.st.clips++;
  return [x0 + dx / d * k, y0 + dy / d * k];
}
function lobMiss(src, tx, ty) { const c = lobClip(src.x, src.y, tx, ty); return Math.hypot(c[0] - tx, c[1] - ty); } // hur långt före målet bågen tar stopp
function lobLen(src, tx, ty) { const c = lobClip(src.x, src.y, tx, ty); return Math.hypot(c[0] - src.x, c[1] - src.y); } // hur långt bågen faktiskt går
function boomBlk(x, y) { const c = cellAt(x, y); return isWallChar(c) || (isDoorChar(c) && doorAt(x, y).open < 0.85); }
function boomSees(x, y, tx, ty) { // fri sikt från smällen till (tx, ty); en smäll på en väggyta räknas från den fria punkt intill som ligger närmast målet
  if (!map || Math.hypot(tx - x, ty - y) < 0.5) return true;
  if (boomBlk(x, y)) { // projektiler som studsat tillbaka ett fast stycke kan sitta en bit in i väggen: växande radie tills en punkt är fri
    const d = Math.hypot(tx - x, ty - y), ux = (tx - x) / d, uy = (ty - y) / d; let bx = x, by = y, best = -9;
    for (const rr of [0.08, 0.2, 0.35, 0.5]) { for (let i = 0; i < 8; i++) { const a = i * TAU / 8, cx = x + Math.cos(a) * rr, cy = y + Math.sin(a) * rr; if (boomBlk(cx, cy)) continue; const s = Math.cos(a) * ux + Math.sin(a) * uy; if (s > best) { best = s; bx = cx; by = cy; } } if (best > -9) break; }
    if (best === -9) { FIX251.st.blocked++; return false; }
    x = bx; y = by;
  }
  const ok = hasLOS(x, y, tx, ty); if (!ok) FIX251.st.blocked++; return ok;
}
const V251_LINES = { 'FLANKERA!': 'flank', 'HAN LADDAR OM!': 'reload', 'VAR ÄR HAN?': 'where', 'TÄCK MIG!': 'coverme', 'I SKYDD!': 'takecover', 'UT MED DIG!': 'flush', 'MAN NERE!': 'mandown',
  'DÄR ÄR HAN!': 'there', 'SKÖLDAR UPP!': 'shields', 'BAKOM MIG!': 'behind', 'FRAMÅT!': 'forward', 'HÅLL LINJEN!': 'hold', 'BEFÄLET ÄR DÖTT!': 'cmddown', 'GRANAT!': 'grenade' };
const V251_KIND = { 'Ä': 'hiss', 'Ȉ': 'hiss', 'Ê': 'hiss', 'ʐ': 'rasp', 'Ǖ': 'rasp', 'ʑ': 'rasp', 'ɖ': 'rasp', 'ȡ': 'rasp', 'Ɂ': 'rasp' }; // övriga talare: djup
const V251_KINDS = ['deep', 'rasp', 'hiss'];
function v251Lang() { return window.I18N && I18N.lang && I18N.lang() === 'en' ? 'en' : 'sv'; }
function v251Load() { // bara det valda språkets röster; läggs i snd som vo_<rad>_<röst>_<språk> så att play() sköter 3D-ljudet
  const lang = v251Lang(); if (!actx || FIX251.vlang === lang) return FIX251.vload;
  FIX251.vlang = lang; FIX251.st.vloaded = 0;
  return (FIX251.vload = Promise.all(Object.values(V251_LINES).flatMap(id => V251_KINDS.map(async k => { const n = `${id}_${k}_${lang}`;
    try { const r = await fetch(`${A}snd/vo/${n}.ogg`); if (!r.ok) return; const b = await actx.decodeAudioData(await r.arrayBuffer()); if (FIX251.vlang === lang) { snd['vo_' + n] = b; FIX251.st.vloaded++; } } catch (e) { /* rösten är valfri */ } }))));
}
function v251Voice(e, text) { // från ai24Bark/r25Bark: true = rösten spelades (i stället för morrandet)
  if (settings.voices === false || !e || !V251_LINES[text]) return false;
  if (tmr - FIX251.vT < 0.8 && tmr >= FIX251.vT) { FIX251.st.vskip++; return false; } // två röster i munnen på varandra: den andra morrar som förut
  const n = `vo_${V251_LINES[text]}_${V251_KIND[e.type] || 'deep'}_${FIX251.vlang || v251Lang()}`;
  const h = play(n, 0.75, rnd(0.96, 1.04), { x: e.x, y: e.y }); if (!h) return false;
  FIX251.vT = tmr; FIX251.st.vplays++; const L = FIX251.st.vlog; L.push({ n, t: +tmr.toFixed(2), type: e.type }); if (L.length > 12) L.shift();
  return true;
}
function fix251Api() { // window.__game.fix251: för t116
  return { st: () => FIX251.st, lobClip, lobMiss, boomSees, lobShot, lobs: () => lobs, lang: () => FIX251.vlang, load: () => v251Load(), lines: V251_LINES, kind: V251_KIND,
    voiced: () => Object.keys(snd).filter(k => k.startsWith('vo_')), voice: v251Voice, resetV: () => { FIX251.vT = -9; }, audio: () => { ensureAudio(); return !!actx; },
    nade: hold => { if (P.grenades <= 0) P.grenades = 1; WS.throwT = hold || 0; grenadeThrow(); } };
}
// ---------- Specialfiender ----------
function spawnPuff(x, y, n = 5) { // magisk rök när något dyker upp eller försvinner
  efxTele(x, y, n); // version 25: Effekseer-teleporten
  const efx2I = efx2Puff(x, y, n); // version 25.1: spelarens egen teleport (skärmeffekten)
  for (let j = 0; j < n; j++) particles.push({ x: x + rnd(-0.2, 0.2), y: y + rnd(-0.2, 0.2), z: rnd(0.2, 0.6), vx: rnd(-0.8, 0.8), vy: rnd(-0.8, 0.8), vz: rnd(0.5, 1.5), life: 0.45, maxLife: 0.45, frames: fx.hit, img: fx.hit[0], size: 0.4, add: true });
  if (efx2I >= 0) particles.length = efx2I; // version 25.1: portalen ersätter puffen i kameran (den fyllde skärmen); lowfx: puffen finns kvar
}
function freeSpot(x, y, r) { return !solid(x, y) && !solid(x + r, y) && !solid(x - r, y) && !solid(x, y + r) && !solid(x, y - r); }
function blink(e) { // smådjävulen hoppar åt sidan
  const side = Math.atan2(P.y - e.y, P.x - e.x) + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
  for (const d of [2.2, 1.6, 1.1]) {
    const x = e.x + Math.cos(side) * d, y = e.y + Math.sin(side) * d;
    if (freeSpot(x, y, 0.3)) { spawnPuff(e.x, e.y); e.x = x; e.y = y; spawnPuff(x, y); e.blinkCd = 1.6; play('whoosh', 0.5, 1.6, { x, y }); return; }
  }
}
function splitBlob(e) { // blodslemmet delar sig i två droppar
  for (const s of [-1, 1]) {
    const a = Math.atan2(P.y - e.y, P.x - e.x) + s * 1.2, x = e.x + Math.cos(a) * 0.45, y = e.y + Math.sin(a) * 0.45;
    const c = makeEnemy('l', freeSpot(x, y, 0.2) ? x : e.x, freeSpot(x, y, 0.2) ? y : e.y);
    c.alert = true; c.state = 'move'; c.cd = 0.8; ents.push(c); totalEnemies++;
  }
  play('splat', 0.7, 0.6, { x: e.x, y: e.y });
}
const ENEMY_AI = { // returnerar true när beteendet tar över hela uppdateringen
  mummy: (...a) => AI_V7.mummy(...a), scarab: (...a) => AI_V7.scarab(...a), jackal: (...a) => AI_V7.jackal(...a), thief: (...a) => AI_V7.thief(...a), doppel: (...a) => AI_V7.doppel(...a),
  golem: (...a) => AI_V8.golem(...a), shardwisp: (...a) => AI_V8.shardwisp(...a), sailor: (...a) => AI_V8.sailor(...a), eel: (...a) => AI_V8.eel(...a), siren: (...a) => AI_V8.siren(...a), crab: (...a) => AI_V8.crab(...a), stalker: (...a) => AI_V8.stalker(...a), witch: (...a) => AI_V8.witch(...a),
  weepingangel: (...a) => AI_V16.weepingangel(...a), thornvine: (...a) => AI_V16.thornvine(...a), gardener: (...a) => AI_V16.gardener(...a), dreameater: (...a) => AI_V16.dreameater(...a), doppelganger: (...a) => AI_V16.doppelganger(...a), sleepwalker: (...a) => AI_V16.sleepwalker(...a),
  ghostpirate: (...a) => AI_V17.ghostpirate(...a), gunner: (...a) => AI_V17.gunner(...a), drownedsailor: (...a) => AI_V17.drownedsailor(...a), ghostparrot: (...a) => AI_V17.ghostparrot(...a), tentacle: (...a) => AI_V17.tentacle(...a), rat: (...a) => AI_V17.rat(...a),
  clown: (...a) => AI_V18.clown(...a), juggler: (...a) => AI_V18.juggler(...a), stiltwalker: (...a) => AI_V18.stiltwalker(...a), knifethrower: (...a) => AI_V18.knifethrower(...a), lion: (...a) => AI_V18.lion(...a), marionette: (...a) => AI_V18.marionette(...a),
  lizardman: (...a) => AI_V18.lizardman(...a), blowgunner: (...a) => AI_V18.blowgunner(...a), monkey: (...a) => AI_V18.monkey(...a), jaguar: (...a) => AI_V18.jaguar(...a), mosquito: (...a) => AI_V18.mosquito(...a), templeguardian: (...a) => AI_V18.templeguardian(...a),
  alligator: (...a) => AI_V20.alligator(...a), sludgeman: (...a) => AI_V20.sludgeman(...a), plumber: (...a) => AI_V20.plumber(...a), leech: (...a) => AI_V20.leech(...a), scorpion: (...a) => AI_V20.scorpion(...a), nomad: (...a) => AI_V20.nomad(...a), sandwraith: (...a) => AI_V20.sandwraith(...a), vulture: (...a) => AI_V20.vulture(...a),
  turnkey: (...a) => AI_V21.turnkey(...a), convict: (...a) => AI_V21.convict(...a), torturer: (...a) => AI_V21.torturer(...a), watchdog: (...a) => AI_V21.watchdog(...a), drownedfisher: (...a) => AI_V21.drownedfisher(...a), fishman: (...a) => AI_V21.fishman(...a), shorecrab: (...a) => AI_V21.shorecrab(...a), gulls: (...a) => AI_V21.gulls(...a),
  attendant: (...a) => AI_V22.attendant(...a), steamghost: (...a) => AI_V22.steamghost(...a), gladiator: (...a) => AI_V22.gladiator(...a), moldcrawler: (...a) => AI_V22.moldcrawler(...a), fireimp: (...a) => AI_V22.fireimp(...a), lostsoul: (...a) => AI_V22.lostsoul(...a), fleshbrute: (...a) => AI_V22.fleshbrute(...a), ashwalker: (...a) => AI_V22.ashwalker(...a),
  butcher: (...a) => AI_V23.butcher(...a), pigman: (...a) => AI_V23.pigman(...a), flies: (...a) => AI_V23.flies(...a), crawler: (...a) => AI_V23.crawler(...a), ghostsoldier: (...a) => AI_V23.ghostsoldier(...a), ghostarcher: (...a) => AI_V23.ghostarcher(...a), ghostrider: (...a) => AI_V23.ghostrider(...a), crows: (...a) => AI_V23.crows(...a),
  miner: (...a) => AI_V19.miner(...a), coalgolem: (...a) => AI_V19.coalgolem(...a), moleman: (...a) => AI_V19.moleman(...a), sparkwisp: (...a) => AI_V19.sparkwisp(...a), starspawn: (...a) => AI_V19.starspawn(...a), astronomer: (...a) => AI_V19.astronomer(...a), clockowl: (...a) => AI_V19.clockowl(...a), voidwatcher: (...a) => AI_V19.voidwatcher(...a),
  homunculus: (...a) => AI_V17.homunculus(...a), ooze: (...a) => AI_V17.ooze(...a), apprentice: (...a) => AI_V17.apprentice(...a), mercurygolem: (...a) => AI_V17.mercurygolem(...a), vialwisp: (...a) => AI_V17.vialwisp(...a), chimera: (...a) => AI_V17.chimera(...a),
  choirboy: (...a) => AI_V15.choirboy(...a), flagellant: (...a) => AI_V15.flagellant(...a), cherub: (...a) => AI_V15.cherub(...a), workerbee: (...a) => AI_V15.workerbee(...a), stingerknight: (...a) => AI_V15.stingerknight(...a), larva: (...a) => AI_V15.larva(...a),
  snowwraith: (...a) => AI_V14.snowwraith(...a), lavaworm: (...a) => AI_V14.lavaworm(...a), scarabpriest: (...a) => AI_V14.scarabpriest(...a), crystalspider: (...a) => AI_V14.crystalspider(...a), anglerfish: (...a) => AI_V14.anglerfish(...a), windspirit: (...a) => AI_V14.windspirit(...a),
  grimoire: (...a) => AI_V13.grimoire(...a), inkslime: (...a) => AI_V13.inkslime(...a), archivist: (...a) => AI_V13.archivist(...a), moltengolem: (...a) => AI_V13.moltengolem(...a), steambot: (...a) => AI_V13.steambot(...a), sparkdrone: (...a) => AI_V13.sparkdrone(...a),
  sporling: (...a) => AI_V11.sporling(...a), mycelbrute: (...a) => AI_V11.mycelbrute(...a), myconid: (...a) => AI_V11.myconid(...a), mirrorknight: (...a) => AI_V11.mirrorknight(...a), illusionist: (...a) => AI_V11.illusionist(...a), shardling: (...a) => AI_V11.shardling(...a), kingimg: (...a) => AI_V11.kingimg(...a),
  jailer: (...a) => AI_V10.jailer(...a), burrower: (...a) => AI_V10.burrower(...a), gravedigger: (...a) => AI_V10.gravedigger(...a), rootling: (...a) => AI_V10.rootling(...a), crossbowman: (...a) => AI_V10.crossbowman(...a), toad: (...a) => AI_V10.toad(...a),
  clocksoldier: (...a) => AI_V9.clocksoldier(...a), gearspider: (...a) => AI_V9.gearspider(...a), timekeeper: (...a) => AI_V9.timekeeper(...a), harpy: (...a) => AI_V9.harpy(...a), stormcaller: (...a) => AI_V9.stormcaller(...a), cloudgiant: (...a) => AI_V9.cloudgiant(...a),
  necro: (...a) => AI_V6.necro(...a), elemental: (...a) => AI_V6.elemental(...a), worm: (...a) => AI_V6.worm(...a), knight: (...a) => AI_V6.knight(...a), banshee: (...a) => AI_V6.banshee(...a),
  ghoul(e, dt, dist) { // ghoulen äter lik för att läka och undviker starkt ljus
    if (e.eatT > 0) { e.eatT -= dt; e.state = 'attack'; e.t = 0.1; if (e.eatT <= 0 && e.meal) { e.meal.gibbed = true; e.meal.eaten = true; e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.4); play('ghoul_eat', 0.6, 1, { x: e.x, y: e.y }); spawnText(e.x, e.y, '+HP', '#9fe060'); e.meal = null; } return true; }
    if (e.hp < e.maxHp * 0.8 && dist > 2.5) { const c = ents.find(o => o.dead && !o.gibbed && !o.boss && !o.eaten && Math.hypot(o.x - e.x, o.y - e.y) < 6);
      if (c) { const d = Math.hypot(c.x - e.x, c.y - e.y); if (d < 0.6) { e.eatT = 1.5; e.meal = c; return true; } const a = Math.atan2(c.y - e.y, c.x - e.x), sp = e.d.speed * dt, ox = e.x, oy = e.y; tryMove(e, Math.cos(a) * sp, Math.sin(a) * sp, 0.28); e.mvx = e.x - ox; e.mvy = e.y - oy; e.state = 'move'; return true; } }
    if (lightAt(e.x, e.y) > 1.3 && !e.fleeT) e.fleeT = 0.5; // starkt ljus skrämmer
    return false;
  },
  cultist(e, dt, dist, los) { // kultisten förbannar dig, stärker andra och offrar dem
    e.curseT = (e.curseT ?? rnd(2, 4)) - dt;
    if (e.curseT <= 0 && los && dist < 9) { e.curseT = rnd(5, 7); e.state = 'attack'; e.t = 0; e.didHit = true;
      const ally = ents.find(o => o !== e && !o.dead && !o.boss && !o.empowered && Math.hypot(o.x - e.x, o.y - e.y) < 6);
      if (ally && Math.random() < 0.5) { ally.empowered = true; ally.d = { ...ally.d, dmg: ally.d.dmg * 1.3, speed: ally.d.speed * 1.15 }; zap(e.x, e.y, ally.x, ally.y, [190, 90, 255]); play('curse', 0.6, 1.2, { x: e.x, y: e.y }); }
      else { P.curseT = 6; say('KULTISTEN FÖRBANNAR DIG: −25 % SKADA', 2); play('curse', 0.8, 1, { x: e.x, y: e.y }); zap(e.x, e.y, P.x, P.y, [190, 90, 255]); }
      return true; }
    if (e.hp < e.maxHp * 0.4 && !e.sacrificed) { const v = ents.find(o => o !== e && !o.dead && !o.boss && !o.elite && Math.hypot(o.x - e.x, o.y - e.y) < 4); // offret
      if (v) { e.sacrificed = true; v.hp = 0; killEnemy(v); e.hp = e.maxHp; e.empowered = true; e.d = { ...e.d, dmg: e.d.dmg * 1.4 }; zap(e.x, e.y, v.x, v.y, [255, 60, 80]); say('KULTISTEN OFFRAR EN ANNAN!', 2); play('curse', 0.9, 0.7, { x: e.x, y: e.y }); } }
    return false;
  },
  wisp(e, dt, dist) { // irrblosset sprängs i frost nära dig
    if (dist < 1.1 && !e.dead) { wispBurst(e); return true; }
    if (e.state === 'move') { const a = Math.atan2(P.y - e.y, P.x - e.x) + Math.PI / 2, w = Math.sin(e.t * 5 + e.x * 3) * dt * 1.5; tryMove(e, Math.cos(a) * w, Math.sin(a) * w, 0.2); }
    return false;
  },
  spider(e, dt, dist, los) { // spottar nät på håll
    e.webT = (e.webT ?? rnd(1, 3)) - dt;
    if (e.webT <= 0 && los && dist > 2.5 && dist < 8) { e.webT = rnd(3, 4.5); const a = Math.atan2(P.y - e.y, P.x - e.x); projectiles.push({ x: e.x + Math.cos(a) * 0.4, y: e.y + Math.sin(a) * 0.4, z: 0.35, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, dmg: 3, src: e, kind: 'web', life: 2 }); play('spider', 0.5, 1.2, { x: e.x, y: e.y }); e.state = 'attack'; e.t = 0; e.didHit = true; }
    return false;
  },
  fly(e, dt, dist, los) { // fladdermöss fladdrar i sicksack
    if (e.state === 'move' && los) { const a = Math.atan2(P.y - e.y, P.x - e.x) + Math.PI / 2, w = Math.sin(e.t * 7 + e.x * 5) * dt * 2.2; tryMove(e, Math.cos(a) * w, Math.sin(a) * w, 0.2); }
    return false;
  },
  leap(e, dt, dist, los) { // hunden hoppar på dig
    if (e.leapT > 0) { e.leapT -= dt; const ox = e.x, oy = e.y; tryMove(e, Math.cos(e.leapA) * 7 * dt, Math.sin(e.leapA) * 7 * dt, 0.28); e.mvx = e.x - ox; e.mvy = e.y - oy; e.state = 'attack'; e.t = 0.1;
      if (!e.leapHit && dist < 0.9) { e.leapHit = true; hurtPlayer(e.d.dmg, e.x, e.y, 'melee'); if (e.d.frostBite) P.slowT = Math.max(P.slowT, 1.5 * Math.max(0.2, 1 - mod('coldResist'))); } return true; }
    e.leapCd = (e.leapCd ?? rnd(1, 2)) - dt;
    if (e.leapCd <= 0 && los && dist > 2.2 && dist < 4.5) { e.leapCd = rnd(2.5, 3.5); e.leapT = 0.45; e.leapHit = false; e.leapA = Math.atan2(P.y - e.y, P.x - e.x); play('hound', 0.6, rnd(0.9, 1.1), { x: e.x, y: e.y }); return true; }
    return false;
  },
  bomb(e, dt, dist) { // bombskelettet springer fram och sprängs
    e.fuseSndT = (e.fuseSndT || 0) - dt; if (e.fuseSndT <= 0 && dist < 8) { e.fuseSndT = 1.2; play('fuse', 0.4, 1, { x: e.x, y: e.y }); }
    if (e.lit !== undefined) { e.lit -= dt; e.state = 'attack'; if (e.lit <= 0) bomberBlow(e); return true; }
    if (dist < 1.3) { e.lit = 0.6; e.t = 0; play('fuse', 0.8, 1.6, { x: e.x, y: e.y }); spawnText(e.x, e.y, '!!', '#ff5030'); return true; }
    return false;
  },
  shield(e, dt) { // sköldbäraren vänder sig långsamt mot dig
    const want = Math.atan2(P.y - e.y, P.x - e.x); let d = want - (e.face ?? want); d = Math.atan2(Math.sin(d), Math.cos(d)); e.face = (e.face ?? want) + clamp(d, -1.6 * dt, 1.6 * dt);
    return false;
  },
  spore(e, dt, dist, los) { // svampmannen släpper giftmoln
    e.sporeT = (e.sporeT ?? rnd(1, 2.5)) - dt;
    if (e.sporeT <= 0 && dist < 5 && los) { e.sporeT = rnd(3.5, 5); sporeCloud(e.x + (P.x - e.x) * 0.35, e.y + (P.y - e.y) * 0.35); e.state = 'attack'; e.t = 0; e.didHit = true; }
    return false;
  },
  blink(e, dt) { e.blinkCd = (e.blinkCd || 0) - dt; return false; },
  split() { return false; },
  summon(e, dt, dist, los) { // benmagikern väcker skelett, högst två åt gången
    e.summonT = (e.summonT ?? rnd(2, 4)) - dt;
    if (e.summonT > 0 || !los || dist > 12 || e.state !== 'move') return false;
    e.summonT = rnd(8, 11);
    if (ents.filter(o => o.master === e && !o.dead).length >= 2) return false;
    const a0 = rnd(0, TAU); let x = 0, y = 0, found = false;
    for (let k = 0; k < 8 && !found; k++) { const a = a0 + k * TAU / 8; x = e.x + Math.cos(a) * 1.3; y = e.y + Math.sin(a) * 1.3; found = freeSpot(x, y, 0.3); }
    if (!found) return false;
    const m = makeEnemy('S', x, y); m.alert = true; m.master = e; m.state = 'pain'; m.t = 0; ents.push(m); totalEnemies++;
    spawnPuff(x, y, 8); play('hiss', 0.6, 0.6, { x, y }); say('BENMAGIKERN VÄCKER DE DÖDA', 1.5);
    return false;
  },
  heal(e, dt) { // orkshamanen helar och driver på sina vänner
    e.healT = (e.healT ?? rnd(1.5, 3)) - dt;
    if (e.healT > 0 || e.state === 'attack' || e.state === 'pain') return false;
    e.healT = 5;
    let n = 0;
    for (const o of ents) {
      if (o.dead || o.boss || Math.hypot(o.x - e.x, o.y - e.y) > 5.5) continue;
      if (o !== e && o.hp < o.maxHp) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.35); n++; }
      if (o !== e) { o.haste = 3.5; o.alert = true; }
      for (let j = 0; j < 3; j++) particles.push({ x: o.x + rnd(-0.2, 0.2), y: o.y + rnd(-0.2, 0.2), z: rnd(0.2, 0.8), vx: 0, vy: 0, vz: rnd(0.6, 1.2), life: 0.6, maxLife: 0.6, frames: fx.hit, img: fx.hit[0], size: 0.22, add: true });
    }
    play('health', 0.4, 0.6, { x: e.x, y: e.y });
    if (n) e.flash = 0.1;
    return false;
  },
  stealth(e, dt, dist) { // gravrövaren syns bara på nära håll, när den anfaller eller har träffats
    e.revealT = Math.max(0, (e.revealT || 0) - dt);
    const want = e.state === 'attack' || e.state === 'pain' || dist < 2.2 || e.revealT > 0 ? 0 : 0.88;
    e.ghost = e.ghost === undefined ? want : e.ghost + clamp(want - e.ghost, -dt * 3, dt * 1.2);
    return false;
  },
  charge(e, dt, dist, los) { // orkkrigaren stormar fram och blir yr om den krockar i en vägg
    e.chargeCd = (e.chargeCd ?? rnd(2, 4)) - dt;
    if (e.stun > 0) { e.stun -= dt; e.state = 'pain'; e.t = Math.min(e.t, 0.25); return true; }
    if (e.charge > 0) {
      e.charge -= dt; e.state = 'move';
      const sp = 5.2 * diff().speed * dt * (e.slow > 0 ? 0.5 : 1), ox = e.x, oy = e.y;
      tryMove(e, Math.cos(e.chargeA) * sp, Math.sin(e.chargeA) * sp, 0.3);
      e.mvx = e.x - ox; e.mvy = e.y - oy;
      if (Math.hypot(P.x - e.x, P.y - e.y) < 0.8) { // träff: skada och knuff
        e.charge = 0; e.cd = 1;
        hurtPlayer(e.d.dmg * 1.3 * (1 + 0.1 * (run.depth - 1)), e.x, e.y, 'melee'); play('bigboom', 0.5, 1.3);
        tryMove(P, Math.cos(e.chargeA) * 0.7, Math.sin(e.chargeA) * 0.7, 0.25); P.shake = Math.max(P.shake, 2);
      } else if (Math.hypot(e.x - ox, e.y - oy) < sp * 0.35) { // krock i väggen
        e.charge = 0; e.stun = 1.6; e.t = 0; play('bigboom', 0.5, 0.7, { x: e.x, y: e.y }); say('ORKKRIGAREN ÄR YR!', 1);
      }
      return true;
    }
    if (los && dist > 2.5 && dist < 8 && e.chargeCd <= 0 && e.state === 'move') {
      e.chargeCd = rnd(5, 7); e.charge = 1.3; e.chargeA = Math.atan2(P.y - e.y, P.x - e.x);
      play('roar', 0.7, 0.7, { x: e.x, y: e.y });
      return true;
    }
    return false;
  },
};
// kind: undefined = eldklot, 'orb' = benmagikerns sökande klot, 'bolt' = shamanens gröna blixt
const PROP_GLOW = { 'Ȼ': [255, 180, 90], 'ȝ': [255, 230, 170], 'Ƞ': [170, 150, 255], 'Ȟ': [255, 210, 130], 'Ƕ': [255, 210, 120], 'ȇ': [255, 160, 70], 'Ȅ': [255, 215, 90], 'ǐ': [255, 190, 90], 'Ǟ': [150, 200, 255], 'ǟ': [140, 255, 140], 'ƪ': [200, 150, 255], 'Ə': [255, 60, 50], 'ű': [255, 200, 120], 'Ű': [200, 170, 255], 'Ŧ': [140, 255, 170], 'Œ': [255, 210, 110], 'Ņ': [255, 200, 110], 'Ę': [170, 130, 255], c: [255, 170, 70], i: [90, 200, 255], F: [80, 255, 200], w: [255, 60, 70], y: [200, 80, 255], ')': [190, 120, 255], '?': [255, 140, 50] };
const PROJ_TINT_ARROW = [200, 180, 140];
const PROJ_TINT = { orb2: [190, 120, 255], wave: [200, 200, 255], sorb: [150, 200, 255], ice: [170, 230, 255], blue: [90, 170, 255], rock: [150, 110, 80], orb: [190, 100, 255], bolt: [110, 255, 110], gren: [230, 230, 200], flare: [255, 110, 70], spark: [255, 200, 90] };
function shootFireball(src, a, speed, dmg, big, kind) {
  const r = src.boss ? 1.1 : 0.4;
  projectiles.push({ x: src.x + Math.cos(a) * r, y: src.y + Math.sin(a) * r, z: kind === 'rock' && !big ? 0.22 : src.boss ? 0.8 : 0.55, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg, src, big, kind, life: kind === 'orb' ? 5 : 6 }); // ogerns stenring rullar lågt: hoppa över
}
function updateProjectiles(dt) {
  wpProjTick(dt); // Grafik: projektilspår och explosionssteg
  for (const p of projectiles) {
    if (p.kind === 'orb') { // svänger mot spelaren, men långsamt nog att springa ifrån
      const sp = Math.hypot(p.vx, p.vy), cur = Math.atan2(p.vy, p.vx);
      let d = Math.atan2(P.y - p.y, P.x - p.x) - cur; d = Math.atan2(Math.sin(d), Math.cos(d));
      const na = cur + clamp(d, -1.4 * dt, 1.4 * dt); p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
    }
    if (p.kind === 'skull') { const sp = Math.hypot(p.vx, p.vy), cur = Math.atan2(p.vy, p.vx); let d = Math.atan2(P.y - p.y, P.x - p.x) - cur; d = Math.atan2(Math.sin(d), Math.cos(d)); const na = cur + clamp(d, -2.4 * dt, 2.4 * dt); p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp; }
    const px0 = p.x, py0 = p.y;
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (timeBubbles.length && inBubble(p.x, p.y)) { p.x -= p.vx * dt * 0.65; p.y -= p.vy * dt * 0.65; } // tidsbubblor saktar in skotten
    if (mirrorBounce(p, px0, py0)) continue; // spegelväggar
    if (shieldBlock(p)) continue; // spegelskölden
    if (wardBlock(p)) continue; // runbokens sidvirvel
    if ((p.kind === 'magma' || p.kind === 'log') && solid(p.x, p.y) && (p.bounces ?? 0) > 0) { p.bounces--; if (solid(p.x, py0)) p.vx = -p.vx; if (solid(px0, p.y)) p.vy = -p.vy; p.x = px0; p.y = py0; play('grenade_bounce', 0.4, 0.6, { x: p.x, y: p.y }); continue; }
    if (p.z > 0.55 && p.kind !== 'log' && p.kind !== 'rock') p.z -= dt * 0.25;
    if (p.kind === 'pgren') { updateGrenade(p, dt); continue; }
    if (p.kind === 'axe') { updateThrownAxe(p, dt); continue; }
    if (p.kind === 'nail') { updateNail(p, dt); continue; }
    if (PROJ_UPD_V8[p.kind]) { PROJ_UPD_V8[p.kind](p, dt); continue; }
    if (p.kind === 'knife') { updateKnife(p, dt); continue; }
    if (p.kind === 'stone') { updateStone(p, dt); continue; }
    if (p.kind === 'parrow') { updateArrow(p, dt); continue; }
    if (p.kind === 'sorb') { updateSorb(p, dt); continue; }
    if (p.kind === 'barrel') { // sparkat krutfat: smäller mot fiende eller vägg
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.vx *= 0.99; p.vy *= 0.99;
      if (solid(p.x, p.y) || p.life <= 0 || ents.some(e => !e.dead && !e.dormant && Math.hypot(e.x - p.x, e.y - p.y) < 0.6)) { p.dead = true; fuses.push({ e: { dead: true }, x: p.x - p.vx * 0.03, y: p.y - p.vy * 0.03, t: 0.01, dmg: 30 * (1 + mod('dmg') * 0.5), r: 2.4, hurt: true }); }
      continue;
    }
    if (p.friendly) { // spelarens granat och bloss: smäller vid fiende, vägg eller när tiden är ute
      const hit = ents.find(e => !e.dead && !e.dying && Math.hypot(e.x - p.x, e.y - p.y) < (p.kind === 'gren' ? 0.5 : 0.45));
      if (solid(p.x, p.y) && !hit && p.kind === 'flare' && up('bounce') && (p.bounces || 0) < 2) { // ekoblosset
        const ox = p.x - p.vx * dt, oy = p.y - p.vy * dt;
        if (solid(p.x, oy)) p.vx = -p.vx; if (solid(ox, p.y)) p.vy = -p.vy;
        p.x = ox; p.y = oy; p.bounces = (p.bounces || 0) + 1; play('ricochet', 0.5, 0.8, { x: p.x, y: p.y });
        continue;
      }
      if (solid(p.x, p.y) || p.life <= 0 || hit) {
        p.dead = true;
        const x = p.x - p.vx * 0.03, y = p.y - p.vy * 0.03;
        if (p.kind === 'spark') { if (hit) hurtEnemy(hit, p.dmg, x, y, { noProc: true }); flareBurst(x, y, p.dmg, 1.0, true); }
        else if (p.kind === 'flare') { if (hit) { hurtEnemy(hit, p.dmg, x, y); hitMark = 0.15; } flareBurst(x, y, p.dmg); }
        else { explode(x, y, p.dmg, 2.0); play('bigboom', 0.6, 1.1, { x: p.x, y: p.y }); P.shake = Math.max(P.shake, 1); }
      }
      continue;
    }
    if (infightHit(p)) continue; // fiendernas skott träffar andra fiender
    if (WS.charge > 0.15 && WEAPONS[P.weapon].melee && Math.hypot(p.x - P.x, p.y - P.y) < 1 && Math.abs(Math.atan2(Math.sin(Math.atan2(p.y - P.y, p.x - P.x) - P.a), Math.cos(Math.atan2(p.y - P.y, p.x - P.x) - P.a))) < 0.9) { p.dead = true; play('shield_block', 0.6, 1.2); sparks(p.x, p.y, 0.5, 4); continue; } // yxan blockerar
    const pr = (p.big ? 0.5 : 0.35) * (P.crouch > 0.5 ? 0.6 : 1), low = (p.z || 0.5) < 0.32;
    if (Math.hypot(p.x - P.x, p.y - P.y) < pr && !(low && P.jz > 0.22)) { hurtPlayer(p.dmg, p.src.x, p.src.y, 'proj'); p.dead = true; if (p.kind === 'bandage') { P.pullFrom = { x: p.src.x, y: p.src.y }; if (p.hook) { P.pullT = 0.7; P.slowT = Math.max(P.slowT, 1); say(p.tongue ? 'TUNGAN DRAR DIG!' : 'BÅTSHAKEN DRAR DIG!', 1); } else bandageHit(); } if (p.kind === 'hex') witchHex(); if (p.kind === 'chain') { P.rootT = Math.max(P.rootT || 0, 1.1); play('chain_bind', 0.7); say('KEDJAN BINDER DIG', 1); } if (p.kind === 'web' && mod('hazardImmune') <= 0) { P.slowT = Math.max(P.slowT, 2.5); say('FAST I NÄTET', 1); play('web', 0.7); } }
    else if (solid(p.x, p.y) || p.life <= 0) p.dead = true;
    if (p.dead) {
      play('fireburst', 0.5, rnd(0.9, 1.1), { x: p.x, y: p.y }); wpProjDie(p);
      for (let i = 0; i < 3; i++) particles.push({ x: p.x - p.vx * 0.02, y: p.y - p.vy * 0.02, z: 0.45, vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(0, 1), life: 0.35, maxLife: 0.35, frames: fx.fireball, img: fx.fireball[0], size: 0.3, add: true });
    }
  }
  efxProjDead(); // version 25: magiträffar
  projectiles = projectiles.filter(p => !p.dead);
}
