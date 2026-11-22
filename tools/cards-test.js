'use strict';
// Test av js/cards.js:  node tools/cards-test.js
const fs = require('fs');
const path = require('path');
global.window = global;
require('../js/cards.js');
const root = path.join(__dirname, '..');
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log('FEL: ' + msg); } };

// Enkel seedad rng med samma gränssnitt som spelets (next, int, pick, weighted)
function makeRng(seed) {
  let s = seed >>> 0;
  const r = {
    next() { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; },
    int(a, b) { return a + Math.floor(r.next() * (b - a + 1)); },
    pick(arr) { return arr[Math.floor(r.next() * arr.length)]; },
    weighted(arr, fn) { let tot = 0; for (const a of arr) tot += fn(a); let x = r.next() * tot; for (const a of arr) { x -= fn(a); if (x <= 0) return a; } return arr[arr.length - 1]; },
  };
  return r;
}

const { ALL, RARITY, MOD_KEYS } = Cards;
const keys = Object.keys(MOD_KEYS);
const BASE = ALL.filter(c => !c.pact && !c.weapon && !c.active);
ok(BASE.length === 343, 'antal vanliga kort ' + BASE.length + ' ska vara 343 (50 gamla + 50 i version 4 + 30 i version 5 + 25 i version 6 + 20 i version 7 + 24 i version 8 + 24 i version 9 + 24 i version 11 + 24 i version 13 + 24 i version 15 + 24 i version 16 + 24 i version 17)');
ok(keys.length === 159, 'MOD_KEYS ska ha 159 nycklar, har ' + keys.length);
// de 27 nya mod-nycklarna
const NEW_KEYS = ['grenades', 'grenadeDmg', 'stamina', 'dashCd', 'airDmg', 'backstab', 'comboGold', 'trapResist', 'freezeChance', 'poisonChance',
  'shockChance', 'interest', 'floorHeal', 'killExplode', 'reloadNova', 'eliteGold', 'trapSense', 'enemySense', 'critHeal', 'dashDmg',
  'shieldOnKill', 'ammoRegen', 'knockback', 'chestChoice', 'freeReroll', 'hazardImmune', 'doubleJump'];
for (const k of NEW_KEYS) ok(keys.includes(k) && /[a-zåäö]/i.test(MOD_KEYS[k]), 'ny mod-nyckel saknas eller saknar beskrivning: ' + k);
// de 50 nya korten: ordning i DEFS efter OUROBOROS och före pakterna
const NEW_IDS = ['fyllbulten', 'fyrfoten', 'hornstenen', 'agget', 'benflojt', 'hangande_lappen', 'gronskan', 'att_gora', 'grodan', 'halvmane',
  'dominobrickan', 'sollinsen', 'glasogat', 'akrobaten', 'urtidsrunan', 'fyrkanten', 'idolen', 'moln_nio', 'askstav', 'feltrycket',
  'spakvinnan', 'kristallkronan', 'tankestormen', 'inbrottstjuven', 'snedsteget', 'spakortet', 'avtrycket', 'tomrummet', 'trubaduren',
  'lyckokatten', 'sigillbrevet', 'rotknuta', 'schablonen', 'maskerna', 'baronen', 'vandringsstaven', 'bryggan', 'kubtornet', 'spadomskulan',
  'glad_trefot', 'pirathatten', 'horisonten', 'runsten', 'eremiten', 'snedkronet', 'prismakronan', 'gryningen', 'travstaven', 'brokiga', 'ansiktslos'];
ok(NEW_IDS.length === 50 && new Set(NEW_IDS).size === 50, 'listan över nya kort ska ha 50 unika id');
const NEW = NEW_IDS.map(id => Cards.byId(id));
ok(NEW.every(Boolean), 'nya kort saknas: ' + NEW_IDS.filter(id => !Cards.byId(id)).join(','));
const newRar = {};
for (const c of NEW.filter(Boolean)) {
  newRar[c.rarity] = (newRar[c.rarity] || 0) + 1;
  ok(!c.pact && !c.weapon, c.id + ': nytt kort ska inte vara pakt eller uppgradering');
  ok(fs.existsSync(path.join(root, c.icon)), c.id + ': bild saknas');
  ok(c.text === c.text.toUpperCase(), c.id + ': texten ska vara versaler');
  ok(c.name === c.name.toUpperCase(), c.id + ': namnet ska vara versaler');
  ok(/\d/.test(c.text) || Object.values(c.mods).every(v => v === 1), c.id + ': texten ska ange talen');
  if (fs.existsSync(path.join(root, c.icon))) {
    const b = fs.readFileSync(path.join(root, c.icon));
    ok(b.readUInt32BE(16) === 96 && b.readUInt32BE(20) === 96, c.id + ': bilden ska vara 96x96');
  }
}
ok(newRar.vanlig === 20 && newRar.ovanlig === 15 && newRar.sallsynt === 10 && newRar.legendarisk === 5, 'nya kort per sällsynthet ' + JSON.stringify(newRar));
ok(NEW.filter(c => c && c.curse).length === 4, '4 nya förbannade kort');
ok(NEW_KEYS.every(k => NEW.some(c => c && k in c.mods)), 'alla nya mod-nycklar ska användas av nya kort');
const ids = new Set(), used = new Set(), perRarity = {};
for (const c of ALL) {
  ok(!ids.has(c.id), 'dubblett-id ' + c.id); ids.add(c.id);
  ok(RARITY[c.rarity], c.id + ': okänd rarity');
  perRarity[c.rarity] = (perRarity[c.rarity] || 0) + 1;
  ok(c.name && c.text && c.icon, c.id + ': saknar name/text/icon');
  ok(c.max >= 1 && c.max <= 5, c.id + ': max utanför 1-5');
  if (c.weapon) ok(c.wup && c.mods && Object.keys(c.mods).length === 0, c.id + ': vapenuppgradering ska ha wup och inga mods');
  else if (c.active) ok(c.mods && Object.keys(c.mods).length === 0 && c.cd > 0, c.id + ': aktiv förmåga ska ha cd och inga mods');
  else ok(c.mods && Object.keys(c.mods).length > 0, c.id + ': tomma mods');
  for (const k in c.mods) { ok(keys.includes(k), c.id + ': okänd mod-nyckel ' + k); ok(typeof c.mods[k] === 'number' && isFinite(c.mods[k]), c.id + ': ' + k + ' inte tal'); used.add(k); }
  ok(fs.existsSync(path.join(root, c.icon)), c.id + ': ikon saknas ' + c.icon);
  if (c.unlock != null) ok(c.unlock >= 10 && c.unlock <= 60, c.id + ': unlock utanför 10-60');
  if (c.curse) ok(Object.values(c.mods).some(v => v < 0) || c.mods.damageTaken > 0, c.id + ': förbannat kort utan nackdel');
  ok(Cards.byId(c.id) === c, c.id + ': byId');
  ok(Cards.price(c, 0, 0) > 0 && Cards.price(c, 3, 0.2) <= Cards.price(c, 3, 0) * 1.01, c.id + ': pris');
  ok(typeof Cards.describe(c) === 'string' && Cards.describe(c).includes(c.name), c.id + ': describe');
}
for (const r of Object.keys(RARITY)) ok(perRarity[r] > 0, 'inga kort av rarity ' + r);
for (const k of keys) ok(used.has(k), 'mod-nyckel ' + k + ' används av inget kort');
const locked = BASE.filter(c => c.unlock != null).length;
ok(locked / BASE.length > 0.25 && locked / BASE.length < 0.45, 'andel låsta kort ' + locked + '/' + BASE.length);
// vapenpakter: en per vapen, minst fyra unika uppgraderingar var
for (const w of ['pistol', 'shotgun', 'rifle', 'smg', 'dbshotgun', 'crossbow', 'flaregun', 'sniper', 'axe', 'flamer', 'launcher', 'nailgun', 'staff', 'bow', 'knives', 'hammer', 'musket', 'harpoon', 'boomerang', 'prism', 'sawlauncher', 'windgun', 'spear', 'sporelauncher', 'mirrorshield', 'whip', 'runebook', 'steamcannon', 'censer', 'hivelauncher', 'shears', 'dreamstaff', 'chaincannon', 'acidsprayer']) {
  ok(ALL.filter(c => c.pact === w).length === 1, 'en pakt för ' + w);
  const ups = ALL.filter(c => c.weapon === w);
  ok(ups.length >= 4, w + ' har ' + ups.length + ' uppgraderingar, minst 4');
  ok(new Set(ups.map(c => c.wup)).size === ups.length, w + ': unika wup');
}
for (let seed = 1; seed <= 300; seed++) {
  const rng = makeRng(seed), pact = [null, 'pistol', 'shotgun', 'rifle', 'smg', 'dbshotgun', 'crossbow', 'flaregun', 'sniper', 'axe', 'flamer', 'launcher', 'nailgun', 'staff', 'bow', 'knives', 'hammer', 'musket', 'harpoon', 'boomerang', 'prism', 'sawlauncher', 'windgun', 'spear', 'sporelauncher', 'mirrorshield', 'whip', 'runebook', 'steamcannon', 'censer', 'hivelauncher', 'shears', 'dreamstaff', 'chaincannon', 'acidsprayer'][seed % 35];
  const got = Cards.draw(rng, 4, { depth: seed % 5, pact });
  for (const c of got) {
    ok(!(pact && c.pact), 'andra pakt dragen med pakt ' + pact);
    ok(!c.weapon || c.weapon === pact, c.id + ' dragen med pakt ' + pact);
  }
}
ok(ALL.filter(c => c.curse).length >= 3, 'för få förbannade kort');
ok(fs.existsSync(path.join(root, 'assets/cards/back.png')), 'kortbaksida saknas');

// computeMods
let m = Cards.computeMods([]);
ok(keys.every(k => m[k] === 0), 'computeMods([]) ska ge nollor för alla nycklar');
m = Cards.computeMods(['slipstenen', 'slipstenen', 'slipstenen', 'kantvakten', 'offerdolken', 'hjartstenen', 'finnsinte']);
ok(Math.abs(m.dmg - 0.3) < 1e-9, 'dmg 3 x 0.10 = ' + m.dmg);
ok(m.maxHp === 10 + 25 - 15, 'maxHp = ' + m.maxHp);
ok(Math.abs(m.critChance - 0.2) < 1e-9, 'critChance = ' + m.critChance);
ok(Object.keys(m).length === keys.length, 'computeMods ska ha exakt MOD_KEYS');

// draw
const unlockedAll = new Set(ALL.map(c => c.id));
for (let seed = 1; seed <= 400; seed++) {
  const rng = makeRng(seed);
  const owned = [];
  for (let i = 0; i < rng.int(0, 40); i++) owned.push(rng.pick(ALL).id);
  const unlocked = seed % 2 ? new Set() : new Set(ALL.filter(c => c.unlock && c.unlock <= 30).map(c => c.id));
  const n = rng.int(1, 5);
  const got = Cards.draw(rng, n, { owned, depth: rng.int(0, 4), luck: rng.int(0, 5) / 10, unlocked });
  const cnt = {}; for (const id of owned) cnt[id] = (cnt[id] || 0) + 1;
  ok(got.length === n, 'draw gav ' + got.length + ' av ' + n + ' (seed ' + seed + ')');
  ok(new Set(got.map(c => c.id)).size === got.length, 'draw gav dubbletter (seed ' + seed + ')');
  for (const c of got) {
    ok((cnt[c.id] || 0) < c.max, 'draw gav ' + c.id + ' som nått max (seed ' + seed + ')');
    ok(!c.unlock || unlocked.has(c.id), 'draw gav låst kort ' + c.id + ' (seed ' + seed + ')');
  }
}
// utan rng.weighted ska reservvägen fungera
const plain = makeRng(7); delete plain.weighted;
ok(Cards.draw(plain, 3, { unlocked: unlockedAll }).length === 3, 'draw utan rng.weighted');
// tom pool: allt maxat
const everything = []; for (const c of ALL) for (let i = 0; i < c.max; i++) everything.push(c.id);
ok(Cards.draw(makeRng(3), 3, { owned: everything, unlocked: unlockedAll }).length === 0, 'maxade kort ska inte dras');
// djup och luck ska ge sällsyntare kort i snitt
function avgRank(depth, luck) {
  const rng = makeRng(99), rk = Cards.RARITY_ORDER; let s = 0, k = 0;
  for (let i = 0; i < 3000; i++) for (const c of Cards.draw(rng, 3, { depth, luck, unlocked: unlockedAll })) { s += rk.indexOf(c.rarity); k++; }
  return s / k;
}
const lo = avgRank(0, 0), hi = avgRank(4, 0.5);
ok(hi > lo + 0.2, 'djup/luck ska höja sällsyntheten (' + lo.toFixed(2) + ' -> ' + hi.toFixed(2) + ')');
// förbannade kort ska förekomma ibland
const rng = makeRng(5); let curses = 0, tot = 0;
for (let i = 0; i < 2000; i++) for (const c of Cards.draw(rng, 3, { unlocked: unlockedAll })) { tot++; if (c.curse) curses++; }
ok(curses > 0 && curses / tot < 0.2, 'förbannade kort andel ' + (curses / tot).toFixed(3));
// pris
const sp = ALL.find(c => c.rarity === 'vanlig');
ok(Cards.price(sp, 3, 0) > Cards.price(sp, 0, 0), 'pris ska öka med djup');
ok(Cards.price(sp, 2, 0.5) < Cards.price(sp, 2, 0), 'pris ska sjunka med rabatt');

// ---------- set ----------
const SETS = Cards.SETS;
ok(SETS && Object.keys(SETS).length === 26, '26 set');
for (const sid in SETS) {
  const st = SETS[sid], members = ALL.filter(c => c.set === sid);
  ok(st.name && st.text && st.mods && Object.keys(st.mods).length, sid + ': name/text/mods');
  for (const k in st.mods) ok(keys.includes(k), sid + ': okänd mod-nyckel ' + k);
  ok(members.length >= 4 && members.length <= 6, sid + ': ' + members.length + ' kort, ska vara 4-6');
  ok(members.every(c => !c.pact && !c.weapon), sid + ': pakter/uppgraderingar ska inte ingå i set');
  // computeMods: 3 olika kort ger bonusen, 2 gör det inte, dubbletter räknas inte
  const three = members.slice(0, 3).map(c => c.id), two = three.slice(0, 2);
  const base3 = {}; for (const id of three) for (const k in Cards.byId(id).mods) base3[k] = (base3[k] || 0) + Cards.byId(id).mods[k];
  const m3 = Cards.computeMods(three), m2 = Cards.computeMods(two.concat([two[0], two[0]]));
  for (const k in st.mods) ok(Math.abs(m3[k] - ((base3[k] || 0) + st.mods[k])) < 1e-6, sid + ': computeMods med 3 setkort ska ge bonusen ' + k + ' (' + m3[k] + ')');
  const base2 = {}; for (const id of two.concat([two[0], two[0]])) for (const k in Cards.byId(id).mods) base2[k] = (base2[k] || 0) + Cards.byId(id).mods[k];
  for (const k in st.mods) ok(Math.abs(m2[k] - (base2[k] || 0)) < 1e-6, sid + ': 2 olika setkort ska inte ge bonusen (' + k + ')');
  // setProgress
  const sp = Cards.setProgress(three).find(x => x.id === sid);
  ok(sp && sp.active && sp.have === 3 && sp.need === 3 && sp.name === st.name && sp.text === st.text, sid + ': setProgress aktiv');
  const sp1 = Cards.setProgress(three.slice(0, 1)).find(x => x.id === sid);
  ok(sp1 && !sp1.active && sp1.have === 1, sid + ': setProgress 1/3');
  // synergy: kort som fortsätter ett påbörjat set
  const s1 = Cards.synergy(Cards.byId(three[1]), [three[0]]);
  ok(typeof s1 === 'string' && s1.includes(st.name), sid + ': synergy ska nämna setet: "' + s1 + '"');
  const s2 = Cards.synergy(Cards.byId(three[2]), two);
  ok(/^FULLBORDAR /.test(s2), sid + ': synergy ska säga FULLBORDAR: "' + s2 + '"');
}
ok(Cards.setProgress([]).length === 26 && Cards.setProgress([]).every(x => x.have === 0 && !x.active), 'setProgress([])');
// synergy: syn-taggar och tomma fall
ok(Cards.synergy(Cards.byId('grodan'), ['spakvinnan']).includes('GIFT'), 'gift + gift ska vara synergi');
ok(Cards.synergy(Cards.byId('offerkniven'), ['solkonungen']).includes('KRIT'), 'krit + kritskada ska vara synergi');
ok(Cards.synergy(Cards.byId('agget'), ['bronda_runan']) !== '', 'eld + explosion ska vara synergi');
ok(Cards.synergy(Cards.byId('slipstenen'), ['glodkol', 'grodan']) === '', 'kort utan set/syn ska ge tom sträng');
ok(Cards.synergy(Cards.byId('grodan'), []) === '', 'inga ägda kort ska ge tom sträng');
ok(Cards.synergy(Cards.byId('grodan'), ['grodan']) === '', 'kortet själv räknas inte som synergi');
for (const c of ALL) { const r = Cards.synergy(c, ['glodkol', 'korsriddaren', 'grodan', 'halvmane', 'fyrfoten', 'guldbaggen', 'manesilver']); ok(typeof r === 'string' && r === r.toUpperCase() && r.length <= 40, c.id + ': synergy-sträng ' + r); }
ok(ALL.filter(c => c.syn && c.syn.length).length >= 30, 'minst 30 kort med syn-taggar');
// modLines: tal med rätt tecken
const ml = Cards.modLines(Cards.byId('ansiktslos'));
ok(ml.length === 5 && ml.find(l => l.key === 'maxHp').text === '-30 MAX HP' && !ml.find(l => l.key === 'maxHp').good && ml.find(l => l.key === 'dmg').text === '+20 % SKADA', 'modLines ' + JSON.stringify(ml));
ok(Cards.modLines({ damageTaken: 0.25 })[0].good === false && Cards.modLines({ damageTaken: -0.2 })[0].good === true, 'modLines damageTaken är omvänd');
for (const c of ALL) for (const l of Cards.modLines(c)) ok(l.text && l.text === l.text.toUpperCase(), c.id + ': modLines-text');
// draw med nya kort: owned/unlocked/pakt-reglerna gäller fortfarande
for (let seed = 1; seed <= 400; seed++) {
  const rng = makeRng(seed * 7 + 1), pact = seed % 3 ? null : 'shotgun';
  const owned = NEW_IDS.filter((_, i) => (i + seed) % 4 === 0).flatMap(id => Array(Cards.byId(id).max).fill(id));
  const unlocked = new Set(NEW.filter((c, i) => c.unlock && (i + seed) % 2).map(c => c.id));
  const got = Cards.draw(rng, 5, { owned, depth: seed % 6, luck: (seed % 4) / 10, unlocked, pact });
  ok(got.length === 5, 'draw med nya kort gav ' + got.length);
  for (const c of got) {
    ok(!owned.includes(c.id), 'draw gav maxat nytt kort ' + c.id);
    ok(!c.unlock || unlocked.has(c.id), 'draw gav låst kort ' + c.id);
    ok(!(pact && c.pact), 'draw gav en andra pakt');
    ok(!c.weapon || c.weapon === pact, 'draw gav uppgradering ' + c.id + ' utan pakt');
  }
}
{ // nya kort dras över huvud taget
  const rng = makeRng(42), hit = new Set();
  for (let i = 0; i < 8000; i++) for (const c of Cards.draw(rng, 3, { unlocked: unlockedAll, depth: i % 6 })) hit.add(c.id);
  ok(NEW_IDS.every(id => hit.has(id)), 'alla nya kort ska kunna dras: saknas ' + NEW_IDS.filter(id => !hit.has(id)).join(','));
}
ok(Cards.describe(Cards.byId('glodkol')).includes('SET: ASKANS ORDEN'), 'describe nämner setet');

// ---------- version 5: nya kort, mod-nycklar, pakter, set och sammansmältning ----------
const V5_KEYS = ['potionPower', 'potionChance', 'petPower', 'meleeDmg', 'fireDmg', 'coldResist', 'headshot', 'bleedChance', 'allyChance', 'lightRadius', 'weaponDrop', 'npcDiscount'];
for (const k of V5_KEYS) {
  ok(keys.includes(k) && /[a-zåäö]/i.test(MOD_KEYS[k]), 'version 5-nyckel saknas eller saknar beskrivning: ' + k);
  const l = Cards.modLines({ [k]: 0.1 });
  ok(l.length === 1 && l[0].good && l[0].text === l[0].text.toUpperCase() && /\d/.test(l[0].text), k + ': modLines ' + JSON.stringify(l));
}
const V5_IDS = ['lakebladet', 'groddrunan', 'vargtanden', 'jarnnaven', 'eldrunan', 'frosttoppen', 'slaktkroken', 'spejarkikaren', 'manrunan',
  'marknadstaltet', 'vapenladorna', 'dodsrunan', 'blandbradet', 'flockens_horn', 'gapet', 'bodelsnalen', 'ristarboden', 'brinnande_tornet',
  'trogna_anden', 'overflodet', 'spokspegeln', 'ishavet', 'jagarogat', 'dimvasen', 'gavoasken', 'haxkvasten', 'trallbojan', 'purpurkitteln',
  'karmosinhjartat', 'dodsbesvarjaren'];
ok(V5_IDS.length === 30 && new Set(V5_IDS).size === 30, '30 unika version 5-id');
const V5 = V5_IDS.map(id => Cards.byId(id)).filter(Boolean);
ok(V5.length === 30, 'version 5-kort saknas: ' + V5_IDS.filter(id => !Cards.byId(id)).join(','));
const v5Rar = {};
for (const c of V5) {
  v5Rar[c.rarity] = (v5Rar[c.rarity] || 0) + 1;
  ok(!c.pact && !c.weapon && !NEW_IDS.includes(c.id), c.id + ': version 5-kort ska vara ett vanligt nytt kort');
  ok(c.name === c.name.toUpperCase() && c.text === c.text.toUpperCase() && /\d/.test(c.text), c.id + ': versaler och tal i texten');
  const f = path.join(root, c.icon);
  ok(fs.existsSync(f), c.id + ': bild saknas');
  if (fs.existsSync(f)) { const b = fs.readFileSync(f); ok(b.readUInt32BE(16) === 96 && b.readUInt32BE(20) === 96, c.id + ': bilden ska vara 96x96'); }
  ok(Cards.modLines(c).length === Object.keys(c.mods).length, c.id + ': varje mod ska ha en effektrad');
  ok(c.text.split('\n').length >= Cards.modLines(c).length, c.id + ': texten ska nämna alla effekter');
}
ok(v5Rar.vanlig === 12 && v5Rar.ovanlig === 9 && v5Rar.sallsynt === 6 && v5Rar.legendarisk === 3, 'version 5 per sällsynthet ' + JSON.stringify(v5Rar));
ok(V5.filter(c => c.curse).length === 2, '2 förbannade version 5-kort');
ok(V5_KEYS.every(k => V5.some(c => k in c.mods)), 'alla version 5-nycklar ska användas: saknas ' + V5_KEYS.filter(k => !V5.some(c => k in c.mods)).join(','));
{ // bilderna ska vara olika (ingen bild återanvänd)
  const seenImg = new Map();
  for (const c of ALL) {
    const f = path.join(root, c.icon);
    if (!fs.existsSync(f)) continue;
    const h = require('crypto').createHash('md5').update(fs.readFileSync(f)).digest('hex');
    ok(!seenImg.has(h) || !V5_IDS.concat(['pakt_yxa', 'pakt_eld', 'pakt_gk']).includes(c.id), c.id + ': samma bild som ' + seenImg.get(h));
    seenImg.set(h, c.id);
  }
}
// pakter och uppgraderingar för yxan, eldkastaren och granatkastaren
const PACTS5 = { axe: ['pakt_yxa', ['axe_whirl', 'axe_bleed', 'axe_boomerang', 'axe_butcher']], flamer: ['pakt_eld', ['fl_napalm', 'fl_blue', 'fl_frugal', 'fl_wall']], launcher: ['pakt_gk', ['gl_cluster', 'gl_sticky', 'gl_mega', 'gl_drum']] };
for (const w in PACTS5) {
  const [pid, wups] = PACTS5[w], p = Cards.byId(pid);
  ok(p && p.pact === w && p.rarity === 'sallsynt' && p.max === 1 && p.mods.dmg === 0.15 && p.bad === 1, pid + ': pakt för ' + w);
  ok(p && fs.existsSync(path.join(root, p.icon)), pid + ': bild');
  ok(Cards.WEAPON_NAME[w] && p && p.text.includes(Cards.WEAPON_NAME[w]), w + ': WEAPON_NAME och pakttext');
  const ups = ALL.filter(c => c.weapon === w);
  ok(ups.length === 4 && JSON.stringify(ups.map(c => c.wup).sort()) === JSON.stringify(wups.slice().sort()), w + ': uppgraderingar ' + ups.map(c => c.wup).join(','));
  for (const u of ups) {
    ok(u.max === 1 && Object.keys(u.mods).length === 0 && fs.existsSync(path.join(root, u.icon)) && Cards.tag(u) === Cards.WEAPON_NAME[w], u.id + ': uppgradering');
    ok(u.name === u.name.toUpperCase() && u.text === u.text.toUpperCase(), u.id + ': versaler');
  }
  // dras bara med vapnets pakt
  const rng = makeRng(11); let hit = 0;
  for (let i = 0; i < 300; i++) for (const c of Cards.draw(rng, 4, { pact: w, unlocked: unlockedAll })) { ok(!c.pact && (!c.weapon || c.weapon === w), 'draw med pakt ' + w + ' gav ' + c.id); if (c.weapon === w) hit++; }
  ok(hit > 50, w + ': uppgraderingarna ska dras ofta efter pakten (' + hit + ')');
}
ok(Object.keys(Cards.WEAPON_NAME).length === 34 && ALL.filter(c => c.pact).length === 34, '34 vapen och 34 pakter');
// set: alkemi och flock
for (const sid of ['alkemi', 'flock']) {
  const members = ALL.filter(c => c.set === sid);
  ok(SETS[sid] && members.length >= 4 && members.length <= 6, sid + ': ' + members.length + ' kort');
  ok(members.every(c => V5_IDS.includes(c.id)), sid + ': medlemmar');
}
ok(Object.keys(SETS.alkemi.mods).every(k => ['potionPower', 'potionChance', 'npcDiscount'].includes(k)), 'alkemi-bonusen handlar om drycker');
ok('petPower' in SETS.flock.mods && 'allyChance' in SETS.flock.mods, 'flock-bonusen handlar om följeslagare');
ok(Cards.synergy(Cards.byId('groddrunan'), ['lakebladet']).includes(SETS.alkemi.name), 'synergy alkemi');
ok(Cards.synergy(Cards.byId('jarnnaven'), ['gapet']).includes('NÄRSTRID'), 'synergy närstrid');

// ---------- sammansmältning ----------
ok(typeof Cards.fuse === 'function' && typeof Cards.canFuse === 'function', 'fuse och canFuse finns');
ok(Cards.fuse('slipstenen') === 'slipstenen+', 'fuse ger <id>+');
const sp2 = Cards.byId('slipstenen+');
ok(sp2 && sp2.id === 'slipstenen+' && sp2.name === 'SLIPSTENEN+' && sp2.rarity === 'ovanlig' && sp2.mods.dmg === 0.16 && sp2.icon === Cards.byId('slipstenen').icon && sp2.fused && sp2.base === 'slipstenen', 'byId(slipstenen+) ' + JSON.stringify(sp2));
ok(Cards.byId('slipstenen+') === sp2, 'byId cachar sammansmälta kort');
ok(!ALL.includes(sp2), 'sammansmälta kort ska inte ligga i ALL');
for (const bad of ['pakt_pistol', 'studskulan', 'ansiktslos', 'finnsinte', 'slipstenen+', '', '+']) ok(Cards.fuse(bad) === null, 'fuse(' + bad + ') ska vara null');
for (const bad of ['pakt_pistol+', 'studskulan+', 'ansiktslos+', 'finnsinte+', 'slipstenen++', '+', 'constructor', '__proto__']) ok(Cards.byId(bad) === null, 'byId(' + bad + ') ska vara null');
let nf = 0;
for (const c of ALL) {
  const fid = Cards.fuse(c.id);
  ok(!!fid === (c.max >= 2 && !c.pact && !c.weapon && !c.active), c.id + ': fuse när max >= 2');
  if (!fid) continue;
  nf++;
  const f = Cards.byId(fid), ri = Cards.RARITY_ORDER.indexOf(c.rarity);
  ok(f.rarity === Cards.RARITY_ORDER[Math.min(3, ri + 1)], fid + ': ett steg sällsyntare');
  ok(f.name === c.name + '+' && f.icon === c.icon && f.max >= 1 && f.max <= c.max, fid + ': namn, bild och max');
  ok(f.set === c.set && f.curse === c.curse, fid + ': set och förbannelse');
  ok(f.text === f.text.toUpperCase() && f.text !== c.text && /\d/.test(f.text), fid + ': ny text ' + JSON.stringify(f.text));
  ok(f.text.split('\n').length - (f.bad || 0) >= 1, fid + ': text och bad');
  for (const k in c.mods) {
    const a = c.mods[k], b = f.mods[k];
    if (Cards.modLines({ [k]: a })[0] && /^[A-ZÅÄÖ]/.test(Cards.modLines({ [k]: a })[0].text)) { ok(b === a, fid + ': på/av-nyckel ' + k + ' oförändrad'); continue; }
    ok(Math.sign(a) === Math.sign(b) && Math.abs(b) > Math.abs(a), fid + ': ' + k + ' ' + a + ' -> ' + b + ' ska bli starkare');
    ok(b / a >= 1.25 && b / a <= 2 + 1e-9 && (Math.abs(b / a - Cards.FUSE_MUL) < 0.35 || Math.abs(a) === 1), fid + ': ' + k + ' ' + a + ' -> ' + b + ' ungefär ×1,6 (1 blir 2)');
    ok(Math.abs(b * 1e6 - Math.round(b * 1e6)) < 1e-6, fid + ': ' + k + ' avrundning ' + b);
  }
  ok(Cards.price(f, 2, 0) >= Cards.price(c, 2, 0), fid + ': pris');
  ok(Cards.describe(f).includes(f.name), fid + ': describe');
}
ok(nf >= 100, 'minst 100 kort kan smältas (' + nf + ')');
ok(Cards.byId('lagerelden+').mods.regen === 0.5 && Cards.byId('loparen+').mods.speedOnKill === 2.4 && Cards.byId('kantvakten+').mods.maxHp === 16, 'avrundning av platta tal');
ok(Cards.byId('trefaldigheten+').text === '+2 KULOR PER SKOTT' && Cards.byId('agget+').text === '+2 MAX GRANATER', 'plural i sammansmälta texter: ' + Cards.byId('trefaldigheten+').text + ' / ' + Cards.byId('agget+').text);
ok(Cards.byId('offerdolken+').bad === 1 && /^-\d+ MAX HP$/.test(Cards.byId('offerdolken+').text.split('\n')[1]), 'förbannat sammansmält kort behåller nackdelen');
ok(JSON.stringify(Cards.canFuse(['slipstenen', 'slipstenen', 'kantvakten', 'ansiktslos', 'ansiktslos', 'pakt_pistol', 'pakt_pistol', 'slipstenen+', 'slipstenen+', 'glodkol', 'glodkol', 'glodkol'])) === '["slipstenen","glodkol"]', 'canFuse ' + JSON.stringify(Cards.canFuse(['slipstenen', 'slipstenen', 'kantvakten', 'ansiktslos', 'ansiktslos', 'pakt_pistol', 'pakt_pistol', 'slipstenen+', 'slipstenen+', 'glodkol', 'glodkol', 'glodkol'])));
ok(Cards.canFuse([]).length === 0 && Cards.canFuse(null).length === 0 && Cards.canFuse(['finnsinte', 'finnsinte']).length === 0, 'canFuse tomt');
m = Cards.computeMods(['slipstenen+']);
ok(m.dmg === 0.16 && Object.keys(m).length === keys.length, 'computeMods med + ' + m.dmg);
m = Cards.computeMods(['slipstenen+', 'slipstenen', 'kantvakten+', 'kantvakten+']);
ok(Math.abs(m.dmg - 0.26) < 1e-9 && m.maxHp === 32, 'computeMods blandat ' + m.dmg + ' ' + m.maxHp);
{ // ett sammansmält kort räknas som sitt grundkort i set
  const st = SETS.eld, mem = ALL.filter(c => c.set === 'eld').map(c => c.id);
  const m3 = Cards.computeMods([mem[0] + '+', mem[1], mem[2]]), m2 = Cards.computeMods([mem[0] + '+', mem[0], mem[1]]);
  const base3 = Cards.computeMods([mem[0] + '+', mem[1], mem[2]].map(id => id)), only = {};
  for (const id of [mem[0] + '+', mem[1], mem[2]]) for (const k in Cards.byId(id).mods) only[k] = (only[k] || 0) + Cards.byId(id).mods[k];
  for (const k in st.mods) ok(Math.abs(base3[k] - ((only[k] || 0) + st.mods[k])) < 1e-6, 'set med sammansmält kort: ' + k);
  ok(Cards.setProgress([mem[0] + '+', mem[0], mem[1]]).find(x => x.id === 'eld').have === 2, 'kort och sammansmält kort räknas som ett i set');
  ok(m2 && m3, 'computeMods med set');
  ok(Cards.synergy(Cards.byId(mem[1]), [mem[0] + '+']).includes(st.name), 'synergy med sammansmält kort');
  ok(Cards.synergy(Cards.byId(mem[0]), [mem[0] + '+']) === '' || !Cards.synergy(Cards.byId(mem[0]), [mem[0] + '+']).includes('1/3'), 'grundkortet fortsätter inte setet när man har det sammansmälta');
}
for (let seed = 1; seed <= 200; seed++) { // '<id>+' räknas som två exemplar mot max
  const got = Cards.draw(makeRng(seed), 5, { owned: ['slipstenen+', 'slipstenen+', 'slipstenen', 'lagerelden+', 'lagerelden', 'offerkniven+', 'offerkniven'], unlocked: unlockedAll });
  for (const c of got) ok(!['slipstenen', 'lagerelden', 'offerkniven'].includes(c.id) && !c.fused, 'draw gav ' + c.id + ' trots sammansmälta kort');
}

// ---------- nya kort: runor, hetta, mana, pilar, uppdrag, lägereld, förmågor, hemligheter och måltider ----------
const md5 = f => require('crypto').createHash('md5').update(fs.readFileSync(f)).digest('hex');
const N6_KEYS = ['runeSlots', 'runePower', 'heatResist', 'manaRegen', 'arrowRetrieve', 'questGold', 'campfireHeal', 'activeCd', 'secretChance', 'mealPower'];
for (const k of N6_KEYS) {
  ok(keys.includes(k) && /[a-zåäö]/i.test(MOD_KEYS[k]), 'ny nyckel saknas eller saknar beskrivning: ' + k);
  const l = Cards.modLines({ [k]: 0.1 });
  ok(l.length === 1 && l[0].good && l[0].text === l[0].text.toUpperCase() && /\d/.test(l[0].text), k + ': modLines ' + JSON.stringify(l));
  ok(typeof Cards.fmtVal(k, 0.1) === 'string' && Cards.modLabel(k) === Cards.modLabel(k).toUpperCase(), k + ': fmtVal/modLabel');
}
const N6_IDS = ['runristaren', 'manastjarnan', 'fjaderpennan', 'hamstraren', 'vilostenen', 'blixtstenen', 'stjarnkartan', 'pilgrimsfrukten', 'skattbrevet', 'askbrevet',
  'runskivan', 'arkana_karnan', 'jaktmarket', 'ballongerna', 'marketenterskan', 'andekortet', 'frostglassen', 'svarta_gavan',
  'runkistan', 'fullmanen', 'vulkanvaggen', 'pilpungen', 'demonrunorna', 'asktemplet', 'stjarnskytten'];
ok(N6_IDS.length === 25 && new Set(N6_IDS).size === 25, '25 unika nya id');
const N6 = N6_IDS.map(id => Cards.byId(id)).filter(Boolean);
ok(N6.length === 25, 'nya kort saknas: ' + N6_IDS.filter(id => !Cards.byId(id)).join(','));
const n6Rar = {};
for (const c of N6) {
  n6Rar[c.rarity] = (n6Rar[c.rarity] || 0) + 1;
  ok(!c.pact && !c.weapon && !c.active && !V5_IDS.includes(c.id) && !NEW_IDS.includes(c.id), c.id + ': nytt vanligt kort');
  ok(c.name === c.name.toUpperCase() && c.text === c.text.toUpperCase() && /\d/.test(c.text), c.id + ': versaler och tal i texten');
  const f = path.join(root, c.icon);
  ok(fs.existsSync(f), c.id + ': bild saknas');
  if (fs.existsSync(f)) { const b = fs.readFileSync(f); ok(b.readUInt32BE(16) === 96 && b.readUInt32BE(20) === 96, c.id + ': bilden ska vara 96x96'); }
  ok(Cards.modLines(c).length === Object.keys(c.mods).length, c.id + ': varje mod ska ha en effektrad');
  ok(c.text.split('\n').length >= Cards.modLines(c).length, c.id + ': texten ska nämna alla effekter');
  for (const k in c.mods) { // talet i texten stämmer med modden
    const v = c.mods[k], f2 = Cards.modLines({ [k]: v })[0];
    if (/\d/.test(f2.text)) ok(c.text.includes(String(Math.round(Math.abs(v) * (/%/.test(f2.text) ? 100 : 1))).replace('.', ',')), c.id + ': texten ska ha talet för ' + k);
  }
}
ok(n6Rar.vanlig === 10 && n6Rar.ovanlig === 8 && n6Rar.sallsynt === 5 && n6Rar.legendarisk === 2, 'nya kort per sällsynthet ' + JSON.stringify(n6Rar));
ok(N6.filter(c => c.curse).length === 2, '2 nya förbannade kort');
ok(N6_KEYS.concat(['trapResist']).every(k => N6.some(c => k in c.mods)), 'alla nya nycklar (och trapResist) ska användas: saknas ' + N6_KEYS.filter(k => !N6.some(c => k in c.mods)).join(','));
// pakter och uppgraderingar för spikgeväret, blixtstaven och långbågen
const PACTS6 = { nailgun: ['pakt_spik', ['ng_pin', 'ng_ricochet', 'ng_heat', 'ng_shred'], 'SPIKAR'], staff: ['pakt_stav', ['st_chain', 'st_orb', 'st_mana', 'st_stun'], 'MANA'], bow: ['pakt_bage', ['bw_pierce', 'bw_triple', 'bw_explosive', 'bw_retrieve'], 'PILAR'] };
const N6_ART = N6_IDS.slice();
for (const w in PACTS6) {
  const [pid, wups, ammo] = PACTS6[w], p = Cards.byId(pid);
  ok(p && p.pact === w && p.rarity === 'sallsynt' && p.max === 1 && p.mods.dmg === 0.15 && p.bad === 1 && p.text.includes('ALL AMMO BLIR ' + ammo), pid + ': pakt för ' + w);
  ok(p && Cards.WEAPON_NAME[w] && p.text.includes(Cards.WEAPON_NAME[w]) && Cards.tag(p) === 'PAKT', w + ': WEAPON_NAME och pakttext');
  ok(Cards.fuse(pid) === null && Cards.refine(pid) === null, pid + ': kan inte smältas eller förädlas');
  N6_ART.push(pid);
  const ups = ALL.filter(c => c.weapon === w);
  ok(ups.length === 4 && JSON.stringify(ups.map(c => c.wup).sort()) === JSON.stringify(wups.slice().sort()), w + ': uppgraderingar ' + ups.map(c => c.wup).join(','));
  for (const u of ups) {
    N6_ART.push(u.id);
    ok(u.max === 1 && Object.keys(u.mods).length === 0 && Cards.tag(u) === Cards.WEAPON_NAME[w] && Cards.refine(u.id) === null, u.id + ': uppgradering');
    ok(u.name === u.name.toUpperCase() && u.text === u.text.toUpperCase(), u.id + ': versaler');
  }
  const rng = makeRng(13); let hit = 0;
  for (let i = 0; i < 300; i++) for (const c of Cards.draw(rng, 4, { pact: w, unlocked: unlockedAll })) { ok(!c.pact && (!c.weapon || c.weapon === w), 'draw med pakt ' + w + ' gav ' + c.id); if (c.weapon === w) hit++; }
  ok(hit > 50, w + ': uppgraderingarna ska dras ofta efter pakten (' + hit + ')');
  const rng2 = makeRng(17);
  for (let i = 0; i < 200; i++) for (const c of Cards.draw(rng2, 4, { unlocked: unlockedAll })) ok(c.weapon !== w, 'uppgradering ' + c.id + ' utan pakt');
}
// aktiva förmågor
const ACT = { blink: ['blinken', 8], slowmo: ['tidsbubblan', 25], bubble: ['skoldbubblan', 20], summon: ['valnadskallet', 30], quake: ['jordskalvet', 15] };
const actives = ALL.filter(c => c.active);
ok(actives.length === 5 && JSON.stringify(actives.map(c => c.active).sort()) === JSON.stringify(Object.keys(ACT).sort()), 'fem aktiva förmågor ' + actives.map(c => c.active));
for (const a in ACT) {
  const [id, cd] = ACT[a], c = Cards.byId(id);
  ok(c && c.active === a && c.cd === cd && c.max === 1 && ['sallsynt', 'legendarisk'].includes(c.rarity), id + ': aktiv ' + a + ' cd ' + cd);
  ok(c && Cards.tag(c) === 'AKTIV · ' + cd + ' S' && Cards.describe(c).includes('NEDRÄKNING ' + cd + ' S'), id + ': tag ' + (c && Cards.tag(c)));
  ok(c && !c.curse && !c.pact && !c.weapon && Object.keys(c.mods).length === 0, id + ': ren förmåga');
  ok(Cards.fuse(id) === null && Cards.refine(id) === null && Cards.byId(id + '+') === null, id + ': kan inte smältas eller förädlas');
  N6_ART.push(id);
}
ok(Cards.activeOf([]) === null && Cards.activeOf(null) === null && Cards.activeOf(['slipstenen', 'finnsinte']) === null, 'activeOf utan förmåga');
ok(Cards.activeOf(['blinken', 'slipstenen']).id === 'blinken', 'activeOf en förmåga');
ok(Cards.activeOf(['blinken', 'slipstenen', 'jordskalvet', 'glodkol', 'slipstenen+']).id === 'jordskalvet', 'activeOf: den senast tagna gäller');
ok(Cards.activeOf(['jordskalvet', 'blinken']).active === 'blink', 'activeOf ger kortobjektet');
ok(Cards.synergy(Cards.byId('tidsbubblan'), ['blinken']) === '', 'en ny förmåga är ingen synergi med den gamla');
ok(Cards.synergy(Cards.byId('blixtstenen'), ['blinken']).includes('FÖRMÅGA'), 'kortare nedräkning + förmåga är synergi');
{ // aktiva förmågor dras (bara upplåsta) och aldrig två gånger
  const rng = makeRng(77), hit = new Set();
  for (let i = 0; i < 3000; i++) for (const c of Cards.draw(rng, 3, { unlocked: unlockedAll, depth: i % 6, owned: ['blinken'] })) { if (c.active) hit.add(c.id); ok(c.id !== 'blinken', 'blinken dragen trots att den ägs'); }
  ok(hit.size === 4, 'de andra förmågorna ska kunna dras: ' + [...hit].join(','));
  const rng2 = makeRng(78);
  for (let i = 0; i < 1000; i++) for (const c of Cards.draw(rng2, 3, {})) ok(!c.active || !c.unlock, 'låst förmåga dragen ' + c.id);
}
// bilder: 96x96 och ingen bild används två gånger (bland alla kort)
{
  const byHash = new Map();
  for (const c of ALL) { const f = path.join(root, c.icon); if (fs.existsSync(f)) { const h = md5(f); if (!byHash.has(h)) byHash.set(h, []); byHash.get(h).push(c.id); } }
  for (const id of N6_ART) {
    const f = path.join(root, Cards.byId(id).icon);
    ok(fs.existsSync(f), id + ': bild saknas');
    if (!fs.existsSync(f)) continue;
    const b = fs.readFileSync(f);
    ok(b.readUInt32BE(16) === 96 && b.readUInt32BE(20) === 96, id + ': bilden ska vara 96x96');
    ok(byHash.get(md5(f)).length === 1, id + ': samma bild som ' + byHash.get(md5(f)).join(','));
  }
  const src = fs.readFileSync(path.join(root, 'tools/card-art/make.py'), 'utf8');
  for (const id of N6_ART) ok(new RegExp("'" + id + "'").test(src), id + ': bilden ska byggas i tools/card-art/make.py');
}
// set: ASKANS ARV och JÄGARENS LÄRA
for (const [sid, name, need] of [['aska', 'ASKANS ARV', ['heatResist', 'fireDmg']], ['jakt', 'JÄGARENS LÄRA', ['headshot', 'arrowRetrieve']]]) {
  const members = ALL.filter(c => c.set === sid);
  ok(SETS[sid] && SETS[sid].name === name && members.length >= 4 && members.length <= 6, sid + ': ' + members.length + ' kort');
  ok(need.every(k => k in SETS[sid].mods), sid + ': bonusen ska handla om ' + need.join(', '));
  ok(members.some(c => N6_IDS.includes(c.id)) && members.some(c => !N6_IDS.includes(c.id)), sid + ': nya och gamla kort');
  const three = members.slice(-3).map(c => c.id), m3 = Cards.computeMods(three), raw = {};
  for (const id of three) for (const k in Cards.byId(id).mods) raw[k] = (raw[k] || 0) + Cards.byId(id).mods[k];
  for (const k in SETS[sid].mods) ok(Math.abs(m3[k] - (raw[k] || 0) - SETS[sid].mods[k]) < 1e-6, sid + ': setbonus ' + k);
}
ok(['eldrunan', 'brinnande_tornet', 'askbrevet', 'vulkanvaggen', 'asktemplet'].every(id => Cards.byId(id).set === 'aska'), 'aska-medlemmar');
ok(['spejarkikaren', 'jagarogat', 'fjaderpennan', 'jaktmarket', 'pilpungen', 'stjarnskytten'].every(id => Cards.byId(id).set === 'jakt'), 'jakt-medlemmar');
ok(Cards.synergy(Cards.byId('vulkanvaggen'), ['eldrunan', 'askbrevet']) === 'FULLBORDAR ASKANS ARV', 'synergy fullbordar aska');
// förädling
ok(Cards.refine('slipstenen') === 'slipstenen+' && Cards.refine('runskivan') === 'runskivan+' && Cards.refine('hamstraren') === 'hamstraren+', 'refine ger <id>+');
for (const bad of ['pakt_pistol', 'pakt_bage', 'studskulan', 'solfjadern', 'blinken', 'offerdolken', 'svarta_gavan', 'ansiktslos', 'asktemplet', 'slipstenen+', 'finnsinte', '', null, undefined, 3, '__proto__', 'constructor'])
  ok(Cards.refine(bad) === null, 'refine(' + bad + ') ska vara null');
let nr = 0;
for (const c of ALL) {
  const r = Cards.refine(c.id);
  ok(!!r === (Cards.fuse(c.id) !== null && !c.curse), c.id + ': refine följer fuse men inte för förbannade');
  if (r) { nr++; ok(r === Cards.fuse(c.id) && Cards.byId(r).fused && Cards.byId(r).base === c.id, c.id + ': refine ger samma kort som fuse'); }
}
ok(nr >= 100, 'minst 100 kort kan förädlas (' + nr + ')');
ok(JSON.stringify(Cards.canRefine(['slipstenen', 'blinken', 'slipstenen', 'offerdolken', 'pakt_pistol', 'glodkol+', 'runskivan', 'askkungen'])) === '["slipstenen","runskivan"]', 'canRefine ' + JSON.stringify(Cards.canRefine(['slipstenen', 'blinken', 'slipstenen', 'offerdolken', 'pakt_pistol', 'glodkol+', 'runskivan', 'askkungen'])));
ok(Cards.canRefine([]).length === 0 && Cards.canRefine(null).length === 0, 'canRefine tomt');
ok(Cards.byId('runskivan+').text === '+2 RUNPLATSER' && Cards.byId('runskivan+').mods.runeSlots === 2, 'förädlad runskiva: ' + Cards.byId('runskivan+').text);
// före och efter (kortval och förädling)
{
  const d = Cards.diffLines({ dmg: 0.2, maxHp: 10 }, { dmg: 0.3, maxHp: 10, damageTaken: 0.1, doubleJump: 1 });
  ok(d.length === 3 && d[0].text === 'SKADA 20 % → 30 %' && d[0].good, 'diffLines ' + JSON.stringify(d));
  ok(d.find(l => l.key === 'damageTaken').good === false && d.find(l => l.key === 'doubleJump').text === 'DUBBELHOPP AV → PÅ', 'diffLines omvänd och på/av');
  const p = Cards.preview(Cards.byId('slipstenen'), { dmg: 0.2 }, []);
  ok(p.length === 1 && p[0].text === 'SKADA 20 % → 30 %', 'preview ' + JSON.stringify(p));
  const ps = Cards.preview(Cards.byId('askbrevet'), Cards.computeMods(['eldrunan', 'brinnande_tornet']), ['eldrunan', 'brinnande_tornet']);
  ok(ps[0].key === 'heatResist' && ps.find(l => l.key === 'heatResist').after === 0.4 && ps.some(l => l.key === 'fireDmg'), 'preview räknar med setbonusen ' + JSON.stringify(ps));
  ok(Cards.preview(Cards.byId('blinken'), {}, []).length === 0 && Cards.preview(null).length === 0, 'preview utan mods');
  const rf = Cards.diffLines(Cards.byId('slipstenen').mods, Cards.byId('slipstenen+').mods);
  ok(rf.length === 1 && rf[0].text === 'SKADA 10 % → 16 %', 'förädling före/efter ' + JSON.stringify(rf));
}

// ---------- version 7: pakter för kastknivarna, stridshammaren och musköten, 20 nya kort, två set och försäljning ----------
const V7_KEYS = { stealthDmg: 'p', noiseReduce: 'p', detectSlow: 'p', lampBattery: 'p', lampRadius: 'n', gambleLuck: 'p', bankInterest: 'p', masteryXp: 'p', pageSouls: 'n', goldFind: 'p' };
for (const k in V7_KEYS) {
  ok(keys.includes(k) && /[a-zåäö]{4}/i.test(MOD_KEYS[k]), 'version 7-nyckel saknas eller saknar beskrivning: ' + k);
  const l = Cards.modLines({ [k]: V7_KEYS[k] === 'p' ? 0.1 : 1 });
  ok(l.length === 1 && l[0].good && l[0].text === l[0].text.toUpperCase() && /\d/.test(l[0].text) && (V7_KEYS[k] === 'p') === / % /.test(l[0].text), k + ': modLines ' + JSON.stringify(l));
  ok(Cards.modLabel(k) !== k.toUpperCase() && Cards.modLabel(k) === Cards.modLabel(k).toUpperCase(), k + ': svensk etikett ' + Cards.modLabel(k));
  ok(Cards.fmtVal(k, V7_KEYS[k] === 'p' ? 0.25 : 2) === (V7_KEYS[k] === 'p' ? '25 %' : '2'), k + ': fmtVal');
  ok(Cards.modLines({ [k]: -1 })[0].good === false, k + ': negativt värde är en nackdel');
}
ok(new Set(Object.keys(V7_KEYS).map(Cards.modLabel)).size === 10 && Object.keys(V7_KEYS).every(k => !Object.keys(MOD_KEYS).filter(x => !(x in V7_KEYS)).some(x => Cards.modLabel(x) === Cards.modLabel(k))), 'version 7-nycklarna har egna etiketter');
const V7_IDS = ['smygskorna', 'tystlaten', 'lyktbararen', 'lyckostjarnan', 'guldfrot', 'ovningssvardet', 'sjalastenen', 'guldsallet',
  'kastdolkarna', 'lyktsmeden', 'bankirens_sigill', 'gyllene_skarabeen', 'vapenboken', 'nattblinda_ogat',
  'gravplundraren', 'skuggkappan', 'blodiga_kronikan', 'skuldbrevet', 'faraonens_mask', 'morkrets_furste'];
ok(V7_IDS.length === 20 && new Set(V7_IDS).size === 20, '20 unika version 7-id');
const V7 = V7_IDS.map(id => Cards.byId(id)).filter(Boolean);
ok(V7.length === 20, 'version 7-kort saknas: ' + V7_IDS.filter(id => !Cards.byId(id)).join(','));
const v7Rar = {};
for (const c of V7) {
  v7Rar[c.rarity] = (v7Rar[c.rarity] || 0) + 1;
  ok(!c.pact && !c.weapon && !c.active && !N6_IDS.includes(c.id) && !V5_IDS.includes(c.id) && !NEW_IDS.includes(c.id), c.id + ': nytt vanligt kort');
  ok(c.name === c.name.toUpperCase() && c.text === c.text.toUpperCase() && /\d/.test(c.text), c.id + ': versaler och tal i texten');
  ok(Cards.modLines(c).length === Object.keys(c.mods).length && c.text.split('\n').length >= Object.keys(c.mods).length, c.id + ': texten ska nämna alla effekter');
  for (const k in c.mods) {
    const v = c.mods[k], f2 = Cards.modLines({ [k]: v })[0];
    if (/\d/.test(f2.text)) ok(c.text.includes(String(Math.round(Math.abs(v) * (/%/.test(f2.text) ? 100 : 1)))), c.id + ': texten ska ha talet för ' + k);
  }
  ok(Object.keys(c.mods).some(k => k in V7_KEYS), c.id + ': använder en ny nyckel');
  if (c.curse) ok(c.bad >= 1 && Cards.sellPrice(c, 2) === 0, c.id + ': förbannat');
  ok(Cards.describe(c).includes(c.name), c.id + ': describe');
}
ok(v7Rar.vanlig === 8 && v7Rar.ovanlig === 6 && v7Rar.sallsynt === 4 && v7Rar.legendarisk === 2, 'version 7 per sällsynthet ' + JSON.stringify(v7Rar));
ok(V7.filter(c => c.curse).length === 2, '2 förbannade version 7-kort');
ok(Object.keys(V7_KEYS).every(k => V7.filter(c => k in c.mods).length >= 2), 'varje ny nyckel ska användas av minst två nya kort: ' + Object.keys(V7_KEYS).filter(k => V7.filter(c => k in c.mods).length < 2).join(','));
ok(Cards.byId('sjalastenen+').text === '+2 SJÄLAR PER KRÖNIKESIDA' && Cards.byId('lyktsmeden+').mods.lampRadius === 2, 'sammansmälta version 7-kort: ' + Cards.byId('sjalastenen+').text);
ok(Cards.computeMods(['smygskorna', 'smygskorna', 'guldsallet']).noiseReduce === 0.4 && Cards.computeMods(['nattblinda_ogat']).lampRadius === -1, 'computeMods med nya nycklar');
{ // nya kort dras (alla upplåsta) och låsta dras inte
  const rng = makeRng(707), hit = new Set();
  for (let i = 0; i < 4000; i++) for (const c of Cards.draw(rng, 3, { unlocked: unlockedAll, depth: i % 6 })) hit.add(c.id);
  ok(V7_IDS.every(id => hit.has(id)), 'alla version 7-kort ska kunna dras: saknas ' + V7_IDS.filter(id => !hit.has(id)).join(','));
}
// pakter och uppgraderingar: vapnet (weapon) och de unika uppgraderingarna (wup) som spelet implementerar
const PACTS7 = {
  knives: ['pakt_kniv', ['kn_fan', 'kn_poison', 'kn_return', 'kn_crit'], 'ALL AMMO BLIR KNIVAR', 'KASTKNIVAR'],
  hammer: ['pakt_hammare', ['hm_quake', 'hm_stun', 'hm_shatter', 'hm_throw'], 'INGEN AMMO', 'STRIDSHAMMARE'],
  musket: ['pakt_musköt', ['mk_buck', 'mk_fast', 'mk_smoke', 'mk_bayonet'], 'ALL AMMO BLIR KULOR', 'MUSKÖT'],
};
const V7_ART = V7_IDS.slice();
for (const w in PACTS7) {
  const [pid, wups, ammo, wname] = PACTS7[w], p = Cards.byId(pid);
  ok(p && p.pact === w && p.rarity === 'sallsynt' && p.max === 1 && p.mods.dmg === 0.15 && p.bad === 1 && p.text.includes(ammo), pid + ': pakt för ' + w);
  ok(Cards.WEAPON_NAME[w] === wname && p && p.text.includes(wname) && Cards.tag(p) === 'PAKT', w + ': WEAPON_NAME och pakttext');
  ok(Cards.fuse(pid) === null && Cards.refine(pid) === null && Cards.sellPrice(pid, 3) === 0, pid + ': kan inte smältas, förädlas eller säljas');
  V7_ART.push(pid);
  const ups = ALL.filter(c => c.weapon === w);
  ok(ups.length === 4 && JSON.stringify(ups.map(c => c.wup).sort()) === JSON.stringify(wups.slice().sort()), w + ': uppgraderingar ' + ups.map(c => c.wup).join(','));
  ok(ups.some(u => u.rarity === 'legendarisk') && ups.some(u => u.rarity === 'ovanlig'), w + ': uppgraderingar av olika sällsynthet');
  for (const u of ups) {
    V7_ART.push(u.id);
    ok(u.max === 1 && Object.keys(u.mods).length === 0 && Cards.tag(u) === wname && Cards.refine(u.id) === null && Cards.fuse(u.id) === null, u.id + ': uppgradering');
    ok(u.name === u.name.toUpperCase() && u.text === u.text.toUpperCase() && !u.set, u.id + ': versaler, inget set');
    ok(Cards.sellPrice(u, 2) === 0 && !Cards.canSell(u), u.id + ': kan inte säljas');
  }
  const rng = makeRng(29); let hit = 0;
  for (let i = 0; i < 300; i++) for (const c of Cards.draw(rng, 4, { pact: w, unlocked: unlockedAll })) { ok(!c.pact && (!c.weapon || c.weapon === w), 'draw med pakt ' + w + ' gav ' + c.id); if (c.weapon === w) hit++; }
  ok(hit > 50, w + ': uppgraderingarna ska dras ofta efter pakten (' + hit + ')');
  const rng2 = makeRng(31);
  for (let i = 0; i < 200; i++) for (const c of Cards.draw(rng2, 4, { unlocked: unlockedAll })) ok(c.weapon !== w, 'uppgradering ' + c.id + ' utan pakt');
}
{ // pakterna dras utan pakt men aldrig en andra
  const rng = makeRng(33), hit = new Set();
  for (let i = 0; i < 4000; i++) for (const c of Cards.draw(rng, 3, { unlocked: unlockedAll })) if (c.pact) hit.add(c.id);
  ok(['pakt_kniv', 'pakt_hammare', 'pakt_musköt'].every(id => hit.has(id)), 'nya pakter dras');
}
// bilder: 96x96, unika (bland alla kort) och byggda i tools/card-art/make.py
{
  const byHash = new Map();
  for (const c of ALL) { const f = path.join(root, c.icon); if (fs.existsSync(f)) { const h = md5(f); if (!byHash.has(h)) byHash.set(h, []); byHash.get(h).push(c.id); } }
  const src = fs.readFileSync(path.join(root, 'tools/card-art/make.py'), 'utf8');
  for (const id of V7_ART) {
    const c = Cards.byId(id), f = path.join(root, c.icon);
    ok(/^assets\/cards\/[a-z0-9_]+\.png$/.test(c.icon), id + ': bildens filnamn ska vara ASCII: ' + c.icon);
    ok(fs.existsSync(f), id + ': bild saknas');
    if (!fs.existsSync(f)) continue;
    const b = fs.readFileSync(f);
    ok(b.readUInt32BE(16) === 96 && b.readUInt32BE(20) === 96, id + ': bilden ska vara 96x96');
    ok(byHash.get(md5(f)).length === 1, id + ': samma bild som ' + byHash.get(md5(f)).join(','));
    ok(src.includes("'" + id + "'"), id + ': bilden ska byggas i tools/card-art/make.py');
  }
  ok(V7_ART.length === 35, '35 nya bilder');
}
// set: NATTENS VÄG och ÖKNENS GÅTA
for (const [sid, name, need, oldId] of [['skuggor', 'NATTENS VÄG', ['stealthDmg', 'noiseReduce', 'detectSlow'], 'offerdolken'], ['oknen', 'ÖKNENS GÅTA', ['goldFind', 'pageSouls'], 'midasmasken']]) {
  const members = ALL.filter(c => c.set === sid);
  ok(SETS[sid] && SETS[sid].name === name && members.length >= 4 && members.length <= 6, sid + ': ' + members.length + ' kort');
  ok(need.every(k => k in SETS[sid].mods), sid + ': bonusen ska handla om ' + need.join(', '));
  ok(members.filter(c => V7_IDS.includes(c.id)).length >= 4 && members.some(c => c.id === oldId), sid + ': nya kort och ' + oldId);
  for (const k in SETS[sid].mods) ok(SETS[sid].text.includes(String(Math.round(SETS[sid].mods[k] * (Cards.modLines({ [k]: SETS[sid].mods[k] })[0].text.includes('%') ? 100 : 1)))), sid + ': settexten nämner ' + k);
  const three = members.slice(-3).map(c => c.id), m3 = Cards.computeMods(three), raw = {};
  for (const id of three) for (const k in Cards.byId(id).mods) raw[k] = (raw[k] || 0) + Cards.byId(id).mods[k];
  for (const k in SETS[sid].mods) ok(Math.abs(m3[k] - (raw[k] || 0) - SETS[sid].mods[k]) < 1e-6, sid + ': setbonus ' + k);
  ok(Cards.setProgress(three).find(x => x.id === sid).active, sid + ': setProgress aktiv');
}
ok(Cards.synergy(Cards.byId('skuggkappan'), ['smygskorna', 'tystlaten']) === 'FULLBORDAR NATTENS VÄG', 'synergy fullbordar skuggor');
ok(Cards.synergy(Cards.byId('gyllene_skarabeen'), ['guldsallet']) === 'ÖKNENS GÅTA 2/3', 'synergy öknen 2/3');
ok(Cards.synergy(Cards.byId('lyktsmeden'), ['lyktbararen']).includes('LAMPAN') && Cards.synergy(Cards.byId('vapenboken'), ['ovningssvardet']).includes('VAPENVANA'), 'nya syn-taggar');
ok(Cards.describe(Cards.byId('faraonens_mask')).includes('SET: ÖKNENS GÅTA'), 'describe nämner ÖKNENS GÅTA');
// försäljning: ungefär 40 % av butikspriset, 0 för förbannade kort, pakter och uppgraderingar
ok(typeof Cards.sellPrice === 'function' && typeof Cards.canSell === 'function' && Cards.SELL_SHARE === 0.4, 'sellPrice finns');
for (const c of ALL) {
  for (const d of [0, 3, 7]) {
    const sp = Cards.sellPrice(c, d);
    if (c.curse || c.pact || c.weapon) { ok(sp === 0, c.id + ': ska inte kunna säljas (' + sp + ')'); continue; }
    const full = Cards.price(c, d, 0);
    ok(sp > 0 && sp % 5 === 0 && sp < full && Math.abs(sp - full * 0.4) <= 5, c.id + ': säljpris ' + sp + ' av ' + full + ' (djup ' + d + ')');
    ok(Cards.sellPrice(c.id, d) === sp, c.id + ': sellPrice med id');
  }
  ok(Cards.canSell(c) === !(c.curse || c.pact || c.weapon), c.id + ': canSell');
}
ok(Cards.sellPrice('slipstenen', 0) === 15 && Cards.sellPrice('slipstenen', 5) === 25 && Cards.sellPrice('faraonens_mask', 0) === 80, 'säljpriser ' + [Cards.sellPrice('slipstenen', 0), Cards.sellPrice('slipstenen', 5), Cards.sellPrice('faraonens_mask', 0)]);
ok(Cards.sellPrice('slipstenen+', 2) > Cards.sellPrice('slipstenen', 2), 'sammansmält kort säljs dyrare');
ok(Cards.sellPrice('blinken', 0) > 0, 'aktiva förmågor kan säljas');
ok(Cards.sellPrice(Cards.byId('slipstenen'), 3) >= Cards.sellPrice('slipstenen', 0), 'säljpris växer med djup');
for (const bad of [null, undefined, 'finnsinte', '', 3, {}, '__proto__']) ok(Cards.sellPrice(bad, 1) === 0, 'sellPrice(' + bad + ') ska vara 0');
// ---------- version 8: pakter för harpunen, bumerangen och prismat, 24 nya kort (kristall, hav, kunskap och avgrund), två set ----------
const V8_KEYS = { swimSpeed: 'p', airMax: 'n', xpMul: 'p', talentChoice: 'n', crystalDmg: 'p', waterDmg: 'p', refract: 'n', abyssSouls: 'p', witchResist: 'p', levelHeal: 'n' };
for (const k in V8_KEYS) {
  ok(keys.includes(k) && /[a-zåäö]{4}/i.test(MOD_KEYS[k]), 'version 8-nyckel saknas eller saknar beskrivning: ' + k);
  const l = Cards.modLines({ [k]: V8_KEYS[k] === 'p' ? 0.1 : 1 });
  ok(l.length === 1 && l[0].good && l[0].text === l[0].text.toUpperCase() && /\d/.test(l[0].text) && (V8_KEYS[k] === 'p') === / % /.test(l[0].text), k + ': modLines ' + JSON.stringify(l));
  ok(Cards.modLabel(k) !== k.toUpperCase() && Cards.modLabel(k) === Cards.modLabel(k).toUpperCase(), k + ': svensk etikett ' + Cards.modLabel(k));
  ok(Cards.fmtVal(k, V8_KEYS[k] === 'p' ? 0.25 : 2) === (V8_KEYS[k] === 'p' ? '25 %' : '2'), k + ': fmtVal');
  ok(Cards.modLines({ [k]: -1 })[0].good === false, k + ': negativt värde är en nackdel');
}
ok(new Set(Object.keys(V8_KEYS).map(Cards.modLabel)).size === 10 && Object.keys(V8_KEYS).every(k => !keys.filter(x => !(x in V8_KEYS)).some(x => Cards.modLabel(x) === Cards.modLabel(k))), 'version 8-nycklarna har egna etiketter');
ok(/sekund/i.test(MOD_KEYS.airMax) && /talang/i.test(MOD_KEYS.talentChoice) && /kristall/i.test(MOD_KEYS.crystalDmg) && /vatten/i.test(MOD_KEYS.waterDmg) && /Avgrund/i.test(MOD_KEYS.abyssSouls) && /förbannelse/i.test(MOD_KEYS.witchResist) && /nivå/i.test(MOD_KEYS.levelHeal), 'version 8-beskrivningar');
const V8_IDS = ['simfenan', 'parlbandet', 'lardomens_ljus', 'roda_skarvan', 'tidvattenstenen', 'skarvlinsen', 'farjkarlens_obol', 'ronnbarskransen', 'larlingens_dryck', 'sjoormen',
  'visdomsstjarnan', 'dykarklockan', 'kristallbrytaren', 'krakens_vrede', 'avgrundsfyren', 'ronnskolden', 'drunknarens_sang',
  'regnbagsslipan', 'leviatans_fjall', 'siarens_oga', 'haxjagaren', 'avgrundens_lofte', 'glashjartat', 'avgrundens_arkivarie'];
ok(V8_IDS.length === 24 && new Set(V8_IDS).size === 24, '24 unika version 8-id');
const V8 = V8_IDS.map(id => Cards.byId(id)).filter(Boolean);
ok(V8.length === 24, 'version 8-kort saknas: ' + V8_IDS.filter(id => !Cards.byId(id)).join(','));
const v8Rar = {};
const OLDER = new Set(ALL.filter(c => !V8_IDS.includes(c.id) && !['harpoon', 'boomerang', 'prism'].includes(c.pact || c.weapon)).map(c => c.name));
for (const c of V8) {
  v8Rar[c.rarity] = (v8Rar[c.rarity] || 0) + 1;
  ok(!c.pact && !c.weapon && !c.active && !V7_IDS.includes(c.id) && !N6_IDS.includes(c.id) && !V5_IDS.includes(c.id) && !NEW_IDS.includes(c.id), c.id + ': nytt vanligt kort');
  ok(c.name === c.name.toUpperCase() && c.text === c.text.toUpperCase() && /\d/.test(c.text), c.id + ': versaler och tal i texten');
  ok(!OLDER.has(c.name), c.id + ': namnet ' + c.name + ' finns redan');
  ok(Cards.modLines(c).length === Object.keys(c.mods).length && c.text.split('\n').length >= Object.keys(c.mods).length, c.id + ': texten ska nämna alla effekter');
  for (const k in c.mods) {
    const v = c.mods[k], f2 = Cards.modLines({ [k]: v })[0];
    if (/\d/.test(f2.text)) ok(c.text.includes(String(Math.round(Math.abs(v) * (/%/.test(f2.text) ? 100 : 1)))), c.id + ': texten ska ha talet för ' + k);
  }
  ok(Object.keys(c.mods).some(k => k in V8_KEYS), c.id + ': använder en ny nyckel');
  if (c.curse) ok(c.bad >= 1 && Cards.sellPrice(c, 2) === 0 && Object.values(c.mods).some(v => v < 0), c.id + ': förbannat');
  else ok(Cards.sellPrice(c, 2) > 0, c.id + ': kan säljas');
  ok(Cards.describe(c).includes(c.name), c.id + ': describe');
  ok(c.max <= 4 && (c.max === 1 || Cards.fuse(c.id) === c.id + '+'), c.id + ': max och sammansmältning');
}
ok(v8Rar.vanlig === 10 && v8Rar.ovanlig === 7 && v8Rar.sallsynt === 5 && v8Rar.legendarisk === 2, 'version 8 per sällsynthet ' + JSON.stringify(v8Rar));
ok(V8.filter(c => c.curse).length === 2, '2 förbannade version 8-kort');
ok(Object.keys(V8_KEYS).every(k => V8.filter(c => k in c.mods).length >= 2), 'varje ny nyckel ska användas av minst två nya kort: ' + Object.keys(V8_KEYS).filter(k => V8.filter(c => k in c.mods).length < 2).join(','));
ok(V8.filter(c => c.unlock).length >= 6 && V8.every(c => !c.unlock || (c.unlock >= 10 && c.unlock <= 60)), 'version 8: några kort låses upp med själar');
ok(Cards.byId('skarvlinsen+').text === '+2 DELNINGAR FRÅN\nBRYTANDE KRISTALLER' && Cards.byId('skarvlinsen+').mods.refract === 2, 'plural i sammansmält skärvlins: ' + JSON.stringify(Cards.byId('skarvlinsen+').text));
ok(Cards.byId('parlbandet+').mods.airMax === 5 && Cards.byId('parlbandet+').text === '+5 S LUFT UNDER VATTNET', 'sammansmält pärlband: ' + Cards.byId('parlbandet+').text);
ok(Cards.byId('drunknarens_sang+') === null && Cards.refine('drunknarens_sang') === null, 'förbannat kort med max 1 kan inte smältas');
{ const m8 = Cards.computeMods(['simfenan', 'simfenan', 'sjoormen', 'drunknarens_sang']); ok(Math.abs(m8.swimSpeed - 0.4) < 1e-9 && m8.airMax === -2 && m8.waterDmg === 0.4, 'computeMods med version 8-nycklar ' + JSON.stringify([m8.swimSpeed, m8.airMax, m8.waterDmg])); }
{ // nya kort dras (alla upplåsta) och låsta dras inte
  const rng = makeRng(808), hit = new Set();
  for (let i = 0; i < 4000; i++) for (const c of Cards.draw(rng, 3, { unlocked: unlockedAll, depth: i % 6 })) hit.add(c.id);
  ok(V8_IDS.every(id => hit.has(id)), 'alla version 8-kort ska kunna dras: saknas ' + V8_IDS.filter(id => !hit.has(id)).join(','));
  const rng2 = makeRng(809);
  for (let i = 0; i < 1000; i++) for (const c of Cards.draw(rng2, 3, {})) ok(!c.unlock || !V8_IDS.includes(c.id), 'låst version 8-kort dragen ' + c.id);
}
// pakter och uppgraderingar
const PACTS8 = {
  harpoon: ['pakt_harpun', ['hp_pull', 'hp_barb', 'hp_chain', 'hp_reel'], 'ALL AMMO BLIR HARPUNER', 'HARPUN'],
  boomerang: ['pakt_bumerang', ['bm_twin', 'bm_blade', 'bm_curve', 'bm_return'], 'INGEN AMMO', 'BUMERANG'],
  prism: ['pakt_prisma', ['pr_split', 'pr_bounce', 'pr_focus', 'pr_burn'], 'ALL AMMO BLIR LJUSKRISTALLER', 'PRISMA'],
};
const V8_ART = V8_IDS.slice();
for (const w in PACTS8) {
  const [pid, wups, ammo, wname] = PACTS8[w], p = Cards.byId(pid);
  ok(p && p.pact === w && p.rarity === 'sallsynt' && p.max === 1 && p.mods.dmg === 0.15 && p.bad === 1 && p.text.includes(ammo), pid + ': pakt för ' + w);
  ok(Cards.WEAPON_NAME[w] === wname && p && p.text.includes('BARA ' + wname + ' RESTEN AV RUNDAN') && Cards.tag(p) === 'PAKT', w + ': WEAPON_NAME och pakttext');
  ok(Cards.fuse(pid) === null && Cards.refine(pid) === null && Cards.sellPrice(pid, 3) === 0, pid + ': kan inte smältas, förädlas eller säljas');
  V8_ART.push(pid);
  const ups = ALL.filter(c => c.weapon === w);
  ok(ups.length === 4 && JSON.stringify(ups.map(c => c.wup).sort()) === JSON.stringify(wups.slice().sort()), w + ': uppgraderingar ' + ups.map(c => c.wup).join(','));
  ok(ups.some(u => u.rarity === 'legendarisk') && ups.some(u => u.rarity === 'ovanlig'), w + ': uppgraderingar av olika sällsynthet');
  for (const u of ups) {
    V8_ART.push(u.id);
    ok(u.max === 1 && Object.keys(u.mods).length === 0 && Cards.tag(u) === wname && Cards.refine(u.id) === null && Cards.fuse(u.id) === null, u.id + ': uppgradering');
    ok(u.name === u.name.toUpperCase() && u.text === u.text.toUpperCase() && !u.set && !OLDER.has(u.name), u.id + ': versaler, inget set, nytt namn');
    ok(Cards.sellPrice(u, 2) === 0 && !Cards.canSell(u), u.id + ': kan inte säljas');
  }
  const rng = makeRng(37); let hit = 0;
  for (let i = 0; i < 300; i++) for (const c of Cards.draw(rng, 4, { pact: w, unlocked: unlockedAll })) { ok(!c.pact && (!c.weapon || c.weapon === w), 'draw med pakt ' + w + ' gav ' + c.id); if (c.weapon === w) hit++; }
  ok(hit > 50, w + ': uppgraderingarna ska dras ofta efter pakten (' + hit + ')');
  const rng2 = makeRng(39);
  for (let i = 0; i < 200; i++) for (const c of Cards.draw(rng2, 4, { unlocked: unlockedAll })) ok(c.weapon !== w, 'uppgradering ' + c.id + ' utan pakt');
}
ok(new Set(ALL.filter(c => c.wup).map(c => c.wup)).size === ALL.filter(c => c.wup).length, 'alla wup är unika');
{ // pakterna dras utan pakt men aldrig en andra; pakter sammanlagt ungefär lika ofta som förut
  const rng = makeRng(41), hit = new Set(); let pacts = 0, tot = 0;
  for (let i = 0; i < 4000; i++) for (const c of Cards.draw(rng, 3, { unlocked: unlockedAll })) { tot++; if (c.pact) { pacts++; hit.add(c.id); } }
  ok(['pakt_harpun', 'pakt_bumerang', 'pakt_prisma'].every(id => hit.has(id)), 'nya pakter dras');
  ok(pacts / tot > 0.01 && pacts / tot < 0.04, 'andel pakter (sjutton pakter med vikt 0,82 gav samma) ' + (pacts / tot).toFixed(3));
}
// bilder: 96x96, unika (bland alla kort), ASCII-filnamn och byggda i tools/card-art/make.py
{
  const byHash = new Map();
  for (const c of ALL) { const f = path.join(root, c.icon); if (fs.existsSync(f)) { const h = md5(f); if (!byHash.has(h)) byHash.set(h, []); byHash.get(h).push(c.id); } }
  const src = fs.readFileSync(path.join(root, 'tools/card-art/make.py'), 'utf8');
  for (const id of V8_ART) {
    const c = Cards.byId(id), f = path.join(root, c.icon);
    ok(/^assets\/cards\/[a-z0-9_]+\.png$/.test(c.icon), id + ': bildens filnamn ska vara ASCII: ' + c.icon);
    ok(fs.existsSync(f), id + ': bild saknas');
    if (!fs.existsSync(f)) continue;
    const b = fs.readFileSync(f);
    ok(b.readUInt32BE(16) === 96 && b.readUInt32BE(20) === 96, id + ': bilden ska vara 96x96');
    ok(byHash.get(md5(f)).length === 1, id + ': samma bild som ' + byHash.get(md5(f)).join(','));
    ok(src.includes("'" + id + "'"), id + ': bilden ska byggas i tools/card-art/make.py');
  }
  ok(V8_ART.length === 39, '39 nya bilder');
  ok(/def draw_harpoon\(/.test(src) && /def draw_boomerang\(/.test(src) && /def draw_prism\(/.test(src), 'vapnen ritas som siluetter i make.py');
  ok(/'harpoon': draw_harpoon/.test(src) && /'boomerang': draw_boomerang/.test(src) && /'prism': draw_prism/.test(src), 'siluetterna finns i GUNS');
}
// set: DJUPETS VÄG och PRISMANS VÄG
for (const [sid, name, need] of [['djupet', 'DJUPETS VÄG', ['swimSpeed', 'airMax', 'waterDmg']], ['prisman', 'PRISMANS VÄG', ['crystalDmg', 'refract']]]) {
  const members = ALL.filter(c => c.set === sid);
  ok(SETS[sid] && SETS[sid].name === name && members.length >= 4 && members.length <= 6, sid + ': ' + members.length + ' kort');
  ok(need.every(k => k in SETS[sid].mods), sid + ': bonusen ska handla om ' + need.join(', '));
  ok(members.every(c => V8_IDS.includes(c.id)), sid + ': bara nya kort');
  ok(members.some(c => c.rarity === 'vanlig') && members.some(c => c.rarity !== 'vanlig'), sid + ': olika sällsynthet');
  for (const k in SETS[sid].mods) ok(SETS[sid].text.includes(String(Math.round(SETS[sid].mods[k] * (Cards.modLines({ [k]: SETS[sid].mods[k] })[0].text.includes('%') ? 100 : 1)))), sid + ': settexten nämner ' + k);
  const three = members.slice(-3).map(c => c.id), m3 = Cards.computeMods(three), raw = {};
  for (const id of three) for (const k in Cards.byId(id).mods) raw[k] = (raw[k] || 0) + Cards.byId(id).mods[k];
  for (const k in SETS[sid].mods) ok(Math.abs(m3[k] - (raw[k] || 0) - SETS[sid].mods[k]) < 1e-6, sid + ': setbonus ' + k);
  ok(Cards.setProgress(three).find(x => x.id === sid).active, sid + ': setProgress aktiv');
}
{ // setnamnen ska inte likna de gamla (inget annat set börjar med samma ord)
  const first = n => n.split(' ')[0];
  for (const sid of ['djupet', 'prisman']) ok(Object.keys(SETS).filter(k => k !== sid).every(k => first(SETS[k].name) !== first(SETS[sid].name)), sid + ': setnamnet liknar ett annat');
}
ok(Cards.synergy(Cards.byId('kristallbrytaren'), ['roda_skarvan', 'skarvlinsen']) === 'FULLBORDAR PRISMANS VÄG', 'synergy fullbordar prisman: ' + Cards.synergy(Cards.byId('kristallbrytaren'), ['roda_skarvan', 'skarvlinsen']));
ok(Cards.synergy(Cards.byId('krakens_vrede'), ['tidvattenstenen']) === 'DJUPETS VÄG 2/3', 'synergy djupet 2/3');
ok(Cards.synergy(Cards.byId('siarens_oga'), ['lardomens_ljus']).includes('KUNSKAP') && Cards.synergy(Cards.byId('haxjagaren'), ['farjkarlens_obol']).includes('AVGRUNDEN'), 'nya syn-taggar');
ok(Cards.describe(Cards.byId('glashjartat')).includes('SET: PRISMANS VÄG'), 'describe nämner PRISMANS VÄG');
// CardUI.talents finns och följer kontraktet (gränssnittet provas i webbläsaren med Playwright)
{
  const ui = fs.readFileSync(path.join(root, 'js/cardui.js'), 'utf8'), css = fs.readFileSync(path.join(root, 'css/cards.css'), 'utf8');
  ok(/function talents\(opts, onPick\)/.test(ui) && /Object\.assign\(api, \{[^}]*\btalents\b/.test(ui), 'CardUI.talents finns');
  ok(/krigare: \{ label: 'KRIGAREN'/.test(ui) && /skugga: \{ label: 'SKUGGAN'/.test(ui) && /mystiker: \{ label: 'MYSTIKERN'/.test(ui), 'tre grenar');
  ok(/'assets\/gfx\/talents\/' \+ t\.id \+ '\.png'/.test(ui) && /addEventListener\('error'/.test(ui), 'talangikon med reservritning');
  ok(/KeyT/.test(ui) && /VISA TRÄDET/.test(ui) && /RANG /.test(ui), 'trädet och rang');
  ok(/\.cu-tcard/.test(css) && /\.cu-ttree/.test(css), 'css för talangvalet');
  const demo = fs.readFileSync(path.join(root, 'tools/cards-demo.html'), 'utf8');
  for (const a of ['talents8', 'pact8', 'draft8', 'codex8']) ok(demo.includes("auto === '" + a + "'"), 'demo ?auto=' + a);
}
console.log('Version 8: ' + V8.length + ' kort ' + JSON.stringify(v8Rar) + ', pakter ' + Object.values(PACTS8).map(x => x[0]).join(' ') + ', set ' + ['djupet', 'prisman'].map(k => k + '(' + ALL.filter(c => c.set === k).map(c => c.id).join(',') + ')').join(' '));
// ---------- version 9: pakter för sågbladskastaren, vindbössan och spjutet, 24 nya kort (urverk, tid, vind, storm och höjd), två set ----------
const V9_KEYS = { timeResist: 'p', windResist: 'p', fallSafe: 'p', lightningResist: 'p', pushDmg: 'p', gearFind: 'p', clockSlow: 'p', skyGold: 'p', rewindHeal: 'n' };
for (const k in V9_KEYS) {
  ok(keys.includes(k) && /[a-zåäö]{4}/i.test(MOD_KEYS[k]), 'version 9-nyckel saknas eller saknar beskrivning: ' + k);
  const l = Cards.modLines({ [k]: V9_KEYS[k] === 'p' ? 0.1 : 1 });
  ok(l.length === 1 && l[0].good && l[0].text === l[0].text.toUpperCase() && /\d/.test(l[0].text) && (V9_KEYS[k] === 'p') === / % /.test(l[0].text), k + ': modLines ' + JSON.stringify(l));
  ok(Cards.modLabel(k) !== k.toUpperCase() && Cards.modLabel(k) === Cards.modLabel(k).toUpperCase(), k + ': svensk etikett ' + Cards.modLabel(k));
  ok(Cards.fmtVal(k, V9_KEYS[k] === 'p' ? 0.25 : 2) === (V9_KEYS[k] === 'p' ? '25 %' : '2'), k + ': fmtVal');
  ok(Cards.modLines({ [k]: -1 })[0].good === false, k + ': negativt värde är en nackdel');
}
ok(new Set(Object.keys(V9_KEYS).map(Cards.modLabel)).size === 9 && Object.keys(V9_KEYS).every(k => !keys.filter(x => !(x in V9_KEYS)).some(x => Cards.modLabel(x) === Cards.modLabel(k))), 'version 9-nycklarna har egna etiketter');
ok(/tidsbubb/i.test(MOD_KEYS.timeResist) && /knuff/i.test(MOD_KEYS.windResist) && /fallskada/i.test(MOD_KEYS.fallSafe) && /blixt/i.test(MOD_KEYS.lightningResist) && /vägg/i.test(MOD_KEYS.pushDmg)
  && /kugghjul/i.test(MOD_KEYS.gearFind) && /saktas in/i.test(MOD_KEYS.clockSlow) && /Molnborgen/.test(MOD_KEYS.skyGold) && /urverkssoldat/i.test(MOD_KEYS.rewindHeal), 'version 9-beskrivningar');
ok(!('airControl' in MOD_KEYS) && /dubbelhopp/i.test(MOD_KEYS.doubleJump), 'extra hopp i luften är den gamla doubleJump (ingen airControl)');
const V9_IDS = ['kuggfickan', 'sandglaset', 'vindflojeln', 'fjaderfallet', 'askledaren', 'vaggsmallen', 'stoppuret', 'molnmyntet', 'urnyckeln', 'klattrarrepet',
  'massingsringen', 'pendelvikten', 'stormhuvan', 'tryckvagen', 'svalvingarna', 'guldmolnet', 'trasiga_klockan',
  'askfangaren', 'tidsvaktarens_sigill', 'virvelstenen', 'himlastegen', 'stormens_skuld', 'urmakarens_hjarta', 'stormfagelns_fjader'];
ok(V9_IDS.length === 24 && new Set(V9_IDS).size === 24, '24 unika version 9-id');
const V9 = V9_IDS.map(id => Cards.byId(id)).filter(Boolean);
ok(V9.length === 24, 'version 9-kort saknas: ' + V9_IDS.filter(id => !Cards.byId(id)).join(','));
const v9Rar = {};
const OLDER9 = new Set(ALL.filter(c => !V9_IDS.includes(c.id) && !['sawlauncher', 'windgun', 'spear'].includes(c.pact || c.weapon)).map(c => c.name));
for (const c of V9) {
  v9Rar[c.rarity] = (v9Rar[c.rarity] || 0) + 1;
  ok(!c.pact && !c.weapon && !c.active && !V8_IDS.includes(c.id) && !V7_IDS.includes(c.id) && !N6_IDS.includes(c.id) && !V5_IDS.includes(c.id) && !NEW_IDS.includes(c.id), c.id + ': nytt vanligt kort');
  ok(c.name === c.name.toUpperCase() && c.text === c.text.toUpperCase() && /\d/.test(c.text), c.id + ': versaler och tal i texten');
  ok(!OLDER9.has(c.name), c.id + ': namnet ' + c.name + ' finns redan');
  ok(Cards.modLines(c).length === Object.keys(c.mods).length && c.text.split('\n').length >= Object.keys(c.mods).length, c.id + ': texten ska nämna alla effekter');
  for (const k in c.mods) {
    const v = c.mods[k], f2 = Cards.modLines({ [k]: v })[0];
    if (/\d/.test(f2.text)) ok(c.text.includes(String(Math.round(Math.abs(v) * (/%/.test(f2.text) ? 100 : 1)))), c.id + ': texten ska ha talet för ' + k);
  }
  ok(Object.keys(c.mods).some(k => k in V9_KEYS), c.id + ': använder en ny nyckel');
  if (c.curse) ok(c.bad === 1 && Cards.sellPrice(c, 2) === 0 && Object.values(c.mods).some(v => v < 0) && / % /.test(c.text.split('\n').pop()), c.id + ': förbannat, nackdelen på sista raden');
  else ok(Cards.sellPrice(c, 2) > 0 && Object.values(c.mods).every(v => v > 0), c.id + ': kan säljas, bara fördelar');
  ok(Cards.describe(c).includes(c.name), c.id + ': describe');
  ok(c.max <= 4 && (c.max === 1 || Cards.fuse(c.id) === c.id + '+'), c.id + ': max och sammansmältning');
  ok(c.syn && c.syn.some(t => ['urverk', 'tid', 'vind', 'storm', 'hojd'].includes(t)), c.id + ': har en ny synergitagg');
  ok(c.text.split('\n').every(l => l.length <= 27), c.id + ': raderna ska vara högst 27 tecken');
}
ok(v9Rar.vanlig === 10 && v9Rar.ovanlig === 7 && v9Rar.sallsynt === 5 && v9Rar.legendarisk === 2, 'version 9 per sällsynthet ' + JSON.stringify(v9Rar));
ok(V9.filter(c => c.curse).length === 2, '2 förbannade version 9-kort');
ok(Object.keys(V9_KEYS).every(k => V9.filter(c => k in c.mods).length >= 2), 'varje ny nyckel ska användas av minst två nya kort: ' + Object.keys(V9_KEYS).filter(k => V9.filter(c => k in c.mods).length < 2).join(','));
ok(V9.filter(c => 'doubleJump' in c.mods).length >= 2, 'höjdkorten ger dubbelhopp med den gamla nyckeln');
ok(V9.filter(c => c.unlock).length >= 6 && V9.every(c => !c.unlock || (c.unlock >= 10 && c.unlock <= 60)), 'version 9: några kort låses upp med själar');
ok(Cards.byId('sandglaset+').text === 'TIDSBUBBLOR SAKTAR IN\nDIG 32 % MINDRE' && Cards.byId('sandglaset+').mods.timeResist === 0.32, 'sammansmält sandglas: ' + JSON.stringify(Cards.byId('sandglaset+').text));
ok(Cards.byId('urnyckeln+').mods.rewindHeal === 6 && Cards.byId('urnyckeln+').text === '+6 HP NÄR DU DÖDAR\nEN URVERKSSOLDAT', 'sammansmält urnyckel: ' + Cards.byId('urnyckeln+').text);
ok(Cards.byId('klattrarrepet+').text === '24 % MINDRE FALLSKADA\n16 % MINDRE KNUFF\nFRÅN VIND', 'sammansmält klätterrep: ' + JSON.stringify(Cards.byId('klattrarrepet+').text));
ok(Cards.byId('trasiga_klockan+') === null && Cards.refine('stormens_skuld') === null && Cards.byId('svalvingarna+') === null, 'kort med max 1 kan inte smältas');
{ const m9 = Cards.computeMods(['kuggfickan', 'kuggfickan', 'trasiga_klockan', 'stormens_skuld', 'svalvingarna']);
  ok(Math.abs(m9.gearFind - 0.6) < 1e-9 && m9.timeResist === -0.3 && m9.lightningResist === -0.3 && m9.skyGold === 0.5 && m9.rewindHeal === 3 && m9.doubleJump === 1, 'computeMods med version 9-nycklar ' + JSON.stringify([m9.gearFind, m9.timeResist, m9.lightningResist, m9.skyGold, m9.rewindHeal, m9.doubleJump])); }
{ // nya kort dras (alla upplåsta) och låsta dras inte
  const rng = makeRng(909), hit = new Set();
  for (let i = 0; i < 4000; i++) for (const c of Cards.draw(rng, 3, { unlocked: unlockedAll, depth: i % 6 })) hit.add(c.id);
  ok(V9_IDS.every(id => hit.has(id)), 'alla version 9-kort ska kunna dras: saknas ' + V9_IDS.filter(id => !hit.has(id)).join(','));
  const rng2 = makeRng(910);
  for (let i = 0; i < 1000; i++) for (const c of Cards.draw(rng2, 3, {})) ok(!c.unlock || !V9_IDS.includes(c.id), 'låst version 9-kort dragen ' + c.id);
}
// pakter och uppgraderingar
const PACTS9 = {
  sawlauncher: ['pakt_sagblad', ['sw_multi', 'sw_bounce', 'sw_bleed', 'sw_return'], 'ALL AMMO BLIR KUGGHJUL', 'SÅGBLAD'],
  windgun: ['pakt_vindbossa', ['wg_cyclone', 'wg_slam', 'wg_cold', 'wg_wide'], 'INGEN AMMO: LADDAS AV SIG SJÄLV', 'VINDBÖSSA'],
  spear: ['pakt_spjut', ['sp_pierce', 'sp_recall', 'sp_lunge', 'sp_storm'], 'SPJUTET BEHÖVER INGEN AMMO', 'SPJUT'],
};
const V9_ART = V9_IDS.slice();
for (const w in PACTS9) {
  const [pid, wups, ammo, wname] = PACTS9[w], p = Cards.byId(pid);
  ok(p && p.pact === w && p.rarity === 'sallsynt' && p.max === 1 && p.mods.dmg === 0.15 && p.bad === 1 && p.text.includes(ammo), pid + ': pakt för ' + w);
  ok(Cards.WEAPON_NAME[w] === wname && p && p.text.includes('BARA ' + wname + ' RESTEN AV RUNDAN') && Cards.tag(p) === 'PAKT' && !OLDER9.has(p.name), w + ': WEAPON_NAME och pakttext');
  ok(Cards.fuse(pid) === null && Cards.refine(pid) === null && Cards.sellPrice(pid, 3) === 0, pid + ': kan inte smältas, förädlas eller säljas');
  V9_ART.push(pid);
  const ups = ALL.filter(c => c.weapon === w);
  ok(ups.length === 4 && JSON.stringify(ups.map(c => c.wup).sort()) === JSON.stringify(wups.slice().sort()), w + ': uppgraderingar ' + ups.map(c => c.wup).join(','));
  ok(ups.some(u => u.rarity === 'legendarisk') && ups.some(u => u.rarity === 'ovanlig'), w + ': uppgraderingar av olika sällsynthet');
  for (const u of ups) {
    V9_ART.push(u.id);
    ok(u.max === 1 && Object.keys(u.mods).length === 0 && Cards.tag(u) === wname && Cards.refine(u.id) === null && Cards.fuse(u.id) === null, u.id + ': uppgradering');
    ok(u.name === u.name.toUpperCase() && u.text === u.text.toUpperCase() && !u.set && !OLDER9.has(u.name), u.id + ': versaler, inget set, nytt namn');
    ok(Cards.sellPrice(u, 2) === 0 && !Cards.canSell(u), u.id + ': kan inte säljas');
  }
  const rng = makeRng(43); let hit = 0;
  for (let i = 0; i < 300; i++) for (const c of Cards.draw(rng, 4, { pact: w, unlocked: unlockedAll })) { ok(!c.pact && (!c.weapon || c.weapon === w), 'draw med pakt ' + w + ' gav ' + c.id); if (c.weapon === w) hit++; }
  ok(hit > 50, w + ': uppgraderingarna ska dras ofta efter pakten (' + hit + ')');
  const rng2 = makeRng(45);
  for (let i = 0; i < 200; i++) for (const c of Cards.draw(rng2, 4, { unlocked: unlockedAll })) ok(c.weapon !== w, 'uppgradering ' + c.id + ' utan pakt');
}
ok(/kugghjul/i.test(Cards.byId('pakt_sagblad').text) && /INGEN AMMO/.test(Cards.byId('pakt_vindbossa').text) && /INGEN AMMO/.test(Cards.byId('pakt_spjut').text), 'ammotexterna: kugghjul, ingen, ingen');
ok(new Set(ALL.filter(c => c.wup).map(c => c.wup)).size === ALL.filter(c => c.wup).length, 'alla wup är unika');
{ // pakterna dras utan pakt men aldrig en andra; pakter sammanlagt ungefär lika ofta som förut
  const rng = makeRng(47), hit = new Set(); let pacts = 0, tot = 0;
  for (let i = 0; i < 4000; i++) for (const c of Cards.draw(rng, 3, { unlocked: unlockedAll })) { tot++; if (c.pact) { pacts++; hit.add(c.id); } }
  ok(['pakt_sagblad', 'pakt_vindbossa', 'pakt_spjut'].every(id => hit.has(id)), 'nya pakter dras');
  ok(pacts / tot > 0.01 && pacts / tot < 0.04, 'andel pakter ' + (pacts / tot).toFixed(3));
}
// bilder: 96x96, unika (bland alla kort, även nästan lika bilder), ASCII-filnamn och byggda i tools/card-art/make.py
{
  const byHash = new Map();
  for (const c of ALL) { const f = path.join(root, c.icon); if (fs.existsSync(f)) { const h = md5(f); if (!byHash.has(h)) byHash.set(h, []); byHash.get(h).push(c.id); } }
  const src = fs.readFileSync(path.join(root, 'tools/card-art/make.py'), 'utf8');
  for (const id of V9_ART) {
    const c = Cards.byId(id), f = path.join(root, c.icon);
    ok(/^assets\/cards\/[a-z0-9_]+\.png$/.test(c.icon), id + ': bildens filnamn ska vara ASCII: ' + c.icon);
    ok(fs.existsSync(f), id + ': bild saknas');
    if (!fs.existsSync(f)) continue;
    const b = fs.readFileSync(f);
    ok(b.readUInt32BE(16) === 96 && b.readUInt32BE(20) === 96, id + ': bilden ska vara 96x96');
    ok(byHash.get(md5(f)).length === 1, id + ': samma bild som ' + byHash.get(md5(f)).join(','));
    ok(src.includes("'" + id + "'"), id + ': bilden ska byggas i tools/card-art/make.py');
  }
  ok(V9_ART.length === 39, '39 nya bilder');
  ok(/def draw_sawlauncher\(/.test(src) && /def draw_windgun\(/.test(src) && /def draw_spear\(/.test(src), 'vapnen ritas som siluetter i make.py');
  ok(/'sawlauncher': draw_sawlauncher/.test(src) && /'windgun': draw_windgun/.test(src) && /'spear': draw_spear/.test(src), 'siluetterna finns i GUNS');
  ok(/def near_dupes\(/.test(src), 'make.py jämför de nya bilderna med alla befintliga kortbilder');
}
// set: URVERKETS VÄG och STORMENS VÄG
for (const [sid, name, need] of [['urverket', 'URVERKETS VÄG', ['gearFind', 'clockSlow', 'rewindHeal']], ['stormen', 'STORMENS VÄG', ['lightningResist', 'windResist', 'pushDmg']]]) {
  const members = ALL.filter(c => c.set === sid);
  ok(SETS[sid] && SETS[sid].name === name && members.length >= 4 && members.length <= 6, sid + ': ' + members.length + ' kort');
  ok(need.every(k => k in SETS[sid].mods), sid + ': bonusen ska handla om ' + need.join(', '));
  ok(members.every(c => V9_IDS.includes(c.id)), sid + ': bara nya kort');
  ok(members.some(c => c.rarity === 'vanlig') && members.some(c => c.rarity !== 'vanlig'), sid + ': olika sällsynthet');
  for (const k in SETS[sid].mods) ok(SETS[sid].text.includes(String(Math.round(SETS[sid].mods[k] * (Cards.modLines({ [k]: SETS[sid].mods[k] })[0].text.includes('%') ? 100 : 1)))), sid + ': settexten nämner ' + k);
  const three = members.slice(-3).map(c => c.id), m3 = Cards.computeMods(three), raw = {};
  for (const id of three) for (const k in Cards.byId(id).mods) raw[k] = (raw[k] || 0) + Cards.byId(id).mods[k];
  for (const k in SETS[sid].mods) ok(Math.abs(m3[k] - (raw[k] || 0) - SETS[sid].mods[k]) < 1e-6, sid + ': setbonus ' + k);
  ok(Cards.setProgress(three).find(x => x.id === sid).active, sid + ': setProgress aktiv');
}
{ // setnamnen ska inte likna de gamla (inget annat set börjar med samma ord, och inget gammalt set har samma första ordstam)
  const first = n => n.split(' ')[0];
  for (const sid of ['urverket', 'stormen']) ok(Object.keys(SETS).filter(k => k !== sid).every(k => first(SETS[k].name) !== first(SETS[sid].name) && first(SETS[k].name).slice(0, 4) !== first(SETS[sid].name).slice(0, 4)), sid + ': setnamnet liknar ett annat');
}
ok(Cards.synergy(Cards.byId('massingsringen'), ['kuggfickan', 'stoppuret']) === 'FULLBORDAR URVERKETS VÄG', 'synergy fullbordar urverket: ' + Cards.synergy(Cards.byId('massingsringen'), ['kuggfickan', 'stoppuret']));
ok(Cards.synergy(Cards.byId('stormhuvan'), ['askledaren']) === 'STORMENS VÄG 2/3', 'synergy stormen 2/3');
ok(Cards.synergy(Cards.byId('sandglaset'), ['tidsvaktarens_sigill']).includes('TIDEN') && Cards.synergy(Cards.byId('fjaderfallet'), ['svalvingarna']).includes('HÖJDEN')
  && Cards.synergy(Cards.byId('vaggsmallen'), ['tryckvagen']).includes('VINDEN') && Cards.synergy(Cards.byId('urnyckeln'), ['trasiga_klockan']).includes('URVERK')
  && Cards.synergy(Cards.byId('stormens_skuld'), ['virvelstenen']).includes('STORMEN'), 'nya syn-taggar');
ok(Cards.describe(Cards.byId('urmakarens_hjarta')).includes('SET: URVERKETS VÄG') && Cards.describe(Cards.byId('stormfagelns_fjader')).includes('SET: STORMENS VÄG'), 'describe nämner de nya seten');
{
  const demo = fs.readFileSync(path.join(root, 'tools/cards-demo.html'), 'utf8');
  for (const a of ['pact9', 'draft9', 'codex9']) ok(demo.includes("auto === '" + a + "'"), 'demo ?auto=' + a);
}
console.log('Version 9: ' + V9.length + ' kort ' + JSON.stringify(v9Rar) + ', pakter ' + Object.values(PACTS9).map(x => x[0]).join(' ') + ', set ' + ['urverket', 'stormen'].map(k => k + '(' + ALL.filter(c => c.set === k).map(c => c.id).join(',') + ')').join(' '));
// ---------- version 11: pakter för sporkastaren, spegelskölden och piskan, 24 nya kort (svamp, sporer, speglar, illusioner och glas), två set ----------
const V11_KEYS = { sporeResist: 'p', bounceHeight: 'p', teleportShield: 'n', reflectDmg: 'p', illusionSight: 'p', mirrorShards: 'p', fungusHeal: 'n', whipReach: 'n' };
for (const k in V11_KEYS) {
  ok(keys.includes(k) && /[a-zåäö]{4}/i.test(MOD_KEYS[k]), 'version 11-nyckel saknas eller saknar beskrivning: ' + k);
  const l = Cards.modLines({ [k]: V11_KEYS[k] === 'p' ? 0.1 : 1 });
  ok(l.length === 1 && l[0].good && l[0].text === l[0].text.toUpperCase() && /\d/.test(l[0].text) && (V11_KEYS[k] === 'p') === / % /.test(l[0].text), k + ': modLines ' + JSON.stringify(l));
  ok(Cards.modLabel(k) !== k.toUpperCase() && Cards.modLabel(k) === Cards.modLabel(k).toUpperCase(), k + ': svensk etikett ' + Cards.modLabel(k));
  ok(Cards.fmtVal(k, V11_KEYS[k] === 'p' ? 0.25 : 2) === (V11_KEYS[k] === 'p' ? '25 %' : '2'), k + ': fmtVal');
  ok(Cards.modLines({ [k]: -1 })[0].good === false, k + ': negativt värde är en nackdel');
}
ok(new Set(Object.keys(V11_KEYS).map(Cards.modLabel)).size === 8 && Object.keys(V11_KEYS).every(k => !keys.filter(x => !(x in V11_KEYS)).some(x => Cards.modLabel(x) === Cards.modLabel(k))), 'version 11-nycklarna har egna etiketter');
ok(/spor/i.test(MOD_KEYS.sporeResist) && /förvirr/i.test(MOD_KEYS.sporeResist) && /studs/i.test(MOD_KEYS.bounceHeight) && /teleport/i.test(MOD_KEYS.teleportShield) && /osårbar/i.test(MOD_KEYS.teleportShield)
  && /studsat/i.test(MOD_KEYS.reflectDmg) && /illusion/i.test(MOD_KEYS.illusionSight) && /skärvor/i.test(MOD_KEYS.mirrorShards) && /svampfiende/i.test(MOD_KEYS.fungusHeal) && /piska/i.test(MOD_KEYS.whipReach), 'version 11-beskrivningar');
const V11_IDS = ['svamphatten', 'studssvampen', 'resestenen', 'polerduken', 'klarsynsdroppen', 'glassplittret', 'svampkorgen', 'myceltraden', 'andningsduken', 'irrblosset',
  'mycelmattan', 'fjaderskivlingen', 'skarvpansaret', 'portvaktarens_ring', 'hyfkedjan', 'maskbrytaren', 'flugsvampen',
  'sporkokongen', 'kalejdoskopet', 'tvillingporten', 'mycelgreppet', 'glaskroppen', 'urmycelet', 'tusenspegeln'];
ok(V11_IDS.length === 24 && new Set(V11_IDS).size === 24, '24 unika version 11-id');
const V11 = V11_IDS.map(id => Cards.byId(id)).filter(Boolean);
ok(V11.length === 24, 'version 11-kort saknas: ' + V11_IDS.filter(id => !Cards.byId(id)).join(','));
const V11_WEAPONS = ['sporelauncher', 'mirrorshield', 'whip'];
const OLDER11 = new Set(ALL.filter(c => !V11_IDS.includes(c.id) && !V11_WEAPONS.includes(c.pact || c.weapon)).map(c => c.name));
const v11Rar = {};
for (const c of V11) {
  v11Rar[c.rarity] = (v11Rar[c.rarity] || 0) + 1;
  ok(!c.pact && !c.weapon && !c.active && !V9_IDS.includes(c.id) && !V8_IDS.includes(c.id) && !V7_IDS.includes(c.id) && !N6_IDS.includes(c.id) && !V5_IDS.includes(c.id) && !NEW_IDS.includes(c.id), c.id + ': nytt vanligt kort');
  ok(c.name === c.name.toUpperCase() && c.text === c.text.toUpperCase() && /\d/.test(c.text), c.id + ': versaler och tal i texten');
  ok(!OLDER11.has(c.name), c.id + ': namnet ' + c.name + ' finns redan');
  ok(Cards.modLines(c).length === Object.keys(c.mods).length && c.text.split('\n').length >= Object.keys(c.mods).length, c.id + ': texten ska nämna alla effekter');
  for (const k in c.mods) {
    const v = c.mods[k], f2 = Cards.modLines({ [k]: v })[0];
    if (/\d/.test(f2.text)) ok(c.text.includes(String(Math.round(Math.abs(v) * (/%/.test(f2.text) ? 100 : 1) * 10) / 10).replace('.', ',')), c.id + ': texten ska ha talet för ' + k);
  }
  ok(Object.keys(c.mods).some(k => k in V11_KEYS), c.id + ': använder en ny nyckel');
  if (c.curse) ok(c.bad === 1 && Cards.sellPrice(c, 2) === 0 && Object.values(c.mods).some(v => v < 0) && / % /.test(c.text.split('\n').pop()), c.id + ': förbannat, nackdelen på sista raden');
  else ok(Cards.sellPrice(c, 2) > 0 && Object.values(c.mods).every(v => v > 0), c.id + ': kan säljas, bara fördelar');
  ok(Cards.describe(c).includes(c.name), c.id + ': describe');
  ok(c.max <= 4 && (c.max === 1 || Cards.fuse(c.id) === c.id + '+'), c.id + ': max och sammansmältning');
  ok(c.syn && c.syn.some(t => ['svamp', 'spor', 'spegel', 'illusion', 'glas'].includes(t)), c.id + ': har en ny synergitagg');
  ok(c.text.split('\n').every(l => l.length <= 27), c.id + ': raderna ska vara högst 27 tecken');
  if (c.max > 1) { const f = Cards.byId(c.id + '+'); ok(f && f.text !== c.text && f.text.split('\n').every(l => l.length <= 27), c.id + '+: ny text ' + (f && JSON.stringify(f.text))); }
}
ok(v11Rar.vanlig === 10 && v11Rar.ovanlig === 7 && v11Rar.sallsynt === 5 && v11Rar.legendarisk === 2, 'version 11 per sällsynthet ' + JSON.stringify(v11Rar));
ok(V11.filter(c => c.curse).length === 2, '2 förbannade version 11-kort');
ok(Object.keys(V11_KEYS).every(k => V11.filter(c => k in c.mods).length >= 2), 'varje ny nyckel ska användas av minst två nya kort: ' + Object.keys(V11_KEYS).filter(k => V11.filter(c => k in c.mods).length < 2).join(','));
ok(V11.filter(c => c.unlock).length >= 6 && V11.every(c => !c.unlock || (c.unlock >= 10 && c.unlock <= 60)), 'version 11: några kort låses upp med själar');
ok(['svamp', 'spor', 'spegel', 'illusion', 'glas'].every(t => Cards.SYN[t] && V11.filter(c => c.syn.includes(t)).length >= 3), 'nya synergitaggar med minst tre kort var');
ok(Cards.byId('svamphatten+').text === '32 % MINDRE EFFEKT\nAV SPORER' && Cards.byId('svamphatten+').mods.sporeResist === 0.32, 'sammansmält svamphatt: ' + JSON.stringify(Cards.byId('svamphatten+').text));
ok(Cards.byId('myceltraden+').mods.whipReach === 2 && Cards.byId('myceltraden+').text === '+2 RUTOR RÄCKVIDD FÖR\nPISKA OCH NÄRSTRID', 'sammansmält mycelträd: ' + JSON.stringify(Cards.byId('myceltraden+').text));
ok(Cards.byId('irrblosset+').text === '16 % CHANS ATT SE IGENOM\nILLUSIONER\n2 S OSÅRBAR EFTER TELEPORT', 'sammansmält irrbloss: ' + JSON.stringify(Cards.byId('irrblosset+').text));
ok(Cards.byId('flugsvampen+') === null && Cards.refine('glaskroppen') === null && Cards.byId('tusenspegeln+') === null, 'kort med max 1 kan inte smältas');
{ const m11 = Cards.computeMods(['svamphatten', 'svamphatten', 'flugsvampen', 'glaskroppen', 'resestenen', 'myceltraden', 'mycelgreppet']);
  ok(Math.abs(m11.sporeResist - 0.1) < 1e-9 && m11.fungusHeal === 6 && m11.bounceHeight === 0.25 && m11.mirrorShards === 0.15 && m11.reflectDmg === 0.3 && m11.healMul === -0.25
    && m11.teleportShield === 1 && m11.whipReach === 3 && m11.meleeDmg === 0.15, 'computeMods med version 11-nycklar ' + JSON.stringify([m11.sporeResist, m11.fungusHeal, m11.bounceHeight, m11.mirrorShards, m11.reflectDmg, m11.teleportShield, m11.whipReach])); }
{ // nya kort dras (alla upplåsta) och låsta dras inte
  const rng = makeRng(1111), hit = new Set();
  for (let i = 0; i < 4000; i++) for (const c of Cards.draw(rng, 3, { unlocked: unlockedAll, depth: i % 6 })) hit.add(c.id);
  ok(V11_IDS.every(id => hit.has(id)), 'alla version 11-kort ska kunna dras: saknas ' + V11_IDS.filter(id => !hit.has(id)).join(','));
  const rng2 = makeRng(1112);
  for (let i = 0; i < 1000; i++) for (const c of Cards.draw(rng2, 3, {})) ok(!c.unlock || !V11_IDS.includes(c.id), 'låst version 11-kort dragen ' + c.id);
}
// pakter och uppgraderingar
const PACTS11 = {
  sporelauncher: ['pakt_sporkastare', ['sl_cloud', 'sl_heal', 'sl_chain', 'sl_fast'], 'ALL AMMO BLIR SPORER', 'SPORKASTARE'],
  mirrorshield: ['pakt_spegelskold', ['ms_reflect', 'ms_bash', 'ms_aura', 'ms_parry'], 'INGEN AMMO', 'SPEGELSKÖLD'],
  whip: ['pakt_piska', ['wh_reach', 'wh_fire', 'wh_multi', 'wh_pull'], 'INGEN AMMO', 'PISKA'],
};
ok(JSON.stringify(Object.keys(PACTS11)) === JSON.stringify(V11_WEAPONS), 'version 11-vapnen');
const V11_ART = V11_IDS.slice();
for (const w in PACTS11) {
  const [pid, wups, ammo, wname] = PACTS11[w], p = Cards.byId(pid);
  ok(p && p.pact === w && p.rarity === 'sallsynt' && p.max === 1 && p.mods.dmg === 0.15 && p.bad === 1 && p.text.includes(ammo), pid + ': pakt för ' + w);
  ok(Cards.WEAPON_NAME[w] === wname && p && p.text.includes('BARA ' + wname + ' RESTEN AV RUNDAN') && Cards.tag(p) === 'PAKT' && !OLDER11.has(p.name), w + ': WEAPON_NAME och pakttext');
  ok(Cards.fuse(pid) === null && Cards.refine(pid) === null && Cards.sellPrice(pid, 3) === 0, pid + ': kan inte smältas, förädlas eller säljas');
  V11_ART.push(pid);
  const ups = ALL.filter(c => c.weapon === w);
  ok(ups.length === 4 && JSON.stringify(ups.map(c => c.wup).sort()) === JSON.stringify(wups.slice().sort()), w + ': uppgraderingar ' + ups.map(c => c.wup).join(','));
  ok(ups.some(u => u.rarity === 'legendarisk') && ups.some(u => u.rarity === 'ovanlig'), w + ': uppgraderingar av olika sällsynthet');
  for (const u of ups) {
    V11_ART.push(u.id);
    ok(u.max === 1 && Object.keys(u.mods).length === 0 && Cards.tag(u) === wname && Cards.refine(u.id) === null && Cards.fuse(u.id) === null, u.id + ': uppgradering');
    ok(u.name === u.name.toUpperCase() && u.text === u.text.toUpperCase() && !u.set && !OLDER11.has(u.name), u.id + ': versaler, inget set, nytt namn');
    ok(Cards.sellPrice(u, 2) === 0 && !Cards.canSell(u), u.id + ': kan inte säljas');
  }
  const rng = makeRng(53); let hit = 0;
  for (let i = 0; i < 300; i++) for (const c of Cards.draw(rng, 4, { pact: w, unlocked: unlockedAll })) { ok(!c.pact && (!c.weapon || c.weapon === w), 'draw med pakt ' + w + ' gav ' + c.id); if (c.weapon === w) hit++; }
  ok(hit > 50, w + ': uppgraderingarna ska dras ofta efter pakten (' + hit + ')');
  const rng2 = makeRng(55);
  for (let i = 0; i < 200; i++) for (const c of Cards.draw(rng2, 4, { unlocked: unlockedAll })) ok(c.weapon !== w, 'uppgradering ' + c.id + ' utan pakt');
}
ok(/SPORER/.test(Cards.byId('pakt_sporkastare').text) && /INGEN AMMO/.test(Cards.byId('pakt_spegelskold').text) && /INGEN AMMO/.test(Cards.byId('pakt_piska').text), 'ammotexterna: sporer, ingen, ingen');
ok(new Set(ALL.filter(c => c.wup).map(c => c.wup)).size === ALL.filter(c => c.wup).length, 'alla wup är unika');
{ // pakterna dras utan pakt men aldrig en andra; pakter sammanlagt ungefär lika ofta som förut
  const rng = makeRng(57), hit = new Set(); let pacts = 0, tot = 0;
  for (let i = 0; i < 4000; i++) for (const c of Cards.draw(rng, 3, { unlocked: unlockedAll })) { tot++; if (c.pact) { pacts++; hit.add(c.id); } }
  ok(['pakt_sporkastare', 'pakt_spegelskold', 'pakt_piska'].every(id => hit.has(id)), 'nya pakter dras');
  ok(pacts / tot > 0.01 && pacts / tot < 0.04, 'andel pakter ' + (pacts / tot).toFixed(3));
}
// bilder: 96x96, unika (bland alla kort), ASCII-filnamn och byggda i tools/card-art/make.py
{
  const byHash = new Map();
  for (const c of ALL) { const f = path.join(root, c.icon); if (fs.existsSync(f)) { const h = md5(f); if (!byHash.has(h)) byHash.set(h, []); byHash.get(h).push(c.id); } }
  const src = fs.readFileSync(path.join(root, 'tools/card-art/make.py'), 'utf8');
  for (const id of V11_ART) {
    const c = Cards.byId(id), f = path.join(root, c.icon);
    ok(/^assets\/cards\/[a-z0-9_]+\.png$/.test(c.icon), id + ': bildens filnamn ska vara ASCII: ' + c.icon);
    ok(fs.existsSync(f), id + ': bild saknas');
    if (!fs.existsSync(f)) continue;
    const b = fs.readFileSync(f);
    ok(b.readUInt32BE(16) === 96 && b.readUInt32BE(20) === 96, id + ': bilden ska vara 96x96');
    ok(byHash.get(md5(f)).length === 1, id + ': samma bild som ' + byHash.get(md5(f)).join(','));
    ok(src.includes("'" + id + "'"), id + ': bilden ska byggas i tools/card-art/make.py');
  }
  ok(V11_ART.length === 39, '39 nya bilder');
  ok(/def draw_sporelauncher\(/.test(src) && /def draw_mirrorshield\(/.test(src) && /def draw_whip\(/.test(src), 'vapnen ritas som siluetter i make.py');
  ok(/'sporelauncher': draw_sporelauncher/.test(src) && /'mirrorshield': draw_mirrorshield/.test(src) && /'whip': draw_whip/.test(src), 'siluetterna finns i GUNS');
  ok(/def main_v11\(/.test(src) && /near_dupes\(list\(V11_SRC\)/.test(src), 'make.py jämför de nya bilderna med alla befintliga kortbilder');
}
// set: MYCELIETS VÄG och SPEGELNS VÄG
for (const [sid, name, need] of [['myceliet', 'MYCELIETS VÄG', ['sporeResist', 'fungusHeal', 'bounceHeight']], ['spegeln', 'SPEGELNS VÄG', ['reflectDmg', 'mirrorShards', 'illusionSight']]]) {
  const members = ALL.filter(c => c.set === sid);
  ok(SETS[sid] && SETS[sid].name === name && members.length >= 4 && members.length <= 6, sid + ': ' + members.length + ' kort');
  ok(need.every(k => k in SETS[sid].mods), sid + ': bonusen ska handla om ' + need.join(', '));
  ok(members.every(c => V11_IDS.includes(c.id)), sid + ': bara nya kort');
  ok(members.some(c => c.rarity === 'vanlig') && members.some(c => c.rarity === 'legendarisk'), sid + ': olika sällsynthet');
  for (const k in SETS[sid].mods) ok(SETS[sid].text.includes(String(Math.round(SETS[sid].mods[k] * (Cards.modLines({ [k]: SETS[sid].mods[k] })[0].text.includes('%') ? 100 : 1)))), sid + ': settexten nämner ' + k);
  const three = members.slice(-3).map(c => c.id), m3 = Cards.computeMods(three), raw = {};
  for (const id of three) for (const k in Cards.byId(id).mods) raw[k] = (raw[k] || 0) + Cards.byId(id).mods[k];
  for (const k in SETS[sid].mods) ok(Math.abs(m3[k] - (raw[k] || 0) - SETS[sid].mods[k]) < 1e-6, sid + ': setbonus ' + k);
  ok(Cards.setProgress(three).find(x => x.id === sid).active, sid + ': setProgress aktiv');
}
{ // setnamnen ska inte likna de gamla
  const first = n => n.split(' ')[0];
  for (const sid of ['myceliet', 'spegeln']) ok(Object.keys(SETS).filter(k => k !== sid).every(k => first(SETS[k].name) !== first(SETS[sid].name) && first(SETS[k].name).slice(0, 4) !== first(SETS[sid].name).slice(0, 4)), sid + ': setnamnet liknar ett annat');
}
ok(Cards.synergy(Cards.byId('mycelmattan'), ['svamphatten', 'svampkorgen']) === 'FULLBORDAR MYCELIETS VÄG', 'synergy fullbordar myceliet: ' + Cards.synergy(Cards.byId('mycelmattan'), ['svamphatten', 'svampkorgen']));
ok(Cards.synergy(Cards.byId('kalejdoskopet'), ['polerduken']) === 'SPEGELNS VÄG 2/3', 'synergy spegeln 2/3');
ok(Cards.synergy(Cards.byId('studssvampen'), ['fjaderskivlingen']).includes('SVAMPAR') && Cards.synergy(Cards.byId('sporkokongen'), ['andningsduken']).includes('SPORER')
  && Cards.synergy(Cards.byId('resestenen'), ['portvaktarens_ring']).includes('SPEGLAR') && Cards.synergy(Cards.byId('irrblosset'), ['tvillingporten']).includes('ILLUSIONER')
  && Cards.synergy(Cards.byId('glassplittret'), ['glaskroppen']).includes('GLAS'), 'nya syn-taggar');
ok(Cards.describe(Cards.byId('urmycelet')).includes('SET: MYCELIETS VÄG') && Cards.describe(Cards.byId('tusenspegeln')).includes('SET: SPEGELNS VÄG'), 'describe nämner de nya seten');
{
  const demo = fs.readFileSync(path.join(root, 'tools/cards-demo.html'), 'utf8');
  for (const a of ['pact11', 'draft11', 'codex11']) ok(demo.includes("auto === '" + a + "'"), 'demo ?auto=' + a);
}
console.log('Version 11: ' + V11.length + ' kort ' + JSON.stringify(v11Rar) + ', pakter ' + Object.values(PACTS11).map(x => x[0]).join(' ') + ', set ' + ['myceliet', 'spegeln'].map(k => k + '(' + ALL.filter(c => c.set === k).map(c => c.id).join(',') + ')').join(' '));
// ---------- version 13: pakter för runboken och ångkanonen, 24 nya kort (böcker, bläck, runor, ånga, smide och metall), två set ----------
const V13_KEYS = { inkResist: 'p', beltSpeed: 'p', ventResist: 'p', runeDmg: 'p', steamDmg: 'p', bookLore: 'n', forgeArmor: 'n', pressResist: 'p' };
for (const k in V13_KEYS) {
  ok(keys.includes(k) && /[a-zåäö]{4}/i.test(MOD_KEYS[k]), 'version 13-nyckel saknas eller saknar beskrivning: ' + k);
  const l = Cards.modLines({ [k]: V13_KEYS[k] === 'p' ? 0.1 : 1 });
  ok(l.length === 1 && l[0].good && l[0].text === l[0].text.toUpperCase() && /\d/.test(l[0].text) && (V13_KEYS[k] === 'p') === / % /.test(l[0].text), k + ': modLines ' + JSON.stringify(l));
  ok(Cards.modLabel(k) !== k.toUpperCase() && Cards.modLabel(k) === Cards.modLabel(k).toUpperCase(), k + ': svensk etikett ' + Cards.modLabel(k));
  ok(Cards.fmtVal(k, V13_KEYS[k] === 'p' ? 0.25 : 2) === (V13_KEYS[k] === 'p' ? '25 %' : '2'), k + ': fmtVal');
  ok(Cards.modLines({ [k]: -1 })[0].good === false, k + ': negativt värde är en nackdel');
}
ok(new Set(Object.keys(V13_KEYS).map(Cards.modLabel)).size === 8 && Object.keys(V13_KEYS).every(k => !keys.filter(x => !(x in V13_KEYS)).some(x => Cards.modLabel(x) === Cards.modLabel(k))), 'version 13-nycklarna har egna etiketter');
ok(/bläck/i.test(MOD_KEYS.inkResist) && /rullband/i.test(MOD_KEYS.beltSpeed) && /rätt håll/i.test(MOD_KEYS.beltSpeed) && /ångventil/i.test(MOD_KEYS.ventResist) && /run/i.test(MOD_KEYS.runeDmg)
  && /ånga/i.test(MOD_KEYS.steamDmg) && /pulpet/i.test(MOD_KEYS.bookLore) && /platt/i.test(MOD_KEYS.bookLore) && /gjuterifiende/i.test(MOD_KEYS.forgeArmor) && /stansar/i.test(MOD_KEYS.pressResist), 'version 13-beskrivningar');
const V13_IDS = ['blackhornet', 'runpennan', 'ventilnyckeln', 'kopparmunstycket', 'bokmarket', 'smidestangen', 'gjutarstovlarna', 'nithandsken', 'lasglaset', 'angvisslan',
  'runstampeln', 'anggallret', 'stalforkladet', 'assjans_klinga', 'kopistens_lupp', 'kilremmen', 'svartblacket',
  'eldskriften', 'angpannan', 'jattens_stad', 'gjutarspaken', 'smalthjartat', 'forbjudna_folianten', 'kolossens_hjarta'];
ok(V13_IDS.length === 24 && new Set(V13_IDS).size === 24, '24 unika version 13-id');
const V13 = V13_IDS.map(id => Cards.byId(id)).filter(Boolean);
ok(V13.length === 24, 'version 13-kort saknas: ' + V13_IDS.filter(id => !Cards.byId(id)).join(','));
const V13_WEAPONS = ['runebook', 'steamcannon'];
const OLDER13 = new Set(ALL.filter(c => !V13_IDS.includes(c.id) && !V13_WEAPONS.includes(c.pact || c.weapon)).map(c => c.name));
const v13Rar = {};
for (const c of V13) {
  v13Rar[c.rarity] = (v13Rar[c.rarity] || 0) + 1;
  ok(!c.pact && !c.weapon && !c.active && !V11_IDS.includes(c.id) && !V9_IDS.includes(c.id) && !V8_IDS.includes(c.id) && !V7_IDS.includes(c.id) && !N6_IDS.includes(c.id) && !V5_IDS.includes(c.id) && !NEW_IDS.includes(c.id), c.id + ': nytt vanligt kort');
  ok(c.name === c.name.toUpperCase() && c.text === c.text.toUpperCase() && /\d/.test(c.text), c.id + ': versaler och tal i texten');
  ok(!OLDER13.has(c.name), c.id + ': namnet ' + c.name + ' finns redan');
  ok(Cards.modLines(c).length === Object.keys(c.mods).length && c.text.split('\n').length >= Object.keys(c.mods).length, c.id + ': texten ska nämna alla effekter');
  for (const k in c.mods) {
    const v = c.mods[k], f2 = Cards.modLines({ [k]: v })[0];
    if (/\d/.test(f2.text)) ok(c.text.includes(String(Math.round(Math.abs(v) * (/%/.test(f2.text) ? 100 : 1) * 10) / 10).replace('.', ',')), c.id + ': texten ska ha talet för ' + k);
  }
  ok(Object.keys(c.mods).some(k => k in V13_KEYS), c.id + ': använder en ny nyckel');
  if (c.curse) ok(c.bad === 1 && Cards.sellPrice(c, 2) === 0 && Object.values(c.mods).some(v => v < 0) && / % /.test(c.text.split('\n').pop()), c.id + ': förbannat, nackdelen på sista raden');
  else ok(Cards.sellPrice(c, 2) > 0 && Object.values(c.mods).every(v => v > 0), c.id + ': kan säljas, bara fördelar');
  ok(Cards.describe(c).includes(c.name), c.id + ': describe');
  ok(c.max <= 4 && (c.max === 1 || Cards.fuse(c.id) === c.id + '+'), c.id + ': max och sammansmältning');
  ok(c.syn && c.syn.some(t => ['bok', 'black', 'anga', 'smide', 'metall'].includes(t)), c.id + ': har en ny synergitagg');
  ok(c.text.split('\n').every(l => l.length <= 27), c.id + ': raderna ska vara högst 27 tecken');
  if (c.max > 1) { const f = Cards.byId(c.id + '+'); ok(f && f.text !== c.text && f.text.split('\n').every(l => l.length <= 27), c.id + '+: ny text ' + (f && JSON.stringify(f.text))); }
}
ok(v13Rar.vanlig === 10 && v13Rar.ovanlig === 7 && v13Rar.sallsynt === 5 && v13Rar.legendarisk === 2, 'version 13 per sällsynthet ' + JSON.stringify(v13Rar));
ok(V13.filter(c => c.curse).length === 2, '2 förbannade version 13-kort');
ok(Object.keys(V13_KEYS).every(k => V13.filter(c => k in c.mods).length >= 2), 'varje ny nyckel ska användas av minst två nya kort: ' + Object.keys(V13_KEYS).filter(k => V13.filter(c => k in c.mods).length < 2).join(','));
ok(V13.filter(c => c.unlock).length >= 6 && V13.every(c => !c.unlock || (c.unlock >= 10 && c.unlock <= 60)), 'version 13: några kort låses upp med själar');
ok(['bok', 'black', 'anga', 'smide', 'metall'].every(t => Cards.SYN[t] && V13.filter(c => c.syn.includes(t)).length >= 3), 'nya synergitaggar med minst tre kort var');
ok(V13.filter(c => c.syn.includes('runa')).length >= 3, 'runkorten har den gamla runtaggen');
ok(Cards.byId('blackhornet+').text === '32 % MINDRE EFFEKT\nAV BLÄCK' && Cards.byId('blackhornet+').mods.inkResist === 0.32, 'sammansmält bläckhorn: ' + JSON.stringify(Cards.byId('blackhornet+').text));
ok(Cards.byId('smidestangen+').mods.forgeArmor === 3 && Cards.byId('smidestangen+').text === '+3 RUSTNING PER DÖDAD\nGJUTERIFIENDE', 'sammansmält smidestång: ' + JSON.stringify(Cards.byId('smidestangen+').text));
ok(Cards.byId('lasglaset+').text === '+2 EXTRA PULPETEFFEKT\n16 % MINDRE EFFEKT\nAV BLÄCK' && Cards.byId('lasglaset+').mods.bookLore === 2, 'sammansmält läsglas: ' + JSON.stringify(Cards.byId('lasglaset+').text));
ok(Cards.byId('svartblacket+') === null && Cards.refine('smalthjartat') === null && Cards.byId('kolossens_hjarta+') === null, 'kort med max 1 kan inte smältas');
{ const m13 = Cards.computeMods(['blackhornet', 'blackhornet', 'svartblacket', 'smalthjartat', 'angvisslan', 'bokmarket', 'kopistens_lupp', 'gjutarstovlarna', 'nithandsken']);
  ok(Math.abs(m13.inkResist - 0.1) < 1e-9 && m13.runeDmg === 0.3 && m13.forgeArmor === 5 && m13.steamDmg === 0.33 && Math.abs(m13.ventResist + 0.25) < 1e-9
    && m13.bookLore === 3 && m13.beltSpeed === 0.2 && m13.pressResist === 0.2 && m13.critChance === 0.05, 'computeMods med version 13-nycklar ' + JSON.stringify([m13.inkResist, m13.runeDmg, m13.forgeArmor, m13.steamDmg, m13.ventResist, m13.bookLore, m13.beltSpeed, m13.pressResist])); }
{ // nya kort dras (alla upplåsta) och låsta dras inte
  const rng = makeRng(1313), hit = new Set();
  for (let i = 0; i < 4000; i++) for (const c of Cards.draw(rng, 3, { unlocked: unlockedAll, depth: i % 6 })) hit.add(c.id);
  ok(V13_IDS.every(id => hit.has(id)), 'alla version 13-kort ska kunna dras: saknas ' + V13_IDS.filter(id => !hit.has(id)).join(','));
  const rng2 = makeRng(1314);
  for (let i = 0; i < 1000; i++) for (const c of Cards.draw(rng2, 3, {})) ok(!c.unlock || !V13_IDS.includes(c.id), 'låst version 13-kort dragen ' + c.id);
}
// pakter och uppgraderingar
const PACTS13 = {
  runebook: ['pakt_runbok', ['rb_split', 'rb_seek', 'rb_ward', 'rb_ink'], 'ALL AMMO BLIR BLÄCK', 'RUNBOK'],
  steamcannon: ['pakt_angkanon', ['sc_range', 'sc_scald', 'sc_push', 'sc_fast'], 'ALL AMMO BLIR BRÄNSLE', 'ÅNGKANON'],
};
ok(JSON.stringify(Object.keys(PACTS13)) === JSON.stringify(V13_WEAPONS), 'version 13-vapnen');
const V13_ART = V13_IDS.slice();
for (const w in PACTS13) {
  const [pid, wups, ammo, wname] = PACTS13[w], p = Cards.byId(pid);
  ok(p && p.pact === w && p.rarity === 'sallsynt' && p.max === 1 && p.mods.dmg === 0.15 && p.bad === 1 && p.text.includes(ammo), pid + ': pakt för ' + w);
  ok(Cards.WEAPON_NAME[w] === wname && p && p.text.includes('BARA ' + wname + ' RESTEN AV RUNDAN') && Cards.tag(p) === 'PAKT' && !OLDER13.has(p.name), w + ': WEAPON_NAME och pakttext');
  ok(Cards.fuse(pid) === null && Cards.refine(pid) === null && Cards.sellPrice(pid, 3) === 0, pid + ': kan inte smältas, förädlas eller säljas');
  V13_ART.push(pid);
  const ups = ALL.filter(c => c.weapon === w);
  ok(ups.length === 4 && JSON.stringify(ups.map(c => c.wup).sort()) === JSON.stringify(wups.slice().sort()), w + ': uppgraderingar ' + ups.map(c => c.wup).join(','));
  ok(ups.some(u => u.rarity === 'legendarisk') && ups.some(u => u.rarity === 'ovanlig'), w + ': uppgraderingar av olika sällsynthet');
  for (const u of ups) {
    V13_ART.push(u.id);
    ok(u.max === 1 && Object.keys(u.mods).length === 0 && Cards.tag(u) === wname && Cards.refine(u.id) === null && Cards.fuse(u.id) === null, u.id + ': uppgradering');
    ok(u.name === u.name.toUpperCase() && u.text === u.text.toUpperCase() && !u.set && !OLDER13.has(u.name), u.id + ': versaler, inget set, nytt namn');
    ok(u.text.split('\n').every(l => l.length <= 27), u.id + ': raderna ska vara högst 27 tecken');
    ok(Cards.sellPrice(u, 2) === 0 && !Cards.canSell(u), u.id + ': kan inte säljas');
  }
  const rng = makeRng(63); let hit = 0;
  for (let i = 0; i < 300; i++) for (const c of Cards.draw(rng, 4, { pact: w, unlocked: unlockedAll })) { ok(!c.pact && (!c.weapon || c.weapon === w), 'draw med pakt ' + w + ' gav ' + c.id); if (c.weapon === w) hit++; }
  ok(hit > 50, w + ': uppgraderingarna ska dras ofta efter pakten (' + hit + ')');
  const rng2 = makeRng(65);
  for (let i = 0; i < 200; i++) for (const c of Cards.draw(rng2, 4, { unlocked: unlockedAll })) ok(c.weapon !== w, 'uppgradering ' + c.id + ' utan pakt');
}
ok(/BLÄCK/.test(Cards.byId('pakt_runbok').text) && /BRÄNSLE/.test(Cards.byId('pakt_angkanon').text), 'ammotexterna: bläck och bränsle (delas med eldkastaren)');
ok(new Set(ALL.filter(c => c.wup).map(c => c.wup)).size === ALL.filter(c => c.wup).length, 'alla wup är unika');
for (const w of Object.keys(Cards.WEAPON_NAME)) { // alla vapen: en pakt, fyra uppgraderingar och uppgraderingarna dras ofta efter pakten
  const rng = makeRng(71); let hit = 0;
  for (let i = 0; i < 300; i++) for (const c of Cards.draw(rng, 4, { pact: w, unlocked: unlockedAll })) if (c.weapon === w) hit++;
  ok(ALL.filter(c => c.pact === w).length === 1 && ALL.filter(c => c.weapon === w).length >= 4 && hit > 50, w + ': pakt och uppgraderingar (' + hit + ')');
}
{ // pakterna dras utan pakt men aldrig en andra; pakter sammanlagt ungefär lika ofta som förut
  const rng = makeRng(67), hit = new Set(); let pacts = 0, tot = 0;
  for (let i = 0; i < 4000; i++) for (const c of Cards.draw(rng, 3, { unlocked: unlockedAll })) { tot++; if (c.pact) { pacts++; hit.add(c.id); } }
  ok(['pakt_runbok', 'pakt_angkanon'].every(id => hit.has(id)), 'nya pakter dras');
  ok(pacts / tot > 0.01 && pacts / tot < 0.04, 'andel pakter ' + (pacts / tot).toFixed(3));
}
// bilder: 96x96, unika (bland alla kort), ASCII-filnamn och byggda i tools/card-art/make.py
{
  const byHash = new Map();
  for (const c of ALL) { const f = path.join(root, c.icon); if (fs.existsSync(f)) { const h = md5(f); if (!byHash.has(h)) byHash.set(h, []); byHash.get(h).push(c.id); } }
  const src = fs.readFileSync(path.join(root, 'tools/card-art/make.py'), 'utf8');
  for (const id of V13_ART) {
    const c = Cards.byId(id), f = path.join(root, c.icon);
    ok(/^assets\/cards\/[a-z0-9_]+\.png$/.test(c.icon), id + ': bildens filnamn ska vara ASCII: ' + c.icon);
    ok(fs.existsSync(f), id + ': bild saknas');
    if (!fs.existsSync(f)) continue;
    const b = fs.readFileSync(f);
    ok(b.readUInt32BE(16) === 96 && b.readUInt32BE(20) === 96, id + ': bilden ska vara 96x96');
    ok(byHash.get(md5(f)).length === 1, id + ': samma bild som ' + byHash.get(md5(f)).join(','));
    ok(src.includes("'" + id + "'"), id + ': bilden ska byggas i tools/card-art/make.py');
  }
  ok(V13_ART.length === 34, '34 nya bilder');
  ok(/def draw_runebook\(/.test(src) && /def draw_steamcannon\(/.test(src), 'vapnen ritas som siluetter i make.py');
  ok(/'runebook': draw_runebook/.test(src) && /'steamcannon': draw_steamcannon/.test(src), 'siluetterna finns i GUNS');
  ok(/def main_v13\(/.test(src) && /near_dupes\(list\(V13_SRC\)/.test(src) && /n \+= main_v13\(\)/.test(src), 'make.py jämför de nya bilderna med alla befintliga kortbilder');
}
// set: ARKIVETS VÄG och SMEDJANS VÄG
for (const [sid, name, need] of [['arkivet', 'ARKIVETS VÄG', ['inkResist', 'runeDmg', 'bookLore']], ['smedjan', 'SMEDJANS VÄG', ['forgeArmor', 'steamDmg', 'pressResist']]]) {
  const members = ALL.filter(c => c.set === sid);
  ok(SETS[sid] && SETS[sid].name === name && members.length >= 4 && members.length <= 6, sid + ': ' + members.length + ' kort');
  ok(need.every(k => k in SETS[sid].mods), sid + ': bonusen ska handla om ' + need.join(', '));
  ok(members.every(c => V13_IDS.includes(c.id) && !c.curse), sid + ': bara nya kort, inga förbannelser');
  ok(members.some(c => c.rarity === 'vanlig') && members.some(c => c.rarity === 'legendarisk'), sid + ': olika sällsynthet');
  for (const k in SETS[sid].mods) ok(SETS[sid].text.includes(String(Math.round(SETS[sid].mods[k] * (Cards.modLines({ [k]: SETS[sid].mods[k] })[0].text.includes('%') ? 100 : 1)))), sid + ': settexten nämner ' + k);
  const three = members.slice(-3).map(c => c.id), m3 = Cards.computeMods(three), raw = {};
  for (const id of three) for (const k in Cards.byId(id).mods) raw[k] = (raw[k] || 0) + Cards.byId(id).mods[k];
  for (const k in SETS[sid].mods) ok(Math.abs(m3[k] - (raw[k] || 0) - SETS[sid].mods[k]) < 1e-6, sid + ': setbonus ' + k);
  ok(Cards.setProgress(three).find(x => x.id === sid).active, sid + ': setProgress aktiv');
}
{ // setnamnen ska inte likna de gamla
  const first = n => n.split(' ')[0];
  for (const sid of ['arkivet', 'smedjan']) ok(Object.keys(SETS).filter(k => k !== sid).every(k => first(SETS[k].name) !== first(SETS[sid].name) && first(SETS[k].name).slice(0, 4) !== first(SETS[sid].name).slice(0, 4)), sid + ': setnamnet liknar ett annat');
}
ok(Cards.synergy(Cards.byId('runstampeln'), ['blackhornet', 'runpennan']) === 'FULLBORDAR ARKIVETS VÄG', 'synergy fullbordar arkivet: ' + Cards.synergy(Cards.byId('runstampeln'), ['blackhornet', 'runpennan']));
ok(Cards.synergy(Cards.byId('angpannan'), ['smidestangen']) === 'SMEDJANS VÄG 2/3', 'synergy smedjan 2/3');
ok(Cards.synergy(Cards.byId('bokmarket'), ['kopistens_lupp']).includes('BÖCKER') && Cards.synergy(Cards.byId('lasglaset'), ['svartblacket']).includes('BLÄCK')
  && Cards.synergy(Cards.byId('kopparmunstycket'), ['angvisslan']).includes('ÅNGA') && Cards.synergy(Cards.byId('nithandsken'), ['jattens_stad']).includes('SMIDE')
  && Cards.synergy(Cards.byId('gjutarspaken'), ['kilremmen']).includes('METALL') && Cards.synergy(Cards.byId('svartblacket'), ['runristaren']).includes('RUNOR'), 'nya syn-taggar');
ok(Cards.describe(Cards.byId('forbjudna_folianten')).includes('SET: ARKIVETS VÄG') && Cards.describe(Cards.byId('kolossens_hjarta')).includes('SET: SMEDJANS VÄG'), 'describe nämner de nya seten');
{
  const demo = fs.readFileSync(path.join(root, 'tools/cards-demo.html'), 'utf8');
  for (const a of ['pact13', 'draft13', 'codex13']) ok(demo.includes("auto === '" + a + "'"), 'demo ?auto=' + a);
}
console.log('Version 13: ' + V13.length + ' kort ' + JSON.stringify(v13Rar) + ', pakter ' + Object.values(PACTS13).map(x => x[0]).join(' ') + ', set ' + ['arkivet', 'smedjan'].map(k => k + '(' + ALL.filter(c => c.set === k).map(c => c.id).join(',') + ')').join(' '));
// ---------- version 15: pakter för rökelsekaret och bikastaren, 24 nya kort (katedral, blod, ljus, klockor, bin, honung och vax), två set ----------
const V15_KEYS = { blessDur: 'p', honeyResist: 'p', larvaDmg: 'p', censerHeal: 'n', beeDmg: 'p', bellStun: 'n', fontBreak: 'n', holyDmg: 'p' };
for (const k in V15_KEYS) {
  ok(keys.includes(k) && /[a-zåäö]{4}/i.test(MOD_KEYS[k]), 'version 15-nyckel saknas eller saknar beskrivning: ' + k);
  const l = Cards.modLines({ [k]: V15_KEYS[k] === 'p' ? 0.1 : 1 });
  ok(l.length === 1 && l[0].good && l[0].text === l[0].text.toUpperCase() && /\d/.test(l[0].text) && (V15_KEYS[k] === 'p') === / % /.test(l[0].text), k + ': modLines ' + JSON.stringify(l));
  ok(Cards.modLabel(k) !== k.toUpperCase() && Cards.modLabel(k) === Cards.modLabel(k).toUpperCase(), k + ': svensk etikett ' + Cards.modLabel(k));
  ok(Cards.fmtVal(k, V15_KEYS[k] === 'p' ? 0.25 : 2) === (V15_KEYS[k] === 'p' ? '25 %' : '2'), k + ': fmtVal');
  ok(Cards.modLines({ [k]: -1 })[0].good === false, k + ': negativt värde är en nackdel');
}
ok(new Set(Object.keys(V15_KEYS).map(Cards.modLabel)).size === 8 && Object.keys(V15_KEYS).every(k => !keys.filter(x => !(x in V15_KEYS)).some(x => Cards.modLabel(x) === Cards.modLabel(k))), 'version 15-nycklarna har egna etiketter');
ok(/välsignelse/i.test(MOD_KEYS.blessDur) && /ljusstråk/i.test(MOD_KEYS.blessDur) && /honung/i.test(MOD_KEYS.honeyResist) && /inbromsning/i.test(MOD_KEYS.honeyResist) && /larv/i.test(MOD_KEYS.larvaDmg)
  && /rökelsekar/i.test(MOD_KEYS.censerHeal) && /platt/i.test(MOD_KEYS.censerHeal) && /bin/i.test(MOD_KEYS.beeDmg) && /klocka/i.test(MOD_KEYS.bellStun) && /sekunder/i.test(MOD_KEYS.bellStun)
  && /blodfunt/i.test(MOD_KEYS.fontBreak) && /platt/i.test(MOD_KEYS.fontBreak) && /välsignad/i.test(MOD_KEYS.holyDmg), 'version 15-beskrivningar');
const V15_IDS = ['glasmalningen', 'vaxsulorna', 'larvkroken', 'rokelsekornen', 'bigadden', 'klockrepet', 'offerskalen', 'helgonglorian', 'vaxljuset', 'honungskakan',
  'kyrkklockan', 'blodkalken', 'biodlarhandskarna', 'larvsaxen', 'myrran', 'rosettfonstret', 'sota_fallan',
  'klockarens_hammare', 'helgonreliken', 'yngelvaktaren', 'rokelsemolnet', 'blodsdopet', 'kardinalens_ring', 'drottningens_krona'];
ok(V15_IDS.length === 24 && new Set(V15_IDS).size === 24, '24 unika version 15-id');
const V15 = V15_IDS.map(id => Cards.byId(id)).filter(Boolean);
ok(V15.length === 24, 'version 15-kort saknas: ' + V15_IDS.filter(id => !Cards.byId(id)).join(','));
const V15_WEAPONS = ['censer', 'hivelauncher'];
const OLDER15 = new Set(ALL.filter(c => !V15_IDS.includes(c.id) && !V15_WEAPONS.includes(c.pact || c.weapon)).map(c => c.name));
const v15Rar = {};
for (const c of V15) {
  v15Rar[c.rarity] = (v15Rar[c.rarity] || 0) + 1;
  ok(!c.pact && !c.weapon && !c.active && !V13_IDS.includes(c.id) && !V11_IDS.includes(c.id) && !V9_IDS.includes(c.id) && !V8_IDS.includes(c.id) && !V7_IDS.includes(c.id) && !N6_IDS.includes(c.id) && !V5_IDS.includes(c.id) && !NEW_IDS.includes(c.id), c.id + ': nytt vanligt kort');
  ok(c.name === c.name.toUpperCase() && c.text === c.text.toUpperCase() && /\d/.test(c.text), c.id + ': versaler och tal i texten');
  ok(!OLDER15.has(c.name), c.id + ': namnet ' + c.name + ' finns redan');
  ok(Cards.modLines(c).length === Object.keys(c.mods).length && c.text.split('\n').length >= Object.keys(c.mods).length, c.id + ': texten ska nämna alla effekter');
  for (const k in c.mods) {
    const v = c.mods[k], f2 = Cards.modLines({ [k]: v })[0];
    if (/\d/.test(f2.text)) ok(c.text.includes(String(Math.round(Math.abs(v) * (/%/.test(f2.text) ? 100 : 1) * 10) / 10).replace('.', ',')), c.id + ': texten ska ha talet för ' + k);
  }
  ok(Object.keys(c.mods).some(k => k in V15_KEYS), c.id + ': använder en ny nyckel');
  if (c.curse) ok(c.bad === 1 && Cards.sellPrice(c, 2) === 0 && Object.values(c.mods).some(v => v < 0) && / % /.test(c.text.split('\n').pop()), c.id + ': förbannat, nackdelen på sista raden');
  else ok(Cards.sellPrice(c, 2) > 0 && Object.values(c.mods).every(v => v > 0), c.id + ': kan säljas, bara fördelar');
  ok(Cards.describe(c).includes(c.name), c.id + ': describe');
  ok(c.max <= 4 && (c.max === 1 || Cards.fuse(c.id) === c.id + '+'), c.id + ': max och sammansmältning');
  ok(c.syn && c.syn.some(t => ['kyrka', 'helig', 'klocka', 'bi', 'honung', 'vax'].includes(t)), c.id + ': har en ny synergitagg');
  ok(c.text.split('\n').every(l => l.length <= 27), c.id + ': raderna ska vara högst 27 tecken');
  if (c.max > 1) { const f = Cards.byId(c.id + '+'); ok(f && f.text !== c.text && f.text.split('\n').every(l => l.length <= 27), c.id + '+: ny text ' + (f && JSON.stringify(f.text))); }
}
ok(v15Rar.vanlig === 10 && v15Rar.ovanlig === 7 && v15Rar.sallsynt === 5 && v15Rar.legendarisk === 2, 'version 15 per sällsynthet ' + JSON.stringify(v15Rar));
ok(V15.filter(c => c.curse).length === 2, '2 förbannade version 15-kort');
ok(Object.keys(V15_KEYS).every(k => V15.filter(c => k in c.mods).length >= 2), 'varje ny nyckel ska användas av minst två nya kort: ' + Object.keys(V15_KEYS).filter(k => V15.filter(c => k in c.mods).length < 2).join(','));
ok(V15.filter(c => c.unlock).length >= 6 && V15.every(c => !c.unlock || (c.unlock >= 10 && c.unlock <= 60)), 'version 15: några kort låses upp med själar');
ok(['kyrka', 'helig', 'klocka', 'bi', 'honung', 'vax'].every(t => Cards.SYN[t] && V15.filter(c => c.syn.includes(t)).length >= 3), 'nya synergitaggar med minst tre kort var');
ok(V15.filter(c => c.syn.includes('blod')).length >= 3, 'blodkorten har den gamla blodtaggen');
ok(Cards.byId('glasmalningen+').text === '+32 % LÄNGRE VÄLSIGNELSE\nFRÅN LJUSSTRÅK' && Cards.byId('glasmalningen+').mods.blessDur === 0.32, 'sammansmält glasmålning: ' + JSON.stringify(Cards.byId('glasmalningen+').text));
ok(Cards.byId('klockrepet+').mods.bellStun === 2 && Cards.byId('klockrepet+').text === '+2 S LÄNGRE BEDÖVNING\nFRÅN KLOCKOR', 'sammansmält klockrep: ' + JSON.stringify(Cards.byId('klockrepet+').text));
ok(Cards.byId('vaxljuset+').text === '+24 % LÄNGRE VÄLSIGNELSE\n+2 HP PER RÖKELSETRÄFF' && Cards.byId('vaxljuset+').mods.censerHeal === 2, 'sammansmält vaxljus: ' + JSON.stringify(Cards.byId('vaxljuset+').text));
ok(Cards.byId('blodkalken+').text === '+10 HP NÄR DU KROSSAR\nEN BLODFUNT\n3 % AV SKADAN BLIR HP' && Cards.byId('blodkalken+').mods.fontBreak === 10, 'sammansmält blodkalk: ' + JSON.stringify(Cards.byId('blodkalken+').text));
ok(Cards.byId('sota_fallan+') === null && Cards.refine('blodsdopet') === null && Cards.byId('kardinalens_ring+') === null, 'kort med max 1 kan inte smältas');
{ const m15 = Cards.computeMods(['glasmalningen', 'glasmalningen', 'vaxljuset', 'sota_fallan', 'honungskakan', 'larvkroken', 'bigadden', 'klockrepet', 'kyrkklockan', 'offerskalen', 'blodsdopet', 'helgonglorian', 'myrran']);
  ok(Math.abs(m15.blessDur - 0.55) < 1e-9 && Math.abs(m15.honeyResist + 0.15) < 1e-9 && m15.larvaDmg === 0.23 && m15.censerHeal === 3 && m15.beeDmg === 0.42
    && m15.bellStun === 3 && m15.fontBreak === 14 && Math.abs(m15.holyDmg - 0.38) < 1e-9 && m15.healMul === -0.15, 'computeMods med version 15-nycklar ' + JSON.stringify([m15.blessDur, m15.honeyResist, m15.larvaDmg, m15.censerHeal, m15.beeDmg, m15.bellStun, m15.fontBreak, m15.holyDmg, m15.healMul])); }
{ // nya kort dras (alla upplåsta) och låsta dras inte
  const rng = makeRng(1515), hit = new Set();
  for (let i = 0; i < 4000; i++) for (const c of Cards.draw(rng, 3, { unlocked: unlockedAll, depth: i % 6 })) hit.add(c.id);
  ok(V15_IDS.every(id => hit.has(id)), 'alla version 15-kort ska kunna dras: saknas ' + V15_IDS.filter(id => !hit.has(id)).join(','));
  const rng2 = makeRng(1516);
  for (let i = 0; i < 1000; i++) for (const c of Cards.draw(rng2, 3, {})) ok(!c.unlock || !V15_IDS.includes(c.id), 'låst version 15-kort dragen ' + c.id);
}
// pakter och uppgraderingar
const PACTS15 = {
  censer: ['pakt_rokelsekar', ['cs_reach', 'cs_heal', 'cs_fire', 'cs_fast'], 'BEHÖVER INGEN AMMO', 'RÖKELSEKAR'],
  hivelauncher: ['pakt_bikastare', ['hl_swarm', 'hl_poison', 'hl_queen', 'hl_fast'], 'ALL AMMO BLIR BIN', 'BIKASTARE'],
};
ok(JSON.stringify(Object.keys(PACTS15)) === JSON.stringify(V15_WEAPONS), 'version 15-vapnen');
const V15_ART = V15_IDS.slice();
for (const w in PACTS15) {
  const [pid, wups, ammo, wname] = PACTS15[w], p = Cards.byId(pid);
  ok(p && p.pact === w && p.rarity === 'sallsynt' && p.max === 1 && p.mods.dmg === 0.15 && p.bad === 1 && p.text.includes(ammo), pid + ': pakt för ' + w);
  ok(Cards.WEAPON_NAME[w] === wname && p && p.text.includes('BARA ' + wname + ' RESTEN AV RUNDAN') && Cards.tag(p) === 'PAKT' && !OLDER15.has(p.name), w + ': WEAPON_NAME och pakttext');
  ok(Cards.fuse(pid) === null && Cards.refine(pid) === null && Cards.sellPrice(pid, 3) === 0, pid + ': kan inte smältas, förädlas eller säljas');
  V15_ART.push(pid);
  const ups = ALL.filter(c => c.weapon === w);
  ok(ups.length === 4 && JSON.stringify(ups.map(c => c.wup).sort()) === JSON.stringify(wups.slice().sort()), w + ': uppgraderingar ' + ups.map(c => c.wup).join(','));
  ok(ups.some(u => u.rarity === 'legendarisk') && ups.some(u => u.rarity === 'ovanlig'), w + ': uppgraderingar av olika sällsynthet');
  for (const u of ups) {
    V15_ART.push(u.id);
    ok(u.max === 1 && Object.keys(u.mods).length === 0 && Cards.tag(u) === wname && Cards.refine(u.id) === null && Cards.fuse(u.id) === null, u.id + ': uppgradering');
    ok(u.name === u.name.toUpperCase() && u.text === u.text.toUpperCase() && !u.set && !OLDER15.has(u.name), u.id + ': versaler, inget set, nytt namn');
    ok(u.text.split('\n').every(l => l.length <= 27), u.id + ': raderna ska vara högst 27 tecken');
    ok(Cards.sellPrice(u, 2) === 0 && !Cards.canSell(u), u.id + ': kan inte säljas');
  }
  const rng = makeRng(63); let hit = 0;
  for (let i = 0; i < 300; i++) for (const c of Cards.draw(rng, 4, { pact: w, unlocked: unlockedAll })) { ok(!c.pact && (!c.weapon || c.weapon === w), 'draw med pakt ' + w + ' gav ' + c.id); if (c.weapon === w) hit++; }
  ok(hit > 50, w + ': uppgraderingarna ska dras ofta efter pakten (' + hit + ')');
  const rng2 = makeRng(65);
  for (let i = 0; i < 200; i++) for (const c of Cards.draw(rng2, 4, { unlocked: unlockedAll })) ok(c.weapon !== w, 'uppgradering ' + c.id + ' utan pakt');
}
ok(/INGEN AMMO/.test(Cards.byId('pakt_rokelsekar').text) && /BIN/.test(Cards.byId('pakt_bikastare').text), 'ammotexterna: rökelsekaret utan ammo, bikastaren skjuter bin');
ok(Cards.byId('drottninggelen').text.includes('TREFALDIG') && Cards.byId('svarmtiden').text.includes('FLER BIN') && Cards.byId('giftgadden').text.includes('FÖRGIFTAR'), 'bikastarens uppgraderingar');
ok(Cards.byId('vigda_roken').text.includes('LÄKER') && Cards.byId('skarselden').text.includes('FYR') && Cards.byId('langkedjan').text.includes('RÄCKVIDD') && Cards.byId('snabbsvingen').text.includes('SVING'), 'rökelsekarets uppgraderingar');
ok(new Set(ALL.filter(c => c.wup).map(c => c.wup)).size === ALL.filter(c => c.wup).length, 'alla wup är unika');
for (const w of V15_WEAPONS) ok(Object.keys(Cards.WEAPON_NAME).includes(w), w + ' finns i WEAPON_NAME');
{ // pakterna dras utan pakt men aldrig en andra; pakter sammanlagt ungefär lika ofta som förut
  const rng = makeRng(69), hit = new Set(); let pacts = 0, tot = 0;
  for (let i = 0; i < 4000; i++) for (const c of Cards.draw(rng, 3, { unlocked: unlockedAll })) { tot++; if (c.pact) { pacts++; hit.add(c.id); } }
  ok(['pakt_rokelsekar', 'pakt_bikastare'].every(id => hit.has(id)), 'nya pakter dras');
  ok(pacts / tot > 0.01 && pacts / tot < 0.04, 'andel pakter ' + (pacts / tot).toFixed(3));
}
// bilder: 96x96, unika (bland alla kort), ASCII-filnamn och byggda i tools/card-art/make.py
{
  const byHash = new Map();
  for (const c of ALL) { const f = path.join(root, c.icon); if (fs.existsSync(f)) { const h = md5(f); if (!byHash.has(h)) byHash.set(h, []); byHash.get(h).push(c.id); } }
  const src = fs.readFileSync(path.join(root, 'tools/card-art/make.py'), 'utf8');
  for (const id of V15_ART) {
    const c = Cards.byId(id), f = path.join(root, c.icon);
    ok(/^assets\/cards\/[a-z0-9_]+\.png$/.test(c.icon), id + ': bildens filnamn ska vara ASCII: ' + c.icon);
    ok(fs.existsSync(f), id + ': bild saknas');
    if (!fs.existsSync(f)) continue;
    const b = fs.readFileSync(f);
    ok(b.readUInt32BE(16) === 96 && b.readUInt32BE(20) === 96, id + ': bilden ska vara 96x96');
    ok(byHash.get(md5(f)).length === 1, id + ': samma bild som ' + byHash.get(md5(f)).join(','));
    ok(src.includes("'" + id + "'"), id + ': bilden ska byggas i tools/card-art/make.py');
  }
  ok(V15_ART.length === 34, '34 nya bilder');
  ok(/def draw_censer\(/.test(src) && /def draw_hivelauncher\(/.test(src), 'vapnen ritas som siluetter i make.py');
  ok(/'censer': draw_censer/.test(src) && /'hivelauncher': draw_hivelauncher/.test(src), 'siluetterna finns i GUNS');
  ok(/def main_v15\(/.test(src) && /near_dupes\(list\(V15_SRC\)/.test(src) && /n \+= main_v15\(\)/.test(src) && /ONLY == 'v15'/.test(src), 'make.py jämför de nya bilderna med alla befintliga kortbilder');
  const v15main = src.slice(src.indexOf('def main_v15('), src.indexOf('def main():'));
  ok(['V13_SRC', 'V13_DRAWN', 'V13_UPGRADES', 'SPLATS', 'SMOKES'].every(t => src.includes(t)) && ['V13_SRC', 'V13_DRAWN', 'V13_UPGRADES'].every(t => v15main.includes(t)), 'make.py: version 15-bilderna jämförs med källorna i version 13 och tidigare');
}
// set: KATEDRALENS VÄG och KUPANS VÄG
for (const [sid, name, need] of [['katedralen', 'KATEDRALENS VÄG', ['blessDur', 'holyDmg', 'fontBreak']], ['kupan', 'KUPANS VÄG', ['beeDmg', 'honeyResist', 'larvaDmg']]]) {
  const members = ALL.filter(c => c.set === sid);
  ok(SETS[sid] && SETS[sid].name === name && members.length >= 4 && members.length <= 6, sid + ': ' + members.length + ' kort');
  ok(need.every(k => k in SETS[sid].mods), sid + ': bonusen ska handla om ' + need.join(', '));
  ok(members.every(c => V15_IDS.includes(c.id) && !c.curse), sid + ': bara nya kort, inga förbannelser');
  ok(members.some(c => c.rarity === 'vanlig') && members.some(c => c.rarity === 'legendarisk'), sid + ': olika sällsynthet');
  for (const k in SETS[sid].mods) ok(SETS[sid].text.includes(String(Math.round(SETS[sid].mods[k] * (Cards.modLines({ [k]: SETS[sid].mods[k] })[0].text.includes('%') ? 100 : 1)))), sid + ': settexten nämner ' + k);
  const three = members.slice(-3).map(c => c.id), m3 = Cards.computeMods(three), raw = {};
  for (const id of three) for (const k in Cards.byId(id).mods) raw[k] = (raw[k] || 0) + Cards.byId(id).mods[k];
  for (const k in SETS[sid].mods) ok(Math.abs(m3[k] - (raw[k] || 0) - SETS[sid].mods[k]) < 1e-6, sid + ': setbonus ' + k);
  ok(Cards.setProgress(three).find(x => x.id === sid).active, sid + ': setProgress aktiv');
}
{ // setnamnen ska inte likna de gamla
  const first = n => n.split(' ')[0];
  for (const sid of ['katedralen', 'kupan']) ok(Object.keys(SETS).filter(k => k !== sid).every(k => first(SETS[k].name) !== first(SETS[sid].name) && first(SETS[k].name).slice(0, 4) !== first(SETS[sid].name).slice(0, 4)), sid + ': setnamnet liknar ett annat');
}
ok(Cards.synergy(Cards.byId('blodkalken'), ['glasmalningen', 'offerskalen']) === 'FULLBORDAR KATEDRALENS VÄG', 'synergy fullbordar katedralen: ' + Cards.synergy(Cards.byId('blodkalken'), ['glasmalningen', 'offerskalen']));
ok(Cards.synergy(Cards.byId('biodlarhandskarna'), ['bigadden']) === 'KUPANS VÄG 2/3', 'synergy kupan 2/3');
ok(Cards.synergy(Cards.byId('klockrepet'), ['kyrkklockan']).includes('KLOCKOR') && Cards.synergy(Cards.byId('helgonglorian'), ['rosettfonstret']).includes('HELIGT LJUS')
  && Cards.synergy(Cards.byId('larvkroken'), ['larvsaxen']).includes('BIN') && Cards.synergy(Cards.byId('vaxljuset'), ['honungskakan']).includes('VAX')
  && Cards.synergy(Cards.byId('sota_fallan'), ['vaxsulorna']).includes('HONUNG') && Cards.synergy(Cards.byId('rokelsekornen'), ['myrran']).includes('KATEDRALEN')
  && Cards.synergy(Cards.byId('blodsdopet'), ['offerskalen']).includes('BLOD'), 'nya syn-taggar');
ok(Cards.describe(Cards.byId('kardinalens_ring')).includes('SET: KATEDRALENS VÄG') && Cards.describe(Cards.byId('drottningens_krona')).includes('SET: KUPANS VÄG'), 'describe nämner de nya seten');
{
  const demo = fs.readFileSync(path.join(root, 'tools/cards-demo.html'), 'utf8');
  for (const a of ['pact15', 'draft15', 'codex15']) ok(demo.includes("auto === '" + a + "'"), 'demo ?auto=' + a);
}
console.log('Version 15: ' + V15.length + ' kort ' + JSON.stringify(v15Rar) + ', pakter ' + Object.values(PACTS15).map(x => x[0]).join(' ') + ', set ' + ['katedralen', 'kupan'].map(k => k + '(' + ALL.filter(c => c.set === k).map(c => c.id).join(',') + ')').join(' '));
// ---------- version 16: pakter för trädgårdssaxen och drömstaven, 24 nya kort (trädgård, rosor, törne, statyer, drömmar, sömn och mardrömmar), två set ----------
const V16_KEYS = { thornResist: 'p', angelSight: 'n', shearDmg: 'p', dreamDmg: 'p', mistSight: 'p', fountainHeal: 'n', shiftSense: 'p', sleepResist: 'p' };
for (const k in V16_KEYS) {
  ok(keys.includes(k) && /[a-zåäö]{4}/i.test(MOD_KEYS[k]), 'version 16-nyckel saknas eller saknar beskrivning: ' + k);
  const l = Cards.modLines({ [k]: V16_KEYS[k] === 'p' ? 0.1 : 1 });
  ok(l.length === 1 && l[0].good && l[0].text === l[0].text.toUpperCase() && /\d/.test(l[0].text) && (V16_KEYS[k] === 'p') === / % /.test(l[0].text), k + ': modLines ' + JSON.stringify(l));
  ok(Cards.modLabel(k) !== k.toUpperCase() && Cards.modLabel(k) === Cards.modLabel(k).toUpperCase(), k + ': svensk etikett ' + Cards.modLabel(k));
  ok(Cards.fmtVal(k, V16_KEYS[k] === 'p' ? 0.25 : 2) === (V16_KEYS[k] === 'p' ? '25 %' : '2'), k + ': fmtVal');
  ok(Cards.modLines({ [k]: -1 })[0].good === false, k + ': negativt värde är en nackdel');
}
ok(new Set(Object.keys(V16_KEYS).map(Cards.modLabel)).size === 8 && Object.keys(V16_KEYS).every(k => !keys.filter(x => !(x in V16_KEYS)).some(x => Cards.modLabel(x) === Cards.modLabel(k))), 'version 16-nycklarna har egna etiketter');
ok(/taggrank/i.test(MOD_KEYS.thornResist) && /stenäng/i.test(MOD_KEYS.angelSight) && /sekunder/i.test(MOD_KEYS.angelSight) && /platt/i.test(MOD_KEYS.angelSight) && /sax/i.test(MOD_KEYS.shearDmg)
  && /drömstav/i.test(MOD_KEYS.dreamDmg) && /dimma/i.test(MOD_KEYS.mistSight) && /synvidd/i.test(MOD_KEYS.mistSight) && /fontän/i.test(MOD_KEYS.fountainHeal) && /platt/i.test(MOD_KEYS.fountainHeal)
  && /glidande väggar/i.test(MOD_KEYS.shiftSense) && /sömn/i.test(MOD_KEYS.sleepResist) && /dåsighet/i.test(MOD_KEYS.sleepResist), 'version 16-beskrivningar');
const V16_IDS = ['rosenhandsken', 'stenblicken', 'grensaxen', 'somnsanden', 'dimlyktan', 'fontanmyntet', 'dromnyckeln', 'tuppfjadern', 'rosenvattnet', 'nattljuset',
  'barkhuden', 'stenangelns_tar', 'rosensaxen', 'stjarnstoftet', 'vakarstenen', 'nackrosen', 'valmon',
  'rankornas_moder', 'marmorhjartat', 'mastersaxen', 'ariadnes_trad', 'mardromsmasken', 'svarta_rosen', 'jon_blunds_paraply'];
ok(V16_IDS.length === 24 && new Set(V16_IDS).size === 24, '24 unika version 16-id');
const V16 = V16_IDS.map(id => Cards.byId(id)).filter(Boolean);
ok(V16.length === 24, 'version 16-kort saknas: ' + V16_IDS.filter(id => !Cards.byId(id)).join(','));
const V16_WEAPONS = ['shears', 'dreamstaff'];
const OLDER16 = new Set(ALL.filter(c => !V16_IDS.includes(c.id) && !V16_WEAPONS.includes(c.pact || c.weapon)).map(c => c.name));
const v16Rar = {};
for (const c of V16) {
  v16Rar[c.rarity] = (v16Rar[c.rarity] || 0) + 1;
  ok(!c.pact && !c.weapon && !c.active && !V15_IDS.includes(c.id) && !V13_IDS.includes(c.id) && !V11_IDS.includes(c.id) && !V9_IDS.includes(c.id) && !V8_IDS.includes(c.id) && !V7_IDS.includes(c.id) && !N6_IDS.includes(c.id) && !V5_IDS.includes(c.id) && !NEW_IDS.includes(c.id), c.id + ': nytt vanligt kort');
  ok(c.name === c.name.toUpperCase() && c.text === c.text.toUpperCase() && /\d/.test(c.text), c.id + ': versaler och tal i texten');
  ok(!OLDER16.has(c.name), c.id + ': namnet ' + c.name + ' finns redan');
  ok(Cards.modLines(c).length === Object.keys(c.mods).length && c.text.split('\n').length >= Object.keys(c.mods).length, c.id + ': texten ska nämna alla effekter');
  for (const k in c.mods) {
    const v = c.mods[k], f2 = Cards.modLines({ [k]: v })[0];
    if (/\d/.test(f2.text)) ok(c.text.includes(String(Math.round(Math.abs(v) * (/%/.test(f2.text) ? 100 : 1) * 10) / 10).replace('.', ',')), c.id + ': texten ska ha talet för ' + k);
  }
  ok(Object.keys(c.mods).some(k => k in V16_KEYS), c.id + ': använder en ny nyckel');
  if (c.curse) ok(c.bad === 1 && Cards.sellPrice(c, 2) === 0 && Object.values(c.mods).some(v => v < 0) && / % /.test(c.text.split('\n').pop()), c.id + ': förbannat, nackdelen på sista raden');
  else ok(Cards.sellPrice(c, 2) > 0 && Object.values(c.mods).every(v => v > 0), c.id + ': kan säljas, bara fördelar');
  ok(Cards.describe(c).includes(c.name), c.id + ': describe');
  ok(c.max <= 4 && (c.max === 1 || Cards.fuse(c.id) === c.id + '+'), c.id + ': max och sammansmältning');
  ok(c.syn && c.syn.some(t => ['tradgard', 'ros', 'torne', 'staty', 'drom', 'somn', 'mardrom'].includes(t)), c.id + ': har en ny synergitagg');
  ok(c.text.split('\n').every(l => l.length <= 27) && c.text.split('\n').length <= 5, c.id + ': raderna ska vara högst 27 tecken och högst fem');
  if (c.max > 1) { const f = Cards.byId(c.id + '+'); ok(f && f.text !== c.text && f.text.split('\n').every(l => l.length <= 27), c.id + '+: ny text ' + (f && JSON.stringify(f.text))); }
}
ok(v16Rar.vanlig === 10 && v16Rar.ovanlig === 7 && v16Rar.sallsynt === 5 && v16Rar.legendarisk === 2, 'version 16 per sällsynthet ' + JSON.stringify(v16Rar));
ok(V16.filter(c => c.curse).length === 2, '2 förbannade version 16-kort');
ok(Object.keys(V16_KEYS).every(k => V16.filter(c => k in c.mods).length >= 2), 'varje ny nyckel ska användas av minst två nya kort: ' + Object.keys(V16_KEYS).filter(k => V16.filter(c => k in c.mods).length < 2).join(','));
ok(V16.filter(c => c.unlock).length >= 6 && V16.every(c => !c.unlock || (c.unlock >= 10 && c.unlock <= 60)), 'version 16: några kort låses upp med själar');
ok(['tradgard', 'ros', 'torne', 'staty', 'drom', 'somn', 'mardrom'].every(t => Cards.SYN[t] && V16.filter(c => c.syn.includes(t)).length >= 3), 'nya synergitaggar med minst tre kort var');
ok(V16.filter(c => c.curse).every(c => c.syn.includes('mardrom')), 'förbannelserna är mardrömmar');
ok(/GLIDANDE VÄGGAR ÖPPNAS/.test(Cards.byId('dromnyckeln').text) && V16.filter(c => 'shiftSense' in c.mods).every(c => c.text.includes('GLIDANDE VÄGGAR ÖPPNAS')), 'glidande väggar öppnas snabbare');
ok(Cards.byId('rosenhandsken+').text === '32 % MINDRE SKADA\nFRÅN TAGGRANKOR' && Cards.byId('rosenhandsken+').mods.thornResist === 0.32, 'sammansmält rosenhandske: ' + JSON.stringify(Cards.byId('rosenhandsken+').text));
ok(Cards.byId('stenblicken+').mods.angelSight === 2 && Cards.byId('stenblicken+').text === 'STENÄNGLAR STÅR STILLA\n+2 S EFTER ATT DU\nTITTAT BORT', 'sammansmält stenblick: ' + JSON.stringify(Cards.byId('stenblicken+').text));
ok(Cards.byId('rosenvattnet+').text === '+5 HP FRÅN FONTÄNER\n16 % MINDRE SKADA\nFRÅN TAGGRANKOR' && Cards.byId('rosenvattnet+').mods.fountainHeal === 5, 'sammansmält rosenvatten: ' + JSON.stringify(Cards.byId('rosenvattnet+').text));
ok(Cards.byId('dromnyckeln+').text === 'GLIDANDE VÄGGAR ÖPPNAS\n32 % SNABBARE' && Cards.byId('dromnyckeln+').mods.shiftSense === 0.32, 'sammansmält drömnyckel: ' + JSON.stringify(Cards.byId('dromnyckeln+').text));
ok(Cards.byId('valmon+') === null && Cards.refine('mardromsmasken') === null && Cards.byId('jon_blunds_paraply+') === null, 'kort med max 1 kan inte smältas');
{ // rosenhandsken, stenblicken och näckrosen fullbordar TRÄDGÅRDENS VÄG (+25 % skydd mot taggrankor, +1 s, +5 HP); tuppfjädern, nattljuset och valmon tar ut varandra
  const m16 = Cards.computeMods(['rosenhandsken', 'rosenhandsken', 'rosenvattnet', 'stenblicken', 'grensaxen', 'rosensaxen', 'somnsanden', 'valmon', 'dimlyktan', 'nattljuset', 'fontanmyntet', 'dromnyckeln', 'tuppfjadern', 'nackrosen']);
  ok(Math.abs(m16.thornResist - 0.75) < 1e-9 && m16.angelSight === 2 && m16.shearDmg === 0.32 && m16.dreamDmg === 0.42 && m16.mistSight === 0.35 && m16.fountainHeal === 21
    && m16.shiftSense === 0.2 && Math.abs(m16.sleepResist - 0) < 1e-9 && m16.bleedChance === 0.05 && m16.healMul === 0.1, 'computeMods med version 16-nycklar ' + JSON.stringify([m16.thornResist, m16.angelSight, m16.shearDmg, m16.dreamDmg, m16.mistSight, m16.fountainHeal, m16.shiftSense, m16.sleepResist])); }
{ // nya kort dras (alla upplåsta) och låsta dras inte
  const rng = makeRng(1616), hit = new Set();
  for (let i = 0; i < 4000; i++) for (const c of Cards.draw(rng, 3, { unlocked: unlockedAll, depth: i % 6 })) hit.add(c.id);
  ok(V16_IDS.every(id => hit.has(id)), 'alla version 16-kort ska kunna dras: saknas ' + V16_IDS.filter(id => !hit.has(id)).join(','));
  const rng2 = makeRng(1617);
  for (let i = 0; i < 1000; i++) for (const c of Cards.draw(rng2, 3, {})) ok(!c.unlock || !V16_IDS.includes(c.id), 'låst version 16-kort dragen ' + c.id);
}
// pakter och uppgraderingar
const PACTS16 = {
  shears: ['pakt_tradgardssax', ['sh_triple', 'sh_bleed', 'sh_throw', 'sh_fast'], 'BEHÖVER INGEN AMMO', 'TRÄDGÅRDSSAX'],
  dreamstaff: ['pakt_dromstav', ['ds_slow', 'ds_split', 'ds_sleep', 'ds_fast'], 'ALL AMMO BLIR DRÖMMAR', 'DRÖMSTAV'],
};
ok(JSON.stringify(Object.keys(PACTS16)) === JSON.stringify(V16_WEAPONS), 'version 16-vapnen');
const V16_ART = V16_IDS.slice();
for (const w in PACTS16) {
  const [pid, wups, ammo, wname] = PACTS16[w], p = Cards.byId(pid);
  ok(p && p.pact === w && p.rarity === 'sallsynt' && p.max === 1 && p.mods.dmg === 0.15 && p.bad === 1 && p.text.includes(ammo), pid + ': pakt för ' + w);
  ok(Cards.WEAPON_NAME[w] === wname && p && p.text.includes('BARA ' + wname + ' RESTEN AV RUNDAN') && Cards.tag(p) === 'PAKT' && !OLDER16.has(p.name), w + ': WEAPON_NAME och pakttext');
  ok(Cards.fuse(pid) === null && Cards.refine(pid) === null && Cards.sellPrice(pid, 3) === 0, pid + ': kan inte smältas, förädlas eller säljas');
  V16_ART.push(pid);
  const ups = ALL.filter(c => c.weapon === w);
  ok(ups.length === 4 && JSON.stringify(ups.map(c => c.wup).sort()) === JSON.stringify(wups.slice().sort()), w + ': uppgraderingar ' + ups.map(c => c.wup).join(','));
  ok(ups.some(u => u.rarity === 'legendarisk') && ups.some(u => u.rarity === 'ovanlig'), w + ': uppgraderingar av olika sällsynthet');
  for (const u of ups) {
    V16_ART.push(u.id);
    ok(u.max === 1 && Object.keys(u.mods).length === 0 && Cards.tag(u) === wname && Cards.refine(u.id) === null && Cards.fuse(u.id) === null, u.id + ': uppgradering');
    ok(u.name === u.name.toUpperCase() && u.text === u.text.toUpperCase() && !u.set && !OLDER16.has(u.name), u.id + ': versaler, inget set, nytt namn');
    ok(u.text.split('\n').every(l => l.length <= 27), u.id + ': raderna ska vara högst 27 tecken');
    ok(Cards.sellPrice(u, 2) === 0 && !Cards.canSell(u), u.id + ': kan inte säljas');
  }
  const rng = makeRng(67); let hit = 0;
  for (let i = 0; i < 300; i++) for (const c of Cards.draw(rng, 4, { pact: w, unlocked: unlockedAll })) { ok(!c.pact && (!c.weapon || c.weapon === w), 'draw med pakt ' + w + ' gav ' + c.id); if (c.weapon === w) hit++; }
  ok(hit > 50, w + ': uppgraderingarna ska dras ofta efter pakten (' + hit + ')');
  const rng2 = makeRng(68);
  for (let i = 0; i < 200; i++) for (const c of Cards.draw(rng2, 4, { unlocked: unlockedAll })) ok(c.weapon !== w, 'uppgradering ' + c.id + ' utan pakt');
}
ok(/SAXEN BEHÖVER INGEN AMMO/.test(Cards.byId('pakt_tradgardssax').text) && /DRÖMMAR/.test(Cards.byId('pakt_dromstav').text), 'ammotexterna: saxen utan ammo, drömstaven skjuter drömmar');
ok(Cards.byId('treklippet').text.includes('TRE KLIPP') && Cards.byId('blodklippet').text.includes('BLÖDNING') && Cards.byId('saxkastet').text.includes('KASTET') && Cards.byId('snabbklippet').text.includes('SNABBARE'), 'saxens uppgraderingar');
ok(Cards.byId('trogheten').text.includes('RADIE') && Cards.byId('stjarnregnet').text.includes('TRE MINDRE') && Cards.byId('djupsomnen').text.includes('SOVER LÄNGRE') && Cards.byId('stjarnfallet').text.includes('SNABBARE'), 'drömstavens uppgraderingar');
ok(new Set(ALL.filter(c => c.wup).map(c => c.wup)).size === ALL.filter(c => c.wup).length, 'alla wup är unika');
for (const w of V16_WEAPONS) ok(Object.keys(Cards.WEAPON_NAME).includes(w), w + ' finns i WEAPON_NAME');
{ // pakterna dras utan pakt men aldrig en andra; pakter sammanlagt ungefär lika ofta som förut
  const rng = makeRng(71), hit = new Set(); let pacts = 0, tot = 0;
  for (let i = 0; i < 4000; i++) for (const c of Cards.draw(rng, 3, { unlocked: unlockedAll })) { tot++; if (c.pact) { pacts++; hit.add(c.id); } }
  ok(['pakt_tradgardssax', 'pakt_dromstav'].every(id => hit.has(id)), 'nya pakter dras');
  ok(pacts / tot > 0.01 && pacts / tot < 0.04, 'andel pakter ' + (pacts / tot).toFixed(3));
}
// bilder: 96x96, unika (bland alla kort), ASCII-filnamn och byggda i tools/card-art/make.py
{
  const byHash = new Map();
  for (const c of ALL) { const f = path.join(root, c.icon); if (fs.existsSync(f)) { const h = md5(f); if (!byHash.has(h)) byHash.set(h, []); byHash.get(h).push(c.id); } }
  const src = fs.readFileSync(path.join(root, 'tools/card-art/make.py'), 'utf8');
  for (const id of V16_ART) {
    const c = Cards.byId(id), f = path.join(root, c.icon);
    ok(/^assets\/cards\/[a-z0-9_]+\.png$/.test(c.icon), id + ': bildens filnamn ska vara ASCII: ' + c.icon);
    ok(fs.existsSync(f), id + ': bild saknas');
    if (!fs.existsSync(f)) continue;
    const b = fs.readFileSync(f);
    ok(b.readUInt32BE(16) === 96 && b.readUInt32BE(20) === 96, id + ': bilden ska vara 96x96');
    ok(byHash.get(md5(f)).length === 1, id + ': samma bild som ' + byHash.get(md5(f)).join(','));
    ok(src.includes("'" + id + "'"), id + ': bilden ska byggas i tools/card-art/make.py');
  }
  ok(V16_ART.length === 34, '34 nya bilder');
  ok(/def draw_shears\(/.test(src) && /def draw_dreamstaff\(/.test(src), 'vapnen ritas som siluetter i make.py');
  ok(/'shears': draw_shears/.test(src) && /'dreamstaff': draw_dreamstaff/.test(src), 'siluetterna finns i GUNS');
  ok(/def main_v16\(/.test(src) && /near_dupes\(list\(V16_SRC\)/.test(src) && /n \+= main_v16\(\)/.test(src) && /ONLY == 'v16'/.test(src), 'make.py jämför de nya bilderna med alla befintliga kortbilder');
  const v16main = src.slice(src.indexOf('def main_v16('), src.indexOf('def main():'));
  ok(['V15_SRC', 'V15_DRAWN', 'V15_UPGRADES', 'V13_SRC', 'V13_UPGRADES'].every(t => v16main.includes(t)), 'make.py: version 16-bilderna jämförs med källorna i version 15 och tidigare');
}
// set: TRÄDGÅRDENS VÄG och DRÖMMENS VÄG
for (const [sid, name, need] of [['tradgarden', 'TRÄDGÅRDENS VÄG', ['thornResist', 'angelSight', 'fountainHeal']], ['drommen', 'DRÖMMENS VÄG', ['mistSight', 'sleepResist', 'dreamDmg']]]) {
  const members = ALL.filter(c => c.set === sid);
  ok(SETS[sid] && SETS[sid].name === name && members.length >= 4 && members.length <= 6, sid + ': ' + members.length + ' kort');
  ok(need.every(k => k in SETS[sid].mods), sid + ': bonusen ska handla om ' + need.join(', '));
  ok(members.every(c => V16_IDS.includes(c.id) && !c.curse), sid + ': bara nya kort, inga förbannelser');
  ok(members.some(c => c.rarity === 'vanlig') && members.some(c => c.rarity === 'legendarisk'), sid + ': olika sällsynthet');
  for (const k in SETS[sid].mods) ok(SETS[sid].text.includes(String(Math.round(SETS[sid].mods[k] * (Cards.modLines({ [k]: SETS[sid].mods[k] })[0].text.includes('%') ? 100 : 1)))), sid + ': settexten nämner ' + k);
  const three = members.slice(-3).map(c => c.id), m3 = Cards.computeMods(three), raw = {};
  for (const id of three) for (const k in Cards.byId(id).mods) raw[k] = (raw[k] || 0) + Cards.byId(id).mods[k];
  for (const k in SETS[sid].mods) ok(Math.abs(m3[k] - (raw[k] || 0) - SETS[sid].mods[k]) < 1e-6, sid + ': setbonus ' + k);
  ok(Cards.setProgress(three).find(x => x.id === sid).active, sid + ': setProgress aktiv');
}
{ // setnamnen ska inte likna de gamla
  const first = n => n.split(' ')[0];
  for (const sid of ['tradgarden', 'drommen']) ok(Object.keys(SETS).filter(k => k !== sid).every(k => first(SETS[k].name) !== first(SETS[sid].name) && first(SETS[k].name).slice(0, 4) !== first(SETS[sid].name).slice(0, 4)), sid + ': setnamnet liknar ett annat');
}
ok(Cards.synergy(Cards.byId('nackrosen'), ['rosenhandsken', 'stenblicken']) === 'FULLBORDAR TRÄDGÅRDENS VÄG', 'synergy fullbordar trädgården: ' + Cards.synergy(Cards.byId('nackrosen'), ['rosenhandsken', 'stenblicken']));
ok(Cards.synergy(Cards.byId('vakarstenen'), ['somnsanden']) === 'DRÖMMENS VÄG 2/3', 'synergy drömmen 2/3');
ok(Cards.synergy(Cards.byId('grensaxen'), ['fontanmyntet']).includes('TRÄDGÅRDEN') && Cards.synergy(Cards.byId('rosensaxen'), ['rosenvattnet']).includes('ROSOR')
  && Cards.synergy(Cards.byId('barkhuden'), ['mastersaxen']).includes('TÖRNE') && Cards.synergy(Cards.byId('stenangelns_tar'), ['marmorhjartat']).includes('STATYER')
  && Cards.synergy(Cards.byId('dromnyckeln'), ['stjarnstoftet']).includes('DRÖMMAR') && Cards.synergy(Cards.byId('tuppfjadern'), ['nattljuset']).includes('SÖMN')
  && Cards.synergy(Cards.byId('mardromsmasken'), ['valmon']).includes('MARDRÖMMAR') && Cards.synergy(Cards.byId('valmon'), ['jon_blunds_paraply']).includes('SÖMN'), 'nya syn-taggar');
ok(Cards.synergy(Cards.byId('mardromsmasken'), ['jon_blunds_paraply']).includes('MARDRÖMMAR') && Cards.SYN.mardrom === 'MARDRÖMMAR', 'mardrömmar');
ok(Cards.describe(Cards.byId('svarta_rosen')).includes('SET: TRÄDGÅRDENS VÄG') && Cards.describe(Cards.byId('jon_blunds_paraply')).includes('SET: DRÖMMENS VÄG'), 'describe nämner de nya seten');
{
  const demo = fs.readFileSync(path.join(root, 'tools/cards-demo.html'), 'utf8');
  for (const a of ['pact16', 'draft16', 'codex16']) ok(demo.includes("auto === '" + a + "'"), 'demo ?auto=' + a);
}
console.log('Version 16: ' + V16.length + ' kort ' + JSON.stringify(v16Rar) + ', pakter ' + Object.values(PACTS16).map(x => x[0]).join(' ') + ', set ' + ['tradgarden', 'drommen'].map(k => k + '(' + ALL.filter(c => c.set === k).map(c => c.id).join(',') + ')').join(' '));


// ---------- version 17: pakter för kedjekulekanonen och syrasprutan, 24 nya kort (skeppet, kanoner, pirater, syra, flaskor, transmutation och teslaspolar), två set ----------
const V17_KEYS = { deckGrip: 'p', cannonDmg: 'p', chainDmg: 'p', acidDmg: 'p', acidResist: 'p', transmuteLuck: 'p', teslaResist: 'p', brewLuck: 'p' };
for (const k in V17_KEYS) {
  ok(keys.includes(k) && /[a-zåäö]{4}/i.test(MOD_KEYS[k]), 'version 17-nyckel saknas eller saknar beskrivning: ' + k);
  const l = Cards.modLines({ [k]: 0.1 });
  ok(l.length === 1 && l[0].good && l[0].text === l[0].text.toUpperCase() && / % /.test(l[0].text), k + ': modLines ' + JSON.stringify(l));
  ok(Cards.modLabel(k) !== k.toUpperCase() && Cards.modLabel(k) === Cards.modLabel(k).toUpperCase(), k + ': svensk etikett ' + Cards.modLabel(k));
  ok(Cards.fmtVal(k, 0.25) === '25 %', k + ': fmtVal');
  ok(Cards.modLines({ [k]: -1 })[0].good === false, k + ': negativt värde är en nackdel');
}
ok(new Set(Object.keys(V17_KEYS).map(Cards.modLabel)).size === 8 && Object.keys(V17_KEYS).every(k => !keys.filter(x => !(x in V17_KEYS)).some(x => Cards.modLabel(x) === Cards.modLabel(k))), 'version 17-nycklarna har egna etiketter');
ok(/däck/i.test(MOD_KEYS.deckGrip) && /vågor/i.test(MOD_KEYS.deckGrip) && /kanon/i.test(MOD_KEYS.cannonDmg) && /kedjekul/i.test(MOD_KEYS.chainDmg) && /syra/i.test(MOD_KEYS.acidDmg) && /syra/i.test(MOD_KEYS.acidResist)
  && /transmutation/i.test(MOD_KEYS.transmuteLuck) && /guld/i.test(MOD_KEYS.transmuteLuck) && /tesla/i.test(MOD_KEYS.teslaResist) && /alembik/i.test(MOD_KEYS.brewLuck), 'version 17-beskrivningar');
const V17_IDS = ['sjobenen', 'krutpungen', 'kedjelanken', 'syrakolven', 'gummiforkladet', 'blysmycket', 'jordkabeln', 'destillatet', 'tjarat_rep', 'skyddsglasogonen',
  'kaparbrevet', 'kedjesmeden', 'syrastanket', 'guldlovet', 'faradays_bur', 'brygdboken', 'rombuteljen',
  'kaptenens_kompass', 'ankarkettingen', 'salamanderhuden', 'vises_sten', 'kvicksilverbagaren', 'hollandarens_ror', 'smaragdtavlan'];
ok(V17_IDS.length === 24 && new Set(V17_IDS).size === 24, '24 unika version 17-id');
const V17 = V17_IDS.map(id => Cards.byId(id)).filter(Boolean);
ok(V17.length === 24, 'version 17-kort saknas: ' + V17_IDS.filter(id => !Cards.byId(id)).join(','));
const V17_WEAPONS = ['chaincannon', 'acidsprayer'];
const OLDER17 = new Set(ALL.filter(c => !V17_IDS.includes(c.id) && !V17_WEAPONS.includes(c.pact || c.weapon)).map(c => c.name));
const v17Rar = {};
for (const c of V17) {
  v17Rar[c.rarity] = (v17Rar[c.rarity] || 0) + 1;
  ok(!c.pact && !c.weapon && !c.active && !V16_IDS.includes(c.id) && !V15_IDS.includes(c.id) && !V13_IDS.includes(c.id), c.id + ': nytt vanligt kort');
  ok(c.name === c.name.toUpperCase() && c.text === c.text.toUpperCase() && /\d/.test(c.text), c.id + ': versaler och tal i texten');
  ok(!OLDER17.has(c.name), c.id + ': namnet ' + c.name + ' finns redan');
  ok(Cards.modLines(c).length === Object.keys(c.mods).length && c.text.split('\n').length >= Object.keys(c.mods).length, c.id + ': texten ska nämna alla effekter');
  for (const k in c.mods) {
    const v = c.mods[k], f2 = Cards.modLines({ [k]: v })[0];
    if (/\d/.test(f2.text)) ok(c.text.includes(String(Math.round(Math.abs(v) * (/%/.test(f2.text) ? 100 : 1) * 10) / 10).replace('.', ',')), c.id + ': texten ska ha talet för ' + k);
  }
  ok(Object.keys(c.mods).some(k => k in V17_KEYS), c.id + ': använder en ny nyckel');
  if (c.curse) ok(c.bad === 1 && Cards.sellPrice(c, 2) === 0 && Object.values(c.mods).some(v => v < 0) && / % /.test(c.text.split('\n').pop()), c.id + ': förbannat, nackdelen på sista raden');
  else ok(Cards.sellPrice(c, 2) > 0 && Object.values(c.mods).every(v => v > 0), c.id + ': kan säljas, bara fördelar');
  ok(Cards.describe(c).includes(c.name), c.id + ': describe');
  ok(c.max <= 4 && (c.max === 1 || Cards.fuse(c.id) === c.id + '+'), c.id + ': max och sammansmältning');
  ok(c.syn && c.syn.some(t => ['skepp', 'kanon', 'pirat', 'syra', 'flaska', 'transmut', 'tesla'].includes(t)), c.id + ': har en ny synergitagg');
  ok(c.text.split('\n').every(l => l.length <= 27) && c.text.split('\n').length <= 5, c.id + ': raderna ska vara högst 27 tecken och högst fem');
  if (c.max > 1) { const f = Cards.byId(c.id + '+'); ok(f && f.text !== c.text && f.text.split('\n').every(l => l.length <= 27), c.id + '+: ny text ' + (f && JSON.stringify(f.text))); }
}
ok(v17Rar.vanlig === 10 && v17Rar.ovanlig === 7 && v17Rar.sallsynt === 5 && v17Rar.legendarisk === 2, 'version 17 per sällsynthet ' + JSON.stringify(v17Rar));
ok(V17.filter(c => c.curse).length === 2, '2 förbannade version 17-kort');
ok(Object.keys(V17_KEYS).every(k => V17.filter(c => k in c.mods).length >= 2), 'varje ny nyckel ska användas av minst två nya kort: ' + Object.keys(V17_KEYS).filter(k => V17.filter(c => k in c.mods).length < 2).join(','));
ok(V17.filter(c => c.unlock).length >= 6 && V17.every(c => !c.unlock || (c.unlock >= 10 && c.unlock <= 60)), 'version 17: några kort låses upp med själar');
ok(['skepp', 'kanon', 'pirat', 'syra', 'flaska', 'transmut', 'tesla'].every(t => Cards.SYN[t] && V17.filter(c => c.syn.includes(t)).length >= 3), 'nya synergitaggar med minst tre kort var');
ok(Cards.byId('sjobenen+').mods.deckGrip === 0.32 && Cards.byId('sjobenen+').text === '32 % MER GREPP\nPÅ SKÖLJT DÄCK', 'sammansmälta sjöben: ' + JSON.stringify(Cards.byId('sjobenen+').text));
ok(Cards.byId('rombuteljen+') === null && Cards.refine('kvicksilverbagaren') === null && Cards.byId('smaragdtavlan+') === null, 'kort med max 1 kan inte smältas');
{ // nya kort dras (alla upplåsta) och låsta dras inte
  const rng = makeRng(1717), hit = new Set();
  for (let i = 0; i < 4000; i++) for (const c of Cards.draw(rng, 3, { unlocked: unlockedAll, depth: i % 6 })) hit.add(c.id);
  ok(V17_IDS.every(id => hit.has(id)), 'alla version 17-kort ska kunna dras: saknas ' + V17_IDS.filter(id => !hit.has(id)).join(','));
  const rng2 = makeRng(1718);
  for (let i = 0; i < 1000; i++) for (const c of Cards.draw(rng2, 3, {})) ok(!c.unlock || !V17_IDS.includes(c.id), 'låst version 17-kort dragen ' + c.id);
}
const PACTS17 = {
  chaincannon: ['pakt_kedjekanon', ['cc_pierce', 'cc_spin', 'cc_fire', 'cc_fast'], 'ALL AMMO BLIR KEDJEKULOR', 'KEDJEKANON'],
  acidsprayer: ['pakt_syraspruta', ['as_corrode', 'as_spread', 'as_fumes', 'as_fast'], 'ALL AMMO BLIR SYRA', 'SYRASPRUTA'],
};
const V17_ART = V17_IDS.slice();
for (const w in PACTS17) {
  const [pid, wups, ammo, wname] = PACTS17[w], p = Cards.byId(pid);
  ok(p && p.pact === w && p.rarity === 'sallsynt' && p.max === 1 && p.mods.dmg === 0.15 && p.bad === 1 && p.text.includes(ammo), pid + ': pakt för ' + w);
  ok(Cards.WEAPON_NAME[w] === wname && p && p.text.includes('BARA ' + wname + ' RESTEN AV RUNDAN') && Cards.tag(p) === 'PAKT' && !OLDER17.has(p.name), w + ': WEAPON_NAME och pakttext');
  ok(Cards.fuse(pid) === null && Cards.refine(pid) === null && Cards.sellPrice(pid, 3) === 0, pid + ': kan inte smältas, förädlas eller säljas');
  V17_ART.push(pid);
  const ups = ALL.filter(c => c.weapon === w);
  ok(ups.length === 4 && JSON.stringify(ups.map(c => c.wup).sort()) === JSON.stringify(wups.slice().sort()), w + ': uppgraderingar ' + ups.map(c => c.wup).join(','));
  ok(ups.some(u => u.rarity === 'legendarisk') && ups.some(u => u.rarity === 'ovanlig'), w + ': uppgraderingar av olika sällsynthet');
  for (const u of ups) {
    V17_ART.push(u.id);
    ok(u.max === 1 && Object.keys(u.mods).length === 0 && Cards.tag(u) === wname && Cards.refine(u.id) === null && Cards.fuse(u.id) === null, u.id + ': uppgradering');
    ok(u.name === u.name.toUpperCase() && u.text === u.text.toUpperCase() && !u.set && !OLDER17.has(u.name), u.id + ': versaler, inget set, nytt namn');
    ok(u.text.split('\n').every(l => l.length <= 27), u.id + ': raderna ska vara högst 27 tecken');
  }
  const rng = makeRng(77); let hit = 0;
  for (let i = 0; i < 300; i++) for (const c of Cards.draw(rng, 4, { pact: w, unlocked: unlockedAll })) { ok(!c.pact && (!c.weapon || c.weapon === w), 'draw med pakt ' + w + ' gav ' + c.id); if (c.weapon === w) hit++; }
  ok(hit > 50, w + ': uppgraderingarna ska dras ofta efter pakten (' + hit + ')');
}
{ // pakterna dras utan pakt; pakter sammanlagt ungefär lika ofta som förut
  const rng = makeRng(171), hit = new Set(); let pacts = 0, tot = 0;
  for (let i = 0; i < 4000; i++) for (const c of Cards.draw(rng, 3, { unlocked: unlockedAll })) { tot++; if (c.pact) { pacts++; hit.add(c.id); } }
  ok(['pakt_kedjekanon', 'pakt_syraspruta'].every(id => hit.has(id)), 'nya pakter dras');
  ok(pacts / tot > 0.01 && pacts / tot < 0.04, 'andel pakter ' + (pacts / tot).toFixed(3));
}
{ // bilder: 96x96, unika, ASCII-filnamn och byggda i tools/card-art/make.py
  const byHash = new Map();
  for (const c of ALL) { const f = path.join(root, c.icon); if (fs.existsSync(f)) { const h = md5(f); if (!byHash.has(h)) byHash.set(h, []); byHash.get(h).push(c.id); } }
  const src = fs.readFileSync(path.join(root, 'tools/card-art/make.py'), 'utf8');
  for (const id of V17_ART) {
    const c = Cards.byId(id), f = path.join(root, c.icon);
    ok(/^assets\/cards\/[a-z0-9_]+\.png$/.test(c.icon), id + ': bildens filnamn ska vara ASCII: ' + c.icon);
    ok(fs.existsSync(f), id + ': bild saknas');
    if (!fs.existsSync(f)) continue;
    const b = fs.readFileSync(f);
    ok(b.readUInt32BE(16) === 96 && b.readUInt32BE(20) === 96, id + ': bilden ska vara 96x96');
    ok(byHash.get(md5(f)).length === 1, id + ': samma bild som ' + byHash.get(md5(f)).join(','));
    ok(src.includes("'" + id + "'"), id + ': bilden ska byggas i tools/card-art/make.py');
  }
  ok(V17_ART.length === 34, '34 nya bilder');
  ok(/def draw_chaincannon\(/.test(src) && /def draw_acidsprayer\(/.test(src) && /'chaincannon': draw_chaincannon/.test(src) && /'acidsprayer': draw_acidsprayer/.test(src), 'vapnen ritas som siluetter i make.py');
  ok(/def main_v17\(/.test(src) && /n \+= main_v17\(\)/.test(src) && /ONLY == 'v17'/.test(src), 'make.py bygger version 17');
}
for (const [sid, name, need] of [['skeppet', 'SKEPPETS VÄG', ['deckGrip', 'cannonDmg', 'chainDmg']], ['laboratoriet', 'LABORATORIETS VÄG', ['acidResist', 'transmuteLuck', 'brewLuck']]]) {
  const members = ALL.filter(c => c.set === sid);
  ok(SETS[sid] && SETS[sid].name === name && members.length >= 4 && members.length <= 6, sid + ': ' + members.length + ' kort');
  ok(need.every(k => k in SETS[sid].mods), sid + ': bonusen ska handla om ' + need.join(', '));
  ok(members.every(c => V17_IDS.includes(c.id) && !c.curse), sid + ': bara nya kort, inga förbannelser');
  ok(members.some(c => c.rarity === 'vanlig') && members.some(c => c.rarity === 'legendarisk'), sid + ': olika sällsynthet');
  for (const k in SETS[sid].mods) ok(SETS[sid].text.includes(String(Math.round(SETS[sid].mods[k] * 100))), sid + ': settexten nämner ' + k);
  const three = members.slice(-3).map(c => c.id), m3 = Cards.computeMods(three), raw = {};
  for (const id of three) for (const k in Cards.byId(id).mods) raw[k] = (raw[k] || 0) + Cards.byId(id).mods[k];
  for (const k in SETS[sid].mods) ok(Math.abs(m3[k] - (raw[k] || 0) - SETS[sid].mods[k]) < 1e-6, sid + ': setbonus ' + k);
  const first = n => n.split(' ')[0];
  ok(Object.keys(SETS).filter(k => k !== sid).every(k => first(SETS[k].name) !== first(SETS[sid].name) && first(SETS[k].name).slice(0, 4) !== first(SETS[sid].name).slice(0, 4)), sid + ': setnamnet liknar ett annat');
}
ok(Cards.synergy(Cards.byId('hollandarens_ror'), ['sjobenen', 'krutpungen']) === 'FULLBORDAR SKEPPETS VÄG', 'synergy fullbordar skeppet: ' + Cards.synergy(Cards.byId('hollandarens_ror'), ['sjobenen', 'krutpungen']));
ok(Cards.synergy(Cards.byId('kedjesmeden'), ['kedjelanken']).includes('KANONER') && Cards.synergy(Cards.byId('faradays_bur'), ['jordkabeln']).includes('TESLASPOLAR') && Cards.synergy(Cards.byId('syrakolven'), ['syrastanket']).includes('SYRA'), 'nya syn-taggar');
console.log('Version 17: ' + V17.length + ' kort ' + JSON.stringify(v17Rar) + ', pakter ' + Object.values(PACTS17).map(x => x[0]).join(' ') + ', set ' + ['skeppet', 'laboratoriet'].map(k => k + '(' + ALL.filter(c => c.set === k).map(c => c.id).join(',') + ')').join(' '));

console.log('Version 7: ' + V7.length + ' kort ' + JSON.stringify(v7Rar) + ', pakter ' + Object.values(PACTS7).map(x => x[0]).join(' ') + ', set ' + ['skuggor', 'oknen'].map(k => k + '(' + ALL.filter(c => c.set === k).map(c => c.id).join(',') + ')').join(' '));

console.log('Nya kort: ' + N6.length + ' ' + JSON.stringify(n6Rar) + ', ' + nr + ' kan förädlas, pakter ' + Object.values(PACTS6).map(x => x[0]).join(' ') + ', förmågor ' + actives.map(c => c.id + '(' + c.cd + ' s)').join(' '));
console.log('Version 5: ' + V5.length + ' kort ' + JSON.stringify(v5Rar) + ', ' + nf + ' kort kan smältas, pakter ' + Object.values(PACTS5).map(x => x[0]).join(' '));
console.log('Set: ' + Object.keys(SETS).map(k => k + '(' + ALL.filter(c => c.set === k).length + ')').join(' '));
console.log('Kort: ' + ALL.length + ' ' + JSON.stringify(perRarity) + ', låsta ' + locked + ', förbannade ' + ALL.filter(c => c.curse).length);
console.log('Slumpad sällsynthet djup0 ' + lo.toFixed(2) + ' -> djup4+luck ' + hi.toFixed(2) + ', förbannade ' + (100 * curses / tot).toFixed(1) + ' %');
if (fails) { console.log(fails + ' fel'); process.exit(1); }
console.log('OK: alla kontroller godkända');
